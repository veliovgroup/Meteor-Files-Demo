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
        if (self.allowClientCode) {                                                                                 // 312
          __instData = cp(_insts[inst._prefix], inst);                                                              // 313
          if (self.onBeforeRemove && _.isFunction(self.onBeforeRemove)) {                                           // 314
            user = false;                                                                                           // 315
            userFuncs = {                                                                                           // 315
              userId: this.userId,                                                                                  // 316
              user: function() {                                                                                    // 316
                return Meteor.users.findOne(this.userId);                                                           //
              }                                                                                                     //
            };                                                                                                      //
            __inst = self.find.call(__instData, inst.search);                                                       // 315
            if (!self.onBeforeRemove.call(userFuncs, __inst.cursor || null)) {                                      // 322
              throw new Meteor.Error(403, '[FilesCollection] [remove] Not permitted!');                             // 323
            }                                                                                                       //
          }                                                                                                         //
          self.remove.call(__instData, inst.search);                                                                // 313
          return true;                                                                                              // 326
        } else {                                                                                                    //
          throw new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!');           // 328
        }                                                                                                           //
      };                                                                                                            //
      _methods[self.methodNames.MeteorFileWrite] = function(opts) {                                                 // 255
        var e, extension, extensionWithDot, fileName, isUploadAllowed, path, ref, result;                           // 332
        this.unblock();                                                                                             // 332
        check(opts, {                                                                                               // 332
          eof: Match.Optional(Boolean),                                                                             // 333
          meta: Match.Optional(Object),                                                                             // 333
          file: Object,                                                                                             // 333
          fileId: String,                                                                                           // 333
          binData: Match.Optional(String),                                                                          // 333
          chunkId: Match.Optional(Number),                                                                          // 333
          chunkSize: Number,                                                                                        // 333
          fileLength: Number                                                                                        // 333
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
        if (self.debug) {                                                                                           // 349
          console.info("[FilesCollection] [Write Method] Got #" + opts.chunkId + "/" + opts.fileLength + " chunks, dst: " + (opts.file.name || opts.file.fileName));
        }                                                                                                           //
        if (self.onBeforeUpload && _.isFunction(self.onBeforeUpload)) {                                             // 351
          isUploadAllowed = self.onBeforeUpload.call(_.extend({                                                     // 352
            file: opts.file                                                                                         // 352
          }, {                                                                                                      //
            userId: this.userId,                                                                                    // 354
            user: function() {                                                                                      // 354
              return Meteor.users.findOne(this.userId);                                                             //
            }                                                                                                       //
          }), opts.file);                                                                                           //
          if (isUploadAllowed !== true) {                                                                           // 359
            throw new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : '@onBeforeUpload() returned false');
          }                                                                                                         //
        }                                                                                                           //
        fileName = self.getFileName(opts.file);                                                                     // 332
        ref = self.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;            // 332
        path = self.storagePath + "/" + opts.fileId + extensionWithDot;                                             // 332
        result = _.extend(self.dataToSchema(_.extend(opts.file, {                                                   // 332
          path: path,                                                                                               // 366
          extension: extension,                                                                                     // 366
          name: fileName,                                                                                           // 366
          meta: opts.meta                                                                                           // 366
        })), {                                                                                                      //
          _id: opts.fileId                                                                                          // 366
        });                                                                                                         //
        if (opts.eof) {                                                                                             // 368
          try {                                                                                                     // 369
            return Meteor.wrapAsync(self.handleUpload.bind(self, result, path, opts))();                            // 370
          } catch (_error) {                                                                                        //
            e = _error;                                                                                             // 372
            if (self.debug) {                                                                                       // 372
              console.warn("[FilesCollection] [Write Method] Exception:", e);                                       // 372
            }                                                                                                       //
            throw e;                                                                                                // 373
          }                                                                                                         //
        } else {                                                                                                    //
          self.emit('handleUpload', result, path, opts, NOOP);                                                      // 375
        }                                                                                                           //
        return result;                                                                                              // 376
      };                                                                                                            //
      _methods[self.methodNames.MeteorFileAbort] = function(opts) {                                                 // 255
        var ext, path, ref;                                                                                         // 379
        check(opts, {                                                                                               // 379
          fileId: String,                                                                                           // 379
          fileData: Object,                                                                                         // 379
          fileLength: Number                                                                                        // 379
        });                                                                                                         //
        ext = "." + opts.fileData.ext;                                                                              // 379
        path = self.storagePath + "/" + opts.fileId + ext;                                                          // 379
        if (self.debug) {                                                                                           // 388
          console.info("[FilesCollection] [Abort Method]: For " + path);                                            // 388
        }                                                                                                           //
        if ((ref = self._writableStreams) != null ? ref[opts.fileId] : void 0) {                                    // 389
          self._writableStreams[opts.fileId].stream.end();                                                          // 390
          delete self._writableStreams[opts.fileId];                                                                // 390
          self.remove({                                                                                             // 390
            _id: opts.fileId                                                                                        // 392
          });                                                                                                       //
          self.unlink({                                                                                             // 390
            _id: opts.fileId,                                                                                       // 393
            path: path                                                                                              // 393
          });                                                                                                       //
        }                                                                                                           //
        return true;                                                                                                // 395
      };                                                                                                            //
      Meteor.methods(_methods);                                                                                     // 255
    }                                                                                                               //
  }                                                                                                                 //
                                                                                                                    //
                                                                                                                    // 398
  /*                                                                                                                // 398
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name finishUpload                                                                                                //
  @summary Internal method. Finish upload, close Writable stream, add recored to MongoDB and flush used memory      //
  @returns {undefined}                                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.finishUpload = Meteor.isServer ? function(result, path, opts, cb) {                     // 94
    var self;                                                                                                       // 406
    fs.chmod(path, this.permissions, NOOP);                                                                         // 406
    self = this;                                                                                                    // 406
    result.type = this.getMimeType(opts.file);                                                                      // 406
    result["public"] = this["public"];                                                                              // 406
    this.collection.insert(_.clone(result), function(error, _id) {                                                  // 406
      if (error) {                                                                                                  // 412
        return cb(new Meteor.Error(500, error));                                                                    //
      } else {                                                                                                      //
        result._id = _id;                                                                                           // 415
        if (self.debug) {                                                                                           // 416
          console.info("[FilesCollection] [Write Method] [finishUpload] -> " + path);                               // 416
        }                                                                                                           //
        self.onAfterUpload && self.onAfterUpload.call(self, result);                                                // 415
        self.emit('afterUpload', result);                                                                           // 415
        return cb(null, result);                                                                                    //
      }                                                                                                             //
    });                                                                                                             //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 423
  /*                                                                                                                // 423
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name handleUpload                                                                                                //
  @summary Internal method to handle upload process, pipe incoming data to Writable stream                          //
  @returns {undefined}                                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.handleUpload = Meteor.isServer ? function(result, path, opts, cb) {                     // 94
    var _dKeys, _hlEnd, base, binary, e, name, ref, self, start;                                                    // 431
    self = this;                                                                                                    // 431
    if (opts.eof) {                                                                                                 // 432
      binary = opts.binData;                                                                                        // 433
    } else {                                                                                                        //
      binary = new Buffer(opts.binData, 'base64');                                                                  // 435
    }                                                                                                               //
    try {                                                                                                           // 437
      if (opts.eof) {                                                                                               // 438
        _hlEnd = function() {                                                                                       // 439
          self._writableStreams[result._id].stream.end();                                                           // 440
          delete self._writableStreams[result._id];                                                                 // 440
          self.emit('finishUpload', result, path, opts, cb);                                                        // 440
        };                                                                                                          //
        if ((ref = this._writableStreams[result._id].delayed) != null ? ref[opts.fileLength] : void 0) {            // 445
          this._writableStreams[result._id].stream.write(this._writableStreams[result._id].delayed[opts.fileLength], function() {
            return bound(function() {                                                                               //
              delete self._writableStreams[result._id].delayed[opts.fileLength];                                    // 447
              _hlEnd();                                                                                             // 447
            });                                                                                                     //
          });                                                                                                       //
        } else {                                                                                                    //
          _hlEnd();                                                                                                 // 451
        }                                                                                                           //
      } else if (opts.chunkId > 0) {                                                                                //
        if ((base = this._writableStreams)[name = result._id] == null) {                                            //
          base[name] = {                                                                                            //
            stream: fs.createWriteStream(path, {                                                                    // 455
              flags: 'a',                                                                                           // 455
              mode: this.permissions                                                                                // 455
            }),                                                                                                     //
            delayed: {}                                                                                             // 455
          };                                                                                                        //
        }                                                                                                           //
        _dKeys = Object.keys(this._writableStreams[result._id].delayed);                                            // 454
        if (_dKeys.length) {                                                                                        // 459
          _.each(this._writableStreams[result._id].delayed, function(delayed, num) {                                // 460
            return bound(function() {                                                                               //
              if (num < opts.chunkId) {                                                                             // 461
                self._writableStreams[result._id].stream.write(delayed);                                            // 462
                delete self._writableStreams[result._id].delayed[num];                                              // 462
              }                                                                                                     //
            });                                                                                                     //
          });                                                                                                       //
        }                                                                                                           //
        start = opts.chunkSize * (opts.chunkId - 1);                                                                // 454
        if (this._writableStreams[result._id].stream.bytesWritten < start) {                                        // 467
          this._writableStreams[result._id].delayed[opts.chunkId] = binary;                                         // 468
        } else {                                                                                                    //
          this._writableStreams[result._id].stream.write(binary);                                                   // 470
        }                                                                                                           //
      }                                                                                                             //
    } catch (_error) {                                                                                              //
      e = _error;                                                                                                   // 472
      cb(e);                                                                                                        // 472
    }                                                                                                               //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 476
  /*                                                                                                                // 476
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getMimeType                                                                                                 //
  @param {Object} fileData - File Object                                                                            //
  @summary Returns file's mime-type                                                                                 //
  @returns {String}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getMimeType = function(fileData) {                                                      // 94
    var br, buf, error, ext, fd, mime, ref;                                                                         // 485
    check(fileData, Object);                                                                                        // 485
    if (fileData != null ? fileData.type : void 0) {                                                                // 486
      mime = fileData.type;                                                                                         // 486
    }                                                                                                               //
    if (Meteor.isServer && fileData.path && (!mime || !_.isString(mime))) {                                         // 487
      try {                                                                                                         // 488
        buf = new Buffer(262);                                                                                      // 489
        fd = fs.openSync(fileData.path, 'r');                                                                       // 489
        br = fs.readSync(fd, buf, 0, 262, 0);                                                                       // 489
        fs.close(fd, NOOP);                                                                                         // 489
        if (br < 262) {                                                                                             // 493
          buf = buf.slice(0, br);                                                                                   // 493
        }                                                                                                           //
        ref = fileType(buf), mime = ref.mime, ext = ref.ext;                                                        // 489
      } catch (_error) {                                                                                            //
        error = _error;                                                                                             // 495
      }                                                                                                             //
    }                                                                                                               //
    if (!mime || !_.isString(mime)) {                                                                               // 496
      mime = 'application/octet-stream';                                                                            // 497
    }                                                                                                               //
    return mime;                                                                                                    // 498
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 500
  /*                                                                                                                // 500
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getFileName                                                                                                 //
  @param {Object} fileData - File Object                                                                            //
  @summary Returns file's name                                                                                      //
  @returns {String}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getFileName = function(fileData) {                                                      // 94
    var cleanName, fileName;                                                                                        // 509
    fileName = fileData.name || fileData.fileName;                                                                  // 509
    if (_.isString(fileName) && fileName.length > 0) {                                                              // 510
      cleanName = function(str) {                                                                                   // 511
        return str.replace(/\.\./g, '').replace(/\//g, '');                                                         //
      };                                                                                                            //
      return cleanName(fileData.name || fileData.fileName);                                                         // 512
    } else {                                                                                                        //
      return '';                                                                                                    // 514
    }                                                                                                               //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 516
  /*                                                                                                                // 516
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getUser                                                                                                     //
  @summary Returns object with `userId` and `user()` method which return user's object                              //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getUser = function(http) {                                                              // 94
    var cookie, result, user;                                                                                       // 524
    result = {                                                                                                      // 524
      user: function() {                                                                                            // 525
        return null;                                                                                                // 525
      },                                                                                                            //
      userId: null                                                                                                  // 525
    };                                                                                                              //
    if (Meteor.isServer) {                                                                                          // 528
      if (http) {                                                                                                   // 529
        cookie = http.request.Cookies;                                                                              // 530
        if (_.has(Package, 'accounts-base') && cookie.has('meteor_login_token')) {                                  // 531
          user = Meteor.users.findOne({                                                                             // 532
            'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(cookie.get('meteor_login_token'))   // 532
          });                                                                                                       //
          if (user) {                                                                                               // 533
            result.user = function() {                                                                              // 534
              return user;                                                                                          // 534
            };                                                                                                      //
            result.userId = user._id;                                                                               // 534
          }                                                                                                         //
        }                                                                                                           //
      }                                                                                                             //
    } else {                                                                                                        //
      if (_.has(Package, 'accounts-base') && Meteor.userId()) {                                                     // 537
        result.user = function() {                                                                                  // 538
          return Meteor.user();                                                                                     // 538
        };                                                                                                          //
        result.userId = Meteor.userId();                                                                            // 538
      }                                                                                                             //
    }                                                                                                               //
    return result;                                                                                                  // 540
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 542
  /*                                                                                                                // 542
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name getExt                                                                                                      //
  @param {String} FileName - File name                                                                              //
  @summary Get extension from FileName                                                                              //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.getExt = function(fileName) {                                                           // 94
    var extension;                                                                                                  // 551
    if (!!~fileName.indexOf('.')) {                                                                                 // 551
      extension = fileName.split('.').pop();                                                                        // 552
      return {                                                                                                      // 553
        ext: extension,                                                                                             // 553
        extension: extension,                                                                                       // 553
        extensionWithDot: '.' + extension                                                                           // 553
      };                                                                                                            //
    } else {                                                                                                        //
      return {                                                                                                      // 555
        ext: '',                                                                                                    // 555
        extension: '',                                                                                              // 555
        extensionWithDot: ''                                                                                        // 555
      };                                                                                                            //
    }                                                                                                               //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 557
  /*                                                                                                                // 557
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name dataToSchema                                                                                                //
  @param {Object} data - File data                                                                                  //
  @summary Build object in accordance with schema from File data                                                    //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.dataToSchema = function(data) {                                                         // 94
    return {                                                                                                        // 566
      name: data.name,                                                                                              // 566
      extension: data.extension,                                                                                    // 566
      path: data.path,                                                                                              // 566
      meta: data.meta,                                                                                              // 566
      type: data.type,                                                                                              // 566
      size: data.size,                                                                                              // 566
      versions: {                                                                                                   // 566
        original: {                                                                                                 // 574
          path: data.path,                                                                                          // 575
          size: data.size,                                                                                          // 575
          type: data.type,                                                                                          // 575
          extension: data.extension                                                                                 // 575
        }                                                                                                           //
      },                                                                                                            //
      isVideo: !!~data.type.toLowerCase().indexOf('video'),                                                         // 566
      isAudio: !!~data.type.toLowerCase().indexOf('audio'),                                                         // 566
      isImage: !!~data.type.toLowerCase().indexOf('image'),                                                         // 566
      isText: !!~data.type.toLowerCase().indexOf('text'),                                                           // 566
      isJSON: !!~data.type.toLowerCase().indexOf('json'),                                                           // 566
      _prefix: data._prefix || this._prefix,                                                                        // 566
      _storagePath: data._storagePath || this.storagePath,                                                          // 566
      _downloadRoute: data._downloadRoute || this.downloadRoute,                                                    // 566
      _collectionName: data._collectionName || this.collectionName                                                  // 566
    };                                                                                                              //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 590
  /*                                                                                                                // 590
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name srch                                                                                                        //
  @param {String|Object} search - Search data                                                                       //
  @summary Build search object                                                                                      //
  @returns {Object}                                                                                                 //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.srch = function(search) {                                                               // 94
    if (search && _.isString(search)) {                                                                             // 599
      this.search = {                                                                                               // 600
        _id: search                                                                                                 // 601
      };                                                                                                            //
    } else {                                                                                                        //
      this.search = search || {};                                                                                   // 603
    }                                                                                                               //
    return this.search;                                                                                             //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 606
  /*                                                                                                                // 606
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
    var extension, extensionWithDot, fileName, path, randFileName, ref, result;                                     // 617
    if (opts == null) {                                                                                             //
      opts = {};                                                                                                    //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 617
      console.info("[FilesCollection] [write()]");                                                                  // 617
    }                                                                                                               //
    check(opts, Match.Optional(Object));                                                                            // 617
    check(callback, Match.Optional(Function));                                                                      // 617
    if (this.checkAccess()) {                                                                                       // 621
      randFileName = this.namingFunction();                                                                         // 622
      fileName = opts.name || opts.fileName ? opts.name || opts.fileName : randFileName;                            // 622
      ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;              // 622
      path = this.storagePath + "/" + randFileName + extensionWithDot;                                              // 622
      opts.type = this.getMimeType(opts);                                                                           // 622
      if (!opts.meta) {                                                                                             // 630
        opts.meta = {};                                                                                             // 630
      }                                                                                                             //
      if (!opts.size) {                                                                                             // 631
        opts.size = buffer.length;                                                                                  // 631
      }                                                                                                             //
      result = this.dataToSchema({                                                                                  // 622
        name: fileName,                                                                                             // 634
        path: path,                                                                                                 // 634
        meta: opts.meta,                                                                                            // 634
        type: opts.type,                                                                                            // 634
        size: opts.size,                                                                                            // 634
        extension: extension                                                                                        // 634
      });                                                                                                           //
      if (this.debug) {                                                                                             // 641
        console.info("[FilesCollection] [write]: " + fileName + " -> " + this.collectionName);                      // 641
      }                                                                                                             //
      fs.outputFile(path, buffer, 'binary', function(error) {                                                       // 622
        return bound(function() {                                                                                   //
          if (error) {                                                                                              // 644
            return callback && callback(error);                                                                     //
          } else {                                                                                                  //
            result._id = this.collection.insert(_.clone(result));                                                   // 647
            return callback && callback(null, result);                                                              //
          }                                                                                                         //
        });                                                                                                         //
      });                                                                                                           //
      return this;                                                                                                  // 650
    }                                                                                                               //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 654
  /*                                                                                                                // 654
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
    var extension, extensionWithDot, fileName, path, randFileName, ref, self;                                       // 665
    if (opts == null) {                                                                                             //
      opts = {};                                                                                                    //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 665
      console.info("[FilesCollection] [load(" + url + ", " + (JSON.stringify(opts)) + ", callback)]");              // 665
    }                                                                                                               //
    check(url, String);                                                                                             // 665
    check(opts, Match.Optional(Object));                                                                            // 665
    check(callback, Match.Optional(Function));                                                                      // 665
    self = this;                                                                                                    // 665
    randFileName = this.namingFunction();                                                                           // 665
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : randFileName;                              // 665
    ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                // 665
    path = this.storagePath + "/" + randFileName + extensionWithDot;                                                // 665
    if (!opts.meta) {                                                                                               // 676
      opts.meta = {};                                                                                               // 676
    }                                                                                                               //
    request.get(url).on('error', function(error) {                                                                  // 665
      return bound(function() {                                                                                     //
        throw new Meteor.Error(500, ("Error on [load(" + url + ")]:") + JSON.stringify(error));                     // 679
      });                                                                                                           //
    }).on('response', function(response) {                                                                          //
      return bound(function() {                                                                                     //
        var result;                                                                                                 // 682
        if (self.debug) {                                                                                           // 682
          console.info("[FilesCollection] [load] Received: " + url);                                                // 682
        }                                                                                                           //
        result = self.dataToSchema({                                                                                // 682
          name: fileName,                                                                                           // 685
          path: path,                                                                                               // 685
          meta: opts.meta,                                                                                          // 685
          type: opts.type || response.headers['content-type'],                                                      // 685
          size: opts.size || response.headers['content-length'],                                                    // 685
          extension: extension                                                                                      // 685
        });                                                                                                         //
        return self.collection.insert(_.clone(result), function(error, fileRef) {                                   //
          if (error) {                                                                                              // 693
            if (self.debug) {                                                                                       // 694
              console.warn("[FilesCollection] [load] [insert] Error: " + fileName + " -> " + self.collectionName, error);
            }                                                                                                       //
            return callback && callback(error);                                                                     //
          } else {                                                                                                  //
            if (self.debug) {                                                                                       // 697
              console.info("[FilesCollection] [load] [insert] " + fileName + " -> " + self.collectionName);         // 697
            }                                                                                                       //
            return callback && callback(null, fileRef);                                                             //
          }                                                                                                         //
        });                                                                                                         //
      });                                                                                                           //
    }).pipe(fs.createWriteStream(path, {                                                                            //
      flags: 'w'                                                                                                    // 699
    }));                                                                                                            //
    return this;                                                                                                    // 701
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 705
  /*                                                                                                                // 705
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
    var self;                                                                                                       // 715
    if (opts == null) {                                                                                             //
      opts = {};                                                                                                    //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 715
      console.info("[FilesCollection] [addFile(" + path + ")]");                                                    // 715
    }                                                                                                               //
    if (this["public"]) {                                                                                           // 717
      throw new Meteor.Error(403, 'Can not run [addFile] on public collection! Just Move file to root of your server, then add record to Collection');
    }                                                                                                               //
    check(path, String);                                                                                            // 715
    check(opts, Match.Optional(Object));                                                                            // 715
    check(callback, Match.Optional(Function));                                                                      // 715
    self = this;                                                                                                    // 715
    fs.stat(path, function(error, stats) {                                                                          // 715
      return bound(function() {                                                                                     //
        var _cn, extension, extensionWithDot, fileName, pathParts, ref, result;                                     // 724
        if (error) {                                                                                                // 724
          return callback && callback(error);                                                                       //
        } else if (stats.isFile()) {                                                                                //
          pathParts = path.split('/');                                                                              // 727
          fileName = pathParts[pathParts.length - 1];                                                               // 727
          ref = self.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;          // 727
          if (!opts.type) {                                                                                         // 732
            opts.type = 'application/*';                                                                            // 732
          }                                                                                                         //
          if (!opts.meta) {                                                                                         // 733
            opts.meta = {};                                                                                         // 733
          }                                                                                                         //
          if (!opts.size) {                                                                                         // 734
            opts.size = stats.size;                                                                                 // 734
          }                                                                                                         //
          result = self.dataToSchema({                                                                              // 727
            name: fileName,                                                                                         // 737
            path: path,                                                                                             // 737
            meta: opts.meta,                                                                                        // 737
            type: opts.type,                                                                                        // 737
            size: opts.size,                                                                                        // 737
            extension: extension,                                                                                   // 737
            _storagePath: path.replace("/" + fileName, '')                                                          // 737
          });                                                                                                       //
          _cn = self.collectionName;                                                                                // 727
          return self.collection.insert(_.clone(result), function(error, record) {                                  //
            if (error) {                                                                                            // 747
              if (self.debug) {                                                                                     // 748
                console.warn("[FilesCollection] [addFile] [insert] Error: " + fileName + " -> " + _cn, error);      // 748
              }                                                                                                     //
              return callback && callback(error);                                                                   //
            } else {                                                                                                //
              if (self.debug) {                                                                                     // 751
                console.info("[FilesCollection] [addFile] [insert]: " + fileName + " -> " + _cn);                   // 751
              }                                                                                                     //
              return callback && callback(null, result);                                                            //
            }                                                                                                       //
          });                                                                                                       //
        } else {                                                                                                    //
          return callback && callback(new Meteor.Error(400, "[FilesCollection] [addFile(" + path + ")]: File does not exist"));
        }                                                                                                           //
      });                                                                                                           //
    });                                                                                                             //
    return this;                                                                                                    // 756
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 760
  /*                                                                                                                // 760
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name findOne                                                                                                     //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                  //
  @summary Load file                                                                                                //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.findOne = function(search) {                                                            // 94
    if (this.debug) {                                                                                               // 769
      console.info("[FilesCollection] [findOne(" + (JSON.stringify(search)) + ")]");                                // 769
    }                                                                                                               //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                     // 769
    this.srch(search);                                                                                              // 769
    if (this.checkAccess()) {                                                                                       // 773
      this.currentFile = this.collection.findOne(this.search);                                                      // 774
      this.cursor = null;                                                                                           // 774
    }                                                                                                               //
    return this;                                                                                                    // 776
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 778
  /*                                                                                                                // 778
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name find                                                                                                        //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                  //
  @summary Load file or bunch of files                                                                              //
  @returns {FilesCollection} Instance                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.find = function(search) {                                                               // 94
    if (this.debug) {                                                                                               // 787
      console.info("[FilesCollection] [find(" + (JSON.stringify(search)) + ")]");                                   // 787
    }                                                                                                               //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                     // 787
    this.srch(search);                                                                                              // 787
    if (this.checkAccess()) {                                                                                       // 791
      this.currentFile = null;                                                                                      // 792
      this.cursor = this.collection.find(this.search);                                                              // 792
    }                                                                                                               //
    return this;                                                                                                    // 794
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 796
  /*                                                                                                                // 796
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name get                                                                                                         //
  @summary Return value of current cursor or file                                                                   //
  @returns {Object|[Object]}                                                                                        //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.get = function() {                                                                      // 94
    if (this.debug) {                                                                                               // 804
      console.info('[FilesCollection] [get()]');                                                                    // 804
    }                                                                                                               //
    if (this.cursor) {                                                                                              // 805
      return this.cursor.fetch();                                                                                   // 805
    }                                                                                                               //
    return this.currentFile;                                                                                        // 806
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 808
  /*                                                                                                                // 808
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name fetch                                                                                                       //
  @summary Alias for `get()` method                                                                                 //
  @returns {[Object]}                                                                                               //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.fetch = function() {                                                                    // 94
    var data;                                                                                                       // 816
    if (this.debug) {                                                                                               // 816
      console.info('[FilesCollection] [fetch()]');                                                                  // 816
    }                                                                                                               //
    data = this.get();                                                                                              // 816
    if (!_.isArray(data)) {                                                                                         // 818
      return [data];                                                                                                // 819
    } else {                                                                                                        //
      return data;                                                                                                  //
    }                                                                                                               //
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 823
  /*                                                                                                                // 823
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
    var mName;                                                                                                      // 854
    if (autoStart == null) {                                                                                        //
      autoStart = true;                                                                                             //
    }                                                                                                               //
    if (this.checkAccess()) {                                                                                       // 854
      mName = autoStart ? 'start' : 'manual';                                                                       // 855
      return (new this._UploadInstance(config, this))[mName]();                                                     // 856
    } else {                                                                                                        //
      throw new Meteor.Error(401, "[FilesCollection] [insert] Access Denied");                                      // 858
    }                                                                                                               //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 861
  /*                                                                                                                // 861
  @locus Client                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name _UploadInstance                                                                                             //
  @class UploadInstance                                                                                             //
  @summary Internal Class, used in upload                                                                           //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype._UploadInstance = Meteor.isClient ? UploadInstance = (function() {                      // 94
    UploadInstance.prototype.__proto__ = EventEmitter.prototype;                                                    // 869
                                                                                                                    //
    function UploadInstance(config1, collection) {                                                                  // 870
      var base, base1, base2, base3, self;                                                                          // 871
      this.config = config1;                                                                                        // 871
      this.collection = collection;                                                                                 // 871
      EventEmitter.call(this);                                                                                      // 871
      if (this.collection.debug) {                                                                                  // 872
        console.info('[FilesCollection] [insert()]');                                                               // 872
      }                                                                                                             //
      self = this;                                                                                                  // 871
      if ((base = this.config).meta == null) {                                                                      //
        base.meta = {};                                                                                             //
      }                                                                                                             //
      if ((base1 = this.config).streams == null) {                                                                  //
        base1.streams = 2;                                                                                          //
      }                                                                                                             //
      if (this.config.streams < 1) {                                                                                // 876
        this.config.streams = 2;                                                                                    // 876
      }                                                                                                             //
      if ((base2 = this.config).chunkSize == null) {                                                                //
        base2.chunkSize = this.collection.chunkSize;                                                                //
      }                                                                                                             //
      if ((base3 = this.config).allowWebWorkers == null) {                                                          //
        base3.allowWebWorkers = true;                                                                               //
      }                                                                                                             //
      check(this.config, {                                                                                          // 871
        file: Match.Any,                                                                                            // 880
        meta: Match.Optional(Object),                                                                               // 880
        onError: Match.Optional(Function),                                                                          // 880
        onAbort: Match.Optional(Function),                                                                          // 880
        streams: Match.OneOf('dynamic', Number),                                                                    // 880
        onStart: Match.Optional(Function),                                                                          // 880
        chunkSize: Match.OneOf('dynamic', Number),                                                                  // 880
        onUploaded: Match.Optional(Function),                                                                       // 880
        onProgress: Match.Optional(Function),                                                                       // 880
        onBeforeUpload: Match.Optional(Function),                                                                   // 880
        allowWebWorkers: Boolean                                                                                    // 880
      });                                                                                                           //
      if (this.config.file) {                                                                                       // 894
        if (this.collection.debug) {                                                                                // 895
          console.time('insert ' + this.config.file.name);                                                          // 895
        }                                                                                                           //
        if (this.collection.debug) {                                                                                // 896
          console.time('loadFile ' + this.config.file.name);                                                        // 896
        }                                                                                                           //
        if (Worker && this.config.allowWebWorkers) {                                                                // 898
          this.worker = new Worker('/packages/ostrio_files/worker.js');                                             // 899
        } else {                                                                                                    //
          this.worker = null;                                                                                       // 901
        }                                                                                                           //
        this.trackerComp = null;                                                                                    // 895
        this.currentChunk = 0;                                                                                      // 895
        this.sentChunks = 0;                                                                                        // 895
        this.EOFsent = false;                                                                                       // 895
        this.transferTime = 0;                                                                                      // 895
        this.fileLength = 1;                                                                                        // 895
        this.fileId = this.collection.namingFunction();                                                             // 895
        this.pipes = [];                                                                                            // 895
        this.fileData = {                                                                                           // 895
          size: this.config.file.size,                                                                              // 912
          type: this.config.file.type,                                                                              // 912
          name: this.config.file.name                                                                               // 912
        };                                                                                                          //
        this.fileData = _.extend(this.fileData, this.collection.getExt(self.config.file.name), {                    // 895
          mime: this.collection.getMimeType(this.fileData)                                                          // 916
        });                                                                                                         //
        this.fileData['mime-type'] = this.fileData.mime;                                                            // 895
        this.result = new this.collection._FileUpload(_.extend(self.config, {                                       // 895
          fileData: this.fileData,                                                                                  // 919
          fileId: this.fileId,                                                                                      // 919
          MeteorFileAbort: this.collection.methodNames.MeteorFileAbort                                              // 919
        }));                                                                                                        //
        this.beforeunload = function(e) {                                                                           // 895
          var message;                                                                                              // 922
          message = _.isFunction(self.collection.onbeforeunloadMessage) ? self.collection.onbeforeunloadMessage.call(self.result, self.fileData) : self.collection.onbeforeunloadMessage;
          if (e) {                                                                                                  // 923
            e.returnValue = message;                                                                                // 923
          }                                                                                                         //
          return message;                                                                                           // 924
        };                                                                                                          //
        this.result.config.beforeunload = this.beforeunload;                                                        // 895
        window.addEventListener('beforeunload', this.beforeunload, false);                                          // 895
        this.result.config._onEnd = function() {                                                                    // 895
          return self.emitEvent('_onEnd');                                                                          //
        };                                                                                                          //
        this.addListener('end', this.end);                                                                          // 895
        this.addListener('start', this.start);                                                                      // 895
        this.addListener('upload', this.upload);                                                                    // 895
        this.addListener('sendEOF', this.sendEOF);                                                                  // 895
        this.addListener('prepare', this.prepare);                                                                  // 895
        this.addListener('sendViaDDP', this.sendViaDDP);                                                            // 895
        this.addListener('proceedChunk', this.proceedChunk);                                                        // 895
        this.addListener('createStreams', this.createStreams);                                                      // 895
        this.addListener('calculateStats', _.throttle(function() {                                                  // 895
          var _t, progress;                                                                                         // 940
          _t = (self.transferTime / self.sentChunks) / self.config.streams;                                         // 940
          self.result.estimateTime.set(_t * (self.fileLength - self.sentChunks));                                   // 940
          self.result.estimateSpeed.set(self.config.chunkSize / (_t / 1000));                                       // 940
          progress = Math.round((self.sentChunks / self.fileLength) * 100);                                         // 940
          self.result.progress.set(progress);                                                                       // 940
          self.config.onProgress && self.config.onProgress.call(self.result, progress, self.fileData);              // 940
          self.result.emitEvent('progress', [progress, self.fileData]);                                             // 940
        }, 250));                                                                                                   //
        this.addListener('_onEnd', function() {                                                                     // 895
          if (self.worker) {                                                                                        // 951
            self.worker.terminate();                                                                                // 951
          }                                                                                                         //
          if (self.trackerComp) {                                                                                   // 952
            self.trackerComp.stop();                                                                                // 952
          }                                                                                                         //
          if (self.beforeunload) {                                                                                  // 953
            window.removeEventListener('beforeunload', self.beforeunload, false);                                   // 953
          }                                                                                                         //
          if (self.result) {                                                                                        // 954
            return self.result.progress.set(0);                                                                     //
          }                                                                                                         //
        });                                                                                                         //
      } else {                                                                                                      //
        throw new Meteor.Error(500, "[FilesCollection] [insert] Have you forget to pass a File itself?");           // 956
      }                                                                                                             //
    }                                                                                                               //
                                                                                                                    //
    UploadInstance.prototype.end = function(error, data) {                                                          // 869
      if (this.collection.debug) {                                                                                  // 959
        console.timeEnd('insert ' + this.config.file.name);                                                         // 959
      }                                                                                                             //
      this.emitEvent('_onEnd');                                                                                     // 959
      this.result.emitEvent('uploaded', [error, data]);                                                             // 959
      this.config.onUploaded && this.config.onUploaded.call(this.result, error, data);                              // 959
      if (error) {                                                                                                  // 963
        if (this.collection.debug) {                                                                                // 964
          console.warn("[FilesCollection] [insert] [end] Error: ", error);                                          // 964
        }                                                                                                           //
        this.result.abort();                                                                                        // 964
        this.result.state.set('aborted');                                                                           // 964
        this.result.emitEvent('error', [error, this.fileData]);                                                     // 964
        this.config.onError && this.config.onError.call(this.result, error, this.fileData);                         // 964
      } else {                                                                                                      //
        this.result.state.set('completed');                                                                         // 970
        this.collection.emitEvent('afterUpload', [data]);                                                           // 970
      }                                                                                                             //
      this.result.emitEvent('end', [error, data || this.fileData]);                                                 // 959
      return this.result;                                                                                           // 973
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.sendViaDDP = function(evt) {                                                           // 869
      var j, len, opts, pipeFunc, ref, self;                                                                        // 976
      self = this;                                                                                                  // 976
      opts = {                                                                                                      // 976
        file: this.fileData,                                                                                        // 978
        fileId: this.fileId,                                                                                        // 978
        binData: evt.data.bin,                                                                                      // 978
        chunkId: evt.data.chunkId,                                                                                  // 978
        chunkSize: this.config.chunkSize,                                                                           // 978
        fileLength: this.fileLength                                                                                 // 978
      };                                                                                                            //
      this.emitEvent('data', [evt.data.bin]);                                                                       // 976
      if (this.pipes.length) {                                                                                      // 986
        ref = this.pipes;                                                                                           // 987
        for (j = 0, len = ref.length; j < len; j++) {                                                               // 987
          pipeFunc = ref[j];                                                                                        //
          opts.binData = pipeFunc(opts.binData);                                                                    // 988
        }                                                                                                           // 987
      }                                                                                                             //
      if (this.fileLength === evt.data.chunkId) {                                                                   // 990
        if (this.collection.debug) {                                                                                // 991
          console.timeEnd('loadFile ' + this.config.file.name);                                                     // 991
        }                                                                                                           //
        this.emitEvent('readEnd');                                                                                  // 991
      }                                                                                                             //
      if (opts.binData && opts.binData.length) {                                                                    // 994
        Meteor.call(this.collection.methodNames.MeteorFileWrite, opts, function(error) {                            // 995
          ++self.sentChunks;                                                                                        // 996
          self.transferTime += (+(new Date)) - evt.data.start;                                                      // 996
          if (error) {                                                                                              // 998
            self.emitEvent('end', [error]);                                                                         // 999
          } else {                                                                                                  //
            if (self.sentChunks >= self.fileLength) {                                                               // 1001
              self.emitEvent('sendEOF', [opts]);                                                                    // 1002
            } else if (self.currentChunk < self.fileLength) {                                                       //
              self.emitEvent('upload');                                                                             // 1004
            }                                                                                                       //
            self.emitEvent('calculateStats');                                                                       // 1001
          }                                                                                                         //
        });                                                                                                         //
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.sendEOF = function(opts) {                                                             // 869
      var self;                                                                                                     // 1010
      if (!this.EOFsent) {                                                                                          // 1010
        this.EOFsent = true;                                                                                        // 1011
        self = this;                                                                                                // 1011
        opts = {                                                                                                    // 1011
          eof: true,                                                                                                // 1014
          meta: this.config.meta,                                                                                   // 1014
          file: this.fileData,                                                                                      // 1014
          fileId: this.fileId,                                                                                      // 1014
          chunkSize: this.config.chunkSize,                                                                         // 1014
          fileLength: this.fileLength                                                                               // 1014
        };                                                                                                          //
        Meteor.call(this.collection.methodNames.MeteorFileWrite, opts, function() {                                 // 1011
          return self.emitEvent('end', arguments);                                                                  //
        });                                                                                                         //
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.proceedChunk = function(chunkId, start) {                                              // 869
      var chunk, fileReader, self;                                                                                  // 1026
      self = this;                                                                                                  // 1026
      chunk = this.config.file.slice(this.config.chunkSize * (chunkId - 1), this.config.chunkSize * chunkId);       // 1026
      fileReader = new FileReader;                                                                                  // 1026
      fileReader.onloadend = function(evt) {                                                                        // 1026
        var ref, ref1;                                                                                              // 1031
        self.emitEvent('sendViaDDP', [                                                                              // 1031
          {                                                                                                         //
            data: {                                                                                                 // 1031
              bin: ((fileReader != null ? fileReader.result : void 0) || ((ref = evt.srcElement) != null ? ref.result : void 0) || ((ref1 = evt.target) != null ? ref1.result : void 0)).split(',')[1],
              chunkId: chunkId,                                                                                     // 1032
              start: start                                                                                          // 1032
            }                                                                                                       //
          }                                                                                                         //
        ]);                                                                                                         //
      };                                                                                                            //
      fileReader.onerror = function(e) {                                                                            // 1026
        self.emitEvent('end', [(e.target || e.srcElement).error]);                                                  // 1040
      };                                                                                                            //
      fileReader.readAsDataURL(chunk);                                                                              // 1026
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.upload = function() {                                                                  // 869
      var self, start;                                                                                              // 1047
      start = +(new Date);                                                                                          // 1047
      if (this.result.onPause.get()) {                                                                              // 1048
        self = this;                                                                                                // 1049
        this.result.continueFunc = function() {                                                                     // 1049
          self.emitEvent('createStreams');                                                                          // 1051
        };                                                                                                          //
        return;                                                                                                     // 1053
      }                                                                                                             //
      if (this.result.state.get() === 'aborted') {                                                                  // 1055
        return this;                                                                                                // 1056
      }                                                                                                             //
      if (this.currentChunk <= this.fileLength) {                                                                   // 1058
        ++this.currentChunk;                                                                                        // 1059
        if (this.worker) {                                                                                          // 1060
          this.worker.postMessage({                                                                                 // 1061
            sentChunks: this.sentChunks,                                                                            // 1061
            start: start,                                                                                           // 1061
            currentChunk: this.currentChunk,                                                                        // 1061
            chunkSize: this.config.chunkSize,                                                                       // 1061
            file: this.config.file                                                                                  // 1061
          });                                                                                                       //
        } else {                                                                                                    //
          this.emitEvent('proceedChunk', [this.currentChunk, start]);                                               // 1063
        }                                                                                                           //
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.createStreams = function() {                                                           // 869
      var i, self;                                                                                                  // 1067
      i = 1;                                                                                                        // 1067
      self = this;                                                                                                  // 1067
      while (i <= this.config.streams) {                                                                            // 1069
        self.emitEvent('upload');                                                                                   // 1070
        i++;                                                                                                        // 1070
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.prepare = function() {                                                                 // 869
      var _len, self;                                                                                               // 1075
      self = this;                                                                                                  // 1075
      this.config.onStart && this.config.onStart.call(this.result, null, this.fileData);                            // 1075
      this.result.emitEvent('start', [null, this.fileData]);                                                        // 1075
      if (this.config.chunkSize === 'dynamic') {                                                                    // 1080
        this.config.chunkSize = this.config.file.size / 1000;                                                       // 1081
        if (this.config.chunkSize < 327680) {                                                                       // 1082
          this.config.chunkSize = 327680;                                                                           // 1083
        } else if (this.config.chunkSize > 1048576) {                                                               //
          this.config.chunkSize = 1048576;                                                                          // 1085
        }                                                                                                           //
      }                                                                                                             //
      this.config.chunkSize = Math.floor(this.config.chunkSize / 8) * 8;                                            // 1075
      _len = Math.ceil(this.config.file.size / this.config.chunkSize);                                              // 1075
      if (this.config.streams === 'dynamic') {                                                                      // 1089
        this.config.streams = _.clone(_len);                                                                        // 1090
        if (this.config.streams > 24) {                                                                             // 1091
          this.config.streams = 24;                                                                                 // 1091
        }                                                                                                           //
      }                                                                                                             //
      this.fileLength = _len <= 0 ? 1 : _len;                                                                       // 1075
      if (this.config.streams > this.fileLength) {                                                                  // 1094
        this.config.streams = this.fileLength;                                                                      // 1094
      }                                                                                                             //
      this.result.config.fileLength = this.fileLength;                                                              // 1075
      self.emitEvent('createStreams');                                                                              // 1075
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.pipe = function(func) {                                                                // 869
      this.pipes.push(func);                                                                                        // 1101
      return this;                                                                                                  // 1102
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.start = function() {                                                                   // 869
      var isUploadAllowed, self;                                                                                    // 1105
      self = this;                                                                                                  // 1105
      if (this.config.file.size <= 0) {                                                                             // 1106
        this.end(new Meteor.Error(400, 'Can\'t upload empty file'));                                                // 1107
        return this.result;                                                                                         // 1108
      }                                                                                                             //
      if (this.config.onBeforeUpload && _.isFunction(this.config.onBeforeUpload)) {                                 // 1110
        isUploadAllowed = this.config.onBeforeUpload.call(_.extend(this.result, this.collection.getUser()), this.fileData);
        if (isUploadAllowed !== true) {                                                                             // 1112
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'config.onBeforeUpload() returned false'));
        }                                                                                                           //
      }                                                                                                             //
      if (this.collection.onBeforeUpload && _.isFunction(this.collection.onBeforeUpload)) {                         // 1115
        isUploadAllowed = this.collection.onBeforeUpload.call(_.extend(this.result, this.collection.getUser()), this.fileData);
        if (isUploadAllowed !== true) {                                                                             // 1117
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'collection.onBeforeUpload() returned false'));
        }                                                                                                           //
      }                                                                                                             //
      Tracker.autorun(function(computation) {                                                                       // 1105
        self.trackerComp = computation;                                                                             // 1121
        if (!self.result.onPause.get()) {                                                                           // 1122
          if (Meteor.status().connected) {                                                                          // 1123
            self.result["continue"]();                                                                              // 1124
            if (self.collection.debug) {                                                                            // 1125
              console.info('[FilesCollection] [insert] [Tracker] [continue]');                                      // 1125
            }                                                                                                       //
          } else {                                                                                                  //
            self.result.pause();                                                                                    // 1127
            if (self.collection.debug) {                                                                            // 1128
              console.info('[FilesCollection] [insert] [Tracker] [pause]');                                         // 1128
            }                                                                                                       //
          }                                                                                                         //
        }                                                                                                           //
      });                                                                                                           //
      if (this.worker) {                                                                                            // 1131
        this.worker.onmessage = function(evt) {                                                                     // 1132
          if (evt.data.error) {                                                                                     // 1133
            if (self.collection.debug) {                                                                            // 1134
              console.warn(evt.data.error);                                                                         // 1134
            }                                                                                                       //
            self.emitEvent('proceedChunk', [evt.data.chunkId, evt.data.start]);                                     // 1134
          } else {                                                                                                  //
            self.emitEvent('sendViaDDP', [evt]);                                                                    // 1137
          }                                                                                                         //
        };                                                                                                          //
        this.worker.onerror = function(e) {                                                                         // 1132
          self.emitEvent('end', [e.message]);                                                                       // 1140
        };                                                                                                          //
      }                                                                                                             //
      if (this.collection.debug) {                                                                                  // 1143
        if (this.worker) {                                                                                          // 1144
          console.info("[FilesCollection] [insert] using WebWorkers");                                              // 1145
        } else {                                                                                                    //
          console.info("[FilesCollection] [insert] using MainThread");                                              // 1147
        }                                                                                                           //
      }                                                                                                             //
      self.emitEvent('prepare');                                                                                    // 1105
      return this.result;                                                                                           // 1150
    };                                                                                                              //
                                                                                                                    //
    UploadInstance.prototype.manual = function() {                                                                  // 869
      var self;                                                                                                     // 1153
      self = this;                                                                                                  // 1153
      this.result.start = function() {                                                                              // 1153
        self.emitEvent('start');                                                                                    // 1155
      };                                                                                                            //
      this.result.pipe = function(func) {                                                                           // 1153
        self.pipe(func);                                                                                            // 1158
        return this;                                                                                                // 1159
      };                                                                                                            //
      return this.result;                                                                                           // 1160
    };                                                                                                              //
                                                                                                                    //
    return UploadInstance;                                                                                          //
                                                                                                                    //
  })() : void 0;                                                                                                    //
                                                                                                                    //
                                                                                                                    // 1163
  /*                                                                                                                // 1163
  @locus Client                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name _FileUpload                                                                                                 //
  @class FileUpload                                                                                                 //
  @summary Internal Class, instance of this class is returned from `insert()` method                                //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype._FileUpload = Meteor.isClient ? FileUpload = (function() {                              // 94
    FileUpload.prototype.__proto__ = EventEmitter.prototype;                                                        // 1171
                                                                                                                    //
    function FileUpload(config1) {                                                                                  // 1172
      this.config = config1;                                                                                        // 1173
      EventEmitter.call(this);                                                                                      // 1173
      this.file = _.extend(this.config.file, this.config.fileData);                                                 // 1173
      this.state = new ReactiveVar('active');                                                                       // 1173
      this.onPause = new ReactiveVar(false);                                                                        // 1173
      this.progress = new ReactiveVar(0);                                                                           // 1173
      this.estimateTime = new ReactiveVar(1000);                                                                    // 1173
      this.estimateSpeed = new ReactiveVar(0);                                                                      // 1173
    }                                                                                                               //
                                                                                                                    //
    FileUpload.prototype.continueFunc = function() {};                                                              // 1171
                                                                                                                    //
    FileUpload.prototype.pause = function() {                                                                       // 1171
      if (!this.onPause.get()) {                                                                                    // 1182
        this.onPause.set(true);                                                                                     // 1183
        this.state.set('paused');                                                                                   // 1183
        this.emitEvent('pause', [this.file]);                                                                       // 1183
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    FileUpload.prototype["continue"] = function() {                                                                 // 1171
      if (this.onPause.get()) {                                                                                     // 1188
        this.onPause.set(false);                                                                                    // 1189
        this.state.set('active');                                                                                   // 1189
        this.emitEvent('continue', [this.file]);                                                                    // 1189
        this.continueFunc.call();                                                                                   // 1189
        this.continueFunc = function() {};                                                                          // 1189
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    FileUpload.prototype.toggle = function() {                                                                      // 1171
      if (this.onPause.get()) {                                                                                     // 1196
        this["continue"]();                                                                                         // 1196
      } else {                                                                                                      //
        this.pause();                                                                                               // 1196
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    FileUpload.prototype.abort = function() {                                                                       // 1171
      window.removeEventListener('beforeunload', this.config.beforeunload, false);                                  // 1199
      this.config.onAbort && this.config.onAbort.call(this, this.file);                                             // 1199
      this.emitEvent('abort', [this.file]);                                                                         // 1199
      this.pause();                                                                                                 // 1199
      this.config._onEnd();                                                                                         // 1199
      this.state.set('aborted');                                                                                    // 1199
      if (this.config.debug) {                                                                                      // 1205
        console.timeEnd('insert ' + this.config.file.name);                                                         // 1205
      }                                                                                                             //
      if (this.config.fileLength) {                                                                                 // 1206
        Meteor.call(this.config.MeteorFileAbort, {                                                                  // 1207
          fileId: this.config.fileId,                                                                               // 1207
          fileLength: this.config.fileLength,                                                                       // 1207
          fileData: this.config.fileData                                                                            // 1207
        });                                                                                                         //
      }                                                                                                             //
    };                                                                                                              //
                                                                                                                    //
    return FileUpload;                                                                                              //
                                                                                                                    //
  })() : void 0;                                                                                                    //
                                                                                                                    //
                                                                                                                    // 1211
  /*                                                                                                                // 1211
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
    var files, self;                                                                                                // 1221
    if (this.debug) {                                                                                               // 1221
      console.info("[FilesCollection] [remove(" + (JSON.stringify(search)) + ")]");                                 // 1221
    }                                                                                                               //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                     // 1221
    check(cb, Match.Optional(Function));                                                                            // 1221
    if (this.checkAccess()) {                                                                                       // 1225
      this.srch(search);                                                                                            // 1226
      if (Meteor.isClient) {                                                                                        // 1227
        Meteor.call(this.methodNames.MeteorFileUnlink, rcp(this), cb);                                              // 1228
      }                                                                                                             //
      if (Meteor.isServer) {                                                                                        // 1230
        files = this.collection.find(this.search);                                                                  // 1231
        if (files.count() > 0) {                                                                                    // 1232
          self = this;                                                                                              // 1233
          files.forEach(function(file) {                                                                            // 1233
            return self.unlink(file);                                                                               //
          });                                                                                                       //
        }                                                                                                           //
        this.collection.remove(this.search, cb);                                                                    // 1231
      }                                                                                                             //
    } else {                                                                                                        //
      cb && cb(new Meteor.Error(401, '[FilesCollection] [remove] Access denied!'));                                 // 1237
    }                                                                                                               //
    return this;                                                                                                    // 1238
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 1240
  /*                                                                                                                // 1240
  @locus Anywhere                                                                                                   //
  @memberOf FilesCollection                                                                                         //
  @name update                                                                                                      //
  @see http://docs.meteor.com/#/full/update                                                                         //
  @summary link Mongo.Collection update method                                                                      //
  @returns {Mongo.Collection} Instance                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.update = function() {                                                                   // 94
    this.collection.update.apply(this.collection, arguments);                                                       // 1249
    return this.collection;                                                                                         // 1250
  };                                                                                                                //
                                                                                                                    //
                                                                                                                    // 1252
  /*                                                                                                                // 1252
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
    this.collection.deny(rules);                                                                                    // 1263
    return this.collection;                                                                                         // 1264
  } : void 0;                                                                                                       //
                                                                                                                    //
  FilesCollection.prototype.allow = Meteor.isServer ? function(rules) {                                             // 94
    this.collection.allow(rules);                                                                                   // 1267
    return this.collection;                                                                                         // 1268
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1271
  /*                                                                                                                // 1271
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
    this.collection.deny({                                                                                          // 1281
      insert: function() {                                                                                          // 1282
        return true;                                                                                                //
      },                                                                                                            //
      update: function() {                                                                                          // 1282
        return true;                                                                                                //
      },                                                                                                            //
      remove: function() {                                                                                          // 1282
        return true;                                                                                                //
      }                                                                                                             //
    });                                                                                                             //
    return this.collection;                                                                                         // 1285
  } : void 0;                                                                                                       //
                                                                                                                    //
  FilesCollection.prototype.allowClient = Meteor.isServer ? function() {                                            // 94
    this.collection.allow({                                                                                         // 1288
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
                                                                                                                    // 1296
  /*                                                                                                                // 1296
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
    var ref, ref1;                                                                                                  // 1306
    if (this.debug) {                                                                                               // 1306
      console.info("[FilesCollection] [unlink(" + fileRef._id + ", " + version + ")]");                             // 1306
    }                                                                                                               //
    if (version) {                                                                                                  // 1307
      if (((ref = fileRef.versions) != null ? ref[version] : void 0) && ((ref1 = fileRef.versions[version]) != null ? ref1.path : void 0)) {
        fs.unlink(fileRef.versions[version].path, NOOP);                                                            // 1309
      }                                                                                                             //
    } else {                                                                                                        //
      if (fileRef.versions && !_.isEmpty(fileRef.versions)) {                                                       // 1311
        _.each(fileRef.versions, function(vRef) {                                                                   // 1312
          return bound(function() {                                                                                 //
            return fs.unlink(vRef.path, NOOP);                                                                      //
          });                                                                                                       //
        });                                                                                                         //
      }                                                                                                             //
      fs.unlink(fileRef.path, NOOP);                                                                                // 1311
    }                                                                                                               //
    return this;                                                                                                    // 1315
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1318
  /*                                                                                                                // 1318
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name _404                                                                                                        //
  @summary Internal method, used to return 404 error                                                                //
  @returns {undefined}                                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype._404 = Meteor.isServer ? function(http) {                                               // 94
    var text;                                                                                                       // 1326
    if (this.debug) {                                                                                               // 1326
      console.warn("[FilesCollection] [download(" + http.request.originalUrl + ")] [_404] File not found");         // 1326
    }                                                                                                               //
    text = 'File Not Found :(';                                                                                     // 1326
    http.response.writeHead(404, {                                                                                  // 1326
      'Content-Length': text.length,                                                                                // 1329
      'Content-Type': 'text/plain'                                                                                  // 1329
    });                                                                                                             //
    http.response.end(text);                                                                                        // 1326
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1335
  /*                                                                                                                // 1335
  @locus Server                                                                                                     //
  @memberOf FilesCollection                                                                                         //
  @name download                                                                                                    //
  @param {Object|Files} self - Instance of FilesCollection                                                          //
  @summary Initiates the HTTP response                                                                              //
  @returns {undefined}                                                                                              //
   */                                                                                                               //
                                                                                                                    //
  FilesCollection.prototype.download = Meteor.isServer ? function(http, version) {                                  // 94
    var fileRef, responseType, self;                                                                                // 1344
    if (version == null) {                                                                                          //
      version = 'original';                                                                                         //
    }                                                                                                               //
    if (this.debug) {                                                                                               // 1344
      console.info("[FilesCollection] [download(" + http.request.originalUrl + ", " + version + ")]");              // 1344
    }                                                                                                               //
    responseType = '200';                                                                                           // 1344
    if (this.currentFile) {                                                                                         // 1346
      if (_.has(this.currentFile, 'versions') && _.has(this.currentFile.versions, version)) {                       // 1347
        fileRef = this.currentFile.versions[version];                                                               // 1348
      } else {                                                                                                      //
        fileRef = this.currentFile;                                                                                 // 1350
      }                                                                                                             //
    } else {                                                                                                        //
      fileRef = false;                                                                                              // 1352
    }                                                                                                               //
    if (!fileRef || !_.isObject(fileRef)) {                                                                         // 1354
      return this._404(http);                                                                                       // 1355
    } else if (this.currentFile) {                                                                                  //
      self = this;                                                                                                  // 1357
      if (this.downloadCallback) {                                                                                  // 1359
        if (!this.downloadCallback.call(_.extend(http, this.getUser(http)), this.currentFile)) {                    // 1360
          return this._404(http);                                                                                   // 1361
        }                                                                                                           //
      }                                                                                                             //
      if (this.interceptDownload && _.isFunction(this.interceptDownload)) {                                         // 1363
        if (this.interceptDownload(http, this.currentFile, version) === true) {                                     // 1364
          return;                                                                                                   // 1365
        }                                                                                                           //
      }                                                                                                             //
      fs.stat(fileRef.path, function(statErr, stats) {                                                              // 1357
        return bound(function() {                                                                                   //
          var array, dispositionEncoding, dispositionName, dispositionType, end, partiral, ref, ref1, ref2, ref3, reqRange, start, stream, streamErrorHandler, take, text;
          if (statErr || !stats.isFile()) {                                                                         // 1368
            return self._404(http);                                                                                 // 1369
          }                                                                                                         //
          if (stats.size !== fileRef.size && !self.integrityCheck) {                                                // 1371
            fileRef.size = stats.size;                                                                              // 1371
          }                                                                                                         //
          if (stats.size !== fileRef.size && self.integrityCheck) {                                                 // 1372
            responseType = '400';                                                                                   // 1372
          }                                                                                                         //
          partiral = false;                                                                                         // 1368
          reqRange = false;                                                                                         // 1368
          if (http.params.query.download && http.params.query.download === 'true') {                                // 1376
            dispositionType = 'attachment; ';                                                                       // 1377
          } else {                                                                                                  //
            dispositionType = 'inline; ';                                                                           // 1379
          }                                                                                                         //
          dispositionName = "filename=\"" + (encodeURIComponent(self.currentFile.name)) + "\"; filename=*UTF-8\"" + (encodeURIComponent(self.currentFile.name)) + "\"; ";
          dispositionEncoding = 'charset=utf-8';                                                                    // 1368
          http.response.setHeader('Content-Type', fileRef.type);                                                    // 1368
          http.response.setHeader('Content-Disposition', dispositionType + dispositionName + dispositionEncoding);  // 1368
          http.response.setHeader('Accept-Ranges', 'bytes');                                                        // 1368
          if ((ref = self.currentFile) != null ? (ref1 = ref.updatedAt) != null ? ref1.toUTCString() : void 0 : void 0) {
            http.response.setHeader('Last-Modified', (ref2 = self.currentFile) != null ? (ref3 = ref2.updatedAt) != null ? ref3.toUTCString() : void 0 : void 0);
          }                                                                                                         //
          http.response.setHeader('Connection', 'keep-alive');                                                      // 1368
          if (http.request.headers.range) {                                                                         // 1390
            partiral = true;                                                                                        // 1391
            array = http.request.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);                                    // 1391
            start = parseInt(array[1]);                                                                             // 1391
            end = parseInt(array[2]);                                                                               // 1391
            if (isNaN(end)) {                                                                                       // 1395
              end = fileRef.size - 1;                                                                               // 1396
            }                                                                                                       //
            take = end - start;                                                                                     // 1391
          } else {                                                                                                  //
            start = 0;                                                                                              // 1399
            end = fileRef.size - 1;                                                                                 // 1399
            take = fileRef.size;                                                                                    // 1399
          }                                                                                                         //
          if (partiral || (http.params.query.play && http.params.query.play === 'true')) {                          // 1403
            reqRange = {                                                                                            // 1404
              start: start,                                                                                         // 1404
              end: end                                                                                              // 1404
            };                                                                                                      //
            if (isNaN(start) && !isNaN(end)) {                                                                      // 1405
              reqRange.start = end - take;                                                                          // 1406
              reqRange.end = end;                                                                                   // 1406
            }                                                                                                       //
            if (!isNaN(start) && isNaN(end)) {                                                                      // 1408
              reqRange.start = start;                                                                               // 1409
              reqRange.end = start + take;                                                                          // 1409
            }                                                                                                       //
            if ((start + take) >= fileRef.size) {                                                                   // 1412
              reqRange.end = fileRef.size - 1;                                                                      // 1412
            }                                                                                                       //
            http.response.setHeader('Pragma', 'private');                                                           // 1404
            http.response.setHeader('Expires', new Date(+(new Date) + 1000 * 32400).toUTCString());                 // 1404
            http.response.setHeader('Cache-Control', 'private, maxage=10800, s-maxage=32400');                      // 1404
            if (self.strict && (reqRange.start >= (fileRef.size - 1) || reqRange.end > (fileRef.size - 1))) {       // 1417
              responseType = '416';                                                                                 // 1418
            } else {                                                                                                //
              responseType = '206';                                                                                 // 1420
            }                                                                                                       //
          } else {                                                                                                  //
            http.response.setHeader('Cache-Control', self.cacheControl);                                            // 1422
            responseType = '200';                                                                                   // 1422
          }                                                                                                         //
          streamErrorHandler = function(error) {                                                                    // 1368
            http.response.writeHead(500);                                                                           // 1426
            return http.response.end(error.toString());                                                             //
          };                                                                                                        //
          switch (responseType) {                                                                                   // 1429
            case '400':                                                                                             // 1429
              if (self.debug) {                                                                                     // 1431
                console.warn("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [400] Content-Length mismatch!");
              }                                                                                                     //
              text = 'Content-Length mismatch!';                                                                    // 1431
              http.response.writeHead(400, {                                                                        // 1431
                'Content-Type': 'text/plain',                                                                       // 1434
                'Cache-Control': 'no-cache',                                                                        // 1434
                'Content-Length': text.length                                                                       // 1434
              });                                                                                                   //
              http.response.end(text);                                                                              // 1431
              break;                                                                                                // 1438
            case '404':                                                                                             // 1429
              return self._404(http);                                                                               // 1440
              break;                                                                                                // 1441
            case '416':                                                                                             // 1429
              if (self.debug) {                                                                                     // 1443
                console.info("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [416] Content-Range is not specified!");
              }                                                                                                     //
              http.response.writeHead(416, {                                                                        // 1443
                'Content-Range': "bytes */" + fileRef.size                                                          // 1445
              });                                                                                                   //
              http.response.end();                                                                                  // 1443
              break;                                                                                                // 1447
            case '200':                                                                                             // 1429
              if (self.debug) {                                                                                     // 1449
                console.info("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [200]");          // 1449
              }                                                                                                     //
              stream = fs.createReadStream(fileRef.path);                                                           // 1449
              stream.on('open', (function(_this) {                                                                  // 1449
                return function() {                                                                                 //
                  http.response.writeHead(200);                                                                     // 1452
                  if (self.throttle) {                                                                              // 1453
                    return stream.pipe(new Throttle({                                                               //
                      bps: self.throttle,                                                                           // 1454
                      chunksize: self.chunkSize                                                                     // 1454
                    })).pipe(http.response);                                                                        //
                  } else {                                                                                          //
                    return stream.pipe(http.response);                                                              //
                  }                                                                                                 //
                };                                                                                                  //
              })(this)).on('error', streamErrorHandler);                                                            //
              break;                                                                                                // 1459
            case '206':                                                                                             // 1429
              if (self.debug) {                                                                                     // 1461
                console.info("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [206]");          // 1461
              }                                                                                                     //
              http.response.setHeader('Content-Range', "bytes " + reqRange.start + "-" + reqRange.end + "/" + fileRef.size);
              http.response.setHeader('Trailer', 'expires');                                                        // 1461
              http.response.setHeader('Transfer-Encoding', 'chunked');                                              // 1461
              if (self.throttle) {                                                                                  // 1465
                stream = fs.createReadStream(fileRef.path, {                                                        // 1466
                  start: reqRange.start,                                                                            // 1466
                  end: reqRange.end                                                                                 // 1466
                });                                                                                                 //
                stream.on('open', function() {                                                                      // 1466
                  return http.response.writeHead(206);                                                              //
                }).on('error', streamErrorHandler).on('end', function() {                                           //
                  return http.response.end();                                                                       //
                }).pipe(new Throttle({                                                                              //
                  bps: self.throttle,                                                                               // 1470
                  chunksize: self.chunkSize                                                                         // 1470
                })).pipe(http.response);                                                                            //
              } else {                                                                                              //
                stream = fs.createReadStream(fileRef.path, {                                                        // 1473
                  start: reqRange.start,                                                                            // 1473
                  end: reqRange.end                                                                                 // 1473
                });                                                                                                 //
                stream.on('open', function() {                                                                      // 1473
                  return http.response.writeHead(206);                                                              //
                }).on('error', streamErrorHandler).on('end', function() {                                           //
                  return http.response.end();                                                                       //
                }).pipe(http.response);                                                                             //
              }                                                                                                     //
              break;                                                                                                // 1478
          }                                                                                                         // 1429
        });                                                                                                         //
      });                                                                                                           //
    } else {                                                                                                        //
      return this._404(http);                                                                                       // 1481
    }                                                                                                               //
  } : void 0;                                                                                                       //
                                                                                                                    //
                                                                                                                    // 1484
  /*                                                                                                                // 1484
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
    if (this.debug) {                                                                                               // 1494
      console.info('[FilesCollection] [link()]');                                                                   // 1494
    }                                                                                                               //
    if (_.isString(fileRef)) {                                                                                      // 1495
      version = fileRef;                                                                                            // 1496
      fileRef = null;                                                                                               // 1496
    }                                                                                                               //
    if (!fileRef && !this.currentFile) {                                                                            // 1498
      return '';                                                                                                    // 1498
    }                                                                                                               //
    return formatFleURL(fileRef || this.currentFile, version);                                                      // 1499
  };                                                                                                                //
                                                                                                                    //
  return FilesCollection;                                                                                           //
                                                                                                                    //
})();                                                                                                               //
                                                                                                                    //
                                                                                                                    // 1501
/*                                                                                                                  // 1501
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
  var ext, ref, root;                                                                                               // 1512
  if (version == null) {                                                                                            //
    version = 'original';                                                                                           //
  }                                                                                                                 //
  root = __meteor_runtime_config__.ROOT_URL.replace(/\/+$/, '');                                                    // 1512
  if ((fileRef != null ? (ref = fileRef.extension) != null ? ref.length : void 0 : void 0) > 0) {                   // 1514
    ext = '.' + fileRef.extension;                                                                                  // 1515
  } else {                                                                                                          //
    ext = '';                                                                                                       // 1517
  }                                                                                                                 //
  if (fileRef["public"] === true) {                                                                                 // 1519
    return root + (version === 'original' ? fileRef._downloadRoute + "/" + fileRef._id + ext : fileRef._downloadRoute + "/" + version + "-" + fileRef._id + ext);
  } else {                                                                                                          //
    return root + (fileRef._downloadRoute + "/" + fileRef._collectionName + "/" + fileRef._id + "/" + version + "/" + fileRef._id + ext);
  }                                                                                                                 //
};                                                                                                                  // 1511
                                                                                                                    //
if (Meteor.isClient) {                                                                                              // 1524
                                                                                                                    // 1525
  /*                                                                                                                // 1525
  @locus Client                                                                                                     //
  @TemplateHelper                                                                                                   //
  @name fileURL                                                                                                     //
  @param {Object} fileRef - File reference object                                                                   //
  @param {String} version - [Optional] Version of file you would like to request                                    //
  @summary Get download URL for file by fileRef, even without subscription                                          //
  @example {{fileURL fileRef}}                                                                                      //
  @returns {String}                                                                                                 //
   */                                                                                                               //
  Template.registerHelper('fileURL', function(fileRef, version) {                                                   // 1525
    if (!fileRef || !_.isObject(fileRef)) {                                                                         // 1536
      return void 0;                                                                                                // 1536
    }                                                                                                               //
    version = !version || !_.isString(version) ? 'original' : version;                                              // 1536
    if (fileRef._id) {                                                                                              // 1538
      return formatFleURL(fileRef, version);                                                                        // 1539
    } else {                                                                                                        //
      return '';                                                                                                    // 1541
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
