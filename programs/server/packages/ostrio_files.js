(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var _ = Package.underscore._;
var check = Package.check.check;
var Match = Package.check.Match;
var Random = Package.random.Random;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var Symbol = Package['ecmascript-runtime-server'].Symbol;
var Map = Package['ecmascript-runtime-server'].Map;
var Set = Package['ecmascript-runtime-server'].Set;

/* Package-scope variables */
var FilesCollection;

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:files":{"server.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/server.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");                                                //
                                                                                                                       //
var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);                                                       //
                                                                                                                       //
var _possibleConstructorReturn2 = require("babel-runtime/helpers/possibleConstructorReturn");                          //
                                                                                                                       //
var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);                                 //
                                                                                                                       //
var _inherits2 = require("babel-runtime/helpers/inherits");                                                            //
                                                                                                                       //
var _inherits3 = _interopRequireDefault(_inherits2);                                                                   //
                                                                                                                       //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                      //
                                                                                                                       //
module.export({                                                                                                        // 1
  FilesCollection: function () {                                                                                       // 1
    return FilesCollection;                                                                                            // 1
  }                                                                                                                    // 1
});                                                                                                                    // 1
                                                                                                                       //
var _ = void 0;                                                                                                        // 1
                                                                                                                       //
module.watch(require("meteor/underscore"), {                                                                           // 1
  _: function (v) {                                                                                                    // 1
    _ = v;                                                                                                             // 1
  }                                                                                                                    // 1
}, 0);                                                                                                                 // 1
var Mongo = void 0;                                                                                                    // 1
module.watch(require("meteor/mongo"), {                                                                                // 1
  Mongo: function (v) {                                                                                                // 1
    Mongo = v;                                                                                                         // 1
  }                                                                                                                    // 1
}, 1);                                                                                                                 // 1
var WebApp = void 0;                                                                                                   // 1
module.watch(require("meteor/webapp"), {                                                                               // 1
  WebApp: function (v) {                                                                                               // 1
    WebApp = v;                                                                                                        // 1
  }                                                                                                                    // 1
}, 2);                                                                                                                 // 1
var Meteor = void 0;                                                                                                   // 1
module.watch(require("meteor/meteor"), {                                                                               // 1
  Meteor: function (v) {                                                                                               // 1
    Meteor = v;                                                                                                        // 1
  }                                                                                                                    // 1
}, 3);                                                                                                                 // 1
var Random = void 0;                                                                                                   // 1
module.watch(require("meteor/random"), {                                                                               // 1
  Random: function (v) {                                                                                               // 1
    Random = v;                                                                                                        // 1
  }                                                                                                                    // 1
}, 4);                                                                                                                 // 1
var Cookies = void 0;                                                                                                  // 1
module.watch(require("meteor/ostrio:cookies"), {                                                                       // 1
  Cookies: function (v) {                                                                                              // 1
    Cookies = v;                                                                                                       // 1
  }                                                                                                                    // 1
}, 5);                                                                                                                 // 1
var WriteStream = void 0;                                                                                              // 1
module.watch(require("./write-stream.js"), {                                                                           // 1
  "default": function (v) {                                                                                            // 1
    WriteStream = v;                                                                                                   // 1
  }                                                                                                                    // 1
}, 6);                                                                                                                 // 1
var check = void 0,                                                                                                    // 1
    Match = void 0;                                                                                                    // 1
module.watch(require("meteor/check"), {                                                                                // 1
  check: function (v) {                                                                                                // 1
    check = v;                                                                                                         // 1
  },                                                                                                                   // 1
  Match: function (v) {                                                                                                // 1
    Match = v;                                                                                                         // 1
  }                                                                                                                    // 1
}, 7);                                                                                                                 // 1
var FilesCollectionCore = void 0;                                                                                      // 1
module.watch(require("./core.js"), {                                                                                   // 1
  "default": function (v) {                                                                                            // 1
    FilesCollectionCore = v;                                                                                           // 1
  }                                                                                                                    // 1
}, 8);                                                                                                                 // 1
var fixJSONParse = void 0,                                                                                             // 1
    fixJSONStringify = void 0;                                                                                         // 1
module.watch(require("./lib.js"), {                                                                                    // 1
  fixJSONParse: function (v) {                                                                                         // 1
    fixJSONParse = v;                                                                                                  // 1
  },                                                                                                                   // 1
  fixJSONStringify: function (v) {                                                                                     // 1
    fixJSONStringify = v;                                                                                              // 1
  }                                                                                                                    // 1
}, 9);                                                                                                                 // 1
var fs = void 0;                                                                                                       // 1
module.watch(require("fs-extra"), {                                                                                    // 1
  "default": function (v) {                                                                                            // 1
    fs = v;                                                                                                            // 1
  }                                                                                                                    // 1
}, 10);                                                                                                                // 1
var nodeQs = void 0;                                                                                                   // 1
module.watch(require("querystring"), {                                                                                 // 1
  "default": function (v) {                                                                                            // 1
    nodeQs = v;                                                                                                        // 1
  }                                                                                                                    // 1
}, 11);                                                                                                                // 1
var request = void 0;                                                                                                  // 1
module.watch(require("request"), {                                                                                     // 1
  "default": function (v) {                                                                                            // 1
    request = v;                                                                                                       // 1
  }                                                                                                                    // 1
}, 12);                                                                                                                // 1
var fileType = void 0;                                                                                                 // 1
module.watch(require("file-type"), {                                                                                   // 1
  "default": function (v) {                                                                                            // 1
    fileType = v;                                                                                                      // 1
  }                                                                                                                    // 1
}, 13);                                                                                                                // 1
var nodePath = void 0;                                                                                                 // 1
module.watch(require("path"), {                                                                                        // 1
  "default": function (v) {                                                                                            // 1
    nodePath = v;                                                                                                      // 1
  }                                                                                                                    // 1
}, 14);                                                                                                                // 1
/*                                                                                                                     // 18
 * @const {Object} bound  - Meteor.bindEnvironment (Fiber wrapper)                                                     //
 * @const {Function} NOOP - No Operation function, placeholder for required callbacks                                  //
 */var bound = Meteor.bindEnvironment(function (callback) {                                                            //
  return callback();                                                                                                   // 22
});                                                                                                                    // 22
                                                                                                                       //
var NOOP = function () {}; /*                                                                                          // 23
                            * @locus Anywhere                                                                          //
                            * @class FilesCollection                                                                   //
                            * @param config           {Object}   - [Both]   Configuration object with next properties:
                            * @param config.debug     {Boolean}  - [Both]   Turn on/of debugging and extra logging     //
                            * @param config.schema    {Object}   - [Both]   Collection Schema                          //
                            * @param config.public    {Boolean}  - [Both]   Store files in folder accessible for proxy servers, for limits, and more - read docs
                            * @param config.strict    {Boolean}  - [Server] Strict mode for partial content, if is `true` server will return `416` response code, when `range` is not specified, otherwise server return `206`
                            * @param config.protected {Function} - [Server] If `true` - files will be served only to authorized users, if `function()` - you're able to check visitor's permissions in your own way function's context has:
                            *  - `request`                                                                             //
                            *  - `response`                                                                            //
                            *  - `user()`                                                                              //
                            *  - `userId`                                                                              //
                            * @param config.chunkSize      {Number}  - [Both] Upload chunk size, default: 524288 bytes (0,5 Mb)
                            * @param config.permissions    {Number}  - [Server] Permissions which will be set to uploaded files (octal), like: `511` or `0o755`. Default: 0644
                            * @param config.parentDirPermissions {Number}  - [Server] Permissions which will be set to parent directory of uploaded files (octal), like: `611` or `0o777`. Default: 0755
                            * @param config.storagePath    {String|Function}  - [Server] Storage path on file system   //
                            * @param config.cacheControl   {String}  - [Server] Default `Cache-Control` header         //
                            * @param config.responseHeaders {Object|Function} - [Server] Custom response headers, if function is passed, must return Object
                            * @param config.throttle       {Number}  - [Server] DEPRECATED bps throttle threshold      //
                            * @param config.downloadRoute  {String}  - [Both]   Server Route used to retrieve files    //
                            * @param config.collection     {Mongo.Collection} - [Both] Mongo Collection Instance       //
                            * @param config.collectionName {String}  - [Both]   Collection name                        //
                            * @param config.namingFunction {Function}- [Both]   Function which returns `String`        //
                            * @param config.integrityCheck {Boolean} - [Server] Check file's integrity before serving to users
                            * @param config.onAfterUpload  {Function}- [Server] Called right after file is ready on FS. Use to transfer file somewhere else, or do other thing with file directly
                            * @param config.onAfterRemove  {Function} - [Server] Called right after file is removed. Removed objects is passed to callback
                            * @param config.continueUploadTTL {Number} - [Server] Time in seconds, during upload may be continued, default 3 hours (10800 seconds)
                            * @param config.onBeforeUpload {Function}- [Both]   Function which executes on server after receiving each chunk and on client right before beginning upload. Function context is `File` - so you are able to check for extension, mime-type, size and etc.:
                            *  - return `true` to continue                                                             //
                            *  - return `false` or `String` to abort upload                                            //
                            * @param config.onInitiateUpload {Function} - [Server] Function which executes on server right before upload is begin and right after `onBeforeUpload` hook. This hook is fully asynchronous.
                            * @param config.onBeforeRemove {Function} - [Server] Executes before removing file on server, so you can check permissions. Return `true` to allow action and `false` to deny.
                            * @param config.allowClientCode  {Boolean}  - [Both]   Allow to run `remove` from client   //
                            * @param config.downloadCallback {Function} - [Server] Callback triggered each time file is requested, return truthy value to continue download, or falsy to abort
                            * @param config.interceptDownload {Function} - [Server] Intercept download request, so you can serve file from third-party resource, arguments {http: {request: {...}, response: {...}}, fileRef: {...}}
                            * @param config.disableUpload {Boolean} - Disable file upload, useful for server only solutions
                            * @param config.disableDownload {Boolean} - Disable file download (serving), useful for file management only solutions
                            * @summary Create new instance of FilesCollection                                          //
                            */                                                                                         //
                                                                                                                       //
