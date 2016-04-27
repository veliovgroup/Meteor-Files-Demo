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

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/files.coffee.js                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var NOOP, Throttle, _insts, bound, cp, fileType, formatFleURL, fs, rcp, request;                                       // 1
                                                                                                                       //
if (Meteor.isServer) {                                                                                                 // 1
                                                                                                                       // 2
  /*                                                                                                                   // 2
  @summary Require NPM packages                                                                                        //
   */                                                                                                                  //
  fs = Npm.require('fs-extra');                                                                                        // 2
  request = Npm.require('request');                                                                                    // 2
  Throttle = Npm.require('throttle');                                                                                  // 2
  fileType = Npm.require('file-type');                                                                                 // 2
  NOOP = function() {};                                                                                                // 2
                                                                                                                       // 11
  /*                                                                                                                   // 11
  @var {object} bound - Meteor.bindEnvironment (Fiber wrapper)                                                         //
   */                                                                                                                  //
  bound = Meteor.bindEnvironment(function(callback) {                                                                  // 2
    return callback();                                                                                                 // 14
  });                                                                                                                  //
}                                                                                                                      //
                                                                                                                       //
                                                                                                                       // 16
/*                                                                                                                     // 16
@private                                                                                                               //
@name _insts                                                                                                           //
@summary Object of FilesCollection instances                                                                           //
 */                                                                                                                    //
                                                                                                                       //
_insts = {};                                                                                                           // 1
                                                                                                                       //
                                                                                                                       // 23
/*                                                                                                                     // 23
@private                                                                                                               //
@name rcp                                                                                                              //
@param {Object} obj - Initial object                                                                                   //
@summary Create object with only needed props                                                                          //
 */                                                                                                                    //
                                                                                                                       //
rcp = function(obj) {                                                                                                  // 1
  var o;                                                                                                               // 30
  o = {                                                                                                                // 30
    currentFile: obj.currentFile,                                                                                      // 31
    search: obj.search,                                                                                                // 31
    storagePath: obj.storagePath,                                                                                      // 31
    collectionName: obj.collectionName,                                                                                // 31
    downloadRoute: obj.downloadRoute,                                                                                  // 31
    chunkSize: obj.chunkSize,                                                                                          // 31
    debug: obj.debug,                                                                                                  // 31
    _prefix: obj._prefix,                                                                                              // 31
    cacheControl: obj.cacheControl,                                                                                    // 31
    versions: obj.versions                                                                                             // 31
  };                                                                                                                   //
  return o;                                                                                                            // 41
};                                                                                                                     // 29
                                                                                                                       //
                                                                                                                       // 43
/*                                                                                                                     // 43
@private                                                                                                               //
@name cp                                                                                                               //
@param {Object} to   - Destination                                                                                     //
@param {Object} from - Source                                                                                          //
@summary Copy-Paste only needed props from one to another object                                                       //
 */                                                                                                                    //
                                                                                                                       //
cp = function(to, from) {                                                                                              // 1
  to.currentFile = from.currentFile;                                                                                   // 51
  to.search = from.search;                                                                                             // 51
  to.storagePath = from.storagePath;                                                                                   // 51
  to.collectionName = from.collectionName;                                                                             // 51
  to.downloadRoute = from.downloadRoute;                                                                               // 51
  to.chunkSize = from.chunkSize;                                                                                       // 51
  to.debug = from.debug;                                                                                               // 51
  to._prefix = from._prefix;                                                                                           // 51
  to.cacheControl = from.cacheControl;                                                                                 // 51
  to.versions = from.versions;                                                                                         // 51
  return to;                                                                                                           // 61
};                                                                                                                     // 50
                                                                                                                       //
                                                                                                                       // 63
/*                                                                                                                     // 63
@locus Anywhere                                                                                                        //
@class FilesCollection                                                                                                 //
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
@summary Create new instance of FilesCollection                                                                        //
 */                                                                                                                    //
                                                                                                                       //
