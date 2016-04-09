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
var Fiber, Future, NOOP, Throttle, _insts, bound, cp, formatFleURL, fs, rcp, request, util;                            // 1
                                                                                                                       //
if (Meteor.isServer) {                                                                                                 // 1
                                                                                                                       // 2
  /*                                                                                                                   // 2
  @description Require "fs-extra" npm package                                                                          //
   */                                                                                                                  //
  fs = Npm.require('fs-extra');                                                                                        // 2
  request = Npm.require('request');                                                                                    // 2
  Throttle = Npm.require('throttle');                                                                                  // 2
  Fiber = Npm.require('Fibers');                                                                                       // 2
  Future = Npm.require('Fibers/Future');                                                                               // 2
  util = Npm.require('util');                                                                                          // 2
  NOOP = function() {};                                                                                                // 2
                                                                                                                       // 13
  /*                                                                                                                   // 13
  @var {object} bound - Meteor.bindEnvironment aka Fiber wrapper                                                       //
   */                                                                                                                  //
  bound = Meteor.bindEnvironment(function(callback) {                                                                  // 2
    return callback();                                                                                                 // 16
  });                                                                                                                  //
}                                                                                                                      //
                                                                                                                       //
                                                                                                                       // 18
/*                                                                                                                     // 18
@private                                                                                                               //
@object                                                                                                                //
@name _insts                                                                                                           //
@description Object of Meteor.Files instances                                                                          //
 */                                                                                                                    //
                                                                                                                       //
_insts = {};                                                                                                           // 1
                                                                                                                       //
                                                                                                                       // 26
/*                                                                                                                     // 26
@private                                                                                                               //
@function                                                                                                              //
@name rcp                                                                                                              //
@param {Object} obj - Initial object                                                                                   //
@description Create object with only needed props                                                                      //
 */                                                                                                                    //
                                                                                                                       //
rcp = function(obj) {                                                                                                  // 1
  var o;                                                                                                               // 34
  o = {                                                                                                                // 34
    currentFile: obj.currentFile,                                                                                      // 35
    search: obj.search,                                                                                                // 35
    storagePath: obj.storagePath,                                                                                      // 35
    collectionName: obj.collectionName,                                                                                // 35
    downloadRoute: obj.downloadRoute,                                                                                  // 35
    chunkSize: obj.chunkSize,                                                                                          // 35
    debug: obj.debug,                                                                                                  // 35
    _prefix: obj._prefix,                                                                                              // 35
    cacheControl: obj.cacheControl,                                                                                    // 35
    versions: obj.versions                                                                                             // 35
  };                                                                                                                   //
  return o;                                                                                                            // 45
};                                                                                                                     // 33
                                                                                                                       //
                                                                                                                       // 47
/*                                                                                                                     // 47
@private                                                                                                               //
@function                                                                                                              //
@name cp                                                                                                               //
@param {Object} to   - Destanation                                                                                     //
@param {Object} from - Source                                                                                          //
@description Copy-Paste only needed props from one to another object                                                   //
 */                                                                                                                    //
                                                                                                                       //
cp = function(to, from) {                                                                                              // 1
  to.currentFile = from.currentFile;                                                                                   // 56
  to.search = from.search;                                                                                             // 56
  to.storagePath = from.storagePath;                                                                                   // 56
  to.collectionName = from.collectionName;                                                                             // 56
  to.downloadRoute = from.downloadRoute;                                                                               // 56
  to.chunkSize = from.chunkSize;                                                                                       // 56
  to.debug = from.debug;                                                                                               // 56
  to._prefix = from._prefix;                                                                                           // 56
  to.cacheControl = from.cacheControl;                                                                                 // 56
  to.versions = from.versions;                                                                                         // 56
  return to;                                                                                                           // 66
};                                                                                                                     // 55
                                                                                                                       //
                                                                                                                       // 68
/*                                                                                                                     // 68
@isomorphic                                                                                                            //
@class                                                                                                                 //
@namespace Meteor                                                                                                      //
@name Files                                                                                                            //
@param config           {Object}   - Configuration object with next properties:                                        //
@param config.debug     {Boolean}  - Turn on/of debugging and extra logging                                            //
@param config.schema    {Object}   - Collection Schema                                                                 //
@param config.public    {Boolean}  - Store files in folder accessible for proxy servers, for limits, and more - read docs
@param config.strict    {Boolean}  - Strict mode for partial content, if is `true` server will return `416` response code, when `range` is not specified, otherwise server return `206`
@param config.protected {Function} - If `true` - files will be served only to authorized users, if `function()` - you're able to check visitor's permissions in your own way function's context has:
  - `request` - On server only                                                                                         //
  - `response` - On server only                                                                                        //
  - `user()`                                                                                                           //
  - `userId`                                                                                                           //
@param config.chunkSize      {Number}  - Upload chunk size, default: 524288 bytes (0,5 Mb)                             //
@param config.permissions    {Number}  - Permissions which will be set to uploaded files, like: `511` or `0o755`       //
@param config.storagePath    {String}  - Storage path on file system                                                   //
@param config.cacheControl   {String}  - Default `Cache-Control` header                                                //
@param config.throttle       {Number}  - bps throttle threshold                                                        //
@param config.downloadRoute  {String}  - Server Route used to retrieve files                                           //
@param config.collectionName {String}  - Collection name                                                               //
@param config.namingFunction {Function}- Function which returns `String`                                               //
@param config.integrityCheck {Boolean} - Check file's integrity before serving to users                                //
@param config.onBeforeUpload {Function}- Function which executes on server after receiving each chunk and on client right before beginning upload. Function context is `File` - so you are able to check for extension, mime-type, size and etc.
return `true` to continue                                                                                              //
return `false` or `String` to abort upload                                                                             //
@param config.allowClientCode  {Boolean}  - Allow to run `remove` from client                                          //
@param config.downloadCallback {Function} - Callback triggered each time file is requested, return truthy value to continue download, or falsy to abort
@param config.onbeforeunloadMessage {String|Function} - Message shown to user when closing browser's window or tab while upload process is running
@description Create new instance of Meteor.Files                                                                       //
 */                                                                                                                    //
                                                                                                                       //
