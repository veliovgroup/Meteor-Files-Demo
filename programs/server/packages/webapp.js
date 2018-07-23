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
var memoizedBoilerplate, WebApp, WebAppInternals, main;

var require = meteorInstall({"node_modules":{"meteor":{"webapp":{"webapp_server.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/webapp/webapp_server.js                                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
const module1 = module;
module1.export({
  WebApp: () => WebApp,
  WebAppInternals: () => WebAppInternals
});
let assert;
module1.watch(require("assert"), {
  default(v) {
    assert = v;
  }

}, 0);
let readFile;
module1.watch(require("fs"), {
  readFile(v) {
    readFile = v;
  }

}, 1);
let createServer;
module1.watch(require("http"), {
  createServer(v) {
    createServer = v;
  }

}, 2);
let pathJoin, pathDirname;
module1.watch(require("path"), {
  join(v) {
    pathJoin = v;
  },

  dirname(v) {
    pathDirname = v;
  }

}, 3);
let parseUrl;
module1.watch(require("url"), {
  parse(v) {
    parseUrl = v;
  }

}, 4);
let createHash;
module1.watch(require("crypto"), {
  createHash(v) {
    createHash = v;
  }

}, 5);
let connect;
module1.watch(require("./connect.js"), {
  connect(v) {
    connect = v;
  }

}, 6);
let compress;
module1.watch(require("compression"), {
  default(v) {
    compress = v;
  }

}, 7);
let cookieParser;
module1.watch(require("cookie-parser"), {
  default(v) {
    cookieParser = v;
  }

}, 8);
let query;
module1.watch(require("qs-middleware"), {
  default(v) {
    query = v;
  }

}, 9);
let parseRequest;
module1.watch(require("parseurl"), {
  default(v) {
    parseRequest = v;
  }

}, 10);
let basicAuth;
module1.watch(require("basic-auth-connect"), {
  default(v) {
    basicAuth = v;
  }

}, 11);
let lookupUserAgent;
module1.watch(require("useragent"), {
  lookup(v) {
    lookupUserAgent = v;
  }

}, 12);
let isModern;
module1.watch(require("meteor/modern-browsers"), {
  isModern(v) {
    isModern = v;
  }

}, 13);
let send;
module1.watch(require("send"), {
  default(v) {
    send = v;
  }

}, 14);
let removeExistingSocketFile, registerSocketFileCleanup;
module1.watch(require("./socket_file.js"), {
  removeExistingSocketFile(v) {
    removeExistingSocketFile = v;
  },

  registerSocketFileCleanup(v) {
    registerSocketFileCleanup = v;
  }

}, 15);
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

var readUtf8FileSync = function (filename) {
  return Meteor.wrapAsync(readFile)(filename, 'utf8');
}; // #BrowserIdentification
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
  var calculateClientHash = WebAppHashing.calculateClientHash;

  WebApp.clientHash = function (archName) {
    archName = archName || WebApp.defaultArch;
    return calculateClientHash(WebApp.clientPrograms[archName].manifest);
  };

  WebApp.calculateClientHashRefreshable = function (archName) {
    archName = archName || WebApp.defaultArch;
    return calculateClientHash(WebApp.clientPrograms[archName].manifest, function (name) {
      return name === "css";
    });
  };

  WebApp.calculateClientHashNonRefreshable = function (archName) {
    archName = archName || WebApp.defaultArch;
    return calculateClientHash(WebApp.clientPrograms[archName].manifest, function (name) {
      return name !== "css";
    });
  };

  WebApp.calculateClientHashCordova = function () {
    var archName = 'web.cordova';
    if (!WebApp.clientPrograms[archName]) return 'none';
    return calculateClientHash(WebApp.clientPrograms[archName].manifest, null, _.pick(__meteor_runtime_config__, 'PUBLIC_SETTINGS'));
  };
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


var staticFilesByArch; // Serve static files from the manifest or added with
// `addStaticJs`. Exported for tests.

WebAppInternals.staticFilesMiddleware = function (staticFilesByArch, req, res, next) {
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

  if (pathname === "/meteor_runtime_config.js" && !WebAppInternals.inlineScriptsAllowed()) {
    serveStaticJs("__meteor_runtime_config__ = " + JSON.stringify(__meteor_runtime_config__) + ";");
    return;
  } else if (_.has(additionalStaticJs, pathname) && !WebAppInternals.inlineScriptsAllowed()) {
    serveStaticJs(additionalStaticJs[pathname]);
    return;
  }

  const info = getStaticFileInfo(pathname, identifyBrowser(req.headers["user-agent"]));

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
};

function getStaticFileInfo(originalPath, browser) {
  const {
    arch,
    path
  } = getArchAndPath(originalPath, browser);

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
    const staticFiles = staticFilesByArch[arch]; // If staticFiles contains originalPath with the arch inferred above,
    // use that information.

    if (hasOwn.call(staticFiles, originalPath)) {
      return info = staticFiles[originalPath];
    } // If getArchAndPath returned an alternate path, try that instead.


    if (path !== originalPath && hasOwn.call(staticFiles, path)) {
      return info = staticFiles[path];
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

function runWebAppServer() {
  var shuttingDown = false;
  var syncQueue = new Meteor._SynchronousQueue();

  var getItemPathname = function (itemUrl) {
    return decodeURIComponent(parseUrl(itemUrl).pathname);
  };

  WebAppInternals.reloadClientPrograms = function () {
    syncQueue.runTask(function () {
      staticFilesByArch = Object.create(null);

      function generateClientProgram(clientPath, arch) {
        function addStaticFile(path, item) {
          if (!hasOwn.call(staticFilesByArch, arch)) {
            staticFilesByArch[arch] = Object.create(null);
          }

          staticFilesByArch[arch][path] = item;
        } // read the control for the client we'll be serving up


        var clientJsonPath = pathJoin(__meteor_bootstrap__.serverDir, clientPath);
        var clientDir = pathDirname(clientJsonPath);
        var clientJson = JSON.parse(readUtf8FileSync(clientJsonPath));
        if (clientJson.format !== "web-program-pre1") throw new Error("Unsupported format for client assets: " + JSON.stringify(clientJson.format));
        if (!clientJsonPath || !clientDir || !clientJson) throw new Error("Client config file not parsed.");
        var manifest = clientJson.manifest;

        _.each(manifest, function (item) {
          if (item.url && item.where === "client") {
            addStaticFile(getItemPathname(item.url), {
              absolutePath: pathJoin(clientDir, item.path),
              cacheable: item.cacheable,
              hash: item.hash,
              // Link from source to its map
              sourceMapUrl: item.sourceMapUrl,
              type: item.type
            });

            if (item.sourceMap) {
              // Serve the source map too, under the specified URL. We assume all
              // source maps are cacheable.
              addStaticFile(getItemPathname(item.sourceMapUrl), {
                absolutePath: pathJoin(clientDir, item.sourceMap),
                cacheable: true
              });
            }
          }
        });

        var program = {
          format: "web-program-pre1",
          manifest: manifest,
          version: process.env.AUTOUPDATE_VERSION || WebAppHashing.calculateClientHash(manifest, null, _.pick(__meteor_runtime_config__, "PUBLIC_SETTINGS")),
          cordovaCompatibilityVersions: clientJson.cordovaCompatibilityVersions,
          PUBLIC_SETTINGS: __meteor_runtime_config__.PUBLIC_SETTINGS
        };
        WebApp.clientPrograms[arch] = program; // Expose program details as a string reachable via the following
        // URL.

        const manifestUrlPrefix = "/__" + arch.replace(/^web\./, "");
        const manifestUrl = manifestUrlPrefix + getItemPathname("/manifest.json");
        addStaticFile(manifestUrl, {
          content: JSON.stringify(program),
          cacheable: false,
          hash: program.version,
          type: "json"
        });
      }

      try {
        var clientPaths = __meteor_bootstrap__.configJson.clientPaths;

        _.each(clientPaths, function (clientPath, arch) {
          archPath[arch] = pathDirname(clientPath);
          generateClientProgram(clientPath, arch);
        }); // Exported for tests.


        WebAppInternals.staticFilesByArch = staticFilesByArch;
      } catch (e) {
        Log.error("Error reloading the client program: " + e.stack);
        process.exit(1);
      }
    });
  };

  WebAppInternals.generateBoilerplate = function () {
    // This boilerplate will be served to the mobile devices when used with
    // Meteor/Cordova for the Hot-Code Push and since the file will be served by
    // the device's server, it is important to set the DDP url to the actual
    // Meteor server accepting DDP connections and not the device's file server.
    var defaultOptionsForArch = {
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
    syncQueue.runTask(function () {
      const allCss = [];

      _.each(WebApp.clientPrograms, function (program, archName) {
        boilerplateByArch[archName] = WebAppInternals.generateBoilerplateInstance(archName, program.manifest, defaultOptionsForArch[archName]);
        const cssFiles = boilerplateByArch[archName].baseData.css;
        cssFiles.forEach(file => allCss.push({
          url: bundledJsCssUrlRewriteHook(file.url)
        }));
      }); // Clear the memoized boilerplate cache.


      memoizedBoilerplate = {};
      WebAppInternals.refreshableAssets = {
        allCss
      };
    });
  };

  WebAppInternals.reloadClientPrograms(); // webserver

  var app = connect(); // Packages and apps can add handlers that run before any other Meteor
  // handlers via WebApp.rawConnectHandlers.

  var rawConnectHandlers = connect();
  app.use(rawConnectHandlers); // Auto-compress any json, javascript, or text.

  app.use(compress()); // parse cookies into an object

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
  });

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
  }); // Parse the query string into res.query. Used by oauth_server, but it's
  // generally pretty handy..

  app.use(query()); // Serve static files from the manifest.
  // This is inspired by the 'static' middleware.

  app.use(function (req, res, next) {
    WebAppInternals.staticFilesMiddleware(staticFilesByArch, req, res, next);
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

      return getBoilerplateAsync(request, getArchAndPath(parseRequest(req).pathname, request.browser).arch).then(({
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

runWebAppServer();
var inlineScriptsAllowed = true;

WebAppInternals.inlineScriptsAllowed = function () {
  return inlineScriptsAllowed;
};

WebAppInternals.setInlineScriptsAllowed = function (value) {
  inlineScriptsAllowed = value;
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
WebAppInternals.additionalStaticJs = additionalStaticJs;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"connect.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/webapp/connect.js                                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  connect: () => connect
});
let npmConnect;
module.watch(require("connect"), {
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
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"socket_file.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/webapp/socket_file.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  removeExistingSocketFile: () => removeExistingSocketFile,
  registerSocketFileCleanup: () => registerSocketFileCleanup
});
let statSync, unlinkSync, existsSync;
module.watch(require("fs"), {
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
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"connect":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/connect/package.json                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "connect";
exports.version = "3.6.5";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/connect/index.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"compression":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/compression/package.json                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "compression";
exports.version = "1.7.1";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/compression/index.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"cookie-parser":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/cookie-parser/package.json                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "cookie-parser";
exports.version = "1.4.3";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/cookie-parser/index.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"qs-middleware":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/qs-middleware/package.json                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "qs-middleware";
exports.version = "1.0.3";
exports.main = "./lib/qs-middleware.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"qs-middleware.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/qs-middleware/lib/qs-middleware.js                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"parseurl":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/parseurl/package.json                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "parseurl";
exports.version = "1.3.2";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/parseurl/index.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"basic-auth-connect":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/basic-auth-connect/package.json                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "basic-auth-connect";
exports.version = "1.0.0";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/basic-auth-connect/index.js                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"useragent":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/useragent/package.json                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "useragent";
exports.version = "2.2.1";
exports.main = "./index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/useragent/index.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"send":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/send/package.json                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "send";
exports.version = "0.16.1";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/send/index.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvd2ViYXBwL3dlYmFwcF9zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3dlYmFwcC9jb25uZWN0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy93ZWJhcHAvc29ja2V0X2ZpbGUuanMiXSwibmFtZXMiOlsibW9kdWxlMSIsIm1vZHVsZSIsImV4cG9ydCIsIldlYkFwcCIsIldlYkFwcEludGVybmFscyIsImFzc2VydCIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwicmVhZEZpbGUiLCJjcmVhdGVTZXJ2ZXIiLCJwYXRoSm9pbiIsInBhdGhEaXJuYW1lIiwiam9pbiIsImRpcm5hbWUiLCJwYXJzZVVybCIsInBhcnNlIiwiY3JlYXRlSGFzaCIsImNvbm5lY3QiLCJjb21wcmVzcyIsImNvb2tpZVBhcnNlciIsInF1ZXJ5IiwicGFyc2VSZXF1ZXN0IiwiYmFzaWNBdXRoIiwibG9va3VwVXNlckFnZW50IiwibG9va3VwIiwiaXNNb2Rlcm4iLCJzZW5kIiwicmVtb3ZlRXhpc3RpbmdTb2NrZXRGaWxlIiwicmVnaXN0ZXJTb2NrZXRGaWxlQ2xlYW51cCIsIlNIT1JUX1NPQ0tFVF9USU1FT1VUIiwiTE9OR19TT0NLRVRfVElNRU9VVCIsImhhc093biIsIk9iamVjdCIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiTnBtTW9kdWxlcyIsInZlcnNpb24iLCJOcG0iLCJkZWZhdWx0QXJjaCIsImNsaWVudFByb2dyYW1zIiwiYXJjaFBhdGgiLCJidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayIsInVybCIsImJ1bmRsZWRQcmVmaXgiLCJfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIiwiUk9PVF9VUkxfUEFUSF9QUkVGSVgiLCJzaGExIiwiY29udGVudHMiLCJoYXNoIiwidXBkYXRlIiwiZGlnZXN0IiwicmVhZFV0ZjhGaWxlU3luYyIsImZpbGVuYW1lIiwiTWV0ZW9yIiwid3JhcEFzeW5jIiwiY2FtZWxDYXNlIiwibmFtZSIsInBhcnRzIiwic3BsaXQiLCJ0b0xvd2VyQ2FzZSIsImkiLCJsZW5ndGgiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInN1YnN0ciIsImlkZW50aWZ5QnJvd3NlciIsInVzZXJBZ2VudFN0cmluZyIsInVzZXJBZ2VudCIsImZhbWlseSIsIm1ham9yIiwibWlub3IiLCJwYXRjaCIsImNhdGVnb3JpemVSZXF1ZXN0IiwicmVxIiwiXyIsImV4dGVuZCIsImJyb3dzZXIiLCJoZWFkZXJzIiwicGljayIsImh0bWxBdHRyaWJ1dGVIb29rcyIsImdldEh0bWxBdHRyaWJ1dGVzIiwicmVxdWVzdCIsImNvbWJpbmVkQXR0cmlidXRlcyIsImVhY2giLCJob29rIiwiYXR0cmlidXRlcyIsIkVycm9yIiwiYWRkSHRtbEF0dHJpYnV0ZUhvb2siLCJwdXNoIiwiYXBwVXJsIiwiUm91dGVQb2xpY3kiLCJjbGFzc2lmeSIsInN0YXJ0dXAiLCJjYWxjdWxhdGVDbGllbnRIYXNoIiwiV2ViQXBwSGFzaGluZyIsImNsaWVudEhhc2giLCJhcmNoTmFtZSIsIm1hbmlmZXN0IiwiY2FsY3VsYXRlQ2xpZW50SGFzaFJlZnJlc2hhYmxlIiwiY2FsY3VsYXRlQ2xpZW50SGFzaE5vblJlZnJlc2hhYmxlIiwiY2FsY3VsYXRlQ2xpZW50SGFzaENvcmRvdmEiLCJfdGltZW91dEFkanVzdG1lbnRSZXF1ZXN0Q2FsbGJhY2siLCJyZXMiLCJzZXRUaW1lb3V0IiwiZmluaXNoTGlzdGVuZXJzIiwibGlzdGVuZXJzIiwicmVtb3ZlQWxsTGlzdGVuZXJzIiwib24iLCJsIiwiYm9pbGVycGxhdGVCeUFyY2giLCJib2lsZXJwbGF0ZURhdGFDYWxsYmFja3MiLCJjcmVhdGUiLCJyZWdpc3RlckJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrIiwia2V5IiwiY2FsbGJhY2siLCJwcmV2aW91c0NhbGxiYWNrIiwic3RyaWN0RXF1YWwiLCJnZXRCb2lsZXJwbGF0ZSIsImFyY2giLCJnZXRCb2lsZXJwbGF0ZUFzeW5jIiwiYXdhaXQiLCJib2lsZXJwbGF0ZSIsImRhdGEiLCJhc3NpZ24iLCJiYXNlRGF0YSIsImh0bWxBdHRyaWJ1dGVzIiwibWFkZUNoYW5nZXMiLCJwcm9taXNlIiwiUHJvbWlzZSIsInJlc29sdmUiLCJrZXlzIiwiZm9yRWFjaCIsInRoZW4iLCJyZXN1bHQiLCJzdHJlYW0iLCJ0b0hUTUxTdHJlYW0iLCJzdGF0dXNDb2RlIiwiZ2VuZXJhdGVCb2lsZXJwbGF0ZUluc3RhbmNlIiwiYWRkaXRpb25hbE9wdGlvbnMiLCJydW50aW1lQ29uZmlnIiwiY2xvbmUiLCJydW50aW1lQ29uZmlnT3ZlcnJpZGVzIiwiQm9pbGVycGxhdGUiLCJwYXRoTWFwcGVyIiwiaXRlbVBhdGgiLCJiYXNlRGF0YUV4dGVuc2lvbiIsImFkZGl0aW9uYWxTdGF0aWNKcyIsIm1hcCIsInBhdGhuYW1lIiwibWV0ZW9yUnVudGltZUNvbmZpZyIsIkpTT04iLCJzdHJpbmdpZnkiLCJlbmNvZGVVUklDb21wb25lbnQiLCJyb290VXJsUGF0aFByZWZpeCIsImlubGluZVNjcmlwdHNBbGxvd2VkIiwiaW5saW5lIiwic3RhdGljRmlsZXNCeUFyY2giLCJzdGF0aWNGaWxlc01pZGRsZXdhcmUiLCJuZXh0IiwibWV0aG9kIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiZSIsInNlcnZlU3RhdGljSnMiLCJzIiwid3JpdGVIZWFkIiwid3JpdGUiLCJlbmQiLCJoYXMiLCJpbmZvIiwiZ2V0U3RhdGljRmlsZUluZm8iLCJtYXhBZ2UiLCJjYWNoZWFibGUiLCJzZXRIZWFkZXIiLCJzb3VyY2VNYXBVcmwiLCJ0eXBlIiwiY29udGVudCIsImFic29sdXRlUGF0aCIsIm1heGFnZSIsImRvdGZpbGVzIiwibGFzdE1vZGlmaWVkIiwiZXJyIiwiTG9nIiwiZXJyb3IiLCJwaXBlIiwib3JpZ2luYWxQYXRoIiwicGF0aCIsImdldEFyY2hBbmRQYXRoIiwiY2FsbCIsInN0YXRpY0FyY2hMaXN0IiwiYXJjaEluZGV4IiwiaW5kZXhPZiIsInVuc2hpZnQiLCJzcGxpY2UiLCJzb21lIiwic3RhdGljRmlsZXMiLCJwYXRoUGFydHMiLCJhcmNoS2V5Iiwic3RhcnRzV2l0aCIsImFyY2hDbGVhbmVkIiwic2xpY2UiLCJwYXJzZVBvcnQiLCJwb3J0IiwicGFyc2VkUG9ydCIsInBhcnNlSW50IiwiTnVtYmVyIiwiaXNOYU4iLCJydW5XZWJBcHBTZXJ2ZXIiLCJzaHV0dGluZ0Rvd24iLCJzeW5jUXVldWUiLCJfU3luY2hyb25vdXNRdWV1ZSIsImdldEl0ZW1QYXRobmFtZSIsIml0ZW1VcmwiLCJyZWxvYWRDbGllbnRQcm9ncmFtcyIsInJ1blRhc2siLCJnZW5lcmF0ZUNsaWVudFByb2dyYW0iLCJjbGllbnRQYXRoIiwiYWRkU3RhdGljRmlsZSIsIml0ZW0iLCJjbGllbnRKc29uUGF0aCIsIl9fbWV0ZW9yX2Jvb3RzdHJhcF9fIiwic2VydmVyRGlyIiwiY2xpZW50RGlyIiwiY2xpZW50SnNvbiIsImZvcm1hdCIsIndoZXJlIiwic291cmNlTWFwIiwicHJvZ3JhbSIsInByb2Nlc3MiLCJlbnYiLCJBVVRPVVBEQVRFX1ZFUlNJT04iLCJjb3Jkb3ZhQ29tcGF0aWJpbGl0eVZlcnNpb25zIiwiUFVCTElDX1NFVFRJTkdTIiwibWFuaWZlc3RVcmxQcmVmaXgiLCJyZXBsYWNlIiwibWFuaWZlc3RVcmwiLCJjbGllbnRQYXRocyIsImNvbmZpZ0pzb24iLCJzdGFjayIsImV4aXQiLCJnZW5lcmF0ZUJvaWxlcnBsYXRlIiwiZGVmYXVsdE9wdGlvbnNGb3JBcmNoIiwiRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkwiLCJNT0JJTEVfRERQX1VSTCIsImFic29sdXRlVXJsIiwiUk9PVF9VUkwiLCJNT0JJTEVfUk9PVF9VUkwiLCJhbGxDc3MiLCJjc3NGaWxlcyIsImNzcyIsImZpbGUiLCJtZW1vaXplZEJvaWxlcnBsYXRlIiwicmVmcmVzaGFibGVBc3NldHMiLCJhcHAiLCJyYXdDb25uZWN0SGFuZGxlcnMiLCJ1c2UiLCJpc1ZhbGlkVXJsIiwiZ2V0UGF0aFBhcnRzIiwic2hpZnQiLCJpc1ByZWZpeE9mIiwicHJlZml4IiwiYXJyYXkiLCJldmVyeSIsInBhcnQiLCJyZXNwb25zZSIsInBhdGhQcmVmaXgiLCJwcmVmaXhQYXJ0cyIsIm1ldGVvckludGVybmFsSGFuZGxlcnMiLCJwYWNrYWdlQW5kQXBwSGFuZGxlcnMiLCJzdXBwcmVzc0Nvbm5lY3RFcnJvcnMiLCJzdGF0dXMiLCJuZXdIZWFkZXJzIiwiY2F0Y2giLCJodHRwU2VydmVyIiwib25MaXN0ZW5pbmdDYWxsYmFja3MiLCJzb2NrZXQiLCJkZXN0cm95ZWQiLCJtZXNzYWdlIiwiZGVzdHJveSIsImNvbm5lY3RIYW5kbGVycyIsImNvbm5lY3RBcHAiLCJvbkxpc3RlbmluZyIsImYiLCJzdGFydExpc3RlbmluZyIsImxpc3Rlbk9wdGlvbnMiLCJjYiIsImxpc3RlbiIsImV4cG9ydHMiLCJtYWluIiwiYXJndiIsInN0YXJ0SHR0cFNlcnZlciIsImJpbmRFbnZpcm9ubWVudCIsIk1FVEVPUl9QUklOVF9PTl9MSVNURU4iLCJjb25zb2xlIiwibG9nIiwiY2FsbGJhY2tzIiwibG9jYWxQb3J0IiwiUE9SVCIsInVuaXhTb2NrZXRQYXRoIiwiVU5JWF9TT0NLRVRfUEFUSCIsInRlc3QiLCJob3N0IiwiQklORF9JUCIsInNldElubGluZVNjcmlwdHNBbGxvd2VkIiwidmFsdWUiLCJzZXRCdW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayIsImhvb2tGbiIsInNldEJ1bmRsZWRKc0Nzc1ByZWZpeCIsInNlbGYiLCJhZGRTdGF0aWNKcyIsIm5wbUNvbm5lY3QiLCJjb25uZWN0QXJncyIsImhhbmRsZXJzIiwiYXBwbHkiLCJvcmlnaW5hbFVzZSIsInVzZUFyZ3MiLCJvcmlnaW5hbExlbmd0aCIsImVudHJ5Iiwib3JpZ2luYWxIYW5kbGUiLCJoYW5kbGUiLCJhc3luY0FwcGx5IiwiYXJndW1lbnRzIiwic3RhdFN5bmMiLCJ1bmxpbmtTeW5jIiwiZXhpc3RzU3luYyIsInNvY2tldFBhdGgiLCJpc1NvY2tldCIsImNvZGUiLCJldmVudEVtaXR0ZXIiLCJzaWduYWwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQU1BLFVBQVFDLE1BQWQ7QUFBcUJELFFBQVFFLE1BQVIsQ0FBZTtBQUFDQyxVQUFPLE1BQUlBLE1BQVo7QUFBbUJDLG1CQUFnQixNQUFJQTtBQUF2QyxDQUFmO0FBQXdFLElBQUlDLE1BQUo7QUFBV0wsUUFBUU0sS0FBUixDQUFjQyxRQUFRLFFBQVIsQ0FBZCxFQUFnQztBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0osYUFBT0ksQ0FBUDtBQUFTOztBQUFyQixDQUFoQyxFQUF1RCxDQUF2RDtBQUEwRCxJQUFJQyxRQUFKO0FBQWFWLFFBQVFNLEtBQVIsQ0FBY0MsUUFBUSxJQUFSLENBQWQsRUFBNEI7QUFBQ0csV0FBU0QsQ0FBVCxFQUFXO0FBQUNDLGVBQVNELENBQVQ7QUFBVzs7QUFBeEIsQ0FBNUIsRUFBc0QsQ0FBdEQ7QUFBeUQsSUFBSUUsWUFBSjtBQUFpQlgsUUFBUU0sS0FBUixDQUFjQyxRQUFRLE1BQVIsQ0FBZCxFQUE4QjtBQUFDSSxlQUFhRixDQUFiLEVBQWU7QUFBQ0UsbUJBQWFGLENBQWI7QUFBZTs7QUFBaEMsQ0FBOUIsRUFBZ0UsQ0FBaEU7QUFBbUUsSUFBSUcsUUFBSixFQUFhQyxXQUFiO0FBQXlCYixRQUFRTSxLQUFSLENBQWNDLFFBQVEsTUFBUixDQUFkLEVBQThCO0FBQUNPLE9BQUtMLENBQUwsRUFBTztBQUFDRyxlQUFTSCxDQUFUO0FBQVcsR0FBcEI7O0FBQXFCTSxVQUFRTixDQUFSLEVBQVU7QUFBQ0ksa0JBQVlKLENBQVo7QUFBYzs7QUFBOUMsQ0FBOUIsRUFBOEUsQ0FBOUU7QUFBaUYsSUFBSU8sUUFBSjtBQUFhaEIsUUFBUU0sS0FBUixDQUFjQyxRQUFRLEtBQVIsQ0FBZCxFQUE2QjtBQUFDVSxRQUFNUixDQUFOLEVBQVE7QUFBQ08sZUFBU1AsQ0FBVDtBQUFXOztBQUFyQixDQUE3QixFQUFvRCxDQUFwRDtBQUF1RCxJQUFJUyxVQUFKO0FBQWVsQixRQUFRTSxLQUFSLENBQWNDLFFBQVEsUUFBUixDQUFkLEVBQWdDO0FBQUNXLGFBQVdULENBQVgsRUFBYTtBQUFDUyxpQkFBV1QsQ0FBWDtBQUFhOztBQUE1QixDQUFoQyxFQUE4RCxDQUE5RDtBQUFpRSxJQUFJVSxPQUFKO0FBQVluQixRQUFRTSxLQUFSLENBQWNDLFFBQVEsY0FBUixDQUFkLEVBQXNDO0FBQUNZLFVBQVFWLENBQVIsRUFBVTtBQUFDVSxjQUFRVixDQUFSO0FBQVU7O0FBQXRCLENBQXRDLEVBQThELENBQTlEO0FBQWlFLElBQUlXLFFBQUo7QUFBYXBCLFFBQVFNLEtBQVIsQ0FBY0MsUUFBUSxhQUFSLENBQWQsRUFBcUM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNXLGVBQVNYLENBQVQ7QUFBVzs7QUFBdkIsQ0FBckMsRUFBOEQsQ0FBOUQ7QUFBaUUsSUFBSVksWUFBSjtBQUFpQnJCLFFBQVFNLEtBQVIsQ0FBY0MsUUFBUSxlQUFSLENBQWQsRUFBdUM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNZLG1CQUFhWixDQUFiO0FBQWU7O0FBQTNCLENBQXZDLEVBQW9FLENBQXBFO0FBQXVFLElBQUlhLEtBQUo7QUFBVXRCLFFBQVFNLEtBQVIsQ0FBY0MsUUFBUSxlQUFSLENBQWQsRUFBdUM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNhLFlBQU1iLENBQU47QUFBUTs7QUFBcEIsQ0FBdkMsRUFBNkQsQ0FBN0Q7QUFBZ0UsSUFBSWMsWUFBSjtBQUFpQnZCLFFBQVFNLEtBQVIsQ0FBY0MsUUFBUSxVQUFSLENBQWQsRUFBa0M7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNjLG1CQUFhZCxDQUFiO0FBQWU7O0FBQTNCLENBQWxDLEVBQStELEVBQS9EO0FBQW1FLElBQUllLFNBQUo7QUFBY3hCLFFBQVFNLEtBQVIsQ0FBY0MsUUFBUSxvQkFBUixDQUFkLEVBQTRDO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDZSxnQkFBVWYsQ0FBVjtBQUFZOztBQUF4QixDQUE1QyxFQUFzRSxFQUF0RTtBQUEwRSxJQUFJZ0IsZUFBSjtBQUFvQnpCLFFBQVFNLEtBQVIsQ0FBY0MsUUFBUSxXQUFSLENBQWQsRUFBbUM7QUFBQ21CLFNBQU9qQixDQUFQLEVBQVM7QUFBQ2dCLHNCQUFnQmhCLENBQWhCO0FBQWtCOztBQUE3QixDQUFuQyxFQUFrRSxFQUFsRTtBQUFzRSxJQUFJa0IsUUFBSjtBQUFhM0IsUUFBUU0sS0FBUixDQUFjQyxRQUFRLHdCQUFSLENBQWQsRUFBZ0Q7QUFBQ29CLFdBQVNsQixDQUFULEVBQVc7QUFBQ2tCLGVBQVNsQixDQUFUO0FBQVc7O0FBQXhCLENBQWhELEVBQTBFLEVBQTFFO0FBQThFLElBQUltQixJQUFKO0FBQVM1QixRQUFRTSxLQUFSLENBQWNDLFFBQVEsTUFBUixDQUFkLEVBQThCO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDbUIsV0FBS25CLENBQUw7QUFBTzs7QUFBbkIsQ0FBOUIsRUFBbUQsRUFBbkQ7QUFBdUQsSUFBSW9CLHdCQUFKLEVBQTZCQyx5QkFBN0I7QUFBdUQ5QixRQUFRTSxLQUFSLENBQWNDLFFBQVEsa0JBQVIsQ0FBZCxFQUEwQztBQUFDc0IsMkJBQXlCcEIsQ0FBekIsRUFBMkI7QUFBQ29CLCtCQUF5QnBCLENBQXpCO0FBQTJCLEdBQXhEOztBQUF5RHFCLDRCQUEwQnJCLENBQTFCLEVBQTRCO0FBQUNxQixnQ0FBMEJyQixDQUExQjtBQUE0Qjs7QUFBbEgsQ0FBMUMsRUFBOEosRUFBOUo7QUF1Qi8wQyxJQUFJc0IsdUJBQXVCLElBQUUsSUFBN0I7QUFDQSxJQUFJQyxzQkFBc0IsTUFBSSxJQUE5QjtBQUVPLE1BQU03QixTQUFTLEVBQWY7QUFDQSxNQUFNQyxrQkFBa0IsRUFBeEI7QUFFUCxNQUFNNkIsU0FBU0MsT0FBT0MsU0FBUCxDQUFpQkMsY0FBaEMsQyxDQUVBOztBQUNBakIsUUFBUUssU0FBUixHQUFvQkEsU0FBcEI7QUFFQXBCLGdCQUFnQmlDLFVBQWhCLEdBQTZCO0FBQzNCbEIsV0FBUztBQUNQbUIsYUFBU0MsSUFBSWhDLE9BQUosQ0FBWSxzQkFBWixFQUFvQytCLE9BRHRDO0FBRVByQyxZQUFRa0I7QUFGRDtBQURrQixDQUE3QixDLENBT0E7QUFDQTs7QUFDQWhCLE9BQU9xQyxXQUFQLEdBQXFCLG9CQUFyQixDLENBRUE7O0FBQ0FyQyxPQUFPc0MsY0FBUCxHQUF3QixFQUF4QixDLENBRUE7O0FBQ0EsSUFBSUMsV0FBVyxFQUFmOztBQUVBLElBQUlDLDZCQUE2QixVQUFVQyxHQUFWLEVBQWU7QUFDOUMsTUFBSUMsZ0JBQ0RDLDBCQUEwQkMsb0JBQTFCLElBQWtELEVBRHJEO0FBRUEsU0FBT0YsZ0JBQWdCRCxHQUF2QjtBQUNELENBSkQ7O0FBTUEsSUFBSUksT0FBTyxVQUFVQyxRQUFWLEVBQW9CO0FBQzdCLE1BQUlDLE9BQU9oQyxXQUFXLE1BQVgsQ0FBWDtBQUNBZ0MsT0FBS0MsTUFBTCxDQUFZRixRQUFaO0FBQ0EsU0FBT0MsS0FBS0UsTUFBTCxDQUFZLEtBQVosQ0FBUDtBQUNELENBSkQ7O0FBTUEsSUFBSUMsbUJBQW1CLFVBQVVDLFFBQVYsRUFBb0I7QUFDekMsU0FBT0MsT0FBT0MsU0FBUCxDQUFpQjlDLFFBQWpCLEVBQTJCNEMsUUFBM0IsRUFBcUMsTUFBckMsQ0FBUDtBQUNELENBRkQsQyxDQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUdBOzs7QUFDQSxJQUFJRyxZQUFZLFVBQVVDLElBQVYsRUFBZ0I7QUFDOUIsTUFBSUMsUUFBUUQsS0FBS0UsS0FBTCxDQUFXLEdBQVgsQ0FBWjtBQUNBRCxRQUFNLENBQU4sSUFBV0EsTUFBTSxDQUFOLEVBQVNFLFdBQVQsRUFBWDs7QUFDQSxPQUFLLElBQUlDLElBQUksQ0FBYixFQUFpQkEsSUFBSUgsTUFBTUksTUFBM0IsRUFBb0MsRUFBRUQsQ0FBdEMsRUFBeUM7QUFDdkNILFVBQU1HLENBQU4sSUFBV0gsTUFBTUcsQ0FBTixFQUFTRSxNQUFULENBQWdCLENBQWhCLEVBQW1CQyxXQUFuQixLQUFtQ04sTUFBTUcsQ0FBTixFQUFTSSxNQUFULENBQWdCLENBQWhCLENBQTlDO0FBQ0Q7O0FBQ0QsU0FBT1AsTUFBTTdDLElBQU4sQ0FBVyxFQUFYLENBQVA7QUFDRCxDQVBEOztBQVNBLElBQUlxRCxrQkFBa0IsVUFBVUMsZUFBVixFQUEyQjtBQUMvQyxNQUFJQyxZQUFZNUMsZ0JBQWdCMkMsZUFBaEIsQ0FBaEI7QUFDQSxTQUFPO0FBQ0xWLFVBQU1ELFVBQVVZLFVBQVVDLE1BQXBCLENBREQ7QUFFTEMsV0FBTyxDQUFDRixVQUFVRSxLQUZiO0FBR0xDLFdBQU8sQ0FBQ0gsVUFBVUcsS0FIYjtBQUlMQyxXQUFPLENBQUNKLFVBQVVJO0FBSmIsR0FBUDtBQU1ELENBUkQsQyxDQVVBOzs7QUFDQXJFLGdCQUFnQitELGVBQWhCLEdBQWtDQSxlQUFsQzs7QUFFQWhFLE9BQU91RSxpQkFBUCxHQUEyQixVQUFVQyxHQUFWLEVBQWU7QUFDeEMsU0FBT0MsRUFBRUMsTUFBRixDQUFTO0FBQ2RDLGFBQVNYLGdCQUFnQlEsSUFBSUksT0FBSixDQUFZLFlBQVosQ0FBaEIsQ0FESztBQUVkbkMsU0FBSzVCLFNBQVMyRCxJQUFJL0IsR0FBYixFQUFrQixJQUFsQjtBQUZTLEdBQVQsRUFHSmdDLEVBQUVJLElBQUYsQ0FBT0wsR0FBUCxFQUFZLGFBQVosRUFBMkIsYUFBM0IsRUFBMEMsU0FBMUMsRUFBcUQsU0FBckQsQ0FISSxDQUFQO0FBSUQsQ0FMRCxDLENBT0E7QUFDQTtBQUNBOzs7QUFDQSxJQUFJTSxxQkFBcUIsRUFBekI7O0FBQ0EsSUFBSUMsb0JBQW9CLFVBQVVDLE9BQVYsRUFBbUI7QUFDekMsTUFBSUMscUJBQXNCLEVBQTFCOztBQUNBUixJQUFFUyxJQUFGLENBQU9KLHNCQUFzQixFQUE3QixFQUFpQyxVQUFVSyxJQUFWLEVBQWdCO0FBQy9DLFFBQUlDLGFBQWFELEtBQUtILE9BQUwsQ0FBakI7QUFDQSxRQUFJSSxlQUFlLElBQW5CLEVBQ0U7QUFDRixRQUFJLE9BQU9BLFVBQVAsS0FBc0IsUUFBMUIsRUFDRSxNQUFNQyxNQUFNLGdEQUFOLENBQU47O0FBQ0ZaLE1BQUVDLE1BQUYsQ0FBU08sa0JBQVQsRUFBNkJHLFVBQTdCO0FBQ0QsR0FQRDs7QUFRQSxTQUFPSCxrQkFBUDtBQUNELENBWEQ7O0FBWUFqRixPQUFPc0Ysb0JBQVAsR0FBOEIsVUFBVUgsSUFBVixFQUFnQjtBQUM1Q0wscUJBQW1CUyxJQUFuQixDQUF3QkosSUFBeEI7QUFDRCxDQUZELEMsQ0FJQTs7O0FBQ0EsSUFBSUssU0FBUyxVQUFVL0MsR0FBVixFQUFlO0FBQzFCLE1BQUlBLFFBQVEsY0FBUixJQUEwQkEsUUFBUSxhQUF0QyxFQUNFLE9BQU8sS0FBUCxDQUZ3QixDQUkxQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0EsTUFBSUEsUUFBUSxlQUFaLEVBQ0UsT0FBTyxLQUFQLENBWHdCLENBYTFCOztBQUNBLE1BQUlnRCxZQUFZQyxRQUFaLENBQXFCakQsR0FBckIsQ0FBSixFQUNFLE9BQU8sS0FBUCxDQWZ3QixDQWlCMUI7O0FBQ0EsU0FBTyxJQUFQO0FBQ0QsQ0FuQkQsQyxDQXNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBRUFXLE9BQU91QyxPQUFQLENBQWUsWUFBWTtBQUN6QixNQUFJQyxzQkFBc0JDLGNBQWNELG1CQUF4Qzs7QUFDQTVGLFNBQU84RixVQUFQLEdBQW9CLFVBQVVDLFFBQVYsRUFBb0I7QUFDdENBLGVBQVdBLFlBQVkvRixPQUFPcUMsV0FBOUI7QUFDQSxXQUFPdUQsb0JBQW9CNUYsT0FBT3NDLGNBQVAsQ0FBc0J5RCxRQUF0QixFQUFnQ0MsUUFBcEQsQ0FBUDtBQUNELEdBSEQ7O0FBS0FoRyxTQUFPaUcsOEJBQVAsR0FBd0MsVUFBVUYsUUFBVixFQUFvQjtBQUMxREEsZUFBV0EsWUFBWS9GLE9BQU9xQyxXQUE5QjtBQUNBLFdBQU91RCxvQkFBb0I1RixPQUFPc0MsY0FBUCxDQUFzQnlELFFBQXRCLEVBQWdDQyxRQUFwRCxFQUNMLFVBQVV6QyxJQUFWLEVBQWdCO0FBQ2QsYUFBT0EsU0FBUyxLQUFoQjtBQUNELEtBSEksQ0FBUDtBQUlELEdBTkQ7O0FBT0F2RCxTQUFPa0csaUNBQVAsR0FBMkMsVUFBVUgsUUFBVixFQUFvQjtBQUM3REEsZUFBV0EsWUFBWS9GLE9BQU9xQyxXQUE5QjtBQUNBLFdBQU91RCxvQkFBb0I1RixPQUFPc0MsY0FBUCxDQUFzQnlELFFBQXRCLEVBQWdDQyxRQUFwRCxFQUNMLFVBQVV6QyxJQUFWLEVBQWdCO0FBQ2QsYUFBT0EsU0FBUyxLQUFoQjtBQUNELEtBSEksQ0FBUDtBQUlELEdBTkQ7O0FBT0F2RCxTQUFPbUcsMEJBQVAsR0FBb0MsWUFBWTtBQUM5QyxRQUFJSixXQUFXLGFBQWY7QUFDQSxRQUFJLENBQUUvRixPQUFPc0MsY0FBUCxDQUFzQnlELFFBQXRCLENBQU4sRUFDRSxPQUFPLE1BQVA7QUFFRixXQUFPSCxvQkFDTDVGLE9BQU9zQyxjQUFQLENBQXNCeUQsUUFBdEIsRUFBZ0NDLFFBRDNCLEVBQ3FDLElBRHJDLEVBQzJDdkIsRUFBRUksSUFBRixDQUM5Q2xDLHlCQUQ4QyxFQUNuQixpQkFEbUIsQ0FEM0MsQ0FBUDtBQUdELEdBUkQ7QUFTRCxDQTlCRCxFLENBa0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0EzQyxPQUFPb0csaUNBQVAsR0FBMkMsVUFBVTVCLEdBQVYsRUFBZTZCLEdBQWYsRUFBb0I7QUFDN0Q7QUFDQTdCLE1BQUk4QixVQUFKLENBQWV6RSxtQkFBZixFQUY2RCxDQUc3RDtBQUNBOztBQUNBLE1BQUkwRSxrQkFBa0JGLElBQUlHLFNBQUosQ0FBYyxRQUFkLENBQXRCLENBTDZELENBTTdEO0FBQ0E7QUFDQTtBQUNBOztBQUNBSCxNQUFJSSxrQkFBSixDQUF1QixRQUF2QjtBQUNBSixNQUFJSyxFQUFKLENBQU8sUUFBUCxFQUFpQixZQUFZO0FBQzNCTCxRQUFJQyxVQUFKLENBQWUxRSxvQkFBZjtBQUNELEdBRkQ7O0FBR0E2QyxJQUFFUyxJQUFGLENBQU9xQixlQUFQLEVBQXdCLFVBQVVJLENBQVYsRUFBYTtBQUFFTixRQUFJSyxFQUFKLENBQU8sUUFBUCxFQUFpQkMsQ0FBakI7QUFBc0IsR0FBN0Q7QUFDRCxDQWZELEMsQ0FrQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0EsSUFBSUMsb0JBQW9CLEVBQXhCLEMsQ0FFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQSxNQUFNQywyQkFBMkI5RSxPQUFPK0UsTUFBUCxDQUFjLElBQWQsQ0FBakM7O0FBQ0E3RyxnQkFBZ0I4RywrQkFBaEIsR0FBa0QsVUFBVUMsR0FBVixFQUFlQyxRQUFmLEVBQXlCO0FBQ3pFLFFBQU1DLG1CQUFtQkwseUJBQXlCRyxHQUF6QixDQUF6Qjs7QUFFQSxNQUFJLE9BQU9DLFFBQVAsS0FBb0IsVUFBeEIsRUFBb0M7QUFDbENKLDZCQUF5QkcsR0FBekIsSUFBZ0NDLFFBQWhDO0FBQ0QsR0FGRCxNQUVPO0FBQ0wvRyxXQUFPaUgsV0FBUCxDQUFtQkYsUUFBbkIsRUFBNkIsSUFBN0I7QUFDQSxXQUFPSix5QkFBeUJHLEdBQXpCLENBQVA7QUFDRCxHQVJ3RSxDQVV6RTtBQUNBOzs7QUFDQSxTQUFPRSxvQkFBb0IsSUFBM0I7QUFDRCxDQWJELEMsQ0FlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQSxTQUFTRSxjQUFULENBQXdCcEMsT0FBeEIsRUFBaUNxQyxJQUFqQyxFQUF1QztBQUNyQyxTQUFPQyxvQkFBb0J0QyxPQUFwQixFQUE2QnFDLElBQTdCLEVBQW1DRSxLQUFuQyxFQUFQO0FBQ0Q7O0FBRUQsU0FBU0QsbUJBQVQsQ0FBNkJ0QyxPQUE3QixFQUFzQ3FDLElBQXRDLEVBQTRDO0FBQzFDLFFBQU1HLGNBQWNaLGtCQUFrQlMsSUFBbEIsQ0FBcEI7QUFDQSxRQUFNSSxPQUFPMUYsT0FBTzJGLE1BQVAsQ0FBYyxFQUFkLEVBQWtCRixZQUFZRyxRQUE5QixFQUF3QztBQUNuREMsb0JBQWdCN0Msa0JBQWtCQyxPQUFsQjtBQURtQyxHQUF4QyxFQUVWUCxFQUFFSSxJQUFGLENBQU9HLE9BQVAsRUFBZ0IsYUFBaEIsRUFBK0IsYUFBL0IsQ0FGVSxDQUFiO0FBSUEsTUFBSTZDLGNBQWMsS0FBbEI7QUFDQSxNQUFJQyxVQUFVQyxRQUFRQyxPQUFSLEVBQWQ7QUFFQWpHLFNBQU9rRyxJQUFQLENBQVlwQix3QkFBWixFQUFzQ3FCLE9BQXRDLENBQThDbEIsT0FBTztBQUNuRGMsY0FBVUEsUUFBUUssSUFBUixDQUFhLE1BQU07QUFDM0IsWUFBTWxCLFdBQVdKLHlCQUF5QkcsR0FBekIsQ0FBakI7QUFDQSxhQUFPQyxTQUFTakMsT0FBVCxFQUFrQnlDLElBQWxCLEVBQXdCSixJQUF4QixDQUFQO0FBQ0QsS0FIUyxFQUdQYyxJQUhPLENBR0ZDLFVBQVU7QUFDaEI7QUFDQSxVQUFJQSxXQUFXLEtBQWYsRUFBc0I7QUFDcEJQLHNCQUFjLElBQWQ7QUFDRDtBQUNGLEtBUlMsQ0FBVjtBQVNELEdBVkQ7QUFZQSxTQUFPQyxRQUFRSyxJQUFSLENBQWEsT0FBTztBQUN6QkUsWUFBUWIsWUFBWWMsWUFBWixDQUF5QmIsSUFBekIsQ0FEaUI7QUFFekJjLGdCQUFZZCxLQUFLYyxVQUZRO0FBR3pCM0QsYUFBUzZDLEtBQUs3QztBQUhXLEdBQVAsQ0FBYixDQUFQO0FBS0Q7O0FBRUQzRSxnQkFBZ0J1SSwyQkFBaEIsR0FBOEMsVUFBVW5CLElBQVYsRUFDVXJCLFFBRFYsRUFFVXlDLGlCQUZWLEVBRTZCO0FBQ3pFQSxzQkFBb0JBLHFCQUFxQixFQUF6Qzs7QUFFQSxNQUFJQyxnQkFBZ0JqRSxFQUFFQyxNQUFGLENBQ2xCRCxFQUFFa0UsS0FBRixDQUFRaEcseUJBQVIsQ0FEa0IsRUFFbEI4RixrQkFBa0JHLHNCQUFsQixJQUE0QyxFQUYxQixDQUFwQjs7QUFLQSxTQUFPLElBQUlDLFdBQUosQ0FBZ0J4QixJQUFoQixFQUFzQnJCLFFBQXRCLEVBQWdDdkIsRUFBRUMsTUFBRixDQUFTO0FBQzlDb0UsZUFBV0MsUUFBWCxFQUFxQjtBQUNuQixhQUFPdEksU0FBUzhCLFNBQVM4RSxJQUFULENBQVQsRUFBeUIwQixRQUF6QixDQUFQO0FBQ0QsS0FINkM7O0FBSTlDQyx1QkFBbUI7QUFDakJDLDBCQUFvQnhFLEVBQUV5RSxHQUFGLENBQ2xCRCxzQkFBc0IsRUFESixFQUVsQixVQUFVbkcsUUFBVixFQUFvQnFHLFFBQXBCLEVBQThCO0FBQzVCLGVBQU87QUFDTEEsb0JBQVVBLFFBREw7QUFFTHJHLG9CQUFVQTtBQUZMLFNBQVA7QUFJRCxPQVBpQixDQURIO0FBVWpCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBc0csMkJBQXFCQyxLQUFLQyxTQUFMLENBQ25CQyxtQkFBbUJGLEtBQUtDLFNBQUwsQ0FBZVosYUFBZixDQUFuQixDQURtQixDQWhCSjtBQWtCakJjLHlCQUFtQjdHLDBCQUEwQkMsb0JBQTFCLElBQWtELEVBbEJwRDtBQW1CakJKLGtDQUE0QkEsMEJBbkJYO0FBb0JqQmlILDRCQUFzQnhKLGdCQUFnQndKLG9CQUFoQixFQXBCTDtBQXFCakJDLGNBQVFqQixrQkFBa0JpQjtBQXJCVDtBQUoyQixHQUFULEVBMkJwQ2pCLGlCQTNCb0MsQ0FBaEMsQ0FBUDtBQTRCRCxDQXRDRCxDLENBd0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBRUEsSUFBSWtCLGlCQUFKLEMsQ0FFQTtBQUNBOztBQUNBMUosZ0JBQWdCMkoscUJBQWhCLEdBQXdDLFVBQVVELGlCQUFWLEVBQTZCbkYsR0FBN0IsRUFBa0M2QixHQUFsQyxFQUF1Q3dELElBQXZDLEVBQTZDO0FBQ25GLE1BQUksU0FBU3JGLElBQUlzRixNQUFiLElBQXVCLFVBQVV0RixJQUFJc0YsTUFBckMsSUFBK0MsYUFBYXRGLElBQUlzRixNQUFwRSxFQUE0RTtBQUMxRUQ7QUFDQTtBQUNEOztBQUNELE1BQUlWLFdBQVcvSCxhQUFhb0QsR0FBYixFQUFrQjJFLFFBQWpDOztBQUNBLE1BQUk7QUFDRkEsZUFBV1ksbUJBQW1CWixRQUFuQixDQUFYO0FBQ0QsR0FGRCxDQUVFLE9BQU9hLENBQVAsRUFBVTtBQUNWSDtBQUNBO0FBQ0Q7O0FBRUQsTUFBSUksZ0JBQWdCLFVBQVVDLENBQVYsRUFBYTtBQUMvQjdELFFBQUk4RCxTQUFKLENBQWMsR0FBZCxFQUFtQjtBQUNqQixzQkFBZ0I7QUFEQyxLQUFuQjtBQUdBOUQsUUFBSStELEtBQUosQ0FBVUYsQ0FBVjtBQUNBN0QsUUFBSWdFLEdBQUo7QUFDRCxHQU5EOztBQVFBLE1BQUlsQixhQUFhLDJCQUFiLElBQ0EsQ0FBRWxKLGdCQUFnQndKLG9CQUFoQixFQUROLEVBQzhDO0FBQzVDUSxrQkFBYyxpQ0FDQVosS0FBS0MsU0FBTCxDQUFlM0cseUJBQWYsQ0FEQSxHQUM0QyxHQUQxRDtBQUVBO0FBQ0QsR0FMRCxNQUtPLElBQUk4QixFQUFFNkYsR0FBRixDQUFNckIsa0JBQU4sRUFBMEJFLFFBQTFCLEtBQ0MsQ0FBRWxKLGdCQUFnQndKLG9CQUFoQixFQURQLEVBQytDO0FBQ3BEUSxrQkFBY2hCLG1CQUFtQkUsUUFBbkIsQ0FBZDtBQUNBO0FBQ0Q7O0FBRUQsUUFBTW9CLE9BQU9DLGtCQUNYckIsUUFEVyxFQUVYbkYsZ0JBQWdCUSxJQUFJSSxPQUFKLENBQVksWUFBWixDQUFoQixDQUZXLENBQWI7O0FBS0EsTUFBSSxDQUFFMkYsSUFBTixFQUFZO0FBQ1ZWO0FBQ0E7QUFDRCxHQXhDa0YsQ0EwQ25GO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTs7O0FBQ0EsUUFBTVksU0FBU0YsS0FBS0csU0FBTCxHQUNYLE9BQU8sRUFBUCxHQUFZLEVBQVosR0FBaUIsRUFBakIsR0FBc0IsR0FEWCxHQUVYLENBRko7O0FBSUEsTUFBSUgsS0FBS0csU0FBVCxFQUFvQjtBQUNsQjtBQUNBO0FBQ0E7QUFDQTtBQUNBckUsUUFBSXNFLFNBQUosQ0FBYyxNQUFkLEVBQXNCLFlBQXRCO0FBQ0QsR0EzRGtGLENBNkRuRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBLE1BQUlKLEtBQUtLLFlBQVQsRUFBdUI7QUFDckJ2RSxRQUFJc0UsU0FBSixDQUFjLGFBQWQsRUFDY2hJLDBCQUEwQkMsb0JBQTFCLEdBQ0EySCxLQUFLSyxZQUZuQjtBQUdEOztBQUVELE1BQUlMLEtBQUtNLElBQUwsS0FBYyxJQUFkLElBQ0FOLEtBQUtNLElBQUwsS0FBYyxZQURsQixFQUNnQztBQUM5QnhFLFFBQUlzRSxTQUFKLENBQWMsY0FBZCxFQUE4Qix1Q0FBOUI7QUFDRCxHQUhELE1BR08sSUFBSUosS0FBS00sSUFBTCxLQUFjLEtBQWxCLEVBQXlCO0FBQzlCeEUsUUFBSXNFLFNBQUosQ0FBYyxjQUFkLEVBQThCLHlCQUE5QjtBQUNELEdBRk0sTUFFQSxJQUFJSixLQUFLTSxJQUFMLEtBQWMsTUFBbEIsRUFBMEI7QUFDL0J4RSxRQUFJc0UsU0FBSixDQUFjLGNBQWQsRUFBOEIsaUNBQTlCO0FBQ0Q7O0FBRUQsTUFBSUosS0FBS3hILElBQVQsRUFBZTtBQUNic0QsUUFBSXNFLFNBQUosQ0FBYyxNQUFkLEVBQXNCLE1BQU1KLEtBQUt4SCxJQUFYLEdBQWtCLEdBQXhDO0FBQ0Q7O0FBRUQsTUFBSXdILEtBQUtPLE9BQVQsRUFBa0I7QUFDaEJ6RSxRQUFJK0QsS0FBSixDQUFVRyxLQUFLTyxPQUFmO0FBQ0F6RSxRQUFJZ0UsR0FBSjtBQUNELEdBSEQsTUFHTztBQUNMNUksU0FBSytDLEdBQUwsRUFBVStGLEtBQUtRLFlBQWYsRUFBNkI7QUFDM0JDLGNBQVFQLE1BRG1CO0FBRTNCUSxnQkFBVSxPQUZpQjtBQUVSO0FBQ25CQyxvQkFBYyxLQUhhLENBR1A7O0FBSE8sS0FBN0IsRUFJR3hFLEVBSkgsQ0FJTSxPQUpOLEVBSWUsVUFBVXlFLEdBQVYsRUFBZTtBQUM1QkMsVUFBSUMsS0FBSixDQUFVLCtCQUErQkYsR0FBekM7QUFDQTlFLFVBQUk4RCxTQUFKLENBQWMsR0FBZDtBQUNBOUQsVUFBSWdFLEdBQUo7QUFDRCxLQVJELEVBUUczRCxFQVJILENBUU0sV0FSTixFQVFtQixZQUFZO0FBQzdCMEUsVUFBSUMsS0FBSixDQUFVLDBCQUEwQmQsS0FBS1EsWUFBekM7QUFDQTFFLFVBQUk4RCxTQUFKLENBQWMsR0FBZDtBQUNBOUQsVUFBSWdFLEdBQUo7QUFDRCxLQVpELEVBWUdpQixJQVpILENBWVFqRixHQVpSO0FBYUQ7QUFDRixDQXhHRDs7QUEwR0EsU0FBU21FLGlCQUFULENBQTJCZSxZQUEzQixFQUF5QzVHLE9BQXpDLEVBQWtEO0FBQ2hELFFBQU07QUFBRTBDLFFBQUY7QUFBUW1FO0FBQVIsTUFBaUJDLGVBQWVGLFlBQWYsRUFBNkI1RyxPQUE3QixDQUF2Qjs7QUFFQSxNQUFJLENBQUU3QyxPQUFPNEosSUFBUCxDQUFZMUwsT0FBT3NDLGNBQW5CLEVBQW1DK0UsSUFBbkMsQ0FBTixFQUFnRDtBQUM5QyxXQUFPLElBQVA7QUFDRCxHQUwrQyxDQU9oRDtBQUNBOzs7QUFDQSxRQUFNc0UsaUJBQWlCNUosT0FBT2tHLElBQVAsQ0FBWTBCLGlCQUFaLENBQXZCO0FBQ0EsUUFBTWlDLFlBQVlELGVBQWVFLE9BQWYsQ0FBdUJ4RSxJQUF2QixDQUFsQjs7QUFDQSxNQUFJdUUsWUFBWSxDQUFoQixFQUFtQjtBQUNqQkQsbUJBQWVHLE9BQWYsQ0FBdUJILGVBQWVJLE1BQWYsQ0FBc0JILFNBQXRCLEVBQWlDLENBQWpDLEVBQW9DLENBQXBDLENBQXZCO0FBQ0Q7O0FBRUQsTUFBSXJCLE9BQU8sSUFBWDtBQUVBb0IsaUJBQWVLLElBQWYsQ0FBb0IzRSxRQUFRO0FBQzFCLFVBQU00RSxjQUFjdEMsa0JBQWtCdEMsSUFBbEIsQ0FBcEIsQ0FEMEIsQ0FHMUI7QUFDQTs7QUFDQSxRQUFJdkYsT0FBTzRKLElBQVAsQ0FBWU8sV0FBWixFQUF5QlYsWUFBekIsQ0FBSixFQUE0QztBQUMxQyxhQUFPaEIsT0FBTzBCLFlBQVlWLFlBQVosQ0FBZDtBQUNELEtBUHlCLENBUzFCOzs7QUFDQSxRQUFJQyxTQUFTRCxZQUFULElBQ0F6SixPQUFPNEosSUFBUCxDQUFZTyxXQUFaLEVBQXlCVCxJQUF6QixDQURKLEVBQ29DO0FBQ2xDLGFBQU9qQixPQUFPMEIsWUFBWVQsSUFBWixDQUFkO0FBQ0Q7QUFDRixHQWREO0FBZ0JBLFNBQU9qQixJQUFQO0FBQ0Q7O0FBRUQsU0FBU2tCLGNBQVQsQ0FBd0JELElBQXhCLEVBQThCN0csT0FBOUIsRUFBdUM7QUFDckMsUUFBTXVILFlBQVlWLEtBQUsvSCxLQUFMLENBQVcsR0FBWCxDQUFsQjtBQUNBLFFBQU0wSSxVQUFVRCxVQUFVLENBQVYsQ0FBaEI7O0FBRUEsTUFBSUMsUUFBUUMsVUFBUixDQUFtQixJQUFuQixDQUFKLEVBQThCO0FBQzVCLFVBQU1DLGNBQWMsU0FBU0YsUUFBUUcsS0FBUixDQUFjLENBQWQsQ0FBN0I7O0FBQ0EsUUFBSXhLLE9BQU80SixJQUFQLENBQVkxTCxPQUFPc0MsY0FBbkIsRUFBbUMrSixXQUFuQyxDQUFKLEVBQXFEO0FBQ25ESCxnQkFBVUgsTUFBVixDQUFpQixDQUFqQixFQUFvQixDQUFwQixFQURtRCxDQUMzQjs7QUFDeEIsYUFBTztBQUNMMUUsY0FBTWdGLFdBREQ7QUFFTGIsY0FBTVUsVUFBVXZMLElBQVYsQ0FBZSxHQUFmO0FBRkQsT0FBUDtBQUlEO0FBQ0YsR0Fib0MsQ0FlckM7QUFDQTs7O0FBQ0EsUUFBTTBHLE9BQU83RixTQUFTbUQsT0FBVCxJQUNULGFBRFMsR0FFVCxvQkFGSjs7QUFJQSxNQUFJN0MsT0FBTzRKLElBQVAsQ0FBWTFMLE9BQU9zQyxjQUFuQixFQUFtQytFLElBQW5DLENBQUosRUFBOEM7QUFDNUMsV0FBTztBQUFFQSxVQUFGO0FBQVFtRTtBQUFSLEtBQVA7QUFDRDs7QUFFRCxTQUFPO0FBQ0xuRSxVQUFNckgsT0FBT3FDLFdBRFI7QUFFTG1KO0FBRkssR0FBUDtBQUlELEMsQ0FFRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBdkwsZ0JBQWdCc00sU0FBaEIsR0FBNEJDLFFBQVE7QUFDbEMsTUFBSUMsYUFBYUMsU0FBU0YsSUFBVCxDQUFqQjs7QUFDQSxNQUFJRyxPQUFPQyxLQUFQLENBQWFILFVBQWIsQ0FBSixFQUE4QjtBQUM1QkEsaUJBQWFELElBQWI7QUFDRDs7QUFDRCxTQUFPQyxVQUFQO0FBQ0QsQ0FORDs7QUFRQSxTQUFTSSxlQUFULEdBQTJCO0FBQ3pCLE1BQUlDLGVBQWUsS0FBbkI7QUFDQSxNQUFJQyxZQUFZLElBQUkzSixPQUFPNEosaUJBQVgsRUFBaEI7O0FBRUEsTUFBSUMsa0JBQWtCLFVBQVVDLE9BQVYsRUFBbUI7QUFDdkMsV0FBT25ELG1CQUFtQmxKLFNBQVNxTSxPQUFULEVBQWtCL0QsUUFBckMsQ0FBUDtBQUNELEdBRkQ7O0FBSUFsSixrQkFBZ0JrTixvQkFBaEIsR0FBdUMsWUFBWTtBQUNqREosY0FBVUssT0FBVixDQUFrQixZQUFXO0FBQzNCekQsMEJBQW9CNUgsT0FBTytFLE1BQVAsQ0FBYyxJQUFkLENBQXBCOztBQUVBLGVBQVN1RyxxQkFBVCxDQUErQkMsVUFBL0IsRUFBMkNqRyxJQUEzQyxFQUFpRDtBQUMvQyxpQkFBU2tHLGFBQVQsQ0FBdUIvQixJQUF2QixFQUE2QmdDLElBQTdCLEVBQW1DO0FBQ2pDLGNBQUksQ0FBRTFMLE9BQU80SixJQUFQLENBQVkvQixpQkFBWixFQUErQnRDLElBQS9CLENBQU4sRUFBNEM7QUFDMUNzQyw4QkFBa0J0QyxJQUFsQixJQUEwQnRGLE9BQU8rRSxNQUFQLENBQWMsSUFBZCxDQUExQjtBQUNEOztBQUNENkMsNEJBQWtCdEMsSUFBbEIsRUFBd0JtRSxJQUF4QixJQUFnQ2dDLElBQWhDO0FBQ0QsU0FOOEMsQ0FRL0M7OztBQUNBLFlBQUlDLGlCQUFpQmhOLFNBQVNpTixxQkFBcUJDLFNBQTlCLEVBQ01MLFVBRE4sQ0FBckI7QUFFQSxZQUFJTSxZQUFZbE4sWUFBWStNLGNBQVosQ0FBaEI7QUFDQSxZQUFJSSxhQUFheEUsS0FBS3ZJLEtBQUwsQ0FBV29DLGlCQUFpQnVLLGNBQWpCLENBQVgsQ0FBakI7QUFDQSxZQUFJSSxXQUFXQyxNQUFYLEtBQXNCLGtCQUExQixFQUNFLE1BQU0sSUFBSXpJLEtBQUosQ0FBVSwyQ0FDQWdFLEtBQUtDLFNBQUwsQ0FBZXVFLFdBQVdDLE1BQTFCLENBRFYsQ0FBTjtBQUdGLFlBQUksQ0FBRUwsY0FBRixJQUFvQixDQUFFRyxTQUF0QixJQUFtQyxDQUFFQyxVQUF6QyxFQUNFLE1BQU0sSUFBSXhJLEtBQUosQ0FBVSxnQ0FBVixDQUFOO0FBRUYsWUFBSVcsV0FBVzZILFdBQVc3SCxRQUExQjs7QUFDQXZCLFVBQUVTLElBQUYsQ0FBT2MsUUFBUCxFQUFpQixVQUFVd0gsSUFBVixFQUFnQjtBQUMvQixjQUFJQSxLQUFLL0ssR0FBTCxJQUFZK0ssS0FBS08sS0FBTCxLQUFlLFFBQS9CLEVBQXlDO0FBQ3ZDUiwwQkFBY04sZ0JBQWdCTyxLQUFLL0ssR0FBckIsQ0FBZCxFQUF5QztBQUN2Q3NJLDRCQUFjdEssU0FBU21OLFNBQVQsRUFBb0JKLEtBQUtoQyxJQUF6QixDQUR5QjtBQUV2Q2QseUJBQVc4QyxLQUFLOUMsU0FGdUI7QUFHdkMzSCxvQkFBTXlLLEtBQUt6SyxJQUg0QjtBQUl2QztBQUNBNkgsNEJBQWM0QyxLQUFLNUMsWUFMb0I7QUFNdkNDLG9CQUFNMkMsS0FBSzNDO0FBTjRCLGFBQXpDOztBQVNBLGdCQUFJMkMsS0FBS1EsU0FBVCxFQUFvQjtBQUNsQjtBQUNBO0FBQ0FULDRCQUFjTixnQkFBZ0JPLEtBQUs1QyxZQUFyQixDQUFkLEVBQWtEO0FBQ2hERyw4QkFBY3RLLFNBQVNtTixTQUFULEVBQW9CSixLQUFLUSxTQUF6QixDQURrQztBQUVoRHRELDJCQUFXO0FBRnFDLGVBQWxEO0FBSUQ7QUFDRjtBQUNGLFNBcEJEOztBQXNCQSxZQUFJdUQsVUFBVTtBQUNaSCxrQkFBUSxrQkFESTtBQUVaOUgsb0JBQVVBLFFBRkU7QUFHWjdELG1CQUFTK0wsUUFBUUMsR0FBUixDQUFZQyxrQkFBWixJQUNQdkksY0FBY0QsbUJBQWQsQ0FDRUksUUFERixFQUVFLElBRkYsRUFHRXZCLEVBQUVJLElBQUYsQ0FBT2xDLHlCQUFQLEVBQWtDLGlCQUFsQyxDQUhGLENBSlU7QUFTWjBMLHdDQUE4QlIsV0FBV1EsNEJBVDdCO0FBVVpDLDJCQUFpQjNMLDBCQUEwQjJMO0FBVi9CLFNBQWQ7QUFhQXRPLGVBQU9zQyxjQUFQLENBQXNCK0UsSUFBdEIsSUFBOEI0RyxPQUE5QixDQXhEK0MsQ0EwRC9DO0FBQ0E7O0FBQ0EsY0FBTU0sb0JBQW9CLFFBQVFsSCxLQUFLbUgsT0FBTCxDQUFhLFFBQWIsRUFBdUIsRUFBdkIsQ0FBbEM7QUFDQSxjQUFNQyxjQUFjRixvQkFDbEJ0QixnQkFBZ0IsZ0JBQWhCLENBREY7QUFHQU0sc0JBQWNrQixXQUFkLEVBQTJCO0FBQ3pCM0QsbUJBQVN6QixLQUFLQyxTQUFMLENBQWUyRSxPQUFmLENBRGdCO0FBRXpCdkQscUJBQVcsS0FGYztBQUd6QjNILGdCQUFNa0wsUUFBUTlMLE9BSFc7QUFJekIwSSxnQkFBTTtBQUptQixTQUEzQjtBQU1EOztBQUVELFVBQUk7QUFDRixZQUFJNkQsY0FBY2hCLHFCQUFxQmlCLFVBQXJCLENBQWdDRCxXQUFsRDs7QUFDQWpLLFVBQUVTLElBQUYsQ0FBT3dKLFdBQVAsRUFBb0IsVUFBVXBCLFVBQVYsRUFBc0JqRyxJQUF0QixFQUE0QjtBQUM5QzlFLG1CQUFTOEUsSUFBVCxJQUFpQjNHLFlBQVk0TSxVQUFaLENBQWpCO0FBQ0FELGdDQUFzQkMsVUFBdEIsRUFBa0NqRyxJQUFsQztBQUNELFNBSEQsRUFGRSxDQU9GOzs7QUFDQXBILHdCQUFnQjBKLGlCQUFoQixHQUFvQ0EsaUJBQXBDO0FBQ0QsT0FURCxDQVNFLE9BQU9LLENBQVAsRUFBVTtBQUNWb0IsWUFBSUMsS0FBSixDQUFVLHlDQUF5Q3JCLEVBQUU0RSxLQUFyRDtBQUNBVixnQkFBUVcsSUFBUixDQUFhLENBQWI7QUFDRDtBQUNGLEtBeEZEO0FBeUZELEdBMUZEOztBQTRGQTVPLGtCQUFnQjZPLG1CQUFoQixHQUFzQyxZQUFZO0FBQ2hEO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBSUMsd0JBQXdCO0FBQzFCLHFCQUFlO0FBQ2JuRyxnQ0FBd0I7QUFDdEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQW9HLHNDQUE0QmQsUUFBUUMsR0FBUixDQUFZYyxjQUFaLElBQzFCN0wsT0FBTzhMLFdBQVAsRUFab0I7QUFhdEJDLG9CQUFVakIsUUFBUUMsR0FBUixDQUFZaUIsZUFBWixJQUNSaE0sT0FBTzhMLFdBQVA7QUFkb0I7QUFEWCxPQURXO0FBb0IxQixxQkFBZTtBQUNidEcsZ0NBQXdCO0FBQ3RCcEgsb0JBQVU7QUFEWTtBQURYLE9BcEJXO0FBMEIxQiw0QkFBc0I7QUFDcEJvSCxnQ0FBd0I7QUFDdEJwSCxvQkFBVTtBQURZO0FBREo7QUExQkksS0FBNUI7QUFpQ0F1TCxjQUFVSyxPQUFWLENBQWtCLFlBQVc7QUFDM0IsWUFBTWlDLFNBQVMsRUFBZjs7QUFFQTVLLFFBQUVTLElBQUYsQ0FBT2xGLE9BQU9zQyxjQUFkLEVBQThCLFVBQVUyTCxPQUFWLEVBQW1CbEksUUFBbkIsRUFBNkI7QUFDekRhLDBCQUFrQmIsUUFBbEIsSUFDRTlGLGdCQUFnQnVJLDJCQUFoQixDQUNFekMsUUFERixFQUVFa0ksUUFBUWpJLFFBRlYsRUFHRStJLHNCQUFzQmhKLFFBQXRCLENBSEYsQ0FERjtBQU9BLGNBQU11SixXQUFXMUksa0JBQWtCYixRQUFsQixFQUE0QjRCLFFBQTVCLENBQXFDNEgsR0FBdEQ7QUFDQUQsaUJBQVNwSCxPQUFULENBQWlCc0gsUUFBUUgsT0FBTzlKLElBQVAsQ0FBWTtBQUNuQzlDLGVBQUtELDJCQUEyQmdOLEtBQUsvTSxHQUFoQztBQUQ4QixTQUFaLENBQXpCO0FBR0QsT0FaRCxFQUgyQixDQWlCM0I7OztBQUNBZ04sNEJBQXNCLEVBQXRCO0FBRUF4UCxzQkFBZ0J5UCxpQkFBaEIsR0FBb0M7QUFBRUw7QUFBRixPQUFwQztBQUNELEtBckJEO0FBc0JELEdBNUREOztBQThEQXBQLGtCQUFnQmtOLG9CQUFoQixHQWxLeUIsQ0FvS3pCOztBQUNBLE1BQUl3QyxNQUFNM08sU0FBVixDQXJLeUIsQ0F1S3pCO0FBQ0E7O0FBQ0EsTUFBSTRPLHFCQUFxQjVPLFNBQXpCO0FBQ0EyTyxNQUFJRSxHQUFKLENBQVFELGtCQUFSLEVBMUt5QixDQTRLekI7O0FBQ0FELE1BQUlFLEdBQUosQ0FBUTVPLFVBQVIsRUE3S3lCLENBK0t6Qjs7QUFDQTBPLE1BQUlFLEdBQUosQ0FBUTNPLGNBQVIsRUFoTHlCLENBa0x6QjtBQUNBOztBQUNBeU8sTUFBSUUsR0FBSixDQUFRLFVBQVNyTCxHQUFULEVBQWM2QixHQUFkLEVBQW1Cd0QsSUFBbkIsRUFBeUI7QUFDL0IsUUFBSXBFLFlBQVlxSyxVQUFaLENBQXVCdEwsSUFBSS9CLEdBQTNCLENBQUosRUFBcUM7QUFDbkNvSDtBQUNBO0FBQ0Q7O0FBQ0R4RCxRQUFJOEQsU0FBSixDQUFjLEdBQWQ7QUFDQTlELFFBQUkrRCxLQUFKLENBQVUsYUFBVjtBQUNBL0QsUUFBSWdFLEdBQUo7QUFDRCxHQVJEOztBQVVBLFdBQVMwRixZQUFULENBQXNCdkUsSUFBdEIsRUFBNEI7QUFDMUIsVUFBTWhJLFFBQVFnSSxLQUFLL0gsS0FBTCxDQUFXLEdBQVgsQ0FBZDs7QUFDQSxXQUFPRCxNQUFNLENBQU4sTUFBYSxFQUFwQixFQUF3QkEsTUFBTXdNLEtBQU47O0FBQ3hCLFdBQU94TSxLQUFQO0FBQ0Q7O0FBRUQsV0FBU3lNLFVBQVQsQ0FBb0JDLE1BQXBCLEVBQTRCQyxLQUE1QixFQUFtQztBQUNqQyxXQUFPRCxPQUFPdE0sTUFBUCxJQUFpQnVNLE1BQU12TSxNQUF2QixJQUNMc00sT0FBT0UsS0FBUCxDQUFhLENBQUNDLElBQUQsRUFBTzFNLENBQVAsS0FBYTBNLFNBQVNGLE1BQU14TSxDQUFOLENBQW5DLENBREY7QUFFRCxHQXZNd0IsQ0F5TXpCOzs7QUFDQWdNLE1BQUlFLEdBQUosQ0FBUSxVQUFVN0ssT0FBVixFQUFtQnNMLFFBQW5CLEVBQTZCekcsSUFBN0IsRUFBbUM7QUFDekMsVUFBTTBHLGFBQWE1TiwwQkFBMEJDLG9CQUE3QztBQUNBLFVBQU07QUFBRXVHO0FBQUYsUUFBZXRJLFNBQVNtRSxRQUFRdkMsR0FBakIsQ0FBckIsQ0FGeUMsQ0FJekM7O0FBQ0EsUUFBSThOLFVBQUosRUFBZ0I7QUFDZCxZQUFNQyxjQUFjVCxhQUFhUSxVQUFiLENBQXBCO0FBQ0EsWUFBTXJFLFlBQVk2RCxhQUFhNUcsUUFBYixDQUFsQjs7QUFDQSxVQUFJOEcsV0FBV08sV0FBWCxFQUF3QnRFLFNBQXhCLENBQUosRUFBd0M7QUFDdENsSCxnQkFBUXZDLEdBQVIsR0FBYyxNQUFNeUosVUFBVUksS0FBVixDQUFnQmtFLFlBQVk1TSxNQUE1QixFQUFvQ2pELElBQXBDLENBQXlDLEdBQXpDLENBQXBCO0FBQ0EsZUFBT2tKLE1BQVA7QUFDRDtBQUNGOztBQUVELFFBQUlWLGFBQWEsY0FBYixJQUNBQSxhQUFhLGFBRGpCLEVBQ2dDO0FBQzlCLGFBQU9VLE1BQVA7QUFDRDs7QUFFRCxRQUFJMEcsVUFBSixFQUFnQjtBQUNkRCxlQUFTbkcsU0FBVCxDQUFtQixHQUFuQjtBQUNBbUcsZUFBU2xHLEtBQVQsQ0FBZSxjQUFmO0FBQ0FrRyxlQUFTakcsR0FBVDtBQUNBO0FBQ0Q7O0FBRURSO0FBQ0QsR0EzQkQsRUExTXlCLENBdU96QjtBQUNBOztBQUNBOEYsTUFBSUUsR0FBSixDQUFRMU8sT0FBUixFQXpPeUIsQ0EyT3pCO0FBQ0E7O0FBQ0F3TyxNQUFJRSxHQUFKLENBQVEsVUFBVXJMLEdBQVYsRUFBZTZCLEdBQWYsRUFBb0J3RCxJQUFwQixFQUEwQjtBQUNoQzVKLG9CQUFnQjJKLHFCQUFoQixDQUFzQ0QsaUJBQXRDLEVBQXlEbkYsR0FBekQsRUFBOEQ2QixHQUE5RCxFQUFtRXdELElBQW5FO0FBQ0QsR0FGRCxFQTdPeUIsQ0FpUHpCO0FBQ0E7O0FBQ0E4RixNQUFJRSxHQUFKLENBQVE1UCxnQkFBZ0J3USxzQkFBaEIsR0FBeUN6UCxTQUFqRCxFQW5QeUIsQ0FxUHpCO0FBQ0E7O0FBQ0EsTUFBSTBQLHdCQUF3QjFQLFNBQTVCO0FBQ0EyTyxNQUFJRSxHQUFKLENBQVFhLHFCQUFSO0FBRUEsTUFBSUMsd0JBQXdCLEtBQTVCLENBMVB5QixDQTJQekI7QUFDQTtBQUNBOztBQUNBaEIsTUFBSUUsR0FBSixDQUFRLFVBQVUxRSxHQUFWLEVBQWUzRyxHQUFmLEVBQW9CNkIsR0FBcEIsRUFBeUJ3RCxJQUF6QixFQUErQjtBQUNyQyxRQUFJLENBQUNzQixHQUFELElBQVEsQ0FBQ3dGLHFCQUFULElBQWtDLENBQUNuTSxJQUFJSSxPQUFKLENBQVksa0JBQVosQ0FBdkMsRUFBd0U7QUFDdEVpRixXQUFLc0IsR0FBTDtBQUNBO0FBQ0Q7O0FBQ0Q5RSxRQUFJOEQsU0FBSixDQUFjZ0IsSUFBSXlGLE1BQWxCLEVBQTBCO0FBQUUsc0JBQWdCO0FBQWxCLEtBQTFCO0FBQ0F2SyxRQUFJZ0UsR0FBSixDQUFRLGtCQUFSO0FBQ0QsR0FQRDtBQVNBc0YsTUFBSUUsR0FBSixDQUFRLFVBQVVyTCxHQUFWLEVBQWU2QixHQUFmLEVBQW9Cd0QsSUFBcEIsRUFBMEI7QUFDaEMsUUFBSSxDQUFFckUsT0FBT2hCLElBQUkvQixHQUFYLENBQU4sRUFBdUI7QUFDckIsYUFBT29ILE1BQVA7QUFFRCxLQUhELE1BR087QUFDTCxVQUFJakYsVUFBVTtBQUNaLHdCQUFnQjtBQURKLE9BQWQ7O0FBSUEsVUFBSWtJLFlBQUosRUFBa0I7QUFDaEJsSSxnQkFBUSxZQUFSLElBQXdCLE9BQXhCO0FBQ0Q7O0FBRUQsVUFBSUksVUFBVWhGLE9BQU91RSxpQkFBUCxDQUF5QkMsR0FBekIsQ0FBZDs7QUFFQSxVQUFJUSxRQUFRdkMsR0FBUixDQUFZdEIsS0FBWixJQUFxQjZELFFBQVF2QyxHQUFSLENBQVl0QixLQUFaLENBQWtCLHFCQUFsQixDQUF6QixFQUFtRTtBQUNqRTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBeUQsZ0JBQVEsY0FBUixJQUEwQix5QkFBMUI7QUFDQUEsZ0JBQVEsZUFBUixJQUEyQixVQUEzQjtBQUNBeUIsWUFBSThELFNBQUosQ0FBYyxHQUFkLEVBQW1CdkYsT0FBbkI7QUFDQXlCLFlBQUkrRCxLQUFKLENBQVUsNENBQVY7QUFDQS9ELFlBQUlnRSxHQUFKO0FBQ0E7QUFDRDs7QUFFRCxVQUFJckYsUUFBUXZDLEdBQVIsQ0FBWXRCLEtBQVosSUFBcUI2RCxRQUFRdkMsR0FBUixDQUFZdEIsS0FBWixDQUFrQixvQkFBbEIsQ0FBekIsRUFBa0U7QUFDaEU7QUFDQTtBQUNBO0FBQ0E7QUFDQXlELGdCQUFRLGVBQVIsSUFBMkIsVUFBM0I7QUFDQXlCLFlBQUk4RCxTQUFKLENBQWMsR0FBZCxFQUFtQnZGLE9BQW5CO0FBQ0F5QixZQUFJZ0UsR0FBSixDQUFRLGVBQVI7QUFDQTtBQUNEOztBQUVELFVBQUlyRixRQUFRdkMsR0FBUixDQUFZdEIsS0FBWixJQUFxQjZELFFBQVF2QyxHQUFSLENBQVl0QixLQUFaLENBQWtCLHlCQUFsQixDQUF6QixFQUF1RTtBQUNyRTtBQUNBO0FBQ0E7QUFDQTtBQUNBeUQsZ0JBQVEsZUFBUixJQUEyQixVQUEzQjtBQUNBeUIsWUFBSThELFNBQUosQ0FBYyxHQUFkLEVBQW1CdkYsT0FBbkI7QUFDQXlCLFlBQUlnRSxHQUFKLENBQVEsZUFBUjtBQUNBO0FBQ0Q7O0FBRUQsYUFBTy9DLG9CQUNMdEMsT0FESyxFQUVMeUcsZUFDRXJLLGFBQWFvRCxHQUFiLEVBQWtCMkUsUUFEcEIsRUFFRW5FLFFBQVFMLE9BRlYsRUFHRTBDLElBTEcsRUFNTGMsSUFOSyxDQU1BLENBQUM7QUFBRUUsY0FBRjtBQUFVRSxrQkFBVjtBQUFzQjNELGlCQUFTaU07QUFBL0IsT0FBRCxLQUFpRDtBQUN0RCxZQUFJLENBQUN0SSxVQUFMLEVBQWlCO0FBQ2ZBLHVCQUFhbEMsSUFBSWtDLFVBQUosR0FBaUJsQyxJQUFJa0MsVUFBckIsR0FBa0MsR0FBL0M7QUFDRDs7QUFFRCxZQUFJc0ksVUFBSixFQUFnQjtBQUNkOU8saUJBQU8yRixNQUFQLENBQWM5QyxPQUFkLEVBQXVCaU0sVUFBdkI7QUFDRDs7QUFFRHhLLFlBQUk4RCxTQUFKLENBQWM1QixVQUFkLEVBQTBCM0QsT0FBMUI7QUFFQXlELGVBQU9pRCxJQUFQLENBQVlqRixHQUFaLEVBQWlCO0FBQ2Y7QUFDQWdFLGVBQUs7QUFGVSxTQUFqQjtBQUtELE9BdEJNLEVBc0JKeUcsS0F0QkksQ0FzQkV6RixTQUFTO0FBQ2hCRCxZQUFJQyxLQUFKLENBQVUsNkJBQTZCQSxNQUFNdUQsS0FBN0M7QUFDQXZJLFlBQUk4RCxTQUFKLENBQWMsR0FBZCxFQUFtQnZGLE9BQW5CO0FBQ0F5QixZQUFJZ0UsR0FBSjtBQUNELE9BMUJNLENBQVA7QUEyQkQ7QUFDRixHQWpGRCxFQXZReUIsQ0EwVnpCOztBQUNBc0YsTUFBSUUsR0FBSixDQUFRLFVBQVVyTCxHQUFWLEVBQWU2QixHQUFmLEVBQW9CO0FBQzFCQSxRQUFJOEQsU0FBSixDQUFjLEdBQWQ7QUFDQTlELFFBQUlnRSxHQUFKO0FBQ0QsR0FIRDtBQU1BLE1BQUkwRyxhQUFhdlEsYUFBYW1QLEdBQWIsQ0FBakI7QUFDQSxNQUFJcUIsdUJBQXVCLEVBQTNCLENBbFd5QixDQW9XekI7QUFDQTtBQUNBOztBQUNBRCxhQUFXekssVUFBWCxDQUFzQjFFLG9CQUF0QixFQXZXeUIsQ0F5V3pCO0FBQ0E7QUFDQTs7QUFDQW1QLGFBQVdySyxFQUFYLENBQWMsU0FBZCxFQUF5QjFHLE9BQU9vRyxpQ0FBaEMsRUE1V3lCLENBOFd6QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQTJLLGFBQVdySyxFQUFYLENBQWMsYUFBZCxFQUE2QixDQUFDeUUsR0FBRCxFQUFNOEYsTUFBTixLQUFpQjtBQUM1QztBQUNBLFFBQUlBLE9BQU9DLFNBQVgsRUFBc0I7QUFDcEI7QUFDRDs7QUFFRCxRQUFJL0YsSUFBSWdHLE9BQUosS0FBZ0IsYUFBcEIsRUFBbUM7QUFDakNGLGFBQU81RyxHQUFQLENBQVcsa0NBQVg7QUFDRCxLQUZELE1BRU87QUFDTDtBQUNBO0FBQ0E0RyxhQUFPRyxPQUFQLENBQWVqRyxHQUFmO0FBQ0Q7QUFDRixHQWJELEVBclh5QixDQW9ZekI7O0FBQ0ExRyxJQUFFQyxNQUFGLENBQVMxRSxNQUFULEVBQWlCO0FBQ2ZxUixxQkFBaUJYLHFCQURGO0FBRWZkLHdCQUFvQkEsa0JBRkw7QUFHZm1CLGdCQUFZQSxVQUhHO0FBSWZPLGdCQUFZM0IsR0FKRztBQUtmO0FBQ0FnQiwyQkFBdUIsWUFBWTtBQUNqQ0EsOEJBQXdCLElBQXhCO0FBQ0QsS0FSYztBQVNmWSxpQkFBYSxVQUFVQyxDQUFWLEVBQWE7QUFDeEIsVUFBSVIsb0JBQUosRUFDRUEscUJBQXFCekwsSUFBckIsQ0FBMEJpTSxDQUExQixFQURGLEtBR0VBO0FBQ0gsS0FkYztBQWVmO0FBQ0E7QUFDQUMsb0JBQWdCLFVBQVVWLFVBQVYsRUFBc0JXLGFBQXRCLEVBQXFDQyxFQUFyQyxFQUF5QztBQUN2RFosaUJBQVdhLE1BQVgsQ0FBa0JGLGFBQWxCLEVBQWlDQyxFQUFqQztBQUNEO0FBbkJjLEdBQWpCLEVBcll5QixDQTJaekI7QUFDQTtBQUNBOzs7QUFDQUUsVUFBUUMsSUFBUixHQUFlQyxRQUFRO0FBQ3JCOVIsb0JBQWdCNk8sbUJBQWhCOztBQUVBLFVBQU1rRCxrQkFBa0JOLGlCQUFpQjtBQUN2QzFSLGFBQU95UixjQUFQLENBQXNCVixVQUF0QixFQUFrQ1csYUFBbEMsRUFBaUR0TyxPQUFPNk8sZUFBUCxDQUF1QixNQUFNO0FBQzVFLFlBQUkvRCxRQUFRQyxHQUFSLENBQVkrRCxzQkFBaEIsRUFBd0M7QUFDdENDLGtCQUFRQyxHQUFSLENBQVksV0FBWjtBQUNEOztBQUNELGNBQU1DLFlBQVlyQixvQkFBbEI7QUFDQUEsK0JBQXVCLElBQXZCO0FBQ0FxQixrQkFBVW5LLE9BQVYsQ0FBa0JqQixZQUFZO0FBQUVBO0FBQWEsU0FBN0M7QUFDRCxPQVBnRCxFQU85QytDLEtBQUs7QUFDTm1JLGdCQUFROUcsS0FBUixDQUFjLGtCQUFkLEVBQWtDckIsQ0FBbEM7QUFDQW1JLGdCQUFROUcsS0FBUixDQUFjckIsS0FBS0EsRUFBRTRFLEtBQXJCO0FBQ0QsT0FWZ0QsQ0FBakQ7QUFXRCxLQVpEOztBQWNBLFFBQUkwRCxZQUFZcEUsUUFBUUMsR0FBUixDQUFZb0UsSUFBWixJQUFvQixDQUFwQztBQUNBLFVBQU1DLGlCQUFpQnRFLFFBQVFDLEdBQVIsQ0FBWXNFLGdCQUFuQzs7QUFFQSxRQUFJRCxjQUFKLEVBQW9CO0FBQ2xCO0FBQ0E5USwrQkFBeUI4USxjQUF6QjtBQUNBUixzQkFBZ0I7QUFBRXhHLGNBQU1nSDtBQUFSLE9BQWhCO0FBQ0E3USxnQ0FBMEI2USxjQUExQjtBQUNELEtBTEQsTUFLTztBQUNMRixrQkFBWTFGLE1BQU1ELE9BQU8yRixTQUFQLENBQU4sSUFBMkJBLFNBQTNCLEdBQXVDM0YsT0FBTzJGLFNBQVAsQ0FBbkQ7O0FBQ0EsVUFBSSxxQkFBcUJJLElBQXJCLENBQTBCSixTQUExQixDQUFKLEVBQTBDO0FBQ3hDO0FBQ0FOLHdCQUFnQjtBQUFFeEcsZ0JBQU04RztBQUFSLFNBQWhCO0FBQ0QsT0FIRCxNQUdPLElBQUksT0FBT0EsU0FBUCxLQUFxQixRQUF6QixFQUFtQztBQUN4QztBQUNBTix3QkFBZ0I7QUFDZHhGLGdCQUFNOEYsU0FEUTtBQUVkSyxnQkFBTXpFLFFBQVFDLEdBQVIsQ0FBWXlFLE9BQVosSUFBdUI7QUFGZixTQUFoQjtBQUlELE9BTk0sTUFNQTtBQUNMLGNBQU0sSUFBSXZOLEtBQUosQ0FBVSx3QkFBVixDQUFOO0FBQ0Q7QUFDRjs7QUFFRCxXQUFPLFFBQVA7QUFDRCxHQTFDRDtBQTJDRDs7QUFHRHdIO0FBR0EsSUFBSXBELHVCQUF1QixJQUEzQjs7QUFFQXhKLGdCQUFnQndKLG9CQUFoQixHQUF1QyxZQUFZO0FBQ2pELFNBQU9BLG9CQUFQO0FBQ0QsQ0FGRDs7QUFJQXhKLGdCQUFnQjRTLHVCQUFoQixHQUEwQyxVQUFVQyxLQUFWLEVBQWlCO0FBQ3pEckoseUJBQXVCcUosS0FBdkI7QUFDQTdTLGtCQUFnQjZPLG1CQUFoQjtBQUNELENBSEQ7O0FBTUE3TyxnQkFBZ0I4Uyw2QkFBaEIsR0FBZ0QsVUFBVUMsTUFBVixFQUFrQjtBQUNoRXhRLCtCQUE2QndRLE1BQTdCO0FBQ0EvUyxrQkFBZ0I2TyxtQkFBaEI7QUFDRCxDQUhEOztBQUtBN08sZ0JBQWdCZ1QscUJBQWhCLEdBQXdDLFVBQVUvQyxNQUFWLEVBQWtCO0FBQ3hELE1BQUlnRCxPQUFPLElBQVg7QUFDQUEsT0FBS0gsNkJBQUwsQ0FDRSxVQUFVdFEsR0FBVixFQUFlO0FBQ2IsV0FBT3lOLFNBQVN6TixHQUFoQjtBQUNILEdBSEQ7QUFJRCxDQU5ELEMsQ0FRQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0EsSUFBSXdHLHFCQUFxQixFQUF6Qjs7QUFDQWhKLGdCQUFnQmtULFdBQWhCLEdBQThCLFVBQVVyUSxRQUFWLEVBQW9CO0FBQ2hEbUcscUJBQW1CLE1BQU1wRyxLQUFLQyxRQUFMLENBQU4sR0FBdUIsS0FBMUMsSUFBbURBLFFBQW5EO0FBQ0QsQ0FGRCxDLENBSUE7OztBQUNBN0MsZ0JBQWdCbUgsY0FBaEIsR0FBaUNBLGNBQWpDO0FBQ0FuSCxnQkFBZ0JnSixrQkFBaEIsR0FBcUNBLGtCQUFyQyxDOzs7Ozs7Ozs7OztBQ25pQ0FuSixPQUFPQyxNQUFQLENBQWM7QUFBQ2lCLFdBQVEsTUFBSUE7QUFBYixDQUFkO0FBQXFDLElBQUlvUyxVQUFKO0FBQWV0VCxPQUFPSyxLQUFQLENBQWFDLFFBQVEsU0FBUixDQUFiLEVBQWdDO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDOFMsaUJBQVc5UyxDQUFYO0FBQWE7O0FBQXpCLENBQWhDLEVBQTJELENBQTNEOztBQUU3QyxTQUFTVSxPQUFULENBQWlCLEdBQUdxUyxXQUFwQixFQUFpQztBQUN0QyxRQUFNQyxXQUFXRixXQUFXRyxLQUFYLENBQWlCLElBQWpCLEVBQXVCRixXQUF2QixDQUFqQjtBQUNBLFFBQU1HLGNBQWNGLFNBQVN6RCxHQUE3QixDQUZzQyxDQUl0QztBQUNBOztBQUNBeUQsV0FBU3pELEdBQVQsR0FBZSxTQUFTQSxHQUFULENBQWEsR0FBRzRELE9BQWhCLEVBQXlCO0FBQ3RDLFVBQU07QUFBRTdFO0FBQUYsUUFBWSxJQUFsQjtBQUNBLFVBQU04RSxpQkFBaUI5RSxNQUFNaEwsTUFBN0I7QUFDQSxVQUFNd0UsU0FBU29MLFlBQVlELEtBQVosQ0FBa0IsSUFBbEIsRUFBd0JFLE9BQXhCLENBQWYsQ0FIc0MsQ0FLdEM7QUFDQTtBQUNBOztBQUNBLFNBQUssSUFBSTlQLElBQUkrUCxjQUFiLEVBQTZCL1AsSUFBSWlMLE1BQU1oTCxNQUF2QyxFQUErQyxFQUFFRCxDQUFqRCxFQUFvRDtBQUNsRCxZQUFNZ1EsUUFBUS9FLE1BQU1qTCxDQUFOLENBQWQ7QUFDQSxZQUFNaVEsaUJBQWlCRCxNQUFNRSxNQUE3Qjs7QUFFQSxVQUFJRCxlQUFlaFEsTUFBZixJQUF5QixDQUE3QixFQUFnQztBQUM5QjtBQUNBO0FBQ0E7QUFDQTtBQUNBK1AsY0FBTUUsTUFBTixHQUFlLFNBQVNBLE1BQVQsQ0FBZ0IxSSxHQUFoQixFQUFxQjNHLEdBQXJCLEVBQTBCNkIsR0FBMUIsRUFBK0J3RCxJQUEvQixFQUFxQztBQUNsRCxpQkFBTzlCLFFBQVErTCxVQUFSLENBQW1CRixjQUFuQixFQUFtQyxJQUFuQyxFQUF5Q0csU0FBekMsQ0FBUDtBQUNELFNBRkQ7QUFHRCxPQVJELE1BUU87QUFDTEosY0FBTUUsTUFBTixHQUFlLFNBQVNBLE1BQVQsQ0FBZ0JyUCxHQUFoQixFQUFxQjZCLEdBQXJCLEVBQTBCd0QsSUFBMUIsRUFBZ0M7QUFDN0MsaUJBQU85QixRQUFRK0wsVUFBUixDQUFtQkYsY0FBbkIsRUFBbUMsSUFBbkMsRUFBeUNHLFNBQXpDLENBQVA7QUFDRCxTQUZEO0FBR0Q7QUFDRjs7QUFFRCxXQUFPM0wsTUFBUDtBQUNELEdBNUJEOztBQThCQSxTQUFPa0wsUUFBUDtBQUNELEM7Ozs7Ozs7Ozs7O0FDdkNEeFQsT0FBT0MsTUFBUCxDQUFjO0FBQUMyQiw0QkFBeUIsTUFBSUEsd0JBQTlCO0FBQXVEQyw2QkFBMEIsTUFBSUE7QUFBckYsQ0FBZDtBQUErSCxJQUFJcVMsUUFBSixFQUFhQyxVQUFiLEVBQXdCQyxVQUF4QjtBQUFtQ3BVLE9BQU9LLEtBQVAsQ0FBYUMsUUFBUSxJQUFSLENBQWIsRUFBMkI7QUFBQzRULFdBQVMxVCxDQUFULEVBQVc7QUFBQzBULGVBQVMxVCxDQUFUO0FBQVcsR0FBeEI7O0FBQXlCMlQsYUFBVzNULENBQVgsRUFBYTtBQUFDMlQsaUJBQVczVCxDQUFYO0FBQWEsR0FBcEQ7O0FBQXFENFQsYUFBVzVULENBQVgsRUFBYTtBQUFDNFQsaUJBQVc1VCxDQUFYO0FBQWE7O0FBQWhGLENBQTNCLEVBQTZHLENBQTdHOztBQXlCM0osTUFBTW9CLDJCQUE0QnlTLFVBQUQsSUFBZ0I7QUFDdEQsTUFBSTtBQUNGLFFBQUlILFNBQVNHLFVBQVQsRUFBcUJDLFFBQXJCLEVBQUosRUFBcUM7QUFDbkM7QUFDQTtBQUNBSCxpQkFBV0UsVUFBWDtBQUNELEtBSkQsTUFJTztBQUNMLFlBQU0sSUFBSTlPLEtBQUosQ0FDSCxrQ0FBaUM4TyxVQUFXLGtCQUE3QyxHQUNBLDhEQURBLEdBRUEsMkJBSEksQ0FBTjtBQUtEO0FBQ0YsR0FaRCxDQVlFLE9BQU85SSxLQUFQLEVBQWM7QUFDZDtBQUNBO0FBQ0E7QUFDQSxRQUFJQSxNQUFNZ0osSUFBTixLQUFlLFFBQW5CLEVBQTZCO0FBQzNCLFlBQU1oSixLQUFOO0FBQ0Q7QUFDRjtBQUNGLENBckJNOztBQTBCQSxNQUFNMUosNEJBQ1gsQ0FBQ3dTLFVBQUQsRUFBYUcsZUFBZXBHLE9BQTVCLEtBQXdDO0FBQ3RDLEdBQUMsTUFBRCxFQUFTLFFBQVQsRUFBbUIsUUFBbkIsRUFBNkIsU0FBN0IsRUFBd0NoRyxPQUF4QyxDQUFnRHFNLFVBQVU7QUFDeERELGlCQUFhNU4sRUFBYixDQUFnQjZOLE1BQWhCLEVBQXdCblIsT0FBTzZPLGVBQVAsQ0FBdUIsTUFBTTtBQUNuRCxVQUFJaUMsV0FBV0MsVUFBWCxDQUFKLEVBQTRCO0FBQzFCRixtQkFBV0UsVUFBWDtBQUNEO0FBQ0YsS0FKdUIsQ0FBeEI7QUFLRCxHQU5EO0FBT0QsQ0FUSSxDIiwiZmlsZSI6Ii9wYWNrYWdlcy93ZWJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXNzZXJ0IGZyb20gXCJhc3NlcnRcIjtcbmltcG9ydCB7IHJlYWRGaWxlIH0gZnJvbSBcImZzXCI7XG5pbXBvcnQgeyBjcmVhdGVTZXJ2ZXIgfSBmcm9tIFwiaHR0cFwiO1xuaW1wb3J0IHtcbiAgam9pbiBhcyBwYXRoSm9pbixcbiAgZGlybmFtZSBhcyBwYXRoRGlybmFtZSxcbn0gZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IHBhcnNlIGFzIHBhcnNlVXJsIH0gZnJvbSBcInVybFwiO1xuaW1wb3J0IHsgY3JlYXRlSGFzaCB9IGZyb20gXCJjcnlwdG9cIjtcbmltcG9ydCB7IGNvbm5lY3QgfSBmcm9tIFwiLi9jb25uZWN0LmpzXCI7XG5pbXBvcnQgY29tcHJlc3MgZnJvbSBcImNvbXByZXNzaW9uXCI7XG5pbXBvcnQgY29va2llUGFyc2VyIGZyb20gXCJjb29raWUtcGFyc2VyXCI7XG5pbXBvcnQgcXVlcnkgZnJvbSBcInFzLW1pZGRsZXdhcmVcIjtcbmltcG9ydCBwYXJzZVJlcXVlc3QgZnJvbSBcInBhcnNldXJsXCI7XG5pbXBvcnQgYmFzaWNBdXRoIGZyb20gXCJiYXNpYy1hdXRoLWNvbm5lY3RcIjtcbmltcG9ydCB7IGxvb2t1cCBhcyBsb29rdXBVc2VyQWdlbnQgfSBmcm9tIFwidXNlcmFnZW50XCI7XG5pbXBvcnQgeyBpc01vZGVybiB9IGZyb20gXCJtZXRlb3IvbW9kZXJuLWJyb3dzZXJzXCI7XG5pbXBvcnQgc2VuZCBmcm9tIFwic2VuZFwiO1xuaW1wb3J0IHtcbiAgcmVtb3ZlRXhpc3RpbmdTb2NrZXRGaWxlLFxuICByZWdpc3RlclNvY2tldEZpbGVDbGVhbnVwLFxufSBmcm9tICcuL3NvY2tldF9maWxlLmpzJztcblxudmFyIFNIT1JUX1NPQ0tFVF9USU1FT1VUID0gNSoxMDAwO1xudmFyIExPTkdfU09DS0VUX1RJTUVPVVQgPSAxMjAqMTAwMDtcblxuZXhwb3J0IGNvbnN0IFdlYkFwcCA9IHt9O1xuZXhwb3J0IGNvbnN0IFdlYkFwcEludGVybmFscyA9IHt9O1xuXG5jb25zdCBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG4vLyBiYWNrd2FyZHMgY29tcGF0IHRvIDIuMCBvZiBjb25uZWN0XG5jb25uZWN0LmJhc2ljQXV0aCA9IGJhc2ljQXV0aDtcblxuV2ViQXBwSW50ZXJuYWxzLk5wbU1vZHVsZXMgPSB7XG4gIGNvbm5lY3Q6IHtcbiAgICB2ZXJzaW9uOiBOcG0ucmVxdWlyZSgnY29ubmVjdC9wYWNrYWdlLmpzb24nKS52ZXJzaW9uLFxuICAgIG1vZHVsZTogY29ubmVjdCxcbiAgfVxufTtcblxuLy8gVGhvdWdoIHdlIG1pZ2h0IHByZWZlciB0byB1c2Ugd2ViLmJyb3dzZXIgKG1vZGVybikgYXMgdGhlIGRlZmF1bHRcbi8vIGFyY2hpdGVjdHVyZSwgc2FmZXR5IHJlcXVpcmVzIGEgbW9yZSBjb21wYXRpYmxlIGRlZmF1bHRBcmNoLlxuV2ViQXBwLmRlZmF1bHRBcmNoID0gJ3dlYi5icm93c2VyLmxlZ2FjeSc7XG5cbi8vIFhYWCBtYXBzIGFyY2hzIHRvIG1hbmlmZXN0c1xuV2ViQXBwLmNsaWVudFByb2dyYW1zID0ge307XG5cbi8vIFhYWCBtYXBzIGFyY2hzIHRvIHByb2dyYW0gcGF0aCBvbiBmaWxlc3lzdGVtXG52YXIgYXJjaFBhdGggPSB7fTtcblxudmFyIGJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rID0gZnVuY3Rpb24gKHVybCkge1xuICB2YXIgYnVuZGxlZFByZWZpeCA9XG4gICAgIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkxfUEFUSF9QUkVGSVggfHwgJyc7XG4gIHJldHVybiBidW5kbGVkUHJlZml4ICsgdXJsO1xufTtcblxudmFyIHNoYTEgPSBmdW5jdGlvbiAoY29udGVudHMpIHtcbiAgdmFyIGhhc2ggPSBjcmVhdGVIYXNoKCdzaGExJyk7XG4gIGhhc2gudXBkYXRlKGNvbnRlbnRzKTtcbiAgcmV0dXJuIGhhc2guZGlnZXN0KCdoZXgnKTtcbn07XG5cbnZhciByZWFkVXRmOEZpbGVTeW5jID0gZnVuY3Rpb24gKGZpbGVuYW1lKSB7XG4gIHJldHVybiBNZXRlb3Iud3JhcEFzeW5jKHJlYWRGaWxlKShmaWxlbmFtZSwgJ3V0ZjgnKTtcbn07XG5cbi8vICNCcm93c2VySWRlbnRpZmljYXRpb25cbi8vXG4vLyBXZSBoYXZlIG11bHRpcGxlIHBsYWNlcyB0aGF0IHdhbnQgdG8gaWRlbnRpZnkgdGhlIGJyb3dzZXI6IHRoZVxuLy8gdW5zdXBwb3J0ZWQgYnJvd3NlciBwYWdlLCB0aGUgYXBwY2FjaGUgcGFja2FnZSwgYW5kLCBldmVudHVhbGx5XG4vLyBkZWxpdmVyaW5nIGJyb3dzZXIgcG9seWZpbGxzIG9ubHkgYXMgbmVlZGVkLlxuLy9cbi8vIFRvIGF2b2lkIGRldGVjdGluZyB0aGUgYnJvd3NlciBpbiBtdWx0aXBsZSBwbGFjZXMgYWQtaG9jLCB3ZSBjcmVhdGUgYVxuLy8gTWV0ZW9yIFwiYnJvd3NlclwiIG9iamVjdC4gSXQgdXNlcyBidXQgZG9lcyBub3QgZXhwb3NlIHRoZSBucG1cbi8vIHVzZXJhZ2VudCBtb2R1bGUgKHdlIGNvdWxkIGNob29zZSBhIGRpZmZlcmVudCBtZWNoYW5pc20gdG8gaWRlbnRpZnlcbi8vIHRoZSBicm93c2VyIGluIHRoZSBmdXR1cmUgaWYgd2Ugd2FudGVkIHRvKS4gIFRoZSBicm93c2VyIG9iamVjdFxuLy8gY29udGFpbnNcbi8vXG4vLyAqIGBuYW1lYDogdGhlIG5hbWUgb2YgdGhlIGJyb3dzZXIgaW4gY2FtZWwgY2FzZVxuLy8gKiBgbWFqb3JgLCBgbWlub3JgLCBgcGF0Y2hgOiBpbnRlZ2VycyBkZXNjcmliaW5nIHRoZSBicm93c2VyIHZlcnNpb25cbi8vXG4vLyBBbHNvIGhlcmUgaXMgYW4gZWFybHkgdmVyc2lvbiBvZiBhIE1ldGVvciBgcmVxdWVzdGAgb2JqZWN0LCBpbnRlbmRlZFxuLy8gdG8gYmUgYSBoaWdoLWxldmVsIGRlc2NyaXB0aW9uIG9mIHRoZSByZXF1ZXN0IHdpdGhvdXQgZXhwb3Npbmdcbi8vIGRldGFpbHMgb2YgY29ubmVjdCdzIGxvdy1sZXZlbCBgcmVxYC4gIEN1cnJlbnRseSBpdCBjb250YWluczpcbi8vXG4vLyAqIGBicm93c2VyYDogYnJvd3NlciBpZGVudGlmaWNhdGlvbiBvYmplY3QgZGVzY3JpYmVkIGFib3ZlXG4vLyAqIGB1cmxgOiBwYXJzZWQgdXJsLCBpbmNsdWRpbmcgcGFyc2VkIHF1ZXJ5IHBhcmFtc1xuLy9cbi8vIEFzIGEgdGVtcG9yYXJ5IGhhY2sgdGhlcmUgaXMgYSBgY2F0ZWdvcml6ZVJlcXVlc3RgIGZ1bmN0aW9uIG9uIFdlYkFwcCB3aGljaFxuLy8gY29udmVydHMgYSBjb25uZWN0IGByZXFgIHRvIGEgTWV0ZW9yIGByZXF1ZXN0YC4gVGhpcyBjYW4gZ28gYXdheSBvbmNlIHNtYXJ0XG4vLyBwYWNrYWdlcyBzdWNoIGFzIGFwcGNhY2hlIGFyZSBiZWluZyBwYXNzZWQgYSBgcmVxdWVzdGAgb2JqZWN0IGRpcmVjdGx5IHdoZW5cbi8vIHRoZXkgc2VydmUgY29udGVudC5cbi8vXG4vLyBUaGlzIGFsbG93cyBgcmVxdWVzdGAgdG8gYmUgdXNlZCB1bmlmb3JtbHk6IGl0IGlzIHBhc3NlZCB0byB0aGUgaHRtbFxuLy8gYXR0cmlidXRlcyBob29rLCBhbmQgdGhlIGFwcGNhY2hlIHBhY2thZ2UgY2FuIHVzZSBpdCB3aGVuIGRlY2lkaW5nXG4vLyB3aGV0aGVyIHRvIGdlbmVyYXRlIGEgNDA0IGZvciB0aGUgbWFuaWZlc3QuXG4vL1xuLy8gUmVhbCByb3V0aW5nIC8gc2VydmVyIHNpZGUgcmVuZGVyaW5nIHdpbGwgcHJvYmFibHkgcmVmYWN0b3IgdGhpc1xuLy8gaGVhdmlseS5cblxuXG4vLyBlLmcuIFwiTW9iaWxlIFNhZmFyaVwiID0+IFwibW9iaWxlU2FmYXJpXCJcbnZhciBjYW1lbENhc2UgPSBmdW5jdGlvbiAobmFtZSkge1xuICB2YXIgcGFydHMgPSBuYW1lLnNwbGl0KCcgJyk7XG4gIHBhcnRzWzBdID0gcGFydHNbMF0udG9Mb3dlckNhc2UoKTtcbiAgZm9yICh2YXIgaSA9IDE7ICBpIDwgcGFydHMubGVuZ3RoOyAgKytpKSB7XG4gICAgcGFydHNbaV0gPSBwYXJ0c1tpXS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHBhcnRzW2ldLnN1YnN0cigxKTtcbiAgfVxuICByZXR1cm4gcGFydHMuam9pbignJyk7XG59O1xuXG52YXIgaWRlbnRpZnlCcm93c2VyID0gZnVuY3Rpb24gKHVzZXJBZ2VudFN0cmluZykge1xuICB2YXIgdXNlckFnZW50ID0gbG9va3VwVXNlckFnZW50KHVzZXJBZ2VudFN0cmluZyk7XG4gIHJldHVybiB7XG4gICAgbmFtZTogY2FtZWxDYXNlKHVzZXJBZ2VudC5mYW1pbHkpLFxuICAgIG1ham9yOiArdXNlckFnZW50Lm1ham9yLFxuICAgIG1pbm9yOiArdXNlckFnZW50Lm1pbm9yLFxuICAgIHBhdGNoOiArdXNlckFnZW50LnBhdGNoXG4gIH07XG59O1xuXG4vLyBYWFggUmVmYWN0b3IgYXMgcGFydCBvZiBpbXBsZW1lbnRpbmcgcmVhbCByb3V0aW5nLlxuV2ViQXBwSW50ZXJuYWxzLmlkZW50aWZ5QnJvd3NlciA9IGlkZW50aWZ5QnJvd3NlcjtcblxuV2ViQXBwLmNhdGVnb3JpemVSZXF1ZXN0ID0gZnVuY3Rpb24gKHJlcSkge1xuICByZXR1cm4gXy5leHRlbmQoe1xuICAgIGJyb3dzZXI6IGlkZW50aWZ5QnJvd3NlcihyZXEuaGVhZGVyc1sndXNlci1hZ2VudCddKSxcbiAgICB1cmw6IHBhcnNlVXJsKHJlcS51cmwsIHRydWUpXG4gIH0sIF8ucGljayhyZXEsICdkeW5hbWljSGVhZCcsICdkeW5hbWljQm9keScsICdoZWFkZXJzJywgJ2Nvb2tpZXMnKSk7XG59O1xuXG4vLyBIVE1MIGF0dHJpYnV0ZSBob29rczogZnVuY3Rpb25zIHRvIGJlIGNhbGxlZCB0byBkZXRlcm1pbmUgYW55IGF0dHJpYnV0ZXMgdG9cbi8vIGJlIGFkZGVkIHRvIHRoZSAnPGh0bWw+JyB0YWcuIEVhY2ggZnVuY3Rpb24gaXMgcGFzc2VkIGEgJ3JlcXVlc3QnIG9iamVjdCAoc2VlXG4vLyAjQnJvd3NlcklkZW50aWZpY2F0aW9uKSBhbmQgc2hvdWxkIHJldHVybiBudWxsIG9yIG9iamVjdC5cbnZhciBodG1sQXR0cmlidXRlSG9va3MgPSBbXTtcbnZhciBnZXRIdG1sQXR0cmlidXRlcyA9IGZ1bmN0aW9uIChyZXF1ZXN0KSB7XG4gIHZhciBjb21iaW5lZEF0dHJpYnV0ZXMgID0ge307XG4gIF8uZWFjaChodG1sQXR0cmlidXRlSG9va3MgfHwgW10sIGZ1bmN0aW9uIChob29rKSB7XG4gICAgdmFyIGF0dHJpYnV0ZXMgPSBob29rKHJlcXVlc3QpO1xuICAgIGlmIChhdHRyaWJ1dGVzID09PSBudWxsKVxuICAgICAgcmV0dXJuO1xuICAgIGlmICh0eXBlb2YgYXR0cmlidXRlcyAhPT0gJ29iamVjdCcpXG4gICAgICB0aHJvdyBFcnJvcihcIkhUTUwgYXR0cmlidXRlIGhvb2sgbXVzdCByZXR1cm4gbnVsbCBvciBvYmplY3RcIik7XG4gICAgXy5leHRlbmQoY29tYmluZWRBdHRyaWJ1dGVzLCBhdHRyaWJ1dGVzKTtcbiAgfSk7XG4gIHJldHVybiBjb21iaW5lZEF0dHJpYnV0ZXM7XG59O1xuV2ViQXBwLmFkZEh0bWxBdHRyaWJ1dGVIb29rID0gZnVuY3Rpb24gKGhvb2spIHtcbiAgaHRtbEF0dHJpYnV0ZUhvb2tzLnB1c2goaG9vayk7XG59O1xuXG4vLyBTZXJ2ZSBhcHAgSFRNTCBmb3IgdGhpcyBVUkw/XG52YXIgYXBwVXJsID0gZnVuY3Rpb24gKHVybCkge1xuICBpZiAodXJsID09PSAnL2Zhdmljb24uaWNvJyB8fCB1cmwgPT09ICcvcm9ib3RzLnR4dCcpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIE5PVEU6IGFwcC5tYW5pZmVzdCBpcyBub3QgYSB3ZWIgc3RhbmRhcmQgbGlrZSBmYXZpY29uLmljbyBhbmRcbiAgLy8gcm9ib3RzLnR4dC4gSXQgaXMgYSBmaWxlIG5hbWUgd2UgaGF2ZSBjaG9zZW4gdG8gdXNlIGZvciBIVE1MNVxuICAvLyBhcHBjYWNoZSBVUkxzLiBJdCBpcyBpbmNsdWRlZCBoZXJlIHRvIHByZXZlbnQgdXNpbmcgYW4gYXBwY2FjaGVcbiAgLy8gdGhlbiByZW1vdmluZyBpdCBmcm9tIHBvaXNvbmluZyBhbiBhcHAgcGVybWFuZW50bHkuIEV2ZW50dWFsbHksXG4gIC8vIG9uY2Ugd2UgaGF2ZSBzZXJ2ZXIgc2lkZSByb3V0aW5nLCB0aGlzIHdvbid0IGJlIG5lZWRlZCBhc1xuICAvLyB1bmtub3duIFVSTHMgd2l0aCByZXR1cm4gYSA0MDQgYXV0b21hdGljYWxseS5cbiAgaWYgKHVybCA9PT0gJy9hcHAubWFuaWZlc3QnKVxuICAgIHJldHVybiBmYWxzZTtcblxuICAvLyBBdm9pZCBzZXJ2aW5nIGFwcCBIVE1MIGZvciBkZWNsYXJlZCByb3V0ZXMgc3VjaCBhcyAvc29ja2pzLy5cbiAgaWYgKFJvdXRlUG9saWN5LmNsYXNzaWZ5KHVybCkpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIHdlIGN1cnJlbnRseSByZXR1cm4gYXBwIEhUTUwgb24gYWxsIFVSTHMgYnkgZGVmYXVsdFxuICByZXR1cm4gdHJ1ZTtcbn07XG5cblxuLy8gV2UgbmVlZCB0byBjYWxjdWxhdGUgdGhlIGNsaWVudCBoYXNoIGFmdGVyIGFsbCBwYWNrYWdlcyBoYXZlIGxvYWRlZFxuLy8gdG8gZ2l2ZSB0aGVtIGEgY2hhbmNlIHRvIHBvcHVsYXRlIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uXG4vL1xuLy8gQ2FsY3VsYXRpbmcgdGhlIGhhc2ggZHVyaW5nIHN0YXJ0dXAgbWVhbnMgdGhhdCBwYWNrYWdlcyBjYW4gb25seVxuLy8gcG9wdWxhdGUgX19tZXRlb3JfcnVudGltZV9jb25maWdfXyBkdXJpbmcgbG9hZCwgbm90IGR1cmluZyBzdGFydHVwLlxuLy9cbi8vIENhbGN1bGF0aW5nIGluc3RlYWQgaXQgYXQgdGhlIGJlZ2lubmluZyBvZiBtYWluIGFmdGVyIGFsbCBzdGFydHVwXG4vLyBob29rcyBoYWQgcnVuIHdvdWxkIGFsbG93IHBhY2thZ2VzIHRvIGFsc28gcG9wdWxhdGVcbi8vIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18gZHVyaW5nIHN0YXJ0dXAsIGJ1dCB0aGF0J3MgdG9vIGxhdGUgZm9yXG4vLyBhdXRvdXBkYXRlIGJlY2F1c2UgaXQgbmVlZHMgdG8gaGF2ZSB0aGUgY2xpZW50IGhhc2ggYXQgc3RhcnR1cCB0b1xuLy8gaW5zZXJ0IHRoZSBhdXRvIHVwZGF0ZSB2ZXJzaW9uIGl0c2VsZiBpbnRvXG4vLyBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIHRvIGdldCBpdCB0byB0aGUgY2xpZW50LlxuLy9cbi8vIEFuIGFsdGVybmF0aXZlIHdvdWxkIGJlIHRvIGdpdmUgYXV0b3VwZGF0ZSBhIFwicG9zdC1zdGFydCxcbi8vIHByZS1saXN0ZW5cIiBob29rIHRvIGFsbG93IGl0IHRvIGluc2VydCB0aGUgYXV0byB1cGRhdGUgdmVyc2lvbiBhdFxuLy8gdGhlIHJpZ2h0IG1vbWVudC5cblxuTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24gKCkge1xuICB2YXIgY2FsY3VsYXRlQ2xpZW50SGFzaCA9IFdlYkFwcEhhc2hpbmcuY2FsY3VsYXRlQ2xpZW50SGFzaDtcbiAgV2ViQXBwLmNsaWVudEhhc2ggPSBmdW5jdGlvbiAoYXJjaE5hbWUpIHtcbiAgICBhcmNoTmFtZSA9IGFyY2hOYW1lIHx8IFdlYkFwcC5kZWZhdWx0QXJjaDtcbiAgICByZXR1cm4gY2FsY3VsYXRlQ2xpZW50SGFzaChXZWJBcHAuY2xpZW50UHJvZ3JhbXNbYXJjaE5hbWVdLm1hbmlmZXN0KTtcbiAgfTtcblxuICBXZWJBcHAuY2FsY3VsYXRlQ2xpZW50SGFzaFJlZnJlc2hhYmxlID0gZnVuY3Rpb24gKGFyY2hOYW1lKSB7XG4gICAgYXJjaE5hbWUgPSBhcmNoTmFtZSB8fCBXZWJBcHAuZGVmYXVsdEFyY2g7XG4gICAgcmV0dXJuIGNhbGN1bGF0ZUNsaWVudEhhc2goV2ViQXBwLmNsaWVudFByb2dyYW1zW2FyY2hOYW1lXS5tYW5pZmVzdCxcbiAgICAgIGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHJldHVybiBuYW1lID09PSBcImNzc1wiO1xuICAgICAgfSk7XG4gIH07XG4gIFdlYkFwcC5jYWxjdWxhdGVDbGllbnRIYXNoTm9uUmVmcmVzaGFibGUgPSBmdW5jdGlvbiAoYXJjaE5hbWUpIHtcbiAgICBhcmNoTmFtZSA9IGFyY2hOYW1lIHx8IFdlYkFwcC5kZWZhdWx0QXJjaDtcbiAgICByZXR1cm4gY2FsY3VsYXRlQ2xpZW50SGFzaChXZWJBcHAuY2xpZW50UHJvZ3JhbXNbYXJjaE5hbWVdLm1hbmlmZXN0LFxuICAgICAgZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIG5hbWUgIT09IFwiY3NzXCI7XG4gICAgICB9KTtcbiAgfTtcbiAgV2ViQXBwLmNhbGN1bGF0ZUNsaWVudEhhc2hDb3Jkb3ZhID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcmNoTmFtZSA9ICd3ZWIuY29yZG92YSc7XG4gICAgaWYgKCEgV2ViQXBwLmNsaWVudFByb2dyYW1zW2FyY2hOYW1lXSlcbiAgICAgIHJldHVybiAnbm9uZSc7XG5cbiAgICByZXR1cm4gY2FsY3VsYXRlQ2xpZW50SGFzaChcbiAgICAgIFdlYkFwcC5jbGllbnRQcm9ncmFtc1thcmNoTmFtZV0ubWFuaWZlc3QsIG51bGwsIF8ucGljayhcbiAgICAgICAgX19tZXRlb3JfcnVudGltZV9jb25maWdfXywgJ1BVQkxJQ19TRVRUSU5HUycpKTtcbiAgfTtcbn0pO1xuXG5cblxuLy8gV2hlbiB3ZSBoYXZlIGEgcmVxdWVzdCBwZW5kaW5nLCB3ZSB3YW50IHRoZSBzb2NrZXQgdGltZW91dCB0byBiZSBsb25nLCB0b1xuLy8gZ2l2ZSBvdXJzZWx2ZXMgYSB3aGlsZSB0byBzZXJ2ZSBpdCwgYW5kIHRvIGFsbG93IHNvY2tqcyBsb25nIHBvbGxzIHRvXG4vLyBjb21wbGV0ZS4gIE9uIHRoZSBvdGhlciBoYW5kLCB3ZSB3YW50IHRvIGNsb3NlIGlkbGUgc29ja2V0cyByZWxhdGl2ZWx5XG4vLyBxdWlja2x5LCBzbyB0aGF0IHdlIGNhbiBzaHV0IGRvd24gcmVsYXRpdmVseSBwcm9tcHRseSBidXQgY2xlYW5seSwgd2l0aG91dFxuLy8gY3V0dGluZyBvZmYgYW55b25lJ3MgcmVzcG9uc2UuXG5XZWJBcHAuX3RpbWVvdXRBZGp1c3RtZW50UmVxdWVzdENhbGxiYWNrID0gZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG4gIC8vIHRoaXMgaXMgcmVhbGx5IGp1c3QgcmVxLnNvY2tldC5zZXRUaW1lb3V0KExPTkdfU09DS0VUX1RJTUVPVVQpO1xuICByZXEuc2V0VGltZW91dChMT05HX1NPQ0tFVF9USU1FT1VUKTtcbiAgLy8gSW5zZXJ0IG91ciBuZXcgZmluaXNoIGxpc3RlbmVyIHRvIHJ1biBCRUZPUkUgdGhlIGV4aXN0aW5nIG9uZSB3aGljaCByZW1vdmVzXG4gIC8vIHRoZSByZXNwb25zZSBmcm9tIHRoZSBzb2NrZXQuXG4gIHZhciBmaW5pc2hMaXN0ZW5lcnMgPSByZXMubGlzdGVuZXJzKCdmaW5pc2gnKTtcbiAgLy8gWFhYIEFwcGFyZW50bHkgaW4gTm9kZSAwLjEyIHRoaXMgZXZlbnQgd2FzIGNhbGxlZCAncHJlZmluaXNoJy5cbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2pveWVudC9ub2RlL2NvbW1pdC83YzliNjA3MFxuICAvLyBCdXQgaXQgaGFzIHN3aXRjaGVkIGJhY2sgdG8gJ2ZpbmlzaCcgaW4gTm9kZSB2NDpcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL3B1bGwvMTQxMVxuICByZXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdmaW5pc2gnKTtcbiAgcmVzLm9uKCdmaW5pc2gnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmVzLnNldFRpbWVvdXQoU0hPUlRfU09DS0VUX1RJTUVPVVQpO1xuICB9KTtcbiAgXy5lYWNoKGZpbmlzaExpc3RlbmVycywgZnVuY3Rpb24gKGwpIHsgcmVzLm9uKCdmaW5pc2gnLCBsKTsgfSk7XG59O1xuXG5cbi8vIFdpbGwgYmUgdXBkYXRlZCBieSBtYWluIGJlZm9yZSB3ZSBsaXN0ZW4uXG4vLyBNYXAgZnJvbSBjbGllbnQgYXJjaCB0byBib2lsZXJwbGF0ZSBvYmplY3QuXG4vLyBCb2lsZXJwbGF0ZSBvYmplY3QgaGFzOlxuLy8gICAtIGZ1bmM6IFhYWFxuLy8gICAtIGJhc2VEYXRhOiBYWFhcbnZhciBib2lsZXJwbGF0ZUJ5QXJjaCA9IHt9O1xuXG4vLyBSZWdpc3RlciBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgY2FuIHNlbGVjdGl2ZWx5IG1vZGlmeSBib2lsZXJwbGF0ZVxuLy8gZGF0YSBnaXZlbiBhcmd1bWVudHMgKHJlcXVlc3QsIGRhdGEsIGFyY2gpLiBUaGUga2V5IHNob3VsZCBiZSBhIHVuaXF1ZVxuLy8gaWRlbnRpZmllciwgdG8gcHJldmVudCBhY2N1bXVsYXRpbmcgZHVwbGljYXRlIGNhbGxiYWNrcyBmcm9tIHRoZSBzYW1lXG4vLyBjYWxsIHNpdGUgb3ZlciB0aW1lLiBDYWxsYmFja3Mgd2lsbCBiZSBjYWxsZWQgaW4gdGhlIG9yZGVyIHRoZXkgd2VyZVxuLy8gcmVnaXN0ZXJlZC4gQSBjYWxsYmFjayBzaG91bGQgcmV0dXJuIGZhbHNlIGlmIGl0IGRpZCBub3QgbWFrZSBhbnlcbi8vIGNoYW5nZXMgYWZmZWN0aW5nIHRoZSBib2lsZXJwbGF0ZS4gUGFzc2luZyBudWxsIGRlbGV0ZXMgdGhlIGNhbGxiYWNrLlxuLy8gQW55IHByZXZpb3VzIGNhbGxiYWNrIHJlZ2lzdGVyZWQgZm9yIHRoaXMga2V5IHdpbGwgYmUgcmV0dXJuZWQuXG5jb25zdCBib2lsZXJwbGF0ZURhdGFDYWxsYmFja3MgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuV2ViQXBwSW50ZXJuYWxzLnJlZ2lzdGVyQm9pbGVycGxhdGVEYXRhQ2FsbGJhY2sgPSBmdW5jdGlvbiAoa2V5LCBjYWxsYmFjaykge1xuICBjb25zdCBwcmV2aW91c0NhbGxiYWNrID0gYm9pbGVycGxhdGVEYXRhQ2FsbGJhY2tzW2tleV07XG5cbiAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgYm9pbGVycGxhdGVEYXRhQ2FsbGJhY2tzW2tleV0gPSBjYWxsYmFjaztcbiAgfSBlbHNlIHtcbiAgICBhc3NlcnQuc3RyaWN0RXF1YWwoY2FsbGJhY2ssIG51bGwpO1xuICAgIGRlbGV0ZSBib2lsZXJwbGF0ZURhdGFDYWxsYmFja3Nba2V5XTtcbiAgfVxuXG4gIC8vIFJldHVybiB0aGUgcHJldmlvdXMgY2FsbGJhY2sgaW4gY2FzZSB0aGUgbmV3IGNhbGxiYWNrIG5lZWRzIHRvIGNhbGxcbiAgLy8gaXQ7IGZvciBleGFtcGxlLCB3aGVuIHRoZSBuZXcgY2FsbGJhY2sgaXMgYSB3cmFwcGVyIGZvciB0aGUgb2xkLlxuICByZXR1cm4gcHJldmlvdXNDYWxsYmFjayB8fCBudWxsO1xufTtcblxuLy8gR2l2ZW4gYSByZXF1ZXN0IChhcyByZXR1cm5lZCBmcm9tIGBjYXRlZ29yaXplUmVxdWVzdGApLCByZXR1cm4gdGhlXG4vLyBib2lsZXJwbGF0ZSBIVE1MIHRvIHNlcnZlIGZvciB0aGF0IHJlcXVlc3QuXG4vL1xuLy8gSWYgYSBwcmV2aW91cyBjb25uZWN0IG1pZGRsZXdhcmUgaGFzIHJlbmRlcmVkIGNvbnRlbnQgZm9yIHRoZSBoZWFkIG9yIGJvZHksXG4vLyByZXR1cm5zIHRoZSBib2lsZXJwbGF0ZSB3aXRoIHRoYXQgY29udGVudCBwYXRjaGVkIGluIG90aGVyd2lzZVxuLy8gbWVtb2l6ZXMgb24gSFRNTCBhdHRyaWJ1dGVzICh1c2VkIGJ5LCBlZywgYXBwY2FjaGUpIGFuZCB3aGV0aGVyIGlubGluZVxuLy8gc2NyaXB0cyBhcmUgY3VycmVudGx5IGFsbG93ZWQuXG4vLyBYWFggc28gZmFyIHRoaXMgZnVuY3Rpb24gaXMgYWx3YXlzIGNhbGxlZCB3aXRoIGFyY2ggPT09ICd3ZWIuYnJvd3NlcidcbmZ1bmN0aW9uIGdldEJvaWxlcnBsYXRlKHJlcXVlc3QsIGFyY2gpIHtcbiAgcmV0dXJuIGdldEJvaWxlcnBsYXRlQXN5bmMocmVxdWVzdCwgYXJjaCkuYXdhaXQoKTtcbn1cblxuZnVuY3Rpb24gZ2V0Qm9pbGVycGxhdGVBc3luYyhyZXF1ZXN0LCBhcmNoKSB7XG4gIGNvbnN0IGJvaWxlcnBsYXRlID0gYm9pbGVycGxhdGVCeUFyY2hbYXJjaF07XG4gIGNvbnN0IGRhdGEgPSBPYmplY3QuYXNzaWduKHt9LCBib2lsZXJwbGF0ZS5iYXNlRGF0YSwge1xuICAgIGh0bWxBdHRyaWJ1dGVzOiBnZXRIdG1sQXR0cmlidXRlcyhyZXF1ZXN0KSxcbiAgfSwgXy5waWNrKHJlcXVlc3QsIFwiZHluYW1pY0hlYWRcIiwgXCJkeW5hbWljQm9keVwiKSk7XG5cbiAgbGV0IG1hZGVDaGFuZ2VzID0gZmFsc2U7XG4gIGxldCBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgT2JqZWN0LmtleXMoYm9pbGVycGxhdGVEYXRhQ2FsbGJhY2tzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgcHJvbWlzZSA9IHByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICBjb25zdCBjYWxsYmFjayA9IGJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrc1trZXldO1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKHJlcXVlc3QsIGRhdGEsIGFyY2gpO1xuICAgIH0pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgIC8vIENhbGxiYWNrcyBzaG91bGQgcmV0dXJuIGZhbHNlIGlmIHRoZXkgZGlkIG5vdCBtYWtlIGFueSBjaGFuZ2VzLlxuICAgICAgaWYgKHJlc3VsdCAhPT0gZmFsc2UpIHtcbiAgICAgICAgbWFkZUNoYW5nZXMgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4gcHJvbWlzZS50aGVuKCgpID0+ICh7XG4gICAgc3RyZWFtOiBib2lsZXJwbGF0ZS50b0hUTUxTdHJlYW0oZGF0YSksXG4gICAgc3RhdHVzQ29kZTogZGF0YS5zdGF0dXNDb2RlLFxuICAgIGhlYWRlcnM6IGRhdGEuaGVhZGVycyxcbiAgfSkpO1xufVxuXG5XZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVCb2lsZXJwbGF0ZUluc3RhbmNlID0gZnVuY3Rpb24gKGFyY2gsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRpdGlvbmFsT3B0aW9ucykge1xuICBhZGRpdGlvbmFsT3B0aW9ucyA9IGFkZGl0aW9uYWxPcHRpb25zIHx8IHt9O1xuXG4gIHZhciBydW50aW1lQ29uZmlnID0gXy5leHRlbmQoXG4gICAgXy5jbG9uZShfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fKSxcbiAgICBhZGRpdGlvbmFsT3B0aW9ucy5ydW50aW1lQ29uZmlnT3ZlcnJpZGVzIHx8IHt9XG4gICk7XG5cbiAgcmV0dXJuIG5ldyBCb2lsZXJwbGF0ZShhcmNoLCBtYW5pZmVzdCwgXy5leHRlbmQoe1xuICAgIHBhdGhNYXBwZXIoaXRlbVBhdGgpIHtcbiAgICAgIHJldHVybiBwYXRoSm9pbihhcmNoUGF0aFthcmNoXSwgaXRlbVBhdGgpO1xuICAgIH0sXG4gICAgYmFzZURhdGFFeHRlbnNpb246IHtcbiAgICAgIGFkZGl0aW9uYWxTdGF0aWNKczogXy5tYXAoXG4gICAgICAgIGFkZGl0aW9uYWxTdGF0aWNKcyB8fCBbXSxcbiAgICAgICAgZnVuY3Rpb24gKGNvbnRlbnRzLCBwYXRobmFtZSkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwYXRobmFtZTogcGF0aG5hbWUsXG4gICAgICAgICAgICBjb250ZW50czogY29udGVudHNcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICApLFxuICAgICAgLy8gQ29udmVydCB0byBhIEpTT04gc3RyaW5nLCB0aGVuIGdldCByaWQgb2YgbW9zdCB3ZWlyZCBjaGFyYWN0ZXJzLCB0aGVuXG4gICAgICAvLyB3cmFwIGluIGRvdWJsZSBxdW90ZXMuIChUaGUgb3V0ZXJtb3N0IEpTT04uc3RyaW5naWZ5IHJlYWxseSBvdWdodCB0b1xuICAgICAgLy8ganVzdCBiZSBcIndyYXAgaW4gZG91YmxlIHF1b3Rlc1wiIGJ1dCB3ZSB1c2UgaXQgdG8gYmUgc2FmZS4pIFRoaXMgbWlnaHRcbiAgICAgIC8vIGVuZCB1cCBpbnNpZGUgYSA8c2NyaXB0PiB0YWcgc28gd2UgbmVlZCB0byBiZSBjYXJlZnVsIHRvIG5vdCBpbmNsdWRlXG4gICAgICAvLyBcIjwvc2NyaXB0PlwiLCBidXQgbm9ybWFsIHt7c3BhY2ViYXJzfX0gZXNjYXBpbmcgZXNjYXBlcyB0b28gbXVjaCEgU2VlXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci9pc3N1ZXMvMzczMFxuICAgICAgbWV0ZW9yUnVudGltZUNvbmZpZzogSlNPTi5zdHJpbmdpZnkoXG4gICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChKU09OLnN0cmluZ2lmeShydW50aW1lQ29uZmlnKSkpLFxuICAgICAgcm9vdFVybFBhdGhQcmVmaXg6IF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkxfUEFUSF9QUkVGSVggfHwgJycsXG4gICAgICBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vazogYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2ssXG4gICAgICBpbmxpbmVTY3JpcHRzQWxsb3dlZDogV2ViQXBwSW50ZXJuYWxzLmlubGluZVNjcmlwdHNBbGxvd2VkKCksXG4gICAgICBpbmxpbmU6IGFkZGl0aW9uYWxPcHRpb25zLmlubGluZVxuICAgIH1cbiAgfSwgYWRkaXRpb25hbE9wdGlvbnMpKTtcbn07XG5cbi8vIEEgbWFwcGluZyBmcm9tIHVybCBwYXRoIHRvIGFyY2hpdGVjdHVyZSAoZS5nLiBcIndlYi5icm93c2VyXCIpIHRvIHN0YXRpY1xuLy8gZmlsZSBpbmZvcm1hdGlvbiB3aXRoIHRoZSBmb2xsb3dpbmcgZmllbGRzOlxuLy8gLSB0eXBlOiB0aGUgdHlwZSBvZiBmaWxlIHRvIGJlIHNlcnZlZFxuLy8gLSBjYWNoZWFibGU6IG9wdGlvbmFsbHksIHdoZXRoZXIgdGhlIGZpbGUgc2hvdWxkIGJlIGNhY2hlZCBvciBub3Rcbi8vIC0gc291cmNlTWFwVXJsOiBvcHRpb25hbGx5LCB0aGUgdXJsIG9mIHRoZSBzb3VyY2UgbWFwXG4vL1xuLy8gSW5mbyBhbHNvIGNvbnRhaW5zIG9uZSBvZiB0aGUgZm9sbG93aW5nOlxuLy8gLSBjb250ZW50OiB0aGUgc3RyaW5naWZpZWQgY29udGVudCB0aGF0IHNob3VsZCBiZSBzZXJ2ZWQgYXQgdGhpcyBwYXRoXG4vLyAtIGFic29sdXRlUGF0aDogdGhlIGFic29sdXRlIHBhdGggb24gZGlzayB0byB0aGUgZmlsZVxuXG52YXIgc3RhdGljRmlsZXNCeUFyY2g7XG5cbi8vIFNlcnZlIHN0YXRpYyBmaWxlcyBmcm9tIHRoZSBtYW5pZmVzdCBvciBhZGRlZCB3aXRoXG4vLyBgYWRkU3RhdGljSnNgLiBFeHBvcnRlZCBmb3IgdGVzdHMuXG5XZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNNaWRkbGV3YXJlID0gZnVuY3Rpb24gKHN0YXRpY0ZpbGVzQnlBcmNoLCByZXEsIHJlcywgbmV4dCkge1xuICBpZiAoJ0dFVCcgIT0gcmVxLm1ldGhvZCAmJiAnSEVBRCcgIT0gcmVxLm1ldGhvZCAmJiAnT1BUSU9OUycgIT0gcmVxLm1ldGhvZCkge1xuICAgIG5leHQoKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIHBhdGhuYW1lID0gcGFyc2VSZXF1ZXN0KHJlcSkucGF0aG5hbWU7XG4gIHRyeSB7XG4gICAgcGF0aG5hbWUgPSBkZWNvZGVVUklDb21wb25lbnQocGF0aG5hbWUpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbmV4dCgpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBzZXJ2ZVN0YXRpY0pzID0gZnVuY3Rpb24gKHMpIHtcbiAgICByZXMud3JpdGVIZWFkKDIwMCwge1xuICAgICAgJ0NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0OyBjaGFyc2V0PVVURi04J1xuICAgIH0pO1xuICAgIHJlcy53cml0ZShzKTtcbiAgICByZXMuZW5kKCk7XG4gIH07XG5cbiAgaWYgKHBhdGhuYW1lID09PSBcIi9tZXRlb3JfcnVudGltZV9jb25maWcuanNcIiAmJlxuICAgICAgISBXZWJBcHBJbnRlcm5hbHMuaW5saW5lU2NyaXB0c0FsbG93ZWQoKSkge1xuICAgIHNlcnZlU3RhdGljSnMoXCJfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fID0gXCIgK1xuICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoX19tZXRlb3JfcnVudGltZV9jb25maWdfXykgKyBcIjtcIik7XG4gICAgcmV0dXJuO1xuICB9IGVsc2UgaWYgKF8uaGFzKGFkZGl0aW9uYWxTdGF0aWNKcywgcGF0aG5hbWUpICYmXG4gICAgICAgICAgICAgICEgV2ViQXBwSW50ZXJuYWxzLmlubGluZVNjcmlwdHNBbGxvd2VkKCkpIHtcbiAgICBzZXJ2ZVN0YXRpY0pzKGFkZGl0aW9uYWxTdGF0aWNKc1twYXRobmFtZV0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGluZm8gPSBnZXRTdGF0aWNGaWxlSW5mbyhcbiAgICBwYXRobmFtZSxcbiAgICBpZGVudGlmeUJyb3dzZXIocmVxLmhlYWRlcnNbXCJ1c2VyLWFnZW50XCJdKSxcbiAgKTtcblxuICBpZiAoISBpbmZvKSB7XG4gICAgbmV4dCgpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIFdlIGRvbid0IG5lZWQgdG8gY2FsbCBwYXVzZSBiZWNhdXNlLCB1bmxpa2UgJ3N0YXRpYycsIG9uY2Ugd2UgY2FsbCBpbnRvXG4gIC8vICdzZW5kJyBhbmQgeWllbGQgdG8gdGhlIGV2ZW50IGxvb3AsIHdlIG5ldmVyIGNhbGwgYW5vdGhlciBoYW5kbGVyIHdpdGhcbiAgLy8gJ25leHQnLlxuXG4gIC8vIENhY2hlYWJsZSBmaWxlcyBhcmUgZmlsZXMgdGhhdCBzaG91bGQgbmV2ZXIgY2hhbmdlLiBUeXBpY2FsbHlcbiAgLy8gbmFtZWQgYnkgdGhlaXIgaGFzaCAoZWcgbWV0ZW9yIGJ1bmRsZWQganMgYW5kIGNzcyBmaWxlcykuXG4gIC8vIFdlIGNhY2hlIHRoZW0gfmZvcmV2ZXIgKDF5cikuXG4gIGNvbnN0IG1heEFnZSA9IGluZm8uY2FjaGVhYmxlXG4gICAgPyAxMDAwICogNjAgKiA2MCAqIDI0ICogMzY1XG4gICAgOiAwO1xuXG4gIGlmIChpbmZvLmNhY2hlYWJsZSkge1xuICAgIC8vIFNpbmNlIHdlIHVzZSByZXEuaGVhZGVyc1tcInVzZXItYWdlbnRcIl0gdG8gZGV0ZXJtaW5lIHdoZXRoZXIgdGhlXG4gICAgLy8gY2xpZW50IHNob3VsZCByZWNlaXZlIG1vZGVybiBvciBsZWdhY3kgcmVzb3VyY2VzLCB0ZWxsIHRoZSBjbGllbnRcbiAgICAvLyB0byBpbnZhbGlkYXRlIGNhY2hlZCByZXNvdXJjZXMgd2hlbi9pZiBpdHMgdXNlciBhZ2VudCBzdHJpbmdcbiAgICAvLyBjaGFuZ2VzIGluIHRoZSBmdXR1cmUuXG4gICAgcmVzLnNldEhlYWRlcihcIlZhcnlcIiwgXCJVc2VyLUFnZW50XCIpO1xuICB9XG5cbiAgLy8gU2V0IHRoZSBYLVNvdXJjZU1hcCBoZWFkZXIsIHdoaWNoIGN1cnJlbnQgQ2hyb21lLCBGaXJlRm94LCBhbmQgU2FmYXJpXG4gIC8vIHVuZGVyc3RhbmQuICAoVGhlIFNvdXJjZU1hcCBoZWFkZXIgaXMgc2xpZ2h0bHkgbW9yZSBzcGVjLWNvcnJlY3QgYnV0IEZGXG4gIC8vIGRvZXNuJ3QgdW5kZXJzdGFuZCBpdC4pXG4gIC8vXG4gIC8vIFlvdSBtYXkgYWxzbyBuZWVkIHRvIGVuYWJsZSBzb3VyY2UgbWFwcyBpbiBDaHJvbWU6IG9wZW4gZGV2IHRvb2xzLCBjbGlja1xuICAvLyB0aGUgZ2VhciBpbiB0aGUgYm90dG9tIHJpZ2h0IGNvcm5lciwgYW5kIHNlbGVjdCBcImVuYWJsZSBzb3VyY2UgbWFwc1wiLlxuICBpZiAoaW5mby5zb3VyY2VNYXBVcmwpIHtcbiAgICByZXMuc2V0SGVhZGVyKCdYLVNvdXJjZU1hcCcsXG4gICAgICAgICAgICAgICAgICBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYICtcbiAgICAgICAgICAgICAgICAgIGluZm8uc291cmNlTWFwVXJsKTtcbiAgfVxuXG4gIGlmIChpbmZvLnR5cGUgPT09IFwianNcIiB8fFxuICAgICAgaW5mby50eXBlID09PSBcImR5bmFtaWMganNcIikge1xuICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qYXZhc2NyaXB0OyBjaGFyc2V0PVVURi04XCIpO1xuICB9IGVsc2UgaWYgKGluZm8udHlwZSA9PT0gXCJjc3NcIikge1xuICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJ0ZXh0L2NzczsgY2hhcnNldD1VVEYtOFwiKTtcbiAgfSBlbHNlIGlmIChpbmZvLnR5cGUgPT09IFwianNvblwiKSB7XG4gICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGLThcIik7XG4gIH1cblxuICBpZiAoaW5mby5oYXNoKSB7XG4gICAgcmVzLnNldEhlYWRlcignRVRhZycsICdcIicgKyBpbmZvLmhhc2ggKyAnXCInKTtcbiAgfVxuXG4gIGlmIChpbmZvLmNvbnRlbnQpIHtcbiAgICByZXMud3JpdGUoaW5mby5jb250ZW50KTtcbiAgICByZXMuZW5kKCk7XG4gIH0gZWxzZSB7XG4gICAgc2VuZChyZXEsIGluZm8uYWJzb2x1dGVQYXRoLCB7XG4gICAgICBtYXhhZ2U6IG1heEFnZSxcbiAgICAgIGRvdGZpbGVzOiAnYWxsb3cnLCAvLyBpZiB3ZSBzcGVjaWZpZWQgYSBkb3RmaWxlIGluIHRoZSBtYW5pZmVzdCwgc2VydmUgaXRcbiAgICAgIGxhc3RNb2RpZmllZDogZmFsc2UgLy8gZG9uJ3Qgc2V0IGxhc3QtbW9kaWZpZWQgYmFzZWQgb24gdGhlIGZpbGUgZGF0ZVxuICAgIH0pLm9uKCdlcnJvcicsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgIExvZy5lcnJvcihcIkVycm9yIHNlcnZpbmcgc3RhdGljIGZpbGUgXCIgKyBlcnIpO1xuICAgICAgcmVzLndyaXRlSGVhZCg1MDApO1xuICAgICAgcmVzLmVuZCgpO1xuICAgIH0pLm9uKCdkaXJlY3RvcnknLCBmdW5jdGlvbiAoKSB7XG4gICAgICBMb2cuZXJyb3IoXCJVbmV4cGVjdGVkIGRpcmVjdG9yeSBcIiArIGluZm8uYWJzb2x1dGVQYXRoKTtcbiAgICAgIHJlcy53cml0ZUhlYWQoNTAwKTtcbiAgICAgIHJlcy5lbmQoKTtcbiAgICB9KS5waXBlKHJlcyk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGdldFN0YXRpY0ZpbGVJbmZvKG9yaWdpbmFsUGF0aCwgYnJvd3Nlcikge1xuICBjb25zdCB7IGFyY2gsIHBhdGggfSA9IGdldEFyY2hBbmRQYXRoKG9yaWdpbmFsUGF0aCwgYnJvd3Nlcik7XG5cbiAgaWYgKCEgaGFzT3duLmNhbGwoV2ViQXBwLmNsaWVudFByb2dyYW1zLCBhcmNoKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gR2V0IGEgbGlzdCBvZiBhbGwgYXZhaWxhYmxlIHN0YXRpYyBmaWxlIGFyY2hpdGVjdHVyZXMsIHdpdGggYXJjaFxuICAvLyBmaXJzdCBpbiB0aGUgbGlzdCBpZiBpdCBleGlzdHMuXG4gIGNvbnN0IHN0YXRpY0FyY2hMaXN0ID0gT2JqZWN0LmtleXMoc3RhdGljRmlsZXNCeUFyY2gpO1xuICBjb25zdCBhcmNoSW5kZXggPSBzdGF0aWNBcmNoTGlzdC5pbmRleE9mKGFyY2gpO1xuICBpZiAoYXJjaEluZGV4ID4gMCkge1xuICAgIHN0YXRpY0FyY2hMaXN0LnVuc2hpZnQoc3RhdGljQXJjaExpc3Quc3BsaWNlKGFyY2hJbmRleCwgMSlbMF0pO1xuICB9XG5cbiAgbGV0IGluZm8gPSBudWxsO1xuXG4gIHN0YXRpY0FyY2hMaXN0LnNvbWUoYXJjaCA9PiB7XG4gICAgY29uc3Qgc3RhdGljRmlsZXMgPSBzdGF0aWNGaWxlc0J5QXJjaFthcmNoXTtcblxuICAgIC8vIElmIHN0YXRpY0ZpbGVzIGNvbnRhaW5zIG9yaWdpbmFsUGF0aCB3aXRoIHRoZSBhcmNoIGluZmVycmVkIGFib3ZlLFxuICAgIC8vIHVzZSB0aGF0IGluZm9ybWF0aW9uLlxuICAgIGlmIChoYXNPd24uY2FsbChzdGF0aWNGaWxlcywgb3JpZ2luYWxQYXRoKSkge1xuICAgICAgcmV0dXJuIGluZm8gPSBzdGF0aWNGaWxlc1tvcmlnaW5hbFBhdGhdO1xuICAgIH1cblxuICAgIC8vIElmIGdldEFyY2hBbmRQYXRoIHJldHVybmVkIGFuIGFsdGVybmF0ZSBwYXRoLCB0cnkgdGhhdCBpbnN0ZWFkLlxuICAgIGlmIChwYXRoICE9PSBvcmlnaW5hbFBhdGggJiZcbiAgICAgICAgaGFzT3duLmNhbGwoc3RhdGljRmlsZXMsIHBhdGgpKSB7XG4gICAgICByZXR1cm4gaW5mbyA9IHN0YXRpY0ZpbGVzW3BhdGhdO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGluZm87XG59XG5cbmZ1bmN0aW9uIGdldEFyY2hBbmRQYXRoKHBhdGgsIGJyb3dzZXIpIHtcbiAgY29uc3QgcGF0aFBhcnRzID0gcGF0aC5zcGxpdChcIi9cIik7XG4gIGNvbnN0IGFyY2hLZXkgPSBwYXRoUGFydHNbMV07XG5cbiAgaWYgKGFyY2hLZXkuc3RhcnRzV2l0aChcIl9fXCIpKSB7XG4gICAgY29uc3QgYXJjaENsZWFuZWQgPSBcIndlYi5cIiArIGFyY2hLZXkuc2xpY2UoMik7XG4gICAgaWYgKGhhc093bi5jYWxsKFdlYkFwcC5jbGllbnRQcm9ncmFtcywgYXJjaENsZWFuZWQpKSB7XG4gICAgICBwYXRoUGFydHMuc3BsaWNlKDEsIDEpOyAvLyBSZW1vdmUgdGhlIGFyY2hLZXkgcGFydC5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGFyY2g6IGFyY2hDbGVhbmVkLFxuICAgICAgICBwYXRoOiBwYXRoUGFydHMuam9pbihcIi9cIiksXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8vIFRPRE8gUGVyaGFwcyBvbmUgZGF5IHdlIGNvdWxkIGluZmVyIENvcmRvdmEgY2xpZW50cyBoZXJlLCBzbyB0aGF0IHdlXG4gIC8vIHdvdWxkbid0IGhhdmUgdG8gdXNlIHByZWZpeGVkIFwiL19fY29yZG92YS8uLi5cIiBVUkxzLlxuICBjb25zdCBhcmNoID0gaXNNb2Rlcm4oYnJvd3NlcilcbiAgICA/IFwid2ViLmJyb3dzZXJcIlxuICAgIDogXCJ3ZWIuYnJvd3Nlci5sZWdhY3lcIjtcblxuICBpZiAoaGFzT3duLmNhbGwoV2ViQXBwLmNsaWVudFByb2dyYW1zLCBhcmNoKSkge1xuICAgIHJldHVybiB7IGFyY2gsIHBhdGggfTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgYXJjaDogV2ViQXBwLmRlZmF1bHRBcmNoLFxuICAgIHBhdGgsXG4gIH07XG59XG5cbi8vIFBhcnNlIHRoZSBwYXNzZWQgaW4gcG9ydCB2YWx1ZS4gUmV0dXJuIHRoZSBwb3J0IGFzLWlzIGlmIGl0J3MgYSBTdHJpbmdcbi8vIChlLmcuIGEgV2luZG93cyBTZXJ2ZXIgc3R5bGUgbmFtZWQgcGlwZSksIG90aGVyd2lzZSByZXR1cm4gdGhlIHBvcnQgYXMgYW5cbi8vIGludGVnZXIuXG4vL1xuLy8gREVQUkVDQVRFRDogRGlyZWN0IHVzZSBvZiB0aGlzIGZ1bmN0aW9uIGlzIG5vdCByZWNvbW1lbmRlZDsgaXQgaXMgbm9cbi8vIGxvbmdlciB1c2VkIGludGVybmFsbHksIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gYSBmdXR1cmUgcmVsZWFzZS5cbldlYkFwcEludGVybmFscy5wYXJzZVBvcnQgPSBwb3J0ID0+IHtcbiAgbGV0IHBhcnNlZFBvcnQgPSBwYXJzZUludChwb3J0KTtcbiAgaWYgKE51bWJlci5pc05hTihwYXJzZWRQb3J0KSkge1xuICAgIHBhcnNlZFBvcnQgPSBwb3J0O1xuICB9XG4gIHJldHVybiBwYXJzZWRQb3J0O1xufVxuXG5mdW5jdGlvbiBydW5XZWJBcHBTZXJ2ZXIoKSB7XG4gIHZhciBzaHV0dGluZ0Rvd24gPSBmYWxzZTtcbiAgdmFyIHN5bmNRdWV1ZSA9IG5ldyBNZXRlb3IuX1N5bmNocm9ub3VzUXVldWUoKTtcblxuICB2YXIgZ2V0SXRlbVBhdGhuYW1lID0gZnVuY3Rpb24gKGl0ZW1VcmwpIHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHBhcnNlVXJsKGl0ZW1VcmwpLnBhdGhuYW1lKTtcbiAgfTtcblxuICBXZWJBcHBJbnRlcm5hbHMucmVsb2FkQ2xpZW50UHJvZ3JhbXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgc3luY1F1ZXVlLnJ1blRhc2soZnVuY3Rpb24oKSB7XG4gICAgICBzdGF0aWNGaWxlc0J5QXJjaCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICAgIGZ1bmN0aW9uIGdlbmVyYXRlQ2xpZW50UHJvZ3JhbShjbGllbnRQYXRoLCBhcmNoKSB7XG4gICAgICAgIGZ1bmN0aW9uIGFkZFN0YXRpY0ZpbGUocGF0aCwgaXRlbSkge1xuICAgICAgICAgIGlmICghIGhhc093bi5jYWxsKHN0YXRpY0ZpbGVzQnlBcmNoLCBhcmNoKSkge1xuICAgICAgICAgICAgc3RhdGljRmlsZXNCeUFyY2hbYXJjaF0gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzdGF0aWNGaWxlc0J5QXJjaFthcmNoXVtwYXRoXSA9IGl0ZW07XG4gICAgICAgIH1cblxuICAgICAgICAvLyByZWFkIHRoZSBjb250cm9sIGZvciB0aGUgY2xpZW50IHdlJ2xsIGJlIHNlcnZpbmcgdXBcbiAgICAgICAgdmFyIGNsaWVudEpzb25QYXRoID0gcGF0aEpvaW4oX19tZXRlb3JfYm9vdHN0cmFwX18uc2VydmVyRGlyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGllbnRQYXRoKTtcbiAgICAgICAgdmFyIGNsaWVudERpciA9IHBhdGhEaXJuYW1lKGNsaWVudEpzb25QYXRoKTtcbiAgICAgICAgdmFyIGNsaWVudEpzb24gPSBKU09OLnBhcnNlKHJlYWRVdGY4RmlsZVN5bmMoY2xpZW50SnNvblBhdGgpKTtcbiAgICAgICAgaWYgKGNsaWVudEpzb24uZm9ybWF0ICE9PSBcIndlYi1wcm9ncmFtLXByZTFcIilcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbnN1cHBvcnRlZCBmb3JtYXQgZm9yIGNsaWVudCBhc3NldHM6IFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoY2xpZW50SnNvbi5mb3JtYXQpKTtcblxuICAgICAgICBpZiAoISBjbGllbnRKc29uUGF0aCB8fCAhIGNsaWVudERpciB8fCAhIGNsaWVudEpzb24pXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2xpZW50IGNvbmZpZyBmaWxlIG5vdCBwYXJzZWQuXCIpO1xuXG4gICAgICAgIHZhciBtYW5pZmVzdCA9IGNsaWVudEpzb24ubWFuaWZlc3Q7XG4gICAgICAgIF8uZWFjaChtYW5pZmVzdCwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICBpZiAoaXRlbS51cmwgJiYgaXRlbS53aGVyZSA9PT0gXCJjbGllbnRcIikge1xuICAgICAgICAgICAgYWRkU3RhdGljRmlsZShnZXRJdGVtUGF0aG5hbWUoaXRlbS51cmwpLCB7XG4gICAgICAgICAgICAgIGFic29sdXRlUGF0aDogcGF0aEpvaW4oY2xpZW50RGlyLCBpdGVtLnBhdGgpLFxuICAgICAgICAgICAgICBjYWNoZWFibGU6IGl0ZW0uY2FjaGVhYmxlLFxuICAgICAgICAgICAgICBoYXNoOiBpdGVtLmhhc2gsXG4gICAgICAgICAgICAgIC8vIExpbmsgZnJvbSBzb3VyY2UgdG8gaXRzIG1hcFxuICAgICAgICAgICAgICBzb3VyY2VNYXBVcmw6IGl0ZW0uc291cmNlTWFwVXJsLFxuICAgICAgICAgICAgICB0eXBlOiBpdGVtLnR5cGVcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoaXRlbS5zb3VyY2VNYXApIHtcbiAgICAgICAgICAgICAgLy8gU2VydmUgdGhlIHNvdXJjZSBtYXAgdG9vLCB1bmRlciB0aGUgc3BlY2lmaWVkIFVSTC4gV2UgYXNzdW1lIGFsbFxuICAgICAgICAgICAgICAvLyBzb3VyY2UgbWFwcyBhcmUgY2FjaGVhYmxlLlxuICAgICAgICAgICAgICBhZGRTdGF0aWNGaWxlKGdldEl0ZW1QYXRobmFtZShpdGVtLnNvdXJjZU1hcFVybCksIHtcbiAgICAgICAgICAgICAgICBhYnNvbHV0ZVBhdGg6IHBhdGhKb2luKGNsaWVudERpciwgaXRlbS5zb3VyY2VNYXApLFxuICAgICAgICAgICAgICAgIGNhY2hlYWJsZTogdHJ1ZVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBwcm9ncmFtID0ge1xuICAgICAgICAgIGZvcm1hdDogXCJ3ZWItcHJvZ3JhbS1wcmUxXCIsXG4gICAgICAgICAgbWFuaWZlc3Q6IG1hbmlmZXN0LFxuICAgICAgICAgIHZlcnNpb246IHByb2Nlc3MuZW52LkFVVE9VUERBVEVfVkVSU0lPTiB8fFxuICAgICAgICAgICAgV2ViQXBwSGFzaGluZy5jYWxjdWxhdGVDbGllbnRIYXNoKFxuICAgICAgICAgICAgICBtYW5pZmVzdCxcbiAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgXy5waWNrKF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18sIFwiUFVCTElDX1NFVFRJTkdTXCIpXG4gICAgICAgICAgICApLFxuICAgICAgICAgIGNvcmRvdmFDb21wYXRpYmlsaXR5VmVyc2lvbnM6IGNsaWVudEpzb24uY29yZG92YUNvbXBhdGliaWxpdHlWZXJzaW9ucyxcbiAgICAgICAgICBQVUJMSUNfU0VUVElOR1M6IF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUFVCTElDX1NFVFRJTkdTXG4gICAgICAgIH07XG5cbiAgICAgICAgV2ViQXBwLmNsaWVudFByb2dyYW1zW2FyY2hdID0gcHJvZ3JhbTtcblxuICAgICAgICAvLyBFeHBvc2UgcHJvZ3JhbSBkZXRhaWxzIGFzIGEgc3RyaW5nIHJlYWNoYWJsZSB2aWEgdGhlIGZvbGxvd2luZ1xuICAgICAgICAvLyBVUkwuXG4gICAgICAgIGNvbnN0IG1hbmlmZXN0VXJsUHJlZml4ID0gXCIvX19cIiArIGFyY2gucmVwbGFjZSgvXndlYlxcLi8sIFwiXCIpO1xuICAgICAgICBjb25zdCBtYW5pZmVzdFVybCA9IG1hbmlmZXN0VXJsUHJlZml4ICtcbiAgICAgICAgICBnZXRJdGVtUGF0aG5hbWUoXCIvbWFuaWZlc3QuanNvblwiKTtcblxuICAgICAgICBhZGRTdGF0aWNGaWxlKG1hbmlmZXN0VXJsLCB7XG4gICAgICAgICAgY29udGVudDogSlNPTi5zdHJpbmdpZnkocHJvZ3JhbSksXG4gICAgICAgICAgY2FjaGVhYmxlOiBmYWxzZSxcbiAgICAgICAgICBoYXNoOiBwcm9ncmFtLnZlcnNpb24sXG4gICAgICAgICAgdHlwZTogXCJqc29uXCJcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciBjbGllbnRQYXRocyA9IF9fbWV0ZW9yX2Jvb3RzdHJhcF9fLmNvbmZpZ0pzb24uY2xpZW50UGF0aHM7XG4gICAgICAgIF8uZWFjaChjbGllbnRQYXRocywgZnVuY3Rpb24gKGNsaWVudFBhdGgsIGFyY2gpIHtcbiAgICAgICAgICBhcmNoUGF0aFthcmNoXSA9IHBhdGhEaXJuYW1lKGNsaWVudFBhdGgpO1xuICAgICAgICAgIGdlbmVyYXRlQ2xpZW50UHJvZ3JhbShjbGllbnRQYXRoLCBhcmNoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXhwb3J0ZWQgZm9yIHRlc3RzLlxuICAgICAgICBXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNCeUFyY2ggPSBzdGF0aWNGaWxlc0J5QXJjaDtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgTG9nLmVycm9yKFwiRXJyb3IgcmVsb2FkaW5nIHRoZSBjbGllbnQgcHJvZ3JhbTogXCIgKyBlLnN0YWNrKTtcbiAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIFdlYkFwcEludGVybmFscy5nZW5lcmF0ZUJvaWxlcnBsYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIFRoaXMgYm9pbGVycGxhdGUgd2lsbCBiZSBzZXJ2ZWQgdG8gdGhlIG1vYmlsZSBkZXZpY2VzIHdoZW4gdXNlZCB3aXRoXG4gICAgLy8gTWV0ZW9yL0NvcmRvdmEgZm9yIHRoZSBIb3QtQ29kZSBQdXNoIGFuZCBzaW5jZSB0aGUgZmlsZSB3aWxsIGJlIHNlcnZlZCBieVxuICAgIC8vIHRoZSBkZXZpY2UncyBzZXJ2ZXIsIGl0IGlzIGltcG9ydGFudCB0byBzZXQgdGhlIEREUCB1cmwgdG8gdGhlIGFjdHVhbFxuICAgIC8vIE1ldGVvciBzZXJ2ZXIgYWNjZXB0aW5nIEREUCBjb25uZWN0aW9ucyBhbmQgbm90IHRoZSBkZXZpY2UncyBmaWxlIHNlcnZlci5cbiAgICB2YXIgZGVmYXVsdE9wdGlvbnNGb3JBcmNoID0ge1xuICAgICAgJ3dlYi5jb3Jkb3ZhJzoge1xuICAgICAgICBydW50aW1lQ29uZmlnT3ZlcnJpZGVzOiB7XG4gICAgICAgICAgLy8gWFhYIFdlIHVzZSBhYnNvbHV0ZVVybCgpIGhlcmUgc28gdGhhdCB3ZSBzZXJ2ZSBodHRwczovL1xuICAgICAgICAgIC8vIFVSTHMgdG8gY29yZG92YSBjbGllbnRzIGlmIGZvcmNlLXNzbCBpcyBpbiB1c2UuIElmIHdlIHdlcmVcbiAgICAgICAgICAvLyB0byB1c2UgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTCBpbnN0ZWFkIG9mXG4gICAgICAgICAgLy8gYWJzb2x1dGVVcmwoKSwgdGhlbiBDb3Jkb3ZhIGNsaWVudHMgd291bGQgaW1tZWRpYXRlbHkgZ2V0IGFcbiAgICAgICAgICAvLyBIQ1Agc2V0dGluZyB0aGVpciBERFBfREVGQVVMVF9DT05ORUNUSU9OX1VSTCB0b1xuICAgICAgICAgIC8vIGh0dHA6Ly9leGFtcGxlLm1ldGVvci5jb20uIFRoaXMgYnJlYWtzIHRoZSBhcHAsIGJlY2F1c2VcbiAgICAgICAgICAvLyBmb3JjZS1zc2wgZG9lc24ndCBzZXJ2ZSBDT1JTIGhlYWRlcnMgb24gMzAyXG4gICAgICAgICAgLy8gcmVkaXJlY3RzLiAoUGx1cyBpdCdzIHVuZGVzaXJhYmxlIHRvIGhhdmUgY2xpZW50c1xuICAgICAgICAgIC8vIGNvbm5lY3RpbmcgdG8gaHR0cDovL2V4YW1wbGUubWV0ZW9yLmNvbSB3aGVuIGZvcmNlLXNzbCBpc1xuICAgICAgICAgIC8vIGluIHVzZS4pXG4gICAgICAgICAgRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkw6IHByb2Nlc3MuZW52Lk1PQklMRV9ERFBfVVJMIHx8XG4gICAgICAgICAgICBNZXRlb3IuYWJzb2x1dGVVcmwoKSxcbiAgICAgICAgICBST09UX1VSTDogcHJvY2Vzcy5lbnYuTU9CSUxFX1JPT1RfVVJMIHx8XG4gICAgICAgICAgICBNZXRlb3IuYWJzb2x1dGVVcmwoKVxuICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICBcIndlYi5icm93c2VyXCI6IHtcbiAgICAgICAgcnVudGltZUNvbmZpZ092ZXJyaWRlczoge1xuICAgICAgICAgIGlzTW9kZXJuOiB0cnVlLFxuICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICBcIndlYi5icm93c2VyLmxlZ2FjeVwiOiB7XG4gICAgICAgIHJ1bnRpbWVDb25maWdPdmVycmlkZXM6IHtcbiAgICAgICAgICBpc01vZGVybjogZmFsc2UsXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfTtcblxuICAgIHN5bmNRdWV1ZS5ydW5UYXNrKGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3QgYWxsQ3NzID0gW107XG5cbiAgICAgIF8uZWFjaChXZWJBcHAuY2xpZW50UHJvZ3JhbXMsIGZ1bmN0aW9uIChwcm9ncmFtLCBhcmNoTmFtZSkge1xuICAgICAgICBib2lsZXJwbGF0ZUJ5QXJjaFthcmNoTmFtZV0gPVxuICAgICAgICAgIFdlYkFwcEludGVybmFscy5nZW5lcmF0ZUJvaWxlcnBsYXRlSW5zdGFuY2UoXG4gICAgICAgICAgICBhcmNoTmFtZSxcbiAgICAgICAgICAgIHByb2dyYW0ubWFuaWZlc3QsXG4gICAgICAgICAgICBkZWZhdWx0T3B0aW9uc0ZvckFyY2hbYXJjaE5hbWVdLFxuICAgICAgICAgICk7XG5cbiAgICAgICAgY29uc3QgY3NzRmlsZXMgPSBib2lsZXJwbGF0ZUJ5QXJjaFthcmNoTmFtZV0uYmFzZURhdGEuY3NzO1xuICAgICAgICBjc3NGaWxlcy5mb3JFYWNoKGZpbGUgPT4gYWxsQ3NzLnB1c2goe1xuICAgICAgICAgIHVybDogYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2soZmlsZS51cmwpLFxuICAgICAgICB9KSk7XG4gICAgICB9KTtcblxuICAgICAgLy8gQ2xlYXIgdGhlIG1lbW9pemVkIGJvaWxlcnBsYXRlIGNhY2hlLlxuICAgICAgbWVtb2l6ZWRCb2lsZXJwbGF0ZSA9IHt9O1xuXG4gICAgICBXZWJBcHBJbnRlcm5hbHMucmVmcmVzaGFibGVBc3NldHMgPSB7IGFsbENzcyB9O1xuICAgIH0pO1xuICB9O1xuXG4gIFdlYkFwcEludGVybmFscy5yZWxvYWRDbGllbnRQcm9ncmFtcygpO1xuXG4gIC8vIHdlYnNlcnZlclxuICB2YXIgYXBwID0gY29ubmVjdCgpO1xuXG4gIC8vIFBhY2thZ2VzIGFuZCBhcHBzIGNhbiBhZGQgaGFuZGxlcnMgdGhhdCBydW4gYmVmb3JlIGFueSBvdGhlciBNZXRlb3JcbiAgLy8gaGFuZGxlcnMgdmlhIFdlYkFwcC5yYXdDb25uZWN0SGFuZGxlcnMuXG4gIHZhciByYXdDb25uZWN0SGFuZGxlcnMgPSBjb25uZWN0KCk7XG4gIGFwcC51c2UocmF3Q29ubmVjdEhhbmRsZXJzKTtcblxuICAvLyBBdXRvLWNvbXByZXNzIGFueSBqc29uLCBqYXZhc2NyaXB0LCBvciB0ZXh0LlxuICBhcHAudXNlKGNvbXByZXNzKCkpO1xuXG4gIC8vIHBhcnNlIGNvb2tpZXMgaW50byBhbiBvYmplY3RcbiAgYXBwLnVzZShjb29raWVQYXJzZXIoKSk7XG5cbiAgLy8gV2UncmUgbm90IGEgcHJveHk7IHJlamVjdCAod2l0aG91dCBjcmFzaGluZykgYXR0ZW1wdHMgdG8gdHJlYXQgdXMgbGlrZVxuICAvLyBvbmUuIChTZWUgIzEyMTIuKVxuICBhcHAudXNlKGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgaWYgKFJvdXRlUG9saWN5LmlzVmFsaWRVcmwocmVxLnVybCkpIHtcbiAgICAgIG5leHQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgIHJlcy53cml0ZShcIk5vdCBhIHByb3h5XCIpO1xuICAgIHJlcy5lbmQoKTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gZ2V0UGF0aFBhcnRzKHBhdGgpIHtcbiAgICBjb25zdCBwYXJ0cyA9IHBhdGguc3BsaXQoXCIvXCIpO1xuICAgIHdoaWxlIChwYXJ0c1swXSA9PT0gXCJcIikgcGFydHMuc2hpZnQoKTtcbiAgICByZXR1cm4gcGFydHM7XG4gIH1cblxuICBmdW5jdGlvbiBpc1ByZWZpeE9mKHByZWZpeCwgYXJyYXkpIHtcbiAgICByZXR1cm4gcHJlZml4Lmxlbmd0aCA8PSBhcnJheS5sZW5ndGggJiZcbiAgICAgIHByZWZpeC5ldmVyeSgocGFydCwgaSkgPT4gcGFydCA9PT0gYXJyYXlbaV0pO1xuICB9XG5cbiAgLy8gU3RyaXAgb2ZmIHRoZSBwYXRoIHByZWZpeCwgaWYgaXQgZXhpc3RzLlxuICBhcHAudXNlKGZ1bmN0aW9uIChyZXF1ZXN0LCByZXNwb25zZSwgbmV4dCkge1xuICAgIGNvbnN0IHBhdGhQcmVmaXggPSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYO1xuICAgIGNvbnN0IHsgcGF0aG5hbWUgfSA9IHBhcnNlVXJsKHJlcXVlc3QudXJsKTtcblxuICAgIC8vIGNoZWNrIGlmIHRoZSBwYXRoIGluIHRoZSB1cmwgc3RhcnRzIHdpdGggdGhlIHBhdGggcHJlZml4XG4gICAgaWYgKHBhdGhQcmVmaXgpIHtcbiAgICAgIGNvbnN0IHByZWZpeFBhcnRzID0gZ2V0UGF0aFBhcnRzKHBhdGhQcmVmaXgpO1xuICAgICAgY29uc3QgcGF0aFBhcnRzID0gZ2V0UGF0aFBhcnRzKHBhdGhuYW1lKTtcbiAgICAgIGlmIChpc1ByZWZpeE9mKHByZWZpeFBhcnRzLCBwYXRoUGFydHMpKSB7XG4gICAgICAgIHJlcXVlc3QudXJsID0gXCIvXCIgKyBwYXRoUGFydHMuc2xpY2UocHJlZml4UGFydHMubGVuZ3RoKS5qb2luKFwiL1wiKTtcbiAgICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocGF0aG5hbWUgPT09IFwiL2Zhdmljb24uaWNvXCIgfHxcbiAgICAgICAgcGF0aG5hbWUgPT09IFwiL3JvYm90cy50eHRcIikge1xuICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICB9XG5cbiAgICBpZiAocGF0aFByZWZpeCkge1xuICAgICAgcmVzcG9uc2Uud3JpdGVIZWFkKDQwNCk7XG4gICAgICByZXNwb25zZS53cml0ZShcIlVua25vd24gcGF0aFwiKTtcbiAgICAgIHJlc3BvbnNlLmVuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIG5leHQoKTtcbiAgfSk7XG5cbiAgLy8gUGFyc2UgdGhlIHF1ZXJ5IHN0cmluZyBpbnRvIHJlcy5xdWVyeS4gVXNlZCBieSBvYXV0aF9zZXJ2ZXIsIGJ1dCBpdCdzXG4gIC8vIGdlbmVyYWxseSBwcmV0dHkgaGFuZHkuLlxuICBhcHAudXNlKHF1ZXJ5KCkpO1xuXG4gIC8vIFNlcnZlIHN0YXRpYyBmaWxlcyBmcm9tIHRoZSBtYW5pZmVzdC5cbiAgLy8gVGhpcyBpcyBpbnNwaXJlZCBieSB0aGUgJ3N0YXRpYycgbWlkZGxld2FyZS5cbiAgYXBwLnVzZShmdW5jdGlvbiAocmVxLCByZXMsIG5leHQpIHtcbiAgICBXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNNaWRkbGV3YXJlKHN0YXRpY0ZpbGVzQnlBcmNoLCByZXEsIHJlcywgbmV4dCk7XG4gIH0pO1xuXG4gIC8vIENvcmUgTWV0ZW9yIHBhY2thZ2VzIGxpa2UgZHluYW1pYy1pbXBvcnQgY2FuIGFkZCBoYW5kbGVycyBiZWZvcmVcbiAgLy8gb3RoZXIgaGFuZGxlcnMgYWRkZWQgYnkgcGFja2FnZSBhbmQgYXBwbGljYXRpb24gY29kZS5cbiAgYXBwLnVzZShXZWJBcHBJbnRlcm5hbHMubWV0ZW9ySW50ZXJuYWxIYW5kbGVycyA9IGNvbm5lY3QoKSk7XG5cbiAgLy8gUGFja2FnZXMgYW5kIGFwcHMgY2FuIGFkZCBoYW5kbGVycyB0byB0aGlzIHZpYSBXZWJBcHAuY29ubmVjdEhhbmRsZXJzLlxuICAvLyBUaGV5IGFyZSBpbnNlcnRlZCBiZWZvcmUgb3VyIGRlZmF1bHQgaGFuZGxlci5cbiAgdmFyIHBhY2thZ2VBbmRBcHBIYW5kbGVycyA9IGNvbm5lY3QoKTtcbiAgYXBwLnVzZShwYWNrYWdlQW5kQXBwSGFuZGxlcnMpO1xuXG4gIHZhciBzdXBwcmVzc0Nvbm5lY3RFcnJvcnMgPSBmYWxzZTtcbiAgLy8gY29ubmVjdCBrbm93cyBpdCBpcyBhbiBlcnJvciBoYW5kbGVyIGJlY2F1c2UgaXQgaGFzIDQgYXJndW1lbnRzIGluc3RlYWQgb2ZcbiAgLy8gMy4gZ28gZmlndXJlLiAgKEl0IGlzIG5vdCBzbWFydCBlbm91Z2ggdG8gZmluZCBzdWNoIGEgdGhpbmcgaWYgaXQncyBoaWRkZW5cbiAgLy8gaW5zaWRlIHBhY2thZ2VBbmRBcHBIYW5kbGVycy4pXG4gIGFwcC51c2UoZnVuY3Rpb24gKGVyciwgcmVxLCByZXMsIG5leHQpIHtcbiAgICBpZiAoIWVyciB8fCAhc3VwcHJlc3NDb25uZWN0RXJyb3JzIHx8ICFyZXEuaGVhZGVyc1sneC1zdXBwcmVzcy1lcnJvciddKSB7XG4gICAgICBuZXh0KGVycik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJlcy53cml0ZUhlYWQoZXJyLnN0YXR1cywgeyAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW4nIH0pO1xuICAgIHJlcy5lbmQoXCJBbiBlcnJvciBtZXNzYWdlXCIpO1xuICB9KTtcblxuICBhcHAudXNlKGZ1bmN0aW9uIChyZXEsIHJlcywgbmV4dCkge1xuICAgIGlmICghIGFwcFVybChyZXEudXJsKSkge1xuICAgICAgcmV0dXJuIG5leHQoKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgaGVhZGVycyA9IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L2h0bWw7IGNoYXJzZXQ9dXRmLTgnXG4gICAgICB9O1xuXG4gICAgICBpZiAoc2h1dHRpbmdEb3duKSB7XG4gICAgICAgIGhlYWRlcnNbJ0Nvbm5lY3Rpb24nXSA9ICdDbG9zZSc7XG4gICAgICB9XG5cbiAgICAgIHZhciByZXF1ZXN0ID0gV2ViQXBwLmNhdGVnb3JpemVSZXF1ZXN0KHJlcSk7XG5cbiAgICAgIGlmIChyZXF1ZXN0LnVybC5xdWVyeSAmJiByZXF1ZXN0LnVybC5xdWVyeVsnbWV0ZW9yX2Nzc19yZXNvdXJjZSddKSB7XG4gICAgICAgIC8vIEluIHRoaXMgY2FzZSwgd2UncmUgcmVxdWVzdGluZyBhIENTUyByZXNvdXJjZSBpbiB0aGUgbWV0ZW9yLXNwZWNpZmljXG4gICAgICAgIC8vIHdheSwgYnV0IHdlIGRvbid0IGhhdmUgaXQuICBTZXJ2ZSBhIHN0YXRpYyBjc3MgZmlsZSB0aGF0IGluZGljYXRlcyB0aGF0XG4gICAgICAgIC8vIHdlIGRpZG4ndCBoYXZlIGl0LCBzbyB3ZSBjYW4gZGV0ZWN0IHRoYXQgYW5kIHJlZnJlc2guICBNYWtlIHN1cmVcbiAgICAgICAgLy8gdGhhdCBhbnkgcHJveGllcyBvciBDRE5zIGRvbid0IGNhY2hlIHRoaXMgZXJyb3IhICAoTm9ybWFsbHkgcHJveGllc1xuICAgICAgICAvLyBvciBDRE5zIGFyZSBzbWFydCBlbm91Z2ggbm90IHRvIGNhY2hlIGVycm9yIHBhZ2VzLCBidXQgaW4gb3JkZXIgdG9cbiAgICAgICAgLy8gbWFrZSB0aGlzIGhhY2sgd29yaywgd2UgbmVlZCB0byByZXR1cm4gdGhlIENTUyBmaWxlIGFzIGEgMjAwLCB3aGljaFxuICAgICAgICAvLyB3b3VsZCBvdGhlcndpc2UgYmUgY2FjaGVkLilcbiAgICAgICAgaGVhZGVyc1snQ29udGVudC1UeXBlJ10gPSAndGV4dC9jc3M7IGNoYXJzZXQ9dXRmLTgnO1xuICAgICAgICBoZWFkZXJzWydDYWNoZS1Db250cm9sJ10gPSAnbm8tY2FjaGUnO1xuICAgICAgICByZXMud3JpdGVIZWFkKDIwMCwgaGVhZGVycyk7XG4gICAgICAgIHJlcy53cml0ZShcIi5tZXRlb3ItY3NzLW5vdC1mb3VuZC1lcnJvciB7IHdpZHRoOiAwcHg7fVwiKTtcbiAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXF1ZXN0LnVybC5xdWVyeSAmJiByZXF1ZXN0LnVybC5xdWVyeVsnbWV0ZW9yX2pzX3Jlc291cmNlJ10pIHtcbiAgICAgICAgLy8gU2ltaWxhcmx5LCB3ZSdyZSByZXF1ZXN0aW5nIGEgSlMgcmVzb3VyY2UgdGhhdCB3ZSBkb24ndCBoYXZlLlxuICAgICAgICAvLyBTZXJ2ZSBhbiB1bmNhY2hlZCA0MDQuIChXZSBjYW4ndCB1c2UgdGhlIHNhbWUgaGFjayB3ZSB1c2UgZm9yIENTUyxcbiAgICAgICAgLy8gYmVjYXVzZSBhY3R1YWxseSBhY3Rpbmcgb24gdGhhdCBoYWNrIHJlcXVpcmVzIHVzIHRvIGhhdmUgdGhlIEpTXG4gICAgICAgIC8vIGFscmVhZHkhKVxuICAgICAgICBoZWFkZXJzWydDYWNoZS1Db250cm9sJ10gPSAnbm8tY2FjaGUnO1xuICAgICAgICByZXMud3JpdGVIZWFkKDQwNCwgaGVhZGVycyk7XG4gICAgICAgIHJlcy5lbmQoXCI0MDQgTm90IEZvdW5kXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXF1ZXN0LnVybC5xdWVyeSAmJiByZXF1ZXN0LnVybC5xdWVyeVsnbWV0ZW9yX2RvbnRfc2VydmVfaW5kZXgnXSkge1xuICAgICAgICAvLyBXaGVuIGRvd25sb2FkaW5nIGZpbGVzIGR1cmluZyBhIENvcmRvdmEgaG90IGNvZGUgcHVzaCwgd2UgbmVlZFxuICAgICAgICAvLyB0byBkZXRlY3QgaWYgYSBmaWxlIGlzIG5vdCBhdmFpbGFibGUgaW5zdGVhZCBvZiBpbmFkdmVydGVudGx5XG4gICAgICAgIC8vIGRvd25sb2FkaW5nIHRoZSBkZWZhdWx0IGluZGV4IHBhZ2UuXG4gICAgICAgIC8vIFNvIHNpbWlsYXIgdG8gdGhlIHNpdHVhdGlvbiBhYm92ZSwgd2Ugc2VydmUgYW4gdW5jYWNoZWQgNDA0LlxuICAgICAgICBoZWFkZXJzWydDYWNoZS1Db250cm9sJ10gPSAnbm8tY2FjaGUnO1xuICAgICAgICByZXMud3JpdGVIZWFkKDQwNCwgaGVhZGVycyk7XG4gICAgICAgIHJlcy5lbmQoXCI0MDQgTm90IEZvdW5kXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBnZXRCb2lsZXJwbGF0ZUFzeW5jKFxuICAgICAgICByZXF1ZXN0LFxuICAgICAgICBnZXRBcmNoQW5kUGF0aChcbiAgICAgICAgICBwYXJzZVJlcXVlc3QocmVxKS5wYXRobmFtZSxcbiAgICAgICAgICByZXF1ZXN0LmJyb3dzZXIsXG4gICAgICAgICkuYXJjaCxcbiAgICAgICkudGhlbigoeyBzdHJlYW0sIHN0YXR1c0NvZGUsIGhlYWRlcnM6IG5ld0hlYWRlcnMgfSkgPT4ge1xuICAgICAgICBpZiAoIXN0YXR1c0NvZGUpIHtcbiAgICAgICAgICBzdGF0dXNDb2RlID0gcmVzLnN0YXR1c0NvZGUgPyByZXMuc3RhdHVzQ29kZSA6IDIwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChuZXdIZWFkZXJzKSB7XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbihoZWFkZXJzLCBuZXdIZWFkZXJzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcy53cml0ZUhlYWQoc3RhdHVzQ29kZSwgaGVhZGVycyk7XG5cbiAgICAgICAgc3RyZWFtLnBpcGUocmVzLCB7XG4gICAgICAgICAgLy8gRW5kIHRoZSByZXNwb25zZSB3aGVuIHRoZSBzdHJlYW0gZW5kcy5cbiAgICAgICAgICBlbmQ6IHRydWUsXG4gICAgICAgIH0pO1xuXG4gICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgIExvZy5lcnJvcihcIkVycm9yIHJ1bm5pbmcgdGVtcGxhdGU6IFwiICsgZXJyb3Iuc3RhY2spO1xuICAgICAgICByZXMud3JpdGVIZWFkKDUwMCwgaGVhZGVycyk7XG4gICAgICAgIHJlcy5lbmQoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gUmV0dXJuIDQwNCBieSBkZWZhdWx0LCBpZiBubyBvdGhlciBoYW5kbGVycyBzZXJ2ZSB0aGlzIFVSTC5cbiAgYXBwLnVzZShmdW5jdGlvbiAocmVxLCByZXMpIHtcbiAgICByZXMud3JpdGVIZWFkKDQwNCk7XG4gICAgcmVzLmVuZCgpO1xuICB9KTtcblxuXG4gIHZhciBodHRwU2VydmVyID0gY3JlYXRlU2VydmVyKGFwcCk7XG4gIHZhciBvbkxpc3RlbmluZ0NhbGxiYWNrcyA9IFtdO1xuXG4gIC8vIEFmdGVyIDUgc2Vjb25kcyB3L28gZGF0YSBvbiBhIHNvY2tldCwga2lsbCBpdC4gIE9uIHRoZSBvdGhlciBoYW5kLCBpZlxuICAvLyB0aGVyZSdzIGFuIG91dHN0YW5kaW5nIHJlcXVlc3QsIGdpdmUgaXQgYSBoaWdoZXIgdGltZW91dCBpbnN0ZWFkICh0byBhdm9pZFxuICAvLyBraWxsaW5nIGxvbmctcG9sbGluZyByZXF1ZXN0cylcbiAgaHR0cFNlcnZlci5zZXRUaW1lb3V0KFNIT1JUX1NPQ0tFVF9USU1FT1VUKTtcblxuICAvLyBEbyB0aGlzIGhlcmUsIGFuZCB0aGVuIGFsc28gaW4gbGl2ZWRhdGEvc3RyZWFtX3NlcnZlci5qcywgYmVjYXVzZVxuICAvLyBzdHJlYW1fc2VydmVyLmpzIGtpbGxzIGFsbCB0aGUgY3VycmVudCByZXF1ZXN0IGhhbmRsZXJzIHdoZW4gaW5zdGFsbGluZyBpdHNcbiAgLy8gb3duLlxuICBodHRwU2VydmVyLm9uKCdyZXF1ZXN0JywgV2ViQXBwLl90aW1lb3V0QWRqdXN0bWVudFJlcXVlc3RDYWxsYmFjayk7XG5cbiAgLy8gSWYgdGhlIGNsaWVudCBnYXZlIHVzIGEgYmFkIHJlcXVlc3QsIHRlbGwgaXQgaW5zdGVhZCBvZiBqdXN0IGNsb3NpbmcgdGhlXG4gIC8vIHNvY2tldC4gVGhpcyBsZXRzIGxvYWQgYmFsYW5jZXJzIGluIGZyb250IG9mIHVzIGRpZmZlcmVudGlhdGUgYmV0d2VlbiBcImFcbiAgLy8gc2VydmVyIGlzIHJhbmRvbWx5IGNsb3Npbmcgc29ja2V0cyBmb3Igbm8gcmVhc29uXCIgYW5kIFwiY2xpZW50IHNlbnQgYSBiYWRcbiAgLy8gcmVxdWVzdFwiLlxuICAvL1xuICAvLyBUaGlzIHdpbGwgb25seSB3b3JrIG9uIE5vZGUgNjsgTm9kZSA0IGRlc3Ryb3lzIHRoZSBzb2NrZXQgYmVmb3JlIGNhbGxpbmdcbiAgLy8gdGhpcyBldmVudC4gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9wdWxsLzQ1NTcvIGZvciBkZXRhaWxzLlxuICBodHRwU2VydmVyLm9uKCdjbGllbnRFcnJvcicsIChlcnIsIHNvY2tldCkgPT4ge1xuICAgIC8vIFByZS1Ob2RlLTYsIGRvIG5vdGhpbmcuXG4gICAgaWYgKHNvY2tldC5kZXN0cm95ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZXJyLm1lc3NhZ2UgPT09ICdQYXJzZSBFcnJvcicpIHtcbiAgICAgIHNvY2tldC5lbmQoJ0hUVFAvMS4xIDQwMCBCYWQgUmVxdWVzdFxcclxcblxcclxcbicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGb3Igb3RoZXIgZXJyb3JzLCB1c2UgdGhlIGRlZmF1bHQgYmVoYXZpb3IgYXMgaWYgd2UgaGFkIG5vIGNsaWVudEVycm9yXG4gICAgICAvLyBoYW5kbGVyLlxuICAgICAgc29ja2V0LmRlc3Ryb3koZXJyKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIHN0YXJ0IHVwIGFwcFxuICBfLmV4dGVuZChXZWJBcHAsIHtcbiAgICBjb25uZWN0SGFuZGxlcnM6IHBhY2thZ2VBbmRBcHBIYW5kbGVycyxcbiAgICByYXdDb25uZWN0SGFuZGxlcnM6IHJhd0Nvbm5lY3RIYW5kbGVycyxcbiAgICBodHRwU2VydmVyOiBodHRwU2VydmVyLFxuICAgIGNvbm5lY3RBcHA6IGFwcCxcbiAgICAvLyBGb3IgdGVzdGluZy5cbiAgICBzdXBwcmVzc0Nvbm5lY3RFcnJvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHN1cHByZXNzQ29ubmVjdEVycm9ycyA9IHRydWU7XG4gICAgfSxcbiAgICBvbkxpc3RlbmluZzogZnVuY3Rpb24gKGYpIHtcbiAgICAgIGlmIChvbkxpc3RlbmluZ0NhbGxiYWNrcylcbiAgICAgICAgb25MaXN0ZW5pbmdDYWxsYmFja3MucHVzaChmKTtcbiAgICAgIGVsc2VcbiAgICAgICAgZigpO1xuICAgIH0sXG4gICAgLy8gVGhpcyBjYW4gYmUgb3ZlcnJpZGRlbiBieSB1c2VycyB3aG8gd2FudCB0byBtb2RpZnkgaG93IGxpc3RlbmluZyB3b3Jrc1xuICAgIC8vIChlZywgdG8gcnVuIGEgcHJveHkgbGlrZSBBcG9sbG8gRW5naW5lIFByb3h5IGluIGZyb250IG9mIHRoZSBzZXJ2ZXIpLlxuICAgIHN0YXJ0TGlzdGVuaW5nOiBmdW5jdGlvbiAoaHR0cFNlcnZlciwgbGlzdGVuT3B0aW9ucywgY2IpIHtcbiAgICAgIGh0dHBTZXJ2ZXIubGlzdGVuKGxpc3Rlbk9wdGlvbnMsIGNiKTtcbiAgICB9LFxuICB9KTtcblxuICAvLyBMZXQgdGhlIHJlc3Qgb2YgdGhlIHBhY2thZ2VzIChhbmQgTWV0ZW9yLnN0YXJ0dXAgaG9va3MpIGluc2VydCBjb25uZWN0XG4gIC8vIG1pZGRsZXdhcmVzIGFuZCB1cGRhdGUgX19tZXRlb3JfcnVudGltZV9jb25maWdfXywgdGhlbiBrZWVwIGdvaW5nIHRvIHNldCB1cFxuICAvLyBhY3R1YWxseSBzZXJ2aW5nIEhUTUwuXG4gIGV4cG9ydHMubWFpbiA9IGFyZ3YgPT4ge1xuICAgIFdlYkFwcEludGVybmFscy5nZW5lcmF0ZUJvaWxlcnBsYXRlKCk7XG5cbiAgICBjb25zdCBzdGFydEh0dHBTZXJ2ZXIgPSBsaXN0ZW5PcHRpb25zID0+IHtcbiAgICAgIFdlYkFwcC5zdGFydExpc3RlbmluZyhodHRwU2VydmVyLCBsaXN0ZW5PcHRpb25zLCBNZXRlb3IuYmluZEVudmlyb25tZW50KCgpID0+IHtcbiAgICAgICAgaWYgKHByb2Nlc3MuZW52Lk1FVEVPUl9QUklOVF9PTl9MSVNURU4pIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkxJU1RFTklOR1wiKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjYWxsYmFja3MgPSBvbkxpc3RlbmluZ0NhbGxiYWNrcztcbiAgICAgICAgb25MaXN0ZW5pbmdDYWxsYmFja3MgPSBudWxsO1xuICAgICAgICBjYWxsYmFja3MuZm9yRWFjaChjYWxsYmFjayA9PiB7IGNhbGxiYWNrKCk7IH0pO1xuICAgICAgfSwgZSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBsaXN0ZW5pbmc6XCIsIGUpO1xuICAgICAgICBjb25zb2xlLmVycm9yKGUgJiYgZS5zdGFjayk7XG4gICAgICB9KSk7XG4gICAgfTtcblxuICAgIGxldCBsb2NhbFBvcnQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDA7XG4gICAgY29uc3QgdW5peFNvY2tldFBhdGggPSBwcm9jZXNzLmVudi5VTklYX1NPQ0tFVF9QQVRIO1xuXG4gICAgaWYgKHVuaXhTb2NrZXRQYXRoKSB7XG4gICAgICAvLyBTdGFydCB0aGUgSFRUUCBzZXJ2ZXIgdXNpbmcgYSBzb2NrZXQgZmlsZS5cbiAgICAgIHJlbW92ZUV4aXN0aW5nU29ja2V0RmlsZSh1bml4U29ja2V0UGF0aCk7XG4gICAgICBzdGFydEh0dHBTZXJ2ZXIoeyBwYXRoOiB1bml4U29ja2V0UGF0aCB9KTtcbiAgICAgIHJlZ2lzdGVyU29ja2V0RmlsZUNsZWFudXAodW5peFNvY2tldFBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2NhbFBvcnQgPSBpc05hTihOdW1iZXIobG9jYWxQb3J0KSkgPyBsb2NhbFBvcnQgOiBOdW1iZXIobG9jYWxQb3J0KTtcbiAgICAgIGlmICgvXFxcXFxcXFw/LitcXFxccGlwZVxcXFw/LisvLnRlc3QobG9jYWxQb3J0KSkge1xuICAgICAgICAvLyBTdGFydCB0aGUgSFRUUCBzZXJ2ZXIgdXNpbmcgV2luZG93cyBTZXJ2ZXIgc3R5bGUgbmFtZWQgcGlwZS5cbiAgICAgICAgc3RhcnRIdHRwU2VydmVyKHsgcGF0aDogbG9jYWxQb3J0IH0pO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbG9jYWxQb3J0ID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgIC8vIFN0YXJ0IHRoZSBIVFRQIHNlcnZlciB1c2luZyBUQ1AuXG4gICAgICAgIHN0YXJ0SHR0cFNlcnZlcih7XG4gICAgICAgICAgcG9ydDogbG9jYWxQb3J0LFxuICAgICAgICAgIGhvc3Q6IHByb2Nlc3MuZW52LkJJTkRfSVAgfHwgXCIwLjAuMC4wXCJcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIFBPUlQgc3BlY2lmaWVkXCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBcIkRBRU1PTlwiO1xuICB9O1xufVxuXG5cbnJ1bldlYkFwcFNlcnZlcigpO1xuXG5cbnZhciBpbmxpbmVTY3JpcHRzQWxsb3dlZCA9IHRydWU7XG5cbldlYkFwcEludGVybmFscy5pbmxpbmVTY3JpcHRzQWxsb3dlZCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGlubGluZVNjcmlwdHNBbGxvd2VkO1xufTtcblxuV2ViQXBwSW50ZXJuYWxzLnNldElubGluZVNjcmlwdHNBbGxvd2VkID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIGlubGluZVNjcmlwdHNBbGxvd2VkID0gdmFsdWU7XG4gIFdlYkFwcEludGVybmFscy5nZW5lcmF0ZUJvaWxlcnBsYXRlKCk7XG59O1xuXG5cbldlYkFwcEludGVybmFscy5zZXRCdW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayA9IGZ1bmN0aW9uIChob29rRm4pIHtcbiAgYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2sgPSBob29rRm47XG4gIFdlYkFwcEludGVybmFscy5nZW5lcmF0ZUJvaWxlcnBsYXRlKCk7XG59O1xuXG5XZWJBcHBJbnRlcm5hbHMuc2V0QnVuZGxlZEpzQ3NzUHJlZml4ID0gZnVuY3Rpb24gKHByZWZpeCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYuc2V0QnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2soXG4gICAgZnVuY3Rpb24gKHVybCkge1xuICAgICAgcmV0dXJuIHByZWZpeCArIHVybDtcbiAgfSk7XG59O1xuXG4vLyBQYWNrYWdlcyBjYW4gY2FsbCBgV2ViQXBwSW50ZXJuYWxzLmFkZFN0YXRpY0pzYCB0byBzcGVjaWZ5IHN0YXRpY1xuLy8gSmF2YVNjcmlwdCB0byBiZSBpbmNsdWRlZCBpbiB0aGUgYXBwLiBUaGlzIHN0YXRpYyBKUyB3aWxsIGJlIGlubGluZWQsXG4vLyB1bmxlc3MgaW5saW5lIHNjcmlwdHMgaGF2ZSBiZWVuIGRpc2FibGVkLCBpbiB3aGljaCBjYXNlIGl0IHdpbGwgYmVcbi8vIHNlcnZlZCB1bmRlciBgLzxzaGExIG9mIGNvbnRlbnRzPmAuXG52YXIgYWRkaXRpb25hbFN0YXRpY0pzID0ge307XG5XZWJBcHBJbnRlcm5hbHMuYWRkU3RhdGljSnMgPSBmdW5jdGlvbiAoY29udGVudHMpIHtcbiAgYWRkaXRpb25hbFN0YXRpY0pzW1wiL1wiICsgc2hhMShjb250ZW50cykgKyBcIi5qc1wiXSA9IGNvbnRlbnRzO1xufTtcblxuLy8gRXhwb3J0ZWQgZm9yIHRlc3RzXG5XZWJBcHBJbnRlcm5hbHMuZ2V0Qm9pbGVycGxhdGUgPSBnZXRCb2lsZXJwbGF0ZTtcbldlYkFwcEludGVybmFscy5hZGRpdGlvbmFsU3RhdGljSnMgPSBhZGRpdGlvbmFsU3RhdGljSnM7XG4iLCJpbXBvcnQgbnBtQ29ubmVjdCBmcm9tIFwiY29ubmVjdFwiO1xuXG5leHBvcnQgZnVuY3Rpb24gY29ubmVjdCguLi5jb25uZWN0QXJncykge1xuICBjb25zdCBoYW5kbGVycyA9IG5wbUNvbm5lY3QuYXBwbHkodGhpcywgY29ubmVjdEFyZ3MpO1xuICBjb25zdCBvcmlnaW5hbFVzZSA9IGhhbmRsZXJzLnVzZTtcblxuICAvLyBXcmFwIHRoZSBoYW5kbGVycy51c2UgbWV0aG9kIHNvIHRoYXQgYW55IHByb3ZpZGVkIGhhbmRsZXIgZnVuY3Rpb25zXG4gIC8vIGFsd2F5IHJ1biBpbiBhIEZpYmVyLlxuICBoYW5kbGVycy51c2UgPSBmdW5jdGlvbiB1c2UoLi4udXNlQXJncykge1xuICAgIGNvbnN0IHsgc3RhY2sgfSA9IHRoaXM7XG4gICAgY29uc3Qgb3JpZ2luYWxMZW5ndGggPSBzdGFjay5sZW5ndGg7XG4gICAgY29uc3QgcmVzdWx0ID0gb3JpZ2luYWxVc2UuYXBwbHkodGhpcywgdXNlQXJncyk7XG5cbiAgICAvLyBJZiB3ZSBqdXN0IGFkZGVkIGFueXRoaW5nIHRvIHRoZSBzdGFjaywgd3JhcCBlYWNoIG5ldyBlbnRyeS5oYW5kbGVcbiAgICAvLyB3aXRoIGEgZnVuY3Rpb24gdGhhdCBjYWxscyBQcm9taXNlLmFzeW5jQXBwbHkgdG8gZW5zdXJlIHRoZVxuICAgIC8vIG9yaWdpbmFsIGhhbmRsZXIgcnVucyBpbiBhIEZpYmVyLlxuICAgIGZvciAobGV0IGkgPSBvcmlnaW5hbExlbmd0aDsgaSA8IHN0YWNrLmxlbmd0aDsgKytpKSB7XG4gICAgICBjb25zdCBlbnRyeSA9IHN0YWNrW2ldO1xuICAgICAgY29uc3Qgb3JpZ2luYWxIYW5kbGUgPSBlbnRyeS5oYW5kbGU7XG5cbiAgICAgIGlmIChvcmlnaW5hbEhhbmRsZS5sZW5ndGggPj0gNCkge1xuICAgICAgICAvLyBJZiB0aGUgb3JpZ2luYWwgaGFuZGxlIGhhZCBmb3VyIChvciBtb3JlKSBwYXJhbWV0ZXJzLCB0aGVcbiAgICAgICAgLy8gd3JhcHBlciBtdXN0IGFsc28gaGF2ZSBmb3VyIHBhcmFtZXRlcnMsIHNpbmNlIGNvbm5lY3QgdXNlc1xuICAgICAgICAvLyBoYW5kbGUubGVuZ3RoIHRvIGRlcm1pbmUgd2hldGhlciB0byBwYXNzIHRoZSBlcnJvciBhcyB0aGUgZmlyc3RcbiAgICAgICAgLy8gYXJndW1lbnQgdG8gdGhlIGhhbmRsZSBmdW5jdGlvbi5cbiAgICAgICAgZW50cnkuaGFuZGxlID0gZnVuY3Rpb24gaGFuZGxlKGVyciwgcmVxLCByZXMsIG5leHQpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hc3luY0FwcGx5KG9yaWdpbmFsSGFuZGxlLCB0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZW50cnkuaGFuZGxlID0gZnVuY3Rpb24gaGFuZGxlKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UuYXN5bmNBcHBseShvcmlnaW5hbEhhbmRsZSwgdGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIHJldHVybiBoYW5kbGVycztcbn1cbiIsImltcG9ydCB7IHN0YXRTeW5jLCB1bmxpbmtTeW5jLCBleGlzdHNTeW5jIH0gZnJvbSAnZnMnO1xuXG4vLyBTaW5jZSBhIG5ldyBzb2NrZXQgZmlsZSB3aWxsIGJlIGNyZWF0ZWQgd2hlbiB0aGUgSFRUUCBzZXJ2ZXJcbi8vIHN0YXJ0cyB1cCwgaWYgZm91bmQgcmVtb3ZlIHRoZSBleGlzdGluZyBmaWxlLlxuLy9cbi8vIFdBUk5JTkc6XG4vLyBUaGlzIHdpbGwgcmVtb3ZlIHRoZSBjb25maWd1cmVkIHNvY2tldCBmaWxlIHdpdGhvdXQgd2FybmluZy4gSWZcbi8vIHRoZSBjb25maWd1cmVkIHNvY2tldCBmaWxlIGlzIGFscmVhZHkgaW4gdXNlIGJ5IGFub3RoZXIgYXBwbGljYXRpb24sXG4vLyBpdCB3aWxsIHN0aWxsIGJlIHJlbW92ZWQuIE5vZGUgZG9lcyBub3QgcHJvdmlkZSBhIHJlbGlhYmxlIHdheSB0b1xuLy8gZGlmZmVyZW50aWF0ZSBiZXR3ZWVuIGEgc29ja2V0IGZpbGUgdGhhdCBpcyBhbHJlYWR5IGluIHVzZSBieVxuLy8gYW5vdGhlciBhcHBsaWNhdGlvbiBvciBhIHN0YWxlIHNvY2tldCBmaWxlIHRoYXQgaGFzIGJlZW5cbi8vIGxlZnQgb3ZlciBhZnRlciBhIFNJR0tJTEwuIFNpbmNlIHdlIGhhdmUgbm8gcmVsaWFibGUgd2F5IHRvXG4vLyBkaWZmZXJlbnRpYXRlIGJldHdlZW4gdGhlc2UgdHdvIHNjZW5hcmlvcywgdGhlIGJlc3QgY291cnNlIG9mXG4vLyBhY3Rpb24gZHVyaW5nIHN0YXJ0dXAgaXMgdG8gcmVtb3ZlIGFueSBleGlzdGluZyBzb2NrZXQgZmlsZS4gVGhpc1xuLy8gaXMgbm90IHRoZSBzYWZlc3QgY291cnNlIG9mIGFjdGlvbiBhcyByZW1vdmluZyB0aGUgZXhpc3Rpbmcgc29ja2V0XG4vLyBmaWxlIGNvdWxkIGltcGFjdCBhbiBhcHBsaWNhdGlvbiB1c2luZyBpdCwgYnV0IHRoaXMgYXBwcm9hY2ggaGVscHNcbi8vIGVuc3VyZSB0aGUgSFRUUCBzZXJ2ZXIgY2FuIHN0YXJ0dXAgd2l0aG91dCBtYW51YWxcbi8vIGludGVydmVudGlvbiAoZS5nLiBhc2tpbmcgZm9yIHRoZSB2ZXJpZmljYXRpb24gYW5kIGNsZWFudXAgb2Ygc29ja2V0XG4vLyBmaWxlcyBiZWZvcmUgYWxsb3dpbmcgdGhlIEhUVFAgc2VydmVyIHRvIGJlIHN0YXJ0ZWQpLlxuLy9cbi8vIFRoZSBhYm92ZSBiZWluZyBzYWlkLCBhcyBsb25nIGFzIHRoZSBzb2NrZXQgZmlsZSBwYXRoIGlzXG4vLyBjb25maWd1cmVkIGNhcmVmdWxseSB3aGVuIHRoZSBhcHBsaWNhdGlvbiBpcyBkZXBsb3llZCAoYW5kIGV4dHJhXG4vLyBjYXJlIGlzIHRha2VuIHRvIG1ha2Ugc3VyZSB0aGUgY29uZmlndXJlZCBwYXRoIGlzIHVuaXF1ZSBhbmQgZG9lc24ndFxuLy8gY29uZmxpY3Qgd2l0aCBhbm90aGVyIHNvY2tldCBmaWxlIHBhdGgpLCB0aGVuIHRoZXJlIHNob3VsZCBub3QgYmVcbi8vIGFueSBpc3N1ZXMgd2l0aCB0aGlzIGFwcHJvYWNoLlxuZXhwb3J0IGNvbnN0IHJlbW92ZUV4aXN0aW5nU29ja2V0RmlsZSA9IChzb2NrZXRQYXRoKSA9PiB7XG4gIHRyeSB7XG4gICAgaWYgKHN0YXRTeW5jKHNvY2tldFBhdGgpLmlzU29ja2V0KCkpIHtcbiAgICAgIC8vIFNpbmNlIGEgbmV3IHNvY2tldCBmaWxlIHdpbGwgYmUgY3JlYXRlZCwgcmVtb3ZlIHRoZSBleGlzdGluZ1xuICAgICAgLy8gZmlsZS5cbiAgICAgIHVubGlua1N5bmMoc29ja2V0UGF0aCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEFuIGV4aXN0aW5nIGZpbGUgd2FzIGZvdW5kIGF0IFwiJHtzb2NrZXRQYXRofVwiIGFuZCBpdCBpcyBub3QgYCArXG4gICAgICAgICdhIHNvY2tldCBmaWxlLiBQbGVhc2UgY29uZmlybSBQT1JUIGlzIHBvaW50aW5nIHRvIHZhbGlkIGFuZCAnICtcbiAgICAgICAgJ3VuLXVzZWQgc29ja2V0IGZpbGUgcGF0aC4nXG4gICAgICApO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBJZiB0aGVyZSBpcyBubyBleGlzdGluZyBzb2NrZXQgZmlsZSB0byBjbGVhbnVwLCBncmVhdCwgd2UnbGxcbiAgICAvLyBjb250aW51ZSBub3JtYWxseS4gSWYgdGhlIGNhdWdodCBleGNlcHRpb24gcmVwcmVzZW50cyBhbnkgb3RoZXJcbiAgICAvLyBpc3N1ZSwgcmUtdGhyb3cuXG4gICAgaWYgKGVycm9yLmNvZGUgIT09ICdFTk9FTlQnKSB7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cbn07XG5cbi8vIFJlbW92ZSB0aGUgc29ja2V0IGZpbGUgd2hlbiBkb25lIHRvIGF2b2lkIGxlYXZpbmcgYmVoaW5kIGEgc3RhbGUgb25lLlxuLy8gTm90ZSAtIGEgc3RhbGUgc29ja2V0IGZpbGUgaXMgc3RpbGwgbGVmdCBiZWhpbmQgaWYgdGhlIHJ1bm5pbmcgbm9kZVxuLy8gcHJvY2VzcyBpcyBraWxsZWQgdmlhIHNpZ25hbCA5IC0gU0lHS0lMTC5cbmV4cG9ydCBjb25zdCByZWdpc3RlclNvY2tldEZpbGVDbGVhbnVwID1cbiAgKHNvY2tldFBhdGgsIGV2ZW50RW1pdHRlciA9IHByb2Nlc3MpID0+IHtcbiAgICBbJ2V4aXQnLCAnU0lHSU5UJywgJ1NJR0hVUCcsICdTSUdURVJNJ10uZm9yRWFjaChzaWduYWwgPT4ge1xuICAgICAgZXZlbnRFbWl0dGVyLm9uKHNpZ25hbCwgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7XG4gICAgICAgIGlmIChleGlzdHNTeW5jKHNvY2tldFBhdGgpKSB7XG4gICAgICAgICAgdW5saW5rU3luYyhzb2NrZXRQYXRoKTtcbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgIH0pO1xuICB9O1xuIl19
