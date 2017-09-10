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
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var meteorInstall = Package.modules.meteorInstall;
var Symbol = Package['ecmascript-runtime-server'].Symbol;
var Map = Package['ecmascript-runtime-server'].Map;
var Set = Package['ecmascript-runtime-server'].Set;

/* Package-scope variables */
var __coffeescriptShare, FilesCollection;

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:files":{"server.coffee.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/server.coffee.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
module.export({                                                                                                        // 1
  FilesCollection: function () {                                                                                       // 1
    return FilesCollection;                                                                                            // 1
  }                                                                                                                    // 1
});                                                                                                                    // 1
var Cookies = void 0;                                                                                                  // 1
module.watch(require("meteor/ostrio:cookies"), {                                                                       // 1
  Cookies: function (v) {                                                                                              // 1
    Cookies = v;                                                                                                       // 1
  }                                                                                                                    // 1
}, 0);                                                                                                                 // 1
var writeStream = void 0;                                                                                              // 1
module.watch(require("./write-stream.coffee"), {                                                                       // 1
  writeStream: function (v) {                                                                                          // 1
    writeStream = v;                                                                                                   // 1
  }                                                                                                                    // 1
}, 1);                                                                                                                 // 1
var FilesCollectionCore = void 0;                                                                                      // 1
module.watch(require("./core.coffee"), {                                                                               // 1
  FilesCollectionCore: function (v) {                                                                                  // 1
    FilesCollectionCore = v;                                                                                           // 1
  }                                                                                                                    // 1
}, 2);                                                                                                                 // 1
var fixJSONParse = void 0,                                                                                             // 1
    fixJSONStringify = void 0,                                                                                         // 1
    formatFleURL = void 0;                                                                                             // 1
module.watch(require("./lib.coffee"), {                                                                                // 1
  fixJSONParse: function (v) {                                                                                         // 1
    fixJSONParse = v;                                                                                                  // 1
  },                                                                                                                   // 1
  fixJSONStringify: function (v) {                                                                                     // 1
    fixJSONStringify = v;                                                                                              // 1
  },                                                                                                                   // 1
  formatFleURL: function (v) {                                                                                         // 1
    formatFleURL = v;                                                                                                  // 1
  }                                                                                                                    // 1
}, 3);                                                                                                                 // 1
var fs = void 0;                                                                                                       // 1
module.watch(require("fs-extra"), {                                                                                    // 1
  "default": function (v) {                                                                                            // 1
    fs = v;                                                                                                            // 1
  }                                                                                                                    // 1
}, 4);                                                                                                                 // 1
var nodeQs = void 0;                                                                                                   // 1
module.watch(require("querystring"), {                                                                                 // 1
  "default": function (v) {                                                                                            // 1
    nodeQs = v;                                                                                                        // 1
  }                                                                                                                    // 1
}, 5);                                                                                                                 // 1
var events = void 0;                                                                                                   // 1
module.watch(require("events"), {                                                                                      // 1
  "default": function (v) {                                                                                            // 1
    events = v;                                                                                                        // 1
  }                                                                                                                    // 1
}, 6);                                                                                                                 // 1
var request = void 0;                                                                                                  // 1
module.watch(require("request"), {                                                                                     // 1
  "default": function (v) {                                                                                            // 1
    request = v;                                                                                                       // 1
  }                                                                                                                    // 1
}, 7);                                                                                                                 // 1
var Throttle = void 0;                                                                                                 // 1
module.watch(require("throttle"), {                                                                                    // 1
  "default": function (v) {                                                                                            // 1
    Throttle = v;                                                                                                      // 1
  }                                                                                                                    // 1
}, 8);                                                                                                                 // 1
var fileType = void 0;                                                                                                 // 1
module.watch(require("file-type"), {                                                                                   // 1
  "default": function (v) {                                                                                            // 1
    fileType = v;                                                                                                      // 1
  }                                                                                                                    // 1
}, 9);                                                                                                                 // 1
var nodePath = void 0;                                                                                                 // 1
module.watch(require("path"), {                                                                                        // 1
  "default": function (v) {                                                                                            // 1
    nodePath = v;                                                                                                      // 1
  }                                                                                                                    // 1
}, 10);                                                                                                                // 1
/*                                                                                                                     // 17
@var {Object} bound - Meteor.bindEnvironment (Fiber wrapper)                                                           //
 */var NOOP, bound;                                                                                                    //
bound = Meteor.bindEnvironment(function (callback) {                                                                   // 20
  return callback();                                                                                                   // 20
});                                                                                                                    // 20
                                                                                                                       //
NOOP = function () {}; /*                                                                                              // 21
                       @locus Anywhere                                                                                 //
                       @class FilesCollection                                                                          //
                       @param config           {Object}   - [Both]   Configuration object with next properties:        //
                       @param config.debug     {Boolean}  - [Both]   Turn on/of debugging and extra logging            //
                       @param config.schema    {Object}   - [Both]   Collection Schema                                 //
                       @param config.public    {Boolean}  - [Both]   Store files in folder accessible for proxy servers, for limits, and more - read docs
                       @param config.strict    {Boolean}  - [Server] Strict mode for partial content, if is `true` server will return `416` response code, when `range` is not specified, otherwise server return `206`
                       @param config.protected {Function} - [Both]   If `true` - files will be served only to authorized users, if `function()` - you're able to check visitor's permissions in your own way function's context has:
                         - `request` - On server only                                                                  //
                         - `response` - On server only                                                                 //
                         - `user()`                                                                                    //
                         - `userId`                                                                                    //
                       @param config.chunkSize      {Number}  - [Both] Upload chunk size, default: 524288 bytes (0,5 Mb)
                       @param config.permissions    {Number}  - [Server] Permissions which will be set to uploaded files (octal), like: `511` or `0o755`. Default: 0644
                       @param config.parentDirPermissions {Number}  - [Server] Permissions which will be set to parent directory of uploaded files (octal), like: `611` or `0o777`. Default: 0755
                       @param config.storagePath    {String|Function}  - [Server] Storage path on file system          //
                       @param config.cacheControl   {String}  - [Server] Default `Cache-Control` header                //
                       @param config.responseHeaders {Object|Function} - [Server] Custom response headers, if function is passed, must return Object
                       @param config.throttle       {Number}  - [Server] bps throttle threshold                        //
                       @param config.downloadRoute  {String}  - [Both]   Server Route used to retrieve files           //
                       @param config.collection     {Mongo.Collection} - [Both] Mongo Collection Instance              //
                       @param config.collectionName {String}  - [Both]   Collection name                               //
                       @param config.namingFunction {Function}- [Both]   Function which returns `String`               //
                       @param config.integrityCheck {Boolean} - [Server] Check file's integrity before serving to users
                       @param config.onAfterUpload  {Function}- [Server] Called right after file is ready on FS. Use to transfer file somewhere else, or do other thing with file directly
                       @param config.onAfterRemove  {Function} - [Server] Called right after file is removed. Removed objects is passed to callback
                       @param config.continueUploadTTL {Number} - [Server] Time in seconds, during upload may be continued, default 3 hours (10800 seconds)
                       @param config.onBeforeUpload {Function}- [Both]   Function which executes on server after receiving each chunk and on client right before beginning upload. Function context is `File` - so you are able to check for extension, mime-type, size and etc.
                       return `true` to continue                                                                       //
                       return `false` or `String` to abort upload                                                      //
                       @param config.onInitiateUpload {Function} - [Server] Function which executes on server right before upload is begin and right after `onBeforeUpload` hook. This hook is fully asynchronous.
                       @param config.onBeforeRemove {Function} - [Server] Executes before removing file on server, so you can check permissions. Return `true` to allow action and `false` to deny.
                       @param config.allowClientCode  {Boolean}  - [Both]   Allow to run `remove` from client          //
                       @param config.downloadCallback {Function} - [Server] Callback triggered each time file is requested, return truthy value to continue download, or falsy to abort
                       @param config.interceptDownload {Function} - [Server] Intercept download request, so you can serve file from third-party resource, arguments {http: {request: {...}, response: {...}}, fileRef: {...}}
                       @summary Create new instance of FilesCollection                                                 //
                        */                                                                                             //
                                                                                                                       //
