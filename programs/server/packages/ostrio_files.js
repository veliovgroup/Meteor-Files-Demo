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
var process = Package.modules.process;
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
var events = void 0;                                                                                                   // 1
module.watch(require("events"), {                                                                                      // 1
  "default": function (v) {                                                                                            // 1
    events = v;                                                                                                        // 1
  }                                                                                                                    // 1
}, 5);                                                                                                                 // 1
var request = void 0;                                                                                                  // 1
module.watch(require("request"), {                                                                                     // 1
  "default": function (v) {                                                                                            // 1
    request = v;                                                                                                       // 1
  }                                                                                                                    // 1
}, 6);                                                                                                                 // 1
var Throttle = void 0;                                                                                                 // 1
module.watch(require("throttle"), {                                                                                    // 1
  "default": function (v) {                                                                                            // 1
    Throttle = v;                                                                                                      // 1
  }                                                                                                                    // 1
}, 7);                                                                                                                 // 1
var fileType = void 0;                                                                                                 // 1
module.watch(require("file-type"), {                                                                                   // 1
  "default": function (v) {                                                                                            // 1
    fileType = v;                                                                                                      // 1
  }                                                                                                                    // 1
}, 8);                                                                                                                 // 1
var nodePath = void 0;                                                                                                 // 1
module.watch(require("path"), {                                                                                        // 1
  "default": function (v) {                                                                                            // 1
    nodePath = v;                                                                                                      // 1
  }                                                                                                                    // 1
}, 9);                                                                                                                 // 1
/*                                                                                                                     // 16
@var {Object} bound - Meteor.bindEnvironment (Fiber wrapper)                                                           //
 */var NOOP, bound;                                                                                                    //
bound = Meteor.bindEnvironment(function (callback) {                                                                   // 19
  return callback();                                                                                                   // 19
});                                                                                                                    // 19
                                                                                                                       //
