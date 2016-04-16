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
var Collection2 = Package['aldeed:collection2-core'].Collection2;
var SimpleSchema = Package['aldeed:simple-schema'].SimpleSchema;
var MongoObject = Package['aldeed:simple-schema'].MongoObject;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;

/* Package-scope variables */
var __coffeescriptShare;

(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/files.coffee.js                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var NOOP, Throttle, _insts, bound, cp, formatFleURL, fs, rcp, request, util;                                           // 1
                                                                                                                       //
if (Meteor.isServer) {                                                                                                 // 1
                                                                                                                       // 2
  /*                                                                                                                   // 2
  @description Require "fs-extra" npm package                                                                          //
   */                                                                                                                  //
  fs = Npm.require('fs-extra');                                                                                        // 2
  request = Npm.require('request');                                                                                    // 2
  Throttle = Npm.require('throttle');                                                                                  // 2
  util = Npm.require('util');                                                                                          // 2
  NOOP = function() {};                                                                                                // 2
                                                                                                                       // 11
  /*                                                                                                                   // 11
  @var {object} bound - Meteor.bindEnvironment aka Fiber wrapper                                                       //
   */                                                                                                                  //
  bound = Meteor.bindEnvironment(function(callback) {                                                                  // 2
    return callback();                                                                                                 // 14
  });                                                                                                                  //
}                                                                                                                      //
                                                                                                                       //
                                                                                                                       // 16
/*                                                                                                                     // 16
@private                                                                                                               //
@object                                                                                                                //
@name _insts                                                                                                           //
@description Object of Meteor.Files instances                                                                          //
 */                                                                                                                    //
                                                                                                                       //
_insts = {};                                                                                                           // 1
                                                                                                                       //
                                                                                                                       // 24
/*                                                                                                                     // 24
@private                                                                                                               //
@function                                                                                                              //
@name rcp                                                                                                              //
@param {Object} obj - Initial object                                                                                   //
@description Create object with only needed props                                                                      //
 */                                                                                                                    //
                                                                                                                       //
rcp = function(obj) {                                                                                                  // 1
  var o;                                                                                                               // 32
  o = {                                                                                                                // 32
    currentFile: obj.currentFile,                                                                                      // 33
    search: obj.search,                                                                                                // 33
    storagePath: obj.storagePath,                                                                                      // 33
    collectionName: obj.collectionName,                                                                                // 33
    downloadRoute: obj.downloadRoute,                                                                                  // 33
    chunkSize: obj.chunkSize,                                                                                          // 33
    debug: obj.debug,                                                                                                  // 33
    _prefix: obj._prefix,                                                                                              // 33
    cacheControl: obj.cacheControl,                                                                                    // 33
    versions: obj.versions                                                                                             // 33
  };                                                                                                                   //
  return o;                                                                                                            // 43
};                                                                                                                     // 31
                                                                                                                       //
                                                                                                                       // 45
/*                                                                                                                     // 45
@private                                                                                                               //
@function                                                                                                              //
@name cp                                                                                                               //
@param {Object} to   - Destanation                                                                                     //
@param {Object} from - Source                                                                                          //
@description Copy-Paste only needed props from one to another object                                                   //
 */                                                                                                                    //
                                                                                                                       //
cp = function(to, from) {                                                                                              // 1
  to.currentFile = from.currentFile;                                                                                   // 54
  to.search = from.search;                                                                                             // 54
  to.storagePath = from.storagePath;                                                                                   // 54
  to.collectionName = from.collectionName;                                                                             // 54
  to.downloadRoute = from.downloadRoute;                                                                               // 54
  to.chunkSize = from.chunkSize;                                                                                       // 54
  to.debug = from.debug;                                                                                               // 54
  to._prefix = from._prefix;                                                                                           // 54
  to.cacheControl = from.cacheControl;                                                                                 // 54
  to.versions = from.versions;                                                                                         // 54
  return to;                                                                                                           // 64
};                                                                                                                     // 53
                                                                                                                       //
                                                                                                                       // 66
/*                                                                                                                     // 66
@isomorphic                                                                                                            //
@class                                                                                                                 //
@namespace Meteor                                                                                                      //
@name Files                                                                                                            //
@param config           {Object}   - [Both]   Configuration object with next properties:                               //
@param config.debug     {Boolean}  - [Both]   Turn on/of debugging and extra logging                                   //
@param config.schema    {Object}   - [Both]   Collection Schema                                                        //
@param config.public    {Boolean}  - [Both]   Store files in folder accessible for proxy servers, for limits, and more - read docs
@param config.strict    {Boolean}  - [Server] Strict mode for partial content, if is `true` server will return `416` response code, when `range` is not specified, otherwise server return `206`
@param config.protected {Function} - [Both]   If `true` - files will be served only to authorized users, if `function()` - you're able to check visitor's permissions in your own way function's context has:
  - `request` - On server only                                                                                         //
  - `response` - On server only                                                                                        //
  - `user()`                                                                                                           //
  - `userId`                                                                                                           //
@param config.chunkSize      {Number}  - [Both] Upload chunk size, default: 524288 bytes (0,5 Mb)                      //
@param config.permissions    {Number}  - [Server] Permissions which will be set to uploaded files, like: `511` or `0o755`
@param config.storagePath    {String}  - [Server] Storage path on file system                                          //
@param config.cacheControl   {String}  - [Server] Default `Cache-Control` header                                       //
@param config.throttle       {Number}  - [Server] bps throttle threshold                                               //
@param config.downloadRoute  {String}  - [Both]   Server Route used to retrieve files                                  //
@param config.collectionName {String}  - [Both]   Collection name                                                      //
@param config.namingFunction {Function}- [Both]   Function which returns `String`                                      //
@param config.integrityCheck {Boolean} - [Server] Check file's integrity before serving to users                       //
@param config.onAfterUpload  {Function}- [Server] Called right after file is ready on FS. Use to transfer file somewhere else, or do other thing with file directly
@param config.onBeforeUpload {Function}- [Both]   Function which executes on server after receiving each chunk and on client right before beginning upload. Function context is `File` - so you are able to check for extension, mime-type, size and etc.
return `true` to continue                                                                                              //
return `false` or `String` to abort upload                                                                             //
@param config.allowClientCode  {Boolean}  - [Both]   Allow to run `remove` from client                                 //
@param config.downloadCallback {Function} - [Server] Callback triggered each time file is requested, return truthy value to continue download, or falsy to abort
@param config.interceptDownload {Function} - [Server] Intercept download request, so you can serve file from third-party resource, arguments {http: {request: {...}, response: {...}}, fileRef: {...}}
@param config.onbeforeunloadMessage {String|Function} - [Client] Message shown to user when closing browser's window or tab while upload process is running
@description Create new instance of Meteor.Files                                                                       //
 */                                                                                                                    //
                                                                                                                       //
Meteor.Files = (function() {                                                                                           // 1
  function Files(config) {                                                                                             // 101
    var _methods, cookie, self;                                                                                        // 102
    if (config) {                                                                                                      // 102
      this.storagePath = config.storagePath, this.collectionName = config.collectionName, this.downloadRoute = config.downloadRoute, this.schema = config.schema, this.chunkSize = config.chunkSize, this.namingFunction = config.namingFunction, this.debug = config.debug, this.onbeforeunloadMessage = config.onbeforeunloadMessage, this.permissions = config.permissions, this.allowClientCode = config.allowClientCode, this.onBeforeUpload = config.onBeforeUpload, this.integrityCheck = config.integrityCheck, this["protected"] = config["protected"], this["public"] = config["public"], this.strict = config.strict, this.downloadCallback = config.downloadCallback, this.cacheControl = config.cacheControl, this.throttle = config.throttle, this.onAfterUpload = config.onAfterUpload, this.interceptDownload = config.interceptDownload;
    }                                                                                                                  //
    self = this;                                                                                                       // 102
    cookie = new Cookies();                                                                                            // 102
    if (this.debug == null) {                                                                                          //
      this.debug = false;                                                                                              //
    }                                                                                                                  //
    if (this["public"] == null) {                                                                                      //
      this["public"] = false;                                                                                          //
    }                                                                                                                  //
    if (this["protected"] == null) {                                                                                   //
      this["protected"] = false;                                                                                       //
    }                                                                                                                  //
    if (this.chunkSize == null) {                                                                                      //
      this.chunkSize = 1024 * 512;                                                                                     //
    }                                                                                                                  //
    this.chunkSize = Math.floor(this.chunkSize / 8) * 8;                                                               // 102
    if (this.downloadRoute == null) {                                                                                  //
      this.downloadRoute = this["public"] ? "/uploads/" + this.collectionName : '/cdn/storage';                        //
    }                                                                                                                  //
    this.downloadRoute = this.downloadRoute.replace(/\/$/, '');                                                        // 102
    if (this.collectionName == null) {                                                                                 //
      this.collectionName = 'MeteorUploadFiles';                                                                       //
    }                                                                                                                  //
    if (this.namingFunction == null) {                                                                                 //
      this.namingFunction = function() {                                                                               //
        return Random.id();                                                                                            //
      };                                                                                                               //
    }                                                                                                                  //
    if (this.onBeforeUpload == null) {                                                                                 //
      this.onBeforeUpload = false;                                                                                     //
    }                                                                                                                  //
    if (this.allowClientCode == null) {                                                                                //
      this.allowClientCode = true;                                                                                     //
    }                                                                                                                  //
    if (this.interceptDownload == null) {                                                                              //
      this.interceptDownload = false;                                                                                  //
    }                                                                                                                  //
    if (Meteor.isClient) {                                                                                             // 119
      if (this.onbeforeunloadMessage == null) {                                                                        //
        this.onbeforeunloadMessage = 'Upload in a progress... Do you want to abort?';                                  //
      }                                                                                                                //
      if (Worker) {                                                                                                    // 121
        this.ReaderWorker = new Worker('/packages/ostrio_files/worker.js');                                            // 122
      }                                                                                                                //
      delete this.strict;                                                                                              // 120
      delete this.throttle;                                                                                            // 120
      delete this.storagePath;                                                                                         // 120
      delete this.permissions;                                                                                         // 120
      delete this.cacheControl;                                                                                        // 120
      delete this.onAfterUpload;                                                                                       // 120
      delete this.integrityCheck;                                                                                      // 120
      delete this.downloadCallback;                                                                                    // 120
      delete this.interceptDownload;                                                                                   // 120
      if (this["protected"]) {                                                                                         // 132
        if (!cookie.has('meteor_login_token') && Meteor._localStorage.getItem('Meteor.loginToken')) {                  // 133
          cookie.set('meteor_login_token', Meteor._localStorage.getItem('Meteor.loginToken'), null, '/');              // 134
        }                                                                                                              //
      }                                                                                                                //
      check(this.onbeforeunloadMessage, Match.OneOf(String, Function));                                                // 120
    } else {                                                                                                           //
      if (this.strict == null) {                                                                                       //
        this.strict = true;                                                                                            //
      }                                                                                                                //
      if (this.throttle == null) {                                                                                     //
        this.throttle = false;                                                                                         //
      }                                                                                                                //
      if (this.permissions == null) {                                                                                  //
        this.permissions = 0x1ed;                                                                                      //
      }                                                                                                                //
      if (this.cacheControl == null) {                                                                                 //
        this.cacheControl = 'public, max-age=31536000, s-maxage=31536000';                                             //
      }                                                                                                                //
      if (this.onAfterUpload == null) {                                                                                //
        this.onAfterUpload = false;                                                                                    //
      }                                                                                                                //
      if (this.integrityCheck == null) {                                                                               //
        this.integrityCheck = true;                                                                                    //
      }                                                                                                                //
      if (this.downloadCallback == null) {                                                                             //
        this.downloadCallback = false;                                                                                 //
      }                                                                                                                //
      if (this.storagePath == null) {                                                                                  //
        this.storagePath = this["public"] ? "../web.browser/app/uploads/" + this.collectionName : "assets/app/uploads/" + this.collectionName;
      }                                                                                                                //
      this.storagePath = this.storagePath.replace(/\/$/, '');                                                          // 138
      check(this.strict, Boolean);                                                                                     // 138
      check(this.throttle, Match.OneOf(false, Number));                                                                // 138
      check(this.permissions, Number);                                                                                 // 138
      check(this.storagePath, String);                                                                                 // 138
      check(this.cacheControl, String);                                                                                // 138
      check(this.onAfterUpload, Match.OneOf(false, Function));                                                         // 138
      check(this.integrityCheck, Boolean);                                                                             // 138
      check(this.downloadCallback, Match.OneOf(false, Function));                                                      // 138
      check(this.interceptDownload, Match.OneOf(false, Function));                                                     // 138
    }                                                                                                                  //
    if (!this.schema) {                                                                                                // 158
      this.schema = {                                                                                                  // 159
        size: {                                                                                                        // 160
          type: Number                                                                                                 // 160
        },                                                                                                             //
        name: {                                                                                                        // 160
          type: String                                                                                                 // 161
        },                                                                                                             //
        type: {                                                                                                        // 160
          type: String                                                                                                 // 162
        },                                                                                                             //
        path: {                                                                                                        // 160
          type: String                                                                                                 // 163
        },                                                                                                             //
        isVideo: {                                                                                                     // 160
          type: Boolean                                                                                                // 164
        },                                                                                                             //
        isAudio: {                                                                                                     // 160
          type: Boolean                                                                                                // 165
        },                                                                                                             //
        isImage: {                                                                                                     // 160
          type: Boolean                                                                                                // 166
        },                                                                                                             //
        _prefix: {                                                                                                     // 160
          type: String                                                                                                 // 167
        },                                                                                                             //
        extension: {                                                                                                   // 160
          type: String,                                                                                                // 169
          optional: true                                                                                               // 169
        },                                                                                                             //
        _storagePath: {                                                                                                // 160
          type: String                                                                                                 // 171
        },                                                                                                             //
        _downloadRoute: {                                                                                              // 160
          type: String                                                                                                 // 172
        },                                                                                                             //
        _collectionName: {                                                                                             // 160
          type: String                                                                                                 // 173
        },                                                                                                             //
        meta: {                                                                                                        // 160
          type: Object,                                                                                                // 175
          blackbox: true,                                                                                              // 175
          optional: true                                                                                               // 175
        },                                                                                                             //
        userId: {                                                                                                      // 160
          type: String,                                                                                                // 179
          optional: true                                                                                               // 179
        },                                                                                                             //
        updatedAt: {                                                                                                   // 160
          type: Date,                                                                                                  // 182
          autoValue: function() {                                                                                      // 182
            return new Date();                                                                                         //
          }                                                                                                            //
        },                                                                                                             //
        versions: {                                                                                                    // 160
          type: Object,                                                                                                // 185
          blackbox: true                                                                                               // 185
        }                                                                                                              //
      };                                                                                                               //
    }                                                                                                                  //
    check(this.debug, Boolean);                                                                                        // 102
    check(this.schema, Object);                                                                                        // 102
    check(this["public"], Boolean);                                                                                    // 102
    check(this["protected"], Match.OneOf(Boolean, Function));                                                          // 102
    check(this.chunkSize, Number);                                                                                     // 102
    check(this.downloadRoute, String);                                                                                 // 102
    check(this.collectionName, String);                                                                                // 102
    check(this.namingFunction, Function);                                                                              // 102
    check(this.onBeforeUpload, Match.OneOf(false, Function));                                                          // 102
    check(this.allowClientCode, Boolean);                                                                              // 102
    if (this["public"] && this["protected"]) {                                                                         // 199
      throw new Meteor.Error(500, "[Meteor.Files." + this.collectionName + "]: Files can not be public and protected at the same time!");
    }                                                                                                                  //
    this.cursor = null;                                                                                                // 102
    this.search = {};                                                                                                  // 102
    this.collection = new Mongo.Collection(this.collectionName);                                                       // 102
    this.currentFile = null;                                                                                           // 102
    this.collection.attachSchema(this.schema);                                                                         // 102
    this.collection.deny({                                                                                             // 102
      insert: function() {                                                                                             // 209
        return true;                                                                                                   //
      },                                                                                                               //
      update: function() {                                                                                             // 209
        return true;                                                                                                   //
      },                                                                                                               //
      remove: function() {                                                                                             // 209
        return true;                                                                                                   //
      }                                                                                                                //
    });                                                                                                                //
    this._prefix = SHA256(this.collectionName + this.downloadRoute);                                                   // 102
    _insts[this._prefix] = this;                                                                                       // 102
    this.checkAccess = function(http) {                                                                                // 102
      var rc, result, text, user, userFuncs, userId;                                                                   // 217
      if (self["protected"]) {                                                                                         // 217
        user = false;                                                                                                  // 218
        userFuncs = self.getUser(http);                                                                                // 218
        user = userFuncs.user, userId = userFuncs.userId;                                                              // 218
        user = user();                                                                                                 // 218
        if (_.isFunction(self["protected"])) {                                                                         // 223
          result = http ? self["protected"].call(_.extend(http, userFuncs), self.currentFile || null) : self["protected"].call(userFuncs, self.currentFile || null);
        } else {                                                                                                       //
          result = !!user;                                                                                             // 226
        }                                                                                                              //
        if ((http && result === true) || !http) {                                                                      // 228
          return true;                                                                                                 // 229
        } else {                                                                                                       //
          rc = _.isNumber(result) ? result : 401;                                                                      // 231
          if (self.debug) {                                                                                            // 232
            console.warn('[Meteor.Files.checkAccess] WARN: Access denied!');                                           // 232
          }                                                                                                            //
          if (http) {                                                                                                  // 233
            text = 'Access denied!';                                                                                   // 234
            http.response.writeHead(rc, {                                                                              // 234
              'Content-Length': text.length,                                                                           // 236
              'Content-Type': 'text/plain'                                                                             // 236
            });                                                                                                        //
            http.response.end(text);                                                                                   // 234
          }                                                                                                            //
          return false;                                                                                                // 239
        }                                                                                                              //
      } else {                                                                                                         //
        return true;                                                                                                   // 241
      }                                                                                                                //
    };                                                                                                                 //
    this.methodNames = {                                                                                               // 102
      MeteorFileAbort: "MeteorFileAbort" + this._prefix,                                                               // 244
      MeteorFileWrite: "MeteorFileWrite" + this._prefix,                                                               // 244
      MeteorFileUnlink: "MeteorFileUnlink" + this._prefix                                                              // 244
    };                                                                                                                 //
    if (Meteor.isServer) {                                                                                             // 248
      WebApp.connectHandlers.use(function(request, response, next) {                                                   // 249
        var http, params, uri, uris, version;                                                                          // 250
        if (!self["public"]) {                                                                                         // 250
          if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName)) {                    // 251
            uri = request._parsedUrl.path.replace(self.downloadRoute + "/" + self.collectionName, '');                 // 252
            if (uri.indexOf('/') === 0) {                                                                              // 253
              uri = uri.substring(1);                                                                                  // 254
            }                                                                                                          //
            uris = uri.split('/');                                                                                     // 252
            if (uris.length === 3) {                                                                                   // 257
              params = {                                                                                               // 258
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                _id: uris[0],                                                                                          // 259
                version: uris[1],                                                                                      // 259
                name: uris[2]                                                                                          // 259
              };                                                                                                       //
              http = {                                                                                                 // 258
                request: request,                                                                                      // 263
                response: response,                                                                                    // 263
                params: params                                                                                         // 263
              };                                                                                                       //
              if (self.checkAccess(http)) {                                                                            // 264
                return self.findOne(uris[0]).download.call(self, http, uris[1]);                                       //
              }                                                                                                        //
            } else {                                                                                                   //
              return next();                                                                                           //
            }                                                                                                          //
          } else {                                                                                                     //
            return next();                                                                                             //
          }                                                                                                            //
        } else {                                                                                                       //
          if (!!~request._parsedUrl.path.indexOf("" + self.downloadRoute)) {                                           // 270
            uri = request._parsedUrl.path.replace("" + self.downloadRoute, '');                                        // 271
            if (uri.indexOf('/') === 0) {                                                                              // 272
              uri = uri.substring(1);                                                                                  // 273
            }                                                                                                          //
            uris = uri.split('/');                                                                                     // 271
            if (uris.length === 1) {                                                                                   // 276
              params = {                                                                                               // 277
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                file: uris[0]                                                                                          // 278
              };                                                                                                       //
              http = {                                                                                                 // 277
                request: request,                                                                                      // 280
                response: response,                                                                                    // 280
                params: params                                                                                         // 280
              };                                                                                                       //
              if (!!~params.file.indexOf('-')) {                                                                       // 282
                version = params.file.split('-')[0];                                                                   // 283
                return self.download.call(self, http, version);                                                        //
              } else {                                                                                                 //
                return self._404(http);                                                                                //
              }                                                                                                        //
            } else {                                                                                                   //
              return next();                                                                                           //
            }                                                                                                          //
          } else {                                                                                                     //
            return next();                                                                                             //
          }                                                                                                            //
        }                                                                                                              //
      });                                                                                                              //
      _methods = {};                                                                                                   // 249
      _methods[self.methodNames.MeteorFileUnlink] = function(inst) {                                                   // 249
        check(inst, Object);                                                                                           // 294
        if (self.debug) {                                                                                              // 295
          console.info('[Meteor.Files] [Unlink Method]');                                                              // 295
        }                                                                                                              //
        if (self.allowClientCode) {                                                                                    // 296
          return self.remove.call(cp(_insts[inst._prefix], inst), inst.search);                                        //
        } else {                                                                                                       //
          throw new Meteor.Error(401, '[Meteor.Files] [remove] Run code from client is not allowed!');                 // 299
        }                                                                                                              //
      };                                                                                                               //
      _methods[self.methodNames.MeteorFileWrite] = function(opts) {                                                    // 249
        var action, e, extension, extensionWithDot, fileName, isUploadAllowed, path, pathName, pathPart, ref, result;  // 302
        this.unblock();                                                                                                // 302
        check(opts, {                                                                                                  // 302
          eof: Match.Optional(Boolean),                                                                                // 303
          meta: Match.Optional(Object),                                                                                // 303
          file: Object,                                                                                                // 303
          fileId: String,                                                                                              // 303
          binData: Match.Optional(String),                                                                             // 303
          chunkId: Match.Optional(Number),                                                                             // 303
          fileLength: Number                                                                                           // 303
        });                                                                                                            //
        if (opts.eof == null) {                                                                                        //
          opts.eof = false;                                                                                            //
        }                                                                                                              //
        if (opts.meta == null) {                                                                                       //
          opts.meta = {};                                                                                              //
        }                                                                                                              //
        if (opts.binData == null) {                                                                                    //
          opts.binData = 'EOF';                                                                                        //
        }                                                                                                              //
        if (opts.chunkId == null) {                                                                                    //
          opts.chunkId = -1;                                                                                           //
        }                                                                                                              //
        if (self.debug) {                                                                                              // 318
          console.info("[Meteor.Files] [Write Method] Got #" + opts.chunkId + "/" + opts.fileLength + " chunks, dst: " + (opts.file.name || opts.file.fileName));
        }                                                                                                              //
        if (self.onBeforeUpload && _.isFunction(self.onBeforeUpload)) {                                                // 320
          isUploadAllowed = self.onBeforeUpload.call({                                                                 // 321
            file: opts.file                                                                                            // 321
          }, opts.file);                                                                                               //
          if (isUploadAllowed !== true) {                                                                              // 322
            throw new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : '@onBeforeUpload() returned false');
          }                                                                                                            //
        }                                                                                                              //
        fileName = self.getFileName(opts.file);                                                                        // 302
        ref = self.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;               // 302
        pathName = self["public"] ? self.storagePath + "/original-" + opts.fileId : self.storagePath + "/" + opts.fileId;
        path = self["public"] ? self.storagePath + "/original-" + opts.fileId + extensionWithDot : self.storagePath + "/" + opts.fileId + extensionWithDot;
        pathPart = opts.fileLength > 1 ? pathName + "_" + opts.chunkId + extensionWithDot : null;                      // 302
        result = _.extend(self.dataToSchema(_.extend(opts.file, {                                                      // 302
          path: path,                                                                                                  // 332
          extension: extension,                                                                                        // 332
          name: fileName,                                                                                              // 332
          meta: opts.meta                                                                                              // 332
        })), {                                                                                                         //
          _id: opts.fileId                                                                                             // 332
        });                                                                                                            //
        action = function(cb) {                                                                                        // 302
          return Meteor.defer(function() {                                                                             //
            var _path, binary, concatChunks, e, finish, tries;                                                         // 335
            if (opts.eof) {                                                                                            // 335
              binary = opts.binData;                                                                                   // 336
            } else {                                                                                                   //
              binary = new Buffer(opts.binData, 'base64');                                                             // 338
            }                                                                                                          //
            tries = 0;                                                                                                 // 335
            concatChunks = function(num, files, cb) {                                                                  // 335
              var _path, _source, findex, sindex;                                                                      // 342
              sindex = files.indexOf(opts.fileId + "_1" + extensionWithDot);                                           // 342
              if (!!~sindex) {                                                                                         // 343
                files.splice(sindex, 1);                                                                               // 343
              }                                                                                                        //
              findex = files.indexOf(opts.fileId + "_" + num + extensionWithDot);                                      // 342
              if (!!~findex) {                                                                                         // 345
                files.splice(findex, 1);                                                                               // 346
              } else if (files.length <= 0) {                                                                          //
                return finish(cb);                                                                                     // 348
              } else {                                                                                                 //
                return concatChunks(++num, files, cb);                                                                 // 350
              }                                                                                                        //
              _path = pathName + "_" + num + extensionWithDot;                                                         // 342
              _source = pathName + '_1' + extensionWithDot;                                                            // 342
              return fs.stat(_path, function(error, stats) {                                                           //
                return bound(function() {                                                                              //
                  if (error || !stats.isFile()) {                                                                      // 356
                    if (tries >= 10) {                                                                                 // 357
                      return cb(new Meteor.Error(500, "Chunk #" + num + " is missing!"));                              //
                    } else {                                                                                           //
                      tries++;                                                                                         // 360
                      return Meteor.setTimeout(function() {                                                            //
                        return concatChunks(num, files, cb);                                                           //
                      }, 100);                                                                                         //
                    }                                                                                                  //
                  } else {                                                                                             //
                    return fs.readFile(_path, function(error, _chunkData) {                                            //
                      return bound(function() {                                                                        //
                        if (error) {                                                                                   // 366
                          return cb(new Meteor.Error(500, "Can't read " + _path));                                     //
                        } else {                                                                                       //
                          return fs.appendFile(_source, _chunkData, function(error) {                                  //
                            return bound(function() {                                                                  //
                              if (error) {                                                                             // 370
                                return cb(new Meteor.Error(500, "Can't append " + _path + " to " + _source));          //
                              } else {                                                                                 //
                                fs.unlink(_path, NOOP);                                                                // 373
                                if (files.length <= 0) {                                                               // 374
                                  return fs.rename(_source, path, function(error) {                                    //
                                    return bound(function() {                                                          //
                                      if (error) {                                                                     // 376
                                        return cb(new Meteor.Error(500, "Can't rename " + _source + " to " + path));   //
                                      } else {                                                                         //
                                        return finish(cb);                                                             //
                                      }                                                                                //
                                    });                                                                                //
                                  });                                                                                  //
                                } else {                                                                               //
                                  return concatChunks(++num, files, cb);                                               //
                                }                                                                                      //
                              }                                                                                        //
                            });                                                                                        //
                          });                                                                                          //
                        }                                                                                              //
                      });                                                                                              //
                    });                                                                                                //
                  }                                                                                                    //
                });                                                                                                    //
              });                                                                                                      //
            };                                                                                                         //
            finish = function(cb) {                                                                                    // 335
              fs.chmod(path, self.permissions, NOOP);                                                                  // 384
              result.type = self.getMimeType(opts.file);                                                               // 384
              return self.collection.insert(_.clone(result), function(error, _id) {                                    //
                if (error) {                                                                                           // 388
                  return cb(new Meteor.Error(500, error));                                                             //
                } else {                                                                                               //
                  result._id = _id;                                                                                    // 391
                  if (self.debug) {                                                                                    // 392
                    console.info("[Meteor.Files] [Write Method] [finish] " + fileName + " -> " + path);                // 392
                  }                                                                                                    //
                  self.onAfterUpload && self.onAfterUpload.call(self, result);                                         // 391
                  return cb(null, result);                                                                             //
                }                                                                                                      //
              });                                                                                                      //
            };                                                                                                         //
            try {                                                                                                      // 395
              if (opts.eof) {                                                                                          // 396
                if (opts.fileLength > 1) {                                                                             // 397
                  fs.readdir(self.storagePath, function(error, files) {                                                // 398
                    return bound(function() {                                                                          //
                      if (error) {                                                                                     // 399
                        return cb(new Meteor.Error(500, error));                                                       //
                      } else {                                                                                         //
                        files = files.filter(function(f) {                                                             // 402
                          return !!~f.indexOf(opts.fileId);                                                            //
                        });                                                                                            //
                        if (files.length === 1) {                                                                      // 403
                          return fs.rename(self.storagePath + "/" + files[0], path, function(error) {                  //
                            return bound(function() {                                                                  //
                              if (error) {                                                                             // 405
                                return cb(new Meteor.Error(500, "Can't rename " + _source + " to " + path));           //
                              } else {                                                                                 //
                                return finish(cb);                                                                     //
                              }                                                                                        //
                            });                                                                                        //
                          });                                                                                          //
                        } else {                                                                                       //
                          return concatChunks(2, files, cb);                                                           //
                        }                                                                                              //
                      }                                                                                                //
                    });                                                                                                //
                  });                                                                                                  //
                } else {                                                                                               //
                  finish(cb);                                                                                          // 412
                }                                                                                                      //
              } else {                                                                                                 //
                if (pathPart) {                                                                                        // 414
                  _path = opts.fileLength > 1 ? pathName + "_" + (opts.chunkId - 1) + extensionWithDot : void 0;       // 415
                  fs.stat(_path, function(error, stats) {                                                              // 415
                    return bound(function() {                                                                          //
                      if (error || !stats.isFile()) {                                                                  // 417
                        return fs.outputFile(pathPart || path, binary, 'binary', function(error) {                     //
                          return bound(function() {                                                                    //
                            return cb(error, result);                                                                  //
                          });                                                                                          //
                        });                                                                                            //
                      } else {                                                                                         //
                        return fs.appendFile(_path, binary, function(error) {                                          //
                          return bound(function() {                                                                    //
                            return fs.rename(_path, pathName + "_" + opts.chunkId + extensionWithDot, function(error) {
                              return bound(function() {                                                                //
                                return cb(error, result);                                                              //
                              });                                                                                      //
                            });                                                                                        //
                          });                                                                                          //
                        });                                                                                            //
                      }                                                                                                //
                    });                                                                                                //
                  });                                                                                                  //
                } else {                                                                                               //
                  fs.outputFile(pathPart || path, binary, 'binary', function(error) {                                  // 425
                    return bound(function() {                                                                          //
                      return cb(error, result);                                                                        //
                    });                                                                                                //
                  });                                                                                                  //
                }                                                                                                      //
              }                                                                                                        //
            } catch (_error) {                                                                                         //
              e = _error;                                                                                              // 427
              cb(e);                                                                                                   // 427
            }                                                                                                          //
          });                                                                                                          //
        };                                                                                                             //
        if (opts.eof) {                                                                                                // 430
          try {                                                                                                        // 431
            return Meteor.wrapAsync(action)();                                                                         // 432
          } catch (_error) {                                                                                           //
            e = _error;                                                                                                // 434
            if (self.debug) {                                                                                          // 434
              console.warn("[Meteor.Files] [Write Method] Exception:", e);                                             // 434
            }                                                                                                          //
            throw e;                                                                                                   // 435
          }                                                                                                            //
        } else {                                                                                                       //
          action(NOOP);                                                                                                // 437
          return result;                                                                                               // 438
        }                                                                                                              //
      };                                                                                                               //
      _methods[self.methodNames.MeteorFileAbort] = function(opts) {                                                    // 249
        var _path, ext, i, path;                                                                                       // 441
        check(opts, {                                                                                                  // 441
          fileId: String,                                                                                              // 441
          fileData: Object,                                                                                            // 441
          fileLength: Number                                                                                           // 441
        });                                                                                                            //
        ext = "." + opts.fileData.ext;                                                                                 // 441
        path = self["public"] ? self.storagePath + "/original-" + opts.fileId : self.storagePath + "/" + opts.fileId;  // 441
        if (self.debug) {                                                                                              // 450
          console.info("[Meteor.Files] [Abort Method]: For " + path);                                                  // 450
        }                                                                                                              //
        if (opts.fileLength > 1) {                                                                                     // 451
          i = 0;                                                                                                       // 452
          while (i <= opts.fileLength) {                                                                               // 453
            _path = path + "_" + i + ext;                                                                              // 454
            fs.stat(_path, (function(error, stats) {                                                                   // 454
              return bound((function(_this) {                                                                          //
                return function() {                                                                                    //
                  if (!error && stats.isFile()) {                                                                      // 456
                    return fs.unlink(_this._path, NOOP);                                                               //
                  }                                                                                                    //
                };                                                                                                     //
              })(this));                                                                                               //
            }).bind({                                                                                                  //
              _path: _path                                                                                             // 458
            }));                                                                                                       //
            i++;                                                                                                       // 454
          }                                                                                                            //
        }                                                                                                              //
        return Meteor.setTimeout(function() {                                                                          //
          return self.remove(opts.fileId);                                                                             //
        }, 250);                                                                                                       //
      };                                                                                                               //
      Meteor.methods(_methods);                                                                                        // 249
    }                                                                                                                  //
  }                                                                                                                    //
                                                                                                                       //
                                                                                                                       // 466
  /*                                                                                                                   // 466
  Extend Meteor.Files with mime library                                                                                //
  @url https://github.com/broofa/node-mime                                                                             //
  @description Temporary removed from package due to unstability                                                       //
   */                                                                                                                  //
                                                                                                                       //
                                                                                                                       // 473
  /*                                                                                                                   // 473
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name getMimeType                                                                                                    //
  @param {Object} fileData - File Object                                                                               //
  @description Returns file's mime-type                                                                                //
  @returns {String}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.getMimeType = function(fileData) {                                                                   // 101
    var mime;                                                                                                          // 483
    check(fileData, Object);                                                                                           // 483
    if (fileData != null ? fileData.type : void 0) {                                                                   // 484
      mime = fileData.type;                                                                                            // 484
    }                                                                                                                  //
    if (!mime || !_.isString(mime)) {                                                                                  // 485
      mime = 'application/octet-stream';                                                                               // 485
    }                                                                                                                  //
    return mime;                                                                                                       //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 488
  /*                                                                                                                   // 488
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name getFileName                                                                                                    //
  @param {Object} fileData - File Object                                                                               //
  @description Returns file's name                                                                                     //
  @returns {String}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.getFileName = function(fileData) {                                                                   // 101
    var cleanName, fileName;                                                                                           // 498
    fileName = fileData.name || fileData.fileName;                                                                     // 498
    if (_.isString(fileName) && fileName.length > 0) {                                                                 // 499
      cleanName = function(str) {                                                                                      // 500
        return str.replace(/\.\./g, '').replace(/\//g, '');                                                            //
      };                                                                                                               //
      return cleanName(fileData.name || fileData.fileName);                                                            // 501
    } else {                                                                                                           //
      return '';                                                                                                       // 503
    }                                                                                                                  //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 505
  /*                                                                                                                   // 505
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name getUser                                                                                                        //
  @description Returns object with `userId` and `user()` method which return user's object                             //
  @returns {Object}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.getUser = function(http) {                                                                           // 101
    var cookie, result, user;                                                                                          // 514
    result = {                                                                                                         // 514
      user: function() {                                                                                               // 515
        return null;                                                                                                   // 515
      },                                                                                                               //
      userId: null                                                                                                     // 515
    };                                                                                                                 //
    if (Meteor.isServer) {                                                                                             // 518
      if (http) {                                                                                                      // 519
        cookie = http.request.Cookies;                                                                                 // 520
        if (_.has(Package, 'accounts-base') && cookie.has('meteor_login_token')) {                                     // 521
          user = Meteor.users.findOne({                                                                                // 522
            'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(cookie.get('meteor_login_token'))      // 522
          });                                                                                                          //
          if (user) {                                                                                                  // 523
            result.user = function() {                                                                                 // 524
              return user;                                                                                             // 524
            };                                                                                                         //
            result.userId = user._id;                                                                                  // 524
          }                                                                                                            //
        }                                                                                                              //
      }                                                                                                                //
    } else {                                                                                                           //
      if (_.has(Package, 'accounts-base') && Meteor.userId()) {                                                        // 527
        result.user = function() {                                                                                     // 528
          return Meteor.user();                                                                                        // 528
        };                                                                                                             //
        result.userId = Meteor.userId();                                                                               // 528
      }                                                                                                                //
    }                                                                                                                  //
    return result;                                                                                                     // 531
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 533
  /*                                                                                                                   // 533
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name getExt                                                                                                         //
  @param {String} FileName - File name                                                                                 //
  @description Get extension from FileName                                                                             //
  @returns {Object}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.getExt = function(fileName) {                                                                        // 101
    var extension;                                                                                                     // 543
    if (!!~fileName.indexOf('.')) {                                                                                    // 543
      extension = fileName.split('.').pop();                                                                           // 544
      return {                                                                                                         // 545
        ext: extension,                                                                                                // 545
        extension: extension,                                                                                          // 545
        extensionWithDot: '.' + extension                                                                              // 545
      };                                                                                                               //
    } else {                                                                                                           //
      return {                                                                                                         // 547
        ext: '',                                                                                                       // 547
        extension: '',                                                                                                 // 547
        extensionWithDot: ''                                                                                           // 547
      };                                                                                                               //
    }                                                                                                                  //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 549
  /*                                                                                                                   // 549
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name dataToSchema                                                                                                   //
  @param {Object} data - File data                                                                                     //
  @description Build object in accordance with schema from File data                                                   //
  @returns {Object}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.dataToSchema = function(data) {                                                                      // 101
    return {                                                                                                           // 559
      name: data.name,                                                                                                 // 559
      extension: data.extension,                                                                                       // 559
      path: data.path,                                                                                                 // 559
      meta: data.meta,                                                                                                 // 559
      type: data.type,                                                                                                 // 559
      size: data.size,                                                                                                 // 559
      versions: {                                                                                                      // 559
        original: {                                                                                                    // 567
          path: data.path,                                                                                             // 568
          size: data.size,                                                                                             // 568
          type: data.type,                                                                                             // 568
          extension: data.extension                                                                                    // 568
        }                                                                                                              //
      },                                                                                                               //
      isVideo: !!~data.type.toLowerCase().indexOf('video'),                                                            // 559
      isAudio: !!~data.type.toLowerCase().indexOf('audio'),                                                            // 559
      isImage: !!~data.type.toLowerCase().indexOf('image'),                                                            // 559
      _prefix: data._prefix || this._prefix,                                                                           // 559
      _storagePath: data._storagePath || this.storagePath,                                                             // 559
      _downloadRoute: data._downloadRoute || this.downloadRoute,                                                       // 559
      _collectionName: data._collectionName || this.collectionName                                                     // 559
    };                                                                                                                 //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 581
  /*                                                                                                                   // 581
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name srch                                                                                                           //
  @param {String|Object} search - Search data                                                                          //
  @description Build search object                                                                                     //
  @returns {Object}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.srch = function(search) {                                                                            // 101
    if (search && _.isString(search)) {                                                                                // 591
      this.search = {                                                                                                  // 592
        _id: search                                                                                                    // 593
      };                                                                                                               //
    } else {                                                                                                           //
      this.search = search || {};                                                                                      // 595
    }                                                                                                                  //
    return this.search;                                                                                                //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 598
  /*                                                                                                                   // 598
  @server                                                                                                              //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name write                                                                                                          //
  @param {Buffer} buffer - Binary File's Buffer                                                                        //
  @param {Object} opts - {fileName: '', type: '', size: 0, meta: {...}}                                                //
  @param {Function} callback - function(error, fileObj){...}                                                           //
  @description Write buffer to FS and add to Meteor.Files Collection                                                   //
  @returns {Files} - Returns current Meteor.Files instance                                                             //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.write = Meteor.isServer ? function(buffer, opts, callback) {                                         // 101
    var extension, extensionWithDot, fileName, path, randFileName, ref, result;                                        // 610
    if (opts == null) {                                                                                                //
      opts = {};                                                                                                       //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  // 610
      console.info("[Meteor.Files] [write()]");                                                                        // 610
    }                                                                                                                  //
    check(opts, Match.Optional(Object));                                                                               // 610
    check(callback, Match.Optional(Function));                                                                         // 610
    if (this.checkAccess()) {                                                                                          // 614
      randFileName = this.namingFunction();                                                                            // 615
      fileName = opts.name || opts.fileName ? opts.name || opts.fileName : randFileName;                               // 615
      ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                 // 615
      path = this["public"] ? this.storagePath + "/original-" + randFileName + extensionWithDot : this.storagePath + "/" + randFileName + extensionWithDot;
      opts.type = this.getMimeType(opts);                                                                              // 615
      if (!opts.meta) {                                                                                                // 623
        opts.meta = {};                                                                                                // 623
      }                                                                                                                //
      if (!opts.size) {                                                                                                // 624
        opts.size = buffer.length;                                                                                     // 624
      }                                                                                                                //
      result = this.dataToSchema({                                                                                     // 615
        name: fileName,                                                                                                // 627
        path: path,                                                                                                    // 627
        meta: opts.meta,                                                                                               // 627
        type: opts.type,                                                                                               // 627
        size: opts.size,                                                                                               // 627
        extension: extension                                                                                           // 627
      });                                                                                                              //
      if (this.debug) {                                                                                                // 634
        console.info("[Meteor.Files] [write]: " + fileName + " -> " + this.collectionName);                            // 634
      }                                                                                                                //
      fs.outputFile(path, buffer, 'binary', function(error) {                                                          // 615
        return bound(function() {                                                                                      //
          if (error) {                                                                                                 // 637
            return callback && callback(error);                                                                        //
          } else {                                                                                                     //
            result._id = this.collection.insert(_.clone(result));                                                      // 640
            return callback && callback(null, result);                                                                 //
          }                                                                                                            //
        });                                                                                                            //
      });                                                                                                              //
      return this;                                                                                                     // 643
    }                                                                                                                  //
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 647
  /*                                                                                                                   // 647
  @server                                                                                                              //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name load                                                                                                           //
  @param {String} url - URL to file                                                                                    //
  @param {Object} opts - {fileName: '', meta: {...}}                                                                   //
  @param {Function} callback - function(error, fileObj){...}                                                           //
  @description Download file, write stream to FS and add to Meteor.Files Collection                                    //
  @returns {Files} - Return this                                                                                       //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.load = Meteor.isServer ? function(url, opts, callback) {                                             // 101
    var extension, extensionWithDot, fileName, path, randFileName, ref, self;                                          // 659
    if (opts == null) {                                                                                                //
      opts = {};                                                                                                       //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  // 659
      console.info("[Meteor.Files] [load(" + url + ", " + (JSON.stringify(opts)) + ", callback)]");                    // 659
    }                                                                                                                  //
    check(url, String);                                                                                                // 659
    check(opts, Match.Optional(Object));                                                                               // 659
    check(callback, Match.Optional(Function));                                                                         // 659
    self = this;                                                                                                       // 659
    randFileName = this.namingFunction();                                                                              // 659
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : randFileName;                                 // 659
    ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                   // 659
    path = this["public"] ? this.storagePath + "/original-" + randFileName + extensionWithDot : this.storagePath + "/" + randFileName + extensionWithDot;
    if (!opts.meta) {                                                                                                  // 670
      opts.meta = {};                                                                                                  // 670
    }                                                                                                                  //
    request.get(url).on('error', function(error) {                                                                     // 659
      return bound(function() {                                                                                        //
        throw new Meteor.Error(500, ("Error on [load(" + url + ")]:") + JSON.stringify(error));                        // 673
      });                                                                                                              //
    }).on('response', function(response) {                                                                             //
      return bound(function() {                                                                                        //
        var result;                                                                                                    // 676
        if (self.debug) {                                                                                              // 676
          console.info("[Meteor.Files] [load] Received: " + url);                                                      // 676
        }                                                                                                              //
        result = self.dataToSchema({                                                                                   // 676
          name: fileName,                                                                                              // 679
          path: path,                                                                                                  // 679
          meta: opts.meta,                                                                                             // 679
          type: opts.type || response.headers['content-type'],                                                         // 679
          size: opts.size || response.headers['content-length'],                                                       // 679
          extension: extension                                                                                         // 679
        });                                                                                                            //
        return self.collection.insert(_.clone(result), function(error, fileRef) {                                      //
          if (error) {                                                                                                 // 687
            if (self.debug) {                                                                                          // 688
              console.warn("[Meteor.Files] [load] [insert] Error: " + fileName + " -> " + self.collectionName, error);
            }                                                                                                          //
            return callback && callback(error);                                                                        //
          } else {                                                                                                     //
            if (self.debug) {                                                                                          // 691
              console.info("[Meteor.Files] [load] [insert] " + fileName + " -> " + self.collectionName);               // 691
            }                                                                                                          //
            return callback && callback(null, fileRef);                                                                //
          }                                                                                                            //
        });                                                                                                            //
      });                                                                                                              //
    }).pipe(fs.createOutputStream(path));                                                                              //
    return this;                                                                                                       // 696
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 700
  /*                                                                                                                   // 700
  @server                                                                                                              //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name addFile                                                                                                        //
  @param {String} path - Path to file                                                                                  //
  @param {String} path - Path to file                                                                                  //
  @description Add file from FS to Meteor.Files                                                                        //
  @returns {Files} - Return this                                                                                       //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.addFile = Meteor.isServer ? function(path, opts, callback) {                                         // 101
    var self;                                                                                                          // 711
    if (opts == null) {                                                                                                //
      opts = {};                                                                                                       //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  // 711
      console.info("[Meteor.Files] [addFile(" + path + ")]");                                                          // 711
    }                                                                                                                  //
    if (this["public"]) {                                                                                              // 713
      throw new Meteor.Error(403, 'Can not run [addFile] on public collection');                                       // 713
    }                                                                                                                  //
    check(path, String);                                                                                               // 711
    check(opts, Match.Optional(Object));                                                                               // 711
    check(callback, Match.Optional(Function));                                                                         // 711
    self = this;                                                                                                       // 711
    fs.stat(path, function(error, stats) {                                                                             // 711
      return bound(function() {                                                                                        //
        var _cn, extension, extensionWithDot, fileName, fileSize, fileStats, pathParts, ref, result;                   // 720
        if (error) {                                                                                                   // 720
          return callback && callback(error);                                                                          //
        } else if (stats.isFile()) {                                                                                   //
          fileStats = util.inspect(stats);                                                                             // 723
          fileSize = fileStats.size;                                                                                   // 723
          pathParts = path.split('/');                                                                                 // 723
          fileName = pathParts[pathParts.length - 1];                                                                  // 723
          ref = self.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;             // 723
          if (!opts.type) {                                                                                            // 730
            opts.type = 'application/*';                                                                               // 730
          }                                                                                                            //
          if (!opts.meta) {                                                                                            // 731
            opts.meta = {};                                                                                            // 731
          }                                                                                                            //
          if (!opts.size) {                                                                                            // 732
            opts.size = fileSize;                                                                                      // 732
          }                                                                                                            //
          result = self.dataToSchema({                                                                                 // 723
            name: fileName,                                                                                            // 735
            path: path,                                                                                                // 735
            meta: opts.meta,                                                                                           // 735
            type: opts.type,                                                                                           // 735
            size: opts.size,                                                                                           // 735
            extension: extension,                                                                                      // 735
            _storagePath: path.replace("/" + fileName, '')                                                             // 735
          });                                                                                                          //
          _cn = self.collectionName;                                                                                   // 723
          return self.collection.insert(_.clone(result), function(error, record) {                                     //
            if (error) {                                                                                               // 745
              if (self.debug) {                                                                                        // 746
                console.warn("[Meteor.Files] [addFile] [insert] Error: " + fileName + " -> " + _cn, error);            // 746
              }                                                                                                        //
              return callback && callback(error);                                                                      //
            } else {                                                                                                   //
              if (self.debug) {                                                                                        // 749
                console.info("[Meteor.Files] [addFile] [insert]: " + fileName + " -> " + _cn);                         // 749
              }                                                                                                        //
              return callback && callback(null, result);                                                               //
            }                                                                                                          //
          });                                                                                                          //
        } else {                                                                                                       //
          return callback && callback(new Meteor.Error(400, "[Meteor.Files] [addFile(" + path + ")]: File does not exist"));
        }                                                                                                              //
      });                                                                                                              //
    });                                                                                                                //
    return this;                                                                                                       // 754
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 758
  /*                                                                                                                   // 758
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name findOne                                                                                                        //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                     //
  @description Load file                                                                                               //
  @returns {Files} - Return this                                                                                       //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.findOne = function(search) {                                                                         // 101
    if (this.debug) {                                                                                                  // 768
      console.info("[Meteor.Files] [findOne(" + (JSON.stringify(search)) + ")]");                                      // 768
    }                                                                                                                  //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                        // 768
    this.srch(search);                                                                                                 // 768
    if (this.checkAccess()) {                                                                                          // 772
      this.currentFile = this.collection.findOne(this.search);                                                         // 773
      this.cursor = null;                                                                                              // 773
    }                                                                                                                  //
    return this;                                                                                                       // 775
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 777
  /*                                                                                                                   // 777
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name find                                                                                                           //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                     //
  @description Load file or bunch of files                                                                             //
  @returns {Files} - Return this                                                                                       //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.find = function(search) {                                                                            // 101
    if (this.debug) {                                                                                                  // 787
      console.info("[Meteor.Files] [find(" + (JSON.stringify(search)) + ")]");                                         // 787
    }                                                                                                                  //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                        // 787
    this.srch(search);                                                                                                 // 787
    if (this.checkAccess) {                                                                                            // 791
      this.currentFile = null;                                                                                         // 792
      this.cursor = this.collection.find(this.search);                                                                 // 792
    }                                                                                                                  //
    return this;                                                                                                       // 794
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 796
  /*                                                                                                                   // 796
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name get                                                                                                            //
  @description Return value of current cursor or file                                                                  //
  @returns {Object|[Object]}                                                                                           //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.get = function() {                                                                                   // 101
    if (this.debug) {                                                                                                  // 805
      console.info('[Meteor.Files] [get()]');                                                                          // 805
    }                                                                                                                  //
    if (this.cursor) {                                                                                                 // 806
      return this.cursor.fetch();                                                                                      // 806
    }                                                                                                                  //
    return this.currentFile;                                                                                           // 807
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 809
  /*                                                                                                                   // 809
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name fetch                                                                                                          //
  @description Alias for `get()` method                                                                                //
  @returns {[Object]}                                                                                                  //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.fetch = function() {                                                                                 // 101
    var data;                                                                                                          // 818
    if (this.debug) {                                                                                                  // 818
      console.info('[Meteor.Files] [fetch()]');                                                                        // 818
    }                                                                                                                  //
    data = this.get();                                                                                                 // 818
    if (!_.isArray(data)) {                                                                                            // 820
      return [data];                                                                                                   // 821
    } else {                                                                                                           //
      return data;                                                                                                     //
    }                                                                                                                  //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 825
  /*                                                                                                                   // 825
  @client                                                                                                              //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name insert                                                                                                         //
  @param {Object} config - Configuration object with next properties:                                                  //
    {File|Object} file           - HTML5 `files` item, like in change event: `e.currentTarget.files[0]`                //
    {Object}      meta           - Additional data as object, use later for search                                     //
    {Boolean}     allowWebWorkers- Allow/Deny WebWorkers usage                                                         //
    {Number|dynamic} streams     - Quantity of parallel upload streams, default: 2                                     //
    {Number|dynamic} chunkSize   - Chunk size for upload                                                               //
    {Function}    onUploaded     - Callback triggered when upload is finished, with two arguments `error` and `fileRef`
    {Function}    onError        - Callback triggered on error in upload and/or FileReader, with two arguments `error` and `fileData`
    {Function}    onProgress     - Callback triggered when chunk is sent, with only argument `progress`                //
    {Function}    onBeforeUpload - Callback triggered right before upload is started:                                  //
        return true to continue                                                                                        //
        return false to abort upload                                                                                   //
  @description Upload file to server over DDP                                                                          //
  @url https://developer.mozilla.org/en-US/docs/Web/API/FileReader                                                     //
  @returns {Object} with next properties:                                                                              //
    {ReactiveVar} onPause  - Is upload process on the pause?                                                           //
    {ReactiveVar} state    - active|paused|aborted|completed                                                           //
    {ReactiveVar} progress - Current progress in percentage                                                            //
    {Function}    pause    - Pause upload process                                                                      //
    {Function}    continue - Continue paused upload process                                                            //
    {Function}    toggle   - Toggle continue/pause if upload process                                                   //
    {Function}    abort    - Abort upload                                                                              //
    {Function}    readAsDataURL - Current file as data URL, use to create image preview and etc. Be aware of big files, may lead to browser crash
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.insert = Meteor.isClient ? function(config) {                                                        // 101
    var EOFsent, beforeunload, calculateStats, createStreams, currentChunk, end, fileData, fileId, fileLength, isUploadAllowed, prepare, result, self, sendEOF, sendViaDDP, sentChunks, transferTime, upload, worker;
    if (this.checkAccess()) {                                                                                          // 855
      if (this.debug) {                                                                                                // 856
        console.info('[Meteor.Files] [insert()]');                                                                     // 856
      }                                                                                                                //
      if (config.meta == null) {                                                                                       //
        config.meta = {};                                                                                              //
      }                                                                                                                //
      if (config.streams == null) {                                                                                    //
        config.streams = 2;                                                                                            //
      }                                                                                                                //
      if (config.streams < 1) {                                                                                        // 859
        config.streams = 2;                                                                                            // 859
      }                                                                                                                //
      if (config.chunkSize == null) {                                                                                  //
        config.chunkSize = this.chunkSize;                                                                             //
      }                                                                                                                //
      if (config.allowWebWorkers == null) {                                                                            //
        config.allowWebWorkers = true;                                                                                 //
      }                                                                                                                //
      check(config, {                                                                                                  // 856
        file: Match.Any,                                                                                               // 863
        meta: Match.Optional(Object),                                                                                  // 863
        onError: Match.Optional(Function),                                                                             // 863
        onAbort: Match.Optional(Function),                                                                             // 863
        streams: Match.OneOf('dynamic', Number),                                                                       // 863
        chunkSize: Match.OneOf('dynamic', Number),                                                                     // 863
        onUploaded: Match.Optional(Function),                                                                          // 863
        onProgress: Match.Optional(Function),                                                                          // 863
        onBeforeUpload: Match.Optional(Function),                                                                      // 863
        allowWebWorkers: Boolean                                                                                       // 863
      });                                                                                                              //
      if (config.file) {                                                                                               // 876
        if (Worker && config.allowWebWorkers) {                                                                        // 877
          worker = this.ReaderWorker;                                                                                  // 878
        } else {                                                                                                       //
          worker = null;                                                                                               // 880
        }                                                                                                              //
        if (this.debug) {                                                                                              // 881
          console.time('insert');                                                                                      // 881
        }                                                                                                              //
        if (this.debug) {                                                                                              // 882
          console.time('loadFile');                                                                                    // 882
        }                                                                                                              //
        self = this;                                                                                                   // 877
        fileLength = 1;                                                                                                // 877
        fileId = this.namingFunction();                                                                                // 877
        fileData = {                                                                                                   // 877
          size: config.file.size,                                                                                      // 887
          type: config.file.type,                                                                                      // 887
          name: config.file.name                                                                                       // 887
        };                                                                                                             //
        fileData = _.extend(fileData, this.getExt(config.file.name), {                                                 // 877
          mime: this.getMimeType(fileData)                                                                             // 891
        });                                                                                                            //
        fileData['mime-type'] = fileData.mime;                                                                         // 877
        result = {                                                                                                     // 877
          file: _.extend(config.file, fileData),                                                                       // 895
          state: new ReactiveVar('active'),                                                                            // 895
          onPause: new ReactiveVar(false),                                                                             // 895
          progress: new ReactiveVar(0),                                                                                // 895
          estimateTime: new ReactiveVar(1000),                                                                         // 895
          estimateSpeed: new ReactiveVar(0),                                                                           // 895
          continueFunc: function() {},                                                                                 // 895
          pause: function() {                                                                                          // 895
            if (!this.onPause.get()) {                                                                                 // 903
              this.onPause.set(true);                                                                                  // 904
              this.state.set('paused');                                                                                // 904
            }                                                                                                          //
          },                                                                                                           //
          "continue": function() {                                                                                     // 895
            if (this.onPause.get()) {                                                                                  // 908
              this.onPause.set(false);                                                                                 // 909
              this.state.set('active');                                                                                // 909
              this.continueFunc.call();                                                                                // 909
              this.continueFunc = function() {};                                                                       // 909
            }                                                                                                          //
          },                                                                                                           //
          toggle: function() {                                                                                         // 895
            if (this.onPause.get()) {                                                                                  // 915
              this["continue"]();                                                                                      // 915
            } else {                                                                                                   //
              this.pause();                                                                                            // 915
            }                                                                                                          //
          },                                                                                                           //
          abort: function() {                                                                                          // 895
            window.removeEventListener('beforeunload', beforeunload, false);                                           // 918
            config.onAbort && config.onAbort.call(this, fileData);                                                     // 918
            this.pause();                                                                                              // 918
            this.state.set('aborted');                                                                                 // 918
            if (self.debug) {                                                                                          // 922
              console.timeEnd('insert');                                                                               // 922
            }                                                                                                          //
            Meteor.call(self.methodNames.MeteorFileAbort, {                                                            // 918
              fileId: fileId,                                                                                          // 923
              fileLength: fileLength,                                                                                  // 923
              fileData: fileData                                                                                       // 923
            });                                                                                                        //
            delete upload;                                                                                             // 918
          }                                                                                                            //
        };                                                                                                             //
        beforeunload = function(e) {                                                                                   // 877
          var message;                                                                                                 // 928
          message = _.isFunction(self.onbeforeunloadMessage) ? self.onbeforeunloadMessage.call(result, fileData) : self.onbeforeunloadMessage;
          if (e) {                                                                                                     // 929
            e.returnValue = message;                                                                                   // 929
          }                                                                                                            //
          return message;                                                                                              // 930
        };                                                                                                             //
        window.addEventListener('beforeunload', beforeunload, false);                                                  // 877
        Tracker.autorun(function() {                                                                                   // 877
          if (!result.onPause.get()) {                                                                                 // 934
            if (Meteor.status().connected) {                                                                           // 935
              result["continue"]();                                                                                    // 936
              if (self.debug) {                                                                                        // 937
                console.info('[Meteor.Files] [insert] [Tracker] [continue]');                                          // 937
              }                                                                                                        //
            } else {                                                                                                   //
              result.pause();                                                                                          // 939
              if (self.debug) {                                                                                        // 940
                console.info('[Meteor.Files] [insert] [Tracker] [pause]');                                             // 940
              }                                                                                                        //
            }                                                                                                          //
          }                                                                                                            //
        });                                                                                                            //
        end = function(error, data) {                                                                                  // 877
          if (self.debug) {                                                                                            // 944
            console.timeEnd('insert');                                                                                 // 944
          }                                                                                                            //
          window.removeEventListener('beforeunload', beforeunload, false);                                             // 944
          result.progress.set(0);                                                                                      // 944
          config.onUploaded && config.onUploaded.call(result, error, data);                                            // 944
          if (error) {                                                                                                 // 948
            if (self.debug) {                                                                                          // 949
              console.warn("[Meteor.Files] [insert] [end] Error: ", error);                                            // 949
            }                                                                                                          //
            result.state.set('aborted');                                                                               // 949
            config.onError && config.onError.call(result, error, fileData);                                            // 949
          } else {                                                                                                     //
            result.state.set('completed');                                                                             // 953
          }                                                                                                            //
        };                                                                                                             //
        if (config.onBeforeUpload && _.isFunction(config.onBeforeUpload)) {                                            // 956
          isUploadAllowed = config.onBeforeUpload.call(result, fileData);                                              // 957
          if (isUploadAllowed !== true) {                                                                              // 958
            end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'config.onBeforeUpload() returned false'), null);
            return false;                                                                                              // 960
          }                                                                                                            //
        }                                                                                                              //
        if (this.onBeforeUpload && _.isFunction(this.onBeforeUpload)) {                                                // 962
          isUploadAllowed = this.onBeforeUpload.call(result, fileData);                                                // 963
          if (isUploadAllowed !== true) {                                                                              // 964
            end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'this.onBeforeUpload() returned false'), null);
            return false;                                                                                              // 966
          }                                                                                                            //
        }                                                                                                              //
        currentChunk = 0;                                                                                              // 877
        sentChunks = 0;                                                                                                // 877
        EOFsent = false;                                                                                               // 877
        transferTime = 0;                                                                                              // 877
        calculateStats = _.throttle(function() {                                                                       // 877
          var _t, progress;                                                                                            // 974
          _t = (transferTime / sentChunks) / config.streams;                                                           // 974
          result.estimateTime.set(_t * (fileLength - sentChunks));                                                     // 974
          result.estimateSpeed.set(config.chunkSize / (_t / 1000));                                                    // 974
          progress = Math.round((sentChunks / fileLength) * 100);                                                      // 974
          result.progress.set(progress);                                                                               // 974
          config.onProgress && config.onProgress.call(result, progress, fileData);                                     // 974
        }, 250);                                                                                                       //
        sendViaDDP = function(evt) {                                                                                   // 877
          return Meteor.defer(function() {                                                                             //
            var opts;                                                                                                  // 984
            if (self.debug) {                                                                                          // 984
              console.timeEnd('loadFile');                                                                             // 984
            }                                                                                                          //
            opts = {                                                                                                   // 984
              file: fileData,                                                                                          // 986
              fileId: fileId,                                                                                          // 986
              binData: evt.data.bin,                                                                                   // 986
              chunkId: evt.data.chunkId,                                                                               // 986
              fileLength: fileLength                                                                                   // 986
            };                                                                                                         //
            if (opts.binData && opts.binData.length) {                                                                 // 992
              Meteor.call(self.methodNames.MeteorFileWrite, opts, function(error) {                                    // 993
                ++sentChunks;                                                                                          // 994
                transferTime += (+(new Date)) - evt.data.start;                                                        // 994
                if (error) {                                                                                           // 996
                  end(error);                                                                                          // 997
                } else {                                                                                               //
                  if (sentChunks >= fileLength) {                                                                      // 999
                    sendEOF(opts);                                                                                     // 1000
                  } else if (currentChunk < fileLength) {                                                              //
                    upload();                                                                                          // 1002
                  }                                                                                                    //
                  calculateStats();                                                                                    // 999
                }                                                                                                      //
              });                                                                                                      //
            } else {                                                                                                   //
              sendEOF(opts);                                                                                           // 1006
            }                                                                                                          //
          });                                                                                                          //
        };                                                                                                             //
        sendEOF = function(opts) {                                                                                     // 877
          return Meteor.defer(function() {                                                                             //
            if (!EOFsent) {                                                                                            // 1010
              EOFsent = true;                                                                                          // 1011
              opts = {                                                                                                 // 1011
                eof: true,                                                                                             // 1013
                meta: config.meta,                                                                                     // 1013
                file: fileData,                                                                                        // 1013
                fileId: fileId,                                                                                        // 1013
                fileLength: fileLength                                                                                 // 1013
              };                                                                                                       //
              Meteor.call(self.methodNames.MeteorFileWrite, opts, end);                                                // 1011
            }                                                                                                          //
          });                                                                                                          //
        };                                                                                                             //
        if (worker) {                                                                                                  // 1021
          worker.onmessage = sendViaDDP;                                                                               // 1022
          worker.onerror = function(e) {                                                                               // 1022
            end(e.message);                                                                                            // 1024
          };                                                                                                           //
        }                                                                                                              //
        if (self.debug) {                                                                                              // 1027
          if (worker) {                                                                                                // 1028
            console.info("[Meteor.Files] [insert] using WebWorkers");                                                  // 1029
          } else {                                                                                                     //
            console.info("[Meteor.Files] [insert] using MainThread");                                                  // 1031
          }                                                                                                            //
        }                                                                                                              //
        upload = function() {                                                                                          // 877
          return Meteor.defer(function() {                                                                             //
            var start;                                                                                                 // 1034
            start = +(new Date);                                                                                       // 1034
            if (result.onPause.get()) {                                                                                // 1035
              result.continueFunc = function() {                                                                       // 1036
                return createStreams();                                                                                //
              };                                                                                                       //
              return;                                                                                                  // 1037
            }                                                                                                          //
            ++currentChunk;                                                                                            // 1034
            if (worker) {                                                                                              // 1040
              worker.postMessage({                                                                                     // 1041
                sentChunks: sentChunks,                                                                                // 1041
                start: start,                                                                                          // 1041
                currentChunk: currentChunk,                                                                            // 1041
                chunkSize: config.chunkSize,                                                                           // 1041
                file: config.file                                                                                      // 1041
              });                                                                                                      //
            } else {                                                                                                   //
              (function(chunkId) {                                                                                     // 1043
                var chunk, fileReader, readHandler;                                                                    // 1044
                fileReader = new FileReader;                                                                           // 1044
                chunk = config.file.slice(config.chunkSize * (chunkId - 1), config.chunkSize * chunkId);               // 1044
                readHandler = function(evt) {                                                                          // 1044
                  var ref, ref1;                                                                                       // 1047
                  sendViaDDP({                                                                                         // 1047
                    data: {                                                                                            // 1047
                      bin: ((fileReader != null ? fileReader.result : void 0) || ((ref = evt.srcElement) != null ? ref.result : void 0) || ((ref1 = evt.target) != null ? ref1.result : void 0)).split(',')[1],
                      chunkId: chunkId,                                                                                // 1048
                      start: start                                                                                     // 1048
                    }                                                                                                  //
                  });                                                                                                  //
                };                                                                                                     //
                fileReader.onloadend = readHandler;                                                                    // 1044
                fileReader.onerror = function(e) {                                                                     // 1044
                  result.abort();                                                                                      // 1055
                  onError && onError.call(result, (e.target || e.srcElement).error, fileData);                         // 1055
                };                                                                                                     //
                fileReader.readAsDataURL(chunk);                                                                       // 1044
              })(currentChunk);                                                                                        //
            }                                                                                                          //
          });                                                                                                          //
        };                                                                                                             //
        createStreams = function() {                                                                                   // 877
          var i;                                                                                                       // 1065
          i = 1;                                                                                                       // 1065
          while (i <= config.streams) {                                                                                // 1066
            upload();                                                                                                  // 1067
            i++;                                                                                                       // 1067
          }                                                                                                            //
        };                                                                                                             //
        prepare = function() {                                                                                         // 877
          var _len;                                                                                                    // 1072
          if (config.chunkSize === 'dynamic') {                                                                        // 1072
            if (config.file.size >= 104857600) {                                                                       // 1073
              config.chunkSize = 1048576;                                                                              // 1074
            } else if (config.file.size >= 52428800) {                                                                 //
              config.chunkSize = 524288;                                                                               // 1076
            } else {                                                                                                   //
              config.chunkSize = 262144;                                                                               // 1078
            }                                                                                                          //
          }                                                                                                            //
          _len = Math.ceil(config.file.size / config.chunkSize);                                                       // 1072
          if (config.streams === 'dynamic') {                                                                          // 1081
            config.streams = _.clone(_len);                                                                            // 1082
            if (config.streams > 32) {                                                                                 // 1083
              config.streams = 32;                                                                                     // 1083
            }                                                                                                          //
          }                                                                                                            //
          fileLength = _len <= 0 ? 1 : _len;                                                                           // 1072
          if (config.streams > fileLength) {                                                                           // 1086
            config.streams = fileLength;                                                                               // 1086
          }                                                                                                            //
          createStreams();                                                                                             // 1072
        };                                                                                                             //
        prepare();                                                                                                     // 877
        return result;                                                                                                 // 1090
      } else {                                                                                                         //
        return console.warn("[Meteor.Files] [insert] Have you forget to pass a File itself?");                         //
      }                                                                                                                //
    }                                                                                                                  //
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 1096
  /*                                                                                                                   // 1096
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name remove                                                                                                         //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                     //
  @description Remove file(s) on cursor or find and remove file(s) if search is set                                    //
  @returns {undefined}                                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.remove = function(search) {                                                                          // 101
    var files, self;                                                                                                   // 1106
    if (this.debug) {                                                                                                  // 1106
      console.info("[Meteor.Files] [remove(" + (JSON.stringify(search)) + ")]");                                       // 1106
    }                                                                                                                  //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                        // 1106
    if (this.checkAccess()) {                                                                                          // 1109
      this.srch(search);                                                                                               // 1110
      if (Meteor.isClient) {                                                                                           // 1111
        Meteor.call(this.methodNames.MeteorFileUnlink, rcp(this));                                                     // 1112
      }                                                                                                                //
      if (Meteor.isServer) {                                                                                           // 1114
        files = this.collection.find(this.search);                                                                     // 1115
        if (files.count() > 0) {                                                                                       // 1116
          self = this;                                                                                                 // 1117
          files.forEach(function(file) {                                                                               // 1117
            return self.unlink(file);                                                                                  //
          });                                                                                                          //
        }                                                                                                              //
        this.collection.remove(this.search);                                                                           // 1115
      }                                                                                                                //
    }                                                                                                                  //
    return this;                                                                                                       // 1120
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 1122
  /*                                                                                                                   // 1122
  @sever                                                                                                               //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name unlink                                                                                                         //
  @param {Object} file - fileObj                                                                                       //
  @description Unlink files and it's versions from FS                                                                  //
  @returns {undefined}                                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.unlink = Meteor.isServer ? function(file) {                                                          // 101
    if (this.debug) {                                                                                                  // 1132
      console.log("[Meteor.Files] [unlink(" + file._id + ")]");                                                        // 1132
    }                                                                                                                  //
    if (file.versions && !_.isEmpty(file.versions)) {                                                                  // 1133
      _.each(file.versions, function(version) {                                                                        // 1134
        return bound(function() {                                                                                      //
          return fs.unlink(version.path, NOOP);                                                                        //
        });                                                                                                            //
      });                                                                                                              //
    }                                                                                                                  //
    fs.unlink(file.path, NOOP);                                                                                        // 1132
    return this;                                                                                                       // 1137
  } : void 0;                                                                                                          //
                                                                                                                       //
  Files.prototype._404 = Meteor.isServer ? function(http) {                                                            // 101
    var text;                                                                                                          // 1142
    if (this.debug) {                                                                                                  // 1142
      console.warn("[Meteor.Files] [download(" + http.request.originalUrl + ")] [_404] File not found");               // 1142
    }                                                                                                                  //
    text = 'File Not Found :(';                                                                                        // 1142
    http.response.writeHead(404, {                                                                                     // 1142
      'Content-Length': text.length,                                                                                   // 1145
      'Content-Type': 'text/plain'                                                                                     // 1145
    });                                                                                                                //
    return http.response.end(text);                                                                                    //
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 1150
  /*                                                                                                                   // 1150
  @server                                                                                                              //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name download                                                                                                       //
  @param {Object|Files} self - Instance of MEteor.Files                                                                //
  @description Initiates the HTTP response                                                                             //
  @returns {undefined}                                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.download = Meteor.isServer ? function(http, version) {                                               // 101
    var _idres, fileRef, responseType, self;                                                                           // 1160
    if (version == null) {                                                                                             //
      version = 'original';                                                                                            //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  // 1160
      console.info("[Meteor.Files] [download(" + http.request.originalUrl + ", " + version + ")]");                    // 1160
    }                                                                                                                  //
    responseType = '200';                                                                                              // 1160
    if (!this["public"]) {                                                                                             // 1162
      if (this.currentFile) {                                                                                          // 1163
        if (_.has(this.currentFile, 'versions') && _.has(this.currentFile.versions, version)) {                        // 1164
          fileRef = this.currentFile.versions[version];                                                                // 1165
        } else {                                                                                                       //
          fileRef = this.currentFile;                                                                                  // 1167
        }                                                                                                              //
      } else {                                                                                                         //
        fileRef = false;                                                                                               // 1169
      }                                                                                                                //
    }                                                                                                                  //
    if (this["public"]) {                                                                                              // 1171
      fileRef = {                                                                                                      // 1172
        path: this.storagePath + "/" + http.params.file                                                                // 1173
      };                                                                                                               //
    }                                                                                                                  //
    if (!fileRef || !_.isObject(fileRef)) {                                                                            // 1175
      return this._404(http);                                                                                          // 1176
    } else if (this.currentFile) {                                                                                     //
      self = this;                                                                                                     // 1178
      if (this.interceptDownload && _.isFunction(this.interceptDownload)) {                                            // 1180
        _idres = this.interceptDownload(http, this.currentFile);                                                       // 1181
        if (_idres === true) {                                                                                         // 1182
          return;                                                                                                      // 1183
        }                                                                                                              //
      }                                                                                                                //
      if (this.downloadCallback) {                                                                                     // 1185
        if (!this.downloadCallback.call(_.extend(http, this.getUser(http)), this.currentFile)) {                       // 1186
          return this._404(http);                                                                                      // 1187
        }                                                                                                              //
      }                                                                                                                //
      return fs.stat(fileRef.path, function(statErr, stats) {                                                          //
        return bound(function() {                                                                                      //
          var array, dispositionEncoding, dispositionName, dispositionType, end, fileStats, partiral, ref, ref1, ref2, ref3, reqRange, start, stream, streamErrorHandler, take, text;
          if (statErr || !stats.isFile()) {                                                                            // 1190
            return self._404(http);                                                                                    // 1191
          }                                                                                                            //
          fileStats = util.inspect(stats);                                                                             // 1190
          if (fileStats.size !== fileRef.size && !self.integrityCheck) {                                               // 1194
            fileRef.size = fileStats.size;                                                                             // 1194
          }                                                                                                            //
          if (fileStats.size !== fileRef.size && self.integrityCheck) {                                                // 1195
            responseType = '400';                                                                                      // 1195
          }                                                                                                            //
          partiral = false;                                                                                            // 1190
          reqRange = false;                                                                                            // 1190
          if (http.params.query.download && http.params.query.download === 'true') {                                   // 1199
            dispositionType = 'attachment; ';                                                                          // 1200
          } else {                                                                                                     //
            dispositionType = 'inline; ';                                                                              // 1202
          }                                                                                                            //
          dispositionName = "filename=\"" + (encodeURIComponent(self.currentFile.name)) + "\"; filename=*UTF-8\"" + (encodeURIComponent(self.currentFile.name)) + "\"; ";
          dispositionEncoding = 'charset=utf-8';                                                                       // 1190
          http.response.setHeader('Content-Type', fileRef.type);                                                       // 1190
          http.response.setHeader('Content-Disposition', dispositionType + dispositionName + dispositionEncoding);     // 1190
          http.response.setHeader('Accept-Ranges', 'bytes');                                                           // 1190
          if ((ref = self.currentFile) != null ? (ref1 = ref.updatedAt) != null ? ref1.toUTCString() : void 0 : void 0) {
            http.response.setHeader('Last-Modified', (ref2 = self.currentFile) != null ? (ref3 = ref2.updatedAt) != null ? ref3.toUTCString() : void 0 : void 0);
          }                                                                                                            //
          http.response.setHeader('Connection', 'keep-alive');                                                         // 1190
          if (http.request.headers.range) {                                                                            // 1213
            partiral = true;                                                                                           // 1214
            array = http.request.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);                                       // 1214
            start = parseInt(array[1]);                                                                                // 1214
            end = parseInt(array[2]);                                                                                  // 1214
            if (isNaN(end)) {                                                                                          // 1218
              end = fileRef.size - 1;                                                                                  // 1219
            }                                                                                                          //
            take = end - start;                                                                                        // 1214
          } else {                                                                                                     //
            start = 0;                                                                                                 // 1222
            end = fileRef.size - 1;                                                                                    // 1222
            take = fileRef.size;                                                                                       // 1222
          }                                                                                                            //
          if (partiral || (http.params.query.play && http.params.query.play === 'true')) {                             // 1226
            reqRange = {                                                                                               // 1227
              start: start,                                                                                            // 1227
              end: end                                                                                                 // 1227
            };                                                                                                         //
            if (isNaN(start) && !isNaN(end)) {                                                                         // 1228
              reqRange.start = end - take;                                                                             // 1229
              reqRange.end = end;                                                                                      // 1229
            }                                                                                                          //
            if (!isNaN(start) && isNaN(end)) {                                                                         // 1231
              reqRange.start = start;                                                                                  // 1232
              reqRange.end = start + take;                                                                             // 1232
            }                                                                                                          //
            if ((start + take) >= fileRef.size) {                                                                      // 1235
              reqRange.end = fileRef.size - 1;                                                                         // 1235
            }                                                                                                          //
            http.response.setHeader('Pragma', 'private');                                                              // 1227
            http.response.setHeader('Expires', new Date(+(new Date) + 1000 * 32400).toUTCString());                    // 1227
            http.response.setHeader('Cache-Control', 'private, maxage=10800, s-maxage=32400');                         // 1227
            if (self.strict && (reqRange.start >= (fileRef.size - 1) || reqRange.end > (fileRef.size - 1))) {          // 1240
              responseType = '416';                                                                                    // 1241
            } else {                                                                                                   //
              responseType = '206';                                                                                    // 1243
            }                                                                                                          //
          } else {                                                                                                     //
            http.response.setHeader('Cache-Control', self.cacheControl);                                               // 1245
            responseType = '200';                                                                                      // 1245
          }                                                                                                            //
          streamErrorHandler = function(error) {                                                                       // 1190
            http.response.writeHead(500);                                                                              // 1249
            return http.response.end(error.toString());                                                                //
          };                                                                                                           //
          switch (responseType) {                                                                                      // 1252
            case '400':                                                                                                // 1252
              if (self.debug) {                                                                                        // 1254
                console.warn("[Meteor.Files] [download(" + fileRef.path + ", " + version + ")] [400] Content-Length mismatch!");
              }                                                                                                        //
              text = 'Content-Length mismatch!';                                                                       // 1254
              http.response.writeHead(400, {                                                                           // 1254
                'Content-Type': 'text/plain',                                                                          // 1257
                'Cache-Control': 'no-cache',                                                                           // 1257
                'Content-Length': text.length                                                                          // 1257
              });                                                                                                      //
              http.response.end(text);                                                                                 // 1254
              break;                                                                                                   // 1261
            case '404':                                                                                                // 1252
              return self._404(http);                                                                                  // 1263
              break;                                                                                                   // 1264
            case '416':                                                                                                // 1252
              if (self.debug) {                                                                                        // 1266
                console.info("[Meteor.Files] [download(" + fileRef.path + ", " + version + ")] [416] Content-Range is not specified!");
              }                                                                                                        //
              http.response.writeHead(416, {                                                                           // 1266
                'Content-Range': "bytes */" + fileRef.size                                                             // 1268
              });                                                                                                      //
              http.response.end();                                                                                     // 1266
              break;                                                                                                   // 1270
            case '200':                                                                                                // 1252
              if (self.debug) {                                                                                        // 1272
                console.info("[Meteor.Files] [download(" + fileRef.path + ", " + version + ")] [200]");                // 1272
              }                                                                                                        //
              stream = fs.createReadStream(fileRef.path);                                                              // 1272
              stream.on('open', (function(_this) {                                                                     // 1272
                return function() {                                                                                    //
                  http.response.writeHead(200);                                                                        // 1275
                  if (self.throttle) {                                                                                 // 1276
                    return stream.pipe(new Throttle({                                                                  //
                      bps: self.throttle,                                                                              // 1277
                      chunksize: self.chunkSize                                                                        // 1277
                    })).pipe(http.response);                                                                           //
                  } else {                                                                                             //
                    return stream.pipe(http.response);                                                                 //
                  }                                                                                                    //
                };                                                                                                     //
              })(this)).on('error', streamErrorHandler);                                                               //
              break;                                                                                                   // 1282
            case '206':                                                                                                // 1252
              if (self.debug) {                                                                                        // 1284
                console.info("[Meteor.Files] [download(" + fileRef.path + ", " + version + ")] [206]");                // 1284
              }                                                                                                        //
              http.response.setHeader('Content-Range', "bytes " + reqRange.start + "-" + reqRange.end + "/" + fileRef.size);
              http.response.setHeader('Trailer', 'expires');                                                           // 1284
              http.response.setHeader('Transfer-Encoding', 'chunked');                                                 // 1284
              if (self.throttle) {                                                                                     // 1288
                stream = fs.createReadStream(fileRef.path, {                                                           // 1289
                  start: reqRange.start,                                                                               // 1289
                  end: reqRange.end                                                                                    // 1289
                });                                                                                                    //
                stream.on('open', function() {                                                                         // 1289
                  return http.response.writeHead(206);                                                                 //
                }).on('error', streamErrorHandler).on('end', function() {                                              //
                  return http.response.end();                                                                          //
                }).pipe(new Throttle({                                                                                 //
                  bps: self.throttle,                                                                                  // 1293
                  chunksize: self.chunkSize                                                                            // 1293
                })).pipe(http.response);                                                                               //
              } else {                                                                                                 //
                stream = fs.createReadStream(fileRef.path, {                                                           // 1296
                  start: reqRange.start,                                                                               // 1296
                  end: reqRange.end                                                                                    // 1296
                });                                                                                                    //
                stream.on('open', function() {                                                                         // 1296
                  return http.response.writeHead(206);                                                                 //
                }).on('error', streamErrorHandler).on('end', function() {                                              //
                  return http.response.end();                                                                          //
                }).pipe(http.response);                                                                                //
              }                                                                                                        //
              break;                                                                                                   // 1301
          }                                                                                                            // 1252
        });                                                                                                            //
      });                                                                                                              //
    } else {                                                                                                           //
      return this._404(http);                                                                                          // 1303
    }                                                                                                                  //
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 1306
  /*                                                                                                                   // 1306
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name link                                                                                                           //
  @param {Object}   fileRef - File reference object                                                                    //
  @param {String}   version - [Optional] Version of file you would like to request                                     //
  @param {Boolean}  pub     - [Optional] is file located in publicity available folder?                                //
  @description Returns URL to file                                                                                     //
  @returns {String} Empty string returned in case if file not found in DB                                              //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.link = function(fileRef, version, pub) {                                                             // 101
    if (version == null) {                                                                                             //
      version = 'original';                                                                                            //
    }                                                                                                                  //
    if (pub == null) {                                                                                                 //
      pub = false;                                                                                                     //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  // 1318
      console.info('[Meteor.Files] [link()]');                                                                         // 1318
    }                                                                                                                  //
    if (_.isString(fileRef)) {                                                                                         // 1319
      version = fileRef;                                                                                               // 1320
      fileRef = null;                                                                                                  // 1320
    }                                                                                                                  //
    if (!fileRef && !this.currentFile) {                                                                               // 1322
      return '';                                                                                                       // 1322
    }                                                                                                                  //
    return formatFleURL(fileRef || this.currentFile, version, this["public"]);                                         // 1323
  };                                                                                                                   //
                                                                                                                       //
  return Files;                                                                                                        //
                                                                                                                       //
})();                                                                                                                  //
                                                                                                                       //
                                                                                                                       // 1325
/*                                                                                                                     // 1325
@isomorphic                                                                                                            //
@private                                                                                                               //
@function                                                                                                              //
@name formatFleURL                                                                                                     //
@param {Object} fileRef - File reference object                                                                        //
@param {String} version - [Optional] Version of file you would like build URL for                                      //
@param {Boolean}  pub   - [Optional] is file located in publicity available folder?                                    //
@description Returns formatted URL for file                                                                            //
@returns {String}                                                                                                      //
 */                                                                                                                    //
                                                                                                                       //
