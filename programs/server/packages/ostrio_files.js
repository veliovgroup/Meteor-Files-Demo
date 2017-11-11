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
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var debug, schema, public, strict, chunkSize, protected, collection, permissions, cacheControl, downloadRoute, onAfterUpload, onAfterRemove, disableUpload, onBeforeRemove, integrityCheck, collectionName, onBeforeUpload, namingFunction, responseHeaders, disableDownload, allowClientCode, downloadCallback, onInitiateUpload, interceptDownload, continueUploadTTL, parentDirPermissions, proceedAfterUpload, callback, opts, responseType, FilesCollection;

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:files":{"server.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/server.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  FilesCollection: () => FilesCollection
});

let _;

module.watch(require("meteor/underscore"), {
  _(v) {
    _ = v;
  }

}, 0);
let Mongo;
module.watch(require("meteor/mongo"), {
  Mongo(v) {
    Mongo = v;
  }

}, 1);
let WebApp;
module.watch(require("meteor/webapp"), {
  WebApp(v) {
    WebApp = v;
  }

}, 2);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 3);
let Random;
module.watch(require("meteor/random"), {
  Random(v) {
    Random = v;
  }

}, 4);
let Cookies;
module.watch(require("meteor/ostrio:cookies"), {
  Cookies(v) {
    Cookies = v;
  }

}, 5);
let WriteStream;
module.watch(require("./write-stream.js"), {
  default(v) {
    WriteStream = v;
  }

}, 6);
let check, Match;
module.watch(require("meteor/check"), {
  check(v) {
    check = v;
  },

  Match(v) {
    Match = v;
  }

}, 7);
let FilesCollectionCore;
module.watch(require("./core.js"), {
  default(v) {
    FilesCollectionCore = v;
  }

}, 8);
let fixJSONParse, fixJSONStringify;
module.watch(require("./lib.js"), {
  fixJSONParse(v) {
    fixJSONParse = v;
  },

  fixJSONStringify(v) {
    fixJSONStringify = v;
  }

}, 9);
let fs;
module.watch(require("fs-extra"), {
  default(v) {
    fs = v;
  }

}, 10);
let nodeQs;
module.watch(require("querystring"), {
  default(v) {
    nodeQs = v;
  }

}, 11);
let request;
module.watch(require("request"), {
  default(v) {
    request = v;
  }

}, 12);
let fileType;
module.watch(require("file-type"), {
  default(v) {
    fileType = v;
  }

}, 13);
let nodePath;
module.watch(require("path"), {
  default(v) {
    nodePath = v;
  }

}, 14);
/*
 * @const {Object} bound  - Meteor.bindEnvironment (Fiber wrapper)
 * @const {Function} NOOP - No Operation function, placeholder for required callbacks
 */const bound = Meteor.bindEnvironment(callback => callback());

const NOOP = () => {}; /*
                        * @locus Anywhere
                        * @class FilesCollection
                        * @param config           {Object}   - [Both]   Configuration object with next properties:
                        * @param config.debug     {Boolean}  - [Both]   Turn on/of debugging and extra logging
                        * @param config.schema    {Object}   - [Both]   Collection Schema
                        * @param config.public    {Boolean}  - [Both]   Store files in folder accessible for proxy servers, for limits, and more - read docs
                        * @param config.strict    {Boolean}  - [Server] Strict mode for partial content, if is `true` server will return `416` response code, when `range` is not specified, otherwise server return `206`
                        * @param config.protected {Function} - [Server] If `true` - files will be served only to authorized users, if `function()` - you're able to check visitor's permissions in your own way function's context has:
                        *  - `request`
                        *  - `response`
                        *  - `user()`
                        *  - `userId`
                        * @param config.chunkSize      {Number}  - [Both] Upload chunk size, default: 524288 bytes (0,5 Mb)
                        * @param config.permissions    {Number}  - [Server] Permissions which will be set to uploaded files (octal), like: `511` or `0o755`. Default: 0644
                        * @param config.parentDirPermissions {Number}  - [Server] Permissions which will be set to parent directory of uploaded files (octal), like: `611` or `0o777`. Default: 0755
                        * @param config.storagePath    {String|Function}  - [Server] Storage path on file system
                        * @param config.cacheControl   {String}  - [Server] Default `Cache-Control` header
                        * @param config.responseHeaders {Object|Function} - [Server] Custom response headers, if function is passed, must return Object
                        * @param config.throttle       {Number}  - [Server] DEPRECATED bps throttle threshold
                        * @param config.downloadRoute  {String}  - [Both]   Server Route used to retrieve files
                        * @param config.collection     {Mongo.Collection} - [Both] Mongo Collection Instance
                        * @param config.collectionName {String}  - [Both]   Collection name
                        * @param config.namingFunction {Function}- [Both]   Function which returns `String`
                        * @param config.integrityCheck {Boolean} - [Server] Check file's integrity before serving to users
                        * @param config.onAfterUpload  {Function}- [Server] Called right after file is ready on FS. Use to transfer file somewhere else, or do other thing with file directly
                        * @param config.onAfterRemove  {Function} - [Server] Called right after file is removed. Removed objects is passed to callback
                        * @param config.continueUploadTTL {Number} - [Server] Time in seconds, during upload may be continued, default 3 hours (10800 seconds)
                        * @param config.onBeforeUpload {Function}- [Both]   Function which executes on server after receiving each chunk and on client right before beginning upload. Function context is `File` - so you are able to check for extension, mime-type, size and etc.:
                        *  - return `true` to continue
                        *  - return `false` or `String` to abort upload
                        * @param config.onInitiateUpload {Function} - [Server] Function which executes on server right before upload is begin and right after `onBeforeUpload` hook. This hook is fully asynchronous.
                        * @param config.onBeforeRemove {Function} - [Server] Executes before removing file on server, so you can check permissions. Return `true` to allow action and `false` to deny.
                        * @param config.allowClientCode  {Boolean}  - [Both]   Allow to run `remove` from client
                        * @param config.downloadCallback {Function} - [Server] Callback triggered each time file is requested, return truthy value to continue download, or falsy to abort
                        * @param config.interceptDownload {Function} - [Server] Intercept download request, so you can serve file from third-party resource, arguments {http: {request: {...}, response: {...}}, fileRef: {...}}
                        * @param config.disableUpload {Boolean} - Disable file upload, useful for server only solutions
                        * @param config.disableDownload {Boolean} - Disable file download (serving), useful for file management only solutions
                        * @summary Create new instance of FilesCollection
                        */

class FilesCollection extends FilesCollectionCore {
  constructor(config) {
    super();
    let storagePath;

    if (config) {
      ({
        storagePath,
        debug: this.debug,
        schema: this.schema,
        public: this.public,
        strict: this.strict,
        chunkSize: this.chunkSize,
        protected: this.protected,
        collection: this.collection,
        permissions: this.permissions,
        cacheControl: this.cacheControl,
        downloadRoute: this.downloadRoute,
        onAfterUpload: this.onAfterUpload,
        onAfterRemove: this.onAfterRemove,
        disableUpload: this.disableUpload,
        onBeforeRemove: this.onBeforeRemove,
        integrityCheck: this.integrityCheck,
        collectionName: this.collectionName,
        onBeforeUpload: this.onBeforeUpload,
        namingFunction: this.namingFunction,
        responseHeaders: this.responseHeaders,
        disableDownload: this.disableDownload,
        allowClientCode: this.allowClientCode,
        downloadCallback: this.downloadCallback,
        onInitiateUpload: this.onInitiateUpload,
        interceptDownload: this.interceptDownload,
        continueUploadTTL: this.continueUploadTTL,
        parentDirPermissions: this.parentDirPermissions
      } = config);
    }

    const self = this;
    const cookie = new Cookies();

    if (!_.isBoolean(this.debug)) {
      this.debug = false;
    }

    if (!_.isBoolean(this.public)) {
      this.public = false;
    }

    if (!this.protected) {
      this.protected = false;
    }

    if (!this.chunkSize) {
      this.chunkSize = 1024 * 512;
    }

    this.chunkSize = Math.floor(this.chunkSize / 8) * 8;

    if (!_.isString(this.collectionName) && !this.collection) {
      this.collectionName = 'MeteorUploadFiles';
    }

    if (!this.collection) {
      this.collection = new Mongo.Collection(this.collectionName);
    } else {
      this.collectionName = this.collection._name;
    }

    this.collection.filesCollection = this;
    check(this.collectionName, String);

    if (this.public && !this.downloadRoute) {
      throw new Meteor.Error(500, `[FilesCollection.${this.collectionName}]: \"downloadRoute\" must be precisely provided on \"public\" collections! Note: \"downloadRoute\" must be equal or be inside of your web/proxy-server (relative) root.`);
    }

    if (!_.isString(this.downloadRoute)) {
      this.downloadRoute = '/cdn/storage';
    }

    this.downloadRoute = this.downloadRoute.replace(/\/$/, '');

    if (!_.isFunction(this.namingFunction)) {
      this.namingFunction = false;
    }

    if (!_.isFunction(this.onBeforeUpload)) {
      this.onBeforeUpload = false;
    }

    if (!_.isBoolean(this.allowClientCode)) {
      this.allowClientCode = true;
    }

    if (!_.isFunction(this.onInitiateUpload)) {
      this.onInitiateUpload = false;
    }

    if (!_.isFunction(this.interceptDownload)) {
      this.interceptDownload = false;
    }

    if (!_.isBoolean(this.strict)) {
      this.strict = true;
    }

    if (!_.isNumber(this.permissions)) {
      this.permissions = parseInt('644', 8);
    }

    if (!_.isNumber(this.parentDirPermissions)) {
      this.parentDirPermissions = parseInt('755', 8);
    }

    if (!_.isString(this.cacheControl)) {
      this.cacheControl = 'public, max-age=31536000, s-maxage=31536000';
    }

    if (!_.isFunction(this.onAfterUpload)) {
      this.onAfterUpload = false;
    }

    if (!_.isBoolean(this.disableUpload)) {
      this.disableUpload = false;
    }

    if (!_.isFunction(this.onAfterRemove)) {
      this.onAfterRemove = false;
    }

    if (!_.isFunction(this.onBeforeRemove)) {
      this.onBeforeRemove = false;
    }

    if (!_.isBoolean(this.integrityCheck)) {
      this.integrityCheck = true;
    }

    if (!_.isBoolean(this.disableDownload)) {
      this.disableDownload = false;
    }

    if (!_.isObject(this._currentUploads)) {
      this._currentUploads = {};
    }

    if (!_.isFunction(this.downloadCallback)) {
      this.downloadCallback = false;
    }

    if (!_.isNumber(this.continueUploadTTL)) {
      this.continueUploadTTL = 10800;
    }

    if (!_.isFunction(this.responseHeaders)) {
      this.responseHeaders = (responseCode, fileRef, versionRef) => {
        const headers = {};

        switch (responseCode) {
          case '206':
            headers.Pragma = 'private';
            headers.Trailer = 'expires';
            headers['Transfer-Encoding'] = 'chunked';
            break;

          case '400':
            headers['Cache-Control'] = 'no-cache';
            break;

          case '416':
            headers['Content-Range'] = `bytes */${versionRef.size}`;
            break;

          default:
            break;
        }

        headers.Connection = 'keep-alive';
        headers['Content-Type'] = versionRef.type || 'application/octet-stream';
        headers['Accept-Ranges'] = 'bytes';
        return headers;
      };
    }

    if (this.public && !storagePath) {
      throw new Meteor.Error(500, `[FilesCollection.${this.collectionName}] \"storagePath\" must be set on \"public\" collections! Note: \"storagePath\" must be equal on be inside of your web/proxy-server (absolute) root.`);
    }

    if (!storagePath) {
      storagePath = function () {
        return `assets${nodePath.sep}app${nodePath.sep}uploads${nodePath.sep}${self.collectionName}`;
      };
    }

    if (_.isString(storagePath)) {
      this.storagePath = () => storagePath;
    } else {
      this.storagePath = function () {
        let sp = storagePath.apply(self, arguments);

        if (!_.isString(sp)) {
          throw new Meteor.Error(400, `[FilesCollection.${self.collectionName}] \"storagePath\" function must return a String!`);
        }

        sp = sp.replace(/\/$/, '');
        return nodePath.normalize(sp);
      };
    }

    this._debug('[FilesCollection.storagePath] Set to:', this.storagePath({}));

    fs.mkdirs(this.storagePath({}), {
      mode: this.parentDirPermissions
    }, error => {
      if (error) {
        throw new Meteor.Error(401, `[FilesCollection.${self.collectionName}] Path \"${this.storagePath({})}\" is not writable!`, error);
      }
    });
    check(this.strict, Boolean);
    check(this.permissions, Number);
    check(this.storagePath, Function);
    check(this.cacheControl, String);
    check(this.onAfterRemove, Match.OneOf(false, Function));
    check(this.onAfterUpload, Match.OneOf(false, Function));
    check(this.disableUpload, Boolean);
    check(this.integrityCheck, Boolean);
    check(this.onBeforeRemove, Match.OneOf(false, Function));
    check(this.disableDownload, Boolean);
    check(this.downloadCallback, Match.OneOf(false, Function));
    check(this.interceptDownload, Match.OneOf(false, Function));
    check(this.continueUploadTTL, Number);
    check(this.responseHeaders, Match.OneOf(Object, Function));

    if (!this.disableUpload) {
      this._preCollection = new Mongo.Collection(`__pre_${this.collectionName}`);

      this._preCollection._ensureIndex({
        createdAt: 1
      }, {
        expireAfterSeconds: this.continueUploadTTL,
        background: true
      });

      const _preCollectionCursor = this._preCollection.find({}, {
        fields: {
          _id: 1,
          isFinished: 1
        }
      });

      _preCollectionCursor.observe({
        changed(doc) {
          if (doc.isFinished) {
            self._debug(`[FilesCollection] [_preCollectionCursor.observe] [changed]: ${doc._id}`);

            self._preCollection.remove({
              _id: doc._id
            }, NOOP);
          }
        },

        removed(doc) {
          // Free memory after upload is done
          // Or if upload is unfinished
          self._debug(`[FilesCollection] [_preCollectionCursor.observe] [removed]: ${doc._id}`);

          if (_.isObject(self._currentUploads[doc._id])) {
            self._currentUploads[doc._id].stop();

            self._currentUploads[doc._id].end();

            if (!doc.isFinished) {
              self._debug(`[FilesCollection] [_preCollectionCursor.observe] [removeUnfinishedUpload]: ${doc._id}`);

              self._currentUploads[doc._id].abort();
            }

            delete self._currentUploads[doc._id];
          }
        }

      });

      this._createStream = (_id, path, opts) => {
        this._currentUploads[_id] = new WriteStream(path, opts.fileLength, opts, this.permissions);
      }; // This little function allows to continue upload
      // even after server is restarted (*not on dev-stage*)


      this._continueUpload = _id => {
        if (this._currentUploads[_id] && this._currentUploads[_id].file) {
          if (!this._currentUploads[_id].aborted && !this._currentUploads[_id].ended) {
            return this._currentUploads[_id].file;
          }

          this._createStream(_id, this._currentUploads[_id].file.file.path, this._currentUploads[_id].file);

          return this._currentUploads[_id].file;
        }

        const contUpld = this._preCollection.findOne({
          _id
        });

        if (contUpld) {
          this._createStream(_id, contUpld.file.path, contUpld);

          return this._currentUploads[_id].file;
        }

        return false;
      };
    }

    if (!this.schema) {
      this.schema = {
        size: {
          type: Number
        },
        name: {
          type: String
        },
        type: {
          type: String
        },
        path: {
          type: String
        },
        isVideo: {
          type: Boolean
        },
        isAudio: {
          type: Boolean
        },
        isImage: {
          type: Boolean
        },
        isText: {
          type: Boolean
        },
        isJSON: {
          type: Boolean
        },
        isPDF: {
          type: Boolean
        },
        extension: {
          type: String,
          optional: true
        },
        _storagePath: {
          type: String
        },
        _downloadRoute: {
          type: String
        },
        _collectionName: {
          type: String
        },
        public: {
          type: Boolean,
          optional: true
        },
        meta: {
          type: Object,
          blackbox: true,
          optional: true
        },
        userId: {
          type: String,
          optional: true
        },
        updatedAt: {
          type: Date,
          optional: true
        },
        versions: {
          type: Object,
          blackbox: true
        }
      };
    }

    check(this.debug, Boolean);
    check(this.schema, Object);
    check(this.public, Boolean);
    check(this.protected, Match.OneOf(Boolean, Function));
    check(this.chunkSize, Number);
    check(this.downloadRoute, String);
    check(this.namingFunction, Match.OneOf(false, Function));
    check(this.onBeforeUpload, Match.OneOf(false, Function));
    check(this.onInitiateUpload, Match.OneOf(false, Function));
    check(this.allowClientCode, Boolean);

    if (this.public && this.protected) {
      throw new Meteor.Error(500, `[FilesCollection.${this.collectionName}]: Files can not be public and protected at the same time!`);
    }

    this._checkAccess = http => {
      if (this.protected) {
        let result;

        const {
          user,
          userId
        } = this._getUser(http);

        if (_.isFunction(this.protected)) {
          let fileRef;

          if (_.isObject(http.params) && http.params._id) {
            fileRef = this.collection.findOne(http.params._id);
          }

          result = http ? this.protected.call(_.extend(http, {
            user,
            userId
          }), fileRef || null) : this.protected.call({
            user,
            userId
          }, fileRef || null);
        } else {
          result = !!userId;
        }

        if (http && result === true || !http) {
          return true;
        }

        const rc = _.isNumber(result) ? result : 401;

        this._debug('[FilesCollection._checkAccess] WARN: Access denied!');

        if (http) {
          const text = 'Access denied!';

          if (!http.response.headersSent) {
            http.response.writeHead(rc, {
              'Content-Type': 'text/plain',
              'Content-Length': text.length
            });
          }

          if (!http.response.finished) {
            http.response.end(text);
          }
        }

        return false;
      }

      return true;
    };

    this._methodNames = {
      _Abort: `_FilesCollectionAbort_${this.collectionName}`,
      _Write: `_FilesCollectionWrite_${this.collectionName}`,
      _Start: `_FilesCollectionStart_${this.collectionName}`,
      _Remove: `_FilesCollectionRemove_${this.collectionName}`
    };
    this.on('_handleUpload', this._handleUpload);
    this.on('_finishUpload', this._finishUpload);

    if (!this.disableUpload && !this.disableDownload) {
      WebApp.connectHandlers.use((httpReq, httpResp, next) => {
        if (!this.disableUpload && !!~httpReq._parsedUrl.path.indexOf(`${this.downloadRoute}/${this.collectionName}/__upload`)) {
          if (httpReq.method === 'POST') {
            const handleError = error => {
              console.warn('[FilesCollection] [Upload] [HTTP] Exception:', error);

              if (!httpResp.headersSent) {
                httpResp.writeHead(500);
              }

              if (!httpResp.finished) {
                httpResp.end(JSON.stringify({
                  error
                }));
              }
            };

            let body = '';
            httpReq.on('data', data => bound(() => {
              body += data;
            }));
            httpReq.on('end', () => bound(() => {
              try {
                let opts;
                let result;
                let user;

                if (httpReq.headers['x-mtok'] && _.isObject(Meteor.server.sessions) && _.has(Meteor.server.sessions[httpReq.headers['x-mtok']], 'userId')) {
                  user = {
                    userId: Meteor.server.sessions[httpReq.headers['x-mtok']].userId
                  };
                } else {
                  user = this._getUser({
                    request: httpReq,
                    response: httpResp
                  });
                }

                if (httpReq.headers['x-start'] !== '1') {
                  opts = {
                    fileId: httpReq.headers['x-fileid']
                  };

                  if (httpReq.headers['x-eof'] === '1') {
                    opts.eof = true;
                  } else {
                    if (typeof Buffer.from === 'function') {
                      try {
                        opts.binData = Buffer.from(body, 'base64');
                      } catch (buffErr) {
                        opts.binData = new Buffer(body, 'base64');
                      }
                    } else {
                      opts.binData = new Buffer(body, 'base64');
                    }

                    opts.chunkId = parseInt(httpReq.headers['x-chunkid']);
                  }

                  const _continueUpload = this._continueUpload(opts.fileId);

                  if (!_continueUpload) {
                    throw new Meteor.Error(408, 'Can\'t continue upload, session expired. Start upload again.');
                  }

                  ({
                    result,
                    opts
                  } = this._prepareUpload(_.extend(opts, _continueUpload), user.userId, 'HTTP'));

                  if (opts.eof) {
                    this._handleUpload(result, opts, () => {
                      if (!httpResp.headersSent) {
                        httpResp.writeHead(200);
                      }

                      if (_.isObject(result.file) && result.file.meta) {
                        result.file.meta = fixJSONStringify(result.file.meta);
                      }

                      if (!httpResp.finished) {
                        httpResp.end(JSON.stringify(result));
                      }
                    });

                    return;
                  }

                  this.emit('_handleUpload', result, opts, NOOP);

                  if (!httpResp.headersSent) {
                    httpResp.writeHead(204);
                  }

                  if (!httpResp.finished) {
                    httpResp.end();
                  }
                } else {
                  try {
                    opts = JSON.parse(body);
                  } catch (jsonErr) {
                    console.error('Can\'t parse incoming JSON from Client on [.insert() | upload], something went wrong!', jsonErr);
                    opts = {
                      file: {}
                    };
                  }

                  opts.___s = true;

                  this._debug(`[FilesCollection] [File Start HTTP] ${opts.file.name} - ${opts.fileId}`);

                  if (_.isObject(opts.file) && opts.file.meta) {
                    opts.file.meta = fixJSONParse(opts.file.meta);
                  }

                  ({
                    result
                  } = this._prepareUpload(_.clone(opts), user.userId, 'HTTP Start Method'));

                  if (this.collection.findOne(result._id)) {
                    throw new Meteor.Error(400, 'Can\'t start upload, data substitution detected!');
                  }

                  opts._id = opts.fileId;
                  opts.createdAt = new Date();
                  opts.maxLength = opts.fileLength;

                  this._preCollection.insert(_.omit(opts, '___s'));

                  this._createStream(result._id, result.path, _.omit(opts, '___s'));

                  if (opts.returnMeta) {
                    if (!httpResp.headersSent) {
                      httpResp.writeHead(200);
                    }

                    if (!httpResp.finished) {
                      httpResp.end(JSON.stringify({
                        uploadRoute: `${this.downloadRoute}/${this.collectionName}/__upload`,
                        file: result
                      }));
                    }
                  } else {
                    if (!httpResp.headersSent) {
                      httpResp.writeHead(204);
                    }

                    if (!httpResp.finished) {
                      httpResp.end();
                    }
                  }
                }
              } catch (httpRespErr) {
                handleError(httpRespErr);
              }
            }));
          } else {
            next();
          }

          return;
        }

        if (!this.disableDownload) {
          let http;
          let params;
          let uri;
          let uris;

          if (!this.public) {
            if (!!~httpReq._parsedUrl.path.indexOf(`${this.downloadRoute}/${this.collectionName}`)) {
              uri = httpReq._parsedUrl.path.replace(`${this.downloadRoute}/${this.collectionName}`, '');

              if (uri.indexOf('/') === 0) {
                uri = uri.substring(1);
              }

              uris = uri.split('/');

              if (uris.length === 3) {
                params = {
                  _id: uris[0],
                  query: httpReq._parsedUrl.query ? nodeQs.parse(httpReq._parsedUrl.query) : {},
                  name: uris[2].split('?')[0],
                  version: uris[1]
                };
                http = {
                  request: httpReq,
                  response: httpResp,
                  params
                };

                if (this._checkAccess(http)) {
                  this.download(http, uris[1], this.collection.findOne(uris[0]));
                }
              } else {
                next();
              }
            } else {
              next();
            }
          } else {
            if (!!~httpReq._parsedUrl.path.indexOf(`${this.downloadRoute}`)) {
              uri = httpReq._parsedUrl.path.replace(`${this.downloadRoute}`, '');

              if (uri.indexOf('/') === 0) {
                uri = uri.substring(1);
              }

              uris = uri.split('/');
              let _file = uris[uris.length - 1];

              if (_file) {
                let version;

                if (!!~_file.indexOf('-')) {
                  version = _file.split('-')[0];
                  _file = _file.split('-')[1].split('?')[0];
                } else {
                  version = 'original';
                  _file = _file.split('?')[0];
                }

                params = {
                  query: httpReq._parsedUrl.query ? nodeQs.parse(httpReq._parsedUrl.query) : {},
                  file: _file,
                  _id: _file.split('.')[0],
                  version,
                  name: _file
                };
                http = {
                  request: httpReq,
                  response: httpResp,
                  params
                };
                this.download(http, version, this.collection.findOne(params._id));
              } else {
                next();
              }
            } else {
              next();
            }
          }

          return;
        }

        next();
      });
    }

    if (!this.disableUpload) {
      const _methods = {}; // Method used to remove file
      // from Client side

      _methods[this._methodNames._Remove] = function (selector) {
        check(selector, Match.OneOf(String, Object));

        self._debug(`[FilesCollection] [Unlink Method] [.remove(${selector})]`);

        if (self.allowClientCode) {
          if (self.onBeforeRemove && _.isFunction(self.onBeforeRemove)) {
            const userId = this.userId;
            const userFuncs = {
              userId: this.userId,

              user() {
                if (Meteor.users) {
                  return Meteor.users.findOne(userId);
                }

                return null;
              }

            };

            if (!self.onBeforeRemove.call(userFuncs, self.find(selector) || null)) {
              throw new Meteor.Error(403, '[FilesCollection] [remove] Not permitted!');
            }
          }

          const cursor = self.find(selector);

          if (cursor.count() > 0) {
            self.remove(selector);
            return true;
          }

          throw new Meteor.Error(404, 'Cursor is empty, no files is removed');
        } else {
          throw new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!');
        }
      }; // Method used to receive "first byte" of upload
      // and all file's meta-data, so
      // it won't be transferred with every chunk
      // Basically it prepares everything
      // So user can pause/disconnect and
      // continue upload later, during `continueUploadTTL`


      _methods[this._methodNames._Start] = function (opts, returnMeta) {
        check(opts, {
          file: Object,
          fileId: String,
          FSName: Match.Optional(String),
          chunkSize: Number,
          fileLength: Number
        });
        check(returnMeta, Match.Optional(Boolean));

        self._debug(`[FilesCollection] [File Start Method] ${opts.file.name} - ${opts.fileId}`);

        opts.___s = true;

        const {
          result
        } = self._prepareUpload(_.clone(opts), this.userId, 'DDP Start Method');

        if (self.collection.findOne(result._id)) {
          throw new Meteor.Error(400, 'Can\'t start upload, data substitution detected!');
        }

        opts._id = opts.fileId;
        opts.createdAt = new Date();
        opts.maxLength = opts.fileLength;

        self._preCollection.insert(_.omit(opts, '___s'));

        self._createStream(result._id, result.path, _.omit(opts, '___s'));

        if (returnMeta) {
          return {
            uploadRoute: `${self.downloadRoute}/${self.collectionName}/__upload`,
            file: result
          };
        }

        return true;
      }; // Method used to write file chunks
      // it receives very limited amount of meta-data
      // This method also responsible for EOF


      _methods[this._methodNames._Write] = function (opts) {
        let result;
        check(opts, {
          eof: Match.Optional(Boolean),
          fileId: String,
          binData: Match.Optional(String),
          chunkId: Match.Optional(Number)
        });

        if (opts.binData) {
          if (typeof Buffer.from === 'function') {
            try {
              opts.binData = Buffer.from(opts.binData, 'base64');
            } catch (buffErr) {
              opts.binData = new Buffer(opts.binData, 'base64');
            }
          } else {
            opts.binData = new Buffer(opts.binData, 'base64');
          }
        }

        const _continueUpload = self._continueUpload(opts.fileId);

        if (!_continueUpload) {
          throw new Meteor.Error(408, 'Can\'t continue upload, session expired. Start upload again.');
        }

        this.unblock();
        ({
          result,
          opts
        } = self._prepareUpload(_.extend(opts, _continueUpload), this.userId, 'DDP'));

        if (opts.eof) {
          try {
            return Meteor.wrapAsync(self._handleUpload.bind(self, result, opts))();
          } catch (handleUploadErr) {
            self._debug('[FilesCollection] [Write Method] [DDP] Exception:', handleUploadErr);

            throw handleUploadErr;
          }
        } else {
          self.emit('_handleUpload', result, opts, NOOP);
        }

        return true;
      }; // Method used to Abort upload
      // - Feeing memory by .end()ing writableStreams
      // - Removing temporary record from @_preCollection
      // - Removing record from @collection
      // - .unlink()ing chunks from FS


      _methods[this._methodNames._Abort] = function (_id) {
        check(_id, String);

        const _continueUpload = self._continueUpload(_id);

        self._debug(`[FilesCollection] [Abort Method]: ${_id} - ${_.isObject(_continueUpload.file) ? _continueUpload.file.path : ''}`);

        if (self._currentUploads && self._currentUploads[_id]) {
          self._currentUploads[_id].stop();

          self._currentUploads[_id].abort();
        }

        if (_continueUpload) {
          self._preCollection.remove({
            _id
          });

          self.remove({
            _id
          });

          if (_.isObject(_continueUpload.file) && _continueUpload.file.path) {
            self.unlink({
              _id,
              path: _continueUpload.file.path
            });
          }
        }

        return true;
      };

      Meteor.methods(_methods);
    }
  } /*
     * @locus Server
     * @memberOf FilesCollection
     * @name _prepareUpload
     * @summary Internal method. Used to optimize received data and check upload permission
     * @returns {Object}
     */

  _prepareUpload(opts = {}, userId, transport) {
    let ctx;

    if (!_.isBoolean(opts.eof)) {
      opts.eof = false;
    }

    if (!opts.binData) {
      opts.binData = 'EOF';
    }

    if (!_.isNumber(opts.chunkId)) {
      opts.chunkId = -1;
    }

    if (!_.isString(opts.FSName)) {
      opts.FSName = opts.fileId;
    }

    this._debug(`[FilesCollection] [Upload] [${transport}] Got #${opts.chunkId}/${opts.fileLength} chunks, dst: ${opts.file.name || opts.file.fileName}`);

    const fileName = this._getFileName(opts.file);

    const {
      extension,
      extensionWithDot
    } = this._getExt(fileName);

    if (!_.isObject(opts.file.meta)) {
      opts.file.meta = {};
    }

    let result = opts.file;
    result.name = fileName;
    result.meta = opts.file.meta;
    result.extension = extension;
    result.ext = extension;
    result._id = opts.fileId;
    result.userId = userId || null;
    opts.FSName = opts.FSName.replace(/([^a-z0-9\-\_]+)/gi, '-');
    result.path = `${this.storagePath(result)}${nodePath.sep}${opts.FSName}${extensionWithDot}`;
    result = _.extend(result, this._dataToSchema(result));

    if (this.onBeforeUpload && _.isFunction(this.onBeforeUpload)) {
      ctx = _.extend({
        file: opts.file
      }, {
        chunkId: opts.chunkId,
        userId: result.userId,

        user() {
          if (Meteor.users && result.userId) {
            return Meteor.users.findOne(result.userId);
          }

          return null;
        },

        eof: opts.eof
      });
      const isUploadAllowed = this.onBeforeUpload.call(ctx, result);

      if (isUploadAllowed !== true) {
        throw new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : '@onBeforeUpload() returned false');
      } else {
        if (opts.___s === true && this.onInitiateUpload && _.isFunction(this.onInitiateUpload)) {
          this.onInitiateUpload.call(ctx, result);
        }
      }
    } else if (opts.___s === true && this.onInitiateUpload && _.isFunction(this.onInitiateUpload)) {
      ctx = _.extend({
        file: opts.file
      }, {
        chunkId: opts.chunkId,
        userId: result.userId,

        user() {
          if (Meteor.users && result.userId) {
            return Meteor.users.findOne(result.userId);
          }

          return null;
        },

        eof: opts.eof
      });
      this.onInitiateUpload.call(ctx, result);
    }

