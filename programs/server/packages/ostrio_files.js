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
var check = Package.check.check;
var Match = Package.check.Match;
var Random = Package.random.Random;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var debug, schema, public, strict, chunkSize, protected, collection, permissions, cacheControl, downloadRoute, onAfterUpload, onAfterRemove, disableUpload, onBeforeRemove, integrityCheck, collectionName, onBeforeUpload, namingFunction, responseHeaders, disableDownload, allowClientCode, downloadCallback, onInitiateUpload, interceptDownload, continueUploadTTL, parentDirPermissions, _preCollection, _preCollectionName, FilesCollection;

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
let Mongo;
module.watch(require("meteor/mongo"), {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let WebApp;
module.watch(require("meteor/webapp"), {
  WebApp(v) {
    WebApp = v;
  }

}, 1);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 2);
let Random;
module.watch(require("meteor/random"), {
  Random(v) {
    Random = v;
  }

}, 3);
let Cookies;
module.watch(require("meteor/ostrio:cookies"), {
  Cookies(v) {
    Cookies = v;
  }

}, 4);
let WriteStream;
module.watch(require("./write-stream.js"), {
  default(v) {
    WriteStream = v;
  }

}, 5);
let check, Match;
module.watch(require("meteor/check"), {
  check(v) {
    check = v;
  },

  Match(v) {
    Match = v;
  }

}, 6);
let FilesCollectionCore;
module.watch(require("./core.js"), {
  default(v) {
    FilesCollectionCore = v;
  }

}, 7);
let fixJSONParse, fixJSONStringify, helpers;
module.watch(require("./lib.js"), {
  fixJSONParse(v) {
    fixJSONParse = v;
  },

  fixJSONStringify(v) {
    fixJSONStringify = v;
  },

  helpers(v) {
    helpers = v;
  }

}, 8);
let fs;
module.watch(require("fs-extra"), {
  default(v) {
    fs = v;
  }

}, 9);
let nodeQs;
module.watch(require("querystring"), {
  default(v) {
    nodeQs = v;
  }

}, 10);
let request;
module.watch(require("request"), {
  default(v) {
    request = v;
  }

}, 11);
let fileType;
module.watch(require("file-type"), {
  default(v) {
    fileType = v;
  }

}, 12);
let nodePath;
module.watch(require("path"), {
  default(v) {
    nodePath = v;
  }

}, 13);

/*
 * @const {Object} bound  - Meteor.bindEnvironment (Fiber wrapper)
 * @const {Function} NOOP - No Operation function, placeholder for required callbacks
 */
const bound = Meteor.bindEnvironment(callback => callback());

const NOOP = () => {};
/*
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
 * @param config._preCollection  {Mongo.Collection} - [Server] Mongo preCollection Instance
 * @param config._preCollectionName {String}  - [Server]  preCollection name
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
        parentDirPermissions: this.parentDirPermissions,
        _preCollection: this._preCollection,
        _preCollectionName: this._preCollectionName
      } = config);
    }

    const self = this;
    new Cookies();

    if (!helpers.isBoolean(this.debug)) {
      this.debug = false;
    }

    if (!helpers.isBoolean(this.public)) {
      this.public = false;
    }

    if (!this.protected) {
      this.protected = false;
    }

    if (!this.chunkSize) {
      this.chunkSize = 1024 * 512;
    }

    this.chunkSize = Math.floor(this.chunkSize / 8) * 8;

    if (!helpers.isString(this.collectionName) && !this.collection) {
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
      throw new Meteor.Error(500, `[FilesCollection.${this.collectionName}]: "downloadRoute" must be precisely provided on "public" collections! Note: "downloadRoute" must be equal or be inside of your web/proxy-server (relative) root.`);
    }

    if (!helpers.isString(this.downloadRoute)) {
      this.downloadRoute = '/cdn/storage';
    }

    this.downloadRoute = this.downloadRoute.replace(/\/$/, '');

    if (!helpers.isFunction(this.namingFunction)) {
      this.namingFunction = false;
    }

    if (!helpers.isFunction(this.onBeforeUpload)) {
      this.onBeforeUpload = false;
    }

    if (!helpers.isBoolean(this.allowClientCode)) {
      this.allowClientCode = true;
    }

    if (!helpers.isFunction(this.onInitiateUpload)) {
      this.onInitiateUpload = false;
    }

    if (!helpers.isFunction(this.interceptDownload)) {
      this.interceptDownload = false;
    }

    if (!helpers.isBoolean(this.strict)) {
      this.strict = true;
    }

    if (!helpers.isNumber(this.permissions)) {
      this.permissions = parseInt('644', 8);
    }

    if (!helpers.isNumber(this.parentDirPermissions)) {
      this.parentDirPermissions = parseInt('755', 8);
    }

    if (!helpers.isString(this.cacheControl)) {
      this.cacheControl = 'public, max-age=31536000, s-maxage=31536000';
    }

    if (!helpers.isFunction(this.onAfterUpload)) {
      this.onAfterUpload = false;
    }

    if (!helpers.isBoolean(this.disableUpload)) {
      this.disableUpload = false;
    }

    if (!helpers.isFunction(this.onAfterRemove)) {
      this.onAfterRemove = false;
    }

    if (!helpers.isFunction(this.onBeforeRemove)) {
      this.onBeforeRemove = false;
    }

    if (!helpers.isBoolean(this.integrityCheck)) {
      this.integrityCheck = true;
    }

    if (!helpers.isBoolean(this.disableDownload)) {
      this.disableDownload = false;
    }

    if (!helpers.isObject(this._currentUploads)) {
      this._currentUploads = {};
    }

    if (!helpers.isFunction(this.downloadCallback)) {
      this.downloadCallback = false;
    }

    if (!helpers.isNumber(this.continueUploadTTL)) {
      this.continueUploadTTL = 10800;
    }

    if (!helpers.isFunction(this.responseHeaders)) {
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
      throw new Meteor.Error(500, `[FilesCollection.${this.collectionName}] "storagePath" must be set on "public" collections! Note: "storagePath" must be equal on be inside of your web/proxy-server (absolute) root.`);
    }

    if (!storagePath) {
      storagePath = function () {
        return `assets${nodePath.sep}app${nodePath.sep}uploads${nodePath.sep}${self.collectionName}`;
      };
    }

    if (helpers.isString(storagePath)) {
      this.storagePath = () => storagePath;
    } else {
      this.storagePath = function () {
        let sp = storagePath.apply(self, arguments);

        if (!helpers.isString(sp)) {
          throw new Meteor.Error(400, `[FilesCollection.${self.collectionName}] "storagePath" function must return a String!`);
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
        throw new Meteor.Error(401, `[FilesCollection.${self.collectionName}] Path "${this.storagePath({})}" is not writable! ${error}`);
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
      if (!helpers.isString(this._preCollectionName) && !this._preCollection) {
        this._preCollectionName = `__pre_${this.collectionName}`;
      }

      if (!this._preCollection) {
        this._preCollection = new Mongo.Collection(this._preCollectionName);
      } else {
        this._preCollectionName = this._preCollection._name;
      }

      check(this._preCollectionName, String);

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

          if (helpers.isObject(self._currentUploads[doc._id])) {
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
      this.schema = FilesCollectionCore.schema;
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

        if (helpers.isFunction(this.protected)) {
          let fileRef;

          if (helpers.isObject(http.params) && http.params._id) {
            fileRef = this.collection.findOne(http.params._id);
          }

          result = http ? this.protected.call(Object.assign(http, {
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

        const rc = helpers.isNumber(result) ? result : 401;

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
    this._handleUploadSync = Meteor.wrapAsync(this._handleUpload.bind(this));

    if (this.disableUpload && this.disableDownload) {
      return;
    }

    WebApp.connectHandlers.use((httpReq, httpResp, next) => {
      if (!this.disableUpload && !!~httpReq._parsedUrl.path.indexOf(`${this.downloadRoute}/${this.collectionName}/__upload`)) {
        if (httpReq.method === 'POST') {
          const handleError = _error => {
            let error = _error;
            console.warn('[FilesCollection] [Upload] [HTTP] Exception:', error);
            console.trace();

            if (!httpResp.headersSent) {
              httpResp.writeHead(500);
            }

            if (!httpResp.finished) {
              if (helpers.isObject(error) && helpers.isFunction(error.toString)) {
                error = error.toString();
              }

              if (!helpers.isString(error)) {
                error = 'Unexpected error!';
              }

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

              if (httpReq.headers['x-mtok'] && helpers.isObject(Meteor.server.sessions) && helpers.has(Meteor.server.sessions[httpReq.headers['x-mtok']], 'userId')) {
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
                } = this._prepareUpload(Object.assign(opts, _continueUpload), user.userId, 'HTTP'));

                if (opts.eof) {
                  this._handleUpload(result, opts, _error => {
                    let error = _error;

                    if (error) {
                      if (!httpResp.headersSent) {
                        httpResp.writeHead(500);
                      }

                      if (!httpResp.finished) {
                        if (helpers.isObject(error) && helpers.isFunction(error.toString)) {
                          error = error.toString();
                        }

                        if (!helpers.isString(error)) {
                          error = 'Unexpected error!';
                        }

                        httpResp.end(JSON.stringify({
                          error
                        }));
                      }
                    }

                    if (!httpResp.headersSent) {
                      httpResp.writeHead(200);
                    }

                    if (helpers.isObject(result.file) && result.file.meta) {
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

                if (!helpers.isObject(opts.file)) {
                  opts.file = {};
                }

                opts.___s = true;

                this._debug(`[FilesCollection] [File Start HTTP] ${opts.file.name || '[no-name]'} - ${opts.fileId}`);

                if (helpers.isObject(opts.file) && opts.file.meta) {
                  opts.file.meta = fixJSONParse(opts.file.meta);
                }

                ({
                  result
                } = this._prepareUpload(helpers.clone(opts), user.userId, 'HTTP Start Method'));

                if (this.collection.findOne(result._id)) {
                  throw new Meteor.Error(400, 'Can\'t start upload, data substitution detected!');
                }

                opts._id = opts.fileId;
                opts.createdAt = new Date();
                opts.maxLength = opts.fileLength;

                this._preCollection.insert(helpers.omit(opts, '___s'));

                this._createStream(result._id, result.path, helpers.omit(opts, '___s'));

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

    if (!this.disableUpload) {
      const _methods = {}; // Method used to remove file
      // from Client side

      _methods[this._methodNames._Remove] = function (selector) {
        check(selector, Match.OneOf(String, Object));

        self._debug(`[FilesCollection] [Unlink Method] [.remove(${selector})]`);

        if (self.allowClientCode) {
          if (self.onBeforeRemove && helpers.isFunction(self.onBeforeRemove)) {
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
        } = self._prepareUpload(helpers.clone(opts), this.userId, 'DDP Start Method');

        if (self.collection.findOne(result._id)) {
          throw new Meteor.Error(400, 'Can\'t start upload, data substitution detected!');
        }

        opts._id = opts.fileId;
        opts.createdAt = new Date();
        opts.maxLength = opts.fileLength;

        try {
          self._preCollection.insert(helpers.omit(opts, '___s'));

          self._createStream(result._id, result.path, helpers.omit(opts, '___s'));
        } catch (e) {
          self._debug(`[FilesCollection] [File Start Method] [EXCEPTION:] ${opts.file.name} - ${opts.fileId}`, e);

          throw new Meteor.Error(500, 'Can\'t start');
        }

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


      _methods[this._methodNames._Write] = function (_opts) {
        let opts = _opts;
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
        } = self._prepareUpload(Object.assign(opts, _continueUpload), this.userId, 'DDP'));

        if (opts.eof) {
          try {
            return self._handleUploadSync(result, opts);
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

        self._debug(`[FilesCollection] [Abort Method]: ${_id} - ${helpers.isObject(_continueUpload.file) ? _continueUpload.file.path : ''}`);

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

          if (helpers.isObject(_continueUpload.file) && _continueUpload.file.path) {
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
  }
  /*
   * @locus Server
   * @memberOf FilesCollection
   * @name _prepareUpload
   * @summary Internal method. Used to optimize received data and check upload permission
   * @returns {Object}
   */


  _prepareUpload(opts = {}, userId, transport) {
    let ctx;

    if (!helpers.isBoolean(opts.eof)) {
      opts.eof = false;
    }

    if (!opts.binData) {
      opts.binData = 'EOF';
    }

    if (!helpers.isNumber(opts.chunkId)) {
      opts.chunkId = -1;
    }

    if (!helpers.isString(opts.FSName)) {
      opts.FSName = opts.fileId;
    }

    this._debug(`[FilesCollection] [Upload] [${transport}] Got #${opts.chunkId}/${opts.fileLength} chunks, dst: ${opts.file.name || opts.file.fileName}`);

    const fileName = this._getFileName(opts.file);

    const {
      extension,
      extensionWithDot
    } = this._getExt(fileName);

    if (!helpers.isObject(opts.file.meta)) {
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
    result = Object.assign(result, this._dataToSchema(result));

    if (this.onBeforeUpload && helpers.isFunction(this.onBeforeUpload)) {
      ctx = Object.assign({
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
        throw new Meteor.Error(403, helpers.isString(isUploadAllowed) ? isUploadAllowed : '@onBeforeUpload() returned false');
      } else {
        if (opts.___s === true && this.onInitiateUpload && helpers.isFunction(this.onInitiateUpload)) {
          this.onInitiateUpload.call(ctx, result);
        }
      }
    } else if (opts.___s === true && this.onInitiateUpload && helpers.isFunction(this.onInitiateUpload)) {
      ctx = Object.assign({
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
  }
  /*
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

    this.collection.insert(helpers.clone(result), (colInsert, _id) => {
      if (colInsert) {
        cb && cb(colInsert);

        this._debug('[FilesCollection] [Upload] [_finishUpload] [insert] Error:', colInsert);
      } else {
        this._preCollection.update({
          _id: opts.fileId
        }, {
          $set: {
            isFinished: true
          }
        }, preUpdateError => {
          if (preUpdateError) {
            cb && cb(preUpdateError);

            this._debug('[FilesCollection] [Upload] [_finishUpload] [update] Error:', preUpdateError);
          } else {
            result._id = _id;

            this._debug(`[FilesCollection] [Upload] [finish(ed)Upload] -> ${result.path}`);

            this.onAfterUpload && this.onAfterUpload.call(this, result);
            this.emit('afterUpload', result);
            cb && cb(null, result);
          }
        });
      }
    });
  }
  /*
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
  }
  /*
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

    if (helpers.isObject(fileData) && fileData.type) {
      mime = fileData.type;
    }

    if (fileData.path && (!mime || !helpers.isString(mime))) {
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

    if (!mime || !helpers.isString(mime)) {
      mime = 'application/octet-stream';
    }

    return mime;
  }
  /*
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
        const userId = helpers.isObject(Meteor.server.sessions) && helpers.isObject(Meteor.server.sessions[mtok]) ? Meteor.server.sessions[mtok].userId : void 0;

        if (userId) {
          result.user = () => Meteor.users.findOne(userId);

          result.userId = userId;
        }
      }
    }

    return result;
  }
  /*
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


  write(buffer, _opts = {}, _callback, _proceedAfterUpload) {
    this._debug('[FilesCollection] [write()]');

    let opts = _opts;
    let callback = _callback;
    let proceedAfterUpload = _proceedAfterUpload;

    if (helpers.isFunction(opts)) {
      proceedAfterUpload = callback;
      callback = opts;
      opts = {};
    } else if (helpers.isBoolean(callback)) {
      proceedAfterUpload = callback;
    } else if (helpers.isBoolean(opts)) {
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

    if (!helpers.isObject(opts.meta)) {
      opts.meta = {};
    }

    if (!helpers.isNumber(opts.size)) {
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
  }
  /*
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


  load(url, _opts = {}, _callback, _proceedAfterUpload) {
    this._debug(`[FilesCollection] [load(${url}, ${JSON.stringify(_opts)}, callback)]`);

    let opts = _opts;
    let callback = _callback;
    let proceedAfterUpload = _proceedAfterUpload;

    if (helpers.isFunction(opts)) {
      proceedAfterUpload = callback;
      callback = opts;
      opts = {};
    } else if (helpers.isBoolean(callback)) {
      proceedAfterUpload = callback;
    } else if (helpers.isBoolean(opts)) {
      proceedAfterUpload = opts;
    }

    check(url, String);
    check(opts, Match.Optional(Object));
    check(callback, Match.Optional(Function));
    check(proceedAfterUpload, Match.Optional(Boolean));

    if (!helpers.isObject(opts)) {
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
  }
  /*
   * @locus Server
   * @memberOf FilesCollection
   * @name addFile
   * @param {String} path          - Path to file
   * @param {String} opts          - [Optional] Object with file-data
   * @param {String} opts.type     - [Optional] File mime-type
   * @param {Object} opts.meta     - [Optional] File additional meta-data
   * @param {String} opts.fileId   - _id, default *null*
   * @param {Object} opts.fileName - [Optional] File name, if not specified file name and extension will be taken from path
   * @param {String} opts.userId   - [Optional] UserId, default *null*
   * @param {Function} callback    - [Optional] function(error, fileObj){...}
   * @param {Boolean} proceedAfterUpload - Proceed onAfterUpload hook
   * @summary Add file from FS to FilesCollection
   * @returns {FilesCollection} Instance
   */


  addFile(path, _opts = {}, _callback, _proceedAfterUpload) {
    this._debug(`[FilesCollection] [addFile(${path})]`);

    let opts = _opts;
    let callback = _callback;
    let proceedAfterUpload = _proceedAfterUpload;

    if (helpers.isFunction(opts)) {
      proceedAfterUpload = callback;
      callback = opts;
      opts = {};
    } else if (helpers.isBoolean(callback)) {
      proceedAfterUpload = callback;
    } else if (helpers.isBoolean(opts)) {
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
        if (!helpers.isObject(opts)) {
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

        if (!helpers.isString(opts.type)) {
          opts.type = this._getMimeType(opts);
        }

        if (!helpers.isObject(opts.meta)) {
          opts.meta = {};
        }

        if (!helpers.isNumber(opts.size)) {
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
  }
  /*
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
  }
  /*
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
  }
  /*
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
  }
  /*
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
  }
  /*
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
  }
  /*
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
      if (helpers.isObject(fileRef.versions) && helpers.isObject(fileRef.versions[version]) && fileRef.versions[version].path) {
        fs.unlink(fileRef.versions[version].path, callback || NOOP);
      }
    } else {
      if (helpers.isObject(fileRef.versions)) {
        for (let vKey in fileRef.versions) {
          if (fileRef.versions[vKey] && fileRef.versions[vKey].path) {
            fs.unlink(fileRef.versions[vKey].path, callback || NOOP);
          }
        }
      } else {
        fs.unlink(fileRef.path, callback || NOOP);
      }
    }

    return this;
  }
  /*
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
  }
  /*
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
      if (helpers.has(fileRef, 'versions') && helpers.has(fileRef.versions, version)) {
        vRef = fileRef.versions[version];
        vRef._id = fileRef._id;
      } else {
        vRef = fileRef;
      }
    } else {
      vRef = false;
    }

    if (!vRef || !helpers.isObject(vRef)) {
      return this._404(http);
    } else if (fileRef) {
      if (this.downloadCallback) {
        if (!this.downloadCallback.call(Object.assign(http, this._getUser(http)), fileRef)) {
          return this._404(http);
        }
      }

      if (this.interceptDownload && helpers.isFunction(this.interceptDownload)) {
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
  }
  /*
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


  serve(http, fileRef, vRef, version = 'original', readableStream = null, _responseType = '200', force200 = false) {
    let partiral = false;
    let reqRange = false;
    let dispositionType = '';
    let start;
    let end;
    let take;
    let responseType = _responseType;

    if (http.params.query.download && http.params.query.download === 'true') {
      dispositionType = 'attachment; ';
    } else {
      dispositionType = 'inline; ';
    }

    const dispositionName = `filename=\"${encodeURI(vRef.name || fileRef.name).replace(/\,/g, '%2C')}\"; filename*=UTF-8''${encodeURIComponent(vRef.name || fileRef.name)}; `;
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

    const headers = helpers.isFunction(this.responseHeaders) ? this.responseHeaders(responseType, fileRef, vRef, version) : this.responseHeaders;

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

    const respond = (stream, code) => {
      if (!http.response.headersSent && readableStream) {
        http.response.writeHead(code);
      }

      http.response.on('close', () => {
        if (typeof stream.abort === 'function') {
          stream.abort();
        }

        if (typeof stream.end === 'function') {
          stream.end();
        }
      });
      http.request.on('aborted', () => {
        http.request.aborted = true;

        if (typeof stream.abort === 'function') {
          stream.abort();
        }

        if (typeof stream.end === 'function') {
          stream.end();
        }
      });
      stream.on('open', () => {
        if (!http.response.headersSent) {
          http.response.writeHead(code);
        }
      }).on('abort', () => {
        if (!http.response.finished) {
          http.response.end();
        }

        if (!http.request.aborted) {
          http.request.destroy();
        }
      }).on('error', streamErrorHandler).on('end', () => {
        if (!http.response.finished) {
          http.response.end();
        }
      }).pipe(http.response);
    };

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

        respond(readableStream || fs.createReadStream(vRef.path, {
          start: reqRange.start,
          end: reqRange.end
        }), 206);
        break;

      default:
        this._debug(`[FilesCollection] [serve(${vRef.path}, ${version})] [200]`);

        respond(readableStream || fs.createReadStream(vRef.path), 200);
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
let EventEmitter;
module.watch(require("eventemitter3"), {
  EventEmitter(v) {
    EventEmitter = v;
  }

}, 0);
let check, Match;
module.watch(require("meteor/check"), {
  check(v) {
    check = v;
  },

  Match(v) {
    Match = v;
  }

}, 1);
let formatFleURL, helpers;
module.watch(require("./lib.js"), {
  formatFleURL(v) {
    formatFleURL = v;
  },

  helpers(v) {
    helpers = v;
  }

}, 2);
let FilesCursor, FileCursor;
module.watch(require("./cursor.js"), {
  FilesCursor(v) {
    FilesCursor = v;
  },

  FileCursor(v) {
    FileCursor = v;
  }

}, 3);

class FilesCollectionCore extends EventEmitter {
  constructor() {
    super();
  }

  /*
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
  }
  /*
   * @locus Anywhere
   * @memberOf FilesCollectionCore
   * @name _getFileName
   * @param {Object} fileData - File Object
   * @summary Returns file's name
   * @returns {String}
   */


  _getFileName(fileData) {
    const fileName = fileData.name || fileData.fileName;

    if (helpers.isString(fileName) && fileName.length > 0) {
      return (fileData.name || fileData.fileName).replace(/^\.\.+/, '').replace(/\.{2,}/g, '.').replace(/\//g, '');
    }

    return '';
  }
  /*
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
  }
  /*
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
  }
  /*
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
      ext: data.extension,
      extensionWithDot: '.' + data.extension,
      path: data.path,
      meta: data.meta,
      type: data.type,
      mime: data.type,
      'mime-type': data.type,
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

    ds._storagePath = data._storagePath || this.storagePath(Object.assign({}, data, ds));
    return ds;
  }
  /*
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
  }
  /*
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
  }
  /*
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
  }
  /*
   * @locus Anywhere
   * @memberOf FilesCollectionCore
   * @name link
   * @param {Object} fileRef - File reference object
   * @param {String} version - Version of file you would like to request
   * @param {String} URIBase - [Optional] URI base, see - https://github.com/VeliovGroup/Meteor-Files/issues/626
   * @summary Returns downloadable URL
   * @returns {String} Empty string returned in case if file not found in DB
   */


  link(fileRef, version = 'original', URIBase) {
    this._debug(`[FilesCollection] [link(${helpers.isObject(fileRef) ? fileRef._id : undefined}, ${version})]`);

    check(fileRef, Object);

    if (!fileRef) {
      return '';
    }

    return formatFleURL(fileRef, version, URIBase);
  }

}

FilesCollectionCore.__helpers = helpers;
FilesCollectionCore.schema = {
  _id: {
    type: String
  },
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
  ext: {
    type: String,
    optional: true
  },
  extensionWithDot: {
    type: String,
    optional: true
  },
  mime: {
    type: String,
    optional: true
  },
  'mime-type': {
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
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);

class FileCursor {
  constructor(_fileRef, _collection) {
    this._fileRef = _fileRef;
    this._collection = _collection;
    Object.assign(this, _fileRef);
  }
  /*
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
  }
  /*
   * @locus Anywhere
   * @memberOf FileCursor
   * @name link
   * @param version {String} - Name of file's subversion
   * @param URIBase {String} - [Optional] URI base, see - https://github.com/VeliovGroup/Meteor-Files/issues/626
   * @summary Returns downloadable URL to File
   * @returns {String}
   */


  link(version = 'original', URIBase) {
    this._collection._debug(`[FilesCollection] [FileCursor] [link(${version})]`);

    if (this._fileRef) {
      return this._collection.link(this._fileRef, version, URIBase);
    }

    return '';
  }
  /*
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
  }
  /*
   * @locus Anywhere
   * @memberOf FileCursor
   * @name fetch
   * @summary Returns document as plain Object in Array
   * @returns {[Object]}
   */


  fetch() {
    this._collection._debug('[FilesCollection] [FileCursor] [fetch()]');

    return [this._fileRef];
  }
  /*
   * @locus Anywhere
   * @memberOf FileCursor
   * @name with
   * @summary Returns reactive version of current FileCursor, useful to use with `{{#with}}...{{/with}}` block template helper
   * @returns {[Object]}
   */


  with() {
    this._collection._debug('[FilesCollection] [FileCursor] [with()]');

    return Object.assign(this, this._collection.collection.findOne(this._fileRef._id));
  }

}

class FilesCursor {
  constructor(_selector = {}, options, _collection) {
    this._collection = _collection;
    this._selector = _selector;
    this._current = -1;
    this.cursor = this._collection.collection.find(this._selector, options);
  }
  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name get
   * @summary Returns all matching document(s) as an Array. Alias of `.fetch()`
   * @returns {[Object]}
   */


  get() {
    this._collection._debug('[FilesCollection] [FilesCursor] [get()]');

    return this.cursor.fetch();
  }
  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name hasNext
   * @summary Returns `true` if there is next item available on Cursor
   * @returns {Boolean}
   */


  hasNext() {
    this._collection._debug('[FilesCollection] [FilesCursor] [hasNext()]');

    return this._current < this.cursor.count() - 1;
  }
  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name next
   * @summary Returns next item on Cursor, if available
   * @returns {Object|undefined}
   */


  next() {
    this._collection._debug('[FilesCollection] [FilesCursor] [next()]');

    this.cursor.fetch()[++this._current];
  }
  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name hasPrevious
   * @summary Returns `true` if there is previous item available on Cursor
   * @returns {Boolean}
   */


  hasPrevious() {
    this._collection._debug('[FilesCollection] [FilesCursor] [hasPrevious()]');

    return this._current !== -1;
  }
  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name previous
   * @summary Returns previous item on Cursor, if available
   * @returns {Object|undefined}
   */


  previous() {
    this._collection._debug('[FilesCollection] [FilesCursor] [previous()]');

    this.cursor.fetch()[--this._current];
  }
  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name fetch
   * @summary Returns all matching document(s) as an Array.
   * @returns {[Object]}
   */


  fetch() {
    this._collection._debug('[FilesCollection] [FilesCursor] [fetch()]');

    return this.cursor.fetch() || [];
  }
  /*
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
  }
  /*
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
  }
  /*
   * @locus Anywhere
   * @memberOf FilesCursor
   * @name count
   * @summary Returns the number of documents that match a query
   * @returns {Number}
   */


  count() {
    this._collection._debug('[FilesCollection] [FilesCursor] [count()]');

    return this.cursor.count();
  }
  /*
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
  }
  /*
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
  }
  /*
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
  }
  /*
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
  }
  /*
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
  }
  /*
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
  }
  /*
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
  formatFleURL: () => formatFleURL,
  helpers: () => helpers
});
let check;
module.watch(require("meteor/check"), {
  check(v) {
    check = v;
  }

}, 0);
const helpers = {
  isUndefined(obj) {
    return obj === void 0;
  },

  isObject(obj) {
    if (this.isArray(obj) || this.isFunction(obj)) {
      return false;
    }

    return obj === Object(obj);
  },

  isArray(obj) {
    return Array.isArray(obj);
  },

  isBoolean(obj) {
    return obj === true || obj === false || Object.prototype.toString.call(obj) === '[object Boolean]';
  },

  isFunction(obj) {
    return typeof obj === 'function' || false;
  },

  isEmpty(obj) {
    if (this.isDate(obj)) {
      return false;
    }

    if (this.isObject(obj)) {
      return !Object.keys(obj).length;
    }

    if (this.isArray(obj) || this.isString(obj)) {
      return !obj.length;
    }

    return false;
  },

  clone(obj) {
    if (!this.isObject(obj)) return obj;
    return this.isArray(obj) ? obj.slice() : Object.assign({}, obj);
  },

  has(_obj, path) {
    let obj = _obj;

    if (!this.isObject(obj)) {
      return false;
    }

    if (!this.isArray(path)) {
      return this.isObject(obj) && Object.prototype.hasOwnProperty.call(obj, path);
    }

    const length = path.length;

    for (let i = 0; i < length; i++) {
      if (!Object.prototype.hasOwnProperty.call(obj, path[i])) {
        return false;
      }

      obj = obj[path[i]];
    }

    return !!length;
  },

  omit(obj, ...keys) {
    const clear = Object.assign({}, obj);

    for (let i = keys.length - 1; i >= 0; i--) {
      delete clear[keys[i]];
    }

    return clear;
  },

  now: Date.now,

  throttle(func, wait, options = {}) {
    let previous = 0;
    let timeout = null;
    let result;
    const that = this;
    let self;
    let args;

    const later = () => {
      previous = options.leading === false ? 0 : that.now();
      timeout = null;
      result = func.apply(self, args);

      if (!timeout) {
        self = args = null;
      }
    };

    const throttled = function () {
      const now = that.now();
      if (!previous && options.leading === false) previous = now;
      const remaining = wait - (now - previous);
      self = this;
      args = arguments;

      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }

        previous = now;
        result = func.apply(self, args);

        if (!timeout) {
          self = args = null;
        }
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }

      return result;
    };

    throttled.cancel = () => {
      clearTimeout(timeout);
      previous = 0;
      timeout = self = args = null;
    };

    return throttled;
  }

};
const _helpers = ['String', 'Number', 'Date'];

for (let i = 0; i < _helpers.length; i++) {
  helpers['is' + _helpers[i]] = function (obj) {
    return Object.prototype.toString.call(obj) === '[object ' + _helpers[i] + ']';
  };
}
/*
 * @const {Function} fixJSONParse - Fix issue with Date parse
 */


const fixJSONParse = function (obj) {
  for (let key in obj) {
    if (helpers.isString(obj[key]) && !!~obj[key].indexOf('=--JSON-DATE--=')) {
      obj[key] = obj[key].replace('=--JSON-DATE--=', '');
      obj[key] = new Date(parseInt(obj[key]));
    } else if (helpers.isObject(obj[key])) {
      obj[key] = fixJSONParse(obj[key]);
    } else if (helpers.isArray(obj[key])) {
      let v;

      for (let i = 0; i < obj[key].length; i++) {
        v = obj[key][i];

        if (helpers.isObject(v)) {
          obj[key][i] = fixJSONParse(v);
        } else if (helpers.isString(v) && !!~v.indexOf('=--JSON-DATE--=')) {
          v = v.replace('=--JSON-DATE--=', '');
          obj[key][i] = new Date(parseInt(v));
        }
      }
    }
  }

  return obj;
};
/*
 * @const {Function} fixJSONStringify - Fix issue with Date stringify
 */


const fixJSONStringify = function (obj) {
  for (let key in obj) {
    if (helpers.isDate(obj[key])) {
      obj[key] = `=--JSON-DATE--=${+obj[key]}`;
    } else if (helpers.isObject(obj[key])) {
      obj[key] = fixJSONStringify(obj[key]);
    } else if (helpers.isArray(obj[key])) {
      let v;

      for (let i = 0; i < obj[key].length; i++) {
        v = obj[key][i];

        if (helpers.isObject(v)) {
          obj[key][i] = fixJSONStringify(v);
        } else if (helpers.isDate(v)) {
          obj[key][i] = `=--JSON-DATE--=${+v}`;
        }
      }
    }
  }

  return obj;
};
/*
 * @locus Anywhere
 * @private
 * @name formatFleURL
 * @param {Object} fileRef - File reference object
 * @param {String} version - [Optional] Version of file you would like build URL for
 * @param {String} URIBase - [Optional] URI base, see - https://github.com/VeliovGroup/Meteor-Files/issues/626
 * @summary Returns formatted URL for file
 * @returns {String} Downloadable link
 */


const formatFleURL = (fileRef, version = 'original', _URIBase = (__meteor_runtime_config__ || {}).ROOT_URL) => {
  check(fileRef, Object);
  check(version, String);
  let URIBase = _URIBase;

  if (!helpers.isString(URIBase)) {
    URIBase = (__meteor_runtime_config__ || {}).ROOT_URL || '/';
  }

  const _root = URIBase.replace(/\/+$/, '');

  const vRef = fileRef.versions && fileRef.versions[version] || fileRef || {};
  let ext;

  if (helpers.isString(vRef.extension)) {
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
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 1);
let helpers;
module.watch(require("./lib.js"), {
  helpers(v) {
    helpers = v;
  }

}, 2);

const NOOP = () => {};
/*
 * @const {Object} bound   - Meteor.bindEnvironment (Fiber wrapper)
 * @const {Object} fdCache - File Descriptors Cache
 */


const bound = Meteor.bindEnvironment(callback => callback());
const fdCache = {};
/*
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

    if (!this.path || !helpers.isString(this.path)) {
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
            this.abort();
            throw new Meteor.Error(500, '[FilesCollection] [writeStream] [ensureFile] [Error:] ' + efError);
          } else {
            fs.open(this.path, 'r+', this.permissions, (oError, fd) => {
              bound(() => {
                if (oError) {
                  this.abort();
                  throw new Meteor.Error(500, '[FilesCollection] [writeStream] [ensureFile] [open] [Error:] ' + oError);
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
  }
  /*
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
  }
  /*
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
  }
  /*
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
  }
  /*
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
// node_modules/meteor/ostrio_files/node_modules/fs-extra/package.json                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "fs-extra";
exports.version = "7.0.0";
exports.main = "./lib/index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/fs-extra/lib/index.js                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"eventemitter3":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/eventemitter3/package.json                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "eventemitter3";
exports.version = "3.1.0";
exports.main = "index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/eventemitter3/index.js                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"request":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/request/package.json                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "request";
exports.version = "2.87.0";
exports.main = "index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/request/index.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"file-type":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/file-type/package.json                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "file-type";
exports.version = "8.1.0";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/file-type/index.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/ostrio:files/server.js");

/* Exports */
Package._define("ostrio:files", exports, {
  FilesCollection: FilesCollection
});

})();

//# sourceURL=meteor://💻app/packages/ostrio_files.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZpbGVzL3NlcnZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZpbGVzL2NvcmUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL29zdHJpbzpmaWxlcy9jdXJzb3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL29zdHJpbzpmaWxlcy9saWIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL29zdHJpbzpmaWxlcy93cml0ZS1zdHJlYW0uanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiRmlsZXNDb2xsZWN0aW9uIiwiTW9uZ28iLCJ3YXRjaCIsInJlcXVpcmUiLCJ2IiwiV2ViQXBwIiwiTWV0ZW9yIiwiUmFuZG9tIiwiQ29va2llcyIsIldyaXRlU3RyZWFtIiwiZGVmYXVsdCIsImNoZWNrIiwiTWF0Y2giLCJGaWxlc0NvbGxlY3Rpb25Db3JlIiwiZml4SlNPTlBhcnNlIiwiZml4SlNPTlN0cmluZ2lmeSIsImhlbHBlcnMiLCJmcyIsIm5vZGVRcyIsInJlcXVlc3QiLCJmaWxlVHlwZSIsIm5vZGVQYXRoIiwiYm91bmQiLCJiaW5kRW52aXJvbm1lbnQiLCJjYWxsYmFjayIsIk5PT1AiLCJjb25zdHJ1Y3RvciIsImNvbmZpZyIsInN0b3JhZ2VQYXRoIiwiZGVidWciLCJzY2hlbWEiLCJwdWJsaWMiLCJzdHJpY3QiLCJjaHVua1NpemUiLCJwcm90ZWN0ZWQiLCJjb2xsZWN0aW9uIiwicGVybWlzc2lvbnMiLCJjYWNoZUNvbnRyb2wiLCJkb3dubG9hZFJvdXRlIiwib25BZnRlclVwbG9hZCIsIm9uQWZ0ZXJSZW1vdmUiLCJkaXNhYmxlVXBsb2FkIiwib25CZWZvcmVSZW1vdmUiLCJpbnRlZ3JpdHlDaGVjayIsImNvbGxlY3Rpb25OYW1lIiwib25CZWZvcmVVcGxvYWQiLCJuYW1pbmdGdW5jdGlvbiIsInJlc3BvbnNlSGVhZGVycyIsImRpc2FibGVEb3dubG9hZCIsImFsbG93Q2xpZW50Q29kZSIsImRvd25sb2FkQ2FsbGJhY2siLCJvbkluaXRpYXRlVXBsb2FkIiwiaW50ZXJjZXB0RG93bmxvYWQiLCJjb250aW51ZVVwbG9hZFRUTCIsInBhcmVudERpclBlcm1pc3Npb25zIiwiX3ByZUNvbGxlY3Rpb24iLCJfcHJlQ29sbGVjdGlvbk5hbWUiLCJzZWxmIiwiaXNCb29sZWFuIiwiTWF0aCIsImZsb29yIiwiaXNTdHJpbmciLCJDb2xsZWN0aW9uIiwiX25hbWUiLCJmaWxlc0NvbGxlY3Rpb24iLCJTdHJpbmciLCJFcnJvciIsInJlcGxhY2UiLCJpc0Z1bmN0aW9uIiwiaXNOdW1iZXIiLCJwYXJzZUludCIsImlzT2JqZWN0IiwiX2N1cnJlbnRVcGxvYWRzIiwicmVzcG9uc2VDb2RlIiwiZmlsZVJlZiIsInZlcnNpb25SZWYiLCJoZWFkZXJzIiwiUHJhZ21hIiwiVHJhaWxlciIsInNpemUiLCJDb25uZWN0aW9uIiwidHlwZSIsInNlcCIsInNwIiwiYXBwbHkiLCJhcmd1bWVudHMiLCJub3JtYWxpemUiLCJfZGVidWciLCJta2RpcnMiLCJtb2RlIiwiZXJyb3IiLCJCb29sZWFuIiwiTnVtYmVyIiwiRnVuY3Rpb24iLCJPbmVPZiIsIk9iamVjdCIsIl9lbnN1cmVJbmRleCIsImNyZWF0ZWRBdCIsImV4cGlyZUFmdGVyU2Vjb25kcyIsImJhY2tncm91bmQiLCJfcHJlQ29sbGVjdGlvbkN1cnNvciIsImZpbmQiLCJmaWVsZHMiLCJfaWQiLCJpc0ZpbmlzaGVkIiwib2JzZXJ2ZSIsImNoYW5nZWQiLCJkb2MiLCJyZW1vdmUiLCJyZW1vdmVkIiwic3RvcCIsImVuZCIsImFib3J0IiwiX2NyZWF0ZVN0cmVhbSIsInBhdGgiLCJvcHRzIiwiZmlsZUxlbmd0aCIsIl9jb250aW51ZVVwbG9hZCIsImZpbGUiLCJhYm9ydGVkIiwiZW5kZWQiLCJjb250VXBsZCIsImZpbmRPbmUiLCJfY2hlY2tBY2Nlc3MiLCJodHRwIiwicmVzdWx0IiwidXNlciIsInVzZXJJZCIsIl9nZXRVc2VyIiwicGFyYW1zIiwiY2FsbCIsImFzc2lnbiIsInJjIiwidGV4dCIsInJlc3BvbnNlIiwiaGVhZGVyc1NlbnQiLCJ3cml0ZUhlYWQiLCJsZW5ndGgiLCJmaW5pc2hlZCIsIl9tZXRob2ROYW1lcyIsIl9BYm9ydCIsIl9Xcml0ZSIsIl9TdGFydCIsIl9SZW1vdmUiLCJvbiIsIl9oYW5kbGVVcGxvYWQiLCJfZmluaXNoVXBsb2FkIiwiX2hhbmRsZVVwbG9hZFN5bmMiLCJ3cmFwQXN5bmMiLCJiaW5kIiwiY29ubmVjdEhhbmRsZXJzIiwidXNlIiwiaHR0cFJlcSIsImh0dHBSZXNwIiwibmV4dCIsIl9wYXJzZWRVcmwiLCJpbmRleE9mIiwibWV0aG9kIiwiaGFuZGxlRXJyb3IiLCJfZXJyb3IiLCJjb25zb2xlIiwid2FybiIsInRyYWNlIiwidG9TdHJpbmciLCJKU09OIiwic3RyaW5naWZ5IiwiYm9keSIsImRhdGEiLCJzZXJ2ZXIiLCJzZXNzaW9ucyIsImhhcyIsImZpbGVJZCIsImVvZiIsIkJ1ZmZlciIsImZyb20iLCJiaW5EYXRhIiwiYnVmZkVyciIsImNodW5rSWQiLCJfcHJlcGFyZVVwbG9hZCIsIm1ldGEiLCJlbWl0IiwicGFyc2UiLCJqc29uRXJyIiwiX19fcyIsIm5hbWUiLCJjbG9uZSIsIkRhdGUiLCJtYXhMZW5ndGgiLCJpbnNlcnQiLCJvbWl0IiwicmV0dXJuTWV0YSIsInVwbG9hZFJvdXRlIiwiaHR0cFJlc3BFcnIiLCJ1cmkiLCJ1cmlzIiwic3Vic3RyaW5nIiwic3BsaXQiLCJxdWVyeSIsInZlcnNpb24iLCJkb3dubG9hZCIsIl9maWxlIiwiX21ldGhvZHMiLCJzZWxlY3RvciIsInVzZXJGdW5jcyIsInVzZXJzIiwiY3Vyc29yIiwiY291bnQiLCJGU05hbWUiLCJPcHRpb25hbCIsImUiLCJfb3B0cyIsInVuYmxvY2siLCJoYW5kbGVVcGxvYWRFcnIiLCJ1bmxpbmsiLCJtZXRob2RzIiwidHJhbnNwb3J0IiwiY3R4IiwiZmlsZU5hbWUiLCJfZ2V0RmlsZU5hbWUiLCJleHRlbnNpb24iLCJleHRlbnNpb25XaXRoRG90IiwiX2dldEV4dCIsImV4dCIsIl9kYXRhVG9TY2hlbWEiLCJpc1VwbG9hZEFsbG93ZWQiLCJjYiIsImNobW9kIiwiX2dldE1pbWVUeXBlIiwiX3VwZGF0ZUZpbGVUeXBlcyIsImNvbEluc2VydCIsInVwZGF0ZSIsIiRzZXQiLCJwcmVVcGRhdGVFcnJvciIsIndyaXRlIiwiZmlsZURhdGEiLCJtaW1lIiwiYnVmIiwiZmQiLCJvcGVuU3luYyIsImJyIiwicmVhZFN5bmMiLCJjbG9zZSIsInNsaWNlIiwibXRvayIsImNvb2tpZSIsImdldCIsImJ1ZmZlciIsIl9jYWxsYmFjayIsIl9wcm9jZWVkQWZ0ZXJVcGxvYWQiLCJwcm9jZWVkQWZ0ZXJVcGxvYWQiLCJpZCIsInN0cmVhbSIsImNyZWF0ZVdyaXRlU3RyZWFtIiwiZmxhZ3MiLCJzdHJlYW1FcnIiLCJpbnNlcnRFcnIiLCJsb2FkIiwidXJsIiwicGF0aFBhcnRzIiwic3RvcmVSZXN1bHQiLCJzdGF0Iiwic3RhdHMiLCJ2ZXJzaW9ucyIsIm9yaWdpbmFsIiwicGlwZSIsImFkZEZpbGUiLCJzdGF0RXJyIiwiaXNGaWxlIiwiX3N0b3JhZ2VQYXRoIiwidW5kZWZpbmVkIiwiZmlsZXMiLCJmb3JFYWNoIiwiZG9jcyIsImZldGNoIiwiZGVueSIsInJ1bGVzIiwiYWxsb3ciLCJkZW55Q2xpZW50IiwiYWxsb3dDbGllbnQiLCJ2S2V5IiwiXzQwNCIsIm9yaWdpbmFsVXJsIiwidlJlZiIsInJlc3BvbnNlVHlwZSIsInNlcnZlIiwicmVhZGFibGVTdHJlYW0iLCJfcmVzcG9uc2VUeXBlIiwiZm9yY2UyMDAiLCJwYXJ0aXJhbCIsInJlcVJhbmdlIiwiZGlzcG9zaXRpb25UeXBlIiwic3RhcnQiLCJ0YWtlIiwiZGlzcG9zaXRpb25OYW1lIiwiZW5jb2RlVVJJIiwiZW5jb2RlVVJJQ29tcG9uZW50IiwiZGlzcG9zaXRpb25FbmNvZGluZyIsInNldEhlYWRlciIsInJhbmdlIiwiYXJyYXkiLCJpc05hTiIsInBsYXkiLCJzdHJlYW1FcnJvckhhbmRsZXIiLCJrZXkiLCJyZXNwb25kIiwiY29kZSIsImRlc3Ryb3kiLCJjcmVhdGVSZWFkU3RyZWFtIiwiRXZlbnRFbWl0dGVyIiwiZm9ybWF0RmxlVVJMIiwiRmlsZXNDdXJzb3IiLCJGaWxlQ3Vyc29yIiwiaW5mbyIsImxvZyIsInBvcCIsInRvTG93ZXJDYXNlIiwiaXNWaWRlbyIsInRlc3QiLCJpc0F1ZGlvIiwiaXNJbWFnZSIsImlzVGV4dCIsImlzSlNPTiIsImlzUERGIiwiZHMiLCJfZG93bmxvYWRSb3V0ZSIsIl9jb2xsZWN0aW9uTmFtZSIsIm9wdGlvbnMiLCJsaW5rIiwiVVJJQmFzZSIsIl9faGVscGVycyIsIm9wdGlvbmFsIiwiYmxhY2tib3giLCJ1cGRhdGVkQXQiLCJfZmlsZVJlZiIsIl9jb2xsZWN0aW9uIiwicHJvcGVydHkiLCJ3aXRoIiwiX3NlbGVjdG9yIiwiX2N1cnJlbnQiLCJoYXNOZXh0IiwiaGFzUHJldmlvdXMiLCJwcmV2aW91cyIsImZpcnN0IiwibGFzdCIsImNvbnRleHQiLCJlYWNoIiwibWFwIiwiY3VycmVudCIsImNhbGxiYWNrcyIsIm9ic2VydmVDaGFuZ2VzIiwiaXNVbmRlZmluZWQiLCJvYmoiLCJpc0FycmF5IiwiQXJyYXkiLCJwcm90b3R5cGUiLCJpc0VtcHR5IiwiaXNEYXRlIiwia2V5cyIsIl9vYmoiLCJoYXNPd25Qcm9wZXJ0eSIsImkiLCJjbGVhciIsIm5vdyIsInRocm90dGxlIiwiZnVuYyIsIndhaXQiLCJ0aW1lb3V0IiwidGhhdCIsImFyZ3MiLCJsYXRlciIsImxlYWRpbmciLCJ0aHJvdHRsZWQiLCJyZW1haW5pbmciLCJjbGVhclRpbWVvdXQiLCJ0cmFpbGluZyIsInNldFRpbWVvdXQiLCJjYW5jZWwiLCJfaGVscGVycyIsIl9VUklCYXNlIiwiX19tZXRlb3JfcnVudGltZV9jb25maWdfXyIsIlJPT1RfVVJMIiwiX3Jvb3QiLCJmZENhY2hlIiwid3JpdHRlbkNodW5rcyIsImVuc3VyZUZpbGUiLCJlZkVycm9yIiwib3BlbiIsIm9FcnJv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LGlCQUFPM0IsT0FBT2lYLFVBQVAsQ0FBa0IsTUFBTTtBQUM3QixpQkFBS3hRLEdBQUwsQ0FBU3ZGLFFBQVQ7QUFDRCxXQUZNLEVBRUosRUFGSSxDQUFQO0FBR0QsU0FSRDtBQVNELE9BVkQ7QUFXRCxLQXZCRCxNQXVCTztBQUNMQSxrQkFBWUEsU0FBUyxLQUFLLENBQWQsRUFBaUIsS0FBS2dHLEtBQXRCLENBQVo7QUFDRDs7QUFDRCxXQUFPLEtBQVA7QUFDRDtBQUVEOzs7Ozs7Ozs7QUFPQVIsUUFBTXhGLFFBQU4sRUFBZ0I7QUFDZCxTQUFLK0YsT0FBTCxHQUFlLElBQWY7QUFDQSxXQUFPdVEsUUFBUSxLQUFLNVEsSUFBYixDQUFQO0FBQ0FqRyxPQUFHb00sTUFBSCxDQUFVLEtBQUtuRyxJQUFmLEVBQXNCMUYsWUFBWUMsSUFBbEM7QUFDQSxXQUFPLElBQVA7QUFDRDtBQUVEOzs7Ozs7OztBQU1BcUYsU0FBTztBQUNMLFNBQUtTLE9BQUwsR0FBZSxJQUFmO0FBQ0EsV0FBT3VRLFFBQVEsS0FBSzVRLElBQWIsQ0FBUDtBQUNBLFdBQU8sSUFBUDtBQUNEOztBQXZJOEIsQyIsImZpbGUiOiIvcGFja2FnZXMvb3N0cmlvX2ZpbGVzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTW9uZ28gfSAgICAgICAgICAgZnJvbSAnbWV0ZW9yL21vbmdvJztcbmltcG9ydCB7IFdlYkFwcCB9ICAgICAgICAgIGZyb20gJ21ldGVvci93ZWJhcHAnO1xuaW1wb3J0IHsgTWV0ZW9yIH0gICAgICAgICAgZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBSYW5kb20gfSAgICAgICAgICBmcm9tICdtZXRlb3IvcmFuZG9tJztcbmltcG9ydCB7IENvb2tpZXMgfSAgICAgICAgIGZyb20gJ21ldGVvci9vc3RyaW86Y29va2llcyc7XG5pbXBvcnQgV3JpdGVTdHJlYW0gICAgICAgICBmcm9tICcuL3dyaXRlLXN0cmVhbS5qcyc7XG5pbXBvcnQgeyBjaGVjaywgTWF0Y2ggfSAgICBmcm9tICdtZXRlb3IvY2hlY2snO1xuaW1wb3J0IEZpbGVzQ29sbGVjdGlvbkNvcmUgZnJvbSAnLi9jb3JlLmpzJztcbmltcG9ydCB7IGZpeEpTT05QYXJzZSwgZml4SlNPTlN0cmluZ2lmeSwgaGVscGVycyB9IGZyb20gJy4vbGliLmpzJztcblxuaW1wb3J0IGZzICAgICAgIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBub2RlUXMgICBmcm9tICdxdWVyeXN0cmluZyc7XG5pbXBvcnQgcmVxdWVzdCAgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgZmlsZVR5cGUgZnJvbSAnZmlsZS10eXBlJztcbmltcG9ydCBub2RlUGF0aCBmcm9tICdwYXRoJztcblxuLypcbiAqIEBjb25zdCB7T2JqZWN0fSBib3VuZCAgLSBNZXRlb3IuYmluZEVudmlyb25tZW50IChGaWJlciB3cmFwcGVyKVxuICogQGNvbnN0IHtGdW5jdGlvbn0gTk9PUCAtIE5vIE9wZXJhdGlvbiBmdW5jdGlvbiwgcGxhY2Vob2xkZXIgZm9yIHJlcXVpcmVkIGNhbGxiYWNrc1xuICovXG5jb25zdCBib3VuZCA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoY2FsbGJhY2sgPT4gY2FsbGJhY2soKSk7XG5jb25zdCBOT09QICA9ICgpID0+IHsgIH07XG5cbi8qXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBjbGFzcyBGaWxlc0NvbGxlY3Rpb25cbiAqIEBwYXJhbSBjb25maWcgICAgICAgICAgIHtPYmplY3R9ICAgLSBbQm90aF0gICBDb25maWd1cmF0aW9uIG9iamVjdCB3aXRoIG5leHQgcHJvcGVydGllczpcbiAqIEBwYXJhbSBjb25maWcuZGVidWcgICAgIHtCb29sZWFufSAgLSBbQm90aF0gICBUdXJuIG9uL29mIGRlYnVnZ2luZyBhbmQgZXh0cmEgbG9nZ2luZ1xuICogQHBhcmFtIGNvbmZpZy5zY2hlbWEgICAge09iamVjdH0gICAtIFtCb3RoXSAgIENvbGxlY3Rpb24gU2NoZW1hXG4gKiBAcGFyYW0gY29uZmlnLnB1YmxpYyAgICB7Qm9vbGVhbn0gIC0gW0JvdGhdICAgU3RvcmUgZmlsZXMgaW4gZm9sZGVyIGFjY2Vzc2libGUgZm9yIHByb3h5IHNlcnZlcnMsIGZvciBsaW1pdHMsIGFuZCBtb3JlIC0gcmVhZCBkb2NzXG4gKiBAcGFyYW0gY29uZmlnLnN0cmljdCAgICB7Qm9vbGVhbn0gIC0gW1NlcnZlcl0gU3RyaWN0IG1vZGUgZm9yIHBhcnRpYWwgY29udGVudCwgaWYgaXMgYHRydWVgIHNlcnZlciB3aWxsIHJldHVybiBgNDE2YCByZXNwb25zZSBjb2RlLCB3aGVuIGByYW5nZWAgaXMgbm90IHNwZWNpZmllZCwgb3RoZXJ3aXNlIHNlcnZlciByZXR1cm4gYDIwNmBcbiAqIEBwYXJhbSBjb25maWcucHJvdGVjdGVkIHtGdW5jdGlvbn0gLSBbU2VydmVyXSBJZiBgdHJ1ZWAgLSBmaWxlcyB3aWxsIGJlIHNlcnZlZCBvbmx5IHRvIGF1dGhvcml6ZWQgdXNlcnMsIGlmIGBmdW5jdGlvbigpYCAtIHlvdSdyZSBhYmxlIHRvIGNoZWNrIHZpc2l0b3IncyBwZXJtaXNzaW9ucyBpbiB5b3VyIG93biB3YXkgZnVuY3Rpb24ncyBjb250ZXh0IGhhczpcbiAqICAtIGByZXF1ZXN0YFxuICogIC0gYHJlc3BvbnNlYFxuICogIC0gYHVzZXIoKWBcbiAqICAtIGB1c2VySWRgXG4gKiBAcGFyYW0gY29uZmlnLmNodW5rU2l6ZSAgICAgIHtOdW1iZXJ9ICAtIFtCb3RoXSBVcGxvYWQgY2h1bmsgc2l6ZSwgZGVmYXVsdDogNTI0Mjg4IGJ5dGVzICgwLDUgTWIpXG4gKiBAcGFyYW0gY29uZmlnLnBlcm1pc3Npb25zICAgIHtOdW1iZXJ9ICAtIFtTZXJ2ZXJdIFBlcm1pc3Npb25zIHdoaWNoIHdpbGwgYmUgc2V0IHRvIHVwbG9hZGVkIGZpbGVzIChvY3RhbCksIGxpa2U6IGA1MTFgIG9yIGAwbzc1NWAuIERlZmF1bHQ6IDA2NDRcbiAqIEBwYXJhbSBjb25maWcucGFyZW50RGlyUGVybWlzc2lvbnMge051bWJlcn0gIC0gW1NlcnZlcl0gUGVybWlzc2lvbnMgd2hpY2ggd2lsbCBiZSBzZXQgdG8gcGFyZW50IGRpcmVjdG9yeSBvZiB1cGxvYWRlZCBmaWxlcyAob2N0YWwpLCBsaWtlOiBgNjExYCBvciBgMG83NzdgLiBEZWZhdWx0OiAwNzU1XG4gKiBAcGFyYW0gY29uZmlnLnN0b3JhZ2VQYXRoICAgIHtTdHJpbmd8RnVuY3Rpb259ICAtIFtTZXJ2ZXJdIFN0b3JhZ2UgcGF0aCBvbiBmaWxlIHN5c3RlbVxuICogQHBhcmFtIGNvbmZpZy5jYWNoZUNvbnRyb2wgICB7U3RyaW5nfSAgLSBbU2VydmVyXSBEZWZhdWx0IGBDYWNoZS1Db250cm9sYCBoZWFkZXJcbiAqIEBwYXJhbSBjb25maWcucmVzcG9uc2VIZWFkZXJzIHtPYmplY3R8RnVuY3Rpb259IC0gW1NlcnZlcl0gQ3VzdG9tIHJlc3BvbnNlIGhlYWRlcnMsIGlmIGZ1bmN0aW9uIGlzIHBhc3NlZCwgbXVzdCByZXR1cm4gT2JqZWN0XG4gKiBAcGFyYW0gY29uZmlnLnRocm90dGxlICAgICAgIHtOdW1iZXJ9ICAtIFtTZXJ2ZXJdIERFUFJFQ0FURUQgYnBzIHRocm90dGxlIHRocmVzaG9sZFxuICogQHBhcmFtIGNvbmZpZy5kb3dubG9hZFJvdXRlICB7U3RyaW5nfSAgLSBbQm90aF0gICBTZXJ2ZXIgUm91dGUgdXNlZCB0byByZXRyaWV2ZSBmaWxlc1xuICogQHBhcmFtIGNvbmZpZy5jb2xsZWN0aW9uICAgICB7TW9uZ28uQ29sbGVjdGlvbn0gLSBbQm90aF0gTW9uZ28gQ29sbGVjdGlvbiBJbnN0YW5jZVxuICogQHBhcmFtIGNvbmZpZy5jb2xsZWN0aW9uTmFtZSB7U3RyaW5nfSAgLSBbQm90aF0gICBDb2xsZWN0aW9uIG5hbWVcbiAqIEBwYXJhbSBjb25maWcubmFtaW5nRnVuY3Rpb24ge0Z1bmN0aW9ufS0gW0JvdGhdICAgRnVuY3Rpb24gd2hpY2ggcmV0dXJucyBgU3RyaW5nYFxuICogQHBhcmFtIGNvbmZpZy5pbnRlZ3JpdHlDaGVjayB7Qm9vbGVhbn0gLSBbU2VydmVyXSBDaGVjayBmaWxlJ3MgaW50ZWdyaXR5IGJlZm9yZSBzZXJ2aW5nIHRvIHVzZXJzXG4gKiBAcGFyYW0gY29uZmlnLm9uQWZ0ZXJVcGxvYWQgIHtGdW5jdGlvbn0tIFtTZXJ2ZXJdIENhbGxlZCByaWdodCBhZnRlciBmaWxlIGlzIHJlYWR5IG9uIEZTLiBVc2UgdG8gdHJhbnNmZXIgZmlsZSBzb21ld2hlcmUgZWxzZSwgb3IgZG8gb3RoZXIgdGhpbmcgd2l0aCBmaWxlIGRpcmVjdGx5XG4gKiBAcGFyYW0gY29uZmlnLm9uQWZ0ZXJSZW1vdmUgIHtGdW5jdGlvbn0gLSBbU2VydmVyXSBDYWxsZWQgcmlnaHQgYWZ0ZXIgZmlsZSBpcyByZW1vdmVkLiBSZW1vdmVkIG9iamVjdHMgaXMgcGFzc2VkIHRvIGNhbGxiYWNrXG4gKiBAcGFyYW0gY29uZmlnLmNvbnRpbnVlVXBsb2FkVFRMIHtOdW1iZXJ9IC0gW1NlcnZlcl0gVGltZSBpbiBzZWNvbmRzLCBkdXJpbmcgdXBsb2FkIG1heSBiZSBjb250aW51ZWQsIGRlZmF1bHQgMyBob3VycyAoMTA4MDAgc2Vjb25kcylcbiAqIEBwYXJhbSBjb25maWcub25CZWZvcmVVcGxvYWQge0Z1bmN0aW9ufS0gW0JvdGhdICAgRnVuY3Rpb24gd2hpY2ggZXhlY3V0ZXMgb24gc2VydmVyIGFmdGVyIHJlY2VpdmluZyBlYWNoIGNodW5rIGFuZCBvbiBjbGllbnQgcmlnaHQgYmVmb3JlIGJlZ2lubmluZyB1cGxvYWQuIEZ1bmN0aW9uIGNvbnRleHQgaXMgYEZpbGVgIC0gc28geW91IGFyZSBhYmxlIHRvIGNoZWNrIGZvciBleHRlbnNpb24sIG1pbWUtdHlwZSwgc2l6ZSBhbmQgZXRjLjpcbiAqICAtIHJldHVybiBgdHJ1ZWAgdG8gY29udGludWVcbiAqICAtIHJldHVybiBgZmFsc2VgIG9yIGBTdHJpbmdgIHRvIGFib3J0IHVwbG9hZFxuICogQHBhcmFtIGNvbmZpZy5vbkluaXRpYXRlVXBsb2FkIHtGdW5jdGlvbn0gLSBbU2VydmVyXSBGdW5jdGlvbiB3aGljaCBleGVjdXRlcyBvbiBzZXJ2ZXIgcmlnaHQgYmVmb3JlIHVwbG9hZCBpcyBiZWdpbiBhbmQgcmlnaHQgYWZ0ZXIgYG9uQmVmb3JlVXBsb2FkYCBob29rLiBUaGlzIGhvb2sgaXMgZnVsbHkgYXN5bmNocm9ub3VzLlxuICogQHBhcmFtIGNvbmZpZy5vbkJlZm9yZVJlbW92ZSB7RnVuY3Rpb259IC0gW1NlcnZlcl0gRXhlY3V0ZXMgYmVmb3JlIHJlbW92aW5nIGZpbGUgb24gc2VydmVyLCBzbyB5b3UgY2FuIGNoZWNrIHBlcm1pc3Npb25zLiBSZXR1cm4gYHRydWVgIHRvIGFsbG93IGFjdGlvbiBhbmQgYGZhbHNlYCB0byBkZW55LlxuICogQHBhcmFtIGNvbmZpZy5hbGxvd0NsaWVudENvZGUgIHtCb29sZWFufSAgLSBbQm90aF0gICBBbGxvdyB0byBydW4gYHJlbW92ZWAgZnJvbSBjbGllbnRcbiAqIEBwYXJhbSBjb25maWcuZG93bmxvYWRDYWxsYmFjayB7RnVuY3Rpb259IC0gW1NlcnZlcl0gQ2FsbGJhY2sgdHJpZ2dlcmVkIGVhY2ggdGltZSBmaWxlIGlzIHJlcXVlc3RlZCwgcmV0dXJuIHRydXRoeSB2YWx1ZSB0byBjb250aW51ZSBkb3dubG9hZCwgb3IgZmFsc3kgdG8gYWJvcnRcbiAqIEBwYXJhbSBjb25maWcuaW50ZXJjZXB0RG93bmxvYWQge0Z1bmN0aW9ufSAtIFtTZXJ2ZXJdIEludGVyY2VwdCBkb3dubG9hZCByZXF1ZXN0LCBzbyB5b3UgY2FuIHNlcnZlIGZpbGUgZnJvbSB0aGlyZC1wYXJ0eSByZXNvdXJjZSwgYXJndW1lbnRzIHtodHRwOiB7cmVxdWVzdDogey4uLn0sIHJlc3BvbnNlOiB7Li4ufX0sIGZpbGVSZWY6IHsuLi59fVxuICogQHBhcmFtIGNvbmZpZy5kaXNhYmxlVXBsb2FkIHtCb29sZWFufSAtIERpc2FibGUgZmlsZSB1cGxvYWQsIHVzZWZ1bCBmb3Igc2VydmVyIG9ubHkgc29sdXRpb25zXG4gKiBAcGFyYW0gY29uZmlnLmRpc2FibGVEb3dubG9hZCB7Qm9vbGVhbn0gLSBEaXNhYmxlIGZpbGUgZG93bmxvYWQgKHNlcnZpbmcpLCB1c2VmdWwgZm9yIGZpbGUgbWFuYWdlbWVudCBvbmx5IHNvbHV0aW9uc1xuICogQHBhcmFtIGNvbmZpZy5fcHJlQ29sbGVjdGlvbiAge01vbmdvLkNvbGxlY3Rpb259IC0gW1NlcnZlcl0gTW9uZ28gcHJlQ29sbGVjdGlvbiBJbnN0YW5jZVxuICogQHBhcmFtIGNvbmZpZy5fcHJlQ29sbGVjdGlvbk5hbWUge1N0cmluZ30gIC0gW1NlcnZlcl0gIHByZUNvbGxlY3Rpb24gbmFtZVxuICogQHN1bW1hcnkgQ3JlYXRlIG5ldyBpbnN0YW5jZSBvZiBGaWxlc0NvbGxlY3Rpb25cbiAqL1xuZXhwb3J0IGNsYXNzIEZpbGVzQ29sbGVjdGlvbiBleHRlbmRzIEZpbGVzQ29sbGVjdGlvbkNvcmUge1xuICBjb25zdHJ1Y3Rvcihjb25maWcpIHtcbiAgICBzdXBlcigpO1xuICAgIGxldCBzdG9yYWdlUGF0aDtcbiAgICBpZiAoY29uZmlnKSB7XG4gICAgICAoe1xuICAgICAgICBzdG9yYWdlUGF0aCxcbiAgICAgICAgZGVidWc6IHRoaXMuZGVidWcsXG4gICAgICAgIHNjaGVtYTogdGhpcy5zY2hlbWEsXG4gICAgICAgIHB1YmxpYzogdGhpcy5wdWJsaWMsXG4gICAgICAgIHN0cmljdDogdGhpcy5zdHJpY3QsXG4gICAgICAgIGNodW5rU2l6ZTogdGhpcy5jaHVua1NpemUsXG4gICAgICAgIHByb3RlY3RlZDogdGhpcy5wcm90ZWN0ZWQsXG4gICAgICAgIGNvbGxlY3Rpb246IHRoaXMuY29sbGVjdGlvbixcbiAgICAgICAgcGVybWlzc2lvbnM6IHRoaXMucGVybWlzc2lvbnMsXG4gICAgICAgIGNhY2hlQ29udHJvbDogdGhpcy5jYWNoZUNvbnRyb2wsXG4gICAgICAgIGRvd25sb2FkUm91dGU6IHRoaXMuZG93bmxvYWRSb3V0ZSxcbiAgICAgICAgb25BZnRlclVwbG9hZDogdGhpcy5vbkFmdGVyVXBsb2FkLFxuICAgICAgICBvbkFmdGVyUmVtb3ZlOiB0aGlzLm9uQWZ0ZXJSZW1vdmUsXG4gICAgICAgIGRpc2FibGVVcGxvYWQ6IHRoaXMuZGlzYWJsZVVwbG9hZCxcbiAgICAgICAgb25CZWZvcmVSZW1vdmU6IHRoaXMub25CZWZvcmVSZW1vdmUsXG4gICAgICAgIGludGVncml0eUNoZWNrOiB0aGlzLmludGVncml0eUNoZWNrLFxuICAgICAgICBjb2xsZWN0aW9uTmFtZTogdGhpcy5jb2xsZWN0aW9uTmFtZSxcbiAgICAgICAgb25CZWZvcmVVcGxvYWQ6IHRoaXMub25CZWZvcmVVcGxvYWQsXG4gICAgICAgIG5hbWluZ0Z1bmN0aW9uOiB0aGlzLm5hbWluZ0Z1bmN0aW9uLFxuICAgICAgICByZXNwb25zZUhlYWRlcnM6IHRoaXMucmVzcG9uc2VIZWFkZXJzLFxuICAgICAgICBkaXNhYmxlRG93bmxvYWQ6IHRoaXMuZGlzYWJsZURvd25sb2FkLFxuICAgICAgICBhbGxvd0NsaWVudENvZGU6IHRoaXMuYWxsb3dDbGllbnRDb2RlLFxuICAgICAgICBkb3dubG9hZENhbGxiYWNrOiB0aGlzLmRvd25sb2FkQ2FsbGJhY2ssXG4gICAgICAgIG9uSW5pdGlhdGVVcGxvYWQ6IHRoaXMub25Jbml0aWF0ZVVwbG9hZCxcbiAgICAgICAgaW50ZXJjZXB0RG93bmxvYWQ6IHRoaXMuaW50ZXJjZXB0RG93bmxvYWQsXG4gICAgICAgIGNvbnRpbnVlVXBsb2FkVFRMOiB0aGlzLmNvbnRpbnVlVXBsb2FkVFRMLFxuICAgICAgICBwYXJlbnREaXJQZXJtaXNzaW9uczogdGhpcy5wYXJlbnREaXJQZXJtaXNzaW9ucyxcbiAgICAgICAgX3ByZUNvbGxlY3Rpb246IHRoaXMuX3ByZUNvbGxlY3Rpb24sXG4gICAgICAgIF9wcmVDb2xsZWN0aW9uTmFtZTogdGhpcy5fcHJlQ29sbGVjdGlvbk5hbWUsXG4gICAgICB9ID0gY29uZmlnKTtcbiAgICB9XG5cbiAgICBjb25zdCBzZWxmICAgPSB0aGlzO1xuICAgIG5ldyBDb29raWVzKCk7XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNCb29sZWFuKHRoaXMuZGVidWcpKSB7XG4gICAgICB0aGlzLmRlYnVnID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFoZWxwZXJzLmlzQm9vbGVhbih0aGlzLnB1YmxpYykpIHtcbiAgICAgIHRoaXMucHVibGljID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLnByb3RlY3RlZCkge1xuICAgICAgdGhpcy5wcm90ZWN0ZWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuY2h1bmtTaXplKSB7XG4gICAgICB0aGlzLmNodW5rU2l6ZSA9IDEwMjQgKiA1MTI7XG4gICAgfVxuXG4gICAgdGhpcy5jaHVua1NpemUgPSBNYXRoLmZsb29yKHRoaXMuY2h1bmtTaXplIC8gOCkgKiA4O1xuXG4gICAgaWYgKCFoZWxwZXJzLmlzU3RyaW5nKHRoaXMuY29sbGVjdGlvbk5hbWUpICYmICF0aGlzLmNvbGxlY3Rpb24pIHtcbiAgICAgIHRoaXMuY29sbGVjdGlvbk5hbWUgPSAnTWV0ZW9yVXBsb2FkRmlsZXMnO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5jb2xsZWN0aW9uKSB7XG4gICAgICB0aGlzLmNvbGxlY3Rpb24gPSBuZXcgTW9uZ28uQ29sbGVjdGlvbih0aGlzLmNvbGxlY3Rpb25OYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb2xsZWN0aW9uTmFtZSA9IHRoaXMuY29sbGVjdGlvbi5fbmFtZTtcbiAgICB9XG5cbiAgICB0aGlzLmNvbGxlY3Rpb24uZmlsZXNDb2xsZWN0aW9uID0gdGhpcztcbiAgICBjaGVjayh0aGlzLmNvbGxlY3Rpb25OYW1lLCBTdHJpbmcpO1xuXG4gICAgaWYgKHRoaXMucHVibGljICYmICF0aGlzLmRvd25sb2FkUm91dGUpIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNTAwLCBgW0ZpbGVzQ29sbGVjdGlvbi4ke3RoaXMuY29sbGVjdGlvbk5hbWV9XTogXCJkb3dubG9hZFJvdXRlXCIgbXVzdCBiZSBwcmVjaXNlbHkgcHJvdmlkZWQgb24gXCJwdWJsaWNcIiBjb2xsZWN0aW9ucyEgTm90ZTogXCJkb3dubG9hZFJvdXRlXCIgbXVzdCBiZSBlcXVhbCBvciBiZSBpbnNpZGUgb2YgeW91ciB3ZWIvcHJveHktc2VydmVyIChyZWxhdGl2ZSkgcm9vdC5gKTtcbiAgICB9XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNTdHJpbmcodGhpcy5kb3dubG9hZFJvdXRlKSkge1xuICAgICAgdGhpcy5kb3dubG9hZFJvdXRlID0gJy9jZG4vc3RvcmFnZSc7XG4gICAgfVxuXG4gICAgdGhpcy5kb3dubG9hZFJvdXRlID0gdGhpcy5kb3dubG9hZFJvdXRlLnJlcGxhY2UoL1xcLyQvLCAnJyk7XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNGdW5jdGlvbih0aGlzLm5hbWluZ0Z1bmN0aW9uKSkge1xuICAgICAgdGhpcy5uYW1pbmdGdW5jdGlvbiA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghaGVscGVycy5pc0Z1bmN0aW9uKHRoaXMub25CZWZvcmVVcGxvYWQpKSB7XG4gICAgICB0aGlzLm9uQmVmb3JlVXBsb2FkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFoZWxwZXJzLmlzQm9vbGVhbih0aGlzLmFsbG93Q2xpZW50Q29kZSkpIHtcbiAgICAgIHRoaXMuYWxsb3dDbGllbnRDb2RlID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNGdW5jdGlvbih0aGlzLm9uSW5pdGlhdGVVcGxvYWQpKSB7XG4gICAgICB0aGlzLm9uSW5pdGlhdGVVcGxvYWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNGdW5jdGlvbih0aGlzLmludGVyY2VwdERvd25sb2FkKSkge1xuICAgICAgdGhpcy5pbnRlcmNlcHREb3dubG9hZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghaGVscGVycy5pc0Jvb2xlYW4odGhpcy5zdHJpY3QpKSB7XG4gICAgICB0aGlzLnN0cmljdCA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKCFoZWxwZXJzLmlzTnVtYmVyKHRoaXMucGVybWlzc2lvbnMpKSB7XG4gICAgICB0aGlzLnBlcm1pc3Npb25zID0gcGFyc2VJbnQoJzY0NCcsIDgpO1xuICAgIH1cblxuICAgIGlmICghaGVscGVycy5pc051bWJlcih0aGlzLnBhcmVudERpclBlcm1pc3Npb25zKSkge1xuICAgICAgdGhpcy5wYXJlbnREaXJQZXJtaXNzaW9ucyA9IHBhcnNlSW50KCc3NTUnLCA4KTtcbiAgICB9XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNTdHJpbmcodGhpcy5jYWNoZUNvbnRyb2wpKSB7XG4gICAgICB0aGlzLmNhY2hlQ29udHJvbCA9ICdwdWJsaWMsIG1heC1hZ2U9MzE1MzYwMDAsIHMtbWF4YWdlPTMxNTM2MDAwJztcbiAgICB9XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNGdW5jdGlvbih0aGlzLm9uQWZ0ZXJVcGxvYWQpKSB7XG4gICAgICB0aGlzLm9uQWZ0ZXJVcGxvYWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNCb29sZWFuKHRoaXMuZGlzYWJsZVVwbG9hZCkpIHtcbiAgICAgIHRoaXMuZGlzYWJsZVVwbG9hZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghaGVscGVycy5pc0Z1bmN0aW9uKHRoaXMub25BZnRlclJlbW92ZSkpIHtcbiAgICAgIHRoaXMub25BZnRlclJlbW92ZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghaGVscGVycy5pc0Z1bmN0aW9uKHRoaXMub25CZWZvcmVSZW1vdmUpKSB7XG4gICAgICB0aGlzLm9uQmVmb3JlUmVtb3ZlID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFoZWxwZXJzLmlzQm9vbGVhbih0aGlzLmludGVncml0eUNoZWNrKSkge1xuICAgICAgdGhpcy5pbnRlZ3JpdHlDaGVjayA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKCFoZWxwZXJzLmlzQm9vbGVhbih0aGlzLmRpc2FibGVEb3dubG9hZCkpIHtcbiAgICAgIHRoaXMuZGlzYWJsZURvd25sb2FkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFoZWxwZXJzLmlzT2JqZWN0KHRoaXMuX2N1cnJlbnRVcGxvYWRzKSkge1xuICAgICAgdGhpcy5fY3VycmVudFVwbG9hZHMgPSB7fTtcbiAgICB9XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNGdW5jdGlvbih0aGlzLmRvd25sb2FkQ2FsbGJhY2spKSB7XG4gICAgICB0aGlzLmRvd25sb2FkQ2FsbGJhY2sgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNOdW1iZXIodGhpcy5jb250aW51ZVVwbG9hZFRUTCkpIHtcbiAgICAgIHRoaXMuY29udGludWVVcGxvYWRUVEwgPSAxMDgwMDtcbiAgICB9XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNGdW5jdGlvbih0aGlzLnJlc3BvbnNlSGVhZGVycykpIHtcbiAgICAgIHRoaXMucmVzcG9uc2VIZWFkZXJzID0gKHJlc3BvbnNlQ29kZSwgZmlsZVJlZiwgdmVyc2lvblJlZikgPT4ge1xuICAgICAgICBjb25zdCBoZWFkZXJzID0ge307XG5cbiAgICAgICAgc3dpdGNoIChyZXNwb25zZUNvZGUpIHtcbiAgICAgICAgY2FzZSAnMjA2JzpcbiAgICAgICAgICBoZWFkZXJzLlByYWdtYSAgICAgICAgICAgICAgID0gJ3ByaXZhdGUnO1xuICAgICAgICAgIGhlYWRlcnMuVHJhaWxlciAgICAgICAgICAgICAgPSAnZXhwaXJlcyc7XG4gICAgICAgICAgaGVhZGVyc1snVHJhbnNmZXItRW5jb2RpbmcnXSA9ICdjaHVua2VkJztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnNDAwJzpcbiAgICAgICAgICBoZWFkZXJzWydDYWNoZS1Db250cm9sJ10gICAgID0gJ25vLWNhY2hlJztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnNDE2JzpcbiAgICAgICAgICBoZWFkZXJzWydDb250ZW50LVJhbmdlJ10gICAgID0gYGJ5dGVzICovJHt2ZXJzaW9uUmVmLnNpemV9YDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGhlYWRlcnMuQ29ubmVjdGlvbiAgICAgICA9ICdrZWVwLWFsaXZlJztcbiAgICAgICAgaGVhZGVyc1snQ29udGVudC1UeXBlJ10gID0gdmVyc2lvblJlZi50eXBlIHx8ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nO1xuICAgICAgICBoZWFkZXJzWydBY2NlcHQtUmFuZ2VzJ10gPSAnYnl0ZXMnO1xuICAgICAgICByZXR1cm4gaGVhZGVycztcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucHVibGljICYmICFzdG9yYWdlUGF0aCkge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig1MDAsIGBbRmlsZXNDb2xsZWN0aW9uLiR7dGhpcy5jb2xsZWN0aW9uTmFtZX1dIFwic3RvcmFnZVBhdGhcIiBtdXN0IGJlIHNldCBvbiBcInB1YmxpY1wiIGNvbGxlY3Rpb25zISBOb3RlOiBcInN0b3JhZ2VQYXRoXCIgbXVzdCBiZSBlcXVhbCBvbiBiZSBpbnNpZGUgb2YgeW91ciB3ZWIvcHJveHktc2VydmVyIChhYnNvbHV0ZSkgcm9vdC5gKTtcbiAgICB9XG5cbiAgICBpZiAoIXN0b3JhZ2VQYXRoKSB7XG4gICAgICBzdG9yYWdlUGF0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGBhc3NldHMke25vZGVQYXRoLnNlcH1hcHAke25vZGVQYXRoLnNlcH11cGxvYWRzJHtub2RlUGF0aC5zZXB9JHtzZWxmLmNvbGxlY3Rpb25OYW1lfWA7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmIChoZWxwZXJzLmlzU3RyaW5nKHN0b3JhZ2VQYXRoKSkge1xuICAgICAgdGhpcy5zdG9yYWdlUGF0aCA9ICgpID0+IHN0b3JhZ2VQYXRoO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnN0b3JhZ2VQYXRoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBsZXQgc3AgPSBzdG9yYWdlUGF0aC5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuICAgICAgICBpZiAoIWhlbHBlcnMuaXNTdHJpbmcoc3ApKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDAsIGBbRmlsZXNDb2xsZWN0aW9uLiR7c2VsZi5jb2xsZWN0aW9uTmFtZX1dIFwic3RvcmFnZVBhdGhcIiBmdW5jdGlvbiBtdXN0IHJldHVybiBhIFN0cmluZyFgKTtcbiAgICAgICAgfVxuICAgICAgICBzcCA9IHNwLnJlcGxhY2UoL1xcLyQvLCAnJyk7XG4gICAgICAgIHJldHVybiBub2RlUGF0aC5ub3JtYWxpemUoc3ApO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICB0aGlzLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbi5zdG9yYWdlUGF0aF0gU2V0IHRvOicsIHRoaXMuc3RvcmFnZVBhdGgoe30pKTtcblxuICAgIGZzLm1rZGlycyh0aGlzLnN0b3JhZ2VQYXRoKHt9KSwgeyBtb2RlOiB0aGlzLnBhcmVudERpclBlcm1pc3Npb25zIH0sIChlcnJvcikgPT4ge1xuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAxLCBgW0ZpbGVzQ29sbGVjdGlvbi4ke3NlbGYuY29sbGVjdGlvbk5hbWV9XSBQYXRoIFwiJHt0aGlzLnN0b3JhZ2VQYXRoKHt9KX1cIiBpcyBub3Qgd3JpdGFibGUhICR7ZXJyb3J9YCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjaGVjayh0aGlzLnN0cmljdCwgQm9vbGVhbik7XG4gICAgY2hlY2sodGhpcy5wZXJtaXNzaW9ucywgTnVtYmVyKTtcbiAgICBjaGVjayh0aGlzLnN0b3JhZ2VQYXRoLCBGdW5jdGlvbik7XG4gICAgY2hlY2sodGhpcy5jYWNoZUNvbnRyb2wsIFN0cmluZyk7XG4gICAgY2hlY2sodGhpcy5vbkFmdGVyUmVtb3ZlLCBNYXRjaC5PbmVPZihmYWxzZSwgRnVuY3Rpb24pKTtcbiAgICBjaGVjayh0aGlzLm9uQWZ0ZXJVcGxvYWQsIE1hdGNoLk9uZU9mKGZhbHNlLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMuZGlzYWJsZVVwbG9hZCwgQm9vbGVhbik7XG4gICAgY2hlY2sodGhpcy5pbnRlZ3JpdHlDaGVjaywgQm9vbGVhbik7XG4gICAgY2hlY2sodGhpcy5vbkJlZm9yZVJlbW92ZSwgTWF0Y2guT25lT2YoZmFsc2UsIEZ1bmN0aW9uKSk7XG4gICAgY2hlY2sodGhpcy5kaXNhYmxlRG93bmxvYWQsIEJvb2xlYW4pO1xuICAgIGNoZWNrKHRoaXMuZG93bmxvYWRDYWxsYmFjaywgTWF0Y2guT25lT2YoZmFsc2UsIEZ1bmN0aW9uKSk7XG4gICAgY2hlY2sodGhpcy5pbnRlcmNlcHREb3dubG9hZCwgTWF0Y2guT25lT2YoZmFsc2UsIEZ1bmN0aW9uKSk7XG4gICAgY2hlY2sodGhpcy5jb250aW51ZVVwbG9hZFRUTCwgTnVtYmVyKTtcbiAgICBjaGVjayh0aGlzLnJlc3BvbnNlSGVhZGVycywgTWF0Y2guT25lT2YoT2JqZWN0LCBGdW5jdGlvbikpO1xuXG4gICAgaWYgKCF0aGlzLmRpc2FibGVVcGxvYWQpIHtcbiAgICAgIGlmICghaGVscGVycy5pc1N0cmluZyh0aGlzLl9wcmVDb2xsZWN0aW9uTmFtZSkgJiYgIXRoaXMuX3ByZUNvbGxlY3Rpb24pIHtcbiAgICAgICAgdGhpcy5fcHJlQ29sbGVjdGlvbk5hbWUgPSBgX19wcmVfJHt0aGlzLmNvbGxlY3Rpb25OYW1lfWA7XG4gICAgICB9XG5cbiAgICAgIGlmICghdGhpcy5fcHJlQ29sbGVjdGlvbikge1xuICAgICAgICB0aGlzLl9wcmVDb2xsZWN0aW9uID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24odGhpcy5fcHJlQ29sbGVjdGlvbk5hbWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcHJlQ29sbGVjdGlvbk5hbWUgPSB0aGlzLl9wcmVDb2xsZWN0aW9uLl9uYW1lO1xuICAgICAgfVxuICAgICAgY2hlY2sodGhpcy5fcHJlQ29sbGVjdGlvbk5hbWUsIFN0cmluZyk7XG5cbiAgICAgIHRoaXMuX3ByZUNvbGxlY3Rpb24uX2Vuc3VyZUluZGV4KHsgY3JlYXRlZEF0OiAxIH0sIHsgZXhwaXJlQWZ0ZXJTZWNvbmRzOiB0aGlzLmNvbnRpbnVlVXBsb2FkVFRMLCBiYWNrZ3JvdW5kOiB0cnVlIH0pO1xuICAgICAgY29uc3QgX3ByZUNvbGxlY3Rpb25DdXJzb3IgPSB0aGlzLl9wcmVDb2xsZWN0aW9uLmZpbmQoe30sIHtcbiAgICAgICAgZmllbGRzOiB7XG4gICAgICAgICAgX2lkOiAxLFxuICAgICAgICAgIGlzRmluaXNoZWQ6IDFcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIF9wcmVDb2xsZWN0aW9uQ3Vyc29yLm9ic2VydmUoe1xuICAgICAgICBjaGFuZ2VkKGRvYykge1xuICAgICAgICAgIGlmIChkb2MuaXNGaW5pc2hlZCkge1xuICAgICAgICAgICAgc2VsZi5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtfcHJlQ29sbGVjdGlvbkN1cnNvci5vYnNlcnZlXSBbY2hhbmdlZF06ICR7ZG9jLl9pZH1gKTtcbiAgICAgICAgICAgIHNlbGYuX3ByZUNvbGxlY3Rpb24ucmVtb3ZlKHtfaWQ6IGRvYy5faWR9LCBOT09QKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHJlbW92ZWQoZG9jKSB7XG4gICAgICAgICAgLy8gRnJlZSBtZW1vcnkgYWZ0ZXIgdXBsb2FkIGlzIGRvbmVcbiAgICAgICAgICAvLyBPciBpZiB1cGxvYWQgaXMgdW5maW5pc2hlZFxuICAgICAgICAgIHNlbGYuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbX3ByZUNvbGxlY3Rpb25DdXJzb3Iub2JzZXJ2ZV0gW3JlbW92ZWRdOiAke2RvYy5faWR9YCk7XG4gICAgICAgICAgaWYgKGhlbHBlcnMuaXNPYmplY3Qoc2VsZi5fY3VycmVudFVwbG9hZHNbZG9jLl9pZF0pKSB7XG4gICAgICAgICAgICBzZWxmLl9jdXJyZW50VXBsb2Fkc1tkb2MuX2lkXS5zdG9wKCk7XG4gICAgICAgICAgICBzZWxmLl9jdXJyZW50VXBsb2Fkc1tkb2MuX2lkXS5lbmQoKTtcblxuICAgICAgICAgICAgaWYgKCFkb2MuaXNGaW5pc2hlZCkge1xuICAgICAgICAgICAgICBzZWxmLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW19wcmVDb2xsZWN0aW9uQ3Vyc29yLm9ic2VydmVdIFtyZW1vdmVVbmZpbmlzaGVkVXBsb2FkXTogJHtkb2MuX2lkfWApO1xuICAgICAgICAgICAgICBzZWxmLl9jdXJyZW50VXBsb2Fkc1tkb2MuX2lkXS5hYm9ydCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkZWxldGUgc2VsZi5fY3VycmVudFVwbG9hZHNbZG9jLl9pZF07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5fY3JlYXRlU3RyZWFtID0gKF9pZCwgcGF0aCwgb3B0cykgPT4ge1xuICAgICAgICB0aGlzLl9jdXJyZW50VXBsb2Fkc1tfaWRdID0gbmV3IFdyaXRlU3RyZWFtKHBhdGgsIG9wdHMuZmlsZUxlbmd0aCwgb3B0cywgdGhpcy5wZXJtaXNzaW9ucyk7XG4gICAgICB9O1xuXG4gICAgICAvLyBUaGlzIGxpdHRsZSBmdW5jdGlvbiBhbGxvd3MgdG8gY29udGludWUgdXBsb2FkXG4gICAgICAvLyBldmVuIGFmdGVyIHNlcnZlciBpcyByZXN0YXJ0ZWQgKCpub3Qgb24gZGV2LXN0YWdlKilcbiAgICAgIHRoaXMuX2NvbnRpbnVlVXBsb2FkID0gKF9pZCkgPT4ge1xuICAgICAgICBpZiAodGhpcy5fY3VycmVudFVwbG9hZHNbX2lkXSAmJiB0aGlzLl9jdXJyZW50VXBsb2Fkc1tfaWRdLmZpbGUpIHtcbiAgICAgICAgICBpZiAoIXRoaXMuX2N1cnJlbnRVcGxvYWRzW19pZF0uYWJvcnRlZCAmJiAhdGhpcy5fY3VycmVudFVwbG9hZHNbX2lkXS5lbmRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2N1cnJlbnRVcGxvYWRzW19pZF0uZmlsZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5fY3JlYXRlU3RyZWFtKF9pZCwgdGhpcy5fY3VycmVudFVwbG9hZHNbX2lkXS5maWxlLmZpbGUucGF0aCwgdGhpcy5fY3VycmVudFVwbG9hZHNbX2lkXS5maWxlKTtcbiAgICAgICAgICByZXR1cm4gdGhpcy5fY3VycmVudFVwbG9hZHNbX2lkXS5maWxlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNvbnRVcGxkID0gdGhpcy5fcHJlQ29sbGVjdGlvbi5maW5kT25lKHtfaWR9KTtcbiAgICAgICAgaWYgKGNvbnRVcGxkKSB7XG4gICAgICAgICAgdGhpcy5fY3JlYXRlU3RyZWFtKF9pZCwgY29udFVwbGQuZmlsZS5wYXRoLCBjb250VXBsZCk7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX2N1cnJlbnRVcGxvYWRzW19pZF0uZmlsZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICghdGhpcy5zY2hlbWEpIHtcbiAgICAgIHRoaXMuc2NoZW1hID0gRmlsZXNDb2xsZWN0aW9uQ29yZS5zY2hlbWE7XG4gICAgfVxuXG4gICAgY2hlY2sodGhpcy5kZWJ1ZywgQm9vbGVhbik7XG4gICAgY2hlY2sodGhpcy5zY2hlbWEsIE9iamVjdCk7XG4gICAgY2hlY2sodGhpcy5wdWJsaWMsIEJvb2xlYW4pO1xuICAgIGNoZWNrKHRoaXMucHJvdGVjdGVkLCBNYXRjaC5PbmVPZihCb29sZWFuLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMuY2h1bmtTaXplLCBOdW1iZXIpO1xuICAgIGNoZWNrKHRoaXMuZG93bmxvYWRSb3V0ZSwgU3RyaW5nKTtcbiAgICBjaGVjayh0aGlzLm5hbWluZ0Z1bmN0aW9uLCBNYXRjaC5PbmVPZihmYWxzZSwgRnVuY3Rpb24pKTtcbiAgICBjaGVjayh0aGlzLm9uQmVmb3JlVXBsb2FkLCBNYXRjaC5PbmVPZihmYWxzZSwgRnVuY3Rpb24pKTtcbiAgICBjaGVjayh0aGlzLm9uSW5pdGlhdGVVcGxvYWQsIE1hdGNoLk9uZU9mKGZhbHNlLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMuYWxsb3dDbGllbnRDb2RlLCBCb29sZWFuKTtcblxuICAgIGlmICh0aGlzLnB1YmxpYyAmJiB0aGlzLnByb3RlY3RlZCkge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig1MDAsIGBbRmlsZXNDb2xsZWN0aW9uLiR7dGhpcy5jb2xsZWN0aW9uTmFtZX1dOiBGaWxlcyBjYW4gbm90IGJlIHB1YmxpYyBhbmQgcHJvdGVjdGVkIGF0IHRoZSBzYW1lIHRpbWUhYCk7XG4gICAgfVxuXG4gICAgdGhpcy5fY2hlY2tBY2Nlc3MgPSAoaHR0cCkgPT4ge1xuICAgICAgaWYgKHRoaXMucHJvdGVjdGVkKSB7XG4gICAgICAgIGxldCByZXN1bHQ7XG4gICAgICAgIGNvbnN0IHt1c2VyLCB1c2VySWR9ID0gdGhpcy5fZ2V0VXNlcihodHRwKTtcblxuICAgICAgICBpZiAoaGVscGVycy5pc0Z1bmN0aW9uKHRoaXMucHJvdGVjdGVkKSkge1xuICAgICAgICAgIGxldCBmaWxlUmVmO1xuICAgICAgICAgIGlmIChoZWxwZXJzLmlzT2JqZWN0KGh0dHAucGFyYW1zKSAmJiAgaHR0cC5wYXJhbXMuX2lkKSB7XG4gICAgICAgICAgICBmaWxlUmVmID0gdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUoaHR0cC5wYXJhbXMuX2lkKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXN1bHQgPSBodHRwID8gdGhpcy5wcm90ZWN0ZWQuY2FsbChPYmplY3QuYXNzaWduKGh0dHAsIHt1c2VyLCB1c2VySWR9KSwgKGZpbGVSZWYgfHwgbnVsbCkpIDogdGhpcy5wcm90ZWN0ZWQuY2FsbCh7dXNlciwgdXNlcklkfSwgKGZpbGVSZWYgfHwgbnVsbCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdCA9ICEhdXNlcklkO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKChodHRwICYmIChyZXN1bHQgPT09IHRydWUpKSB8fCAhaHR0cCkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmMgPSBoZWxwZXJzLmlzTnVtYmVyKHJlc3VsdCkgPyByZXN1bHQgOiA0MDE7XG4gICAgICAgIHRoaXMuX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uLl9jaGVja0FjY2Vzc10gV0FSTjogQWNjZXNzIGRlbmllZCEnKTtcbiAgICAgICAgaWYgKGh0dHApIHtcbiAgICAgICAgICBjb25zdCB0ZXh0ID0gJ0FjY2VzcyBkZW5pZWQhJztcbiAgICAgICAgICBpZiAoIWh0dHAucmVzcG9uc2UuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgICAgIGh0dHAucmVzcG9uc2Uud3JpdGVIZWFkKHJjLCB7XG4gICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAndGV4dC9wbGFpbicsXG4gICAgICAgICAgICAgICdDb250ZW50LUxlbmd0aCc6IHRleHQubGVuZ3RoXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIWh0dHAucmVzcG9uc2UuZmluaXNoZWQpIHtcbiAgICAgICAgICAgIGh0dHAucmVzcG9uc2UuZW5kKHRleHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICB0aGlzLl9tZXRob2ROYW1lcyA9IHtcbiAgICAgIF9BYm9ydDogYF9GaWxlc0NvbGxlY3Rpb25BYm9ydF8ke3RoaXMuY29sbGVjdGlvbk5hbWV9YCxcbiAgICAgIF9Xcml0ZTogYF9GaWxlc0NvbGxlY3Rpb25Xcml0ZV8ke3RoaXMuY29sbGVjdGlvbk5hbWV9YCxcbiAgICAgIF9TdGFydDogYF9GaWxlc0NvbGxlY3Rpb25TdGFydF8ke3RoaXMuY29sbGVjdGlvbk5hbWV9YCxcbiAgICAgIF9SZW1vdmU6IGBfRmlsZXNDb2xsZWN0aW9uUmVtb3ZlXyR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gXG4gICAgfTtcblxuICAgIHRoaXMub24oJ19oYW5kbGVVcGxvYWQnLCB0aGlzLl9oYW5kbGVVcGxvYWQpO1xuICAgIHRoaXMub24oJ19maW5pc2hVcGxvYWQnLCB0aGlzLl9maW5pc2hVcGxvYWQpO1xuICAgIHRoaXMuX2hhbmRsZVVwbG9hZFN5bmMgPSBNZXRlb3Iud3JhcEFzeW5jKHRoaXMuX2hhbmRsZVVwbG9hZC5iaW5kKHRoaXMpKTtcblxuICAgIGlmICh0aGlzLmRpc2FibGVVcGxvYWQgJiYgdGhpcy5kaXNhYmxlRG93bmxvYWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgV2ViQXBwLmNvbm5lY3RIYW5kbGVycy51c2UoKGh0dHBSZXEsIGh0dHBSZXNwLCBuZXh0KSA9PiB7XG4gICAgICBpZiAoIXRoaXMuZGlzYWJsZVVwbG9hZCAmJiAhIX5odHRwUmVxLl9wYXJzZWRVcmwucGF0aC5pbmRleE9mKGAke3RoaXMuZG93bmxvYWRSb3V0ZX0vJHt0aGlzLmNvbGxlY3Rpb25OYW1lfS9fX3VwbG9hZGApKSB7XG4gICAgICAgIGlmIChodHRwUmVxLm1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgICAgICAgY29uc3QgaGFuZGxlRXJyb3IgPSAoX2Vycm9yKSA9PiB7XG4gICAgICAgICAgICBsZXQgZXJyb3IgPSBfZXJyb3I7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tGaWxlc0NvbGxlY3Rpb25dIFtVcGxvYWRdIFtIVFRQXSBFeGNlcHRpb246JywgZXJyb3IpO1xuICAgICAgICAgICAgY29uc29sZS50cmFjZSgpO1xuXG4gICAgICAgICAgICBpZiAoIWh0dHBSZXNwLmhlYWRlcnNTZW50KSB7XG4gICAgICAgICAgICAgIGh0dHBSZXNwLndyaXRlSGVhZCg1MDApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWh0dHBSZXNwLmZpbmlzaGVkKSB7XG4gICAgICAgICAgICAgIGlmIChoZWxwZXJzLmlzT2JqZWN0KGVycm9yKSAmJiBoZWxwZXJzLmlzRnVuY3Rpb24oZXJyb3IudG9TdHJpbmcpKSB7XG4gICAgICAgICAgICAgICAgZXJyb3IgPSBlcnJvci50b1N0cmluZygpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKCFoZWxwZXJzLmlzU3RyaW5nKGVycm9yKSkge1xuICAgICAgICAgICAgICAgIGVycm9yID0gJ1VuZXhwZWN0ZWQgZXJyb3IhJztcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGh0dHBSZXNwLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgbGV0IGJvZHkgPSAnJztcbiAgICAgICAgICBodHRwUmVxLm9uKCdkYXRhJywgKGRhdGEpID0+IGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAgIGJvZHkgKz0gZGF0YTtcbiAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICBodHRwUmVxLm9uKCdlbmQnLCAoKSA9PiBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBsZXQgb3B0cztcbiAgICAgICAgICAgICAgbGV0IHJlc3VsdDtcbiAgICAgICAgICAgICAgbGV0IHVzZXI7XG5cbiAgICAgICAgICAgICAgaWYgKGh0dHBSZXEuaGVhZGVyc1sneC1tdG9rJ10gJiYgaGVscGVycy5pc09iamVjdChNZXRlb3Iuc2VydmVyLnNlc3Npb25zKSAmJiBoZWxwZXJzLmhhcyhNZXRlb3Iuc2VydmVyLnNlc3Npb25zW2h0dHBSZXEuaGVhZGVyc1sneC1tdG9rJ11dLCAndXNlcklkJykpIHtcbiAgICAgICAgICAgICAgICB1c2VyID0ge1xuICAgICAgICAgICAgICAgICAgdXNlcklkOiBNZXRlb3Iuc2VydmVyLnNlc3Npb25zW2h0dHBSZXEuaGVhZGVyc1sneC1tdG9rJ11dLnVzZXJJZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdXNlciA9IHRoaXMuX2dldFVzZXIoe3JlcXVlc3Q6IGh0dHBSZXEsIHJlc3BvbnNlOiBodHRwUmVzcH0pO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKGh0dHBSZXEuaGVhZGVyc1sneC1zdGFydCddICE9PSAnMScpIHtcbiAgICAgICAgICAgICAgICBvcHRzID0ge1xuICAgICAgICAgICAgICAgICAgZmlsZUlkOiBodHRwUmVxLmhlYWRlcnNbJ3gtZmlsZWlkJ11cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgaWYgKGh0dHBSZXEuaGVhZGVyc1sneC1lb2YnXSA9PT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgICBvcHRzLmVvZiA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgQnVmZmVyLmZyb20gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICBvcHRzLmJpbkRhdGEgPSBCdWZmZXIuZnJvbShib2R5LCAnYmFzZTY0Jyk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGJ1ZmZFcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICBvcHRzLmJpbkRhdGEgPSBuZXcgQnVmZmVyKGJvZHksICdiYXNlNjQnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0cy5iaW5EYXRhID0gbmV3IEJ1ZmZlcihib2R5LCAnYmFzZTY0Jyk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBvcHRzLmNodW5rSWQgPSBwYXJzZUludChodHRwUmVxLmhlYWRlcnNbJ3gtY2h1bmtpZCddKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBfY29udGludWVVcGxvYWQgPSB0aGlzLl9jb250aW51ZVVwbG9hZChvcHRzLmZpbGVJZCk7XG4gICAgICAgICAgICAgICAgaWYgKCFfY29udGludWVVcGxvYWQpIHtcbiAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDA4LCAnQ2FuXFwndCBjb250aW51ZSB1cGxvYWQsIHNlc3Npb24gZXhwaXJlZC4gU3RhcnQgdXBsb2FkIGFnYWluLicpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICh7cmVzdWx0LCBvcHRzfSAgPSB0aGlzLl9wcmVwYXJlVXBsb2FkKE9iamVjdC5hc3NpZ24ob3B0cywgX2NvbnRpbnVlVXBsb2FkKSwgdXNlci51c2VySWQsICdIVFRQJykpO1xuXG4gICAgICAgICAgICAgICAgaWYgKG9wdHMuZW9mKSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVVcGxvYWQocmVzdWx0LCBvcHRzLCAoX2Vycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBlcnJvciA9IF9lcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5oZWFkZXJzU2VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHR0cFJlc3Aud3JpdGVIZWFkKDUwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5maW5pc2hlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhlbHBlcnMuaXNPYmplY3QoZXJyb3IpICYmIGhlbHBlcnMuaXNGdW5jdGlvbihlcnJvci50b1N0cmluZykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IgPSBlcnJvci50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWhlbHBlcnMuaXNTdHJpbmcoZXJyb3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yID0gJ1VuZXhwZWN0ZWQgZXJyb3IhJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaHR0cFJlc3AuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3IgfSkpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICghaHR0cFJlc3AuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBodHRwUmVzcC53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChoZWxwZXJzLmlzT2JqZWN0KHJlc3VsdC5maWxlKSAmJiByZXN1bHQuZmlsZS5tZXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmZpbGUubWV0YSA9IGZpeEpTT05TdHJpbmdpZnkocmVzdWx0LmZpbGUubWV0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoIWh0dHBSZXNwLmZpbmlzaGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgaHR0cFJlc3AuZW5kKEpTT04uc3RyaW5naWZ5KHJlc3VsdCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ19oYW5kbGVVcGxvYWQnLCByZXN1bHQsIG9wdHMsIE5PT1ApO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5oZWFkZXJzU2VudCkge1xuICAgICAgICAgICAgICAgICAgaHR0cFJlc3Aud3JpdGVIZWFkKDIwNCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghaHR0cFJlc3AuZmluaXNoZWQpIHtcbiAgICAgICAgICAgICAgICAgIGh0dHBSZXNwLmVuZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgb3B0cyA9IEpTT04ucGFyc2UoYm9keSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoanNvbkVycikge1xuICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQ2FuXFwndCBwYXJzZSBpbmNvbWluZyBKU09OIGZyb20gQ2xpZW50IG9uIFsuaW5zZXJ0KCkgfCB1cGxvYWRdLCBzb21ldGhpbmcgd2VudCB3cm9uZyEnLCBqc29uRXJyKTtcbiAgICAgICAgICAgICAgICAgIG9wdHMgPSB7ZmlsZToge319O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICghaGVscGVycy5pc09iamVjdChvcHRzLmZpbGUpKSB7XG4gICAgICAgICAgICAgICAgICBvcHRzLmZpbGUgPSB7fTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBvcHRzLl9fX3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZSBTdGFydCBIVFRQXSAke29wdHMuZmlsZS5uYW1lIHx8ICdbbm8tbmFtZV0nfSAtICR7b3B0cy5maWxlSWR9YCk7XG4gICAgICAgICAgICAgICAgaWYgKGhlbHBlcnMuaXNPYmplY3Qob3B0cy5maWxlKSAmJiBvcHRzLmZpbGUubWV0YSkge1xuICAgICAgICAgICAgICAgICAgb3B0cy5maWxlLm1ldGEgPSBmaXhKU09OUGFyc2Uob3B0cy5maWxlLm1ldGEpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICh7cmVzdWx0fSA9IHRoaXMuX3ByZXBhcmVVcGxvYWQoaGVscGVycy5jbG9uZShvcHRzKSwgdXNlci51c2VySWQsICdIVFRQIFN0YXJ0IE1ldGhvZCcpKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShyZXN1bHQuX2lkKSkge1xuICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDAsICdDYW5cXCd0IHN0YXJ0IHVwbG9hZCwgZGF0YSBzdWJzdGl0dXRpb24gZGV0ZWN0ZWQhJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgb3B0cy5faWQgICAgICAgPSBvcHRzLmZpbGVJZDtcbiAgICAgICAgICAgICAgICBvcHRzLmNyZWF0ZWRBdCA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgb3B0cy5tYXhMZW5ndGggPSBvcHRzLmZpbGVMZW5ndGg7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJlQ29sbGVjdGlvbi5pbnNlcnQoaGVscGVycy5vbWl0KG9wdHMsICdfX19zJykpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2NyZWF0ZVN0cmVhbShyZXN1bHQuX2lkLCByZXN1bHQucGF0aCwgaGVscGVycy5vbWl0KG9wdHMsICdfX19zJykpO1xuXG4gICAgICAgICAgICAgICAgaWYgKG9wdHMucmV0dXJuTWV0YSkge1xuICAgICAgICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5oZWFkZXJzU2VudCkge1xuICAgICAgICAgICAgICAgICAgICBodHRwUmVzcC53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5maW5pc2hlZCkge1xuICAgICAgICAgICAgICAgICAgICBodHRwUmVzcC5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgIHVwbG9hZFJvdXRlOiBgJHt0aGlzLmRvd25sb2FkUm91dGV9LyR7dGhpcy5jb2xsZWN0aW9uTmFtZX0vX191cGxvYWRgLFxuICAgICAgICAgICAgICAgICAgICAgIGZpbGU6IHJlc3VsdFxuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGlmICghaHR0cFJlc3AuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaHR0cFJlc3Aud3JpdGVIZWFkKDIwNCk7XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGlmICghaHR0cFJlc3AuZmluaXNoZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaHR0cFJlc3AuZW5kKCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChodHRwUmVzcEVycikge1xuICAgICAgICAgICAgICBoYW5kbGVFcnJvcihodHRwUmVzcEVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICghdGhpcy5kaXNhYmxlRG93bmxvYWQpIHtcbiAgICAgICAgbGV0IGh0dHA7XG4gICAgICAgIGxldCBwYXJhbXM7XG4gICAgICAgIGxldCB1cmk7XG4gICAgICAgIGxldCB1cmlzO1xuXG4gICAgICAgIGlmICghdGhpcy5wdWJsaWMpIHtcbiAgICAgICAgICBpZiAoISF+aHR0cFJlcS5fcGFyc2VkVXJsLnBhdGguaW5kZXhPZihgJHt0aGlzLmRvd25sb2FkUm91dGV9LyR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gKSkge1xuICAgICAgICAgICAgdXJpID0gaHR0cFJlcS5fcGFyc2VkVXJsLnBhdGgucmVwbGFjZShgJHt0aGlzLmRvd25sb2FkUm91dGV9LyR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gLCAnJyk7XG4gICAgICAgICAgICBpZiAodXJpLmluZGV4T2YoJy8nKSA9PT0gMCkge1xuICAgICAgICAgICAgICB1cmkgPSB1cmkuc3Vic3RyaW5nKDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB1cmlzID0gdXJpLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICBpZiAodXJpcy5sZW5ndGggPT09IDMpIHtcbiAgICAgICAgICAgICAgcGFyYW1zID0ge1xuICAgICAgICAgICAgICAgIF9pZDogdXJpc1swXSxcbiAgICAgICAgICAgICAgICBxdWVyeTogaHR0cFJlcS5fcGFyc2VkVXJsLnF1ZXJ5ID8gbm9kZVFzLnBhcnNlKGh0dHBSZXEuX3BhcnNlZFVybC5xdWVyeSkgOiB7fSxcbiAgICAgICAgICAgICAgICBuYW1lOiB1cmlzWzJdLnNwbGl0KCc/JylbMF0sXG4gICAgICAgICAgICAgICAgdmVyc2lvbjogdXJpc1sxXVxuICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgIGh0dHAgPSB7cmVxdWVzdDogaHR0cFJlcSwgcmVzcG9uc2U6IGh0dHBSZXNwLCBwYXJhbXN9O1xuICAgICAgICAgICAgICBpZiAodGhpcy5fY2hlY2tBY2Nlc3MoaHR0cCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRvd25sb2FkKGh0dHAsIHVyaXNbMV0sIHRoaXMuY29sbGVjdGlvbi5maW5kT25lKHVyaXNbMF0pKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICghIX5odHRwUmVxLl9wYXJzZWRVcmwucGF0aC5pbmRleE9mKGAke3RoaXMuZG93bmxvYWRSb3V0ZX1gKSkge1xuICAgICAgICAgICAgdXJpID0gaHR0cFJlcS5fcGFyc2VkVXJsLnBhdGgucmVwbGFjZShgJHt0aGlzLmRvd25sb2FkUm91dGV9YCwgJycpO1xuICAgICAgICAgICAgaWYgKHVyaS5pbmRleE9mKCcvJykgPT09IDApIHtcbiAgICAgICAgICAgICAgdXJpID0gdXJpLnN1YnN0cmluZygxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdXJpcyAgPSB1cmkuc3BsaXQoJy8nKTtcbiAgICAgICAgICAgIGxldCBfZmlsZSA9IHVyaXNbdXJpcy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIGlmIChfZmlsZSkge1xuICAgICAgICAgICAgICBsZXQgdmVyc2lvbjtcbiAgICAgICAgICAgICAgaWYgKCEhfl9maWxlLmluZGV4T2YoJy0nKSkge1xuICAgICAgICAgICAgICAgIHZlcnNpb24gPSBfZmlsZS5zcGxpdCgnLScpWzBdO1xuICAgICAgICAgICAgICAgIF9maWxlICAgPSBfZmlsZS5zcGxpdCgnLScpWzFdLnNwbGl0KCc/JylbMF07XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmVyc2lvbiA9ICdvcmlnaW5hbCc7XG4gICAgICAgICAgICAgICAgX2ZpbGUgICA9IF9maWxlLnNwbGl0KCc/JylbMF07XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBwYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgcXVlcnk6IGh0dHBSZXEuX3BhcnNlZFVybC5xdWVyeSA/IG5vZGVRcy5wYXJzZShodHRwUmVxLl9wYXJzZWRVcmwucXVlcnkpIDoge30sXG4gICAgICAgICAgICAgICAgZmlsZTogX2ZpbGUsXG4gICAgICAgICAgICAgICAgX2lkOiBfZmlsZS5zcGxpdCgnLicpWzBdLFxuICAgICAgICAgICAgICAgIHZlcnNpb24sXG4gICAgICAgICAgICAgICAgbmFtZTogX2ZpbGVcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgaHR0cCA9IHtyZXF1ZXN0OiBodHRwUmVxLCByZXNwb25zZTogaHR0cFJlc3AsIHBhcmFtc307XG4gICAgICAgICAgICAgIHRoaXMuZG93bmxvYWQoaHR0cCwgdmVyc2lvbiwgdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUocGFyYW1zLl9pZCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIG5leHQoKTtcbiAgICB9KTtcblxuICAgIGlmICghdGhpcy5kaXNhYmxlVXBsb2FkKSB7XG4gICAgICBjb25zdCBfbWV0aG9kcyA9IHt9O1xuXG4gICAgICAvLyBNZXRob2QgdXNlZCB0byByZW1vdmUgZmlsZVxuICAgICAgLy8gZnJvbSBDbGllbnQgc2lkZVxuICAgICAgX21ldGhvZHNbdGhpcy5fbWV0aG9kTmFtZXMuX1JlbW92ZV0gPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgICAgY2hlY2soc2VsZWN0b3IsIE1hdGNoLk9uZU9mKFN0cmluZywgT2JqZWN0KSk7XG4gICAgICAgIHNlbGYuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbVW5saW5rIE1ldGhvZF0gWy5yZW1vdmUoJHtzZWxlY3Rvcn0pXWApO1xuXG4gICAgICAgIGlmIChzZWxmLmFsbG93Q2xpZW50Q29kZSkge1xuICAgICAgICAgIGlmIChzZWxmLm9uQmVmb3JlUmVtb3ZlICYmIGhlbHBlcnMuaXNGdW5jdGlvbihzZWxmLm9uQmVmb3JlUmVtb3ZlKSkge1xuICAgICAgICAgICAgY29uc3QgdXNlcklkID0gdGhpcy51c2VySWQ7XG4gICAgICAgICAgICBjb25zdCB1c2VyRnVuY3MgPSB7XG4gICAgICAgICAgICAgIHVzZXJJZDogdGhpcy51c2VySWQsXG4gICAgICAgICAgICAgIHVzZXIoKSB7XG4gICAgICAgICAgICAgICAgaWYgKE1ldGVvci51c2Vycykge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIE1ldGVvci51c2Vycy5maW5kT25lKHVzZXJJZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAoIXNlbGYub25CZWZvcmVSZW1vdmUuY2FsbCh1c2VyRnVuY3MsIChzZWxmLmZpbmQoc2VsZWN0b3IpIHx8IG51bGwpKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgJ1tGaWxlc0NvbGxlY3Rpb25dIFtyZW1vdmVdIE5vdCBwZXJtaXR0ZWQhJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgY3Vyc29yID0gc2VsZi5maW5kKHNlbGVjdG9yKTtcbiAgICAgICAgICBpZiAoY3Vyc29yLmNvdW50KCkgPiAwKSB7XG4gICAgICAgICAgICBzZWxmLnJlbW92ZShzZWxlY3Rvcik7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDQsICdDdXJzb3IgaXMgZW1wdHksIG5vIGZpbGVzIGlzIHJlbW92ZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMSwgJ1tGaWxlc0NvbGxlY3Rpb25dIFtyZW1vdmVdIFJ1biBjb2RlIGZyb20gY2xpZW50IGlzIG5vdCBhbGxvd2VkIScpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG5cbiAgICAgIC8vIE1ldGhvZCB1c2VkIHRvIHJlY2VpdmUgXCJmaXJzdCBieXRlXCIgb2YgdXBsb2FkXG4gICAgICAvLyBhbmQgYWxsIGZpbGUncyBtZXRhLWRhdGEsIHNvXG4gICAgICAvLyBpdCB3b24ndCBiZSB0cmFuc2ZlcnJlZCB3aXRoIGV2ZXJ5IGNodW5rXG4gICAgICAvLyBCYXNpY2FsbHkgaXQgcHJlcGFyZXMgZXZlcnl0aGluZ1xuICAgICAgLy8gU28gdXNlciBjYW4gcGF1c2UvZGlzY29ubmVjdCBhbmRcbiAgICAgIC8vIGNvbnRpbnVlIHVwbG9hZCBsYXRlciwgZHVyaW5nIGBjb250aW51ZVVwbG9hZFRUTGBcbiAgICAgIF9tZXRob2RzW3RoaXMuX21ldGhvZE5hbWVzLl9TdGFydF0gPSBmdW5jdGlvbiAob3B0cywgcmV0dXJuTWV0YSkge1xuICAgICAgICBjaGVjayhvcHRzLCB7XG4gICAgICAgICAgZmlsZTogT2JqZWN0LFxuICAgICAgICAgIGZpbGVJZDogU3RyaW5nLFxuICAgICAgICAgIEZTTmFtZTogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcbiAgICAgICAgICBjaHVua1NpemU6IE51bWJlcixcbiAgICAgICAgICBmaWxlTGVuZ3RoOiBOdW1iZXJcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2hlY2socmV0dXJuTWV0YSwgTWF0Y2guT3B0aW9uYWwoQm9vbGVhbikpO1xuXG4gICAgICAgIHNlbGYuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZSBTdGFydCBNZXRob2RdICR7b3B0cy5maWxlLm5hbWV9IC0gJHtvcHRzLmZpbGVJZH1gKTtcbiAgICAgICAgb3B0cy5fX19zID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgeyByZXN1bHQgfSA9IHNlbGYuX3ByZXBhcmVVcGxvYWQoaGVscGVycy5jbG9uZShvcHRzKSwgdGhpcy51c2VySWQsICdERFAgU3RhcnQgTWV0aG9kJyk7XG5cbiAgICAgICAgaWYgKHNlbGYuY29sbGVjdGlvbi5maW5kT25lKHJlc3VsdC5faWQpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDAsICdDYW5cXCd0IHN0YXJ0IHVwbG9hZCwgZGF0YSBzdWJzdGl0dXRpb24gZGV0ZWN0ZWQhJyk7XG4gICAgICAgIH1cblxuICAgICAgICBvcHRzLl9pZCAgICAgICA9IG9wdHMuZmlsZUlkO1xuICAgICAgICBvcHRzLmNyZWF0ZWRBdCA9IG5ldyBEYXRlKCk7XG4gICAgICAgIG9wdHMubWF4TGVuZ3RoID0gb3B0cy5maWxlTGVuZ3RoO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHNlbGYuX3ByZUNvbGxlY3Rpb24uaW5zZXJ0KGhlbHBlcnMub21pdChvcHRzLCAnX19fcycpKTtcbiAgICAgICAgICBzZWxmLl9jcmVhdGVTdHJlYW0ocmVzdWx0Ll9pZCwgcmVzdWx0LnBhdGgsIGhlbHBlcnMub21pdChvcHRzLCAnX19fcycpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHNlbGYuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZSBTdGFydCBNZXRob2RdIFtFWENFUFRJT046XSAke29wdHMuZmlsZS5uYW1lfSAtICR7b3B0cy5maWxlSWR9YCwgZSk7XG4gICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig1MDAsICdDYW5cXCd0IHN0YXJ0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmV0dXJuTWV0YSkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB1cGxvYWRSb3V0ZTogYCR7c2VsZi5kb3dubG9hZFJvdXRlfS8ke3NlbGYuY29sbGVjdGlvbk5hbWV9L19fdXBsb2FkYCxcbiAgICAgICAgICAgIGZpbGU6IHJlc3VsdFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9O1xuXG5cbiAgICAgIC8vIE1ldGhvZCB1c2VkIHRvIHdyaXRlIGZpbGUgY2h1bmtzXG4gICAgICAvLyBpdCByZWNlaXZlcyB2ZXJ5IGxpbWl0ZWQgYW1vdW50IG9mIG1ldGEtZGF0YVxuICAgICAgLy8gVGhpcyBtZXRob2QgYWxzbyByZXNwb25zaWJsZSBmb3IgRU9GXG4gICAgICBfbWV0aG9kc1t0aGlzLl9tZXRob2ROYW1lcy5fV3JpdGVdID0gZnVuY3Rpb24gKF9vcHRzKSB7XG4gICAgICAgIGxldCBvcHRzID0gX29wdHM7XG4gICAgICAgIGxldCByZXN1bHQ7XG4gICAgICAgIGNoZWNrKG9wdHMsIHtcbiAgICAgICAgICBlb2Y6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pLFxuICAgICAgICAgIGZpbGVJZDogU3RyaW5nLFxuICAgICAgICAgIGJpbkRhdGE6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG4gICAgICAgICAgY2h1bmtJZDogTWF0Y2guT3B0aW9uYWwoTnVtYmVyKVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAob3B0cy5iaW5EYXRhKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBCdWZmZXIuZnJvbSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgb3B0cy5iaW5EYXRhID0gQnVmZmVyLmZyb20ob3B0cy5iaW5EYXRhLCAnYmFzZTY0Jyk7XG4gICAgICAgICAgICB9IGNhdGNoIChidWZmRXJyKSB7XG4gICAgICAgICAgICAgIG9wdHMuYmluRGF0YSA9IG5ldyBCdWZmZXIob3B0cy5iaW5EYXRhLCAnYmFzZTY0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdHMuYmluRGF0YSA9IG5ldyBCdWZmZXIob3B0cy5iaW5EYXRhLCAnYmFzZTY0Jyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgX2NvbnRpbnVlVXBsb2FkID0gc2VsZi5fY29udGludWVVcGxvYWQob3B0cy5maWxlSWQpO1xuICAgICAgICBpZiAoIV9jb250aW51ZVVwbG9hZCkge1xuICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDA4LCAnQ2FuXFwndCBjb250aW51ZSB1cGxvYWQsIHNlc3Npb24gZXhwaXJlZC4gU3RhcnQgdXBsb2FkIGFnYWluLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgICh7cmVzdWx0LCBvcHRzfSA9IHNlbGYuX3ByZXBhcmVVcGxvYWQoT2JqZWN0LmFzc2lnbihvcHRzLCBfY29udGludWVVcGxvYWQpLCB0aGlzLnVzZXJJZCwgJ0REUCcpKTtcblxuICAgICAgICBpZiAob3B0cy5lb2YpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYuX2hhbmRsZVVwbG9hZFN5bmMocmVzdWx0LCBvcHRzKTtcbiAgICAgICAgICB9IGNhdGNoIChoYW5kbGVVcGxvYWRFcnIpIHtcbiAgICAgICAgICAgIHNlbGYuX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbV3JpdGUgTWV0aG9kXSBbRERQXSBFeGNlcHRpb246JywgaGFuZGxlVXBsb2FkRXJyKTtcbiAgICAgICAgICAgIHRocm93IGhhbmRsZVVwbG9hZEVycjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2VsZi5lbWl0KCdfaGFuZGxlVXBsb2FkJywgcmVzdWx0LCBvcHRzLCBOT09QKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH07XG5cbiAgICAgIC8vIE1ldGhvZCB1c2VkIHRvIEFib3J0IHVwbG9hZFxuICAgICAgLy8gLSBGZWVpbmcgbWVtb3J5IGJ5IC5lbmQoKWluZyB3cml0YWJsZVN0cmVhbXNcbiAgICAgIC8vIC0gUmVtb3ZpbmcgdGVtcG9yYXJ5IHJlY29yZCBmcm9tIEBfcHJlQ29sbGVjdGlvblxuICAgICAgLy8gLSBSZW1vdmluZyByZWNvcmQgZnJvbSBAY29sbGVjdGlvblxuICAgICAgLy8gLSAudW5saW5rKClpbmcgY2h1bmtzIGZyb20gRlNcbiAgICAgIF9tZXRob2RzW3RoaXMuX21ldGhvZE5hbWVzLl9BYm9ydF0gPSBmdW5jdGlvbiAoX2lkKSB7XG4gICAgICAgIGNoZWNrKF9pZCwgU3RyaW5nKTtcblxuICAgICAgICBjb25zdCBfY29udGludWVVcGxvYWQgPSBzZWxmLl9jb250aW51ZVVwbG9hZChfaWQpO1xuICAgICAgICBzZWxmLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW0Fib3J0IE1ldGhvZF06ICR7X2lkfSAtICR7KGhlbHBlcnMuaXNPYmplY3QoX2NvbnRpbnVlVXBsb2FkLmZpbGUpID8gX2NvbnRpbnVlVXBsb2FkLmZpbGUucGF0aCA6ICcnKX1gKTtcblxuICAgICAgICBpZiAoc2VsZi5fY3VycmVudFVwbG9hZHMgJiYgc2VsZi5fY3VycmVudFVwbG9hZHNbX2lkXSkge1xuICAgICAgICAgIHNlbGYuX2N1cnJlbnRVcGxvYWRzW19pZF0uc3RvcCgpO1xuICAgICAgICAgIHNlbGYuX2N1cnJlbnRVcGxvYWRzW19pZF0uYWJvcnQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChfY29udGludWVVcGxvYWQpIHtcbiAgICAgICAgICBzZWxmLl9wcmVDb2xsZWN0aW9uLnJlbW92ZSh7X2lkfSk7XG4gICAgICAgICAgc2VsZi5yZW1vdmUoe19pZH0pO1xuICAgICAgICAgIGlmIChoZWxwZXJzLmlzT2JqZWN0KF9jb250aW51ZVVwbG9hZC5maWxlKSAmJiBfY29udGludWVVcGxvYWQuZmlsZS5wYXRoKSB7XG4gICAgICAgICAgICBzZWxmLnVubGluayh7X2lkLCBwYXRoOiBfY29udGludWVVcGxvYWQuZmlsZS5wYXRofSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfTtcblxuICAgICAgTWV0ZW9yLm1ldGhvZHMoX21ldGhvZHMpO1xuICAgIH1cbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSBfcHJlcGFyZVVwbG9hZFxuICAgKiBAc3VtbWFyeSBJbnRlcm5hbCBtZXRob2QuIFVzZWQgdG8gb3B0aW1pemUgcmVjZWl2ZWQgZGF0YSBhbmQgY2hlY2sgdXBsb2FkIHBlcm1pc3Npb25cbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIF9wcmVwYXJlVXBsb2FkKG9wdHMgPSB7fSwgdXNlcklkLCB0cmFuc3BvcnQpIHtcbiAgICBsZXQgY3R4O1xuICAgIGlmICghaGVscGVycy5pc0Jvb2xlYW4ob3B0cy5lb2YpKSB7XG4gICAgICBvcHRzLmVvZiA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghb3B0cy5iaW5EYXRhKSB7XG4gICAgICBvcHRzLmJpbkRhdGEgPSAnRU9GJztcbiAgICB9XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNOdW1iZXIob3B0cy5jaHVua0lkKSkge1xuICAgICAgb3B0cy5jaHVua0lkID0gLTE7XG4gICAgfVxuXG4gICAgaWYgKCFoZWxwZXJzLmlzU3RyaW5nKG9wdHMuRlNOYW1lKSkge1xuICAgICAgb3B0cy5GU05hbWUgPSBvcHRzLmZpbGVJZDtcbiAgICB9XG5cbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW1VwbG9hZF0gWyR7dHJhbnNwb3J0fV0gR290ICMke29wdHMuY2h1bmtJZH0vJHtvcHRzLmZpbGVMZW5ndGh9IGNodW5rcywgZHN0OiAke29wdHMuZmlsZS5uYW1lIHx8IG9wdHMuZmlsZS5maWxlTmFtZX1gKTtcblxuICAgIGNvbnN0IGZpbGVOYW1lID0gdGhpcy5fZ2V0RmlsZU5hbWUob3B0cy5maWxlKTtcbiAgICBjb25zdCB7ZXh0ZW5zaW9uLCBleHRlbnNpb25XaXRoRG90fSA9IHRoaXMuX2dldEV4dChmaWxlTmFtZSk7XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNPYmplY3Qob3B0cy5maWxlLm1ldGEpKSB7XG4gICAgICBvcHRzLmZpbGUubWV0YSA9IHt9O1xuICAgIH1cblxuICAgIGxldCByZXN1bHQgICAgICAgPSBvcHRzLmZpbGU7XG4gICAgcmVzdWx0Lm5hbWUgICAgICA9IGZpbGVOYW1lO1xuICAgIHJlc3VsdC5tZXRhICAgICAgPSBvcHRzLmZpbGUubWV0YTtcbiAgICByZXN1bHQuZXh0ZW5zaW9uID0gZXh0ZW5zaW9uO1xuICAgIHJlc3VsdC5leHQgICAgICAgPSBleHRlbnNpb247XG4gICAgcmVzdWx0Ll9pZCAgICAgICA9IG9wdHMuZmlsZUlkO1xuICAgIHJlc3VsdC51c2VySWQgICAgPSB1c2VySWQgfHwgbnVsbDtcbiAgICBvcHRzLkZTTmFtZSAgICAgID0gb3B0cy5GU05hbWUucmVwbGFjZSgvKFteYS16MC05XFwtXFxfXSspL2dpLCAnLScpO1xuICAgIHJlc3VsdC5wYXRoICAgICAgPSBgJHt0aGlzLnN0b3JhZ2VQYXRoKHJlc3VsdCl9JHtub2RlUGF0aC5zZXB9JHtvcHRzLkZTTmFtZX0ke2V4dGVuc2lvbldpdGhEb3R9YDtcbiAgICByZXN1bHQgICAgICAgICAgID0gT2JqZWN0LmFzc2lnbihyZXN1bHQsIHRoaXMuX2RhdGFUb1NjaGVtYShyZXN1bHQpKTtcblxuICAgIGlmICh0aGlzLm9uQmVmb3JlVXBsb2FkICYmIGhlbHBlcnMuaXNGdW5jdGlvbih0aGlzLm9uQmVmb3JlVXBsb2FkKSkge1xuICAgICAgY3R4ID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgIGZpbGU6IG9wdHMuZmlsZVxuICAgICAgfSwge1xuICAgICAgICBjaHVua0lkOiBvcHRzLmNodW5rSWQsXG4gICAgICAgIHVzZXJJZDogcmVzdWx0LnVzZXJJZCxcbiAgICAgICAgdXNlcigpIHtcbiAgICAgICAgICBpZiAoTWV0ZW9yLnVzZXJzICYmIHJlc3VsdC51c2VySWQpIHtcbiAgICAgICAgICAgIHJldHVybiBNZXRlb3IudXNlcnMuZmluZE9uZShyZXN1bHQudXNlcklkKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0sXG4gICAgICAgIGVvZjogb3B0cy5lb2ZcbiAgICAgIH0pO1xuICAgICAgY29uc3QgaXNVcGxvYWRBbGxvd2VkID0gdGhpcy5vbkJlZm9yZVVwbG9hZC5jYWxsKGN0eCwgcmVzdWx0KTtcblxuICAgICAgaWYgKGlzVXBsb2FkQWxsb3dlZCAhPT0gdHJ1ZSkge1xuICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgaGVscGVycy5pc1N0cmluZyhpc1VwbG9hZEFsbG93ZWQpID8gaXNVcGxvYWRBbGxvd2VkIDogJ0BvbkJlZm9yZVVwbG9hZCgpIHJldHVybmVkIGZhbHNlJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoKG9wdHMuX19fcyA9PT0gdHJ1ZSkgJiYgdGhpcy5vbkluaXRpYXRlVXBsb2FkICYmIGhlbHBlcnMuaXNGdW5jdGlvbih0aGlzLm9uSW5pdGlhdGVVcGxvYWQpKSB7XG4gICAgICAgICAgdGhpcy5vbkluaXRpYXRlVXBsb2FkLmNhbGwoY3R4LCByZXN1bHQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICgob3B0cy5fX19zID09PSB0cnVlKSAmJiB0aGlzLm9uSW5pdGlhdGVVcGxvYWQgJiYgaGVscGVycy5pc0Z1bmN0aW9uKHRoaXMub25Jbml0aWF0ZVVwbG9hZCkpIHtcbiAgICAgIGN0eCA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICBmaWxlOiBvcHRzLmZpbGVcbiAgICAgIH0sIHtcbiAgICAgICAgY2h1bmtJZDogb3B0cy5jaHVua0lkLFxuICAgICAgICB1c2VySWQ6IHJlc3VsdC51c2VySWQsXG4gICAgICAgIHVzZXIoKSB7XG4gICAgICAgICAgaWYgKE1ldGVvci51c2VycyAmJiByZXN1bHQudXNlcklkKSB7XG4gICAgICAgICAgICByZXR1cm4gTWV0ZW9yLnVzZXJzLmZpbmRPbmUocmVzdWx0LnVzZXJJZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9LFxuICAgICAgICBlb2Y6IG9wdHMuZW9mXG4gICAgICB9KTtcbiAgICAgIHRoaXMub25Jbml0aWF0ZVVwbG9hZC5jYWxsKGN0eCwgcmVzdWx0KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge3Jlc3VsdCwgb3B0c307XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgX2ZpbmlzaFVwbG9hZFxuICAgKiBAc3VtbWFyeSBJbnRlcm5hbCBtZXRob2QuIEZpbmlzaCB1cGxvYWQsIGNsb3NlIFdyaXRhYmxlIHN0cmVhbSwgYWRkIHJlY29yZCB0byBNb25nb0RCIGFuZCBmbHVzaCB1c2VkIG1lbW9yeVxuICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgKi9cbiAgX2ZpbmlzaFVwbG9hZChyZXN1bHQsIG9wdHMsIGNiKSB7XG4gICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtVcGxvYWRdIFtmaW5pc2goaW5nKVVwbG9hZF0gLT4gJHtyZXN1bHQucGF0aH1gKTtcbiAgICBmcy5jaG1vZChyZXN1bHQucGF0aCwgdGhpcy5wZXJtaXNzaW9ucywgTk9PUCk7XG4gICAgcmVzdWx0LnR5cGUgICA9IHRoaXMuX2dldE1pbWVUeXBlKG9wdHMuZmlsZSk7XG4gICAgcmVzdWx0LnB1YmxpYyA9IHRoaXMucHVibGljO1xuICAgIHRoaXMuX3VwZGF0ZUZpbGVUeXBlcyhyZXN1bHQpO1xuXG4gICAgdGhpcy5jb2xsZWN0aW9uLmluc2VydChoZWxwZXJzLmNsb25lKHJlc3VsdCksIChjb2xJbnNlcnQsIF9pZCkgPT4ge1xuICAgICAgaWYgKGNvbEluc2VydCkge1xuICAgICAgICBjYiAmJiBjYihjb2xJbnNlcnQpO1xuICAgICAgICB0aGlzLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW1VwbG9hZF0gW19maW5pc2hVcGxvYWRdIFtpbnNlcnRdIEVycm9yOicsIGNvbEluc2VydCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9wcmVDb2xsZWN0aW9uLnVwZGF0ZSh7X2lkOiBvcHRzLmZpbGVJZH0sIHskc2V0OiB7aXNGaW5pc2hlZDogdHJ1ZX19LCAocHJlVXBkYXRlRXJyb3IpID0+IHtcbiAgICAgICAgICBpZiAocHJlVXBkYXRlRXJyb3IpIHtcbiAgICAgICAgICAgIGNiICYmIGNiKHByZVVwZGF0ZUVycm9yKTtcbiAgICAgICAgICAgIHRoaXMuX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbVXBsb2FkXSBbX2ZpbmlzaFVwbG9hZF0gW3VwZGF0ZV0gRXJyb3I6JywgcHJlVXBkYXRlRXJyb3IpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQuX2lkID0gX2lkO1xuICAgICAgICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtVcGxvYWRdIFtmaW5pc2goZWQpVXBsb2FkXSAtPiAke3Jlc3VsdC5wYXRofWApO1xuICAgICAgICAgICAgdGhpcy5vbkFmdGVyVXBsb2FkICYmIHRoaXMub25BZnRlclVwbG9hZC5jYWxsKHRoaXMsIHJlc3VsdCk7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ2FmdGVyVXBsb2FkJywgcmVzdWx0KTtcbiAgICAgICAgICAgIGNiICYmIGNiKG51bGwsIHJlc3VsdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSBfaGFuZGxlVXBsb2FkXG4gICAqIEBzdW1tYXJ5IEludGVybmFsIG1ldGhvZCB0byBoYW5kbGUgdXBsb2FkIHByb2Nlc3MsIHBpcGUgaW5jb21pbmcgZGF0YSB0byBXcml0YWJsZSBzdHJlYW1cbiAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICovXG4gIF9oYW5kbGVVcGxvYWQocmVzdWx0LCBvcHRzLCBjYikge1xuICAgIHRyeSB7XG4gICAgICBpZiAob3B0cy5lb2YpIHtcbiAgICAgICAgdGhpcy5fY3VycmVudFVwbG9hZHNbcmVzdWx0Ll9pZF0uZW5kKCgpID0+IHtcbiAgICAgICAgICB0aGlzLmVtaXQoJ19maW5pc2hVcGxvYWQnLCByZXN1bHQsIG9wdHMsIGNiKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9jdXJyZW50VXBsb2Fkc1tyZXN1bHQuX2lkXS53cml0ZShvcHRzLmNodW5rSWQsIG9wdHMuYmluRGF0YSwgY2IpO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRoaXMuX2RlYnVnKCdbX2hhbmRsZVVwbG9hZF0gW0VYQ0VQVElPTjpdJywgZSk7XG4gICAgICBjYiAmJiBjYihlKTtcbiAgICB9XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSBfZ2V0TWltZVR5cGVcbiAgICogQHBhcmFtIHtPYmplY3R9IGZpbGVEYXRhIC0gRmlsZSBPYmplY3RcbiAgICogQHN1bW1hcnkgUmV0dXJucyBmaWxlJ3MgbWltZS10eXBlXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9XG4gICAqL1xuICBfZ2V0TWltZVR5cGUoZmlsZURhdGEpIHtcbiAgICBsZXQgbWltZTtcbiAgICBjaGVjayhmaWxlRGF0YSwgT2JqZWN0KTtcbiAgICBpZiAoaGVscGVycy5pc09iamVjdChmaWxlRGF0YSkgJiYgZmlsZURhdGEudHlwZSkge1xuICAgICAgbWltZSA9IGZpbGVEYXRhLnR5cGU7XG4gICAgfVxuXG4gICAgaWYgKGZpbGVEYXRhLnBhdGggJiYgKCFtaW1lIHx8ICFoZWxwZXJzLmlzU3RyaW5nKG1pbWUpKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbGV0IGJ1ZiAgID0gbmV3IEJ1ZmZlcigyNjIpO1xuICAgICAgICBjb25zdCBmZCAgPSBmcy5vcGVuU3luYyhmaWxlRGF0YS5wYXRoLCAncicpO1xuICAgICAgICBjb25zdCBiciAgPSBmcy5yZWFkU3luYyhmZCwgYnVmLCAwLCAyNjIsIDApO1xuICAgICAgICBmcy5jbG9zZShmZCwgTk9PUCk7XG4gICAgICAgIGlmIChiciA8IDI2Mikge1xuICAgICAgICAgIGJ1ZiA9IGJ1Zi5zbGljZSgwLCBicik7XG4gICAgICAgIH1cbiAgICAgICAgKHttaW1lfSA9IGZpbGVUeXBlKGJ1ZikpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBXZSdyZSBnb29kXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFtaW1lIHx8ICFoZWxwZXJzLmlzU3RyaW5nKG1pbWUpKSB7XG4gICAgICBtaW1lID0gJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSc7XG4gICAgfVxuICAgIHJldHVybiBtaW1lO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgX2dldFVzZXJcbiAgICogQHN1bW1hcnkgUmV0dXJucyBvYmplY3Qgd2l0aCBgdXNlcklkYCBhbmQgYHVzZXIoKWAgbWV0aG9kIHdoaWNoIHJldHVybiB1c2VyJ3Mgb2JqZWN0XG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqL1xuICBfZ2V0VXNlcihodHRwKSB7XG4gICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgdXNlcigpIHsgcmV0dXJuIG51bGw7IH0sXG4gICAgICB1c2VySWQ6IG51bGxcbiAgICB9O1xuXG4gICAgaWYgKGh0dHApIHtcbiAgICAgIGxldCBtdG9rID0gbnVsbDtcbiAgICAgIGlmIChodHRwLnJlcXVlc3QuaGVhZGVyc1sneC1tdG9rJ10pIHtcbiAgICAgICAgbXRvayA9IGh0dHAucmVxdWVzdC5oZWFkZXJzWyd4LW10b2snXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGNvb2tpZSA9IGh0dHAucmVxdWVzdC5Db29raWVzO1xuICAgICAgICBpZiAoY29va2llLmhhcygneF9tdG9rJykpIHtcbiAgICAgICAgICBtdG9rID0gY29va2llLmdldCgneF9tdG9rJyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKG10b2spIHtcbiAgICAgICAgY29uc3QgdXNlcklkID0gKGhlbHBlcnMuaXNPYmplY3QoTWV0ZW9yLnNlcnZlci5zZXNzaW9ucykgJiYgaGVscGVycy5pc09iamVjdChNZXRlb3Iuc2VydmVyLnNlc3Npb25zW210b2tdKSkgPyBNZXRlb3Iuc2VydmVyLnNlc3Npb25zW210b2tdLnVzZXJJZCA6IHZvaWQgMDtcblxuICAgICAgICBpZiAodXNlcklkKSB7XG4gICAgICAgICAgcmVzdWx0LnVzZXIgICA9ICgpID0+IE1ldGVvci51c2Vycy5maW5kT25lKHVzZXJJZCk7XG4gICAgICAgICAgcmVzdWx0LnVzZXJJZCA9IHVzZXJJZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgd3JpdGVcbiAgICogQHBhcmFtIHtCdWZmZXJ9IGJ1ZmZlciAtIEJpbmFyeSBGaWxlJ3MgQnVmZmVyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIC0gT2JqZWN0IHdpdGggZmlsZS1kYXRhXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLm5hbWUgLSBGaWxlIG5hbWUsIGFsaWFzOiBgZmlsZU5hbWVgXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLnR5cGUgLSBGaWxlIG1pbWUtdHlwZVxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cy5tZXRhIC0gRmlsZSBhZGRpdGlvbmFsIG1ldGEtZGF0YVxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy51c2VySWQgLSBVc2VySWQsIGRlZmF1bHQgKm51bGwqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmZpbGVJZCAtIF9pZCwgZGVmYXVsdCAqbnVsbCpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBmdW5jdGlvbihlcnJvciwgZmlsZU9iail7Li4ufVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IHByb2NlZWRBZnRlclVwbG9hZCAtIFByb2NlZWQgb25BZnRlclVwbG9hZCBob29rXG4gICAqIEBzdW1tYXJ5IFdyaXRlIGJ1ZmZlciB0byBGUyBhbmQgYWRkIHRvIEZpbGVzQ29sbGVjdGlvbiBDb2xsZWN0aW9uXG4gICAqIEByZXR1cm5zIHtGaWxlc0NvbGxlY3Rpb259IEluc3RhbmNlXG4gICAqL1xuICB3cml0ZShidWZmZXIsIF9vcHRzID0ge30sIF9jYWxsYmFjaywgX3Byb2NlZWRBZnRlclVwbG9hZCkge1xuICAgIHRoaXMuX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbd3JpdGUoKV0nKTtcbiAgICBsZXQgb3B0cyA9IF9vcHRzO1xuICAgIGxldCBjYWxsYmFjayA9IF9jYWxsYmFjaztcbiAgICBsZXQgcHJvY2VlZEFmdGVyVXBsb2FkID0gX3Byb2NlZWRBZnRlclVwbG9hZDtcblxuICAgIGlmIChoZWxwZXJzLmlzRnVuY3Rpb24ob3B0cykpIHtcbiAgICAgIHByb2NlZWRBZnRlclVwbG9hZCA9IGNhbGxiYWNrO1xuICAgICAgY2FsbGJhY2sgPSBvcHRzO1xuICAgICAgb3B0cyAgICAgPSB7fTtcbiAgICB9IGVsc2UgaWYgKGhlbHBlcnMuaXNCb29sZWFuKGNhbGxiYWNrKSkge1xuICAgICAgcHJvY2VlZEFmdGVyVXBsb2FkID0gY2FsbGJhY2s7XG4gICAgfSBlbHNlIGlmIChoZWxwZXJzLmlzQm9vbGVhbihvcHRzKSkge1xuICAgICAgcHJvY2VlZEFmdGVyVXBsb2FkID0gb3B0cztcbiAgICB9XG5cbiAgICBjaGVjayhvcHRzLCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcbiAgICBjaGVjayhjYWxsYmFjaywgTWF0Y2guT3B0aW9uYWwoRnVuY3Rpb24pKTtcbiAgICBjaGVjayhwcm9jZWVkQWZ0ZXJVcGxvYWQsIE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pKTtcblxuICAgIGNvbnN0IGZpbGVJZCAgID0gb3B0cy5maWxlSWQgfHwgUmFuZG9tLmlkKCk7XG4gICAgY29uc3QgRlNOYW1lICAgPSB0aGlzLm5hbWluZ0Z1bmN0aW9uID8gdGhpcy5uYW1pbmdGdW5jdGlvbihvcHRzKSA6IGZpbGVJZDtcbiAgICBjb25zdCBmaWxlTmFtZSA9IChvcHRzLm5hbWUgfHwgb3B0cy5maWxlTmFtZSkgPyAob3B0cy5uYW1lIHx8IG9wdHMuZmlsZU5hbWUpIDogRlNOYW1lO1xuXG4gICAgY29uc3Qge2V4dGVuc2lvbiwgZXh0ZW5zaW9uV2l0aERvdH0gPSB0aGlzLl9nZXRFeHQoZmlsZU5hbWUpO1xuXG4gICAgb3B0cy5wYXRoID0gYCR7dGhpcy5zdG9yYWdlUGF0aChvcHRzKX0ke25vZGVQYXRoLnNlcH0ke0ZTTmFtZX0ke2V4dGVuc2lvbldpdGhEb3R9YDtcbiAgICBvcHRzLnR5cGUgPSB0aGlzLl9nZXRNaW1lVHlwZShvcHRzKTtcbiAgICBpZiAoIWhlbHBlcnMuaXNPYmplY3Qob3B0cy5tZXRhKSkge1xuICAgICAgb3B0cy5tZXRhID0ge307XG4gICAgfVxuXG4gICAgaWYgKCFoZWxwZXJzLmlzTnVtYmVyKG9wdHMuc2l6ZSkpIHtcbiAgICAgIG9wdHMuc2l6ZSA9IGJ1ZmZlci5sZW5ndGg7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fZGF0YVRvU2NoZW1hKHtcbiAgICAgIG5hbWU6IGZpbGVOYW1lLFxuICAgICAgcGF0aDogb3B0cy5wYXRoLFxuICAgICAgbWV0YTogb3B0cy5tZXRhLFxuICAgICAgdHlwZTogb3B0cy50eXBlLFxuICAgICAgc2l6ZTogb3B0cy5zaXplLFxuICAgICAgdXNlcklkOiBvcHRzLnVzZXJJZCxcbiAgICAgIGV4dGVuc2lvblxuICAgIH0pO1xuXG4gICAgcmVzdWx0Ll9pZCA9IGZpbGVJZDtcblxuICAgIGNvbnN0IHN0cmVhbSA9IGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG9wdHMucGF0aCwge2ZsYWdzOiAndycsIG1vZGU6IHRoaXMucGVybWlzc2lvbnN9KTtcbiAgICBzdHJlYW0uZW5kKGJ1ZmZlciwgKHN0cmVhbUVycikgPT4gYm91bmQoKCkgPT4ge1xuICAgICAgaWYgKHN0cmVhbUVycikge1xuICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhzdHJlYW1FcnIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLmluc2VydChyZXN1bHQsIChpbnNlcnRFcnIsIF9pZCkgPT4ge1xuICAgICAgICAgIGlmIChpbnNlcnRFcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKGluc2VydEVycik7XG4gICAgICAgICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW3dyaXRlXSBbaW5zZXJ0XSBFcnJvcjogJHtmaWxlTmFtZX0gLT4gJHt0aGlzLmNvbGxlY3Rpb25OYW1lfWAsIGluc2VydEVycik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVSZWYgPSB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShfaWQpO1xuICAgICAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2sobnVsbCwgZmlsZVJlZik7XG4gICAgICAgICAgICBpZiAocHJvY2VlZEFmdGVyVXBsb2FkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgIHRoaXMub25BZnRlclVwbG9hZCAmJiB0aGlzLm9uQWZ0ZXJVcGxvYWQuY2FsbCh0aGlzLCBmaWxlUmVmKTtcbiAgICAgICAgICAgICAgdGhpcy5lbWl0KCdhZnRlclVwbG9hZCcsIGZpbGVSZWYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFt3cml0ZV06ICR7ZmlsZU5hbWV9IC0+ICR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSBsb2FkXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgLSBVUkwgdG8gZmlsZVxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyAtIE9iamVjdCB3aXRoIGZpbGUtZGF0YVxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cy5oZWFkZXJzIC0gSFRUUCBoZWFkZXJzIHRvIHVzZSB3aGVuIHJlcXVlc3RpbmcgdGhlIGZpbGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMubmFtZSAtIEZpbGUgbmFtZSwgYWxpYXM6IGBmaWxlTmFtZWBcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMudHlwZSAtIEZpbGUgbWltZS10eXBlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzLm1ldGEgLSBGaWxlIGFkZGl0aW9uYWwgbWV0YS1kYXRhXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLnVzZXJJZCAtIFVzZXJJZCwgZGVmYXVsdCAqbnVsbCpcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZmlsZUlkIC0gX2lkLCBkZWZhdWx0ICpudWxsKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIGZ1bmN0aW9uKGVycm9yLCBmaWxlT2JqKXsuLi59XG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gcHJvY2VlZEFmdGVyVXBsb2FkIC0gUHJvY2VlZCBvbkFmdGVyVXBsb2FkIGhvb2tcbiAgICogQHN1bW1hcnkgRG93bmxvYWQgZmlsZSwgd3JpdGUgc3RyZWFtIHRvIEZTIGFuZCBhZGQgdG8gRmlsZXNDb2xsZWN0aW9uIENvbGxlY3Rpb25cbiAgICogQHJldHVybnMge0ZpbGVzQ29sbGVjdGlvbn0gSW5zdGFuY2VcbiAgICovXG4gIGxvYWQodXJsLCBfb3B0cyA9IHt9LCBfY2FsbGJhY2ssIF9wcm9jZWVkQWZ0ZXJVcGxvYWQpIHtcbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2xvYWQoJHt1cmx9LCAke0pTT04uc3RyaW5naWZ5KF9vcHRzKX0sIGNhbGxiYWNrKV1gKTtcbiAgICBsZXQgb3B0cyA9IF9vcHRzO1xuICAgIGxldCBjYWxsYmFjayA9IF9jYWxsYmFjaztcbiAgICBsZXQgcHJvY2VlZEFmdGVyVXBsb2FkID0gX3Byb2NlZWRBZnRlclVwbG9hZDtcblxuICAgIGlmIChoZWxwZXJzLmlzRnVuY3Rpb24ob3B0cykpIHtcbiAgICAgIHByb2NlZWRBZnRlclVwbG9hZCA9IGNhbGxiYWNrO1xuICAgICAgY2FsbGJhY2sgPSBvcHRzO1xuICAgICAgb3B0cyAgICAgPSB7fTtcbiAgICB9IGVsc2UgaWYgKGhlbHBlcnMuaXNCb29sZWFuKGNhbGxiYWNrKSkge1xuICAgICAgcHJvY2VlZEFmdGVyVXBsb2FkID0gY2FsbGJhY2s7XG4gICAgfSBlbHNlIGlmIChoZWxwZXJzLmlzQm9vbGVhbihvcHRzKSkge1xuICAgICAgcHJvY2VlZEFmdGVyVXBsb2FkID0gb3B0cztcbiAgICB9XG5cbiAgICBjaGVjayh1cmwsIFN0cmluZyk7XG4gICAgY2hlY2sob3B0cywgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG4gICAgY2hlY2soY2FsbGJhY2ssIE1hdGNoLk9wdGlvbmFsKEZ1bmN0aW9uKSk7XG4gICAgY2hlY2socHJvY2VlZEFmdGVyVXBsb2FkLCBNYXRjaC5PcHRpb25hbChCb29sZWFuKSk7XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNPYmplY3Qob3B0cykpIHtcbiAgICAgIG9wdHMgPSB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBmaWxlSWQgICAgPSBvcHRzLmZpbGVJZCB8fCBSYW5kb20uaWQoKTtcbiAgICBjb25zdCBGU05hbWUgICAgPSB0aGlzLm5hbWluZ0Z1bmN0aW9uID8gdGhpcy5uYW1pbmdGdW5jdGlvbihvcHRzKSA6IGZpbGVJZDtcbiAgICBjb25zdCBwYXRoUGFydHMgPSB1cmwuc3BsaXQoJy8nKTtcbiAgICBjb25zdCBmaWxlTmFtZSAgPSAob3B0cy5uYW1lIHx8IG9wdHMuZmlsZU5hbWUpID8gKG9wdHMubmFtZSB8fCBvcHRzLmZpbGVOYW1lKSA6IHBhdGhQYXJ0c1twYXRoUGFydHMubGVuZ3RoIC0gMV0gfHwgRlNOYW1lO1xuXG4gICAgY29uc3Qge2V4dGVuc2lvbiwgZXh0ZW5zaW9uV2l0aERvdH0gPSB0aGlzLl9nZXRFeHQoZmlsZU5hbWUpO1xuICAgIG9wdHMucGF0aCAgPSBgJHt0aGlzLnN0b3JhZ2VQYXRoKG9wdHMpfSR7bm9kZVBhdGguc2VwfSR7RlNOYW1lfSR7ZXh0ZW5zaW9uV2l0aERvdH1gO1xuXG4gICAgY29uc3Qgc3RvcmVSZXN1bHQgPSAocmVzdWx0LCBjYikgPT4ge1xuICAgICAgcmVzdWx0Ll9pZCA9IGZpbGVJZDtcblxuICAgICAgdGhpcy5jb2xsZWN0aW9uLmluc2VydChyZXN1bHQsIChlcnJvciwgX2lkKSA9PiB7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIGNiICYmIGNiKGVycm9yKTtcbiAgICAgICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2xvYWRdIFtpbnNlcnRdIEVycm9yOiAke2ZpbGVOYW1lfSAtPiAke3RoaXMuY29sbGVjdGlvbk5hbWV9YCwgZXJyb3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGZpbGVSZWYgPSB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShfaWQpO1xuICAgICAgICAgIGNiICYmIGNiKG51bGwsIGZpbGVSZWYpO1xuICAgICAgICAgIGlmIChwcm9jZWVkQWZ0ZXJVcGxvYWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIHRoaXMub25BZnRlclVwbG9hZCAmJiB0aGlzLm9uQWZ0ZXJVcGxvYWQuY2FsbCh0aGlzLCBmaWxlUmVmKTtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnYWZ0ZXJVcGxvYWQnLCBmaWxlUmVmKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtsb2FkXSBbaW5zZXJ0XSAke2ZpbGVOYW1lfSAtPiAke3RoaXMuY29sbGVjdGlvbk5hbWV9YCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXF1ZXN0LmdldCh7XG4gICAgICB1cmwsXG4gICAgICBoZWFkZXJzOiBvcHRzLmhlYWRlcnMgfHwge31cbiAgICB9KS5vbignZXJyb3InLCAoZXJyb3IpID0+IGJvdW5kKCgpID0+IHtcbiAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKGVycm9yKTtcbiAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbbG9hZF0gW3JlcXVlc3QuZ2V0KCR7dXJsfSldIEVycm9yOmAsIGVycm9yKTtcbiAgICB9KSkub24oJ3Jlc3BvbnNlJywgKHJlc3BvbnNlKSA9PiBib3VuZCgoKSA9PiB7XG4gICAgICByZXNwb25zZS5vbignZW5kJywgKCkgPT4gYm91bmQoKCkgPT4ge1xuICAgICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2xvYWRdIFJlY2VpdmVkOiAke3VybH1gKTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fZGF0YVRvU2NoZW1hKHtcbiAgICAgICAgICBuYW1lOiBmaWxlTmFtZSxcbiAgICAgICAgICBwYXRoOiBvcHRzLnBhdGgsXG4gICAgICAgICAgbWV0YTogb3B0cy5tZXRhLFxuICAgICAgICAgIHR5cGU6IG9wdHMudHlwZSB8fCByZXNwb25zZS5oZWFkZXJzWydjb250ZW50LXR5cGUnXSB8fCB0aGlzLl9nZXRNaW1lVHlwZSh7cGF0aDogb3B0cy5wYXRofSksXG4gICAgICAgICAgc2l6ZTogb3B0cy5zaXplIHx8IHBhcnNlSW50KHJlc3BvbnNlLmhlYWRlcnNbJ2NvbnRlbnQtbGVuZ3RoJ10gfHwgMCksXG4gICAgICAgICAgdXNlcklkOiBvcHRzLnVzZXJJZCxcbiAgICAgICAgICBleHRlbnNpb25cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFyZXN1bHQuc2l6ZSkge1xuICAgICAgICAgIGZzLnN0YXQob3B0cy5wYXRoLCAoZXJyb3IsIHN0YXRzKSA9PiBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2soZXJyb3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0LnZlcnNpb25zLm9yaWdpbmFsLnNpemUgPSAocmVzdWx0LnNpemUgPSBzdGF0cy5zaXplKTtcbiAgICAgICAgICAgICAgc3RvcmVSZXN1bHQocmVzdWx0LCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0b3JlUmVzdWx0KHJlc3VsdCwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfSkpLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3B0cy5wYXRoLCB7ZmxhZ3M6ICd3JywgbW9kZTogdGhpcy5wZXJtaXNzaW9uc30pKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIGFkZEZpbGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggICAgICAgICAgLSBQYXRoIHRvIGZpbGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMgICAgICAgICAgLSBbT3B0aW9uYWxdIE9iamVjdCB3aXRoIGZpbGUtZGF0YVxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy50eXBlICAgICAtIFtPcHRpb25hbF0gRmlsZSBtaW1lLXR5cGVcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMubWV0YSAgICAgLSBbT3B0aW9uYWxdIEZpbGUgYWRkaXRpb25hbCBtZXRhLWRhdGFcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZmlsZUlkICAgLSBfaWQsIGRlZmF1bHQgKm51bGwqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzLmZpbGVOYW1lIC0gW09wdGlvbmFsXSBGaWxlIG5hbWUsIGlmIG5vdCBzcGVjaWZpZWQgZmlsZSBuYW1lIGFuZCBleHRlbnNpb24gd2lsbCBiZSB0YWtlbiBmcm9tIHBhdGhcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMudXNlcklkICAgLSBbT3B0aW9uYWxdIFVzZXJJZCwgZGVmYXVsdCAqbnVsbCpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgICAgLSBbT3B0aW9uYWxdIGZ1bmN0aW9uKGVycm9yLCBmaWxlT2JqKXsuLi59XG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gcHJvY2VlZEFmdGVyVXBsb2FkIC0gUHJvY2VlZCBvbkFmdGVyVXBsb2FkIGhvb2tcbiAgICogQHN1bW1hcnkgQWRkIGZpbGUgZnJvbSBGUyB0byBGaWxlc0NvbGxlY3Rpb25cbiAgICogQHJldHVybnMge0ZpbGVzQ29sbGVjdGlvbn0gSW5zdGFuY2VcbiAgICovXG4gIGFkZEZpbGUocGF0aCwgX29wdHMgPSB7fSwgX2NhbGxiYWNrLCBfcHJvY2VlZEFmdGVyVXBsb2FkKSB7XG4gICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFthZGRGaWxlKCR7cGF0aH0pXWApO1xuICAgIGxldCBvcHRzID0gX29wdHM7XG4gICAgbGV0IGNhbGxiYWNrID0gX2NhbGxiYWNrO1xuICAgIGxldCBwcm9jZWVkQWZ0ZXJVcGxvYWQgPSBfcHJvY2VlZEFmdGVyVXBsb2FkO1xuXG4gICAgaWYgKGhlbHBlcnMuaXNGdW5jdGlvbihvcHRzKSkge1xuICAgICAgcHJvY2VlZEFmdGVyVXBsb2FkID0gY2FsbGJhY2s7XG4gICAgICBjYWxsYmFjayA9IG9wdHM7XG4gICAgICBvcHRzICAgICA9IHt9O1xuICAgIH0gZWxzZSBpZiAoaGVscGVycy5pc0Jvb2xlYW4oY2FsbGJhY2spKSB7XG4gICAgICBwcm9jZWVkQWZ0ZXJVcGxvYWQgPSBjYWxsYmFjaztcbiAgICB9IGVsc2UgaWYgKGhlbHBlcnMuaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgICBwcm9jZWVkQWZ0ZXJVcGxvYWQgPSBvcHRzO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnB1YmxpYykge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsICdDYW4gbm90IHJ1biBbYWRkRmlsZV0gb24gcHVibGljIGNvbGxlY3Rpb24hIEp1c3QgTW92ZSBmaWxlIHRvIHJvb3Qgb2YgeW91ciBzZXJ2ZXIsIHRoZW4gYWRkIHJlY29yZCB0byBDb2xsZWN0aW9uJyk7XG4gICAgfVxuXG4gICAgY2hlY2socGF0aCwgU3RyaW5nKTtcbiAgICBjaGVjayhvcHRzLCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcbiAgICBjaGVjayhjYWxsYmFjaywgTWF0Y2guT3B0aW9uYWwoRnVuY3Rpb24pKTtcbiAgICBjaGVjayhwcm9jZWVkQWZ0ZXJVcGxvYWQsIE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pKTtcblxuICAgIGZzLnN0YXQocGF0aCwgKHN0YXRFcnIsIHN0YXRzKSA9PiBib3VuZCgoKSA9PiB7XG4gICAgICBpZiAoc3RhdEVycikge1xuICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhzdGF0RXJyKTtcbiAgICAgIH0gZWxzZSBpZiAoc3RhdHMuaXNGaWxlKCkpIHtcbiAgICAgICAgaWYgKCFoZWxwZXJzLmlzT2JqZWN0KG9wdHMpKSB7XG4gICAgICAgICAgb3B0cyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIG9wdHMucGF0aCAgPSBwYXRoO1xuXG4gICAgICAgIGlmICghb3B0cy5maWxlTmFtZSkge1xuICAgICAgICAgIGNvbnN0IHBhdGhQYXJ0cyA9IHBhdGguc3BsaXQobm9kZVBhdGguc2VwKTtcbiAgICAgICAgICBvcHRzLmZpbGVOYW1lICAgPSBwYXRoLnNwbGl0KG5vZGVQYXRoLnNlcClbcGF0aFBhcnRzLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qge2V4dGVuc2lvbn0gPSB0aGlzLl9nZXRFeHQob3B0cy5maWxlTmFtZSk7XG5cbiAgICAgICAgaWYgKCFoZWxwZXJzLmlzU3RyaW5nKG9wdHMudHlwZSkpIHtcbiAgICAgICAgICBvcHRzLnR5cGUgPSB0aGlzLl9nZXRNaW1lVHlwZShvcHRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaGVscGVycy5pc09iamVjdChvcHRzLm1ldGEpKSB7XG4gICAgICAgICAgb3B0cy5tZXRhID0ge307XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWhlbHBlcnMuaXNOdW1iZXIob3B0cy5zaXplKSkge1xuICAgICAgICAgIG9wdHMuc2l6ZSA9IHN0YXRzLnNpemU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9kYXRhVG9TY2hlbWEoe1xuICAgICAgICAgIG5hbWU6IG9wdHMuZmlsZU5hbWUsXG4gICAgICAgICAgcGF0aCxcbiAgICAgICAgICBtZXRhOiBvcHRzLm1ldGEsXG4gICAgICAgICAgdHlwZTogb3B0cy50eXBlLFxuICAgICAgICAgIHNpemU6IG9wdHMuc2l6ZSxcbiAgICAgICAgICB1c2VySWQ6IG9wdHMudXNlcklkLFxuICAgICAgICAgIGV4dGVuc2lvbixcbiAgICAgICAgICBfc3RvcmFnZVBhdGg6IHBhdGgucmVwbGFjZShgJHtub2RlUGF0aC5zZXB9JHtvcHRzLmZpbGVOYW1lfWAsICcnKSxcbiAgICAgICAgICBmaWxlSWQ6IG9wdHMuZmlsZUlkIHx8IG51bGxcbiAgICAgICAgfSk7XG5cblxuICAgICAgICB0aGlzLmNvbGxlY3Rpb24uaW5zZXJ0KHJlc3VsdCwgKGluc2VydEVyciwgX2lkKSA9PiB7XG4gICAgICAgICAgaWYgKGluc2VydEVycikge1xuICAgICAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2soaW5zZXJ0RXJyKTtcbiAgICAgICAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbYWRkRmlsZV0gW2luc2VydF0gRXJyb3I6ICR7cmVzdWx0Lm5hbWV9IC0+ICR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gLCBpbnNlcnRFcnIpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlUmVmID0gdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUoX2lkKTtcbiAgICAgICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKG51bGwsIGZpbGVSZWYpO1xuICAgICAgICAgICAgaWYgKHByb2NlZWRBZnRlclVwbG9hZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICB0aGlzLm9uQWZ0ZXJVcGxvYWQgJiYgdGhpcy5vbkFmdGVyVXBsb2FkLmNhbGwodGhpcywgZmlsZVJlZik7XG4gICAgICAgICAgICAgIHRoaXMuZW1pdCgnYWZ0ZXJVcGxvYWQnLCBmaWxlUmVmKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbYWRkRmlsZV06ICR7cmVzdWx0Lm5hbWV9IC0+ICR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2sobmV3IE1ldGVvci5FcnJvcig0MDAsIGBbRmlsZXNDb2xsZWN0aW9uXSBbYWRkRmlsZSgke3BhdGh9KV06IEZpbGUgZG9lcyBub3QgZXhpc3RgKSk7XG4gICAgICB9XG4gICAgfSkpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgcmVtb3ZlXG4gICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gc2VsZWN0b3IgLSBNb25nby1TdHlsZSBzZWxlY3RvciAoaHR0cDovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNzZWxlY3RvcnMpXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgd2l0aCBvbmUgYGVycm9yYCBhcmd1bWVudFxuICAgKiBAc3VtbWFyeSBSZW1vdmUgZG9jdW1lbnRzIGZyb20gdGhlIGNvbGxlY3Rpb25cbiAgICogQHJldHVybnMge0ZpbGVzQ29sbGVjdGlvbn0gSW5zdGFuY2VcbiAgICovXG4gIHJlbW92ZShzZWxlY3RvciwgY2FsbGJhY2spIHtcbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW3JlbW92ZSgke0pTT04uc3RyaW5naWZ5KHNlbGVjdG9yKX0pXWApO1xuICAgIGlmIChzZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgY2hlY2soY2FsbGJhY2ssIE1hdGNoLk9wdGlvbmFsKEZ1bmN0aW9uKSk7XG5cbiAgICBjb25zdCBmaWxlcyA9IHRoaXMuY29sbGVjdGlvbi5maW5kKHNlbGVjdG9yKTtcbiAgICBpZiAoZmlsZXMuY291bnQoKSA+IDApIHtcbiAgICAgIGZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgICAgdGhpcy51bmxpbmsoZmlsZSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2sobmV3IE1ldGVvci5FcnJvcig0MDQsICdDdXJzb3IgaXMgZW1wdHksIG5vIGZpbGVzIGlzIHJlbW92ZWQnKSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vbkFmdGVyUmVtb3ZlKSB7XG4gICAgICBjb25zdCBkb2NzID0gZmlsZXMuZmV0Y2goKTtcbiAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgdGhpcy5jb2xsZWN0aW9uLnJlbW92ZShzZWxlY3RvciwgZnVuY3Rpb24gKCkge1xuICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICBzZWxmLm9uQWZ0ZXJSZW1vdmUoZG9jcyk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb2xsZWN0aW9uLnJlbW92ZShzZWxlY3RvciwgKGNhbGxiYWNrIHx8IE5PT1ApKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgZGVueVxuICAgKiBAcGFyYW0ge09iamVjdH0gcnVsZXNcbiAgICogQHNlZSAgaHR0cHM6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjTW9uZ28tQ29sbGVjdGlvbi1kZW55XG4gICAqIEBzdW1tYXJ5IGxpbmsgTW9uZ28uQ29sbGVjdGlvbiBkZW55IG1ldGhvZHNcbiAgICogQHJldHVybnMge01vbmdvLkNvbGxlY3Rpb259IEluc3RhbmNlXG4gICAqL1xuICBkZW55KHJ1bGVzKSB7XG4gICAgdGhpcy5jb2xsZWN0aW9uLmRlbnkocnVsZXMpO1xuICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb247XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgYWxsb3dcbiAgICogQHBhcmFtIHtPYmplY3R9IHJ1bGVzXG4gICAqIEBzZWUgaHR0cHM6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjTW9uZ28tQ29sbGVjdGlvbi1hbGxvd1xuICAgKiBAc3VtbWFyeSBsaW5rIE1vbmdvLkNvbGxlY3Rpb24gYWxsb3cgbWV0aG9kc1xuICAgKiBAcmV0dXJucyB7TW9uZ28uQ29sbGVjdGlvbn0gSW5zdGFuY2VcbiAgICovXG4gIGFsbG93KHJ1bGVzKSB7XG4gICAgdGhpcy5jb2xsZWN0aW9uLmFsbG93KHJ1bGVzKTtcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIGRlbnlDbGllbnRcbiAgICogQHNlZSBodHRwczovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNNb25nby1Db2xsZWN0aW9uLWRlbnlcbiAgICogQHN1bW1hcnkgU2hvcnRoYW5kcyBmb3IgTW9uZ28uQ29sbGVjdGlvbiBkZW55IG1ldGhvZFxuICAgKiBAcmV0dXJucyB7TW9uZ28uQ29sbGVjdGlvbn0gSW5zdGFuY2VcbiAgICovXG4gIGRlbnlDbGllbnQoKSB7XG4gICAgdGhpcy5jb2xsZWN0aW9uLmRlbnkoe1xuICAgICAgaW5zZXJ0KCkgeyByZXR1cm4gdHJ1ZTsgfSxcbiAgICAgIHVwZGF0ZSgpIHsgcmV0dXJuIHRydWU7IH0sXG4gICAgICByZW1vdmUoKSB7IHJldHVybiB0cnVlOyB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbjtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSBhbGxvd0NsaWVudFxuICAgKiBAc2VlIGh0dHBzOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI01vbmdvLUNvbGxlY3Rpb24tYWxsb3dcbiAgICogQHN1bW1hcnkgU2hvcnRoYW5kcyBmb3IgTW9uZ28uQ29sbGVjdGlvbiBhbGxvdyBtZXRob2RcbiAgICogQHJldHVybnMge01vbmdvLkNvbGxlY3Rpb259IEluc3RhbmNlXG4gICAqL1xuICBhbGxvd0NsaWVudCgpIHtcbiAgICB0aGlzLmNvbGxlY3Rpb24uYWxsb3coe1xuICAgICAgaW5zZXJ0KCkgeyByZXR1cm4gdHJ1ZTsgfSxcbiAgICAgIHVwZGF0ZSgpIHsgcmV0dXJuIHRydWU7IH0sXG4gICAgICByZW1vdmUoKSB7IHJldHVybiB0cnVlOyB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbjtcbiAgfVxuXG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIHVubGlua1xuICAgKiBAcGFyYW0ge09iamVjdH0gZmlsZVJlZiAtIGZpbGVPYmpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHZlcnNpb24gLSBbT3B0aW9uYWxdIGZpbGUncyB2ZXJzaW9uXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gW09wdGlvbmFsXSBjYWxsYmFjayBmdW5jdGlvblxuICAgKiBAc3VtbWFyeSBVbmxpbmsgZmlsZXMgYW5kIGl0J3MgdmVyc2lvbnMgZnJvbSBGU1xuICAgKiBAcmV0dXJucyB7RmlsZXNDb2xsZWN0aW9ufSBJbnN0YW5jZVxuICAgKi9cbiAgdW5saW5rKGZpbGVSZWYsIHZlcnNpb24sIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFt1bmxpbmsoJHtmaWxlUmVmLl9pZH0sICR7dmVyc2lvbn0pXWApO1xuICAgIGlmICh2ZXJzaW9uKSB7XG4gICAgICBpZiAoaGVscGVycy5pc09iamVjdChmaWxlUmVmLnZlcnNpb25zKSAmJiBoZWxwZXJzLmlzT2JqZWN0KGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl0pICYmIGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl0ucGF0aCkge1xuICAgICAgICBmcy51bmxpbmsoZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXS5wYXRoLCAoY2FsbGJhY2sgfHwgTk9PUCkpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoaGVscGVycy5pc09iamVjdChmaWxlUmVmLnZlcnNpb25zKSkge1xuICAgICAgICBmb3IobGV0IHZLZXkgaW4gZmlsZVJlZi52ZXJzaW9ucykge1xuICAgICAgICAgIGlmIChmaWxlUmVmLnZlcnNpb25zW3ZLZXldICYmIGZpbGVSZWYudmVyc2lvbnNbdktleV0ucGF0aCkge1xuICAgICAgICAgICAgZnMudW5saW5rKGZpbGVSZWYudmVyc2lvbnNbdktleV0ucGF0aCwgKGNhbGxiYWNrIHx8IE5PT1ApKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZzLnVubGluayhmaWxlUmVmLnBhdGgsIChjYWxsYmFjayB8fCBOT09QKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIF80MDRcbiAgICogQHN1bW1hcnkgSW50ZXJuYWwgbWV0aG9kLCB1c2VkIHRvIHJldHVybiA0MDQgZXJyb3JcbiAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICovXG4gIF80MDQoaHR0cCkge1xuICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbZG93bmxvYWQoJHtodHRwLnJlcXVlc3Qub3JpZ2luYWxVcmx9KV0gW180MDRdIEZpbGUgbm90IGZvdW5kYCk7XG4gICAgY29uc3QgdGV4dCA9ICdGaWxlIE5vdCBGb3VuZCA6KCc7XG5cbiAgICBpZiAoIWh0dHAucmVzcG9uc2UuaGVhZGVyc1NlbnQpIHtcbiAgICAgIGh0dHAucmVzcG9uc2Uud3JpdGVIZWFkKDQwNCwge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW4nLFxuICAgICAgICAnQ29udGVudC1MZW5ndGgnOiB0ZXh0Lmxlbmd0aFxuICAgICAgfVxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKCFodHRwLnJlc3BvbnNlLmZpbmlzaGVkKSB7XG4gICAgICBodHRwLnJlc3BvbnNlLmVuZCh0ZXh0KTtcbiAgICB9XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgZG93bmxvYWRcbiAgICogQHBhcmFtIHtPYmplY3R9IGh0dHAgICAgLSBTZXJ2ZXIgSFRUUCBvYmplY3RcbiAgICogQHBhcmFtIHtTdHJpbmd9IHZlcnNpb24gLSBSZXF1ZXN0ZWQgZmlsZSB2ZXJzaW9uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlUmVmIC0gUmVxdWVzdGVkIGZpbGUgT2JqZWN0XG4gICAqIEBzdW1tYXJ5IEluaXRpYXRlcyB0aGUgSFRUUCByZXNwb25zZVxuICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgKi9cbiAgZG93bmxvYWQoaHR0cCwgdmVyc2lvbiA9ICdvcmlnaW5hbCcsIGZpbGVSZWYpIHtcbiAgICBsZXQgdlJlZjtcbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2Rvd25sb2FkKCR7aHR0cC5yZXF1ZXN0Lm9yaWdpbmFsVXJsfSwgJHt2ZXJzaW9ufSldYCk7XG5cbiAgICBpZiAoZmlsZVJlZikge1xuICAgICAgaWYgKGhlbHBlcnMuaGFzKGZpbGVSZWYsICd2ZXJzaW9ucycpICYmIGhlbHBlcnMuaGFzKGZpbGVSZWYudmVyc2lvbnMsIHZlcnNpb24pKSB7XG4gICAgICAgIHZSZWYgPSBmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dO1xuICAgICAgICB2UmVmLl9pZCA9IGZpbGVSZWYuX2lkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdlJlZiA9IGZpbGVSZWY7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHZSZWYgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIXZSZWYgfHwgIWhlbHBlcnMuaXNPYmplY3QodlJlZikpIHtcbiAgICAgIHJldHVybiB0aGlzLl80MDQoaHR0cCk7XG4gICAgfSBlbHNlIGlmIChmaWxlUmVmKSB7XG4gICAgICBpZiAodGhpcy5kb3dubG9hZENhbGxiYWNrKSB7XG4gICAgICAgIGlmICghdGhpcy5kb3dubG9hZENhbGxiYWNrLmNhbGwoT2JqZWN0LmFzc2lnbihodHRwLCB0aGlzLl9nZXRVc2VyKGh0dHApKSwgZmlsZVJlZikpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5fNDA0KGh0dHApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmludGVyY2VwdERvd25sb2FkICYmIGhlbHBlcnMuaXNGdW5jdGlvbih0aGlzLmludGVyY2VwdERvd25sb2FkKSkge1xuICAgICAgICBpZiAodGhpcy5pbnRlcmNlcHREb3dubG9hZChodHRwLCBmaWxlUmVmLCB2ZXJzaW9uKSA9PT0gdHJ1ZSkge1xuICAgICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZnMuc3RhdCh2UmVmLnBhdGgsIChzdGF0RXJyLCBzdGF0cykgPT4gYm91bmQoKCkgPT4ge1xuICAgICAgICBsZXQgcmVzcG9uc2VUeXBlO1xuICAgICAgICBpZiAoc3RhdEVyciB8fCAhc3RhdHMuaXNGaWxlKCkpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5fNDA0KGh0dHApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKChzdGF0cy5zaXplICE9PSB2UmVmLnNpemUpICYmICF0aGlzLmludGVncml0eUNoZWNrKSB7XG4gICAgICAgICAgdlJlZi5zaXplICAgID0gc3RhdHMuc2l6ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgoc3RhdHMuc2l6ZSAhPT0gdlJlZi5zaXplKSAmJiB0aGlzLmludGVncml0eUNoZWNrKSB7XG4gICAgICAgICAgcmVzcG9uc2VUeXBlID0gJzQwMCc7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5zZXJ2ZShodHRwLCBmaWxlUmVmLCB2UmVmLCB2ZXJzaW9uLCBudWxsLCAocmVzcG9uc2VUeXBlIHx8ICcyMDAnKSk7XG4gICAgICB9KSk7XG4gICAgICByZXR1cm4gdm9pZCAwO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fNDA0KGh0dHApO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIHNlcnZlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBodHRwICAgIC0gU2VydmVyIEhUVFAgb2JqZWN0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlUmVmIC0gUmVxdWVzdGVkIGZpbGUgT2JqZWN0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSB2UmVmICAgIC0gUmVxdWVzdGVkIGZpbGUgdmVyc2lvbiBPYmplY3RcbiAgICogQHBhcmFtIHtTdHJpbmd9IHZlcnNpb24gLSBSZXF1ZXN0ZWQgZmlsZSB2ZXJzaW9uXG4gICAqIEBwYXJhbSB7c3RyZWFtLlJlYWRhYmxlfG51bGx9IHJlYWRhYmxlU3RyZWFtIC0gUmVhZGFibGUgc3RyZWFtLCB3aGljaCBzZXJ2ZXMgYmluYXJ5IGZpbGUgZGF0YVxuICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2VUeXBlIC0gUmVzcG9uc2UgY29kZVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGZvcmNlMjAwIC0gRm9yY2UgMjAwIHJlc3BvbnNlIGNvZGUgb3ZlciAyMDZcbiAgICogQHN1bW1hcnkgSGFuZGxlIGFuZCByZXBseSB0byBpbmNvbWluZyByZXF1ZXN0XG4gICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAqL1xuICBzZXJ2ZShodHRwLCBmaWxlUmVmLCB2UmVmLCB2ZXJzaW9uID0gJ29yaWdpbmFsJywgcmVhZGFibGVTdHJlYW0gPSBudWxsLCBfcmVzcG9uc2VUeXBlID0gJzIwMCcsIGZvcmNlMjAwID0gZmFsc2UpIHtcbiAgICBsZXQgcGFydGlyYWwgPSBmYWxzZTtcbiAgICBsZXQgcmVxUmFuZ2UgPSBmYWxzZTtcbiAgICBsZXQgZGlzcG9zaXRpb25UeXBlID0gJyc7XG4gICAgbGV0IHN0YXJ0O1xuICAgIGxldCBlbmQ7XG4gICAgbGV0IHRha2U7XG4gICAgbGV0IHJlc3BvbnNlVHlwZSA9IF9yZXNwb25zZVR5cGU7XG5cbiAgICBpZiAoaHR0cC5wYXJhbXMucXVlcnkuZG93bmxvYWQgJiYgKGh0dHAucGFyYW1zLnF1ZXJ5LmRvd25sb2FkID09PSAndHJ1ZScpKSB7XG4gICAgICBkaXNwb3NpdGlvblR5cGUgPSAnYXR0YWNobWVudDsgJztcbiAgICB9IGVsc2Uge1xuICAgICAgZGlzcG9zaXRpb25UeXBlID0gJ2lubGluZTsgJztcbiAgICB9XG5cbiAgICBjb25zdCBkaXNwb3NpdGlvbk5hbWUgICAgID0gYGZpbGVuYW1lPVxcXCIke2VuY29kZVVSSSh2UmVmLm5hbWUgfHwgZmlsZVJlZi5uYW1lKS5yZXBsYWNlKC9cXCwvZywgJyUyQycpfVxcXCI7IGZpbGVuYW1lKj1VVEYtOCcnJHtlbmNvZGVVUklDb21wb25lbnQodlJlZi5uYW1lIHx8IGZpbGVSZWYubmFtZSl9OyBgO1xuICAgIGNvbnN0IGRpc3Bvc2l0aW9uRW5jb2RpbmcgPSAnY2hhcnNldD1VVEYtOCc7XG5cbiAgICBpZiAoIWh0dHAucmVzcG9uc2UuaGVhZGVyc1NlbnQpIHtcbiAgICAgIGh0dHAucmVzcG9uc2Uuc2V0SGVhZGVyKCdDb250ZW50LURpc3Bvc2l0aW9uJywgZGlzcG9zaXRpb25UeXBlICsgZGlzcG9zaXRpb25OYW1lICsgZGlzcG9zaXRpb25FbmNvZGluZyk7XG4gICAgfVxuXG4gICAgaWYgKGh0dHAucmVxdWVzdC5oZWFkZXJzLnJhbmdlICYmICFmb3JjZTIwMCkge1xuICAgICAgcGFydGlyYWwgICAgPSB0cnVlO1xuICAgICAgY29uc3QgYXJyYXkgPSBodHRwLnJlcXVlc3QuaGVhZGVycy5yYW5nZS5zcGxpdCgvYnl0ZXM9KFswLTldKiktKFswLTldKikvKTtcbiAgICAgIHN0YXJ0ICAgICAgID0gcGFyc2VJbnQoYXJyYXlbMV0pO1xuICAgICAgZW5kICAgICAgICAgPSBwYXJzZUludChhcnJheVsyXSk7XG4gICAgICBpZiAoaXNOYU4oZW5kKSkge1xuICAgICAgICBlbmQgICAgICAgPSB2UmVmLnNpemUgLSAxO1xuICAgICAgfVxuICAgICAgdGFrZSAgICAgICAgPSBlbmQgLSBzdGFydDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhcnQgPSAwO1xuICAgICAgZW5kICAgPSB2UmVmLnNpemUgLSAxO1xuICAgICAgdGFrZSAgPSB2UmVmLnNpemU7XG4gICAgfVxuXG4gICAgaWYgKHBhcnRpcmFsIHx8IChodHRwLnBhcmFtcy5xdWVyeS5wbGF5ICYmIChodHRwLnBhcmFtcy5xdWVyeS5wbGF5ID09PSAndHJ1ZScpKSkge1xuICAgICAgcmVxUmFuZ2UgPSB7c3RhcnQsIGVuZH07XG4gICAgICBpZiAoaXNOYU4oc3RhcnQpICYmICFpc05hTihlbmQpKSB7XG4gICAgICAgIHJlcVJhbmdlLnN0YXJ0ID0gZW5kIC0gdGFrZTtcbiAgICAgICAgcmVxUmFuZ2UuZW5kICAgPSBlbmQ7XG4gICAgICB9XG4gICAgICBpZiAoIWlzTmFOKHN0YXJ0KSAmJiBpc05hTihlbmQpKSB7XG4gICAgICAgIHJlcVJhbmdlLnN0YXJ0ID0gc3RhcnQ7XG4gICAgICAgIHJlcVJhbmdlLmVuZCAgID0gc3RhcnQgKyB0YWtlO1xuICAgICAgfVxuXG4gICAgICBpZiAoKHN0YXJ0ICsgdGFrZSkgPj0gdlJlZi5zaXplKSB7IHJlcVJhbmdlLmVuZCA9IHZSZWYuc2l6ZSAtIDE7IH1cblxuICAgICAgaWYgKHRoaXMuc3RyaWN0ICYmICgocmVxUmFuZ2Uuc3RhcnQgPj0gKHZSZWYuc2l6ZSAtIDEpKSB8fCAocmVxUmFuZ2UuZW5kID4gKHZSZWYuc2l6ZSAtIDEpKSkpIHtcbiAgICAgICAgcmVzcG9uc2VUeXBlID0gJzQxNic7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNwb25zZVR5cGUgPSAnMjA2JztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmVzcG9uc2VUeXBlID0gJzIwMCc7XG4gICAgfVxuXG4gICAgY29uc3Qgc3RyZWFtRXJyb3JIYW5kbGVyID0gKGVycm9yKSA9PiB7XG4gICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW3NlcnZlKCR7dlJlZi5wYXRofSwgJHt2ZXJzaW9ufSldIFs1MDBdYCwgZXJyb3IpO1xuICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmZpbmlzaGVkKSB7XG4gICAgICAgIGh0dHAucmVzcG9uc2UuZW5kKGVycm9yLnRvU3RyaW5nKCkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBoZWFkZXJzID0gaGVscGVycy5pc0Z1bmN0aW9uKHRoaXMucmVzcG9uc2VIZWFkZXJzKSA/IHRoaXMucmVzcG9uc2VIZWFkZXJzKHJlc3BvbnNlVHlwZSwgZmlsZVJlZiwgdlJlZiwgdmVyc2lvbikgOiB0aGlzLnJlc3BvbnNlSGVhZGVycztcblxuICAgIGlmICghaGVhZGVyc1snQ2FjaGUtQ29udHJvbCddKSB7XG4gICAgICBpZiAoIWh0dHAucmVzcG9uc2UuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgaHR0cC5yZXNwb25zZS5zZXRIZWFkZXIoJ0NhY2hlLUNvbnRyb2wnLCB0aGlzLmNhY2hlQ29udHJvbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChsZXQga2V5IGluIGhlYWRlcnMpIHtcbiAgICAgIGlmICghaHR0cC5yZXNwb25zZS5oZWFkZXJzU2VudCkge1xuICAgICAgICBodHRwLnJlc3BvbnNlLnNldEhlYWRlcihrZXksIGhlYWRlcnNba2V5XSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcmVzcG9uZCA9IChzdHJlYW0sIGNvZGUpID0+IHtcbiAgICAgIGlmICghaHR0cC5yZXNwb25zZS5oZWFkZXJzU2VudCAmJiByZWFkYWJsZVN0cmVhbSkge1xuICAgICAgICBodHRwLnJlc3BvbnNlLndyaXRlSGVhZChjb2RlKTtcbiAgICAgIH1cblxuICAgICAgaHR0cC5yZXNwb25zZS5vbignY2xvc2UnLCAoKSA9PiB7XG4gICAgICAgIGlmICh0eXBlb2Ygc3RyZWFtLmFib3J0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgc3RyZWFtLmFib3J0KCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBzdHJlYW0uZW5kID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgc3RyZWFtLmVuZCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgaHR0cC5yZXF1ZXN0Lm9uKCdhYm9ydGVkJywgKCkgPT4ge1xuICAgICAgICBodHRwLnJlcXVlc3QuYWJvcnRlZCA9IHRydWU7XG4gICAgICAgIGlmICh0eXBlb2Ygc3RyZWFtLmFib3J0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgc3RyZWFtLmFib3J0KCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBzdHJlYW0uZW5kID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgc3RyZWFtLmVuZCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgc3RyZWFtLm9uKCdvcGVuJywgKCkgPT4ge1xuICAgICAgICBpZiAoIWh0dHAucmVzcG9uc2UuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgICBodHRwLnJlc3BvbnNlLndyaXRlSGVhZChjb2RlKTtcbiAgICAgICAgfVxuICAgICAgfSkub24oJ2Fib3J0JywgKCkgPT4ge1xuICAgICAgICBpZiAoIWh0dHAucmVzcG9uc2UuZmluaXNoZWQpIHtcbiAgICAgICAgICBodHRwLnJlc3BvbnNlLmVuZCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghaHR0cC5yZXF1ZXN0LmFib3J0ZWQpIHtcbiAgICAgICAgICBodHRwLnJlcXVlc3QuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICB9KS5vbignZXJyb3InLCBzdHJlYW1FcnJvckhhbmRsZXJcbiAgICAgICkub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmZpbmlzaGVkKSB7XG4gICAgICAgICAgaHR0cC5yZXNwb25zZS5lbmQoKTtcbiAgICAgICAgfVxuICAgICAgfSkucGlwZShodHRwLnJlc3BvbnNlKTtcbiAgICB9O1xuXG4gICAgc3dpdGNoIChyZXNwb25zZVR5cGUpIHtcbiAgICBjYXNlICc0MDAnOlxuICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtzZXJ2ZSgke3ZSZWYucGF0aH0sICR7dmVyc2lvbn0pXSBbNDAwXSBDb250ZW50LUxlbmd0aCBtaXNtYXRjaCFgKTtcbiAgICAgIHZhciB0ZXh0ID0gJ0NvbnRlbnQtTGVuZ3RoIG1pc21hdGNoISc7XG5cbiAgICAgIGlmICghaHR0cC5yZXNwb25zZS5oZWFkZXJzU2VudCkge1xuICAgICAgICBodHRwLnJlc3BvbnNlLndyaXRlSGVhZCg0MDAsIHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW4nLFxuICAgICAgICAgICdDb250ZW50LUxlbmd0aCc6IHRleHQubGVuZ3RoXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWh0dHAucmVzcG9uc2UuZmluaXNoZWQpIHtcbiAgICAgICAgaHR0cC5yZXNwb25zZS5lbmQodGV4dCk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICc0MDQnOlxuICAgICAgdGhpcy5fNDA0KGh0dHApO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnNDE2JzpcbiAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbc2VydmUoJHt2UmVmLnBhdGh9LCAke3ZlcnNpb259KV0gWzQxNl0gQ29udGVudC1SYW5nZSBpcyBub3Qgc3BlY2lmaWVkIWApO1xuICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmhlYWRlcnNTZW50KSB7XG4gICAgICAgIGh0dHAucmVzcG9uc2Uud3JpdGVIZWFkKDQxNik7XG4gICAgICB9XG4gICAgICBpZiAoIWh0dHAucmVzcG9uc2UuZmluaXNoZWQpIHtcbiAgICAgICAgaHR0cC5yZXNwb25zZS5lbmQoKTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJzIwNic6XG4gICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW3NlcnZlKCR7dlJlZi5wYXRofSwgJHt2ZXJzaW9ufSldIFsyMDZdYCk7XG4gICAgICBpZiAoIWh0dHAucmVzcG9uc2UuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgaHR0cC5yZXNwb25zZS5zZXRIZWFkZXIoJ0NvbnRlbnQtUmFuZ2UnLCBgYnl0ZXMgJHtyZXFSYW5nZS5zdGFydH0tJHtyZXFSYW5nZS5lbmR9LyR7dlJlZi5zaXplfWApO1xuICAgICAgfVxuICAgICAgcmVzcG9uZChyZWFkYWJsZVN0cmVhbSB8fCBmcy5jcmVhdGVSZWFkU3RyZWFtKHZSZWYucGF0aCwge3N0YXJ0OiByZXFSYW5nZS5zdGFydCwgZW5kOiByZXFSYW5nZS5lbmR9KSwgMjA2KTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW3NlcnZlKCR7dlJlZi5wYXRofSwgJHt2ZXJzaW9ufSldIFsyMDBdYCk7XG4gICAgICByZXNwb25kKHJlYWRhYmxlU3RyZWFtIHx8IGZzLmNyZWF0ZVJlYWRTdHJlYW0odlJlZi5wYXRoKSwgMjAwKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IHsgRXZlbnRFbWl0dGVyIH0gICAgICAgICAgICBmcm9tICdldmVudGVtaXR0ZXIzJztcbmltcG9ydCB7IGNoZWNrLCBNYXRjaCB9ICAgICAgICAgICAgZnJvbSAnbWV0ZW9yL2NoZWNrJztcbmltcG9ydCB7IGZvcm1hdEZsZVVSTCwgaGVscGVycyB9ICAgZnJvbSAnLi9saWIuanMnO1xuaW1wb3J0IHsgRmlsZXNDdXJzb3IsIEZpbGVDdXJzb3IgfSBmcm9tICcuL2N1cnNvci5qcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEZpbGVzQ29sbGVjdGlvbkNvcmUgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgc3RhdGljIF9faGVscGVycyA9IGhlbHBlcnM7XG5cbiAgc3RhdGljIHNjaGVtYSA9IHtcbiAgICBfaWQ6IHtcbiAgICAgIHR5cGU6IFN0cmluZ1xuICAgIH0sXG4gICAgc2l6ZToge1xuICAgICAgdHlwZTogTnVtYmVyXG4gICAgfSxcbiAgICBuYW1lOiB7XG4gICAgICB0eXBlOiBTdHJpbmdcbiAgICB9LFxuICAgIHR5cGU6IHtcbiAgICAgIHR5cGU6IFN0cmluZ1xuICAgIH0sXG4gICAgcGF0aDoge1xuICAgICAgdHlwZTogU3RyaW5nXG4gICAgfSxcbiAgICBpc1ZpZGVvOiB7XG4gICAgICB0eXBlOiBCb29sZWFuXG4gICAgfSxcbiAgICBpc0F1ZGlvOiB7XG4gICAgICB0eXBlOiBCb29sZWFuXG4gICAgfSxcbiAgICBpc0ltYWdlOiB7XG4gICAgICB0eXBlOiBCb29sZWFuXG4gICAgfSxcbiAgICBpc1RleHQ6IHtcbiAgICAgIHR5cGU6IEJvb2xlYW5cbiAgICB9LFxuICAgIGlzSlNPTjoge1xuICAgICAgdHlwZTogQm9vbGVhblxuICAgIH0sXG4gICAgaXNQREY6IHtcbiAgICAgIHR5cGU6IEJvb2xlYW5cbiAgICB9LFxuICAgIGV4dGVuc2lvbjoge1xuICAgICAgdHlwZTogU3RyaW5nLFxuICAgICAgb3B0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIGV4dDoge1xuICAgICAgdHlwZTogU3RyaW5nLFxuICAgICAgb3B0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIGV4dGVuc2lvbldpdGhEb3Q6IHtcbiAgICAgIHR5cGU6IFN0cmluZyxcbiAgICAgIG9wdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICBtaW1lOiB7XG4gICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICBvcHRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgJ21pbWUtdHlwZSc6IHtcbiAgICAgIHR5cGU6IFN0cmluZyxcbiAgICAgIG9wdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICBfc3RvcmFnZVBhdGg6IHtcbiAgICAgIHR5cGU6IFN0cmluZ1xuICAgIH0sXG4gICAgX2Rvd25sb2FkUm91dGU6IHtcbiAgICAgIHR5cGU6IFN0cmluZ1xuICAgIH0sXG4gICAgX2NvbGxlY3Rpb25OYW1lOiB7XG4gICAgICB0eXBlOiBTdHJpbmdcbiAgICB9LFxuICAgIHB1YmxpYzoge1xuICAgICAgdHlwZTogQm9vbGVhbixcbiAgICAgIG9wdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICBtZXRhOiB7XG4gICAgICB0eXBlOiBPYmplY3QsXG4gICAgICBibGFja2JveDogdHJ1ZSxcbiAgICAgIG9wdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB1c2VySWQ6IHtcbiAgICAgIHR5cGU6IFN0cmluZyxcbiAgICAgIG9wdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB1cGRhdGVkQXQ6IHtcbiAgICAgIHR5cGU6IERhdGUsXG4gICAgICBvcHRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgdmVyc2lvbnM6IHtcbiAgICAgIHR5cGU6IE9iamVjdCxcbiAgICAgIGJsYWNrYm94OiB0cnVlXG4gICAgfVxuICB9O1xuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uQ29yZVxuICAgKiBAbmFtZSBfZGVidWdcbiAgICogQHN1bW1hcnkgUHJpbnQgbG9ncyBpbiBkZWJ1ZyBtb2RlXG4gICAqIEByZXR1cm5zIHt2b2lkfVxuICAgKi9cbiAgX2RlYnVnKCkge1xuICAgIGlmICh0aGlzLmRlYnVnKSB7XG4gICAgICAoY29uc29sZS5pbmZvIHx8IGNvbnNvbGUubG9nIHx8IGZ1bmN0aW9uICgpIHsgfSkuYXBwbHkodW5kZWZpbmVkLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uQ29yZVxuICAgKiBAbmFtZSBfZ2V0RmlsZU5hbWVcbiAgICogQHBhcmFtIHtPYmplY3R9IGZpbGVEYXRhIC0gRmlsZSBPYmplY3RcbiAgICogQHN1bW1hcnkgUmV0dXJucyBmaWxlJ3MgbmFtZVxuICAgKiBAcmV0dXJucyB7U3RyaW5nfVxuICAgKi9cbiAgX2dldEZpbGVOYW1lKGZpbGVEYXRhKSB7XG4gICAgY29uc3QgZmlsZU5hbWUgPSBmaWxlRGF0YS5uYW1lIHx8IGZpbGVEYXRhLmZpbGVOYW1lO1xuICAgIGlmIChoZWxwZXJzLmlzU3RyaW5nKGZpbGVOYW1lKSAmJiAoZmlsZU5hbWUubGVuZ3RoID4gMCkpIHtcbiAgICAgIHJldHVybiAoZmlsZURhdGEubmFtZSB8fCBmaWxlRGF0YS5maWxlTmFtZSkucmVwbGFjZSgvXlxcLlxcLisvLCAnJykucmVwbGFjZSgvXFwuezIsfS9nLCAnLicpLnJlcGxhY2UoL1xcLy9nLCAnJyk7XG4gICAgfVxuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uQ29yZVxuICAgKiBAbmFtZSBfZ2V0RXh0XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBGaWxlTmFtZSAtIEZpbGUgbmFtZVxuICAgKiBAc3VtbWFyeSBHZXQgZXh0ZW5zaW9uIGZyb20gRmlsZU5hbWVcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIF9nZXRFeHQoZmlsZU5hbWUpIHtcbiAgICBpZiAoISF+ZmlsZU5hbWUuaW5kZXhPZignLicpKSB7XG4gICAgICBjb25zdCBleHRlbnNpb24gPSAoZmlsZU5hbWUuc3BsaXQoJy4nKS5wb3AoKS5zcGxpdCgnPycpWzBdIHx8ICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgcmV0dXJuIHsgZXh0OiBleHRlbnNpb24sIGV4dGVuc2lvbiwgZXh0ZW5zaW9uV2l0aERvdDogYC4ke2V4dGVuc2lvbn1gIH07XG4gICAgfVxuICAgIHJldHVybiB7IGV4dDogJycsIGV4dGVuc2lvbjogJycsIGV4dGVuc2lvbldpdGhEb3Q6ICcnIH07XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvbkNvcmVcbiAgICogQG5hbWUgX3VwZGF0ZUZpbGVUeXBlc1xuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZpbGUgZGF0YVxuICAgKiBAc3VtbWFyeSBJbnRlcm5hbCBtZXRob2QuIENsYXNzaWZ5IGZpbGUgYmFzZWQgb24gJ3R5cGUnIGZpZWxkXG4gICAqL1xuICBfdXBkYXRlRmlsZVR5cGVzKGRhdGEpIHtcbiAgICBkYXRhLmlzVmlkZW8gID0gL152aWRlb1xcLy9pLnRlc3QoZGF0YS50eXBlKTtcbiAgICBkYXRhLmlzQXVkaW8gID0gL15hdWRpb1xcLy9pLnRlc3QoZGF0YS50eXBlKTtcbiAgICBkYXRhLmlzSW1hZ2UgID0gL15pbWFnZVxcLy9pLnRlc3QoZGF0YS50eXBlKTtcbiAgICBkYXRhLmlzVGV4dCAgID0gL150ZXh0XFwvL2kudGVzdChkYXRhLnR5cGUpO1xuICAgIGRhdGEuaXNKU09OICAgPSAvXmFwcGxpY2F0aW9uXFwvanNvbiQvaS50ZXN0KGRhdGEudHlwZSk7XG4gICAgZGF0YS5pc1BERiAgICA9IC9eYXBwbGljYXRpb25cXC8oeC0pP3BkZiQvaS50ZXN0KGRhdGEudHlwZSk7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvbkNvcmVcbiAgICogQG5hbWUgX2RhdGFUb1NjaGVtYVxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZpbGUgZGF0YVxuICAgKiBAc3VtbWFyeSBJbnRlcm5hbCBtZXRob2QuIEJ1aWxkIG9iamVjdCBpbiBhY2NvcmRhbmNlIHdpdGggZGVmYXVsdCBzY2hlbWEgZnJvbSBGaWxlIGRhdGFcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIF9kYXRhVG9TY2hlbWEoZGF0YSkge1xuICAgIGNvbnN0IGRzID0ge1xuICAgICAgbmFtZTogZGF0YS5uYW1lLFxuICAgICAgZXh0ZW5zaW9uOiBkYXRhLmV4dGVuc2lvbixcbiAgICAgIGV4dDogZGF0YS5leHRlbnNpb24sXG4gICAgICBleHRlbnNpb25XaXRoRG90OiAnLicgKyBkYXRhLmV4dGVuc2lvbixcbiAgICAgIHBhdGg6IGRhdGEucGF0aCxcbiAgICAgIG1ldGE6IGRhdGEubWV0YSxcbiAgICAgIHR5cGU6IGRhdGEudHlwZSxcbiAgICAgIG1pbWU6IGRhdGEudHlwZSxcbiAgICAgICdtaW1lLXR5cGUnOiBkYXRhLnR5cGUsXG4gICAgICBzaXplOiBkYXRhLnNpemUsXG4gICAgICB1c2VySWQ6IGRhdGEudXNlcklkIHx8IG51bGwsXG4gICAgICB2ZXJzaW9uczoge1xuICAgICAgICBvcmlnaW5hbDoge1xuICAgICAgICAgIHBhdGg6IGRhdGEucGF0aCxcbiAgICAgICAgICBzaXplOiBkYXRhLnNpemUsXG4gICAgICAgICAgdHlwZTogZGF0YS50eXBlLFxuICAgICAgICAgIGV4dGVuc2lvbjogZGF0YS5leHRlbnNpb25cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIF9kb3dubG9hZFJvdXRlOiBkYXRhLl9kb3dubG9hZFJvdXRlIHx8IHRoaXMuZG93bmxvYWRSb3V0ZSxcbiAgICAgIF9jb2xsZWN0aW9uTmFtZTogZGF0YS5fY29sbGVjdGlvbk5hbWUgfHwgdGhpcy5jb2xsZWN0aW9uTmFtZVxuICAgIH07XG5cbiAgICAvL09wdGlvbmFsIGZpbGVJZFxuICAgIGlmIChkYXRhLmZpbGVJZCkge1xuICAgICAgZHMuX2lkID0gZGF0YS5maWxlSWQ7XG4gICAgfVxuXG4gICAgdGhpcy5fdXBkYXRlRmlsZVR5cGVzKGRzKTtcbiAgICBkcy5fc3RvcmFnZVBhdGggPSBkYXRhLl9zdG9yYWdlUGF0aCB8fCB0aGlzLnN0b3JhZ2VQYXRoKE9iamVjdC5hc3NpZ24oe30sIGRhdGEsIGRzKSk7XG4gICAgcmV0dXJuIGRzO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25Db3JlXG4gICAqIEBuYW1lIGZpbmRPbmVcbiAgICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBzZWxlY3RvciAtIE1vbmdvLVN0eWxlIHNlbGVjdG9yIChodHRwOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI3NlbGVjdG9ycylcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBNb25nby1TdHlsZSBzZWxlY3RvciBPcHRpb25zIChodHRwOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI3NvcnRzcGVjaWZpZXJzKVxuICAgKiBAc3VtbWFyeSBGaW5kIGFuZCByZXR1cm4gQ3Vyc29yIGZvciBtYXRjaGluZyBkb2N1bWVudCBPYmplY3RcbiAgICogQHJldHVybnMge0ZpbGVDdXJzb3J9IEluc3RhbmNlXG4gICAqL1xuICBmaW5kT25lKHNlbGVjdG9yID0ge30sIG9wdGlvbnMpIHtcbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2ZpbmRPbmUoJHtKU09OLnN0cmluZ2lmeShzZWxlY3Rvcil9LCAke0pTT04uc3RyaW5naWZ5KG9wdGlvbnMpfSldYCk7XG4gICAgY2hlY2soc2VsZWN0b3IsIE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKE9iamVjdCwgU3RyaW5nLCBCb29sZWFuLCBOdW1iZXIsIG51bGwpKSk7XG4gICAgY2hlY2sob3B0aW9ucywgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG5cbiAgICBjb25zdCBkb2MgPSB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShzZWxlY3Rvciwgb3B0aW9ucyk7XG4gICAgaWYgKGRvYykge1xuICAgICAgcmV0dXJuIG5ldyBGaWxlQ3Vyc29yKGRvYywgdGhpcyk7XG4gICAgfVxuICAgIHJldHVybiBkb2M7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvbkNvcmVcbiAgICogQG5hbWUgZmluZFxuICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IHNlbGVjdG9yIC0gTW9uZ28tU3R5bGUgc2VsZWN0b3IgKGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjc2VsZWN0b3JzKVxuICAgKiBAcGFyYW0ge09iamVjdH0gICAgICAgIG9wdGlvbnMgIC0gTW9uZ28tU3R5bGUgc2VsZWN0b3IgT3B0aW9ucyAoaHR0cDovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNzb3J0c3BlY2lmaWVycylcbiAgICogQHN1bW1hcnkgRmluZCBhbmQgcmV0dXJuIEN1cnNvciBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gICAqIEByZXR1cm5zIHtGaWxlc0N1cnNvcn0gSW5zdGFuY2VcbiAgICovXG4gIGZpbmQoc2VsZWN0b3IgPSB7fSwgb3B0aW9ucykge1xuICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbZmluZCgke0pTT04uc3RyaW5naWZ5KHNlbGVjdG9yKX0sICR7SlNPTi5zdHJpbmdpZnkob3B0aW9ucyl9KV1gKTtcbiAgICBjaGVjayhzZWxlY3RvciwgTWF0Y2guT3B0aW9uYWwoTWF0Y2guT25lT2YoT2JqZWN0LCBTdHJpbmcsIEJvb2xlYW4sIE51bWJlciwgbnVsbCkpKTtcbiAgICBjaGVjayhvcHRpb25zLCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcblxuICAgIHJldHVybiBuZXcgRmlsZXNDdXJzb3Ioc2VsZWN0b3IsIG9wdGlvbnMsIHRoaXMpO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25Db3JlXG4gICAqIEBuYW1lIHVwZGF0ZVxuICAgKiBAc2VlIGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vIy9mdWxsL3VwZGF0ZVxuICAgKiBAc3VtbWFyeSBsaW5rIE1vbmdvLkNvbGxlY3Rpb24gdXBkYXRlIG1ldGhvZFxuICAgKiBAcmV0dXJucyB7TW9uZ28uQ29sbGVjdGlvbn0gSW5zdGFuY2VcbiAgICovXG4gIHVwZGF0ZSgpIHtcbiAgICB0aGlzLmNvbGxlY3Rpb24udXBkYXRlLmFwcGx5KHRoaXMuY29sbGVjdGlvbiwgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25Db3JlXG4gICAqIEBuYW1lIGxpbmtcbiAgICogQHBhcmFtIHtPYmplY3R9IGZpbGVSZWYgLSBGaWxlIHJlZmVyZW5jZSBvYmplY3RcbiAgICogQHBhcmFtIHtTdHJpbmd9IHZlcnNpb24gLSBWZXJzaW9uIG9mIGZpbGUgeW91IHdvdWxkIGxpa2UgdG8gcmVxdWVzdFxuICAgKiBAcGFyYW0ge1N0cmluZ30gVVJJQmFzZSAtIFtPcHRpb25hbF0gVVJJIGJhc2UsIHNlZSAtIGh0dHBzOi8vZ2l0aHViLmNvbS9WZWxpb3ZHcm91cC9NZXRlb3ItRmlsZXMvaXNzdWVzLzYyNlxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGRvd25sb2FkYWJsZSBVUkxcbiAgICogQHJldHVybnMge1N0cmluZ30gRW1wdHkgc3RyaW5nIHJldHVybmVkIGluIGNhc2UgaWYgZmlsZSBub3QgZm91bmQgaW4gREJcbiAgICovXG4gIGxpbmsoZmlsZVJlZiwgdmVyc2lvbiA9ICdvcmlnaW5hbCcsIFVSSUJhc2UpIHtcbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2xpbmsoJHsoaGVscGVycy5pc09iamVjdChmaWxlUmVmKSA/IGZpbGVSZWYuX2lkIDogdW5kZWZpbmVkKX0sICR7dmVyc2lvbn0pXWApO1xuICAgIGNoZWNrKGZpbGVSZWYsIE9iamVjdCk7XG5cbiAgICBpZiAoIWZpbGVSZWYpIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG4gICAgcmV0dXJuIGZvcm1hdEZsZVVSTChmaWxlUmVmLCB2ZXJzaW9uLCBVUklCYXNlKTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5cbi8qXG4gKiBAcHJpdmF0ZVxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAY2xhc3MgRmlsZUN1cnNvclxuICogQHBhcmFtIF9maWxlUmVmICAgIHtPYmplY3R9IC0gTW9uZ28tU3R5bGUgc2VsZWN0b3IgKGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjc2VsZWN0b3JzKVxuICogQHBhcmFtIF9jb2xsZWN0aW9uIHtGaWxlc0NvbGxlY3Rpb259IC0gRmlsZXNDb2xsZWN0aW9uIEluc3RhbmNlXG4gKiBAc3VtbWFyeSBJbnRlcm5hbCBjbGFzcywgcmVwcmVzZW50cyBlYWNoIHJlY29yZCBpbiBgRmlsZXNDdXJzb3IuZWFjaCgpYCBvciBkb2N1bWVudCByZXR1cm5lZCBmcm9tIGAuZmluZE9uZSgpYCBtZXRob2RcbiAqL1xuZXhwb3J0IGNsYXNzIEZpbGVDdXJzb3Ige1xuICBjb25zdHJ1Y3RvcihfZmlsZVJlZiwgX2NvbGxlY3Rpb24pIHtcbiAgICB0aGlzLl9maWxlUmVmICAgID0gX2ZpbGVSZWY7XG4gICAgdGhpcy5fY29sbGVjdGlvbiA9IF9jb2xsZWN0aW9uO1xuICAgIE9iamVjdC5hc3NpZ24odGhpcywgX2ZpbGVSZWYpO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlQ3Vyc29yXG4gICAqIEBuYW1lIHJlbW92ZVxuICAgKiBAcGFyYW0gY2FsbGJhY2sge0Z1bmN0aW9ufSAtIFRyaWdnZXJlZCBhc3luY2hyb25vdXNseSBhZnRlciBpdGVtIGlzIHJlbW92ZWQgb3IgZmFpbGVkIHRvIGJlIHJlbW92ZWRcbiAgICogQHN1bW1hcnkgUmVtb3ZlIGRvY3VtZW50XG4gICAqIEByZXR1cm5zIHtGaWxlQ3Vyc29yfVxuICAgKi9cbiAgcmVtb3ZlKGNhbGxiYWNrKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlQ3Vyc29yXSBbcmVtb3ZlKCldJyk7XG4gICAgaWYgKHRoaXMuX2ZpbGVSZWYpIHtcbiAgICAgIHRoaXMuX2NvbGxlY3Rpb24ucmVtb3ZlKHRoaXMuX2ZpbGVSZWYuX2lkLCBjYWxsYmFjayk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKG5ldyBNZXRlb3IuRXJyb3IoNDA0LCAnTm8gc3VjaCBmaWxlJykpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZUN1cnNvclxuICAgKiBAbmFtZSBsaW5rXG4gICAqIEBwYXJhbSB2ZXJzaW9uIHtTdHJpbmd9IC0gTmFtZSBvZiBmaWxlJ3Mgc3VidmVyc2lvblxuICAgKiBAcGFyYW0gVVJJQmFzZSB7U3RyaW5nfSAtIFtPcHRpb25hbF0gVVJJIGJhc2UsIHNlZSAtIGh0dHBzOi8vZ2l0aHViLmNvbS9WZWxpb3ZHcm91cC9NZXRlb3ItRmlsZXMvaXNzdWVzLzYyNlxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGRvd25sb2FkYWJsZSBVUkwgdG8gRmlsZVxuICAgKiBAcmV0dXJucyB7U3RyaW5nfVxuICAgKi9cbiAgbGluayh2ZXJzaW9uID0gJ29yaWdpbmFsJywgVVJJQmFzZSkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZUN1cnNvcl0gW2xpbmsoJHt2ZXJzaW9ufSldYCk7XG4gICAgaWYgKHRoaXMuX2ZpbGVSZWYpIHtcbiAgICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9uLmxpbmsodGhpcy5fZmlsZVJlZiwgdmVyc2lvbiwgVVJJQmFzZSk7XG4gICAgfVxuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZUN1cnNvclxuICAgKiBAbmFtZSBnZXRcbiAgICogQHBhcmFtIHByb3BlcnR5IHtTdHJpbmd9IC0gTmFtZSBvZiBzdWItb2JqZWN0IHByb3BlcnR5XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgY3VycmVudCBkb2N1bWVudCBhcyBhIHBsYWluIE9iamVjdCwgaWYgYHByb3BlcnR5YCBpcyBzcGVjaWZpZWQgLSByZXR1cm5zIHZhbHVlIG9mIHN1Yi1vYmplY3QgcHJvcGVydHlcbiAgICogQHJldHVybnMge09iamVjdHxtaXh9XG4gICAqL1xuICBnZXQocHJvcGVydHkpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVDdXJzb3JdIFtnZXQoJHtwcm9wZXJ0eX0pXWApO1xuICAgIGlmIChwcm9wZXJ0eSkge1xuICAgICAgcmV0dXJuIHRoaXMuX2ZpbGVSZWZbcHJvcGVydHldO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZmlsZVJlZjtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZUN1cnNvclxuICAgKiBAbmFtZSBmZXRjaFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGRvY3VtZW50IGFzIHBsYWluIE9iamVjdCBpbiBBcnJheVxuICAgKiBAcmV0dXJucyB7W09iamVjdF19XG4gICAqL1xuICBmZXRjaCgpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVDdXJzb3JdIFtmZXRjaCgpXScpO1xuICAgIHJldHVybiBbdGhpcy5fZmlsZVJlZl07XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVDdXJzb3JcbiAgICogQG5hbWUgd2l0aFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIHJlYWN0aXZlIHZlcnNpb24gb2YgY3VycmVudCBGaWxlQ3Vyc29yLCB1c2VmdWwgdG8gdXNlIHdpdGggYHt7I3dpdGh9fS4uLnt7L3dpdGh9fWAgYmxvY2sgdGVtcGxhdGUgaGVscGVyXG4gICAqIEByZXR1cm5zIHtbT2JqZWN0XX1cbiAgICovXG4gIHdpdGgoKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlQ3Vyc29yXSBbd2l0aCgpXScpO1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHRoaXMsIHRoaXMuX2NvbGxlY3Rpb24uY29sbGVjdGlvbi5maW5kT25lKHRoaXMuX2ZpbGVSZWYuX2lkKSk7XG4gIH1cbn1cblxuLypcbiAqIEBwcml2YXRlXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBjbGFzcyBGaWxlc0N1cnNvclxuICogQHBhcmFtIF9zZWxlY3RvciAgIHtTdHJpbmd8T2JqZWN0fSAgIC0gTW9uZ28tU3R5bGUgc2VsZWN0b3IgKGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjc2VsZWN0b3JzKVxuICogQHBhcmFtIG9wdGlvbnMgICAgIHtPYmplY3R9ICAgICAgICAgIC0gTW9uZ28tU3R5bGUgc2VsZWN0b3IgT3B0aW9ucyAoaHR0cDovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNzZWxlY3RvcnMpXG4gKiBAcGFyYW0gX2NvbGxlY3Rpb24ge0ZpbGVzQ29sbGVjdGlvbn0gLSBGaWxlc0NvbGxlY3Rpb24gSW5zdGFuY2VcbiAqIEBzdW1tYXJ5IEltcGxlbWVudGF0aW9uIG9mIEN1cnNvciBmb3IgRmlsZXNDb2xsZWN0aW9uXG4gKi9cbmV4cG9ydCBjbGFzcyBGaWxlc0N1cnNvciB7XG4gIGNvbnN0cnVjdG9yKF9zZWxlY3RvciA9IHt9LCBvcHRpb25zLCBfY29sbGVjdGlvbikge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24gPSBfY29sbGVjdGlvbjtcbiAgICB0aGlzLl9zZWxlY3RvciAgID0gX3NlbGVjdG9yO1xuICAgIHRoaXMuX2N1cnJlbnQgICAgPSAtMTtcbiAgICB0aGlzLmN1cnNvciAgICAgID0gdGhpcy5fY29sbGVjdGlvbi5jb2xsZWN0aW9uLmZpbmQodGhpcy5fc2VsZWN0b3IsIG9wdGlvbnMpO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBnZXRcbiAgICogQHN1bW1hcnkgUmV0dXJucyBhbGwgbWF0Y2hpbmcgZG9jdW1lbnQocykgYXMgYW4gQXJyYXkuIEFsaWFzIG9mIGAuZmV0Y2goKWBcbiAgICogQHJldHVybnMge1tPYmplY3RdfVxuICAgKi9cbiAgZ2V0KCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtnZXQoKV0nKTtcbiAgICByZXR1cm4gdGhpcy5jdXJzb3IuZmV0Y2goKTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgaGFzTmV4dFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGB0cnVlYCBpZiB0aGVyZSBpcyBuZXh0IGl0ZW0gYXZhaWxhYmxlIG9uIEN1cnNvclxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGhhc05leHQoKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW2hhc05leHQoKV0nKTtcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudCA8ICh0aGlzLmN1cnNvci5jb3VudCgpIC0gMSk7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIG5leHRcbiAgICogQHN1bW1hcnkgUmV0dXJucyBuZXh0IGl0ZW0gb24gQ3Vyc29yLCBpZiBhdmFpbGFibGVcbiAgICogQHJldHVybnMge09iamVjdHx1bmRlZmluZWR9XG4gICAqL1xuICBuZXh0KCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtuZXh0KCldJyk7XG4gICAgdGhpcy5jdXJzb3IuZmV0Y2goKVsrK3RoaXMuX2N1cnJlbnRdO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBoYXNQcmV2aW91c1xuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGB0cnVlYCBpZiB0aGVyZSBpcyBwcmV2aW91cyBpdGVtIGF2YWlsYWJsZSBvbiBDdXJzb3JcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBoYXNQcmV2aW91cygpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbaGFzUHJldmlvdXMoKV0nKTtcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudCAhPT0gLTE7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIHByZXZpb3VzXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgcHJldmlvdXMgaXRlbSBvbiBDdXJzb3IsIGlmIGF2YWlsYWJsZVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fHVuZGVmaW5lZH1cbiAgICovXG4gIHByZXZpb3VzKCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtwcmV2aW91cygpXScpO1xuICAgIHRoaXMuY3Vyc29yLmZldGNoKClbLS10aGlzLl9jdXJyZW50XTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgZmV0Y2hcbiAgICogQHN1bW1hcnkgUmV0dXJucyBhbGwgbWF0Y2hpbmcgZG9jdW1lbnQocykgYXMgYW4gQXJyYXkuXG4gICAqIEByZXR1cm5zIHtbT2JqZWN0XX1cbiAgICovXG4gIGZldGNoKCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtmZXRjaCgpXScpO1xuICAgIHJldHVybiB0aGlzLmN1cnNvci5mZXRjaCgpIHx8IFtdO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBmaXJzdFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGZpcnN0IGl0ZW0gb24gQ3Vyc29yLCBpZiBhdmFpbGFibGVcbiAgICogQHJldHVybnMge09iamVjdHx1bmRlZmluZWR9XG4gICAqL1xuICBmaXJzdCgpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbZmlyc3QoKV0nKTtcbiAgICB0aGlzLl9jdXJyZW50ID0gMDtcbiAgICByZXR1cm4gdGhpcy5mZXRjaCgpW3RoaXMuX2N1cnJlbnRdO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBsYXN0XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgbGFzdCBpdGVtIG9uIEN1cnNvciwgaWYgYXZhaWxhYmxlXG4gICAqIEByZXR1cm5zIHtPYmplY3R8dW5kZWZpbmVkfVxuICAgKi9cbiAgbGFzdCgpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbbGFzdCgpXScpO1xuICAgIHRoaXMuX2N1cnJlbnQgPSB0aGlzLmNvdW50KCkgLSAxO1xuICAgIHJldHVybiB0aGlzLmZldGNoKClbdGhpcy5fY3VycmVudF07XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIGNvdW50XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgdGhlIG51bWJlciBvZiBkb2N1bWVudHMgdGhhdCBtYXRjaCBhIHF1ZXJ5XG4gICAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gICAqL1xuICBjb3VudCgpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbY291bnQoKV0nKTtcbiAgICByZXR1cm4gdGhpcy5jdXJzb3IuY291bnQoKTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgcmVtb3ZlXG4gICAqIEBwYXJhbSBjYWxsYmFjayB7RnVuY3Rpb259IC0gVHJpZ2dlcmVkIGFzeW5jaHJvbm91c2x5IGFmdGVyIGl0ZW0gaXMgcmVtb3ZlZCBvciBmYWlsZWQgdG8gYmUgcmVtb3ZlZFxuICAgKiBAc3VtbWFyeSBSZW1vdmVzIGFsbCBkb2N1bWVudHMgdGhhdCBtYXRjaCBhIHF1ZXJ5XG4gICAqIEByZXR1cm5zIHtGaWxlc0N1cnNvcn1cbiAgICovXG4gIHJlbW92ZShjYWxsYmFjaykge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtyZW1vdmUoKV0nKTtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLnJlbW92ZSh0aGlzLl9zZWxlY3RvciwgY2FsbGJhY2spO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBmb3JFYWNoXG4gICAqIEBwYXJhbSBjYWxsYmFjayB7RnVuY3Rpb259IC0gRnVuY3Rpb24gdG8gY2FsbC4gSXQgd2lsbCBiZSBjYWxsZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM6IHRoZSBgZmlsZWAsIGEgMC1iYXNlZCBpbmRleCwgYW5kIGN1cnNvciBpdHNlbGZcbiAgICogQHBhcmFtIGNvbnRleHQge09iamVjdH0gLSBBbiBvYmplY3Qgd2hpY2ggd2lsbCBiZSB0aGUgdmFsdWUgb2YgYHRoaXNgIGluc2lkZSBgY2FsbGJhY2tgXG4gICAqIEBzdW1tYXJ5IENhbGwgYGNhbGxiYWNrYCBvbmNlIGZvciBlYWNoIG1hdGNoaW5nIGRvY3VtZW50LCBzZXF1ZW50aWFsbHkgYW5kIHN5bmNocm9ub3VzbHkuXG4gICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAqL1xuICBmb3JFYWNoKGNhbGxiYWNrLCBjb250ZXh0ID0ge30pIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbZm9yRWFjaCgpXScpO1xuICAgIHRoaXMuY3Vyc29yLmZvckVhY2goY2FsbGJhY2ssIGNvbnRleHQpO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBlYWNoXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgYW4gQXJyYXkgb2YgRmlsZUN1cnNvciBtYWRlIGZvciBlYWNoIGRvY3VtZW50IG9uIGN1cnJlbnQgY3Vyc29yXG4gICAqICAgICAgICAgIFVzZWZ1bCB3aGVuIHVzaW5nIGluIHt7I2VhY2ggRmlsZXNDdXJzb3IjZWFjaH19Li4ue3svZWFjaH19IGJsb2NrIHRlbXBsYXRlIGhlbHBlclxuICAgKiBAcmV0dXJucyB7W0ZpbGVDdXJzb3JdfVxuICAgKi9cbiAgZWFjaCgpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAoKGZpbGUpID0+IHtcbiAgICAgIHJldHVybiBuZXcgRmlsZUN1cnNvcihmaWxlLCB0aGlzLl9jb2xsZWN0aW9uKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgbWFwXG4gICAqIEBwYXJhbSBjYWxsYmFjayB7RnVuY3Rpb259IC0gRnVuY3Rpb24gdG8gY2FsbC4gSXQgd2lsbCBiZSBjYWxsZWQgd2l0aCB0aHJlZSBhcmd1bWVudHM6IHRoZSBgZmlsZWAsIGEgMC1iYXNlZCBpbmRleCwgYW5kIGN1cnNvciBpdHNlbGZcbiAgICogQHBhcmFtIGNvbnRleHQge09iamVjdH0gLSBBbiBvYmplY3Qgd2hpY2ggd2lsbCBiZSB0aGUgdmFsdWUgb2YgYHRoaXNgIGluc2lkZSBgY2FsbGJhY2tgXG4gICAqIEBzdW1tYXJ5IE1hcCBgY2FsbGJhY2tgIG92ZXIgYWxsIG1hdGNoaW5nIGRvY3VtZW50cy4gUmV0dXJucyBhbiBBcnJheS5cbiAgICogQHJldHVybnMge0FycmF5fVxuICAgKi9cbiAgbWFwKGNhbGxiYWNrLCBjb250ZXh0ID0ge30pIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbbWFwKCldJyk7XG4gICAgcmV0dXJuIHRoaXMuY3Vyc29yLm1hcChjYWxsYmFjaywgY29udGV4dCk7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIGN1cnJlbnRcbiAgICogQHN1bW1hcnkgUmV0dXJucyBjdXJyZW50IGl0ZW0gb24gQ3Vyc29yLCBpZiBhdmFpbGFibGVcbiAgICogQHJldHVybnMge09iamVjdHx1bmRlZmluZWR9XG4gICAqL1xuICBjdXJyZW50KCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtjdXJyZW50KCldJyk7XG4gICAgaWYgKHRoaXMuX2N1cnJlbnQgPCAwKSB7XG4gICAgICB0aGlzLl9jdXJyZW50ID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZmV0Y2goKVt0aGlzLl9jdXJyZW50XTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgb2JzZXJ2ZVxuICAgKiBAcGFyYW0gY2FsbGJhY2tzIHtPYmplY3R9IC0gRnVuY3Rpb25zIHRvIGNhbGwgdG8gZGVsaXZlciB0aGUgcmVzdWx0IHNldCBhcyBpdCBjaGFuZ2VzXG4gICAqIEBzdW1tYXJ5IFdhdGNoIGEgcXVlcnkuIFJlY2VpdmUgY2FsbGJhY2tzIGFzIHRoZSByZXN1bHQgc2V0IGNoYW5nZXMuXG4gICAqIEB1cmwgaHR0cDovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNNb25nby1DdXJzb3Itb2JzZXJ2ZVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIGxpdmUgcXVlcnkgaGFuZGxlXG4gICAqL1xuICBvYnNlcnZlKGNhbGxiYWNrcykge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtvYnNlcnZlKCldJyk7XG4gICAgcmV0dXJuIHRoaXMuY3Vyc29yLm9ic2VydmUoY2FsbGJhY2tzKTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgb2JzZXJ2ZUNoYW5nZXNcbiAgICogQHBhcmFtIGNhbGxiYWNrcyB7T2JqZWN0fSAtIEZ1bmN0aW9ucyB0byBjYWxsIHRvIGRlbGl2ZXIgdGhlIHJlc3VsdCBzZXQgYXMgaXQgY2hhbmdlc1xuICAgKiBAc3VtbWFyeSBXYXRjaCBhIHF1ZXJ5LiBSZWNlaXZlIGNhbGxiYWNrcyBhcyB0aGUgcmVzdWx0IHNldCBjaGFuZ2VzLiBPbmx5IHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIHRoZSBvbGQgYW5kIG5ldyBkb2N1bWVudHMgYXJlIHBhc3NlZCB0byB0aGUgY2FsbGJhY2tzLlxuICAgKiBAdXJsIGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjTW9uZ28tQ3Vyc29yLW9ic2VydmVDaGFuZ2VzXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IC0gbGl2ZSBxdWVyeSBoYW5kbGVcbiAgICovXG4gIG9ic2VydmVDaGFuZ2VzKGNhbGxiYWNrcykge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtvYnNlcnZlQ2hhbmdlcygpXScpO1xuICAgIHJldHVybiB0aGlzLmN1cnNvci5vYnNlcnZlQ2hhbmdlcyhjYWxsYmFja3MpO1xuICB9XG59XG4iLCJpbXBvcnQgeyBjaGVjayB9IGZyb20gJ21ldGVvci9jaGVjayc7XG5cbmNvbnN0IGhlbHBlcnMgPSB7XG4gIGlzVW5kZWZpbmVkKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHZvaWQgMDtcbiAgfSxcbiAgaXNPYmplY3Qob2JqKSB7XG4gICAgaWYgKHRoaXMuaXNBcnJheShvYmopIHx8IHRoaXMuaXNGdW5jdGlvbihvYmopKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBvYmogPT09IE9iamVjdChvYmopO1xuICB9LFxuICBpc0FycmF5KG9iaikge1xuICAgIHJldHVybiBBcnJheS5pc0FycmF5KG9iaik7XG4gIH0sXG4gIGlzQm9vbGVhbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB0cnVlIHx8IG9iaiA9PT0gZmFsc2UgfHwgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEJvb2xlYW5dJztcbiAgfSxcbiAgaXNGdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ2Z1bmN0aW9uJyB8fCBmYWxzZTtcbiAgfSxcbiAgaXNFbXB0eShvYmopIHtcbiAgICBpZiAodGhpcy5pc0RhdGUob2JqKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAodGhpcy5pc09iamVjdChvYmopKSB7XG4gICAgICByZXR1cm4gIU9iamVjdC5rZXlzKG9iaikubGVuZ3RoO1xuICAgIH1cbiAgICBpZiAodGhpcy5pc0FycmF5KG9iaikgfHwgdGhpcy5pc1N0cmluZyhvYmopKSB7XG4gICAgICByZXR1cm4gIW9iai5sZW5ndGg7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcbiAgY2xvbmUob2JqKSB7XG4gICAgaWYgKCF0aGlzLmlzT2JqZWN0KG9iaikpIHJldHVybiBvYmo7XG4gICAgcmV0dXJuIHRoaXMuaXNBcnJheShvYmopID8gb2JqLnNsaWNlKCkgOiBPYmplY3QuYXNzaWduKHt9LCBvYmopO1xuICB9LFxuICBoYXMoX29iaiwgcGF0aCkge1xuICAgIGxldCBvYmogPSBfb2JqO1xuICAgIGlmICghdGhpcy5pc09iamVjdChvYmopKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghdGhpcy5pc0FycmF5KHBhdGgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5pc09iamVjdChvYmopICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHBhdGgpO1xuICAgIH1cblxuICAgIGNvbnN0IGxlbmd0aCA9IHBhdGgubGVuZ3RoO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcGF0aFtpXSkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgb2JqID0gb2JqW3BhdGhbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gISFsZW5ndGg7XG4gIH0sXG4gIG9taXQob2JqLCAuLi5rZXlzKSB7XG4gICAgY29uc3QgY2xlYXIgPSBPYmplY3QuYXNzaWduKHt9LCBvYmopO1xuICAgIGZvciAobGV0IGkgPSBrZXlzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICBkZWxldGUgY2xlYXJba2V5c1tpXV07XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsZWFyO1xuICB9LFxuICBub3c6IERhdGUubm93LFxuICB0aHJvdHRsZShmdW5jLCB3YWl0LCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgcHJldmlvdXMgPSAwO1xuICAgIGxldCB0aW1lb3V0ID0gbnVsbDtcbiAgICBsZXQgcmVzdWx0O1xuICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuICAgIGxldCBzZWxmO1xuICAgIGxldCBhcmdzO1xuXG4gICAgY29uc3QgbGF0ZXIgPSAoKSA9PiB7XG4gICAgICBwcmV2aW91cyA9IG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UgPyAwIDogdGhhdC5ub3coKTtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShzZWxmLCBhcmdzKTtcbiAgICAgIGlmICghdGltZW91dCkge1xuICAgICAgICBzZWxmID0gYXJncyA9IG51bGw7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHRocm90dGxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnN0IG5vdyA9IHRoYXQubm93KCk7XG4gICAgICBpZiAoIXByZXZpb3VzICYmIG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UpIHByZXZpb3VzID0gbm93O1xuICAgICAgY29uc3QgcmVtYWluaW5nID0gd2FpdCAtIChub3cgLSBwcmV2aW91cyk7XG4gICAgICBzZWxmID0gdGhpcztcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBpZiAocmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gd2FpdCkge1xuICAgICAgICBpZiAodGltZW91dCkge1xuICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBwcmV2aW91cyA9IG5vdztcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShzZWxmLCBhcmdzKTtcbiAgICAgICAgaWYgKCF0aW1lb3V0KSB7XG4gICAgICAgICAgc2VsZiA9IGFyZ3MgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCF0aW1lb3V0ICYmIG9wdGlvbnMudHJhaWxpbmcgIT09IGZhbHNlKSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCByZW1haW5pbmcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgdGhyb3R0bGVkLmNhbmNlbCA9ICgpID0+IHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgIHByZXZpb3VzID0gMDtcbiAgICAgIHRpbWVvdXQgPSBzZWxmID0gYXJncyA9IG51bGw7XG4gICAgfTtcblxuICAgIHJldHVybiB0aHJvdHRsZWQ7XG4gIH1cbn07XG5cbmNvbnN0IF9oZWxwZXJzID0gWydTdHJpbmcnLCAnTnVtYmVyJywgJ0RhdGUnXTtcbmZvciAobGV0IGkgPSAwOyBpIDwgX2hlbHBlcnMubGVuZ3RoOyBpKyspIHtcbiAgaGVscGVyc1snaXMnICsgX2hlbHBlcnNbaV1dID0gZnVuY3Rpb24gKG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgJyArIF9oZWxwZXJzW2ldICsgJ10nO1xuICB9O1xufVxuXG4vKlxuICogQGNvbnN0IHtGdW5jdGlvbn0gZml4SlNPTlBhcnNlIC0gRml4IGlzc3VlIHdpdGggRGF0ZSBwYXJzZVxuICovXG5jb25zdCBmaXhKU09OUGFyc2UgPSBmdW5jdGlvbihvYmopIHtcbiAgZm9yIChsZXQga2V5IGluIG9iaikge1xuICAgIGlmIChoZWxwZXJzLmlzU3RyaW5nKG9ialtrZXldKSAmJiAhIX5vYmpba2V5XS5pbmRleE9mKCc9LS1KU09OLURBVEUtLT0nKSkge1xuICAgICAgb2JqW2tleV0gPSBvYmpba2V5XS5yZXBsYWNlKCc9LS1KU09OLURBVEUtLT0nLCAnJyk7XG4gICAgICBvYmpba2V5XSA9IG5ldyBEYXRlKHBhcnNlSW50KG9ialtrZXldKSk7XG4gICAgfSBlbHNlIGlmIChoZWxwZXJzLmlzT2JqZWN0KG9ialtrZXldKSkge1xuICAgICAgb2JqW2tleV0gPSBmaXhKU09OUGFyc2Uob2JqW2tleV0pO1xuICAgIH0gZWxzZSBpZiAoaGVscGVycy5pc0FycmF5KG9ialtrZXldKSkge1xuICAgICAgbGV0IHY7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG9ialtrZXldLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHYgPSBvYmpba2V5XVtpXTtcbiAgICAgICAgaWYgKGhlbHBlcnMuaXNPYmplY3QodikpIHtcbiAgICAgICAgICBvYmpba2V5XVtpXSA9IGZpeEpTT05QYXJzZSh2KTtcbiAgICAgICAgfSBlbHNlIGlmIChoZWxwZXJzLmlzU3RyaW5nKHYpICYmICEhfnYuaW5kZXhPZignPS0tSlNPTi1EQVRFLS09JykpIHtcbiAgICAgICAgICB2ID0gdi5yZXBsYWNlKCc9LS1KU09OLURBVEUtLT0nLCAnJyk7XG4gICAgICAgICAgb2JqW2tleV1baV0gPSBuZXcgRGF0ZShwYXJzZUludCh2KSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG9iajtcbn07XG5cbi8qXG4gKiBAY29uc3Qge0Z1bmN0aW9ufSBmaXhKU09OU3RyaW5naWZ5IC0gRml4IGlzc3VlIHdpdGggRGF0ZSBzdHJpbmdpZnlcbiAqL1xuY29uc3QgZml4SlNPTlN0cmluZ2lmeSA9IGZ1bmN0aW9uKG9iaikge1xuICBmb3IgKGxldCBrZXkgaW4gb2JqKSB7XG4gICAgaWYgKGhlbHBlcnMuaXNEYXRlKG9ialtrZXldKSkge1xuICAgICAgb2JqW2tleV0gPSBgPS0tSlNPTi1EQVRFLS09JHsrb2JqW2tleV19YDtcbiAgICB9IGVsc2UgaWYgKGhlbHBlcnMuaXNPYmplY3Qob2JqW2tleV0pKSB7XG4gICAgICBvYmpba2V5XSA9IGZpeEpTT05TdHJpbmdpZnkob2JqW2tleV0pO1xuICAgIH0gZWxzZSBpZiAoaGVscGVycy5pc0FycmF5KG9ialtrZXldKSkge1xuICAgICAgbGV0IHY7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG9ialtrZXldLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHYgPSBvYmpba2V5XVtpXTtcbiAgICAgICAgaWYgKGhlbHBlcnMuaXNPYmplY3QodikpIHtcbiAgICAgICAgICBvYmpba2V5XVtpXSA9IGZpeEpTT05TdHJpbmdpZnkodik7XG4gICAgICAgIH0gZWxzZSBpZiAoaGVscGVycy5pc0RhdGUodikpIHtcbiAgICAgICAgICBvYmpba2V5XVtpXSA9IGA9LS1KU09OLURBVEUtLT0keyt2fWA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG9iajtcbn07XG5cbi8qXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBwcml2YXRlXG4gKiBAbmFtZSBmb3JtYXRGbGVVUkxcbiAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlUmVmIC0gRmlsZSByZWZlcmVuY2Ugb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmVyc2lvbiAtIFtPcHRpb25hbF0gVmVyc2lvbiBvZiBmaWxlIHlvdSB3b3VsZCBsaWtlIGJ1aWxkIFVSTCBmb3JcbiAqIEBwYXJhbSB7U3RyaW5nfSBVUklCYXNlIC0gW09wdGlvbmFsXSBVUkkgYmFzZSwgc2VlIC0gaHR0cHM6Ly9naXRodWIuY29tL1ZlbGlvdkdyb3VwL01ldGVvci1GaWxlcy9pc3N1ZXMvNjI2XG4gKiBAc3VtbWFyeSBSZXR1cm5zIGZvcm1hdHRlZCBVUkwgZm9yIGZpbGVcbiAqIEByZXR1cm5zIHtTdHJpbmd9IERvd25sb2FkYWJsZSBsaW5rXG4gKi9cbmNvbnN0IGZvcm1hdEZsZVVSTCA9IChmaWxlUmVmLCB2ZXJzaW9uID0gJ29yaWdpbmFsJywgX1VSSUJhc2UgPSAoX19tZXRlb3JfcnVudGltZV9jb25maWdfXyB8fCB7fSkuUk9PVF9VUkwpID0+IHtcbiAgY2hlY2soZmlsZVJlZiwgT2JqZWN0KTtcbiAgY2hlY2sodmVyc2lvbiwgU3RyaW5nKTtcbiAgbGV0IFVSSUJhc2UgPSBfVVJJQmFzZTtcblxuICBpZiAoIWhlbHBlcnMuaXNTdHJpbmcoVVJJQmFzZSkpIHtcbiAgICBVUklCYXNlID0gKF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18gfHwge30pLlJPT1RfVVJMIHx8ICcvJztcbiAgfVxuXG4gIGNvbnN0IF9yb290ID0gVVJJQmFzZS5yZXBsYWNlKC9cXC8rJC8sICcnKTtcbiAgY29uc3QgdlJlZiA9IChmaWxlUmVmLnZlcnNpb25zICYmIGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl0pIHx8IGZpbGVSZWYgfHwge307XG5cbiAgbGV0IGV4dDtcbiAgaWYgKGhlbHBlcnMuaXNTdHJpbmcodlJlZi5leHRlbnNpb24pKSB7XG4gICAgZXh0ID0gYC4ke3ZSZWYuZXh0ZW5zaW9uLnJlcGxhY2UoL15cXC4vLCAnJyl9YDtcbiAgfSBlbHNlIHtcbiAgICBleHQgPSAnJztcbiAgfVxuXG4gIGlmIChmaWxlUmVmLnB1YmxpYyA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBfcm9vdCArICh2ZXJzaW9uID09PSAnb3JpZ2luYWwnID8gYCR7ZmlsZVJlZi5fZG93bmxvYWRSb3V0ZX0vJHtmaWxlUmVmLl9pZH0ke2V4dH1gIDogYCR7ZmlsZVJlZi5fZG93bmxvYWRSb3V0ZX0vJHt2ZXJzaW9ufS0ke2ZpbGVSZWYuX2lkfSR7ZXh0fWApO1xuICB9XG4gIHJldHVybiBfcm9vdCArIGAke2ZpbGVSZWYuX2Rvd25sb2FkUm91dGV9LyR7ZmlsZVJlZi5fY29sbGVjdGlvbk5hbWV9LyR7ZmlsZVJlZi5faWR9LyR7dmVyc2lvbn0vJHtmaWxlUmVmLl9pZH0ke2V4dH1gO1xufTtcblxuZXhwb3J0IHsgZml4SlNPTlBhcnNlLCBmaXhKU09OU3RyaW5naWZ5LCBmb3JtYXRGbGVVUkwsIGhlbHBlcnMgfTtcbiIsImltcG9ydCBmcyAgICAgICAgICBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgeyBNZXRlb3IgfSAgZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBoZWxwZXJzIH0gZnJvbSAnLi9saWIuanMnO1xuY29uc3QgTk9PUCA9ICgpID0+IHt9O1xuXG4vKlxuICogQGNvbnN0IHtPYmplY3R9IGJvdW5kICAgLSBNZXRlb3IuYmluZEVudmlyb25tZW50IChGaWJlciB3cmFwcGVyKVxuICogQGNvbnN0IHtPYmplY3R9IGZkQ2FjaGUgLSBGaWxlIERlc2NyaXB0b3JzIENhY2hlXG4gKi9cbmNvbnN0IGJvdW5kICAgPSBNZXRlb3IuYmluZEVudmlyb25tZW50KGNhbGxiYWNrID0+IGNhbGxiYWNrKCkpO1xuY29uc3QgZmRDYWNoZSA9IHt9O1xuXG4vKlxuICogQHByaXZhdGVcbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEBjbGFzcyBXcml0ZVN0cmVhbVxuICogQHBhcmFtIHBhdGggICAgICB7U3RyaW5nfSAtIFBhdGggdG8gZmlsZSBvbiBGU1xuICogQHBhcmFtIG1heExlbmd0aCB7TnVtYmVyfSAtIE1heCBhbW91bnQgb2YgY2h1bmtzIGluIHN0cmVhbVxuICogQHBhcmFtIGZpbGUgICAgICB7T2JqZWN0fSAtIGZpbGVSZWYgT2JqZWN0XG4gKiBAc3VtbWFyeSB3cml0YWJsZVN0cmVhbSB3cmFwcGVyIGNsYXNzLCBtYWtlcyBzdXJlIGNodW5rcyBpcyB3cml0dGVuIGluIGdpdmVuIG9yZGVyLiBJbXBsZW1lbnRhdGlvbiBvZiBxdWV1ZSBzdHJlYW0uXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFdyaXRlU3RyZWFtIHtcbiAgY29uc3RydWN0b3IocGF0aCwgbWF4TGVuZ3RoLCBmaWxlLCBwZXJtaXNzaW9ucykge1xuICAgIHRoaXMucGF0aCA9IHBhdGg7XG4gICAgdGhpcy5tYXhMZW5ndGggPSBtYXhMZW5ndGg7XG4gICAgdGhpcy5maWxlID0gZmlsZTtcbiAgICB0aGlzLnBlcm1pc3Npb25zID0gcGVybWlzc2lvbnM7XG4gICAgaWYgKCF0aGlzLnBhdGggfHwgIWhlbHBlcnMuaXNTdHJpbmcodGhpcy5wYXRoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuZmQgICAgICAgICAgICA9IG51bGw7XG4gICAgdGhpcy53cml0dGVuQ2h1bmtzID0gMDtcbiAgICB0aGlzLmVuZGVkICAgICAgICAgPSBmYWxzZTtcbiAgICB0aGlzLmFib3J0ZWQgICAgICAgPSBmYWxzZTtcblxuICAgIGlmIChmZENhY2hlW3RoaXMucGF0aF0gJiYgIWZkQ2FjaGVbdGhpcy5wYXRoXS5lbmRlZCAmJiAhZmRDYWNoZVt0aGlzLnBhdGhdLmFib3J0ZWQpIHtcbiAgICAgIHRoaXMuZmQgPSBmZENhY2hlW3RoaXMucGF0aF0uZmQ7XG4gICAgICB0aGlzLndyaXR0ZW5DaHVua3MgPSBmZENhY2hlW3RoaXMucGF0aF0ud3JpdHRlbkNodW5rcztcbiAgICB9IGVsc2Uge1xuICAgICAgZnMuZW5zdXJlRmlsZSh0aGlzLnBhdGgsIChlZkVycm9yKSA9PiB7XG4gICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICBpZiAoZWZFcnJvcikge1xuICAgICAgICAgICAgdGhpcy5hYm9ydCgpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig1MDAsICdbRmlsZXNDb2xsZWN0aW9uXSBbd3JpdGVTdHJlYW1dIFtlbnN1cmVGaWxlXSBbRXJyb3I6XSAnICsgZWZFcnJvcik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZzLm9wZW4odGhpcy5wYXRoLCAncisnLCB0aGlzLnBlcm1pc3Npb25zLCAob0Vycm9yLCBmZCkgPT4ge1xuICAgICAgICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKG9FcnJvcikge1xuICAgICAgICAgICAgICAgICAgdGhpcy5hYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig1MDAsICdbRmlsZXNDb2xsZWN0aW9uXSBbd3JpdGVTdHJlYW1dIFtlbnN1cmVGaWxlXSBbb3Blbl0gW0Vycm9yOl0gJyArIG9FcnJvcik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMuZmQgPSBmZDtcbiAgICAgICAgICAgICAgICAgIGZkQ2FjaGVbdGhpcy5wYXRoXSA9IHRoaXM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKlxuICAgKiBAbWVtYmVyT2Ygd3JpdGVTdHJlYW1cbiAgICogQG5hbWUgd3JpdGVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG51bSAtIENodW5rIHBvc2l0aW9uIGluIGEgc3RyZWFtXG4gICAqIEBwYXJhbSB7QnVmZmVyfSBjaHVuayAtIEJ1ZmZlciAoY2h1bmsgYmluYXJ5IGRhdGEpXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2tcbiAgICogQHN1bW1hcnkgV3JpdGUgY2h1bmsgaW4gZ2l2ZW4gb3JkZXJcbiAgICogQHJldHVybnMge0Jvb2xlYW59IC0gVHJ1ZSBpZiBjaHVuayBpcyBzZW50IHRvIHN0cmVhbSwgZmFsc2UgaWYgY2h1bmsgaXMgc2V0IGludG8gcXVldWVcbiAgICovXG4gIHdyaXRlKG51bSwgY2h1bmssIGNhbGxiYWNrKSB7XG4gICAgaWYgKCF0aGlzLmFib3J0ZWQgJiYgIXRoaXMuZW5kZWQpIHtcbiAgICAgIGlmICh0aGlzLmZkKSB7XG4gICAgICAgIGZzLndyaXRlKHRoaXMuZmQsIGNodW5rLCAwLCBjaHVuay5sZW5ndGgsIChudW0gLSAxKSAqIHRoaXMuZmlsZS5jaHVua1NpemUsIChlcnJvciwgd3JpdHRlbiwgYnVmZmVyKSA9PiB7XG4gICAgICAgICAgYm91bmQoKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2soZXJyb3IsIHdyaXR0ZW4sIGJ1ZmZlcik7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdbRmlsZXNDb2xsZWN0aW9uXSBbd3JpdGVTdHJlYW1dIFt3cml0ZV0gW0Vycm9yOl0nLCBlcnJvcik7XG4gICAgICAgICAgICAgIHRoaXMuYWJvcnQoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICsrdGhpcy53cml0dGVuQ2h1bmtzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIE1ldGVvci5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICB0aGlzLndyaXRlKG51bSwgY2h1bmssIGNhbGxiYWNrKTtcbiAgICAgICAgfSwgMjUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKlxuICAgKiBAbWVtYmVyT2Ygd3JpdGVTdHJlYW1cbiAgICogQG5hbWUgZW5kXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2tcbiAgICogQHN1bW1hcnkgRmluaXNoZXMgd3JpdGluZyB0byB3cml0YWJsZVN0cmVhbSwgb25seSBhZnRlciBhbGwgY2h1bmtzIGluIHF1ZXVlIGlzIHdyaXR0ZW5cbiAgICogQHJldHVybnMge0Jvb2xlYW59IC0gVHJ1ZSBpZiBzdHJlYW0gaXMgZnVsZmlsbGVkLCBmYWxzZSBpZiBxdWV1ZSBpcyBpbiBwcm9ncmVzc1xuICAgKi9cbiAgZW5kKGNhbGxiYWNrKSB7XG4gICAgaWYgKCF0aGlzLmFib3J0ZWQgJiYgIXRoaXMuZW5kZWQpIHtcbiAgICAgIGlmICh0aGlzLndyaXR0ZW5DaHVua3MgPT09IHRoaXMubWF4TGVuZ3RoKSB7XG4gICAgICAgIGZzLmNsb3NlKHRoaXMuZmQsICgpID0+IHtcbiAgICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICBkZWxldGUgZmRDYWNoZVt0aGlzLnBhdGhdO1xuICAgICAgICAgICAgdGhpcy5lbmRlZCA9IHRydWU7XG4gICAgICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayh2b2lkIDAsIHRydWUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIGZzLnN0YXQodGhpcy5wYXRoLCAoZXJyb3IsIHN0YXQpID0+IHtcbiAgICAgICAgYm91bmQoKCkgPT4ge1xuICAgICAgICAgIGlmICghZXJyb3IgJiYgc3RhdCkge1xuICAgICAgICAgICAgdGhpcy53cml0dGVuQ2h1bmtzID0gTWF0aC5jZWlsKHN0YXQuc2l6ZSAvIHRoaXMuZmlsZS5jaHVua1NpemUpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBNZXRlb3Iuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmVuZChjYWxsYmFjayk7XG4gICAgICAgICAgfSwgMjUpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayh2b2lkIDAsIHRoaXMuZW5kZWQpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKlxuICAgKiBAbWVtYmVyT2Ygd3JpdGVTdHJlYW1cbiAgICogQG5hbWUgYWJvcnRcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFja1xuICAgKiBAc3VtbWFyeSBBYm9ydHMgd3JpdGluZyB0byB3cml0YWJsZVN0cmVhbSwgcmVtb3ZlcyBjcmVhdGVkIGZpbGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59IC0gVHJ1ZVxuICAgKi9cbiAgYWJvcnQoY2FsbGJhY2spIHtcbiAgICB0aGlzLmFib3J0ZWQgPSB0cnVlO1xuICAgIGRlbGV0ZSBmZENhY2hlW3RoaXMucGF0aF07XG4gICAgZnMudW5saW5rKHRoaXMucGF0aCwgKGNhbGxiYWNrIHx8IE5PT1ApKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qXG4gICAqIEBtZW1iZXJPZiB3cml0ZVN0cmVhbVxuICAgKiBAbmFtZSBzdG9wXG4gICAqIEBzdW1tYXJ5IFN0b3Agd3JpdGluZyB0byB3cml0YWJsZVN0cmVhbVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gLSBUcnVlXG4gICAqL1xuICBzdG9wKCkge1xuICAgIHRoaXMuYWJvcnRlZCA9IHRydWU7XG4gICAgZGVsZXRlIGZkQ2FjaGVbdGhpcy5wYXRoXTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuIl19