module.runSetters(FilesCollection = function () {                                                                      // 61
  FilesCollection.prototype.__proto__ = function () {                                                                  // 69
    return _.extend(events.EventEmitter.prototype, FilesCollectionCore.prototype);                                     // 70
  }();                                                                                                                 // 62
                                                                                                                       //
  function FilesCollection(config) {                                                                                   // 63
    var _iwcz, _methods, _preCollectionCursor, cookie, self, storagePath;                                              // 64
                                                                                                                       //
    events.EventEmitter.call(this);                                                                                    // 64
                                                                                                                       //
    if (config) {                                                                                                      // 65
      storagePath = config.storagePath, this.ddp = config.ddp, this.collection = config.collection, this.collectionName = config.collectionName, this.downloadRoute = config.downloadRoute, this.schema = config.schema, this.chunkSize = config.chunkSize, this.namingFunction = config.namingFunction, this.debug = config.debug, this.onbeforeunloadMessage = config.onbeforeunloadMessage, this.permissions = config.permissions, this.parentDirPermissions = config.parentDirPermissions, this.allowClientCode = config.allowClientCode, this.onBeforeUpload = config.onBeforeUpload, this.onInitiateUpload = config.onInitiateUpload, this.integrityCheck = config.integrityCheck, this["protected"] = config["protected"], this["public"] = config["public"], this.strict = config.strict, this.downloadCallback = config.downloadCallback, this.cacheControl = config.cacheControl, this.responseHeaders = config.responseHeaders, this.throttle = config.throttle, this.onAfterUpload = config.onAfterUpload, this.onAfterRemove = config.onAfterRemove, this.interceptDownload = config.interceptDownload, this.onBeforeRemove = config.onBeforeRemove, this.continueUploadTTL = config.continueUploadTTL;
    }                                                                                                                  // 78
                                                                                                                       //
    self = this;                                                                                                       // 67
    cookie = new Cookies();                                                                                            // 68
                                                                                                                       //
    if (this.debug == null) {                                                                                          // 81
      this.debug = false;                                                                                              // 69
    }                                                                                                                  // 83
                                                                                                                       //
    this._debug = function () {                                                                                        // 70
      if (self.debug) {                                                                                                // 71
        return console.info.apply(void 0, arguments);                                                                  // 86
      }                                                                                                                // 87
    };                                                                                                                 // 70
                                                                                                                       //
    if (this["public"] == null) {                                                                                      // 89
      this["public"] = false;                                                                                          // 72
    }                                                                                                                  // 91
                                                                                                                       //
    if (this["protected"] == null) {                                                                                   // 92
      this["protected"] = false;                                                                                       // 73
    }                                                                                                                  // 94
                                                                                                                       //
    if (this.chunkSize == null) {                                                                                      // 95
      this.chunkSize = 1024 * 512;                                                                                     // 74
    }                                                                                                                  // 97
                                                                                                                       //
    this.chunkSize = Math.floor(this.chunkSize / 8) * 8;                                                               // 75
                                                                                                                       //
    if (this["public"] && !this.downloadRoute) {                                                                       // 77
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: \"downloadRoute\" must be precisely provided on \"public\" collections! Note: \"downloadRoute\" must be equal or be inside of your web/proxy-server (relative) root.");
    }                                                                                                                  // 101
                                                                                                                       //
    if (this.collection == null) {                                                                                     // 102
      this.collection = new Mongo.Collection(this.collectionName);                                                     // 80
    }                                                                                                                  // 104
                                                                                                                       //
    this.collection.filesCollection = this;                                                                            // 81
                                                                                                                       //
    if (this.collectionName == null) {                                                                                 // 106
      this.collectionName = this.collection._name;                                                                     // 82
    }                                                                                                                  // 108
                                                                                                                       //
    check(this.collectionName, String);                                                                                // 83
                                                                                                                       //
    if (this.downloadRoute == null) {                                                                                  // 110
      this.downloadRoute = '/cdn/storage';                                                                             // 84
    }                                                                                                                  // 112
                                                                                                                       //
    this.downloadRoute = this.downloadRoute.replace(/\/$/, '');                                                        // 85
                                                                                                                       //
    if (this.collectionName == null) {                                                                                 // 114
      this.collectionName = 'MeteorUploadFiles';                                                                       // 86
    }                                                                                                                  // 116
                                                                                                                       //
    if (this.namingFunction == null) {                                                                                 // 117
      this.namingFunction = false;                                                                                     // 87
    }                                                                                                                  // 119
                                                                                                                       //
    if (this.onBeforeUpload == null) {                                                                                 // 120
      this.onBeforeUpload = false;                                                                                     // 88
    }                                                                                                                  // 122
                                                                                                                       //
    if (this.allowClientCode == null) {                                                                                // 123
      this.allowClientCode = true;                                                                                     // 89
    }                                                                                                                  // 125
                                                                                                                       //
    if (this.ddp == null) {                                                                                            // 126
      this.ddp = Meteor;                                                                                               // 90
    }                                                                                                                  // 128
                                                                                                                       //
    if (this.onInitiateUpload == null) {                                                                               // 129
      this.onInitiateUpload = false;                                                                                   // 91
    }                                                                                                                  // 131
                                                                                                                       //
    if (this.interceptDownload == null) {                                                                              // 132
      this.interceptDownload = false;                                                                                  // 92
    }                                                                                                                  // 134
                                                                                                                       //
    if (storagePath == null) {                                                                                         // 135
      storagePath = function () {                                                                                      // 93
        return "assets" + nodePath.sep + "app" + nodePath.sep + "uploads" + nodePath.sep + this.collectionName;        // 137
      };                                                                                                               // 93
    }                                                                                                                  // 139
                                                                                                                       //
    if (_.isString(storagePath)) {                                                                                     // 95
      this.storagePath = function () {                                                                                 // 96
        return storagePath;                                                                                            // 142
      };                                                                                                               // 96
    } else {                                                                                                           // 95
      this.storagePath = function () {                                                                                 // 98
        var sp;                                                                                                        // 99
        sp = storagePath.apply(this, arguments);                                                                       // 99
                                                                                                                       //
        if (!_.isString(sp)) {                                                                                         // 100
          throw new Meteor.Error(400, "[FilesCollection." + self.collectionName + "] \"storagePath\" function must return a String!");
        }                                                                                                              // 150
                                                                                                                       //
        sp = sp.replace(/\/$/, '');                                                                                    // 102
        return nodePath.normalize(sp);                                                                                 // 103
      };                                                                                                               // 98
    }                                                                                                                  // 154
                                                                                                                       //
    if (this.strict == null) {                                                                                         // 155
      this.strict = true;                                                                                              // 105
    }                                                                                                                  // 157
                                                                                                                       //
    if (this.throttle == null) {                                                                                       // 158
      this.throttle = false;                                                                                           // 106
    }                                                                                                                  // 160
                                                                                                                       //
    if (this.permissions == null) {                                                                                    // 161
      this.permissions = parseInt('644', 8);                                                                           // 107
    }                                                                                                                  // 163
                                                                                                                       //
    if (this.parentDirPermissions == null) {                                                                           // 164
      this.parentDirPermissions = parseInt('755', 8);                                                                  // 108
    }                                                                                                                  // 166
                                                                                                                       //
    if (this.cacheControl == null) {                                                                                   // 167
      this.cacheControl = 'public, max-age=31536000, s-maxage=31536000';                                               // 109
    }                                                                                                                  // 169
                                                                                                                       //
    if (this.onAfterUpload == null) {                                                                                  // 170
      this.onAfterUpload = false;                                                                                      // 110
    }                                                                                                                  // 172
                                                                                                                       //
    if (this.onAfterRemove == null) {                                                                                  // 173
      this.onAfterRemove = false;                                                                                      // 111
    }                                                                                                                  // 175
                                                                                                                       //
    if (this.onBeforeRemove == null) {                                                                                 // 176
      this.onBeforeRemove = false;                                                                                     // 112
    }                                                                                                                  // 178
                                                                                                                       //
    if (this.integrityCheck == null) {                                                                                 // 179
      this.integrityCheck = true;                                                                                      // 113
    }                                                                                                                  // 181
                                                                                                                       //
    if (this._currentUploads == null) {                                                                                // 182
      this._currentUploads = {};                                                                                       // 114
    }                                                                                                                  // 184
                                                                                                                       //
    if (this.downloadCallback == null) {                                                                               // 185
      this.downloadCallback = false;                                                                                   // 115
    }                                                                                                                  // 187
                                                                                                                       //
    if (this.continueUploadTTL == null) {                                                                              // 188
      this.continueUploadTTL = 10800;                                                                                  // 116
    }                                                                                                                  // 190
                                                                                                                       //
    if (this.responseHeaders == null) {                                                                                // 191
      this.responseHeaders = function (responseCode, fileRef, versionRef) {                                            // 117
        var headers;                                                                                                   // 118
        headers = {};                                                                                                  // 118
                                                                                                                       //
        switch (responseCode) {                                                                                        // 119
          case '206':                                                                                                  // 119
            headers['Pragma'] = 'private';                                                                             // 121
            headers['Trailer'] = 'expires';                                                                            // 122
            headers['Transfer-Encoding'] = 'chunked';                                                                  // 123
            break;                                                                                                     // 120
                                                                                                                       //
          case '400':                                                                                                  // 119
            headers['Cache-Control'] = 'no-cache';                                                                     // 125
            break;                                                                                                     // 124
                                                                                                                       //
          case '416':                                                                                                  // 119
            headers['Content-Range'] = "bytes */" + versionRef.size;                                                   // 127
        }                                                                                                              // 119
                                                                                                                       //
        headers['Connection'] = 'keep-alive';                                                                          // 129
        headers['Content-Type'] = versionRef.type || 'application/octet-stream';                                       // 130
        headers['Accept-Ranges'] = 'bytes';                                                                            // 131
        return headers;                                                                                                // 132
      };                                                                                                               // 117
    }                                                                                                                  // 212
                                                                                                                       //
    if (this["public"] && !storagePath) {                                                                              // 134
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "] \"storagePath\" must be set on \"public\" collections! Note: \"storagePath\" must be equal on be inside of your web/proxy-server (absolute) root.");
    }                                                                                                                  // 215
                                                                                                                       //
    this._debug('[FilesCollection.storagePath] Set to:', this.storagePath({}));                                        // 137
                                                                                                                       //
    fs.mkdirs(this.storagePath({}), {                                                                                  // 139
      mode: this.parentDirPermissions                                                                                  // 139
    }, function (error) {                                                                                              // 139
      if (error) {                                                                                                     // 140
        throw new Meteor.Error(401, "[FilesCollection." + self.collectionName + "] Path \"" + self.storagePath({}) + "\" is not writable!", error);
      }                                                                                                                // 222
    });                                                                                                                // 139
    check(this.strict, Boolean);                                                                                       // 144
    check(this.throttle, Match.OneOf(false, Number));                                                                  // 145
    check(this.permissions, Number);                                                                                   // 146
    check(this.storagePath, Function);                                                                                 // 147
    check(this.cacheControl, String);                                                                                  // 148
    check(this.onAfterRemove, Match.OneOf(false, Function));                                                           // 149
    check(this.onAfterUpload, Match.OneOf(false, Function));                                                           // 150
    check(this.integrityCheck, Boolean);                                                                               // 151
    check(this.onBeforeRemove, Match.OneOf(false, Function));                                                          // 152
    check(this.downloadCallback, Match.OneOf(false, Function));                                                        // 153
    check(this.interceptDownload, Match.OneOf(false, Function));                                                       // 154
    check(this.continueUploadTTL, Number);                                                                             // 155
    check(this.responseHeaders, Match.OneOf(Object, Function));                                                        // 156
    this._preCollection = new Mongo.Collection('__pre_' + this.collectionName);                                        // 158
                                                                                                                       //
    this._preCollection._ensureIndex({                                                                                 // 159
      createdAt: 1                                                                                                     // 159
    }, {                                                                                                               // 159
      expireAfterSeconds: this.continueUploadTTL,                                                                      // 159
      background: true                                                                                                 // 159
    });                                                                                                                // 159
                                                                                                                       //
    _preCollectionCursor = this._preCollection.find({}, {                                                              // 160
      fields: {                                                                                                        // 161
        _id: 1,                                                                                                        // 162
        isFinished: 1                                                                                                  // 163
      }                                                                                                                // 162
    });                                                                                                                // 160
                                                                                                                       //
    _preCollectionCursor.observe({                                                                                     // 165
      changed: function (doc) {                                                                                        // 166
        if (doc.isFinished) {                                                                                          // 167
          self._debug("[FilesCollection] [_preCollectionCursor.observe] [changed]: " + doc._id);                       // 168
                                                                                                                       //
          self._preCollection.remove({                                                                                 // 169
            _id: doc._id                                                                                               // 169
          }, NOOP);                                                                                                    // 169
        }                                                                                                              // 257
      },                                                                                                               // 166
      removed: function (doc) {                                                                                        // 171
        var ref;                                                                                                       // 174
                                                                                                                       //
        self._debug("[FilesCollection] [_preCollectionCursor.observe] [removed]: " + doc._id);                         // 174
                                                                                                                       //
        if ((ref = self._currentUploads) != null ? ref[doc._id] : void 0) {                                            // 175
          self._currentUploads[doc._id].stop();                                                                        // 176
                                                                                                                       //
          self._currentUploads[doc._id].end();                                                                         // 177
                                                                                                                       //
          if (!doc.isFinished) {                                                                                       // 179
            self._debug("[FilesCollection] [_preCollectionCursor.observe] [removeUnfinishedUpload]: " + doc._id);      // 180
                                                                                                                       //
            self._currentUploads[doc._id].abort();                                                                     // 181
          }                                                                                                            // 268
                                                                                                                       //
          delete self._currentUploads[doc._id];                                                                        // 183
        }                                                                                                              // 270
      }                                                                                                                // 166
    });                                                                                                                // 166
                                                                                                                       //
    this._createStream = function (_id, path, opts) {                                                                  // 186
      return self._currentUploads[_id] = new writeStream(path, opts.fileLength, opts, self.permissions);               // 187
    };                                                                                                                 // 186
                                                                                                                       //
    _iwcz = 0;                                                                                                         // 191
                                                                                                                       //
    this._continueUpload = function (_id) {                                                                            // 192
      var contUpld, ref, ref1;                                                                                         // 193
                                                                                                                       //
      if ((ref = self._currentUploads) != null ? (ref1 = ref[_id]) != null ? ref1.file : void 0 : void 0) {            // 193
        if (!self._currentUploads[_id].aborted && !self._currentUploads[_id].ended) {                                  // 194
          return self._currentUploads[_id].file;                                                                       // 195
        } else {                                                                                                       // 194
          self._createStream(_id, self._currentUploads[_id].file.file.path, self._currentUploads[_id].file);           // 197
                                                                                                                       //
          return self._currentUploads[_id].file;                                                                       // 198
        }                                                                                                              // 193
      } else {                                                                                                         // 193
        contUpld = self._preCollection.findOne({                                                                       // 200
          _id: _id                                                                                                     // 200
        });                                                                                                            // 200
                                                                                                                       //
        if (contUpld) {                                                                                                // 201
          self._createStream(_id, contUpld.file.path, contUpld);                                                       // 202
                                                                                                                       //
          return self._currentUploads[_id].file;                                                                       // 203
        }                                                                                                              // 293
                                                                                                                       //
        return false;                                                                                                  // 204
      }                                                                                                                // 295
    };                                                                                                                 // 192
                                                                                                                       //
    if (!this.schema) {                                                                                                // 206
      this.schema = {                                                                                                  // 207
        size: {                                                                                                        // 208
          type: Number                                                                                                 // 208
        },                                                                                                             // 208
        name: {                                                                                                        // 209
          type: String                                                                                                 // 209
        },                                                                                                             // 209
        type: {                                                                                                        // 210
          type: String                                                                                                 // 210
        },                                                                                                             // 210
        path: {                                                                                                        // 211
          type: String                                                                                                 // 211
        },                                                                                                             // 211
        isVideo: {                                                                                                     // 212
          type: Boolean                                                                                                // 212
        },                                                                                                             // 212
        isAudio: {                                                                                                     // 213
          type: Boolean                                                                                                // 213
        },                                                                                                             // 213
        isImage: {                                                                                                     // 214
          type: Boolean                                                                                                // 214
        },                                                                                                             // 214
        isText: {                                                                                                      // 215
          type: Boolean                                                                                                // 215
        },                                                                                                             // 215
        isJSON: {                                                                                                      // 216
          type: Boolean                                                                                                // 216
        },                                                                                                             // 216
        isPDF: {                                                                                                       // 217
          type: Boolean                                                                                                // 217
        },                                                                                                             // 217
        extension: {                                                                                                   // 218
          type: String,                                                                                                // 219
          optional: true                                                                                               // 220
        },                                                                                                             // 219
        _storagePath: {                                                                                                // 221
          type: String                                                                                                 // 221
        },                                                                                                             // 221
        _downloadRoute: {                                                                                              // 222
          type: String                                                                                                 // 222
        },                                                                                                             // 222
        _collectionName: {                                                                                             // 223
          type: String                                                                                                 // 223
        },                                                                                                             // 223
        "public": {                                                                                                    // 224
          type: Boolean,                                                                                               // 225
          optional: true                                                                                               // 226
        },                                                                                                             // 225
        meta: {                                                                                                        // 227
          type: Object,                                                                                                // 228
          blackbox: true,                                                                                              // 229
          optional: true                                                                                               // 230
        },                                                                                                             // 228
        userId: {                                                                                                      // 231
          type: String,                                                                                                // 232
          optional: true                                                                                               // 233
        },                                                                                                             // 232
        updatedAt: {                                                                                                   // 234
          type: Date,                                                                                                  // 235
          optional: true                                                                                               // 236
        },                                                                                                             // 235
        versions: {                                                                                                    // 237
          type: Object,                                                                                                // 238
          blackbox: true                                                                                               // 239
        }                                                                                                              // 238
      };                                                                                                               // 208
    }                                                                                                                  // 364
                                                                                                                       //
    check(this.debug, Boolean);                                                                                        // 241
    check(this.schema, Object);                                                                                        // 242
    check(this["public"], Boolean);                                                                                    // 243
    check(this["protected"], Match.OneOf(Boolean, Function));                                                          // 244
    check(this.chunkSize, Number);                                                                                     // 245
    check(this.downloadRoute, String);                                                                                 // 246
    check(this.namingFunction, Match.OneOf(false, Function));                                                          // 247
    check(this.onBeforeUpload, Match.OneOf(false, Function));                                                          // 248
    check(this.onInitiateUpload, Match.OneOf(false, Function));                                                        // 249
    check(this.allowClientCode, Boolean);                                                                              // 250
    check(this.ddp, Match.Any);                                                                                        // 251
                                                                                                                       //
    if (this["public"] && this["protected"]) {                                                                         // 253
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: Files can not be public and protected at the same time!");
    }                                                                                                                  // 378
                                                                                                                       //
    this._checkAccess = function (http) {                                                                              // 256
      var fileRef, rc, ref, ref1, result, text, user, userId;                                                          // 257
                                                                                                                       //
      if (self["protected"]) {                                                                                         // 257
        ref = self._getUser(http), user = ref.user, userId = ref.userId;                                               // 258
                                                                                                                       //
        if (_.isFunction(self["protected"])) {                                                                         // 260
          if (http != null ? (ref1 = http.params) != null ? ref1._id : void 0 : void 0) {                              // 261
            fileRef = self.collection.findOne(http.params._id);                                                        // 262
          }                                                                                                            // 386
                                                                                                                       //
          result = http ? self["protected"].call(_.extend(http, {                                                      // 264
            user: user,                                                                                                // 264
            userId: userId                                                                                             // 264
          }), fileRef || null) : self["protected"].call({                                                              // 264
            user: user,                                                                                                // 264
            userId: userId                                                                                             // 264
          }, fileRef || null);                                                                                         // 264
        } else {                                                                                                       // 260
          result = !!userId;                                                                                           // 266
        }                                                                                                              // 396
                                                                                                                       //
        if (http && result === true || !http) {                                                                        // 268
          return true;                                                                                                 // 269
        } else {                                                                                                       // 268
          rc = _.isNumber(result) ? result : 401;                                                                      // 271
                                                                                                                       //
          self._debug('[FilesCollection._checkAccess] WARN: Access denied!');                                          // 272
                                                                                                                       //
          if (http) {                                                                                                  // 273
            text = 'Access denied!';                                                                                   // 274
                                                                                                                       //
            if (!http.response.headersSent) {                                                                          // 275
              http.response.writeHead(rc, {                                                                            // 276
                'Content-Length': text.length,                                                                         // 277
                'Content-Type': 'text/plain'                                                                           // 278
              });                                                                                                      // 277
            }                                                                                                          // 409
                                                                                                                       //
            if (!http.response.finished) {                                                                             // 279
              http.response.end(text);                                                                                 // 280
            }                                                                                                          // 273
          }                                                                                                            // 413
                                                                                                                       //
          return false;                                                                                                // 281
        }                                                                                                              // 257
      } else {                                                                                                         // 257
        return true;                                                                                                   // 283
      }                                                                                                                // 418
    };                                                                                                                 // 256
                                                                                                                       //
    this._methodNames = {                                                                                              // 285
      _Abort: "_FilesCollectionAbort_" + this.collectionName,                                                          // 286
      _Write: "_FilesCollectionWrite_" + this.collectionName,                                                          // 287
      _Start: "_FilesCollectionStart_" + this.collectionName,                                                          // 288
      _Remove: "_FilesCollectionRemove_" + this.collectionName                                                         // 289
    };                                                                                                                 // 286
    this.on('_handleUpload', this._handleUpload);                                                                      // 291
    this.on('_finishUpload', this._finishUpload);                                                                      // 292
    WebApp.connectHandlers.use(function (request, response, next) {                                                    // 294
      var _file, body, handleError, http, params, uri, uris, version;                                                  // 295
                                                                                                                       //
      if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName + "/__upload")) {          // 295
        if (request.method === 'POST') {                                                                               // 296
          handleError = function (error) {                                                                             // 298
            console.warn("[FilesCollection] [Upload] [HTTP] Exception:", error);                                       // 299
                                                                                                                       //
            if (!response.headersSent) {                                                                               // 300
              response.writeHead(500);                                                                                 // 301
            }                                                                                                          // 436
                                                                                                                       //
            if (!response.finished) {                                                                                  // 302
              response.end(JSON.stringify({                                                                            // 303
                error: error                                                                                           // 303
              }));                                                                                                     // 303
            }                                                                                                          // 441
          };                                                                                                           // 298
                                                                                                                       //
          body = '';                                                                                                   // 306
          request.on('data', function (data) {                                                                         // 307
            return bound(function () {                                                                                 // 445
              body += data;                                                                                            // 308
            });                                                                                                        // 307
          });                                                                                                          // 307
          request.on('end', function () {                                                                              // 311
            return bound(function () {                                                                                 // 450
              var _continueUpload, e, error, opts, ref, ref1, ref2, ref3, result, user;                                // 312
                                                                                                                       //
              try {                                                                                                    // 312
                if (request.headers['x-mtok'] && ((ref = Meteor.server.sessions) != null ? ref[request.headers['x-mtok']] : void 0)) {
                  user = {                                                                                             // 314
                    userId: (ref1 = Meteor.server.sessions[request.headers['x-mtok']]) != null ? ref1.userId : void 0  // 314
                  };                                                                                                   // 314
                } else {                                                                                               // 313
                  user = self._getUser({                                                                               // 316
                    request: request,                                                                                  // 316
                    response: response                                                                                 // 316
                  });                                                                                                  // 316
                }                                                                                                      // 462
                                                                                                                       //
                if (request.headers['x-start'] !== '1') {                                                              // 318
                  opts = {                                                                                             // 319
                    fileId: request.headers['x-fileid']                                                                // 319
                  };                                                                                                   // 319
                                                                                                                       //
                  if (request.headers['x-eof'] === '1') {                                                              // 320
                    opts.eof = true;                                                                                   // 321
                  } else {                                                                                             // 320
                    if (typeof Buffer.from === 'function') {                                                           // 323
                      try {                                                                                            // 324
                        opts.binData = Buffer.from(body, 'base64');                                                    // 325
                      } catch (error1) {                                                                               // 324
                        e = error1;                                                                                    // 326
                        opts.binData = new Buffer(body, 'base64');                                                     // 327
                      }                                                                                                // 323
                    } else {                                                                                           // 323
                      opts.binData = new Buffer(body, 'base64');                                                       // 329
                    }                                                                                                  // 479
                                                                                                                       //
                    opts.chunkId = parseInt(request.headers['x-chunkid']);                                             // 330
                  }                                                                                                    // 481
                                                                                                                       //
                  _continueUpload = self._continueUpload(opts.fileId);                                                 // 332
                                                                                                                       //
                  if (!_continueUpload) {                                                                              // 333
                    throw new Meteor.Error(408, 'Can\'t continue upload, session expired. Start upload again.');       // 334
                  }                                                                                                    // 485
                                                                                                                       //
                  ref2 = self._prepareUpload(_.extend(opts, _continueUpload), user.userId, 'HTTP'), result = ref2.result, opts = ref2.opts;
                                                                                                                       //
                  if (opts.eof) {                                                                                      // 338
                    self._handleUpload(result, opts, function () {                                                     // 339
                      var ref3;                                                                                        // 340
                                                                                                                       //
                      if (!response.headersSent) {                                                                     // 340
                        response.writeHead(200);                                                                       // 341
                      }                                                                                                // 492
                                                                                                                       //
                      if (result != null ? (ref3 = result.file) != null ? ref3.meta : void 0 : void 0) {               // 342
                        result.file.meta = fixJSONStringify(result.file.meta);                                         // 342
                      }                                                                                                // 495
                                                                                                                       //
                      if (!response.finished) {                                                                        // 343
                        response.end(JSON.stringify(result));                                                          // 344
                      }                                                                                                // 498
                    });                                                                                                // 339
                                                                                                                       //
                    return;                                                                                            // 346
                  } else {                                                                                             // 338
                    self.emit('_handleUpload', result, opts, NOOP);                                                    // 348
                  }                                                                                                    // 503
                                                                                                                       //
                  if (!response.headersSent) {                                                                         // 350
                    response.writeHead(204);                                                                           // 351
                  }                                                                                                    // 506
                                                                                                                       //
                  if (!response.finished) {                                                                            // 352
                    response.end();                                                                                    // 353
                  }                                                                                                    // 318
                } else {                                                                                               // 318
                  try {                                                                                                // 356
                    opts = JSON.parse(body);                                                                           // 357
                  } catch (error1) {                                                                                   // 356
                    e = error1;                                                                                        // 358
                    console.error('Can\'t parse incoming JSON from Client on [.insert() | upload], something went wrong!');
                    console.error(e);                                                                                  // 360
                    opts = {                                                                                           // 361
                      file: {}                                                                                         // 361
                    };                                                                                                 // 361
                  }                                                                                                    // 520
                                                                                                                       //
                  opts.___s = true;                                                                                    // 363
                                                                                                                       //
                  self._debug("[FilesCollection] [File Start HTTP] " + opts.file.name + " - " + opts.fileId);          // 364
                                                                                                                       //
                  if (opts != null ? (ref3 = opts.file) != null ? ref3.meta : void 0 : void 0) {                       // 365
                    opts.file.meta = fixJSONParse(opts.file.meta);                                                     // 365
                  }                                                                                                    // 525
                                                                                                                       //
                  result = self._prepareUpload(_.clone(opts), user.userId, 'HTTP Start Method').result;                // 366
                                                                                                                       //
                  if (self.collection.findOne(result._id)) {                                                           // 367
                    throw new Meteor.Error(400, 'Can\'t start upload, data substitution detected!');                   // 368
                  }                                                                                                    // 529
                                                                                                                       //
                  opts._id = opts.fileId;                                                                              // 369
                  opts.createdAt = new Date();                                                                         // 370
                  opts.maxLength = opts.fileLength;                                                                    // 371
                                                                                                                       //
                  self._preCollection.insert(_.omit(opts, '___s'));                                                    // 372
                                                                                                                       //
                  self._createStream(result._id, result.path, _.omit(opts, '___s'));                                   // 373
                                                                                                                       //
                  if (opts.returnMeta) {                                                                               // 375
                    if (!response.headersSent) {                                                                       // 376
                      response.writeHead(200);                                                                         // 377
                    }                                                                                                  // 538
                                                                                                                       //
                    if (!response.finished) {                                                                          // 378
                      response.end(JSON.stringify({                                                                    // 379
                        uploadRoute: self.downloadRoute + "/" + self.collectionName + "/__upload",                     // 380
                        file: result                                                                                   // 381
                      }));                                                                                             // 379
                    }                                                                                                  // 375
                  } else {                                                                                             // 375
                    if (!response.headersSent) {                                                                       // 384
                      response.writeHead(204);                                                                         // 385
                    }                                                                                                  // 548
                                                                                                                       //
                    if (!response.finished) {                                                                          // 386
                      response.end();                                                                                  // 387
                    }                                                                                                  // 375
                  }                                                                                                    // 318
                }                                                                                                      // 312
              } catch (error1) {                                                                                       // 312
                error = error1;                                                                                        // 388
                handleError(error);                                                                                    // 389
              }                                                                                                        // 557
            });                                                                                                        // 311
          });                                                                                                          // 311
        } else {                                                                                                       // 296
          next();                                                                                                      // 392
        }                                                                                                              // 562
                                                                                                                       //
        return;                                                                                                        // 393
      }                                                                                                                // 564
                                                                                                                       //
      if (!self["public"]) {                                                                                           // 395
        if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName)) {                      // 396
          uri = request._parsedUrl.path.replace(self.downloadRoute + "/" + self.collectionName, '');                   // 397
                                                                                                                       //
          if (uri.indexOf('/') === 0) {                                                                                // 398
            uri = uri.substring(1);                                                                                    // 399
          }                                                                                                            // 570
                                                                                                                       //
          uris = uri.split('/');                                                                                       // 401
                                                                                                                       //
          if (uris.length === 3) {                                                                                     // 402
            params = {                                                                                                 // 403
              query: request._parsedUrl.query ? nodeQs.parse(request._parsedUrl.query) : {},                           // 404
              _id: uris[0],                                                                                            // 405
              version: uris[1],                                                                                        // 406
              name: uris[2].split('?')[0]                                                                              // 407
            };                                                                                                         // 404
            http = {                                                                                                   // 408
              request: request,                                                                                        // 408
              response: response,                                                                                      // 408
              params: params                                                                                           // 408
            };                                                                                                         // 408
                                                                                                                       //
            if (self._checkAccess(http)) {                                                                             // 409
              self.download(http, uris[1], self.collection.findOne(uris[0]));                                          // 409
            }                                                                                                          // 402
          } else {                                                                                                     // 402
            next();                                                                                                    // 411
          }                                                                                                            // 396
        } else {                                                                                                       // 396
          next();                                                                                                      // 413
        }                                                                                                              // 395
      } else {                                                                                                         // 395
        if (!!~request._parsedUrl.path.indexOf("" + self.downloadRoute)) {                                             // 415
          uri = request._parsedUrl.path.replace("" + self.downloadRoute, '');                                          // 416
                                                                                                                       //
          if (uri.indexOf('/') === 0) {                                                                                // 417
            uri = uri.substring(1);                                                                                    // 418
          }                                                                                                            // 598
                                                                                                                       //
          uris = uri.split('/');                                                                                       // 420
          _file = uris[uris.length - 1];                                                                               // 421
                                                                                                                       //
          if (_file) {                                                                                                 // 422
            if (!!~_file.indexOf('-')) {                                                                               // 423
              version = _file.split('-')[0];                                                                           // 424
              _file = _file.split('-')[1].split('?')[0];                                                               // 425
            } else {                                                                                                   // 423
              version = 'original';                                                                                    // 427
              _file = _file.split('?')[0];                                                                             // 428
            }                                                                                                          // 608
                                                                                                                       //
            params = {                                                                                                 // 430
              query: request._parsedUrl.query ? nodeQs.parse(request._parsedUrl.query) : {},                           // 431
              file: _file,                                                                                             // 432
              _id: _file.split('.')[0],                                                                                // 433
              version: version,                                                                                        // 434
              name: _file                                                                                              // 435
            };                                                                                                         // 431
            http = {                                                                                                   // 436
              request: request,                                                                                        // 436
              response: response,                                                                                      // 436
              params: params                                                                                           // 436
            };                                                                                                         // 436
            self.download(http, version, self.collection.findOne(params._id));                                         // 437
          } else {                                                                                                     // 422
            next();                                                                                                    // 439
          }                                                                                                            // 415
        } else {                                                                                                       // 415
          next();                                                                                                      // 441
        }                                                                                                              // 395
      }                                                                                                                // 628
    });                                                                                                                // 294
    _methods = {};                                                                                                     // 444
                                                                                                                       //
    _methods[self._methodNames._Remove] = function (selector) {                                                        // 449
      var cursor, user, userFuncs;                                                                                     // 450
      check(selector, Match.OneOf(String, Object));                                                                    // 450
                                                                                                                       //
      self._debug("[FilesCollection] [Unlink Method] [.remove(" + selector + ")]");                                    // 451
                                                                                                                       //
      if (self.allowClientCode) {                                                                                      // 453
        if (self.onBeforeRemove && _.isFunction(self.onBeforeRemove)) {                                                // 454
          user = false;                                                                                                // 455
          userFuncs = {                                                                                                // 456
            userId: this.userId,                                                                                       // 457
            user: function () {                                                                                        // 458
              if (Meteor.users) {                                                                                      // 458
                return Meteor.users.findOne(this.userId);                                                              // 642
              } else {                                                                                                 // 458
                return null;                                                                                           // 644
              }                                                                                                        // 645
            }                                                                                                          // 456
          };                                                                                                           // 456
                                                                                                                       //
          if (!self.onBeforeRemove.call(userFuncs, self.find(selector) || null)) {                                     // 461
            throw new Meteor.Error(403, '[FilesCollection] [remove] Not permitted!');                                  // 462
          }                                                                                                            // 454
        }                                                                                                              // 651
                                                                                                                       //
        cursor = self.find(selector);                                                                                  // 464
                                                                                                                       //
        if (cursor.count() > 0) {                                                                                      // 465
          self.remove(selector);                                                                                       // 466
          return true;                                                                                                 // 467
        } else {                                                                                                       // 465
          throw new Meteor.Error(404, 'Cursor is empty, no files is removed');                                         // 469
        }                                                                                                              // 453
      } else {                                                                                                         // 453
        throw new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!');                // 471
      }                                                                                                                // 661
    };                                                                                                                 // 449
                                                                                                                       //
    _methods[self._methodNames._Start] = function (opts, returnMeta) {                                                 // 481
      var result;                                                                                                      // 482
      check(opts, {                                                                                                    // 482
        file: Object,                                                                                                  // 483
        fileId: String,                                                                                                // 484
        FSName: Match.Optional(String),                                                                                // 485
        chunkSize: Number,                                                                                             // 486
        fileLength: Number                                                                                             // 487
      });                                                                                                              // 482
      check(returnMeta, Match.Optional(Boolean));                                                                      // 490
                                                                                                                       //
      self._debug("[FilesCollection] [File Start Method] " + opts.file.name + " - " + opts.fileId);                    // 492
                                                                                                                       //
      opts.___s = true;                                                                                                // 493
      result = self._prepareUpload(_.clone(opts), this.userId, 'DDP Start Method').result;                             // 494
                                                                                                                       //
      if (self.collection.findOne(result._id)) {                                                                       // 495
        throw new Meteor.Error(400, 'Can\'t start upload, data substitution detected!');                               // 496
      }                                                                                                                // 678
                                                                                                                       //
      opts._id = opts.fileId;                                                                                          // 497
      opts.createdAt = new Date();                                                                                     // 498
      opts.maxLength = opts.fileLength;                                                                                // 499
                                                                                                                       //
      self._preCollection.insert(_.omit(opts, '___s'));                                                                // 500
                                                                                                                       //
      self._createStream(result._id, result.path, _.omit(opts, '___s'));                                               // 501
                                                                                                                       //
      if (returnMeta) {                                                                                                // 503
        return {                                                                                                       // 504
          uploadRoute: self.downloadRoute + "/" + self.collectionName + "/__upload",                                   // 505
          file: result                                                                                                 // 506
        };                                                                                                             // 504
      } else {                                                                                                         // 503
        return true;                                                                                                   // 509
      }                                                                                                                // 691
    };                                                                                                                 // 481
                                                                                                                       //
    _methods[self._methodNames._Write] = function (opts) {                                                             // 515
      var _continueUpload, e, ref, result;                                                                             // 516
                                                                                                                       //
      check(opts, {                                                                                                    // 516
        eof: Match.Optional(Boolean),                                                                                  // 517
        fileId: String,                                                                                                // 518
        binData: Match.Optional(String),                                                                               // 519
        chunkId: Match.Optional(Number)                                                                                // 520
      });                                                                                                              // 516
                                                                                                                       //
      if (opts.binData) {                                                                                              // 523
        if (typeof Buffer.from === 'function') {                                                                       // 524
          try {                                                                                                        // 525
            opts.binData = Buffer.from(opts.binData, 'base64');                                                        // 526
          } catch (error1) {                                                                                           // 525
            e = error1;                                                                                                // 527
            opts.binData = new Buffer(opts.binData, 'base64');                                                         // 528
          }                                                                                                            // 524
        } else {                                                                                                       // 524
          opts.binData = new Buffer(opts.binData, 'base64');                                                           // 530
        }                                                                                                              // 523
      }                                                                                                                // 712
                                                                                                                       //
      _continueUpload = self._continueUpload(opts.fileId);                                                             // 532
                                                                                                                       //
      if (!_continueUpload) {                                                                                          // 533
        throw new Meteor.Error(408, 'Can\'t continue upload, session expired. Start upload again.');                   // 534
      }                                                                                                                // 716
                                                                                                                       //
      this.unblock();                                                                                                  // 536
      ref = self._prepareUpload(_.extend(opts, _continueUpload), this.userId, 'DDP'), result = ref.result, opts = ref.opts;
                                                                                                                       //
      if (opts.eof) {                                                                                                  // 539
        try {                                                                                                          // 540
          return Meteor.wrapAsync(self._handleUpload.bind(self, result, opts))();                                      // 541
        } catch (error1) {                                                                                             // 540
          e = error1;                                                                                                  // 542
                                                                                                                       //
          self._debug("[FilesCollection] [Write Method] [DDP] Exception:", e);                                         // 543
                                                                                                                       //
          throw e;                                                                                                     // 544
        }                                                                                                              // 539
      } else {                                                                                                         // 539
        self.emit('_handleUpload', result, opts, NOOP);                                                                // 546
      }                                                                                                                // 729
                                                                                                                       //
      return true;                                                                                                     // 547
    };                                                                                                                 // 515
                                                                                                                       //
    _methods[self._methodNames._Abort] = function (_id) {                                                              // 554
      var _continueUpload, ref, ref1, ref2;                                                                            // 555
                                                                                                                       //
      check(_id, String);                                                                                              // 555
      _continueUpload = self._continueUpload(_id);                                                                     // 557
                                                                                                                       //
      self._debug("[FilesCollection] [Abort Method]: " + _id + " - " + (_continueUpload != null ? (ref = _continueUpload.file) != null ? ref.path : void 0 : void 0));
                                                                                                                       //
      if ((ref1 = self._currentUploads) != null ? ref1[_id] : void 0) {                                                // 560
        self._currentUploads[_id].stop();                                                                              // 561
                                                                                                                       //
        self._currentUploads[_id].abort();                                                                             // 562
      }                                                                                                                // 740
                                                                                                                       //
      if (_continueUpload) {                                                                                           // 564
        self._preCollection.remove({                                                                                   // 565
          _id: _id                                                                                                     // 565
        });                                                                                                            // 565
                                                                                                                       //
        self.remove({                                                                                                  // 566
          _id: _id                                                                                                     // 566
        });                                                                                                            // 566
                                                                                                                       //
        if (_continueUpload != null ? (ref2 = _continueUpload.file) != null ? ref2.path : void 0 : void 0) {           // 567
          self.unlink({                                                                                                // 567
            _id: _id,                                                                                                  // 567
            path: _continueUpload.file.path                                                                            // 567
          });                                                                                                          // 567
        }                                                                                                              // 564
      }                                                                                                                // 754
                                                                                                                       //
      return true;                                                                                                     // 568
    };                                                                                                                 // 554
                                                                                                                       //
    Meteor.methods(_methods);                                                                                          // 570
  } /*                                                                                                                 // 63
    @locus Server                                                                                                      //
    @memberOf FilesCollection                                                                                          //
    @name _prepareUpload                                                                                               //
    @summary Internal method. Used to optimize received data and check upload permission                               //
    @returns {Object}                                                                                                  //
     */                                                                                                                //
                                                                                                                       //
  FilesCollection.prototype._prepareUpload = function (opts, userId, transport) {                                      // 769
    var base, ctx, extension, extensionWithDot, fileName, isUploadAllowed, ref, result;                                // 580
                                                                                                                       //
    if (opts.eof == null) {                                                                                            // 771
      opts.eof = false;                                                                                                // 580
    }                                                                                                                  // 773
                                                                                                                       //
    if (opts.binData == null) {                                                                                        // 774
      opts.binData = 'EOF';                                                                                            // 581
    }                                                                                                                  // 776
                                                                                                                       //
    if (opts.chunkId == null) {                                                                                        // 777
      opts.chunkId = -1;                                                                                               // 582
    }                                                                                                                  // 779
                                                                                                                       //
    if (opts.FSName == null) {                                                                                         // 780
      opts.FSName = opts.fileId;                                                                                       // 583
    }                                                                                                                  // 782
                                                                                                                       //
    this._debug("[FilesCollection] [Upload] [" + transport + "] Got #" + opts.chunkId + "/" + opts.fileLength + " chunks, dst: " + (opts.file.name || opts.file.fileName));
                                                                                                                       //
    fileName = this._getFileName(opts.file);                                                                           // 587
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  // 588
                                                                                                                       //
    if ((base = opts.file).meta == null) {                                                                             // 786
      base.meta = {};                                                                                                  // 787
    }                                                                                                                  // 788
                                                                                                                       //
    result = opts.file;                                                                                                // 591
    result.name = fileName;                                                                                            // 592
    result.meta = opts.file.meta;                                                                                      // 593
    result.extension = extension;                                                                                      // 594
    result.ext = extension;                                                                                            // 595
    result._id = opts.fileId;                                                                                          // 596
    result.userId = userId || null;                                                                                    // 597
    opts.FSName = opts.FSName.replace(/([^a-z0-9\-\_]+)/gi, '-');                                                      // 598
    result.path = "" + this.storagePath(result) + nodePath.sep + opts.FSName + extensionWithDot;                       // 599
    result = _.extend(result, this._dataToSchema(result));                                                             // 600
                                                                                                                       //
    if (this.onBeforeUpload && _.isFunction(this.onBeforeUpload)) {                                                    // 602
      ctx = _.extend({                                                                                                 // 603
        file: opts.file                                                                                                // 604
      }, {                                                                                                             // 603
        chunkId: opts.chunkId,                                                                                         // 606
        userId: result.userId,                                                                                         // 607
        user: function () {                                                                                            // 608
          if (Meteor.users && result.userId) {                                                                         // 608
            return Meteor.users.findOne(result.userId);                                                                // 807
          } else {                                                                                                     // 608
            return null;                                                                                               // 809
          }                                                                                                            // 810
        },                                                                                                             // 605
        eof: opts.eof                                                                                                  // 609
      });                                                                                                              // 605
      isUploadAllowed = this.onBeforeUpload.call(ctx, result);                                                         // 611
                                                                                                                       //
      if (isUploadAllowed !== true) {                                                                                  // 613
        throw new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : '@onBeforeUpload() returned false');
      } else {                                                                                                         // 613
        if (opts.___s === true && this.onInitiateUpload && _.isFunction(this.onInitiateUpload)) {                      // 616
          this.onInitiateUpload.call(ctx, result);                                                                     // 617
        }                                                                                                              // 613
      }                                                                                                                // 602
    } else if (opts.___s === true && this.onInitiateUpload && _.isFunction(this.onInitiateUpload)) {                   // 602
      ctx = _.extend({                                                                                                 // 619
        file: opts.file                                                                                                // 620
      }, {                                                                                                             // 619
        chunkId: opts.chunkId,                                                                                         // 622
        userId: result.userId,                                                                                         // 623
        user: function () {                                                                                            // 624
          if (Meteor.users && result.userId) {                                                                         // 624
            return Meteor.users.findOne(result.userId);                                                                // 830
          } else {                                                                                                     // 624
            return null;                                                                                               // 832
          }                                                                                                            // 833
        },                                                                                                             // 621
        eof: opts.eof                                                                                                  // 625
      });                                                                                                              // 621
      this.onInitiateUpload.call(ctx, result);                                                                         // 627
    }                                                                                                                  // 838
                                                                                                                       //
    return {                                                                                                           // 629
      result: result,                                                                                                  // 629
      opts: opts                                                                                                       // 629
    };                                                                                                                 // 629
  }; /*                                                                                                                // 579
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name _finishUpload                                                                                               //
     @summary Internal method. Finish upload, close Writable stream, add record to MongoDB and flush used memory       //
     @returns {undefined}                                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._finishUpload = function (result, opts, cb) {                                              // 854
    var self;                                                                                                          // 639
                                                                                                                       //
    this._debug("[FilesCollection] [Upload] [finish(ing)Upload] -> " + result.path);                                   // 639
                                                                                                                       //
    fs.chmod(result.path, this.permissions, NOOP);                                                                     // 640
    self = this;                                                                                                       // 641
    result.type = this._getMimeType(opts.file);                                                                        // 642
    result["public"] = this["public"];                                                                                 // 643
                                                                                                                       //
    this._updateFileTypes(result);                                                                                     // 644
                                                                                                                       //
    this.collection.insert(_.clone(result), function (error, _id) {                                                    // 646
      if (error) {                                                                                                     // 647
        cb && cb(error);                                                                                               // 648
                                                                                                                       //
        self._debug('[FilesCollection] [Upload] [_finishUpload] Error:', error);                                       // 649
      } else {                                                                                                         // 647
        self._preCollection.update({                                                                                   // 651
          _id: opts.fileId                                                                                             // 651
        }, {                                                                                                           // 651
          $set: {                                                                                                      // 651
            isFinished: true                                                                                           // 651
          }                                                                                                            // 651
        });                                                                                                            // 651
                                                                                                                       //
        result._id = _id;                                                                                              // 652
                                                                                                                       //
        self._debug("[FilesCollection] [Upload] [finish(ed)Upload] -> " + result.path);                                // 653
                                                                                                                       //
        self.onAfterUpload && self.onAfterUpload.call(self, result);                                                   // 654
        self.emit('afterUpload', result);                                                                              // 655
        cb && cb(null, result);                                                                                        // 656
      }                                                                                                                // 879
    });                                                                                                                // 646
  }; /*                                                                                                                // 638
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name _handleUpload                                                                                               //
     @summary Internal method to handle upload process, pipe incoming data to Writable stream                          //
     @returns {undefined}                                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._handleUpload = function (result, opts, cb) {                                              // 892
    var e, self;                                                                                                       // 668
                                                                                                                       //
    try {                                                                                                              // 668
      if (opts.eof) {                                                                                                  // 669
        self = this;                                                                                                   // 670
                                                                                                                       //
        this._currentUploads[result._id].end(function () {                                                             // 671
          self.emit('_finishUpload', result, opts, cb);                                                                // 672
        });                                                                                                            // 671
      } else {                                                                                                         // 669
        this._currentUploads[result._id].write(opts.chunkId, opts.binData, cb);                                        // 675
      }                                                                                                                // 668
    } catch (error1) {                                                                                                 // 668
      e = error1;                                                                                                      // 676
                                                                                                                       //
      this._debug("[_handleUpload] [EXCEPTION:]", e);                                                                  // 677
                                                                                                                       //
      cb && cb(e);                                                                                                     // 678
    }                                                                                                                  // 907
  }; /*                                                                                                                // 667
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _getMimeType                                                                                                //
     @param {Object} fileData - File Object                                                                            //
     @summary Returns file's mime-type                                                                                 //
     @returns {String}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._getMimeType = function (fileData) {                                                       // 920
    var br, buf, error, ext, fd, mime, ref;                                                                            // 690
    check(fileData, Object);                                                                                           // 690
                                                                                                                       //
    if (fileData != null ? fileData.type : void 0) {                                                                   // 691
      mime = fileData.type;                                                                                            // 691
    }                                                                                                                  // 925
                                                                                                                       //
    if (fileData.path && (!mime || !_.isString(mime))) {                                                               // 692
      try {                                                                                                            // 693
        buf = new Buffer(262);                                                                                         // 694
        fd = fs.openSync(fileData.path, 'r');                                                                          // 695
        br = fs.readSync(fd, buf, 0, 262, 0);                                                                          // 696
        fs.close(fd, NOOP);                                                                                            // 697
                                                                                                                       //
        if (br < 262) {                                                                                                // 698
          buf = buf.slice(0, br);                                                                                      // 698
        }                                                                                                              // 934
                                                                                                                       //
        ref = fileType(buf), mime = ref.mime, ext = ref.ext;                                                           // 699
      } catch (error1) {                                                                                               // 693
        error = error1;                                                                                                // 700
      }                                                                                                                // 692
    }                                                                                                                  // 939
                                                                                                                       //
    if (!mime || !_.isString(mime)) {                                                                                  // 701
      mime = 'application/octet-stream';                                                                               // 702
    }                                                                                                                  // 942
                                                                                                                       //
    return mime;                                                                                                       // 703
  }; /*                                                                                                                // 689
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _getUser                                                                                                    //
     @summary Returns object with `userId` and `user()` method which return user's object                              //
     @returns {Object}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._getUser = function (http) {                                                               // 955
    var cookie, mtok, ref, ref1, result, userId;                                                                       // 713
    result = {                                                                                                         // 713
      user: function () {                                                                                              // 714
        return null;                                                                                                   // 714
      },                                                                                                               // 714
      userId: null                                                                                                     // 715
    };                                                                                                                 // 714
                                                                                                                       //
    if (http) {                                                                                                        // 717
      mtok = null;                                                                                                     // 718
                                                                                                                       //
      if (http.request.headers['x-mtok']) {                                                                            // 719
        mtok = http.request.headers['x-mtok'];                                                                         // 720
      } else {                                                                                                         // 719
        cookie = http.request.Cookies;                                                                                 // 722
                                                                                                                       //
        if (cookie.has('x_mtok')) {                                                                                    // 723
          mtok = cookie.get('x_mtok');                                                                                 // 724
        }                                                                                                              // 719
      }                                                                                                                // 972
                                                                                                                       //
      if (mtok) {                                                                                                      // 726
        userId = (ref = Meteor.server.sessions) != null ? (ref1 = ref[mtok]) != null ? ref1.userId : void 0 : void 0;  // 727
                                                                                                                       //
        if (userId) {                                                                                                  // 728
          result.user = function () {                                                                                  // 729
            return Meteor.users.findOne(userId);                                                                       // 977
          };                                                                                                           // 729
                                                                                                                       //
          result.userId = userId;                                                                                      // 730
        }                                                                                                              // 726
      }                                                                                                                // 717
    }                                                                                                                  // 982
                                                                                                                       //
    return result;                                                                                                     // 732
  }; /*                                                                                                                // 712
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name write                                                                                                       //
     @param {Buffer} buffer - Binary File's Buffer                                                                     //
     @param {Object} opts - Object with file-data                                                                      //
     @param {String} opts.name - File name, alias: `fileName`                                                          //
     @param {String} opts.type - File mime-type                                                                        //
     @param {Object} opts.meta - File additional meta-data                                                             //
     @param {String} opts.userId - UserId, default *null*                                                              //
     @param {String} opts.fileId - _id, default *null*                                                                 //
     @param {Function} callback - function(error, fileObj){...}                                                        //
     @param {Boolean} proceedAfterUpload - Proceed onAfterUpload hook                                                  //
     @summary Write buffer to FS and add to FilesCollection Collection                                                 //
     @returns {FilesCollection} Instance                                                                               //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.write = function (buffer, opts, callback, proceedAfterUpload) {                            // 1004
    var FSName, extension, extensionWithDot, fileId, fileName, ref, result, self, stream;                              // 751
                                                                                                                       //
    if (opts == null) {                                                                                                // 1006
      opts = {};                                                                                                       // 750
    }                                                                                                                  // 1008
                                                                                                                       //
    this._debug('[FilesCollection] [write()]');                                                                        // 751
                                                                                                                       //
    if (_.isFunction(opts)) {                                                                                          // 753
      proceedAfterUpload = callback;                                                                                   // 754
      callback = opts;                                                                                                 // 755
      opts = {};                                                                                                       // 756
    } else if (_.isBoolean(callback)) {                                                                                // 753
      proceedAfterUpload = callback;                                                                                   // 758
    } else if (_.isBoolean(opts)) {                                                                                    // 757
      proceedAfterUpload = opts;                                                                                       // 760
    }                                                                                                                  // 1018
                                                                                                                       //
    check(opts, Match.Optional(Object));                                                                               // 762
    check(callback, Match.Optional(Function));                                                                         // 763
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                // 764
    fileId = opts.fileId || Random.id();                                                                               // 766
    FSName = this.namingFunction ? this.namingFunction(opts) : fileId;                                                 // 767
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : FSName;                                       // 768
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  // 770
    self = this;                                                                                                       // 772
                                                                                                                       //
    if (opts == null) {                                                                                                // 1027
      opts = {};                                                                                                       // 773
    }                                                                                                                  // 1029
                                                                                                                       //
    opts.path = "" + this.storagePath(opts) + nodePath.sep + FSName + extensionWithDot;                                // 774
    opts.type = this._getMimeType(opts);                                                                               // 775
                                                                                                                       //
    if (opts.meta == null) {                                                                                           // 1032
      opts.meta = {};                                                                                                  // 776
    }                                                                                                                  // 1034
                                                                                                                       //
    if (opts.size == null) {                                                                                           // 1035
      opts.size = buffer.length;                                                                                       // 777
    }                                                                                                                  // 1037
                                                                                                                       //
    result = this._dataToSchema({                                                                                      // 779
      name: fileName,                                                                                                  // 780
      path: opts.path,                                                                                                 // 781
      meta: opts.meta,                                                                                                 // 782
      type: opts.type,                                                                                                 // 783
      size: opts.size,                                                                                                 // 784
      userId: opts.userId,                                                                                             // 785
      extension: extension                                                                                             // 786
    });                                                                                                                // 780
    result._id = fileId;                                                                                               // 788
    stream = fs.createWriteStream(opts.path, {                                                                         // 790
      flags: 'w',                                                                                                      // 790
      mode: this.permissions                                                                                           // 790
    });                                                                                                                // 790
    stream.end(buffer, function (error) {                                                                              // 791
      return bound(function () {                                                                                       // 1053
        if (error) {                                                                                                   // 792
          callback && callback(error);                                                                                 // 793
        } else {                                                                                                       // 792
          self.collection.insert(result, function (error, _id) {                                                       // 795
            var fileRef;                                                                                               // 796
                                                                                                                       //
            if (error) {                                                                                               // 796
              callback && callback(error);                                                                             // 797
                                                                                                                       //
              self._debug("[FilesCollection] [write] [insert] Error: " + fileName + " -> " + self.collectionName, error);
            } else {                                                                                                   // 796
              fileRef = self.collection.findOne(_id);                                                                  // 800
              callback && callback(null, fileRef);                                                                     // 801
                                                                                                                       //
              if (proceedAfterUpload === true) {                                                                       // 802
                self.onAfterUpload && self.onAfterUpload.call(self, fileRef);                                          // 803
                self.emit('afterUpload', fileRef);                                                                     // 804
              }                                                                                                        // 1068
                                                                                                                       //
              self._debug("[FilesCollection] [write]: " + fileName + " -> " + self.collectionName);                    // 805
            }                                                                                                          // 1070
          });                                                                                                          // 795
        }                                                                                                              // 1072
      });                                                                                                              // 791
    });                                                                                                                // 791
    return this;                                                                                                       // 808
  }; /*                                                                                                                // 750
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name load                                                                                                        //
     @param {String} url - URL to file                                                                                 //
     @param {Object} opts - Object with file-data                                                                      //
     @param {String} opts.name - File name, alias: `fileName`                                                          //
     @param {String} opts.type - File mime-type                                                                        //
     @param {Object} opts.meta - File additional meta-data                                                             //
     @param {String} opts.userId - UserId, default *null*                                                              //
     @param {String} opts.fileId - _id, default *null*                                                                 //
     @param {Function} callback - function(error, fileObj){...}                                                        //
     @param {Boolean} proceedAfterUpload - Proceed onAfterUpload hook                                                  //
     @summary Download file, write stream to FS and add to FilesCollection Collection                                  //
     @returns {FilesCollection} Instance                                                                               //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.load = function (url, opts, callback, proceedAfterUpload) {                                // 1096
    var FSName, extension, extensionWithDot, fileId, fileName, pathParts, ref, self, storeResult;                      // 827
                                                                                                                       //
    this._debug("[FilesCollection] [load(" + url + ", " + JSON.stringify(opts) + ", callback)]");                      // 827
                                                                                                                       //
    if (_.isFunction(opts)) {                                                                                          // 829
      proceedAfterUpload = callback;                                                                                   // 830
      callback = opts;                                                                                                 // 831
      opts = {};                                                                                                       // 832
    } else if (_.isBoolean(callback)) {                                                                                // 829
      proceedAfterUpload = callback;                                                                                   // 834
    } else if (_.isBoolean(opts)) {                                                                                    // 833
      proceedAfterUpload = opts;                                                                                       // 836
    }                                                                                                                  // 1107
                                                                                                                       //
    check(url, String);                                                                                                // 838
    check(opts, Match.Optional(Object));                                                                               // 839
    check(callback, Match.Optional(Function));                                                                         // 840
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                // 841
    self = this;                                                                                                       // 843
                                                                                                                       //
    if (opts == null) {                                                                                                // 1113
      opts = {};                                                                                                       // 844
    }                                                                                                                  // 1115
                                                                                                                       //
    fileId = opts.fileId || Random.id();                                                                               // 845
    FSName = this.namingFunction ? this.namingFunction(opts) : fileId;                                                 // 846
    pathParts = url.split('/');                                                                                        // 847
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : pathParts[pathParts.length - 1] || FSName;    // 848
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  // 850
                                                                                                                       //
    if (opts.meta == null) {                                                                                           // 1121
      opts.meta = {};                                                                                                  // 851
    }                                                                                                                  // 1123
                                                                                                                       //
    opts.path = "" + this.storagePath(opts) + nodePath.sep + FSName + extensionWithDot;                                // 852
                                                                                                                       //
    storeResult = function (result, callback) {                                                                        // 854
      result._id = fileId;                                                                                             // 855
      self.collection.insert(result, function (error, _id) {                                                           // 857
        var fileRef;                                                                                                   // 858
                                                                                                                       //
        if (error) {                                                                                                   // 858
          callback && callback(error);                                                                                 // 859
                                                                                                                       //
          self._debug("[FilesCollection] [load] [insert] Error: " + fileName + " -> " + self.collectionName, error);   // 860
        } else {                                                                                                       // 858
          fileRef = self.collection.findOne(_id);                                                                      // 862
          callback && callback(null, fileRef);                                                                         // 863
                                                                                                                       //
          if (proceedAfterUpload === true) {                                                                           // 864
            self.onAfterUpload && self.onAfterUpload.call(self, fileRef);                                              // 865
            self.emit('afterUpload', fileRef);                                                                         // 866
          }                                                                                                            // 1138
                                                                                                                       //
          self._debug("[FilesCollection] [load] [insert] " + fileName + " -> " + self.collectionName);                 // 867
        }                                                                                                              // 1140
      });                                                                                                              // 857
    };                                                                                                                 // 854
                                                                                                                       //
    request.get(url).on('error', function (error) {                                                                    // 871
      return bound(function () {                                                                                       // 1144
        callback && callback(error);                                                                                   // 872
        return self._debug("[FilesCollection] [load] [request.get(" + url + ")] Error:", error);                       // 1146
      });                                                                                                              // 871
    }).on('response', function (response) {                                                                            // 871
      return bound(function () {                                                                                       // 1149
        response.on('end', function () {                                                                               // 875
          return bound(function () {                                                                                   // 1151
            var result;                                                                                                // 876
                                                                                                                       //
            self._debug("[FilesCollection] [load] Received: " + url);                                                  // 876
                                                                                                                       //
            result = self._dataToSchema({                                                                              // 877
              name: fileName,                                                                                          // 878
              path: opts.path,                                                                                         // 879
              meta: opts.meta,                                                                                         // 880
              type: opts.type || response.headers['content-type'] || self._getMimeType({                               // 881
                path: opts.path                                                                                        // 881
              }),                                                                                                      // 881
              size: opts.size || parseInt(response.headers['content-length'] || 0),                                    // 882
              userId: opts.userId,                                                                                     // 883
              extension: extension                                                                                     // 884
            });                                                                                                        // 878
                                                                                                                       //
            if (!result.size) {                                                                                        // 886
              fs.stat(opts.path, function (error, stats) {                                                             // 887
                return bound(function () {                                                                             // 1167
                  if (error) {                                                                                         // 888
                    callback && callback(error);                                                                       // 889
                  } else {                                                                                             // 888
                    result.versions.original.size = result.size = stats.size;                                          // 891
                    storeResult(result, callback);                                                                     // 892
                  }                                                                                                    // 1173
                });                                                                                                    // 887
              });                                                                                                      // 887
            } else {                                                                                                   // 886
              storeResult(result, callback);                                                                           // 895
            }                                                                                                          // 1178
          });                                                                                                          // 875
        });                                                                                                            // 875
      });                                                                                                              // 874
    }).pipe(fs.createWriteStream(opts.path, {                                                                          // 871
      flags: 'w',                                                                                                      // 899
      mode: this.permissions                                                                                           // 899
    }));                                                                                                               // 899
    return this;                                                                                                       // 901
  }; /*                                                                                                                // 826
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name addFile                                                                                                     //
     @param {String} path          - Path to file                                                                      //
     @param {String} opts          - [Optional] Object with file-data                                                  //
     @param {String} opts.type     - [Optional] File mime-type                                                         //
     @param {Object} opts.meta     - [Optional] File additional meta-data                                              //
     @param {Object} opts.fileName - [Optional] File name, if not specified file name and extension will be taken from path
     @param {String} opts.userId   - [Optional] UserId, default *null*                                                 //
     @param {Function} callback    - [Optional] function(error, fileObj){...}                                          //
     @param {Boolean} proceedAfterUpload - Proceed onAfterUpload hook                                                  //
     @summary Add file from FS to FilesCollection                                                                      //
     @returns {FilesCollection} Instance                                                                               //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.addFile = function (path, opts, callback, proceedAfterUpload) {                            // 1206
    var self;                                                                                                          // 919
                                                                                                                       //
    this._debug("[FilesCollection] [addFile(" + path + ")]");                                                          // 919
                                                                                                                       //
    if (_.isFunction(opts)) {                                                                                          // 921
      proceedAfterUpload = callback;                                                                                   // 922
      callback = opts;                                                                                                 // 923
      opts = {};                                                                                                       // 924
    } else if (_.isBoolean(callback)) {                                                                                // 921
      proceedAfterUpload = callback;                                                                                   // 926
    } else if (_.isBoolean(opts)) {                                                                                    // 925
      proceedAfterUpload = opts;                                                                                       // 928
    }                                                                                                                  // 1217
                                                                                                                       //
    if (this["public"]) {                                                                                              // 930
      throw new Meteor.Error(403, 'Can not run [addFile] on public collection! Just Move file to root of your server, then add record to Collection');
    }                                                                                                                  // 1220
                                                                                                                       //
    check(path, String);                                                                                               // 931
    check(opts, Match.Optional(Object));                                                                               // 932
    check(callback, Match.Optional(Function));                                                                         // 933
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                // 934
    self = this;                                                                                                       // 936
    fs.stat(path, function (error, stats) {                                                                            // 937
      return bound(function () {                                                                                       // 1227
        var extension, extensionWithDot, pathParts, ref, result;                                                       // 938
                                                                                                                       //
        if (error) {                                                                                                   // 938
          callback && callback(error);                                                                                 // 939
        } else if (stats.isFile()) {                                                                                   // 938
          if (opts == null) {                                                                                          // 1232
            opts = {};                                                                                                 // 941
          }                                                                                                            // 1234
                                                                                                                       //
          opts.path = path;                                                                                            // 942
                                                                                                                       //
          if (!opts.fileName) {                                                                                        // 944
            pathParts = path.split(nodePath.sep);                                                                      // 945
            opts.fileName = pathParts[pathParts.length - 1];                                                           // 946
          }                                                                                                            // 1239
                                                                                                                       //
          ref = self._getExt(opts.fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;       // 948
                                                                                                                       //
          if (opts.type == null) {                                                                                     // 1241
            opts.type = self._getMimeType(opts);                                                                       // 950
          }                                                                                                            // 1243
                                                                                                                       //
          if (opts.meta == null) {                                                                                     // 1244
            opts.meta = {};                                                                                            // 951
          }                                                                                                            // 1246
                                                                                                                       //
          if (opts.size == null) {                                                                                     // 1247
            opts.size = stats.size;                                                                                    // 952
          }                                                                                                            // 1249
                                                                                                                       //
          result = self._dataToSchema({                                                                                // 954
            name: opts.fileName,                                                                                       // 955
            path: path,                                                                                                // 956
            meta: opts.meta,                                                                                           // 957
            type: opts.type,                                                                                           // 958
            size: opts.size,                                                                                           // 959
            userId: opts.userId,                                                                                       // 960
            extension: extension,                                                                                      // 961
            _storagePath: path.replace("" + nodePath.sep + opts.fileName, ''),                                         // 962
            fileId: opts.fileId || null                                                                                // 963
          });                                                                                                          // 955
          self.collection.insert(result, function (error, _id) {                                                       // 966
            var fileRef;                                                                                               // 967
                                                                                                                       //
            if (error) {                                                                                               // 967
              callback && callback(error);                                                                             // 968
                                                                                                                       //
              self._debug("[FilesCollection] [addFile] [insert] Error: " + result.name + " -> " + self.collectionName, error);
            } else {                                                                                                   // 967
              fileRef = self.collection.findOne(_id);                                                                  // 971
              callback && callback(null, fileRef);                                                                     // 972
                                                                                                                       //
              if (proceedAfterUpload === true) {                                                                       // 973
                self.onAfterUpload && self.onAfterUpload.call(self, fileRef);                                          // 974
                self.emit('afterUpload', fileRef);                                                                     // 975
              }                                                                                                        // 1272
                                                                                                                       //
              self._debug("[FilesCollection] [addFile]: " + result.name + " -> " + self.collectionName);               // 976
            }                                                                                                          // 1274
          });                                                                                                          // 966
        } else {                                                                                                       // 940
          callback && callback(new Meteor.Error(400, "[FilesCollection] [addFile(" + path + ")]: File does not exist"));
        }                                                                                                              // 1278
      });                                                                                                              // 937
    });                                                                                                                // 937
    return this;                                                                                                       // 981
  }; /*                                                                                                                // 918
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name remove                                                                                                      //
     @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)    //
     @param {Function} callback - Callback with one `error` argument                                                   //
     @summary Remove documents from the collection                                                                     //
     @returns {FilesCollection} Instance                                                                               //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.remove = function (selector, callback) {                                                   // 1295
    var docs, files, self;                                                                                             // 993
                                                                                                                       //
    if (selector == null) {                                                                                            // 1297
      selector = {};                                                                                                   // 992
    }                                                                                                                  // 1299
                                                                                                                       //
    this._debug("[FilesCollection] [remove(" + JSON.stringify(selector) + ")]");                                       // 993
                                                                                                                       //
    check(selector, Match.OneOf(Object, String));                                                                      // 994
    check(callback, Match.Optional(Function));                                                                         // 995
    files = this.collection.find(selector);                                                                            // 997
                                                                                                                       //
    if (files.count() > 0) {                                                                                           // 998
      self = this;                                                                                                     // 999
      files.forEach(function (file) {                                                                                  // 1000
        self.unlink(file);                                                                                             // 1001
      });                                                                                                              // 1000
    } else {                                                                                                           // 998
      callback && callback(new Meteor.Error(404, 'Cursor is empty, no files is removed'));                             // 1004
      return this;                                                                                                     // 1005
    }                                                                                                                  // 1312
                                                                                                                       //
    if (this.onAfterRemove) {                                                                                          // 1007
      self = this;                                                                                                     // 1008
      docs = files.fetch();                                                                                            // 1009
      this.collection.remove(selector, function () {                                                                   // 1011
        callback && callback.apply(this, arguments);                                                                   // 1012
        self.onAfterRemove(docs);                                                                                      // 1013
      });                                                                                                              // 1011
    } else {                                                                                                           // 1007
      this.collection.remove(selector, callback || NOOP);                                                              // 1016
    }                                                                                                                  // 1322
                                                                                                                       //
    return this;                                                                                                       // 1017
  }; /*                                                                                                                // 992
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name deny                                                                                                        //
     @param {Object} rules                                                                                             //
     @see  https://docs.meteor.com/api/collections.html#Mongo-Collection-deny                                          //
     @summary link Mongo.Collection deny methods                                                                       //
     @returns {Mongo.Collection} Instance                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.deny = function (rules) {                                                                  // 1337
    this.collection.deny(rules);                                                                                       // 1029
    return this.collection;                                                                                            // 1030
  }; /*                                                                                                                // 1028
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name allow                                                                                                       //
     @param {Object} rules                                                                                             //
     @see https://docs.meteor.com/api/collections.html#Mongo-Collection-allow                                          //
     @summary link Mongo.Collection allow methods                                                                      //
     @returns {Mongo.Collection} Instance                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.allow = function (rules) {                                                                 // 1353
    this.collection.allow(rules);                                                                                      // 1042
    return this.collection;                                                                                            // 1043
  }; /*                                                                                                                // 1041
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name denyClient                                                                                                  //
     @see https://docs.meteor.com/api/collections.html#Mongo-Collection-deny                                           //
     @summary Shorthands for Mongo.Collection deny method                                                              //
     @returns {Mongo.Collection} Instance                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.denyClient = function () {                                                                 // 1368
    this.collection.deny({                                                                                             // 1054
      insert: function () {                                                                                            // 1055
        return true;                                                                                                   // 1371
      },                                                                                                               // 1055
      update: function () {                                                                                            // 1056
        return true;                                                                                                   // 1374
      },                                                                                                               // 1055
      remove: function () {                                                                                            // 1057
        return true;                                                                                                   // 1377
      }                                                                                                                // 1055
    });                                                                                                                // 1055
    return this.collection;                                                                                            // 1058
  }; /*                                                                                                                // 1053
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name allowClient                                                                                                 //
     @see https://docs.meteor.com/api/collections.html#Mongo-Collection-allow                                          //
     @summary Shorthands for Mongo.Collection allow method                                                             //
     @returns {Mongo.Collection} Instance                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.allowClient = function () {                                                                // 1393
    this.collection.allow({                                                                                            // 1069
      insert: function () {                                                                                            // 1070
        return true;                                                                                                   // 1396
      },                                                                                                               // 1070
      update: function () {                                                                                            // 1071
        return true;                                                                                                   // 1399
      },                                                                                                               // 1070
      remove: function () {                                                                                            // 1072
        return true;                                                                                                   // 1402
      }                                                                                                                // 1070
    });                                                                                                                // 1070
    return this.collection;                                                                                            // 1073
  }; /*                                                                                                                // 1068
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name unlink                                                                                                      //
     @param {Object} fileRef - fileObj                                                                                 //
     @param {String} version - [Optional] file's version                                                               //
     @param {Function} callback - [Optional] callback function                                                         //
     @summary Unlink files and it's versions from FS                                                                   //
     @returns {FilesCollection} Instance                                                                               //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.unlink = function (fileRef, version, callback) {                                           // 1420
    var ref, ref1;                                                                                                     // 1087
                                                                                                                       //
    this._debug("[FilesCollection] [unlink(" + fileRef._id + ", " + version + ")]");                                   // 1087
                                                                                                                       //
    if (version) {                                                                                                     // 1088
      if (((ref = fileRef.versions) != null ? ref[version] : void 0) && ((ref1 = fileRef.versions[version]) != null ? ref1.path : void 0)) {
        fs.unlink(fileRef.versions[version].path, callback || NOOP);                                                   // 1090
      }                                                                                                                // 1088
    } else {                                                                                                           // 1088
      if (fileRef.versions && !_.isEmpty(fileRef.versions)) {                                                          // 1092
        _.each(fileRef.versions, function (vRef) {                                                                     // 1093
          return bound(function () {                                                                                   // 1430
            fs.unlink(vRef.path, callback || NOOP);                                                                    // 1094
          });                                                                                                          // 1093
        });                                                                                                            // 1093
      } else {                                                                                                         // 1092
        fs.unlink(fileRef.path, callback || NOOP);                                                                     // 1097
      }                                                                                                                // 1088
    }                                                                                                                  // 1437
                                                                                                                       //
    return this;                                                                                                       // 1098
  }; /*                                                                                                                // 1086
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name _404                                                                                                        //
     @summary Internal method, used to return 404 error                                                                //
     @returns {undefined}                                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._404 = function (http) {                                                                   // 1450
    var text;                                                                                                          // 1108
                                                                                                                       //
    this._debug("[FilesCollection] [download(" + http.request.originalUrl + ")] [_404] File not found");               // 1108
                                                                                                                       //
    text = 'File Not Found :(';                                                                                        // 1109
                                                                                                                       //
    if (!http.response.headersSent) {                                                                                  // 1111
      http.response.writeHead(404, {                                                                                   // 1112
        'Content-Length': text.length,                                                                                 // 1113
        'Content-Type': 'text/plain'                                                                                   // 1114
      });                                                                                                              // 1113
    }                                                                                                                  // 1459
                                                                                                                       //
    if (!http.response.finished) {                                                                                     // 1115
      http.response.end(text);                                                                                         // 1116
    }                                                                                                                  // 1462
  }; /*                                                                                                                // 1107
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name download                                                                                                    //
     @param {Object} http    - Server HTTP object                                                                      //
     @param {String} version - Requested file version                                                                  //
     @param {Object} fileRef - Requested file Object                                                                   //
     @summary Initiates the HTTP response                                                                              //
     @returns {undefined}                                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.download = function (http, version, fileRef) {                                             // 1477
    var self, vRef;                                                                                                    // 1130
                                                                                                                       //
    if (version == null) {                                                                                             // 1479
      version = 'original';                                                                                            // 1129
    }                                                                                                                  // 1481
                                                                                                                       //
    this._debug("[FilesCollection] [download(" + http.request.originalUrl + ", " + version + ")]");                    // 1130
                                                                                                                       //
    if (fileRef) {                                                                                                     // 1131
      if (_.has(fileRef, 'versions') && _.has(fileRef.versions, version)) {                                            // 1132
        vRef = fileRef.versions[version];                                                                              // 1133
        vRef._id = fileRef._id;                                                                                        // 1134
      } else {                                                                                                         // 1132
        vRef = fileRef;                                                                                                // 1136
      }                                                                                                                // 1131
    } else {                                                                                                           // 1131
      vRef = false;                                                                                                    // 1138
    }                                                                                                                  // 1492
                                                                                                                       //
    if (!vRef || !_.isObject(vRef)) {                                                                                  // 1140
      return this._404(http);                                                                                          // 1141
    } else if (fileRef) {                                                                                              // 1140
      self = this;                                                                                                     // 1143
                                                                                                                       //
      if (this.downloadCallback) {                                                                                     // 1145
        if (!this.downloadCallback.call(_.extend(http, this._getUser(http)), fileRef)) {                               // 1146
          return this._404(http);                                                                                      // 1147
        }                                                                                                              // 1145
      }                                                                                                                // 1501
                                                                                                                       //
      if (this.interceptDownload && _.isFunction(this.interceptDownload)) {                                            // 1149
        if (this.interceptDownload(http, fileRef, version) === true) {                                                 // 1150
          return;                                                                                                      // 1151
        }                                                                                                              // 1149
      }                                                                                                                // 1506
                                                                                                                       //
      fs.stat(vRef.path, function (statErr, stats) {                                                                   // 1153
        return bound(function () {                                                                                     // 1508
          var responseType;                                                                                            // 1154
                                                                                                                       //
          if (statErr || !stats.isFile()) {                                                                            // 1154
            return self._404(http);                                                                                    // 1155
          }                                                                                                            // 1512
                                                                                                                       //
          if (stats.size !== vRef.size && !self.integrityCheck) {                                                      // 1157
            vRef.size = stats.size;                                                                                    // 1157
          }                                                                                                            // 1515
                                                                                                                       //
          if (stats.size !== vRef.size && self.integrityCheck) {                                                       // 1158
            responseType = '400';                                                                                      // 1158
          }                                                                                                            // 1518
                                                                                                                       //
          return self.serve(http, fileRef, vRef, version, null, responseType || '200');                                // 1519
        });                                                                                                            // 1153
      });                                                                                                              // 1153
    } else {                                                                                                           // 1142
      return this._404(http);                                                                                          // 1162
    }                                                                                                                  // 1524
  }; /*                                                                                                                // 1129
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name serve                                                                                                       //
     @param {Object} http    - Server HTTP object                                                                      //
     @param {Object} fileRef - Requested file Object                                                                   //
     @param {Object} vRef    - Requested file version Object                                                           //
     @param {String} version - Requested file version                                                                  //
     @param {stream.Readable|null} readableStream - Readable stream, which serves binary file data                     //
     @param {String} responseType - Response code                                                                      //
     @param {Boolean} force200 - Force 200 response code over 206                                                      //
     @summary Handle and reply to incoming request                                                                     //
     @returns {undefined}                                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.serve = function (http, fileRef, vRef, version, readableStream, responseType, force200) {  // 1543
    var array, dispositionEncoding, dispositionName, dispositionType, end, headers, key, partiral, reqRange, self, start, stream, streamErrorHandler, take, text, value;
                                                                                                                       //
    if (version == null) {                                                                                             // 1545
      version = 'original';                                                                                            // 1178
    }                                                                                                                  // 1547
                                                                                                                       //
    if (readableStream == null) {                                                                                      // 1548
      readableStream = null;                                                                                           // 1178
    }                                                                                                                  // 1550
                                                                                                                       //
    if (responseType == null) {                                                                                        // 1551
      responseType = '200';                                                                                            // 1178
    }                                                                                                                  // 1553
                                                                                                                       //
    if (force200 == null) {                                                                                            // 1554
      force200 = false;                                                                                                // 1178
    }                                                                                                                  // 1556
                                                                                                                       //
    self = this;                                                                                                       // 1179
    partiral = false;                                                                                                  // 1180
    reqRange = false;                                                                                                  // 1181
                                                                                                                       //
    if (http.params.query.download && http.params.query.download === 'true') {                                         // 1183
      dispositionType = 'attachment; ';                                                                                // 1184
    } else {                                                                                                           // 1183
      dispositionType = 'inline; ';                                                                                    // 1186
    }                                                                                                                  // 1564
                                                                                                                       //
    dispositionName = "filename=\"" + encodeURI(vRef.name || fileRef.name) + "\"; filename*=UTF-8''" + encodeURI(vRef.name || fileRef.name) + "; ";
    dispositionEncoding = 'charset=UTF-8';                                                                             // 1189
                                                                                                                       //
    if (!http.response.headersSent) {                                                                                  // 1191
      http.response.setHeader('Content-Disposition', dispositionType + dispositionName + dispositionEncoding);         // 1192
    }                                                                                                                  // 1569
                                                                                                                       //
    if (http.request.headers.range && !force200) {                                                                     // 1194
      partiral = true;                                                                                                 // 1195
      array = http.request.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);                                             // 1196
      start = parseInt(array[1]);                                                                                      // 1197
      end = parseInt(array[2]);                                                                                        // 1198
                                                                                                                       //
      if (isNaN(end)) {                                                                                                // 1199
        end = vRef.size - 1;                                                                                           // 1199
      }                                                                                                                // 1577
                                                                                                                       //
      take = end - start;                                                                                              // 1200
    } else {                                                                                                           // 1194
      start = 0;                                                                                                       // 1202
      end = vRef.size - 1;                                                                                             // 1203
      take = vRef.size;                                                                                                // 1204
    }                                                                                                                  // 1583
                                                                                                                       //
    if (partiral || http.params.query.play && http.params.query.play === 'true') {                                     // 1206
      reqRange = {                                                                                                     // 1207
        start: start,                                                                                                  // 1207
        end: end                                                                                                       // 1207
      };                                                                                                               // 1207
                                                                                                                       //
      if (isNaN(start) && !isNaN(end)) {                                                                               // 1208
        reqRange.start = end - take;                                                                                   // 1209
        reqRange.end = end;                                                                                            // 1210
      }                                                                                                                // 1592
                                                                                                                       //
      if (!isNaN(start) && isNaN(end)) {                                                                               // 1211
        reqRange.start = start;                                                                                        // 1212
        reqRange.end = start + take;                                                                                   // 1213
      }                                                                                                                // 1596
                                                                                                                       //
      if (start + take >= vRef.size) {                                                                                 // 1215
        reqRange.end = vRef.size - 1;                                                                                  // 1215
      }                                                                                                                // 1599
                                                                                                                       //
      if (self.strict && (reqRange.start >= vRef.size - 1 || reqRange.end > vRef.size - 1)) {                          // 1217
        responseType = '416';                                                                                          // 1218
      } else {                                                                                                         // 1217
        responseType = '206';                                                                                          // 1220
      }                                                                                                                // 1206
    } else {                                                                                                           // 1206
      responseType = '200';                                                                                            // 1222
    }                                                                                                                  // 1607
                                                                                                                       //
    streamErrorHandler = function (error) {                                                                            // 1224
      self._debug("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [500]", error);                       // 1225
                                                                                                                       //
      if (!http.response.finished) {                                                                                   // 1226
        http.response.end(error.toString());                                                                           // 1227
      }                                                                                                                // 1612
    };                                                                                                                 // 1224
                                                                                                                       //
    headers = _.isFunction(self.responseHeaders) ? self.responseHeaders(responseType, fileRef, vRef, version) : self.responseHeaders;
                                                                                                                       //
    if (!headers['Cache-Control']) {                                                                                   // 1232
      if (!http.response.headersSent) {                                                                                // 1233
        http.response.setHeader('Cache-Control', self.cacheControl);                                                   // 1234
      }                                                                                                                // 1232
    }                                                                                                                  // 1619
                                                                                                                       //
    for (key in meteorBabelHelpers.sanitizeForInObject(headers)) {                                                     // 1236
      value = headers[key];                                                                                            // 1621
                                                                                                                       //
      if (!http.response.headersSent) {                                                                                // 1237
        http.response.setHeader(key, value);                                                                           // 1238
      }                                                                                                                // 1624
    }                                                                                                                  // 1236
                                                                                                                       //
    switch (responseType) {                                                                                            // 1240
      case '400':                                                                                                      // 1240
        self._debug("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [400] Content-Length mismatch!");   // 1242
                                                                                                                       //
        text = 'Content-Length mismatch!';                                                                             // 1243
                                                                                                                       //
        if (!http.response.headersSent) {                                                                              // 1245
          http.response.writeHead(400, {                                                                               // 1246
            'Content-Type': 'text/plain',                                                                              // 1247
            'Content-Length': text.length                                                                              // 1248
          });                                                                                                          // 1247
        }                                                                                                              // 1635
                                                                                                                       //
        if (!http.response.finished) {                                                                                 // 1249
          http.response.end(text);                                                                                     // 1250
        }                                                                                                              // 1638
                                                                                                                       //
        break;                                                                                                         // 1251
                                                                                                                       //
      case '404':                                                                                                      // 1240
        return self._404(http);                                                                                        // 1253
        break;                                                                                                         // 1254
                                                                                                                       //
      case '416':                                                                                                      // 1240
        self._debug("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [416] Content-Range is not specified!");
                                                                                                                       //
        if (!http.response.headersSent) {                                                                              // 1257
          http.response.writeHead(416);                                                                                // 1258
        }                                                                                                              // 1647
                                                                                                                       //
        if (!http.response.finished) {                                                                                 // 1259
          http.response.end();                                                                                         // 1260
        }                                                                                                              // 1650
                                                                                                                       //
        break;                                                                                                         // 1261
                                                                                                                       //
      case '200':                                                                                                      // 1240
        self._debug("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [200]");                            // 1263
                                                                                                                       //
        stream = readableStream || fs.createReadStream(vRef.path);                                                     // 1264
                                                                                                                       //
        if (!http.response.headersSent) {                                                                              // 1265
          if (readableStream) {                                                                                        // 1266
            http.response.writeHead(200);                                                                              // 1266
          }                                                                                                            // 1265
        }                                                                                                              // 1659
                                                                                                                       //
        http.response.on('close', function () {                                                                        // 1268
          if (typeof stream.abort === "function") {                                                                    // 1661
            stream.abort();                                                                                            // 1269
          }                                                                                                            // 1663
                                                                                                                       //
          if (typeof stream.end === "function") {                                                                      // 1664
            stream.end();                                                                                              // 1270
          }                                                                                                            // 1666
        });                                                                                                            // 1268
        http.request.on('abort', function () {                                                                         // 1273
          if (typeof stream.abort === "function") {                                                                    // 1669
            stream.abort();                                                                                            // 1274
          }                                                                                                            // 1671
                                                                                                                       //
          if (typeof stream.end === "function") {                                                                      // 1672
            stream.end();                                                                                              // 1275
          }                                                                                                            // 1674
        });                                                                                                            // 1273
        stream.on('open', function () {                                                                                // 1278
          if (!http.response.headersSent) {                                                                            // 1279
            http.response.writeHead(200);                                                                              // 1280
          }                                                                                                            // 1679
        }).on('abort', function () {                                                                                   // 1278
          if (!http.response.finished) {                                                                               // 1283
            http.response.end();                                                                                       // 1284
          }                                                                                                            // 1683
                                                                                                                       //
          if (!http.request.aborted) {                                                                                 // 1285
            http.request.abort();                                                                                      // 1286
          }                                                                                                            // 1686
        }).on('error', streamErrorHandler).on('end', function () {                                                     // 1278
          if (!http.response.finished) {                                                                               // 1290
            http.response.end();                                                                                       // 1291
          }                                                                                                            // 1690
        });                                                                                                            // 1278
                                                                                                                       //
        if (self.throttle) {                                                                                           // 1293
          stream.pipe(new Throttle({                                                                                   // 1293
            bps: self.throttle,                                                                                        // 1293
            chunksize: self.chunkSize                                                                                  // 1293
          }));                                                                                                         // 1293
        }                                                                                                              // 1697
                                                                                                                       //
        stream.pipe(http.response);                                                                                    // 1294
        break;                                                                                                         // 1295
                                                                                                                       //
      case '206':                                                                                                      // 1240
        self._debug("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [206]");                            // 1297
                                                                                                                       //
        if (!http.response.headersSent) {                                                                              // 1298
          http.response.setHeader('Content-Range', "bytes " + reqRange.start + "-" + reqRange.end + "/" + vRef.size);  // 1299
        }                                                                                                              // 1704
                                                                                                                       //
        stream = readableStream || fs.createReadStream(vRef.path, {                                                    // 1300
          start: reqRange.start,                                                                                       // 1300
          end: reqRange.end                                                                                            // 1300
        });                                                                                                            // 1300
                                                                                                                       //
        if (!http.response.headersSent) {                                                                              // 1301
          if (readableStream) {                                                                                        // 1302
            http.response.writeHead(206);                                                                              // 1302
          }                                                                                                            // 1301
        }                                                                                                              // 1713
                                                                                                                       //
        http.response.on('close', function () {                                                                        // 1304
          if (typeof stream.abort === "function") {                                                                    // 1715
            stream.abort();                                                                                            // 1305
          }                                                                                                            // 1717
                                                                                                                       //
          if (typeof stream.end === "function") {                                                                      // 1718
            stream.end();                                                                                              // 1306
          }                                                                                                            // 1720
        });                                                                                                            // 1304
        http.request.on('abort', function () {                                                                         // 1309
          if (typeof stream.abort === "function") {                                                                    // 1723
            stream.abort();                                                                                            // 1310
          }                                                                                                            // 1725
                                                                                                                       //
          if (typeof stream.end === "function") {                                                                      // 1726
            stream.end();                                                                                              // 1311
          }                                                                                                            // 1728
        });                                                                                                            // 1309
        stream.on('open', function () {                                                                                // 1314
          if (!http.response.headersSent) {                                                                            // 1315
            http.response.writeHead(206);                                                                              // 1316
          }                                                                                                            // 1733
        }).on('abort', function () {                                                                                   // 1314
          if (!http.response.finished) {                                                                               // 1319
            http.response.end();                                                                                       // 1320
          }                                                                                                            // 1737
                                                                                                                       //
          if (!http.request.aborted) {                                                                                 // 1321
            http.request.abort();                                                                                      // 1322
          }                                                                                                            // 1740
        }).on('error', streamErrorHandler).on('end', function () {                                                     // 1314
          if (!http.response.finished) {                                                                               // 1326
            http.response.end();                                                                                       // 1327
          }                                                                                                            // 1744
        });                                                                                                            // 1314
                                                                                                                       //
        if (self.throttle) {                                                                                           // 1329
          stream.pipe(new Throttle({                                                                                   // 1329
            bps: self.throttle,                                                                                        // 1329
            chunksize: self.chunkSize                                                                                  // 1329
          }));                                                                                                         // 1329
        }                                                                                                              // 1751
                                                                                                                       //
        stream.pipe(http.response);                                                                                    // 1330
        break;                                                                                                         // 1331
    }                                                                                                                  // 1240
  };                                                                                                                   // 1178
                                                                                                                       //
  return FilesCollection;                                                                                              // 1757
}()); /*                                                                                                               // 1759
      Export the FilesCollection class                                                                                 //
       */                                                                                                              //
