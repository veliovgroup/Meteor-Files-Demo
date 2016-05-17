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
      if (this["public"] && !this.storagePath) {                                                                    // 147
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
    if (!this.schema) {                                                                                             // 166
      this.schema = {                                                                                               // 167
        size: {                                                                                                     // 168
          type: Number                                                                                              // 168
        },                                                                                                          //
        name: {                                                                                                     // 168
          type: String                                                                                              // 169
        },                                                                                                          //
        type: {                                                                                                     // 168
          type: String                                                                                              // 170
        },                                                                                                          //
        path: {                                                                                                     // 168
          type: String                                                                                              // 171
        },                                                                                                          //
        isVideo: {                                                                                                  // 168
          type: Boolean                                                                                             // 172
        },                                                                                                          //
        isAudio: {                                                                                                  // 168
          type: Boolean                                                                                             // 173
        },                                                                                                          //
        isImage: {                                                                                                  // 168
          type: Boolean                                                                                             // 174
        },                                                                                                          //
        isText: {                                                                                                   // 168
          type: Boolean                                                                                             // 175
        },                                                                                                          //
        isJSON: {                                                                                                   // 168
          type: Boolean                                                                                             // 176
        },                                                                                                          //
        _prefix: {                                                                                                  // 168
          type: String                                                                                              // 177
        },                                                                                                          //
        extension: {                                                                                                // 168
          type: String,                                                                                             // 179
          optional: true                                                                                            // 179
        },                                                                                                          //
        _storagePath: {                                                                                             // 168
          type: String                                                                                              // 181
        },                                                                                                          //
        _downloadRoute: {                                                                                           // 168
          type: String                                                                                              // 182
        },                                                                                                          //
        _collectionName: {                                                                                          // 168
          type: String                                                                                              // 183
        },                                                                                                          //
        "public": {                                                                                                 // 168
          type: Boolean,                                                                                            // 185
          optional: true                                                                                            // 185
        },                                                                                                          //
        meta: {                                                                                                     // 168
          type: Object,                                                                                             // 188
          blackbox: true,                                                                                           // 188
          optional: true                                                                                            // 188
        },                                                                                                          //
        userId: {                                                                                                   // 168
          type: String,                                                                                             // 192
          optional: true                                                                                            // 192
        },                                                                                                          //
        updatedAt: {                                                                                                // 168
          type: Date,                                                                                               // 195
          autoValue: function() {                                                                                   // 195
            return new Date();                                                                                      //
          }                                                                                                         //
        },                                                                                                          //
        versions: {                                                                                                 // 168
          type: Object,                                                                                             // 198
          blackbox: true                                                                                            // 198
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
    if (this["public"] && this["protected"]) {                                                                      // 212
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: Files can not be public and protected at the same time!");
    }                                                                                                               //
    this.cursor = null;                                                                                             // 96
    this.search = {};                                                                                               // 96
    this.collection = new Mongo.Collection(this.collectionName);                                                    // 96
    this.currentFile = null;                                                                                        // 96
    this._prefix = SHA256(this.collectionName + this.downloadRoute);                                                // 96
    _insts[this._prefix] = this;                                                                                    // 96
    this.checkAccess = function(http) {                                                                             // 96
      var rc, result, text, user, userFuncs, userId;                                                                // 223
      if (self["protected"]) {                                                                                      // 223
        user = false;                                                                                               // 224
        userFuncs = self.getUser(http);                                                                             // 224
        user = userFuncs.user, userId = userFuncs.userId;                                                           // 224
        user = user();                                                                                              // 224
        if (_.isFunction(self["protected"])) {                                                                      // 229
          result = http ? self["protected"].call(_.extend(http, userFuncs), self.currentFile || null) : self["protected"].call(userFuncs, self.currentFile || null);
        } else {                                                                                                    //
          result = !!user;                                                                                          // 232
        }                                                                                                           //
        if ((http && result === true) || !http) {                                                                   // 234
          return true;                                                                                              // 235
        } else {                                                                                                    //
          rc = _.isNumber(result) ? result : 401;                                                                   // 237
          if (self.debug) {                                                                                         // 238
            console.warn('[FilesCollection.checkAccess] WARN: Access denied!');                                     // 238
          }                                                                                                         //
          if (http) {                                                                                               // 239
            text = 'Access denied!';                                                                                // 240
            http.response.writeHead(rc, {                                                                           // 240
              'Content-Length': text.length,                                                                        // 242
              'Content-Type': 'text/plain'                                                                          // 242
            });                                                                                                     //
            http.response.end(text);                                                                                // 240
          }                                                                                                         //
          return false;                                                                                             // 245
        }                                                                                                           //
      } else {                                                                                                      //
        return true;                                                                                                // 247
      }                                                                                                             //
    };                                                                                                              //
    this.methodNames = {                                                                                            // 96
      MeteorFileAbort: "MeteorFileAbort" + this._prefix,                                                            // 250
      MeteorFileWrite: "MeteorFileWrite" + this._prefix,                                                            // 250
      MeteorFileUnlink: "MeteorFileUnlink" + this._prefix                                                           // 250
    };                                                                                                              //
    if (Meteor.isServer) {                                                                                          // 254
      this.on('handleUpload', this.handleUpload);                                                                   // 255
      this.on('finishUpload', this.finishUpload);                                                                   // 255
      WebApp.connectHandlers.use(function(request, response, next) {                                                // 255
        var _file, http, params, uri, uris, version;                                                                // 259
        if (!self["public"]) {                                                                                      // 259
          if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName)) {                 // 260
            uri = request._parsedUrl.path.replace(self.downloadRoute + "/" + self.collectionName, '');              // 261
            if (uri.indexOf('/') === 0) {                                                                           // 262
              uri = uri.substring(1);                                                                               // 263
            }                                                                                                       //
            uris = uri.split('/');                                                                                  // 261
            if (uris.length === 3) {                                                                                // 266
              params = {                                                                                            // 267
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                _id: uris[0],                                                                                       // 268
                version: uris[1],                                                                                   // 268
                name: uris[2]                                                                                       // 268
              };                                                                                                    //
              http = {                                                                                              // 267
                request: request,                                                                                   // 272
                response: response,                                                                                 // 272
                params: params                                                                                      // 272
              };                                                                                                    //
              if (self.checkAccess(http)) {                                                                         // 273
                self.findOne(uris[0]).download.call(self, http, uris[1]);                                           // 273
              }                                                                                                     //
            } else {                                                                                                //
              next();                                                                                               // 275
            }                                                                                                       //
          } else {                                                                                                  //
            next();                                                                                                 // 277
          }                                                                                                         //
        } else {                                                                                                    //
          if (!!~request._parsedUrl.path.indexOf("" + self.downloadRoute)) {                                        // 279
            uri = request._parsedUrl.path.replace("" + self.downloadRoute, '');                                     // 280
            if (uri.indexOf('/') === 0) {                                                                           // 281
              uri = uri.substring(1);                                                                               // 282
            }                                                                                                       //
            uris = uri.split('/');                                                                                  // 280
            _file = uris[uris.length - 1];                                                                          // 280
            if (_file) {                                                                                            // 286
              if (!!~_file.indexOf('-')) {                                                                          // 287
                version = _file.split('-')[0];                                                                      // 288
                _file = _file.split('-')[1].split('?')[0];                                                          // 288
              } else {                                                                                              //
                version = 'original';                                                                               // 291
                _file = _file.split('?')[0];                                                                        // 291
              }                                                                                                     //
              params = {                                                                                            // 287
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                file: _file,                                                                                        // 295
                _id: _file.split('.')[0],                                                                           // 295
                version: version,                                                                                   // 295
                name: _file                                                                                         // 295
              };                                                                                                    //
              http = {                                                                                              // 287
                request: request,                                                                                   // 300
                response: response,                                                                                 // 300
                params: params                                                                                      // 300
              };                                                                                                    //
              self.findOne(params._id).download.call(self, http, version);                                          // 287
            } else {                                                                                                //
              next();                                                                                               // 303
            }                                                                                                       //
          } else {                                                                                                  //
            next();                                                                                                 // 305
          }                                                                                                         //
        }                                                                                                           //
      });                                                                                                           //
      _methods = {};                                                                                                // 255
      _methods[self.methodNames.MeteorFileUnlink] = function(inst) {                                                // 255
        var __inst, __instData, user, userFuncs;                                                                    // 310
        check(inst, Object);                                                                                        // 310
        if (self.debug) {                                                                                           // 311
          console.info('[FilesCollection] [Unlink Method]');                                                        // 311
        }                                                                                                           //
        if (self.allowClientCode) {                                                                                 // 313
          __instData = cp(_insts[inst._prefix], inst);                                                              // 314
          if (self.onBeforeRemove && _.isFunction(self.onBeforeRemove)) {                                           // 315
            user = false;                                                                                           // 316
            userFuncs = {                                                                                           // 316
              userId: this.userId,                                                                                  // 317
              user: function() {                                                                                    // 317
                if (Meteor.users) {                                                                                 // 319
                  return Meteor.users.findOne(this.userId);                                                         //
                } else {                                                                                            //
                  return void 0;                                                                                    //
                }                                                                                                   //
              }                                                                                                     //
            };                                                                                                      //
            __inst = self.find.call(__instData, inst.search);                                                       // 316
            if (!self.onBeforeRemove.call(userFuncs, __inst.cursor || null)) {                                      // 323
              throw new Meteor.Error(403, '[FilesCollection] [remove] Not permitted!');                             // 324
            }                                                                                                       //
          }                                                                                                         //
          self.remove.call(__instData, inst.search);                                                                // 314
          return true;                                                                                              // 327
        } else {                                                                                                    //
          throw new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!');           // 329
        }                                                                                                           //
      };                                                                                                            //
      _methods[self.methodNames.MeteorFileWrite] = function(opts) {                                                 // 255
        var e, extension, extensionWithDot, fileName, isUploadAllowed, ref, result;                                 // 333
        this.unblock();                                                                                             // 333
        check(opts, {                                                                                               // 333
          eof: Match.Optional(Boolean),                                                                             // 334
          meta: Match.Optional(Object),                                                                             // 334
          file: Object,                                                                                             // 334
          fileId: String,                                                                                           // 334
          binData: Match.Optional(String),                                                                          // 334
          chunkId: Match.Optional(Number),                                                                          // 334
          chunkSize: Number,                                                                                        // 334
          fileLength: Number                                                                                        // 334
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
        if (self.debug) {                                                                                           // 350
          console.info("[FilesCollection] [Write Method] Got #" + opts.chunkId + "/" + opts.fileLength + " chunks, dst: " + (opts.file.name || opts.file.fileName));
        }                                                                                                           //
        if (self.onBeforeUpload && _.isFunction(self.onBeforeUpload)) {                                             // 352
          isUploadAllowed = self.onBeforeUpload.call(_.extend({                                                     // 353
            file: opts.file                                                                                         // 353
          }, {                                                                                                      //
            userId: this.userId,                                                                                    // 355
            user: function() {                                                                                      // 355
              if (Meteor.users) {                                                                                   // 357
                return Meteor.users.findOne(this.userId);                                                           //
              } else {                                                                                              //
                return void 0;                                                                                      //
              }                                                                                                     //
            }                                                                                                       //
          }), opts.file);                                                                                           //
          if (isUploadAllowed !== true) {                                                                           // 360
            throw new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : '@onBeforeUpload() returned false');
          }                                                                                                         //
        }                                                                                                           //
        fileName = self.getFileName(opts.file);                                                                     // 333
        ref = self.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;            // 333
        result = opts.file;                                                                                         // 333
        result.path = self.storagePath + "/" + opts.fileId + extensionWithDot;                                      // 333
        result.name = fileName;                                                                                     // 333
        result.meta = opts.meta;                                                                                    // 333
        result.extension = extension;                                                                               // 333
        result = self.dataToSchema(result);                                                                         // 333
        result._id = opts.fileId;                                                                                   // 333
        if (this.userId) {                                                                                          // 373
          result.userId = this.userId;                                                                              // 373
        }                                                                                                           //
        if (opts.eof) {                                                                                             // 375
          try {                                                                                                     // 376
            return Meteor.wrapAsync(self.handleUpload.bind(self, result, opts))();                                  // 377
          } catch (_error) {                                                                                        //
            e = _error;                                                                                             // 379
            if (self.debug) {                                                                                       // 379
              console.warn("[FilesCollection] [Write Method] Exception:", e);                                       // 379
            }                                                                                                       //
            throw e;                                                                                                // 380
          }                                                                                                         //
        } else {                                                                                                    //
          self.emit('handleUpload', result, opts, NOOP);                                                            // 382
        }                                                                                                           //
        return result;                                                                                              // 383
      };                                                                                                            //
      _methods[self.methodNames.MeteorFileAbort] = function(opts) {                                                 // 255
        var ext, path, ref;                                                                                         // 386
        check(opts, {                                                                                               // 386
          fileId: String,                                                                                           // 386
          fileData: Object,                                                                                         // 386
          fileLength: Number                                                                                        // 386
        });                                                                                                         //
        ext = "." + opts.fileData.ext;                                                                              // 386
        path = self.storagePath + "/" + opts.fileId + ext;                                                          // 386
        if (self.debug) {                                                                                           // 395
          console.info("[FilesCollection] [Abort Method]: For " + path);                                            // 395
        }                                                                                                           //
        if ((ref = self._writableStreams) != null ? ref[opts.fileId] : void 0) {                                    // 396
          self._writableStreams[opts.fileId].stream.end();                                                          // 397
          delete self._writableStreams[opts.fileId];                                                                // 397
          self.remove({                                                                                             // 397
            _id: opts.fileId                                                                                        // 399
          });                                                                                                       //
          self.unlink({                                                                                             // 397
            _id: opts.fileId,                                                                                       // 400
            path: path                                                                                              // 400
          });                                                                                                       //
        }                                                                                                           //
        return true;                                                                                                // 402
      };                                                                                                            //
      Meteor.methods(_methods);                                                                                     // 255
    }                                                                                                               //
  }                                                                                                                 //
                                                                                                                    //
                                                                                                                    // 405
  /*                                                                                                                // 405
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name finishUpload                                                                                                //
  @summary Internal method. Finish upload, close Writable stream, add recored to MongoDB and flush used memory      //
  @returns {undefined}                                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.finishUpload = Meteor.isServer ? function(result, opts, cb) {                           // 94
    var self;                                                                                                       // 413
    fs.chmod(result.path, this.permissions, NOOP);                                                                  // 413
    self = this;                                                                                                    // 413
    result.type = this.getMimeType(opts.file);                                                                      // 413
    result["public"] = this["public"];                                                                              // 413
    this.collection.insert(_.clone(result), function(error, _id) {                                                  // 413
      if (error) {                                                                                                  // 419
        return cb(new Meteor.Error(500, error));                                                                    //
      } else {                                                                                                      //
        result._id = _id;                                                                                           // 422
        if (self.debug) {                                                                                           // 423
          console.info("[FilesCollection] [Write Method] [finishUpload] -> " + result.path);                        // 423
        }                                                                                                           //
        self.onAfterUpload && self.onAfterUpload.call(self, result);                                                // 422
        self.emit('afterUpload', result);                                                                           // 422
        return cb(null, result);                                                                                    //
      }                                                                                                             //
    });                                                                                                             //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 430
  /*                                                                                                                // 430
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name handleUpload                                                                                                //
  @summary Internal method to handle upload process, pipe incoming data to Writable stream                          //
  @returns {undefined}                                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.handleUpload = Meteor.isServer ? function(result, opts, cb) {                           // 94
    var _dKeys, _hlEnd, base, binary, e, name, ref, self, start;                                                    // 438
    self = this;                                                                                                    // 438
    if (opts.eof) {                                                                                                 // 439
      binary = opts.binData;                                                                                        // 440
    } else {                                                                                                        //
      binary = new Buffer(opts.binData, 'base64');                                                                  // 442
    }                                                                                                               //
    try {                                                                                                           // 444
      if (opts.eof) {                                                                                               // 445
        _hlEnd = function() {                                                                                       // 446
          self._writableStreams[result._id].stream.end();                                                           // 447
          delete self._writableStreams[result._id];                                                                 // 447
          self.emit('finishUpload', result, opts, cb);                                                              // 447
        };                                                                                                          //
        if ((ref = this._writableStreams[result._id].delayed) != null ? ref[opts.fileLength] : void 0) {            // 452
          this._writableStreams[result._id].stream.write(this._writableStreams[result._id].delayed[opts.fileLength], function() {
            return bound(function() {                                                                               //
              delete self._writableStreams[result._id].delayed[opts.fileLength];                                    // 454
              _hlEnd();                                                                                             // 454
            });                                                                                                     //
          });                                                                                                       //
        } else {                                                                                                    //
          _hlEnd();                                                                                                 // 458
        }                                                                                                           //
      } else if (opts.chunkId > 0) {                                                                                //
        if ((base = this._writableStreams)[name = result._id] == null) {                                            //
          base[name] = {                                                                                            //
            stream: fs.createWriteStream(result.path, {                                                             // 462
              flags: 'a',                                                                                           // 462
              mode: this.permissions                                                                                // 462
            }),                                                                                                     //
            delayed: {}                                                                                             // 462
          };                                                                                                        //
        }                                                                                                           //
        _dKeys = Object.keys(this._writableStreams[result._id].delayed);                                            // 461
        if (_dKeys.length) {                                                                                        // 466
          _.each(this._writableStreams[result._id].delayed, function(delayed, num) {                                // 467
            return bound(function() {                                                                               //
              if (num < opts.chunkId) {                                                                             // 468
                self._writableStreams[result._id].stream.write(delayed);                                            // 469
                delete self._writableStreams[result._id].delayed[num];                                              // 469
              }                                                                                                     //
            });                                                                                                     //
          });                                                                                                       //
        }                                                                                                           //
        start = opts.chunkSize * (opts.chunkId - 1);                                                                // 461
        if (this._writableStreams[result._id].stream.bytesWritten < start) {                                        // 474
          this._writableStreams[result._id].delayed[opts.chunkId] = binary;                                         // 475
        } else {                                                                                                    //
          this._writableStreams[result._id].stream.write(binary);                                                   // 477
        }                                                                                                           //
      }                                                                                                             //
    } catch (_error) {                                                                                              //
      e = _error;                                                                                                   // 479
      cb(e);                                                                                                        // 479
    }                                                                                                               //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 483
  /*                                                                                                                // 483
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getMimeType                                                                                                 //
  @param {Object} fileData - File Object                                                                            //
  @summary Returns file's mime-type                                                                                 //
  @returns {String}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getMimeType = function(fileData) {                                                      // 94
    var br, buf, error, ext, fd, mime, ref;                                                                         // 492
    check(fileData, Object);                                                                                        // 492
    if (fileData != null ? fileData.type : void 0) {                                                                // 493
      mime = fileData.type;                                                                                         // 493
    }                                                                                                               //
    if (Meteor.isServer && fileData.path && (!mime || !_.isString(mime))) {                                         // 494
      try {                                                                                                         // 495
        buf = new Buffer(262);                                                                                      // 496
        fd = fs.openSync(fileData.path, 'r');                                                                       // 496
        br = fs.readSync(fd, buf, 0, 262, 0);                                                                       // 496
        fs.close(fd, NOOP);                                                                                         // 496
        if (br < 262) {                                                                                             // 500
          buf = buf.slice(0, br);                                                                                   // 500
        }                                                                                                           //
        ref = fileType(buf), mime = ref.mime, ext = ref.ext;                                                        // 496
      } catch (_error) {                                                                                            //
        error = _error;                                                                                             // 502
      }                                                                                                             //
    }                                                                                                               //
    if (!mime || !_.isString(mime)) {                                                                               // 503
      mime = 'application/octet-stream';                                                                            // 504
    }                                                                                                               //
    return mime;                                                                                                    // 505
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 507
  /*                                                                                                                // 507
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getFileName                                                                                                 //
  @param {Object} fileData - File Object                                                                            //
  @summary Returns file's name                                                                                      //
  @returns {String}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getFileName = function(fileData) {                                                      // 94
    var cleanName, fileName;                                                                                        // 516
    fileName = fileData.name || fileData.fileName;                                                                  // 516
    if (_.isString(fileName) && fileName.length > 0) {                                                              // 517
      cleanName = function(str) {                                                                                   // 518
        return str.replace(/\.\./g, '').replace(/\//g, '');                                                         //
      };                                                                                                            //
      return cleanName(fileData.name || fileData.fileName);                                                         // 519
    } else {                                                                                                        //
      return '';                                                                                                    // 521
    }                                                                                                               //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 523
  /*                                                                                                                // 523
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getUser                                                                                                     //
  @summary Returns object with `userId` and `user()` method which return user's object                              //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getUser = function(http) {                                                              // 94
    var cookie, result, user;                                                                                       // 531
    result = {                                                                                                      // 531
      user: function() {                                                                                            // 532
        return null;                                                                                                // 532
      },                                                                                                            //
      userId: null                                                                                                  // 532
    };                                                                                                              //
    if (Meteor.isServer) {                                                                                          // 535
      if (http) {                                                                                                   // 536
        cookie = http.request.Cookies;                                                                              // 537
        if (_.has(Package, 'accounts-base') && cookie.has('meteor_login_token')) {                                  // 538
          user = Meteor.users.findOne({                                                                             // 539
            'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(cookie.get('meteor_login_token'))   // 539
          });                                                                                                       //
          if (user) {                                                                                               // 540
            result.user = function() {                                                                              // 541
              return user;                                                                                          // 541
            };                                                                                                      //
            result.userId = user._id;                                                                               // 541
          }                                                                                                         //
        }                                                                                                           //
      }                                                                                                             //
    } else {                                                                                                        //
      if (_.has(Package, 'accounts-base') && Meteor.userId()) {                                                     // 544
        result.user = function() {                                                                                  // 545
          return Meteor.user();                                                                                     // 545
        };                                                                                                          //
        result.userId = Meteor.userId();                                                                            // 545
      }                                                                                                             //
    }                                                                                                               //
    return result;                                                                                                  // 547
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 549
  /*                                                                                                                // 549
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getExt                                                                                                      //
  @param {String} FileName - File name                                                                              //
  @summary Get extension from FileName                                                                              //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getExt = function(fileName) {                                                           // 94
    var extension;                                                                                                  // 558
    if (!!~fileName.indexOf('.')) {                                                                                 // 558
      extension = fileName.split('.').pop();                                                                        // 559
      return {                                                                                                      // 560
        ext: extension,                                                                                             // 560
        extension: extension,                                                                                       // 560
        extensionWithDot: '.' + extension                                                                           // 560
      };                                                                                                            //
    } else {                                                                                                        //
      return {                                                                                                      // 562
        ext: '',                                                                                                    // 562
        extension: '',                                                                                              // 562
        extensionWithDot: ''                                                                                        // 562
      };                                                                                                            //
    }                                                                                                               //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 564
  /*                                                                                                                // 564
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name dataToSchema                                                                                                //
  @param {Object} data - File data                                                                                  //
  @summary Build object in accordance with schema from File data                                                    //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.dataToSchema = function(data) {                                                         // 94
    return {                                                                                                        // 573
      name: data.name,                                                                                              // 573
      extension: data.extension,                                                                                    // 573
      path: data.path,                                                                                              // 573
      meta: data.meta,                                                                                              // 573
      type: data.type,                                                                                              // 573
      size: data.size,                                                                                              // 573
      versions: {                                                                                                   // 573
        original: {                                                                                                 // 581
          path: data.path,                                                                                          // 582
          size: data.size,                                                                                          // 582
          type: data.type,                                                                                          // 582
          extension: data.extension                                                                                 // 582
        }                                                                                                           //
      },                                                                                                            //
      isVideo: !!~data.type.toLowerCase().indexOf('video'),                                                         // 573
      isAudio: !!~data.type.toLowerCase().indexOf('audio'),                                                         // 573
      isImage: !!~data.type.toLowerCase().indexOf('image'),                                                         // 573
      isText: !!~data.type.toLowerCase().indexOf('text'),                                                           // 573
      isJSON: !!~data.type.toLowerCase().indexOf('json'),                                                           // 573
      _prefix: data._prefix || this._prefix,                                                                        // 573
      _storagePath: data._storagePath || this.storagePath,                                                          // 573
      _downloadRoute: data._downloadRoute || this.downloadRoute,                                                    // 573
      _collectionName: data._collectionName || this.collectionName                                                  // 573
    };                                                                                                              //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 597
  /*                                                                                                                // 597
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name srch                                                                                                        //
  @param {String|Object} search - Search data                                                                       //
  @summary Build search object                                                                                      //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.srch = function(search) {                                                               // 94
    if (search && _.isString(search)) {                                                                             // 606
      this.search = {                                                                                               // 607
        _id: search                                                                                                 // 608
      };                                                                                                            //
    } else {                                                                                                        //
      this.search = search || {};                                                                                   // 610
    }                                                                                                               //
    return this.search;                                                                                             //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 613
  /*                                                                                                                // 613
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
    var extension, extensionWithDot, fileName, path, randFileName, ref, result;                                     // 624
    if (opts == null) {                                                                                             //
      opts = {};                                                                                                    //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 624
      console.info("[FilesCollection] [write()]");                                                                  // 624
    }                                                                                                               //
    check(opts, Match.Optional(Object));                                                                            // 624
    check(callback, Match.Optional(Function));                                                                      // 624
    if (this.checkAccess()) {                                                                                       // 628
      randFileName = this.namingFunction();                                                                         // 629
      fileName = opts.name || opts.fileName ? opts.name || opts.fileName : randFileName;                            // 629
      ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;              // 629
      path = this.storagePath + "/" + randFileName + extensionWithDot;                                              // 629
      opts.type = this.getMimeType(opts);                                                                           // 629
      if (!opts.meta) {                                                                                             // 637
        opts.meta = {};                                                                                             // 637
      }                                                                                                             //
      if (!opts.size) {                                                                                             // 638
        opts.size = buffer.length;                                                                                  // 638
      }                                                                                                             //
      result = this.dataToSchema({                                                                                  // 629
        name: fileName,                                                                                             // 641
        path: path,                                                                                                 // 641
        meta: opts.meta,                                                                                            // 641
        type: opts.type,                                                                                            // 641
        size: opts.size,                                                                                            // 641
        extension: extension                                                                                        // 641
      });                                                                                                           //
      if (this.debug) {                                                                                             // 648
        console.info("[FilesCollection] [write]: " + fileName + " -> " + this.collectionName);                      // 648
      }                                                                                                             //
      fs.outputFile(path, buffer, 'binary', function(error) {                                                       // 629
        return bound(function() {                                                                                   //
          if (error) {                                                                                              // 651
            return callback && callback(error);                                                                     //
          } else {                                                                                                  //
            result._id = this.collection.insert(_.clone(result));                                                   // 654
            return callback && callback(null, result);                                                              //
          }                                                                                                         //
        });                                                                                                         //
      });                                                                                                           //
      return this;                                                                                                  // 657
    }                                                                                                               //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 661
  /*                                                                                                                // 661
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
    var extension, extensionWithDot, fileName, path, randFileName, ref, self;                                       // 672
    if (opts == null) {                                                                                             //
      opts = {};                                                                                                    //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 672
      console.info("[FilesCollection] [load(" + url + ", " + (JSON.stringify(opts)) + ", callback)]");              // 672
    }                                                                                                               //
    check(url, String);                                                                                             // 672
    check(opts, Match.Optional(Object));                                                                            // 672
    check(callback, Match.Optional(Function));                                                                      // 672
    self = this;                                                                                                    // 672
    randFileName = this.namingFunction();                                                                           // 672
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : randFileName;                              // 672
    ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                // 672
    path = this.storagePath + "/" + randFileName + extensionWithDot;                                                // 672
    if (!opts.meta) {                                                                                               // 683
      opts.meta = {};                                                                                               // 683
    }                                                                                                               //
    request.get(url).on('error', function(error) {                                                                  // 672
      return bound(function() {                                                                                     //
        throw new Meteor.Error(500, ("Error on [load(" + url + ")]:") + JSON.stringify(error));                     // 686
      });                                                                                                           //
    }).on('response', function(response) {                                                                          //
      return bound(function() {                                                                                     //
        var result;                                                                                                 // 689
        if (self.debug) {                                                                                           // 689
          console.info("[FilesCollection] [load] Received: " + url);                                                // 689
        }                                                                                                           //
        result = self.dataToSchema({                                                                                // 689
          name: fileName,                                                                                           // 692
          path: path,                                                                                               // 692
          meta: opts.meta,                                                                                          // 692
          type: opts.type || response.headers['content-type'],                                                      // 692
          size: opts.size || response.headers['content-length'],                                                    // 692
          extension: extension                                                                                      // 692
        });                                                                                                         //
        return self.collection.insert(_.clone(result), function(error, fileRef) {                                   //
          if (error) {                                                                                              // 700
            if (self.debug) {                                                                                       // 701
              console.warn("[FilesCollection] [load] [insert] Error: " + fileName + " -> " + self.collectionName, error);
            }                                                                                                       //
            return callback && callback(error);                                                                     //
          } else {                                                                                                  //
            if (self.debug) {                                                                                       // 704
              console.info("[FilesCollection] [load] [insert] " + fileName + " -> " + self.collectionName);         // 704
            }                                                                                                       //
            return callback && callback(null, fileRef);                                                             //
          }                                                                                                         //
        });                                                                                                         //
      });                                                                                                           //
    }).pipe(fs.createWriteStream(path, {                                                                            //
      flags: 'w'                                                                                                    // 706
    }));                                                                                                            //
    return this;                                                                                                    // 708
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 712
  /*                                                                                                                // 712
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
    var self;                                                                                                       // 722
    if (opts == null) {                                                                                             //
      opts = {};                                                                                                    //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 722
      console.info("[FilesCollection] [addFile(" + path + ")]");                                                    // 722
    }                                                                                                               //
    if (this["public"]) {                                                                                           // 724
      throw new Meteor.Error(403, 'Can not run [addFile] on public collection! Just Move file to root of your server, then add record to Collection');
    }                                                                                                               //
    check(path, String);                                                                                            // 722
    check(opts, Match.Optional(Object));                                                                            // 722
    check(callback, Match.Optional(Function));                                                                      // 722
    self = this;                                                                                                    // 722
    fs.stat(path, function(error, stats) {                                                                          // 722
      return bound(function() {                                                                                     //
        var _cn, extension, extensionWithDot, fileName, pathParts, ref, result;                                     // 731
        if (error) {                                                                                                // 731
          return callback && callback(error);                                                                       //
        } else if (stats.isFile()) {                                                                                //
          pathParts = path.split('/');                                                                              // 734
          fileName = pathParts[pathParts.length - 1];                                                               // 734
          ref = self.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;          // 734
          if (!opts.type) {                                                                                         // 739
            opts.type = 'application/*';                                                                            // 739
          }                                                                                                         //
          if (!opts.meta) {                                                                                         // 740
            opts.meta = {};                                                                                         // 740
          }                                                                                                         //
          if (!opts.size) {                                                                                         // 741
            opts.size = stats.size;                                                                                 // 741
          }                                                                                                         //
          result = self.dataToSchema({                                                                              // 734
            name: fileName,                                                                                         // 744
            path: path,                                                                                             // 744
            meta: opts.meta,                                                                                        // 744
            type: opts.type,                                                                                        // 744
            size: opts.size,                                                                                        // 744
            extension: extension,                                                                                   // 744
            _storagePath: path.replace("/" + fileName, '')                                                          // 744
          });                                                                                                       //
          _cn = self.collectionName;                                                                                // 734
          return self.collection.insert(_.clone(result), function(error, record) {                                  //
            if (error) {                                                                                            // 754
              if (self.debug) {                                                                                     // 755
                console.warn("[FilesCollection] [addFile] [insert] Error: " + fileName + " -> " + _cn, error);      // 755
              }                                                                                                     //
              return callback && callback(error);                                                                   //
            } else {                                                                                                //
              if (self.debug) {                                                                                     // 758
                console.info("[FilesCollection] [addFile] [insert]: " + fileName + " -> " + _cn);                   // 758
              }                                                                                                     //
              return callback && callback(null, result);                                                            //
            }                                                                                                       //
          });                                                                                                       //
        } else {                                                                                                    //
          return callback && callback(new Meteor.Error(400, "[FilesCollection] [addFile(" + path + ")]: File does not exist"));
        }                                                                                                           //
      });                                                                                                           //
    });                                                                                                             //
    return this;                                                                                                    // 763
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 767
  /*                                                                                                                // 767
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name findOne                                                                                                     //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                  //
  @summary Load file                                                                                                //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.findOne = function(search) {                                                            // 94
    if (this.debug) {                                                                                               // 776
      console.info("[FilesCollection] [findOne(" + (JSON.stringify(search)) + ")]");                                // 776
    }                                                                                                               //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                     // 776
    this.srch(search);                                                                                              // 776
    if (this.checkAccess()) {                                                                                       // 780
      this.currentFile = this.collection.findOne(this.search);                                                      // 781
      this.cursor = null;                                                                                           // 781
    }                                                                                                               //
    return this;                                                                                                    // 783
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 785
  /*                                                                                                                // 785
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name find                                                                                                        //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                  //
  @summary Load file or bunch of files                                                                              //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.find = function(search) {                                                               // 94
    if (this.debug) {                                                                                               // 794
      console.info("[FilesCollection] [find(" + (JSON.stringify(search)) + ")]");                                   // 794
    }                                                                                                               //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                     // 794
    this.srch(search);                                                                                              // 794
    if (this.checkAccess()) {                                                                                       // 798
      this.currentFile = null;                                                                                      // 799
      this.cursor = this.collection.find(this.search);                                                              // 799
    }                                                                                                               //
    return this;                                                                                                    // 801
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 803
  /*                                                                                                                // 803
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name get                                                                                                         //
  @summary Return value of current cursor or file                                                                   //
  @returns {Object|[Object]}                                                                                        //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.get = function() {                                                                      // 94
    if (this.debug) {                                                                                               // 811
      console.info('[FilesCollection] [get()]');                                                                    // 811
    }                                                                                                               //
    if (this.cursor) {                                                                                              // 812
      return this.cursor.fetch();                                                                                   // 812
    }                                                                                                               //
    return this.currentFile;                                                                                        // 813
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 815
  /*                                                                                                                // 815
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name fetch                                                                                                       //
  @summary Alias for `get()` method                                                                                 //
  @returns {[Object]}                                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.fetch = function() {                                                                    // 94
    var data;                                                                                                       // 823
    if (this.debug) {                                                                                               // 823
      console.info('[FilesCollection] [fetch()]');                                                                  // 823
    }                                                                                                               //
    data = this.get();                                                                                              // 823
    if (!_.isArray(data)) {                                                                                         // 825
      return [data];                                                                                                // 826
    } else {                                                                                                        //
      return data;                                                                                                  //
    }                                                                                                               //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 830
  /*                                                                                                                // 830
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
    var mName;                                                                                                      // 861
    if (autoStart == null) {                                                                                        //
      autoStart = true;                                                                                             //
    }                                                                                                               //
    if (this.checkAccess()) {                                                                                       // 861
      mName = autoStart ? 'start' : 'manual';                                                                       // 862
      return (new this._UploadInstance(config, this))[mName]();                                                     // 863
    } else {                                                                                                        //
      throw new Meteor.Error(401, "[FilesCollection] [insert] Access Denied");                                      // 865
    }                                                                                                               //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 868
  /*                                                                                                                // 868
  @locus Client                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name _UploadInstance                                                                                             //
  @class UploadInstance                                                                                             //
  @summary Internal Class, used in upload                                                                           //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype._UploadInstance = Meteor.isClient ? UploadInstance = (function() {                      // 94
    UploadInstance.prototype.__proto__ = EventEmitter.prototype;                                                    // 876
                                                                                                                    //
    function UploadInstance(config1, collection) {                                                                  // 877
      var base, base1, base2, base3, self;                                                                          // 878
      this.config = config1;                                                                                        // 878
      this.collection = collection;                                                                                 // 878
      EventEmitter.call(this);                                                                                      // 878
      if (this.collection.debug) {                                                                                  // 879
        console.info('[FilesCollection] [insert()]');                                                               // 879
      }                                                                                                             //
      self = this;                                                                                                  // 878
      if ((base = this.config).meta == null) {                                                                      //
        base.meta = {};                                                                                             //
      }                                                                                                             //
      if ((base1 = this.config).streams == null) {                                                                  //
        base1.streams = 2;                                                                                          //
      }                                                                                                             //
      if (this.config.streams < 1) {                                                                                // 883
        this.config.streams = 2;                                                                                    // 883
      }                                                                                                             //
      if ((base2 = this.config).chunkSize == null) {                                                                //
        base2.chunkSize = this.collection.chunkSize;                                                                //
      }                                                                                                             //
      if ((base3 = this.config).allowWebWorkers == null) {                                                          //
        base3.allowWebWorkers = true;                                                                               //
      }                                                                                                             //
      check(this.config, {                                                                                          // 878
        file: Match.Any,                                                                                            // 887
        meta: Match.Optional(Object),                                                                               // 887
        onError: Match.Optional(Function),                                                                          // 887
        onAbort: Match.Optional(Function),                                                                          // 887
        streams: Match.OneOf('dynamic', Number),                                                                    // 887
        onStart: Match.Optional(Function),                                                                          // 887
        chunkSize: Match.OneOf('dynamic', Number),                                                                  // 887
        onUploaded: Match.Optional(Function),                                                                       // 887
        onProgress: Match.Optional(Function),                                                                       // 887
        onBeforeUpload: Match.Optional(Function),                                                                   // 887
        allowWebWorkers: Boolean                                                                                    // 887
      });                                                                                                           //
      if (this.config.file) {                                                                                       // 901
        if (this.collection.debug) {                                                                                // 902
          console.time('insert ' + this.config.file.name);                                                          // 902
        }                                                                                                           //
        if (this.collection.debug) {                                                                                // 903
          console.time('loadFile ' + this.config.file.name);                                                        // 903
        }                                                                                                           //
        if (Worker && this.config.allowWebWorkers) {                                                                // 905
          this.worker = new Worker('/packages/ostrio_files/worker.js');                                             // 906
        } else {                                                                                                    //
          this.worker = null;                                                                                       // 908
        }                                                                                                           //
        this.trackerComp = null;                                                                                    // 902
        this.currentChunk = 0;                                                                                      // 902
        this.sentChunks = 0;                                                                                        // 902
        this.EOFsent = false;                                                                                       // 902
        this.transferTime = 0;                                                                                      // 902
        this.fileLength = 1;                                                                                        // 902
        this.fileId = this.collection.namingFunction();                                                             // 902
        this.pipes = [];                                                                                            // 902
        this.fileData = {                                                                                           // 902
          size: this.config.file.size,                                                                              // 919
          type: this.config.file.type,                                                                              // 919
          name: this.config.file.name                                                                               // 919
        };                                                                                                          //
        this.fileData = _.extend(this.fileData, this.collection.getExt(self.config.file.name), {                    // 902
          mime: this.collection.getMimeType(this.fileData)                                                          // 923
        });                                                                                                         //
        this.fileData['mime-type'] = this.fileData.mime;                                                            // 902
        this.result = new this.collection._FileUpload(_.extend(self.config, {                                       // 902
          fileData: this.fileData,                                                                                  // 926
          fileId: this.fileId,                                                                                      // 926
          MeteorFileAbort: this.collection.methodNames.MeteorFileAbort                                              // 926
        }));                                                                                                        //
        this.beforeunload = function(e) {                                                                           // 902
          var message;                                                                                              // 929
          message = _.isFunction(self.collection.onbeforeunloadMessage) ? self.collection.onbeforeunloadMessage.call(self.result, self.fileData) : self.collection.onbeforeunloadMessage;
          if (e) {                                                                                                  // 930
            e.returnValue = message;                                                                                // 930
          }                                                                                                         //
          return message;                                                                                           // 931
        };                                                                                                          //
        this.result.config.beforeunload = this.beforeunload;                                                        // 902
        window.addEventListener('beforeunload', this.beforeunload, false);                                          // 902
        this.result.config._onEnd = function() {                                                                    // 902
          return self.emitEvent('_onEnd');                                                                          //
        };                                                                                                          //
        this.addListener('end', this.end);                                                                          // 902
        this.addListener('start', this.start);                                                                      // 902
        this.addListener('upload', this.upload);                                                                    // 902
        this.addListener('sendEOF', this.sendEOF);                                                                  // 902
        this.addListener('prepare', this.prepare);                                                                  // 902
        this.addListener('sendViaDDP', this.sendViaDDP);                                                            // 902
        this.addListener('proceedChunk', this.proceedChunk);                                                        // 902
        this.addListener('createStreams', this.createStreams);                                                      // 902
        this.addListener('calculateStats', _.throttle(function() {                                                  // 902
          var _t, progress;                                                                                         // 947
          _t = (self.transferTime / self.sentChunks) / self.config.streams;                                         // 947
          self.result.estimateTime.set(_t * (self.fileLength - self.sentChunks));                                   // 947
          self.result.estimateSpeed.set(self.config.chunkSize / (_t / 1000));                                       // 947
          progress = Math.round((self.sentChunks / self.fileLength) * 100);                                         // 947
          self.result.progress.set(progress);                                                                       // 947
          self.config.onProgress && self.config.onProgress.call(self.result, progress, self.fileData);              // 947
          self.result.emitEvent('progress', [progress, self.fileData]);                                             // 947
        }, 250));                                                                                                   //
        this.addListener('_onEnd', function() {                                                                     // 902
          if (self.worker) {                                                                                        // 958
            self.worker.terminate();                                                                                // 958
          }                                                                                                         //
          if (self.trackerComp) {                                                                                   // 959
            self.trackerComp.stop();                                                                                // 959
          }                                                                                                         //
          if (self.beforeunload) {                                                                                  // 960
            window.removeEventListener('beforeunload', self.beforeunload, false);                                   // 960
          }                                                                                                         //
          if (self.result) {                                                                                        // 961
            return self.result.progress.set(0);                                                                     //
          }                                                                                                         //
        });                                                                                                         //
      } else {                                                                                                      //
        throw new Meteor.Error(500, "[FilesCollection] [insert] Have you forget to pass a File itself?");           // 963
      }                                                                                                             //
    }                                                                                                               //
                                                                                                                    //
    UploadInstance.prototype.end = function(error, data) {                                                          // 876
      if (this.collection.debug) {                                                                                  // 966
        console.timeEnd('insert ' + this.config.file.name);                                                         // 966
      }                                                                                                             //
      this.emitEvent('_onEnd');                                                                                     // 966
      this.result.emitEvent('uploaded', [error, data]);                                                             // 966
      this.config.onUploaded && this.config.onUploaded.call(this.result, error, data);                              // 966
      if (error) {                                                                                                  // 970
        if (this.collection.debug) {                                                                                // 971
          console.warn("[FilesCollection] [insert] [end] Error: ", error);                                          // 971
        }                                                                                                           //
        this.result.abort();                                                                                        // 971
        this.result.state.set('aborted');                                                                           // 971
        this.result.emitEvent('error', [error, this.fileData]);                                                     // 971
        this.config.onError && this.config.onError.call(this.result, error, this.fileData);                         // 971
      } else {                                                                                                      //
        this.result.state.set('completed');                                                                         // 977
        this.collection.emitEvent('afterUpload', [data]);                                                           // 977
      }                                                                                                             //
      this.result.emitEvent('end', [error, data || this.fileData]);                                                 // 966
      return this.result;                                                                                           // 980
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.sendViaDDP = function(evt) {                                                           // 876
      var j, len, opts, pipeFunc, ref, self;                                                                        // 983
      self = this;                                                                                                  // 983
      opts = {                                                                                                      // 983
        file: this.fileData,                                                                                        // 985
        fileId: this.fileId,                                                                                        // 985
        binData: evt.data.bin,                                                                                      // 985
        chunkId: evt.data.chunkId,                                                                                  // 985
        chunkSize: this.config.chunkSize,                                                                           // 985
        fileLength: this.fileLength                                                                                 // 985
      };                                                                                                            //
      this.emitEvent('data', [evt.data.bin]);                                                                       // 983
      if (this.pipes.length) {                                                                                      // 993
        ref = this.pipes;                                                                                           // 994
        for (j = 0, len = ref.length; j < len; j++) {                                                               // 994
          pipeFunc = ref[j];                                                                                        //
          opts.binData = pipeFunc(opts.binData);                                                                    // 995
        }                                                                                                           // 994
      }                                                                                                             //
      if (this.fileLength === evt.data.chunkId) {                                                                   // 997
        if (this.collection.debug) {                                                                                // 998
          console.timeEnd('loadFile ' + this.config.file.name);                                                     // 998
        }                                                                                                           //
        this.emitEvent('readEnd');                                                                                  // 998
      }                                                                                                             //
      if (opts.binData && opts.binData.length) {                                                                    // 1001
        Meteor.call(this.collection.methodNames.MeteorFileWrite, opts, function(error) {                            // 1002
          ++self.sentChunks;                                                                                        // 1003
          self.transferTime += (+(new Date)) - evt.data.start;                                                      // 1003
          if (error) {                                                                                              // 1005
            self.emitEvent('end', [error]);                                                                         // 1006
          } else {                                                                                                  //
            if (self.sentChunks >= self.fileLength) {                                                               // 1008
              self.emitEvent('sendEOF', [opts]);                                                                    // 1009
            } else if (self.currentChunk < self.fileLength) {                                                       //
              self.emitEvent('upload');                                                                             // 1011
            }                                                                                                       //
            self.emitEvent('calculateStats');                                                                       // 1008
          }                                                                                                         //
        });                                                                                                         //
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.sendEOF = function(opts) {                                                             // 876
      var self;                                                                                                     // 1017
      if (!this.EOFsent) {                                                                                          // 1017
        this.EOFsent = true;                                                                                        // 1018
        self = this;                                                                                                // 1018
        opts = {                                                                                                    // 1018
          eof: true,                                                                                                // 1021
          meta: this.config.meta,                                                                                   // 1021
          file: this.fileData,                                                                                      // 1021
          fileId: this.fileId,                                                                                      // 1021
          chunkSize: this.config.chunkSize,                                                                         // 1021
          fileLength: this.fileLength                                                                               // 1021
        };                                                                                                          //
        Meteor.call(this.collection.methodNames.MeteorFileWrite, opts, function() {                                 // 1018
          return self.emitEvent('end', arguments);                                                                  //
        });                                                                                                         //
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.proceedChunk = function(chunkId, start) {                                              // 876
      var chunk, fileReader, self;                                                                                  // 1033
      self = this;                                                                                                  // 1033
      chunk = this.config.file.slice(this.config.chunkSize * (chunkId - 1), this.config.chunkSize * chunkId);       // 1033
      fileReader = new FileReader;                                                                                  // 1033
      fileReader.onloadend = function(evt) {                                                                        // 1033
        var ref, ref1;                                                                                              // 1038
        self.emitEvent('sendViaDDP', [                                                                              // 1038
          {                                                                                                         //
            data: {                                                                                                 // 1038
              bin: ((fileReader != null ? fileReader.result : void 0) || ((ref = evt.srcElement) != null ? ref.result : void 0) || ((ref1 = evt.target) != null ? ref1.result : void 0)).split(',')[1],
              chunkId: chunkId,                                                                                     // 1039
              start: start                                                                                          // 1039
            }                                                                                                       //
          }                                                                                                         //
        ]);                                                                                                         //
      };                                                                                                            //
      fileReader.onerror = function(e) {                                                                            // 1033
        self.emitEvent('end', [(e.target || e.srcElement).error]);                                                  // 1047
      };                                                                                                            //
      fileReader.readAsDataURL(chunk);                                                                              // 1033
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.upload = function() {                                                                  // 876
      var self, start;                                                                                              // 1054
      start = +(new Date);                                                                                          // 1054
      if (this.result.onPause.get()) {                                                                              // 1055
        self = this;                                                                                                // 1056
        this.result.continueFunc = function() {                                                                     // 1056
          self.emitEvent('createStreams');                                                                          // 1058
        };                                                                                                          //
        return;                                                                                                     // 1060
      }                                                                                                             //
      if (this.result.state.get() === 'aborted') {                                                                  // 1062
        return this;                                                                                                // 1063
      }                                                                                                             //
      if (this.currentChunk <= this.fileLength) {                                                                   // 1065
        ++this.currentChunk;                                                                                        // 1066
        if (this.worker) {                                                                                          // 1067
          this.worker.postMessage({                                                                                 // 1068
            sentChunks: this.sentChunks,                                                                            // 1068
            start: start,                                                                                           // 1068
            currentChunk: this.currentChunk,                                                                        // 1068
            chunkSize: this.config.chunkSize,                                                                       // 1068
            file: this.config.file                                                                                  // 1068
          });                                                                                                       //
        } else {                                                                                                    //
          this.emitEvent('proceedChunk', [this.currentChunk, start]);                                               // 1070
        }                                                                                                           //
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.createStreams = function() {                                                           // 876
      var i, self;                                                                                                  // 1074
      i = 1;                                                                                                        // 1074
      self = this;                                                                                                  // 1074
      while (i <= this.config.streams) {                                                                            // 1076
        self.emitEvent('upload');                                                                                   // 1077
        i++;                                                                                                        // 1077
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.prepare = function() {                                                                 // 876
      var _len, self;                                                                                               // 1082
      self = this;                                                                                                  // 1082
      this.config.onStart && this.config.onStart.call(this.result, null, this.fileData);                            // 1082
      this.result.emitEvent('start', [null, this.fileData]);                                                        // 1082
      if (this.config.chunkSize === 'dynamic') {                                                                    // 1087
        this.config.chunkSize = this.config.file.size / 1000;                                                       // 1088
        if (this.config.chunkSize < 327680) {                                                                       // 1089
          this.config.chunkSize = 327680;                                                                           // 1090
        } else if (this.config.chunkSize > 1048576) {                                                               //
          this.config.chunkSize = 1048576;                                                                          // 1092
        }                                                                                                           //
      }                                                                                                             //
      this.config.chunkSize = Math.floor(this.config.chunkSize / 8) * 8;                                            // 1082
      _len = Math.ceil(this.config.file.size / this.config.chunkSize);                                              // 1082
      if (this.config.streams === 'dynamic') {                                                                      // 1096
        this.config.streams = _.clone(_len);                                                                        // 1097
        if (this.config.streams > 24) {                                                                             // 1098
          this.config.streams = 24;                                                                                 // 1098
        }                                                                                                           //
      }                                                                                                             //
      this.fileLength = _len <= 0 ? 1 : _len;                                                                       // 1082
      if (this.config.streams > this.fileLength) {                                                                  // 1101
        this.config.streams = this.fileLength;                                                                      // 1101
      }                                                                                                             //
      this.result.config.fileLength = this.fileLength;                                                              // 1082
      self.emitEvent('createStreams');                                                                              // 1082
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.pipe = function(func) {                                                                // 876
      this.pipes.push(func);                                                                                        // 1108
      return this;                                                                                                  // 1109
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.start = function() {                                                                   // 876
      var isUploadAllowed, self;                                                                                    // 1112
      self = this;                                                                                                  // 1112
      if (this.config.file.size <= 0) {                                                                             // 1113
        this.end(new Meteor.Error(400, 'Can\'t upload empty file'));                                                // 1114
        return this.result;                                                                                         // 1115
      }                                                                                                             //
      if (this.config.onBeforeUpload && _.isFunction(this.config.onBeforeUpload)) {                                 // 1117
        isUploadAllowed = this.config.onBeforeUpload.call(_.extend(this.result, this.collection.getUser()), this.fileData);
        if (isUploadAllowed !== true) {                                                                             // 1119
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'config.onBeforeUpload() returned false'));
        }                                                                                                           //
      }                                                                                                             //
      if (this.collection.onBeforeUpload && _.isFunction(this.collection.onBeforeUpload)) {                         // 1122
        isUploadAllowed = this.collection.onBeforeUpload.call(_.extend(this.result, this.collection.getUser()), this.fileData);
        if (isUploadAllowed !== true) {                                                                             // 1124
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'collection.onBeforeUpload() returned false'));
        }                                                                                                           //
      }                                                                                                             //
      Tracker.autorun(function(computation) {                                                                       // 1112
        self.trackerComp = computation;                                                                             // 1128
        if (!self.result.onPause.get()) {                                                                           // 1129
          if (Meteor.status().connected) {                                                                          // 1130
            self.result["continue"]();                                                                              // 1131
            if (self.collection.debug) {                                                                            // 1132
              console.info('[FilesCollection] [insert] [Tracker] [continue]');                                      // 1132
            }                                                                                                       //
          } else {                                                                                                  //
            self.result.pause();                                                                                    // 1134
            if (self.collection.debug) {                                                                            // 1135
              console.info('[FilesCollection] [insert] [Tracker] [pause]');                                         // 1135
            }                                                                                                       //
          }                                                                                                         //
        }                                                                                                           //
      });                                                                                                           //
      if (this.worker) {                                                                                            // 1138
        this.worker.onmessage = function(evt) {                                                                     // 1139
          if (evt.data.error) {                                                                                     // 1140
            if (self.collection.debug) {                                                                            // 1141
              console.warn(evt.data.error);                                                                         // 1141
            }                                                                                                       //
            self.emitEvent('proceedChunk', [evt.data.chunkId, evt.data.start]);                                     // 1141
          } else {                                                                                                  //
            self.emitEvent('sendViaDDP', [evt]);                                                                    // 1144
          }                                                                                                         //
        };                                                                                                          //
        this.worker.onerror = function(e) {                                                                         // 1139
          self.emitEvent('end', [e.message]);                                                                       // 1147
        };                                                                                                          //
      }                                                                                                             //
      if (this.collection.debug) {                                                                                  // 1150
        if (this.worker) {                                                                                          // 1151
          console.info("[FilesCollection] [insert] using WebWorkers");                                              // 1152
        } else {                                                                                                    //
          console.info("[FilesCollection] [insert] using MainThread");                                              // 1154
        }                                                                                                           //
      }                                                                                                             //
      self.emitEvent('prepare');                                                                                    // 1112
      return this.result;                                                                                           // 1157
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.manual = function() {                                                                  // 876
      var self;                                                                                                     // 1160
      self = this;                                                                                                  // 1160
      this.result.start = function() {                                                                              // 1160
        self.emitEvent('start');                                                                                    // 1162
      };                                                                                                            //
      this.result.pipe = function(func) {                                                                           // 1160
        self.pipe(func);                                                                                            // 1165
        return this;                                                                                                // 1166
      };                                                                                                            //
      return this.result;                                                                                           // 1167
    };                                                                                                              //
                                                                                                                    //
    return UploadInstance;                                                                                          //
                                                                                                                    //
  })() : void 0;                                                                                                    //
                                                                                                                    //
                                                                                                                    // 1170
  /*                                                                                                                // 1170
  @locus Client                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name _FileUpload                                                                                                 //
  @class FileUpload                                                                                                 //
  @summary Internal Class, instance of this class is returned from `insert()` method                                //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype._FileUpload = Meteor.isClient ? FileUpload = (function() {                              // 94
    FileUpload.prototype.__proto__ = EventEmitter.prototype;                                                        // 1178
                                                                                                                    //
    function FileUpload(config1) {                                                                                  // 1179
      this.config = config1;                                                                                        // 1180
      EventEmitter.call(this);                                                                                      // 1180
      this.file = _.extend(this.config.file, this.config.fileData);                                                 // 1180
      this.state = new ReactiveVar('active');                                                                       // 1180
      this.onPause = new ReactiveVar(false);                                                                        // 1180
      this.progress = new ReactiveVar(0);                                                                           // 1180
      this.estimateTime = new ReactiveVar(1000);                                                                    // 1180
      this.estimateSpeed = new ReactiveVar(0);                                                                      // 1180
    }                                                                                                               //
                                                                                                                    //
    FileUpload.prototype.continueFunc = function() {};                                                              // 1178
                                                                                                                    //
    FileUpload.prototype.pause = function() {                                                                       // 1178
      if (!this.onPause.get()) {                                                                                    // 1189
        this.onPause.set(true);                                                                                     // 1190
        this.state.set('paused');                                                                                   // 1190
        this.emitEvent('pause', [this.file]);                                                                       // 1190
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    FileUpload.prototype["continue"] = function() {                                                                 // 1178
      if (this.onPause.get()) {                                                                                     // 1195
        this.onPause.set(false);                                                                                    // 1196
        this.state.set('active');                                                                                   // 1196
        this.emitEvent('continue', [this.file]);                                                                    // 1196
        this.continueFunc.call();                                                                                   // 1196
        this.continueFunc = function() {};                                                                          // 1196
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    FileUpload.prototype.toggle = function() {                                                                      // 1178
      if (this.onPause.get()) {                                                                                     // 1203
        this["continue"]();                                                                                         // 1203
      } else {                                                                                                      //
        this.pause();                                                                                               // 1203
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    FileUpload.prototype.abort = function() {                                                                       // 1178
      window.removeEventListener('beforeunload', this.config.beforeunload, false);                                  // 1206
      this.config.onAbort && this.config.onAbort.call(this, this.file);                                             // 1206
      this.emitEvent('abort', [this.file]);                                                                         // 1206
      this.pause();                                                                                                 // 1206
      this.config._onEnd();                                                                                         // 1206
      this.state.set('aborted');                                                                                    // 1206
      if (this.config.debug) {                                                                                      // 1212
        console.timeEnd('insert ' + this.config.file.name);                                                         // 1212
      }                                                                                                             //
      if (this.config.fileLength) {                                                                                 // 1213
        Meteor.call(this.config.MeteorFileAbort, {                                                                  // 1214
          fileId: this.config.fileId,                                                                               // 1214
          fileLength: this.config.fileLength,                                                                       // 1214
          fileData: this.config.fileData                                                                            // 1214
        });                                                                                                         //
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    return FileUpload;                                                                                              //
                                                                                                                    //
  })() : void 0;                                                                                                    //
                                                                                                                    //
                                                                                                                    // 1218
  /*                                                                                                                // 1218
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
    var files, self;                                                                                                // 1228
    if (this.debug) {                                                                                               // 1228
      console.info("[FilesCollection] [remove(" + (JSON.stringify(search)) + ")]");                                 // 1228
    }                                                                                                               //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                     // 1228
    check(cb, Match.Optional(Function));                                                                            // 1228
    if (this.checkAccess()) {                                                                                       // 1232
      this.srch(search);                                                                                            // 1233
      if (Meteor.isClient) {                                                                                        // 1234
        Meteor.call(this.methodNames.MeteorFileUnlink, rcp(this), (cb ? cb : NOOP));                                // 1235
      }                                                                                                             //
      if (Meteor.isServer) {                                                                                        // 1237
        files = this.collection.find(this.search);                                                                  // 1238
        if (files.count() > 0) {                                                                                    // 1239
          self = this;                                                                                              // 1240
          files.forEach(function(file) {                                                                            // 1240
            return self.unlink(file);                                                                               //
          });                                                                                                       //
        }                                                                                                           //
        this.collection.remove(this.search, cb);                                                                    // 1238
      }                                                                                                             //
    } else {                                                                                                        //
      cb && cb(new Meteor.Error(401, '[FilesCollection] [remove] Access denied!'));                                 // 1244
    }                                                                                                               //
    return this;                                                                                                    // 1245
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 1247
  /*                                                                                                                // 1247
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name update                                                                                                      //
  @see http://docs.meteor.com/#/full/update                                                                         //
  @summary link Mongo.Collection update method                                                                      //
  @returns {Mongo.Collection} Instance                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.update = function() {                                                                   // 94
    this.collection.update.apply(this.collection, arguments);                                                       // 1256
    return this.collection;                                                                                         // 1257
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 1259
  /*                                                                                                                // 1259
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
    this.collection.deny(rules);                                                                                    // 1270
    return this.collection;                                                                                         // 1271
  } : void 0;                                                                                                       //
                                                                                                                    //
  FilesCollection.prototype.allow = Meteor.isServer ? function(rules) {                                             // 94
    this.collection.allow(rules);                                                                                   // 1274
    return this.collection;                                                                                         // 1275
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1278
  /*                                                                                                                // 1278
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
    this.collection.deny({                                                                                          // 1288
      insert: function() {                                                                                          // 1289
        return true;                                                                                                //
      },                                                                                                            //
      update: function() {                                                                                          // 1289
        return true;                                                                                                //
      },                                                                                                            //
      remove: function() {                                                                                          // 1289
        return true;                                                                                                //
      }                                                                                                             //
    });                                                                                                             //
    return this.collection;                                                                                         // 1292
  } : void 0;                                                                                                       //
                                                                                                                    //
  FilesCollection.prototype.allowClient = Meteor.isServer ? function() {                                            // 94
    this.collection.allow({                                                                                         // 1295
      insert: function() {                                                                                          // 1296
        return true;                                                                                                //
      },                                                                                                            //
      update: function() {                                                                                          // 1296
        return true;                                                                                                //
      },                                                                                                            //
      remove: function() {                                                                                          // 1296
        return true;                                                                                                //
      }                                                                                                             //
    });                                                                                                             //
    return this.collection;                                                                                         // 1299
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1303
  /*                                                                                                                // 1303
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name unlink                                                                                                      //
  @param {Object} fileRef - fileObj                                                                                 //
  @param {String} version - [Optional] file's version                                                               //
  @summary Unlink files and it's versions from FS                                                                   //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.unlink = Meteor.isServer ? function(fileRef, version) {                                 // 94
    var ref, ref1;                                                                                                  // 1313
    if (this.debug) {                                                                                               // 1313
      console.info("[FilesCollection] [unlink(" + fileRef._id + ", " + version + ")]");                             // 1313
    }                                                                                                               //
    if (version) {                                                                                                  // 1314
      if (((ref = fileRef.versions) != null ? ref[version] : void 0) && ((ref1 = fileRef.versions[version]) != null ? ref1.path : void 0)) {
        fs.unlink(fileRef.versions[version].path, NOOP);                                                            // 1316
      }                                                                                                             //
    } else {                                                                                                        //
      if (fileRef.versions && !_.isEmpty(fileRef.versions)) {                                                       // 1318
        _.each(fileRef.versions, function(vRef) {                                                                   // 1319
          return bound(function() {                                                                                 //
            return fs.unlink(vRef.path, NOOP);                                                                      //
          });                                                                                                       //
        });                                                                                                         //
      }                                                                                                             //
      fs.unlink(fileRef.path, NOOP);                                                                                // 1318
    }                                                                                                               //
    return this;                                                                                                    // 1322
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1325
  /*                                                                                                                // 1325
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name _404                                                                                                        //
  @summary Internal method, used to return 404 error                                                                //
  @returns {undefined}                                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype._404 = Meteor.isServer ? function(http) {                                               // 94
    var text;                                                                                                       // 1333
    if (this.debug) {                                                                                               // 1333
      console.warn("[FilesCollection] [download(" + http.request.originalUrl + ")] [_404] File not found");         // 1333
    }                                                                                                               //
    text = 'File Not Found :(';                                                                                     // 1333
    http.response.writeHead(404, {                                                                                  // 1333
      'Content-Length': text.length,                                                                                // 1336
      'Content-Type': 'text/plain'                                                                                  // 1336
    });                                                                                                             //
    http.response.end(text);                                                                                        // 1333
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1342
  /*                                                                                                                // 1342
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name download                                                                                                    //
  @param {Object|Files} self - Instance of FilesCollection                                                          //
  @summary Initiates the HTTP response                                                                              //
  @returns {undefined}                                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.download = Meteor.isServer ? function(http, version) {                                  // 94
    var fileRef, responseType, self;                                                                                // 1351
    if (version == null) {                                                                                          //
      version = 'original';                                                                                         //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 1351
      console.info("[FilesCollection] [download(" + http.request.originalUrl + ", " + version + ")]");              // 1351
    }                                                                                                               //
    responseType = '200';                                                                                           // 1351
    if (this.currentFile) {                                                                                         // 1353
      if (_.has(this.currentFile, 'versions') && _.has(this.currentFile.versions, version)) {                       // 1354
        fileRef = this.currentFile.versions[version];                                                               // 1355
      } else {                                                                                                      //
        fileRef = this.currentFile;                                                                                 // 1357
      }                                                                                                             //
    } else {                                                                                                        //
      fileRef = false;                                                                                              // 1359
    }                                                                                                               //
    if (!fileRef || !_.isObject(fileRef)) {                                                                         // 1361
      return this._404(http);                                                                                       // 1362
    } else if (this.currentFile) {                                                                                  //
      self = this;                                                                                                  // 1364
      if (this.downloadCallback) {                                                                                  // 1366
        if (!this.downloadCallback.call(_.extend(http, this.getUser(http)), this.currentFile)) {                    // 1367
          return this._404(http);                                                                                   // 1368
        }                                                                                                           //
      }                                                                                                             //
      if (this.interceptDownload && _.isFunction(this.interceptDownload)) {                                         // 1370
        if (this.interceptDownload(http, this.currentFile, version) === true) {                                     // 1371
          return;                                                                                                   // 1372
        }                                                                                                           //
      }                                                                                                             //
      fs.stat(fileRef.path, function(statErr, stats) {                                                              // 1364
        return bound(function() {                                                                                   //
          var array, dispositionEncoding, dispositionName, dispositionType, end, partiral, ref, ref1, ref2, ref3, reqRange, start, stream, streamErrorHandler, take, text;
          if (statErr || !stats.isFile()) {                                                                         // 1375
            return self._404(http);                                                                                 // 1376
          }                                                                                                         //
          if (stats.size !== fileRef.size && !self.integrityCheck) {                                                // 1378
            fileRef.size = stats.size;                                                                              // 1378
          }                                                                                                         //
          if (stats.size !== fileRef.size && self.integrityCheck) {                                                 // 1379
            responseType = '400';                                                                                   // 1379
          }                                                                                                         //
          partiral = false;                                                                                         // 1375
          reqRange = false;                                                                                         // 1375
          if (http.params.query.download && http.params.query.download === 'true') {                                // 1383
            dispositionType = 'attachment; ';                                                                       // 1384
          } else {                                                                                                  //
            dispositionType = 'inline; ';                                                                           // 1386
          }                                                                                                         //
          dispositionName = "filename=\"" + (encodeURIComponent(self.currentFile.name)) + "\"; filename=*UTF-8\"" + (encodeURIComponent(self.currentFile.name)) + "\"; ";
          dispositionEncoding = 'charset=utf-8';                                                                    // 1375
          http.response.setHeader('Content-Type', fileRef.type);                                                    // 1375
          http.response.setHeader('Content-Disposition', dispositionType + dispositionName + dispositionEncoding);  // 1375
          http.response.setHeader('Accept-Ranges', 'bytes');                                                        // 1375
          if ((ref = self.currentFile) != null ? (ref1 = ref.updatedAt) != null ? ref1.toUTCString() : void 0 : void 0) {
            http.response.setHeader('Last-Modified', (ref2 = self.currentFile) != null ? (ref3 = ref2.updatedAt) != null ? ref3.toUTCString() : void 0 : void 0);
          }                                                                                                         //
          http.response.setHeader('Connection', 'keep-alive');                                                      // 1375
          if (http.request.headers.range) {                                                                         // 1397
            partiral = true;                                                                                        // 1398
            array = http.request.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);                                    // 1398
            start = parseInt(array[1]);                                                                             // 1398
            end = parseInt(array[2]);                                                                               // 1398
            if (isNaN(end)) {                                                                                       // 1402
              end = fileRef.size - 1;                                                                               // 1403
            }                                                                                                       //
            take = end - start;                                                                                     // 1398
          } else {                                                                                                  //
            start = 0;                                                                                              // 1406
            end = fileRef.size - 1;                                                                                 // 1406
            take = fileRef.size;                                                                                    // 1406
          }                                                                                                         //
          if (partiral || (http.params.query.play && http.params.query.play === 'true')) {                          // 1410
            reqRange = {                                                                                            // 1411
              start: start,                                                                                         // 1411
              end: end                                                                                              // 1411
            };                                                                                                      //
            if (isNaN(start) && !isNaN(end)) {                                                                      // 1412
              reqRange.start = end - take;                                                                          // 1413
              reqRange.end = end;                                                                                   // 1413
            }                                                                                                       //
            if (!isNaN(start) && isNaN(end)) {                                                                      // 1415
              reqRange.start = start;                                                                               // 1416
              reqRange.end = start + take;                                                                          // 1416
            }                                                                                                       //
            if ((start + take) >= fileRef.size) {                                                                   // 1419
              reqRange.end = fileRef.size - 1;                                                                      // 1419
            }                                                                                                       //
            http.response.setHeader('Pragma', 'private');                                                           // 1411
            http.response.setHeader('Expires', new Date(+(new Date) + 1000 * 32400).toUTCString());                 // 1411
            http.response.setHeader('Cache-Control', 'private, maxage=10800, s-maxage=32400');                      // 1411
            if (self.strict && (reqRange.start >= (fileRef.size - 1) || reqRange.end > (fileRef.size - 1))) {       // 1424
              responseType = '416';                                                                                 // 1425
            } else {                                                                                                //
              responseType = '206';                                                                                 // 1427
            }                                                                                                       //
          } else {                                                                                                  //
            http.response.setHeader('Cache-Control', self.cacheControl);                                            // 1429
            responseType = '200';                                                                                   // 1429
          }                                                                                                         //
          streamErrorHandler = function(error) {                                                                    // 1375
            http.response.writeHead(500);                                                                           // 1433
            return http.response.end(error.toString());                                                             //
          };                                                                                                        //
          switch (responseType) {                                                                                   // 1436
            case '400':                                                                                             // 1436
              if (self.debug) {                                                                                     // 1438
                console.warn("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [400] Content-Length mismatch!");
              }                                                                                                     //
              text = 'Content-Length mismatch!';                                                                    // 1438
              http.response.writeHead(400, {                                                                        // 1438
                'Content-Type': 'text/plain',                                                                       // 1441
                'Cache-Control': 'no-cache',                                                                        // 1441
                'Content-Length': text.length                                                                       // 1441
              });                                                                                                   //
              http.response.end(text);                                                                              // 1438
              break;                                                                                                // 1445
            case '404':                                                                                             // 1436
              return self._404(http);                                                                               // 1447
              break;                                                                                                // 1448
            case '416':                                                                                             // 1436
              if (self.debug) {                                                                                     // 1450
                console.info("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [416] Content-Range is not specified!");
              }                                                                                                     //
              http.response.writeHead(416, {                                                                        // 1450
                'Content-Range': "bytes */" + fileRef.size                                                          // 1452
              });                                                                                                   //
              http.response.end();                                                                                  // 1450
              break;                                                                                                // 1454
            case '200':                                                                                             // 1436
              if (self.debug) {                                                                                     // 1456
                console.info("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [200]");          // 1456
              }                                                                                                     //
              stream = fs.createReadStream(fileRef.path);                                                           // 1456
              stream.on('open', (function(_this) {                                                                  // 1456
                return function() {                                                                                 //
                  http.response.writeHead(200);                                                                     // 1459
                  if (self.throttle) {                                                                              // 1460
                    return stream.pipe(new Throttle({                                                               //
                      bps: self.throttle,                                                                           // 1461
                      chunksize: self.chunkSize                                                                     // 1461
                    })).pipe(http.response);                                                                        //
                  } else {                                                                                          //
                    return stream.pipe(http.response);                                                              //
                  }                                                                                                 //
                };                                                                                                  //
              })(this)).on('error', streamErrorHandler);                                                            //
              break;                                                                                                // 1466
            case '206':                                                                                             // 1436
              if (self.debug) {                                                                                     // 1468
                console.info("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [206]");          // 1468
              }                                                                                                     //
              http.response.setHeader('Content-Range', "bytes " + reqRange.start + "-" + reqRange.end + "/" + fileRef.size);
              http.response.setHeader('Trailer', 'expires');                                                        // 1468
              http.response.setHeader('Transfer-Encoding', 'chunked');                                              // 1468
              if (self.throttle) {                                                                                  // 1472
                stream = fs.createReadStream(fileRef.path, {                                                        // 1473
                  start: reqRange.start,                                                                            // 1473
                  end: reqRange.end                                                                                 // 1473
                });                                                                                                 //
                stream.on('open', function() {                                                                      // 1473
                  return http.response.writeHead(206);                                                              //
                }).on('error', streamErrorHandler).on('end', function() {                                           //
                  return http.response.end();                                                                       //
                }).pipe(new Throttle({                                                                              //
                  bps: self.throttle,                                                                               // 1477
                  chunksize: self.chunkSize                                                                         // 1477
                })).pipe(http.response);                                                                            //
              } else {                                                                                              //
                stream = fs.createReadStream(fileRef.path, {                                                        // 1480
                  start: reqRange.start,                                                                            // 1480
                  end: reqRange.end                                                                                 // 1480
                });                                                                                                 //
                stream.on('open', function() {                                                                      // 1480
                  return http.response.writeHead(206);                                                              //
                }).on('error', streamErrorHandler).on('end', function() {                                           //
                  return http.response.end();                                                                       //
                }).pipe(http.response);                                                                             //
              }                                                                                                     //
              break;                                                                                                // 1485
          }                                                                                                         // 1436
        });                                                                                                         //
      });                                                                                                           //
    } else {                                                                                                        //
      return this._404(http);                                                                                       // 1488
    }                                                                                                               //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1491
  /*                                                                                                                // 1491
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
    if (this.debug) {                                                                                               // 1501
      console.info('[FilesCollection] [link()]');                                                                   // 1501
    }                                                                                                               //
    if (_.isString(fileRef)) {                                                                                      // 1502
      version = fileRef;                                                                                            // 1503
      fileRef = null;                                                                                               // 1503
    }                                                                                                               //
    if (!fileRef && !this.currentFile) {                                                                            // 1505
      return '';                                                                                                    // 1505
    }                                                                                                               //
    return formatFleURL(fileRef || this.currentFile, version);                                                      // 1506
  };                                                                                                                //
                                                                                                                    //
  return FilesCollection;                                                                                           //
                                                                                                                    //
})();                                                                                                               //
                                                                                                                    //
                                                                                                                    // 1508
/*                                                                                                                  // 1508
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
  var ext, ref, root;                                                                                               // 1519
  if (version == null) {                                                                                            //
    version = 'original';                                                                                           //
  }                                                                                                                 //
  root = __meteor_runtime_config__.ROOT_URL.replace(/\/+$/, '');                                                    // 1519
  if ((fileRef != null ? (ref = fileRef.extension) != null ? ref.length : void 0 : void 0) > 0) {                   // 1521
    ext = '.' + fileRef.extension;                                                                                  // 1522
  } else {                                                                                                          //
    ext = '';                                                                                                       // 1524
  }                                                                                                                 //
  if (fileRef["public"] === true) {                                                                                 // 1526
    return root + (version === 'original' ? fileRef._downloadRoute + "/" + fileRef._id + ext : fileRef._downloadRoute + "/" + version + "-" + fileRef._id + ext);
  } else {                                                                                                          //
    return root + (fileRef._downloadRoute + "/" + fileRef._collectionName + "/" + fileRef._id + "/" + version + "/" + fileRef._id + ext);
  }                                                                                                                 //
};                                                                                                                  // 1518
                                                                                                                    //
if (Meteor.isClient) {                                                                                              // 1531
                                                                                                                    // 1532
  /*                                                                                                                // 1532
  @locus Client                                                                                                     //
  @TemplateHelper                                                                                                   //
  @name fileURL                                                                                                     //
  @param {Object} fileRef - File reference object                                                                   //
  @param {String} version - [Optional] Version of file you would like to request                                    //
  @summary Get download URL for file by fileRef, even without subscription                                          //
  @example {{fileURL fileRef}}                                                                                      //
  @returns {String}                                                                                                 //
   */                                                                                                               //
  Template.registerHelper('fileURL', function(fileRef, version) {                                                   // 1532
    if (!fileRef || !_.isObject(fileRef)) {                                                                         // 1543
      return void 0;                                                                                                // 1543
    }                                                                                                               //
    version = !version || !_.isString(version) ? 'original' : version;                                              // 1543
    if (fileRef._id) {                                                                                              // 1545
      return formatFleURL(fileRef, version);                                                                        // 1546
    } else {                                                                                                        //
      return '';                                                                                                    // 1548
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
