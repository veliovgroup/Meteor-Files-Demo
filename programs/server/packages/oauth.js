(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var check = Package.check.check;
var Match = Package.check.Match;
var ECMAScript = Package.ecmascript.ECMAScript;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
var Log = Package.logging.Log;
var URL = Package.url.URL;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var OAuth, OAuthTest, Oauth;

var require = meteorInstall({"node_modules":{"meteor":{"oauth":{"oauth_server.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/oauth/oauth_server.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let url;
module.link("url", {
  default(v) {
    url = v;
  }

}, 0);
OAuth = {};
OAuthTest = {};
RoutePolicy.declare('/_oauth/', 'network');
const registeredServices = {}; // Internal: Maps from service version to handler function. The
// 'oauth1' and 'oauth2' packages manipulate this directly to register
// for callbacks.

OAuth._requestHandlers = {}; // Register a handler for an OAuth service. The handler will be called
// when we get an incoming http request on /_oauth/{serviceName}. This
// handler should use that information to fetch data about the user
// logging in.
//
// @param name {String} e.g. "google", "facebook"
// @param version {Number} OAuth version (1 or 2)
// @param urls   For OAuth1 only, specify the service's urls
// @param handleOauthRequest {Function(oauthBinding|query)}
//   - (For OAuth1 only) oauthBinding {OAuth1Binding} bound to the appropriate provider
//   - (For OAuth2 only) query {Object} parameters passed in query string
//   - return value is:
//     - {serviceData:, (optional options:)} where serviceData should end
//       up in the user's services[name] field
//     - `null` if the user declined to give permissions
//

OAuth.registerService = (name, version, urls, handleOauthRequest) => {
  if (registeredServices[name]) throw new Error(`Already registered the ${name} OAuth service`);
  registeredServices[name] = {
    serviceName: name,
    version,
    urls,
    handleOauthRequest
  };
}; // For test cleanup.


OAuthTest.unregisterService = name => {
  delete registeredServices[name];
};

OAuth.retrieveCredential = (credentialToken, credentialSecret) => OAuth._retrievePendingCredential(credentialToken, credentialSecret); // The state parameter is normally generated on the client using
// `btoa`, but for tests we need a version that runs on the server.
//


OAuth._generateState = (loginStyle, credentialToken, redirectUrl) => {
  return Buffer.from(JSON.stringify({
    loginStyle: loginStyle,
    credentialToken: credentialToken,
    redirectUrl: redirectUrl
  })).toString('base64');
};

OAuth._stateFromQuery = query => {
  let string;

  try {
    string = Buffer.from(query.state, 'base64').toString('binary');
  } catch (e) {
    Log.warn(`Unable to base64 decode state from OAuth query: ${query.state}`);
    throw e;
  }

  try {
    return JSON.parse(string);
  } catch (e) {
    Log.warn(`Unable to parse state from OAuth query: ${string}`);
    throw e;
  }
};

OAuth._loginStyleFromQuery = query => {
  let style; // For backwards-compatibility for older clients, catch any errors
  // that result from parsing the state parameter. If we can't parse it,
  // set login style to popup by default.

  try {
    style = OAuth._stateFromQuery(query).loginStyle;
  } catch (err) {
    style = "popup";
  }

  if (style !== "popup" && style !== "redirect") {
    throw new Error(`Unrecognized login style: ${style}`);
  }

  return style;
};

OAuth._credentialTokenFromQuery = query => {
  let state; // For backwards-compatibility for older clients, catch any errors
  // that result from parsing the state parameter. If we can't parse it,
  // assume that the state parameter's value is the credential token, as
  // it used to be for older clients.

  try {
    state = OAuth._stateFromQuery(query);
  } catch (err) {
    return query.state;
  }

  return state.credentialToken;
};

OAuth._isCordovaFromQuery = query => {
  try {
    return !!OAuth._stateFromQuery(query).isCordova;
  } catch (err) {
    // For backwards-compatibility for older clients, catch any errors
    // that result from parsing the state parameter. If we can't parse
    // it, assume that we are not on Cordova, since older Meteor didn't
    // do Cordova.
    return false;
  }
}; // Checks if the `redirectUrl` matches the app host.
// We export this function so that developers can override this
// behavior to allow apps from external domains to login using the
// redirect OAuth flow.


OAuth._checkRedirectUrlOrigin = redirectUrl => {
  const appHost = Meteor.absoluteUrl();
  const appHostReplacedLocalhost = Meteor.absoluteUrl(undefined, {
    replaceLocalhost: true
  });
  return redirectUrl.substr(0, appHost.length) !== appHost && redirectUrl.substr(0, appHostReplacedLocalhost.length) !== appHostReplacedLocalhost;
};

const middleware = (req, res, next) => {
  // Make sure to catch any exceptions because otherwise we'd crash
  // the runner
  try {
    const serviceName = oauthServiceName(req);

    if (!serviceName) {
      // not an oauth request. pass to next middleware.
      next();
      return;
    }

    const service = registeredServices[serviceName]; // Skip everything if there's no service set by the oauth middleware

    if (!service) throw new Error(`Unexpected OAuth service ${serviceName}`); // Make sure we're configured

    ensureConfigured(serviceName);
    const handler = OAuth._requestHandlers[service.version];
    if (!handler) throw new Error(`Unexpected OAuth version ${service.version}`);
    handler(service, req.query, res);
  } catch (err) {
    // if we got thrown an error, save it off, it will get passed to
    // the appropriate login call (if any) and reported there.
    //
    // The other option would be to display it in the popup tab that
    // is still open at this point, ignoring the 'close' or 'redirect'
    // we were passed. But then the developer wouldn't be able to
    // style the error or react to it in any way.
    if (req.query.state && err instanceof Error) {
      try {
        // catch any exceptions to avoid crashing runner
        OAuth._storePendingCredential(OAuth._credentialTokenFromQuery(req.query), err);
      } catch (err) {
        // Ignore the error and just give up. If we failed to store the
        // error, then the login will just fail with a generic error.
        Log.warn("Error in OAuth Server while storing pending login result.\n" + err.stack || err.message);
      }
    } // close the popup. because nobody likes them just hanging
    // there.  when someone sees this multiple times they might
    // think to check server logs (we hope?)
    // Catch errors because any exception here will crash the runner.


    try {
      OAuth._endOfLoginResponse(res, {
        query: req.query,
        loginStyle: OAuth._loginStyleFromQuery(req.query),
        error: err
      });
    } catch (err) {
      Log.warn("Error generating end of login response\n" + (err && (err.stack || err.message)));
    }
  }
}; // Listen to incoming OAuth http requests


WebApp.connectHandlers.use(middleware);
OAuthTest.middleware = middleware; // Handle /_oauth/* paths and extract the service name.
//
// @returns {String|null} e.g. "facebook", or null if this isn't an
// oauth request

const oauthServiceName = req => {
  // req.url will be "/_oauth/<service name>" with an optional "?close".
  const i = req.url.indexOf('?');
  let barePath;
  if (i === -1) barePath = req.url;else barePath = req.url.substring(0, i);
  const splitPath = barePath.split('/'); // Any non-oauth request will continue down the default
  // middlewares.

  if (splitPath[1] !== '_oauth') return null; // Find service based on url

  const serviceName = splitPath[2];
  return serviceName;
}; // Make sure we're configured


const ensureConfigured = serviceName => {
  if (!ServiceConfiguration.configurations.findOne({
    service: serviceName
  })) {
    throw new ServiceConfiguration.ConfigError();
  }
};

const isSafe = value => {
  // This matches strings generated by `Random.secret` and
  // `Random.id`.
  return typeof value === "string" && /^[a-zA-Z0-9\-_]+$/.test(value);
}; // Internal: used by the oauth1 and oauth2 packages


OAuth._renderOauthResults = (res, query, credentialSecret) => {
  // For tests, we support the `only_credential_secret_for_test`
  // parameter, which just returns the credential secret without any
  // surrounding HTML. (The test needs to be able to easily grab the
  // secret and use it to log in.)
  //
  // XXX only_credential_secret_for_test could be useful for other
  // things beside tests, like command-line clients. We should give it a
  // real name and serve the credential secret in JSON.
  if (query.only_credential_secret_for_test) {
    res.writeHead(200, {
      'Content-Type': 'text/html'
    });
    res.end(credentialSecret, 'utf-8');
  } else {
    const details = {
      query,
      loginStyle: OAuth._loginStyleFromQuery(query)
    };

    if (query.error) {
      details.error = query.error;
    } else {
      const token = OAuth._credentialTokenFromQuery(query);

      const secret = credentialSecret;

      if (token && secret && isSafe(token) && isSafe(secret)) {
        details.credentials = {
          token: token,
          secret: secret
        };
      } else {
        details.error = "invalid_credential_token_or_secret";
      }
    }

    OAuth._endOfLoginResponse(res, details);
  }
}; // This "template" (not a real Spacebars template, just an HTML file
// with some ##PLACEHOLDER##s) communicates the credential secret back
// to the main window and then closes the popup.


OAuth._endOfPopupResponseTemplate = Assets.getText("end_of_popup_response.html");
OAuth._endOfRedirectResponseTemplate = Assets.getText("end_of_redirect_response.html"); // Renders the end of login response template into some HTML and JavaScript
// that closes the popup or redirects at the end of the OAuth flow.
//
// options are:
//   - loginStyle ("popup" or "redirect")
//   - setCredentialToken (boolean)
//   - credentialToken
//   - credentialSecret
//   - redirectUrl
//   - isCordova (boolean)
//

const renderEndOfLoginResponse = options => {
  // It would be nice to use Blaze here, but it's a little tricky
  // because our mustaches would be inside a <script> tag, and Blaze
  // would treat the <script> tag contents as text (e.g. encode '&' as
  // '&amp;'). So we just do a simple replace.
  const escape = s => {
    if (s) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/\'/g, "&#x27;").replace(/\//g, "&#x2F;");
    } else {
      return s;
    }
  }; // Escape everything just to be safe (we've already checked that some
  // of this data -- the token and secret -- are safe).


  const config = {
    setCredentialToken: !!options.setCredentialToken,
    credentialToken: escape(options.credentialToken),
    credentialSecret: escape(options.credentialSecret),
    storagePrefix: escape(OAuth._storageTokenPrefix),
    redirectUrl: escape(options.redirectUrl),
    isCordova: !!options.isCordova
  };
  let template;

  if (options.loginStyle === 'popup') {
    template = OAuth._endOfPopupResponseTemplate;
  } else if (options.loginStyle === 'redirect') {
    template = OAuth._endOfRedirectResponseTemplate;
  } else {
    throw new Error(`invalid loginStyle: ${options.loginStyle}`);
  }

  const result = template.replace(/##CONFIG##/, JSON.stringify(config)).replace(/##ROOT_URL_PATH_PREFIX##/, __meteor_runtime_config__.ROOT_URL_PATH_PREFIX);
  return `<!DOCTYPE html>\n${result}`;
}; // Writes an HTTP response to the popup window at the end of an OAuth
// login flow. At this point, if the user has successfully authenticated
// to the OAuth server and authorized this app, we communicate the
// credentialToken and credentialSecret to the main window. The main
// window must provide both these values to the DDP `login` method to
// authenticate its DDP connection. After communicating these vaues to
// the main window, we close the popup.
//
// We export this function so that developers can override this
// behavior, which is particularly useful in, for example, some mobile
// environments where popups and/or `window.opener` don't work. For
// example, an app could override `OAuth._endOfPopupResponse` to put the
// credential token and credential secret in the popup URL for the main
// window to read them there instead of using `window.opener`. If you
// override this function, you take responsibility for writing to the
// request and calling `res.end()` to complete the request.
//
// Arguments:
//   - res: the HTTP response object
//   - details:
//      - query: the query string on the HTTP request
//      - credentials: { token: *, secret: * }. If present, this field
//        indicates that the login was successful. Return these values
//        to the client, who can use them to log in over DDP. If
//        present, the values have been checked against a limited
//        character set and are safe to include in HTML.
//      - error: if present, a string or Error indicating an error that
//        occurred during the login. This can come from the client and
//        so shouldn't be trusted for security decisions or included in
//        the response without sanitizing it first. Only one of `error`
//        or `credentials` should be set.


OAuth._endOfLoginResponse = (res, details) => {
  res.writeHead(200, {
    'Content-Type': 'text/html'
  });
  let redirectUrl;

  if (details.loginStyle === 'redirect') {
    redirectUrl = OAuth._stateFromQuery(details.query).redirectUrl;
    const appHost = Meteor.absoluteUrl();

    if (OAuth._checkRedirectUrlOrigin(redirectUrl)) {
      details.error = `redirectUrl (${redirectUrl}` + `) is not on the same host as the app (${appHost})`;
      redirectUrl = appHost;
    }
  }

  const isCordova = OAuth._isCordovaFromQuery(details.query);

  if (details.error) {
    Log.warn("Error in OAuth Server: " + (details.error instanceof Error ? details.error.message : details.error));
    res.end(renderEndOfLoginResponse({
      loginStyle: details.loginStyle,
      setCredentialToken: false,
      redirectUrl,
      isCordova
    }), "utf-8");
    return;
  } // If we have a credentialSecret, report it back to the parent
  // window, with the corresponding credentialToken. The parent window
  // uses the credentialToken and credentialSecret to log in over DDP.


  res.end(renderEndOfLoginResponse({
    loginStyle: details.loginStyle,
    setCredentialToken: true,
    credentialToken: details.credentials.token,
    credentialSecret: details.credentials.secret,
    redirectUrl,
    isCordova
  }), "utf-8");
};

const OAuthEncryption = Package["oauth-encryption"] && Package["oauth-encryption"].OAuthEncryption;

const usingOAuthEncryption = () => OAuthEncryption && OAuthEncryption.keyIsLoaded(); // Encrypt sensitive service data such as access tokens if the
// "oauth-encryption" package is loaded and the oauth secret key has
// been specified.  Returns the unencrypted plaintext otherwise.
//
// The user id is not specified because the user isn't known yet at
// this point in the oauth authentication process.  After the oauth
// authentication process completes the encrypted service data fields
// will be re-encrypted with the user id included before inserting the
// service data into the user document.
//


OAuth.sealSecret = plaintext => {
  if (usingOAuthEncryption()) return OAuthEncryption.seal(plaintext);else return plaintext;
}; // Unencrypt a service data field, if the "oauth-encryption"
// package is loaded and the field is encrypted.
//
// Throws an error if the "oauth-encryption" package is loaded and the
// field is encrypted, but the oauth secret key hasn't been specified.
//


OAuth.openSecret = (maybeSecret, userId) => {
  if (!Package["oauth-encryption"] || !OAuthEncryption.isSealed(maybeSecret)) return maybeSecret;
  return OAuthEncryption.open(maybeSecret, userId);
}; // Unencrypt fields in the service data object.
//


OAuth.openSecrets = (serviceData, userId) => {
  const result = {};
  Object.keys(serviceData).forEach(key => result[key] = OAuth.openSecret(serviceData[key], userId));
  return result;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"pending_credentials.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/oauth/pending_credentials.js                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
//
// When an oauth request is made, Meteor receives oauth credentials
// in one browser tab, and temporarily persists them while that
// tab is closed, then retrieves them in the browser tab that
// initiated the credential request.
//
// _pendingCredentials is the storage mechanism used to share the
// credential between the 2 tabs
//
// Collection containing pending credentials of oauth credential requests
// Has key, credential, and createdAt fields.
OAuth._pendingCredentials = new Mongo.Collection("meteor_oauth_pendingCredentials", {
  _preventAutopublish: true
});

OAuth._pendingCredentials._ensureIndex('key', {
  unique: 1
});

OAuth._pendingCredentials._ensureIndex('credentialSecret');

OAuth._pendingCredentials._ensureIndex('createdAt'); // Periodically clear old entries that were never retrieved


const _cleanStaleResults = () => {
  // Remove credentials older than 1 minute
  const timeCutoff = new Date();
  timeCutoff.setMinutes(timeCutoff.getMinutes() - 1);

  OAuth._pendingCredentials.remove({
    createdAt: {
      $lt: timeCutoff
    }
  });
};

const _cleanupHandle = Meteor.setInterval(_cleanStaleResults, 60 * 1000); // Stores the key and credential in the _pendingCredentials collection.
// Will throw an exception if `key` is not a string.
//
// @param key {string}
// @param credential {Object}   The credential to store
// @param credentialSecret {string} A secret that must be presented in
//   addition to the `key` to retrieve the credential
//


OAuth._storePendingCredential = (key, credential, credentialSecret = null) => {
  check(key, String);
  check(credentialSecret, Match.Maybe(String));

  if (credential instanceof Error) {
    credential = storableError(credential);
  } else {
    credential = OAuth.sealSecret(credential);
  } // We do an upsert here instead of an insert in case the user happens
  // to somehow send the same `state` parameter twice during an OAuth
  // login; we don't want a duplicate key error.


  OAuth._pendingCredentials.upsert({
    key
  }, {
    key,
    credential,
    credentialSecret,
    createdAt: new Date()
  });
}; // Retrieves and removes a credential from the _pendingCredentials collection
//
// @param key {string}
// @param credentialSecret {string}
//


OAuth._retrievePendingCredential = (key, credentialSecret = null) => {
  check(key, String);

  const pendingCredential = OAuth._pendingCredentials.findOne({
    key,
    credentialSecret
  });

  if (pendingCredential) {
    OAuth._pendingCredentials.remove({
      _id: pendingCredential._id
    });

    if (pendingCredential.credential.error) return recreateError(pendingCredential.credential.error);else return OAuth.openSecret(pendingCredential.credential);
  } else {
    return undefined;
  }
}; // Convert an Error into an object that can be stored in mongo
// Note: A Meteor.Error is reconstructed as a Meteor.Error
// All other error classes are reconstructed as a plain Error.
// TODO: Can we do this more simply with EJSON?


const storableError = error => {
  const plainObject = {};
  Object.getOwnPropertyNames(error).forEach(key => plainObject[key] = error[key]); // Keep track of whether it's a Meteor.Error

  if (error instanceof Meteor.Error) {
    plainObject['meteorError'] = true;
  }

  return {
    error: plainObject
  };
}; // Create an error from the error format stored in mongo


const recreateError = errorDoc => {
  let error;

  if (errorDoc.meteorError) {
    error = new Meteor.Error();
    delete errorDoc.meteorError;
  } else {
    error = new Error();
  }

  Object.getOwnPropertyNames(errorDoc).forEach(key => error[key] = errorDoc[key]);
  return error;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oauth_common.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/oauth/oauth_common.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

OAuth._storageTokenPrefix = "Meteor.oauth.credentialSecret-";

OAuth._redirectUri = (serviceName, config, params, absoluteUrlOptions) => {
  // XXX COMPAT WITH 0.9.0
  // The redirect URI used to have a "?close" query argument.  We
  // detect whether we need to be backwards compatible by checking for
  // the absence of the `loginStyle` field, which wasn't used in the
  // code which had the "?close" argument.
  // This logic is duplicated in the tool so that the tool can do OAuth
  // flow with <= 0.9.0 servers (tools/auth.js).
  const query = config.loginStyle ? null : "close"; // Clone because we're going to mutate 'params'. The 'cordova' and
  // 'android' parameters are only used for picking the host of the
  // redirect URL, and not actually included in the redirect URL itself.

  let isCordova = false;
  let isAndroid = false;

  if (params) {
    params = (0, _objectSpread2.default)({}, params);
    isCordova = params.cordova;
    isAndroid = params.android;
    delete params.cordova;
    delete params.android;

    if (Object.keys(params).length === 0) {
      params = undefined;
    }
  }

  if (Meteor.isServer && isCordova) {
    const url = Npm.require('url');

    let rootUrl = process.env.MOBILE_ROOT_URL || __meteor_runtime_config__.ROOT_URL;

    if (isAndroid) {
      // Match the replace that we do in cordova boilerplate
      // (boilerplate-generator package).
      // XXX Maybe we should put this in a separate package or something
      // that is used here and by boilerplate-generator? Or maybe
      // `Meteor.absoluteUrl` should know how to do this?
      const parsedRootUrl = url.parse(rootUrl);

      if (parsedRootUrl.hostname === "localhost") {
        parsedRootUrl.hostname = "10.0.2.2";
        delete parsedRootUrl.host;
      }

      rootUrl = url.format(parsedRootUrl);
    }

    absoluteUrlOptions = (0, _objectSpread2.default)({}, absoluteUrlOptions, {
      // For Cordova clients, redirect to the special Cordova root url
      // (likely a local IP in development mode).
      rootUrl
    });
  }

  return URL._constructUrl(Meteor.absoluteUrl(`_oauth/${serviceName}`, absoluteUrlOptions), query, params);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deprecated.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/oauth/deprecated.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// XXX COMPAT WITH 0.8.0
Oauth = OAuth;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/oauth/oauth_server.js");
require("/node_modules/meteor/oauth/pending_credentials.js");
require("/node_modules/meteor/oauth/oauth_common.js");
require("/node_modules/meteor/oauth/deprecated.js");

/* Exports */
Package._define("oauth", {
  OAuth: OAuth,
  OAuthTest: OAuthTest,
  Oauth: Oauth
});

})();

//# sourceURL=meteor://💻app/packages/oauth.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb2F1dGgvb2F1dGhfc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9vYXV0aC9wZW5kaW5nX2NyZWRlbnRpYWxzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9vYXV0aC9vYXV0aF9jb21tb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL29hdXRoL2RlcHJlY2F0ZWQuanMiXSwibmFtZXMiOlsidXJsIiwibW9kdWxlIiwibGluayIsImRlZmF1bHQiLCJ2IiwiT0F1dGgiLCJPQXV0aFRlc3QiLCJSb3V0ZVBvbGljeSIsImRlY2xhcmUiLCJyZWdpc3RlcmVkU2VydmljZXMiLCJfcmVxdWVzdEhhbmRsZXJzIiwicmVnaXN0ZXJTZXJ2aWNlIiwibmFtZSIsInZlcnNpb24iLCJ1cmxzIiwiaGFuZGxlT2F1dGhSZXF1ZXN0IiwiRXJyb3IiLCJzZXJ2aWNlTmFtZSIsInVucmVnaXN0ZXJTZXJ2aWNlIiwicmV0cmlldmVDcmVkZW50aWFsIiwiY3JlZGVudGlhbFRva2VuIiwiY3JlZGVudGlhbFNlY3JldCIsIl9yZXRyaWV2ZVBlbmRpbmdDcmVkZW50aWFsIiwiX2dlbmVyYXRlU3RhdGUiLCJsb2dpblN0eWxlIiwicmVkaXJlY3RVcmwiLCJCdWZmZXIiLCJmcm9tIiwiSlNPTiIsInN0cmluZ2lmeSIsInRvU3RyaW5nIiwiX3N0YXRlRnJvbVF1ZXJ5IiwicXVlcnkiLCJzdHJpbmciLCJzdGF0ZSIsImUiLCJMb2ciLCJ3YXJuIiwicGFyc2UiLCJfbG9naW5TdHlsZUZyb21RdWVyeSIsInN0eWxlIiwiZXJyIiwiX2NyZWRlbnRpYWxUb2tlbkZyb21RdWVyeSIsIl9pc0NvcmRvdmFGcm9tUXVlcnkiLCJpc0NvcmRvdmEiLCJfY2hlY2tSZWRpcmVjdFVybE9yaWdpbiIsImFwcEhvc3QiLCJNZXRlb3IiLCJhYnNvbHV0ZVVybCIsImFwcEhvc3RSZXBsYWNlZExvY2FsaG9zdCIsInVuZGVmaW5lZCIsInJlcGxhY2VMb2NhbGhvc3QiLCJzdWJzdHIiLCJsZW5ndGgiLCJtaWRkbGV3YXJlIiwicmVxIiwicmVzIiwibmV4dCIsIm9hdXRoU2VydmljZU5hbWUiLCJzZXJ2aWNlIiwiZW5zdXJlQ29uZmlndXJlZCIsImhhbmRsZXIiLCJfc3RvcmVQZW5kaW5nQ3JlZGVudGlhbCIsInN0YWNrIiwibWVzc2FnZSIsIl9lbmRPZkxvZ2luUmVzcG9uc2UiLCJlcnJvciIsIldlYkFwcCIsImNvbm5lY3RIYW5kbGVycyIsInVzZSIsImkiLCJpbmRleE9mIiwiYmFyZVBhdGgiLCJzdWJzdHJpbmciLCJzcGxpdFBhdGgiLCJzcGxpdCIsIlNlcnZpY2VDb25maWd1cmF0aW9uIiwiY29uZmlndXJhdGlvbnMiLCJmaW5kT25lIiwiQ29uZmlnRXJyb3IiLCJpc1NhZmUiLCJ2YWx1ZSIsInRlc3QiLCJfcmVuZGVyT2F1dGhSZXN1bHRzIiwib25seV9jcmVkZW50aWFsX3NlY3JldF9mb3JfdGVzdCIsIndyaXRlSGVhZCIsImVuZCIsImRldGFpbHMiLCJ0b2tlbiIsInNlY3JldCIsImNyZWRlbnRpYWxzIiwiX2VuZE9mUG9wdXBSZXNwb25zZVRlbXBsYXRlIiwiQXNzZXRzIiwiZ2V0VGV4dCIsIl9lbmRPZlJlZGlyZWN0UmVzcG9uc2VUZW1wbGF0ZSIsInJlbmRlckVuZE9mTG9naW5SZXNwb25zZSIsIm9wdGlvbnMiLCJlc2NhcGUiLCJzIiwicmVwbGFjZSIsImNvbmZpZyIsInNldENyZWRlbnRpYWxUb2tlbiIsInN0b3JhZ2VQcmVmaXgiLCJfc3RvcmFnZVRva2VuUHJlZml4IiwidGVtcGxhdGUiLCJyZXN1bHQiLCJfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIiwiUk9PVF9VUkxfUEFUSF9QUkVGSVgiLCJPQXV0aEVuY3J5cHRpb24iLCJQYWNrYWdlIiwidXNpbmdPQXV0aEVuY3J5cHRpb24iLCJrZXlJc0xvYWRlZCIsInNlYWxTZWNyZXQiLCJwbGFpbnRleHQiLCJzZWFsIiwib3BlblNlY3JldCIsIm1heWJlU2VjcmV0IiwidXNlcklkIiwiaXNTZWFsZWQiLCJvcGVuIiwib3BlblNlY3JldHMiLCJzZXJ2aWNlRGF0YSIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwia2V5IiwiX3BlbmRpbmdDcmVkZW50aWFscyIsIk1vbmdvIiwiQ29sbGVjdGlvbiIsIl9wcmV2ZW50QXV0b3B1Ymxpc2giLCJfZW5zdXJlSW5kZXgiLCJ1bmlxdWUiLCJfY2xlYW5TdGFsZVJlc3VsdHMiLCJ0aW1lQ3V0b2ZmIiwiRGF0ZSIsInNldE1pbnV0ZXMiLCJnZXRNaW51dGVzIiwicmVtb3ZlIiwiY3JlYXRlZEF0IiwiJGx0IiwiX2NsZWFudXBIYW5kbGUiLCJzZXRJbnRlcnZhbCIsImNyZWRlbnRpYWwiLCJjaGVjayIsIlN0cmluZyIsIk1hdGNoIiwiTWF5YmUiLCJzdG9yYWJsZUVycm9yIiwidXBzZXJ0IiwicGVuZGluZ0NyZWRlbnRpYWwiLCJfaWQiLCJyZWNyZWF0ZUVycm9yIiwicGxhaW5PYmplY3QiLCJnZXRPd25Qcm9wZXJ0eU5hbWVzIiwiZXJyb3JEb2MiLCJtZXRlb3JFcnJvciIsIl9yZWRpcmVjdFVyaSIsInBhcmFtcyIsImFic29sdXRlVXJsT3B0aW9ucyIsImlzQW5kcm9pZCIsImNvcmRvdmEiLCJhbmRyb2lkIiwiaXNTZXJ2ZXIiLCJOcG0iLCJyZXF1aXJlIiwicm9vdFVybCIsInByb2Nlc3MiLCJlbnYiLCJNT0JJTEVfUk9PVF9VUkwiLCJST09UX1VSTCIsInBhcnNlZFJvb3RVcmwiLCJob3N0bmFtZSIsImhvc3QiLCJmb3JtYXQiLCJVUkwiLCJfY29uc3RydWN0VXJsIiwiT2F1dGgiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLEdBQUo7QUFBUUMsTUFBTSxDQUFDQyxJQUFQLENBQVksS0FBWixFQUFrQjtBQUFDQyxTQUFPLENBQUNDLENBQUQsRUFBRztBQUFDSixPQUFHLEdBQUNJLENBQUo7QUFBTTs7QUFBbEIsQ0FBbEIsRUFBc0MsQ0FBdEM7QUFFUkMsS0FB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UUFBUCxJQUFtQnRILFNBQXZCLEVBQWtDO0FBQ2hDLFVBQU01QyxHQUFHLEdBQUdtSyxHQUFHLENBQUNDLE9BQUosQ0FBWSxLQUFaLENBQVo7O0FBQ0EsUUFBSUMsT0FBTyxHQUFHQyxPQUFPLENBQUNDLEdBQVIsQ0FBWUMsZUFBWixJQUNSOUQseUJBQXlCLENBQUMrRCxRQURoQzs7QUFHQSxRQUFJVixTQUFKLEVBQWU7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsWUFBTVcsYUFBYSxHQUFHMUssR0FBRyxDQUFDc0MsS0FBSixDQUFVK0gsT0FBVixDQUF0Qjs7QUFDQSxVQUFJSyxhQUFhLENBQUNDLFFBQWQsS0FBMkIsV0FBL0IsRUFBNEM7QUFDMUNELHFCQUFhLENBQUNDLFFBQWQsR0FBeUIsVUFBekI7QUFDQSxlQUFPRCxhQUFhLENBQUNFLElBQXJCO0FBQ0Q7O0FBQ0RQLGFBQU8sR0FBR3JLLEdBQUcsQ0FBQzZLLE1BQUosQ0FBV0gsYUFBWCxDQUFWO0FBQ0Q7O0FBRURaLHNCQUFrQixtQ0FDYkEsa0JBRGE7QUFFaEI7QUFDQTtBQUNBTztBQUpnQixNQUFsQjtBQU1EOztBQUVELFNBQU9TLEdBQUcsQ0FBQ0MsYUFBSixDQUNMaEksTUFBTSxDQUFDQyxXQUFQLENBQW9CLFVBQVMvQixXQUFZLEVBQXpDLEVBQTRDNkksa0JBQTVDLENBREssRUFFTDlILEtBRkssRUFHTDZILE1BSEssQ0FBUDtBQUlELENBekRELEM7Ozs7Ozs7Ozs7O0FDRkE7QUFFQW1CLEtBQUssR0FBRzNLLEtBQVIsQyIsImZpbGUiOiIvcGFja2FnZXMvb2F1dGguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdXJsIGZyb20gJ3VybCc7XG5cbk9BdXRoID0ge307XG5PQXV0aFRlc3QgPSB7fTtcblxuUm91dGVQb2xpY3kuZGVjbGFyZSgnL19vYXV0aC8nLCAnbmV0d29yaycpO1xuXG5jb25zdCByZWdpc3RlcmVkU2VydmljZXMgPSB7fTtcblxuLy8gSW50ZXJuYWw6IE1hcHMgZnJvbSBzZXJ2aWNlIHZlcnNpb24gdG8gaGFuZGxlciBmdW5jdGlvbi4gVGhlXG4vLyAnb2F1dGgxJyBhbmQgJ29hdXRoMicgcGFja2FnZXMgbWFuaXB1bGF0ZSB0aGlzIGRpcmVjdGx5IHRvIHJlZ2lzdGVyXG4vLyBmb3IgY2FsbGJhY2tzLlxuT0F1dGguX3JlcXVlc3RIYW5kbGVycyA9IHt9O1xuXG5cbi8vIFJlZ2lzdGVyIGEgaGFuZGxlciBmb3IgYW4gT0F1dGggc2VydmljZS4gVGhlIGhhbmRsZXIgd2lsbCBiZSBjYWxsZWRcbi8vIHdoZW4gd2UgZ2V0IGFuIGluY29taW5nIGh0dHAgcmVxdWVzdCBvbiAvX29hdXRoL3tzZXJ2aWNlTmFtZX0uIFRoaXNcbi8vIGhhbmRsZXIgc2hvdWxkIHVzZSB0aGF0IGluZm9ybWF0aW9uIHRvIGZldGNoIGRhdGEgYWJvdXQgdGhlIHVzZXJcbi8vIGxvZ2dpbmcgaW4uXG4vL1xuLy8gQHBhcmFtIG5hbWUge1N0cmluZ30gZS5nLiBcImdvb2dsZVwiLCBcImZhY2Vib29rXCJcbi8vIEBwYXJhbSB2ZXJzaW9uIHtOdW1iZXJ9IE9BdXRoIHZlcnNpb24gKDEgb3IgMilcbi8vIEBwYXJhbSB1cmxzICAgRm9yIE9BdXRoMSBvbmx5LCBzcGVjaWZ5IHRoZSBzZXJ2aWNlJ3MgdXJsc1xuLy8gQHBhcmFtIGhhbmRsZU9hdXRoUmVxdWVzdCB7RnVuY3Rpb24ob2F1dGhCaW5kaW5nfHF1ZXJ5KX1cbi8vICAgLSAoRm9yIE9BdXRoMSBvbmx5KSBvYXV0aEJpbmRpbmcge09BdXRoMUJpbmRpbmd9IGJvdW5kIHRvIHRoZSBhcHByb3ByaWF0ZSBwcm92aWRlclxuLy8gICAtIChGb3IgT0F1dGgyIG9ubHkpIHF1ZXJ5IHtPYmplY3R9IHBhcmFtZXRlcnMgcGFzc2VkIGluIHF1ZXJ5IHN0cmluZ1xuLy8gICAtIHJldHVybiB2YWx1ZSBpczpcbi8vICAgICAtIHtzZXJ2aWNlRGF0YTosIChvcHRpb25hbCBvcHRpb25zOil9IHdoZXJlIHNlcnZpY2VEYXRhIHNob3VsZCBlbmRcbi8vICAgICAgIHVwIGluIHRoZSB1c2VyJ3Mgc2VydmljZXNbbmFtZV0gZmllbGRcbi8vICAgICAtIGBudWxsYCBpZiB0aGUgdXNlciBkZWNsaW5lZCB0byBnaXZlIHBlcm1pc3Npb25zXG4vL1xuT0F1dGgucmVnaXN0ZXJTZXJ2aWNlID0gKG5hbWUsIHZlcnNpb24sIHVybHMsIGhhbmRsZU9hdXRoUmVxdWVzdCkgPT4ge1xuICBpZiAocmVnaXN0ZXJlZFNlcnZpY2VzW25hbWVdKVxuICAgIHRocm93IG5ldyBFcnJvcihgQWxyZWFkeSByZWdpc3RlcmVkIHRoZSAke25hbWV9IE9BdXRoIHNlcnZpY2VgKTtcblxuICByZWdpc3RlcmVkU2VydmljZXNbbmFtZV0gPSB7XG4gICAgc2VydmljZU5hbWU6IG5hbWUsXG4gICAgdmVyc2lvbixcbiAgICB1cmxzLFxuICAgIGhhbmRsZU9hdXRoUmVxdWVzdCxcbiAgfTtcbn07XG5cbi8vIEZvciB0ZXN0IGNsZWFudXAuXG5PQXV0aFRlc3QudW5yZWdpc3RlclNlcnZpY2UgPSBuYW1lID0+IHtcbiAgZGVsZXRlIHJlZ2lzdGVyZWRTZXJ2aWNlc1tuYW1lXTtcbn07XG5cblxuT0F1dGgucmV0cmlldmVDcmVkZW50aWFsID0gKGNyZWRlbnRpYWxUb2tlbiwgY3JlZGVudGlhbFNlY3JldCkgPT5cbiAgT0F1dGguX3JldHJpZXZlUGVuZGluZ0NyZWRlbnRpYWwoY3JlZGVudGlhbFRva2VuLCBjcmVkZW50aWFsU2VjcmV0KTtcblxuXG4vLyBUaGUgc3RhdGUgcGFyYW1ldGVyIGlzIG5vcm1hbGx5IGdlbmVyYXRlZCBvbiB0aGUgY2xpZW50IHVzaW5nXG4vLyBgYnRvYWAsIGJ1dCBmb3IgdGVzdHMgd2UgbmVlZCBhIHZlcnNpb24gdGhhdCBydW5zIG9uIHRoZSBzZXJ2ZXIuXG4vL1xuT0F1dGguX2dlbmVyYXRlU3RhdGUgPSAobG9naW5TdHlsZSwgY3JlZGVudGlhbFRva2VuLCByZWRpcmVjdFVybCkgPT4ge1xuICByZXR1cm4gQnVmZmVyLmZyb20oSlNPTi5zdHJpbmdpZnkoe1xuICAgIGxvZ2luU3R5bGU6IGxvZ2luU3R5bGUsXG4gICAgY3JlZGVudGlhbFRva2VuOiBjcmVkZW50aWFsVG9rZW4sXG4gICAgcmVkaXJlY3RVcmw6IHJlZGlyZWN0VXJsfSkpLnRvU3RyaW5nKCdiYXNlNjQnKTtcbn07XG5cbk9BdXRoLl9zdGF0ZUZyb21RdWVyeSA9IHF1ZXJ5ID0+IHtcbiAgbGV0IHN0cmluZztcbiAgdHJ5IHtcbiAgICBzdHJpbmcgPSBCdWZmZXIuZnJvbShxdWVyeS5zdGF0ZSwgJ2Jhc2U2NCcpLnRvU3RyaW5nKCdiaW5hcnknKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIExvZy53YXJuKGBVbmFibGUgdG8gYmFzZTY0IGRlY29kZSBzdGF0ZSBmcm9tIE9BdXRoIHF1ZXJ5OiAke3F1ZXJ5LnN0YXRlfWApO1xuICAgIHRocm93IGU7XG4gIH1cblxuICB0cnkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKHN0cmluZyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBMb2cud2FybihgVW5hYmxlIHRvIHBhcnNlIHN0YXRlIGZyb20gT0F1dGggcXVlcnk6ICR7c3RyaW5nfWApO1xuICAgIHRocm93IGU7XG4gIH1cbn07XG5cbk9BdXRoLl9sb2dpblN0eWxlRnJvbVF1ZXJ5ID0gcXVlcnkgPT4ge1xuICBsZXQgc3R5bGU7XG4gIC8vIEZvciBiYWNrd2FyZHMtY29tcGF0aWJpbGl0eSBmb3Igb2xkZXIgY2xpZW50cywgY2F0Y2ggYW55IGVycm9yc1xuICAvLyB0aGF0IHJlc3VsdCBmcm9tIHBhcnNpbmcgdGhlIHN0YXRlIHBhcmFtZXRlci4gSWYgd2UgY2FuJ3QgcGFyc2UgaXQsXG4gIC8vIHNldCBsb2dpbiBzdHlsZSB0byBwb3B1cCBieSBkZWZhdWx0LlxuICB0cnkge1xuICAgIHN0eWxlID0gT0F1dGguX3N0YXRlRnJvbVF1ZXJ5KHF1ZXJ5KS5sb2dpblN0eWxlO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBzdHlsZSA9IFwicG9wdXBcIjtcbiAgfVxuICBpZiAoc3R5bGUgIT09IFwicG9wdXBcIiAmJiBzdHlsZSAhPT0gXCJyZWRpcmVjdFwiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBVbnJlY29nbml6ZWQgbG9naW4gc3R5bGU6ICR7c3R5bGV9YCk7XG4gIH1cbiAgcmV0dXJuIHN0eWxlO1xufTtcblxuT0F1dGguX2NyZWRlbnRpYWxUb2tlbkZyb21RdWVyeSA9IHF1ZXJ5ID0+IHtcbiAgbGV0IHN0YXRlO1xuICAvLyBGb3IgYmFja3dhcmRzLWNvbXBhdGliaWxpdHkgZm9yIG9sZGVyIGNsaWVudHMsIGNhdGNoIGFueSBlcnJvcnNcbiAgLy8gdGhhdCByZXN1bHQgZnJvbSBwYXJzaW5nIHRoZSBzdGF0ZSBwYXJhbWV0ZXIuIElmIHdlIGNhbid0IHBhcnNlIGl0LFxuICAvLyBhc3N1bWUgdGhhdCB0aGUgc3RhdGUgcGFyYW1ldGVyJ3MgdmFsdWUgaXMgdGhlIGNyZWRlbnRpYWwgdG9rZW4sIGFzXG4gIC8vIGl0IHVzZWQgdG8gYmUgZm9yIG9sZGVyIGNsaWVudHMuXG4gIHRyeSB7XG4gICAgc3RhdGUgPSBPQXV0aC5fc3RhdGVGcm9tUXVlcnkocXVlcnkpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gcXVlcnkuc3RhdGU7XG4gIH1cbiAgcmV0dXJuIHN0YXRlLmNyZWRlbnRpYWxUb2tlbjtcbn07XG5cbk9BdXRoLl9pc0NvcmRvdmFGcm9tUXVlcnkgPSBxdWVyeSA9PiB7XG4gIHRyeSB7XG4gICAgcmV0dXJuICEhIE9BdXRoLl9zdGF0ZUZyb21RdWVyeShxdWVyeSkuaXNDb3Jkb3ZhO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICAvLyBGb3IgYmFja3dhcmRzLWNvbXBhdGliaWxpdHkgZm9yIG9sZGVyIGNsaWVudHMsIGNhdGNoIGFueSBlcnJvcnNcbiAgICAvLyB0aGF0IHJlc3VsdCBmcm9tIHBhcnNpbmcgdGhlIHN0YXRlIHBhcmFtZXRlci4gSWYgd2UgY2FuJ3QgcGFyc2VcbiAgICAvLyBpdCwgYXNzdW1lIHRoYXQgd2UgYXJlIG5vdCBvbiBDb3Jkb3ZhLCBzaW5jZSBvbGRlciBNZXRlb3IgZGlkbid0XG4gICAgLy8gZG8gQ29yZG92YS5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cbi8vIENoZWNrcyBpZiB0aGUgYHJlZGlyZWN0VXJsYCBtYXRjaGVzIHRoZSBhcHAgaG9zdC5cbi8vIFdlIGV4cG9ydCB0aGlzIGZ1bmN0aW9uIHNvIHRoYXQgZGV2ZWxvcGVycyBjYW4gb3ZlcnJpZGUgdGhpc1xuLy8gYmVoYXZpb3IgdG8gYWxsb3cgYXBwcyBmcm9tIGV4dGVybmFsIGRvbWFpbnMgdG8gbG9naW4gdXNpbmcgdGhlXG4vLyByZWRpcmVjdCBPQXV0aCBmbG93LlxuT0F1dGguX2NoZWNrUmVkaXJlY3RVcmxPcmlnaW4gPSByZWRpcmVjdFVybCA9PiB7XG4gIGNvbnN0IGFwcEhvc3QgPSBNZXRlb3IuYWJzb2x1dGVVcmwoKTtcbiAgY29uc3QgYXBwSG9zdFJlcGxhY2VkTG9jYWxob3N0ID0gTWV0ZW9yLmFic29sdXRlVXJsKHVuZGVmaW5lZCwge1xuICAgIHJlcGxhY2VMb2NhbGhvc3Q6IHRydWVcbiAgfSk7XG4gIHJldHVybiAoXG4gICAgcmVkaXJlY3RVcmwuc3Vic3RyKDAsIGFwcEhvc3QubGVuZ3RoKSAhPT0gYXBwSG9zdCAmJlxuICAgIHJlZGlyZWN0VXJsLnN1YnN0cigwLCBhcHBIb3N0UmVwbGFjZWRMb2NhbGhvc3QubGVuZ3RoKSAhPT0gYXBwSG9zdFJlcGxhY2VkTG9jYWxob3N0XG4gICk7XG59O1xuXG5jb25zdCBtaWRkbGV3YXJlID0gKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gIC8vIE1ha2Ugc3VyZSB0byBjYXRjaCBhbnkgZXhjZXB0aW9ucyBiZWNhdXNlIG90aGVyd2lzZSB3ZSdkIGNyYXNoXG4gIC8vIHRoZSBydW5uZXJcbiAgdHJ5IHtcbiAgICBjb25zdCBzZXJ2aWNlTmFtZSA9IG9hdXRoU2VydmljZU5hbWUocmVxKTtcbiAgICBpZiAoIXNlcnZpY2VOYW1lKSB7XG4gICAgICAvLyBub3QgYW4gb2F1dGggcmVxdWVzdC4gcGFzcyB0byBuZXh0IG1pZGRsZXdhcmUuXG4gICAgICBuZXh0KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgc2VydmljZSA9IHJlZ2lzdGVyZWRTZXJ2aWNlc1tzZXJ2aWNlTmFtZV07XG5cbiAgICAvLyBTa2lwIGV2ZXJ5dGhpbmcgaWYgdGhlcmUncyBubyBzZXJ2aWNlIHNldCBieSB0aGUgb2F1dGggbWlkZGxld2FyZVxuICAgIGlmICghc2VydmljZSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCBPQXV0aCBzZXJ2aWNlICR7c2VydmljZU5hbWV9YCk7XG5cbiAgICAvLyBNYWtlIHN1cmUgd2UncmUgY29uZmlndXJlZFxuICAgIGVuc3VyZUNvbmZpZ3VyZWQoc2VydmljZU5hbWUpO1xuXG4gICAgY29uc3QgaGFuZGxlciA9IE9BdXRoLl9yZXF1ZXN0SGFuZGxlcnNbc2VydmljZS52ZXJzaW9uXTtcbiAgICBpZiAoIWhhbmRsZXIpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQgT0F1dGggdmVyc2lvbiAke3NlcnZpY2UudmVyc2lvbn1gKTtcbiAgICBoYW5kbGVyKHNlcnZpY2UsIHJlcS5xdWVyeSwgcmVzKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgLy8gaWYgd2UgZ290IHRocm93biBhbiBlcnJvciwgc2F2ZSBpdCBvZmYsIGl0IHdpbGwgZ2V0IHBhc3NlZCB0b1xuICAgIC8vIHRoZSBhcHByb3ByaWF0ZSBsb2dpbiBjYWxsIChpZiBhbnkpIGFuZCByZXBvcnRlZCB0aGVyZS5cbiAgICAvL1xuICAgIC8vIFRoZSBvdGhlciBvcHRpb24gd291bGQgYmUgdG8gZGlzcGxheSBpdCBpbiB0aGUgcG9wdXAgdGFiIHRoYXRcbiAgICAvLyBpcyBzdGlsbCBvcGVuIGF0IHRoaXMgcG9pbnQsIGlnbm9yaW5nIHRoZSAnY2xvc2UnIG9yICdyZWRpcmVjdCdcbiAgICAvLyB3ZSB3ZXJlIHBhc3NlZC4gQnV0IHRoZW4gdGhlIGRldmVsb3BlciB3b3VsZG4ndCBiZSBhYmxlIHRvXG4gICAgLy8gc3R5bGUgdGhlIGVycm9yIG9yIHJlYWN0IHRvIGl0IGluIGFueSB3YXkuXG4gICAgaWYgKHJlcS5xdWVyeS5zdGF0ZSAmJiBlcnIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgdHJ5IHsgLy8gY2F0Y2ggYW55IGV4Y2VwdGlvbnMgdG8gYXZvaWQgY3Jhc2hpbmcgcnVubmVyXG4gICAgICAgIE9BdXRoLl9zdG9yZVBlbmRpbmdDcmVkZW50aWFsKE9BdXRoLl9jcmVkZW50aWFsVG9rZW5Gcm9tUXVlcnkocmVxLnF1ZXJ5KSwgZXJyKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBJZ25vcmUgdGhlIGVycm9yIGFuZCBqdXN0IGdpdmUgdXAuIElmIHdlIGZhaWxlZCB0byBzdG9yZSB0aGVcbiAgICAgICAgLy8gZXJyb3IsIHRoZW4gdGhlIGxvZ2luIHdpbGwganVzdCBmYWlsIHdpdGggYSBnZW5lcmljIGVycm9yLlxuICAgICAgICBMb2cud2FybihcIkVycm9yIGluIE9BdXRoIFNlcnZlciB3aGlsZSBzdG9yaW5nIHBlbmRpbmcgbG9naW4gcmVzdWx0LlxcblwiICtcbiAgICAgICAgICAgICAgICAgZXJyLnN0YWNrIHx8IGVyci5tZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjbG9zZSB0aGUgcG9wdXAuIGJlY2F1c2Ugbm9ib2R5IGxpa2VzIHRoZW0ganVzdCBoYW5naW5nXG4gICAgLy8gdGhlcmUuICB3aGVuIHNvbWVvbmUgc2VlcyB0aGlzIG11bHRpcGxlIHRpbWVzIHRoZXkgbWlnaHRcbiAgICAvLyB0aGluayB0byBjaGVjayBzZXJ2ZXIgbG9ncyAod2UgaG9wZT8pXG4gICAgLy8gQ2F0Y2ggZXJyb3JzIGJlY2F1c2UgYW55IGV4Y2VwdGlvbiBoZXJlIHdpbGwgY3Jhc2ggdGhlIHJ1bm5lci5cbiAgICB0cnkge1xuICAgICAgT0F1dGguX2VuZE9mTG9naW5SZXNwb25zZShyZXMsIHtcbiAgICAgICAgcXVlcnk6IHJlcS5xdWVyeSxcbiAgICAgICAgbG9naW5TdHlsZTogT0F1dGguX2xvZ2luU3R5bGVGcm9tUXVlcnkocmVxLnF1ZXJ5KSxcbiAgICAgICAgZXJyb3I6IGVyclxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBMb2cud2FybihcIkVycm9yIGdlbmVyYXRpbmcgZW5kIG9mIGxvZ2luIHJlc3BvbnNlXFxuXCIgK1xuICAgICAgICAgICAgICAgKGVyciAmJiAoZXJyLnN0YWNrIHx8IGVyci5tZXNzYWdlKSkpO1xuICAgIH1cbiAgfVxufTtcblxuLy8gTGlzdGVuIHRvIGluY29taW5nIE9BdXRoIGh0dHAgcmVxdWVzdHNcbldlYkFwcC5jb25uZWN0SGFuZGxlcnMudXNlKG1pZGRsZXdhcmUpO1xuXG5PQXV0aFRlc3QubWlkZGxld2FyZSA9IG1pZGRsZXdhcmU7XG5cbi8vIEhhbmRsZSAvX29hdXRoLyogcGF0aHMgYW5kIGV4dHJhY3QgdGhlIHNlcnZpY2UgbmFtZS5cbi8vXG4vLyBAcmV0dXJucyB7U3RyaW5nfG51bGx9IGUuZy4gXCJmYWNlYm9va1wiLCBvciBudWxsIGlmIHRoaXMgaXNuJ3QgYW5cbi8vIG9hdXRoIHJlcXVlc3RcbmNvbnN0IG9hdXRoU2VydmljZU5hbWUgPSByZXEgPT4ge1xuICAvLyByZXEudXJsIHdpbGwgYmUgXCIvX29hdXRoLzxzZXJ2aWNlIG5hbWU+XCIgd2l0aCBhbiBvcHRpb25hbCBcIj9jbG9zZVwiLlxuICBjb25zdCBpID0gcmVxLnVybC5pbmRleE9mKCc/Jyk7XG4gIGxldCBiYXJlUGF0aDtcbiAgaWYgKGkgPT09IC0xKVxuICAgIGJhcmVQYXRoID0gcmVxLnVybDtcbiAgZWxzZVxuICAgIGJhcmVQYXRoID0gcmVxLnVybC5zdWJzdHJpbmcoMCwgaSk7XG4gIGNvbnN0IHNwbGl0UGF0aCA9IGJhcmVQYXRoLnNwbGl0KCcvJyk7XG5cbiAgLy8gQW55IG5vbi1vYXV0aCByZXF1ZXN0IHdpbGwgY29udGludWUgZG93biB0aGUgZGVmYXVsdFxuICAvLyBtaWRkbGV3YXJlcy5cbiAgaWYgKHNwbGl0UGF0aFsxXSAhPT0gJ19vYXV0aCcpXG4gICAgcmV0dXJuIG51bGw7XG5cbiAgLy8gRmluZCBzZXJ2aWNlIGJhc2VkIG9uIHVybFxuICBjb25zdCBzZXJ2aWNlTmFtZSA9IHNwbGl0UGF0aFsyXTtcbiAgcmV0dXJuIHNlcnZpY2VOYW1lO1xufTtcblxuLy8gTWFrZSBzdXJlIHdlJ3JlIGNvbmZpZ3VyZWRcbmNvbnN0IGVuc3VyZUNvbmZpZ3VyZWQgPSBzZXJ2aWNlTmFtZSA9PiB7XG4gIGlmICghU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMuZmluZE9uZSh7c2VydmljZTogc2VydmljZU5hbWV9KSkge1xuICAgIHRocm93IG5ldyBTZXJ2aWNlQ29uZmlndXJhdGlvbi5Db25maWdFcnJvcigpO1xuICB9XG59O1xuXG5jb25zdCBpc1NhZmUgPSB2YWx1ZSA9PiB7XG4gIC8vIFRoaXMgbWF0Y2hlcyBzdHJpbmdzIGdlbmVyYXRlZCBieSBgUmFuZG9tLnNlY3JldGAgYW5kXG4gIC8vIGBSYW5kb20uaWRgLlxuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiICYmXG4gICAgL15bYS16QS1aMC05XFwtX10rJC8udGVzdCh2YWx1ZSk7XG59O1xuXG4vLyBJbnRlcm5hbDogdXNlZCBieSB0aGUgb2F1dGgxIGFuZCBvYXV0aDIgcGFja2FnZXNcbk9BdXRoLl9yZW5kZXJPYXV0aFJlc3VsdHMgPSAocmVzLCBxdWVyeSwgY3JlZGVudGlhbFNlY3JldCkgPT4ge1xuICAvLyBGb3IgdGVzdHMsIHdlIHN1cHBvcnQgdGhlIGBvbmx5X2NyZWRlbnRpYWxfc2VjcmV0X2Zvcl90ZXN0YFxuICAvLyBwYXJhbWV0ZXIsIHdoaWNoIGp1c3QgcmV0dXJucyB0aGUgY3JlZGVudGlhbCBzZWNyZXQgd2l0aG91dCBhbnlcbiAgLy8gc3Vycm91bmRpbmcgSFRNTC4gKFRoZSB0ZXN0IG5lZWRzIHRvIGJlIGFibGUgdG8gZWFzaWx5IGdyYWIgdGhlXG4gIC8vIHNlY3JldCBhbmQgdXNlIGl0IHRvIGxvZyBpbi4pXG4gIC8vXG4gIC8vIFhYWCBvbmx5X2NyZWRlbnRpYWxfc2VjcmV0X2Zvcl90ZXN0IGNvdWxkIGJlIHVzZWZ1bCBmb3Igb3RoZXJcbiAgLy8gdGhpbmdzIGJlc2lkZSB0ZXN0cywgbGlrZSBjb21tYW5kLWxpbmUgY2xpZW50cy4gV2Ugc2hvdWxkIGdpdmUgaXQgYVxuICAvLyByZWFsIG5hbWUgYW5kIHNlcnZlIHRoZSBjcmVkZW50aWFsIHNlY3JldCBpbiBKU09OLlxuXG4gIGlmIChxdWVyeS5vbmx5X2NyZWRlbnRpYWxfc2VjcmV0X2Zvcl90ZXN0KSB7XG4gICAgcmVzLndyaXRlSGVhZCgyMDAsIHsnQ29udGVudC1UeXBlJzogJ3RleHQvaHRtbCd9KTtcbiAgICByZXMuZW5kKGNyZWRlbnRpYWxTZWNyZXQsICd1dGYtOCcpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGRldGFpbHMgPSB7XG4gICAgICBxdWVyeSxcbiAgICAgIGxvZ2luU3R5bGU6IE9BdXRoLl9sb2dpblN0eWxlRnJvbVF1ZXJ5KHF1ZXJ5KVxuICAgIH07XG4gICAgaWYgKHF1ZXJ5LmVycm9yKSB7XG4gICAgICBkZXRhaWxzLmVycm9yID0gcXVlcnkuZXJyb3I7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHRva2VuID0gT0F1dGguX2NyZWRlbnRpYWxUb2tlbkZyb21RdWVyeShxdWVyeSk7XG4gICAgICBjb25zdCBzZWNyZXQgPSBjcmVkZW50aWFsU2VjcmV0O1xuICAgICAgaWYgKHRva2VuICYmIHNlY3JldCAmJlxuICAgICAgICAgIGlzU2FmZSh0b2tlbikgJiYgaXNTYWZlKHNlY3JldCkpIHtcbiAgICAgICAgZGV0YWlscy5jcmVkZW50aWFscyA9IHsgdG9rZW46IHRva2VuLCBzZWNyZXQ6IHNlY3JldH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZXRhaWxzLmVycm9yID0gXCJpbnZhbGlkX2NyZWRlbnRpYWxfdG9rZW5fb3Jfc2VjcmV0XCI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgT0F1dGguX2VuZE9mTG9naW5SZXNwb25zZShyZXMsIGRldGFpbHMpO1xuICB9XG59O1xuXG4vLyBUaGlzIFwidGVtcGxhdGVcIiAobm90IGEgcmVhbCBTcGFjZWJhcnMgdGVtcGxhdGUsIGp1c3QgYW4gSFRNTCBmaWxlXG4vLyB3aXRoIHNvbWUgIyNQTEFDRUhPTERFUiMjcykgY29tbXVuaWNhdGVzIHRoZSBjcmVkZW50aWFsIHNlY3JldCBiYWNrXG4vLyB0byB0aGUgbWFpbiB3aW5kb3cgYW5kIHRoZW4gY2xvc2VzIHRoZSBwb3B1cC5cbk9BdXRoLl9lbmRPZlBvcHVwUmVzcG9uc2VUZW1wbGF0ZSA9IEFzc2V0cy5nZXRUZXh0KFxuICBcImVuZF9vZl9wb3B1cF9yZXNwb25zZS5odG1sXCIpO1xuXG5PQXV0aC5fZW5kT2ZSZWRpcmVjdFJlc3BvbnNlVGVtcGxhdGUgPSBBc3NldHMuZ2V0VGV4dChcbiAgXCJlbmRfb2ZfcmVkaXJlY3RfcmVzcG9uc2UuaHRtbFwiKTtcblxuLy8gUmVuZGVycyB0aGUgZW5kIG9mIGxvZ2luIHJlc3BvbnNlIHRlbXBsYXRlIGludG8gc29tZSBIVE1MIGFuZCBKYXZhU2NyaXB0XG4vLyB0aGF0IGNsb3NlcyB0aGUgcG9wdXAgb3IgcmVkaXJlY3RzIGF0IHRoZSBlbmQgb2YgdGhlIE9BdXRoIGZsb3cuXG4vL1xuLy8gb3B0aW9ucyBhcmU6XG4vLyAgIC0gbG9naW5TdHlsZSAoXCJwb3B1cFwiIG9yIFwicmVkaXJlY3RcIilcbi8vICAgLSBzZXRDcmVkZW50aWFsVG9rZW4gKGJvb2xlYW4pXG4vLyAgIC0gY3JlZGVudGlhbFRva2VuXG4vLyAgIC0gY3JlZGVudGlhbFNlY3JldFxuLy8gICAtIHJlZGlyZWN0VXJsXG4vLyAgIC0gaXNDb3Jkb3ZhIChib29sZWFuKVxuLy9cbmNvbnN0IHJlbmRlckVuZE9mTG9naW5SZXNwb25zZSA9IG9wdGlvbnMgPT4ge1xuICAvLyBJdCB3b3VsZCBiZSBuaWNlIHRvIHVzZSBCbGF6ZSBoZXJlLCBidXQgaXQncyBhIGxpdHRsZSB0cmlja3lcbiAgLy8gYmVjYXVzZSBvdXIgbXVzdGFjaGVzIHdvdWxkIGJlIGluc2lkZSBhIDxzY3JpcHQ+IHRhZywgYW5kIEJsYXplXG4gIC8vIHdvdWxkIHRyZWF0IHRoZSA8c2NyaXB0PiB0YWcgY29udGVudHMgYXMgdGV4dCAoZS5nLiBlbmNvZGUgJyYnIGFzXG4gIC8vICcmYW1wOycpLiBTbyB3ZSBqdXN0IGRvIGEgc2ltcGxlIHJlcGxhY2UuXG5cbiAgY29uc3QgZXNjYXBlID0gcyA9PiB7XG4gICAgaWYgKHMpIHtcbiAgICAgIHJldHVybiBzLnJlcGxhY2UoLyYvZywgXCImYW1wO1wiKS5cbiAgICAgICAgcmVwbGFjZSgvPC9nLCBcIiZsdDtcIikuXG4gICAgICAgIHJlcGxhY2UoLz4vZywgXCImZ3Q7XCIpLlxuICAgICAgICByZXBsYWNlKC9cXFwiL2csIFwiJnF1b3Q7XCIpLlxuICAgICAgICByZXBsYWNlKC9cXCcvZywgXCImI3gyNztcIikuXG4gICAgICAgIHJlcGxhY2UoL1xcLy9nLCBcIiYjeDJGO1wiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHM7XG4gICAgfVxuICB9O1xuXG4gIC8vIEVzY2FwZSBldmVyeXRoaW5nIGp1c3QgdG8gYmUgc2FmZSAod2UndmUgYWxyZWFkeSBjaGVja2VkIHRoYXQgc29tZVxuICAvLyBvZiB0aGlzIGRhdGEgLS0gdGhlIHRva2VuIGFuZCBzZWNyZXQgLS0gYXJlIHNhZmUpLlxuICBjb25zdCBjb25maWcgPSB7XG4gICAgc2V0Q3JlZGVudGlhbFRva2VuOiAhISBvcHRpb25zLnNldENyZWRlbnRpYWxUb2tlbixcbiAgICBjcmVkZW50aWFsVG9rZW46IGVzY2FwZShvcHRpb25zLmNyZWRlbnRpYWxUb2tlbiksXG4gICAgY3JlZGVudGlhbFNlY3JldDogZXNjYXBlKG9wdGlvbnMuY3JlZGVudGlhbFNlY3JldCksXG4gICAgc3RvcmFnZVByZWZpeDogZXNjYXBlKE9BdXRoLl9zdG9yYWdlVG9rZW5QcmVmaXgpLFxuICAgIHJlZGlyZWN0VXJsOiBlc2NhcGUob3B0aW9ucy5yZWRpcmVjdFVybCksXG4gICAgaXNDb3Jkb3ZhOiAhISBvcHRpb25zLmlzQ29yZG92YVxuICB9O1xuXG4gIGxldCB0ZW1wbGF0ZTtcbiAgaWYgKG9wdGlvbnMubG9naW5TdHlsZSA9PT0gJ3BvcHVwJykge1xuICAgIHRlbXBsYXRlID0gT0F1dGguX2VuZE9mUG9wdXBSZXNwb25zZVRlbXBsYXRlO1xuICB9IGVsc2UgaWYgKG9wdGlvbnMubG9naW5TdHlsZSA9PT0gJ3JlZGlyZWN0Jykge1xuICAgIHRlbXBsYXRlID0gT0F1dGguX2VuZE9mUmVkaXJlY3RSZXNwb25zZVRlbXBsYXRlO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCBsb2dpblN0eWxlOiAke29wdGlvbnMubG9naW5TdHlsZX1gKTtcbiAgfVxuXG4gIGNvbnN0IHJlc3VsdCA9IHRlbXBsYXRlLnJlcGxhY2UoLyMjQ09ORklHIyMvLCBKU09OLnN0cmluZ2lmeShjb25maWcpKVxuICAgIC5yZXBsYWNlKFxuICAgICAgLyMjUk9PVF9VUkxfUEFUSF9QUkVGSVgjIy8sIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkxfUEFUSF9QUkVGSVhcbiAgICApO1xuXG4gIHJldHVybiBgPCFET0NUWVBFIGh0bWw+XFxuJHtyZXN1bHR9YDtcbn07XG5cbi8vIFdyaXRlcyBhbiBIVFRQIHJlc3BvbnNlIHRvIHRoZSBwb3B1cCB3aW5kb3cgYXQgdGhlIGVuZCBvZiBhbiBPQXV0aFxuLy8gbG9naW4gZmxvdy4gQXQgdGhpcyBwb2ludCwgaWYgdGhlIHVzZXIgaGFzIHN1Y2Nlc3NmdWxseSBhdXRoZW50aWNhdGVkXG4vLyB0byB0aGUgT0F1dGggc2VydmVyIGFuZCBhdXRob3JpemVkIHRoaXMgYXBwLCB3ZSBjb21tdW5pY2F0ZSB0aGVcbi8vIGNyZWRlbnRpYWxUb2tlbiBhbmQgY3JlZGVudGlhbFNlY3JldCB0byB0aGUgbWFpbiB3aW5kb3cuIFRoZSBtYWluXG4vLyB3aW5kb3cgbXVzdCBwcm92aWRlIGJvdGggdGhlc2UgdmFsdWVzIHRvIHRoZSBERFAgYGxvZ2luYCBtZXRob2QgdG9cbi8vIGF1dGhlbnRpY2F0ZSBpdHMgRERQIGNvbm5lY3Rpb24uIEFmdGVyIGNvbW11bmljYXRpbmcgdGhlc2UgdmF1ZXMgdG9cbi8vIHRoZSBtYWluIHdpbmRvdywgd2UgY2xvc2UgdGhlIHBvcHVwLlxuLy9cbi8vIFdlIGV4cG9ydCB0aGlzIGZ1bmN0aW9uIHNvIHRoYXQgZGV2ZWxvcGVycyBjYW4gb3ZlcnJpZGUgdGhpc1xuLy8gYmVoYXZpb3IsIHdoaWNoIGlzIHBhcnRpY3VsYXJseSB1c2VmdWwgaW4sIGZvciBleGFtcGxlLCBzb21lIG1vYmlsZVxuLy8gZW52aXJvbm1lbnRzIHdoZXJlIHBvcHVwcyBhbmQvb3IgYHdpbmRvdy5vcGVuZXJgIGRvbid0IHdvcmsuIEZvclxuLy8gZXhhbXBsZSwgYW4gYXBwIGNvdWxkIG92ZXJyaWRlIGBPQXV0aC5fZW5kT2ZQb3B1cFJlc3BvbnNlYCB0byBwdXQgdGhlXG4vLyBjcmVkZW50aWFsIHRva2VuIGFuZCBjcmVkZW50aWFsIHNlY3JldCBpbiB0aGUgcG9wdXAgVVJMIGZvciB0aGUgbWFpblxuLy8gd2luZG93IHRvIHJlYWQgdGhlbSB0aGVyZSBpbnN0ZWFkIG9mIHVzaW5nIGB3aW5kb3cub3BlbmVyYC4gSWYgeW91XG4vLyBvdmVycmlkZSB0aGlzIGZ1bmN0aW9uLCB5b3UgdGFrZSByZXNwb25zaWJpbGl0eSBmb3Igd3JpdGluZyB0byB0aGVcbi8vIHJlcXVlc3QgYW5kIGNhbGxpbmcgYHJlcy5lbmQoKWAgdG8gY29tcGxldGUgdGhlIHJlcXVlc3QuXG4vL1xuLy8gQXJndW1lbnRzOlxuLy8gICAtIHJlczogdGhlIEhUVFAgcmVzcG9uc2Ugb2JqZWN0XG4vLyAgIC0gZGV0YWlsczpcbi8vICAgICAgLSBxdWVyeTogdGhlIHF1ZXJ5IHN0cmluZyBvbiB0aGUgSFRUUCByZXF1ZXN0XG4vLyAgICAgIC0gY3JlZGVudGlhbHM6IHsgdG9rZW46ICosIHNlY3JldDogKiB9LiBJZiBwcmVzZW50LCB0aGlzIGZpZWxkXG4vLyAgICAgICAgaW5kaWNhdGVzIHRoYXQgdGhlIGxvZ2luIHdhcyBzdWNjZXNzZnVsLiBSZXR1cm4gdGhlc2UgdmFsdWVzXG4vLyAgICAgICAgdG8gdGhlIGNsaWVudCwgd2hvIGNhbiB1c2UgdGhlbSB0byBsb2cgaW4gb3ZlciBERFAuIElmXG4vLyAgICAgICAgcHJlc2VudCwgdGhlIHZhbHVlcyBoYXZlIGJlZW4gY2hlY2tlZCBhZ2FpbnN0IGEgbGltaXRlZFxuLy8gICAgICAgIGNoYXJhY3RlciBzZXQgYW5kIGFyZSBzYWZlIHRvIGluY2x1ZGUgaW4gSFRNTC5cbi8vICAgICAgLSBlcnJvcjogaWYgcHJlc2VudCwgYSBzdHJpbmcgb3IgRXJyb3IgaW5kaWNhdGluZyBhbiBlcnJvciB0aGF0XG4vLyAgICAgICAgb2NjdXJyZWQgZHVyaW5nIHRoZSBsb2dpbi4gVGhpcyBjYW4gY29tZSBmcm9tIHRoZSBjbGllbnQgYW5kXG4vLyAgICAgICAgc28gc2hvdWxkbid0IGJlIHRydXN0ZWQgZm9yIHNlY3VyaXR5IGRlY2lzaW9ucyBvciBpbmNsdWRlZCBpblxuLy8gICAgICAgIHRoZSByZXNwb25zZSB3aXRob3V0IHNhbml0aXppbmcgaXQgZmlyc3QuIE9ubHkgb25lIG9mIGBlcnJvcmBcbi8vICAgICAgICBvciBgY3JlZGVudGlhbHNgIHNob3VsZCBiZSBzZXQuXG5PQXV0aC5fZW5kT2ZMb2dpblJlc3BvbnNlID0gKHJlcywgZGV0YWlscykgPT4ge1xuICByZXMud3JpdGVIZWFkKDIwMCwgeydDb250ZW50LVR5cGUnOiAndGV4dC9odG1sJ30pO1xuXG4gIGxldCByZWRpcmVjdFVybDtcbiAgaWYgKGRldGFpbHMubG9naW5TdHlsZSA9PT0gJ3JlZGlyZWN0Jykge1xuICAgIHJlZGlyZWN0VXJsID0gT0F1dGguX3N0YXRlRnJvbVF1ZXJ5KGRldGFpbHMucXVlcnkpLnJlZGlyZWN0VXJsO1xuICAgIGNvbnN0IGFwcEhvc3QgPSBNZXRlb3IuYWJzb2x1dGVVcmwoKTtcbiAgICBpZiAoT0F1dGguX2NoZWNrUmVkaXJlY3RVcmxPcmlnaW4ocmVkaXJlY3RVcmwpKSB7XG4gICAgICBkZXRhaWxzLmVycm9yID0gYHJlZGlyZWN0VXJsICgke3JlZGlyZWN0VXJsfWAgK1xuICAgICAgICBgKSBpcyBub3Qgb24gdGhlIHNhbWUgaG9zdCBhcyB0aGUgYXBwICgke2FwcEhvc3R9KWA7XG4gICAgICByZWRpcmVjdFVybCA9IGFwcEhvc3Q7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgaXNDb3Jkb3ZhID0gT0F1dGguX2lzQ29yZG92YUZyb21RdWVyeShkZXRhaWxzLnF1ZXJ5KTtcblxuICBpZiAoZGV0YWlscy5lcnJvcikge1xuICAgIExvZy53YXJuKFwiRXJyb3IgaW4gT0F1dGggU2VydmVyOiBcIiArXG4gICAgICAgICAgICAgKGRldGFpbHMuZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/XG4gICAgICAgICAgICAgIGRldGFpbHMuZXJyb3IubWVzc2FnZSA6IGRldGFpbHMuZXJyb3IpKTtcbiAgICByZXMuZW5kKHJlbmRlckVuZE9mTG9naW5SZXNwb25zZSh7XG4gICAgICBsb2dpblN0eWxlOiBkZXRhaWxzLmxvZ2luU3R5bGUsXG4gICAgICBzZXRDcmVkZW50aWFsVG9rZW46IGZhbHNlLFxuICAgICAgcmVkaXJlY3RVcmwsXG4gICAgICBpc0NvcmRvdmEsXG4gICAgfSksIFwidXRmLThcIik7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gSWYgd2UgaGF2ZSBhIGNyZWRlbnRpYWxTZWNyZXQsIHJlcG9ydCBpdCBiYWNrIHRvIHRoZSBwYXJlbnRcbiAgLy8gd2luZG93LCB3aXRoIHRoZSBjb3JyZXNwb25kaW5nIGNyZWRlbnRpYWxUb2tlbi4gVGhlIHBhcmVudCB3aW5kb3dcbiAgLy8gdXNlcyB0aGUgY3JlZGVudGlhbFRva2VuIGFuZCBjcmVkZW50aWFsU2VjcmV0IHRvIGxvZyBpbiBvdmVyIEREUC5cbiAgcmVzLmVuZChyZW5kZXJFbmRPZkxvZ2luUmVzcG9uc2Uoe1xuICAgIGxvZ2luU3R5bGU6IGRldGFpbHMubG9naW5TdHlsZSxcbiAgICBzZXRDcmVkZW50aWFsVG9rZW46IHRydWUsXG4gICAgY3JlZGVudGlhbFRva2VuOiBkZXRhaWxzLmNyZWRlbnRpYWxzLnRva2VuLFxuICAgIGNyZWRlbnRpYWxTZWNyZXQ6IGRldGFpbHMuY3JlZGVudGlhbHMuc2VjcmV0LFxuICAgIHJlZGlyZWN0VXJsLFxuICAgIGlzQ29yZG92YSxcbiAgfSksIFwidXRmLThcIik7XG59O1xuXG5cbmNvbnN0IE9BdXRoRW5jcnlwdGlvbiA9IFBhY2thZ2VbXCJvYXV0aC1lbmNyeXB0aW9uXCJdICYmIFBhY2thZ2VbXCJvYXV0aC1lbmNyeXB0aW9uXCJdLk9BdXRoRW5jcnlwdGlvbjtcblxuY29uc3QgdXNpbmdPQXV0aEVuY3J5cHRpb24gPSAoKSA9PlxuICBPQXV0aEVuY3J5cHRpb24gJiYgT0F1dGhFbmNyeXB0aW9uLmtleUlzTG9hZGVkKCk7XG5cbi8vIEVuY3J5cHQgc2Vuc2l0aXZlIHNlcnZpY2UgZGF0YSBzdWNoIGFzIGFjY2VzcyB0b2tlbnMgaWYgdGhlXG4vLyBcIm9hdXRoLWVuY3J5cHRpb25cIiBwYWNrYWdlIGlzIGxvYWRlZCBhbmQgdGhlIG9hdXRoIHNlY3JldCBrZXkgaGFzXG4vLyBiZWVuIHNwZWNpZmllZC4gIFJldHVybnMgdGhlIHVuZW5jcnlwdGVkIHBsYWludGV4dCBvdGhlcndpc2UuXG4vL1xuLy8gVGhlIHVzZXIgaWQgaXMgbm90IHNwZWNpZmllZCBiZWNhdXNlIHRoZSB1c2VyIGlzbid0IGtub3duIHlldCBhdFxuLy8gdGhpcyBwb2ludCBpbiB0aGUgb2F1dGggYXV0aGVudGljYXRpb24gcHJvY2Vzcy4gIEFmdGVyIHRoZSBvYXV0aFxuLy8gYXV0aGVudGljYXRpb24gcHJvY2VzcyBjb21wbGV0ZXMgdGhlIGVuY3J5cHRlZCBzZXJ2aWNlIGRhdGEgZmllbGRzXG4vLyB3aWxsIGJlIHJlLWVuY3J5cHRlZCB3aXRoIHRoZSB1c2VyIGlkIGluY2x1ZGVkIGJlZm9yZSBpbnNlcnRpbmcgdGhlXG4vLyBzZXJ2aWNlIGRhdGEgaW50byB0aGUgdXNlciBkb2N1bWVudC5cbi8vXG5PQXV0aC5zZWFsU2VjcmV0ID0gcGxhaW50ZXh0ID0+IHtcbiAgaWYgKHVzaW5nT0F1dGhFbmNyeXB0aW9uKCkpXG4gICAgcmV0dXJuIE9BdXRoRW5jcnlwdGlvbi5zZWFsKHBsYWludGV4dCk7XG4gIGVsc2VcbiAgICByZXR1cm4gcGxhaW50ZXh0O1xufTtcblxuLy8gVW5lbmNyeXB0IGEgc2VydmljZSBkYXRhIGZpZWxkLCBpZiB0aGUgXCJvYXV0aC1lbmNyeXB0aW9uXCJcbi8vIHBhY2thZ2UgaXMgbG9hZGVkIGFuZCB0aGUgZmllbGQgaXMgZW5jcnlwdGVkLlxuLy9cbi8vIFRocm93cyBhbiBlcnJvciBpZiB0aGUgXCJvYXV0aC1lbmNyeXB0aW9uXCIgcGFja2FnZSBpcyBsb2FkZWQgYW5kIHRoZVxuLy8gZmllbGQgaXMgZW5jcnlwdGVkLCBidXQgdGhlIG9hdXRoIHNlY3JldCBrZXkgaGFzbid0IGJlZW4gc3BlY2lmaWVkLlxuLy9cbk9BdXRoLm9wZW5TZWNyZXQgPSAobWF5YmVTZWNyZXQsIHVzZXJJZCkgPT4ge1xuICBpZiAoIVBhY2thZ2VbXCJvYXV0aC1lbmNyeXB0aW9uXCJdIHx8ICFPQXV0aEVuY3J5cHRpb24uaXNTZWFsZWQobWF5YmVTZWNyZXQpKVxuICAgIHJldHVybiBtYXliZVNlY3JldDtcblxuICByZXR1cm4gT0F1dGhFbmNyeXB0aW9uLm9wZW4obWF5YmVTZWNyZXQsIHVzZXJJZCk7XG59O1xuXG4vLyBVbmVuY3J5cHQgZmllbGRzIGluIHRoZSBzZXJ2aWNlIGRhdGEgb2JqZWN0LlxuLy9cbk9BdXRoLm9wZW5TZWNyZXRzID0gKHNlcnZpY2VEYXRhLCB1c2VySWQpID0+IHtcbiAgY29uc3QgcmVzdWx0ID0ge307XG4gIE9iamVjdC5rZXlzKHNlcnZpY2VEYXRhKS5mb3JFYWNoKGtleSA9PlxuICAgIHJlc3VsdFtrZXldID0gT0F1dGgub3BlblNlY3JldChzZXJ2aWNlRGF0YVtrZXldLCB1c2VySWQpXG4gICk7XG4gIHJldHVybiByZXN1bHQ7XG59O1xuIiwiLy9cbi8vIFdoZW4gYW4gb2F1dGggcmVxdWVzdCBpcyBtYWRlLCBNZXRlb3IgcmVjZWl2ZXMgb2F1dGggY3JlZGVudGlhbHNcbi8vIGluIG9uZSBicm93c2VyIHRhYiwgYW5kIHRlbXBvcmFyaWx5IHBlcnNpc3RzIHRoZW0gd2hpbGUgdGhhdFxuLy8gdGFiIGlzIGNsb3NlZCwgdGhlbiByZXRyaWV2ZXMgdGhlbSBpbiB0aGUgYnJvd3NlciB0YWIgdGhhdFxuLy8gaW5pdGlhdGVkIHRoZSBjcmVkZW50aWFsIHJlcXVlc3QuXG4vL1xuLy8gX3BlbmRpbmdDcmVkZW50aWFscyBpcyB0aGUgc3RvcmFnZSBtZWNoYW5pc20gdXNlZCB0byBzaGFyZSB0aGVcbi8vIGNyZWRlbnRpYWwgYmV0d2VlbiB0aGUgMiB0YWJzXG4vL1xuXG5cbi8vIENvbGxlY3Rpb24gY29udGFpbmluZyBwZW5kaW5nIGNyZWRlbnRpYWxzIG9mIG9hdXRoIGNyZWRlbnRpYWwgcmVxdWVzdHNcbi8vIEhhcyBrZXksIGNyZWRlbnRpYWwsIGFuZCBjcmVhdGVkQXQgZmllbGRzLlxuT0F1dGguX3BlbmRpbmdDcmVkZW50aWFscyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKFxuICBcIm1ldGVvcl9vYXV0aF9wZW5kaW5nQ3JlZGVudGlhbHNcIiwge1xuICAgIF9wcmV2ZW50QXV0b3B1Ymxpc2g6IHRydWVcbiAgfSk7XG5cbk9BdXRoLl9wZW5kaW5nQ3JlZGVudGlhbHMuX2Vuc3VyZUluZGV4KCdrZXknLCB7dW5pcXVlOiAxfSk7XG5PQXV0aC5fcGVuZGluZ0NyZWRlbnRpYWxzLl9lbnN1cmVJbmRleCgnY3JlZGVudGlhbFNlY3JldCcpO1xuT0F1dGguX3BlbmRpbmdDcmVkZW50aWFscy5fZW5zdXJlSW5kZXgoJ2NyZWF0ZWRBdCcpO1xuXG5cblxuLy8gUGVyaW9kaWNhbGx5IGNsZWFyIG9sZCBlbnRyaWVzIHRoYXQgd2VyZSBuZXZlciByZXRyaWV2ZWRcbmNvbnN0IF9jbGVhblN0YWxlUmVzdWx0cyA9ICgpID0+IHtcbiAgLy8gUmVtb3ZlIGNyZWRlbnRpYWxzIG9sZGVyIHRoYW4gMSBtaW51dGVcbiAgY29uc3QgdGltZUN1dG9mZiA9IG5ldyBEYXRlKCk7XG4gIHRpbWVDdXRvZmYuc2V0TWludXRlcyh0aW1lQ3V0b2ZmLmdldE1pbnV0ZXMoKSAtIDEpO1xuICBPQXV0aC5fcGVuZGluZ0NyZWRlbnRpYWxzLnJlbW92ZSh7IGNyZWF0ZWRBdDogeyAkbHQ6IHRpbWVDdXRvZmYgfSB9KTtcbn07XG5jb25zdCBfY2xlYW51cEhhbmRsZSA9IE1ldGVvci5zZXRJbnRlcnZhbChfY2xlYW5TdGFsZVJlc3VsdHMsIDYwICogMTAwMCk7XG5cblxuLy8gU3RvcmVzIHRoZSBrZXkgYW5kIGNyZWRlbnRpYWwgaW4gdGhlIF9wZW5kaW5nQ3JlZGVudGlhbHMgY29sbGVjdGlvbi5cbi8vIFdpbGwgdGhyb3cgYW4gZXhjZXB0aW9uIGlmIGBrZXlgIGlzIG5vdCBhIHN0cmluZy5cbi8vXG4vLyBAcGFyYW0ga2V5IHtzdHJpbmd9XG4vLyBAcGFyYW0gY3JlZGVudGlhbCB7T2JqZWN0fSAgIFRoZSBjcmVkZW50aWFsIHRvIHN0b3JlXG4vLyBAcGFyYW0gY3JlZGVudGlhbFNlY3JldCB7c3RyaW5nfSBBIHNlY3JldCB0aGF0IG11c3QgYmUgcHJlc2VudGVkIGluXG4vLyAgIGFkZGl0aW9uIHRvIHRoZSBga2V5YCB0byByZXRyaWV2ZSB0aGUgY3JlZGVudGlhbFxuLy9cbk9BdXRoLl9zdG9yZVBlbmRpbmdDcmVkZW50aWFsID0gKGtleSwgY3JlZGVudGlhbCwgY3JlZGVudGlhbFNlY3JldCA9IG51bGwpID0+IHtcbiAgY2hlY2soa2V5LCBTdHJpbmcpO1xuICBjaGVjayhjcmVkZW50aWFsU2VjcmV0LCBNYXRjaC5NYXliZShTdHJpbmcpKTtcblxuICBpZiAoY3JlZGVudGlhbCBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgY3JlZGVudGlhbCA9IHN0b3JhYmxlRXJyb3IoY3JlZGVudGlhbCk7XG4gIH0gZWxzZSB7XG4gICAgY3JlZGVudGlhbCA9IE9BdXRoLnNlYWxTZWNyZXQoY3JlZGVudGlhbCk7XG4gIH1cblxuICAvLyBXZSBkbyBhbiB1cHNlcnQgaGVyZSBpbnN0ZWFkIG9mIGFuIGluc2VydCBpbiBjYXNlIHRoZSB1c2VyIGhhcHBlbnNcbiAgLy8gdG8gc29tZWhvdyBzZW5kIHRoZSBzYW1lIGBzdGF0ZWAgcGFyYW1ldGVyIHR3aWNlIGR1cmluZyBhbiBPQXV0aFxuICAvLyBsb2dpbjsgd2UgZG9uJ3Qgd2FudCBhIGR1cGxpY2F0ZSBrZXkgZXJyb3IuXG4gIE9BdXRoLl9wZW5kaW5nQ3JlZGVudGlhbHMudXBzZXJ0KHtcbiAgICBrZXksXG4gIH0sIHtcbiAgICBrZXksXG4gICAgY3JlZGVudGlhbCxcbiAgICBjcmVkZW50aWFsU2VjcmV0LFxuICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKVxuICB9KTtcbn07XG5cblxuLy8gUmV0cmlldmVzIGFuZCByZW1vdmVzIGEgY3JlZGVudGlhbCBmcm9tIHRoZSBfcGVuZGluZ0NyZWRlbnRpYWxzIGNvbGxlY3Rpb25cbi8vXG4vLyBAcGFyYW0ga2V5IHtzdHJpbmd9XG4vLyBAcGFyYW0gY3JlZGVudGlhbFNlY3JldCB7c3RyaW5nfVxuLy9cbk9BdXRoLl9yZXRyaWV2ZVBlbmRpbmdDcmVkZW50aWFsID0gKGtleSwgY3JlZGVudGlhbFNlY3JldCA9IG51bGwpID0+IHtcbiAgY2hlY2soa2V5LCBTdHJpbmcpO1xuXG4gIGNvbnN0IHBlbmRpbmdDcmVkZW50aWFsID0gT0F1dGguX3BlbmRpbmdDcmVkZW50aWFscy5maW5kT25lKHtcbiAgICBrZXksXG4gICAgY3JlZGVudGlhbFNlY3JldCxcbiAgfSk7XG5cbiAgaWYgKHBlbmRpbmdDcmVkZW50aWFsKSB7XG4gICAgT0F1dGguX3BlbmRpbmdDcmVkZW50aWFscy5yZW1vdmUoeyBfaWQ6IHBlbmRpbmdDcmVkZW50aWFsLl9pZCB9KTtcbiAgICBpZiAocGVuZGluZ0NyZWRlbnRpYWwuY3JlZGVudGlhbC5lcnJvcilcbiAgICAgIHJldHVybiByZWNyZWF0ZUVycm9yKHBlbmRpbmdDcmVkZW50aWFsLmNyZWRlbnRpYWwuZXJyb3IpO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBPQXV0aC5vcGVuU2VjcmV0KHBlbmRpbmdDcmVkZW50aWFsLmNyZWRlbnRpYWwpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn07XG5cblxuLy8gQ29udmVydCBhbiBFcnJvciBpbnRvIGFuIG9iamVjdCB0aGF0IGNhbiBiZSBzdG9yZWQgaW4gbW9uZ29cbi8vIE5vdGU6IEEgTWV0ZW9yLkVycm9yIGlzIHJlY29uc3RydWN0ZWQgYXMgYSBNZXRlb3IuRXJyb3Jcbi8vIEFsbCBvdGhlciBlcnJvciBjbGFzc2VzIGFyZSByZWNvbnN0cnVjdGVkIGFzIGEgcGxhaW4gRXJyb3IuXG4vLyBUT0RPOiBDYW4gd2UgZG8gdGhpcyBtb3JlIHNpbXBseSB3aXRoIEVKU09OP1xuY29uc3Qgc3RvcmFibGVFcnJvciA9IGVycm9yID0+IHtcbiAgY29uc3QgcGxhaW5PYmplY3QgPSB7fTtcbiAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoZXJyb3IpLmZvckVhY2goXG4gICAga2V5ID0+IHBsYWluT2JqZWN0W2tleV0gPSBlcnJvcltrZXldXG4gICk7XG5cbiAgLy8gS2VlcCB0cmFjayBvZiB3aGV0aGVyIGl0J3MgYSBNZXRlb3IuRXJyb3JcbiAgaWYoZXJyb3IgaW5zdGFuY2VvZiBNZXRlb3IuRXJyb3IpIHtcbiAgICBwbGFpbk9iamVjdFsnbWV0ZW9yRXJyb3InXSA9IHRydWU7XG4gIH1cblxuICByZXR1cm4geyBlcnJvcjogcGxhaW5PYmplY3QgfTtcbn07XG5cbi8vIENyZWF0ZSBhbiBlcnJvciBmcm9tIHRoZSBlcnJvciBmb3JtYXQgc3RvcmVkIGluIG1vbmdvXG5jb25zdCByZWNyZWF0ZUVycm9yID0gZXJyb3JEb2MgPT4ge1xuICBsZXQgZXJyb3I7XG5cbiAgaWYgKGVycm9yRG9jLm1ldGVvckVycm9yKSB7XG4gICAgZXJyb3IgPSBuZXcgTWV0ZW9yLkVycm9yKCk7XG4gICAgZGVsZXRlIGVycm9yRG9jLm1ldGVvckVycm9yO1xuICB9IGVsc2Uge1xuICAgIGVycm9yID0gbmV3IEVycm9yKCk7XG4gIH1cblxuICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhlcnJvckRvYykuZm9yRWFjaChrZXkgPT5cbiAgICBlcnJvcltrZXldID0gZXJyb3JEb2Nba2V5XVxuICApO1xuXG4gIHJldHVybiBlcnJvcjtcbn07XG4iLCJPQXV0aC5fc3RvcmFnZVRva2VuUHJlZml4ID0gXCJNZXRlb3Iub2F1dGguY3JlZGVudGlhbFNlY3JldC1cIjtcblxuT0F1dGguX3JlZGlyZWN0VXJpID0gKHNlcnZpY2VOYW1lLCBjb25maWcsIHBhcmFtcywgYWJzb2x1dGVVcmxPcHRpb25zKSA9PiB7XG4gIC8vIFhYWCBDT01QQVQgV0lUSCAwLjkuMFxuICAvLyBUaGUgcmVkaXJlY3QgVVJJIHVzZWQgdG8gaGF2ZSBhIFwiP2Nsb3NlXCIgcXVlcnkgYXJndW1lbnQuICBXZVxuICAvLyBkZXRlY3Qgd2hldGhlciB3ZSBuZWVkIHRvIGJlIGJhY2t3YXJkcyBjb21wYXRpYmxlIGJ5IGNoZWNraW5nIGZvclxuICAvLyB0aGUgYWJzZW5jZSBvZiB0aGUgYGxvZ2luU3R5bGVgIGZpZWxkLCB3aGljaCB3YXNuJ3QgdXNlZCBpbiB0aGVcbiAgLy8gY29kZSB3aGljaCBoYWQgdGhlIFwiP2Nsb3NlXCIgYXJndW1lbnQuXG4gIC8vIFRoaXMgbG9naWMgaXMgZHVwbGljYXRlZCBpbiB0aGUgdG9vbCBzbyB0aGF0IHRoZSB0b29sIGNhbiBkbyBPQXV0aFxuICAvLyBmbG93IHdpdGggPD0gMC45LjAgc2VydmVycyAodG9vbHMvYXV0aC5qcykuXG4gIGNvbnN0IHF1ZXJ5ID0gY29uZmlnLmxvZ2luU3R5bGUgPyBudWxsIDogXCJjbG9zZVwiO1xuXG4gIC8vIENsb25lIGJlY2F1c2Ugd2UncmUgZ29pbmcgdG8gbXV0YXRlICdwYXJhbXMnLiBUaGUgJ2NvcmRvdmEnIGFuZFxuICAvLyAnYW5kcm9pZCcgcGFyYW1ldGVycyBhcmUgb25seSB1c2VkIGZvciBwaWNraW5nIHRoZSBob3N0IG9mIHRoZVxuICAvLyByZWRpcmVjdCBVUkwsIGFuZCBub3QgYWN0dWFsbHkgaW5jbHVkZWQgaW4gdGhlIHJlZGlyZWN0IFVSTCBpdHNlbGYuXG4gIGxldCBpc0NvcmRvdmEgPSBmYWxzZTtcbiAgbGV0IGlzQW5kcm9pZCA9IGZhbHNlO1xuICBpZiAocGFyYW1zKSB7XG4gICAgcGFyYW1zID0geyAuLi5wYXJhbXMgfTtcbiAgICBpc0NvcmRvdmEgPSBwYXJhbXMuY29yZG92YTtcbiAgICBpc0FuZHJvaWQgPSBwYXJhbXMuYW5kcm9pZDtcbiAgICBkZWxldGUgcGFyYW1zLmNvcmRvdmE7XG4gICAgZGVsZXRlIHBhcmFtcy5hbmRyb2lkO1xuICAgIGlmIChPYmplY3Qua2V5cyhwYXJhbXMpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcGFyYW1zID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIGlmIChNZXRlb3IuaXNTZXJ2ZXIgJiYgaXNDb3Jkb3ZhKSB7XG4gICAgY29uc3QgdXJsID0gTnBtLnJlcXVpcmUoJ3VybCcpO1xuICAgIGxldCByb290VXJsID0gcHJvY2Vzcy5lbnYuTU9CSUxFX1JPT1RfVVJMIHx8XG4gICAgICAgICAgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTDtcblxuICAgIGlmIChpc0FuZHJvaWQpIHtcbiAgICAgIC8vIE1hdGNoIHRoZSByZXBsYWNlIHRoYXQgd2UgZG8gaW4gY29yZG92YSBib2lsZXJwbGF0ZVxuICAgICAgLy8gKGJvaWxlcnBsYXRlLWdlbmVyYXRvciBwYWNrYWdlKS5cbiAgICAgIC8vIFhYWCBNYXliZSB3ZSBzaG91bGQgcHV0IHRoaXMgaW4gYSBzZXBhcmF0ZSBwYWNrYWdlIG9yIHNvbWV0aGluZ1xuICAgICAgLy8gdGhhdCBpcyB1c2VkIGhlcmUgYW5kIGJ5IGJvaWxlcnBsYXRlLWdlbmVyYXRvcj8gT3IgbWF5YmVcbiAgICAgIC8vIGBNZXRlb3IuYWJzb2x1dGVVcmxgIHNob3VsZCBrbm93IGhvdyB0byBkbyB0aGlzP1xuICAgICAgY29uc3QgcGFyc2VkUm9vdFVybCA9IHVybC5wYXJzZShyb290VXJsKTtcbiAgICAgIGlmIChwYXJzZWRSb290VXJsLmhvc3RuYW1lID09PSBcImxvY2FsaG9zdFwiKSB7XG4gICAgICAgIHBhcnNlZFJvb3RVcmwuaG9zdG5hbWUgPSBcIjEwLjAuMi4yXCI7XG4gICAgICAgIGRlbGV0ZSBwYXJzZWRSb290VXJsLmhvc3Q7XG4gICAgICB9XG4gICAgICByb290VXJsID0gdXJsLmZvcm1hdChwYXJzZWRSb290VXJsKTtcbiAgICB9XG5cbiAgICBhYnNvbHV0ZVVybE9wdGlvbnMgPSB7XG4gICAgICAuLi5hYnNvbHV0ZVVybE9wdGlvbnMsXG4gICAgICAvLyBGb3IgQ29yZG92YSBjbGllbnRzLCByZWRpcmVjdCB0byB0aGUgc3BlY2lhbCBDb3Jkb3ZhIHJvb3QgdXJsXG4gICAgICAvLyAobGlrZWx5IGEgbG9jYWwgSVAgaW4gZGV2ZWxvcG1lbnQgbW9kZSkuXG4gICAgICByb290VXJsLFxuICAgIH07XG4gIH1cblxuICByZXR1cm4gVVJMLl9jb25zdHJ1Y3RVcmwoXG4gICAgTWV0ZW9yLmFic29sdXRlVXJsKGBfb2F1dGgvJHtzZXJ2aWNlTmFtZX1gLCBhYnNvbHV0ZVVybE9wdGlvbnMpLFxuICAgIHF1ZXJ5LFxuICAgIHBhcmFtcyk7XG59O1xuIiwiLy8gWFhYIENPTVBBVCBXSVRIIDAuOC4wXG5cbk9hdXRoID0gT0F1dGg7XG4iXX0=
