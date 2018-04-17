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
var debug, schema, public, strict, chunkSize, protected, collection, permissions, cacheControl, downloadRoute, onAfterUpload, onAfterRemove, disableUpload, onBeforeRemove, integrityCheck, collectionName, onBeforeUpload, namingFunction, responseHeaders, disableDownload, allowClientCode, downloadCallback, onInitiateUpload, interceptDownload, continueUploadTTL, parentDirPermissions, _preCollection, _preCollectionName, proceedAfterUpload, callback, opts, responseType, FilesCollection;

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
      throw new Meteor.Error(500, `[FilesCollection.${this.collectionName}]: "downloadRoute" must be precisely provided on "public" collections! Note: "downloadRoute" must be equal or be inside of your web/proxy-server (relative) root.`);
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
      throw new Meteor.Error(500, `[FilesCollection.${this.collectionName}] "storagePath" must be set on "public" collections! Note: "storagePath" must be equal on be inside of your web/proxy-server (absolute) root.`);
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
      if (!_.isString(this._preCollectionName) && !this._preCollection) {
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
              if (_.isObject(error) && _.isFunction(error.toString)) {
                error = error.toString();
              }

              if (!_.isString(error)) {
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

                if (!_.isObject(opts.file)) {
                  opts.file = {};
                }

                opts.___s = true;

                this._debug(`[FilesCollection] [File Start HTTP] ${opts.file.name || '[no-name]'} - ${opts.fileId}`);

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

    this.collection.insert(_.clone(result), (colInsert, _id) => {
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
        const userId = _.isObject(Meteor.server.sessions) && _.isObject(Meteor.server.sessions[mtok]) ? Meteor.server.sessions[mtok].userId : void 0;

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

    if (_.isString(fileName) && fileName.length > 0) {
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

    ds._storagePath = data._storagePath || this.storagePath(_.extend(data, ds));
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

    _.extend(this, _fileRef);
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
   * @summary Returns downloadable URL to File
   * @returns {String}
   */


  link(version = 'original') {
    this._collection._debug(`[FilesCollection] [FileCursor] [link(${version})]`);

    if (this._fileRef) {
      return this._collection.link(this._fileRef, version);
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

    return _.extend(this, this._collection.collection.findOne(this._fileRef._id));
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
 */
const fixJSONParse = function (obj) {
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
};
/*
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
};
/*
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

  const vRef = fileRef.versions && fileRef.versions[version] || fileRef || {};

  if (_.isString(vRef.extension)) {
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
exports.version = "5.0.0";
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
// node_modules/meteor/ostrio_files/node_modules/eventemitter3/package.json                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "eventemitter3";
exports.version = "3.0.1";
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
 * @private
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
 * @param {*} context The context to invoke the listener with.
 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
 * @constructor
 * @private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Add a listener for a given event.
 *
 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} context The context to invoke the listener with.
 * @param {Boolean} once Specify if the listener is a one-time listener.
 * @returns {EventEmitter}
 * @private
 */
function addListener(emitter, event, fn, context, once) {
  if (typeof fn !== 'function') {
    throw new TypeError('The listener must be a function');
  }

  var listener = new EE(fn, context || emitter, once)
    , evt = prefix ? prefix + event : event;

  if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
  else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
  else emitter._events[evt] = [emitter._events[evt], listener];

  return emitter;
}

/**
 * Clear event by name.
 *
 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
 * @param {(String|Symbol)} evt The Event name.
 * @private
 */
function clearEvent(emitter, evt) {
  if (--emitter._eventsCount === 0) emitter._events = new Events();
  else delete emitter._events[evt];
}

/**
 * Minimal `EventEmitter` interface that is molded against the Node.js
 * `EventEmitter` interface.
 *
 * @constructor
 * @public
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
 * @public
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
 * @param {(String|Symbol)} event The event name.
 * @returns {Array} The registered listeners.
 * @public
 */
EventEmitter.prototype.listeners = function listeners(event) {
  var evt = prefix ? prefix + event : event
    , handlers = this._events[evt];

  if (!handlers) return [];
  if (handlers.fn) return [handlers.fn];

  for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
    ee[i] = handlers[i].fn;
  }

  return ee;
};

/**
 * Return the number of listeners listening to a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Number} The number of listeners.
 * @public
 */
EventEmitter.prototype.listenerCount = function listenerCount(event) {
  var evt = prefix ? prefix + event : event
    , listeners = this._events[evt];

  if (!listeners) return 0;
  if (listeners.fn) return 1;
  return listeners.length;
};

/**
 * Calls each of the listeners registered for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Boolean} `true` if the event had listeners, else `false`.
 * @public
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
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  return addListener(this, event, fn, context, false);
};

/**
 * Add a one-time listener for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  return addListener(this, event, fn, context, true);
};

/**
 * Remove the listeners of a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn Only remove the listeners that match this function.
 * @param {*} context Only remove the listeners that have this context.
 * @param {Boolean} once Only remove one-time listeners.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return this;
  if (!fn) {
    clearEvent(this, evt);
    return this;
  }

  var listeners = this._events[evt];

  if (listeners.fn) {
    if (
      listeners.fn === fn &&
      (!once || listeners.once) &&
      (!context || listeners.context === context)
    ) {
      clearEvent(this, evt);
    }
  } else {
    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
      if (
        listeners[i].fn !== fn ||
        (once && !listeners[i].once) ||
        (context && listeners[i].context !== context)
      ) {
        events.push(listeners[i]);
      }
    }

    //
    // Reset the array, or remove it completely if we have no more listeners.
    //
    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
    else clearEvent(this, evt);
  }

  return this;
};

/**
 * Remove all listeners, or those of the specified event.
 *
 * @param {(String|Symbol)} [event] The event name.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  var evt;

  if (event) {
    evt = prefix ? prefix + event : event;
    if (this._events[evt]) clearEvent(this, evt);
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
// node_modules/meteor/ostrio_files/node_modules/request/package.json                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "request";
exports.version = "2.85.0";
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

}},"file-type":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/file-type/package.json                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "file-type";
exports.version = "7.6.0";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

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

	const check = (header, options) => {
		options = Object.assign({
			offset: 0
		}, options);

		for (let i = 0; i < header.length; i++) {
			// If a bitmask is set
			if (options.mask) {
				// If header doesn't equal `buf` with bits masked off
				if (header[i] !== (options.mask[i] & buf[i + options.offset])) {
					return false;
				}
			} else if (header[i] !== buf[i + options.offset]) {
				return false;
			}
		}

		return true;
	};

	const checkString = (header, options) => check(toBytes(header), options);

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

		if (checkString('mimetypeapplication/vnd.oasis.opendocument.text', {offset: 30})) {
			return {
				ext: 'odt',
				mime: 'application/vnd.oasis.opendocument.text'
			};
		}

		if (checkString('mimetypeapplication/vnd.oasis.opendocument.spreadsheet', {offset: 30})) {
			return {
				ext: 'ods',
				mime: 'application/vnd.oasis.opendocument.spreadsheet'
			};
		}

		if (checkString('mimetypeapplication/vnd.oasis.opendocument.presentation', {offset: 30})) {
			return {
				ext: 'odp',
				mime: 'application/vnd.oasis.opendocument.presentation'
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

					if (checkString('word/', {offset})) {
						return {
							ext: 'docx',
							mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
						};
					}

					if (checkString('ppt/', {offset})) {
						return {
							ext: 'pptx',
							mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
						};
					}

					if (checkString('xl/', {offset})) {
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

	if (
		check([0x0, 0x0, 0x1, 0xBA]) ||
		check([0x0, 0x0, 0x1, 0xB3])
	) {
		return {
			ext: 'mpg',
			mime: 'video/mpeg'
		};
	}

	if (check([0x66, 0x74, 0x79, 0x70, 0x33, 0x67], {offset: 4})) {
		return {
			ext: '3gp',
			mime: 'video/3gpp'
		};
	}

	// Check for MPEG header at different starting offsets
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

		if (
			check([0xFF, 0xE4], {offset: start, mask: [0xFF, 0xE4]}) // MPEG 1 or 2 Layer 2 header
		) {
			return {
				ext: 'mp2',
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

	if (checkString('<?xml ')) {
		return {
			ext: 'xml',
			mime: 'application/xml'
		};
	}

	if (check([0x42, 0x4F, 0x4F, 0x4B, 0x4D, 0x4F, 0x42, 0x49], {offset: 60})) {
		return {
			ext: 'mobi',
			mime: 'application/x-mobipocket-ebook'
		};
	}

	// File Type Box (https://en.wikipedia.org/wiki/ISO_base_media_file_format)
	if (check([0x66, 0x74, 0x79, 0x70], {offset: 4})) {
		if (check([0x6D, 0x69, 0x66, 0x31], {offset: 8})) {
			return {
				ext: 'heic',
				mime: 'image/heif'
			};
		}

		if (check([0x6D, 0x73, 0x66, 0x31], {offset: 8})) {
			return {
				ext: 'heic',
				mime: 'image/heif-sequence'
			};
		}

		if (check([0x68, 0x65, 0x69, 0x63], {offset: 8}) || check([0x68, 0x65, 0x69, 0x78], {offset: 8})) {
			return {
				ext: 'heic',
				mime: 'image/heic'
			};
		}

		if (check([0x68, 0x65, 0x76, 0x63], {offset: 8}) || check([0x68, 0x65, 0x76, 0x78], {offset: 8})) {
			return {
				ext: 'heic',
				mime: 'image/heic-sequence'
			};
		}
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
var exports = require("/node_modules/meteor/ostrio:files/server.js");

/* Exports */
Package._define("ostrio:files", exports, {
  FilesCollection: FilesCollection
});

})();

//# sourceURL=meteor://💻app/packages/ostrio_files.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZpbGVzL3NlcnZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZpbGVzL2NvcmUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL29zdHJpbzpmaWxlcy9jdXJzb3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL29zdHJpbzpmaWxlcy9saWIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL29zdHJpbzpmaWxlcy93cml0ZS1zdHJlYW0uanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiRmlsZXNDb2xsZWN0aW9uIiwiXyIsIndhdGNoIiwicmVxdWlyZSIsInYiLCJNb25nbyIsIldlYkFwcCIsIk1ldGVvciIsIlJhbmRvbSIsIkNvb2tpZXMiLCJXcml0ZVN0cmVhbSIsImRlZmF1bHQiLCJjaGVjayIsIk1hdGNoIiwiRmlsZXNDb2xsZWN0aW9uQ29yZSIsImZpeEpTT05QYXJzZSIsImZpeEpTT05TdHJpbmdpZnkiLCJmcyIsIm5vZGVRcyIsInJlcXVlc3QiLCJmaWxlVHlwZSIsIm5vZGVQYXRoIiwiYm91bmQiLCJiaW5kRW52aXJvbm1lbnQiLCJjYWxsYmFjayIsIk5PT1AiLCJjb25zdHJ1Y3RvciIsImNvbmZpZyIsInN0b3JhZ2VQYXRoIiwiZGVidWciLCJzY2hlbWEiLCJwdWJsaWMiLCJzdHJpY3QiLCJjaHVua1NpemUiLCJwcm90ZWN0ZWQiLCJjb2xsZWN0aW9uIiwicGVybWlzc2lvbnMiLCJjYWNoZUNvbnRyb2wiLCJkb3dubG9hZFJvdXRlIiwib25BZnRlclVwbG9hZCIsIm9uQWZ0ZXJSZW1vdmUiLCJkaXNhYmxlVXBsb2FkIiwib25CZWZvcmVSZW1vdmUiLCJpbnRlZ3JpdHlDaGVjayIsImNvbGxlY3Rpb25OYW1lIiwib25CZWZvcmVVcGxvYWQiLCJuYW1pbmdGdW5jdGlvbiIsInJlc3BvbnNlSGVhZGVycyIsImRpc2FibGVEb3dubG9hZCIsImFsbG93Q2xpZW50Q29kZSIsImRvd25sb2FkQ2FsbGJhY2siLCJvbkluaXRpYXRlVXBsb2FkIiwiaW50ZXJjZXB0RG93bmxvYWQiLCJjb250aW51ZVVwbG9hZFRUTCIsInBhcmVudERpclBlcm1pc3Npb25zIiwiX3ByZUNvbGxlY3Rpb24iLCJfcHJlQ29sbGVjdGlvbk5hbWUiLCJzZWxmIiwiY29va2llIiwiaXNCb29sZWFuIiwiTWF0aCIsImZsb29yIiwiaXNTdHJpbmciLCJDb2xsZWN0aW9uIiwiX25hbWUiLCJmaWxlc0NvbGxlY3Rpb24iLCJTdHJpbmciLCJFcnJvciIsInJlcGxhY2UiLCJpc0Z1bmN0aW9uIiwiaXNOdW1iZXIiLCJwYXJzZUludCIsImlzT2JqZWN0IiwiX2N1cnJlbnRVcGxvYWRzIiwicmVzcG9uc2VDb2RlIiwiZmlsZVJlZiIsInZlcnNpb25SZWYiLCJoZWFkZXJzIiwiUHJhZ21hIiwiVHJhaWxlciIsInNpemUiLCJDb25uZWN0aW9uIiwidHlwZSIsInNlcCIsInNwIiwiYXBwbHkiLCJhcmd1bWVudHMiLCJub3JtYWxpemUiLCJfZGVidWciLCJta2RpcnMiLCJtb2RlIiwiZXJyb3IiLCJCb29sZWFuIiwiTnVtYmVyIiwiRnVuY3Rpb24iLCJPbmVPZiIsIk9iamVjdCIsIl9lbnN1cmVJbmRleCIsImNyZWF0ZWRBdCIsImV4cGlyZUFmdGVyU2Vjb25kcyIsImJhY2tncm91bmQiLCJfcHJlQ29sbGVjdGlvbkN1cnNvciIsImZpbmQiLCJmaWVsZHMiLCJfaWQiLCJpc0ZpbmlzaGVkIiwib2JzZXJ2ZSIsImNoYW5nZWQiLCJkb2MiLCJyZW1vdmUiLCJyZW1vdmVkIiwic3RvcCIsImVuZCIsImFib3J0IiwiX2NyZWF0ZVN0cmVhbSIsInBhdGgiLCJvcHRzIiwiZmlsZUxlbmd0aCIsIl9jb250aW51ZVVwbG9hZCIsImZpbGUiLCJhYm9ydGVkIiwiZW5kZWQiLCJjb250VXBsZCIsImZpbmRPbmUiLCJfY2hlY2tBY2Nlc3MiLCJodHRwIiwicmVzdWx0IiwidXNlciIsInVzZXJJZCIsIl9nZXRVc2VyIiwicGFyYW1zIiwiY2FsbCIsImV4dGVuZCIsInJjIiwidGV4dCIsInJlc3BvbnNlIiwiaGVhZGVyc1NlbnQiLCJ3cml0ZUhlYWQiLCJsZW5ndGgiLCJmaW5pc2hlZCIsIl9tZXRob2ROYW1lcyIsIl9BYm9ydCIsIl9Xcml0ZSIsIl9TdGFydCIsIl9SZW1vdmUiLCJvbiIsIl9oYW5kbGVVcGxvYWQiLCJfZmluaXNoVXBsb2FkIiwiY29ubmVjdEhhbmRsZXJzIiwidXNlIiwiaHR0cFJlcSIsImh0dHBSZXNwIiwibmV4dCIsIl9wYXJzZWRVcmwiLCJpbmRleE9mIiwibWV0aG9kIiwiaGFuZGxlRXJyb3IiLCJfZXJyb3IiLCJjb25zb2xlIiwid2FybiIsInRyYWNlIiwidG9TdHJpbmciLCJKU09OIiwic3RyaW5naWZ5IiwiYm9keSIsImRhdGEiLCJzZXJ2ZXIiLCJzZXNzaW9ucyIsImhhcyIsImZpbGVJZCIsImVvZiIsIkJ1ZmZlciIsImZyb20iLCJiaW5EYXRhIiwiYnVmZkVyciIsImNodW5rSWQiLCJfcHJlcGFyZVVwbG9hZCIsIm1ldGEiLCJlbWl0IiwicGFyc2UiLCJqc29uRXJyIiwiX19fcyIsIm5hbWUiLCJjbG9uZSIsIkRhdGUiLCJtYXhMZW5ndGgiLCJpbnNlcnQiLCJvbWl0IiwicmV0dXJuTWV0YSIsInVwbG9hZFJvdXRlIiwiaHR0cFJlc3BFcnIiLCJ1cmkiLCJ1cmlzIiwic3Vic3RyaW5nIiwic3BsaXQiLCJxdWVyeSIsInZlcnNpb24iLCJkb3dubG9hZCIsIl9maWxlIiwiX21ldGhvZHMiLCJzZWxlY3RvciIsInVzZXJGdW5jcyIsInVzZXJzIiwiY3Vyc29yIiwiY291bnQiLCJGU05hbWUiLCJPcHRpb25hbCIsInVuYmxvY2siLCJ3cmFwQXN5bmMiLCJiaW5kIiwiaGFuZGxlVXBsb2FkRXJyIiwidW5saW5rIiwibWV0aG9kcyIsInRyYW5zcG9ydCIsImN0eCIsImZpbGVOYW1lIiwiX2dldEZpbGVOYW1lIiwiZXh0ZW5zaW9uIiwiZXh0ZW5zaW9uV2l0aERvdCIsIl9nZXRFeHQiLCJleHQiLCJfZGF0YVRvU2NoZW1hIiwiaXNVcGxvYWRBbGxvd2VkIiwiY2IiLCJjaG1vZCIsIl9nZXRNaW1lVHlwZSIsIl91cGRhdGVGaWxlVHlwZXMiLCJjb2xJbnNlcnQiLCJ1cGRhdGUiLCIkc2V0IiwicHJlVXBkYXRlRXJyb3IiLCJ3cml0ZSIsImUiLCJmaWxlRGF0YSIsIm1pbWUiLCJidWYiLCJmZCIsIm9wZW5TeW5jIiwiYnIiLCJyZWFkU3luYyIsImNsb3NlIiwic2xpY2UiLCJtdG9rIiwiZ2V0IiwiYnVmZmVyIiwicHJvY2VlZEFmdGVyVXBsb2FkIiwiaWQiLCJzdHJlYW0iLCJjcmVhdGVXcml0ZVN0cmVhbSIsImZsYWdzIiwic3RyZWFtRXJyIiwiaW5zZXJ0RXJyIiwibG9hZCIsInVybCIsInBhdGhQYXJ0cyIsInN0b3JlUmVzdWx0Iiwic3RhdCIsInN0YXRzIiwidmVyc2lvbnMiLCJvcmlnaW5hbCIsInBpcGUiLCJhZGRGaWxlIiwic3RhdEVyciIsImlzRmlsZSIsIl9zdG9yYWdlUGF0aCIsInVuZGVmaW5lZCIsImZpbGVzIiwiZm9yRWFjaCIsImRvY3MiLCJmZXRjaCIsImRlbnkiLCJydWxlcyIsImFsbG93IiwiZGVueUNsaWVudCIsImFsbG93Q2xpZW50IiwiZWFjaCIsInZSZWYiLCJfNDA0Iiwib3JpZ2luYWxVcmwiLCJyZXNwb25zZVR5cGUiLCJzZXJ2ZSIsInJlYWRhYmxlU3RyZWFtIiwiZm9yY2UyMDAiLCJwYXJ0aXJhbCIsInJlcVJhbmdlIiwiZGlzcG9zaXRpb25UeXBlIiwic3RhcnQiLCJ0YWtlIiwiZGlzcG9zaXRpb25OYW1lIiwiZW5jb2RlVVJJIiwiZW5jb2RlVVJJQ29tcG9uZW50IiwiZGlzcG9zaXRpb25FbmNvZGluZyIsInNldEhlYWRlciIsInJhbmdlIiwiYXJyYXkiLCJpc05hTiIsInBsYXkiLCJzdHJlYW1FcnJvckhhbmRsZXIiLCJrZXkiLCJyZXNwb25kIiwiY29kZSIsImRlc3Ryb3kiLCJjcmVhdGVSZWFkU3RyZWFtIiwiRXZlbnRFbWl0dGVyIiwiZm9ybWF0RmxlVVJMIiwiRmlsZXNDdXJzb3IiLCJGaWxlQ3Vyc29yIiwiaW5mbyIsImxvZyIsInBvcCIsInRvTG93ZXJDYXNlIiwiaXNWaWRlbyIsInRlc3QiLCJpc0F1ZGlvIiwiaXNJbWFnZSIsImlzVGV4dCIsImlzSlNPTiIsImlzUERGIiwiZHMiLCJfZG93bmxvYWRSb3V0ZSIsIl9jb2xsZWN0aW9uTmFtZSIsIm9wdGlvbnMiLCJsaW5rIiwib3B0aW9uYWwiLCJibGFja2JveCIsInVwZGF0ZWRBdCIsIl9maWxlUmVmIiwiX2NvbGxlY3Rpb24iLCJwcm9wZXJ0eSIsIndpdGgiLCJfc2VsZWN0b3IiLCJfY3VycmVudCIsImhhc05leHQiLCJoYXNQcmV2aW91cyIsInByZXZpb3VzIiwiZmlyc3QiLCJsYXN0IiwiY29udGV4dCIsIm1hcCIsImN1cnJlbnQiLCJjYWxsYmFja3MiLCJvYnNlcnZlQ2hhbmdlcyIsIm9iaiIsImlzQXJyYXkiLCJpIiwiaXNEYXRlIiwiX3Jvb3QiLCJfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIiwiUk9PVF9VUkwiLCJmZENhY2hlIiwid3JpdHRlbkNodW5rcyIsImVuc3VyZUZpbGUiLCJlZkVycm9yIiwib3BlbiIsIm9FcnJvciIsIm51bSIsImNodW5rIiwid3JpdHRlbiIsInNldFRpbWVvdXQiLCJjZWlsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE9BQU9DLE1BQVAsQ0FBYztBQUFDQyxtQkFBZ0IsTUFBSUE7QUFBckIsQ0FBZDs7QUFBcUQsSUFBSUMsQ0FBSjs7QUFBTUgsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLG1CQUFSLENBQWIsRUFBMEM7QUFBQ0YsSUFBRUcsQ0FBRixFQUFJO0FBQUNILFFBQUVHLENBQUY7QUFBSTs7QUFBVixDQUExQyxFQUFzRCxDQUF0RDtBQUF5RCxJQUFJQyxLQUFKO0FBQVVQLE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSxjQUFSLENBQWIsRUFBcUM7QUFBQ0UsUUFBTUQsQ0FBTixFQUFRO0FBQUND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O0FBQ0Q7QUFFRDs7Ozs7Ozs7QUFNQXNGLFNBQU87QUFDTCxTQUFLUyxPQUFMLEdBQWUsSUFBZjtBQUNBLFdBQU9xTyxRQUFRLEtBQUsxTyxJQUFiLENBQVA7QUFDQSxXQUFPLElBQVA7QUFDRDs7QUF2SThCLEMiLCJmaWxlIjoiL3BhY2thZ2VzL29zdHJpb19maWxlcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IF8gfSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyb20gJ21ldGVvci91bmRlcnNjb3JlJztcbmltcG9ydCB7IE1vbmdvIH0gICAgICAgICAgICAgICAgICAgICAgICAgIGZyb20gJ21ldGVvci9tb25nbyc7XG5pbXBvcnQgeyBXZWJBcHAgfSAgICAgICAgICAgICAgICAgICAgICAgICBmcm9tICdtZXRlb3Ivd2ViYXBwJztcbmltcG9ydCB7IE1ldGVvciB9ICAgICAgICAgICAgICAgICAgICAgICAgIGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgUmFuZG9tIH0gICAgICAgICAgICAgICAgICAgICAgICAgZnJvbSAnbWV0ZW9yL3JhbmRvbSc7XG5pbXBvcnQgeyBDb29raWVzIH0gICAgICAgICAgICAgICAgICAgICAgICBmcm9tICdtZXRlb3Ivb3N0cmlvOmNvb2tpZXMnO1xuaW1wb3J0IFdyaXRlU3RyZWFtICAgICAgICAgICAgICAgICAgICAgICAgZnJvbSAnLi93cml0ZS1zdHJlYW0uanMnO1xuaW1wb3J0IHsgY2hlY2ssIE1hdGNoIH0gICAgICAgICAgICAgICAgICAgZnJvbSAnbWV0ZW9yL2NoZWNrJztcbmltcG9ydCBGaWxlc0NvbGxlY3Rpb25Db3JlICAgICAgICAgICAgICAgIGZyb20gJy4vY29yZS5qcyc7XG5pbXBvcnQgeyBmaXhKU09OUGFyc2UsIGZpeEpTT05TdHJpbmdpZnkgfSBmcm9tICcuL2xpYi5qcyc7XG5cbmltcG9ydCBmcyAgICAgICBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgbm9kZVFzICAgZnJvbSAncXVlcnlzdHJpbmcnO1xuaW1wb3J0IHJlcXVlc3QgIGZyb20gJ3JlcXVlc3QnO1xuaW1wb3J0IGZpbGVUeXBlIGZyb20gJ2ZpbGUtdHlwZSc7XG5pbXBvcnQgbm9kZVBhdGggZnJvbSAncGF0aCc7XG5cbi8qXG4gKiBAY29uc3Qge09iamVjdH0gYm91bmQgIC0gTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCAoRmliZXIgd3JhcHBlcilcbiAqIEBjb25zdCB7RnVuY3Rpb259IE5PT1AgLSBObyBPcGVyYXRpb24gZnVuY3Rpb24sIHBsYWNlaG9sZGVyIGZvciByZXF1aXJlZCBjYWxsYmFja3NcbiAqL1xuY29uc3QgYm91bmQgPSBNZXRlb3IuYmluZEVudmlyb25tZW50KGNhbGxiYWNrID0+IGNhbGxiYWNrKCkpO1xuY29uc3QgTk9PUCAgPSAoKSA9PiB7ICB9O1xuXG4vKlxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAY2xhc3MgRmlsZXNDb2xsZWN0aW9uXG4gKiBAcGFyYW0gY29uZmlnICAgICAgICAgICB7T2JqZWN0fSAgIC0gW0JvdGhdICAgQ29uZmlndXJhdGlvbiBvYmplY3Qgd2l0aCBuZXh0IHByb3BlcnRpZXM6XG4gKiBAcGFyYW0gY29uZmlnLmRlYnVnICAgICB7Qm9vbGVhbn0gIC0gW0JvdGhdICAgVHVybiBvbi9vZiBkZWJ1Z2dpbmcgYW5kIGV4dHJhIGxvZ2dpbmdcbiAqIEBwYXJhbSBjb25maWcuc2NoZW1hICAgIHtPYmplY3R9ICAgLSBbQm90aF0gICBDb2xsZWN0aW9uIFNjaGVtYVxuICogQHBhcmFtIGNvbmZpZy5wdWJsaWMgICAge0Jvb2xlYW59ICAtIFtCb3RoXSAgIFN0b3JlIGZpbGVzIGluIGZvbGRlciBhY2Nlc3NpYmxlIGZvciBwcm94eSBzZXJ2ZXJzLCBmb3IgbGltaXRzLCBhbmQgbW9yZSAtIHJlYWQgZG9jc1xuICogQHBhcmFtIGNvbmZpZy5zdHJpY3QgICAge0Jvb2xlYW59ICAtIFtTZXJ2ZXJdIFN0cmljdCBtb2RlIGZvciBwYXJ0aWFsIGNvbnRlbnQsIGlmIGlzIGB0cnVlYCBzZXJ2ZXIgd2lsbCByZXR1cm4gYDQxNmAgcmVzcG9uc2UgY29kZSwgd2hlbiBgcmFuZ2VgIGlzIG5vdCBzcGVjaWZpZWQsIG90aGVyd2lzZSBzZXJ2ZXIgcmV0dXJuIGAyMDZgXG4gKiBAcGFyYW0gY29uZmlnLnByb3RlY3RlZCB7RnVuY3Rpb259IC0gW1NlcnZlcl0gSWYgYHRydWVgIC0gZmlsZXMgd2lsbCBiZSBzZXJ2ZWQgb25seSB0byBhdXRob3JpemVkIHVzZXJzLCBpZiBgZnVuY3Rpb24oKWAgLSB5b3UncmUgYWJsZSB0byBjaGVjayB2aXNpdG9yJ3MgcGVybWlzc2lvbnMgaW4geW91ciBvd24gd2F5IGZ1bmN0aW9uJ3MgY29udGV4dCBoYXM6XG4gKiAgLSBgcmVxdWVzdGBcbiAqICAtIGByZXNwb25zZWBcbiAqICAtIGB1c2VyKClgXG4gKiAgLSBgdXNlcklkYFxuICogQHBhcmFtIGNvbmZpZy5jaHVua1NpemUgICAgICB7TnVtYmVyfSAgLSBbQm90aF0gVXBsb2FkIGNodW5rIHNpemUsIGRlZmF1bHQ6IDUyNDI4OCBieXRlcyAoMCw1IE1iKVxuICogQHBhcmFtIGNvbmZpZy5wZXJtaXNzaW9ucyAgICB7TnVtYmVyfSAgLSBbU2VydmVyXSBQZXJtaXNzaW9ucyB3aGljaCB3aWxsIGJlIHNldCB0byB1cGxvYWRlZCBmaWxlcyAob2N0YWwpLCBsaWtlOiBgNTExYCBvciBgMG83NTVgLiBEZWZhdWx0OiAwNjQ0XG4gKiBAcGFyYW0gY29uZmlnLnBhcmVudERpclBlcm1pc3Npb25zIHtOdW1iZXJ9ICAtIFtTZXJ2ZXJdIFBlcm1pc3Npb25zIHdoaWNoIHdpbGwgYmUgc2V0IHRvIHBhcmVudCBkaXJlY3Rvcnkgb2YgdXBsb2FkZWQgZmlsZXMgKG9jdGFsKSwgbGlrZTogYDYxMWAgb3IgYDBvNzc3YC4gRGVmYXVsdDogMDc1NVxuICogQHBhcmFtIGNvbmZpZy5zdG9yYWdlUGF0aCAgICB7U3RyaW5nfEZ1bmN0aW9ufSAgLSBbU2VydmVyXSBTdG9yYWdlIHBhdGggb24gZmlsZSBzeXN0ZW1cbiAqIEBwYXJhbSBjb25maWcuY2FjaGVDb250cm9sICAge1N0cmluZ30gIC0gW1NlcnZlcl0gRGVmYXVsdCBgQ2FjaGUtQ29udHJvbGAgaGVhZGVyXG4gKiBAcGFyYW0gY29uZmlnLnJlc3BvbnNlSGVhZGVycyB7T2JqZWN0fEZ1bmN0aW9ufSAtIFtTZXJ2ZXJdIEN1c3RvbSByZXNwb25zZSBoZWFkZXJzLCBpZiBmdW5jdGlvbiBpcyBwYXNzZWQsIG11c3QgcmV0dXJuIE9iamVjdFxuICogQHBhcmFtIGNvbmZpZy50aHJvdHRsZSAgICAgICB7TnVtYmVyfSAgLSBbU2VydmVyXSBERVBSRUNBVEVEIGJwcyB0aHJvdHRsZSB0aHJlc2hvbGRcbiAqIEBwYXJhbSBjb25maWcuZG93bmxvYWRSb3V0ZSAge1N0cmluZ30gIC0gW0JvdGhdICAgU2VydmVyIFJvdXRlIHVzZWQgdG8gcmV0cmlldmUgZmlsZXNcbiAqIEBwYXJhbSBjb25maWcuY29sbGVjdGlvbiAgICAge01vbmdvLkNvbGxlY3Rpb259IC0gW0JvdGhdIE1vbmdvIENvbGxlY3Rpb24gSW5zdGFuY2VcbiAqIEBwYXJhbSBjb25maWcuY29sbGVjdGlvbk5hbWUge1N0cmluZ30gIC0gW0JvdGhdICAgQ29sbGVjdGlvbiBuYW1lXG4gKiBAcGFyYW0gY29uZmlnLm5hbWluZ0Z1bmN0aW9uIHtGdW5jdGlvbn0tIFtCb3RoXSAgIEZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYFN0cmluZ2BcbiAqIEBwYXJhbSBjb25maWcuaW50ZWdyaXR5Q2hlY2sge0Jvb2xlYW59IC0gW1NlcnZlcl0gQ2hlY2sgZmlsZSdzIGludGVncml0eSBiZWZvcmUgc2VydmluZyB0byB1c2Vyc1xuICogQHBhcmFtIGNvbmZpZy5vbkFmdGVyVXBsb2FkICB7RnVuY3Rpb259LSBbU2VydmVyXSBDYWxsZWQgcmlnaHQgYWZ0ZXIgZmlsZSBpcyByZWFkeSBvbiBGUy4gVXNlIHRvIHRyYW5zZmVyIGZpbGUgc29tZXdoZXJlIGVsc2UsIG9yIGRvIG90aGVyIHRoaW5nIHdpdGggZmlsZSBkaXJlY3RseVxuICogQHBhcmFtIGNvbmZpZy5vbkFmdGVyUmVtb3ZlICB7RnVuY3Rpb259IC0gW1NlcnZlcl0gQ2FsbGVkIHJpZ2h0IGFmdGVyIGZpbGUgaXMgcmVtb3ZlZC4gUmVtb3ZlZCBvYmplY3RzIGlzIHBhc3NlZCB0byBjYWxsYmFja1xuICogQHBhcmFtIGNvbmZpZy5jb250aW51ZVVwbG9hZFRUTCB7TnVtYmVyfSAtIFtTZXJ2ZXJdIFRpbWUgaW4gc2Vjb25kcywgZHVyaW5nIHVwbG9hZCBtYXkgYmUgY29udGludWVkLCBkZWZhdWx0IDMgaG91cnMgKDEwODAwIHNlY29uZHMpXG4gKiBAcGFyYW0gY29uZmlnLm9uQmVmb3JlVXBsb2FkIHtGdW5jdGlvbn0tIFtCb3RoXSAgIEZ1bmN0aW9uIHdoaWNoIGV4ZWN1dGVzIG9uIHNlcnZlciBhZnRlciByZWNlaXZpbmcgZWFjaCBjaHVuayBhbmQgb24gY2xpZW50IHJpZ2h0IGJlZm9yZSBiZWdpbm5pbmcgdXBsb2FkLiBGdW5jdGlvbiBjb250ZXh0IGlzIGBGaWxlYCAtIHNvIHlvdSBhcmUgYWJsZSB0byBjaGVjayBmb3IgZXh0ZW5zaW9uLCBtaW1lLXR5cGUsIHNpemUgYW5kIGV0Yy46XG4gKiAgLSByZXR1cm4gYHRydWVgIHRvIGNvbnRpbnVlXG4gKiAgLSByZXR1cm4gYGZhbHNlYCBvciBgU3RyaW5nYCB0byBhYm9ydCB1cGxvYWRcbiAqIEBwYXJhbSBjb25maWcub25Jbml0aWF0ZVVwbG9hZCB7RnVuY3Rpb259IC0gW1NlcnZlcl0gRnVuY3Rpb24gd2hpY2ggZXhlY3V0ZXMgb24gc2VydmVyIHJpZ2h0IGJlZm9yZSB1cGxvYWQgaXMgYmVnaW4gYW5kIHJpZ2h0IGFmdGVyIGBvbkJlZm9yZVVwbG9hZGAgaG9vay4gVGhpcyBob29rIGlzIGZ1bGx5IGFzeW5jaHJvbm91cy5cbiAqIEBwYXJhbSBjb25maWcub25CZWZvcmVSZW1vdmUge0Z1bmN0aW9ufSAtIFtTZXJ2ZXJdIEV4ZWN1dGVzIGJlZm9yZSByZW1vdmluZyBmaWxlIG9uIHNlcnZlciwgc28geW91IGNhbiBjaGVjayBwZXJtaXNzaW9ucy4gUmV0dXJuIGB0cnVlYCB0byBhbGxvdyBhY3Rpb24gYW5kIGBmYWxzZWAgdG8gZGVueS5cbiAqIEBwYXJhbSBjb25maWcuYWxsb3dDbGllbnRDb2RlICB7Qm9vbGVhbn0gIC0gW0JvdGhdICAgQWxsb3cgdG8gcnVuIGByZW1vdmVgIGZyb20gY2xpZW50XG4gKiBAcGFyYW0gY29uZmlnLmRvd25sb2FkQ2FsbGJhY2sge0Z1bmN0aW9ufSAtIFtTZXJ2ZXJdIENhbGxiYWNrIHRyaWdnZXJlZCBlYWNoIHRpbWUgZmlsZSBpcyByZXF1ZXN0ZWQsIHJldHVybiB0cnV0aHkgdmFsdWUgdG8gY29udGludWUgZG93bmxvYWQsIG9yIGZhbHN5IHRvIGFib3J0XG4gKiBAcGFyYW0gY29uZmlnLmludGVyY2VwdERvd25sb2FkIHtGdW5jdGlvbn0gLSBbU2VydmVyXSBJbnRlcmNlcHQgZG93bmxvYWQgcmVxdWVzdCwgc28geW91IGNhbiBzZXJ2ZSBmaWxlIGZyb20gdGhpcmQtcGFydHkgcmVzb3VyY2UsIGFyZ3VtZW50cyB7aHR0cDoge3JlcXVlc3Q6IHsuLi59LCByZXNwb25zZTogey4uLn19LCBmaWxlUmVmOiB7Li4ufX1cbiAqIEBwYXJhbSBjb25maWcuZGlzYWJsZVVwbG9hZCB7Qm9vbGVhbn0gLSBEaXNhYmxlIGZpbGUgdXBsb2FkLCB1c2VmdWwgZm9yIHNlcnZlciBvbmx5IHNvbHV0aW9uc1xuICogQHBhcmFtIGNvbmZpZy5kaXNhYmxlRG93bmxvYWQge0Jvb2xlYW59IC0gRGlzYWJsZSBmaWxlIGRvd25sb2FkIChzZXJ2aW5nKSwgdXNlZnVsIGZvciBmaWxlIG1hbmFnZW1lbnQgb25seSBzb2x1dGlvbnNcbiAqIEBwYXJhbSBjb25maWcuX3ByZUNvbGxlY3Rpb24gIHtNb25nby5Db2xsZWN0aW9ufSAtIFtTZXJ2ZXJdIE1vbmdvIHByZUNvbGxlY3Rpb24gSW5zdGFuY2VcbiAqIEBwYXJhbSBjb25maWcuX3ByZUNvbGxlY3Rpb25OYW1lIHtTdHJpbmd9ICAtIFtTZXJ2ZXJdICBwcmVDb2xsZWN0aW9uIG5hbWVcbiAqIEBzdW1tYXJ5IENyZWF0ZSBuZXcgaW5zdGFuY2Ugb2YgRmlsZXNDb2xsZWN0aW9uXG4gKi9cbmV4cG9ydCBjbGFzcyBGaWxlc0NvbGxlY3Rpb24gZXh0ZW5kcyBGaWxlc0NvbGxlY3Rpb25Db3JlIHtcbiAgY29uc3RydWN0b3IoY29uZmlnKSB7XG4gICAgc3VwZXIoKTtcbiAgICBsZXQgc3RvcmFnZVBhdGg7XG4gICAgaWYgKGNvbmZpZykge1xuICAgICAgKHtcbiAgICAgICAgc3RvcmFnZVBhdGgsXG4gICAgICAgIGRlYnVnOiB0aGlzLmRlYnVnLFxuICAgICAgICBzY2hlbWE6IHRoaXMuc2NoZW1hLFxuICAgICAgICBwdWJsaWM6IHRoaXMucHVibGljLFxuICAgICAgICBzdHJpY3Q6IHRoaXMuc3RyaWN0LFxuICAgICAgICBjaHVua1NpemU6IHRoaXMuY2h1bmtTaXplLFxuICAgICAgICBwcm90ZWN0ZWQ6IHRoaXMucHJvdGVjdGVkLFxuICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb24sXG4gICAgICAgIHBlcm1pc3Npb25zOiB0aGlzLnBlcm1pc3Npb25zLFxuICAgICAgICBjYWNoZUNvbnRyb2w6IHRoaXMuY2FjaGVDb250cm9sLFxuICAgICAgICBkb3dubG9hZFJvdXRlOiB0aGlzLmRvd25sb2FkUm91dGUsXG4gICAgICAgIG9uQWZ0ZXJVcGxvYWQ6IHRoaXMub25BZnRlclVwbG9hZCxcbiAgICAgICAgb25BZnRlclJlbW92ZTogdGhpcy5vbkFmdGVyUmVtb3ZlLFxuICAgICAgICBkaXNhYmxlVXBsb2FkOiB0aGlzLmRpc2FibGVVcGxvYWQsXG4gICAgICAgIG9uQmVmb3JlUmVtb3ZlOiB0aGlzLm9uQmVmb3JlUmVtb3ZlLFxuICAgICAgICBpbnRlZ3JpdHlDaGVjazogdGhpcy5pbnRlZ3JpdHlDaGVjayxcbiAgICAgICAgY29sbGVjdGlvbk5hbWU6IHRoaXMuY29sbGVjdGlvbk5hbWUsXG4gICAgICAgIG9uQmVmb3JlVXBsb2FkOiB0aGlzLm9uQmVmb3JlVXBsb2FkLFxuICAgICAgICBuYW1pbmdGdW5jdGlvbjogdGhpcy5uYW1pbmdGdW5jdGlvbixcbiAgICAgICAgcmVzcG9uc2VIZWFkZXJzOiB0aGlzLnJlc3BvbnNlSGVhZGVycyxcbiAgICAgICAgZGlzYWJsZURvd25sb2FkOiB0aGlzLmRpc2FibGVEb3dubG9hZCxcbiAgICAgICAgYWxsb3dDbGllbnRDb2RlOiB0aGlzLmFsbG93Q2xpZW50Q29kZSxcbiAgICAgICAgZG93bmxvYWRDYWxsYmFjazogdGhpcy5kb3dubG9hZENhbGxiYWNrLFxuICAgICAgICBvbkluaXRpYXRlVXBsb2FkOiB0aGlzLm9uSW5pdGlhdGVVcGxvYWQsXG4gICAgICAgIGludGVyY2VwdERvd25sb2FkOiB0aGlzLmludGVyY2VwdERvd25sb2FkLFxuICAgICAgICBjb250aW51ZVVwbG9hZFRUTDogdGhpcy5jb250aW51ZVVwbG9hZFRUTCxcbiAgICAgICAgcGFyZW50RGlyUGVybWlzc2lvbnM6IHRoaXMucGFyZW50RGlyUGVybWlzc2lvbnMsXG4gICAgICAgIF9wcmVDb2xsZWN0aW9uOiB0aGlzLl9wcmVDb2xsZWN0aW9uLFxuICAgICAgICBfcHJlQ29sbGVjdGlvbk5hbWU6IHRoaXMuX3ByZUNvbGxlY3Rpb25OYW1lLFxuICAgICAgfSA9IGNvbmZpZyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VsZiAgID0gdGhpcztcbiAgICBjb25zdCBjb29raWUgPSBuZXcgQ29va2llcygpO1xuXG4gICAgaWYgKCFfLmlzQm9vbGVhbih0aGlzLmRlYnVnKSkge1xuICAgICAgdGhpcy5kZWJ1ZyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghXy5pc0Jvb2xlYW4odGhpcy5wdWJsaWMpKSB7XG4gICAgICB0aGlzLnB1YmxpYyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5wcm90ZWN0ZWQpIHtcbiAgICAgIHRoaXMucHJvdGVjdGVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmNodW5rU2l6ZSkge1xuICAgICAgdGhpcy5jaHVua1NpemUgPSAxMDI0ICogNTEyO1xuICAgIH1cblxuICAgIHRoaXMuY2h1bmtTaXplID0gTWF0aC5mbG9vcih0aGlzLmNodW5rU2l6ZSAvIDgpICogODtcblxuICAgIGlmICghXy5pc1N0cmluZyh0aGlzLmNvbGxlY3Rpb25OYW1lKSAmJiAhdGhpcy5jb2xsZWN0aW9uKSB7XG4gICAgICB0aGlzLmNvbGxlY3Rpb25OYW1lID0gJ01ldGVvclVwbG9hZEZpbGVzJztcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuY29sbGVjdGlvbikge1xuICAgICAgdGhpcy5jb2xsZWN0aW9uID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24odGhpcy5jb2xsZWN0aW9uTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29sbGVjdGlvbk5hbWUgPSB0aGlzLmNvbGxlY3Rpb24uX25hbWU7XG4gICAgfVxuXG4gICAgdGhpcy5jb2xsZWN0aW9uLmZpbGVzQ29sbGVjdGlvbiA9IHRoaXM7XG4gICAgY2hlY2sodGhpcy5jb2xsZWN0aW9uTmFtZSwgU3RyaW5nKTtcblxuICAgIGlmICh0aGlzLnB1YmxpYyAmJiAhdGhpcy5kb3dubG9hZFJvdXRlKSB7XG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDUwMCwgYFtGaWxlc0NvbGxlY3Rpb24uJHt0aGlzLmNvbGxlY3Rpb25OYW1lfV06IFwiZG93bmxvYWRSb3V0ZVwiIG11c3QgYmUgcHJlY2lzZWx5IHByb3ZpZGVkIG9uIFwicHVibGljXCIgY29sbGVjdGlvbnMhIE5vdGU6IFwiZG93bmxvYWRSb3V0ZVwiIG11c3QgYmUgZXF1YWwgb3IgYmUgaW5zaWRlIG9mIHlvdXIgd2ViL3Byb3h5LXNlcnZlciAocmVsYXRpdmUpIHJvb3QuYCk7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzU3RyaW5nKHRoaXMuZG93bmxvYWRSb3V0ZSkpIHtcbiAgICAgIHRoaXMuZG93bmxvYWRSb3V0ZSA9ICcvY2RuL3N0b3JhZ2UnO1xuICAgIH1cblxuICAgIHRoaXMuZG93bmxvYWRSb3V0ZSA9IHRoaXMuZG93bmxvYWRSb3V0ZS5yZXBsYWNlKC9cXC8kLywgJycpO1xuXG4gICAgaWYgKCFfLmlzRnVuY3Rpb24odGhpcy5uYW1pbmdGdW5jdGlvbikpIHtcbiAgICAgIHRoaXMubmFtaW5nRnVuY3Rpb24gPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIV8uaXNGdW5jdGlvbih0aGlzLm9uQmVmb3JlVXBsb2FkKSkge1xuICAgICAgdGhpcy5vbkJlZm9yZVVwbG9hZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghXy5pc0Jvb2xlYW4odGhpcy5hbGxvd0NsaWVudENvZGUpKSB7XG4gICAgICB0aGlzLmFsbG93Q2xpZW50Q29kZSA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzRnVuY3Rpb24odGhpcy5vbkluaXRpYXRlVXBsb2FkKSkge1xuICAgICAgdGhpcy5vbkluaXRpYXRlVXBsb2FkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzRnVuY3Rpb24odGhpcy5pbnRlcmNlcHREb3dubG9hZCkpIHtcbiAgICAgIHRoaXMuaW50ZXJjZXB0RG93bmxvYWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIV8uaXNCb29sZWFuKHRoaXMuc3RyaWN0KSkge1xuICAgICAgdGhpcy5zdHJpY3QgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICghXy5pc051bWJlcih0aGlzLnBlcm1pc3Npb25zKSkge1xuICAgICAgdGhpcy5wZXJtaXNzaW9ucyA9IHBhcnNlSW50KCc2NDQnLCA4KTtcbiAgICB9XG5cbiAgICBpZiAoIV8uaXNOdW1iZXIodGhpcy5wYXJlbnREaXJQZXJtaXNzaW9ucykpIHtcbiAgICAgIHRoaXMucGFyZW50RGlyUGVybWlzc2lvbnMgPSBwYXJzZUludCgnNzU1JywgOCk7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzU3RyaW5nKHRoaXMuY2FjaGVDb250cm9sKSkge1xuICAgICAgdGhpcy5jYWNoZUNvbnRyb2wgPSAncHVibGljLCBtYXgtYWdlPTMxNTM2MDAwLCBzLW1heGFnZT0zMTUzNjAwMCc7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzRnVuY3Rpb24odGhpcy5vbkFmdGVyVXBsb2FkKSkge1xuICAgICAgdGhpcy5vbkFmdGVyVXBsb2FkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzQm9vbGVhbih0aGlzLmRpc2FibGVVcGxvYWQpKSB7XG4gICAgICB0aGlzLmRpc2FibGVVcGxvYWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIV8uaXNGdW5jdGlvbih0aGlzLm9uQWZ0ZXJSZW1vdmUpKSB7XG4gICAgICB0aGlzLm9uQWZ0ZXJSZW1vdmUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIV8uaXNGdW5jdGlvbih0aGlzLm9uQmVmb3JlUmVtb3ZlKSkge1xuICAgICAgdGhpcy5vbkJlZm9yZVJlbW92ZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghXy5pc0Jvb2xlYW4odGhpcy5pbnRlZ3JpdHlDaGVjaykpIHtcbiAgICAgIHRoaXMuaW50ZWdyaXR5Q2hlY2sgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICghXy5pc0Jvb2xlYW4odGhpcy5kaXNhYmxlRG93bmxvYWQpKSB7XG4gICAgICB0aGlzLmRpc2FibGVEb3dubG9hZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghXy5pc09iamVjdCh0aGlzLl9jdXJyZW50VXBsb2FkcykpIHtcbiAgICAgIHRoaXMuX2N1cnJlbnRVcGxvYWRzID0ge307XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzRnVuY3Rpb24odGhpcy5kb3dubG9hZENhbGxiYWNrKSkge1xuICAgICAgdGhpcy5kb3dubG9hZENhbGxiYWNrID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzTnVtYmVyKHRoaXMuY29udGludWVVcGxvYWRUVEwpKSB7XG4gICAgICB0aGlzLmNvbnRpbnVlVXBsb2FkVFRMID0gMTA4MDA7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzRnVuY3Rpb24odGhpcy5yZXNwb25zZUhlYWRlcnMpKSB7XG4gICAgICB0aGlzLnJlc3BvbnNlSGVhZGVycyA9IChyZXNwb25zZUNvZGUsIGZpbGVSZWYsIHZlcnNpb25SZWYpID0+IHtcbiAgICAgICAgY29uc3QgaGVhZGVycyA9IHt9O1xuXG4gICAgICAgIHN3aXRjaCAocmVzcG9uc2VDb2RlKSB7XG4gICAgICAgIGNhc2UgJzIwNic6XG4gICAgICAgICAgaGVhZGVycy5QcmFnbWEgICAgICAgICAgICAgICA9ICdwcml2YXRlJztcbiAgICAgICAgICBoZWFkZXJzLlRyYWlsZXIgICAgICAgICAgICAgID0gJ2V4cGlyZXMnO1xuICAgICAgICAgIGhlYWRlcnNbJ1RyYW5zZmVyLUVuY29kaW5nJ10gPSAnY2h1bmtlZCc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJzQwMCc6XG4gICAgICAgICAgaGVhZGVyc1snQ2FjaGUtQ29udHJvbCddICAgICA9ICduby1jYWNoZSc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJzQxNic6XG4gICAgICAgICAgaGVhZGVyc1snQ29udGVudC1SYW5nZSddICAgICA9IGBieXRlcyAqLyR7dmVyc2lvblJlZi5zaXplfWA7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBoZWFkZXJzLkNvbm5lY3Rpb24gICAgICAgPSAna2VlcC1hbGl2ZSc7XG4gICAgICAgIGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddICA9IHZlcnNpb25SZWYudHlwZSB8fCAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJztcbiAgICAgICAgaGVhZGVyc1snQWNjZXB0LVJhbmdlcyddID0gJ2J5dGVzJztcbiAgICAgICAgcmV0dXJuIGhlYWRlcnM7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICh0aGlzLnB1YmxpYyAmJiAhc3RvcmFnZVBhdGgpIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNTAwLCBgW0ZpbGVzQ29sbGVjdGlvbi4ke3RoaXMuY29sbGVjdGlvbk5hbWV9XSBcInN0b3JhZ2VQYXRoXCIgbXVzdCBiZSBzZXQgb24gXCJwdWJsaWNcIiBjb2xsZWN0aW9ucyEgTm90ZTogXCJzdG9yYWdlUGF0aFwiIG11c3QgYmUgZXF1YWwgb24gYmUgaW5zaWRlIG9mIHlvdXIgd2ViL3Byb3h5LXNlcnZlciAoYWJzb2x1dGUpIHJvb3QuYCk7XG4gICAgfVxuXG4gICAgaWYgKCFzdG9yYWdlUGF0aCkge1xuICAgICAgc3RvcmFnZVBhdGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBgYXNzZXRzJHtub2RlUGF0aC5zZXB9YXBwJHtub2RlUGF0aC5zZXB9dXBsb2FkcyR7bm9kZVBhdGguc2VwfSR7c2VsZi5jb2xsZWN0aW9uTmFtZX1gO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoXy5pc1N0cmluZyhzdG9yYWdlUGF0aCkpIHtcbiAgICAgIHRoaXMuc3RvcmFnZVBhdGggPSAoKSA9PiBzdG9yYWdlUGF0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zdG9yYWdlUGF0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IHNwID0gc3RvcmFnZVBhdGguYXBwbHkoc2VsZiwgYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKCFfLmlzU3RyaW5nKHNwKSkge1xuICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAwLCBgW0ZpbGVzQ29sbGVjdGlvbi4ke3NlbGYuY29sbGVjdGlvbk5hbWV9XSBcInN0b3JhZ2VQYXRoXCIgZnVuY3Rpb24gbXVzdCByZXR1cm4gYSBTdHJpbmchYCk7XG4gICAgICAgIH1cbiAgICAgICAgc3AgPSBzcC5yZXBsYWNlKC9cXC8kLywgJycpO1xuICAgICAgICByZXR1cm4gbm9kZVBhdGgubm9ybWFsaXplKHNwKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdGhpcy5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb24uc3RvcmFnZVBhdGhdIFNldCB0bzonLCB0aGlzLnN0b3JhZ2VQYXRoKHt9KSk7XG5cbiAgICBmcy5ta2RpcnModGhpcy5zdG9yYWdlUGF0aCh7fSksIHsgbW9kZTogdGhpcy5wYXJlbnREaXJQZXJtaXNzaW9ucyB9LCAoZXJyb3IpID0+IHtcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMSwgYFtGaWxlc0NvbGxlY3Rpb24uJHtzZWxmLmNvbGxlY3Rpb25OYW1lfV0gUGF0aCBcIiR7dGhpcy5zdG9yYWdlUGF0aCh7fSl9XCIgaXMgbm90IHdyaXRhYmxlISAke2Vycm9yfWApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY2hlY2sodGhpcy5zdHJpY3QsIEJvb2xlYW4pO1xuICAgIGNoZWNrKHRoaXMucGVybWlzc2lvbnMsIE51bWJlcik7XG4gICAgY2hlY2sodGhpcy5zdG9yYWdlUGF0aCwgRnVuY3Rpb24pO1xuICAgIGNoZWNrKHRoaXMuY2FjaGVDb250cm9sLCBTdHJpbmcpO1xuICAgIGNoZWNrKHRoaXMub25BZnRlclJlbW92ZSwgTWF0Y2guT25lT2YoZmFsc2UsIEZ1bmN0aW9uKSk7XG4gICAgY2hlY2sodGhpcy5vbkFmdGVyVXBsb2FkLCBNYXRjaC5PbmVPZihmYWxzZSwgRnVuY3Rpb24pKTtcbiAgICBjaGVjayh0aGlzLmRpc2FibGVVcGxvYWQsIEJvb2xlYW4pO1xuICAgIGNoZWNrKHRoaXMuaW50ZWdyaXR5Q2hlY2ssIEJvb2xlYW4pO1xuICAgIGNoZWNrKHRoaXMub25CZWZvcmVSZW1vdmUsIE1hdGNoLk9uZU9mKGZhbHNlLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMuZGlzYWJsZURvd25sb2FkLCBCb29sZWFuKTtcbiAgICBjaGVjayh0aGlzLmRvd25sb2FkQ2FsbGJhY2ssIE1hdGNoLk9uZU9mKGZhbHNlLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMuaW50ZXJjZXB0RG93bmxvYWQsIE1hdGNoLk9uZU9mKGZhbHNlLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMuY29udGludWVVcGxvYWRUVEwsIE51bWJlcik7XG4gICAgY2hlY2sodGhpcy5yZXNwb25zZUhlYWRlcnMsIE1hdGNoLk9uZU9mKE9iamVjdCwgRnVuY3Rpb24pKTtcblxuICAgIGlmICghdGhpcy5kaXNhYmxlVXBsb2FkKSB7XG4gICAgICBpZiAoIV8uaXNTdHJpbmcodGhpcy5fcHJlQ29sbGVjdGlvbk5hbWUpICYmICF0aGlzLl9wcmVDb2xsZWN0aW9uKSB7XG4gICAgICAgIHRoaXMuX3ByZUNvbGxlY3Rpb25OYW1lID0gYF9fcHJlXyR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuX3ByZUNvbGxlY3Rpb24pIHtcbiAgICAgICAgdGhpcy5fcHJlQ29sbGVjdGlvbiA9IG5ldyBNb25nby5Db2xsZWN0aW9uKHRoaXMuX3ByZUNvbGxlY3Rpb25OYW1lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3ByZUNvbGxlY3Rpb25OYW1lID0gdGhpcy5fcHJlQ29sbGVjdGlvbi5fbmFtZTtcbiAgICAgIH1cbiAgICAgIGNoZWNrKHRoaXMuX3ByZUNvbGxlY3Rpb25OYW1lLCBTdHJpbmcpO1xuXG4gICAgICB0aGlzLl9wcmVDb2xsZWN0aW9uLl9lbnN1cmVJbmRleCh7IGNyZWF0ZWRBdDogMSB9LCB7IGV4cGlyZUFmdGVyU2Vjb25kczogdGhpcy5jb250aW51ZVVwbG9hZFRUTCwgYmFja2dyb3VuZDogdHJ1ZSB9KTtcbiAgICAgIGNvbnN0IF9wcmVDb2xsZWN0aW9uQ3Vyc29yID0gdGhpcy5fcHJlQ29sbGVjdGlvbi5maW5kKHt9LCB7XG4gICAgICAgIGZpZWxkczoge1xuICAgICAgICAgIF9pZDogMSxcbiAgICAgICAgICBpc0ZpbmlzaGVkOiAxXG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBfcHJlQ29sbGVjdGlvbkN1cnNvci5vYnNlcnZlKHtcbiAgICAgICAgY2hhbmdlZChkb2MpIHtcbiAgICAgICAgICBpZiAoZG9jLmlzRmluaXNoZWQpIHtcbiAgICAgICAgICAgIHNlbGYuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbX3ByZUNvbGxlY3Rpb25DdXJzb3Iub2JzZXJ2ZV0gW2NoYW5nZWRdOiAke2RvYy5faWR9YCk7XG4gICAgICAgICAgICBzZWxmLl9wcmVDb2xsZWN0aW9uLnJlbW92ZSh7X2lkOiBkb2MuX2lkfSwgTk9PUCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICByZW1vdmVkKGRvYykge1xuICAgICAgICAgIC8vIEZyZWUgbWVtb3J5IGFmdGVyIHVwbG9hZCBpcyBkb25lXG4gICAgICAgICAgLy8gT3IgaWYgdXBsb2FkIGlzIHVuZmluaXNoZWRcbiAgICAgICAgICBzZWxmLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW19wcmVDb2xsZWN0aW9uQ3Vyc29yLm9ic2VydmVdIFtyZW1vdmVkXTogJHtkb2MuX2lkfWApO1xuICAgICAgICAgIGlmIChfLmlzT2JqZWN0KHNlbGYuX2N1cnJlbnRVcGxvYWRzW2RvYy5faWRdKSkge1xuICAgICAgICAgICAgc2VsZi5fY3VycmVudFVwbG9hZHNbZG9jLl9pZF0uc3RvcCgpO1xuICAgICAgICAgICAgc2VsZi5fY3VycmVudFVwbG9hZHNbZG9jLl9pZF0uZW5kKCk7XG5cbiAgICAgICAgICAgIGlmICghZG9jLmlzRmluaXNoZWQpIHtcbiAgICAgICAgICAgICAgc2VsZi5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtfcHJlQ29sbGVjdGlvbkN1cnNvci5vYnNlcnZlXSBbcmVtb3ZlVW5maW5pc2hlZFVwbG9hZF06ICR7ZG9jLl9pZH1gKTtcbiAgICAgICAgICAgICAgc2VsZi5fY3VycmVudFVwbG9hZHNbZG9jLl9pZF0uYWJvcnQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZGVsZXRlIHNlbGYuX2N1cnJlbnRVcGxvYWRzW2RvYy5faWRdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuX2NyZWF0ZVN0cmVhbSA9IChfaWQsIHBhdGgsIG9wdHMpID0+IHtcbiAgICAgICAgdGhpcy5fY3VycmVudFVwbG9hZHNbX2lkXSA9IG5ldyBXcml0ZVN0cmVhbShwYXRoLCBvcHRzLmZpbGVMZW5ndGgsIG9wdHMsIHRoaXMucGVybWlzc2lvbnMpO1xuICAgICAgfTtcblxuICAgICAgLy8gVGhpcyBsaXR0bGUgZnVuY3Rpb24gYWxsb3dzIHRvIGNvbnRpbnVlIHVwbG9hZFxuICAgICAgLy8gZXZlbiBhZnRlciBzZXJ2ZXIgaXMgcmVzdGFydGVkICgqbm90IG9uIGRldi1zdGFnZSopXG4gICAgICB0aGlzLl9jb250aW51ZVVwbG9hZCA9IChfaWQpID0+IHtcbiAgICAgICAgaWYgKHRoaXMuX2N1cnJlbnRVcGxvYWRzW19pZF0gJiYgdGhpcy5fY3VycmVudFVwbG9hZHNbX2lkXS5maWxlKSB7XG4gICAgICAgICAgaWYgKCF0aGlzLl9jdXJyZW50VXBsb2Fkc1tfaWRdLmFib3J0ZWQgJiYgIXRoaXMuX2N1cnJlbnRVcGxvYWRzW19pZF0uZW5kZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jdXJyZW50VXBsb2Fkc1tfaWRdLmZpbGU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuX2NyZWF0ZVN0cmVhbShfaWQsIHRoaXMuX2N1cnJlbnRVcGxvYWRzW19pZF0uZmlsZS5maWxlLnBhdGgsIHRoaXMuX2N1cnJlbnRVcGxvYWRzW19pZF0uZmlsZSk7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX2N1cnJlbnRVcGxvYWRzW19pZF0uZmlsZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjb250VXBsZCA9IHRoaXMuX3ByZUNvbGxlY3Rpb24uZmluZE9uZSh7X2lkfSk7XG4gICAgICAgIGlmIChjb250VXBsZCkge1xuICAgICAgICAgIHRoaXMuX2NyZWF0ZVN0cmVhbShfaWQsIGNvbnRVcGxkLmZpbGUucGF0aCwgY29udFVwbGQpO1xuICAgICAgICAgIHJldHVybiB0aGlzLl9jdXJyZW50VXBsb2Fkc1tfaWRdLmZpbGU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuc2NoZW1hKSB7XG4gICAgICB0aGlzLnNjaGVtYSA9IEZpbGVzQ29sbGVjdGlvbkNvcmUuc2NoZW1hO1xuICAgIH1cblxuICAgIGNoZWNrKHRoaXMuZGVidWcsIEJvb2xlYW4pO1xuICAgIGNoZWNrKHRoaXMuc2NoZW1hLCBPYmplY3QpO1xuICAgIGNoZWNrKHRoaXMucHVibGljLCBCb29sZWFuKTtcbiAgICBjaGVjayh0aGlzLnByb3RlY3RlZCwgTWF0Y2guT25lT2YoQm9vbGVhbiwgRnVuY3Rpb24pKTtcbiAgICBjaGVjayh0aGlzLmNodW5rU2l6ZSwgTnVtYmVyKTtcbiAgICBjaGVjayh0aGlzLmRvd25sb2FkUm91dGUsIFN0cmluZyk7XG4gICAgY2hlY2sodGhpcy5uYW1pbmdGdW5jdGlvbiwgTWF0Y2guT25lT2YoZmFsc2UsIEZ1bmN0aW9uKSk7XG4gICAgY2hlY2sodGhpcy5vbkJlZm9yZVVwbG9hZCwgTWF0Y2guT25lT2YoZmFsc2UsIEZ1bmN0aW9uKSk7XG4gICAgY2hlY2sodGhpcy5vbkluaXRpYXRlVXBsb2FkLCBNYXRjaC5PbmVPZihmYWxzZSwgRnVuY3Rpb24pKTtcbiAgICBjaGVjayh0aGlzLmFsbG93Q2xpZW50Q29kZSwgQm9vbGVhbik7XG5cbiAgICBpZiAodGhpcy5wdWJsaWMgJiYgdGhpcy5wcm90ZWN0ZWQpIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNTAwLCBgW0ZpbGVzQ29sbGVjdGlvbi4ke3RoaXMuY29sbGVjdGlvbk5hbWV9XTogRmlsZXMgY2FuIG5vdCBiZSBwdWJsaWMgYW5kIHByb3RlY3RlZCBhdCB0aGUgc2FtZSB0aW1lIWApO1xuICAgIH1cblxuICAgIHRoaXMuX2NoZWNrQWNjZXNzID0gKGh0dHApID0+IHtcbiAgICAgIGlmICh0aGlzLnByb3RlY3RlZCkge1xuICAgICAgICBsZXQgcmVzdWx0O1xuICAgICAgICBjb25zdCB7dXNlciwgdXNlcklkfSA9IHRoaXMuX2dldFVzZXIoaHR0cCk7XG5cbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbih0aGlzLnByb3RlY3RlZCkpIHtcbiAgICAgICAgICBsZXQgZmlsZVJlZjtcbiAgICAgICAgICBpZiAoXy5pc09iamVjdChodHRwLnBhcmFtcykgJiYgIGh0dHAucGFyYW1zLl9pZCkge1xuICAgICAgICAgICAgZmlsZVJlZiA9IHRoaXMuY29sbGVjdGlvbi5maW5kT25lKGh0dHAucGFyYW1zLl9pZCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmVzdWx0ID0gaHR0cCA/IHRoaXMucHJvdGVjdGVkLmNhbGwoXy5leHRlbmQoaHR0cCwge3VzZXIsIHVzZXJJZH0pLCAoZmlsZVJlZiB8fCBudWxsKSkgOiB0aGlzLnByb3RlY3RlZC5jYWxsKHt1c2VyLCB1c2VySWR9LCAoZmlsZVJlZiB8fCBudWxsKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0ID0gISF1c2VySWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoKGh0dHAgJiYgKHJlc3VsdCA9PT0gdHJ1ZSkpIHx8ICFodHRwKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByYyA9IF8uaXNOdW1iZXIocmVzdWx0KSA/IHJlc3VsdCA6IDQwMTtcbiAgICAgICAgdGhpcy5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb24uX2NoZWNrQWNjZXNzXSBXQVJOOiBBY2Nlc3MgZGVuaWVkIScpO1xuICAgICAgICBpZiAoaHR0cCkge1xuICAgICAgICAgIGNvbnN0IHRleHQgPSAnQWNjZXNzIGRlbmllZCEnO1xuICAgICAgICAgIGlmICghaHR0cC5yZXNwb25zZS5oZWFkZXJzU2VudCkge1xuICAgICAgICAgICAgaHR0cC5yZXNwb25zZS53cml0ZUhlYWQocmMsIHtcbiAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJyxcbiAgICAgICAgICAgICAgJ0NvbnRlbnQtTGVuZ3RoJzogdGV4dC5sZW5ndGhcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghaHR0cC5yZXNwb25zZS5maW5pc2hlZCkge1xuICAgICAgICAgICAgaHR0cC5yZXNwb25zZS5lbmQodGV4dCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIHRoaXMuX21ldGhvZE5hbWVzID0ge1xuICAgICAgX0Fib3J0OiBgX0ZpbGVzQ29sbGVjdGlvbkFib3J0XyR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gLFxuICAgICAgX1dyaXRlOiBgX0ZpbGVzQ29sbGVjdGlvbldyaXRlXyR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gLFxuICAgICAgX1N0YXJ0OiBgX0ZpbGVzQ29sbGVjdGlvblN0YXJ0XyR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gLFxuICAgICAgX1JlbW92ZTogYF9GaWxlc0NvbGxlY3Rpb25SZW1vdmVfJHt0aGlzLmNvbGxlY3Rpb25OYW1lfWBcbiAgICB9O1xuXG4gICAgdGhpcy5vbignX2hhbmRsZVVwbG9hZCcsIHRoaXMuX2hhbmRsZVVwbG9hZCk7XG4gICAgdGhpcy5vbignX2ZpbmlzaFVwbG9hZCcsIHRoaXMuX2ZpbmlzaFVwbG9hZCk7XG5cbiAgICBpZiAodGhpcy5kaXNhYmxlVXBsb2FkICYmIHRoaXMuZGlzYWJsZURvd25sb2FkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIFdlYkFwcC5jb25uZWN0SGFuZGxlcnMudXNlKChodHRwUmVxLCBodHRwUmVzcCwgbmV4dCkgPT4ge1xuICAgICAgaWYgKCF0aGlzLmRpc2FibGVVcGxvYWQgJiYgISF+aHR0cFJlcS5fcGFyc2VkVXJsLnBhdGguaW5kZXhPZihgJHt0aGlzLmRvd25sb2FkUm91dGV9LyR7dGhpcy5jb2xsZWN0aW9uTmFtZX0vX191cGxvYWRgKSkge1xuICAgICAgICBpZiAoaHR0cFJlcS5tZXRob2QgPT09ICdQT1NUJykge1xuICAgICAgICAgIGNvbnN0IGhhbmRsZUVycm9yID0gKF9lcnJvcikgPT4ge1xuICAgICAgICAgICAgbGV0IGVycm9yID0gX2Vycm9yO1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdbRmlsZXNDb2xsZWN0aW9uXSBbVXBsb2FkXSBbSFRUUF0gRXhjZXB0aW9uOicsIGVycm9yKTtcbiAgICAgICAgICAgIGNvbnNvbGUudHJhY2UoKTtcblxuICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5oZWFkZXJzU2VudCkge1xuICAgICAgICAgICAgICBodHRwUmVzcC53cml0ZUhlYWQoNTAwKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5maW5pc2hlZCkge1xuICAgICAgICAgICAgICBpZiAoXy5pc09iamVjdChlcnJvcikgJiYgXy5pc0Z1bmN0aW9uKGVycm9yLnRvU3RyaW5nKSkge1xuICAgICAgICAgICAgICAgIGVycm9yID0gZXJyb3IudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmICghXy5pc1N0cmluZyhlcnJvcikpIHtcbiAgICAgICAgICAgICAgICBlcnJvciA9ICdVbmV4cGVjdGVkIGVycm9yISc7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBodHRwUmVzcC5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvciB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGxldCBib2R5ID0gJyc7XG4gICAgICAgICAgaHR0cFJlcS5vbignZGF0YScsIChkYXRhKSA9PiBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICBib2R5ICs9IGRhdGE7XG4gICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgaHR0cFJlcS5vbignZW5kJywgKCkgPT4gYm91bmQoKCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgbGV0IG9wdHM7XG4gICAgICAgICAgICAgIGxldCByZXN1bHQ7XG4gICAgICAgICAgICAgIGxldCB1c2VyO1xuXG4gICAgICAgICAgICAgIGlmIChodHRwUmVxLmhlYWRlcnNbJ3gtbXRvayddICYmIF8uaXNPYmplY3QoTWV0ZW9yLnNlcnZlci5zZXNzaW9ucykgJiYgXy5oYXMoTWV0ZW9yLnNlcnZlci5zZXNzaW9uc1todHRwUmVxLmhlYWRlcnNbJ3gtbXRvayddXSwgJ3VzZXJJZCcpKSB7XG4gICAgICAgICAgICAgICAgdXNlciA9IHtcbiAgICAgICAgICAgICAgICAgIHVzZXJJZDogTWV0ZW9yLnNlcnZlci5zZXNzaW9uc1todHRwUmVxLmhlYWRlcnNbJ3gtbXRvayddXS51c2VySWRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHVzZXIgPSB0aGlzLl9nZXRVc2VyKHtyZXF1ZXN0OiBodHRwUmVxLCByZXNwb25zZTogaHR0cFJlc3B9KTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmIChodHRwUmVxLmhlYWRlcnNbJ3gtc3RhcnQnXSAhPT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgb3B0cyA9IHtcbiAgICAgICAgICAgICAgICAgIGZpbGVJZDogaHR0cFJlcS5oZWFkZXJzWyd4LWZpbGVpZCddXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGlmIChodHRwUmVxLmhlYWRlcnNbJ3gtZW9mJ10gPT09ICcxJykge1xuICAgICAgICAgICAgICAgICAgb3B0cy5lb2YgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEJ1ZmZlci5mcm9tID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgb3B0cy5iaW5EYXRhID0gQnVmZmVyLmZyb20oYm9keSwgJ2Jhc2U2NCcpO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChidWZmRXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgb3B0cy5iaW5EYXRhID0gbmV3IEJ1ZmZlcihib2R5LCAnYmFzZTY0Jyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdHMuYmluRGF0YSA9IG5ldyBCdWZmZXIoYm9keSwgJ2Jhc2U2NCcpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgb3B0cy5jaHVua0lkID0gcGFyc2VJbnQoaHR0cFJlcS5oZWFkZXJzWyd4LWNodW5raWQnXSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgX2NvbnRpbnVlVXBsb2FkID0gdGhpcy5fY29udGludWVVcGxvYWQob3B0cy5maWxlSWQpO1xuICAgICAgICAgICAgICAgIGlmICghX2NvbnRpbnVlVXBsb2FkKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwOCwgJ0NhblxcJ3QgY29udGludWUgdXBsb2FkLCBzZXNzaW9uIGV4cGlyZWQuIFN0YXJ0IHVwbG9hZCBhZ2Fpbi4nKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAoe3Jlc3VsdCwgb3B0c30gID0gdGhpcy5fcHJlcGFyZVVwbG9hZChfLmV4dGVuZChvcHRzLCBfY29udGludWVVcGxvYWQpLCB1c2VyLnVzZXJJZCwgJ0hUVFAnKSk7XG5cbiAgICAgICAgICAgICAgICBpZiAob3B0cy5lb2YpIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMuX2hhbmRsZVVwbG9hZChyZXN1bHQsIG9wdHMsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5oZWFkZXJzU2VudCkge1xuICAgICAgICAgICAgICAgICAgICAgIGh0dHBSZXNwLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKF8uaXNPYmplY3QocmVzdWx0LmZpbGUpICYmIHJlc3VsdC5maWxlLm1ldGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuZmlsZS5tZXRhID0gZml4SlNPTlN0cmluZ2lmeShyZXN1bHQuZmlsZS5tZXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICghaHR0cFJlc3AuZmluaXNoZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBodHRwUmVzcC5lbmQoSlNPTi5zdHJpbmdpZnkocmVzdWx0KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgnX2hhbmRsZVVwbG9hZCcsIHJlc3VsdCwgb3B0cywgTk9PUCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWh0dHBSZXNwLmhlYWRlcnNTZW50KSB7XG4gICAgICAgICAgICAgICAgICBodHRwUmVzcC53cml0ZUhlYWQoMjA0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5maW5pc2hlZCkge1xuICAgICAgICAgICAgICAgICAgaHR0cFJlc3AuZW5kKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICBvcHRzID0gSlNPTi5wYXJzZShib2R5KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChqc29uRXJyKSB7XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdDYW5cXCd0IHBhcnNlIGluY29taW5nIEpTT04gZnJvbSBDbGllbnQgb24gWy5pbnNlcnQoKSB8IHVwbG9hZF0sIHNvbWV0aGluZyB3ZW50IHdyb25nIScsIGpzb25FcnIpO1xuICAgICAgICAgICAgICAgICAgb3B0cyA9IHtmaWxlOiB7fX07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKCFfLmlzT2JqZWN0KG9wdHMuZmlsZSkpIHtcbiAgICAgICAgICAgICAgICAgIG9wdHMuZmlsZSA9IHt9O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG9wdHMuX19fcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtGaWxlIFN0YXJ0IEhUVFBdICR7b3B0cy5maWxlLm5hbWUgfHwgJ1tuby1uYW1lXSd9IC0gJHtvcHRzLmZpbGVJZH1gKTtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc09iamVjdChvcHRzLmZpbGUpICYmIG9wdHMuZmlsZS5tZXRhKSB7XG4gICAgICAgICAgICAgICAgICBvcHRzLmZpbGUubWV0YSA9IGZpeEpTT05QYXJzZShvcHRzLmZpbGUubWV0YSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgKHtyZXN1bHR9ID0gdGhpcy5fcHJlcGFyZVVwbG9hZChfLmNsb25lKG9wdHMpLCB1c2VyLnVzZXJJZCwgJ0hUVFAgU3RhcnQgTWV0aG9kJykpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGVjdGlvbi5maW5kT25lKHJlc3VsdC5faWQpKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMCwgJ0NhblxcJ3Qgc3RhcnQgdXBsb2FkLCBkYXRhIHN1YnN0aXR1dGlvbiBkZXRlY3RlZCEnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBvcHRzLl9pZCAgICAgICA9IG9wdHMuZmlsZUlkO1xuICAgICAgICAgICAgICAgIG9wdHMuY3JlYXRlZEF0ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICBvcHRzLm1heExlbmd0aCA9IG9wdHMuZmlsZUxlbmd0aDtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmVDb2xsZWN0aW9uLmluc2VydChfLm9taXQob3B0cywgJ19fX3MnKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fY3JlYXRlU3RyZWFtKHJlc3VsdC5faWQsIHJlc3VsdC5wYXRoLCBfLm9taXQob3B0cywgJ19fX3MnKSk7XG5cbiAgICAgICAgICAgICAgICBpZiAob3B0cy5yZXR1cm5NZXRhKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoIWh0dHBSZXNwLmhlYWRlcnNTZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGh0dHBSZXNwLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAoIWh0dHBSZXNwLmZpbmlzaGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0dHBSZXNwLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgdXBsb2FkUm91dGU6IGAke3RoaXMuZG93bmxvYWRSb3V0ZX0vJHt0aGlzLmNvbGxlY3Rpb25OYW1lfS9fX3VwbG9hZGAsXG4gICAgICAgICAgICAgICAgICAgICAgZmlsZTogcmVzdWx0XG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5oZWFkZXJzU2VudCkge1xuICAgICAgICAgICAgICAgICAgICBodHRwUmVzcC53cml0ZUhlYWQoMjA0KTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5maW5pc2hlZCkge1xuICAgICAgICAgICAgICAgICAgICBodHRwUmVzcC5lbmQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGh0dHBSZXNwRXJyKSB7XG4gICAgICAgICAgICAgIGhhbmRsZUVycm9yKGh0dHBSZXNwRXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKCF0aGlzLmRpc2FibGVEb3dubG9hZCkge1xuICAgICAgICBsZXQgaHR0cDtcbiAgICAgICAgbGV0IHBhcmFtcztcbiAgICAgICAgbGV0IHVyaTtcbiAgICAgICAgbGV0IHVyaXM7XG5cbiAgICAgICAgaWYgKCF0aGlzLnB1YmxpYykge1xuICAgICAgICAgIGlmICghIX5odHRwUmVxLl9wYXJzZWRVcmwucGF0aC5pbmRleE9mKGAke3RoaXMuZG93bmxvYWRSb3V0ZX0vJHt0aGlzLmNvbGxlY3Rpb25OYW1lfWApKSB7XG4gICAgICAgICAgICB1cmkgPSBodHRwUmVxLl9wYXJzZWRVcmwucGF0aC5yZXBsYWNlKGAke3RoaXMuZG93bmxvYWRSb3V0ZX0vJHt0aGlzLmNvbGxlY3Rpb25OYW1lfWAsICcnKTtcbiAgICAgICAgICAgIGlmICh1cmkuaW5kZXhPZignLycpID09PSAwKSB7XG4gICAgICAgICAgICAgIHVyaSA9IHVyaS5zdWJzdHJpbmcoMSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHVyaXMgPSB1cmkuc3BsaXQoJy8nKTtcbiAgICAgICAgICAgIGlmICh1cmlzLmxlbmd0aCA9PT0gMykge1xuICAgICAgICAgICAgICBwYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgX2lkOiB1cmlzWzBdLFxuICAgICAgICAgICAgICAgIHF1ZXJ5OiBodHRwUmVxLl9wYXJzZWRVcmwucXVlcnkgPyBub2RlUXMucGFyc2UoaHR0cFJlcS5fcGFyc2VkVXJsLnF1ZXJ5KSA6IHt9LFxuICAgICAgICAgICAgICAgIG5hbWU6IHVyaXNbMl0uc3BsaXQoJz8nKVswXSxcbiAgICAgICAgICAgICAgICB2ZXJzaW9uOiB1cmlzWzFdXG4gICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgaHR0cCA9IHtyZXF1ZXN0OiBodHRwUmVxLCByZXNwb25zZTogaHR0cFJlc3AsIHBhcmFtc307XG4gICAgICAgICAgICAgIGlmICh0aGlzLl9jaGVja0FjY2VzcyhodHRwKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZG93bmxvYWQoaHR0cCwgdXJpc1sxXSwgdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUodXJpc1swXSkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKCEhfmh0dHBSZXEuX3BhcnNlZFVybC5wYXRoLmluZGV4T2YoYCR7dGhpcy5kb3dubG9hZFJvdXRlfWApKSB7XG4gICAgICAgICAgICB1cmkgPSBodHRwUmVxLl9wYXJzZWRVcmwucGF0aC5yZXBsYWNlKGAke3RoaXMuZG93bmxvYWRSb3V0ZX1gLCAnJyk7XG4gICAgICAgICAgICBpZiAodXJpLmluZGV4T2YoJy8nKSA9PT0gMCkge1xuICAgICAgICAgICAgICB1cmkgPSB1cmkuc3Vic3RyaW5nKDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB1cmlzICA9IHVyaS5zcGxpdCgnLycpO1xuICAgICAgICAgICAgbGV0IF9maWxlID0gdXJpc1t1cmlzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgaWYgKF9maWxlKSB7XG4gICAgICAgICAgICAgIGxldCB2ZXJzaW9uO1xuICAgICAgICAgICAgICBpZiAoISF+X2ZpbGUuaW5kZXhPZignLScpKSB7XG4gICAgICAgICAgICAgICAgdmVyc2lvbiA9IF9maWxlLnNwbGl0KCctJylbMF07XG4gICAgICAgICAgICAgICAgX2ZpbGUgICA9IF9maWxlLnNwbGl0KCctJylbMV0uc3BsaXQoJz8nKVswXTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2ZXJzaW9uID0gJ29yaWdpbmFsJztcbiAgICAgICAgICAgICAgICBfZmlsZSAgID0gX2ZpbGUuc3BsaXQoJz8nKVswXTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgICBxdWVyeTogaHR0cFJlcS5fcGFyc2VkVXJsLnF1ZXJ5ID8gbm9kZVFzLnBhcnNlKGh0dHBSZXEuX3BhcnNlZFVybC5xdWVyeSkgOiB7fSxcbiAgICAgICAgICAgICAgICBmaWxlOiBfZmlsZSxcbiAgICAgICAgICAgICAgICBfaWQ6IF9maWxlLnNwbGl0KCcuJylbMF0sXG4gICAgICAgICAgICAgICAgdmVyc2lvbixcbiAgICAgICAgICAgICAgICBuYW1lOiBfZmlsZVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBodHRwID0ge3JlcXVlc3Q6IGh0dHBSZXEsIHJlc3BvbnNlOiBodHRwUmVzcCwgcGFyYW1zfTtcbiAgICAgICAgICAgICAgdGhpcy5kb3dubG9hZChodHRwLCB2ZXJzaW9uLCB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShwYXJhbXMuX2lkKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgbmV4dCgpO1xuICAgIH0pO1xuXG4gICAgaWYgKCF0aGlzLmRpc2FibGVVcGxvYWQpIHtcbiAgICAgIGNvbnN0IF9tZXRob2RzID0ge307XG5cbiAgICAgIC8vIE1ldGhvZCB1c2VkIHRvIHJlbW92ZSBmaWxlXG4gICAgICAvLyBmcm9tIENsaWVudCBzaWRlXG4gICAgICBfbWV0aG9kc1t0aGlzLl9tZXRob2ROYW1lcy5fUmVtb3ZlXSA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgICBjaGVjayhzZWxlY3RvciwgTWF0Y2guT25lT2YoU3RyaW5nLCBPYmplY3QpKTtcbiAgICAgICAgc2VsZi5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtVbmxpbmsgTWV0aG9kXSBbLnJlbW92ZSgke3NlbGVjdG9yfSldYCk7XG5cbiAgICAgICAgaWYgKHNlbGYuYWxsb3dDbGllbnRDb2RlKSB7XG4gICAgICAgICAgaWYgKHNlbGYub25CZWZvcmVSZW1vdmUgJiYgXy5pc0Z1bmN0aW9uKHNlbGYub25CZWZvcmVSZW1vdmUpKSB7XG4gICAgICAgICAgICBjb25zdCB1c2VySWQgPSB0aGlzLnVzZXJJZDtcbiAgICAgICAgICAgIGNvbnN0IHVzZXJGdW5jcyA9IHtcbiAgICAgICAgICAgICAgdXNlcklkOiB0aGlzLnVzZXJJZCxcbiAgICAgICAgICAgICAgdXNlcigpIHtcbiAgICAgICAgICAgICAgICBpZiAoTWV0ZW9yLnVzZXJzKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gTWV0ZW9yLnVzZXJzLmZpbmRPbmUodXNlcklkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICghc2VsZi5vbkJlZm9yZVJlbW92ZS5jYWxsKHVzZXJGdW5jcywgKHNlbGYuZmluZChzZWxlY3RvcikgfHwgbnVsbCkpKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCAnW0ZpbGVzQ29sbGVjdGlvbl0gW3JlbW92ZV0gTm90IHBlcm1pdHRlZCEnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBjdXJzb3IgPSBzZWxmLmZpbmQoc2VsZWN0b3IpO1xuICAgICAgICAgIGlmIChjdXJzb3IuY291bnQoKSA+IDApIHtcbiAgICAgICAgICAgIHNlbGYucmVtb3ZlKHNlbGVjdG9yKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwNCwgJ0N1cnNvciBpcyBlbXB0eSwgbm8gZmlsZXMgaXMgcmVtb3ZlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAxLCAnW0ZpbGVzQ29sbGVjdGlvbl0gW3JlbW92ZV0gUnVuIGNvZGUgZnJvbSBjbGllbnQgaXMgbm90IGFsbG93ZWQhJyk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cblxuICAgICAgLy8gTWV0aG9kIHVzZWQgdG8gcmVjZWl2ZSBcImZpcnN0IGJ5dGVcIiBvZiB1cGxvYWRcbiAgICAgIC8vIGFuZCBhbGwgZmlsZSdzIG1ldGEtZGF0YSwgc29cbiAgICAgIC8vIGl0IHdvbid0IGJlIHRyYW5zZmVycmVkIHdpdGggZXZlcnkgY2h1bmtcbiAgICAgIC8vIEJhc2ljYWxseSBpdCBwcmVwYXJlcyBldmVyeXRoaW5nXG4gICAgICAvLyBTbyB1c2VyIGNhbiBwYXVzZS9kaXNjb25uZWN0IGFuZFxuICAgICAgLy8gY29udGludWUgdXBsb2FkIGxhdGVyLCBkdXJpbmcgYGNvbnRpbnVlVXBsb2FkVFRMYFxuICAgICAgX21ldGhvZHNbdGhpcy5fbWV0aG9kTmFtZXMuX1N0YXJ0XSA9IGZ1bmN0aW9uIChvcHRzLCByZXR1cm5NZXRhKSB7XG4gICAgICAgIGNoZWNrKG9wdHMsIHtcbiAgICAgICAgICBmaWxlOiBPYmplY3QsXG4gICAgICAgICAgZmlsZUlkOiBTdHJpbmcsXG4gICAgICAgICAgRlNOYW1lOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpLFxuICAgICAgICAgIGNodW5rU2l6ZTogTnVtYmVyLFxuICAgICAgICAgIGZpbGVMZW5ndGg6IE51bWJlclxuICAgICAgICB9KTtcblxuICAgICAgICBjaGVjayhyZXR1cm5NZXRhLCBNYXRjaC5PcHRpb25hbChCb29sZWFuKSk7XG5cbiAgICAgICAgc2VsZi5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtGaWxlIFN0YXJ0IE1ldGhvZF0gJHtvcHRzLmZpbGUubmFtZX0gLSAke29wdHMuZmlsZUlkfWApO1xuICAgICAgICBvcHRzLl9fX3MgPSB0cnVlO1xuICAgICAgICBjb25zdCB7IHJlc3VsdCB9ID0gc2VsZi5fcHJlcGFyZVVwbG9hZChfLmNsb25lKG9wdHMpLCB0aGlzLnVzZXJJZCwgJ0REUCBTdGFydCBNZXRob2QnKTtcblxuICAgICAgICBpZiAoc2VsZi5jb2xsZWN0aW9uLmZpbmRPbmUocmVzdWx0Ll9pZCkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMCwgJ0NhblxcJ3Qgc3RhcnQgdXBsb2FkLCBkYXRhIHN1YnN0aXR1dGlvbiBkZXRlY3RlZCEnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9wdHMuX2lkICAgICAgID0gb3B0cy5maWxlSWQ7XG4gICAgICAgIG9wdHMuY3JlYXRlZEF0ID0gbmV3IERhdGUoKTtcbiAgICAgICAgb3B0cy5tYXhMZW5ndGggPSBvcHRzLmZpbGVMZW5ndGg7XG4gICAgICAgIHNlbGYuX3ByZUNvbGxlY3Rpb24uaW5zZXJ0KF8ub21pdChvcHRzLCAnX19fcycpKTtcbiAgICAgICAgc2VsZi5fY3JlYXRlU3RyZWFtKHJlc3VsdC5faWQsIHJlc3VsdC5wYXRoLCBfLm9taXQob3B0cywgJ19fX3MnKSk7XG5cbiAgICAgICAgaWYgKHJldHVybk1ldGEpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdXBsb2FkUm91dGU6IGAke3NlbGYuZG93bmxvYWRSb3V0ZX0vJHtzZWxmLmNvbGxlY3Rpb25OYW1lfS9fX3VwbG9hZGAsXG4gICAgICAgICAgICBmaWxlOiByZXN1bHRcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfTtcblxuXG4gICAgICAvLyBNZXRob2QgdXNlZCB0byB3cml0ZSBmaWxlIGNodW5rc1xuICAgICAgLy8gaXQgcmVjZWl2ZXMgdmVyeSBsaW1pdGVkIGFtb3VudCBvZiBtZXRhLWRhdGFcbiAgICAgIC8vIFRoaXMgbWV0aG9kIGFsc28gcmVzcG9uc2libGUgZm9yIEVPRlxuICAgICAgX21ldGhvZHNbdGhpcy5fbWV0aG9kTmFtZXMuX1dyaXRlXSA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gICAgICAgIGxldCByZXN1bHQ7XG4gICAgICAgIGNoZWNrKG9wdHMsIHtcbiAgICAgICAgICBlb2Y6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pLFxuICAgICAgICAgIGZpbGVJZDogU3RyaW5nLFxuICAgICAgICAgIGJpbkRhdGE6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG4gICAgICAgICAgY2h1bmtJZDogTWF0Y2guT3B0aW9uYWwoTnVtYmVyKVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAob3B0cy5iaW5EYXRhKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBCdWZmZXIuZnJvbSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgb3B0cy5iaW5EYXRhID0gQnVmZmVyLmZyb20ob3B0cy5iaW5EYXRhLCAnYmFzZTY0Jyk7XG4gICAgICAgICAgICB9IGNhdGNoIChidWZmRXJyKSB7XG4gICAgICAgICAgICAgIG9wdHMuYmluRGF0YSA9IG5ldyBCdWZmZXIob3B0cy5iaW5EYXRhLCAnYmFzZTY0Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdHMuYmluRGF0YSA9IG5ldyBCdWZmZXIob3B0cy5iaW5EYXRhLCAnYmFzZTY0Jyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgX2NvbnRpbnVlVXBsb2FkID0gc2VsZi5fY29udGludWVVcGxvYWQob3B0cy5maWxlSWQpO1xuICAgICAgICBpZiAoIV9jb250aW51ZVVwbG9hZCkge1xuICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDA4LCAnQ2FuXFwndCBjb250aW51ZSB1cGxvYWQsIHNlc3Npb24gZXhwaXJlZC4gU3RhcnQgdXBsb2FkIGFnYWluLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgICh7cmVzdWx0LCBvcHRzfSA9IHNlbGYuX3ByZXBhcmVVcGxvYWQoXy5leHRlbmQob3B0cywgX2NvbnRpbnVlVXBsb2FkKSwgdGhpcy51c2VySWQsICdERFAnKSk7XG5cbiAgICAgICAgaWYgKG9wdHMuZW9mKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBNZXRlb3Iud3JhcEFzeW5jKHNlbGYuX2hhbmRsZVVwbG9hZC5iaW5kKHNlbGYsIHJlc3VsdCwgb3B0cykpKCk7XG4gICAgICAgICAgfSBjYXRjaCAoaGFuZGxlVXBsb2FkRXJyKSB7XG4gICAgICAgICAgICBzZWxmLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW1dyaXRlIE1ldGhvZF0gW0REUF0gRXhjZXB0aW9uOicsIGhhbmRsZVVwbG9hZEVycik7XG4gICAgICAgICAgICB0aHJvdyBoYW5kbGVVcGxvYWRFcnI7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNlbGYuZW1pdCgnX2hhbmRsZVVwbG9hZCcsIHJlc3VsdCwgb3B0cywgTk9PUCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9O1xuXG4gICAgICAvLyBNZXRob2QgdXNlZCB0byBBYm9ydCB1cGxvYWRcbiAgICAgIC8vIC0gRmVlaW5nIG1lbW9yeSBieSAuZW5kKClpbmcgd3JpdGFibGVTdHJlYW1zXG4gICAgICAvLyAtIFJlbW92aW5nIHRlbXBvcmFyeSByZWNvcmQgZnJvbSBAX3ByZUNvbGxlY3Rpb25cbiAgICAgIC8vIC0gUmVtb3ZpbmcgcmVjb3JkIGZyb20gQGNvbGxlY3Rpb25cbiAgICAgIC8vIC0gLnVubGluaygpaW5nIGNodW5rcyBmcm9tIEZTXG4gICAgICBfbWV0aG9kc1t0aGlzLl9tZXRob2ROYW1lcy5fQWJvcnRdID0gZnVuY3Rpb24gKF9pZCkge1xuICAgICAgICBjaGVjayhfaWQsIFN0cmluZyk7XG5cbiAgICAgICAgY29uc3QgX2NvbnRpbnVlVXBsb2FkID0gc2VsZi5fY29udGludWVVcGxvYWQoX2lkKTtcbiAgICAgICAgc2VsZi5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtBYm9ydCBNZXRob2RdOiAke19pZH0gLSAkeyhfLmlzT2JqZWN0KF9jb250aW51ZVVwbG9hZC5maWxlKSA/IF9jb250aW51ZVVwbG9hZC5maWxlLnBhdGggOiAnJyl9YCk7XG5cbiAgICAgICAgaWYgKHNlbGYuX2N1cnJlbnRVcGxvYWRzICYmIHNlbGYuX2N1cnJlbnRVcGxvYWRzW19pZF0pIHtcbiAgICAgICAgICBzZWxmLl9jdXJyZW50VXBsb2Fkc1tfaWRdLnN0b3AoKTtcbiAgICAgICAgICBzZWxmLl9jdXJyZW50VXBsb2Fkc1tfaWRdLmFib3J0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoX2NvbnRpbnVlVXBsb2FkKSB7XG4gICAgICAgICAgc2VsZi5fcHJlQ29sbGVjdGlvbi5yZW1vdmUoe19pZH0pO1xuICAgICAgICAgIHNlbGYucmVtb3ZlKHtfaWR9KTtcbiAgICAgICAgICBpZiAoXy5pc09iamVjdChfY29udGludWVVcGxvYWQuZmlsZSkgJiYgX2NvbnRpbnVlVXBsb2FkLmZpbGUucGF0aCkge1xuICAgICAgICAgICAgc2VsZi51bmxpbmsoe19pZCwgcGF0aDogX2NvbnRpbnVlVXBsb2FkLmZpbGUucGF0aH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH07XG5cbiAgICAgIE1ldGVvci5tZXRob2RzKF9tZXRob2RzKTtcbiAgICB9XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgX3ByZXBhcmVVcGxvYWRcbiAgICogQHN1bW1hcnkgSW50ZXJuYWwgbWV0aG9kLiBVc2VkIHRvIG9wdGltaXplIHJlY2VpdmVkIGRhdGEgYW5kIGNoZWNrIHVwbG9hZCBwZXJtaXNzaW9uXG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqL1xuICBfcHJlcGFyZVVwbG9hZChvcHRzID0ge30sIHVzZXJJZCwgdHJhbnNwb3J0KSB7XG4gICAgbGV0IGN0eDtcbiAgICBpZiAoIV8uaXNCb29sZWFuKG9wdHMuZW9mKSkge1xuICAgICAgb3B0cy5lb2YgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIW9wdHMuYmluRGF0YSkge1xuICAgICAgb3B0cy5iaW5EYXRhID0gJ0VPRic7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzTnVtYmVyKG9wdHMuY2h1bmtJZCkpIHtcbiAgICAgIG9wdHMuY2h1bmtJZCA9IC0xO1xuICAgIH1cblxuICAgIGlmICghXy5pc1N0cmluZyhvcHRzLkZTTmFtZSkpIHtcbiAgICAgIG9wdHMuRlNOYW1lID0gb3B0cy5maWxlSWQ7XG4gICAgfVxuXG4gICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtVcGxvYWRdIFske3RyYW5zcG9ydH1dIEdvdCAjJHtvcHRzLmNodW5rSWR9LyR7b3B0cy5maWxlTGVuZ3RofSBjaHVua3MsIGRzdDogJHtvcHRzLmZpbGUubmFtZSB8fCBvcHRzLmZpbGUuZmlsZU5hbWV9YCk7XG5cbiAgICBjb25zdCBmaWxlTmFtZSA9IHRoaXMuX2dldEZpbGVOYW1lKG9wdHMuZmlsZSk7XG4gICAgY29uc3Qge2V4dGVuc2lvbiwgZXh0ZW5zaW9uV2l0aERvdH0gPSB0aGlzLl9nZXRFeHQoZmlsZU5hbWUpO1xuXG4gICAgaWYgKCFfLmlzT2JqZWN0KG9wdHMuZmlsZS5tZXRhKSkge1xuICAgICAgb3B0cy5maWxlLm1ldGEgPSB7fTtcbiAgICB9XG5cbiAgICBsZXQgcmVzdWx0ICAgICAgID0gb3B0cy5maWxlO1xuICAgIHJlc3VsdC5uYW1lICAgICAgPSBmaWxlTmFtZTtcbiAgICByZXN1bHQubWV0YSAgICAgID0gb3B0cy5maWxlLm1ldGE7XG4gICAgcmVzdWx0LmV4dGVuc2lvbiA9IGV4dGVuc2lvbjtcbiAgICByZXN1bHQuZXh0ICAgICAgID0gZXh0ZW5zaW9uO1xuICAgIHJlc3VsdC5faWQgICAgICAgPSBvcHRzLmZpbGVJZDtcbiAgICByZXN1bHQudXNlcklkICAgID0gdXNlcklkIHx8IG51bGw7XG4gICAgb3B0cy5GU05hbWUgICAgICA9IG9wdHMuRlNOYW1lLnJlcGxhY2UoLyhbXmEtejAtOVxcLVxcX10rKS9naSwgJy0nKTtcbiAgICByZXN1bHQucGF0aCAgICAgID0gYCR7dGhpcy5zdG9yYWdlUGF0aChyZXN1bHQpfSR7bm9kZVBhdGguc2VwfSR7b3B0cy5GU05hbWV9JHtleHRlbnNpb25XaXRoRG90fWA7XG4gICAgcmVzdWx0ICAgICAgICAgICA9IF8uZXh0ZW5kKHJlc3VsdCwgdGhpcy5fZGF0YVRvU2NoZW1hKHJlc3VsdCkpO1xuXG4gICAgaWYgKHRoaXMub25CZWZvcmVVcGxvYWQgJiYgXy5pc0Z1bmN0aW9uKHRoaXMub25CZWZvcmVVcGxvYWQpKSB7XG4gICAgICBjdHggPSBfLmV4dGVuZCh7XG4gICAgICAgIGZpbGU6IG9wdHMuZmlsZVxuICAgICAgfSwge1xuICAgICAgICBjaHVua0lkOiBvcHRzLmNodW5rSWQsXG4gICAgICAgIHVzZXJJZDogcmVzdWx0LnVzZXJJZCxcbiAgICAgICAgdXNlcigpIHtcbiAgICAgICAgICBpZiAoTWV0ZW9yLnVzZXJzICYmIHJlc3VsdC51c2VySWQpIHtcbiAgICAgICAgICAgIHJldHVybiBNZXRlb3IudXNlcnMuZmluZE9uZShyZXN1bHQudXNlcklkKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0sXG4gICAgICAgIGVvZjogb3B0cy5lb2ZcbiAgICAgIH0pO1xuICAgICAgY29uc3QgaXNVcGxvYWRBbGxvd2VkID0gdGhpcy5vbkJlZm9yZVVwbG9hZC5jYWxsKGN0eCwgcmVzdWx0KTtcblxuICAgICAgaWYgKGlzVXBsb2FkQWxsb3dlZCAhPT0gdHJ1ZSkge1xuICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXy5pc1N0cmluZyhpc1VwbG9hZEFsbG93ZWQpID8gaXNVcGxvYWRBbGxvd2VkIDogJ0BvbkJlZm9yZVVwbG9hZCgpIHJldHVybmVkIGZhbHNlJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoKG9wdHMuX19fcyA9PT0gdHJ1ZSkgJiYgdGhpcy5vbkluaXRpYXRlVXBsb2FkICYmIF8uaXNGdW5jdGlvbih0aGlzLm9uSW5pdGlhdGVVcGxvYWQpKSB7XG4gICAgICAgICAgdGhpcy5vbkluaXRpYXRlVXBsb2FkLmNhbGwoY3R4LCByZXN1bHQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICgob3B0cy5fX19zID09PSB0cnVlKSAmJiB0aGlzLm9uSW5pdGlhdGVVcGxvYWQgJiYgXy5pc0Z1bmN0aW9uKHRoaXMub25Jbml0aWF0ZVVwbG9hZCkpIHtcbiAgICAgIGN0eCA9IF8uZXh0ZW5kKHtcbiAgICAgICAgZmlsZTogb3B0cy5maWxlXG4gICAgICB9LCB7XG4gICAgICAgIGNodW5rSWQ6IG9wdHMuY2h1bmtJZCxcbiAgICAgICAgdXNlcklkOiByZXN1bHQudXNlcklkLFxuICAgICAgICB1c2VyKCkge1xuICAgICAgICAgIGlmIChNZXRlb3IudXNlcnMgJiYgcmVzdWx0LnVzZXJJZCkge1xuICAgICAgICAgICAgcmV0dXJuIE1ldGVvci51c2Vycy5maW5kT25lKHJlc3VsdC51c2VySWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSxcbiAgICAgICAgZW9mOiBvcHRzLmVvZlxuICAgICAgfSk7XG4gICAgICB0aGlzLm9uSW5pdGlhdGVVcGxvYWQuY2FsbChjdHgsIHJlc3VsdCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtyZXN1bHQsIG9wdHN9O1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIF9maW5pc2hVcGxvYWRcbiAgICogQHN1bW1hcnkgSW50ZXJuYWwgbWV0aG9kLiBGaW5pc2ggdXBsb2FkLCBjbG9zZSBXcml0YWJsZSBzdHJlYW0sIGFkZCByZWNvcmQgdG8gTW9uZ29EQiBhbmQgZmx1c2ggdXNlZCBtZW1vcnlcbiAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICovXG4gIF9maW5pc2hVcGxvYWQocmVzdWx0LCBvcHRzLCBjYikge1xuICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbVXBsb2FkXSBbZmluaXNoKGluZylVcGxvYWRdIC0+ICR7cmVzdWx0LnBhdGh9YCk7XG4gICAgZnMuY2htb2QocmVzdWx0LnBhdGgsIHRoaXMucGVybWlzc2lvbnMsIE5PT1ApO1xuICAgIHJlc3VsdC50eXBlICAgPSB0aGlzLl9nZXRNaW1lVHlwZShvcHRzLmZpbGUpO1xuICAgIHJlc3VsdC5wdWJsaWMgPSB0aGlzLnB1YmxpYztcbiAgICB0aGlzLl91cGRhdGVGaWxlVHlwZXMocmVzdWx0KTtcblxuICAgIHRoaXMuY29sbGVjdGlvbi5pbnNlcnQoXy5jbG9uZShyZXN1bHQpLCAoY29sSW5zZXJ0LCBfaWQpID0+IHtcbiAgICAgIGlmIChjb2xJbnNlcnQpIHtcbiAgICAgICAgY2IgJiYgY2IoY29sSW5zZXJ0KTtcbiAgICAgICAgdGhpcy5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtVcGxvYWRdIFtfZmluaXNoVXBsb2FkXSBbaW5zZXJ0XSBFcnJvcjonLCBjb2xJbnNlcnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcHJlQ29sbGVjdGlvbi51cGRhdGUoe19pZDogb3B0cy5maWxlSWR9LCB7JHNldDoge2lzRmluaXNoZWQ6IHRydWV9fSwgKHByZVVwZGF0ZUVycm9yKSA9PiB7XG4gICAgICAgICAgaWYgKHByZVVwZGF0ZUVycm9yKSB7XG4gICAgICAgICAgICBjYiAmJiBjYihwcmVVcGRhdGVFcnJvcik7XG4gICAgICAgICAgICB0aGlzLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW1VwbG9hZF0gW19maW5pc2hVcGxvYWRdIFt1cGRhdGVdIEVycm9yOicsIHByZVVwZGF0ZUVycm9yKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0Ll9pZCA9IF9pZDtcbiAgICAgICAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbVXBsb2FkXSBbZmluaXNoKGVkKVVwbG9hZF0gLT4gJHtyZXN1bHQucGF0aH1gKTtcbiAgICAgICAgICAgIHRoaXMub25BZnRlclVwbG9hZCAmJiB0aGlzLm9uQWZ0ZXJVcGxvYWQuY2FsbCh0aGlzLCByZXN1bHQpO1xuICAgICAgICAgICAgdGhpcy5lbWl0KCdhZnRlclVwbG9hZCcsIHJlc3VsdCk7XG4gICAgICAgICAgICBjYiAmJiBjYihudWxsLCByZXN1bHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgX2hhbmRsZVVwbG9hZFxuICAgKiBAc3VtbWFyeSBJbnRlcm5hbCBtZXRob2QgdG8gaGFuZGxlIHVwbG9hZCBwcm9jZXNzLCBwaXBlIGluY29taW5nIGRhdGEgdG8gV3JpdGFibGUgc3RyZWFtXG4gICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAqL1xuICBfaGFuZGxlVXBsb2FkKHJlc3VsdCwgb3B0cywgY2IpIHtcbiAgICB0cnkge1xuICAgICAgaWYgKG9wdHMuZW9mKSB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRVcGxvYWRzW3Jlc3VsdC5faWRdLmVuZCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5lbWl0KCdfZmluaXNoVXBsb2FkJywgcmVzdWx0LCBvcHRzLCBjYik7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fY3VycmVudFVwbG9hZHNbcmVzdWx0Ll9pZF0ud3JpdGUob3B0cy5jaHVua0lkLCBvcHRzLmJpbkRhdGEsIGNiKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aGlzLl9kZWJ1ZygnW19oYW5kbGVVcGxvYWRdIFtFWENFUFRJT046XScsIGUpO1xuICAgICAgY2IgJiYgY2IoZSk7XG4gICAgfVxuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgX2dldE1pbWVUeXBlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlRGF0YSAtIEZpbGUgT2JqZWN0XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgZmlsZSdzIG1pbWUtdHlwZVxuICAgKiBAcmV0dXJucyB7U3RyaW5nfVxuICAgKi9cbiAgX2dldE1pbWVUeXBlKGZpbGVEYXRhKSB7XG4gICAgbGV0IG1pbWU7XG4gICAgY2hlY2soZmlsZURhdGEsIE9iamVjdCk7XG4gICAgaWYgKF8uaXNPYmplY3QoZmlsZURhdGEpICYmIGZpbGVEYXRhLnR5cGUpIHtcbiAgICAgIG1pbWUgPSBmaWxlRGF0YS50eXBlO1xuICAgIH1cblxuICAgIGlmIChmaWxlRGF0YS5wYXRoICYmICghbWltZSB8fCAhXy5pc1N0cmluZyhtaW1lKSkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGxldCBidWYgICA9IG5ldyBCdWZmZXIoMjYyKTtcbiAgICAgICAgY29uc3QgZmQgID0gZnMub3BlblN5bmMoZmlsZURhdGEucGF0aCwgJ3InKTtcbiAgICAgICAgY29uc3QgYnIgID0gZnMucmVhZFN5bmMoZmQsIGJ1ZiwgMCwgMjYyLCAwKTtcbiAgICAgICAgZnMuY2xvc2UoZmQsIE5PT1ApO1xuICAgICAgICBpZiAoYnIgPCAyNjIpIHtcbiAgICAgICAgICBidWYgPSBidWYuc2xpY2UoMCwgYnIpO1xuICAgICAgICB9XG4gICAgICAgICh7bWltZX0gPSBmaWxlVHlwZShidWYpKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gV2UncmUgZ29vZFxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghbWltZSB8fCAhXy5pc1N0cmluZyhtaW1lKSkge1xuICAgICAgbWltZSA9ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nO1xuICAgIH1cbiAgICByZXR1cm4gbWltZTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIF9nZXRVc2VyXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgb2JqZWN0IHdpdGggYHVzZXJJZGAgYW5kIGB1c2VyKClgIG1ldGhvZCB3aGljaCByZXR1cm4gdXNlcidzIG9iamVjdFxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgX2dldFVzZXIoaHR0cCkge1xuICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgIHVzZXIoKSB7IHJldHVybiBudWxsOyB9LFxuICAgICAgdXNlcklkOiBudWxsXG4gICAgfTtcblxuICAgIGlmIChodHRwKSB7XG4gICAgICBsZXQgbXRvayA9IG51bGw7XG4gICAgICBpZiAoaHR0cC5yZXF1ZXN0LmhlYWRlcnNbJ3gtbXRvayddKSB7XG4gICAgICAgIG10b2sgPSBodHRwLnJlcXVlc3QuaGVhZGVyc1sneC1tdG9rJ107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBjb29raWUgPSBodHRwLnJlcXVlc3QuQ29va2llcztcbiAgICAgICAgaWYgKGNvb2tpZS5oYXMoJ3hfbXRvaycpKSB7XG4gICAgICAgICAgbXRvayA9IGNvb2tpZS5nZXQoJ3hfbXRvaycpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChtdG9rKSB7XG4gICAgICAgIGNvbnN0IHVzZXJJZCA9IChfLmlzT2JqZWN0KE1ldGVvci5zZXJ2ZXIuc2Vzc2lvbnMpICYmIF8uaXNPYmplY3QoTWV0ZW9yLnNlcnZlci5zZXNzaW9uc1ttdG9rXSkpID8gTWV0ZW9yLnNlcnZlci5zZXNzaW9uc1ttdG9rXS51c2VySWQgOiB2b2lkIDA7XG5cbiAgICAgICAgaWYgKHVzZXJJZCkge1xuICAgICAgICAgIHJlc3VsdC51c2VyICAgPSAoKSA9PiBNZXRlb3IudXNlcnMuZmluZE9uZSh1c2VySWQpO1xuICAgICAgICAgIHJlc3VsdC51c2VySWQgPSB1c2VySWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIHdyaXRlXG4gICAqIEBwYXJhbSB7QnVmZmVyfSBidWZmZXIgLSBCaW5hcnkgRmlsZSdzIEJ1ZmZlclxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyAtIE9iamVjdCB3aXRoIGZpbGUtZGF0YVxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5uYW1lIC0gRmlsZSBuYW1lLCBhbGlhczogYGZpbGVOYW1lYFxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy50eXBlIC0gRmlsZSBtaW1lLXR5cGVcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMubWV0YSAtIEZpbGUgYWRkaXRpb25hbCBtZXRhLWRhdGFcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMudXNlcklkIC0gVXNlcklkLCBkZWZhdWx0ICpudWxsKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5maWxlSWQgLSBfaWQsIGRlZmF1bHQgKm51bGwqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gZnVuY3Rpb24oZXJyb3IsIGZpbGVPYmopey4uLn1cbiAgICogQHBhcmFtIHtCb29sZWFufSBwcm9jZWVkQWZ0ZXJVcGxvYWQgLSBQcm9jZWVkIG9uQWZ0ZXJVcGxvYWQgaG9va1xuICAgKiBAc3VtbWFyeSBXcml0ZSBidWZmZXIgdG8gRlMgYW5kIGFkZCB0byBGaWxlc0NvbGxlY3Rpb24gQ29sbGVjdGlvblxuICAgKiBAcmV0dXJucyB7RmlsZXNDb2xsZWN0aW9ufSBJbnN0YW5jZVxuICAgKi9cbiAgd3JpdGUoYnVmZmVyLCBvcHRzID0ge30sIGNhbGxiYWNrLCBwcm9jZWVkQWZ0ZXJVcGxvYWQpIHtcbiAgICB0aGlzLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW3dyaXRlKCldJyk7XG5cbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdHMpKSB7XG4gICAgICBwcm9jZWVkQWZ0ZXJVcGxvYWQgPSBjYWxsYmFjaztcbiAgICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICAgIG9wdHMgICAgID0ge307XG4gICAgfSBlbHNlIGlmIChfLmlzQm9vbGVhbihjYWxsYmFjaykpIHtcbiAgICAgIHByb2NlZWRBZnRlclVwbG9hZCA9IGNhbGxiYWNrO1xuICAgIH0gZWxzZSBpZiAoXy5pc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAgIHByb2NlZWRBZnRlclVwbG9hZCA9IG9wdHM7XG4gICAgfVxuXG4gICAgY2hlY2sob3B0cywgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG4gICAgY2hlY2soY2FsbGJhY2ssIE1hdGNoLk9wdGlvbmFsKEZ1bmN0aW9uKSk7XG4gICAgY2hlY2socHJvY2VlZEFmdGVyVXBsb2FkLCBNYXRjaC5PcHRpb25hbChCb29sZWFuKSk7XG5cbiAgICBjb25zdCBmaWxlSWQgICA9IG9wdHMuZmlsZUlkIHx8IFJhbmRvbS5pZCgpO1xuICAgIGNvbnN0IEZTTmFtZSAgID0gdGhpcy5uYW1pbmdGdW5jdGlvbiA/IHRoaXMubmFtaW5nRnVuY3Rpb24ob3B0cykgOiBmaWxlSWQ7XG4gICAgY29uc3QgZmlsZU5hbWUgPSAob3B0cy5uYW1lIHx8IG9wdHMuZmlsZU5hbWUpID8gKG9wdHMubmFtZSB8fCBvcHRzLmZpbGVOYW1lKSA6IEZTTmFtZTtcblxuICAgIGNvbnN0IHtleHRlbnNpb24sIGV4dGVuc2lvbldpdGhEb3R9ID0gdGhpcy5fZ2V0RXh0KGZpbGVOYW1lKTtcblxuICAgIG9wdHMucGF0aCA9IGAke3RoaXMuc3RvcmFnZVBhdGgob3B0cyl9JHtub2RlUGF0aC5zZXB9JHtGU05hbWV9JHtleHRlbnNpb25XaXRoRG90fWA7XG4gICAgb3B0cy50eXBlID0gdGhpcy5fZ2V0TWltZVR5cGUob3B0cyk7XG4gICAgaWYgKCFfLmlzT2JqZWN0KG9wdHMubWV0YSkpIHtcbiAgICAgIG9wdHMubWV0YSA9IHt9O1xuICAgIH1cblxuICAgIGlmICghXy5pc051bWJlcihvcHRzLnNpemUpKSB7XG4gICAgICBvcHRzLnNpemUgPSBidWZmZXIubGVuZ3RoO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX2RhdGFUb1NjaGVtYSh7XG4gICAgICBuYW1lOiBmaWxlTmFtZSxcbiAgICAgIHBhdGg6IG9wdHMucGF0aCxcbiAgICAgIG1ldGE6IG9wdHMubWV0YSxcbiAgICAgIHR5cGU6IG9wdHMudHlwZSxcbiAgICAgIHNpemU6IG9wdHMuc2l6ZSxcbiAgICAgIHVzZXJJZDogb3B0cy51c2VySWQsXG4gICAgICBleHRlbnNpb25cbiAgICB9KTtcblxuICAgIHJlc3VsdC5faWQgPSBmaWxlSWQ7XG5cbiAgICBjb25zdCBzdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShvcHRzLnBhdGgsIHtmbGFnczogJ3cnLCBtb2RlOiB0aGlzLnBlcm1pc3Npb25zfSk7XG4gICAgc3RyZWFtLmVuZChidWZmZXIsIChzdHJlYW1FcnIpID0+IGJvdW5kKCgpID0+IHtcbiAgICAgIGlmIChzdHJlYW1FcnIpIHtcbiAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2soc3RyZWFtRXJyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5pbnNlcnQocmVzdWx0LCAoaW5zZXJ0RXJyLCBfaWQpID0+IHtcbiAgICAgICAgICBpZiAoaW5zZXJ0RXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhpbnNlcnRFcnIpO1xuICAgICAgICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFt3cml0ZV0gW2luc2VydF0gRXJyb3I6ICR7ZmlsZU5hbWV9IC0+ICR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gLCBpbnNlcnRFcnIpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlUmVmID0gdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUoX2lkKTtcbiAgICAgICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKG51bGwsIGZpbGVSZWYpO1xuICAgICAgICAgICAgaWYgKHByb2NlZWRBZnRlclVwbG9hZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICB0aGlzLm9uQWZ0ZXJVcGxvYWQgJiYgdGhpcy5vbkFmdGVyVXBsb2FkLmNhbGwodGhpcywgZmlsZVJlZik7XG4gICAgICAgICAgICAgIHRoaXMuZW1pdCgnYWZ0ZXJVcGxvYWQnLCBmaWxlUmVmKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbd3JpdGVdOiAke2ZpbGVOYW1lfSAtPiAke3RoaXMuY29sbGVjdGlvbk5hbWV9YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgbG9hZFxuICAgKiBAcGFyYW0ge1N0cmluZ30gdXJsIC0gVVJMIHRvIGZpbGVcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgLSBPYmplY3Qgd2l0aCBmaWxlLWRhdGFcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMuaGVhZGVycyAtIEhUVFAgaGVhZGVycyB0byB1c2Ugd2hlbiByZXF1ZXN0aW5nIHRoZSBmaWxlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLm5hbWUgLSBGaWxlIG5hbWUsIGFsaWFzOiBgZmlsZU5hbWVgXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLnR5cGUgLSBGaWxlIG1pbWUtdHlwZVxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cy5tZXRhIC0gRmlsZSBhZGRpdGlvbmFsIG1ldGEtZGF0YVxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy51c2VySWQgLSBVc2VySWQsIGRlZmF1bHQgKm51bGwqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmZpbGVJZCAtIF9pZCwgZGVmYXVsdCAqbnVsbCpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBmdW5jdGlvbihlcnJvciwgZmlsZU9iail7Li4ufVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IHByb2NlZWRBZnRlclVwbG9hZCAtIFByb2NlZWQgb25BZnRlclVwbG9hZCBob29rXG4gICAqIEBzdW1tYXJ5IERvd25sb2FkIGZpbGUsIHdyaXRlIHN0cmVhbSB0byBGUyBhbmQgYWRkIHRvIEZpbGVzQ29sbGVjdGlvbiBDb2xsZWN0aW9uXG4gICAqIEByZXR1cm5zIHtGaWxlc0NvbGxlY3Rpb259IEluc3RhbmNlXG4gICAqL1xuICBsb2FkKHVybCwgb3B0cyA9IHt9LCBjYWxsYmFjaywgcHJvY2VlZEFmdGVyVXBsb2FkKSB7XG4gICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtsb2FkKCR7dXJsfSwgJHtKU09OLnN0cmluZ2lmeShvcHRzKX0sIGNhbGxiYWNrKV1gKTtcblxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0cykpIHtcbiAgICAgIHByb2NlZWRBZnRlclVwbG9hZCA9IGNhbGxiYWNrO1xuICAgICAgY2FsbGJhY2sgPSBvcHRzO1xuICAgICAgb3B0cyAgICAgPSB7fTtcbiAgICB9IGVsc2UgaWYgKF8uaXNCb29sZWFuKGNhbGxiYWNrKSkge1xuICAgICAgcHJvY2VlZEFmdGVyVXBsb2FkID0gY2FsbGJhY2s7XG4gICAgfSBlbHNlIGlmIChfLmlzQm9vbGVhbihvcHRzKSkge1xuICAgICAgcHJvY2VlZEFmdGVyVXBsb2FkID0gb3B0cztcbiAgICB9XG5cbiAgICBjaGVjayh1cmwsIFN0cmluZyk7XG4gICAgY2hlY2sob3B0cywgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG4gICAgY2hlY2soY2FsbGJhY2ssIE1hdGNoLk9wdGlvbmFsKEZ1bmN0aW9uKSk7XG4gICAgY2hlY2socHJvY2VlZEFmdGVyVXBsb2FkLCBNYXRjaC5PcHRpb25hbChCb29sZWFuKSk7XG5cbiAgICBpZiAoIV8uaXNPYmplY3Qob3B0cykpIHtcbiAgICAgIG9wdHMgPSB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBmaWxlSWQgICAgPSBvcHRzLmZpbGVJZCB8fCBSYW5kb20uaWQoKTtcbiAgICBjb25zdCBGU05hbWUgICAgPSB0aGlzLm5hbWluZ0Z1bmN0aW9uID8gdGhpcy5uYW1pbmdGdW5jdGlvbihvcHRzKSA6IGZpbGVJZDtcbiAgICBjb25zdCBwYXRoUGFydHMgPSB1cmwuc3BsaXQoJy8nKTtcbiAgICBjb25zdCBmaWxlTmFtZSAgPSAob3B0cy5uYW1lIHx8IG9wdHMuZmlsZU5hbWUpID8gKG9wdHMubmFtZSB8fCBvcHRzLmZpbGVOYW1lKSA6IHBhdGhQYXJ0c1twYXRoUGFydHMubGVuZ3RoIC0gMV0gfHwgRlNOYW1lO1xuXG4gICAgY29uc3Qge2V4dGVuc2lvbiwgZXh0ZW5zaW9uV2l0aERvdH0gPSB0aGlzLl9nZXRFeHQoZmlsZU5hbWUpO1xuICAgIG9wdHMucGF0aCAgPSBgJHt0aGlzLnN0b3JhZ2VQYXRoKG9wdHMpfSR7bm9kZVBhdGguc2VwfSR7RlNOYW1lfSR7ZXh0ZW5zaW9uV2l0aERvdH1gO1xuXG4gICAgY29uc3Qgc3RvcmVSZXN1bHQgPSAocmVzdWx0LCBjYikgPT4ge1xuICAgICAgcmVzdWx0Ll9pZCA9IGZpbGVJZDtcblxuICAgICAgdGhpcy5jb2xsZWN0aW9uLmluc2VydChyZXN1bHQsIChlcnJvciwgX2lkKSA9PiB7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIGNiICYmIGNiKGVycm9yKTtcbiAgICAgICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2xvYWRdIFtpbnNlcnRdIEVycm9yOiAke2ZpbGVOYW1lfSAtPiAke3RoaXMuY29sbGVjdGlvbk5hbWV9YCwgZXJyb3IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGZpbGVSZWYgPSB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShfaWQpO1xuICAgICAgICAgIGNiICYmIGNiKG51bGwsIGZpbGVSZWYpO1xuICAgICAgICAgIGlmIChwcm9jZWVkQWZ0ZXJVcGxvYWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIHRoaXMub25BZnRlclVwbG9hZCAmJiB0aGlzLm9uQWZ0ZXJVcGxvYWQuY2FsbCh0aGlzLCBmaWxlUmVmKTtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnYWZ0ZXJVcGxvYWQnLCBmaWxlUmVmKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtsb2FkXSBbaW5zZXJ0XSAke2ZpbGVOYW1lfSAtPiAke3RoaXMuY29sbGVjdGlvbk5hbWV9YCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXF1ZXN0LmdldCh7XG4gICAgICB1cmwsXG4gICAgICBoZWFkZXJzOiBvcHRzLmhlYWRlcnMgfHwge31cbiAgICB9KS5vbignZXJyb3InLCAoZXJyb3IpID0+IGJvdW5kKCgpID0+IHtcbiAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKGVycm9yKTtcbiAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbbG9hZF0gW3JlcXVlc3QuZ2V0KCR7dXJsfSldIEVycm9yOmAsIGVycm9yKTtcbiAgICB9KSkub24oJ3Jlc3BvbnNlJywgKHJlc3BvbnNlKSA9PiBib3VuZCgoKSA9PiB7XG4gICAgICByZXNwb25zZS5vbignZW5kJywgKCkgPT4gYm91bmQoKCkgPT4ge1xuICAgICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2xvYWRdIFJlY2VpdmVkOiAke3VybH1gKTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fZGF0YVRvU2NoZW1hKHtcbiAgICAgICAgICBuYW1lOiBmaWxlTmFtZSxcbiAgICAgICAgICBwYXRoOiBvcHRzLnBhdGgsXG4gICAgICAgICAgbWV0YTogb3B0cy5tZXRhLFxuICAgICAgICAgIHR5cGU6IG9wdHMudHlwZSB8fCByZXNwb25zZS5oZWFkZXJzWydjb250ZW50LXR5cGUnXSB8fCB0aGlzLl9nZXRNaW1lVHlwZSh7cGF0aDogb3B0cy5wYXRofSksXG4gICAgICAgICAgc2l6ZTogb3B0cy5zaXplIHx8IHBhcnNlSW50KHJlc3BvbnNlLmhlYWRlcnNbJ2NvbnRlbnQtbGVuZ3RoJ10gfHwgMCksXG4gICAgICAgICAgdXNlcklkOiBvcHRzLnVzZXJJZCxcbiAgICAgICAgICBleHRlbnNpb25cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFyZXN1bHQuc2l6ZSkge1xuICAgICAgICAgIGZzLnN0YXQob3B0cy5wYXRoLCAoZXJyb3IsIHN0YXRzKSA9PiBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2soZXJyb3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0LnZlcnNpb25zLm9yaWdpbmFsLnNpemUgPSAocmVzdWx0LnNpemUgPSBzdGF0cy5zaXplKTtcbiAgICAgICAgICAgICAgc3RvcmVSZXN1bHQocmVzdWx0LCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0b3JlUmVzdWx0KHJlc3VsdCwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfSkpLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3B0cy5wYXRoLCB7ZmxhZ3M6ICd3JywgbW9kZTogdGhpcy5wZXJtaXNzaW9uc30pKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIGFkZEZpbGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggICAgICAgICAgLSBQYXRoIHRvIGZpbGVcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMgICAgICAgICAgLSBbT3B0aW9uYWxdIE9iamVjdCB3aXRoIGZpbGUtZGF0YVxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy50eXBlICAgICAtIFtPcHRpb25hbF0gRmlsZSBtaW1lLXR5cGVcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMubWV0YSAgICAgLSBbT3B0aW9uYWxdIEZpbGUgYWRkaXRpb25hbCBtZXRhLWRhdGFcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZmlsZUlkICAgLSBfaWQsIGRlZmF1bHQgKm51bGwqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzLmZpbGVOYW1lIC0gW09wdGlvbmFsXSBGaWxlIG5hbWUsIGlmIG5vdCBzcGVjaWZpZWQgZmlsZSBuYW1lIGFuZCBleHRlbnNpb24gd2lsbCBiZSB0YWtlbiBmcm9tIHBhdGhcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMudXNlcklkICAgLSBbT3B0aW9uYWxdIFVzZXJJZCwgZGVmYXVsdCAqbnVsbCpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgICAgLSBbT3B0aW9uYWxdIGZ1bmN0aW9uKGVycm9yLCBmaWxlT2JqKXsuLi59XG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gcHJvY2VlZEFmdGVyVXBsb2FkIC0gUHJvY2VlZCBvbkFmdGVyVXBsb2FkIGhvb2tcbiAgICogQHN1bW1hcnkgQWRkIGZpbGUgZnJvbSBGUyB0byBGaWxlc0NvbGxlY3Rpb25cbiAgICogQHJldHVybnMge0ZpbGVzQ29sbGVjdGlvbn0gSW5zdGFuY2VcbiAgICovXG4gIGFkZEZpbGUocGF0aCwgb3B0cyA9IHt9LCBjYWxsYmFjaywgcHJvY2VlZEFmdGVyVXBsb2FkKSB7XG4gICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFthZGRGaWxlKCR7cGF0aH0pXWApO1xuXG4gICAgaWYgKF8uaXNGdW5jdGlvbihvcHRzKSkge1xuICAgICAgcHJvY2VlZEFmdGVyVXBsb2FkID0gY2FsbGJhY2s7XG4gICAgICBjYWxsYmFjayA9IG9wdHM7XG4gICAgICBvcHRzICAgICA9IHt9O1xuICAgIH0gZWxzZSBpZiAoXy5pc0Jvb2xlYW4oY2FsbGJhY2spKSB7XG4gICAgICBwcm9jZWVkQWZ0ZXJVcGxvYWQgPSBjYWxsYmFjaztcbiAgICB9IGVsc2UgaWYgKF8uaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgICBwcm9jZWVkQWZ0ZXJVcGxvYWQgPSBvcHRzO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnB1YmxpYykge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsICdDYW4gbm90IHJ1biBbYWRkRmlsZV0gb24gcHVibGljIGNvbGxlY3Rpb24hIEp1c3QgTW92ZSBmaWxlIHRvIHJvb3Qgb2YgeW91ciBzZXJ2ZXIsIHRoZW4gYWRkIHJlY29yZCB0byBDb2xsZWN0aW9uJyk7XG4gICAgfVxuXG4gICAgY2hlY2socGF0aCwgU3RyaW5nKTtcbiAgICBjaGVjayhvcHRzLCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcbiAgICBjaGVjayhjYWxsYmFjaywgTWF0Y2guT3B0aW9uYWwoRnVuY3Rpb24pKTtcbiAgICBjaGVjayhwcm9jZWVkQWZ0ZXJVcGxvYWQsIE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pKTtcblxuICAgIGZzLnN0YXQocGF0aCwgKHN0YXRFcnIsIHN0YXRzKSA9PiBib3VuZCgoKSA9PiB7XG4gICAgICBpZiAoc3RhdEVycikge1xuICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhzdGF0RXJyKTtcbiAgICAgIH0gZWxzZSBpZiAoc3RhdHMuaXNGaWxlKCkpIHtcbiAgICAgICAgaWYgKCFfLmlzT2JqZWN0KG9wdHMpKSB7XG4gICAgICAgICAgb3B0cyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIG9wdHMucGF0aCAgPSBwYXRoO1xuXG4gICAgICAgIGlmICghb3B0cy5maWxlTmFtZSkge1xuICAgICAgICAgIGNvbnN0IHBhdGhQYXJ0cyA9IHBhdGguc3BsaXQobm9kZVBhdGguc2VwKTtcbiAgICAgICAgICBvcHRzLmZpbGVOYW1lICAgPSBwYXRoLnNwbGl0KG5vZGVQYXRoLnNlcClbcGF0aFBhcnRzLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qge2V4dGVuc2lvbn0gPSB0aGlzLl9nZXRFeHQob3B0cy5maWxlTmFtZSk7XG5cbiAgICAgICAgaWYgKCFfLmlzU3RyaW5nKG9wdHMudHlwZSkpIHtcbiAgICAgICAgICBvcHRzLnR5cGUgPSB0aGlzLl9nZXRNaW1lVHlwZShvcHRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghXy5pc09iamVjdChvcHRzLm1ldGEpKSB7XG4gICAgICAgICAgb3B0cy5tZXRhID0ge307XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIV8uaXNOdW1iZXIob3B0cy5zaXplKSkge1xuICAgICAgICAgIG9wdHMuc2l6ZSA9IHN0YXRzLnNpemU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9kYXRhVG9TY2hlbWEoe1xuICAgICAgICAgIG5hbWU6IG9wdHMuZmlsZU5hbWUsXG4gICAgICAgICAgcGF0aCxcbiAgICAgICAgICBtZXRhOiBvcHRzLm1ldGEsXG4gICAgICAgICAgdHlwZTogb3B0cy50eXBlLFxuICAgICAgICAgIHNpemU6IG9wdHMuc2l6ZSxcbiAgICAgICAgICB1c2VySWQ6IG9wdHMudXNlcklkLFxuICAgICAgICAgIGV4dGVuc2lvbixcbiAgICAgICAgICBfc3RvcmFnZVBhdGg6IHBhdGgucmVwbGFjZShgJHtub2RlUGF0aC5zZXB9JHtvcHRzLmZpbGVOYW1lfWAsICcnKSxcbiAgICAgICAgICBmaWxlSWQ6IG9wdHMuZmlsZUlkIHx8IG51bGxcbiAgICAgICAgfSk7XG5cblxuICAgICAgICB0aGlzLmNvbGxlY3Rpb24uaW5zZXJ0KHJlc3VsdCwgKGluc2VydEVyciwgX2lkKSA9PiB7XG4gICAgICAgICAgaWYgKGluc2VydEVycikge1xuICAgICAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2soaW5zZXJ0RXJyKTtcbiAgICAgICAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbYWRkRmlsZV0gW2luc2VydF0gRXJyb3I6ICR7cmVzdWx0Lm5hbWV9IC0+ICR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gLCBpbnNlcnRFcnIpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlUmVmID0gdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUoX2lkKTtcbiAgICAgICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKG51bGwsIGZpbGVSZWYpO1xuICAgICAgICAgICAgaWYgKHByb2NlZWRBZnRlclVwbG9hZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICB0aGlzLm9uQWZ0ZXJVcGxvYWQgJiYgdGhpcy5vbkFmdGVyVXBsb2FkLmNhbGwodGhpcywgZmlsZVJlZik7XG4gICAgICAgICAgICAgIHRoaXMuZW1pdCgnYWZ0ZXJVcGxvYWQnLCBmaWxlUmVmKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbYWRkRmlsZV06ICR7cmVzdWx0Lm5hbWV9IC0+ICR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2sobmV3IE1ldGVvci5FcnJvcig0MDAsIGBbRmlsZXNDb2xsZWN0aW9uXSBbYWRkRmlsZSgke3BhdGh9KV06IEZpbGUgZG9lcyBub3QgZXhpc3RgKSk7XG4gICAgICB9XG4gICAgfSkpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgcmVtb3ZlXG4gICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gc2VsZWN0b3IgLSBNb25nby1TdHlsZSBzZWxlY3RvciAoaHR0cDovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNzZWxlY3RvcnMpXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgd2l0aCBvbmUgYGVycm9yYCBhcmd1bWVudFxuICAgKiBAc3VtbWFyeSBSZW1vdmUgZG9jdW1lbnRzIGZyb20gdGhlIGNvbGxlY3Rpb25cbiAgICogQHJldHVybnMge0ZpbGVzQ29sbGVjdGlvbn0gSW5zdGFuY2VcbiAgICovXG4gIHJlbW92ZShzZWxlY3RvciwgY2FsbGJhY2spIHtcbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW3JlbW92ZSgke0pTT04uc3RyaW5naWZ5KHNlbGVjdG9yKX0pXWApO1xuICAgIGlmIChzZWxlY3RvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgY2hlY2soY2FsbGJhY2ssIE1hdGNoLk9wdGlvbmFsKEZ1bmN0aW9uKSk7XG5cbiAgICBjb25zdCBmaWxlcyA9IHRoaXMuY29sbGVjdGlvbi5maW5kKHNlbGVjdG9yKTtcbiAgICBpZiAoZmlsZXMuY291bnQoKSA+IDApIHtcbiAgICAgIGZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgICAgdGhpcy51bmxpbmsoZmlsZSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2sobmV3IE1ldGVvci5FcnJvcig0MDQsICdDdXJzb3IgaXMgZW1wdHksIG5vIGZpbGVzIGlzIHJlbW92ZWQnKSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vbkFmdGVyUmVtb3ZlKSB7XG4gICAgICBjb25zdCBkb2NzID0gZmlsZXMuZmV0Y2goKTtcbiAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgdGhpcy5jb2xsZWN0aW9uLnJlbW92ZShzZWxlY3RvciwgZnVuY3Rpb24gKCkge1xuICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICBzZWxmLm9uQWZ0ZXJSZW1vdmUoZG9jcyk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb2xsZWN0aW9uLnJlbW92ZShzZWxlY3RvciwgKGNhbGxiYWNrIHx8IE5PT1ApKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgZGVueVxuICAgKiBAcGFyYW0ge09iamVjdH0gcnVsZXNcbiAgICogQHNlZSAgaHR0cHM6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjTW9uZ28tQ29sbGVjdGlvbi1kZW55XG4gICAqIEBzdW1tYXJ5IGxpbmsgTW9uZ28uQ29sbGVjdGlvbiBkZW55IG1ldGhvZHNcbiAgICogQHJldHVybnMge01vbmdvLkNvbGxlY3Rpb259IEluc3RhbmNlXG4gICAqL1xuICBkZW55KHJ1bGVzKSB7XG4gICAgdGhpcy5jb2xsZWN0aW9uLmRlbnkocnVsZXMpO1xuICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb247XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgYWxsb3dcbiAgICogQHBhcmFtIHtPYmplY3R9IHJ1bGVzXG4gICAqIEBzZWUgaHR0cHM6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjTW9uZ28tQ29sbGVjdGlvbi1hbGxvd1xuICAgKiBAc3VtbWFyeSBsaW5rIE1vbmdvLkNvbGxlY3Rpb24gYWxsb3cgbWV0aG9kc1xuICAgKiBAcmV0dXJucyB7TW9uZ28uQ29sbGVjdGlvbn0gSW5zdGFuY2VcbiAgICovXG4gIGFsbG93KHJ1bGVzKSB7XG4gICAgdGhpcy5jb2xsZWN0aW9uLmFsbG93KHJ1bGVzKTtcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIGRlbnlDbGllbnRcbiAgICogQHNlZSBodHRwczovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNNb25nby1Db2xsZWN0aW9uLWRlbnlcbiAgICogQHN1bW1hcnkgU2hvcnRoYW5kcyBmb3IgTW9uZ28uQ29sbGVjdGlvbiBkZW55IG1ldGhvZFxuICAgKiBAcmV0dXJucyB7TW9uZ28uQ29sbGVjdGlvbn0gSW5zdGFuY2VcbiAgICovXG4gIGRlbnlDbGllbnQoKSB7XG4gICAgdGhpcy5jb2xsZWN0aW9uLmRlbnkoe1xuICAgICAgaW5zZXJ0KCkgeyByZXR1cm4gdHJ1ZTsgfSxcbiAgICAgIHVwZGF0ZSgpIHsgcmV0dXJuIHRydWU7IH0sXG4gICAgICByZW1vdmUoKSB7IHJldHVybiB0cnVlOyB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbjtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSBhbGxvd0NsaWVudFxuICAgKiBAc2VlIGh0dHBzOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI01vbmdvLUNvbGxlY3Rpb24tYWxsb3dcbiAgICogQHN1bW1hcnkgU2hvcnRoYW5kcyBmb3IgTW9uZ28uQ29sbGVjdGlvbiBhbGxvdyBtZXRob2RcbiAgICogQHJldHVybnMge01vbmdvLkNvbGxlY3Rpb259IEluc3RhbmNlXG4gICAqL1xuICBhbGxvd0NsaWVudCgpIHtcbiAgICB0aGlzLmNvbGxlY3Rpb24uYWxsb3coe1xuICAgICAgaW5zZXJ0KCkgeyByZXR1cm4gdHJ1ZTsgfSxcbiAgICAgIHVwZGF0ZSgpIHsgcmV0dXJuIHRydWU7IH0sXG4gICAgICByZW1vdmUoKSB7IHJldHVybiB0cnVlOyB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbjtcbiAgfVxuXG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIHVubGlua1xuICAgKiBAcGFyYW0ge09iamVjdH0gZmlsZVJlZiAtIGZpbGVPYmpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHZlcnNpb24gLSBbT3B0aW9uYWxdIGZpbGUncyB2ZXJzaW9uXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gW09wdGlvbmFsXSBjYWxsYmFjayBmdW5jdGlvblxuICAgKiBAc3VtbWFyeSBVbmxpbmsgZmlsZXMgYW5kIGl0J3MgdmVyc2lvbnMgZnJvbSBGU1xuICAgKiBAcmV0dXJucyB7RmlsZXNDb2xsZWN0aW9ufSBJbnN0YW5jZVxuICAgKi9cbiAgdW5saW5rKGZpbGVSZWYsIHZlcnNpb24sIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFt1bmxpbmsoJHtmaWxlUmVmLl9pZH0sICR7dmVyc2lvbn0pXWApO1xuICAgIGlmICh2ZXJzaW9uKSB7XG4gICAgICBpZiAoXy5pc09iamVjdChmaWxlUmVmLnZlcnNpb25zKSAmJiBfLmlzT2JqZWN0KGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl0pICYmIGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl0ucGF0aCkge1xuICAgICAgICBmcy51bmxpbmsoZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXS5wYXRoLCAoY2FsbGJhY2sgfHwgTk9PUCkpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoXy5pc09iamVjdChmaWxlUmVmLnZlcnNpb25zKSkge1xuICAgICAgICBfLmVhY2goZmlsZVJlZi52ZXJzaW9ucywgKHZSZWYpID0+IGJvdW5kKCgpID0+IHtcbiAgICAgICAgICBmcy51bmxpbmsodlJlZi5wYXRoLCAoY2FsbGJhY2sgfHwgTk9PUCkpO1xuICAgICAgICB9KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmcy51bmxpbmsoZmlsZVJlZi5wYXRoLCAoY2FsbGJhY2sgfHwgTk9PUCkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSBfNDA0XG4gICAqIEBzdW1tYXJ5IEludGVybmFsIG1ldGhvZCwgdXNlZCB0byByZXR1cm4gNDA0IGVycm9yXG4gICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAqL1xuICBfNDA0KGh0dHApIHtcbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2Rvd25sb2FkKCR7aHR0cC5yZXF1ZXN0Lm9yaWdpbmFsVXJsfSldIFtfNDA0XSBGaWxlIG5vdCBmb3VuZGApO1xuICAgIGNvbnN0IHRleHQgPSAnRmlsZSBOb3QgRm91bmQgOignO1xuXG4gICAgaWYgKCFodHRwLnJlc3BvbnNlLmhlYWRlcnNTZW50KSB7XG4gICAgICBodHRwLnJlc3BvbnNlLndyaXRlSGVhZCg0MDQsIHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJyxcbiAgICAgICAgJ0NvbnRlbnQtTGVuZ3RoJzogdGV4dC5sZW5ndGhcbiAgICAgIH1cbiAgICAgICk7XG4gICAgfVxuICAgIGlmICghaHR0cC5yZXNwb25zZS5maW5pc2hlZCkge1xuICAgICAgaHR0cC5yZXNwb25zZS5lbmQodGV4dCk7XG4gICAgfVxuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIGRvd25sb2FkXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBodHRwICAgIC0gU2VydmVyIEhUVFAgb2JqZWN0XG4gICAqIEBwYXJhbSB7U3RyaW5nfSB2ZXJzaW9uIC0gUmVxdWVzdGVkIGZpbGUgdmVyc2lvblxuICAgKiBAcGFyYW0ge09iamVjdH0gZmlsZVJlZiAtIFJlcXVlc3RlZCBmaWxlIE9iamVjdFxuICAgKiBAc3VtbWFyeSBJbml0aWF0ZXMgdGhlIEhUVFAgcmVzcG9uc2VcbiAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICovXG4gIGRvd25sb2FkKGh0dHAsIHZlcnNpb24gPSAnb3JpZ2luYWwnLCBmaWxlUmVmKSB7XG4gICAgbGV0IHZSZWY7XG4gICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtkb3dubG9hZCgke2h0dHAucmVxdWVzdC5vcmlnaW5hbFVybH0sICR7dmVyc2lvbn0pXWApO1xuXG4gICAgaWYgKGZpbGVSZWYpIHtcbiAgICAgIGlmIChfLmhhcyhmaWxlUmVmLCAndmVyc2lvbnMnKSAmJiBfLmhhcyhmaWxlUmVmLnZlcnNpb25zLCB2ZXJzaW9uKSkge1xuICAgICAgICB2UmVmID0gZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXTtcbiAgICAgICAgdlJlZi5faWQgPSBmaWxlUmVmLl9pZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZSZWYgPSBmaWxlUmVmO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2UmVmID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCF2UmVmIHx8ICFfLmlzT2JqZWN0KHZSZWYpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fNDA0KGh0dHApO1xuICAgIH0gZWxzZSBpZiAoZmlsZVJlZikge1xuICAgICAgaWYgKHRoaXMuZG93bmxvYWRDYWxsYmFjaykge1xuICAgICAgICBpZiAoIXRoaXMuZG93bmxvYWRDYWxsYmFjay5jYWxsKF8uZXh0ZW5kKGh0dHAsIHRoaXMuX2dldFVzZXIoaHR0cCkpLCBmaWxlUmVmKSkge1xuICAgICAgICAgIHJldHVybiB0aGlzLl80MDQoaHR0cCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuaW50ZXJjZXB0RG93bmxvYWQgJiYgXy5pc0Z1bmN0aW9uKHRoaXMuaW50ZXJjZXB0RG93bmxvYWQpKSB7XG4gICAgICAgIGlmICh0aGlzLmludGVyY2VwdERvd25sb2FkKGh0dHAsIGZpbGVSZWYsIHZlcnNpb24pID09PSB0cnVlKSB7XG4gICAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmcy5zdGF0KHZSZWYucGF0aCwgKHN0YXRFcnIsIHN0YXRzKSA9PiBib3VuZCgoKSA9PiB7XG4gICAgICAgIGxldCByZXNwb25zZVR5cGU7XG4gICAgICAgIGlmIChzdGF0RXJyIHx8ICFzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICAgIHJldHVybiB0aGlzLl80MDQoaHR0cCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoKHN0YXRzLnNpemUgIT09IHZSZWYuc2l6ZSkgJiYgIXRoaXMuaW50ZWdyaXR5Q2hlY2spIHtcbiAgICAgICAgICB2UmVmLnNpemUgICAgPSBzdGF0cy5zaXplO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKChzdGF0cy5zaXplICE9PSB2UmVmLnNpemUpICYmIHRoaXMuaW50ZWdyaXR5Q2hlY2spIHtcbiAgICAgICAgICByZXNwb25zZVR5cGUgPSAnNDAwJztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLnNlcnZlKGh0dHAsIGZpbGVSZWYsIHZSZWYsIHZlcnNpb24sIG51bGwsIChyZXNwb25zZVR5cGUgfHwgJzIwMCcpKTtcbiAgICAgIH0pKTtcbiAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl80MDQoaHR0cCk7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgc2VydmVcbiAgICogQHBhcmFtIHtPYmplY3R9IGh0dHAgICAgLSBTZXJ2ZXIgSFRUUCBvYmplY3RcbiAgICogQHBhcmFtIHtPYmplY3R9IGZpbGVSZWYgLSBSZXF1ZXN0ZWQgZmlsZSBPYmplY3RcbiAgICogQHBhcmFtIHtPYmplY3R9IHZSZWYgICAgLSBSZXF1ZXN0ZWQgZmlsZSB2ZXJzaW9uIE9iamVjdFxuICAgKiBAcGFyYW0ge1N0cmluZ30gdmVyc2lvbiAtIFJlcXVlc3RlZCBmaWxlIHZlcnNpb25cbiAgICogQHBhcmFtIHtzdHJlYW0uUmVhZGFibGV8bnVsbH0gcmVhZGFibGVTdHJlYW0gLSBSZWFkYWJsZSBzdHJlYW0sIHdoaWNoIHNlcnZlcyBiaW5hcnkgZmlsZSBkYXRhXG4gICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZVR5cGUgLSBSZXNwb25zZSBjb2RlXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gZm9yY2UyMDAgLSBGb3JjZSAyMDAgcmVzcG9uc2UgY29kZSBvdmVyIDIwNlxuICAgKiBAc3VtbWFyeSBIYW5kbGUgYW5kIHJlcGx5IHRvIGluY29taW5nIHJlcXVlc3RcbiAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICovXG4gIHNlcnZlKGh0dHAsIGZpbGVSZWYsIHZSZWYsIHZlcnNpb24gPSAnb3JpZ2luYWwnLCByZWFkYWJsZVN0cmVhbSA9IG51bGwsIHJlc3BvbnNlVHlwZSA9ICcyMDAnLCBmb3JjZTIwMCA9IGZhbHNlKSB7XG4gICAgbGV0IHBhcnRpcmFsID0gZmFsc2U7XG4gICAgbGV0IHJlcVJhbmdlID0gZmFsc2U7XG4gICAgbGV0IGRpc3Bvc2l0aW9uVHlwZSA9ICcnO1xuICAgIGxldCBzdGFydDtcbiAgICBsZXQgZW5kO1xuICAgIGxldCB0YWtlO1xuXG4gICAgaWYgKGh0dHAucGFyYW1zLnF1ZXJ5LmRvd25sb2FkICYmIChodHRwLnBhcmFtcy5xdWVyeS5kb3dubG9hZCA9PT0gJ3RydWUnKSkge1xuICAgICAgZGlzcG9zaXRpb25UeXBlID0gJ2F0dGFjaG1lbnQ7ICc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRpc3Bvc2l0aW9uVHlwZSA9ICdpbmxpbmU7ICc7XG4gICAgfVxuXG4gICAgY29uc3QgZGlzcG9zaXRpb25OYW1lICAgICA9IGBmaWxlbmFtZT1cXFwiJHtlbmNvZGVVUkkodlJlZi5uYW1lIHx8IGZpbGVSZWYubmFtZSkucmVwbGFjZSgvXFwsL2csICclMkMnKX1cXFwiOyBmaWxlbmFtZSo9VVRGLTgnJyR7ZW5jb2RlVVJJQ29tcG9uZW50KHZSZWYubmFtZSB8fCBmaWxlUmVmLm5hbWUpfTsgYDtcbiAgICBjb25zdCBkaXNwb3NpdGlvbkVuY29kaW5nID0gJ2NoYXJzZXQ9VVRGLTgnO1xuXG4gICAgaWYgKCFodHRwLnJlc3BvbnNlLmhlYWRlcnNTZW50KSB7XG4gICAgICBodHRwLnJlc3BvbnNlLnNldEhlYWRlcignQ29udGVudC1EaXNwb3NpdGlvbicsIGRpc3Bvc2l0aW9uVHlwZSArIGRpc3Bvc2l0aW9uTmFtZSArIGRpc3Bvc2l0aW9uRW5jb2RpbmcpO1xuICAgIH1cblxuICAgIGlmIChodHRwLnJlcXVlc3QuaGVhZGVycy5yYW5nZSAmJiAhZm9yY2UyMDApIHtcbiAgICAgIHBhcnRpcmFsICAgID0gdHJ1ZTtcbiAgICAgIGNvbnN0IGFycmF5ID0gaHR0cC5yZXF1ZXN0LmhlYWRlcnMucmFuZ2Uuc3BsaXQoL2J5dGVzPShbMC05XSopLShbMC05XSopLyk7XG4gICAgICBzdGFydCAgICAgICA9IHBhcnNlSW50KGFycmF5WzFdKTtcbiAgICAgIGVuZCAgICAgICAgID0gcGFyc2VJbnQoYXJyYXlbMl0pO1xuICAgICAgaWYgKGlzTmFOKGVuZCkpIHtcbiAgICAgICAgZW5kICAgICAgID0gdlJlZi5zaXplIC0gMTtcbiAgICAgIH1cbiAgICAgIHRha2UgICAgICAgID0gZW5kIC0gc3RhcnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXJ0ID0gMDtcbiAgICAgIGVuZCAgID0gdlJlZi5zaXplIC0gMTtcbiAgICAgIHRha2UgID0gdlJlZi5zaXplO1xuICAgIH1cblxuICAgIGlmIChwYXJ0aXJhbCB8fCAoaHR0cC5wYXJhbXMucXVlcnkucGxheSAmJiAoaHR0cC5wYXJhbXMucXVlcnkucGxheSA9PT0gJ3RydWUnKSkpIHtcbiAgICAgIHJlcVJhbmdlID0ge3N0YXJ0LCBlbmR9O1xuICAgICAgaWYgKGlzTmFOKHN0YXJ0KSAmJiAhaXNOYU4oZW5kKSkge1xuICAgICAgICByZXFSYW5nZS5zdGFydCA9IGVuZCAtIHRha2U7XG4gICAgICAgIHJlcVJhbmdlLmVuZCAgID0gZW5kO1xuICAgICAgfVxuICAgICAgaWYgKCFpc05hTihzdGFydCkgJiYgaXNOYU4oZW5kKSkge1xuICAgICAgICByZXFSYW5nZS5zdGFydCA9IHN0YXJ0O1xuICAgICAgICByZXFSYW5nZS5lbmQgICA9IHN0YXJ0ICsgdGFrZTtcbiAgICAgIH1cblxuICAgICAgaWYgKChzdGFydCArIHRha2UpID49IHZSZWYuc2l6ZSkgeyByZXFSYW5nZS5lbmQgPSB2UmVmLnNpemUgLSAxOyB9XG5cbiAgICAgIGlmICh0aGlzLnN0cmljdCAmJiAoKHJlcVJhbmdlLnN0YXJ0ID49ICh2UmVmLnNpemUgLSAxKSkgfHwgKHJlcVJhbmdlLmVuZCA+ICh2UmVmLnNpemUgLSAxKSkpKSB7XG4gICAgICAgIHJlc3BvbnNlVHlwZSA9ICc0MTYnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzcG9uc2VUeXBlID0gJzIwNic7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3BvbnNlVHlwZSA9ICcyMDAnO1xuICAgIH1cblxuICAgIGNvbnN0IHN0cmVhbUVycm9ySGFuZGxlciA9IChlcnJvcikgPT4ge1xuICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtzZXJ2ZSgke3ZSZWYucGF0aH0sICR7dmVyc2lvbn0pXSBbNTAwXWAsIGVycm9yKTtcbiAgICAgIGlmICghaHR0cC5yZXNwb25zZS5maW5pc2hlZCkge1xuICAgICAgICBodHRwLnJlc3BvbnNlLmVuZChlcnJvci50b1N0cmluZygpKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgaGVhZGVycyA9IF8uaXNGdW5jdGlvbih0aGlzLnJlc3BvbnNlSGVhZGVycykgPyB0aGlzLnJlc3BvbnNlSGVhZGVycyhyZXNwb25zZVR5cGUsIGZpbGVSZWYsIHZSZWYsIHZlcnNpb24pIDogdGhpcy5yZXNwb25zZUhlYWRlcnM7XG5cbiAgICBpZiAoIWhlYWRlcnNbJ0NhY2hlLUNvbnRyb2wnXSkge1xuICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmhlYWRlcnNTZW50KSB7XG4gICAgICAgIGh0dHAucmVzcG9uc2Uuc2V0SGVhZGVyKCdDYWNoZS1Db250cm9sJywgdGhpcy5jYWNoZUNvbnRyb2wpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAobGV0IGtleSBpbiBoZWFkZXJzKSB7XG4gICAgICBpZiAoIWh0dHAucmVzcG9uc2UuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgaHR0cC5yZXNwb25zZS5zZXRIZWFkZXIoa2V5LCBoZWFkZXJzW2tleV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHJlc3BvbmQgPSAoc3RyZWFtLCBjb2RlKSA9PiB7XG4gICAgICBpZiAoIWh0dHAucmVzcG9uc2UuaGVhZGVyc1NlbnQgJiYgcmVhZGFibGVTdHJlYW0pIHtcbiAgICAgICAgaHR0cC5yZXNwb25zZS53cml0ZUhlYWQoY29kZSk7XG4gICAgICB9XG5cbiAgICAgIGh0dHAucmVzcG9uc2Uub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIHN0cmVhbS5hYm9ydCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHN0cmVhbS5hYm9ydCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2Ygc3RyZWFtLmVuZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHN0cmVhbS5lbmQoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGh0dHAucmVxdWVzdC5vbignYWJvcnRlZCcsICgpID0+IHtcbiAgICAgICAgaHR0cC5yZXF1ZXN0LmFib3J0ZWQgPSB0cnVlO1xuICAgICAgICBpZiAodHlwZW9mIHN0cmVhbS5hYm9ydCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHN0cmVhbS5hYm9ydCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2Ygc3RyZWFtLmVuZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHN0cmVhbS5lbmQoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHN0cmVhbS5vbignb3BlbicsICgpID0+IHtcbiAgICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmhlYWRlcnNTZW50KSB7XG4gICAgICAgICAgaHR0cC5yZXNwb25zZS53cml0ZUhlYWQoY29kZSk7XG4gICAgICAgIH1cbiAgICAgIH0pLm9uKCdhYm9ydCcsICgpID0+IHtcbiAgICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmZpbmlzaGVkKSB7XG4gICAgICAgICAgaHR0cC5yZXNwb25zZS5lbmQoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWh0dHAucmVxdWVzdC5hYm9ydGVkKSB7XG4gICAgICAgICAgaHR0cC5yZXF1ZXN0LmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgICAgfSkub24oJ2Vycm9yJywgc3RyZWFtRXJyb3JIYW5kbGVyXG4gICAgICApLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgIGlmICghaHR0cC5yZXNwb25zZS5maW5pc2hlZCkge1xuICAgICAgICAgIGh0dHAucmVzcG9uc2UuZW5kKCk7XG4gICAgICAgIH1cbiAgICAgIH0pLnBpcGUoaHR0cC5yZXNwb25zZSk7XG4gICAgfTtcblxuICAgIHN3aXRjaCAocmVzcG9uc2VUeXBlKSB7XG4gICAgY2FzZSAnNDAwJzpcbiAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbc2VydmUoJHt2UmVmLnBhdGh9LCAke3ZlcnNpb259KV0gWzQwMF0gQ29udGVudC1MZW5ndGggbWlzbWF0Y2ghYCk7XG4gICAgICB2YXIgdGV4dCA9ICdDb250ZW50LUxlbmd0aCBtaXNtYXRjaCEnO1xuXG4gICAgICBpZiAoIWh0dHAucmVzcG9uc2UuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgaHR0cC5yZXNwb25zZS53cml0ZUhlYWQoNDAwLCB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJyxcbiAgICAgICAgICAnQ29udGVudC1MZW5ndGgnOiB0ZXh0Lmxlbmd0aFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmZpbmlzaGVkKSB7XG4gICAgICAgIGh0dHAucmVzcG9uc2UuZW5kKHRleHQpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnNDA0JzpcbiAgICAgIHRoaXMuXzQwNChodHRwKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJzQxNic6XG4gICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW3NlcnZlKCR7dlJlZi5wYXRofSwgJHt2ZXJzaW9ufSldIFs0MTZdIENvbnRlbnQtUmFuZ2UgaXMgbm90IHNwZWNpZmllZCFgKTtcbiAgICAgIGlmICghaHR0cC5yZXNwb25zZS5oZWFkZXJzU2VudCkge1xuICAgICAgICBodHRwLnJlc3BvbnNlLndyaXRlSGVhZCg0MTYpO1xuICAgICAgfVxuICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmZpbmlzaGVkKSB7XG4gICAgICAgIGh0dHAucmVzcG9uc2UuZW5kKCk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICcyMDYnOlxuICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtzZXJ2ZSgke3ZSZWYucGF0aH0sICR7dmVyc2lvbn0pXSBbMjA2XWApO1xuICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmhlYWRlcnNTZW50KSB7XG4gICAgICAgIGh0dHAucmVzcG9uc2Uuc2V0SGVhZGVyKCdDb250ZW50LVJhbmdlJywgYGJ5dGVzICR7cmVxUmFuZ2Uuc3RhcnR9LSR7cmVxUmFuZ2UuZW5kfS8ke3ZSZWYuc2l6ZX1gKTtcbiAgICAgIH1cbiAgICAgIHJlc3BvbmQocmVhZGFibGVTdHJlYW0gfHwgZnMuY3JlYXRlUmVhZFN0cmVhbSh2UmVmLnBhdGgsIHtzdGFydDogcmVxUmFuZ2Uuc3RhcnQsIGVuZDogcmVxUmFuZ2UuZW5kfSksIDIwNik7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtzZXJ2ZSgke3ZSZWYucGF0aH0sICR7dmVyc2lvbn0pXSBbMjAwXWApO1xuICAgICAgcmVzcG9uZChyZWFkYWJsZVN0cmVhbSB8fCBmcy5jcmVhdGVSZWFkU3RyZWFtKHZSZWYucGF0aCksIDIwMCk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbn1cbiIsImltcG9ydCB7IF8gfSAgICAgICAgICAgICAgICAgICAgICAgZnJvbSAnbWV0ZW9yL3VuZGVyc2NvcmUnO1xuaW1wb3J0IHsgRXZlbnRFbWl0dGVyIH0gICAgICAgICAgICBmcm9tICdldmVudGVtaXR0ZXIzJztcbmltcG9ydCB7IGZvcm1hdEZsZVVSTCB9ICAgICAgICAgICAgZnJvbSAnLi9saWIuanMnO1xuaW1wb3J0IHsgY2hlY2ssIE1hdGNoIH0gICAgICAgICAgICBmcm9tICdtZXRlb3IvY2hlY2snO1xuaW1wb3J0IHsgRmlsZXNDdXJzb3IsIEZpbGVDdXJzb3IgfSBmcm9tICcuL2N1cnNvci5qcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEZpbGVzQ29sbGVjdGlvbkNvcmUgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpO1xuICB9XG5cbiAgc3RhdGljIHNjaGVtYSA9IHtcbiAgICBfaWQ6IHtcbiAgICAgIHR5cGU6IFN0cmluZ1xuICAgIH0sXG4gICAgc2l6ZToge1xuICAgICAgdHlwZTogTnVtYmVyXG4gICAgfSxcbiAgICBuYW1lOiB7XG4gICAgICB0eXBlOiBTdHJpbmdcbiAgICB9LFxuICAgIHR5cGU6IHtcbiAgICAgIHR5cGU6IFN0cmluZ1xuICAgIH0sXG4gICAgcGF0aDoge1xuICAgICAgdHlwZTogU3RyaW5nXG4gICAgfSxcbiAgICBpc1ZpZGVvOiB7XG4gICAgICB0eXBlOiBCb29sZWFuXG4gICAgfSxcbiAgICBpc0F1ZGlvOiB7XG4gICAgICB0eXBlOiBCb29sZWFuXG4gICAgfSxcbiAgICBpc0ltYWdlOiB7XG4gICAgICB0eXBlOiBCb29sZWFuXG4gICAgfSxcbiAgICBpc1RleHQ6IHtcbiAgICAgIHR5cGU6IEJvb2xlYW5cbiAgICB9LFxuICAgIGlzSlNPTjoge1xuICAgICAgdHlwZTogQm9vbGVhblxuICAgIH0sXG4gICAgaXNQREY6IHtcbiAgICAgIHR5cGU6IEJvb2xlYW5cbiAgICB9LFxuICAgIGV4dGVuc2lvbjoge1xuICAgICAgdHlwZTogU3RyaW5nLFxuICAgICAgb3B0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIGV4dDoge1xuICAgICAgdHlwZTogU3RyaW5nLFxuICAgICAgb3B0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIGV4dGVuc2lvbldpdGhEb3Q6IHtcbiAgICAgIHR5cGU6IFN0cmluZyxcbiAgICAgIG9wdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICBtaW1lOiB7XG4gICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICBvcHRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgJ21pbWUtdHlwZSc6IHtcbiAgICAgIHR5cGU6IFN0cmluZyxcbiAgICAgIG9wdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICBfc3RvcmFnZVBhdGg6IHtcbiAgICAgIHR5cGU6IFN0cmluZ1xuICAgIH0sXG4gICAgX2Rvd25sb2FkUm91dGU6IHtcbiAgICAgIHR5cGU6IFN0cmluZ1xuICAgIH0sXG4gICAgX2NvbGxlY3Rpb25OYW1lOiB7XG4gICAgICB0eXBlOiBTdHJpbmdcbiAgICB9LFxuICAgIHB1YmxpYzoge1xuICAgICAgdHlwZTogQm9vbGVhbixcbiAgICAgIG9wdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICBtZXRhOiB7XG4gICAgICB0eXBlOiBPYmplY3QsXG4gICAgICBibGFja2JveDogdHJ1ZSxcbiAgICAgIG9wdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB1c2VySWQ6IHtcbiAgICAgIHR5cGU6IFN0cmluZyxcbiAgICAgIG9wdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB1cGRhdGVkQXQ6IHtcbiAgICAgIHR5cGU6IERhdGUsXG4gICAgICBvcHRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgdmVyc2lvbnM6IHtcbiAgICAgIHR5cGU6IE9iamVjdCxcbiAgICAgIGJsYWNrYm94OiB0cnVlXG4gICAgfVxuICB9O1xuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uQ29yZVxuICAgKiBAbmFtZSBfZGVidWdcbiAgICogQHN1bW1hcnkgUHJpbnQgbG9ncyBpbiBkZWJ1ZyBtb2RlXG4gICAqIEByZXR1cm5zIHt2b2lkfVxuICAgKi9cbiAgX2RlYnVnKCkge1xuICAgIGlmICh0aGlzLmRlYnVnKSB7XG4gICAgICAoY29uc29sZS5pbmZvIHx8IGNvbnNvbGUubG9nIHx8IGZ1bmN0aW9uICgpIHsgfSkuYXBwbHkodW5kZWZpbmVkLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uQ29yZVxuICAgKiBAbmFtZSBfZ2V0RmlsZU5hbWVcbiAgICogQHBhcmFtIHtPYmplY3R9IGZpbGVEYXRhIC0gRmlsZSBPYmplY3RcbiAgICogQHN1bW1hcnkgUmV0dXJucyBmaWxlJ3MgbmFtZVxuICAgKiBAcmV0dXJucyB7U3RyaW5nfVxuICAgKi9cbiAgX2dldEZpbGVOYW1lKGZpbGVEYXRhKSB7XG4gICAgY29uc3QgZmlsZU5hbWUgPSBmaWxlRGF0YS5uYW1lIHx8IGZpbGVEYXRhLmZpbGVOYW1lO1xuICAgIGlmIChfLmlzU3RyaW5nKGZpbGVOYW1lKSAmJiAoZmlsZU5hbWUubGVuZ3RoID4gMCkpIHtcbiAgICAgIHJldHVybiAoZmlsZURhdGEubmFtZSB8fCBmaWxlRGF0YS5maWxlTmFtZSkucmVwbGFjZSgvXlxcLlxcLisvLCAnJykucmVwbGFjZSgvXFwuezIsfS9nLCAnLicpLnJlcGxhY2UoL1xcLy9nLCAnJyk7XG4gICAgfVxuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uQ29yZVxuICAgKiBAbmFtZSBfZ2V0RXh0XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBGaWxlTmFtZSAtIEZpbGUgbmFtZVxuICAgKiBAc3VtbWFyeSBHZXQgZXh0ZW5zaW9uIGZyb20gRmlsZU5hbWVcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIF9nZXRFeHQoZmlsZU5hbWUpIHtcbiAgICBpZiAoISF+ZmlsZU5hbWUuaW5kZXhPZignLicpKSB7XG4gICAgICBjb25zdCBleHRlbnNpb24gPSAoZmlsZU5hbWUuc3BsaXQoJy4nKS5wb3AoKS5zcGxpdCgnPycpWzBdIHx8ICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgcmV0dXJuIHsgZXh0OiBleHRlbnNpb24sIGV4dGVuc2lvbiwgZXh0ZW5zaW9uV2l0aERvdDogYC4ke2V4dGVuc2lvbn1gIH07XG4gICAgfVxuICAgIHJldHVybiB7IGV4dDogJycsIGV4dGVuc2lvbjogJycsIGV4dGVuc2lvbldpdGhEb3Q6ICcnIH07XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvbkNvcmVcbiAgICogQG5hbWUgX3VwZGF0ZUZpbGVUeXBlc1xuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZpbGUgZGF0YVxuICAgKiBAc3VtbWFyeSBJbnRlcm5hbCBtZXRob2QuIENsYXNzaWZ5IGZpbGUgYmFzZWQgb24gJ3R5cGUnIGZpZWxkXG4gICAqL1xuICBfdXBkYXRlRmlsZVR5cGVzKGRhdGEpIHtcbiAgICBkYXRhLmlzVmlkZW8gID0gL152aWRlb1xcLy9pLnRlc3QoZGF0YS50eXBlKTtcbiAgICBkYXRhLmlzQXVkaW8gID0gL15hdWRpb1xcLy9pLnRlc3QoZGF0YS50eXBlKTtcbiAgICBkYXRhLmlzSW1hZ2UgID0gL15pbWFnZVxcLy9pLnRlc3QoZGF0YS50eXBlKTtcbiAgICBkYXRhLmlzVGV4dCAgID0gL150ZXh0XFwvL2kudGVzdChkYXRhLnR5cGUpO1xuICAgIGRhdGEuaXNKU09OICAgPSAvXmFwcGxpY2F0aW9uXFwvanNvbiQvaS50ZXN0KGRhdGEudHlwZSk7XG4gICAgZGF0YS5pc1BERiAgICA9IC9eYXBwbGljYXRpb25cXC8oeC0pP3BkZiQvaS50ZXN0KGRhdGEudHlwZSk7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvbkNvcmVcbiAgICogQG5hbWUgX2RhdGFUb1NjaGVtYVxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZpbGUgZGF0YVxuICAgKiBAc3VtbWFyeSBJbnRlcm5hbCBtZXRob2QuIEJ1aWxkIG9iamVjdCBpbiBhY2NvcmRhbmNlIHdpdGggZGVmYXVsdCBzY2hlbWEgZnJvbSBGaWxlIGRhdGFcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIF9kYXRhVG9TY2hlbWEoZGF0YSkge1xuICAgIGNvbnN0IGRzID0ge1xuICAgICAgbmFtZTogZGF0YS5uYW1lLFxuICAgICAgZXh0ZW5zaW9uOiBkYXRhLmV4dGVuc2lvbixcbiAgICAgIGV4dDogZGF0YS5leHRlbnNpb24sXG4gICAgICBleHRlbnNpb25XaXRoRG90OiAnLicgKyBkYXRhLmV4dGVuc2lvbixcbiAgICAgIHBhdGg6IGRhdGEucGF0aCxcbiAgICAgIG1ldGE6IGRhdGEubWV0YSxcbiAgICAgIHR5cGU6IGRhdGEudHlwZSxcbiAgICAgIG1pbWU6IGRhdGEudHlwZSxcbiAgICAgICdtaW1lLXR5cGUnOiBkYXRhLnR5cGUsXG4gICAgICBzaXplOiBkYXRhLnNpemUsXG4gICAgICB1c2VySWQ6IGRhdGEudXNlcklkIHx8IG51bGwsXG4gICAgICB2ZXJzaW9uczoge1xuICAgICAgICBvcmlnaW5hbDoge1xuICAgICAgICAgIHBhdGg6IGRhdGEucGF0aCxcbiAgICAgICAgICBzaXplOiBkYXRhLnNpemUsXG4gICAgICAgICAgdHlwZTogZGF0YS50eXBlLFxuICAgICAgICAgIGV4dGVuc2lvbjogZGF0YS5leHRlbnNpb25cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIF9kb3dubG9hZFJvdXRlOiBkYXRhLl9kb3dubG9hZFJvdXRlIHx8IHRoaXMuZG93bmxvYWRSb3V0ZSxcbiAgICAgIF9jb2xsZWN0aW9uTmFtZTogZGF0YS5fY29sbGVjdGlvbk5hbWUgfHwgdGhpcy5jb2xsZWN0aW9uTmFtZVxuICAgIH07XG5cbiAgICAvL09wdGlvbmFsIGZpbGVJZFxuICAgIGlmIChkYXRhLmZpbGVJZCkge1xuICAgICAgZHMuX2lkID0gZGF0YS5maWxlSWQ7XG4gICAgfVxuXG4gICAgdGhpcy5fdXBkYXRlRmlsZVR5cGVzKGRzKTtcbiAgICBkcy5fc3RvcmFnZVBhdGggPSBkYXRhLl9zdG9yYWdlUGF0aCB8fCB0aGlzLnN0b3JhZ2VQYXRoKF8uZXh0ZW5kKGRhdGEsIGRzKSk7XG4gICAgcmV0dXJuIGRzO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25Db3JlXG4gICAqIEBuYW1lIGZpbmRPbmVcbiAgICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBzZWxlY3RvciAtIE1vbmdvLVN0eWxlIHNlbGVjdG9yIChodHRwOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI3NlbGVjdG9ycylcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBNb25nby1TdHlsZSBzZWxlY3RvciBPcHRpb25zIChodHRwOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI3NvcnRzcGVjaWZpZXJzKVxuICAgKiBAc3VtbWFyeSBGaW5kIGFuZCByZXR1cm4gQ3Vyc29yIGZvciBtYXRjaGluZyBkb2N1bWVudCBPYmplY3RcbiAgICogQHJldHVybnMge0ZpbGVDdXJzb3J9IEluc3RhbmNlXG4gICAqL1xuICBmaW5kT25lKHNlbGVjdG9yID0ge30sIG9wdGlvbnMpIHtcbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2ZpbmRPbmUoJHtKU09OLnN0cmluZ2lmeShzZWxlY3Rvcil9LCAke0pTT04uc3RyaW5naWZ5KG9wdGlvbnMpfSldYCk7XG4gICAgY2hlY2soc2VsZWN0b3IsIE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKE9iamVjdCwgU3RyaW5nLCBCb29sZWFuLCBOdW1iZXIsIG51bGwpKSk7XG4gICAgY2hlY2sob3B0aW9ucywgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG5cbiAgICBjb25zdCBkb2MgPSB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShzZWxlY3Rvciwgb3B0aW9ucyk7XG4gICAgaWYgKGRvYykge1xuICAgICAgcmV0dXJuIG5ldyBGaWxlQ3Vyc29yKGRvYywgdGhpcyk7XG4gICAgfVxuICAgIHJldHVybiBkb2M7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvbkNvcmVcbiAgICogQG5hbWUgZmluZFxuICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IHNlbGVjdG9yIC0gTW9uZ28tU3R5bGUgc2VsZWN0b3IgKGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjc2VsZWN0b3JzKVxuICAgKiBAcGFyYW0ge09iamVjdH0gICAgICAgIG9wdGlvbnMgIC0gTW9uZ28tU3R5bGUgc2VsZWN0b3IgT3B0aW9ucyAoaHR0cDovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNzb3J0c3BlY2lmaWVycylcbiAgICogQHN1bW1hcnkgRmluZCBhbmQgcmV0dXJuIEN1cnNvciBmb3IgbWF0Y2hpbmcgZG9jdW1lbnRzXG4gICAqIEByZXR1cm5zIHtGaWxlc0N1cnNvcn0gSW5zdGFuY2VcbiAgICovXG4gIGZpbmQoc2VsZWN0b3IgPSB7fSwgb3B0aW9ucykge1xuICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbZmluZCgke0pTT04uc3RyaW5naWZ5KHNlbGVjdG9yKX0sICR7SlNPTi5zdHJpbmdpZnkob3B0aW9ucyl9KV1gKTtcbiAgICBjaGVjayhzZWxlY3RvciwgTWF0Y2guT3B0aW9uYWwoTWF0Y2guT25lT2YoT2JqZWN0LCBTdHJpbmcsIEJvb2xlYW4sIE51bWJlciwgbnVsbCkpKTtcbiAgICBjaGVjayhvcHRpb25zLCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcblxuICAgIHJldHVybiBuZXcgRmlsZXNDdXJzb3Ioc2VsZWN0b3IsIG9wdGlvbnMsIHRoaXMpO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25Db3JlXG4gICAqIEBuYW1lIHVwZGF0ZVxuICAgKiBAc2VlIGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vIy9mdWxsL3VwZGF0ZVxuICAgKiBAc3VtbWFyeSBsaW5rIE1vbmdvLkNvbGxlY3Rpb24gdXBkYXRlIG1ldGhvZFxuICAgKiBAcmV0dXJucyB7TW9uZ28uQ29sbGVjdGlvbn0gSW5zdGFuY2VcbiAgICovXG4gIHVwZGF0ZSgpIHtcbiAgICB0aGlzLmNvbGxlY3Rpb24udXBkYXRlLmFwcGx5KHRoaXMuY29sbGVjdGlvbiwgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25Db3JlXG4gICAqIEBuYW1lIGxpbmtcbiAgICogQHBhcmFtIHtPYmplY3R9IGZpbGVSZWYgLSBGaWxlIHJlZmVyZW5jZSBvYmplY3RcbiAgICogQHBhcmFtIHtTdHJpbmd9IHZlcnNpb24gLSBWZXJzaW9uIG9mIGZpbGUgeW91IHdvdWxkIGxpa2UgdG8gcmVxdWVzdFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGRvd25sb2FkYWJsZSBVUkxcbiAgICogQHJldHVybnMge1N0cmluZ30gRW1wdHkgc3RyaW5nIHJldHVybmVkIGluIGNhc2UgaWYgZmlsZSBub3QgZm91bmQgaW4gREJcbiAgICovXG4gIGxpbmsoZmlsZVJlZiwgdmVyc2lvbiA9ICdvcmlnaW5hbCcpIHtcbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2xpbmsoJHsoXy5pc09iamVjdChmaWxlUmVmKSA/IGZpbGVSZWYuX2lkIDogdW5kZWZpbmVkKX0sICR7dmVyc2lvbn0pXWApO1xuICAgIGNoZWNrKGZpbGVSZWYsIE9iamVjdCk7XG4gICAgY2hlY2sodmVyc2lvbiwgU3RyaW5nKTtcblxuICAgIGlmICghZmlsZVJlZikge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgICByZXR1cm4gZm9ybWF0RmxlVVJMKGZpbGVSZWYsIHZlcnNpb24pO1xuICB9XG59XG4iLCJpbXBvcnQgeyBfIH0gICAgICBmcm9tICdtZXRlb3IvdW5kZXJzY29yZSc7XG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcblxuLypcbiAqIEBwcml2YXRlXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBjbGFzcyBGaWxlQ3Vyc29yXG4gKiBAcGFyYW0gX2ZpbGVSZWYgICAge09iamVjdH0gLSBNb25nby1TdHlsZSBzZWxlY3RvciAoaHR0cDovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNzZWxlY3RvcnMpXG4gKiBAcGFyYW0gX2NvbGxlY3Rpb24ge0ZpbGVzQ29sbGVjdGlvbn0gLSBGaWxlc0NvbGxlY3Rpb24gSW5zdGFuY2VcbiAqIEBzdW1tYXJ5IEludGVybmFsIGNsYXNzLCByZXByZXNlbnRzIGVhY2ggcmVjb3JkIGluIGBGaWxlc0N1cnNvci5lYWNoKClgIG9yIGRvY3VtZW50IHJldHVybmVkIGZyb20gYC5maW5kT25lKClgIG1ldGhvZFxuICovXG5leHBvcnQgY2xhc3MgRmlsZUN1cnNvciB7XG4gIGNvbnN0cnVjdG9yKF9maWxlUmVmLCBfY29sbGVjdGlvbikge1xuICAgIHRoaXMuX2ZpbGVSZWYgICAgPSBfZmlsZVJlZjtcbiAgICB0aGlzLl9jb2xsZWN0aW9uID0gX2NvbGxlY3Rpb247XG4gICAgXy5leHRlbmQodGhpcywgX2ZpbGVSZWYpO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlQ3Vyc29yXG4gICAqIEBuYW1lIHJlbW92ZVxuICAgKiBAcGFyYW0gY2FsbGJhY2sge0Z1bmN0aW9ufSAtIFRyaWdnZXJlZCBhc3luY2hyb25vdXNseSBhZnRlciBpdGVtIGlzIHJlbW92ZWQgb3IgZmFpbGVkIHRvIGJlIHJlbW92ZWRcbiAgICogQHN1bW1hcnkgUmVtb3ZlIGRvY3VtZW50XG4gICAqIEByZXR1cm5zIHtGaWxlQ3Vyc29yfVxuICAgKi9cbiAgcmVtb3ZlKGNhbGxiYWNrKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlQ3Vyc29yXSBbcmVtb3ZlKCldJyk7XG4gICAgaWYgKHRoaXMuX2ZpbGVSZWYpIHtcbiAgICAgIHRoaXMuX2NvbGxlY3Rpb24ucmVtb3ZlKHRoaXMuX2ZpbGVSZWYuX2lkLCBjYWxsYmFjayk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKG5ldyBNZXRlb3IuRXJyb3IoNDA0LCAnTm8gc3VjaCBmaWxlJykpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZUN1cnNvclxuICAgKiBAbmFtZSBsaW5rXG4gICAqIEBwYXJhbSB2ZXJzaW9uIHtTdHJpbmd9IC0gTmFtZSBvZiBmaWxlJ3Mgc3VidmVyc2lvblxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGRvd25sb2FkYWJsZSBVUkwgdG8gRmlsZVxuICAgKiBAcmV0dXJucyB7U3RyaW5nfVxuICAgKi9cbiAgbGluayh2ZXJzaW9uID0gJ29yaWdpbmFsJykge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZUN1cnNvcl0gW2xpbmsoJHt2ZXJzaW9ufSldYCk7XG4gICAgaWYgKHRoaXMuX2ZpbGVSZWYpIHtcbiAgICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9uLmxpbmsodGhpcy5fZmlsZVJlZiwgdmVyc2lvbik7XG4gICAgfVxuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZUN1cnNvclxuICAgKiBAbmFtZSBnZXRcbiAgICogQHBhcmFtIHByb3BlcnR5IHtTdHJpbmd9IC0gTmFtZSBvZiBzdWItb2JqZWN0IHByb3BlcnR5XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgY3VycmVudCBkb2N1bWVudCBhcyBhIHBsYWluIE9iamVjdCwgaWYgYHByb3BlcnR5YCBpcyBzcGVjaWZpZWQgLSByZXR1cm5zIHZhbHVlIG9mIHN1Yi1vYmplY3QgcHJvcGVydHlcbiAgICogQHJldHVybnMge09iamVjdHxtaXh9XG4gICAqL1xuICBnZXQocHJvcGVydHkpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVDdXJzb3JdIFtnZXQoJHtwcm9wZXJ0eX0pXWApO1xuICAgIGlmIChwcm9wZXJ0eSkge1xuICAgICAgcmV0dXJuIHRoaXMuX2ZpbGVSZWZbcHJvcGVydHldO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZmlsZVJlZjtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZUN1cnNvclxuICAgKiBAbmFtZSBmZXRjaFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGRvY3VtZW50IGFzIHBsYWluIE9iamVjdCBpbiBBcnJheVxuICAgKiBAcmV0dXJucyB7W09iamVjdF19XG4gICAqL1xuICBmZXRjaCgpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVDdXJzb3JdIFtmZXRjaCgpXScpO1xuICAgIHJldHVybiBbdGhpcy5fZmlsZVJlZl07XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVDdXJzb3JcbiAgICogQG5hbWUgd2l0aFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIHJlYWN0aXZlIHZlcnNpb24gb2YgY3VycmVudCBGaWxlQ3Vyc29yLCB1c2VmdWwgdG8gdXNlIHdpdGggYHt7I3dpdGh9fS4uLnt7L3dpdGh9fWAgYmxvY2sgdGVtcGxhdGUgaGVscGVyXG4gICAqIEByZXR1cm5zIHtbT2JqZWN0XX1cbiAgICovXG4gIHdpdGgoKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlQ3Vyc29yXSBbd2l0aCgpXScpO1xuICAgIHJldHVybiBfLmV4dGVuZCh0aGlzLCB0aGlzLl9jb2xsZWN0aW9uLmNvbGxlY3Rpb24uZmluZE9uZSh0aGlzLl9maWxlUmVmLl9pZCkpO1xuICB9XG59XG5cbi8qXG4gKiBAcHJpdmF0ZVxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAY2xhc3MgRmlsZXNDdXJzb3JcbiAqIEBwYXJhbSBfc2VsZWN0b3IgICB7U3RyaW5nfE9iamVjdH0gICAtIE1vbmdvLVN0eWxlIHNlbGVjdG9yIChodHRwOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI3NlbGVjdG9ycylcbiAqIEBwYXJhbSBvcHRpb25zICAgICB7T2JqZWN0fSAgICAgICAgICAtIE1vbmdvLVN0eWxlIHNlbGVjdG9yIE9wdGlvbnMgKGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjc2VsZWN0b3JzKVxuICogQHBhcmFtIF9jb2xsZWN0aW9uIHtGaWxlc0NvbGxlY3Rpb259IC0gRmlsZXNDb2xsZWN0aW9uIEluc3RhbmNlXG4gKiBAc3VtbWFyeSBJbXBsZW1lbnRhdGlvbiBvZiBDdXJzb3IgZm9yIEZpbGVzQ29sbGVjdGlvblxuICovXG5leHBvcnQgY2xhc3MgRmlsZXNDdXJzb3Ige1xuICBjb25zdHJ1Y3Rvcihfc2VsZWN0b3IgPSB7fSwgb3B0aW9ucywgX2NvbGxlY3Rpb24pIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uID0gX2NvbGxlY3Rpb247XG4gICAgdGhpcy5fc2VsZWN0b3IgICA9IF9zZWxlY3RvcjtcbiAgICB0aGlzLl9jdXJyZW50ICAgID0gLTE7XG4gICAgdGhpcy5jdXJzb3IgICAgICA9IHRoaXMuX2NvbGxlY3Rpb24uY29sbGVjdGlvbi5maW5kKHRoaXMuX3NlbGVjdG9yLCBvcHRpb25zKTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgZ2V0XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgYWxsIG1hdGNoaW5nIGRvY3VtZW50KHMpIGFzIGFuIEFycmF5LiBBbGlhcyBvZiBgLmZldGNoKClgXG4gICAqIEByZXR1cm5zIHtbT2JqZWN0XX1cbiAgICovXG4gIGdldCgpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbZ2V0KCldJyk7XG4gICAgcmV0dXJuIHRoaXMuY3Vyc29yLmZldGNoKCk7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIGhhc05leHRcbiAgICogQHN1bW1hcnkgUmV0dXJucyBgdHJ1ZWAgaWYgdGhlcmUgaXMgbmV4dCBpdGVtIGF2YWlsYWJsZSBvbiBDdXJzb3JcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBoYXNOZXh0KCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtoYXNOZXh0KCldJyk7XG4gICAgcmV0dXJuIHRoaXMuX2N1cnJlbnQgPCAodGhpcy5jdXJzb3IuY291bnQoKSAtIDEpO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBuZXh0XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgbmV4dCBpdGVtIG9uIEN1cnNvciwgaWYgYXZhaWxhYmxlXG4gICAqIEByZXR1cm5zIHtPYmplY3R8dW5kZWZpbmVkfVxuICAgKi9cbiAgbmV4dCgpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbbmV4dCgpXScpO1xuICAgIHRoaXMuY3Vyc29yLmZldGNoKClbKyt0aGlzLl9jdXJyZW50XTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgaGFzUHJldmlvdXNcbiAgICogQHN1bW1hcnkgUmV0dXJucyBgdHJ1ZWAgaWYgdGhlcmUgaXMgcHJldmlvdXMgaXRlbSBhdmFpbGFibGUgb24gQ3Vyc29yXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaGFzUHJldmlvdXMoKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW2hhc1ByZXZpb3VzKCldJyk7XG4gICAgcmV0dXJuIHRoaXMuX2N1cnJlbnQgIT09IC0xO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBwcmV2aW91c1xuICAgKiBAc3VtbWFyeSBSZXR1cm5zIHByZXZpb3VzIGl0ZW0gb24gQ3Vyc29yLCBpZiBhdmFpbGFibGVcbiAgICogQHJldHVybnMge09iamVjdHx1bmRlZmluZWR9XG4gICAqL1xuICBwcmV2aW91cygpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbcHJldmlvdXMoKV0nKTtcbiAgICB0aGlzLmN1cnNvci5mZXRjaCgpWy0tdGhpcy5fY3VycmVudF07XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIGZldGNoXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgYWxsIG1hdGNoaW5nIGRvY3VtZW50KHMpIGFzIGFuIEFycmF5LlxuICAgKiBAcmV0dXJucyB7W09iamVjdF19XG4gICAqL1xuICBmZXRjaCgpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbZmV0Y2goKV0nKTtcbiAgICByZXR1cm4gdGhpcy5jdXJzb3IuZmV0Y2goKSB8fCBbXTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgZmlyc3RcbiAgICogQHN1bW1hcnkgUmV0dXJucyBmaXJzdCBpdGVtIG9uIEN1cnNvciwgaWYgYXZhaWxhYmxlXG4gICAqIEByZXR1cm5zIHtPYmplY3R8dW5kZWZpbmVkfVxuICAgKi9cbiAgZmlyc3QoKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW2ZpcnN0KCldJyk7XG4gICAgdGhpcy5fY3VycmVudCA9IDA7XG4gICAgcmV0dXJuIHRoaXMuZmV0Y2goKVt0aGlzLl9jdXJyZW50XTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgbGFzdFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGxhc3QgaXRlbSBvbiBDdXJzb3IsIGlmIGF2YWlsYWJsZVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fHVuZGVmaW5lZH1cbiAgICovXG4gIGxhc3QoKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW2xhc3QoKV0nKTtcbiAgICB0aGlzLl9jdXJyZW50ID0gdGhpcy5jb3VudCgpIC0gMTtcbiAgICByZXR1cm4gdGhpcy5mZXRjaCgpW3RoaXMuX2N1cnJlbnRdO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBjb3VudFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIHRoZSBudW1iZXIgb2YgZG9jdW1lbnRzIHRoYXQgbWF0Y2ggYSBxdWVyeVxuICAgKiBAcmV0dXJucyB7TnVtYmVyfVxuICAgKi9cbiAgY291bnQoKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW2NvdW50KCldJyk7XG4gICAgcmV0dXJuIHRoaXMuY3Vyc29yLmNvdW50KCk7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIHJlbW92ZVxuICAgKiBAcGFyYW0gY2FsbGJhY2sge0Z1bmN0aW9ufSAtIFRyaWdnZXJlZCBhc3luY2hyb25vdXNseSBhZnRlciBpdGVtIGlzIHJlbW92ZWQgb3IgZmFpbGVkIHRvIGJlIHJlbW92ZWRcbiAgICogQHN1bW1hcnkgUmVtb3ZlcyBhbGwgZG9jdW1lbnRzIHRoYXQgbWF0Y2ggYSBxdWVyeVxuICAgKiBAcmV0dXJucyB7RmlsZXNDdXJzb3J9XG4gICAqL1xuICByZW1vdmUoY2FsbGJhY2spIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbcmVtb3ZlKCldJyk7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5yZW1vdmUodGhpcy5fc2VsZWN0b3IsIGNhbGxiYWNrKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgZm9yRWFjaFxuICAgKiBAcGFyYW0gY2FsbGJhY2sge0Z1bmN0aW9ufSAtIEZ1bmN0aW9uIHRvIGNhbGwuIEl0IHdpbGwgYmUgY2FsbGVkIHdpdGggdGhyZWUgYXJndW1lbnRzOiB0aGUgYGZpbGVgLCBhIDAtYmFzZWQgaW5kZXgsIGFuZCBjdXJzb3IgaXRzZWxmXG4gICAqIEBwYXJhbSBjb250ZXh0IHtPYmplY3R9IC0gQW4gb2JqZWN0IHdoaWNoIHdpbGwgYmUgdGhlIHZhbHVlIG9mIGB0aGlzYCBpbnNpZGUgYGNhbGxiYWNrYFxuICAgKiBAc3VtbWFyeSBDYWxsIGBjYWxsYmFja2Agb25jZSBmb3IgZWFjaCBtYXRjaGluZyBkb2N1bWVudCwgc2VxdWVudGlhbGx5IGFuZCBzeW5jaHJvbm91c2x5LlxuICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgKi9cbiAgZm9yRWFjaChjYWxsYmFjaywgY29udGV4dCA9IHt9KSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW2ZvckVhY2goKV0nKTtcbiAgICB0aGlzLmN1cnNvci5mb3JFYWNoKGNhbGxiYWNrLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgZWFjaFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGFuIEFycmF5IG9mIEZpbGVDdXJzb3IgbWFkZSBmb3IgZWFjaCBkb2N1bWVudCBvbiBjdXJyZW50IGN1cnNvclxuICAgKiAgICAgICAgICBVc2VmdWwgd2hlbiB1c2luZyBpbiB7eyNlYWNoIEZpbGVzQ3Vyc29yI2VhY2h9fS4uLnt7L2VhY2h9fSBibG9jayB0ZW1wbGF0ZSBoZWxwZXJcbiAgICogQHJldHVybnMge1tGaWxlQ3Vyc29yXX1cbiAgICovXG4gIGVhY2goKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwKChmaWxlKSA9PiB7XG4gICAgICByZXR1cm4gbmV3IEZpbGVDdXJzb3IoZmlsZSwgdGhpcy5fY29sbGVjdGlvbik7XG4gICAgfSk7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIG1hcFxuICAgKiBAcGFyYW0gY2FsbGJhY2sge0Z1bmN0aW9ufSAtIEZ1bmN0aW9uIHRvIGNhbGwuIEl0IHdpbGwgYmUgY2FsbGVkIHdpdGggdGhyZWUgYXJndW1lbnRzOiB0aGUgYGZpbGVgLCBhIDAtYmFzZWQgaW5kZXgsIGFuZCBjdXJzb3IgaXRzZWxmXG4gICAqIEBwYXJhbSBjb250ZXh0IHtPYmplY3R9IC0gQW4gb2JqZWN0IHdoaWNoIHdpbGwgYmUgdGhlIHZhbHVlIG9mIGB0aGlzYCBpbnNpZGUgYGNhbGxiYWNrYFxuICAgKiBAc3VtbWFyeSBNYXAgYGNhbGxiYWNrYCBvdmVyIGFsbCBtYXRjaGluZyBkb2N1bWVudHMuIFJldHVybnMgYW4gQXJyYXkuXG4gICAqIEByZXR1cm5zIHtBcnJheX1cbiAgICovXG4gIG1hcChjYWxsYmFjaywgY29udGV4dCA9IHt9KSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW21hcCgpXScpO1xuICAgIHJldHVybiB0aGlzLmN1cnNvci5tYXAoY2FsbGJhY2ssIGNvbnRleHQpO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBjdXJyZW50XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgY3VycmVudCBpdGVtIG9uIEN1cnNvciwgaWYgYXZhaWxhYmxlXG4gICAqIEByZXR1cm5zIHtPYmplY3R8dW5kZWZpbmVkfVxuICAgKi9cbiAgY3VycmVudCgpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbY3VycmVudCgpXScpO1xuICAgIGlmICh0aGlzLl9jdXJyZW50IDwgMCkge1xuICAgICAgdGhpcy5fY3VycmVudCA9IDA7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZldGNoKClbdGhpcy5fY3VycmVudF07XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIG9ic2VydmVcbiAgICogQHBhcmFtIGNhbGxiYWNrcyB7T2JqZWN0fSAtIEZ1bmN0aW9ucyB0byBjYWxsIHRvIGRlbGl2ZXIgdGhlIHJlc3VsdCBzZXQgYXMgaXQgY2hhbmdlc1xuICAgKiBAc3VtbWFyeSBXYXRjaCBhIHF1ZXJ5LiBSZWNlaXZlIGNhbGxiYWNrcyBhcyB0aGUgcmVzdWx0IHNldCBjaGFuZ2VzLlxuICAgKiBAdXJsIGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjTW9uZ28tQ3Vyc29yLW9ic2VydmVcbiAgICogQHJldHVybnMge09iamVjdH0gLSBsaXZlIHF1ZXJ5IGhhbmRsZVxuICAgKi9cbiAgb2JzZXJ2ZShjYWxsYmFja3MpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbb2JzZXJ2ZSgpXScpO1xuICAgIHJldHVybiB0aGlzLmN1cnNvci5vYnNlcnZlKGNhbGxiYWNrcyk7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIG9ic2VydmVDaGFuZ2VzXG4gICAqIEBwYXJhbSBjYWxsYmFja3Mge09iamVjdH0gLSBGdW5jdGlvbnMgdG8gY2FsbCB0byBkZWxpdmVyIHRoZSByZXN1bHQgc2V0IGFzIGl0IGNoYW5nZXNcbiAgICogQHN1bW1hcnkgV2F0Y2ggYSBxdWVyeS4gUmVjZWl2ZSBjYWxsYmFja3MgYXMgdGhlIHJlc3VsdCBzZXQgY2hhbmdlcy4gT25seSB0aGUgZGlmZmVyZW5jZXMgYmV0d2VlbiB0aGUgb2xkIGFuZCBuZXcgZG9jdW1lbnRzIGFyZSBwYXNzZWQgdG8gdGhlIGNhbGxiYWNrcy5cbiAgICogQHVybCBodHRwOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI01vbmdvLUN1cnNvci1vYnNlcnZlQ2hhbmdlc1xuICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIGxpdmUgcXVlcnkgaGFuZGxlXG4gICAqL1xuICBvYnNlcnZlQ2hhbmdlcyhjYWxsYmFja3MpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbb2JzZXJ2ZUNoYW5nZXMoKV0nKTtcbiAgICByZXR1cm4gdGhpcy5jdXJzb3Iub2JzZXJ2ZUNoYW5nZXMoY2FsbGJhY2tzKTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgXyB9ICAgICBmcm9tICdtZXRlb3IvdW5kZXJzY29yZSc7XG5pbXBvcnQgeyBjaGVjayB9IGZyb20gJ21ldGVvci9jaGVjayc7XG5cbi8qXG4gKiBAY29uc3Qge0Z1bmN0aW9ufSBmaXhKU09OUGFyc2UgLSBGaXggaXNzdWUgd2l0aCBEYXRlIHBhcnNlXG4gKi9cbmNvbnN0IGZpeEpTT05QYXJzZSA9IGZ1bmN0aW9uKG9iaikge1xuICBmb3IgKGxldCBrZXkgaW4gb2JqKSB7XG4gICAgaWYgKF8uaXNTdHJpbmcob2JqW2tleV0pICYmICEhfm9ialtrZXldLmluZGV4T2YoJz0tLUpTT04tREFURS0tPScpKSB7XG4gICAgICBvYmpba2V5XSA9IG9ialtrZXldLnJlcGxhY2UoJz0tLUpTT04tREFURS0tPScsICcnKTtcbiAgICAgIG9ialtrZXldID0gbmV3IERhdGUocGFyc2VJbnQob2JqW2tleV0pKTtcbiAgICB9IGVsc2UgaWYgKF8uaXNPYmplY3Qob2JqW2tleV0pKSB7XG4gICAgICBvYmpba2V5XSA9IGZpeEpTT05QYXJzZShvYmpba2V5XSk7XG4gICAgfSBlbHNlIGlmIChfLmlzQXJyYXkob2JqW2tleV0pKSB7XG4gICAgICBsZXQgdjtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb2JqW2tleV0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdiA9IG9ialtrZXldW2ldO1xuICAgICAgICBpZiAoXy5pc09iamVjdCh2KSkge1xuICAgICAgICAgIG9ialtrZXldW2ldID0gZml4SlNPTlBhcnNlKHYpO1xuICAgICAgICB9IGVsc2UgaWYgKF8uaXNTdHJpbmcodikgJiYgISF+di5pbmRleE9mKCc9LS1KU09OLURBVEUtLT0nKSkge1xuICAgICAgICAgIHYgPSB2LnJlcGxhY2UoJz0tLUpTT04tREFURS0tPScsICcnKTtcbiAgICAgICAgICBvYmpba2V5XVtpXSA9IG5ldyBEYXRlKHBhcnNlSW50KHYpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gb2JqO1xufTtcblxuLypcbiAqIEBjb25zdCB7RnVuY3Rpb259IGZpeEpTT05TdHJpbmdpZnkgLSBGaXggaXNzdWUgd2l0aCBEYXRlIHN0cmluZ2lmeVxuICovXG5jb25zdCBmaXhKU09OU3RyaW5naWZ5ID0gZnVuY3Rpb24ob2JqKSB7XG4gIGZvciAobGV0IGtleSBpbiBvYmopIHtcbiAgICBpZiAoXy5pc0RhdGUob2JqW2tleV0pKSB7XG4gICAgICBvYmpba2V5XSA9IGA9LS1KU09OLURBVEUtLT0keytvYmpba2V5XX1gO1xuICAgIH0gZWxzZSBpZiAoXy5pc09iamVjdChvYmpba2V5XSkpIHtcbiAgICAgIG9ialtrZXldID0gZml4SlNPTlN0cmluZ2lmeShvYmpba2V5XSk7XG4gICAgfSBlbHNlIGlmIChfLmlzQXJyYXkob2JqW2tleV0pKSB7XG4gICAgICBsZXQgdjtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb2JqW2tleV0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdiA9IG9ialtrZXldW2ldO1xuICAgICAgICBpZiAoXy5pc09iamVjdCh2KSkge1xuICAgICAgICAgIG9ialtrZXldW2ldID0gZml4SlNPTlN0cmluZ2lmeSh2KTtcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzRGF0ZSh2KSkge1xuICAgICAgICAgIG9ialtrZXldW2ldID0gYD0tLUpTT04tREFURS0tPSR7K3Z9YDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gb2JqO1xufTtcblxuLypcbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQHByaXZhdGVcbiAqIEBuYW1lIGZvcm1hdEZsZVVSTFxuICogQHBhcmFtIHtPYmplY3R9IGZpbGVSZWYgLSBGaWxlIHJlZmVyZW5jZSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSB2ZXJzaW9uIC0gW09wdGlvbmFsXSBWZXJzaW9uIG9mIGZpbGUgeW91IHdvdWxkIGxpa2UgYnVpbGQgVVJMIGZvclxuICogQHN1bW1hcnkgUmV0dXJucyBmb3JtYXR0ZWQgVVJMIGZvciBmaWxlXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBEb3dubG9hZGFibGUgbGlua1xuICovXG5jb25zdCBmb3JtYXRGbGVVUkwgPSAoZmlsZVJlZiwgdmVyc2lvbiA9ICdvcmlnaW5hbCcpID0+IHtcbiAgbGV0IGV4dDtcbiAgY2hlY2soZmlsZVJlZiwgT2JqZWN0KTtcbiAgY2hlY2sodmVyc2lvbiwgU3RyaW5nKTtcblxuICBjb25zdCBfcm9vdCA9IF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkwucmVwbGFjZSgvXFwvKyQvLCAnJyk7XG4gIGNvbnN0IHZSZWYgPSAoZmlsZVJlZi52ZXJzaW9ucyAmJiBmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dKSB8fCBmaWxlUmVmIHx8IHt9O1xuXG4gIGlmIChfLmlzU3RyaW5nKHZSZWYuZXh0ZW5zaW9uKSkge1xuICAgIGV4dCA9IGAuJHt2UmVmLmV4dGVuc2lvbi5yZXBsYWNlKC9eXFwuLywgJycpfWA7XG4gIH0gZWxzZSB7XG4gICAgZXh0ID0gJyc7XG4gIH1cblxuICBpZiAoZmlsZVJlZi5wdWJsaWMgPT09IHRydWUpIHtcbiAgICByZXR1cm4gX3Jvb3QgKyAodmVyc2lvbiA9PT0gJ29yaWdpbmFsJyA/IGAke2ZpbGVSZWYuX2Rvd25sb2FkUm91dGV9LyR7ZmlsZVJlZi5faWR9JHtleHR9YCA6IGAke2ZpbGVSZWYuX2Rvd25sb2FkUm91dGV9LyR7dmVyc2lvbn0tJHtmaWxlUmVmLl9pZH0ke2V4dH1gKTtcbiAgfVxuICByZXR1cm4gX3Jvb3QgKyBgJHtmaWxlUmVmLl9kb3dubG9hZFJvdXRlfS8ke2ZpbGVSZWYuX2NvbGxlY3Rpb25OYW1lfS8ke2ZpbGVSZWYuX2lkfS8ke3ZlcnNpb259LyR7ZmlsZVJlZi5faWR9JHtleHR9YDtcbn07XG5cbmV4cG9ydCB7IGZpeEpTT05QYXJzZSwgZml4SlNPTlN0cmluZ2lmeSwgZm9ybWF0RmxlVVJMIH07XG4iLCJpbXBvcnQgZnMgICAgICAgICBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgeyBfIH0gICAgICBmcm9tICdtZXRlb3IvdW5kZXJzY29yZSc7XG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmNvbnN0IE5PT1AgPSAoKSA9PiB7fTtcblxuLypcbiAqIEBjb25zdCB7T2JqZWN0fSBib3VuZCAgIC0gTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCAoRmliZXIgd3JhcHBlcilcbiAqIEBjb25zdCB7T2JqZWN0fSBmZENhY2hlIC0gRmlsZSBEZXNjcmlwdG9ycyBDYWNoZVxuICovXG5jb25zdCBib3VuZCAgID0gTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChjYWxsYmFjayA9PiBjYWxsYmFjaygpKTtcbmNvbnN0IGZkQ2FjaGUgPSB7fTtcblxuLypcbiAqIEBwcml2YXRlXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAY2xhc3MgV3JpdGVTdHJlYW1cbiAqIEBwYXJhbSBwYXRoICAgICAge1N0cmluZ30gLSBQYXRoIHRvIGZpbGUgb24gRlNcbiAqIEBwYXJhbSBtYXhMZW5ndGgge051bWJlcn0gLSBNYXggYW1vdW50IG9mIGNodW5rcyBpbiBzdHJlYW1cbiAqIEBwYXJhbSBmaWxlICAgICAge09iamVjdH0gLSBmaWxlUmVmIE9iamVjdFxuICogQHN1bW1hcnkgd3JpdGFibGVTdHJlYW0gd3JhcHBlciBjbGFzcywgbWFrZXMgc3VyZSBjaHVua3MgaXMgd3JpdHRlbiBpbiBnaXZlbiBvcmRlci4gSW1wbGVtZW50YXRpb24gb2YgcXVldWUgc3RyZWFtLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBXcml0ZVN0cmVhbSB7XG4gIGNvbnN0cnVjdG9yKHBhdGgsIG1heExlbmd0aCwgZmlsZSwgcGVybWlzc2lvbnMpIHtcbiAgICB0aGlzLnBhdGggPSBwYXRoO1xuICAgIHRoaXMubWF4TGVuZ3RoID0gbWF4TGVuZ3RoO1xuICAgIHRoaXMuZmlsZSA9IGZpbGU7XG4gICAgdGhpcy5wZXJtaXNzaW9ucyA9IHBlcm1pc3Npb25zO1xuICAgIGlmICghdGhpcy5wYXRoIHx8ICFfLmlzU3RyaW5nKHRoaXMucGF0aCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmZkICAgICAgICAgICAgPSBudWxsO1xuICAgIHRoaXMud3JpdHRlbkNodW5rcyA9IDA7XG4gICAgdGhpcy5lbmRlZCAgICAgICAgID0gZmFsc2U7XG4gICAgdGhpcy5hYm9ydGVkICAgICAgID0gZmFsc2U7XG5cbiAgICBpZiAoZmRDYWNoZVt0aGlzLnBhdGhdICYmICFmZENhY2hlW3RoaXMucGF0aF0uZW5kZWQgJiYgIWZkQ2FjaGVbdGhpcy5wYXRoXS5hYm9ydGVkKSB7XG4gICAgICB0aGlzLmZkID0gZmRDYWNoZVt0aGlzLnBhdGhdLmZkO1xuICAgICAgdGhpcy53cml0dGVuQ2h1bmtzID0gZmRDYWNoZVt0aGlzLnBhdGhdLndyaXR0ZW5DaHVua3M7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZzLmVuc3VyZUZpbGUodGhpcy5wYXRoLCAoZWZFcnJvcikgPT4ge1xuICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgaWYgKGVmRXJyb3IpIHtcbiAgICAgICAgICAgIHRoaXMuYWJvcnQoKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNTAwLCAnW0ZpbGVzQ29sbGVjdGlvbl0gW3dyaXRlU3RyZWFtXSBbZW5zdXJlRmlsZV0gW0Vycm9yOl0gJyArIGVmRXJyb3IpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcy5vcGVuKHRoaXMucGF0aCwgJ3IrJywgdGhpcy5wZXJtaXNzaW9ucywgKG9FcnJvciwgZmQpID0+IHtcbiAgICAgICAgICAgICAgYm91bmQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChvRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMuYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNTAwLCAnW0ZpbGVzQ29sbGVjdGlvbl0gW3dyaXRlU3RyZWFtXSBbZW5zdXJlRmlsZV0gW29wZW5dIFtFcnJvcjpdICcgKyBvRXJyb3IpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLmZkID0gZmQ7XG4gICAgICAgICAgICAgICAgICBmZENhY2hlW3RoaXMucGF0aF0gPSB0aGlzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLypcbiAgICogQG1lbWJlck9mIHdyaXRlU3RyZWFtXG4gICAqIEBuYW1lIHdyaXRlXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBudW0gLSBDaHVuayBwb3NpdGlvbiBpbiBhIHN0cmVhbVxuICAgKiBAcGFyYW0ge0J1ZmZlcn0gY2h1bmsgLSBCdWZmZXIgKGNodW5rIGJpbmFyeSBkYXRhKVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrXG4gICAqIEBzdW1tYXJ5IFdyaXRlIGNodW5rIGluIGdpdmVuIG9yZGVyXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSAtIFRydWUgaWYgY2h1bmsgaXMgc2VudCB0byBzdHJlYW0sIGZhbHNlIGlmIGNodW5rIGlzIHNldCBpbnRvIHF1ZXVlXG4gICAqL1xuICB3cml0ZShudW0sIGNodW5rLCBjYWxsYmFjaykge1xuICAgIGlmICghdGhpcy5hYm9ydGVkICYmICF0aGlzLmVuZGVkKSB7XG4gICAgICBpZiAodGhpcy5mZCkge1xuICAgICAgICBmcy53cml0ZSh0aGlzLmZkLCBjaHVuaywgMCwgY2h1bmsubGVuZ3RoLCAobnVtIC0gMSkgKiB0aGlzLmZpbGUuY2h1bmtTaXplLCAoZXJyb3IsIHdyaXR0ZW4sIGJ1ZmZlcikgPT4ge1xuICAgICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKGVycm9yLCB3cml0dGVuLCBidWZmZXIpO1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUud2FybignW0ZpbGVzQ29sbGVjdGlvbl0gW3dyaXRlU3RyZWFtXSBbd3JpdGVdIFtFcnJvcjpdJywgZXJyb3IpO1xuICAgICAgICAgICAgICB0aGlzLmFib3J0KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICArK3RoaXMud3JpdHRlbkNodW5rcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBNZXRlb3Iuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy53cml0ZShudW0sIGNodW5rLCBjYWxsYmFjayk7XG4gICAgICAgIH0sIDI1KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLypcbiAgICogQG1lbWJlck9mIHdyaXRlU3RyZWFtXG4gICAqIEBuYW1lIGVuZFxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrXG4gICAqIEBzdW1tYXJ5IEZpbmlzaGVzIHdyaXRpbmcgdG8gd3JpdGFibGVTdHJlYW0sIG9ubHkgYWZ0ZXIgYWxsIGNodW5rcyBpbiBxdWV1ZSBpcyB3cml0dGVuXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSAtIFRydWUgaWYgc3RyZWFtIGlzIGZ1bGZpbGxlZCwgZmFsc2UgaWYgcXVldWUgaXMgaW4gcHJvZ3Jlc3NcbiAgICovXG4gIGVuZChjYWxsYmFjaykge1xuICAgIGlmICghdGhpcy5hYm9ydGVkICYmICF0aGlzLmVuZGVkKSB7XG4gICAgICBpZiAodGhpcy53cml0dGVuQ2h1bmtzID09PSB0aGlzLm1heExlbmd0aCkge1xuICAgICAgICBmcy5jbG9zZSh0aGlzLmZkLCAoKSA9PiB7XG4gICAgICAgICAgYm91bmQoKCkgPT4ge1xuICAgICAgICAgICAgZGVsZXRlIGZkQ2FjaGVbdGhpcy5wYXRoXTtcbiAgICAgICAgICAgIHRoaXMuZW5kZWQgPSB0cnVlO1xuICAgICAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2sodm9pZCAwLCB0cnVlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICBmcy5zdGF0KHRoaXMucGF0aCwgKGVycm9yLCBzdGF0KSA9PiB7XG4gICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICBpZiAoIWVycm9yICYmIHN0YXQpIHtcbiAgICAgICAgICAgIHRoaXMud3JpdHRlbkNodW5rcyA9IE1hdGguY2VpbChzdGF0LnNpemUgLyB0aGlzLmZpbGUuY2h1bmtTaXplKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gTWV0ZW9yLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5lbmQoY2FsbGJhY2spO1xuICAgICAgICAgIH0sIDI1KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2sodm9pZCAwLCB0aGlzLmVuZGVkKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLypcbiAgICogQG1lbWJlck9mIHdyaXRlU3RyZWFtXG4gICAqIEBuYW1lIGFib3J0XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2tcbiAgICogQHN1bW1hcnkgQWJvcnRzIHdyaXRpbmcgdG8gd3JpdGFibGVTdHJlYW0sIHJlbW92ZXMgY3JlYXRlZCBmaWxlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSAtIFRydWVcbiAgICovXG4gIGFib3J0KGNhbGxiYWNrKSB7XG4gICAgdGhpcy5hYm9ydGVkID0gdHJ1ZTtcbiAgICBkZWxldGUgZmRDYWNoZVt0aGlzLnBhdGhdO1xuICAgIGZzLnVubGluayh0aGlzLnBhdGgsIChjYWxsYmFjayB8fCBOT09QKSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKlxuICAgKiBAbWVtYmVyT2Ygd3JpdGVTdHJlYW1cbiAgICogQG5hbWUgc3RvcFxuICAgKiBAc3VtbWFyeSBTdG9wIHdyaXRpbmcgdG8gd3JpdGFibGVTdHJlYW1cbiAgICogQHJldHVybnMge0Jvb2xlYW59IC0gVHJ1ZVxuICAgKi9cbiAgc3RvcCgpIHtcbiAgICB0aGlzLmFib3J0ZWQgPSB0cnVlO1xuICAgIGRlbGV0ZSBmZENhY2hlW3RoaXMucGF0aF07XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cbiJdfQ==