Meteor.Files = (function() {                                                                                           // 1
  function Files(config) {                                                                                             // 101
    var _methods, cookie, self;                                                                                        // 102
    if (config) {                                                                                                      // 102
      this.storagePath = config.storagePath, this.collectionName = config.collectionName, this.downloadRoute = config.downloadRoute, this.schema = config.schema, this.chunkSize = config.chunkSize, this.namingFunction = config.namingFunction, this.debug = config.debug, this.onbeforeunloadMessage = config.onbeforeunloadMessage, this.permissions = config.permissions, this.allowClientCode = config.allowClientCode, this.onBeforeUpload = config.onBeforeUpload, this.integrityCheck = config.integrityCheck, this["protected"] = config["protected"], this["public"] = config["public"], this.strict = config.strict, this.downloadCallback = config.downloadCallback, this.cacheControl = config.cacheControl, this.throttle = config.throttle;
    }                                                                                                                  //
    self = this;                                                                                                       // 102
    if (this.debug == null) {                                                                                          //
      this.debug = false;                                                                                              //
    }                                                                                                                  //
    if (this["public"] == null) {                                                                                      //
      this["public"] = false;                                                                                          //
    }                                                                                                                  //
    if (this.strict == null) {                                                                                         //
      this.strict = true;                                                                                              //
    }                                                                                                                  //
    if (this["protected"] == null) {                                                                                   //
      this["protected"] = false;                                                                                       //
    }                                                                                                                  //
    if (this.chunkSize == null) {                                                                                      //
      this.chunkSize = 1024 * 512;                                                                                     //
    }                                                                                                                  //
    this.chunkSize = Math.floor(this.chunkSize / 8) * 8;                                                               // 102
    if (this.permissions == null) {                                                                                    //
      this.permissions = 0x1ed;                                                                                        //
    }                                                                                                                  //
    if (this.cacheControl == null) {                                                                                   //
      this.cacheControl = 'public, max-age=31536000, s-maxage=31536000';                                               //
    }                                                                                                                  //
    if (this.collectionName == null) {                                                                                 //
      this.collectionName = 'MeteorUploadFiles';                                                                       //
    }                                                                                                                  //
    if (this.namingFunction == null) {                                                                                 //
      this.namingFunction = function() {                                                                               //
        return Random.id();                                                                                            //
      };                                                                                                               //
    }                                                                                                                  //
    if (this.integrityCheck == null) {                                                                                 //
      this.integrityCheck = true;                                                                                      //
    }                                                                                                                  //
    if (this.onBeforeUpload == null) {                                                                                 //
      this.onBeforeUpload = false;                                                                                     //
    }                                                                                                                  //
    if (this.allowClientCode == null) {                                                                                //
      this.allowClientCode = true;                                                                                     //
    }                                                                                                                  //
    if (this.downloadCallback == null) {                                                                               //
      this.downloadCallback = false;                                                                                   //
    }                                                                                                                  //
    if (this.onbeforeunloadMessage == null) {                                                                          //
      this.onbeforeunloadMessage = 'Upload in a progress... Do you want to abort?';                                    //
    }                                                                                                                  //
    if (this.throttle == null) {                                                                                       //
      this.throttle = false;                                                                                           //
    }                                                                                                                  //
    cookie = new Cookies();                                                                                            // 102
    if (this["protected"] && Meteor.isClient) {                                                                        // 123
      if (!cookie.has('meteor_login_token') && Meteor._localStorage.getItem('Meteor.loginToken')) {                    // 124
        cookie.set('meteor_login_token', Meteor._localStorage.getItem('Meteor.loginToken'), null, '/');                // 125
      }                                                                                                                //
    }                                                                                                                  //
    if (!this.storagePath) {                                                                                           // 127
      this.storagePath = this["public"] ? "../web.browser/app/uploads/" + this.collectionName : "assets/app/uploads/" + this.collectionName;
      this.downloadRoute = this["public"] ? "/uploads/" + this.collectionName : !this.downloadRoute ? '/cdn/storage' : void 0;
    }                                                                                                                  //
    if (!this.downloadRoute) {                                                                                         // 131
      this.downloadRoute = '/cdn/storage';                                                                             // 132
    }                                                                                                                  //
    if (!this.schema) {                                                                                                // 135
      this.schema = {                                                                                                  // 136
        size: {                                                                                                        // 137
          type: Number                                                                                                 // 137
        },                                                                                                             //
        name: {                                                                                                        // 137
          type: String                                                                                                 // 138
        },                                                                                                             //
        type: {                                                                                                        // 137
          type: String                                                                                                 // 139
        },                                                                                                             //
        path: {                                                                                                        // 137
          type: String                                                                                                 // 140
        },                                                                                                             //
        isVideo: {                                                                                                     // 137
          type: Boolean                                                                                                // 141
        },                                                                                                             //
        isAudio: {                                                                                                     // 137
          type: Boolean                                                                                                // 142
        },                                                                                                             //
        isImage: {                                                                                                     // 137
          type: Boolean                                                                                                // 143
        },                                                                                                             //
        _prefix: {                                                                                                     // 137
          type: String                                                                                                 // 144
        },                                                                                                             //
        extension: {                                                                                                   // 137
          type: String,                                                                                                // 146
          optional: true                                                                                               // 146
        },                                                                                                             //
        _storagePath: {                                                                                                // 137
          type: String                                                                                                 // 148
        },                                                                                                             //
        _downloadRoute: {                                                                                              // 137
          type: String                                                                                                 // 149
        },                                                                                                             //
        _collectionName: {                                                                                             // 137
          type: String                                                                                                 // 150
        },                                                                                                             //
        meta: {                                                                                                        // 137
          type: Object,                                                                                                // 152
          blackbox: true,                                                                                              // 152
          optional: true                                                                                               // 152
        },                                                                                                             //
        userId: {                                                                                                      // 137
          type: String,                                                                                                // 156
          optional: true                                                                                               // 156
        },                                                                                                             //
        updatedAt: {                                                                                                   // 137
          type: Date,                                                                                                  // 159
          autoValue: function() {                                                                                      // 159
            return new Date();                                                                                         //
          }                                                                                                            //
        },                                                                                                             //
        versions: {                                                                                                    // 137
          type: Object,                                                                                                // 162
          blackbox: true                                                                                               // 162
        }                                                                                                              //
      };                                                                                                               //
    }                                                                                                                  //
    check(this.debug, Boolean);                                                                                        // 102
    check(this.schema, Object);                                                                                        // 102
    check(this["public"], Boolean);                                                                                    // 102
    check(this.strict, Boolean);                                                                                       // 102
    check(this.throttle, Match.OneOf(false, Number));                                                                  // 102
    check(this["protected"], Match.OneOf(Boolean, Function));                                                          // 102
    check(this.chunkSize, Number);                                                                                     // 102
    check(this.permissions, Number);                                                                                   // 102
    check(this.storagePath, String);                                                                                   // 102
    check(this.downloadRoute, String);                                                                                 // 102
    check(this.integrityCheck, Boolean);                                                                               // 102
    check(this.collectionName, String);                                                                                // 102
    check(this.namingFunction, Function);                                                                              // 102
    check(this.onBeforeUpload, Match.OneOf(Boolean, Function));                                                        // 102
    check(this.allowClientCode, Boolean);                                                                              // 102
    check(this.downloadCallback, Match.OneOf(Boolean, Function));                                                      // 102
    check(this.onbeforeunloadMessage, Match.OneOf(String, Function));                                                  // 102
    if (this["public"] && this["protected"]) {                                                                         // 183
      throw new Meteor.Error(500, "[Meteor.File." + this.collectionName + "]: Files can not be public and protected at the same time!");
    }                                                                                                                  //
    this.cursor = null;                                                                                                // 102
    this.search = {};                                                                                                  // 102
    this.collection = new Mongo.Collection(this.collectionName);                                                       // 102
    this.currentFile = null;                                                                                           // 102
    this.storagePath = this.storagePath.replace(/\/$/, '');                                                            // 102
    this.downloadRoute = this.downloadRoute.replace(/\/$/, '');                                                        // 102
    this.collection.attachSchema(this.schema);                                                                         // 102
    this.collection.deny({                                                                                             // 102
      insert: function() {                                                                                             // 195
        return true;                                                                                                   //
      },                                                                                                               //
      update: function() {                                                                                             // 195
        return true;                                                                                                   //
      },                                                                                                               //
      remove: function() {                                                                                             // 195
        return true;                                                                                                   //
      }                                                                                                                //
    });                                                                                                                //
    this._prefix = SHA256(this.collectionName + this.storagePath + this.downloadRoute);                                // 102
    _insts[this._prefix] = this;                                                                                       // 102
    this.checkAccess = function(http) {                                                                                // 102
      var rc, result, text, user, userFuncs, userId;                                                                   // 203
      if (self["protected"]) {                                                                                         // 203
        user = false;                                                                                                  // 204
        userFuncs = self.getUser(http);                                                                                // 204
        user = userFuncs.user, userId = userFuncs.userId;                                                              // 204
        user = user();                                                                                                 // 204
        if (_.isFunction(self["protected"])) {                                                                         // 209
          result = http ? self["protected"].call(_.extend(http, userFuncs), self.currentFile || null) : self["protected"].call(userFuncs, self.currentFile || null);
        } else {                                                                                                       //
          result = !!user;                                                                                             // 212
        }                                                                                                              //
        if ((http && result === true) || !http) {                                                                      // 214
          return true;                                                                                                 // 215
        } else {                                                                                                       //
          rc = _.isNumber(result) ? result : 401;                                                                      // 217
          if (self.debug) {                                                                                            // 218
            console.warn('Access denied!');                                                                            // 218
          }                                                                                                            //
          if (http) {                                                                                                  // 219
            text = 'Access denied!';                                                                                   // 220
            http.response.writeHead(rc, {                                                                              // 220
              'Content-Length': text.length,                                                                           // 222
              'Content-Type': 'text/plain'                                                                             // 222
            });                                                                                                        //
            http.response.end(text);                                                                                   // 220
          }                                                                                                            //
          return false;                                                                                                // 225
        }                                                                                                              //
      } else {                                                                                                         //
        return true;                                                                                                   // 227
      }                                                                                                                //
    };                                                                                                                 //
    this.methodNames = {                                                                                               // 102
      MeteorFileAbort: "MeteorFileAbort" + this._prefix,                                                               // 230
      MeteorFileWrite: "MeteorFileWrite" + this._prefix,                                                               // 230
      MeteorFileUnlink: "MeteorFileUnlink" + this._prefix                                                              // 230
    };                                                                                                                 //
    if (Meteor.isServer) {                                                                                             // 234
      WebApp.connectHandlers.use(function(request, response, next) {                                                   // 235
        var http, params, uri, uris, version;                                                                          // 236
        if (!self["public"]) {                                                                                         // 236
          if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName)) {                    // 237
            uri = request._parsedUrl.path.replace(self.downloadRoute + "/" + self.collectionName, '');                 // 238
            if (uri.indexOf('/') === 0) {                                                                              // 239
              uri = uri.substring(1);                                                                                  // 240
            }                                                                                                          //
            uris = uri.split('/');                                                                                     // 238
            if (uris.length === 3) {                                                                                   // 243
              params = {                                                                                               // 244
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                _id: uris[0],                                                                                          // 245
                version: uris[1],                                                                                      // 245
                name: uris[2]                                                                                          // 245
              };                                                                                                       //
              http = {                                                                                                 // 244
                request: request,                                                                                      // 249
                response: response,                                                                                    // 249
                params: params                                                                                         // 249
              };                                                                                                       //
              if (self.checkAccess(http)) {                                                                            // 250
                return self.findOne(uris[0]).download.call(self, http, uris[1]);                                       //
              }                                                                                                        //
            } else {                                                                                                   //
              return next();                                                                                           //
            }                                                                                                          //
          } else {                                                                                                     //
            return next();                                                                                             //
          }                                                                                                            //
        } else {                                                                                                       //
          if (!!~request._parsedUrl.path.indexOf("" + self.downloadRoute)) {                                           // 256
            uri = request._parsedUrl.path.replace("" + self.downloadRoute, '');                                        // 257
            if (uri.indexOf('/') === 0) {                                                                              // 258
              uri = uri.substring(1);                                                                                  // 259
            }                                                                                                          //
            uris = uri.split('/');                                                                                     // 257
            if (uris.length === 1) {                                                                                   // 262
              params = {                                                                                               // 263
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                file: uris[0]                                                                                          // 264
              };                                                                                                       //
              http = {                                                                                                 // 263
                request: request,                                                                                      // 266
                response: response,                                                                                    // 266
                params: params                                                                                         // 266
              };                                                                                                       //
              if (!!~params.file.indexOf('-')) {                                                                       // 268
                version = params.file.split('-')[0];                                                                   // 269
                return self.download.call(self, http, version);                                                        //
              } else {                                                                                                 //
                response.writeHead(404);                                                                               // 272
                return response.end('No such file :(');                                                                //
              }                                                                                                        //
            } else {                                                                                                   //
              return next();                                                                                           //
            }                                                                                                          //
          } else {                                                                                                     //
            return next();                                                                                             //
          }                                                                                                            //
        }                                                                                                              //
      });                                                                                                              //
      _methods = {};                                                                                                   // 235
      _methods[self.methodNames.MeteorFileUnlink] = function(inst) {                                                   // 235
        check(inst, Object);                                                                                           // 281
        if (self.debug) {                                                                                              // 282
          console.info('Meteor.Files Debugger: [MeteorFileUnlink]');                                                   // 282
        }                                                                                                              //
        if (self.allowClientCode) {                                                                                    // 283
          return self.remove.call(cp(_insts[inst._prefix], inst), inst.search);                                        //
        } else {                                                                                                       //
          throw new Meteor.Error(401, '[Meteor.Files] [remove()] Run code from client is not allowed!');               // 286
        }                                                                                                              //
      };                                                                                                               //
      _methods[self.methodNames.MeteorFileWrite] = function(opts) {                                                    // 235
        var extension, extensionWithDot, fileName, fut, isUploadAllowed, path, pathName, pathPart, ref, result;        // 289
        this.unblock();                                                                                                // 289
        check(opts, {                                                                                                  // 289
          meta: Object,                                                                                                // 290
          file: Object,                                                                                                // 290
          fileId: String,                                                                                              // 290
          binData: String,                                                                                             // 290
          chunkId: Number,                                                                                             // 290
          fileLength: Number,                                                                                          // 290
          _binSize: Number,                                                                                            // 290
          eof: Boolean                                                                                                 // 290
        });                                                                                                            //
        if (self.debug) {                                                                                              // 301
          console.info("Meteor.Files Debugger: [MeteorFileWrite] {name: " + opts.fileId + ", meta:" + opts.meta + "}");
        }                                                                                                              //
        if (self.debug) {                                                                                              // 302
          console.info("Meteor.Files Debugger: Received chunk #" + opts.chunkId + " of " + opts.fileLength + " chunks, file: " + (opts.file.name || opts.file.fileName));
        }                                                                                                              //
        if (self.onBeforeUpload && _.isFunction(self.onBeforeUpload)) {                                                // 304
          isUploadAllowed = self.onBeforeUpload.call({                                                                 // 305
            file: opts.file                                                                                            // 305
          }, opts.file);                                                                                               //
          if (isUploadAllowed !== true) {                                                                              // 306
            throw new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : '@onBeforeUpload() returned false');
          }                                                                                                            //
        }                                                                                                              //
        fileName = self.getFileName(opts.file);                                                                        // 289
        ref = self.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;               // 289
        pathName = self["public"] ? self.storagePath + "/original-" + opts.fileId : self.storagePath + "/" + opts.fileId;
        path = self["public"] ? self.storagePath + "/original-" + opts.fileId + extensionWithDot : self.storagePath + "/" + opts.fileId + extensionWithDot;
        pathPart = opts.fileLength > 1 ? pathName + "_" + opts.chunkId + extensionWithDot : path;                      // 289
        result = _.extend(self.dataToSchema(_.extend(opts.file, {                                                      // 289
          path: path,                                                                                                  // 316
          extension: extension,                                                                                        // 316
          name: fileName,                                                                                              // 316
          meta: opts.meta                                                                                              // 316
        })), {                                                                                                         //
          _id: opts.fileId,                                                                                            // 316
          chunkId: opts.chunkId,                                                                                       // 316
          _binSize: opts._binSize                                                                                      // 316
        });                                                                                                            //
        if (opts.eof) {                                                                                                // 318
          fut = new Future();                                                                                          // 319
        }                                                                                                              //
        Fiber(function() {                                                                                             // 289
          var binary, cb, concatChunks, e, finish, handleError, tries;                                                 // 322
          binary = new Buffer(opts.binData, 'base64');                                                                 // 322
          tries = 0;                                                                                                   // 322
          handleError = function(e) {                                                                                  // 322
            var error;                                                                                                 // 325
            error = new Meteor.Error(500, 'Unfinished upload (probably caused by server reboot or aborted operation)', e);
            console.error(error);                                                                                      // 325
            return error;                                                                                              // 327
          };                                                                                                           //
          concatChunks = function(num, files) {                                                                        // 322
            var _path, _source, findex, sindex;                                                                        // 330
            sindex = files.indexOf(opts.fileId + "_1" + extensionWithDot);                                             // 330
            if (!!~sindex) {                                                                                           // 331
              files.splice(sindex, 1);                                                                                 // 331
            }                                                                                                          //
            findex = files.indexOf(opts.fileId + "_" + num + extensionWithDot);                                        // 330
            if (!!~findex) {                                                                                           // 333
              files.splice(findex, 1);                                                                                 // 334
            } else {                                                                                                   //
              console.warn("finish as no more files", files, {                                                         // 336
                sindex: sindex,                                                                                        // 336
                findex: findex                                                                                         // 336
              }, opts.fileId + "_" + num + extensionWithDot);                                                          //
              return finish();                                                                                         // 337
            }                                                                                                          //
            _path = pathName + "_" + num + extensionWithDot;                                                           // 330
            _source = pathName + '_1' + extensionWithDot;                                                              // 330
            return fs.stat(_path, function(error, stats) {                                                             //
              return bound(function() {                                                                                //
                if (error || !stats.isFile()) {                                                                        // 343
                  if (tries >= 10) {                                                                                   // 344
                    return fut["return"](new Meteor.Error(500, "Chunk #" + num + " is missing!"));                     //
                  } else {                                                                                             //
                    tries++;                                                                                           // 347
                    return Meteor.setTimeout(function() {                                                              //
                      return concatChunks(num, files);                                                                 //
                    }, 100);                                                                                           //
                  }                                                                                                    //
                } else {                                                                                               //
                  return fs.readFile(_path, function(error, _chunkData) {                                              //
                    return bound(function() {                                                                          //
                      if (error) {                                                                                     // 353
                        return fut["return"](new Meteor.Error(500, "Can't read " + _path));                            //
                      } else {                                                                                         //
                        return fs.appendFile(_source, _chunkData, function(error) {                                    //
                          return bound(function() {                                                                    //
                            if (error) {                                                                               // 357
                              return fut["return"](new Meteor.Error(500, "Can't append " + _path + " to " + _source));
                            } else {                                                                                   //
                              fs.unlink(_path, NOOP);                                                                  // 360
                              if (files.length <= 0) {                                                                 // 361
                                return fs.rename(_source, path, function(error) {                                      //
                                  return bound(function() {                                                            //
                                    if (error) {                                                                       // 363
                                      return fut["return"](new Meteor.Error(500, "Can't rename " + _source + " to " + path));
                                    } else {                                                                           //
                                      return finish();                                                                 //
                                    }                                                                                  //
                                  });                                                                                  //
                                });                                                                                    //
                              } else {                                                                                 //
                                return concatChunks(++num, files);                                                     //
                              }                                                                                        //
                            }                                                                                          //
                          });                                                                                          //
                        });                                                                                            //
                      }                                                                                                //
                    });                                                                                                //
                  });                                                                                                  //
                }                                                                                                      //
              });                                                                                                      //
            });                                                                                                        //
          };                                                                                                           //
          finish = function() {                                                                                        // 322
            fs.chmod(path, self.permissions, NOOP);                                                                    // 371
            result.type = self.getMimeType(opts.file);                                                                 // 371
            return self.collection.insert(_.clone(result), function(error, _id) {                                      //
              if (error) {                                                                                             // 375
                return fut["return"](new Meteor.Error(500, error));                                                    //
              } else {                                                                                                 //
                result._id = _id;                                                                                      // 378
                if (self.debug) {                                                                                      // 379
                  console.info("Meteor.Files Debugger: The file " + fileName + " (binary) was saved to " + path);      // 379
                }                                                                                                      //
                return fut["return"](result);                                                                          //
              }                                                                                                        //
            });                                                                                                        //
          };                                                                                                           //
          cb = function(error) {                                                                                       // 322
            return bound(function() {                                                                                  //
              if (error) {                                                                                             // 382
                return handleError(error);                                                                             //
              }                                                                                                        //
            });                                                                                                        //
          };                                                                                                           //
          try {                                                                                                        // 384
            if (opts.eof) {                                                                                            // 385
              if (opts.fileLength > 1) {                                                                               // 386
                return fs.readdir(self.storagePath, function(error, files) {                                           //
                  return bound(function() {                                                                            //
                    if (error) {                                                                                       // 388
                      return fut["return"](new Meteor.Error(500, error));                                              //
                    } else {                                                                                           //
                      return concatChunks(2, files.filter(function(f) {                                                //
                        return !!~f.indexOf(opts.fileId);                                                              //
                      }));                                                                                             //
                    }                                                                                                  //
                  });                                                                                                  //
                });                                                                                                    //
              } else {                                                                                                 //
                return finish();                                                                                       //
              }                                                                                                        //
            } else {                                                                                                   //
              return fs.outputFile(pathPart, binary, 'binary', cb);                                                    //
            }                                                                                                          //
          } catch (_error) {                                                                                           //
            e = _error;                                                                                                // 397
            return handleError(e);                                                                                     //
          }                                                                                                            //
        }).run();                                                                                                      //
        if (opts.eof) {                                                                                                // 400
          result = fut.wait();                                                                                         // 401
          if (result.error) {                                                                                          // 402
            throw result;                                                                                              // 403
            return false;                                                                                              // 404
          } else {                                                                                                     //
            return result;                                                                                             // 406
          }                                                                                                            //
        } else {                                                                                                       //
          return result;                                                                                               // 408
        }                                                                                                              //
      };                                                                                                               //
      _methods[self.methodNames.MeteorFileAbort] = function(opts) {                                                    // 235
        var _path, ext, i, path, results;                                                                              // 411
        check(opts, {                                                                                                  // 411
          fileId: String,                                                                                              // 411
          fileData: Object,                                                                                            // 411
          fileLength: Number                                                                                           // 411
        });                                                                                                            //
        ext = "." + opts.fileData.ext;                                                                                 // 411
        path = self["public"] ? self.storagePath + "/original-" + opts.fileId : self.storagePath + "/" + opts.fileId;  // 411
        if (self.debug) {                                                                                              // 420
          console.info("Meteor.Files Debugger: Abort for " + path);                                                    // 420
        }                                                                                                              //
        if (opts.fileLength > 1) {                                                                                     // 421
          i = 0;                                                                                                       // 422
          results = [];                                                                                                // 423
          while (i <= opts.fileLength) {                                                                               //
            _path = path + "_" + i + ext;                                                                              // 424
            fs.stat(_path, (function(error, stats) {                                                                   // 424
              return bound((function(_this) {                                                                          //
                return function() {                                                                                    //
                  if (!error && stats.isFile()) {                                                                      // 426
                    return fs.unlink(_this._path, NOOP);                                                               //
                  }                                                                                                    //
                };                                                                                                     //
              })(this));                                                                                               //
            }).bind({                                                                                                  //
              _path: _path                                                                                             // 428
            }));                                                                                                       //
            results.push(i++);                                                                                         // 424
          }                                                                                                            //
          return results;                                                                                              //
        }                                                                                                              //
      };                                                                                                               //
      Meteor.methods(_methods);                                                                                        // 235
    }                                                                                                                  //
  }                                                                                                                    //
                                                                                                                       //
                                                                                                                       // 433
  /*                                                                                                                   // 433
  Extend Meteor.Files with mime library                                                                                //
  @url https://github.com/broofa/node-mime                                                                             //
  @description Temporary removed from package due to unstability                                                       //
   */                                                                                                                  //
                                                                                                                       //
                                                                                                                       // 440
  /*                                                                                                                   // 440
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
    var mime;                                                                                                          // 450
    check(fileData, Object);                                                                                           // 450
    if (fileData != null ? fileData.type : void 0) {                                                                   // 451
      mime = fileData.type;                                                                                            // 451
    }                                                                                                                  //
    if (!mime || !_.isString(mime)) {                                                                                  // 452
      mime = 'application/octet-stream';                                                                               // 452
    }                                                                                                                  //
    return mime;                                                                                                       //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 455
  /*                                                                                                                   // 455
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
    var cleanName, fileName;                                                                                           // 465
    fileName = fileData.name || fileData.fileName;                                                                     // 465
    if (_.isString(fileName) && fileName.length > 0) {                                                                 // 466
      cleanName = function(str) {                                                                                      // 467
        return str.replace(/\.\./g, '').replace(/\//g, '');                                                            //
      };                                                                                                               //
      return cleanName(fileData.name || fileData.fileName);                                                            // 468
    } else {                                                                                                           //
      return '';                                                                                                       // 470
    }                                                                                                                  //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 472
  /*                                                                                                                   // 472
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name getUser                                                                                                        //
  @description Returns object with `userId` and `user()` method which return user's object                             //
  @returns {Object}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.getUser = function(http) {                                                                           // 101
    var cookie, result, user;                                                                                          // 481
    result = {                                                                                                         // 481
      user: function() {                                                                                               // 482
        return null;                                                                                                   // 482
      },                                                                                                               //
      userId: null                                                                                                     // 482
    };                                                                                                                 //
    if (Meteor.isServer) {                                                                                             // 485
      if (http) {                                                                                                      // 486
        cookie = http.request.Cookies;                                                                                 // 487
        if (_.has(Package, 'accounts-base') && cookie.has('meteor_login_token')) {                                     // 488
          user = Meteor.users.findOne({                                                                                // 489
            'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(cookie.get('meteor_login_token'))      // 489
          });                                                                                                          //
          if (user) {                                                                                                  // 490
            result.user = function() {                                                                                 // 491
              return user;                                                                                             // 491
            };                                                                                                         //
            result.userId = user._id;                                                                                  // 491
          }                                                                                                            //
        }                                                                                                              //
      }                                                                                                                //
    } else {                                                                                                           //
      if (_.has(Package, 'accounts-base') && Meteor.userId()) {                                                        // 494
        result.user = function() {                                                                                     // 495
          return Meteor.user();                                                                                        // 495
        };                                                                                                             //
        result.userId = Meteor.userId();                                                                               // 495
      }                                                                                                                //
    }                                                                                                                  //
    return result;                                                                                                     // 498
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 500
  /*                                                                                                                   // 500
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
    var extension;                                                                                                     // 510
    if (!!~fileName.indexOf('.')) {                                                                                    // 510
      extension = fileName.split('.').pop();                                                                           // 511
      return {                                                                                                         // 512
        ext: extension,                                                                                                // 512
        extension: extension,                                                                                          // 512
        extensionWithDot: '.' + extension                                                                              // 512
      };                                                                                                               //
    } else {                                                                                                           //
      return {                                                                                                         // 514
        ext: '',                                                                                                       // 514
        extension: '',                                                                                                 // 514
        extensionWithDot: ''                                                                                           // 514
      };                                                                                                               //
    }                                                                                                                  //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 516
  /*                                                                                                                   // 516
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
    return {                                                                                                           // 526
      name: data.name,                                                                                                 // 526
      extension: data.extension,                                                                                       // 526
      path: data.path,                                                                                                 // 526
      meta: data.meta,                                                                                                 // 526
      type: data.type,                                                                                                 // 526
      size: data.size,                                                                                                 // 526
      versions: {                                                                                                      // 526
        original: {                                                                                                    // 534
          path: data.path,                                                                                             // 535
          size: data.size,                                                                                             // 535
          type: data.type,                                                                                             // 535
          extension: data.extension                                                                                    // 535
        }                                                                                                              //
      },                                                                                                               //
      isVideo: !!~data.type.toLowerCase().indexOf('video'),                                                            // 526
      isAudio: !!~data.type.toLowerCase().indexOf('audio'),                                                            // 526
      isImage: !!~data.type.toLowerCase().indexOf('image'),                                                            // 526
      _prefix: data._prefix || this._prefix,                                                                           // 526
      _storagePath: data._storagePath || this.storagePath,                                                             // 526
      _downloadRoute: data._downloadRoute || this.downloadRoute,                                                       // 526
      _collectionName: data._collectionName || this.collectionName                                                     // 526
    };                                                                                                                 //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 548
  /*                                                                                                                   // 548
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
    if (search && _.isString(search)) {                                                                                // 558
      this.search = {                                                                                                  // 559
        _id: search                                                                                                    // 560
      };                                                                                                               //
    } else {                                                                                                           //
      this.search = search;                                                                                            // 562
    }                                                                                                                  //
    return this.search;                                                                                                //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 565
  /*                                                                                                                   // 565
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
    var extension, extensionWithDot, fileName, path, randFileName, ref, result;                                        // 577
    if (opts == null) {                                                                                                //
      opts = {};                                                                                                       //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  // 577
      console.info("Meteor.Files Debugger: [write(buffer, " + (JSON.stringify(opts)) + ", callback)]");                // 577
    }                                                                                                                  //
    check(opts, Match.Optional(Object));                                                                               // 577
    check(callback, Match.Optional(Function));                                                                         // 577
    if (this.checkAccess()) {                                                                                          // 581
      randFileName = this.namingFunction();                                                                            // 582
      fileName = opts.name || opts.fileName ? opts.name || opts.fileName : randFileName;                               // 582
      ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                 // 582
      path = this["public"] ? this.storagePath + "/original-" + randFileName + extensionWithDot : this.storagePath + "/" + randFileName + extensionWithDot;
      opts.type = this.getMimeType(opts);                                                                              // 582
      if (!opts.meta) {                                                                                                // 590
        opts.meta = {};                                                                                                // 590
      }                                                                                                                //
      if (!opts.size) {                                                                                                // 591
        opts.size = buffer.length;                                                                                     // 591
      }                                                                                                                //
      result = this.dataToSchema({                                                                                     // 582
        name: fileName,                                                                                                // 594
        path: path,                                                                                                    // 594
        meta: opts.meta,                                                                                               // 594
        type: opts.type,                                                                                               // 594
        size: opts.size,                                                                                               // 594
        extension: extension                                                                                           // 594
      });                                                                                                              //
      if (this.debug) {                                                                                                // 601
        console.info("Meteor.Files Debugger: The file " + fileName + " (binary) was added to " + this.collectionName);
      }                                                                                                                //
      fs.outputFile(path, buffer, 'binary', function(error) {                                                          // 582
        return bound(function() {                                                                                      //
          if (error) {                                                                                                 // 604
            return callback && callback(error);                                                                        //
          } else {                                                                                                     //
            result._id = this.collection.insert(_.clone(result));                                                      // 607
            return callback && callback(null, result);                                                                 //
          }                                                                                                            //
        });                                                                                                            //
      });                                                                                                              //
      return this;                                                                                                     // 610
    }                                                                                                                  //
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 614
  /*                                                                                                                   // 614
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
    var extension, extensionWithDot, fileName, path, randFileName, ref, self;                                          // 626
    if (opts == null) {                                                                                                //
      opts = {};                                                                                                       //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  // 626
      console.info("Meteor.Files Debugger: [load(" + url + ", " + (JSON.stringify(opts)) + ", callback)]");            // 626
    }                                                                                                                  //
    check(url, String);                                                                                                // 626
    check(opts, Match.Optional(Object));                                                                               // 626
    check(callback, Match.Optional(Function));                                                                         // 626
    self = this;                                                                                                       // 626
    randFileName = this.namingFunction();                                                                              // 626
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : randFileName;                                 // 626
    ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                   // 626
    path = this["public"] ? this.storagePath + "/original-" + randFileName + extensionWithDot : this.storagePath + "/" + randFileName + extensionWithDot;
    if (!opts.meta) {                                                                                                  // 637
      opts.meta = {};                                                                                                  // 637
    }                                                                                                                  //
    request.get(url).on('error', function(error) {                                                                     // 626
      return bound(function() {                                                                                        //
        throw new Meteor.Error(500, ("Error on [load(" + url + ", " + opts + ")]; Error:") + JSON.stringify(error));   // 640
      });                                                                                                              //
    }).on('response', function(response) {                                                                             //
      return bound(function() {                                                                                        //
        var result;                                                                                                    // 643
        if (self.debug) {                                                                                              // 643
          console.info("Meteor.Files Debugger: The file " + url + " is received");                                     // 643
        }                                                                                                              //
        result = self.dataToSchema({                                                                                   // 643
          name: fileName,                                                                                              // 646
          path: path,                                                                                                  // 646
          meta: opts.meta,                                                                                             // 646
          type: opts.type || response.headers['content-type'],                                                         // 646
          size: opts.size || response.headers['content-length'],                                                       // 646
          extension: extension                                                                                         // 646
        });                                                                                                            //
        return self.collection.insert(_.clone(result), function(error, fileRef) {                                      //
          if (error) {                                                                                                 // 654
            if (self.debug) {                                                                                          // 655
              console.warn("Meteor.Files Debugger: Can't add file " + fileName + " (binary) to " + self.collectionName);
            }                                                                                                          //
            return callback && callback(error);                                                                        //
          } else {                                                                                                     //
            if (self.debug) {                                                                                          // 658
              console.info("Meteor.Files Debugger: The file " + fileName + " (binary) was added to " + self.collectionName);
            }                                                                                                          //
            return callback && callback(null, fileRef);                                                                //
          }                                                                                                            //
        });                                                                                                            //
      });                                                                                                              //
    }).pipe(fs.createOutputStream(path));                                                                              //
    return this;                                                                                                       // 663
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 667
  /*                                                                                                                   // 667
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
    var self;                                                                                                          // 678
    if (opts == null) {                                                                                                //
      opts = {};                                                                                                       //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  // 678
      console.info("[addFile(" + path + ")]");                                                                         // 678
    }                                                                                                                  //
    if (this["public"]) {                                                                                              // 680
      throw new Meteor.Error(403, 'Can not run [addFile()] on public collection');                                     // 680
    }                                                                                                                  //
    check(path, String);                                                                                               // 678
    check(opts, Match.Optional(Object));                                                                               // 678
    check(callback, Match.Optional(Function));                                                                         // 678
    self = this;                                                                                                       // 678
    fs.stat(path, function(error, stats) {                                                                             // 678
      return bound(function() {                                                                                        //
        var _cn, extension, extensionWithDot, fileName, fileSize, fileStats, pathParts, ref, result;                   // 687
        if (error) {                                                                                                   // 687
          return callback && callback(error);                                                                          //
        } else if (stats.isFile()) {                                                                                   //
          fileStats = util.inspect(stats);                                                                             // 690
          fileSize = fileStats.size;                                                                                   // 690
          pathParts = path.split('/');                                                                                 // 690
          fileName = pathParts[pathParts.length - 1];                                                                  // 690
          ref = self.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;             // 690
          if (!opts.type) {                                                                                            // 697
            opts.type = 'application/*';                                                                               // 697
          }                                                                                                            //
          if (!opts.meta) {                                                                                            // 698
            opts.meta = {};                                                                                            // 698
          }                                                                                                            //
          if (!opts.size) {                                                                                            // 699
            opts.size = fileSize;                                                                                      // 699
          }                                                                                                            //
          result = self.dataToSchema({                                                                                 // 690
            name: fileName,                                                                                            // 702
            path: path,                                                                                                // 702
            meta: opts.meta,                                                                                           // 702
            type: opts.type,                                                                                           // 702
            size: opts.size,                                                                                           // 702
            extension: extension,                                                                                      // 702
            _storagePath: path.replace("/" + fileName, '')                                                             // 702
          });                                                                                                          //
          _cn = self.collectionName;                                                                                   // 690
          return self.collection.insert(_.clone(result), function(error, record) {                                     //
            if (error) {                                                                                               // 712
              if (self.debug) {                                                                                        // 713
                console.warn("Can't add file " + fileName + " (binary) to " + _cn);                                    // 713
              }                                                                                                        //
              return callback && callback(error);                                                                      //
            } else {                                                                                                   //
              if (self.debug) {                                                                                        // 716
                console.info("The file " + fileName + " (binary) was added to " + _cn);                                // 716
              }                                                                                                        //
              return callback && callback(null, result);                                                               //
            }                                                                                                          //
          });                                                                                                          //
        } else {                                                                                                       //
          return callback && callback(new Meteor.Error(400, "[Files.addFile(" + path + ")]: File does not exist"));    //
        }                                                                                                              //
      });                                                                                                              //
    });                                                                                                                //
    return this;                                                                                                       // 721
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 725
  /*                                                                                                                   // 725
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
    if (this.debug) {                                                                                                  // 735
      console.info("Meteor.Files Debugger: [findOne(" + (JSON.stringify(search)) + ")]");                              // 735
    }                                                                                                                  //
    check(search, Match.OneOf(Object, String));                                                                        // 735
    this.srch(search);                                                                                                 // 735
    if (this.checkAccess()) {                                                                                          // 739
      this.currentFile = this.collection.findOne(this.search);                                                         // 740
      this.cursor = null;                                                                                              // 740
    }                                                                                                                  //
    return this;                                                                                                       // 742
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 744
  /*                                                                                                                   // 744
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
    if (this.debug) {                                                                                                  // 754
      console.info("Meteor.Files Debugger: [find(" + (JSON.stringify(search)) + ")]");                                 // 754
    }                                                                                                                  //
    check(search, Match.OneOf(Object, String));                                                                        // 754
    this.srch(search);                                                                                                 // 754
    if (this.checkAccess) {                                                                                            // 758
      this.currentFile = null;                                                                                         // 759
      this.cursor = this.collection.find(this.search);                                                                 // 759
    }                                                                                                                  //
    return this;                                                                                                       // 761
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 763
  /*                                                                                                                   // 763
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name get                                                                                                            //
  @description Return value of current cursor or file                                                                  //
  @returns {Object|[Object]}                                                                                           //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.get = function() {                                                                                   // 101
    if (this.debug) {                                                                                                  // 772
      console.info('Meteor.Files Debugger: [get()]');                                                                  // 772
    }                                                                                                                  //
    if (this.cursor) {                                                                                                 // 773
      return this.cursor.fetch();                                                                                      // 773
    }                                                                                                                  //
    return this.currentFile;                                                                                           // 774
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 776
  /*                                                                                                                   // 776
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name fetch                                                                                                          //
  @description Alias for `get()` method                                                                                //
  @returns {[Object]}                                                                                                  //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.fetch = function() {                                                                                 // 101
    var data;                                                                                                          // 785
    if (this.debug) {                                                                                                  // 785
      console.info('Meteor.Files Debugger: [fetch()]');                                                                // 785
    }                                                                                                                  //
    data = this.get();                                                                                                 // 785
    if (!_.isArray(data)) {                                                                                            // 787
      return [data];                                                                                                   // 788
    } else {                                                                                                           //
      return data;                                                                                                     //
    }                                                                                                                  //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 792
  /*                                                                                                                   // 792
  @client                                                                                                              //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name insert                                                                                                         //
  @param {Object} config - Configuration object with next properties:                                                  //
    {File|Object} file           - HTML5 `files` item, like in change event: `e.currentTarget.files[0]`                //
    {Object}      meta           - Additional data as object, use later for search                                     //
    {Number|dynamic} streams     - Quantity of parallel upload streams, default: 2                                     //
    {Number|dynamic} chunkSize   - Chunk size for upload                                                               //
    {Function}    onUploaded     - Callback triggered when upload is finished, with two arguments `error` and `fileRef`
    {Function}    onError        - Callback triggered on error in upload and/or FileReader, with two arguments `error` and `fileRef`
    {Function}    onProgress     - Callback triggered when chunk is sent, with only argument `progress`                //
    {Function}    onBeforeUpload - Callback triggered right before upload is started, with only `FileReader` argument:
        context is `File` - so you are able to check for extension, mime-type, size and etc.                           //
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
    var EOFsent, FileReadProgress, _binSize, beforeunload, binary, chunkSize, createStreams, currentChunk, end, file, fileData, fileId, fileLength, fileReader, isUploadAllowed, meta, onAbort, onBeforeUpload, onError, onProgress, onReady, onUploaded, readHandler, result, self, sendEOF, sentChunks, streams, upload;
    if (this.checkAccess()) {                                                                                          // 822
      if (this.debug) {                                                                                                // 823
        console.info('Meteor.Files Debugger: [insert()]');                                                             // 823
      }                                                                                                                //
      file = config.file, meta = config.meta, onUploaded = config.onUploaded, onProgress = config.onProgress, onBeforeUpload = config.onBeforeUpload, onAbort = config.onAbort, streams = config.streams, onError = config.onError, chunkSize = config.chunkSize, onReady = config.onReady, FileReadProgress = config.FileReadProgress;
      if (meta == null) {                                                                                              //
        meta = {};                                                                                                     //
      }                                                                                                                //
      if (streams == null) {                                                                                           //
        streams = 2;                                                                                                   //
      }                                                                                                                //
      if (chunkSize == null) {                                                                                         //
        chunkSize = this.chunkSize;                                                                                    //
      }                                                                                                                //
      check(meta, Match.Optional(Object));                                                                             // 823
      check(onAbort, Match.Optional(Function));                                                                        // 823
      check(streams, Match.OneOf('dynamic', Number));                                                                  // 823
      check(chunkSize, Match.OneOf('dynamic', Number));                                                                // 823
      check(onUploaded, Match.Optional(Function));                                                                     // 823
      check(onProgress, Match.Optional(Function));                                                                     // 823
      check(onBeforeUpload, Match.Optional(Function));                                                                 // 823
      check(onError, Match.Optional(Function));                                                                        // 823
      check(onReady, Match.Optional(Function));                                                                        // 823
      check(FileReadProgress, Match.Optional(Function));                                                               // 823
      if (file) {                                                                                                      // 840
        if (this.debug) {                                                                                              // 841
          console.time('insert');                                                                                      // 841
        }                                                                                                              //
        self = this;                                                                                                   // 841
        fileReader = new FileReader;                                                                                   // 841
        fileLength = 1;                                                                                                // 841
        fileId = this.namingFunction();                                                                                // 841
        fileData = {                                                                                                   // 841
          size: file.size,                                                                                             // 847
          type: file.type,                                                                                             // 847
          name: file.name                                                                                              // 847
        };                                                                                                             //
        fileData = _.extend(fileData, this.getExt(file.name), {                                                        // 841
          mime: this.getMimeType(fileData)                                                                             // 851
        });                                                                                                            //
        fileData['mime-type'] = fileData.mime;                                                                         // 841
        beforeunload = function(e) {                                                                                   // 841
          var message;                                                                                                 // 855
          message = _.isFunction(self.onbeforeunloadMessage) ? self.onbeforeunloadMessage.call(null) : self.onbeforeunloadMessage;
          if (e) {                                                                                                     // 856
            e.returnValue = message;                                                                                   // 856
          }                                                                                                            //
          return message;                                                                                              // 857
        };                                                                                                             //
        window.addEventListener('beforeunload', beforeunload, false);                                                  // 841
        result = {                                                                                                     // 841
          file: _.extend(file, fileData),                                                                              // 861
          onPause: new ReactiveVar(false),                                                                             // 861
          continueFunc: function() {},                                                                                 // 861
          pause: function() {                                                                                          // 861
            this.onPause.set(true);                                                                                    // 865
            return this.state.set('paused');                                                                           //
          },                                                                                                           //
          "continue": function() {                                                                                     // 861
            this.onPause.set(false);                                                                                   // 868
            this.state.set('active');                                                                                  // 868
            this.continueFunc.call();                                                                                  // 868
            return this.continueFunc = function() {};                                                                  //
          },                                                                                                           //
          toggle: function() {                                                                                         // 861
            if (this.onPause.get()) {                                                                                  // 873
              return this["continue"]();                                                                               //
            } else {                                                                                                   //
              return this.pause();                                                                                     //
            }                                                                                                          //
          },                                                                                                           //
          progress: new ReactiveVar(0),                                                                                // 861
          abort: function() {                                                                                          // 861
            window.removeEventListener('beforeunload', beforeunload, false);                                           // 876
            onAbort && onAbort.call(this, fileData);                                                                   // 876
            fileReader.abort();                                                                                        // 876
            this.pause();                                                                                              // 876
            this.state.set('aborted');                                                                                 // 876
            Meteor.call(self.methodNames.MeteorFileAbort, {                                                            // 876
              fileId: fileId,                                                                                          // 881
              fileLength: fileLength,                                                                                  // 881
              fileData: fileData                                                                                       // 881
            });                                                                                                        //
            return delete upload;                                                                                      //
          },                                                                                                           //
          state: new ReactiveVar('active'),                                                                            // 861
          readAsDataURL: function() {                                                                                  // 861
            return fileReader != null ? fileReader.result : void 0;                                                    //
          }                                                                                                            //
        };                                                                                                             //
        result.progress.set = _.throttle(result.progress.set, 250);                                                    // 841
        Tracker.autorun(function() {                                                                                   // 841
          if (Meteor.status().connected) {                                                                             // 889
            result["continue"]();                                                                                      // 890
            if (self.debug) {                                                                                          // 891
              return console.info('Meteor.Files Debugger: Connection established continue() upload');                  //
            }                                                                                                          //
          } else {                                                                                                     //
            result.pause();                                                                                            // 893
            if (self.debug) {                                                                                          // 894
              return console.info('Meteor.Files Debugger: Connection error set upload on pause()');                    //
            }                                                                                                          //
          }                                                                                                            //
        });                                                                                                            //
        end = function(error, data) {                                                                                  // 841
          if (self.debug) {                                                                                            // 897
            console.timeEnd('insert');                                                                                 // 897
          }                                                                                                            //
          window.removeEventListener('beforeunload', beforeunload, false);                                             // 897
          result.progress.set(0);                                                                                      // 897
          onUploaded && onUploaded.call(result, error, data);                                                          // 897
          if (error) {                                                                                                 // 901
            result.state.set('aborted');                                                                               // 902
            return onError && onError.call(result, error, fileData);                                                   //
          } else {                                                                                                     //
            return result.state.set('completed');                                                                      //
          }                                                                                                            //
        };                                                                                                             //
        if (onBeforeUpload && _.isFunction(onBeforeUpload)) {                                                          // 907
          isUploadAllowed = onBeforeUpload.call(result, fileData);                                                     // 908
          if (isUploadAllowed !== true) {                                                                              // 909
            end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'Files.onBeforeUpload() returned false'), null);
            return false;                                                                                              // 911
          }                                                                                                            //
        }                                                                                                              //
        if (this.onBeforeUpload && _.isFunction(this.onBeforeUpload)) {                                                // 913
          isUploadAllowed = this.onBeforeUpload.call(result, fileData);                                                // 914
          if (isUploadAllowed !== true) {                                                                              // 915
            end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'this.onBeforeUpload() returned false'), null);
            return false;                                                                                              // 917
          }                                                                                                            //
        }                                                                                                              //
        currentChunk = 0;                                                                                              // 841
        sentChunks = 0;                                                                                                // 841
        binary = '';                                                                                                   // 841
        _binSize = 0;                                                                                                  // 841
        EOFsent = false;                                                                                               // 841
        sendEOF = function(opts) {                                                                                     // 841
          if (!EOFsent) {                                                                                              // 926
            EOFsent = true;                                                                                            // 927
            return Meteor.setTimeout(function() {                                                                      //
              opts.binData = 'EOF';                                                                                    // 929
              opts.eof = true;                                                                                         // 929
              opts.chunkId = -1;                                                                                       // 929
              opts._binSize = -1;                                                                                      // 929
              return Meteor.call(self.methodNames.MeteorFileWrite, opts, end);                                         //
            }, 50);                                                                                                    //
          }                                                                                                            //
        };                                                                                                             //
        upload = function(fileLength) {                                                                                // 841
          var opts;                                                                                                    // 937
          opts = {                                                                                                     // 937
            meta: meta,                                                                                                // 938
            file: fileData,                                                                                            // 938
            fileId: fileId,                                                                                            // 938
            fileLength: fileLength,                                                                                    // 938
            eof: false                                                                                                 // 938
          };                                                                                                           //
          if (result.onPause.get()) {                                                                                  // 944
            result.continueFunc = function() {                                                                         // 945
              return upload(fileLength);                                                                               //
            };                                                                                                         //
            return;                                                                                                    // 946
          }                                                                                                            //
          if (_binSize > 0) {                                                                                          // 948
            opts.chunkId = ++currentChunk;                                                                             // 949
            opts.binData = binary.substring(0, chunkSize);                                                             // 949
            binary = binary.substring(chunkSize);                                                                      // 949
            _binSize = opts._binSize = _.clone(binary.length);                                                         // 949
            return Meteor.call(self.methodNames.MeteorFileWrite, opts, function(error, data) {                         //
              var progress;                                                                                            // 955
              ++sentChunks;                                                                                            // 955
              if (error) {                                                                                             // 956
                return end(error);                                                                                     //
              } else {                                                                                                 //
                progress = (data.chunkId / fileLength) * 100;                                                          // 959
                result.progress.set(Math.ceil(progress));                                                              // 959
                onProgress && onProgress.call(result, progress);                                                       // 959
                if (!result.onPause.get()) {                                                                           // 963
                  if (data._binSize <= 0) {                                                                            // 964
                    return sendEOF(opts);                                                                              //
                  } else {                                                                                             //
                    return upload(fileLength);                                                                         //
                  }                                                                                                    //
                } else {                                                                                               //
                  return result.continueFunc = function() {                                                            //
                    return upload(fileLength);                                                                         //
                  };                                                                                                   //
                }                                                                                                      //
              }                                                                                                        //
            });                                                                                                        //
          } else {                                                                                                     //
            return sendEOF(opts);                                                                                      //
          }                                                                                                            //
        };                                                                                                             //
        createStreams = function(fileLength) {                                                                         // 841
          var i;                                                                                                       // 974
          i = 1;                                                                                                       // 974
          while (i <= streams) {                                                                                       // 975
            Meteor.defer(function() {                                                                                  // 976
              return upload(fileLength);                                                                               //
            });                                                                                                        //
            i++;                                                                                                       // 976
          }                                                                                                            //
        };                                                                                                             //
        readHandler = function(chunk) {                                                                                // 841
          var _len, binSize, ref, ref1;                                                                                // 981
          binary = ((fileReader != null ? fileReader.result : void 0) || ((ref = chunk.srcElement) != null ? ref.result : void 0) || ((ref1 = chunk.target) != null ? ref1.result : void 0)).split(',')[1];
          if (binary && binary.length) {                                                                               // 982
            onReady && onReady.call(result, fileData);                                                                 // 983
            binSize = _.clone(binary.length);                                                                          // 983
            _binSize = _.clone(binary.length);                                                                         // 983
            if (chunkSize === 'dynamic') {                                                                             // 986
              if (binSize >= 2048 * streams) {                                                                         // 987
                chunkSize = Math.ceil(binSize / (8 * streams));                                                        // 988
              } else {                                                                                                 //
                chunkSize = self.chunkSize;                                                                            // 990
              }                                                                                                        //
            }                                                                                                          //
            if (streams === 'dynamic') {                                                                               // 991
              streams = Math.ceil(binSize / chunkSize);                                                                // 992
              if (streams > 32) {                                                                                      // 993
                streams = 32;                                                                                          // 994
              }                                                                                                        //
            }                                                                                                          //
            chunkSize = Math.floor(chunkSize / 8) * 8;                                                                 // 983
            _len = Math.ceil(binSize / chunkSize);                                                                     // 983
            fileLength = _len <= 0 ? 1 : _len;                                                                         // 983
            if (streams > fileLength) {                                                                                // 998
              streams = fileLength;                                                                                    // 999
            }                                                                                                          //
            return createStreams(fileLength);                                                                          //
          }                                                                                                            //
        };                                                                                                             //
        if (FileReadProgress) {                                                                                        // 1002
          fileReader.onprogress = function(e) {                                                                        // 1003
            return FileReadProgress.call(result, (e.loaded / file.size) * 100);                                        //
          };                                                                                                           //
        }                                                                                                              //
        fileReader.onloadend = readHandler;                                                                            // 841
        fileReader.onerror = function(e) {                                                                             // 841
          var error;                                                                                                   // 1006
          result.abort();                                                                                              // 1006
          error = (e.target || e.srcElement).error;                                                                    // 1006
          return onError && onError.call(result, error, fileData);                                                     //
        };                                                                                                             //
        Meteor.defer(function() {                                                                                      // 841
          return fileReader.readAsDataURL(file);                                                                       //
        });                                                                                                            //
        return result;                                                                                                 // 1011
      }                                                                                                                //
    }                                                                                                                  //
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 1015
  /*                                                                                                                   // 1015
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
    var files, self;                                                                                                   // 1025
    if (this.debug) {                                                                                                  // 1025
      console.info("Meteor.Files Debugger: [remove(" + (JSON.stringify(search)) + ")]");                               // 1025
    }                                                                                                                  //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                        // 1025
    if (this.checkAccess()) {                                                                                          // 1028
      this.srch(search);                                                                                               // 1029
      if (Meteor.isClient) {                                                                                           // 1030
        Meteor.call(this.methodNames.MeteorFileUnlink, rcp(this));                                                     // 1031
      }                                                                                                                //
      if (Meteor.isServer) {                                                                                           // 1033
        files = this.collection.find(this.search);                                                                     // 1034
        if (files.count() > 0) {                                                                                       // 1035
          self = this;                                                                                                 // 1036
          files.forEach(function(file) {                                                                               // 1036
            return self.unlink(file);                                                                                  //
          });                                                                                                          //
        }                                                                                                              //
        this.collection.remove(this.search);                                                                           // 1034
      }                                                                                                                //
    }                                                                                                                  //
    return this;                                                                                                       // 1039
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 1041
  /*                                                                                                                   // 1041
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
    if (file.versions && !_.isEmpty(file.versions)) {                                                                  // 1051
      _.each(file.versions, function(version) {                                                                        // 1052
        return bound(function() {                                                                                      //
          return fs.unlink(version.path, NOOP);                                                                        //
        });                                                                                                            //
      });                                                                                                              //
    }                                                                                                                  //
    fs.unlink(file.path, NOOP);                                                                                        // 1051
    return this;                                                                                                       // 1055
  } : void 0;                                                                                                          //
                                                                                                                       //
  Files.prototype._404 = Meteor.isServer ? function(http) {                                                            // 101
    var text;                                                                                                          // 1060
    if (this.debug) {                                                                                                  // 1060
      console.warn("Meteor.Files Debugger: [download(" + http + ", " + version + ")] [404] File not found: " + (fileRef && fileRef.path ? fileRef.path : void 0));
    }                                                                                                                  //
    text = 'File Not Found :(';                                                                                        // 1060
    http.response.writeHead(404, {                                                                                     // 1060
      'Content-Length': text.length,                                                                                   // 1063
      'Content-Type': 'text/plain'                                                                                     // 1063
    });                                                                                                                //
    return http.response.end(text);                                                                                    //
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 1068
  /*                                                                                                                   // 1068
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
    var fileRef, responseType, self;                                                                                   // 1078
    if (version == null) {                                                                                             //
      version = 'original';                                                                                            //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  // 1078
      console.info("Meteor.Files Debugger: [download(" + http + ", " + version + ")]");                                // 1078
    }                                                                                                                  //
    responseType = '200';                                                                                              // 1078
    if (!this["public"]) {                                                                                             // 1080
      if (this.currentFile) {                                                                                          // 1081
        if (_.has(this.currentFile, 'versions') && _.has(this.currentFile.versions, version)) {                        // 1082
          fileRef = this.currentFile.versions[version];                                                                // 1083
        } else {                                                                                                       //
          fileRef = this.currentFile;                                                                                  // 1085
        }                                                                                                              //
      } else {                                                                                                         //
        fileRef = false;                                                                                               // 1087
      }                                                                                                                //
    }                                                                                                                  //
    if (this["public"]) {                                                                                              // 1089
      fileRef = {                                                                                                      // 1090
        path: this.storagePath + "/" + http.params.file                                                                // 1091
      };                                                                                                               //
    }                                                                                                                  //
    if (!fileRef || !_.isObject(fileRef)) {                                                                            // 1093
      return this._404(http);                                                                                          // 1094
    } else if (this.currentFile) {                                                                                     //
      self = this;                                                                                                     // 1096
      if (this.downloadCallback) {                                                                                     // 1098
        if (!this.downloadCallback.call(_.extend(http, this.getUser(http)), this.currentFile)) {                       // 1099
          return this._404(http);                                                                                      // 1100
        }                                                                                                              //
      }                                                                                                                //
      return fs.stat(fileRef.path, function(statErr, stats) {                                                          //
        return bound(function() {                                                                                      //
          var array, dispositionEncoding, dispositionName, dispositionType, end, fileStats, partiral, ref, ref1, ref2, ref3, reqRange, start, stream, streamErrorHandler, take, text;
          if (statErr || !stats.isFile()) {                                                                            // 1103
            return self._404(http);                                                                                    // 1104
          }                                                                                                            //
          fileStats = util.inspect(stats);                                                                             // 1103
          if (fileStats.size !== fileRef.size && !self.integrityCheck) {                                               // 1107
            fileRef.size = fileStats.size;                                                                             // 1107
          }                                                                                                            //
          if (fileStats.size !== fileRef.size && self.integrityCheck) {                                                // 1108
            responseType = '400';                                                                                      // 1108
          }                                                                                                            //
          partiral = false;                                                                                            // 1103
          reqRange = false;                                                                                            // 1103
          if (http.params.query.download && http.params.query.download === 'true') {                                   // 1112
            dispositionType = 'attachment; ';                                                                          // 1113
          } else {                                                                                                     //
            dispositionType = 'inline; ';                                                                              // 1115
          }                                                                                                            //
          dispositionName = "filename=\"" + (encodeURIComponent(self.currentFile.name)) + "\"; filename=*UTF-8\"" + (encodeURIComponent(self.currentFile.name)) + "\"; ";
          dispositionEncoding = 'charset=utf-8';                                                                       // 1103
          http.response.setHeader('Content-Type', fileRef.type);                                                       // 1103
          http.response.setHeader('Content-Disposition', dispositionType + dispositionName + dispositionEncoding);     // 1103
          http.response.setHeader('Accept-Ranges', 'bytes');                                                           // 1103
          if ((ref = self.currentFile) != null ? (ref1 = ref.updatedAt) != null ? ref1.toUTCString() : void 0 : void 0) {
            http.response.setHeader('Last-Modified', (ref2 = self.currentFile) != null ? (ref3 = ref2.updatedAt) != null ? ref3.toUTCString() : void 0 : void 0);
          }                                                                                                            //
          http.response.setHeader('Connection', 'keep-alive');                                                         // 1103
          if (http.request.headers.range) {                                                                            // 1126
            partiral = true;                                                                                           // 1127
            array = http.request.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);                                       // 1127
            start = parseInt(array[1]);                                                                                // 1127
            end = parseInt(array[2]);                                                                                  // 1127
            if (isNaN(end)) {                                                                                          // 1131
              end = fileRef.size - 1;                                                                                  // 1132
            }                                                                                                          //
            take = end - start;                                                                                        // 1127
          } else {                                                                                                     //
            start = 0;                                                                                                 // 1135
            end = fileRef.size - 1;                                                                                    // 1135
            take = fileRef.size;                                                                                       // 1135
          }                                                                                                            //
          if (partiral || (http.params.query.play && http.params.query.play === 'true')) {                             // 1139
            reqRange = {                                                                                               // 1140
              start: start,                                                                                            // 1140
              end: end                                                                                                 // 1140
            };                                                                                                         //
            if (isNaN(start) && !isNaN(end)) {                                                                         // 1141
              reqRange.start = end - take;                                                                             // 1142
              reqRange.end = end;                                                                                      // 1142
            }                                                                                                          //
            if (!isNaN(start) && isNaN(end)) {                                                                         // 1144
              reqRange.start = start;                                                                                  // 1145
              reqRange.end = start + take;                                                                             // 1145
            }                                                                                                          //
            if ((start + take) >= fileRef.size) {                                                                      // 1148
              reqRange.end = fileRef.size - 1;                                                                         // 1148
            }                                                                                                          //
            http.response.setHeader('Pragma', 'private');                                                              // 1140
            http.response.setHeader('Expires', new Date(+(new Date) + 1000 * 32400).toUTCString());                    // 1140
            http.response.setHeader('Cache-Control', 'private, maxage=10800, s-maxage=32400');                         // 1140
            if (self.strict && (reqRange.start >= (fileRef.size - 1) || reqRange.end > (fileRef.size - 1))) {          // 1153
              responseType = '416';                                                                                    // 1154
            } else {                                                                                                   //
              responseType = '206';                                                                                    // 1156
            }                                                                                                          //
          } else {                                                                                                     //
            http.response.setHeader('Cache-Control', self.cacheControl);                                               // 1158
            responseType = '200';                                                                                      // 1158
          }                                                                                                            //
          streamErrorHandler = function(error) {                                                                       // 1103
            http.response.writeHead(500);                                                                              // 1162
            return http.response.end(error.toString());                                                                //
          };                                                                                                           //
          switch (responseType) {                                                                                      // 1165
            case '400':                                                                                                // 1165
              if (self.debug) {                                                                                        // 1167
                console.warn("Meteor.Files Debugger: [download(" + http + ", " + version + ")] [400] Content-Length mismatch!: " + fileRef.path);
              }                                                                                                        //
              text = 'Content-Length mismatch!';                                                                       // 1167
              http.response.writeHead(400, {                                                                           // 1167
                'Content-Type': 'text/plain',                                                                          // 1170
                'Cache-Control': 'no-cache',                                                                           // 1170
                'Content-Length': text.length                                                                          // 1170
              });                                                                                                      //
              http.response.end(text);                                                                                 // 1167
              break;                                                                                                   // 1174
            case '404':                                                                                                // 1165
              return self._404(http);                                                                                  // 1176
              break;                                                                                                   // 1177
            case '416':                                                                                                // 1165
              if (self.debug) {                                                                                        // 1179
                console.info("Meteor.Files Debugger: [download(" + http + ", " + version + ")] [416] Content-Range is not specified!: " + fileRef.path);
              }                                                                                                        //
              http.response.writeHead(416, {                                                                           // 1179
                'Content-Range': "bytes */" + fileRef.size                                                             // 1181
              });                                                                                                      //
              http.response.end();                                                                                     // 1179
              break;                                                                                                   // 1183
            case '200':                                                                                                // 1165
              if (self.debug) {                                                                                        // 1185
                console.info("Meteor.Files Debugger: [download(" + http + ", " + version + ")] [200]: " + fileRef.path);
              }                                                                                                        //
              stream = fs.createReadStream(fileRef.path);                                                              // 1185
              stream.on('open', (function(_this) {                                                                     // 1185
                return function() {                                                                                    //
                  http.response.writeHead(200);                                                                        // 1188
                  if (self.throttle) {                                                                                 // 1189
                    return stream.pipe(new Throttle({                                                                  //
                      bps: self.throttle,                                                                              // 1190
                      chunksize: self.chunkSize                                                                        // 1190
                    })).pipe(http.response);                                                                           //
                  } else {                                                                                             //
                    return stream.pipe(http.response);                                                                 //
                  }                                                                                                    //
                };                                                                                                     //
              })(this)).on('error', streamErrorHandler);                                                               //
              break;                                                                                                   // 1195
            case '206':                                                                                                // 1165
              if (self.debug) {                                                                                        // 1197
                console.info("Meteor.Files Debugger: [download(" + http + ", " + version + ")] [206]: " + fileRef.path);
              }                                                                                                        //
              http.response.setHeader('Content-Range', "bytes " + reqRange.start + "-" + reqRange.end + "/" + fileRef.size);
              http.response.setHeader('Trailer', 'expires');                                                           // 1197
              http.response.setHeader('Transfer-Encoding', 'chunked');                                                 // 1197
              if (self.throttle) {                                                                                     // 1201
                stream = fs.createReadStream(fileRef.path, {                                                           // 1202
                  start: reqRange.start,                                                                               // 1202
                  end: reqRange.end                                                                                    // 1202
                });                                                                                                    //
                stream.on('open', function() {                                                                         // 1202
                  return http.response.writeHead(206);                                                                 //
                }).on('error', streamErrorHandler).on('end', function() {                                              //
                  return http.response.end();                                                                          //
                }).pipe(new Throttle({                                                                                 //
                  bps: self.throttle,                                                                                  // 1206
                  chunksize: self.chunkSize                                                                            // 1206
                })).pipe(http.response);                                                                               //
              } else {                                                                                                 //
                stream = fs.createReadStream(fileRef.path, {                                                           // 1209
                  start: reqRange.start,                                                                               // 1209
                  end: reqRange.end                                                                                    // 1209
                });                                                                                                    //
                stream.on('open', function() {                                                                         // 1209
                  return http.response.writeHead(206);                                                                 //
                }).on('error', streamErrorHandler).on('end', function() {                                              //
                  return http.response.end();                                                                          //
                }).pipe(http.response);                                                                                //
              }                                                                                                        //
              break;                                                                                                   // 1214
          }                                                                                                            // 1165
        });                                                                                                            //
      });                                                                                                              //
    } else {                                                                                                           //
      return this._404(http);                                                                                          // 1216
    }                                                                                                                  //
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 1219
  /*                                                                                                                   // 1219
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
    if (this.debug) {                                                                                                  // 1231
      console.info('Meteor.Files Debugger: [link()]');                                                                 // 1231
    }                                                                                                                  //
    if (_.isString(fileRef)) {                                                                                         // 1232
      version = fileRef;                                                                                               // 1233
      fileRef = null;                                                                                                  // 1233
    }                                                                                                                  //
    if (!fileRef && !this.currentFile) {                                                                               // 1235
      return '';                                                                                                       // 1235
    }                                                                                                                  //
    return formatFleURL(fileRef || this.currentFile, version, this["public"]);                                         // 1236
  };                                                                                                                   //
                                                                                                                       //
  return Files;                                                                                                        //
                                                                                                                       //
})();                                                                                                                  //
                                                                                                                       //
                                                                                                                       // 1238
/*                                                                                                                     // 1238
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
  var ext, ref, root;                                                                                                  // 1250
  if (version == null) {                                                                                               //
    version = 'original';                                                                                              //
  }                                                                                                                    //
  if (pub == null) {                                                                                                   //
    pub = false;                                                                                                       //
  }                                                                                                                    //
  root = __meteor_runtime_config__.ROOT_URL.replace(/\/+$/, '');                                                       // 1250
  if ((fileRef != null ? (ref = fileRef.extension) != null ? ref.length : void 0 : void 0) > 0) {                      // 1252
    ext = '.' + fileRef.extension;                                                                                     // 1253
  } else {                                                                                                             //
    ext = '';                                                                                                          // 1255
  }                                                                                                                    //
  if (pub) {                                                                                                           // 1257
    return root + (fileRef._downloadRoute + "/" + version + "-" + fileRef._id + ext);                                  // 1258
  } else {                                                                                                             //
    return root + (fileRef._downloadRoute + "/" + fileRef._collectionName + "/" + fileRef._id + "/" + version + "/" + fileRef._id + ext);
  }                                                                                                                    //
};                                                                                                                     // 1249
                                                                                                                       //
if (Meteor.isClient) {                                                                                                 // 1262
                                                                                                                       // 1263
  /*                                                                                                                   // 1263
  @client                                                                                                              //
  @TemplateHelper                                                                                                      //
  @name fileURL                                                                                                        //
  @param {Object} fileRef - File reference object                                                                      //
  @param {String} version - [Optional] Version of file you would like to request                                       //
  @description Get download URL for file by fileRef, even without subscription                                         //
  @example {{fileURL fileRef}}                                                                                         //
  @returns {String}                                                                                                    //
   */                                                                                                                  //
  Template.registerHelper('fileURL', function(fileRef, version) {                                                      // 1263
    var ref;                                                                                                           // 1274
    if (!fileRef || !_.isObject(fileRef)) {                                                                            // 1274
      return void 0;                                                                                                   // 1274
    }                                                                                                                  //
    version = !version || !_.isString(version) ? 'original' : version;                                                 // 1274
    if (fileRef._id) {                                                                                                 // 1276
      return formatFleURL(fileRef, version, !!~((ref = fileRef._storagePath) != null ? typeof ref.indexOf === "function" ? ref.indexOf('../web.browser') : void 0 : void 0));
    } else {                                                                                                           //
      return '';                                                                                                       // 1279
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
