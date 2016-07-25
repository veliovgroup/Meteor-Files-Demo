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
var Buffer = Package.modules.Buffer;
var process = Package.modules.process;
var Symbol = Package['ecmascript-runtime'].Symbol;
var Map = Package['ecmascript-runtime'].Map;
var Set = Package['ecmascript-runtime'].Set;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var WebApp, WebAppInternals, main;

var require = meteorInstall({"node_modules":{"meteor":{"webapp":{"webapp_server.js":["babel-runtime/helpers/typeof",function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/webapp/webapp_server.js                                                                                  //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
var _typeof2 = require("babel-runtime/helpers/typeof");                                                              //
                                                                                                                     //
var _typeof3 = _interopRequireDefault(_typeof2);                                                                     //
                                                                                                                     //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                    //
                                                                                                                     //
////////// Requires //////////                                                                                       //
                                                                                                                     //
var fs = Npm.require("fs");                                                                                          // 3
var http = Npm.require("http");                                                                                      // 4
var os = Npm.require("os");                                                                                          // 5
var path = Npm.require("path");                                                                                      // 6
var url = Npm.require("url");                                                                                        // 7
var crypto = Npm.require("crypto");                                                                                  // 8
                                                                                                                     //
var connect = Npm.require('connect');                                                                                // 10
var parseurl = Npm.require('parseurl');                                                                              // 11
var useragent = Npm.require('useragent');                                                                            // 12
var send = Npm.require('send');                                                                                      // 13
                                                                                                                     //
var Future = Npm.require('fibers/future');                                                                           // 15
var Fiber = Npm.require('fibers');                                                                                   // 16
                                                                                                                     //
var SHORT_SOCKET_TIMEOUT = 5 * 1000;                                                                                 // 18
var LONG_SOCKET_TIMEOUT = 120 * 1000;                                                                                // 19
                                                                                                                     //
WebApp = {};                                                                                                         // 21
WebAppInternals = {};                                                                                                // 22
                                                                                                                     //
WebAppInternals.NpmModules = {                                                                                       // 24
  connect: {                                                                                                         // 25
    version: Npm.require('connect/package.json').version,                                                            // 26
    module: connect                                                                                                  // 27
  }                                                                                                                  // 25
};                                                                                                                   // 24
                                                                                                                     //
WebApp.defaultArch = 'web.browser';                                                                                  // 31
                                                                                                                     //
// XXX maps archs to manifests                                                                                       //
WebApp.clientPrograms = {};                                                                                          // 34
                                                                                                                     //
// XXX maps archs to program path on filesystem                                                                      //
var archPath = {};                                                                                                   // 37
                                                                                                                     //
var bundledJsCssUrlRewriteHook = function bundledJsCssUrlRewriteHook(url) {                                          // 39
  var bundledPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '';                                          // 40
  return bundledPrefix + url;                                                                                        // 42
};                                                                                                                   // 43
                                                                                                                     //
var sha1 = function sha1(contents) {                                                                                 // 45
  var hash = crypto.createHash('sha1');                                                                              // 46
  hash.update(contents);                                                                                             // 47
  return hash.digest('hex');                                                                                         // 48
};                                                                                                                   // 49
                                                                                                                     //
var readUtf8FileSync = function readUtf8FileSync(filename) {                                                         // 51
  return Meteor.wrapAsync(fs.readFile)(filename, 'utf8');                                                            // 52
};                                                                                                                   // 53
                                                                                                                     //
// #BrowserIdentification                                                                                            //
//                                                                                                                   //
// We have multiple places that want to identify the browser: the                                                    //
// unsupported browser page, the appcache package, and, eventually                                                   //
// delivering browser polyfills only as needed.                                                                      //
//                                                                                                                   //
// To avoid detecting the browser in multiple places ad-hoc, we create a                                             //
// Meteor "browser" object. It uses but does not expose the npm                                                      //
// useragent module (we could choose a different mechanism to identify                                               //
// the browser in the future if we wanted to).  The browser object                                                   //
// contains                                                                                                          //
//                                                                                                                   //
// * `name`: the name of the browser in camel case                                                                   //
// * `major`, `minor`, `patch`: integers describing the browser version                                              //
//                                                                                                                   //
// Also here is an early version of a Meteor `request` object, intended                                              //
// to be a high-level description of the request without exposing                                                    //
// details of connect's low-level `req`.  Currently it contains:                                                     //
//                                                                                                                   //
// * `browser`: browser identification object described above                                                        //
// * `url`: parsed url, including parsed query params                                                                //
//                                                                                                                   //
// As a temporary hack there is a `categorizeRequest` function on WebApp which                                       //
// converts a connect `req` to a Meteor `request`. This can go away once smart                                       //
// packages such as appcache are being passed a `request` object directly when                                       //
// they serve content.                                                                                               //
//                                                                                                                   //
// This allows `request` to be used uniformly: it is passed to the html                                              //
// attributes hook, and the appcache package can use it when deciding                                                //
// whether to generate a 404 for the manifest.                                                                       //
//                                                                                                                   //
// Real routing / server side rendering will probably refactor this                                                  //
// heavily.                                                                                                          //
                                                                                                                     //
// e.g. "Mobile Safari" => "mobileSafari"                                                                            //
var camelCase = function camelCase(name) {                                                                           // 91
  var parts = name.split(' ');                                                                                       // 92
  parts[0] = parts[0].toLowerCase();                                                                                 // 93
  for (var i = 1; i < parts.length; ++i) {                                                                           // 94
    parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].substr(1);                                                // 95
  }                                                                                                                  // 96
  return parts.join('');                                                                                             // 97
};                                                                                                                   // 98
                                                                                                                     //
var identifyBrowser = function identifyBrowser(userAgentString) {                                                    // 100
  var userAgent = useragent.lookup(userAgentString);                                                                 // 101
  return {                                                                                                           // 102
    name: camelCase(userAgent.family),                                                                               // 103
    major: +userAgent.major,                                                                                         // 104
    minor: +userAgent.minor,                                                                                         // 105
    patch: +userAgent.patch                                                                                          // 106
  };                                                                                                                 // 102
};                                                                                                                   // 108
                                                                                                                     //
// XXX Refactor as part of implementing real routing.                                                                //
WebAppInternals.identifyBrowser = identifyBrowser;                                                                   // 111
                                                                                                                     //
WebApp.categorizeRequest = function (req) {                                                                          // 113
  return _.extend({                                                                                                  // 114
    browser: identifyBrowser(req.headers['user-agent']),                                                             // 115
    url: url.parse(req.url, true)                                                                                    // 116
  }, _.pick(req, 'dynamicHead', 'dynamicBody'));                                                                     // 114
};                                                                                                                   // 118
                                                                                                                     //
// HTML attribute hooks: functions to be called to determine any attributes to                                       //
// be added to the '<html>' tag. Each function is passed a 'request' object (see                                     //
// #BrowserIdentification) and should return null or object.                                                         //
var htmlAttributeHooks = [];                                                                                         // 123
var getHtmlAttributes = function getHtmlAttributes(request) {                                                        // 124
  var combinedAttributes = {};                                                                                       // 125
  _.each(htmlAttributeHooks || [], function (hook) {                                                                 // 126
    var attributes = hook(request);                                                                                  // 127
    if (attributes === null) return;                                                                                 // 128
    if ((typeof attributes === "undefined" ? "undefined" : (0, _typeof3["default"])(attributes)) !== 'object') throw Error("HTML attribute hook must return null or object");
    _.extend(combinedAttributes, attributes);                                                                        // 132
  });                                                                                                                // 133
  return combinedAttributes;                                                                                         // 134
};                                                                                                                   // 135
WebApp.addHtmlAttributeHook = function (hook) {                                                                      // 136
  htmlAttributeHooks.push(hook);                                                                                     // 137
};                                                                                                                   // 138
                                                                                                                     //
// Serve app HTML for this URL?                                                                                      //
var appUrl = function appUrl(url) {                                                                                  // 141
  if (url === '/favicon.ico' || url === '/robots.txt') return false;                                                 // 142
                                                                                                                     //
  // NOTE: app.manifest is not a web standard like favicon.ico and                                                   //
  // robots.txt. It is a file name we have chosen to use for HTML5                                                   //
  // appcache URLs. It is included here to prevent using an appcache                                                 //
  // then removing it from poisoning an app permanently. Eventually,                                                 //
  // once we have server side routing, this won't be needed as                                                       //
  // unknown URLs with return a 404 automatically.                                                                   //
  if (url === '/app.manifest') return false;                                                                         // 151
                                                                                                                     //
  // Avoid serving app HTML for declared routes such as /sockjs/.                                                    //
  if (RoutePolicy.classify(url)) return false;                                                                       // 155
                                                                                                                     //
  // we currently return app HTML on all URLs by default                                                             //
  return true;                                                                                                       // 159
};                                                                                                                   // 160
                                                                                                                     //
// We need to calculate the client hash after all packages have loaded                                               //
// to give them a chance to populate __meteor_runtime_config__.                                                      //
//                                                                                                                   //
// Calculating the hash during startup means that packages can only                                                  //
// populate __meteor_runtime_config__ during load, not during startup.                                               //
//                                                                                                                   //
// Calculating instead it at the beginning of main after all startup                                                 //
// hooks had run would allow packages to also populate                                                               //
// __meteor_runtime_config__ during startup, but that's too late for                                                 //
// autoupdate because it needs to have the client hash at startup to                                                 //
// insert the auto update version itself into                                                                        //
// __meteor_runtime_config__ to get it to the client.                                                                //
//                                                                                                                   //
// An alternative would be to give autoupdate a "post-start,                                                         //
// pre-listen" hook to allow it to insert the auto update version at                                                 //
// the right moment.                                                                                                 //
                                                                                                                     //
Meteor.startup(function () {                                                                                         // 180
  var calculateClientHash = WebAppHashing.calculateClientHash;                                                       // 181
  WebApp.clientHash = function (archName) {                                                                          // 182
    archName = archName || WebApp.defaultArch;                                                                       // 183
    return calculateClientHash(WebApp.clientPrograms[archName].manifest);                                            // 184
  };                                                                                                                 // 185
                                                                                                                     //
  WebApp.calculateClientHashRefreshable = function (archName) {                                                      // 187
    archName = archName || WebApp.defaultArch;                                                                       // 188
    return calculateClientHash(WebApp.clientPrograms[archName].manifest, function (name) {                           // 189
      return name === "css";                                                                                         // 191
    });                                                                                                              // 192
  };                                                                                                                 // 193
  WebApp.calculateClientHashNonRefreshable = function (archName) {                                                   // 194
    archName = archName || WebApp.defaultArch;                                                                       // 195
    return calculateClientHash(WebApp.clientPrograms[archName].manifest, function (name) {                           // 196
      return name !== "css";                                                                                         // 198
    });                                                                                                              // 199
  };                                                                                                                 // 200
  WebApp.calculateClientHashCordova = function () {                                                                  // 201
    var archName = 'web.cordova';                                                                                    // 202
    if (!WebApp.clientPrograms[archName]) return 'none';                                                             // 203
                                                                                                                     //
    return calculateClientHash(WebApp.clientPrograms[archName].manifest, null, _.pick(__meteor_runtime_config__, 'PUBLIC_SETTINGS'));
  };                                                                                                                 // 209
});                                                                                                                  // 210
                                                                                                                     //
// When we have a request pending, we want the socket timeout to be long, to                                         //
// give ourselves a while to serve it, and to allow sockjs long polls to                                             //
// complete.  On the other hand, we want to close idle sockets relatively                                            //
// quickly, so that we can shut down relatively promptly but cleanly, without                                        //
// cutting off anyone's response.                                                                                    //
WebApp._timeoutAdjustmentRequestCallback = function (req, res) {                                                     // 219
  // this is really just req.socket.setTimeout(LONG_SOCKET_TIMEOUT);                                                 //
  req.setTimeout(LONG_SOCKET_TIMEOUT);                                                                               // 221
  // Insert our new finish listener to run BEFORE the existing one which removes                                     //
  // the response from the socket.                                                                                   //
  var finishListeners = res.listeners('finish');                                                                     // 224
  // XXX Apparently in Node 0.12 this event is now called 'prefinish'.                                               //
  // https://github.com/joyent/node/commit/7c9b6070                                                                  //
  res.removeAllListeners('finish');                                                                                  // 227
  res.on('finish', function () {                                                                                     // 228
    res.setTimeout(SHORT_SOCKET_TIMEOUT);                                                                            // 229
  });                                                                                                                // 230
  _.each(finishListeners, function (l) {                                                                             // 231
    res.on('finish', l);                                                                                             // 231
  });                                                                                                                // 231
};                                                                                                                   // 232
                                                                                                                     //
// Will be updated by main before we listen.                                                                         //
// Map from client arch to boilerplate object.                                                                       //
// Boilerplate object has:                                                                                           //
//   - func: XXX                                                                                                     //
//   - baseData: XXX                                                                                                 //
var boilerplateByArch = {};                                                                                          // 240
                                                                                                                     //
// Given a request (as returned from `categorizeRequest`), return the                                                //
// boilerplate HTML to serve for that request.                                                                       //
//                                                                                                                   //
// If a previous connect middleware has rendered content for the head or body,                                       //
// returns the boilerplate with that content patched in otherwise                                                    //
// memoizes on HTML attributes (used by, eg, appcache) and whether inline                                            //
// scripts are currently allowed.                                                                                    //
// XXX so far this function is always called with arch === 'web.browser'                                             //
var memoizedBoilerplate = {};                                                                                        // 250
var getBoilerplate = function getBoilerplate(request, arch) {                                                        // 251
  var useMemoized = !(request.dynamicHead || request.dynamicBody);                                                   // 252
  var htmlAttributes = getHtmlAttributes(request);                                                                   // 253
                                                                                                                     //
  if (useMemoized) {                                                                                                 // 255
    // The only thing that changes from request to request (unless extra                                             //
    // content is added to the head or body) are the HTML attributes                                                 //
    // (used by, eg, appcache) and whether inline scripts are allowed, so we                                         //
    // can memoize based on that.                                                                                    //
    var memHash = JSON.stringify({                                                                                   // 260
      inlineScriptsAllowed: inlineScriptsAllowed,                                                                    // 261
      htmlAttributes: htmlAttributes,                                                                                // 262
      arch: arch                                                                                                     // 263
    });                                                                                                              // 260
                                                                                                                     //
    if (!memoizedBoilerplate[memHash]) {                                                                             // 266
      memoizedBoilerplate[memHash] = boilerplateByArch[arch].toHTML({                                                // 267
        htmlAttributes: htmlAttributes                                                                               // 268
      });                                                                                                            // 267
    }                                                                                                                // 270
    return memoizedBoilerplate[memHash];                                                                             // 271
  }                                                                                                                  // 272
                                                                                                                     //
  var boilerplateOptions = _.extend({                                                                                // 274
    htmlAttributes: htmlAttributes                                                                                   // 275
  }, _.pick(request, 'dynamicHead', 'dynamicBody'));                                                                 // 274
                                                                                                                     //
  return boilerplateByArch[arch].toHTML(boilerplateOptions);                                                         // 278
};                                                                                                                   // 279
                                                                                                                     //
WebAppInternals.generateBoilerplateInstance = function (arch, manifest, additionalOptions) {                         // 281
  additionalOptions = additionalOptions || {};                                                                       // 284
                                                                                                                     //
  var runtimeConfig = _.extend(_.clone(__meteor_runtime_config__), additionalOptions.runtimeConfigOverrides || {});  // 286
  return new Boilerplate(arch, manifest, _.extend({                                                                  // 290
    pathMapper: function pathMapper(itemPath) {                                                                      // 292
      return path.join(archPath[arch], itemPath);                                                                    // 293
    },                                                                                                               // 293
    baseDataExtension: {                                                                                             // 294
      additionalStaticJs: _.map(additionalStaticJs || [], function (contents, pathname) {                            // 295
        return {                                                                                                     // 298
          pathname: pathname,                                                                                        // 299
          contents: contents                                                                                         // 300
        };                                                                                                           // 298
      }),                                                                                                            // 302
      // Convert to a JSON string, then get rid of most weird characters, then                                       //
      // wrap in double quotes. (The outermost JSON.stringify really ought to                                        //
      // just be "wrap in double quotes" but we use it to be safe.) This might                                       //
      // end up inside a <script> tag so we need to be careful to not include                                        //
      // "</script>", but normal {{spacebars}} escaping escapes too much! See                                        //
      // https://github.com/meteor/meteor/issues/3730                                                                //
      meteorRuntimeConfig: JSON.stringify(encodeURIComponent(JSON.stringify(runtimeConfig))),                        // 310
      rootUrlPathPrefix: __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '',                                       // 312
      bundledJsCssUrlRewriteHook: bundledJsCssUrlRewriteHook,                                                        // 313
      inlineScriptsAllowed: WebAppInternals.inlineScriptsAllowed(),                                                  // 314
      inline: additionalOptions.inline                                                                               // 315
    }                                                                                                                // 294
  }, additionalOptions));                                                                                            // 291
};                                                                                                                   // 319
                                                                                                                     //
// A mapping from url path to "info". Where "info" has the following fields:                                         //
// - type: the type of file to be served                                                                             //
// - cacheable: optionally, whether the file should be cached or not                                                 //
// - sourceMapUrl: optionally, the url of the source map                                                             //
//                                                                                                                   //
// Info also contains one of the following:                                                                          //
// - content: the stringified content that should be served at this path                                             //
// - absolutePath: the absolute path on disk to the file                                                             //
                                                                                                                     //
var staticFiles;                                                                                                     // 330
                                                                                                                     //
// Serve static files from the manifest or added with                                                                //
// `addStaticJs`. Exported for tests.                                                                                //
WebAppInternals.staticFilesMiddleware = function (staticFiles, req, res, next) {                                     // 334
  if ('GET' != req.method && 'HEAD' != req.method && 'OPTIONS' != req.method) {                                      // 335
    next();                                                                                                          // 336
    return;                                                                                                          // 337
  }                                                                                                                  // 338
  var pathname = parseurl(req).pathname;                                                                             // 339
  try {                                                                                                              // 340
    pathname = decodeURIComponent(pathname);                                                                         // 341
  } catch (e) {                                                                                                      // 342
    next();                                                                                                          // 343
    return;                                                                                                          // 344
  }                                                                                                                  // 345
                                                                                                                     //
  var serveStaticJs = function serveStaticJs(s) {                                                                    // 347
    res.writeHead(200, {                                                                                             // 348
      'Content-type': 'application/javascript; charset=UTF-8'                                                        // 349
    });                                                                                                              // 348
    res.write(s);                                                                                                    // 351
    res.end();                                                                                                       // 352
  };                                                                                                                 // 353
                                                                                                                     //
  if (pathname === "/meteor_runtime_config.js" && !WebAppInternals.inlineScriptsAllowed()) {                         // 355
    serveStaticJs("__meteor_runtime_config__ = " + JSON.stringify(__meteor_runtime_config__) + ";");                 // 357
    return;                                                                                                          // 359
  } else if (_.has(additionalStaticJs, pathname) && !WebAppInternals.inlineScriptsAllowed()) {                       // 360
    serveStaticJs(additionalStaticJs[pathname]);                                                                     // 362
    return;                                                                                                          // 363
  }                                                                                                                  // 364
                                                                                                                     //
  if (!_.has(staticFiles, pathname)) {                                                                               // 366
    next();                                                                                                          // 367
    return;                                                                                                          // 368
  }                                                                                                                  // 369
                                                                                                                     //
  // We don't need to call pause because, unlike 'static', once we call into                                         //
  // 'send' and yield to the event loop, we never call another handler with                                          //
  // 'next'.                                                                                                         //
                                                                                                                     //
  var info = staticFiles[pathname];                                                                                  // 375
                                                                                                                     //
  // Cacheable files are files that should never change. Typically                                                   //
  // named by their hash (eg meteor bundled js and css files).                                                       //
  // We cache them ~forever (1yr).                                                                                   //
  var maxAge = info.cacheable ? 1000 * 60 * 60 * 24 * 365 : 0;                                                       // 380
                                                                                                                     //
  // Set the X-SourceMap header, which current Chrome, FireFox, and Safari                                           //
  // understand.  (The SourceMap header is slightly more spec-correct but FF                                         //
  // doesn't understand it.)                                                                                         //
  //                                                                                                                 //
  // You may also need to enable source maps in Chrome: open dev tools, click                                        //
  // the gear in the bottom right corner, and select "enable source maps".                                           //
  if (info.sourceMapUrl) {                                                                                           // 390
    res.setHeader('X-SourceMap', __meteor_runtime_config__.ROOT_URL_PATH_PREFIX + info.sourceMapUrl);                // 391
  }                                                                                                                  // 394
                                                                                                                     //
  if (info.type === "js") {                                                                                          // 396
    res.setHeader("Content-Type", "application/javascript; charset=UTF-8");                                          // 397
  } else if (info.type === "css") {                                                                                  // 398
    res.setHeader("Content-Type", "text/css; charset=UTF-8");                                                        // 399
  } else if (info.type === "json") {                                                                                 // 400
    res.setHeader("Content-Type", "application/json; charset=UTF-8");                                                // 401
  }                                                                                                                  // 402
                                                                                                                     //
  if (info.hash) {                                                                                                   // 404
    res.setHeader('ETag', '"' + info.hash + '"');                                                                    // 405
  }                                                                                                                  // 406
                                                                                                                     //
  if (info.content) {                                                                                                // 408
    res.write(info.content);                                                                                         // 409
    res.end();                                                                                                       // 410
  } else {                                                                                                           // 411
    send(req, info.absolutePath, {                                                                                   // 412
      maxage: maxAge,                                                                                                // 413
      dotfiles: 'allow', // if we specified a dotfile in the manifest, serve it                                      // 414
      lastModified: false // don't set last-modified based on the file date                                          // 415
    }).on('error', function (err) {                                                                                  // 412
      Log.error("Error serving static file " + err);                                                                 // 417
      res.writeHead(500);                                                                                            // 418
      res.end();                                                                                                     // 419
    }).on('directory', function () {                                                                                 // 420
      Log.error("Unexpected directory " + info.absolutePath);                                                        // 422
      res.writeHead(500);                                                                                            // 423
      res.end();                                                                                                     // 424
    }).pipe(res);                                                                                                    // 425
  }                                                                                                                  // 427
};                                                                                                                   // 428
                                                                                                                     //
var getUrlPrefixForArch = function getUrlPrefixForArch(arch) {                                                       // 430
  // XXX we rely on the fact that arch names don't contain slashes                                                   //
  // in that case we would need to uri escape it                                                                     //
                                                                                                                     //
  // We add '__' to the beginning of non-standard archs to "scope" the url                                           //
  // to Meteor internals.                                                                                            //
  return arch === WebApp.defaultArch ? '' : '/' + '__' + arch.replace(/^web\./, '');                                 // 436
};                                                                                                                   // 438
                                                                                                                     //
// parse port to see if its a Windows Server style named pipe. If so, return as-is (String), otherwise return as Int
WebAppInternals.parsePort = function (port) {                                                                        // 441
  if (/\\\\?.+\\pipe\\?.+/.test(port)) {                                                                             // 442
    return port;                                                                                                     // 443
  }                                                                                                                  // 444
                                                                                                                     //
  return parseInt(port);                                                                                             // 446
};                                                                                                                   // 447
                                                                                                                     //
var runWebAppServer = function runWebAppServer() {                                                                   // 449
  var shuttingDown = false;                                                                                          // 450
  var syncQueue = new Meteor._SynchronousQueue();                                                                    // 451
                                                                                                                     //
  var getItemPathname = function getItemPathname(itemUrl) {                                                          // 453
    return decodeURIComponent(url.parse(itemUrl).pathname);                                                          // 454
  };                                                                                                                 // 455
                                                                                                                     //
  WebAppInternals.reloadClientPrograms = function () {                                                               // 457
    syncQueue.runTask(function () {                                                                                  // 458
      staticFiles = {};                                                                                              // 459
      var generateClientProgram = function generateClientProgram(clientPath, arch) {                                 // 460
        // read the control for the client we'll be serving up                                                       //
        var clientJsonPath = path.join(__meteor_bootstrap__.serverDir, clientPath);                                  // 462
        var clientDir = path.dirname(clientJsonPath);                                                                // 464
        var clientJson = JSON.parse(readUtf8FileSync(clientJsonPath));                                               // 465
        if (clientJson.format !== "web-program-pre1") throw new Error("Unsupported format for client assets: " + JSON.stringify(clientJson.format));
                                                                                                                     //
        if (!clientJsonPath || !clientDir || !clientJson) throw new Error("Client config file not parsed.");         // 470
                                                                                                                     //
        var urlPrefix = getUrlPrefixForArch(arch);                                                                   // 473
                                                                                                                     //
        var manifest = clientJson.manifest;                                                                          // 475
        _.each(manifest, function (item) {                                                                           // 476
          if (item.url && item.where === "client") {                                                                 // 477
            staticFiles[urlPrefix + getItemPathname(item.url)] = {                                                   // 478
              absolutePath: path.join(clientDir, item.path),                                                         // 479
              cacheable: item.cacheable,                                                                             // 480
              hash: item.hash,                                                                                       // 481
              // Link from source to its map                                                                         //
              sourceMapUrl: item.sourceMapUrl,                                                                       // 483
              type: item.type                                                                                        // 484
            };                                                                                                       // 478
                                                                                                                     //
            if (item.sourceMap) {                                                                                    // 487
              // Serve the source map too, under the specified URL. We assume all                                    //
              // source maps are cacheable.                                                                          //
              staticFiles[urlPrefix + getItemPathname(item.sourceMapUrl)] = {                                        // 490
                absolutePath: path.join(clientDir, item.sourceMap),                                                  // 491
                cacheable: true                                                                                      // 492
              };                                                                                                     // 490
            }                                                                                                        // 494
          }                                                                                                          // 495
        });                                                                                                          // 496
                                                                                                                     //
        var program = {                                                                                              // 498
          format: "web-program-pre1",                                                                                // 499
          manifest: manifest,                                                                                        // 500
          version: WebAppHashing.calculateClientHash(manifest, null, _.pick(__meteor_runtime_config__, 'PUBLIC_SETTINGS')),
          cordovaCompatibilityVersions: clientJson.cordovaCompatibilityVersions,                                     // 503
          PUBLIC_SETTINGS: __meteor_runtime_config__.PUBLIC_SETTINGS                                                 // 504
        };                                                                                                           // 498
                                                                                                                     //
        WebApp.clientPrograms[arch] = program;                                                                       // 507
                                                                                                                     //
        // Serve the program as a string at /foo/<arch>/manifest.json                                                //
        // XXX change manifest.json -> program.json                                                                  //
        staticFiles[urlPrefix + getItemPathname('/manifest.json')] = {                                               // 511
          content: JSON.stringify(program),                                                                          // 512
          cacheable: false,                                                                                          // 513
          hash: program.version,                                                                                     // 514
          type: "json"                                                                                               // 515
        };                                                                                                           // 511
      };                                                                                                             // 517
                                                                                                                     //
      try {                                                                                                          // 519
        var clientPaths = __meteor_bootstrap__.configJson.clientPaths;                                               // 520
        _.each(clientPaths, function (clientPath, arch) {                                                            // 521
          archPath[arch] = path.dirname(clientPath);                                                                 // 522
          generateClientProgram(clientPath, arch);                                                                   // 523
        });                                                                                                          // 524
                                                                                                                     //
        // Exported for tests.                                                                                       //
        WebAppInternals.staticFiles = staticFiles;                                                                   // 527
      } catch (e) {                                                                                                  // 528
        Log.error("Error reloading the client program: " + e.stack);                                                 // 529
        process.exit(1);                                                                                             // 530
      }                                                                                                              // 531
    });                                                                                                              // 532
  };                                                                                                                 // 533
                                                                                                                     //
  WebAppInternals.generateBoilerplate = function () {                                                                // 535
    // This boilerplate will be served to the mobile devices when used with                                          //
    // Meteor/Cordova for the Hot-Code Push and since the file will be served by                                     //
    // the device's server, it is important to set the DDP url to the actual                                         //
    // Meteor server accepting DDP connections and not the device's file server.                                     //
    var defaultOptionsForArch = {                                                                                    // 540
      'web.cordova': {                                                                                               // 541
        runtimeConfigOverrides: {                                                                                    // 542
          // XXX We use absoluteUrl() here so that we serve https://                                                 //
          // URLs to cordova clients if force-ssl is in use. If we were                                              //
          // to use __meteor_runtime_config__.ROOT_URL instead of                                                    //
          // absoluteUrl(), then Cordova clients would immediately get a                                             //
          // HCP setting their DDP_DEFAULT_CONNECTION_URL to                                                         //
          // http://example.meteor.com. This breaks the app, because                                                 //
          // force-ssl doesn't serve CORS headers on 302                                                             //
          // redirects. (Plus it's undesirable to have clients                                                       //
          // connecting to http://example.meteor.com when force-ssl is                                               //
          // in use.)                                                                                                //
          DDP_DEFAULT_CONNECTION_URL: process.env.MOBILE_DDP_URL || Meteor.absoluteUrl(),                            // 553
          ROOT_URL: process.env.MOBILE_ROOT_URL || Meteor.absoluteUrl()                                              // 555
        }                                                                                                            // 542
      }                                                                                                              // 541
    };                                                                                                               // 540
                                                                                                                     //
    syncQueue.runTask(function () {                                                                                  // 561
      _.each(WebApp.clientPrograms, function (program, archName) {                                                   // 562
        boilerplateByArch[archName] = WebAppInternals.generateBoilerplateInstance(archName, program.manifest, defaultOptionsForArch[archName]);
      });                                                                                                            // 567
                                                                                                                     //
      // Clear the memoized boilerplate cache.                                                                       //
      memoizedBoilerplate = {};                                                                                      // 570
                                                                                                                     //
      // Configure CSS injection for the default arch                                                                //
      // XXX implement the CSS injection for all archs?                                                              //
      var cssFiles = boilerplateByArch[WebApp.defaultArch].baseData.css;                                             // 574
      // Rewrite all CSS files (which are written directly to <style> tags)                                          //
      // by autoupdate_client to use the CDN prefix/etc                                                              //
      var allCss = _.map(cssFiles, function (cssFile) {                                                              // 577
        return { url: bundledJsCssUrlRewriteHook(cssFile.url) };                                                     // 578
      });                                                                                                            // 579
      WebAppInternals.refreshableAssets = { allCss: allCss };                                                        // 580
    });                                                                                                              // 581
  };                                                                                                                 // 582
                                                                                                                     //
  WebAppInternals.reloadClientPrograms();                                                                            // 584
                                                                                                                     //
  // webserver                                                                                                       //
  var app = connect();                                                                                               // 587
                                                                                                                     //
  // Auto-compress any json, javascript, or text.                                                                    //
  app.use(connect.compress());                                                                                       // 590
                                                                                                                     //
  // Packages and apps can add handlers that run before any other Meteor                                             //
  // handlers via WebApp.rawConnectHandlers.                                                                         //
  var rawConnectHandlers = connect();                                                                                // 594
  app.use(rawConnectHandlers);                                                                                       // 595
                                                                                                                     //
  // We're not a proxy; reject (without crashing) attempts to treat us like                                          //
  // one. (See #1212.)                                                                                               //
  app.use(function (req, res, next) {                                                                                // 599
    if (RoutePolicy.isValidUrl(req.url)) {                                                                           // 600
      next();                                                                                                        // 601
      return;                                                                                                        // 602
    }                                                                                                                // 603
    res.writeHead(400);                                                                                              // 604
    res.write("Not a proxy");                                                                                        // 605
    res.end();                                                                                                       // 606
  });                                                                                                                // 607
                                                                                                                     //
  // Strip off the path prefix, if it exists.                                                                        //
  app.use(function (request, response, next) {                                                                       // 610
    var pathPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX;                                                 // 611
    var url = Npm.require('url').parse(request.url);                                                                 // 612
    var pathname = url.pathname;                                                                                     // 613
    // check if the path in the url starts with the path prefix (and the part                                        //
    // after the path prefix must start with a / if it exists.)                                                      //
    if (pathPrefix && pathname.substring(0, pathPrefix.length) === pathPrefix && (pathname.length == pathPrefix.length || pathname.substring(pathPrefix.length, pathPrefix.length + 1) === "/")) {
      request.url = request.url.substring(pathPrefix.length);                                                        // 619
      next();                                                                                                        // 620
    } else if (pathname === "/favicon.ico" || pathname === "/robots.txt") {                                          // 621
      next();                                                                                                        // 622
    } else if (pathPrefix) {                                                                                         // 623
      response.writeHead(404);                                                                                       // 624
      response.write("Unknown path");                                                                                // 625
      response.end();                                                                                                // 626
    } else {                                                                                                         // 627
      next();                                                                                                        // 628
    }                                                                                                                // 629
  });                                                                                                                // 630
                                                                                                                     //
  // Parse the query string into res.query. Used by oauth_server, but it's                                           //
  // generally pretty handy..                                                                                        //
  app.use(connect.query());                                                                                          // 634
                                                                                                                     //
  // Serve static files from the manifest.                                                                           //
  // This is inspired by the 'static' middleware.                                                                    //
  app.use(function (req, res, next) {                                                                                // 638
    Fiber(function () {                                                                                              // 639
      WebAppInternals.staticFilesMiddleware(staticFiles, req, res, next);                                            // 640
    }).run();                                                                                                        // 641
  });                                                                                                                // 642
                                                                                                                     //
  // Packages and apps can add handlers to this via WebApp.connectHandlers.                                          //
  // They are inserted before our default handler.                                                                   //
  var packageAndAppHandlers = connect();                                                                             // 646
  app.use(packageAndAppHandlers);                                                                                    // 647
                                                                                                                     //
  var _suppressConnectErrors = false;                                                                                // 649
  // connect knows it is an error handler because it has 4 arguments instead of                                      //
  // 3. go figure.  (It is not smart enough to find such a thing if it's hidden                                      //
  // inside packageAndAppHandlers.)                                                                                  //
  app.use(function (err, req, res, next) {                                                                           // 653
    if (!err || !_suppressConnectErrors || !req.headers['x-suppress-error']) {                                       // 654
      next(err);                                                                                                     // 655
      return;                                                                                                        // 656
    }                                                                                                                // 657
    res.writeHead(err.status, { 'Content-Type': 'text/plain' });                                                     // 658
    res.end("An error message");                                                                                     // 659
  });                                                                                                                // 660
                                                                                                                     //
  app.use(function (req, res, next) {                                                                                // 662
    Fiber(function () {                                                                                              // 663
      if (!appUrl(req.url)) return next();                                                                           // 664
                                                                                                                     //
      var headers = {                                                                                                // 667
        'Content-Type': 'text/html; charset=utf-8'                                                                   // 668
      };                                                                                                             // 667
      if (shuttingDown) headers['Connection'] = 'Close';                                                             // 670
                                                                                                                     //
      var request = WebApp.categorizeRequest(req);                                                                   // 673
                                                                                                                     //
      if (request.url.query && request.url.query['meteor_css_resource']) {                                           // 675
        // In this case, we're requesting a CSS resource in the meteor-specific                                      //
        // way, but we don't have it.  Serve a static css file that indicates that                                   //
        // we didn't have it, so we can detect that and refresh.  Make sure                                          //
        // that any proxies or CDNs don't cache this error!  (Normally proxies                                       //
        // or CDNs are smart enough not to cache error pages, but in order to                                        //
        // make this hack work, we need to return the CSS file as a 200, which                                       //
        // would otherwise be cached.)                                                                               //
        headers['Content-Type'] = 'text/css; charset=utf-8';                                                         // 683
        headers['Cache-Control'] = 'no-cache';                                                                       // 684
        res.writeHead(200, headers);                                                                                 // 685
        res.write(".meteor-css-not-found-error { width: 0px;}");                                                     // 686
        res.end();                                                                                                   // 687
        return undefined;                                                                                            // 688
      }                                                                                                              // 689
                                                                                                                     //
      if (request.url.query && request.url.query['meteor_js_resource']) {                                            // 691
        // Similarly, we're requesting a JS resource that we don't have.                                             //
        // Serve an uncached 404. (We can't use the same hack we use for CSS,                                        //
        // because actually acting on that hack requires us to have the JS                                           //
        // already!)                                                                                                 //
        headers['Cache-Control'] = 'no-cache';                                                                       // 696
        res.writeHead(404, headers);                                                                                 // 697
        res.end("404 Not Found");                                                                                    // 698
        return undefined;                                                                                            // 699
      }                                                                                                              // 700
                                                                                                                     //
      if (request.url.query && request.url.query['meteor_dont_serve_index']) {                                       // 702
        // When downloading files during a Cordova hot code push, we need                                            //
        // to detect if a file is not available instead of inadvertently                                             //
        // downloading the default index page.                                                                       //
        // So similar to the situation above, we serve an uncached 404.                                              //
        headers['Cache-Control'] = 'no-cache';                                                                       // 707
        res.writeHead(404, headers);                                                                                 // 708
        res.end("404 Not Found");                                                                                    // 709
        return undefined;                                                                                            // 710
      }                                                                                                              // 711
                                                                                                                     //
      // /packages/asdfsad ... /__cordova/dafsdf.js                                                                  //
      var pathname = parseurl(req).pathname;                                                                         // 714
      var archKey = pathname.split('/')[1];                                                                          // 715
      var archKeyCleaned = 'web.' + archKey.replace(/^__/, '');                                                      // 716
                                                                                                                     //
      if (!/^__/.test(archKey) || !_.has(archPath, archKeyCleaned)) {                                                // 718
        archKey = WebApp.defaultArch;                                                                                // 719
      } else {                                                                                                       // 720
        archKey = archKeyCleaned;                                                                                    // 721
      }                                                                                                              // 722
                                                                                                                     //
      var boilerplate;                                                                                               // 724
      try {                                                                                                          // 725
        boilerplate = getBoilerplate(request, archKey);                                                              // 726
      } catch (e) {                                                                                                  // 727
        Log.error("Error running template: " + e.stack);                                                             // 728
        res.writeHead(500, headers);                                                                                 // 729
        res.end();                                                                                                   // 730
        return undefined;                                                                                            // 731
      }                                                                                                              // 732
                                                                                                                     //
      var statusCode = res.statusCode ? res.statusCode : 200;                                                        // 734
      res.writeHead(statusCode, headers);                                                                            // 735
      res.write(boilerplate);                                                                                        // 736
      res.end();                                                                                                     // 737
      return undefined;                                                                                              // 738
    }).run();                                                                                                        // 739
  });                                                                                                                // 740
                                                                                                                     //
  // Return 404 by default, if no other handlers serve this URL.                                                     //
  app.use(function (req, res) {                                                                                      // 743
    res.writeHead(404);                                                                                              // 744
    res.end();                                                                                                       // 745
  });                                                                                                                // 746
                                                                                                                     //
  var httpServer = http.createServer(app);                                                                           // 749
  var onListeningCallbacks = [];                                                                                     // 750
                                                                                                                     //
  // After 5 seconds w/o data on a socket, kill it.  On the other hand, if                                           //
  // there's an outstanding request, give it a higher timeout instead (to avoid                                      //
  // killing long-polling requests)                                                                                  //
  httpServer.setTimeout(SHORT_SOCKET_TIMEOUT);                                                                       // 755
                                                                                                                     //
  // Do this here, and then also in livedata/stream_server.js, because                                               //
  // stream_server.js kills all the current request handlers when installing its                                     //
  // own.                                                                                                            //
  httpServer.on('request', WebApp._timeoutAdjustmentRequestCallback);                                                // 760
                                                                                                                     //
  // start up app                                                                                                    //
  _.extend(WebApp, {                                                                                                 // 764
    connectHandlers: packageAndAppHandlers,                                                                          // 765
    rawConnectHandlers: rawConnectHandlers,                                                                          // 766
    httpServer: httpServer,                                                                                          // 767
    // For testing.                                                                                                  //
    suppressConnectErrors: function suppressConnectErrors() {                                                        // 769
      _suppressConnectErrors = true;                                                                                 // 770
    },                                                                                                               // 771
    onListening: function onListening(f) {                                                                           // 772
      if (onListeningCallbacks) onListeningCallbacks.push(f);else f();                                               // 773
    }                                                                                                                // 777
  });                                                                                                                // 764
                                                                                                                     //
  // Let the rest of the packages (and Meteor.startup hooks) insert connect                                          //
  // middlewares and update __meteor_runtime_config__, then keep going to set up                                     //
  // actually serving HTML.                                                                                          //
  main = function main(argv) {                                                                                       // 783
    WebAppInternals.generateBoilerplate();                                                                           // 784
                                                                                                                     //
    // only start listening after all the startup code has run.                                                      //
    var localPort = WebAppInternals.parsePort(process.env.PORT) || 0;                                                // 787
    var host = process.env.BIND_IP;                                                                                  // 788
    var localIp = host || '0.0.0.0';                                                                                 // 789
    httpServer.listen(localPort, localIp, Meteor.bindEnvironment(function () {                                       // 790
      if (process.env.METEOR_PRINT_ON_LISTEN) console.log("LISTENING"); // must match run-app.js                     // 791
                                                                                                                     //
      var callbacks = onListeningCallbacks;                                                                          // 794
      onListeningCallbacks = null;                                                                                   // 795
      _.each(callbacks, function (x) {                                                                               // 796
        x();                                                                                                         // 796
      });                                                                                                            // 796
    }, function (e) {                                                                                                // 798
      console.error("Error listening:", e);                                                                          // 799
      console.error(e && e.stack);                                                                                   // 800
    }));                                                                                                             // 801
                                                                                                                     //
    return 'DAEMON';                                                                                                 // 803
  };                                                                                                                 // 804
};                                                                                                                   // 805
                                                                                                                     //
runWebAppServer();                                                                                                   // 808
                                                                                                                     //
var inlineScriptsAllowed = true;                                                                                     // 811
                                                                                                                     //
WebAppInternals.inlineScriptsAllowed = function () {                                                                 // 813
  return inlineScriptsAllowed;                                                                                       // 814
};                                                                                                                   // 815
                                                                                                                     //
WebAppInternals.setInlineScriptsAllowed = function (value) {                                                         // 817
  inlineScriptsAllowed = value;                                                                                      // 818
  WebAppInternals.generateBoilerplate();                                                                             // 819
};                                                                                                                   // 820
                                                                                                                     //
WebAppInternals.setBundledJsCssUrlRewriteHook = function (hookFn) {                                                  // 823
  bundledJsCssUrlRewriteHook = hookFn;                                                                               // 824
  WebAppInternals.generateBoilerplate();                                                                             // 825
};                                                                                                                   // 826
                                                                                                                     //
WebAppInternals.setBundledJsCssPrefix = function (prefix) {                                                          // 828
  var self = this;                                                                                                   // 829
  self.setBundledJsCssUrlRewriteHook(function (url) {                                                                // 830
    return prefix + url;                                                                                             // 832
  });                                                                                                                // 833
};                                                                                                                   // 834
                                                                                                                     //
// Packages can call `WebAppInternals.addStaticJs` to specify static                                                 //
// JavaScript to be included in the app. This static JS will be inlined,                                             //
// unless inline scripts have been disabled, in which case it will be                                                //
// served under `/<sha1 of contents>`.                                                                               //
var additionalStaticJs = {};                                                                                         // 840
WebAppInternals.addStaticJs = function (contents) {                                                                  // 841
  additionalStaticJs["/" + sha1(contents) + ".js"] = contents;                                                       // 842
};                                                                                                                   // 843
                                                                                                                     //
// Exported for tests                                                                                                //
WebAppInternals.getBoilerplate = getBoilerplate;                                                                     // 846
WebAppInternals.additionalStaticJs = additionalStaticJs;                                                             // 847
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}]}}}},{"extensions":[".js",".json"]});
require("./node_modules/meteor/webapp/webapp_server.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package.webapp = {}, {
  WebApp: WebApp,
  main: main,
  WebAppInternals: WebAppInternals
});

})();

//# sourceMappingURL=webapp.js.map
