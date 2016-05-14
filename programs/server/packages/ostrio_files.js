(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var WebApp = Package.webapp.WebApp;
var main = Package.webapp.main;
var WebAppInternals = Package.webapp.WebAppInternals;
var _ = Package.underscore._;
var check = Package.check.check;
var Match = Package.check.Match;
var SHA256 = Package.sha.SHA256;
var Cookies = Package['ostrio:cookies'].Cookies;
var Random = Package.random.Random;

/* Package-scope variables */
var __coffeescriptShare, FilesCollection;

(function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/ostrio_files/files.coffee.js                                                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var NOOP, Throttle, _insts, bound, cp, events, fileType, formatFleURL, fs, nodePath, rcp, request;                 
                                                                                                                    //
NOOP = function() {};                                                                                               // 1
                                                                                                                    //
if (Meteor.isServer) {                                                                                              // 3
                                                                                                                    // 4
  /*                                                                                                                // 4
  @summary Require NPM packages                                                                                     //
   */                                                                                                               //
  fs = Npm.require('fs-extra');                                                                                     // 4
  events = Npm.require('events');                                                                                   // 4
  request = Npm.require('request');                                                                                 // 4
  Throttle = Npm.require('throttle');                                                                               // 4
  fileType = Npm.require('file-type');                                                                              // 4
  nodePath = Npm.require('path');                                                                                   // 4
                                                                                                                    // 14
  /*                                                                                                                // 14
  @var {object} bound - Meteor.bindEnvironment (Fiber wrapper)                                                      //
   */                                                                                                               //
  bound = Meteor.bindEnvironment(function(callback) {                                                               // 4
    return callback();                                                                                              // 17
  });                                                                                                               //
}                                                                                                                   //
                                                                                                                    //
                                                                                                                    // 19
/*                                                                                                                  // 19
@private                                                                                                            //
@name _insts                                                                                                        //
@summary Object of FilesCollection instances                                                                        //
 */                                                                                                                 //
                                                                                                                    //
_insts = {};                                                                                                        // 1
                                                                                                                    //
                                                                                                                    // 26
/*                                                                                                                  // 26
@private                                                                                                            //
@name rcp                                                                                                           //
@param {Object} obj - Initial object                                                                                //
@summary Create object with only needed props                                                                       //
 */                                                                                                                 //
                                                                                                                    //
rcp = function(obj) {                                                                                               // 1
  var o;                                                                                                            // 33
  o = {                                                                                                             // 33
    currentFile: obj.currentFile,                                                                                   // 34
    search: obj.search,                                                                                             // 34
    collectionName: obj.collectionName,                                                                             // 34
    downloadRoute: obj.downloadRoute,                                                                               // 34
    chunkSize: obj.chunkSize,                                                                                       // 34
    debug: obj.debug,                                                                                               // 34
    _prefix: obj._prefix                                                                                            // 34
  };                                                                                                                //
  return o;                                                                                                         // 41
};                                                                                                                  // 32
                                                                                                                    //
                                                                                                                    // 43
/*                                                                                                                  // 43
@private                                                                                                            //
@name cp                                                                                                            //
@param {Object} to   - Destination                                                                                  //
@param {Object} from - Source                                                                                       //
@summary Copy-Paste only needed props from one to another object                                                    //
 */                                                                                                                 //
                                                                                                                    //
cp = function(to, from) {                                                                                           // 1
  to.currentFile = from.currentFile;                                                                                // 51
  to.search = from.search;                                                                                          // 51
  to.collectionName = from.collectionName;                                                                          // 51
  to.downloadRoute = from.downloadRoute;                                                                            // 51
  to.chunkSize = from.chunkSize;                                                                                    // 51
  to.debug = from.debug;                                                                                            // 51
  to._prefix = from._prefix;                                                                                        // 51
  return to;                                                                                                        // 58
};                                                                                                                  // 50
                                                                                                                    //
                                                                                                                    // 60
/*                                                                                                                  // 60
@locus Anywhere                                                                                                     //
@class FilesCollection                                                                                              //
@param config           {Object}   - [Both]   Configuration object with next properties:                            //
@param config.debug     {Boolean}  - [Both]   Turn on/of debugging and extra logging                                //
@param config.schema    {Object}   - [Both]   Collection Schema                                                     //
@param config.public    {Boolean}  - [Both]   Store files in folder accessible for proxy servers, for limits, and more - read docs
@param config.strict    {Boolean}  - [Server] Strict mode for partial content, if is `true` server will return `416` response code, when `range` is not specified, otherwise server return `206`
@param config.protected {Function} - [Both]   If `true` - files will be served only to authorized users, if `function()` - you're able to check visitor's permissions in your own way function's context has:
  - `request` - On server only                                                                                      //
  - `response` - On server only                                                                                     //
  - `user()`                                                                                                        //
  - `userId`                                                                                                        //
@param config.chunkSize      {Number}  - [Both] Upload chunk size, default: 524288 bytes (0,5 Mb)                   //
@param config.permissions    {Number}  - [Server] Permissions which will be set to uploaded files, like: `511` or `0o755`
@param config.storagePath    {String}  - [Server] Storage path on file system                                       //
@param config.cacheControl   {String}  - [Server] Default `Cache-Control` header                                    //
@param config.throttle       {Number}  - [Server] bps throttle threshold                                            //
@param config.downloadRoute  {String}  - [Both]   Server Route used to retrieve files                               //
@param config.collectionName {String}  - [Both]   Collection name                                                   //
@param config.namingFunction {Function}- [Both]   Function which returns `String`                                   //
@param config.integrityCheck {Boolean} - [Server] Check file's integrity before serving to users                    //
@param config.onAfterUpload  {Function}- [Server] Called right after file is ready on FS. Use to transfer file somewhere else, or do other thing with file directly
@param config.onBeforeUpload {Function}- [Both]   Function which executes on server after receiving each chunk and on client right before beginning upload. Function context is `File` - so you are able to check for extension, mime-type, size and etc.
return `true` to continue                                                                                           //
return `false` or `String` to abort upload                                                                          //
@param config.onBeforeRemove {Function} - [Server] Executes before removing file on server, so you can check permissions. Return `true` to allow action and `false` to deny.
@param config.allowClientCode  {Boolean}  - [Both]   Allow to run `remove` from client                              //
@param config.downloadCallback {Function} - [Server] Callback triggered each time file is requested, return truthy value to continue download, or falsy to abort
@param config.interceptDownload {Function} - [Server] Intercept download request, so you can serve file from third-party resource, arguments {http: {request: {...}, response: {...}}, fileRef: {...}}
@param config.onbeforeunloadMessage {String|Function} - [Client] Message shown to user when closing browser's window or tab while upload process is running
@summary Create new instance of FilesCollection                                                                     //
 */                                                                                                                 //
                                                                                                                    //
FilesCollection = (function() {                                                                                     // 1
  var FileUpload, UploadInstance;                                                                                   // 94
                                                                                                                    //
  FilesCollection.prototype.__proto__ = (function() {                                                               // 94
    if (Meteor.isServer) {                                                                                          // 94
      return events.EventEmitter.prototype;                                                                         //
    } else {                                                                                                        //
      return EventEmitter.prototype;                                                                                //
    }                                                                                                               //
  })();                                                                                                             //
                                                                                                                    //
  function FilesCollection(config) {                                                                                // 95
    var _methods, cookie, self;                                                                                     // 96
    if (Meteor.isServer) {                                                                                          // 96
      events.EventEmitter.call(this);                                                                               // 97
    } else {                                                                                                        //
      EventEmitter.call(this);                                                                                      // 99
    }                                                                                                               //
    if (config) {                                                                                                   // 100
      this.storagePath = config.storagePath, this.collectionName = config.collectionName, this.downloadRoute = config.downloadRoute, this.schema = config.schema, this.chunkSize = config.chunkSize, this.namingFunction = config.namingFunction, this.debug = config.debug, this.onbeforeunloadMessage = config.onbeforeunloadMessage, this.permissions = config.permissions, this.allowClientCode = config.allowClientCode, this.onBeforeUpload = config.onBeforeUpload, this.integrityCheck = config.integrityCheck, this["protected"] = config["protected"], this["public"] = config["public"], this.strict = config.strict, this.downloadCallback = config.downloadCallback, this.cacheControl = config.cacheControl, this.throttle = config.throttle, this.onAfterUpload = config.onAfterUpload, this.interceptDownload = config.interceptDownload, this.onBeforeRemove = config.onBeforeRemove;
    }                                                                                                               //
    self = this;                                                                                                    // 96
    cookie = new Cookies();                                                                                         // 96
    if (this.debug == null) {                                                                                       //
      this.debug = false;                                                                                           //
    }                                                                                                               //
    if (this["public"] == null) {                                                                                   //
      this["public"] = false;                                                                                       //
    }                                                                                                               //
    if (this["protected"] == null) {                                                                                //
      this["protected"] = false;                                                                                    //
    }                                                                                                               //
    if (this.chunkSize == null) {                                                                                   //
      this.chunkSize = 1024 * 512;                                                                                  //
    }                                                                                                               //
    this.chunkSize = Math.floor(this.chunkSize / 8) * 8;                                                            // 96
    if (this["public"] && !this.downloadRoute) {                                                                    // 109
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: \"downloadRoute\" must be explicitly provided on \"public\" collections! Note: \"downloadRoute\" must be equal on be inside of your web/proxy-server (relative) root.");
    }                                                                                                               //
    if (this.downloadRoute == null) {                                                                               //
      this.downloadRoute = '/cdn/storage';                                                                          //
    }                                                                                                               //
    this.downloadRoute = this.downloadRoute.replace(/\/$/, '');                                                     // 96
    if (this.collectionName == null) {                                                                              //
      this.collectionName = 'MeteorUploadFiles';                                                                    //
    }                                                                                                               //
    if (this.namingFunction == null) {                                                                              //
      this.namingFunction = function() {                                                                            //
        return Random.id();                                                                                         //
      };                                                                                                            //
    }                                                                                                               //
    if (this.onBeforeUpload == null) {                                                                              //
      this.onBeforeUpload = false;                                                                                  //
    }                                                                                                               //
    if (this.allowClientCode == null) {                                                                             //
      this.allowClientCode = true;                                                                                  //
    }                                                                                                               //
    if (this.interceptDownload == null) {                                                                           //
      this.interceptDownload = false;                                                                               //
    }                                                                                                               //
    if (Meteor.isClient) {                                                                                          // 119
      if (this.onbeforeunloadMessage == null) {                                                                     //
        this.onbeforeunloadMessage = 'Upload in a progress... Do you want to abort?';                               //
      }                                                                                                             //
      delete this.strict;                                                                                           // 120
      delete this.throttle;                                                                                         // 120
      delete this.storagePath;                                                                                      // 120
      delete this.permissions;                                                                                      // 120
      delete this.cacheControl;                                                                                     // 120
      delete this.onAfterUpload;                                                                                    // 120
      delete this.integrityCheck;                                                                                   // 120
      delete this.downloadCallback;                                                                                 // 120
      delete this.interceptDownload;                                                                                // 120
      delete this.onBeforeRemove;                                                                                   // 120
      if (this["protected"]) {                                                                                      // 132
        if (!cookie.has('meteor_login_token') && Meteor._localStorage.getItem('Meteor.loginToken')) {               // 133
          cookie.set('meteor_login_token', Meteor._localStorage.getItem('Meteor.loginToken'), null, '/');           // 134
        }                                                                                                           //
      }                                                                                                             //
      check(this.onbeforeunloadMessage, Match.OneOf(String, Function));                                             // 120
    } else {                                                                                                        //
      if (this.strict == null) {                                                                                    //
        this.strict = true;                                                                                         //
      }                                                                                                             //
      if (this.throttle == null) {                                                                                  //
        this.throttle = false;                                                                                      //
      }                                                                                                             //
      if (this.permissions == null) {                                                                               //
        this.permissions = 0x1ed;                                                                                   //
      }                                                                                                             //
      if (this.cacheControl == null) {                                                                              //
        this.cacheControl = 'public, max-age=31536000, s-maxage=31536000';                                          //
      }                                                                                                             //
      if (this.onBeforeRemove == null) {                                                                            //
        this.onBeforeRemove = false;                                                                                //
      }                                                                                                             //
      if (this.onAfterUpload == null) {                                                                             //
        this.onAfterUpload = false;                                                                                 //
      }                                                                                                             //
      if (this.integrityCheck == null) {                                                                            //
        this.integrityCheck = true;                                                                                 //
      }                                                                                                             //
      if (this.downloadCallback == null) {                                                                          //
        this.downloadCallback = false;                                                                              //
      }                                                                                                             //
      if (this["public"] && !this.storagePath) {                                                                    // 146
        throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "] \"storagePath\" must be set on \"public\" collections! Note: \"storagePath\" must be equal on be inside of your web/proxy-server (absolute) root.");
      }                                                                                                             //
      if (this.storagePath == null) {                                                                               //
        this.storagePath = "assets/app/uploads/" + this.collectionName;                                             //
      }                                                                                                             //
      this.storagePath = this.storagePath.replace(/\/$/, '');                                                       // 138
      this.storagePath = nodePath.normalize(this.storagePath);                                                      // 138
      fs.mkdirsSync(this.storagePath);                                                                              // 138
      check(this.strict, Boolean);                                                                                  // 138
      check(this.throttle, Match.OneOf(false, Number));                                                             // 138
      check(this.permissions, Number);                                                                              // 138
      check(this.storagePath, String);                                                                              // 138
      check(this.cacheControl, String);                                                                             // 138
      check(this.onAfterUpload, Match.OneOf(false, Function));                                                      // 138
      check(this.integrityCheck, Boolean);                                                                          // 138
      check(this.onBeforeRemove, Match.OneOf(false, Function));                                                     // 138
      check(this.downloadCallback, Match.OneOf(false, Function));                                                   // 138
      check(this.interceptDownload, Match.OneOf(false, Function));                                                  // 138
    }                                                                                                               //
    if (!this.schema) {                                                                                             // 165
      this.schema = {                                                                                               // 166
        size: {                                                                                                     // 167
          type: Number                                                                                              // 167
        },                                                                                                          //
        name: {                                                                                                     // 167
          type: String                                                                                              // 168
        },                                                                                                          //
        type: {                                                                                                     // 167
          type: String                                                                                              // 169
        },                                                                                                          //
        path: {                                                                                                     // 167
          type: String                                                                                              // 170
        },                                                                                                          //
        isVideo: {                                                                                                  // 167
          type: Boolean                                                                                             // 171
        },                                                                                                          //
        isAudio: {                                                                                                  // 167
          type: Boolean                                                                                             // 172
        },                                                                                                          //
        isImage: {                                                                                                  // 167
          type: Boolean                                                                                             // 173
        },                                                                                                          //
        isText: {                                                                                                   // 167
          type: Boolean                                                                                             // 174
        },                                                                                                          //
        isJSON: {                                                                                                   // 167
          type: Boolean                                                                                             // 175
        },                                                                                                          //
        _prefix: {                                                                                                  // 167
          type: String                                                                                              // 176
        },                                                                                                          //
        extension: {                                                                                                // 167
          type: String,                                                                                             // 178
          optional: true                                                                                            // 178
        },                                                                                                          //
        _storagePath: {                                                                                             // 167
          type: String                                                                                              // 180
        },                                                                                                          //
        _downloadRoute: {                                                                                           // 167
          type: String                                                                                              // 181
        },                                                                                                          //
        _collectionName: {                                                                                          // 167
          type: String                                                                                              // 182
        },                                                                                                          //
        "public": {                                                                                                 // 167
          type: Boolean,                                                                                            // 184
          optional: true                                                                                            // 184
        },                                                                                                          //
        meta: {                                                                                                     // 167
          type: Object,                                                                                             // 187
          blackbox: true,                                                                                           // 187
          optional: true                                                                                            // 187
        },                                                                                                          //
        userId: {                                                                                                   // 167
          type: String,                                                                                             // 191
          optional: true                                                                                            // 191
        },                                                                                                          //
        updatedAt: {                                                                                                // 167
          type: Date,                                                                                               // 194
          autoValue: function() {                                                                                   // 194
            return new Date();                                                                                      //
          }                                                                                                         //
        },                                                                                                          //
        versions: {                                                                                                 // 167
          type: Object,                                                                                             // 197
          blackbox: true                                                                                            // 197
        }                                                                                                           //
      };                                                                                                            //
    }                                                                                                               //
    check(this.debug, Boolean);                                                                                     // 96
    check(this.schema, Object);                                                                                     // 96
    check(this["public"], Boolean);                                                                                 // 96
    check(this["protected"], Match.OneOf(Boolean, Function));                                                       // 96
    check(this.chunkSize, Number);                                                                                  // 96
    check(this.downloadRoute, String);                                                                              // 96
    check(this.collectionName, String);                                                                             // 96
    check(this.namingFunction, Function);                                                                           // 96
    check(this.onBeforeUpload, Match.OneOf(false, Function));                                                       // 96
    check(this.allowClientCode, Boolean);                                                                           // 96
    if (this["public"] && this["protected"]) {                                                                      // 211
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: Files can not be public and protected at the same time!");
    }                                                                                                               //
    this.cursor = null;                                                                                             // 96
    this.search = {};                                                                                               // 96
    this.collection = new Mongo.Collection(this.collectionName);                                                    // 96
    this.currentFile = null;                                                                                        // 96
    this._prefix = SHA256(this.collectionName + this.downloadRoute);                                                // 96
    _insts[this._prefix] = this;                                                                                    // 96
    this.checkAccess = function(http) {                                                                             // 96
      var rc, result, text, user, userFuncs, userId;                                                                // 222
      if (self["protected"]) {                                                                                      // 222
        user = false;                                                                                               // 223
        userFuncs = self.getUser(http);                                                                             // 223
        user = userFuncs.user, userId = userFuncs.userId;                                                           // 223
        user = user();                                                                                              // 223
        if (_.isFunction(self["protected"])) {                                                                      // 228
          result = http ? self["protected"].call(_.extend(http, userFuncs), self.currentFile || null) : self["protected"].call(userFuncs, self.currentFile || null);
        } else {                                                                                                    //
          result = !!user;                                                                                          // 231
        }                                                                                                           //
        if ((http && result === true) || !http) {                                                                   // 233
          return true;                                                                                              // 234
        } else {                                                                                                    //
          rc = _.isNumber(result) ? result : 401;                                                                   // 236
          if (self.debug) {                                                                                         // 237
            console.warn('[FilesCollection.checkAccess] WARN: Access denied!');                                     // 237
          }                                                                                                         //
          if (http) {                                                                                               // 238
            text = 'Access denied!';                                                                                // 239
            http.response.writeHead(rc, {                                                                           // 239
              'Content-Length': text.length,                                                                        // 241
              'Content-Type': 'text/plain'                                                                          // 241
            });                                                                                                     //
            http.response.end(text);                                                                                // 239
          }                                                                                                         //
          return false;                                                                                             // 244
        }                                                                                                           //
      } else {                                                                                                      //
        return true;                                                                                                // 246
      }                                                                                                             //
    };                                                                                                              //
    this.methodNames = {                                                                                            // 96
      MeteorFileAbort: "MeteorFileAbort" + this._prefix,                                                            // 249
      MeteorFileWrite: "MeteorFileWrite" + this._prefix,                                                            // 249
      MeteorFileUnlink: "MeteorFileUnlink" + this._prefix                                                           // 249
    };                                                                                                              //
    if (Meteor.isServer) {                                                                                          // 253
      this.on('handleUpload', function(result, pathName, path, pathPart, fileName, extensionWithDot, opts, cb) {    // 254
        this.handleUpload(result, pathName, path, pathPart, fileName, extensionWithDot, opts, cb);                  // 255
      });                                                                                                           //
      this.on('concatChunks', function(result, num, files, tries, pathName, path, fileName, extensionWithDot, opts, cb) {
        this.concatChunks(result, num, files, tries, pathName, path, fileName, extensionWithDot, opts, cb);         // 259
      });                                                                                                           //
      this.on('finishUpload', function(result, path, fileName, opts, cb) {                                          // 254
        this.finishUpload(result, path, fileName, opts, cb);                                                        // 263
      });                                                                                                           //
      WebApp.connectHandlers.use(function(request, response, next) {                                                // 254
        var _file, http, params, uri, uris, version;                                                                // 267
        if (!self["public"]) {                                                                                      // 267
          if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName)) {                 // 268
            uri = request._parsedUrl.path.replace(self.downloadRoute + "/" + self.collectionName, '');              // 269
            if (uri.indexOf('/') === 0) {                                                                           // 270
              uri = uri.substring(1);                                                                               // 271
            }                                                                                                       //
            uris = uri.split('/');                                                                                  // 269
            if (uris.length === 3) {                                                                                // 274
              params = {                                                                                            // 275
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                _id: uris[0],                                                                                       // 276
                version: uris[1],                                                                                   // 276
                name: uris[2]                                                                                       // 276
              };                                                                                                    //
              http = {                                                                                              // 275
                request: request,                                                                                   // 280
                response: response,                                                                                 // 280
                params: params                                                                                      // 280
              };                                                                                                    //
              if (self.checkAccess(http)) {                                                                         // 281
                self.findOne(uris[0]).download.call(self, http, uris[1]);                                           // 281
              }                                                                                                     //
            } else {                                                                                                //
              next();                                                                                               // 283
            }                                                                                                       //
          } else {                                                                                                  //
            next();                                                                                                 // 285
          }                                                                                                         //
        } else {                                                                                                    //
          if (!!~request._parsedUrl.path.indexOf("" + self.downloadRoute)) {                                        // 287
            uri = request._parsedUrl.path.replace("" + self.downloadRoute, '');                                     // 288
            if (uri.indexOf('/') === 0) {                                                                           // 289
              uri = uri.substring(1);                                                                               // 290
            }                                                                                                       //
            uris = uri.split('/');                                                                                  // 288
            _file = uris[uris.length - 1];                                                                          // 288
            if (_file) {                                                                                            // 294
              if (!!~_file.indexOf('-')) {                                                                          // 295
                version = _file.split('-')[0];                                                                      // 296
                _file = _file.split('-')[1].split('?')[0];                                                          // 296
              } else {                                                                                              //
                version = 'original';                                                                               // 299
                _file = _file.split('?')[0];                                                                        // 299
              }                                                                                                     //
              params = {                                                                                            // 295
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                file: _file,                                                                                        // 303
                _id: _file.split('.')[0],                                                                           // 303
                version: version,                                                                                   // 303
                name: _file                                                                                         // 303
              };                                                                                                    //
              http = {                                                                                              // 295
                request: request,                                                                                   // 308
                response: response,                                                                                 // 308
                params: params                                                                                      // 308
              };                                                                                                    //
              self.findOne(params._id).download.call(self, http, version);                                          // 295
            } else {                                                                                                //
              next();                                                                                               // 311
            }                                                                                                       //
          } else {                                                                                                  //
            next();                                                                                                 // 313
          }                                                                                                         //
        }                                                                                                           //
      });                                                                                                           //
      _methods = {};                                                                                                // 254
      _methods[self.methodNames.MeteorFileUnlink] = function(inst) {                                                // 254
        var __inst, __instData, user, userFuncs;                                                                    // 318
        check(inst, Object);                                                                                        // 318
        if (self.debug) {                                                                                           // 319
          console.info('[FilesCollection] [Unlink Method]');                                                        // 319
        }                                                                                                           //
        if (self.allowClientCode) {                                                                                 // 320
          __instData = cp(_insts[inst._prefix], inst);                                                              // 321
          if (self.onBeforeRemove && _.isFunction(self.onBeforeRemove)) {                                           // 322
            user = false;                                                                                           // 323
            userFuncs = {                                                                                           // 323
              userId: this.userId,                                                                                  // 324
              user: function() {                                                                                    // 324
                return Meteor.users.findOne(this.userId);                                                           //
              }                                                                                                     //
            };                                                                                                      //
            __inst = self.find.call(__instData, inst.search);                                                       // 323
            if (!self.onBeforeRemove.call(userFuncs, __inst.cursor || null)) {                                      // 330
              throw new Meteor.Error(403, '[FilesCollection] [remove] Not permitted!');                             // 331
            }                                                                                                       //
          }                                                                                                         //
          self.remove.call(__instData, inst.search);                                                                // 321
          return true;                                                                                              // 334
        } else {                                                                                                    //
          throw new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!');           // 336
        }                                                                                                           //
      };                                                                                                            //
      _methods[self.methodNames.MeteorFileWrite] = function(opts) {                                                 // 254
        var e, extension, extensionWithDot, fileName, isUploadAllowed, path, pathName, pathPart, ref, result;       // 340
        this.unblock();                                                                                             // 340
        check(opts, {                                                                                               // 340
          eof: Match.Optional(Boolean),                                                                             // 341
          meta: Match.Optional(Object),                                                                             // 341
          file: Object,                                                                                             // 341
          fileId: String,                                                                                           // 341
          binData: Match.Optional(String),                                                                          // 341
          chunkId: Match.Optional(Number),                                                                          // 341
          fileLength: Number                                                                                        // 341
        });                                                                                                         //
        if (opts.eof == null) {                                                                                     //
          opts.eof = false;                                                                                         //
        }                                                                                                           //
        if (opts.meta == null) {                                                                                    //
          opts.meta = {};                                                                                           //
        }                                                                                                           //
        if (opts.binData == null) {                                                                                 //
          opts.binData = 'EOF';                                                                                     //
        }                                                                                                           //
        if (opts.chunkId == null) {                                                                                 //
          opts.chunkId = -1;                                                                                        //
        }                                                                                                           //
        if (self.debug) {                                                                                           // 356
          console.info("[FilesCollection] [Write Method] Got #" + opts.chunkId + "/" + opts.fileLength + " chunks, dst: " + (opts.file.name || opts.file.fileName));
        }                                                                                                           //
        if (self.onBeforeUpload && _.isFunction(self.onBeforeUpload)) {                                             // 358
          isUploadAllowed = self.onBeforeUpload.call(_.extend({                                                     // 359
            file: opts.file                                                                                         // 359
          }, {                                                                                                      //
            userId: this.userId,                                                                                    // 361
            user: function() {                                                                                      // 361
              return Meteor.users.findOne(this.userId);                                                             //
            }                                                                                                       //
          }), opts.file);                                                                                           //
          if (isUploadAllowed !== true) {                                                                           // 366
            throw new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : '@onBeforeUpload() returned false');
          }                                                                                                         //
        }                                                                                                           //
        fileName = self.getFileName(opts.file);                                                                     // 340
        ref = self.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;            // 340
        pathName = self.storagePath + "/" + opts.fileId;                                                            // 340
        path = self.storagePath + "/" + opts.fileId + extensionWithDot;                                             // 340
        pathPart = opts.fileLength > 1 ? pathName + "_" + opts.chunkId + extensionWithDot : null;                   // 340
        result = _.extend(self.dataToSchema(_.extend(opts.file, {                                                   // 340
          path: path,                                                                                               // 376
          extension: extension,                                                                                     // 376
          name: fileName,                                                                                           // 376
          meta: opts.meta                                                                                           // 376
        })), {                                                                                                      //
          _id: opts.fileId                                                                                          // 376
        });                                                                                                         //
        if (opts.eof) {                                                                                             // 378
          try {                                                                                                     // 379
            return Meteor.wrapAsync(self.handleUpload.bind(self, result, pathName, path, pathPart, fileName, extensionWithDot, opts))();
          } catch (_error) {                                                                                        //
            e = _error;                                                                                             // 382
            if (self.debug) {                                                                                       // 382
              console.warn("[FilesCollection] [Write Method] Exception:", e);                                       // 382
            }                                                                                                       //
            throw e;                                                                                                // 383
          }                                                                                                         //
        } else {                                                                                                    //
          self.emit('handleUpload', result, pathName, path, pathPart, fileName, extensionWithDot, opts, NOOP);      // 385
        }                                                                                                           //
        return result;                                                                                              // 386
      };                                                                                                            //
      _methods[self.methodNames.MeteorFileAbort] = function(opts) {                                                 // 254
        var _path, allowed, ext, i, path;                                                                           // 389
        check(opts, {                                                                                               // 389
          fileId: String,                                                                                           // 389
          fileData: Object,                                                                                         // 389
          fileLength: Number                                                                                        // 389
        });                                                                                                         //
        ext = "." + opts.fileData.ext;                                                                              // 389
        path = self.storagePath + "/" + opts.fileId;                                                                // 389
        if (self.debug) {                                                                                           // 398
          console.info("[FilesCollection] [Abort Method]: For " + path);                                            // 398
        }                                                                                                           //
        if (opts.fileLength > 1) {                                                                                  // 399
          allowed = false;                                                                                          // 400
          i = 0;                                                                                                    // 400
          while (i <= opts.fileLength) {                                                                            // 402
            _path = path + "_" + i + ext;                                                                           // 403
            fs.stat(_path, (function(error, stats) {                                                                // 403
              return bound((function(_this) {                                                                       //
                return function() {                                                                                 //
                  if (!error && stats.isFile()) {                                                                   // 405
                    allowed = true;                                                                                 // 406
                    return fs.unlink(_this._path, NOOP);                                                            //
                  }                                                                                                 //
                };                                                                                                  //
              })(this));                                                                                            //
            }).bind({                                                                                               //
              _path: _path                                                                                          // 408
            }));                                                                                                    //
            i++;                                                                                                    // 403
          }                                                                                                         //
          return Meteor.setTimeout(function() {                                                                     //
            if (allowed) {                                                                                          // 412
              return self.remove(opts.fileId);                                                                      //
            }                                                                                                       //
          }, 250);                                                                                                  //
        }                                                                                                           //
      };                                                                                                            //
      Meteor.methods(_methods);                                                                                     // 254
    }                                                                                                               //
  }                                                                                                                 //
                                                                                                                    //
  FilesCollection.prototype.finishUpload = Meteor.isServer ? function(result, path, fileName, opts, cb) {           // 94
    var self;                                                                                                       // 419
    fs.chmod(path, this.permissions, NOOP);                                                                         // 419
    self = this;                                                                                                    // 419
    result.type = this.getMimeType(opts.file);                                                                      // 419
    result["public"] = this["public"];                                                                              // 419
    this.collection.insert(_.clone(result), function(error, _id) {                                                  // 419
      if (error) {                                                                                                  // 425
        return cb(new Meteor.Error(500, error));                                                                    //
      } else {                                                                                                      //
        result._id = _id;                                                                                           // 428
        if (self.debug) {                                                                                           // 429
          console.info("[FilesCollection] [Write Method] [finishUpload] " + fileName + " -> " + path);              // 429
        }                                                                                                           //
        self.onAfterUpload && self.onAfterUpload.call(self, result);                                                // 428
        self.emit('afterUpload', result);                                                                           // 428
        return cb(null, result);                                                                                    //
      }                                                                                                             //
    });                                                                                                             //
  } : void 0;                                                                                                       //
                                                                                                                    //
  FilesCollection.prototype.concatChunks = Meteor.isServer ? function(result, num, files, tries, pathName, path, fileName, extensionWithDot, opts, cb) {
    var _path, _source, findex, self, sindex;                                                                       // 437
    if (tries == null) {                                                                                            //
      tries = 0;                                                                                                    //
    }                                                                                                               //
    self = this;                                                                                                    // 437
    sindex = files.indexOf(opts.fileId + "_1" + extensionWithDot);                                                  // 437
    if (!!~sindex) {                                                                                                // 439
      files.splice(sindex, 1);                                                                                      // 439
    }                                                                                                               //
    findex = files.indexOf(opts.fileId + "_" + num + extensionWithDot);                                             // 437
    if (!!~findex) {                                                                                                // 441
      files.splice(findex, 1);                                                                                      // 442
    } else if (files.length <= 0) {                                                                                 //
      this.emit('finishUpload', result, path, fileName, opts, cb);                                                  // 444
      return;                                                                                                       // 445
    } else {                                                                                                        //
      this.emit('concatChunks', result, ++num, files, tries, pathName, path, fileName, extensionWithDot, opts, cb);
      return;                                                                                                       // 448
    }                                                                                                               //
    _path = pathName + "_" + num + extensionWithDot;                                                                // 437
    _source = pathName + '_1' + extensionWithDot;                                                                   // 437
    fs.stat(_path, function(error, stats) {                                                                         // 437
      return bound(function() {                                                                                     //
        if (error || !stats.isFile()) {                                                                             // 454
          if (tries >= 10) {                                                                                        // 455
            return cb(new Meteor.Error(500, "Chunk #" + num + " is missing!"));                                     //
          } else {                                                                                                  //
            tries++;                                                                                                // 458
            return Meteor.setTimeout(function() {                                                                   //
              return self.emit('concatChunks', result, num, files, tries, pathName, path, fileName, extensionWithDot, opts, cb);
            }, 100);                                                                                                //
          }                                                                                                         //
        } else {                                                                                                    //
          return fs.readFile(_path, function(error, _chunkData) {                                                   //
            return bound(function() {                                                                               //
              if (error) {                                                                                          // 464
                return cb(new Meteor.Error(500, "Can't read " + _path));                                            //
              } else {                                                                                              //
                return fs.appendFile(_source, _chunkData, function(error) {                                         //
                  return bound(function() {                                                                         //
                    if (error) {                                                                                    // 468
                      return cb(new Meteor.Error(500, "Can't append " + _path + " to " + _source));                 //
                    } else {                                                                                        //
                      fs.unlink(_path, NOOP);                                                                       // 471
                      if (files.length <= 0) {                                                                      // 472
                        return fs.rename(_source, path, function(error) {                                           //
                          return bound(function() {                                                                 //
                            if (error) {                                                                            // 474
                              return cb(new Meteor.Error(500, "Can't rename " + _source + " to " + path));          //
                            } else {                                                                                //
                              return self.emit('finishUpload', result, path, fileName, opts, cb);                   //
                            }                                                                                       //
                          });                                                                                       //
                        });                                                                                         //
                      } else {                                                                                      //
                        return self.emit('concatChunks', result, ++num, files, tries, pathName, path, fileName, extensionWithDot, opts, cb);
                      }                                                                                             //
                    }                                                                                               //
                  });                                                                                               //
                });                                                                                                 //
              }                                                                                                     //
            });                                                                                                     //
          });                                                                                                       //
        }                                                                                                           //
      });                                                                                                           //
    });                                                                                                             //
  } : void 0;                                                                                                       //
                                                                                                                    //
  FilesCollection.prototype.handleUpload = Meteor.isServer ? function(result, pathName, path, pathPart, fileName, extensionWithDot, opts, cb) {
    var _path, binary, e, self;                                                                                     // 484
    self = this;                                                                                                    // 484
    if (opts.eof) {                                                                                                 // 485
      binary = opts.binData;                                                                                        // 486
    } else {                                                                                                        //
      binary = new Buffer(opts.binData, 'base64');                                                                  // 488
    }                                                                                                               //
    try {                                                                                                           // 490
      if (opts.eof) {                                                                                               // 491
        if (opts.fileLength > 1) {                                                                                  // 492
          fs.readdir(self.storagePath, function(error, files) {                                                     // 493
            return bound(function() {                                                                               //
              if (error) {                                                                                          // 494
                return cb(new Meteor.Error(500, error));                                                            //
              } else {                                                                                              //
                files = files.filter(function(f) {                                                                  // 497
                  return !!~f.indexOf(opts.fileId);                                                                 //
                });                                                                                                 //
                if (files.length === 1) {                                                                           // 498
                  return fs.rename(self.storagePath + "/" + files[0], path, function(error) {                       //
                    return bound(function() {                                                                       //
                      if (error) {                                                                                  // 500
                        return cb(new Meteor.Error(500, "Can't rename " + self.storagePath + "/" + files[0] + " to " + path));
                      } else {                                                                                      //
                        return self.emit('finishUpload', result, path, fileName, opts, cb);                         //
                      }                                                                                             //
                    });                                                                                             //
                  });                                                                                               //
                } else {                                                                                            //
                  return self.emit('concatChunks', result, 2, files, 0, pathName, path, fileName, extensionWithDot, opts, cb);
                }                                                                                                   //
              }                                                                                                     //
            });                                                                                                     //
          });                                                                                                       //
        } else {                                                                                                    //
          this.emit('finishUpload', result, path, fileName, opts, cb);                                              // 507
        }                                                                                                           //
      } else {                                                                                                      //
        if (pathPart) {                                                                                             // 509
          _path = opts.fileLength > 1 ? pathName + "_" + (opts.chunkId - 1) + extensionWithDot : void 0;            // 510
          fs.stat(_path, function(error, stats) {                                                                   // 510
            return bound(function() {                                                                               //
              if (error || !stats.isFile()) {                                                                       // 512
                return fs.outputFile(pathPart || path, binary, 'binary', function(error) {                          //
                  return bound(function() {                                                                         //
                    return cb(error, result);                                                                       //
                  });                                                                                               //
                });                                                                                                 //
              } else {                                                                                              //
                return fs.appendFile(_path, binary, function(error) {                                               //
                  return bound(function() {                                                                         //
                    return fs.rename(_path, pathName + "_" + opts.chunkId + extensionWithDot, function(error) {     //
                      return bound(function() {                                                                     //
                        return cb(error, result);                                                                   //
                      });                                                                                           //
                    });                                                                                             //
                  });                                                                                               //
                });                                                                                                 //
              }                                                                                                     //
            });                                                                                                     //
          });                                                                                                       //
        } else {                                                                                                    //
          fs.outputFile(pathPart || path, binary, 'binary', function(error) {                                       // 520
            return bound(function() {                                                                               //
              return cb(error, result);                                                                             //
            });                                                                                                     //
          });                                                                                                       //
        }                                                                                                           //
      }                                                                                                             //
    } catch (_error) {                                                                                              //
      e = _error;                                                                                                   // 522
      cb(e);                                                                                                        // 522
    }                                                                                                               //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 526
  /*                                                                                                                // 526
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getMimeType                                                                                                 //
  @param {Object} fileData - File Object                                                                            //
  @summary Returns file's mime-type                                                                                 //
  @returns {String}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getMimeType = function(fileData) {                                                      // 94
    var br, buf, error, ext, fd, mime, ref;                                                                         // 535
    check(fileData, Object);                                                                                        // 535
    if (fileData != null ? fileData.type : void 0) {                                                                // 536
      mime = fileData.type;                                                                                         // 536
    }                                                                                                               //
    if (Meteor.isServer && fileData.path && (!mime || !_.isString(mime))) {                                         // 537
      try {                                                                                                         // 538
        buf = new Buffer(262);                                                                                      // 539
        fd = fs.openSync(fileData.path, 'r');                                                                       // 539
        br = fs.readSync(fd, buf, 0, 262, 0);                                                                       // 539
        fs.close(fd, NOOP);                                                                                         // 539
        if (br < 262) {                                                                                             // 543
          buf = buf.slice(0, br);                                                                                   // 543
        }                                                                                                           //
        ref = fileType(buf), mime = ref.mime, ext = ref.ext;                                                        // 539
      } catch (_error) {                                                                                            //
        error = _error;                                                                                             // 545
      }                                                                                                             //
    }                                                                                                               //
    if (!mime || !_.isString(mime)) {                                                                               // 546
      mime = 'application/octet-stream';                                                                            // 547
    }                                                                                                               //
    return mime;                                                                                                    //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 550
  /*                                                                                                                // 550
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getFileName                                                                                                 //
  @param {Object} fileData - File Object                                                                            //
  @summary Returns file's name                                                                                      //
  @returns {String}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getFileName = function(fileData) {                                                      // 94
    var cleanName, fileName;                                                                                        // 559
    fileName = fileData.name || fileData.fileName;                                                                  // 559
    if (_.isString(fileName) && fileName.length > 0) {                                                              // 560
      cleanName = function(str) {                                                                                   // 561
        return str.replace(/\.\./g, '').replace(/\//g, '');                                                         //
      };                                                                                                            //
      return cleanName(fileData.name || fileData.fileName);                                                         // 562
    } else {                                                                                                        //
      return '';                                                                                                    // 564
    }                                                                                                               //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 566
  /*                                                                                                                // 566
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getUser                                                                                                     //
  @summary Returns object with `userId` and `user()` method which return user's object                              //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getUser = function(http) {                                                              // 94
    var cookie, result, user;                                                                                       // 574
    result = {                                                                                                      // 574
      user: function() {                                                                                            // 575
        return null;                                                                                                // 575
      },                                                                                                            //
      userId: null                                                                                                  // 575
    };                                                                                                              //
    if (Meteor.isServer) {                                                                                          // 578
      if (http) {                                                                                                   // 579
        cookie = http.request.Cookies;                                                                              // 580
        if (_.has(Package, 'accounts-base') && cookie.has('meteor_login_token')) {                                  // 581
          user = Meteor.users.findOne({                                                                             // 582
            'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(cookie.get('meteor_login_token'))   // 582
          });                                                                                                       //
          if (user) {                                                                                               // 583
            result.user = function() {                                                                              // 584
              return user;                                                                                          // 584
            };                                                                                                      //
            result.userId = user._id;                                                                               // 584
          }                                                                                                         //
        }                                                                                                           //
      }                                                                                                             //
    } else {                                                                                                        //
      if (_.has(Package, 'accounts-base') && Meteor.userId()) {                                                     // 587
        result.user = function() {                                                                                  // 588
          return Meteor.user();                                                                                     // 588
        };                                                                                                          //
        result.userId = Meteor.userId();                                                                            // 588
      }                                                                                                             //
    }                                                                                                               //
    return result;                                                                                                  // 591
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 593
  /*                                                                                                                // 593
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getExt                                                                                                      //
  @param {String} FileName - File name                                                                              //
  @summary Get extension from FileName                                                                              //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getExt = function(fileName) {                                                           // 94
    var extension;                                                                                                  // 602
    if (!!~fileName.indexOf('.')) {                                                                                 // 602
      extension = fileName.split('.').pop();                                                                        // 603
      return {                                                                                                      // 604
        ext: extension,                                                                                             // 604
        extension: extension,                                                                                       // 604
        extensionWithDot: '.' + extension                                                                           // 604
      };                                                                                                            //
    } else {                                                                                                        //
      return {                                                                                                      // 606
        ext: '',                                                                                                    // 606
        extension: '',                                                                                              // 606
        extensionWithDot: ''                                                                                        // 606
      };                                                                                                            //
    }                                                                                                               //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 608
  /*                                                                                                                // 608
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name dataToSchema                                                                                                //
  @param {Object} data - File data                                                                                  //
  @summary Build object in accordance with schema from File data                                                    //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.dataToSchema = function(data) {                                                         // 94
    return {                                                                                                        // 617
      name: data.name,                                                                                              // 617
      extension: data.extension,                                                                                    // 617
      path: data.path,                                                                                              // 617
      meta: data.meta,                                                                                              // 617
      type: data.type,                                                                                              // 617
      size: data.size,                                                                                              // 617
      versions: {                                                                                                   // 617
        original: {                                                                                                 // 625
          path: data.path,                                                                                          // 626
          size: data.size,                                                                                          // 626
          type: data.type,                                                                                          // 626
          extension: data.extension                                                                                 // 626
        }                                                                                                           //
      },                                                                                                            //
      isVideo: !!~data.type.toLowerCase().indexOf('video'),                                                         // 617
      isAudio: !!~data.type.toLowerCase().indexOf('audio'),                                                         // 617
      isImage: !!~data.type.toLowerCase().indexOf('image'),                                                         // 617
      isText: !!~data.type.toLowerCase().indexOf('text'),                                                           // 617
      isJSON: !!~data.type.toLowerCase().indexOf('json'),                                                           // 617
      _prefix: data._prefix || this._prefix,                                                                        // 617
      _storagePath: data._storagePath || this.storagePath,                                                          // 617
      _downloadRoute: data._downloadRoute || this.downloadRoute,                                                    // 617
      _collectionName: data._collectionName || this.collectionName                                                  // 617
    };                                                                                                              //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 641
  /*                                                                                                                // 641
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name srch                                                                                                        //
  @param {String|Object} search - Search data                                                                       //
  @summary Build search object                                                                                      //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.srch = function(search) {                                                               // 94
    if (search && _.isString(search)) {                                                                             // 650
      this.search = {                                                                                               // 651
        _id: search                                                                                                 // 652
      };                                                                                                            //
    } else {                                                                                                        //
      this.search = search || {};                                                                                   // 654
    }                                                                                                               //
    return this.search;                                                                                             //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 657
  /*                                                                                                                // 657
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name write                                                                                                       //
  @param {Buffer} buffer - Binary File's Buffer                                                                     //
  @param {Object} opts - {fileName: '', type: '', size: 0, meta: {...}}                                             //
  @param {Function} callback - function(error, fileObj){...}                                                        //
  @summary Write buffer to FS and add to FilesCollection Collection                                                 //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.write = Meteor.isServer ? function(buffer, opts, callback) {                            // 94
    var extension, extensionWithDot, fileName, path, randFileName, ref, result;                                     // 668
    if (opts == null) {                                                                                             //
      opts = {};                                                                                                    //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 668
      console.info("[FilesCollection] [write()]");                                                                  // 668
    }                                                                                                               //
    check(opts, Match.Optional(Object));                                                                            // 668
    check(callback, Match.Optional(Function));                                                                      // 668
    if (this.checkAccess()) {                                                                                       // 672
      randFileName = this.namingFunction();                                                                         // 673
      fileName = opts.name || opts.fileName ? opts.name || opts.fileName : randFileName;                            // 673
      ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;              // 673
      path = this.storagePath + "/" + randFileName + extensionWithDot;                                              // 673
      opts.type = this.getMimeType(opts);                                                                           // 673
      if (!opts.meta) {                                                                                             // 681
        opts.meta = {};                                                                                             // 681
      }                                                                                                             //
      if (!opts.size) {                                                                                             // 682
        opts.size = buffer.length;                                                                                  // 682
      }                                                                                                             //
      result = this.dataToSchema({                                                                                  // 673
        name: fileName,                                                                                             // 685
        path: path,                                                                                                 // 685
        meta: opts.meta,                                                                                            // 685
        type: opts.type,                                                                                            // 685
        size: opts.size,                                                                                            // 685
        extension: extension                                                                                        // 685
      });                                                                                                           //
      if (this.debug) {                                                                                             // 692
        console.info("[FilesCollection] [write]: " + fileName + " -> " + this.collectionName);                      // 692
      }                                                                                                             //
      fs.outputFile(path, buffer, 'binary', function(error) {                                                       // 673
        return bound(function() {                                                                                   //
          if (error) {                                                                                              // 695
            return callback && callback(error);                                                                     //
          } else {                                                                                                  //
            result._id = this.collection.insert(_.clone(result));                                                   // 698
            return callback && callback(null, result);                                                              //
          }                                                                                                         //
        });                                                                                                         //
      });                                                                                                           //
      return this;                                                                                                  // 701
    }                                                                                                               //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 705
  /*                                                                                                                // 705
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name load                                                                                                        //
  @param {String} url - URL to file                                                                                 //
  @param {Object} opts - {fileName: '', meta: {...}}                                                                //
  @param {Function} callback - function(error, fileObj){...}                                                        //
  @summary Download file, write stream to FS and add to FilesCollection Collection                                  //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.load = Meteor.isServer ? function(url, opts, callback) {                                // 94
    var extension, extensionWithDot, fileName, path, randFileName, ref, self;                                       // 716
    if (opts == null) {                                                                                             //
      opts = {};                                                                                                    //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 716
      console.info("[FilesCollection] [load(" + url + ", " + (JSON.stringify(opts)) + ", callback)]");              // 716
    }                                                                                                               //
    check(url, String);                                                                                             // 716
    check(opts, Match.Optional(Object));                                                                            // 716
    check(callback, Match.Optional(Function));                                                                      // 716
    self = this;                                                                                                    // 716
    randFileName = this.namingFunction();                                                                           // 716
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : randFileName;                              // 716
    ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                // 716
    path = this.storagePath + "/" + randFileName + extensionWithDot;                                                // 716
    if (!opts.meta) {                                                                                               // 727
      opts.meta = {};                                                                                               // 727
    }                                                                                                               //
    request.get(url).on('error', function(error) {                                                                  // 716
      return bound(function() {                                                                                     //
        throw new Meteor.Error(500, ("Error on [load(" + url + ")]:") + JSON.stringify(error));                     // 730
      });                                                                                                           //
    }).on('response', function(response) {                                                                          //
      return bound(function() {                                                                                     //
        var result;                                                                                                 // 733
        if (self.debug) {                                                                                           // 733
          console.info("[FilesCollection] [load] Received: " + url);                                                // 733
        }                                                                                                           //
        result = self.dataToSchema({                                                                                // 733
          name: fileName,                                                                                           // 736
          path: path,                                                                                               // 736
          meta: opts.meta,                                                                                          // 736
          type: opts.type || response.headers['content-type'],                                                      // 736
          size: opts.size || response.headers['content-length'],                                                    // 736
          extension: extension                                                                                      // 736
        });                                                                                                         //
        return self.collection.insert(_.clone(result), function(error, fileRef) {                                   //
          if (error) {                                                                                              // 744
            if (self.debug) {                                                                                       // 745
              console.warn("[FilesCollection] [load] [insert] Error: " + fileName + " -> " + self.collectionName, error);
            }                                                                                                       //
            return callback && callback(error);                                                                     //
          } else {                                                                                                  //
            if (self.debug) {                                                                                       // 748
              console.info("[FilesCollection] [load] [insert] " + fileName + " -> " + self.collectionName);         // 748
            }                                                                                                       //
            return callback && callback(null, fileRef);                                                             //
          }                                                                                                         //
        });                                                                                                         //
      });                                                                                                           //
    }).pipe(fs.createWriteStream(path, {                                                                            //
      flags: 'w'                                                                                                    // 750
    }));                                                                                                            //
    return this;                                                                                                    // 752
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 756
  /*                                                                                                                // 756
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name addFile                                                                                                     //
  @param {String} path - Path to file                                                                               //
  @param {String} path - Path to file                                                                               //
  @summary Add file from FS to FilesCollection                                                                      //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.addFile = Meteor.isServer ? function(path, opts, callback) {                            // 94
    var self;                                                                                                       // 766
    if (opts == null) {                                                                                             //
      opts = {};                                                                                                    //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 766
      console.info("[FilesCollection] [addFile(" + path + ")]");                                                    // 766
    }                                                                                                               //
    if (this["public"]) {                                                                                           // 768
      throw new Meteor.Error(403, 'Can not run [addFile] on public collection! Just Move file to root of your server, then add record to Collection');
    }                                                                                                               //
    check(path, String);                                                                                            // 766
    check(opts, Match.Optional(Object));                                                                            // 766
    check(callback, Match.Optional(Function));                                                                      // 766
    self = this;                                                                                                    // 766
    fs.stat(path, function(error, stats) {                                                                          // 766
      return bound(function() {                                                                                     //
        var _cn, extension, extensionWithDot, fileName, pathParts, ref, result;                                     // 775
        if (error) {                                                                                                // 775
          return callback && callback(error);                                                                       //
        } else if (stats.isFile()) {                                                                                //
          pathParts = path.split('/');                                                                              // 778
          fileName = pathParts[pathParts.length - 1];                                                               // 778
          ref = self.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;          // 778
          if (!opts.type) {                                                                                         // 783
            opts.type = 'application/*';                                                                            // 783
          }                                                                                                         //
          if (!opts.meta) {                                                                                         // 784
            opts.meta = {};                                                                                         // 784
          }                                                                                                         //
          if (!opts.size) {                                                                                         // 785
            opts.size = stats.size;                                                                                 // 785
          }                                                                                                         //
          result = self.dataToSchema({                                                                              // 778
            name: fileName,                                                                                         // 788
            path: path,                                                                                             // 788
            meta: opts.meta,                                                                                        // 788
            type: opts.type,                                                                                        // 788
            size: opts.size,                                                                                        // 788
            extension: extension,                                                                                   // 788
            _storagePath: path.replace("/" + fileName, '')                                                          // 788
          });                                                                                                       //
          _cn = self.collectionName;                                                                                // 778
          return self.collection.insert(_.clone(result), function(error, record) {                                  //
            if (error) {                                                                                            // 798
              if (self.debug) {                                                                                     // 799
                console.warn("[FilesCollection] [addFile] [insert] Error: " + fileName + " -> " + _cn, error);      // 799
              }                                                                                                     //
              return callback && callback(error);                                                                   //
            } else {                                                                                                //
              if (self.debug) {                                                                                     // 802
                console.info("[FilesCollection] [addFile] [insert]: " + fileName + " -> " + _cn);                   // 802
              }                                                                                                     //
              return callback && callback(null, result);                                                            //
            }                                                                                                       //
          });                                                                                                       //
        } else {                                                                                                    //
          return callback && callback(new Meteor.Error(400, "[FilesCollection] [addFile(" + path + ")]: File does not exist"));
        }                                                                                                           //
      });                                                                                                           //
    });                                                                                                             //
    return this;                                                                                                    // 807
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 811
  /*                                                                                                                // 811
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name findOne                                                                                                     //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                  //
  @summary Load file                                                                                                //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.findOne = function(search) {                                                            // 94
    if (this.debug) {                                                                                               // 820
      console.info("[FilesCollection] [findOne(" + (JSON.stringify(search)) + ")]");                                // 820
    }                                                                                                               //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                     // 820
    this.srch(search);                                                                                              // 820
    if (this.checkAccess()) {                                                                                       // 824
      this.currentFile = this.collection.findOne(this.search);                                                      // 825
      this.cursor = null;                                                                                           // 825
    }                                                                                                               //
    return this;                                                                                                    // 827
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 829
  /*                                                                                                                // 829
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name find                                                                                                        //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                  //
  @summary Load file or bunch of files                                                                              //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.find = function(search) {                                                               // 94
    if (this.debug) {                                                                                               // 838
      console.info("[FilesCollection] [find(" + (JSON.stringify(search)) + ")]");                                   // 838
    }                                                                                                               //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                     // 838
    this.srch(search);                                                                                              // 838
    if (this.checkAccess()) {                                                                                       // 842
      this.currentFile = null;                                                                                      // 843
      this.cursor = this.collection.find(this.search);                                                              // 843
    }                                                                                                               //
    return this;                                                                                                    // 845
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 847
  /*                                                                                                                // 847
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name get                                                                                                         //
  @summary Return value of current cursor or file                                                                   //
  @returns {Object|[Object]}                                                                                        //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.get = function() {                                                                      // 94
    if (this.debug) {                                                                                               // 855
      console.info('[FilesCollection] [get()]');                                                                    // 855
    }                                                                                                               //
    if (this.cursor) {                                                                                              // 856
      return this.cursor.fetch();                                                                                   // 856
    }                                                                                                               //
    return this.currentFile;                                                                                        // 857
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 859
  /*                                                                                                                // 859
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name fetch                                                                                                       //
  @summary Alias for `get()` method                                                                                 //
  @returns {[Object]}                                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.fetch = function() {                                                                    // 94
    var data;                                                                                                       // 867
    if (this.debug) {                                                                                               // 867
      console.info('[FilesCollection] [fetch()]');                                                                  // 867
    }                                                                                                               //
    data = this.get();                                                                                              // 867
    if (!_.isArray(data)) {                                                                                         // 869
      return [data];                                                                                                // 870
    } else {                                                                                                        //
      return data;                                                                                                  //
    }                                                                                                               //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 874
  /*                                                                                                                // 874
  @locus Client                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name insert                                                                                                      //
  @see https://developer.mozilla.org/en-US/docs/Web/API/FileReader                                                  //
  @param {Object} config - Configuration object with next properties:                                               //
    {File|Object} file           - HTML5 `files` item, like in change event: `e.currentTarget.files[0]`             //
    {Object}      meta           - Additional data as object, use later for search                                  //
    {Boolean}     allowWebWorkers- Allow/Deny WebWorkers usage                                                      //
    {Number|dynamic} streams     - Quantity of parallel upload streams, default: 2                                  //
    {Number|dynamic} chunkSize   - Chunk size for upload                                                            //
    {Function}    onUploaded     - Callback triggered when upload is finished, with two arguments `error` and `fileRef`
    {Function}    onStart        - Callback triggered when upload is started after all successful validations, with two arguments `error` (always null) and `fileRef`
    {Function}    onError        - Callback triggered on error in upload and/or FileReader, with two arguments `error` and `fileData`
    {Function}    onProgress     - Callback triggered when chunk is sent, with only argument `progress`             //
    {Function}    onBeforeUpload - Callback triggered right before upload is started:                               //
        return true to continue                                                                                     //
        return false to abort upload                                                                                //
  @param {Boolean} autoStart     - Start upload immediately. If set to false, you need manually call .start() method on returned class. Useful to set EventListeners.
  @summary Upload file to server over DDP                                                                           //
  @returns {UploadInstance} Instance. UploadInstance has next properties:                                           //
    {ReactiveVar} onPause  - Is upload process on the pause?                                                        //
    {ReactiveVar} state    - active|paused|aborted|completed                                                        //
    {ReactiveVar} progress - Current progress in percentage                                                         //
    {Function}    pause    - Pause upload process                                                                   //
    {Function}    continue - Continue paused upload process                                                         //
    {Function}    toggle   - Toggle continue/pause if upload process                                                //
    {Function}    abort    - Abort upload                                                                           //
    {Function}    readAsDataURL - Current file as data URL, use to create image preview and etc. Be aware of big files, may lead to browser crash
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.insert = Meteor.isClient ? function(config, autoStart) {                                // 94
    var mName;                                                                                                      // 905
    if (autoStart == null) {                                                                                        //
      autoStart = true;                                                                                             //
    }                                                                                                               //
    if (this.checkAccess()) {                                                                                       // 905
      mName = autoStart ? 'start' : 'manual';                                                                       // 906
      return (new this._UploadInstance(config, this))[mName]();                                                     // 907
    } else {                                                                                                        //
      throw new Meteor.Error(401, "[FilesCollection] [insert] Access Denied");                                      // 909
    }                                                                                                               //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 912
  /*                                                                                                                // 912
  @locus Client                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name _UploadInstance                                                                                             //
  @class UploadInstance                                                                                             //
  @summary Internal Class, used in upload                                                                           //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype._UploadInstance = Meteor.isClient ? UploadInstance = (function() {                      // 94
    UploadInstance.prototype.__proto__ = EventEmitter.prototype;                                                    // 920
                                                                                                                    //
    function UploadInstance(config1, collection) {                                                                  // 921
      var base, base1, base2, base3, self;                                                                          // 922
      this.config = config1;                                                                                        // 922
      this.collection = collection;                                                                                 // 922
      EventEmitter.call(this);                                                                                      // 922
      if (this.collection.debug) {                                                                                  // 923
        console.info('[FilesCollection] [insert()]');                                                               // 923
      }                                                                                                             //
      self = this;                                                                                                  // 922
      if ((base = this.config).meta == null) {                                                                      //
        base.meta = {};                                                                                             //
      }                                                                                                             //
      if ((base1 = this.config).streams == null) {                                                                  //
        base1.streams = 2;                                                                                          //
      }                                                                                                             //
      if (this.config.streams < 1) {                                                                                // 927
        this.config.streams = 2;                                                                                    // 927
      }                                                                                                             //
      if ((base2 = this.config).chunkSize == null) {                                                                //
        base2.chunkSize = this.collection.chunkSize;                                                                //
      }                                                                                                             //
      if ((base3 = this.config).allowWebWorkers == null) {                                                          //
        base3.allowWebWorkers = true;                                                                               //
      }                                                                                                             //
      check(this.config, {                                                                                          // 922
        file: Match.Any,                                                                                            // 931
        meta: Match.Optional(Object),                                                                               // 931
        onError: Match.Optional(Function),                                                                          // 931
        onAbort: Match.Optional(Function),                                                                          // 931
        streams: Match.OneOf('dynamic', Number),                                                                    // 931
        onStart: Match.Optional(Function),                                                                          // 931
        chunkSize: Match.OneOf('dynamic', Number),                                                                  // 931
        onUploaded: Match.Optional(Function),                                                                       // 931
        onProgress: Match.Optional(Function),                                                                       // 931
        onBeforeUpload: Match.Optional(Function),                                                                   // 931
        allowWebWorkers: Boolean                                                                                    // 931
      });                                                                                                           //
      if (this.config.file) {                                                                                       // 945
        if (this.collection.debug) {                                                                                // 946
          console.time('insert ' + this.config.file.name);                                                          // 946
        }                                                                                                           //
        if (this.collection.debug) {                                                                                // 947
          console.time('loadFile ' + this.config.file.name);                                                        // 947
        }                                                                                                           //
        if (Worker && this.config.allowWebWorkers) {                                                                // 949
          this.worker = new Worker('/packages/ostrio_files/worker.js');                                             // 950
        } else {                                                                                                    //
          this.worker = null;                                                                                       // 952
        }                                                                                                           //
        this.trackerComp = null;                                                                                    // 946
        this.currentChunk = 0;                                                                                      // 946
        this.sentChunks = 0;                                                                                        // 946
        this.EOFsent = false;                                                                                       // 946
        this.transferTime = 0;                                                                                      // 946
        this.fileLength = 1;                                                                                        // 946
        this.fileId = this.collection.namingFunction();                                                             // 946
        this.pipes = [];                                                                                            // 946
        this.fileData = {                                                                                           // 946
          size: this.config.file.size,                                                                              // 963
          type: this.config.file.type,                                                                              // 963
          name: this.config.file.name                                                                               // 963
        };                                                                                                          //
        this.fileData = _.extend(this.fileData, this.collection.getExt(self.config.file.name), {                    // 946
          mime: this.collection.getMimeType(this.fileData)                                                          // 967
        });                                                                                                         //
        this.fileData['mime-type'] = this.fileData.mime;                                                            // 946
        this.result = new this.collection._FileUpload(_.extend(self.config, {                                       // 946
          fileData: this.fileData,                                                                                  // 970
          fileId: this.fileId,                                                                                      // 970
          MeteorFileAbort: this.collection.methodNames.MeteorFileAbort                                              // 970
        }));                                                                                                        //
        this.beforeunload = function(e) {                                                                           // 946
          var message;                                                                                              // 973
          message = _.isFunction(self.collection.onbeforeunloadMessage) ? self.collection.onbeforeunloadMessage.call(self.result, self.fileData) : self.collection.onbeforeunloadMessage;
          if (e) {                                                                                                  // 974
            e.returnValue = message;                                                                                // 974
          }                                                                                                         //
          return message;                                                                                           // 975
        };                                                                                                          //
        this.result.config.beforeunload = this.beforeunload;                                                        // 946
        window.addEventListener('beforeunload', this.beforeunload, false);                                          // 946
        this.result.config._onEnd = function() {                                                                    // 946
          return self.emitEvent('_onEnd');                                                                          //
        };                                                                                                          //
        this.addListener('end', function(error, data) {                                                             // 946
          return this.end(error, data);                                                                             //
        });                                                                                                         //
        this.addListener('start', function() {                                                                      // 946
          return this.start();                                                                                      //
        });                                                                                                         //
        this.addListener('upload', function() {                                                                     // 946
          return this.upload();                                                                                     //
        });                                                                                                         //
        this.addListener('sendEOF', function(opts) {                                                                // 946
          return this.sendEOF(opts);                                                                                //
        });                                                                                                         //
        this.addListener('prepare', function() {                                                                    // 946
          return this.prepare();                                                                                    //
        });                                                                                                         //
        this.addListener('sendViaDDP', function(evt) {                                                              // 946
          return this.sendViaDDP(evt);                                                                              //
        });                                                                                                         //
        this.addListener('proceedChunk', function(chunkId, start) {                                                 // 946
          return this.proceedChunk(chunkId, start);                                                                 //
        });                                                                                                         //
        this.addListener('createStreams', function() {                                                              // 946
          return this.createStreams();                                                                              //
        });                                                                                                         //
        this.addListener('calculateStats', _.throttle(function() {                                                  // 946
          var _t, progress;                                                                                         // 991
          _t = (self.transferTime / self.sentChunks) / self.config.streams;                                         // 991
          self.result.estimateTime.set(_t * (self.fileLength - self.sentChunks));                                   // 991
          self.result.estimateSpeed.set(self.config.chunkSize / (_t / 1000));                                       // 991
          progress = Math.round((self.sentChunks / self.fileLength) * 100);                                         // 991
          self.result.progress.set(progress);                                                                       // 991
          self.config.onProgress && self.config.onProgress.call(self.result, progress, self.fileData);              // 991
          self.result.emitEvent('progress', [progress, self.fileData]);                                             // 991
        }, 250));                                                                                                   //
        this.addListener('_onEnd', function() {                                                                     // 946
          if (self.worker) {                                                                                        // 1002
            self.worker.terminate();                                                                                // 1002
          }                                                                                                         //
          if (self.trackerComp) {                                                                                   // 1003
            self.trackerComp.stop();                                                                                // 1003
          }                                                                                                         //
          if (self.beforeunload) {                                                                                  // 1004
            window.removeEventListener('beforeunload', self.beforeunload, false);                                   // 1004
          }                                                                                                         //
          if (self.result) {                                                                                        // 1005
            return self.result.progress.set(0);                                                                     //
          }                                                                                                         //
        });                                                                                                         //
      } else {                                                                                                      //
        throw new Meteor.Error(500, "[FilesCollection] [insert] Have you forget to pass a File itself?");           // 1007
      }                                                                                                             //
    }                                                                                                               //
                                                                                                                    //
    UploadInstance.prototype.end = function(error, data) {                                                          // 920
      if (this.collection.debug) {                                                                                  // 1010
        console.timeEnd('insert ' + this.config.file.name);                                                         // 1010
      }                                                                                                             //
      this.emitEvent('_onEnd');                                                                                     // 1010
      this.result.emitEvent('uploaded', [error, data]);                                                             // 1010
      this.config.onUploaded && this.config.onUploaded.call(this.result, error, data);                              // 1010
      if (error) {                                                                                                  // 1014
        if (this.collection.debug) {                                                                                // 1015
          console.warn("[FilesCollection] [insert] [end] Error: ", error);                                          // 1015
        }                                                                                                           //
        this.result.abort();                                                                                        // 1015
        this.result.state.set('aborted');                                                                           // 1015
        this.result.emitEvent('error', [error, this.fileData]);                                                     // 1015
        this.config.onError && this.config.onError.call(this.result, error, this.fileData);                         // 1015
      } else {                                                                                                      //
        this.result.state.set('completed');                                                                         // 1021
        this.collection.emitEvent('afterUpload', [data]);                                                           // 1021
      }                                                                                                             //
      this.result.emitEvent('end', [error, data || this.fileData]);                                                 // 1010
      return this.result;                                                                                           // 1024
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.sendViaDDP = function(evt) {                                                           // 920
      var j, len, opts, pipeFunc, ref, self;                                                                        // 1027
      self = this;                                                                                                  // 1027
      opts = {                                                                                                      // 1027
        file: this.fileData,                                                                                        // 1029
        fileId: this.fileId,                                                                                        // 1029
        binData: evt.data.bin,                                                                                      // 1029
        chunkId: evt.data.chunkId,                                                                                  // 1029
        fileLength: this.fileLength                                                                                 // 1029
      };                                                                                                            //
      this.emitEvent('data', [evt.data.bin]);                                                                       // 1027
      if (this.pipes.length) {                                                                                      // 1036
        ref = this.pipes;                                                                                           // 1037
        for (j = 0, len = ref.length; j < len; j++) {                                                               // 1037
          pipeFunc = ref[j];                                                                                        //
          opts.binData = pipeFunc(opts.binData);                                                                    // 1038
        }                                                                                                           // 1037
      }                                                                                                             //
      if (this.fileLength === evt.data.chunkId) {                                                                   // 1040
        if (this.collection.debug) {                                                                                // 1041
          console.timeEnd('loadFile ' + this.config.file.name);                                                     // 1041
        }                                                                                                           //
        this.emitEvent('readEnd');                                                                                  // 1041
      }                                                                                                             //
      if (opts.binData && opts.binData.length) {                                                                    // 1044
        Meteor.call(this.collection.methodNames.MeteorFileWrite, opts, function(error) {                            // 1045
          ++self.sentChunks;                                                                                        // 1046
          self.transferTime += (+(new Date)) - evt.data.start;                                                      // 1046
          if (error) {                                                                                              // 1048
            self.emitEvent('end', [error]);                                                                         // 1049
          } else {                                                                                                  //
            if (self.sentChunks >= self.fileLength) {                                                               // 1051
              self.emitEvent('sendEOF', [opts]);                                                                    // 1052
            } else if (self.currentChunk < self.fileLength) {                                                       //
              self.emitEvent('upload');                                                                             // 1054
            }                                                                                                       //
            self.emitEvent('calculateStats');                                                                       // 1051
          }                                                                                                         //
        });                                                                                                         //
      } else {                                                                                                      //
        this.emitEvent('sendEOF', [opts]);                                                                          // 1058
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.sendEOF = function(opts) {                                                             // 920
      var self;                                                                                                     // 1062
      if (!this.EOFsent) {                                                                                          // 1062
        this.EOFsent = true;                                                                                        // 1063
        self = this;                                                                                                // 1063
        opts = {                                                                                                    // 1063
          eof: true,                                                                                                // 1066
          meta: this.config.meta,                                                                                   // 1066
          file: this.fileData,                                                                                      // 1066
          fileId: this.fileId,                                                                                      // 1066
          fileLength: this.fileLength                                                                               // 1066
        };                                                                                                          //
        Meteor.call(this.collection.methodNames.MeteorFileWrite, opts, function() {                                 // 1063
          return self.emitEvent('end', arguments);                                                                  //
        });                                                                                                         //
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.proceedChunk = function(chunkId, start) {                                              // 920
      var chunk, fileReader, self;                                                                                  // 1077
      self = this;                                                                                                  // 1077
      chunk = this.config.file.slice(this.config.chunkSize * (chunkId - 1), this.config.chunkSize * chunkId);       // 1077
      fileReader = new FileReader;                                                                                  // 1077
      fileReader.onloadend = function(evt) {                                                                        // 1077
        var ref, ref1;                                                                                              // 1082
        self.emitEvent('sendViaDDP', [                                                                              // 1082
          {                                                                                                         //
            data: {                                                                                                 // 1082
              bin: ((fileReader != null ? fileReader.result : void 0) || ((ref = evt.srcElement) != null ? ref.result : void 0) || ((ref1 = evt.target) != null ? ref1.result : void 0)).split(',')[1],
              chunkId: chunkId,                                                                                     // 1083
              start: start                                                                                          // 1083
            }                                                                                                       //
          }                                                                                                         //
        ]);                                                                                                         //
      };                                                                                                            //
      fileReader.onerror = function(e) {                                                                            // 1077
        self.emitEvent('end', [(e.target || e.srcElement).error]);                                                  // 1091
      };                                                                                                            //
      fileReader.readAsDataURL(chunk);                                                                              // 1077
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.upload = function() {                                                                  // 920
      var self, start;                                                                                              // 1098
      start = +(new Date);                                                                                          // 1098
      if (this.result.onPause.get()) {                                                                              // 1099
        self = this;                                                                                                // 1100
        this.result.continueFunc = function() {                                                                     // 1100
          self.emitEvent('createStreams');                                                                          // 1102
        };                                                                                                          //
        return;                                                                                                     // 1104
      }                                                                                                             //
      if (this.result.state.get() === 'aborted') {                                                                  // 1106
        return this;                                                                                                // 1107
      }                                                                                                             //
      ++this.currentChunk;                                                                                          // 1098
      if (this.worker) {                                                                                            // 1110
        this.worker.postMessage({                                                                                   // 1111
          sentChunks: this.sentChunks,                                                                              // 1111
          start: start,                                                                                             // 1111
          currentChunk: this.currentChunk,                                                                          // 1111
          chunkSize: this.config.chunkSize,                                                                         // 1111
          file: this.config.file                                                                                    // 1111
        });                                                                                                         //
      } else {                                                                                                      //
        this.emitEvent('proceedChunk', [this.currentChunk, start]);                                                 // 1113
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.createStreams = function() {                                                           // 920
      var i, self;                                                                                                  // 1117
      i = 1;                                                                                                        // 1117
      self = this;                                                                                                  // 1117
      while (i <= this.config.streams) {                                                                            // 1119
        self.emitEvent('upload');                                                                                   // 1120
        i++;                                                                                                        // 1120
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.prepare = function() {                                                                 // 920
      var _len, self;                                                                                               // 1125
      self = this;                                                                                                  // 1125
      this.config.onStart && this.config.onStart.call(this.result, null, this.fileData);                            // 1125
      this.result.emitEvent('start', [null, this.fileData]);                                                        // 1125
      if (this.config.chunkSize === 'dynamic') {                                                                    // 1130
        if (this.config.file.size >= 104857600) {                                                                   // 1131
          this.config.chunkSize = 1048576;                                                                          // 1132
        } else if (this.config.file.size >= 52428800) {                                                             //
          this.config.chunkSize = 524288;                                                                           // 1134
        } else {                                                                                                    //
          this.config.chunkSize = 262144;                                                                           // 1136
        }                                                                                                           //
      }                                                                                                             //
      _len = Math.ceil(this.config.file.size / this.config.chunkSize);                                              // 1125
      if (this.config.streams === 'dynamic') {                                                                      // 1139
        this.config.streams = _.clone(_len);                                                                        // 1140
        if (this.config.streams > 32) {                                                                             // 1141
          this.config.streams = 32;                                                                                 // 1141
        }                                                                                                           //
      }                                                                                                             //
      this.fileLength = _len <= 0 ? 1 : _len;                                                                       // 1125
      if (this.config.streams > this.fileLength) {                                                                  // 1144
        this.config.streams = this.fileLength;                                                                      // 1144
      }                                                                                                             //
      this.result.config.fileLength = this.fileLength;                                                              // 1125
      self.emitEvent('createStreams');                                                                              // 1125
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.pipe = function(func) {                                                                // 920
      this.pipes.push(func);                                                                                        // 1151
      return this;                                                                                                  // 1152
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.start = function() {                                                                   // 920
      var isUploadAllowed, self;                                                                                    // 1155
      self = this;                                                                                                  // 1155
      if (this.config.file.size <= 0) {                                                                             // 1156
        this.end(new Meteor.Error(400, 'Can\'t upload empty file'));                                                // 1157
        return this.result;                                                                                         // 1158
      }                                                                                                             //
      if (this.config.onBeforeUpload && _.isFunction(this.config.onBeforeUpload)) {                                 // 1160
        isUploadAllowed = this.config.onBeforeUpload.call(_.extend(this.result, this.collection.getUser()), this.fileData);
        if (isUploadAllowed !== true) {                                                                             // 1162
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'config.onBeforeUpload() returned false'));
        }                                                                                                           //
      }                                                                                                             //
      if (this.collection.onBeforeUpload && _.isFunction(this.collection.onBeforeUpload)) {                         // 1165
        isUploadAllowed = this.collection.onBeforeUpload.call(_.extend(this.result, this.collection.getUser()), this.fileData);
        if (isUploadAllowed !== true) {                                                                             // 1167
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'collection.onBeforeUpload() returned false'));
        }                                                                                                           //
      }                                                                                                             //
      Tracker.autorun(function(computation) {                                                                       // 1155
        self.trackerComp = computation;                                                                             // 1171
        if (!self.result.onPause.get()) {                                                                           // 1172
          if (Meteor.status().connected) {                                                                          // 1173
            self.result["continue"]();                                                                              // 1174
            if (self.collection.debug) {                                                                            // 1175
              console.info('[FilesCollection] [insert] [Tracker] [continue]');                                      // 1175
            }                                                                                                       //
          } else {                                                                                                  //
            self.result.pause();                                                                                    // 1177
            if (self.collection.debug) {                                                                            // 1178
              console.info('[FilesCollection] [insert] [Tracker] [pause]');                                         // 1178
            }                                                                                                       //
          }                                                                                                         //
        }                                                                                                           //
      });                                                                                                           //
      if (this.worker) {                                                                                            // 1181
        this.worker.onmessage = function(evt) {                                                                     // 1182
          if (evt.data.error) {                                                                                     // 1183
            if (self.collection.debug) {                                                                            // 1184
              console.warn(evt.data.error);                                                                         // 1184
            }                                                                                                       //
            self.emitEvent('proceedChunk', [evt.data.chunkId, evt.data.start]);                                     // 1184
          } else {                                                                                                  //
            self.emitEvent('sendViaDDP', [evt]);                                                                    // 1187
          }                                                                                                         //
        };                                                                                                          //
        this.worker.onerror = function(e) {                                                                         // 1182
          self.emitEvent('end', [e.message]);                                                                       // 1190
        };                                                                                                          //
      }                                                                                                             //
      if (this.collection.debug) {                                                                                  // 1193
        if (this.worker) {                                                                                          // 1194
          console.info("[FilesCollection] [insert] using WebWorkers");                                              // 1195
        } else {                                                                                                    //
          console.info("[FilesCollection] [insert] using MainThread");                                              // 1197
        }                                                                                                           //
      }                                                                                                             //
      self.emitEvent('prepare');                                                                                    // 1155
      return this.result;                                                                                           // 1200
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.manual = function() {                                                                  // 920
      var self;                                                                                                     // 1203
      self = this;                                                                                                  // 1203
      this.result.start = function() {                                                                              // 1203
        self.emitEvent('start');                                                                                    // 1205
      };                                                                                                            //
      this.result.pipe = function(func) {                                                                           // 1203
        self.pipe(func);                                                                                            // 1208
        return this;                                                                                                // 1209
      };                                                                                                            //
      return this.result;                                                                                           // 1210
    };                                                                                                              //
                                                                                                                    //
    return UploadInstance;                                                                                          //
                                                                                                                    //
  })() : void 0;                                                                                                    //
                                                                                                                    //
                                                                                                                    // 1213
  /*                                                                                                                // 1213
  @locus Client                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name _FileUpload                                                                                                 //
  @class FileUpload                                                                                                 //
  @summary Internal Class, instance of this class is returned from `insert()` method                                //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype._FileUpload = Meteor.isClient ? FileUpload = (function() {                              // 94
    FileUpload.prototype.__proto__ = EventEmitter.prototype;                                                        // 1221
                                                                                                                    //
    function FileUpload(config1) {                                                                                  // 1222
      this.config = config1;                                                                                        // 1223
      EventEmitter.call(this);                                                                                      // 1223
      this.file = _.extend(this.config.file, this.config.fileData);                                                 // 1223
      this.state = new ReactiveVar('active');                                                                       // 1223
      this.onPause = new ReactiveVar(false);                                                                        // 1223
      this.progress = new ReactiveVar(0);                                                                           // 1223
      this.estimateTime = new ReactiveVar(1000);                                                                    // 1223
      this.estimateSpeed = new ReactiveVar(0);                                                                      // 1223
    }                                                                                                               //
                                                                                                                    //
    FileUpload.prototype.continueFunc = function() {};                                                              // 1221
                                                                                                                    //
    FileUpload.prototype.pause = function() {                                                                       // 1221
      if (!this.onPause.get()) {                                                                                    // 1232
        this.onPause.set(true);                                                                                     // 1233
        this.state.set('paused');                                                                                   // 1233
        this.emitEvent('pause', [this.file]);                                                                       // 1233
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    FileUpload.prototype["continue"] = function() {                                                                 // 1221
      if (this.onPause.get()) {                                                                                     // 1238
        this.onPause.set(false);                                                                                    // 1239
        this.state.set('active');                                                                                   // 1239
        this.emitEvent('continue', [this.file]);                                                                    // 1239
        this.continueFunc.call();                                                                                   // 1239
        this.continueFunc = function() {};                                                                          // 1239
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    FileUpload.prototype.toggle = function() {                                                                      // 1221
      if (this.onPause.get()) {                                                                                     // 1246
        this["continue"]();                                                                                         // 1246
      } else {                                                                                                      //
        this.pause();                                                                                               // 1246
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    FileUpload.prototype.abort = function() {                                                                       // 1221
      window.removeEventListener('beforeunload', this.config.beforeunload, false);                                  // 1249
      this.config.onAbort && this.config.onAbort.call(this, this.file);                                             // 1249
      this.emitEvent('abort', [this.file]);                                                                         // 1249
      this.pause();                                                                                                 // 1249
      this.config._onEnd();                                                                                         // 1249
      this.state.set('aborted');                                                                                    // 1249
      if (this.config.debug) {                                                                                      // 1255
        console.timeEnd('insert ' + this.config.file.name);                                                         // 1255
      }                                                                                                             //
      if (this.config.fileLength) {                                                                                 // 1256
        Meteor.call(this.config.MeteorFileAbort, {                                                                  // 1257
          fileId: this.config.fileId,                                                                               // 1257
          fileLength: this.config.fileLength,                                                                       // 1257
          fileData: this.config.fileData                                                                            // 1257
        });                                                                                                         //
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    return FileUpload;                                                                                              //
                                                                                                                    //
  })() : void 0;                                                                                                    //
                                                                                                                    //
                                                                                                                    // 1261
  /*                                                                                                                // 1261
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name remove                                                                                                      //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                  //
  @param {Function} cb - Callback with one `error` argument                                                         //
  @summary Remove file(s) on cursor or find and remove file(s) if search is set                                     //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.remove = function(search, cb) {                                                         // 94
    var files, self;                                                                                                // 1271
    if (this.debug) {                                                                                               // 1271
      console.info("[FilesCollection] [remove(" + (JSON.stringify(search)) + ")]");                                 // 1271
    }                                                                                                               //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                     // 1271
    check(cb, Match.Optional(Function));                                                                            // 1271
    if (this.checkAccess()) {                                                                                       // 1275
      this.srch(search);                                                                                            // 1276
      if (Meteor.isClient) {                                                                                        // 1277
        Meteor.call(this.methodNames.MeteorFileUnlink, rcp(this), cb);                                              // 1278
      }                                                                                                             //
      if (Meteor.isServer) {                                                                                        // 1280
        files = this.collection.find(this.search);                                                                  // 1281
        if (files.count() > 0) {                                                                                    // 1282
          self = this;                                                                                              // 1283
          files.forEach(function(file) {                                                                            // 1283
            return self.unlink(file);                                                                               //
          });                                                                                                       //
        }                                                                                                           //
        this.collection.remove(this.search, cb);                                                                    // 1281
      }                                                                                                             //
    } else {                                                                                                        //
      cb && cb(new Meteor.Error(401, '[FilesCollection] [remove] Access denied!'));                                 // 1287
    }                                                                                                               //
    return this;                                                                                                    // 1288
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 1290
  /*                                                                                                                // 1290
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name update                                                                                                      //
  @see http://docs.meteor.com/#/full/update                                                                         //
  @summary link Mongo.Collection update method                                                                      //
  @returns {Mongo.Collection} Instance                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.update = function() {                                                                   // 94
    this.collection.update.apply(this.collection, arguments);                                                       // 1299
    return this.collection;                                                                                         // 1300
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 1302
  /*                                                                                                                // 1302
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name deny                                                                                                        //
  @name allow                                                                                                       //
  @param {Object} rules                                                                                             //
  @see http://docs.meteor.com/#/full/allow                                                                          //
  @summary link Mongo.Collection allow/deny methods                                                                 //
  @returns {Mongo.Collection} Instance                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.deny = Meteor.isServer ? function(rules) {                                              // 94
    this.collection.deny(rules);                                                                                    // 1313
    return this.collection;                                                                                         // 1314
  } : void 0;                                                                                                       //
                                                                                                                    //
  FilesCollection.prototype.allow = Meteor.isServer ? function(rules) {                                             // 94
    this.collection.allow(rules);                                                                                   // 1317
    return this.collection;                                                                                         // 1318
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1321
  /*                                                                                                                // 1321
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name denyClient                                                                                                  //
  @name allowClient                                                                                                 //
  @see http://docs.meteor.com/#/full/allow                                                                          //
  @summary Shorthands for Mongo.Collection allow/deny methods                                                       //
  @returns {Mongo.Collection} Instance                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.denyClient = Meteor.isServer ? function() {                                             // 94
    this.collection.deny({                                                                                          // 1331
      insert: function() {                                                                                          // 1332
        return true;                                                                                                //
      },                                                                                                            //
      update: function() {                                                                                          // 1332
        return true;                                                                                                //
      },                                                                                                            //
      remove: function() {                                                                                          // 1332
        return true;                                                                                                //
      }                                                                                                             //
    });                                                                                                             //
    return this.collection;                                                                                         // 1335
  } : void 0;                                                                                                       //
                                                                                                                    //
  FilesCollection.prototype.allowClient = Meteor.isServer ? function() {                                            // 94
    this.collection.allow({                                                                                         // 1338
      insert: function() {                                                                                          // 1339
        return true;                                                                                                //
      },                                                                                                            //
      update: function() {                                                                                          // 1339
        return true;                                                                                                //
      },                                                                                                            //
      remove: function() {                                                                                          // 1339
        return true;                                                                                                //
      }                                                                                                             //
    });                                                                                                             //
    return this.collection;                                                                                         // 1342
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1346
  /*                                                                                                                // 1346
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name unlink                                                                                                      //
  @param {Object} file - fileObj                                                                                    //
  @summary Unlink files and it's versions from FS                                                                   //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.unlink = Meteor.isServer ? function(file) {                                             // 94
    if (this.debug) {                                                                                               // 1355
      console.info("[FilesCollection] [unlink(" + file._id + ")]");                                                 // 1355
    }                                                                                                               //
    if (file.versions && !_.isEmpty(file.versions)) {                                                               // 1356
      _.each(file.versions, function(version) {                                                                     // 1357
        return bound(function() {                                                                                   //
          return fs.unlink(version.path, NOOP);                                                                     //
        });                                                                                                         //
      });                                                                                                           //
    }                                                                                                               //
    fs.unlink(file.path, NOOP);                                                                                     // 1355
    return this;                                                                                                    // 1360
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1363
  /*                                                                                                                // 1363
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name _404                                                                                                        //
  @summary Internal method, used to return 404 error                                                                //
  @returns {undefined}                                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype._404 = Meteor.isServer ? function(http) {                                               // 94
    var text;                                                                                                       // 1371
    if (this.debug) {                                                                                               // 1371
      console.warn("[FilesCollection] [download(" + http.request.originalUrl + ")] [_404] File not found");         // 1371
    }                                                                                                               //
    text = 'File Not Found :(';                                                                                     // 1371
    http.response.writeHead(404, {                                                                                  // 1371
      'Content-Length': text.length,                                                                                // 1374
      'Content-Type': 'text/plain'                                                                                  // 1374
    });                                                                                                             //
    http.response.end(text);                                                                                        // 1371
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1380
  /*                                                                                                                // 1380
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name download                                                                                                    //
  @param {Object|Files} self - Instance of FilesCollection                                                          //
  @summary Initiates the HTTP response                                                                              //
  @returns {undefined}                                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.download = Meteor.isServer ? function(http, version) {                                  // 94
    var _idres, fileRef, responseType, self;                                                                        // 1389
    if (version == null) {                                                                                          //
      version = 'original';                                                                                         //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 1389
      console.info("[FilesCollection] [download(" + http.request.originalUrl + ", " + version + ")]");              // 1389
    }                                                                                                               //
    responseType = '200';                                                                                           // 1389
    if (this.currentFile) {                                                                                         // 1391
      if (_.has(this.currentFile, 'versions') && _.has(this.currentFile.versions, version)) {                       // 1392
        fileRef = this.currentFile.versions[version];                                                               // 1393
      } else {                                                                                                      //
        fileRef = this.currentFile;                                                                                 // 1395
      }                                                                                                             //
    } else {                                                                                                        //
      fileRef = false;                                                                                              // 1397
    }                                                                                                               //
    if (!fileRef || !_.isObject(fileRef)) {                                                                         // 1399
      return this._404(http);                                                                                       // 1400
    } else if (this.currentFile) {                                                                                  //
      self = this;                                                                                                  // 1402
      if (this.interceptDownload && _.isFunction(this.interceptDownload)) {                                         // 1404
        _idres = this.interceptDownload(http, this.currentFile, version);                                           // 1405
        if (_idres === true) {                                                                                      // 1406
          return;                                                                                                   // 1407
        }                                                                                                           //
      }                                                                                                             //
      if (this.downloadCallback) {                                                                                  // 1409
        if (!this.downloadCallback.call(_.extend(http, this.getUser(http)), this.currentFile)) {                    // 1410
          return this._404(http);                                                                                   // 1411
        }                                                                                                           //
      }                                                                                                             //
      fs.stat(fileRef.path, function(statErr, stats) {                                                              // 1402
        return bound(function() {                                                                                   //
          var array, dispositionEncoding, dispositionName, dispositionType, end, partiral, ref, ref1, ref2, ref3, reqRange, start, stream, streamErrorHandler, take, text;
          if (statErr || !stats.isFile()) {                                                                         // 1414
            return self._404(http);                                                                                 // 1415
          }                                                                                                         //
          if (stats.size !== fileRef.size && !self.integrityCheck) {                                                // 1417
            fileRef.size = stats.size;                                                                              // 1417
          }                                                                                                         //
          if (stats.size !== fileRef.size && self.integrityCheck) {                                                 // 1418
            responseType = '400';                                                                                   // 1418
          }                                                                                                         //
          partiral = false;                                                                                         // 1414
          reqRange = false;                                                                                         // 1414
          if (http.params.query.download && http.params.query.download === 'true') {                                // 1422
            dispositionType = 'attachment; ';                                                                       // 1423
          } else {                                                                                                  //
            dispositionType = 'inline; ';                                                                           // 1425
          }                                                                                                         //
          dispositionName = "filename=\"" + (encodeURIComponent(self.currentFile.name)) + "\"; filename=*UTF-8\"" + (encodeURIComponent(self.currentFile.name)) + "\"; ";
          dispositionEncoding = 'charset=utf-8';                                                                    // 1414
          http.response.setHeader('Content-Type', fileRef.type);                                                    // 1414
          http.response.setHeader('Content-Disposition', dispositionType + dispositionName + dispositionEncoding);  // 1414
          http.response.setHeader('Accept-Ranges', 'bytes');                                                        // 1414
          if ((ref = self.currentFile) != null ? (ref1 = ref.updatedAt) != null ? ref1.toUTCString() : void 0 : void 0) {
            http.response.setHeader('Last-Modified', (ref2 = self.currentFile) != null ? (ref3 = ref2.updatedAt) != null ? ref3.toUTCString() : void 0 : void 0);
          }                                                                                                         //
          http.response.setHeader('Connection', 'keep-alive');                                                      // 1414
          if (http.request.headers.range) {                                                                         // 1436
            partiral = true;                                                                                        // 1437
            array = http.request.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);                                    // 1437
            start = parseInt(array[1]);                                                                             // 1437
            end = parseInt(array[2]);                                                                               // 1437
            if (isNaN(end)) {                                                                                       // 1441
              end = fileRef.size - 1;                                                                               // 1442
            }                                                                                                       //
            take = end - start;                                                                                     // 1437
          } else {                                                                                                  //
            start = 0;                                                                                              // 1445
            end = fileRef.size - 1;                                                                                 // 1445
            take = fileRef.size;                                                                                    // 1445
          }                                                                                                         //
          if (partiral || (http.params.query.play && http.params.query.play === 'true')) {                          // 1449
            reqRange = {                                                                                            // 1450
              start: start,                                                                                         // 1450
              end: end                                                                                              // 1450
            };                                                                                                      //
            if (isNaN(start) && !isNaN(end)) {                                                                      // 1451
              reqRange.start = end - take;                                                                          // 1452
              reqRange.end = end;                                                                                   // 1452
            }                                                                                                       //
            if (!isNaN(start) && isNaN(end)) {                                                                      // 1454
              reqRange.start = start;                                                                               // 1455
              reqRange.end = start + take;                                                                          // 1455
            }                                                                                                       //
            if ((start + take) >= fileRef.size) {                                                                   // 1458
              reqRange.end = fileRef.size - 1;                                                                      // 1458
            }                                                                                                       //
            http.response.setHeader('Pragma', 'private');                                                           // 1450
            http.response.setHeader('Expires', new Date(+(new Date) + 1000 * 32400).toUTCString());                 // 1450
            http.response.setHeader('Cache-Control', 'private, maxage=10800, s-maxage=32400');                      // 1450
            if (self.strict && (reqRange.start >= (fileRef.size - 1) || reqRange.end > (fileRef.size - 1))) {       // 1463
              responseType = '416';                                                                                 // 1464
            } else {                                                                                                //
              responseType = '206';                                                                                 // 1466
            }                                                                                                       //
          } else {                                                                                                  //
            http.response.setHeader('Cache-Control', self.cacheControl);                                            // 1468
            responseType = '200';                                                                                   // 1468
          }                                                                                                         //
          streamErrorHandler = function(error) {                                                                    // 1414
            http.response.writeHead(500);                                                                           // 1472
            return http.response.end(error.toString());                                                             //
          };                                                                                                        //
          switch (responseType) {                                                                                   // 1475
            case '400':                                                                                             // 1475
              if (self.debug) {                                                                                     // 1477
                console.warn("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [400] Content-Length mismatch!");
              }                                                                                                     //
              text = 'Content-Length mismatch!';                                                                    // 1477
              http.response.writeHead(400, {                                                                        // 1477
                'Content-Type': 'text/plain',                                                                       // 1480
                'Cache-Control': 'no-cache',                                                                        // 1480
                'Content-Length': text.length                                                                       // 1480
              });                                                                                                   //
              http.response.end(text);                                                                              // 1477
              break;                                                                                                // 1484
            case '404':                                                                                             // 1475
              return self._404(http);                                                                               // 1486
              break;                                                                                                // 1487
            case '416':                                                                                             // 1475
              if (self.debug) {                                                                                     // 1489
                console.info("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [416] Content-Range is not specified!");
              }                                                                                                     //
              http.response.writeHead(416, {                                                                        // 1489
                'Content-Range': "bytes */" + fileRef.size                                                          // 1491
              });                                                                                                   //
              http.response.end();                                                                                  // 1489
              break;                                                                                                // 1493
            case '200':                                                                                             // 1475
              if (self.debug) {                                                                                     // 1495
                console.info("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [200]");          // 1495
              }                                                                                                     //
              stream = fs.createReadStream(fileRef.path);                                                           // 1495
              stream.on('open', (function(_this) {                                                                  // 1495
                return function() {                                                                                 //
                  http.response.writeHead(200);                                                                     // 1498
                  if (self.throttle) {                                                                              // 1499
                    return stream.pipe(new Throttle({                                                               //
                      bps: self.throttle,                                                                           // 1500
                      chunksize: self.chunkSize                                                                     // 1500
                    })).pipe(http.response);                                                                        //
                  } else {                                                                                          //
                    return stream.pipe(http.response);                                                              //
                  }                                                                                                 //
                };                                                                                                  //
              })(this)).on('error', streamErrorHandler);                                                            //
              break;                                                                                                // 1505
            case '206':                                                                                             // 1475
              if (self.debug) {                                                                                     // 1507
                console.info("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [206]");          // 1507
              }                                                                                                     //
              http.response.setHeader('Content-Range', "bytes " + reqRange.start + "-" + reqRange.end + "/" + fileRef.size);
              http.response.setHeader('Trailer', 'expires');                                                        // 1507
              http.response.setHeader('Transfer-Encoding', 'chunked');                                              // 1507
              if (self.throttle) {                                                                                  // 1511
                stream = fs.createReadStream(fileRef.path, {                                                        // 1512
                  start: reqRange.start,                                                                            // 1512
                  end: reqRange.end                                                                                 // 1512
                });                                                                                                 //
                stream.on('open', function() {                                                                      // 1512
                  return http.response.writeHead(206);                                                              //
                }).on('error', streamErrorHandler).on('end', function() {                                           //
                  return http.response.end();                                                                       //
                }).pipe(new Throttle({                                                                              //
                  bps: self.throttle,                                                                               // 1516
                  chunksize: self.chunkSize                                                                         // 1516
                })).pipe(http.response);                                                                            //
              } else {                                                                                              //
                stream = fs.createReadStream(fileRef.path, {                                                        // 1519
                  start: reqRange.start,                                                                            // 1519
                  end: reqRange.end                                                                                 // 1519
                });                                                                                                 //
                stream.on('open', function() {                                                                      // 1519
                  return http.response.writeHead(206);                                                              //
                }).on('error', streamErrorHandler).on('end', function() {                                           //
                  return http.response.end();                                                                       //
                }).pipe(http.response);                                                                             //
              }                                                                                                     //
              break;                                                                                                // 1524
          }                                                                                                         // 1475
        });                                                                                                         //
      });                                                                                                           //
    } else {                                                                                                        //
      return this._404(http);                                                                                       // 1527
    }                                                                                                               //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1530
  /*                                                                                                                // 1530
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name link                                                                                                        //
  @param {Object}   fileRef - File reference object                                                                 //
  @param {String}   version - [Optional] Version of file you would like to request                                  //
  @summary Returns downloadable URL                                                                                 //
  @returns {String} Empty string returned in case if file not found in DB                                           //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.link = function(fileRef, version) {                                                     // 94
    if (version == null) {                                                                                          //
      version = 'original';                                                                                         //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 1540
      console.info('[FilesCollection] [link()]');                                                                   // 1540
    }                                                                                                               //
    if (_.isString(fileRef)) {                                                                                      // 1541
      version = fileRef;                                                                                            // 1542
      fileRef = null;                                                                                               // 1542
    }                                                                                                               //
    if (!fileRef && !this.currentFile) {                                                                            // 1544
      return '';                                                                                                    // 1544
    }                                                                                                               //
    return formatFleURL(fileRef || this.currentFile, version);                                                      // 1545
  };                                                                                                                //
                                                                                                                    //
  return FilesCollection;                                                                                           //
                                                                                                                    //
})();                                                                                                               //
                                                                                                                    //
                                                                                                                    // 1547
/*                                                                                                                  // 1547
@locus Anywhere                                                                                                     //
@private                                                                                                            //
@name formatFleURL                                                                                                  //
@param {Object} fileRef - File reference object                                                                     //
@param {String} version - [Optional] Version of file you would like build URL for                                   //
@param {Boolean}  pub   - [Optional] is file located in publicity available folder?                                 //
@summary Returns formatted URL for file                                                                             //
@returns {String} Downloadable link                                                                                 //
 */                                                                                                                 //
                                                                                                                    //
