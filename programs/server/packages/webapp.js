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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/webapp/webapp_server.js                                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var _typeof2 = require("babel-runtime/helpers/typeof");                                                               //
                                                                                                                      //
var _typeof3 = _interopRequireDefault(_typeof2);                                                                      //
                                                                                                                      //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                     //
                                                                                                                      //
////////// Requires //////////                                                                                        // 1
var fs = Npm.require("fs");                                                                                           // 3
                                                                                                                      //
var http = Npm.require("http");                                                                                       // 4
                                                                                                                      //
var os = Npm.require("os");                                                                                           // 5
                                                                                                                      //
var path = Npm.require("path");                                                                                       // 6
                                                                                                                      //
var url = Npm.require("url");                                                                                         // 7
                                                                                                                      //
var crypto = Npm.require("crypto");                                                                                   // 8
                                                                                                                      //
var connect = Npm.require('connect');                                                                                 // 10
                                                                                                                      //
var parseurl = Npm.require('parseurl');                                                                               // 11
                                                                                                                      //
var useragent = Npm.require('useragent');                                                                             // 12
                                                                                                                      //
var send = Npm.require('send');                                                                                       // 13
                                                                                                                      //
var Future = Npm.require('fibers/future');                                                                            // 15
                                                                                                                      //
var Fiber = Npm.require('fibers');                                                                                    // 16
                                                                                                                      //
var SHORT_SOCKET_TIMEOUT = 5 * 1000;                                                                                  // 18
var LONG_SOCKET_TIMEOUT = 120 * 1000;                                                                                 // 19
WebApp = {};                                                                                                          // 21
WebAppInternals = {};                                                                                                 // 22
WebAppInternals.NpmModules = {                                                                                        // 24
  connect: {                                                                                                          // 25
    version: Npm.require('connect/package.json').version,                                                             // 26
    module: connect                                                                                                   // 27
  }                                                                                                                   // 25
};                                                                                                                    // 24
WebApp.defaultArch = 'web.browser'; // XXX maps archs to manifests                                                    // 31
                                                                                                                      //
WebApp.clientPrograms = {}; // XXX maps archs to program path on filesystem                                           // 34
                                                                                                                      //
var archPath = {};                                                                                                    // 37
                                                                                                                      //
var bundledJsCssUrlRewriteHook = function (url) {                                                                     // 39
  var bundledPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '';                                           // 40
  return bundledPrefix + url;                                                                                         // 42
};                                                                                                                    // 43
                                                                                                                      //
var sha1 = function (contents) {                                                                                      // 45
  var hash = crypto.createHash('sha1');                                                                               // 46
  hash.update(contents);                                                                                              // 47
  return hash.digest('hex');                                                                                          // 48
};                                                                                                                    // 49
                                                                                                                      //
var readUtf8FileSync = function (filename) {                                                                          // 51
  return Meteor.wrapAsync(fs.readFile)(filename, 'utf8');                                                             // 52
}; // #BrowserIdentification                                                                                          // 53
//                                                                                                                    // 56
// We have multiple places that want to identify the browser: the                                                     // 57
// unsupported browser page, the appcache package, and, eventually                                                    // 58
// delivering browser polyfills only as needed.                                                                       // 59
//                                                                                                                    // 60
// To avoid detecting the browser in multiple places ad-hoc, we create a                                              // 61
// Meteor "browser" object. It uses but does not expose the npm                                                       // 62
// useragent module (we could choose a different mechanism to identify                                                // 63
// the browser in the future if we wanted to).  The browser object                                                    // 64
// contains                                                                                                           // 65
//                                                                                                                    // 66
// * `name`: the name of the browser in camel case                                                                    // 67
// * `major`, `minor`, `patch`: integers describing the browser version                                               // 68
//                                                                                                                    // 69
// Also here is an early version of a Meteor `request` object, intended                                               // 70
// to be a high-level description of the request without exposing                                                     // 71
// details of connect's low-level `req`.  Currently it contains:                                                      // 72
//                                                                                                                    // 73
// * `browser`: browser identification object described above                                                         // 74
// * `url`: parsed url, including parsed query params                                                                 // 75
//                                                                                                                    // 76
// As a temporary hack there is a `categorizeRequest` function on WebApp which                                        // 77
// converts a connect `req` to a Meteor `request`. This can go away once smart                                        // 78
// packages such as appcache are being passed a `request` object directly when                                        // 79
// they serve content.                                                                                                // 80
//                                                                                                                    // 81
// This allows `request` to be used uniformly: it is passed to the html                                               // 82
// attributes hook, and the appcache package can use it when deciding                                                 // 83
// whether to generate a 404 for the manifest.                                                                        // 84
//                                                                                                                    // 85
// Real routing / server side rendering will probably refactor this                                                   // 86
// heavily.                                                                                                           // 87
// e.g. "Mobile Safari" => "mobileSafari"                                                                             // 90
                                                                                                                      //
                                                                                                                      //
var camelCase = function (name) {                                                                                     // 91
  var parts = name.split(' ');                                                                                        // 92
  parts[0] = parts[0].toLowerCase();                                                                                  // 93
                                                                                                                      //
  for (var i = 1; i < parts.length; ++i) {                                                                            // 94
    parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].substr(1);                                                 // 95
  }                                                                                                                   // 96
                                                                                                                      //
  return parts.join('');                                                                                              // 97
};                                                                                                                    // 98
                                                                                                                      //
var identifyBrowser = function (userAgentString) {                                                                    // 100
  var userAgent = useragent.lookup(userAgentString);                                                                  // 101
  return {                                                                                                            // 102
    name: camelCase(userAgent.family),                                                                                // 103
    major: +userAgent.major,                                                                                          // 104
    minor: +userAgent.minor,                                                                                          // 105
    patch: +userAgent.patch                                                                                           // 106
  };                                                                                                                  // 102
}; // XXX Refactor as part of implementing real routing.                                                              // 108
                                                                                                                      //
                                                                                                                      //
