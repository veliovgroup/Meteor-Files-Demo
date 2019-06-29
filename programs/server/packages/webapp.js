(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var Log = Package.logging.Log;
var _ = Package.underscore._;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var Boilerplate = Package['boilerplate-generator'].Boilerplate;
var WebAppHashing = Package['webapp-hashing'].WebAppHashing;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var WebApp, WebAppInternals, main;

var require = meteorInstall({"node_modules":{"meteor":{"webapp":{"webapp_server.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/webapp/webapp_server.js                                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

const module1 = module;
module1.export({
  WebApp: () => WebApp,
  WebAppInternals: () => WebAppInternals
});
let assert;
module1.link("assert", {
  default(v) {
    assert = v;
  }

}, 0);
let readFileSync;
module1.link("fs", {
  readFileSync(v) {
    readFileSync = v;
  }

}, 1);
let createServer;
module1.link("http", {
  createServer(v) {
    createServer = v;
  }

}, 2);
let pathJoin, pathDirname;
module1.link("path", {
  join(v) {
    pathJoin = v;
  },

  dirname(v) {
    pathDirname = v;
  }

}, 3);
let parseUrl;
module1.link("url", {
  parse(v) {
    parseUrl = v;
  }

}, 4);
let createHash;
module1.link("crypto", {
  createHash(v) {
    createHash = v;
  }

}, 5);
let connect;
module1.link("./connect.js", {
  connect(v) {
    connect = v;
  }

}, 6);
let compress;
module1.link("compression", {
  default(v) {
    compress = v;
  }

}, 7);
let cookieParser;
module1.link("cookie-parser", {
  default(v) {
    cookieParser = v;
  }

}, 8);
let query;
module1.link("qs-middleware", {
  default(v) {
    query = v;
  }

}, 9);
let parseRequest;
module1.link("parseurl", {
  default(v) {
    parseRequest = v;
  }

}, 10);
let basicAuth;
module1.link("basic-auth-connect", {
  default(v) {
    basicAuth = v;
  }

}, 11);
let lookupUserAgent;
module1.link("useragent", {
  lookup(v) {
    lookupUserAgent = v;
  }

}, 12);
let isModern;
module1.link("meteor/modern-browsers", {
  isModern(v) {
    isModern = v;
  }

}, 13);
let send;
module1.link("send", {
  default(v) {
    send = v;
  }

}, 14);
let removeExistingSocketFile, registerSocketFileCleanup;
module1.link("./socket_file.js", {
  removeExistingSocketFile(v) {
    removeExistingSocketFile = v;
  },

  registerSocketFileCleanup(v) {
    registerSocketFileCleanup = v;
  }

}, 15);
let onMessage;
module1.link("meteor/inter-process-messaging", {
  onMessage(v) {
    onMessage = v;
  }

}, 16);
var SHORT_SOCKET_TIMEOUT = 5 * 1000;
var LONG_SOCKET_TIMEOUT = 120 * 1000;
const WebApp = {};
const WebAppInternals = {};
const hasOwn = Object.prototype.hasOwnProperty; // backwards compat to 2.0 of connect

connect.basicAuth = basicAuth;
WebAppInternals.NpmModules = {
  connect: {
    version: Npm.require('connect/package.json').version,
    module: connect
  }
}; // Though we might prefer to use web.browser (modern) as the default
// architecture, safety requires a more compatible defaultArch.

WebApp.defaultArch = 'web.browser.legacy'; // XXX maps archs to manifests

WebApp.clientPrograms = {}; // XXX maps archs to program path on filesystem

var archPath = {};

var bundledJsCssUrlRewriteHook = function (url) {
  var bundledPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '';
  return bundledPrefix + url;
};

var sha1 = function (contents) {
  var hash = createHash('sha1');
  hash.update(contents);
  return hash.digest('hex');
};

function shouldCompress(req, res) {
  if (req.headers['x-no-compression']) {
    // don't compress responses with this request header
    return false;
  } // fallback to standard filter function


  return compress.filter(req, res);
}

; // #BrowserIdentification
//
// We have multiple places that want to identify the browser: the
// unsupported browser page, the appcache package, and, eventually
// delivering browser polyfills only as needed.
//
// To avoid detecting the browser in multiple places ad-hoc, we create a
// Meteor "browser" object. It uses but does not expose the npm
// useragent module (we could choose a different mechanism to identify
// the browser in the future if we wanted to).  The browser object
// contains
//
// * `name`: the name of the browser in camel case
// * `major`, `minor`, `patch`: integers describing the browser version
//
// Also here is an early version of a Meteor `request` object, intended
// to be a high-level description of the request without exposing
// details of connect's low-level `req`.  Currently it contains:
//
// * `browser`: browser identification object described above
// * `url`: parsed url, including parsed query params
//
// As a temporary hack there is a `categorizeRequest` function on WebApp which
// converts a connect `req` to a Meteor `request`. This can go away once smart
// packages such as appcache are being passed a `request` object directly when
// they serve content.
//
// This allows `request` to be used uniformly: it is passed to the html
// attributes hook, and the appcache package can use it when deciding
// whether to generate a 404 for the manifest.
//
// Real routing / server side rendering will probably refactor this
// heavily.
// e.g. "Mobile Safari" => "mobileSafari"

var camelCase = function (name) {
  var parts = name.split(' ');
  parts[0] = parts[0].toLowerCase();

  for (var i = 1; i < parts.length; ++i) {
    parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].substr(1);
  }

  return parts.join('');
};

var identifyBrowser = function (userAgentString) {
  var userAgent = lookupUserAgent(userAgentString);
  return {
    name: camelCase(userAgent.family),
    major: +userAgent.major,
    minor: +userAgent.minor,
    patch: +userAgent.patch
  };
}; // XXX Refactor as part of implementing real routing.


WebAppInternals.identifyBrowser = identifyBrowser;

WebApp.categorizeRequest = function (req) {
  return _.extend({
    browser: identifyBrowser(req.headers['user-agent']),
    url: parseUrl(req.url, true)
  }, _.pick(req, 'dynamicHead', 'dynamicBody', 'headers', 'cookies'));
}; // HTML attribute hooks: functions to be called to determine any attributes to
// be added to the '<html>' tag. Each function is passed a 'request' object (see
// #BrowserIdentification) and should return null or object.


var htmlAttributeHooks = [];

var getHtmlAttributes = function (request) {
  var combinedAttributes = {};

  _.each(htmlAttributeHooks || [], function (hook) {
    var attributes = hook(request);
    if (attributes === null) return;
    if (typeof attributes !== 'object') throw Error("HTML attribute hook must return null or object");

    _.extend(combinedAttributes, attributes);
  });

  return combinedAttributes;
};

WebApp.addHtmlAttributeHook = function (hook) {
  htmlAttributeHooks.push(hook);
}; // Serve app HTML for this URL?


var appUrl = function (url) {
  if (url === '/favicon.ico' || url === '/robots.txt') return false; // NOTE: app.manifest is not a web standard like favicon.ico and
  // robots.txt. It is a file name we have chosen to use for HTML5
  // appcache URLs. It is included here to prevent using an appcache
  // then removing it from poisoning an app permanently. Eventually,
  // once we have server side routing, this won't be needed as
  // unknown URLs with return a 404 automatically.

  if (url === '/app.manifest') return false; // Avoid serving app HTML for declared routes such as /sockjs/.

  if (RoutePolicy.classify(url)) return false; // we currently return app HTML on all URLs by default

  return true;
}; // We need to calculate the client hash after all packages have loaded
// to give them a chance to populate __meteor_runtime_config__.
//
// Calculating the hash during startup means that packages can only
// populate __meteor_runtime_config__ during load, not during startup.
//
// Calculating instead it at the beginning of main after all startup
// hooks had run would allow packages to also populate
// __meteor_runtime_config__ during startup, but that's too late for
// autoupdate because it needs to have the client hash at startup to
// insert the auto update version itself into
// __meteor_runtime_config__ to get it to the client.
//
// An alternative would be to give autoupdate a "post-start,
// pre-listen" hook to allow it to insert the auto update version at
// the right moment.


Meteor.startup(function () {
  function getter(key) {
    return function (arch) {
      arch = arch || WebApp.defaultArch;
      const program = WebApp.clientPrograms[arch];
      const value = program && program[key]; // If this is the first time we have calculated this hash,
      // program[key] will be a thunk (lazy function with no parameters)
      // that we should call to do the actual computation.

      return typeof value === "function" ? program[key] = value() : value;
    };
  }

  WebApp.calculateClientHash = WebApp.clientHash = getter("version");
  WebApp.calculateClientHashRefreshable = getter("versionRefreshable");
  WebApp.calculateClientHashNonRefreshable = getter("versionNonRefreshable");
  WebApp.getRefreshableAssets = getter("refreshableAssets");
}); // When we have a request pending, we want the socket timeout to be long, to
// give ourselves a while to serve it, and to allow sockjs long polls to
// complete.  On the other hand, we want to close idle sockets relatively
// quickly, so that we can shut down relatively promptly but cleanly, without
// cutting off anyone's response.

WebApp._timeoutAdjustmentRequestCallback = function (req, res) {
  // this is really just req.socket.setTimeout(LONG_SOCKET_TIMEOUT);
  req.setTimeout(LONG_SOCKET_TIMEOUT); // Insert our new finish listener to run BEFORE the existing one which removes
  // the response from the socket.

  var finishListeners = res.listeners('finish'); // XXX Apparently in Node 0.12 this event was called 'prefinish'.
  // https://github.com/joyent/node/commit/7c9b6070
  // But it has switched back to 'finish' in Node v4:
  // https://github.com/nodejs/node/pull/1411

  res.removeAllListeners('finish');
  res.on('finish', function () {
    res.setTimeout(SHORT_SOCKET_TIMEOUT);
  });

  _.each(finishListeners, function (l) {
    res.on('finish', l);
  });
}; // Will be updated by main before we listen.
// Map from client arch to boilerplate object.
// Boilerplate object has:
//   - func: XXX
//   - baseData: XXX


var boilerplateByArch = {}; // Register a callback function that can selectively modify boilerplate
// data given arguments (request, data, arch). The key should be a unique
// identifier, to prevent accumulating duplicate callbacks from the same
// call site over time. Callbacks will be called in the order they were
// registered. A callback should return false if it did not make any
// changes affecting the boilerplate. Passing null deletes the callback.
// Any previous callback registered for this key will be returned.

const boilerplateDataCallbacks = Object.create(null);

WebAppInternals.registerBoilerplateDataCallback = function (key, callback) {
  const previousCallback = boilerplateDataCallbacks[key];

  if (typeof callback === "function") {
    boilerplateDataCallbacks[key] = callback;
  } else {
    assert.strictEqual(callback, null);
    delete boilerplateDataCallbacks[key];
  } // Return the previous callback in case the new callback needs to call
  // it; for example, when the new callback is a wrapper for the old.


  return previousCallback || null;
}; // Given a request (as returned from `categorizeRequest`), return the
// boilerplate HTML to serve for that request.
//
// If a previous connect middleware has rendered content for the head or body,
// returns the boilerplate with that content patched in otherwise
// memoizes on HTML attributes (used by, eg, appcache) and whether inline
// scripts are currently allowed.
// XXX so far this function is always called with arch === 'web.browser'


function getBoilerplate(request, arch) {
  return getBoilerplateAsync(request, arch).await();
}

function getBoilerplateAsync(request, arch) {
  const boilerplate = boilerplateByArch[arch];
  const data = Object.assign({}, boilerplate.baseData, {
    htmlAttributes: getHtmlAttributes(request)
  }, _.pick(request, "dynamicHead", "dynamicBody"));
  let madeChanges = false;
  let promise = Promise.resolve();
  Object.keys(boilerplateDataCallbacks).forEach(key => {
    promise = promise.then(() => {
      const callback = boilerplateDataCallbacks[key];
      return callback(request, data, arch);
    }).then(result => {
      // Callbacks should return false if they did not make any changes.
      if (result !== false) {
        madeChanges = true;
      }
    });
  });
  return promise.then(() => ({
    stream: boilerplate.toHTMLStream(data),
    statusCode: data.statusCode,
    headers: data.headers
  }));
}

WebAppInternals.generateBoilerplateInstance = function (arch, manifest, additionalOptions) {
  additionalOptions = additionalOptions || {};

  var runtimeConfig = _.extend(_.clone(__meteor_runtime_config__), additionalOptions.runtimeConfigOverrides || {});

  return new Boilerplate(arch, manifest, _.extend({
    pathMapper(itemPath) {
      return pathJoin(archPath[arch], itemPath);
    },

    baseDataExtension: {
      additionalStaticJs: _.map(additionalStaticJs || [], function (contents, pathname) {
        return {
          pathname: pathname,
          contents: contents
        };
      }),
      // Convert to a JSON string, then get rid of most weird characters, then
      // wrap in double quotes. (The outermost JSON.stringify really ought to
      // just be "wrap in double quotes" but we use it to be safe.) This might
      // end up inside a <script> tag so we need to be careful to not include
      // "</script>", but normal {{spacebars}} escaping escapes too much! See
      // https://github.com/meteor/meteor/issues/3730
      meteorRuntimeConfig: JSON.stringify(encodeURIComponent(JSON.stringify(runtimeConfig))),
      rootUrlPathPrefix: __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '',
      bundledJsCssUrlRewriteHook: bundledJsCssUrlRewriteHook,
      sriMode: sriMode,
      inlineScriptsAllowed: WebAppInternals.inlineScriptsAllowed(),
      inline: additionalOptions.inline
    }
  }, additionalOptions));
}; // A mapping from url path to architecture (e.g. "web.browser") to static
// file information with the following fields:
// - type: the type of file to be served
// - cacheable: optionally, whether the file should be cached or not
// - sourceMapUrl: optionally, the url of the source map
//
// Info also contains one of the following:
// - content: the stringified content that should be served at this path
// - absolutePath: the absolute path on disk to the file
// Serve static files from the manifest or added with
// `addStaticJs`. Exported for tests.


WebAppInternals.staticFilesMiddleware = function (staticFilesByArch, req, res, next) {
  return Promise.asyncApply(() => {
    if ('GET' != req.method && 'HEAD' != req.method && 'OPTIONS' != req.method) {
      next();
      return;
    }

    var pathname = parseRequest(req).pathname;

    try {
      pathname = decodeURIComponent(pathname);
    } catch (e) {
      next();
      return;
    }

    var serveStaticJs = function (s) {
      res.writeHead(200, {
        'Content-type': 'application/javascript; charset=UTF-8'
      });
      res.write(s);
      res.end();
    };

    if (_.has(additionalStaticJs, pathname) && !WebAppInternals.inlineScriptsAllowed()) {
      serveStaticJs(additionalStaticJs[pathname]);
      return;
    }

    const {
      arch,
      path
    } = getArchAndPath(pathname, identifyBrowser(req.headers["user-agent"])); // If pauseClient(arch) has been called, program.paused will be a
    // Promise that will be resolved when the program is unpaused.

    const program = WebApp.clientPrograms[arch];
    Promise.await(program.paused);

    if (path === "/meteor_runtime_config.js" && !WebAppInternals.inlineScriptsAllowed()) {
      serveStaticJs(`__meteor_runtime_config__ = ${program.meteorRuntimeConfig};`);
      return;
    }

    const info = getStaticFileInfo(staticFilesByArch, pathname, path, arch);

    if (!info) {
      next();
      return;
    } // We don't need to call pause because, unlike 'static', once we call into
    // 'send' and yield to the event loop, we never call another handler with
    // 'next'.
    // Cacheable files are files that should never change. Typically
    // named by their hash (eg meteor bundled js and css files).
    // We cache them ~forever (1yr).


    const maxAge = info.cacheable ? 1000 * 60 * 60 * 24 * 365 : 0;

    if (info.cacheable) {
      // Since we use req.headers["user-agent"] to determine whether the
      // client should receive modern or legacy resources, tell the client
      // to invalidate cached resources when/if its user agent string
      // changes in the future.
      res.setHeader("Vary", "User-Agent");
    } // Set the X-SourceMap header, which current Chrome, FireFox, and Safari
    // understand.  (The SourceMap header is slightly more spec-correct but FF
    // doesn't understand it.)
    //
    // You may also need to enable source maps in Chrome: open dev tools, click
    // the gear in the bottom right corner, and select "enable source maps".


    if (info.sourceMapUrl) {
      res.setHeader('X-SourceMap', __meteor_runtime_config__.ROOT_URL_PATH_PREFIX + info.sourceMapUrl);
    }

    if (info.type === "js" || info.type === "dynamic js") {
      res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
    } else if (info.type === "css") {
      res.setHeader("Content-Type", "text/css; charset=UTF-8");
    } else if (info.type === "json") {
      res.setHeader("Content-Type", "application/json; charset=UTF-8");
    }

    if (info.hash) {
      res.setHeader('ETag', '"' + info.hash + '"');
    }

    if (info.content) {
      res.write(info.content);
      res.end();
    } else {
      send(req, info.absolutePath, {
        maxage: maxAge,
        dotfiles: 'allow',
        // if we specified a dotfile in the manifest, serve it
        lastModified: false // don't set last-modified based on the file date

      }).on('error', function (err) {
        Log.error("Error serving static file " + err);
        res.writeHead(500);
        res.end();
      }).on('directory', function () {
        Log.error("Unexpected directory " + info.absolutePath);
        res.writeHead(500);
        res.end();
      }).pipe(res);
    }
  });
};

function getStaticFileInfo(staticFilesByArch, originalPath, path, arch) {
  if (!hasOwn.call(WebApp.clientPrograms, arch)) {
    return null;
  } // Get a list of all available static file architectures, with arch
  // first in the list if it exists.


  const staticArchList = Object.keys(staticFilesByArch);
  const archIndex = staticArchList.indexOf(arch);

  if (archIndex > 0) {
    staticArchList.unshift(staticArchList.splice(archIndex, 1)[0]);
  }

  let info = null;
  staticArchList.some(arch => {
    const staticFiles = staticFilesByArch[arch];

    function finalize(path) {
      info = staticFiles[path]; // Sometimes we register a lazy function instead of actual data in
      // the staticFiles manifest.

      if (typeof info === "function") {
        info = staticFiles[path] = info();
      }

      return info;
    } // If staticFiles contains originalPath with the arch inferred above,
    // use that information.


    if (hasOwn.call(staticFiles, originalPath)) {
      return finalize(originalPath);
    } // If getArchAndPath returned an alternate path, try that instead.


    if (path !== originalPath && hasOwn.call(staticFiles, path)) {
      return finalize(path);
    }
  });
  return info;
}

function getArchAndPath(path, browser) {
  const pathParts = path.split("/");
  const archKey = pathParts[1];

  if (archKey.startsWith("__")) {
    const archCleaned = "web." + archKey.slice(2);

    if (hasOwn.call(WebApp.clientPrograms, archCleaned)) {
      pathParts.splice(1, 1); // Remove the archKey part.

      return {
        arch: archCleaned,
        path: pathParts.join("/")
      };
    }
  } // TODO Perhaps one day we could infer Cordova clients here, so that we
  // wouldn't have to use prefixed "/__cordova/..." URLs.


  const arch = isModern(browser) ? "web.browser" : "web.browser.legacy";

  if (hasOwn.call(WebApp.clientPrograms, arch)) {
    return {
      arch,
      path
    };
  }

  return {
    arch: WebApp.defaultArch,
    path
  };
} // Parse the passed in port value. Return the port as-is if it's a String
// (e.g. a Windows Server style named pipe), otherwise return the port as an
// integer.
//
// DEPRECATED: Direct use of this function is not recommended; it is no
// longer used internally, and will be removed in a future release.


WebAppInternals.parsePort = port => {
  let parsedPort = parseInt(port);

  if (Number.isNaN(parsedPort)) {
    parsedPort = port;
  }

  return parsedPort;
};

onMessage("webapp-pause-client", ({
  arch
}) => Promise.asyncApply(() => {
  WebAppInternals.pauseClient(arch);
}));
onMessage("webapp-reload-client", ({
  arch
}) => Promise.asyncApply(() => {
  WebAppInternals.generateClientProgram(arch);
}));

function runWebAppServer() {
  var shuttingDown = false;
  var syncQueue = new Meteor._SynchronousQueue();

  var getItemPathname = function (itemUrl) {
    return decodeURIComponent(parseUrl(itemUrl).pathname);
  };

  WebAppInternals.reloadClientPrograms = function () {
    syncQueue.runTask(function () {
      const staticFilesByArch = Object.create(null);
      const {
        configJson
      } = __meteor_bootstrap__;
      const clientArchs = configJson.clientArchs || Object.keys(configJson.clientPaths);

      try {
        clientArchs.forEach(arch => {
          generateClientProgram(arch, staticFilesByArch);
        });
        WebAppInternals.staticFilesByArch = staticFilesByArch;
      } catch (e) {
        Log.error("Error reloading the client program: " + e.stack);
        process.exit(1);
      }
    });
  }; // Pause any incoming requests and make them wait for the program to be
  // unpaused the next time generateClientProgram(arch) is called.


  WebAppInternals.pauseClient = function (arch) {
    syncQueue.runTask(() => {
      const program = WebApp.clientPrograms[arch];
      const {
        unpause
      } = program;
      program.paused = new Promise(resolve => {
        if (typeof unpause === "function") {
          // If there happens to be an existing program.unpause function,
          // compose it with the resolve function.
          program.unpause = function () {
            unpause();
            resolve();
          };
        } else {
          program.unpause = resolve;
        }
      });
    });
  };

  WebAppInternals.generateClientProgram = function (arch) {
    syncQueue.runTask(() => generateClientProgram(arch));
  };

  function generateClientProgram(arch, staticFilesByArch = WebAppInternals.staticFilesByArch) {
    const clientDir = pathJoin(pathDirname(__meteor_bootstrap__.serverDir), arch); // read the control for the client we'll be serving up

    const programJsonPath = pathJoin(clientDir, "program.json");
    let programJson;

    try {
      programJson = JSON.parse(readFileSync(programJsonPath));
    } catch (e) {
      if (e.code === "ENOENT") return;
      throw e;
    }

    if (programJson.format !== "web-program-pre1") {
      throw new Error("Unsupported format for client assets: " + JSON.stringify(programJson.format));
    }

    if (!programJsonPath || !clientDir || !programJson) {
      throw new Error("Client config file not parsed.");
    }

    archPath[arch] = clientDir;
    const staticFiles = staticFilesByArch[arch] = Object.create(null);
    const {
      manifest
    } = programJson;
    manifest.forEach(item => {
      if (item.url && item.where === "client") {
        staticFiles[getItemPathname(item.url)] = {
          absolutePath: pathJoin(clientDir, item.path),
          cacheable: item.cacheable,
          hash: item.hash,
          // Link from source to its map
          sourceMapUrl: item.sourceMapUrl,
          type: item.type
        };

        if (item.sourceMap) {
          // Serve the source map too, under the specified URL. We assume
          // all source maps are cacheable.
          staticFiles[getItemPathname(item.sourceMapUrl)] = {
            absolutePath: pathJoin(clientDir, item.sourceMap),
            cacheable: true
          };
        }
      }
    });
    const {
      PUBLIC_SETTINGS
    } = __meteor_runtime_config__;
    const configOverrides = {
      PUBLIC_SETTINGS
    };
    const oldProgram = WebApp.clientPrograms[arch];
    const newProgram = WebApp.clientPrograms[arch] = {
      format: "web-program-pre1",
      manifest: manifest,
      // Use arrow functions so that these versions can be lazily
      // calculated later, and so that they will not be included in the
      // staticFiles[manifestUrl].content string below.
      //
      // Note: these version calculations must be kept in agreement with
      // CordovaBuilder#appendVersion in tools/cordova/builder.js, or hot
      // code push will reload Cordova apps unnecessarily.
      version: () => WebAppHashing.calculateClientHash(manifest, null, configOverrides),
      versionRefreshable: () => WebAppHashing.calculateClientHash(manifest, type => type === "css", configOverrides),
      versionNonRefreshable: () => WebAppHashing.calculateClientHash(manifest, type => type !== "css", configOverrides),
      cordovaCompatibilityVersions: programJson.cordovaCompatibilityVersions,
      PUBLIC_SETTINGS
    }; // Expose program details as a string reachable via the following URL.

    const manifestUrlPrefix = "/__" + arch.replace(/^web\./, "");
    const manifestUrl = manifestUrlPrefix + getItemPathname("/manifest.json");

    staticFiles[manifestUrl] = () => {
      if (Package.autoupdate) {
        const {
          AUTOUPDATE_VERSION = Package.autoupdate.Autoupdate.autoupdateVersion
        } = process.env;

        if (AUTOUPDATE_VERSION) {
          newProgram.version = AUTOUPDATE_VERSION;
        }
      }

      if (typeof newProgram.version === "function") {
        newProgram.version = newProgram.version();
      }

      return {
        content: JSON.stringify(newProgram),
        cacheable: false,
        hash: newProgram.version,
        type: "json"
      };
    };

    generateBoilerplateForArch(arch); // If there are any requests waiting on oldProgram.paused, let them
    // continue now (using the new program).

    if (oldProgram && oldProgram.paused) {
      oldProgram.unpause();
    }
  }

  ;
  const defaultOptionsForArch = {
    'web.cordova': {
      runtimeConfigOverrides: {
        // XXX We use absoluteUrl() here so that we serve https://
        // URLs to cordova clients if force-ssl is in use. If we were
        // to use __meteor_runtime_config__.ROOT_URL instead of
        // absoluteUrl(), then Cordova clients would immediately get a
        // HCP setting their DDP_DEFAULT_CONNECTION_URL to
        // http://example.meteor.com. This breaks the app, because
        // force-ssl doesn't serve CORS headers on 302
        // redirects. (Plus it's undesirable to have clients
        // connecting to http://example.meteor.com when force-ssl is
        // in use.)
        DDP_DEFAULT_CONNECTION_URL: process.env.MOBILE_DDP_URL || Meteor.absoluteUrl(),
        ROOT_URL: process.env.MOBILE_ROOT_URL || Meteor.absoluteUrl()
      }
    },
    "web.browser": {
      runtimeConfigOverrides: {
        isModern: true
      }
    },
    "web.browser.legacy": {
      runtimeConfigOverrides: {
        isModern: false
      }
    }
  };

  WebAppInternals.generateBoilerplate = function () {
    // This boilerplate will be served to the mobile devices when used with
    // Meteor/Cordova for the Hot-Code Push and since the file will be served by
    // the device's server, it is important to set the DDP url to the actual
    // Meteor server accepting DDP connections and not the device's file server.
    syncQueue.runTask(function () {
      Object.keys(WebApp.clientPrograms).forEach(generateBoilerplateForArch);
    });
  };

  function generateBoilerplateForArch(arch) {
    const program = WebApp.clientPrograms[arch];
    const additionalOptions = defaultOptionsForArch[arch] || {};
    const {
      baseData
    } = boilerplateByArch[arch] = WebAppInternals.generateBoilerplateInstance(arch, program.manifest, additionalOptions); // We need the runtime config with overrides for meteor_runtime_config.js:

    program.meteorRuntimeConfig = JSON.stringify((0, _objectSpread2.default)({}, __meteor_runtime_config__, additionalOptions.runtimeConfigOverrides || null));
    program.refreshableAssets = baseData.css.map(file => ({
      url: bundledJsCssUrlRewriteHook(file.url)
    }));
  }

  WebAppInternals.reloadClientPrograms(); // webserver

  var app = connect(); // Packages and apps can add handlers that run before any other Meteor
  // handlers via WebApp.rawConnectHandlers.

  var rawConnectHandlers = connect();
  app.use(rawConnectHandlers); // Auto-compress any json, javascript, or text.

  app.use(compress({
    filter: shouldCompress
  })); // parse cookies into an object

  app.use(cookieParser()); // We're not a proxy; reject (without crashing) attempts to treat us like
  // one. (See #1212.)

  app.use(function (req, res, next) {
    if (RoutePolicy.isValidUrl(req.url)) {
      next();
      return;
    }

    res.writeHead(400);
    res.write("Not a proxy");
    res.end();
  }); // Parse the query string into res.query. Used by oauth_server, but it's
  // generally pretty handy..
  //
  // Do this before the next middleware destroys req.url if a path prefix
  // is set to close #10111.

  app.use(query());

  function getPathParts(path) {
    const parts = path.split("/");

    while (parts[0] === "") parts.shift();

    return parts;
  }

  function isPrefixOf(prefix, array) {
    return prefix.length <= array.length && prefix.every((part, i) => part === array[i]);
  } // Strip off the path prefix, if it exists.


  app.use(function (request, response, next) {
    const pathPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX;
    const {
      pathname
    } = parseUrl(request.url); // check if the path in the url starts with the path prefix

    if (pathPrefix) {
      const prefixParts = getPathParts(pathPrefix);
      const pathParts = getPathParts(pathname);

      if (isPrefixOf(prefixParts, pathParts)) {
        request.url = "/" + pathParts.slice(prefixParts.length).join("/");
        return next();
      }
    }

    if (pathname === "/favicon.ico" || pathname === "/robots.txt") {
      return next();
    }

    if (pathPrefix) {
      response.writeHead(404);
      response.write("Unknown path");
      response.end();
      return;
    }

    next();
  }); // Serve static files from the manifest.
  // This is inspired by the 'static' middleware.

  app.use(function (req, res, next) {
    WebAppInternals.staticFilesMiddleware(WebAppInternals.staticFilesByArch, req, res, next);
  }); // Core Meteor packages like dynamic-import can add handlers before
  // other handlers added by package and application code.

  app.use(WebAppInternals.meteorInternalHandlers = connect()); // Packages and apps can add handlers to this via WebApp.connectHandlers.
  // They are inserted before our default handler.

  var packageAndAppHandlers = connect();
  app.use(packageAndAppHandlers);
  var suppressConnectErrors = false; // connect knows it is an error handler because it has 4 arguments instead of
  // 3. go figure.  (It is not smart enough to find such a thing if it's hidden
  // inside packageAndAppHandlers.)

  app.use(function (err, req, res, next) {
    if (!err || !suppressConnectErrors || !req.headers['x-suppress-error']) {
      next(err);
      return;
    }

    res.writeHead(err.status, {
      'Content-Type': 'text/plain'
    });
    res.end("An error message");
  });
  app.use(function (req, res, next) {
    return Promise.asyncApply(() => {
      if (!appUrl(req.url)) {
        return next();
      } else {
        var headers = {
          'Content-Type': 'text/html; charset=utf-8'
        };

        if (shuttingDown) {
          headers['Connection'] = 'Close';
        }

        var request = WebApp.categorizeRequest(req);

        if (request.url.query && request.url.query['meteor_css_resource']) {
          // In this case, we're requesting a CSS resource in the meteor-specific
          // way, but we don't have it.  Serve a static css file that indicates that
          // we didn't have it, so we can detect that and refresh.  Make sure
          // that any proxies or CDNs don't cache this error!  (Normally proxies
          // or CDNs are smart enough not to cache error pages, but in order to
          // make this hack work, we need to return the CSS file as a 200, which
          // would otherwise be cached.)
          headers['Content-Type'] = 'text/css; charset=utf-8';
          headers['Cache-Control'] = 'no-cache';
          res.writeHead(200, headers);
          res.write(".meteor-css-not-found-error { width: 0px;}");
          res.end();
          return;
        }

        if (request.url.query && request.url.query['meteor_js_resource']) {
          // Similarly, we're requesting a JS resource that we don't have.
          // Serve an uncached 404. (We can't use the same hack we use for CSS,
          // because actually acting on that hack requires us to have the JS
          // already!)
          headers['Cache-Control'] = 'no-cache';
          res.writeHead(404, headers);
          res.end("404 Not Found");
          return;
        }

        if (request.url.query && request.url.query['meteor_dont_serve_index']) {
          // When downloading files during a Cordova hot code push, we need
          // to detect if a file is not available instead of inadvertently
          // downloading the default index page.
          // So similar to the situation above, we serve an uncached 404.
          headers['Cache-Control'] = 'no-cache';
          res.writeHead(404, headers);
          res.end("404 Not Found");
          return;
        }

        const {
          arch
        } = getArchAndPath(parseRequest(req).pathname, request.browser); // If pauseClient(arch) has been called, program.paused will be a
        // Promise that will be resolved when the program is unpaused.

        Promise.await(WebApp.clientPrograms[arch].paused);
        return getBoilerplateAsync(request, arch).then(({
          stream,
          statusCode,
          headers: newHeaders
        }) => {
          if (!statusCode) {
            statusCode = res.statusCode ? res.statusCode : 200;
          }

          if (newHeaders) {
            Object.assign(headers, newHeaders);
          }

          res.writeHead(statusCode, headers);
          stream.pipe(res, {
            // End the response when the stream ends.
            end: true
          });
        }).catch(error => {
          Log.error("Error running template: " + error.stack);
          res.writeHead(500, headers);
          res.end();
        });
      }
    });
  }); // Return 404 by default, if no other handlers serve this URL.

  app.use(function (req, res) {
    res.writeHead(404);
    res.end();
  });
  var httpServer = createServer(app);
  var onListeningCallbacks = []; // After 5 seconds w/o data on a socket, kill it.  On the other hand, if
  // there's an outstanding request, give it a higher timeout instead (to avoid
  // killing long-polling requests)

  httpServer.setTimeout(SHORT_SOCKET_TIMEOUT); // Do this here, and then also in livedata/stream_server.js, because
  // stream_server.js kills all the current request handlers when installing its
  // own.

  httpServer.on('request', WebApp._timeoutAdjustmentRequestCallback); // If the client gave us a bad request, tell it instead of just closing the
  // socket. This lets load balancers in front of us differentiate between "a
  // server is randomly closing sockets for no reason" and "client sent a bad
  // request".
  //
  // This will only work on Node 6; Node 4 destroys the socket before calling
  // this event. See https://github.com/nodejs/node/pull/4557/ for details.

  httpServer.on('clientError', (err, socket) => {
    // Pre-Node-6, do nothing.
    if (socket.destroyed) {
      return;
    }

    if (err.message === 'Parse Error') {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    } else {
      // For other errors, use the default behavior as if we had no clientError
      // handler.
      socket.destroy(err);
    }
  }); // start up app

  _.extend(WebApp, {
    connectHandlers: packageAndAppHandlers,
    rawConnectHandlers: rawConnectHandlers,
    httpServer: httpServer,
    connectApp: app,
    // For testing.
    suppressConnectErrors: function () {
      suppressConnectErrors = true;
    },
    onListening: function (f) {
      if (onListeningCallbacks) onListeningCallbacks.push(f);else f();
    },
    // This can be overridden by users who want to modify how listening works
    // (eg, to run a proxy like Apollo Engine Proxy in front of the server).
    startListening: function (httpServer, listenOptions, cb) {
      httpServer.listen(listenOptions, cb);
    }
  }); // Let the rest of the packages (and Meteor.startup hooks) insert connect
  // middlewares and update __meteor_runtime_config__, then keep going to set up
  // actually serving HTML.


  exports.main = argv => {
    WebAppInternals.generateBoilerplate();

    const startHttpServer = listenOptions => {
      WebApp.startListening(httpServer, listenOptions, Meteor.bindEnvironment(() => {
        if (process.env.METEOR_PRINT_ON_LISTEN) {
          console.log("LISTENING");
        }

        const callbacks = onListeningCallbacks;
        onListeningCallbacks = null;
        callbacks.forEach(callback => {
          callback();
        });
      }, e => {
        console.error("Error listening:", e);
        console.error(e && e.stack);
      }));
    };

    let localPort = process.env.PORT || 0;
    const unixSocketPath = process.env.UNIX_SOCKET_PATH;

    if (unixSocketPath) {
      // Start the HTTP server using a socket file.
      removeExistingSocketFile(unixSocketPath);
      startHttpServer({
        path: unixSocketPath
      });
      registerSocketFileCleanup(unixSocketPath);
    } else {
      localPort = isNaN(Number(localPort)) ? localPort : Number(localPort);

      if (/\\\\?.+\\pipe\\?.+/.test(localPort)) {
        // Start the HTTP server using Windows Server style named pipe.
        startHttpServer({
          path: localPort
        });
      } else if (typeof localPort === "number") {
        // Start the HTTP server using TCP.
        startHttpServer({
          port: localPort,
          host: process.env.BIND_IP || "0.0.0.0"
        });
      } else {
        throw new Error("Invalid PORT specified");
      }
    }

    return "DAEMON";
  };
}

var inlineScriptsAllowed = true;

WebAppInternals.inlineScriptsAllowed = function () {
  return inlineScriptsAllowed;
};

WebAppInternals.setInlineScriptsAllowed = function (value) {
  inlineScriptsAllowed = value;
  WebAppInternals.generateBoilerplate();
};

var sriMode;

WebAppInternals.enableSubresourceIntegrity = function (use_credentials = false) {
  sriMode = use_credentials ? 'use-credentials' : 'anonymous';
  WebAppInternals.generateBoilerplate();
};

WebAppInternals.setBundledJsCssUrlRewriteHook = function (hookFn) {
  bundledJsCssUrlRewriteHook = hookFn;
  WebAppInternals.generateBoilerplate();
};

WebAppInternals.setBundledJsCssPrefix = function (prefix) {
  var self = this;
  self.setBundledJsCssUrlRewriteHook(function (url) {
    return prefix + url;
  });
}; // Packages can call `WebAppInternals.addStaticJs` to specify static
// JavaScript to be included in the app. This static JS will be inlined,
// unless inline scripts have been disabled, in which case it will be
// served under `/<sha1 of contents>`.


var additionalStaticJs = {};

WebAppInternals.addStaticJs = function (contents) {
  additionalStaticJs["/" + sha1(contents) + ".js"] = contents;
}; // Exported for tests


WebAppInternals.getBoilerplate = getBoilerplate;
WebAppInternals.additionalStaticJs = additionalStaticJs; // Start the server!

runWebAppServer();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"connect.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/webapp/connect.js                                                                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  connect: () => connect
});
let npmConnect;
module.link("connect", {
  default(v) {
    npmConnect = v;
  }

}, 0);

function connect(...connectArgs) {
  const handlers = npmConnect.apply(this, connectArgs);
  const originalUse = handlers.use; // Wrap the handlers.use method so that any provided handler functions
  // alway run in a Fiber.

  handlers.use = function use(...useArgs) {
    const {
      stack
    } = this;
    const originalLength = stack.length;
    const result = originalUse.apply(this, useArgs); // If we just added anything to the stack, wrap each new entry.handle
    // with a function that calls Promise.asyncApply to ensure the
    // original handler runs in a Fiber.

    for (let i = originalLength; i < stack.length; ++i) {
      const entry = stack[i];
      const originalHandle = entry.handle;

      if (originalHandle.length >= 4) {
        // If the original handle had four (or more) parameters, the
        // wrapper must also have four parameters, since connect uses
        // handle.length to dermine whether to pass the error as the first
        // argument to the handle function.
        entry.handle = function handle(err, req, res, next) {
          return Promise.asyncApply(originalHandle, this, arguments);
        };
      } else {
        entry.handle = function handle(req, res, next) {
          return Promise.asyncApply(originalHandle, this, arguments);
        };
      }
    }

    return result;
  };

  return handlers;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"socket_file.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/webapp/socket_file.js                                                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  removeExistingSocketFile: () => removeExistingSocketFile,
  registerSocketFileCleanup: () => registerSocketFileCleanup
});
let statSync, unlinkSync, existsSync;
module.link("fs", {
  statSync(v) {
    statSync = v;
  },

  unlinkSync(v) {
    unlinkSync = v;
  },

  existsSync(v) {
    existsSync = v;
  }

}, 0);

const removeExistingSocketFile = socketPath => {
  try {
    if (statSync(socketPath).isSocket()) {
      // Since a new socket file will be created, remove the existing
      // file.
      unlinkSync(socketPath);
    } else {
      throw new Error(`An existing file was found at "${socketPath}" and it is not ` + 'a socket file. Please confirm PORT is pointing to valid and ' + 'un-used socket file path.');
    }
  } catch (error) {
    // If there is no existing socket file to cleanup, great, we'll
    // continue normally. If the caught exception represents any other
    // issue, re-throw.
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

const registerSocketFileCleanup = (socketPath, eventEmitter = process) => {
  ['exit', 'SIGINT', 'SIGHUP', 'SIGTERM'].forEach(signal => {
    eventEmitter.on(signal, Meteor.bindEnvironment(() => {
      if (existsSync(socketPath)) {
        unlinkSync(socketPath);
      }
    }));
  });
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"connect":{"package.json":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/connect/package.json                                                       //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "connect",
  "version": "3.6.5"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/connect/index.js                                                           //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"compression":{"package.json":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/compression/package.json                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "compression",
  "version": "1.7.1"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/compression/index.js                                                       //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"cookie-parser":{"package.json":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/cookie-parser/package.json                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "cookie-parser",
  "version": "1.4.3"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/cookie-parser/index.js                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"qs-middleware":{"package.json":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/qs-middleware/package.json                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "qs-middleware",
  "version": "1.0.3",
  "main": "./lib/qs-middleware.js"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"qs-middleware.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/qs-middleware/lib/qs-middleware.js                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"parseurl":{"package.json":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/parseurl/package.json                                                      //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "parseurl",
  "version": "1.3.2"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/parseurl/index.js                                                          //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"basic-auth-connect":{"package.json":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/basic-auth-connect/package.json                                            //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "basic-auth-connect",
  "version": "1.0.0"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/basic-auth-connect/index.js                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"useragent":{"package.json":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/useragent/package.json                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "useragent",
  "version": "2.3.0",
  "main": "./index.js"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/useragent/index.js                                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"send":{"package.json":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/send/package.json                                                          //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "send",
  "version": "0.16.1"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/send/index.js                                                              //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/webapp/webapp_server.js");

/* Exports */
Package._define("webapp", exports, {
  WebApp: WebApp,
  WebAppInternals: WebAppInternals,
  main: main
});

})();

//# sourceURL=meteor://💻app/packages/webapp.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvd2ViYXBwL3dlYmFwcF9zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3dlYmFwcC9jb25uZWN0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy93ZWJhcHAvc29ja2V0X2ZpbGUuanMiXSwibmFtZXMiOlsibW9kdWxlMSIsIm1vZHVsZSIsImV4cG9ydCIsIldlYkFwcCIsIldlYkFwcEludGVybmFscyIsImFzc2VydCIsImxpbmsiLCJkZWZhdWx0IiwidiIsInJlYWRGaWxlU3luYyIsImNyZWF0ZVNlcnZlciIsInBhdGhKb2luIiwicGF0aERpcm5hbWUiLCJqb2luIiwiZGlybmFtZSIsInBhcnNlVXJsIiwicGFyc2UiLCJjcmVhdGVIYXNoIiwiY29ubmVjdCIsImNvbXByZXNzIiwiY29va2llUGFyc2VyIiwicXVlcnkiLCJwYXJzZVJlcXVlc3QiLCJiYXNpY0F1dGgiLCJsb29rdXBVc2VyQWdlbnQiLCJsb29rdXAiLCJpc01vZGVybiIsInNlbmQiLCJyZW1vdmVFeGlzdGluZ1NvY2tldEZpbGUiLCJyZWdpc3RlclNvY2tldEZpbGVDbGVhbnVwIiwib25NZXNzYWdlIiwiU0hPUlRfU09DS0VUX1RJTUVPVVQiLCJMT05HX1NPQ0tFVF9USU1FT1VUIiwiaGFzT3duIiwiT2JqZWN0IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJOcG1Nb2R1bGVzIiwidmVyc2lvbiIsIk5wbSIsInJlcXVpcmUiLCJkZWZhdWx0QXJjaCIsImNsaWVudFByb2dyYW1zIiwiYXJjaFBhdGgiLCJidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayIsInVybCIsImJ1bmRsZWRQcmVmaXgiLCJfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIiwiUk9PVF9VUkxfUEFUSF9QUkVGSVgiLCJzaGExIiwiY29udGVudHMiLCJoYXNoIiwidXBkYXRlIiwiZGlnZXN0Iiwic2hvdWxkQ29tcHJlc3MiLCJyZXEiLCJyZXMiLCJoZWFkZXJzIiwiZmlsdGVyIiwiY2FtZWxDYXNlIiwibmFtZSIsInBhcnRzIiwic3BsaXQiLCJ0b0xvd2VyQ2FzZSIsImkiLCJsZW5ndGgiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInN1YnN0ciIsImlkZW50aWZ5QnJvd3NlciIsInVzZXJBZ2VudFN0cmluZyIsInVzZXJBZ2VudCIsImZhbWlseSIsIm1ham9yIiwibWlub3IiLCJwYXRjaCIsImNhdGVnb3JpemVSZXF1ZXN0IiwiXyIsImV4dGVuZCIsImJyb3dzZXIiLCJwaWNrIiwiaHRtbEF0dHJpYnV0ZUhvb2tzIiwiZ2V0SHRtbEF0dHJpYnV0ZXMiLCJyZXF1ZXN0IiwiY29tYmluZWRBdHRyaWJ1dGVzIiwiZWFjaCIsImhvb2siLCJhdHRyaWJ1dGVzIiwiRXJyb3IiLCJhZGRIdG1sQXR0cmlidXRlSG9vayIsInB1c2giLCJhcHBVcmwiLCJSb3V0ZVBvbGljeSIsImNsYXNzaWZ5IiwiTWV0ZW9yIiwic3RhcnR1cCIsImdldHRlciIsImtleSIsImFyY2giLCJwcm9ncmFtIiwidmFsdWUiLCJjYWxjdWxhdGVDbGllbnRIYXNoIiwiY2xpZW50SGFzaCIsImNhbGN1bGF0ZUNsaWVudEhhc2hSZWZyZXNoYWJsZSIsImNhbGN1bGF0ZUNsaWVudEhhc2hOb25SZWZyZXNoYWJsZSIsImdldFJlZnJlc2hhYmxlQXNzZXRzIiwiX3RpbWVvdXRBZGp1c3RtZW50UmVxdWVzdENhbGxiYWNrIiwic2V0VGltZW91dCIsImZpbmlzaExpc3RlbmVycyIsImxpc3RlbmVycyIsInJlbW92ZUFsbExpc3RlbmVycyIsIm9uIiwibCIsImJvaWxlcnBsYXRlQnlBcmNoIiwiYm9pbGVycGxhdGVEYXRhQ2FsbGJhY2tzIiwiY3JlYXRlIiwicmVnaXN0ZXJCb2lsZXJwbGF0ZURhdGFDYWxsYmFjayIsImNhbGxiYWNrIiwicHJldmlvdXNDYWxsYmFjayIsInN0cmljdEVxdWFsIiwiZ2V0Qm9pbGVycGxhdGUiLCJnZXRCb2lsZXJwbGF0ZUFzeW5jIiwiYXdhaXQiLCJib2lsZXJwbGF0ZSIsImRhdGEiLCJhc3NpZ24iLCJiYXNlRGF0YSIsImh0bWxBdHRyaWJ1dGVzIiwibWFkZUNoYW5nZXMiLCJwcm9taXNlIiwiUHJvbWlzZSIsInJlc29sdmUiLCJrZXlzIiwiZm9yRWFjaCIsInRoZW4iLCJyZXN1bHQiLCJzdHJlYW0iLCJ0b0hUTUxTdHJlYW0iLCJzdGF0dXNDb2RlIiwiZ2VuZXJhdGVCb2lsZXJwbGF0ZUluc3RhbmNlIiwibWFuaWZlc3QiLCJhZGRpdGlvbmFsT3B0aW9ucyIsInJ1bnRpbWVDb25maWciLCJjbG9uZSIsInJ1bnRpbWVDb25maWdPdmVycmlkZXMiLCJCb2lsZXJwbGF0ZSIsInBhdGhNYXBwZXIiLCJpdGVtUGF0aCIsImJhc2VEYXRhRXh0ZW5zaW9uIiwiYWRkaXRpb25hbFN0YXRpY0pzIiwibWFwIiwicGF0aG5hbWUiLCJtZXRlb3JSdW50aW1lQ29uZmlnIiwiSlNPTiIsInN0cmluZ2lmeSIsImVuY29kZVVSSUNvbXBvbmVudCIsInJvb3RVcmxQYXRoUHJlZml4Iiwic3JpTW9kZSIsImlubGluZVNjcmlwdHNBbGxvd2VkIiwiaW5saW5lIiwic3RhdGljRmlsZXNNaWRkbGV3YXJlIiwic3RhdGljRmlsZXNCeUFyY2giLCJuZXh0IiwibWV0aG9kIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiZSIsInNlcnZlU3RhdGljSnMiLCJzIiwid3JpdGVIZWFkIiwid3JpdGUiLCJlbmQiLCJoYXMiLCJwYXRoIiwiZ2V0QXJjaEFuZFBhdGgiLCJwYXVzZWQiLCJpbmZvIiwiZ2V0U3RhdGljRmlsZUluZm8iLCJtYXhBZ2UiLCJjYWNoZWFibGUiLCJzZXRIZWFkZXIiLCJzb3VyY2VNYXBVcmwiLCJ0eXBlIiwiY29udGVudCIsImFic29sdXRlUGF0aCIsIm1heGFnZSIsImRvdGZpbGVzIiwibGFzdE1vZGlmaWVkIiwiZXJyIiwiTG9nIiwiZXJyb3IiLCJwaXBlIiwib3JpZ2luYWxQYXRoIiwiY2FsbCIsInN0YXRpY0FyY2hMaXN0IiwiYXJjaEluZGV4IiwiaW5kZXhPZiIsInVuc2hpZnQiLCJzcGxpY2UiLCJzb21lIiwic3RhdGljRmlsZXMiLCJmaW5hbGl6ZSIsInBhdGhQYXJ0cyIsImFyY2hLZXkiLCJzdGFydHNXaXRoIiwiYXJjaENsZWFuZWQiLCJzbGljZSIsInBhcnNlUG9ydCIsInBvcnQiLCJwYXJzZWRQb3J0IiwicGFyc2VJbnQiLCJOdW1iZXIiLCJpc05hTiIsInBhdXNlQ2xpZW50IiwiZ2VuZXJhdGVDbGllbnRQcm9ncmFtIiwicnVuV2ViQXBwU2VydmVyIiwic2h1dHRpbmdEb3duIiwic3luY1F1ZXVlIiwiX1N5bmNocm9ub3VzUXVldWUiLCJnZXRJdGVtUGF0aG5hbWUiLCJpdGVtVXJsIiwicmVsb2FkQ2xpZW50UHJvZ3JhbXMiLCJydW5UYXNrIiwiY29uZmlnSnNvbiIsIl9fbWV0ZW9yX2Jvb3RzdHJhcF9fIiwiY2xpZW50QXJjaHMiLCJjbGllbnRQYXRocyIsInN0YWNrIiwicHJvY2VzcyIsImV4aXQiLCJ1bnBhdXNlIiwiY2xpZW50RGlyIiwic2VydmVyRGlyIiwicHJvZ3JhbUpzb25QYXRoIiwicHJvZ3JhbUpzb24iLCJjb2RlIiwiZm9ybWF0IiwiaXRlbSIsIndoZXJlIiwic291cmNlTWFwIiwiUFVCTElDX1NFVFRJTkdTIiwiY29uZmlnT3ZlcnJpZGVzIiwib2xkUHJvZ3JhbSIsIm5ld1Byb2dyYW0iLCJXZWJBcHBIYXNoaW5nIiwidmVyc2lvblJlZnJlc2hhYmxlIiwidmVyc2lvbk5vblJlZnJlc2hhYmxlIiwiY29yZG92YUNvbXBhdGliaWxpdHlWZXJzaW9ucyIsIm1hbmlmZXN0VXJsUHJlZml4IiwicmVwbGFjZSIsIm1hbmlmZXN0VXJsIiwiUGFja2FnZSIsImF1dG91cGRhdGUiLCJBVVRPVVBEQVRFX1ZFUlNJT04iLCJBdXRvdXBkYXRlIiwiYXV0b3VwZGF0ZVZlcnNpb24iLCJlbnYiLCJnZW5lcmF0ZUJvaWxlcnBsYXRlRm9yQXJjaCIsImRlZmF1bHRPcHRpb25zRm9yQXJjaCIsIkREUF9ERUZBVUxUX0NPTk5FQ1RJT05fVVJMIiwiTU9CSUxFX0REUF9VUkwiLCJhYnNvbHV0ZVVybCIsIlJPT1RfVVJMIiwiTU9CSUxFX1JPT1RfVVJMIiwiZ2VuZXJhdGVCb2lsZXJwbGF0ZSIsInJlZnJlc2hhYmxlQXNzZXRzIiwiY3NzIiwiZmlsZSIsImFwcCIsInJhd0Nvbm5lY3RIYW5kbGVycyIsInVzZSIsImlzVmFsaWRVcmwiLCJnZXRQYXRoUGFydHMiLCJzaGlmdCIsImlzUHJlZml4T2YiLCJwcmVmaXgiLCJhcnJheSIsImV2ZXJ5IiwicGFydCIsInJlc3BvbnNlIiwicGF0aFByZWZpeCIsInByZWZpeFBhcnRzIiwibWV0ZW9ySW50ZXJuYWxIYW5kbGVycyIsInBhY2thZ2VBbmRBcHBIYW5kbGVycyIsInN1cHByZXNzQ29ubmVjdEVycm9ycyIsInN0YXR1cyIsIm5ld0hlYWRlcnMiLCJjYXRjaCIsImh0dHBTZXJ2ZXIiLCJvbkxpc3RlbmluZ0NhbGxiYWNrcyIsInNvY2tldCIsImRlc3Ryb3llZCIsIm1lc3NhZ2UiLCJkZXN0cm95IiwiY29ubmVjdEhhbmRsZXJzIiwiY29ubmVjdEFwcCIsIm9uTGlzdGVuaW5nIiwiZiIsInN0YXJ0TGlzdGVuaW5nIiwibGlzdGVuT3B0aW9ucyIsImNiIiwibGlzdGVuIiwiZXhwb3J0cyIsIm1haW4iLCJhcmd2Iiwic3RhcnRIdHRwU2VydmVyIiwiYmluZEVudmlyb25tZW50IiwiTUVURU9SX1BSSU5UX09OX0xJU1RFTiIsImNvbnNvbGUiLCJsb2ciLCJjYWxsYmFja3MiLCJsb2NhbFBvcnQiLCJQT1JUIiwidW5peFNvY2tldFBhdGgiLCJVTklYX1NPQ0tFVF9QQVRIIiwidGVzdCIsImhvc3QiLCJCSU5EX0lQIiwic2V0SW5saW5lU2NyaXB0c0FsbG93ZWQiLCJlbmFibGVTdWJyZXNvdXJjZUludGVncml0eSIsInVzZV9jcmVkZW50aWFscyIsInNldEJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rIiwiaG9va0ZuIiwic2V0QnVuZGxlZEpzQ3NzUHJlZml4Iiwic2VsZiIsImFkZFN0YXRpY0pzIiwibnBtQ29ubmVjdCIsImNvbm5lY3RBcmdzIiwiaGFuZGxlcnMiLCJhcHBseSIsIm9yaWdpbmFsVXNlIiwidXNlQXJncyIsIm9yaWdpbmFsTGVuZ3RoIiwiZW50cnkiLCJvcmlnaW5hbEhhbmRsZSIsImhhbmRsZSIsImFzeW5jQXBwbHkiLCJhcmd1bWVudHMiLCJzdGF0U3luYyIsInVubGlua1N5bmMiLCJleGlzdHNTeW5jIiwic29ja2V0UGF0aCIsImlzU29ja2V0IiwiZXZlbnRFbWl0dGVyIiwic2lnbmFsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBTUEsT0FBTyxHQUFDQyxNQUFkO0FBQXFCRCxPQUFPLENBQUNFLE1BQVIsQ0FBZTtBQUFDQyxRQUFNLEVBQUMsTUFBSUEsTUFBWjtBQUFtQkMsaUJBQWUsRUFBQyxNQUFJQTtBQUF2QyxDQUFmO0FBQXdFLElBQUlDLE1BQUo7QUFBV0wsT0FBTyxDQUFDTSxJQUFSLENBQWEsUUFBYixFQUFzQjtBQUFDQyxTQUFPLENBQUNDLENBQUQsRUFBRztBQUFDSCxVQUFNLEdBQUNHLENBQVA7QUFBUzs7QUFBckIsQ0FBdEIsRUFBNkMsQ0FBN0M7QUFBZ0QsSUFBSUMsWUFBSjtBQUFpQlQsT0FBTyxDQUFDTSxJQUFSLENBQWEsSUFBYixFQUFrQjtBQUFDRyxjQUFZLENBQUNELENBQUQsRUFBRztBQUFDQyxnQkFBWSxHQUFDRCxDQUFiO0FBQWU7O0FBQWhDLENBQWxCLEVBQW9ELENBQXBEO0FBQXVELElBQUlFLFlBQUo7QUFBaUJWLE9BQU8sQ0FBQ00sSUFBUixDQUFhLE1BQWIsRUFBb0I7QUFBQ0ksY0FBWSxDQUFDRixDQUFELEVBQUc7QUFBQ0UsZ0JBQVksR0FBQ0YsQ0FBYjtBQUFlOztBQUFoQyxDQUFwQixFQUFzRCxDQUF0RDtBQUF5RCxJQUFJRyxRQUFKLEVBQWFDLFdBQWI7QUFBeUJaLE9BQU8sQ0FBQ00sSUFBUixDQUFhLE1BQWIsRUFBb0I7QUFBQ08sTUFBSSxDQUFDTCxDQUFELEVBQUc7QUFBQ0csWUFBUSxHQUFDSCxDQUFUO0FBQVcs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QVksR0FBR25ILE9BQTVCLEtBQXdDO0FBQ3RDLEdBQUMsTUFBRCxFQUFTLFFBQVQsRUFBbUIsUUFBbkIsRUFBNkIsU0FBN0IsRUFBd0M5RixPQUF4QyxDQUFnRGtOLE1BQU0sSUFBSTtBQUN4REQsZ0JBQVksQ0FBQ3ZPLEVBQWIsQ0FBZ0J3TyxNQUFoQixFQUF3QnpQLE1BQU0sQ0FBQ21OLGVBQVAsQ0FBdUIsTUFBTTtBQUNuRCxVQUFJa0MsVUFBVSxDQUFDQyxVQUFELENBQWQsRUFBNEI7QUFDMUJGLGtCQUFVLENBQUNFLFVBQUQsQ0FBVjtBQUNEO0FBQ0YsS0FKdUIsQ0FBeEI7QUFLRCxHQU5EO0FBT0QsQ0FUSSxDIiwiZmlsZSI6Ii9wYWNrYWdlcy93ZWJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXNzZXJ0IGZyb20gXCJhc3NlcnRcIjtcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gXCJmc1wiO1xuaW1wb3J0IHsgY3JlYXRlU2VydmVyIH0gZnJvbSBcImh0dHBcIjtcbmltcG9ydCB7XG4gIGpvaW4gYXMgcGF0aEpvaW4sXG4gIGRpcm5hbWUgYXMgcGF0aERpcm5hbWUsXG59IGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBwYXJzZSBhcyBwYXJzZVVybCB9IGZyb20gXCJ1cmxcIjtcbmltcG9ydCB7IGNyZWF0ZUhhc2ggfSBmcm9tIFwiY3J5cHRvXCI7XG5pbXBvcnQgeyBjb25uZWN0IH0gZnJvbSBcIi4vY29ubmVjdC5qc1wiO1xuaW1wb3J0IGNvbXByZXNzIGZyb20gXCJjb21wcmVzc2lvblwiO1xuaW1wb3J0IGNvb2tpZVBhcnNlciBmcm9tIFwiY29va2llLXBhcnNlclwiO1xuaW1wb3J0IHF1ZXJ5IGZyb20gXCJxcy1taWRkbGV3YXJlXCI7XG5pbXBvcnQgcGFyc2VSZXF1ZXN0IGZyb20gXCJwYXJzZXVybFwiO1xuaW1wb3J0IGJhc2ljQXV0aCBmcm9tIFwiYmFzaWMtYXV0aC1jb25uZWN0XCI7XG5pbXBvcnQgeyBsb29rdXAgYXMgbG9va3VwVXNlckFnZW50IH0gZnJvbSBcInVzZXJhZ2VudFwiO1xuaW1wb3J0IHsgaXNNb2Rlcm4gfSBmcm9tIFwibWV0ZW9yL21vZGVybi1icm93c2Vyc1wiO1xuaW1wb3J0IHNlbmQgZnJvbSBcInNlbmRcIjtcbmltcG9ydCB7XG4gIHJlbW92ZUV4aXN0aW5nU29ja2V0RmlsZSxcbiAgcmVnaXN0ZXJTb2NrZXRGaWxlQ2xlYW51cCxcbn0gZnJvbSAnLi9zb2NrZXRfZmlsZS5qcyc7XG5cbnZhciBTSE9SVF9TT0NLRVRfVElNRU9VVCA9IDUqMTAwMDtcbnZhciBMT05HX1NPQ0tFVF9USU1FT1VUID0gMTIwKjEwMDA7XG5cbmV4cG9ydCBjb25zdCBXZWJBcHAgPSB7fTtcbmV4cG9ydCBjb25zdCBXZWJBcHBJbnRlcm5hbHMgPSB7fTtcblxuY29uc3QgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy8gYmFja3dhcmRzIGNvbXBhdCB0byAyLjAgb2YgY29ubmVjdFxuY29ubmVjdC5iYXNpY0F1dGggPSBiYXNpY0F1dGg7XG5cbldlYkFwcEludGVybmFscy5OcG1Nb2R1bGVzID0ge1xuICBjb25uZWN0OiB7XG4gICAgdmVyc2lvbjogTnBtLnJlcXVpcmUoJ2Nvbm5lY3QvcGFja2FnZS5qc29uJykudmVyc2lvbixcbiAgICBtb2R1bGU6IGNvbm5lY3QsXG4gIH1cbn07XG5cbi8vIFRob3VnaCB3ZSBtaWdodCBwcmVmZXIgdG8gdXNlIHdlYi5icm93c2VyIChtb2Rlcm4pIGFzIHRoZSBkZWZhdWx0XG4vLyBhcmNoaXRlY3R1cmUsIHNhZmV0eSByZXF1aXJlcyBhIG1vcmUgY29tcGF0aWJsZSBkZWZhdWx0QXJjaC5cbldlYkFwcC5kZWZhdWx0QXJjaCA9ICd3ZWIuYnJvd3Nlci5sZWdhY3knO1xuXG4vLyBYWFggbWFwcyBhcmNocyB0byBtYW5pZmVzdHNcbldlYkFwcC5jbGllbnRQcm9ncmFtcyA9IHt9O1xuXG4vLyBYWFggbWFwcyBhcmNocyB0byBwcm9ncmFtIHBhdGggb24gZmlsZXN5c3RlbVxudmFyIGFyY2hQYXRoID0ge307XG5cbnZhciBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayA9IGZ1bmN0aW9uICh1cmwpIHtcbiAgdmFyIGJ1bmRsZWRQcmVmaXggPVxuICAgICBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYIHx8ICcnO1xuICByZXR1cm4gYnVuZGxlZFByZWZpeCArIHVybDtcbn07XG5cbnZhciBzaGExID0gZnVuY3Rpb24gKGNvbnRlbnRzKSB7XG4gIHZhciBoYXNoID0gY3JlYXRlSGFzaCgnc2hhMScpO1xuICBoYXNoLnVwZGF0ZShjb250ZW50cyk7XG4gIHJldHVybiBoYXNoLmRpZ2VzdCgnaGV4Jyk7XG59O1xuXG4gZnVuY3Rpb24gc2hvdWxkQ29tcHJlc3MocmVxLCByZXMpIHtcbiAgaWYgKHJlcS5oZWFkZXJzWyd4LW5vLWNvbXByZXNzaW9uJ10pIHtcbiAgICAvLyBkb24ndCBjb21wcmVzcyByZXNwb25zZXMgd2l0aCB0aGlzIHJlcXVlc3QgaGVhZGVyXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gZmFsbGJhY2sgdG8gc3RhbmRhcmQgZmlsdGVyIGZ1bmN0aW9uXG4gIHJldHVybiBjb21wcmVzcy5maWx0ZXIocmVxLCByZXMpO1xufTtcblxuLy8gI0Jyb3dzZXJJZGVudGlmaWNhdGlvblxuLy9cbi8vIFdlIGhhdmUgbXVsdGlwbGUgcGxhY2VzIHRoYXQgd2FudCB0byBpZGVudGlmeSB0aGUgYnJvd3NlcjogdGhlXG4vLyB1bnN1cHBvcnRlZCBicm93c2VyIHBhZ2UsIHRoZSBhcHBjYWNoZSBwYWNrYWdlLCBhbmQsIGV2ZW50dWFsbHlcbi8vIGRlbGl2ZXJpbmcgYnJvd3NlciBwb2x5ZmlsbHMgb25seSBhcyBuZWVkZWQuXG4vL1xuLy8gVG8gYXZvaWQgZGV0ZWN0aW5nIHRoZSBicm93c2VyIGluIG11bHRpcGxlIHBsYWNlcyBhZC1ob2MsIHdlIGNyZWF0ZSBhXG4vLyBNZXRlb3IgXCJicm93c2VyXCIgb2JqZWN0LiBJdCB1c2VzIGJ1dCBkb2VzIG5vdCBleHBvc2UgdGhlIG5wbVxuLy8gdXNlcmFnZW50IG1vZHVsZSAod2UgY291bGQgY2hvb3NlIGEgZGlmZmVyZW50IG1lY2hhbmlzbSB0byBpZGVudGlmeVxuLy8gdGhlIGJyb3dzZXIgaW4gdGhlIGZ1dHVyZSBpZiB3ZSB3YW50ZWQgdG8pLiAgVGhlIGJyb3dzZXIgb2JqZWN0XG4vLyBjb250YWluc1xuLy9cbi8vICogYG5hbWVgOiB0aGUgbmFtZSBvZiB0aGUgYnJvd3NlciBpbiBjYW1lbCBjYXNlXG4vLyAqIGBtYWpvcmAsIGBtaW5vcmAsIGBwYXRjaGA6IGludGVnZXJzIGRlc2NyaWJpbmcgdGhlIGJyb3dzZXIgdmVyc2lvblxuLy9cbi8vIEFsc28gaGVyZSBpcyBhbiBlYXJseSB2ZXJzaW9uIG9mIGEgTWV0ZW9yIGByZXF1ZXN0YCBvYmplY3QsIGludGVuZGVkXG4vLyB0byBiZSBhIGhpZ2gtbGV2ZWwgZGVzY3JpcHRpb24gb2YgdGhlIHJlcXVlc3Qgd2l0aG91dCBleHBvc2luZ1xuLy8gZGV0YWlscyBvZiBjb25uZWN0J3MgbG93LWxldmVsIGByZXFgLiAgQ3VycmVudGx5IGl0IGNvbnRhaW5zOlxuLy9cbi8vICogYGJyb3dzZXJgOiBicm93c2VyIGlkZW50aWZpY2F0aW9uIG9iamVjdCBkZXNjcmliZWQgYWJvdmVcbi8vICogYHVybGA6IHBhcnNlZCB1cmwsIGluY2x1ZGluZyBwYXJzZWQgcXVlcnkgcGFyYW1zXG4vL1xuLy8gQXMgYSB0ZW1wb3JhcnkgaGFjayB0aGVyZSBpcyBhIGBjYXRlZ29yaXplUmVxdWVzdGAgZnVuY3Rpb24gb24gV2ViQXBwIHdoaWNoXG4vLyBjb252ZXJ0cyBhIGNvbm5lY3QgYHJlcWAgdG8gYSBNZXRlb3IgYHJlcXVlc3RgLiBUaGlzIGNhbiBnbyBhd2F5IG9uY2Ugc21hcnRcbi8vIHBhY2thZ2VzIHN1Y2ggYXMgYXBwY2FjaGUgYXJlIGJlaW5nIHBhc3NlZCBhIGByZXF1ZXN0YCBvYmplY3QgZGlyZWN0bHkgd2hlblxuLy8gdGhleSBzZXJ2ZSBjb250ZW50LlxuLy9cbi8vIFRoaXMgYWxsb3dzIGByZXF1ZXN0YCB0byBiZSB1c2VkIHVuaWZvcm1seTogaXQgaXMgcGFzc2VkIHRvIHRoZSBodG1sXG4vLyBhdHRyaWJ1dGVzIGhvb2ssIGFuZCB0aGUgYXBwY2FjaGUgcGFja2FnZSBjYW4gdXNlIGl0IHdoZW4gZGVjaWRpbmdcbi8vIHdoZXRoZXIgdG8gZ2VuZXJhdGUgYSA0MDQgZm9yIHRoZSBtYW5pZmVzdC5cbi8vXG4vLyBSZWFsIHJvdXRpbmcgLyBzZXJ2ZXIgc2lkZSByZW5kZXJpbmcgd2lsbCBwcm9iYWJseSByZWZhY3RvciB0aGlzXG4vLyBoZWF2aWx5LlxuXG5cbi8vIGUuZy4gXCJNb2JpbGUgU2FmYXJpXCIgPT4gXCJtb2JpbGVTYWZhcmlcIlxudmFyIGNhbWVsQ2FzZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gIHZhciBwYXJ0cyA9IG5hbWUuc3BsaXQoJyAnKTtcbiAgcGFydHNbMF0gPSBwYXJ0c1swXS50b0xvd2VyQ2FzZSgpO1xuICBmb3IgKHZhciBpID0gMTsgIGkgPCBwYXJ0cy5sZW5ndGg7ICArK2kpIHtcbiAgICBwYXJ0c1tpXSA9IHBhcnRzW2ldLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcGFydHNbaV0uc3Vic3RyKDEpO1xuICB9XG4gIHJldHVybiBwYXJ0cy5qb2luKCcnKTtcbn07XG5cbnZhciBpZGVudGlmeUJyb3dzZXIgPSBmdW5jdGlvbiAodXNlckFnZW50U3RyaW5nKSB7XG4gIHZhciB1c2VyQWdlbnQgPSBsb29rdXBVc2VyQWdlbnQodXNlckFnZW50U3RyaW5nKTtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBjYW1lbENhc2UodXNlckFnZW50LmZhbWlseSksXG4gICAgbWFqb3I6ICt1c2VyQWdlbnQubWFqb3IsXG4gICAgbWlub3I6ICt1c2VyQWdlbnQubWlub3IsXG4gICAgcGF0Y2g6ICt1c2VyQWdlbnQucGF0Y2hcbiAgfTtcbn07XG5cbi8vIFhYWCBSZWZhY3RvciBhcyBwYXJ0IG9mIGltcGxlbWVudGluZyByZWFsIHJvdXRpbmcuXG5XZWJBcHBJbnRlcm5hbHMuaWRlbnRpZnlCcm93c2VyID0gaWRlbnRpZnlCcm93c2VyO1xuXG5XZWJBcHAuY2F0ZWdvcml6ZVJlcXVlc3QgPSBmdW5jdGlvbiAocmVxKSB7XG4gIHJldHVybiBfLmV4dGVuZCh7XG4gICAgYnJvd3NlcjogaWRlbnRpZnlCcm93c2VyKHJlcS5oZWFkZXJzWyd1c2VyLWFnZW50J10pLFxuICAgIHVybDogcGFyc2VVcmwocmVxLnVybCwgdHJ1ZSlcbiAgfSwgXy5waWNrKHJlcSwgJ2R5bmFtaWNIZWFkJywgJ2R5bmFtaWNCb2R5JywgJ2hlYWRlcnMnLCAnY29va2llcycpKTtcbn07XG5cbi8vIEhUTUwgYXR0cmlidXRlIGhvb2tzOiBmdW5jdGlvbnMgdG8gYmUgY2FsbGVkIHRvIGRldGVybWluZSBhbnkgYXR0cmlidXRlcyB0b1xuLy8gYmUgYWRkZWQgdG8gdGhlICc8aHRtbD4nIHRhZy4gRWFjaCBmdW5jdGlvbiBpcyBwYXNzZWQgYSAncmVxdWVzdCcgb2JqZWN0IChzZWVcbi8vICNCcm93c2VySWRlbnRpZmljYXRpb24pIGFuZCBzaG91bGQgcmV0dXJuIG51bGwgb3Igb2JqZWN0LlxudmFyIGh0bWxBdHRyaWJ1dGVIb29rcyA9IFtdO1xudmFyIGdldEh0bWxBdHRyaWJ1dGVzID0gZnVuY3Rpb24gKHJlcXVlc3QpIHtcbiAgdmFyIGNvbWJpbmVkQXR0cmlidXRlcyAgPSB7fTtcbiAgXy5lYWNoKGh0bWxBdHRyaWJ1dGVIb29rcyB8fCBbXSwgZnVuY3Rpb24gKGhvb2spIHtcbiAgICB2YXIgYXR0cmlidXRlcyA9IGhvb2socmVxdWVzdCk7XG4gICAgaWYgKGF0dHJpYnV0ZXMgPT09IG51bGwpXG4gICAgICByZXR1cm47XG4gICAgaWYgKHR5cGVvZiBhdHRyaWJ1dGVzICE9PSAnb2JqZWN0JylcbiAgICAgIHRocm93IEVycm9yKFwiSFRNTCBhdHRyaWJ1dGUgaG9vayBtdXN0IHJldHVybiBudWxsIG9yIG9iamVjdFwiKTtcbiAgICBfLmV4dGVuZChjb21iaW5lZEF0dHJpYnV0ZXMsIGF0dHJpYnV0ZXMpO1xuICB9KTtcbiAgcmV0dXJuIGNvbWJpbmVkQXR0cmlidXRlcztcbn07XG5XZWJBcHAuYWRkSHRtbEF0dHJpYnV0ZUhvb2sgPSBmdW5jdGlvbiAoaG9vaykge1xuICBodG1sQXR0cmlidXRlSG9va3MucHVzaChob29rKTtcbn07XG5cbi8vIFNlcnZlIGFwcCBIVE1MIGZvciB0aGlzIFVSTD9cbnZhciBhcHBVcmwgPSBmdW5jdGlvbiAodXJsKSB7XG4gIGlmICh1cmwgPT09ICcvZmF2aWNvbi5pY28nIHx8IHVybCA9PT0gJy9yb2JvdHMudHh0JylcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgLy8gTk9URTogYXBwLm1hbmlmZXN0IGlzIG5vdCBhIHdlYiBzdGFuZGFyZCBsaWtlIGZhdmljb24uaWNvIGFuZFxuICAvLyByb2JvdHMudHh0LiBJdCBpcyBhIGZpbGUgbmFtZSB3ZSBoYXZlIGNob3NlbiB0byB1c2UgZm9yIEhUTUw1XG4gIC8vIGFwcGNhY2hlIFVSTHMuIEl0IGlzIGluY2x1ZGVkIGhlcmUgdG8gcHJldmVudCB1c2luZyBhbiBhcHBjYWNoZVxuICAvLyB0aGVuIHJlbW92aW5nIGl0IGZyb20gcG9pc29uaW5nIGFuIGFwcCBwZXJtYW5lbnRseS4gRXZlbnR1YWxseSxcbiAgLy8gb25jZSB3ZSBoYXZlIHNlcnZlciBzaWRlIHJvdXRpbmcsIHRoaXMgd29uJ3QgYmUgbmVlZGVkIGFzXG4gIC8vIHVua25vd24gVVJMcyB3aXRoIHJldHVybiBhIDQwNCBhdXRvbWF0aWNhbGx5LlxuICBpZiAodXJsID09PSAnL2FwcC5tYW5pZmVzdCcpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIEF2b2lkIHNlcnZpbmcgYXBwIEhUTUwgZm9yIGRlY2xhcmVkIHJvdXRlcyBzdWNoIGFzIC9zb2NranMvLlxuICBpZiAoUm91dGVQb2xpY3kuY2xhc3NpZnkodXJsKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgLy8gd2UgY3VycmVudGx5IHJldHVybiBhcHAgSFRNTCBvbiBhbGwgVVJMcyBieSBkZWZhdWx0XG4gIHJldHVybiB0cnVlO1xufTtcblxuXG4vLyBXZSBuZWVkIHRvIGNhbGN1bGF0ZSB0aGUgY2xpZW50IGhhc2ggYWZ0ZXIgYWxsIHBhY2thZ2VzIGhhdmUgbG9hZGVkXG4vLyB0byBnaXZlIHRoZW0gYSBjaGFuY2UgdG8gcG9wdWxhdGUgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5cbi8vXG4vLyBDYWxjdWxhdGluZyB0aGUgaGFzaCBkdXJpbmcgc3RhcnR1cCBtZWFucyB0aGF0IHBhY2thZ2VzIGNhbiBvbmx5XG4vLyBwb3B1bGF0ZSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIGR1cmluZyBsb2FkLCBub3QgZHVyaW5nIHN0YXJ0dXAuXG4vL1xuLy8gQ2FsY3VsYXRpbmcgaW5zdGVhZCBpdCBhdCB0aGUgYmVnaW5uaW5nIG9mIG1haW4gYWZ0ZXIgYWxsIHN0YXJ0dXBcbi8vIGhvb2tzIGhhZCBydW4gd291bGQgYWxsb3cgcGFja2FnZXMgdG8gYWxzbyBwb3B1bGF0ZVxuLy8gX19tZXRlb3JfcnVudGltZV9jb25maWdfXyBkdXJpbmcgc3RhcnR1cCwgYnV0IHRoYXQncyB0b28gbGF0ZSBmb3Jcbi8vIGF1dG91cGRhdGUgYmVjYXVzZSBpdCBuZWVkcyB0byBoYXZlIHRoZSBjbGllbnQgaGFzaCBhdCBzdGFydHVwIHRvXG4vLyBpbnNlcnQgdGhlIGF1dG8gdXBkYXRlIHZlcnNpb24gaXRzZWxmIGludG9cbi8vIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18gdG8gZ2V0IGl0IHRvIHRoZSBjbGllbnQuXG4vL1xuLy8gQW4gYWx0ZXJuYXRpdmUgd291bGQgYmUgdG8gZ2l2ZSBhdXRvdXBkYXRlIGEgXCJwb3N0LXN0YXJ0LFxuLy8gcHJlLWxpc3RlblwiIGhvb2sgdG8gYWxsb3cgaXQgdG8gaW5zZXJ0IHRoZSBhdXRvIHVwZGF0ZSB2ZXJzaW9uIGF0XG4vLyB0aGUgcmlnaHQgbW9tZW50LlxuXG5NZXRlb3Iuc3RhcnR1cChmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIGdldHRlcihrZXkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGFyY2gpIHtcbiAgICAgIGFyY2ggPSBhcmNoIHx8IFdlYkFwcC5kZWZhdWx0QXJjaDtcbiAgICAgIGNvbnN0IHByb2dyYW0gPSBXZWJBcHAuY2xpZW50UHJvZ3JhbXNbYXJjaF07XG4gICAgICBjb25zdCB2YWx1ZSA9IHByb2dyYW0gJiYgcHJvZ3JhbVtrZXldO1xuICAgICAgLy8gSWYgdGhpcyBpcyB0aGUgZmlyc3QgdGltZSB3ZSBoYXZlIGNhbGN1bGF0ZWQgdGhpcyBoYXNoLFxuICAgICAgLy8gcHJvZ3JhbVtrZXldIHdpbGwgYmUgYSB0aHVuayAobGF6eSBmdW5jdGlvbiB3aXRoIG5vIHBhcmFtZXRlcnMpXG4gICAgICAvLyB0aGF0IHdlIHNob3VsZCBjYWxsIHRvIGRvIHRoZSBhY3R1YWwgY29tcHV0YXRpb24uXG4gICAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgPyBwcm9ncmFtW2tleV0gPSB2YWx1ZSgpXG4gICAgICAgIDogdmFsdWU7XG4gICAgfTtcbiAgfVxuXG4gIFdlYkFwcC5jYWxjdWxhdGVDbGllbnRIYXNoID0gV2ViQXBwLmNsaWVudEhhc2ggPSBnZXR0ZXIoXCJ2ZXJzaW9uXCIpO1xuICBXZWJBcHAuY2FsY3VsYXRlQ2xpZW50SGFzaFJlZnJlc2hhYmxlID0gZ2V0dGVyKFwidmVyc2lvblJlZnJlc2hhYmxlXCIpO1xuICBXZWJBcHAuY2FsY3VsYXRlQ2xpZW50SGFzaE5vblJlZnJlc2hhYmxlID0gZ2V0dGVyKFwidmVyc2lvbk5vblJlZnJlc2hhYmxlXCIpO1xuICBXZWJBcHAuZ2V0UmVmcmVzaGFibGVBc3NldHMgPSBnZXR0ZXIoXCJyZWZyZXNoYWJsZUFzc2V0c1wiKTtcbn0pO1xuXG5cblxuLy8gV2hlbiB3ZSBoYXZlIGEgcmVxdWVzdCBwZW5kaW5nLCB3ZSB3YW50IHRoZSBzb2NrZXQgdGltZW91dCB0byBiZSBsb25nLCB0b1xuLy8gZ2l2ZSBvdXJzZWx2ZXMgYSB3aGlsZSB0byBzZXJ2ZSBpdCwgYW5kIHRvIGFsbG93IHNvY2tqcyBsb25nIHBvbGxzIHRvXG4vLyBjb21wbGV0ZS4gIE9uIHRoZSBvdGhlciBoYW5kLCB3ZSB3YW50IHRvIGNsb3NlIGlkbGUgc29ja2V0cyByZWxhdGl2ZWx5XG4vLyBxdWlja2x5LCBzbyB0aGF0IHdlIGNhbiBzaHV0IGRvd24gcmVsYXRpdmVseSBwcm9tcHRseSBidXQgY2xlYW5seSwgd2l0aG91dFxuLy8gY3V0dGluZyBvZmYgYW55b25lJ3MgcmVzcG9uc2UuXG5XZWJBcHAuX3RpbWVvdXRBZGp1c3RtZW50UmVxdWVzdENhbGxiYWNrID0gZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG4gIC8vIHRoaXMgaXMgcmVhbGx5IGp1c3QgcmVxLnNvY2tldC5zZXRUaW1lb3V0KExPTkdfU09DS0VUX1RJTUVPVVQpO1xuICByZXEuc2V0VGltZW91dChMT05HX1NPQ0tFVF9USU1FT1VUKTtcbiAgLy8gSW5zZXJ0IG91ciBuZXcgZmluaXNoIGxpc3RlbmVyIHRvIHJ1biBCRUZPUkUgdGhlIGV4aXN0aW5nIG9uZSB3aGljaCByZW1vdmVzXG4gIC8vIHRoZSByZXNwb25zZSBmcm9tIHRoZSBzb2NrZXQuXG4gIHZhciBmaW5pc2hMaXN0ZW5lcnMgPSByZXMubGlzdGVuZXJzKCdmaW5pc2gnKTtcbiAgLy8gWFhYIEFwcGFyZW50bHkgaW4gTm9kZSAwLjEyIHRoaXMgZXZlbnQgd2FzIGNhbGxlZCAncHJlZmluaXNoJy5cbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2pveWVudC9ub2RlL2NvbW1pdC83YzliNjA3MFxuICAvLyBCdXQgaXQgaGFzIHN3aXRjaGVkIGJhY2sgdG8gJ2ZpbmlzaCcgaW4gTm9kZSB2NDpcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL3B1bGwvMTQxMVxuICByZXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdmaW5pc2gnKTtcbiAgcmVzLm9uKCdmaW5pc2gnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmVzLnNldFRpbWVvdXQoU0hPUlRfU09DS0VUX1RJTUVPVVQpO1xuICB9KTtcbiAgXy5lYWNoKGZpbmlzaExpc3RlbmVycywgZnVuY3Rpb24gKGwpIHsgcmVzLm9uKCdmaW5pc2gnLCBsKTsgfSk7XG59O1xuXG5cbi8vIFdpbGwgYmUgdXBkYXRlZCBieSBtYWluIGJlZm9yZSB3ZSBsaXN0ZW4uXG4vLyBNYXAgZnJvbSBjbGllbnQgYXJjaCB0byBib2lsZXJwbGF0ZSBvYmplY3QuXG4vLyBCb2lsZXJwbGF0ZSBvYmplY3QgaGFzOlxuLy8gICAtIGZ1bmM6IFhYWFxuLy8gICAtIGJhc2VEYXRhOiBYWFhcbnZhciBib2lsZXJwbGF0ZUJ5QXJjaCA9IHt9O1xuXG4vLyBSZWdpc3RlciBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgY2FuIHNlbGVjdGl2ZWx5IG1vZGlmeSBib2lsZXJwbGF0ZVxuLy8gZGF0YSBnaXZlbiBhcmd1bWVudHMgKHJlcXVlc3QsIGRhdGEsIGFyY2gpLiBUaGUga2V5IHNob3VsZCBiZSBhIHVuaXF1ZVxuLy8gaWRlbnRpZmllciwgdG8gcHJldmVudCBhY2N1bXVsYXRpbmcgZHVwbGljYXRlIGNhbGxiYWNrcyBmcm9tIHRoZSBzYW1lXG4vLyBjYWxsIHNpdGUgb3ZlciB0aW1lLiBDYWxsYmFja3Mgd2lsbCBiZSBjYWxsZWQgaW4gdGhlIG9yZGVyIHRoZXkgd2VyZVxuLy8gcmVnaXN0ZXJlZC4gQSBjYWxsYmFjayBzaG91bGQgcmV0dXJuIGZhbHNlIGlmIGl0IGRpZCBub3QgbWFrZSBhbnlcbi8vIGNoYW5nZXMgYWZmZWN0aW5nIHRoZSBib2lsZXJwbGF0ZS4gUGFzc2luZyBudWxsIGRlbGV0ZXMgdGhlIGNhbGxiYWNrLlxuLy8gQW55IHByZXZpb3VzIGNhbGxiYWNrIHJlZ2lzdGVyZWQgZm9yIHRoaXMga2V5IHdpbGwgYmUgcmV0dXJuZWQuXG5jb25zdCBib2lsZXJwbGF0ZURhdGFDYWxsYmFja3MgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuV2ViQXBwSW50ZXJuYWxzLnJlZ2lzdGVyQm9pbGVycGxhdGVEYXRhQ2FsbGJhY2sgPSBmdW5jdGlvbiAoa2V5LCBjYWxsYmFjaykge1xuICBjb25zdCBwcmV2aW91c0NhbGxiYWNrID0gYm9pbGVycGxhdGVEYXRhQ2FsbGJhY2tzW2tleV07XG5cbiAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgYm9pbGVycGxhdGVEYXRhQ2FsbGJhY2tzW2tleV0gPSBjYWxsYmFjaztcbiAgfSBlbHNlIHtcbiAgICBhc3NlcnQuc3RyaWN0RXF1YWwoY2FsbGJhY2ssIG51bGwpO1xuICAgIGRlbGV0ZSBib2lsZXJwbGF0ZURhdGFDYWxsYmFja3Nba2V5XTtcbiAgfVxuXG4gIC8vIFJldHVybiB0aGUgcHJldmlvdXMgY2FsbGJhY2sgaW4gY2FzZSB0aGUgbmV3IGNhbGxiYWNrIG5lZWRzIHRvIGNhbGxcbiAgLy8gaXQ7IGZvciBleGFtcGxlLCB3aGVuIHRoZSBuZXcgY2FsbGJhY2sgaXMgYSB3cmFwcGVyIGZvciB0aGUgb2xkLlxuICByZXR1cm4gcHJldmlvdXNDYWxsYmFjayB8fCBudWxsO1xufTtcblxuLy8gR2l2ZW4gYSByZXF1ZXN0IChhcyByZXR1cm5lZCBmcm9tIGBjYXRlZ29yaXplUmVxdWVzdGApLCByZXR1cm4gdGhlXG4vLyBib2lsZXJwbGF0ZSBIVE1MIHRvIHNlcnZlIGZvciB0aGF0IHJlcXVlc3QuXG4vL1xuLy8gSWYgYSBwcmV2aW91cyBjb25uZWN0IG1pZGRsZXdhcmUgaGFzIHJlbmRlcmVkIGNvbnRlbnQgZm9yIHRoZSBoZWFkIG9yIGJvZHksXG4vLyByZXR1cm5zIHRoZSBib2lsZXJwbGF0ZSB3aXRoIHRoYXQgY29udGVudCBwYXRjaGVkIGluIG90aGVyd2lzZVxuLy8gbWVtb2l6ZXMgb24gSFRNTCBhdHRyaWJ1dGVzICh1c2VkIGJ5LCBlZywgYXBwY2FjaGUpIGFuZCB3aGV0aGVyIGlubGluZVxuLy8gc2NyaXB0cyBhcmUgY3VycmVudGx5IGFsbG93ZWQuXG4vLyBYWFggc28gZmFyIHRoaXMgZnVuY3Rpb24gaXMgYWx3YXlzIGNhbGxlZCB3aXRoIGFyY2ggPT09ICd3ZWIuYnJvd3NlcidcbmZ1bmN0aW9uIGdldEJvaWxlcnBsYXRlKHJlcXVlc3QsIGFyY2gpIHtcbiAgcmV0dXJuIGdldEJvaWxlcnBsYXRlQXN5bmMocmVxdWVzdCwgYXJjaCkuYXdhaXQoKTtcbn1cblxuZnVuY3Rpb24gZ2V0Qm9pbGVycGxhdGVBc3luYyhyZXF1ZXN0LCBhcmNoKSB7XG4gIGNvbnN0IGJvaWxlcnBsYXRlID0gYm9pbGVycGxhdGVCeUFyY2hbYXJjaF07XG4gIGNvbnN0IGRhdGEgPSBPYmplY3QuYXNzaWduKHt9LCBib2lsZXJwbGF0ZS5iYXNlRGF0YSwge1xuICAgIGh0bWxBdHRyaWJ1dGVzOiBnZXRIdG1sQXR0cmlidXRlcyhyZXF1ZXN0KSxcbiAgfSwgXy5waWNrKHJlcXVlc3QsIFwiZHluYW1pY0hlYWRcIiwgXCJkeW5hbWljQm9keVwiKSk7XG5cbiAgbGV0IG1hZGVDaGFuZ2VzID0gZmFsc2U7XG4gIGxldCBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgT2JqZWN0LmtleXMoYm9pbGVycGxhdGVEYXRhQ2FsbGJhY2tzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgcHJvbWlzZSA9IHByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICBjb25zdCBjYWxsYmFjayA9IGJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrc1trZXldO1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKHJlcXVlc3QsIGRhdGEsIGFyY2gpO1xuICAgIH0pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgIC8vIENhbGxiYWNrcyBzaG91bGQgcmV0dXJuIGZhbHNlIGlmIHRoZXkgZGlkIG5vdCBtYWtlIGFueSBjaGFuZ2VzLlxuICAgICAgaWYgKHJlc3VsdCAhPT0gZmFsc2UpIHtcbiAgICAgICAgbWFkZUNoYW5nZXMgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4gcHJvbWlzZS50aGVuKCgpID0+ICh7XG4gICAgc3RyZWFtOiBib2lsZXJwbGF0ZS50b0hUTUxTdHJlYW0oZGF0YSksXG4gICAgc3RhdHVzQ29kZTogZGF0YS5zdGF0dXNDb2RlLFxuICAgIGhlYWRlcnM6IGRhdGEuaGVhZGVycyxcbiAgfSkpO1xufVxuXG5XZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVCb2lsZXJwbGF0ZUluc3RhbmNlID0gZnVuY3Rpb24gKGFyY2gsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRpdGlvbmFsT3B0aW9ucykge1xuICBhZGRpdGlvbmFsT3B0aW9ucyA9IGFkZGl0aW9uYWxPcHRpb25zIHx8IHt9O1xuXG4gIHZhciBydW50aW1lQ29uZmlnID0gXy5leHRlbmQoXG4gICAgXy5jbG9uZShfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fKSxcbiAgICBhZGRpdGlvbmFsT3B0aW9ucy5ydW50aW1lQ29uZmlnT3ZlcnJpZGVzIHx8IHt9XG4gICk7XG5cbiAgcmV0dXJuIG5ldyBCb2lsZXJwbGF0ZShhcmNoLCBtYW5pZmVzdCwgXy5leHRlbmQoe1xuICAgIHBhdGhNYXBwZXIoaXRlbVBhdGgpIHtcbiAgICAgIHJldHVybiBwYXRoSm9pbihhcmNoUGF0aFthcmNoXSwgaXRlbVBhdGgpO1xuICAgIH0sXG4gICAgYmFzZURhdGFFeHRlbnNpb246IHtcbiAgICAgIGFkZGl0aW9uYWxTdGF0aWNKczogXy5tYXAoXG4gICAgICAgIGFkZGl0aW9uYWxTdGF0aWNKcyB8fCBbXSxcbiAgICAgICAgZnVuY3Rpb24gKGNvbnRlbnRzLCBwYXRobmFtZSkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwYXRobmFtZTogcGF0aG5hbWUsXG4gICAgICAgICAgICBjb250ZW50czogY29udGVudHNcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICApLFxuICAgICAgLy8gQ29udmVydCB0byBhIEpTT04gc3RyaW5nLCB0aGVuIGdldCByaWQgb2YgbW9zdCB3ZWlyZCBjaGFyYWN0ZXJzLCB0aGVuXG4gICAgICAvLyB3cmFwIGluIGRvdWJsZSBxdW90ZXMuIChUaGUgb3V0ZXJtb3N0IEpTT04uc3RyaW5naWZ5IHJlYWxseSBvdWdodCB0b1xuICAgICAgLy8ganVzdCBiZSBcIndyYXAgaW4gZG91YmxlIHF1b3Rlc1wiIGJ1dCB3ZSB1c2UgaXQgdG8gYmUgc2FmZS4pIFRoaXMgbWlnaHRcbiAgICAgIC8vIGVuZCB1cCBpbnNpZGUgYSA8c2NyaXB0PiB0YWcgc28gd2UgbmVlZCB0byBiZSBjYXJlZnVsIHRvIG5vdCBpbmNsdWRlXG4gICAgICAvLyBcIjwvc2NyaXB0PlwiLCBidXQgbm9ybWFsIHt7c3BhY2ViYXJzfX0gZXNjYXBpbmcgZXNjYXBlcyB0b28gbXVjaCEgU2VlXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci9pc3N1ZXMvMzczMFxuICAgICAgbWV0ZW9yUnVudGltZUNvbmZpZzogSlNPTi5zdHJpbmdpZnkoXG4gICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChKU09OLnN0cmluZ2lmeShydW50aW1lQ29uZmlnKSkpLFxuICAgICAgcm9vdFVybFBhdGhQcmVmaXg6IF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkxfUEFUSF9QUkVGSVggfHwgJycsXG4gICAgICBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vazogYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2ssXG4gICAgICBzcmlNb2RlOiBzcmlNb2RlLFxuICAgICAgaW5saW5lU2NyaXB0c0FsbG93ZWQ6IFdlYkFwcEludGVybmFscy5pbmxpbmVTY3JpcHRzQWxsb3dlZCgpLFxuICAgICAgaW5saW5lOiBhZGRpdGlvbmFsT3B0aW9ucy5pbmxpbmVcbiAgICB9XG4gIH0sIGFkZGl0aW9uYWxPcHRpb25zKSk7XG59O1xuXG4vLyBBIG1hcHBpbmcgZnJvbSB1cmwgcGF0aCB0byBhcmNoaXRlY3R1cmUgKGUuZy4gXCJ3ZWIuYnJvd3NlclwiKSB0byBzdGF0aWNcbi8vIGZpbGUgaW5mb3JtYXRpb24gd2l0aCB0aGUgZm9sbG93aW5nIGZpZWxkczpcbi8vIC0gdHlwZTogdGhlIHR5cGUgb2YgZmlsZSB0byBiZSBzZXJ2ZWRcbi8vIC0gY2FjaGVhYmxlOiBvcHRpb25hbGx5LCB3aGV0aGVyIHRoZSBmaWxlIHNob3VsZCBiZSBjYWNoZWQgb3Igbm90XG4vLyAtIHNvdXJjZU1hcFVybDogb3B0aW9uYWxseSwgdGhlIHVybCBvZiB0aGUgc291cmNlIG1hcFxuLy9cbi8vIEluZm8gYWxzbyBjb250YWlucyBvbmUgb2YgdGhlIGZvbGxvd2luZzpcbi8vIC0gY29udGVudDogdGhlIHN0cmluZ2lmaWVkIGNvbnRlbnQgdGhhdCBzaG91bGQgYmUgc2VydmVkIGF0IHRoaXMgcGF0aFxuLy8gLSBhYnNvbHV0ZVBhdGg6IHRoZSBhYnNvbHV0ZSBwYXRoIG9uIGRpc2sgdG8gdGhlIGZpbGVcblxuLy8gU2VydmUgc3RhdGljIGZpbGVzIGZyb20gdGhlIG1hbmlmZXN0IG9yIGFkZGVkIHdpdGhcbi8vIGBhZGRTdGF0aWNKc2AuIEV4cG9ydGVkIGZvciB0ZXN0cy5cbldlYkFwcEludGVybmFscy5zdGF0aWNGaWxlc01pZGRsZXdhcmUgPSBhc3luYyBmdW5jdGlvbiAoXG4gIHN0YXRpY0ZpbGVzQnlBcmNoLFxuICByZXEsXG4gIHJlcyxcbiAgbmV4dCxcbikge1xuICBpZiAoJ0dFVCcgIT0gcmVxLm1ldGhvZCAmJiAnSEVBRCcgIT0gcmVxLm1ldGhvZCAmJiAnT1BUSU9OUycgIT0gcmVxLm1ldGhvZCkge1xuICAgIG5leHQoKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIHBhdGhuYW1lID0gcGFyc2VSZXF1ZXN0KHJlcSkucGF0aG5hbWU7XG4gIHRyeSB7XG4gICAgcGF0aG5hbWUgPSBkZWNvZGVVUklDb21wb25lbnQocGF0aG5hbWUpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbmV4dCgpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBzZXJ2ZVN0YXRpY0pzID0gZnVuY3Rpb24gKHMpIHtcbiAgICByZXMud3JpdGVIZWFkKDIwMCwge1xuICAgICAgJ0NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0OyBjaGFyc2V0PVVURi04J1xuICAgIH0pO1xuICAgIHJlcy53cml0ZShzKTtcbiAgICByZXMuZW5kKCk7XG4gIH07XG5cbiAgaWYgKF8uaGFzKGFkZGl0aW9uYWxTdGF0aWNKcywgcGF0aG5hbWUpICYmXG4gICAgICAgICAgICAgICEgV2ViQXBwSW50ZXJuYWxzLmlubGluZVNjcmlwdHNBbGxvd2VkKCkpIHtcbiAgICBzZXJ2ZVN0YXRpY0pzKGFkZGl0aW9uYWxTdGF0aWNKc1twYXRobmFtZV0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHsgYXJjaCwgcGF0aCB9ID0gZ2V0QXJjaEFuZFBhdGgoXG4gICAgcGF0aG5hbWUsXG4gICAgaWRlbnRpZnlCcm93c2VyKHJlcS5oZWFkZXJzW1widXNlci1hZ2VudFwiXSksXG4gICk7XG5cbiAgLy8gSWYgcGF1c2VDbGllbnQoYXJjaCkgaGFzIGJlZW4gY2FsbGVkLCBwcm9ncmFtLnBhdXNlZCB3aWxsIGJlIGFcbiAgLy8gUHJvbWlzZSB0aGF0IHdpbGwgYmUgcmVzb2x2ZWQgd2hlbiB0aGUgcHJvZ3JhbSBpcyB1bnBhdXNlZC5cbiAgY29uc3QgcHJvZ3JhbSA9IFdlYkFwcC5jbGllbnRQcm9ncmFtc1thcmNoXTtcbiAgYXdhaXQgcHJvZ3JhbS5wYXVzZWQ7XG5cbiAgaWYgKHBhdGggPT09IFwiL21ldGVvcl9ydW50aW1lX2NvbmZpZy5qc1wiICYmXG4gICAgICAhIFdlYkFwcEludGVybmFscy5pbmxpbmVTY3JpcHRzQWxsb3dlZCgpKSB7XG4gICAgc2VydmVTdGF0aWNKcyhgX19tZXRlb3JfcnVudGltZV9jb25maWdfXyA9ICR7cHJvZ3JhbS5tZXRlb3JSdW50aW1lQ29uZmlnfTtgKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBpbmZvID0gZ2V0U3RhdGljRmlsZUluZm8oc3RhdGljRmlsZXNCeUFyY2gsIHBhdGhuYW1lLCBwYXRoLCBhcmNoKTtcbiAgaWYgKCEgaW5mbykge1xuICAgIG5leHQoKTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBXZSBkb24ndCBuZWVkIHRvIGNhbGwgcGF1c2UgYmVjYXVzZSwgdW5saWtlICdzdGF0aWMnLCBvbmNlIHdlIGNhbGwgaW50b1xuICAvLyAnc2VuZCcgYW5kIHlpZWxkIHRvIHRoZSBldmVudCBsb29wLCB3ZSBuZXZlciBjYWxsIGFub3RoZXIgaGFuZGxlciB3aXRoXG4gIC8vICduZXh0Jy5cblxuICAvLyBDYWNoZWFibGUgZmlsZXMgYXJlIGZpbGVzIHRoYXQgc2hvdWxkIG5ldmVyIGNoYW5nZS4gVHlwaWNhbGx5XG4gIC8vIG5hbWVkIGJ5IHRoZWlyIGhhc2ggKGVnIG1ldGVvciBidW5kbGVkIGpzIGFuZCBjc3MgZmlsZXMpLlxuICAvLyBXZSBjYWNoZSB0aGVtIH5mb3JldmVyICgxeXIpLlxuICBjb25zdCBtYXhBZ2UgPSBpbmZvLmNhY2hlYWJsZVxuICAgID8gMTAwMCAqIDYwICogNjAgKiAyNCAqIDM2NVxuICAgIDogMDtcblxuICBpZiAoaW5mby5jYWNoZWFibGUpIHtcbiAgICAvLyBTaW5jZSB3ZSB1c2UgcmVxLmhlYWRlcnNbXCJ1c2VyLWFnZW50XCJdIHRvIGRldGVybWluZSB3aGV0aGVyIHRoZVxuICAgIC8vIGNsaWVudCBzaG91bGQgcmVjZWl2ZSBtb2Rlcm4gb3IgbGVnYWN5IHJlc291cmNlcywgdGVsbCB0aGUgY2xpZW50XG4gICAgLy8gdG8gaW52YWxpZGF0ZSBjYWNoZWQgcmVzb3VyY2VzIHdoZW4vaWYgaXRzIHVzZXIgYWdlbnQgc3RyaW5nXG4gICAgLy8gY2hhbmdlcyBpbiB0aGUgZnV0dXJlLlxuICAgIHJlcy5zZXRIZWFkZXIoXCJWYXJ5XCIsIFwiVXNlci1BZ2VudFwiKTtcbiAgfVxuXG4gIC8vIFNldCB0aGUgWC1Tb3VyY2VNYXAgaGVhZGVyLCB3aGljaCBjdXJyZW50IENocm9tZSwgRmlyZUZveCwgYW5kIFNhZmFyaVxuICAvLyB1bmRlcnN0YW5kLiAgKFRoZSBTb3VyY2VNYXAgaGVhZGVyIGlzIHNsaWdodGx5IG1vcmUgc3BlYy1jb3JyZWN0IGJ1dCBGRlxuICAvLyBkb2Vzbid0IHVuZGVyc3RhbmQgaXQuKVxuICAvL1xuICAvLyBZb3UgbWF5IGFsc28gbmVlZCB0byBlbmFibGUgc291cmNlIG1hcHMgaW4gQ2hyb21lOiBvcGVuIGRldiB0b29scywgY2xpY2tcbiAgLy8gdGhlIGdlYXIgaW4gdGhlIGJvdHRvbSByaWdodCBjb3JuZXIsIGFuZCBzZWxlY3QgXCJlbmFibGUgc291cmNlIG1hcHNcIi5cbiAgaWYgKGluZm8uc291cmNlTWFwVXJsKSB7XG4gICAgcmVzLnNldEhlYWRlcignWC1Tb3VyY2VNYXAnLFxuICAgICAgICAgICAgICAgICAgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTF9QQVRIX1BSRUZJWCArXG4gICAgICAgICAgICAgICAgICBpbmZvLnNvdXJjZU1hcFVybCk7XG4gIH1cblxuICBpZiAoaW5mby50eXBlID09PSBcImpzXCIgfHxcbiAgICAgIGluZm8udHlwZSA9PT0gXCJkeW5hbWljIGpzXCIpIHtcbiAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vamF2YXNjcmlwdDsgY2hhcnNldD1VVEYtOFwiKTtcbiAgfSBlbHNlIGlmIChpbmZvLnR5cGUgPT09IFwiY3NzXCIpIHtcbiAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwidGV4dC9jc3M7IGNoYXJzZXQ9VVRGLThcIik7XG4gIH0gZWxzZSBpZiAoaW5mby50eXBlID09PSBcImpzb25cIikge1xuICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PVVURi04XCIpO1xuICB9XG5cbiAgaWYgKGluZm8uaGFzaCkge1xuICAgIHJlcy5zZXRIZWFkZXIoJ0VUYWcnLCAnXCInICsgaW5mby5oYXNoICsgJ1wiJyk7XG4gIH1cblxuICBpZiAoaW5mby5jb250ZW50KSB7XG4gICAgcmVzLndyaXRlKGluZm8uY29udGVudCk7XG4gICAgcmVzLmVuZCgpO1xuICB9IGVsc2Uge1xuICAgIHNlbmQocmVxLCBpbmZvLmFic29sdXRlUGF0aCwge1xuICAgICAgbWF4YWdlOiBtYXhBZ2UsXG4gICAgICBkb3RmaWxlczogJ2FsbG93JywgLy8gaWYgd2Ugc3BlY2lmaWVkIGEgZG90ZmlsZSBpbiB0aGUgbWFuaWZlc3QsIHNlcnZlIGl0XG4gICAgICBsYXN0TW9kaWZpZWQ6IGZhbHNlIC8vIGRvbid0IHNldCBsYXN0LW1vZGlmaWVkIGJhc2VkIG9uIHRoZSBmaWxlIGRhdGVcbiAgICB9KS5vbignZXJyb3InLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICBMb2cuZXJyb3IoXCJFcnJvciBzZXJ2aW5nIHN0YXRpYyBmaWxlIFwiICsgZXJyKTtcbiAgICAgIHJlcy53cml0ZUhlYWQoNTAwKTtcbiAgICAgIHJlcy5lbmQoKTtcbiAgICB9KS5vbignZGlyZWN0b3J5JywgZnVuY3Rpb24gKCkge1xuICAgICAgTG9nLmVycm9yKFwiVW5leHBlY3RlZCBkaXJlY3RvcnkgXCIgKyBpbmZvLmFic29sdXRlUGF0aCk7XG4gICAgICByZXMud3JpdGVIZWFkKDUwMCk7XG4gICAgICByZXMuZW5kKCk7XG4gICAgfSkucGlwZShyZXMpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBnZXRTdGF0aWNGaWxlSW5mbyhzdGF0aWNGaWxlc0J5QXJjaCwgb3JpZ2luYWxQYXRoLCBwYXRoLCBhcmNoKSB7XG4gIGlmICghIGhhc093bi5jYWxsKFdlYkFwcC5jbGllbnRQcm9ncmFtcywgYXJjaCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIEdldCBhIGxpc3Qgb2YgYWxsIGF2YWlsYWJsZSBzdGF0aWMgZmlsZSBhcmNoaXRlY3R1cmVzLCB3aXRoIGFyY2hcbiAgLy8gZmlyc3QgaW4gdGhlIGxpc3QgaWYgaXQgZXhpc3RzLlxuICBjb25zdCBzdGF0aWNBcmNoTGlzdCA9IE9iamVjdC5rZXlzKHN0YXRpY0ZpbGVzQnlBcmNoKTtcbiAgY29uc3QgYXJjaEluZGV4ID0gc3RhdGljQXJjaExpc3QuaW5kZXhPZihhcmNoKTtcbiAgaWYgKGFyY2hJbmRleCA+IDApIHtcbiAgICBzdGF0aWNBcmNoTGlzdC51bnNoaWZ0KHN0YXRpY0FyY2hMaXN0LnNwbGljZShhcmNoSW5kZXgsIDEpWzBdKTtcbiAgfVxuXG4gIGxldCBpbmZvID0gbnVsbDtcblxuICBzdGF0aWNBcmNoTGlzdC5zb21lKGFyY2ggPT4ge1xuICAgIGNvbnN0IHN0YXRpY0ZpbGVzID0gc3RhdGljRmlsZXNCeUFyY2hbYXJjaF07XG5cbiAgICBmdW5jdGlvbiBmaW5hbGl6ZShwYXRoKSB7XG4gICAgICBpbmZvID0gc3RhdGljRmlsZXNbcGF0aF07XG4gICAgICAvLyBTb21ldGltZXMgd2UgcmVnaXN0ZXIgYSBsYXp5IGZ1bmN0aW9uIGluc3RlYWQgb2YgYWN0dWFsIGRhdGEgaW5cbiAgICAgIC8vIHRoZSBzdGF0aWNGaWxlcyBtYW5pZmVzdC5cbiAgICAgIGlmICh0eXBlb2YgaW5mbyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIGluZm8gPSBzdGF0aWNGaWxlc1twYXRoXSA9IGluZm8oKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpbmZvO1xuICAgIH1cblxuICAgIC8vIElmIHN0YXRpY0ZpbGVzIGNvbnRhaW5zIG9yaWdpbmFsUGF0aCB3aXRoIHRoZSBhcmNoIGluZmVycmVkIGFib3ZlLFxuICAgIC8vIHVzZSB0aGF0IGluZm9ybWF0aW9uLlxuICAgIGlmIChoYXNPd24uY2FsbChzdGF0aWNGaWxlcywgb3JpZ2luYWxQYXRoKSkge1xuICAgICAgcmV0dXJuIGZpbmFsaXplKG9yaWdpbmFsUGF0aCk7XG4gICAgfVxuXG4gICAgLy8gSWYgZ2V0QXJjaEFuZFBhdGggcmV0dXJuZWQgYW4gYWx0ZXJuYXRlIHBhdGgsIHRyeSB0aGF0IGluc3RlYWQuXG4gICAgaWYgKHBhdGggIT09IG9yaWdpbmFsUGF0aCAmJlxuICAgICAgICBoYXNPd24uY2FsbChzdGF0aWNGaWxlcywgcGF0aCkpIHtcbiAgICAgIHJldHVybiBmaW5hbGl6ZShwYXRoKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBpbmZvO1xufVxuXG5mdW5jdGlvbiBnZXRBcmNoQW5kUGF0aChwYXRoLCBicm93c2VyKSB7XG4gIGNvbnN0IHBhdGhQYXJ0cyA9IHBhdGguc3BsaXQoXCIvXCIpO1xuICBjb25zdCBhcmNoS2V5ID0gcGF0aFBhcnRzWzFdO1xuXG4gIGlmIChhcmNoS2V5LnN0YXJ0c1dpdGgoXCJfX1wiKSkge1xuICAgIGNvbnN0IGFyY2hDbGVhbmVkID0gXCJ3ZWIuXCIgKyBhcmNoS2V5LnNsaWNlKDIpO1xuICAgIGlmIChoYXNPd24uY2FsbChXZWJBcHAuY2xpZW50UHJvZ3JhbXMsIGFyY2hDbGVhbmVkKSkge1xuICAgICAgcGF0aFBhcnRzLnNwbGljZSgxLCAxKTsgLy8gUmVtb3ZlIHRoZSBhcmNoS2V5IHBhcnQuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBhcmNoOiBhcmNoQ2xlYW5lZCxcbiAgICAgICAgcGF0aDogcGF0aFBhcnRzLmpvaW4oXCIvXCIpLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvLyBUT0RPIFBlcmhhcHMgb25lIGRheSB3ZSBjb3VsZCBpbmZlciBDb3Jkb3ZhIGNsaWVudHMgaGVyZSwgc28gdGhhdCB3ZVxuICAvLyB3b3VsZG4ndCBoYXZlIHRvIHVzZSBwcmVmaXhlZCBcIi9fX2NvcmRvdmEvLi4uXCIgVVJMcy5cbiAgY29uc3QgYXJjaCA9IGlzTW9kZXJuKGJyb3dzZXIpXG4gICAgPyBcIndlYi5icm93c2VyXCJcbiAgICA6IFwid2ViLmJyb3dzZXIubGVnYWN5XCI7XG5cbiAgaWYgKGhhc093bi5jYWxsKFdlYkFwcC5jbGllbnRQcm9ncmFtcywgYXJjaCkpIHtcbiAgICByZXR1cm4geyBhcmNoLCBwYXRoIH07XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGFyY2g6IFdlYkFwcC5kZWZhdWx0QXJjaCxcbiAgICBwYXRoLFxuICB9O1xufVxuXG4vLyBQYXJzZSB0aGUgcGFzc2VkIGluIHBvcnQgdmFsdWUuIFJldHVybiB0aGUgcG9ydCBhcy1pcyBpZiBpdCdzIGEgU3RyaW5nXG4vLyAoZS5nLiBhIFdpbmRvd3MgU2VydmVyIHN0eWxlIG5hbWVkIHBpcGUpLCBvdGhlcndpc2UgcmV0dXJuIHRoZSBwb3J0IGFzIGFuXG4vLyBpbnRlZ2VyLlxuLy9cbi8vIERFUFJFQ0FURUQ6IERpcmVjdCB1c2Ugb2YgdGhpcyBmdW5jdGlvbiBpcyBub3QgcmVjb21tZW5kZWQ7IGl0IGlzIG5vXG4vLyBsb25nZXIgdXNlZCBpbnRlcm5hbGx5LCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIGEgZnV0dXJlIHJlbGVhc2UuXG5XZWJBcHBJbnRlcm5hbHMucGFyc2VQb3J0ID0gcG9ydCA9PiB7XG4gIGxldCBwYXJzZWRQb3J0ID0gcGFyc2VJbnQocG9ydCk7XG4gIGlmIChOdW1iZXIuaXNOYU4ocGFyc2VkUG9ydCkpIHtcbiAgICBwYXJzZWRQb3J0ID0gcG9ydDtcbiAgfVxuICByZXR1cm4gcGFyc2VkUG9ydDtcbn1cblxuaW1wb3J0IHsgb25NZXNzYWdlIH0gZnJvbSBcIm1ldGVvci9pbnRlci1wcm9jZXNzLW1lc3NhZ2luZ1wiO1xuXG5vbk1lc3NhZ2UoXCJ3ZWJhcHAtcGF1c2UtY2xpZW50XCIsIGFzeW5jICh7IGFyY2ggfSkgPT4ge1xuICBXZWJBcHBJbnRlcm5hbHMucGF1c2VDbGllbnQoYXJjaCk7XG59KTtcblxub25NZXNzYWdlKFwid2ViYXBwLXJlbG9hZC1jbGllbnRcIiwgYXN5bmMgKHsgYXJjaCB9KSA9PiB7XG4gIFdlYkFwcEludGVybmFscy5nZW5lcmF0ZUNsaWVudFByb2dyYW0oYXJjaCk7XG59KTtcblxuZnVuY3Rpb24gcnVuV2ViQXBwU2VydmVyKCkge1xuICB2YXIgc2h1dHRpbmdEb3duID0gZmFsc2U7XG4gIHZhciBzeW5jUXVldWUgPSBuZXcgTWV0ZW9yLl9TeW5jaHJvbm91c1F1ZXVlKCk7XG5cbiAgdmFyIGdldEl0ZW1QYXRobmFtZSA9IGZ1bmN0aW9uIChpdGVtVXJsKSB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChwYXJzZVVybChpdGVtVXJsKS5wYXRobmFtZSk7XG4gIH07XG5cbiAgV2ViQXBwSW50ZXJuYWxzLnJlbG9hZENsaWVudFByb2dyYW1zID0gZnVuY3Rpb24gKCkge1xuICAgIHN5bmNRdWV1ZS5ydW5UYXNrKGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3Qgc3RhdGljRmlsZXNCeUFyY2ggPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgICBjb25zdCB7IGNvbmZpZ0pzb24gfSA9IF9fbWV0ZW9yX2Jvb3RzdHJhcF9fO1xuICAgICAgY29uc3QgY2xpZW50QXJjaHMgPSBjb25maWdKc29uLmNsaWVudEFyY2hzIHx8XG4gICAgICAgIE9iamVjdC5rZXlzKGNvbmZpZ0pzb24uY2xpZW50UGF0aHMpO1xuXG4gICAgICB0cnkge1xuICAgICAgICBjbGllbnRBcmNocy5mb3JFYWNoKGFyY2ggPT4ge1xuICAgICAgICAgIGdlbmVyYXRlQ2xpZW50UHJvZ3JhbShhcmNoLCBzdGF0aWNGaWxlc0J5QXJjaCk7XG4gICAgICAgIH0pO1xuICAgICAgICBXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNCeUFyY2ggPSBzdGF0aWNGaWxlc0J5QXJjaDtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgTG9nLmVycm9yKFwiRXJyb3IgcmVsb2FkaW5nIHRoZSBjbGllbnQgcHJvZ3JhbTogXCIgKyBlLnN0YWNrKTtcbiAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIC8vIFBhdXNlIGFueSBpbmNvbWluZyByZXF1ZXN0cyBhbmQgbWFrZSB0aGVtIHdhaXQgZm9yIHRoZSBwcm9ncmFtIHRvIGJlXG4gIC8vIHVucGF1c2VkIHRoZSBuZXh0IHRpbWUgZ2VuZXJhdGVDbGllbnRQcm9ncmFtKGFyY2gpIGlzIGNhbGxlZC5cbiAgV2ViQXBwSW50ZXJuYWxzLnBhdXNlQ2xpZW50ID0gZnVuY3Rpb24gKGFyY2gpIHtcbiAgICBzeW5jUXVldWUucnVuVGFzaygoKSA9PiB7XG4gICAgICBjb25zdCBwcm9ncmFtID0gV2ViQXBwLmNsaWVudFByb2dyYW1zW2FyY2hdO1xuICAgICAgY29uc3QgeyB1bnBhdXNlIH0gPSBwcm9ncmFtO1xuICAgICAgcHJvZ3JhbS5wYXVzZWQgPSBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiB1bnBhdXNlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAvLyBJZiB0aGVyZSBoYXBwZW5zIHRvIGJlIGFuIGV4aXN0aW5nIHByb2dyYW0udW5wYXVzZSBmdW5jdGlvbixcbiAgICAgICAgICAvLyBjb21wb3NlIGl0IHdpdGggdGhlIHJlc29sdmUgZnVuY3Rpb24uXG4gICAgICAgICAgcHJvZ3JhbS51bnBhdXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdW5wYXVzZSgpO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcHJvZ3JhbS51bnBhdXNlID0gcmVzb2x2ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgV2ViQXBwSW50ZXJuYWxzLmdlbmVyYXRlQ2xpZW50UHJvZ3JhbSA9IGZ1bmN0aW9uIChhcmNoKSB7XG4gICAgc3luY1F1ZXVlLnJ1blRhc2soKCkgPT4gZ2VuZXJhdGVDbGllbnRQcm9ncmFtKGFyY2gpKTtcbiAgfTtcblxuICBmdW5jdGlvbiBnZW5lcmF0ZUNsaWVudFByb2dyYW0oXG4gICAgYXJjaCxcbiAgICBzdGF0aWNGaWxlc0J5QXJjaCA9IFdlYkFwcEludGVybmFscy5zdGF0aWNGaWxlc0J5QXJjaCxcbiAgKSB7XG4gICAgY29uc3QgY2xpZW50RGlyID0gcGF0aEpvaW4oXG4gICAgICBwYXRoRGlybmFtZShfX21ldGVvcl9ib290c3RyYXBfXy5zZXJ2ZXJEaXIpLFxuICAgICAgYXJjaCxcbiAgICApO1xuXG4gICAgLy8gcmVhZCB0aGUgY29udHJvbCBmb3IgdGhlIGNsaWVudCB3ZSdsbCBiZSBzZXJ2aW5nIHVwXG4gICAgY29uc3QgcHJvZ3JhbUpzb25QYXRoID0gcGF0aEpvaW4oY2xpZW50RGlyLCBcInByb2dyYW0uanNvblwiKTtcblxuICAgIGxldCBwcm9ncmFtSnNvbjtcbiAgICB0cnkge1xuICAgICAgcHJvZ3JhbUpzb24gPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwcm9ncmFtSnNvblBhdGgpKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZS5jb2RlID09PSBcIkVOT0VOVFwiKSByZXR1cm47XG4gICAgICB0aHJvdyBlO1xuICAgIH1cblxuICAgIGlmIChwcm9ncmFtSnNvbi5mb3JtYXQgIT09IFwid2ViLXByb2dyYW0tcHJlMVwiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbnN1cHBvcnRlZCBmb3JtYXQgZm9yIGNsaWVudCBhc3NldHM6IFwiICtcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShwcm9ncmFtSnNvbi5mb3JtYXQpKTtcbiAgICB9XG5cbiAgICBpZiAoISBwcm9ncmFtSnNvblBhdGggfHwgISBjbGllbnREaXIgfHwgISBwcm9ncmFtSnNvbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2xpZW50IGNvbmZpZyBmaWxlIG5vdCBwYXJzZWQuXCIpO1xuICAgIH1cblxuICAgIGFyY2hQYXRoW2FyY2hdID0gY2xpZW50RGlyO1xuICAgIGNvbnN0IHN0YXRpY0ZpbGVzID0gc3RhdGljRmlsZXNCeUFyY2hbYXJjaF0gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgY29uc3QgeyBtYW5pZmVzdCB9ID0gcHJvZ3JhbUpzb247XG4gICAgbWFuaWZlc3QuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgIGlmIChpdGVtLnVybCAmJiBpdGVtLndoZXJlID09PSBcImNsaWVudFwiKSB7XG4gICAgICAgIHN0YXRpY0ZpbGVzW2dldEl0ZW1QYXRobmFtZShpdGVtLnVybCldID0ge1xuICAgICAgICAgIGFic29sdXRlUGF0aDogcGF0aEpvaW4oY2xpZW50RGlyLCBpdGVtLnBhdGgpLFxuICAgICAgICAgIGNhY2hlYWJsZTogaXRlbS5jYWNoZWFibGUsXG4gICAgICAgICAgaGFzaDogaXRlbS5oYXNoLFxuICAgICAgICAgIC8vIExpbmsgZnJvbSBzb3VyY2UgdG8gaXRzIG1hcFxuICAgICAgICAgIHNvdXJjZU1hcFVybDogaXRlbS5zb3VyY2VNYXBVcmwsXG4gICAgICAgICAgdHlwZTogaXRlbS50eXBlXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGl0ZW0uc291cmNlTWFwKSB7XG4gICAgICAgICAgLy8gU2VydmUgdGhlIHNvdXJjZSBtYXAgdG9vLCB1bmRlciB0aGUgc3BlY2lmaWVkIFVSTC4gV2UgYXNzdW1lXG4gICAgICAgICAgLy8gYWxsIHNvdXJjZSBtYXBzIGFyZSBjYWNoZWFibGUuXG4gICAgICAgICAgc3RhdGljRmlsZXNbZ2V0SXRlbVBhdGhuYW1lKGl0ZW0uc291cmNlTWFwVXJsKV0gPSB7XG4gICAgICAgICAgICBhYnNvbHV0ZVBhdGg6IHBhdGhKb2luKGNsaWVudERpciwgaXRlbS5zb3VyY2VNYXApLFxuICAgICAgICAgICAgY2FjaGVhYmxlOiB0cnVlXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgeyBQVUJMSUNfU0VUVElOR1MgfSA9IF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX187XG4gICAgY29uc3QgY29uZmlnT3ZlcnJpZGVzID0ge1xuICAgICAgUFVCTElDX1NFVFRJTkdTLFxuICAgIH07XG5cbiAgICBjb25zdCBvbGRQcm9ncmFtID0gV2ViQXBwLmNsaWVudFByb2dyYW1zW2FyY2hdO1xuICAgIGNvbnN0IG5ld1Byb2dyYW0gPSBXZWJBcHAuY2xpZW50UHJvZ3JhbXNbYXJjaF0gPSB7XG4gICAgICBmb3JtYXQ6IFwid2ViLXByb2dyYW0tcHJlMVwiLFxuICAgICAgbWFuaWZlc3Q6IG1hbmlmZXN0LFxuICAgICAgLy8gVXNlIGFycm93IGZ1bmN0aW9ucyBzbyB0aGF0IHRoZXNlIHZlcnNpb25zIGNhbiBiZSBsYXppbHlcbiAgICAgIC8vIGNhbGN1bGF0ZWQgbGF0ZXIsIGFuZCBzbyB0aGF0IHRoZXkgd2lsbCBub3QgYmUgaW5jbHVkZWQgaW4gdGhlXG4gICAgICAvLyBzdGF0aWNGaWxlc1ttYW5pZmVzdFVybF0uY29udGVudCBzdHJpbmcgYmVsb3cuXG4gICAgICAvL1xuICAgICAgLy8gTm90ZTogdGhlc2UgdmVyc2lvbiBjYWxjdWxhdGlvbnMgbXVzdCBiZSBrZXB0IGluIGFncmVlbWVudCB3aXRoXG4gICAgICAvLyBDb3Jkb3ZhQnVpbGRlciNhcHBlbmRWZXJzaW9uIGluIHRvb2xzL2NvcmRvdmEvYnVpbGRlci5qcywgb3IgaG90XG4gICAgICAvLyBjb2RlIHB1c2ggd2lsbCByZWxvYWQgQ29yZG92YSBhcHBzIHVubmVjZXNzYXJpbHkuXG4gICAgICB2ZXJzaW9uOiAoKSA9PiBXZWJBcHBIYXNoaW5nLmNhbGN1bGF0ZUNsaWVudEhhc2goXG4gICAgICAgIG1hbmlmZXN0LCBudWxsLCBjb25maWdPdmVycmlkZXMpLFxuICAgICAgdmVyc2lvblJlZnJlc2hhYmxlOiAoKSA9PiBXZWJBcHBIYXNoaW5nLmNhbGN1bGF0ZUNsaWVudEhhc2goXG4gICAgICAgIG1hbmlmZXN0LCB0eXBlID0+IHR5cGUgPT09IFwiY3NzXCIsIGNvbmZpZ092ZXJyaWRlcyksXG4gICAgICB2ZXJzaW9uTm9uUmVmcmVzaGFibGU6ICgpID0+IFdlYkFwcEhhc2hpbmcuY2FsY3VsYXRlQ2xpZW50SGFzaChcbiAgICAgICAgbWFuaWZlc3QsIHR5cGUgPT4gdHlwZSAhPT0gXCJjc3NcIiwgY29uZmlnT3ZlcnJpZGVzKSxcbiAgICAgIGNvcmRvdmFDb21wYXRpYmlsaXR5VmVyc2lvbnM6IHByb2dyYW1Kc29uLmNvcmRvdmFDb21wYXRpYmlsaXR5VmVyc2lvbnMsXG4gICAgICBQVUJMSUNfU0VUVElOR1MsXG4gICAgfTtcblxuICAgIC8vIEV4cG9zZSBwcm9ncmFtIGRldGFpbHMgYXMgYSBzdHJpbmcgcmVhY2hhYmxlIHZpYSB0aGUgZm9sbG93aW5nIFVSTC5cbiAgICBjb25zdCBtYW5pZmVzdFVybFByZWZpeCA9IFwiL19fXCIgKyBhcmNoLnJlcGxhY2UoL153ZWJcXC4vLCBcIlwiKTtcbiAgICBjb25zdCBtYW5pZmVzdFVybCA9IG1hbmlmZXN0VXJsUHJlZml4ICsgZ2V0SXRlbVBhdGhuYW1lKFwiL21hbmlmZXN0Lmpzb25cIik7XG5cbiAgICBzdGF0aWNGaWxlc1ttYW5pZmVzdFVybF0gPSAoKSA9PiB7XG4gICAgICBpZiAoUGFja2FnZS5hdXRvdXBkYXRlKSB7XG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICBBVVRPVVBEQVRFX1ZFUlNJT04gPVxuICAgICAgICAgICAgUGFja2FnZS5hdXRvdXBkYXRlLkF1dG91cGRhdGUuYXV0b3VwZGF0ZVZlcnNpb25cbiAgICAgICAgfSA9IHByb2Nlc3MuZW52O1xuXG4gICAgICAgIGlmIChBVVRPVVBEQVRFX1ZFUlNJT04pIHtcbiAgICAgICAgICBuZXdQcm9ncmFtLnZlcnNpb24gPSBBVVRPVVBEQVRFX1ZFUlNJT047XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBuZXdQcm9ncmFtLnZlcnNpb24gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBuZXdQcm9ncmFtLnZlcnNpb24gPSBuZXdQcm9ncmFtLnZlcnNpb24oKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY29udGVudDogSlNPTi5zdHJpbmdpZnkobmV3UHJvZ3JhbSksXG4gICAgICAgIGNhY2hlYWJsZTogZmFsc2UsXG4gICAgICAgIGhhc2g6IG5ld1Byb2dyYW0udmVyc2lvbixcbiAgICAgICAgdHlwZTogXCJqc29uXCJcbiAgICAgIH07XG4gICAgfTtcblxuICAgIGdlbmVyYXRlQm9pbGVycGxhdGVGb3JBcmNoKGFyY2gpO1xuXG4gICAgLy8gSWYgdGhlcmUgYXJlIGFueSByZXF1ZXN0cyB3YWl0aW5nIG9uIG9sZFByb2dyYW0ucGF1c2VkLCBsZXQgdGhlbVxuICAgIC8vIGNvbnRpbnVlIG5vdyAodXNpbmcgdGhlIG5ldyBwcm9ncmFtKS5cbiAgICBpZiAob2xkUHJvZ3JhbSAmJlxuICAgICAgICBvbGRQcm9ncmFtLnBhdXNlZCkge1xuICAgICAgb2xkUHJvZ3JhbS51bnBhdXNlKCk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGRlZmF1bHRPcHRpb25zRm9yQXJjaCA9IHtcbiAgICAnd2ViLmNvcmRvdmEnOiB7XG4gICAgICBydW50aW1lQ29uZmlnT3ZlcnJpZGVzOiB7XG4gICAgICAgIC8vIFhYWCBXZSB1c2UgYWJzb2x1dGVVcmwoKSBoZXJlIHNvIHRoYXQgd2Ugc2VydmUgaHR0cHM6Ly9cbiAgICAgICAgLy8gVVJMcyB0byBjb3Jkb3ZhIGNsaWVudHMgaWYgZm9yY2Utc3NsIGlzIGluIHVzZS4gSWYgd2Ugd2VyZVxuICAgICAgICAvLyB0byB1c2UgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTCBpbnN0ZWFkIG9mXG4gICAgICAgIC8vIGFic29sdXRlVXJsKCksIHRoZW4gQ29yZG92YSBjbGllbnRzIHdvdWxkIGltbWVkaWF0ZWx5IGdldCBhXG4gICAgICAgIC8vIEhDUCBzZXR0aW5nIHRoZWlyIEREUF9ERUZBVUxUX0NPTk5FQ1RJT05fVVJMIHRvXG4gICAgICAgIC8vIGh0dHA6Ly9leGFtcGxlLm1ldGVvci5jb20uIFRoaXMgYnJlYWtzIHRoZSBhcHAsIGJlY2F1c2VcbiAgICAgICAgLy8gZm9yY2Utc3NsIGRvZXNuJ3Qgc2VydmUgQ09SUyBoZWFkZXJzIG9uIDMwMlxuICAgICAgICAvLyByZWRpcmVjdHMuIChQbHVzIGl0J3MgdW5kZXNpcmFibGUgdG8gaGF2ZSBjbGllbnRzXG4gICAgICAgIC8vIGNvbm5lY3RpbmcgdG8gaHR0cDovL2V4YW1wbGUubWV0ZW9yLmNvbSB3aGVuIGZvcmNlLXNzbCBpc1xuICAgICAgICAvLyBpbiB1c2UuKVxuICAgICAgICBERFBfREVGQVVMVF9DT05ORUNUSU9OX1VSTDogcHJvY2Vzcy5lbnYuTU9CSUxFX0REUF9VUkwgfHxcbiAgICAgICAgICBNZXRlb3IuYWJzb2x1dGVVcmwoKSxcbiAgICAgICAgUk9PVF9VUkw6IHByb2Nlc3MuZW52Lk1PQklMRV9ST09UX1VSTCB8fFxuICAgICAgICAgIE1ldGVvci5hYnNvbHV0ZVVybCgpXG4gICAgICB9XG4gICAgfSxcblxuICAgIFwid2ViLmJyb3dzZXJcIjoge1xuICAgICAgcnVudGltZUNvbmZpZ092ZXJyaWRlczoge1xuICAgICAgICBpc01vZGVybjogdHJ1ZSxcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgXCJ3ZWIuYnJvd3Nlci5sZWdhY3lcIjoge1xuICAgICAgcnVudGltZUNvbmZpZ092ZXJyaWRlczoge1xuICAgICAgICBpc01vZGVybjogZmFsc2UsXG4gICAgICB9XG4gICAgfSxcbiAgfTtcblxuICBXZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVCb2lsZXJwbGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBUaGlzIGJvaWxlcnBsYXRlIHdpbGwgYmUgc2VydmVkIHRvIHRoZSBtb2JpbGUgZGV2aWNlcyB3aGVuIHVzZWQgd2l0aFxuICAgIC8vIE1ldGVvci9Db3Jkb3ZhIGZvciB0aGUgSG90LUNvZGUgUHVzaCBhbmQgc2luY2UgdGhlIGZpbGUgd2lsbCBiZSBzZXJ2ZWQgYnlcbiAgICAvLyB0aGUgZGV2aWNlJ3Mgc2VydmVyLCBpdCBpcyBpbXBvcnRhbnQgdG8gc2V0IHRoZSBERFAgdXJsIHRvIHRoZSBhY3R1YWxcbiAgICAvLyBNZXRlb3Igc2VydmVyIGFjY2VwdGluZyBERFAgY29ubmVjdGlvbnMgYW5kIG5vdCB0aGUgZGV2aWNlJ3MgZmlsZSBzZXJ2ZXIuXG4gICAgc3luY1F1ZXVlLnJ1blRhc2soZnVuY3Rpb24oKSB7XG4gICAgICBPYmplY3Qua2V5cyhXZWJBcHAuY2xpZW50UHJvZ3JhbXMpXG4gICAgICAgIC5mb3JFYWNoKGdlbmVyYXRlQm9pbGVycGxhdGVGb3JBcmNoKTtcbiAgICB9KTtcbiAgfTtcblxuICBmdW5jdGlvbiBnZW5lcmF0ZUJvaWxlcnBsYXRlRm9yQXJjaChhcmNoKSB7XG4gICAgY29uc3QgcHJvZ3JhbSA9IFdlYkFwcC5jbGllbnRQcm9ncmFtc1thcmNoXTtcbiAgICBjb25zdCBhZGRpdGlvbmFsT3B0aW9ucyA9IGRlZmF1bHRPcHRpb25zRm9yQXJjaFthcmNoXSB8fCB7fTtcbiAgICBjb25zdCB7IGJhc2VEYXRhIH0gPSBib2lsZXJwbGF0ZUJ5QXJjaFthcmNoXSA9XG4gICAgICBXZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVCb2lsZXJwbGF0ZUluc3RhbmNlKFxuICAgICAgICBhcmNoLFxuICAgICAgICBwcm9ncmFtLm1hbmlmZXN0LFxuICAgICAgICBhZGRpdGlvbmFsT3B0aW9ucyxcbiAgICAgICk7XG4gICAgLy8gV2UgbmVlZCB0aGUgcnVudGltZSBjb25maWcgd2l0aCBvdmVycmlkZXMgZm9yIG1ldGVvcl9ydW50aW1lX2NvbmZpZy5qczpcbiAgICBwcm9ncmFtLm1ldGVvclJ1bnRpbWVDb25maWcgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAuLi5fX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLFxuICAgICAgLi4uKGFkZGl0aW9uYWxPcHRpb25zLnJ1bnRpbWVDb25maWdPdmVycmlkZXMgfHwgbnVsbCksXG4gICAgfSk7XG4gICAgcHJvZ3JhbS5yZWZyZXNoYWJsZUFzc2V0cyA9IGJhc2VEYXRhLmNzcy5tYXAoZmlsZSA9PiAoe1xuICAgICAgdXJsOiBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayhmaWxlLnVybCksXG4gICAgfSkpO1xuICB9XG5cbiAgV2ViQXBwSW50ZXJuYWxzLnJlbG9hZENsaWVudFByb2dyYW1zKCk7XG5cbiAgLy8gd2Vic2VydmVyXG4gIHZhciBhcHAgPSBjb25uZWN0KCk7XG5cbiAgLy8gUGFja2FnZXMgYW5kIGFwcHMgY2FuIGFkZCBoYW5kbGVycyB0aGF0IHJ1biBiZWZvcmUgYW55IG90aGVyIE1ldGVvclxuICAvLyBoYW5kbGVycyB2aWEgV2ViQXBwLnJhd0Nvbm5lY3RIYW5kbGVycy5cbiAgdmFyIHJhd0Nvbm5lY3RIYW5kbGVycyA9IGNvbm5lY3QoKTtcbiAgYXBwLnVzZShyYXdDb25uZWN0SGFuZGxlcnMpO1xuXG4gIC8vIEF1dG8tY29tcHJlc3MgYW55IGpzb24sIGphdmFzY3JpcHQsIG9yIHRleHQuXG4gIGFwcC51c2UoY29tcHJlc3Moe2ZpbHRlcjogc2hvdWxkQ29tcHJlc3N9KSk7XG5cbiAgLy8gcGFyc2UgY29va2llcyBpbnRvIGFuIG9iamVjdFxuICBhcHAudXNlKGNvb2tpZVBhcnNlcigpKTtcblxuICAvLyBXZSdyZSBub3QgYSBwcm94eTsgcmVqZWN0ICh3aXRob3V0IGNyYXNoaW5nKSBhdHRlbXB0cyB0byB0cmVhdCB1cyBsaWtlXG4gIC8vIG9uZS4gKFNlZSAjMTIxMi4pXG4gIGFwcC51c2UoZnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHtcbiAgICBpZiAoUm91dGVQb2xpY3kuaXNWYWxpZFVybChyZXEudXJsKSkge1xuICAgICAgbmV4dCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgcmVzLndyaXRlKFwiTm90IGEgcHJveHlcIik7XG4gICAgcmVzLmVuZCgpO1xuICB9KTtcblxuICAvLyBQYXJzZSB0aGUgcXVlcnkgc3RyaW5nIGludG8gcmVzLnF1ZXJ5LiBVc2VkIGJ5IG9hdXRoX3NlcnZlciwgYnV0IGl0J3NcbiAgLy8gZ2VuZXJhbGx5IHByZXR0eSBoYW5keS4uXG4gIC8vXG4gIC8vIERvIHRoaXMgYmVmb3JlIHRoZSBuZXh0IG1pZGRsZXdhcmUgZGVzdHJveXMgcmVxLnVybCBpZiBhIHBhdGggcHJlZml4XG4gIC8vIGlzIHNldCB0byBjbG9zZSAjMTAxMTEuXG4gIGFwcC51c2UocXVlcnkoKSk7XG5cbiAgZnVuY3Rpb24gZ2V0UGF0aFBhcnRzKHBhdGgpIHtcbiAgICBjb25zdCBwYXJ0cyA9IHBhdGguc3BsaXQoXCIvXCIpO1xuICAgIHdoaWxlIChwYXJ0c1swXSA9PT0gXCJcIikgcGFydHMuc2hpZnQoKTtcbiAgICByZXR1cm4gcGFydHM7XG4gIH1cblxuICBmdW5jdGlvbiBpc1ByZWZpeE9mKHByZWZpeCwgYXJyYXkpIHtcbiAgICByZXR1cm4gcHJlZml4Lmxlbmd0aCA8PSBhcnJheS5sZW5ndGggJiZcbiAgICAgIHByZWZpeC5ldmVyeSgocGFydCwgaSkgPT4gcGFydCA9PT0gYXJyYXlbaV0pO1xuICB9XG5cbiAgLy8gU3RyaXAgb2ZmIHRoZSBwYXRoIHByZWZpeCwgaWYgaXQgZXhpc3RzLlxuICBhcHAudXNlKGZ1bmN0aW9uIChyZXF1ZXN0LCByZXNwb25zZSwgbmV4dCkge1xuICAgIGNvbnN0IHBhdGhQcmVmaXggPSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYO1xuICAgIGNvbnN0IHsgcGF0aG5hbWUgfSA9IHBhcnNlVXJsKHJlcXVlc3QudXJsKTtcblxuICAgIC8vIGNoZWNrIGlmIHRoZSBwYXRoIGluIHRoZSB1cmwgc3RhcnRzIHdpdGggdGhlIHBhdGggcHJlZml4XG4gICAgaWYgKHBhdGhQcmVmaXgpIHtcbiAgICAgIGNvbnN0IHByZWZpeFBhcnRzID0gZ2V0UGF0aFBhcnRzKHBhdGhQcmVmaXgpO1xuICAgICAgY29uc3QgcGF0aFBhcnRzID0gZ2V0UGF0aFBhcnRzKHBhdGhuYW1lKTtcbiAgICAgIGlmIChpc1ByZWZpeE9mKHByZWZpeFBhcnRzLCBwYXRoUGFydHMpKSB7XG4gICAgICAgIHJlcXVlc3QudXJsID0gXCIvXCIgKyBwYXRoUGFydHMuc2xpY2UocHJlZml4UGFydHMubGVuZ3RoKS5qb2luKFwiL1wiKTtcbiAgICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocGF0aG5hbWUgPT09IFwiL2Zhdmljb24uaWNvXCIgfHxcbiAgICAgICAgcGF0aG5hbWUgPT09IFwiL3JvYm90cy50eHRcIikge1xuICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICB9XG5cbiAgICBpZiAocGF0aFByZWZpeCkge1xuICAgICAgcmVzcG9uc2Uud3JpdGVIZWFkKDQwNCk7XG4gICAgICByZXNwb25zZS53cml0ZShcIlVua25vd24gcGF0aFwiKTtcbiAgICAgIHJlc3BvbnNlLmVuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIG5leHQoKTtcbiAgfSk7XG5cbiAgLy8gU2VydmUgc3RhdGljIGZpbGVzIGZyb20gdGhlIG1hbmlmZXN0LlxuICAvLyBUaGlzIGlzIGluc3BpcmVkIGJ5IHRoZSAnc3RhdGljJyBtaWRkbGV3YXJlLlxuICBhcHAudXNlKGZ1bmN0aW9uIChyZXEsIHJlcywgbmV4dCkge1xuICAgIFdlYkFwcEludGVybmFscy5zdGF0aWNGaWxlc01pZGRsZXdhcmUoXG4gICAgICBXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNCeUFyY2gsXG4gICAgICByZXEsIHJlcywgbmV4dFxuICAgICk7XG4gIH0pO1xuXG4gIC8vIENvcmUgTWV0ZW9yIHBhY2thZ2VzIGxpa2UgZHluYW1pYy1pbXBvcnQgY2FuIGFkZCBoYW5kbGVycyBiZWZvcmVcbiAgLy8gb3RoZXIgaGFuZGxlcnMgYWRkZWQgYnkgcGFja2FnZSBhbmQgYXBwbGljYXRpb24gY29kZS5cbiAgYXBwLnVzZShXZWJBcHBJbnRlcm5hbHMubWV0ZW9ySW50ZXJuYWxIYW5kbGVycyA9IGNvbm5lY3QoKSk7XG5cbiAgLy8gUGFja2FnZXMgYW5kIGFwcHMgY2FuIGFkZCBoYW5kbGVycyB0byB0aGlzIHZpYSBXZWJBcHAuY29ubmVjdEhhbmRsZXJzLlxuICAvLyBUaGV5IGFyZSBpbnNlcnRlZCBiZWZvcmUgb3VyIGRlZmF1bHQgaGFuZGxlci5cbiAgdmFyIHBhY2thZ2VBbmRBcHBIYW5kbGVycyA9IGNvbm5lY3QoKTtcbiAgYXBwLnVzZShwYWNrYWdlQW5kQXBwSGFuZGxlcnMpO1xuXG4gIHZhciBzdXBwcmVzc0Nvbm5lY3RFcnJvcnMgPSBmYWxzZTtcbiAgLy8gY29ubmVjdCBrbm93cyBpdCBpcyBhbiBlcnJvciBoYW5kbGVyIGJlY2F1c2UgaXQgaGFzIDQgYXJndW1lbnRzIGluc3RlYWQgb2ZcbiAgLy8gMy4gZ28gZmlndXJlLiAgKEl0IGlzIG5vdCBzbWFydCBlbm91Z2ggdG8gZmluZCBzdWNoIGEgdGhpbmcgaWYgaXQncyBoaWRkZW5cbiAgLy8gaW5zaWRlIHBhY2thZ2VBbmRBcHBIYW5kbGVycy4pXG4gIGFwcC51c2UoZnVuY3Rpb24gKGVyciwgcmVxLCByZXMsIG5leHQpIHtcbiAgICBpZiAoIWVyciB8fCAhc3VwcHJlc3NDb25uZWN0RXJyb3JzIHx8ICFyZXEuaGVhZGVyc1sneC1zdXBwcmVzcy1lcnJvciddKSB7XG4gICAgICBuZXh0KGVycik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJlcy53cml0ZUhlYWQoZXJyLnN0YXR1cywgeyAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW4nIH0pO1xuICAgIHJlcy5lbmQoXCJBbiBlcnJvciBtZXNzYWdlXCIpO1xuICB9KTtcblxuICBhcHAudXNlKGFzeW5jIGZ1bmN0aW9uIChyZXEsIHJlcywgbmV4dCkge1xuICAgIGlmICghIGFwcFVybChyZXEudXJsKSkge1xuICAgICAgcmV0dXJuIG5leHQoKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgaGVhZGVycyA9IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L2h0bWw7IGNoYXJzZXQ9dXRmLTgnXG4gICAgICB9O1xuXG4gICAgICBpZiAoc2h1dHRpbmdEb3duKSB7XG4gICAgICAgIGhlYWRlcnNbJ0Nvbm5lY3Rpb24nXSA9ICdDbG9zZSc7XG4gICAgICB9XG5cbiAgICAgIHZhciByZXF1ZXN0ID0gV2ViQXBwLmNhdGVnb3JpemVSZXF1ZXN0KHJlcSk7XG5cbiAgICAgIGlmIChyZXF1ZXN0LnVybC5xdWVyeSAmJiByZXF1ZXN0LnVybC5xdWVyeVsnbWV0ZW9yX2Nzc19yZXNvdXJjZSddKSB7XG4gICAgICAgIC8vIEluIHRoaXMgY2FzZSwgd2UncmUgcmVxdWVzdGluZyBhIENTUyByZXNvdXJjZSBpbiB0aGUgbWV0ZW9yLXNwZWNpZmljXG4gICAgICAgIC8vIHdheSwgYnV0IHdlIGRvbid0IGhhdmUgaXQuICBTZXJ2ZSBhIHN0YXRpYyBjc3MgZmlsZSB0aGF0IGluZGljYXRlcyB0aGF0XG4gICAgICAgIC8vIHdlIGRpZG4ndCBoYXZlIGl0LCBzbyB3ZSBjYW4gZGV0ZWN0IHRoYXQgYW5kIHJlZnJlc2guICBNYWtlIHN1cmVcbiAgICAgICAgLy8gdGhhdCBhbnkgcHJveGllcyBvciBDRE5zIGRvbid0IGNhY2hlIHRoaXMgZXJyb3IhICAoTm9ybWFsbHkgcHJveGllc1xuICAgICAgICAvLyBvciBDRE5zIGFyZSBzbWFydCBlbm91Z2ggbm90IHRvIGNhY2hlIGVycm9yIHBhZ2VzLCBidXQgaW4gb3JkZXIgdG9cbiAgICAgICAgLy8gbWFrZSB0aGlzIGhhY2sgd29yaywgd2UgbmVlZCB0byByZXR1cm4gdGhlIENTUyBmaWxlIGFzIGEgMjAwLCB3aGljaFxuICAgICAgICAvLyB3b3VsZCBvdGhlcndpc2UgYmUgY2FjaGVkLilcbiAgICAgICAgaGVhZGVyc1snQ29udGVudC1UeXBlJ10gPSAndGV4dC9jc3M7IGNoYXJzZXQ9dXRmLTgnO1xuICAgICAgICBoZWFkZXJzWydDYWNoZS1Db250cm9sJ10gPSAnbm8tY2FjaGUnO1xuICAgICAgICByZXMud3JpdGVIZWFkKDIwMCwgaGVhZGVycyk7XG4gICAgICAgIHJlcy53cml0ZShcIi5tZXRlb3ItY3NzLW5vdC1mb3VuZC1lcnJvciB7IHdpZHRoOiAwcHg7fVwiKTtcbiAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXF1ZXN0LnVybC5xdWVyeSAmJiByZXF1ZXN0LnVybC5xdWVyeVsnbWV0ZW9yX2pzX3Jlc291cmNlJ10pIHtcbiAgICAgICAgLy8gU2ltaWxhcmx5LCB3ZSdyZSByZXF1ZXN0aW5nIGEgSlMgcmVzb3VyY2UgdGhhdCB3ZSBkb24ndCBoYXZlLlxuICAgICAgICAvLyBTZXJ2ZSBhbiB1bmNhY2hlZCA0MDQuIChXZSBjYW4ndCB1c2UgdGhlIHNhbWUgaGFjayB3ZSB1c2UgZm9yIENTUyxcbiAgICAgICAgLy8gYmVjYXVzZSBhY3R1YWxseSBhY3Rpbmcgb24gdGhhdCBoYWNrIHJlcXVpcmVzIHVzIHRvIGhhdmUgdGhlIEpTXG4gICAgICAgIC8vIGFscmVhZHkhKVxuICAgICAgICBoZWFkZXJzWydDYWNoZS1Db250cm9sJ10gPSAnbm8tY2FjaGUnO1xuICAgICAgICByZXMud3JpdGVIZWFkKDQwNCwgaGVhZGVycyk7XG4gICAgICAgIHJlcy5lbmQoXCI0MDQgTm90IEZvdW5kXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXF1ZXN0LnVybC5xdWVyeSAmJiByZXF1ZXN0LnVybC5xdWVyeVsnbWV0ZW9yX2RvbnRfc2VydmVfaW5kZXgnXSkge1xuICAgICAgICAvLyBXaGVuIGRvd25sb2FkaW5nIGZpbGVzIGR1cmluZyBhIENvcmRvdmEgaG90IGNvZGUgcHVzaCwgd2UgbmVlZFxuICAgICAgICAvLyB0byBkZXRlY3QgaWYgYSBmaWxlIGlzIG5vdCBhdmFpbGFibGUgaW5zdGVhZCBvZiBpbmFkdmVydGVudGx5XG4gICAgICAgIC8vIGRvd25sb2FkaW5nIHRoZSBkZWZhdWx0IGluZGV4IHBhZ2UuXG4gICAgICAgIC8vIFNvIHNpbWlsYXIgdG8gdGhlIHNpdHVhdGlvbiBhYm92ZSwgd2Ugc2VydmUgYW4gdW5jYWNoZWQgNDA0LlxuICAgICAgICBoZWFkZXJzWydDYWNoZS1Db250cm9sJ10gPSAnbm8tY2FjaGUnO1xuICAgICAgICByZXMud3JpdGVIZWFkKDQwNCwgaGVhZGVycyk7XG4gICAgICAgIHJlcy5lbmQoXCI0MDQgTm90IEZvdW5kXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHsgYXJjaCB9ID0gZ2V0QXJjaEFuZFBhdGgoXG4gICAgICAgIHBhcnNlUmVxdWVzdChyZXEpLnBhdGhuYW1lLFxuICAgICAgICByZXF1ZXN0LmJyb3dzZXIsXG4gICAgICApO1xuXG4gICAgICAvLyBJZiBwYXVzZUNsaWVudChhcmNoKSBoYXMgYmVlbiBjYWxsZWQsIHByb2dyYW0ucGF1c2VkIHdpbGwgYmUgYVxuICAgICAgLy8gUHJvbWlzZSB0aGF0IHdpbGwgYmUgcmVzb2x2ZWQgd2hlbiB0aGUgcHJvZ3JhbSBpcyB1bnBhdXNlZC5cbiAgICAgIGF3YWl0IFdlYkFwcC5jbGllbnRQcm9ncmFtc1thcmNoXS5wYXVzZWQ7XG5cbiAgICAgIHJldHVybiBnZXRCb2lsZXJwbGF0ZUFzeW5jKHJlcXVlc3QsIGFyY2gpLnRoZW4oKHtcbiAgICAgICAgc3RyZWFtLFxuICAgICAgICBzdGF0dXNDb2RlLFxuICAgICAgICBoZWFkZXJzOiBuZXdIZWFkZXJzLFxuICAgICAgfSkgPT4ge1xuICAgICAgICBpZiAoIXN0YXR1c0NvZGUpIHtcbiAgICAgICAgICBzdGF0dXNDb2RlID0gcmVzLnN0YXR1c0NvZGUgPyByZXMuc3RhdHVzQ29kZSA6IDIwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChuZXdIZWFkZXJzKSB7XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbihoZWFkZXJzLCBuZXdIZWFkZXJzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcy53cml0ZUhlYWQoc3RhdHVzQ29kZSwgaGVhZGVycyk7XG5cbiAgICAgICAgc3RyZWFtLnBpcGUocmVzLCB7XG4gICAgICAgICAgLy8gRW5kIHRoZSByZXNwb25zZSB3aGVuIHRoZSBzdHJlYW0gZW5kcy5cbiAgICAgICAgICBlbmQ6IHRydWUsXG4gICAgICAgIH0pO1xuXG4gICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgIExvZy5lcnJvcihcIkVycm9yIHJ1bm5pbmcgdGVtcGxhdGU6IFwiICsgZXJyb3Iuc3RhY2spO1xuICAgICAgICByZXMud3JpdGVIZWFkKDUwMCwgaGVhZGVycyk7XG4gICAgICAgIHJlcy5lbmQoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gUmV0dXJuIDQwNCBieSBkZWZhdWx0LCBpZiBubyBvdGhlciBoYW5kbGVycyBzZXJ2ZSB0aGlzIFVSTC5cbiAgYXBwLnVzZShmdW5jdGlvbiAocmVxLCByZXMpIHtcbiAgICByZXMud3JpdGVIZWFkKDQwNCk7XG4gICAgcmVzLmVuZCgpO1xuICB9KTtcblxuXG4gIHZhciBodHRwU2VydmVyID0gY3JlYXRlU2VydmVyKGFwcCk7XG4gIHZhciBvbkxpc3RlbmluZ0NhbGxiYWNrcyA9IFtdO1xuXG4gIC8vIEFmdGVyIDUgc2Vjb25kcyB3L28gZGF0YSBvbiBhIHNvY2tldCwga2lsbCBpdC4gIE9uIHRoZSBvdGhlciBoYW5kLCBpZlxuICAvLyB0aGVyZSdzIGFuIG91dHN0YW5kaW5nIHJlcXVlc3QsIGdpdmUgaXQgYSBoaWdoZXIgdGltZW91dCBpbnN0ZWFkICh0byBhdm9pZFxuICAvLyBraWxsaW5nIGxvbmctcG9sbGluZyByZXF1ZXN0cylcbiAgaHR0cFNlcnZlci5zZXRUaW1lb3V0KFNIT1JUX1NPQ0tFVF9USU1FT1VUKTtcblxuICAvLyBEbyB0aGlzIGhlcmUsIGFuZCB0aGVuIGFsc28gaW4gbGl2ZWRhdGEvc3RyZWFtX3NlcnZlci5qcywgYmVjYXVzZVxuICAvLyBzdHJlYW1fc2VydmVyLmpzIGtpbGxzIGFsbCB0aGUgY3VycmVudCByZXF1ZXN0IGhhbmRsZXJzIHdoZW4gaW5zdGFsbGluZyBpdHNcbiAgLy8gb3duLlxuICBodHRwU2VydmVyLm9uKCdyZXF1ZXN0JywgV2ViQXBwLl90aW1lb3V0QWRqdXN0bWVudFJlcXVlc3RDYWxsYmFjayk7XG5cbiAgLy8gSWYgdGhlIGNsaWVudCBnYXZlIHVzIGEgYmFkIHJlcXVlc3QsIHRlbGwgaXQgaW5zdGVhZCBvZiBqdXN0IGNsb3NpbmcgdGhlXG4gIC8vIHNvY2tldC4gVGhpcyBsZXRzIGxvYWQgYmFsYW5jZXJzIGluIGZyb250IG9mIHVzIGRpZmZlcmVudGlhdGUgYmV0d2VlbiBcImFcbiAgLy8gc2VydmVyIGlzIHJhbmRvbWx5IGNsb3Npbmcgc29ja2V0cyBmb3Igbm8gcmVhc29uXCIgYW5kIFwiY2xpZW50IHNlbnQgYSBiYWRcbiAgLy8gcmVxdWVzdFwiLlxuICAvL1xuICAvLyBUaGlzIHdpbGwgb25seSB3b3JrIG9uIE5vZGUgNjsgTm9kZSA0IGRlc3Ryb3lzIHRoZSBzb2NrZXQgYmVmb3JlIGNhbGxpbmdcbiAgLy8gdGhpcyBldmVudC4gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9wdWxsLzQ1NTcvIGZvciBkZXRhaWxzLlxuICBodHRwU2VydmVyLm9uKCdjbGllbnRFcnJvcicsIChlcnIsIHNvY2tldCkgPT4ge1xuICAgIC8vIFByZS1Ob2RlLTYsIGRvIG5vdGhpbmcuXG4gICAgaWYgKHNvY2tldC5kZXN0cm95ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZXJyLm1lc3NhZ2UgPT09ICdQYXJzZSBFcnJvcicpIHtcbiAgICAgIHNvY2tldC5lbmQoJ0hUVFAvMS4xIDQwMCBCYWQgUmVxdWVzdFxcclxcblxcclxcbicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGb3Igb3RoZXIgZXJyb3JzLCB1c2UgdGhlIGRlZmF1bHQgYmVoYXZpb3IgYXMgaWYgd2UgaGFkIG5vIGNsaWVudEVycm9yXG4gICAgICAvLyBoYW5kbGVyLlxuICAgICAgc29ja2V0LmRlc3Ryb3koZXJyKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIHN0YXJ0IHVwIGFwcFxuICBfLmV4dGVuZChXZWJBcHAsIHtcbiAgICBjb25uZWN0SGFuZGxlcnM6IHBhY2thZ2VBbmRBcHBIYW5kbGVycyxcbiAgICByYXdDb25uZWN0SGFuZGxlcnM6IHJhd0Nvbm5lY3RIYW5kbGVycyxcbiAgICBodHRwU2VydmVyOiBodHRwU2VydmVyLFxuICAgIGNvbm5lY3RBcHA6IGFwcCxcbiAgICAvLyBGb3IgdGVzdGluZy5cbiAgICBzdXBwcmVzc0Nvbm5lY3RFcnJvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHN1cHByZXNzQ29ubmVjdEVycm9ycyA9IHRydWU7XG4gICAgfSxcbiAgICBvbkxpc3RlbmluZzogZnVuY3Rpb24gKGYpIHtcbiAgICAgIGlmIChvbkxpc3RlbmluZ0NhbGxiYWNrcylcbiAgICAgICAgb25MaXN0ZW5pbmdDYWxsYmFja3MucHVzaChmKTtcbiAgICAgIGVsc2VcbiAgICAgICAgZigpO1xuICAgIH0sXG4gICAgLy8gVGhpcyBjYW4gYmUgb3ZlcnJpZGRlbiBieSB1c2VycyB3aG8gd2FudCB0byBtb2RpZnkgaG93IGxpc3RlbmluZyB3b3Jrc1xuICAgIC8vIChlZywgdG8gcnVuIGEgcHJveHkgbGlrZSBBcG9sbG8gRW5naW5lIFByb3h5IGluIGZyb250IG9mIHRoZSBzZXJ2ZXIpLlxuICAgIHN0YXJ0TGlzdGVuaW5nOiBmdW5jdGlvbiAoaHR0cFNlcnZlciwgbGlzdGVuT3B0aW9ucywgY2IpIHtcbiAgICAgIGh0dHBTZXJ2ZXIubGlzdGVuKGxpc3Rlbk9wdGlvbnMsIGNiKTtcbiAgICB9LFxuICB9KTtcblxuICAvLyBMZXQgdGhlIHJlc3Qgb2YgdGhlIHBhY2thZ2VzIChhbmQgTWV0ZW9yLnN0YXJ0dXAgaG9va3MpIGluc2VydCBjb25uZWN0XG4gIC8vIG1pZGRsZXdhcmVzIGFuZCB1cGRhdGUgX19tZXRlb3JfcnVudGltZV9jb25maWdfXywgdGhlbiBrZWVwIGdvaW5nIHRvIHNldCB1cFxuICAvLyBhY3R1YWxseSBzZXJ2aW5nIEhUTUwuXG4gIGV4cG9ydHMubWFpbiA9IGFyZ3YgPT4ge1xuICAgIFdlYkFwcEludGVybmFscy5nZW5lcmF0ZUJvaWxlcnBsYXRlKCk7XG5cbiAgICBjb25zdCBzdGFydEh0dHBTZXJ2ZXIgPSBsaXN0ZW5PcHRpb25zID0+IHtcbiAgICAgIFdlYkFwcC5zdGFydExpc3RlbmluZyhodHRwU2VydmVyLCBsaXN0ZW5PcHRpb25zLCBNZXRlb3IuYmluZEVudmlyb25tZW50KCgpID0+IHtcbiAgICAgICAgaWYgKHByb2Nlc3MuZW52Lk1FVEVPUl9QUklOVF9PTl9MSVNURU4pIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkxJU1RFTklOR1wiKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjYWxsYmFja3MgPSBvbkxpc3RlbmluZ0NhbGxiYWNrcztcbiAgICAgICAgb25MaXN0ZW5pbmdDYWxsYmFja3MgPSBudWxsO1xuICAgICAgICBjYWxsYmFja3MuZm9yRWFjaChjYWxsYmFjayA9PiB7IGNhbGxiYWNrKCk7IH0pO1xuICAgICAgfSwgZSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBsaXN0ZW5pbmc6XCIsIGUpO1xuICAgICAgICBjb25zb2xlLmVycm9yKGUgJiYgZS5zdGFjayk7XG4gICAgICB9KSk7XG4gICAgfTtcblxuICAgIGxldCBsb2NhbFBvcnQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDA7XG4gICAgY29uc3QgdW5peFNvY2tldFBhdGggPSBwcm9jZXNzLmVudi5VTklYX1NPQ0tFVF9QQVRIO1xuXG4gICAgaWYgKHVuaXhTb2NrZXRQYXRoKSB7XG4gICAgICAvLyBTdGFydCB0aGUgSFRUUCBzZXJ2ZXIgdXNpbmcgYSBzb2NrZXQgZmlsZS5cbiAgICAgIHJlbW92ZUV4aXN0aW5nU29ja2V0RmlsZSh1bml4U29ja2V0UGF0aCk7XG4gICAgICBzdGFydEh0dHBTZXJ2ZXIoeyBwYXRoOiB1bml4U29ja2V0UGF0aCB9KTtcbiAgICAgIHJlZ2lzdGVyU29ja2V0RmlsZUNsZWFudXAodW5peFNvY2tldFBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2NhbFBvcnQgPSBpc05hTihOdW1iZXIobG9jYWxQb3J0KSkgPyBsb2NhbFBvcnQgOiBOdW1iZXIobG9jYWxQb3J0KTtcbiAgICAgIGlmICgvXFxcXFxcXFw/LitcXFxccGlwZVxcXFw/LisvLnRlc3QobG9jYWxQb3J0KSkge1xuICAgICAgICAvLyBTdGFydCB0aGUgSFRUUCBzZXJ2ZXIgdXNpbmcgV2luZG93cyBTZXJ2ZXIgc3R5bGUgbmFtZWQgcGlwZS5cbiAgICAgICAgc3RhcnRIdHRwU2VydmVyKHsgcGF0aDogbG9jYWxQb3J0IH0pO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbG9jYWxQb3J0ID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgIC8vIFN0YXJ0IHRoZSBIVFRQIHNlcnZlciB1c2luZyBUQ1AuXG4gICAgICAgIHN0YXJ0SHR0cFNlcnZlcih7XG4gICAgICAgICAgcG9ydDogbG9jYWxQb3J0LFxuICAgICAgICAgIGhvc3Q6IHByb2Nlc3MuZW52LkJJTkRfSVAgfHwgXCIwLjAuMC4wXCJcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIFBPUlQgc3BlY2lmaWVkXCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBcIkRBRU1PTlwiO1xuICB9O1xufVxuXG52YXIgaW5saW5lU2NyaXB0c0FsbG93ZWQgPSB0cnVlO1xuXG5XZWJBcHBJbnRlcm5hbHMuaW5saW5lU2NyaXB0c0FsbG93ZWQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBpbmxpbmVTY3JpcHRzQWxsb3dlZDtcbn07XG5cbldlYkFwcEludGVybmFscy5zZXRJbmxpbmVTY3JpcHRzQWxsb3dlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpbmxpbmVTY3JpcHRzQWxsb3dlZCA9IHZhbHVlO1xuICBXZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVCb2lsZXJwbGF0ZSgpO1xufTtcblxudmFyIHNyaU1vZGU7XG5cbldlYkFwcEludGVybmFscy5lbmFibGVTdWJyZXNvdXJjZUludGVncml0eSA9IGZ1bmN0aW9uKHVzZV9jcmVkZW50aWFscyA9IGZhbHNlKSB7XG4gIHNyaU1vZGUgPSB1c2VfY3JlZGVudGlhbHMgPyAndXNlLWNyZWRlbnRpYWxzJyA6ICdhbm9ueW1vdXMnO1xuICBXZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVCb2lsZXJwbGF0ZSgpO1xufTtcblxuV2ViQXBwSW50ZXJuYWxzLnNldEJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rID0gZnVuY3Rpb24gKGhvb2tGbikge1xuICBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayA9IGhvb2tGbjtcbiAgV2ViQXBwSW50ZXJuYWxzLmdlbmVyYXRlQm9pbGVycGxhdGUoKTtcbn07XG5cbldlYkFwcEludGVybmFscy5zZXRCdW5kbGVkSnNDc3NQcmVmaXggPSBmdW5jdGlvbiAocHJlZml4KSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5zZXRCdW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayhcbiAgICBmdW5jdGlvbiAodXJsKSB7XG4gICAgICByZXR1cm4gcHJlZml4ICsgdXJsO1xuICB9KTtcbn07XG5cbi8vIFBhY2thZ2VzIGNhbiBjYWxsIGBXZWJBcHBJbnRlcm5hbHMuYWRkU3RhdGljSnNgIHRvIHNwZWNpZnkgc3RhdGljXG4vLyBKYXZhU2NyaXB0IHRvIGJlIGluY2x1ZGVkIGluIHRoZSBhcHAuIFRoaXMgc3RhdGljIEpTIHdpbGwgYmUgaW5saW5lZCxcbi8vIHVubGVzcyBpbmxpbmUgc2NyaXB0cyBoYXZlIGJlZW4gZGlzYWJsZWQsIGluIHdoaWNoIGNhc2UgaXQgd2lsbCBiZVxuLy8gc2VydmVkIHVuZGVyIGAvPHNoYTEgb2YgY29udGVudHM+YC5cbnZhciBhZGRpdGlvbmFsU3RhdGljSnMgPSB7fTtcbldlYkFwcEludGVybmFscy5hZGRTdGF0aWNKcyA9IGZ1bmN0aW9uIChjb250ZW50cykge1xuICBhZGRpdGlvbmFsU3RhdGljSnNbXCIvXCIgKyBzaGExKGNvbnRlbnRzKSArIFwiLmpzXCJdID0gY29udGVudHM7XG59O1xuXG4vLyBFeHBvcnRlZCBmb3IgdGVzdHNcbldlYkFwcEludGVybmFscy5nZXRCb2lsZXJwbGF0ZSA9IGdldEJvaWxlcnBsYXRlO1xuV2ViQXBwSW50ZXJuYWxzLmFkZGl0aW9uYWxTdGF0aWNKcyA9IGFkZGl0aW9uYWxTdGF0aWNKcztcblxuLy8gU3RhcnQgdGhlIHNlcnZlciFcbnJ1bldlYkFwcFNlcnZlcigpO1xuIiwiaW1wb3J0IG5wbUNvbm5lY3QgZnJvbSBcImNvbm5lY3RcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbm5lY3QoLi4uY29ubmVjdEFyZ3MpIHtcbiAgY29uc3QgaGFuZGxlcnMgPSBucG1Db25uZWN0LmFwcGx5KHRoaXMsIGNvbm5lY3RBcmdzKTtcbiAgY29uc3Qgb3JpZ2luYWxVc2UgPSBoYW5kbGVycy51c2U7XG5cbiAgLy8gV3JhcCB0aGUgaGFuZGxlcnMudXNlIG1ldGhvZCBzbyB0aGF0IGFueSBwcm92aWRlZCBoYW5kbGVyIGZ1bmN0aW9uc1xuICAvLyBhbHdheSBydW4gaW4gYSBGaWJlci5cbiAgaGFuZGxlcnMudXNlID0gZnVuY3Rpb24gdXNlKC4uLnVzZUFyZ3MpIHtcbiAgICBjb25zdCB7IHN0YWNrIH0gPSB0aGlzO1xuICAgIGNvbnN0IG9yaWdpbmFsTGVuZ3RoID0gc3RhY2subGVuZ3RoO1xuICAgIGNvbnN0IHJlc3VsdCA9IG9yaWdpbmFsVXNlLmFwcGx5KHRoaXMsIHVzZUFyZ3MpO1xuXG4gICAgLy8gSWYgd2UganVzdCBhZGRlZCBhbnl0aGluZyB0byB0aGUgc3RhY2ssIHdyYXAgZWFjaCBuZXcgZW50cnkuaGFuZGxlXG4gICAgLy8gd2l0aCBhIGZ1bmN0aW9uIHRoYXQgY2FsbHMgUHJvbWlzZS5hc3luY0FwcGx5IHRvIGVuc3VyZSB0aGVcbiAgICAvLyBvcmlnaW5hbCBoYW5kbGVyIHJ1bnMgaW4gYSBGaWJlci5cbiAgICBmb3IgKGxldCBpID0gb3JpZ2luYWxMZW5ndGg7IGkgPCBzdGFjay5sZW5ndGg7ICsraSkge1xuICAgICAgY29uc3QgZW50cnkgPSBzdGFja1tpXTtcbiAgICAgIGNvbnN0IG9yaWdpbmFsSGFuZGxlID0gZW50cnkuaGFuZGxlO1xuXG4gICAgICBpZiAob3JpZ2luYWxIYW5kbGUubGVuZ3RoID49IDQpIHtcbiAgICAgICAgLy8gSWYgdGhlIG9yaWdpbmFsIGhhbmRsZSBoYWQgZm91ciAob3IgbW9yZSkgcGFyYW1ldGVycywgdGhlXG4gICAgICAgIC8vIHdyYXBwZXIgbXVzdCBhbHNvIGhhdmUgZm91ciBwYXJhbWV0ZXJzLCBzaW5jZSBjb25uZWN0IHVzZXNcbiAgICAgICAgLy8gaGFuZGxlLmxlbmd0aCB0byBkZXJtaW5lIHdoZXRoZXIgdG8gcGFzcyB0aGUgZXJyb3IgYXMgdGhlIGZpcnN0XG4gICAgICAgIC8vIGFyZ3VtZW50IHRvIHRoZSBoYW5kbGUgZnVuY3Rpb24uXG4gICAgICAgIGVudHJ5LmhhbmRsZSA9IGZ1bmN0aW9uIGhhbmRsZShlcnIsIHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UuYXN5bmNBcHBseShvcmlnaW5hbEhhbmRsZSwgdGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVudHJ5LmhhbmRsZSA9IGZ1bmN0aW9uIGhhbmRsZShyZXEsIHJlcywgbmV4dCkge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLmFzeW5jQXBwbHkob3JpZ2luYWxIYW5kbGUsIHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICByZXR1cm4gaGFuZGxlcnM7XG59XG4iLCJpbXBvcnQgeyBzdGF0U3luYywgdW5saW5rU3luYywgZXhpc3RzU3luYyB9IGZyb20gJ2ZzJztcblxuLy8gU2luY2UgYSBuZXcgc29ja2V0IGZpbGUgd2lsbCBiZSBjcmVhdGVkIHdoZW4gdGhlIEhUVFAgc2VydmVyXG4vLyBzdGFydHMgdXAsIGlmIGZvdW5kIHJlbW92ZSB0aGUgZXhpc3RpbmcgZmlsZS5cbi8vXG4vLyBXQVJOSU5HOlxuLy8gVGhpcyB3aWxsIHJlbW92ZSB0aGUgY29uZmlndXJlZCBzb2NrZXQgZmlsZSB3aXRob3V0IHdhcm5pbmcuIElmXG4vLyB0aGUgY29uZmlndXJlZCBzb2NrZXQgZmlsZSBpcyBhbHJlYWR5IGluIHVzZSBieSBhbm90aGVyIGFwcGxpY2F0aW9uLFxuLy8gaXQgd2lsbCBzdGlsbCBiZSByZW1vdmVkLiBOb2RlIGRvZXMgbm90IHByb3ZpZGUgYSByZWxpYWJsZSB3YXkgdG9cbi8vIGRpZmZlcmVudGlhdGUgYmV0d2VlbiBhIHNvY2tldCBmaWxlIHRoYXQgaXMgYWxyZWFkeSBpbiB1c2UgYnlcbi8vIGFub3RoZXIgYXBwbGljYXRpb24gb3IgYSBzdGFsZSBzb2NrZXQgZmlsZSB0aGF0IGhhcyBiZWVuXG4vLyBsZWZ0IG92ZXIgYWZ0ZXIgYSBTSUdLSUxMLiBTaW5jZSB3ZSBoYXZlIG5vIHJlbGlhYmxlIHdheSB0b1xuLy8gZGlmZmVyZW50aWF0ZSBiZXR3ZWVuIHRoZXNlIHR3byBzY2VuYXJpb3MsIHRoZSBiZXN0IGNvdXJzZSBvZlxuLy8gYWN0aW9uIGR1cmluZyBzdGFydHVwIGlzIHRvIHJlbW92ZSBhbnkgZXhpc3Rpbmcgc29ja2V0IGZpbGUuIFRoaXNcbi8vIGlzIG5vdCB0aGUgc2FmZXN0IGNvdXJzZSBvZiBhY3Rpb24gYXMgcmVtb3ZpbmcgdGhlIGV4aXN0aW5nIHNvY2tldFxuLy8gZmlsZSBjb3VsZCBpbXBhY3QgYW4gYXBwbGljYXRpb24gdXNpbmcgaXQsIGJ1dCB0aGlzIGFwcHJvYWNoIGhlbHBzXG4vLyBlbnN1cmUgdGhlIEhUVFAgc2VydmVyIGNhbiBzdGFydHVwIHdpdGhvdXQgbWFudWFsXG4vLyBpbnRlcnZlbnRpb24gKGUuZy4gYXNraW5nIGZvciB0aGUgdmVyaWZpY2F0aW9uIGFuZCBjbGVhbnVwIG9mIHNvY2tldFxuLy8gZmlsZXMgYmVmb3JlIGFsbG93aW5nIHRoZSBIVFRQIHNlcnZlciB0byBiZSBzdGFydGVkKS5cbi8vXG4vLyBUaGUgYWJvdmUgYmVpbmcgc2FpZCwgYXMgbG9uZyBhcyB0aGUgc29ja2V0IGZpbGUgcGF0aCBpc1xuLy8gY29uZmlndXJlZCBjYXJlZnVsbHkgd2hlbiB0aGUgYXBwbGljYXRpb24gaXMgZGVwbG95ZWQgKGFuZCBleHRyYVxuLy8gY2FyZSBpcyB0YWtlbiB0byBtYWtlIHN1cmUgdGhlIGNvbmZpZ3VyZWQgcGF0aCBpcyB1bmlxdWUgYW5kIGRvZXNuJ3Rcbi8vIGNvbmZsaWN0IHdpdGggYW5vdGhlciBzb2NrZXQgZmlsZSBwYXRoKSwgdGhlbiB0aGVyZSBzaG91bGQgbm90IGJlXG4vLyBhbnkgaXNzdWVzIHdpdGggdGhpcyBhcHByb2FjaC5cbmV4cG9ydCBjb25zdCByZW1vdmVFeGlzdGluZ1NvY2tldEZpbGUgPSAoc29ja2V0UGF0aCkgPT4ge1xuICB0cnkge1xuICAgIGlmIChzdGF0U3luYyhzb2NrZXRQYXRoKS5pc1NvY2tldCgpKSB7XG4gICAgICAvLyBTaW5jZSBhIG5ldyBzb2NrZXQgZmlsZSB3aWxsIGJlIGNyZWF0ZWQsIHJlbW92ZSB0aGUgZXhpc3RpbmdcbiAgICAgIC8vIGZpbGUuXG4gICAgICB1bmxpbmtTeW5jKHNvY2tldFBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBBbiBleGlzdGluZyBmaWxlIHdhcyBmb3VuZCBhdCBcIiR7c29ja2V0UGF0aH1cIiBhbmQgaXQgaXMgbm90IGAgK1xuICAgICAgICAnYSBzb2NrZXQgZmlsZS4gUGxlYXNlIGNvbmZpcm0gUE9SVCBpcyBwb2ludGluZyB0byB2YWxpZCBhbmQgJyArXG4gICAgICAgICd1bi11c2VkIHNvY2tldCBmaWxlIHBhdGguJ1xuICAgICAgKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgLy8gSWYgdGhlcmUgaXMgbm8gZXhpc3Rpbmcgc29ja2V0IGZpbGUgdG8gY2xlYW51cCwgZ3JlYXQsIHdlJ2xsXG4gICAgLy8gY29udGludWUgbm9ybWFsbHkuIElmIHRoZSBjYXVnaHQgZXhjZXB0aW9uIHJlcHJlc2VudHMgYW55IG90aGVyXG4gICAgLy8gaXNzdWUsIHJlLXRocm93LlxuICAgIGlmIChlcnJvci5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG59O1xuXG4vLyBSZW1vdmUgdGhlIHNvY2tldCBmaWxlIHdoZW4gZG9uZSB0byBhdm9pZCBsZWF2aW5nIGJlaGluZCBhIHN0YWxlIG9uZS5cbi8vIE5vdGUgLSBhIHN0YWxlIHNvY2tldCBmaWxlIGlzIHN0aWxsIGxlZnQgYmVoaW5kIGlmIHRoZSBydW5uaW5nIG5vZGVcbi8vIHByb2Nlc3MgaXMga2lsbGVkIHZpYSBzaWduYWwgOSAtIFNJR0tJTEwuXG5leHBvcnQgY29uc3QgcmVnaXN0ZXJTb2NrZXRGaWxlQ2xlYW51cCA9XG4gIChzb2NrZXRQYXRoLCBldmVudEVtaXR0ZXIgPSBwcm9jZXNzKSA9PiB7XG4gICAgWydleGl0JywgJ1NJR0lOVCcsICdTSUdIVVAnLCAnU0lHVEVSTSddLmZvckVhY2goc2lnbmFsID0+IHtcbiAgICAgIGV2ZW50RW1pdHRlci5vbihzaWduYWwsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4ge1xuICAgICAgICBpZiAoZXhpc3RzU3luYyhzb2NrZXRQYXRoKSkge1xuICAgICAgICAgIHVubGlua1N5bmMoc29ja2V0UGF0aCk7XG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICB9KTtcbiAgfTtcbiJdfQ==