Meteor.Files = FilesCollection;                                                                                        // 1337
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"core.coffee":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/core.coffee                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = require("./core.coffee.js");

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"core.coffee.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/core.coffee.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
module.export({                                                                                                        // 1
  FilesCollectionCore: function () {                                                                                   // 1
    return FilesCollectionCore;                                                                                        // 1
  }                                                                                                                    // 1
});                                                                                                                    // 1
var FilesCursor = void 0,                                                                                              // 1
    FileCursor = void 0;                                                                                               // 1
module.watch(require("./cursor.coffee"), {                                                                             // 1
  FilesCursor: function (v) {                                                                                          // 1
    FilesCursor = v;                                                                                                   // 1
  },                                                                                                                   // 1
  FileCursor: function (v) {                                                                                           // 1
    FileCursor = v;                                                                                                    // 1
  }                                                                                                                    // 1
}, 0);                                                                                                                 // 1
var fixJSONParse = void 0,                                                                                             // 1
    fixJSONStringify = void 0,                                                                                         // 1
    formatFleURL = void 0;                                                                                             // 1
module.watch(require("./lib.coffee"), {                                                                                // 1
  fixJSONParse: function (v) {                                                                                         // 1
    fixJSONParse = v;                                                                                                  // 1
  },                                                                                                                   // 1
  fixJSONStringify: function (v) {                                                                                     // 1
    fixJSONStringify = v;                                                                                              // 1
  },                                                                                                                   // 1
  formatFleURL: function (v) {                                                                                         // 1
    formatFleURL = v;                                                                                                  // 1
  }                                                                                                                    // 1
}, 1);                                                                                                                 // 1
var FilesCollectionCore;                                                                                               // 1
module.runSetters(FilesCollectionCore = function () {                                                                  // 4
  function FilesCollectionCore() {} /*                                                                                 // 5
                                    @locus Anywhere                                                                    //
                                    @memberOf FilesCollection                                                          //
                                    @name _getFileName                                                                 //
                                    @param {Object} fileData - File Object                                             //
                                    @summary Returns file's name                                                       //
                                    @returns {String}                                                                  //
                                     */                                                                                //
                                                                                                                       //
  FilesCollectionCore.prototype._getFileName = function (fileData) {                                                   // 18
    var fileName;                                                                                                      // 15
    fileName = fileData.name || fileData.fileName;                                                                     // 15
                                                                                                                       //
    if (_.isString(fileName) && fileName.length > 0) {                                                                 // 16
      return (fileData.name || fileData.fileName).replace(/\.\./g, '').replace(/\//g, '');                             // 17
    } else {                                                                                                           // 16
      return '';                                                                                                       // 19
    }                                                                                                                  // 25
  }; /*                                                                                                                // 14
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _getExt                                                                                                     //
     @param {String} FileName - File name                                                                              //
     @summary Get extension from FileName                                                                              //
     @returns {Object}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollectionCore.prototype._getExt = function (fileName) {                                                        // 38
    var extension;                                                                                                     // 30
                                                                                                                       //
    if (!!~fileName.indexOf('.')) {                                                                                    // 30
      extension = (fileName.split('.').pop().split('?')[0] || '').toLowerCase();                                       // 31
      return {                                                                                                         // 32
        ext: extension,                                                                                                // 32
        extension: extension,                                                                                          // 32
        extensionWithDot: '.' + extension                                                                              // 32
      };                                                                                                               // 32
    } else {                                                                                                           // 30
      return {                                                                                                         // 34
        ext: '',                                                                                                       // 34
        extension: '',                                                                                                 // 34
        extensionWithDot: ''                                                                                           // 34
      };                                                                                                               // 34
    }                                                                                                                  // 53
  }; /*                                                                                                                // 29
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _updateFileTypes                                                                                            //
     @param {Object} data - File data                                                                                  //
     @summary Internal method. Classify file based on 'type' field                                                     //
      */                                                                                                               //
                                                                                                                       //
  FilesCollectionCore.prototype._updateFileTypes = function (data) {                                                   // 65
    data.isVideo = /^video\//i.test(data.type);                                                                        // 44
    data.isAudio = /^audio\//i.test(data.type);                                                                        // 45
    data.isImage = /^image\//i.test(data.type);                                                                        // 46
    data.isText = /^text\//i.test(data.type);                                                                          // 47
    data.isJSON = /^application\/json$/i.test(data.type);                                                              // 48
    data.isPDF = /^application\/(x-)?pdf$/i.test(data.type);                                                           // 49
  }; /*                                                                                                                // 43
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _dataToSchema                                                                                               //
     @param {Object} data - File data                                                                                  //
     @summary Internal method. Build object in accordance with default schema from File data                           //
     @returns {Object}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollectionCore.prototype._dataToSchema = function (data) {                                                      // 84
    var ds;                                                                                                            // 61
    ds = {                                                                                                             // 61
      name: data.name,                                                                                                 // 62
      extension: data.extension,                                                                                       // 63
      path: data.path,                                                                                                 // 64
      meta: data.meta,                                                                                                 // 65
      type: data.type,                                                                                                 // 66
      size: data.size,                                                                                                 // 67
      userId: data.userId || null,                                                                                     // 68
      versions: {                                                                                                      // 69
        original: {                                                                                                    // 70
          path: data.path,                                                                                             // 71
          size: data.size,                                                                                             // 72
          type: data.type,                                                                                             // 73
          extension: data.extension                                                                                    // 74
        }                                                                                                              // 71
      },                                                                                                               // 70
      _downloadRoute: data._downloadRoute || this.downloadRoute,                                                       // 75
      _collectionName: data._collectionName || this.collectionName                                                     // 76
    };                                                                                                                 // 62
                                                                                                                       //
    if (data.fileId) {                                                                                                 // 79
      ds._id = data.fileId;                                                                                            // 80
    }                                                                                                                  // 107
                                                                                                                       //
    this._updateFileTypes(ds);                                                                                         // 82
                                                                                                                       //
    ds._storagePath = data._storagePath || this.storagePath(_.extend(data, ds));                                       // 83
    return ds;                                                                                                         // 84
  }; /*                                                                                                                // 60
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name findOne                                                                                                     //
     @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)    //
     @param {Object} options - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#sortspecifiers)
     @summary Find and return Cursor for matching document Object                                                      //
     @returns {FileCursor} Instance                                                                                    //
      */                                                                                                               //
                                                                                                                       //
  FilesCollectionCore.prototype.findOne = function (selector, options) {                                               // 124
    var doc;                                                                                                           // 96
                                                                                                                       //
    this._debug("[FilesCollection] [findOne(" + JSON.stringify(selector) + ", " + JSON.stringify(options) + ")]");     // 96
                                                                                                                       //
    check(selector, Match.Optional(Match.OneOf(Object, String, Boolean, Number, null)));                               // 97
    check(options, Match.Optional(Object));                                                                            // 98
                                                                                                                       //
    if (!arguments.length) {                                                                                           // 100
      selector = {};                                                                                                   // 100
    }                                                                                                                  // 131
                                                                                                                       //
    doc = this.collection.findOne(selector, options);                                                                  // 101
                                                                                                                       //
    if (doc) {                                                                                                         // 102
      return new FileCursor(doc, this);                                                                                // 134
    } else {                                                                                                           // 102
      return doc;                                                                                                      // 136
    }                                                                                                                  // 137
  }; /*                                                                                                                // 95
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name find                                                                                                        //
     @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)    //
     @param {Object}        options  - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#sortspecifiers)
     @summary Find and return Cursor for matching documents                                                            //
     @returns {FilesCursor} Instance                                                                                   //
      */                                                                                                               //
                                                                                                                       //
  FilesCollectionCore.prototype.find = function (selector, options) {                                                  // 151
    this._debug("[FilesCollection] [find(" + JSON.stringify(selector) + ", " + JSON.stringify(options) + ")]");        // 114
                                                                                                                       //
    check(selector, Match.Optional(Match.OneOf(Object, String, Boolean, Number, null)));                               // 115
    check(options, Match.Optional(Object));                                                                            // 116
                                                                                                                       //
    if (!arguments.length) {                                                                                           // 118
      selector = {};                                                                                                   // 118
    }                                                                                                                  // 157
                                                                                                                       //
    return new FilesCursor(selector, options, this);                                                                   // 119
  }; /*                                                                                                                // 113
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name update                                                                                                      //
     @see http://docs.meteor.com/#/full/update                                                                         //
     @summary link Mongo.Collection update method                                                                      //
     @returns {Mongo.Collection} Instance                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollectionCore.prototype.update = function () {                                                                 // 171
    this.collection.update.apply(this.collection, arguments);                                                          // 130
    return this.collection;                                                                                            // 131
  }; /*                                                                                                                // 129
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name link                                                                                                        //
     @param {Object} fileRef - File reference object                                                                   //
     @param {String} version - Version of file you would like to request                                               //
     @summary Returns downloadable URL                                                                                 //
     @returns {String} Empty string returned in case if file not found in DB                                           //
      */                                                                                                               //
                                                                                                                       //
  FilesCollectionCore.prototype.link = function (fileRef, version) {                                                   // 187
    if (version == null) {                                                                                             // 188
      version = 'original';                                                                                            // 142
    }                                                                                                                  // 190
                                                                                                                       //
    this._debug("[FilesCollection] [link(" + (fileRef != null ? fileRef._id : void 0) + ", " + version + ")]");        // 143
                                                                                                                       //
    check(fileRef, Object);                                                                                            // 144
    check(version, String);                                                                                            // 145
                                                                                                                       //
    if (!fileRef) {                                                                                                    // 146
      return '';                                                                                                       // 146
    }                                                                                                                  // 196
                                                                                                                       //
    return formatFleURL(fileRef, version);                                                                             // 147
  };                                                                                                                   // 142
                                                                                                                       //
  return FilesCollectionCore;                                                                                          // 200
}());                                                                                                                  // 202
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"cursor.coffee":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/cursor.coffee                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = require("./cursor.coffee.js");

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"cursor.coffee.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/cursor.coffee.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
module.export({                                                                                                        // 1
  FilesCursor: function () {                                                                                           // 1
    return FilesCursor;                                                                                                // 1
  },                                                                                                                   // 1
  FileCursor: function () {                                                                                            // 1
    return FileCursor;                                                                                                 // 1
  }                                                                                                                    // 1
});                                                                                                                    // 1
/*                                                                                                                     // 1
@private                                                                                                               //
@locus Anywhere                                                                                                        //
@class FileCursor                                                                                                      //
@param _fileRef    {Object} - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)             //
@param _collection {FilesCollection} - FilesCollection Instance                                                        //
@summary Internal class, represents each record in `FilesCursor.each()` or document returned from `.findOne()` method  //
 */var FileCursor, FilesCursor;                                                                                        //
module.runSetters(FileCursor = function () {                                                                           // 9
  function FileCursor(_fileRef, _collection) {                                                                         // 10
    var self;                                                                                                          // 11
    this._fileRef = _fileRef;                                                                                          // 10
    this._collection = _collection;                                                                                    // 10
    self = this;                                                                                                       // 11
    self = _.extend(self, this._fileRef);                                                                              // 12
  } /*                                                                                                                 // 10
    @locus Anywhere                                                                                                    //
    @memberOf FileCursor                                                                                               //
    @name remove                                                                                                       //
    @param callback {Function} - Triggered asynchronously after item is removed or failed to be removed                //
    @summary Remove document                                                                                           //
    @returns {FileCursor}                                                                                              //
     */                                                                                                                //
                                                                                                                       //
  FileCursor.prototype.remove = function (callback) {                                                                  // 31
    this._collection._debug('[FilesCollection] [FileCursor] [remove()]');                                              // 23
                                                                                                                       //
    if (this._fileRef) {                                                                                               // 24
      this._collection.remove(this._fileRef._id, callback);                                                            // 25
    } else {                                                                                                           // 24
      callback && callback(new Meteor.Error(404, 'No such file'));                                                     // 27
    }                                                                                                                  // 37
                                                                                                                       //
    return this;                                                                                                       // 28
  }; /*                                                                                                                // 22
     @locus Anywhere                                                                                                   //
     @memberOf FileCursor                                                                                              //
     @name link                                                                                                        //
     @param version {String} - Name of file's subversion                                                               //
     @summary Returns downloadable URL to File                                                                         //
     @returns {String}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FileCursor.prototype.link = function (version) {                                                                     // 51
    if (version == null) {                                                                                             // 52
      version = 'original';                                                                                            // 38
    }                                                                                                                  // 54
                                                                                                                       //
    this._collection._debug("[FilesCollection] [FileCursor] [link(" + version + ")]");                                 // 39
                                                                                                                       //
    if (this._fileRef) {                                                                                               // 40
      return this._collection.link(this._fileRef, version);                                                            // 57
    } else {                                                                                                           // 40
      return '';                                                                                                       // 59
    }                                                                                                                  // 60
  }; /*                                                                                                                // 38
     @locus Anywhere                                                                                                   //
     @memberOf FileCursor                                                                                              //
     @name get                                                                                                         //
     @param property {String} - Name of sub-object property                                                            //
     @summary Returns current document as a plain Object, if `property` is specified - returns value of sub-object property
     @returns {Object|mix}                                                                                             //
      */                                                                                                               //
                                                                                                                       //
  FileCursor.prototype.get = function (property) {                                                                     // 73
    this._collection._debug("[FilesCollection] [FileCursor] [get(" + property + ")]");                                 // 51
                                                                                                                       //
    if (property) {                                                                                                    // 52
      return this._fileRef[property];                                                                                  // 53
    } else {                                                                                                           // 52
      return this._fileRef;                                                                                            // 55
    }                                                                                                                  // 79
  }; /*                                                                                                                // 50
     @locus Anywhere                                                                                                   //
     @memberOf FileCursor                                                                                              //
     @name fetch                                                                                                       //
     @summary Returns document as plain Object in Array                                                                //
     @returns {[Object]}                                                                                               //
      */                                                                                                               //
                                                                                                                       //
  FileCursor.prototype.fetch = function () {                                                                           // 91
    this._collection._debug('[FilesCollection] [FileCursor] [fetch()]');                                               // 65
                                                                                                                       //
    return [this._fileRef];                                                                                            // 66
  }; /*                                                                                                                // 64
     @locus Anywhere                                                                                                   //
     @memberOf FileCursor                                                                                              //
     @name with                                                                                                        //
     @summary Returns reactive version of current FileCursor, useful to use with `{{#with}}...{{/with}}` block template helper
     @returns {[Object]}                                                                                               //
      */                                                                                                               //
                                                                                                                       //
  FileCursor.prototype["with"] = function () {                                                                         // 105
    var self;                                                                                                          // 76
                                                                                                                       //
    this._collection._debug('[FilesCollection] [FileCursor] [with()]');                                                // 76
                                                                                                                       //
    self = this;                                                                                                       // 77
    return _.extend(self, this._collection.collection.findOne(this._fileRef._id));                                     // 78
  };                                                                                                                   // 75
                                                                                                                       //
  return FileCursor;                                                                                                   // 112
}()); /*                                                                                                               // 114
      @private                                                                                                         //
      @locus Anywhere                                                                                                  //
      @class FilesCursor                                                                                               //
      @param _selector   {String|Object}   - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)
      @param options     {Object}          - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#selectors)
      @param _collection {FilesCollection} - FilesCollection Instance                                                  //
      @summary Implementation of Cursor for FilesCollection                                                            //
       */                                                                                                              //
module.runSetters(FilesCursor = function () {                                                                          // 89
  function FilesCursor(_selector, options, _collection) {                                                              // 90
    this._selector = _selector != null ? _selector : {};                                                               // 90
    this._collection = _collection;                                                                                    // 90
    this._current = -1;                                                                                                // 91
    this.cursor = this._collection.collection.find(this._selector, options);                                           // 92
  } /*                                                                                                                 // 90
    @locus Anywhere                                                                                                    //
    @memberOf FilesCursor                                                                                              //
    @name get                                                                                                          //
    @summary Returns all matching document(s) as an Array. Alias of `.fetch()`                                         //
    @returns {[Object]}                                                                                                //
     */                                                                                                                //
                                                                                                                       //
  FilesCursor.prototype.get = function () {                                                                            // 144
    this._collection._debug("[FilesCollection] [FilesCursor] [get()]");                                                // 102
                                                                                                                       //
    return this.cursor.fetch();                                                                                        // 103
  }; /*                                                                                                                // 101
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name hasNext                                                                                                     //
     @summary Returns `true` if there is next item available on Cursor                                                 //
     @returns {Boolean}                                                                                                //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.hasNext = function () {                                                                        // 158
    this._collection._debug('[FilesCollection] [FilesCursor] [hasNext()]');                                            // 113
                                                                                                                       //
    return this._current < this.cursor.count() - 1;                                                                    // 114
  }; /*                                                                                                                // 112
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name next                                                                                                        //
     @summary Returns next item on Cursor, if available                                                                //
     @returns {Object|undefined}                                                                                       //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.next = function () {                                                                           // 172
    this._collection._debug('[FilesCollection] [FilesCursor] [next()]');                                               // 124
                                                                                                                       //
    if (this.hasNext()) {                                                                                              // 125
      return this.cursor.fetch()[++this._current];                                                                     // 126
    }                                                                                                                  // 176
  }; /*                                                                                                                // 123
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name hasPrevious                                                                                                 //
     @summary Returns `true` if there is previous item available on Cursor                                             //
     @returns {Boolean}                                                                                                //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.hasPrevious = function () {                                                                    // 188
    this._collection._debug('[FilesCollection] [FilesCursor] [hasPrevious()]');                                        // 136
                                                                                                                       //
    return this._current !== -1;                                                                                       // 137
  }; /*                                                                                                                // 135
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name previous                                                                                                    //
     @summary Returns previous item on Cursor, if available                                                            //
     @returns {Object|undefined}                                                                                       //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.previous = function () {                                                                       // 202
    this._collection._debug('[FilesCollection] [FilesCursor] [previous()]');                                           // 147
                                                                                                                       //
    if (this.hasPrevious()) {                                                                                          // 148
      return this.cursor.fetch()[--this._current];                                                                     // 149
    }                                                                                                                  // 206
  }; /*                                                                                                                // 146
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name fetch                                                                                                       //
     @summary Returns all matching document(s) as an Array.                                                            //
     @returns {[Object]}                                                                                               //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.fetch = function () {                                                                          // 218
    this._collection._debug('[FilesCollection] [FilesCursor] [fetch()]');                                              // 159
                                                                                                                       //
    return this.cursor.fetch();                                                                                        // 160
  }; /*                                                                                                                // 158
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name first                                                                                                       //
     @summary Returns first item on Cursor, if available                                                               //
     @returns {Object|undefined}                                                                                       //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.first = function () {                                                                          // 232
    var ref;                                                                                                           // 170
                                                                                                                       //
    this._collection._debug('[FilesCollection] [FilesCursor] [first()]');                                              // 170
                                                                                                                       //
    this._current = 0;                                                                                                 // 171
    return (ref = this.fetch()) != null ? ref[this._current] : void 0;                                                 // 172
  }; /*                                                                                                                // 169
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name last                                                                                                        //
     @summary Returns last item on Cursor, if available                                                                //
     @returns {Object|undefined}                                                                                       //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.last = function () {                                                                           // 248
    var ref;                                                                                                           // 182
                                                                                                                       //
    this._collection._debug('[FilesCollection] [FilesCursor] [last()]');                                               // 182
                                                                                                                       //
    this._current = this.count() - 1;                                                                                  // 183
    return (ref = this.fetch()) != null ? ref[this._current] : void 0;                                                 // 184
  }; /*                                                                                                                // 181
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name count                                                                                                       //
     @summary Returns the number of documents that match a query                                                       //
     @returns {Number}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.count = function () {                                                                          // 264
    this._collection._debug('[FilesCollection] [FilesCursor] [count()]');                                              // 194
                                                                                                                       //
    return this.cursor.count();                                                                                        // 195
  }; /*                                                                                                                // 193
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name remove                                                                                                      //
     @param callback {Function} - Triggered asynchronously after item is removed or failed to be removed               //
     @summary Removes all documents that match a query                                                                 //
     @returns {FilesCursor}                                                                                            //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.remove = function (callback) {                                                                 // 279
    this._collection._debug('[FilesCollection] [FilesCursor] [remove()]');                                             // 206
                                                                                                                       //
    this._collection.remove(this._selector, callback);                                                                 // 207
                                                                                                                       //
    return this;                                                                                                       // 208
  }; /*                                                                                                                // 205
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name forEach                                                                                                     //
     @param callback {Function} - Function to call. It will be called with three arguments: the `file`, a 0-based index, and cursor itself
     @param context {Object} - An object which will be the value of `this` inside `callback`                           //
     @summary Call `callback` once for each matching document, sequentially and synchronously.                         //
     @returns {undefined}                                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.forEach = function (callback, context) {                                                       // 296
    if (context == null) {                                                                                             // 297
      context = {};                                                                                                    // 219
    }                                                                                                                  // 299
                                                                                                                       //
    this._collection._debug('[FilesCollection] [FilesCursor] [forEach()]');                                            // 220
                                                                                                                       //
    this.cursor.forEach(callback, context);                                                                            // 221
  }; /*                                                                                                                // 219
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name each                                                                                                        //
     @summary Returns an Array of FileCursor made for each document on current cursor                                  //
              Useful when using in {{#each FilesCursor#each}}...{{/each}} block template helper                        //
     @returns {[FileCursor]}                                                                                           //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.each = function () {                                                                           // 314
    var self;                                                                                                          // 233
    self = this;                                                                                                       // 233
    return this.map(function (file) {                                                                                  // 234
      return new FileCursor(file, self._collection);                                                                   // 235
    });                                                                                                                // 234
  }; /*                                                                                                                // 232
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name map                                                                                                         //
     @param callback {Function} - Function to call. It will be called with three arguments: the `file`, a 0-based index, and cursor itself
     @param context {Object} - An object which will be the value of `this` inside `callback`                           //
     @summary Map `callback` over all matching documents. Returns an Array.                                            //
     @returns {Array}                                                                                                  //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.map = function (callback, context) {                                                           // 333
    if (context == null) {                                                                                             // 334
      context = {};                                                                                                    // 246
    }                                                                                                                  // 336
                                                                                                                       //
    this._collection._debug('[FilesCollection] [FilesCursor] [map()]');                                                // 247
                                                                                                                       //
    return this.cursor.map(callback, context);                                                                         // 248
  }; /*                                                                                                                // 246
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name current                                                                                                     //
     @summary Returns current item on Cursor, if available                                                             //
     @returns {Object|undefined}                                                                                       //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.current = function () {                                                                        // 350
    this._collection._debug('[FilesCollection] [FilesCursor] [current()]');                                            // 258
                                                                                                                       //
    if (this._current < 0) {                                                                                           // 259
      this._current = 0;                                                                                               // 259
    }                                                                                                                  // 354
                                                                                                                       //
    return this.fetch()[this._current];                                                                                // 260
  }; /*                                                                                                                // 257
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name observe                                                                                                     //
     @param callbacks {Object} - Functions to call to deliver the result set as it changes                             //
     @summary Watch a query. Receive callbacks as the result set changes.                                              //
     @url http://docs.meteor.com/api/collections.html#Mongo-Cursor-observe                                             //
     @returns {Object} - live query handle                                                                             //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.observe = function (callbacks) {                                                               // 369
    this._collection._debug('[FilesCollection] [FilesCursor] [observe()]');                                            // 272
                                                                                                                       //
    return this.cursor.observe(callbacks);                                                                             // 273
  }; /*                                                                                                                // 271
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name observeChanges                                                                                              //
     @param callbacks {Object} - Functions to call to deliver the result set as it changes                             //
     @summary Watch a query. Receive callbacks as the result set changes. Only the differences between the old and new documents are passed to the callbacks.
     @url http://docs.meteor.com/api/collections.html#Mongo-Cursor-observeChanges                                      //
     @returns {Object} - live query handle                                                                             //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.observeChanges = function (callbacks) {                                                        // 385
    this._collection._debug('[FilesCollection] [FilesCursor] [observeChanges()]');                                     // 285
                                                                                                                       //
    return this.cursor.observeChanges(callbacks);                                                                      // 286
  };                                                                                                                   // 284
                                                                                                                       //
  return FilesCursor;                                                                                                  // 390
}());                                                                                                                  // 392
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib.coffee":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/lib.coffee                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = require("./lib.coffee.js");

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib.coffee.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/lib.coffee.js                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
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
/*                                                                                                                     // 1
@var {Function} fixJSONParse - Fix issue with Date parse                                                               //
 */var fixJSONParse, fixJSONStringify, formatFleURL;                                                                   //
module.runSetters(fixJSONParse = function (obj) {                                                                      // 4
  var i, j, key, len, v, value;                                                                                        // 5
                                                                                                                       //
  for (key in meteorBabelHelpers.sanitizeForInObject(obj)) {                                                           // 5
    value = obj[key];                                                                                                  // 10
                                                                                                                       //
    if (_.isString(value) && !!~value.indexOf('=--JSON-DATE--=')) {                                                    // 6
      value = value.replace('=--JSON-DATE--=', '');                                                                    // 7
      obj[key] = new Date(parseInt(value));                                                                            // 8
    } else if (_.isObject(value)) {                                                                                    // 6
      obj[key] = fixJSONParse(value);                                                                                  // 10
    } else if (_.isArray(value)) {                                                                                     // 9
      for (i = j = 0, len = value.length; j < len; i = ++j) {                                                          // 12
        v = value[i];                                                                                                  // 18
                                                                                                                       //
        if (_.isObject(v)) {                                                                                           // 13
          obj[key][i] = fixJSONParse(v);                                                                               // 14
        } else if (_.isString(v) && !!~v.indexOf('=--JSON-DATE--=')) {                                                 // 13
          v = v.replace('=--JSON-DATE--=', '');                                                                        // 16
          obj[key][i] = new Date(parseInt(v));                                                                         // 17
        }                                                                                                              // 24
      }                                                                                                                // 11
    }                                                                                                                  // 26
  }                                                                                                                    // 5
                                                                                                                       //
  return obj;                                                                                                          // 18
}); /*                                                                                                                 // 4
    @var {Function} fixJSONStringify - Fix issue with Date stringify                                                   //
     */                                                                                                                //
module.runSetters(fixJSONStringify = function (obj) {                                                                  // 23
  var i, j, key, len, v, value;                                                                                        // 24
                                                                                                                       //
  for (key in meteorBabelHelpers.sanitizeForInObject(obj)) {                                                           // 24
    value = obj[key];                                                                                                  // 39
                                                                                                                       //
    if (_.isDate(value)) {                                                                                             // 25
      obj[key] = '=--JSON-DATE--=' + +value;                                                                           // 26
    } else if (_.isObject(value)) {                                                                                    // 25
      obj[key] = fixJSONStringify(value);                                                                              // 28
    } else if (_.isArray(value)) {                                                                                     // 27
      for (i = j = 0, len = value.length; j < len; i = ++j) {                                                          // 30
        v = value[i];                                                                                                  // 46
                                                                                                                       //
        if (_.isObject(v)) {                                                                                           // 31
          obj[key][i] = fixJSONStringify(v);                                                                           // 32
        } else if (_.isDate(v)) {                                                                                      // 31
          obj[key][i] = '=--JSON-DATE--=' + +v;                                                                        // 34
        }                                                                                                              // 51
      }                                                                                                                // 29
    }                                                                                                                  // 53
  }                                                                                                                    // 24
                                                                                                                       //
  return obj;                                                                                                          // 35
}); /*                                                                                                                 // 23
    @locus Anywhere                                                                                                    //
    @private                                                                                                           //
    @name formatFleURL                                                                                                 //
    @param {Object} fileRef - File reference object                                                                    //
    @param {String} version - [Optional] Version of file you would like build URL for                                  //
    @summary Returns formatted URL for file                                                                            //
    @returns {String} Downloadable link                                                                                //
     */                                                                                                                //
module.runSetters(formatFleURL = function (fileRef, version) {                                                         // 46
  var ext, ref, root, vRef;                                                                                            // 47
                                                                                                                       //
  if (version == null) {                                                                                               // 71
    version = 'original';                                                                                              // 46
  }                                                                                                                    // 73
                                                                                                                       //
  check(fileRef, Object);                                                                                              // 47
  check(version, String);                                                                                              // 48
  root = __meteor_runtime_config__.ROOT_URL.replace(/\/+$/, '');                                                       // 50
  vRef = fileRef.versions && fileRef.versions[version] || fileRef;                                                     // 51
                                                                                                                       //
  if ((ref = vRef.extension) != null ? ref.length : void 0) {                                                          // 53
    ext = '.' + vRef.extension.replace(/^\./, '');                                                                     // 54
  } else {                                                                                                             // 53
    ext = '';                                                                                                          // 56
  }                                                                                                                    // 82
                                                                                                                       //
  if (fileRef["public"] === true) {                                                                                    // 58
    return root + (version === 'original' ? fileRef._downloadRoute + "/" + fileRef._id + ext : fileRef._downloadRoute + "/" + version + "-" + fileRef._id + ext);
  } else {                                                                                                             // 58
    return root + (fileRef._downloadRoute + "/" + fileRef._collectionName + "/" + fileRef._id + "/" + version + "/" + fileRef._id + ext);
  }                                                                                                                    // 87
});                                                                                                                    // 46
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"write-stream.coffee":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/write-stream.coffee                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = require("./write-stream.coffee.js");

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"write-stream.coffee.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/write-stream.coffee.js                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
module.export({                                                                                                        // 1
  writeStream: function () {                                                                                           // 1
    return writeStream;                                                                                                // 1
  }                                                                                                                    // 1
});                                                                                                                    // 1
var fs = void 0;                                                                                                       // 1
module.watch(require("fs-extra"), {                                                                                    // 1
  "default": function (v) {                                                                                            // 1
    fs = v;                                                                                                            // 1
  }                                                                                                                    // 1
}, 0);                                                                                                                 // 1
var NOOP, bound, fdCache, writeStream;                                                                                 // 1
                                                                                                                       //
NOOP = function () {}; /*                                                                                              // 2
                       @var {Object} bound - Meteor.bindEnvironment (Fiber wrapper)                                    //
                        */                                                                                             //
                                                                                                                       //
bound = Meteor.bindEnvironment(function (callback) {                                                                   // 7
  return callback();                                                                                                   // 7
});                                                                                                                    // 7
fdCache = {}; /*                                                                                                       // 8
              @private                                                                                                 //
              @locus Server                                                                                            //
              @class writeStream                                                                                       //
              @param path      {String} - Path to file on FS                                                           //
              @param maxLength {Number} - Max amount of chunks in stream                                               //
              @param file      {Object} - fileRef Object                                                               //
              @summary writableStream wrapper class, makes sure chunks is written in given order. Implementation of queue stream.
               */                                                                                                      //
module.runSetters(writeStream = function () {                                                                          // 19
  function writeStream(path, maxLength, file, permissions) {                                                           // 20
    var self;                                                                                                          // 21
    this.path = path;                                                                                                  // 20
    this.maxLength = maxLength;                                                                                        // 20
    this.file = file;                                                                                                  // 20
    this.permissions = permissions;                                                                                    // 20
                                                                                                                       //
    if (!this.path || !_.isString(this.path)) {                                                                        // 21
      return;                                                                                                          // 22
    }                                                                                                                  // 37
                                                                                                                       //
    self = this;                                                                                                       // 24
    this.fd = null;                                                                                                    // 25
    this.writtenChunks = 0;                                                                                            // 26
    this.ended = false;                                                                                                // 27
    this.aborted = false;                                                                                              // 28
                                                                                                                       //
    if (fdCache[this.path] && !fdCache[this.path].ended && !fdCache[this.path].aborted) {                              // 30
      this.fd = fdCache[this.path].fd;                                                                                 // 31
      this.writtenChunks = fdCache[this.path].writtenChunks;                                                           // 32
    } else {                                                                                                           // 30
      fs.ensureFile(this.path, function (efError) {                                                                    // 34
        return bound(function () {                                                                                     // 48
          if (efError) {                                                                                               // 35
            throw new Meteor.Error(500, '[FilesCollection] [writeStream] [ensureFile] [Error:]', efError);             // 36
          } else {                                                                                                     // 35
            fs.open(self.path, 'r+', self.permissions, function (oError, fd) {                                         // 38
              return bound(function () {                                                                               // 53
                if (oError) {                                                                                          // 39
                  throw new Meteor.Error(500, '[FilesCollection] [writeStream] [ensureFile] [open] [Error:]', oError);
                } else {                                                                                               // 39
                  self.fd = fd;                                                                                        // 42
                  fdCache[self.path] = self;                                                                           // 43
                }                                                                                                      // 59
              });                                                                                                      // 38
            });                                                                                                        // 38
          }                                                                                                            // 62
        });                                                                                                            // 34
      });                                                                                                              // 34
    }                                                                                                                  // 65
  } /*                                                                                                                 // 20
    @memberOf writeStream                                                                                              //
    @name write                                                                                                        //
    @param {Number} num - Chunk position in a stream                                                                   //
    @param {Buffer} chunk - Buffer (chunk binary data)                                                                 //
    @param {Function} callback - Callback                                                                              //
    @summary Write chunk in given order                                                                                //
    @returns {Boolean} - True if chunk is sent to stream, false if chunk is set into queue                             //
     */                                                                                                                //
                                                                                                                       //
  writeStream.prototype.write = function (num, chunk, callback) {                                                      // 79
    var self;                                                                                                          // 57
                                                                                                                       //
    if (!this.aborted && !this.ended) {                                                                                // 57
      self = this;                                                                                                     // 58
                                                                                                                       //
      if (this.fd) {                                                                                                   // 59
        fs.write(this.fd, chunk, 0, chunk.length, (num - 1) * this.file.chunkSize, function (error, written, buffer) {
          return bound(function () {                                                                                   // 85
            callback && callback(error, written, buffer);                                                              // 61
                                                                                                                       //
            if (error) {                                                                                               // 62
              console.warn('[FilesCollection] [writeStream] [write] [Error:]', error);                                 // 63
              self.abort();                                                                                            // 64
            } else {                                                                                                   // 62
              ++self.writtenChunks;                                                                                    // 66
            }                                                                                                          // 92
          });                                                                                                          // 60
        });                                                                                                            // 60
      } else {                                                                                                         // 59
        Meteor.setTimeout(function () {                                                                                // 69
          self.write(num, chunk, callback);                                                                            // 70
        }, 25);                                                                                                        // 69
      }                                                                                                                // 57
    }                                                                                                                  // 100
                                                                                                                       //
    return false;                                                                                                      // 73
  }; /*                                                                                                                // 56
     @memberOf writeStream                                                                                             //
     @name end                                                                                                         //
     @param {Function} callback - Callback                                                                             //
     @summary Finishes writing to writableStream, only after all chunks in queue is written                            //
     @returns {Boolean} - True if stream is fulfilled, false if queue is in progress                                   //
      */                                                                                                               //
                                                                                                                       //
  writeStream.prototype.end = function (callback) {                                                                    // 113
    var self;                                                                                                          // 83
                                                                                                                       //
    if (!this.aborted && !this.ended) {                                                                                // 83
      if (this.writtenChunks === this.maxLength) {                                                                     // 84
        self = this;                                                                                                   // 85
        fs.close(this.fd, function () {                                                                                // 86
          return bound(function () {                                                                                   // 119
            delete fdCache[this.path];                                                                                 // 87
            self.ended = true;                                                                                         // 88
            callback && callback(void 0, true);                                                                        // 89
          });                                                                                                          // 86
        });                                                                                                            // 86
        return true;                                                                                                   // 91
      } else {                                                                                                         // 84
        self = this;                                                                                                   // 93
        fs.stat(self.path, function (error, stat) {                                                                    // 94
          return bound(function () {                                                                                   // 129
            if (!error && stat) {                                                                                      // 95
              self.writtenChunks = Math.ceil(stat.size / self.file.chunkSize);                                         // 96
            }                                                                                                          // 132
                                                                                                                       //
            return Meteor.setTimeout(function () {                                                                     // 133
              self.end(callback);                                                                                      // 99
            }, 25);                                                                                                    // 98
          });                                                                                                          // 94
        });                                                                                                            // 94
      }                                                                                                                // 83
    } else {                                                                                                           // 83
      callback && callback(void 0, this.ended);                                                                        // 103
    }                                                                                                                  // 141
                                                                                                                       //
    return false;                                                                                                      // 104
  }; /*                                                                                                                // 82
     @memberOf writeStream                                                                                             //
     @name abort                                                                                                       //
     @param {Function} callback - Callback                                                                             //
     @summary Aborts writing to writableStream, removes created file                                                   //
     @returns {Boolean} - True                                                                                         //
      */                                                                                                               //
                                                                                                                       //
  writeStream.prototype.abort = function (callback) {                                                                  // 154
    this.aborted = true;                                                                                               // 114
    delete fdCache[this.path];                                                                                         // 115
    fs.unlink(this.path, callback || NOOP);                                                                            // 116
    return true;                                                                                                       // 117
  }; /*                                                                                                                // 113
     @memberOf writeStream                                                                                             //
     @name stop                                                                                                        //
     @summary Stop writing to writableStream                                                                           //
     @returns {Boolean} - True                                                                                         //
      */                                                                                                               //
                                                                                                                       //
  writeStream.prototype.stop = function () {                                                                           // 169
    this.aborted = true;                                                                                               // 126
    delete fdCache[this.path];                                                                                         // 127
    return true;                                                                                                       // 128
  };                                                                                                                   // 125
                                                                                                                       //
  return writeStream;                                                                                                  // 175
}());                                                                                                                  // 177
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"fs-extra":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// ../../.1.8.3.mtrof4++os+web.browser+web.cordova/npm/node_modules/fs-extra/package.json                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "fs-extra";
exports.version = "4.0.1";
exports.main = "./lib/index";

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

}}},"request":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// ../../.1.8.3.mtrof4++os+web.browser+web.cordova/npm/node_modules/request/package.json                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "request";
exports.version = "2.81.0";
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