WebAppInternals.identifyBrowser = identifyBrowser;                                                                    // 111
                                                                                                                      //
WebApp.categorizeRequest = function (req) {                                                                           // 113
  return _.extend({                                                                                                   // 114
    browser: identifyBrowser(req.headers['user-agent']),                                                              // 115
    url: url.parse(req.url, true)                                                                                     // 116
  }, _.pick(req, 'dynamicHead', 'dynamicBody'));                                                                      // 114
}; // HTML attribute hooks: functions to be called to determine any attributes to                                     // 118
// be added to the '<html>' tag. Each function is passed a 'request' object (see                                      // 121
// #BrowserIdentification) and should return null or object.                                                          // 122
                                                                                                                      //
                                                                                                                      //
var htmlAttributeHooks = [];                                                                                          // 123
                                                                                                                      //
var getHtmlAttributes = function (request) {                                                                          // 124
  var combinedAttributes = {};                                                                                        // 125
                                                                                                                      //
  _.each(htmlAttributeHooks || [], function (hook) {                                                                  // 126
    var attributes = hook(request);                                                                                   // 127
    if (attributes === null) return;                                                                                  // 128
    if ((typeof attributes === "undefined" ? "undefined" : (0, _typeof3.default)(attributes)) !== 'object') throw Error("HTML attribute hook must return null or object");
                                                                                                                      //
    _.extend(combinedAttributes, attributes);                                                                         // 132
  });                                                                                                                 // 133
                                                                                                                      //
  return combinedAttributes;                                                                                          // 134
};                                                                                                                    // 135
                                                                                                                      //
WebApp.addHtmlAttributeHook = function (hook) {                                                                       // 136
  htmlAttributeHooks.push(hook);                                                                                      // 137
}; // Serve app HTML for this URL?                                                                                    // 138
                                                                                                                      //
                                                                                                                      //
var appUrl = function (url) {                                                                                         // 141
  if (url === '/favicon.ico' || url === '/robots.txt') return false; // NOTE: app.manifest is not a web standard like favicon.ico and
  // robots.txt. It is a file name we have chosen to use for HTML5                                                    // 146
  // appcache URLs. It is included here to prevent using an appcache                                                  // 147
  // then removing it from poisoning an app permanently. Eventually,                                                  // 148
  // once we have server side routing, this won't be needed as                                                        // 149
  // unknown URLs with return a 404 automatically.                                                                    // 150
                                                                                                                      //
  if (url === '/app.manifest') return false; // Avoid serving app HTML for declared routes such as /sockjs/.          // 151
                                                                                                                      //
  if (RoutePolicy.classify(url)) return false; // we currently return app HTML on all URLs by default                 // 155
                                                                                                                      //
  return true;                                                                                                        // 159
}; // We need to calculate the client hash after all packages have loaded                                             // 160
// to give them a chance to populate __meteor_runtime_config__.                                                       // 164
//                                                                                                                    // 165
// Calculating the hash during startup means that packages can only                                                   // 166
// populate __meteor_runtime_config__ during load, not during startup.                                                // 167
//                                                                                                                    // 168
// Calculating instead it at the beginning of main after all startup                                                  // 169
// hooks had run would allow packages to also populate                                                                // 170
// __meteor_runtime_config__ during startup, but that's too late for                                                  // 171
// autoupdate because it needs to have the client hash at startup to                                                  // 172
// insert the auto update version itself into                                                                         // 173
// __meteor_runtime_config__ to get it to the client.                                                                 // 174
//                                                                                                                    // 175
// An alternative would be to give autoupdate a "post-start,                                                          // 176
// pre-listen" hook to allow it to insert the auto update version at                                                  // 177
// the right moment.                                                                                                  // 178
                                                                                                                      //
                                                                                                                      //
Meteor.startup(function () {                                                                                          // 180
  var calculateClientHash = WebAppHashing.calculateClientHash;                                                        // 181
                                                                                                                      //
  WebApp.clientHash = function (archName) {                                                                           // 182
    archName = archName || WebApp.defaultArch;                                                                        // 183
    return calculateClientHash(WebApp.clientPrograms[archName].manifest);                                             // 184
  };                                                                                                                  // 185
                                                                                                                      //
  WebApp.calculateClientHashRefreshable = function (archName) {                                                       // 187
    archName = archName || WebApp.defaultArch;                                                                        // 188
    return calculateClientHash(WebApp.clientPrograms[archName].manifest, function (name) {                            // 189
      return name === "css";                                                                                          // 191
    });                                                                                                               // 192
  };                                                                                                                  // 193
                                                                                                                      //
  WebApp.calculateClientHashNonRefreshable = function (archName) {                                                    // 194
    archName = archName || WebApp.defaultArch;                                                                        // 195
    return calculateClientHash(WebApp.clientPrograms[archName].manifest, function (name) {                            // 196
      return name !== "css";                                                                                          // 198
    });                                                                                                               // 199
  };                                                                                                                  // 200
                                                                                                                      //
  WebApp.calculateClientHashCordova = function () {                                                                   // 201
    var archName = 'web.cordova';                                                                                     // 202
    if (!WebApp.clientPrograms[archName]) return 'none';                                                              // 203
    return calculateClientHash(WebApp.clientPrograms[archName].manifest, null, _.pick(__meteor_runtime_config__, 'PUBLIC_SETTINGS'));
  };                                                                                                                  // 209
}); // When we have a request pending, we want the socket timeout to be long, to                                      // 210
// give ourselves a while to serve it, and to allow sockjs long polls to                                              // 215
// complete.  On the other hand, we want to close idle sockets relatively                                             // 216
// quickly, so that we can shut down relatively promptly but cleanly, without                                         // 217
// cutting off anyone's response.                                                                                     // 218
                                                                                                                      //