    return {
      result,
      opts
    };
  } /*
     * @locus Server
     * @memberOf FilesCollection
     * @name _finishUpload
     * @summary Internal method. Finish upload, close Writable stream, add record to MongoDB and flush used memory
     * @returns {undefined}
     */

  _finishUpload(result, opts, cb) {
    this._debug(`[FilesCollection] [Upload] [finish(ing)Upload] -> ${result.path}`);

    fs.chmod(result.path, this.permissions, NOOP);
    result.type = this._getMimeType(opts.file);
    result.public = this.public;

    this._updateFileTypes(result);

    this.collection.insert(_.clone(result), (error, _id) => {
      if (error) {
        cb && cb(error);

        this._debug('[FilesCollection] [Upload] [_finishUpload] Error:', error);
      } else {
        this._preCollection.update({
          _id: opts.fileId
        }, {
          $set: {
            isFinished: true
          }
        });

        result._id = _id;

        this._debug(`[FilesCollection] [Upload] [finish(ed)Upload] -> ${result.path}`);

        this.onAfterUpload && this.onAfterUpload.call(this, result);
        this.emit('afterUpload', result);
        cb && cb(null, result);
      }
    });
  } /*
     * @locus Server
     * @memberOf FilesCollection
     * @name _handleUpload
     * @summary Internal method to handle upload process, pipe incoming data to Writable stream
     * @returns {undefined}
     */

  _handleUpload(result, opts, cb) {
    try {
      if (opts.eof) {
        this._currentUploads[result._id].end(() => {
          this.emit('_finishUpload', result, opts, cb);
        });
      } else {
        this._currentUploads[result._id].write(opts.chunkId, opts.binData, cb);
      }
    } catch (e) {
      this._debug('[_handleUpload] [EXCEPTION:]', e);

      cb && cb(e);
    }
  } /*
     * @locus Anywhere
     * @memberOf FilesCollection
     * @name _getMimeType
     * @param {Object} fileData - File Object
     * @summary Returns file's mime-type
     * @returns {String}
     */

  _getMimeType(fileData) {
    let mime;
    check(fileData, Object);

    if (_.isObject(fileData) && fileData.type) {
      mime = fileData.type;
    }

    if (fileData.path && (!mime || !_.isString(mime))) {
      try {
        let buf = new Buffer(262);
        const fd = fs.openSync(fileData.path, 'r');
        const br = fs.readSync(fd, buf, 0, 262, 0);
        fs.close(fd, NOOP);

        if (br < 262) {
          buf = buf.slice(0, br);
        }

        ({
          mime
        } = fileType(buf));
      } catch (e) {// We're good
      }
    }

    if (!mime || !_.isString(mime)) {
      mime = 'application/octet-stream';
    }

    return mime;
  } /*
     * @locus Anywhere
     * @memberOf FilesCollection
     * @name _getUser
     * @summary Returns object with `userId` and `user()` method which return user's object
     * @returns {Object}
     */

  _getUser(http) {
    const result = {
      user() {
        return null;
      },

      userId: null
    };

    if (http) {
      let mtok = null;

      if (http.request.headers['x-mtok']) {
        mtok = http.request.headers['x-mtok'];
      } else {
        const cookie = http.request.Cookies;

        if (cookie.has('x_mtok')) {
          mtok = cookie.get('x_mtok');
        }
      }

      if (mtok) {
        const userId = _.isObject(Meteor.server.sessions) && _.isObject(Meteor.server.sessions[mtok]) ? Meteor.server.sessions[mtok].userId : void 0;

        if (userId) {
          result.user = () => Meteor.users.findOne(userId);

          result.userId = userId;
        }
      }
    }

    return result;
  } /*
     * @locus Server
     * @memberOf FilesCollection
     * @name write
     * @param {Buffer} buffer - Binary File's Buffer
     * @param {Object} opts - Object with file-data
     * @param {String} opts.name - File name, alias: `fileName`
     * @param {String} opts.type - File mime-type
     * @param {Object} opts.meta - File additional meta-data
     * @param {String} opts.userId - UserId, default *null*
     * @param {String} opts.fileId - _id, default *null*
     * @param {Function} callback - function(error, fileObj){...}
     * @param {Boolean} proceedAfterUpload - Proceed onAfterUpload hook
     * @summary Write buffer to FS and add to FilesCollection Collection
     * @returns {FilesCollection} Instance
     */

  write(buffer, opts = {}, callback, proceedAfterUpload) {
    this._debug('[FilesCollection] [write()]');

    if (_.isFunction(opts)) {
      proceedAfterUpload = callback;
      callback = opts;
      opts = {};
    } else if (_.isBoolean(callback)) {
      proceedAfterUpload = callback;
    } else if (_.isBoolean(opts)) {
      proceedAfterUpload = opts;
    }

    check(opts, Match.Optional(Object));
    check(callback, Match.Optional(Function));
    check(proceedAfterUpload, Match.Optional(Boolean));
    const fileId = opts.fileId || Random.id();
    const FSName = this.namingFunction ? this.namingFunction(opts) : fileId;
    const fileName = opts.name || opts.fileName ? opts.name || opts.fileName : FSName;

    const {
      extension,
      extensionWithDot
    } = this._getExt(fileName);

    opts.path = `${this.storagePath(opts)}${nodePath.sep}${FSName}${extensionWithDot}`;
    opts.type = this._getMimeType(opts);

    if (!_.isObject(opts.meta)) {
      opts.meta = {};
    }

    if (!_.isNumber(opts.size)) {
      opts.size = buffer.length;
    }

    const result = this._dataToSchema({
      name: fileName,
      path: opts.path,
      meta: opts.meta,
      type: opts.type,
      size: opts.size,
      userId: opts.userId,
      extension
    });

    result._id = fileId;
    const stream = fs.createWriteStream(opts.path, {
      flags: 'w',
      mode: this.permissions
    });
    stream.end(buffer, streamErr => bound(() => {
      if (streamErr) {
        callback && callback(streamErr);
      } else {
        this.collection.insert(result, (insertErr, _id) => {
          if (insertErr) {
            callback && callback(insertErr);

            this._debug(`[FilesCollection] [write] [insert] Error: ${fileName} -> ${this.collectionName}`, insertErr);
          } else {
            const fileRef = this.collection.findOne(_id);
            callback && callback(null, fileRef);

            if (proceedAfterUpload === true) {
              this.onAfterUpload && this.onAfterUpload.call(this, fileRef);
              this.emit('afterUpload', fileRef);
            }

            this._debug(`[FilesCollection] [write]: ${fileName} -> ${this.collectionName}`);
          }
        });
      }
    }));
    return this;
  } /*
     * @locus Server
     * @memberOf FilesCollection
     * @name load
     * @param {String} url - URL to file
     * @param {Object} opts - Object with file-data
     * @param {Object} opts.headers - HTTP headers to use when requesting the file
     * @param {String} opts.name - File name, alias: `fileName`
     * @param {String} opts.type - File mime-type
     * @param {Object} opts.meta - File additional meta-data
     * @param {String} opts.userId - UserId, default *null*
     * @param {String} opts.fileId - _id, default *null*
     * @param {Function} callback - function(error, fileObj){...}
     * @param {Boolean} proceedAfterUpload - Proceed onAfterUpload hook
     * @summary Download file, write stream to FS and add to FilesCollection Collection
     * @returns {FilesCollection} Instance
     */

  load(url, opts = {}, callback, proceedAfterUpload) {
    this._debug(`[FilesCollection] [load(${url}, ${JSON.stringify(opts)}, callback)]`);

    if (_.isFunction(opts)) {
      proceedAfterUpload = callback;
      callback = opts;
      opts = {};
    } else if (_.isBoolean(callback)) {
      proceedAfterUpload = callback;
    } else if (_.isBoolean(opts)) {
      proceedAfterUpload = opts;
    }

    check(url, String);
    check(opts, Match.Optional(Object));
    check(callback, Match.Optional(Function));
    check(proceedAfterUpload, Match.Optional(Boolean));

    if (!_.isObject(opts)) {
      opts = {};
    }

    const fileId = opts.fileId || Random.id();
    const FSName = this.namingFunction ? this.namingFunction(opts) : fileId;
    const pathParts = url.split('/');
    const fileName = opts.name || opts.fileName ? opts.name || opts.fileName : pathParts[pathParts.length - 1] || FSName;

    const {
      extension,
      extensionWithDot
    } = this._getExt(fileName);

    opts.path = `${this.storagePath(opts)}${nodePath.sep}${FSName}${extensionWithDot}`;

    const storeResult = (result, cb) => {
      result._id = fileId;
      this.collection.insert(result, (error, _id) => {
        if (error) {
          cb && cb(error);

          this._debug(`[FilesCollection] [load] [insert] Error: ${fileName} -> ${this.collectionName}`, error);
        } else {
          const fileRef = this.collection.findOne(_id);
          cb && cb(null, fileRef);

          if (proceedAfterUpload === true) {
            this.onAfterUpload && this.onAfterUpload.call(this, fileRef);
            this.emit('afterUpload', fileRef);
          }

          this._debug(`[FilesCollection] [load] [insert] ${fileName} -> ${this.collectionName}`);
        }
      });
    };

    request.get({
      url,
      headers: opts.headers || {}
    }).on('error', error => bound(() => {
      callback && callback(error);

      this._debug(`[FilesCollection] [load] [request.get(${url})] Error:`, error);
    })).on('response', response => bound(() => {
      response.on('end', () => bound(() => {
        this._debug(`[FilesCollection] [load] Received: ${url}`);

        const result = this._dataToSchema({
          name: fileName,
          path: opts.path,
          meta: opts.meta,
          type: opts.type || response.headers['content-type'] || this._getMimeType({
            path: opts.path
          }),
          size: opts.size || parseInt(response.headers['content-length'] || 0),
          userId: opts.userId,
          extension
        });

        if (!result.size) {
          fs.stat(opts.path, (error, stats) => bound(() => {
            if (error) {
              callback && callback(error);
            } else {
              result.versions.original.size = result.size = stats.size;
              storeResult(result, callback);
            }
          }));
        } else {
          storeResult(result, callback);
        }
      }));
    })).pipe(fs.createWriteStream(opts.path, {
      flags: 'w',
      mode: this.permissions
    }));
    return this;
  } /*
     * @locus Server
     * @memberOf FilesCollection
     * @name addFile
     * @param {String} path          - Path to file
     * @param {String} opts          - [Optional] Object with file-data
     * @param {String} opts.type     - [Optional] File mime-type
     * @param {Object} opts.meta     - [Optional] File additional meta-data
     * @param {Object} opts.fileName - [Optional] File name, if not specified file name and extension will be taken from path
     * @param {String} opts.userId   - [Optional] UserId, default *null*
     * @param {Function} callback    - [Optional] function(error, fileObj){...}
     * @param {Boolean} proceedAfterUpload - Proceed onAfterUpload hook
     * @summary Add file from FS to FilesCollection
     * @returns {FilesCollection} Instance
     */

  addFile(path, opts = {}, callback, proceedAfterUpload) {
    this._debug(`[FilesCollection] [addFile(${path})]`);

    if (_.isFunction(opts)) {
      proceedAfterUpload = callback;
      callback = opts;
      opts = {};
    } else if (_.isBoolean(callback)) {
      proceedAfterUpload = callback;
    } else if (_.isBoolean(opts)) {
      proceedAfterUpload = opts;
    }

    if (this.public) {
      throw new Meteor.Error(403, 'Can not run [addFile] on public collection! Just Move file to root of your server, then add record to Collection');
    }

    check(path, String);
    check(opts, Match.Optional(Object));
    check(callback, Match.Optional(Function));
    check(proceedAfterUpload, Match.Optional(Boolean));
    fs.stat(path, (statErr, stats) => bound(() => {
      if (statErr) {
        callback && callback(statErr);
      } else if (stats.isFile()) {
        if (!_.isObject(opts)) {
          opts = {};
        }

        opts.path = path;

        if (!opts.fileName) {
          const pathParts = path.split(nodePath.sep);
          opts.fileName = path.split(nodePath.sep)[pathParts.length - 1];
        }

        const {
          extension
        } = this._getExt(opts.fileName);

        if (!_.isString(opts.type)) {
          opts.type = this._getMimeType(opts);
        }

        if (!_.isObject(opts.meta)) {
          opts.meta = {};
        }

        if (!_.isNumber(opts.size)) {
          opts.size = stats.size;
        }

        const result = this._dataToSchema({
          name: opts.fileName,
          path,
          meta: opts.meta,
          type: opts.type,
          size: opts.size,
          userId: opts.userId,
          extension,
          _storagePath: path.replace(`${nodePath.sep}${opts.fileName}`, ''),
          fileId: opts.fileId || null
        });

        this.collection.insert(result, (insertErr, _id) => {
          if (insertErr) {
            callback && callback(insertErr);

            this._debug(`[FilesCollection] [addFile] [insert] Error: ${result.name} -> ${this.collectionName}`, insertErr);
          } else {
            const fileRef = this.collection.findOne(_id);
            callback && callback(null, fileRef);

            if (proceedAfterUpload === true) {
              this.onAfterUpload && this.onAfterUpload.call(this, fileRef);
              this.emit('afterUpload', fileRef);
            }

            this._debug(`[FilesCollection] [addFile]: ${result.name} -> ${this.collectionName}`);
          }
        });
      } else {
        callback && callback(new Meteor.Error(400, `[FilesCollection] [addFile(${path})]: File does not exist`));
      }
    }));
    return this;
  } /*
     * @locus Anywhere
     * @memberOf FilesCollection
     * @name remove
     * @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)
     * @param {Function} callback - Callback with one `error` argument
     * @summary Remove documents from the collection
     * @returns {FilesCollection} Instance
     */

  remove(selector, callback) {
    this._debug(`[FilesCollection] [remove(${JSON.stringify(selector)})]`);

    if (selector === undefined) {
      return 0;
    }

    check(callback, Match.Optional(Function));
    const files = this.collection.find(selector);

    if (files.count() > 0) {
      files.forEach(file => {
        this.unlink(file);
      });
    } else {
      callback && callback(new Meteor.Error(404, 'Cursor is empty, no files is removed'));
      return this;
    }

    if (this.onAfterRemove) {
      const docs = files.fetch();
      const self = this;
      this.collection.remove(selector, function () {
        callback && callback.apply(this, arguments);
        self.onAfterRemove(docs);
      });
    } else {
      this.collection.remove(selector, callback || NOOP);
    }

    return this;
  } /*
     * @locus Server
     * @memberOf FilesCollection
     * @name deny
     * @param {Object} rules
     * @see  https://docs.meteor.com/api/collections.html#Mongo-Collection-deny
     * @summary link Mongo.Collection deny methods
     * @returns {Mongo.Collection} Instance
     */

  deny(rules) {
    this.collection.deny(rules);
    return this.collection;
  } /*
     * @locus Server
     * @memberOf FilesCollection
     * @name allow
     * @param {Object} rules
     * @see https://docs.meteor.com/api/collections.html#Mongo-Collection-allow
     * @summary link Mongo.Collection allow methods
     * @returns {Mongo.Collection} Instance
     */

  allow(rules) {
    this.collection.allow(rules);
    return this.collection;
  } /*
     * @locus Server
     * @memberOf FilesCollection
     * @name denyClient
     * @see https://docs.meteor.com/api/collections.html#Mongo-Collection-deny
     * @summary Shorthands for Mongo.Collection deny method
     * @returns {Mongo.Collection} Instance
     */

  denyClient() {
    this.collection.deny({
      insert() {
        return true;
      },

      update() {
        return true;
      },

      remove() {
        return true;
      }

    });
    return this.collection;
  } /*
     * @locus Server
     * @memberOf FilesCollection
     * @name allowClient
     * @see https://docs.meteor.com/api/collections.html#Mongo-Collection-allow
     * @summary Shorthands for Mongo.Collection allow method
     * @returns {Mongo.Collection} Instance
     */

  allowClient() {
    this.collection.allow({
      insert() {
        return true;
      },

      update() {
        return true;
      },

      remove() {
        return true;
      }

    });
    return this.collection;
  } /*
     * @locus Server
     * @memberOf FilesCollection
     * @name unlink
     * @param {Object} fileRef - fileObj
     * @param {String} version - [Optional] file's version
     * @param {Function} callback - [Optional] callback function
     * @summary Unlink files and it's versions from FS
     * @returns {FilesCollection} Instance
     */

  unlink(fileRef, version, callback) {
    this._debug(`[FilesCollection] [unlink(${fileRef._id}, ${version})]`);

    if (version) {
      if (_.isObject(fileRef.versions) && _.isObject(fileRef.versions[version]) && fileRef.versions[version].path) {
        fs.unlink(fileRef.versions[version].path, callback || NOOP);
      }
    } else {
      if (_.isObject(fileRef.versions)) {
        _.each(fileRef.versions, vRef => bound(() => {
          fs.unlink(vRef.path, callback || NOOP);
        }));
      } else {
        fs.unlink(fileRef.path, callback || NOOP);
      }
    }

    return this;
  } /*
     * @locus Server
     * @memberOf FilesCollection
     * @name _404
     * @summary Internal method, used to return 404 error
     * @returns {undefined}
     */

  _404(http) {
    this._debug(`[FilesCollection] [download(${http.request.originalUrl})] [_404] File not found`);

    const text = 'File Not Found :(';

    if (!http.response.headersSent) {
      http.response.writeHead(404, {
        'Content-Type': 'text/plain',
        'Content-Length': text.length
      });
    }

    if (!http.response.finished) {
      http.response.end(text);
    }
  } /*
     * @locus Server
     * @memberOf FilesCollection
     * @name download
     * @param {Object} http    - Server HTTP object
     * @param {String} version - Requested file version
     * @param {Object} fileRef - Requested file Object
     * @summary Initiates the HTTP response
     * @returns {undefined}
     */

  download(http, version = 'original', fileRef) {
    let vRef;

    this._debug(`[FilesCollection] [download(${http.request.originalUrl}, ${version})]`);

    if (fileRef) {
      if (_.has(fileRef, 'versions') && _.has(fileRef.versions, version)) {
        vRef = fileRef.versions[version];
        vRef._id = fileRef._id;
      } else {
        vRef = fileRef;
      }
    } else {
      vRef = false;
    }

    if (!vRef || !_.isObject(vRef)) {
      return this._404(http);
    } else if (fileRef) {
      if (this.downloadCallback) {
        if (!this.downloadCallback.call(_.extend(http, this._getUser(http)), fileRef)) {
          return this._404(http);
        }
      }

      if (this.interceptDownload && _.isFunction(this.interceptDownload)) {
        if (this.interceptDownload(http, fileRef, version) === true) {
          return void 0;
        }
      }

      fs.stat(vRef.path, (statErr, stats) => bound(() => {
        let responseType;

        if (statErr || !stats.isFile()) {
          return this._404(http);
        }

        if (stats.size !== vRef.size && !this.integrityCheck) {
          vRef.size = stats.size;
        }

        if (stats.size !== vRef.size && this.integrityCheck) {
          responseType = '400';
        }

        return this.serve(http, fileRef, vRef, version, null, responseType || '200');
      }));
      return void 0;
    }

    return this._404(http);
  } /*
     * @locus Server
     * @memberOf FilesCollection
     * @name serve
     * @param {Object} http    - Server HTTP object
     * @param {Object} fileRef - Requested file Object
     * @param {Object} vRef    - Requested file version Object
     * @param {String} version - Requested file version
     * @param {stream.Readable|null} readableStream - Readable stream, which serves binary file data
     * @param {String} responseType - Response code
     * @param {Boolean} force200 - Force 200 response code over 206
     * @summary Handle and reply to incoming request
     * @returns {undefined}
     */

  serve(http, fileRef, vRef, version = 'original', readableStream = null, responseType = '200', force200 = false) {
    let partiral = false;
    let reqRange = false;
    let dispositionType = '';
    let start;
    let end;
    let take;

    if (http.params.query.download && http.params.query.download === 'true') {
      dispositionType = 'attachment; ';
    } else {
      dispositionType = 'inline; ';
    }

    const dispositionName = `filename=\"${encodeURI(vRef.name || fileRef.name)}\"; filename*=UTF-8''${encodeURI(vRef.name || fileRef.name)}; `;
    const dispositionEncoding = 'charset=UTF-8';

    if (!http.response.headersSent) {
      http.response.setHeader('Content-Disposition', dispositionType + dispositionName + dispositionEncoding);
    }

    if (http.request.headers.range && !force200) {
      partiral = true;
      const array = http.request.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);
      start = parseInt(array[1]);
      end = parseInt(array[2]);

      if (isNaN(end)) {
        end = vRef.size - 1;
      }

      take = end - start;
    } else {
      start = 0;
      end = vRef.size - 1;
      take = vRef.size;
    }

    if (partiral || http.params.query.play && http.params.query.play === 'true') {
      reqRange = {
        start,
        end
      };

      if (isNaN(start) && !isNaN(end)) {
        reqRange.start = end - take;
        reqRange.end = end;
      }

      if (!isNaN(start) && isNaN(end)) {
        reqRange.start = start;
        reqRange.end = start + take;
      }

      if (start + take >= vRef.size) {
        reqRange.end = vRef.size - 1;
      }

      if (this.strict && (reqRange.start >= vRef.size - 1 || reqRange.end > vRef.size - 1)) {
        responseType = '416';
      } else {
        responseType = '206';
      }
    } else {
      responseType = '200';
    }

    const streamErrorHandler = error => {
      this._debug(`[FilesCollection] [serve(${vRef.path}, ${version})] [500]`, error);

      if (!http.response.finished) {
        http.response.end(error.toString());
      }
    };

    const headers = _.isFunction(this.responseHeaders) ? this.responseHeaders(responseType, fileRef, vRef, version) : this.responseHeaders;

    if (!headers['Cache-Control']) {
      if (!http.response.headersSent) {
        http.response.setHeader('Cache-Control', this.cacheControl);
      }
    }

    for (let key in headers) {
      if (!http.response.headersSent) {
        http.response.setHeader(key, headers[key]);
      }
    }

    let stream;

    switch (responseType) {
      case '400':
        this._debug(`[FilesCollection] [serve(${vRef.path}, ${version})] [400] Content-Length mismatch!`);

        var text = 'Content-Length mismatch!';

        if (!http.response.headersSent) {
          http.response.writeHead(400, {
            'Content-Type': 'text/plain',
            'Content-Length': text.length
          });
        }

        if (!http.response.finished) {
          http.response.end(text);
        }

        break;

      case '404':
        this._404(http);

        break;

      case '416':
        this._debug(`[FilesCollection] [serve(${vRef.path}, ${version})] [416] Content-Range is not specified!`);

        if (!http.response.headersSent) {
          http.response.writeHead(416);
        }

        if (!http.response.finished) {
          http.response.end();
        }

        break;

      case '206':
        this._debug(`[FilesCollection] [serve(${vRef.path}, ${version})] [206]`);

        if (!http.response.headersSent) {
          http.response.setHeader('Content-Range', `bytes ${reqRange.start}-${reqRange.end}/${vRef.size}`);
        }

        stream = readableStream || fs.createReadStream(vRef.path, {
          start: reqRange.start,
          end: reqRange.end
        });

        if (!http.response.headersSent) {
          if (readableStream) {
            http.response.writeHead(206);
          }
        }

        http.response.on('close', () => {
          if (typeof stream.abort === 'function') {
            stream.abort();
          }

          if (typeof stream.end === 'function') {
            stream.end();
          }
        });
        http.request.on('abort', () => {
          if (typeof stream.abort === 'function') {
            stream.abort();
          }

          if (typeof stream.end === 'function') {
            stream.end();
          }
        });
        stream.on('open', () => {
          if (!http.response.headersSent) {
            http.response.writeHead(206);
          }
        }).on('abort', () => {
          if (!http.response.finished) {
            http.response.end();
          }

          if (!http.request.aborted) {
            http.request.abort();
          }
        }).on('error', streamErrorHandler).on('end', () => {
          if (!http.response.finished) {
            http.response.end();
          }
        }).pipe(http.response);
        break;

      default:
        this._debug(`[FilesCollection] [serve(${vRef.path}, ${version})] [200]`);

        stream = readableStream || fs.createReadStream(vRef.path);

        if (!http.response.headersSent) {
          if (readableStream) {
            http.response.writeHead(200);
          }
        }

        http.response.on('close', () => {
          if (typeof stream.abort === 'function') {
            stream.abort();
          }

          if (typeof stream.end === 'function') {
            stream.end();
          }
        });
        http.request.on('abort', () => {
          if (typeof stream.abort === 'function') {
            stream.abort();
          }

          if (typeof stream.end === 'function') {
            stream.end();
          }
        });
        stream.on('open', () => {
          if (!http.response.headersSent) {
            http.response.writeHead(200);
          }
        }).on('abort', () => {
          if (!http.response.finished) {
            http.response.end();
          }

          if (!http.request.aborted) {
            http.request.abort();
          }
        }).on('error', streamErrorHandler).on('end', () => {
          if (!http.response.finished) {
            http.response.end();
          }
        }).pipe(http.response);
        break;
    }
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"core.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/core.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => FilesCollectionCore
});

let _;

module.watch(require("meteor/underscore"), {
  _(v) {
    _ = v;
  }

}, 0);
let EventEmitter;
module.watch(require("eventemitter3"), {
  EventEmitter(v) {
    EventEmitter = v;
  }

}, 1);
let formatFleURL;
module.watch(require("./lib.js"), {
  formatFleURL(v) {
    formatFleURL = v;
  }

}, 2);
let check, Match;
module.watch(require("meteor/check"), {
  check(v) {
    check = v;
  },

  Match(v) {
    Match = v;
  }

}, 3);
let FilesCursor, FileCursor;
module.watch(require("./cursor.js"), {
  FilesCursor(v) {
    FilesCursor = v;
  },

  FileCursor(v) {
    FileCursor = v;
  }

}, 4);

class FilesCollectionCore extends EventEmitter {
  constructor() {
    super();
  } /*
     * @locus Anywhere
     * @memberOf FilesCollectionCore
     * @name _debug
     * @summary Print logs in debug mode
     * @returns {void}
     */

  _debug() {
    if (this.debug) {
      (console.info || console.log || function () {}).apply(undefined, arguments);
    }
  } /*
     * @locus Anywhere
     * @memberOf FilesCollectionCore
     * @name _getFileName
     * @param {Object} fileData - File Object
     * @summary Returns file's name
     * @returns {String}
     */

  _getFileName(fileData) {
    const fileName = fileData.name || fileData.fileName;

    if (_.isString(fileName) && fileName.length > 0) {
      return (fileData.name || fileData.fileName).replace(/\.\./g, '').replace(/\//g, '');
    }

    return '';
  } /*
     * @locus Anywhere
     * @memberOf FilesCollectionCore
     * @name _getExt
     * @param {String} FileName - File name
     * @summary Get extension from FileName
     * @returns {Object}
     */

  _getExt(fileName) {
    if (!!~fileName.indexOf('.')) {
      const extension = (fileName.split('.').pop().split('?')[0] || '').toLowerCase();
      return {
        ext: extension,
        extension,
        extensionWithDot: `.${extension}`
      };
    }

    return {
      ext: '',
      extension: '',
      extensionWithDot: ''
    };
  } /*
     * @locus Anywhere
     * @memberOf FilesCollectionCore
     * @name _updateFileTypes
     * @param {Object} data - File data
     * @summary Internal method. Classify file based on 'type' field
     */

  _updateFileTypes(data) {
    data.isVideo = /^video\//i.test(data.type);
    data.isAudio = /^audio\//i.test(data.type);
    data.isImage = /^image\//i.test(data.type);
    data.isText = /^text\//i.test(data.type);
    data.isJSON = /^application\/json$/i.test(data.type);
    data.isPDF = /^application\/(x-)?pdf$/i.test(data.type);
  } /*
     * @locus Anywhere
     * @memberOf FilesCollectionCore
     * @name _dataToSchema
     * @param {Object} data - File data
     * @summary Internal method. Build object in accordance with default schema from File data
     * @returns {Object}
     */

  _dataToSchema(data) {
    const ds = {
      name: data.name,
      extension: data.extension,
      path: data.path,
      meta: data.meta,
      type: data.type,
      size: data.size,
      userId: data.userId || null,
      versions: {
        original: {
          path: data.path,
          size: data.size,
          type: data.type,
          extension: data.extension
        }
      },
      _downloadRoute: data._downloadRoute || this.downloadRoute,
      _collectionName: data._collectionName || this.collectionName
    }; //Optional fileId

    if (data.fileId) {
      ds._id = data.fileId;
    }

    this._updateFileTypes(ds);

    ds._storagePath = data._storagePath || this.storagePath(_.extend(data, ds));
    return ds;
  } /*
     * @locus Anywhere
     * @memberOf FilesCollectionCore
     * @name findOne
     * @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)
     * @param {Object} options - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#sortspecifiers)
     * @summary Find and return Cursor for matching document Object
     * @returns {FileCursor} Instance
     */

  findOne(selector = {}, options) {
    this._debug(`[FilesCollection] [findOne(${JSON.stringify(selector)}, ${JSON.stringify(options)})]`);

    check(selector, Match.Optional(Match.OneOf(Object, String, Boolean, Number, null)));
    check(options, Match.Optional(Object));
    const doc = this.collection.findOne(selector, options);

    if (doc) {
      return new FileCursor(doc, this);
    }

    return doc;
  } /*
     * @locus Anywhere
     * @memberOf FilesCollectionCore
     * @name find
     * @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)
     * @param {Object}        options  - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#sortspecifiers)
     * @summary Find and return Cursor for matching documents
     * @returns {FilesCursor} Instance
     */

  find(selector = {}, options) {
    this._debug(`[FilesCollection] [find(${JSON.stringify(selector)}, ${JSON.stringify(options)})]`);

    check(selector, Match.Optional(Match.OneOf(Object, String, Boolean, Number, null)));
    check(options, Match.Optional(Object));
    return new FilesCursor(selector, options, this);
  } /*
     * @locus Anywhere
     * @memberOf FilesCollectionCore
     * @name update
     * @see http://docs.meteor.com/#/full/update
     * @summary link Mongo.Collection update method
     * @returns {Mongo.Collection} Instance
     */

  update() {
    this.collection.update.apply(this.collection, arguments);
    return this.collection;
  } /*
     * @locus Anywhere
     * @memberOf FilesCollectionCore
     * @name link
     * @param {Object} fileRef - File reference object
     * @param {String} version - Version of file you would like to request
     * @summary Returns downloadable URL
     * @returns {String} Empty string returned in case if file not found in DB
     */

  link(fileRef, version = 'original') {
    this._debug(`[FilesCollection] [link(${_.isObject(fileRef) ? fileRef._id : undefined}, ${version})]`);

    check(fileRef, Object);
    check(version, String);

    if (!fileRef) {
      return '';
    }

    return formatFleURL(fileRef, version);
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"cursor.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/cursor.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  FileCursor: () => FileCursor,
  FilesCursor: () => FilesCursor
});

let _;

module.watch(require("meteor/underscore"), {
  _(v) {
    _ = v;
  }

}, 0);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 1);

class FileCursor {
  constructor(_fileRef, _collection) {
    this._fileRef = _fileRef;
    this._collection = _collection;
    Object.assign(this, _fileRef);
  } /*
     * @locus Anywhere
     * @memberOf FileCursor
     * @name remove
     * @param callback {Function} - Triggered asynchronously after item is removed or failed to be removed
     * @summary Remove document
     * @returns {FileCursor}
     */

  remove(callback) {
    this._collection._debug('[FilesCollection] [FileCursor] [remove()]');

    if (this._fileRef) {
      this._collection.remove(this._fileRef._id, callback);
    } else {
      callback && callback(new Meteor.Error(404, 'No such file'));
    }

    return this;
  } /*
     * @locus Anywhere
     * @memberOf FileCursor
     * @name link
     * @param version {String} - Name of file's subversion
     * @summary Returns downloadable URL to File
     * @returns {String}
     */

  link(version = 'original') {
    this._collection._debug(`[FilesCollection] [FileCursor] [link(${version})]`);

    if (this._fileRef) {
      return this._collection.link(this._fileRef, version);
    }

    return '';
  } /*
     * @locus Anywhere
     * @memberOf FileCursor
     * @name get
     * @param property {String} - Name of sub-object property
     * @summary Returns current document as a plain Object, if `property` is specified - returns value of sub-object property
     * @returns {Object|mix}
     */

  get(property) {
    this._collection._debug(`[FilesCollection] [FileCursor] [get(${property})]`);

    if (property) {
      return this._fileRef[property];
    }

    return this._fileRef;
  } /*
     * @locus Anywhere
     * @memberOf FileCursor
     * @name fetch
     * @summary Returns document as plain Object in Array
     * @returns {[Object]}
     */

  fetch() {
    this._collection._debug('[FilesCollection] [FileCursor] [fetch()]');

    return [this._fileRef];
  } /*
     * @locus Anywhere
     * @memberOf FileCursor
     * @name with
     * @summary Returns reactive version of current FileCursor, useful to use with `{{#with}}...{{/with}}` block template helper
     * @returns {[Object]}
     */

  with() {
    this._collection._debug('[FilesCollection] [FileCursor] [with()]');

    return _.extend(this, this._collection.collection.findOne(this._fileRef._id));
  }

}

class FilesCursor {
  constructor(_selector = {}, options, _collection) {
    this._collection = _collection;
    this._selector = _selector;
    this._current = -1;
    this.cursor = this._collection.collection.find(this._selector, options);
  } /*
     * @locus Anywhere
     * @memberOf FilesCursor
     * @name get
     * @summary Returns all matching document(s) as an Array. Alias of `.fetch()`
     * @returns {[Object]}
     */

  get() {
    this._collection._debug('[FilesCollection] [FilesCursor] [get()]');

    return this.cursor.fetch();
  } /*
     * @locus Anywhere
     * @memberOf FilesCursor
     * @name hasNext
     * @summary Returns `true` if there is next item available on Cursor
     * @returns {Boolean}
     */

  hasNext() {
    this._collection._debug('[FilesCollection] [FilesCursor] [hasNext()]');

    return this._current < this.cursor.count() - 1;
  } /*
     * @locus Anywhere
     * @memberOf FilesCursor
     * @name next
     * @summary Returns next item on Cursor, if available
     * @returns {Object|undefined}
     */

  next() {
    this._collection._debug('[FilesCollection] [FilesCursor] [next()]');

    this.cursor.fetch()[++this._current];
  } /*
     * @locus Anywhere
     * @memberOf FilesCursor
     * @name hasPrevious
     * @summary Returns `true` if there is previous item available on Cursor
     * @returns {Boolean}
     */

  hasPrevious() {
    this._collection._debug('[FilesCollection] [FilesCursor] [hasPrevious()]');

    return this._current !== -1;
  } /*
     * @locus Anywhere
     * @memberOf FilesCursor
     * @name previous
     * @summary Returns previous item on Cursor, if available
     * @returns {Object|undefined}
     */

  previous() {
    this._collection._debug('[FilesCollection] [FilesCursor] [previous()]');

    this.cursor.fetch()[--this._current];
  } /*
     * @locus Anywhere
     * @memberOf FilesCursor
     * @name fetch
     * @summary Returns all matching document(s) as an Array.
     * @returns {[Object]}
     */

  fetch() {
    this._collection._debug('[FilesCollection] [FilesCursor] [fetch()]');

    return this.cursor.fetch() || [];
  } /*
     * @locus Anywhere
     * @memberOf FilesCursor
     * @name first
     * @summary Returns first item on Cursor, if available
     * @returns {Object|undefined}
     */

  first() {
    this._collection._debug('[FilesCollection] [FilesCursor] [first()]');

    this._current = 0;
    return this.fetch()[this._current];
  } /*
     * @locus Anywhere
     * @memberOf FilesCursor
     * @name last
     * @summary Returns last item on Cursor, if available
     * @returns {Object|undefined}
     */

  last() {
    this._collection._debug('[FilesCollection] [FilesCursor] [last()]');

    this._current = this.count() - 1;
    return this.fetch()[this._current];
  } /*
     * @locus Anywhere
     * @memberOf FilesCursor
     * @name count
     * @summary Returns the number of documents that match a query
     * @returns {Number}
     */

  count() {
    this._collection._debug('[FilesCollection] [FilesCursor] [count()]');

    return this.cursor.count();
  } /*
     * @locus Anywhere
     * @memberOf FilesCursor
     * @name remove
     * @param callback {Function} - Triggered asynchronously after item is removed or failed to be removed
     * @summary Removes all documents that match a query
     * @returns {FilesCursor}
     */

  remove(callback) {
    this._collection._debug('[FilesCollection] [FilesCursor] [remove()]');

    this._collection.remove(this._selector, callback);

    return this;
  } /*
     * @locus Anywhere
     * @memberOf FilesCursor
     * @name forEach
     * @param callback {Function} - Function to call. It will be called with three arguments: the `file`, a 0-based index, and cursor itself
     * @param context {Object} - An object which will be the value of `this` inside `callback`
     * @summary Call `callback` once for each matching document, sequentially and synchronously.
     * @returns {undefined}
     */

  forEach(callback, context = {}) {
    this._collection._debug('[FilesCollection] [FilesCursor] [forEach()]');

    this.cursor.forEach(callback, context);
  } /*
     * @locus Anywhere
     * @memberOf FilesCursor
     * @name each
     * @summary Returns an Array of FileCursor made for each document on current cursor
     *          Useful when using in {{#each FilesCursor#each}}...{{/each}} block template helper
     * @returns {[FileCursor]}
     */

  each() {
    return this.map(file => {
      return new FileCursor(file, this._collection);
    });
  } /*
     * @locus Anywhere
     * @memberOf FilesCursor
     * @name map
     * @param callback {Function} - Function to call. It will be called with three arguments: the `file`, a 0-based index, and cursor itself
     * @param context {Object} - An object which will be the value of `this` inside `callback`
     * @summary Map `callback` over all matching documents. Returns an Array.
     * @returns {Array}
     */

  map(callback, context = {}) {
    this._collection._debug('[FilesCollection] [FilesCursor] [map()]');

    return this.cursor.map(callback, context);
  } /*
     * @locus Anywhere
     * @memberOf FilesCursor
     * @name current
     * @summary Returns current item on Cursor, if available
     * @returns {Object|undefined}
     */

  current() {
    this._collection._debug('[FilesCollection] [FilesCursor] [current()]');

    if (this._current < 0) {
      this._current = 0;
    }

    return this.fetch()[this._current];
  } /*
     * @locus Anywhere
     * @memberOf FilesCursor
     * @name observe
     * @param callbacks {Object} - Functions to call to deliver the result set as it changes
     * @summary Watch a query. Receive callbacks as the result set changes.
     * @url http://docs.meteor.com/api/collections.html#Mongo-Cursor-observe
     * @returns {Object} - live query handle
     */

  observe(callbacks) {
    this._collection._debug('[FilesCollection] [FilesCursor] [observe()]');

    return this.cursor.observe(callbacks);
  } /*
     * @locus Anywhere
     * @memberOf FilesCursor
     * @name observeChanges
     * @param callbacks {Object} - Functions to call to deliver the result set as it changes
     * @summary Watch a query. Receive callbacks as the result set changes. Only the differences between the old and new documents are passed to the callbacks.
     * @url http://docs.meteor.com/api/collections.html#Mongo-Cursor-observeChanges
     * @returns {Object} - live query handle
     */

  observeChanges(callbacks) {
    this._collection._debug('[FilesCollection] [FilesCursor] [observeChanges()]');

    return this.cursor.observeChanges(callbacks);
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/lib.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  fixJSONParse: () => fixJSONParse,
  fixJSONStringify: () => fixJSONStringify,
  formatFleURL: () => formatFleURL
});

let _;

module.watch(require("meteor/underscore"), {
  _(v) {
    _ = v;
  }

}, 0);
let check;
module.watch(require("meteor/check"), {
  check(v) {
    check = v;
  }

}, 1);

/*
 * @const {Function} fixJSONParse - Fix issue with Date parse
 */const fixJSONParse = function (obj) {
  for (let key in obj) {
    if (_.isString(obj[key]) && !!~obj[key].indexOf('=--JSON-DATE--=')) {
      obj[key] = obj[key].replace('=--JSON-DATE--=', '');
      obj[key] = new Date(parseInt(obj[key]));
    } else if (_.isObject(obj[key])) {
      obj[key] = fixJSONParse(obj[key]);
    } else if (_.isArray(obj[key])) {
      let v;

      for (let i = 0; i < obj[key].length; i++) {
        v = obj[key][i];

        if (_.isObject(v)) {
          obj[key][i] = fixJSONParse(v);
        } else if (_.isString(v) && !!~v.indexOf('=--JSON-DATE--=')) {
          v = v.replace('=--JSON-DATE--=', '');
          obj[key][i] = new Date(parseInt(v));
        }
      }
    }
  }

  return obj;
}; /*
    * @const {Function} fixJSONStringify - Fix issue with Date stringify
    */

const fixJSONStringify = function (obj) {
  for (let key in obj) {
    if (_.isDate(obj[key])) {
      obj[key] = `=--JSON-DATE--=${+obj[key]}`;
    } else if (_.isObject(obj[key])) {
      obj[key] = fixJSONStringify(obj[key]);
    } else if (_.isArray(obj[key])) {
      let v;

      for (let i = 0; i < obj[key].length; i++) {
        v = obj[key][i];

        if (_.isObject(v)) {
          obj[key][i] = fixJSONStringify(v);
        } else if (_.isDate(v)) {
          obj[key][i] = `=--JSON-DATE--=${+v}`;
        }
      }
    }
  }

  return obj;
}; /*
    * @locus Anywhere
    * @private
    * @name formatFleURL
    * @param {Object} fileRef - File reference object
    * @param {String} version - [Optional] Version of file you would like build URL for
    * @summary Returns formatted URL for file
    * @returns {String} Downloadable link
    */