formatFleURL = function(fileRef, version, pub) {                                                                       // 1
  var ext, ref, root;                                                                                                  // 1337
  if (version == null) {                                                                                               //
    version = 'original';                                                                                              //
  }                                                                                                                    //
  if (pub == null) {                                                                                                   //
    pub = false;                                                                                                       //
  }                                                                                                                    //
  root = __meteor_runtime_config__.ROOT_URL.replace(/\/+$/, '');                                                       // 1337
  if ((fileRef != null ? (ref = fileRef.extension) != null ? ref.length : void 0 : void 0) > 0) {                      // 1339
    ext = '.' + fileRef.extension;                                                                                     // 1340
  } else {                                                                                                             //
    ext = '';                                                                                                          // 1342
  }                                                                                                                    //
  if (pub) {                                                                                                           // 1344
    return root + (fileRef._downloadRoute + "/" + version + "-" + fileRef._id + ext);                                  // 1345
  } else {                                                                                                             //
    return root + (fileRef._downloadRoute + "/" + fileRef._collectionName + "/" + fileRef._id + "/" + version + "/" + fileRef._id + ext);
  }                                                                                                                    //
};                                                                                                                     // 1336
                                                                                                                       //
if (Meteor.isClient) {                                                                                                 // 1349
                                                                                                                       // 1350
  /*                                                                                                                   // 1350
  @client                                                                                                              //
  @TemplateHelper                                                                                                      //
  @name fileURL                                                                                                        //
  @param {Object} fileRef - File reference object                                                                      //
  @param {String} version - [Optional] Version of file you would like to request                                       //
  @description Get download URL for file by fileRef, even without subscription                                         //
  @example {{fileURL fileRef}}                                                                                         //
  @returns {String}                                                                                                    //
   */                                                                                                                  //
  Template.registerHelper('fileURL', function(fileRef, version) {                                                      // 1350
    var ref;                                                                                                           // 1361
    if (!fileRef || !_.isObject(fileRef)) {                                                                            // 1361
      return void 0;                                                                                                   // 1361
    }                                                                                                                  //
    version = !version || !_.isString(version) ? 'original' : version;                                                 // 1361
    if (fileRef._id) {                                                                                                 // 1363
      return formatFleURL(fileRef, version, !!~((ref = fileRef._storagePath) != null ? typeof ref.indexOf === "function" ? ref.indexOf('../web.browser') : void 0 : void 0));
    } else {                                                                                                           //
      return '';                                                                                                       // 1366
    }                                                                                                                  //
  });                                                                                                                  //
}                                                                                                                      //
                                                                                                                       //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['ostrio:files'] = {};

})();

//# sourceMappingURL=ostrio_files.js.map
