(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var Random = Package.random.Random;
var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
var OAuth = Package.oauth.OAuth;
var Oauth = Package.oauth.Oauth;
var check = Package.check.check;
var Match = Package.check.Match;
var HTTP = Package.http.HTTP;
var HTTPInternals = Package.http.HTTPInternals;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var params, url, OAuth1Binding, OAuth1Test;

var require = meteorInstall({"node_modules":{"meteor":{"oauth1":{"oauth1_binding.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/oauth1/oauth1_binding.js                                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

module.export({
  OAuth1Binding: () => OAuth1Binding
});
let crypto;
module.link("crypto", {
  default(v) {
    crypto = v;
  }

}, 0);
let querystring;
module.link("querystring", {
  default(v) {
    querystring = v;
  }

}, 1);
let urlModule;
module.link("url", {
  default(v) {
    urlModule = v;
  }

}, 2);

class OAuth1Binding {
  constructor(config, urls) {
    this._config = config;
    this._urls = urls;
  }

  prepareRequestToken(callbackUrl) {
    const headers = this._buildHeader({
      oauth_callback: callbackUrl
    });

    const response = this._call('POST', this._urls.requestToken, headers);

    const tokens = querystring.parse(response.content);
    if (!tokens.oauth_callback_confirmed) throw Object.assign(new Error("oauth_callback_confirmed false when requesting oauth1 token"), {
      response: response
    });
    this.requestToken = tokens.oauth_token;
    this.requestTokenSecret = tokens.oauth_token_secret;
  }

  prepareAccessToken(query, requestTokenSecret) {
    // support implementations that use request token secrets. This is
    // read by this._call.
    //
    // XXX make it a param to call, not something stashed on self? It's
    // kinda confusing right now, everything except this is passed as
    // arguments, but this is stored.
    if (requestTokenSecret) this.accessTokenSecret = requestTokenSecret;

    const headers = this._buildHeader({
      oauth_token: query.oauth_token,
      oauth_verifier: query.oauth_verifier
    });

    const response = this._call('POST', this._urls.accessToken, headers);

    const tokens = querystring.parse(response.content);

    if (!tokens.oauth_token || !tokens.oauth_token_secret) {
      const error = new Error("missing oauth token or secret"); // We provide response only if no token is available, we do not want to leak any tokens

      if (!tokens.oauth_token && !tokens.oauth_token_secret) {
        Object.assign(error, {
          response: response
        });
      }

      throw error;
    }

    this.accessToken = tokens.oauth_token;
    this.accessTokenSecret = tokens.oauth_token_secret;
  }

  call(method, url, params, callback) {
    const headers = this._buildHeader({
      oauth_token: this.accessToken
    });

    if (!params) {
      params = {};
    }

    return this._call(method, url, headers, params, callback);
  }

  get(url, params, callback) {
    return this.call('GET', url, params, callback);
  }

  post(url, params, callback) {
    return this.call('POST', url, params, callback);
  }

  _buildHeader(headers) {
    return (0, _objectSpread2.default)({
      oauth_consumer_key: this._config.consumerKey,
      oauth_nonce: Random.secret().replace(/\W/g, ''),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: (new Date().valueOf() / 1000).toFixed().toString(),
      oauth_version: '1.0'
    }, headers);
  }

  _getSignature(method, url, rawHeaders, accessTokenSecret, params) {
    const headers = this._encodeHeader((0, _objectSpread2.default)({}, rawHeaders, params));

    const parameters = Object.keys(headers).map(key => `${key}=${headers[key]}`).sort().join('&');
    const signatureBase = [method, this._encodeString(url), this._encodeString(parameters)].join('&');
    const secret = OAuth.openSecret(this._config.secret);
    let signingKey = `${this._encodeString(secret)}&`;
    if (accessTokenSecret) signingKey += this._encodeString(accessTokenSecret);
    return crypto.createHmac('SHA1', signingKey).update(signatureBase).digest('base64');
  }

  _call(method, url, headers = {}, params = {}, callback) {
    // all URLs to be functions to support parameters/customization
    if (typeof url === "function") {
      url = url(this);
    } // Extract all query string parameters from the provided URL


    const parsedUrl = urlModule.parse(url, true); // Merge them in a way that params given to the method call have precedence

    params = (0, _objectSpread2.default)({}, parsedUrl.query, params); // Reconstruct the URL back without any query string parameters
    // (they are now in params)

    parsedUrl.query = {};
    parsedUrl.search = '';
    url = urlModule.format(parsedUrl); // Get the signature

    headers.oauth_signature = this._getSignature(method, url, headers, this.accessTokenSecret, params); // Make a authorization string according to oauth1 spec

    const authString = this._getAuthHeaderString(headers); // Make signed request


    try {
      const response = HTTP.call(method, url, {
        params,
        headers: {
          Authorization: authString
        }
      }, callback && ((error, response) => {
        if (!error) {
          response.nonce = headers.oauth_nonce;
        }

        callback(error, response);
      })); // We store nonce so that JWTs can be validated

      if (response) response.nonce = headers.oauth_nonce;
      return response;
    } catch (err) {
      throw Object.assign(new Error(`Failed to send OAuth1 request to ${url}. ${err.message}`), {
        response: err.response
      });
    }
  }

  _encodeHeader(header) {
    return Object.keys(header).reduce((memo, key) => {
      memo[this._encodeString(key)] = this._encodeString(header[key]);
      return memo;
    }, {});
  }

  _encodeString(str) {
    return encodeURIComponent(str).replace(/[!'()]/g, escape).replace(/\*/g, "%2A");
  }

  _getAuthHeaderString(headers) {
    return 'OAuth ' + Object.keys(headers).map(key => `${this._encodeString(key)}="${this._encodeString(headers[key])}"`).sort().join(', ');
  }

}

;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oauth1_server.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/oauth1/oauth1_server.js                                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

const module1 = module;
let url;
module1.link("url", {
  default(v) {
    url = v;
  }

}, 0);
let OAuth1Binding;
module1.link("./oauth1_binding", {
  OAuth1Binding(v) {
    OAuth1Binding = v;
  }

}, 1);

OAuth._queryParamsWithAuthTokenUrl = (authUrl, oauthBinding, params = {}, whitelistedQueryParams = []) => {
  const redirectUrlObj = url.parse(authUrl, true);
  Object.assign(redirectUrlObj.query, whitelistedQueryParams.reduce((prev, param) => params.query[param] ? (0, _objectSpread2.default)({}, prev, {
    param: params.query[param]
  }) : prev, {}), {
    oauth_token: oauthBinding.requestToken
  }); // Clear the `search` so it is rebuilt by Node's `url` from the `query` above.
  // Using previous versions of the Node `url` module, this was just set to ""
  // However, Node 6 docs seem to indicate that this should be `undefined`.

  delete redirectUrlObj.search; // Reconstruct the URL back with provided query parameters merged with oauth_token

  return url.format(redirectUrlObj);
}; // connect middleware


OAuth._requestHandlers['1'] = (service, query, res) => {
  const config = ServiceConfiguration.configurations.findOne({
    service: service.serviceName
  });

  if (!config) {
    throw new ServiceConfiguration.ConfigError(service.serviceName);
  }

  const {
    urls
  } = service;
  const oauthBinding = new OAuth1Binding(config, urls);
  let credentialSecret;

  if (query.requestTokenAndRedirect) {
    // step 1 - get and store a request token
    const callbackUrl = OAuth._redirectUri(service.serviceName, config, {
      state: query.state,
      cordova: query.cordova === "true",
      android: query.android === "true"
    }); // Get a request token to start auth process


    oauthBinding.prepareRequestToken(callbackUrl); // Keep track of request token so we can verify it on the next step

    OAuth._storeRequestToken(OAuth._credentialTokenFromQuery(query), oauthBinding.requestToken, oauthBinding.requestTokenSecret); // support for scope/name parameters


    let redirectUrl;
    const authParams = {
      query
    };

    if (typeof urls.authenticate === "function") {
      redirectUrl = urls.authenticate(oauthBinding, authParams);
    } else {
      redirectUrl = OAuth._queryParamsWithAuthTokenUrl(urls.authenticate, oauthBinding, authParams);
    } // redirect to provider login, which will redirect back to "step 2" below


    res.writeHead(302, {
      'Location': redirectUrl
    });
    res.end();
  } else {
    // step 2, redirected from provider login - store the result
    // and close the window to allow the login handler to proceed
    // Get the user's request token so we can verify it and clear it
    const requestTokenInfo = OAuth._retrieveRequestToken(OAuth._credentialTokenFromQuery(query));

    if (!requestTokenInfo) {
      throw new Error("Unable to retrieve request token");
    } // Verify user authorized access and the oauth_token matches
    // the requestToken from previous step


    if (query.oauth_token && query.oauth_token === requestTokenInfo.requestToken) {
      // Prepare the login results before returning.  This way the
      // subsequent call to the `login` method will be immediate.
      // Get the access token for signing requests
      oauthBinding.prepareAccessToken(query, requestTokenInfo.requestTokenSecret); // Run service-specific handler.

      const oauthResult = service.handleOauthRequest(oauthBinding, {
        query: query
      });

      const credentialToken = OAuth._credentialTokenFromQuery(query);

      credentialSecret = Random.secret(); // Store the login result so it can be retrieved in another
      // browser tab by the result handler

      OAuth._storePendingCredential(credentialToken, {
        serviceName: service.serviceName,
        serviceData: oauthResult.serviceData,
        options: oauthResult.options
      }, credentialSecret);
    } // Either close the window, redirect, or render nothing
    // if all else fails


    OAuth._renderOauthResults(res, query, credentialSecret);
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oauth1_pending_request_tokens.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/oauth1/oauth1_pending_request_tokens.js                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
//
// _pendingRequestTokens are request tokens that have been received
// but not yet fully authorized (processed).
//
// During the oauth1 authorization process, the Meteor App opens
// a pop-up, requests a request token from the oauth1 service, and
// redirects the browser to the oauth1 service for the user
// to grant authorization.  The user is then returned to the
// Meteor Apps' callback url and the request token is verified.
//
// When Meteor Apps run on multiple servers, it's possible that
// 2 different servers may be used to generate the request token
// and to verify it in the callback once the user has authorized.
//
// For this reason, the _pendingRequestTokens are stored in the database
// so they can be shared across Meteor App servers.
//
// XXX This code is fairly similar to oauth/pending_credentials.js --
// maybe we can combine them somehow.
// Collection containing pending request tokens
// Has key, requestToken, requestTokenSecret, and createdAt fields.
OAuth._pendingRequestTokens = new Mongo.Collection("meteor_oauth_pendingRequestTokens", {
  _preventAutopublish: true
});

OAuth._pendingRequestTokens._ensureIndex('key', {
  unique: 1
});

OAuth._pendingRequestTokens._ensureIndex('createdAt'); // Periodically clear old entries that never got completed


const _cleanStaleResults = () => {
  // Remove request tokens older than 5 minute
  const timeCutoff = new Date();
  timeCutoff.setMinutes(timeCutoff.getMinutes() - 5);

  OAuth._pendingRequestTokens.remove({
    createdAt: {
      $lt: timeCutoff
    }
  });
};

const _cleanupHandle = Meteor.setInterval(_cleanStaleResults, 60 * 1000); // Stores the key and request token in the _pendingRequestTokens collection.
// Will throw an exception if `key` is not a string.
//
// @param key {string}
// @param requestToken {string}
// @param requestTokenSecret {string}
//


OAuth._storeRequestToken = (key, requestToken, requestTokenSecret) => {
  check(key, String); // We do an upsert here instead of an insert in case the user happens
  // to somehow send the same `state` parameter twice during an OAuth
  // login; we don't want a duplicate key error.

  OAuth._pendingRequestTokens.upsert({
    key
  }, {
    key,
    requestToken: OAuth.sealSecret(requestToken),
    requestTokenSecret: OAuth.sealSecret(requestTokenSecret),
    createdAt: new Date()
  });
}; // Retrieves and removes a request token from the _pendingRequestTokens collection
// Returns an object containing requestToken and requestTokenSecret properties
//
// @param key {string}
//


OAuth._retrieveRequestToken = key => {
  check(key, String);

  const pendingRequestToken = OAuth._pendingRequestTokens.findOne({
    key: key
  });

  if (pendingRequestToken) {
    OAuth._pendingRequestTokens.remove({
      _id: pendingRequestToken._id
    });

    return {
      requestToken: OAuth.openSecret(pendingRequestToken.requestToken),
      requestTokenSecret: OAuth.openSecret(pendingRequestToken.requestTokenSecret)
    };
  } else {
    return undefined;
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/oauth1/oauth1_binding.js");
require("/node_modules/meteor/oauth1/oauth1_server.js");
require("/node_modules/meteor/oauth1/oauth1_pending_request_tokens.js");

/* Exports */
Package._define("oauth1", {
  OAuth1Binding: OAuth1Binding,
  OAuth1Test: OAuth1Test
});

})();

//# sourceURL=meteor://💻app/packages/oauth1.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb2F1dGgxL29hdXRoMV9iaW5kaW5nLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9vYXV0aDEvb2F1dGgxX3NlcnZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb2F1dGgxL29hdXRoMV9wZW5kaW5nX3JlcXVlc3RfdG9rZW5zLmpzIl0sIm5hbWVzIjpbIm1vZHVsZSIsImV4cG9ydCIsIk9BdXRoMUJpbmRpbmciLCJjcnlwdG8iLCJsaW5rIiwiZGVmYXVsdCIsInYiLCJxdWVyeXN0cmluZyIsInVybE1vZHVsZSIsImNvbnN0cnVjdG9yIiwiY29uZmlnIiwidXJscyIsIl9jb25maWciLCJfdXJscyIsInByZXBhcmVSZXF1ZXN0VG9rZW4iLCJjYWxsYmFja1VybCIsImhlYWRlcnMiLCJfYnVpbGRIZWFkZXIiLCJvYXV0aF9jYWxsYmFjayIsInJlc3BvbnNlIiwiX2NhbGwiLCJyZXF1ZXN0VG9rZW4iLCJ0b2tlbnMiLCJwYXJzZSIsImNvbnRlbnQiLCJvYXV0aF9jYWxsYmFja19jb25maXJtZWQiLCJPYmplY3QiLCJhc3NpZ24iLCJFcnJvciIsIm9hdXRoX3Rva2VuIiwicmVxdWVzdFRva2VuU2VjcmV0Iiwib2F1dGhfdG9rZW5fc2VjcmV0IiwicHJlcGFyZUFjY2Vzc1Rva2VuIiwicXVlcnkiLCJhY2Nlc3NUb2tlblNlY3JldCIsIm9hdXRoX3ZlcmlmaWVyIiwiYWNjZXNzVG9rZW4iLCJlcnJvciIsImNhbGwiLCJtZXRob2QiLCJ1cmwiLCJwYXJhbXMiLCJjYWxsYmFjayIsImdldCIsInBvc3QiLCJvYXV0aF9jb25zdW1lcl9rZXkiLCJjb25zdW1lcktleSIsIm9hdXRoX25vbmNlIiwiUmFuZG9tIiwic2VjcmV0IiwicmVwbGFjZSIsIm9hdXRoX3NpZ25hdHVyZV9tZXRob2QiLCJvYXV0aF90aW1lc3RhbXAiLCJEYXRlIiwidmFsdWVPZiIsInRvRml4ZWQiLCJ0b1N0cmluZyIsIm9hdXRoX3ZlcnNpb24iLCJfZ2V0U2lnbmF0dXJlIiwicmF3SGVhZGVycyIsIl9lbmNvZGVIZWFkZXIiLCJwYXJhbWV0ZXJzIiwia2V5cyIsIm1hcCIsImtleSIsInNvcnQiLCJqb2luIiwic2lnbmF0dXJlQmFzZSIsIl9lbmNvZGVTdHJpbmciLCJPQXV0aCIsIm9wZW5TZWNyZXQiLCJzaWduaW5nS2V5IiwiY3JlYXRlSG1hYyIsInVwZGF0ZSIsImRpZ2VzdCIsInBhcnNlZFVybCIsInNlYXJjaCIsImZvcm1hdCIsIm9hdXRoX3NpZ25hdHVyZSIsImF1dGhTdHJpbmciLCJfZ2V0QXV0aEhlYWRlclN0cmluZyIsIkhUVFAiLCJBdXRob3JpemF0aW9uIiwibm9uY2UiLCJlcnIiLCJtZXNzYWdlIiwiaGVhZGVyIiwicmVkdWNlIiwibWVtbyIsInN0ciIsImVuY29kZVVSSUNvbXBvbmVudCIsImVzY2FwZSIsIm1vZHVsZTEiLCJfcXVlcnlQYXJhbXNXaXRoQXV0aFRva2VuVXJsIiwiYXV0aFVybCIsIm9hdXRoQmluZGluZyIsIndoaXRlbGlzdGVkUXVlcnlQYXJhbXMiLCJyZWRpcmVjdFVybE9iaiIsInByZXYiLCJwYXJhbSIsIl9yZXF1ZXN0SGFuZGxlcnMiLCJzZXJ2aWNlIiwicmVzIiwiU2VydmljZUNvbmZpZ3VyYXRpb24iLCJjb25maWd1cmF0aW9ucyIsImZpbmRPbmUiLCJzZXJ2aWNlTmFtZSIsIkNvbmZpZ0Vycm9yIiwiY3JlZGVudGlhbFNlY3JldCIsInJlcXVlc3RUb2tlbkFuZFJlZGlyZWN0IiwiX3JlZGlyZWN0VXJpIiwic3RhdGUiLCJjb3Jkb3ZhIiwiYW5kcm9pZCIsIl9zdG9yZVJlcXVlc3RUb2tlbiIsIl9jcmVkZW50aWFsVG9rZW5Gcm9tUXVlcnkiLCJyZWRpcmVjdFVybCIsImF1dGhQYXJhbXMiLCJhdXRoZW50aWNhdGUiLCJ3cml0ZUhlYWQiLCJlbmQiLCJyZXF1ZXN0VG9rZW5JbmZvIiwiX3JldHJpZXZlUmVxdWVzdFRva2VuIiwib2F1dGhSZXN1bHQiLCJoYW5kbGVPYXV0aFJlcXVlc3QiLCJjcmVkZW50aWFsVG9rZW4iLCJfc3RvcmVQZW5kaW5nQ3JlZGVudGlhbCIsInNlcnZpY2VEYXRhIiwib3B0aW9ucyIsIl9yZW5kZXJPYXV0aFJlc3VsdHMiLCJfcGVuZGluZ1JlcXVlc3RUb2tlbnMiLCJNb25nbyIsIkNvbGxlY3Rpb24iLCJfcHJldmVudEF1dG9wdWJsaXNoIiwiX2Vuc3VyZUluZGV4IiwidW5pcXVlIiwiX2NsZWFuU3RhbGVSZXN1bHRzIiwidGltZUN1dG9mZiIsInNldE1pbnV0ZXMiLCJnZXRNaW51dGVzIiwicmVtb3ZlIiwiY3JlYXRlZEF0IiwiJGx0IiwiX2NsZWFudXBIYW5kbGUiLCJNZXRlb3IiLCJzZXRJbnRlcnZhbCIsImNoZWNrIiwiU3RyaW5nIiwidXBzZXJ0Iiwic2VhbFNlY3JldCIsInBlbmRpbmdSZXF1ZXN0VG9rZW4iLCJfaWQiLCJ1bmRlZmluZWQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxNQUFNLENBQUNDLE1BQVAsQ0FBYztBQUFDQyxlQUFhLEVBQUMsTUFBSUE7QUFBbkIsQ0FBZDtBQUFpRCxJQUFJQyxNQUFKO0FBQVdILE1BQU0sQ0FBQ0ksSUFBUCxDQUFZLFFBQVosRUFBcUI7QUFBQ0MsU0FBTyxDQUFDQyxDQUFELEVBQUc7QUFBQ0gsVUFBTSxHQUFDRyxDQUFQO0FBQVM7O0FBQXJCLENBQXJCLEVBQTRDLENBQTVDO0FBQStDLElBQUlDLFdBQUo7QUFBZ0JQLE1BQU0sQ0FBQ0ksSUFBUCxDQUFZLGFBQVosRUFBMEI7QUFBQ0MsU0FBTyxDQUFDQyxDQUFELEVBQUc7QUFBQ0MsZUFBVyxHQUFDRCxDQUFaO0FBQWM7O0FBQTFCLENBQTFCLEVBQXNELENBQXREO0FBQXlELElBQUlFLFNBQUo7QUFBY1IsTUFBTSxDQUFDSSxJQUFQLENBQVksS0FBWixFQUFrQjtBQUFDQyxTQUFPLENBQUNDLENBQUQsRUFBRztBQUFDRSxhQUFTLEdBQUNGLENBQVY7QUFBWTs7QUFBeEIsQ0FBbEIsRUFBNEMsQ0FBNUM7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RG9FLENBR3BFO0FBQ0E7QUFDQTs7QUFDQTlFLE9BQUssQ0FBQzZELHFCQUFOLENBQTRCa0IsTUFBNUIsQ0FBbUM7QUFDakNwRjtBQURpQyxHQUFuQyxFQUVHO0FBQ0RBLE9BREM7QUFFRDNDLGdCQUFZLEVBQUVnRCxLQUFLLENBQUNnRixVQUFOLENBQWlCaEksWUFBakIsQ0FGYjtBQUdEUyxzQkFBa0IsRUFBRXVDLEtBQUssQ0FBQ2dGLFVBQU4sQ0FBaUJ2SCxrQkFBakIsQ0FIbkI7QUFJRCtHLGFBQVMsRUFBRSxJQUFJeEYsSUFBSjtBQUpWLEdBRkg7QUFRRCxDQWRELEMsQ0FpQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0FnQixLQUFLLENBQUNxRCxxQkFBTixHQUE4QjFELEdBQUcsSUFBSTtBQUNuQ2tGLE9BQUssQ0FBQ2xGLEdBQUQsRUFBTW1GLE1BQU4sQ0FBTDs7QUFFQSxRQUFNRyxtQkFBbUIsR0FBR2pGLEtBQUssQ0FBQzZELHFCQUFOLENBQTRCekIsT0FBNUIsQ0FBb0M7QUFBRXpDLE9BQUcsRUFBRUE7QUFBUCxHQUFwQyxDQUE1Qjs7QUFDQSxNQUFJc0YsbUJBQUosRUFBeUI7QUFDdkJqRixTQUFLLENBQUM2RCxxQkFBTixDQUE0QlUsTUFBNUIsQ0FBbUM7QUFBRVcsU0FBRyxFQUFFRCxtQkFBbUIsQ0FBQ0M7QUFBM0IsS0FBbkM7O0FBQ0EsV0FBTztBQUNMbEksa0JBQVksRUFBRWdELEtBQUssQ0FBQ0MsVUFBTixDQUFpQmdGLG1CQUFtQixDQUFDakksWUFBckMsQ0FEVDtBQUVMUyx3QkFBa0IsRUFBRXVDLEtBQUssQ0FBQ0MsVUFBTixDQUNsQmdGLG1CQUFtQixDQUFDeEgsa0JBREY7QUFGZixLQUFQO0FBS0QsR0FQRCxNQU9PO0FBQ0wsV0FBTzBILFNBQVA7QUFDRDtBQUNGLENBZEQsQyIsImZpbGUiOiIvcGFja2FnZXMvb2F1dGgxLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNyeXB0byBmcm9tICdjcnlwdG8nO1xuaW1wb3J0IHF1ZXJ5c3RyaW5nIGZyb20gJ3F1ZXJ5c3RyaW5nJztcbmltcG9ydCB1cmxNb2R1bGUgZnJvbSAndXJsJztcblxuLy8gQW4gT0F1dGgxIHdyYXBwZXIgYXJvdW5kIGh0dHAgY2FsbHMgd2hpY2ggaGVscHMgZ2V0IHRva2VucyBhbmRcbi8vIHRha2VzIGNhcmUgb2YgSFRUUCBoZWFkZXJzXG4vL1xuLy8gQHBhcmFtIGNvbmZpZyB7T2JqZWN0fVxuLy8gICAtIGNvbnN1bWVyS2V5IChTdHJpbmcpOiBvYXV0aCBjb25zdW1lciBrZXlcbi8vICAgLSBzZWNyZXQgKFN0cmluZyk6IG9hdXRoIGNvbnN1bWVyIHNlY3JldFxuLy8gQHBhcmFtIHVybHMge09iamVjdH1cbi8vICAgLSByZXF1ZXN0VG9rZW4gKFN0cmluZyk6IHVybFxuLy8gICAtIGF1dGhvcml6ZSAoU3RyaW5nKTogdXJsXG4vLyAgIC0gYWNjZXNzVG9rZW4gKFN0cmluZyk6IHVybFxuLy8gICAtIGF1dGhlbnRpY2F0ZSAoU3RyaW5nKTogdXJsXG5leHBvcnQgY2xhc3MgT0F1dGgxQmluZGluZyB7XG4gIGNvbnN0cnVjdG9yKGNvbmZpZywgdXJscykge1xuICAgIHRoaXMuX2NvbmZpZyA9IGNvbmZpZztcbiAgICB0aGlzLl91cmxzID0gdXJscztcbiAgfVxuXG4gIHByZXBhcmVSZXF1ZXN0VG9rZW4oY2FsbGJhY2tVcmwpIHtcbiAgICBjb25zdCBoZWFkZXJzID0gdGhpcy5fYnVpbGRIZWFkZXIoe1xuICAgICAgb2F1dGhfY2FsbGJhY2s6IGNhbGxiYWNrVXJsXG4gICAgfSk7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IHRoaXMuX2NhbGwoJ1BPU1QnLCB0aGlzLl91cmxzLnJlcXVlc3RUb2tlbiwgaGVhZGVycyk7XG4gICAgY29uc3QgdG9rZW5zID0gcXVlcnlzdHJpbmcucGFyc2UocmVzcG9uc2UuY29udGVudCk7XG5cbiAgICBpZiAoISB0b2tlbnMub2F1dGhfY2FsbGJhY2tfY29uZmlybWVkKVxuICAgICAgdGhyb3cgT2JqZWN0LmFzc2lnbihuZXcgRXJyb3IoXCJvYXV0aF9jYWxsYmFja19jb25maXJtZWQgZmFsc2Ugd2hlbiByZXF1ZXN0aW5nIG9hdXRoMSB0b2tlblwiKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7cmVzcG9uc2U6IHJlc3BvbnNlfSk7XG5cbiAgICB0aGlzLnJlcXVlc3RUb2tlbiA9IHRva2Vucy5vYXV0aF90b2tlbjtcbiAgICB0aGlzLnJlcXVlc3RUb2tlblNlY3JldCA9IHRva2Vucy5vYXV0aF90b2tlbl9zZWNyZXQ7XG4gIH1cblxuICBwcmVwYXJlQWNjZXNzVG9rZW4ocXVlcnksIHJlcXVlc3RUb2tlblNlY3JldCkge1xuICAgIC8vIHN1cHBvcnQgaW1wbGVtZW50YXRpb25zIHRoYXQgdXNlIHJlcXVlc3QgdG9rZW4gc2VjcmV0cy4gVGhpcyBpc1xuICAgIC8vIHJlYWQgYnkgdGhpcy5fY2FsbC5cbiAgICAvL1xuICAgIC8vIFhYWCBtYWtlIGl0IGEgcGFyYW0gdG8gY2FsbCwgbm90IHNvbWV0aGluZyBzdGFzaGVkIG9uIHNlbGY/IEl0J3NcbiAgICAvLyBraW5kYSBjb25mdXNpbmcgcmlnaHQgbm93LCBldmVyeXRoaW5nIGV4Y2VwdCB0aGlzIGlzIHBhc3NlZCBhc1xuICAgIC8vIGFyZ3VtZW50cywgYnV0IHRoaXMgaXMgc3RvcmVkLlxuICAgIGlmIChyZXF1ZXN0VG9rZW5TZWNyZXQpXG4gICAgICB0aGlzLmFjY2Vzc1Rva2VuU2VjcmV0ID0gcmVxdWVzdFRva2VuU2VjcmV0O1xuXG4gICAgY29uc3QgaGVhZGVycyA9IHRoaXMuX2J1aWxkSGVhZGVyKHtcbiAgICAgIG9hdXRoX3Rva2VuOiBxdWVyeS5vYXV0aF90b2tlbixcbiAgICAgIG9hdXRoX3ZlcmlmaWVyOiBxdWVyeS5vYXV0aF92ZXJpZmllclxuICAgIH0pO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSB0aGlzLl9jYWxsKCdQT1NUJywgdGhpcy5fdXJscy5hY2Nlc3NUb2tlbiwgaGVhZGVycyk7XG4gICAgY29uc3QgdG9rZW5zID0gcXVlcnlzdHJpbmcucGFyc2UocmVzcG9uc2UuY29udGVudCk7XG5cbiAgICBpZiAoISB0b2tlbnMub2F1dGhfdG9rZW4gfHwgISB0b2tlbnMub2F1dGhfdG9rZW5fc2VjcmV0KSB7XG4gICAgICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcihcIm1pc3Npbmcgb2F1dGggdG9rZW4gb3Igc2VjcmV0XCIpO1xuICAgICAgLy8gV2UgcHJvdmlkZSByZXNwb25zZSBvbmx5IGlmIG5vIHRva2VuIGlzIGF2YWlsYWJsZSwgd2UgZG8gbm90IHdhbnQgdG8gbGVhayBhbnkgdG9rZW5zXG4gICAgICBpZiAoISB0b2tlbnMub2F1dGhfdG9rZW4gJiYgISB0b2tlbnMub2F1dGhfdG9rZW5fc2VjcmV0KSB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24oZXJyb3IsIHtyZXNwb25zZTogcmVzcG9uc2V9KTtcbiAgICAgIH1cbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cblxuICAgIHRoaXMuYWNjZXNzVG9rZW4gPSB0b2tlbnMub2F1dGhfdG9rZW47XG4gICAgdGhpcy5hY2Nlc3NUb2tlblNlY3JldCA9IHRva2Vucy5vYXV0aF90b2tlbl9zZWNyZXQ7XG4gIH1cblxuICBjYWxsKG1ldGhvZCwgdXJsLCBwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgaGVhZGVycyA9IHRoaXMuX2J1aWxkSGVhZGVyKHtcbiAgICAgIG9hdXRoX3Rva2VuOiB0aGlzLmFjY2Vzc1Rva2VuXG4gICAgfSk7XG5cbiAgICBpZighIHBhcmFtcykge1xuICAgICAgcGFyYW1zID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2NhbGwobWV0aG9kLCB1cmwsIGhlYWRlcnMsIHBhcmFtcywgY2FsbGJhY2spO1xuICB9XG5cbiAgZ2V0KHVybCwgcGFyYW1zLCBjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGwoJ0dFVCcsIHVybCwgcGFyYW1zLCBjYWxsYmFjayk7XG4gIH1cblxuICBwb3N0KHVybCwgcGFyYW1zLCBjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmNhbGwoJ1BPU1QnLCB1cmwsIHBhcmFtcywgY2FsbGJhY2spO1xuICB9XG5cbiAgX2J1aWxkSGVhZGVyKGhlYWRlcnMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgb2F1dGhfY29uc3VtZXJfa2V5OiB0aGlzLl9jb25maWcuY29uc3VtZXJLZXksXG4gICAgICBvYXV0aF9ub25jZTogUmFuZG9tLnNlY3JldCgpLnJlcGxhY2UoL1xcVy9nLCAnJyksXG4gICAgICBvYXV0aF9zaWduYXR1cmVfbWV0aG9kOiAnSE1BQy1TSEExJyxcbiAgICAgIG9hdXRoX3RpbWVzdGFtcDogKG5ldyBEYXRlKCkudmFsdWVPZigpLzEwMDApLnRvRml4ZWQoKS50b1N0cmluZygpLFxuICAgICAgb2F1dGhfdmVyc2lvbjogJzEuMCcsXG4gICAgICAuLi5oZWFkZXJzLFxuICAgIH1cbiAgfVxuXG4gIF9nZXRTaWduYXR1cmUobWV0aG9kLCB1cmwsIHJhd0hlYWRlcnMsIGFjY2Vzc1Rva2VuU2VjcmV0LCBwYXJhbXMpIHtcbiAgICBjb25zdCBoZWFkZXJzID0gdGhpcy5fZW5jb2RlSGVhZGVyKHsgLi4ucmF3SGVhZGVycywgLi4ucGFyYW1zIH0pO1xuXG4gICAgY29uc3QgcGFyYW1ldGVycyA9IE9iamVjdC5rZXlzKGhlYWRlcnMpLm1hcChrZXkgPT4gYCR7a2V5fT0ke2hlYWRlcnNba2V5XX1gKVxuICAgICAgLnNvcnQoKS5qb2luKCcmJyk7XG5cbiAgICBjb25zdCBzaWduYXR1cmVCYXNlID0gW1xuICAgICAgbWV0aG9kLFxuICAgICAgdGhpcy5fZW5jb2RlU3RyaW5nKHVybCksXG4gICAgICB0aGlzLl9lbmNvZGVTdHJpbmcocGFyYW1ldGVycylcbiAgICBdLmpvaW4oJyYnKTtcblxuICAgIGNvbnN0IHNlY3JldCA9IE9BdXRoLm9wZW5TZWNyZXQodGhpcy5fY29uZmlnLnNlY3JldCk7XG5cbiAgICBsZXQgc2lnbmluZ0tleSA9IGAke3RoaXMuX2VuY29kZVN0cmluZyhzZWNyZXQpfSZgO1xuICAgIGlmIChhY2Nlc3NUb2tlblNlY3JldClcbiAgICAgIHNpZ25pbmdLZXkgKz0gdGhpcy5fZW5jb2RlU3RyaW5nKGFjY2Vzc1Rva2VuU2VjcmV0KTtcblxuICAgIHJldHVybiBjcnlwdG8uY3JlYXRlSG1hYygnU0hBMScsIHNpZ25pbmdLZXkpLnVwZGF0ZShzaWduYXR1cmVCYXNlKS5kaWdlc3QoJ2Jhc2U2NCcpO1xuICB9O1xuXG4gIF9jYWxsKG1ldGhvZCwgdXJsLCBoZWFkZXJzID0ge30sIHBhcmFtcyA9IHt9LCBjYWxsYmFjaykge1xuICAgIC8vIGFsbCBVUkxzIHRvIGJlIGZ1bmN0aW9ucyB0byBzdXBwb3J0IHBhcmFtZXRlcnMvY3VzdG9taXphdGlvblxuICAgIGlmKHR5cGVvZiB1cmwgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdXJsID0gdXJsKHRoaXMpO1xuICAgIH1cblxuICAgIC8vIEV4dHJhY3QgYWxsIHF1ZXJ5IHN0cmluZyBwYXJhbWV0ZXJzIGZyb20gdGhlIHByb3ZpZGVkIFVSTFxuICAgIGNvbnN0IHBhcnNlZFVybCA9IHVybE1vZHVsZS5wYXJzZSh1cmwsIHRydWUpO1xuICAgIC8vIE1lcmdlIHRoZW0gaW4gYSB3YXkgdGhhdCBwYXJhbXMgZ2l2ZW4gdG8gdGhlIG1ldGhvZCBjYWxsIGhhdmUgcHJlY2VkZW5jZVxuICAgIHBhcmFtcyA9IHsgLi4ucGFyc2VkVXJsLnF1ZXJ5LCAuLi5wYXJhbXMgfTtcblxuICAgIC8vIFJlY29uc3RydWN0IHRoZSBVUkwgYmFjayB3aXRob3V0IGFueSBxdWVyeSBzdHJpbmcgcGFyYW1ldGVyc1xuICAgIC8vICh0aGV5IGFyZSBub3cgaW4gcGFyYW1zKVxuICAgIHBhcnNlZFVybC5xdWVyeSA9IHt9O1xuICAgIHBhcnNlZFVybC5zZWFyY2ggPSAnJztcbiAgICB1cmwgPSB1cmxNb2R1bGUuZm9ybWF0KHBhcnNlZFVybCk7XG5cbiAgICAvLyBHZXQgdGhlIHNpZ25hdHVyZVxuICAgIGhlYWRlcnMub2F1dGhfc2lnbmF0dXJlID1cbiAgICAgIHRoaXMuX2dldFNpZ25hdHVyZShtZXRob2QsIHVybCwgaGVhZGVycywgdGhpcy5hY2Nlc3NUb2tlblNlY3JldCwgcGFyYW1zKTtcblxuICAgIC8vIE1ha2UgYSBhdXRob3JpemF0aW9uIHN0cmluZyBhY2NvcmRpbmcgdG8gb2F1dGgxIHNwZWNcbiAgICBjb25zdCBhdXRoU3RyaW5nID0gdGhpcy5fZ2V0QXV0aEhlYWRlclN0cmluZyhoZWFkZXJzKTtcblxuICAgIC8vIE1ha2Ugc2lnbmVkIHJlcXVlc3RcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBIVFRQLmNhbGwobWV0aG9kLCB1cmwsIHtcbiAgICAgICAgcGFyYW1zLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgQXV0aG9yaXphdGlvbjogYXV0aFN0cmluZ1xuICAgICAgICB9XG4gICAgICB9LCBjYWxsYmFjayAmJiAoKGVycm9yLCByZXNwb25zZSkgPT4ge1xuICAgICAgICBpZiAoISBlcnJvcikge1xuICAgICAgICAgIHJlc3BvbnNlLm5vbmNlID0gaGVhZGVycy5vYXV0aF9ub25jZTtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjayhlcnJvciwgcmVzcG9uc2UpO1xuICAgICAgfSkpO1xuICAgICAgLy8gV2Ugc3RvcmUgbm9uY2Ugc28gdGhhdCBKV1RzIGNhbiBiZSB2YWxpZGF0ZWRcbiAgICAgIGlmIChyZXNwb25zZSlcbiAgICAgICAgcmVzcG9uc2Uubm9uY2UgPSBoZWFkZXJzLm9hdXRoX25vbmNlO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhyb3cgT2JqZWN0LmFzc2lnbihuZXcgRXJyb3IoYEZhaWxlZCB0byBzZW5kIE9BdXRoMSByZXF1ZXN0IHRvICR7dXJsfS4gJHtlcnIubWVzc2FnZX1gKSxcbiAgICAgICAgICAgICAgICAgICAgIHtyZXNwb25zZTogZXJyLnJlc3BvbnNlfSk7XG4gICAgfVxuICB9O1xuXG4gIF9lbmNvZGVIZWFkZXIoaGVhZGVyKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKGhlYWRlcikucmVkdWNlKChtZW1vLCBrZXkpID0+IHtcbiAgICAgIG1lbW9bdGhpcy5fZW5jb2RlU3RyaW5nKGtleSldID0gdGhpcy5fZW5jb2RlU3RyaW5nKGhlYWRlcltrZXldKTtcbiAgICAgIHJldHVybiBtZW1vO1xuICAgIH0sIHt9KTtcbiAgfTtcblxuICBfZW5jb2RlU3RyaW5nKHN0cikge1xuICAgIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoc3RyKS5yZXBsYWNlKC9bIScoKV0vZywgZXNjYXBlKS5yZXBsYWNlKC9cXCovZywgXCIlMkFcIik7XG4gIH07XG5cbiAgX2dldEF1dGhIZWFkZXJTdHJpbmcoaGVhZGVycykge1xuICAgIHJldHVybiAnT0F1dGggJyArICBPYmplY3Qua2V5cyhoZWFkZXJzKS5tYXAoa2V5ID0+XG4gICAgICBgJHt0aGlzLl9lbmNvZGVTdHJpbmcoa2V5KX09XCIke3RoaXMuX2VuY29kZVN0cmluZyhoZWFkZXJzW2tleV0pfVwiYFxuICAgICkuc29ydCgpLmpvaW4oJywgJyk7XG4gIH07XG5cbn07XG4iLCJpbXBvcnQgdXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgeyBPQXV0aDFCaW5kaW5nIH0gZnJvbSAnLi9vYXV0aDFfYmluZGluZyc7XG5cbk9BdXRoLl9xdWVyeVBhcmFtc1dpdGhBdXRoVG9rZW5VcmwgPSAoYXV0aFVybCwgb2F1dGhCaW5kaW5nLCBwYXJhbXMgPSB7fSwgd2hpdGVsaXN0ZWRRdWVyeVBhcmFtcyA9IFtdKSA9PiB7XG4gIGNvbnN0IHJlZGlyZWN0VXJsT2JqID0gdXJsLnBhcnNlKGF1dGhVcmwsIHRydWUpO1xuXG4gIE9iamVjdC5hc3NpZ24oXG4gICAgcmVkaXJlY3RVcmxPYmoucXVlcnksXG4gICAgd2hpdGVsaXN0ZWRRdWVyeVBhcmFtcy5yZWR1Y2UoKHByZXYsIHBhcmFtKSA9PiBcbiAgICAgIHBhcmFtcy5xdWVyeVtwYXJhbV0gPyB7IC4uLnByZXYsIHBhcmFtOiBwYXJhbXMucXVlcnlbcGFyYW1dIH0gOiBwcmV2LFxuICAgICAge31cbiAgICApLFxuICAgIHtcbiAgICAgIG9hdXRoX3Rva2VuOiBvYXV0aEJpbmRpbmcucmVxdWVzdFRva2VuLFxuICAgIH1cbiAgKTtcblxuICAvLyBDbGVhciB0aGUgYHNlYXJjaGAgc28gaXQgaXMgcmVidWlsdCBieSBOb2RlJ3MgYHVybGAgZnJvbSB0aGUgYHF1ZXJ5YCBhYm92ZS5cbiAgLy8gVXNpbmcgcHJldmlvdXMgdmVyc2lvbnMgb2YgdGhlIE5vZGUgYHVybGAgbW9kdWxlLCB0aGlzIHdhcyBqdXN0IHNldCB0byBcIlwiXG4gIC8vIEhvd2V2ZXIsIE5vZGUgNiBkb2NzIHNlZW0gdG8gaW5kaWNhdGUgdGhhdCB0aGlzIHNob3VsZCBiZSBgdW5kZWZpbmVkYC5cbiAgZGVsZXRlIHJlZGlyZWN0VXJsT2JqLnNlYXJjaDtcblxuICAvLyBSZWNvbnN0cnVjdCB0aGUgVVJMIGJhY2sgd2l0aCBwcm92aWRlZCBxdWVyeSBwYXJhbWV0ZXJzIG1lcmdlZCB3aXRoIG9hdXRoX3Rva2VuXG4gIHJldHVybiB1cmwuZm9ybWF0KHJlZGlyZWN0VXJsT2JqKTtcbn07XG5cbi8vIGNvbm5lY3QgbWlkZGxld2FyZVxuT0F1dGguX3JlcXVlc3RIYW5kbGVyc1snMSddID0gKHNlcnZpY2UsIHF1ZXJ5LCByZXMpID0+IHtcbiAgY29uc3QgY29uZmlnID0gU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMuZmluZE9uZSh7c2VydmljZTogc2VydmljZS5zZXJ2aWNlTmFtZX0pO1xuICBpZiAoISBjb25maWcpIHtcbiAgICB0aHJvdyBuZXcgU2VydmljZUNvbmZpZ3VyYXRpb24uQ29uZmlnRXJyb3Ioc2VydmljZS5zZXJ2aWNlTmFtZSk7XG4gIH1cblxuICBjb25zdCB7IHVybHMgfSA9IHNlcnZpY2U7XG4gIGNvbnN0IG9hdXRoQmluZGluZyA9IG5ldyBPQXV0aDFCaW5kaW5nKGNvbmZpZywgdXJscyk7XG5cbiAgbGV0IGNyZWRlbnRpYWxTZWNyZXQ7XG5cbiAgaWYgKHF1ZXJ5LnJlcXVlc3RUb2tlbkFuZFJlZGlyZWN0KSB7XG4gICAgLy8gc3RlcCAxIC0gZ2V0IGFuZCBzdG9yZSBhIHJlcXVlc3QgdG9rZW5cbiAgICBjb25zdCBjYWxsYmFja1VybCA9IE9BdXRoLl9yZWRpcmVjdFVyaShzZXJ2aWNlLnNlcnZpY2VOYW1lLCBjb25maWcsIHtcbiAgICAgIHN0YXRlOiBxdWVyeS5zdGF0ZSxcbiAgICAgIGNvcmRvdmE6IChxdWVyeS5jb3Jkb3ZhID09PSBcInRydWVcIiksXG4gICAgICBhbmRyb2lkOiAocXVlcnkuYW5kcm9pZCA9PT0gXCJ0cnVlXCIpXG4gICAgfSk7XG5cbiAgICAvLyBHZXQgYSByZXF1ZXN0IHRva2VuIHRvIHN0YXJ0IGF1dGggcHJvY2Vzc1xuICAgIG9hdXRoQmluZGluZy5wcmVwYXJlUmVxdWVzdFRva2VuKGNhbGxiYWNrVXJsKTtcblxuICAgIC8vIEtlZXAgdHJhY2sgb2YgcmVxdWVzdCB0b2tlbiBzbyB3ZSBjYW4gdmVyaWZ5IGl0IG9uIHRoZSBuZXh0IHN0ZXBcbiAgICBPQXV0aC5fc3RvcmVSZXF1ZXN0VG9rZW4oXG4gICAgICBPQXV0aC5fY3JlZGVudGlhbFRva2VuRnJvbVF1ZXJ5KHF1ZXJ5KSxcbiAgICAgIG9hdXRoQmluZGluZy5yZXF1ZXN0VG9rZW4sXG4gICAgICBvYXV0aEJpbmRpbmcucmVxdWVzdFRva2VuU2VjcmV0KTtcblxuICAgIC8vIHN1cHBvcnQgZm9yIHNjb3BlL25hbWUgcGFyYW1ldGVyc1xuICAgIGxldCByZWRpcmVjdFVybDtcbiAgICBjb25zdCBhdXRoUGFyYW1zID0geyBxdWVyeSB9O1xuXG4gICAgaWYodHlwZW9mIHVybHMuYXV0aGVudGljYXRlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHJlZGlyZWN0VXJsID0gdXJscy5hdXRoZW50aWNhdGUob2F1dGhCaW5kaW5nLCBhdXRoUGFyYW1zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVkaXJlY3RVcmwgPSBPQXV0aC5fcXVlcnlQYXJhbXNXaXRoQXV0aFRva2VuVXJsKFxuICAgICAgICB1cmxzLmF1dGhlbnRpY2F0ZSxcbiAgICAgICAgb2F1dGhCaW5kaW5nLFxuICAgICAgICBhdXRoUGFyYW1zXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vIHJlZGlyZWN0IHRvIHByb3ZpZGVyIGxvZ2luLCB3aGljaCB3aWxsIHJlZGlyZWN0IGJhY2sgdG8gXCJzdGVwIDJcIiBiZWxvd1xuXG4gICAgcmVzLndyaXRlSGVhZCgzMDIsIHsnTG9jYXRpb24nOiByZWRpcmVjdFVybH0pO1xuICAgIHJlcy5lbmQoKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBzdGVwIDIsIHJlZGlyZWN0ZWQgZnJvbSBwcm92aWRlciBsb2dpbiAtIHN0b3JlIHRoZSByZXN1bHRcbiAgICAvLyBhbmQgY2xvc2UgdGhlIHdpbmRvdyB0byBhbGxvdyB0aGUgbG9naW4gaGFuZGxlciB0byBwcm9jZWVkXG5cbiAgICAvLyBHZXQgdGhlIHVzZXIncyByZXF1ZXN0IHRva2VuIHNvIHdlIGNhbiB2ZXJpZnkgaXQgYW5kIGNsZWFyIGl0XG4gICAgY29uc3QgcmVxdWVzdFRva2VuSW5mbyA9IE9BdXRoLl9yZXRyaWV2ZVJlcXVlc3RUb2tlbihcbiAgICAgIE9BdXRoLl9jcmVkZW50aWFsVG9rZW5Gcm9tUXVlcnkocXVlcnkpKTtcblxuICAgIGlmICghIHJlcXVlc3RUb2tlbkluZm8pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuYWJsZSB0byByZXRyaWV2ZSByZXF1ZXN0IHRva2VuXCIpO1xuICAgIH1cblxuICAgIC8vIFZlcmlmeSB1c2VyIGF1dGhvcml6ZWQgYWNjZXNzIGFuZCB0aGUgb2F1dGhfdG9rZW4gbWF0Y2hlc1xuICAgIC8vIHRoZSByZXF1ZXN0VG9rZW4gZnJvbSBwcmV2aW91cyBzdGVwXG4gICAgaWYgKHF1ZXJ5Lm9hdXRoX3Rva2VuICYmIHF1ZXJ5Lm9hdXRoX3Rva2VuID09PSByZXF1ZXN0VG9rZW5JbmZvLnJlcXVlc3RUb2tlbikge1xuXG4gICAgICAvLyBQcmVwYXJlIHRoZSBsb2dpbiByZXN1bHRzIGJlZm9yZSByZXR1cm5pbmcuICBUaGlzIHdheSB0aGVcbiAgICAgIC8vIHN1YnNlcXVlbnQgY2FsbCB0byB0aGUgYGxvZ2luYCBtZXRob2Qgd2lsbCBiZSBpbW1lZGlhdGUuXG5cbiAgICAgIC8vIEdldCB0aGUgYWNjZXNzIHRva2VuIGZvciBzaWduaW5nIHJlcXVlc3RzXG4gICAgICBvYXV0aEJpbmRpbmcucHJlcGFyZUFjY2Vzc1Rva2VuKHF1ZXJ5LCByZXF1ZXN0VG9rZW5JbmZvLnJlcXVlc3RUb2tlblNlY3JldCk7XG5cbiAgICAgIC8vIFJ1biBzZXJ2aWNlLXNwZWNpZmljIGhhbmRsZXIuXG4gICAgICBjb25zdCBvYXV0aFJlc3VsdCA9IHNlcnZpY2UuaGFuZGxlT2F1dGhSZXF1ZXN0KFxuICAgICAgICBvYXV0aEJpbmRpbmcsIHsgcXVlcnk6IHF1ZXJ5IH0pO1xuXG4gICAgICBjb25zdCBjcmVkZW50aWFsVG9rZW4gPSBPQXV0aC5fY3JlZGVudGlhbFRva2VuRnJvbVF1ZXJ5KHF1ZXJ5KTtcbiAgICAgIGNyZWRlbnRpYWxTZWNyZXQgPSBSYW5kb20uc2VjcmV0KCk7XG5cbiAgICAgIC8vIFN0b3JlIHRoZSBsb2dpbiByZXN1bHQgc28gaXQgY2FuIGJlIHJldHJpZXZlZCBpbiBhbm90aGVyXG4gICAgICAvLyBicm93c2VyIHRhYiBieSB0aGUgcmVzdWx0IGhhbmRsZXJcbiAgICAgIE9BdXRoLl9zdG9yZVBlbmRpbmdDcmVkZW50aWFsKGNyZWRlbnRpYWxUb2tlbiwge1xuICAgICAgICBzZXJ2aWNlTmFtZTogc2VydmljZS5zZXJ2aWNlTmFtZSxcbiAgICAgICAgc2VydmljZURhdGE6IG9hdXRoUmVzdWx0LnNlcnZpY2VEYXRhLFxuICAgICAgICBvcHRpb25zOiBvYXV0aFJlc3VsdC5vcHRpb25zXG4gICAgICB9LCBjcmVkZW50aWFsU2VjcmV0KTtcbiAgICB9XG5cbiAgICAvLyBFaXRoZXIgY2xvc2UgdGhlIHdpbmRvdywgcmVkaXJlY3QsIG9yIHJlbmRlciBub3RoaW5nXG4gICAgLy8gaWYgYWxsIGVsc2UgZmFpbHNcbiAgICBPQXV0aC5fcmVuZGVyT2F1dGhSZXN1bHRzKHJlcywgcXVlcnksIGNyZWRlbnRpYWxTZWNyZXQpO1xuICB9XG59O1xuIiwiLy9cbi8vIF9wZW5kaW5nUmVxdWVzdFRva2VucyBhcmUgcmVxdWVzdCB0b2tlbnMgdGhhdCBoYXZlIGJlZW4gcmVjZWl2ZWRcbi8vIGJ1dCBub3QgeWV0IGZ1bGx5IGF1dGhvcml6ZWQgKHByb2Nlc3NlZCkuXG4vL1xuLy8gRHVyaW5nIHRoZSBvYXV0aDEgYXV0aG9yaXphdGlvbiBwcm9jZXNzLCB0aGUgTWV0ZW9yIEFwcCBvcGVuc1xuLy8gYSBwb3AtdXAsIHJlcXVlc3RzIGEgcmVxdWVzdCB0b2tlbiBmcm9tIHRoZSBvYXV0aDEgc2VydmljZSwgYW5kXG4vLyByZWRpcmVjdHMgdGhlIGJyb3dzZXIgdG8gdGhlIG9hdXRoMSBzZXJ2aWNlIGZvciB0aGUgdXNlclxuLy8gdG8gZ3JhbnQgYXV0aG9yaXphdGlvbi4gIFRoZSB1c2VyIGlzIHRoZW4gcmV0dXJuZWQgdG8gdGhlXG4vLyBNZXRlb3IgQXBwcycgY2FsbGJhY2sgdXJsIGFuZCB0aGUgcmVxdWVzdCB0b2tlbiBpcyB2ZXJpZmllZC5cbi8vXG4vLyBXaGVuIE1ldGVvciBBcHBzIHJ1biBvbiBtdWx0aXBsZSBzZXJ2ZXJzLCBpdCdzIHBvc3NpYmxlIHRoYXRcbi8vIDIgZGlmZmVyZW50IHNlcnZlcnMgbWF5IGJlIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIHJlcXVlc3QgdG9rZW5cbi8vIGFuZCB0byB2ZXJpZnkgaXQgaW4gdGhlIGNhbGxiYWNrIG9uY2UgdGhlIHVzZXIgaGFzIGF1dGhvcml6ZWQuXG4vL1xuLy8gRm9yIHRoaXMgcmVhc29uLCB0aGUgX3BlbmRpbmdSZXF1ZXN0VG9rZW5zIGFyZSBzdG9yZWQgaW4gdGhlIGRhdGFiYXNlXG4vLyBzbyB0aGV5IGNhbiBiZSBzaGFyZWQgYWNyb3NzIE1ldGVvciBBcHAgc2VydmVycy5cbi8vXG4vLyBYWFggVGhpcyBjb2RlIGlzIGZhaXJseSBzaW1pbGFyIHRvIG9hdXRoL3BlbmRpbmdfY3JlZGVudGlhbHMuanMgLS1cbi8vIG1heWJlIHdlIGNhbiBjb21iaW5lIHRoZW0gc29tZWhvdy5cblxuLy8gQ29sbGVjdGlvbiBjb250YWluaW5nIHBlbmRpbmcgcmVxdWVzdCB0b2tlbnNcbi8vIEhhcyBrZXksIHJlcXVlc3RUb2tlbiwgcmVxdWVzdFRva2VuU2VjcmV0LCBhbmQgY3JlYXRlZEF0IGZpZWxkcy5cbk9BdXRoLl9wZW5kaW5nUmVxdWVzdFRva2VucyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKFxuICBcIm1ldGVvcl9vYXV0aF9wZW5kaW5nUmVxdWVzdFRva2Vuc1wiLCB7XG4gICAgX3ByZXZlbnRBdXRvcHVibGlzaDogdHJ1ZVxuICB9KTtcblxuT0F1dGguX3BlbmRpbmdSZXF1ZXN0VG9rZW5zLl9lbnN1cmVJbmRleCgna2V5Jywge3VuaXF1ZTogMX0pO1xuT0F1dGguX3BlbmRpbmdSZXF1ZXN0VG9rZW5zLl9lbnN1cmVJbmRleCgnY3JlYXRlZEF0Jyk7XG5cblxuXG4vLyBQZXJpb2RpY2FsbHkgY2xlYXIgb2xkIGVudHJpZXMgdGhhdCBuZXZlciBnb3QgY29tcGxldGVkXG5jb25zdCBfY2xlYW5TdGFsZVJlc3VsdHMgPSAoKSA9PiB7XG4gIC8vIFJlbW92ZSByZXF1ZXN0IHRva2VucyBvbGRlciB0aGFuIDUgbWludXRlXG4gIGNvbnN0IHRpbWVDdXRvZmYgPSBuZXcgRGF0ZSgpO1xuICB0aW1lQ3V0b2ZmLnNldE1pbnV0ZXModGltZUN1dG9mZi5nZXRNaW51dGVzKCkgLSA1KTtcbiAgT0F1dGguX3BlbmRpbmdSZXF1ZXN0VG9rZW5zLnJlbW92ZSh7IGNyZWF0ZWRBdDogeyAkbHQ6IHRpbWVDdXRvZmYgfSB9KTtcbn07XG5jb25zdCBfY2xlYW51cEhhbmRsZSA9IE1ldGVvci5zZXRJbnRlcnZhbChfY2xlYW5TdGFsZVJlc3VsdHMsIDYwICogMTAwMCk7XG5cblxuLy8gU3RvcmVzIHRoZSBrZXkgYW5kIHJlcXVlc3QgdG9rZW4gaW4gdGhlIF9wZW5kaW5nUmVxdWVzdFRva2VucyBjb2xsZWN0aW9uLlxuLy8gV2lsbCB0aHJvdyBhbiBleGNlcHRpb24gaWYgYGtleWAgaXMgbm90IGEgc3RyaW5nLlxuLy9cbi8vIEBwYXJhbSBrZXkge3N0cmluZ31cbi8vIEBwYXJhbSByZXF1ZXN0VG9rZW4ge3N0cmluZ31cbi8vIEBwYXJhbSByZXF1ZXN0VG9rZW5TZWNyZXQge3N0cmluZ31cbi8vXG5PQXV0aC5fc3RvcmVSZXF1ZXN0VG9rZW4gPSAoa2V5LCByZXF1ZXN0VG9rZW4sIHJlcXVlc3RUb2tlblNlY3JldCkgPT4ge1xuICBjaGVjayhrZXksIFN0cmluZyk7XG5cbiAgLy8gV2UgZG8gYW4gdXBzZXJ0IGhlcmUgaW5zdGVhZCBvZiBhbiBpbnNlcnQgaW4gY2FzZSB0aGUgdXNlciBoYXBwZW5zXG4gIC8vIHRvIHNvbWVob3cgc2VuZCB0aGUgc2FtZSBgc3RhdGVgIHBhcmFtZXRlciB0d2ljZSBkdXJpbmcgYW4gT0F1dGhcbiAgLy8gbG9naW47IHdlIGRvbid0IHdhbnQgYSBkdXBsaWNhdGUga2V5IGVycm9yLlxuICBPQXV0aC5fcGVuZGluZ1JlcXVlc3RUb2tlbnMudXBzZXJ0KHtcbiAgICBrZXksXG4gIH0sIHtcbiAgICBrZXksXG4gICAgcmVxdWVzdFRva2VuOiBPQXV0aC5zZWFsU2VjcmV0KHJlcXVlc3RUb2tlbiksXG4gICAgcmVxdWVzdFRva2VuU2VjcmV0OiBPQXV0aC5zZWFsU2VjcmV0KHJlcXVlc3RUb2tlblNlY3JldCksXG4gICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpXG4gIH0pO1xufTtcblxuXG4vLyBSZXRyaWV2ZXMgYW5kIHJlbW92ZXMgYSByZXF1ZXN0IHRva2VuIGZyb20gdGhlIF9wZW5kaW5nUmVxdWVzdFRva2VucyBjb2xsZWN0aW9uXG4vLyBSZXR1cm5zIGFuIG9iamVjdCBjb250YWluaW5nIHJlcXVlc3RUb2tlbiBhbmQgcmVxdWVzdFRva2VuU2VjcmV0IHByb3BlcnRpZXNcbi8vXG4vLyBAcGFyYW0ga2V5IHtzdHJpbmd9XG4vL1xuT0F1dGguX3JldHJpZXZlUmVxdWVzdFRva2VuID0ga2V5ID0+IHtcbiAgY2hlY2soa2V5LCBTdHJpbmcpO1xuXG4gIGNvbnN0IHBlbmRpbmdSZXF1ZXN0VG9rZW4gPSBPQXV0aC5fcGVuZGluZ1JlcXVlc3RUb2tlbnMuZmluZE9uZSh7IGtleToga2V5IH0pO1xuICBpZiAocGVuZGluZ1JlcXVlc3RUb2tlbikge1xuICAgIE9BdXRoLl9wZW5kaW5nUmVxdWVzdFRva2Vucy5yZW1vdmUoeyBfaWQ6IHBlbmRpbmdSZXF1ZXN0VG9rZW4uX2lkIH0pO1xuICAgIHJldHVybiB7XG4gICAgICByZXF1ZXN0VG9rZW46IE9BdXRoLm9wZW5TZWNyZXQocGVuZGluZ1JlcXVlc3RUb2tlbi5yZXF1ZXN0VG9rZW4pLFxuICAgICAgcmVxdWVzdFRva2VuU2VjcmV0OiBPQXV0aC5vcGVuU2VjcmV0KFxuICAgICAgICBwZW5kaW5nUmVxdWVzdFRva2VuLnJlcXVlc3RUb2tlblNlY3JldClcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn07XG4iXX0=