formatFleURL = function(fileRef, version) {                                                                         // 1
  var ext, ref, root;                                                                                               // 1558
  if (version == null) {                                                                                            //
    version = 'original';                                                                                           //
  }                                                                                                                 //
  root = __meteor_runtime_config__.ROOT_URL.replace(/\/+$/, '');                                                    // 1558
  if ((fileRef != null ? (ref = fileRef.extension) != null ? ref.length : void 0 : void 0) > 0) {                   // 1560
    ext = '.' + fileRef.extension;                                                                                  // 1561
  } else {                                                                                                          //
    ext = '';                                                                                                       // 1563
  }                                                                                                                 //
  if (fileRef["public"] === true) {                                                                                 // 1565
    return root + (version === 'original' ? fileRef._downloadRoute + "/" + fileRef._id + ext : fileRef._downloadRoute + "/" + version + "-" + fileRef._id + ext);
  } else {                                                                                                          //
    return root + (fileRef._downloadRoute + "/" + fileRef._collectionName + "/" + fileRef._id + "/" + version + "/" + fileRef._id + ext);
  }                                                                                                                 //
};                                                                                                                  // 1557
                                                                                                                    //
if (Meteor.isClient) {                                                                                              // 1570
                                                                                                                    // 1571
  /*                                                                                                                // 1571
  @locus Client                                                                                                     //
  @TemplateHelper                                                                                                   //
  @name fileURL                                                                                                     //
  @param {Object} fileRef - File reference object                                                                   //
  @param {String} version - [Optional] Version of file you would like to request                                    //
  @summary Get download URL for file by fileRef, even without subscription                                          //
  @example {{fileURL fileRef}}                                                                                      //
  @returns {String}                                                                                                 //
   */                                                                                                               //
  Template.registerHelper('fileURL', function(fileRef, version) {                                                   // 1571
    if (!fileRef || !_.isObject(fileRef)) {                                                                         // 1582
      return void 0;                                                                                                // 1582
    }                                                                                                               //
    version = !version || !_.isString(version) ? 'original' : version;                                              // 1582
    if (fileRef._id) {                                                                                              // 1584
      return formatFleURL(fileRef, version);                                                                        // 1585
    } else {                                                                                                        //
      return '';                                                                                                    // 1587
    }                                                                                                               //
  });                                                                                                               //
}                                                                                                                   //
                                                                                                                    //
Meteor.Files = FilesCollection;                                                                                     // 1
                                                                                                                    //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['ostrio:files'] = {}, {
  FilesCollection: FilesCollection
});

})();

//# sourceMappingURL=ostrio_files.js.map