var extend                = require('extend')
  , cookies               = require('./lib/cookies')
  , helpers               = require('./lib/helpers')

var paramsHaveRequestBody = helpers.paramsHaveRequestBody


// organize params for patch, post, put, head, del
function initParams(uri, options, callback) {
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

  var defaults      = wrapRequestMethod(self, options, requester)

  var verbs = ['get', 'head', 'post', 'put', 'patch', 'del', 'delete']
  verbs.forEach(function(verb) {
    defaults[verb]  = wrapRequestMethod(self[verb], options, requester, verb)
  })

  defaults.cookie   = wrapRequestMethod(self.cookie, options, requester)
  defaults.jar      = self.jar
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
  enumerable : true,
  get : function() {
    return request.Request.debug
  },
  set : function(debug) {
    request.Request.debug = debug
  }
})

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"throttle":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// ../../.1.8.3.mtrof4++os+web.browser+web.cordova/npm/node_modules/throttle/package.json                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "throttle";
exports.version = "1.0.3";
exports.main = "./throttle";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"throttle.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/throttle/throttle.js                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //

/**
 * Module dependencies.
 */

var assert = require('assert');
var Parser = require('stream-parser');
var inherits = require('util').inherits;
var Transform = require('stream').Transform;

// node v0.8.x compat
if (!Transform) Transform = require('readable-stream/transform');