const formatFleURL = (fileRef, version = 'original') => {
  let ext;
  check(fileRef, Object);
  check(version, String);

  const _root = __meteor_runtime_config__.ROOT_URL.replace(/\/+$/, '');

  const vRef = fileRef.versions && fileRef.versions[version] || fileRef;

  if (_.has(vRef, 'extension')) {
    ext = `.${vRef.extension.replace(/^\./, '')}`;
  } else {
    ext = '';
  }

  if (fileRef.public === true) {
    return _root + (version === 'original' ? `${fileRef._downloadRoute}/${fileRef._id}${ext}` : `${fileRef._downloadRoute}/${version}-${fileRef._id}${ext}`);
  }

  return _root + `${fileRef._downloadRoute}/${fileRef._collectionName}/${fileRef._id}/${version}/${fileRef._id}${ext}`;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"write-stream.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/write-stream.js                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => WriteStream
});
let fs;
module.watch(require("fs-extra"), {
  default(v) {
    fs = v;
  }

}, 0);

let _;

module.watch(require("meteor/underscore"), {
  _(v) {
    _ = v;
  }

}, 1);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 2);

const NOOP = () => {}; /*
                        * @const {Object} bound   - Meteor.bindEnvironment (Fiber wrapper)
                        * @const {Object} fdCache - File Descriptors Cache
                        */

const bound = Meteor.bindEnvironment(callback => callback());
const fdCache = {}; /*
                     * @private
                     * @locus Server
                     * @class WriteStream
                     * @param path      {String} - Path to file on FS
                     * @param maxLength {Number} - Max amount of chunks in stream
                     * @param file      {Object} - fileRef Object
                     * @summary writableStream wrapper class, makes sure chunks is written in given order. Implementation of queue stream.
                     */

class WriteStream {
  constructor(path, maxLength, file, permissions) {
    this.path = path;
    this.maxLength = maxLength;
    this.file = file;
    this.permissions = permissions;

    if (!this.path || !_.isString(this.path)) {
      return;
    }

    this.fd = null;
    this.writtenChunks = 0;
    this.ended = false;
    this.aborted = false;

    if (fdCache[this.path] && !fdCache[this.path].ended && !fdCache[this.path].aborted) {
      this.fd = fdCache[this.path].fd;
      this.writtenChunks = fdCache[this.path].writtenChunks;
    } else {
      fs.ensureFile(this.path, efError => {
        bound(() => {
          if (efError) {
            throw new Meteor.Error(500, '[FilesCollection] [writeStream] [ensureFile] [Error:]', efError);
          } else {
            fs.open(this.path, 'r+', this.permissions, (oError, fd) => {
              bound(() => {
                if (oError) {
                  throw new Meteor.Error(500, '[FilesCollection] [writeStream] [ensureFile] [open] [Error:]', oError);
                } else {
                  this.fd = fd;
                  fdCache[this.path] = this;
                }
              });
            });
          }
        });
      });
    }
  } /*
     * @memberOf writeStream
     * @name write
     * @param {Number} num - Chunk position in a stream
     * @param {Buffer} chunk - Buffer (chunk binary data)
     * @param {Function} callback - Callback
     * @summary Write chunk in given order
     * @returns {Boolean} - True if chunk is sent to stream, false if chunk is set into queue
     */

  write(num, chunk, callback) {
    if (!this.aborted && !this.ended) {
      if (this.fd) {
        fs.write(this.fd, chunk, 0, chunk.length, (num - 1) * this.file.chunkSize, (error, written, buffer) => {
          bound(() => {
            callback && callback(error, written, buffer);

            if (error) {
              console.warn('[FilesCollection] [writeStream] [write] [Error:]', error);
              this.abort();
            } else {
              ++this.writtenChunks;
            }
          });
        });
      } else {
        Meteor.setTimeout(() => {
          this.write(num, chunk, callback);
        }, 25);
      }
    }

    return false;
  } /*
     * @memberOf writeStream
     * @name end
     * @param {Function} callback - Callback
     * @summary Finishes writing to writableStream, only after all chunks in queue is written
     * @returns {Boolean} - True if stream is fulfilled, false if queue is in progress
     */

  end(callback) {
    if (!this.aborted && !this.ended) {
      if (this.writtenChunks === this.maxLength) {
        fs.close(this.fd, () => {
          bound(() => {
            delete fdCache[this.path];
            this.ended = true;
            callback && callback(void 0, true);
          });
        });
        return true;
      }

      fs.stat(this.path, (error, stat) => {
        bound(() => {
          if (!error && stat) {
            this.writtenChunks = Math.ceil(stat.size / this.file.chunkSize);
          }

          return Meteor.setTimeout(() => {
            this.end(callback);
          }, 25);
        });
      });
    } else {
      callback && callback(void 0, this.ended);
    }

    return false;
  } /*
     * @memberOf writeStream
     * @name abort
     * @param {Function} callback - Callback
     * @summary Aborts writing to writableStream, removes created file
     * @returns {Boolean} - True
     */

  abort(callback) {
    this.aborted = true;
    delete fdCache[this.path];
    fs.unlink(this.path, callback || NOOP);
    return true;
  } /*
     * @memberOf writeStream
     * @name stop
     * @summary Stop writing to writableStream
     * @returns {Boolean} - True
     */

  stop() {
    this.aborted = true;
    delete fdCache[this.path];
    return true;
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"fs-extra":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// ../../.1.9.1.nuopug.vi8zk++os+web.browser+web.cordova/npm/node_modules/fs-extra/package.json                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "fs-extra";
exports.version = "4.0.2";
exports.main = "./lib/index.js";

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

}}},"eventemitter3":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// ../../.1.9.1.nuopug.vi8zk++os+web.browser+web.cordova/npm/node_modules/eventemitter3/package.json                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "eventemitter3";
exports.version = "2.0.3";
exports.main = "index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/eventemitter3/index.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
'use strict';

var has = Object.prototype.hasOwnProperty
  , prefix = '~';

/**
 * Constructor to create a storage for our `EE` objects.
 * An `Events` instance is a plain object whose properties are event names.
 *
 * @constructor
 * @api private
 */
function Events() {}

//
// We try to not inherit from `Object.prototype`. In some engines creating an
// instance in this way is faster than calling `Object.create(null)` directly.
// If `Object.create(null)` is not supported we prefix the event names with a
// character to make sure that the built-in object properties are not
// overridden or used as an attack vector.
//
if (Object.create) {
  Events.prototype = Object.create(null);

  //
  // This hack is needed because the `__proto__` property is still inherited in
  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
  //
  if (!new Events().__proto__) prefix = false;
}

/**
 * Representation of a single event listener.
 *
 * @param {Function} fn The listener function.
 * @param {Mixed} context The context to invoke the listener with.
 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
 * @constructor
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal `EventEmitter` interface that is molded against the Node.js
 * `EventEmitter` interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() {
  this._events = new Events();
  this._eventsCount = 0;
}

/**
 * Return an array listing the events for which the emitter has registered
 * listeners.
 *
 * @returns {Array}
 * @api public
 */
EventEmitter.prototype.eventNames = function eventNames() {
  var names = []
    , events
    , name;

  if (this._eventsCount === 0) return names;

  for (name in (events = this._events)) {
    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
  }

  if (Object.getOwnPropertySymbols) {
    return names.concat(Object.getOwnPropertySymbols(events));
  }

  return names;
};

