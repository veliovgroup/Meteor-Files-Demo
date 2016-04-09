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
  function Files(config) {                                                                                             // 99
    var _methods, cookie, self;                                                                                        // 100
    if (config) {                                                                                                      // 100
      this.storagePath = config.storagePath, this.collectionName = config.collectionName, this.downloadRoute = config.downloadRoute, this.schema = config.schema, this.chunkSize = config.chunkSize, this.namingFunction = config.namingFunction, this.debug = config.debug, this.onbeforeunloadMessage = config.onbeforeunloadMessage, this.permissions = config.permissions, this.allowClientCode = config.allowClientCode, this.onBeforeUpload = config.onBeforeUpload, this.integrityCheck = config.integrityCheck, this["protected"] = config["protected"], this["public"] = config["public"], this.strict = config.strict, this.downloadCallback = config.downloadCallback, this.cacheControl = config.cacheControl, this.throttle = config.throttle;
    }                                                                                                                  //
    self = this;                                                                                                       // 100
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
    this.chunkSize = Math.floor(this.chunkSize / 8) * 8;                                                               // 100
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
    cookie = new Cookies();                                                                                            // 100
    if (this["protected"] && Meteor.isClient) {                                                                        // 121
      if (!cookie.has('meteor_login_token') && Meteor._localStorage.getItem('Meteor.loginToken')) {                    // 122
        cookie.set('meteor_login_token', Meteor._localStorage.getItem('Meteor.loginToken'), null, '/');                // 123
      }                                                                                                                //
    }                                                                                                                  //
    if (!this.storagePath) {                                                                                           // 125
      this.storagePath = this["public"] ? "../web.browser/app/uploads/" + this.collectionName : "assets/app/uploads/" + this.collectionName;
      this.downloadRoute = this["public"] ? "/uploads/" + this.collectionName : !this.downloadRoute ? '/cdn/storage' : void 0;
    }                                                                                                                  //
    if (!this.downloadRoute) {                                                                                         // 129
      this.downloadRoute = '/cdn/storage';                                                                             // 130
    }                                                                                                                  //
    if (!this.schema) {                                                                                                // 133
      this.schema = {                                                                                                  // 134
        size: {                                                                                                        // 135
          type: Number                                                                                                 // 135
        },                                                                                                             //
        name: {                                                                                                        // 135
          type: String                                                                                                 // 136
        },                                                                                                             //
        type: {                                                                                                        // 135
          type: String                                                                                                 // 137
        },                                                                                                             //
        path: {                                                                                                        // 135
          type: String                                                                                                 // 138
        },                                                                                                             //
        isVideo: {                                                                                                     // 135
          type: Boolean                                                                                                // 139
        },                                                                                                             //
        isAudio: {                                                                                                     // 135
          type: Boolean                                                                                                // 140
        },                                                                                                             //
        isImage: {                                                                                                     // 135
          type: Boolean                                                                                                // 141
        },                                                                                                             //
        _prefix: {                                                                                                     // 135
          type: String                                                                                                 // 142
        },                                                                                                             //
        extension: {                                                                                                   // 135
          type: String,                                                                                                // 144
          optional: true                                                                                               // 144
        },                                                                                                             //
        _storagePath: {                                                                                                // 135
          type: String                                                                                                 // 146
        },                                                                                                             //
        _downloadRoute: {                                                                                              // 135
          type: String                                                                                                 // 147
        },                                                                                                             //
        _collectionName: {                                                                                             // 135
          type: String                                                                                                 // 148
        },                                                                                                             //
        meta: {                                                                                                        // 135
          type: Object,                                                                                                // 150
          blackbox: true,                                                                                              // 150
          optional: true                                                                                               // 150
        },                                                                                                             //
        userId: {                                                                                                      // 135
          type: String,                                                                                                // 154
          optional: true                                                                                               // 154
        },                                                                                                             //
        updatedAt: {                                                                                                   // 135
          type: Date,                                                                                                  // 157
          autoValue: function() {                                                                                      // 157
            return new Date();                                                                                         //
          }                                                                                                            //
        },                                                                                                             //
        versions: {                                                                                                    // 135
          type: Object,                                                                                                // 160
          blackbox: true                                                                                               // 160
        }                                                                                                              //
      };                                                                                                               //
    }                                                                                                                  //
    check(this.debug, Boolean);                                                                                        // 100
    check(this.schema, Object);                                                                                        // 100
    check(this["public"], Boolean);                                                                                    // 100
    check(this.strict, Boolean);                                                                                       // 100
    check(this.throttle, Match.OneOf(false, Number));                                                                  // 100
    check(this["protected"], Match.OneOf(Boolean, Function));                                                          // 100
    check(this.chunkSize, Number);                                                                                     // 100
    check(this.permissions, Number);                                                                                   // 100
    check(this.storagePath, String);                                                                                   // 100
    check(this.downloadRoute, String);                                                                                 // 100
    check(this.integrityCheck, Boolean);                                                                               // 100
    check(this.collectionName, String);                                                                                // 100
    check(this.namingFunction, Function);                                                                              // 100
    check(this.onBeforeUpload, Match.OneOf(Boolean, Function));                                                        // 100
    check(this.allowClientCode, Boolean);                                                                              // 100
    check(this.downloadCallback, Match.OneOf(Boolean, Function));                                                      // 100
    check(this.onbeforeunloadMessage, Match.OneOf(String, Function));                                                  // 100
    if (this["public"] && this["protected"]) {                                                                         // 181
      throw new Meteor.Error(500, "[Meteor.File." + this.collectionName + "]: Files can not be public and protected at the same time!");
    }                                                                                                                  //
    this.cursor = null;                                                                                                // 100
    this.search = {};                                                                                                  // 100
    this.collection = new Mongo.Collection(this.collectionName);                                                       // 100
    this.currentFile = null;                                                                                           // 100
    this.storagePath = this.storagePath.replace(/\/$/, '');                                                            // 100
    this.downloadRoute = this.downloadRoute.replace(/\/$/, '');                                                        // 100
    this.collection.attachSchema(this.schema);                                                                         // 100
    this.collection.deny({                                                                                             // 100
      insert: function() {                                                                                             // 193
        return true;                                                                                                   //
      },                                                                                                               //
      update: function() {                                                                                             // 193
        return true;                                                                                                   //
      },                                                                                                               //
      remove: function() {                                                                                             // 193
        return true;                                                                                                   //
      }                                                                                                                //
    });                                                                                                                //
    this._prefix = SHA256(this.collectionName + this.storagePath + this.downloadRoute);                                // 100
    _insts[this._prefix] = this;                                                                                       // 100
    this.checkAccess = function(http) {                                                                                // 100
      var rc, result, text, user, userFuncs, userId;                                                                   // 201
      if (self["protected"]) {                                                                                         // 201
        user = false;                                                                                                  // 202
        userFuncs = self.getUser(http);                                                                                // 202
        user = userFuncs.user, userId = userFuncs.userId;                                                              // 202
        user = user();                                                                                                 // 202
        if (_.isFunction(self["protected"])) {                                                                         // 207
          result = http ? self["protected"].call(_.extend(http, userFuncs), self.currentFile || null) : self["protected"].call(userFuncs, self.currentFile || null);
        } else {                                                                                                       //
          result = !!user;                                                                                             // 210
        }                                                                                                              //
        if ((http && result === true) || !http) {                                                                      // 212
          return true;                                                                                                 // 213
        } else {                                                                                                       //
          rc = _.isNumber(result) ? result : 401;                                                                      // 215
          if (self.debug) {                                                                                            // 216
            console.warn('Access denied!');                                                                            // 216
          }                                                                                                            //
          if (http) {                                                                                                  // 217
            text = 'Access denied!';                                                                                   // 218
            http.response.writeHead(rc, {                                                                              // 218
              'Content-Length': text.length,                                                                           // 220
              'Content-Type': 'text/plain'                                                                             // 220
            });                                                                                                        //
            http.response.end(text);                                                                                   // 218
          }                                                                                                            //
          return false;                                                                                                // 223
        }                                                                                                              //
      } else {                                                                                                         //
        return true;                                                                                                   // 225
      }                                                                                                                //
    };                                                                                                                 //
    this.methodNames = {                                                                                               // 100
      MeteorFileAbort: "MeteorFileAbort" + this._prefix,                                                               // 228
      MeteorFileWrite: "MeteorFileWrite" + this._prefix,                                                               // 228
      MeteorFileUnlink: "MeteorFileUnlink" + this._prefix                                                              // 228
    };                                                                                                                 //
    if (Meteor.isServer) {                                                                                             // 232
      WebApp.connectHandlers.use(function(request, response, next) {                                                   // 233
        var http, params, uri, uris, version;                                                                          // 234
        if (!self["public"]) {                                                                                         // 234
          if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName)) {                    // 235
            uri = request._parsedUrl.path.replace(self.downloadRoute + "/" + self.collectionName, '');                 // 236
            if (uri.indexOf('/') === 0) {                                                                              // 237
              uri = uri.substring(1);                                                                                  // 238
            }                                                                                                          //
            uris = uri.split('/');                                                                                     // 236
            if (uris.length === 3) {                                                                                   // 241
              params = {                                                                                               // 242
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                _id: uris[0],                                                                                          // 243
                version: uris[1],                                                                                      // 243
                name: uris[2]                                                                                          // 243
              };                                                                                                       //
              http = {                                                                                                 // 242
                request: request,                                                                                      // 247
                response: response,                                                                                    // 247
                params: params                                                                                         // 247
              };                                                                                                       //
              if (self.checkAccess(http)) {                                                                            // 248
                return self.findOne(uris[0]).download.call(self, http, uris[1]);                                       //
              }                                                                                                        //
            } else {                                                                                                   //
              return next();                                                                                           //
            }                                                                                                          //
          } else {                                                                                                     //
            return next();                                                                                             //
          }                                                                                                            //
        } else {                                                                                                       //
          if (!!~request._parsedUrl.path.indexOf("" + self.downloadRoute)) {                                           // 254
            uri = request._parsedUrl.path.replace("" + self.downloadRoute, '');                                        // 255
            if (uri.indexOf('/') === 0) {                                                                              // 256
              uri = uri.substring(1);                                                                                  // 257
            }                                                                                                          //
            uris = uri.split('/');                                                                                     // 255
            if (uris.length === 1) {                                                                                   // 260
              params = {                                                                                               // 261
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                file: uris[0]                                                                                          // 262
              };                                                                                                       //
              http = {                                                                                                 // 261
                request: request,                                                                                      // 264
                response: response,                                                                                    // 264
                params: params                                                                                         // 264
              };                                                                                                       //
              if (!!~params.file.indexOf('-')) {                                                                       // 266
                version = params.file.split('-')[0];                                                                   // 267
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
      _methods = {};                                                                                                   // 233
      _methods[self.methodNames.MeteorFileUnlink] = function(inst) {                                                   // 233
        check(inst, Object);                                                                                           // 278
        if (self.debug) {                                                                                              // 279
          console.info('Meteor.Files Debugger: [MeteorFileUnlink]');                                                   // 279
        }                                                                                                              //
        if (self.allowClientCode) {                                                                                    // 280
          return self.remove.call(cp(_insts[inst._prefix], inst), inst.search);                                        //
        } else {                                                                                                       //
          throw new Meteor.Error(401, '[Meteor.Files] [remove()] Run code from client is not allowed!');               // 283
        }                                                                                                              //
      };                                                                                                               //
      _methods[self.methodNames.MeteorFileWrite] = function(opts) {                                                    // 233
        var action, e, extension, extensionWithDot, fileName, isUploadAllowed, path, pathName, pathPart, ref, result;  // 286
        this.unblock();                                                                                                // 286
        check(opts, {                                                                                                  // 286
          meta: Object,                                                                                                // 287
          file: Object,                                                                                                // 287
          fileId: String,                                                                                              // 287
          binData: String,                                                                                             // 287
          chunkId: Number,                                                                                             // 287
          fileLength: Number,                                                                                          // 287
          _binSize: Number,                                                                                            // 287
          eof: Boolean                                                                                                 // 287
        });                                                                                                            //
        if (self.debug) {                                                                                              // 298
          console.info("Meteor.Files Debugger: [MeteorFileWrite] {name: " + opts.fileId + ", meta:" + opts.meta + "}");
        }                                                                                                              //
        if (self.debug) {                                                                                              // 299
          console.info("Meteor.Files Debugger: Received chunk #" + opts.chunkId + " of " + opts.fileLength + " chunks, file: " + (opts.file.name || opts.file.fileName));
        }                                                                                                              //
        if (self.onBeforeUpload && _.isFunction(self.onBeforeUpload)) {                                                // 301
          isUploadAllowed = self.onBeforeUpload.call({                                                                 // 302
            file: opts.file                                                                                            // 302
          }, opts.file);                                                                                               //
          if (isUploadAllowed !== true) {                                                                              // 303
            throw new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : '@onBeforeUpload() returned false');
          }                                                                                                            //
        }                                                                                                              //
        fileName = self.getFileName(opts.file);                                                                        // 286
        ref = self.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;               // 286
        pathName = self["public"] ? self.storagePath + "/original-" + opts.fileId : self.storagePath + "/" + opts.fileId;
        path = self["public"] ? self.storagePath + "/original-" + opts.fileId + extensionWithDot : self.storagePath + "/" + opts.fileId + extensionWithDot;
        pathPart = opts.fileLength > 1 ? pathName + "_" + opts.chunkId + extensionWithDot : path;                      // 286
        result = _.extend(self.dataToSchema(_.extend(opts.file, {                                                      // 286
          path: path,                                                                                                  // 313
          extension: extension,                                                                                        // 313
          name: fileName,                                                                                              // 313
          meta: opts.meta                                                                                              // 313
        })), {                                                                                                         //
          _id: opts.fileId,                                                                                            // 313
          chunkId: opts.chunkId,                                                                                       // 313
          _binSize: opts._binSize                                                                                      // 313
        });                                                                                                            //
        action = function(cb) {                                                                                        // 286
          var binary, concatChunks, e, finish, tries;                                                                  // 316
          binary = new Buffer(opts.binData, 'base64');                                                                 // 316
          tries = 0;                                                                                                   // 316
          concatChunks = function(num, files, cb) {                                                                    // 316
            var _path, _source, findex, sindex;                                                                        // 320
            sindex = files.indexOf(opts.fileId + "_1" + extensionWithDot);                                             // 320
            if (!!~sindex) {                                                                                           // 321
              files.splice(sindex, 1);                                                                                 // 321
            }                                                                                                          //
            findex = files.indexOf(opts.fileId + "_" + num + extensionWithDot);                                        // 320
            if (!!~findex) {                                                                                           // 323
              files.splice(findex, 1);                                                                                 // 324
            } else {                                                                                                   //
              if (self.debug) {                                                                                        // 326
                console.warn("finish as no more files", files, {                                                       // 326
                  sindex: sindex,                                                                                      // 326
                  findex: findex                                                                                       // 326
                }, opts.fileId + "_" + num + extensionWithDot);                                                        //
              }                                                                                                        //
              return finish(cb);                                                                                       // 327
            }                                                                                                          //
            _path = pathName + "_" + num + extensionWithDot;                                                           // 320
            _source = pathName + '_1' + extensionWithDot;                                                              // 320
            return fs.stat(_path, function(error, stats) {                                                             //
              if (error || !stats.isFile()) {                                                                          // 333
                if (tries >= 10) {                                                                                     // 334
                  return cb(new Meteor.Error(500, "Chunk #" + num + " is missing!"));                                  //
                } else {                                                                                               //
                  tries++;                                                                                             // 337
                  return Meteor.setTimeout(function() {                                                                //
                    return concatChunks(num, files, cb);                                                               //
                  }, 100);                                                                                             //
                }                                                                                                      //
              } else {                                                                                                 //
                return fs.readFile(_path, function(error, _chunkData) {                                                //
                  if (error) {                                                                                         // 343
                    return cb(new Meteor.Error(500, "Can't read " + _path));                                           //
                  } else {                                                                                             //
                    return fs.appendFile(_source, _chunkData, function(error) {                                        //
                      if (error) {                                                                                     // 347
                        return cb(new Meteor.Error(500, "Can't append " + _path + " to " + _source));                  //
                      } else {                                                                                         //
                        fs.unlink(_path, NOOP);                                                                        // 350
                        if (files.length <= 0) {                                                                       // 351
                          return fs.rename(_source, path, function(error) {                                            //
                            return bound(function() {                                                                  //
                              if (error) {                                                                             // 353
                                return cb(new Meteor.Error(500, "Can't rename " + _source + " to " + path));           //
                              } else {                                                                                 //
                                return finish(cb);                                                                     //
                              }                                                                                        //
                            });                                                                                        //
                          });                                                                                          //
                        } else {                                                                                       //
                          return concatChunks(++num, files, cb);                                                       //
                        }                                                                                              //
                      }                                                                                                //
                    });                                                                                                //
                  }                                                                                                    //
                });                                                                                                    //
              }                                                                                                        //
            });                                                                                                        //
          };                                                                                                           //
          finish = function(cb) {                                                                                      // 316
            fs.chmod(path, self.permissions, NOOP);                                                                    // 361
            result.type = self.getMimeType(opts.file);                                                                 // 361
            return self.collection.insert(_.clone(result), function(error, _id) {                                      //
              if (error) {                                                                                             // 365
                return cb(new Meteor.Error(500, error));                                                               //
              } else {                                                                                                 //
                result._id = _id;                                                                                      // 368
                if (self.debug) {                                                                                      // 369
                  console.info("Meteor.Files Debugger: The file " + fileName + " (binary) was saved to " + path);      // 369
                }                                                                                                      //
                return cb(null, result);                                                                               //
              }                                                                                                        //
            });                                                                                                        //
          };                                                                                                           //
          try {                                                                                                        // 371
            if (opts.eof) {                                                                                            // 372
              if (opts.fileLength > 1) {                                                                               // 373
                return fs.readdir(self.storagePath, function(error, files) {                                           //
                  if (error) {                                                                                         // 375
                    return cb(new Meteor.Error(500, error));                                                           //
                  } else {                                                                                             //
                    return concatChunks(2, files.filter(function(f) {                                                  //
                      return !!~f.indexOf(opts.fileId);                                                                //
                    }), cb);                                                                                           //
                  }                                                                                                    //
                });                                                                                                    //
              } else {                                                                                                 //
                return finish(cb);                                                                                     //
              }                                                                                                        //
            } else {                                                                                                   //
              return fs.outputFile(pathPart, binary, 'binary', function(error) {                                       //
                return cb(error, result);                                                                              //
              });                                                                                                      //
            }                                                                                                          //
          } catch (_error) {                                                                                           //
            e = _error;                                                                                                // 385
            return cb(e);                                                                                              //
          }                                                                                                            //
        };                                                                                                             //
        if (opts.eof) {                                                                                                // 387
          try {                                                                                                        // 388
            return Meteor.wrapAsync(action)();                                                                         // 389
          } catch (_error) {                                                                                           //
            e = _error;                                                                                                // 391
            if (self.debug) {                                                                                          // 391
              console.warn("Meteor.Files Debugger: Insert (Upload) Exception:", e);                                    // 391
            }                                                                                                          //
            throw e;                                                                                                   // 392
          }                                                                                                            //
        } else {                                                                                                       //
          action(NOOP);                                                                                                // 394
          return result;                                                                                               // 395
        }                                                                                                              //
      };                                                                                                               //
      _methods[self.methodNames.MeteorFileAbort] = function(opts) {                                                    // 233
        var _path, ext, i, path, results;                                                                              // 398
        check(opts, {                                                                                                  // 398
          fileId: String,                                                                                              // 398
          fileData: Object,                                                                                            // 398
          fileLength: Number                                                                                           // 398
        });                                                                                                            //
        ext = "." + opts.fileData.ext;                                                                                 // 398
        path = self["public"] ? self.storagePath + "/original-" + opts.fileId : self.storagePath + "/" + opts.fileId;  // 398
        if (self.debug) {                                                                                              // 407
          console.info("Meteor.Files Debugger: Abort for " + path);                                                    // 407
        }                                                                                                              //
        if (opts.fileLength > 1) {                                                                                     // 408
          i = 0;                                                                                                       // 409
          results = [];                                                                                                // 410
          while (i <= opts.fileLength) {                                                                               //
            _path = path + "_" + i + ext;                                                                              // 411
            fs.stat(_path, (function(error, stats) {                                                                   // 411
              return bound((function(_this) {                                                                          //
                return function() {                                                                                    //
                  if (!error && stats.isFile()) {                                                                      // 413
                    return fs.unlink(_this._path, NOOP);                                                               //
                  }                                                                                                    //
                };                                                                                                     //
              })(this));                                                                                               //
            }).bind({                                                                                                  //
              _path: _path                                                                                             // 415
            }));                                                                                                       //
            results.push(i++);                                                                                         // 411
          }                                                                                                            //
          return results;                                                                                              //
        }                                                                                                              //
      };                                                                                                               //
      Meteor.methods(_methods);                                                                                        // 233
    }                                                                                                                  //
  }                                                                                                                    //
                                                                                                                       //
                                                                                                                       // 420
  /*                                                                                                                   // 420
  Extend Meteor.Files with mime library                                                                                //
  @url https://github.com/broofa/node-mime                                                                             //
  @description Temporary removed from package due to unstability                                                       //
   */                                                                                                                  //
                                                                                                                       //
                                                                                                                       // 427
  /*                                                                                                                   // 427
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name getMimeType                                                                                                    //
  @param {Object} fileData - File Object                                                                               //
  @description Returns file's mime-type                                                                                //
  @returns {String}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.getMimeType = function(fileData) {                                                                   // 99
    var mime;                                                                                                          // 437
    check(fileData, Object);                                                                                           // 437
    if (fileData != null ? fileData.type : void 0) {                                                                   // 438
      mime = fileData.type;                                                                                            // 438
    }                                                                                                                  //
    if (!mime || !_.isString(mime)) {                                                                                  // 439
      mime = 'application/octet-stream';                                                                               // 439
    }                                                                                                                  //
    return mime;                                                                                                       //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 442
  /*                                                                                                                   // 442
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name getFileName                                                                                                    //
  @param {Object} fileData - File Object                                                                               //
  @description Returns file's name                                                                                     //
  @returns {String}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.getFileName = function(fileData) {                                                                   // 99
    var cleanName, fileName;                                                                                           // 452
    fileName = fileData.name || fileData.fileName;                                                                     // 452
    if (_.isString(fileName) && fileName.length > 0) {                                                                 // 453
      cleanName = function(str) {                                                                                      // 454
        return str.replace(/\.\./g, '').replace(/\//g, '');                                                            //
      };                                                                                                               //
      return cleanName(fileData.name || fileData.fileName);                                                            // 455
    } else {                                                                                                           //
      return '';                                                                                                       // 457
    }                                                                                                                  //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 459
  /*                                                                                                                   // 459
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name getUser                                                                                                        //
  @description Returns object with `userId` and `user()` method which return user's object                             //
  @returns {Object}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.getUser = function(http) {                                                                           // 99
    var cookie, result, user;                                                                                          // 468
    result = {                                                                                                         // 468
      user: function() {                                                                                               // 469
        return null;                                                                                                   // 469
      },                                                                                                               //
      userId: null                                                                                                     // 469
    };                                                                                                                 //
    if (Meteor.isServer) {                                                                                             // 472
      if (http) {                                                                                                      // 473
        cookie = http.request.Cookies;                                                                                 // 474
        if (_.has(Package, 'accounts-base') && cookie.has('meteor_login_token')) {                                     // 475
          user = Meteor.users.findOne({                                                                                // 476
            'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(cookie.get('meteor_login_token'))      // 476
          });                                                                                                          //
          if (user) {                                                                                                  // 477
            result.user = function() {                                                                                 // 478
              return user;                                                                                             // 478
            };                                                                                                         //
            result.userId = user._id;                                                                                  // 478
          }                                                                                                            //
        }                                                                                                              //
      }                                                                                                                //
    } else {                                                                                                           //
      if (_.has(Package, 'accounts-base') && Meteor.userId()) {                                                        // 481
        result.user = function() {                                                                                     // 482
          return Meteor.user();                                                                                        // 482
        };                                                                                                             //
        result.userId = Meteor.userId();                                                                               // 482
      }                                                                                                                //
    }                                                                                                                  //
    return result;                                                                                                     // 485
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 487
  /*                                                                                                                   // 487
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name getExt                                                                                                         //
  @param {String} FileName - File name                                                                                 //
  @description Get extension from FileName                                                                             //
  @returns {Object}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.getExt = function(fileName) {                                                                        // 99
    var extension;                                                                                                     // 497
    if (!!~fileName.indexOf('.')) {                                                                                    // 497
      extension = fileName.split('.').pop();                                                                           // 498
      return {                                                                                                         // 499
        ext: extension,                                                                                                // 499
        extension: extension,                                                                                          // 499
        extensionWithDot: '.' + extension                                                                              // 499
      };                                                                                                               //
    } else {                                                                                                           //
      return {                                                                                                         // 501
        ext: '',                                                                                                       // 501
        extension: '',                                                                                                 // 501
        extensionWithDot: ''                                                                                           // 501
      };                                                                                                               //
    }                                                                                                                  //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 503
  /*                                                                                                                   // 503
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name dataToSchema                                                                                                   //
  @param {Object} data - File data                                                                                     //
  @description Build object in accordance with schema from File data                                                   //
  @returns {Object}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.dataToSchema = function(data) {                                                                      // 99
    return {                                                                                                           // 513
      name: data.name,                                                                                                 // 513
      extension: data.extension,                                                                                       // 513
      path: data.path,                                                                                                 // 513
      meta: data.meta,                                                                                                 // 513
      type: data.type,                                                                                                 // 513
      size: data.size,                                                                                                 // 513
      versions: {                                                                                                      // 513
        original: {                                                                                                    // 521
          path: data.path,                                                                                             // 522
          size: data.size,                                                                                             // 522
          type: data.type,                                                                                             // 522
          extension: data.extension                                                                                    // 522
        }                                                                                                              //
      },                                                                                                               //
      isVideo: !!~data.type.toLowerCase().indexOf('video'),                                                            // 513
      isAudio: !!~data.type.toLowerCase().indexOf('audio'),                                                            // 513
      isImage: !!~data.type.toLowerCase().indexOf('image'),                                                            // 513
      _prefix: data._prefix || this._prefix,                                                                           // 513
      _storagePath: data._storagePath || this.storagePath,                                                             // 513
      _downloadRoute: data._downloadRoute || this.downloadRoute,                                                       // 513
      _collectionName: data._collectionName || this.collectionName                                                     // 513
    };                                                                                                                 //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 535
  /*                                                                                                                   // 535
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name srch                                                                                                           //
  @param {String|Object} search - Search data                                                                          //
  @description Build search object                                                                                     //
  @returns {Object}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.srch = function(search) {                                                                            // 99
    if (search && _.isString(search)) {                                                                                // 545
      this.search = {                                                                                                  // 546
        _id: search                                                                                                    // 547
      };                                                                                                               //
    } else {                                                                                                           //
      this.search = search || {};                                                                                      // 549
    }                                                                                                                  //
    return this.search;                                                                                                //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 552
  /*                                                                                                                   // 552
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
  Files.prototype.write = Meteor.isServer ? function(buffer, opts, callback) {                                         // 99
    var extension, extensionWithDot, fileName, path, randFileName, ref, result;                                        // 564
    if (opts == null) {                                                                                                //
      opts = {};                                                                                                       //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  // 564
      console.info("Meteor.Files Debugger: [write(buffer, " + (JSON.stringify(opts)) + ", callback)]");                // 564
    }                                                                                                                  //
    check(opts, Match.Optional(Object));                                                                               // 564
    check(callback, Match.Optional(Function));                                                                         // 564
    if (this.checkAccess()) {                                                                                          // 568
      randFileName = this.namingFunction();                                                                            // 569
      fileName = opts.name || opts.fileName ? opts.name || opts.fileName : randFileName;                               // 569
      ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                 // 569
      path = this["public"] ? this.storagePath + "/original-" + randFileName + extensionWithDot : this.storagePath + "/" + randFileName + extensionWithDot;
      opts.type = this.getMimeType(opts);                                                                              // 569
      if (!opts.meta) {                                                                                                // 577
        opts.meta = {};                                                                                                // 577
      }                                                                                                                //
      if (!opts.size) {                                                                                                // 578
        opts.size = buffer.length;                                                                                     // 578
      }                                                                                                                //
      result = this.dataToSchema({                                                                                     // 569
        name: fileName,                                                                                                // 581
        path: path,                                                                                                    // 581
        meta: opts.meta,                                                                                               // 581
        type: opts.type,                                                                                               // 581
        size: opts.size,                                                                                               // 581
        extension: extension                                                                                           // 581
      });                                                                                                              //
      if (this.debug) {                                                                                                // 588
        console.info("Meteor.Files Debugger: The file " + fileName + " (binary) was added to " + this.collectionName);
      }                                                                                                                //
      fs.outputFile(path, buffer, 'binary', function(error) {                                                          // 569
        return bound(function() {                                                                                      //
          if (error) {                                                                                                 // 591
            return callback && callback(error);                                                                        //
          } else {                                                                                                     //
            result._id = this.collection.insert(_.clone(result));                                                      // 594
            return callback && callback(null, result);                                                                 //
          }                                                                                                            //
        });                                                                                                            //
      });                                                                                                              //
      return this;                                                                                                     // 597
    }                                                                                                                  //
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 601
  /*                                                                                                                   // 601
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
  Files.prototype.load = Meteor.isServer ? function(url, opts, callback) {                                             // 99
    var extension, extensionWithDot, fileName, path, randFileName, ref, self;                                          // 613
    if (opts == null) {                                                                                                //
      opts = {};                                                                                                       //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  // 613
      console.info("Meteor.Files Debugger: [load(" + url + ", " + (JSON.stringify(opts)) + ", callback)]");            // 613
    }                                                                                                                  //
    check(url, String);                                                                                                // 613
    check(opts, Match.Optional(Object));                                                                               // 613
    check(callback, Match.Optional(Function));                                                                         // 613
    self = this;                                                                                                       // 613
    randFileName = this.namingFunction();                                                                              // 613
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : randFileName;                                 // 613
    ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                   // 613
    path = this["public"] ? this.storagePath + "/original-" + randFileName + extensionWithDot : this.storagePath + "/" + randFileName + extensionWithDot;
    if (!opts.meta) {                                                                                                  // 624
      opts.meta = {};                                                                                                  // 624
    }                                                                                                                  //
    request.get(url).on('error', function(error) {                                                                     // 613
      return bound(function() {                                                                                        //
        throw new Meteor.Error(500, ("Error on [load(" + url + ", " + opts + ")]; Error:") + JSON.stringify(error));   // 627
      });                                                                                                              //
    }).on('response', function(response) {                                                                             //
      return bound(function() {                                                                                        //
        var result;                                                                                                    // 630
        if (self.debug) {                                                                                              // 630
          console.info("Meteor.Files Debugger: The file " + url + " is received");                                     // 630
        }                                                                                                              //
        result = self.dataToSchema({                                                                                   // 630
          name: fileName,                                                                                              // 633
          path: path,                                                                                                  // 633
          meta: opts.meta,                                                                                             // 633
          type: opts.type || response.headers['content-type'],                                                         // 633
          size: opts.size || response.headers['content-length'],                                                       // 633
          extension: extension                                                                                         // 633
        });                                                                                                            //
        return self.collection.insert(_.clone(result), function(error, fileRef) {                                      //
          if (error) {                                                                                                 // 641
            if (self.debug) {                                                                                          // 642
              console.warn("Meteor.Files Debugger: Can't add file " + fileName + " (binary) to " + self.collectionName);
            }                                                                                                          //
            return callback && callback(error);                                                                        //
          } else {                                                                                                     //
            if (self.debug) {                                                                                          // 645
              console.info("Meteor.Files Debugger: The file " + fileName + " (binary) was added to " + self.collectionName);
            }                                                                                                          //
            return callback && callback(null, fileRef);                                                                //
          }                                                                                                            //
        });                                                                                                            //
      });                                                                                                              //
    }).pipe(fs.createOutputStream(path));                                                                              //
    return this;                                                                                                       // 650
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 654
  /*                                                                                                                   // 654
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
  Files.prototype.addFile = Meteor.isServer ? function(path, opts, callback) {                                         // 99
    var self;                                                                                                          // 665
    if (opts == null) {                                                                                                //
      opts = {};                                                                                                       //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  // 665
      console.info("[addFile(" + path + ")]");                                                                         // 665
    }                                                                                                                  //
    if (this["public"]) {                                                                                              // 667
      throw new Meteor.Error(403, 'Can not run [addFile()] on public collection');                                     // 667
    }                                                                                                                  //
    check(path, String);                                                                                               // 665
    check(opts, Match.Optional(Object));                                                                               // 665
    check(callback, Match.Optional(Function));                                                                         // 665
    self = this;                                                                                                       // 665
    fs.stat(path, function(error, stats) {                                                                             // 665
      return bound(function() {                                                                                        //
        var _cn, extension, extensionWithDot, fileName, fileSize, fileStats, pathParts, ref, result;                   // 674
        if (error) {                                                                                                   // 674
          return callback && callback(error);                                                                          //
        } else if (stats.isFile()) {                                                                                   //
          fileStats = util.inspect(stats);                                                                             // 677
          fileSize = fileStats.size;                                                                                   // 677
          pathParts = path.split('/');                                                                                 // 677
          fileName = pathParts[pathParts.length - 1];                                                                  // 677
          ref = self.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;             // 677
          if (!opts.type) {                                                                                            // 684
            opts.type = 'application/*';                                                                               // 684
          }                                                                                                            //
          if (!opts.meta) {                                                                                            // 685
            opts.meta = {};                                                                                            // 685
          }                                                                                                            //
          if (!opts.size) {                                                                                            // 686
            opts.size = fileSize;                                                                                      // 686
          }                                                                                                            //
          result = self.dataToSchema({                                                                                 // 677
            name: fileName,                                                                                            // 689
            path: path,                                                                                                // 689
            meta: opts.meta,                                                                                           // 689
            type: opts.type,                                                                                           // 689
            size: opts.size,                                                                                           // 689
            extension: extension,                                                                                      // 689
            _storagePath: path.replace("/" + fileName, '')                                                             // 689
          });                                                                                                          //
          _cn = self.collectionName;                                                                                   // 677
          return self.collection.insert(_.clone(result), function(error, record) {                                     //
            if (error) {                                                                                               // 699
              if (self.debug) {                                                                                        // 700
                console.warn("Can't add file " + fileName + " (binary) to " + _cn);                                    // 700
              }                                                                                                        //
              return callback && callback(error);                                                                      //
            } else {                                                                                                   //
              if (self.debug) {                                                                                        // 703
                console.info("The file " + fileName + " (binary) was added to " + _cn);                                // 703
              }                                                                                                        //
              return callback && callback(null, result);                                                               //
            }                                                                                                          //
          });                                                                                                          //
        } else {                                                                                                       //
          return callback && callback(new Meteor.Error(400, "[Files.addFile(" + path + ")]: File does not exist"));    //
        }                                                                                                              //
      });                                                                                                              //
    });                                                                                                                //
    return this;                                                                                                       // 708
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 712
  /*                                                                                                                   // 712
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name findOne                                                                                                        //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                     //
  @description Load file                                                                                               //
  @returns {Files} - Return this                                                                                       //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.findOne = function(search) {                                                                         // 99
    if (this.debug) {                                                                                                  // 722
      console.info("Meteor.Files Debugger: [findOne(" + (JSON.stringify(search)) + ")]");                              // 722
    }                                                                                                                  //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                        // 722
    this.srch(search);                                                                                                 // 722
    if (this.checkAccess()) {                                                                                          // 726
      this.currentFile = this.collection.findOne(this.search);                                                         // 727
      this.cursor = null;                                                                                              // 727
    }                                                                                                                  //
    return this;                                                                                                       // 729
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 731
  /*                                                                                                                   // 731
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name find                                                                                                           //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                     //
  @description Load file or bunch of files                                                                             //
  @returns {Files} - Return this                                                                                       //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.find = function(search) {                                                                            // 99
    if (this.debug) {                                                                                                  // 741
      console.info("Meteor.Files Debugger: [find(" + (JSON.stringify(search)) + ")]");                                 // 741
    }                                                                                                                  //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                        // 741
    this.srch(search);                                                                                                 // 741
    if (this.checkAccess) {                                                                                            // 745
      this.currentFile = null;                                                                                         // 746
      this.cursor = this.collection.find(this.search);                                                                 // 746
    }                                                                                                                  //
    return this;                                                                                                       // 748
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 750
  /*                                                                                                                   // 750
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name get                                                                                                            //
  @description Return value of current cursor or file                                                                  //
  @returns {Object|[Object]}                                                                                           //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.get = function() {                                                                                   // 99
    if (this.debug) {                                                                                                  // 759
      console.info('Meteor.Files Debugger: [get()]');                                                                  // 759
    }                                                                                                                  //
    if (this.cursor) {                                                                                                 // 760
      return this.cursor.fetch();                                                                                      // 760
    }                                                                                                                  //
    return this.currentFile;                                                                                           // 761
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 763
  /*                                                                                                                   // 763
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name fetch                                                                                                          //
  @description Alias for `get()` method                                                                                //
  @returns {[Object]}                                                                                                  //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.fetch = function() {                                                                                 // 99
    var data;                                                                                                          // 772
    if (this.debug) {                                                                                                  // 772
      console.info('Meteor.Files Debugger: [fetch()]');                                                                // 772
    }                                                                                                                  //
    data = this.get();                                                                                                 // 772
    if (!_.isArray(data)) {                                                                                            // 774
      return [data];                                                                                                   // 775
    } else {                                                                                                           //
      return data;                                                                                                     //
    }                                                                                                                  //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 779
  /*                                                                                                                   // 779
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
  Files.prototype.insert = Meteor.isClient ? function(config) {                                                        // 99
    var EOFsent, FileReadProgress, _binSize, beforeunload, binary, chunkSize, createStreams, currentChunk, end, file, fileData, fileId, fileLength, fileReader, isUploadAllowed, meta, onAbort, onBeforeUpload, onError, onProgress, onReady, onUploaded, readHandler, result, self, sendEOF, sentChunks, streams, upload;
    if (this.checkAccess()) {                                                                                          // 809
      if (this.debug) {                                                                                                // 810
        console.info('Meteor.Files Debugger: [insert()]');                                                             // 810
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
      check(meta, Match.Optional(Object));                                                                             // 810
      check(onAbort, Match.Optional(Function));                                                                        // 810
      check(streams, Match.OneOf('dynamic', Number));                                                                  // 810
      check(chunkSize, Match.OneOf('dynamic', Number));                                                                // 810
      check(onUploaded, Match.Optional(Function));                                                                     // 810
      check(onProgress, Match.Optional(Function));                                                                     // 810
      check(onBeforeUpload, Match.Optional(Function));                                                                 // 810
      check(onError, Match.Optional(Function));                                                                        // 810
      check(onReady, Match.Optional(Function));                                                                        // 810
      check(FileReadProgress, Match.Optional(Function));                                                               // 810
      if (file) {                                                                                                      // 827
        if (this.debug) {                                                                                              // 828
          console.time('insert');                                                                                      // 828
        }                                                                                                              //
        self = this;                                                                                                   // 828
        fileReader = new FileReader;                                                                                   // 828
        fileLength = 1;                                                                                                // 828
        fileId = this.namingFunction();                                                                                // 828
        fileData = {                                                                                                   // 828
          size: file.size,                                                                                             // 834
          type: file.type,                                                                                             // 834
          name: file.name                                                                                              // 834
        };                                                                                                             //
        fileData = _.extend(fileData, this.getExt(file.name), {                                                        // 828
          mime: this.getMimeType(fileData)                                                                             // 838
        });                                                                                                            //
        fileData['mime-type'] = fileData.mime;                                                                         // 828
        beforeunload = function(e) {                                                                                   // 828
          var message;                                                                                                 // 842
          message = _.isFunction(self.onbeforeunloadMessage) ? self.onbeforeunloadMessage.call(null) : self.onbeforeunloadMessage;
          if (e) {                                                                                                     // 843
            e.returnValue = message;                                                                                   // 843
          }                                                                                                            //
          return message;                                                                                              // 844
        };                                                                                                             //
        window.addEventListener('beforeunload', beforeunload, false);                                                  // 828
        result = {                                                                                                     // 828
          file: _.extend(file, fileData),                                                                              // 848
          onPause: new ReactiveVar(false),                                                                             // 848
          continueFunc: function() {},                                                                                 // 848
          pause: function() {                                                                                          // 848
            this.onPause.set(true);                                                                                    // 852
            return this.state.set('paused');                                                                           //
          },                                                                                                           //
          "continue": function() {                                                                                     // 848
            this.onPause.set(false);                                                                                   // 855
            this.state.set('active');                                                                                  // 855
            this.continueFunc.call();                                                                                  // 855
            return this.continueFunc = function() {};                                                                  //
          },                                                                                                           //
          toggle: function() {                                                                                         // 848
            if (this.onPause.get()) {                                                                                  // 860
              return this["continue"]();                                                                               //
            } else {                                                                                                   //
              return this.pause();                                                                                     //
            }                                                                                                          //
          },                                                                                                           //
          progress: new ReactiveVar(0),                                                                                // 848
          abort: function() {                                                                                          // 848
            window.removeEventListener('beforeunload', beforeunload, false);                                           // 863
            onAbort && onAbort.call(this, fileData);                                                                   // 863
            fileReader.abort();                                                                                        // 863
            this.pause();                                                                                              // 863
            this.state.set('aborted');                                                                                 // 863
            Meteor.call(self.methodNames.MeteorFileAbort, {                                                            // 863
              fileId: fileId,                                                                                          // 868
              fileLength: fileLength,                                                                                  // 868
              fileData: fileData                                                                                       // 868
            });                                                                                                        //
            return delete upload;                                                                                      //
          },                                                                                                           //
          state: new ReactiveVar('active'),                                                                            // 848
          readAsDataURL: function() {                                                                                  // 848
            return fileReader != null ? fileReader.result : void 0;                                                    //
          }                                                                                                            //
        };                                                                                                             //
        result.progress.set = _.throttle(result.progress.set, 250);                                                    // 828
        Tracker.autorun(function() {                                                                                   // 828
          if (Meteor.status().connected) {                                                                             // 876
            result["continue"]();                                                                                      // 877
            if (self.debug) {                                                                                          // 878
              return console.info('Meteor.Files Debugger: Connection established continue() upload');                  //
            }                                                                                                          //
          } else {                                                                                                     //
            result.pause();                                                                                            // 880
            if (self.debug) {                                                                                          // 881
              return console.info('Meteor.Files Debugger: Connection error set upload on pause()');                    //
            }                                                                                                          //
          }                                                                                                            //
        });                                                                                                            //
        end = function(error, data) {                                                                                  // 828
          if (self.debug) {                                                                                            // 884
            console.timeEnd('insert');                                                                                 // 884
          }                                                                                                            //
          window.removeEventListener('beforeunload', beforeunload, false);                                             // 884
          result.progress.set(0);                                                                                      // 884
          onUploaded && onUploaded.call(result, error, data);                                                          // 884
          if (error) {                                                                                                 // 888
            result.state.set('aborted');                                                                               // 889
            return onError && onError.call(result, error, fileData);                                                   //
          } else {                                                                                                     //
            return result.state.set('completed');                                                                      //
          }                                                                                                            //
        };                                                                                                             //
        if (onBeforeUpload && _.isFunction(onBeforeUpload)) {                                                          // 894
          isUploadAllowed = onBeforeUpload.call(result, fileData);                                                     // 895
          if (isUploadAllowed !== true) {                                                                              // 896
            end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'Files.onBeforeUpload() returned false'), null);
            return false;                                                                                              // 898
          }                                                                                                            //
        }                                                                                                              //
        if (this.onBeforeUpload && _.isFunction(this.onBeforeUpload)) {                                                // 900
          isUploadAllowed = this.onBeforeUpload.call(result, fileData);                                                // 901
          if (isUploadAllowed !== true) {                                                                              // 902
            end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'this.onBeforeUpload() returned false'), null);
            return false;                                                                                              // 904
          }                                                                                                            //
        }                                                                                                              //
        currentChunk = 0;                                                                                              // 828
        sentChunks = 0;                                                                                                // 828
        binary = '';                                                                                                   // 828
        _binSize = 0;                                                                                                  // 828
        EOFsent = false;                                                                                               // 828
        sendEOF = function(opts) {                                                                                     // 828
          if (!EOFsent) {                                                                                              // 913
            EOFsent = true;                                                                                            // 914
            return Meteor.setTimeout(function() {                                                                      //
              opts.binData = 'EOF';                                                                                    // 916
              opts.eof = true;                                                                                         // 916
              opts.chunkId = -1;                                                                                       // 916
              opts._binSize = -1;                                                                                      // 916
              return Meteor.call(self.methodNames.MeteorFileWrite, opts, end);                                         //
            }, 50);                                                                                                    //
          }                                                                                                            //
        };                                                                                                             //
        upload = function(fileLength) {                                                                                // 828
          var opts;                                                                                                    // 924
          opts = {                                                                                                     // 924
            meta: meta,                                                                                                // 925
            file: fileData,                                                                                            // 925
            fileId: fileId,                                                                                            // 925
            fileLength: fileLength,                                                                                    // 925
            eof: false                                                                                                 // 925
          };                                                                                                           //
          if (result.onPause.get()) {                                                                                  // 931
            result.continueFunc = function() {                                                                         // 932
              return upload(fileLength);                                                                               //
            };                                                                                                         //
            return;                                                                                                    // 933
          }                                                                                                            //
          if (_binSize > 0) {                                                                                          // 935
            opts.chunkId = ++currentChunk;                                                                             // 936
            opts.binData = binary.substring(0, chunkSize);                                                             // 936
            binary = binary.substring(chunkSize);                                                                      // 936
            _binSize = opts._binSize = _.clone(binary.length);                                                         // 936
            return Meteor.call(self.methodNames.MeteorFileWrite, opts, function(error, data) {                         //
              var progress;                                                                                            // 942
              ++sentChunks;                                                                                            // 942
              if (error) {                                                                                             // 943
                return end(error);                                                                                     //
              } else {                                                                                                 //
                progress = (data.chunkId / fileLength) * 100;                                                          // 946
                result.progress.set(Math.ceil(progress));                                                              // 946
                onProgress && onProgress.call(result, progress);                                                       // 946
                if (!result.onPause.get()) {                                                                           // 950
                  if (data._binSize <= 0) {                                                                            // 951
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
        createStreams = function(fileLength) {                                                                         // 828
          var i;                                                                                                       // 961
          i = 1;                                                                                                       // 961
          while (i <= streams) {                                                                                       // 962
            Meteor.defer(function() {                                                                                  // 963
              return upload(fileLength);                                                                               //
            });                                                                                                        //
            i++;                                                                                                       // 963
          }                                                                                                            //
        };                                                                                                             //
        readHandler = function(chunk) {                                                                                // 828
          var _len, binSize, ref, ref1;                                                                                // 968
          binary = ((fileReader != null ? fileReader.result : void 0) || ((ref = chunk.srcElement) != null ? ref.result : void 0) || ((ref1 = chunk.target) != null ? ref1.result : void 0)).split(',')[1];
          if (binary && binary.length) {                                                                               // 969
            onReady && onReady.call(result, fileData);                                                                 // 970
            binSize = _.clone(binary.length);                                                                          // 970
            _binSize = _.clone(binary.length);                                                                         // 970
            if (chunkSize === 'dynamic') {                                                                             // 973
              if (binSize >= 2048 * streams) {                                                                         // 974
                chunkSize = Math.ceil(binSize / (8 * streams));                                                        // 975
              } else {                                                                                                 //
                chunkSize = self.chunkSize;                                                                            // 977
              }                                                                                                        //
            }                                                                                                          //
            if (streams === 'dynamic') {                                                                               // 978
              streams = Math.ceil(binSize / chunkSize);                                                                // 979
              if (streams > 32) {                                                                                      // 980
                streams = 32;                                                                                          // 981
              }                                                                                                        //
            }                                                                                                          //
            chunkSize = Math.floor(chunkSize / 8) * 8;                                                                 // 970
            _len = Math.ceil(binSize / chunkSize);                                                                     // 970
            fileLength = _len <= 0 ? 1 : _len;                                                                         // 970
            if (streams > fileLength) {                                                                                // 985
              streams = fileLength;                                                                                    // 986
            }                                                                                                          //
            return createStreams(fileLength);                                                                          //
          }                                                                                                            //
        };                                                                                                             //
        if (FileReadProgress) {                                                                                        // 989
          fileReader.onprogress = function(e) {                                                                        // 990
            return FileReadProgress.call(result, (e.loaded / file.size) * 100);                                        //
          };                                                                                                           //
        }                                                                                                              //
        fileReader.onloadend = readHandler;                                                                            // 828
        fileReader.onerror = function(e) {                                                                             // 828
          var error;                                                                                                   // 993
          result.abort();                                                                                              // 993
          error = (e.target || e.srcElement).error;                                                                    // 993
          return onError && onError.call(result, error, fileData);                                                     //
        };                                                                                                             //
        Meteor.defer(function() {                                                                                      // 828
          return fileReader.readAsDataURL(file);                                                                       //
        });                                                                                                            //
        return result;                                                                                                 // 998
      }                                                                                                                //
    }                                                                                                                  //
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 1002
  /*                                                                                                                   // 1002
  @isomorphic                                                                                                          //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name remove                                                                                                         //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                     //
  @description Remove file(s) on cursor or find and remove file(s) if search is set                                    //
  @returns {undefined}                                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.remove = function(search) {                                                                          // 99
    var files, self;                                                                                                   // 1012
    if (this.debug) {                                                                                                  // 1012
      console.info("Meteor.Files Debugger: [remove(" + (JSON.stringify(search)) + ")]");                               // 1012
    }                                                                                                                  //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                        // 1012
    if (this.checkAccess()) {                                                                                          // 1015
      this.srch(search);                                                                                               // 1016
      if (Meteor.isClient) {                                                                                           // 1017
        Meteor.call(this.methodNames.MeteorFileUnlink, rcp(this));                                                     // 1018
      }                                                                                                                //
      if (Meteor.isServer) {                                                                                           // 1020
        files = this.collection.find(this.search);                                                                     // 1021
        if (files.count() > 0) {                                                                                       // 1022
          self = this;                                                                                                 // 1023
          files.forEach(function(file) {                                                                               // 1023
            return self.unlink(file);                                                                                  //
          });                                                                                                          //
        }                                                                                                              //
        this.collection.remove(this.search);                                                                           // 1021
      }                                                                                                                //
    }                                                                                                                  //
    return this;                                                                                                       // 1026
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 1028
  /*                                                                                                                   // 1028
  @sever                                                                                                               //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name unlink                                                                                                         //
  @param {Object} file - fileObj                                                                                       //
  @description Unlink files and it's versions from FS                                                                  //
  @returns {undefined}                                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.unlink = Meteor.isServer ? function(file) {                                                          // 99
    if (file.versions && !_.isEmpty(file.versions)) {                                                                  // 1038
      _.each(file.versions, function(version) {                                                                        // 1039
        return bound(function() {                                                                                      //
          return fs.unlink(version.path, NOOP);                                                                        //
        });                                                                                                            //
      });                                                                                                              //
    }                                                                                                                  //
    fs.unlink(file.path, NOOP);                                                                                        // 1038
    return this;                                                                                                       // 1042
  } : void 0;                                                                                                          //
                                                                                                                       //
  Files.prototype._404 = Meteor.isServer ? function(http) {                                                            // 99
    var text;                                                                                                          // 1047
    if (this.debug) {                                                                                                  // 1047
      console.warn("Meteor.Files Debugger: [download(" + http.request.originalUrl + ")] [404] File not found");        // 1047
    }                                                                                                                  //
    text = 'File Not Found :(';                                                                                        // 1047
    http.response.writeHead(404, {                                                                                     // 1047
      'Content-Length': text.length,                                                                                   // 1050
      'Content-Type': 'text/plain'                                                                                     // 1050
    });                                                                                                                //
    return http.response.end(text);                                                                                    //
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 1055
  /*                                                                                                                   // 1055
  @server                                                                                                              //
  @function                                                                                                            //
  @class Meteor.Files                                                                                                  //
  @name download                                                                                                       //
  @param {Object|Files} self - Instance of MEteor.Files                                                                //
  @description Initiates the HTTP response                                                                             //
  @returns {undefined}                                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  Files.prototype.download = Meteor.isServer ? function(http, version) {                                               // 99
    var fileRef, responseType, self;                                                                                   // 1065
    if (version == null) {                                                                                             //
      version = 'original';                                                                                            //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  // 1065
      console.info("Meteor.Files Debugger: [download(" + http.request.originalUrl + ", " + version + ")]");            // 1065
    }                                                                                                                  //
    responseType = '200';                                                                                              // 1065
    if (!this["public"]) {                                                                                             // 1067
      if (this.currentFile) {                                                                                          // 1068
        if (_.has(this.currentFile, 'versions') && _.has(this.currentFile.versions, version)) {                        // 1069
          fileRef = this.currentFile.versions[version];                                                                // 1070
        } else {                                                                                                       //
          fileRef = this.currentFile;                                                                                  // 1072
        }                                                                                                              //
      } else {                                                                                                         //
        fileRef = false;                                                                                               // 1074
      }                                                                                                                //
    }                                                                                                                  //
    if (this["public"]) {                                                                                              // 1076
      fileRef = {                                                                                                      // 1077
        path: this.storagePath + "/" + http.params.file                                                                // 1078
      };                                                                                                               //
    }                                                                                                                  //
    if (!fileRef || !_.isObject(fileRef)) {                                                                            // 1080
      return this._404(http);                                                                                          // 1081
    } else if (this.currentFile) {                                                                                     //
      self = this;                                                                                                     // 1083
      if (this.downloadCallback) {                                                                                     // 1085
        if (!this.downloadCallback.call(_.extend(http, this.getUser(http)), this.currentFile)) {                       // 1086
          return this._404(http);                                                                                      // 1087
        }                                                                                                              //
      }                                                                                                                //
      return fs.stat(fileRef.path, function(statErr, stats) {                                                          //
        return bound(function() {                                                                                      //
          var array, dispositionEncoding, dispositionName, dispositionType, end, fileStats, partiral, ref, ref1, ref2, ref3, reqRange, start, stream, streamErrorHandler, take, text;
          if (statErr || !stats.isFile()) {                                                                            // 1090
            return self._404(http);                                                                                    // 1091
          }                                                                                                            //
          fileStats = util.inspect(stats);                                                                             // 1090
          if (fileStats.size !== fileRef.size && !self.integrityCheck) {                                               // 1094
            fileRef.size = fileStats.size;                                                                             // 1094
          }                                                                                                            //
          if (fileStats.size !== fileRef.size && self.integrityCheck) {                                                // 1095
            responseType = '400';                                                                                      // 1095
          }                                                                                                            //
          partiral = false;                                                                                            // 1090
          reqRange = false;                                                                                            // 1090
          if (http.params.query.download && http.params.query.download === 'true') {                                   // 1099
            dispositionType = 'attachment; ';                                                                          // 1100
          } else {                                                                                                     //
            dispositionType = 'inline; ';                                                                              // 1102
          }                                                                                                            //
          dispositionName = "filename=\"" + (encodeURIComponent(self.currentFile.name)) + "\"; filename=*UTF-8\"" + (encodeURIComponent(self.currentFile.name)) + "\"; ";
          dispositionEncoding = 'charset=utf-8';                                                                       // 1090
          http.response.setHeader('Content-Type', fileRef.type);                                                       // 1090
          http.response.setHeader('Content-Disposition', dispositionType + dispositionName + dispositionEncoding);     // 1090
          http.response.setHeader('Accept-Ranges', 'bytes');                                                           // 1090
          if ((ref = self.currentFile) != null ? (ref1 = ref.updatedAt) != null ? ref1.toUTCString() : void 0 : void 0) {
            http.response.setHeader('Last-Modified', (ref2 = self.currentFile) != null ? (ref3 = ref2.updatedAt) != null ? ref3.toUTCString() : void 0 : void 0);
          }                                                                                                            //
          http.response.setHeader('Connection', 'keep-alive');                                                         // 1090
          if (http.request.headers.range) {                                                                            // 1113
            partiral = true;                                                                                           // 1114
            array = http.request.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);                                       // 1114
            start = parseInt(array[1]);                                                                                // 1114
            end = parseInt(array[2]);                                                                                  // 1114
            if (isNaN(end)) {                                                                                          // 1118
              end = fileRef.size - 1;                                                                                  // 1119
            }                                                                                                          //
            take = end - start;                                                                                        // 1114
          } else {                                                                                                     //
            start = 0;                                                                                                 // 1122
            end = fileRef.size - 1;                                                                                    // 1122
            take = fileRef.size;                                                                                       // 1122
          }                                                                                                            //
          if (partiral || (http.params.query.play && http.params.query.play === 'true')) {                             // 1126
            reqRange = {                                                                                               // 1127
              start: start,                                                                                            // 1127
              end: end                                                                                                 // 1127
            };                                                                                                         //
            if (isNaN(start) && !isNaN(end)) {                                                                         // 1128
              reqRange.start = end - take;                                                                             // 1129
              reqRange.end = end;                                                                                      // 1129
            }                                                                                                          //
            if (!isNaN(start) && isNaN(end)) {                                                                         // 1131
              reqRange.start = start;                                                                                  // 1132
              reqRange.end = start + take;                                                                             // 1132
            }                                                                                                          //
            if ((start + take) >= fileRef.size) {                                                                      // 1135
              reqRange.end = fileRef.size - 1;                                                                         // 1135
            }                                                                                                          //
            http.response.setHeader('Pragma', 'private');                                                              // 1127
            http.response.setHeader('Expires', new Date(+(new Date) + 1000 * 32400).toUTCString());                    // 1127
            http.response.setHeader('Cache-Control', 'private, maxage=10800, s-maxage=32400');                         // 1127
            if (self.strict && (reqRange.start >= (fileRef.size - 1) || reqRange.end > (fileRef.size - 1))) {          // 1140
              responseType = '416';                                                                                    // 1141
            } else {                                                                                                   //
              responseType = '206';                                                                                    // 1143
            }                                                                                                          //
          } else {                                                                                                     //
            http.response.setHeader('Cache-Control', self.cacheControl);                                               // 1145
            responseType = '200';                                                                                      // 1145
          }                                                                                                            //
          streamErrorHandler = function(error) {                                                                       // 1090
            http.response.writeHead(500);                                                                              // 1149
            return http.response.end(error.toString());                                                                //
          };                                                                                                           //
          switch (responseType) {                                                                                      // 1152
            case '400':                                                                                                // 1152
              if (self.debug) {                                                                                        // 1154
                console.warn("Meteor.Files Debugger: [download(" + fileRef.path + ", " + version + ")] [400] Content-Length mismatch!");
              }                                                                                                        //
              text = 'Content-Length mismatch!';                                                                       // 1154
              http.response.writeHead(400, {                                                                           // 1154
                'Content-Type': 'text/plain',                                                                          // 1157
                'Cache-Control': 'no-cache',                                                                           // 1157
                'Content-Length': text.length                                                                          // 1157
              });                                                                                                      //
              http.response.end(text);                                                                                 // 1154
              break;                                                                                                   // 1161
            case '404':                                                                                                // 1152
              return self._404(http);                                                                                  // 1163
              break;                                                                                                   // 1164
            case '416':                                                                                                // 1152
              if (self.debug) {                                                                                        // 1166
                console.info("Meteor.Files Debugger: [download(" + fileRef.path + ", " + version + ")] [416] Content-Range is not specified!");
              }                                                                                                        //
              http.response.writeHead(416, {                                                                           // 1166
                'Content-Range': "bytes */" + fileRef.size                                                             // 1168
              });                                                                                                      //
              http.response.end();                                                                                     // 1166
              break;                                                                                                   // 1170
            case '200':                                                                                                // 1152
              if (self.debug) {                                                                                        // 1172
                console.info("Meteor.Files Debugger: [download(" + fileRef.path + ", " + version + ")] [200]");        // 1172
              }                                                                                                        //
              stream = fs.createReadStream(fileRef.path);                                                              // 1172
              stream.on('open', (function(_this) {                                                                     // 1172
                return function() {                                                                                    //
                  http.response.writeHead(200);                                                                        // 1175
                  if (self.throttle) {                                                                                 // 1176
                    return stream.pipe(new Throttle({                                                                  //
                      bps: self.throttle,                                                                              // 1177
                      chunksize: self.chunkSize                                                                        // 1177
                    })).pipe(http.response);                                                                           //
                  } else {                                                                                             //
                    return stream.pipe(http.response);                                                                 //
                  }                                                                                                    //
                };                                                                                                     //
              })(this)).on('error', streamErrorHandler);                                                               //
              break;                                                                                                   // 1182
            case '206':                                                                                                // 1152
              if (self.debug) {                                                                                        // 1184
                console.info("Meteor.Files Debugger: [download(" + fileRef.path + ", " + version + ")] [206]");        // 1184
              }                                                                                                        //
              http.response.setHeader('Content-Range', "bytes " + reqRange.start + "-" + reqRange.end + "/" + fileRef.size);
              http.response.setHeader('Trailer', 'expires');                                                           // 1184
              http.response.setHeader('Transfer-Encoding', 'chunked');                                                 // 1184
              if (self.throttle) {                                                                                     // 1188
                stream = fs.createReadStream(fileRef.path, {                                                           // 1189
                  start: reqRange.start,                                                                               // 1189
                  end: reqRange.end                                                                                    // 1189
                });                                                                                                    //
                stream.on('open', function() {                                                                         // 1189
                  return http.response.writeHead(206);                                                                 //
                }).on('error', streamErrorHandler).on('end', function() {                                              //
                  return http.response.end();                                                                          //
                }).pipe(new Throttle({                                                                                 //
                  bps: self.throttle,                                                                                  // 1193
                  chunksize: self.chunkSize                                                                            // 1193
                })).pipe(http.response);                                                                               //
              } else {                                                                                                 //
                stream = fs.createReadStream(fileRef.path, {                                                           // 1196
                  start: reqRange.start,                                                                               // 1196
                  end: reqRange.end                                                                                    // 1196
                });                                                                                                    //
                stream.on('open', function() {                                                                         // 1196
                  return http.response.writeHead(206);                                                                 //
                }).on('error', streamErrorHandler).on('end', function() {                                              //
                  return http.response.end();                                                                          //
                }).pipe(http.response);                                                                                //
              }                                                                                                        //
              break;                                                                                                   // 1201
          }                                                                                                            // 1152
        });                                                                                                            //
      });                                                                                                              //
    } else {                                                                                                           //
      return this._404(http);                                                                                          // 1203
    }                                                                                                                  //
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 1206
  /*                                                                                                                   // 1206
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
  Files.prototype.link = function(fileRef, version, pub) {                                                             // 99
    if (version == null) {                                                                                             //
      version = 'original';                                                                                            //
    }                                                                                                                  //
    if (pub == null) {                                                                                                 //
      pub = false;                                                                                                     //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  // 1218
      console.info('Meteor.Files Debugger: [link()]');                                                                 // 1218
    }                                                                                                                  //
    if (_.isString(fileRef)) {                                                                                         // 1219
      version = fileRef;                                                                                               // 1220
      fileRef = null;                                                                                                  // 1220
    }                                                                                                                  //
    if (!fileRef && !this.currentFile) {                                                                               // 1222
      return '';                                                                                                       // 1222
    }                                                                                                                  //
    return formatFleURL(fileRef || this.currentFile, version, this["public"]);                                         // 1223
  };                                                                                                                   //
                                                                                                                       //
  return Files;                                                                                                        //
                                                                                                                       //
})();                                                                                                                  //
                                                                                                                       //
                                                                                                                       // 1225
/*                                                                                                                     // 1225
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
  var ext, ref, root;                                                                                                  // 1237
  if (version == null) {                                                                                               //
    version = 'original';                                                                                              //
  }                                                                                                                    //
  if (pub == null) {                                                                                                   //
    pub = false;                                                                                                       //
  }                                                                                                                    //
  root = __meteor_runtime_config__.ROOT_URL.replace(/\/+$/, '');                                                       // 1237
  if ((fileRef != null ? (ref = fileRef.extension) != null ? ref.length : void 0 : void 0) > 0) {                      // 1239
    ext = '.' + fileRef.extension;                                                                                     // 1240
  } else {                                                                                                             //
    ext = '';                                                                                                          // 1242
  }                                                                                                                    //
  if (pub) {                                                                                                           // 1244
    return root + (fileRef._downloadRoute + "/" + version + "-" + fileRef._id + ext);                                  // 1245
  } else {                                                                                                             //
    return root + (fileRef._downloadRoute + "/" + fileRef._collectionName + "/" + fileRef._id + "/" + version + "/" + fileRef._id + ext);
  }                                                                                                                    //
};                                                                                                                     // 1236
                                                                                                                       //
if (Meteor.isClient) {                                                                                                 // 1249
                                                                                                                       // 1250
  /*                                                                                                                   // 1250
  @client                                                                                                              //
  @TemplateHelper                                                                                                      //
  @name fileURL                                                                                                        //
  @param {Object} fileRef - File reference object                                                                      //
  @param {String} version - [Optional] Version of file you would like to request                                       //
  @description Get download URL for file by fileRef, even without subscription                                         //
  @example {{fileURL fileRef}}                                                                                         //
  @returns {String}                                                                                                    //
   */                                                                                                                  //
  Template.registerHelper('fileURL', function(fileRef, version) {                                                      // 1250
    var ref;                                                                                                           // 1261
    if (!fileRef || !_.isObject(fileRef)) {                                                                            // 1261
      return void 0;                                                                                                   // 1261
    }                                                                                                                  //
    version = !version || !_.isString(version) ? 'original' : version;                                                 // 1261
    if (fileRef._id) {                                                                                                 // 1263
      return formatFleURL(fileRef, version, !!~((ref = fileRef._storagePath) != null ? typeof ref.indexOf === "function" ? ref.indexOf('../web.browser') : void 0 : void 0));
    } else {                                                                                                           //
      return '';                                                                                                       // 1266
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