WebApp._timeoutAdjustmentRequestCallback = function (req, res) {                                                      // 219
  // this is really just req.socket.setTimeout(LONG_SOCKET_TIMEOUT);                                                  // 220
  req.setTimeout(LONG_SOCKET_TIMEOUT); // Insert our new finish listener to run BEFORE the existing one which removes
  // the response from the socket.                                                                                    // 223
                                                                                                                      //
  var finishListeners = res.listeners('finish'); // XXX Apparently in Node 0.12 this event was called 'prefinish'.    // 224
  // https://github.com/joyent/node/commit/7c9b6070                                                                   // 226
  // But it has switched back to 'finish' in Node v4:                                                                 // 227
  // https://github.com/nodejs/node/pull/1411                                                                         // 228
                                                                                                                      //
  res.removeAllListeners('finish');                                                                                   // 229
  res.on('finish', function () {                                                                                      // 230
    res.setTimeout(SHORT_SOCKET_TIMEOUT);                                                                             // 231
  });                                                                                                                 // 232
                                                                                                                      //
  _.each(finishListeners, function (l) {                                                                              // 233
    res.on('finish', l);                                                                                              // 233
  });                                                                                                                 // 233
}; // Will be updated by main before we listen.                                                                       // 234
// Map from client arch to boilerplate object.                                                                        // 238
// Boilerplate object has:                                                                                            // 239
//   - func: XXX                                                                                                      // 240
//   - baseData: XXX                                                                                                  // 241
                                                                                                                      //
                                                                                                                      //
var boilerplateByArch = {}; // Given a request (as returned from `categorizeRequest`), return the                     // 242
// boilerplate HTML to serve for that request.                                                                        // 245
//                                                                                                                    // 246
// If a previous connect middleware has rendered content for the head or body,                                        // 247
// returns the boilerplate with that content patched in otherwise                                                     // 248
// memoizes on HTML attributes (used by, eg, appcache) and whether inline                                             // 249
// scripts are currently allowed.                                                                                     // 250
// XXX so far this function is always called with arch === 'web.browser'                                              // 251
                                                                                                                      //
var memoizedBoilerplate = {};                                                                                         // 252
                                                                                                                      //
var getBoilerplate = function (request, arch) {                                                                       // 253
  var useMemoized = !(request.dynamicHead || request.dynamicBody);                                                    // 254
  var htmlAttributes = getHtmlAttributes(request);                                                                    // 255
                                                                                                                      //
  if (useMemoized) {                                                                                                  // 257
    // The only thing that changes from request to request (unless extra                                              // 258
    // content is added to the head or body) are the HTML attributes                                                  // 259
    // (used by, eg, appcache) and whether inline scripts are allowed, so we                                          // 260
    // can memoize based on that.                                                                                     // 261
    var memHash = JSON.stringify({                                                                                    // 262
      inlineScriptsAllowed: inlineScriptsAllowed,                                                                     // 263
      htmlAttributes: htmlAttributes,                                                                                 // 264
      arch: arch                                                                                                      // 265
    });                                                                                                               // 262
                                                                                                                      //
    if (!memoizedBoilerplate[memHash]) {                                                                              // 268
      memoizedBoilerplate[memHash] = boilerplateByArch[arch].toHTML({                                                 // 269
        htmlAttributes: htmlAttributes                                                                                // 270
      });                                                                                                             // 269
    }                                                                                                                 // 272
                                                                                                                      //
    return memoizedBoilerplate[memHash];                                                                              // 273
  }                                                                                                                   // 274
                                                                                                                      //
  var boilerplateOptions = _.extend({                                                                                 // 276
    htmlAttributes: htmlAttributes                                                                                    // 277
  }, _.pick(request, 'dynamicHead', 'dynamicBody'));                                                                  // 276
                                                                                                                      //
  return boilerplateByArch[arch].toHTML(boilerplateOptions);                                                          // 280
};                                                                                                                    // 281
                                                                                                                      //
WebAppInternals.generateBoilerplateInstance = function (arch, manifest, additionalOptions) {                          // 283
  additionalOptions = additionalOptions || {};                                                                        // 286
                                                                                                                      //
  var runtimeConfig = _.extend(_.clone(__meteor_runtime_config__), additionalOptions.runtimeConfigOverrides || {});   // 288
                                                                                                                      //
  return new Boilerplate(arch, manifest, _.extend({                                                                   // 292
    pathMapper: function (itemPath) {                                                                                 // 294
      return path.join(archPath[arch], itemPath);                                                                     // 295
    },                                                                                                                // 295
    baseDataExtension: {                                                                                              // 296
      additionalStaticJs: _.map(additionalStaticJs || [], function (contents, pathname) {                             // 297
        return {                                                                                                      // 300
          pathname: pathname,                                                                                         // 301
          contents: contents                                                                                          // 302
        };                                                                                                            // 300
      }),                                                                                                             // 304
      // Convert to a JSON string, then get rid of most weird characters, then                                        // 306
      // wrap in double quotes. (The outermost JSON.stringify really ought to                                         // 307
      // just be "wrap in double quotes" but we use it to be safe.) This might                                        // 308
      // end up inside a <script> tag so we need to be careful to not include                                         // 309
      // "</script>", but normal {{spacebars}} escaping escapes too much! See                                         // 310
      // https://github.com/meteor/meteor/issues/3730                                                                 // 311
      meteorRuntimeConfig: JSON.stringify(encodeURIComponent(JSON.stringify(runtimeConfig))),                         // 312
      rootUrlPathPrefix: __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '',                                        // 314
      bundledJsCssUrlRewriteHook: bundledJsCssUrlRewriteHook,                                                         // 315
      inlineScriptsAllowed: WebAppInternals.inlineScriptsAllowed(),                                                   // 316
      inline: additionalOptions.inline                                                                                // 317
    }                                                                                                                 // 296
  }, additionalOptions));                                                                                             // 293
}; // A mapping from url path to "info". Where "info" has the following fields:                                       // 321
// - type: the type of file to be served                                                                              // 324
// - cacheable: optionally, whether the file should be cached or not                                                  // 325
// - sourceMapUrl: optionally, the url of the source map                                                              // 326
//                                                                                                                    // 327
// Info also contains one of the following:                                                                           // 328
// - content: the stringified content that should be served at this path                                              // 329
// - absolutePath: the absolute path on disk to the file                                                              // 330
                                                                                                                      //
                                                                                                                      //