var FilesCollection = function (_FilesCollectionCore) {                                                                //
  (0, _inherits3.default)(FilesCollection, _FilesCollectionCore);                                                      //
                                                                                                                       //
  function FilesCollection(config) {                                                                                   // 66
    (0, _classCallCheck3.default)(this, FilesCollection);                                                              // 66
                                                                                                                       //
    var _this = (0, _possibleConstructorReturn3.default)(this, _FilesCollectionCore.call(this));                       // 66
                                                                                                                       //
    var storagePath = void 0;                                                                                          // 68
                                                                                                                       //
    if (config) {                                                                                                      // 69
      storagePath = config.storagePath;                                                                                // 71
      _this.debug = config.debug;                                                                                      // 72
      _this.schema = config.schema;                                                                                    // 73
      _this.public = config.public;                                                                                    // 74
      _this.strict = config.strict;                                                                                    // 75
      _this.chunkSize = config.chunkSize;                                                                              // 76
      _this.protected = config.protected;                                                                              // 77
      _this.collection = config.collection;                                                                            // 78
      _this.permissions = config.permissions;                                                                          // 79
      _this.cacheControl = config.cacheControl;                                                                        // 80
      _this.downloadRoute = config.downloadRoute;                                                                      // 81
      _this.onAfterUpload = config.onAfterUpload;                                                                      // 82
      _this.onAfterRemove = config.onAfterRemove;                                                                      // 83
      _this.disableUpload = config.disableUpload;                                                                      // 84
      _this.onBeforeRemove = config.onBeforeRemove;                                                                    // 85
      _this.integrityCheck = config.integrityCheck;                                                                    // 86
      _this.collectionName = config.collectionName;                                                                    // 87
      _this.onBeforeUpload = config.onBeforeUpload;                                                                    // 88
      _this.namingFunction = config.namingFunction;                                                                    // 89
      _this.responseHeaders = config.responseHeaders;                                                                  // 90
      _this.disableDownload = config.disableDownload;                                                                  // 91
      _this.allowClientCode = config.allowClientCode;                                                                  // 92
      _this.downloadCallback = config.downloadCallback;                                                                // 93
      _this.onInitiateUpload = config.onInitiateUpload;                                                                // 94
      _this.interceptDownload = config.interceptDownload;                                                              // 95
      _this.continueUploadTTL = config.continueUploadTTL;                                                              // 96
      _this.parentDirPermissions = config.parentDirPermissions;                                                        // 97
    }                                                                                                                  // 99
                                                                                                                       //
    var self = _this;                                                                                                  // 101
    var cookie = new Cookies();                                                                                        // 102
                                                                                                                       //
    if (!_.isBoolean(_this.debug)) {                                                                                   // 104
      _this.debug = false;                                                                                             // 105
    }                                                                                                                  // 106
                                                                                                                       //
    if (!_.isBoolean(_this.public)) {                                                                                  // 108
      _this.public = false;                                                                                            // 109
    }                                                                                                                  // 110
                                                                                                                       //
    if (!_this.protected) {                                                                                            // 112
      _this.protected = false;                                                                                         // 113
    }                                                                                                                  // 114
                                                                                                                       //
    if (!_this.chunkSize) {                                                                                            // 116
      _this.chunkSize = 1024 * 512;                                                                                    // 117
    }                                                                                                                  // 118
                                                                                                                       //
    _this.chunkSize = Math.floor(_this.chunkSize / 8) * 8;                                                             // 120
                                                                                                                       //
    if (!_.isString(_this.collectionName) && !_this.collection) {                                                      // 122
      _this.collectionName = 'MeteorUploadFiles';                                                                      // 123
    }                                                                                                                  // 124
                                                                                                                       //
    if (!_this.collection) {                                                                                           // 126
      _this.collection = new Mongo.Collection(_this.collectionName);                                                   // 127
    } else {                                                                                                           // 128
      _this.collectionName = _this.collection._name;                                                                   // 129
    }                                                                                                                  // 130
                                                                                                                       //
    _this.collection.filesCollection = _this;                                                                          // 132
    check(_this.collectionName, String);                                                                               // 133
                                                                                                                       //
    if (_this.public && !_this.downloadRoute) {                                                                        // 135
      throw new Meteor.Error(500, "[FilesCollection." + _this.collectionName + "]: \"downloadRoute\" must be precisely provided on \"public\" collections! Note: \"downloadRoute\" must be equal or be inside of your web/proxy-server (relative) root.");
    }                                                                                                                  // 137
                                                                                                                       //
    if (!_.isString(_this.downloadRoute)) {                                                                            // 139
      _this.downloadRoute = '/cdn/storage';                                                                            // 140
    }                                                                                                                  // 141
                                                                                                                       //
    _this.downloadRoute = _this.downloadRoute.replace(/\/$/, '');                                                      // 143
                                                                                                                       //
    if (!_.isFunction(_this.namingFunction)) {                                                                         // 145
      _this.namingFunction = false;                                                                                    // 146
    }                                                                                                                  // 147
                                                                                                                       //
    if (!_.isFunction(_this.onBeforeUpload)) {                                                                         // 149
      _this.onBeforeUpload = false;                                                                                    // 150
    }                                                                                                                  // 151
                                                                                                                       //
    if (!_.isBoolean(_this.allowClientCode)) {                                                                         // 153
      _this.allowClientCode = true;                                                                                    // 154
    }                                                                                                                  // 155
                                                                                                                       //
    if (!_.isFunction(_this.onInitiateUpload)) {                                                                       // 157
      _this.onInitiateUpload = false;                                                                                  // 158
    }                                                                                                                  // 159
                                                                                                                       //
    if (!_.isFunction(_this.interceptDownload)) {                                                                      // 161
      _this.interceptDownload = false;                                                                                 // 162
    }                                                                                                                  // 163
                                                                                                                       //
    if (!_.isBoolean(_this.strict)) {                                                                                  // 165
      _this.strict = true;                                                                                             // 166
    }                                                                                                                  // 167
                                                                                                                       //
    if (!_.isNumber(_this.permissions)) {                                                                              // 169
      _this.permissions = parseInt('644', 8);                                                                          // 170
    }                                                                                                                  // 171
                                                                                                                       //
    if (!_.isNumber(_this.parentDirPermissions)) {                                                                     // 173
      _this.parentDirPermissions = parseInt('755', 8);                                                                 // 174
    }                                                                                                                  // 175
                                                                                                                       //
    if (!_.isString(_this.cacheControl)) {                                                                             // 177
      _this.cacheControl = 'public, max-age=31536000, s-maxage=31536000';                                              // 178
    }                                                                                                                  // 179
                                                                                                                       //
    if (!_.isFunction(_this.onAfterUpload)) {                                                                          // 181
      _this.onAfterUpload = false;                                                                                     // 182
    }                                                                                                                  // 183
                                                                                                                       //
    if (!_.isBoolean(_this.disableUpload)) {                                                                           // 185
      _this.disableUpload = false;                                                                                     // 186
    }                                                                                                                  // 187
                                                                                                                       //
    if (!_.isFunction(_this.onAfterRemove)) {                                                                          // 189
      _this.onAfterRemove = false;                                                                                     // 190
    }                                                                                                                  // 191
                                                                                                                       //
    if (!_.isFunction(_this.onBeforeRemove)) {                                                                         // 193
      _this.onBeforeRemove = false;                                                                                    // 194
    }                                                                                                                  // 195
                                                                                                                       //
    if (!_.isBoolean(_this.integrityCheck)) {                                                                          // 197
      _this.integrityCheck = true;                                                                                     // 198
    }                                                                                                                  // 199
                                                                                                                       //
    if (!_.isBoolean(_this.disableDownload)) {                                                                         // 201
      _this.disableDownload = false;                                                                                   // 202
    }                                                                                                                  // 203
                                                                                                                       //
    if (!_.isObject(_this._currentUploads)) {                                                                          // 205
      _this._currentUploads = {};                                                                                      // 206
    }                                                                                                                  // 207
                                                                                                                       //
    if (!_.isFunction(_this.downloadCallback)) {                                                                       // 209
      _this.downloadCallback = false;                                                                                  // 210
    }                                                                                                                  // 211
                                                                                                                       //
    if (!_.isNumber(_this.continueUploadTTL)) {                                                                        // 213
      _this.continueUploadTTL = 10800;                                                                                 // 214
    }                                                                                                                  // 215
                                                                                                                       //
    if (!_.isFunction(_this.responseHeaders)) {                                                                        // 217
      _this.responseHeaders = function (responseCode, fileRef, versionRef) {                                           // 218
        var headers = {};                                                                                              // 219
                                                                                                                       //
        switch (responseCode) {                                                                                        // 221
          case '206':                                                                                                  // 222
            headers.Pragma = 'private';                                                                                // 223
            headers.Trailer = 'expires';                                                                               // 224
            headers['Transfer-Encoding'] = 'chunked';                                                                  // 225
            break;                                                                                                     // 226
                                                                                                                       //
          case '400':                                                                                                  // 227
            headers['Cache-Control'] = 'no-cache';                                                                     // 228
            break;                                                                                                     // 229
                                                                                                                       //
          case '416':                                                                                                  // 230
            headers['Content-Range'] = "bytes */" + versionRef.size;                                                   // 231
            break;                                                                                                     // 232
                                                                                                                       //
          default:                                                                                                     // 233
            break;                                                                                                     // 234
        }                                                                                                              // 221
                                                                                                                       //
        headers.Connection = 'keep-alive';                                                                             // 237
        headers['Content-Type'] = versionRef.type || 'application/octet-stream';                                       // 238
        headers['Accept-Ranges'] = 'bytes';                                                                            // 239
        return headers;                                                                                                // 240
      };                                                                                                               // 241
    }                                                                                                                  // 242
                                                                                                                       //
    if (_this.public && !storagePath) {                                                                                // 244
      throw new Meteor.Error(500, "[FilesCollection." + _this.collectionName + "] \"storagePath\" must be set on \"public\" collections! Note: \"storagePath\" must be equal on be inside of your web/proxy-server (absolute) root.");
    }                                                                                                                  // 246
                                                                                                                       //
    if (!storagePath) {                                                                                                // 248
      storagePath = function () {                                                                                      // 249
        return "assets" + nodePath.sep + "app" + nodePath.sep + "uploads" + nodePath.sep + self.collectionName;        // 250
      };                                                                                                               // 251
    }                                                                                                                  // 252
                                                                                                                       //
    if (_.isString(storagePath)) {                                                                                     // 254
      _this.storagePath = function () {                                                                                // 255
        return storagePath;                                                                                            // 255
      };                                                                                                               // 255
    } else {                                                                                                           // 256
      _this.storagePath = function () {                                                                                // 257
        var sp = storagePath.apply(self, arguments);                                                                   // 258
                                                                                                                       //
        if (!_.isString(sp)) {                                                                                         // 259
          throw new Meteor.Error(400, "[FilesCollection." + self.collectionName + "] \"storagePath\" function must return a String!");
        }                                                                                                              // 261
                                                                                                                       //
        sp = sp.replace(/\/$/, '');                                                                                    // 262
        return nodePath.normalize(sp);                                                                                 // 263
      };                                                                                                               // 264
    }                                                                                                                  // 265
                                                                                                                       //
    _this._debug('[FilesCollection.storagePath] Set to:', _this.storagePath({}));                                      // 267
                                                                                                                       //
    fs.mkdirs(_this.storagePath({}), {                                                                                 // 269
      mode: _this.parentDirPermissions                                                                                 // 269
    }, function (error) {                                                                                              // 269
      if (error) {                                                                                                     // 270
        throw new Meteor.Error(401, "[FilesCollection." + self.collectionName + "] Path \"" + _this.storagePath({}) + "\" is not writable!", error);
      }                                                                                                                // 272
    });                                                                                                                // 273
    check(_this.strict, Boolean);                                                                                      // 275
    check(_this.permissions, Number);                                                                                  // 276
    check(_this.storagePath, Function);                                                                                // 277
    check(_this.cacheControl, String);                                                                                 // 278
    check(_this.onAfterRemove, Match.OneOf(false, Function));                                                          // 279
    check(_this.onAfterUpload, Match.OneOf(false, Function));                                                          // 280
    check(_this.disableUpload, Boolean);                                                                               // 281
    check(_this.integrityCheck, Boolean);                                                                              // 282
    check(_this.onBeforeRemove, Match.OneOf(false, Function));                                                         // 283
    check(_this.disableDownload, Boolean);                                                                             // 284
    check(_this.downloadCallback, Match.OneOf(false, Function));                                                       // 285
    check(_this.interceptDownload, Match.OneOf(false, Function));                                                      // 286
    check(_this.continueUploadTTL, Number);                                                                            // 287
    check(_this.responseHeaders, Match.OneOf(Object, Function));                                                       // 288
                                                                                                                       //
    if (!_this.disableUpload) {                                                                                        // 290
      _this._preCollection = new Mongo.Collection("__pre_" + _this.collectionName);                                    // 291
                                                                                                                       //
      _this._preCollection._ensureIndex({                                                                              // 292
        createdAt: 1                                                                                                   // 292
      }, {                                                                                                             // 292
        expireAfterSeconds: _this.continueUploadTTL,                                                                   // 292
        background: true                                                                                               // 292
      });                                                                                                              // 292
                                                                                                                       //
      var _preCollectionCursor = _this._preCollection.find({}, {                                                       // 293
        fields: {                                                                                                      // 294
          _id: 1,                                                                                                      // 295
          isFinished: 1                                                                                                // 296
        }                                                                                                              // 294
      });                                                                                                              // 293
                                                                                                                       //
      _preCollectionCursor.observe({                                                                                   // 300
        changed: function (doc) {                                                                                      // 301
          if (doc.isFinished) {                                                                                        // 302
            self._debug("[FilesCollection] [_preCollectionCursor.observe] [changed]: " + doc._id);                     // 303
                                                                                                                       //
            self._preCollection.remove({                                                                               // 304
              _id: doc._id                                                                                             // 304
            }, NOOP);                                                                                                  // 304
          }                                                                                                            // 305
        },                                                                                                             // 306
        removed: function (doc) {                                                                                      // 307
          // Free memory after upload is done                                                                          // 308
          // Or if upload is unfinished                                                                                // 309
          self._debug("[FilesCollection] [_preCollectionCursor.observe] [removed]: " + doc._id);                       // 310
                                                                                                                       //
          if (_.isObject(self._currentUploads[doc._id])) {                                                             // 311
            self._currentUploads[doc._id].stop();                                                                      // 312
                                                                                                                       //
            self._currentUploads[doc._id].end();                                                                       // 313
                                                                                                                       //
            if (!doc.isFinished) {                                                                                     // 315
              self._debug("[FilesCollection] [_preCollectionCursor.observe] [removeUnfinishedUpload]: " + doc._id);    // 316
                                                                                                                       //
              self._currentUploads[doc._id].abort();                                                                   // 317
            }                                                                                                          // 318
                                                                                                                       //
            delete self._currentUploads[doc._id];                                                                      // 320
          }                                                                                                            // 321
        }                                                                                                              // 322
      });                                                                                                              // 300
                                                                                                                       //
      _this._createStream = function (_id, path, opts) {                                                               // 325
        _this._currentUploads[_id] = new WriteStream(path, opts.fileLength, opts, _this.permissions);                  // 326
      }; // This little function allows to continue upload                                                             // 327
      // even after server is restarted (*not on dev-stage*)                                                           // 330
                                                                                                                       //
                                                                                                                       //
      _this._continueUpload = function (_id) {                                                                         // 331
        if (_this._currentUploads[_id] && _this._currentUploads[_id].file) {                                           // 332
          if (!_this._currentUploads[_id].aborted && !_this._currentUploads[_id].ended) {                              // 333
            return _this._currentUploads[_id].file;                                                                    // 334
          }                                                                                                            // 335
                                                                                                                       //
          _this._createStream(_id, _this._currentUploads[_id].file.file.path, _this._currentUploads[_id].file);        // 336
                                                                                                                       //
          return _this._currentUploads[_id].file;                                                                      // 337
        }                                                                                                              // 338
                                                                                                                       //
        var contUpld = _this._preCollection.findOne({                                                                  // 339
          _id: _id                                                                                                     // 339
        });                                                                                                            // 339
                                                                                                                       //
        if (contUpld) {                                                                                                // 340
          _this._createStream(_id, contUpld.file.path, contUpld);                                                      // 341
                                                                                                                       //
          return _this._currentUploads[_id].file;                                                                      // 342
        }                                                                                                              // 343
                                                                                                                       //
        return false;                                                                                                  // 344
      };                                                                                                               // 345
    }                                                                                                                  // 346
                                                                                                                       //
    if (!_this.schema) {                                                                                               // 348
      _this.schema = {                                                                                                 // 349
        size: {                                                                                                        // 350
          type: Number                                                                                                 // 351
        },                                                                                                             // 350
        name: {                                                                                                        // 353
          type: String                                                                                                 // 354
        },                                                                                                             // 353
        type: {                                                                                                        // 356
          type: String                                                                                                 // 357
        },                                                                                                             // 356
        path: {                                                                                                        // 359
          type: String                                                                                                 // 360
        },                                                                                                             // 359
        isVideo: {                                                                                                     // 362
          type: Boolean                                                                                                // 363
        },                                                                                                             // 362
        isAudio: {                                                                                                     // 365
          type: Boolean                                                                                                // 366
        },                                                                                                             // 365
        isImage: {                                                                                                     // 368
          type: Boolean                                                                                                // 369
        },                                                                                                             // 368
        isText: {                                                                                                      // 371
          type: Boolean                                                                                                // 372
        },                                                                                                             // 371
        isJSON: {                                                                                                      // 374
          type: Boolean                                                                                                // 375
        },                                                                                                             // 374
        isPDF: {                                                                                                       // 377
          type: Boolean                                                                                                // 378
        },                                                                                                             // 377
        extension: {                                                                                                   // 380
          type: String,                                                                                                // 381
          optional: true                                                                                               // 382
        },                                                                                                             // 380
        _storagePath: {                                                                                                // 384
          type: String                                                                                                 // 385
        },                                                                                                             // 384
        _downloadRoute: {                                                                                              // 387
          type: String                                                                                                 // 388
        },                                                                                                             // 387
        _collectionName: {                                                                                             // 390
          type: String                                                                                                 // 391
        },                                                                                                             // 390
        "public": {                                                                                                    // 393
          type: Boolean,                                                                                               // 394
          optional: true                                                                                               // 395
        },                                                                                                             // 393
        meta: {                                                                                                        // 397
          type: Object,                                                                                                // 398
          blackbox: true,                                                                                              // 399
          optional: true                                                                                               // 400
        },                                                                                                             // 397
        userId: {                                                                                                      // 402
          type: String,                                                                                                // 403
          optional: true                                                                                               // 404
        },                                                                                                             // 402
        updatedAt: {                                                                                                   // 406
          type: Date,                                                                                                  // 407
          optional: true                                                                                               // 408
        },                                                                                                             // 406
        versions: {                                                                                                    // 410
          type: Object,                                                                                                // 411
          blackbox: true                                                                                               // 412
        }                                                                                                              // 410
      };                                                                                                               // 349
    }                                                                                                                  // 415
                                                                                                                       //
    check(_this.debug, Boolean);                                                                                       // 417
    check(_this.schema, Object);                                                                                       // 418
    check(_this.public, Boolean);                                                                                      // 419
    check(_this.protected, Match.OneOf(Boolean, Function));                                                            // 420
    check(_this.chunkSize, Number);                                                                                    // 421
    check(_this.downloadRoute, String);                                                                                // 422
    check(_this.namingFunction, Match.OneOf(false, Function));                                                         // 423
    check(_this.onBeforeUpload, Match.OneOf(false, Function));                                                         // 424
    check(_this.onInitiateUpload, Match.OneOf(false, Function));                                                       // 425
    check(_this.allowClientCode, Boolean);                                                                             // 426
                                                                                                                       //
    if (_this.public && _this.protected) {                                                                             // 428
      throw new Meteor.Error(500, "[FilesCollection." + _this.collectionName + "]: Files can not be public and protected at the same time!");
    }                                                                                                                  // 430
                                                                                                                       //
    _this._checkAccess = function (http) {                                                                             // 432
      if (_this.protected) {                                                                                           // 433
        var result = void 0;                                                                                           // 434
                                                                                                                       //
        var _this$_getUser = _this._getUser(http),                                                                     // 433
            user = _this$_getUser.user,                                                                                // 433
            userId = _this$_getUser.userId;                                                                            // 433
                                                                                                                       //
        if (_.isFunction(_this.protected)) {                                                                           // 437
          var fileRef = void 0;                                                                                        // 438
                                                                                                                       //
          if (_.isObject(http.params) && http.params._id) {                                                            // 439
            fileRef = _this.collection.findOne(http.params._id);                                                       // 440
          }                                                                                                            // 441
                                                                                                                       //
          result = http ? _this.protected.call(_.extend(http, {                                                        // 443
            user: user,                                                                                                // 443
            userId: userId                                                                                             // 443
          }), fileRef || null) : _this.protected.call({                                                                // 443
            user: user,                                                                                                // 443
            userId: userId                                                                                             // 443
          }, fileRef || null);                                                                                         // 443
        } else {                                                                                                       // 444
          result = !!userId;                                                                                           // 445
        }                                                                                                              // 446
                                                                                                                       //
        if (http && result === true || !http) {                                                                        // 448
          return true;                                                                                                 // 449
        }                                                                                                              // 450
                                                                                                                       //
        var rc = _.isNumber(result) ? result : 401;                                                                    // 452
                                                                                                                       //
        _this._debug('[FilesCollection._checkAccess] WARN: Access denied!');                                           // 453
                                                                                                                       //
        if (http) {                                                                                                    // 454
          var text = 'Access denied!';                                                                                 // 455
                                                                                                                       //
          if (!http.response.headersSent) {                                                                            // 456
            http.response.writeHead(rc, {                                                                              // 457
              'Content-Type': 'text/plain',                                                                            // 458
              'Content-Length': text.length                                                                            // 459
            });                                                                                                        // 457
          }                                                                                                            // 461
                                                                                                                       //
          if (!http.response.finished) {                                                                               // 463
            http.response.end(text);                                                                                   // 464
          }                                                                                                            // 465
        }                                                                                                              // 466
                                                                                                                       //
        return false;                                                                                                  // 468
      }                                                                                                                // 469
                                                                                                                       //
      return true;                                                                                                     // 470
    };                                                                                                                 // 471
                                                                                                                       //
    _this._methodNames = {                                                                                             // 473
      _Abort: "_FilesCollectionAbort_" + _this.collectionName,                                                         // 474
      _Write: "_FilesCollectionWrite_" + _this.collectionName,                                                         // 475
      _Start: "_FilesCollectionStart_" + _this.collectionName,                                                         // 476
      _Remove: "_FilesCollectionRemove_" + _this.collectionName                                                        // 477
    };                                                                                                                 // 473
                                                                                                                       //
    _this.on('_handleUpload', _this._handleUpload);                                                                    // 480
                                                                                                                       //
    _this.on('_finishUpload', _this._finishUpload);                                                                    // 481
                                                                                                                       //
    if (!_this.disableUpload && !_this.disableDownload) {                                                              // 483
      WebApp.connectHandlers.use(function (httpReq, httpResp, next) {                                                  // 484
        if (!_this.disableUpload && !!~httpReq._parsedUrl.path.indexOf(_this.downloadRoute + "/" + _this.collectionName + "/__upload")) {
          if (httpReq.method === 'POST') {                                                                             // 486
            var handleError = function (error) {                                                                       // 487
              console.warn('[FilesCollection] [Upload] [HTTP] Exception:', error);                                     // 488
                                                                                                                       //
              if (!httpResp.headersSent) {                                                                             // 489
                httpResp.writeHead(500);                                                                               // 490
              }                                                                                                        // 491
                                                                                                                       //
              if (!httpResp.finished) {                                                                                // 492
                httpResp.end(JSON.stringify({                                                                          // 493
                  error: error                                                                                         // 493
                }));                                                                                                   // 493
              }                                                                                                        // 494
            };                                                                                                         // 495
                                                                                                                       //
            var body = '';                                                                                             // 497
            httpReq.on('data', function (data) {                                                                       // 498
              return bound(function () {                                                                               // 498
                body += data;                                                                                          // 499
              });                                                                                                      // 500
            });                                                                                                        // 498
            httpReq.on('end', function () {                                                                            // 502
              return bound(function () {                                                                               // 502
                try {                                                                                                  // 503
                  var opts = void 0;                                                                                   // 504
                  var result = void 0;                                                                                 // 505
                  var user = void 0;                                                                                   // 506
                                                                                                                       //
                  if (httpReq.headers['x-mtok'] && _.isObject(Meteor.server.sessions) && _.has(Meteor.server.sessions[httpReq.headers['x-mtok']], 'userId')) {
                    user = {                                                                                           // 509
                      userId: Meteor.server.sessions[httpReq.headers['x-mtok']].userId                                 // 510
                    };                                                                                                 // 509
                  } else {                                                                                             // 512
                    user = _this._getUser({                                                                            // 513
                      request: httpReq,                                                                                // 513
                      response: httpResp                                                                               // 513
                    });                                                                                                // 513
                  }                                                                                                    // 514
                                                                                                                       //
                  if (httpReq.headers['x-start'] !== '1') {                                                            // 516
                    opts = {                                                                                           // 517
                      fileId: httpReq.headers['x-fileid']                                                              // 518
                    };                                                                                                 // 517
                                                                                                                       //
                    if (httpReq.headers['x-eof'] === '1') {                                                            // 521
                      opts.eof = true;                                                                                 // 522
                    } else {                                                                                           // 523
                      if (typeof Buffer.from === 'function') {                                                         // 524
                        try {                                                                                          // 525
                          opts.binData = Buffer.from(body, 'base64');                                                  // 526
                        } catch (buffErr) {                                                                            // 527
                          opts.binData = new Buffer(body, 'base64');                                                   // 528
                        }                                                                                              // 529
                      } else {                                                                                         // 530
                        opts.binData = new Buffer(body, 'base64');                                                     // 531
                      }                                                                                                // 532
                                                                                                                       //
                      opts.chunkId = parseInt(httpReq.headers['x-chunkid']);                                           // 533
                    }                                                                                                  // 534
                                                                                                                       //
                    var _continueUpload = _this._continueUpload(opts.fileId);                                          // 536
                                                                                                                       //
                    if (!_continueUpload) {                                                                            // 537
                      throw new Meteor.Error(408, 'Can\'t continue upload, session expired. Start upload again.');     // 538
                    }                                                                                                  // 539
                                                                                                                       //
                    var _this$_prepareUpload = _this._prepareUpload(_.extend(opts, _continueUpload), user.userId, 'HTTP');
                                                                                                                       //
                    result = _this$_prepareUpload.result;                                                              // 541
                    opts = _this$_prepareUpload.opts;                                                                  // 541
                                                                                                                       //
                    if (opts.eof) {                                                                                    // 543
                      _this._handleUpload(result, opts, function () {                                                  // 544
                        if (!httpResp.headersSent) {                                                                   // 545
                          httpResp.writeHead(200);                                                                     // 546
                        }                                                                                              // 547
                                                                                                                       //
                        if (_.isObject(result.file) && result.file.meta) {                                             // 549
                          result.file.meta = fixJSONStringify(result.file.meta);                                       // 550
                        }                                                                                              // 551
                                                                                                                       //
                        if (!httpResp.finished) {                                                                      // 553
                          httpResp.end(JSON.stringify(result));                                                        // 554
                        }                                                                                              // 555
                      });                                                                                              // 556
                                                                                                                       //
                      return;                                                                                          // 557
                    }                                                                                                  // 558
                                                                                                                       //
                    _this.emit('_handleUpload', result, opts, NOOP);                                                   // 560
                                                                                                                       //
                    if (!httpResp.headersSent) {                                                                       // 562
                      httpResp.writeHead(204);                                                                         // 563
                    }                                                                                                  // 564
                                                                                                                       //
                    if (!httpResp.finished) {                                                                          // 565
                      httpResp.end();                                                                                  // 566
                    }                                                                                                  // 567
                  } else {                                                                                             // 568
                    try {                                                                                              // 569
                      opts = JSON.parse(body);                                                                         // 570
                    } catch (jsonErr) {                                                                                // 571
                      console.error('Can\'t parse incoming JSON from Client on [.insert() | upload], something went wrong!', jsonErr);
                      opts = {                                                                                         // 573
                        file: {}                                                                                       // 573
                      };                                                                                               // 573
                    }                                                                                                  // 574
                                                                                                                       //
                    opts.___s = true;                                                                                  // 576
                                                                                                                       //
                    _this._debug("[FilesCollection] [File Start HTTP] " + opts.file.name + " - " + opts.fileId);       // 577
                                                                                                                       //
                    if (_.isObject(opts.file) && opts.file.meta) {                                                     // 578
                      opts.file.meta = fixJSONParse(opts.file.meta);                                                   // 579
                    }                                                                                                  // 580
                                                                                                                       //
                    var _this$_prepareUpload2 = _this._prepareUpload(_.clone(opts), user.userId, 'HTTP Start Method');
                                                                                                                       //
                    result = _this$_prepareUpload2.result;                                                             // 582
                                                                                                                       //
                    if (_this.collection.findOne(result._id)) {                                                        // 584
                      throw new Meteor.Error(400, 'Can\'t start upload, data substitution detected!');                 // 585
                    }                                                                                                  // 586
                                                                                                                       //
                    opts._id = opts.fileId;                                                                            // 588
                    opts.createdAt = new Date();                                                                       // 589
                    opts.maxLength = opts.fileLength;                                                                  // 590
                                                                                                                       //
                    _this._preCollection.insert(_.omit(opts, '___s'));                                                 // 591
                                                                                                                       //
                    _this._createStream(result._id, result.path, _.omit(opts, '___s'));                                // 592
                                                                                                                       //
                    if (opts.returnMeta) {                                                                             // 594
                      if (!httpResp.headersSent) {                                                                     // 595
                        httpResp.writeHead(200);                                                                       // 596
                      }                                                                                                // 597
                                                                                                                       //
                      if (!httpResp.finished) {                                                                        // 598
                        httpResp.end(JSON.stringify({                                                                  // 599
                          uploadRoute: _this.downloadRoute + "/" + _this.collectionName + "/__upload",                 // 600
                          file: result                                                                                 // 601
                        }));                                                                                           // 599
                      }                                                                                                // 603
                    } else {                                                                                           // 604
                      if (!httpResp.headersSent) {                                                                     // 605
                        httpResp.writeHead(204);                                                                       // 606
                      }                                                                                                // 607
                                                                                                                       //
                      if (!httpResp.finished) {                                                                        // 608
                        httpResp.end();                                                                                // 609
                      }                                                                                                // 610
                    }                                                                                                  // 611
                  }                                                                                                    // 612
                } catch (httpRespErr) {                                                                                // 613
                  handleError(httpRespErr);                                                                            // 614
                }                                                                                                      // 615
              });                                                                                                      // 616
            });                                                                                                        // 502
          } else {                                                                                                     // 617
            next();                                                                                                    // 618
          }                                                                                                            // 619
                                                                                                                       //
          return;                                                                                                      // 620
        }                                                                                                              // 621
                                                                                                                       //
        if (!_this.disableDownload) {                                                                                  // 623
          var http = void 0;                                                                                           // 624
          var params = void 0;                                                                                         // 625
          var uri = void 0;                                                                                            // 626
          var uris = void 0;                                                                                           // 627
                                                                                                                       //
          if (!_this.public) {                                                                                         // 629
            if (!!~httpReq._parsedUrl.path.indexOf(_this.downloadRoute + "/" + _this.collectionName)) {                // 630
              uri = httpReq._parsedUrl.path.replace(_this.downloadRoute + "/" + _this.collectionName, '');             // 631
                                                                                                                       //
              if (uri.indexOf('/') === 0) {                                                                            // 632
                uri = uri.substring(1);                                                                                // 633
              }                                                                                                        // 634
                                                                                                                       //
              uris = uri.split('/');                                                                                   // 636
                                                                                                                       //
              if (uris.length === 3) {                                                                                 // 637
                params = {                                                                                             // 638
                  _id: uris[0],                                                                                        // 639
                  query: httpReq._parsedUrl.query ? nodeQs.parse(httpReq._parsedUrl.query) : {},                       // 640
                  name: uris[2].split('?')[0],                                                                         // 641
                  version: uris[1]                                                                                     // 642
                };                                                                                                     // 638
                http = {                                                                                               // 645
                  request: httpReq,                                                                                    // 645
                  response: httpResp,                                                                                  // 645
                  params: params                                                                                       // 645
                };                                                                                                     // 645
                                                                                                                       //
                if (_this._checkAccess(http)) {                                                                        // 646
                  _this.download(http, uris[1], _this.collection.findOne(uris[0]));                                    // 647
                }                                                                                                      // 648
              } else {                                                                                                 // 649
                next();                                                                                                // 650
              }                                                                                                        // 651
            } else {                                                                                                   // 652
              next();                                                                                                  // 653
            }                                                                                                          // 654
          } else {                                                                                                     // 655
            if (!!~httpReq._parsedUrl.path.indexOf("" + _this.downloadRoute)) {                                        // 656
              uri = httpReq._parsedUrl.path.replace("" + _this.downloadRoute, '');                                     // 657
                                                                                                                       //
              if (uri.indexOf('/') === 0) {                                                                            // 658
                uri = uri.substring(1);                                                                                // 659
              }                                                                                                        // 660
                                                                                                                       //
              uris = uri.split('/');                                                                                   // 662
              var _file = uris[uris.length - 1];                                                                       // 663
                                                                                                                       //
              if (_file) {                                                                                             // 664
                var version = void 0;                                                                                  // 665
                                                                                                                       //
                if (!!~_file.indexOf('-')) {                                                                           // 666
                  version = _file.split('-')[0];                                                                       // 667
                  _file = _file.split('-')[1].split('?')[0];                                                           // 668
                } else {                                                                                               // 669
                  version = 'original';                                                                                // 670
                  _file = _file.split('?')[0];                                                                         // 671
                }                                                                                                      // 672
                                                                                                                       //
                params = {                                                                                             // 674
                  query: httpReq._parsedUrl.query ? nodeQs.parse(httpReq._parsedUrl.query) : {},                       // 675
                  file: _file,                                                                                         // 676
                  _id: _file.split('.')[0],                                                                            // 677
                  version: version,                                                                                    // 678
                  name: _file                                                                                          // 679
                };                                                                                                     // 674
                http = {                                                                                               // 681
                  request: httpReq,                                                                                    // 681
                  response: httpResp,                                                                                  // 681
                  params: params                                                                                       // 681
                };                                                                                                     // 681
                                                                                                                       //
                _this.download(http, version, _this.collection.findOne(params._id));                                   // 682
              } else {                                                                                                 // 683
                next();                                                                                                // 684
              }                                                                                                        // 685
            } else {                                                                                                   // 686
              next();                                                                                                  // 687
            }                                                                                                          // 688
          }                                                                                                            // 689
                                                                                                                       //
          return;                                                                                                      // 690
        }                                                                                                              // 691
                                                                                                                       //
        next();                                                                                                        // 692
      });                                                                                                              // 693
    }                                                                                                                  // 694
                                                                                                                       //
    if (!_this.disableUpload) {                                                                                        // 696
      var _methods = {}; // Method used to remove file                                                                 // 697
      // from Client side                                                                                              // 700
                                                                                                                       //
      _methods[_this._methodNames._Remove] = function (selector) {                                                     // 701
        check(selector, Match.OneOf(String, Object));                                                                  // 702
                                                                                                                       //
        self._debug("[FilesCollection] [Unlink Method] [.remove(" + selector + ")]");                                  // 703
                                                                                                                       //
        if (self.allowClientCode) {                                                                                    // 705
          if (self.onBeforeRemove && _.isFunction(self.onBeforeRemove)) {                                              // 706
            var userId = this.userId;                                                                                  // 707
            var userFuncs = {                                                                                          // 708
              userId: this.userId,                                                                                     // 709
              user: function () {                                                                                      // 710
                if (Meteor.users) {                                                                                    // 711
                  return Meteor.users.findOne(userId);                                                                 // 712
                }                                                                                                      // 713
                                                                                                                       //
                return null;                                                                                           // 714
              }                                                                                                        // 715
            };                                                                                                         // 708
                                                                                                                       //
            if (!self.onBeforeRemove.call(userFuncs, self.find(selector) || null)) {                                   // 718
              throw new Meteor.Error(403, '[FilesCollection] [remove] Not permitted!');                                // 719
            }                                                                                                          // 720
          }                                                                                                            // 721
                                                                                                                       //
          var cursor = self.find(selector);                                                                            // 723
                                                                                                                       //
          if (cursor.count() > 0) {                                                                                    // 724
            self.remove(selector);                                                                                     // 725
            return true;                                                                                               // 726
          }                                                                                                            // 727
                                                                                                                       //
          throw new Meteor.Error(404, 'Cursor is empty, no files is removed');                                         // 728
        } else {                                                                                                       // 729
          throw new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!');              // 730
        }                                                                                                              // 731
      }; // Method used to receive "first byte" of upload                                                              // 732
      // and all file's meta-data, so                                                                                  // 736
      // it won't be transferred with every chunk                                                                      // 737
      // Basically it prepares everything                                                                              // 738
      // So user can pause/disconnect and                                                                              // 739
      // continue upload later, during `continueUploadTTL`                                                             // 740
                                                                                                                       //
                                                                                                                       //
      _methods[_this._methodNames._Start] = function (opts, returnMeta) {                                              // 741
        check(opts, {                                                                                                  // 742
          file: Object,                                                                                                // 743
          fileId: String,                                                                                              // 744
          FSName: Match.Optional(String),                                                                              // 745
          chunkSize: Number,                                                                                           // 746
          fileLength: Number                                                                                           // 747
        });                                                                                                            // 742
        check(returnMeta, Match.Optional(Boolean));                                                                    // 750
                                                                                                                       //
        self._debug("[FilesCollection] [File Start Method] " + opts.file.name + " - " + opts.fileId);                  // 752
                                                                                                                       //
        opts.___s = true;                                                                                              // 753
                                                                                                                       //
        var _self$_prepareUpload = self._prepareUpload(_.clone(opts), this.userId, 'DDP Start Method'),                // 741
            result = _self$_prepareUpload.result;                                                                      // 741
                                                                                                                       //
        if (self.collection.findOne(result._id)) {                                                                     // 756
          throw new Meteor.Error(400, 'Can\'t start upload, data substitution detected!');                             // 757
        }                                                                                                              // 758
                                                                                                                       //
        opts._id = opts.fileId;                                                                                        // 760
        opts.createdAt = new Date();                                                                                   // 761
        opts.maxLength = opts.fileLength;                                                                              // 762
                                                                                                                       //
        self._preCollection.insert(_.omit(opts, '___s'));                                                              // 763
                                                                                                                       //
        self._createStream(result._id, result.path, _.omit(opts, '___s'));                                             // 764
                                                                                                                       //
        if (returnMeta) {                                                                                              // 766
          return {                                                                                                     // 767
            uploadRoute: self.downloadRoute + "/" + self.collectionName + "/__upload",                                 // 768
            file: result                                                                                               // 769
          };                                                                                                           // 767
        }                                                                                                              // 771
                                                                                                                       //
        return true;                                                                                                   // 772
      }; // Method used to write file chunks                                                                           // 773
      // it receives very limited amount of meta-data                                                                  // 777
      // This method also responsible for EOF                                                                          // 778
                                                                                                                       //
                                                                                                                       //
      _methods[_this._methodNames._Write] = function (opts) {                                                          // 779
        var result = void 0;                                                                                           // 780
        check(opts, {                                                                                                  // 781
          eof: Match.Optional(Boolean),                                                                                // 782
          fileId: String,                                                                                              // 783
          binData: Match.Optional(String),                                                                             // 784
          chunkId: Match.Optional(Number)                                                                              // 785
        });                                                                                                            // 781
                                                                                                                       //
        if (opts.binData) {                                                                                            // 788
          if (typeof Buffer.from === 'function') {                                                                     // 789
            try {                                                                                                      // 790
              opts.binData = Buffer.from(opts.binData, 'base64');                                                      // 791
            } catch (buffErr) {                                                                                        // 792
              opts.binData = new Buffer(opts.binData, 'base64');                                                       // 793
            }                                                                                                          // 794
          } else {                                                                                                     // 795
            opts.binData = new Buffer(opts.binData, 'base64');                                                         // 796
          }                                                                                                            // 797
        }                                                                                                              // 798
                                                                                                                       //
        var _continueUpload = self._continueUpload(opts.fileId);                                                       // 800
                                                                                                                       //
        if (!_continueUpload) {                                                                                        // 801
          throw new Meteor.Error(408, 'Can\'t continue upload, session expired. Start upload again.');                 // 802
        }                                                                                                              // 803
                                                                                                                       //
        this.unblock();                                                                                                // 805
                                                                                                                       //
        var _self$_prepareUpload2 = self._prepareUpload(_.extend(opts, _continueUpload), this.userId, 'DDP');          // 779
                                                                                                                       //
        result = _self$_prepareUpload2.result;                                                                         // 806
        opts = _self$_prepareUpload2.opts;                                                                             // 806
                                                                                                                       //
        if (opts.eof) {                                                                                                // 808
          try {                                                                                                        // 809
            return Meteor.wrapAsync(self._handleUpload.bind(self, result, opts))();                                    // 810
          } catch (handleUploadErr) {                                                                                  // 811
            self._debug('[FilesCollection] [Write Method] [DDP] Exception:', handleUploadErr);                         // 812
                                                                                                                       //
            throw handleUploadErr;                                                                                     // 813
          }                                                                                                            // 814
        } else {                                                                                                       // 815
          self.emit('_handleUpload', result, opts, NOOP);                                                              // 816
        }                                                                                                              // 817
                                                                                                                       //
        return true;                                                                                                   // 818
      }; // Method used to Abort upload                                                                                // 819
      // - Feeing memory by .end()ing writableStreams                                                                  // 822
      // - Removing temporary record from @_preCollection                                                              // 823
      // - Removing record from @collection                                                                            // 824
      // - .unlink()ing chunks from FS                                                                                 // 825
                                                                                                                       //
                                                                                                                       //
      _methods[_this._methodNames._Abort] = function (_id) {                                                           // 826
        check(_id, String);                                                                                            // 827
                                                                                                                       //
        var _continueUpload = self._continueUpload(_id);                                                               // 829
                                                                                                                       //
        self._debug("[FilesCollection] [Abort Method]: " + _id + " - " + (_.isObject(_continueUpload.file) ? _continueUpload.file.path : ''));
                                                                                                                       //
        if (self._currentUploads && self._currentUploads[_id]) {                                                       // 832
          self._currentUploads[_id].stop();                                                                            // 833
                                                                                                                       //
          self._currentUploads[_id].abort();                                                                           // 834
        }                                                                                                              // 835
                                                                                                                       //
        if (_continueUpload) {                                                                                         // 837
          self._preCollection.remove({                                                                                 // 838
            _id: _id                                                                                                   // 838
          });                                                                                                          // 838
                                                                                                                       //
          self.remove({                                                                                                // 839
            _id: _id                                                                                                   // 839
          });                                                                                                          // 839
                                                                                                                       //
          if (_.isObject(_continueUpload.file) && _continueUpload.file.path) {                                         // 840
            self.unlink({                                                                                              // 841
              _id: _id,                                                                                                // 841
              path: _continueUpload.file.path                                                                          // 841
            });                                                                                                        // 841
          }                                                                                                            // 842
        }                                                                                                              // 843
                                                                                                                       //
        return true;                                                                                                   // 844
      };                                                                                                               // 845
                                                                                                                       //
      Meteor.methods(_methods);                                                                                        // 847
    }                                                                                                                  // 848
                                                                                                                       //
    return _this;                                                                                                      // 66
  } /*                                                                                                                 // 849
     * @locus Server                                                                                                   //
     * @memberOf FilesCollection                                                                                       //
     * @name _prepareUpload                                                                                            //
     * @summary Internal method. Used to optimize received data and check upload permission                            //
     * @returns {Object}                                                                                               //
     */                                                                                                                //
                                                                                                                       //
  FilesCollection.prototype._prepareUpload = function () {                                                             //
    function _prepareUpload() {                                                                                        //
      var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};                               // 858
      var userId = arguments[1];                                                                                       // 858
      var transport = arguments[2];                                                                                    // 858
      var ctx = void 0;                                                                                                // 859
                                                                                                                       //
      if (!_.isBoolean(opts.eof)) {                                                                                    // 860
        opts.eof = false;                                                                                              // 861
      }                                                                                                                // 862
                                                                                                                       //
      if (!opts.binData) {                                                                                             // 864
        opts.binData = 'EOF';                                                                                          // 865
      }                                                                                                                // 866
                                                                                                                       //
      if (!_.isNumber(opts.chunkId)) {                                                                                 // 868
        opts.chunkId = -1;                                                                                             // 869
      }                                                                                                                // 870
                                                                                                                       //
      if (!_.isString(opts.FSName)) {                                                                                  // 872
        opts.FSName = opts.fileId;                                                                                     // 873
      }                                                                                                                // 874
                                                                                                                       //
      this._debug("[FilesCollection] [Upload] [" + transport + "] Got #" + opts.chunkId + "/" + opts.fileLength + " chunks, dst: " + (opts.file.name || opts.file.fileName));
                                                                                                                       //
      var fileName = this._getFileName(opts.file);                                                                     // 878
                                                                                                                       //
      var _getExt = this._getExt(fileName),                                                                            // 858
          extension = _getExt.extension,                                                                               // 858
          extensionWithDot = _getExt.extensionWithDot;                                                                 // 858
                                                                                                                       //
      if (!_.isObject(opts.file.meta)) {                                                                               // 881
        opts.file.meta = {};                                                                                           // 882
      }                                                                                                                // 883
                                                                                                                       //
      var result = opts.file;                                                                                          // 885
      result.name = fileName;                                                                                          // 886
      result.meta = opts.file.meta;                                                                                    // 887
      result.extension = extension;                                                                                    // 888
      result.ext = extension;                                                                                          // 889
      result._id = opts.fileId;                                                                                        // 890
      result.userId = userId || null;                                                                                  // 891
      opts.FSName = opts.FSName.replace(/([^a-z0-9\-\_]+)/gi, '-');                                                    // 892
      result.path = "" + this.storagePath(result) + nodePath.sep + opts.FSName + extensionWithDot;                     // 893
      result = _.extend(result, this._dataToSchema(result));                                                           // 894
                                                                                                                       //
      if (this.onBeforeUpload && _.isFunction(this.onBeforeUpload)) {                                                  // 896
        ctx = _.extend({                                                                                               // 897
          file: opts.file                                                                                              // 898
        }, {                                                                                                           // 897
          chunkId: opts.chunkId,                                                                                       // 900
          userId: result.userId,                                                                                       // 901
          user: function () {                                                                                          // 902
            if (Meteor.users && result.userId) {                                                                       // 903
              return Meteor.users.findOne(result.userId);                                                              // 904
            }                                                                                                          // 905
                                                                                                                       //
            return null;                                                                                               // 906
          },                                                                                                           // 907
          eof: opts.eof                                                                                                // 908
        });                                                                                                            // 899
        var isUploadAllowed = this.onBeforeUpload.call(ctx, result);                                                   // 910
                                                                                                                       //
        if (isUploadAllowed !== true) {                                                                                // 912
          throw new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : '@onBeforeUpload() returned false');
        } else {                                                                                                       // 914
          if (opts.___s === true && this.onInitiateUpload && _.isFunction(this.onInitiateUpload)) {                    // 915
            this.onInitiateUpload.call(ctx, result);                                                                   // 916
          }                                                                                                            // 917
        }                                                                                                              // 918
      } else if (opts.___s === true && this.onInitiateUpload && _.isFunction(this.onInitiateUpload)) {                 // 919
        ctx = _.extend({                                                                                               // 920
          file: opts.file                                                                                              // 921
        }, {                                                                                                           // 920
          chunkId: opts.chunkId,                                                                                       // 923
          userId: result.userId,                                                                                       // 924
          user: function () {                                                                                          // 925
            if (Meteor.users && result.userId) {                                                                       // 926
              return Meteor.users.findOne(result.userId);                                                              // 927
            }                                                                                                          // 928
                                                                                                                       //
            return null;                                                                                               // 929
          },                                                                                                           // 930
          eof: opts.eof                                                                                                // 931
        });                                                                                                            // 922
        this.onInitiateUpload.call(ctx, result);                                                                       // 933
      }                                                                                                                // 934
                                                                                                                       //
      return {                                                                                                         // 936
        result: result,                                                                                                // 936
        opts: opts                                                                                                     // 936
      };                                                                                                               // 936
    }                                                                                                                  // 937
                                                                                                                       //
    return _prepareUpload;                                                                                             //
  }(); /*                                                                                                              //
        * @locus Server                                                                                                //
        * @memberOf FilesCollection                                                                                    //
        * @name _finishUpload                                                                                          //
        * @summary Internal method. Finish upload, close Writable stream, add record to MongoDB and flush used memory  //
        * @returns {undefined}                                                                                         //
        */                                                                                                             //
                                                                                                                       //
  FilesCollection.prototype._finishUpload = function () {                                                              //
    function _finishUpload(result, opts, cb) {                                                                         //
      var _this2 = this;                                                                                               // 946
                                                                                                                       //
      this._debug("[FilesCollection] [Upload] [finish(ing)Upload] -> " + result.path);                                 // 947
                                                                                                                       //
      fs.chmod(result.path, this.permissions, NOOP);                                                                   // 948
      result.type = this._getMimeType(opts.file);                                                                      // 949
      result.public = this.public;                                                                                     // 950
                                                                                                                       //
      this._updateFileTypes(result);                                                                                   // 951
                                                                                                                       //
      this.collection.insert(_.clone(result), function (error, _id) {                                                  // 953
        if (error) {                                                                                                   // 954
          cb && cb(error);                                                                                             // 955
                                                                                                                       //
          _this2._debug('[FilesCollection] [Upload] [_finishUpload] Error:', error);                                   // 956
        } else {                                                                                                       // 957
          _this2._preCollection.update({                                                                               // 958
            _id: opts.fileId                                                                                           // 958
          }, {                                                                                                         // 958
            $set: {                                                                                                    // 958
              isFinished: true                                                                                         // 958
            }                                                                                                          // 958
          });                                                                                                          // 958
                                                                                                                       //
          result._id = _id;                                                                                            // 959
                                                                                                                       //
          _this2._debug("[FilesCollection] [Upload] [finish(ed)Upload] -> " + result.path);                            // 960
                                                                                                                       //
          _this2.onAfterUpload && _this2.onAfterUpload.call(_this2, result);                                           // 961
                                                                                                                       //
          _this2.emit('afterUpload', result);                                                                          // 962
                                                                                                                       //
          cb && cb(null, result);                                                                                      // 963
        }                                                                                                              // 964
      });                                                                                                              // 965
    }                                                                                                                  // 966
                                                                                                                       //
    return _finishUpload;                                                                                              //
  }(); /*                                                                                                              //
        * @locus Server                                                                                                //
        * @memberOf FilesCollection                                                                                    //
        * @name _handleUpload                                                                                          //
        * @summary Internal method to handle upload process, pipe incoming data to Writable stream                     //
        * @returns {undefined}                                                                                         //
        */                                                                                                             //
                                                                                                                       //
  FilesCollection.prototype._handleUpload = function () {                                                              //
    function _handleUpload(result, opts, cb) {                                                                         //
      var _this3 = this;                                                                                               // 975
                                                                                                                       //
      try {                                                                                                            // 976
        if (opts.eof) {                                                                                                // 977
          this._currentUploads[result._id].end(function () {                                                           // 978
            _this3.emit('_finishUpload', result, opts, cb);                                                            // 979
          });                                                                                                          // 980
        } else {                                                                                                       // 981
          this._currentUploads[result._id].write(opts.chunkId, opts.binData, cb);                                      // 982
        }                                                                                                              // 983
      } catch (e) {                                                                                                    // 984
        this._debug('[_handleUpload] [EXCEPTION:]', e);                                                                // 985
                                                                                                                       //
        cb && cb(e);                                                                                                   // 986
      }                                                                                                                // 987
    }                                                                                                                  // 988
                                                                                                                       //
    return _handleUpload;                                                                                              //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCollection                                                                                    //
        * @name _getMimeType                                                                                           //
        * @param {Object} fileData - File Object                                                                       //
        * @summary Returns file's mime-type                                                                            //
        * @returns {String}                                                                                            //
        */                                                                                                             //
                                                                                                                       //
  FilesCollection.prototype._getMimeType = function () {                                                               //
    function _getMimeType(fileData) {                                                                                  //
      var mime = void 0;                                                                                               // 999
      check(fileData, Object);                                                                                         // 1000
                                                                                                                       //
      if (_.isObject(fileData) && fileData.type) {                                                                     // 1001
        mime = fileData.type;                                                                                          // 1002
      }                                                                                                                // 1003
                                                                                                                       //
      if (fileData.path && (!mime || !_.isString(mime))) {                                                             // 1005
        try {                                                                                                          // 1006
          var buf = new Buffer(262);                                                                                   // 1007
          var fd = fs.openSync(fileData.path, 'r');                                                                    // 1008
          var br = fs.readSync(fd, buf, 0, 262, 0);                                                                    // 1009
          fs.close(fd, NOOP);                                                                                          // 1010
                                                                                                                       //
          if (br < 262) {                                                                                              // 1011
            buf = buf.slice(0, br);                                                                                    // 1012
          }                                                                                                            // 1013
                                                                                                                       //
          var _fileType = fileType(buf);                                                                               // 1006
                                                                                                                       //
          mime = _fileType.mime;                                                                                       // 1014
        } catch (e) {// We're good                                                                                     // 1015
        }                                                                                                              // 1017
      }                                                                                                                // 1018
                                                                                                                       //
      if (!mime || !_.isString(mime)) {                                                                                // 1020
        mime = 'application/octet-stream';                                                                             // 1021
      }                                                                                                                // 1022
                                                                                                                       //
      return mime;                                                                                                     // 1023
    }                                                                                                                  // 1024
                                                                                                                       //
    return _getMimeType;                                                                                               //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCollection                                                                                    //
        * @name _getUser                                                                                               //
        * @summary Returns object with `userId` and `user()` method which return user's object                         //
        * @returns {Object}                                                                                            //
        */                                                                                                             //
                                                                                                                       //
  FilesCollection.prototype._getUser = function () {                                                                   //
    function _getUser(http) {                                                                                          //
      var result = {                                                                                                   // 1034
        user: function () {                                                                                            // 1035
          return null;                                                                                                 // 1035
        },                                                                                                             // 1035
        userId: null                                                                                                   // 1036
      };                                                                                                               // 1034
                                                                                                                       //
      if (http) {                                                                                                      // 1039
        var mtok = null;                                                                                               // 1040
                                                                                                                       //
        if (http.request.headers['x-mtok']) {                                                                          // 1041
          mtok = http.request.headers['x-mtok'];                                                                       // 1042
        } else {                                                                                                       // 1043
          var cookie = http.request.Cookies;                                                                           // 1044
                                                                                                                       //
          if (cookie.has('x_mtok')) {                                                                                  // 1045
            mtok = cookie.get('x_mtok');                                                                               // 1046
          }                                                                                                            // 1047
        }                                                                                                              // 1048
                                                                                                                       //
        if (mtok) {                                                                                                    // 1050
          var userId = _.isObject(Meteor.server.sessions) && _.isObject(Meteor.server.sessions[mtok]) ? Meteor.server.sessions[mtok].userId : void 0;
                                                                                                                       //
          if (userId) {                                                                                                // 1053
            result.user = function () {                                                                                // 1054
              return Meteor.users.findOne(userId);                                                                     // 1054
            };                                                                                                         // 1054
                                                                                                                       //
            result.userId = userId;                                                                                    // 1055
          }                                                                                                            // 1056
        }                                                                                                              // 1057
      }                                                                                                                // 1058
                                                                                                                       //
      return result;                                                                                                   // 1060
    }                                                                                                                  // 1061
                                                                                                                       //
    return _getUser;                                                                                                   //
  }(); /*                                                                                                              //
        * @locus Server                                                                                                //
        * @memberOf FilesCollection                                                                                    //
        * @name write                                                                                                  //
        * @param {Buffer} buffer - Binary File's Buffer                                                                //
        * @param {Object} opts - Object with file-data                                                                 //
        * @param {String} opts.name - File name, alias: `fileName`                                                     //
        * @param {String} opts.type - File mime-type                                                                   //
        * @param {Object} opts.meta - File additional meta-data                                                        //
        * @param {String} opts.userId - UserId, default *null*                                                         //
        * @param {String} opts.fileId - _id, default *null*                                                            //
        * @param {Function} callback - function(error, fileObj){...}                                                   //
        * @param {Boolean} proceedAfterUpload - Proceed onAfterUpload hook                                             //
        * @summary Write buffer to FS and add to FilesCollection Collection                                            //
        * @returns {FilesCollection} Instance                                                                          //
        */                                                                                                             //
                                                                                                                       //
  FilesCollection.prototype.write = function () {                                                                      //
    function write(buffer) {                                                                                           //
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};                               // 1079
                                                                                                                       //
      var _this4 = this;                                                                                               // 1079
                                                                                                                       //
      var callback = arguments[2];                                                                                     // 1079
      var proceedAfterUpload = arguments[3];                                                                           // 1079
                                                                                                                       //
      this._debug('[FilesCollection] [write()]');                                                                      // 1080
                                                                                                                       //
      if (_.isFunction(opts)) {                                                                                        // 1082
        proceedAfterUpload = callback;                                                                                 // 1083
        callback = opts;                                                                                               // 1084
        opts = {};                                                                                                     // 1085
      } else if (_.isBoolean(callback)) {                                                                              // 1086
        proceedAfterUpload = callback;                                                                                 // 1087
      } else if (_.isBoolean(opts)) {                                                                                  // 1088
        proceedAfterUpload = opts;                                                                                     // 1089
      }                                                                                                                // 1090
                                                                                                                       //
      check(opts, Match.Optional(Object));                                                                             // 1092
      check(callback, Match.Optional(Function));                                                                       // 1093
      check(proceedAfterUpload, Match.Optional(Boolean));                                                              // 1094
      var fileId = opts.fileId || Random.id();                                                                         // 1096
      var FSName = this.namingFunction ? this.namingFunction(opts) : fileId;                                           // 1097
      var fileName = opts.name || opts.fileName ? opts.name || opts.fileName : FSName;                                 // 1098
                                                                                                                       //
      var _getExt2 = this._getExt(fileName),                                                                           // 1079
          extension = _getExt2.extension,                                                                              // 1079
          extensionWithDot = _getExt2.extensionWithDot;                                                                // 1079
                                                                                                                       //
      opts.path = "" + this.storagePath(opts) + nodePath.sep + FSName + extensionWithDot;                              // 1102
      opts.type = this._getMimeType(opts);                                                                             // 1103
                                                                                                                       //
      if (!_.isObject(opts.meta)) {                                                                                    // 1104
        opts.meta = {};                                                                                                // 1105
      }                                                                                                                // 1106
                                                                                                                       //
      if (!_.isNumber(opts.size)) {                                                                                    // 1108
        opts.size = buffer.length;                                                                                     // 1109
      }                                                                                                                // 1110
                                                                                                                       //
      var result = this._dataToSchema({                                                                                // 1112
        name: fileName,                                                                                                // 1113
        path: opts.path,                                                                                               // 1114
        meta: opts.meta,                                                                                               // 1115
        type: opts.type,                                                                                               // 1116
        size: opts.size,                                                                                               // 1117
        userId: opts.userId,                                                                                           // 1118
        extension: extension                                                                                           // 1119
      });                                                                                                              // 1112
                                                                                                                       //
      result._id = fileId;                                                                                             // 1122
      var stream = fs.createWriteStream(opts.path, {                                                                   // 1124
        flags: 'w',                                                                                                    // 1124
        mode: this.permissions                                                                                         // 1124
      });                                                                                                              // 1124
      stream.end(buffer, function (streamErr) {                                                                        // 1125
        return bound(function () {                                                                                     // 1125
          if (streamErr) {                                                                                             // 1126
            callback && callback(streamErr);                                                                           // 1127
          } else {                                                                                                     // 1128
            _this4.collection.insert(result, function (insertErr, _id) {                                               // 1129
              if (insertErr) {                                                                                         // 1130
                callback && callback(insertErr);                                                                       // 1131
                                                                                                                       //
                _this4._debug("[FilesCollection] [write] [insert] Error: " + fileName + " -> " + _this4.collectionName, insertErr);
              } else {                                                                                                 // 1133
                var fileRef = _this4.collection.findOne(_id);                                                          // 1134
                                                                                                                       //
                callback && callback(null, fileRef);                                                                   // 1135
                                                                                                                       //
                if (proceedAfterUpload === true) {                                                                     // 1136
                  _this4.onAfterUpload && _this4.onAfterUpload.call(_this4, fileRef);                                  // 1137
                                                                                                                       //
                  _this4.emit('afterUpload', fileRef);                                                                 // 1138
                }                                                                                                      // 1139
                                                                                                                       //
                _this4._debug("[FilesCollection] [write]: " + fileName + " -> " + _this4.collectionName);              // 1140
              }                                                                                                        // 1141
            });                                                                                                        // 1142
          }                                                                                                            // 1143
        });                                                                                                            // 1144
      });                                                                                                              // 1125
      return this;                                                                                                     // 1145
    }                                                                                                                  // 1146
                                                                                                                       //
    return write;                                                                                                      //
  }(); /*                                                                                                              //
        * @locus Server                                                                                                //
        * @memberOf FilesCollection                                                                                    //
        * @name load                                                                                                   //
        * @param {String} url - URL to file                                                                            //
        * @param {Object} opts - Object with file-data                                                                 //
        * @param {Object} opts.headers - HTTP headers to use when requesting the file                                  //
        * @param {String} opts.name - File name, alias: `fileName`                                                     //
        * @param {String} opts.type - File mime-type                                                                   //
        * @param {Object} opts.meta - File additional meta-data                                                        //
        * @param {String} opts.userId - UserId, default *null*                                                         //
        * @param {String} opts.fileId - _id, default *null*                                                            //
        * @param {Function} callback - function(error, fileObj){...}                                                   //
        * @param {Boolean} proceedAfterUpload - Proceed onAfterUpload hook                                             //
        * @summary Download file, write stream to FS and add to FilesCollection Collection                             //
        * @returns {FilesCollection} Instance                                                                          //
        */                                                                                                             //
                                                                                                                       //
  FilesCollection.prototype.load = function () {                                                                       //
    function load(url) {                                                                                               //
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};                               // 1165
                                                                                                                       //
      var _this5 = this;                                                                                               // 1165
                                                                                                                       //
      var callback = arguments[2];                                                                                     // 1165
      var proceedAfterUpload = arguments[3];                                                                           // 1165
                                                                                                                       //
      this._debug("[FilesCollection] [load(" + url + ", " + JSON.stringify(opts) + ", callback)]");                    // 1166
                                                                                                                       //
      if (_.isFunction(opts)) {                                                                                        // 1168
        proceedAfterUpload = callback;                                                                                 // 1169
        callback = opts;                                                                                               // 1170
        opts = {};                                                                                                     // 1171
      } else if (_.isBoolean(callback)) {                                                                              // 1172
        proceedAfterUpload = callback;                                                                                 // 1173
      } else if (_.isBoolean(opts)) {                                                                                  // 1174
        proceedAfterUpload = opts;                                                                                     // 1175
      }                                                                                                                // 1176
                                                                                                                       //
      check(url, String);                                                                                              // 1178
      check(opts, Match.Optional(Object));                                                                             // 1179
      check(callback, Match.Optional(Function));                                                                       // 1180
      check(proceedAfterUpload, Match.Optional(Boolean));                                                              // 1181
                                                                                                                       //
      if (!_.isObject(opts)) {                                                                                         // 1183
        opts = {};                                                                                                     // 1184
      }                                                                                                                // 1185
                                                                                                                       //
      var fileId = opts.fileId || Random.id();                                                                         // 1187
      var FSName = this.namingFunction ? this.namingFunction(opts) : fileId;                                           // 1188
      var pathParts = url.split('/');                                                                                  // 1189
      var fileName = opts.name || opts.fileName ? opts.name || opts.fileName : pathParts[pathParts.length - 1] || FSName;
                                                                                                                       //
      var _getExt3 = this._getExt(fileName),                                                                           // 1165
          extension = _getExt3.extension,                                                                              // 1165
          extensionWithDot = _getExt3.extensionWithDot;                                                                // 1165
                                                                                                                       //
      opts.path = "" + this.storagePath(opts) + nodePath.sep + FSName + extensionWithDot;                              // 1193
                                                                                                                       //
      var storeResult = function (result, cb) {                                                                        // 1195
        result._id = fileId;                                                                                           // 1196
                                                                                                                       //
        _this5.collection.insert(result, function (error, _id) {                                                       // 1198
          if (error) {                                                                                                 // 1199
            cb && cb(error);                                                                                           // 1200
                                                                                                                       //
            _this5._debug("[FilesCollection] [load] [insert] Error: " + fileName + " -> " + _this5.collectionName, error);
          } else {                                                                                                     // 1202
            var fileRef = _this5.collection.findOne(_id);                                                              // 1203
                                                                                                                       //
            cb && cb(null, fileRef);                                                                                   // 1204
                                                                                                                       //
            if (proceedAfterUpload === true) {                                                                         // 1205
              _this5.onAfterUpload && _this5.onAfterUpload.call(_this5, fileRef);                                      // 1206
                                                                                                                       //
              _this5.emit('afterUpload', fileRef);                                                                     // 1207
            }                                                                                                          // 1208
                                                                                                                       //
            _this5._debug("[FilesCollection] [load] [insert] " + fileName + " -> " + _this5.collectionName);           // 1209
          }                                                                                                            // 1210
        });                                                                                                            // 1211
      };                                                                                                               // 1212
                                                                                                                       //
      request.get({                                                                                                    // 1214
        url: url,                                                                                                      // 1215
        headers: opts.headers || {}                                                                                    // 1216
      }).on('error', function (error) {                                                                                // 1214
        return bound(function () {                                                                                     // 1217
          callback && callback(error);                                                                                 // 1218
                                                                                                                       //
          _this5._debug("[FilesCollection] [load] [request.get(" + url + ")] Error:", error);                          // 1219
        });                                                                                                            // 1220
      }).on('response', function (response) {                                                                          // 1217
        return bound(function () {                                                                                     // 1220
          response.on('end', function () {                                                                             // 1221
            return bound(function () {                                                                                 // 1221
              _this5._debug("[FilesCollection] [load] Received: " + url);                                              // 1222
                                                                                                                       //
              var result = _this5._dataToSchema({                                                                      // 1223
                name: fileName,                                                                                        // 1224
                path: opts.path,                                                                                       // 1225
                meta: opts.meta,                                                                                       // 1226
                type: opts.type || response.headers['content-type'] || _this5._getMimeType({                           // 1227
                  path: opts.path                                                                                      // 1227
                }),                                                                                                    // 1227
                size: opts.size || parseInt(response.headers['content-length'] || 0),                                  // 1228
                userId: opts.userId,                                                                                   // 1229
                extension: extension                                                                                   // 1230
              });                                                                                                      // 1223
                                                                                                                       //
              if (!result.size) {                                                                                      // 1233
                fs.stat(opts.path, function (error, stats) {                                                           // 1234
                  return bound(function () {                                                                           // 1234
                    if (error) {                                                                                       // 1235
                      callback && callback(error);                                                                     // 1236
                    } else {                                                                                           // 1237
                      result.versions.original.size = result.size = stats.size;                                        // 1238
                      storeResult(result, callback);                                                                   // 1239
                    }                                                                                                  // 1240
                  });                                                                                                  // 1241
                });                                                                                                    // 1234
              } else {                                                                                                 // 1242
                storeResult(result, callback);                                                                         // 1243
              }                                                                                                        // 1244
            });                                                                                                        // 1245
          });                                                                                                          // 1221
        });                                                                                                            // 1246
      }).pipe(fs.createWriteStream(opts.path, {                                                                        // 1220
        flags: 'w',                                                                                                    // 1246
        mode: this.permissions                                                                                         // 1246
      }));                                                                                                             // 1246
      return this;                                                                                                     // 1248
    }                                                                                                                  // 1249
                                                                                                                       //
    return load;                                                                                                       //
  }(); /*                                                                                                              //
        * @locus Server                                                                                                //
        * @memberOf FilesCollection                                                                                    //
        * @name addFile                                                                                                //
        * @param {String} path          - Path to file                                                                 //
        * @param {String} opts          - [Optional] Object with file-data                                             //
        * @param {String} opts.type     - [Optional] File mime-type                                                    //
        * @param {Object} opts.meta     - [Optional] File additional meta-data                                         //
        * @param {Object} opts.fileName - [Optional] File name, if not specified file name and extension will be taken from path
        * @param {String} opts.userId   - [Optional] UserId, default *null*                                            //
        * @param {Function} callback    - [Optional] function(error, fileObj){...}                                     //
        * @param {Boolean} proceedAfterUpload - Proceed onAfterUpload hook                                             //
        * @summary Add file from FS to FilesCollection                                                                 //
        * @returns {FilesCollection} Instance                                                                          //
        */                                                                                                             //
                                                                                                                       //
  FilesCollection.prototype.addFile = function () {                                                                    //
    function addFile(path) {                                                                                           //
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};                               // 1266
                                                                                                                       //
      var _this6 = this;                                                                                               // 1266
                                                                                                                       //
      var callback = arguments[2];                                                                                     // 1266
      var proceedAfterUpload = arguments[3];                                                                           // 1266
                                                                                                                       //
      this._debug("[FilesCollection] [addFile(" + path + ")]");                                                        // 1267
                                                                                                                       //
      if (_.isFunction(opts)) {                                                                                        // 1269
        proceedAfterUpload = callback;                                                                                 // 1270
        callback = opts;                                                                                               // 1271
        opts = {};                                                                                                     // 1272
      } else if (_.isBoolean(callback)) {                                                                              // 1273
        proceedAfterUpload = callback;                                                                                 // 1274
      } else if (_.isBoolean(opts)) {                                                                                  // 1275
        proceedAfterUpload = opts;                                                                                     // 1276
      }                                                                                                                // 1277
                                                                                                                       //
      if (this.public) {                                                                                               // 1279
        throw new Meteor.Error(403, 'Can not run [addFile] on public collection! Just Move file to root of your server, then add record to Collection');
      }                                                                                                                // 1281
                                                                                                                       //
      check(path, String);                                                                                             // 1283
      check(opts, Match.Optional(Object));                                                                             // 1284
      check(callback, Match.Optional(Function));                                                                       // 1285
      check(proceedAfterUpload, Match.Optional(Boolean));                                                              // 1286
      fs.stat(path, function (statErr, stats) {                                                                        // 1288
        return bound(function () {                                                                                     // 1288
          if (statErr) {                                                                                               // 1289
            callback && callback(statErr);                                                                             // 1290
          } else if (stats.isFile()) {                                                                                 // 1291
            if (!_.isObject(opts)) {                                                                                   // 1292
              opts = {};                                                                                               // 1293
            }                                                                                                          // 1294
                                                                                                                       //
            opts.path = path;                                                                                          // 1295
                                                                                                                       //
            if (!opts.fileName) {                                                                                      // 1297
              var pathParts = path.split(nodePath.sep);                                                                // 1298
              opts.fileName = path.split(nodePath.sep)[pathParts.length - 1];                                          // 1299
            }                                                                                                          // 1300
                                                                                                                       //
            var _getExt4 = _this6._getExt(opts.fileName),                                                              // 1291
                extension = _getExt4.extension;                                                                        // 1291
                                                                                                                       //
            if (!_.isString(opts.type)) {                                                                              // 1304
              opts.type = _this6._getMimeType(opts);                                                                   // 1305
            }                                                                                                          // 1306
                                                                                                                       //
            if (!_.isObject(opts.meta)) {                                                                              // 1308
              opts.meta = {};                                                                                          // 1309
            }                                                                                                          // 1310
                                                                                                                       //
            if (!_.isNumber(opts.size)) {                                                                              // 1312
              opts.size = stats.size;                                                                                  // 1313
            }                                                                                                          // 1314
                                                                                                                       //
            var result = _this6._dataToSchema({                                                                        // 1316
              name: opts.fileName,                                                                                     // 1317
              path: path,                                                                                              // 1318
              meta: opts.meta,                                                                                         // 1319
              type: opts.type,                                                                                         // 1320
              size: opts.size,                                                                                         // 1321
              userId: opts.userId,                                                                                     // 1322
              extension: extension,                                                                                    // 1323
              _storagePath: path.replace("" + nodePath.sep + opts.fileName, ''),                                       // 1324
              fileId: opts.fileId || null                                                                              // 1325
            });                                                                                                        // 1316
                                                                                                                       //
            _this6.collection.insert(result, function (insertErr, _id) {                                               // 1329
              if (insertErr) {                                                                                         // 1330
                callback && callback(insertErr);                                                                       // 1331
                                                                                                                       //
                _this6._debug("[FilesCollection] [addFile] [insert] Error: " + result.name + " -> " + _this6.collectionName, insertErr);
              } else {                                                                                                 // 1333
                var fileRef = _this6.collection.findOne(_id);                                                          // 1334
                                                                                                                       //
                callback && callback(null, fileRef);                                                                   // 1335
                                                                                                                       //
                if (proceedAfterUpload === true) {                                                                     // 1336
                  _this6.onAfterUpload && _this6.onAfterUpload.call(_this6, fileRef);                                  // 1337
                                                                                                                       //
                  _this6.emit('afterUpload', fileRef);                                                                 // 1338
                }                                                                                                      // 1339
                                                                                                                       //
                _this6._debug("[FilesCollection] [addFile]: " + result.name + " -> " + _this6.collectionName);         // 1340
              }                                                                                                        // 1341
            });                                                                                                        // 1342
          } else {                                                                                                     // 1343
            callback && callback(new Meteor.Error(400, "[FilesCollection] [addFile(" + path + ")]: File does not exist"));
          }                                                                                                            // 1345
        });                                                                                                            // 1346
      });                                                                                                              // 1288
      return this;                                                                                                     // 1347
    }                                                                                                                  // 1348
                                                                                                                       //
    return addFile;                                                                                                    //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCollection                                                                                    //
        * @name remove                                                                                                 //
        * @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)
        * @param {Function} callback - Callback with one `error` argument                                              //
        * @summary Remove documents from the collection                                                                //
        * @returns {FilesCollection} Instance                                                                          //
        */                                                                                                             //
                                                                                                                       //
  FilesCollection.prototype.remove = function () {                                                                     //
    function remove(selector, callback) {                                                                              //
      var _this7 = this;                                                                                               // 1359
                                                                                                                       //
      this._debug("[FilesCollection] [remove(" + JSON.stringify(selector) + ")]");                                     // 1360
                                                                                                                       //
      if (selector === undefined) {                                                                                    // 1361
        return 0;                                                                                                      // 1362
      }                                                                                                                // 1363
                                                                                                                       //
      check(callback, Match.Optional(Function));                                                                       // 1364
      var files = this.collection.find(selector);                                                                      // 1366
                                                                                                                       //
      if (files.count() > 0) {                                                                                         // 1367
        files.forEach(function (file) {                                                                                // 1368
          _this7.unlink(file);                                                                                         // 1369
        });                                                                                                            // 1370
      } else {                                                                                                         // 1371
        callback && callback(new Meteor.Error(404, 'Cursor is empty, no files is removed'));                           // 1372
        return this;                                                                                                   // 1373
      }                                                                                                                // 1374
                                                                                                                       //
      if (this.onAfterRemove) {                                                                                        // 1376
        var docs = files.fetch();                                                                                      // 1377
        var self = this;                                                                                               // 1378
        this.collection.remove(selector, function () {                                                                 // 1379
          callback && callback.apply(this, arguments);                                                                 // 1380
          self.onAfterRemove(docs);                                                                                    // 1381
        });                                                                                                            // 1382
      } else {                                                                                                         // 1383
        this.collection.remove(selector, callback || NOOP);                                                            // 1384
      }                                                                                                                // 1385
                                                                                                                       //
      return this;                                                                                                     // 1386
    }                                                                                                                  // 1387
                                                                                                                       //
    return remove;                                                                                                     //
  }(); /*                                                                                                              //
        * @locus Server                                                                                                //
        * @memberOf FilesCollection                                                                                    //
        * @name deny                                                                                                   //
        * @param {Object} rules                                                                                        //
        * @see  https://docs.meteor.com/api/collections.html#Mongo-Collection-deny                                     //
        * @summary link Mongo.Collection deny methods                                                                  //
        * @returns {Mongo.Collection} Instance                                                                         //
        */                                                                                                             //
                                                                                                                       //
  FilesCollection.prototype.deny = function () {                                                                       //
    function deny(rules) {                                                                                             //
      this.collection.deny(rules);                                                                                     // 1399
      return this.collection;                                                                                          // 1400
    }                                                                                                                  // 1401
                                                                                                                       //
    return deny;                                                                                                       //
  }(); /*                                                                                                              //
        * @locus Server                                                                                                //
        * @memberOf FilesCollection                                                                                    //
        * @name allow                                                                                                  //
        * @param {Object} rules                                                                                        //
        * @see https://docs.meteor.com/api/collections.html#Mongo-Collection-allow                                     //
        * @summary link Mongo.Collection allow methods                                                                 //
        * @returns {Mongo.Collection} Instance                                                                         //
        */                                                                                                             //
                                                                                                                       //
  FilesCollection.prototype.allow = function () {                                                                      //
    function allow(rules) {                                                                                            //
      this.collection.allow(rules);                                                                                    // 1413
      return this.collection;                                                                                          // 1414
    }                                                                                                                  // 1415
                                                                                                                       //
    return allow;                                                                                                      //
  }(); /*                                                                                                              //
        * @locus Server                                                                                                //
        * @memberOf FilesCollection                                                                                    //
        * @name denyClient                                                                                             //
        * @see https://docs.meteor.com/api/collections.html#Mongo-Collection-deny                                      //
        * @summary Shorthands for Mongo.Collection deny method                                                         //
        * @returns {Mongo.Collection} Instance                                                                         //
        */                                                                                                             //
                                                                                                                       //
  FilesCollection.prototype.denyClient = function () {                                                                 //
    function denyClient() {                                                                                            //
      this.collection.deny({                                                                                           // 1426
        insert: function () {                                                                                          // 1427
          return true;                                                                                                 // 1427
        },                                                                                                             // 1427
        update: function () {                                                                                          // 1428
          return true;                                                                                                 // 1428
        },                                                                                                             // 1428
        remove: function () {                                                                                          // 1429
          return true;                                                                                                 // 1429
        }                                                                                                              // 1429
      });                                                                                                              // 1426
      return this.collection;                                                                                          // 1431
    }                                                                                                                  // 1432
                                                                                                                       //
    return denyClient;                                                                                                 //
  }(); /*                                                                                                              //
        * @locus Server                                                                                                //
        * @memberOf FilesCollection                                                                                    //
        * @name allowClient                                                                                            //
        * @see https://docs.meteor.com/api/collections.html#Mongo-Collection-allow                                     //
        * @summary Shorthands for Mongo.Collection allow method                                                        //
        * @returns {Mongo.Collection} Instance                                                                         //
        */                                                                                                             //
                                                                                                                       //
  FilesCollection.prototype.allowClient = function () {                                                                //
    function allowClient() {                                                                                           //
      this.collection.allow({                                                                                          // 1443
        insert: function () {                                                                                          // 1444
          return true;                                                                                                 // 1444
        },                                                                                                             // 1444
        update: function () {                                                                                          // 1445
          return true;                                                                                                 // 1445
        },                                                                                                             // 1445
        remove: function () {                                                                                          // 1446
          return true;                                                                                                 // 1446
        }                                                                                                              // 1446
      });                                                                                                              // 1443
      return this.collection;                                                                                          // 1448
    }                                                                                                                  // 1449
                                                                                                                       //
    return allowClient;                                                                                                //
  }(); /*                                                                                                              //
        * @locus Server                                                                                                //
        * @memberOf FilesCollection                                                                                    //
        * @name unlink                                                                                                 //
        * @param {Object} fileRef - fileObj                                                                            //
        * @param {String} version - [Optional] file's version                                                          //
        * @param {Function} callback - [Optional] callback function                                                    //
        * @summary Unlink files and it's versions from FS                                                              //
        * @returns {FilesCollection} Instance                                                                          //
        */                                                                                                             //
                                                                                                                       //
  FilesCollection.prototype.unlink = function () {                                                                     //
    function unlink(fileRef, version, callback) {                                                                      //
      this._debug("[FilesCollection] [unlink(" + fileRef._id + ", " + version + ")]");                                 // 1463
                                                                                                                       //
      if (version) {                                                                                                   // 1464
        if (_.isObject(fileRef.versions) && _.isObject(fileRef.versions[version]) && fileRef.versions[version].path) {
          fs.unlink(fileRef.versions[version].path, callback || NOOP);                                                 // 1466
        }                                                                                                              // 1467
      } else {                                                                                                         // 1468
        if (_.isObject(fileRef.versions)) {                                                                            // 1469
          _.each(fileRef.versions, function (vRef) {                                                                   // 1470
            return bound(function () {                                                                                 // 1470
              fs.unlink(vRef.path, callback || NOOP);                                                                  // 1471
            });                                                                                                        // 1472
          });                                                                                                          // 1470
        } else {                                                                                                       // 1473
          fs.unlink(fileRef.path, callback || NOOP);                                                                   // 1474
        }                                                                                                              // 1475
      }                                                                                                                // 1476
                                                                                                                       //
      return this;                                                                                                     // 1477
    }                                                                                                                  // 1478
                                                                                                                       //
    return unlink;                                                                                                     //
  }(); /*                                                                                                              //
        * @locus Server                                                                                                //
        * @memberOf FilesCollection                                                                                    //
        * @name _404                                                                                                   //
        * @summary Internal method, used to return 404 error                                                           //
        * @returns {undefined}                                                                                         //
        */                                                                                                             //
                                                                                                                       //
  FilesCollection.prototype._404 = function () {                                                                       //
    function _404(http) {                                                                                              //
      this._debug("[FilesCollection] [download(" + http.request.originalUrl + ")] [_404] File not found");             // 1488
                                                                                                                       //
      var text = 'File Not Found :(';                                                                                  // 1489
                                                                                                                       //
      if (!http.response.headersSent) {                                                                                // 1491
        http.response.writeHead(404, {                                                                                 // 1492
          'Content-Type': 'text/plain',                                                                                // 1493
          'Content-Length': text.length                                                                                // 1494
        });                                                                                                            // 1492
      }                                                                                                                // 1497
                                                                                                                       //
      if (!http.response.finished) {                                                                                   // 1498
        http.response.end(text);                                                                                       // 1499
      }                                                                                                                // 1500
    }                                                                                                                  // 1501
                                                                                                                       //
    return _404;                                                                                                       //
  }(); /*                                                                                                              //
        * @locus Server                                                                                                //
        * @memberOf FilesCollection                                                                                    //
        * @name download                                                                                               //
        * @param {Object} http    - Server HTTP object                                                                 //
        * @param {String} version - Requested file version                                                             //
        * @param {Object} fileRef - Requested file Object                                                              //
        * @summary Initiates the HTTP response                                                                         //
        * @returns {undefined}                                                                                         //
        */                                                                                                             //
                                                                                                                       //
  FilesCollection.prototype.download = function () {                                                                   //
    function download(http) {                                                                                          //
      var _this8 = this;                                                                                               // 1513
                                                                                                                       //
      var version = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'original';                    // 1513
      var fileRef = arguments[2];                                                                                      // 1513
      var vRef = void 0;                                                                                               // 1514
                                                                                                                       //
      this._debug("[FilesCollection] [download(" + http.request.originalUrl + ", " + version + ")]");                  // 1515
                                                                                                                       //
      if (fileRef) {                                                                                                   // 1517
        if (_.has(fileRef, 'versions') && _.has(fileRef.versions, version)) {                                          // 1518
          vRef = fileRef.versions[version];                                                                            // 1519
          vRef._id = fileRef._id;                                                                                      // 1520
        } else {                                                                                                       // 1521
          vRef = fileRef;                                                                                              // 1522
        }                                                                                                              // 1523
      } else {                                                                                                         // 1524
        vRef = false;                                                                                                  // 1525
      }                                                                                                                // 1526
                                                                                                                       //
      if (!vRef || !_.isObject(vRef)) {                                                                                // 1528
        return this._404(http);                                                                                        // 1529
      } else if (fileRef) {                                                                                            // 1530
        if (this.downloadCallback) {                                                                                   // 1531
          if (!this.downloadCallback.call(_.extend(http, this._getUser(http)), fileRef)) {                             // 1532
            return this._404(http);                                                                                    // 1533
          }                                                                                                            // 1534
        }                                                                                                              // 1535
                                                                                                                       //
        if (this.interceptDownload && _.isFunction(this.interceptDownload)) {                                          // 1537
          if (this.interceptDownload(http, fileRef, version) === true) {                                               // 1538
            return void 0;                                                                                             // 1539
          }                                                                                                            // 1540
        }                                                                                                              // 1541
                                                                                                                       //
        fs.stat(vRef.path, function (statErr, stats) {                                                                 // 1543
          return bound(function () {                                                                                   // 1543
            var responseType = void 0;                                                                                 // 1544
                                                                                                                       //
            if (statErr || !stats.isFile()) {                                                                          // 1545
              return _this8._404(http);                                                                                // 1546
            }                                                                                                          // 1547
                                                                                                                       //
            if (stats.size !== vRef.size && !_this8.integrityCheck) {                                                  // 1549
              vRef.size = stats.size;                                                                                  // 1550
            }                                                                                                          // 1551
                                                                                                                       //
            if (stats.size !== vRef.size && _this8.integrityCheck) {                                                   // 1553
              responseType = '400';                                                                                    // 1554
            }                                                                                                          // 1555
                                                                                                                       //
            return _this8.serve(http, fileRef, vRef, version, null, responseType || '200');                            // 1557
          });                                                                                                          // 1558
        });                                                                                                            // 1543
        return void 0;                                                                                                 // 1559
      }                                                                                                                // 1560
                                                                                                                       //
      return this._404(http);                                                                                          // 1561
    }                                                                                                                  // 1562
                                                                                                                       //
    return download;                                                                                                   //
  }(); /*                                                                                                              //
        * @locus Server                                                                                                //
        * @memberOf FilesCollection                                                                                    //
        * @name serve                                                                                                  //
        * @param {Object} http    - Server HTTP object                                                                 //
        * @param {Object} fileRef - Requested file Object                                                              //
        * @param {Object} vRef    - Requested file version Object                                                      //
        * @param {String} version - Requested file version                                                             //
        * @param {stream.Readable|null} readableStream - Readable stream, which serves binary file data                //
        * @param {String} responseType - Response code                                                                 //
        * @param {Boolean} force200 - Force 200 response code over 206                                                 //
        * @summary Handle and reply to incoming request                                                                //
        * @returns {undefined}                                                                                         //
        */                                                                                                             //
                                                                                                                       //
  FilesCollection.prototype.serve = function () {                                                                      //
    function serve(http, fileRef, vRef) {                                                                              //
      var version = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 'original';                    // 1578
      var readableStream = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;                   // 1578
                                                                                                                       //
      var _this9 = this;                                                                                               // 1578
                                                                                                                       //
      var responseType = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : '200';                    // 1578
      var force200 = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : false;                        // 1578
      var partiral = false;                                                                                            // 1579
      var reqRange = false;                                                                                            // 1580
      var dispositionType = '';                                                                                        // 1581
      var start = void 0;                                                                                              // 1582
      var end = void 0;                                                                                                // 1583
      var take = void 0;                                                                                               // 1584
                                                                                                                       //
      if (http.params.query.download && http.params.query.download === 'true') {                                       // 1586
        dispositionType = 'attachment; ';                                                                              // 1587
      } else {                                                                                                         // 1588
        dispositionType = 'inline; ';                                                                                  // 1589
      }                                                                                                                // 1590
                                                                                                                       //
      var dispositionName = "filename=\"" + encodeURI(vRef.name || fileRef.name) + "\"; filename*=UTF-8''" + encodeURI(vRef.name || fileRef.name) + "; ";
      var dispositionEncoding = 'charset=UTF-8';                                                                       // 1593
                                                                                                                       //
      if (!http.response.headersSent) {                                                                                // 1595
        http.response.setHeader('Content-Disposition', dispositionType + dispositionName + dispositionEncoding);       // 1596
      }                                                                                                                // 1597
                                                                                                                       //
      if (http.request.headers.range && !force200) {                                                                   // 1599
        partiral = true;                                                                                               // 1600
        var array = http.request.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);                                       // 1601
        start = parseInt(array[1]);                                                                                    // 1602
        end = parseInt(array[2]);                                                                                      // 1603
                                                                                                                       //
        if (isNaN(end)) {                                                                                              // 1604
          end = vRef.size - 1;                                                                                         // 1605
        }                                                                                                              // 1606
                                                                                                                       //
        take = end - start;                                                                                            // 1607
      } else {                                                                                                         // 1608
        start = 0;                                                                                                     // 1609
        end = vRef.size - 1;                                                                                           // 1610
        take = vRef.size;                                                                                              // 1611
      }                                                                                                                // 1612
                                                                                                                       //
      if (partiral || http.params.query.play && http.params.query.play === 'true') {                                   // 1614
        reqRange = {                                                                                                   // 1615
          start: start,                                                                                                // 1615
          end: end                                                                                                     // 1615
        };                                                                                                             // 1615
                                                                                                                       //
        if (isNaN(start) && !isNaN(end)) {                                                                             // 1616
          reqRange.start = end - take;                                                                                 // 1617
          reqRange.end = end;                                                                                          // 1618
        }                                                                                                              // 1619
                                                                                                                       //
        if (!isNaN(start) && isNaN(end)) {                                                                             // 1620
          reqRange.start = start;                                                                                      // 1621
          reqRange.end = start + take;                                                                                 // 1622
        }                                                                                                              // 1623
                                                                                                                       //
        if (start + take >= vRef.size) {                                                                               // 1625
          reqRange.end = vRef.size - 1;                                                                                // 1625
        }                                                                                                              // 1625
                                                                                                                       //
        if (this.strict && (reqRange.start >= vRef.size - 1 || reqRange.end > vRef.size - 1)) {                        // 1627
          responseType = '416';                                                                                        // 1628
        } else {                                                                                                       // 1629
          responseType = '206';                                                                                        // 1630
        }                                                                                                              // 1631
      } else {                                                                                                         // 1632
        responseType = '200';                                                                                          // 1633
      }                                                                                                                // 1634
                                                                                                                       //
      var streamErrorHandler = function (error) {                                                                      // 1636
        _this9._debug("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [500]", error);                   // 1637
                                                                                                                       //
        if (!http.response.finished) {                                                                                 // 1638
          http.response.end(error.toString());                                                                         // 1639
        }                                                                                                              // 1640
      };                                                                                                               // 1641
                                                                                                                       //
      var headers = _.isFunction(this.responseHeaders) ? this.responseHeaders(responseType, fileRef, vRef, version) : this.responseHeaders;
                                                                                                                       //
      if (!headers['Cache-Control']) {                                                                                 // 1645
        if (!http.response.headersSent) {                                                                              // 1646
          http.response.setHeader('Cache-Control', this.cacheControl);                                                 // 1647
        }                                                                                                              // 1648
      }                                                                                                                // 1649
                                                                                                                       //
      for (var key in meteorBabelHelpers.sanitizeForInObject(headers)) {                                               // 1651
        if (!http.response.headersSent) {                                                                              // 1652
          http.response.setHeader(key, headers[key]);                                                                  // 1653
        }                                                                                                              // 1654
      }                                                                                                                // 1655
                                                                                                                       //
      var stream = void 0;                                                                                             // 1657
                                                                                                                       //
      switch (responseType) {                                                                                          // 1659
        case '400':                                                                                                    // 1660
          this._debug("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [400] Content-Length mismatch!");
                                                                                                                       //
          var text = 'Content-Length mismatch!';                                                                       // 1662
                                                                                                                       //
          if (!http.response.headersSent) {                                                                            // 1664
            http.response.writeHead(400, {                                                                             // 1665
              'Content-Type': 'text/plain',                                                                            // 1666
              'Content-Length': text.length                                                                            // 1667
            });                                                                                                        // 1665
          }                                                                                                            // 1669
                                                                                                                       //
          if (!http.response.finished) {                                                                               // 1671
            http.response.end(text);                                                                                   // 1672
          }                                                                                                            // 1673
                                                                                                                       //
          break;                                                                                                       // 1674
                                                                                                                       //
        case '404':                                                                                                    // 1675
          this._404(http);                                                                                             // 1676
                                                                                                                       //
          break;                                                                                                       // 1677
                                                                                                                       //
        case '416':                                                                                                    // 1678
          this._debug("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [416] Content-Range is not specified!");
                                                                                                                       //
          if (!http.response.headersSent) {                                                                            // 1680
            http.response.writeHead(416);                                                                              // 1681
          }                                                                                                            // 1682
                                                                                                                       //
          if (!http.response.finished) {                                                                               // 1683
            http.response.end();                                                                                       // 1684
          }                                                                                                            // 1685
                                                                                                                       //
          break;                                                                                                       // 1686
                                                                                                                       //
        case '206':                                                                                                    // 1687
          this._debug("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [206]");                          // 1688
                                                                                                                       //
          if (!http.response.headersSent) {                                                                            // 1689
            http.response.setHeader('Content-Range', "bytes " + reqRange.start + "-" + reqRange.end + "/" + vRef.size);
          }                                                                                                            // 1691
                                                                                                                       //
          stream = readableStream || fs.createReadStream(vRef.path, {                                                  // 1692
            start: reqRange.start,                                                                                     // 1692
            end: reqRange.end                                                                                          // 1692
          });                                                                                                          // 1692
                                                                                                                       //
          if (!http.response.headersSent) {                                                                            // 1693
            if (readableStream) {                                                                                      // 1694
              http.response.writeHead(206);                                                                            // 1695
            }                                                                                                          // 1696
          }                                                                                                            // 1697
                                                                                                                       //
          http.response.on('close', function () {                                                                      // 1699
            if (typeof stream.abort === 'function') {                                                                  // 1700
              stream.abort();                                                                                          // 1701
            }                                                                                                          // 1702
                                                                                                                       //
            if (typeof stream.end === 'function') {                                                                    // 1703
              stream.end();                                                                                            // 1704
            }                                                                                                          // 1705
          });                                                                                                          // 1706
          http.request.on('abort', function () {                                                                       // 1708
            if (typeof stream.abort === 'function') {                                                                  // 1709
              stream.abort();                                                                                          // 1710
            }                                                                                                          // 1711
                                                                                                                       //
            if (typeof stream.end === 'function') {                                                                    // 1712
              stream.end();                                                                                            // 1713
            }                                                                                                          // 1714
          });                                                                                                          // 1715
          stream.on('open', function () {                                                                              // 1717
            if (!http.response.headersSent) {                                                                          // 1718
              http.response.writeHead(206);                                                                            // 1719
            }                                                                                                          // 1720
          }).on('abort', function () {                                                                                 // 1721
            if (!http.response.finished) {                                                                             // 1722
              http.response.end();                                                                                     // 1723
            }                                                                                                          // 1724
                                                                                                                       //
            if (!http.request.aborted) {                                                                               // 1725
              http.request.abort();                                                                                    // 1726
            }                                                                                                          // 1727
          }).on('error', streamErrorHandler).on('end', function () {                                                   // 1728
            if (!http.response.finished) {                                                                             // 1730
              http.response.end();                                                                                     // 1731
            }                                                                                                          // 1732
          }).pipe(http.response);                                                                                      // 1733
          break;                                                                                                       // 1734
                                                                                                                       //
        default:                                                                                                       // 1735
          this._debug("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [200]");                          // 1736
                                                                                                                       //
          stream = readableStream || fs.createReadStream(vRef.path);                                                   // 1737
                                                                                                                       //
          if (!http.response.headersSent) {                                                                            // 1738
            if (readableStream) {                                                                                      // 1739
              http.response.writeHead(200);                                                                            // 1739
            }                                                                                                          // 1739
          }                                                                                                            // 1740
                                                                                                                       //
          http.response.on('close', function () {                                                                      // 1742
            if (typeof stream.abort === 'function') {                                                                  // 1743
              stream.abort();                                                                                          // 1744
            }                                                                                                          // 1745
                                                                                                                       //
            if (typeof stream.end === 'function') {                                                                    // 1746
              stream.end();                                                                                            // 1747
            }                                                                                                          // 1748
          });                                                                                                          // 1749
          http.request.on('abort', function () {                                                                       // 1751
            if (typeof stream.abort === 'function') {                                                                  // 1752
              stream.abort();                                                                                          // 1753
            }                                                                                                          // 1754
                                                                                                                       //
            if (typeof stream.end === 'function') {                                                                    // 1755
              stream.end();                                                                                            // 1756
            }                                                                                                          // 1757
          });                                                                                                          // 1758
          stream.on('open', function () {                                                                              // 1760
            if (!http.response.headersSent) {                                                                          // 1761
              http.response.writeHead(200);                                                                            // 1762
            }                                                                                                          // 1763
          }).on('abort', function () {                                                                                 // 1764
            if (!http.response.finished) {                                                                             // 1765
              http.response.end();                                                                                     // 1766
            }                                                                                                          // 1767
                                                                                                                       //
            if (!http.request.aborted) {                                                                               // 1768
              http.request.abort();                                                                                    // 1769
            }                                                                                                          // 1770
          }).on('error', streamErrorHandler).on('end', function () {                                                   // 1771
            if (!http.response.finished) {                                                                             // 1773
              http.response.end();                                                                                     // 1774
            }                                                                                                          // 1775
          }).pipe(http.response);                                                                                      // 1776
          break;                                                                                                       // 1777
      }                                                                                                                // 1659
    }                                                                                                                  // 1779
                                                                                                                       //
    return serve;                                                                                                      //
  }();                                                                                                                 //
                                                                                                                       //
  return FilesCollection;                                                                                              //
}(FilesCollectionCore);                                                                                                //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"core.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/core.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");                                                //
                                                                                                                       //
