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
var NOOP, Throttle, bound, events, fileType, formatFleURL, fs, nodePath, request, sortNumber;                       // 1
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
  @var {Object} bound - Meteor.bindEnvironment (Fiber wrapper)                                                      //
   */                                                                                                               //
  bound = Meteor.bindEnvironment(function(callback) {                                                               // 4
    return callback();                                                                                              // 17
  });                                                                                                               //
                                                                                                                    // 19
  /*                                                                                                                // 19
  @var {Function} sortNumber - Natural Number sort                                                                  //
   */                                                                                                               //
  sortNumber = function(a, b) {                                                                                     // 4
    return a - b;                                                                                                   // 22
  };                                                                                                                //
}                                                                                                                   //
                                                                                                                    //
                                                                                                                    // 24
/*                                                                                                                  // 24
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
  var FileUpload, UploadInstance;                                                                                   // 59
                                                                                                                    //
  FilesCollection.prototype.__proto__ = (function() {                                                               // 59
    if (Meteor.isServer) {                                                                                          // 59
      return events.EventEmitter.prototype;                                                                         //
    } else {                                                                                                        //
      return EventEmitter.prototype;                                                                                //
    }                                                                                                               //
  })();                                                                                                             //
                                                                                                                    //
  function FilesCollection(config) {                                                                                // 60
    var _methods, cookie, localStorageSupport, self;                                                                // 61
    if (Meteor.isServer) {                                                                                          // 61
      events.EventEmitter.call(this);                                                                               // 62
    } else {                                                                                                        //
      EventEmitter.call(this);                                                                                      // 64
    }                                                                                                               //
    if (config) {                                                                                                   // 65
      this.storagePath = config.storagePath, this.collectionName = config.collectionName, this.downloadRoute = config.downloadRoute, this.schema = config.schema, this.chunkSize = config.chunkSize, this.namingFunction = config.namingFunction, this.debug = config.debug, this.onbeforeunloadMessage = config.onbeforeunloadMessage, this.permissions = config.permissions, this.parentDirPermissions = config.parentDirPermissions, this.allowClientCode = config.allowClientCode, this.onBeforeUpload = config.onBeforeUpload, this.integrityCheck = config.integrityCheck, this["protected"] = config["protected"], this["public"] = config["public"], this.strict = config.strict, this.downloadCallback = config.downloadCallback, this.cacheControl = config.cacheControl, this.throttle = config.throttle, this.onAfterUpload = config.onAfterUpload, this.interceptDownload = config.interceptDownload, this.onBeforeRemove = config.onBeforeRemove;
    }                                                                                                               //
    self = this;                                                                                                    // 61
    cookie = new Cookies();                                                                                         // 61
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
    this.chunkSize = Math.floor(this.chunkSize / 8) * 8;                                                            // 61
    if (this["public"] && !this.downloadRoute) {                                                                    // 74
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: \"downloadRoute\" must be explicitly provided on \"public\" collections! Note: \"downloadRoute\" must be equal on be inside of your web/proxy-server (relative) root.");
    }                                                                                                               //
    if (this.downloadRoute == null) {                                                                               //
      this.downloadRoute = '/cdn/storage';                                                                          //
    }                                                                                                               //
    this.downloadRoute = this.downloadRoute.replace(/\/$/, '');                                                     // 61
    if (this.collectionName == null) {                                                                              //
      this.collectionName = 'MeteorUploadFiles';                                                                    //
    }                                                                                                               //
    if (this.namingFunction == null) {                                                                              //
      this.namingFunction = false;                                                                                  //
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
    if (Meteor.isClient) {                                                                                          // 84
      if (this.onbeforeunloadMessage == null) {                                                                     //
        this.onbeforeunloadMessage = 'Upload in a progress... Do you want to abort?';                               //
      }                                                                                                             //
      delete this.strict;                                                                                           // 85
      delete this.throttle;                                                                                         // 85
      delete this.storagePath;                                                                                      // 85
      delete this.permissions;                                                                                      // 85
      delete this.parentDirPermissions;                                                                             // 85
      delete this.cacheControl;                                                                                     // 85
      delete this.onAfterUpload;                                                                                    // 85
      delete this.integrityCheck;                                                                                   // 85
      delete this.downloadCallback;                                                                                 // 85
      delete this.interceptDownload;                                                                                // 85
      delete this.onBeforeRemove;                                                                                   // 85
      if (this["protected"]) {                                                                                      // 98
        localStorageSupport = (function() {                                                                         // 99
          var support;                                                                                              // 100
          try {                                                                                                     // 100
            support = "localStorage" in window && window.localStorage !== null;                                     // 101
            if (support) {                                                                                          // 102
              window.localStorage.setItem('___test___', 'test');                                                    // 103
              window.localStorage.removeItem('___test___');                                                         // 103
              return true;                                                                                          // 105
            } else {                                                                                                //
              return false;                                                                                         // 107
            }                                                                                                       //
          } catch (_error) {                                                                                        //
            return false;                                                                                           // 109
          }                                                                                                         //
        })();                                                                                                       //
        if (localStorageSupport) {                                                                                  // 111
          if (!cookie.has('meteor_login_token') && window.localStorage.getItem('Meteor.loginToken')) {              // 112
            cookie.set('meteor_login_token', window.localStorage.getItem('Meteor.loginToken'), null, '/');          // 113
          }                                                                                                         //
        }                                                                                                           //
      }                                                                                                             //
      check(this.onbeforeunloadMessage, Match.OneOf(String, Function));                                             // 85
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
      if (this["public"] && !this.storagePath) {                                                                    // 127
        throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "] \"storagePath\" must be set on \"public\" collections! Note: \"storagePath\" must be equal on be inside of your web/proxy-server (absolute) root.");
      }                                                                                                             //
      if (this.storagePath == null) {                                                                               //
        this.storagePath = "assets/app/uploads/" + this.collectionName;                                             //
      }                                                                                                             //
      this.storagePath = this.storagePath.replace(/\/$/, '');                                                       // 117
      this.storagePath = nodePath.normalize(this.storagePath);                                                      // 117
      fs.mkdirs(this.storagePath, {                                                                                 // 117
        mode: this.parentDirPermissions                                                                             // 133
      }, function(error) {                                                                                          //
        if (error) {                                                                                                // 134
          throw new Meteor.Error(401, "[FilesCollection." + self.collectionName + "] Path " + self.storagePath + " is not writable!", error);
        }                                                                                                           //
      });                                                                                                           //
      check(this.strict, Boolean);                                                                                  // 117
      check(this.throttle, Match.OneOf(false, Number));                                                             // 117
      check(this.permissions, Number);                                                                              // 117
      check(this.storagePath, String);                                                                              // 117
      check(this.cacheControl, String);                                                                             // 117
      check(this.onAfterUpload, Match.OneOf(false, Function));                                                      // 117
      check(this.integrityCheck, Boolean);                                                                          // 117
      check(this.onBeforeRemove, Match.OneOf(false, Function));                                                     // 117
      check(this.downloadCallback, Match.OneOf(false, Function));                                                   // 117
      check(this.interceptDownload, Match.OneOf(false, Function));                                                  // 117
    }                                                                                                               //
    if (!this.schema) {                                                                                             // 149
      this.schema = {                                                                                               // 150
        size: {                                                                                                     // 151
          type: Number                                                                                              // 151
        },                                                                                                          //
        name: {                                                                                                     // 151
          type: String                                                                                              // 152
        },                                                                                                          //
        type: {                                                                                                     // 151
          type: String                                                                                              // 153
        },                                                                                                          //
        path: {                                                                                                     // 151
          type: String                                                                                              // 154
        },                                                                                                          //
        isVideo: {                                                                                                  // 151
          type: Boolean                                                                                             // 155
        },                                                                                                          //
        isAudio: {                                                                                                  // 151
          type: Boolean                                                                                             // 156
        },                                                                                                          //
        isImage: {                                                                                                  // 151
          type: Boolean                                                                                             // 157
        },                                                                                                          //
        isText: {                                                                                                   // 151
          type: Boolean                                                                                             // 158
        },                                                                                                          //
        isJSON: {                                                                                                   // 151
          type: Boolean                                                                                             // 159
        },                                                                                                          //
        _prefix: {                                                                                                  // 151
          type: String                                                                                              // 160
        },                                                                                                          //
        extension: {                                                                                                // 151
          type: String,                                                                                             // 162
          optional: true                                                                                            // 162
        },                                                                                                          //
        _storagePath: {                                                                                             // 151
          type: String                                                                                              // 164
        },                                                                                                          //
        _downloadRoute: {                                                                                           // 151
          type: String                                                                                              // 165
        },                                                                                                          //
        _collectionName: {                                                                                          // 151
          type: String                                                                                              // 166
        },                                                                                                          //
        "public": {                                                                                                 // 151
          type: Boolean,                                                                                            // 168
          optional: true                                                                                            // 168
        },                                                                                                          //
        meta: {                                                                                                     // 151
          type: Object,                                                                                             // 171
          blackbox: true,                                                                                           // 171
          optional: true                                                                                            // 171
        },                                                                                                          //
        userId: {                                                                                                   // 151
          type: String,                                                                                             // 175
          optional: true                                                                                            // 175
        },                                                                                                          //
        updatedAt: {                                                                                                // 151
          type: Date,                                                                                               // 178
          autoValue: function() {                                                                                   // 178
            return new Date();                                                                                      //
          }                                                                                                         //
        },                                                                                                          //
        versions: {                                                                                                 // 151
          type: Object,                                                                                             // 181
          blackbox: true                                                                                            // 181
        }                                                                                                           //
      };                                                                                                            //
    }                                                                                                               //
    check(this.debug, Boolean);                                                                                     // 61
    check(this.schema, Object);                                                                                     // 61
    check(this["public"], Boolean);                                                                                 // 61
    check(this["protected"], Match.OneOf(Boolean, Function));                                                       // 61
    check(this.chunkSize, Number);                                                                                  // 61
    check(this.downloadRoute, String);                                                                              // 61
    check(this.collectionName, String);                                                                             // 61
    check(this.namingFunction, Match.OneOf(false, Function));                                                       // 61
    check(this.onBeforeUpload, Match.OneOf(false, Function));                                                       // 61
    check(this.allowClientCode, Boolean);                                                                           // 61
    if (this["public"] && this["protected"]) {                                                                      // 195
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: Files can not be public and protected at the same time!");
    }                                                                                                               //
    this.cursor = null;                                                                                             // 61
    this.search = {};                                                                                               // 61
    this.collection = new Mongo.Collection(this.collectionName);                                                    // 61
    this.currentFile = null;                                                                                        // 61
    this._prefix = SHA256(this.collectionName + this.downloadRoute);                                                // 61
    this.checkAccess = function(http) {                                                                             // 61
      var rc, result, text, user, userFuncs, userId;                                                                // 205
      if (self["protected"]) {                                                                                      // 205
        user = false;                                                                                               // 206
        userFuncs = self.getUser(http);                                                                             // 206
        user = userFuncs.user, userId = userFuncs.userId;                                                           // 206
        user = user();                                                                                              // 206
        if (_.isFunction(self["protected"])) {                                                                      // 211
          result = http ? self["protected"].call(_.extend(http, userFuncs), self.currentFile || null) : self["protected"].call(userFuncs, self.currentFile || null);
        } else {                                                                                                    //
          result = !!user;                                                                                          // 214
        }                                                                                                           //
        if ((http && result === true) || !http) {                                                                   // 216
          return true;                                                                                              // 217
        } else {                                                                                                    //
          rc = _.isNumber(result) ? result : 401;                                                                   // 219
          if (self.debug) {                                                                                         // 220
            console.warn('[FilesCollection.checkAccess] WARN: Access denied!');                                     // 220
          }                                                                                                         //
          if (http) {                                                                                               // 221
            text = 'Access denied!';                                                                                // 222
            http.response.writeHead(rc, {                                                                           // 222
              'Content-Length': text.length,                                                                        // 224
              'Content-Type': 'text/plain'                                                                          // 224
            });                                                                                                     //
            http.response.end(text);                                                                                // 222
          }                                                                                                         //
          return false;                                                                                             // 227
        }                                                                                                           //
      } else {                                                                                                      //
        return true;                                                                                                // 229
      }                                                                                                             //
    };                                                                                                              //
    this.methodNames = {                                                                                            // 61
      MeteorFileAbort: "MeteorFileAbort" + this._prefix,                                                            // 232
      MeteorFileWrite: "MeteorFileWrite" + this._prefix,                                                            // 232
      MeteorFileUnlink: "MeteorFileUnlink" + this._prefix                                                           // 232
    };                                                                                                              //
    if (Meteor.isServer) {                                                                                          // 236
      this.on('handleUpload', this.handleUpload);                                                                   // 237
      this.on('finishUpload', this.finishUpload);                                                                   // 237
      WebApp.connectHandlers.use(function(request, response, next) {                                                // 237
        var _file, body, http, params, uri, uris, version;                                                          // 241
        if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName + "/__upload")) {     // 241
          if (request.method === 'POST') {                                                                          // 242
            body = '';                                                                                              // 243
            request.on('data', function(data) {                                                                     // 243
              return bound(function() {                                                                             //
                body += data;                                                                                       // 245
              });                                                                                                   //
            });                                                                                                     //
            request.on('end', function() {                                                                          // 243
              return bound(function() {                                                                             //
                var e, opts, ref, result, user;                                                                     // 248
                try {                                                                                               // 248
                  opts = JSON.parse(body);                                                                          // 249
                  user = self.getUser(http);                                                                        // 249
                  ref = self.prepareUpload(opts, user.userId, 'HTTP'), result = ref.result, opts = ref.opts;        // 249
                  if (opts.eof) {                                                                                   // 253
                    try {                                                                                           // 254
                      Meteor.wrapAsync(self.handleUpload.bind(self, result, opts))();                               // 255
                      response.writeHead(200);                                                                      // 255
                      response.end(JSON.stringify(result));                                                         // 255
                      return;                                                                                       // 258
                    } catch (_error) {                                                                              //
                      e = _error;                                                                                   // 260
                      console.warn("[FilesCollection] [Write Method] [HTTP] Exception:", e);                        // 260
                      response.writeHead(500);                                                                      // 260
                      response.end(JSON.stringify({                                                                 // 260
                        error: 2                                                                                    // 262
                      }));                                                                                          //
                    }                                                                                               //
                  } else {                                                                                          //
                    self.emit('handleUpload', result, opts, NOOP);                                                  // 264
                  }                                                                                                 //
                  response.writeHead(200);                                                                          // 249
                  response.end(JSON.stringify({                                                                     // 249
                    success: true                                                                                   // 267
                  }));                                                                                              //
                } catch (_error) {                                                                                  //
                  e = _error;                                                                                       // 269
                  console.warn("[FilesCollection] [Write Method] [HTTP] Exception:", e);                            // 269
                  response.writeHead(500);                                                                          // 269
                  response.end(JSON.stringify({                                                                     // 269
                    error: e                                                                                        // 271
                  }));                                                                                              //
                }                                                                                                   //
              });                                                                                                   //
            });                                                                                                     //
          } else {                                                                                                  //
            next();                                                                                                 // 274
          }                                                                                                         //
          return;                                                                                                   // 275
        }                                                                                                           //
        if (!self["public"]) {                                                                                      // 277
          if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName)) {                 // 278
            uri = request._parsedUrl.path.replace(self.downloadRoute + "/" + self.collectionName, '');              // 279
            if (uri.indexOf('/') === 0) {                                                                           // 280
              uri = uri.substring(1);                                                                               // 281
            }                                                                                                       //
            uris = uri.split('/');                                                                                  // 279
            if (uris.length === 3) {                                                                                // 284
              params = {                                                                                            // 285
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                _id: uris[0],                                                                                       // 286
                version: uris[1],                                                                                   // 286
                name: uris[2]                                                                                       // 286
              };                                                                                                    //
              http = {                                                                                              // 285
                request: request,                                                                                   // 290
                response: response,                                                                                 // 290
                params: params                                                                                      // 290
              };                                                                                                    //
              if (self.checkAccess(http)) {                                                                         // 291
                self.findOne(uris[0]).download.call(self, http, uris[1]);                                           // 291
              }                                                                                                     //
            } else {                                                                                                //
              next();                                                                                               // 293
            }                                                                                                       //
          } else {                                                                                                  //
            next();                                                                                                 // 295
          }                                                                                                         //
        } else {                                                                                                    //
          if (!!~request._parsedUrl.path.indexOf("" + self.downloadRoute)) {                                        // 297
            uri = request._parsedUrl.path.replace("" + self.downloadRoute, '');                                     // 298
            if (uri.indexOf('/') === 0) {                                                                           // 299
              uri = uri.substring(1);                                                                               // 300
            }                                                                                                       //
            uris = uri.split('/');                                                                                  // 298
            _file = uris[uris.length - 1];                                                                          // 298
            if (_file) {                                                                                            // 304
              if (!!~_file.indexOf('-')) {                                                                          // 305
                version = _file.split('-')[0];                                                                      // 306
                _file = _file.split('-')[1].split('?')[0];                                                          // 306
              } else {                                                                                              //
                version = 'original';                                                                               // 309
                _file = _file.split('?')[0];                                                                        // 309
              }                                                                                                     //
              params = {                                                                                            // 305
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                file: _file,                                                                                        // 313
                _id: _file.split('.')[0],                                                                           // 313
                version: version,                                                                                   // 313
                name: _file                                                                                         // 313
              };                                                                                                    //
              http = {                                                                                              // 305
                request: request,                                                                                   // 318
                response: response,                                                                                 // 318
                params: params                                                                                      // 318
              };                                                                                                    //
              self.findOne(params._id).download.call(self, http, version);                                          // 305
            } else {                                                                                                //
              next();                                                                                               // 321
            }                                                                                                       //
          } else {                                                                                                  //
            next();                                                                                                 // 323
          }                                                                                                         //
        }                                                                                                           //
      });                                                                                                           //
      _methods = {};                                                                                                // 237
      _methods[self.methodNames.MeteorFileUnlink] = function(search) {                                              // 237
        var user, userFuncs;                                                                                        // 328
        check(search, Match.OneOf(String, Object));                                                                 // 328
        if (self.debug) {                                                                                           // 329
          console.info("[FilesCollection] [Unlink Method] [.remove(" + search + ")]");                              // 329
        }                                                                                                           //
        if (self.allowClientCode) {                                                                                 // 331
          if (self.onBeforeRemove && _.isFunction(self.onBeforeRemove)) {                                           // 332
            user = false;                                                                                           // 333
            userFuncs = {                                                                                           // 333
              userId: this.userId,                                                                                  // 334
              user: function() {                                                                                    // 334
                if (Meteor.users) {                                                                                 // 336
                  return Meteor.users.findOne(this.userId);                                                         //
                } else {                                                                                            //
                  return void 0;                                                                                    //
                }                                                                                                   //
              }                                                                                                     //
            };                                                                                                      //
            if (!self.onBeforeRemove.call(userFuncs, self.find(search) || null)) {                                  // 339
              throw new Meteor.Error(403, '[FilesCollection] [remove] Not permitted!');                             // 340
            }                                                                                                       //
          }                                                                                                         //
          self.remove(search);                                                                                      // 332
          return true;                                                                                              // 343
        } else {                                                                                                    //
          throw new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!');           // 345
        }                                                                                                           //
      };                                                                                                            //
      _methods[self.methodNames.MeteorFileWrite] = function(opts) {                                                 // 237
        var e, ref, result;                                                                                         // 349
        this.unblock();                                                                                             // 349
        check(opts, {                                                                                               // 349
          eof: Match.Optional(Boolean),                                                                             // 350
          file: Object,                                                                                             // 350
          fileId: String,                                                                                           // 350
          FSName: Match.Optional(String),                                                                           // 350
          binData: Match.Optional(String),                                                                          // 350
          chunkId: Match.Optional(Number),                                                                          // 350
          chunkSize: Number,                                                                                        // 350
          fileLength: Number                                                                                        // 350
        });                                                                                                         //
        ref = self.prepareUpload(opts, this.userId, 'DDP'), result = ref.result, opts = ref.opts;                   // 349
        if (opts.eof) {                                                                                             // 363
          try {                                                                                                     // 364
            return Meteor.wrapAsync(self.handleUpload.bind(self, result, opts))();                                  // 365
          } catch (_error) {                                                                                        //
            e = _error;                                                                                             // 367
            if (self.debug) {                                                                                       // 367
              console.warn("[FilesCollection] [Write Method] [DDP] Exception:", e);                                 // 367
            }                                                                                                       //
            throw e;                                                                                                // 368
          }                                                                                                         //
        } else {                                                                                                    //
          self.emit('handleUpload', result, opts, NOOP);                                                            // 370
        }                                                                                                           //
        return true;                                                                                                // 371
      };                                                                                                            //
      _methods[self.methodNames.MeteorFileAbort] = function(opts) {                                                 // 237
        var ext, path, ref;                                                                                         // 374
        check(opts, {                                                                                               // 374
          fileId: String,                                                                                           // 374
          fileData: Object,                                                                                         // 374
          fileLength: Number                                                                                        // 374
        });                                                                                                         //
        ext = "." + opts.fileData.ext;                                                                              // 374
        path = self.storagePath + "/" + opts.fileId + ext;                                                          // 374
        if (self.debug) {                                                                                           // 383
          console.info("[FilesCollection] [Abort Method]: For " + path);                                            // 383
        }                                                                                                           //
        if ((ref = self._writableStreams) != null ? ref[opts.fileId] : void 0) {                                    // 384
          self._writableStreams[opts.fileId].stream.end();                                                          // 385
          delete self._writableStreams[opts.fileId];                                                                // 385
          self.remove({                                                                                             // 385
            _id: opts.fileId                                                                                        // 387
          });                                                                                                       //
          self.unlink({                                                                                             // 385
            _id: opts.fileId,                                                                                       // 388
            path: path                                                                                              // 388
          });                                                                                                       //
        }                                                                                                           //
        return true;                                                                                                // 390
      };                                                                                                            //
      Meteor.methods(_methods);                                                                                     // 237
    }                                                                                                               //
  }                                                                                                                 //
                                                                                                                    //
                                                                                                                    // 393
  /*                                                                                                                // 393
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name prepareUpload                                                                                               //
  @summary Internal method. Used to optimize received data and check upload permission                              //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.prepareUpload = Meteor.isServer ? function(opts, userId, transport) {                   // 59
    var extension, extensionWithDot, fileName, isUploadAllowed, ref, result;                                        // 401
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
    if (opts.FSName == null) {                                                                                      //
      opts.FSName = opts.fileId;                                                                                    //
    }                                                                                                               //
    fileName = this.getFileName(opts.file);                                                                         // 401
    ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                // 401
    result = opts.file;                                                                                             // 401
    result.path = this.storagePath + "/" + opts.FSName + extensionWithDot;                                          // 401
    result.name = fileName;                                                                                         // 401
    result.meta = opts.file.meta;                                                                                   // 401
    result.extension = extension;                                                                                   // 401
    result.ext = extension;                                                                                         // 401
    result = this.dataToSchema(result);                                                                             // 401
    result._id = opts.fileId;                                                                                       // 401
    if (userId) {                                                                                                   // 418
      result.userId = userId;                                                                                       // 418
    }                                                                                                               //
    if (this.debug) {                                                                                               // 420
      console.info("[FilesCollection] [Write Method] [" + transport + "] Got #" + opts.chunkId + "/" + opts.fileLength + " chunks, dst: " + (opts.file.name || opts.file.fileName));
    }                                                                                                               //
    if (this.onBeforeUpload && _.isFunction(this.onBeforeUpload)) {                                                 // 422
      isUploadAllowed = this.onBeforeUpload.call(_.extend({                                                         // 423
        file: opts.file                                                                                             // 423
      }, {                                                                                                          //
        userId: result.userId,                                                                                      // 425
        user: function() {                                                                                          // 425
          if (Meteor.users) {                                                                                       // 427
            return Meteor.users.findOne(result.userId);                                                             //
          } else {                                                                                                  //
            return void 0;                                                                                          //
          }                                                                                                         //
        },                                                                                                          //
        chunkId: opts.chunkId,                                                                                      // 425
        eof: opts.eof                                                                                               // 425
      }), result);                                                                                                  //
      if (isUploadAllowed !== true) {                                                                               // 432
        throw new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : '@onBeforeUpload() returned false');
      }                                                                                                             //
    }                                                                                                               //
    return {                                                                                                        // 435
      result: result,                                                                                               // 435
      opts: opts                                                                                                    // 435
    };                                                                                                              //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 438
  /*                                                                                                                // 438
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name finishUpload                                                                                                //
  @summary Internal method. Finish upload, close Writable stream, add recored to MongoDB and flush used memory      //
  @returns {undefined}                                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.finishUpload = Meteor.isServer ? function(result, opts, cb) {                           // 59
    var self;                                                                                                       // 446
    fs.chmod(result.path, this.permissions, NOOP);                                                                  // 446
    self = this;                                                                                                    // 446
    result.type = this.getMimeType(opts.file);                                                                      // 446
    result["public"] = this["public"];                                                                              // 446
    this.collection.insert(_.clone(result), function(error, _id) {                                                  // 446
      if (error) {                                                                                                  // 452
        return cb(new Meteor.Error(500, error));                                                                    //
      } else {                                                                                                      //
        result._id = _id;                                                                                           // 455
        if (self.debug) {                                                                                           // 456
          console.info("[FilesCollection] [Write Method] [finishUpload] -> " + result.path);                        // 456
        }                                                                                                           //
        self.onAfterUpload && self.onAfterUpload.call(self, result);                                                // 455
        self.emit('afterUpload', result);                                                                           // 455
        return cb(null, result);                                                                                    //
      }                                                                                                             //
    });                                                                                                             //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 463
  /*                                                                                                                // 463
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name handleUpload                                                                                                //
  @summary Internal method to handle upload process, pipe incoming data to Writable stream                          //
  @returns {undefined}                                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.handleUpload = Meteor.isServer ? function(result, opts, cb) {                           // 59
    var base, binary, e, name, self, start, writeDelayed;                                                           // 471
    self = this;                                                                                                    // 471
    if (opts.eof) {                                                                                                 // 472
      binary = opts.binData;                                                                                        // 473
    } else {                                                                                                        //
      binary = new Buffer(opts.binData, 'base64');                                                                  // 475
    }                                                                                                               //
    try {                                                                                                           // 477
      writeDelayed = function() {                                                                                   // 478
        var chunk, chunks, j, len, ref;                                                                             // 479
        chunks = Object.keys(self._writableStreams[result._id].delayed);                                            // 479
        if (chunks.length) {                                                                                        // 480
          chunks.sort(sortNumber);                                                                                  // 481
          for (j = 0, len = chunks.length; j < len; j++) {                                                          // 482
            chunk = chunks[j];                                                                                      //
            if (self._writableStreams[result._id].stream.bytesWritten === opts.chunkSize * (chunk - 1)) {           // 483
              self._writableStreams[result._id].stream.write((ref = self._writableStreams[result._id].delayed) != null ? ref[chunk] : void 0);
              delete self._writableStreams[result._id].delayed[chunk];                                              // 484
            }                                                                                                       //
          }                                                                                                         // 482
        }                                                                                                           //
        return true;                                                                                                // 486
      };                                                                                                            //
      if ((base = this._writableStreams)[name = result._id] == null) {                                              //
        base[name] = {                                                                                              //
          stream: fs.createWriteStream(result.path, {                                                               // 489
            flags: 'a',                                                                                             // 489
            mode: this.permissions                                                                                  // 489
          }),                                                                                                       //
          delayed: {}                                                                                               // 489
        };                                                                                                          //
      }                                                                                                             //
      if (opts.eof) {                                                                                               // 492
        writeDelayed();                                                                                             // 493
        this._writableStreams[result._id].stream.end();                                                             // 493
        delete this._writableStreams[result._id];                                                                   // 493
        this.emit('finishUpload', result, opts, cb);                                                                // 493
      } else if (opts.chunkId === 1) {                                                                              //
        this._writableStreams[result._id].stream.write(binary);                                                     // 499
        this._writableStreams[result._id].stream.on('drain', function() {                                           // 499
          writeDelayed();                                                                                           // 501
        });                                                                                                         //
      } else if (opts.chunkId > 0) {                                                                                //
        start = opts.chunkSize * (opts.chunkId - 1);                                                                // 505
        this._writableStreams[result._id].delayed[opts.chunkId] = binary;                                           // 505
        writeDelayed();                                                                                             // 505
      }                                                                                                             //
    } catch (_error) {                                                                                              //
      e = _error;                                                                                                   // 510
      cb && cb(e);                                                                                                  // 510
    }                                                                                                               //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 514
  /*                                                                                                                // 514
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getMimeType                                                                                                 //
  @param {Object} fileData - File Object                                                                            //
  @summary Returns file's mime-type                                                                                 //
  @returns {String}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getMimeType = function(fileData) {                                                      // 59
    var br, buf, error, ext, fd, mime, ref;                                                                         // 523
    check(fileData, Object);                                                                                        // 523
    if (fileData != null ? fileData.type : void 0) {                                                                // 524
      mime = fileData.type;                                                                                         // 524
    }                                                                                                               //
    if (Meteor.isServer && fileData.path && (!mime || !_.isString(mime))) {                                         // 525
      try {                                                                                                         // 526
        buf = new Buffer(262);                                                                                      // 527
        fd = fs.openSync(fileData.path, 'r');                                                                       // 527
        br = fs.readSync(fd, buf, 0, 262, 0);                                                                       // 527
        fs.close(fd, NOOP);                                                                                         // 527
        if (br < 262) {                                                                                             // 531
          buf = buf.slice(0, br);                                                                                   // 531
        }                                                                                                           //
        ref = fileType(buf), mime = ref.mime, ext = ref.ext;                                                        // 527
      } catch (_error) {                                                                                            //
        error = _error;                                                                                             // 533
      }                                                                                                             //
    }                                                                                                               //
    if (!mime || !_.isString(mime)) {                                                                               // 534
      mime = 'application/octet-stream';                                                                            // 535
    }                                                                                                               //
    return mime;                                                                                                    // 536
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 538
  /*                                                                                                                // 538
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getFileName                                                                                                 //
  @param {Object} fileData - File Object                                                                            //
  @summary Returns file's name                                                                                      //
  @returns {String}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getFileName = function(fileData) {                                                      // 59
    var cleanName, fileName;                                                                                        // 547
    fileName = fileData.name || fileData.fileName;                                                                  // 547
    if (_.isString(fileName) && fileName.length > 0) {                                                              // 548
      cleanName = function(str) {                                                                                   // 549
        return str.replace(/\.\./g, '').replace(/\//g, '');                                                         //
      };                                                                                                            //
      return cleanName(fileData.name || fileData.fileName);                                                         // 550
    } else {                                                                                                        //
      return '';                                                                                                    // 552
    }                                                                                                               //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 554
  /*                                                                                                                // 554
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getUser                                                                                                     //
  @summary Returns object with `userId` and `user()` method which return user's object                              //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getUser = function(http) {                                                              // 59
    var cookie, result, user;                                                                                       // 562
    result = {                                                                                                      // 562
      user: function() {                                                                                            // 563
        return null;                                                                                                // 563
      },                                                                                                            //
      userId: null                                                                                                  // 563
    };                                                                                                              //
    if (Meteor.isServer) {                                                                                          // 566
      if (http) {                                                                                                   // 567
        cookie = http.request.Cookies;                                                                              // 568
        if (_.has(Package, 'accounts-base') && cookie.has('meteor_login_token')) {                                  // 569
          user = Meteor.users.findOne({                                                                             // 570
            'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(cookie.get('meteor_login_token'))   // 570
          });                                                                                                       //
          if (user) {                                                                                               // 571
            result.user = function() {                                                                              // 572
              return user;                                                                                          // 572
            };                                                                                                      //
            result.userId = user._id;                                                                               // 572
          }                                                                                                         //
        }                                                                                                           //
      }                                                                                                             //
    } else {                                                                                                        //
      if (_.has(Package, 'accounts-base') && Meteor.userId()) {                                                     // 575
        result.user = function() {                                                                                  // 576
          return Meteor.user();                                                                                     // 576
        };                                                                                                          //
        result.userId = Meteor.userId();                                                                            // 576
      }                                                                                                             //
    }                                                                                                               //
    return result;                                                                                                  // 578
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 580
  /*                                                                                                                // 580
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getExt                                                                                                      //
  @param {String} FileName - File name                                                                              //
  @summary Get extension from FileName                                                                              //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getExt = function(fileName) {                                                           // 59
    var extension;                                                                                                  // 589
    if (!!~fileName.indexOf('.')) {                                                                                 // 589
      extension = fileName.split('.').pop();                                                                        // 590
      return {                                                                                                      // 591
        ext: extension,                                                                                             // 591
        extension: extension,                                                                                       // 591
        extensionWithDot: '.' + extension                                                                           // 591
      };                                                                                                            //
    } else {                                                                                                        //
      return {                                                                                                      // 593
        ext: '',                                                                                                    // 593
        extension: '',                                                                                              // 593
        extensionWithDot: ''                                                                                        // 593
      };                                                                                                            //
    }                                                                                                               //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 595
  /*                                                                                                                // 595
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name dataToSchema                                                                                                //
  @param {Object} data - File data                                                                                  //
  @summary Build object in accordance with schema from File data                                                    //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.dataToSchema = function(data) {                                                         // 59
    return {                                                                                                        // 604
      name: data.name,                                                                                              // 604
      extension: data.extension,                                                                                    // 604
      path: data.path,                                                                                              // 604
      meta: data.meta,                                                                                              // 604
      type: data.type,                                                                                              // 604
      size: data.size,                                                                                              // 604
      versions: {                                                                                                   // 604
        original: {                                                                                                 // 612
          path: data.path,                                                                                          // 613
          size: data.size,                                                                                          // 613
          type: data.type,                                                                                          // 613
          extension: data.extension                                                                                 // 613
        }                                                                                                           //
      },                                                                                                            //
      isVideo: !!~data.type.toLowerCase().indexOf('video'),                                                         // 604
      isAudio: !!~data.type.toLowerCase().indexOf('audio'),                                                         // 604
      isImage: !!~data.type.toLowerCase().indexOf('image'),                                                         // 604
      isText: !!~data.type.toLowerCase().indexOf('text'),                                                           // 604
      isJSON: !!~data.type.toLowerCase().indexOf('json'),                                                           // 604
      _prefix: data._prefix || this._prefix,                                                                        // 604
      _storagePath: data._storagePath || this.storagePath,                                                          // 604
      _downloadRoute: data._downloadRoute || this.downloadRoute,                                                    // 604
      _collectionName: data._collectionName || this.collectionName                                                  // 604
    };                                                                                                              //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 628
  /*                                                                                                                // 628
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name srch                                                                                                        //
  @param {String|Object} search - Search data                                                                       //
  @summary Build search object                                                                                      //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.srch = function(search) {                                                               // 59
    if (search && _.isString(search)) {                                                                             // 637
      this.search = {                                                                                               // 638
        _id: search                                                                                                 // 639
      };                                                                                                            //
    } else {                                                                                                        //
      this.search = search || {};                                                                                   // 641
    }                                                                                                               //
    return this.search;                                                                                             //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 644
  /*                                                                                                                // 644
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name write                                                                                                       //
  @param {Buffer} buffer - Binary File's Buffer                                                                     //
  @param {Object} opts - Object with file-data                                                                      //
  @param {String} opts.name - File name, alias: `fileName`                                                          //
  @param {String} opts.type - File mime-type                                                                        //
  @param {Object} opts.meta - File additional meta-data                                                             //
  @param {Function} callback - function(error, fileObj){...}                                                        //
  @summary Write buffer to FS and add to FilesCollection Collection                                                 //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.write = Meteor.isServer ? function(buffer, opts, callback) {                            // 59
    var FSName, extension, extensionWithDot, fileId, fileName, ref, result, self, stream;                           // 658
    if (opts == null) {                                                                                             //
      opts = {};                                                                                                    //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 658
      console.info("[FilesCollection] [write()]");                                                                  // 658
    }                                                                                                               //
    if (_.isFunction(opts)) {                                                                                       // 660
      callback = opts;                                                                                              // 661
      opts = {};                                                                                                    // 661
    }                                                                                                               //
    check(opts, Match.Optional(Object));                                                                            // 658
    check(callback, Match.Optional(Function));                                                                      // 658
    fileId = Random.id();                                                                                           // 658
    FSName = this.namingFunction ? this.namingFunction() : fileId;                                                  // 658
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : FSName;                                    // 658
    ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                // 658
    self = this;                                                                                                    // 658
    if (opts == null) {                                                                                             //
      opts = {};                                                                                                    //
    }                                                                                                               //
    opts.path = this.storagePath + "/" + FSName + extensionWithDot;                                                 // 658
    opts.type = this.getMimeType(opts);                                                                             // 658
    if (opts.meta == null) {                                                                                        //
      opts.meta = {};                                                                                               //
    }                                                                                                               //
    if (opts.size == null) {                                                                                        //
      opts.size = buffer.length;                                                                                    //
    }                                                                                                               //
    result = this.dataToSchema({                                                                                    // 658
      name: fileName,                                                                                               // 681
      path: opts.path,                                                                                              // 681
      meta: opts.meta,                                                                                              // 681
      type: opts.type,                                                                                              // 681
      size: opts.size,                                                                                              // 681
      extension: extension                                                                                          // 681
    });                                                                                                             //
    result._id = fileId;                                                                                            // 658
    stream = fs.createWriteStream(opts.path, {                                                                      // 658
      flags: 'w',                                                                                                   // 690
      mode: this.permissions                                                                                        // 690
    });                                                                                                             //
    stream.end(buffer, function(error) {                                                                            // 658
      return bound(function() {                                                                                     //
        if (error) {                                                                                                // 692
          return callback && callback(error);                                                                       //
        } else {                                                                                                    //
          return self.collection.insert(_.clone(result), function(error) {                                          //
            if (error) {                                                                                            // 696
              callback && callback(error);                                                                          // 697
              if (self.debug) {                                                                                     // 698
                return console.warn("[FilesCollection] [write] [insert] Error: " + fileName + " -> " + self.collectionName, error);
              }                                                                                                     //
            } else {                                                                                                //
              callback && callback(null, result);                                                                   // 700
              if (self.debug) {                                                                                     // 701
                return console.info("[FilesCollection] [write]: " + fileName + " -> " + self.collectionName);       //
              }                                                                                                     //
            }                                                                                                       //
          });                                                                                                       //
        }                                                                                                           //
      });                                                                                                           //
    });                                                                                                             //
    return this;                                                                                                    // 702
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 706
  /*                                                                                                                // 706
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name load                                                                                                        //
  @param {String} url - URL to file                                                                                 //
  @param {Object} opts - Object with file-data                                                                      //
  @param {String} opts.name - File name, alias: `fileName`                                                          //
  @param {String} opts.type - File mime-type                                                                        //
  @param {Object} opts.meta - File additional meta-data                                                             //
  @param {Function} callback - function(error, fileObj){...}                                                        //
  @summary Download file, write stream to FS and add to FilesCollection Collection                                  //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.load = Meteor.isServer ? function(url, opts, callback) {                                // 59
    var FSName, extension, extensionWithDot, fileId, fileName, pathParts, ref, self;                                // 720
    if (this.debug) {                                                                                               // 720
      console.info("[FilesCollection] [load(" + url + ", " + (JSON.stringify(opts)) + ", callback)]");              // 720
    }                                                                                                               //
    if (_.isFunction(opts)) {                                                                                       // 722
      callback = opts;                                                                                              // 723
      opts = {};                                                                                                    // 723
    }                                                                                                               //
    check(url, String);                                                                                             // 720
    check(opts, Match.Optional(Object));                                                                            // 720
    check(callback, Match.Optional(Function));                                                                      // 720
    self = this;                                                                                                    // 720
    if (opts == null) {                                                                                             //
      opts = {};                                                                                                    //
    }                                                                                                               //
    fileId = Random.id();                                                                                           // 720
    FSName = this.namingFunction ? this.namingFunction() : fileId;                                                  // 720
    pathParts = url.split('/');                                                                                     // 720
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : pathParts[pathParts.length - 1] || FSName;
    ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                // 720
    opts.path = this.storagePath + "/" + FSName + extensionWithDot;                                                 // 720
    if (opts.meta == null) {                                                                                        //
      opts.meta = {};                                                                                               //
    }                                                                                                               //
    request.get(url).on('error', function(error) {                                                                  // 720
      return bound(function() {                                                                                     //
        throw new Meteor.Error(500, ("Error on [load(" + url + ")]:") + JSON.stringify(error));                     // 742
      });                                                                                                           //
    }).on('response', function(response) {                                                                          //
      return bound(function() {                                                                                     //
        var result;                                                                                                 // 745
        if (self.debug) {                                                                                           // 745
          console.info("[FilesCollection] [load] Received: " + url);                                                // 745
        }                                                                                                           //
        result = self.dataToSchema({                                                                                // 745
          name: fileName,                                                                                           // 748
          path: opts.path,                                                                                          // 748
          meta: opts.meta,                                                                                          // 748
          type: opts.type || response.headers['content-type'],                                                      // 748
          size: opts.size || parseInt(response.headers['content-length'] || 0),                                     // 748
          extension: extension                                                                                      // 748
        });                                                                                                         //
        result._id = fileId;                                                                                        // 745
        return self.collection.insert(_.clone(result), function(error) {                                            //
          if (error) {                                                                                              // 758
            callback && callback(error);                                                                            // 759
            if (self.debug) {                                                                                       // 760
              return console.warn("[FilesCollection] [load] [insert] Error: " + fileName + " -> " + self.collectionName, error);
            }                                                                                                       //
          } else {                                                                                                  //
            callback && callback(null, result);                                                                     // 762
            if (self.debug) {                                                                                       // 763
              return console.info("[FilesCollection] [load] [insert] " + fileName + " -> " + self.collectionName);  //
            }                                                                                                       //
          }                                                                                                         //
        });                                                                                                         //
      });                                                                                                           //
    }).pipe(fs.createWriteStream(opts.path, {                                                                       //
      flags: 'w',                                                                                                   // 764
      mode: this.permissions                                                                                        // 764
    }));                                                                                                            //
    return this;                                                                                                    // 766
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 770
  /*                                                                                                                // 770
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name addFile                                                                                                     //
  @param {String} path - Path to file                                                                               //
  @param {String} opts - Object with file-data                                                                      //
  @param {String} opts.type - File mime-type                                                                        //
  @param {Object} opts.meta - File additional meta-data                                                             //
  @param {Function} callback - function(error, fileObj){...}                                                        //
  @summary Add file from FS to FilesCollection                                                                      //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.addFile = Meteor.isServer ? function(path, opts, callback) {                            // 59
    var self;                                                                                                       // 783
    if (this.debug) {                                                                                               // 783
      console.info("[FilesCollection] [addFile(" + path + ")]");                                                    // 783
    }                                                                                                               //
    if (_.isFunction(opts)) {                                                                                       // 785
      callback = opts;                                                                                              // 786
      opts = {};                                                                                                    // 786
    }                                                                                                               //
    if (this["public"]) {                                                                                           // 789
      throw new Meteor.Error(403, 'Can not run [addFile] on public collection! Just Move file to root of your server, then add record to Collection');
    }                                                                                                               //
    check(path, String);                                                                                            // 783
    check(opts, Match.Optional(Object));                                                                            // 783
    check(callback, Match.Optional(Function));                                                                      // 783
    self = this;                                                                                                    // 783
    fs.stat(path, function(error, stats) {                                                                          // 783
      return bound(function() {                                                                                     //
        var extension, extensionWithDot, fileName, pathParts, ref, result;                                          // 796
        if (error) {                                                                                                // 796
          return callback && callback(error);                                                                       //
        } else if (stats.isFile()) {                                                                                //
          pathParts = path.split('/');                                                                              // 799
          fileName = pathParts[pathParts.length - 1];                                                               // 799
          ref = self.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;          // 799
          if (opts == null) {                                                                                       //
            opts = {};                                                                                              //
          }                                                                                                         //
          opts.path = path;                                                                                         // 799
          if (opts.type == null) {                                                                                  //
            opts.type = self.getMimeType(opts);                                                                     //
          }                                                                                                         //
          if (opts.meta == null) {                                                                                  //
            opts.meta = {};                                                                                         //
          }                                                                                                         //
          if (opts.size == null) {                                                                                  //
            opts.size = stats.size;                                                                                 //
          }                                                                                                         //
          result = self.dataToSchema({                                                                              // 799
            name: fileName,                                                                                         // 811
            path: path,                                                                                             // 811
            meta: opts.meta,                                                                                        // 811
            type: opts.type,                                                                                        // 811
            size: opts.size,                                                                                        // 811
            extension: extension,                                                                                   // 811
            _storagePath: path.replace("/" + fileName, '')                                                          // 811
          });                                                                                                       //
          result._id = Random.id();                                                                                 // 799
          return self.collection.insert(_.clone(result), function(error) {                                          //
            if (error) {                                                                                            // 822
              callback && callback(error);                                                                          // 823
              if (self.debug) {                                                                                     // 824
                return console.warn("[FilesCollection] [addFile] [insert] Error: " + fileName + " -> " + self.collectionName, error);
              }                                                                                                     //
            } else {                                                                                                //
              callback && callback(null, result);                                                                   // 826
              if (self.debug) {                                                                                     // 827
                return console.info("[FilesCollection] [addFile]: " + fileName + " -> " + self.collectionName);     //
              }                                                                                                     //
            }                                                                                                       //
          });                                                                                                       //
        } else {                                                                                                    //
          return callback && callback(new Meteor.Error(400, "[FilesCollection] [addFile(" + path + ")]: File does not exist"));
        }                                                                                                           //
      });                                                                                                           //
    });                                                                                                             //
    return this;                                                                                                    // 831
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 835
  /*                                                                                                                // 835
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name findOne                                                                                                     //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                  //
  @summary Load file                                                                                                //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.findOne = function(search) {                                                            // 59
    if (this.debug) {                                                                                               // 844
      console.info("[FilesCollection] [findOne(" + (JSON.stringify(search)) + ")]");                                // 844
    }                                                                                                               //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                     // 844
    this.srch(search);                                                                                              // 844
    if (this.checkAccess()) {                                                                                       // 848
      this.currentFile = this.collection.findOne(this.search);                                                      // 849
      this.cursor = null;                                                                                           // 849
    }                                                                                                               //
    return this;                                                                                                    // 851
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 853
  /*                                                                                                                // 853
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name find                                                                                                        //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                  //
  @summary Load file or bunch of files                                                                              //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.find = function(search) {                                                               // 59
    if (this.debug) {                                                                                               // 862
      console.info("[FilesCollection] [find(" + (JSON.stringify(search)) + ")]");                                   // 862
    }                                                                                                               //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                     // 862
    this.srch(search);                                                                                              // 862
    if (this.checkAccess()) {                                                                                       // 866
      this.currentFile = null;                                                                                      // 867
      this.cursor = this.collection.find(this.search);                                                              // 867
    }                                                                                                               //
    return this;                                                                                                    // 869
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 871
  /*                                                                                                                // 871
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name get                                                                                                         //
  @summary Return value of current cursor or file                                                                   //
  @returns {Object|[Object]}                                                                                        //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.get = function() {                                                                      // 59
    if (this.debug) {                                                                                               // 879
      console.info('[FilesCollection] [get()]');                                                                    // 879
    }                                                                                                               //
    if (this.cursor) {                                                                                              // 880
      return this.cursor.fetch();                                                                                   // 880
    }                                                                                                               //
    return this.currentFile;                                                                                        // 881
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 883
  /*                                                                                                                // 883
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name fetch                                                                                                       //
  @summary Alias for `get()` method                                                                                 //
  @returns {[Object]}                                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.fetch = function() {                                                                    // 59
    var data;                                                                                                       // 891
    if (this.debug) {                                                                                               // 891
      console.info('[FilesCollection] [fetch()]');                                                                  // 891
    }                                                                                                               //
    data = this.get();                                                                                              // 891
    if (!_.isArray(data)) {                                                                                         // 893
      return [data];                                                                                                // 894
    } else {                                                                                                        //
      return data;                                                                                                  //
    }                                                                                                               //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 898
  /*                                                                                                                // 898
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
  FilesCollection.prototype.insert = Meteor.isClient ? function(config, autoStart) {                                // 59
    var mName;                                                                                                      // 929
    if (autoStart == null) {                                                                                        //
      autoStart = true;                                                                                             //
    }                                                                                                               //
    if (this.checkAccess()) {                                                                                       // 929
      mName = autoStart ? 'start' : 'manual';                                                                       // 930
      return (new this._UploadInstance(config, this))[mName]();                                                     // 931
    } else {                                                                                                        //
      throw new Meteor.Error(401, "[FilesCollection] [insert] Access Denied");                                      // 933
    }                                                                                                               //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 936
  /*                                                                                                                // 936
  @locus Client                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name _UploadInstance                                                                                             //
  @class UploadInstance                                                                                             //
  @summary Internal Class, used in upload                                                                           //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype._UploadInstance = Meteor.isClient ? UploadInstance = (function() {                      // 59
    UploadInstance.prototype.__proto__ = EventEmitter.prototype;                                                    // 944
                                                                                                                    //
    function UploadInstance(config1, collection) {                                                                  // 945
      var base, base1, base2, base3, base4, self;                                                                   // 946
      this.config = config1;                                                                                        // 946
      this.collection = collection;                                                                                 // 946
      EventEmitter.call(this);                                                                                      // 946
      if (this.collection.debug) {                                                                                  // 947
        console.info('[FilesCollection] [insert()]');                                                               // 947
      }                                                                                                             //
      self = this;                                                                                                  // 946
      if ((base = this.config).meta == null) {                                                                      //
        base.meta = {};                                                                                             //
      }                                                                                                             //
      if ((base1 = this.config).streams == null) {                                                                  //
        base1.streams = 2;                                                                                          //
      }                                                                                                             //
      if (this.config.streams < 1) {                                                                                // 951
        this.config.streams = 2;                                                                                    // 951
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
      this.config.transport = this.config.transport.toLowerCase();                                                  // 946
      check(this.config, {                                                                                          // 946
        file: Match.Any,                                                                                            // 957
        meta: Match.Optional(Object),                                                                               // 957
        onError: Match.Optional(Function),                                                                          // 957
        onAbort: Match.Optional(Function),                                                                          // 957
        streams: Match.OneOf('dynamic', Number),                                                                    // 957
        onStart: Match.Optional(Function),                                                                          // 957
        transport: Match.OneOf('http', 'ddp'),                                                                      // 957
        chunkSize: Match.OneOf('dynamic', Number),                                                                  // 957
        onUploaded: Match.Optional(Function),                                                                       // 957
        onProgress: Match.Optional(Function),                                                                       // 957
        onBeforeUpload: Match.Optional(Function),                                                                   // 957
        allowWebWorkers: Boolean                                                                                    // 957
      });                                                                                                           //
      if (this.config.file) {                                                                                       // 972
        if (this.collection.debug) {                                                                                // 973
          console.time('insert ' + this.config.file.name);                                                          // 973
        }                                                                                                           //
        if (this.collection.debug) {                                                                                // 974
          console.time('loadFile ' + this.config.file.name);                                                        // 974
        }                                                                                                           //
        if (Worker && this.config.allowWebWorkers) {                                                                // 976
          this.worker = new Worker('/packages/ostrio_files/worker.js');                                             // 977
        } else {                                                                                                    //
          this.worker = null;                                                                                       // 979
        }                                                                                                           //
        this.trackerComp = null;                                                                                    // 973
        this.currentChunk = 0;                                                                                      // 973
        this.sentChunks = 0;                                                                                        // 973
        this.EOFsent = false;                                                                                       // 973
        this.transferTime = 0;                                                                                      // 973
        this.fileLength = 1;                                                                                        // 973
        this.fileId = Random.id();                                                                                  // 973
        this.FSName = this.namingFunction ? this.namingFunction() : this.fileId;                                    // 973
        this.pipes = [];                                                                                            // 973
        this.fileData = {                                                                                           // 973
          size: this.config.file.size,                                                                              // 991
          type: this.config.file.type,                                                                              // 991
          name: this.config.file.name,                                                                              // 991
          meta: this.config.meta                                                                                    // 991
        };                                                                                                          //
        this.fileData = _.extend(this.fileData, this.collection.getExt(self.config.file.name), {                    // 973
          mime: this.collection.getMimeType(this.fileData)                                                          // 996
        });                                                                                                         //
        this.fileData['mime-type'] = this.fileData.mime;                                                            // 973
        this.result = new this.collection._FileUpload(_.extend(self.config, {                                       // 973
          fileData: this.fileData,                                                                                  // 999
          fileId: this.fileId,                                                                                      // 999
          MeteorFileAbort: this.collection.methodNames.MeteorFileAbort                                              // 999
        }));                                                                                                        //
        this.beforeunload = function(e) {                                                                           // 973
          var message;                                                                                              // 1002
          message = _.isFunction(self.collection.onbeforeunloadMessage) ? self.collection.onbeforeunloadMessage.call(self.result, self.fileData) : self.collection.onbeforeunloadMessage;
          if (e) {                                                                                                  // 1003
            e.returnValue = message;                                                                                // 1003
          }                                                                                                         //
          return message;                                                                                           // 1004
        };                                                                                                          //
        this.result.config.beforeunload = this.beforeunload;                                                        // 973
        window.addEventListener('beforeunload', this.beforeunload, false);                                          // 973
        this.result.config._onEnd = function() {                                                                    // 973
          return self.emitEvent('_onEnd');                                                                          //
        };                                                                                                          //
        this.addListener('end', this.end);                                                                          // 973
        this.addListener('start', this.start);                                                                      // 973
        this.addListener('upload', this.upload);                                                                    // 973
        this.addListener('sendEOF', this.sendEOF);                                                                  // 973
        this.addListener('prepare', this.prepare);                                                                  // 973
        this.addListener('sendChunk', this.sendChunk);                                                              // 973
        this.addListener('proceedChunk', this.proceedChunk);                                                        // 973
        this.addListener('createStreams', this.createStreams);                                                      // 973
        this.addListener('calculateStats', _.throttle(function() {                                                  // 973
          var _t, progress;                                                                                         // 1020
          _t = (self.transferTime / self.sentChunks) / self.config.streams;                                         // 1020
          self.result.estimateTime.set(_t * (self.fileLength - self.sentChunks));                                   // 1020
          self.result.estimateSpeed.set(self.config.chunkSize / (_t / 1000));                                       // 1020
          progress = Math.round((self.sentChunks / self.fileLength) * 100);                                         // 1020
          self.result.progress.set(progress);                                                                       // 1020
          self.config.onProgress && self.config.onProgress.call(self.result, progress, self.fileData);              // 1020
          self.result.emitEvent('progress', [progress, self.fileData]);                                             // 1020
        }, 250));                                                                                                   //
        this.addListener('_onEnd', function() {                                                                     // 973
          if (self.worker) {                                                                                        // 1031
            self.worker.terminate();                                                                                // 1031
          }                                                                                                         //
          if (self.trackerComp) {                                                                                   // 1032
            self.trackerComp.stop();                                                                                // 1032
          }                                                                                                         //
          if (self.beforeunload) {                                                                                  // 1033
            window.removeEventListener('beforeunload', self.beforeunload, false);                                   // 1033
          }                                                                                                         //
          if (self.result) {                                                                                        // 1034
            return self.result.progress.set(0);                                                                     //
          }                                                                                                         //
        });                                                                                                         //
      } else {                                                                                                      //
        throw new Meteor.Error(500, "[FilesCollection] [insert] Have you forget to pass a File itself?");           // 1036
      }                                                                                                             //
    }                                                                                                               //
                                                                                                                    //
    UploadInstance.prototype.end = function(error, data) {                                                          // 944
      if (this.collection.debug) {                                                                                  // 1039
        console.timeEnd('insert ' + this.config.file.name);                                                         // 1039
      }                                                                                                             //
      this.emitEvent('_onEnd');                                                                                     // 1039
      this.result.emitEvent('uploaded', [error, data]);                                                             // 1039
      this.config.onUploaded && this.config.onUploaded.call(this.result, error, data);                              // 1039
      if (error) {                                                                                                  // 1043
        if (this.collection.debug) {                                                                                // 1044
          console.warn("[FilesCollection] [insert] [end] Error: ", error);                                          // 1044
        }                                                                                                           //
        this.result.abort();                                                                                        // 1044
        this.result.state.set('aborted');                                                                           // 1044
        this.result.emitEvent('error', [error, this.fileData]);                                                     // 1044
        this.config.onError && this.config.onError.call(this.result, error, this.fileData);                         // 1044
      } else {                                                                                                      //
        this.result.state.set('completed');                                                                         // 1050
        this.collection.emitEvent('afterUpload', [data]);                                                           // 1050
      }                                                                                                             //
      this.result.emitEvent('end', [error, data || this.fileData]);                                                 // 1039
      return this.result;                                                                                           // 1053
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.sendChunk = function(evt) {                                                            // 944
      var j, len, opts, pipeFunc, ref, self;                                                                        // 1056
      self = this;                                                                                                  // 1056
      opts = {                                                                                                      // 1056
        file: this.fileData,                                                                                        // 1058
        fileId: this.fileId,                                                                                        // 1058
        binData: evt.data.bin,                                                                                      // 1058
        chunkId: evt.data.chunkId,                                                                                  // 1058
        chunkSize: this.config.chunkSize,                                                                           // 1058
        fileLength: this.fileLength                                                                                 // 1058
      };                                                                                                            //
      if (this.FSName !== this.fileId) {                                                                            // 1065
        opts.FSName = this.FSName;                                                                                  // 1065
      }                                                                                                             //
      if (evt.data.chunkId !== 1) {                                                                                 // 1067
        opts.file = _.omit(opts.file, 'meta', 'ext', 'extensionWithDot', 'mime', 'mime-type');                      // 1068
      }                                                                                                             //
      this.emitEvent('data', [evt.data.bin]);                                                                       // 1056
      if (this.pipes.length) {                                                                                      // 1071
        ref = this.pipes;                                                                                           // 1072
        for (j = 0, len = ref.length; j < len; j++) {                                                               // 1072
          pipeFunc = ref[j];                                                                                        //
          opts.binData = pipeFunc(opts.binData);                                                                    // 1073
        }                                                                                                           // 1072
      }                                                                                                             //
      if (this.fileLength === evt.data.chunkId) {                                                                   // 1075
        if (this.collection.debug) {                                                                                // 1076
          console.timeEnd('loadFile ' + this.config.file.name);                                                     // 1076
        }                                                                                                           //
        this.emitEvent('readEnd');                                                                                  // 1076
      }                                                                                                             //
      if (opts.binData && opts.binData.length) {                                                                    // 1079
        if (this.config.transport === 'ddp') {                                                                      // 1080
          Meteor.call(this.collection.methodNames.MeteorFileWrite, opts, function(error) {                          // 1081
            ++self.sentChunks;                                                                                      // 1082
            self.transferTime += (+(new Date)) - evt.data.start;                                                    // 1082
            if (error) {                                                                                            // 1084
              self.emitEvent('end', [error]);                                                                       // 1085
            } else {                                                                                                //
              if (self.sentChunks >= self.fileLength) {                                                             // 1087
                self.emitEvent('sendEOF', [opts]);                                                                  // 1088
              } else if (self.currentChunk < self.fileLength) {                                                     //
                self.emitEvent('upload');                                                                           // 1090
              }                                                                                                     //
              self.emitEvent('calculateStats');                                                                     // 1087
            }                                                                                                       //
          });                                                                                                       //
        } else {                                                                                                    //
          HTTP.call('POST', this.collection.downloadRoute + "/" + this.collection.collectionName + "/__upload", {   // 1094
            data: opts                                                                                              // 1094
          }, function(error, result) {                                                                              //
            ++self.sentChunks;                                                                                      // 1095
            self.transferTime += (+(new Date)) - evt.data.start;                                                    // 1095
            if (error) {                                                                                            // 1097
              self.emitEvent('end', [error]);                                                                       // 1098
            } else {                                                                                                //
              if (self.sentChunks >= self.fileLength) {                                                             // 1100
                self.emitEvent('sendEOF', [opts]);                                                                  // 1101
              } else if (self.currentChunk < self.fileLength) {                                                     //
                self.emitEvent('upload');                                                                           // 1103
              }                                                                                                     //
              self.emitEvent('calculateStats');                                                                     // 1100
            }                                                                                                       //
          });                                                                                                       //
        }                                                                                                           //
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.sendEOF = function(opts) {                                                             // 944
      var self;                                                                                                     // 1109
      if (!this.EOFsent) {                                                                                          // 1109
        this.EOFsent = true;                                                                                        // 1110
        self = this;                                                                                                // 1110
        opts = {                                                                                                    // 1110
          eof: true,                                                                                                // 1113
          file: this.fileData,                                                                                      // 1113
          fileId: this.fileId,                                                                                      // 1113
          chunkSize: this.config.chunkSize,                                                                         // 1113
          fileLength: this.fileLength                                                                               // 1113
        };                                                                                                          //
        if (this.FSName !== this.fileId) {                                                                          // 1119
          opts.FSName = this.FSName;                                                                                // 1119
        }                                                                                                           //
        if (this.config.transport === 'ddp') {                                                                      // 1121
          Meteor.call(this.collection.methodNames.MeteorFileWrite, opts, function() {                               // 1122
            self.emitEvent('end', arguments);                                                                       // 1123
          });                                                                                                       //
        } else {                                                                                                    //
          HTTP.call('POST', this.collection.downloadRoute + "/" + this.collection.collectionName + "/__upload", {   // 1126
            data: opts                                                                                              // 1126
          }, function(error, result) {                                                                              //
            self.emitEvent('end', [error, JSON.parse((result != null ? result.content : void 0) || {})]);           // 1127
          });                                                                                                       //
        }                                                                                                           //
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.proceedChunk = function(chunkId, start) {                                              // 944
      var chunk, fileReader, self;                                                                                  // 1132
      self = this;                                                                                                  // 1132
      chunk = this.config.file.slice(this.config.chunkSize * (chunkId - 1), this.config.chunkSize * chunkId);       // 1132
      fileReader = new FileReader;                                                                                  // 1132
      fileReader.onloadend = function(evt) {                                                                        // 1132
        var ref, ref1;                                                                                              // 1137
        self.emitEvent('sendChunk', [                                                                               // 1137
          {                                                                                                         //
            data: {                                                                                                 // 1137
              bin: ((fileReader != null ? fileReader.result : void 0) || ((ref = evt.srcElement) != null ? ref.result : void 0) || ((ref1 = evt.target) != null ? ref1.result : void 0)).split(',')[1],
              chunkId: chunkId,                                                                                     // 1138
              start: start                                                                                          // 1138
            }                                                                                                       //
          }                                                                                                         //
        ]);                                                                                                         //
      };                                                                                                            //
      fileReader.onerror = function(e) {                                                                            // 1132
        self.emitEvent('end', [(e.target || e.srcElement).error]);                                                  // 1146
      };                                                                                                            //
      fileReader.readAsDataURL(chunk);                                                                              // 1132
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.upload = function() {                                                                  // 944
      var self, start;                                                                                              // 1153
      start = +(new Date);                                                                                          // 1153
      if (this.result.onPause.get()) {                                                                              // 1154
        self = this;                                                                                                // 1155
        this.result.continueFunc = function() {                                                                     // 1155
          self.emitEvent('createStreams');                                                                          // 1157
        };                                                                                                          //
        return;                                                                                                     // 1159
      }                                                                                                             //
      if (this.result.state.get() === 'aborted') {                                                                  // 1161
        return this;                                                                                                // 1162
      }                                                                                                             //
      if (this.currentChunk <= this.fileLength) {                                                                   // 1164
        ++this.currentChunk;                                                                                        // 1165
        if (this.worker) {                                                                                          // 1166
          this.worker.postMessage({                                                                                 // 1167
            sentChunks: this.sentChunks,                                                                            // 1167
            start: start,                                                                                           // 1167
            currentChunk: this.currentChunk,                                                                        // 1167
            chunkSize: this.config.chunkSize,                                                                       // 1167
            file: this.config.file                                                                                  // 1167
          });                                                                                                       //
        } else {                                                                                                    //
          this.emitEvent('proceedChunk', [this.currentChunk, start]);                                               // 1169
        }                                                                                                           //
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.createStreams = function() {                                                           // 944
      var i, self;                                                                                                  // 1173
      i = 1;                                                                                                        // 1173
      self = this;                                                                                                  // 1173
      while (i <= this.config.streams) {                                                                            // 1175
        self.emitEvent('upload');                                                                                   // 1176
        i++;                                                                                                        // 1176
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.prepare = function() {                                                                 // 944
      var _len, self;                                                                                               // 1181
      self = this;                                                                                                  // 1181
      this.config.onStart && this.config.onStart.call(this.result, null, this.fileData);                            // 1181
      this.result.emitEvent('start', [null, this.fileData]);                                                        // 1181
      if (this.config.chunkSize === 'dynamic') {                                                                    // 1186
        this.config.chunkSize = this.config.file.size / 1000;                                                       // 1187
        if (this.config.chunkSize < 327680) {                                                                       // 1188
          this.config.chunkSize = 327680;                                                                           // 1189
        } else if (this.config.chunkSize > 1048576) {                                                               //
          this.config.chunkSize = 1048576;                                                                          // 1191
        }                                                                                                           //
      }                                                                                                             //
      this.config.chunkSize = Math.floor(this.config.chunkSize / 8) * 8;                                            // 1181
      _len = Math.ceil(this.config.file.size / this.config.chunkSize);                                              // 1181
      if (this.config.streams === 'dynamic') {                                                                      // 1195
        this.config.streams = _.clone(_len);                                                                        // 1196
        if (this.config.streams > 24) {                                                                             // 1197
          this.config.streams = 24;                                                                                 // 1197
        }                                                                                                           //
      }                                                                                                             //
      this.fileLength = _len <= 0 ? 1 : _len;                                                                       // 1181
      if (this.config.streams > this.fileLength) {                                                                  // 1200
        this.config.streams = this.fileLength;                                                                      // 1200
      }                                                                                                             //
      this.result.config.fileLength = this.fileLength;                                                              // 1181
      self.emitEvent('createStreams');                                                                              // 1181
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.pipe = function(func) {                                                                // 944
      this.pipes.push(func);                                                                                        // 1207
      return this;                                                                                                  // 1208
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.start = function() {                                                                   // 944
      var isUploadAllowed, self;                                                                                    // 1211
      self = this;                                                                                                  // 1211
      if (this.config.file.size <= 0) {                                                                             // 1212
        this.end(new Meteor.Error(400, 'Can\'t upload empty file'));                                                // 1213
        return this.result;                                                                                         // 1214
      }                                                                                                             //
      if (this.config.onBeforeUpload && _.isFunction(this.config.onBeforeUpload)) {                                 // 1216
        isUploadAllowed = this.config.onBeforeUpload.call(_.extend(this.result, this.collection.getUser()), this.fileData);
        if (isUploadAllowed !== true) {                                                                             // 1218
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'config.onBeforeUpload() returned false'));
        }                                                                                                           //
      }                                                                                                             //
      if (this.collection.onBeforeUpload && _.isFunction(this.collection.onBeforeUpload)) {                         // 1221
        isUploadAllowed = this.collection.onBeforeUpload.call(_.extend(this.result, this.collection.getUser()), this.fileData);
        if (isUploadAllowed !== true) {                                                                             // 1223
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'collection.onBeforeUpload() returned false'));
        }                                                                                                           //
      }                                                                                                             //
      Tracker.autorun(function(computation) {                                                                       // 1211
        self.trackerComp = computation;                                                                             // 1227
        if (!self.result.onPause.get()) {                                                                           // 1228
          if (Meteor.status().connected) {                                                                          // 1229
            self.result["continue"]();                                                                              // 1230
            if (self.collection.debug) {                                                                            // 1231
              console.info('[FilesCollection] [insert] [Tracker] [continue]');                                      // 1231
            }                                                                                                       //
          } else {                                                                                                  //
            self.result.pause();                                                                                    // 1233
            if (self.collection.debug) {                                                                            // 1234
              console.info('[FilesCollection] [insert] [Tracker] [pause]');                                         // 1234
            }                                                                                                       //
          }                                                                                                         //
        }                                                                                                           //
      });                                                                                                           //
      if (this.worker) {                                                                                            // 1237
        this.worker.onmessage = function(evt) {                                                                     // 1238
          if (evt.data.error) {                                                                                     // 1239
            if (self.collection.debug) {                                                                            // 1240
              console.warn(evt.data.error);                                                                         // 1240
            }                                                                                                       //
            self.emitEvent('proceedChunk', [evt.data.chunkId, evt.data.start]);                                     // 1240
          } else {                                                                                                  //
            self.emitEvent('sendChunk', [evt]);                                                                     // 1243
          }                                                                                                         //
        };                                                                                                          //
        this.worker.onerror = function(e) {                                                                         // 1238
          self.emitEvent('end', [e.message]);                                                                       // 1246
        };                                                                                                          //
      }                                                                                                             //
      if (this.collection.debug) {                                                                                  // 1249
        if (this.worker) {                                                                                          // 1250
          console.info("[FilesCollection] [insert] using WebWorkers");                                              // 1251
        } else {                                                                                                    //
          console.info("[FilesCollection] [insert] using MainThread");                                              // 1253
        }                                                                                                           //
      }                                                                                                             //
      self.emitEvent('prepare');                                                                                    // 1211
      return this.result;                                                                                           // 1256
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.manual = function() {                                                                  // 944
      var self;                                                                                                     // 1259
      self = this;                                                                                                  // 1259
      this.result.start = function() {                                                                              // 1259
        self.emitEvent('start');                                                                                    // 1261
      };                                                                                                            //
      this.result.pipe = function(func) {                                                                           // 1259
        self.pipe(func);                                                                                            // 1264
        return this;                                                                                                // 1265
      };                                                                                                            //
      return this.result;                                                                                           // 1266
    };                                                                                                              //
                                                                                                                    //
    return UploadInstance;                                                                                          //
                                                                                                                    //
  })() : void 0;                                                                                                    //
                                                                                                                    //
                                                                                                                    // 1269
  /*                                                                                                                // 1269
  @locus Client                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name _FileUpload                                                                                                 //
  @class FileUpload                                                                                                 //
  @summary Internal Class, instance of this class is returned from `insert()` method                                //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype._FileUpload = Meteor.isClient ? FileUpload = (function() {                              // 59
    FileUpload.prototype.__proto__ = EventEmitter.prototype;                                                        // 1277
                                                                                                                    //
    function FileUpload(config1) {                                                                                  // 1278
      this.config = config1;                                                                                        // 1279
      EventEmitter.call(this);                                                                                      // 1279
      this.file = _.extend(this.config.file, this.config.fileData);                                                 // 1279
      this.state = new ReactiveVar('active');                                                                       // 1279
      this.onPause = new ReactiveVar(false);                                                                        // 1279
      this.progress = new ReactiveVar(0);                                                                           // 1279
      this.estimateTime = new ReactiveVar(1000);                                                                    // 1279
      this.estimateSpeed = new ReactiveVar(0);                                                                      // 1279
    }                                                                                                               //
                                                                                                                    //
    FileUpload.prototype.continueFunc = function() {};                                                              // 1277
                                                                                                                    //
    FileUpload.prototype.pause = function() {                                                                       // 1277
      if (!this.onPause.get()) {                                                                                    // 1288
        this.onPause.set(true);                                                                                     // 1289
        this.state.set('paused');                                                                                   // 1289
        this.emitEvent('pause', [this.file]);                                                                       // 1289
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    FileUpload.prototype["continue"] = function() {                                                                 // 1277
      if (this.onPause.get()) {                                                                                     // 1294
        this.onPause.set(false);                                                                                    // 1295
        this.state.set('active');                                                                                   // 1295
        this.emitEvent('continue', [this.file]);                                                                    // 1295
        this.continueFunc.call();                                                                                   // 1295
        this.continueFunc = function() {};                                                                          // 1295
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    FileUpload.prototype.toggle = function() {                                                                      // 1277
      if (this.onPause.get()) {                                                                                     // 1302
        this["continue"]();                                                                                         // 1302
      } else {                                                                                                      //
        this.pause();                                                                                               // 1302
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    FileUpload.prototype.abort = function() {                                                                       // 1277
      window.removeEventListener('beforeunload', this.config.beforeunload, false);                                  // 1305
      this.config.onAbort && this.config.onAbort.call(this, this.file);                                             // 1305
      this.emitEvent('abort', [this.file]);                                                                         // 1305
      this.pause();                                                                                                 // 1305
      this.config._onEnd();                                                                                         // 1305
      this.state.set('aborted');                                                                                    // 1305
      if (this.config.debug) {                                                                                      // 1311
        console.timeEnd('insert ' + this.config.file.name);                                                         // 1311
      }                                                                                                             //
      if (this.config.fileLength) {                                                                                 // 1312
        Meteor.call(this.config.MeteorFileAbort, {                                                                  // 1313
          fileId: this.config.fileId,                                                                               // 1313
          fileLength: this.config.fileLength,                                                                       // 1313
          fileData: this.config.fileData                                                                            // 1313
        });                                                                                                         //
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    return FileUpload;                                                                                              //
                                                                                                                    //
  })() : void 0;                                                                                                    //
                                                                                                                    //
                                                                                                                    // 1317
  /*                                                                                                                // 1317
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name remove                                                                                                      //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                  //
  @param {Function} cb - Callback with one `error` argument                                                         //
  @summary Remove file(s) on cursor or find and remove file(s) if search is set                                     //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.remove = function(search, cb) {                                                         // 59
    var files, self;                                                                                                // 1327
    if (this.debug) {                                                                                               // 1327
      console.info("[FilesCollection] [remove(" + (JSON.stringify(search)) + ")]");                                 // 1327
    }                                                                                                               //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                     // 1327
    check(cb, Match.Optional(Function));                                                                            // 1327
    if (this.checkAccess()) {                                                                                       // 1331
      this.srch(search);                                                                                            // 1332
      if (Meteor.isClient) {                                                                                        // 1333
        if (this.allowClientCode) {                                                                                 // 1334
          Meteor.call(this.methodNames.MeteorFileUnlink, search, (cb ? cb : NOOP));                                 // 1335
        } else {                                                                                                    //
          if (cb) {                                                                                                 // 1337
            cb(new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!'));           // 1338
          } else {                                                                                                  //
            throw new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!');         // 1340
          }                                                                                                         //
        }                                                                                                           //
      }                                                                                                             //
      if (Meteor.isServer) {                                                                                        // 1342
        files = this.collection.find(this.search);                                                                  // 1343
        if (files.count() > 0) {                                                                                    // 1344
          self = this;                                                                                              // 1345
          files.forEach(function(file) {                                                                            // 1345
            return self.unlink(file);                                                                               //
          });                                                                                                       //
        }                                                                                                           //
        this.collection.remove(this.search, cb);                                                                    // 1343
      }                                                                                                             //
    } else {                                                                                                        //
      if (cb) {                                                                                                     // 1349
        cb(new Meteor.Error(401, '[FilesCollection] [remove] Access denied!'));                                     // 1350
      } else {                                                                                                      //
        throw new Meteor.Error(401, '[FilesCollection] [remove] Access denied!');                                   // 1352
      }                                                                                                             //
    }                                                                                                               //
    return this;                                                                                                    // 1353
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 1355
  /*                                                                                                                // 1355
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name update                                                                                                      //
  @see http://docs.meteor.com/#/full/update                                                                         //
  @summary link Mongo.Collection update method                                                                      //
  @returns {Mongo.Collection} Instance                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.update = function() {                                                                   // 59
    this.collection.update.apply(this.collection, arguments);                                                       // 1364
    return this.collection;                                                                                         // 1365
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 1367
  /*                                                                                                                // 1367
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
  FilesCollection.prototype.deny = Meteor.isServer ? function(rules) {                                              // 59
    this.collection.deny(rules);                                                                                    // 1378
    return this.collection;                                                                                         // 1379
  } : void 0;                                                                                                       //
                                                                                                                    //
  FilesCollection.prototype.allow = Meteor.isServer ? function(rules) {                                             // 59
    this.collection.allow(rules);                                                                                   // 1382
    return this.collection;                                                                                         // 1383
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1386
  /*                                                                                                                // 1386
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name denyClient                                                                                                  //
  @name allowClient                                                                                                 //
  @see http://docs.meteor.com/#/full/allow                                                                          //
  @summary Shorthands for Mongo.Collection allow/deny methods                                                       //
  @returns {Mongo.Collection} Instance                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.denyClient = Meteor.isServer ? function() {                                             // 59
    this.collection.deny({                                                                                          // 1396
      insert: function() {                                                                                          // 1397
        return true;                                                                                                //
      },                                                                                                            //
      update: function() {                                                                                          // 1397
        return true;                                                                                                //
      },                                                                                                            //
      remove: function() {                                                                                          // 1397
        return true;                                                                                                //
      }                                                                                                             //
    });                                                                                                             //
    return this.collection;                                                                                         // 1400
  } : void 0;                                                                                                       //
                                                                                                                    //
  FilesCollection.prototype.allowClient = Meteor.isServer ? function() {                                            // 59
    this.collection.allow({                                                                                         // 1403
      insert: function() {                                                                                          // 1404
        return true;                                                                                                //
      },                                                                                                            //
      update: function() {                                                                                          // 1404
        return true;                                                                                                //
      },                                                                                                            //
      remove: function() {                                                                                          // 1404
        return true;                                                                                                //
      }                                                                                                             //
    });                                                                                                             //
    return this.collection;                                                                                         // 1407
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1411
  /*                                                                                                                // 1411
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name unlink                                                                                                      //
  @param {Object} fileRef - fileObj                                                                                 //
  @param {String} version - [Optional] file's version                                                               //
  @summary Unlink files and it's versions from FS                                                                   //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.unlink = Meteor.isServer ? function(fileRef, version) {                                 // 59
    var ref, ref1;                                                                                                  // 1421
    if (this.debug) {                                                                                               // 1421
      console.info("[FilesCollection] [unlink(" + fileRef._id + ", " + version + ")]");                             // 1421
    }                                                                                                               //
    if (version) {                                                                                                  // 1422
      if (((ref = fileRef.versions) != null ? ref[version] : void 0) && ((ref1 = fileRef.versions[version]) != null ? ref1.path : void 0)) {
        fs.unlink(fileRef.versions[version].path, NOOP);                                                            // 1424
      }                                                                                                             //
    } else {                                                                                                        //
      if (fileRef.versions && !_.isEmpty(fileRef.versions)) {                                                       // 1426
        _.each(fileRef.versions, function(vRef) {                                                                   // 1427
          return bound(function() {                                                                                 //
            return fs.unlink(vRef.path, NOOP);                                                                      //
          });                                                                                                       //
        });                                                                                                         //
      }                                                                                                             //
      fs.unlink(fileRef.path, NOOP);                                                                                // 1426
    }                                                                                                               //
    return this;                                                                                                    // 1430
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1433
  /*                                                                                                                // 1433
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name _404                                                                                                        //
  @summary Internal method, used to return 404 error                                                                //
  @returns {undefined}                                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype._404 = Meteor.isServer ? function(http) {                                               // 59
    var text;                                                                                                       // 1441
    if (this.debug) {                                                                                               // 1441
      console.warn("[FilesCollection] [download(" + http.request.originalUrl + ")] [_404] File not found");         // 1441
    }                                                                                                               //
    text = 'File Not Found :(';                                                                                     // 1441
    http.response.writeHead(404, {                                                                                  // 1441
      'Content-Length': text.length,                                                                                // 1444
      'Content-Type': 'text/plain'                                                                                  // 1444
    });                                                                                                             //
    http.response.end(text);                                                                                        // 1441
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1450
  /*                                                                                                                // 1450
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name download                                                                                                    //
  @param {Object|Files} self - Instance of FilesCollection                                                          //
  @summary Initiates the HTTP response                                                                              //
  @returns {undefined}                                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.download = Meteor.isServer ? function(http, version) {                                  // 59
    var fileRef, responseType, self;                                                                                // 1459
    if (version == null) {                                                                                          //
      version = 'original';                                                                                         //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 1459
      console.info("[FilesCollection] [download(" + http.request.originalUrl + ", " + version + ")]");              // 1459
    }                                                                                                               //
    responseType = '200';                                                                                           // 1459
    if (this.currentFile) {                                                                                         // 1461
      if (_.has(this.currentFile, 'versions') && _.has(this.currentFile.versions, version)) {                       // 1462
        fileRef = this.currentFile.versions[version];                                                               // 1463
      } else {                                                                                                      //
        fileRef = this.currentFile;                                                                                 // 1465
      }                                                                                                             //
    } else {                                                                                                        //
      fileRef = false;                                                                                              // 1467
    }                                                                                                               //
    if (!fileRef || !_.isObject(fileRef)) {                                                                         // 1469
      return this._404(http);                                                                                       // 1470
    } else if (this.currentFile) {                                                                                  //
      self = this;                                                                                                  // 1472
      if (this.downloadCallback) {                                                                                  // 1474
        if (!this.downloadCallback.call(_.extend(http, this.getUser(http)), this.currentFile)) {                    // 1475
          return this._404(http);                                                                                   // 1476
        }                                                                                                           //
      }                                                                                                             //
      if (this.interceptDownload && _.isFunction(this.interceptDownload)) {                                         // 1478
        if (this.interceptDownload(http, this.currentFile, version) === true) {                                     // 1479
          return;                                                                                                   // 1480
        }                                                                                                           //
      }                                                                                                             //
      fs.stat(fileRef.path, function(statErr, stats) {                                                              // 1472
        return bound(function() {                                                                                   //
          var array, dispositionEncoding, dispositionName, dispositionType, end, partiral, ref, ref1, ref2, ref3, reqRange, start, stream, streamErrorHandler, take, text;
          if (statErr || !stats.isFile()) {                                                                         // 1483
            return self._404(http);                                                                                 // 1484
          }                                                                                                         //
          if (stats.size !== fileRef.size && !self.integrityCheck) {                                                // 1486
            fileRef.size = stats.size;                                                                              // 1486
          }                                                                                                         //
          if (stats.size !== fileRef.size && self.integrityCheck) {                                                 // 1487
            responseType = '400';                                                                                   // 1487
          }                                                                                                         //
          partiral = false;                                                                                         // 1483
          reqRange = false;                                                                                         // 1483
          if (http.params.query.download && http.params.query.download === 'true') {                                // 1491
            dispositionType = 'attachment; ';                                                                       // 1492
          } else {                                                                                                  //
            dispositionType = 'inline; ';                                                                           // 1494
          }                                                                                                         //
          dispositionName = "filename=\"" + (encodeURIComponent(self.currentFile.name)) + "\"; filename=*UTF-8\"" + (encodeURIComponent(self.currentFile.name)) + "\"; ";
          dispositionEncoding = 'charset=utf-8';                                                                    // 1483
          http.response.setHeader('Content-Type', fileRef.type);                                                    // 1483
          http.response.setHeader('Content-Disposition', dispositionType + dispositionName + dispositionEncoding);  // 1483
          http.response.setHeader('Accept-Ranges', 'bytes');                                                        // 1483
          if ((ref = self.currentFile) != null ? (ref1 = ref.updatedAt) != null ? ref1.toUTCString() : void 0 : void 0) {
            http.response.setHeader('Last-Modified', (ref2 = self.currentFile) != null ? (ref3 = ref2.updatedAt) != null ? ref3.toUTCString() : void 0 : void 0);
          }                                                                                                         //
          http.response.setHeader('Connection', 'keep-alive');                                                      // 1483
          if (http.request.headers.range) {                                                                         // 1505
            partiral = true;                                                                                        // 1506
            array = http.request.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);                                    // 1506
            start = parseInt(array[1]);                                                                             // 1506
            end = parseInt(array[2]);                                                                               // 1506
            if (isNaN(end)) {                                                                                       // 1510
              end = fileRef.size - 1;                                                                               // 1511
            }                                                                                                       //
            take = end - start;                                                                                     // 1506
          } else {                                                                                                  //
            start = 0;                                                                                              // 1514
            end = fileRef.size - 1;                                                                                 // 1514
            take = fileRef.size;                                                                                    // 1514
          }                                                                                                         //
          if (partiral || (http.params.query.play && http.params.query.play === 'true')) {                          // 1518
            reqRange = {                                                                                            // 1519
              start: start,                                                                                         // 1519
              end: end                                                                                              // 1519
            };                                                                                                      //
            if (isNaN(start) && !isNaN(end)) {                                                                      // 1520
              reqRange.start = end - take;                                                                          // 1521
              reqRange.end = end;                                                                                   // 1521
            }                                                                                                       //
            if (!isNaN(start) && isNaN(end)) {                                                                      // 1523
              reqRange.start = start;                                                                               // 1524
              reqRange.end = start + take;                                                                          // 1524
            }                                                                                                       //
            if ((start + take) >= fileRef.size) {                                                                   // 1527
              reqRange.end = fileRef.size - 1;                                                                      // 1527
            }                                                                                                       //
            http.response.setHeader('Pragma', 'private');                                                           // 1519
            http.response.setHeader('Expires', new Date(+(new Date) + 1000 * 32400).toUTCString());                 // 1519
            http.response.setHeader('Cache-Control', 'private, maxage=10800, s-maxage=32400');                      // 1519
            if (self.strict && (reqRange.start >= (fileRef.size - 1) || reqRange.end > (fileRef.size - 1))) {       // 1532
              responseType = '416';                                                                                 // 1533
            } else {                                                                                                //
              responseType = '206';                                                                                 // 1535
            }                                                                                                       //
          } else {                                                                                                  //
            http.response.setHeader('Cache-Control', self.cacheControl);                                            // 1537
            responseType = '200';                                                                                   // 1537
          }                                                                                                         //
          streamErrorHandler = function(error) {                                                                    // 1483
            http.response.writeHead(500);                                                                           // 1541
            return http.response.end(error.toString());                                                             //
          };                                                                                                        //
          switch (responseType) {                                                                                   // 1544
            case '400':                                                                                             // 1544
              if (self.debug) {                                                                                     // 1546
                console.warn("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [400] Content-Length mismatch!");
              }                                                                                                     //
              text = 'Content-Length mismatch!';                                                                    // 1546
              http.response.writeHead(400, {                                                                        // 1546
                'Content-Type': 'text/plain',                                                                       // 1549
                'Cache-Control': 'no-cache',                                                                        // 1549
                'Content-Length': text.length                                                                       // 1549
              });                                                                                                   //
              http.response.end(text);                                                                              // 1546
              break;                                                                                                // 1553
            case '404':                                                                                             // 1544
              return self._404(http);                                                                               // 1555
              break;                                                                                                // 1556
            case '416':                                                                                             // 1544
              if (self.debug) {                                                                                     // 1558
                console.info("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [416] Content-Range is not specified!");
              }                                                                                                     //
              http.response.writeHead(416, {                                                                        // 1558
                'Content-Range': "bytes */" + fileRef.size                                                          // 1560
              });                                                                                                   //
              http.response.end();                                                                                  // 1558
              break;                                                                                                // 1562
            case '200':                                                                                             // 1544
              if (self.debug) {                                                                                     // 1564
                console.info("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [200]");          // 1564
              }                                                                                                     //
              stream = fs.createReadStream(fileRef.path);                                                           // 1564
              stream.on('open', (function(_this) {                                                                  // 1564
                return function() {                                                                                 //
                  http.response.writeHead(200);                                                                     // 1567
                  if (self.throttle) {                                                                              // 1568
                    return stream.pipe(new Throttle({                                                               //
                      bps: self.throttle,                                                                           // 1569
                      chunksize: self.chunkSize                                                                     // 1569
                    })).pipe(http.response);                                                                        //
                  } else {                                                                                          //
                    return stream.pipe(http.response);                                                              //
                  }                                                                                                 //
                };                                                                                                  //
              })(this)).on('error', streamErrorHandler);                                                            //
              break;                                                                                                // 1574
            case '206':                                                                                             // 1544
              if (self.debug) {                                                                                     // 1576
                console.info("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [206]");          // 1576
              }                                                                                                     //
              http.response.setHeader('Content-Range', "bytes " + reqRange.start + "-" + reqRange.end + "/" + fileRef.size);
              http.response.setHeader('Trailer', 'expires');                                                        // 1576
              http.response.setHeader('Transfer-Encoding', 'chunked');                                              // 1576
              if (self.throttle) {                                                                                  // 1580
                stream = fs.createReadStream(fileRef.path, {                                                        // 1581
                  start: reqRange.start,                                                                            // 1581
                  end: reqRange.end                                                                                 // 1581
                });                                                                                                 //
                stream.on('open', function() {                                                                      // 1581
                  return http.response.writeHead(206);                                                              //
                }).on('error', streamErrorHandler).on('end', function() {                                           //
                  return http.response.end();                                                                       //
                }).pipe(new Throttle({                                                                              //
                  bps: self.throttle,                                                                               // 1585
                  chunksize: self.chunkSize                                                                         // 1585
                })).pipe(http.response);                                                                            //
              } else {                                                                                              //
                stream = fs.createReadStream(fileRef.path, {                                                        // 1588
                  start: reqRange.start,                                                                            // 1588
                  end: reqRange.end                                                                                 // 1588
                });                                                                                                 //
                stream.on('open', function() {                                                                      // 1588
                  return http.response.writeHead(206);                                                              //
                }).on('error', streamErrorHandler).on('end', function() {                                           //
                  return http.response.end();                                                                       //
                }).pipe(http.response);                                                                             //
              }                                                                                                     //
              break;                                                                                                // 1593
          }                                                                                                         // 1544
        });                                                                                                         //
      });                                                                                                           //
    } else {                                                                                                        //
      return this._404(http);                                                                                       // 1596
    }                                                                                                               //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1599
  /*                                                                                                                // 1599
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name link                                                                                                        //
  @param {Object}   fileRef - File reference object                                                                 //
  @param {String}   version - [Optional] Version of file you would like to request                                  //
  @summary Returns downloadable URL                                                                                 //
  @returns {String} Empty string returned in case if file not found in DB                                           //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.link = function(fileRef, version) {                                                     // 59
    if (version == null) {                                                                                          //
      version = 'original';                                                                                         //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 1609
      console.info('[FilesCollection] [link()]');                                                                   // 1609
    }                                                                                                               //
    if (_.isString(fileRef)) {                                                                                      // 1610
      version = fileRef;                                                                                            // 1611
      fileRef = null;                                                                                               // 1611
    }                                                                                                               //
    if (!fileRef && !this.currentFile) {                                                                            // 1613
      return '';                                                                                                    // 1613
    }                                                                                                               //
    return formatFleURL(fileRef || this.currentFile, version);                                                      // 1614
  };                                                                                                                //
                                                                                                                    //
  return FilesCollection;                                                                                           //
                                                                                                                    //
})();                                                                                                               //
                                                                                                                    //
                                                                                                                    // 1616
/*                                                                                                                  // 1616
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
  var ext, ref, root;                                                                                               // 1627
  if (version == null) {                                                                                            //
    version = 'original';                                                                                           //
  }                                                                                                                 //
  check(fileRef, Object);                                                                                           // 1627
  check(version, String);                                                                                           // 1627
  root = __meteor_runtime_config__.ROOT_URL.replace(/\/+$/, '');                                                    // 1627
  if ((ref = fileRef.extension) != null ? ref.length : void 0) {                                                    // 1632
    ext = '.' + fileRef.extension;                                                                                  // 1633
  } else {                                                                                                          //
    ext = '';                                                                                                       // 1635
  }                                                                                                                 //
  if (fileRef["public"] === true) {                                                                                 // 1637
    return root + (version === 'original' ? fileRef._downloadRoute + "/" + fileRef._id + ext : fileRef._downloadRoute + "/" + version + "-" + fileRef._id + ext);
  } else {                                                                                                          //
    return root + (fileRef._downloadRoute + "/" + fileRef._collectionName + "/" + fileRef._id + "/" + version + "/" + fileRef._id + ext);
  }                                                                                                                 //
};                                                                                                                  // 1626
                                                                                                                    //
if (Meteor.isClient) {                                                                                              // 1642
                                                                                                                    // 1643
  /*                                                                                                                // 1643
  @locus Client                                                                                                     //
  @TemplateHelper                                                                                                   //
  @name fileURL                                                                                                     //
  @param {Object} fileRef - File reference object                                                                   //
  @param {String} version - [Optional] Version of file you would like to request                                    //
  @summary Get download URL for file by fileRef, even without subscription                                          //
  @example {{fileURL fileRef}}                                                                                      //
  @returns {String}                                                                                                 //
   */                                                                                                               //
  Template.registerHelper('fileURL', function(fileRef, version) {                                                   // 1643
    if (!fileRef || !_.isObject(fileRef)) {                                                                         // 1654
      return void 0;                                                                                                // 1654
    }                                                                                                               //
    version = !version || !_.isString(version) ? 'original' : version;                                              // 1654
    if (fileRef._id) {                                                                                              // 1656
      return formatFleURL(fileRef, version);                                                                        // 1657
    } else {                                                                                                        //
      return '';                                                                                                    // 1659
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