var staticFiles; // Serve static files from the manifest or added with                                                // 332
// `addStaticJs`. Exported for tests.                                                                                 // 335
                                                                                                                      //
WebAppInternals.staticFilesMiddleware = function (staticFiles, req, res, next) {                                      // 336
  if ('GET' != req.method && 'HEAD' != req.method && 'OPTIONS' != req.method) {                                       // 337
    next();                                                                                                           // 338
    return;                                                                                                           // 339
  }                                                                                                                   // 340
                                                                                                                      //
  var pathname = parseurl(req).pathname;                                                                              // 341
                                                                                                                      //
  try {                                                                                                               // 342
    pathname = decodeURIComponent(pathname);                                                                          // 343
  } catch (e) {                                                                                                       // 344
    next();                                                                                                           // 345
    return;                                                                                                           // 346
  }                                                                                                                   // 347
                                                                                                                      //
  var serveStaticJs = function (s) {                                                                                  // 349
    res.writeHead(200, {                                                                                              // 350
      'Content-type': 'application/javascript; charset=UTF-8'                                                         // 351
    });                                                                                                               // 350
    res.write(s);                                                                                                     // 353
    res.end();                                                                                                        // 354
  };                                                                                                                  // 355
                                                                                                                      //
  if (pathname === "/meteor_runtime_config.js" && !WebAppInternals.inlineScriptsAllowed()) {                          // 357
    serveStaticJs("__meteor_runtime_config__ = " + JSON.stringify(__meteor_runtime_config__) + ";");                  // 359
    return;                                                                                                           // 361
  } else if (_.has(additionalStaticJs, pathname) && !WebAppInternals.inlineScriptsAllowed()) {                        // 362
    serveStaticJs(additionalStaticJs[pathname]);                                                                      // 364
    return;                                                                                                           // 365
  }                                                                                                                   // 366
                                                                                                                      //
  if (!_.has(staticFiles, pathname)) {                                                                                // 368
    next();                                                                                                           // 369
    return;                                                                                                           // 370
  } // We don't need to call pause because, unlike 'static', once we call into                                        // 371
  // 'send' and yield to the event loop, we never call another handler with                                           // 374
  // 'next'.                                                                                                          // 375
                                                                                                                      //
                                                                                                                      //
  var info = staticFiles[pathname]; // Cacheable files are files that should never change. Typically                  // 377
  // named by their hash (eg meteor bundled js and css files).                                                        // 380
  // We cache them ~forever (1yr).                                                                                    // 381
                                                                                                                      //
  var maxAge = info.cacheable ? 1000 * 60 * 60 * 24 * 365 : 0; // Set the X-SourceMap header, which current Chrome, FireFox, and Safari
  // understand.  (The SourceMap header is slightly more spec-correct but FF                                          // 387
  // doesn't understand it.)                                                                                          // 388
  //                                                                                                                  // 389
  // You may also need to enable source maps in Chrome: open dev tools, click                                         // 390
  // the gear in the bottom right corner, and select "enable source maps".                                            // 391
                                                                                                                      //
  if (info.sourceMapUrl) {                                                                                            // 392
    res.setHeader('X-SourceMap', __meteor_runtime_config__.ROOT_URL_PATH_PREFIX + info.sourceMapUrl);                 // 393
  }                                                                                                                   // 396
                                                                                                                      //
  if (info.type === "js") {                                                                                           // 398
    res.setHeader("Content-Type", "application/javascript; charset=UTF-8");                                           // 399
  } else if (info.type === "css") {                                                                                   // 400
    res.setHeader("Content-Type", "text/css; charset=UTF-8");                                                         // 401
  } else if (info.type === "json") {                                                                                  // 402
    res.setHeader("Content-Type", "application/json; charset=UTF-8");                                                 // 403
  }                                                                                                                   // 404
                                                                                                                      //
  if (info.hash) {                                                                                                    // 406
    res.setHeader('ETag', '"' + info.hash + '"');                                                                     // 407
  }                                                                                                                   // 408
                                                                                                                      //
  if (info.content) {                                                                                                 // 410
    res.write(info.content);                                                                                          // 411
    res.end();                                                                                                        // 412
  } else {                                                                                                            // 413
    send(req, info.absolutePath, {                                                                                    // 414
      maxage: maxAge,                                                                                                 // 415
      dotfiles: 'allow',                                                                                              // 416
      // if we specified a dotfile in the manifest, serve it                                                          // 416
      lastModified: false // don't set last-modified based on the file date                                           // 417
                                                                                                                      //
    }).on('error', function (err) {                                                                                   // 414
      Log.error("Error serving static file " + err);                                                                  // 419
      res.writeHead(500);                                                                                             // 420
      res.end();                                                                                                      // 421
    }).on('directory', function () {                                                                                  // 422
      Log.error("Unexpected directory " + info.absolutePath);                                                         // 424
      res.writeHead(500);                                                                                             // 425
      res.end();                                                                                                      // 426
    }).pipe(res);                                                                                                     // 427
  }                                                                                                                   // 429
};                                                                                                                    // 430
                                                                                                                      //