/**
 * Module exports.
 */

module.exports = Throttle;

/**
 * The `Throttle` passthrough stream class is very similar to the node core
 * `stream.Passthrough` stream, except that you specify a `bps` "bytes per
 * second" option and data *will not* be passed through faster than the byte
 * value you specify.
 *
 * You can invoke with just a `bps` Number and get the rest of the default
 * options. This should be more common:
 *
 * ``` js
 * process.stdin.pipe(new Throttle(100 * 1024)).pipe(process.stdout);
 * ```
 *
 * Or you can pass an `options` Object in, with a `bps` value specified along with
 * other options:
 *
 * ``` js
 * var t = new Throttle({ bps: 100 * 1024, chunkSize: 100, highWaterMark: 500 });
 * ```
 *
 * @param {Number|Object} opts an options object or the "bps" Number value
 * @api public
 */

function Throttle (opts) {
  if (!(this instanceof Throttle)) return new Throttle(opts);

  if ('number' == typeof opts) opts = { bps: opts };
  if (!opts) opts = {};
  if (null == opts.lowWaterMark) opts.lowWaterMark = 0;
  if (null == opts.highWaterMark) opts.highWaterMark = 0;
  if (null == opts.bps) throw new Error('must pass a "bps" bytes-per-second option');
  if (null == opts.chunkSize) opts.chunkSize = opts.bps / 10 | 0; // 1/10th of "bps" by default

  Transform.call(this, opts);

  this.bps = opts.bps;
  this.chunkSize = Math.max(1, opts.chunkSize);

  this.totalBytes = 0;
  this.startTime = Date.now();

  this._passthroughChunk();
}
inherits(Throttle, Transform);