NOOP = function () {}; /*                                                                                              // 20
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
module.runSetters(FilesCollection = function () {                                                                      // 60
  FilesCollection.prototype.__proto__ = function () {                                                                  // 68
    return _.extend(events.EventEmitter.prototype, FilesCollectionCore.prototype);                                     // 69
  }();                                                                                                                 // 61
                                                                                                                       //
  function FilesCollection(config) {                                                                                   // 62
    var _iwcz, _methods, _preCollectionCursor, cookie, self, storagePath;                                              // 63
                                                                                                                       //
    events.EventEmitter.call(this);                                                                                    // 63
                                                                                                                       //
    if (config) {                                                                                                      // 64
      storagePath = config.storagePath, this.ddp = config.ddp, this.collection = config.collection, this.collectionName = config.collectionName, this.downloadRoute = config.downloadRoute, this.schema = config.schema, this.chunkSize = config.chunkSize, this.namingFunction = config.namingFunction, this.debug = config.debug, this.onbeforeunloadMessage = config.onbeforeunloadMessage, this.permissions = config.permissions, this.parentDirPermissions = config.parentDirPermissions, this.allowClientCode = config.allowClientCode, this.onBeforeUpload = config.onBeforeUpload, this.onInitiateUpload = config.onInitiateUpload, this.integrityCheck = config.integrityCheck, this["protected"] = config["protected"], this["public"] = config["public"], this.strict = config.strict, this.downloadCallback = config.downloadCallback, this.cacheControl = config.cacheControl, this.responseHeaders = config.responseHeaders, this.throttle = config.throttle, this.onAfterUpload = config.onAfterUpload, this.onAfterRemove = config.onAfterRemove, this.interceptDownload = config.interceptDownload, this.onBeforeRemove = config.onBeforeRemove, this.continueUploadTTL = config.continueUploadTTL;
    }                                                                                                                  // 77
                                                                                                                       //
    self = this;                                                                                                       // 66
    cookie = new Cookies();                                                                                            // 67
                                                                                                                       //
    if (this.debug == null) {                                                                                          // 80
      this.debug = false;                                                                                              // 68
    }                                                                                                                  // 82
                                                                                                                       //
    this._debug = function () {                                                                                        // 69
      if (self.debug) {                                                                                                // 70
        return console.info.apply(void 0, arguments);                                                                  // 85
      }                                                                                                                // 86
    };                                                                                                                 // 69
                                                                                                                       //
    if (this["public"] == null) {                                                                                      // 88
      this["public"] = false;                                                                                          // 71
    }                                                                                                                  // 90
                                                                                                                       //
    if (this["protected"] == null) {                                                                                   // 91
      this["protected"] = false;                                                                                       // 72
    }                                                                                                                  // 93
                                                                                                                       //
    if (this.chunkSize == null) {                                                                                      // 94
      this.chunkSize = 1024 * 512;                                                                                     // 73
    }                                                                                                                  // 96
                                                                                                                       //
    this.chunkSize = Math.floor(this.chunkSize / 8) * 8;                                                               // 74
                                                                                                                       //
    if (this["public"] && !this.downloadRoute) {                                                                       // 76
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: \"downloadRoute\" must be precisely provided on \"public\" collections! Note: \"downloadRoute\" must be equal or be inside of your web/proxy-server (relative) root.");
    }                                                                                                                  // 100
                                                                                                                       //
    if (this.collection == null) {                                                                                     // 101
      this.collection = new Mongo.Collection(this.collectionName);                                                     // 79
    }                                                                                                                  // 103
                                                                                                                       //
    if (this.collectionName == null) {                                                                                 // 104
      this.collectionName = this.collection._name;                                                                     // 80
    }                                                                                                                  // 106
                                                                                                                       //
    check(this.collectionName, String);                                                                                // 81
                                                                                                                       //
    if (this.downloadRoute == null) {                                                                                  // 108
      this.downloadRoute = '/cdn/storage';                                                                             // 82
    }                                                                                                                  // 110
                                                                                                                       //
    this.downloadRoute = this.downloadRoute.replace(/\/$/, '');                                                        // 83
                                                                                                                       //
    if (this.collectionName == null) {                                                                                 // 112
      this.collectionName = 'MeteorUploadFiles';                                                                       // 84
    }                                                                                                                  // 114
                                                                                                                       //
    if (this.namingFunction == null) {                                                                                 // 115
      this.namingFunction = false;                                                                                     // 85
    }                                                                                                                  // 117
                                                                                                                       //
    if (this.onBeforeUpload == null) {                                                                                 // 118
      this.onBeforeUpload = false;                                                                                     // 86
    }                                                                                                                  // 120
                                                                                                                       //
    if (this.allowClientCode == null) {                                                                                // 121
      this.allowClientCode = true;                                                                                     // 87
    }                                                                                                                  // 123
                                                                                                                       //
    if (this.ddp == null) {                                                                                            // 124
      this.ddp = Meteor;                                                                                               // 88
    }                                                                                                                  // 126
                                                                                                                       //
    if (this.onInitiateUpload == null) {                                                                               // 127
      this.onInitiateUpload = false;                                                                                   // 89
    }                                                                                                                  // 129
                                                                                                                       //
    if (this.interceptDownload == null) {                                                                              // 130
      this.interceptDownload = false;                                                                                  // 90
    }                                                                                                                  // 132
                                                                                                                       //
    if (storagePath == null) {                                                                                         // 133
      storagePath = function () {                                                                                      // 91
        return "assets" + nodePath.sep + "app" + nodePath.sep + "uploads" + nodePath.sep + this.collectionName;        // 135
      };                                                                                                               // 91
    }                                                                                                                  // 137
                                                                                                                       //
    if (_.isString(storagePath)) {                                                                                     // 93
      this.storagePath = function () {                                                                                 // 94
        return storagePath;                                                                                            // 140
      };                                                                                                               // 94
    } else {                                                                                                           // 93
      this.storagePath = function () {                                                                                 // 96
        var sp;                                                                                                        // 97
        sp = storagePath.apply(this, arguments);                                                                       // 97
                                                                                                                       //
        if (!_.isString(sp)) {                                                                                         // 98
          throw new Meteor.Error(400, "[FilesCollection." + self.collectionName + "] \"storagePath\" function must return a String!");
        }                                                                                                              // 148
                                                                                                                       //
        sp = sp.replace(/\/$/, '');                                                                                    // 100
        return nodePath.normalize(sp);                                                                                 // 101
      };                                                                                                               // 96
    }                                                                                                                  // 152
                                                                                                                       //
    if (this.strict == null) {                                                                                         // 153
      this.strict = true;                                                                                              // 103
    }                                                                                                                  // 155
                                                                                                                       //
    if (this.throttle == null) {                                                                                       // 156
      this.throttle = false;                                                                                           // 104
    }                                                                                                                  // 158
                                                                                                                       //
    if (this.permissions == null) {                                                                                    // 159
      this.permissions = parseInt('644', 8);                                                                           // 105
    }                                                                                                                  // 161
                                                                                                                       //
    if (this.parentDirPermissions == null) {                                                                           // 162
      this.parentDirPermissions = parseInt('755', 8);                                                                  // 106
    }                                                                                                                  // 164
                                                                                                                       //
    if (this.cacheControl == null) {                                                                                   // 165
      this.cacheControl = 'public, max-age=31536000, s-maxage=31536000';                                               // 107
    }                                                                                                                  // 167
                                                                                                                       //
    if (this.onAfterUpload == null) {                                                                                  // 168
      this.onAfterUpload = false;                                                                                      // 108
    }                                                                                                                  // 170
                                                                                                                       //
    if (this.onAfterRemove == null) {                                                                                  // 171
      this.onAfterRemove = false;                                                                                      // 109
    }                                                                                                                  // 173
                                                                                                                       //
    if (this.onBeforeRemove == null) {                                                                                 // 174
      this.onBeforeRemove = false;                                                                                     // 110
    }                                                                                                                  // 176
                                                                                                                       //
    if (this.integrityCheck == null) {                                                                                 // 177
      this.integrityCheck = true;                                                                                      // 111
    }                                                                                                                  // 179
                                                                                                                       //
    if (this._currentUploads == null) {                                                                                // 180
      this._currentUploads = {};                                                                                       // 112
    }                                                                                                                  // 182
                                                                                                                       //
    if (this.downloadCallback == null) {                                                                               // 183
      this.downloadCallback = false;                                                                                   // 113
    }                                                                                                                  // 185
                                                                                                                       //
    if (this.continueUploadTTL == null) {                                                                              // 186
      this.continueUploadTTL = 10800;                                                                                  // 114
    }                                                                                                                  // 188
                                                                                                                       //
    if (this.responseHeaders == null) {                                                                                // 189
      this.responseHeaders = function (responseCode, fileRef, versionRef) {                                            // 115
        var headers;                                                                                                   // 116
        headers = {};                                                                                                  // 116
                                                                                                                       //
        switch (responseCode) {                                                                                        // 117
          case '206':                                                                                                  // 117
            headers['Pragma'] = 'private';                                                                             // 119
            headers['Trailer'] = 'expires';                                                                            // 120
            headers['Transfer-Encoding'] = 'chunked';                                                                  // 121
            break;                                                                                                     // 118
                                                                                                                       //
          case '400':                                                                                                  // 117
            headers['Cache-Control'] = 'no-cache';                                                                     // 123
            break;                                                                                                     // 122
                                                                                                                       //
          case '416':                                                                                                  // 117
            headers['Content-Range'] = "bytes */" + versionRef.size;                                                   // 125
        }                                                                                                              // 117
                                                                                                                       //
        headers['Connection'] = 'keep-alive';                                                                          // 127
        headers['Content-Type'] = versionRef.type || 'application/octet-stream';                                       // 128
        headers['Accept-Ranges'] = 'bytes';                                                                            // 129
        return headers;                                                                                                // 130
      };                                                                                                               // 115
    }                                                                                                                  // 210
                                                                                                                       //
    if (this["public"] && !storagePath) {                                                                              // 132
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "] \"storagePath\" must be set on \"public\" collections! Note: \"storagePath\" must be equal on be inside of your web/proxy-server (absolute) root.");
    }                                                                                                                  // 213
                                                                                                                       //
    this._debug('[FilesCollection.storagePath] Set to:', this.storagePath({}));                                        // 135
                                                                                                                       //
    fs.mkdirs(this.storagePath({}), {                                                                                  // 137
      mode: this.parentDirPermissions                                                                                  // 137
    }, function (error) {                                                                                              // 137
      if (error) {                                                                                                     // 138
        throw new Meteor.Error(401, "[FilesCollection." + self.collectionName + "] Path \"" + self.storagePath({}) + "\" is not writable!", error);
      }                                                                                                                // 220
    });                                                                                                                // 137
    check(this.strict, Boolean);                                                                                       // 142
    check(this.throttle, Match.OneOf(false, Number));                                                                  // 143
    check(this.permissions, Number);                                                                                   // 144
    check(this.storagePath, Function);                                                                                 // 145
    check(this.cacheControl, String);                                                                                  // 146
    check(this.onAfterRemove, Match.OneOf(false, Function));                                                           // 147
    check(this.onAfterUpload, Match.OneOf(false, Function));                                                           // 148
    check(this.integrityCheck, Boolean);                                                                               // 149
    check(this.onBeforeRemove, Match.OneOf(false, Function));                                                          // 150
    check(this.downloadCallback, Match.OneOf(false, Function));                                                        // 151
    check(this.interceptDownload, Match.OneOf(false, Function));                                                       // 152
    check(this.continueUploadTTL, Number);                                                                             // 153
    check(this.responseHeaders, Match.OneOf(Object, Function));                                                        // 154
    this._preCollection = new Mongo.Collection('__pre_' + this.collectionName);                                        // 156
                                                                                                                       //
    this._preCollection._ensureIndex({                                                                                 // 157
      createdAt: 1                                                                                                     // 157
    }, {                                                                                                               // 157
      expireAfterSeconds: this.continueUploadTTL,                                                                      // 157
      background: true                                                                                                 // 157
    });                                                                                                                // 157
                                                                                                                       //
    _preCollectionCursor = this._preCollection.find({}, {                                                              // 158
      fields: {                                                                                                        // 159
        _id: 1,                                                                                                        // 160
        isFinished: 1                                                                                                  // 161
      }                                                                                                                // 160
    });                                                                                                                // 158
                                                                                                                       //
    _preCollectionCursor.observe({                                                                                     // 163
      changed: function (doc) {                                                                                        // 164
        if (doc.isFinished) {                                                                                          // 165
          self._debug("[FilesCollection] [_preCollectionCursor.observe] [changed]: " + doc._id);                       // 166
                                                                                                                       //
          self._preCollection.remove({                                                                                 // 167
            _id: doc._id                                                                                               // 167
          }, NOOP);                                                                                                    // 167
        }                                                                                                              // 255
      },                                                                                                               // 164
      removed: function (doc) {                                                                                        // 169
        var ref;                                                                                                       // 172
                                                                                                                       //
        self._debug("[FilesCollection] [_preCollectionCursor.observe] [removed]: " + doc._id);                         // 172
                                                                                                                       //
        if ((ref = self._currentUploads) != null ? ref[doc._id] : void 0) {                                            // 173
          self._currentUploads[doc._id].stop();                                                                        // 174
                                                                                                                       //
          self._currentUploads[doc._id].end();                                                                         // 175
                                                                                                                       //
          if (!doc.isFinished) {                                                                                       // 177
            self._debug("[FilesCollection] [_preCollectionCursor.observe] [removeUnfinishedUpload]: " + doc._id);      // 178
                                                                                                                       //
            self._currentUploads[doc._id].abort();                                                                     // 179
          }                                                                                                            // 266
                                                                                                                       //
          delete self._currentUploads[doc._id];                                                                        // 181
        }                                                                                                              // 268
      }                                                                                                                // 164
    });                                                                                                                // 164
                                                                                                                       //
    this._createStream = function (_id, path, opts) {                                                                  // 184
      return self._currentUploads[_id] = new writeStream(path, opts.fileLength, opts, self.permissions);               // 185
    };                                                                                                                 // 184
                                                                                                                       //
    _iwcz = 0;                                                                                                         // 189
                                                                                                                       //
    this._continueUpload = function (_id) {                                                                            // 190
      var contUpld, ref, ref1;                                                                                         // 191
                                                                                                                       //
      if ((ref = self._currentUploads) != null ? (ref1 = ref[_id]) != null ? ref1.file : void 0 : void 0) {            // 191
        if (!self._currentUploads[_id].aborted && !self._currentUploads[_id].ended) {                                  // 192
          return self._currentUploads[_id].file;                                                                       // 193
        } else {                                                                                                       // 192
          self._createStream(_id, self._currentUploads[_id].file.file.path, self._currentUploads[_id].file);           // 195
                                                                                                                       //
          return self._currentUploads[_id].file;                                                                       // 196
        }                                                                                                              // 191
      } else {                                                                                                         // 191
        contUpld = self._preCollection.findOne({                                                                       // 198
          _id: _id                                                                                                     // 198
        });                                                                                                            // 198
                                                                                                                       //
        if (contUpld) {                                                                                                // 199
          self._createStream(_id, contUpld.file.path, contUpld);                                                       // 200
                                                                                                                       //
          return self._currentUploads[_id].file;                                                                       // 201
        }                                                                                                              // 291
                                                                                                                       //
        return false;                                                                                                  // 202
      }                                                                                                                // 293
    };                                                                                                                 // 190
                                                                                                                       //
    if (!this.schema) {                                                                                                // 204
      this.schema = {                                                                                                  // 205
        size: {                                                                                                        // 206
          type: Number                                                                                                 // 206
        },                                                                                                             // 206
        name: {                                                                                                        // 207
          type: String                                                                                                 // 207
        },                                                                                                             // 207
        type: {                                                                                                        // 208
          type: String                                                                                                 // 208
        },                                                                                                             // 208
        path: {                                                                                                        // 209
          type: String                                                                                                 // 209
        },                                                                                                             // 209
        isVideo: {                                                                                                     // 210
          type: Boolean                                                                                                // 210
        },                                                                                                             // 210
        isAudio: {                                                                                                     // 211
          type: Boolean                                                                                                // 211
        },                                                                                                             // 211
        isImage: {                                                                                                     // 212
          type: Boolean                                                                                                // 212
        },                                                                                                             // 212
        isText: {                                                                                                      // 213
          type: Boolean                                                                                                // 213
        },                                                                                                             // 213
        isJSON: {                                                                                                      // 214
          type: Boolean                                                                                                // 214
        },                                                                                                             // 214
        isPDF: {                                                                                                       // 215
          type: Boolean                                                                                                // 215
        },                                                                                                             // 215
        extension: {                                                                                                   // 216
          type: String,                                                                                                // 217
          optional: true                                                                                               // 218
        },                                                                                                             // 217
        _storagePath: {                                                                                                // 219
          type: String                                                                                                 // 219
        },                                                                                                             // 219
        _downloadRoute: {                                                                                              // 220
          type: String                                                                                                 // 220
        },                                                                                                             // 220
        _collectionName: {                                                                                             // 221
          type: String                                                                                                 // 221
        },                                                                                                             // 221
        "public": {                                                                                                    // 222
          type: Boolean,                                                                                               // 223
          optional: true                                                                                               // 224
        },                                                                                                             // 223
        meta: {                                                                                                        // 225
          type: Object,                                                                                                // 226
          blackbox: true,                                                                                              // 227
          optional: true                                                                                               // 228
        },                                                                                                             // 226
        userId: {                                                                                                      // 229
          type: String,                                                                                                // 230
          optional: true                                                                                               // 231
        },                                                                                                             // 230
        updatedAt: {                                                                                                   // 232
          type: Date,                                                                                                  // 233
          optional: true                                                                                               // 234
        },                                                                                                             // 233
        versions: {                                                                                                    // 235
          type: Object,                                                                                                // 236
          blackbox: true                                                                                               // 237
        }                                                                                                              // 236
      };                                                                                                               // 206
    }                                                                                                                  // 362
                                                                                                                       //
    check(this.debug, Boolean);                                                                                        // 239
    check(this.schema, Object);                                                                                        // 240
    check(this["public"], Boolean);                                                                                    // 241
    check(this["protected"], Match.OneOf(Boolean, Function));                                                          // 242
    check(this.chunkSize, Number);                                                                                     // 243
    check(this.downloadRoute, String);                                                                                 // 244
    check(this.namingFunction, Match.OneOf(false, Function));                                                          // 245
    check(this.onBeforeUpload, Match.OneOf(false, Function));                                                          // 246
    check(this.onInitiateUpload, Match.OneOf(false, Function));                                                        // 247
    check(this.allowClientCode, Boolean);                                                                              // 248
    check(this.ddp, Match.Any);                                                                                        // 249
                                                                                                                       //
    if (this["public"] && this["protected"]) {                                                                         // 251
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: Files can not be public and protected at the same time!");
    }                                                                                                                  // 376
                                                                                                                       //
    this._checkAccess = function (http) {                                                                              // 254
      var fileRef, rc, ref, ref1, result, text, user, userId;                                                          // 255
                                                                                                                       //
      if (self["protected"]) {                                                                                         // 255
        ref = self._getUser(http), user = ref.user, userId = ref.userId;                                               // 256
                                                                                                                       //
        if (_.isFunction(self["protected"])) {                                                                         // 258
          if (http != null ? (ref1 = http.params) != null ? ref1._id : void 0 : void 0) {                              // 259
            fileRef = self.collection.findOne(http.params._id);                                                        // 260
          }                                                                                                            // 384
                                                                                                                       //
          result = http ? self["protected"].call(_.extend(http, {                                                      // 262
            user: user,                                                                                                // 262
            userId: userId                                                                                             // 262
          }), fileRef || null) : self["protected"].call({                                                              // 262
            user: user,                                                                                                // 262
            userId: userId                                                                                             // 262
          }, fileRef || null);                                                                                         // 262
        } else {                                                                                                       // 258
          result = !!userId;                                                                                           // 264
        }                                                                                                              // 394
                                                                                                                       //
        if (http && result === true || !http) {                                                                        // 266
          return true;                                                                                                 // 267
        } else {                                                                                                       // 266
          rc = _.isNumber(result) ? result : 401;                                                                      // 269
                                                                                                                       //
          self._debug('[FilesCollection._checkAccess] WARN: Access denied!');                                          // 270
                                                                                                                       //
          if (http) {                                                                                                  // 271
            text = 'Access denied!';                                                                                   // 272
                                                                                                                       //
            if (!http.response.headersSent) {                                                                          // 273
              http.response.writeHead(rc, {                                                                            // 274
                'Content-Length': text.length,                                                                         // 275
                'Content-Type': 'text/plain'                                                                           // 276
              });                                                                                                      // 275
            }                                                                                                          // 407
                                                                                                                       //
            if (!http.response.finished) {                                                                             // 277
              http.response.end(text);                                                                                 // 278
            }                                                                                                          // 271
          }                                                                                                            // 411
                                                                                                                       //
          return false;                                                                                                // 279
        }                                                                                                              // 255
      } else {                                                                                                         // 255
        return true;                                                                                                   // 281
      }                                                                                                                // 416
    };                                                                                                                 // 254
                                                                                                                       //
    this._methodNames = {                                                                                              // 283
      _Abort: "_FilesCollectionAbort_" + this.collectionName,                                                          // 284
      _Write: "_FilesCollectionWrite_" + this.collectionName,                                                          // 285
      _Start: "_FilesCollectionStart_" + this.collectionName,                                                          // 286
      _Remove: "_FilesCollectionRemove_" + this.collectionName                                                         // 287
    };                                                                                                                 // 284
    this.on('_handleUpload', this._handleUpload);                                                                      // 289
    this.on('_finishUpload', this._finishUpload);                                                                      // 290
    WebApp.connectHandlers.use(function (request, response, next) {                                                    // 292
      var _file, body, handleError, http, params, uri, uris, version;                                                  // 293
                                                                                                                       //
      if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName + "/__upload")) {          // 293
        if (request.method === 'POST') {                                                                               // 294
          handleError = function (error) {                                                                             // 296
            console.warn("[FilesCollection] [Upload] [HTTP] Exception:", error);                                       // 297
                                                                                                                       //
            if (!response.headersSent) {                                                                               // 298
              response.writeHead(500);                                                                                 // 299
            }                                                                                                          // 434
                                                                                                                       //
            if (!response.finished) {                                                                                  // 300
              response.end(JSON.stringify({                                                                            // 301
                error: error                                                                                           // 301
              }));                                                                                                     // 301
            }                                                                                                          // 439
          };                                                                                                           // 296
                                                                                                                       //
          body = '';                                                                                                   // 304
          request.on('data', function (data) {                                                                         // 305
            return bound(function () {                                                                                 // 443
              body += data;                                                                                            // 306
            });                                                                                                        // 305
          });                                                                                                          // 305
          request.on('end', function () {                                                                              // 309
            return bound(function () {                                                                                 // 448
              var _continueUpload, e, error, opts, ref, ref1, ref2, ref3, result, user;                                // 310
                                                                                                                       //
              try {                                                                                                    // 310
                if (request.headers['x-mtok'] && ((ref = Meteor.server.sessions) != null ? ref[request.headers['x-mtok']] : void 0)) {
                  user = {                                                                                             // 312
                    userId: (ref1 = Meteor.server.sessions[request.headers['x-mtok']]) != null ? ref1.userId : void 0  // 312
                  };                                                                                                   // 312
                } else {                                                                                               // 311
                  user = self._getUser({                                                                               // 314
                    request: request,                                                                                  // 314
                    response: response                                                                                 // 314
                  });                                                                                                  // 314
                }                                                                                                      // 460
                                                                                                                       //
                if (request.headers['x-start'] !== '1') {                                                              // 316
                  opts = {                                                                                             // 317
                    fileId: request.headers['x-fileid']                                                                // 317
                  };                                                                                                   // 317
                                                                                                                       //
                  if (request.headers['x-eof'] === '1') {                                                              // 318
                    opts.eof = true;                                                                                   // 319
                  } else {                                                                                             // 318
                    if (typeof Buffer.from === 'function') {                                                           // 321
                      try {                                                                                            // 322
                        opts.binData = Buffer.from(body, 'base64');                                                    // 323
                      } catch (error1) {                                                                               // 322
                        e = error1;                                                                                    // 324
                        opts.binData = new Buffer(body, 'base64');                                                     // 325
                      }                                                                                                // 321
                    } else {                                                                                           // 321
                      opts.binData = new Buffer(body, 'base64');                                                       // 327
                    }                                                                                                  // 477
                                                                                                                       //
                    opts.chunkId = parseInt(request.headers['x-chunkid']);                                             // 328
                  }                                                                                                    // 479
                                                                                                                       //
                  _continueUpload = self._continueUpload(opts.fileId);                                                 // 330
                                                                                                                       //
                  if (!_continueUpload) {                                                                              // 331
                    throw new Meteor.Error(408, 'Can\'t continue upload, session expired. Start upload again.');       // 332
                  }                                                                                                    // 483
                                                                                                                       //
                  ref2 = self._prepareUpload(_.extend(opts, _continueUpload), user.userId, 'HTTP'), result = ref2.result, opts = ref2.opts;
                                                                                                                       //
                  if (opts.eof) {                                                                                      // 336
                    self._handleUpload(result, opts, function () {                                                     // 337
                      var ref3;                                                                                        // 338
                                                                                                                       //
                      if (!response.headersSent) {                                                                     // 338
                        response.writeHead(200);                                                                       // 339
                      }                                                                                                // 490
                                                                                                                       //
                      if (result != null ? (ref3 = result.file) != null ? ref3.meta : void 0 : void 0) {               // 340
                        result.file.meta = fixJSONStringify(result.file.meta);                                         // 340
                      }                                                                                                // 493
                                                                                                                       //
                      if (!response.finished) {                                                                        // 341
                        response.end(JSON.stringify(result));                                                          // 342
                      }                                                                                                // 496
                    });                                                                                                // 337
                                                                                                                       //
                    return;                                                                                            // 344
                  } else {                                                                                             // 336
                    self.emit('_handleUpload', result, opts, NOOP);                                                    // 346
                  }                                                                                                    // 501
                                                                                                                       //
                  if (!response.headersSent) {                                                                         // 348
                    response.writeHead(204);                                                                           // 349
                  }                                                                                                    // 504
                                                                                                                       //
                  if (!response.finished) {                                                                            // 350
                    response.end();                                                                                    // 351
                  }                                                                                                    // 316
                } else {                                                                                               // 316
                  try {                                                                                                // 354
                    opts = JSON.parse(body);                                                                           // 355
                  } catch (error1) {                                                                                   // 354
                    e = error1;                                                                                        // 356
                    console.error('Can\'t parse incoming JSON from Client on [.insert() | upload], something went wrong!');
                    console.error(e);                                                                                  // 358
                    opts = {                                                                                           // 359
                      file: {}                                                                                         // 359
                    };                                                                                                 // 359
                  }                                                                                                    // 518
                                                                                                                       //
                  opts.___s = true;                                                                                    // 361
                                                                                                                       //
                  self._debug("[FilesCollection] [File Start HTTP] " + opts.file.name + " - " + opts.fileId);          // 362
                                                                                                                       //
                  if (opts != null ? (ref3 = opts.file) != null ? ref3.meta : void 0 : void 0) {                       // 363
                    opts.file.meta = fixJSONParse(opts.file.meta);                                                     // 363
                  }                                                                                                    // 523
                                                                                                                       //
                  result = self._prepareUpload(_.clone(opts), user.userId, 'HTTP Start Method').result;                // 364
                                                                                                                       //
                  if (self.collection.findOne(result._id)) {                                                           // 365
                    throw new Meteor.Error(400, 'Can\'t start upload, data substitution detected!');                   // 366
                  }                                                                                                    // 527
                                                                                                                       //
                  opts._id = opts.fileId;                                                                              // 367
                  opts.createdAt = new Date();                                                                         // 368
                  opts.maxLength = opts.fileLength;                                                                    // 369
                                                                                                                       //
                  self._preCollection.insert(_.omit(opts, '___s'));                                                    // 370
                                                                                                                       //
                  self._createStream(result._id, result.path, _.omit(opts, '___s'));                                   // 371
                                                                                                                       //
                  if (opts.returnMeta) {                                                                               // 373
                    if (!response.headersSent) {                                                                       // 374
                      response.writeHead(200);                                                                         // 375
                    }                                                                                                  // 536
                                                                                                                       //
                    if (!response.finished) {                                                                          // 376
                      response.end(JSON.stringify({                                                                    // 377
                        uploadRoute: self.downloadRoute + "/" + self.collectionName + "/__upload",                     // 378
                        file: result                                                                                   // 379
                      }));                                                                                             // 377
                    }                                                                                                  // 373
                  } else {                                                                                             // 373
                    if (!response.headersSent) {                                                                       // 382
                      response.writeHead(204);                                                                         // 383
                    }                                                                                                  // 546
                                                                                                                       //
                    if (!response.finished) {                                                                          // 384
                      response.end();                                                                                  // 385
                    }                                                                                                  // 373
                  }                                                                                                    // 316
                }                                                                                                      // 310
              } catch (error1) {                                                                                       // 310
                error = error1;                                                                                        // 386
                handleError(error);                                                                                    // 387
              }                                                                                                        // 555
            });                                                                                                        // 309
          });                                                                                                          // 309
        } else {                                                                                                       // 294
          next();                                                                                                      // 390
        }                                                                                                              // 560
                                                                                                                       //
        return;                                                                                                        // 391
      }                                                                                                                // 562
                                                                                                                       //
      if (!self["public"]) {                                                                                           // 393
        if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName)) {                      // 394
          uri = request._parsedUrl.path.replace(self.downloadRoute + "/" + self.collectionName, '');                   // 395
                                                                                                                       //
          if (uri.indexOf('/') === 0) {                                                                                // 396
            uri = uri.substring(1);                                                                                    // 397
          }                                                                                                            // 568
                                                                                                                       //
          uris = uri.split('/');                                                                                       // 399
                                                                                                                       //
          if (uris.length === 3) {                                                                                     // 400
            params = {                                                                                                 // 401
              query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
              _id: uris[0],                                                                                            // 403
              version: uris[1],                                                                                        // 404
              name: uris[2]                                                                                            // 405
            };                                                                                                         // 402
            http = {                                                                                                   // 406
              request: request,                                                                                        // 406
              response: response,                                                                                      // 406
              params: params                                                                                           // 406
            };                                                                                                         // 406
                                                                                                                       //
            if (self._checkAccess(http)) {                                                                             // 407
              self.download(http, uris[1], self.collection.findOne(uris[0]));                                          // 407
            }                                                                                                          // 400
          } else {                                                                                                     // 400
            next();                                                                                                    // 409
          }                                                                                                            // 394
        } else {                                                                                                       // 394
          next();                                                                                                      // 411
        }                                                                                                              // 393
      } else {                                                                                                         // 393
        if (!!~request._parsedUrl.path.indexOf("" + self.downloadRoute)) {                                             // 413
          uri = request._parsedUrl.path.replace("" + self.downloadRoute, '');                                          // 414
                                                                                                                       //
          if (uri.indexOf('/') === 0) {                                                                                // 415
            uri = uri.substring(1);                                                                                    // 416
          }                                                                                                            // 596
                                                                                                                       //
          uris = uri.split('/');                                                                                       // 418
          _file = uris[uris.length - 1];                                                                               // 419
                                                                                                                       //
          if (_file) {                                                                                                 // 420
            if (!!~_file.indexOf('-')) {                                                                               // 421
              version = _file.split('-')[0];                                                                           // 422
              _file = _file.split('-')[1].split('?')[0];                                                               // 423
            } else {                                                                                                   // 421
              version = 'original';                                                                                    // 425
              _file = _file.split('?')[0];                                                                             // 426
            }                                                                                                          // 606
                                                                                                                       //
            params = {                                                                                                 // 428
              query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
              file: _file,                                                                                             // 430
              _id: _file.split('.')[0],                                                                                // 431
              version: version,                                                                                        // 432
              name: _file                                                                                              // 433
            };                                                                                                         // 429
            http = {                                                                                                   // 434
              request: request,                                                                                        // 434
              response: response,                                                                                      // 434
              params: params                                                                                           // 434
            };                                                                                                         // 434
            self.download(http, version, self.collection.findOne(params._id));                                         // 435
          } else {                                                                                                     // 420
            next();                                                                                                    // 437
          }                                                                                                            // 413
        } else {                                                                                                       // 413
          next();                                                                                                      // 439
        }                                                                                                              // 393
      }                                                                                                                // 626
    });                                                                                                                // 292
    _methods = {};                                                                                                     // 442
                                                                                                                       //
    _methods[self._methodNames._Remove] = function (selector) {                                                        // 447
      var cursor, user, userFuncs;                                                                                     // 448
      check(selector, Match.OneOf(String, Object));                                                                    // 448
                                                                                                                       //
      self._debug("[FilesCollection] [Unlink Method] [.remove(" + selector + ")]");                                    // 449
                                                                                                                       //
      if (self.allowClientCode) {                                                                                      // 451
        if (self.onBeforeRemove && _.isFunction(self.onBeforeRemove)) {                                                // 452
          user = false;                                                                                                // 453
          userFuncs = {                                                                                                // 454
            userId: this.userId,                                                                                       // 455
            user: function () {                                                                                        // 456
              if (Meteor.users) {                                                                                      // 456
                return Meteor.users.findOne(this.userId);                                                              // 640
              } else {                                                                                                 // 456
                return null;                                                                                           // 642
              }                                                                                                        // 643
            }                                                                                                          // 454
          };                                                                                                           // 454
                                                                                                                       //
          if (!self.onBeforeRemove.call(userFuncs, self.find(selector) || null)) {                                     // 459
            throw new Meteor.Error(403, '[FilesCollection] [remove] Not permitted!');                                  // 460
          }                                                                                                            // 452
        }                                                                                                              // 649
                                                                                                                       //
        cursor = self.find(selector);                                                                                  // 462
                                                                                                                       //
        if (cursor.count() > 0) {                                                                                      // 463
          self.remove(selector);                                                                                       // 464
          return true;                                                                                                 // 465
        } else {                                                                                                       // 463
          throw new Meteor.Error(404, 'Cursor is empty, no files is removed');                                         // 467
        }                                                                                                              // 451
      } else {                                                                                                         // 451
        throw new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!');                // 469
      }                                                                                                                // 659
    };                                                                                                                 // 447
                                                                                                                       //
    _methods[self._methodNames._Start] = function (opts, returnMeta) {                                                 // 479
      var result;                                                                                                      // 480
      check(opts, {                                                                                                    // 480
        file: Object,                                                                                                  // 481
        fileId: String,                                                                                                // 482
        FSName: Match.Optional(String),                                                                                // 483
        chunkSize: Number,                                                                                             // 484
        fileLength: Number                                                                                             // 485
      });                                                                                                              // 480
      check(returnMeta, Match.Optional(Boolean));                                                                      // 488
                                                                                                                       //
      self._debug("[FilesCollection] [File Start Method] " + opts.file.name + " - " + opts.fileId);                    // 490
                                                                                                                       //
      opts.___s = true;                                                                                                // 491
      result = self._prepareUpload(_.clone(opts), this.userId, 'DDP Start Method').result;                             // 492
                                                                                                                       //
      if (self.collection.findOne(result._id)) {                                                                       // 493
        throw new Meteor.Error(400, 'Can\'t start upload, data substitution detected!');                               // 494
      }                                                                                                                // 676
                                                                                                                       //
      opts._id = opts.fileId;                                                                                          // 495
      opts.createdAt = new Date();                                                                                     // 496
      opts.maxLength = opts.fileLength;                                                                                // 497
                                                                                                                       //
      self._preCollection.insert(_.omit(opts, '___s'));                                                                // 498
                                                                                                                       //
      self._createStream(result._id, result.path, _.omit(opts, '___s'));                                               // 499
                                                                                                                       //
      if (returnMeta) {                                                                                                // 501
        return {                                                                                                       // 502
          uploadRoute: self.downloadRoute + "/" + self.collectionName + "/__upload",                                   // 503
          file: result                                                                                                 // 504
        };                                                                                                             // 502
      } else {                                                                                                         // 501
        return true;                                                                                                   // 507
      }                                                                                                                // 689
    };                                                                                                                 // 479
                                                                                                                       //
    _methods[self._methodNames._Write] = function (opts) {                                                             // 513
      var _continueUpload, e, ref, result;                                                                             // 514
                                                                                                                       //
      check(opts, {                                                                                                    // 514
        eof: Match.Optional(Boolean),                                                                                  // 515
        fileId: String,                                                                                                // 516
        binData: Match.Optional(String),                                                                               // 517
        chunkId: Match.Optional(Number)                                                                                // 518
      });                                                                                                              // 514
                                                                                                                       //
      if (opts.binData) {                                                                                              // 521
        if (typeof Buffer.from === 'function') {                                                                       // 522
          try {                                                                                                        // 523
            opts.binData = Buffer.from(opts.binData, 'base64');                                                        // 524
          } catch (error1) {                                                                                           // 523
            e = error1;                                                                                                // 525
            opts.binData = new Buffer(opts.binData, 'base64');                                                         // 526
          }                                                                                                            // 522
        } else {                                                                                                       // 522
          opts.binData = new Buffer(opts.binData, 'base64');                                                           // 528
        }                                                                                                              // 521
      }                                                                                                                // 710
                                                                                                                       //
      _continueUpload = self._continueUpload(opts.fileId);                                                             // 530
                                                                                                                       //
      if (!_continueUpload) {                                                                                          // 531
        throw new Meteor.Error(408, 'Can\'t continue upload, session expired. Start upload again.');                   // 532
      }                                                                                                                // 714
                                                                                                                       //
      this.unblock();                                                                                                  // 534
      ref = self._prepareUpload(_.extend(opts, _continueUpload), this.userId, 'DDP'), result = ref.result, opts = ref.opts;
                                                                                                                       //
      if (opts.eof) {                                                                                                  // 537
        try {                                                                                                          // 538
          return Meteor.wrapAsync(self._handleUpload.bind(self, result, opts))();                                      // 539
        } catch (error1) {                                                                                             // 538
          e = error1;                                                                                                  // 540
                                                                                                                       //
          self._debug("[FilesCollection] [Write Method] [DDP] Exception:", e);                                         // 541
                                                                                                                       //
          throw e;                                                                                                     // 542
        }                                                                                                              // 537
      } else {                                                                                                         // 537
        self.emit('_handleUpload', result, opts, NOOP);                                                                // 544
      }                                                                                                                // 727
                                                                                                                       //
      return true;                                                                                                     // 545
    };                                                                                                                 // 513
                                                                                                                       //
    _methods[self._methodNames._Abort] = function (_id) {                                                              // 552
      var _continueUpload, ref, ref1, ref2;                                                                            // 553
                                                                                                                       //
      check(_id, String);                                                                                              // 553
      _continueUpload = self._continueUpload(_id);                                                                     // 555
                                                                                                                       //
      self._debug("[FilesCollection] [Abort Method]: " + _id + " - " + (_continueUpload != null ? (ref = _continueUpload.file) != null ? ref.path : void 0 : void 0));
                                                                                                                       //
      if ((ref1 = self._currentUploads) != null ? ref1[_id] : void 0) {                                                // 558
        self._currentUploads[_id].stop();                                                                              // 559
                                                                                                                       //
        self._currentUploads[_id].abort();                                                                             // 560
      }                                                                                                                // 738
                                                                                                                       //
      if (_continueUpload) {                                                                                           // 562
        self._preCollection.remove({                                                                                   // 563
          _id: _id                                                                                                     // 563
        });                                                                                                            // 563
                                                                                                                       //
        self.remove({                                                                                                  // 564
          _id: _id                                                                                                     // 564
        });                                                                                                            // 564
                                                                                                                       //
        if (_continueUpload != null ? (ref2 = _continueUpload.file) != null ? ref2.path : void 0 : void 0) {           // 565
          self.unlink({                                                                                                // 565
            _id: _id,                                                                                                  // 565
            path: _continueUpload.file.path                                                                            // 565
          });                                                                                                          // 565
        }                                                                                                              // 562
      }                                                                                                                // 752
                                                                                                                       //
      return true;                                                                                                     // 566
    };                                                                                                                 // 552
                                                                                                                       //
    Meteor.methods(_methods);                                                                                          // 568
  } /*                                                                                                                 // 62
    @locus Server                                                                                                      //
    @memberOf FilesCollection                                                                                          //
    @name _prepareUpload                                                                                               //
    @summary Internal method. Used to optimize received data and check upload permission                               //
    @returns {Object}                                                                                                  //
     */                                                                                                                //
                                                                                                                       //
  FilesCollection.prototype._prepareUpload = function (opts, userId, transport) {                                      // 767
    var base, ctx, extension, extensionWithDot, fileName, isUploadAllowed, ref, result;                                // 578
                                                                                                                       //
    if (opts.eof == null) {                                                                                            // 769
      opts.eof = false;                                                                                                // 578
    }                                                                                                                  // 771
                                                                                                                       //
    if (opts.binData == null) {                                                                                        // 772
      opts.binData = 'EOF';                                                                                            // 579
    }                                                                                                                  // 774
                                                                                                                       //
    if (opts.chunkId == null) {                                                                                        // 775
      opts.chunkId = -1;                                                                                               // 580
    }                                                                                                                  // 777
                                                                                                                       //
    if (opts.FSName == null) {                                                                                         // 778
      opts.FSName = opts.fileId;                                                                                       // 581
    }                                                                                                                  // 780
                                                                                                                       //
    this._debug("[FilesCollection] [Upload] [" + transport + "] Got #" + opts.chunkId + "/" + opts.fileLength + " chunks, dst: " + (opts.file.name || opts.file.fileName));
                                                                                                                       //
    fileName = this._getFileName(opts.file);                                                                           // 585
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  // 586
                                                                                                                       //
    if ((base = opts.file).meta == null) {                                                                             // 784
      base.meta = {};                                                                                                  // 785
    }                                                                                                                  // 786
                                                                                                                       //
    result = opts.file;                                                                                                // 589
    result.name = fileName;                                                                                            // 590
    result.meta = opts.file.meta;                                                                                      // 591
    result.extension = extension;                                                                                      // 592
    result.ext = extension;                                                                                            // 593
    result._id = opts.fileId;                                                                                          // 594
    result.userId = userId || null;                                                                                    // 595
    opts.FSName = opts.FSName.replace(/([^a-z0-9\-\_]+)/gi, '-');                                                      // 596
    result.path = "" + this.storagePath(result) + nodePath.sep + opts.FSName + extensionWithDot;                       // 597
    result = _.extend(result, this._dataToSchema(result));                                                             // 598
                                                                                                                       //
    if (this.onBeforeUpload && _.isFunction(this.onBeforeUpload)) {                                                    // 600
      ctx = _.extend({                                                                                                 // 601
        file: opts.file                                                                                                // 602
      }, {                                                                                                             // 601
        chunkId: opts.chunkId,                                                                                         // 604
        userId: result.userId,                                                                                         // 605
        user: function () {                                                                                            // 606
          if (Meteor.users && result.userId) {                                                                         // 606
            return Meteor.users.findOne(result.userId);                                                                // 805
          } else {                                                                                                     // 606
            return null;                                                                                               // 807
          }                                                                                                            // 808
        },                                                                                                             // 603
        eof: opts.eof                                                                                                  // 607
      });                                                                                                              // 603
      isUploadAllowed = this.onBeforeUpload.call(ctx, result);                                                         // 609
                                                                                                                       //
      if (isUploadAllowed !== true) {                                                                                  // 611
        throw new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : '@onBeforeUpload() returned false');
      } else {                                                                                                         // 611
        if (opts.___s === true && this.onInitiateUpload && _.isFunction(this.onInitiateUpload)) {                      // 614
          this.onInitiateUpload.call(ctx, result);                                                                     // 615
        }                                                                                                              // 611
      }                                                                                                                // 600
    } else if (opts.___s === true && this.onInitiateUpload && _.isFunction(this.onInitiateUpload)) {                   // 600
      ctx = _.extend({                                                                                                 // 617
        file: opts.file                                                                                                // 618
      }, {                                                                                                             // 617
        chunkId: opts.chunkId,                                                                                         // 620
        userId: result.userId,                                                                                         // 621
        user: function () {                                                                                            // 622
          if (Meteor.users && result.userId) {                                                                         // 622
            return Meteor.users.findOne(result.userId);                                                                // 828
          } else {                                                                                                     // 622
            return null;                                                                                               // 830
          }                                                                                                            // 831
        },                                                                                                             // 619
        eof: opts.eof                                                                                                  // 623
      });                                                                                                              // 619
      this.onInitiateUpload.call(ctx, result);                                                                         // 625
    }                                                                                                                  // 836
                                                                                                                       //
    return {                                                                                                           // 627
      result: result,                                                                                                  // 627
      opts: opts                                                                                                       // 627
    };                                                                                                                 // 627
  }; /*                                                                                                                // 577
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name _finishUpload                                                                                               //
     @summary Internal method. Finish upload, close Writable stream, add record to MongoDB and flush used memory       //
     @returns {undefined}                                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._finishUpload = function (result, opts, cb) {                                              // 852
    var self;                                                                                                          // 637
                                                                                                                       //
    this._debug("[FilesCollection] [Upload] [finish(ing)Upload] -> " + result.path);                                   // 637
                                                                                                                       //
    fs.chmod(result.path, this.permissions, NOOP);                                                                     // 638
    self = this;                                                                                                       // 639
    result.type = this._getMimeType(opts.file);                                                                        // 640
    result["public"] = this["public"];                                                                                 // 641
                                                                                                                       //
    this._updateFileTypes(result);                                                                                     // 642
                                                                                                                       //
    this.collection.insert(_.clone(result), function (error, _id) {                                                    // 644
      if (error) {                                                                                                     // 645
        cb && cb(error);                                                                                               // 646
                                                                                                                       //
        self._debug('[FilesCollection] [Upload] [_finishUpload] Error:', error);                                       // 647
      } else {                                                                                                         // 645
        self._preCollection.update({                                                                                   // 649
          _id: opts.fileId                                                                                             // 649
        }, {                                                                                                           // 649
          $set: {                                                                                                      // 649
            isFinished: true                                                                                           // 649
          }                                                                                                            // 649
        });                                                                                                            // 649
                                                                                                                       //
        result._id = _id;                                                                                              // 650
                                                                                                                       //
        self._debug("[FilesCollection] [Upload] [finish(ed)Upload] -> " + result.path);                                // 651
                                                                                                                       //
        self.onAfterUpload && self.onAfterUpload.call(self, result);                                                   // 652
        self.emit('afterUpload', result);                                                                              // 653
        cb && cb(null, result);                                                                                        // 654
      }                                                                                                                // 877
    });                                                                                                                // 644
  }; /*                                                                                                                // 636
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name _handleUpload                                                                                               //
     @summary Internal method to handle upload process, pipe incoming data to Writable stream                          //
     @returns {undefined}                                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._handleUpload = function (result, opts, cb) {                                              // 890
    var e, self;                                                                                                       // 666
                                                                                                                       //
    try {                                                                                                              // 666
      if (opts.eof) {                                                                                                  // 667
        self = this;                                                                                                   // 668
                                                                                                                       //
        this._currentUploads[result._id].end(function () {                                                             // 669
          self.emit('_finishUpload', result, opts, cb);                                                                // 670
        });                                                                                                            // 669
      } else {                                                                                                         // 667
        this._currentUploads[result._id].write(opts.chunkId, opts.binData, cb);                                        // 673
      }                                                                                                                // 666
    } catch (error1) {                                                                                                 // 666
      e = error1;                                                                                                      // 674
                                                                                                                       //
      this._debug("[_handleUpload] [EXCEPTION:]", e);                                                                  // 675
                                                                                                                       //
      cb && cb(e);                                                                                                     // 676
    }                                                                                                                  // 905
  }; /*                                                                                                                // 665
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _getMimeType                                                                                                //
     @param {Object} fileData - File Object                                                                            //
     @summary Returns file's mime-type                                                                                 //
     @returns {String}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._getMimeType = function (fileData) {                                                       // 918
    var br, buf, error, ext, fd, mime, ref;                                                                            // 688
    check(fileData, Object);                                                                                           // 688
                                                                                                                       //
    if (fileData != null ? fileData.type : void 0) {                                                                   // 689
      mime = fileData.type;                                                                                            // 689
    }                                                                                                                  // 923
                                                                                                                       //
    if (fileData.path && (!mime || !_.isString(mime))) {                                                               // 690
      try {                                                                                                            // 691
        buf = new Buffer(262);                                                                                         // 692
        fd = fs.openSync(fileData.path, 'r');                                                                          // 693
        br = fs.readSync(fd, buf, 0, 262, 0);                                                                          // 694
        fs.close(fd, NOOP);                                                                                            // 695
                                                                                                                       //
        if (br < 262) {                                                                                                // 696
          buf = buf.slice(0, br);                                                                                      // 696
        }                                                                                                              // 932
                                                                                                                       //
        ref = fileType(buf), mime = ref.mime, ext = ref.ext;                                                           // 697
      } catch (error1) {                                                                                               // 691
        error = error1;                                                                                                // 698
      }                                                                                                                // 690
    }                                                                                                                  // 937
                                                                                                                       //
    if (!mime || !_.isString(mime)) {                                                                                  // 699
      mime = 'application/octet-stream';                                                                               // 700
    }                                                                                                                  // 940
                                                                                                                       //
    return mime;                                                                                                       // 701
  }; /*                                                                                                                // 687
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _getUser                                                                                                    //
     @summary Returns object with `userId` and `user()` method which return user's object                              //
     @returns {Object}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._getUser = function (http) {                                                               // 953
    var cookie, mtok, ref, ref1, result, userId;                                                                       // 711
    result = {                                                                                                         // 711
      user: function () {                                                                                              // 712
        return null;                                                                                                   // 712
      },                                                                                                               // 712
      userId: null                                                                                                     // 713
    };                                                                                                                 // 712
                                                                                                                       //
    if (http) {                                                                                                        // 715
      mtok = null;                                                                                                     // 716
                                                                                                                       //
      if (http.request.headers['x-mtok']) {                                                                            // 717
        mtok = http.request.headers['x-mtok'];                                                                         // 718
      } else {                                                                                                         // 717
        cookie = http.request.Cookies;                                                                                 // 720
                                                                                                                       //
        if (cookie.has('x_mtok')) {                                                                                    // 721
          mtok = cookie.get('x_mtok');                                                                                 // 722
        }                                                                                                              // 717
      }                                                                                                                // 970
                                                                                                                       //
      if (mtok) {                                                                                                      // 724
        userId = (ref = Meteor.server.sessions) != null ? (ref1 = ref[mtok]) != null ? ref1.userId : void 0 : void 0;  // 725
                                                                                                                       //
        if (userId) {                                                                                                  // 726
          result.user = function () {                                                                                  // 727
            return Meteor.users.findOne(userId);                                                                       // 975
          };                                                                                                           // 727
                                                                                                                       //
          result.userId = userId;                                                                                      // 728
        }                                                                                                              // 724
      }                                                                                                                // 715
    }                                                                                                                  // 980
                                                                                                                       //
    return result;                                                                                                     // 730
  }; /*                                                                                                                // 710
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
  FilesCollection.prototype.write = function (buffer, opts, callback, proceedAfterUpload) {                            // 1002
    var FSName, extension, extensionWithDot, fileId, fileName, ref, result, self, stream;                              // 749
                                                                                                                       //
    if (opts == null) {                                                                                                // 1004
      opts = {};                                                                                                       // 748
    }                                                                                                                  // 1006
                                                                                                                       //
    this._debug('[FilesCollection] [write()]');                                                                        // 749
                                                                                                                       //
    if (_.isFunction(opts)) {                                                                                          // 751
      proceedAfterUpload = callback;                                                                                   // 752
      callback = opts;                                                                                                 // 753
      opts = {};                                                                                                       // 754
    } else if (_.isBoolean(callback)) {                                                                                // 751
      proceedAfterUpload = callback;                                                                                   // 756
    } else if (_.isBoolean(opts)) {                                                                                    // 755
      proceedAfterUpload = opts;                                                                                       // 758
    }                                                                                                                  // 1016
                                                                                                                       //
    check(opts, Match.Optional(Object));                                                                               // 760
    check(callback, Match.Optional(Function));                                                                         // 761
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                // 762
    fileId = opts.fileId || Random.id();                                                                               // 764
    FSName = this.namingFunction ? this.namingFunction(opts) : fileId;                                                 // 765
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : FSName;                                       // 766
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  // 768
    self = this;                                                                                                       // 770
                                                                                                                       //
    if (opts == null) {                                                                                                // 1025
      opts = {};                                                                                                       // 771
    }                                                                                                                  // 1027
                                                                                                                       //
    opts.path = "" + this.storagePath(opts) + nodePath.sep + FSName + extensionWithDot;                                // 772
    opts.type = this._getMimeType(opts);                                                                               // 773
                                                                                                                       //
    if (opts.meta == null) {                                                                                           // 1030
      opts.meta = {};                                                                                                  // 774
    }                                                                                                                  // 1032
                                                                                                                       //
    if (opts.size == null) {                                                                                           // 1033
      opts.size = buffer.length;                                                                                       // 775
    }                                                                                                                  // 1035
                                                                                                                       //
    result = this._dataToSchema({                                                                                      // 777
      name: fileName,                                                                                                  // 778
      path: opts.path,                                                                                                 // 779
      meta: opts.meta,                                                                                                 // 780
      type: opts.type,                                                                                                 // 781
      size: opts.size,                                                                                                 // 782
      userId: opts.userId,                                                                                             // 783
      extension: extension                                                                                             // 784
    });                                                                                                                // 778
    result._id = fileId;                                                                                               // 786
    stream = fs.createWriteStream(opts.path, {                                                                         // 788
      flags: 'w',                                                                                                      // 788
      mode: this.permissions                                                                                           // 788
    });                                                                                                                // 788
    stream.end(buffer, function (error) {                                                                              // 789
      return bound(function () {                                                                                       // 1051
        if (error) {                                                                                                   // 790
          callback && callback(error);                                                                                 // 791
        } else {                                                                                                       // 790
          self.collection.insert(result, function (error, _id) {                                                       // 793
            var fileRef;                                                                                               // 794
                                                                                                                       //
            if (error) {                                                                                               // 794
              callback && callback(error);                                                                             // 795
                                                                                                                       //
              self._debug("[FilesCollection] [write] [insert] Error: " + fileName + " -> " + self.collectionName, error);
            } else {                                                                                                   // 794
              fileRef = self.collection.findOne(_id);                                                                  // 798
              callback && callback(null, fileRef);                                                                     // 799
                                                                                                                       //
              if (proceedAfterUpload === true) {                                                                       // 800
                self.onAfterUpload && self.onAfterUpload.call(self, fileRef);                                          // 801
                self.emit('afterUpload', fileRef);                                                                     // 802
              }                                                                                                        // 1066
                                                                                                                       //
              self._debug("[FilesCollection] [write]: " + fileName + " -> " + self.collectionName);                    // 803
            }                                                                                                          // 1068
          });                                                                                                          // 793
        }                                                                                                              // 1070
      });                                                                                                              // 789
    });                                                                                                                // 789
    return this;                                                                                                       // 806
  }; /*                                                                                                                // 748
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
  FilesCollection.prototype.load = function (url, opts, callback, proceedAfterUpload) {                                // 1094
    var FSName, extension, extensionWithDot, fileId, fileName, pathParts, ref, self, storeResult;                      // 825
                                                                                                                       //
    this._debug("[FilesCollection] [load(" + url + ", " + JSON.stringify(opts) + ", callback)]");                      // 825
                                                                                                                       //
    if (_.isFunction(opts)) {                                                                                          // 827
      proceedAfterUpload = callback;                                                                                   // 828
      callback = opts;                                                                                                 // 829
      opts = {};                                                                                                       // 830
    } else if (_.isBoolean(callback)) {                                                                                // 827
      proceedAfterUpload = callback;                                                                                   // 832
    } else if (_.isBoolean(opts)) {                                                                                    // 831
      proceedAfterUpload = opts;                                                                                       // 834
    }                                                                                                                  // 1105
                                                                                                                       //
    check(url, String);                                                                                                // 836
    check(opts, Match.Optional(Object));                                                                               // 837
    check(callback, Match.Optional(Function));                                                                         // 838
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                // 839
    self = this;                                                                                                       // 841
                                                                                                                       //
    if (opts == null) {                                                                                                // 1111
      opts = {};                                                                                                       // 842
    }                                                                                                                  // 1113
                                                                                                                       //
    fileId = opts.fileId || Random.id();                                                                               // 843
    FSName = this.namingFunction ? this.namingFunction(opts) : fileId;                                                 // 844
    pathParts = url.split('/');                                                                                        // 845
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : pathParts[pathParts.length - 1] || FSName;    // 846
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  // 848
                                                                                                                       //
    if (opts.meta == null) {                                                                                           // 1119
      opts.meta = {};                                                                                                  // 849
    }                                                                                                                  // 1121
                                                                                                                       //
    opts.path = "" + this.storagePath(opts) + nodePath.sep + FSName + extensionWithDot;                                // 850
                                                                                                                       //
    storeResult = function (result, callback) {                                                                        // 852
      result._id = fileId;                                                                                             // 853
      self.collection.insert(result, function (error, _id) {                                                           // 855
        var fileRef;                                                                                                   // 856
                                                                                                                       //
        if (error) {                                                                                                   // 856
          callback && callback(error);                                                                                 // 857
                                                                                                                       //
          self._debug("[FilesCollection] [load] [insert] Error: " + fileName + " -> " + self.collectionName, error);   // 858
        } else {                                                                                                       // 856
          fileRef = self.collection.findOne(_id);                                                                      // 860
          callback && callback(null, fileRef);                                                                         // 861
                                                                                                                       //
          if (proceedAfterUpload === true) {                                                                           // 862
            self.onAfterUpload && self.onAfterUpload.call(self, fileRef);                                              // 863
            self.emit('afterUpload', fileRef);                                                                         // 864
          }                                                                                                            // 1136
                                                                                                                       //
          self._debug("[FilesCollection] [load] [insert] " + fileName + " -> " + self.collectionName);                 // 865
        }                                                                                                              // 1138
      });                                                                                                              // 855
    };                                                                                                                 // 852
                                                                                                                       //
    request.get(url).on('error', function (error) {                                                                    // 869
      return bound(function () {                                                                                       // 1142
        callback && callback(error);                                                                                   // 870
        return self._debug("[FilesCollection] [load] [request.get(" + url + ")] Error:", error);                       // 1144
      });                                                                                                              // 869
    }).on('response', function (response) {                                                                            // 869
      return bound(function () {                                                                                       // 1147
        response.on('end', function () {                                                                               // 873
          return bound(function () {                                                                                   // 1149
            var result;                                                                                                // 874
                                                                                                                       //
            self._debug("[FilesCollection] [load] Received: " + url);                                                  // 874
                                                                                                                       //
            result = self._dataToSchema({                                                                              // 875
              name: fileName,                                                                                          // 876
              path: opts.path,                                                                                         // 877
              meta: opts.meta,                                                                                         // 878
              type: opts.type || response.headers['content-type'] || self._getMimeType({                               // 879
                path: opts.path                                                                                        // 879
              }),                                                                                                      // 879
              size: opts.size || parseInt(response.headers['content-length'] || 0),                                    // 880
              userId: opts.userId,                                                                                     // 881
              extension: extension                                                                                     // 882
            });                                                                                                        // 876
                                                                                                                       //
            if (!result.size) {                                                                                        // 884
              fs.stat(opts.path, function (error, stats) {                                                             // 885
                return bound(function () {                                                                             // 1165
                  if (error) {                                                                                         // 886
                    callback && callback(error);                                                                       // 887
                  } else {                                                                                             // 886
                    result.versions.original.size = result.size = stats.size;                                          // 889
                    storeResult(result, callback);                                                                     // 890
                  }                                                                                                    // 1171
                });                                                                                                    // 885
              });                                                                                                      // 885
            } else {                                                                                                   // 884
              storeResult(result, callback);                                                                           // 893
            }                                                                                                          // 1176
          });                                                                                                          // 873
        });                                                                                                            // 873
      });                                                                                                              // 872
    }).pipe(fs.createWriteStream(opts.path, {                                                                          // 869
      flags: 'w',                                                                                                      // 897
      mode: this.permissions                                                                                           // 897
    }));                                                                                                               // 897
    return this;                                                                                                       // 899
  }; /*                                                                                                                // 824
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
  FilesCollection.prototype.addFile = function (path, opts, callback, proceedAfterUpload) {                            // 1204
    var self;                                                                                                          // 917
                                                                                                                       //
    this._debug("[FilesCollection] [addFile(" + path + ")]");                                                          // 917
                                                                                                                       //
    if (_.isFunction(opts)) {                                                                                          // 919
      proceedAfterUpload = callback;                                                                                   // 920
      callback = opts;                                                                                                 // 921
      opts = {};                                                                                                       // 922
    } else if (_.isBoolean(callback)) {                                                                                // 919
      proceedAfterUpload = callback;                                                                                   // 924
    } else if (_.isBoolean(opts)) {                                                                                    // 923
      proceedAfterUpload = opts;                                                                                       // 926
    }                                                                                                                  // 1215
                                                                                                                       //
    if (this["public"]) {                                                                                              // 928
      throw new Meteor.Error(403, 'Can not run [addFile] on public collection! Just Move file to root of your server, then add record to Collection');
    }                                                                                                                  // 1218
                                                                                                                       //
    check(path, String);                                                                                               // 929
    check(opts, Match.Optional(Object));                                                                               // 930
    check(callback, Match.Optional(Function));                                                                         // 931
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                // 932
    self = this;                                                                                                       // 934
    fs.stat(path, function (error, stats) {                                                                            // 935
      return bound(function () {                                                                                       // 1225
        var extension, extensionWithDot, pathParts, ref, result;                                                       // 936
                                                                                                                       //
        if (error) {                                                                                                   // 936
          callback && callback(error);                                                                                 // 937
        } else if (stats.isFile()) {                                                                                   // 936
          if (opts == null) {                                                                                          // 1230
            opts = {};                                                                                                 // 939
          }                                                                                                            // 1232
                                                                                                                       //
          opts.path = path;                                                                                            // 940
                                                                                                                       //
          if (!opts.fileName) {                                                                                        // 942
            pathParts = path.split(nodePath.sep);                                                                      // 943
            opts.fileName = pathParts[pathParts.length - 1];                                                           // 944
          }                                                                                                            // 1237
                                                                                                                       //
          ref = self._getExt(opts.fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;       // 946
                                                                                                                       //
          if (opts.type == null) {                                                                                     // 1239
            opts.type = self._getMimeType(opts);                                                                       // 948
          }                                                                                                            // 1241
                                                                                                                       //
          if (opts.meta == null) {                                                                                     // 1242
            opts.meta = {};                                                                                            // 949
          }                                                                                                            // 1244
                                                                                                                       //
          if (opts.size == null) {                                                                                     // 1245
            opts.size = stats.size;                                                                                    // 950
          }                                                                                                            // 1247
                                                                                                                       //
          result = self._dataToSchema({                                                                                // 952
            name: opts.fileName,                                                                                       // 953
            path: path,                                                                                                // 954
            meta: opts.meta,                                                                                           // 955
            type: opts.type,                                                                                           // 956
            size: opts.size,                                                                                           // 957
            userId: opts.userId,                                                                                       // 958
            extension: extension,                                                                                      // 959
            _storagePath: path.replace("" + nodePath.sep + opts.fileName, ''),                                         // 960
            fileId: opts.fileId || null                                                                                // 961
          });                                                                                                          // 953
          self.collection.insert(result, function (error, _id) {                                                       // 964
            var fileRef;                                                                                               // 965
                                                                                                                       //
            if (error) {                                                                                               // 965
              callback && callback(error);                                                                             // 966
                                                                                                                       //
              self._debug("[FilesCollection] [addFile] [insert] Error: " + result.name + " -> " + self.collectionName, error);
            } else {                                                                                                   // 965
              fileRef = self.collection.findOne(_id);                                                                  // 969
              callback && callback(null, fileRef);                                                                     // 970
                                                                                                                       //
              if (proceedAfterUpload === true) {                                                                       // 971
                self.onAfterUpload && self.onAfterUpload.call(self, fileRef);                                          // 972
                self.emit('afterUpload', fileRef);                                                                     // 973
              }                                                                                                        // 1270
                                                                                                                       //
              self._debug("[FilesCollection] [addFile]: " + result.name + " -> " + self.collectionName);               // 974
            }                                                                                                          // 1272
          });                                                                                                          // 964
        } else {                                                                                                       // 938
          callback && callback(new Meteor.Error(400, "[FilesCollection] [addFile(" + path + ")]: File does not exist"));
        }                                                                                                              // 1276
      });                                                                                                              // 935
    });                                                                                                                // 935
    return this;                                                                                                       // 979
  }; /*                                                                                                                // 916
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name remove                                                                                                      //
     @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)    //
     @param {Function} callback - Callback with one `error` argument                                                   //
     @summary Remove documents from the collection                                                                     //
     @returns {FilesCollection} Instance                                                                               //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.remove = function (selector, callback) {                                                   // 1293
    var docs, files, self;                                                                                             // 991
                                                                                                                       //
    if (selector == null) {                                                                                            // 1295
      selector = {};                                                                                                   // 990
    }                                                                                                                  // 1297
                                                                                                                       //
    this._debug("[FilesCollection] [remove(" + JSON.stringify(selector) + ")]");                                       // 991
                                                                                                                       //
    check(selector, Match.OneOf(Object, String));                                                                      // 992
    check(callback, Match.Optional(Function));                                                                         // 993
    files = this.collection.find(selector);                                                                            // 995
                                                                                                                       //
    if (files.count() > 0) {                                                                                           // 996
      self = this;                                                                                                     // 997
      files.forEach(function (file) {                                                                                  // 998
        self.unlink(file);                                                                                             // 999
      });                                                                                                              // 998
    } else {                                                                                                           // 996
      callback && callback(new Meteor.Error(404, 'Cursor is empty, no files is removed'));                             // 1002
      return this;                                                                                                     // 1003
    }                                                                                                                  // 1310
                                                                                                                       //
    if (this.onAfterRemove) {                                                                                          // 1005
      self = this;                                                                                                     // 1006
      docs = files.fetch();                                                                                            // 1007
      this.collection.remove(selector, function () {                                                                   // 1009
        callback && callback.apply(this, arguments);                                                                   // 1010
        self.onAfterRemove(docs);                                                                                      // 1011
      });                                                                                                              // 1009
    } else {                                                                                                           // 1005
      this.collection.remove(selector, callback || NOOP);                                                              // 1014
    }                                                                                                                  // 1320
                                                                                                                       //
    return this;                                                                                                       // 1015
  }; /*                                                                                                                // 990
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name deny                                                                                                        //
     @param {Object} rules                                                                                             //
     @see  https://docs.meteor.com/api/collections.html#Mongo-Collection-deny                                          //
     @summary link Mongo.Collection deny methods                                                                       //
     @returns {Mongo.Collection} Instance                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.deny = function (rules) {                                                                  // 1335
    this.collection.deny(rules);                                                                                       // 1027
    return this.collection;                                                                                            // 1028
  }; /*                                                                                                                // 1026
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name allow                                                                                                       //
     @param {Object} rules                                                                                             //
     @see https://docs.meteor.com/api/collections.html#Mongo-Collection-allow                                          //
     @summary link Mongo.Collection allow methods                                                                      //
     @returns {Mongo.Collection} Instance                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.allow = function (rules) {                                                                 // 1351
    this.collection.allow(rules);                                                                                      // 1040
    return this.collection;                                                                                            // 1041
  }; /*                                                                                                                // 1039
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name denyClient                                                                                                  //
     @see https://docs.meteor.com/api/collections.html#Mongo-Collection-deny                                           //
     @summary Shorthands for Mongo.Collection deny method                                                              //
     @returns {Mongo.Collection} Instance                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.denyClient = function () {                                                                 // 1366
    this.collection.deny({                                                                                             // 1052
      insert: function () {                                                                                            // 1053
        return true;                                                                                                   // 1369
      },                                                                                                               // 1053
      update: function () {                                                                                            // 1054
        return true;                                                                                                   // 1372
      },                                                                                                               // 1053
      remove: function () {                                                                                            // 1055
        return true;                                                                                                   // 1375
      }                                                                                                                // 1053
    });                                                                                                                // 1053
    return this.collection;                                                                                            // 1056
  }; /*                                                                                                                // 1051
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name allowClient                                                                                                 //
     @see https://docs.meteor.com/api/collections.html#Mongo-Collection-allow                                          //
     @summary Shorthands for Mongo.Collection allow method                                                             //
     @returns {Mongo.Collection} Instance                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.allowClient = function () {                                                                // 1391
    this.collection.allow({                                                                                            // 1067
      insert: function () {                                                                                            // 1068
        return true;                                                                                                   // 1394
      },                                                                                                               // 1068
      update: function () {                                                                                            // 1069
        return true;                                                                                                   // 1397
      },                                                                                                               // 1068
      remove: function () {                                                                                            // 1070
        return true;                                                                                                   // 1400
      }                                                                                                                // 1068
    });                                                                                                                // 1068
    return this.collection;                                                                                            // 1071
  }; /*                                                                                                                // 1066
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
  FilesCollection.prototype.unlink = function (fileRef, version, callback) {                                           // 1418
    var ref, ref1;                                                                                                     // 1085
                                                                                                                       //
    this._debug("[FilesCollection] [unlink(" + fileRef._id + ", " + version + ")]");                                   // 1085
                                                                                                                       //
    if (version) {                                                                                                     // 1086
      if (((ref = fileRef.versions) != null ? ref[version] : void 0) && ((ref1 = fileRef.versions[version]) != null ? ref1.path : void 0)) {
        fs.unlink(fileRef.versions[version].path, callback || NOOP);                                                   // 1088
      }                                                                                                                // 1086
    } else {                                                                                                           // 1086
      if (fileRef.versions && !_.isEmpty(fileRef.versions)) {                                                          // 1090
        _.each(fileRef.versions, function (vRef) {                                                                     // 1091
          return bound(function () {                                                                                   // 1428
            fs.unlink(vRef.path, callback || NOOP);                                                                    // 1092
          });                                                                                                          // 1091
        });                                                                                                            // 1091
      } else {                                                                                                         // 1090
        fs.unlink(fileRef.path, callback || NOOP);                                                                     // 1095
      }                                                                                                                // 1086
    }                                                                                                                  // 1435
                                                                                                                       //
    return this;                                                                                                       // 1096
  }; /*                                                                                                                // 1084
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name _404                                                                                                        //
     @summary Internal method, used to return 404 error                                                                //
     @returns {undefined}                                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._404 = function (http) {                                                                   // 1448
    var text;                                                                                                          // 1106
                                                                                                                       //
    this._debug("[FilesCollection] [download(" + http.request.originalUrl + ")] [_404] File not found");               // 1106
                                                                                                                       //
    text = 'File Not Found :(';                                                                                        // 1107
                                                                                                                       //
    if (!http.response.headersSent) {                                                                                  // 1109
      http.response.writeHead(404, {                                                                                   // 1110
        'Content-Length': text.length,                                                                                 // 1111
        'Content-Type': 'text/plain'                                                                                   // 1112
      });                                                                                                              // 1111
    }                                                                                                                  // 1457
                                                                                                                       //
    if (!http.response.finished) {                                                                                     // 1113
      http.response.end(text);                                                                                         // 1114
    }                                                                                                                  // 1460
  }; /*                                                                                                                // 1105
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
  FilesCollection.prototype.download = function (http, version, fileRef) {                                             // 1475
    var self, vRef;                                                                                                    // 1128
                                                                                                                       //
    if (version == null) {                                                                                             // 1477
      version = 'original';                                                                                            // 1127
    }                                                                                                                  // 1479
                                                                                                                       //
    this._debug("[FilesCollection] [download(" + http.request.originalUrl + ", " + version + ")]");                    // 1128
                                                                                                                       //
    if (fileRef) {                                                                                                     // 1129
      if (_.has(fileRef, 'versions') && _.has(fileRef.versions, version)) {                                            // 1130
        vRef = fileRef.versions[version];                                                                              // 1131
        vRef._id = fileRef._id;                                                                                        // 1132
      } else {                                                                                                         // 1130
        vRef = fileRef;                                                                                                // 1134
      }                                                                                                                // 1129
    } else {                                                                                                           // 1129
      vRef = false;                                                                                                    // 1136
    }                                                                                                                  // 1490
                                                                                                                       //
    if (!vRef || !_.isObject(vRef)) {                                                                                  // 1138
      return this._404(http);                                                                                          // 1139
    } else if (fileRef) {                                                                                              // 1138
      self = this;                                                                                                     // 1141
                                                                                                                       //
      if (this.downloadCallback) {                                                                                     // 1143
        if (!this.downloadCallback.call(_.extend(http, this._getUser(http)), fileRef)) {                               // 1144
          return this._404(http);                                                                                      // 1145
        }                                                                                                              // 1143
      }                                                                                                                // 1499
                                                                                                                       //
      if (this.interceptDownload && _.isFunction(this.interceptDownload)) {                                            // 1147
        if (this.interceptDownload(http, fileRef, version) === true) {                                                 // 1148
          return;                                                                                                      // 1149
        }                                                                                                              // 1147
      }                                                                                                                // 1504
                                                                                                                       //
      fs.stat(vRef.path, function (statErr, stats) {                                                                   // 1151
        return bound(function () {                                                                                     // 1506
          var responseType;                                                                                            // 1152
                                                                                                                       //
          if (statErr || !stats.isFile()) {                                                                            // 1152
            return self._404(http);                                                                                    // 1153
          }                                                                                                            // 1510
                                                                                                                       //
          if (stats.size !== vRef.size && !self.integrityCheck) {                                                      // 1155
            vRef.size = stats.size;                                                                                    // 1155
          }                                                                                                            // 1513
                                                                                                                       //
          if (stats.size !== vRef.size && self.integrityCheck) {                                                       // 1156
            responseType = '400';                                                                                      // 1156
          }                                                                                                            // 1516
                                                                                                                       //
          return self.serve(http, fileRef, vRef, version, null, responseType || '200');                                // 1517
        });                                                                                                            // 1151
      });                                                                                                              // 1151
    } else {                                                                                                           // 1140
      return this._404(http);                                                                                          // 1160
    }                                                                                                                  // 1522
  }; /*                                                                                                                // 1127
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
  FilesCollection.prototype.serve = function (http, fileRef, vRef, version, readableStream, responseType, force200) {  // 1541
    var array, dispositionEncoding, dispositionName, dispositionType, end, headers, key, partiral, reqRange, self, start, stream, streamErrorHandler, take, text, value;
                                                                                                                       //
    if (version == null) {                                                                                             // 1543
      version = 'original';                                                                                            // 1176
    }                                                                                                                  // 1545
                                                                                                                       //
    if (readableStream == null) {                                                                                      // 1546
      readableStream = null;                                                                                           // 1176
    }                                                                                                                  // 1548
                                                                                                                       //
    if (responseType == null) {                                                                                        // 1549
      responseType = '200';                                                                                            // 1176
    }                                                                                                                  // 1551
                                                                                                                       //
    if (force200 == null) {                                                                                            // 1552
      force200 = false;                                                                                                // 1176
    }                                                                                                                  // 1554
                                                                                                                       //
    self = this;                                                                                                       // 1177
    partiral = false;                                                                                                  // 1178
    reqRange = false;                                                                                                  // 1179
                                                                                                                       //
    if (http.params.query.download && http.params.query.download === 'true') {                                         // 1181
      dispositionType = 'attachment; ';                                                                                // 1182
    } else {                                                                                                           // 1181
      dispositionType = 'inline; ';                                                                                    // 1184
    }                                                                                                                  // 1562
                                                                                                                       //
    dispositionName = "filename=\"" + encodeURI(fileRef.name) + "\"; filename*=UTF-8''" + encodeURI(fileRef.name) + "; ";
    dispositionEncoding = 'charset=UTF-8';                                                                             // 1187
                                                                                                                       //
    if (!http.response.headersSent) {                                                                                  // 1189
      http.response.setHeader('Content-Disposition', dispositionType + dispositionName + dispositionEncoding);         // 1190
    }                                                                                                                  // 1567
                                                                                                                       //
    if (http.request.headers.range && !force200) {                                                                     // 1192
      partiral = true;                                                                                                 // 1193
      array = http.request.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);                                             // 1194
      start = parseInt(array[1]);                                                                                      // 1195
      end = parseInt(array[2]);                                                                                        // 1196
                                                                                                                       //
      if (isNaN(end)) {                                                                                                // 1197
        end = vRef.size - 1;                                                                                           // 1197
      }                                                                                                                // 1575
                                                                                                                       //
      take = end - start;                                                                                              // 1198
    } else {                                                                                                           // 1192
      start = 0;                                                                                                       // 1200
      end = vRef.size - 1;                                                                                             // 1201
      take = vRef.size;                                                                                                // 1202
    }                                                                                                                  // 1581
                                                                                                                       //
    if (partiral || http.params.query.play && http.params.query.play === 'true') {                                     // 1204
      reqRange = {                                                                                                     // 1205
        start: start,                                                                                                  // 1205
        end: end                                                                                                       // 1205
      };                                                                                                               // 1205
                                                                                                                       //
      if (isNaN(start) && !isNaN(end)) {                                                                               // 1206
        reqRange.start = end - take;                                                                                   // 1207
        reqRange.end = end;                                                                                            // 1208
      }                                                                                                                // 1590
                                                                                                                       //
      if (!isNaN(start) && isNaN(end)) {                                                                               // 1209
        reqRange.start = start;                                                                                        // 1210
        reqRange.end = start + take;                                                                                   // 1211
      }                                                                                                                // 1594
                                                                                                                       //
      if (start + take >= vRef.size) {                                                                                 // 1213
        reqRange.end = vRef.size - 1;                                                                                  // 1213
      }                                                                                                                // 1597
                                                                                                                       //
      if (self.strict && (reqRange.start >= vRef.size - 1 || reqRange.end > vRef.size - 1)) {                          // 1215
        responseType = '416';                                                                                          // 1216
      } else {                                                                                                         // 1215
        responseType = '206';                                                                                          // 1218
      }                                                                                                                // 1204
    } else {                                                                                                           // 1204
      responseType = '200';                                                                                            // 1220
    }                                                                                                                  // 1605
                                                                                                                       //
    streamErrorHandler = function (error) {                                                                            // 1222
      self._debug("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [500]", error);                       // 1223
                                                                                                                       //
      if (!http.response.finished) {                                                                                   // 1224
        http.response.end(error.toString());                                                                           // 1225
      }                                                                                                                // 1610
    };                                                                                                                 // 1222
                                                                                                                       //
    headers = _.isFunction(self.responseHeaders) ? self.responseHeaders(responseType, fileRef, vRef, version) : self.responseHeaders;
                                                                                                                       //
    if (!headers['Cache-Control']) {                                                                                   // 1230
      if (!http.response.headersSent) {                                                                                // 1231
        http.response.setHeader('Cache-Control', self.cacheControl);                                                   // 1232
      }                                                                                                                // 1230
    }                                                                                                                  // 1617
                                                                                                                       //
    for (key in meteorBabelHelpers.sanitizeForInObject(headers)) {                                                     // 1234
      value = headers[key];                                                                                            // 1619
                                                                                                                       //
      if (!http.response.headersSent) {                                                                                // 1235
        http.response.setHeader(key, value);                                                                           // 1236
      }                                                                                                                // 1622
    }                                                                                                                  // 1234
                                                                                                                       //
    switch (responseType) {                                                                                            // 1238
      case '400':                                                                                                      // 1238
        self._debug("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [400] Content-Length mismatch!");   // 1240
                                                                                                                       //
        text = 'Content-Length mismatch!';                                                                             // 1241
                                                                                                                       //
        if (!http.response.headersSent) {                                                                              // 1243
          http.response.writeHead(400, {                                                                               // 1244
            'Content-Type': 'text/plain',                                                                              // 1245
            'Content-Length': text.length                                                                              // 1246
          });                                                                                                          // 1245
        }                                                                                                              // 1633
                                                                                                                       //
        if (!http.response.finished) {                                                                                 // 1247
          http.response.end(text);                                                                                     // 1248
        }                                                                                                              // 1636
                                                                                                                       //
        break;                                                                                                         // 1249
                                                                                                                       //
      case '404':                                                                                                      // 1238
        return self._404(http);                                                                                        // 1251
        break;                                                                                                         // 1252
                                                                                                                       //
      case '416':                                                                                                      // 1238
        self._debug("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [416] Content-Range is not specified!");
                                                                                                                       //
        if (!http.response.headersSent) {                                                                              // 1255
          http.response.writeHead(416);                                                                                // 1256
        }                                                                                                              // 1645
                                                                                                                       //
        if (!http.response.finished) {                                                                                 // 1257
          http.response.end();                                                                                         // 1258
        }                                                                                                              // 1648
                                                                                                                       //
        break;                                                                                                         // 1259
                                                                                                                       //
      case '200':                                                                                                      // 1238
        self._debug("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [200]");                            // 1261
                                                                                                                       //
        stream = readableStream || fs.createReadStream(vRef.path);                                                     // 1262
                                                                                                                       //
        if (!http.response.headersSent) {                                                                              // 1263
          if (readableStream) {                                                                                        // 1264
            http.response.writeHead(200);                                                                              // 1264
          }                                                                                                            // 1263
        }                                                                                                              // 1657
                                                                                                                       //
        http.response.on('close', function () {                                                                        // 1266
          if (typeof stream.abort === "function") {                                                                    // 1659
            stream.abort();                                                                                            // 1267
          }                                                                                                            // 1661
                                                                                                                       //
          if (typeof stream.end === "function") {                                                                      // 1662
            stream.end();                                                                                              // 1268
          }                                                                                                            // 1664
        });                                                                                                            // 1266
        http.request.on('abort', function () {                                                                         // 1271
          if (typeof stream.abort === "function") {                                                                    // 1667
            stream.abort();                                                                                            // 1272
          }                                                                                                            // 1669
                                                                                                                       //
          if (typeof stream.end === "function") {                                                                      // 1670
            stream.end();                                                                                              // 1273
          }                                                                                                            // 1672
        });                                                                                                            // 1271
        stream.on('open', function () {                                                                                // 1276
          if (!http.response.headersSent) {                                                                            // 1277
            http.response.writeHead(200);                                                                              // 1278
          }                                                                                                            // 1677
        }).on('abort', function () {                                                                                   // 1276
          if (!http.response.finished) {                                                                               // 1281
            http.response.end();                                                                                       // 1282
          }                                                                                                            // 1681
                                                                                                                       //
          if (!http.request.aborted) {                                                                                 // 1283
            http.request.abort();                                                                                      // 1284
          }                                                                                                            // 1684
        }).on('error', streamErrorHandler).on('end', function () {                                                     // 1276
          if (!http.response.finished) {                                                                               // 1288
            http.response.end();                                                                                       // 1289
          }                                                                                                            // 1688
        });                                                                                                            // 1276
                                                                                                                       //
        if (self.throttle) {                                                                                           // 1291
          stream.pipe(new Throttle({                                                                                   // 1291
            bps: self.throttle,                                                                                        // 1291
            chunksize: self.chunkSize                                                                                  // 1291
          }));                                                                                                         // 1291
        }                                                                                                              // 1695
                                                                                                                       //
        stream.pipe(http.response);                                                                                    // 1292
        break;                                                                                                         // 1293
                                                                                                                       //
      case '206':                                                                                                      // 1238
        self._debug("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [206]");                            // 1295
                                                                                                                       //
        if (!http.response.headersSent) {                                                                              // 1296
          http.response.setHeader('Content-Range', "bytes " + reqRange.start + "-" + reqRange.end + "/" + vRef.size);  // 1297
        }                                                                                                              // 1702
                                                                                                                       //
        stream = readableStream || fs.createReadStream(vRef.path, {                                                    // 1298
          start: reqRange.start,                                                                                       // 1298
          end: reqRange.end                                                                                            // 1298
        });                                                                                                            // 1298
                                                                                                                       //
        if (!http.response.headersSent) {                                                                              // 1299
          if (readableStream) {                                                                                        // 1300
            http.response.writeHead(206);                                                                              // 1300
          }                                                                                                            // 1299
        }                                                                                                              // 1711
                                                                                                                       //
        http.response.on('close', function () {                                                                        // 1302
          if (typeof stream.abort === "function") {                                                                    // 1713
            stream.abort();                                                                                            // 1303
          }                                                                                                            // 1715
                                                                                                                       //
          if (typeof stream.end === "function") {                                                                      // 1716
            stream.end();                                                                                              // 1304
          }                                                                                                            // 1718
        });                                                                                                            // 1302
        http.request.on('abort', function () {                                                                         // 1307
          if (typeof stream.abort === "function") {                                                                    // 1721
            stream.abort();                                                                                            // 1308
          }                                                                                                            // 1723
                                                                                                                       //
          if (typeof stream.end === "function") {                                                                      // 1724
            stream.end();                                                                                              // 1309
          }                                                                                                            // 1726
        });                                                                                                            // 1307
        stream.on('open', function () {                                                                                // 1312
          if (!http.response.headersSent) {                                                                            // 1313
            http.response.writeHead(206);                                                                              // 1314
          }                                                                                                            // 1731
        }).on('abort', function () {                                                                                   // 1312
          if (!http.response.finished) {                                                                               // 1317
            http.response.end();                                                                                       // 1318
          }                                                                                                            // 1735
                                                                                                                       //
          if (!http.request.aborted) {                                                                                 // 1319
            http.request.abort();                                                                                      // 1320
          }                                                                                                            // 1738
        }).on('error', streamErrorHandler).on('end', function () {                                                     // 1312
          if (!http.response.finished) {                                                                               // 1324
            http.response.end();                                                                                       // 1325
          }                                                                                                            // 1742
        });                                                                                                            // 1312
                                                                                                                       //
        if (self.throttle) {                                                                                           // 1327
          stream.pipe(new Throttle({                                                                                   // 1327
            bps: self.throttle,                                                                                        // 1327
            chunksize: self.chunkSize                                                                                  // 1327
          }));                                                                                                         // 1327
        }                                                                                                              // 1749
                                                                                                                       //
        stream.pipe(http.response);                                                                                    // 1328
        break;                                                                                                         // 1329
    }                                                                                                                  // 1238
  };                                                                                                                   // 1176
                                                                                                                       //
  return FilesCollection;                                                                                              // 1755
}()); /*                                                                                                               // 1757
      Export the FilesCollection class                                                                                 //
       */                                                                                                              //
