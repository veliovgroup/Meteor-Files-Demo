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

    if (!this.disableUpload && !this.disableDownload) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZpbGVzL3NlcnZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZpbGVzL2NvcmUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL29zdHJpbzpmaWxlcy9jdXJzb3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL29zdHJpbzpmaWxlcy9saWIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL29zdHJpbzpmaWxlcy93cml0ZS1zdHJlYW0uanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiRmlsZXNDb2xsZWN0aW9uIiwiXyIsIndhdGNoIiwicmVxdWlyZSIsInYiLCJNb25nbyIsIldlYkFwcCIsIk1ldGVvciIsIlJhbmRvbSIsIkNvb2tpZXMiLCJXcml0ZVN0cmVhbSIsImRlZmF1bHQiLCJjaGVjayIsIk1hdGNoIiwiRmlsZXNDb2xsZWN0aW9uQ29yZSIsImZpeEpTT05QYXJzZSIsImZpeEpTT05TdHJpbmdpZnkiLCJmcyIsIm5vZGVRcyIsInJlcXVlc3QiLCJmaWxlVHlwZSIsIm5vZGVQYXRoIiwiYm91bmQiLCJiaW5kRW52aXJvbm1lbnQiLCJjYWxsYmFjayIsIk5PT1AiLCJjb25zdHJ1Y3RvciIsImNvbmZpZyIsInN0b3JhZ2VQYXRoIiwiZGVidWciLCJzY2hlbWEiLCJwdWJsaWMiLCJzdHJpY3QiLCJjaHVua1NpemUiLCJwcm90ZWN0ZWQiLCJjb2xsZWN0aW9uIiwicGVybWlzc2lvbnMiLCJjYWNoZUNvbnRyb2wiLCJkb3dubG9hZFJvdXRlIiwib25BZnRlclVwbG9hZCIsIm9uQWZ0ZXJSZW1vdmUiLCJkaXNhYmxlVXBsb2FkIiwib25CZWZvcmVSZW1vdmUiLCJpbnRlZ3JpdHlDaGVjayIsImNvbGxlY3Rpb25OYW1lIiwib25CZWZvcmVVcGxvYWQiLCJuYW1pbmdGdW5jdGlvbiIsInJlc3BvbnNlSGVhZGVycyIsImRpc2FibGVEb3dubG9hZCIsImFsbG93Q2xpZW50Q29kZSIsImRvd25sb2FkQ2FsbGJhY2siLCJvbkluaXRpYXRlVXBsb2FkIiwiaW50ZXJjZXB0RG93bmxvYWQiLCJjb250aW51ZVVwbG9hZFRUTCIsInBhcmVudERpclBlcm1pc3Npb25zIiwic2VsZiIsImNvb2tpZSIsImlzQm9vbGVhbiIsIk1hdGgiLCJmbG9vciIsImlzU3RyaW5nIiwiQ29sbGVjdGlvbiIsIl9uYW1lIiwiZmlsZXNDb2xsZWN0aW9uIiwiU3RyaW5nIiwiRXJyb3IiLCJyZXBsYWNlIiwiaXNGdW5jdGlvbiIsImlzTnVtYmVyIiwicGFyc2VJbnQiLCJpc09iamVjdCIsIl9jdXJyZW50VXBsb2FkcyIsInJlc3BvbnNlQ29kZSIsImZpbGVSZWYiLCJ2ZXJzaW9uUmVmIiwiaGVhZGVycyIsIlByYWdtYSIsIlRyYWlsZXIiLCJzaXplIiwiQ29ubmVjdGlvbiIsInR5cGUiLCJzZXAiLCJzcCIsImFwcGx5IiwiYXJndW1lbnRzIiwibm9ybWFsaXplIiwiX2RlYnVnIiwibWtkaXJzIiwibW9kZSIsImVycm9yIiwiQm9vbGVhbiIsIk51bWJlciIsIkZ1bmN0aW9uIiwiT25lT2YiLCJPYmplY3QiLCJfcHJlQ29sbGVjdGlvbiIsIl9lbnN1cmVJbmRleCIsImNyZWF0ZWRBdCIsImV4cGlyZUFmdGVyU2Vjb25kcyIsImJhY2tncm91bmQiLCJfcHJlQ29sbGVjdGlvbkN1cnNvciIsImZpbmQiLCJmaWVsZHMiLCJfaWQiLCJpc0ZpbmlzaGVkIiwib2JzZXJ2ZSIsImNoYW5nZWQiLCJkb2MiLCJyZW1vdmUiLCJyZW1vdmVkIiwic3RvcCIsImVuZCIsImFib3J0IiwiX2NyZWF0ZVN0cmVhbSIsInBhdGgiLCJvcHRzIiwiZmlsZUxlbmd0aCIsIl9jb250aW51ZVVwbG9hZCIsImZpbGUiLCJhYm9ydGVkIiwiZW5kZWQiLCJjb250VXBsZCIsImZpbmRPbmUiLCJfY2hlY2tBY2Nlc3MiLCJodHRwIiwicmVzdWx0IiwidXNlciIsInVzZXJJZCIsIl9nZXRVc2VyIiwicGFyYW1zIiwiY2FsbCIsImV4dGVuZCIsInJjIiwidGV4dCIsInJlc3BvbnNlIiwiaGVhZGVyc1NlbnQiLCJ3cml0ZUhlYWQiLCJsZW5ndGgiLCJmaW5pc2hlZCIsIl9tZXRob2ROYW1lcyIsIl9BYm9ydCIsIl9Xcml0ZSIsIl9TdGFydCIsIl9SZW1vdmUiLCJvbiIsIl9oYW5kbGVVcGxvYWQiLCJfZmluaXNoVXBsb2FkIiwiY29ubmVjdEhhbmRsZXJzIiwidXNlIiwiaHR0cFJlcSIsImh0dHBSZXNwIiwibmV4dCIsIl9wYXJzZWRVcmwiLCJpbmRleE9mIiwibWV0aG9kIiwiaGFuZGxlRXJyb3IiLCJfZXJyb3IiLCJjb25zb2xlIiwid2FybiIsInRyYWNlIiwidG9TdHJpbmciLCJKU09OIiwic3RyaW5naWZ5IiwiYm9keSIsImRhdGEiLCJzZXJ2ZXIiLCJzZXNzaW9ucyIsImhhcyIsImZpbGVJZCIsImVvZiIsIkJ1ZmZlciIsImZyb20iLCJiaW5EYXRhIiwiYnVmZkVyciIsImNodW5rSWQiLCJfcHJlcGFyZVVwbG9hZCIsIm1ldGEiLCJlbWl0IiwicGFyc2UiLCJqc29uRXJyIiwiX19fcyIsIm5hbWUiLCJjbG9uZSIsIkRhdGUiLCJtYXhMZW5ndGgiLCJpbnNlcnQiLCJvbWl0IiwicmV0dXJuTWV0YSIsInVwbG9hZFJvdXRlIiwiaHR0cFJlc3BFcnIiLCJ1cmkiLCJ1cmlzIiwic3Vic3RyaW5nIiwic3BsaXQiLCJxdWVyeSIsInZlcnNpb24iLCJkb3dubG9hZCIsIl9maWxlIiwiX21ldGhvZHMiLCJzZWxlY3RvciIsInVzZXJGdW5jcyIsInVzZXJzIiwiY3Vyc29yIiwiY291bnQiLCJGU05hbWUiLCJPcHRpb25hbCIsInVuYmxvY2siLCJ3cmFwQXN5bmMiLCJiaW5kIiwiaGFuZGxlVXBsb2FkRXJyIiwidW5saW5rIiwibWV0aG9kcyIsInRyYW5zcG9ydCIsImN0eCIsImZpbGVOYW1lIiwiX2dldEZpbGVOYW1lIiwiZXh0ZW5zaW9uIiwiZXh0ZW5zaW9uV2l0aERvdCIsIl9nZXRFeHQiLCJleHQiLCJfZGF0YVRvU2NoZW1hIiwiaXNVcGxvYWRBbGxvd2VkIiwiY2IiLCJjaG1vZCIsIl9nZXRNaW1lVHlwZSIsIl91cGRhdGVGaWxlVHlwZXMiLCJ1cGRhdGUiLCIkc2V0Iiwid3JpdGUiLCJlIiwiZmlsZURhdGEiLCJtaW1lIiwiYnVmIiwiZmQiLCJvcGVuU3luYyIsImJyIiwicmVhZFN5bmMiLCJjbG9zZSIsInNsaWNlIiwibXRvayIsImdldCIsImJ1ZmZlciIsInByb2NlZWRBZnRlclVwbG9hZCIsImlkIiwic3RyZWFtIiwiY3JlYXRlV3JpdGVTdHJlYW0iLCJmbGFncyIsInN0cmVhbUVyciIsImluc2VydEVyciIsImxvYWQiLCJ1cmwiLCJwYXRoUGFydHMiLCJzdG9yZVJlc3VsdCIsInN0YXQiLCJzdGF0cyIsInZlcnNpb25zIiwib3JpZ2luYWwiLCJwaXBlIiwiYWRkRmlsZSIsInN0YXRFcnIiLCJpc0ZpbGUiLCJfc3RvcmFnZVBhdGgiLCJ1bmRlZmluZWQiLCJmaWxlcyIsImZvckVhY2giLCJkb2NzIiwiZmV0Y2giLCJkZW55IiwicnVsZXMiLCJhbGxvdyIsImRlbnlDbGllbnQiLCJhbGxvd0NsaWVudCIsImVhY2giLCJ2UmVmIiwiXzQwNCIsIm9yaWdpbmFsVXJsIiwicmVzcG9uc2VUeXBlIiwic2VydmUiLCJyZWFkYWJsZVN0cmVhbSIsImZvcmNlMjAwIiwicGFydGlyYWwiLCJyZXFSYW5nZSIsImRpc3Bvc2l0aW9uVHlwZSIsInN0YXJ0IiwidGFrZSIsImRpc3Bvc2l0aW9uTmFtZSIsImVuY29kZVVSSSIsImVuY29kZVVSSUNvbXBvbmVudCIsImRpc3Bvc2l0aW9uRW5jb2RpbmciLCJzZXRIZWFkZXIiLCJyYW5nZSIsImFycmF5IiwiaXNOYU4iLCJwbGF5Iiwic3RyZWFtRXJyb3JIYW5kbGVyIiwia2V5IiwicmVzcG9uZCIsImNvZGUiLCJkZXN0cm95IiwiY3JlYXRlUmVhZFN0cmVhbSIsIkV2ZW50RW1pdHRlciIsImZvcm1hdEZsZVVSTCIsIkZpbGVzQ3Vyc29yIiwiRmlsZUN1cnNvciIsImluZm8iLCJsb2ciLCJwb3AiLCJ0b0xvd2VyQ2FzZSIsImlzVmlkZW8iLCJ0ZXN0IiwiaXNBdWRpbyIsImlzSW1hZ2UiLCJpc1RleHQiLCJpc0pTT04iLCJpc1BERiIsImRzIiwiX2Rvd25sb2FkUm91dGUiLCJfY29sbGVjdGlvbk5hbWUiLCJvcHRpb25zIiwibGluayIsIm9wdGlvbmFsIiwiYmxhY2tib3giLCJ1cGRhdGVkQXQiLCJfZmlsZVJlZiIsIl9jb2xsZWN0aW9uIiwicHJvcGVydHkiLCJ3aXRoIiwiX3NlbGVjdG9yIiwiX2N1cnJlbnQiLCJoYXNOZXh0IiwiaGFzUHJldmlvdXMiLCJwcmV2aW91cyIsImZpcnN0IiwibGFzdCIsImNvbnRleHQiLCJtYXAiLCJjdXJyZW50IiwiY2FsbGJhY2tzIiwib2JzZXJ2ZUNoYW5nZXMiLCJvYmoiLCJpc0FycmF5IiwiaSIsImlzRGF0ZSIsIl9yb290IiwiX19tZXRlb3JfcnVudGltZV9jb25maWdfXyIsIlJPT1RfVVJMIiwiZmRDYWNoZSIsIndyaXR0ZW5DaHVua3MiLCJlbnN1cmVGaWxlIiwiZWZFcnJvciIsIm9wZW4iLCJvRXJyb3IiLCJudW0iLCJjaHVuayIsIndyaXR0ZW4iLCJzZXRUaW1lb3V0IiwiY2VpbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxPQUFPQyxNQUFQLENBQWM7QUFBQ0MsbUJBQWdCLE1BQUlBO0FBQXJCLENBQWQ7O0FBQXFELElBQUlDLENBQUo7O0FBQU1ILE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSxtQkFBUixDQUFiLEVBQTBDO0FBQUNGLElBQUVHLENBQUYsRUFBSTtBQUFDSCxRQUFFRyxDQUFGO0FBQUk7O0FBQVYsQ0FBMUMsRUFBc0QsQ0FBdEQ7QUFBeUQsSUFBSUMsS0FBSjtBQUFVUCxPQUFPSSxLQUFQLENBQWFDLFFBQVEsY0FBUixDQUFiLEVBQXFDO0FBQUNFLFFBQU1ELENBQU4sRUFBUTtBQUFDQyxZQUFNRCxDQUFOO0FBQVE7O0FBQWxCLENBQXJDLEVBQXlELENBQXpEO0FBQTRELElB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QjtBQUNEOztBQUVELGlCQUFPMUIsT0FBTzRWLFVBQVAsQ0FBa0IsTUFBTTtBQUM3QixpQkFBS3BQLEdBQUwsQ0FBU3ZGLFFBQVQ7QUFDRCxXQUZNLEVBRUosRUFGSSxDQUFQO0FBR0QsU0FSRDtBQVNELE9BVkQ7QUFXRCxLQXZCRCxNQXVCTztBQUNMQSxrQkFBWUEsU0FBUyxLQUFLLENBQWQsRUFBaUIsS0FBS2dHLEtBQXRCLENBQVo7QUFDRDs7QUFDRCxXQUFPLEtBQVA7QUFDRDtBQUVEOzs7Ozs7Ozs7QUFPQVIsUUFBTXhGLFFBQU4sRUFBZ0I7QUFDZCxTQUFLK0YsT0FBTCxHQUFlLElBQWY7QUFDQSxXQUFPbU8sUUFBUSxLQUFLeE8sSUFBYixDQUFQO0FBQ0FqRyxPQUFHaU0sTUFBSCxDQUFVLEtBQUtoRyxJQUFmLEVBQXNCMUYsWUFBWUMsSUFBbEM7QUFDQSxXQUFPLElBQVA7QUFDRDtBQUVEOzs7Ozs7OztBQU1BcUYsU0FBTztBQUNMLFNBQUtTLE9BQUwsR0FBZSxJQUFmO0FBQ0EsV0FBT21PLFFBQVEsS0FBS3hPLElBQWIsQ0FBUDtBQUNBLFdBQU8sSUFBUDtBQUNEOztBQXZJOEIsQyIsImZpbGUiOiIvcGFja2FnZXMvb3N0cmlvX2ZpbGVzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgXyB9ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJvbSAnbWV0ZW9yL3VuZGVyc2NvcmUnO1xuaW1wb3J0IHsgTW9uZ28gfSAgICAgICAgICAgICAgICAgICAgICAgICAgZnJvbSAnbWV0ZW9yL21vbmdvJztcbmltcG9ydCB7IFdlYkFwcCB9ICAgICAgICAgICAgICAgICAgICAgICAgIGZyb20gJ21ldGVvci93ZWJhcHAnO1xuaW1wb3J0IHsgTWV0ZW9yIH0gICAgICAgICAgICAgICAgICAgICAgICAgZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBSYW5kb20gfSAgICAgICAgICAgICAgICAgICAgICAgICBmcm9tICdtZXRlb3IvcmFuZG9tJztcbmltcG9ydCB7IENvb2tpZXMgfSAgICAgICAgICAgICAgICAgICAgICAgIGZyb20gJ21ldGVvci9vc3RyaW86Y29va2llcyc7XG5pbXBvcnQgV3JpdGVTdHJlYW0gICAgICAgICAgICAgICAgICAgICAgICBmcm9tICcuL3dyaXRlLXN0cmVhbS5qcyc7XG5pbXBvcnQgeyBjaGVjaywgTWF0Y2ggfSAgICAgICAgICAgICAgICAgICBmcm9tICdtZXRlb3IvY2hlY2snO1xuaW1wb3J0IEZpbGVzQ29sbGVjdGlvbkNvcmUgICAgICAgICAgICAgICAgZnJvbSAnLi9jb3JlLmpzJztcbmltcG9ydCB7IGZpeEpTT05QYXJzZSwgZml4SlNPTlN0cmluZ2lmeSB9IGZyb20gJy4vbGliLmpzJztcblxuaW1wb3J0IGZzICAgICAgIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBub2RlUXMgICBmcm9tICdxdWVyeXN0cmluZyc7XG5pbXBvcnQgcmVxdWVzdCAgZnJvbSAncmVxdWVzdCc7XG5pbXBvcnQgZmlsZVR5cGUgZnJvbSAnZmlsZS10eXBlJztcbmltcG9ydCBub2RlUGF0aCBmcm9tICdwYXRoJztcblxuLypcbiAqIEBjb25zdCB7T2JqZWN0fSBib3VuZCAgLSBNZXRlb3IuYmluZEVudmlyb25tZW50IChGaWJlciB3cmFwcGVyKVxuICogQGNvbnN0IHtGdW5jdGlvbn0gTk9PUCAtIE5vIE9wZXJhdGlvbiBmdW5jdGlvbiwgcGxhY2Vob2xkZXIgZm9yIHJlcXVpcmVkIGNhbGxiYWNrc1xuICovXG5jb25zdCBib3VuZCA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoY2FsbGJhY2sgPT4gY2FsbGJhY2soKSk7XG5jb25zdCBOT09QICA9ICgpID0+IHsgIH07XG5cbi8qXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBjbGFzcyBGaWxlc0NvbGxlY3Rpb25cbiAqIEBwYXJhbSBjb25maWcgICAgICAgICAgIHtPYmplY3R9ICAgLSBbQm90aF0gICBDb25maWd1cmF0aW9uIG9iamVjdCB3aXRoIG5leHQgcHJvcGVydGllczpcbiAqIEBwYXJhbSBjb25maWcuZGVidWcgICAgIHtCb29sZWFufSAgLSBbQm90aF0gICBUdXJuIG9uL29mIGRlYnVnZ2luZyBhbmQgZXh0cmEgbG9nZ2luZ1xuICogQHBhcmFtIGNvbmZpZy5zY2hlbWEgICAge09iamVjdH0gICAtIFtCb3RoXSAgIENvbGxlY3Rpb24gU2NoZW1hXG4gKiBAcGFyYW0gY29uZmlnLnB1YmxpYyAgICB7Qm9vbGVhbn0gIC0gW0JvdGhdICAgU3RvcmUgZmlsZXMgaW4gZm9sZGVyIGFjY2Vzc2libGUgZm9yIHByb3h5IHNlcnZlcnMsIGZvciBsaW1pdHMsIGFuZCBtb3JlIC0gcmVhZCBkb2NzXG4gKiBAcGFyYW0gY29uZmlnLnN0cmljdCAgICB7Qm9vbGVhbn0gIC0gW1NlcnZlcl0gU3RyaWN0IG1vZGUgZm9yIHBhcnRpYWwgY29udGVudCwgaWYgaXMgYHRydWVgIHNlcnZlciB3aWxsIHJldHVybiBgNDE2YCByZXNwb25zZSBjb2RlLCB3aGVuIGByYW5nZWAgaXMgbm90IHNwZWNpZmllZCwgb3RoZXJ3aXNlIHNlcnZlciByZXR1cm4gYDIwNmBcbiAqIEBwYXJhbSBjb25maWcucHJvdGVjdGVkIHtGdW5jdGlvbn0gLSBbU2VydmVyXSBJZiBgdHJ1ZWAgLSBmaWxlcyB3aWxsIGJlIHNlcnZlZCBvbmx5IHRvIGF1dGhvcml6ZWQgdXNlcnMsIGlmIGBmdW5jdGlvbigpYCAtIHlvdSdyZSBhYmxlIHRvIGNoZWNrIHZpc2l0b3IncyBwZXJtaXNzaW9ucyBpbiB5b3VyIG93biB3YXkgZnVuY3Rpb24ncyBjb250ZXh0IGhhczpcbiAqICAtIGByZXF1ZXN0YFxuICogIC0gYHJlc3BvbnNlYFxuICogIC0gYHVzZXIoKWBcbiAqICAtIGB1c2VySWRgXG4gKiBAcGFyYW0gY29uZmlnLmNodW5rU2l6ZSAgICAgIHtOdW1iZXJ9ICAtIFtCb3RoXSBVcGxvYWQgY2h1bmsgc2l6ZSwgZGVmYXVsdDogNTI0Mjg4IGJ5dGVzICgwLDUgTWIpXG4gKiBAcGFyYW0gY29uZmlnLnBlcm1pc3Npb25zICAgIHtOdW1iZXJ9ICAtIFtTZXJ2ZXJdIFBlcm1pc3Npb25zIHdoaWNoIHdpbGwgYmUgc2V0IHRvIHVwbG9hZGVkIGZpbGVzIChvY3RhbCksIGxpa2U6IGA1MTFgIG9yIGAwbzc1NWAuIERlZmF1bHQ6IDA2NDRcbiAqIEBwYXJhbSBjb25maWcucGFyZW50RGlyUGVybWlzc2lvbnMge051bWJlcn0gIC0gW1NlcnZlcl0gUGVybWlzc2lvbnMgd2hpY2ggd2lsbCBiZSBzZXQgdG8gcGFyZW50IGRpcmVjdG9yeSBvZiB1cGxvYWRlZCBmaWxlcyAob2N0YWwpLCBsaWtlOiBgNjExYCBvciBgMG83NzdgLiBEZWZhdWx0OiAwNzU1XG4gKiBAcGFyYW0gY29uZmlnLnN0b3JhZ2VQYXRoICAgIHtTdHJpbmd8RnVuY3Rpb259ICAtIFtTZXJ2ZXJdIFN0b3JhZ2UgcGF0aCBvbiBmaWxlIHN5c3RlbVxuICogQHBhcmFtIGNvbmZpZy5jYWNoZUNvbnRyb2wgICB7U3RyaW5nfSAgLSBbU2VydmVyXSBEZWZhdWx0IGBDYWNoZS1Db250cm9sYCBoZWFkZXJcbiAqIEBwYXJhbSBjb25maWcucmVzcG9uc2VIZWFkZXJzIHtPYmplY3R8RnVuY3Rpb259IC0gW1NlcnZlcl0gQ3VzdG9tIHJlc3BvbnNlIGhlYWRlcnMsIGlmIGZ1bmN0aW9uIGlzIHBhc3NlZCwgbXVzdCByZXR1cm4gT2JqZWN0XG4gKiBAcGFyYW0gY29uZmlnLnRocm90dGxlICAgICAgIHtOdW1iZXJ9ICAtIFtTZXJ2ZXJdIERFUFJFQ0FURUQgYnBzIHRocm90dGxlIHRocmVzaG9sZFxuICogQHBhcmFtIGNvbmZpZy5kb3dubG9hZFJvdXRlICB7U3RyaW5nfSAgLSBbQm90aF0gICBTZXJ2ZXIgUm91dGUgdXNlZCB0byByZXRyaWV2ZSBmaWxlc1xuICogQHBhcmFtIGNvbmZpZy5jb2xsZWN0aW9uICAgICB7TW9uZ28uQ29sbGVjdGlvbn0gLSBbQm90aF0gTW9uZ28gQ29sbGVjdGlvbiBJbnN0YW5jZVxuICogQHBhcmFtIGNvbmZpZy5jb2xsZWN0aW9uTmFtZSB7U3RyaW5nfSAgLSBbQm90aF0gICBDb2xsZWN0aW9uIG5hbWVcbiAqIEBwYXJhbSBjb25maWcubmFtaW5nRnVuY3Rpb24ge0Z1bmN0aW9ufS0gW0JvdGhdICAgRnVuY3Rpb24gd2hpY2ggcmV0dXJucyBgU3RyaW5nYFxuICogQHBhcmFtIGNvbmZpZy5pbnRlZ3JpdHlDaGVjayB7Qm9vbGVhbn0gLSBbU2VydmVyXSBDaGVjayBmaWxlJ3MgaW50ZWdyaXR5IGJlZm9yZSBzZXJ2aW5nIHRvIHVzZXJzXG4gKiBAcGFyYW0gY29uZmlnLm9uQWZ0ZXJVcGxvYWQgIHtGdW5jdGlvbn0tIFtTZXJ2ZXJdIENhbGxlZCByaWdodCBhZnRlciBmaWxlIGlzIHJlYWR5IG9uIEZTLiBVc2UgdG8gdHJhbnNmZXIgZmlsZSBzb21ld2hlcmUgZWxzZSwgb3IgZG8gb3RoZXIgdGhpbmcgd2l0aCBmaWxlIGRpcmVjdGx5XG4gKiBAcGFyYW0gY29uZmlnLm9uQWZ0ZXJSZW1vdmUgIHtGdW5jdGlvbn0gLSBbU2VydmVyXSBDYWxsZWQgcmlnaHQgYWZ0ZXIgZmlsZSBpcyByZW1vdmVkLiBSZW1vdmVkIG9iamVjdHMgaXMgcGFzc2VkIHRvIGNhbGxiYWNrXG4gKiBAcGFyYW0gY29uZmlnLmNvbnRpbnVlVXBsb2FkVFRMIHtOdW1iZXJ9IC0gW1NlcnZlcl0gVGltZSBpbiBzZWNvbmRzLCBkdXJpbmcgdXBsb2FkIG1heSBiZSBjb250aW51ZWQsIGRlZmF1bHQgMyBob3VycyAoMTA4MDAgc2Vjb25kcylcbiAqIEBwYXJhbSBjb25maWcub25CZWZvcmVVcGxvYWQge0Z1bmN0aW9ufS0gW0JvdGhdICAgRnVuY3Rpb24gd2hpY2ggZXhlY3V0ZXMgb24gc2VydmVyIGFmdGVyIHJlY2VpdmluZyBlYWNoIGNodW5rIGFuZCBvbiBjbGllbnQgcmlnaHQgYmVmb3JlIGJlZ2lubmluZyB1cGxvYWQuIEZ1bmN0aW9uIGNvbnRleHQgaXMgYEZpbGVgIC0gc28geW91IGFyZSBhYmxlIHRvIGNoZWNrIGZvciBleHRlbnNpb24sIG1pbWUtdHlwZSwgc2l6ZSBhbmQgZXRjLjpcbiAqICAtIHJldHVybiBgdHJ1ZWAgdG8gY29udGludWVcbiAqICAtIHJldHVybiBgZmFsc2VgIG9yIGBTdHJpbmdgIHRvIGFib3J0IHVwbG9hZFxuICogQHBhcmFtIGNvbmZpZy5vbkluaXRpYXRlVXBsb2FkIHtGdW5jdGlvbn0gLSBbU2VydmVyXSBGdW5jdGlvbiB3aGljaCBleGVjdXRlcyBvbiBzZXJ2ZXIgcmlnaHQgYmVmb3JlIHVwbG9hZCBpcyBiZWdpbiBhbmQgcmlnaHQgYWZ0ZXIgYG9uQmVmb3JlVXBsb2FkYCBob29rLiBUaGlzIGhvb2sgaXMgZnVsbHkgYXN5bmNocm9ub3VzLlxuICogQHBhcmFtIGNvbmZpZy5vbkJlZm9yZVJlbW92ZSB7RnVuY3Rpb259IC0gW1NlcnZlcl0gRXhlY3V0ZXMgYmVmb3JlIHJlbW92aW5nIGZpbGUgb24gc2VydmVyLCBzbyB5b3UgY2FuIGNoZWNrIHBlcm1pc3Npb25zLiBSZXR1cm4gYHRydWVgIHRvIGFsbG93IGFjdGlvbiBhbmQgYGZhbHNlYCB0byBkZW55LlxuICogQHBhcmFtIGNvbmZpZy5hbGxvd0NsaWVudENvZGUgIHtCb29sZWFufSAgLSBbQm90aF0gICBBbGxvdyB0byBydW4gYHJlbW92ZWAgZnJvbSBjbGllbnRcbiAqIEBwYXJhbSBjb25maWcuZG93bmxvYWRDYWxsYmFjayB7RnVuY3Rpb259IC0gW1NlcnZlcl0gQ2FsbGJhY2sgdHJpZ2dlcmVkIGVhY2ggdGltZSBmaWxlIGlzIHJlcXVlc3RlZCwgcmV0dXJuIHRydXRoeSB2YWx1ZSB0byBjb250aW51ZSBkb3dubG9hZCwgb3IgZmFsc3kgdG8gYWJvcnRcbiAqIEBwYXJhbSBjb25maWcuaW50ZXJjZXB0RG93bmxvYWQge0Z1bmN0aW9ufSAtIFtTZXJ2ZXJdIEludGVyY2VwdCBkb3dubG9hZCByZXF1ZXN0LCBzbyB5b3UgY2FuIHNlcnZlIGZpbGUgZnJvbSB0aGlyZC1wYXJ0eSByZXNvdXJjZSwgYXJndW1lbnRzIHtodHRwOiB7cmVxdWVzdDogey4uLn0sIHJlc3BvbnNlOiB7Li4ufX0sIGZpbGVSZWY6IHsuLi59fVxuICogQHBhcmFtIGNvbmZpZy5kaXNhYmxlVXBsb2FkIHtCb29sZWFufSAtIERpc2FibGUgZmlsZSB1cGxvYWQsIHVzZWZ1bCBmb3Igc2VydmVyIG9ubHkgc29sdXRpb25zXG4gKiBAcGFyYW0gY29uZmlnLmRpc2FibGVEb3dubG9hZCB7Qm9vbGVhbn0gLSBEaXNhYmxlIGZpbGUgZG93bmxvYWQgKHNlcnZpbmcpLCB1c2VmdWwgZm9yIGZpbGUgbWFuYWdlbWVudCBvbmx5IHNvbHV0aW9uc1xuICogQHN1bW1hcnkgQ3JlYXRlIG5ldyBpbnN0YW5jZSBvZiBGaWxlc0NvbGxlY3Rpb25cbiAqL1xuZXhwb3J0IGNsYXNzIEZpbGVzQ29sbGVjdGlvbiBleHRlbmRzIEZpbGVzQ29sbGVjdGlvbkNvcmUge1xuICBjb25zdHJ1Y3Rvcihjb25maWcpIHtcbiAgICBzdXBlcigpO1xuICAgIGxldCBzdG9yYWdlUGF0aDtcbiAgICBpZiAoY29uZmlnKSB7XG4gICAgICAoe1xuICAgICAgICBzdG9yYWdlUGF0aCxcbiAgICAgICAgZGVidWc6IHRoaXMuZGVidWcsXG4gICAgICAgIHNjaGVtYTogdGhpcy5zY2hlbWEsXG4gICAgICAgIHB1YmxpYzogdGhpcy5wdWJsaWMsXG4gICAgICAgIHN0cmljdDogdGhpcy5zdHJpY3QsXG4gICAgICAgIGNodW5rU2l6ZTogdGhpcy5jaHVua1NpemUsXG4gICAgICAgIHByb3RlY3RlZDogdGhpcy5wcm90ZWN0ZWQsXG4gICAgICAgIGNvbGxlY3Rpb246IHRoaXMuY29sbGVjdGlvbixcbiAgICAgICAgcGVybWlzc2lvbnM6IHRoaXMucGVybWlzc2lvbnMsXG4gICAgICAgIGNhY2hlQ29udHJvbDogdGhpcy5jYWNoZUNvbnRyb2wsXG4gICAgICAgIGRvd25sb2FkUm91dGU6IHRoaXMuZG93bmxvYWRSb3V0ZSxcbiAgICAgICAgb25BZnRlclVwbG9hZDogdGhpcy5vbkFmdGVyVXBsb2FkLFxuICAgICAgICBvbkFmdGVyUmVtb3ZlOiB0aGlzLm9uQWZ0ZXJSZW1vdmUsXG4gICAgICAgIGRpc2FibGVVcGxvYWQ6IHRoaXMuZGlzYWJsZVVwbG9hZCxcbiAgICAgICAgb25CZWZvcmVSZW1vdmU6IHRoaXMub25CZWZvcmVSZW1vdmUsXG4gICAgICAgIGludGVncml0eUNoZWNrOiB0aGlzLmludGVncml0eUNoZWNrLFxuICAgICAgICBjb2xsZWN0aW9uTmFtZTogdGhpcy5jb2xsZWN0aW9uTmFtZSxcbiAgICAgICAgb25CZWZvcmVVcGxvYWQ6IHRoaXMub25CZWZvcmVVcGxvYWQsXG4gICAgICAgIG5hbWluZ0Z1bmN0aW9uOiB0aGlzLm5hbWluZ0Z1bmN0aW9uLFxuICAgICAgICByZXNwb25zZUhlYWRlcnM6IHRoaXMucmVzcG9uc2VIZWFkZXJzLFxuICAgICAgICBkaXNhYmxlRG93bmxvYWQ6IHRoaXMuZGlzYWJsZURvd25sb2FkLFxuICAgICAgICBhbGxvd0NsaWVudENvZGU6IHRoaXMuYWxsb3dDbGllbnRDb2RlLFxuICAgICAgICBkb3dubG9hZENhbGxiYWNrOiB0aGlzLmRvd25sb2FkQ2FsbGJhY2ssXG4gICAgICAgIG9uSW5pdGlhdGVVcGxvYWQ6IHRoaXMub25Jbml0aWF0ZVVwbG9hZCxcbiAgICAgICAgaW50ZXJjZXB0RG93bmxvYWQ6IHRoaXMuaW50ZXJjZXB0RG93bmxvYWQsXG4gICAgICAgIGNvbnRpbnVlVXBsb2FkVFRMOiB0aGlzLmNvbnRpbnVlVXBsb2FkVFRMLFxuICAgICAgICBwYXJlbnREaXJQZXJtaXNzaW9uczogdGhpcy5wYXJlbnREaXJQZXJtaXNzaW9uc1xuICAgICAgfSA9IGNvbmZpZyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VsZiAgID0gdGhpcztcbiAgICBjb25zdCBjb29raWUgPSBuZXcgQ29va2llcygpO1xuXG4gICAgaWYgKCFfLmlzQm9vbGVhbih0aGlzLmRlYnVnKSkge1xuICAgICAgdGhpcy5kZWJ1ZyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghXy5pc0Jvb2xlYW4odGhpcy5wdWJsaWMpKSB7XG4gICAgICB0aGlzLnB1YmxpYyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5wcm90ZWN0ZWQpIHtcbiAgICAgIHRoaXMucHJvdGVjdGVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmNodW5rU2l6ZSkge1xuICAgICAgdGhpcy5jaHVua1NpemUgPSAxMDI0ICogNTEyO1xuICAgIH1cblxuICAgIHRoaXMuY2h1bmtTaXplID0gTWF0aC5mbG9vcih0aGlzLmNodW5rU2l6ZSAvIDgpICogODtcblxuICAgIGlmICghXy5pc1N0cmluZyh0aGlzLmNvbGxlY3Rpb25OYW1lKSAmJiAhdGhpcy5jb2xsZWN0aW9uKSB7XG4gICAgICB0aGlzLmNvbGxlY3Rpb25OYW1lID0gJ01ldGVvclVwbG9hZEZpbGVzJztcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuY29sbGVjdGlvbikge1xuICAgICAgdGhpcy5jb2xsZWN0aW9uID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24odGhpcy5jb2xsZWN0aW9uTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29sbGVjdGlvbk5hbWUgPSB0aGlzLmNvbGxlY3Rpb24uX25hbWU7XG4gICAgfVxuXG4gICAgdGhpcy5jb2xsZWN0aW9uLmZpbGVzQ29sbGVjdGlvbiA9IHRoaXM7XG4gICAgY2hlY2sodGhpcy5jb2xsZWN0aW9uTmFtZSwgU3RyaW5nKTtcblxuICAgIGlmICh0aGlzLnB1YmxpYyAmJiAhdGhpcy5kb3dubG9hZFJvdXRlKSB7XG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDUwMCwgYFtGaWxlc0NvbGxlY3Rpb24uJHt0aGlzLmNvbGxlY3Rpb25OYW1lfV06IFwiZG93bmxvYWRSb3V0ZVwiIG11c3QgYmUgcHJlY2lzZWx5IHByb3ZpZGVkIG9uIFwicHVibGljXCIgY29sbGVjdGlvbnMhIE5vdGU6IFwiZG93bmxvYWRSb3V0ZVwiIG11c3QgYmUgZXF1YWwgb3IgYmUgaW5zaWRlIG9mIHlvdXIgd2ViL3Byb3h5LXNlcnZlciAocmVsYXRpdmUpIHJvb3QuYCk7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzU3RyaW5nKHRoaXMuZG93bmxvYWRSb3V0ZSkpIHtcbiAgICAgIHRoaXMuZG93bmxvYWRSb3V0ZSA9ICcvY2RuL3N0b3JhZ2UnO1xuICAgIH1cblxuICAgIHRoaXMuZG93bmxvYWRSb3V0ZSA9IHRoaXMuZG93bmxvYWRSb3V0ZS5yZXBsYWNlKC9cXC8kLywgJycpO1xuXG4gICAgaWYgKCFfLmlzRnVuY3Rpb24odGhpcy5uYW1pbmdGdW5jdGlvbikpIHtcbiAgICAgIHRoaXMubmFtaW5nRnVuY3Rpb24gPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIV8uaXNGdW5jdGlvbih0aGlzLm9uQmVmb3JlVXBsb2FkKSkge1xuICAgICAgdGhpcy5vbkJlZm9yZVVwbG9hZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghXy5pc0Jvb2xlYW4odGhpcy5hbGxvd0NsaWVudENvZGUpKSB7XG4gICAgICB0aGlzLmFsbG93Q2xpZW50Q29kZSA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzRnVuY3Rpb24odGhpcy5vbkluaXRpYXRlVXBsb2FkKSkge1xuICAgICAgdGhpcy5vbkluaXRpYXRlVXBsb2FkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzRnVuY3Rpb24odGhpcy5pbnRlcmNlcHREb3dubG9hZCkpIHtcbiAgICAgIHRoaXMuaW50ZXJjZXB0RG93bmxvYWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIV8uaXNCb29sZWFuKHRoaXMuc3RyaWN0KSkge1xuICAgICAgdGhpcy5zdHJpY3QgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICghXy5pc051bWJlcih0aGlzLnBlcm1pc3Npb25zKSkge1xuICAgICAgdGhpcy5wZXJtaXNzaW9ucyA9IHBhcnNlSW50KCc2NDQnLCA4KTtcbiAgICB9XG5cbiAgICBpZiAoIV8uaXNOdW1iZXIodGhpcy5wYXJlbnREaXJQZXJtaXNzaW9ucykpIHtcbiAgICAgIHRoaXMucGFyZW50RGlyUGVybWlzc2lvbnMgPSBwYXJzZUludCgnNzU1JywgOCk7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzU3RyaW5nKHRoaXMuY2FjaGVDb250cm9sKSkge1xuICAgICAgdGhpcy5jYWNoZUNvbnRyb2wgPSAncHVibGljLCBtYXgtYWdlPTMxNTM2MDAwLCBzLW1heGFnZT0zMTUzNjAwMCc7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzRnVuY3Rpb24odGhpcy5vbkFmdGVyVXBsb2FkKSkge1xuICAgICAgdGhpcy5vbkFmdGVyVXBsb2FkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzQm9vbGVhbih0aGlzLmRpc2FibGVVcGxvYWQpKSB7XG4gICAgICB0aGlzLmRpc2FibGVVcGxvYWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIV8uaXNGdW5jdGlvbih0aGlzLm9uQWZ0ZXJSZW1vdmUpKSB7XG4gICAgICB0aGlzLm9uQWZ0ZXJSZW1vdmUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIV8uaXNGdW5jdGlvbih0aGlzLm9uQmVmb3JlUmVtb3ZlKSkge1xuICAgICAgdGhpcy5vbkJlZm9yZVJlbW92ZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghXy5pc0Jvb2xlYW4odGhpcy5pbnRlZ3JpdHlDaGVjaykpIHtcbiAgICAgIHRoaXMuaW50ZWdyaXR5Q2hlY2sgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICghXy5pc0Jvb2xlYW4odGhpcy5kaXNhYmxlRG93bmxvYWQpKSB7XG4gICAgICB0aGlzLmRpc2FibGVEb3dubG9hZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghXy5pc09iamVjdCh0aGlzLl9jdXJyZW50VXBsb2FkcykpIHtcbiAgICAgIHRoaXMuX2N1cnJlbnRVcGxvYWRzID0ge307XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzRnVuY3Rpb24odGhpcy5kb3dubG9hZENhbGxiYWNrKSkge1xuICAgICAgdGhpcy5kb3dubG9hZENhbGxiYWNrID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzTnVtYmVyKHRoaXMuY29udGludWVVcGxvYWRUVEwpKSB7XG4gICAgICB0aGlzLmNvbnRpbnVlVXBsb2FkVFRMID0gMTA4MDA7XG4gICAgfVxuXG4gICAgaWYgKCFfLmlzRnVuY3Rpb24odGhpcy5yZXNwb25zZUhlYWRlcnMpKSB7XG4gICAgICB0aGlzLnJlc3BvbnNlSGVhZGVycyA9IChyZXNwb25zZUNvZGUsIGZpbGVSZWYsIHZlcnNpb25SZWYpID0+IHtcbiAgICAgICAgY29uc3QgaGVhZGVycyA9IHt9O1xuXG4gICAgICAgIHN3aXRjaCAocmVzcG9uc2VDb2RlKSB7XG4gICAgICAgIGNhc2UgJzIwNic6XG4gICAgICAgICAgaGVhZGVycy5QcmFnbWEgICAgICAgICAgICAgICA9ICdwcml2YXRlJztcbiAgICAgICAgICBoZWFkZXJzLlRyYWlsZXIgICAgICAgICAgICAgID0gJ2V4cGlyZXMnO1xuICAgICAgICAgIGhlYWRlcnNbJ1RyYW5zZmVyLUVuY29kaW5nJ10gPSAnY2h1bmtlZCc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJzQwMCc6XG4gICAgICAgICAgaGVhZGVyc1snQ2FjaGUtQ29udHJvbCddICAgICA9ICduby1jYWNoZSc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJzQxNic6XG4gICAgICAgICAgaGVhZGVyc1snQ29udGVudC1SYW5nZSddICAgICA9IGBieXRlcyAqLyR7dmVyc2lvblJlZi5zaXplfWA7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBoZWFkZXJzLkNvbm5lY3Rpb24gICAgICAgPSAna2VlcC1hbGl2ZSc7XG4gICAgICAgIGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddICA9IHZlcnNpb25SZWYudHlwZSB8fCAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJztcbiAgICAgICAgaGVhZGVyc1snQWNjZXB0LVJhbmdlcyddID0gJ2J5dGVzJztcbiAgICAgICAgcmV0dXJuIGhlYWRlcnM7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICh0aGlzLnB1YmxpYyAmJiAhc3RvcmFnZVBhdGgpIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNTAwLCBgW0ZpbGVzQ29sbGVjdGlvbi4ke3RoaXMuY29sbGVjdGlvbk5hbWV9XSBcInN0b3JhZ2VQYXRoXCIgbXVzdCBiZSBzZXQgb24gXCJwdWJsaWNcIiBjb2xsZWN0aW9ucyEgTm90ZTogXCJzdG9yYWdlUGF0aFwiIG11c3QgYmUgZXF1YWwgb24gYmUgaW5zaWRlIG9mIHlvdXIgd2ViL3Byb3h5LXNlcnZlciAoYWJzb2x1dGUpIHJvb3QuYCk7XG4gICAgfVxuXG4gICAgaWYgKCFzdG9yYWdlUGF0aCkge1xuICAgICAgc3RvcmFnZVBhdGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBgYXNzZXRzJHtub2RlUGF0aC5zZXB9YXBwJHtub2RlUGF0aC5zZXB9dXBsb2FkcyR7bm9kZVBhdGguc2VwfSR7c2VsZi5jb2xsZWN0aW9uTmFtZX1gO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoXy5pc1N0cmluZyhzdG9yYWdlUGF0aCkpIHtcbiAgICAgIHRoaXMuc3RvcmFnZVBhdGggPSAoKSA9PiBzdG9yYWdlUGF0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zdG9yYWdlUGF0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IHNwID0gc3RvcmFnZVBhdGguYXBwbHkoc2VsZiwgYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKCFfLmlzU3RyaW5nKHNwKSkge1xuICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAwLCBgW0ZpbGVzQ29sbGVjdGlvbi4ke3NlbGYuY29sbGVjdGlvbk5hbWV9XSBcInN0b3JhZ2VQYXRoXCIgZnVuY3Rpb24gbXVzdCByZXR1cm4gYSBTdHJpbmchYCk7XG4gICAgICAgIH1cbiAgICAgICAgc3AgPSBzcC5yZXBsYWNlKC9cXC8kLywgJycpO1xuICAgICAgICByZXR1cm4gbm9kZVBhdGgubm9ybWFsaXplKHNwKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdGhpcy5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb24uc3RvcmFnZVBhdGhdIFNldCB0bzonLCB0aGlzLnN0b3JhZ2VQYXRoKHt9KSk7XG5cbiAgICBmcy5ta2RpcnModGhpcy5zdG9yYWdlUGF0aCh7fSksIHsgbW9kZTogdGhpcy5wYXJlbnREaXJQZXJtaXNzaW9ucyB9LCAoZXJyb3IpID0+IHtcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMSwgYFtGaWxlc0NvbGxlY3Rpb24uJHtzZWxmLmNvbGxlY3Rpb25OYW1lfV0gUGF0aCBcIiR7dGhpcy5zdG9yYWdlUGF0aCh7fSl9XCIgaXMgbm90IHdyaXRhYmxlISAke2Vycm9yfWApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY2hlY2sodGhpcy5zdHJpY3QsIEJvb2xlYW4pO1xuICAgIGNoZWNrKHRoaXMucGVybWlzc2lvbnMsIE51bWJlcik7XG4gICAgY2hlY2sodGhpcy5zdG9yYWdlUGF0aCwgRnVuY3Rpb24pO1xuICAgIGNoZWNrKHRoaXMuY2FjaGVDb250cm9sLCBTdHJpbmcpO1xuICAgIGNoZWNrKHRoaXMub25BZnRlclJlbW92ZSwgTWF0Y2guT25lT2YoZmFsc2UsIEZ1bmN0aW9uKSk7XG4gICAgY2hlY2sodGhpcy5vbkFmdGVyVXBsb2FkLCBNYXRjaC5PbmVPZihmYWxzZSwgRnVuY3Rpb24pKTtcbiAgICBjaGVjayh0aGlzLmRpc2FibGVVcGxvYWQsIEJvb2xlYW4pO1xuICAgIGNoZWNrKHRoaXMuaW50ZWdyaXR5Q2hlY2ssIEJvb2xlYW4pO1xuICAgIGNoZWNrKHRoaXMub25CZWZvcmVSZW1vdmUsIE1hdGNoLk9uZU9mKGZhbHNlLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMuZGlzYWJsZURvd25sb2FkLCBCb29sZWFuKTtcbiAgICBjaGVjayh0aGlzLmRvd25sb2FkQ2FsbGJhY2ssIE1hdGNoLk9uZU9mKGZhbHNlLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMuaW50ZXJjZXB0RG93bmxvYWQsIE1hdGNoLk9uZU9mKGZhbHNlLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMuY29udGludWVVcGxvYWRUVEwsIE51bWJlcik7XG4gICAgY2hlY2sodGhpcy5yZXNwb25zZUhlYWRlcnMsIE1hdGNoLk9uZU9mKE9iamVjdCwgRnVuY3Rpb24pKTtcblxuICAgIGlmICghdGhpcy5kaXNhYmxlVXBsb2FkKSB7XG4gICAgICB0aGlzLl9wcmVDb2xsZWN0aW9uID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oYF9fcHJlXyR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gKTtcbiAgICAgIHRoaXMuX3ByZUNvbGxlY3Rpb24uX2Vuc3VyZUluZGV4KHsgY3JlYXRlZEF0OiAxIH0sIHsgZXhwaXJlQWZ0ZXJTZWNvbmRzOiB0aGlzLmNvbnRpbnVlVXBsb2FkVFRMLCBiYWNrZ3JvdW5kOiB0cnVlIH0pO1xuICAgICAgY29uc3QgX3ByZUNvbGxlY3Rpb25DdXJzb3IgPSB0aGlzLl9wcmVDb2xsZWN0aW9uLmZpbmQoe30sIHtcbiAgICAgICAgZmllbGRzOiB7XG4gICAgICAgICAgX2lkOiAxLFxuICAgICAgICAgIGlzRmluaXNoZWQ6IDFcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIF9wcmVDb2xsZWN0aW9uQ3Vyc29yLm9ic2VydmUoe1xuICAgICAgICBjaGFuZ2VkKGRvYykge1xuICAgICAgICAgIGlmIChkb2MuaXNGaW5pc2hlZCkge1xuICAgICAgICAgICAgc2VsZi5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtfcHJlQ29sbGVjdGlvbkN1cnNvci5vYnNlcnZlXSBbY2hhbmdlZF06ICR7ZG9jLl9pZH1gKTtcbiAgICAgICAgICAgIHNlbGYuX3ByZUNvbGxlY3Rpb24ucmVtb3ZlKHtfaWQ6IGRvYy5faWR9LCBOT09QKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHJlbW92ZWQoZG9jKSB7XG4gICAgICAgICAgLy8gRnJlZSBtZW1vcnkgYWZ0ZXIgdXBsb2FkIGlzIGRvbmVcbiAgICAgICAgICAvLyBPciBpZiB1cGxvYWQgaXMgdW5maW5pc2hlZFxuICAgICAgICAgIHNlbGYuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbX3ByZUNvbGxlY3Rpb25DdXJzb3Iub2JzZXJ2ZV0gW3JlbW92ZWRdOiAke2RvYy5faWR9YCk7XG4gICAgICAgICAgaWYgKF8uaXNPYmplY3Qoc2VsZi5fY3VycmVudFVwbG9hZHNbZG9jLl9pZF0pKSB7XG4gICAgICAgICAgICBzZWxmLl9jdXJyZW50VXBsb2Fkc1tkb2MuX2lkXS5zdG9wKCk7XG4gICAgICAgICAgICBzZWxmLl9jdXJyZW50VXBsb2Fkc1tkb2MuX2lkXS5lbmQoKTtcblxuICAgICAgICAgICAgaWYgKCFkb2MuaXNGaW5pc2hlZCkge1xuICAgICAgICAgICAgICBzZWxmLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW19wcmVDb2xsZWN0aW9uQ3Vyc29yLm9ic2VydmVdIFtyZW1vdmVVbmZpbmlzaGVkVXBsb2FkXTogJHtkb2MuX2lkfWApO1xuICAgICAgICAgICAgICBzZWxmLl9jdXJyZW50VXBsb2Fkc1tkb2MuX2lkXS5hYm9ydCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkZWxldGUgc2VsZi5fY3VycmVudFVwbG9hZHNbZG9jLl9pZF07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5fY3JlYXRlU3RyZWFtID0gKF9pZCwgcGF0aCwgb3B0cykgPT4ge1xuICAgICAgICB0aGlzLl9jdXJyZW50VXBsb2Fkc1tfaWRdID0gbmV3IFdyaXRlU3RyZWFtKHBhdGgsIG9wdHMuZmlsZUxlbmd0aCwgb3B0cywgdGhpcy5wZXJtaXNzaW9ucyk7XG4gICAgICB9O1xuXG4gICAgICAvLyBUaGlzIGxpdHRsZSBmdW5jdGlvbiBhbGxvd3MgdG8gY29udGludWUgdXBsb2FkXG4gICAgICAvLyBldmVuIGFmdGVyIHNlcnZlciBpcyByZXN0YXJ0ZWQgKCpub3Qgb24gZGV2LXN0YWdlKilcbiAgICAgIHRoaXMuX2NvbnRpbnVlVXBsb2FkID0gKF9pZCkgPT4ge1xuICAgICAgICBpZiAodGhpcy5fY3VycmVudFVwbG9hZHNbX2lkXSAmJiB0aGlzLl9jdXJyZW50VXBsb2Fkc1tfaWRdLmZpbGUpIHtcbiAgICAgICAgICBpZiAoIXRoaXMuX2N1cnJlbnRVcGxvYWRzW19pZF0uYWJvcnRlZCAmJiAhdGhpcy5fY3VycmVudFVwbG9hZHNbX2lkXS5lbmRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2N1cnJlbnRVcGxvYWRzW19pZF0uZmlsZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5fY3JlYXRlU3RyZWFtKF9pZCwgdGhpcy5fY3VycmVudFVwbG9hZHNbX2lkXS5maWxlLmZpbGUucGF0aCwgdGhpcy5fY3VycmVudFVwbG9hZHNbX2lkXS5maWxlKTtcbiAgICAgICAgICByZXR1cm4gdGhpcy5fY3VycmVudFVwbG9hZHNbX2lkXS5maWxlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNvbnRVcGxkID0gdGhpcy5fcHJlQ29sbGVjdGlvbi5maW5kT25lKHtfaWR9KTtcbiAgICAgICAgaWYgKGNvbnRVcGxkKSB7XG4gICAgICAgICAgdGhpcy5fY3JlYXRlU3RyZWFtKF9pZCwgY29udFVwbGQuZmlsZS5wYXRoLCBjb250VXBsZCk7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX2N1cnJlbnRVcGxvYWRzW19pZF0uZmlsZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICghdGhpcy5zY2hlbWEpIHtcbiAgICAgIHRoaXMuc2NoZW1hID0gRmlsZXNDb2xsZWN0aW9uQ29yZS5zY2hlbWE7XG4gICAgfVxuXG4gICAgY2hlY2sodGhpcy5kZWJ1ZywgQm9vbGVhbik7XG4gICAgY2hlY2sodGhpcy5zY2hlbWEsIE9iamVjdCk7XG4gICAgY2hlY2sodGhpcy5wdWJsaWMsIEJvb2xlYW4pO1xuICAgIGNoZWNrKHRoaXMucHJvdGVjdGVkLCBNYXRjaC5PbmVPZihCb29sZWFuLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMuY2h1bmtTaXplLCBOdW1iZXIpO1xuICAgIGNoZWNrKHRoaXMuZG93bmxvYWRSb3V0ZSwgU3RyaW5nKTtcbiAgICBjaGVjayh0aGlzLm5hbWluZ0Z1bmN0aW9uLCBNYXRjaC5PbmVPZihmYWxzZSwgRnVuY3Rpb24pKTtcbiAgICBjaGVjayh0aGlzLm9uQmVmb3JlVXBsb2FkLCBNYXRjaC5PbmVPZihmYWxzZSwgRnVuY3Rpb24pKTtcbiAgICBjaGVjayh0aGlzLm9uSW5pdGlhdGVVcGxvYWQsIE1hdGNoLk9uZU9mKGZhbHNlLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMuYWxsb3dDbGllbnRDb2RlLCBCb29sZWFuKTtcblxuICAgIGlmICh0aGlzLnB1YmxpYyAmJiB0aGlzLnByb3RlY3RlZCkge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig1MDAsIGBbRmlsZXNDb2xsZWN0aW9uLiR7dGhpcy5jb2xsZWN0aW9uTmFtZX1dOiBGaWxlcyBjYW4gbm90IGJlIHB1YmxpYyBhbmQgcHJvdGVjdGVkIGF0IHRoZSBzYW1lIHRpbWUhYCk7XG4gICAgfVxuXG4gICAgdGhpcy5fY2hlY2tBY2Nlc3MgPSAoaHR0cCkgPT4ge1xuICAgICAgaWYgKHRoaXMucHJvdGVjdGVkKSB7XG4gICAgICAgIGxldCByZXN1bHQ7XG4gICAgICAgIGNvbnN0IHt1c2VyLCB1c2VySWR9ID0gdGhpcy5fZ2V0VXNlcihodHRwKTtcblxuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKHRoaXMucHJvdGVjdGVkKSkge1xuICAgICAgICAgIGxldCBmaWxlUmVmO1xuICAgICAgICAgIGlmIChfLmlzT2JqZWN0KGh0dHAucGFyYW1zKSAmJiAgaHR0cC5wYXJhbXMuX2lkKSB7XG4gICAgICAgICAgICBmaWxlUmVmID0gdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUoaHR0cC5wYXJhbXMuX2lkKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXN1bHQgPSBodHRwID8gdGhpcy5wcm90ZWN0ZWQuY2FsbChfLmV4dGVuZChodHRwLCB7dXNlciwgdXNlcklkfSksIChmaWxlUmVmIHx8IG51bGwpKSA6IHRoaXMucHJvdGVjdGVkLmNhbGwoe3VzZXIsIHVzZXJJZH0sIChmaWxlUmVmIHx8IG51bGwpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQgPSAhIXVzZXJJZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgoaHR0cCAmJiAocmVzdWx0ID09PSB0cnVlKSkgfHwgIWh0dHApIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJjID0gXy5pc051bWJlcihyZXN1bHQpID8gcmVzdWx0IDogNDAxO1xuICAgICAgICB0aGlzLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbi5fY2hlY2tBY2Nlc3NdIFdBUk46IEFjY2VzcyBkZW5pZWQhJyk7XG4gICAgICAgIGlmIChodHRwKSB7XG4gICAgICAgICAgY29uc3QgdGV4dCA9ICdBY2Nlc3MgZGVuaWVkISc7XG4gICAgICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmhlYWRlcnNTZW50KSB7XG4gICAgICAgICAgICBodHRwLnJlc3BvbnNlLndyaXRlSGVhZChyYywge1xuICAgICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW4nLFxuICAgICAgICAgICAgICAnQ29udGVudC1MZW5ndGgnOiB0ZXh0Lmxlbmd0aFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmZpbmlzaGVkKSB7XG4gICAgICAgICAgICBodHRwLnJlc3BvbnNlLmVuZCh0ZXh0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgdGhpcy5fbWV0aG9kTmFtZXMgPSB7XG4gICAgICBfQWJvcnQ6IGBfRmlsZXNDb2xsZWN0aW9uQWJvcnRfJHt0aGlzLmNvbGxlY3Rpb25OYW1lfWAsXG4gICAgICBfV3JpdGU6IGBfRmlsZXNDb2xsZWN0aW9uV3JpdGVfJHt0aGlzLmNvbGxlY3Rpb25OYW1lfWAsXG4gICAgICBfU3RhcnQ6IGBfRmlsZXNDb2xsZWN0aW9uU3RhcnRfJHt0aGlzLmNvbGxlY3Rpb25OYW1lfWAsXG4gICAgICBfUmVtb3ZlOiBgX0ZpbGVzQ29sbGVjdGlvblJlbW92ZV8ke3RoaXMuY29sbGVjdGlvbk5hbWV9YFxuICAgIH07XG5cbiAgICB0aGlzLm9uKCdfaGFuZGxlVXBsb2FkJywgdGhpcy5faGFuZGxlVXBsb2FkKTtcbiAgICB0aGlzLm9uKCdfZmluaXNoVXBsb2FkJywgdGhpcy5fZmluaXNoVXBsb2FkKTtcblxuICAgIGlmICghdGhpcy5kaXNhYmxlVXBsb2FkICYmICF0aGlzLmRpc2FibGVEb3dubG9hZCkge1xuICAgICAgV2ViQXBwLmNvbm5lY3RIYW5kbGVycy51c2UoKGh0dHBSZXEsIGh0dHBSZXNwLCBuZXh0KSA9PiB7XG4gICAgICAgIGlmICghdGhpcy5kaXNhYmxlVXBsb2FkICYmICEhfmh0dHBSZXEuX3BhcnNlZFVybC5wYXRoLmluZGV4T2YoYCR7dGhpcy5kb3dubG9hZFJvdXRlfS8ke3RoaXMuY29sbGVjdGlvbk5hbWV9L19fdXBsb2FkYCkpIHtcbiAgICAgICAgICBpZiAoaHR0cFJlcS5tZXRob2QgPT09ICdQT1NUJykge1xuICAgICAgICAgICAgY29uc3QgaGFuZGxlRXJyb3IgPSAoX2Vycm9yKSA9PiB7XG4gICAgICAgICAgICAgIGxldCBlcnJvciA9IF9lcnJvcjtcbiAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdbRmlsZXNDb2xsZWN0aW9uXSBbVXBsb2FkXSBbSFRUUF0gRXhjZXB0aW9uOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgY29uc29sZS50cmFjZSgpO1xuXG4gICAgICAgICAgICAgIGlmICghaHR0cFJlc3AuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgICAgICAgICBodHRwUmVzcC53cml0ZUhlYWQoNTAwKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmICghaHR0cFJlc3AuZmluaXNoZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc09iamVjdChlcnJvcikgJiYgXy5pc0Z1bmN0aW9uKGVycm9yLnRvU3RyaW5nKSkge1xuICAgICAgICAgICAgICAgICAgZXJyb3IgPSBlcnJvci50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICghXy5pc1N0cmluZyhlcnJvcikpIHtcbiAgICAgICAgICAgICAgICAgIGVycm9yID0gJ1VuZXhwZWN0ZWQgZXJyb3IhJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBodHRwUmVzcC5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvciB9KSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGxldCBib2R5ID0gJyc7XG4gICAgICAgICAgICBodHRwUmVxLm9uKCdkYXRhJywgKGRhdGEpID0+IGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAgICAgYm9keSArPSBkYXRhO1xuICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICBodHRwUmVxLm9uKCdlbmQnLCAoKSA9PiBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbGV0IG9wdHM7XG4gICAgICAgICAgICAgICAgbGV0IHJlc3VsdDtcbiAgICAgICAgICAgICAgICBsZXQgdXNlcjtcblxuICAgICAgICAgICAgICAgIGlmIChodHRwUmVxLmhlYWRlcnNbJ3gtbXRvayddICYmIF8uaXNPYmplY3QoTWV0ZW9yLnNlcnZlci5zZXNzaW9ucykgJiYgXy5oYXMoTWV0ZW9yLnNlcnZlci5zZXNzaW9uc1todHRwUmVxLmhlYWRlcnNbJ3gtbXRvayddXSwgJ3VzZXJJZCcpKSB7XG4gICAgICAgICAgICAgICAgICB1c2VyID0ge1xuICAgICAgICAgICAgICAgICAgICB1c2VySWQ6IE1ldGVvci5zZXJ2ZXIuc2Vzc2lvbnNbaHR0cFJlcS5oZWFkZXJzWyd4LW10b2snXV0udXNlcklkXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICB1c2VyID0gdGhpcy5fZ2V0VXNlcih7cmVxdWVzdDogaHR0cFJlcSwgcmVzcG9uc2U6IGh0dHBSZXNwfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGh0dHBSZXEuaGVhZGVyc1sneC1zdGFydCddICE9PSAnMScpIHtcbiAgICAgICAgICAgICAgICAgIG9wdHMgPSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVJZDogaHR0cFJlcS5oZWFkZXJzWyd4LWZpbGVpZCddXG4gICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICBpZiAoaHR0cFJlcS5oZWFkZXJzWyd4LWVvZiddID09PSAnMScpIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0cy5lb2YgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBCdWZmZXIuZnJvbSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcHRzLmJpbkRhdGEgPSBCdWZmZXIuZnJvbShib2R5LCAnYmFzZTY0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoYnVmZkVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3B0cy5iaW5EYXRhID0gbmV3IEJ1ZmZlcihib2R5LCAnYmFzZTY0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIG9wdHMuYmluRGF0YSA9IG5ldyBCdWZmZXIoYm9keSwgJ2Jhc2U2NCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG9wdHMuY2h1bmtJZCA9IHBhcnNlSW50KGh0dHBSZXEuaGVhZGVyc1sneC1jaHVua2lkJ10pO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBjb25zdCBfY29udGludWVVcGxvYWQgPSB0aGlzLl9jb250aW51ZVVwbG9hZChvcHRzLmZpbGVJZCk7XG4gICAgICAgICAgICAgICAgICBpZiAoIV9jb250aW51ZVVwbG9hZCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwOCwgJ0NhblxcJ3QgY29udGludWUgdXBsb2FkLCBzZXNzaW9uIGV4cGlyZWQuIFN0YXJ0IHVwbG9hZCBhZ2Fpbi4nKTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgKHtyZXN1bHQsIG9wdHN9ICA9IHRoaXMuX3ByZXBhcmVVcGxvYWQoXy5leHRlbmQob3B0cywgX2NvbnRpbnVlVXBsb2FkKSwgdXNlci51c2VySWQsICdIVFRQJykpO1xuXG4gICAgICAgICAgICAgICAgICBpZiAob3B0cy5lb2YpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5faGFuZGxlVXBsb2FkKHJlc3VsdCwgb3B0cywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIGlmICghaHR0cFJlc3AuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0dHBSZXNwLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgIGlmIChfLmlzT2JqZWN0KHJlc3VsdC5maWxlKSAmJiByZXN1bHQuZmlsZS5tZXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuZmlsZS5tZXRhID0gZml4SlNPTlN0cmluZ2lmeShyZXN1bHQuZmlsZS5tZXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICBpZiAoIWh0dHBSZXNwLmZpbmlzaGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodHRwUmVzcC5lbmQoSlNPTi5zdHJpbmdpZnkocmVzdWx0KSk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ19oYW5kbGVVcGxvYWQnLCByZXN1bHQsIG9wdHMsIE5PT1ApO1xuXG4gICAgICAgICAgICAgICAgICBpZiAoIWh0dHBSZXNwLmhlYWRlcnNTZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGh0dHBSZXNwLndyaXRlSGVhZCgyMDQpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5maW5pc2hlZCkge1xuICAgICAgICAgICAgICAgICAgICBodHRwUmVzcC5lbmQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgb3B0cyA9IEpTT04ucGFyc2UoYm9keSk7XG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChqc29uRXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0NhblxcJ3QgcGFyc2UgaW5jb21pbmcgSlNPTiBmcm9tIENsaWVudCBvbiBbLmluc2VydCgpIHwgdXBsb2FkXSwgc29tZXRoaW5nIHdlbnQgd3JvbmchJywganNvbkVycik7XG4gICAgICAgICAgICAgICAgICAgIG9wdHMgPSB7ZmlsZToge319O1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAoIV8uaXNPYmplY3Qob3B0cy5maWxlKSkge1xuICAgICAgICAgICAgICAgICAgICBvcHRzLmZpbGUgPSB7fTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgb3B0cy5fX19zID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZSBTdGFydCBIVFRQXSAke29wdHMuZmlsZS5uYW1lIHx8ICdbbm8tbmFtZV0nfSAtICR7b3B0cy5maWxlSWR9YCk7XG4gICAgICAgICAgICAgICAgICBpZiAoXy5pc09iamVjdChvcHRzLmZpbGUpICYmIG9wdHMuZmlsZS5tZXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdHMuZmlsZS5tZXRhID0gZml4SlNPTlBhcnNlKG9wdHMuZmlsZS5tZXRhKTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgKHtyZXN1bHR9ID0gdGhpcy5fcHJlcGFyZVVwbG9hZChfLmNsb25lKG9wdHMpLCB1c2VyLnVzZXJJZCwgJ0hUVFAgU3RhcnQgTWV0aG9kJykpO1xuXG4gICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUocmVzdWx0Ll9pZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDAsICdDYW5cXCd0IHN0YXJ0IHVwbG9hZCwgZGF0YSBzdWJzdGl0dXRpb24gZGV0ZWN0ZWQhJyk7XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIG9wdHMuX2lkICAgICAgID0gb3B0cy5maWxlSWQ7XG4gICAgICAgICAgICAgICAgICBvcHRzLmNyZWF0ZWRBdCA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgICBvcHRzLm1heExlbmd0aCA9IG9wdHMuZmlsZUxlbmd0aDtcbiAgICAgICAgICAgICAgICAgIHRoaXMuX3ByZUNvbGxlY3Rpb24uaW5zZXJ0KF8ub21pdChvcHRzLCAnX19fcycpKTtcbiAgICAgICAgICAgICAgICAgIHRoaXMuX2NyZWF0ZVN0cmVhbShyZXN1bHQuX2lkLCByZXN1bHQucGF0aCwgXy5vbWl0KG9wdHMsICdfX19zJykpO1xuXG4gICAgICAgICAgICAgICAgICBpZiAob3B0cy5yZXR1cm5NZXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghaHR0cFJlc3AuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBodHRwUmVzcC53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICghaHR0cFJlc3AuZmluaXNoZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBodHRwUmVzcC5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgICAgdXBsb2FkUm91dGU6IGAke3RoaXMuZG93bmxvYWRSb3V0ZX0vJHt0aGlzLmNvbGxlY3Rpb25OYW1lfS9fX3VwbG9hZGAsXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlOiByZXN1bHRcbiAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghaHR0cFJlc3AuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBodHRwUmVzcC53cml0ZUhlYWQoMjA0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICghaHR0cFJlc3AuZmluaXNoZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBodHRwUmVzcC5lbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBjYXRjaCAoaHR0cFJlc3BFcnIpIHtcbiAgICAgICAgICAgICAgICBoYW5kbGVFcnJvcihodHRwUmVzcEVycik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMuZGlzYWJsZURvd25sb2FkKSB7XG4gICAgICAgICAgbGV0IGh0dHA7XG4gICAgICAgICAgbGV0IHBhcmFtcztcbiAgICAgICAgICBsZXQgdXJpO1xuICAgICAgICAgIGxldCB1cmlzO1xuXG4gICAgICAgICAgaWYgKCF0aGlzLnB1YmxpYykge1xuICAgICAgICAgICAgaWYgKCEhfmh0dHBSZXEuX3BhcnNlZFVybC5wYXRoLmluZGV4T2YoYCR7dGhpcy5kb3dubG9hZFJvdXRlfS8ke3RoaXMuY29sbGVjdGlvbk5hbWV9YCkpIHtcbiAgICAgICAgICAgICAgdXJpID0gaHR0cFJlcS5fcGFyc2VkVXJsLnBhdGgucmVwbGFjZShgJHt0aGlzLmRvd25sb2FkUm91dGV9LyR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gLCAnJyk7XG4gICAgICAgICAgICAgIGlmICh1cmkuaW5kZXhPZignLycpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdXJpID0gdXJpLnN1YnN0cmluZygxKTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHVyaXMgPSB1cmkuc3BsaXQoJy8nKTtcbiAgICAgICAgICAgICAgaWYgKHVyaXMubGVuZ3RoID09PSAzKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zID0ge1xuICAgICAgICAgICAgICAgICAgX2lkOiB1cmlzWzBdLFxuICAgICAgICAgICAgICAgICAgcXVlcnk6IGh0dHBSZXEuX3BhcnNlZFVybC5xdWVyeSA/IG5vZGVRcy5wYXJzZShodHRwUmVxLl9wYXJzZWRVcmwucXVlcnkpIDoge30sXG4gICAgICAgICAgICAgICAgICBuYW1lOiB1cmlzWzJdLnNwbGl0KCc/JylbMF0sXG4gICAgICAgICAgICAgICAgICB2ZXJzaW9uOiB1cmlzWzFdXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGh0dHAgPSB7cmVxdWVzdDogaHR0cFJlcSwgcmVzcG9uc2U6IGh0dHBSZXNwLCBwYXJhbXN9O1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9jaGVja0FjY2VzcyhodHRwKSkge1xuICAgICAgICAgICAgICAgICAgdGhpcy5kb3dubG9hZChodHRwLCB1cmlzWzFdLCB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZSh1cmlzWzBdKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoISF+aHR0cFJlcS5fcGFyc2VkVXJsLnBhdGguaW5kZXhPZihgJHt0aGlzLmRvd25sb2FkUm91dGV9YCkpIHtcbiAgICAgICAgICAgICAgdXJpID0gaHR0cFJlcS5fcGFyc2VkVXJsLnBhdGgucmVwbGFjZShgJHt0aGlzLmRvd25sb2FkUm91dGV9YCwgJycpO1xuICAgICAgICAgICAgICBpZiAodXJpLmluZGV4T2YoJy8nKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHVyaSA9IHVyaS5zdWJzdHJpbmcoMSk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICB1cmlzICA9IHVyaS5zcGxpdCgnLycpO1xuICAgICAgICAgICAgICBsZXQgX2ZpbGUgPSB1cmlzW3VyaXMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgIGlmIChfZmlsZSkge1xuICAgICAgICAgICAgICAgIGxldCB2ZXJzaW9uO1xuICAgICAgICAgICAgICAgIGlmICghIX5fZmlsZS5pbmRleE9mKCctJykpIHtcbiAgICAgICAgICAgICAgICAgIHZlcnNpb24gPSBfZmlsZS5zcGxpdCgnLScpWzBdO1xuICAgICAgICAgICAgICAgICAgX2ZpbGUgICA9IF9maWxlLnNwbGl0KCctJylbMV0uc3BsaXQoJz8nKVswXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgdmVyc2lvbiA9ICdvcmlnaW5hbCc7XG4gICAgICAgICAgICAgICAgICBfZmlsZSAgID0gX2ZpbGUuc3BsaXQoJz8nKVswXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBwYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgICBxdWVyeTogaHR0cFJlcS5fcGFyc2VkVXJsLnF1ZXJ5ID8gbm9kZVFzLnBhcnNlKGh0dHBSZXEuX3BhcnNlZFVybC5xdWVyeSkgOiB7fSxcbiAgICAgICAgICAgICAgICAgIGZpbGU6IF9maWxlLFxuICAgICAgICAgICAgICAgICAgX2lkOiBfZmlsZS5zcGxpdCgnLicpWzBdLFxuICAgICAgICAgICAgICAgICAgdmVyc2lvbixcbiAgICAgICAgICAgICAgICAgIG5hbWU6IF9maWxlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBodHRwID0ge3JlcXVlc3Q6IGh0dHBSZXEsIHJlc3BvbnNlOiBodHRwUmVzcCwgcGFyYW1zfTtcbiAgICAgICAgICAgICAgICB0aGlzLmRvd25sb2FkKGh0dHAsIHZlcnNpb24sIHRoaXMuY29sbGVjdGlvbi5maW5kT25lKHBhcmFtcy5faWQpKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5kaXNhYmxlVXBsb2FkKSB7XG4gICAgICBjb25zdCBfbWV0aG9kcyA9IHt9O1xuXG4gICAgICAvLyBNZXRob2QgdXNlZCB0byByZW1vdmUgZmlsZVxuICAgICAgLy8gZnJvbSBDbGllbnQgc2lkZVxuICAgICAgX21ldGhvZHNbdGhpcy5fbWV0aG9kTmFtZXMuX1JlbW92ZV0gPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgICAgY2hlY2soc2VsZWN0b3IsIE1hdGNoLk9uZU9mKFN0cmluZywgT2JqZWN0KSk7XG4gICAgICAgIHNlbGYuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbVW5saW5rIE1ldGhvZF0gWy5yZW1vdmUoJHtzZWxlY3Rvcn0pXWApO1xuXG4gICAgICAgIGlmIChzZWxmLmFsbG93Q2xpZW50Q29kZSkge1xuICAgICAgICAgIGlmIChzZWxmLm9uQmVmb3JlUmVtb3ZlICYmIF8uaXNGdW5jdGlvbihzZWxmLm9uQmVmb3JlUmVtb3ZlKSkge1xuICAgICAgICAgICAgY29uc3QgdXNlcklkID0gdGhpcy51c2VySWQ7XG4gICAgICAgICAgICBjb25zdCB1c2VyRnVuY3MgPSB7XG4gICAgICAgICAgICAgIHVzZXJJZDogdGhpcy51c2VySWQsXG4gICAgICAgICAgICAgIHVzZXIoKSB7XG4gICAgICAgICAgICAgICAgaWYgKE1ldGVvci51c2Vycykge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIE1ldGVvci51c2Vycy5maW5kT25lKHVzZXJJZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAoIXNlbGYub25CZWZvcmVSZW1vdmUuY2FsbCh1c2VyRnVuY3MsIChzZWxmLmZpbmQoc2VsZWN0b3IpIHx8IG51bGwpKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgJ1tGaWxlc0NvbGxlY3Rpb25dIFtyZW1vdmVdIE5vdCBwZXJtaXR0ZWQhJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgY3Vyc29yID0gc2VsZi5maW5kKHNlbGVjdG9yKTtcbiAgICAgICAgICBpZiAoY3Vyc29yLmNvdW50KCkgPiAwKSB7XG4gICAgICAgICAgICBzZWxmLnJlbW92ZShzZWxlY3Rvcik7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDQsICdDdXJzb3IgaXMgZW1wdHksIG5vIGZpbGVzIGlzIHJlbW92ZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMSwgJ1tGaWxlc0NvbGxlY3Rpb25dIFtyZW1vdmVdIFJ1biBjb2RlIGZyb20gY2xpZW50IGlzIG5vdCBhbGxvd2VkIScpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG5cbiAgICAgIC8vIE1ldGhvZCB1c2VkIHRvIHJlY2VpdmUgXCJmaXJzdCBieXRlXCIgb2YgdXBsb2FkXG4gICAgICAvLyBhbmQgYWxsIGZpbGUncyBtZXRhLWRhdGEsIHNvXG4gICAgICAvLyBpdCB3b24ndCBiZSB0cmFuc2ZlcnJlZCB3aXRoIGV2ZXJ5IGNodW5rXG4gICAgICAvLyBCYXNpY2FsbHkgaXQgcHJlcGFyZXMgZXZlcnl0aGluZ1xuICAgICAgLy8gU28gdXNlciBjYW4gcGF1c2UvZGlzY29ubmVjdCBhbmRcbiAgICAgIC8vIGNvbnRpbnVlIHVwbG9hZCBsYXRlciwgZHVyaW5nIGBjb250aW51ZVVwbG9hZFRUTGBcbiAgICAgIF9tZXRob2RzW3RoaXMuX21ldGhvZE5hbWVzLl9TdGFydF0gPSBmdW5jdGlvbiAob3B0cywgcmV0dXJuTWV0YSkge1xuICAgICAgICBjaGVjayhvcHRzLCB7XG4gICAgICAgICAgZmlsZTogT2JqZWN0LFxuICAgICAgICAgIGZpbGVJZDogU3RyaW5nLFxuICAgICAgICAgIEZTTmFtZTogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcbiAgICAgICAgICBjaHVua1NpemU6IE51bWJlcixcbiAgICAgICAgICBmaWxlTGVuZ3RoOiBOdW1iZXJcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2hlY2socmV0dXJuTWV0YSwgTWF0Y2guT3B0aW9uYWwoQm9vbGVhbikpO1xuXG4gICAgICAgIHNlbGYuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZSBTdGFydCBNZXRob2RdICR7b3B0cy5maWxlLm5hbWV9IC0gJHtvcHRzLmZpbGVJZH1gKTtcbiAgICAgICAgb3B0cy5fX19zID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgeyByZXN1bHQgfSA9IHNlbGYuX3ByZXBhcmVVcGxvYWQoXy5jbG9uZShvcHRzKSwgdGhpcy51c2VySWQsICdERFAgU3RhcnQgTWV0aG9kJyk7XG5cbiAgICAgICAgaWYgKHNlbGYuY29sbGVjdGlvbi5maW5kT25lKHJlc3VsdC5faWQpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDAsICdDYW5cXCd0IHN0YXJ0IHVwbG9hZCwgZGF0YSBzdWJzdGl0dXRpb24gZGV0ZWN0ZWQhJyk7XG4gICAgICAgIH1cblxuICAgICAgICBvcHRzLl9pZCAgICAgICA9IG9wdHMuZmlsZUlkO1xuICAgICAgICBvcHRzLmNyZWF0ZWRBdCA9IG5ldyBEYXRlKCk7XG4gICAgICAgIG9wdHMubWF4TGVuZ3RoID0gb3B0cy5maWxlTGVuZ3RoO1xuICAgICAgICBzZWxmLl9wcmVDb2xsZWN0aW9uLmluc2VydChfLm9taXQob3B0cywgJ19fX3MnKSk7XG4gICAgICAgIHNlbGYuX2NyZWF0ZVN0cmVhbShyZXN1bHQuX2lkLCByZXN1bHQucGF0aCwgXy5vbWl0KG9wdHMsICdfX19zJykpO1xuXG4gICAgICAgIGlmIChyZXR1cm5NZXRhKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHVwbG9hZFJvdXRlOiBgJHtzZWxmLmRvd25sb2FkUm91dGV9LyR7c2VsZi5jb2xsZWN0aW9uTmFtZX0vX191cGxvYWRgLFxuICAgICAgICAgICAgZmlsZTogcmVzdWx0XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH07XG5cblxuICAgICAgLy8gTWV0aG9kIHVzZWQgdG8gd3JpdGUgZmlsZSBjaHVua3NcbiAgICAgIC8vIGl0IHJlY2VpdmVzIHZlcnkgbGltaXRlZCBhbW91bnQgb2YgbWV0YS1kYXRhXG4gICAgICAvLyBUaGlzIG1ldGhvZCBhbHNvIHJlc3BvbnNpYmxlIGZvciBFT0ZcbiAgICAgIF9tZXRob2RzW3RoaXMuX21ldGhvZE5hbWVzLl9Xcml0ZV0gPSBmdW5jdGlvbiAob3B0cykge1xuICAgICAgICBsZXQgcmVzdWx0O1xuICAgICAgICBjaGVjayhvcHRzLCB7XG4gICAgICAgICAgZW9mOiBNYXRjaC5PcHRpb25hbChCb29sZWFuKSxcbiAgICAgICAgICBmaWxlSWQ6IFN0cmluZyxcbiAgICAgICAgICBiaW5EYXRhOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpLFxuICAgICAgICAgIGNodW5rSWQ6IE1hdGNoLk9wdGlvbmFsKE51bWJlcilcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKG9wdHMuYmluRGF0YSkge1xuICAgICAgICAgIGlmICh0eXBlb2YgQnVmZmVyLmZyb20gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIG9wdHMuYmluRGF0YSA9IEJ1ZmZlci5mcm9tKG9wdHMuYmluRGF0YSwgJ2Jhc2U2NCcpO1xuICAgICAgICAgICAgfSBjYXRjaCAoYnVmZkVycikge1xuICAgICAgICAgICAgICBvcHRzLmJpbkRhdGEgPSBuZXcgQnVmZmVyKG9wdHMuYmluRGF0YSwgJ2Jhc2U2NCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcHRzLmJpbkRhdGEgPSBuZXcgQnVmZmVyKG9wdHMuYmluRGF0YSwgJ2Jhc2U2NCcpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IF9jb250aW51ZVVwbG9hZCA9IHNlbGYuX2NvbnRpbnVlVXBsb2FkKG9wdHMuZmlsZUlkKTtcbiAgICAgICAgaWYgKCFfY29udGludWVVcGxvYWQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwOCwgJ0NhblxcJ3QgY29udGludWUgdXBsb2FkLCBzZXNzaW9uIGV4cGlyZWQuIFN0YXJ0IHVwbG9hZCBhZ2Fpbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudW5ibG9jaygpO1xuICAgICAgICAoe3Jlc3VsdCwgb3B0c30gPSBzZWxmLl9wcmVwYXJlVXBsb2FkKF8uZXh0ZW5kKG9wdHMsIF9jb250aW51ZVVwbG9hZCksIHRoaXMudXNlcklkLCAnRERQJykpO1xuXG4gICAgICAgIGlmIChvcHRzLmVvZikge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gTWV0ZW9yLndyYXBBc3luYyhzZWxmLl9oYW5kbGVVcGxvYWQuYmluZChzZWxmLCByZXN1bHQsIG9wdHMpKSgpO1xuICAgICAgICAgIH0gY2F0Y2ggKGhhbmRsZVVwbG9hZEVycikge1xuICAgICAgICAgICAgc2VsZi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtXcml0ZSBNZXRob2RdIFtERFBdIEV4Y2VwdGlvbjonLCBoYW5kbGVVcGxvYWRFcnIpO1xuICAgICAgICAgICAgdGhyb3cgaGFuZGxlVXBsb2FkRXJyO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZWxmLmVtaXQoJ19oYW5kbGVVcGxvYWQnLCByZXN1bHQsIG9wdHMsIE5PT1ApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfTtcblxuICAgICAgLy8gTWV0aG9kIHVzZWQgdG8gQWJvcnQgdXBsb2FkXG4gICAgICAvLyAtIEZlZWluZyBtZW1vcnkgYnkgLmVuZCgpaW5nIHdyaXRhYmxlU3RyZWFtc1xuICAgICAgLy8gLSBSZW1vdmluZyB0ZW1wb3JhcnkgcmVjb3JkIGZyb20gQF9wcmVDb2xsZWN0aW9uXG4gICAgICAvLyAtIFJlbW92aW5nIHJlY29yZCBmcm9tIEBjb2xsZWN0aW9uXG4gICAgICAvLyAtIC51bmxpbmsoKWluZyBjaHVua3MgZnJvbSBGU1xuICAgICAgX21ldGhvZHNbdGhpcy5fbWV0aG9kTmFtZXMuX0Fib3J0XSA9IGZ1bmN0aW9uIChfaWQpIHtcbiAgICAgICAgY2hlY2soX2lkLCBTdHJpbmcpO1xuXG4gICAgICAgIGNvbnN0IF9jb250aW51ZVVwbG9hZCA9IHNlbGYuX2NvbnRpbnVlVXBsb2FkKF9pZCk7XG4gICAgICAgIHNlbGYuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbQWJvcnQgTWV0aG9kXTogJHtfaWR9IC0gJHsoXy5pc09iamVjdChfY29udGludWVVcGxvYWQuZmlsZSkgPyBfY29udGludWVVcGxvYWQuZmlsZS5wYXRoIDogJycpfWApO1xuXG4gICAgICAgIGlmIChzZWxmLl9jdXJyZW50VXBsb2FkcyAmJiBzZWxmLl9jdXJyZW50VXBsb2Fkc1tfaWRdKSB7XG4gICAgICAgICAgc2VsZi5fY3VycmVudFVwbG9hZHNbX2lkXS5zdG9wKCk7XG4gICAgICAgICAgc2VsZi5fY3VycmVudFVwbG9hZHNbX2lkXS5hYm9ydCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF9jb250aW51ZVVwbG9hZCkge1xuICAgICAgICAgIHNlbGYuX3ByZUNvbGxlY3Rpb24ucmVtb3ZlKHtfaWR9KTtcbiAgICAgICAgICBzZWxmLnJlbW92ZSh7X2lkfSk7XG4gICAgICAgICAgaWYgKF8uaXNPYmplY3QoX2NvbnRpbnVlVXBsb2FkLmZpbGUpICYmIF9jb250aW51ZVVwbG9hZC5maWxlLnBhdGgpIHtcbiAgICAgICAgICAgIHNlbGYudW5saW5rKHtfaWQsIHBhdGg6IF9jb250aW51ZVVwbG9hZC5maWxlLnBhdGh9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9O1xuXG4gICAgICBNZXRlb3IubWV0aG9kcyhfbWV0aG9kcyk7XG4gICAgfVxuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIF9wcmVwYXJlVXBsb2FkXG4gICAqIEBzdW1tYXJ5IEludGVybmFsIG1ldGhvZC4gVXNlZCB0byBvcHRpbWl6ZSByZWNlaXZlZCBkYXRhIGFuZCBjaGVjayB1cGxvYWQgcGVybWlzc2lvblxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgX3ByZXBhcmVVcGxvYWQob3B0cyA9IHt9LCB1c2VySWQsIHRyYW5zcG9ydCkge1xuICAgIGxldCBjdHg7XG4gICAgaWYgKCFfLmlzQm9vbGVhbihvcHRzLmVvZikpIHtcbiAgICAgIG9wdHMuZW9mID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFvcHRzLmJpbkRhdGEpIHtcbiAgICAgIG9wdHMuYmluRGF0YSA9ICdFT0YnO1xuICAgIH1cblxuICAgIGlmICghXy5pc051bWJlcihvcHRzLmNodW5rSWQpKSB7XG4gICAgICBvcHRzLmNodW5rSWQgPSAtMTtcbiAgICB9XG5cbiAgICBpZiAoIV8uaXNTdHJpbmcob3B0cy5GU05hbWUpKSB7XG4gICAgICBvcHRzLkZTTmFtZSA9IG9wdHMuZmlsZUlkO1xuICAgIH1cblxuICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbVXBsb2FkXSBbJHt0cmFuc3BvcnR9XSBHb3QgIyR7b3B0cy5jaHVua0lkfS8ke29wdHMuZmlsZUxlbmd0aH0gY2h1bmtzLCBkc3Q6ICR7b3B0cy5maWxlLm5hbWUgfHwgb3B0cy5maWxlLmZpbGVOYW1lfWApO1xuXG4gICAgY29uc3QgZmlsZU5hbWUgPSB0aGlzLl9nZXRGaWxlTmFtZShvcHRzLmZpbGUpO1xuICAgIGNvbnN0IHtleHRlbnNpb24sIGV4dGVuc2lvbldpdGhEb3R9ID0gdGhpcy5fZ2V0RXh0KGZpbGVOYW1lKTtcblxuICAgIGlmICghXy5pc09iamVjdChvcHRzLmZpbGUubWV0YSkpIHtcbiAgICAgIG9wdHMuZmlsZS5tZXRhID0ge307XG4gICAgfVxuXG4gICAgbGV0IHJlc3VsdCAgICAgICA9IG9wdHMuZmlsZTtcbiAgICByZXN1bHQubmFtZSAgICAgID0gZmlsZU5hbWU7XG4gICAgcmVzdWx0Lm1ldGEgICAgICA9IG9wdHMuZmlsZS5tZXRhO1xuICAgIHJlc3VsdC5leHRlbnNpb24gPSBleHRlbnNpb247XG4gICAgcmVzdWx0LmV4dCAgICAgICA9IGV4dGVuc2lvbjtcbiAgICByZXN1bHQuX2lkICAgICAgID0gb3B0cy5maWxlSWQ7XG4gICAgcmVzdWx0LnVzZXJJZCAgICA9IHVzZXJJZCB8fCBudWxsO1xuICAgIG9wdHMuRlNOYW1lICAgICAgPSBvcHRzLkZTTmFtZS5yZXBsYWNlKC8oW15hLXowLTlcXC1cXF9dKykvZ2ksICctJyk7XG4gICAgcmVzdWx0LnBhdGggICAgICA9IGAke3RoaXMuc3RvcmFnZVBhdGgocmVzdWx0KX0ke25vZGVQYXRoLnNlcH0ke29wdHMuRlNOYW1lfSR7ZXh0ZW5zaW9uV2l0aERvdH1gO1xuICAgIHJlc3VsdCAgICAgICAgICAgPSBfLmV4dGVuZChyZXN1bHQsIHRoaXMuX2RhdGFUb1NjaGVtYShyZXN1bHQpKTtcblxuICAgIGlmICh0aGlzLm9uQmVmb3JlVXBsb2FkICYmIF8uaXNGdW5jdGlvbih0aGlzLm9uQmVmb3JlVXBsb2FkKSkge1xuICAgICAgY3R4ID0gXy5leHRlbmQoe1xuICAgICAgICBmaWxlOiBvcHRzLmZpbGVcbiAgICAgIH0sIHtcbiAgICAgICAgY2h1bmtJZDogb3B0cy5jaHVua0lkLFxuICAgICAgICB1c2VySWQ6IHJlc3VsdC51c2VySWQsXG4gICAgICAgIHVzZXIoKSB7XG4gICAgICAgICAgaWYgKE1ldGVvci51c2VycyAmJiByZXN1bHQudXNlcklkKSB7XG4gICAgICAgICAgICByZXR1cm4gTWV0ZW9yLnVzZXJzLmZpbmRPbmUocmVzdWx0LnVzZXJJZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9LFxuICAgICAgICBlb2Y6IG9wdHMuZW9mXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGlzVXBsb2FkQWxsb3dlZCA9IHRoaXMub25CZWZvcmVVcGxvYWQuY2FsbChjdHgsIHJlc3VsdCk7XG5cbiAgICAgIGlmIChpc1VwbG9hZEFsbG93ZWQgIT09IHRydWUpIHtcbiAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIF8uaXNTdHJpbmcoaXNVcGxvYWRBbGxvd2VkKSA/IGlzVXBsb2FkQWxsb3dlZCA6ICdAb25CZWZvcmVVcGxvYWQoKSByZXR1cm5lZCBmYWxzZScpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKChvcHRzLl9fX3MgPT09IHRydWUpICYmIHRoaXMub25Jbml0aWF0ZVVwbG9hZCAmJiBfLmlzRnVuY3Rpb24odGhpcy5vbkluaXRpYXRlVXBsb2FkKSkge1xuICAgICAgICAgIHRoaXMub25Jbml0aWF0ZVVwbG9hZC5jYWxsKGN0eCwgcmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoKG9wdHMuX19fcyA9PT0gdHJ1ZSkgJiYgdGhpcy5vbkluaXRpYXRlVXBsb2FkICYmIF8uaXNGdW5jdGlvbih0aGlzLm9uSW5pdGlhdGVVcGxvYWQpKSB7XG4gICAgICBjdHggPSBfLmV4dGVuZCh7XG4gICAgICAgIGZpbGU6IG9wdHMuZmlsZVxuICAgICAgfSwge1xuICAgICAgICBjaHVua0lkOiBvcHRzLmNodW5rSWQsXG4gICAgICAgIHVzZXJJZDogcmVzdWx0LnVzZXJJZCxcbiAgICAgICAgdXNlcigpIHtcbiAgICAgICAgICBpZiAoTWV0ZW9yLnVzZXJzICYmIHJlc3VsdC51c2VySWQpIHtcbiAgICAgICAgICAgIHJldHVybiBNZXRlb3IudXNlcnMuZmluZE9uZShyZXN1bHQudXNlcklkKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0sXG4gICAgICAgIGVvZjogb3B0cy5lb2ZcbiAgICAgIH0pO1xuICAgICAgdGhpcy5vbkluaXRpYXRlVXBsb2FkLmNhbGwoY3R4LCByZXN1bHQpO1xuICAgIH1cblxuICAgIHJldHVybiB7cmVzdWx0LCBvcHRzfTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSBfZmluaXNoVXBsb2FkXG4gICAqIEBzdW1tYXJ5IEludGVybmFsIG1ldGhvZC4gRmluaXNoIHVwbG9hZCwgY2xvc2UgV3JpdGFibGUgc3RyZWFtLCBhZGQgcmVjb3JkIHRvIE1vbmdvREIgYW5kIGZsdXNoIHVzZWQgbWVtb3J5XG4gICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAqL1xuICBfZmluaXNoVXBsb2FkKHJlc3VsdCwgb3B0cywgY2IpIHtcbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW1VwbG9hZF0gW2ZpbmlzaChpbmcpVXBsb2FkXSAtPiAke3Jlc3VsdC5wYXRofWApO1xuICAgIGZzLmNobW9kKHJlc3VsdC5wYXRoLCB0aGlzLnBlcm1pc3Npb25zLCBOT09QKTtcbiAgICByZXN1bHQudHlwZSAgID0gdGhpcy5fZ2V0TWltZVR5cGUob3B0cy5maWxlKTtcbiAgICByZXN1bHQucHVibGljID0gdGhpcy5wdWJsaWM7XG4gICAgdGhpcy5fdXBkYXRlRmlsZVR5cGVzKHJlc3VsdCk7XG5cbiAgICB0aGlzLmNvbGxlY3Rpb24uaW5zZXJ0KF8uY2xvbmUocmVzdWx0KSwgKGVycm9yLCBfaWQpID0+IHtcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICBjYiAmJiBjYihlcnJvcik7XG4gICAgICAgIHRoaXMuX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbVXBsb2FkXSBbX2ZpbmlzaFVwbG9hZF0gRXJyb3I6JywgZXJyb3IpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fcHJlQ29sbGVjdGlvbi51cGRhdGUoe19pZDogb3B0cy5maWxlSWR9LCB7JHNldDoge2lzRmluaXNoZWQ6IHRydWV9fSk7XG4gICAgICAgIHJlc3VsdC5faWQgPSBfaWQ7XG4gICAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbVXBsb2FkXSBbZmluaXNoKGVkKVVwbG9hZF0gLT4gJHtyZXN1bHQucGF0aH1gKTtcbiAgICAgICAgdGhpcy5vbkFmdGVyVXBsb2FkICYmIHRoaXMub25BZnRlclVwbG9hZC5jYWxsKHRoaXMsIHJlc3VsdCk7XG4gICAgICAgIHRoaXMuZW1pdCgnYWZ0ZXJVcGxvYWQnLCByZXN1bHQpO1xuICAgICAgICBjYiAmJiBjYihudWxsLCByZXN1bHQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIF9oYW5kbGVVcGxvYWRcbiAgICogQHN1bW1hcnkgSW50ZXJuYWwgbWV0aG9kIHRvIGhhbmRsZSB1cGxvYWQgcHJvY2VzcywgcGlwZSBpbmNvbWluZyBkYXRhIHRvIFdyaXRhYmxlIHN0cmVhbVxuICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgKi9cbiAgX2hhbmRsZVVwbG9hZChyZXN1bHQsIG9wdHMsIGNiKSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmIChvcHRzLmVvZikge1xuICAgICAgICB0aGlzLl9jdXJyZW50VXBsb2Fkc1tyZXN1bHQuX2lkXS5lbmQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMuZW1pdCgnX2ZpbmlzaFVwbG9hZCcsIHJlc3VsdCwgb3B0cywgY2IpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRVcGxvYWRzW3Jlc3VsdC5faWRdLndyaXRlKG9wdHMuY2h1bmtJZCwgb3B0cy5iaW5EYXRhLCBjYik7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhpcy5fZGVidWcoJ1tfaGFuZGxlVXBsb2FkXSBbRVhDRVBUSU9OOl0nLCBlKTtcbiAgICAgIGNiICYmIGNiKGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIF9nZXRNaW1lVHlwZVxuICAgKiBAcGFyYW0ge09iamVjdH0gZmlsZURhdGEgLSBGaWxlIE9iamVjdFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGZpbGUncyBtaW1lLXR5cGVcbiAgICogQHJldHVybnMge1N0cmluZ31cbiAgICovXG4gIF9nZXRNaW1lVHlwZShmaWxlRGF0YSkge1xuICAgIGxldCBtaW1lO1xuICAgIGNoZWNrKGZpbGVEYXRhLCBPYmplY3QpO1xuICAgIGlmIChfLmlzT2JqZWN0KGZpbGVEYXRhKSAmJiBmaWxlRGF0YS50eXBlKSB7XG4gICAgICBtaW1lID0gZmlsZURhdGEudHlwZTtcbiAgICB9XG5cbiAgICBpZiAoZmlsZURhdGEucGF0aCAmJiAoIW1pbWUgfHwgIV8uaXNTdHJpbmcobWltZSkpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBsZXQgYnVmICAgPSBuZXcgQnVmZmVyKDI2Mik7XG4gICAgICAgIGNvbnN0IGZkICA9IGZzLm9wZW5TeW5jKGZpbGVEYXRhLnBhdGgsICdyJyk7XG4gICAgICAgIGNvbnN0IGJyICA9IGZzLnJlYWRTeW5jKGZkLCBidWYsIDAsIDI2MiwgMCk7XG4gICAgICAgIGZzLmNsb3NlKGZkLCBOT09QKTtcbiAgICAgICAgaWYgKGJyIDwgMjYyKSB7XG4gICAgICAgICAgYnVmID0gYnVmLnNsaWNlKDAsIGJyKTtcbiAgICAgICAgfVxuICAgICAgICAoe21pbWV9ID0gZmlsZVR5cGUoYnVmKSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIFdlJ3JlIGdvb2RcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIW1pbWUgfHwgIV8uaXNTdHJpbmcobWltZSkpIHtcbiAgICAgIG1pbWUgPSAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJztcbiAgICB9XG4gICAgcmV0dXJuIG1pbWU7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSBfZ2V0VXNlclxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIG9iamVjdCB3aXRoIGB1c2VySWRgIGFuZCBgdXNlcigpYCBtZXRob2Qgd2hpY2ggcmV0dXJuIHVzZXIncyBvYmplY3RcbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIF9nZXRVc2VyKGh0dHApIHtcbiAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICB1c2VyKCkgeyByZXR1cm4gbnVsbDsgfSxcbiAgICAgIHVzZXJJZDogbnVsbFxuICAgIH07XG5cbiAgICBpZiAoaHR0cCkge1xuICAgICAgbGV0IG10b2sgPSBudWxsO1xuICAgICAgaWYgKGh0dHAucmVxdWVzdC5oZWFkZXJzWyd4LW10b2snXSkge1xuICAgICAgICBtdG9rID0gaHR0cC5yZXF1ZXN0LmhlYWRlcnNbJ3gtbXRvayddO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgY29va2llID0gaHR0cC5yZXF1ZXN0LkNvb2tpZXM7XG4gICAgICAgIGlmIChjb29raWUuaGFzKCd4X210b2snKSkge1xuICAgICAgICAgIG10b2sgPSBjb29raWUuZ2V0KCd4X210b2snKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAobXRvaykge1xuICAgICAgICBjb25zdCB1c2VySWQgPSAoXy5pc09iamVjdChNZXRlb3Iuc2VydmVyLnNlc3Npb25zKSAmJiBfLmlzT2JqZWN0KE1ldGVvci5zZXJ2ZXIuc2Vzc2lvbnNbbXRva10pKSA/IE1ldGVvci5zZXJ2ZXIuc2Vzc2lvbnNbbXRva10udXNlcklkIDogdm9pZCAwO1xuXG4gICAgICAgIGlmICh1c2VySWQpIHtcbiAgICAgICAgICByZXN1bHQudXNlciAgID0gKCkgPT4gTWV0ZW9yLnVzZXJzLmZpbmRPbmUodXNlcklkKTtcbiAgICAgICAgICByZXN1bHQudXNlcklkID0gdXNlcklkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSB3cml0ZVxuICAgKiBAcGFyYW0ge0J1ZmZlcn0gYnVmZmVyIC0gQmluYXJ5IEZpbGUncyBCdWZmZXJcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgLSBPYmplY3Qgd2l0aCBmaWxlLWRhdGFcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMubmFtZSAtIEZpbGUgbmFtZSwgYWxpYXM6IGBmaWxlTmFtZWBcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMudHlwZSAtIEZpbGUgbWltZS10eXBlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzLm1ldGEgLSBGaWxlIGFkZGl0aW9uYWwgbWV0YS1kYXRhXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLnVzZXJJZCAtIFVzZXJJZCwgZGVmYXVsdCAqbnVsbCpcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZmlsZUlkIC0gX2lkLCBkZWZhdWx0ICpudWxsKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIGZ1bmN0aW9uKGVycm9yLCBmaWxlT2JqKXsuLi59XG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gcHJvY2VlZEFmdGVyVXBsb2FkIC0gUHJvY2VlZCBvbkFmdGVyVXBsb2FkIGhvb2tcbiAgICogQHN1bW1hcnkgV3JpdGUgYnVmZmVyIHRvIEZTIGFuZCBhZGQgdG8gRmlsZXNDb2xsZWN0aW9uIENvbGxlY3Rpb25cbiAgICogQHJldHVybnMge0ZpbGVzQ29sbGVjdGlvbn0gSW5zdGFuY2VcbiAgICovXG4gIHdyaXRlKGJ1ZmZlciwgb3B0cyA9IHt9LCBjYWxsYmFjaywgcHJvY2VlZEFmdGVyVXBsb2FkKSB7XG4gICAgdGhpcy5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFt3cml0ZSgpXScpO1xuXG4gICAgaWYgKF8uaXNGdW5jdGlvbihvcHRzKSkge1xuICAgICAgcHJvY2VlZEFmdGVyVXBsb2FkID0gY2FsbGJhY2s7XG4gICAgICBjYWxsYmFjayA9IG9wdHM7XG4gICAgICBvcHRzICAgICA9IHt9O1xuICAgIH0gZWxzZSBpZiAoXy5pc0Jvb2xlYW4oY2FsbGJhY2spKSB7XG4gICAgICBwcm9jZWVkQWZ0ZXJVcGxvYWQgPSBjYWxsYmFjaztcbiAgICB9IGVsc2UgaWYgKF8uaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgICBwcm9jZWVkQWZ0ZXJVcGxvYWQgPSBvcHRzO1xuICAgIH1cblxuICAgIGNoZWNrKG9wdHMsIE1hdGNoLk9wdGlvbmFsKE9iamVjdCkpO1xuICAgIGNoZWNrKGNhbGxiYWNrLCBNYXRjaC5PcHRpb25hbChGdW5jdGlvbikpO1xuICAgIGNoZWNrKHByb2NlZWRBZnRlclVwbG9hZCwgTWF0Y2guT3B0aW9uYWwoQm9vbGVhbikpO1xuXG4gICAgY29uc3QgZmlsZUlkICAgPSBvcHRzLmZpbGVJZCB8fCBSYW5kb20uaWQoKTtcbiAgICBjb25zdCBGU05hbWUgICA9IHRoaXMubmFtaW5nRnVuY3Rpb24gPyB0aGlzLm5hbWluZ0Z1bmN0aW9uKG9wdHMpIDogZmlsZUlkO1xuICAgIGNvbnN0IGZpbGVOYW1lID0gKG9wdHMubmFtZSB8fCBvcHRzLmZpbGVOYW1lKSA/IChvcHRzLm5hbWUgfHwgb3B0cy5maWxlTmFtZSkgOiBGU05hbWU7XG5cbiAgICBjb25zdCB7ZXh0ZW5zaW9uLCBleHRlbnNpb25XaXRoRG90fSA9IHRoaXMuX2dldEV4dChmaWxlTmFtZSk7XG5cbiAgICBvcHRzLnBhdGggPSBgJHt0aGlzLnN0b3JhZ2VQYXRoKG9wdHMpfSR7bm9kZVBhdGguc2VwfSR7RlNOYW1lfSR7ZXh0ZW5zaW9uV2l0aERvdH1gO1xuICAgIG9wdHMudHlwZSA9IHRoaXMuX2dldE1pbWVUeXBlKG9wdHMpO1xuICAgIGlmICghXy5pc09iamVjdChvcHRzLm1ldGEpKSB7XG4gICAgICBvcHRzLm1ldGEgPSB7fTtcbiAgICB9XG5cbiAgICBpZiAoIV8uaXNOdW1iZXIob3B0cy5zaXplKSkge1xuICAgICAgb3B0cy5zaXplID0gYnVmZmVyLmxlbmd0aDtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9kYXRhVG9TY2hlbWEoe1xuICAgICAgbmFtZTogZmlsZU5hbWUsXG4gICAgICBwYXRoOiBvcHRzLnBhdGgsXG4gICAgICBtZXRhOiBvcHRzLm1ldGEsXG4gICAgICB0eXBlOiBvcHRzLnR5cGUsXG4gICAgICBzaXplOiBvcHRzLnNpemUsXG4gICAgICB1c2VySWQ6IG9wdHMudXNlcklkLFxuICAgICAgZXh0ZW5zaW9uXG4gICAgfSk7XG5cbiAgICByZXN1bHQuX2lkID0gZmlsZUlkO1xuXG4gICAgY29uc3Qgc3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3B0cy5wYXRoLCB7ZmxhZ3M6ICd3JywgbW9kZTogdGhpcy5wZXJtaXNzaW9uc30pO1xuICAgIHN0cmVhbS5lbmQoYnVmZmVyLCAoc3RyZWFtRXJyKSA9PiBib3VuZCgoKSA9PiB7XG4gICAgICBpZiAoc3RyZWFtRXJyKSB7XG4gICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKHN0cmVhbUVycik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmNvbGxlY3Rpb24uaW5zZXJ0KHJlc3VsdCwgKGluc2VydEVyciwgX2lkKSA9PiB7XG4gICAgICAgICAgaWYgKGluc2VydEVycikge1xuICAgICAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2soaW5zZXJ0RXJyKTtcbiAgICAgICAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbd3JpdGVdIFtpbnNlcnRdIEVycm9yOiAke2ZpbGVOYW1lfSAtPiAke3RoaXMuY29sbGVjdGlvbk5hbWV9YCwgaW5zZXJ0RXJyKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZmlsZVJlZiA9IHRoaXMuY29sbGVjdGlvbi5maW5kT25lKF9pZCk7XG4gICAgICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhudWxsLCBmaWxlUmVmKTtcbiAgICAgICAgICAgIGlmIChwcm9jZWVkQWZ0ZXJVcGxvYWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgdGhpcy5vbkFmdGVyVXBsb2FkICYmIHRoaXMub25BZnRlclVwbG9hZC5jYWxsKHRoaXMsIGZpbGVSZWYpO1xuICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2FmdGVyVXBsb2FkJywgZmlsZVJlZik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW3dyaXRlXTogJHtmaWxlTmFtZX0gLT4gJHt0aGlzLmNvbGxlY3Rpb25OYW1lfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSkpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIGxvYWRcbiAgICogQHBhcmFtIHtTdHJpbmd9IHVybCAtIFVSTCB0byBmaWxlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIC0gT2JqZWN0IHdpdGggZmlsZS1kYXRhXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzLmhlYWRlcnMgLSBIVFRQIGhlYWRlcnMgdG8gdXNlIHdoZW4gcmVxdWVzdGluZyB0aGUgZmlsZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5uYW1lIC0gRmlsZSBuYW1lLCBhbGlhczogYGZpbGVOYW1lYFxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy50eXBlIC0gRmlsZSBtaW1lLXR5cGVcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMubWV0YSAtIEZpbGUgYWRkaXRpb25hbCBtZXRhLWRhdGFcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMudXNlcklkIC0gVXNlcklkLCBkZWZhdWx0ICpudWxsKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5maWxlSWQgLSBfaWQsIGRlZmF1bHQgKm51bGwqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gZnVuY3Rpb24oZXJyb3IsIGZpbGVPYmopey4uLn1cbiAgICogQHBhcmFtIHtCb29sZWFufSBwcm9jZWVkQWZ0ZXJVcGxvYWQgLSBQcm9jZWVkIG9uQWZ0ZXJVcGxvYWQgaG9va1xuICAgKiBAc3VtbWFyeSBEb3dubG9hZCBmaWxlLCB3cml0ZSBzdHJlYW0gdG8gRlMgYW5kIGFkZCB0byBGaWxlc0NvbGxlY3Rpb24gQ29sbGVjdGlvblxuICAgKiBAcmV0dXJucyB7RmlsZXNDb2xsZWN0aW9ufSBJbnN0YW5jZVxuICAgKi9cbiAgbG9hZCh1cmwsIG9wdHMgPSB7fSwgY2FsbGJhY2ssIHByb2NlZWRBZnRlclVwbG9hZCkge1xuICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbbG9hZCgke3VybH0sICR7SlNPTi5zdHJpbmdpZnkob3B0cyl9LCBjYWxsYmFjayldYCk7XG5cbiAgICBpZiAoXy5pc0Z1bmN0aW9uKG9wdHMpKSB7XG4gICAgICBwcm9jZWVkQWZ0ZXJVcGxvYWQgPSBjYWxsYmFjaztcbiAgICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICAgIG9wdHMgICAgID0ge307XG4gICAgfSBlbHNlIGlmIChfLmlzQm9vbGVhbihjYWxsYmFjaykpIHtcbiAgICAgIHByb2NlZWRBZnRlclVwbG9hZCA9IGNhbGxiYWNrO1xuICAgIH0gZWxzZSBpZiAoXy5pc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAgIHByb2NlZWRBZnRlclVwbG9hZCA9IG9wdHM7XG4gICAgfVxuXG4gICAgY2hlY2sodXJsLCBTdHJpbmcpO1xuICAgIGNoZWNrKG9wdHMsIE1hdGNoLk9wdGlvbmFsKE9iamVjdCkpO1xuICAgIGNoZWNrKGNhbGxiYWNrLCBNYXRjaC5PcHRpb25hbChGdW5jdGlvbikpO1xuICAgIGNoZWNrKHByb2NlZWRBZnRlclVwbG9hZCwgTWF0Y2guT3B0aW9uYWwoQm9vbGVhbikpO1xuXG4gICAgaWYgKCFfLmlzT2JqZWN0KG9wdHMpKSB7XG4gICAgICBvcHRzID0ge307XG4gICAgfVxuXG4gICAgY29uc3QgZmlsZUlkICAgID0gb3B0cy5maWxlSWQgfHwgUmFuZG9tLmlkKCk7XG4gICAgY29uc3QgRlNOYW1lICAgID0gdGhpcy5uYW1pbmdGdW5jdGlvbiA/IHRoaXMubmFtaW5nRnVuY3Rpb24ob3B0cykgOiBmaWxlSWQ7XG4gICAgY29uc3QgcGF0aFBhcnRzID0gdXJsLnNwbGl0KCcvJyk7XG4gICAgY29uc3QgZmlsZU5hbWUgID0gKG9wdHMubmFtZSB8fCBvcHRzLmZpbGVOYW1lKSA/IChvcHRzLm5hbWUgfHwgb3B0cy5maWxlTmFtZSkgOiBwYXRoUGFydHNbcGF0aFBhcnRzLmxlbmd0aCAtIDFdIHx8IEZTTmFtZTtcblxuICAgIGNvbnN0IHtleHRlbnNpb24sIGV4dGVuc2lvbldpdGhEb3R9ID0gdGhpcy5fZ2V0RXh0KGZpbGVOYW1lKTtcbiAgICBvcHRzLnBhdGggID0gYCR7dGhpcy5zdG9yYWdlUGF0aChvcHRzKX0ke25vZGVQYXRoLnNlcH0ke0ZTTmFtZX0ke2V4dGVuc2lvbldpdGhEb3R9YDtcblxuICAgIGNvbnN0IHN0b3JlUmVzdWx0ID0gKHJlc3VsdCwgY2IpID0+IHtcbiAgICAgIHJlc3VsdC5faWQgPSBmaWxlSWQ7XG5cbiAgICAgIHRoaXMuY29sbGVjdGlvbi5pbnNlcnQocmVzdWx0LCAoZXJyb3IsIF9pZCkgPT4ge1xuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICBjYiAmJiBjYihlcnJvcik7XG4gICAgICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtsb2FkXSBbaW5zZXJ0XSBFcnJvcjogJHtmaWxlTmFtZX0gLT4gJHt0aGlzLmNvbGxlY3Rpb25OYW1lfWAsIGVycm9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBmaWxlUmVmID0gdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUoX2lkKTtcbiAgICAgICAgICBjYiAmJiBjYihudWxsLCBmaWxlUmVmKTtcbiAgICAgICAgICBpZiAocHJvY2VlZEFmdGVyVXBsb2FkID09PSB0cnVlKSB7XG4gICAgICAgICAgICB0aGlzLm9uQWZ0ZXJVcGxvYWQgJiYgdGhpcy5vbkFmdGVyVXBsb2FkLmNhbGwodGhpcywgZmlsZVJlZik7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ2FmdGVyVXBsb2FkJywgZmlsZVJlZik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbbG9hZF0gW2luc2VydF0gJHtmaWxlTmFtZX0gLT4gJHt0aGlzLmNvbGxlY3Rpb25OYW1lfWApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmVxdWVzdC5nZXQoe1xuICAgICAgdXJsLFxuICAgICAgaGVhZGVyczogb3B0cy5oZWFkZXJzIHx8IHt9XG4gICAgfSkub24oJ2Vycm9yJywgKGVycm9yKSA9PiBib3VuZCgoKSA9PiB7XG4gICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhlcnJvcik7XG4gICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2xvYWRdIFtyZXF1ZXN0LmdldCgke3VybH0pXSBFcnJvcjpgLCBlcnJvcik7XG4gICAgfSkpLm9uKCdyZXNwb25zZScsIChyZXNwb25zZSkgPT4gYm91bmQoKCkgPT4ge1xuICAgICAgcmVzcG9uc2Uub24oJ2VuZCcsICgpID0+IGJvdW5kKCgpID0+IHtcbiAgICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtsb2FkXSBSZWNlaXZlZDogJHt1cmx9YCk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX2RhdGFUb1NjaGVtYSh7XG4gICAgICAgICAgbmFtZTogZmlsZU5hbWUsXG4gICAgICAgICAgcGF0aDogb3B0cy5wYXRoLFxuICAgICAgICAgIG1ldGE6IG9wdHMubWV0YSxcbiAgICAgICAgICB0eXBlOiBvcHRzLnR5cGUgfHwgcmVzcG9uc2UuaGVhZGVyc1snY29udGVudC10eXBlJ10gfHwgdGhpcy5fZ2V0TWltZVR5cGUoe3BhdGg6IG9wdHMucGF0aH0pLFxuICAgICAgICAgIHNpemU6IG9wdHMuc2l6ZSB8fCBwYXJzZUludChyZXNwb25zZS5oZWFkZXJzWydjb250ZW50LWxlbmd0aCddIHx8IDApLFxuICAgICAgICAgIHVzZXJJZDogb3B0cy51c2VySWQsXG4gICAgICAgICAgZXh0ZW5zaW9uXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghcmVzdWx0LnNpemUpIHtcbiAgICAgICAgICBmcy5zdGF0KG9wdHMucGF0aCwgKGVycm9yLCBzdGF0cykgPT4gYm91bmQoKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKGVycm9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlc3VsdC52ZXJzaW9ucy5vcmlnaW5hbC5zaXplID0gKHJlc3VsdC5zaXplID0gc3RhdHMuc2l6ZSk7XG4gICAgICAgICAgICAgIHN0b3JlUmVzdWx0KHJlc3VsdCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdG9yZVJlc3VsdChyZXN1bHQsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgICAgfSkpO1xuICAgIH0pKS5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKG9wdHMucGF0aCwge2ZsYWdzOiAndycsIG1vZGU6IHRoaXMucGVybWlzc2lvbnN9KSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSBhZGRGaWxlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoICAgICAgICAgIC0gUGF0aCB0byBmaWxlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzICAgICAgICAgIC0gW09wdGlvbmFsXSBPYmplY3Qgd2l0aCBmaWxlLWRhdGFcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMudHlwZSAgICAgLSBbT3B0aW9uYWxdIEZpbGUgbWltZS10eXBlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzLm1ldGEgICAgIC0gW09wdGlvbmFsXSBGaWxlIGFkZGl0aW9uYWwgbWV0YS1kYXRhXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmZpbGVJZCAgIC0gX2lkLCBkZWZhdWx0ICpudWxsKlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cy5maWxlTmFtZSAtIFtPcHRpb25hbF0gRmlsZSBuYW1lLCBpZiBub3Qgc3BlY2lmaWVkIGZpbGUgbmFtZSBhbmQgZXh0ZW5zaW9uIHdpbGwgYmUgdGFrZW4gZnJvbSBwYXRoXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLnVzZXJJZCAgIC0gW09wdGlvbmFsXSBVc2VySWQsIGRlZmF1bHQgKm51bGwqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrICAgIC0gW09wdGlvbmFsXSBmdW5jdGlvbihlcnJvciwgZmlsZU9iail7Li4ufVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IHByb2NlZWRBZnRlclVwbG9hZCAtIFByb2NlZWQgb25BZnRlclVwbG9hZCBob29rXG4gICAqIEBzdW1tYXJ5IEFkZCBmaWxlIGZyb20gRlMgdG8gRmlsZXNDb2xsZWN0aW9uXG4gICAqIEByZXR1cm5zIHtGaWxlc0NvbGxlY3Rpb259IEluc3RhbmNlXG4gICAqL1xuICBhZGRGaWxlKHBhdGgsIG9wdHMgPSB7fSwgY2FsbGJhY2ssIHByb2NlZWRBZnRlclVwbG9hZCkge1xuICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbYWRkRmlsZSgke3BhdGh9KV1gKTtcblxuICAgIGlmIChfLmlzRnVuY3Rpb24ob3B0cykpIHtcbiAgICAgIHByb2NlZWRBZnRlclVwbG9hZCA9IGNhbGxiYWNrO1xuICAgICAgY2FsbGJhY2sgPSBvcHRzO1xuICAgICAgb3B0cyAgICAgPSB7fTtcbiAgICB9IGVsc2UgaWYgKF8uaXNCb29sZWFuKGNhbGxiYWNrKSkge1xuICAgICAgcHJvY2VlZEFmdGVyVXBsb2FkID0gY2FsbGJhY2s7XG4gICAgfSBlbHNlIGlmIChfLmlzQm9vbGVhbihvcHRzKSkge1xuICAgICAgcHJvY2VlZEFmdGVyVXBsb2FkID0gb3B0cztcbiAgICB9XG5cbiAgICBpZiAodGhpcy5wdWJsaWMpIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCAnQ2FuIG5vdCBydW4gW2FkZEZpbGVdIG9uIHB1YmxpYyBjb2xsZWN0aW9uISBKdXN0IE1vdmUgZmlsZSB0byByb290IG9mIHlvdXIgc2VydmVyLCB0aGVuIGFkZCByZWNvcmQgdG8gQ29sbGVjdGlvbicpO1xuICAgIH1cblxuICAgIGNoZWNrKHBhdGgsIFN0cmluZyk7XG4gICAgY2hlY2sob3B0cywgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG4gICAgY2hlY2soY2FsbGJhY2ssIE1hdGNoLk9wdGlvbmFsKEZ1bmN0aW9uKSk7XG4gICAgY2hlY2socHJvY2VlZEFmdGVyVXBsb2FkLCBNYXRjaC5PcHRpb25hbChCb29sZWFuKSk7XG5cbiAgICBmcy5zdGF0KHBhdGgsIChzdGF0RXJyLCBzdGF0cykgPT4gYm91bmQoKCkgPT4ge1xuICAgICAgaWYgKHN0YXRFcnIpIHtcbiAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2soc3RhdEVycik7XG4gICAgICB9IGVsc2UgaWYgKHN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgIGlmICghXy5pc09iamVjdChvcHRzKSkge1xuICAgICAgICAgIG9wdHMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBvcHRzLnBhdGggID0gcGF0aDtcblxuICAgICAgICBpZiAoIW9wdHMuZmlsZU5hbWUpIHtcbiAgICAgICAgICBjb25zdCBwYXRoUGFydHMgPSBwYXRoLnNwbGl0KG5vZGVQYXRoLnNlcCk7XG4gICAgICAgICAgb3B0cy5maWxlTmFtZSAgID0gcGF0aC5zcGxpdChub2RlUGF0aC5zZXApW3BhdGhQYXJ0cy5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHtleHRlbnNpb259ID0gdGhpcy5fZ2V0RXh0KG9wdHMuZmlsZU5hbWUpO1xuXG4gICAgICAgIGlmICghXy5pc1N0cmluZyhvcHRzLnR5cGUpKSB7XG4gICAgICAgICAgb3B0cy50eXBlID0gdGhpcy5fZ2V0TWltZVR5cGUob3B0cyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIV8uaXNPYmplY3Qob3B0cy5tZXRhKSkge1xuICAgICAgICAgIG9wdHMubWV0YSA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFfLmlzTnVtYmVyKG9wdHMuc2l6ZSkpIHtcbiAgICAgICAgICBvcHRzLnNpemUgPSBzdGF0cy5zaXplO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fZGF0YVRvU2NoZW1hKHtcbiAgICAgICAgICBuYW1lOiBvcHRzLmZpbGVOYW1lLFxuICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgbWV0YTogb3B0cy5tZXRhLFxuICAgICAgICAgIHR5cGU6IG9wdHMudHlwZSxcbiAgICAgICAgICBzaXplOiBvcHRzLnNpemUsXG4gICAgICAgICAgdXNlcklkOiBvcHRzLnVzZXJJZCxcbiAgICAgICAgICBleHRlbnNpb24sXG4gICAgICAgICAgX3N0b3JhZ2VQYXRoOiBwYXRoLnJlcGxhY2UoYCR7bm9kZVBhdGguc2VwfSR7b3B0cy5maWxlTmFtZX1gLCAnJyksXG4gICAgICAgICAgZmlsZUlkOiBvcHRzLmZpbGVJZCB8fCBudWxsXG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLmluc2VydChyZXN1bHQsIChpbnNlcnRFcnIsIF9pZCkgPT4ge1xuICAgICAgICAgIGlmIChpbnNlcnRFcnIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKGluc2VydEVycik7XG4gICAgICAgICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2FkZEZpbGVdIFtpbnNlcnRdIEVycm9yOiAke3Jlc3VsdC5uYW1lfSAtPiAke3RoaXMuY29sbGVjdGlvbk5hbWV9YCwgaW5zZXJ0RXJyKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZmlsZVJlZiA9IHRoaXMuY29sbGVjdGlvbi5maW5kT25lKF9pZCk7XG4gICAgICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhudWxsLCBmaWxlUmVmKTtcbiAgICAgICAgICAgIGlmIChwcm9jZWVkQWZ0ZXJVcGxvYWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgdGhpcy5vbkFmdGVyVXBsb2FkICYmIHRoaXMub25BZnRlclVwbG9hZC5jYWxsKHRoaXMsIGZpbGVSZWYpO1xuICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2FmdGVyVXBsb2FkJywgZmlsZVJlZik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2FkZEZpbGVdOiAke3Jlc3VsdC5uYW1lfSAtPiAke3RoaXMuY29sbGVjdGlvbk5hbWV9YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKG5ldyBNZXRlb3IuRXJyb3IoNDAwLCBgW0ZpbGVzQ29sbGVjdGlvbl0gW2FkZEZpbGUoJHtwYXRofSldOiBGaWxlIGRvZXMgbm90IGV4aXN0YCkpO1xuICAgICAgfVxuICAgIH0pKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIHJlbW92ZVxuICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IHNlbGVjdG9yIC0gTW9uZ28tU3R5bGUgc2VsZWN0b3IgKGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjc2VsZWN0b3JzKVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIHdpdGggb25lIGBlcnJvcmAgYXJndW1lbnRcbiAgICogQHN1bW1hcnkgUmVtb3ZlIGRvY3VtZW50cyBmcm9tIHRoZSBjb2xsZWN0aW9uXG4gICAqIEByZXR1cm5zIHtGaWxlc0NvbGxlY3Rpb259IEluc3RhbmNlXG4gICAqL1xuICByZW1vdmUoc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtyZW1vdmUoJHtKU09OLnN0cmluZ2lmeShzZWxlY3Rvcil9KV1gKTtcbiAgICBpZiAoc2VsZWN0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIGNoZWNrKGNhbGxiYWNrLCBNYXRjaC5PcHRpb25hbChGdW5jdGlvbikpO1xuXG4gICAgY29uc3QgZmlsZXMgPSB0aGlzLmNvbGxlY3Rpb24uZmluZChzZWxlY3Rvcik7XG4gICAgaWYgKGZpbGVzLmNvdW50KCkgPiAwKSB7XG4gICAgICBmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgIHRoaXMudW5saW5rKGZpbGUpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKG5ldyBNZXRlb3IuRXJyb3IoNDA0LCAnQ3Vyc29yIGlzIGVtcHR5LCBubyBmaWxlcyBpcyByZW1vdmVkJykpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub25BZnRlclJlbW92ZSkge1xuICAgICAgY29uc3QgZG9jcyA9IGZpbGVzLmZldGNoKCk7XG4gICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgIHRoaXMuY29sbGVjdGlvbi5yZW1vdmUoc2VsZWN0b3IsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgc2VsZi5vbkFmdGVyUmVtb3ZlKGRvY3MpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29sbGVjdGlvbi5yZW1vdmUoc2VsZWN0b3IsIChjYWxsYmFjayB8fCBOT09QKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIGRlbnlcbiAgICogQHBhcmFtIHtPYmplY3R9IHJ1bGVzXG4gICAqIEBzZWUgIGh0dHBzOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI01vbmdvLUNvbGxlY3Rpb24tZGVueVxuICAgKiBAc3VtbWFyeSBsaW5rIE1vbmdvLkNvbGxlY3Rpb24gZGVueSBtZXRob2RzXG4gICAqIEByZXR1cm5zIHtNb25nby5Db2xsZWN0aW9ufSBJbnN0YW5jZVxuICAgKi9cbiAgZGVueShydWxlcykge1xuICAgIHRoaXMuY29sbGVjdGlvbi5kZW55KHJ1bGVzKTtcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIGFsbG93XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBydWxlc1xuICAgKiBAc2VlIGh0dHBzOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI01vbmdvLUNvbGxlY3Rpb24tYWxsb3dcbiAgICogQHN1bW1hcnkgbGluayBNb25nby5Db2xsZWN0aW9uIGFsbG93IG1ldGhvZHNcbiAgICogQHJldHVybnMge01vbmdvLkNvbGxlY3Rpb259IEluc3RhbmNlXG4gICAqL1xuICBhbGxvdyhydWxlcykge1xuICAgIHRoaXMuY29sbGVjdGlvbi5hbGxvdyhydWxlcyk7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbjtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSBkZW55Q2xpZW50XG4gICAqIEBzZWUgaHR0cHM6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjTW9uZ28tQ29sbGVjdGlvbi1kZW55XG4gICAqIEBzdW1tYXJ5IFNob3J0aGFuZHMgZm9yIE1vbmdvLkNvbGxlY3Rpb24gZGVueSBtZXRob2RcbiAgICogQHJldHVybnMge01vbmdvLkNvbGxlY3Rpb259IEluc3RhbmNlXG4gICAqL1xuICBkZW55Q2xpZW50KCkge1xuICAgIHRoaXMuY29sbGVjdGlvbi5kZW55KHtcbiAgICAgIGluc2VydCgpIHsgcmV0dXJuIHRydWU7IH0sXG4gICAgICB1cGRhdGUoKSB7IHJldHVybiB0cnVlOyB9LFxuICAgICAgcmVtb3ZlKCkgeyByZXR1cm4gdHJ1ZTsgfVxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb247XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgYWxsb3dDbGllbnRcbiAgICogQHNlZSBodHRwczovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNNb25nby1Db2xsZWN0aW9uLWFsbG93XG4gICAqIEBzdW1tYXJ5IFNob3J0aGFuZHMgZm9yIE1vbmdvLkNvbGxlY3Rpb24gYWxsb3cgbWV0aG9kXG4gICAqIEByZXR1cm5zIHtNb25nby5Db2xsZWN0aW9ufSBJbnN0YW5jZVxuICAgKi9cbiAgYWxsb3dDbGllbnQoKSB7XG4gICAgdGhpcy5jb2xsZWN0aW9uLmFsbG93KHtcbiAgICAgIGluc2VydCgpIHsgcmV0dXJuIHRydWU7IH0sXG4gICAgICB1cGRhdGUoKSB7IHJldHVybiB0cnVlOyB9LFxuICAgICAgcmVtb3ZlKCkgeyByZXR1cm4gdHJ1ZTsgfVxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb247XG4gIH1cblxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSB1bmxpbmtcbiAgICogQHBhcmFtIHtPYmplY3R9IGZpbGVSZWYgLSBmaWxlT2JqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB2ZXJzaW9uIC0gW09wdGlvbmFsXSBmaWxlJ3MgdmVyc2lvblxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIFtPcHRpb25hbF0gY2FsbGJhY2sgZnVuY3Rpb25cbiAgICogQHN1bW1hcnkgVW5saW5rIGZpbGVzIGFuZCBpdCdzIHZlcnNpb25zIGZyb20gRlNcbiAgICogQHJldHVybnMge0ZpbGVzQ29sbGVjdGlvbn0gSW5zdGFuY2VcbiAgICovXG4gIHVubGluayhmaWxlUmVmLCB2ZXJzaW9uLCBjYWxsYmFjaykge1xuICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbdW5saW5rKCR7ZmlsZVJlZi5faWR9LCAke3ZlcnNpb259KV1gKTtcbiAgICBpZiAodmVyc2lvbikge1xuICAgICAgaWYgKF8uaXNPYmplY3QoZmlsZVJlZi52ZXJzaW9ucykgJiYgXy5pc09iamVjdChmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dKSAmJiBmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dLnBhdGgpIHtcbiAgICAgICAgZnMudW5saW5rKGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl0ucGF0aCwgKGNhbGxiYWNrIHx8IE5PT1ApKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKF8uaXNPYmplY3QoZmlsZVJlZi52ZXJzaW9ucykpIHtcbiAgICAgICAgXy5lYWNoKGZpbGVSZWYudmVyc2lvbnMsICh2UmVmKSA9PiBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgZnMudW5saW5rKHZSZWYucGF0aCwgKGNhbGxiYWNrIHx8IE5PT1ApKTtcbiAgICAgICAgfSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZnMudW5saW5rKGZpbGVSZWYucGF0aCwgKGNhbGxiYWNrIHx8IE5PT1ApKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgXzQwNFxuICAgKiBAc3VtbWFyeSBJbnRlcm5hbCBtZXRob2QsIHVzZWQgdG8gcmV0dXJuIDQwNCBlcnJvclxuICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgKi9cbiAgXzQwNChodHRwKSB7XG4gICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtkb3dubG9hZCgke2h0dHAucmVxdWVzdC5vcmlnaW5hbFVybH0pXSBbXzQwNF0gRmlsZSBub3QgZm91bmRgKTtcbiAgICBjb25zdCB0ZXh0ID0gJ0ZpbGUgTm90IEZvdW5kIDooJztcblxuICAgIGlmICghaHR0cC5yZXNwb25zZS5oZWFkZXJzU2VudCkge1xuICAgICAgaHR0cC5yZXNwb25zZS53cml0ZUhlYWQoNDA0LCB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAndGV4dC9wbGFpbicsXG4gICAgICAgICdDb250ZW50LUxlbmd0aCc6IHRleHQubGVuZ3RoXG4gICAgICB9XG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoIWh0dHAucmVzcG9uc2UuZmluaXNoZWQpIHtcbiAgICAgIGh0dHAucmVzcG9uc2UuZW5kKHRleHQpO1xuICAgIH1cbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSBkb3dubG9hZFxuICAgKiBAcGFyYW0ge09iamVjdH0gaHR0cCAgICAtIFNlcnZlciBIVFRQIG9iamVjdFxuICAgKiBAcGFyYW0ge1N0cmluZ30gdmVyc2lvbiAtIFJlcXVlc3RlZCBmaWxlIHZlcnNpb25cbiAgICogQHBhcmFtIHtPYmplY3R9IGZpbGVSZWYgLSBSZXF1ZXN0ZWQgZmlsZSBPYmplY3RcbiAgICogQHN1bW1hcnkgSW5pdGlhdGVzIHRoZSBIVFRQIHJlc3BvbnNlXG4gICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAqL1xuICBkb3dubG9hZChodHRwLCB2ZXJzaW9uID0gJ29yaWdpbmFsJywgZmlsZVJlZikge1xuICAgIGxldCB2UmVmO1xuICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbZG93bmxvYWQoJHtodHRwLnJlcXVlc3Qub3JpZ2luYWxVcmx9LCAke3ZlcnNpb259KV1gKTtcblxuICAgIGlmIChmaWxlUmVmKSB7XG4gICAgICBpZiAoXy5oYXMoZmlsZVJlZiwgJ3ZlcnNpb25zJykgJiYgXy5oYXMoZmlsZVJlZi52ZXJzaW9ucywgdmVyc2lvbikpIHtcbiAgICAgICAgdlJlZiA9IGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl07XG4gICAgICAgIHZSZWYuX2lkID0gZmlsZVJlZi5faWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2UmVmID0gZmlsZVJlZjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdlJlZiA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghdlJlZiB8fCAhXy5pc09iamVjdCh2UmVmKSkge1xuICAgICAgcmV0dXJuIHRoaXMuXzQwNChodHRwKTtcbiAgICB9IGVsc2UgaWYgKGZpbGVSZWYpIHtcbiAgICAgIGlmICh0aGlzLmRvd25sb2FkQ2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCF0aGlzLmRvd25sb2FkQ2FsbGJhY2suY2FsbChfLmV4dGVuZChodHRwLCB0aGlzLl9nZXRVc2VyKGh0dHApKSwgZmlsZVJlZikpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5fNDA0KGh0dHApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmludGVyY2VwdERvd25sb2FkICYmIF8uaXNGdW5jdGlvbih0aGlzLmludGVyY2VwdERvd25sb2FkKSkge1xuICAgICAgICBpZiAodGhpcy5pbnRlcmNlcHREb3dubG9hZChodHRwLCBmaWxlUmVmLCB2ZXJzaW9uKSA9PT0gdHJ1ZSkge1xuICAgICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZnMuc3RhdCh2UmVmLnBhdGgsIChzdGF0RXJyLCBzdGF0cykgPT4gYm91bmQoKCkgPT4ge1xuICAgICAgICBsZXQgcmVzcG9uc2VUeXBlO1xuICAgICAgICBpZiAoc3RhdEVyciB8fCAhc3RhdHMuaXNGaWxlKCkpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5fNDA0KGh0dHApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKChzdGF0cy5zaXplICE9PSB2UmVmLnNpemUpICYmICF0aGlzLmludGVncml0eUNoZWNrKSB7XG4gICAgICAgICAgdlJlZi5zaXplICAgID0gc3RhdHMuc2l6ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgoc3RhdHMuc2l6ZSAhPT0gdlJlZi5zaXplKSAmJiB0aGlzLmludGVncml0eUNoZWNrKSB7XG4gICAgICAgICAgcmVzcG9uc2VUeXBlID0gJzQwMCc7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5zZXJ2ZShodHRwLCBmaWxlUmVmLCB2UmVmLCB2ZXJzaW9uLCBudWxsLCAocmVzcG9uc2VUeXBlIHx8ICcyMDAnKSk7XG4gICAgICB9KSk7XG4gICAgICByZXR1cm4gdm9pZCAwO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fNDA0KGh0dHApO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIHNlcnZlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBodHRwICAgIC0gU2VydmVyIEhUVFAgb2JqZWN0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlUmVmIC0gUmVxdWVzdGVkIGZpbGUgT2JqZWN0XG4gICAqIEBwYXJhbSB7T2JqZWN0fSB2UmVmICAgIC0gUmVxdWVzdGVkIGZpbGUgdmVyc2lvbiBPYmplY3RcbiAgICogQHBhcmFtIHtTdHJpbmd9IHZlcnNpb24gLSBSZXF1ZXN0ZWQgZmlsZSB2ZXJzaW9uXG4gICAqIEBwYXJhbSB7c3RyZWFtLlJlYWRhYmxlfG51bGx9IHJlYWRhYmxlU3RyZWFtIC0gUmVhZGFibGUgc3RyZWFtLCB3aGljaCBzZXJ2ZXMgYmluYXJ5IGZpbGUgZGF0YVxuICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2VUeXBlIC0gUmVzcG9uc2UgY29kZVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGZvcmNlMjAwIC0gRm9yY2UgMjAwIHJlc3BvbnNlIGNvZGUgb3ZlciAyMDZcbiAgICogQHN1bW1hcnkgSGFuZGxlIGFuZCByZXBseSB0byBpbmNvbWluZyByZXF1ZXN0XG4gICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAqL1xuICBzZXJ2ZShodHRwLCBmaWxlUmVmLCB2UmVmLCB2ZXJzaW9uID0gJ29yaWdpbmFsJywgcmVhZGFibGVTdHJlYW0gPSBudWxsLCByZXNwb25zZVR5cGUgPSAnMjAwJywgZm9yY2UyMDAgPSBmYWxzZSkge1xuICAgIGxldCBwYXJ0aXJhbCA9IGZhbHNlO1xuICAgIGxldCByZXFSYW5nZSA9IGZhbHNlO1xuICAgIGxldCBkaXNwb3NpdGlvblR5cGUgPSAnJztcbiAgICBsZXQgc3RhcnQ7XG4gICAgbGV0IGVuZDtcbiAgICBsZXQgdGFrZTtcblxuICAgIGlmIChodHRwLnBhcmFtcy5xdWVyeS5kb3dubG9hZCAmJiAoaHR0cC5wYXJhbXMucXVlcnkuZG93bmxvYWQgPT09ICd0cnVlJykpIHtcbiAgICAgIGRpc3Bvc2l0aW9uVHlwZSA9ICdhdHRhY2htZW50OyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBkaXNwb3NpdGlvblR5cGUgPSAnaW5saW5lOyAnO1xuICAgIH1cblxuICAgIGNvbnN0IGRpc3Bvc2l0aW9uTmFtZSAgICAgPSBgZmlsZW5hbWU9XFxcIiR7ZW5jb2RlVVJJKHZSZWYubmFtZSB8fCBmaWxlUmVmLm5hbWUpLnJlcGxhY2UoL1xcLC9nLCAnJTJDJyl9XFxcIjsgZmlsZW5hbWUqPVVURi04Jycke2VuY29kZVVSSUNvbXBvbmVudCh2UmVmLm5hbWUgfHwgZmlsZVJlZi5uYW1lKX07IGA7XG4gICAgY29uc3QgZGlzcG9zaXRpb25FbmNvZGluZyA9ICdjaGFyc2V0PVVURi04JztcblxuICAgIGlmICghaHR0cC5yZXNwb25zZS5oZWFkZXJzU2VudCkge1xuICAgICAgaHR0cC5yZXNwb25zZS5zZXRIZWFkZXIoJ0NvbnRlbnQtRGlzcG9zaXRpb24nLCBkaXNwb3NpdGlvblR5cGUgKyBkaXNwb3NpdGlvbk5hbWUgKyBkaXNwb3NpdGlvbkVuY29kaW5nKTtcbiAgICB9XG5cbiAgICBpZiAoaHR0cC5yZXF1ZXN0LmhlYWRlcnMucmFuZ2UgJiYgIWZvcmNlMjAwKSB7XG4gICAgICBwYXJ0aXJhbCAgICA9IHRydWU7XG4gICAgICBjb25zdCBhcnJheSA9IGh0dHAucmVxdWVzdC5oZWFkZXJzLnJhbmdlLnNwbGl0KC9ieXRlcz0oWzAtOV0qKS0oWzAtOV0qKS8pO1xuICAgICAgc3RhcnQgICAgICAgPSBwYXJzZUludChhcnJheVsxXSk7XG4gICAgICBlbmQgICAgICAgICA9IHBhcnNlSW50KGFycmF5WzJdKTtcbiAgICAgIGlmIChpc05hTihlbmQpKSB7XG4gICAgICAgIGVuZCAgICAgICA9IHZSZWYuc2l6ZSAtIDE7XG4gICAgICB9XG4gICAgICB0YWtlICAgICAgICA9IGVuZCAtIHN0YXJ0O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGFydCA9IDA7XG4gICAgICBlbmQgICA9IHZSZWYuc2l6ZSAtIDE7XG4gICAgICB0YWtlICA9IHZSZWYuc2l6ZTtcbiAgICB9XG5cbiAgICBpZiAocGFydGlyYWwgfHwgKGh0dHAucGFyYW1zLnF1ZXJ5LnBsYXkgJiYgKGh0dHAucGFyYW1zLnF1ZXJ5LnBsYXkgPT09ICd0cnVlJykpKSB7XG4gICAgICByZXFSYW5nZSA9IHtzdGFydCwgZW5kfTtcbiAgICAgIGlmIChpc05hTihzdGFydCkgJiYgIWlzTmFOKGVuZCkpIHtcbiAgICAgICAgcmVxUmFuZ2Uuc3RhcnQgPSBlbmQgLSB0YWtlO1xuICAgICAgICByZXFSYW5nZS5lbmQgICA9IGVuZDtcbiAgICAgIH1cbiAgICAgIGlmICghaXNOYU4oc3RhcnQpICYmIGlzTmFOKGVuZCkpIHtcbiAgICAgICAgcmVxUmFuZ2Uuc3RhcnQgPSBzdGFydDtcbiAgICAgICAgcmVxUmFuZ2UuZW5kICAgPSBzdGFydCArIHRha2U7XG4gICAgICB9XG5cbiAgICAgIGlmICgoc3RhcnQgKyB0YWtlKSA+PSB2UmVmLnNpemUpIHsgcmVxUmFuZ2UuZW5kID0gdlJlZi5zaXplIC0gMTsgfVxuXG4gICAgICBpZiAodGhpcy5zdHJpY3QgJiYgKChyZXFSYW5nZS5zdGFydCA+PSAodlJlZi5zaXplIC0gMSkpIHx8IChyZXFSYW5nZS5lbmQgPiAodlJlZi5zaXplIC0gMSkpKSkge1xuICAgICAgICByZXNwb25zZVR5cGUgPSAnNDE2JztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3BvbnNlVHlwZSA9ICcyMDYnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXNwb25zZVR5cGUgPSAnMjAwJztcbiAgICB9XG5cbiAgICBjb25zdCBzdHJlYW1FcnJvckhhbmRsZXIgPSAoZXJyb3IpID0+IHtcbiAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbc2VydmUoJHt2UmVmLnBhdGh9LCAke3ZlcnNpb259KV0gWzUwMF1gLCBlcnJvcik7XG4gICAgICBpZiAoIWh0dHAucmVzcG9uc2UuZmluaXNoZWQpIHtcbiAgICAgICAgaHR0cC5yZXNwb25zZS5lbmQoZXJyb3IudG9TdHJpbmcoKSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IGhlYWRlcnMgPSBfLmlzRnVuY3Rpb24odGhpcy5yZXNwb25zZUhlYWRlcnMpID8gdGhpcy5yZXNwb25zZUhlYWRlcnMocmVzcG9uc2VUeXBlLCBmaWxlUmVmLCB2UmVmLCB2ZXJzaW9uKSA6IHRoaXMucmVzcG9uc2VIZWFkZXJzO1xuXG4gICAgaWYgKCFoZWFkZXJzWydDYWNoZS1Db250cm9sJ10pIHtcbiAgICAgIGlmICghaHR0cC5yZXNwb25zZS5oZWFkZXJzU2VudCkge1xuICAgICAgICBodHRwLnJlc3BvbnNlLnNldEhlYWRlcignQ2FjaGUtQ29udHJvbCcsIHRoaXMuY2FjaGVDb250cm9sKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGxldCBrZXkgaW4gaGVhZGVycykge1xuICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmhlYWRlcnNTZW50KSB7XG4gICAgICAgIGh0dHAucmVzcG9uc2Uuc2V0SGVhZGVyKGtleSwgaGVhZGVyc1trZXldKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCByZXNwb25kID0gKHN0cmVhbSwgY29kZSkgPT4ge1xuICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmhlYWRlcnNTZW50ICYmIHJlYWRhYmxlU3RyZWFtKSB7XG4gICAgICAgIGh0dHAucmVzcG9uc2Uud3JpdGVIZWFkKGNvZGUpO1xuICAgICAgfVxuXG4gICAgICBodHRwLnJlc3BvbnNlLm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzdHJlYW0uYWJvcnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBzdHJlYW0uYWJvcnQoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHN0cmVhbS5lbmQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBzdHJlYW0uZW5kKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBodHRwLnJlcXVlc3Qub24oJ2Fib3J0ZWQnLCAoKSA9PiB7XG4gICAgICAgIGh0dHAucmVxdWVzdC5hYm9ydGVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKHR5cGVvZiBzdHJlYW0uYWJvcnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBzdHJlYW0uYWJvcnQoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHN0cmVhbS5lbmQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBzdHJlYW0uZW5kKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBzdHJlYW0ub24oJ29wZW4nLCAoKSA9PiB7XG4gICAgICAgIGlmICghaHR0cC5yZXNwb25zZS5oZWFkZXJzU2VudCkge1xuICAgICAgICAgIGh0dHAucmVzcG9uc2Uud3JpdGVIZWFkKGNvZGUpO1xuICAgICAgICB9XG4gICAgICB9KS5vbignYWJvcnQnLCAoKSA9PiB7XG4gICAgICAgIGlmICghaHR0cC5yZXNwb25zZS5maW5pc2hlZCkge1xuICAgICAgICAgIGh0dHAucmVzcG9uc2UuZW5kKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFodHRwLnJlcXVlc3QuYWJvcnRlZCkge1xuICAgICAgICAgIGh0dHAucmVxdWVzdC5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgIH0pLm9uKCdlcnJvcicsIHN0cmVhbUVycm9ySGFuZGxlclxuICAgICAgKS5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICBpZiAoIWh0dHAucmVzcG9uc2UuZmluaXNoZWQpIHtcbiAgICAgICAgICBodHRwLnJlc3BvbnNlLmVuZCgpO1xuICAgICAgICB9XG4gICAgICB9KS5waXBlKGh0dHAucmVzcG9uc2UpO1xuICAgIH07XG5cbiAgICBzd2l0Y2ggKHJlc3BvbnNlVHlwZSkge1xuICAgIGNhc2UgJzQwMCc6XG4gICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW3NlcnZlKCR7dlJlZi5wYXRofSwgJHt2ZXJzaW9ufSldIFs0MDBdIENvbnRlbnQtTGVuZ3RoIG1pc21hdGNoIWApO1xuICAgICAgdmFyIHRleHQgPSAnQ29udGVudC1MZW5ndGggbWlzbWF0Y2ghJztcblxuICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmhlYWRlcnNTZW50KSB7XG4gICAgICAgIGh0dHAucmVzcG9uc2Uud3JpdGVIZWFkKDQwMCwge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAndGV4dC9wbGFpbicsXG4gICAgICAgICAgJ0NvbnRlbnQtTGVuZ3RoJzogdGV4dC5sZW5ndGhcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmICghaHR0cC5yZXNwb25zZS5maW5pc2hlZCkge1xuICAgICAgICBodHRwLnJlc3BvbnNlLmVuZCh0ZXh0KTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJzQwNCc6XG4gICAgICB0aGlzLl80MDQoaHR0cCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICc0MTYnOlxuICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtzZXJ2ZSgke3ZSZWYucGF0aH0sICR7dmVyc2lvbn0pXSBbNDE2XSBDb250ZW50LVJhbmdlIGlzIG5vdCBzcGVjaWZpZWQhYCk7XG4gICAgICBpZiAoIWh0dHAucmVzcG9uc2UuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgaHR0cC5yZXNwb25zZS53cml0ZUhlYWQoNDE2KTtcbiAgICAgIH1cbiAgICAgIGlmICghaHR0cC5yZXNwb25zZS5maW5pc2hlZCkge1xuICAgICAgICBodHRwLnJlc3BvbnNlLmVuZCgpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnMjA2JzpcbiAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbc2VydmUoJHt2UmVmLnBhdGh9LCAke3ZlcnNpb259KV0gWzIwNl1gKTtcbiAgICAgIGlmICghaHR0cC5yZXNwb25zZS5oZWFkZXJzU2VudCkge1xuICAgICAgICBodHRwLnJlc3BvbnNlLnNldEhlYWRlcignQ29udGVudC1SYW5nZScsIGBieXRlcyAke3JlcVJhbmdlLnN0YXJ0fS0ke3JlcVJhbmdlLmVuZH0vJHt2UmVmLnNpemV9YCk7XG4gICAgICB9XG4gICAgICByZXNwb25kKHJlYWRhYmxlU3RyZWFtIHx8IGZzLmNyZWF0ZVJlYWRTdHJlYW0odlJlZi5wYXRoLCB7c3RhcnQ6IHJlcVJhbmdlLnN0YXJ0LCBlbmQ6IHJlcVJhbmdlLmVuZH0pLCAyMDYpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbc2VydmUoJHt2UmVmLnBhdGh9LCAke3ZlcnNpb259KV0gWzIwMF1gKTtcbiAgICAgIHJlc3BvbmQocmVhZGFibGVTdHJlYW0gfHwgZnMuY3JlYXRlUmVhZFN0cmVhbSh2UmVmLnBhdGgpLCAyMDApO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG59XG4iLCJpbXBvcnQgeyBfIH0gICAgICAgICAgICAgICAgICAgICAgIGZyb20gJ21ldGVvci91bmRlcnNjb3JlJztcbmltcG9ydCB7IEV2ZW50RW1pdHRlciB9ICAgICAgICAgICAgZnJvbSAnZXZlbnRlbWl0dGVyMyc7XG5pbXBvcnQgeyBmb3JtYXRGbGVVUkwgfSAgICAgICAgICAgIGZyb20gJy4vbGliLmpzJztcbmltcG9ydCB7IGNoZWNrLCBNYXRjaCB9ICAgICAgICAgICAgZnJvbSAnbWV0ZW9yL2NoZWNrJztcbmltcG9ydCB7IEZpbGVzQ3Vyc29yLCBGaWxlQ3Vyc29yIH0gZnJvbSAnLi9jdXJzb3IuanMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBGaWxlc0NvbGxlY3Rpb25Db3JlIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoKTtcbiAgfVxuXG4gIHN0YXRpYyBzY2hlbWEgPSB7XG4gICAgX2lkOiB7XG4gICAgICB0eXBlOiBTdHJpbmdcbiAgICB9LFxuICAgIHNpemU6IHtcbiAgICAgIHR5cGU6IE51bWJlclxuICAgIH0sXG4gICAgbmFtZToge1xuICAgICAgdHlwZTogU3RyaW5nXG4gICAgfSxcbiAgICB0eXBlOiB7XG4gICAgICB0eXBlOiBTdHJpbmdcbiAgICB9LFxuICAgIHBhdGg6IHtcbiAgICAgIHR5cGU6IFN0cmluZ1xuICAgIH0sXG4gICAgaXNWaWRlbzoge1xuICAgICAgdHlwZTogQm9vbGVhblxuICAgIH0sXG4gICAgaXNBdWRpbzoge1xuICAgICAgdHlwZTogQm9vbGVhblxuICAgIH0sXG4gICAgaXNJbWFnZToge1xuICAgICAgdHlwZTogQm9vbGVhblxuICAgIH0sXG4gICAgaXNUZXh0OiB7XG4gICAgICB0eXBlOiBCb29sZWFuXG4gICAgfSxcbiAgICBpc0pTT046IHtcbiAgICAgIHR5cGU6IEJvb2xlYW5cbiAgICB9LFxuICAgIGlzUERGOiB7XG4gICAgICB0eXBlOiBCb29sZWFuXG4gICAgfSxcbiAgICBleHRlbnNpb246IHtcbiAgICAgIHR5cGU6IFN0cmluZyxcbiAgICAgIG9wdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICBleHQ6IHtcbiAgICAgIHR5cGU6IFN0cmluZyxcbiAgICAgIG9wdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICBleHRlbnNpb25XaXRoRG90OiB7XG4gICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICBvcHRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgbWltZToge1xuICAgICAgdHlwZTogU3RyaW5nLFxuICAgICAgb3B0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgICdtaW1lLXR5cGUnOiB7XG4gICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICBvcHRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgX3N0b3JhZ2VQYXRoOiB7XG4gICAgICB0eXBlOiBTdHJpbmdcbiAgICB9LFxuICAgIF9kb3dubG9hZFJvdXRlOiB7XG4gICAgICB0eXBlOiBTdHJpbmdcbiAgICB9LFxuICAgIF9jb2xsZWN0aW9uTmFtZToge1xuICAgICAgdHlwZTogU3RyaW5nXG4gICAgfSxcbiAgICBwdWJsaWM6IHtcbiAgICAgIHR5cGU6IEJvb2xlYW4sXG4gICAgICBvcHRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgbWV0YToge1xuICAgICAgdHlwZTogT2JqZWN0LFxuICAgICAgYmxhY2tib3g6IHRydWUsXG4gICAgICBvcHRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgdXNlcklkOiB7XG4gICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICBvcHRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgdXBkYXRlZEF0OiB7XG4gICAgICB0eXBlOiBEYXRlLFxuICAgICAgb3B0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHZlcnNpb25zOiB7XG4gICAgICB0eXBlOiBPYmplY3QsXG4gICAgICBibGFja2JveDogdHJ1ZVxuICAgIH1cbiAgfTtcblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvbkNvcmVcbiAgICogQG5hbWUgX2RlYnVnXG4gICAqIEBzdW1tYXJ5IFByaW50IGxvZ3MgaW4gZGVidWcgbW9kZVxuICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICovXG4gIF9kZWJ1ZygpIHtcbiAgICBpZiAodGhpcy5kZWJ1Zykge1xuICAgICAgKGNvbnNvbGUuaW5mbyB8fCBjb25zb2xlLmxvZyB8fCBmdW5jdGlvbiAoKSB7IH0pLmFwcGx5KHVuZGVmaW5lZCwgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvbkNvcmVcbiAgICogQG5hbWUgX2dldEZpbGVOYW1lXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlRGF0YSAtIEZpbGUgT2JqZWN0XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgZmlsZSdzIG5hbWVcbiAgICogQHJldHVybnMge1N0cmluZ31cbiAgICovXG4gIF9nZXRGaWxlTmFtZShmaWxlRGF0YSkge1xuICAgIGNvbnN0IGZpbGVOYW1lID0gZmlsZURhdGEubmFtZSB8fCBmaWxlRGF0YS5maWxlTmFtZTtcbiAgICBpZiAoXy5pc1N0cmluZyhmaWxlTmFtZSkgJiYgKGZpbGVOYW1lLmxlbmd0aCA+IDApKSB7XG4gICAgICByZXR1cm4gKGZpbGVEYXRhLm5hbWUgfHwgZmlsZURhdGEuZmlsZU5hbWUpLnJlcGxhY2UoL15cXC5cXC4rLywgJycpLnJlcGxhY2UoL1xcLnsyLH0vZywgJy4nKS5yZXBsYWNlKC9cXC8vZywgJycpO1xuICAgIH1cbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvbkNvcmVcbiAgICogQG5hbWUgX2dldEV4dFxuICAgKiBAcGFyYW0ge1N0cmluZ30gRmlsZU5hbWUgLSBGaWxlIG5hbWVcbiAgICogQHN1bW1hcnkgR2V0IGV4dGVuc2lvbiBmcm9tIEZpbGVOYW1lXG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqL1xuICBfZ2V0RXh0KGZpbGVOYW1lKSB7XG4gICAgaWYgKCEhfmZpbGVOYW1lLmluZGV4T2YoJy4nKSkge1xuICAgICAgY29uc3QgZXh0ZW5zaW9uID0gKGZpbGVOYW1lLnNwbGl0KCcuJykucG9wKCkuc3BsaXQoJz8nKVswXSB8fCAnJykudG9Mb3dlckNhc2UoKTtcbiAgICAgIHJldHVybiB7IGV4dDogZXh0ZW5zaW9uLCBleHRlbnNpb24sIGV4dGVuc2lvbldpdGhEb3Q6IGAuJHtleHRlbnNpb259YCB9O1xuICAgIH1cbiAgICByZXR1cm4geyBleHQ6ICcnLCBleHRlbnNpb246ICcnLCBleHRlbnNpb25XaXRoRG90OiAnJyB9O1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25Db3JlXG4gICAqIEBuYW1lIF91cGRhdGVGaWxlVHlwZXNcbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGaWxlIGRhdGFcbiAgICogQHN1bW1hcnkgSW50ZXJuYWwgbWV0aG9kLiBDbGFzc2lmeSBmaWxlIGJhc2VkIG9uICd0eXBlJyBmaWVsZFxuICAgKi9cbiAgX3VwZGF0ZUZpbGVUeXBlcyhkYXRhKSB7XG4gICAgZGF0YS5pc1ZpZGVvICA9IC9edmlkZW9cXC8vaS50ZXN0KGRhdGEudHlwZSk7XG4gICAgZGF0YS5pc0F1ZGlvICA9IC9eYXVkaW9cXC8vaS50ZXN0KGRhdGEudHlwZSk7XG4gICAgZGF0YS5pc0ltYWdlICA9IC9eaW1hZ2VcXC8vaS50ZXN0KGRhdGEudHlwZSk7XG4gICAgZGF0YS5pc1RleHQgICA9IC9edGV4dFxcLy9pLnRlc3QoZGF0YS50eXBlKTtcbiAgICBkYXRhLmlzSlNPTiAgID0gL15hcHBsaWNhdGlvblxcL2pzb24kL2kudGVzdChkYXRhLnR5cGUpO1xuICAgIGRhdGEuaXNQREYgICAgPSAvXmFwcGxpY2F0aW9uXFwvKHgtKT9wZGYkL2kudGVzdChkYXRhLnR5cGUpO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25Db3JlXG4gICAqIEBuYW1lIF9kYXRhVG9TY2hlbWFcbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGaWxlIGRhdGFcbiAgICogQHN1bW1hcnkgSW50ZXJuYWwgbWV0aG9kLiBCdWlsZCBvYmplY3QgaW4gYWNjb3JkYW5jZSB3aXRoIGRlZmF1bHQgc2NoZW1hIGZyb20gRmlsZSBkYXRhXG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqL1xuICBfZGF0YVRvU2NoZW1hKGRhdGEpIHtcbiAgICBjb25zdCBkcyA9IHtcbiAgICAgIG5hbWU6IGRhdGEubmFtZSxcbiAgICAgIGV4dGVuc2lvbjogZGF0YS5leHRlbnNpb24sXG4gICAgICBleHQ6IGRhdGEuZXh0ZW5zaW9uLFxuICAgICAgZXh0ZW5zaW9uV2l0aERvdDogJy4nICsgZGF0YS5leHRlbnNpb24sXG4gICAgICBwYXRoOiBkYXRhLnBhdGgsXG4gICAgICBtZXRhOiBkYXRhLm1ldGEsXG4gICAgICB0eXBlOiBkYXRhLnR5cGUsXG4gICAgICBtaW1lOiBkYXRhLnR5cGUsXG4gICAgICAnbWltZS10eXBlJzogZGF0YS50eXBlLFxuICAgICAgc2l6ZTogZGF0YS5zaXplLFxuICAgICAgdXNlcklkOiBkYXRhLnVzZXJJZCB8fCBudWxsLFxuICAgICAgdmVyc2lvbnM6IHtcbiAgICAgICAgb3JpZ2luYWw6IHtcbiAgICAgICAgICBwYXRoOiBkYXRhLnBhdGgsXG4gICAgICAgICAgc2l6ZTogZGF0YS5zaXplLFxuICAgICAgICAgIHR5cGU6IGRhdGEudHlwZSxcbiAgICAgICAgICBleHRlbnNpb246IGRhdGEuZXh0ZW5zaW9uXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBfZG93bmxvYWRSb3V0ZTogZGF0YS5fZG93bmxvYWRSb3V0ZSB8fCB0aGlzLmRvd25sb2FkUm91dGUsXG4gICAgICBfY29sbGVjdGlvbk5hbWU6IGRhdGEuX2NvbGxlY3Rpb25OYW1lIHx8IHRoaXMuY29sbGVjdGlvbk5hbWVcbiAgICB9O1xuXG4gICAgLy9PcHRpb25hbCBmaWxlSWRcbiAgICBpZiAoZGF0YS5maWxlSWQpIHtcbiAgICAgIGRzLl9pZCA9IGRhdGEuZmlsZUlkO1xuICAgIH1cblxuICAgIHRoaXMuX3VwZGF0ZUZpbGVUeXBlcyhkcyk7XG4gICAgZHMuX3N0b3JhZ2VQYXRoID0gZGF0YS5fc3RvcmFnZVBhdGggfHwgdGhpcy5zdG9yYWdlUGF0aChfLmV4dGVuZChkYXRhLCBkcykpO1xuICAgIHJldHVybiBkcztcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uQ29yZVxuICAgKiBAbmFtZSBmaW5kT25lXG4gICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gc2VsZWN0b3IgLSBNb25nby1TdHlsZSBzZWxlY3RvciAoaHR0cDovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNzZWxlY3RvcnMpXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gTW9uZ28tU3R5bGUgc2VsZWN0b3IgT3B0aW9ucyAoaHR0cDovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNzb3J0c3BlY2lmaWVycylcbiAgICogQHN1bW1hcnkgRmluZCBhbmQgcmV0dXJuIEN1cnNvciBmb3IgbWF0Y2hpbmcgZG9jdW1lbnQgT2JqZWN0XG4gICAqIEByZXR1cm5zIHtGaWxlQ3Vyc29yfSBJbnN0YW5jZVxuICAgKi9cbiAgZmluZE9uZShzZWxlY3RvciA9IHt9LCBvcHRpb25zKSB7XG4gICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtmaW5kT25lKCR7SlNPTi5zdHJpbmdpZnkoc2VsZWN0b3IpfSwgJHtKU09OLnN0cmluZ2lmeShvcHRpb25zKX0pXWApO1xuICAgIGNoZWNrKHNlbGVjdG9yLCBNYXRjaC5PcHRpb25hbChNYXRjaC5PbmVPZihPYmplY3QsIFN0cmluZywgQm9vbGVhbiwgTnVtYmVyLCBudWxsKSkpO1xuICAgIGNoZWNrKG9wdGlvbnMsIE1hdGNoLk9wdGlvbmFsKE9iamVjdCkpO1xuXG4gICAgY29uc3QgZG9jID0gdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUoc2VsZWN0b3IsIG9wdGlvbnMpO1xuICAgIGlmIChkb2MpIHtcbiAgICAgIHJldHVybiBuZXcgRmlsZUN1cnNvcihkb2MsIHRoaXMpO1xuICAgIH1cbiAgICByZXR1cm4gZG9jO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25Db3JlXG4gICAqIEBuYW1lIGZpbmRcbiAgICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBzZWxlY3RvciAtIE1vbmdvLVN0eWxlIHNlbGVjdG9yIChodHRwOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI3NlbGVjdG9ycylcbiAgICogQHBhcmFtIHtPYmplY3R9ICAgICAgICBvcHRpb25zICAtIE1vbmdvLVN0eWxlIHNlbGVjdG9yIE9wdGlvbnMgKGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjc29ydHNwZWNpZmllcnMpXG4gICAqIEBzdW1tYXJ5IEZpbmQgYW5kIHJldHVybiBDdXJzb3IgZm9yIG1hdGNoaW5nIGRvY3VtZW50c1xuICAgKiBAcmV0dXJucyB7RmlsZXNDdXJzb3J9IEluc3RhbmNlXG4gICAqL1xuICBmaW5kKHNlbGVjdG9yID0ge30sIG9wdGlvbnMpIHtcbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2ZpbmQoJHtKU09OLnN0cmluZ2lmeShzZWxlY3Rvcil9LCAke0pTT04uc3RyaW5naWZ5KG9wdGlvbnMpfSldYCk7XG4gICAgY2hlY2soc2VsZWN0b3IsIE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKE9iamVjdCwgU3RyaW5nLCBCb29sZWFuLCBOdW1iZXIsIG51bGwpKSk7XG4gICAgY2hlY2sob3B0aW9ucywgTWF0Y2guT3B0aW9uYWwoT2JqZWN0KSk7XG5cbiAgICByZXR1cm4gbmV3IEZpbGVzQ3Vyc29yKHNlbGVjdG9yLCBvcHRpb25zLCB0aGlzKTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uQ29yZVxuICAgKiBAbmFtZSB1cGRhdGVcbiAgICogQHNlZSBodHRwOi8vZG9jcy5tZXRlb3IuY29tLyMvZnVsbC91cGRhdGVcbiAgICogQHN1bW1hcnkgbGluayBNb25nby5Db2xsZWN0aW9uIHVwZGF0ZSBtZXRob2RcbiAgICogQHJldHVybnMge01vbmdvLkNvbGxlY3Rpb259IEluc3RhbmNlXG4gICAqL1xuICB1cGRhdGUoKSB7XG4gICAgdGhpcy5jb2xsZWN0aW9uLnVwZGF0ZS5hcHBseSh0aGlzLmNvbGxlY3Rpb24sIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbjtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uQ29yZVxuICAgKiBAbmFtZSBsaW5rXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlUmVmIC0gRmlsZSByZWZlcmVuY2Ugb2JqZWN0XG4gICAqIEBwYXJhbSB7U3RyaW5nfSB2ZXJzaW9uIC0gVmVyc2lvbiBvZiBmaWxlIHlvdSB3b3VsZCBsaWtlIHRvIHJlcXVlc3RcbiAgICogQHN1bW1hcnkgUmV0dXJucyBkb3dubG9hZGFibGUgVVJMXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IEVtcHR5IHN0cmluZyByZXR1cm5lZCBpbiBjYXNlIGlmIGZpbGUgbm90IGZvdW5kIGluIERCXG4gICAqL1xuICBsaW5rKGZpbGVSZWYsIHZlcnNpb24gPSAnb3JpZ2luYWwnKSB7XG4gICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtsaW5rKCR7KF8uaXNPYmplY3QoZmlsZVJlZikgPyBmaWxlUmVmLl9pZCA6IHVuZGVmaW5lZCl9LCAke3ZlcnNpb259KV1gKTtcbiAgICBjaGVjayhmaWxlUmVmLCBPYmplY3QpO1xuICAgIGNoZWNrKHZlcnNpb24sIFN0cmluZyk7XG5cbiAgICBpZiAoIWZpbGVSZWYpIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG4gICAgcmV0dXJuIGZvcm1hdEZsZVVSTChmaWxlUmVmLCB2ZXJzaW9uKTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgXyB9ICAgICAgZnJvbSAnbWV0ZW9yL3VuZGVyc2NvcmUnO1xuaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5cbi8qXG4gKiBAcHJpdmF0ZVxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAY2xhc3MgRmlsZUN1cnNvclxuICogQHBhcmFtIF9maWxlUmVmICAgIHtPYmplY3R9IC0gTW9uZ28tU3R5bGUgc2VsZWN0b3IgKGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjc2VsZWN0b3JzKVxuICogQHBhcmFtIF9jb2xsZWN0aW9uIHtGaWxlc0NvbGxlY3Rpb259IC0gRmlsZXNDb2xsZWN0aW9uIEluc3RhbmNlXG4gKiBAc3VtbWFyeSBJbnRlcm5hbCBjbGFzcywgcmVwcmVzZW50cyBlYWNoIHJlY29yZCBpbiBgRmlsZXNDdXJzb3IuZWFjaCgpYCBvciBkb2N1bWVudCByZXR1cm5lZCBmcm9tIGAuZmluZE9uZSgpYCBtZXRob2RcbiAqL1xuZXhwb3J0IGNsYXNzIEZpbGVDdXJzb3Ige1xuICBjb25zdHJ1Y3RvcihfZmlsZVJlZiwgX2NvbGxlY3Rpb24pIHtcbiAgICB0aGlzLl9maWxlUmVmICAgID0gX2ZpbGVSZWY7XG4gICAgdGhpcy5fY29sbGVjdGlvbiA9IF9jb2xsZWN0aW9uO1xuICAgIF8uZXh0ZW5kKHRoaXMsIF9maWxlUmVmKTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZUN1cnNvclxuICAgKiBAbmFtZSByZW1vdmVcbiAgICogQHBhcmFtIGNhbGxiYWNrIHtGdW5jdGlvbn0gLSBUcmlnZ2VyZWQgYXN5bmNocm9ub3VzbHkgYWZ0ZXIgaXRlbSBpcyByZW1vdmVkIG9yIGZhaWxlZCB0byBiZSByZW1vdmVkXG4gICAqIEBzdW1tYXJ5IFJlbW92ZSBkb2N1bWVudFxuICAgKiBAcmV0dXJucyB7RmlsZUN1cnNvcn1cbiAgICovXG4gIHJlbW92ZShjYWxsYmFjaykge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZUN1cnNvcl0gW3JlbW92ZSgpXScpO1xuICAgIGlmICh0aGlzLl9maWxlUmVmKSB7XG4gICAgICB0aGlzLl9jb2xsZWN0aW9uLnJlbW92ZSh0aGlzLl9maWxlUmVmLl9pZCwgY2FsbGJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhuZXcgTWV0ZW9yLkVycm9yKDQwNCwgJ05vIHN1Y2ggZmlsZScpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVDdXJzb3JcbiAgICogQG5hbWUgbGlua1xuICAgKiBAcGFyYW0gdmVyc2lvbiB7U3RyaW5nfSAtIE5hbWUgb2YgZmlsZSdzIHN1YnZlcnNpb25cbiAgICogQHN1bW1hcnkgUmV0dXJucyBkb3dubG9hZGFibGUgVVJMIHRvIEZpbGVcbiAgICogQHJldHVybnMge1N0cmluZ31cbiAgICovXG4gIGxpbmsodmVyc2lvbiA9ICdvcmlnaW5hbCcpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVDdXJzb3JdIFtsaW5rKCR7dmVyc2lvbn0pXWApO1xuICAgIGlmICh0aGlzLl9maWxlUmVmKSB7XG4gICAgICByZXR1cm4gdGhpcy5fY29sbGVjdGlvbi5saW5rKHRoaXMuX2ZpbGVSZWYsIHZlcnNpb24pO1xuICAgIH1cbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVDdXJzb3JcbiAgICogQG5hbWUgZ2V0XG4gICAqIEBwYXJhbSBwcm9wZXJ0eSB7U3RyaW5nfSAtIE5hbWUgb2Ygc3ViLW9iamVjdCBwcm9wZXJ0eVxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGN1cnJlbnQgZG9jdW1lbnQgYXMgYSBwbGFpbiBPYmplY3QsIGlmIGBwcm9wZXJ0eWAgaXMgc3BlY2lmaWVkIC0gcmV0dXJucyB2YWx1ZSBvZiBzdWItb2JqZWN0IHByb3BlcnR5XG4gICAqIEByZXR1cm5zIHtPYmplY3R8bWl4fVxuICAgKi9cbiAgZ2V0KHByb3BlcnR5KSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtGaWxlQ3Vyc29yXSBbZ2V0KCR7cHJvcGVydHl9KV1gKTtcbiAgICBpZiAocHJvcGVydHkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9maWxlUmVmW3Byb3BlcnR5XTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2ZpbGVSZWY7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVDdXJzb3JcbiAgICogQG5hbWUgZmV0Y2hcbiAgICogQHN1bW1hcnkgUmV0dXJucyBkb2N1bWVudCBhcyBwbGFpbiBPYmplY3QgaW4gQXJyYXlcbiAgICogQHJldHVybnMge1tPYmplY3RdfVxuICAgKi9cbiAgZmV0Y2goKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlQ3Vyc29yXSBbZmV0Y2goKV0nKTtcbiAgICByZXR1cm4gW3RoaXMuX2ZpbGVSZWZdO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlQ3Vyc29yXG4gICAqIEBuYW1lIHdpdGhcbiAgICogQHN1bW1hcnkgUmV0dXJucyByZWFjdGl2ZSB2ZXJzaW9uIG9mIGN1cnJlbnQgRmlsZUN1cnNvciwgdXNlZnVsIHRvIHVzZSB3aXRoIGB7eyN3aXRofX0uLi57ey93aXRofX1gIGJsb2NrIHRlbXBsYXRlIGhlbHBlclxuICAgKiBAcmV0dXJucyB7W09iamVjdF19XG4gICAqL1xuICB3aXRoKCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZUN1cnNvcl0gW3dpdGgoKV0nKTtcbiAgICByZXR1cm4gXy5leHRlbmQodGhpcywgdGhpcy5fY29sbGVjdGlvbi5jb2xsZWN0aW9uLmZpbmRPbmUodGhpcy5fZmlsZVJlZi5faWQpKTtcbiAgfVxufVxuXG4vKlxuICogQHByaXZhdGVcbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQGNsYXNzIEZpbGVzQ3Vyc29yXG4gKiBAcGFyYW0gX3NlbGVjdG9yICAge1N0cmluZ3xPYmplY3R9ICAgLSBNb25nby1TdHlsZSBzZWxlY3RvciAoaHR0cDovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNzZWxlY3RvcnMpXG4gKiBAcGFyYW0gb3B0aW9ucyAgICAge09iamVjdH0gICAgICAgICAgLSBNb25nby1TdHlsZSBzZWxlY3RvciBPcHRpb25zIChodHRwOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI3NlbGVjdG9ycylcbiAqIEBwYXJhbSBfY29sbGVjdGlvbiB7RmlsZXNDb2xsZWN0aW9ufSAtIEZpbGVzQ29sbGVjdGlvbiBJbnN0YW5jZVxuICogQHN1bW1hcnkgSW1wbGVtZW50YXRpb24gb2YgQ3Vyc29yIGZvciBGaWxlc0NvbGxlY3Rpb25cbiAqL1xuZXhwb3J0IGNsYXNzIEZpbGVzQ3Vyc29yIHtcbiAgY29uc3RydWN0b3IoX3NlbGVjdG9yID0ge30sIG9wdGlvbnMsIF9jb2xsZWN0aW9uKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbiA9IF9jb2xsZWN0aW9uO1xuICAgIHRoaXMuX3NlbGVjdG9yICAgPSBfc2VsZWN0b3I7XG4gICAgdGhpcy5fY3VycmVudCAgICA9IC0xO1xuICAgIHRoaXMuY3Vyc29yICAgICAgPSB0aGlzLl9jb2xsZWN0aW9uLmNvbGxlY3Rpb24uZmluZCh0aGlzLl9zZWxlY3Rvciwgb3B0aW9ucyk7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIGdldFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGFsbCBtYXRjaGluZyBkb2N1bWVudChzKSBhcyBhbiBBcnJheS4gQWxpYXMgb2YgYC5mZXRjaCgpYFxuICAgKiBAcmV0dXJucyB7W09iamVjdF19XG4gICAqL1xuICBnZXQoKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW2dldCgpXScpO1xuICAgIHJldHVybiB0aGlzLmN1cnNvci5mZXRjaCgpO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBoYXNOZXh0XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgYHRydWVgIGlmIHRoZXJlIGlzIG5leHQgaXRlbSBhdmFpbGFibGUgb24gQ3Vyc29yXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaGFzTmV4dCgpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbaGFzTmV4dCgpXScpO1xuICAgIHJldHVybiB0aGlzLl9jdXJyZW50IDwgKHRoaXMuY3Vyc29yLmNvdW50KCkgLSAxKTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgbmV4dFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIG5leHQgaXRlbSBvbiBDdXJzb3IsIGlmIGF2YWlsYWJsZVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fHVuZGVmaW5lZH1cbiAgICovXG4gIG5leHQoKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW25leHQoKV0nKTtcbiAgICB0aGlzLmN1cnNvci5mZXRjaCgpWysrdGhpcy5fY3VycmVudF07XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIGhhc1ByZXZpb3VzXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgYHRydWVgIGlmIHRoZXJlIGlzIHByZXZpb3VzIGl0ZW0gYXZhaWxhYmxlIG9uIEN1cnNvclxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGhhc1ByZXZpb3VzKCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtoYXNQcmV2aW91cygpXScpO1xuICAgIHJldHVybiB0aGlzLl9jdXJyZW50ICE9PSAtMTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgcHJldmlvdXNcbiAgICogQHN1bW1hcnkgUmV0dXJucyBwcmV2aW91cyBpdGVtIG9uIEN1cnNvciwgaWYgYXZhaWxhYmxlXG4gICAqIEByZXR1cm5zIHtPYmplY3R8dW5kZWZpbmVkfVxuICAgKi9cbiAgcHJldmlvdXMoKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW3ByZXZpb3VzKCldJyk7XG4gICAgdGhpcy5jdXJzb3IuZmV0Y2goKVstLXRoaXMuX2N1cnJlbnRdO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBmZXRjaFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGFsbCBtYXRjaGluZyBkb2N1bWVudChzKSBhcyBhbiBBcnJheS5cbiAgICogQHJldHVybnMge1tPYmplY3RdfVxuICAgKi9cbiAgZmV0Y2goKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW2ZldGNoKCldJyk7XG4gICAgcmV0dXJuIHRoaXMuY3Vyc29yLmZldGNoKCkgfHwgW107XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIGZpcnN0XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgZmlyc3QgaXRlbSBvbiBDdXJzb3IsIGlmIGF2YWlsYWJsZVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fHVuZGVmaW5lZH1cbiAgICovXG4gIGZpcnN0KCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtmaXJzdCgpXScpO1xuICAgIHRoaXMuX2N1cnJlbnQgPSAwO1xuICAgIHJldHVybiB0aGlzLmZldGNoKClbdGhpcy5fY3VycmVudF07XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIGxhc3RcbiAgICogQHN1bW1hcnkgUmV0dXJucyBsYXN0IGl0ZW0gb24gQ3Vyc29yLCBpZiBhdmFpbGFibGVcbiAgICogQHJldHVybnMge09iamVjdHx1bmRlZmluZWR9XG4gICAqL1xuICBsYXN0KCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtsYXN0KCldJyk7XG4gICAgdGhpcy5fY3VycmVudCA9IHRoaXMuY291bnQoKSAtIDE7XG4gICAgcmV0dXJuIHRoaXMuZmV0Y2goKVt0aGlzLl9jdXJyZW50XTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgY291bnRcbiAgICogQHN1bW1hcnkgUmV0dXJucyB0aGUgbnVtYmVyIG9mIGRvY3VtZW50cyB0aGF0IG1hdGNoIGEgcXVlcnlcbiAgICogQHJldHVybnMge051bWJlcn1cbiAgICovXG4gIGNvdW50KCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtjb3VudCgpXScpO1xuICAgIHJldHVybiB0aGlzLmN1cnNvci5jb3VudCgpO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSByZW1vdmVcbiAgICogQHBhcmFtIGNhbGxiYWNrIHtGdW5jdGlvbn0gLSBUcmlnZ2VyZWQgYXN5bmNocm9ub3VzbHkgYWZ0ZXIgaXRlbSBpcyByZW1vdmVkIG9yIGZhaWxlZCB0byBiZSByZW1vdmVkXG4gICAqIEBzdW1tYXJ5IFJlbW92ZXMgYWxsIGRvY3VtZW50cyB0aGF0IG1hdGNoIGEgcXVlcnlcbiAgICogQHJldHVybnMge0ZpbGVzQ3Vyc29yfVxuICAgKi9cbiAgcmVtb3ZlKGNhbGxiYWNrKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW3JlbW92ZSgpXScpO1xuICAgIHRoaXMuX2NvbGxlY3Rpb24ucmVtb3ZlKHRoaXMuX3NlbGVjdG9yLCBjYWxsYmFjayk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIGZvckVhY2hcbiAgICogQHBhcmFtIGNhbGxiYWNrIHtGdW5jdGlvbn0gLSBGdW5jdGlvbiB0byBjYWxsLiBJdCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRocmVlIGFyZ3VtZW50czogdGhlIGBmaWxlYCwgYSAwLWJhc2VkIGluZGV4LCBhbmQgY3Vyc29yIGl0c2VsZlxuICAgKiBAcGFyYW0gY29udGV4dCB7T2JqZWN0fSAtIEFuIG9iamVjdCB3aGljaCB3aWxsIGJlIHRoZSB2YWx1ZSBvZiBgdGhpc2AgaW5zaWRlIGBjYWxsYmFja2BcbiAgICogQHN1bW1hcnkgQ2FsbCBgY2FsbGJhY2tgIG9uY2UgZm9yIGVhY2ggbWF0Y2hpbmcgZG9jdW1lbnQsIHNlcXVlbnRpYWxseSBhbmQgc3luY2hyb25vdXNseS5cbiAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICovXG4gIGZvckVhY2goY2FsbGJhY2ssIGNvbnRleHQgPSB7fSkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtmb3JFYWNoKCldJyk7XG4gICAgdGhpcy5jdXJzb3IuZm9yRWFjaChjYWxsYmFjaywgY29udGV4dCk7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIGVhY2hcbiAgICogQHN1bW1hcnkgUmV0dXJucyBhbiBBcnJheSBvZiBGaWxlQ3Vyc29yIG1hZGUgZm9yIGVhY2ggZG9jdW1lbnQgb24gY3VycmVudCBjdXJzb3JcbiAgICogICAgICAgICAgVXNlZnVsIHdoZW4gdXNpbmcgaW4ge3sjZWFjaCBGaWxlc0N1cnNvciNlYWNofX0uLi57ey9lYWNofX0gYmxvY2sgdGVtcGxhdGUgaGVscGVyXG4gICAqIEByZXR1cm5zIHtbRmlsZUN1cnNvcl19XG4gICAqL1xuICBlYWNoKCkge1xuICAgIHJldHVybiB0aGlzLm1hcCgoZmlsZSkgPT4ge1xuICAgICAgcmV0dXJuIG5ldyBGaWxlQ3Vyc29yKGZpbGUsIHRoaXMuX2NvbGxlY3Rpb24pO1xuICAgIH0pO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBtYXBcbiAgICogQHBhcmFtIGNhbGxiYWNrIHtGdW5jdGlvbn0gLSBGdW5jdGlvbiB0byBjYWxsLiBJdCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRocmVlIGFyZ3VtZW50czogdGhlIGBmaWxlYCwgYSAwLWJhc2VkIGluZGV4LCBhbmQgY3Vyc29yIGl0c2VsZlxuICAgKiBAcGFyYW0gY29udGV4dCB7T2JqZWN0fSAtIEFuIG9iamVjdCB3aGljaCB3aWxsIGJlIHRoZSB2YWx1ZSBvZiBgdGhpc2AgaW5zaWRlIGBjYWxsYmFja2BcbiAgICogQHN1bW1hcnkgTWFwIGBjYWxsYmFja2Agb3ZlciBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzLiBSZXR1cm5zIGFuIEFycmF5LlxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBtYXAoY2FsbGJhY2ssIGNvbnRleHQgPSB7fSkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFttYXAoKV0nKTtcbiAgICByZXR1cm4gdGhpcy5jdXJzb3IubWFwKGNhbGxiYWNrLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgY3VycmVudFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGN1cnJlbnQgaXRlbSBvbiBDdXJzb3IsIGlmIGF2YWlsYWJsZVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fHVuZGVmaW5lZH1cbiAgICovXG4gIGN1cnJlbnQoKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW2N1cnJlbnQoKV0nKTtcbiAgICBpZiAodGhpcy5fY3VycmVudCA8IDApIHtcbiAgICAgIHRoaXMuX2N1cnJlbnQgPSAwO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5mZXRjaCgpW3RoaXMuX2N1cnJlbnRdO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBvYnNlcnZlXG4gICAqIEBwYXJhbSBjYWxsYmFja3Mge09iamVjdH0gLSBGdW5jdGlvbnMgdG8gY2FsbCB0byBkZWxpdmVyIHRoZSByZXN1bHQgc2V0IGFzIGl0IGNoYW5nZXNcbiAgICogQHN1bW1hcnkgV2F0Y2ggYSBxdWVyeS4gUmVjZWl2ZSBjYWxsYmFja3MgYXMgdGhlIHJlc3VsdCBzZXQgY2hhbmdlcy5cbiAgICogQHVybCBodHRwOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI01vbmdvLUN1cnNvci1vYnNlcnZlXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IC0gbGl2ZSBxdWVyeSBoYW5kbGVcbiAgICovXG4gIG9ic2VydmUoY2FsbGJhY2tzKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW29ic2VydmUoKV0nKTtcbiAgICByZXR1cm4gdGhpcy5jdXJzb3Iub2JzZXJ2ZShjYWxsYmFja3MpO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBvYnNlcnZlQ2hhbmdlc1xuICAgKiBAcGFyYW0gY2FsbGJhY2tzIHtPYmplY3R9IC0gRnVuY3Rpb25zIHRvIGNhbGwgdG8gZGVsaXZlciB0aGUgcmVzdWx0IHNldCBhcyBpdCBjaGFuZ2VzXG4gICAqIEBzdW1tYXJ5IFdhdGNoIGEgcXVlcnkuIFJlY2VpdmUgY2FsbGJhY2tzIGFzIHRoZSByZXN1bHQgc2V0IGNoYW5nZXMuIE9ubHkgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gdGhlIG9sZCBhbmQgbmV3IGRvY3VtZW50cyBhcmUgcGFzc2VkIHRvIHRoZSBjYWxsYmFja3MuXG4gICAqIEB1cmwgaHR0cDovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNNb25nby1DdXJzb3Itb2JzZXJ2ZUNoYW5nZXNcbiAgICogQHJldHVybnMge09iamVjdH0gLSBsaXZlIHF1ZXJ5IGhhbmRsZVxuICAgKi9cbiAgb2JzZXJ2ZUNoYW5nZXMoY2FsbGJhY2tzKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW29ic2VydmVDaGFuZ2VzKCldJyk7XG4gICAgcmV0dXJuIHRoaXMuY3Vyc29yLm9ic2VydmVDaGFuZ2VzKGNhbGxiYWNrcyk7XG4gIH1cbn1cbiIsImltcG9ydCB7IF8gfSAgICAgZnJvbSAnbWV0ZW9yL3VuZGVyc2NvcmUnO1xuaW1wb3J0IHsgY2hlY2sgfSBmcm9tICdtZXRlb3IvY2hlY2snO1xuXG4vKlxuICogQGNvbnN0IHtGdW5jdGlvbn0gZml4SlNPTlBhcnNlIC0gRml4IGlzc3VlIHdpdGggRGF0ZSBwYXJzZVxuICovXG5jb25zdCBmaXhKU09OUGFyc2UgPSBmdW5jdGlvbihvYmopIHtcbiAgZm9yIChsZXQga2V5IGluIG9iaikge1xuICAgIGlmIChfLmlzU3RyaW5nKG9ialtrZXldKSAmJiAhIX5vYmpba2V5XS5pbmRleE9mKCc9LS1KU09OLURBVEUtLT0nKSkge1xuICAgICAgb2JqW2tleV0gPSBvYmpba2V5XS5yZXBsYWNlKCc9LS1KU09OLURBVEUtLT0nLCAnJyk7XG4gICAgICBvYmpba2V5XSA9IG5ldyBEYXRlKHBhcnNlSW50KG9ialtrZXldKSk7XG4gICAgfSBlbHNlIGlmIChfLmlzT2JqZWN0KG9ialtrZXldKSkge1xuICAgICAgb2JqW2tleV0gPSBmaXhKU09OUGFyc2Uob2JqW2tleV0pO1xuICAgIH0gZWxzZSBpZiAoXy5pc0FycmF5KG9ialtrZXldKSkge1xuICAgICAgbGV0IHY7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG9ialtrZXldLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHYgPSBvYmpba2V5XVtpXTtcbiAgICAgICAgaWYgKF8uaXNPYmplY3QodikpIHtcbiAgICAgICAgICBvYmpba2V5XVtpXSA9IGZpeEpTT05QYXJzZSh2KTtcbiAgICAgICAgfSBlbHNlIGlmIChfLmlzU3RyaW5nKHYpICYmICEhfnYuaW5kZXhPZignPS0tSlNPTi1EQVRFLS09JykpIHtcbiAgICAgICAgICB2ID0gdi5yZXBsYWNlKCc9LS1KU09OLURBVEUtLT0nLCAnJyk7XG4gICAgICAgICAgb2JqW2tleV1baV0gPSBuZXcgRGF0ZShwYXJzZUludCh2KSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG9iajtcbn07XG5cbi8qXG4gKiBAY29uc3Qge0Z1bmN0aW9ufSBmaXhKU09OU3RyaW5naWZ5IC0gRml4IGlzc3VlIHdpdGggRGF0ZSBzdHJpbmdpZnlcbiAqL1xuY29uc3QgZml4SlNPTlN0cmluZ2lmeSA9IGZ1bmN0aW9uKG9iaikge1xuICBmb3IgKGxldCBrZXkgaW4gb2JqKSB7XG4gICAgaWYgKF8uaXNEYXRlKG9ialtrZXldKSkge1xuICAgICAgb2JqW2tleV0gPSBgPS0tSlNPTi1EQVRFLS09JHsrb2JqW2tleV19YDtcbiAgICB9IGVsc2UgaWYgKF8uaXNPYmplY3Qob2JqW2tleV0pKSB7XG4gICAgICBvYmpba2V5XSA9IGZpeEpTT05TdHJpbmdpZnkob2JqW2tleV0pO1xuICAgIH0gZWxzZSBpZiAoXy5pc0FycmF5KG9ialtrZXldKSkge1xuICAgICAgbGV0IHY7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG9ialtrZXldLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHYgPSBvYmpba2V5XVtpXTtcbiAgICAgICAgaWYgKF8uaXNPYmplY3QodikpIHtcbiAgICAgICAgICBvYmpba2V5XVtpXSA9IGZpeEpTT05TdHJpbmdpZnkodik7XG4gICAgICAgIH0gZWxzZSBpZiAoXy5pc0RhdGUodikpIHtcbiAgICAgICAgICBvYmpba2V5XVtpXSA9IGA9LS1KU09OLURBVEUtLT0keyt2fWA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG9iajtcbn07XG5cbi8qXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBwcml2YXRlXG4gKiBAbmFtZSBmb3JtYXRGbGVVUkxcbiAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlUmVmIC0gRmlsZSByZWZlcmVuY2Ugb2JqZWN0XG4gKiBAcGFyYW0ge1N0cmluZ30gdmVyc2lvbiAtIFtPcHRpb25hbF0gVmVyc2lvbiBvZiBmaWxlIHlvdSB3b3VsZCBsaWtlIGJ1aWxkIFVSTCBmb3JcbiAqIEBzdW1tYXJ5IFJldHVybnMgZm9ybWF0dGVkIFVSTCBmb3IgZmlsZVxuICogQHJldHVybnMge1N0cmluZ30gRG93bmxvYWRhYmxlIGxpbmtcbiAqL1xuY29uc3QgZm9ybWF0RmxlVVJMID0gKGZpbGVSZWYsIHZlcnNpb24gPSAnb3JpZ2luYWwnKSA9PiB7XG4gIGxldCBleHQ7XG4gIGNoZWNrKGZpbGVSZWYsIE9iamVjdCk7XG4gIGNoZWNrKHZlcnNpb24sIFN0cmluZyk7XG5cbiAgY29uc3QgX3Jvb3QgPSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMLnJlcGxhY2UoL1xcLyskLywgJycpO1xuICBjb25zdCB2UmVmID0gKGZpbGVSZWYudmVyc2lvbnMgJiYgZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXSkgfHwgZmlsZVJlZiB8fCB7fTtcblxuICBpZiAoXy5pc1N0cmluZyh2UmVmLmV4dGVuc2lvbikpIHtcbiAgICBleHQgPSBgLiR7dlJlZi5leHRlbnNpb24ucmVwbGFjZSgvXlxcLi8sICcnKX1gO1xuICB9IGVsc2Uge1xuICAgIGV4dCA9ICcnO1xuICB9XG5cbiAgaWYgKGZpbGVSZWYucHVibGljID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIF9yb290ICsgKHZlcnNpb24gPT09ICdvcmlnaW5hbCcgPyBgJHtmaWxlUmVmLl9kb3dubG9hZFJvdXRlfS8ke2ZpbGVSZWYuX2lkfSR7ZXh0fWAgOiBgJHtmaWxlUmVmLl9kb3dubG9hZFJvdXRlfS8ke3ZlcnNpb259LSR7ZmlsZVJlZi5faWR9JHtleHR9YCk7XG4gIH1cbiAgcmV0dXJuIF9yb290ICsgYCR7ZmlsZVJlZi5fZG93bmxvYWRSb3V0ZX0vJHtmaWxlUmVmLl9jb2xsZWN0aW9uTmFtZX0vJHtmaWxlUmVmLl9pZH0vJHt2ZXJzaW9ufS8ke2ZpbGVSZWYuX2lkfSR7ZXh0fWA7XG59O1xuXG5leHBvcnQgeyBmaXhKU09OUGFyc2UsIGZpeEpTT05TdHJpbmdpZnksIGZvcm1hdEZsZVVSTCB9O1xuIiwiaW1wb3J0IGZzICAgICAgICAgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHsgXyB9ICAgICAgZnJvbSAnbWV0ZW9yL3VuZGVyc2NvcmUnO1xuaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5jb25zdCBOT09QID0gKCkgPT4ge307XG5cbi8qXG4gKiBAY29uc3Qge09iamVjdH0gYm91bmQgICAtIE1ldGVvci5iaW5kRW52aXJvbm1lbnQgKEZpYmVyIHdyYXBwZXIpXG4gKiBAY29uc3Qge09iamVjdH0gZmRDYWNoZSAtIEZpbGUgRGVzY3JpcHRvcnMgQ2FjaGVcbiAqL1xuY29uc3QgYm91bmQgICA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoY2FsbGJhY2sgPT4gY2FsbGJhY2soKSk7XG5jb25zdCBmZENhY2hlID0ge307XG5cbi8qXG4gKiBAcHJpdmF0ZVxuICogQGxvY3VzIFNlcnZlclxuICogQGNsYXNzIFdyaXRlU3RyZWFtXG4gKiBAcGFyYW0gcGF0aCAgICAgIHtTdHJpbmd9IC0gUGF0aCB0byBmaWxlIG9uIEZTXG4gKiBAcGFyYW0gbWF4TGVuZ3RoIHtOdW1iZXJ9IC0gTWF4IGFtb3VudCBvZiBjaHVua3MgaW4gc3RyZWFtXG4gKiBAcGFyYW0gZmlsZSAgICAgIHtPYmplY3R9IC0gZmlsZVJlZiBPYmplY3RcbiAqIEBzdW1tYXJ5IHdyaXRhYmxlU3RyZWFtIHdyYXBwZXIgY2xhc3MsIG1ha2VzIHN1cmUgY2h1bmtzIGlzIHdyaXR0ZW4gaW4gZ2l2ZW4gb3JkZXIuIEltcGxlbWVudGF0aW9uIG9mIHF1ZXVlIHN0cmVhbS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgV3JpdGVTdHJlYW0ge1xuICBjb25zdHJ1Y3RvcihwYXRoLCBtYXhMZW5ndGgsIGZpbGUsIHBlcm1pc3Npb25zKSB7XG4gICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgICB0aGlzLm1heExlbmd0aCA9IG1heExlbmd0aDtcbiAgICB0aGlzLmZpbGUgPSBmaWxlO1xuICAgIHRoaXMucGVybWlzc2lvbnMgPSBwZXJtaXNzaW9ucztcbiAgICBpZiAoIXRoaXMucGF0aCB8fCAhXy5pc1N0cmluZyh0aGlzLnBhdGgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5mZCAgICAgICAgICAgID0gbnVsbDtcbiAgICB0aGlzLndyaXR0ZW5DaHVua3MgPSAwO1xuICAgIHRoaXMuZW5kZWQgICAgICAgICA9IGZhbHNlO1xuICAgIHRoaXMuYWJvcnRlZCAgICAgICA9IGZhbHNlO1xuXG4gICAgaWYgKGZkQ2FjaGVbdGhpcy5wYXRoXSAmJiAhZmRDYWNoZVt0aGlzLnBhdGhdLmVuZGVkICYmICFmZENhY2hlW3RoaXMucGF0aF0uYWJvcnRlZCkge1xuICAgICAgdGhpcy5mZCA9IGZkQ2FjaGVbdGhpcy5wYXRoXS5mZDtcbiAgICAgIHRoaXMud3JpdHRlbkNodW5rcyA9IGZkQ2FjaGVbdGhpcy5wYXRoXS53cml0dGVuQ2h1bmtzO1xuICAgIH0gZWxzZSB7XG4gICAgICBmcy5lbnN1cmVGaWxlKHRoaXMucGF0aCwgKGVmRXJyb3IpID0+IHtcbiAgICAgICAgYm91bmQoKCkgPT4ge1xuICAgICAgICAgIGlmIChlZkVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLmFib3J0KCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDUwMCwgJ1tGaWxlc0NvbGxlY3Rpb25dIFt3cml0ZVN0cmVhbV0gW2Vuc3VyZUZpbGVdIFtFcnJvcjpdICcgKyBlZkVycm9yKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnMub3Blbih0aGlzLnBhdGgsICdyKycsIHRoaXMucGVybWlzc2lvbnMsIChvRXJyb3IsIGZkKSA9PiB7XG4gICAgICAgICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAob0Vycm9yKSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLmFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDUwMCwgJ1tGaWxlc0NvbGxlY3Rpb25dIFt3cml0ZVN0cmVhbV0gW2Vuc3VyZUZpbGVdIFtvcGVuXSBbRXJyb3I6XSAnICsgb0Vycm9yKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgdGhpcy5mZCA9IGZkO1xuICAgICAgICAgICAgICAgICAgZmRDYWNoZVt0aGlzLnBhdGhdID0gdGhpcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qXG4gICAqIEBtZW1iZXJPZiB3cml0ZVN0cmVhbVxuICAgKiBAbmFtZSB3cml0ZVxuICAgKiBAcGFyYW0ge051bWJlcn0gbnVtIC0gQ2h1bmsgcG9zaXRpb24gaW4gYSBzdHJlYW1cbiAgICogQHBhcmFtIHtCdWZmZXJ9IGNodW5rIC0gQnVmZmVyIChjaHVuayBiaW5hcnkgZGF0YSlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFja1xuICAgKiBAc3VtbWFyeSBXcml0ZSBjaHVuayBpbiBnaXZlbiBvcmRlclxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gLSBUcnVlIGlmIGNodW5rIGlzIHNlbnQgdG8gc3RyZWFtLCBmYWxzZSBpZiBjaHVuayBpcyBzZXQgaW50byBxdWV1ZVxuICAgKi9cbiAgd3JpdGUobnVtLCBjaHVuaywgY2FsbGJhY2spIHtcbiAgICBpZiAoIXRoaXMuYWJvcnRlZCAmJiAhdGhpcy5lbmRlZCkge1xuICAgICAgaWYgKHRoaXMuZmQpIHtcbiAgICAgICAgZnMud3JpdGUodGhpcy5mZCwgY2h1bmssIDAsIGNodW5rLmxlbmd0aCwgKG51bSAtIDEpICogdGhpcy5maWxlLmNodW5rU2l6ZSwgKGVycm9yLCB3cml0dGVuLCBidWZmZXIpID0+IHtcbiAgICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhlcnJvciwgd3JpdHRlbiwgYnVmZmVyKTtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tGaWxlc0NvbGxlY3Rpb25dIFt3cml0ZVN0cmVhbV0gW3dyaXRlXSBbRXJyb3I6XScsIGVycm9yKTtcbiAgICAgICAgICAgICAgdGhpcy5hYm9ydCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgKyt0aGlzLndyaXR0ZW5DaHVua3M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgTWV0ZW9yLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMud3JpdGUobnVtLCBjaHVuaywgY2FsbGJhY2spO1xuICAgICAgICB9LCAyNSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qXG4gICAqIEBtZW1iZXJPZiB3cml0ZVN0cmVhbVxuICAgKiBAbmFtZSBlbmRcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFja1xuICAgKiBAc3VtbWFyeSBGaW5pc2hlcyB3cml0aW5nIHRvIHdyaXRhYmxlU3RyZWFtLCBvbmx5IGFmdGVyIGFsbCBjaHVua3MgaW4gcXVldWUgaXMgd3JpdHRlblxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gLSBUcnVlIGlmIHN0cmVhbSBpcyBmdWxmaWxsZWQsIGZhbHNlIGlmIHF1ZXVlIGlzIGluIHByb2dyZXNzXG4gICAqL1xuICBlbmQoY2FsbGJhY2spIHtcbiAgICBpZiAoIXRoaXMuYWJvcnRlZCAmJiAhdGhpcy5lbmRlZCkge1xuICAgICAgaWYgKHRoaXMud3JpdHRlbkNodW5rcyA9PT0gdGhpcy5tYXhMZW5ndGgpIHtcbiAgICAgICAgZnMuY2xvc2UodGhpcy5mZCwgKCkgPT4ge1xuICAgICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAgIGRlbGV0ZSBmZENhY2hlW3RoaXMucGF0aF07XG4gICAgICAgICAgICB0aGlzLmVuZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKHZvaWQgMCwgdHJ1ZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgZnMuc3RhdCh0aGlzLnBhdGgsIChlcnJvciwgc3RhdCkgPT4ge1xuICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgaWYgKCFlcnJvciAmJiBzdGF0KSB7XG4gICAgICAgICAgICB0aGlzLndyaXR0ZW5DaHVua3MgPSBNYXRoLmNlaWwoc3RhdC5zaXplIC8gdGhpcy5maWxlLmNodW5rU2l6ZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIE1ldGVvci5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZW5kKGNhbGxiYWNrKTtcbiAgICAgICAgICB9LCAyNSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKHZvaWQgMCwgdGhpcy5lbmRlZCk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qXG4gICAqIEBtZW1iZXJPZiB3cml0ZVN0cmVhbVxuICAgKiBAbmFtZSBhYm9ydFxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrXG4gICAqIEBzdW1tYXJ5IEFib3J0cyB3cml0aW5nIHRvIHdyaXRhYmxlU3RyZWFtLCByZW1vdmVzIGNyZWF0ZWQgZmlsZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gLSBUcnVlXG4gICAqL1xuICBhYm9ydChjYWxsYmFjaykge1xuICAgIHRoaXMuYWJvcnRlZCA9IHRydWU7XG4gICAgZGVsZXRlIGZkQ2FjaGVbdGhpcy5wYXRoXTtcbiAgICBmcy51bmxpbmsodGhpcy5wYXRoLCAoY2FsbGJhY2sgfHwgTk9PUCkpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLypcbiAgICogQG1lbWJlck9mIHdyaXRlU3RyZWFtXG4gICAqIEBuYW1lIHN0b3BcbiAgICogQHN1bW1hcnkgU3RvcCB3cml0aW5nIHRvIHdyaXRhYmxlU3RyZWFtXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSAtIFRydWVcbiAgICovXG4gIHN0b3AoKSB7XG4gICAgdGhpcy5hYm9ydGVkID0gdHJ1ZTtcbiAgICBkZWxldGUgZmRDYWNoZVt0aGlzLnBhdGhdO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59XG4iXX0=