/**
 * Mixin `Parser`.
 */

Parser(Throttle.prototype);

/**
 * Begins passing through the next "chunk" of bytes.
 *
 * @api private
 */

Throttle.prototype._passthroughChunk = function () {
  this._passthrough(this.chunkSize, this._onchunk);
  this.totalBytes += this.chunkSize;
};

/**
 * Called once a "chunk" of bytes has been passed through. Waits if necessary
 * before passing through the next chunk of bytes.
 *
 * @api private
 */

Throttle.prototype._onchunk = function (output, done) {
  var self = this;
  var totalSeconds = (Date.now() - this.startTime) / 1000;
  var expected = totalSeconds * this.bps;

  function d () {
    self._passthroughChunk();
    done();
  }

  if (this.totalBytes > expected) {
    // Use this byte count to calculate how many seconds ahead we are.
    var remainder = this.totalBytes - expected;
    var sleepTime = remainder / this.bps * 1000;
    //console.error('sleep time: %d', sleepTime);
    if (sleepTime > 0) {
      setTimeout(d, sleepTime);
    } else {
      d();
    }
  } else {
    d();
  }
};

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
	const buf = new Uint8Array(input);

	if (!(buf && buf.length > 1)) {
		return null;
	}

	const check = (header, opts) => {
		opts = Object.assign({
			offset: 0
		}, opts);

		for (let i = 0; i < header.length; i++) {
			if (header[i] !== buf[i + opts.offset]) {
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

	if (
		check([0x49, 0x44, 0x33]) ||
		check([0xFF, 0xFB])
	) {
		return {
			ext: 'mp3',
			mime: 'audio/mpeg'
		};
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

	if (check([0x4F, 0x67, 0x67, 0x53])) {
		return {
			ext: 'ogg',
			mime: 'audio/ogg'
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

	return null;
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json",
    ".coffee",
    ".jsx"
  ]
});
var exports = require("./node_modules/meteor/ostrio:files/server.coffee.js");

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