Meteor.Files = FilesCollection;                                                                                        // 1335
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
    this._collection._debug("[FilesCollection] [FileCursor] [link(" + version + ")]");                                 // 39
                                                                                                                       //
    if (this._fileRef) {                                                                                               // 40
      return this._collection.link(this._fileRef, version);                                                            // 54
    } else {                                                                                                           // 40
      return '';                                                                                                       // 56
    }                                                                                                                  // 57
  }; /*                                                                                                                // 38
     @locus Anywhere                                                                                                   //
     @memberOf FileCursor                                                                                              //
     @name get                                                                                                         //
     @param property {String} - Name of sub-object property                                                            //
     @summary Returns current document as a plain Object, if `property` is specified - returns value of sub-object property
     @returns {Object|mix}                                                                                             //
      */                                                                                                               //
                                                                                                                       //
  FileCursor.prototype.get = function (property) {                                                                     // 70
    this._collection._debug("[FilesCollection] [FileCursor] [get(" + property + ")]");                                 // 51
                                                                                                                       //
    if (property) {                                                                                                    // 52
      return this._fileRef[property];                                                                                  // 53
    } else {                                                                                                           // 52
      return this._fileRef;                                                                                            // 55
    }                                                                                                                  // 76
  }; /*                                                                                                                // 50
     @locus Anywhere                                                                                                   //
     @memberOf FileCursor                                                                                              //
     @name fetch                                                                                                       //
     @summary Returns document as plain Object in Array                                                                //
     @returns {[Object]}                                                                                               //
      */                                                                                                               //
                                                                                                                       //
  FileCursor.prototype.fetch = function () {                                                                           // 88
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
  FileCursor.prototype["with"] = function () {                                                                         // 102
    var self;                                                                                                          // 76
                                                                                                                       //
    this._collection._debug('[FilesCollection] [FileCursor] [with()]');                                                // 76
                                                                                                                       //
    self = this;                                                                                                       // 77
    return _.extend(self, this._collection.collection.findOne(this._fileRef._id));                                     // 78
  };                                                                                                                   // 75
                                                                                                                       //
  return FileCursor;                                                                                                   // 109
}()); /*                                                                                                               // 111
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
  FilesCursor.prototype.get = function () {                                                                            // 141
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
  FilesCursor.prototype.hasNext = function () {                                                                        // 155
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
  FilesCursor.prototype.next = function () {                                                                           // 169
    this._collection._debug('[FilesCollection] [FilesCursor] [next()]');                                               // 124
                                                                                                                       //
    if (this.hasNext()) {                                                                                              // 125
      return this.cursor.fetch()[++this._current];                                                                     // 126
    }                                                                                                                  // 173
  }; /*                                                                                                                // 123
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name hasPrevious                                                                                                 //
     @summary Returns `true` if there is previous item available on Cursor                                             //
     @returns {Boolean}                                                                                                //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.hasPrevious = function () {                                                                    // 185
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
  FilesCursor.prototype.previous = function () {                                                                       // 199
    this._collection._debug('[FilesCollection] [FilesCursor] [previous()]');                                           // 147
                                                                                                                       //
    if (this.hasPrevious()) {                                                                                          // 148
      return this.cursor.fetch()[--this._current];                                                                     // 149
    }                                                                                                                  // 203
  }; /*                                                                                                                // 146
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name fetch                                                                                                       //
     @summary Returns all matching document(s) as an Array.                                                            //
     @returns {[Object]}                                                                                               //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.fetch = function () {                                                                          // 215
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
  FilesCursor.prototype.first = function () {                                                                          // 229
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
  FilesCursor.prototype.last = function () {                                                                           // 245
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
  FilesCursor.prototype.count = function () {                                                                          // 261
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
  FilesCursor.prototype.remove = function (callback) {                                                                 // 276
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
  FilesCursor.prototype.forEach = function (callback, context) {                                                       // 293
    if (context == null) {                                                                                             // 294
      context = {};                                                                                                    // 219
    }                                                                                                                  // 296
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
  FilesCursor.prototype.each = function () {                                                                           // 311
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
  FilesCursor.prototype.map = function (callback, context) {                                                           // 330
    if (context == null) {                                                                                             // 331
      context = {};                                                                                                    // 246
    }                                                                                                                  // 333
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
  FilesCursor.prototype.current = function () {                                                                        // 347
    this._collection._debug('[FilesCollection] [FilesCursor] [current()]');                                            // 258
                                                                                                                       //
    if (this._current < 0) {                                                                                           // 259
      this._current = 0;                                                                                               // 259
    }                                                                                                                  // 351
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
  FilesCursor.prototype.observe = function (callbacks) {                                                               // 366
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
  FilesCursor.prototype.observeChanges = function (callbacks) {                                                        // 382
    this._collection._debug('[FilesCollection] [FilesCursor] [observeChanges()]');                                     // 285
                                                                                                                       //
    return this.cursor.observeChanges(callbacks);                                                                      // 286
  };                                                                                                                   // 284
                                                                                                                       //
  return FilesCursor;                                                                                                  // 387
}());                                                                                                                  // 389
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
  var ext, ref, root;                                                                                                  // 47
                                                                                                                       //
  if (version == null) {                                                                                               // 71
    version = 'original';                                                                                              // 46
  }                                                                                                                    // 73
                                                                                                                       //
  check(fileRef, Object);                                                                                              // 47
  check(version, String);                                                                                              // 48
  root = __meteor_runtime_config__.ROOT_URL.replace(/\/+$/, '');                                                       // 50
                                                                                                                       //
  if ((ref = fileRef.extension) != null ? ref.length : void 0) {                                                       // 52
    ext = '.' + fileRef.extension;                                                                                     // 53
  } else {                                                                                                             // 52
    ext = '';                                                                                                          // 55
  }                                                                                                                    // 81
                                                                                                                       //
  if (fileRef["public"] === true) {                                                                                    // 57
    return root + (version === 'original' ? fileRef._downloadRoute + "/" + fileRef._id + ext : fileRef._downloadRoute + "/" + version + "-" + fileRef._id + ext);
  } else {                                                                                                             // 57
    return root + (fileRef._downloadRoute + "/" + fileRef._collectionName + "/" + fileRef._id + "/" + version + "/" + fileRef._id + ext);
  }                                                                                                                    // 86
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
// ../../.1.8.1.1kk08gy++os+web.browser+web.cordova/npm/node_modules/fs-extra/package.json                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "fs-extra";
exports.version = "4.0.0";
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
// ../../.1.8.1.1kk08gy++os+web.browser+web.cordova/npm/node_modules/request/package.json                              //
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
// ../../.1.8.1.1kk08gy++os+web.browser+web.cordova/npm/node_modules/throttle/package.json                             //
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

	// Needs to be before the `zip` check
	if (
		check([0x50, 0x4B, 0x3, 0x4]) &&
		check([0x6D, 0x69, 0x6D, 0x65, 0x74, 0x79, 0x70, 0x65, 0x61, 0x70, 0x70, 0x6C, 0x69, 0x63, 0x61, 0x74, 0x69, 0x6F, 0x6E, 0x2F, 0x65, 0x70, 0x75, 0x62, 0x2B, 0x7A, 0x69, 0x70], {offset: 30})
	) {
		return {
			ext: 'epub',
			mime: 'application/epub+zip'
		};
	}

	// Needs to be before `zip` check
	// Assumes signed `.xpi` from addons.mozilla.org
	if (
		check([0x50, 0x4B, 0x3, 0x4]) &&
		check([0x4D, 0x45, 0x54, 0x41, 0x2D, 0x49, 0x4E, 0x46, 0x2F, 0x6D, 0x6F, 0x7A, 0x69, 0x6C, 0x6C, 0x61, 0x2E, 0x72, 0x73, 0x61], {offset: 30})
	) {
		return {
			ext: 'xpi',
			mime: 'application/x-xpinstall'
		};
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

	if (
		(
			check([0x0, 0x0, 0x0]) &&
			(buf[3] === 0x18 || buf[3] === 0x20) &&
			check([0x66, 0x74, 0x79, 0x70], {offset: 4})
		) ||
		check([0x33, 0x67, 0x70, 0x35]) ||
		(
			check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32]) &&
			check([0x6D, 0x70, 0x34, 0x31, 0x6D, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6F, 0x6D], {offset: 16})
		) ||
		check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D]) ||
		check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32, 0x0, 0x0, 0x0, 0x0])
	) {
		return {
			ext: 'mp4',
			mime: 'video/mp4'
		};
	}

	if (check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x56])) {
		return {
			ext: 'm4v',
			mime: 'video/x-m4v'
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

		if (idPos >= 0) {
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