/**
 * Return the listeners registered for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Boolean} exists Only check if there are listeners.
 * @returns {Array|Boolean}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event, exists) {
  var evt = prefix ? prefix + event : event
    , available = this._events[evt];

  if (exists) return !!available;
  if (!available) return [];
  if (available.fn) return [available.fn];

  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
    ee[i] = available[i].fn;
  }

  return ee;
};

/**
 * Calls each of the listeners registered for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @returns {Boolean} `true` if the event had listeners, else `false`.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if (listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Add a listener for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Function} fn The listener function.
 * @param {Mixed} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this)
    , evt = prefix ? prefix + event : event;

  if (!this._events[evt]) this._events[evt] = listener, this._eventsCount++;
  else if (!this._events[evt].fn) this._events[evt].push(listener);
  else this._events[evt] = [this._events[evt], listener];

  return this;
};

/**
 * Add a one-time listener for a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Function} fn The listener function.
 * @param {Mixed} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true)
    , evt = prefix ? prefix + event : event;

  if (!this._events[evt]) this._events[evt] = listener, this._eventsCount++;
  else if (!this._events[evt].fn) this._events[evt].push(listener);
  else this._events[evt] = [this._events[evt], listener];

  return this;
};

/**
 * Remove the listeners of a given event.
 *
 * @param {String|Symbol} event The event name.
 * @param {Function} fn Only remove the listeners that match this function.
 * @param {Mixed} context Only remove the listeners that have this context.
 * @param {Boolean} once Only remove one-time listeners.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return this;
  if (!fn) {
    if (--this._eventsCount === 0) this._events = new Events();
    else delete this._events[evt];
    return this;
  }

  var listeners = this._events[evt];

  if (listeners.fn) {
    if (
         listeners.fn === fn
      && (!once || listeners.once)
      && (!context || listeners.context === context)
    ) {
      if (--this._eventsCount === 0) this._events = new Events();
      else delete this._events[evt];
    }
  } else {
    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
      if (
           listeners[i].fn !== fn
        || (once && !listeners[i].once)
        || (context && listeners[i].context !== context)
      ) {
        events.push(listeners[i]);
      }
    }

    //
    // Reset the array, or remove it completely if we have no more listeners.
    //
    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
    else if (--this._eventsCount === 0) this._events = new Events();
    else delete this._events[evt];
  }

  return this;
};

/**
 * Remove all listeners, or those of the specified event.
 *
 * @param {String|Symbol} [event] The event name.
 * @returns {EventEmitter} `this`.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  var evt;

  if (event) {
    evt = prefix ? prefix + event : event;
    if (this._events[evt]) {
      if (--this._eventsCount === 0) this._events = new Events();
      else delete this._events[evt];
    }
  } else {
    this._events = new Events();
    this._eventsCount = 0;
  }

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Allow `EventEmitter` to be imported as module namespace.
//
EventEmitter.EventEmitter = EventEmitter;

//
// Expose the module.
//
if ('undefined' !== typeof module) {
  module.exports = EventEmitter;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"request":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// ../../.1.9.1.nuopug.vi8zk++os+web.browser+web.cordova/npm/node_modules/request/package.json                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "request";
exports.version = "2.83.0";
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

var extend = require('extend')
var cookies = require('./lib/cookies')
var helpers = require('./lib/helpers')

var paramsHaveRequestBody = helpers.paramsHaveRequestBody

// organize params for patch, post, put, head, del
function initParams (uri, options, callback) {
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
request.options = verbFunc('options')
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

  var defaults = wrapRequestMethod(self, options, requester)

  var verbs = ['get', 'head', 'post', 'put', 'patch', 'del', 'delete']
  verbs.forEach(function (verb) {
    defaults[verb] = wrapRequestMethod(self[verb], options, requester, verb)
  })

  defaults.cookie = wrapRequestMethod(self.cookie, options, requester)
  defaults.jar = self.jar
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
  enumerable: true,
  get: function () {
    return request.Request.debug
  },
  set: function (debug) {
    request.Request.debug = debug
  }
})

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"file-type":{"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/file-type/index.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
'use strict';
const toBytes = s => Array.from(s).map(c => c.charCodeAt(0));
const xpiZipFilename = toBytes('META-INF/mozilla.rsa');
const oxmlContentTypes = toBytes('[Content_Types].xml');
const oxmlRels = toBytes('_rels/.rels');

module.exports = input => {
	const buf = (input instanceof Uint8Array) ? input : new Uint8Array(input);

	if (!(buf && buf.length > 1)) {
		return null;
	}

	const check = (header, opts) => {
		opts = Object.assign({
			offset: 0
		}, opts);

		for (let i = 0; i < header.length; i++) {
			// If a bitmask is set
			if (opts.mask) {
				// If header doesn't equal `buf` with bits masked off
				if (header[i] !== (opts.mask[i] & buf[i + opts.offset])) {
					return false;
				}
			} else if (header[i] !== buf[i + opts.offset]) {
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

	// Zip-based file formats
	// Need to be before the `zip` check
	if (check([0x50, 0x4B, 0x3, 0x4])) {
		if (
			check([0x6D, 0x69, 0x6D, 0x65, 0x74, 0x79, 0x70, 0x65, 0x61, 0x70, 0x70, 0x6C, 0x69, 0x63, 0x61, 0x74, 0x69, 0x6F, 0x6E, 0x2F, 0x65, 0x70, 0x75, 0x62, 0x2B, 0x7A, 0x69, 0x70], {offset: 30})
		) {
			return {
				ext: 'epub',
				mime: 'application/epub+zip'
			};
		}

		// Assumes signed `.xpi` from addons.mozilla.org
		if (check(xpiZipFilename, {offset: 30})) {
			return {
				ext: 'xpi',
				mime: 'application/x-xpinstall'
			};
		}

		// https://github.com/file/file/blob/master/magic/Magdir/msooxml
		if (check(oxmlContentTypes, {offset: 30}) || check(oxmlRels, {offset: 30})) {
			const sliced = buf.subarray(4, 4 + 2000);
			const nextZipHeaderIndex = arr => arr.findIndex((el, i, arr) => arr[i] === 0x50 && arr[i + 1] === 0x4B && arr[i + 2] === 0x3 && arr[i + 3] === 0x4);
			const header2Pos = nextZipHeaderIndex(sliced);

			if (header2Pos !== -1) {
				const slicedAgain = buf.subarray(header2Pos + 8, header2Pos + 8 + 1000);
				const header3Pos = nextZipHeaderIndex(slicedAgain);

				if (header3Pos !== -1) {
					const offset = 8 + header2Pos + header3Pos + 30;

					if (check(toBytes('word/'), {offset})) {
						return {
							ext: 'docx',
							mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
						};
					}

					if (check(toBytes('ppt/'), {offset})) {
						return {
							ext: 'pptx',
							mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
						};
					}

					if (check(toBytes('xl/'), {offset})) {
						return {
							ext: 'xlsx',
							mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
						};
					}
				}
			}
		}
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

	if (check([0x33, 0x67, 0x70, 0x35]) || // 3gp5
		(
			check([0x0, 0x0, 0x0]) && check([0x66, 0x74, 0x79, 0x70], {offset: 4}) &&
				(
					check([0x6D, 0x70, 0x34, 0x31], {offset: 8}) || // MP41
					check([0x6D, 0x70, 0x34, 0x32], {offset: 8}) || // MP42
					check([0x69, 0x73, 0x6F, 0x6D], {offset: 8}) || // ISOM
					check([0x69, 0x73, 0x6F, 0x32], {offset: 8}) || // ISO2
					check([0x6D, 0x6D, 0x70, 0x34], {offset: 8}) || // MMP4
					check([0x4D, 0x34, 0x56], {offset: 8}) || // M4V
					check([0x64, 0x61, 0x73, 0x68], {offset: 8}) // DASH
				)
		)) {
		return {
			ext: 'mp4',
			mime: 'video/mp4'
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

		if (idPos !== -1) {
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

	if (check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x33, 0x67, 0x70, 0x34])) {
		return {
			ext: '3gp',
			mime: 'video/3gpp'
		};
	}

	// Check for MP3 header at different starting offsets
	for (let start = 0; start < 2 && start < (buf.length - 16); start++) {
		if (
			check([0x49, 0x44, 0x33], {offset: start}) || // ID3 header
			check([0xFF, 0xE2], {offset: start, mask: [0xFF, 0xE2]}) // MPEG 1 or 2 Layer 3 header
		) {
			return {
				ext: 'mp3',
				mime: 'audio/mpeg'
			};
		}
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

	// If 'OggS' in first  bytes, then OGG container
	if (check([0x4F, 0x67, 0x67, 0x53])) {
		// This is a OGG container

		// If ' theora' in header.
		if (check([0x80, 0x74, 0x68, 0x65, 0x6F, 0x72, 0x61], {offset: 28})) {
			return {
				ext: 'ogv',
				mime: 'video/ogg'
			};
		}
		// If '\x01video' in header.
		if (check([0x01, 0x76, 0x69, 0x64, 0x65, 0x6F, 0x00], {offset: 28})) {
			return {
				ext: 'ogm',
				mime: 'video/ogg'
			};
		}
		// If ' FLAC' in header  https://xiph.org/flac/faq.html
		if (check([0x7F, 0x46, 0x4C, 0x41, 0x43], {offset: 28})) {
			return {
				ext: 'oga',
				mime: 'audio/ogg'
			};
		}

		// 'Speex  ' in header https://en.wikipedia.org/wiki/Speex
		if (check([0x53, 0x70, 0x65, 0x65, 0x78, 0x20, 0x20], {offset: 28})) {
			return {
				ext: 'spx',
				mime: 'audio/ogg'
			};
		}

		// If '\x01vorbis' in header
		if (check([0x01, 0x76, 0x6F, 0x72, 0x62, 0x69, 0x73], {offset: 28})) {
			return {
				ext: 'ogg',
				mime: 'audio/ogg'
			};
		}

		// Default OGG container https://www.iana.org/assignments/media-types/application/ogg
		return {
			ext: 'ogx',
			mime: 'application/ogg'
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

	if (check([0x00, 0x00, 0x00, 0x0C, 0x6A, 0x50, 0x20, 0x20, 0x0D, 0x0A, 0x87, 0x0A])) {
		// JPEG-2000 family

		if (check([0x6A, 0x70, 0x32, 0x20], {offset: 20})) {
			return {
				ext: 'jp2',
				mime: 'image/jp2'
			};
		}

		if (check([0x6A, 0x70, 0x78, 0x20], {offset: 20})) {
			return {
				ext: 'jpx',
				mime: 'image/jpx'
			};
		}

		if (check([0x6A, 0x70, 0x6D, 0x20], {offset: 20})) {
			return {
				ext: 'jpm',
				mime: 'image/jpm'
			};
		}

		if (check([0x6D, 0x6A, 0x70, 0x32], {offset: 20})) {
			return {
				ext: 'mj2',
				mime: 'image/mj2'
			};
		}
	}

	if (check([0x46, 0x4F, 0x52, 0x4D, 0x00])) {
		return {
			ext: 'aif',
			mime: 'audio/aiff'
		};
	}

	return null;
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("./node_modules/meteor/ostrio:files/server.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['ostrio:files'] = exports, {
  FilesCollection: FilesCollection
});

})();

//# sourceURL=meteor://💻app/packages/ostrio_files.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZpbGVzL3NlcnZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZpbGVzL2NvcmUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL29zdHJpbzpmaWxlcy9jdXJzb3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL29zdHJpbzpmaWxlcy9saWIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL29zdHJpbzpmaWxlcy93cml0ZS1zdHJlYW0uanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiRmlsZXNDb2xsZWN0aW9uIiwiXyIsIndhdGNoIiwicmVxdWlyZSIsInYiLCJNb25nbyIsIldlYkFwcCIsIk1ldGVvciIsIlJhbmRvbSIsIkNvb2tpZXMiLCJXcml0ZVN0cmVhbSIsImRlZmF1bHQiLCJjaGVjayIsIk1hdGNoIiwiRmlsZXNDb2xsZWN0aW9uQ29yZSIsImZpeEpTT05QYXJzZSIsImZpeEpTT05TdHJpbmdpZnkiLCJmcyIsIm5vZGVRcyIsInJlcXVlc3QiLCJmaWxlVHlwZSIsIm5vZGVQYXRoIiwiYm91bmQiLCJiaW5kRW52aXJvbm1lbnQiLCJjYWxsYmFjayIsIk5PT1AiLCJjb25zdHJ1Y3RvciIsImNvbmZpZyIsInN0b3JhZ2VQYXRoIiwiZGVidWciLCJzY2hlbWEiLCJwdWJsaWMiLCJzdHJpY3QiLCJjaHVua1NpemUiLCJwcm90ZWN0ZWQiLCJjb2xsZWN0aW9uIiwicGVybWlzc2lvbnMiLCJjYWNoZUNvbnRyb2wiLCJkb3dubG9hZFJvdXRlIiwib25BZnRlclVwbG9hZCIsIm9uQWZ0ZXJSZW1vdmUiLCJkaXNhYmxlVXBsb2FkIiwib25CZWZvcmVSZW1vdmUiLCJpbnRlZ3JpdHlDaGVjayIsImNvbGxlY3Rpb25OYW1lIiwib25CZWZvcmVVcGxvYWQiLCJuYW1pbmdGdW5jdGlvbiIsInJlc3BvbnNlSGVhZGVycyIsImRpc2FibGVEb3dubG9hZCIsImFsbG93Q2xpZW50Q29kZSIsImRvd25sb2FkQ2FsbGJhY2siLCJvbkluaXRpYXRlVXBsb2FkIiwiaW50ZXJjZXB0RG93bmxvYWQiLCJjb250aW51ZVVwbG9hZFRUTCIsInBhcmVudERpclBlcm1pc3Npb25zIiwic2VsZiIsImNvb2tpZSIsImlzQm9vbGVhbiIsIk1hdGgiLCJmbG9vciIsImlzU3RyaW5nIiwiQ29sbGVjdGlvbiIsIl9uYW1lIiwiZmlsZXNDb2xsZWN0aW9uIiwiU3RyaW5nIiwiRXJyb3IiLCJyZXBsYWNlIiwiaXNGdW5jdGlvbiIsImlzTnVtYmVyIiwicGFyc2VJbnQiLCJpc09iamVjdCIsIl9jdXJyZW50VXBsb2FkcyIsInJlc3BvbnNlQ29kZSIsImZpbGVSZWYiLCJ2ZXJzaW9uUmVmIiwiaGVhZGVycyIsIlByYWdtYSIsIlRyYWlsZXIiLCJzaXplIiwiQ29ubmVjdGlvbiIsInR5cGUiLCJzZXAiLCJzcCIsImFwcGx5IiwiYXJndW1lbnRzIiwibm9ybWFsaXplIiwiX2RlYnVnIiwibWtkaXJzIiwibW9kZSIsImVycm9yIiwiQm9vbGVhbiIsIk51bWJlciIsIkZ1bmN0aW9uIiwiT25lT2YiLCJPYmplY3QiLCJfcHJlQ29sbGVjdGlvbiIsIl9lbnN1cmVJbmRleCIsImNyZWF0ZWRBdCIsImV4cGlyZUFmdGVyU2Vjb25kcyIsImJhY2tncm91bmQiLCJfcHJlQ29sbGVjdGlvbkN1cnNvciIsImZpbmQiLCJmaWVsZHMiLCJfaWQiLCJpc0ZpbmlzaGVkIiwib2JzZXJ2ZSIsImNoYW5nZWQiLCJkb2MiLCJyZW1vdmUiLCJyZW1vdmVkIiwic3RvcCIsImVuZCIsImFib3J0IiwiX2NyZWF0ZVN0cmVhbSIsInBhdGgiLCJvcHRzIiwiZmlsZUxlbmd0aCIsIl9jb250aW51ZVVwbG9hZCIsImZpbGUiLCJhYm9ydGVkIiwiZW5kZWQiLCJjb250VXBsZCIsImZpbmRPbmUiLCJuYW1lIiwiaXNWaWRlbyIsImlzQXVkaW8iLCJpc0ltYWdlIiwiaXNUZXh0IiwiaXNKU09OIiwiaXNQREYiLCJleHRlbnNpb24iLCJvcHRpb25hbCIsIl9zdG9yYWdlUGF0aCIsIl9kb3dubG9hZFJvdXRlIiwiX2NvbGxlY3Rpb25OYW1lIiwibWV0YSIsImJsYWNrYm94IiwidXNlcklkIiwidXBkYXRlZEF0IiwiRGF0ZSIsInZlcnNpb25zIiwiX2NoZWNrQWNjZXNzIiwiaHR0cCIsInJlc3VsdCIsInVzZXIiLCJfZ2V0VXNlciIsInBhcmFtcyIsImNhbGwiLCJleHRlbmQiLCJyYyIsInRleHQiLCJyZXNwb25zZSIsImhlYWRlcnNTZW50Iiwid3JpdGVIZWFkIiwibGVuZ3RoIiwiZmluaXNoZWQiLCJfbWV0aG9kTmFtZXMiLCJfQWJvcnQiLCJfV3JpdGUiLCJfU3RhcnQiLCJfUmVtb3ZlIiwib24iLCJfaGFuZGxlVXBsb2FkIiwiX2ZpbmlzaFVwbG9hZCIsImNvbm5lY3RIYW5kbGVycyIsInVzZSIsImh0dHBSZXEiLCJodHRwUmVzcCIsIm5leHQiLCJfcGFyc2VkVXJsIiwiaW5kZXhPZiIsIm1ldGhvZCIsImhhbmRsZUVycm9yIiwiY29uc29sZSIsIndhcm4iLCJKU09OIiwic3RyaW5naWZ5IiwiYm9keSIsImRhdGEiLCJzZXJ2ZXIiLCJzZXNzaW9ucyIsImhhcyIsImZpbGVJZCIsImVvZiIsIkJ1ZmZlciIsImZyb20iLCJiaW5EYXRhIiwiYnVmZkVyciIsImNodW5rSWQiLCJfcHJlcGFyZVVwbG9hZCIsImVtaXQiLCJwYXJzZSIsImpzb25FcnIiLCJfX19zIiwiY2xvbmUiLCJtYXhMZW5ndGgiLCJpbnNlcnQiLCJvbWl0IiwicmV0dXJuTWV0YSIsInVwbG9hZFJvdXRlIiwiaHR0cFJlc3BFcnIiLCJ1cmkiLCJ1cmlzIiwic3Vic3RyaW5nIiwic3BsaXQiLCJxdWVyeSIsInZlcnNpb24iLCJkb3dubG9hZCIsIl9maWxlIiwiX21ldGhvZHMiLCJzZWxlY3RvciIsInVzZXJGdW5jcyIsInVzZXJzIiwiY3Vyc29yIiwiY291bnQiLCJGU05hbWUiLCJPcHRpb25hbCIsInVuYmxvY2siLCJ3cmFwQXN5bmMiLCJiaW5kIiwiaGFuZGxlVXBsb2FkRXJyIiwidW5saW5rIiwibWV0aG9kcyIsInRyYW5zcG9ydCIsImN0eCIsImZpbGVOYW1lIiwiX2dldEZpbGVOYW1lIiwiZXh0ZW5zaW9uV2l0aERvdCIsIl9nZXRFeHQiLCJleHQiLCJfZGF0YVRvU2NoZW1hIiwiaXNVcGxvYWRBbGxvd2VkIiwiY2IiLCJjaG1vZCIsIl9nZXRNaW1lVHlwZSIsIl91cGRhdGVGaWxlVHlwZXMiLCJ1cGRhdGUiLCIkc2V0Iiwid3JpdGUiLCJlIiwiZmlsZURhdGEiLCJtaW1lIiwiYnVmIiwiZmQiLCJvcGVuU3luYyIsImJyIiwicmVhZFN5bmMiLCJjbG9zZSIsInNsaWNlIiwibXRvayIsImdldCIsImJ1ZmZlciIsInByb2NlZWRBZnRlclVwbG9hZCIsImlkIiwic3RyZWFtIiwiY3JlYXRlV3JpdGVTdHJlYW0iLCJmbGFncyIsInN0cmVhbUVyciIsImluc2VydEVyciIsImxvYWQiLCJ1cmwiLCJwYXRoUGFydHMiLCJzdG9yZVJlc3VsdCIsInN0YXQiLCJzdGF0cyIsIm9yaWdpbmFsIiwicGlwZSIsImFkZEZpbGUiLCJzdGF0RXJyIiwiaXNGaWxlIiwidW5kZWZpbmVkIiwiZmlsZXMiLCJmb3JFYWNoIiwiZG9jcyIsImZldGNoIiwiZGVueSIsInJ1bGVzIiwiYWxsb3ciLCJkZW55Q2xpZW50IiwiYWxsb3dDbGllbnQiLCJlYWNoIiwidlJlZiIsIl80MDQiLCJvcmlnaW5hbFVybCIsInJlc3BvbnNlVHlwZSIsInNlcnZlIiwicmVhZGFibGVTdHJlYW0iLCJmb3JjZTIwMCIsInBhcnRpcmFsIiwicmVxUmFuZ2UiLCJkaXNwb3NpdGlvblR5cGUiLCJzdGFydCIsInRha2UiLCJkaXNwb3NpdGlvbk5hbWUiLCJlbmNvZGVVUkkiLCJkaXNwb3NpdGlvbkVuY29kaW5nIiwic2V0SGVhZGVyIiwicmFuZ2UiLCJhcnJheSIsImlzTmFOIiwicGxheSIsInN0cmVhbUVycm9ySGFuZGxlciIsInRvU3RyaW5nIiwia2V5IiwiY3JlYXRlUmVhZFN0cmVhbSIsIkV2ZW50RW1pdHRlciIsImZvcm1hdEZsZVVSTCIsIkZpbGVzQ3Vyc29yIiwiRmlsZUN1cnNvciIsImluZm8iLCJsb2ciLCJwb3AiLCJ0b0xvd2VyQ2FzZSIsInRlc3QiLCJkcyIsIm9wdGlvbnMiLCJsaW5rIiwiX2ZpbGVSZWYiLCJfY29sbGVjdGlvbiIsImFzc2lnbiIsInByb3BlcnR5Iiwid2l0aCIsIl9zZWxlY3RvciIsIl9jdXJyZW50IiwiaGFzTmV4dCIsImhhc1ByZXZpb3VzIiwicHJldmlvdXMiLCJmaXJzdCIsImxhc3QiLCJjb250ZXh0IiwibWFwIiwiY3VycmVudCIsImNhbGxiYWNrcyIsIm9ic2VydmVDaGFuZ2VzIiwib2JqIiwiaXNBcnJheSIsImkiLCJpc0RhdGUiLCJfcm9vdCIsIl9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18iLCJST09UX1VSTCIsImZkQ2FjaGUiLCJ3cml0dGVuQ2h1bmtzIiwiZW5zdXJlRmlsZSIsImVmRXJyb3IiLCJvcGVuIiwib0Vycm9yIiwibnVtIiwiY2h1bmsiLCJ3cml0dGVuIiwic2V0VGltZW91dCIsImNlaWwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsT0FBT0MsTUFBUCxDQUFjO0FBQUNDLG1CQUFnQixNQUFJQTtBQUFyQixDQUFkOztBQUFxRCxJQUFJQyxDQUFKOztBQUFNSCxPQUFPSSxLQUFQLENBQWFDLFFBQVEsbUJBQVIsQ0FBYixFQUEwQztBQUFDRixJQUFFRyxDQUFGLEVBQUk7QUFBQ0gsUUFBRUcsQ0FBRjtBQUFJOztBQUFWLENBQTFDLEVBQXNELENBQXREO0FBQXlELElBQUlDLEtBQUo7QUFBVVAsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLGNBQVIsQ0FBYixFQUFxQztBQUFDRSxRQUFNRCxDQUFOLEVBQVE7QUFBQ0MsWUFBTUQsQ0FBTjtBQUFROztBQUFsQixDQUFyQyxFQUF5RCxDQUF6RDtBQUE0RCxJQUFJRSxNQUFKO0FBQVdSLE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSxlQUFSLENBQWIsRUFBc0M7QUFB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T0FBRzRNLE1BQUgsQ0FBVSxLQUFLM0csSUFBZixFQUFzQjFGLFlBQVlDLElBQWxDO0FBQ0EsV0FBTyxJQUFQO0FBQ0QsR0F6SDhCLENBMkgvQjs7Ozs7OztBQU1BcUYsU0FBTztBQUNMLFNBQUtTLE9BQUwsR0FBZSxJQUFmO0FBQ0EsV0FBTzhOLFFBQVEsS0FBS25PLElBQWIsQ0FBUDtBQUNBLFdBQU8sSUFBUDtBQUNEOztBQXJJOEIsQyIsImZpbGUiOiIvcGFja2FnZXMvb3N0cmlvX2ZpbGVzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgXyB9ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJvbSAnbWV0ZW9yL3VuZGVyc2NvcmUnO1xuaW1wb3J0IHsgTW9uZ28gfSAgICAgICAgICAgICAgICAgICAgICAgICAgZnJvbSAnbWV0ZW9yL21vbmdvJztcbmltcG9ydCB7IFdlYkFwcCB9ICAgICAgICAgICAgICAgICAgICAgICAgIGZyb20gJ21ldGVvci93ZWJhcHAnO1xuaW1wb3J0IHsgTWV0ZW9yIH0gICAgICAgICAgICAgICAgICAgICAgICAgZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBSYW5kb20gfSAgICAgICAgICAgICAgICAgICAgICAgICBmcm9tICdtZXRlb3IvcmFuZG9tJztcbmltcG9ydCB7IENvb2tpZXMgfSAgICAgICAgICAgICAgICAgICAgICAgIGZyb20gJ21ldGVvci9vc3RyaW86Y29va2llcyc7XG5pbXBvcnQgV3JpdGVTdHJlYW0gICAgICAgICAgICAgICAgICAgICAgICBmcm9tICcuL3dyaXRlLXN0cmVhbS5qcyc7XG5pbXBvcnQgeyBjaGVjaywgTWF0Y2ggfSAgICAgICAgICAgICAgICAgICBmcm9tICdtZXRlb3IvY2hlY2snO1xuaW1wb3J0IEZpbGVzQ29sbGVjdGlvbkNvcmUgICAgICAgICAgICAgICAgZnJvbSAnLi9jb3JlLmpzJztcbmltcG9ydCB7IGZpeEpTT05QYXJzZSwgZml4SlNPTlN0cmluZ2lmeSB9IGZyb20gJy4vbGliLmpzJztcblxuaW1wb3J0IGZzICAgICAgIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBub2RlUXMgICBmcm9tICdxdWVyeXN0cmluZyc7XG5pbXBvcnQgcmVxdWVzdCAgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgZmlsZVR5cGUgZnJvbSAnZmlsZS10eXBlJztcbmltcG9ydCBub2RlUGF0aCBmcm9tICdwYXRoJztcblxuLypcbiAqIEBjb25zdCB7T2JqZWN0fSBib3VuZCAgLSBNZXRlb3IuYmluZEVudmlyb25tZW50IChGaWJlciB3cmFwcGVyKVxuICogQGNvbnN0IHtGdW5jdGlvbn0gTk9PUCAtIE5vIE9wZXJhdGlvbiBmdW5jdGlvbiwgcGxhY2Vob2xkZXIgZm9yIHJlcXVpcmVkIGNhbGxiYWNrc1xuICovXG5jb25zdCBib3VuZCA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoY2FsbGJhY2sgPT4gY2FsbGJhY2soKSk7XG5jb25zdCBOT09QICA9ICgpID0+IHsgIH07XG5cbi8qXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBjbGFzcyBGaWxlc0NvbGxlY3Rpb25cbiAqIEBwYXJhbSBjb25maWcgICAgICAgICAgIHtPYmplY3R9ICAgLSBbQm90aF0gICBDb25maWd1cmF0aW9uIG9iamVjdCB3aXRoIG5leHQgcHJvcGVydGllczpcbiAqIEBwYXJhbSBjb25maWcuZGVidWcgICAgIHtCb29sZWFufSAgLSBbQm90aF0gICBUdXJuIG9uL29mIGRlYnVnZ2luZyBhbmQgZXh0cmEgbG9nZ2luZ1xuICogQHBhcmFtIGNvbmZpZy5zY2hlbWEgICAge09iamVjdH0gICAtIFtCb3RoXSAgIENvbGxlY3Rpb24gU2NoZW1hXG4gKiBAcGFyYW0gY29uZmlnLnB1YmxpYyAgICB7Qm9vbGVhbn0gIC0gW0JvdGhdICAgU3RvcmUgZmlsZXMgaW4gZm9sZGVyIGFjY2Vzc2libGUgZm9yIHByb3h5IHNlcnZlcnMsIGZvciBsaW1pdHMsIGFuZCBtb3JlIC0gcmVhZCBkb2NzXG4gKiBAcGFyYW0gY29uZmlnLnN0cmljdCAgICB7Qm9vbGVhbn0gIC0gW1NlcnZlcl0gU3RyaWN0IG1vZGUgZm9yIHBhcnRpYWwgY29udGVudCwgaWYgaXMgYHRydWVgIHNlcnZlciB3aWxsIHJldHVybiBgNDE2YCByZXNwb25zZSBjb2RlLCB3aGVuIGByYW5nZWAgaXMgbm90IHNwZWNpZmllZCwgb3RoZXJ3aXNlIHNlcnZlciByZXR1cm4gYDIwNmBcbiAqIEBwYXJhbSBjb25maWcucHJvdGVjdGVkIHtGdW5jdGlvbn0gLSBbU2VydmVyXSBJZiBgdHJ1ZWAgLSBmaWxlcyB3aWxsIGJlIHNlcnZlZCBvbmx5IHRvIGF1dGhvcml6ZWQgdXNlcnMsIGlmIGBmdW5jdGlvbigpYCAtIHlvdSdyZSBhYmxlIHRvIGNoZWNrIHZpc2l0b3IncyBwZXJtaXNzaW9ucyBpbiB5b3VyIG93biB3YXkgZnVuY3Rpb24ncyBjb250ZXh0IGhhczpcbiAqICAtIGByZXF1ZXN0YFxuICogIC0gYHJlc3BvbnNlYFxuICogIC0gYHVzZXIoKWBcbiAqICAtIGB1c2VySWRgXG4gKiBAcGFyYW0gY29uZmlnLmNodW5rU2l6ZSAgICAgIHtOdW1iZXJ9ICAtIFtCb3RoXSBVcGxvYWQgY2h1bmsgc2l6ZSwgZGVmYXVsdDogNTI0Mjg4IGJ5dGVzICgwLDUgTWIpXG4gKiBAcGFyYW0gY29uZmlnLnBlcm1pc3Npb25zICAgIHtOdW1iZXJ9ICAtIFtTZXJ2ZXJdIFBlcm1pc3Npb25zIHdoaWNoIHdpbGwgYmUgc2V0IHRvIHVwbG9hZGVkIGZpbGVzIChvY3RhbCksIGxpa2U6IGA1MTFgIG9yIGAwbzc1NWAuIERlZmF1bHQ6IDA2NDRcbiAqIEBwYXJhbSBjb25maWcucGFyZW50RGlyUGVybWlzc2lvbnMge051bWJlcn0gIC0gW1NlcnZlcl0gUGVybWlzc2lvbnMgd2hpY2ggd2lsbCBiZSBzZXQgdG8gcGFyZW50IGRpcmVjdG9yeSBvZiB1cGxvYWRlZCBmaWxlcyAob2N0YWwpLCBsaWtlOiBgNjExYCBvciBgMG83NzdgLiBEZWZhdWx0OiAwNzU1XG4gKiBAcGFyYW0gY29uZmlnLnN0b3JhZ2VQYXRoICAgIHtTdHJpbmd8RnVuY3Rpb259ICAtIFtTZXJ2ZXJdIFN0b3JhZ2UgcGF0aCBvbiBmaWxlIHN5c3RlbVxuICogQHBhcmFtIGNvbmZpZy5jYWNoZUNvbnRyb2wgICB7U3RyaW5nfSAgLSBbU2VydmVyXSBEZWZhdWx0IGBDYWNoZS1Db250cm9sYCBoZWFkZXJcbiAqIEBwYXJhbSBjb25maWcucmVzcG9uc2VIZWFkZXJzIHtPYmplY3R8RnVuY3Rpb259IC0gW1NlcnZlcl0gQ3VzdG9tIHJlc3BvbnNlIGhlYWRlcnMsIGlmIGZ1bmN0aW9uIGlzIHBhc3NlZCwgbXVzdCByZXR1cm4gT2JqZWN0XG4gKiBAcGFyYW0gY29uZmlnLnRocm90dGxlICAgICAgIHtOdW1iZXJ9ICAtIFtTZXJ2ZXJdIERFUFJFQ0FURUQgYnBzIHRocm90dGxlIHRocmVzaG9sZFxuICogQHBhcmFtIGNvbmZpZy5kb3dubG9hZFJvdXRlICB7U3RyaW5nfSAgLSBbQm90aF0gICBTZXJ2ZXIgUm91dGUgdXNlZCB0byByZXRyaWV2ZSBmaWxlc1xuICogQHBhcmFtIGNvbmZpZy5jb2xsZWN0aW9uICAgICB7TW9uZ28uQ29sbGVjdGlvbn0gLSBbQm90aF0gTW9uZ28gQ29sbGVjdGlvbiBJbnN0YW5jZVxuICogQHBhcmFtIGNvbmZpZy5jb2xsZWN0aW9uTmFtZSB7U3RyaW5nfSAgLSBbQm90aF0gICBDb2xsZWN0aW9uIG5hbWVcbiAqIEBwYXJhbSBjb25maWcubmFtaW5nRnVuY3Rpb24ge0Z1bmN0aW9ufS0gW0JvdGhdICAgRnVuY3Rpb24gd2hpY2ggcmV0dXJucyBgU3RyaW5nYFxuICogQHBhcmFtIGNvbmZpZy5pbnRlZ3JpdHlDaGVjayB7Qm9vbGVhbn0gLSBbU2VydmVyXSBDaGVjayBmaWxlJ3MgaW50ZWdyaXR5IGJlZm9yZSBzZXJ2aW5nIHRvIHVzZXJzXG4gKiBAcGFyYW0gY29uZmlnLm9uQWZ0ZXJVcGxvYWQgIHtGdW5jdGlvbn0tIFtTZXJ2ZXJdIENhbGxlZCByaWdodCBhZnRlciBmaWxlIGlzIHJlYWR5IG9uIEZTLiBVc2UgdG8gdHJhbnNmZXIgZmlsZSBzb21ld2hlcmUgZWxzZSwgb3IgZG8gb3RoZXIgdGhpbmcgd2l0aCBmaWxlIGRpcmVjdGx5XG4gKiBAcGFyYW0gY29uZmlnLm9uQWZ0ZXJSZW1vdmUgIHtGdW5jdGlvbn0gLSBbU2VydmVyXSBDYWxsZWQgcmlnaHQgYWZ0ZXIgZmlsZSBpcyByZW1vdmVkLiBSZW1vdmVkIG9iamVjdHMgaXMgcGFzc2VkIHRvIGNhbGxiYWNrXG4gKiBAcGFyYW0gY29uZmlnLmNvbnRpbnVlVXBsb2FkVFRMIHtOdW1iZXJ9IC0gW1NlcnZlcl0gVGltZSBpbiBzZWNvbmRzLCBkdXJpbmcgdXBsb2FkIG1heSBiZSBjb250aW51ZWQsIGRlZmF1bHQgMyBob3VycyAoMTA4MDAgc2Vjb25kcylcbiAqIEBwYXJhbSBjb25maWcub25CZWZvcmVVcGxvYWQge0Z1bmN0aW9ufS0gW0JvdGhdICAgRnVuY3Rpb24gd2hpY2ggZXhlY3V0ZXMgb24gc2VydmVyIGFmdGVyIHJlY2VpdmluZyBlYWNoIGNodW5rIGFuZCBvbiBjbGllbnQgcmlnaHQgYmVmb3JlIGJlZ2lubmluZyB1cGxvYWQuIEZ1bmN0aW9uIGNvbnRleHQgaXMgYEZpbGVgIC0gc28geW91IGFyZSBhYmxlIHRvIGNoZWNrIGZvciBleHRlbnNpb24sIG1pbWUtdHlwZSwgc2l6ZSBhbmQgZXRjLjpcbiAqICAtIHJldHVybiBgdHJ1ZWAgdG8gY29udGludWVcbiAqICAtIHJldHVybiBgZmFsc2VgIG9yIGBTdHJpbmdgIHRvIGFib3J0IHVwbG9hZFxuICogQHBhcmFtIGNvbmZpZy5vbkluaXRpYXRlVXBsb2FkIHtGdW5jdGlvbn0gLSBbU2VydmVyXSBGdW5jdGlvbiB3aGljaCBleGVjdXRlcyBvbiBzZXJ2ZXIgcmlnaHQgYmVmb3JlIHVwbG9hZCBpcyBiZWdpbiBhbmQgcmlnaHQgYWZ0ZXIgYG9uQmVmb3JlVXBsb2FkYCBob29rLiBUaGlzIGhvb2sgaXMgZnVsbHkgYXN5bmNocm9ub3VzLlxuICogQHBhcmFtIGNvbmZpZy5vbkJlZm9yZVJlbW92ZSB7RnVuY3Rpb259IC0gW1NlcnZlcl0gRXhlY3V0ZXMgYmVmb3JlIHJlbW92aW5nIGZpbGUgb24gc2VydmVyLCBzbyB5b3UgY2FuIGNoZWNrIHBlcm1pc3Npb25zLiBSZXR1cm4gYHRydWVgIHRvIGFsbG93IGFjdGlvbiBhbmQgYGZhbHNlYCB0byBkZW55LlxuICogQHBhcmFtIGNvbmZpZy5hbGxvd0NsaWVudENvZGUgIHtCb29sZWFufSAgLSBbQm90aF0gICBBbGxvdyB0byBydW4gYHJlbW92ZWAgZnJvbSBjbGllbnRcbiAqIEBwYXJhbSBjb25maWcuZG93bmxvYWRDYWxsYmFjayB7RnVuY3Rpb259IC0gW1NlcnZlcl0gQ2FsbGJhY2sgdHJpZ2dlcmVkIGVhY2ggdGltZSBmaWxlIGlzIHJlcXVlc3RlZCwgcmV0dXJuIHRydXRoeSB2YWx1ZSB0byBjb250aW51ZSBkb3dubG9hZCwgb3IgZmFsc3kgdG8gYWJvcnRcbiAqIEBwYXJhbSBjb25maWcuaW50ZXJjZXB0RG93bmxvYWQge0Z1bmN0aW9ufSAtIFtTZXJ2ZXJdIEludGVyY2VwdCBkb3dubG9hZCByZXF1ZXN0LCBzbyB5b3UgY2FuIHNlcnZlIGZpbGUgZnJvbSB0aGlyZC1wYXJ0eSByZXNvdXJjZSwgYXJndW1lbnRzIHtodHRwOiB7cmVxdWVzdDogey4uLn0sIHJlc3BvbnNlOiB7Li4ufX0sIGZpbGVSZWY6IHsuLi59fVxuICogQHBhcmFtIGNvbmZpZy5kaXNhYmxlVXBsb2FkIHtCb29sZWFufSAtIERpc2FibGUgZmlsZSB1cGxvYWQsIHVzZWZ1bCBmb3Igc2VydmVyIG9ubHkgc29sdXRpb25zXG4gKiBAcGFyYW0gY29uZmlnLmRpc2FibGVEb3dubG9hZCB7Qm9vbGVhbn0gLSBEaXNhYmxlIGZpbGUgZG93bmxvYWQgKHNlcnZpbmcpLCB1c2VmdWwgZm9yIGZpbGUgbWFuYWdlbWVudCBvbmx5IHNvbHV0aW9uc1xuICogQHN1bW1hcnkgQ3JlYXRlIG5ldyBpbnN0YW5jZSBvZiBGaWxlc0NvbGxlY3Rpb25cbiAqL1xuZXhwb3J0IGNsYXNzIEZpbGVzQ29sbGVjdGlvbiBleHRlbmRzIEZpbGVzQ29sbGVjdGlvbkNvcmUge1xuICBjb25zdHJ1Y3Rvcihjb25maWcpIHtcbiAgICBzdXBlcigpO1xuICAgIGxldCBzdG9yYWdlUGF0aDtcbiAgICBpZiAoY29uZmlnKSB7XG4gICAgICAoe1xuICAgICAgICBzdG9yYWdlUGF0aCxcbiAgICAgICAgZGVidWc6IHRoaXMuZGVidWcsXG4gICAgICAgIHNjaGVtYTogdGhpcy5zY2hlbWEsXG4gICAgICAgIHB1YmxpYzogdGhpcy5wdWJsaWMsXG4gICAgICAgIHN0cmljdDogdGhpcy5zdHJpY3QsXG4gICAgICAgIGNodW5rU2l6ZTogdGhpcy5jaHVua1NpemUsXG4gICAgICAgIHByb3RlY3RlZDogdGhpcy5wcm90ZWN0ZWQsXG4gICAgICAgIGNvbGxlY3Rpb246IHRoaXMuY29sbGVjdGlvbixcbiAgICAgICAgcGVybWlzc2lvbnM6IHRoaXMucGVybWlzc2lvbnMsXG4gICAgICAgIGNhY2hlQ29udHJvbDogdGhpcy5jYWNoZUNvbnRyb2wsXG4gICAgICAgIGRvd25sb2FkUm91dGU6IHRoaXMuZG93bmxvYWRSb3V0ZSxcbiAgICAgICAgb25BZnRlclVwbG9hZDogdGhpcy5vbkFmdGVyVXBsb2FkLFxuICAgICAgICBvbkFmdGVyUmVtb3ZlOiB0aGlzLm9uQWZ0ZXJSZW1vdmUsXG4gICAgICAgIGRpc2FibGVVcGxvYWQ6IHRoaXMuZGlzYWJsZVVwbG9hZCxcbiAgICAgICAgb25CZWZvcmVSZW1vdmU6IHRoaXMub25CZWZvcmVSZW1vdmUsXG4gICAgICAgIGludGVncml0eUNoZWNrOiB0aGlzLmludGVncml0eUNoZWNrLFxuICAgICAgICBjb2xsZWN0aW9uTmFtZTogdGhpcy5jb2xsZWN0aW9uTmFtZSxcbiAgICAgICAgb25CZWZvcmVVcGxvYWQ6IHRoaXMub25CZWZvcmVVcGxvYWQsXG4gICAgICAgIG5hbWluZ0Z1bmN0aW9uOiB0aGlzLm5hbWluZ0Z1bmN0aW9uLFxuICAgICAgICByZXNwb25zZUhlYWRlcnM6IHRoaXMucmVzcG9uc2VIZWFkZXJzLFxuICAgICAgICBkaXNhYmxlRG93bmxvYWQ6IHRoaXMuZGlzYWJsZURvd25sb2FkLFxuICAgICAgICBhbGxvd0NsaWVudENvZGU6IHRoaXMuYWxsb3dDbGllbnRDb2RlLFxuICAgICAgICBkb3dubG9hZENhbGxiYWNrOiB0aGlzLmRvd25sb2FkQ2FsbGJhY2ssXG4gICAgICAgIG9uSW5pdGlhdGVVcGxvYWQ6IHRoaXMub25Jbml0aWF0ZVVwbG9hZCxcbiAgICAgICAgaW50ZXJjZXB0RG93bmxvYWQ6IHRoaXMuaW50ZXJjZXB0RG93bmxvYWQsXG4gICAgICAgIGNvbnRpbnVlVXBsb2FkVFRMOiB0aGlzLmNvbnRpbnVlVXBsb2FkVFRMLFxuICAgICAgICBwYXJlbnREaXJQZXJtaXNzaW9uczogdGhpcy5wYXJlbnREaXJQZXJtaXNzaW9uc1xuICAgICAgfSA9IGNvbmZpZyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VsZiAgID0gdGhpcztcbiAgICBjb25zdCBjb29raWUgPSBuZXcgQ29va2llcygpO1xuXG4gICAgaWYgKCFfLmlzQm9vbGVhbih0aGlzLmRlYnVnKSkge1xuICAgICAgdGhpcy5kZWJ1ZyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghXy5pc0Jvb2xlYW4odGhpcy5wdWJsaWMpKSB7XG4gICAgICB0aGlzLnB1YmxpYyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5wcm90ZWN0ZWQpIHtcbiAgICAgIHRoaXMucHJvdGVjdGVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmNodW5rU2l6ZSkge1xuICAgICAgdGhpcy5jaHVua1NpemUgPSAxMDI0ICogNTEyO1xuICAgIH1cblxuICAgIHRoaXMuY2h1bmtTaXplID0gTWF0aC5mbG9vcih0aGlzLmNodW5rU2l6ZSAvIDgpICogODtcblxuICAgIGlmICghXy5pc1N0cmluZyh0aGlzLmNvbGxlY3Rpb25OYW1lKSAmJiAhdGhpcy5jb2xsZWN0aW9uKSB7XG4gICAgICB0aGlzLmNvbGxlY3Rpb25OYW1lID0gJ01ldGVvclVwbG9hZEZpbGVzJztcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuY29sbGVjdGlvbikge1xuICAgICAgdGhpcy5jb2xsZWN0aW9uID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24odGhpcy5jb2xsZWN0aW9uTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29sbGVjdGlvbk5hbWUgPSB0aGlzLmNvbGxlY3Rpb24uX25hbWU7XG4gICAgfVxuXG4gICAgdGhpcy5jb2xsZWN0aW9uLmZpbGVzQ29sbGVjdGlvbiA9IHRoaXM7XG4gICAgY2hlY2sodGhpcy5jb2xsZWN0aW9uTmFtZSwgU3RyaW5nKTtcblxuICAgIGlmICh0aGlzLnB1YmxpYyAmJiAhdGhpcy5kb3dubG9hZFJvdXRlKSB7XG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDUwMCwgYFtGaWxlc0NvbGxlY3Rpb24uJHt0aGlzLmNvbGxlY3Rpb25OYW1lfV06IFxcXCJkb3dubG9hZFJvdXRlXFxcIiBtdXN0IGJlIHByZWNpc2VseSBwcm92aWRlZCBvbiBcXFwicHVibGljXFxcIiBjb2xsZWN0aW9ucyEgTm90ZTogXFxcImRvd25sb2FkUm91dGVcXFwiIG11c3QgYmUgZXF1YWwgb3IgYmUgaW5zaWRlIG9mIHlvdXIgd2ViL3Byb3h5LXNlcnZlciAocmVsYXRpdmUpIHJvb3QuYCk7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzU3RyaW5nKHRoaXMuZG93bmxvYWRSb3V0ZSkpIHtcbiAgICAgIHRoaXMuZG93bmxvYWRSb3V0ZSA9ICcvY2RuL3N0b3JhZ2UnO1xuICAgIH1cblxuICAgIHRoaXMuZG93bmxvYWRSb3V0ZSA9IHRoaXMuZG93bmxvYWRSb3V0ZS5yZXBsYWNlKC9cXC8kLywgJycpO1xuXG4gICAgaWYgKCFfLmlzRnVuY3Rpb24odGhpcy5uYW1pbmdGdW5jdGlvbikpIHtcbiAgICAgIHRoaXMubmFtaW5nRnVuY3Rpb24gPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIV8uaXNGdW5jdGlvbih0aGlzLm9uQmVmb3JlVXBsb2FkKSkge1xuICAgICAgdGhpcy5vbkJlZm9yZVVwbG9hZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghXy5pc0Jvb2xlYW4odGhpcy5hbGxvd0NsaWVudENvZGUpKSB7XG4gICAgICB0aGlzLmFsbG93Q2xpZW50Q29kZSA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzRnVuY3Rpb24odGhpcy5vbkluaXRpYXRlVXBsb2FkKSkge1xuICAgICAgdGhpcy5vbkluaXRpYXRlVXBsb2FkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzRnVuY3Rpb24odGhpcy5pbnRlcmNlcHREb3dubG9hZCkpIHtcbiAgICAgIHRoaXMuaW50ZXJjZXB0RG93bmxvYWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIV8uaXNCb29sZWFuKHRoaXMuc3RyaWN0KSkge1xuICAgICAgdGhpcy5zdHJpY3QgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICghXy5pc051bWJlcih0aGlzLnBlcm1pc3Npb25zKSkge1xuICAgICAgdGhpcy5wZXJtaXNzaW9ucyA9IHBhcnNlSW50KCc2NDQnLCA4KTtcbiAgICB9XG5cbiAgICBpZiAoIV8uaXNOdW1iZXIodGhpcy5wYXJlbnREaXJQZXJtaXNzaW9ucykpIHtcbiAgICAgIHRoaXMucGFyZW50RGlyUGVybWlzc2lvbnMgPSBwYXJzZUludCgnNzU1JywgOCk7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzU3RyaW5nKHRoaXMuY2FjaGVDb250cm9sKSkge1xuICAgICAgdGhpcy5jYWNoZUNvbnRyb2wgPSAncHVibGljLCBtYXgtYWdlPTMxNTM2MDAwLCBzLW1heGFnZT0zMTUzNjAwMCc7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzRnVuY3Rpb24odGhpcy5vbkFmdGVyVXBsb2FkKSkge1xuICAgICAgdGhpcy5vbkFmdGVyVXBsb2FkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzQm9vbGVhbih0aGlzLmRpc2FibGVVcGxvYWQpKSB7XG4gICAgICB0aGlzLmRpc2FibGVVcGxvYWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIV8uaXNGdW5jdGlvbih0aGlzLm9uQWZ0ZXJSZW1vdmUpKSB7XG4gICAgICB0aGlzLm9uQWZ0ZXJSZW1vdmUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIV8uaXNGdW5jdGlvbih0aGlzLm9uQmVmb3JlUmVtb3ZlKSkge1xuICAgICAgdGhpcy5vbkJlZm9yZVJlbW92ZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghXy5pc0Jvb2xlYW4odGhpcy5pbnRlZ3JpdHlDaGVjaykpIHtcbiAgICAgIHRoaXMuaW50ZWdyaXR5Q2hlY2sgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICghXy5pc0Jvb2xlYW4odGhpcy5kaXNhYmxlRG93bmxvYWQpKSB7XG4gICAgICB0aGlzLmRpc2FibGVEb3dubG9hZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghXy5pc09iamVjdCh0aGlzLl9jdXJyZW50VXBsb2FkcykpIHtcbiAgICAgIHRoaXMuX2N1cnJlbnRVcGxvYWRzID0ge307XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzRnVuY3Rpb24odGhpcy5kb3dubG9hZENhbGxiYWNrKSkge1xuICAgICAgdGhpcy5kb3dubG9hZENhbGxiYWNrID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzTnVtYmVyKHRoaXMuY29udGludWVVcGxvYWRUVEwpKSB7XG4gICAgICB0aGlzLmNvbnRpbnVlVXBsb2FkVFRMID0gMTA4MDA7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzRnVuY3Rpb24odGhpcy5yZXNwb25zZUhlYWRlcnMpKSB7XG4gICAgICB0aGlzLnJlc3BvbnNlSGVhZGVycyA9IChyZXNwb25zZUNvZGUsIGZpbGVSZWYsIHZlcnNpb25SZWYpID0+IHtcbiAgICAgICAgY29uc3QgaGVhZGVycyA9IHt9O1xuXG4gICAgICAgIHN3aXRjaCAocmVzcG9uc2VDb2RlKSB7XG4gICAgICAgIGNhc2UgJzIwNic6XG4gICAgICAgICAgaGVhZGVycy5QcmFnbWEgICAgICAgICAgICAgICA9ICdwcml2YXRlJztcbiAgICAgICAgICBoZWFkZXJzLlRyYWlsZXIgICAgICAgICAgICAgID0gJ2V4cGlyZXMnO1xuICAgICAgICAgIGhlYWRlcnNbJ1RyYW5zZmVyLUVuY29kaW5nJ10gPSAnY2h1bmtlZCc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJzQwMCc6XG4gICAgICAgICAgaGVhZGVyc1snQ2FjaGUtQ29udHJvbCddICAgICA9ICduby1jYWNoZSc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJzQxNic6XG4gICAgICAgICAgaGVhZGVyc1snQ29udGVudC1SYW5nZSddICAgICA9IGBieXRlcyAqLyR7dmVyc2lvblJlZi5zaXplfWA7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBoZWFkZXJzLkNvbm5lY3Rpb24gICAgICAgPSAna2VlcC1hbGl2ZSc7XG4gICAgICAgIGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddICA9IHZlcnNpb25SZWYudHlwZSB8fCAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJztcbiAgICAgICAgaGVhZGVyc1snQWNjZXB0LVJhbmdlcyddID0gJ2J5dGVzJztcbiAgICAgICAgcmV0dXJuIGhlYWRlcnM7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICh0aGlzLnB1YmxpYyAmJiAhc3RvcmFnZVBhdGgpIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNTAwLCBgW0ZpbGVzQ29sbGVjdGlvbi4ke3RoaXMuY29sbGVjdGlvbk5hbWV9XSBcXFwic3RvcmFnZVBhdGhcXFwiIG11c3QgYmUgc2V0IG9uIFxcXCJwdWJsaWNcXFwiIGNvbGxlY3Rpb25zISBOb3RlOiBcXFwic3RvcmFnZVBhdGhcXFwiIG11c3QgYmUgZXF1YWwgb24gYmUgaW5zaWRlIG9mIHlvdXIgd2ViL3Byb3h5LXNlcnZlciAoYWJzb2x1dGUpIHJvb3QuYCk7XG4gICAgfVxuXG4gICAgaWYgKCFzdG9yYWdlUGF0aCkge1xuICAgICAgc3RvcmFnZVBhdGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBgYXNzZXRzJHtub2RlUGF0aC5zZXB9YXBwJHtub2RlUGF0aC5zZXB9dXBsb2FkcyR7bm9kZVBhdGguc2VwfSR7c2VsZi5jb2xsZWN0aW9uTmFtZX1gO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoXy5pc1N0cmluZyhzdG9yYWdlUGF0aCkpIHtcbiAgICAgIHRoaXMuc3RvcmFnZVBhdGggPSAoKSA9PiBzdG9yYWdlUGF0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zdG9yYWdlUGF0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IHNwID0gc3RvcmFnZVBhdGguYXBwbHkoc2VsZiwgYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKCFfLmlzU3RyaW5nKHNwKSkge1xuICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAwLCBgW0ZpbGVzQ29sbGVjdGlvbi4ke3NlbGYuY29sbGVjdGlvbk5hbWV9XSBcXFwic3RvcmFnZVBhdGhcXFwiIGZ1bmN0aW9uIG11c3QgcmV0dXJuIGEgU3RyaW5nIWApO1xuICAgICAgICB9XG4gICAgICAgIHNwID0gc3AucmVwbGFjZSgvXFwvJC8sICcnKTtcbiAgICAgICAgcmV0dXJuIG5vZGVQYXRoLm5vcm1hbGl6ZShzcCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIHRoaXMuX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uLnN0b3JhZ2VQYXRoXSBTZXQgdG86JywgdGhpcy5zdG9yYWdlUGF0aCh7fSkpO1xuXG4gICAgZnMubWtkaXJzKHRoaXMuc3RvcmFnZVBhdGgoe30pLCB7IG1vZGU6IHRoaXMucGFyZW50RGlyUGVybWlzc2lvbnMgfSwgKGVycm9yKSA9PiB7XG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDEsIGBbRmlsZXNDb2xsZWN0aW9uLiR7c2VsZi5jb2xsZWN0aW9uTmFtZX1dIFBhdGggXFxcIiR7dGhpcy5zdG9yYWdlUGF0aCh7fSl9XFxcIiBpcyBub3Qgd3JpdGFibGUhYCwgZXJyb3IpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY2hlY2sodGhpcy5zdHJpY3QsIEJvb2xlYW4pO1xuICAgIGNoZWNrKHRoaXMucGVybWlzc2lvbnMsIE51bWJlcik7XG4gICAgY2hlY2sodGhpcy5zdG9yYWdlUGF0aCwgRnVuY3Rpb24pO1xuICAgIGNoZWNrKHRoaXMuY2FjaGVDb250cm9sLCBTdHJpbmcpO1xuICAgIGNoZWNrKHRoaXMub25BZnRlclJlbW92ZSwgTWF0Y2guT25lT2YoZmFsc2UsIEZ1bmN0aW9uKSk7XG4gICAgY2hlY2sodGhpcy5vbkFmdGVyVXBsb2FkLCBNYXRjaC5PbmVPZihmYWxzZSwgRnVuY3Rpb24pKTtcbiAgICBjaGVjayh0aGlzLmRpc2FibGVVcGxvYWQsIEJvb2xlYW4pO1xuICAgIGNoZWNrKHRoaXMuaW50ZWdyaXR5Q2hlY2ssIEJvb2xlYW4pO1xuICAgIGNoZWNrKHRoaXMub25CZWZvcmVSZW1vdmUsIE1hdGNoLk9uZU9mKGZhbHNlLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMuZGlzYWJsZURvd25sb2FkLCBCb29sZWFuKTtcbiAgICBjaGVjayh0aGlzLmRvd25sb2FkQ2FsbGJhY2ssIE1hdGNoLk9uZU9mKGZhbHNlLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMuaW50ZXJjZXB0RG93bmxvYWQsIE1hdGNoLk9uZU9mKGZhbHNlLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMuY29udGludWVVcGxvYWRUVEwsIE51bWJlcik7XG4gICAgY2hlY2sodGhpcy5yZXNwb25zZUhlYWRlcnMsIE1hdGNoLk9uZU9mKE9iamVjdCwgRnVuY3Rpb24pKTtcblxuICAgIGlmICghdGhpcy5kaXNhYmxlVXBsb2FkKSB7XG4gICAgICB0aGlzLl9wcmVDb2xsZWN0aW9uID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oYF9fcHJlXyR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gKTtcbiAgICAgIHRoaXMuX3ByZUNvbGxlY3Rpb24uX2Vuc3VyZUluZGV4KHtjcmVhdGVkQXQ6IDF9LCB7ZXhwaXJlQWZ0ZXJTZWNvbmRzOiB0aGlzLmNvbnRpbnVlVXBsb2FkVFRMLCBiYWNrZ3JvdW5kOiB0cnVlfSk7XG4gICAgICBjb25zdCBfcHJlQ29sbGVjdGlvbkN1cnNvciA9IHRoaXMuX3ByZUNvbGxlY3Rpb24uZmluZCh7fSwge1xuICAgICAgICBmaWVsZHM6IHtcbiAgICAgICAgICBfaWQ6IDEsXG4gICAgICAgICAgaXNGaW5pc2hlZDogMVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgX3ByZUNvbGxlY3Rpb25DdXJzb3Iub2JzZXJ2ZSh7XG4gICAgICAgIGNoYW5nZWQoZG9jKSB7XG4gICAgICAgICAgaWYgKGRvYy5pc0ZpbmlzaGVkKSB7XG4gICAgICAgICAgICBzZWxmLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW19wcmVDb2xsZWN0aW9uQ3Vyc29yLm9ic2VydmVdIFtjaGFuZ2VkXTogJHtkb2MuX2lkfWApO1xuICAgICAgICAgICAgc2VsZi5fcHJlQ29sbGVjdGlvbi5yZW1vdmUoe19pZDogZG9jLl9pZH0sIE5PT1ApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcmVtb3ZlZChkb2MpIHtcbiAgICAgICAgICAvLyBGcmVlIG1lbW9yeSBhZnRlciB1cGxvYWQgaXMgZG9uZVxuICAgICAgICAgIC8vIE9yIGlmIHVwbG9hZCBpcyB1bmZpbmlzaGVkXG4gICAgICAgICAgc2VsZi5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtfcHJlQ29sbGVjdGlvbkN1cnNvci5vYnNlcnZlXSBbcmVtb3ZlZF06ICR7ZG9jLl9pZH1gKTtcbiAgICAgICAgICBpZiAoXy5pc09iamVjdChzZWxmLl9jdXJyZW50VXBsb2Fkc1tkb2MuX2lkXSkpIHtcbiAgICAgICAgICAgIHNlbGYuX2N1cnJlbnRVcGxvYWRzW2RvYy5faWRdLnN0b3AoKTtcbiAgICAgICAgICAgIHNlbGYuX2N1cnJlbnRVcGxvYWRzW2RvYy5faWRdLmVuZCgpO1xuXG4gICAgICAgICAgICBpZiAoIWRvYy5pc0ZpbmlzaGVkKSB7XG4gICAgICAgICAgICAgIHNlbGYuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbX3ByZUNvbGxlY3Rpb25DdXJzb3Iub2JzZXJ2ZV0gW3JlbW92ZVVuZmluaXNoZWRVcGxvYWRdOiAke2RvYy5faWR9YCk7XG4gICAgICAgICAgICAgIHNlbGYuX2N1cnJlbnRVcGxvYWRzW2RvYy5faWRdLmFib3J0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRlbGV0ZSBzZWxmLl9jdXJyZW50VXBsb2Fkc1tkb2MuX2lkXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLl9jcmVhdGVTdHJlYW0gPSAoX2lkLCBwYXRoLCBvcHRzKSA9PiB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRVcGxvYWRzW19pZF0gPSBuZXcgV3JpdGVTdHJlYW0ocGF0aCwgb3B0cy5maWxlTGVuZ3RoLCBvcHRzLCB0aGlzLnBlcm1pc3Npb25zKTtcbiAgICAgIH07XG5cbiAgICAgIC8vIFRoaXMgbGl0dGxlIGZ1bmN0aW9uIGFsbG93cyB0byBjb250aW51ZSB1cGxvYWRcbiAgICAgIC8vIGV2ZW4gYWZ0ZXIgc2VydmVyIGlzIHJlc3RhcnRlZCAoKm5vdCBvbiBkZXYtc3RhZ2UqKVxuICAgICAgdGhpcy5fY29udGludWVVcGxvYWQgPSAoX2lkKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLl9jdXJyZW50VXBsb2Fkc1tfaWRdICYmIHRoaXMuX2N1cnJlbnRVcGxvYWRzW19pZF0uZmlsZSkge1xuICAgICAgICAgIGlmICghdGhpcy5fY3VycmVudFVwbG9hZHNbX2lkXS5hYm9ydGVkICYmICF0aGlzLl9jdXJyZW50VXBsb2Fkc1tfaWRdLmVuZGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY3VycmVudFVwbG9hZHNbX2lkXS5maWxlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLl9jcmVhdGVTdHJlYW0oX2lkLCB0aGlzLl9jdXJyZW50VXBsb2Fkc1tfaWRdLmZpbGUuZmlsZS5wYXRoLCB0aGlzLl9jdXJyZW50VXBsb2Fkc1tfaWRdLmZpbGUpO1xuICAgICAgICAgIHJldHVybiB0aGlzLl9jdXJyZW50VXBsb2Fkc1tfaWRdLmZpbGU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY29udFVwbGQgPSB0aGlzLl9wcmVDb2xsZWN0aW9uLmZpbmRPbmUoe19pZH0pO1xuICAgICAgICBpZiAoY29udFVwbGQpIHtcbiAgICAgICAgICB0aGlzLl9jcmVhdGVTdHJlYW0oX2lkLCBjb250VXBsZC5maWxlLnBhdGgsIGNvbnRVcGxkKTtcbiAgICAgICAgICByZXR1cm4gdGhpcy5fY3VycmVudFVwbG9hZHNbX2lkXS5maWxlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLnNjaGVtYSkge1xuICAgICAgdGhpcy5zY2hlbWEgPSB7XG4gICAgICAgIHNpemU6IHtcbiAgICAgICAgICB0eXBlOiBOdW1iZXJcbiAgICAgICAgfSxcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgIHR5cGU6IFN0cmluZ1xuICAgICAgICB9LFxuICAgICAgICB0eXBlOiB7XG4gICAgICAgICAgdHlwZTogU3RyaW5nXG4gICAgICAgIH0sXG4gICAgICAgIHBhdGg6IHtcbiAgICAgICAgICB0eXBlOiBTdHJpbmdcbiAgICAgICAgfSxcbiAgICAgICAgaXNWaWRlbzoge1xuICAgICAgICAgIHR5cGU6IEJvb2xlYW5cbiAgICAgICAgfSxcbiAgICAgICAgaXNBdWRpbzoge1xuICAgICAgICAgIHR5cGU6IEJvb2xlYW5cbiAgICAgICAgfSxcbiAgICAgICAgaXNJbWFnZToge1xuICAgICAgICAgIHR5cGU6IEJvb2xlYW5cbiAgICAgICAgfSxcbiAgICAgICAgaXNUZXh0OiB7XG4gICAgICAgICAgdHlwZTogQm9vbGVhblxuICAgICAgICB9LFxuICAgICAgICBpc0pTT046IHtcbiAgICAgICAgICB0eXBlOiBCb29sZWFuXG4gICAgICAgIH0sXG4gICAgICAgIGlzUERGOiB7XG4gICAgICAgICAgdHlwZTogQm9vbGVhblxuICAgICAgICB9LFxuICAgICAgICBleHRlbnNpb246IHtcbiAgICAgICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICAgICAgb3B0aW9uYWw6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgX3N0b3JhZ2VQYXRoOiB7XG4gICAgICAgICAgdHlwZTogU3RyaW5nXG4gICAgICAgIH0sXG4gICAgICAgIF9kb3dubG9hZFJvdXRlOiB7XG4gICAgICAgICAgdHlwZTogU3RyaW5nXG4gICAgICAgIH0sXG4gICAgICAgIF9jb2xsZWN0aW9uTmFtZToge1xuICAgICAgICAgIHR5cGU6IFN0cmluZ1xuICAgICAgICB9LFxuICAgICAgICBwdWJsaWM6IHtcbiAgICAgICAgICB0eXBlOiBCb29sZWFuLFxuICAgICAgICAgIG9wdGlvbmFsOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIG1ldGE6IHtcbiAgICAgICAgICB0eXBlOiBPYmplY3QsXG4gICAgICAgICAgYmxhY2tib3g6IHRydWUsXG4gICAgICAgICAgb3B0aW9uYWw6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgdXNlcklkOiB7XG4gICAgICAgICAgdHlwZTogU3RyaW5nLFxuICAgICAgICAgIG9wdGlvbmFsOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIHVwZGF0ZWRBdDoge1xuICAgICAgICAgIHR5cGU6IERhdGUsXG4gICAgICAgICAgb3B0aW9uYWw6IHRydWVcbiAgICAgICAgfSxcbiAgICAgICAgdmVyc2lvbnM6IHtcbiAgICAgICAgICB0eXBlOiBPYmplY3QsXG4gICAgICAgICAgYmxhY2tib3g6IHRydWVcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG5cbiAgICBjaGVjayh0aGlzLmRlYnVnLCBCb29sZWFuKTtcbiAgICBjaGVjayh0aGlzLnNjaGVtYSwgT2JqZWN0KTtcbiAgICBjaGVjayh0aGlzLnB1YmxpYywgQm9vbGVhbik7XG4gICAgY2hlY2sodGhpcy5wcm90ZWN0ZWQsIE1hdGNoLk9uZU9mKEJvb2xlYW4sIEZ1bmN0aW9uKSk7XG4gICAgY2hlY2sodGhpcy5jaHVua1NpemUsIE51bWJlcik7XG4gICAgY2hlY2sodGhpcy5kb3dubG9hZFJvdXRlLCBTdHJpbmcpO1xuICAgIGNoZWNrKHRoaXMubmFtaW5nRnVuY3Rpb24sIE1hdGNoLk9uZU9mKGZhbHNlLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMub25CZWZvcmVVcGxvYWQsIE1hdGNoLk9uZU9mKGZhbHNlLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMub25Jbml0aWF0ZVVwbG9hZCwgTWF0Y2guT25lT2YoZmFsc2UsIEZ1bmN0aW9uKSk7XG4gICAgY2hlY2sodGhpcy5hbGxvd0NsaWVudENvZGUsIEJvb2xlYW4pO1xuXG4gICAgaWYgKHRoaXMucHVibGljICYmIHRoaXMucHJvdGVjdGVkKSB7XG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDUwMCwgYFtGaWxlc0NvbGxlY3Rpb24uJHt0aGlzLmNvbGxlY3Rpb25OYW1lfV06IEZpbGVzIGNhbiBub3QgYmUgcHVibGljIGFuZCBwcm90ZWN0ZWQgYXQgdGhlIHNhbWUgdGltZSFgKTtcbiAgICB9XG5cbiAgICB0aGlzLl9jaGVja0FjY2VzcyA9IChodHRwKSA9PiB7XG4gICAgICBpZiAodGhpcy5wcm90ZWN0ZWQpIHtcbiAgICAgICAgbGV0IHJlc3VsdDtcbiAgICAgICAgY29uc3Qge3VzZXIsIHVzZXJJZH0gPSB0aGlzLl9nZXRVc2VyKGh0dHApO1xuXG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24odGhpcy5wcm90ZWN0ZWQpKSB7XG4gICAgICAgICAgbGV0IGZpbGVSZWY7XG4gICAgICAgICAgaWYgKF8uaXNPYmplY3QoaHR0cC5wYXJhbXMpICYmICBodHRwLnBhcmFtcy5faWQpIHtcbiAgICAgICAgICAgIGZpbGVSZWYgPSB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShodHRwLnBhcmFtcy5faWQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlc3VsdCA9IGh0dHAgPyB0aGlzLnByb3RlY3RlZC5jYWxsKF8uZXh0ZW5kKGh0dHAsIHt1c2VyLCB1c2VySWR9KSwgKGZpbGVSZWYgfHwgbnVsbCkpIDogdGhpcy5wcm90ZWN0ZWQuY2FsbCh7dXNlciwgdXNlcklkfSwgKGZpbGVSZWYgfHwgbnVsbCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdCA9ICEhdXNlcklkO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKChodHRwICYmIChyZXN1bHQgPT09IHRydWUpKSB8fCAhaHR0cCkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmMgPSBfLmlzTnVtYmVyKHJlc3VsdCkgPyByZXN1bHQgOiA0MDE7XG4gICAgICAgIHRoaXMuX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uLl9jaGVja0FjY2Vzc10gV0FSTjogQWNjZXNzIGRlbmllZCEnKTtcbiAgICAgICAgaWYgKGh0dHApIHtcbiAgICAgICAgICBjb25zdCB0ZXh0ID0gJ0FjY2VzcyBkZW5pZWQhJztcbiAgICAgICAgICBpZiAoIWh0dHAucmVzcG9uc2UuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgICAgIGh0dHAucmVzcG9uc2Uud3JpdGVIZWFkKHJjLCB7XG4gICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAndGV4dC9wbGFpbicsXG4gICAgICAgICAgICAgICdDb250ZW50LUxlbmd0aCc6IHRleHQubGVuZ3RoXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIWh0dHAucmVzcG9uc2UuZmluaXNoZWQpIHtcbiAgICAgICAgICAgIGh0dHAucmVzcG9uc2UuZW5kKHRleHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICB0aGlzLl9tZXRob2ROYW1lcyA9IHtcbiAgICAgIF9BYm9ydDogYF9GaWxlc0NvbGxlY3Rpb25BYm9ydF8ke3RoaXMuY29sbGVjdGlvbk5hbWV9YCxcbiAgICAgIF9Xcml0ZTogYF9GaWxlc0NvbGxlY3Rpb25Xcml0ZV8ke3RoaXMuY29sbGVjdGlvbk5hbWV9YCxcbiAgICAgIF9TdGFydDogYF9GaWxlc0NvbGxlY3Rpb25TdGFydF8ke3RoaXMuY29sbGVjdGlvbk5hbWV9YCxcbiAgICAgIF9SZW1vdmU6IGBfRmlsZXNDb2xsZWN0aW9uUmVtb3ZlXyR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gXG4gICAgfTtcblxuICAgIHRoaXMub24oJ19oYW5kbGVVcGxvYWQnLCB0aGlzLl9oYW5kbGVVcGxvYWQpO1xuICAgIHRoaXMub24oJ19maW5pc2hVcGxvYWQnLCB0aGlzLl9maW5pc2hVcGxvYWQpO1xuXG4gICAgaWYgKCF0aGlzLmRpc2FibGVVcGxvYWQgJiYgIXRoaXMuZGlzYWJsZURvd25sb2FkKSB7XG4gICAgICBXZWJBcHAuY29ubmVjdEhhbmRsZXJzLnVzZSgoaHR0cFJlcSwgaHR0cFJlc3AsIG5leHQpID0+IHtcbiAgICAgICAgaWYgKCF0aGlzLmRpc2FibGVVcGxvYWQgJiYgISF+aHR0cFJlcS5fcGFyc2VkVXJsLnBhdGguaW5kZXhPZihgJHt0aGlzLmRvd25sb2FkUm91dGV9LyR7dGhpcy5jb2xsZWN0aW9uTmFtZX0vX191cGxvYWRgKSkge1xuICAgICAgICAgIGlmIChodHRwUmVxLm1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgICAgICAgICBjb25zdCBoYW5kbGVFcnJvciA9IChlcnJvcikgPT4ge1xuICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tGaWxlc0NvbGxlY3Rpb25dIFtVcGxvYWRdIFtIVFRQXSBFeGNlcHRpb246JywgZXJyb3IpO1xuICAgICAgICAgICAgICBpZiAoIWh0dHBSZXNwLmhlYWRlcnNTZW50KSB7XG4gICAgICAgICAgICAgICAgaHR0cFJlc3Aud3JpdGVIZWFkKDUwMCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5maW5pc2hlZCkge1xuICAgICAgICAgICAgICAgIGh0dHBSZXNwLmVuZChKU09OLnN0cmluZ2lmeSh7ZXJyb3J9KSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGxldCBib2R5ID0gJyc7XG4gICAgICAgICAgICBodHRwUmVxLm9uKCdkYXRhJywgKGRhdGEpID0+IGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAgICAgYm9keSArPSBkYXRhO1xuICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICBodHRwUmVxLm9uKCdlbmQnLCAoKSA9PiBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbGV0IG9wdHM7XG4gICAgICAgICAgICAgICAgbGV0IHJlc3VsdDtcbiAgICAgICAgICAgICAgICBsZXQgdXNlcjtcblxuICAgICAgICAgICAgICAgIGlmIChodHRwUmVxLmhlYWRlcnNbJ3gtbXRvayddICYmIF8uaXNPYmplY3QoTWV0ZW9yLnNlcnZlci5zZXNzaW9ucykgJiYgXy5oYXMoTWV0ZW9yLnNlcnZlci5zZXNzaW9uc1todHRwUmVxLmhlYWRlcnNbJ3gtbXRvayddXSwgJ3VzZXJJZCcpKSB7XG4gICAgICAgICAgICAgICAgICB1c2VyID0ge1xuICAgICAgICAgICAgICAgICAgICB1c2VySWQ6IE1ldGVvci5zZXJ2ZXIuc2Vzc2lvbnNbaHR0cFJlcS5oZWFkZXJzWyd4LW10b2snXV0udXNlcklkXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICB1c2VyID0gdGhpcy5fZ2V0VXNlcih7cmVxdWVzdDogaHR0cFJlcSwgcmVzcG9uc2U6IGh0dHBSZXNwfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGh0dHBSZXEuaGVhZGVyc1sneC1zdGFydCddICE9PSAnMScpIHtcbiAgICAgICAgICAgICAgICAgIG9wdHMgPSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVJZDogaHR0cFJlcS5oZWFkZXJzWyd4LWZpbGVpZCddXG4gICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICBpZiAoaHR0cFJlcS5oZWFkZXJzWyd4LWVvZiddID09PSAnMScpIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0cy5lb2YgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBCdWZmZXIuZnJvbSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRzLmJpbkRhdGEgPSBCdWZmZXIuZnJvbShib2R5LCAnYmFzZTY0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoYnVmZkVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0cy5iaW5EYXRhID0gbmV3IEJ1ZmZlcihib2R5LCAnYmFzZTY0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIG9wdHMuYmluRGF0YSA9IG5ldyBCdWZmZXIoYm9keSwgJ2Jhc2U2NCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG9wdHMuY2h1bmtJZCA9IHBhcnNlSW50KGh0dHBSZXEuaGVhZGVyc1sneC1jaHVua2lkJ10pO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBjb25zdCBfY29udGludWVVcGxvYWQgPSB0aGlzLl9jb250aW51ZVVwbG9hZChvcHRzLmZpbGVJZCk7XG4gICAgICAgICAgICAgICAgICBpZiAoIV9jb250aW51ZVVwbG9hZCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwOCwgJ0NhblxcJ3QgY29udGludWUgdXBsb2FkLCBzZXNzaW9uIGV4cGlyZWQuIFN0YXJ0IHVwbG9hZCBhZ2Fpbi4nKTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgKHtyZXN1bHQsIG9wdHN9ICA9IHRoaXMuX3ByZXBhcmVVcGxvYWQoXy5leHRlbmQob3B0cywgX2NvbnRpbnVlVXBsb2FkKSwgdXNlci51c2VySWQsICdIVFRQJykpO1xuXG4gICAgICAgICAgICAgICAgICBpZiAob3B0cy5lb2YpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlVXBsb2FkKHJlc3VsdCwgb3B0cywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIGlmICghaHR0cFJlc3AuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0dHBSZXNwLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgIGlmIChfLmlzT2JqZWN0KHJlc3VsdC5maWxlKSAmJiByZXN1bHQuZmlsZS5tZXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuZmlsZS5tZXRhID0gZml4SlNPTlN0cmluZ2lmeShyZXN1bHQuZmlsZS5tZXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoIWh0dHBSZXNwLmZpbmlzaGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodHRwUmVzcC5lbmQoSlNPTi5zdHJpbmdpZnkocmVzdWx0KSk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ19oYW5kbGVVcGxvYWQnLCByZXN1bHQsIG9wdHMsIE5PT1ApO1xuXG4gICAgICAgICAgICAgICAgICBpZiAoIWh0dHBSZXNwLmhlYWRlcnNTZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGh0dHBSZXNwLndyaXRlSGVhZCgyMDQpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5maW5pc2hlZCkge1xuICAgICAgICAgICAgICAgICAgICBodHRwUmVzcC5lbmQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgb3B0cyA9IEpTT04ucGFyc2UoYm9keSk7XG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChqc29uRXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0NhblxcJ3QgcGFyc2UgaW5jb21pbmcgSlNPTiBmcm9tIENsaWVudCBvbiBbLmluc2VydCgpIHwgdXBsb2FkXSwgc29tZXRoaW5nIHdlbnQgd3JvbmchJywganNvbkVycik7XG4gICAgICAgICAgICAgICAgICAgIG9wdHMgPSB7ZmlsZToge319O1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBvcHRzLl9fX3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtGaWxlIFN0YXJ0IEhUVFBdICR7b3B0cy5maWxlLm5hbWV9IC0gJHtvcHRzLmZpbGVJZH1gKTtcbiAgICAgICAgICAgICAgICAgIGlmIChfLmlzT2JqZWN0KG9wdHMuZmlsZSkgJiYgb3B0cy5maWxlLm1ldGEpIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0cy5maWxlLm1ldGEgPSBmaXhKU09OUGFyc2Uob3B0cy5maWxlLm1ldGEpO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAoe3Jlc3VsdH0gPSB0aGlzLl9wcmVwYXJlVXBsb2FkKF8uY2xvbmUob3B0cyksIHVzZXIudXNlcklkLCAnSFRUUCBTdGFydCBNZXRob2QnKSk7XG5cbiAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShyZXN1bHQuX2lkKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMCwgJ0NhblxcJ3Qgc3RhcnQgdXBsb2FkLCBkYXRhIHN1YnN0aXR1dGlvbiBkZXRlY3RlZCEnKTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgb3B0cy5faWQgICAgICAgPSBvcHRzLmZpbGVJZDtcbiAgICAgICAgICAgICAgICAgIG9wdHMuY3JlYXRlZEF0ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgIG9wdHMubWF4TGVuZ3RoID0gb3B0cy5maWxlTGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgdGhpcy5fcHJlQ29sbGVjdGlvbi5pbnNlcnQoXy5vbWl0KG9wdHMsICdfX19zJykpO1xuICAgICAgICAgICAgICAgICAgdGhpcy5fY3JlYXRlU3RyZWFtKHJlc3VsdC5faWQsIHJlc3VsdC5wYXRoLCBfLm9taXQob3B0cywgJ19fX3MnKSk7XG5cbiAgICAgICAgICAgICAgICAgIGlmIChvcHRzLnJldHVybk1ldGEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5oZWFkZXJzU2VudCkge1xuICAgICAgICAgICAgICAgICAgICAgIGh0dHBSZXNwLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICghaHR0cFJlc3AuZmluaXNoZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBodHRwUmVzcC5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgICAgdXBsb2FkUm91dGU6IGAke3RoaXMuZG93bmxvYWRSb3V0ZX0vJHt0aGlzLmNvbGxlY3Rpb25OYW1lfS9fX3VwbG9hZGAsXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlOiByZXN1bHRcbiAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghaHR0cFJlc3AuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBodHRwUmVzcC53cml0ZUhlYWQoMjA0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoIWh0dHBSZXNwLmZpbmlzaGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgaHR0cFJlc3AuZW5kKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGh0dHBSZXNwRXJyKSB7XG4gICAgICAgICAgICAgICAgaGFuZGxlRXJyb3IoaHR0cFJlc3BFcnIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLmRpc2FibGVEb3dubG9hZCkge1xuICAgICAgICAgIGxldCBodHRwO1xuICAgICAgICAgIGxldCBwYXJhbXM7XG4gICAgICAgICAgbGV0IHVyaTtcbiAgICAgICAgICBsZXQgdXJpcztcblxuICAgICAgICAgIGlmICghdGhpcy5wdWJsaWMpIHtcbiAgICAgICAgICAgIGlmICghIX5odHRwUmVxLl9wYXJzZWRVcmwucGF0aC5pbmRleE9mKGAke3RoaXMuZG93bmxvYWRSb3V0ZX0vJHt0aGlzLmNvbGxlY3Rpb25OYW1lfWApKSB7XG4gICAgICAgICAgICAgIHVyaSA9IGh0dHBSZXEuX3BhcnNlZFVybC5wYXRoLnJlcGxhY2UoYCR7dGhpcy5kb3dubG9hZFJvdXRlfS8ke3RoaXMuY29sbGVjdGlvbk5hbWV9YCwgJycpO1xuICAgICAgICAgICAgICBpZiAodXJpLmluZGV4T2YoJy8nKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHVyaSA9IHVyaS5zdWJzdHJpbmcoMSk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICB1cmlzID0gdXJpLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICAgIGlmICh1cmlzLmxlbmd0aCA9PT0gMykge1xuICAgICAgICAgICAgICAgIHBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgICAgIF9pZDogdXJpc1swXSxcbiAgICAgICAgICAgICAgICAgIHF1ZXJ5OiBodHRwUmVxLl9wYXJzZWRVcmwucXVlcnkgPyBub2RlUXMucGFyc2UoaHR0cFJlcS5fcGFyc2VkVXJsLnF1ZXJ5KSA6IHt9LFxuICAgICAgICAgICAgICAgICAgbmFtZTogdXJpc1syXS5zcGxpdCgnPycpWzBdLFxuICAgICAgICAgICAgICAgICAgdmVyc2lvbjogdXJpc1sxXVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBodHRwID0ge3JlcXVlc3Q6IGh0dHBSZXEsIHJlc3BvbnNlOiBodHRwUmVzcCwgcGFyYW1zfTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fY2hlY2tBY2Nlc3MoaHR0cCkpIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMuZG93bmxvYWQoaHR0cCwgdXJpc1sxXSwgdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUodXJpc1swXSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCEhfmh0dHBSZXEuX3BhcnNlZFVybC5wYXRoLmluZGV4T2YoYCR7dGhpcy5kb3dubG9hZFJvdXRlfWApKSB7XG4gICAgICAgICAgICAgIHVyaSA9IGh0dHBSZXEuX3BhcnNlZFVybC5wYXRoLnJlcGxhY2UoYCR7dGhpcy5kb3dubG9hZFJvdXRlfWAsICcnKTtcbiAgICAgICAgICAgICAgaWYgKHVyaS5pbmRleE9mKCcvJykgPT09IDApIHtcbiAgICAgICAgICAgICAgICB1cmkgPSB1cmkuc3Vic3RyaW5nKDEpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgdXJpcyAgPSB1cmkuc3BsaXQoJy8nKTtcbiAgICAgICAgICAgICAgbGV0IF9maWxlID0gdXJpc1t1cmlzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICBpZiAoX2ZpbGUpIHtcbiAgICAgICAgICAgICAgICBsZXQgdmVyc2lvbjtcbiAgICAgICAgICAgICAgICBpZiAoISF+X2ZpbGUuaW5kZXhPZignLScpKSB7XG4gICAgICAgICAgICAgICAgICB2ZXJzaW9uID0gX2ZpbGUuc3BsaXQoJy0nKVswXTtcbiAgICAgICAgICAgICAgICAgIF9maWxlICAgPSBfZmlsZS5zcGxpdCgnLScpWzFdLnNwbGl0KCc/JylbMF07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHZlcnNpb24gPSAnb3JpZ2luYWwnO1xuICAgICAgICAgICAgICAgICAgX2ZpbGUgICA9IF9maWxlLnNwbGl0KCc/JylbMF07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcGFyYW1zID0ge1xuICAgICAgICAgICAgICAgICAgcXVlcnk6IGh0dHBSZXEuX3BhcnNlZFVybC5xdWVyeSA/IG5vZGVRcy5wYXJzZShodHRwUmVxLl9wYXJzZWRVcmwucXVlcnkpIDoge30sXG4gICAgICAgICAgICAgICAgICBmaWxlOiBfZmlsZSxcbiAgICAgICAgICAgICAgICAgIF9pZDogX2ZpbGUuc3BsaXQoJy4nKVswXSxcbiAgICAgICAgICAgICAgICAgIHZlcnNpb24sXG4gICAgICAgICAgICAgICAgICBuYW1lOiBfZmlsZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaHR0cCA9IHtyZXF1ZXN0OiBodHRwUmVxLCByZXNwb25zZTogaHR0cFJlc3AsIHBhcmFtc307XG4gICAgICAgICAgICAgICAgdGhpcy5kb3dubG9hZChodHRwLCB2ZXJzaW9uLCB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShwYXJhbXMuX2lkKSk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBuZXh0KCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuZGlzYWJsZVVwbG9hZCkge1xuICAgICAgY29uc3QgX21ldGhvZHMgPSB7fTtcblxuICAgICAgLy8gTWV0aG9kIHVzZWQgdG8gcmVtb3ZlIGZpbGVcbiAgICAgIC8vIGZyb20gQ2xpZW50IHNpZGVcbiAgICAgIF9tZXRob2RzW3RoaXMuX21ldGhvZE5hbWVzLl9SZW1vdmVdID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG4gICAgICAgIGNoZWNrKHNlbGVjdG9yLCBNYXRjaC5PbmVPZihTdHJpbmcsIE9iamVjdCkpO1xuICAgICAgICBzZWxmLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW1VubGluayBNZXRob2RdIFsucmVtb3ZlKCR7c2VsZWN0b3J9KV1gKTtcblxuICAgICAgICBpZiAoc2VsZi5hbGxvd0NsaWVudENvZGUpIHtcbiAgICAgICAgICBpZiAoc2VsZi5vbkJlZm9yZVJlbW92ZSAmJiBfLmlzRnVuY3Rpb24oc2VsZi5vbkJlZm9yZVJlbW92ZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IHVzZXJJZCA9IHRoaXMudXNlcklkO1xuICAgICAgICAgICAgY29uc3QgdXNlckZ1bmNzID0ge1xuICAgICAgICAgICAgICB1c2VySWQ6IHRoaXMudXNlcklkLFxuICAgICAgICAgICAgICB1c2VyKCkge1xuICAgICAgICAgICAgICAgIGlmIChNZXRlb3IudXNlcnMpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBNZXRlb3IudXNlcnMuZmluZE9uZSh1c2VySWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKCFzZWxmLm9uQmVmb3JlUmVtb3ZlLmNhbGwodXNlckZ1bmNzLCAoc2VsZi5maW5kKHNlbGVjdG9yKSB8fCBudWxsKSkpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsICdbRmlsZXNDb2xsZWN0aW9uXSBbcmVtb3ZlXSBOb3QgcGVybWl0dGVkIScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGN1cnNvciA9IHNlbGYuZmluZChzZWxlY3Rvcik7XG4gICAgICAgICAgaWYgKGN1cnNvci5jb3VudCgpID4gMCkge1xuICAgICAgICAgICAgc2VsZi5yZW1vdmUoc2VsZWN0b3IpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDA0LCAnQ3Vyc29yIGlzIGVtcHR5LCBubyBmaWxlcyBpcyByZW1vdmVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDEsICdbRmlsZXNDb2xsZWN0aW9uXSBbcmVtb3ZlXSBSdW4gY29kZSBmcm9tIGNsaWVudCBpcyBub3QgYWxsb3dlZCEnKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuXG4gICAgICAvLyBNZXRob2QgdXNlZCB0byByZWNlaXZlIFwiZmlyc3QgYnl0ZVwiIG9mIHVwbG9hZFxuICAgICAgLy8gYW5kIGFsbCBmaWxlJ3MgbWV0YS1kYXRhLCBzb1xuICAgICAgLy8gaXQgd29uJ3QgYmUgdHJhbnNmZXJyZWQgd2l0aCBldmVyeSBjaHVua1xuICAgICAgLy8gQmFzaWNhbGx5IGl0IHByZXBhcmVzIGV2ZXJ5dGhpbmdcbiAgICAgIC8vIFNvIHVzZXIgY2FuIHBhdXNlL2Rpc2Nvbm5lY3QgYW5kXG4gICAgICAvLyBjb250aW51ZSB1cGxvYWQgbGF0ZXIsIGR1cmluZyBgY29udGludWVVcGxvYWRUVExgXG4gICAgICBfbWV0aG9kc1t0aGlzLl9tZXRob2ROYW1lcy5fU3RhcnRdID0gZnVuY3Rpb24gKG9wdHMsIHJldHVybk1ldGEpIHtcbiAgICAgICAgY2hlY2sob3B0cywge1xuICAgICAgICAgIGZpbGU6IE9iamVjdCxcbiAgICAgICAgICBmaWxlSWQ6IFN0cmluZyxcbiAgICAgICAgICBGU05hbWU6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG4gICAgICAgICAgY2h1bmtTaXplOiBOdW1iZXIsXG4gICAgICAgICAgZmlsZUxlbmd0aDogTnVtYmVyXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNoZWNrKHJldHVybk1ldGEsIE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pKTtcblxuICAgICAgICBzZWxmLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGUgU3RhcnQgTWV0aG9kXSAke29wdHMuZmlsZS5uYW1lfSAtICR7b3B0cy5maWxlSWR9YCk7XG4gICAgICAgIG9wdHMuX19fcyA9IHRydWU7XG4gICAgICAgIGNvbnN0IHtyZXN1bHR9ID0gc2VsZi5fcHJlcGFyZVVwbG9hZChfLmNsb25lKG9wdHMpLCB0aGlzLnVzZXJJZCwgJ0REUCBTdGFydCBNZXRob2QnKTtcblxuICAgICAgICBpZiAoc2VsZi5jb2xsZWN0aW9uLmZpbmRPbmUocmVzdWx0Ll9pZCkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMCwgJ0NhblxcJ3Qgc3RhcnQgdXBsb2FkLCBkYXRhIHN1YnN0aXR1dGlvbiBkZXRlY3RlZCEnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9wdHMuX2lkICAgICAgID0gb3B0cy5maWxlSWQ7XG4gICAgICAgIG9wdHMuY3JlYXRlZEF0ID0gbmV3IERhdGUoKTtcbiAgICAgICAgb3B0cy5tYXhMZW5ndGggPSBvcHRzLmZpbGVMZW5ndGg7XG4gICAgICAgIHNlbGYuX3ByZUNvbGxlY3Rpb24uaW5zZXJ0KF8ub21pdChvcHRzLCAnX19fcycpKTtcbiAgICAgICAgc2VsZi5fY3JlYXRlU3RyZWFtKHJlc3VsdC5faWQsIHJlc3VsdC5wYXRoLCBfLm9taXQob3B0cywgJ19fX3MnKSk7XG5cbiAgICAgICAgaWYgKHJldHVybk1ldGEpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdXBsb2FkUm91dGU6IGAke3NlbGYuZG93bmxvYWRSb3V0ZX0vJHtzZWxmLmNvbGxlY3Rpb25OYW1lfS9fX3VwbG9hZGAsXG4gICAgICAgICAgICBmaWxlOiByZXN1bHRcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfTtcblxuXG4gICAgICAvLyBNZXRob2QgdXNlZCB0byB3cml0ZSBmaWxlIGNodW5rc1xuICAgICAgLy8gaXQgcmVjZWl2ZXMgdmVyeSBsaW1pdGVkIGFtb3VudCBvZiBtZXRhLWRhdGFcbiAgICAgIC8vIFRoaXMgbWV0aG9kIGFsc28gcmVzcG9uc2libGUgZm9yIEVPRlxuICAgICAgX21ldGhvZHNbdGhpcy5fbWV0aG9kTmFtZXMuX1dyaXRlXSA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gICAgICAgIGxldCByZXN1bHQ7XG4gICAgICAgIGNoZWNrKG9wdHMsIHtcbiAgICAgICAgICBlb2Y6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pLFxuICAgICAgICAgIGZpbGVJZDogU3RyaW5nLFxuICAgICAgICAgIGJpbkRhdGE6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG4gICAgICAgICAgY2h1bmtJZDogTWF0Y2guT3B0aW9uYWwoTnVtYmVyKVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAob3B0cy5iaW5EYXRhKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBCdWZmZXIuZnJvbSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgb3B0cy5iaW5EYXRhID0gQnVmZmVyLmZyb20ob3B0cy5iaW5EYXRhLCAnYmFzZTY0Jyk7XG4gICAgICAgICAgICB9IGNhdGNoIChidWZmRXJyKSB7XG4gICAgICAgICAgICAgIG9wdHMuYmluRGF0YSA9IG5ldyBCdWZmZXIob3B0cy5iaW5EYXRhLCAnYmFzZTY0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdHMuYmluRGF0YSA9IG5ldyBCdWZmZXIob3B0cy5iaW5EYXRhLCAnYmFzZTY0Jyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgX2NvbnRpbnVlVXBsb2FkID0gc2VsZi5fY29udGludWVVcGxvYWQob3B0cy5maWxlSWQpO1xuICAgICAgICBpZiAoIV9jb250aW51ZVVwbG9hZCkge1xuICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDA4LCAnQ2FuXFwndCBjb250aW51ZSB1cGxvYWQsIHNlc3Npb24gZXhwaXJlZC4gU3RhcnQgdXBsb2FkIGFnYWluLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgICh7cmVzdWx0LCBvcHRzfSA9IHNlbGYuX3ByZXBhcmVVcGxvYWQoXy5leHRlbmQob3B0cywgX2NvbnRpbnVlVXBsb2FkKSwgdGhpcy51c2VySWQsICdERFAnKSk7XG5cbiAgICAgICAgaWYgKG9wdHMuZW9mKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBNZXRlb3Iud3JhcEFzeW5jKHNlbGYuX2hhbmRsZVVwbG9hZC5iaW5kKHNlbGYsIHJlc3VsdCwgb3B0cykpKCk7XG4gICAgICAgICAgfSBjYXRjaCAoaGFuZGxlVXBsb2FkRXJyKSB7XG4gICAgICAgICAgICBzZWxmLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW1dyaXRlIE1ldGhvZF0gW0REUF0gRXhjZXB0aW9uOicsIGhhbmRsZVVwbG9hZEVycik7XG4gICAgICAgICAgICB0aHJvdyBoYW5kbGVVcGxvYWRFcnI7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNlbGYuZW1pdCgnX2hhbmRsZVVwbG9hZCcsIHJlc3VsdCwgb3B0cywgTk9PUCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9O1xuXG4gICAgICAvLyBNZXRob2QgdXNlZCB0byBBYm9ydCB1cGxvYWRcbiAgICAgIC8vIC0gRmVlaW5nIG1lbW9yeSBieSAuZW5kKClpbmcgd3JpdGFibGVTdHJlYW1zXG4gICAgICAvLyAtIFJlbW92aW5nIHRlbXBvcmFyeSByZWNvcmQgZnJvbSBAX3ByZUNvbGxlY3Rpb25cbiAgICAgIC8vIC0gUmVtb3ZpbmcgcmVjb3JkIGZyb20gQGNvbGxlY3Rpb25cbiAgICAgIC8vIC0gLnVubGluaygpaW5nIGNodW5rcyBmcm9tIEZTXG4gICAgICBfbWV0aG9kc1t0aGlzLl9tZXRob2ROYW1lcy5fQWJvcnRdID0gZnVuY3Rpb24gKF9pZCkge1xuICAgICAgICBjaGVjayhfaWQsIFN0cmluZyk7XG5cbiAgICAgICAgY29uc3QgX2NvbnRpbnVlVXBsb2FkID0gc2VsZi5fY29udGludWVVcGxvYWQoX2lkKTtcbiAgICAgICAgc2VsZi5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtBYm9ydCBNZXRob2RdOiAke19pZH0gLSAkeyhfLmlzT2JqZWN0KF9jb250aW51ZVVwbG9hZC5maWxlKSA/IF9jb250aW51ZVVwbG9hZC5maWxlLnBhdGggOiAnJyl9YCk7XG5cbiAgICAgICAgaWYgKHNlbGYuX2N1cnJlbnRVcGxvYWRzICYmIHNlbGYuX2N1cnJlbnRVcGxvYWRzW19pZF0pIHtcbiAgICAgICAgICBzZWxmLl9jdXJyZW50VXBsb2Fkc1tfaWRdLnN0b3AoKTtcbiAgICAgICAgICBzZWxmLl9jdXJyZW50VXBsb2Fkc1tfaWRdLmFib3J0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoX2NvbnRpbnVlVXBsb2FkKSB7XG4gICAgICAgICAgc2VsZi5fcHJlQ29sbGVjdGlvbi5yZW1vdmUoe19pZH0pO1xuICAgICAgICAgIHNlbGYucmVtb3ZlKHtfaWR9KTtcbiAgICAgICAgICBpZiAoXy5pc09iamVjdChfY29udGludWVVcGxvYWQuZmlsZSkgJiYgX2NvbnRpbnVlVXBsb2FkLmZpbGUucGF0aCkge1xuICAgICAgICAgICAgc2VsZi51bmxpbmsoe19pZCwgcGF0aDogX2NvbnRpbnVlVXBsb2FkLmZpbGUucGF0aH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH07XG5cbiAgICAgIE1ldGVvci5tZXRob2RzKF9tZXRob2RzKTtcbiAgICB9XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgX3ByZXBhcmVVcGxvYWRcbiAgICogQHN1bW1hcnkgSW50ZXJuYWwgbWV0aG9kLiBVc2VkIHRvIG9wdGltaXplIHJlY2VpdmVkIGRhdGEgYW5kIGNoZWNrIHVwbG9hZCBwZXJtaXNzaW9uXG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqL1xuICBfcHJlcGFyZVVwbG9hZChvcHRzID0ge30sIHVzZXJJZCwgdHJhbnNwb3J0KSB7XG4gICAgbGV0IGN0eDtcbiAgICBpZiAoIV8uaXNCb29sZWFuKG9wdHMuZW9mKSkge1xuICAgICAgb3B0cy5lb2YgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIW9wdHMuYmluRGF0YSkge1xuICAgICAgb3B0cy5iaW5EYXRhID0gJ0VPRic7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzTnVtYmVyKG9wdHMuY2h1bmtJZCkpIHtcbiAgICAgIG9wdHMuY2h1bmtJZCA9IC0xO1xuICAgIH1cblxuICAgIGlmICghXy5pc1N0cmluZyhvcHRzLkZTTmFtZSkpIHtcbiAgICAgIG9wdHMuRlNOYW1lID0gb3B0cy5maWxlSWQ7XG4gICAgfVxuXG4gICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtVcGxvYWRdIFske3RyYW5zcG9ydH1dIEdvdCAjJHtvcHRzLmNodW5rSWR9LyR7b3B0cy5maWxlTGVuZ3RofSBjaHVua3MsIGRzdDogJHtvcHRzLmZpbGUubmFtZSB8fCBvcHRzLmZpbGUuZmlsZU5hbWV9YCk7XG5cbiAgICBjb25zdCBmaWxlTmFtZSA9IHRoaXMuX2dldEZpbGVOYW1lKG9wdHMuZmlsZSk7XG4gICAgY29uc3Qge2V4dGVuc2lvbiwgZXh0ZW5zaW9uV2l0aERvdH0gPSB0aGlzLl9nZXRFeHQoZmlsZU5hbWUpO1xuXG4gICAgaWYgKCFfLmlzT2JqZWN0KG9wdHMuZmlsZS5tZXRhKSkge1xuICAgICAgb3B0cy5maWxlLm1ldGEgPSB7fTtcbiAgICB9XG5cbiAgICBsZXQgcmVzdWx0ICAgICAgID0gb3B0cy5maWxlO1xuICAgIHJlc3VsdC5uYW1lICAgICAgPSBmaWxlTmFtZTtcbiAgICByZXN1bHQubWV0YSAgICAgID0gb3B0cy5maWxlLm1ldGE7XG4gICAgcmVzdWx0LmV4dGVuc2lvbiA9IGV4dGVuc2lvbjtcbiAgICByZXN1bHQuZXh0ICAgICAgID0gZXh0ZW5zaW9uO1xuICAgIHJlc3VsdC5faWQgICAgICAgPSBvcHRzLmZpbGVJZDtcbiAgICByZXN1bHQudXNlcklkICAgID0gdXNlcklkIHx8IG51bGw7XG4gICAgb3B0cy5GU05hbWUgICAgICA9IG9wdHMuRlNOYW1lLnJlcGxhY2UoLyhbXmEtejAtOVxcLVxcX10rKS9naSwgJy0nKTtcbiAgICByZXN1bHQucGF0aCAgICAgID0gYCR7dGhpcy5zdG9yYWdlUGF0aChyZXN1bHQpfSR7bm9kZVBhdGguc2VwfSR7b3B0cy5GU05hbWV9JHtleHRlbnNpb25XaXRoRG90fWA7XG4gICAgcmVzdWx0ICAgICAgICAgICA9IF8uZXh0ZW5kKHJlc3VsdCwgdGhpcy5fZGF0YVRvU2NoZW1hKHJlc3VsdCkpO1xuXG4gICAgaWYgKHRoaXMub25CZWZvcmVVcGxvYWQgJiYgXy5pc0Z1bmN0aW9uKHRoaXMub25CZWZvcmVVcGxvYWQpKSB7XG4gICAgICBjdHggPSBfLmV4dGVuZCh7XG4gICAgICAgIGZpbGU6IG9wdHMuZmlsZVxuICAgICAgfSwge1xuICAgICAgICBjaHVua0lkOiBvcHRzLmNodW5rSWQsXG4gICAgICAgIHVzZXJJZDogcmVzdWx0LnVzZXJJZCxcbiAgICAgICAgdXNlcigpIHtcbiAgICAgICAgICBpZiAoTWV0ZW9yLnVzZXJzICYmIHJlc3VsdC51c2VySWQpIHtcbiAgICAgICAgICAgIHJldHVybiBNZXRlb3IudXNlcnMuZmluZE9uZShyZXN1bHQudXNlcklkKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0sXG4gICAgICAgIGVvZjogb3B0cy5lb2ZcbiAgICAgIH0pO1xuICAgICAgY29uc3QgaXNVcGxvYWRBbGxvd2VkID0gdGhpcy5vbkJlZm9yZVVwbG9hZC5jYWxsKGN0eCwgcmVzdWx0KTtcblxuICAgICAgaWYgKGlzVXBsb2FkQWxsb3dlZCAhPT0gdHJ1ZSkge1xuICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXy5pc1N0cmluZyhpc1VwbG9hZEFsbG93ZWQpID8gaXNVcGxvYWRBbGxvd2VkIDogJ0BvbkJlZm9yZVVwbG9hZCgpIHJldHVybmVkIGZhbHNlJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoKG9wdHMuX19fcyA9PT0gdHJ1ZSkgJiYgdGhpcy5vbkluaXRpYXRlVXBsb2FkICYmIF8uaXNGdW5jdGlvbih0aGlzLm9uSW5pdGlhdGVVcGxvYWQpKSB7XG4gICAgICAgICAgdGhpcy5vbkluaXRpYXRlVXBsb2FkLmNhbGwoY3R4LCByZXN1bHQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICgob3B0cy5fX19zID09PSB0cnVlKSAmJiB0aGlzLm9uSW5pdGlhdGVVcGxvYWQgJiYgXy5pc0Z1bmN0aW9uKHRoaXMub25Jbml0aWF0ZVVwbG9hZCkpIHtcbiAgICAgIGN0eCA9IF8uZXh0ZW5kKHtcbiAgICAgICAgZmlsZTogb3B0cy5maWxlXG4gICAgICB9LCB7XG4gICAgICAgIGNodW5rSWQ6IG9wdHMuY2h1bmtJZCxcbiAgICAgICAgdXNlcklkOiByZXN1bHQudXNlcklkLFxuICAgICAgICB1c2VyKCkge1xuICAgICAgICAgIGlmIChNZXRlb3IudXNlcnMgJiYgcmVzdWx0LnVzZXJJZCkge1xuICAgICAgICAgICAgcmV0dXJuIE1ldGVvci51c2Vycy5maW5kT25lKHJlc3VsdC51c2VySWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSxcbiAgICAgICAgZW9mOiBvcHRzLmVvZlxuICAgICAgfSk7XG4gICAgICB0aGlzLm9uSW5pdGlhdGVVcGxvYWQuY2FsbChjdHgsIHJlc3VsdCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtyZXN1bHQsIG9wdHN9O1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIF9maW5pc2hVcGxvYWRcbiAgICogQHN1bW1hcnkgSW50ZXJuYWwgbWV0aG9kLiBGaW5pc2ggdXBsb2FkLCBjbG9zZSBXcml0YWJsZSBzdHJlYW0sIGFkZCByZWNvcmQgdG8gTW9uZ29EQiBhbmQgZmx1c2ggdXNlZCBtZW1vcnlcbiAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICovXG4gIF9maW5pc2hVcGxvYWQocmVzdWx0LCBvcHRzLCBjYikge1xuICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbVXBsb2FkXSBbZmluaXNoKGluZylVcGxvYWRdIC0+ICR7cmVzdWx0LnBhdGh9YCk7XG4gICAgZnMuY2htb2QocmVzdWx0LnBhdGgsIHRoaXMucGVybWlzc2lvbnMsIE5PT1ApO1xuICAgIHJlc3VsdC50eXBlICAgPSB0aGlzLl9nZXRNaW1lVHlwZShvcHRzLmZpbGUpO1xuICAgIHJlc3VsdC5wdWJsaWMgPSB0aGlzLnB1YmxpYztcbiAgICB0aGlzLl91cGRhdGVGaWxlVHlwZXMocmVzdWx0KTtcblxuICAgIHRoaXMuY29sbGVjdGlvbi5pbnNlcnQoXy5jbG9uZShyZXN1bHQpLCAoZXJyb3IsIF9pZCkgPT4ge1xuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIGNiICYmIGNiKGVycm9yKTtcbiAgICAgICAgdGhpcy5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtVcGxvYWRdIFtfZmluaXNoVXBsb2FkXSBFcnJvcjonLCBlcnJvcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9wcmVDb2xsZWN0aW9uLnVwZGF0ZSh7X2lkOiBvcHRzLmZpbGVJZH0sIHskc2V0OiB7aXNGaW5pc2hlZDogdHJ1ZX19KTtcbiAgICAgICAgcmVzdWx0Ll9pZCA9IF9pZDtcbiAgICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtVcGxvYWRdIFtmaW5pc2goZWQpVXBsb2FkXSAtPiAke3Jlc3VsdC5wYXRofWApO1xuICAgICAgICB0aGlzLm9uQWZ0ZXJVcGxvYWQgJiYgdGhpcy5vbkFmdGVyVXBsb2FkLmNhbGwodGhpcywgcmVzdWx0KTtcbiAgICAgICAgdGhpcy5lbWl0KCdhZnRlclVwbG9hZCcsIHJlc3VsdCk7XG4gICAgICAgIGNiICYmIGNiKG51bGwsIHJlc3VsdCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgX2hhbmRsZVVwbG9hZFxuICAgKiBAc3VtbWFyeSBJbnRlcm5hbCBtZXRob2QgdG8gaGFuZGxlIHVwbG9hZCBwcm9jZXNzLCBwaXBlIGluY29taW5nIGRhdGEgdG8gV3JpdGFibGUgc3RyZWFtXG4gICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAqL1xuICBfaGFuZGxlVXBsb2FkKHJlc3VsdCwgb3B0cywgY2IpIHtcbiAgICB0cnkge1xuICAgICAgaWYgKG9wdHMuZW9mKSB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRVcGxvYWRzW3Jlc3VsdC5faWRdLmVuZCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5lbWl0KCdfZmluaXNoVXBsb2FkJywgcmVzdWx0LCBvcHRzLCBjYik7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fY3VycmVudFVwbG9hZHNbcmVzdWx0Ll9pZF0ud3JpdGUob3B0cy5jaHVua0lkLCBvcHRzLmJpbkRhdGEsIGNiKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aGlzLl9kZWJ1ZygnW19oYW5kbGVVcGxvYWRdIFtFWENFUFRJT046XScsIGUpO1xuICAgICAgY2IgJiYgY2IoZSk7XG4gICAgfVxuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgX2dldE1pbWVUeXBlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlRGF0YSAtIEZpbGUgT2JqZWN0XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgZmlsZSdzIG1pbWUtdHlwZVxuICAgKiBAcmV0dXJucyB7U3RyaW5nfVxuICAgKi9cbiAgX2dldE1pbWVUeXBlKGZpbGVEYXRhKSB7XG4gICAgbGV0IG1pbWU7XG4gICAgY2hlY2soZmlsZURhdGEsIE9iamVjdCk7XG4gICAgaWYgKF8uaXNPYmplY3QoZmlsZURhdGEpICYmIGZpbGVEYXRhLnR5cGUpIHtcbiAgICAgIG1pbWUgPSBmaWxlRGF0YS50eXBlO1xuICAgIH1cblxuICAgIGlmIChmaWxlRGF0YS5wYXRoICYmICghbWltZSB8fCAhXy5pc1N0cmluZyhtaW1lKSkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGxldCBidWYgICA9IG5ldyBCdWZmZXIoMjYyKTtcbiAgICAgICAgY29uc3QgZmQgID0gZnMub3BlblN5bmMoZmlsZURhdGEucGF0aCwgJ3InKTtcbiAgICAgICAgY29uc3QgYnIgID0gZnMucmVhZFN5bmMoZmQsIGJ1ZiwgMCwgMjYyLCAwKTtcbiAgICAgICAgZnMuY2xvc2UoZmQsIE5PT1ApO1xuICAgICAgICBpZiAoYnIgPCAyNjIpIHtcbiAgICAgICAgICBidWYgPSBidWYuc2xpY2UoMCwgYnIpO1xuICAgICAgICB9XG4gICAgICAgICh7bWltZX0gPSBmaWxlVHlwZShidWYpKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gV2UncmUgZ29vZFxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghbWltZSB8fCAhXy5pc1N0cmluZyhtaW1lKSkge1xuICAgICAgbWltZSA9ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nO1xuICAgIH1cbiAgICByZXR1cm4gbWltZTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIF9nZXRVc2VyXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgb2JqZWN0IHdpdGggYHVzZXJJZGAgYW5kIGB1c2VyKClgIG1ldGhvZCB3aGljaCByZXR1cm4gdXNlcidzIG9iamVjdFxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgX2dldFVzZXIoaHR0cCkge1xuICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgIHVzZXIoKSB7IHJldHVybiBudWxsOyB9LFxuICAgICAgdXNlcklkOiBudWxsXG4gICAgfTtcblxuICAgIGlmIChodHRwKSB7XG4gICAgICBsZXQgbXRvayA9IG51bGw7XG4gICAgICBpZiAoaHR0cC5yZXF1ZXN0LmhlYWRlcnNbJ3gtbXRvayddKSB7XG4gICAgICAgIG10b2sgPSBodHRwLnJlcXVlc3QuaGVhZGVyc1sneC1tdG9rJ107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBjb29raWUgPSBodHRwLnJlcXVlc3QuQ29va2llcztcbiAgICAgICAgaWYgKGNvb2tpZS5oYXMoJ3hfbXRvaycpKSB7XG4gICAgICAgICAgbXRvayA9IGNvb2tpZS5nZXQoJ3hfbXRvaycpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChtdG9rKSB7XG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IChfLmlzT2JqZWN0KE1ldGVvci5zZXJ2ZXIuc2Vzc2lvbnMpICYmIF8uaXNPYmplY3QoTWV0ZW9yLnNlcnZlci5zZXNzaW9uc1ttdG9rXSkpID8gTWV0ZW9yLnNlcnZlci5zZXNzaW9uc1ttdG9rXS51c2VySWQgOiB2b2lkIDA7XG5cbiAgICAgICAgaWYgKHVzZXJJZCkge1xuICAgICAgICAgIHJlc3VsdC51c2VyICAgPSAoKSA9PiBNZXRlb3IudXNlcnMuZmluZE9uZSh1c2VySWQpO1xuICAgICAgICAgIHJlc3VsdC51c2VySWQgPSB1c2VySWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIHdyaXRlXG4gICAqIEBwYXJhbSB7QnVmZmVyfSBidWZmZXIgLSBCaW5hcnkgRmlsZSdzIEJ1ZmZlclxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyAtIE9iamVjdCB3aXRoIGZpbGUtZGF0YVxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5uYW1lIC0gRmlsZSBuYW1lLCBhbGlhczogYGZpbGVOYW1lYFxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy50eXBlIC0gRmlsZSBtaW1lLXR5cGVcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMubWV0YSAtIEZpbGUgYWRkaXRpb25hbCBtZXRhLWRhdGFcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMudXNlcklkIC0gVXNlcklkLCBkZWZhdWx0ICpudWxsKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5maWxlSWQgLSBfaWQsIGRlZmF1bHQgKm51bGwqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gZnVuY3Rpb24oZXJyb3IsIGZpbGVPYmopey4uLn1cbiAgICogQHBhcmFtIHtCb29sZWFufSBwcm9jZWVkQWZ0ZXJVcGxvYWQgLSBQcm9jZWVkIG9uQWZ0ZXJVcGxvYWQgaG9va1xuICAgKiBAc3VtbWFyeSBXcml0ZSBidWZmZXIgdG8gRlMgYW5kIGFkZCB0byBGaWxlc0NvbGxlY3Rpb24gQ29sbGVjdGlvblxuICAgKiBAcmV0dXJucyB7RmlsZXNDb2xsZWN0aW9ufSBJbnN0YW5jZVxuICAgKi9cbiAgd3JpdGUoYnVmZmVyLCBvcHRzID0ge30sIGNhbGxiYWNrLCBwcm9jZWVkQWZ0ZXJVcGxvYWQpIHtcbiAgICB0aGlzLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW3dyaXRlKCldJyk7XG5cbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdHMpKSB7XG4gICAgICBwcm9jZWVkQWZ0ZXJVcGxvYWQgPSBjYWxsYmFjaztcbiAgICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICAgIG9wdHMgICAgID0ge307XG4gICAgfSBlbHNlIGlmIChfLmlzQm9vbGVhbihjYWxsYmFjaykpIHtcbiAgICAgIHByb2NlZWRBZnRlclVwbG9hZCA9IGNhbGxiYWNrO1xuICAgIH0gZWxzZSBpZiAoXy5pc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAgIHByb2NlZWRBZnRlclVwbG9hZCA9IG9wdHM7XG4gICAgfVxuXG4gICAgY2hlY2sob3B0cywgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG4gICAgY2hlY2soY2FsbGJhY2ssIE1hdGNoLk9wdGlvbmFsKEZ1bmN0aW9uKSk7XG4gICAgY2hlY2socHJvY2VlZEFmdGVyVXBsb2FkLCBNYXRjaC5PcHRpb25hbChCb29sZWFuKSk7XG5cbiAgICBjb25zdCBmaWxlSWQgICA9IG9wdHMuZmlsZUlkIHx8IFJhbmRvbS5pZCgpO1xuICAgIGNvbnN0IEZTTmFtZSAgID0gdGhpcy5uYW1pbmdGdW5jdGlvbiA/IHRoaXMubmFtaW5nRnVuY3Rpb24ob3B0cykgOiBmaWxlSWQ7XG4gICAgY29uc3QgZmlsZU5hbWUgPSAob3B0cy5uYW1lIHx8IG9wdHMuZmlsZU5hbWUpID8gKG9wdHMubmFtZSB8fCBvcHRzLmZpbGVOYW1lKSA6IEZTTmFtZTtcblxuICAgIGNvbnN0IHtleHRlbnNpb24sIGV4dGVuc2lvbldpdGhEb3R9ID0gdGhpcy5fZ2V0RXh0KGZpbGVOYW1lKTtcblxuICAgIG9wdHMucGF0aCA9IGAke3RoaXMuc3RvcmFnZVBhdGgob3B0cyl9JHtub2RlUGF0aC5zZXB9JHtGU05hbWV9JHtleHRlbnNpb25XaXRoRG90fWA7XG4gICAgb3B0cy50eXBlID0gdGhpcy5fZ2V0TWltZVR5cGUob3B0cyk7XG4gICAgaWYgKCFfLmlzT2JqZWN0KG9wdHMubWV0YSkpIHtcbiAgICAgIG9wdHMubWV0YSA9IHt9O1xuICAgIH1cblxuICAgIGlmICghXy5pc051bWJlcihvcHRzLnNpemUpKSB7XG4gICAgICBvcHRzLnNpemUgPSBidWZmZXIubGVuZ3RoO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX2RhdGFUb1NjaGVtYSh7XG4gICAgICBuYW1lOiBmaWxlTmFtZSxcbiAgICAgIHBhdGg6IG9wdHMucGF0aCxcbiAgICAgIG1ldGE6IG9wdHMubWV0YSxcbiAgICAgIHR5cGU6IG9wdHMudHlwZSxcbiAgICAgIHNpemU6IG9wdHMuc2l6ZSxcbiAgICAgIHVzZXJJZDogb3B0cy51c2VySWQsXG4gICAgICBleHRlbnNpb25cbiAgICB9KTtcblxuICAgIHJlc3VsdC5faWQgPSBmaWxlSWQ7XG5cbiAgICBjb25zdCBzdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShvcHRzLnBhdGgsIHtmbGFnczogJ3cnLCBtb2RlOiB0aGlzLnBlcm1pc3Npb25zfSk7XG4gICAgc3RyZWFtLmVuZChidWZmZXIsIChzdHJlYW1FcnIpID0+IGJvdW5kKCgpID0+IHtcbiAgICAgIGlmIChzdHJlYW1FcnIpIHtcbiAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2soc3RyZWFtRXJyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5pbnNlcnQocmVzdWx0LCAoaW5zZXJ0RXJyLCBfaWQpID0+IHtcbiAgICAgICAgICBpZiAoaW5zZXJ0RXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhpbnNlcnRFcnIpO1xuICAgICAgICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFt3cml0ZV0gW2luc2VydF0gRXJyb3I6ICR7ZmlsZU5hbWV9IC0+ICR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gLCBpbnNlcnRFcnIpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlUmVmID0gdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUoX2lkKTtcbiAgICAgICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKG51bGwsIGZpbGVSZWYpO1xuICAgICAgICAgICAgaWYgKHByb2NlZWRBZnRlclVwbG9hZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICB0aGlzLm9uQWZ0ZXJVcGxvYWQgJiYgdGhpcy5vbkFmdGVyVXBsb2FkLmNhbGwodGhpcywgZmlsZVJlZik7XG4gICAgICAgICAgICAgIHRoaXMuZW1pdCgnYWZ0ZXJVcGxvYWQnLCBmaWxlUmVmKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbd3JpdGVdOiAke2ZpbGVOYW1lfSAtPiAke3RoaXMuY29sbGVjdGlvbk5hbWV9YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgbG9hZFxuICAgKiBAcGFyYW0ge1N0cmluZ30gdXJsIC0gVVJMIHRvIGZpbGVcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgLSBPYmplY3Qgd2l0aCBmaWxlLWRhdGFcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMuaGVhZGVycyAtIEhUVFAgaGVhZGVycyB0byB1c2Ugd2hlbiByZXF1ZXN0aW5nIHRoZSBmaWxlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLm5hbWUgLSBGaWxlIG5hbWUsIGFsaWFzOiBgZmlsZU5hbWVgXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLnR5cGUgLSBGaWxlIG1pbWUtdHlwZVxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cy5tZXRhIC0gRmlsZSBhZGRpdGlvbmFsIG1ldGEtZGF0YVxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy51c2VySWQgLSBVc2VySWQsIGRlZmF1bHQgKm51bGwqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmZpbGVJZCAtIF9pZCwgZGVmYXVsdCAqbnVsbCpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBmdW5jdGlvbihlcnJvciwgZmlsZU9iail7Li4ufVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IHByb2NlZWRBZnRlclVwbG9hZCAtIFByb2NlZWQgb25BZnRlclVwbG9hZCBob29rXG4gICAqIEBzdW1tYXJ5IERvd25sb2FkIGZpbGUsIHdyaXRlIHN0cmVhbSB0byBGUyBhbmQgYWRkIHRvIEZpbGVzQ29sbGVjdGlvbiBDb2xsZWN0aW9uXG4gICAqIEByZXR1cm5zIHtGaWxlc0NvbGxlY3Rpb259IEluc3RhbmNlXG4gICAqL1xuICBsb2FkKHVybCwgb3B0cyA9IHt9LCBjYWxsYmFjaywgcHJvY2VlZEFmdGVyVXBsb2FkKSB7XG4gICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtsb2FkKCR7dXJsfSwgJHtKU09OLnN0cmluZ2lmeShvcHRzKX0sIGNhbGxiYWNrKV1gKTtcblxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0cykpIHtcbiAgICAgIHByb2NlZWRBZnRlclVwbG9hZCA9IGNhbGxiYWNrO1xuICAgICAgY2FsbGJhY2sgPSBvcHRzO1xuICAgICAgb3B0cyAgICAgPSB7fTtcbiAgICB9IGVsc2UgaWYgKF8uaXNCb29sZWFuKGNhbGxiYWNrKSkge1xuICAgICAgcHJvY2VlZEFmdGVyVXBsb2FkID0gY2FsbGJhY2s7XG4gICAgfSBlbHNlIGlmIChfLmlzQm9vbGVhbihvcHRzKSkge1xuICAgICAgcHJvY2VlZEFmdGVyVXBsb2FkID0gb3B0cztcbiAgICB9XG5cbiAgICBjaGVjayh1cmwsIFN0cmluZyk7XG4gICAgY2hlY2sob3B0cywgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG4gICAgY2hlY2soY2FsbGJhY2ssIE1hdGNoLk9wdGlvbmFsKEZ1bmN0aW9uKSk7XG4gICAgY2hlY2socHJvY2VlZEFmdGVyVXBsb2FkLCBNYXRjaC5PcHRpb25hbChCb29sZWFuKSk7XG5cbiAgICBpZiAoIV8uaXNPYmplY3Qob3B0cykpIHtcbiAgICAgIG9wdHMgPSB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBmaWxlSWQgICAgPSBvcHRzLmZpbGVJZCB8fCBSYW5kb20uaWQoKTtcbiAgICBjb25zdCBGU05hbWUgICAgPSB0aGlzLm5hbWluZ0Z1bmN0aW9uID8gdGhpcy5uYW1pbmdGdW5jdGlvbihvcHRzKSA6IGZpbGVJZDtcbiAgICBjb25zdCBwYXRoUGFydHMgPSB1cmwuc3BsaXQoJy8nKTtcbiAgICBjb25zdCBmaWxlTmFtZSAgPSAob3B0cy5uYW1lIHx8IG9wdHMuZmlsZU5hbWUpID8gKG9wdHMubmFtZSB8fCBvcHRzLmZpbGVOYW1lKSA6IHBhdGhQYXJ0c1twYXRoUGFydHMubGVuZ3RoIC0gMV0gfHwgRlNOYW1lO1xuXG4gICAgY29uc3Qge2V4dGVuc2lvbiwgZXh0ZW5zaW9uV2l0aERvdH0gPSB0aGlzLl9nZXRFeHQoZmlsZU5hbWUpO1xuICAgIG9wdHMucGF0aCAgPSBgJHt0aGlzLnN0b3JhZ2VQYXRoKG9wdHMpfSR7bm9kZVBhdGguc2VwfSR7RlNOYW1lfSR7ZXh0ZW5zaW9uV2l0aERvdH1gO1xuXG4gICAgY29uc3Qgc3RvcmVSZXN1bHQgPSAocmVzdWx0LCBjYikgPT4ge1xuICAgICAgcmVzdWx0Ll9pZCA9IGZpbGVJZDtcblxuICAgICAgdGhpcy5jb2xsZWN0aW9uLmluc2VydChyZXN1bHQsIChlcnJvciwgX2lkKSA9PiB7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIGNiICYmIGNiKGVycm9yKTtcbiAgICAgICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2xvYWRdIFtpbnNlcnRdIEVycm9yOiAke2ZpbGVOYW1lfSAtPiAke3RoaXMuY29sbGVjdGlvbk5hbWV9YCwgZXJyb3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGZpbGVSZWYgPSB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShfaWQpO1xuICAgICAgICAgIGNiICYmIGNiKG51bGwsIGZpbGVSZWYpO1xuICAgICAgICAgIGlmIChwcm9jZWVkQWZ0ZXJVcGxvYWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIHRoaXMub25BZnRlclVwbG9hZCAmJiB0aGlzLm9uQWZ0ZXJVcGxvYWQuY2FsbCh0aGlzLCBmaWxlUmVmKTtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnYWZ0ZXJVcGxvYWQnLCBmaWxlUmVmKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtsb2FkXSBbaW5zZXJ0XSAke2ZpbGVOYW1lfSAtPiAke3RoaXMuY29sbGVjdGlvbk5hbWV9YCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXF1ZXN0LmdldCh7XG4gICAgICB1cmwsXG4gICAgICBoZWFkZXJzOiBvcHRzLmhlYWRlcnMgfHwge31cbiAgICB9KS5vbignZXJyb3InLCAoZXJyb3IpID0+IGJvdW5kKCgpID0+IHtcbiAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKGVycm9yKTtcbiAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbbG9hZF0gW3JlcXVlc3QuZ2V0KCR7dXJsfSldIEVycm9yOmAsIGVycm9yKTtcbiAgICB9KSkub24oJ3Jlc3BvbnNlJywgKHJlc3BvbnNlKSA9PiBib3VuZCgoKSA9PiB7XG4gICAgICByZXNwb25zZS5vbignZW5kJywgKCkgPT4gYm91bmQoKCkgPT4ge1xuICAgICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2xvYWRdIFJlY2VpdmVkOiAke3VybH1gKTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fZGF0YVRvU2NoZW1hKHtcbiAgICAgICAgICBuYW1lOiBmaWxlTmFtZSxcbiAgICAgICAgICBwYXRoOiBvcHRzLnBhdGgsXG4gICAgICAgICAgbWV0YTogb3B0cy5tZXRhLFxuICAgICAgICAgIHR5cGU6IG9wdHMudHlwZSB8fCByZXNwb25zZS5oZWFkZXJzWydjb250ZW50LXR5cGUnXSB8fCB0aGlzLl9nZXRNaW1lVHlwZSh7cGF0aDogb3B0cy5wYXRofSksXG4gICAgICAgICAgc2l6ZTogb3B0cy5zaXplIHx8IHBhcnNlSW50KHJlc3BvbnNlLmhlYWRlcnNbJ2NvbnRlbnQtbGVuZ3RoJ10gfHwgMCksXG4gICAgICAgICAgdXNlcklkOiBvcHRzLnVzZXJJZCxcbiAgICAgICAgICBleHRlbnNpb25cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFyZXN1bHQuc2l6ZSkge1xuICAgICAgICAgIGZzLnN0YXQob3B0cy5wYXRoLCAoZXJyb3IsIHN0YXRzKSA9PiBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2soZXJyb3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0LnZlcnNpb25zLm9yaWdpbmFsLnNpemUgPSAocmVzdWx0LnNpemUgPSBzdGF0cy5zaXplKTtcbiAgICAgICAgICAgICAgc3RvcmVSZXN1bHQocmVzdWx0LCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0b3JlUmVzdWx0KHJlc3VsdCwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfSkpLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3B0cy5wYXRoLCB7ZmxhZ3M6ICd3JywgbW9kZTogdGhpcy5wZXJtaXNzaW9uc30pKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIGFkZEZpbGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggICAgICAgICAgLSBQYXRoIHRvIGZpbGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMgICAgICAgICAgLSBbT3B0aW9uYWxdIE9iamVjdCB3aXRoIGZpbGUtZGF0YVxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy50eXBlICAgICAtIFtPcHRpb25hbF0gRmlsZSBtaW1lLXR5cGVcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMubWV0YSAgICAgLSBbT3B0aW9uYWxdIEZpbGUgYWRkaXRpb25hbCBtZXRhLWRhdGFcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMuZmlsZU5hbWUgLSBbT3B0aW9uYWxdIEZpbGUgbmFtZSwgaWYgbm90IHNwZWNpZmllZCBmaWxlIG5hbWUgYW5kIGV4dGVuc2lvbiB3aWxsIGJlIHRha2VuIGZyb20gcGF0aFxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy51c2VySWQgICAtIFtPcHRpb25hbF0gVXNlcklkLCBkZWZhdWx0ICpudWxsKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAgICAtIFtPcHRpb25hbF0gZnVuY3Rpb24oZXJyb3IsIGZpbGVPYmopey4uLn1cbiAgICogQHBhcmFtIHtCb29sZWFufSBwcm9jZWVkQWZ0ZXJVcGxvYWQgLSBQcm9jZWVkIG9uQWZ0ZXJVcGxvYWQgaG9va1xuICAgKiBAc3VtbWFyeSBBZGQgZmlsZSBmcm9tIEZTIHRvIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAcmV0dXJucyB7RmlsZXNDb2xsZWN0aW9ufSBJbnN0YW5jZVxuICAgKi9cbiAgYWRkRmlsZShwYXRoLCBvcHRzID0ge30sIGNhbGxiYWNrLCBwcm9jZWVkQWZ0ZXJVcGxvYWQpIHtcbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2FkZEZpbGUoJHtwYXRofSldYCk7XG5cbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdHMpKSB7XG4gICAgICBwcm9jZWVkQWZ0ZXJVcGxvYWQgPSBjYWxsYmFjaztcbiAgICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICAgIG9wdHMgICAgID0ge307XG4gICAgfSBlbHNlIGlmIChfLmlzQm9vbGVhbihjYWxsYmFjaykpIHtcbiAgICAgIHByb2NlZWRBZnRlclVwbG9hZCA9IGNhbGxiYWNrO1xuICAgIH0gZWxzZSBpZiAoXy5pc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAgIHByb2NlZWRBZnRlclVwbG9hZCA9IG9wdHM7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucHVibGljKSB7XG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgJ0NhbiBub3QgcnVuIFthZGRGaWxlXSBvbiBwdWJsaWMgY29sbGVjdGlvbiEgSnVzdCBNb3ZlIGZpbGUgdG8gcm9vdCBvZiB5b3VyIHNlcnZlciwgdGhlbiBhZGQgcmVjb3JkIHRvIENvbGxlY3Rpb24nKTtcbiAgICB9XG5cbiAgICBjaGVjayhwYXRoLCBTdHJpbmcpO1xuICAgIGNoZWNrKG9wdHMsIE1hdGNoLk9wdGlvbmFsKE9iamVjdCkpO1xuICAgIGNoZWNrKGNhbGxiYWNrLCBNYXRjaC5PcHRpb25hbChGdW5jdGlvbikpO1xuICAgIGNoZWNrKHByb2NlZWRBZnRlclVwbG9hZCwgTWF0Y2guT3B0aW9uYWwoQm9vbGVhbikpO1xuXG4gICAgZnMuc3RhdChwYXRoLCAoc3RhdEVyciwgc3RhdHMpID0+IGJvdW5kKCgpID0+IHtcbiAgICAgIGlmIChzdGF0RXJyKSB7XG4gICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKHN0YXRFcnIpO1xuICAgICAgfSBlbHNlIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICBpZiAoIV8uaXNPYmplY3Qob3B0cykpIHtcbiAgICAgICAgICBvcHRzID0ge307XG4gICAgICAgIH1cbiAgICAgICAgb3B0cy5wYXRoICA9IHBhdGg7XG5cbiAgICAgICAgaWYgKCFvcHRzLmZpbGVOYW1lKSB7XG4gICAgICAgICAgY29uc3QgcGF0aFBhcnRzID0gcGF0aC5zcGxpdChub2RlUGF0aC5zZXApO1xuICAgICAgICAgIG9wdHMuZmlsZU5hbWUgICA9IHBhdGguc3BsaXQobm9kZVBhdGguc2VwKVtwYXRoUGFydHMubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7ZXh0ZW5zaW9ufSA9IHRoaXMuX2dldEV4dChvcHRzLmZpbGVOYW1lKTtcblxuICAgICAgICBpZiAoIV8uaXNTdHJpbmcob3B0cy50eXBlKSkge1xuICAgICAgICAgIG9wdHMudHlwZSA9IHRoaXMuX2dldE1pbWVUeXBlKG9wdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFfLmlzT2JqZWN0KG9wdHMubWV0YSkpIHtcbiAgICAgICAgICBvcHRzLm1ldGEgPSB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghXy5pc051bWJlcihvcHRzLnNpemUpKSB7XG4gICAgICAgICAgb3B0cy5zaXplID0gc3RhdHMuc2l6ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX2RhdGFUb1NjaGVtYSh7XG4gICAgICAgICAgbmFtZTogb3B0cy5maWxlTmFtZSxcbiAgICAgICAgICBwYXRoLFxuICAgICAgICAgIG1ldGE6IG9wdHMubWV0YSxcbiAgICAgICAgICB0eXBlOiBvcHRzLnR5cGUsXG4gICAgICAgICAgc2l6ZTogb3B0cy5zaXplLFxuICAgICAgICAgIHVzZXJJZDogb3B0cy51c2VySWQsXG4gICAgICAgICAgZXh0ZW5zaW9uLFxuICAgICAgICAgIF9zdG9yYWdlUGF0aDogcGF0aC5yZXBsYWNlKGAke25vZGVQYXRoLnNlcH0ke29wdHMuZmlsZU5hbWV9YCwgJycpLFxuICAgICAgICAgIGZpbGVJZDogb3B0cy5maWxlSWQgfHwgbnVsbFxuICAgICAgICB9KTtcblxuXG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5pbnNlcnQocmVzdWx0LCAoaW5zZXJ0RXJyLCBfaWQpID0+IHtcbiAgICAgICAgICBpZiAoaW5zZXJ0RXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhpbnNlcnRFcnIpO1xuICAgICAgICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFthZGRGaWxlXSBbaW5zZXJ0XSBFcnJvcjogJHtyZXN1bHQubmFtZX0gLT4gJHt0aGlzLmNvbGxlY3Rpb25OYW1lfWAsIGluc2VydEVycik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVSZWYgPSB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShfaWQpO1xuICAgICAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2sobnVsbCwgZmlsZVJlZik7XG4gICAgICAgICAgICBpZiAocHJvY2VlZEFmdGVyVXBsb2FkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgIHRoaXMub25BZnRlclVwbG9hZCAmJiB0aGlzLm9uQWZ0ZXJVcGxvYWQuY2FsbCh0aGlzLCBmaWxlUmVmKTtcbiAgICAgICAgICAgICAgdGhpcy5lbWl0KCdhZnRlclVwbG9hZCcsIGZpbGVSZWYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFthZGRGaWxlXTogJHtyZXN1bHQubmFtZX0gLT4gJHt0aGlzLmNvbGxlY3Rpb25OYW1lfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhuZXcgTWV0ZW9yLkVycm9yKDQwMCwgYFtGaWxlc0NvbGxlY3Rpb25dIFthZGRGaWxlKCR7cGF0aH0pXTogRmlsZSBkb2VzIG5vdCBleGlzdGApKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSByZW1vdmVcbiAgICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBzZWxlY3RvciAtIE1vbmdvLVN0eWxlIHNlbGVjdG9yIChodHRwOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI3NlbGVjdG9ycylcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayB3aXRoIG9uZSBgZXJyb3JgIGFyZ3VtZW50XG4gICAqIEBzdW1tYXJ5IFJlbW92ZSBkb2N1bWVudHMgZnJvbSB0aGUgY29sbGVjdGlvblxuICAgKiBAcmV0dXJucyB7RmlsZXNDb2xsZWN0aW9ufSBJbnN0YW5jZVxuICAgKi9cbiAgcmVtb3ZlKHNlbGVjdG9yLCBjYWxsYmFjaykge1xuICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbcmVtb3ZlKCR7SlNPTi5zdHJpbmdpZnkoc2VsZWN0b3IpfSldYCk7XG4gICAgaWYgKHNlbGVjdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBjaGVjayhjYWxsYmFjaywgTWF0Y2guT3B0aW9uYWwoRnVuY3Rpb24pKTtcblxuICAgIGNvbnN0IGZpbGVzID0gdGhpcy5jb2xsZWN0aW9uLmZpbmQoc2VsZWN0b3IpO1xuICAgIGlmIChmaWxlcy5jb3VudCgpID4gMCkge1xuICAgICAgZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgICB0aGlzLnVubGluayhmaWxlKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhuZXcgTWV0ZW9yLkVycm9yKDQwNCwgJ0N1cnNvciBpcyBlbXB0eSwgbm8gZmlsZXMgaXMgcmVtb3ZlZCcpKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9uQWZ0ZXJSZW1vdmUpIHtcbiAgICAgIGNvbnN0IGRvY3MgPSBmaWxlcy5mZXRjaCgpO1xuICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICB0aGlzLmNvbGxlY3Rpb24ucmVtb3ZlKHNlbGVjdG9yLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHNlbGYub25BZnRlclJlbW92ZShkb2NzKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbGxlY3Rpb24ucmVtb3ZlKHNlbGVjdG9yLCAoY2FsbGJhY2sgfHwgTk9PUCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSBkZW55XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBydWxlc1xuICAgKiBAc2VlICBodHRwczovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNNb25nby1Db2xsZWN0aW9uLWRlbnlcbiAgICogQHN1bW1hcnkgbGluayBNb25nby5Db2xsZWN0aW9uIGRlbnkgbWV0aG9kc1xuICAgKiBAcmV0dXJucyB7TW9uZ28uQ29sbGVjdGlvbn0gSW5zdGFuY2VcbiAgICovXG4gIGRlbnkocnVsZXMpIHtcbiAgICB0aGlzLmNvbGxlY3Rpb24uZGVueShydWxlcyk7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbjtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSBhbGxvd1xuICAgKiBAcGFyYW0ge09iamVjdH0gcnVsZXNcbiAgICogQHNlZSBodHRwczovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNNb25nby1Db2xsZWN0aW9uLWFsbG93XG4gICAqIEBzdW1tYXJ5IGxpbmsgTW9uZ28uQ29sbGVjdGlvbiBhbGxvdyBtZXRob2RzXG4gICAqIEByZXR1cm5zIHtNb25nby5Db2xsZWN0aW9ufSBJbnN0YW5jZVxuICAgKi9cbiAgYWxsb3cocnVsZXMpIHtcbiAgICB0aGlzLmNvbGxlY3Rpb24uYWxsb3cocnVsZXMpO1xuICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb247XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgZGVueUNsaWVudFxuICAgKiBAc2VlIGh0dHBzOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI01vbmdvLUNvbGxlY3Rpb24tZGVueVxuICAgKiBAc3VtbWFyeSBTaG9ydGhhbmRzIGZvciBNb25nby5Db2xsZWN0aW9uIGRlbnkgbWV0aG9kXG4gICAqIEByZXR1cm5zIHtNb25nby5Db2xsZWN0aW9ufSBJbnN0YW5jZVxuICAgKi9cbiAgZGVueUNsaWVudCgpIHtcbiAgICB0aGlzLmNvbGxlY3Rpb24uZGVueSh7XG4gICAgICBpbnNlcnQoKSB7IHJldHVybiB0cnVlOyB9LFxuICAgICAgdXBkYXRlKCkgeyByZXR1cm4gdHJ1ZTsgfSxcbiAgICAgIHJlbW92ZSgpIHsgcmV0dXJuIHRydWU7IH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIGFsbG93Q2xpZW50XG4gICAqIEBzZWUgaHR0cHM6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjTW9uZ28tQ29sbGVjdGlvbi1hbGxvd1xuICAgKiBAc3VtbWFyeSBTaG9ydGhhbmRzIGZvciBNb25nby5Db2xsZWN0aW9uIGFsbG93IG1ldGhvZFxuICAgKiBAcmV0dXJucyB7TW9uZ28uQ29sbGVjdGlvbn0gSW5zdGFuY2VcbiAgICovXG4gIGFsbG93Q2xpZW50KCkge1xuICAgIHRoaXMuY29sbGVjdGlvbi5hbGxvdyh7XG4gICAgICBpbnNlcnQoKSB7IHJldHVybiB0cnVlOyB9LFxuICAgICAgdXBkYXRlKCkgeyByZXR1cm4gdHJ1ZTsgfSxcbiAgICAgIHJlbW92ZSgpIHsgcmV0dXJuIHRydWU7IH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uO1xuICB9XG5cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgdW5saW5rXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlUmVmIC0gZmlsZU9ialxuICAgKiBAcGFyYW0ge1N0cmluZ30gdmVyc2lvbiAtIFtPcHRpb25hbF0gZmlsZSdzIHZlcnNpb25cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBbT3B0aW9uYWxdIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAqIEBzdW1tYXJ5IFVubGluayBmaWxlcyBhbmQgaXQncyB2ZXJzaW9ucyBmcm9tIEZTXG4gICAqIEByZXR1cm5zIHtGaWxlc0NvbGxlY3Rpb259IEluc3RhbmNlXG4gICAqL1xuICB1bmxpbmsoZmlsZVJlZiwgdmVyc2lvbiwgY2FsbGJhY2spIHtcbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW3VubGluaygke2ZpbGVSZWYuX2lkfSwgJHt2ZXJzaW9ufSldYCk7XG4gICAgaWYgKHZlcnNpb24pIHtcbiAgICAgIGlmIChfLmlzT2JqZWN0KGZpbGVSZWYudmVyc2lvbnMpICYmIF8uaXNPYmplY3QoZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXSkgJiYgZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXS5wYXRoKSB7XG4gICAgICAgIGZzLnVubGluayhmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dLnBhdGgsIChjYWxsYmFjayB8fCBOT09QKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChfLmlzT2JqZWN0KGZpbGVSZWYudmVyc2lvbnMpKSB7XG4gICAgICAgIF8uZWFjaChmaWxlUmVmLnZlcnNpb25zLCAodlJlZikgPT4gYm91bmQoKCkgPT4ge1xuICAgICAgICAgIGZzLnVubGluayh2UmVmLnBhdGgsIChjYWxsYmFjayB8fCBOT09QKSk7XG4gICAgICAgIH0pKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZzLnVubGluayhmaWxlUmVmLnBhdGgsIChjYWxsYmFjayB8fCBOT09QKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIF80MDRcbiAgICogQHN1bW1hcnkgSW50ZXJuYWwgbWV0aG9kLCB1c2VkIHRvIHJldHVybiA0MDQgZXJyb3JcbiAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICovXG4gIF80MDQoaHR0cCkge1xuICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbZG93bmxvYWQoJHtodHRwLnJlcXVlc3Qub3JpZ2luYWxVcmx9KV0gW180MDRdIEZpbGUgbm90IGZvdW5kYCk7XG4gICAgY29uc3QgdGV4dCA9ICdGaWxlIE5vdCBGb3VuZCA6KCc7XG5cbiAgICBpZiAoIWh0dHAucmVzcG9uc2UuaGVhZGVyc1NlbnQpIHtcbiAgICAgIGh0dHAucmVzcG9uc2Uud3JpdGVIZWFkKDQwNCwge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW4nLFxuICAgICAgICAnQ29udGVudC1MZW5ndGgnOiB0ZXh0Lmxlbmd0aFxuICAgICAgfVxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKCFodHRwLnJlc3BvbnNlLmZpbmlzaGVkKSB7XG4gICAgICBodHRwLnJlc3BvbnNlLmVuZCh0ZXh0KTtcbiAgICB9XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgZG93bmxvYWRcbiAgICogQHBhcmFtIHtPYmplY3R9IGh0dHAgICAgLSBTZXJ2ZXIgSFRUUCBvYmplY3RcbiAgICogQHBhcmFtIHtTdHJpbmd9IHZlcnNpb24gLSBSZXF1ZXN0ZWQgZmlsZSB2ZXJzaW9uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlUmVmIC0gUmVxdWVzdGVkIGZpbGUgT2JqZWN0XG4gICAqIEBzdW1tYXJ5IEluaXRpYXRlcyB0aGUgSFRUUCByZXNwb25zZVxuICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgKi9cbiAgZG93bmxvYWQoaHR0cCwgdmVyc2lvbiA9ICdvcmlnaW5hbCcsIGZpbGVSZWYpIHtcbiAgICBsZXQgdlJlZjtcbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2Rvd25sb2FkKCR7aHR0cC5yZXF1ZXN0Lm9yaWdpbmFsVXJsfSwgJHt2ZXJzaW9ufSldYCk7XG5cbiAgICBpZiAoZmlsZVJlZikge1xuICAgICAgaWYgKF8uaGFzKGZpbGVSZWYsICd2ZXJzaW9ucycpICYmIF8uaGFzKGZpbGVSZWYudmVyc2lvbnMsIHZlcnNpb24pKSB7XG4gICAgICAgIHZSZWYgPSBmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dO1xuICAgICAgICB2UmVmLl9pZCA9IGZpbGVSZWYuX2lkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdlJlZiA9IGZpbGVSZWY7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHZSZWYgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIXZSZWYgfHwgIV8uaXNPYmplY3QodlJlZikpIHtcbiAgICAgIHJldHVybiB0aGlzLl80MDQoaHR0cCk7XG4gICAgfSBlbHNlIGlmIChmaWxlUmVmKSB7XG4gICAgICBpZiAodGhpcy5kb3dubG9hZENhbGxiYWNrKSB7XG4gICAgICAgIGlmICghdGhpcy5kb3dubG9hZENhbGxiYWNrLmNhbGwoXy5leHRlbmQoaHR0cCwgdGhpcy5fZ2V0VXNlcihodHRwKSksIGZpbGVSZWYpKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuXzQwNChodHRwKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5pbnRlcmNlcHREb3dubG9hZCAmJiBfLmlzRnVuY3Rpb24odGhpcy5pbnRlcmNlcHREb3dubG9hZCkpIHtcbiAgICAgICAgaWYgKHRoaXMuaW50ZXJjZXB0RG93bmxvYWQoaHR0cCwgZmlsZVJlZiwgdmVyc2lvbikgPT09IHRydWUpIHtcbiAgICAgICAgICByZXR1cm4gdm9pZCAwO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZzLnN0YXQodlJlZi5wYXRoLCAoc3RhdEVyciwgc3RhdHMpID0+IGJvdW5kKCgpID0+IHtcbiAgICAgICAgbGV0IHJlc3BvbnNlVHlwZTtcbiAgICAgICAgaWYgKHN0YXRFcnIgfHwgIXN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuXzQwNChodHRwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgoc3RhdHMuc2l6ZSAhPT0gdlJlZi5zaXplKSAmJiAhdGhpcy5pbnRlZ3JpdHlDaGVjaykge1xuICAgICAgICAgIHZSZWYuc2l6ZSAgICA9IHN0YXRzLnNpemU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoKHN0YXRzLnNpemUgIT09IHZSZWYuc2l6ZSkgJiYgdGhpcy5pbnRlZ3JpdHlDaGVjaykge1xuICAgICAgICAgIHJlc3BvbnNlVHlwZSA9ICc0MDAnO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuc2VydmUoaHR0cCwgZmlsZVJlZiwgdlJlZiwgdmVyc2lvbiwgbnVsbCwgKHJlc3BvbnNlVHlwZSB8fCAnMjAwJykpO1xuICAgICAgfSkpO1xuICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuXzQwNChodHRwKTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSBzZXJ2ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gaHR0cCAgICAtIFNlcnZlciBIVFRQIG9iamVjdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZmlsZVJlZiAtIFJlcXVlc3RlZCBmaWxlIE9iamVjdFxuICAgKiBAcGFyYW0ge09iamVjdH0gdlJlZiAgICAtIFJlcXVlc3RlZCBmaWxlIHZlcnNpb24gT2JqZWN0XG4gICAqIEBwYXJhbSB7U3RyaW5nfSB2ZXJzaW9uIC0gUmVxdWVzdGVkIGZpbGUgdmVyc2lvblxuICAgKiBAcGFyYW0ge3N0cmVhbS5SZWFkYWJsZXxudWxsfSByZWFkYWJsZVN0cmVhbSAtIFJlYWRhYmxlIHN0cmVhbSwgd2hpY2ggc2VydmVzIGJpbmFyeSBmaWxlIGRhdGFcbiAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlVHlwZSAtIFJlc3BvbnNlIGNvZGVcbiAgICogQHBhcmFtIHtCb29sZWFufSBmb3JjZTIwMCAtIEZvcmNlIDIwMCByZXNwb25zZSBjb2RlIG92ZXIgMjA2XG4gICAqIEBzdW1tYXJ5IEhhbmRsZSBhbmQgcmVwbHkgdG8gaW5jb21pbmcgcmVxdWVzdFxuICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgKi9cbiAgc2VydmUoaHR0cCwgZmlsZVJlZiwgdlJlZiwgdmVyc2lvbiA9ICdvcmlnaW5hbCcsIHJlYWRhYmxlU3RyZWFtID0gbnVsbCwgcmVzcG9uc2VUeXBlID0gJzIwMCcsIGZvcmNlMjAwID0gZmFsc2UpIHtcbiAgICBsZXQgcGFydGlyYWwgPSBmYWxzZTtcbiAgICBsZXQgcmVxUmFuZ2UgPSBmYWxzZTtcbiAgICBsZXQgZGlzcG9zaXRpb25UeXBlID0gJyc7XG4gICAgbGV0IHN0YXJ0O1xuICAgIGxldCBlbmQ7XG4gICAgbGV0IHRha2U7XG5cbiAgICBpZiAoaHR0cC5wYXJhbXMucXVlcnkuZG93bmxvYWQgJiYgKGh0dHAucGFyYW1zLnF1ZXJ5LmRvd25sb2FkID09PSAndHJ1ZScpKSB7XG4gICAgICBkaXNwb3NpdGlvblR5cGUgPSAnYXR0YWNobWVudDsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgZGlzcG9zaXRpb25UeXBlID0gJ2lubGluZTsgJztcbiAgICB9XG5cbiAgICBjb25zdCBkaXNwb3NpdGlvbk5hbWUgICAgID0gYGZpbGVuYW1lPVxcXCIke2VuY29kZVVSSSh2UmVmLm5hbWUgfHwgZmlsZVJlZi5uYW1lKX1cXFwiOyBmaWxlbmFtZSo9VVRGLTgnJyR7ZW5jb2RlVVJJKHZSZWYubmFtZSB8fCBmaWxlUmVmLm5hbWUpfTsgYDtcbiAgICBjb25zdCBkaXNwb3NpdGlvbkVuY29kaW5nID0gJ2NoYXJzZXQ9VVRGLTgnO1xuXG4gICAgaWYgKCFodHRwLnJlc3BvbnNlLmhlYWRlcnNTZW50KSB7XG4gICAgICBodHRwLnJlc3BvbnNlLnNldEhlYWRlcignQ29udGVudC1EaXNwb3NpdGlvbicsIGRpc3Bvc2l0aW9uVHlwZSArIGRpc3Bvc2l0aW9uTmFtZSArIGRpc3Bvc2l0aW9uRW5jb2RpbmcpO1xuICAgIH1cblxuICAgIGlmIChodHRwLnJlcXVlc3QuaGVhZGVycy5yYW5nZSAmJiAhZm9yY2UyMDApIHtcbiAgICAgIHBhcnRpcmFsICAgID0gdHJ1ZTtcbiAgICAgIGNvbnN0IGFycmF5ID0gaHR0cC5yZXF1ZXN0LmhlYWRlcnMucmFuZ2Uuc3BsaXQoL2J5dGVzPShbMC05XSopLShbMC05XSopLyk7XG4gICAgICBzdGFydCAgICAgICA9IHBhcnNlSW50KGFycmF5WzFdKTtcbiAgICAgIGVuZCAgICAgICAgID0gcGFyc2VJbnQoYXJyYXlbMl0pO1xuICAgICAgaWYgKGlzTmFOKGVuZCkpIHtcbiAgICAgICAgZW5kICAgICAgID0gdlJlZi5zaXplIC0gMTtcbiAgICAgIH1cbiAgICAgIHRha2UgICAgICAgID0gZW5kIC0gc3RhcnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXJ0ID0gMDtcbiAgICAgIGVuZCAgID0gdlJlZi5zaXplIC0gMTtcbiAgICAgIHRha2UgID0gdlJlZi5zaXplO1xuICAgIH1cblxuICAgIGlmIChwYXJ0aXJhbCB8fCAoaHR0cC5wYXJhbXMucXVlcnkucGxheSAmJiAoaHR0cC5wYXJhbXMucXVlcnkucGxheSA9PT0gJ3RydWUnKSkpIHtcbiAgICAgIHJlcVJhbmdlID0ge3N0YXJ0LCBlbmR9O1xuICAgICAgaWYgKGlzTmFOKHN0YXJ0KSAmJiAhaXNOYU4oZW5kKSkge1xuICAgICAgICByZXFSYW5nZS5zdGFydCA9IGVuZCAtIHRha2U7XG4gICAgICAgIHJlcVJhbmdlLmVuZCAgID0gZW5kO1xuICAgICAgfVxuICAgICAgaWYgKCFpc05hTihzdGFydCkgJiYgaXNOYU4oZW5kKSkge1xuICAgICAgICByZXFSYW5nZS5zdGFydCA9IHN0YXJ0O1xuICAgICAgICByZXFSYW5nZS5lbmQgICA9IHN0YXJ0ICsgdGFrZTtcbiAgICAgIH1cblxuICAgICAgaWYgKChzdGFydCArIHRha2UpID49IHZSZWYuc2l6ZSkgeyByZXFSYW5nZS5lbmQgPSB2UmVmLnNpemUgLSAxOyB9XG5cbiAgICAgIGlmICh0aGlzLnN0cmljdCAmJiAoKHJlcVJhbmdlLnN0YXJ0ID49ICh2UmVmLnNpemUgLSAxKSkgfHwgKHJlcVJhbmdlLmVuZCA+ICh2UmVmLnNpemUgLSAxKSkpKSB7XG4gICAgICAgIHJlc3BvbnNlVHlwZSA9ICc0MTYnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzcG9uc2VUeXBlID0gJzIwNic7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3BvbnNlVHlwZSA9ICcyMDAnO1xuICAgIH1cblxuICAgIGNvbnN0IHN0cmVhbUVycm9ySGFuZGxlciA9IChlcnJvcikgPT4ge1xuICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtzZXJ2ZSgke3ZSZWYucGF0aH0sICR7dmVyc2lvbn0pXSBbNTAwXWAsIGVycm9yKTtcbiAgICAgIGlmICghaHR0cC5yZXNwb25zZS5maW5pc2hlZCkge1xuICAgICAgICBodHRwLnJlc3BvbnNlLmVuZChlcnJvci50b1N0cmluZygpKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgaGVhZGVycyA9IF8uaXNGdW5jdGlvbih0aGlzLnJlc3BvbnNlSGVhZGVycykgPyB0aGlzLnJlc3BvbnNlSGVhZGVycyhyZXNwb25zZVR5cGUsIGZpbGVSZWYsIHZSZWYsIHZlcnNpb24pIDogdGhpcy5yZXNwb25zZUhlYWRlcnM7XG5cbiAgICBpZiAoIWhlYWRlcnNbJ0NhY2hlLUNvbnRyb2wnXSkge1xuICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmhlYWRlcnNTZW50KSB7XG4gICAgICAgIGh0dHAucmVzcG9uc2Uuc2V0SGVhZGVyKCdDYWNoZS1Db250cm9sJywgdGhpcy5jYWNoZUNvbnRyb2wpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAobGV0IGtleSBpbiBoZWFkZXJzKSB7XG4gICAgICBpZiAoIWh0dHAucmVzcG9uc2UuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgaHR0cC5yZXNwb25zZS5zZXRIZWFkZXIoa2V5LCBoZWFkZXJzW2tleV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBzdHJlYW07XG5cbiAgICBzd2l0Y2ggKHJlc3BvbnNlVHlwZSkge1xuICAgIGNhc2UgJzQwMCc6XG4gICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW3NlcnZlKCR7dlJlZi5wYXRofSwgJHt2ZXJzaW9ufSldIFs0MDBdIENvbnRlbnQtTGVuZ3RoIG1pc21hdGNoIWApO1xuICAgICAgdmFyIHRleHQgPSAnQ29udGVudC1MZW5ndGggbWlzbWF0Y2ghJztcblxuICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmhlYWRlcnNTZW50KSB7XG4gICAgICAgIGh0dHAucmVzcG9uc2Uud3JpdGVIZWFkKDQwMCwge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAndGV4dC9wbGFpbicsXG4gICAgICAgICAgJ0NvbnRlbnQtTGVuZ3RoJzogdGV4dC5sZW5ndGhcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmICghaHR0cC5yZXNwb25zZS5maW5pc2hlZCkge1xuICAgICAgICBodHRwLnJlc3BvbnNlLmVuZCh0ZXh0KTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJzQwNCc6XG4gICAgICB0aGlzLl80MDQoaHR0cCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICc0MTYnOlxuICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtzZXJ2ZSgke3ZSZWYucGF0aH0sICR7dmVyc2lvbn0pXSBbNDE2XSBDb250ZW50LVJhbmdlIGlzIG5vdCBzcGVjaWZpZWQhYCk7XG4gICAgICBpZiAoIWh0dHAucmVzcG9uc2UuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgaHR0cC5yZXNwb25zZS53cml0ZUhlYWQoNDE2KTtcbiAgICAgIH1cbiAgICAgIGlmICghaHR0cC5yZXNwb25zZS5maW5pc2hlZCkge1xuICAgICAgICBodHRwLnJlc3BvbnNlLmVuZCgpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnMjA2JzpcbiAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbc2VydmUoJHt2UmVmLnBhdGh9LCAke3ZlcnNpb259KV0gWzIwNl1gKTtcbiAgICAgIGlmICghaHR0cC5yZXNwb25zZS5oZWFkZXJzU2VudCkge1xuICAgICAgICBodHRwLnJlc3BvbnNlLnNldEhlYWRlcignQ29udGVudC1SYW5nZScsIGBieXRlcyAke3JlcVJhbmdlLnN0YXJ0fS0ke3JlcVJhbmdlLmVuZH0vJHt2UmVmLnNpemV9YCk7XG4gICAgICB9XG4gICAgICBzdHJlYW0gPSByZWFkYWJsZVN0cmVhbSB8fCBmcy5jcmVhdGVSZWFkU3RyZWFtKHZSZWYucGF0aCwge3N0YXJ0OiByZXFSYW5nZS5zdGFydCwgZW5kOiByZXFSYW5nZS5lbmR9KTtcbiAgICAgIGlmICghaHR0cC5yZXNwb25zZS5oZWFkZXJzU2VudCkge1xuICAgICAgICBpZiAocmVhZGFibGVTdHJlYW0pIHtcbiAgICAgICAgICBodHRwLnJlc3BvbnNlLndyaXRlSGVhZCgyMDYpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGh0dHAucmVzcG9uc2Uub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIHN0cmVhbS5hYm9ydCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHN0cmVhbS5hYm9ydCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2Ygc3RyZWFtLmVuZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHN0cmVhbS5lbmQoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGh0dHAucmVxdWVzdC5vbignYWJvcnQnLCAoKSA9PiB7XG4gICAgICAgIGlmICh0eXBlb2Ygc3RyZWFtLmFib3J0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgc3RyZWFtLmFib3J0KCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBzdHJlYW0uZW5kID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgc3RyZWFtLmVuZCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgc3RyZWFtLm9uKCdvcGVuJywgKCkgPT4ge1xuICAgICAgICBpZiAoIWh0dHAucmVzcG9uc2UuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgICBodHRwLnJlc3BvbnNlLndyaXRlSGVhZCgyMDYpO1xuICAgICAgICB9XG4gICAgICB9KS5vbignYWJvcnQnLCAoKSA9PiB7XG4gICAgICAgIGlmICghaHR0cC5yZXNwb25zZS5maW5pc2hlZCkge1xuICAgICAgICAgIGh0dHAucmVzcG9uc2UuZW5kKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFodHRwLnJlcXVlc3QuYWJvcnRlZCkge1xuICAgICAgICAgIGh0dHAucmVxdWVzdC5hYm9ydCgpO1xuICAgICAgICB9XG4gICAgICB9KS5vbignZXJyb3InLCBzdHJlYW1FcnJvckhhbmRsZXJcbiAgICAgICkub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmZpbmlzaGVkKSB7XG4gICAgICAgICAgaHR0cC5yZXNwb25zZS5lbmQoKTtcbiAgICAgICAgfVxuICAgICAgfSkucGlwZShodHRwLnJlc3BvbnNlKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW3NlcnZlKCR7dlJlZi5wYXRofSwgJHt2ZXJzaW9ufSldIFsyMDBdYCk7XG4gICAgICBzdHJlYW0gPSByZWFkYWJsZVN0cmVhbSB8fCBmcy5jcmVhdGVSZWFkU3RyZWFtKHZSZWYucGF0aCk7XG4gICAgICBpZiAoIWh0dHAucmVzcG9uc2UuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgaWYgKHJlYWRhYmxlU3RyZWFtKSB7IGh0dHAucmVzcG9uc2Uud3JpdGVIZWFkKDIwMCk7IH1cbiAgICAgIH1cblxuICAgICAgaHR0cC5yZXNwb25zZS5vbignY2xvc2UnLCAoKSA9PiB7XG4gICAgICAgIGlmICh0eXBlb2Ygc3RyZWFtLmFib3J0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgc3RyZWFtLmFib3J0KCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBzdHJlYW0uZW5kID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgc3RyZWFtLmVuZCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgaHR0cC5yZXF1ZXN0Lm9uKCdhYm9ydCcsICgpID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzdHJlYW0uYWJvcnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBzdHJlYW0uYWJvcnQoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHN0cmVhbS5lbmQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBzdHJlYW0uZW5kKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBzdHJlYW0ub24oJ29wZW4nLCAoKSA9PiB7XG4gICAgICAgIGlmICghaHR0cC5yZXNwb25zZS5oZWFkZXJzU2VudCkge1xuICAgICAgICAgIGh0dHAucmVzcG9uc2Uud3JpdGVIZWFkKDIwMCk7XG4gICAgICAgIH1cbiAgICAgIH0pLm9uKCdhYm9ydCcsICgpID0+IHtcbiAgICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmZpbmlzaGVkKSB7XG4gICAgICAgICAgaHR0cC5yZXNwb25zZS5lbmQoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWh0dHAucmVxdWVzdC5hYm9ydGVkKSB7XG4gICAgICAgICAgaHR0cC5yZXF1ZXN0LmFib3J0KCk7XG4gICAgICAgIH1cbiAgICAgIH0pLm9uKCdlcnJvcicsIHN0cmVhbUVycm9ySGFuZGxlclxuICAgICAgKS5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICBpZiAoIWh0dHAucmVzcG9uc2UuZmluaXNoZWQpIHtcbiAgICAgICAgICBodHRwLnJlc3BvbnNlLmVuZCgpO1xuICAgICAgICB9XG4gICAgICB9KS5waXBlKGh0dHAucmVzcG9uc2UpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG59XG4iLCJpbXBvcnQgeyBfIH0gICAgICAgICAgICAgICAgICAgICAgIGZyb20gJ21ldGVvci91bmRlcnNjb3JlJztcbmltcG9ydCB7IEV2ZW50RW1pdHRlciB9ICAgICAgICAgICAgZnJvbSAnZXZlbnRlbWl0dGVyMyc7XG5pbXBvcnQgeyBmb3JtYXRGbGVVUkwgfSAgICAgICAgICAgIGZyb20gJy4vbGliLmpzJztcbmltcG9ydCB7IGNoZWNrLCBNYXRjaCB9ICAgICAgICAgICAgZnJvbSAnbWV0ZW9yL2NoZWNrJztcbmltcG9ydCB7IEZpbGVzQ3Vyc29yLCBGaWxlQ3Vyc29yIH0gZnJvbSAnLi9jdXJzb3IuanMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBGaWxlc0NvbGxlY3Rpb25Db3JlIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uQ29yZVxuICAgKiBAbmFtZSBfZGVidWdcbiAgICogQHN1bW1hcnkgUHJpbnQgbG9ncyBpbiBkZWJ1ZyBtb2RlXG4gICAqIEByZXR1cm5zIHt2b2lkfVxuICAgKi9cbiAgX2RlYnVnKCkge1xuICAgIGlmICh0aGlzLmRlYnVnKSB7XG4gICAgICAoY29uc29sZS5pbmZvIHx8IGNvbnNvbGUubG9nIHx8IGZ1bmN0aW9uICgpIHsgfSkuYXBwbHkodW5kZWZpbmVkLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uQ29yZVxuICAgKiBAbmFtZSBfZ2V0RmlsZU5hbWVcbiAgICogQHBhcmFtIHtPYmplY3R9IGZpbGVEYXRhIC0gRmlsZSBPYmplY3RcbiAgICogQHN1bW1hcnkgUmV0dXJucyBmaWxlJ3MgbmFtZVxuICAgKiBAcmV0dXJucyB7U3RyaW5nfVxuICAgKi9cbiAgX2dldEZpbGVOYW1lKGZpbGVEYXRhKSB7XG4gICAgY29uc3QgZmlsZU5hbWUgPSBmaWxlRGF0YS5uYW1lIHx8IGZpbGVEYXRhLmZpbGVOYW1lO1xuICAgIGlmIChfLmlzU3RyaW5nKGZpbGVOYW1lKSAmJiAoZmlsZU5hbWUubGVuZ3RoID4gMCkpIHtcbiAgICAgIHJldHVybiAoZmlsZURhdGEubmFtZSB8fCBmaWxlRGF0YS5maWxlTmFtZSkucmVwbGFjZSgvXFwuXFwuL2csICcnKS5yZXBsYWNlKC9cXC8vZywgJycpO1xuICAgIH1cbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvbkNvcmVcbiAgICogQG5hbWUgX2dldEV4dFxuICAgKiBAcGFyYW0ge1N0cmluZ30gRmlsZU5hbWUgLSBGaWxlIG5hbWVcbiAgICogQHN1bW1hcnkgR2V0IGV4dGVuc2lvbiBmcm9tIEZpbGVOYW1lXG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqL1xuICBfZ2V0RXh0KGZpbGVOYW1lKSB7XG4gICAgaWYgKCEhfmZpbGVOYW1lLmluZGV4T2YoJy4nKSkge1xuICAgICAgY29uc3QgZXh0ZW5zaW9uID0gKGZpbGVOYW1lLnNwbGl0KCcuJykucG9wKCkuc3BsaXQoJz8nKVswXSB8fCAnJykudG9Mb3dlckNhc2UoKTtcbiAgICAgIHJldHVybiB7IGV4dDogZXh0ZW5zaW9uLCBleHRlbnNpb24sIGV4dGVuc2lvbldpdGhEb3Q6IGAuJHtleHRlbnNpb259YCB9O1xuICAgIH1cbiAgICByZXR1cm4geyBleHQ6ICcnLCBleHRlbnNpb246ICcnLCBleHRlbnNpb25XaXRoRG90OiAnJyB9O1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25Db3JlXG4gICAqIEBuYW1lIF91cGRhdGVGaWxlVHlwZXNcbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGaWxlIGRhdGFcbiAgICogQHN1bW1hcnkgSW50ZXJuYWwgbWV0aG9kLiBDbGFzc2lmeSBmaWxlIGJhc2VkIG9uICd0eXBlJyBmaWVsZFxuICAgKi9cbiAgX3VwZGF0ZUZpbGVUeXBlcyhkYXRhKSB7XG4gICAgZGF0YS5pc1ZpZGVvICA9IC9edmlkZW9cXC8vaS50ZXN0KGRhdGEudHlwZSk7XG4gICAgZGF0YS5pc0F1ZGlvICA9IC9eYXVkaW9cXC8vaS50ZXN0KGRhdGEudHlwZSk7XG4gICAgZGF0YS5pc0ltYWdlICA9IC9eaW1hZ2VcXC8vaS50ZXN0KGRhdGEudHlwZSk7XG4gICAgZGF0YS5pc1RleHQgICA9IC9edGV4dFxcLy9pLnRlc3QoZGF0YS50eXBlKTtcbiAgICBkYXRhLmlzSlNPTiAgID0gL15hcHBsaWNhdGlvblxcL2pzb24kL2kudGVzdChkYXRhLnR5cGUpO1xuICAgIGRhdGEuaXNQREYgICAgPSAvXmFwcGxpY2F0aW9uXFwvKHgtKT9wZGYkL2kudGVzdChkYXRhLnR5cGUpO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25Db3JlXG4gICAqIEBuYW1lIF9kYXRhVG9TY2hlbWFcbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGaWxlIGRhdGFcbiAgICogQHN1bW1hcnkgSW50ZXJuYWwgbWV0aG9kLiBCdWlsZCBvYmplY3QgaW4gYWNjb3JkYW5jZSB3aXRoIGRlZmF1bHQgc2NoZW1hIGZyb20gRmlsZSBkYXRhXG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqL1xuICBfZGF0YVRvU2NoZW1hKGRhdGEpIHtcbiAgICBjb25zdCBkcyA9IHtcbiAgICAgIG5hbWU6IGRhdGEubmFtZSxcbiAgICAgIGV4dGVuc2lvbjogZGF0YS5leHRlbnNpb24sXG4gICAgICBwYXRoOiBkYXRhLnBhdGgsXG4gICAgICBtZXRhOiBkYXRhLm1ldGEsXG4gICAgICB0eXBlOiBkYXRhLnR5cGUsXG4gICAgICBzaXplOiBkYXRhLnNpemUsXG4gICAgICB1c2VySWQ6IGRhdGEudXNlcklkIHx8IG51bGwsXG4gICAgICB2ZXJzaW9uczoge1xuICAgICAgICBvcmlnaW5hbDoge1xuICAgICAgICAgIHBhdGg6IGRhdGEucGF0aCxcbiAgICAgICAgICBzaXplOiBkYXRhLnNpemUsXG4gICAgICAgICAgdHlwZTogZGF0YS50eXBlLFxuICAgICAgICAgIGV4dGVuc2lvbjogZGF0YS5leHRlbnNpb25cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIF9kb3dubG9hZFJvdXRlOiBkYXRhLl9kb3dubG9hZFJvdXRlIHx8IHRoaXMuZG93bmxvYWRSb3V0ZSxcbiAgICAgIF9jb2xsZWN0aW9uTmFtZTogZGF0YS5fY29sbGVjdGlvbk5hbWUgfHwgdGhpcy5jb2xsZWN0aW9uTmFtZVxuICAgIH07XG5cbiAgICAvL09wdGlvbmFsIGZpbGVJZFxuICAgIGlmIChkYXRhLmZpbGVJZCkge1xuICAgICAgZHMuX2lkID0gZGF0YS5maWxlSWQ7XG4gICAgfVxuXG4gICAgdGhpcy5fdXBkYXRlRmlsZVR5cGVzKGRzKTtcbiAgICBkcy5fc3RvcmFnZVBhdGggPSBkYXRhLl9zdG9yYWdlUGF0aCB8fCB0aGlzLnN0b3JhZ2VQYXRoKF8uZXh0ZW5kKGRhdGEsIGRzKSk7XG4gICAgcmV0dXJuIGRzO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25Db3JlXG4gICAqIEBuYW1lIGZpbmRPbmVcbiAgICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBzZWxlY3RvciAtIE1vbmdvLVN0eWxlIHNlbGVjdG9yIChodHRwOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI3NlbGVjdG9ycylcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBNb25nby1TdHlsZSBzZWxlY3RvciBPcHRpb25zIChodHRwOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI3NvcnRzcGVjaWZpZXJzKVxuICAgKiBAc3VtbWFyeSBGaW5kIGFuZCByZXR1cm4gQ3Vyc29yIGZvciBtYXRjaGluZyBkb2N1bWVudCBPYmplY3RcbiAgICogQHJldHVybnMge0ZpbGVDdXJzb3J9IEluc3RhbmNlXG4gICAqL1xuICBmaW5kT25lKHNlbGVjdG9yID0ge30sIG9wdGlvbnMpIHtcbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2ZpbmRPbmUoJHtKU09OLnN0cmluZ2lmeShzZWxlY3Rvcil9LCAke0pTT04uc3RyaW5naWZ5KG9wdGlvbnMpfSldYCk7XG4gICAgY2hlY2soc2VsZWN0b3IsIE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKE9iamVjdCwgU3RyaW5nLCBCb29sZWFuLCBOdW1iZXIsIG51bGwpKSk7XG4gICAgY2hlY2sob3B0aW9ucywgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG5cbiAgICBjb25zdCBkb2MgPSB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShzZWxlY3Rvciwgb3B0aW9ucyk7XG4gICAgaWYgKGRvYykge1xuICAgICAgcmV0dXJuIG5ldyBGaWxlQ3Vyc29yKGRvYywgdGhpcyk7XG4gICAgfVxuICAgIHJldHVybiBkb2M7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvbkNvcmVcbiAgICogQG5hbWUgZmluZFxuICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IHNlbGVjdG9yIC0gTW9uZ28tU3R5bGUgc2VsZWN0b3IgKGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjc2VsZWN0b3JzKVxuICAgKiBAcGFyYW0ge09iamVjdH0gICAgICAgIG9wdGlvbnMgIC0gTW9uZ28tU3R5bGUgc2VsZWN0b3IgT3B0aW9ucyAoaHR0cDovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNzb3J0c3BlY2lmaWVycylcbiAgICogQHN1bW1hcnkgRmluZCBhbmQgcmV0dXJuIEN1cnNvciBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gICAqIEByZXR1cm5zIHtGaWxlc0N1cnNvcn0gSW5zdGFuY2VcbiAgICovXG4gIGZpbmQoc2VsZWN0b3IgPSB7fSwgb3B0aW9ucykge1xuICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbZmluZCgke0pTT04uc3RyaW5naWZ5KHNlbGVjdG9yKX0sICR7SlNPTi5zdHJpbmdpZnkob3B0aW9ucyl9KV1gKTtcbiAgICBjaGVjayhzZWxlY3RvciwgTWF0Y2guT3B0aW9uYWwoTWF0Y2guT25lT2YoT2JqZWN0LCBTdHJpbmcsIEJvb2xlYW4sIE51bWJlciwgbnVsbCkpKTtcbiAgICBjaGVjayhvcHRpb25zLCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcblxuICAgIHJldHVybiBuZXcgRmlsZXNDdXJzb3Ioc2VsZWN0b3IsIG9wdGlvbnMsIHRoaXMpO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25Db3JlXG4gICAqIEBuYW1lIHVwZGF0ZVxuICAgKiBAc2VlIGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vIy9mdWxsL3VwZGF0ZVxuICAgKiBAc3VtbWFyeSBsaW5rIE1vbmdvLkNvbGxlY3Rpb24gdXBkYXRlIG1ldGhvZFxuICAgKiBAcmV0dXJucyB7TW9uZ28uQ29sbGVjdGlvbn0gSW5zdGFuY2VcbiAgICovXG4gIHVwZGF0ZSgpIHtcbiAgICB0aGlzLmNvbGxlY3Rpb24udXBkYXRlLmFwcGx5KHRoaXMuY29sbGVjdGlvbiwgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25Db3JlXG4gICAqIEBuYW1lIGxpbmtcbiAgICogQHBhcmFtIHtPYmplY3R9IGZpbGVSZWYgLSBGaWxlIHJlZmVyZW5jZSBvYmplY3RcbiAgICogQHBhcmFtIHtTdHJpbmd9IHZlcnNpb24gLSBWZXJzaW9uIG9mIGZpbGUgeW91IHdvdWxkIGxpa2UgdG8gcmVxdWVzdFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGRvd25sb2FkYWJsZSBVUkxcbiAgICogQHJldHVybnMge1N0cmluZ30gRW1wdHkgc3RyaW5nIHJldHVybmVkIGluIGNhc2UgaWYgZmlsZSBub3QgZm91bmQgaW4gREJcbiAgICovXG4gIGxpbmsoZmlsZVJlZiwgdmVyc2lvbiA9ICdvcmlnaW5hbCcpIHtcbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2xpbmsoJHsoXy5pc09iamVjdChmaWxlUmVmKSA/IGZpbGVSZWYuX2lkIDogdW5kZWZpbmVkKX0sICR7dmVyc2lvbn0pXWApO1xuICAgIGNoZWNrKGZpbGVSZWYsIE9iamVjdCk7XG4gICAgY2hlY2sodmVyc2lvbiwgU3RyaW5nKTtcblxuICAgIGlmICghZmlsZVJlZikge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgICByZXR1cm4gZm9ybWF0RmxlVVJMKGZpbGVSZWYsIHZlcnNpb24pO1xuICB9XG59XG4iLCJpbXBvcnQgeyBfIH0gICAgICBmcm9tICdtZXRlb3IvdW5kZXJzY29yZSc7XG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcblxuLypcbiAqIEBwcml2YXRlXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBjbGFzcyBGaWxlQ3Vyc29yXG4gKiBAcGFyYW0gX2ZpbGVSZWYgICAge09iamVjdH0gLSBNb25nby1TdHlsZSBzZWxlY3RvciAoaHR0cDovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNzZWxlY3RvcnMpXG4gKiBAcGFyYW0gX2NvbGxlY3Rpb24ge0ZpbGVzQ29sbGVjdGlvbn0gLSBGaWxlc0NvbGxlY3Rpb24gSW5zdGFuY2VcbiAqIEBzdW1tYXJ5IEludGVybmFsIGNsYXNzLCByZXByZXNlbnRzIGVhY2ggcmVjb3JkIGluIGBGaWxlc0N1cnNvci5lYWNoKClgIG9yIGRvY3VtZW50IHJldHVybmVkIGZyb20gYC5maW5kT25lKClgIG1ldGhvZFxuICovXG5leHBvcnQgY2xhc3MgRmlsZUN1cnNvciB7XG4gIGNvbnN0cnVjdG9yKF9maWxlUmVmLCBfY29sbGVjdGlvbikge1xuICAgIHRoaXMuX2ZpbGVSZWYgICAgPSBfZmlsZVJlZjtcbiAgICB0aGlzLl9jb2xsZWN0aW9uID0gX2NvbGxlY3Rpb247XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCBfZmlsZVJlZik7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVDdXJzb3JcbiAgICogQG5hbWUgcmVtb3ZlXG4gICAqIEBwYXJhbSBjYWxsYmFjayB7RnVuY3Rpb259IC0gVHJpZ2dlcmVkIGFzeW5jaHJvbm91c2x5IGFmdGVyIGl0ZW0gaXMgcmVtb3ZlZCBvciBmYWlsZWQgdG8gYmUgcmVtb3ZlZFxuICAgKiBAc3VtbWFyeSBSZW1vdmUgZG9jdW1lbnRcbiAgICogQHJldHVybnMge0ZpbGVDdXJzb3J9XG4gICAqL1xuICByZW1vdmUoY2FsbGJhY2spIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVDdXJzb3JdIFtyZW1vdmUoKV0nKTtcbiAgICBpZiAodGhpcy5fZmlsZVJlZikge1xuICAgICAgdGhpcy5fY29sbGVjdGlvbi5yZW1vdmUodGhpcy5fZmlsZVJlZi5faWQsIGNhbGxiYWNrKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2sobmV3IE1ldGVvci5FcnJvcig0MDQsICdObyBzdWNoIGZpbGUnKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlQ3Vyc29yXG4gICAqIEBuYW1lIGxpbmtcbiAgICogQHBhcmFtIHZlcnNpb24ge1N0cmluZ30gLSBOYW1lIG9mIGZpbGUncyBzdWJ2ZXJzaW9uXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgZG93bmxvYWRhYmxlIFVSTCB0byBGaWxlXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9XG4gICAqL1xuICBsaW5rKHZlcnNpb24gPSAnb3JpZ2luYWwnKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtGaWxlQ3Vyc29yXSBbbGluaygke3ZlcnNpb259KV1gKTtcbiAgICBpZiAodGhpcy5fZmlsZVJlZikge1xuICAgICAgcmV0dXJuIHRoaXMuX2NvbGxlY3Rpb24ubGluayh0aGlzLl9maWxlUmVmLCB2ZXJzaW9uKTtcbiAgICB9XG4gICAgcmV0dXJuICcnO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlQ3Vyc29yXG4gICAqIEBuYW1lIGdldFxuICAgKiBAcGFyYW0gcHJvcGVydHkge1N0cmluZ30gLSBOYW1lIG9mIHN1Yi1vYmplY3QgcHJvcGVydHlcbiAgICogQHN1bW1hcnkgUmV0dXJucyBjdXJyZW50IGRvY3VtZW50IGFzIGEgcGxhaW4gT2JqZWN0LCBpZiBgcHJvcGVydHlgIGlzIHNwZWNpZmllZCAtIHJldHVybnMgdmFsdWUgb2Ygc3ViLW9iamVjdCBwcm9wZXJ0eVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fG1peH1cbiAgICovXG4gIGdldChwcm9wZXJ0eSkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZUN1cnNvcl0gW2dldCgke3Byb3BlcnR5fSldYCk7XG4gICAgaWYgKHByb3BlcnR5KSB7XG4gICAgICByZXR1cm4gdGhpcy5fZmlsZVJlZltwcm9wZXJ0eV07XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9maWxlUmVmO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlQ3Vyc29yXG4gICAqIEBuYW1lIGZldGNoXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgZG9jdW1lbnQgYXMgcGxhaW4gT2JqZWN0IGluIEFycmF5XG4gICAqIEByZXR1cm5zIHtbT2JqZWN0XX1cbiAgICovXG4gIGZldGNoKCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZUN1cnNvcl0gW2ZldGNoKCldJyk7XG4gICAgcmV0dXJuIFt0aGlzLl9maWxlUmVmXTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZUN1cnNvclxuICAgKiBAbmFtZSB3aXRoXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgcmVhY3RpdmUgdmVyc2lvbiBvZiBjdXJyZW50IEZpbGVDdXJzb3IsIHVzZWZ1bCB0byB1c2Ugd2l0aCBge3sjd2l0aH19Li4ue3svd2l0aH19YCBibG9jayB0ZW1wbGF0ZSBoZWxwZXJcbiAgICogQHJldHVybnMge1tPYmplY3RdfVxuICAgKi9cbiAgd2l0aCgpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVDdXJzb3JdIFt3aXRoKCldJyk7XG4gICAgcmV0dXJuIF8uZXh0ZW5kKHRoaXMsIHRoaXMuX2NvbGxlY3Rpb24uY29sbGVjdGlvbi5maW5kT25lKHRoaXMuX2ZpbGVSZWYuX2lkKSk7XG4gIH1cbn1cblxuLypcbiAqIEBwcml2YXRlXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBjbGFzcyBGaWxlc0N1cnNvclxuICogQHBhcmFtIF9zZWxlY3RvciAgIHtTdHJpbmd8T2JqZWN0fSAgIC0gTW9uZ28tU3R5bGUgc2VsZWN0b3IgKGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjc2VsZWN0b3JzKVxuICogQHBhcmFtIG9wdGlvbnMgICAgIHtPYmplY3R9ICAgICAgICAgIC0gTW9uZ28tU3R5bGUgc2VsZWN0b3IgT3B0aW9ucyAoaHR0cDovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNzZWxlY3RvcnMpXG4gKiBAcGFyYW0gX2NvbGxlY3Rpb24ge0ZpbGVzQ29sbGVjdGlvbn0gLSBGaWxlc0NvbGxlY3Rpb24gSW5zdGFuY2VcbiAqIEBzdW1tYXJ5IEltcGxlbWVudGF0aW9uIG9mIEN1cnNvciBmb3IgRmlsZXNDb2xsZWN0aW9uXG4gKi9cbmV4cG9ydCBjbGFzcyBGaWxlc0N1cnNvciB7XG4gIGNvbnN0cnVjdG9yKF9zZWxlY3RvciA9IHt9LCBvcHRpb25zLCBfY29sbGVjdGlvbikge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24gPSBfY29sbGVjdGlvbjtcbiAgICB0aGlzLl9zZWxlY3RvciAgID0gX3NlbGVjdG9yO1xuICAgIHRoaXMuX2N1cnJlbnQgICAgPSAtMTtcbiAgICB0aGlzLmN1cnNvciAgICAgID0gdGhpcy5fY29sbGVjdGlvbi5jb2xsZWN0aW9uLmZpbmQodGhpcy5fc2VsZWN0b3IsIG9wdGlvbnMpO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBnZXRcbiAgICogQHN1bW1hcnkgUmV0dXJucyBhbGwgbWF0Y2hpbmcgZG9jdW1lbnQocykgYXMgYW4gQXJyYXkuIEFsaWFzIG9mIGAuZmV0Y2goKWBcbiAgICogQHJldHVybnMge1tPYmplY3RdfVxuICAgKi9cbiAgZ2V0KCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtnZXQoKV0nKTtcbiAgICByZXR1cm4gdGhpcy5jdXJzb3IuZmV0Y2goKTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgaGFzTmV4dFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGB0cnVlYCBpZiB0aGVyZSBpcyBuZXh0IGl0ZW0gYXZhaWxhYmxlIG9uIEN1cnNvclxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGhhc05leHQoKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW2hhc05leHQoKV0nKTtcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudCA8ICh0aGlzLmN1cnNvci5jb3VudCgpIC0gMSk7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIG5leHRcbiAgICogQHN1bW1hcnkgUmV0dXJucyBuZXh0IGl0ZW0gb24gQ3Vyc29yLCBpZiBhdmFpbGFibGVcbiAgICogQHJldHVybnMge09iamVjdHx1bmRlZmluZWR9XG4gICAqL1xuICBuZXh0KCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtuZXh0KCldJyk7XG4gICAgdGhpcy5jdXJzb3IuZmV0Y2goKVsrK3RoaXMuX2N1cnJlbnRdO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBoYXNQcmV2aW91c1xuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGB0cnVlYCBpZiB0aGVyZSBpcyBwcmV2aW91cyBpdGVtIGF2YWlsYWJsZSBvbiBDdXJzb3JcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBoYXNQcmV2aW91cygpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbaGFzUHJldmlvdXMoKV0nKTtcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudCAhPT0gLTE7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIHByZXZpb3VzXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgcHJldmlvdXMgaXRlbSBvbiBDdXJzb3IsIGlmIGF2YWlsYWJsZVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fHVuZGVmaW5lZH1cbiAgICovXG4gIHByZXZpb3VzKCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtwcmV2aW91cygpXScpO1xuICAgIHRoaXMuY3Vyc29yLmZldGNoKClbLS10aGlzLl9jdXJyZW50XTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgZmV0Y2hcbiAgICogQHN1bW1hcnkgUmV0dXJucyBhbGwgbWF0Y2hpbmcgZG9jdW1lbnQocykgYXMgYW4gQXJyYXkuXG4gICAqIEByZXR1cm5zIHtbT2JqZWN0XX1cbiAgICovXG4gIGZldGNoKCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtmZXRjaCgpXScpO1xuICAgIHJldHVybiB0aGlzLmN1cnNvci5mZXRjaCgpIHx8IFtdO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBmaXJzdFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGZpcnN0IGl0ZW0gb24gQ3Vyc29yLCBpZiBhdmFpbGFibGVcbiAgICogQHJldHVybnMge09iamVjdHx1bmRlZmluZWR9XG4gICAqL1xuICBmaXJzdCgpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbZmlyc3QoKV0nKTtcbiAgICB0aGlzLl9jdXJyZW50ID0gMDtcbiAgICByZXR1cm4gdGhpcy5mZXRjaCgpW3RoaXMuX2N1cnJlbnRdO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBsYXN0XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgbGFzdCBpdGVtIG9uIEN1cnNvciwgaWYgYXZhaWxhYmxlXG4gICAqIEByZXR1cm5zIHtPYmplY3R8dW5kZWZpbmVkfVxuICAgKi9cbiAgbGFzdCgpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbbGFzdCgpXScpO1xuICAgIHRoaXMuX2N1cnJlbnQgPSB0aGlzLmNvdW50KCkgLSAxO1xuICAgIHJldHVybiB0aGlzLmZldGNoKClbdGhpcy5fY3VycmVudF07XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIGNvdW50XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgdGhlIG51bWJlciBvZiBkb2N1bWVudHMgdGhhdCBtYXRjaCBhIHF1ZXJ5XG4gICAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gICAqL1xuICBjb3VudCgpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbY291bnQoKV0nKTtcbiAgICByZXR1cm4gdGhpcy5jdXJzb3IuY291bnQoKTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgcmVtb3ZlXG4gICAqIEBwYXJhbSBjYWxsYmFjayB7RnVuY3Rpb259IC0gVHJpZ2dlcmVkIGFzeW5jaHJvbm91c2x5IGFmdGVyIGl0ZW0gaXMgcmVtb3ZlZCBvciBmYWlsZWQgdG8gYmUgcmVtb3ZlZFxuICAgKiBAc3VtbWFyeSBSZW1vdmVzIGFsbCBkb2N1bWVudHMgdGhhdCBtYXRjaCBhIHF1ZXJ5XG4gICAqIEByZXR1cm5zIHtGaWxlc0N1cnNvcn1cbiAgICovXG4gIHJlbW92ZShjYWxsYmFjaykge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtyZW1vdmUoKV0nKTtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLnJlbW92ZSh0aGlzLl9zZWxlY3RvciwgY2FsbGJhY2spO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBmb3JFYWNoXG4gICAqIEBwYXJhbSBjYWxsYmFjayB7RnVuY3Rpb259IC0gRnVuY3Rpb24gdG8gY2FsbC4gSXQgd2lsbCBiZSBjYWxsZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM6IHRoZSBgZmlsZWAsIGEgMC1iYXNlZCBpbmRleCwgYW5kIGN1cnNvciBpdHNlbGZcbiAgICogQHBhcmFtIGNvbnRleHQge09iamVjdH0gLSBBbiBvYmplY3Qgd2hpY2ggd2lsbCBiZSB0aGUgdmFsdWUgb2YgYHRoaXNgIGluc2lkZSBgY2FsbGJhY2tgXG4gICAqIEBzdW1tYXJ5IENhbGwgYGNhbGxiYWNrYCBvbmNlIGZvciBlYWNoIG1hdGNoaW5nIGRvY3VtZW50LCBzZXF1ZW50aWFsbHkgYW5kIHN5bmNocm9ub3VzbHkuXG4gICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAqL1xuICBmb3JFYWNoKGNhbGxiYWNrLCBjb250ZXh0ID0ge30pIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbZm9yRWFjaCgpXScpO1xuICAgIHRoaXMuY3Vyc29yLmZvckVhY2goY2FsbGJhY2ssIGNvbnRleHQpO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBlYWNoXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgYW4gQXJyYXkgb2YgRmlsZUN1cnNvciBtYWRlIGZvciBlYWNoIGRvY3VtZW50IG9uIGN1cnJlbnQgY3Vyc29yXG4gICAqICAgICAgICAgIFVzZWZ1bCB3aGVuIHVzaW5nIGluIHt7I2VhY2ggRmlsZXNDdXJzb3IjZWFjaH19Li4ue3svZWFjaH19IGJsb2NrIHRlbXBsYXRlIGhlbHBlclxuICAgKiBAcmV0dXJucyB7W0ZpbGVDdXJzb3JdfVxuICAgKi9cbiAgZWFjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAoKGZpbGUpID0+IHtcbiAgICAgIHJldHVybiBuZXcgRmlsZUN1cnNvcihmaWxlLCB0aGlzLl9jb2xsZWN0aW9uKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgbWFwXG4gICAqIEBwYXJhbSBjYWxsYmFjayB7RnVuY3Rpb259IC0gRnVuY3Rpb24gdG8gY2FsbC4gSXQgd2lsbCBiZSBjYWxsZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM6IHRoZSBgZmlsZWAsIGEgMC1iYXNlZCBpbmRleCwgYW5kIGN1cnNvciBpdHNlbGZcbiAgICogQHBhcmFtIGNvbnRleHQge09iamVjdH0gLSBBbiBvYmplY3Qgd2hpY2ggd2lsbCBiZSB0aGUgdmFsdWUgb2YgYHRoaXNgIGluc2lkZSBgY2FsbGJhY2tgXG4gICAqIEBzdW1tYXJ5IE1hcCBgY2FsbGJhY2tgIG92ZXIgYWxsIG1hdGNoaW5nIGRvY3VtZW50cy4gUmV0dXJucyBhbiBBcnJheS5cbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgbWFwKGNhbGxiYWNrLCBjb250ZXh0ID0ge30pIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbbWFwKCldJyk7XG4gICAgcmV0dXJuIHRoaXMuY3Vyc29yLm1hcChjYWxsYmFjaywgY29udGV4dCk7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIGN1cnJlbnRcbiAgICogQHN1bW1hcnkgUmV0dXJucyBjdXJyZW50IGl0ZW0gb24gQ3Vyc29yLCBpZiBhdmFpbGFibGVcbiAgICogQHJldHVybnMge09iamVjdHx1bmRlZmluZWR9XG4gICAqL1xuICBjdXJyZW50KCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtjdXJyZW50KCldJyk7XG4gICAgaWYgKHRoaXMuX2N1cnJlbnQgPCAwKSB7XG4gICAgICB0aGlzLl9jdXJyZW50ID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZmV0Y2goKVt0aGlzLl9jdXJyZW50XTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgb2JzZXJ2ZVxuICAgKiBAcGFyYW0gY2FsbGJhY2tzIHtPYmplY3R9IC0gRnVuY3Rpb25zIHRvIGNhbGwgdG8gZGVsaXZlciB0aGUgcmVzdWx0IHNldCBhcyBpdCBjaGFuZ2VzXG4gICAqIEBzdW1tYXJ5IFdhdGNoIGEgcXVlcnkuIFJlY2VpdmUgY2FsbGJhY2tzIGFzIHRoZSByZXN1bHQgc2V0IGNoYW5nZXMuXG4gICAqIEB1cmwgaHR0cDovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNNb25nby1DdXJzb3Itb2JzZXJ2ZVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIGxpdmUgcXVlcnkgaGFuZGxlXG4gICAqL1xuICBvYnNlcnZlKGNhbGxiYWNrcykge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtvYnNlcnZlKCldJyk7XG4gICAgcmV0dXJuIHRoaXMuY3Vyc29yLm9ic2VydmUoY2FsbGJhY2tzKTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgb2JzZXJ2ZUNoYW5nZXNcbiAgICogQHBhcmFtIGNhbGxiYWNrcyB7T2JqZWN0fSAtIEZ1bmN0aW9ucyB0byBjYWxsIHRvIGRlbGl2ZXIgdGhlIHJlc3VsdCBzZXQgYXMgaXQgY2hhbmdlc1xuICAgKiBAc3VtbWFyeSBXYXRjaCBhIHF1ZXJ5LiBSZWNlaXZlIGNhbGxiYWNrcyBhcyB0aGUgcmVzdWx0IHNldCBjaGFuZ2VzLiBPbmx5IHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIHRoZSBvbGQgYW5kIG5ldyBkb2N1bWVudHMgYXJlIHBhc3NlZCB0byB0aGUgY2FsbGJhY2tzLlxuICAgKiBAdXJsIGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjTW9uZ28tQ3Vyc29yLW9ic2VydmVDaGFuZ2VzXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IC0gbGl2ZSBxdWVyeSBoYW5kbGVcbiAgICovXG4gIG9ic2VydmVDaGFuZ2VzKGNhbGxiYWNrcykge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtvYnNlcnZlQ2hhbmdlcygpXScpO1xuICAgIHJldHVybiB0aGlzLmN1cnNvci5vYnNlcnZlQ2hhbmdlcyhjYWxsYmFja3MpO1xuICB9XG59XG4iLCJpbXBvcnQgeyBfIH0gICAgIGZyb20gJ21ldGVvci91bmRlcnNjb3JlJztcbmltcG9ydCB7IGNoZWNrIH0gZnJvbSAnbWV0ZW9yL2NoZWNrJztcblxuLypcbiAqIEBjb25zdCB7RnVuY3Rpb259IGZpeEpTT05QYXJzZSAtIEZpeCBpc3N1ZSB3aXRoIERhdGUgcGFyc2VcbiAqL1xuY29uc3QgZml4SlNPTlBhcnNlID0gZnVuY3Rpb24ob2JqKSB7XG4gIGZvciAobGV0IGtleSBpbiBvYmopIHtcbiAgICBpZiAoXy5pc1N0cmluZyhvYmpba2V5XSkgJiYgISF+b2JqW2tleV0uaW5kZXhPZignPS0tSlNPTi1EQVRFLS09JykpIHtcbiAgICAgIG9ialtrZXldID0gb2JqW2tleV0ucmVwbGFjZSgnPS0tSlNPTi1EQVRFLS09JywgJycpO1xuICAgICAgb2JqW2tleV0gPSBuZXcgRGF0ZShwYXJzZUludChvYmpba2V5XSkpO1xuICAgIH0gZWxzZSBpZiAoXy5pc09iamVjdChvYmpba2V5XSkpIHtcbiAgICAgIG9ialtrZXldID0gZml4SlNPTlBhcnNlKG9ialtrZXldKTtcbiAgICB9IGVsc2UgaWYgKF8uaXNBcnJheShvYmpba2V5XSkpIHtcbiAgICAgIGxldCB2O1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvYmpba2V5XS5sZW5ndGg7IGkrKykge1xuICAgICAgICB2ID0gb2JqW2tleV1baV07XG4gICAgICAgIGlmIChfLmlzT2JqZWN0KHYpKSB7XG4gICAgICAgICAgb2JqW2tleV1baV0gPSBmaXhKU09OUGFyc2Uodik7XG4gICAgICAgIH0gZWxzZSBpZiAoXy5pc1N0cmluZyh2KSAmJiAhIX52LmluZGV4T2YoJz0tLUpTT04tREFURS0tPScpKSB7XG4gICAgICAgICAgdiA9IHYucmVwbGFjZSgnPS0tSlNPTi1EQVRFLS09JywgJycpO1xuICAgICAgICAgIG9ialtrZXldW2ldID0gbmV3IERhdGUocGFyc2VJbnQodikpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBvYmo7XG59O1xuXG4vKlxuICogQGNvbnN0IHtGdW5jdGlvbn0gZml4SlNPTlN0cmluZ2lmeSAtIEZpeCBpc3N1ZSB3aXRoIERhdGUgc3RyaW5naWZ5XG4gKi9cbmNvbnN0IGZpeEpTT05TdHJpbmdpZnkgPSBmdW5jdGlvbihvYmopIHtcbiAgZm9yIChsZXQga2V5IGluIG9iaikge1xuICAgIGlmIChfLmlzRGF0ZShvYmpba2V5XSkpIHtcbiAgICAgIG9ialtrZXldID0gYD0tLUpTT04tREFURS0tPSR7K29ialtrZXldfWA7XG4gICAgfSBlbHNlIGlmIChfLmlzT2JqZWN0KG9ialtrZXldKSkge1xuICAgICAgb2JqW2tleV0gPSBmaXhKU09OU3RyaW5naWZ5KG9ialtrZXldKTtcbiAgICB9IGVsc2UgaWYgKF8uaXNBcnJheShvYmpba2V5XSkpIHtcbiAgICAgIGxldCB2O1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvYmpba2V5XS5sZW5ndGg7IGkrKykge1xuICAgICAgICB2ID0gb2JqW2tleV1baV07XG4gICAgICAgIGlmIChfLmlzT2JqZWN0KHYpKSB7XG4gICAgICAgICAgb2JqW2tleV1baV0gPSBmaXhKU09OU3RyaW5naWZ5KHYpO1xuICAgICAgICB9IGVsc2UgaWYgKF8uaXNEYXRlKHYpKSB7XG4gICAgICAgICAgb2JqW2tleV1baV0gPSBgPS0tSlNPTi1EQVRFLS09JHsrdn1gO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBvYmo7XG59O1xuXG4vKlxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAcHJpdmF0ZVxuICogQG5hbWUgZm9ybWF0RmxlVVJMXG4gKiBAcGFyYW0ge09iamVjdH0gZmlsZVJlZiAtIEZpbGUgcmVmZXJlbmNlIG9iamVjdFxuICogQHBhcmFtIHtTdHJpbmd9IHZlcnNpb24gLSBbT3B0aW9uYWxdIFZlcnNpb24gb2YgZmlsZSB5b3Ugd291bGQgbGlrZSBidWlsZCBVUkwgZm9yXG4gKiBAc3VtbWFyeSBSZXR1cm5zIGZvcm1hdHRlZCBVUkwgZm9yIGZpbGVcbiAqIEByZXR1cm5zIHtTdHJpbmd9IERvd25sb2FkYWJsZSBsaW5rXG4gKi9cbmNvbnN0IGZvcm1hdEZsZVVSTCA9IChmaWxlUmVmLCB2ZXJzaW9uID0gJ29yaWdpbmFsJykgPT4ge1xuICBsZXQgZXh0O1xuICBjaGVjayhmaWxlUmVmLCBPYmplY3QpO1xuICBjaGVjayh2ZXJzaW9uLCBTdHJpbmcpO1xuXG4gIGNvbnN0IF9yb290ID0gX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTC5yZXBsYWNlKC9cXC8rJC8sICcnKTtcbiAgY29uc3QgdlJlZiA9ICgoZmlsZVJlZi52ZXJzaW9ucyAmJiBmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dKSB8fCBmaWxlUmVmKTtcblxuICBpZiAoXy5oYXModlJlZiwgJ2V4dGVuc2lvbicpKSB7XG4gICAgZXh0ID0gYC4ke3ZSZWYuZXh0ZW5zaW9uLnJlcGxhY2UoL15cXC4vLCAnJyl9YDtcbiAgfSBlbHNlIHtcbiAgICBleHQgPSAnJztcbiAgfVxuXG4gIGlmIChmaWxlUmVmLnB1YmxpYyA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBfcm9vdCArICh2ZXJzaW9uID09PSAnb3JpZ2luYWwnID8gYCR7ZmlsZVJlZi5fZG93bmxvYWRSb3V0ZX0vJHtmaWxlUmVmLl9pZH0ke2V4dH1gIDogYCR7ZmlsZVJlZi5fZG93bmxvYWRSb3V0ZX0vJHt2ZXJzaW9ufS0ke2ZpbGVSZWYuX2lkfSR7ZXh0fWApO1xuICB9XG4gIHJldHVybiBfcm9vdCArIGAke2ZpbGVSZWYuX2Rvd25sb2FkUm91dGV9LyR7ZmlsZVJlZi5fY29sbGVjdGlvbk5hbWV9LyR7ZmlsZVJlZi5faWR9LyR7dmVyc2lvbn0vJHtmaWxlUmVmLl9pZH0ke2V4dH1gO1xufTtcblxuZXhwb3J0IHsgZml4SlNPTlBhcnNlLCBmaXhKU09OU3RyaW5naWZ5LCBmb3JtYXRGbGVVUkwgfTtcbiIsImltcG9ydCBmcyAgICAgICAgIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7IF8gfSAgICAgIGZyb20gJ21ldGVvci91bmRlcnNjb3JlJztcbmltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuY29uc3QgTk9PUCA9ICgpID0+IHt9O1xuXG4vKlxuICogQGNvbnN0IHtPYmplY3R9IGJvdW5kICAgLSBNZXRlb3IuYmluZEVudmlyb25tZW50IChGaWJlciB3cmFwcGVyKVxuICogQGNvbnN0IHtPYmplY3R9IGZkQ2FjaGUgLSBGaWxlIERlc2NyaXB0b3JzIENhY2hlXG4gKi9cbmNvbnN0IGJvdW5kICAgPSBNZXRlb3IuYmluZEVudmlyb25tZW50KGNhbGxiYWNrID0+IGNhbGxiYWNrKCkpO1xuY29uc3QgZmRDYWNoZSA9IHt9O1xuXG4vKlxuICogQHByaXZhdGVcbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEBjbGFzcyBXcml0ZVN0cmVhbVxuICogQHBhcmFtIHBhdGggICAgICB7U3RyaW5nfSAtIFBhdGggdG8gZmlsZSBvbiBGU1xuICogQHBhcmFtIG1heExlbmd0aCB7TnVtYmVyfSAtIE1heCBhbW91bnQgb2YgY2h1bmtzIGluIHN0cmVhbVxuICogQHBhcmFtIGZpbGUgICAgICB7T2JqZWN0fSAtIGZpbGVSZWYgT2JqZWN0XG4gKiBAc3VtbWFyeSB3cml0YWJsZVN0cmVhbSB3cmFwcGVyIGNsYXNzLCBtYWtlcyBzdXJlIGNodW5rcyBpcyB3cml0dGVuIGluIGdpdmVuIG9yZGVyLiBJbXBsZW1lbnRhdGlvbiBvZiBxdWV1ZSBzdHJlYW0uXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFdyaXRlU3RyZWFtIHtcbiAgY29uc3RydWN0b3IocGF0aCwgbWF4TGVuZ3RoLCBmaWxlLCBwZXJtaXNzaW9ucykge1xuICAgIHRoaXMucGF0aCA9IHBhdGg7XG4gICAgdGhpcy5tYXhMZW5ndGggPSBtYXhMZW5ndGg7XG4gICAgdGhpcy5maWxlID0gZmlsZTtcbiAgICB0aGlzLnBlcm1pc3Npb25zID0gcGVybWlzc2lvbnM7XG4gICAgaWYgKCF0aGlzLnBhdGggfHwgIV8uaXNTdHJpbmcodGhpcy5wYXRoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuZmQgICAgICAgICAgICA9IG51bGw7XG4gICAgdGhpcy53cml0dGVuQ2h1bmtzID0gMDtcbiAgICB0aGlzLmVuZGVkICAgICAgICAgPSBmYWxzZTtcbiAgICB0aGlzLmFib3J0ZWQgICAgICAgPSBmYWxzZTtcblxuICAgIGlmIChmZENhY2hlW3RoaXMucGF0aF0gJiYgIWZkQ2FjaGVbdGhpcy5wYXRoXS5lbmRlZCAmJiAhZmRDYWNoZVt0aGlzLnBhdGhdLmFib3J0ZWQpIHtcbiAgICAgIHRoaXMuZmQgPSBmZENhY2hlW3RoaXMucGF0aF0uZmQ7XG4gICAgICB0aGlzLndyaXR0ZW5DaHVua3MgPSBmZENhY2hlW3RoaXMucGF0aF0ud3JpdHRlbkNodW5rcztcbiAgICB9IGVsc2Uge1xuICAgICAgZnMuZW5zdXJlRmlsZSh0aGlzLnBhdGgsIChlZkVycm9yKSA9PiB7XG4gICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICBpZiAoZWZFcnJvcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig1MDAsICdbRmlsZXNDb2xsZWN0aW9uXSBbd3JpdGVTdHJlYW1dIFtlbnN1cmVGaWxlXSBbRXJyb3I6XScsIGVmRXJyb3IpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcy5vcGVuKHRoaXMucGF0aCwgJ3IrJywgdGhpcy5wZXJtaXNzaW9ucywgKG9FcnJvciwgZmQpID0+IHtcbiAgICAgICAgICAgICAgYm91bmQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChvRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNTAwLCAnW0ZpbGVzQ29sbGVjdGlvbl0gW3dyaXRlU3RyZWFtXSBbZW5zdXJlRmlsZV0gW29wZW5dIFtFcnJvcjpdJywgb0Vycm9yKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgdGhpcy5mZCA9IGZkO1xuICAgICAgICAgICAgICAgICAgZmRDYWNoZVt0aGlzLnBhdGhdID0gdGhpcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qXG4gICAqIEBtZW1iZXJPZiB3cml0ZVN0cmVhbVxuICAgKiBAbmFtZSB3cml0ZVxuICAgKiBAcGFyYW0ge051bWJlcn0gbnVtIC0gQ2h1bmsgcG9zaXRpb24gaW4gYSBzdHJlYW1cbiAgICogQHBhcmFtIHtCdWZmZXJ9IGNodW5rIC0gQnVmZmVyIChjaHVuayBiaW5hcnkgZGF0YSlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFja1xuICAgKiBAc3VtbWFyeSBXcml0ZSBjaHVuayBpbiBnaXZlbiBvcmRlclxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gLSBUcnVlIGlmIGNodW5rIGlzIHNlbnQgdG8gc3RyZWFtLCBmYWxzZSBpZiBjaHVuayBpcyBzZXQgaW50byBxdWV1ZVxuICAgKi9cbiAgd3JpdGUobnVtLCBjaHVuaywgY2FsbGJhY2spIHtcbiAgICBpZiAoIXRoaXMuYWJvcnRlZCAmJiAhdGhpcy5lbmRlZCkge1xuICAgICAgaWYgKHRoaXMuZmQpIHtcbiAgICAgICAgZnMud3JpdGUodGhpcy5mZCwgY2h1bmssIDAsIGNodW5rLmxlbmd0aCwgKG51bSAtIDEpICogdGhpcy5maWxlLmNodW5rU2l6ZSwgKGVycm9yLCB3cml0dGVuLCBidWZmZXIpID0+IHtcbiAgICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhlcnJvciwgd3JpdHRlbiwgYnVmZmVyKTtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tGaWxlc0NvbGxlY3Rpb25dIFt3cml0ZVN0cmVhbV0gW3dyaXRlXSBbRXJyb3I6XScsIGVycm9yKTtcbiAgICAgICAgICAgICAgdGhpcy5hYm9ydCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgKyt0aGlzLndyaXR0ZW5DaHVua3M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgTWV0ZW9yLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMud3JpdGUobnVtLCBjaHVuaywgY2FsbGJhY2spO1xuICAgICAgICB9LCAyNSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qXG4gICAqIEBtZW1iZXJPZiB3cml0ZVN0cmVhbVxuICAgKiBAbmFtZSBlbmRcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFja1xuICAgKiBAc3VtbWFyeSBGaW5pc2hlcyB3cml0aW5nIHRvIHdyaXRhYmxlU3RyZWFtLCBvbmx5IGFmdGVyIGFsbCBjaHVua3MgaW4gcXVldWUgaXMgd3JpdHRlblxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gLSBUcnVlIGlmIHN0cmVhbSBpcyBmdWxmaWxsZWQsIGZhbHNlIGlmIHF1ZXVlIGlzIGluIHByb2dyZXNzXG4gICAqL1xuICBlbmQoY2FsbGJhY2spIHtcbiAgICBpZiAoIXRoaXMuYWJvcnRlZCAmJiAhdGhpcy5lbmRlZCkge1xuICAgICAgaWYgKHRoaXMud3JpdHRlbkNodW5rcyA9PT0gdGhpcy5tYXhMZW5ndGgpIHtcbiAgICAgICAgZnMuY2xvc2UodGhpcy5mZCwgKCkgPT4ge1xuICAgICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAgIGRlbGV0ZSBmZENhY2hlW3RoaXMucGF0aF07XG4gICAgICAgICAgICB0aGlzLmVuZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKHZvaWQgMCwgdHJ1ZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgZnMuc3RhdCh0aGlzLnBhdGgsIChlcnJvciwgc3RhdCkgPT4ge1xuICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgaWYgKCFlcnJvciAmJiBzdGF0KSB7XG4gICAgICAgICAgICB0aGlzLndyaXR0ZW5DaHVua3MgPSBNYXRoLmNlaWwoc3RhdC5zaXplIC8gdGhpcy5maWxlLmNodW5rU2l6ZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIE1ldGVvci5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZW5kKGNhbGxiYWNrKTtcbiAgICAgICAgICB9LCAyNSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKHZvaWQgMCwgdGhpcy5lbmRlZCk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qXG4gICAqIEBtZW1iZXJPZiB3cml0ZVN0cmVhbVxuICAgKiBAbmFtZSBhYm9ydFxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrXG4gICAqIEBzdW1tYXJ5IEFib3J0cyB3cml0aW5nIHRvIHdyaXRhYmxlU3RyZWFtLCByZW1vdmVzIGNyZWF0ZWQgZmlsZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gLSBUcnVlXG4gICAqL1xuICBhYm9ydChjYWxsYmFjaykge1xuICAgIHRoaXMuYWJvcnRlZCA9IHRydWU7XG4gICAgZGVsZXRlIGZkQ2FjaGVbdGhpcy5wYXRoXTtcbiAgICBmcy51bmxpbmsodGhpcy5wYXRoLCAoY2FsbGJhY2sgfHwgTk9PUCkpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLypcbiAgICogQG1lbWJlck9mIHdyaXRlU3RyZWFtXG4gICAqIEBuYW1lIHN0b3BcbiAgICogQHN1bW1hcnkgU3RvcCB3cml0aW5nIHRvIHdyaXRhYmxlU3RyZWFtXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSAtIFRydWVcbiAgICovXG4gIHN0b3AoKSB7XG4gICAgdGhpcy5hYm9ydGVkID0gdHJ1ZTtcbiAgICBkZWxldGUgZmRDYWNoZVt0aGlzLnBhdGhdO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59XG4iXX0=