var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);                                                       //
                                                                                                                       //
var _possibleConstructorReturn2 = require("babel-runtime/helpers/possibleConstructorReturn");                          //
                                                                                                                       //
var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);                                 //
                                                                                                                       //
var _inherits2 = require("babel-runtime/helpers/inherits");                                                            //
                                                                                                                       //
var _inherits3 = _interopRequireDefault(_inherits2);                                                                   //
                                                                                                                       //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                      //
                                                                                                                       //
module.export({                                                                                                        // 1
  "default": function () {                                                                                             // 1
    return FilesCollectionCore;                                                                                        // 1
  }                                                                                                                    // 1
});                                                                                                                    // 1
                                                                                                                       //
var _ = void 0;                                                                                                        // 1
                                                                                                                       //
module.watch(require("meteor/underscore"), {                                                                           // 1
  _: function (v) {                                                                                                    // 1
    _ = v;                                                                                                             // 1
  }                                                                                                                    // 1
}, 0);                                                                                                                 // 1
var EventEmitter = void 0;                                                                                             // 1
module.watch(require("eventemitter3"), {                                                                               // 1
  EventEmitter: function (v) {                                                                                         // 1
    EventEmitter = v;                                                                                                  // 1
  }                                                                                                                    // 1
}, 1);                                                                                                                 // 1
var formatFleURL = void 0;                                                                                             // 1
module.watch(require("./lib.js"), {                                                                                    // 1
  formatFleURL: function (v) {                                                                                         // 1
    formatFleURL = v;                                                                                                  // 1
  }                                                                                                                    // 1
}, 2);                                                                                                                 // 1
var check = void 0,                                                                                                    // 1
    Match = void 0;                                                                                                    // 1