FilesCollection = (function() {                                                                                        // 1
  var FileUpload, UploadInstance;                                                                                      // 96
                                                                                                                       //
  function FilesCollection(config) {                                                                                   // 96
    var _methods, cookie, self;                                                                                        // 97
    if (config) {                                                                                                      // 97
      this.storagePath = config.storagePath, this.collectionName = config.collectionName, this.downloadRoute = config.downloadRoute, this.schema = config.schema, this.chunkSize = config.chunkSize, this.namingFunction = config.namingFunction, this.debug = config.debug, this.onbeforeunloadMessage = config.onbeforeunloadMessage, this.permissions = config.permissions, this.allowClientCode = config.allowClientCode, this.onBeforeUpload = config.onBeforeUpload, this.integrityCheck = config.integrityCheck, this["protected"] = config["protected"], this["public"] = config["public"], this.strict = config.strict, this.downloadCallback = config.downloadCallback, this.cacheControl = config.cacheControl, this.throttle = config.throttle, this.onAfterUpload = config.onAfterUpload, this.interceptDownload = config.interceptDownload;
    }                                                                                                                  //
    self = this;                                                                                                       // 97
    cookie = new Cookies();                                                                                            // 97
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
    this.chunkSize = Math.floor(this.chunkSize / 8) * 8;                                                               // 97
    if (this["public"] && !this.downloadRoute) {                                                                       // 106
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: \"downloadRoute\" must be explicitly provided on \"public\" collections! Note: \"downloadRoute\" must be equal on be inside of your web/proxy-server (relative) root.");
    }                                                                                                                  //
    if (this.downloadRoute == null) {                                                                                  //
      this.downloadRoute = '/cdn/storage';                                                                             //
    }                                                                                                                  //
    this.downloadRoute = this.downloadRoute.replace(/\/$/, '');                                                        // 97
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
    if (Meteor.isClient) {                                                                                             // 116
      if (this.onbeforeunloadMessage == null) {                                                                        //
        this.onbeforeunloadMessage = 'Upload in a progress... Do you want to abort?';                                  //
      }                                                                                                                //
      delete this.strict;                                                                                              // 117
      delete this.throttle;                                                                                            // 117
      delete this.storagePath;                                                                                         // 117
      delete this.permissions;                                                                                         // 117
      delete this.cacheControl;                                                                                        // 117
      delete this.onAfterUpload;                                                                                       // 117
      delete this.integrityCheck;                                                                                      // 117
      delete this.downloadCallback;                                                                                    // 117
      delete this.interceptDownload;                                                                                   // 117
      if (this["protected"]) {                                                                                         // 127
        if (!cookie.has('meteor_login_token') && Meteor._localStorage.getItem('Meteor.loginToken')) {                  // 128
          cookie.set('meteor_login_token', Meteor._localStorage.getItem('Meteor.loginToken'), null, '/');              // 129
        }                                                                                                              //
      }                                                                                                                //
      check(this.onbeforeunloadMessage, Match.OneOf(String, Function));                                                // 117
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
      if (this["public"] && !this.storagePath) {                                                                       // 140
        throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "] \"storagePath\" must be set on \"public\" collections! Note: \"storagePath\" must be equal on be inside of your web/proxy-server (absolute) root.");
      }                                                                                                                //
      if (this.storagePath == null) {                                                                                  //
        this.storagePath = "assets/app/uploads/" + this.collectionName;                                                //
      }                                                                                                                //
      this.storagePath = this.storagePath.replace(/\/$/, '');                                                          // 133
      fs.mkdirsSync(this.storagePath);                                                                                 // 133
      check(this.strict, Boolean);                                                                                     // 133
      check(this.throttle, Match.OneOf(false, Number));                                                                // 133
      check(this.permissions, Number);                                                                                 // 133
      check(this.storagePath, String);                                                                                 // 133
      check(this.cacheControl, String);                                                                                // 133
      check(this.onAfterUpload, Match.OneOf(false, Function));                                                         // 133
      check(this.integrityCheck, Boolean);                                                                             // 133
      check(this.downloadCallback, Match.OneOf(false, Function));                                                      // 133
      check(this.interceptDownload, Match.OneOf(false, Function));                                                     // 133
    }                                                                                                                  //
    if (!this.schema) {                                                                                                // 157
      this.schema = {                                                                                                  // 158
        size: {                                                                                                        // 159
          type: Number                                                                                                 // 159
        },                                                                                                             //
        name: {                                                                                                        // 159
          type: String                                                                                                 // 160
        },                                                                                                             //
        type: {                                                                                                        // 159
          type: String                                                                                                 // 161
        },                                                                                                             //
        path: {                                                                                                        // 159
          type: String                                                                                                 // 162
        },                                                                                                             //
        isVideo: {                                                                                                     // 159
          type: Boolean                                                                                                // 163
        },                                                                                                             //
        isAudio: {                                                                                                     // 159
          type: Boolean                                                                                                // 164
        },                                                                                                             //
        isImage: {                                                                                                     // 159
          type: Boolean                                                                                                // 165
        },                                                                                                             //
        isText: {                                                                                                      // 159
          type: Boolean                                                                                                // 166
        },                                                                                                             //
        _prefix: {                                                                                                     // 159
          type: String                                                                                                 // 167
        },                                                                                                             //
        extension: {                                                                                                   // 159
          type: String,                                                                                                // 169
          optional: true                                                                                               // 169
        },                                                                                                             //
        _storagePath: {                                                                                                // 159
          type: String                                                                                                 // 171
        },                                                                                                             //
        _downloadRoute: {                                                                                              // 159
          type: String                                                                                                 // 172
        },                                                                                                             //
        _collectionName: {                                                                                             // 159
          type: String                                                                                                 // 173
        },                                                                                                             //
        "public": {                                                                                                    // 159
          type: Boolean,                                                                                               // 175
          optional: true                                                                                               // 175
        },                                                                                                             //
        meta: {                                                                                                        // 159
          type: Object,                                                                                                // 178
          blackbox: true,                                                                                              // 178
          optional: true                                                                                               // 178
        },                                                                                                             //
        userId: {                                                                                                      // 159
          type: String,                                                                                                // 182
          optional: true                                                                                               // 182
        },                                                                                                             //
        updatedAt: {                                                                                                   // 159
          type: Date,                                                                                                  // 185
          autoValue: function() {                                                                                      // 185
            return new Date();                                                                                         //
          }                                                                                                            //
        },                                                                                                             //
        versions: {                                                                                                    // 159
          type: Object,                                                                                                // 188
          blackbox: true                                                                                               // 188
        }                                                                                                              //
      };                                                                                                               //
    }                                                                                                                  //
    check(this.debug, Boolean);                                                                                        // 97
    check(this.schema, Object);                                                                                        // 97
    check(this["public"], Boolean);                                                                                    // 97
    check(this["protected"], Match.OneOf(Boolean, Function));                                                          // 97
    check(this.chunkSize, Number);                                                                                     // 97
    check(this.downloadRoute, String);                                                                                 // 97
    check(this.collectionName, String);                                                                                // 97
    check(this.namingFunction, Function);                                                                              // 97
    check(this.onBeforeUpload, Match.OneOf(false, Function));                                                          // 97
    check(this.allowClientCode, Boolean);                                                                              // 97
    if (this["public"] && this["protected"]) {                                                                         // 202
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: Files can not be public and protected at the same time!");
    }                                                                                                                  //
    this.cursor = null;                                                                                                // 97
    this.search = {};                                                                                                  // 97
    this.collection = new Mongo.Collection(this.collectionName);                                                       // 97
    this.currentFile = null;                                                                                           // 97
    this._prefix = SHA256(this.collectionName + this.downloadRoute);                                                   // 97
    _insts[this._prefix] = this;                                                                                       // 97
    this.checkAccess = function(http) {                                                                                // 97
      var rc, result, text, user, userFuncs, userId;                                                                   // 214
      if (self["protected"]) {                                                                                         // 214
        user = false;                                                                                                  // 215
        userFuncs = self.getUser(http);                                                                                // 215
        user = userFuncs.user, userId = userFuncs.userId;                                                              // 215
        user = user();                                                                                                 // 215
        if (_.isFunction(self["protected"])) {                                                                         // 220
          result = http ? self["protected"].call(_.extend(http, userFuncs), self.currentFile || null) : self["protected"].call(userFuncs, self.currentFile || null);
        } else {                                                                                                       //
          result = !!user;                                                                                             // 223
        }                                                                                                              //
        if ((http && result === true) || !http) {                                                                      // 225
          return true;                                                                                                 // 226
        } else {                                                                                                       //
          rc = _.isNumber(result) ? result : 401;                                                                      // 228
          if (self.debug) {                                                                                            // 229
            console.warn('[FilesCollection.checkAccess] WARN: Access denied!');                                        // 229
          }                                                                                                            //
          if (http) {                                                                                                  // 230
            text = 'Access denied!';                                                                                   // 231
            http.response.writeHead(rc, {                                                                              // 231
              'Content-Length': text.length,                                                                           // 233
              'Content-Type': 'text/plain'                                                                             // 233
            });                                                                                                        //
            http.response.end(text);                                                                                   // 231
          }                                                                                                            //
          return false;                                                                                                // 236
        }                                                                                                              //
      } else {                                                                                                         //
        return true;                                                                                                   // 238
      }                                                                                                                //
    };                                                                                                                 //
    this.methodNames = {                                                                                               // 97
      MeteorFileAbort: "MeteorFileAbort" + this._prefix,                                                               // 241
      MeteorFileWrite: "MeteorFileWrite" + this._prefix,                                                               // 241
      MeteorFileUnlink: "MeteorFileUnlink" + this._prefix                                                              // 241
    };                                                                                                                 //
    if (Meteor.isServer) {                                                                                             // 245
      WebApp.connectHandlers.use(function(request, response, next) {                                                   // 246
        var _file, http, params, uri, uris, version;                                                                   // 247
        if (!self["public"]) {                                                                                         // 247
          if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName)) {                    // 248
            uri = request._parsedUrl.path.replace(self.downloadRoute + "/" + self.collectionName, '');                 // 249
            if (uri.indexOf('/') === 0) {                                                                              // 250
              uri = uri.substring(1);                                                                                  // 251
            }                                                                                                          //
            uris = uri.split('/');                                                                                     // 249
            if (uris.length === 3) {                                                                                   // 254
              params = {                                                                                               // 255
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                _id: uris[0],                                                                                          // 256
                version: uris[1],                                                                                      // 256
                name: uris[2]                                                                                          // 256
              };                                                                                                       //
              http = {                                                                                                 // 255
                request: request,                                                                                      // 260
                response: response,                                                                                    // 260
                params: params                                                                                         // 260
              };                                                                                                       //
              if (self.checkAccess(http)) {                                                                            // 261
                self.findOne(uris[0]).download.call(self, http, uris[1]);                                              // 261
              }                                                                                                        //
            } else {                                                                                                   //
              next();                                                                                                  // 263
            }                                                                                                          //
          } else {                                                                                                     //
            next();                                                                                                    // 265
          }                                                                                                            //
        } else {                                                                                                       //
          if (!!~request._parsedUrl.path.indexOf("" + self.downloadRoute)) {                                           // 267
            uri = request._parsedUrl.path.replace("" + self.downloadRoute, '');                                        // 268
            if (uri.indexOf('/') === 0) {                                                                              // 269
              uri = uri.substring(1);                                                                                  // 270
            }                                                                                                          //
            uris = uri.split('/');                                                                                     // 268
            _file = uris[uris.length - 1];                                                                             // 268
            if (_file) {                                                                                               // 274
              if (!!~_file.indexOf('-')) {                                                                             // 275
                version = _file.split('-')[0];                                                                         // 276
                _file = _file.split('-')[1].split('?')[0];                                                             // 276
              } else {                                                                                                 //
                version = 'original';                                                                                  // 279
                _file = _file.split('?')[0];                                                                           // 279
              }                                                                                                        //
              params = {                                                                                               // 275
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                file: _file,                                                                                           // 283
                _id: _file.split('.')[0],                                                                              // 283
                version: version,                                                                                      // 283
                name: _file                                                                                            // 283
              };                                                                                                       //
              http = {                                                                                                 // 275
                request: request,                                                                                      // 288
                response: response,                                                                                    // 288
                params: params                                                                                         // 288
              };                                                                                                       //
              self.findOne(params._id).download.call(self, http, version);                                             // 275
            } else {                                                                                                   //
              next();                                                                                                  // 291
            }                                                                                                          //
          } else {                                                                                                     //
            next();                                                                                                    // 293
          }                                                                                                            //
        }                                                                                                              //
      });                                                                                                              //
      _methods = {};                                                                                                   // 246
      _methods[self.methodNames.MeteorFileUnlink] = function(inst) {                                                   // 246
        check(inst, Object);                                                                                           // 298
        if (self.debug) {                                                                                              // 299
          console.info('[FilesCollection] [Unlink Method]');                                                           // 299
        }                                                                                                              //
        if (self.allowClientCode) {                                                                                    // 300
          return self.remove.call(cp(_insts[inst._prefix], inst), inst.search);                                        //
        } else {                                                                                                       //
          throw new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!');              // 303
        }                                                                                                              //
      };                                                                                                               //
      _methods[self.methodNames.MeteorFileWrite] = function(opts) {                                                    // 246
        var action, e, extension, extensionWithDot, fileName, isUploadAllowed, path, pathName, pathPart, ref, result;  // 306
        this.unblock();                                                                                                // 306
        check(opts, {                                                                                                  // 306
          eof: Match.Optional(Boolean),                                                                                // 307
          meta: Match.Optional(Object),                                                                                // 307
          file: Object,                                                                                                // 307
          fileId: String,                                                                                              // 307
          binData: Match.Optional(String),                                                                             // 307
          chunkId: Match.Optional(Number),                                                                             // 307
          fileLength: Number                                                                                           // 307
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
        if (self.debug) {                                                                                              // 322
          console.info("[FilesCollection] [Write Method] Got #" + opts.chunkId + "/" + opts.fileLength + " chunks, dst: " + (opts.file.name || opts.file.fileName));
        }                                                                                                              //
        if (self.onBeforeUpload && _.isFunction(self.onBeforeUpload)) {                                                // 324
          isUploadAllowed = self.onBeforeUpload.call({                                                                 // 325
            file: opts.file                                                                                            // 325
          }, opts.file);                                                                                               //
          if (isUploadAllowed !== true) {                                                                              // 326
            throw new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : '@onBeforeUpload() returned false');
          }                                                                                                            //
        }                                                                                                              //
        fileName = self.getFileName(opts.file);                                                                        // 306
        ref = self.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;               // 306
        pathName = self.storagePath + "/" + opts.fileId;                                                               // 306
        path = self.storagePath + "/" + opts.fileId + extensionWithDot;                                                // 306
        pathPart = opts.fileLength > 1 ? pathName + "_" + opts.chunkId + extensionWithDot : null;                      // 306
        result = _.extend(self.dataToSchema(_.extend(opts.file, {                                                      // 306
          path: path,                                                                                                  // 336
          extension: extension,                                                                                        // 336
          name: fileName,                                                                                              // 336
          meta: opts.meta                                                                                              // 336
        })), {                                                                                                         //
          _id: opts.fileId                                                                                             // 336
        });                                                                                                            //
        action = function(cb) {                                                                                        // 306
          var _path, binary, concatChunks, e, finish, tries;                                                           // 339
          if (opts.eof) {                                                                                              // 339
            binary = opts.binData;                                                                                     // 340
          } else {                                                                                                     //
            binary = new Buffer(opts.binData, 'base64');                                                               // 342
          }                                                                                                            //
          tries = 0;                                                                                                   // 339
          concatChunks = function(num, files, cb) {                                                                    // 339
            var _path, _source, findex, sindex;                                                                        // 346
            sindex = files.indexOf(opts.fileId + "_1" + extensionWithDot);                                             // 346
            if (!!~sindex) {                                                                                           // 347
              files.splice(sindex, 1);                                                                                 // 347
            }                                                                                                          //
            findex = files.indexOf(opts.fileId + "_" + num + extensionWithDot);                                        // 346
            if (!!~findex) {                                                                                           // 349
              files.splice(findex, 1);                                                                                 // 350
            } else if (files.length <= 0) {                                                                            //
              return finish(cb);                                                                                       // 352
            } else {                                                                                                   //
              return concatChunks(++num, files, cb);                                                                   // 354
            }                                                                                                          //
            _path = pathName + "_" + num + extensionWithDot;                                                           // 346
            _source = pathName + '_1' + extensionWithDot;                                                              // 346
            return fs.stat(_path, function(error, stats) {                                                             //
              return bound(function() {                                                                                //
                if (error || !stats.isFile()) {                                                                        // 360
                  if (tries >= 10) {                                                                                   // 361
                    return cb(new Meteor.Error(500, "Chunk #" + num + " is missing!"));                                //
                  } else {                                                                                             //
                    tries++;                                                                                           // 364
                    return Meteor.setTimeout(function() {                                                              //
                      return concatChunks(num, files, cb);                                                             //
                    }, 100);                                                                                           //
                  }                                                                                                    //
                } else {                                                                                               //
                  return fs.readFile(_path, function(error, _chunkData) {                                              //
                    return bound(function() {                                                                          //
                      if (error) {                                                                                     // 370
                        return cb(new Meteor.Error(500, "Can't read " + _path));                                       //
                      } else {                                                                                         //
                        return fs.appendFile(_source, _chunkData, function(error) {                                    //
                          return bound(function() {                                                                    //
                            if (error) {                                                                               // 374
                              return cb(new Meteor.Error(500, "Can't append " + _path + " to " + _source));            //
                            } else {                                                                                   //
                              fs.unlink(_path, NOOP);                                                                  // 377
                              if (files.length <= 0) {                                                                 // 378
                                return fs.rename(_source, path, function(error) {                                      //
                                  return bound(function() {                                                            //
                                    if (error) {                                                                       // 380
                                      return cb(new Meteor.Error(500, "Can't rename " + _source + " to " + path));     //
                                    } else {                                                                           //
                                      return finish(cb);                                                               //
                                    }                                                                                  //
                                  });                                                                                  //
                                });                                                                                    //
                              } else {                                                                                 //
                                return concatChunks(++num, files, cb);                                                 //
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
          finish = function(cb) {                                                                                      // 339
            fs.chmod(path, self.permissions, NOOP);                                                                    // 388
            result.type = self.getMimeType(opts.file);                                                                 // 388
            result["public"] = self["public"];                                                                         // 388
            return self.collection.insert(_.clone(result), function(error, _id) {                                      //
              if (error) {                                                                                             // 393
                return cb(new Meteor.Error(500, error));                                                               //
              } else {                                                                                                 //
                result._id = _id;                                                                                      // 396
                if (self.debug) {                                                                                      // 397
                  console.info("[FilesCollection] [Write Method] [finish] " + fileName + " -> " + path);               // 397
                }                                                                                                      //
                self.onAfterUpload && self.onAfterUpload.call(self, result);                                           // 396
                return cb(null, result);                                                                               //
              }                                                                                                        //
            });                                                                                                        //
          };                                                                                                           //
          try {                                                                                                        // 400
            if (opts.eof) {                                                                                            // 401
              if (opts.fileLength > 1) {                                                                               // 402
                fs.readdir(self.storagePath, function(error, files) {                                                  // 403
                  return bound(function() {                                                                            //
                    if (error) {                                                                                       // 404
                      return cb(new Meteor.Error(500, error));                                                         //
                    } else {                                                                                           //
                      files = files.filter(function(f) {                                                               // 407
                        return !!~f.indexOf(opts.fileId);                                                              //
                      });                                                                                              //
                      if (files.length === 1) {                                                                        // 408
                        return fs.rename(self.storagePath + "/" + files[0], path, function(error) {                    //
                          return bound(function() {                                                                    //
                            if (error) {                                                                               // 410
                              return cb(new Meteor.Error(500, "Can't rename " + self.storagePath + "/" + files[0] + " to " + path));
                            } else {                                                                                   //
                              return finish(cb);                                                                       //
                            }                                                                                          //
                          });                                                                                          //
                        });                                                                                            //
                      } else {                                                                                         //
                        return concatChunks(2, files, cb);                                                             //
                      }                                                                                                //
                    }                                                                                                  //
                  });                                                                                                  //
                });                                                                                                    //
              } else {                                                                                                 //
                finish(cb);                                                                                            // 417
              }                                                                                                        //
            } else {                                                                                                   //
              if (pathPart) {                                                                                          // 419
                _path = opts.fileLength > 1 ? pathName + "_" + (opts.chunkId - 1) + extensionWithDot : void 0;         // 420
                fs.stat(_path, function(error, stats) {                                                                // 420
                  return bound(function() {                                                                            //
                    if (error || !stats.isFile()) {                                                                    // 422
                      return fs.outputFile(pathPart || path, binary, 'binary', function(error) {                       //
                        return bound(function() {                                                                      //
                          return cb(error, result);                                                                    //
                        });                                                                                            //
                      });                                                                                              //
                    } else {                                                                                           //
                      return fs.appendFile(_path, binary, function(error) {                                            //
                        return bound(function() {                                                                      //
                          return fs.rename(_path, pathName + "_" + opts.chunkId + extensionWithDot, function(error) {  //
                            return bound(function() {                                                                  //
                              return cb(error, result);                                                                //
                            });                                                                                        //
                          });                                                                                          //
                        });                                                                                            //
                      });                                                                                              //
                    }                                                                                                  //
                  });                                                                                                  //
                });                                                                                                    //
              } else {                                                                                                 //
                fs.outputFile(pathPart || path, binary, 'binary', function(error) {                                    // 430
                  return bound(function() {                                                                            //
                    return cb(error, result);                                                                          //
                  });                                                                                                  //
                });                                                                                                    //
              }                                                                                                        //
            }                                                                                                          //
          } catch (_error) {                                                                                           //
            e = _error;                                                                                                // 432
            cb(e);                                                                                                     // 432
          }                                                                                                            //
        };                                                                                                             //
        if (opts.eof) {                                                                                                // 435
          try {                                                                                                        // 436
            return Meteor.wrapAsync(action)();                                                                         // 437
          } catch (_error) {                                                                                           //
            e = _error;                                                                                                // 439
            if (self.debug) {                                                                                          // 439
              console.warn("[FilesCollection] [Write Method] Exception:", e);                                          // 439
            }                                                                                                          //
            throw e;                                                                                                   // 440
          }                                                                                                            //
        } else {                                                                                                       //
          process.nextTick(function() {                                                                                // 442
            return action(NOOP);                                                                                       //
          });                                                                                                          //
          return result;                                                                                               // 443
        }                                                                                                              //
      };                                                                                                               //
      _methods[self.methodNames.MeteorFileAbort] = function(opts) {                                                    // 246
        var _path, allowed, ext, i, path;                                                                              // 446
        check(opts, {                                                                                                  // 446
          fileId: String,                                                                                              // 446
          fileData: Object,                                                                                            // 446
          fileLength: Number                                                                                           // 446
        });                                                                                                            //
        ext = "." + opts.fileData.ext;                                                                                 // 446
        path = self.storagePath + "/" + opts.fileId;                                                                   // 446
        if (self.debug) {                                                                                              // 455
          console.info("[FilesCollection] [Abort Method]: For " + path);                                               // 455
        }                                                                                                              //
        if (opts.fileLength > 1) {                                                                                     // 456
          allowed = false;                                                                                             // 457
          i = 0;                                                                                                       // 457
          while (i <= opts.fileLength) {                                                                               // 459
            _path = path + "_" + i + ext;                                                                              // 460
            fs.stat(_path, (function(error, stats) {                                                                   // 460
              return bound((function(_this) {                                                                          //
                return function() {                                                                                    //
                  if (!error && stats.isFile()) {                                                                      // 462
                    allowed = true;                                                                                    // 463
                    return fs.unlink(_this._path, NOOP);                                                               //
                  }                                                                                                    //
                };                                                                                                     //
              })(this));                                                                                               //
            }).bind({                                                                                                  //
              _path: _path                                                                                             // 465
            }));                                                                                                       //
            i++;                                                                                                       // 460
          }                                                                                                            //
          return Meteor.setTimeout(function() {                                                                        //
            if (allowed) {                                                                                             // 469
              return self.remove(opts.fileId);                                                                         //
            }                                                                                                          //
          }, 250);                                                                                                     //
        }                                                                                                              //
      };                                                                                                               //
      Meteor.methods(_methods);                                                                                        // 246
    }                                                                                                                  //
  }                                                                                                                    //
                                                                                                                       //
                                                                                                                       // 474
  /*                                                                                                                   // 474
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name getMimeType                                                                                                    //
  @param {Object} fileData - File Object                                                                               //
  @summary Returns file's mime-type                                                                                    //
  @returns {String}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.getMimeType = function(fileData) {                                                         // 96
    var br, buf, error, ext, fd, mime, ref;                                                                            // 483
    check(fileData, Object);                                                                                           // 483
    if (fileData != null ? fileData.type : void 0) {                                                                   // 484
      mime = fileData.type;                                                                                            // 484
    }                                                                                                                  //
    if (Meteor.isServer && fileData.path && (!mime || !_.isString(mime))) {                                            // 485
      try {                                                                                                            // 486
        buf = new Buffer(262);                                                                                         // 487
        fd = fs.openSync(fileData.path, 'r');                                                                          // 487
        br = fs.readSync(fd, buf, 0, 262, 0);                                                                          // 487
        fs.close(fd, NOOP);                                                                                            // 487
        if (br < 262) {                                                                                                // 491
          buf = buf.slice(0, br);                                                                                      // 491
        }                                                                                                              //
        ref = fileType(buf), mime = ref.mime, ext = ref.ext;                                                           // 487
      } catch (_error) {                                                                                               //
        error = _error;                                                                                                // 493
      }                                                                                                                //
    }                                                                                                                  //
    if (!mime || !_.isString(mime)) {                                                                                  // 494
      mime = 'application/octet-stream';                                                                               // 495
    }                                                                                                                  //
    return mime;                                                                                                       //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 498
  /*                                                                                                                   // 498
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name getFileName                                                                                                    //
  @param {Object} fileData - File Object                                                                               //
  @summary Returns file's name                                                                                         //
  @returns {String}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.getFileName = function(fileData) {                                                         // 96
    var cleanName, fileName;                                                                                           // 507
    fileName = fileData.name || fileData.fileName;                                                                     // 507
    if (_.isString(fileName) && fileName.length > 0) {                                                                 // 508
      cleanName = function(str) {                                                                                      // 509
        return str.replace(/\.\./g, '').replace(/\//g, '');                                                            //
      };                                                                                                               //
      return cleanName(fileData.name || fileData.fileName);                                                            // 510
    } else {                                                                                                           //
      return '';                                                                                                       // 512
    }                                                                                                                  //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 514
  /*                                                                                                                   // 514
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name getUser                                                                                                        //
  @summary Returns object with `userId` and `user()` method which return user's object                                 //
  @returns {Object}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.getUser = function(http) {                                                                 // 96
    var cookie, result, user;                                                                                          // 522
    result = {                                                                                                         // 522
      user: function() {                                                                                               // 523
        return null;                                                                                                   // 523
      },                                                                                                               //
      userId: null                                                                                                     // 523
    };                                                                                                                 //
    if (Meteor.isServer) {                                                                                             // 526
      if (http) {                                                                                                      // 527
        cookie = http.request.Cookies;                                                                                 // 528
        if (_.has(Package, 'accounts-base') && cookie.has('meteor_login_token')) {                                     // 529
          user = Meteor.users.findOne({                                                                                // 530
            'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(cookie.get('meteor_login_token'))      // 530
          });                                                                                                          //
          if (user) {                                                                                                  // 531
            result.user = function() {                                                                                 // 532
              return user;                                                                                             // 532
            };                                                                                                         //
            result.userId = user._id;                                                                                  // 532
          }                                                                                                            //
        }                                                                                                              //
      }                                                                                                                //
    } else {                                                                                                           //
      if (_.has(Package, 'accounts-base') && Meteor.userId()) {                                                        // 535
        result.user = function() {                                                                                     // 536
          return Meteor.user();                                                                                        // 536
        };                                                                                                             //
        result.userId = Meteor.userId();                                                                               // 536
      }                                                                                                                //
    }                                                                                                                  //
    return result;                                                                                                     // 539
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 541
  /*                                                                                                                   // 541
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name getExt                                                                                                         //
  @param {String} FileName - File name                                                                                 //
  @summary Get extension from FileName                                                                                 //
  @returns {Object}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.getExt = function(fileName) {                                                              // 96
    var extension;                                                                                                     // 550
    if (!!~fileName.indexOf('.')) {                                                                                    // 550
      extension = fileName.split('.').pop();                                                                           // 551
      return {                                                                                                         // 552
        ext: extension,                                                                                                // 552
        extension: extension,                                                                                          // 552
        extensionWithDot: '.' + extension                                                                              // 552
      };                                                                                                               //
    } else {                                                                                                           //
      return {                                                                                                         // 554
        ext: '',                                                                                                       // 554
        extension: '',                                                                                                 // 554
        extensionWithDot: ''                                                                                           // 554
      };                                                                                                               //
    }                                                                                                                  //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 556
  /*                                                                                                                   // 556
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name dataToSchema                                                                                                   //
  @param {Object} data - File data                                                                                     //
  @summary Build object in accordance with schema from File data                                                       //
  @returns {Object}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.dataToSchema = function(data) {                                                            // 96
    return {                                                                                                           // 565
      name: data.name,                                                                                                 // 565
      extension: data.extension,                                                                                       // 565
      path: data.path,                                                                                                 // 565
      meta: data.meta,                                                                                                 // 565
      type: data.type,                                                                                                 // 565
      size: data.size,                                                                                                 // 565
      versions: {                                                                                                      // 565
        original: {                                                                                                    // 573
          path: data.path,                                                                                             // 574
          size: data.size,                                                                                             // 574
          type: data.type,                                                                                             // 574
          extension: data.extension                                                                                    // 574
        }                                                                                                              //
      },                                                                                                               //
      isVideo: !!~data.type.toLowerCase().indexOf('video'),                                                            // 565
      isAudio: !!~data.type.toLowerCase().indexOf('audio'),                                                            // 565
      isImage: !!~data.type.toLowerCase().indexOf('image'),                                                            // 565
      isText: !!~data.type.toLowerCase().indexOf('text'),                                                              // 565
      _prefix: data._prefix || this._prefix,                                                                           // 565
      _storagePath: data._storagePath || this.storagePath,                                                             // 565
      _downloadRoute: data._downloadRoute || this.downloadRoute,                                                       // 565
      _collectionName: data._collectionName || this.collectionName                                                     // 565
    };                                                                                                                 //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 588
  /*                                                                                                                   // 588
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name srch                                                                                                           //
  @param {String|Object} search - Search data                                                                          //
  @summary Build search object                                                                                         //
  @returns {Object}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.srch = function(search) {                                                                  // 96
    if (search && _.isString(search)) {                                                                                // 597
      this.search = {                                                                                                  // 598
        _id: search                                                                                                    // 599
      };                                                                                                               //
    } else {                                                                                                           //
      this.search = search || {};                                                                                      // 601
    }                                                                                                                  //
    return this.search;                                                                                                //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 604
  /*                                                                                                                   // 604
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name write                                                                                                          //
  @param {Buffer} buffer - Binary File's Buffer                                                                        //
  @param {Object} opts - {fileName: '', type: '', size: 0, meta: {...}}                                                //
  @param {Function} callback - function(error, fileObj){...}                                                           //
  @summary Write buffer to FS and add to FilesCollection Collection                                                    //
  @returns {Files} - Returns current FilesCollection instance                                                          //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.write = Meteor.isServer ? function(buffer, opts, callback) {                               // 96
    var extension, extensionWithDot, fileName, path, randFileName, ref, result;                                        // 615
    if (opts == null) {                                                                                                //
      opts = {};                                                                                                       //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  // 615
      console.info("[FilesCollection] [write()]");                                                                     // 615
    }                                                                                                                  //
    check(opts, Match.Optional(Object));                                                                               // 615
    check(callback, Match.Optional(Function));                                                                         // 615
    if (this.checkAccess()) {                                                                                          // 619
      randFileName = this.namingFunction();                                                                            // 620
      fileName = opts.name || opts.fileName ? opts.name || opts.fileName : randFileName;                               // 620
      ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                 // 620
      path = this.storagePath + "/" + randFileName + extensionWithDot;                                                 // 620
      opts.type = this.getMimeType(opts);                                                                              // 620
      if (!opts.meta) {                                                                                                // 628
        opts.meta = {};                                                                                                // 628
      }                                                                                                                //
      if (!opts.size) {                                                                                                // 629
        opts.size = buffer.length;                                                                                     // 629
      }                                                                                                                //
      result = this.dataToSchema({                                                                                     // 620
        name: fileName,                                                                                                // 632
        path: path,                                                                                                    // 632
        meta: opts.meta,                                                                                               // 632
        type: opts.type,                                                                                               // 632
        size: opts.size,                                                                                               // 632
        extension: extension                                                                                           // 632
      });                                                                                                              //
      if (this.debug) {                                                                                                // 639
        console.info("[FilesCollection] [write]: " + fileName + " -> " + this.collectionName);                         // 639
      }                                                                                                                //
      fs.outputFile(path, buffer, 'binary', function(error) {                                                          // 620
        return bound(function() {                                                                                      //
          if (error) {                                                                                                 // 642
            return callback && callback(error);                                                                        //
          } else {                                                                                                     //
            result._id = this.collection.insert(_.clone(result));                                                      // 645
            return callback && callback(null, result);                                                                 //
          }                                                                                                            //
        });                                                                                                            //
      });                                                                                                              //
      return this;                                                                                                     // 648
    }                                                                                                                  //
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 652
  /*                                                                                                                   // 652
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name load                                                                                                           //
  @param {String} url - URL to file                                                                                    //
  @param {Object} opts - {fileName: '', meta: {...}}                                                                   //
  @param {Function} callback - function(error, fileObj){...}                                                           //
  @summary Download file, write stream to FS and add to FilesCollection Collection                                     //
  @returns {Files} - Return this                                                                                       //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.load = Meteor.isServer ? function(url, opts, callback) {                                   // 96
    var extension, extensionWithDot, fileName, path, randFileName, ref, self;                                          // 663
    if (opts == null) {                                                                                                //
      opts = {};                                                                                                       //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  // 663
      console.info("[FilesCollection] [load(" + url + ", " + (JSON.stringify(opts)) + ", callback)]");                 // 663
    }                                                                                                                  //
    check(url, String);                                                                                                // 663
    check(opts, Match.Optional(Object));                                                                               // 663
    check(callback, Match.Optional(Function));                                                                         // 663
    self = this;                                                                                                       // 663
    randFileName = this.namingFunction();                                                                              // 663
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : randFileName;                                 // 663
    ref = this.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                   // 663
    path = this.storagePath + "/" + randFileName + extensionWithDot;                                                   // 663
    if (!opts.meta) {                                                                                                  // 674
      opts.meta = {};                                                                                                  // 674
    }                                                                                                                  //
    request.get(url).on('error', function(error) {                                                                     // 663
      return bound(function() {                                                                                        //
        throw new Meteor.Error(500, ("Error on [load(" + url + ")]:") + JSON.stringify(error));                        // 677
      });                                                                                                              //
    }).on('response', function(response) {                                                                             //
      return bound(function() {                                                                                        //
        var result;                                                                                                    // 680
        if (self.debug) {                                                                                              // 680
          console.info("[FilesCollection] [load] Received: " + url);                                                   // 680
        }                                                                                                              //
        result = self.dataToSchema({                                                                                   // 680
          name: fileName,                                                                                              // 683
          path: path,                                                                                                  // 683
          meta: opts.meta,                                                                                             // 683
          type: opts.type || response.headers['content-type'],                                                         // 683
          size: opts.size || response.headers['content-length'],                                                       // 683
          extension: extension                                                                                         // 683
        });                                                                                                            //
        return self.collection.insert(_.clone(result), function(error, fileRef) {                                      //
          if (error) {                                                                                                 // 691
            if (self.debug) {                                                                                          // 692
              console.warn("[FilesCollection] [load] [insert] Error: " + fileName + " -> " + self.collectionName, error);
            }                                                                                                          //
            return callback && callback(error);                                                                        //
          } else {                                                                                                     //
            if (self.debug) {                                                                                          // 695
              console.info("[FilesCollection] [load] [insert] " + fileName + " -> " + self.collectionName);            // 695
            }                                                                                                          //
            return callback && callback(null, fileRef);                                                                //
          }                                                                                                            //
        });                                                                                                            //
      });                                                                                                              //
    }).pipe(fs.createWriteStream(path, {                                                                               //
      flags: 'w'                                                                                                       // 697
    }));                                                                                                               //
    return this;                                                                                                       // 699
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 703
  /*                                                                                                                   // 703
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name addFile                                                                                                        //
  @param {String} path - Path to file                                                                                  //
  @param {String} path - Path to file                                                                                  //
  @summary Add file from FS to FilesCollection                                                                         //
  @returns {Files} - Return this                                                                                       //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.addFile = Meteor.isServer ? function(path, opts, callback) {                               // 96
    var self;                                                                                                          // 713
    if (opts == null) {                                                                                                //
      opts = {};                                                                                                       //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  // 713
      console.info("[FilesCollection] [addFile(" + path + ")]");                                                       // 713
    }                                                                                                                  //
    if (this["public"]) {                                                                                              // 715
      throw new Meteor.Error(403, 'Can not run [addFile] on public collection! Just Move file to root of your server, then add record to Collection');
    }                                                                                                                  //
    check(path, String);                                                                                               // 713
    check(opts, Match.Optional(Object));                                                                               // 713
    check(callback, Match.Optional(Function));                                                                         // 713
    self = this;                                                                                                       // 713
    fs.stat(path, function(error, stats) {                                                                             // 713
      return bound(function() {                                                                                        //
        var _cn, extension, extensionWithDot, fileName, pathParts, ref, result;                                        // 722
        if (error) {                                                                                                   // 722
          return callback && callback(error);                                                                          //
        } else if (stats.isFile()) {                                                                                   //
          pathParts = path.split('/');                                                                                 // 725
          fileName = pathParts[pathParts.length - 1];                                                                  // 725
          ref = self.getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;             // 725
          if (!opts.type) {                                                                                            // 730
            opts.type = 'application/*';                                                                               // 730
          }                                                                                                            //
          if (!opts.meta) {                                                                                            // 731
            opts.meta = {};                                                                                            // 731
          }                                                                                                            //
          if (!opts.size) {                                                                                            // 732
            opts.size = stats.size;                                                                                    // 732
          }                                                                                                            //
          result = self.dataToSchema({                                                                                 // 725
            name: fileName,                                                                                            // 735
            path: path,                                                                                                // 735
            meta: opts.meta,                                                                                           // 735
            type: opts.type,                                                                                           // 735
            size: opts.size,                                                                                           // 735
            extension: extension,                                                                                      // 735
            _storagePath: path.replace("/" + fileName, '')                                                             // 735
          });                                                                                                          //
          _cn = self.collectionName;                                                                                   // 725
          return self.collection.insert(_.clone(result), function(error, record) {                                     //
            if (error) {                                                                                               // 745
              if (self.debug) {                                                                                        // 746
                console.warn("[FilesCollection] [addFile] [insert] Error: " + fileName + " -> " + _cn, error);         // 746
              }                                                                                                        //
              return callback && callback(error);                                                                      //
            } else {                                                                                                   //
              if (self.debug) {                                                                                        // 749
                console.info("[FilesCollection] [addFile] [insert]: " + fileName + " -> " + _cn);                      // 749
              }                                                                                                        //
              return callback && callback(null, result);                                                               //
            }                                                                                                          //
          });                                                                                                          //
        } else {                                                                                                       //
          return callback && callback(new Meteor.Error(400, "[FilesCollection] [addFile(" + path + ")]: File does not exist"));
        }                                                                                                              //
      });                                                                                                              //
    });                                                                                                                //
    return this;                                                                                                       // 754
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 758
  /*                                                                                                                   // 758
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name findOne                                                                                                        //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                     //
  @summary Load file                                                                                                   //
  @returns {Files} - Return this                                                                                       //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.findOne = function(search) {                                                               // 96
    if (this.debug) {                                                                                                  // 767
      console.info("[FilesCollection] [findOne(" + (JSON.stringify(search)) + ")]");                                   // 767
    }                                                                                                                  //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                        // 767
    this.srch(search);                                                                                                 // 767
    if (this.checkAccess()) {                                                                                          // 771
      this.currentFile = this.collection.findOne(this.search);                                                         // 772
      this.cursor = null;                                                                                              // 772
    }                                                                                                                  //
    return this;                                                                                                       // 774
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 776
  /*                                                                                                                   // 776
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name find                                                                                                           //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                     //
  @summary Load file or bunch of files                                                                                 //
  @returns {Files} - Return this                                                                                       //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.find = function(search) {                                                                  // 96
    if (this.debug) {                                                                                                  // 785
      console.info("[FilesCollection] [find(" + (JSON.stringify(search)) + ")]");                                      // 785
    }                                                                                                                  //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                        // 785
    this.srch(search);                                                                                                 // 785
    if (this.checkAccess) {                                                                                            // 789
      this.currentFile = null;                                                                                         // 790
      this.cursor = this.collection.find(this.search);                                                                 // 790
    }                                                                                                                  //
    return this;                                                                                                       // 792
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 794
  /*                                                                                                                   // 794
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name get                                                                                                            //
  @summary Return value of current cursor or file                                                                      //
  @returns {Object|[Object]}                                                                                           //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.get = function() {                                                                         // 96
    if (this.debug) {                                                                                                  // 802
      console.info('[FilesCollection] [get()]');                                                                       // 802
    }                                                                                                                  //
    if (this.cursor) {                                                                                                 // 803
      return this.cursor.fetch();                                                                                      // 803
    }                                                                                                                  //
    return this.currentFile;                                                                                           // 804
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 806
  /*                                                                                                                   // 806
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name fetch                                                                                                          //
  @summary Alias for `get()` method                                                                                    //
  @returns {[Object]}                                                                                                  //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.fetch = function() {                                                                       // 96
    var data;                                                                                                          // 814
    if (this.debug) {                                                                                                  // 814
      console.info('[FilesCollection] [fetch()]');                                                                     // 814
    }                                                                                                                  //
    data = this.get();                                                                                                 // 814
    if (!_.isArray(data)) {                                                                                            // 816
      return [data];                                                                                                   // 817
    } else {                                                                                                           //
      return data;                                                                                                     //
    }                                                                                                                  //
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 821
  /*                                                                                                                   // 821
  @locus Client                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name insert                                                                                                         //
  @see https://developer.mozilla.org/en-US/docs/Web/API/FileReader                                                     //
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
  @summary Upload file to server over DDP                                                                              //
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
  FilesCollection.prototype.insert = Meteor.isClient ? function(config) {                                              // 96
    if (this.checkAccess()) {                                                                                          // 850
      return (new this._UploadInstance(config, this)).start();                                                         // 851
    } else {                                                                                                           //
      throw new Meteor.Error(401, "[FilesCollection] [insert] Access Denied");                                         // 853
    }                                                                                                                  //
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 856
  /*                                                                                                                   // 856
  @locus Client                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name _UploadInstance                                                                                                //
  @class UploadInstance                                                                                                //
  @summary Internal Class, used in upload                                                                              //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype._UploadInstance = Meteor.isClient ? UploadInstance = (function() {                         // 96
    function UploadInstance(config1, collection) {                                                                     // 864
      var base, base1, base2, base3, self;                                                                             // 865
      this.config = config1;                                                                                           // 865
      this.collection = collection;                                                                                    // 865
      if (this.collection.debug) {                                                                                     // 865
        console.info('[FilesCollection] [insert()]');                                                                  // 865
      }                                                                                                                //
      self = this;                                                                                                     // 865
      if ((base = this.config).meta == null) {                                                                         //
        base.meta = {};                                                                                                //
      }                                                                                                                //
      if ((base1 = this.config).streams == null) {                                                                     //
        base1.streams = 2;                                                                                             //
      }                                                                                                                //
      if (this.config.streams < 1) {                                                                                   // 869
        this.config.streams = 2;                                                                                       // 869
      }                                                                                                                //
      if ((base2 = this.config).chunkSize == null) {                                                                   //
        base2.chunkSize = this.collection.chunkSize;                                                                   //
      }                                                                                                                //
      if ((base3 = this.config).allowWebWorkers == null) {                                                             //
        base3.allowWebWorkers = true;                                                                                  //
      }                                                                                                                //
      check(this.config, {                                                                                             // 865
        file: Match.Any,                                                                                               // 873
        meta: Match.Optional(Object),                                                                                  // 873
        onError: Match.Optional(Function),                                                                             // 873
        onAbort: Match.Optional(Function),                                                                             // 873
        streams: Match.OneOf('dynamic', Number),                                                                       // 873
        chunkSize: Match.OneOf('dynamic', Number),                                                                     // 873
        onUploaded: Match.Optional(Function),                                                                          // 873
        onProgress: Match.Optional(Function),                                                                          // 873
        onBeforeUpload: Match.Optional(Function),                                                                      // 873
        allowWebWorkers: Boolean                                                                                       // 873
      });                                                                                                              //
      if (this.config.file) {                                                                                          // 886
        if (this.collection.debug) {                                                                                   // 887
          console.time('insert ' + this.config.file.name);                                                             // 887
        }                                                                                                              //
        if (this.collection.debug) {                                                                                   // 888
          console.time('loadFile ' + this.config.file.name);                                                           // 888
        }                                                                                                              //
        if (Worker && this.config.allowWebWorkers) {                                                                   // 890
          this.worker = new Worker('/packages/ostrio_files/worker.js');                                                // 891
        } else {                                                                                                       //
          this.worker = null;                                                                                          // 893
        }                                                                                                              //
        this.trackerComp = null;                                                                                       // 887
        this.currentChunk = 0;                                                                                         // 887
        this.sentChunks = 0;                                                                                           // 887
        this.EOFsent = false;                                                                                          // 887
        this.transferTime = 0;                                                                                         // 887
        this.fileLength = 1;                                                                                           // 887
        this.fileId = this.collection.namingFunction();                                                                // 887
        this.fileData = {                                                                                              // 887
          size: this.config.file.size,                                                                                 // 903
          type: this.config.file.type,                                                                                 // 903
          name: this.config.file.name                                                                                  // 903
        };                                                                                                             //
        this.fileData = _.extend(this.fileData, this.collection.getExt(self.config.file.name), {                       // 887
          mime: this.collection.getMimeType(this.fileData)                                                             // 907
        });                                                                                                            //
        this.fileData['mime-type'] = this.fileData.mime;                                                               // 887
        this.result = new this.collection._FileUpload(_.extend(self.config, {                                          // 887
          fileData: this.fileData,                                                                                     // 910
          fileId: this.fileId,                                                                                         // 910
          MeteorFileAbort: this.collection.methodNames.MeteorFileAbort                                                 // 910
        }));                                                                                                           //
        this.beforeunload = function(e) {                                                                              // 887
          var message;                                                                                                 // 913
          message = _.isFunction(self.onbeforeunloadMessage) ? self.onbeforeunloadMessage.call(this.result, this.fileData) : self.onbeforeunloadMessage;
          if (e) {                                                                                                     // 914
            e.returnValue = message;                                                                                   // 914
          }                                                                                                            //
          return message;                                                                                              // 915
        };                                                                                                             //
        this.result.config.beforeunload = this.beforeunload;                                                           // 887
        window.addEventListener('beforeunload', this.beforeunload, false);                                             // 887
        this.calculateStats = _.throttle(function() {                                                                  // 887
          var _t, progress;                                                                                            // 920
          _t = (self.transferTime / self.sentChunks) / self.config.streams;                                            // 920
          self.result.estimateTime.set(_t * (self.fileLength - self.sentChunks));                                      // 920
          self.result.estimateSpeed.set(self.config.chunkSize / (_t / 1000));                                          // 920
          progress = Math.round((self.sentChunks / self.fileLength) * 100);                                            // 920
          self.result.progress.set(progress);                                                                          // 920
          self.config.onProgress && self.config.onProgress.call(self.result, progress, self.fileData);                 // 920
        }, 250);                                                                                                       //
        this._onEnd = function() {                                                                                     // 887
          if (self.worker) {                                                                                           // 930
            self.worker.terminate();                                                                                   // 930
          }                                                                                                            //
          if (self.trackerComp) {                                                                                      // 931
            self.trackerComp.stop();                                                                                   // 931
          }                                                                                                            //
          if (self.beforeunload) {                                                                                     // 932
            window.removeEventListener('beforeunload', self.beforeunload, false);                                      // 932
          }                                                                                                            //
          if (self.result) {                                                                                           // 933
            return self.result.progress.set(0);                                                                        //
          }                                                                                                            //
        };                                                                                                             //
        this.result.config._onEnd = this._onEnd;                                                                       // 887
      } else {                                                                                                         //
        throw new Meteor.Error(500, "[FilesCollection] [insert] Have you forget to pass a File itself?");              // 936
      }                                                                                                                //
    }                                                                                                                  //
                                                                                                                       //
    UploadInstance.prototype.end = function(error, data) {                                                             // 864
      if (this.collection.debug) {                                                                                     // 939
        console.timeEnd('insert ' + this.config.file.name);                                                            // 939
      }                                                                                                                //
      this._onEnd();                                                                                                   // 939
      this.config.onUploaded && this.config.onUploaded.call(this.result, error, data);                                 // 939
      if (error) {                                                                                                     // 942
        if (this.collection.debug) {                                                                                   // 943
          console.warn("[FilesCollection] [insert] [end] Error: ", error);                                             // 943
        }                                                                                                              //
        this.result.state.set('aborted');                                                                              // 943
        this.config.onError && this.config.onError.call(this.result, error, this.fileData);                            // 943
      } else {                                                                                                         //
        this.result.state.set('completed');                                                                            // 947
      }                                                                                                                //
      return this.result;                                                                                              // 948
    };                                                                                                                 //
                                                                                                                       //
    UploadInstance.prototype.sendViaDDP = function(evt) {                                                              // 864
      return Meteor.defer((function(_this) {                                                                           //
        return function() {                                                                                            //
          var opts, self;                                                                                              // 951
          self = _this;                                                                                                // 951
          if (_this.collection.debug) {                                                                                // 952
            console.timeEnd('loadFile ' + _this.config.file.name);                                                     // 952
          }                                                                                                            //
          opts = {                                                                                                     // 951
            file: _this.fileData,                                                                                      // 954
            fileId: _this.fileId,                                                                                      // 954
            binData: evt.data.bin,                                                                                     // 954
            chunkId: evt.data.chunkId,                                                                                 // 954
            fileLength: _this.fileLength                                                                               // 954
          };                                                                                                           //
          if (opts.binData && opts.binData.length) {                                                                   // 960
            Meteor.call(_this.collection.methodNames.MeteorFileWrite, opts, function(error) {                          // 961
              ++self.sentChunks;                                                                                       // 962
              self.transferTime += (+(new Date)) - evt.data.start;                                                     // 962
              if (error) {                                                                                             // 964
                self.end(error);                                                                                       // 965
              } else {                                                                                                 //
                if (self.sentChunks >= self.fileLength) {                                                              // 967
                  self.sendEOF(opts);                                                                                  // 968
                } else if (self.currentChunk < self.fileLength) {                                                      //
                  self.upload();                                                                                       // 970
                }                                                                                                      //
                self.calculateStats();                                                                                 // 967
              }                                                                                                        //
            });                                                                                                        //
          } else {                                                                                                     //
            _this.sendEOF(opts);                                                                                       // 974
          }                                                                                                            //
        };                                                                                                             //
      })(this));                                                                                                       //
    };                                                                                                                 //
                                                                                                                       //
    UploadInstance.prototype.sendEOF = function(opts) {                                                                // 864
      return Meteor.defer((function(_this) {                                                                           //
        return function() {                                                                                            //
          var self;                                                                                                    // 978
          if (!_this.EOFsent) {                                                                                        // 978
            _this.EOFsent = true;                                                                                      // 979
            self = _this;                                                                                              // 979
            opts = {                                                                                                   // 979
              eof: true,                                                                                               // 982
              meta: _this.config.meta,                                                                                 // 982
              file: _this.fileData,                                                                                    // 982
              fileId: _this.fileId,                                                                                    // 982
              fileLength: _this.fileLength                                                                             // 982
            };                                                                                                         //
            Meteor.call(_this.collection.methodNames.MeteorFileWrite, opts, function() {                               // 979
              return self.end.apply(self, arguments);                                                                  //
            });                                                                                                        //
          }                                                                                                            //
        };                                                                                                             //
      })(this));                                                                                                       //
    };                                                                                                                 //
                                                                                                                       //
    UploadInstance.prototype.proceedChunk = function(chunkId, start) {                                                 // 864
      var chunk, fileReader, self;                                                                                     // 991
      self = this;                                                                                                     // 991
      chunk = this.config.file.slice(this.config.chunkSize * (chunkId - 1), this.config.chunkSize * chunkId);          // 991
      fileReader = new FileReader;                                                                                     // 991
      fileReader.onloadend = function(evt) {                                                                           // 991
        var ref, ref1;                                                                                                 // 996
        self.sendViaDDP({                                                                                              // 996
          data: {                                                                                                      // 996
            bin: ((fileReader != null ? fileReader.result : void 0) || ((ref = evt.srcElement) != null ? ref.result : void 0) || ((ref1 = evt.target) != null ? ref1.result : void 0)).split(',')[1],
            chunkId: chunkId,                                                                                          // 997
            start: start                                                                                               // 997
          }                                                                                                            //
        });                                                                                                            //
      };                                                                                                               //
      fileReader.onerror = function(e) {                                                                               // 991
        self.result.abort();                                                                                           // 1002
        self.config.onError && self.config.onError.call(self.result, (e.target || e.srcElement).error, self.fileData);
      };                                                                                                               //
      fileReader.readAsDataURL(chunk);                                                                                 // 991
    };                                                                                                                 //
                                                                                                                       //
    UploadInstance.prototype.upload = function() {                                                                     // 864
      var self, start;                                                                                                 // 1010
      start = +(new Date);                                                                                             // 1010
      if (this.result.onPause.get()) {                                                                                 // 1011
        self = this;                                                                                                   // 1012
        this.result.continueFunc = function() {                                                                        // 1012
          return self.createStreams();                                                                                 //
        };                                                                                                             //
        return;                                                                                                        // 1014
      }                                                                                                                //
      if (this.result.state.get() === 'aborted') {                                                                     // 1016
        return this;                                                                                                   // 1017
      }                                                                                                                //
      ++this.currentChunk;                                                                                             // 1010
      if (this.worker) {                                                                                               // 1020
        this.worker.postMessage({                                                                                      // 1021
          sentChunks: this.sentChunks,                                                                                 // 1021
          start: start,                                                                                                // 1021
          currentChunk: this.currentChunk,                                                                             // 1021
          chunkSize: this.config.chunkSize,                                                                            // 1021
          file: this.config.file                                                                                       // 1021
        });                                                                                                            //
      } else {                                                                                                         //
        this.proceedChunk(this.currentChunk, start);                                                                   // 1023
      }                                                                                                                //
    };                                                                                                                 //
                                                                                                                       //
    UploadInstance.prototype.createStreams = function() {                                                              // 864
      var i, self;                                                                                                     // 1027
      i = 1;                                                                                                           // 1027
      self = this;                                                                                                     // 1027
      while (i <= this.config.streams) {                                                                               // 1029
        Meteor.defer(function() {                                                                                      // 1030
          return self.upload();                                                                                        //
        });                                                                                                            //
        i++;                                                                                                           // 1030
      }                                                                                                                //
    };                                                                                                                 //
                                                                                                                       //
    UploadInstance.prototype.prepare = function() {                                                                    // 864
      var _len, self;                                                                                                  // 1035
      self = this;                                                                                                     // 1035
      if (this.config.chunkSize === 'dynamic') {                                                                       // 1036
        if (this.config.file.size >= 104857600) {                                                                      // 1037
          this.config.chunkSize = 1048576;                                                                             // 1038
        } else if (this.config.file.size >= 52428800) {                                                                //
          this.config.chunkSize = 524288;                                                                              // 1040
        } else {                                                                                                       //
          this.config.chunkSize = 262144;                                                                              // 1042
        }                                                                                                              //
      }                                                                                                                //
      _len = Math.ceil(this.config.file.size / this.config.chunkSize);                                                 // 1035
      if (this.config.streams === 'dynamic') {                                                                         // 1045
        this.config.streams = _.clone(_len);                                                                           // 1046
        if (this.config.streams > 32) {                                                                                // 1047
          this.config.streams = 32;                                                                                    // 1047
        }                                                                                                              //
      }                                                                                                                //
      this.fileLength = _len <= 0 ? 1 : _len;                                                                          // 1035
      if (this.config.streams > this.fileLength) {                                                                     // 1050
        this.config.streams = this.fileLength;                                                                         // 1050
      }                                                                                                                //
      this.result.config.fileLength = this.fileLength;                                                                 // 1035
      Meteor.defer(function() {                                                                                        // 1035
        return self.createStreams();                                                                                   //
      });                                                                                                              //
    };                                                                                                                 //
                                                                                                                       //
    UploadInstance.prototype.start = function() {                                                                      // 864
      var isUploadAllowed, self;                                                                                       // 1056
      self = this;                                                                                                     // 1056
      if (this.config.onBeforeUpload && _.isFunction(this.config.onBeforeUpload)) {                                    // 1057
        isUploadAllowed = this.config.onBeforeUpload.call(this.result, this.fileData);                                 // 1058
        if (isUploadAllowed !== true) {                                                                                // 1059
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'config.onBeforeUpload() returned false'), null);
        }                                                                                                              //
      }                                                                                                                //
      if (this.collection.onBeforeUpload && _.isFunction(this.collection.onBeforeUpload)) {                            // 1062
        isUploadAllowed = this.collection.onBeforeUpload.call(this.result, this.fileData);                             // 1063
        if (isUploadAllowed !== true) {                                                                                // 1064
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'collection.onBeforeUpload() returned false'), null);
        }                                                                                                              //
      }                                                                                                                //
      Tracker.autorun(function(computation) {                                                                          // 1056
        self.trackerComp = computation;                                                                                // 1068
        if (!self.result.onPause.get()) {                                                                              // 1069
          if (Meteor.status().connected) {                                                                             // 1070
            self.result["continue"]();                                                                                 // 1071
            if (self.collection.debug) {                                                                               // 1072
              console.info('[FilesCollection] [insert] [Tracker] [continue]');                                         // 1072
            }                                                                                                          //
          } else {                                                                                                     //
            self.result.pause();                                                                                       // 1074
            if (self.collection.debug) {                                                                               // 1075
              console.info('[FilesCollection] [insert] [Tracker] [pause]');                                            // 1075
            }                                                                                                          //
          }                                                                                                            //
        }                                                                                                              //
      });                                                                                                              //
      if (this.worker) {                                                                                               // 1078
        this.worker.onmessage = function(evt) {                                                                        // 1079
          if (evt.data.error) {                                                                                        // 1080
            if (self.collection.debug) {                                                                               // 1081
              console.warn(evt.data.error);                                                                            // 1081
            }                                                                                                          //
            self.proceedChunk(evt.data.chunkId, evt.data.start);                                                       // 1081
          } else {                                                                                                     //
            self.sendViaDDP(evt);                                                                                      // 1084
          }                                                                                                            //
        };                                                                                                             //
        this.worker.onerror = function(e) {                                                                            // 1079
          self.end(e.message);                                                                                         // 1087
        };                                                                                                             //
      }                                                                                                                //
      if (this.collection.debug) {                                                                                     // 1090
        if (this.worker) {                                                                                             // 1091
          console.info("[FilesCollection] [insert] using WebWorkers");                                                 // 1092
        } else {                                                                                                       //
          console.info("[FilesCollection] [insert] using MainThread");                                                 // 1094
        }                                                                                                              //
      }                                                                                                                //
      Meteor.defer(function() {                                                                                        // 1056
        return self.prepare();                                                                                         //
      });                                                                                                              //
      return this.result;                                                                                              // 1097
    };                                                                                                                 //
                                                                                                                       //
    return UploadInstance;                                                                                             //
                                                                                                                       //
  })() : void 0;                                                                                                       //
                                                                                                                       //
                                                                                                                       // 1100
  /*                                                                                                                   // 1100
  @locus Client                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name _FileUpload                                                                                                    //
  @class FileUpload                                                                                                    //
  @summary Internal Class, instance of this class is returned from `insert()` method                                   //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype._FileUpload = Meteor.isClient ? FileUpload = (function() {                                 // 96
    function FileUpload(config1) {                                                                                     // 1108
      this.config = config1;                                                                                           // 1109
      this.file = _.extend(this.config.file, this.config.fileData);                                                    // 1109
      this.state = new ReactiveVar('active');                                                                          // 1109
      this.onPause = new ReactiveVar(false);                                                                           // 1109
      this.progress = new ReactiveVar(0);                                                                              // 1109
      this.estimateTime = new ReactiveVar(1000);                                                                       // 1109
      this.estimateSpeed = new ReactiveVar(0);                                                                         // 1109
    }                                                                                                                  //
                                                                                                                       //
    FileUpload.prototype.continueFunc = function() {};                                                                 // 1108
                                                                                                                       //
    FileUpload.prototype.pause = function() {                                                                          // 1108
      if (!this.onPause.get()) {                                                                                       // 1117
        this.onPause.set(true);                                                                                        // 1118
        this.state.set('paused');                                                                                      // 1118
      }                                                                                                                //
    };                                                                                                                 //
                                                                                                                       //
    FileUpload.prototype["continue"] = function() {                                                                    // 1108
      if (this.onPause.get()) {                                                                                        // 1122
        this.onPause.set(false);                                                                                       // 1123
        this.state.set('active');                                                                                      // 1123
        this.continueFunc.call();                                                                                      // 1123
        this.continueFunc = function() {};                                                                             // 1123
      }                                                                                                                //
    };                                                                                                                 //
                                                                                                                       //
    FileUpload.prototype.toggle = function() {                                                                         // 1108
      if (this.onPause.get()) {                                                                                        // 1129
        this["continue"]();                                                                                            // 1129
      } else {                                                                                                         //
        this.pause();                                                                                                  // 1129
      }                                                                                                                //
    };                                                                                                                 //
                                                                                                                       //
    FileUpload.prototype.abort = function() {                                                                          // 1108
      window.removeEventListener('beforeunload', this.config.beforeunload, false);                                     // 1132
      this.config.onAbort && this.config.onAbort.call(this, this.fileData);                                            // 1132
      this.pause();                                                                                                    // 1132
      this.config._onEnd();                                                                                            // 1132
      this.state.set('aborted');                                                                                       // 1132
      if (this.config.debug) {                                                                                         // 1137
        console.timeEnd('insert ' + this.config.file.name);                                                            // 1137
      }                                                                                                                //
      Meteor.call(this.config.MeteorFileAbort, {                                                                       // 1132
        fileId: this.config.fileId,                                                                                    // 1138
        fileLength: this.config.fileLength,                                                                            // 1138
        fileData: this.config.fileData                                                                                 // 1138
      });                                                                                                              //
    };                                                                                                                 //
                                                                                                                       //
    return FileUpload;                                                                                                 //
                                                                                                                       //
  })() : void 0;                                                                                                       //
                                                                                                                       //
                                                                                                                       // 1142
  /*                                                                                                                   // 1142
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name remove                                                                                                         //
  @param {String|Object} search - `_id` of the file or `Object` like, {prop:'val'}                                     //
  @summary Remove file(s) on cursor or find and remove file(s) if search is set                                        //
  @returns {undefined}                                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.remove = function(search) {                                                                // 96
    var files, self;                                                                                                   // 1151
    if (this.debug) {                                                                                                  // 1151
      console.info("[FilesCollection] [remove(" + (JSON.stringify(search)) + ")]");                                    // 1151
    }                                                                                                                  //
    check(search, Match.Optional(Match.OneOf(Object, String)));                                                        // 1151
    if (this.checkAccess()) {                                                                                          // 1154
      this.srch(search);                                                                                               // 1155
      if (Meteor.isClient) {                                                                                           // 1156
        Meteor.call(this.methodNames.MeteorFileUnlink, rcp(this));                                                     // 1157
      }                                                                                                                //
      if (Meteor.isServer) {                                                                                           // 1159
        files = this.collection.find(this.search);                                                                     // 1160
        if (files.count() > 0) {                                                                                       // 1161
          self = this;                                                                                                 // 1162
          files.forEach(function(file) {                                                                               // 1162
            return self.unlink(file);                                                                                  //
          });                                                                                                          //
        }                                                                                                              //
        this.collection.remove(this.search);                                                                           // 1160
      }                                                                                                                //
    }                                                                                                                  //
    return this;                                                                                                       // 1165
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 1167
  /*                                                                                                                   // 1167
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name update                                                                                                         //
  @see http://docs.meteor.com/#/full/update                                                                            //
  @summary link Mongo.Collection update method                                                                         //
  @returns {Mongo.Collection} Instance                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.update = function() {                                                                      // 96
    this.collection.update.apply(this.collection, arguments);                                                          // 1176
    return this.collection;                                                                                            // 1177
  };                                                                                                                   //
                                                                                                                       //
                                                                                                                       // 1179
  /*                                                                                                                   // 1179
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name deny                                                                                                           //
  @name allow                                                                                                          //
  @param {Object} rules                                                                                                //
  @see http://docs.meteor.com/#/full/allow                                                                             //
  @summary link Mongo.Collection allow/deny methods                                                                    //
  @returns {Mongo.Collection} Instance                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.deny = Meteor.isServer ? function(rules) {                                                 // 96
    this.collection.deny(rules);                                                                                       // 1190
    return this.collection;                                                                                            // 1191
  } : void 0;                                                                                                          //
                                                                                                                       //
  FilesCollection.prototype.allow = Meteor.isServer ? function(rules) {                                                // 96
    this.collection.allow(rules);                                                                                      // 1194
    return this.collection;                                                                                            // 1195
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 1198
  /*                                                                                                                   // 1198
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name denyClient                                                                                                     //
  @name allowClient                                                                                                    //
  @see http://docs.meteor.com/#/full/allow                                                                             //
  @summary Shorthands for Mongo.Collection allow/deny methods                                                          //
  @returns {Mongo.Collection} Instance                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.denyClient = Meteor.isServer ? function() {                                                // 96
    this.collection.deny({                                                                                             // 1208
      insert: function() {                                                                                             // 1209
        return true;                                                                                                   //
      },                                                                                                               //
      update: function() {                                                                                             // 1209
        return true;                                                                                                   //
      },                                                                                                               //
      remove: function() {                                                                                             // 1209
        return true;                                                                                                   //
      }                                                                                                                //
    });                                                                                                                //
    return this.collection;                                                                                            // 1212
  } : void 0;                                                                                                          //
                                                                                                                       //
  FilesCollection.prototype.allowClient = Meteor.isServer ? function() {                                               // 96
    this.collection.allow({                                                                                            // 1215
      insert: function() {                                                                                             // 1216
        return true;                                                                                                   //
      },                                                                                                               //
      update: function() {                                                                                             // 1216
        return true;                                                                                                   //
      },                                                                                                               //
      remove: function() {                                                                                             // 1216
        return true;                                                                                                   //
      }                                                                                                                //
    });                                                                                                                //
    return this.collection;                                                                                            // 1219
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 1223
  /*                                                                                                                   // 1223
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name unlink                                                                                                         //
  @param {Object} file - fileObj                                                                                       //
  @summary Unlink files and it's versions from FS                                                                      //
  @returns {undefined}                                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.unlink = Meteor.isServer ? function(file) {                                                // 96
    if (this.debug) {                                                                                                  // 1232
      console.info("[FilesCollection] [unlink(" + file._id + ")]");                                                    // 1232
    }                                                                                                                  //
    if (file.versions && !_.isEmpty(file.versions)) {                                                                  // 1233
      _.each(file.versions, function(version) {                                                                        // 1234
        return bound(function() {                                                                                      //
          return fs.unlink(version.path, NOOP);                                                                        //
        });                                                                                                            //
      });                                                                                                              //
    }                                                                                                                  //
    fs.unlink(file.path, NOOP);                                                                                        // 1232
    return this;                                                                                                       // 1237
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 1240
  /*                                                                                                                   // 1240
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name _404                                                                                                           //
  @summary Internal method, used to return 404 error                                                                   //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype._404 = Meteor.isServer ? function(http) {                                                  // 96
    var text;                                                                                                          // 1247
    if (this.debug) {                                                                                                  // 1247
      console.warn("[FilesCollection] [download(" + http.request.originalUrl + ")] [_404] File not found");            // 1247
    }                                                                                                                  //
    text = 'File Not Found :(';                                                                                        // 1247
    http.response.writeHead(404, {                                                                                     // 1247
      'Content-Length': text.length,                                                                                   // 1250
      'Content-Type': 'text/plain'                                                                                     // 1250
    });                                                                                                                //
    http.response.end(text);                                                                                           // 1247
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 1256
  /*                                                                                                                   // 1256
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name download                                                                                                       //
  @param {Object|Files} self - Instance of FilesCollection                                                             //
  @summary Initiates the HTTP response                                                                                 //
  @returns {undefined}                                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.download = Meteor.isServer ? function(http, version) {                                     // 96
    var _idres, fileRef, responseType, self;                                                                           // 1265
    if (version == null) {                                                                                             //
      version = 'original';                                                                                            //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  // 1265
      console.info("[FilesCollection] [download(" + http.request.originalUrl + ", " + version + ")]");                 // 1265
    }                                                                                                                  //
    responseType = '200';                                                                                              // 1265
    if (this.currentFile) {                                                                                            // 1267
      if (_.has(this.currentFile, 'versions') && _.has(this.currentFile.versions, version)) {                          // 1268
        fileRef = this.currentFile.versions[version];                                                                  // 1269
      } else {                                                                                                         //
        fileRef = this.currentFile;                                                                                    // 1271
      }                                                                                                                //
    } else {                                                                                                           //
      fileRef = false;                                                                                                 // 1273
    }                                                                                                                  //
    if (!fileRef || !_.isObject(fileRef)) {                                                                            // 1275
      return this._404(http);                                                                                          // 1276
    } else if (this.currentFile) {                                                                                     //
      self = this;                                                                                                     // 1278
      if (this.interceptDownload && _.isFunction(this.interceptDownload)) {                                            // 1280
        _idres = this.interceptDownload(http, this.currentFile);                                                       // 1281
        if (_idres === true) {                                                                                         // 1282
          return;                                                                                                      // 1283
        }                                                                                                              //
      }                                                                                                                //
      if (this.downloadCallback) {                                                                                     // 1285
        if (!this.downloadCallback.call(_.extend(http, this.getUser(http)), this.currentFile)) {                       // 1286
          return this._404(http);                                                                                      // 1287
        }                                                                                                              //
      }                                                                                                                //
      fs.stat(fileRef.path, function(statErr, stats) {                                                                 // 1278
        return bound(function() {                                                                                      //
          var array, dispositionEncoding, dispositionName, dispositionType, end, partiral, ref, ref1, ref2, ref3, reqRange, start, stream, streamErrorHandler, take, text;
          if (statErr || !stats.isFile()) {                                                                            // 1290
            return self._404(http);                                                                                    // 1291
          }                                                                                                            //
          if (stats.size !== fileRef.size && !self.integrityCheck) {                                                   // 1293
            fileRef.size = stats.size;                                                                                 // 1293
          }                                                                                                            //
          if (stats.size !== fileRef.size && self.integrityCheck) {                                                    // 1294
            responseType = '400';                                                                                      // 1294
          }                                                                                                            //
          partiral = false;                                                                                            // 1290
          reqRange = false;                                                                                            // 1290
          if (http.params.query.download && http.params.query.download === 'true') {                                   // 1298
            dispositionType = 'attachment; ';                                                                          // 1299
          } else {                                                                                                     //
            dispositionType = 'inline; ';                                                                              // 1301
          }                                                                                                            //
          dispositionName = "filename=\"" + (encodeURIComponent(self.currentFile.name)) + "\"; filename=*UTF-8\"" + (encodeURIComponent(self.currentFile.name)) + "\"; ";
          dispositionEncoding = 'charset=utf-8';                                                                       // 1290
          http.response.setHeader('Content-Type', fileRef.type);                                                       // 1290
          http.response.setHeader('Content-Disposition', dispositionType + dispositionName + dispositionEncoding);     // 1290
          http.response.setHeader('Accept-Ranges', 'bytes');                                                           // 1290
          if ((ref = self.currentFile) != null ? (ref1 = ref.updatedAt) != null ? ref1.toUTCString() : void 0 : void 0) {
            http.response.setHeader('Last-Modified', (ref2 = self.currentFile) != null ? (ref3 = ref2.updatedAt) != null ? ref3.toUTCString() : void 0 : void 0);
          }                                                                                                            //
          http.response.setHeader('Connection', 'keep-alive');                                                         // 1290
          if (http.request.headers.range) {                                                                            // 1312
            partiral = true;                                                                                           // 1313
            array = http.request.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);                                       // 1313
            start = parseInt(array[1]);                                                                                // 1313
            end = parseInt(array[2]);                                                                                  // 1313
            if (isNaN(end)) {                                                                                          // 1317
              end = fileRef.size - 1;                                                                                  // 1318
            }                                                                                                          //
            take = end - start;                                                                                        // 1313
          } else {                                                                                                     //
            start = 0;                                                                                                 // 1321
            end = fileRef.size - 1;                                                                                    // 1321
            take = fileRef.size;                                                                                       // 1321
          }                                                                                                            //
          if (partiral || (http.params.query.play && http.params.query.play === 'true')) {                             // 1325
            reqRange = {                                                                                               // 1326
              start: start,                                                                                            // 1326
              end: end                                                                                                 // 1326
            };                                                                                                         //
            if (isNaN(start) && !isNaN(end)) {                                                                         // 1327
              reqRange.start = end - take;                                                                             // 1328
              reqRange.end = end;                                                                                      // 1328
            }                                                                                                          //
            if (!isNaN(start) && isNaN(end)) {                                                                         // 1330
              reqRange.start = start;                                                                                  // 1331
              reqRange.end = start + take;                                                                             // 1331
            }                                                                                                          //
            if ((start + take) >= fileRef.size) {                                                                      // 1334
              reqRange.end = fileRef.size - 1;                                                                         // 1334
            }                                                                                                          //
            http.response.setHeader('Pragma', 'private');                                                              // 1326
            http.response.setHeader('Expires', new Date(+(new Date) + 1000 * 32400).toUTCString());                    // 1326
            http.response.setHeader('Cache-Control', 'private, maxage=10800, s-maxage=32400');                         // 1326
            if (self.strict && (reqRange.start >= (fileRef.size - 1) || reqRange.end > (fileRef.size - 1))) {          // 1339
              responseType = '416';                                                                                    // 1340
            } else {                                                                                                   //
              responseType = '206';                                                                                    // 1342
            }                                                                                                          //
          } else {                                                                                                     //
            http.response.setHeader('Cache-Control', self.cacheControl);                                               // 1344
            responseType = '200';                                                                                      // 1344
          }                                                                                                            //
          streamErrorHandler = function(error) {                                                                       // 1290
            http.response.writeHead(500);                                                                              // 1348
            return http.response.end(error.toString());                                                                //
          };                                                                                                           //
          switch (responseType) {                                                                                      // 1351
            case '400':                                                                                                // 1351
              if (self.debug) {                                                                                        // 1353
                console.warn("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [400] Content-Length mismatch!");
              }                                                                                                        //
              text = 'Content-Length mismatch!';                                                                       // 1353
              http.response.writeHead(400, {                                                                           // 1353
                'Content-Type': 'text/plain',                                                                          // 1356
                'Cache-Control': 'no-cache',                                                                           // 1356
                'Content-Length': text.length                                                                          // 1356
              });                                                                                                      //
              http.response.end(text);                                                                                 // 1353
              break;                                                                                                   // 1360
            case '404':                                                                                                // 1351
              return self._404(http);                                                                                  // 1362
              break;                                                                                                   // 1363
            case '416':                                                                                                // 1351
              if (self.debug) {                                                                                        // 1365
                console.info("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [416] Content-Range is not specified!");
              }                                                                                                        //
              http.response.writeHead(416, {                                                                           // 1365
                'Content-Range': "bytes */" + fileRef.size                                                             // 1367
              });                                                                                                      //
              http.response.end();                                                                                     // 1365
              break;                                                                                                   // 1369
            case '200':                                                                                                // 1351
              if (self.debug) {                                                                                        // 1371
                console.info("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [200]");             // 1371
              }                                                                                                        //
              stream = fs.createReadStream(fileRef.path);                                                              // 1371
              stream.on('open', (function(_this) {                                                                     // 1371
                return function() {                                                                                    //
                  http.response.writeHead(200);                                                                        // 1374
                  if (self.throttle) {                                                                                 // 1375
                    return stream.pipe(new Throttle({                                                                  //
                      bps: self.throttle,                                                                              // 1376
                      chunksize: self.chunkSize                                                                        // 1376
                    })).pipe(http.response);                                                                           //
                  } else {                                                                                             //
                    return stream.pipe(http.response);                                                                 //
                  }                                                                                                    //
                };                                                                                                     //
              })(this)).on('error', streamErrorHandler);                                                               //
              break;                                                                                                   // 1381
            case '206':                                                                                                // 1351
              if (self.debug) {                                                                                        // 1383
                console.info("[FilesCollection] [download(" + fileRef.path + ", " + version + ")] [206]");             // 1383
              }                                                                                                        //
              http.response.setHeader('Content-Range', "bytes " + reqRange.start + "-" + reqRange.end + "/" + fileRef.size);
              http.response.setHeader('Trailer', 'expires');                                                           // 1383
              http.response.setHeader('Transfer-Encoding', 'chunked');                                                 // 1383
              if (self.throttle) {                                                                                     // 1387
                stream = fs.createReadStream(fileRef.path, {                                                           // 1388
                  start: reqRange.start,                                                                               // 1388
                  end: reqRange.end                                                                                    // 1388
                });                                                                                                    //
                stream.on('open', function() {                                                                         // 1388
                  return http.response.writeHead(206);                                                                 //
                }).on('error', streamErrorHandler).on('end', function() {                                              //
                  return http.response.end();                                                                          //
                }).pipe(new Throttle({                                                                                 //
                  bps: self.throttle,                                                                                  // 1392
                  chunksize: self.chunkSize                                                                            // 1392
                })).pipe(http.response);                                                                               //
              } else {                                                                                                 //
                stream = fs.createReadStream(fileRef.path, {                                                           // 1395
                  start: reqRange.start,                                                                               // 1395
                  end: reqRange.end                                                                                    // 1395
                });                                                                                                    //
                stream.on('open', function() {                                                                         // 1395
                  return http.response.writeHead(206);                                                                 //
                }).on('error', streamErrorHandler).on('end', function() {                                              //
                  return http.response.end();                                                                          //
                }).pipe(http.response);                                                                                //
              }                                                                                                        //
              break;                                                                                                   // 1400
          }                                                                                                            // 1351
        });                                                                                                            //
      });                                                                                                              //
    } else {                                                                                                           //
      return this._404(http);                                                                                          // 1403
    }                                                                                                                  //
  } : void 0;                                                                                                          //
                                                                                                                       //
                                                                                                                       // 1406
  /*                                                                                                                   // 1406
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name link                                                                                                           //
  @param {Object}   fileRef - File reference object                                                                    //
  @param {String}   version - [Optional] Version of file you would like to request                                     //
  @param {Boolean}  pub     - [Optional] is file located in publicity available folder?                                //
  @summary Returns downloadable URL                                                                                    //
  @returns {String} Empty string returned in case if file not found in DB                                              //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.link = function(fileRef, version, pub) {                                                   // 96
    if (version == null) {                                                                                             //
      version = 'original';                                                                                            //
    }                                                                                                                  //
    if (pub == null) {                                                                                                 //
      pub = false;                                                                                                     //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  // 1417
      console.info('[FilesCollection] [link()]');                                                                      // 1417
    }                                                                                                                  //
    if (_.isString(fileRef)) {                                                                                         // 1418
      version = fileRef;                                                                                               // 1419
      fileRef = null;                                                                                                  // 1419
    }                                                                                                                  //
    if (!fileRef && !this.currentFile) {                                                                               // 1421
      return '';                                                                                                       // 1421
    }                                                                                                                  //
    return formatFleURL(fileRef || this.currentFile, version, this["public"]);                                         // 1422
  };                                                                                                                   //
                                                                                                                       //
  return FilesCollection;                                                                                              //
                                                                                                                       //
})();                                                                                                                  //
                                                                                                                       //
                                                                                                                       // 1424
/*                                                                                                                     // 1424
@locus Anywhere                                                                                                        //
@private                                                                                                               //
@name formatFleURL                                                                                                     //
@param {Object} fileRef - File reference object                                                                        //
@param {String} version - [Optional] Version of file you would like build URL for                                      //
@param {Boolean}  pub   - [Optional] is file located in publicity available folder?                                    //
@summary Returns formatted URL for file                                                                                //
@returns {String}                                                                                                      //
 */                                                                                                                    //
                                                                                                                       //
formatFleURL = function(fileRef, version) {                                                                            // 1
  var ext, ref, root;                                                                                                  // 1435
  if (version == null) {                                                                                               //
    version = 'original';                                                                                              //
  }                                                                                                                    //
  root = __meteor_runtime_config__.ROOT_URL.replace(/\/+$/, '');                                                       // 1435
  if ((fileRef != null ? (ref = fileRef.extension) != null ? ref.length : void 0 : void 0) > 0) {                      // 1437
    ext = '.' + fileRef.extension;                                                                                     // 1438
  } else {                                                                                                             //
    ext = '';                                                                                                          // 1440
  }                                                                                                                    //
  if (fileRef["public"] === true) {                                                                                    // 1442
    return root + (version === 'original' ? fileRef._downloadRoute + "/" + fileRef._id + ext : fileRef._downloadRoute + "/" + version + "-" + fileRef._id + ext);
  } else {                                                                                                             //
    return root + (fileRef._downloadRoute + "/" + fileRef._collectionName + "/" + fileRef._id + "/" + version + "/" + fileRef._id + ext);
  }                                                                                                                    //
};                                                                                                                     // 1434
                                                                                                                       //
if (Meteor.isClient) {                                                                                                 // 1447
                                                                                                                       // 1448
  /*                                                                                                                   // 1448
  @locus Client                                                                                                        //
  @TemplateHelper                                                                                                      //
  @name fileURL                                                                                                        //
  @param {Object} fileRef - File reference object                                                                      //
  @param {String} version - [Optional] Version of file you would like to request                                       //
  @summary Get download URL for file by fileRef, even without subscription                                             //
  @example {{fileURL fileRef}}                                                                                         //
  @returns {String}                                                                                                    //
   */                                                                                                                  //
  Template.registerHelper('fileURL', function(fileRef, version) {                                                      // 1448
    if (!fileRef || !_.isObject(fileRef)) {                                                                            // 1459
      return void 0;                                                                                                   // 1459
    }                                                                                                                  //
    version = !version || !_.isString(version) ? 'original' : version;                                                 // 1459
    if (fileRef._id) {                                                                                                 // 1461
      return formatFleURL(fileRef, version);                                                                           // 1462
    } else {                                                                                                           //
      return '';                                                                                                       // 1464
    }                                                                                                                  //
  });                                                                                                                  //
}                                                                                                                      //
                                                                                                                       //
Meteor.Files = FilesCollection;                                                                                        // 1
                                                                                                                       //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