var getUrlPrefixForArch = function (arch) {                                                                           // 432
  // XXX we rely on the fact that arch names don't contain slashes                                                    // 433
  // in that case we would need to uri escape it                                                                      // 434
  // We add '__' to the beginning of non-standard archs to "scope" the url                                            // 436
  // to Meteor internals.                                                                                             // 437
  return arch === WebApp.defaultArch ? '' : '/' + '__' + arch.replace(/^web\./, '');                                  // 438
}; // parse port to see if its a Windows Server style named pipe. If so, return as-is (String), otherwise return as Int
                                                                                                                      //
                                                                                                                      //
WebAppInternals.parsePort = function (port) {                                                                         // 443
  if (/\\\\?.+\\pipe\\?.+/.test(port)) {                                                                              // 444
    return port;                                                                                                      // 445
  }                                                                                                                   // 446
                                                                                                                      //
  return parseInt(port);                                                                                              // 448
};                                                                                                                    // 449
                                                                                                                      //
var runWebAppServer = function () {                                                                                   // 451
  var shuttingDown = false;                                                                                           // 452
  var syncQueue = new Meteor._SynchronousQueue();                                                                     // 453
                                                                                                                      //
  var getItemPathname = function (itemUrl) {                                                                          // 455
    return decodeURIComponent(url.parse(itemUrl).pathname);                                                           // 456
  };                                                                                                                  // 457
                                                                                                                      //
  WebAppInternals.reloadClientPrograms = function () {                                                                // 459
    syncQueue.runTask(function () {                                                                                   // 460
      staticFiles = {};                                                                                               // 461
                                                                                                                      //
      var generateClientProgram = function (clientPath, arch) {                                                       // 462
        // read the control for the client we'll be serving up                                                        // 463
        var clientJsonPath = path.join(__meteor_bootstrap__.serverDir, clientPath);                                   // 464
        var clientDir = path.dirname(clientJsonPath);                                                                 // 466
        var clientJson = JSON.parse(readUtf8FileSync(clientJsonPath));                                                // 467
        if (clientJson.format !== "web-program-pre1") throw new Error("Unsupported format for client assets: " + JSON.stringify(clientJson.format));
        if (!clientJsonPath || !clientDir || !clientJson) throw new Error("Client config file not parsed.");          // 472
        var urlPrefix = getUrlPrefixForArch(arch);                                                                    // 475
        var manifest = clientJson.manifest;                                                                           // 477
                                                                                                                      //
        _.each(manifest, function (item) {                                                                            // 478
          if (item.url && item.where === "client") {                                                                  // 479
            staticFiles[urlPrefix + getItemPathname(item.url)] = {                                                    // 480
              absolutePath: path.join(clientDir, item.path),                                                          // 481
              cacheable: item.cacheable,                                                                              // 482
              hash: item.hash,                                                                                        // 483
              // Link from source to its map                                                                          // 484
              sourceMapUrl: item.sourceMapUrl,                                                                        // 485
              type: item.type                                                                                         // 486
            };                                                                                                        // 480
                                                                                                                      //
            if (item.sourceMap) {                                                                                     // 489
              // Serve the source map too, under the specified URL. We assume all                                     // 490
              // source maps are cacheable.                                                                           // 491
              staticFiles[urlPrefix + getItemPathname(item.sourceMapUrl)] = {                                         // 492
                absolutePath: path.join(clientDir, item.sourceMap),                                                   // 493
                cacheable: true                                                                                       // 494
              };                                                                                                      // 492
            }                                                                                                         // 496
          }                                                                                                           // 497
        });                                                                                                           // 498
                                                                                                                      //
        var program = {                                                                                               // 500
          format: "web-program-pre1",                                                                                 // 501
          manifest: manifest,                                                                                         // 502
          version: WebAppHashing.calculateClientHash(manifest, null, _.pick(__meteor_runtime_config__, 'PUBLIC_SETTINGS')),
          cordovaCompatibilityVersions: clientJson.cordovaCompatibilityVersions,                                      // 505
          PUBLIC_SETTINGS: __meteor_runtime_config__.PUBLIC_SETTINGS                                                  // 506
        };                                                                                                            // 500
        WebApp.clientPrograms[arch] = program; // Serve the program as a string at /foo/<arch>/manifest.json          // 509
        // XXX change manifest.json -> program.json                                                                   // 512
                                                                                                                      //
        staticFiles[urlPrefix + getItemPathname('/manifest.json')] = {                                                // 513
          content: JSON.stringify(program),                                                                           // 514
          cacheable: false,                                                                                           // 515
          hash: program.version,                                                                                      // 516
          type: "json"                                                                                                // 517
        };                                                                                                            // 513
      };                                                                                                              // 519
                                                                                                                      //
      try {                                                                                                           // 521
        var clientPaths = __meteor_bootstrap__.configJson.clientPaths;                                                // 522
                                                                                                                      //
        _.each(clientPaths, function (clientPath, arch) {                                                             // 523
          archPath[arch] = path.dirname(clientPath);                                                                  // 524
          generateClientProgram(clientPath, arch);                                                                    // 525
        }); // Exported for tests.                                                                                    // 526
                                                                                                                      //
                                                                                                                      //
        WebAppInternals.staticFiles = staticFiles;                                                                    // 529
      } catch (e) {                                                                                                   // 530
        Log.error("Error reloading the client program: " + e.stack);                                                  // 531
        process.exit(1);                                                                                              // 532
      }                                                                                                               // 533
    });                                                                                                               // 534
  };                                                                                                                  // 535
                                                                                                                      //
  WebAppInternals.generateBoilerplate = function () {                                                                 // 537
    // This boilerplate will be served to the mobile devices when used with                                           // 538
    // Meteor/Cordova for the Hot-Code Push and since the file will be served by                                      // 539
    // the device's server, it is important to set the DDP url to the actual                                          // 540
    // Meteor server accepting DDP connections and not the device's file server.                                      // 541
    var defaultOptionsForArch = {                                                                                     // 542
      'web.cordova': {                                                                                                // 543
        runtimeConfigOverrides: {                                                                                     // 544
          // XXX We use absoluteUrl() here so that we serve https://                                                  // 545
          // URLs to cordova clients if force-ssl is in use. If we were                                               // 546
          // to use __meteor_runtime_config__.ROOT_URL instead of                                                     // 547
          // absoluteUrl(), then Cordova clients would immediately get a                                              // 548
          // HCP setting their DDP_DEFAULT_CONNECTION_URL to                                                          // 549
          // http://example.meteor.com. This breaks the app, because                                                  // 550
          // force-ssl doesn't serve CORS headers on 302                                                              // 551
          // redirects. (Plus it's undesirable to have clients                                                        // 552
          // connecting to http://example.meteor.com when force-ssl is                                                // 553
          // in use.)                                                                                                 // 554
          DDP_DEFAULT_CONNECTION_URL: process.env.MOBILE_DDP_URL || Meteor.absoluteUrl(),                             // 555
          ROOT_URL: process.env.MOBILE_ROOT_URL || Meteor.absoluteUrl()                                               // 557
        }                                                                                                             // 544
      }                                                                                                               // 543
    };                                                                                                                // 542
    syncQueue.runTask(function () {                                                                                   // 563
      _.each(WebApp.clientPrograms, function (program, archName) {                                                    // 564
        boilerplateByArch[archName] = WebAppInternals.generateBoilerplateInstance(archName, program.manifest, defaultOptionsForArch[archName]);
      }); // Clear the memoized boilerplate cache.                                                                    // 569
                                                                                                                      //
                                                                                                                      //
      memoizedBoilerplate = {}; // Configure CSS injection for the default arch                                       // 572
      // XXX implement the CSS injection for all archs?                                                               // 575
                                                                                                                      //
      var cssFiles = boilerplateByArch[WebApp.defaultArch].baseData.css; // Rewrite all CSS files (which are written directly to <style> tags)
      // by autoupdate_client to use the CDN prefix/etc                                                               // 578
                                                                                                                      //
      var allCss = _.map(cssFiles, function (cssFile) {                                                               // 579
        return {                                                                                                      // 580
          url: bundledJsCssUrlRewriteHook(cssFile.url)                                                                // 580
        };                                                                                                            // 580
      });                                                                                                             // 581
                                                                                                                      //
      WebAppInternals.refreshableAssets = {                                                                           // 582
        allCss: allCss                                                                                                // 582
      };                                                                                                              // 582
    });                                                                                                               // 583
  };                                                                                                                  // 584
                                                                                                                      //
  WebAppInternals.reloadClientPrograms(); // webserver                                                                // 586
                                                                                                                      //
  var app = connect(); // Packages and apps can add handlers that run before any other Meteor                         // 589
  // handlers via WebApp.rawConnectHandlers.                                                                          // 592
                                                                                                                      //
  var rawConnectHandlers = connect();                                                                                 // 593
  app.use(rawConnectHandlers); // Auto-compress any json, javascript, or text.                                        // 594
                                                                                                                      //
  app.use(connect.compress()); // We're not a proxy; reject (without crashing) attempts to treat us like              // 597
  // one. (See #1212.)                                                                                                // 600
                                                                                                                      //
  app.use(function (req, res, next) {                                                                                 // 601
    if (RoutePolicy.isValidUrl(req.url)) {                                                                            // 602
      next();                                                                                                         // 603
      return;                                                                                                         // 604
    }                                                                                                                 // 605
                                                                                                                      //
    res.writeHead(400);                                                                                               // 606
    res.write("Not a proxy");                                                                                         // 607
    res.end();                                                                                                        // 608
  }); // Strip off the path prefix, if it exists.                                                                     // 609
                                                                                                                      //
  app.use(function (request, response, next) {                                                                        // 612
    var pathPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX;                                                  // 613
                                                                                                                      //
    var url = Npm.require('url').parse(request.url);                                                                  // 614
                                                                                                                      //
    var pathname = url.pathname; // check if the path in the url starts with the path prefix (and the part            // 615
    // after the path prefix must start with a / if it exists.)                                                       // 617
                                                                                                                      //
    if (pathPrefix && pathname.substring(0, pathPrefix.length) === pathPrefix && (pathname.length == pathPrefix.length || pathname.substring(pathPrefix.length, pathPrefix.length + 1) === "/")) {
      request.url = request.url.substring(pathPrefix.length);                                                         // 621
      next();                                                                                                         // 622
    } else if (pathname === "/favicon.ico" || pathname === "/robots.txt") {                                           // 623
      next();                                                                                                         // 624
    } else if (pathPrefix) {                                                                                          // 625
      response.writeHead(404);                                                                                        // 626
      response.write("Unknown path");                                                                                 // 627
      response.end();                                                                                                 // 628
    } else {                                                                                                          // 629
      next();                                                                                                         // 630
    }                                                                                                                 // 631
  }); // Parse the query string into res.query. Used by oauth_server, but it's                                        // 632
  // generally pretty handy..                                                                                         // 635
                                                                                                                      //
  app.use(connect.query()); // Serve static files from the manifest.                                                  // 636
  // This is inspired by the 'static' middleware.                                                                     // 639
                                                                                                                      //
  app.use(function (req, res, next) {                                                                                 // 640
    Fiber(function () {                                                                                               // 641
      WebAppInternals.staticFilesMiddleware(staticFiles, req, res, next);                                             // 642
    }).run();                                                                                                         // 643
  }); // Packages and apps can add handlers to this via WebApp.connectHandlers.                                       // 644
  // They are inserted before our default handler.                                                                    // 647
                                                                                                                      //
  var packageAndAppHandlers = connect();                                                                              // 648
  app.use(packageAndAppHandlers);                                                                                     // 649
  var suppressConnectErrors = false; // connect knows it is an error handler because it has 4 arguments instead of    // 651
  // 3. go figure.  (It is not smart enough to find such a thing if it's hidden                                       // 653
  // inside packageAndAppHandlers.)                                                                                   // 654
                                                                                                                      //
  app.use(function (err, req, res, next) {                                                                            // 655
    if (!err || !suppressConnectErrors || !req.headers['x-suppress-error']) {                                         // 656
      next(err);                                                                                                      // 657
      return;                                                                                                         // 658
    }                                                                                                                 // 659
                                                                                                                      //
    res.writeHead(err.status, {                                                                                       // 660
      'Content-Type': 'text/plain'                                                                                    // 660
    });                                                                                                               // 660
    res.end("An error message");                                                                                      // 661
  });                                                                                                                 // 662
  app.use(function (req, res, next) {                                                                                 // 664
    Fiber(function () {                                                                                               // 665
      if (!appUrl(req.url)) return next();                                                                            // 666
      var headers = {                                                                                                 // 669
        'Content-Type': 'text/html; charset=utf-8'                                                                    // 670
      };                                                                                                              // 669
      if (shuttingDown) headers['Connection'] = 'Close';                                                              // 672
      var request = WebApp.categorizeRequest(req);                                                                    // 675
                                                                                                                      //
      if (request.url.query && request.url.query['meteor_css_resource']) {                                            // 677
        // In this case, we're requesting a CSS resource in the meteor-specific                                       // 678
        // way, but we don't have it.  Serve a static css file that indicates that                                    // 679
        // we didn't have it, so we can detect that and refresh.  Make sure                                           // 680
        // that any proxies or CDNs don't cache this error!  (Normally proxies                                        // 681
        // or CDNs are smart enough not to cache error pages, but in order to                                         // 682
        // make this hack work, we need to return the CSS file as a 200, which                                        // 683
        // would otherwise be cached.)                                                                                // 684
        headers['Content-Type'] = 'text/css; charset=utf-8';                                                          // 685
        headers['Cache-Control'] = 'no-cache';                                                                        // 686
        res.writeHead(200, headers);                                                                                  // 687
        res.write(".meteor-css-not-found-error { width: 0px;}");                                                      // 688
        res.end();                                                                                                    // 689
        return undefined;                                                                                             // 690
      }                                                                                                               // 691
                                                                                                                      //
      if (request.url.query && request.url.query['meteor_js_resource']) {                                             // 693
        // Similarly, we're requesting a JS resource that we don't have.                                              // 694
        // Serve an uncached 404. (We can't use the same hack we use for CSS,                                         // 695
        // because actually acting on that hack requires us to have the JS                                            // 696
        // already!)                                                                                                  // 697
        headers['Cache-Control'] = 'no-cache';                                                                        // 698
        res.writeHead(404, headers);                                                                                  // 699
        res.end("404 Not Found");                                                                                     // 700
        return undefined;                                                                                             // 701
      }                                                                                                               // 702
                                                                                                                      //
      if (request.url.query && request.url.query['meteor_dont_serve_index']) {                                        // 704
        // When downloading files during a Cordova hot code push, we need                                             // 705
        // to detect if a file is not available instead of inadvertently                                              // 706
        // downloading the default index page.                                                                        // 707
        // So similar to the situation above, we serve an uncached 404.                                               // 708
        headers['Cache-Control'] = 'no-cache';                                                                        // 709
        res.writeHead(404, headers);                                                                                  // 710
        res.end("404 Not Found");                                                                                     // 711
        return undefined;                                                                                             // 712
      } // /packages/asdfsad ... /__cordova/dafsdf.js                                                                 // 713
                                                                                                                      //
                                                                                                                      //
      var pathname = parseurl(req).pathname;                                                                          // 716
      var archKey = pathname.split('/')[1];                                                                           // 717
      var archKeyCleaned = 'web.' + archKey.replace(/^__/, '');                                                       // 718
                                                                                                                      //
      if (!/^__/.test(archKey) || !_.has(archPath, archKeyCleaned)) {                                                 // 720
        archKey = WebApp.defaultArch;                                                                                 // 721
      } else {                                                                                                        // 722
        archKey = archKeyCleaned;                                                                                     // 723
      }                                                                                                               // 724
                                                                                                                      //
      var boilerplate;                                                                                                // 726
                                                                                                                      //
      try {                                                                                                           // 727
        boilerplate = getBoilerplate(request, archKey);                                                               // 728
      } catch (e) {                                                                                                   // 729
        Log.error("Error running template: " + e.stack);                                                              // 730
        res.writeHead(500, headers);                                                                                  // 731
        res.end();                                                                                                    // 732
        return undefined;                                                                                             // 733
      }                                                                                                               // 734
                                                                                                                      //
      var statusCode = res.statusCode ? res.statusCode : 200;                                                         // 736
      res.writeHead(statusCode, headers);                                                                             // 737
      res.write(boilerplate);                                                                                         // 738
      res.end();                                                                                                      // 739
      return undefined;                                                                                               // 740
    }).run();                                                                                                         // 741
  }); // Return 404 by default, if no other handlers serve this URL.                                                  // 742
                                                                                                                      //
  app.use(function (req, res) {                                                                                       // 745
    res.writeHead(404);                                                                                               // 746
    res.end();                                                                                                        // 747
  });                                                                                                                 // 748
  var httpServer = http.createServer(app);                                                                            // 751
  var onListeningCallbacks = []; // After 5 seconds w/o data on a socket, kill it.  On the other hand, if             // 752
  // there's an outstanding request, give it a higher timeout instead (to avoid                                       // 755
  // killing long-polling requests)                                                                                   // 756
                                                                                                                      //
  httpServer.setTimeout(SHORT_SOCKET_TIMEOUT); // Do this here, and then also in livedata/stream_server.js, because   // 757
  // stream_server.js kills all the current request handlers when installing its                                      // 760
  // own.                                                                                                             // 761
                                                                                                                      //
  httpServer.on('request', WebApp._timeoutAdjustmentRequestCallback); // If the client gave us a bad request, tell it instead of just closing the
  // socket. This lets load balancers in front of us differentiate between "a                                         // 765
  // server is randomly closing sockets for no reason" and "client sent a bad                                         // 766
  // request".                                                                                                        // 767
  //                                                                                                                  // 768
  // This will only work on Node 6; Node 4 destroys the socket before calling                                         // 769
  // this event. See https://github.com/nodejs/node/pull/4557/ for details.                                           // 770
                                                                                                                      //
  httpServer.on('clientError', function (err, socket) {                                                               // 771
    // Pre-Node-6, do nothing.                                                                                        // 772
    if (socket.destroyed) {                                                                                           // 773
      return;                                                                                                         // 774
    }                                                                                                                 // 775
                                                                                                                      //
    if (err.message === 'Parse Error') {                                                                              // 777
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');                                                                 // 778
    } else {                                                                                                          // 779
      // For other errors, use the default behavior as if we had no clientError                                       // 780
      // handler.                                                                                                     // 781
      socket.destroy(err);                                                                                            // 782
    }                                                                                                                 // 783
  }); // start up app                                                                                                 // 784
                                                                                                                      //
  _.extend(WebApp, {                                                                                                  // 787
    connectHandlers: packageAndAppHandlers,                                                                           // 788
    rawConnectHandlers: rawConnectHandlers,                                                                           // 789
    httpServer: httpServer,                                                                                           // 790
    // For testing.                                                                                                   // 791
    suppressConnectErrors: function () {                                                                              // 792
      suppressConnectErrors = true;                                                                                   // 793
    },                                                                                                                // 794
    onListening: function (f) {                                                                                       // 795
      if (onListeningCallbacks) onListeningCallbacks.push(f);else f();                                                // 796
    }                                                                                                                 // 800
  }); // Let the rest of the packages (and Meteor.startup hooks) insert connect                                       // 787
  // middlewares and update __meteor_runtime_config__, then keep going to set up                                      // 804
  // actually serving HTML.                                                                                           // 805
                                                                                                                      //
                                                                                                                      //
  main = function (argv) {                                                                                            // 806
    WebAppInternals.generateBoilerplate(); // only start listening after all the startup code has run.                // 807
                                                                                                                      //
    var localPort = WebAppInternals.parsePort(process.env.PORT) || 0;                                                 // 810
    var host = process.env.BIND_IP;                                                                                   // 811
    var localIp = host || '0.0.0.0';                                                                                  // 812
    httpServer.listen(localPort, localIp, Meteor.bindEnvironment(function () {                                        // 813
      if (process.env.METEOR_PRINT_ON_LISTEN) console.log("LISTENING"); // must match run-app.js                      // 814
                                                                                                                      //
      var callbacks = onListeningCallbacks;                                                                           // 817
      onListeningCallbacks = null;                                                                                    // 818
                                                                                                                      //
      _.each(callbacks, function (x) {                                                                                // 819
        x();                                                                                                          // 819
      });                                                                                                             // 819
    }, function (e) {                                                                                                 // 821
      console.error("Error listening:", e);                                                                           // 822
      console.error(e && e.stack);                                                                                    // 823
    }));                                                                                                              // 824
    return 'DAEMON';                                                                                                  // 826
  };                                                                                                                  // 827
};                                                                                                                    // 828
                                                                                                                      //