module.watch(require("meteor/check"), {                                                                                // 1
  check: function (v) {                                                                                                // 1
    check = v;                                                                                                         // 1
  },                                                                                                                   // 1
  Match: function (v) {                                                                                                // 1
    Match = v;                                                                                                         // 1
  }                                                                                                                    // 1
}, 3);                                                                                                                 // 1
var FilesCursor = void 0,                                                                                              // 1
    FileCursor = void 0;                                                                                               // 1
module.watch(require("./cursor.js"), {                                                                                 // 1
  FilesCursor: function (v) {                                                                                          // 1
    FilesCursor = v;                                                                                                   // 1
  },                                                                                                                   // 1
  FileCursor: function (v) {                                                                                           // 1
    FileCursor = v;                                                                                                    // 1
  }                                                                                                                    // 1
}, 4);                                                                                                                 // 1
                                                                                                                       //
var FilesCollectionCore = function (_EventEmitter) {                                                                   //
  (0, _inherits3.default)(FilesCollectionCore, _EventEmitter);                                                         //
                                                                                                                       //
  function FilesCollectionCore() {                                                                                     // 8
    (0, _classCallCheck3.default)(this, FilesCollectionCore);                                                          // 8
    return (0, _possibleConstructorReturn3.default)(this, _EventEmitter.call(this));                                   // 8
  } /*                                                                                                                 // 10
     * @locus Anywhere                                                                                                 //
     * @memberOf FilesCollectionCore                                                                                   //
     * @name _debug                                                                                                    //
     * @summary Print logs in debug mode                                                                               //
     * @returns {void}                                                                                                 //
     */                                                                                                                //
                                                                                                                       //
  FilesCollectionCore.prototype._debug = function () {                                                                 //
    function _debug() {                                                                                                //
      if (this.debug) {                                                                                                // 20
        (console.info || console.log || function () {}).apply(undefined, arguments);                                   // 21
      }                                                                                                                // 22
    }                                                                                                                  // 23
                                                                                                                       //
    return _debug;                                                                                                     //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCollectionCore                                                                                //
        * @name _getFileName                                                                                           //
        * @param {Object} fileData - File Object                                                                       //
        * @summary Returns file's name                                                                                 //
        * @returns {String}                                                                                            //
        */                                                                                                             //
                                                                                                                       //
  FilesCollectionCore.prototype._getFileName = function () {                                                           //
    function _getFileName(fileData) {                                                                                  //
      var fileName = fileData.name || fileData.fileName;                                                               // 34
                                                                                                                       //
      if (_.isString(fileName) && fileName.length > 0) {                                                               // 35
        return (fileData.name || fileData.fileName).replace(/\.\./g, '').replace(/\//g, '');                           // 36
      }                                                                                                                // 37
                                                                                                                       //
      return '';                                                                                                       // 38
    }                                                                                                                  // 39
                                                                                                                       //
    return _getFileName;                                                                                               //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCollectionCore                                                                                //
        * @name _getExt                                                                                                //
        * @param {String} FileName - File name                                                                         //
        * @summary Get extension from FileName                                                                         //
        * @returns {Object}                                                                                            //
        */                                                                                                             //
                                                                                                                       //
  FilesCollectionCore.prototype._getExt = function () {                                                                //
    function _getExt(fileName) {                                                                                       //
      if (!!~fileName.indexOf('.')) {                                                                                  // 50
        var extension = (fileName.split('.').pop().split('?')[0] || '').toLowerCase();                                 // 51
        return {                                                                                                       // 52
          ext: extension,                                                                                              // 52
          extension: extension,                                                                                        // 52
          extensionWithDot: "." + extension                                                                            // 52
        };                                                                                                             // 52
      }                                                                                                                // 53
                                                                                                                       //
      return {                                                                                                         // 54
        ext: '',                                                                                                       // 54
        extension: '',                                                                                                 // 54
        extensionWithDot: ''                                                                                           // 54
      };                                                                                                               // 54
    }                                                                                                                  // 55
                                                                                                                       //
    return _getExt;                                                                                                    //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCollectionCore                                                                                //
        * @name _updateFileTypes                                                                                       //
        * @param {Object} data - File data                                                                             //
        * @summary Internal method. Classify file based on 'type' field                                                //
        */                                                                                                             //
                                                                                                                       //
  FilesCollectionCore.prototype._updateFileTypes = function () {                                                       //
    function _updateFileTypes(data) {                                                                                  //
      data.isVideo = /^video\//i.test(data.type);                                                                      // 65
      data.isAudio = /^audio\//i.test(data.type);                                                                      // 66
      data.isImage = /^image\//i.test(data.type);                                                                      // 67
      data.isText = /^text\//i.test(data.type);                                                                        // 68
      data.isJSON = /^application\/json$/i.test(data.type);                                                            // 69
      data.isPDF = /^application\/(x-)?pdf$/i.test(data.type);                                                         // 70
    }                                                                                                                  // 71
                                                                                                                       //
    return _updateFileTypes;                                                                                           //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCollectionCore                                                                                //
        * @name _dataToSchema                                                                                          //
        * @param {Object} data - File data                                                                             //
        * @summary Internal method. Build object in accordance with default schema from File data                      //
        * @returns {Object}                                                                                            //
        */                                                                                                             //
                                                                                                                       //
  FilesCollectionCore.prototype._dataToSchema = function () {                                                          //
    function _dataToSchema(data) {                                                                                     //
      var ds = {                                                                                                       // 82
        name: data.name,                                                                                               // 83
        extension: data.extension,                                                                                     // 84
        path: data.path,                                                                                               // 85
        meta: data.meta,                                                                                               // 86
        type: data.type,                                                                                               // 87
        size: data.size,                                                                                               // 88
        userId: data.userId || null,                                                                                   // 89
        versions: {                                                                                                    // 90
          original: {                                                                                                  // 91
            path: data.path,                                                                                           // 92
            size: data.size,                                                                                           // 93
            type: data.type,                                                                                           // 94
            extension: data.extension                                                                                  // 95
          }                                                                                                            // 91
        },                                                                                                             // 90
        _downloadRoute: data._downloadRoute || this.downloadRoute,                                                     // 98
        _collectionName: data._collectionName || this.collectionName                                                   // 99
      }; //Optional fileId                                                                                             // 82
                                                                                                                       //
      if (data.fileId) {                                                                                               // 103
        ds._id = data.fileId;                                                                                          // 104
      }                                                                                                                // 105
                                                                                                                       //
      this._updateFileTypes(ds);                                                                                       // 107
                                                                                                                       //
      ds._storagePath = data._storagePath || this.storagePath(_.extend(data, ds));                                     // 108
      return ds;                                                                                                       // 109
    }                                                                                                                  // 110
                                                                                                                       //
    return _dataToSchema;                                                                                              //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCollectionCore                                                                                //
        * @name findOne                                                                                                //
        * @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)
        * @param {Object} options - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#sortspecifiers)
        * @summary Find and return Cursor for matching document Object                                                 //
        * @returns {FileCursor} Instance                                                                               //
        */                                                                                                             //
                                                                                                                       //
  FilesCollectionCore.prototype.findOne = function () {                                                                //
    function findOne() {                                                                                               //
      var selector = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};                           // 121
      var options = arguments[1];                                                                                      // 121
                                                                                                                       //
      this._debug("[FilesCollection] [findOne(" + JSON.stringify(selector) + ", " + JSON.stringify(options) + ")]");   // 122
                                                                                                                       //
      check(selector, Match.Optional(Match.OneOf(Object, String, Boolean, Number, null)));                             // 123
      check(options, Match.Optional(Object));                                                                          // 124
      var doc = this.collection.findOne(selector, options);                                                            // 126
                                                                                                                       //
      if (doc) {                                                                                                       // 127
        return new FileCursor(doc, this);                                                                              // 128
      }                                                                                                                // 129
                                                                                                                       //
      return doc;                                                                                                      // 130
    }                                                                                                                  // 131
                                                                                                                       //
    return findOne;                                                                                                    //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCollectionCore                                                                                //
        * @name find                                                                                                   //
        * @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)
        * @param {Object}        options  - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#sortspecifiers)
        * @summary Find and return Cursor for matching documents                                                       //
        * @returns {FilesCursor} Instance                                                                              //
        */                                                                                                             //
                                                                                                                       //
  FilesCollectionCore.prototype.find = function () {                                                                   //
    function find() {                                                                                                  //
      var selector = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};                           // 142
      var options = arguments[1];                                                                                      // 142
                                                                                                                       //
      this._debug("[FilesCollection] [find(" + JSON.stringify(selector) + ", " + JSON.stringify(options) + ")]");      // 143
                                                                                                                       //
      check(selector, Match.Optional(Match.OneOf(Object, String, Boolean, Number, null)));                             // 144
      check(options, Match.Optional(Object));                                                                          // 145
      return new FilesCursor(selector, options, this);                                                                 // 147
    }                                                                                                                  // 148
                                                                                                                       //
    return find;                                                                                                       //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCollectionCore                                                                                //
        * @name update                                                                                                 //
        * @see http://docs.meteor.com/#/full/update                                                                    //
        * @summary link Mongo.Collection update method                                                                 //
        * @returns {Mongo.Collection} Instance                                                                         //
        */                                                                                                             //
                                                                                                                       //
  FilesCollectionCore.prototype.update = function () {                                                                 //
    function update() {                                                                                                //
      this.collection.update.apply(this.collection, arguments);                                                        // 159
      return this.collection;                                                                                          // 160
    }                                                                                                                  // 161
                                                                                                                       //
    return update;                                                                                                     //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCollectionCore                                                                                //
        * @name link                                                                                                   //
        * @param {Object} fileRef - File reference object                                                              //
        * @param {String} version - Version of file you would like to request                                          //
        * @summary Returns downloadable URL                                                                            //
        * @returns {String} Empty string returned in case if file not found in DB                                      //
        */                                                                                                             //
                                                                                                                       //
  FilesCollectionCore.prototype.link = function () {                                                                   //
    function link(fileRef) {                                                                                           //
      var version = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'original';                    // 172
                                                                                                                       //
      this._debug("[FilesCollection] [link(" + (_.isObject(fileRef) ? fileRef._id : undefined) + ", " + version + ")]");
                                                                                                                       //
      check(fileRef, Object);                                                                                          // 174
      check(version, String);                                                                                          // 175
                                                                                                                       //
      if (!fileRef) {                                                                                                  // 177
        return '';                                                                                                     // 178
      }                                                                                                                // 179
                                                                                                                       //
      return formatFleURL(fileRef, version);                                                                           // 180
    }                                                                                                                  // 181
                                                                                                                       //
    return link;                                                                                                       //
  }();                                                                                                                 //
                                                                                                                       //
  return FilesCollectionCore;                                                                                          //
}(EventEmitter);                                                                                                       //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"cursor.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/cursor.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");                                                //
                                                                                                                       //
var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);                                                       //
                                                                                                                       //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                      //
                                                                                                                       //
module.export({                                                                                                        // 1
  FileCursor: function () {                                                                                            // 1
    return FileCursor;                                                                                                 // 1
  },                                                                                                                   // 1
  FilesCursor: function () {                                                                                           // 1
    return FilesCursor;                                                                                                // 1
  }                                                                                                                    // 1
});                                                                                                                    // 1
                                                                                                                       //
var _ = void 0;                                                                                                        // 1
                                                                                                                       //
module.watch(require("meteor/underscore"), {                                                                           // 1
  _: function (v) {                                                                                                    // 1
    _ = v;                                                                                                             // 1
  }                                                                                                                    // 1
}, 0);                                                                                                                 // 1
var Meteor = void 0;                                                                                                   // 1
module.watch(require("meteor/meteor"), {                                                                               // 1
  Meteor: function (v) {                                                                                               // 1
    Meteor = v;                                                                                                        // 1
  }                                                                                                                    // 1
}, 1);                                                                                                                 // 1
                                                                                                                       //
var FileCursor = function () {                                                                                         //
  function FileCursor(_fileRef, _collection) {                                                                         // 13
    (0, _classCallCheck3.default)(this, FileCursor);                                                                   // 13
    this._fileRef = _fileRef;                                                                                          // 14
    this._collection = _collection;                                                                                    // 15
    Object.assign(this, _fileRef);                                                                                     // 16
  } /*                                                                                                                 // 17
     * @locus Anywhere                                                                                                 //
     * @memberOf FileCursor                                                                                            //
     * @name remove                                                                                                    //
     * @param callback {Function} - Triggered asynchronously after item is removed or failed to be removed             //
     * @summary Remove document                                                                                        //
     * @returns {FileCursor}                                                                                           //
     */                                                                                                                //
                                                                                                                       //
  FileCursor.prototype.remove = function () {                                                                          //
    function remove(callback) {                                                                                        //
      this._collection._debug('[FilesCollection] [FileCursor] [remove()]');                                            // 28
                                                                                                                       //
      if (this._fileRef) {                                                                                             // 29
        this._collection.remove(this._fileRef._id, callback);                                                          // 30
      } else {                                                                                                         // 31
        callback && callback(new Meteor.Error(404, 'No such file'));                                                   // 32
      }                                                                                                                // 33
                                                                                                                       //
      return this;                                                                                                     // 34
    }                                                                                                                  // 35
                                                                                                                       //
    return remove;                                                                                                     //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FileCursor                                                                                         //
        * @name link                                                                                                   //
        * @param version {String} - Name of file's subversion                                                          //
        * @summary Returns downloadable URL to File                                                                    //
        * @returns {String}                                                                                            //
        */                                                                                                             //
                                                                                                                       //
  FileCursor.prototype.link = function () {                                                                            //
    function link() {                                                                                                  //
      var version = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'original';                    // 45
                                                                                                                       //
      this._collection._debug("[FilesCollection] [FileCursor] [link(" + version + ")]");                               // 46
                                                                                                                       //
      if (this._fileRef) {                                                                                             // 47
        return this._collection.link(this._fileRef, version);                                                          // 48
      }                                                                                                                // 49
                                                                                                                       //
      return '';                                                                                                       // 50
    }                                                                                                                  // 51
                                                                                                                       //
    return link;                                                                                                       //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FileCursor                                                                                         //
        * @name get                                                                                                    //
        * @param property {String} - Name of sub-object property                                                       //
        * @summary Returns current document as a plain Object, if `property` is specified - returns value of sub-object property
        * @returns {Object|mix}                                                                                        //
        */                                                                                                             //
                                                                                                                       //
  FileCursor.prototype.get = function () {                                                                             //
    function get(property) {                                                                                           //
      this._collection._debug("[FilesCollection] [FileCursor] [get(" + property + ")]");                               // 62
                                                                                                                       //
      if (property) {                                                                                                  // 63
        return this._fileRef[property];                                                                                // 64
      }                                                                                                                // 65
                                                                                                                       //
      return this._fileRef;                                                                                            // 66
    }                                                                                                                  // 67
                                                                                                                       //
    return get;                                                                                                        //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FileCursor                                                                                         //
        * @name fetch                                                                                                  //
        * @summary Returns document as plain Object in Array                                                           //
        * @returns {[Object]}                                                                                          //
        */                                                                                                             //
                                                                                                                       //
  FileCursor.prototype.fetch = function () {                                                                           //
    function fetch() {                                                                                                 //
      this._collection._debug('[FilesCollection] [FileCursor] [fetch()]');                                             // 77
                                                                                                                       //
      return [this._fileRef];                                                                                          // 78
    }                                                                                                                  // 79
                                                                                                                       //
    return fetch;                                                                                                      //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FileCursor                                                                                         //
        * @name with                                                                                                   //
        * @summary Returns reactive version of current FileCursor, useful to use with `{{#with}}...{{/with}}` block template helper
        * @returns {[Object]}                                                                                          //
        */                                                                                                             //
                                                                                                                       //
  FileCursor.prototype.with = function () {                                                                            //
    function _with() {                                                                                                 //
      this._collection._debug('[FilesCollection] [FileCursor] [with()]');                                              // 89
                                                                                                                       //
      return _.extend(this, this._collection.collection.findOne(this._fileRef._id));                                   // 90
    }                                                                                                                  // 91
                                                                                                                       //
    return _with;                                                                                                      //
  }();                                                                                                                 //
                                                                                                                       //
  return FileCursor;                                                                                                   //
}();                                                                                                                   //
                                                                                                                       //
var FilesCursor = function () {                                                                                        //
  function FilesCursor() {                                                                                             // 104
    var _selector = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};                            // 104
                                                                                                                       //
    var options = arguments[1];                                                                                        // 104
    var _collection = arguments[2];                                                                                    // 104
    (0, _classCallCheck3.default)(this, FilesCursor);                                                                  // 104
    this._collection = _collection;                                                                                    // 105
    this._selector = _selector;                                                                                        // 106
    this._current = -1;                                                                                                // 107
    this.cursor = this._collection.collection.find(this._selector, options);                                           // 108
  } /*                                                                                                                 // 109
     * @locus Anywhere                                                                                                 //
     * @memberOf FilesCursor                                                                                           //
     * @name get                                                                                                       //
     * @summary Returns all matching document(s) as an Array. Alias of `.fetch()`                                      //
     * @returns {[Object]}                                                                                             //
     */                                                                                                                //
                                                                                                                       //
  FilesCursor.prototype.get = function () {                                                                            //
    function get() {                                                                                                   //
      this._collection._debug('[FilesCollection] [FilesCursor] [get()]');                                              // 119
                                                                                                                       //
      return this.cursor.fetch();                                                                                      // 120
    }                                                                                                                  // 121
                                                                                                                       //
    return get;                                                                                                        //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCursor                                                                                        //
        * @name hasNext                                                                                                //
        * @summary Returns `true` if there is next item available on Cursor                                            //
        * @returns {Boolean}                                                                                           //
        */                                                                                                             //
                                                                                                                       //
  FilesCursor.prototype.hasNext = function () {                                                                        //
    function hasNext() {                                                                                               //
      this._collection._debug('[FilesCollection] [FilesCursor] [hasNext()]');                                          // 131
                                                                                                                       //
      return this._current < this.cursor.count() - 1;                                                                  // 132
    }                                                                                                                  // 133
                                                                                                                       //
    return hasNext;                                                                                                    //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCursor                                                                                        //
        * @name next                                                                                                   //
        * @summary Returns next item on Cursor, if available                                                           //
        * @returns {Object|undefined}                                                                                  //
        */                                                                                                             //
                                                                                                                       //
  FilesCursor.prototype.next = function () {                                                                           //
    function next() {                                                                                                  //
      this._collection._debug('[FilesCollection] [FilesCursor] [next()]');                                             // 143
                                                                                                                       //
      this.cursor.fetch()[++this._current];                                                                            // 144
    }                                                                                                                  // 145
                                                                                                                       //
    return next;                                                                                                       //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCursor                                                                                        //
        * @name hasPrevious                                                                                            //
        * @summary Returns `true` if there is previous item available on Cursor                                        //
        * @returns {Boolean}                                                                                           //
        */                                                                                                             //
                                                                                                                       //
  FilesCursor.prototype.hasPrevious = function () {                                                                    //
    function hasPrevious() {                                                                                           //
      this._collection._debug('[FilesCollection] [FilesCursor] [hasPrevious()]');                                      // 155
                                                                                                                       //
      return this._current !== -1;                                                                                     // 156
    }                                                                                                                  // 157
                                                                                                                       //
    return hasPrevious;                                                                                                //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCursor                                                                                        //
        * @name previous                                                                                               //
        * @summary Returns previous item on Cursor, if available                                                       //
        * @returns {Object|undefined}                                                                                  //
        */                                                                                                             //
                                                                                                                       //
  FilesCursor.prototype.previous = function () {                                                                       //
    function previous() {                                                                                              //
      this._collection._debug('[FilesCollection] [FilesCursor] [previous()]');                                         // 167
                                                                                                                       //
      this.cursor.fetch()[--this._current];                                                                            // 168
    }                                                                                                                  // 169
                                                                                                                       //
    return previous;                                                                                                   //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCursor                                                                                        //
        * @name fetch                                                                                                  //
        * @summary Returns all matching document(s) as an Array.                                                       //
        * @returns {[Object]}                                                                                          //
        */                                                                                                             //
                                                                                                                       //
  FilesCursor.prototype.fetch = function () {                                                                          //
    function fetch() {                                                                                                 //
      this._collection._debug('[FilesCollection] [FilesCursor] [fetch()]');                                            // 179
                                                                                                                       //
      return this.cursor.fetch() || [];                                                                                // 180
    }                                                                                                                  // 181
                                                                                                                       //
    return fetch;                                                                                                      //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCursor                                                                                        //
        * @name first                                                                                                  //
        * @summary Returns first item on Cursor, if available                                                          //
        * @returns {Object|undefined}                                                                                  //
        */                                                                                                             //
                                                                                                                       //
  FilesCursor.prototype.first = function () {                                                                          //
    function first() {                                                                                                 //
      this._collection._debug('[FilesCollection] [FilesCursor] [first()]');                                            // 191
                                                                                                                       //
      this._current = 0;                                                                                               // 192
      return this.fetch()[this._current];                                                                              // 193
    }                                                                                                                  // 194
                                                                                                                       //
    return first;                                                                                                      //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCursor                                                                                        //
        * @name last                                                                                                   //
        * @summary Returns last item on Cursor, if available                                                           //
        * @returns {Object|undefined}                                                                                  //
        */                                                                                                             //
                                                                                                                       //
  FilesCursor.prototype.last = function () {                                                                           //
    function last() {                                                                                                  //
      this._collection._debug('[FilesCollection] [FilesCursor] [last()]');                                             // 204
                                                                                                                       //
      this._current = this.count() - 1;                                                                                // 205
      return this.fetch()[this._current];                                                                              // 206
    }                                                                                                                  // 207
                                                                                                                       //
    return last;                                                                                                       //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCursor                                                                                        //
        * @name count                                                                                                  //
        * @summary Returns the number of documents that match a query                                                  //
        * @returns {Number}                                                                                            //
        */                                                                                                             //
                                                                                                                       //
  FilesCursor.prototype.count = function () {                                                                          //
    function count() {                                                                                                 //
      this._collection._debug('[FilesCollection] [FilesCursor] [count()]');                                            // 217
                                                                                                                       //
      return this.cursor.count();                                                                                      // 218
    }                                                                                                                  // 219
                                                                                                                       //
    return count;                                                                                                      //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCursor                                                                                        //
        * @name remove                                                                                                 //
        * @param callback {Function} - Triggered asynchronously after item is removed or failed to be removed          //
        * @summary Removes all documents that match a query                                                            //
        * @returns {FilesCursor}                                                                                       //
        */                                                                                                             //
                                                                                                                       //
  FilesCursor.prototype.remove = function () {                                                                         //
    function remove(callback) {                                                                                        //
      this._collection._debug('[FilesCollection] [FilesCursor] [remove()]');                                           // 230
                                                                                                                       //
      this._collection.remove(this._selector, callback);                                                               // 231
                                                                                                                       //
      return this;                                                                                                     // 232
    }                                                                                                                  // 233
                                                                                                                       //
    return remove;                                                                                                     //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCursor                                                                                        //
        * @name forEach                                                                                                //
        * @param callback {Function} - Function to call. It will be called with three arguments: the `file`, a 0-based index, and cursor itself
        * @param context {Object} - An object which will be the value of `this` inside `callback`                      //
        * @summary Call `callback` once for each matching document, sequentially and synchronously.                    //
        * @returns {undefined}                                                                                         //
        */                                                                                                             //
                                                                                                                       //
  FilesCursor.prototype.forEach = function () {                                                                        //
    function forEach(callback) {                                                                                       //
      var context = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};                            // 244
                                                                                                                       //
      this._collection._debug('[FilesCollection] [FilesCursor] [forEach()]');                                          // 245
                                                                                                                       //
      this.cursor.forEach(callback, context);                                                                          // 246
    }                                                                                                                  // 247
                                                                                                                       //
    return forEach;                                                                                                    //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCursor                                                                                        //
        * @name each                                                                                                   //
        * @summary Returns an Array of FileCursor made for each document on current cursor                             //
        *          Useful when using in {{#each FilesCursor#each}}...{{/each}} block template helper                   //
        * @returns {[FileCursor]}                                                                                      //
        */                                                                                                             //
                                                                                                                       //
  FilesCursor.prototype.each = function () {                                                                           //
    function each() {                                                                                                  //
      var _this = this;                                                                                                // 257
                                                                                                                       //
      return this.map(function (file) {                                                                                // 258
        return new FileCursor(file, _this._collection);                                                                // 259
      });                                                                                                              // 260
    }                                                                                                                  // 261
                                                                                                                       //
    return each;                                                                                                       //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCursor                                                                                        //
        * @name map                                                                                                    //
        * @param callback {Function} - Function to call. It will be called with three arguments: the `file`, a 0-based index, and cursor itself
        * @param context {Object} - An object which will be the value of `this` inside `callback`                      //
        * @summary Map `callback` over all matching documents. Returns an Array.                                       //
        * @returns {Array}                                                                                             //
        */                                                                                                             //
                                                                                                                       //
  FilesCursor.prototype.map = function () {                                                                            //
    function map(callback) {                                                                                           //
      var context = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};                            // 272
                                                                                                                       //
      this._collection._debug('[FilesCollection] [FilesCursor] [map()]');                                              // 273
                                                                                                                       //
      return this.cursor.map(callback, context);                                                                       // 274
    }                                                                                                                  // 275
                                                                                                                       //
    return map;                                                                                                        //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCursor                                                                                        //
        * @name current                                                                                                //
        * @summary Returns current item on Cursor, if available                                                        //
        * @returns {Object|undefined}                                                                                  //
        */                                                                                                             //
                                                                                                                       //
  FilesCursor.prototype.current = function () {                                                                        //
    function current() {                                                                                               //
      this._collection._debug('[FilesCollection] [FilesCursor] [current()]');                                          // 285
                                                                                                                       //
      if (this._current < 0) {                                                                                         // 286
        this._current = 0;                                                                                             // 287
      }                                                                                                                // 288
                                                                                                                       //
      return this.fetch()[this._current];                                                                              // 289
    }                                                                                                                  // 290
                                                                                                                       //
    return current;                                                                                                    //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCursor                                                                                        //
        * @name observe                                                                                                //
        * @param callbacks {Object} - Functions to call to deliver the result set as it changes                        //
        * @summary Watch a query. Receive callbacks as the result set changes.                                         //
        * @url http://docs.meteor.com/api/collections.html#Mongo-Cursor-observe                                        //
        * @returns {Object} - live query handle                                                                        //
        */                                                                                                             //
                                                                                                                       //
  FilesCursor.prototype.observe = function () {                                                                        //
    function observe(callbacks) {                                                                                      //
      this._collection._debug('[FilesCollection] [FilesCursor] [observe()]');                                          // 302
                                                                                                                       //
      return this.cursor.observe(callbacks);                                                                           // 303
    }                                                                                                                  // 304
                                                                                                                       //
    return observe;                                                                                                    //
  }(); /*                                                                                                              //
        * @locus Anywhere                                                                                              //
        * @memberOf FilesCursor                                                                                        //
        * @name observeChanges                                                                                         //
        * @param callbacks {Object} - Functions to call to deliver the result set as it changes                        //
        * @summary Watch a query. Receive callbacks as the result set changes. Only the differences between the old and new documents are passed to the callbacks.
        * @url http://docs.meteor.com/api/collections.html#Mongo-Cursor-observeChanges                                 //
        * @returns {Object} - live query handle                                                                        //
        */                                                                                                             //
                                                                                                                       //
  FilesCursor.prototype.observeChanges = function () {                                                                 //
    function observeChanges(callbacks) {                                                                               //
      this._collection._debug('[FilesCollection] [FilesCursor] [observeChanges()]');                                   // 316
                                                                                                                       //
      return this.cursor.observeChanges(callbacks);                                                                    // 317
    }                                                                                                                  // 318
                                                                                                                       //
    return observeChanges;                                                                                             //
  }();                                                                                                                 //
                                                                                                                       //
  return FilesCursor;                                                                                                  //
}();                                                                                                                   //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/lib.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({                                                                                                        // 1
  fixJSONParse: function () {                                                                                          // 1
    return fixJSONParse;                                                                                               // 1
  },                                                                                                                   // 1
  fixJSONStringify: function () {                                                                                      // 1
    return fixJSONStringify;                                                                                           // 1
  },                                                                                                                   // 1
  formatFleURL: function () {                                                                                          // 1
    return formatFleURL;                                                                                               // 1
  }                                                                                                                    // 1
});                                                                                                                    // 1
                                                                                                                       //
var _ = void 0;                                                                                                        // 1
                                                                                                                       //
module.watch(require("meteor/underscore"), {                                                                           // 1
  _: function (v) {                                                                                                    // 1
    _ = v;                                                                                                             // 1
  }                                                                                                                    // 1
}, 0);                                                                                                                 // 1
var check = void 0;                                                                                                    // 1
module.watch(require("meteor/check"), {                                                                                // 1
  check: function (v) {                                                                                                // 1
    check = v;                                                                                                         // 1
  }                                                                                                                    // 1
}, 1);                                                                                                                 // 1
                                                                                                                       //
/*                                                                                                                     // 4
 * @const {Function} fixJSONParse - Fix issue with Date parse                                                          //
 */var fixJSONParse = function (obj) {                                                                                 //
  for (var key in meteorBabelHelpers.sanitizeForInObject(obj)) {                                                       // 8
    if (_.isString(obj[key]) && !!~obj[key].indexOf('=--JSON-DATE--=')) {                                              // 9
      obj[key] = obj[key].replace('=--JSON-DATE--=', '');                                                              // 10
      obj[key] = new Date(parseInt(obj[key]));                                                                         // 11
    } else if (_.isObject(obj[key])) {                                                                                 // 12
      obj[key] = fixJSONParse(obj[key]);                                                                               // 13
    } else if (_.isArray(obj[key])) {                                                                                  // 14
      var v = void 0;                                                                                                  // 15
                                                                                                                       //
      for (var i = 0; i < obj[key].length; i++) {                                                                      // 16
        v = obj[key][i];                                                                                               // 17
                                                                                                                       //
        if (_.isObject(v)) {                                                                                           // 18
          obj[key][i] = fixJSONParse(v);                                                                               // 19
        } else if (_.isString(v) && !!~v.indexOf('=--JSON-DATE--=')) {                                                 // 20
          v = v.replace('=--JSON-DATE--=', '');                                                                        // 21
          obj[key][i] = new Date(parseInt(v));                                                                         // 22
        }                                                                                                              // 23
      }                                                                                                                // 24
    }                                                                                                                  // 25
  }                                                                                                                    // 26
                                                                                                                       //
  return obj;                                                                                                          // 27
}; /*                                                                                                                  // 28
    * @const {Function} fixJSONStringify - Fix issue with Date stringify                                               //
    */                                                                                                                 //
                                                                                                                       //
var fixJSONStringify = function (obj) {                                                                                // 33
  for (var key in meteorBabelHelpers.sanitizeForInObject(obj)) {                                                       // 34
    if (_.isDate(obj[key])) {                                                                                          // 35
      obj[key] = "=--JSON-DATE--=" + +obj[key];                                                                        // 36
    } else if (_.isObject(obj[key])) {                                                                                 // 37
      obj[key] = fixJSONStringify(obj[key]);                                                                           // 38
    } else if (_.isArray(obj[key])) {                                                                                  // 39
      var v = void 0;                                                                                                  // 40
                                                                                                                       //
      for (var i = 0; i < obj[key].length; i++) {                                                                      // 41
        v = obj[key][i];                                                                                               // 42
                                                                                                                       //
        if (_.isObject(v)) {                                                                                           // 43
          obj[key][i] = fixJSONStringify(v);                                                                           // 44
        } else if (_.isDate(v)) {                                                                                      // 45
          obj[key][i] = "=--JSON-DATE--=" + +v;                                                                        // 46
        }                                                                                                              // 47
      }                                                                                                                // 48
    }                                                                                                                  // 49
  }                                                                                                                    // 50
                                                                                                                       //
  return obj;                                                                                                          // 51
}; /*                                                                                                                  // 52
    * @locus Anywhere                                                                                                  //
    * @private                                                                                                         //
    * @name formatFleURL                                                                                               //
    * @param {Object} fileRef - File reference object                                                                  //
    * @param {String} version - [Optional] Version of file you would like build URL for                                //
    * @summary Returns formatted URL for file                                                                          //
    * @returns {String} Downloadable link                                                                              //
    */                                                                                                                 //
                                                                                                                       //
var formatFleURL = function (fileRef) {                                                                                // 63
  var version = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'original';                        // 63
  var ext = void 0;                                                                                                    // 64
  check(fileRef, Object);                                                                                              // 65
  check(version, String);                                                                                              // 66
                                                                                                                       //
  var _root = __meteor_runtime_config__.ROOT_URL.replace(/\/+$/, '');                                                  // 68
                                                                                                                       //
  var vRef = fileRef.versions && fileRef.versions[version] || fileRef;                                                 // 69
                                                                                                                       //
  if (_.has(vRef, 'extension')) {                                                                                      // 71
    ext = "." + vRef.extension.replace(/^\./, '');                                                                     // 72
  } else {                                                                                                             // 73
    ext = '';                                                                                                          // 74
  }                                                                                                                    // 75
                                                                                                                       //
  if (fileRef.public === true) {                                                                                       // 77
    return _root + (version === 'original' ? fileRef._downloadRoute + "/" + fileRef._id + ext : fileRef._downloadRoute + "/" + version + "-" + fileRef._id + ext);
  }                                                                                                                    // 79
                                                                                                                       //
  return _root + (fileRef._downloadRoute + "/" + fileRef._collectionName + "/" + fileRef._id + "/" + version + "/" + fileRef._id + ext);
};                                                                                                                     // 81
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"write-stream.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/write-stream.js                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");                                                //
                                                                                                                       //
var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);                                                       //
                                                                                                                       //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                      //
                                                                                                                       //
module.export({                                                                                                        // 1
  "default": function () {                                                                                             // 1
    return WriteStream;                                                                                                // 1
  }                                                                                                                    // 1
});                                                                                                                    // 1
var fs = void 0;                                                                                                       // 1
module.watch(require("fs-extra"), {                                                                                    // 1
  "default": function (v) {                                                                                            // 1
    fs = v;                                                                                                            // 1
  }                                                                                                                    // 1
}, 0);                                                                                                                 // 1
                                                                                                                       //
var _ = void 0;                                                                                                        // 1
                                                                                                                       //
module.watch(require("meteor/underscore"), {                                                                           // 1
  _: function (v) {                                                                                                    // 1
    _ = v;                                                                                                             // 1
  }                                                                                                                    // 1
}, 1);                                                                                                                 // 1
var Meteor = void 0;                                                                                                   // 1
module.watch(require("meteor/meteor"), {                                                                               // 1
  Meteor: function (v) {                                                                                               // 1
    Meteor = v;                                                                                                        // 1
  }                                                                                                                    // 1
}, 2);                                                                                                                 // 1
                                                                                                                       //
var NOOP = function () {}; /*                                                                                          // 4
                            * @const {Object} bound   - Meteor.bindEnvironment (Fiber wrapper)                         //
                            * @const {Object} fdCache - File Descriptors Cache                                         //
                            */                                                                                         //
                                                                                                                       //
var bound = Meteor.bindEnvironment(function (callback) {                                                               // 10
  return callback();                                                                                                   // 10
});                                                                                                                    // 10
var fdCache = {}; /*                                                                                                   // 11
                   * @private                                                                                          //
                   * @locus Server                                                                                     //
                   * @class WriteStream                                                                                //
                   * @param path      {String} - Path to file on FS                                                    //
                   * @param maxLength {Number} - Max amount of chunks in stream                                        //
                   * @param file      {Object} - fileRef Object                                                        //
                   * @summary writableStream wrapper class, makes sure chunks is written in given order. Implementation of queue stream.
                   */                                                                                                  //
                                                                                                                       //
var WriteStream = function () {                                                                                        //
  function WriteStream(path, maxLength, file, permissions) {                                                           // 23
    var _this = this;                                                                                                  // 23
                                                                                                                       //
    (0, _classCallCheck3.default)(this, WriteStream);                                                                  // 23
    this.path = path;                                                                                                  // 24
    this.maxLength = maxLength;                                                                                        // 25
    this.file = file;                                                                                                  // 26
    this.permissions = permissions;                                                                                    // 27
                                                                                                                       //
    if (!this.path || !_.isString(this.path)) {                                                                        // 28
      return;                                                                                                          // 29
    }                                                                                                                  // 30
                                                                                                                       //
    this.fd = null;                                                                                                    // 32
    this.writtenChunks = 0;                                                                                            // 33
    this.ended = false;                                                                                                // 34
    this.aborted = false;                                                                                              // 35
                                                                                                                       //
    if (fdCache[this.path] && !fdCache[this.path].ended && !fdCache[this.path].aborted) {                              // 37
      this.fd = fdCache[this.path].fd;                                                                                 // 38
      this.writtenChunks = fdCache[this.path].writtenChunks;                                                           // 39
    } else {                                                                                                           // 40
      fs.ensureFile(this.path, function (efError) {                                                                    // 41
        bound(function () {                                                                                            // 42
          if (efError) {                                                                                               // 43
            throw new Meteor.Error(500, '[FilesCollection] [writeStream] [ensureFile] [Error:]', efError);             // 44
          } else {                                                                                                     // 45
            fs.open(_this.path, 'r+', _this.permissions, function (oError, fd) {                                       // 46
              bound(function () {                                                                                      // 47
                if (oError) {                                                                                          // 48
                  throw new Meteor.Error(500, '[FilesCollection] [writeStream] [ensureFile] [open] [Error:]', oError);
                } else {                                                                                               // 50
                  _this.fd = fd;                                                                                       // 51
                  fdCache[_this.path] = _this;                                                                         // 52
                }                                                                                                      // 53
              });                                                                                                      // 54
            });                                                                                                        // 55
          }                                                                                                            // 56
        });                                                                                                            // 57
      });                                                                                                              // 58
    }                                                                                                                  // 59
  } /*                                                                                                                 // 60
     * @memberOf writeStream                                                                                           //
     * @name write                                                                                                     //
     * @param {Number} num - Chunk position in a stream                                                                //
     * @param {Buffer} chunk - Buffer (chunk binary data)                                                              //
     * @param {Function} callback - Callback                                                                           //
     * @summary Write chunk in given order                                                                             //
     * @returns {Boolean} - True if chunk is sent to stream, false if chunk is set into queue                          //
     */                                                                                                                //
                                                                                                                       //
  WriteStream.prototype.write = function () {                                                                          //
    function write(num, chunk, callback) {                                                                             //
      var _this2 = this;                                                                                               // 71
                                                                                                                       //
      if (!this.aborted && !this.ended) {                                                                              // 72
        if (this.fd) {                                                                                                 // 73
          fs.write(this.fd, chunk, 0, chunk.length, (num - 1) * this.file.chunkSize, function (error, written, buffer) {
            bound(function () {                                                                                        // 75
              callback && callback(error, written, buffer);                                                            // 76
                                                                                                                       //
              if (error) {                                                                                             // 77
                console.warn('[FilesCollection] [writeStream] [write] [Error:]', error);                               // 78
                                                                                                                       //
                _this2.abort();                                                                                        // 79
              } else {                                                                                                 // 80
                ++_this2.writtenChunks;                                                                                // 81
              }                                                                                                        // 82
            });                                                                                                        // 83
          });                                                                                                          // 84
        } else {                                                                                                       // 85
          Meteor.setTimeout(function () {                                                                              // 86
            _this2.write(num, chunk, callback);                                                                        // 87
          }, 25);                                                                                                      // 88
        }                                                                                                              // 89
      }                                                                                                                // 90
                                                                                                                       //
      return false;                                                                                                    // 91
    }                                                                                                                  // 92
                                                                                                                       //
    return write;                                                                                                      //
  }(); /*                                                                                                              //
        * @memberOf writeStream                                                                                        //
        * @name end                                                                                                    //
        * @param {Function} callback - Callback                                                                        //
        * @summary Finishes writing to writableStream, only after all chunks in queue is written                       //
        * @returns {Boolean} - True if stream is fulfilled, false if queue is in progress                              //
        */                                                                                                             //
                                                                                                                       //
  WriteStream.prototype.end = function () {                                                                            //
    function end(callback) {                                                                                           //
      var _this3 = this;                                                                                               // 101
                                                                                                                       //
      if (!this.aborted && !this.ended) {                                                                              // 102
        if (this.writtenChunks === this.maxLength) {                                                                   // 103
          fs.close(this.fd, function () {                                                                              // 104
            bound(function () {                                                                                        // 105
              delete fdCache[_this3.path];                                                                             // 106
              _this3.ended = true;                                                                                     // 107
              callback && callback(void 0, true);                                                                      // 108
            });                                                                                                        // 109
          });                                                                                                          // 110
          return true;                                                                                                 // 111
        }                                                                                                              // 112
                                                                                                                       //
        fs.stat(this.path, function (error, stat) {                                                                    // 114
          bound(function () {                                                                                          // 115
            if (!error && stat) {                                                                                      // 116
              _this3.writtenChunks = Math.ceil(stat.size / _this3.file.chunkSize);                                     // 117
            }                                                                                                          // 118
                                                                                                                       //
            return Meteor.setTimeout(function () {                                                                     // 120
              _this3.end(callback);                                                                                    // 121
            }, 25);                                                                                                    // 122
          });                                                                                                          // 123
        });                                                                                                            // 124
      } else {                                                                                                         // 125
        callback && callback(void 0, this.ended);                                                                      // 126
      }                                                                                                                // 127
                                                                                                                       //
      return false;                                                                                                    // 128
    }                                                                                                                  // 129
                                                                                                                       //
    return end;                                                                                                        //
  }(); /*                                                                                                              //
        * @memberOf writeStream                                                                                        //
        * @name abort                                                                                                  //
        * @param {Function} callback - Callback                                                                        //
        * @summary Aborts writing to writableStream, removes created file                                              //
        * @returns {Boolean} - True                                                                                    //
        */                                                                                                             //
                                                                                                                       //
  WriteStream.prototype.abort = function () {                                                                          //
    function abort(callback) {                                                                                         //
      this.aborted = true;                                                                                             // 139
      delete fdCache[this.path];                                                                                       // 140
      fs.unlink(this.path, callback || NOOP);                                                                          // 141
      return true;                                                                                                     // 142
    }                                                                                                                  // 143
                                                                                                                       //
    return abort;                                                                                                      //
  }(); /*                                                                                                              //
        * @memberOf writeStream                                                                                        //
        * @name stop                                                                                                   //
        * @summary Stop writing to writableStream                                                                      //
        * @returns {Boolean} - True                                                                                    //
        */                                                                                                             //
                                                                                                                       //
  WriteStream.prototype.stop = function () {                                                                           //
    function stop() {                                                                                                  //
      this.aborted = true;                                                                                             // 152
      delete fdCache[this.path];                                                                                       // 153
      return true;                                                                                                     // 154
    }                                                                                                                  // 155
                                                                                                                       //
    return stop;                                                                                                       //
  }();                                                                                                                 //
                                                                                                                       //
  return WriteStream;                                                                                                  //
}();                                                                                                                   //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"fs-extra":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// ../../.1.9.0.5wqmtx++os+web.browser+web.cordova/npm/node_modules/fs-extra/package.json                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "fs-extra";
exports.version = "4.0.2";
exports.main = "./lib/index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/fs-extra/lib/index.js                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
'use strict'

const assign = require('./util/assign')

const fs = {}

// Export graceful-fs:
assign(fs, require('./fs'))
// Export extra methods:
assign(fs, require('./copy'))
assign(fs, require('./copy-sync'))
assign(fs, require('./mkdirs'))
assign(fs, require('./remove'))
assign(fs, require('./json'))
assign(fs, require('./move'))
assign(fs, require('./move-sync'))
assign(fs, require('./empty'))
assign(fs, require('./ensure'))
assign(fs, require('./output'))
assign(fs, require('./path-exists'))

module.exports = fs

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"eventemitter3":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// ../../.1.9.0.5wqmtx++os+web.browser+web.cordova/npm/node_modules/eventemitter3/package.json                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "eventemitter3";
exports.version = "2.0.3";
exports.main = "index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/eventemitter3/index.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
'use strict';

var has = Object.prototype.hasOwnProperty
  , prefix = '~';

/**
 * Constructor to create a storage for our `EE` objects.
 * An `Events` instance is a plain object whose properties are event names.
 *
 * @constructor
 * @api private
 */
function Events() {}

//
// We try to not inherit from `Object.prototype`. In some engines creating an
// instance in this way is faster than calling `Object.create(null)` directly.
// If `Object.create(null)` is not supported we prefix the event names with a
// character to make sure that the built-in object properties are not
// overridden or used as an attack vector.
//
if (Object.create) {
  Events.prototype = Object.create(null);

  //
  // This hack is needed because the `__proto__` property is still inherited in
  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
  //
  if (!new Events().__proto__) prefix = false;
}

/**
 * Representation of a single event listener.
 *
 * @param {Function} fn The listener function.
 * @param {Mixed} context The context to invoke the listener with.
 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
 * @constructor
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal `EventEmitter` interface that is molded against the Node.js
 * `EventEmitter` interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() {
  this._events = new Events();
  this._eventsCount = 0;
}

/**
 * Return an array listing the events for which the emitter has registered
 * listeners.
 *
 * @returns {Array}
 * @api public
 */
EventEmitter.prototype.eventNames = function eventNames() {
  var names = []
    , events
    , name;

  if (this._eventsCount === 0) return names;

  for (name in (events = this._events)) {
    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
  }

  if (Object.getOwnPropertySymbols) {
    return names.concat(Object.getOwnPropertySymbols(events));
  }

  return names;
};

/**
 * Return the listeners registered for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Boolean} exists Only check if there are listeners.
 * @returns {Array|Boolean}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event, exists) {
  var evt = prefix ? prefix + event : event
    , available = this._events[evt];

  if (exists) return !!available;
  if (!available) return [];
  if (available.fn) return [available.fn];

  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
    ee[i] = available[i].fn;
  }

  return ee;
};

/**
 * Calls each of the listeners registered for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @returns {Boolean} `true` if the event had listeners, else `false`.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if (listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Add a listener for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Function} fn The listener function.
 * @param {Mixed} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this)
    , evt = prefix ? prefix + event : event;

  if (!this._events[evt]) this._events[evt] = listener, this._eventsCount++;
  else if (!this._events[evt].fn) this._events[evt].push(listener);
  else this._events[evt] = [this._events[evt], listener];

  return this;
};

/**
 * Add a one-time listener for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Function} fn The listener function.
 * @param {Mixed} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true)
    , evt = prefix ? prefix + event : event;

  if (!this._events[evt]) this._events[evt] = listener, this._eventsCount++;
  else if (!this._events[evt].fn) this._events[evt].push(listener);
  else this._events[evt] = [this._events[evt], listener];

  return this;
};

/**
 * Remove the listeners of a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Function} fn Only remove the listeners that match this function.
 * @param {Mixed} context Only remove the listeners that have this context.
 * @param {Boolean} once Only remove one-time listeners.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return this;
  if (!fn) {
    if (--this._eventsCount === 0) this._events = new Events();
    else delete this._events[evt];
    return this;
  }

  var listeners = this._events[evt];

  if (listeners.fn) {
    if (
         listeners.fn === fn
      && (!once || listeners.once)
      && (!context || listeners.context === context)
    ) {
      if (--this._eventsCount === 0) this._events = new Events();
      else delete this._events[evt];
    }
  } else {
    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
      if (
           listeners[i].fn !== fn
        || (once && !listeners[i].once)
        || (context && listeners[i].context !== context)
      ) {
        events.push(listeners[i]);
      }
    }

    //
    // Reset the array, or remove it completely if we have no more listeners.
    //
    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
    else if (--this._eventsCount === 0) this._events = new Events();
    else delete this._events[evt];
  }

  return this;
};

/**
 * Remove all listeners, or those of the specified event.
 *
 * @param {String|Symbol} [event] The event name.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  var evt;

  if (event) {
    evt = prefix ? prefix + event : event;
    if (this._events[evt]) {
      if (--this._eventsCount === 0) this._events = new Events();
      else delete this._events[evt];
    }
  } else {
    this._events = new Events();
    this._eventsCount = 0;
  }

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Allow `EventEmitter` to be imported as module namespace.
//
EventEmitter.EventEmitter = EventEmitter;

//
// Expose the module.
//
if ('undefined' !== typeof module) {
  module.exports = EventEmitter;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"request":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// ../../.1.9.0.5wqmtx++os+web.browser+web.cordova/npm/node_modules/request/package.json                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "request";
exports.version = "2.83.0";
exports.main = "index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/request/index.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// Copyright 2010-2012 Mikeal Rogers
//
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.

'use strict'

var extend = require('extend')
var cookies = require('./lib/cookies')
var helpers = require('./lib/helpers')

var paramsHaveRequestBody = helpers.paramsHaveRequestBody

// organize params for patch, post, put, head, del
function initParams (uri, options, callback) {
  if (typeof options === 'function') {
    callback = options
  }

  var params = {}
  if (typeof options === 'object') {
    extend(params, options, {uri: uri})
  } else if (typeof uri === 'string') {
    extend(params, {uri: uri})
  } else {
    extend(params, uri)
  }

  params.callback = callback || params.callback
  return params
}

function request (uri, options, callback) {
  if (typeof uri === 'undefined') {
    throw new Error('undefined is not a valid uri or options object.')
  }

  var params = initParams(uri, options, callback)

  if (params.method === 'HEAD' && paramsHaveRequestBody(params)) {
    throw new Error('HTTP HEAD requests MUST NOT include a request body.')
  }

  return new request.Request(params)
}

function verbFunc (verb) {
  var method = verb.toUpperCase()
  return function (uri, options, callback) {
    var params = initParams(uri, options, callback)
    params.method = method
    return request(params, params.callback)
  }
}

// define like this to please codeintel/intellisense IDEs
request.get = verbFunc('get')
request.head = verbFunc('head')
request.options = verbFunc('options')
request.post = verbFunc('post')
request.put = verbFunc('put')
request.patch = verbFunc('patch')
request.del = verbFunc('delete')
request['delete'] = verbFunc('delete')

request.jar = function (store) {
  return cookies.jar(store)
}

request.cookie = function (str) {
  return cookies.parse(str)
}

function wrapRequestMethod (method, options, requester, verb) {
  return function (uri, opts, callback) {
    var params = initParams(uri, opts, callback)

    var target = {}
    extend(true, target, options, params)

    target.pool = params.pool || options.pool

    if (verb) {
      target.method = verb.toUpperCase()
    }

    if (typeof requester === 'function') {
      method = requester
    }

    return method(target, target.callback)
  }
}

request.defaults = function (options, requester) {
  var self = this

  options = options || {}

  if (typeof options === 'function') {
    requester = options
    options = {}
  }

  var defaults = wrapRequestMethod(self, options, requester)

  var verbs = ['get', 'head', 'post', 'put', 'patch', 'del', 'delete']
  verbs.forEach(function (verb) {
    defaults[verb] = wrapRequestMethod(self[verb], options, requester, verb)
  })

  defaults.cookie = wrapRequestMethod(self.cookie, options, requester)
  defaults.jar = self.jar
  defaults.defaults = self.defaults
  return defaults
}

request.forever = function (agentOptions, optionsArg) {
  var options = {}
  if (optionsArg) {
    extend(options, optionsArg)
  }
  if (agentOptions) {
    options.agentOptions = agentOptions
  }

  options.forever = true
  return request.defaults(options)
}

// Exports

module.exports = request
request.Request = require('./request')
request.initParams = initParams

// Backwards compatibility for request.debug
Object.defineProperty(request, 'debug', {
  enumerable: true,
  get: function () {
    return request.Request.debug
  },
  set: function (debug) {
    request.Request.debug = debug
  }
})

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"file-type":{"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/file-type/index.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
'use strict';
const toBytes = s => Array.from(s).map(c => c.charCodeAt(0));
const xpiZipFilename = toBytes('META-INF/mozilla.rsa');
const oxmlContentTypes = toBytes('[Content_Types].xml');
const oxmlRels = toBytes('_rels/.rels');

module.exports = input => {
	const buf = (input instanceof Uint8Array) ? input : new Uint8Array(input);

	if (!(buf && buf.length > 1)) {
		return null;
	}

	const check = (header, opts) => {
		opts = Object.assign({
			offset: 0
		}, opts);

		for (let i = 0; i < header.length; i++) {
			// If a bitmask is set
			if (opts.mask) {
				// If header doesn't equal `buf` with bits masked off
				if (header[i] !== (opts.mask[i] & buf[i + opts.offset])) {
					return false;
				}
			} else if (header[i] !== buf[i + opts.offset]) {
				return false;
			}
		}

		return true;
	};

	if (check([0xFF, 0xD8, 0xFF])) {
		return {
			ext: 'jpg',
			mime: 'image/jpeg'
		};
	}

	if (check([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
		return {
			ext: 'png',
			mime: 'image/png'
		};
	}

	if (check([0x47, 0x49, 0x46])) {
		return {
			ext: 'gif',
			mime: 'image/gif'
		};
	}

	if (check([0x57, 0x45, 0x42, 0x50], {offset: 8})) {
		return {
			ext: 'webp',
			mime: 'image/webp'
		};
	}

	if (check([0x46, 0x4C, 0x49, 0x46])) {
		return {
			ext: 'flif',
			mime: 'image/flif'
		};
	}

	// Needs to be before `tif` check
	if (
		(check([0x49, 0x49, 0x2A, 0x0]) || check([0x4D, 0x4D, 0x0, 0x2A])) &&
		check([0x43, 0x52], {offset: 8})
	) {
		return {
			ext: 'cr2',
			mime: 'image/x-canon-cr2'
		};
	}

	if (
		check([0x49, 0x49, 0x2A, 0x0]) ||
		check([0x4D, 0x4D, 0x0, 0x2A])
	) {
		return {
			ext: 'tif',
			mime: 'image/tiff'
		};
	}

	if (check([0x42, 0x4D])) {
		return {
			ext: 'bmp',
			mime: 'image/bmp'
		};
	}

	if (check([0x49, 0x49, 0xBC])) {
		return {
			ext: 'jxr',
			mime: 'image/vnd.ms-photo'
		};
	}

	if (check([0x38, 0x42, 0x50, 0x53])) {
		return {
			ext: 'psd',
			mime: 'image/vnd.adobe.photoshop'
		};
	}

	// Zip-based file formats
	// Need to be before the `zip` check
	if (check([0x50, 0x4B, 0x3, 0x4])) {
		if (
			check([0x6D, 0x69, 0x6D, 0x65, 0x74, 0x79, 0x70, 0x65, 0x61, 0x70, 0x70, 0x6C, 0x69, 0x63, 0x61, 0x74, 0x69, 0x6F, 0x6E, 0x2F, 0x65, 0x70, 0x75, 0x62, 0x2B, 0x7A, 0x69, 0x70], {offset: 30})
		) {
			return {
				ext: 'epub',
				mime: 'application/epub+zip'
			};
		}

		// Assumes signed `.xpi` from addons.mozilla.org
		if (check(xpiZipFilename, {offset: 30})) {
			return {
				ext: 'xpi',
				mime: 'application/x-xpinstall'
			};
		}

		// https://github.com/file/file/blob/master/magic/Magdir/msooxml
		if (check(oxmlContentTypes, {offset: 30}) || check(oxmlRels, {offset: 30})) {
			const sliced = buf.subarray(4, 4 + 2000);
			const nextZipHeaderIndex = arr => arr.findIndex((el, i, arr) => arr[i] === 0x50 && arr[i + 1] === 0x4B && arr[i + 2] === 0x3 && arr[i + 3] === 0x4);
			const header2Pos = nextZipHeaderIndex(sliced);

			if (header2Pos !== -1) {
				const slicedAgain = buf.subarray(header2Pos + 8, header2Pos + 8 + 1000);
				const header3Pos = nextZipHeaderIndex(slicedAgain);

				if (header3Pos !== -1) {
					const offset = 8 + header2Pos + header3Pos + 30;

					if (check(toBytes('word/'), {offset})) {
						return {
							ext: 'docx',
							mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
						};
					}

					if (check(toBytes('ppt/'), {offset})) {
						return {
							ext: 'pptx',
							mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
						};
					}

					if (check(toBytes('xl/'), {offset})) {
						return {
							ext: 'xlsx',
							mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
						};
					}
				}
			}
		}
	}

	if (
		check([0x50, 0x4B]) &&
		(buf[2] === 0x3 || buf[2] === 0x5 || buf[2] === 0x7) &&
		(buf[3] === 0x4 || buf[3] === 0x6 || buf[3] === 0x8)
	) {
		return {
			ext: 'zip',
			mime: 'application/zip'
		};
	}

	if (check([0x75, 0x73, 0x74, 0x61, 0x72], {offset: 257})) {
		return {
			ext: 'tar',
			mime: 'application/x-tar'
		};
	}

	if (
		check([0x52, 0x61, 0x72, 0x21, 0x1A, 0x7]) &&
		(buf[6] === 0x0 || buf[6] === 0x1)
	) {
		return {
			ext: 'rar',
			mime: 'application/x-rar-compressed'
		};
	}

	if (check([0x1F, 0x8B, 0x8])) {
		return {
			ext: 'gz',
			mime: 'application/gzip'
		};
	}

	if (check([0x42, 0x5A, 0x68])) {
		return {
			ext: 'bz2',
			mime: 'application/x-bzip2'
		};
	}

	if (check([0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C])) {
		return {
			ext: '7z',
			mime: 'application/x-7z-compressed'
		};
	}

	if (check([0x78, 0x01])) {
		return {
			ext: 'dmg',
			mime: 'application/x-apple-diskimage'
		};
	}

	if (check([0x33, 0x67, 0x70, 0x35]) || // 3gp5
		(
			check([0x0, 0x0, 0x0]) && check([0x66, 0x74, 0x79, 0x70], {offset: 4}) &&
				(
					check([0x6D, 0x70, 0x34, 0x31], {offset: 8}) || // MP41
					check([0x6D, 0x70, 0x34, 0x32], {offset: 8}) || // MP42
					check([0x69, 0x73, 0x6F, 0x6D], {offset: 8}) || // ISOM
					check([0x69, 0x73, 0x6F, 0x32], {offset: 8}) || // ISO2
					check([0x6D, 0x6D, 0x70, 0x34], {offset: 8}) || // MMP4
					check([0x4D, 0x34, 0x56], {offset: 8}) || // M4V
					check([0x64, 0x61, 0x73, 0x68], {offset: 8}) // DASH
				)
		)) {
		return {
			ext: 'mp4',
			mime: 'video/mp4'
		};
	}

	if (check([0x4D, 0x54, 0x68, 0x64])) {
		return {
			ext: 'mid',
			mime: 'audio/midi'
		};
	}

	// https://github.com/threatstack/libmagic/blob/master/magic/Magdir/matroska
	if (check([0x1A, 0x45, 0xDF, 0xA3])) {
		const sliced = buf.subarray(4, 4 + 4096);
		const idPos = sliced.findIndex((el, i, arr) => arr[i] === 0x42 && arr[i + 1] === 0x82);

		if (idPos !== -1) {
			const docTypePos = idPos + 3;
			const findDocType = type => Array.from(type).every((c, i) => sliced[docTypePos + i] === c.charCodeAt(0));

			if (findDocType('matroska')) {
				return {
					ext: 'mkv',
					mime: 'video/x-matroska'
				};
			}

			if (findDocType('webm')) {
				return {
					ext: 'webm',
					mime: 'video/webm'
				};
			}
		}
	}

	if (check([0x0, 0x0, 0x0, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20]) ||
		check([0x66, 0x72, 0x65, 0x65], {offset: 4}) ||
		check([0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20], {offset: 4}) ||
		check([0x6D, 0x64, 0x61, 0x74], {offset: 4}) || // MJPEG
		check([0x77, 0x69, 0x64, 0x65], {offset: 4})) {
		return {
			ext: 'mov',
			mime: 'video/quicktime'
		};
	}

	if (
		check([0x52, 0x49, 0x46, 0x46]) &&
		check([0x41, 0x56, 0x49], {offset: 8})
	) {
		return {
			ext: 'avi',
			mime: 'video/x-msvideo'
		};
	}

	if (check([0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11, 0xA6, 0xD9])) {
		return {
			ext: 'wmv',
			mime: 'video/x-ms-wmv'
		};
	}

	if (check([0x0, 0x0, 0x1, 0xBA])) {
		return {
			ext: 'mpg',
			mime: 'video/mpeg'
		};
	}

	if (check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x33, 0x67, 0x70, 0x34])) {
		return {
			ext: '3gp',
			mime: 'video/3gpp'
		};
	}

	// Check for MP3 header at different starting offsets
	for (let start = 0; start < 2 && start < (buf.length - 16); start++) {
		if (
			check([0x49, 0x44, 0x33], {offset: start}) || // ID3 header
			check([0xFF, 0xE2], {offset: start, mask: [0xFF, 0xE2]}) // MPEG 1 or 2 Layer 3 header
		) {
			return {
				ext: 'mp3',
				mime: 'audio/mpeg'
			};
		}
	}

	if (
		check([0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x41], {offset: 4}) ||
		check([0x4D, 0x34, 0x41, 0x20])
	) {
		return {
			ext: 'm4a',
			mime: 'audio/m4a'
		};
	}

	// Needs to be before `ogg` check
	if (check([0x4F, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64], {offset: 28})) {
		return {
			ext: 'opus',
			mime: 'audio/opus'
		};
	}

	// If 'OggS' in first  bytes, then OGG container
	if (check([0x4F, 0x67, 0x67, 0x53])) {
		// This is a OGG container

		// If ' theora' in header.
		if (check([0x80, 0x74, 0x68, 0x65, 0x6F, 0x72, 0x61], {offset: 28})) {
			return {
				ext: 'ogv',
				mime: 'video/ogg'
			};
		}
		// If '\x01video' in header.
		if (check([0x01, 0x76, 0x69, 0x64, 0x65, 0x6F, 0x00], {offset: 28})) {
			return {
				ext: 'ogm',
				mime: 'video/ogg'
			};
		}
		// If ' FLAC' in header  https://xiph.org/flac/faq.html
		if (check([0x7F, 0x46, 0x4C, 0x41, 0x43], {offset: 28})) {
			return {
				ext: 'oga',
				mime: 'audio/ogg'
			};
		}

		// 'Speex  ' in header https://en.wikipedia.org/wiki/Speex
		if (check([0x53, 0x70, 0x65, 0x65, 0x78, 0x20, 0x20], {offset: 28})) {
			return {
				ext: 'spx',
				mime: 'audio/ogg'
			};
		}

		// If '\x01vorbis' in header
		if (check([0x01, 0x76, 0x6F, 0x72, 0x62, 0x69, 0x73], {offset: 28})) {
			return {
				ext: 'ogg',
				mime: 'audio/ogg'
			};
		}

		// Default OGG container https://www.iana.org/assignments/media-types/application/ogg
		return {
			ext: 'ogx',
			mime: 'application/ogg'
		};
	}

	if (check([0x66, 0x4C, 0x61, 0x43])) {
		return {
			ext: 'flac',
			mime: 'audio/x-flac'
		};
	}

	if (
		check([0x52, 0x49, 0x46, 0x46]) &&
		check([0x57, 0x41, 0x56, 0x45], {offset: 8})
	) {
		return {
			ext: 'wav',
			mime: 'audio/x-wav'
		};
	}

	if (check([0x23, 0x21, 0x41, 0x4D, 0x52, 0x0A])) {
		return {
			ext: 'amr',
			mime: 'audio/amr'
		};
	}

	if (check([0x25, 0x50, 0x44, 0x46])) {
		return {
			ext: 'pdf',
			mime: 'application/pdf'
		};
	}

	if (check([0x4D, 0x5A])) {
		return {
			ext: 'exe',
			mime: 'application/x-msdownload'
		};
	}

	if (
		(buf[0] === 0x43 || buf[0] === 0x46) &&
		check([0x57, 0x53], {offset: 1})
	) {
		return {
			ext: 'swf',
			mime: 'application/x-shockwave-flash'
		};
	}

	if (check([0x7B, 0x5C, 0x72, 0x74, 0x66])) {
		return {
			ext: 'rtf',
			mime: 'application/rtf'
		};
	}

	if (check([0x00, 0x61, 0x73, 0x6D])) {
		return {
			ext: 'wasm',
			mime: 'application/wasm'
		};
	}

	if (
		check([0x77, 0x4F, 0x46, 0x46]) &&
		(
			check([0x00, 0x01, 0x00, 0x00], {offset: 4}) ||
			check([0x4F, 0x54, 0x54, 0x4F], {offset: 4})
		)
	) {
		return {
			ext: 'woff',
			mime: 'font/woff'
		};
	}

	if (
		check([0x77, 0x4F, 0x46, 0x32]) &&
		(
			check([0x00, 0x01, 0x00, 0x00], {offset: 4}) ||
			check([0x4F, 0x54, 0x54, 0x4F], {offset: 4})
		)
	) {
		return {
			ext: 'woff2',
			mime: 'font/woff2'
		};
	}

	if (
		check([0x4C, 0x50], {offset: 34}) &&
		(
			check([0x00, 0x00, 0x01], {offset: 8}) ||
			check([0x01, 0x00, 0x02], {offset: 8}) ||
			check([0x02, 0x00, 0x02], {offset: 8})
		)
	) {
		return {
			ext: 'eot',
			mime: 'application/octet-stream'
		};
	}

	if (check([0x00, 0x01, 0x00, 0x00, 0x00])) {
		return {
			ext: 'ttf',
			mime: 'font/ttf'
		};
	}

	if (check([0x4F, 0x54, 0x54, 0x4F, 0x00])) {
		return {
			ext: 'otf',
			mime: 'font/otf'
		};
	}

	if (check([0x00, 0x00, 0x01, 0x00])) {
		return {
			ext: 'ico',
			mime: 'image/x-icon'
		};
	}

	if (check([0x46, 0x4C, 0x56, 0x01])) {
		return {
			ext: 'flv',
			mime: 'video/x-flv'
		};
	}

	if (check([0x25, 0x21])) {
		return {
			ext: 'ps',
			mime: 'application/postscript'
		};
	}

	if (check([0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00])) {
		return {
			ext: 'xz',
			mime: 'application/x-xz'
		};
	}

	if (check([0x53, 0x51, 0x4C, 0x69])) {
		return {
			ext: 'sqlite',
			mime: 'application/x-sqlite3'
		};
	}

	if (check([0x4E, 0x45, 0x53, 0x1A])) {
		return {
			ext: 'nes',
			mime: 'application/x-nintendo-nes-rom'
		};
	}

	if (check([0x43, 0x72, 0x32, 0x34])) {
		return {
			ext: 'crx',
			mime: 'application/x-google-chrome-extension'
		};
	}

	if (
		check([0x4D, 0x53, 0x43, 0x46]) ||
		check([0x49, 0x53, 0x63, 0x28])
	) {
		return {
			ext: 'cab',
			mime: 'application/vnd.ms-cab-compressed'
		};
	}

	// Needs to be before `ar` check
	if (check([0x21, 0x3C, 0x61, 0x72, 0x63, 0x68, 0x3E, 0x0A, 0x64, 0x65, 0x62, 0x69, 0x61, 0x6E, 0x2D, 0x62, 0x69, 0x6E, 0x61, 0x72, 0x79])) {
		return {
			ext: 'deb',
			mime: 'application/x-deb'
		};
	}

	if (check([0x21, 0x3C, 0x61, 0x72, 0x63, 0x68, 0x3E])) {
		return {
			ext: 'ar',
			mime: 'application/x-unix-archive'
		};
	}

	if (check([0xED, 0xAB, 0xEE, 0xDB])) {
		return {
			ext: 'rpm',
			mime: 'application/x-rpm'
		};
	}

	if (
		check([0x1F, 0xA0]) ||
		check([0x1F, 0x9D])
	) {
		return {
			ext: 'Z',
			mime: 'application/x-compress'
		};
	}

	if (check([0x4C, 0x5A, 0x49, 0x50])) {
		return {
			ext: 'lz',
			mime: 'application/x-lzip'
		};
	}

	if (check([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])) {
		return {
			ext: 'msi',
			mime: 'application/x-msi'
		};
	}

	if (check([0x06, 0x0E, 0x2B, 0x34, 0x02, 0x05, 0x01, 0x01, 0x0D, 0x01, 0x02, 0x01, 0x01, 0x02])) {
		return {
			ext: 'mxf',
			mime: 'application/mxf'
		};
	}

	if (check([0x47], {offset: 4}) && (check([0x47], {offset: 192}) || check([0x47], {offset: 196}))) {
		return {
			ext: 'mts',
			mime: 'video/mp2t'
		};
	}

	if (check([0x42, 0x4C, 0x45, 0x4E, 0x44, 0x45, 0x52])) {
		return {
			ext: 'blend',
			mime: 'application/x-blender'
		};
	}

	if (check([0x42, 0x50, 0x47, 0xFB])) {
		return {
			ext: 'bpg',
			mime: 'image/bpg'
		};
	}

	if (check([0x00, 0x00, 0x00, 0x0C, 0x6A, 0x50, 0x20, 0x20, 0x0D, 0x0A, 0x87, 0x0A])) {
		// JPEG-2000 family

		if (check([0x6A, 0x70, 0x32, 0x20], {offset: 20})) {
			return {
				ext: 'jp2',
				mime: 'image/jp2'
			};
		}

		if (check([0x6A, 0x70, 0x78, 0x20], {offset: 20})) {
			return {
				ext: 'jpx',
				mime: 'image/jpx'
			};
		}

		if (check([0x6A, 0x70, 0x6D, 0x20], {offset: 20})) {
			return {
				ext: 'jpm',
				mime: 'image/jpm'
			};
		}

		if (check([0x6D, 0x6A, 0x70, 0x32], {offset: 20})) {
			return {
				ext: 'mj2',
				mime: 'image/mj2'
			};
		}
	}

	return null;
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("./node_modules/meteor/ostrio:files/server.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['ostrio:files'] = exports, {
  FilesCollection: FilesCollection
});

})();

//# sourceMappingURL=ostrio_files.js.map
