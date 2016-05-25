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
@param config.permissions    {Number}  - [Server] Permissions which will be set to uploaded files (octal), like: `511` or `0o755`. Default: 0644
@param config.parentDirPermissions {Number}  - [Server] Permissions which will be set to parent directory of uploaded files (octal), like: `611` or `0o777`. Default: 0755
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
  var FileUpload, UploadInstance;                                                                                   // 95
                                                                                                                    //
  FilesCollection.prototype.__proto__ = (function() {                                                               // 95
    if (Meteor.isServer) {                                                                                          // 95
      return events.EventEmitter.prototype;                                                                         //
    } else {                                                                                                        //
      return EventEmitter.prototype;                                                                                //
    }                                                                                                               //
  })();                                                                                                             //
                                                                                                                    //
  function FilesCollection(config) {                                                                                // 96
    var _methods, cookie, self;                                                                                     // 97
    if (Meteor.isServer) {                                                                                          // 97
      events.EventEmitter.call(this);                                                                               // 98
    } else {                                                                                                        //
      EventEmitter.call(this);                                                                                      // 100
    }                                                                                                               //
    if (config) {                                                                                                   // 101
      this.storagePath = config.storagePath, this.collectionName = config.collectionName, this.downloadRoute = config.downloadRoute, this.schema = config.schema, this.chunkSize = config.chunkSize, this.namingFunction = config.namingFunction, this.debug = config.debug, this.onbeforeunloadMessage = config.onbeforeunloadMessage, this.permissions = config.permissions, this.parentDirPermissions = config.parentDirPermissions, this.allowClientCode = config.allowClientCode, this.onBeforeUpload = config.onBeforeUpload, this.integrityCheck = config.integrityCheck, this["protected"] = config["protected"], this["public"] = config["public"], this.strict = config.strict, this.downloadCallback = config.downloadCallback, this.cacheControl = config.cacheControl, this.throttle = config.throttle, this.onAfterUpload = config.onAfterUpload, this.interceptDownload = config.interceptDownload, this.onBeforeRemove = config.onBeforeRemove;
    }                                                                                                               //
    self = this;                                                                                                    // 97
    cookie = new Cookies();                                                                                         // 97
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
    this.chunkSize = Math.floor(this.chunkSize / 8) * 8;                                                            // 97
    if (this["public"] && !this.downloadRoute) {                                                                    // 110
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: \"downloadRoute\" must be explicitly provided on \"public\" collections! Note: \"downloadRoute\" must be equal on be inside of your web/proxy-server (relative) root.");
    }                                                                                                               //
    if (this.downloadRoute == null) {                                                                               //
      this.downloadRoute = '/cdn/storage';                                                                          //
    }                                                                                                               //
    this.downloadRoute = this.downloadRoute.replace(/\/$/, '');                                                     // 97
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
    if (Meteor.isClient) {                                                                                          // 120
      if (this.onbeforeunloadMessage == null) {                                                                     //
        this.onbeforeunloadMessage = 'Upload in a progress... Do you want to abort?';                               //
      }                                                                                                             //
      delete this.strict;                                                                                           // 121
      delete this.throttle;                                                                                         // 121
      delete this.storagePath;                                                                                      // 121
      delete this.permissions;                                                                                      // 121
      delete this.parentDirPermissions;                                                                             // 121
      delete this.cacheControl;                                                                                     // 121
      delete this.onAfterUpload;                                                                                    // 121
      delete this.integrityCheck;                                                                                   // 121
      delete this.downloadCallback;                                                                                 // 121
      delete this.interceptDownload;                                                                                // 121
      delete this.onBeforeRemove;                                                                                   // 121
      if (this["protected"]) {                                                                                      // 134
        if (!cookie.has('meteor_login_token') && Meteor._localStorage.getItem('Meteor.loginToken')) {               // 135
          cookie.set('meteor_login_token', Meteor._localStorage.getItem('Meteor.loginToken'), null, '/');           // 136
        }                                                                                                           //
      }                                                                                                             //
      check(this.onbeforeunloadMessage, Match.OneOf(String, Function));                                             // 121
    } else {                                                                                                        //
      if (this._writableStreams == null) {                                                                          //
        this._writableStreams = {};                                                                                 //
      }                                                                                                             //
      if (this.strict == null) {                                                                                    //
        this.strict = true;                                                                                         //
      }                                                                                                             //
      if (this.throttle == null) {                                                                                  //
        this.throttle = false;                                                                                      //
      }                                                                                                             //
      if (this.permissions == null) {                                                                               //
        this.permissions = parseInt('644', 8);                                                                      //
      }                                                                                                             //
      if (this.parentDirPermissions == null) {                                                                      //
        this.parentDirPermissions = parseInt('755', 8);                                                             //
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
      if (this["public"] && !this.storagePath) {                                                                    // 150
        throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "] \"storagePath\" must be set on \"public\" collections! Note: \"storagePath\" must be equal on be inside of your web/proxy-server (absolute) root.");
      }                                                                                                             //
      if (this.storagePath == null) {                                                                               //
        this.storagePath = "assets/app/uploads/" + this.collectionName;                                             //
      }                                                                                                             //
      this.storagePath = this.storagePath.replace(/\/$/, '');                                                       // 140
      this.storagePath = nodePath.normalize(this.storagePath);                                                      // 140
      fs.mkdirs(this.storagePath, {                                                                                 // 140
        mode: this.parentDirPermissions                                                                             // 156
      }, function(error) {                                                                                          //
        if (error) {                                                                                                // 157
          throw new Meteor.Error(401, "[FilesCollection." + self.collectionName + "] Path " + self.storagePath + " is not writable!", error);
        }                                                                                                           //
      });                                                                                                           //
      check(this.strict, Boolean);                                                                                  // 140
      check(this.throttle, Match.OneOf(false, Number));                                                             // 140
      check(this.permissions, Number);                                                                              // 140
      check(this.storagePath, String);                                                                              // 140
      check(this.cacheControl, String);                                                                             // 140
      check(this.onAfterUpload, Match.OneOf(false, Function));                                                      // 140
      check(this.integrityCheck, Boolean);                                                                          // 140
      check(this.onBeforeRemove, Match.OneOf(false, Function));                                                     // 140
      check(this.downloadCallback, Match.OneOf(false, Function));                                                   // 140
      check(this.interceptDownload, Match.OneOf(false, Function));                                                  // 140
    }                                                                                                               //
    if (!this.schema) {                                                                                             // 172
      this.schema = {                                                                                               // 173
        size: {                                                                                                     // 174
          type: Number                                                                                              // 174
        },                                                                                                          //
        name: {                                                                                                     // 174
          type: String                                                                                              // 175
        },                                                                                                          //
        type: {                                                                                                     // 174
          type: String                                                                                              // 176
        },                                                                                                          //
        path: {                                                                                                     // 174
          type: String                                                                                              // 177
        },                                                                                                          //
        isVideo: {                                                                                                  // 174
          type: Boolean                                                                                             // 178
        },                                                                                                          //
        isAudio: {                                                                                                  // 174
          type: Boolean                                                                                             // 179
        },                                                                                                          //
        isImage: {                                                                                                  // 174
          type: Boolean                                                                                             // 180
        },                                                                                                          //
        isText: {                                                                                                   // 174
          type: Boolean                                                                                             // 181
        },                                                                                                          //
        isJSON: {                                                                                                   // 174
          type: Boolean                                                                                             // 182
        },                                                                                                          //
        _prefix: {                                                                                                  // 174
          type: String                                                                                              // 183
        },                                                                                                          //
        extension: {                                                                                                // 174
          type: String,                                                                                             // 185
          optional: true                                                                                            // 185
        },                                                                                                          //
        _storagePath: {                                                                                             // 174
          type: String                                                                                              // 187
        },                                                                                                          //
        _downloadRoute: {                                                                                           // 174
          type: String                                                                                              // 188
        },                                                                                                          //
        _collectionName: {                                                                                          // 174
          type: String                                                                                              // 189
        },                                                                                                          //
        "public": {                                                                                                 // 174
          type: Boolean,                                                                                            // 191
          optional: true                                                                                            // 191
        },                                                                                                          //
        meta: {                                                                                                     // 174
          type: Object,                                                                                             // 194
          blackbox: true,                                                                                           // 194
          optional: true                                                                                            // 194
        },                                                                                                          //
        userId: {                                                                                                   // 174
          type: String,                                                                                             // 198
          optional: true                                                                                            // 198
        },                                                                                                          //
        updatedAt: {                                                                                                // 174
          type: Date,                                                                                               // 201
          autoValue: function() {                                                                                   // 201
            return new Date();                                                                                      //
          }                                                                                                         //
        },                                                                                                          //
        versions: {                                                                                                 // 174
          type: Object,                                                                                             // 204
          blackbox: true                                                                                            // 204
        }                                                                                                           //
      };                                                                                                            //
    }                                                                                                               //
    check(this.debug, Boolean);                                                                                     // 97
    check(this.schema, Object);                                                                                     // 97
    check(this["public"], Boolean);                                                                                 // 97
    check(this["protected"], Match.OneOf(Boolean, Function));                                                       // 97
    check(this.chunkSize, Number);                                                                                  // 97
    check(this.downloadRoute, String);                                                                              // 97
    check(this.collectionName, String);                                                                             // 97
    check(this.namingFunction, Function);                                                                           // 97
    check(this.onBeforeUpload, Match.OneOf(false, Function));                                                       // 97
    check(this.allowClientCode, Boolean);                                                                           // 97
    if (this["public"] && this["protected"]) {                                                                      // 218
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: Files can not be public and protected at the same time!");
    }                                                                                                               //
    this.cursor = null;                                                                                             // 97
    this.search = {};                                                                                               // 97
    this.collection = new Mongo.Collection(this.collectionName);                                                    // 97
    this.currentFile = null;                                                                                        // 97
    this._prefix = SHA256(this.collectionName + this.downloadRoute);                                                // 97
    _insts[this._prefix] = this;                                                                                    // 97
    this.checkAccess = function(http) {                                                                             // 97
      var rc, result, text, user, userFuncs, userId;                                                                // 229
      if (self["protected"]) {                                                                                      // 229
        user = false;                                                                                               // 230
        userFuncs = self.getUser(http);                                                                             // 230
        user = userFuncs.user, userId = userFuncs.userId;                                                           // 230
        user = user();                                                                                              // 230
        if (_.isFunction(self["protected"])) {                                                                      // 235
          result = http ? self["protected"].call(_.extend(http, userFuncs), self.currentFile || null) : self["protected"].call(userFuncs, self.currentFile || null);
        } else {                                                                                                    //
          result = !!user;                                                                                          // 238
        }                                                                                                           //
        if ((http && result === true) || !http) {                                                                   // 240
          return true;                                                                                              // 241
        } else {                                                                                                    //
          rc = _.isNumber(result) ? result : 401;                                                                   // 243
          if (self.debug) {                                                                                         // 244
            console.warn('[FilesCollection.checkAccess] WARN: Access denied!');                                     // 244
          }                                                                                                         //
          if (http) {                                                                                               // 245
            text = 'Access denied!';                                                                                // 246
            http.response.writeHead(rc, {                                                                           // 246
              'Content-Length': text.length,                                                                        // 248
              'Content-Type': 'text/plain'                                                                          // 248
            });                                                                                                     //
            http.response.end(text);                                                                                // 246
          }                                                                                                         //
          return false;                                                                                             // 251
        }                                                                                                           //
      } else {                                                                                                      //
        return true;                                                                                                // 253
      }                                                                                                             //
    };                                                                                                              //
    this.methodNames = {                                                                                            // 97
      MeteorFileAbort: "MeteorFileAbort" + this._prefix,                                                            // 256
      MeteorFileWrite: "MeteorFileWrite" + this._prefix,                                                            // 256
      MeteorFileUnlink: "MeteorFileUnlink" + this._prefix                                                           // 256
    };                                                                                                              //
    if (Meteor.isServer) {                                                                                          // 260
      this.on('handleUpload', this.handleUpload);                                                                   // 261
      this.on('finishUpload', this.finishUpload);                                                                   // 261
      WebApp.connectHandlers.use(function(request, response, next) {                                                // 261
        return bound(function() {                                                                                   //
          var _file, body, http, params, uri, uris, version;                                                        // 265
          if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName + "/__upload")) {   // 265
            if (request.method === 'POST') {                                                                        // 266
              body = '';                                                                                            // 267
              request.on('data', function(data) {                                                                   // 267
                return bound(function() {                                                                           //
                  body += data;                                                                                     // 269
                });                                                                                                 //
              });                                                                                                   //
              request.on('end', function() {                                                                        // 267
                return bound(function() {                                                                           //
                  var e, opts, ref, result, user;                                                                   // 272
                  try {                                                                                             // 272
                    opts = JSON.parse(body);                                                                        // 273
                    user = self.getUser(http);                                                                      // 273
                    ref = self.prepareUpload(opts, user.userId, 'HTTP'), result = ref.result, opts = ref.opts;      // 273
                    if (opts.eof) {                                                                                 // 277
                      try {                                                                                         // 278
                        Meteor.wrapAsync(self.handleUpload.bind(self, result, opts))();                             // 279
                        response.writeHead(200);                                                                    // 279
                        response.end(JSON.stringify(result));                                                       // 279
                        return;                                                                                     // 282
                      } catch (_error) {                                                                            //
                        e = _error;                                                                                 // 284
                        console.warn("[FilesCollection] [Write Method] [HTTP] Exception:", e);                      // 284
                        response.writeHead(500);                                                                    // 284
                        response.end(JSON.stringify({                                                               // 284
                          error: 2                                                                                  // 286
                        }));                                                                                        //
                      }                                                                                             //
                    } else {                                                                                        //
                      self.emit('handleUpload', result, opts, NOOP);                                                // 288
                    }                                                                                               //
                    response.writeHead(200);                                                                        // 273
                    response.end(JSON.stringify({                                                                   // 273
                      success: true                                                                                 // 291
                    }));                                                                                            //
                  } catch (_error) {                                                                                //
                    e = _error;                                                                                     // 293
                    console.warn("[FilesCollection] [Write Method] [HTTP] Exception:", e);                          // 293
                    response.writeHead(500);                                                                        // 293
                    response.end(JSON.stringify({                                                                   // 293
                      error: e                                                                                      // 295
                    }));                                                                                            //
                  }                                                                                                 //
                });                                                                                                 //
              });                                                                                                   //
            } else {                                                                                                //
              next();                                                                                               // 298
            }                                                                                                       //
            return;                                                                                                 // 299
          }                                                                                                         //
          if (!self["public"]) {                                                                                    // 301
            if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName)) {               // 302
              uri = request._parsedUrl.path.replace(self.downloadRoute + "/" + self.collectionName, '');            // 303
              if (uri.indexOf('/') === 0) {                                                                         // 304
                uri = uri.substring(1);                                                                             // 305
              }                                                                                                     //
              uris = uri.split('/');                                                                                // 303
              if (uris.length === 3) {                                                                              // 308
                params = {                                                                                          // 309
                  query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                  _id: uris[0],                                                                                     // 310
                  version: uris[1],                                                                                 // 310
                  name: uris[2]                                                                                     // 310
                };                                                                                                  //
                http = {                                                                                            // 309
                  request: request,                                                                                 // 314
                  response: response,                                                                               // 314
                  params: params                                                                                    // 314
                };                                                                                                  //
                if (self.checkAccess(http)) {                                                                       // 315
                  self.findOne(uris[0]).download.call(self, http, uris[1]);                                         // 315
                }                                                                                                   //
              } else {                                                                                              //
                next();                                                                                             // 317
              }                                                                                                     //
            } else {                                                                                                //
              next();                                                                                               // 319
            }                                                                                                       //
          } else {                                                                                                  //
            if (!!~request._parsedUrl.path.indexOf("" + self.downloadRoute)) {                                      // 321
              uri = request._parsedUrl.path.replace("" + self.downloadRoute, '');                                   // 322
              if (uri.indexOf('/') === 0) {                                                                         // 323
                uri = uri.substring(1);                                                                             // 324
              }                                                                                                     //
              uris = uri.split('/');                                                                                // 322
              _file = uris[uris.length - 1];                                                                        // 322
              if (_file) {                                                                                          // 328
                if (!!~_file.indexOf('-')) {                                                                        // 329
                  version = _file.split('-')[0];                                                                    // 330
                  _file = _file.split('-')[1].split('?')[0];                                                        // 330
                } else {                                                                                            //
                  version = 'original';                                                                             // 333
                  _file = _file.split('?')[0];                                                                      // 333
                }                                                                                                   //
                params = {                                                                                          // 329
                  query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                  file: _file,                                                                                      // 337
                  _id: _file.split('.')[0],                                                                         // 337
                  version: version,                                                                                 // 337
                  name: _file                                                                                       // 337
                };                                                                                                  //
                http = {                                                                                            // 329
                  request: request,                                                                                 // 342
                  response: response,                                                                               // 342
                  params: params                                                                                    // 342
                };                                                                                                  //
                self.findOne(params._id).download.call(self, http, version);                                        // 329
              } else {                                                                                              //
                next();                                                                                             // 345
              }                                                                                                     //
            } else {                                                                                                //
              next();                                                                                               // 347
            }                                                                                                       //
          }                                                                                                         //
        });                                                                                                         //
      });                                                                                                           //
      _methods = {};                                                                                                // 261
      _methods[self.methodNames.MeteorFileUnlink] = function(inst) {                                                // 261
        var __inst, __instData, user, userFuncs;                                                                    // 352
        check(inst, Object);                                                                                        // 352
        if (self.debug) {                                                                                           // 353
          console.info('[FilesCollection] [Unlink Method]');                                                        // 353
        }                                                                                                           //
        if (self.allowClientCode) {                                                                                 // 355
          __instData = cp(_insts[inst._prefix], inst);                                                              // 356
          if (self.onBeforeRemove && _.isFunction(self.onBeforeRemove)) {                                           // 357
            user = false;                                                                                           // 358
            userFuncs = {                                                                                           // 358
              userId: this.userId,                                                                                  // 359
              user: function() {                                                                                    // 359
                if (Meteor.users) {                                                                                 // 361
                  return Meteor.users.findOne(this.userId);                                                         //
                } else {                                                                                            //
                  return void 0;                                                                                    //
                }                                                                                                   //
              }                                                                                                     //
            };                                                                                                      //
            __inst = self.find.call(__instData, inst.search);                                                       // 358
            if (!self.onBeforeRemove.call(userFuncs, __inst.cursor || null)) {                                      // 365
              throw new Meteor.Error(403, '[FilesCollection] [remove] Not permitted!');                             // 366
            }                                                                                                       //
          }                                                                                                         //
          self.remove.call(__instData, inst.search);                                                                // 356
          return true;                                                                                              // 369
        } else {                                                                                                    //
          throw new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!');           // 371
        }                                                                                                           //
      };                                                                                                            //
      _methods[self.methodNames.MeteorFileWrite] = function(opts) {                                                 // 261
        var e, ref, result;                                                                                         // 375
        this.unblock();                                                                                             // 375
        check(opts, {                                                                                               // 375
          eof: Match.Optional(Boolean),                                                                             // 376
          file: Object,                                                                                             // 376
          fileId: String,                                                                                           // 376
          binData: Match.Optional(String),                                                                          // 376
          chunkId: Match.Optional(Number),                                                                          // 376
          chunkSize: Number,                                                                                        // 376
          fileLength: Number                                                                                        // 376
        });                                                                                                         //
        ref = self.prepareUpload(opts, this.userId, 'DDP'), result = ref.result, opts = ref.opts;                   // 375
        if (opts.eof) {                                                                                             // 388
          try {                                                                                                     // 389
            return Meteor.wrapAsync(self.handleUpload.bind(self, result, opts))();                                  // 390
          } catch (_error) {                                                                                        //
            e = _error;                                                                                             // 392
            if (self.debug) {                                                                                       // 392
              console.warn("[FilesCollection] [Write Method] [DDP] Exception:", e);                                 // 392
            }                                                                                                       //
            throw e;                                                                                                // 393
          }                                                                                                         //
        } else {                                                                                                    //
          self.emit('handleUpload', result, opts, NOOP);                                                            // 395
        }                                                                                                           //
        return true;                                                                                                // 396
      };                                                                                                            //
      _methods[self.methodNames.MeteorFileAbort] = function(opts) {                                                 // 261
        var ext, path, ref;                                                                                         // 399
        check(opts, {                                                                                               // 399
          fileId: String,                                                                                           // 399
          fileData: Object,                                                                                         // 399
          fileLength: Number                                                                                        // 399
        });                                                                                                         //
        ext = "." + opts.fileData.ext;                                                                              // 399
        path = self.storagePath + "/" + opts.fileId + ext;                                                          // 399
        if (self.debug) {                                                                                           // 408
          console.info("[FilesCollection] [Abort Method]: For " + path);                                            // 408
        }                                                                                                           //
        if ((ref = self._writableStreams) != null ? ref[opts.fileId] : void 0) {                                    // 409
          self._writableStreams[opts.fileId].stream.end();                                                          // 410
          delete self._writableStreams[opts.fileId];                                                                // 410
          self.remove({                                                                                             // 410
            _id: opts.fileId                                                                                        // 412
          });                                                                                                       //
          self.unlink({                                                                                             // 410
            _id: opts.fileId,                                                                                       // 413
            path: path                                                                                              // 413
          });                                                                                                       //
        }                                                                                                           //
        return true;                                                                                                // 415
      };                                                                                                            //
      Meteor.methods(_methods);                                                                                     // 261
    }                                                                                                               //
  }                                                                                                                 //
                                                                                                                    //
                                                                                                                    // 418
  /*                                                                                                                // 418
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name prepareUpload                                                                                               //
  @summary Internal method. Used to optimize received data and check upload permission                              //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.prepareUpload = Meteor.isServer ? function(opts, userId, transport) {                   // 95
    var extension, extensionWithDot, fileName, isUploadAllowed, ref, result;                                        // 426
    if (opts.eof == null) {                                                                                         //
      opts.eof = false;                                                                                             //
    }                                                                                                               //
    if (opts.meta == null) {                                                                                        //
      opts.meta = {};                                                                                               //
    }                                                                                                               //
    if (opts.binData == null) {                                                                                     //
      opts.binData = 'EOF';                                                                                         //
    }                                                                                                               //
    if (opts.chunkId == null) {                                                                                     //
      opts.chunkId = -1;                                                                                            //
    }                                                                                                               //
    fileName = this.getFileName(opts.file);                                                                         // 426
    ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                // 426
    result = opts.file;                                                                                             // 426
    result.path = this.storagePath + "/" + opts.fileId + extensionWithDot;                                          // 426
    result.name = fileName;                                                                                         // 426
    result.meta = opts.file.meta;                                                                                   // 426
    result.extension = extension;                                                                                   // 426
    result = this.dataToSchema(result);                                                                             // 426
    result._id = opts.fileId;                                                                                       // 426
    if (userId) {                                                                                                   // 441
      result.userId = userId;                                                                                       // 441
    }                                                                                                               //
    if (this.debug) {                                                                                               // 443
      console.info("[FilesCollection] [Write Method] [" + transport + "] Got #" + opts.chunkId + "/" + opts.fileLength + " chunks, dst: " + (opts.file.name || opts.file.fileName));
    }                                                                                                               //
    if (this.onBeforeUpload && _.isFunction(this.onBeforeUpload)) {                                                 // 445
      isUploadAllowed = this.onBeforeUpload.call(_.extend({                                                         // 446
        file: opts.file                                                                                             // 446
      }, {                                                                                                          //
        userId: result.userId,                                                                                      // 448
        user: function() {                                                                                          // 448
          if (Meteor.users) {                                                                                       // 450
            return Meteor.users.findOne(result.userId);                                                             //
          } else {                                                                                                  //
            return void 0;                                                                                          //
          }                                                                                                         //
        },                                                                                                          //
        chunkId: opts.chunkId,                                                                                      // 448
        eof: opts.eof                                                                                               // 448
      }), result);                                                                                                  //
      if (isUploadAllowed !== true) {                                                                               // 455
        throw new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : '@onBeforeUpload() returned false');
      }                                                                                                             //
    }                                                                                                               //
    return {                                                                                                        // 458
      result: result,                                                                                               // 458
      opts: opts                                                                                                    // 458
    };                                                                                                              //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 461
  /*                                                                                                                // 461
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name finishUpload                                                                                                //
  @summary Internal method. Finish upload, close Writable stream, add recored to MongoDB and flush used memory      //
  @returns {undefined}                                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.finishUpload = Meteor.isServer ? function(result, opts, cb) {                           // 95
    var self;                                                                                                       // 469
    fs.chmod(result.path, this.permissions, NOOP);                                                                  // 469
    self = this;                                                                                                    // 469
    result.type = this.getMimeType(opts.file);                                                                      // 469
    result["public"] = this["public"];                                                                              // 469
    this.collection.insert(_.clone(result), function(error, _id) {                                                  // 469
      if (error) {                                                                                                  // 475
        return cb(new Meteor.Error(500, error));                                                                    //
      } else {                                                                                                      //
        result._id = _id;                                                                                           // 478
        if (self.debug) {                                                                                           // 479
          console.info("[FilesCollection] [Write Method] [finishUpload] -> " + result.path);                        // 479
        }                                                                                                           //
        self.onAfterUpload && self.onAfterUpload.call(self, result);                                                // 478
        self.emit('afterUpload', result);                                                                           // 478
        return cb(null, result);                                                                                    //
      }                                                                                                             //
    });                                                                                                             //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 486
  /*                                                                                                                // 486
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name handleUpload                                                                                                //
  @summary Internal method to handle upload process, pipe incoming data to Writable stream                          //
  @returns {undefined}                                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.handleUpload = Meteor.isServer ? function(result, opts, cb) {                           // 95
    var _dKeys, _hlEnd, base, binary, e, name, ref, self, start;                                                    // 494
    self = this;                                                                                                    // 494
    if (opts.eof) {                                                                                                 // 495
      binary = opts.binData;                                                                                        // 496
    } else {                                                                                                        //
      binary = new Buffer(opts.binData, 'base64');                                                                  // 498
    }                                                                                                               //
    try {                                                                                                           // 500
      if (opts.eof) {                                                                                               // 501
        _hlEnd = function() {                                                                                       // 502
          self._writableStreams[result._id].stream.end();                                                           // 503
          delete self._writableStreams[result._id];                                                                 // 503
          self.emit('finishUpload', result, opts, cb);                                                              // 503
        };                                                                                                          //
        if ((ref = this._writableStreams[result._id].delayed) != null ? ref[opts.fileLength] : void 0) {            // 508
          this._writableStreams[result._id].stream.write(this._writableStreams[result._id].delayed[opts.fileLength], function() {
            return bound(function() {                                                                               //
              delete self._writableStreams[result._id].delayed[opts.fileLength];                                    // 510
              _hlEnd();                                                                                             // 510
            });                                                                                                     //
          });                                                                                                       //
        } else {                                                                                                    //
          _hlEnd();                                                                                                 // 514
        }                                                                                                           //
      } else if (opts.chunkId > 0) {                                                                                //
        if ((base = this._writableStreams)[name = result._id] == null) {                                            //
          base[name] = {                                                                                            //
            stream: fs.createWriteStream(result.path, {                                                             // 518
              flags: 'a',                                                                                           // 518
              mode: this.permissions                                                                                // 518
            }),                                                                                                     //
            delayed: {}                                                                                             // 518
          };                                                                                                        //
        }                                                                                                           //
        _dKeys = Object.keys(this._writableStreams[result._id].delayed);                                            // 517
        if (_dKeys.length) {                                                                                        // 522
          _.each(this._writableStreams[result._id].delayed, function(delayed, num) {                                // 523
            return bound(function() {                                                                               //
              if (num < opts.chunkId) {                                                                             // 524
                self._writableStreams[result._id].stream.write(delayed);                                            // 525
                delete self._writableStreams[result._id].delayed[num];                                              // 525
              }                                                                                                     //
            });                                                                                                     //
          });                                                                                                       //
        }                                                                                                           //
        start = opts.chunkSize * (opts.chunkId - 1);                                                                // 517
        if (this._writableStreams[result._id].stream.bytesWritten < start) {                                        // 530
          this._writableStreams[result._id].delayed[opts.chunkId] = binary;                                         // 531
        } else {                                                                                                    //
          this._writableStreams[result._id].stream.write(binary);                                                   // 533
        }                                                                                                           //
      }                                                                                                             //
    } catch (_error) {                                                                                              //
      e = _error;                                                                                                   // 535
      cb(e);                                                                                                        // 535
    }                                                                                                               //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 539
  /*                                                                                                                // 539
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getMimeType                                                                                                 //
  @param {Object} fileData - File Object                                                                            //
  @summary Returns file's mime-type                                                                                 //
  @returns {String}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getMimeType = function(fileData) {                                                      // 95
    var br, buf, error, ext, fd, mime, ref;                                                                         // 548
    check(fileData, Object);                                                                                        // 548
    if (fileData != null ? fileData.type : void 0) {                                                                // 549
      mime = fileData.type;                                                                                         // 549
    }                                                                                                               //
    if (Meteor.isServer && fileData.path && (!mime || !_.isString(mime))) {                                         // 550
      try {                                                                                                         // 551
        buf = new Buffer(262);                                                                                      // 552
        fd = fs.openSync(fileData.path, 'r');                                                                       // 552
        br = fs.readSync(fd, buf, 0, 262, 0);                                                                       // 552
        fs.close(fd, NOOP);                                                                                         // 552
        if (br < 262) {                                                                                             // 556
          buf = buf.slice(0, br);                                                                                   // 556
        }                                                                                                           //
        ref = fileType(buf), mime = ref.mime, ext = ref.ext;                                                        // 552
      } catch (_error) {                                                                                            //
        error = _error;                                                                                             // 558
      }                                                                                                             //
    }                                                                                                               //
    if (!mime || !_.isString(mime)) {                                                                               // 559
      mime = 'application/octet-stream';                                                                            // 560
    }                                                                                                               //
    return mime;                                                                                                    // 561
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 563
  /*                                                                                                                // 563
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getFileName                                                                                                 //
  @param {Object} fileData - File Object                                                                            //
  @summary Returns file's name                                                                                      //
  @returns {String}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getFileName = function(fileData) {                                                      // 95
    var cleanName, fileName;                                                                                        // 572
    fileName = fileData.name || fileData.fileName;                                                                  // 572
    if (_.isString(fileName) && fileName.length > 0) {                                                              // 573
      cleanName = function(str) {                                                                                   // 574
        return str.replace(/\.\./g, '').replace(/\//g, '');                                                         //
      };                                                                                                            //
      return cleanName(fileData.name || fileData.fileName);                                                         // 575
    } else {                                                                                                        //
      return '';                                                                                                    // 577
    }                                                                                                               //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 579
  /*                                                                                                                // 579
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getUser                                                                                                     //
  @summary Returns object with `userId` and `user()` method which return user's object                              //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getUser = function(http) {                                                              // 95
    var cookie, result, user;                                                                                       // 587
    result = {                                                                                                      // 587
      user: function() {                                                                                            // 588
        return null;                                                                                                // 588
      },                                                                                                            //
      userId: null                                                                                                  // 588
    };                                                                                                              //
    if (Meteor.isServer) {                                                                                          // 591
      if (http) {                                                                                                   // 592
        cookie = http.request.Cookies;                                                                              // 593
        if (_.has(Package, 'accounts-base') && cookie.has('meteor_login_token')) {                                  // 594
          user = Meteor.users.findOne({                                                                             // 595
            'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(cookie.get('meteor_login_token'))   // 595
          });                                                                                                       //
          if (user) {                                                                                               // 596
            result.user = function() {                                                                              // 597
              return user;                                                                                          // 597
            };                                                                                                      //
            result.userId = user._id;                                                                               // 597
          }                                                                                                         //
        }                                                                                                           //
      }                                                                                                             //
    } else {                                                                                                        //
      if (_.has(Package, 'accounts-base') && Meteor.userId()) {                                                     // 600
        result.user = function() {                                                                                  // 601
          return Meteor.user();                                                                                     // 601
        };                                                                                                          //
        result.userId = Meteor.userId();                                                                            // 601
      }                                                                                                             //
    }                                                                                                               //
    return result;                                                                                                  // 603
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 605
  /*                                                                                                                // 605
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getExt                                                                                                      //
  @param {String} FileName - File name                                                                              //
  @summary Get extension from FileName                                                                              //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getExt = function(fileName) {                                                           // 95
    var extension;                                                                                                  // 614
    if (!!~fileName.indexOf('.')) {                                                                                 // 614
      extension = fileName.split('.').pop();                                                                        // 615
      return {                                                                                                      // 616
        ext: extension,                                                                                             // 616
        extension: extension,                                                                                       // 616
        extensionWithDot: '.' + extension                                                                           // 616
      };                                                                                                            //
    } else {                                                                                                        //
      return {                                                                                                      // 618
        ext: '',                                                                                                    // 618
        extension: '',                                                                                              // 618
        extensionWithDot: ''                                                                                        // 618
      };                                                                                                            //
    }                                                                                                               //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 620
  /*                                                                                                                // 620
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name dataToSchema                                                                                                //
  @param {Object} data - File data                                                                                  //
  @summary Build object in accordance with schema from File data                                                    //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.dataToSchema = function(data) {                                                         // 95
    return {                                                                                                        // 629
      name: data.name,                                                                                              // 629
      extension: data.extension,                                                                                    // 629
      path: data.path,                                                                                              // 629
      meta: data.meta,                                                                                              // 629
      type: data.type,                                                                                              // 629
      size: data.size,                                                                                              // 629
      versions: {                                                                                                   // 629
        original: {                                                                                                 // 637
          path: data.path,                                                                                          // 638
          size: data.size,                                                                                          // 638
          type: data.type,                                                                                          // 638
          extension: data.extension                                                                                 // 638
        }                                                                                                           //
      },                                                                                                            //
      isVideo: !!~data.type.toLowerCase().indexOf('video'),                                                         // 629
      isAudio: !!~data.type.toLowerCase().indexOf('audio'),                                                         // 629
      isImage: !!~data.type.toLowerCase().indexOf('image'),                                                         // 629
      isText: !!~data.type.toLowerCase().indexOf('text'),                                                           // 629
      isJSON: !!~data.type.toLowerCase().indexOf('json'),                                                           // 629
      _prefix: data._prefix || this._prefix,                                                                        // 629
      _storagePath: data._storagePath || this.storagePath,                                                          // 629
      _downloadRoute: data._downloadRoute || this.downloadRoute,                                                    // 629
      _collectionName: data._collectionName || this.collectionName                                                  // 629
    };                                                                                                              //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 653
  /*                                                                                                                // 653
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name srch                                                                                                        //
  @param {String|Object} search - Search data                                                                       //
  @summary Build search object                                                                                      //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.srch = function(search) {                                                               // 95
    if (search && _.isString(search)) {                                                                             // 662
      this.search = {                                                                                               // 663
        _id: search                                                                                                 // 664
      };                                                                                                            //
    } else {                                                                                                        //
      this.search = search || {};                                                                                   // 666
    }                                                                                                               //
    return this.search;                                                                                             //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 669
  /*                                                                                                                // 669
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
  FilesCollection.prototype.write = Meteor.isServer ? function(buffer, opts, callback) {                            // 95
    var extension, extensionWithDot, fileName, path, randFileName, ref, result, self;                               // 680
    if (opts == null) {                                                                                             //
      opts = {};                                                                                                    //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 680
      console.info("[FilesCollection] [write()]");                                                                  // 680
    }                                                                                                               //
    check(opts, Match.Optional(Object));                                                                            // 680
    check(callback, Match.Optional(Function));                                                                      // 680
    if (this.checkAccess()) {                                                                                       // 684
      randFileName = this.namingFunction();                                                                         // 685
      fileName = opts.name || opts.fileName ? opts.name || opts.fileName : randFileName;                            // 685
      ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;              // 685
      self = this;                                                                                                  // 685
      path = this.storagePath + "/" + randFileName + extensionWithDot;                                              // 685
      opts.type = this.getMimeType(opts);                                                                           // 685
      if (!opts.meta) {                                                                                             // 694
        opts.meta = {};                                                                                             // 694
      }                                                                                                             //
      if (!opts.size) {                                                                                             // 695
        opts.size = buffer.length;                                                                                  // 695
      }                                                                                                             //
      result = this.dataToSchema({                                                                                  // 685
        name: fileName,                                                                                             // 698
        path: path,                                                                                                 // 698
        meta: opts.meta,                                                                                            // 698
        type: opts.type,                                                                                            // 698
        size: opts.size,                                                                                            // 698
        extension: extension                                                                                        // 698
      });                                                                                                           //
      if (this.debug) {                                                                                             // 705
        console.info("[FilesCollection] [write]: " + fileName + " -> " + this.collectionName);                      // 705
      }                                                                                                             //
      fs.outputFile(path, buffer, 'binary', function(error) {                                                       // 685
        return bound(function() {                                                                                   //
          if (error) {                                                                                              // 708
            return callback && callback(error);                                                                     //
          } else {                                                                                                  //
            result._id = self.collection.insert(_.clone(result));                                                   // 711
            return callback && callback(null, result);                                                              //
          }                                                                                                         //
        });                                                                                                         //
      });                                                                                                           //
      return this;                                                                                                  // 714
    }                                                                                                               //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 718
  /*                                                                                                                // 718
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
  FilesCollection.prototype.load = Meteor.isServer ? function(url, opts, callback) {                                // 95
    var extension, extensionWithDot, fileName, path, randFileName, ref, self;                                       // 729
    if (opts == null) {                                                                                             //
      opts = {};                                                                                                    //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 729
      console.info("[FilesCollection] [load(" + url + ", " + (JSON.stringify(opts)) + ", callback)]");              // 729
    }                                                                                                               //
    check(url, String);                                                                                             // 729
    check(opts, Match.Optional(Object));                                                                            // 729
    check(callback, Match.Optional(Function));                                                                      // 729
    self = this;                                                                                                    // 729
    randFileName = this.namingFunction();                                                                           // 729
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : randFileName;                              // 729
    ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                // 729
    path = this.storagePath + "/" + randFileName + extensionWithDot;                                                // 729
    if (!opts.meta) {                                                                                               // 740
      opts.meta = {};                                                                                               // 740
    }                                                                                                               //
    request.get(url).on('error', function(error) {                                                                  // 729
      return bound(function() {                                                                                     //
        throw new Meteor.Error(500, ("Error on [load(" + url + ")]:") + JSON.stringify(error));                     // 743
      });                                                                                                           //
    }).on('response', function(response) {                                                                          //
      return bound(function() {                                                                                     //
        var result;                                                                                                 // 746
        if (self.debug) {                                                                                           // 746
          console.info("[FilesCollection] [load] Received: " + url);                                                // 746
        }                                                                                                           //
        result = self.dataToSchema({                                                                                // 746
          name: fileName,                                                                                           // 749
          path: path,                                                                                               // 749
          meta: opts.meta,                                                                                          // 749
          type: opts.type || response.headers['content-type'],                                                      // 749
          size: opts.size || response.headers['content-length'],                                                    // 749
          extension: extension                                                                                      // 749
        });                                                                                                         //
        return self.collection.insert(_.clone(result), function(error, fileRef) {                                   //
          if (error) {                                                                                              // 757
            if (self.debug) {                                                                                       // 758
              console.warn("[FilesCollection] [load] [insert] Error: " + fileName + " -> " + self.collectionName, error);
            }                                                                                                       //
            return callback && callback(error);                                                                     //
          } else {                                                                                                  //
            if (self.debug) {                                                                                       // 761
              console.info("[FilesCollection] [load] [insert] " + fileName + " -> " + self.collectionName);         // 761
            }                                                                                                       //
            return callback && callback(null, fileRef);                                                             //
          }                                                                                                         //
        });                                                                                                         //
      });                                                                                                           //
    }).pipe(fs.createWriteStream(path, {                                                                            //
      flags: 'w'                                                                                                    // 763
    }));                                                                                                            //
    return this;                                                                                                    // 765
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 769
  /*                                                                                                                // 769
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name addFile                                                                                                     //
  @param {String} path - Path to file                                                                               //
  @param {String} path - Path to file                                                                               //
  @summary Add file from FS to FilesCollection                                                                      //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.addFile = Meteor.isServer ? function(path, opts, callback) {                            // 95
    var self;                                                                                                       // 779
    if (opts == null) {                                                                                             //
      opts = {};                                                                                                    //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 779
      console.info("[FilesCollection] [addFile(" + path + ")]");                                                    // 779
    }                                                                                                               //
    if (this["public"]) {                                                                                           // 781
      throw new Meteor.Error(403, 'Can not run [addFile] on public collection! Just Move file to root of your server, then add record to Collection');
    }                                                                                                               //
    check(path, String);                                                                                            // 779
    check(opts, Match.Optional(Object));                                                                            // 779
    check(callback, Match.Optional(Function));                                                                      // 779
    self = this;                                                                                                    // 779
    fs.stat(path, function(error, stats) {                                                                          // 779
      return bound(function() {                                                                                     //
        var _cn, extension, extensionWithDot, fileName, pathParts, ref, result;                                     // 788
        if (error) {                                                                                                // 788
          return callback && callback(error);                                                                       //
        } else if (stats.isFile()) {                                                                                //
          pathParts = path.split('/');                                                                              // 791
          fileName = pathParts[pathParts.length - 1];                                                               // 791
          ref = self.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;          // 791
          if (!opts.type) {                                                                                         // 796
            opts.type = 'application/*';                                                                            // 796
          }                                                                                                         //
          if (!opts.meta) {                                                                                         // 797
            opts.meta = {};                                                                                         // 797
          }                                                                                                         //
          if (!opts.size) {                                                                                         // 798
            opts.size = stats.size;                                                                                 // 798
          }                                                                                                         //
          result = self.dataToSchema({                                                                              // 791
            name: fileName,                                                                                         // 801
            path: path,                                                                                             // 801
            meta: opts.meta,                                                                                        // 801
            type: opts.type,                                                                                        // 801
            size: opts.size,                                                                                        // 801
            extension: extension,                                                                                   // 801
            _storagePath: path.replace("/" + fileName, '')                                                          // 801
          });                                                                                                       //
          _cn = self.collectionName;                                                                                // 791
          return self.collection.insert(_.clone(result), function(error, record) {                                  //
            if (error) {                                                                                            // 811
              if (self.debug) {                                                                                     // 812
                console.warn("[FilesCollection] [addFile] [insert] Error: " + fileName + " -> " + _cn, error);      // 812
              }                                                                                                     //
              return callback && callback(error);                                                                   //
            } else {                                                                                                //
              if (self.debug) {                                                                                     // 815
                console.info("[FilesCollection] [addFile] [insert]: " + fileName + " -> " + _cn);                   // 815
              }                                                                                                     //
              return callback && callback(null, result);                                                            //
            }                                                                                                       //
          });                                                                                                       //
        } else {                                                                                                    //
          return callback && callback(new Meteor.Error(400, "[FilesCollection] [addFile(" + path + ")]: File does not exist"));
        }                                                                                                           //
      });                                                                                                           //
    });                                                                                                             //
    return this;                                                                                                    // 820
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 824
  /*                                                                                                                // 824
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name findOne                                                                                                     //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                  //
  @summary Load file                                                                                                //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.findOne = function(search) {                                                            // 95
    if (this.debug) {                                                                                               // 833
      console.info("[FilesCollection] [findOne(" + (JSON.stringify(search)) + ")]");                                // 833
    }                                                                                                               //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                     // 833
    this.srch(search);                                                                                              // 833
    if (this.checkAccess()) {                                                                                       // 837
      this.currentFile = this.collection.findOne(this.search);                                                      // 838
      this.cursor = null;                                                                                           // 838
    }                                                                                                               //
    return this;                                                                                                    // 840
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 842
  /*                                                                                                                // 842
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name find                                                                                                        //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                  //
  @summary Load file or bunch of files                                                                              //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.find = function(search) {                                                               // 95
    if (this.debug) {                                                                                               // 851
      console.info("[FilesCollection] [find(" + (JSON.stringify(search)) + ")]");                                   // 851
    }                                                                                                               //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                     // 851
    this.srch(search);                                                                                              // 851
    if (this.checkAccess()) {                                                                                       // 855
      this.currentFile = null;                                                                                      // 856
      this.cursor = this.collection.find(this.search);                                                              // 856
    }                                                                                                               //
    return this;                                                                                                    // 858
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 860
  /*                                                                                                                // 860
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name get                                                                                                         //
  @summary Return value of current cursor or file                                                                   //
  @returns {Object|[Object]}                                                                                        //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.get = function() {                                                                      // 95
    if (this.debug) {                                                                                               // 868
      console.info('[FilesCollection] [get()]');                                                                    // 868
    }                                                                                                               //
    if (this.cursor) {                                                                                              // 869
      return this.cursor.fetch();                                                                                   // 869
    }                                                                                                               //
    return this.currentFile;                                                                                        // 870
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 872
  /*                                                                                                                // 872
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name fetch                                                                                                       //
  @summary Alias for `get()` method                                                                                 //
  @returns {[Object]}                                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.fetch = function() {                                                                    // 95
    var data;                                                                                                       // 880
    if (this.debug) {                                                                                               // 880
      console.info('[FilesCollection] [fetch()]');                                                                  // 880
    }                                                                                                               //
    data = this.get();                                                                                              // 880
    if (!_.isArray(data)) {                                                                                         // 882
      return [data];                                                                                                // 883
    } else {                                                                                                        //
      return data;                                                                                                  //
    }                                                                                                               //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 887
  /*                                                                                                                // 887
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
  FilesCollection.prototype.insert = Meteor.isClient ? function(config, autoStart) {                                // 95
    var mName;                                                                                                      // 918
    if (autoStart == null) {                                                                                        //
      autoStart = true;                                                                                             //
    }                                                                                                               //
    if (this.checkAccess()) {                                                                                       // 918
      mName = autoStart ? 'start' : 'manual';                                                                       // 919
      return (new this._UploadInstance(config, this))[mName]();                                                     // 920
    } else {                                                                                                        //
      throw new Meteor.Error(401, "[FilesCollection] [insert] Access Denied");                                      // 922
    }                                                                                                               //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 925
  /*                                                                                                                // 925
  @locus Client                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name _UploadInstance                                                                                             //
  @class UploadInstance                                                                                             //
  @summary Internal Class, used in upload                                                                           //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype._UploadInstance = Meteor.isClient ? UploadInstance = (function() {                      // 95
    UploadInstance.prototype.__proto__ = EventEmitter.prototype;                                                    // 933
                                                                                                                    //
    function UploadInstance(config1, collection) {                                                                  // 934
      var base, base1, base2, base3, base4, self;                                                                   // 935
      this.config = config1;                                                                                        // 935
      this.collection = collection;                                                                                 // 935
      EventEmitter.call(this);                                                                                      // 935
      if (this.collection.debug) {                                                                                  // 936
        console.info('[FilesCollection] [insert()]');                                                               // 936
      }                                                                                                             //
      self = this;                                                                                                  // 935
      if ((base = this.config).meta == null) {                                                                      //
        base.meta = {};                                                                                             //
      }                                                                                                             //
      if ((base1 = this.config).streams == null) {                                                                  //
        base1.streams = 2;                                                                                          //
      }                                                                                                             //
      if (this.config.streams < 1) {                                                                                // 940
        this.config.streams = 2;                                                                                    // 940
      }                                                                                                             //
      if ((base2 = this.config).transport == null) {                                                                //
        base2.transport = 'ddp';                                                                                    //
      }                                                                                                             //
      if ((base3 = this.config).chunkSize == null) {                                                                //
        base3.chunkSize = this.collection.chunkSize;                                                                //
      }                                                                                                             //
      if ((base4 = this.config).allowWebWorkers == null) {                                                          //
        base4.allowWebWorkers = true;                                                                               //
      }                                                                                                             //
      this.config.transport = this.config.transport.toLowerCase();                                                  // 935
      check(this.config, {                                                                                          // 935
        file: Match.Any,                                                                                            // 946
        meta: Match.Optional(Object),                                                                               // 946
        onError: Match.Optional(Function),                                                                          // 946
        onAbort: Match.Optional(Function),                                                                          // 946
        streams: Match.OneOf('dynamic', Number),                                                                    // 946
        onStart: Match.Optional(Function),                                                                          // 946
        transport: Match.OneOf('http', 'ddp'),                                                                      // 946
        chunkSize: Match.OneOf('dynamic', Number),                                                                  // 946
        onUploaded: Match.Optional(Function),                                                                       // 946
        onProgress: Match.Optional(Function),                                                                       // 946
        onBeforeUpload: Match.Optional(Function),                                                                   // 946
        allowWebWorkers: Boolean                                                                                    // 946
      });                                                                                                           //
      if (this.config.file) {                                                                                       // 961
        if (this.collection.debug) {                                                                                // 962
          console.time('insert ' + this.config.file.name);                                                          // 962
        }                                                                                                           //
        if (this.collection.debug) {                                                                                // 963
          console.time('loadFile ' + this.config.file.name);                                                        // 963
        }                                                                                                           //
        if (Worker && this.config.allowWebWorkers) {                                                                // 965
          this.worker = new Worker('/packages/ostrio_files/worker.js');                                             // 966
        } else {                                                                                                    //
          this.worker = null;                                                                                       // 968
        }                                                                                                           //
        this.trackerComp = null;                                                                                    // 962
        this.currentChunk = 0;                                                                                      // 962
        this.sentChunks = 0;                                                                                        // 962
        this.EOFsent = false;                                                                                       // 962
        this.transferTime = 0;                                                                                      // 962
        this.fileLength = 1;                                                                                        // 962
        this.fileId = this.collection.namingFunction();                                                             // 962
        this.pipes = [];                                                                                            // 962
        this.fileData = {                                                                                           // 962
          size: this.config.file.size,                                                                              // 979
          type: this.config.file.type,                                                                              // 979
          name: this.config.file.name,                                                                              // 979
          meta: this.config.meta                                                                                    // 979
        };                                                                                                          //
        this.fileData = _.extend(this.fileData, this.collection.getExt(self.config.file.name), {                    // 962
          mime: this.collection.getMimeType(this.fileData)                                                          // 984
        });                                                                                                         //
        this.fileData['mime-type'] = this.fileData.mime;                                                            // 962
        this.result = new this.collection._FileUpload(_.extend(self.config, {                                       // 962
          fileData: this.fileData,                                                                                  // 987
          fileId: this.fileId,                                                                                      // 987
          MeteorFileAbort: this.collection.methodNames.MeteorFileAbort                                              // 987
        }));                                                                                                        //
        this.beforeunload = function(e) {                                                                           // 962
          var message;                                                                                              // 990
          message = _.isFunction(self.collection.onbeforeunloadMessage) ? self.collection.onbeforeunloadMessage.call(self.result, self.fileData) : self.collection.onbeforeunloadMessage;
          if (e) {                                                                                                  // 991
            e.returnValue = message;                                                                                // 991
          }                                                                                                         //
          return message;                                                                                           // 992
        };                                                                                                          //
        this.result.config.beforeunload = this.beforeunload;                                                        // 962
        window.addEventListener('beforeunload', this.beforeunload, false);                                          // 962
        this.result.config._onEnd = function() {                                                                    // 962
          return self.emitEvent('_onEnd');                                                                          //
        };                                                                                                          //
        this.addListener('end', this.end);                                                                          // 962
        this.addListener('start', this.start);                                                                      // 962
        this.addListener('upload', this.upload);                                                                    // 962
        this.addListener('sendEOF', this.sendEOF);                                                                  // 962
        this.addListener('prepare', this.prepare);                                                                  // 962
        this.addListener('sendChunk', this.sendChunk);                                                              // 962
        this.addListener('proceedChunk', this.proceedChunk);                                                        // 962
        this.addListener('createStreams', this.createStreams);                                                      // 962
        this.addListener('calculateStats', _.throttle(function() {                                                  // 962
          var _t, progress;                                                                                         // 1008
          _t = (self.transferTime / self.sentChunks) / self.config.streams;                                         // 1008
          self.result.estimateTime.set(_t * (self.fileLength - self.sentChunks));                                   // 1008
          self.result.estimateSpeed.set(self.config.chunkSize / (_t / 1000));                                       // 1008
          progress = Math.round((self.sentChunks / self.fileLength) * 100);                                         // 1008
          self.result.progress.set(progress);                                                                       // 1008
          self.config.onProgress && self.config.onProgress.call(self.result, progress, self.fileData);              // 1008
          self.result.emitEvent('progress', [progress, self.fileData]);                                             // 1008
        }, 250));                                                                                                   //
        this.addListener('_onEnd', function() {                                                                     // 962
          if (self.worker) {                                                                                        // 1019
            self.worker.terminate();                                                                                // 1019
          }                                                                                                         //
          if (self.trackerComp) {                                                                                   // 1020
            self.trackerComp.stop();                                                                                // 1020
          }                                                                                                         //
          if (self.beforeunload) {                                                                                  // 1021
            window.removeEventListener('beforeunload', self.beforeunload, false);                                   // 1021
          }                                                                                                         //
          if (self.result) {                                                                                        // 1022
            return self.result.progress.set(0);                                                                     //
          }                                                                                                         //
        });                                                                                                         //
      } else {                                                                                                      //
        throw new Meteor.Error(500, "[FilesCollection] [insert] Have you forget to pass a File itself?");           // 1024
      }                                                                                                             //
    }                                                                                                               //
                                                                                                                    //
    UploadInstance.prototype.end = function(error, data) {                                                          // 933
      if (this.collection.debug) {                                                                                  // 1027
        console.timeEnd('insert ' + this.config.file.name);                                                         // 1027
      }                                                                                                             //
      this.emitEvent('_onEnd');                                                                                     // 1027
      this.result.emitEvent('uploaded', [error, data]);                                                             // 1027
      this.config.onUploaded && this.config.onUploaded.call(this.result, error, data);                              // 1027
      if (error) {                                                                                                  // 1031
        if (this.collection.debug) {                                                                                // 1032
          console.warn("[FilesCollection] [insert] [end] Error: ", error);                                          // 1032
        }                                                                                                           //
        this.result.abort();                                                                                        // 1032
        this.result.state.set('aborted');                                                                           // 1032
        this.result.emitEvent('error', [error, this.fileData]);                                                     // 1032
        this.config.onError && this.config.onError.call(this.result, error, this.fileData);                         // 1032
      } else {                                                                                                      //
        this.result.state.set('completed');                                                                         // 1038
        this.collection.emitEvent('afterUpload', [data]);                                                           // 1038
      }                                                                                                             //
      this.result.emitEvent('end', [error, data || this.fileData]);                                                 // 1027
      return this.result;                                                                                           // 1041
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.sendChunk = function(evt) {                                                            // 933
      var j, len, opts, pipeFunc, ref, self;                                                                        // 1044
      self = this;                                                                                                  // 1044
      opts = {                                                                                                      // 1044
        file: this.fileData,                                                                                        // 1046
        fileId: this.fileId,                                                                                        // 1046
        binData: evt.data.bin,                                                                                      // 1046
        chunkId: evt.data.chunkId,                                                                                  // 1046
        chunkSize: this.config.chunkSize,                                                                           // 1046
        fileLength: this.fileLength                                                                                 // 1046
      };                                                                                                            //
      if (evt.data.chunkId !== 1) {                                                                                 // 1053
        opts.file = _.omit(opts.file, 'meta', 'ext', 'extensionWithDot', 'mime', 'mime-type');                      // 1054
      }                                                                                                             //
      this.emitEvent('data', [evt.data.bin]);                                                                       // 1044
      if (this.pipes.length) {                                                                                      // 1057
        ref = this.pipes;                                                                                           // 1058
        for (j = 0, len = ref.length; j < len; j++) {                                                               // 1058
          pipeFunc = ref[j];                                                                                        //
          opts.binData = pipeFunc(opts.binData);                                                                    // 1059
        }                                                                                                           // 1058
      }                                                                                                             //
      if (this.fileLength === evt.data.chunkId) {                                                                   // 1061
        if (this.collection.debug) {                                                                                // 1062
          console.timeEnd('loadFile ' + this.config.file.name);                                                     // 1062
        }                                                                                                           //
        this.emitEvent('readEnd');                                                                                  // 1062
      }                                                                                                             //
      if (opts.binData && opts.binData.length) {                                                                    // 1065
        if (this.config.transport === 'ddp') {                                                                      // 1066
          Meteor.call(this.collection.methodNames.MeteorFileWrite, opts, function(error) {                          // 1067
            ++self.sentChunks;                                                                                      // 1068
            self.transferTime += (+(new Date)) - evt.data.start;                                                    // 1068
            if (error) {                                                                                            // 1070
              self.emitEvent('end', [error]);                                                                       // 1071
            } else {                                                                                                //
              if (self.sentChunks >= self.fileLength) {                                                             // 1073
                self.emitEvent('sendEOF', [opts]);                                                                  // 1074
              } else if (self.currentChunk < self.fileLength) {                                                     //
                self.emitEvent('upload');                                                                           // 1076
              }                                                                                                     //
              self.emitEvent('calculateStats');                                                                     // 1073
            }                                                                                                       //
          });                                                                                                       //
        } else {                                                                                                    //
          HTTP.call('POST', this.collection.downloadRoute + "/" + this.collection.collectionName + "/__upload", {   // 1080
            data: opts                                                                                              // 1080
          }, function(error, result) {                                                                              //
            ++self.sentChunks;                                                                                      // 1081
            self.transferTime += (+(new Date)) - evt.data.start;                                                    // 1081
            if (error) {                                                                                            // 1083
              self.emitEvent('end', [error]);                                                                       // 1084
            } else {                                                                                                //
              if (self.sentChunks >= self.fileLength) {                                                             // 1086
                self.emitEvent('sendEOF', [opts]);                                                                  // 1087
              } else if (self.currentChunk < self.fileLength) {                                                     //
                self.emitEvent('upload');                                                                           // 1089
              }                                                                                                     //
              self.emitEvent('calculateStats');                                                                     // 1086
            }                                                                                                       //
          });                                                                                                       //
        }                                                                                                           //
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.sendEOF = function(opts) {                                                             // 933
      var self;                                                                                                     // 1095
      if (!this.EOFsent) {                                                                                          // 1095
        this.EOFsent = true;                                                                                        // 1096
        self = this;                                                                                                // 1096
        opts = {                                                                                                    // 1096
          eof: true,                                                                                                // 1099
          file: this.fileData,                                                                                      // 1099
          fileId: this.fileId,                                                                                      // 1099
          chunkSize: this.config.chunkSize,                                                                         // 1099
          fileLength: this.fileLength                                                                               // 1099
        };                                                                                                          //
        if (this.config.transport === 'ddp') {                                                                      // 1105
          Meteor.call(this.collection.methodNames.MeteorFileWrite, opts, function() {                               // 1106
            self.emitEvent('end', arguments);                                                                       // 1107
          });                                                                                                       //
        } else {                                                                                                    //
          HTTP.call('POST', this.collection.downloadRoute + "/" + this.collection.collectionName + "/__upload", {   // 1110
            data: opts                                                                                              // 1110
          }, function(error, result) {                                                                              //
            self.emitEvent('end', [error, JSON.parse((result != null ? result.content : void 0) || {})]);           // 1111
          });                                                                                                       //
        }                                                                                                           //
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.proceedChunk = function(chunkId, start) {                                              // 933
      var chunk, fileReader, self;                                                                                  // 1116
      self = this;                                                                                                  // 1116
      chunk = this.config.file.slice(this.config.chunkSize * (chunkId - 1), this.config.chunkSize * chunkId);       // 1116
      fileReader = new FileReader;                                                                                  // 1116
      fileReader.onloadend = function(evt) {                                                                        // 1116
        var ref, ref1;                                                                                              // 1121
        self.emitEvent('sendChunk', [                                                                               // 1121
          {                                                                                                         //
            data: {                                                                                                 // 1121
              bin: ((fileReader != null ? fileReader.result : void 0) || ((ref = evt.srcElement) != null ? ref.result : void 0) || ((ref1 = evt.target) != null ? ref1.result : void 0)).split(',')[1],
              chunkId: chunkId,                                                                                     // 1122
              start: start                                                                                          // 1122
            }                                                                                                       //
          }                                                                                                         //
        ]);                                                                                                         //
      };                                                                                                            //
      fileReader.onerror = function(e) {                                                                            // 1116
        self.emitEvent('end', [(e.target || e.srcElement).error]);                                                  // 1130
      };                                                                                                            //
      fileReader.readAsDataURL(chunk);                                                                              // 1116
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.upload = function() {                                                                  // 933
      var self, start;                                                                                              // 1137
      start = +(new Date);                                                                                          // 1137
      if (this.result.onPause.get()) {                                                                              // 1138
        self = this;                                                                                                // 1139
        this.result.continueFunc = function() {                                                                     // 1139
          self.emitEvent('createStreams');                                                                          // 1141
        };                                                                                                          //
        return;                                                                                                     // 1143
      }                                                                                                             //
      if (this.result.state.get() === 'aborted') {                                                                  // 1145
        return this;                                                                                                // 1146
      }                                                                                                             //
      if (this.currentChunk <= this.fileLength) {                                                                   // 1148
        ++this.currentChunk;                                                                                        // 1149
        if (this.worker) {                                                                                          // 1150
          this.worker.postMessage({                                                                                 // 1151
            sentChunks: this.sentChunks,                                                                            // 1151
            start: start,                                                                                           // 1151
            currentChunk: this.currentChunk,                                                                        // 1151
            chunkSize: this.config.chunkSize,                                                                       // 1151
            file: this.config.file                                                                                  // 1151
          });                                                                                                       //
        } else {                                                                                                    //
          this.emitEvent('proceedChunk', [this.currentChunk, start]);                                               // 1153
        }                                                                                                           //
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.createStreams = function() {                                                           // 933
      var i, self;                                                                                                  // 1157
      i = 1;                                                                                                        // 1157
      self = this;                                                                                                  // 1157
      while (i <= this.config.streams) {                                                                            // 1159
        self.emitEvent('upload');                                                                                   // 1160
        i++;                                                                                                        // 1160
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.prepare = function() {                                                                 // 933
      var _len, self;                                                                                               // 1165
      self = this;                                                                                                  // 1165
      this.config.onStart && this.config.onStart.call(this.result, null, this.fileData);                            // 1165
      this.result.emitEvent('start', [null, this.fileData]);                                                        // 1165
      if (this.config.chunkSize === 'dynamic') {                                                                    // 1170
        this.config.chunkSize = this.config.file.size / 1000;                                                       // 1171
        if (this.config.chunkSize < 327680) {                                                                       // 1172
          this.config.chunkSize = 327680;                                                                           // 1173
        } else if (this.config.chunkSize > 1048576) {                                                               //
          this.config.chunkSize = 1048576;                                                                          // 1175
        }                                                                                                           //
      }                                                                                                             //
      this.config.chunkSize = Math.floor(this.config.chunkSize / 8) * 8;                                            // 1165
      _len = Math.ceil(this.config.file.size / this.config.chunkSize);                                              // 1165
      if (this.config.streams === 'dynamic') {                                                                      // 1179
        this.config.streams = _.clone(_len);                                                                        // 1180
        if (this.config.streams > 24) {                                                                             // 1181
          this.config.streams = 24;                                                                                 // 1181
        }                                                                                                           //
      }                                                                                                             //
      this.fileLength = _len <= 0 ? 1 : _len;                                                                       // 1165
      if (this.config.streams > this.fileLength) {                                                                  // 1184
        this.config.streams = this.fileLength;                                                                      // 1184
      }                                                                                                             //
      this.result.config.fileLength = this.fileLength;                                                              // 1165
      self.emitEvent('createStreams');                                                                              // 1165
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.pipe = function(func) {                                                                // 933
      this.pipes.push(func);                                                                                        // 1191
      return this;                                                                                                  // 1192
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.start = function() {                                                                   // 933
      var isUploadAllowed, self;                                                                                    // 1195
      self = this;                                                                                                  // 1195
      if (this.config.file.size <= 0) {                                                                             // 1196
        this.end(new Meteor.Error(400, 'Can\'t upload empty file'));                                                // 1197
        return this.result;                                                                                         // 1198
      }                                                                                                             //
      if (this.config.onBeforeUpload && _.isFunction(this.config.onBeforeUpload)) {                                 // 1200
        isUploadAllowed = this.config.onBeforeUpload.call(_.extend(this.result, this.collection.getUser()), this.fileData);
        if (isUploadAllowed !== true) {                                                                             // 1202
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'config.onBeforeUpload() returned false'));
        }                                                                                                           //
      }                                                                                                             //
      if (this.collection.onBeforeUpload && _.isFunction(this.collection.onBeforeUpload)) {                         // 1205
        isUploadAllowed = this.collection.onBeforeUpload.call(_.extend(this.result, this.collection.getUser()), this.fileData);
        if (isUploadAllowed !== true) {                                                                             // 1207
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'collection.onBeforeUpload() returned false'));
        }                                                                                                           //
      }                                                                                                             //
      Tracker.autorun(function(computation) {                                                                       // 1195
        self.trackerComp = computation;                                                                             // 1211
        if (!self.result.onPause.get()) {                                                                           // 1212
          if (Meteor.status().connected) {                                                                          // 1213
            self.result["continue"]();                                                                              // 1214
            if (self.collection.debug) {                                                                            // 1215
              console.info('[FilesCollection] [insert] [Tracker] [continue]');                                      // 1215
            }                                                                                                       //
          } else {                                                                                                  //
            self.result.pause();                                                                                    // 1217
            if (self.collection.debug) {                                                                            // 1218
              console.info('[FilesCollection] [insert] [Tracker] [pause]');                                         // 1218
            }                                                                                                       //
          }                                                                                                         //
        }                                                                                                           //
      });                                                                                                           //
      if (this.worker) {                                                                                            // 1221
        this.worker.onmessage = function(evt) {                                                                     // 1222
          if (evt.data.error) {                                                                                     // 1223
            if (self.collection.debug) {                                                                            // 1224
              console.warn(evt.data.error);                                                                         // 1224
            }                                                                                                       //
            self.emitEvent('proceedChunk', [evt.data.chunkId, evt.data.start]);                                     // 1224
          } else {                                                                                                  //
            self.emitEvent('sendChunk', [evt]);                                                                     // 1227
          }                                                                                                         //
        };                                                                                                          //
        this.worker.onerror = function(e) {                                                                         // 1222
          self.emitEvent('end', [e.message]);                                                                       // 1230
        };                                                                                                          //
      }                                                                                                             //
      if (this.collection.debug) {                                                                                  // 1233
        if (this.worker) {                                                                                          // 1234
          console.info("[FilesCollection] [insert] using WebWorkers");                                              // 1235
        } else {                                                                                                    //
          console.info("[FilesCollection] [insert] using MainThread");                                              // 1237
        }                                                                                                           //
      }                                                                                                             //
      self.emitEvent('prepare');                                                                                    // 1195
      return this.result;                                                                                           // 1240
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.manual = function() {                                                                  // 933
      var self;                                                                                                     // 1243
      self = this;                                                                                                  // 1243
      this.result.start = function() {                                                                              // 1243
        self.emitEvent('start');                                                                                    // 1245
      };                                                                                                            //
      this.result.pipe = function(func) {                                                                           // 1243
        self.pipe(func);                                                                                            // 1248
        return this;                                                                                                // 1249
      };                                                                                                            //
      return this.result;                                                                                           // 1250
    };                                                                                                              //
                                                                                                                    //
    return UploadInstance;                                                                                          //
                                                                                                                    //
  })() : void 0;                                                                                                    //
                                                                                                                    //
                                                                                                                    // 1253
  /*                                                                                                                // 1253
  @locus Client                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name _FileUpload                                                                                                 //
  @class FileUpload                                                                                                 //
  @summary Internal Class, instance of this class is returned from `insert()` method                                //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype._FileUpload = Meteor.isClient ? FileUpload = (function() {                              // 95
    FileUpload.prototype.__proto__ = EventEmitter.prototype;                                                        // 1261
                                                                                                                    //
    function FileUpload(config1) {                                                                                  // 1262
      this.config = config1;                                                                                        // 1263
      EventEmitter.call(this);                                                                                      // 1263
      this.file = _.extend(this.config.file, this.config.fileData);                                                 // 1263
      this.state = new ReactiveVar('active');                                                                       // 1263
      this.onPause = new ReactiveVar(false);                                                                        // 1263
      this.progress = new ReactiveVar(0);                                                                           // 1263
      this.estimateTime = new ReactiveVar(1000);                                                                    // 1263
      this.estimateSpeed = new ReactiveVar(0);                                                                      // 1263
    }                                                                                                               //
                                                                                                                    //
    FileUpload.prototype.continueFunc = function() {};                                                              // 1261
                                                                                                                    //
    FileUpload.prototype.pause = function() {                                                                       // 1261
      if (!this.onPause.get()) {                                                                                    // 1272
        this.onPause.set(true);                                                                                     // 1273
        this.state.set('paused');                                                                                   // 1273
        this.emitEvent('pause', [this.file]);                                                                       // 1273
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    FileUpload.prototype["continue"] = function() {                                                                 // 1261
      if (this.onPause.get()) {                                                                                     // 1278
        this.onPause.set(false);                                                                                    // 1279
        this.state.set('active');                                                                                   // 1279
        this.emitEvent('continue', [this.file]);                                                                    // 1279
        this.continueFunc.call();                                                                                   // 1279
        this.continueFunc = function() {};                                                                          // 1279
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    FileUpload.prototype.toggle = function() {                                                                      // 1261
      if (this.onPause.get()) {                                                                                     // 1286
        this["continue"]();                                                                                         // 1286
      } else {                                                                                                      //
        this.pause();                                                                                               // 1286
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    FileUpload.prototype.abort = function() {                                                                       // 1261
      window.removeEventListener('beforeunload', this.config.beforeunload, false);                                  // 1289
      this.config.onAbort && this.config.onAbort.call(this, this.file);                                             // 1289
      this.emitEvent('abort', [this.file]);                                                                         // 1289
      this.pause();                                                                                                 // 1289
      this.config._onEnd();                                                                                         // 1289
      this.state.set('aborted');                                                                                    // 1289
      if (this.config.debug) {                                                                                      // 1295
        console.timeEnd('insert ' + this.config.file.name);                                                         // 1295
      }                                                                                                             //
      if (this.config.fileLength) {                                                                                 // 1296
        Meteor.call(this.config.MeteorFileAbort, {                                                                  // 1297
          fileId: this.config.fileId,                                                                               // 1297
          fileLength: this.config.fileLength,                                                                       // 1297
          fileData: this.config.fileData                                                                            // 1297
        });                                                                                                         //
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    return FileUpload;                                                                                              //
                                                                                                                    //
  })() : void 0;                                                                                                    //
                                                                                                                    //
                                                                                                                    // 1301
  /*                                                                                                                // 1301
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name remove                                                                                                      //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                  //
  @param {Function} cb - Callback with one `error` argument                                                         //
  @summary Remove file(s) on cursor or find and remove file(s) if search is set                                     //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.remove = function(search, cb) {                                                         // 95
    var files, self;                                                                                                // 1311
    if (this.debug) {                                                                                               // 1311
      console.info("[FilesCollection] [remove(" + (JSON.stringify(search)) + ")]");                                 // 1311
    }                                                                                                               //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                     // 1311
    check(cb, Match.Optional(Function));                                                                            // 1311
    if (this.checkAccess()) {                                                                                       // 1315
      this.srch(search);                                                                                            // 1316
      if (Meteor.isClient) {                                                                                        // 1317
        Meteor.call(this.methodNames.MeteorFileUnlink, rcp(this), (cb ? cb : NOOP));                                // 1318
      }                                                                                                             //
      if (Meteor.isServer) {                                                                                        // 1320
        files = this.collection.find(this.search);                                                                  // 1321
        if (files.count() > 0) {                                                                                    // 1322
          self = this;                                                                                              // 1323
          files.forEach(function(file) {                                                                            // 1323
            return self.unlink(file);                                                                               //
          });                                                                                                       //
        }                                                                                                           //
        this.collection.remove(this.search, cb);                                                                    // 1321
      }                                                                                                             //
    } else {                                                                                                        //
      cb && cb(new Meteor.Error(401, '[FilesCollection] [remove] Access denied!'));                                 // 1327
    }                                                                                                               //
    return this;                                                                                                    // 1328
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 1330
  /*                                                                                                                // 1330
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name update                                                                                                      //
  @see http://docs.meteor.com/#/full/update                                                                         //
  @summary link Mongo.Collection update method                                                                      //
  @returns {Mongo.Collection} Instance                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.update = function() {                                                                   // 95
    this.collection.update.apply(this.collection, arguments);                                                       // 1339
    return this.collection;                                                                                         // 1340
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 1342
  /*                                                                                                                // 1342
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
  FilesCollection.prototype.deny = Meteor.isServer ? function(rules) {                                              // 95
    this.collection.deny(rules);                                                                                    // 1353
    return this.collection;                                                                                         // 1354
  } : void 0;                                                                                                       //
                                                                                                                    //
  FilesCollection.prototype.allow = Meteor.isServer ? function(rules) {                                             // 95
    this.collection.allow(rules);                                                                                   // 1357
    return this.collection;                                                                                         // 1358
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1361
  /*                                                                                                                // 1361
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name denyClient                                                                                                  //
  @name allowClient                                                                                                 //
  @see http://docs.meteor.com/#/full/allow                                                                          //
  @summary Shorthands for Mongo.Collection allow/deny methods                                                       //
  @returns {Mongo.Collection} Instance                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.denyClient = Meteor.isServer ? function() {                                             // 95
    this.collection.deny({                                                                                          // 1371
      insert: function() {                                                                                          // 1372
        return true;                                                                                                //
      },                                                                                                            //
      update: function() {                                                                                          // 1372
        return true;                                                                                                //
      },                                                                                                            //
      remove: function() {                                                                                          // 1372
        return true;                                                                                                //
      }                                                                                                             //
    });                                                                                                             //
    return this.collection;                                                                                         // 1375
  } : void 0;                                                                                                       //
                                                                                                                    //
  FilesCollection.prototype.allowClient = Meteor.isServer ? function() {                                            // 95
    this.collection.allow({                                                                                         // 1378
      insert: function() {                                                                                          // 1379
        return true;                                                                                                //
      },                                                                                                            //
      update: function() {                                                                                          // 1379
        return true;                                                                                                //
      },                                                                                                            //
      remove: function() {                                                                                          // 1379
        return true;                                                                                                //
      }                                                                                                             //
    });                                                                                                             //
    return this.collection;                                                                                         // 1382
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1386
  /*                                                                                                                // 1386
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name unlink                                                                                                      //
  @param {Object} fileRef - fileObj                                                                                 //
  @param {String} version - [Optional] file's version                                                               //
  @summary Unlink files and it's versions from FS                                                                   //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.unlink = Meteor.isServer ? function(fileRef, version) {                                 // 95
    var ref, ref1;                                                                                                  // 1396
    if (this.debug) {                                                                                               // 1396
      console.info("[FilesCollection] [unlink(" + fileRef._id + ", " + version + ")]");                             // 1396
    }                                                                                                               //
    if (version) {                                                                                                  // 1397
      if (((ref = fileRef.versions) != null ? ref[version] : void 0) && ((ref1 = fileRef.versions[version]) != null ? ref1.path : void 0)) {
        fs.unlink(fileRef.versions[version].path, NOOP);                                                            // 1399
      }                                                                                                             //
    } else {                                                                                                        //
      if (fileRef.versions && !_.isEmpty(fileRef.versions)) {                                                       // 1401
        _.each(fileRef.versions, function(vRef) {                                                                   // 1402
          return bound(function() {                                                                                 //
            return fs.unlink(vRef.path, NOOP);                                                                      //
          });                                                                                                       //
        });                                                                                                         //
      }                                                                                                             //
      fs.unlink(fileRef.path, NOOP);                                                                                // 1401
    }                                                                                                               //
    return this;                                                                                                    // 1405
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1408
  /*                                                                                                                // 1408
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name _404                                                                                                        //
  @summary Internal method, used to return 404 error                                                                //
  @returns {undefined}                                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype._404 = Meteor.isServer ? function(http) {                                               // 95
    var text;                                                                                                       // 1416
    if (this.debug) {                                                                                               // 1416
      console.warn("[FilesCollection] [download(" + http.request.originalUrl + ")] [_404] File not found");         // 1416
    }                                                                                                               //
    text = 'File Not Found :(';                                                                                     // 1416
    http.response.writeHead(404, {                                                                                  // 1416
      'Content-Length': text.length,                                                                                // 1419
      'Content-Type': 'text/plain'                                                                                  // 1419
    });                                                                                                             //
    http.response.end(text);                                                                                        // 1416
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1425
  /*                                                                                                                // 1425
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name download                                                                                                    //
  @param {Object|Files} self - Instance of FilesCollection                                                          //
  @summary Initiates the HTTP response                                                                              //
  @returns {undefined}                                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.download = Meteor.isServer ? function(http, version) {                                  // 95
    var fileRef, responseType, self;                                                                                // 1434
    if (version == null) {                                                                                          //
      version = 'original';                                                                                         //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 1434
      console.info("[FilesCollection] [download(" + http.request.originalUrl + ", " + version + ")]");              // 1434
    }                                                                                                               //
    responseType = '200';                                                                                           // 1434
    if (this.currentFile) {                                                                                         // 1436
      if (_.has(this.currentFile, 'versions') && _.has(this.currentFile.versions, version)) {                       // 1437
        fileRef = this.currentFile.versions[version];                                                               // 1438
      } else {                                                                                                      //
        fileRef = this.currentFile;                                                                                 // 1440
      }                                                                                                             //
    } else {                                                                                                        //
      fileRef = false;                                                                                              // 1442
    }                                                                                                               //
    if (!fileRef || !_.isObject(fileRef)) {                                                                         // 1444
      return this._404(http);                                                                                       // 1445
    } else if (this.currentFile) {                                                                                  //
      self = this;                                                                                                  // 1447
      if (this.downloadCallback) {                                                                                  // 1449
        if (!this.downloadCallback.call(_.extend(http, this.getUser(http)), this.currentFile)) {                    // 1450
          return this._404(http);                                                                                   // 1451
        }                                                                                                           //
      }                                                                                                             //
      if (this.interceptDownload && _.isFunction(this.interceptDownload)) {                                         // 1453
        if (this.interceptDownload(http, this.currentFile, version) === true) {                                     // 1454
          return;                                                                                                   // 1455
        }                                                                                                           //
      }                                                                                                             //
      fs.stat(fileRef.path, function(statErr, stats) {                                                              // 1447
        return bound(function() {                                                                                   //
          var array, dispositionEncoding, dispositionName, dispositionType, end, partiral, ref, ref1, ref2, ref3, reqRange, start, stream, streamErrorHandler, take, text;
          if (statErr || !stats.isFile()) {                                                                         // 1458
            return self._404(http);                                                                                 // 1459
          }                                                                                                         //
          if (stats.size !== fileRef.size && !self.integrityCheck) {                                                // 1461
            fileRef.size = stats.size;                                                                              // 1461
          }                                                                                                         //
          if (stats.size !== fileRef.size && self.integrityCheck) {                                                 // 1462
            responseType = '400';                                                                                   // 1462
          }                                                                                                         //
          partiral = false;                                                                                         // 1458
          reqRange = false;                                                                                         // 1458
          if (http.params.query.download && http.params.query.download === 'true') {                                // 1466
            dispositionType = 'attachment; ';                                                                       // 1467
          } else {                                                                                                  //
            dispositionType = 'inline; ';                                                                           // 1469
          }                                                                                                         //
          dispositionName = "filename=\"" + (encodeURIComponent(self.currentFile.name)) + "\"; filename=*UTF-8\"" + (encodeURIComponent(self.currentFile.name)) + "\"; ";
          dispositionEncoding = 'charset=utf-8';                                                                    // 1458
          http.response.setHeader('Content-Type', fileRef.type);                                                    // 1458
          http.response.setHeader('Content-Disposition', dispositionType + dispositionName + dispositionEncoding);  // 1458
          http.response.setHeader('Accept-Ranges', 'bytes');                                                        // 1458
          if ((ref = self.currentFile) != null ? (ref1 = ref.updatedAt) != null ? ref1.toUTCString() : void 0 : void 0) {
            http.response.setHeader('Last-Modified', (ref2 = self.currentFile) != null ? (ref3 = ref2.updatedAt) != null ? ref3.toUTCString() : void 0 : void 0);
          }                                                                                                         //
          http.response.setHeader('Connection', 'keep-alive');                                                      // 1458
          if (http.request.headers.range) {                                                                         // 1480
            partiral = true;                                                                                        // 1481
            array = http.request.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);                                    // 1481
            start = parseInt(array[1]);                                                                             // 1481
            end = parseInt(array[2]);                                                                               // 1481
            if (isNaN(end)) {                                                                                       // 1485
              end = fileRef.size - 1;                                                                               // 1486
            }                                                                                                       //
            take = end - start;                                                                                     // 1481
          } else {                                                                                                  //
            start = 0;                                                                                              // 1489
            end = fileRef.size - 1;                                                                                 // 1489
            take = fileRef.size;                                                                                    // 1489
          }                                                                                                         //
          if (partiral || (http.params.query.play && http.params.query.play === 'true')) {                          // 1493
            reqRange = {                                                                                            // 1494
              start: start,                                                                                         // 1494
              end: end                                                                                              // 1494
            };                                                                                                      //
            if (isNaN(start) && !isNaN(end)) {                                                                      // 1495
              reqRange.start = end - take;                                                                          // 1496
              reqRange.end = end;                                                                                   // 1496
            }                                                                                                       //
            if (!isNaN(start) && isNaN(end)) {                                                                      // 1498
              reqRange.start = start;                                                                               // 1499
              reqRange.end = start + take;                                                                          // 1499
            }                                                                                                       //
            if ((start + take) >= fileRef.size) {                                                                   // 1502
              reqRange.end = fileRef.size - 1;                                                                      // 1502
            }                                                                                                       //
            http.response.setHeader('Pragma', 'private');                                                           // 1494
            http.response.setHeader('Expires', new Date(+(new Date) + 1000 * 32400).toUTCString());                 // 1494
            http.response.setHeader('Cache-Control', 'private, maxage=10800, s-maxage=32400');                      // 1494
            if (self.strict && (reqRange.start >= (fileRef.size - 1) || reqRange.end > (fileRef.size - 1))) {       // 1507
              responseType = '416';                                                                                 // 1508
            } else {                                                                                                //
              responseType = '206';                                                                                 // 1510
            }                                                                                                       //
          } else {                                                                                                  //
            http.response.setHeader('Cache-Control', self.cacheControl);                                            // 1512
            responseType = '200';                                                                                   // 1512
          }                                                                                                         //
          streamErrorHandler = function(error) {                                                                    // 1458
            http.response.writeHead(500);                                                                           // 1516
            return http.response.end(error.toString());                                                             //
          };                                                                                                        //
          switch (responseType) {                                                                                   // 1519
            case '400':                                                                                             // 1519
              if (self.debug) {                                                                                     // 1521
                console.warn("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [400] Content-Length mismatch!");
              }                                                                                                     //
              text = 'Content-Length mismatch!';                                                                    // 1521
              http.response.writeHead(400, {                                                                        // 1521
                'Content-Type': 'text/plain',                                                                       // 1524
                'Cache-Control': 'no-cache',                                                                        // 1524
                'Content-Length': text.length                                                                       // 1524
              });                                                                                                   //
              http.response.end(text);                                                                              // 1521
              break;                                                                                                // 1528
            case '404':                                                                                             // 1519
              return self._404(http);                                                                               // 1530
              break;                                                                                                // 1531
            case '416':                                                                                             // 1519
              if (self.debug) {                                                                                     // 1533
                console.info("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [416] Content-Range is not specified!");
              }                                                                                                     //
              http.response.writeHead(416, {                                                                        // 1533
                'Content-Range': "bytes */" + fileRef.size                                                          // 1535
              });                                                                                                   //
              http.response.end();                                                                                  // 1533
              break;                                                                                                // 1537
            case '200':                                                                                             // 1519
              if (self.debug) {                                                                                     // 1539
                console.info("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [200]");          // 1539
              }                                                                                                     //
              stream = fs.createReadStream(fileRef.path);                                                           // 1539
              stream.on('open', (function(_this) {                                                                  // 1539
                return function() {                                                                                 //
                  http.response.writeHead(200);                                                                     // 1542
                  if (self.throttle) {                                                                              // 1543
                    return stream.pipe(new Throttle({                                                               //
                      bps: self.throttle,                                                                           // 1544
                      chunksize: self.chunkSize                                                                     // 1544
                    })).pipe(http.response);                                                                        //
                  } else {                                                                                          //
                    return stream.pipe(http.response);                                                              //
                  }                                                                                                 //
                };                                                                                                  //
              })(this)).on('error', streamErrorHandler);                                                            //
              break;                                                                                                // 1549
            case '206':                                                                                             // 1519
              if (self.debug) {                                                                                     // 1551
                console.info("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [206]");          // 1551
              }                                                                                                     //
              http.response.setHeader('Content-Range', "bytes " + reqRange.start + "-" + reqRange.end + "/" + fileRef.size);
              http.response.setHeader('Trailer', 'expires');                                                        // 1551
              http.response.setHeader('Transfer-Encoding', 'chunked');                                              // 1551
              if (self.throttle) {                                                                                  // 1555
                stream = fs.createReadStream(fileRef.path, {                                                        // 1556
                  start: reqRange.start,                                                                            // 1556
                  end: reqRange.end                                                                                 // 1556
                });                                                                                                 //
                stream.on('open', function() {                                                                      // 1556
                  return http.response.writeHead(206);                                                              //
                }).on('error', streamErrorHandler).on('end', function() {                                           //
                  return http.response.end();                                                                       //
                }).pipe(new Throttle({                                                                              //
                  bps: self.throttle,                                                                               // 1560
                  chunksize: self.chunkSize                                                                         // 1560
                })).pipe(http.response);                                                                            //
              } else {                                                                                              //
                stream = fs.createReadStream(fileRef.path, {                                                        // 1563
                  start: reqRange.start,                                                                            // 1563
                  end: reqRange.end                                                                                 // 1563
                });                                                                                                 //
                stream.on('open', function() {                                                                      // 1563
                  return http.response.writeHead(206);                                                              //
                }).on('error', streamErrorHandler).on('end', function() {                                           //
                  return http.response.end();                                                                       //
                }).pipe(http.response);                                                                             //
              }                                                                                                     //
              break;                                                                                                // 1568
          }                                                                                                         // 1519
        });                                                                                                         //
      });                                                                                                           //
    } else {                                                                                                        //
      return this._404(http);                                                                                       // 1571
    }                                                                                                               //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1574
  /*                                                                                                                // 1574
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name link                                                                                                        //
  @param {Object}   fileRef - File reference object                                                                 //
  @param {String}   version - [Optional] Version of file you would like to request                                  //
  @summary Returns downloadable URL                                                                                 //
  @returns {String} Empty string returned in case if file not found in DB                                           //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.link = function(fileRef, version) {                                                     // 95
    if (version == null) {                                                                                          //
      version = 'original';                                                                                         //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 1584
      console.info('[FilesCollection] [link()]');                                                                   // 1584
    }                                                                                                               //
    if (_.isString(fileRef)) {                                                                                      // 1585
      version = fileRef;                                                                                            // 1586
      fileRef = null;                                                                                               // 1586
    }                                                                                                               //
    if (!fileRef && !this.currentFile) {                                                                            // 1588
      return '';                                                                                                    // 1588
    }                                                                                                               //
    return formatFleURL(fileRef || this.currentFile, version);                                                      // 1589
  };                                                                                                                //
                                                                                                                    //
  return FilesCollection;                                                                                           //
                                                                                                                    //
})();                                                                                                               //
                                                                                                                    //
                                                                                                                    // 1591
/*                                                                                                                  // 1591
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
  var ext, ref, root;                                                                                               // 1602
  if (version == null) {                                                                                            //
    version = 'original';                                                                                           //
  }                                                                                                                 //
  root = __meteor_runtime_config__.ROOT_URL.replace(/\/+$/, '');                                                    // 1602
  if ((fileRef != null ? (ref = fileRef.extension) != null ? ref.length : void 0 : void 0) > 0) {                   // 1604
    ext = '.' + fileRef.extension;                                                                                  // 1605
  } else {                                                                                                          //
    ext = '';                                                                                                       // 1607
  }                                                                                                                 //
  if (fileRef["public"] === true) {                                                                                 // 1609
    return root + (version === 'original' ? fileRef._downloadRoute + "/" + fileRef._id + ext : fileRef._downloadRoute + "/" + version + "-" + fileRef._id + ext);
  } else {                                                                                                          //
    return root + (fileRef._downloadRoute + "/" + fileRef._collectionName + "/" + fileRef._id + "/" + version + "/" + fileRef._id + ext);
  }                                                                                                                 //
};                                                                                                                  // 1601
                                                                                                                    //
if (Meteor.isClient) {                                                                                              // 1614
                                                                                                                    // 1615
  /*                                                                                                                // 1615
  @locus Client                                                                                                     //
  @TemplateHelper                                                                                                   //
  @name fileURL                                                                                                     //
  @param {Object} fileRef - File reference object                                                                   //
  @param {String} version - [Optional] Version of file you would like to request                                    //
  @summary Get download URL for file by fileRef, even without subscription                                          //
  @example {{fileURL fileRef}}                                                                                      //
  @returns {String}                                                                                                 //
   */                                                                                                               //
  Template.registerHelper('fileURL', function(fileRef, version) {                                                   // 1615
    if (!fileRef || !_.isObject(fileRef)) {                                                                         // 1626
      return void 0;                                                                                                // 1626
    }                                                                                                               //
    version = !version || !_.isString(version) ? 'original' : version;                                              // 1626
    if (fileRef._id) {                                                                                              // 1628
      return formatFleURL(fileRef, version);                                                                        // 1629
    } else {                                                                                                        //
      return '';                                                                                                    // 1631
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