runWebAppServer();                                                                                                    // 831
var inlineScriptsAllowed = true;                                                                                      // 834
                                                                                                                      //
WebAppInternals.inlineScriptsAllowed = function () {                                                                  // 836
  return inlineScriptsAllowed;                                                                                        // 837
};                                                                                                                    // 838
                                                                                                                      //
WebAppInternals.setInlineScriptsAllowed = function (value) {                                                          // 840
  inlineScriptsAllowed = value;                                                                                       // 841
  WebAppInternals.generateBoilerplate();                                                                              // 842
};                                                                                                                    // 843
                                                                                                                      //
WebAppInternals.setBundledJsCssUrlRewriteHook = function (hookFn) {                                                   // 846
  bundledJsCssUrlRewriteHook = hookFn;                                                                                // 847
  WebAppInternals.generateBoilerplate();                                                                              // 848
};                                                                                                                    // 849
                                                                                                                      //
WebAppInternals.setBundledJsCssPrefix = function (prefix) {                                                           // 851
  var self = this;                                                                                                    // 852
  self.setBundledJsCssUrlRewriteHook(function (url) {                                                                 // 853
    return prefix + url;                                                                                              // 855
  });                                                                                                                 // 856
}; // Packages can call `WebAppInternals.addStaticJs` to specify static                                               // 857
// JavaScript to be included in the app. This static JS will be inlined,                                              // 860
// unless inline scripts have been disabled, in which case it will be                                                 // 861
// served under `/<sha1 of contents>`.                                                                                // 862
                                                                                                                      //
                                                                                                                      //
var additionalStaticJs = {};                                                                                          // 863
                                                                                                                      //
WebAppInternals.addStaticJs = function (contents) {                                                                   // 864
  additionalStaticJs["/" + sha1(contents) + ".js"] = contents;                                                        // 865
}; // Exported for tests                                                                                              // 866
                                                                                                                      //
                                                                                                                      //
WebAppInternals.getBoilerplate = getBoilerplate;                                                                      // 869
WebAppInternals.additionalStaticJs = additionalStaticJs;                                                              // 870
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
