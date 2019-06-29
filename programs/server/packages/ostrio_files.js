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
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let WebApp;
module.link("meteor/webapp", {
  WebApp(v) {
    WebApp = v;
  }

}, 1);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 2);
let Random;
module.link("meteor/random", {
  Random(v) {
    Random = v;
  }

}, 3);
let Cookies;
module.link("meteor/ostrio:cookies", {
  Cookies(v) {
    Cookies = v;
  }

}, 4);
let WriteStream;
module.link("./write-stream.js", {
  default(v) {
    WriteStream = v;
  }

}, 5);
let check, Match;
module.link("meteor/check", {
  check(v) {
    check = v;
  },

  Match(v) {
    Match = v;
  }

}, 6);
let FilesCollectionCore;
module.link("./core.js", {
  default(v) {
    FilesCollectionCore = v;
  }

}, 7);
let fixJSONParse, fixJSONStringify, helpers;
module.link("./lib.js", {
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
module.link("fs-extra", {
  default(v) {
    fs = v;
  }

}, 9);
let nodeQs;
module.link("querystring", {
  default(v) {
    nodeQs = v;
  }

}, 10);
let request;
module.link("request", {
  default(v) {
    request = v;
  }

}, 11);
let fileType;
module.link("file-type", {
  default(v) {
    fileType = v;
  }

}, 12);
let nodePath;
module.link("path", {
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

            self._currentUploads[doc._id].end(); // We can be unlucky to run into a race condition where another server removed this document before the change of `isFinished` is registered on this server.
            // Therefore it's better to double-check with the main collection if the file is referenced there. Issue: https://github.com/VeliovGroup/Meteor-Files/issues/672


            if (!doc.isFinished && self.collection.find({
              _id: doc._id
            }).count() === 0) {
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

              if (httpReq.headers['x-mtok'] && this._getUserId(httpReq.headers['x-mtok'])) {
                user = {
                  userId: this._getUserId(httpReq.headers['x-mtok'])
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
                  opts.binData = Buffer.from(body, 'base64');
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
          opts.binData = Buffer.from(opts.binData, 'base64');
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
        let buf = Buffer.alloc(262);
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
   * @name _getUserId
   * @summary Returns `userId` matching the xmtok token derived from Meteor.server.sessions
   * @returns {String}
   */


  _getUserId(xmtok) {
    if (!xmtok) return null; // throw an error upon an unexpected type of Meteor.server.sessions in order to identify breaking changes

    if (!Meteor.server.sessions instanceof Map || !helpers.isObject(Meteor.server.sessions)) {
      throw new Error('Received incompatible type of Meteor.server.sessions');
    }

    if (Meteor.server.sessions instanceof Map && Meteor.server.sessions.has(xmtok) && helpers.isObject(Meteor.server.sessions.get(xmtok))) {
      // to be used with >= Meteor 1.8.1 where Meteor.server.sessions is a Map
      return Meteor.server.sessions.get(xmtok).userId;
    } else if (helpers.isObject(Meteor.server.sessions) && xmtok in Meteor.server.sessions && helpers.isObject(Meteor.server.sessions[xmtok])) {
      // to be used with < Meteor 1.8.1 where Meteor.server.sessions is an Object
      return Meteor.server.sessions[xmtok].userId;
    }

    return null;
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
        const userId = this._getUserId(mtok);

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

    if (selector === void 0) {
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
module.link("eventemitter3", {
  EventEmitter(v) {
    EventEmitter = v;
  }

}, 0);
let check, Match;
module.link("meteor/check", {
  check(v) {
    check = v;
  },

  Match(v) {
    Match = v;
  }

}, 1);
let formatFleURL, helpers;
module.link("./lib.js", {
  formatFleURL(v) {
    formatFleURL = v;
  },

  helpers(v) {
    helpers = v;
  }

}, 2);
let FilesCursor, FileCursor;
module.link("./cursor.js", {
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
      (console.info || console.log || function () {}).apply(void 0, arguments);
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
    this._debug(`[FilesCollection] [link(${helpers.isObject(fileRef) ? fileRef._id : void 0}, ${version})]`);

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
module.link("meteor/meteor", {
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
module.link("meteor/check", {
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
module.link("fs-extra", {
  default(v) {
    fs = v;
  }

}, 0);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 1);
let helpers;
module.link("./lib.js", {
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

},"node_modules":{"fs-extra":{"package.json":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/fs-extra/package.json                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "fs-extra",
  "version": "8.1.0",
  "main": "./lib/index.js"
};

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

}}},"eventemitter3":{"package.json":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/eventemitter3/package.json                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "eventemitter3",
  "version": "4.0.0",
  "main": "index.js"
};

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

}},"request":{"package.json":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/request/package.json                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "request",
  "version": "2.88.0",
  "main": "index.js"
};

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

}},"file-type":{"package.json":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/file-type/package.json                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "name": "file-type",
  "version": "12.0.0"
};

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZpbGVzL3NlcnZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZpbGVzL2NvcmUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL29zdHJpbzpmaWxlcy9jdXJzb3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL29zdHJpbzpmaWxlcy9saWIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL29zdHJpbzpmaWxlcy93cml0ZS1zdHJlYW0uanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiRmlsZXNDb2xsZWN0aW9uIiwiTW9uZ28iLCJsaW5rIiwidiIsIldlYkFwcCIsIk1ldGVvciIsIlJhbmRvbSIsIkNvb2tpZXMiLCJXcml0ZVN0cmVhbSIsImRlZmF1bHQiLCJjaGVjayIsIk1hdGNoIiwiRmlsZXNDb2xsZWN0aW9uQ29yZSIsImZpeEpTT05QYXJzZSIsImZpeEpTT05TdHJpbmdpZnkiLCJoZWxwZXJzIiwiZnMiLCJub2RlUXMiLCJyZXF1ZXN0IiwiZmlsZVR5cGUiLCJub2RlUGF0aCIsImJvdW5kIiwiYmluZEVudmlyb25tZW50IiwiY2FsbGJhY2siLCJOT09QIiwiY29uc3RydWN0b3IiLCJjb25maWciLCJzdG9yYWdlUGF0aCIsImRlYnVnIiwic2NoZW1hIiwicHVibGljIiwic3RyaWN0IiwiY2h1bmtTaXplIiwicHJvdGVjdGVkIiwiY29sbGVjdGlvbiIsInBlcm1pc3Npb25zIiwiY2FjaGVDb250cm9sIiwiZG93bmxvYWRSb3V0ZSIsIm9uQWZ0ZXJVcGxvYWQiLCJvbkFmdGVyUmVtb3ZlIiwiZGlzYWJsZVVwbG9hZCIsIm9uQmVmb3JlUmVtb3ZlIiwiaW50ZWdyaXR5Q2hlY2siLCJjb2xsZWN0aW9uTmFtZSIsIm9uQmVmb3JlVXBsb2FkIiwibmFtaW5nRnVuY3Rpb24iLCJyZXNwb25zZUhlYWRlcnMiLCJkaXNhYmxlRG93bmxvYWQiLCJhbGxvd0NsaWVudENvZGUiLCJkb3dubG9hZENhbGxiYWNrIiwib25Jbml0aWF0ZVVwbG9hZCIsImludGVyY2VwdERvd25sb2FkIiwiY29udGludWVVcGxvYWRUVEwiLCJwYXJlbnREaXJQZXJtaXNzaW9ucyIsIl9wcmVDb2xsZWN0aW9uIiwiX3ByZUNvbGxlY3Rpb25OYW1lIiwic2VsZiIsImlzQm9vbGVhbiIsIk1hdGgiLCJmbG9vciIsImlzU3RyaW5nIiwiQ29sbGVjdGlvbiIsIl9uYW1lIiwiZmlsZXNDb2xsZWN0aW9uIiwiU3RyaW5nIiwiRXJyb3IiLCJyZXBsYWNlIiwiaXNGdW5jdGlvbiIsImlzTnVtYmVyIiwicGFyc2VJbnQiLCJpc09iamVjdCIsIl9jdXJyZW50VXBsb2FkcyIsInJlc3BvbnNlQ29kZSIsImZpbGVSZWYiLCJ2ZXJzaW9uUmVmIiwiaGVhZGVycyIsIlByYWdtYSIsIlRyYWlsZXIiLCJzaXplIiwiQ29ubmVjdGlvbiIsInR5cGUiLCJzZXAiLCJzcCIsImFwcGx5IiwiYXJndW1lbnRzIiwibm9ybWFsaXplIiwiX2RlYnVnIiwibWtkaXJzIiwibW9kZSIsImVycm9yIiwiQm9vbGVhbiIsIk51bWJlciIsIkZ1bmN0aW9uIiwiT25lT2YiLCJPYmplY3QiLCJfZW5zdXJlSW5kZXgiLCJjcmVhdGVkQXQiLCJleHBpcmVBZnRlclNlY29uZHMiLCJiYWNrZ3JvdW5kIiwiX3ByZUNvbGxlY3Rpb25DdXJzb3IiLCJmaW5kIiwiZmllbGRzIiwiX2lkIiwiaXNGaW5pc2hlZCIsIm9ic2VydmUiLCJjaGFuZ2VkIiwiZG9jIiwicmVtb3ZlIiwicmVtb3ZlZCIsInN0b3AiLCJlbmQiLCJjb3VudCIsImFib3J0IiwiX2NyZWF0ZVN0cmVhbSIsInBhdGgiLCJvcHRzIiwiZmlsZUxlbmd0aCIsIl9jb250aW51ZVVwbG9hZCIsImZpbGUiLCJhYm9ydGVkIiwiZW5kZWQiLCJjb250VXBsZCIsImZpbmRPbmUiLCJfY2hlY2tBY2Nlc3MiLCJodHRwIiwicmVzdWx0IiwidXNlciIsInVzZXJJZCIsIl9nZXRVc2VyIiwicGFyYW1zIiwiY2FsbCIsImFzc2lnbiIsInJjIiwidGV4dCIsInJlc3BvbnNlIiwiaGVhZGVyc1NlbnQiLCJ3cml0ZUhlYWQiLCJsZW5ndGgiLCJmaW5pc2hlZCIsIl9tZXRob2ROYW1lcyIsIl9BYm9ydCIsIl9Xcml0ZSIsIl9TdGFydCIsIl9SZW1vdmUiLCJvbiIsIl9oYW5kbGVVcGxvYWQiLCJfZmluaXNoVXBsb2FkIiwiX2hhbmRsZVVwbG9hZFN5bmMiLCJ3cmFwQXN5bmMiLCJiaW5kIiwiY29ubmVjdEhhbmRsZXJzIiwidXNlIiwiaHR0cFJlcSIsImh0dHBSZXNwIiwibmV4dCIsIl9wYXJzZWRVcmwiLCJpbmRleE9mIiwibWV0aG9kIiwiaGFuZGxlRXJyb3IiLCJfZXJyb3IiLCJjb25zb2xlIiwid2FybiIsInRyYWNlIiwidG9TdHJpbmciLCJKU09OIiwic3RyaW5naWZ5IiwiYm9keSIsImRhdGEiLCJfZ2V0VXNlcklkIiwiZmlsZUlkIiwiZW9mIiwiYmluRGF0YSIsIkJ1ZmZlciIsImZyb20iLCJjaHVua0lkIiwiX3ByZXBhcmVVcGxvYWQiLCJtZXRhIiwiZW1pdCIsInBhcnNlIiwianNvbkVyciIsIl9fX3MiLCJuYW1lIiwiY2xvbmUiLCJEYXRlIiwibWF4TGVuZ3RoIiwiaW5zZXJ0Iiwib21pdCIsInJldHVybk1ldGEiLCJ1cGxvYWRSb3V0ZSIsImh0dHBSZXNwRXJyIiwidXJpIiwidXJpcyIsInN1YnN0cmluZyIsInNwbGl0IiwicXVlcnkiLCJ2ZXJzaW9uIiwiZG93bmxvYWQiLCJfZmlsZSIsIl9tZXRob2RzIiwic2VsZWN0b3IiLCJ1c2VyRnVuY3MiLCJ1c2VycyIsImN1cnNvciIsIkZTTmFtZSIsIk9wdGlvbmFsIiwiZSIsIl9vcHRzIiwidW5ibG9jayIsImhhbmRsZVVwbG9hZEVyciIsInVubGluayIsIm1ldGhvZHMiLCJ0cmFuc3BvcnQiLCJjdHgiLCJmaWxlTmFtZSIsIl9nZXRGaWxlTmFtZSIsImV4dGVuc2lvbiIsImV4dGVuc2lvbldpdGhEb3QiLCJfZ2V0RXh0IiwiZXh0IiwiX2RhdGFUb1NjaGVtYSIsImlzVXBsb2FkQWxsb3dlZCIsImNiIiwiY2htb2QiLCJfZ2V0TWltZVR5cGUiLCJfdXBkYXRlRmlsZVR5cGVzIiwiY29sSW5zZXJ0IiwidXBkYXRlIiwiJHNldCIsInByZVVwZGF0ZUVycm9yIiwid3JpdGUiLCJmaWxlRGF0YSIsIm1pbWUiLCJidWYiLCJhbGxvYyIsImZkIiwib3BlblN5bmMiLCJiciIsInJlYWRTeW5jIiwiY2xvc2UiLCJzbGljZSIsInhtdG9rIiwic2VydmVyIiwic2Vzc2lvbnMiLCJNYXAiLCJoYXMiLCJnZXQiLCJtdG9rIiwiY29va2llIiwiYnVmZmVyIiwiX2NhbGxiYWNrIiwiX3Byb2NlZWRBZnRlclVwbG9hZCIsInByb2NlZWRBZnRlclVwbG9hZCIsImlkIiwic3RyZWFtIiwiY3JlYXRlV3JpdGVTdHJlYW0iLCJmbGFncyIsInN0cmVhbUVyciIsImluc2VydEVyciIsImxvYWQiLCJ1cmwiLCJwYXRoUGFydHMiLCJzdG9yZVJlc3VsdCIsInN0YXQiLCJzdGF0cyIsInZlcnNpb25zIiwib3JpZ2luYWwiLCJwaXBlIiwiYWRkRmlsZSIsInN0YXRFcnIiLCJpc0ZpbGUiLCJfc3RvcmFnZVBhdGgiLCJmaWxlcyIsImZvckVhY2giLCJkb2NzIiwiZmV0Y2giLCJkZW55IiwicnVsZXMiLCJhbGxvdyIsImRlbnlDbGllbnQiLCJhbGxvd0NsaWVudCIsInZLZXkiLCJfNDA0Iiwib3JpZ2luYWxVcmwiLCJ2UmVmIiwicmVzcG9uc2VUeXBlIiwic2VydmUiLCJyZWFkYWJsZVN0cmVhbSIsIl9yZXNwb25zZVR5cGUiLCJmb3JjZTIwMCIsInBhcnRpcmFsIiwicmVxUmFuZ2UiLCJkaXNwb3NpdGlvblR5cGUiLCJzdGFydCIsInRha2UiLCJkaXNwb3NpdGlvbk5hbWUiLCJlbmNvZGVVUkkiLCJlbmNvZGVVUklDb21wb25lbnQiLCJkaXNwb3NpdGlvbkVuY29kaW5nIiwic2V0SGVhZGVyIiwicmFuZ2UiLCJhcnJheSIsImlzTmFOIiwicGxheSIsInN0cmVhbUVycm9ySGFuZGxlciIsImtleSIsInJlc3BvbmQiLCJjb2RlIiwiZGVzdHJveSIsImNyZWF0ZVJlYWRTdHJlYW0iLCJFdmVudEVtaXR0ZXIiLCJmb3JtYXRGbGVVUkwiLCJGaWxlc0N1cnNvciIsIkZpbGVDdXJzb3IiLCJpbmZvIiwibG9nIiwicG9wIiwidG9Mb3dlckNhc2UiLCJpc1ZpZGVvIiwidGVzdCIsImlzQXVkaW8iLCJpc0ltYWdlIiwiaXNUZXh0IiwiaXNKU09OIiwiaXNQREYiLCJkcyIsIl9kb3dubG9hZFJvdXRlIiwiX2NvbGxlY3Rpb25OYW1lIiwib3B0aW9ucyIsIlVSSUJhc2UiLCJfX2hlbHBlcnMiLCJvcHRpb25hbCIsImJsYWNrYm94IiwidXBkYXRlZEF0IiwiX2ZpbGVSZWYiLCJfY29sbGVjdGlvbiIsInByb3BlcnR5Iiwid2l0aCIsIl9zZWxlY3RvciIsIl9jdXJyZW50IiwiaGFzTmV4dCIsImhhc1ByZXZpb3VzIiwicHJldmlvdXMiLCJmaXJzdCIsImxhc3QiLCJjb250ZXh0IiwiZWFjaCIsIm1hcCIsImN1cnJlbnQiLCJjYWxsYmFja3MiLCJvYnNlcnZlQ2hhbmdlcyIsImlzVW5kZWZpbmVkIiwib2JqIiwiaXNBcnJheSIsIkFycmF5IiwicHJvdG90eXBlIiwiaXNFbXB0eSIsImlzRGF0ZSIsImtleXMiLCJfb2JqIiwiaGFzT3duUHJvcGVydHkiLCJpIiwiY2xlYXIiLCJub3ciLCJ0aHJvdHRsZSIsImZ1bmMiLCJ3YWl0IiwidGltZW91dCIsInRoYXQiLCJhcmdzIiwibGF0ZXIiLCJsZWFkaW5nIiwidGhyb3R0bGVkIiwicmVtYWluaW5nIiwiY2xlYXJUaW1lb3V0IiwidHJhaWxpbmciLCJzZXRUaW1lb3V0IiwiY2FuY2VsIiwiX2hlbHBlcnMiLCJfVVJJQmFzZSIsIl9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18iLCJST09UX1VSTCIsIl9yb290IiwiZmRDYWNoZSIsIndyaXR0ZW5DaHVua3MiLCJlbnN1cmVGaWxlIiwiZWZFcnJvciIsIm9wZW4iLCJvRXJyb3IiLCJu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S0FBRCxJQUFVNkssSUFBZCxFQUFvQjtBQUNsQixpQkFBS3lILGFBQUwsR0FBcUJyVSxJQUFJLENBQUM2VSxJQUFMLENBQVVqSSxJQUFJLENBQUN4TCxJQUFMLEdBQVksS0FBS3dDLElBQUwsQ0FBVXRGLFNBQWhDLENBQXJCO0FBQ0Q7O0FBRUQsaUJBQU8zQixNQUFNLENBQUNrWCxVQUFQLENBQWtCLE1BQU07QUFDN0IsaUJBQUt6USxHQUFMLENBQVN2RixRQUFUO0FBQ0QsV0FGTSxFQUVKLEVBRkksQ0FBUDtBQUdELFNBUkksQ0FBTDtBQVNELE9BVkQ7QUFXRCxLQXZCRCxNQXVCTztBQUNMQSxjQUFRLElBQUlBLFFBQVEsQ0FBQyxLQUFLLENBQU4sRUFBUyxLQUFLaUcsS0FBZCxDQUFwQjtBQUNEOztBQUNELFdBQU8sS0FBUDtBQUNEO0FBRUQ7Ozs7Ozs7OztBQU9BUixPQUFLLENBQUN6RixRQUFELEVBQVc7QUFDZCxTQUFLZ0csT0FBTCxHQUFlLElBQWY7QUFDQSxXQUFPdVEsT0FBTyxDQUFDLEtBQUs1USxJQUFOLENBQWQ7QUFDQWxHLE1BQUUsQ0FBQ2lNLE1BQUgsQ0FBVSxLQUFLL0YsSUFBZixFQUFzQjNGLFFBQVEsSUFBSUMsSUFBbEM7QUFDQSxXQUFPLElBQVA7QUFDRDtBQUVEOzs7Ozs7OztBQU1BcUYsTUFBSSxHQUFHO0FBQ0wsU0FBS1UsT0FBTCxHQUFlLElBQWY7QUFDQSxXQUFPdVEsT0FBTyxDQUFDLEtBQUs1USxJQUFOLENBQWQ7QUFDQSxXQUFPLElBQVA7QUFDRDs7QUF2SThCLEMiLCJmaWxlIjoiL3BhY2thZ2VzL29zdHJpb19maWxlcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1vbmdvIH0gICAgICAgICAgIGZyb20gJ21ldGVvci9tb25nbyc7XG5pbXBvcnQgeyBXZWJBcHAgfSAgICAgICAgICBmcm9tICdtZXRlb3Ivd2ViYXBwJztcbmltcG9ydCB7IE1ldGVvciB9ICAgICAgICAgIGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgUmFuZG9tIH0gICAgICAgICAgZnJvbSAnbWV0ZW9yL3JhbmRvbSc7XG5pbXBvcnQgeyBDb29raWVzIH0gICAgICAgICBmcm9tICdtZXRlb3Ivb3N0cmlvOmNvb2tpZXMnO1xuaW1wb3J0IFdyaXRlU3RyZWFtICAgICAgICAgZnJvbSAnLi93cml0ZS1zdHJlYW0uanMnO1xuaW1wb3J0IHsgY2hlY2ssIE1hdGNoIH0gICAgZnJvbSAnbWV0ZW9yL2NoZWNrJztcbmltcG9ydCBGaWxlc0NvbGxlY3Rpb25Db3JlIGZyb20gJy4vY29yZS5qcyc7XG5pbXBvcnQgeyBmaXhKU09OUGFyc2UsIGZpeEpTT05TdHJpbmdpZnksIGhlbHBlcnMgfSBmcm9tICcuL2xpYi5qcyc7XG5cbmltcG9ydCBmcyAgICAgICBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgbm9kZVFzICAgZnJvbSAncXVlcnlzdHJpbmcnO1xuaW1wb3J0IHJlcXVlc3QgIGZyb20gJ3JlcXVlc3QnO1xuaW1wb3J0IGZpbGVUeXBlIGZyb20gJ2ZpbGUtdHlwZSc7XG5pbXBvcnQgbm9kZVBhdGggZnJvbSAncGF0aCc7XG5cbi8qXG4gKiBAY29uc3Qge09iamVjdH0gYm91bmQgIC0gTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCAoRmliZXIgd3JhcHBlcilcbiAqIEBjb25zdCB7RnVuY3Rpb259IE5PT1AgLSBObyBPcGVyYXRpb24gZnVuY3Rpb24sIHBsYWNlaG9sZGVyIGZvciByZXF1aXJlZCBjYWxsYmFja3NcbiAqL1xuY29uc3QgYm91bmQgPSBNZXRlb3IuYmluZEVudmlyb25tZW50KGNhbGxiYWNrID0+IGNhbGxiYWNrKCkpO1xuY29uc3QgTk9PUCAgPSAoKSA9PiB7ICB9O1xuXG4vKlxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAY2xhc3MgRmlsZXNDb2xsZWN0aW9uXG4gKiBAcGFyYW0gY29uZmlnICAgICAgICAgICB7T2JqZWN0fSAgIC0gW0JvdGhdICAgQ29uZmlndXJhdGlvbiBvYmplY3Qgd2l0aCBuZXh0IHByb3BlcnRpZXM6XG4gKiBAcGFyYW0gY29uZmlnLmRlYnVnICAgICB7Qm9vbGVhbn0gIC0gW0JvdGhdICAgVHVybiBvbi9vZiBkZWJ1Z2dpbmcgYW5kIGV4dHJhIGxvZ2dpbmdcbiAqIEBwYXJhbSBjb25maWcuc2NoZW1hICAgIHtPYmplY3R9ICAgLSBbQm90aF0gICBDb2xsZWN0aW9uIFNjaGVtYVxuICogQHBhcmFtIGNvbmZpZy5wdWJsaWMgICAge0Jvb2xlYW59ICAtIFtCb3RoXSAgIFN0b3JlIGZpbGVzIGluIGZvbGRlciBhY2Nlc3NpYmxlIGZvciBwcm94eSBzZXJ2ZXJzLCBmb3IgbGltaXRzLCBhbmQgbW9yZSAtIHJlYWQgZG9jc1xuICogQHBhcmFtIGNvbmZpZy5zdHJpY3QgICAge0Jvb2xlYW59ICAtIFtTZXJ2ZXJdIFN0cmljdCBtb2RlIGZvciBwYXJ0aWFsIGNvbnRlbnQsIGlmIGlzIGB0cnVlYCBzZXJ2ZXIgd2lsbCByZXR1cm4gYDQxNmAgcmVzcG9uc2UgY29kZSwgd2hlbiBgcmFuZ2VgIGlzIG5vdCBzcGVjaWZpZWQsIG90aGVyd2lzZSBzZXJ2ZXIgcmV0dXJuIGAyMDZgXG4gKiBAcGFyYW0gY29uZmlnLnByb3RlY3RlZCB7RnVuY3Rpb259IC0gW1NlcnZlcl0gSWYgYHRydWVgIC0gZmlsZXMgd2lsbCBiZSBzZXJ2ZWQgb25seSB0byBhdXRob3JpemVkIHVzZXJzLCBpZiBgZnVuY3Rpb24oKWAgLSB5b3UncmUgYWJsZSB0byBjaGVjayB2aXNpdG9yJ3MgcGVybWlzc2lvbnMgaW4geW91ciBvd24gd2F5IGZ1bmN0aW9uJ3MgY29udGV4dCBoYXM6XG4gKiAgLSBgcmVxdWVzdGBcbiAqICAtIGByZXNwb25zZWBcbiAqICAtIGB1c2VyKClgXG4gKiAgLSBgdXNlcklkYFxuICogQHBhcmFtIGNvbmZpZy5jaHVua1NpemUgICAgICB7TnVtYmVyfSAgLSBbQm90aF0gVXBsb2FkIGNodW5rIHNpemUsIGRlZmF1bHQ6IDUyNDI4OCBieXRlcyAoMCw1IE1iKVxuICogQHBhcmFtIGNvbmZpZy5wZXJtaXNzaW9ucyAgICB7TnVtYmVyfSAgLSBbU2VydmVyXSBQZXJtaXNzaW9ucyB3aGljaCB3aWxsIGJlIHNldCB0byB1cGxvYWRlZCBmaWxlcyAob2N0YWwpLCBsaWtlOiBgNTExYCBvciBgMG83NTVgLiBEZWZhdWx0OiAwNjQ0XG4gKiBAcGFyYW0gY29uZmlnLnBhcmVudERpclBlcm1pc3Npb25zIHtOdW1iZXJ9ICAtIFtTZXJ2ZXJdIFBlcm1pc3Npb25zIHdoaWNoIHdpbGwgYmUgc2V0IHRvIHBhcmVudCBkaXJlY3Rvcnkgb2YgdXBsb2FkZWQgZmlsZXMgKG9jdGFsKSwgbGlrZTogYDYxMWAgb3IgYDBvNzc3YC4gRGVmYXVsdDogMDc1NVxuICogQHBhcmFtIGNvbmZpZy5zdG9yYWdlUGF0aCAgICB7U3RyaW5nfEZ1bmN0aW9ufSAgLSBbU2VydmVyXSBTdG9yYWdlIHBhdGggb24gZmlsZSBzeXN0ZW1cbiAqIEBwYXJhbSBjb25maWcuY2FjaGVDb250cm9sICAge1N0cmluZ30gIC0gW1NlcnZlcl0gRGVmYXVsdCBgQ2FjaGUtQ29udHJvbGAgaGVhZGVyXG4gKiBAcGFyYW0gY29uZmlnLnJlc3BvbnNlSGVhZGVycyB7T2JqZWN0fEZ1bmN0aW9ufSAtIFtTZXJ2ZXJdIEN1c3RvbSByZXNwb25zZSBoZWFkZXJzLCBpZiBmdW5jdGlvbiBpcyBwYXNzZWQsIG11c3QgcmV0dXJuIE9iamVjdFxuICogQHBhcmFtIGNvbmZpZy50aHJvdHRsZSAgICAgICB7TnVtYmVyfSAgLSBbU2VydmVyXSBERVBSRUNBVEVEIGJwcyB0aHJvdHRsZSB0aHJlc2hvbGRcbiAqIEBwYXJhbSBjb25maWcuZG93bmxvYWRSb3V0ZSAge1N0cmluZ30gIC0gW0JvdGhdICAgU2VydmVyIFJvdXRlIHVzZWQgdG8gcmV0cmlldmUgZmlsZXNcbiAqIEBwYXJhbSBjb25maWcuY29sbGVjdGlvbiAgICAge01vbmdvLkNvbGxlY3Rpb259IC0gW0JvdGhdIE1vbmdvIENvbGxlY3Rpb24gSW5zdGFuY2VcbiAqIEBwYXJhbSBjb25maWcuY29sbGVjdGlvbk5hbWUge1N0cmluZ30gIC0gW0JvdGhdICAgQ29sbGVjdGlvbiBuYW1lXG4gKiBAcGFyYW0gY29uZmlnLm5hbWluZ0Z1bmN0aW9uIHtGdW5jdGlvbn0tIFtCb3RoXSAgIEZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYFN0cmluZ2BcbiAqIEBwYXJhbSBjb25maWcuaW50ZWdyaXR5Q2hlY2sge0Jvb2xlYW59IC0gW1NlcnZlcl0gQ2hlY2sgZmlsZSdzIGludGVncml0eSBiZWZvcmUgc2VydmluZyB0byB1c2Vyc1xuICogQHBhcmFtIGNvbmZpZy5vbkFmdGVyVXBsb2FkICB7RnVuY3Rpb259LSBbU2VydmVyXSBDYWxsZWQgcmlnaHQgYWZ0ZXIgZmlsZSBpcyByZWFkeSBvbiBGUy4gVXNlIHRvIHRyYW5zZmVyIGZpbGUgc29tZXdoZXJlIGVsc2UsIG9yIGRvIG90aGVyIHRoaW5nIHdpdGggZmlsZSBkaXJlY3RseVxuICogQHBhcmFtIGNvbmZpZy5vbkFmdGVyUmVtb3ZlICB7RnVuY3Rpb259IC0gW1NlcnZlcl0gQ2FsbGVkIHJpZ2h0IGFmdGVyIGZpbGUgaXMgcmVtb3ZlZC4gUmVtb3ZlZCBvYmplY3RzIGlzIHBhc3NlZCB0byBjYWxsYmFja1xuICogQHBhcmFtIGNvbmZpZy5jb250aW51ZVVwbG9hZFRUTCB7TnVtYmVyfSAtIFtTZXJ2ZXJdIFRpbWUgaW4gc2Vjb25kcywgZHVyaW5nIHVwbG9hZCBtYXkgYmUgY29udGludWVkLCBkZWZhdWx0IDMgaG91cnMgKDEwODAwIHNlY29uZHMpXG4gKiBAcGFyYW0gY29uZmlnLm9uQmVmb3JlVXBsb2FkIHtGdW5jdGlvbn0tIFtCb3RoXSAgIEZ1bmN0aW9uIHdoaWNoIGV4ZWN1dGVzIG9uIHNlcnZlciBhZnRlciByZWNlaXZpbmcgZWFjaCBjaHVuayBhbmQgb24gY2xpZW50IHJpZ2h0IGJlZm9yZSBiZWdpbm5pbmcgdXBsb2FkLiBGdW5jdGlvbiBjb250ZXh0IGlzIGBGaWxlYCAtIHNvIHlvdSBhcmUgYWJsZSB0byBjaGVjayBmb3IgZXh0ZW5zaW9uLCBtaW1lLXR5cGUsIHNpemUgYW5kIGV0Yy46XG4gKiAgLSByZXR1cm4gYHRydWVgIHRvIGNvbnRpbnVlXG4gKiAgLSByZXR1cm4gYGZhbHNlYCBvciBgU3RyaW5nYCB0byBhYm9ydCB1cGxvYWRcbiAqIEBwYXJhbSBjb25maWcub25Jbml0aWF0ZVVwbG9hZCB7RnVuY3Rpb259IC0gW1NlcnZlcl0gRnVuY3Rpb24gd2hpY2ggZXhlY3V0ZXMgb24gc2VydmVyIHJpZ2h0IGJlZm9yZSB1cGxvYWQgaXMgYmVnaW4gYW5kIHJpZ2h0IGFmdGVyIGBvbkJlZm9yZVVwbG9hZGAgaG9vay4gVGhpcyBob29rIGlzIGZ1bGx5IGFzeW5jaHJvbm91cy5cbiAqIEBwYXJhbSBjb25maWcub25CZWZvcmVSZW1vdmUge0Z1bmN0aW9ufSAtIFtTZXJ2ZXJdIEV4ZWN1dGVzIGJlZm9yZSByZW1vdmluZyBmaWxlIG9uIHNlcnZlciwgc28geW91IGNhbiBjaGVjayBwZXJtaXNzaW9ucy4gUmV0dXJuIGB0cnVlYCB0byBhbGxvdyBhY3Rpb24gYW5kIGBmYWxzZWAgdG8gZGVueS5cbiAqIEBwYXJhbSBjb25maWcuYWxsb3dDbGllbnRDb2RlICB7Qm9vbGVhbn0gIC0gW0JvdGhdICAgQWxsb3cgdG8gcnVuIGByZW1vdmVgIGZyb20gY2xpZW50XG4gKiBAcGFyYW0gY29uZmlnLmRvd25sb2FkQ2FsbGJhY2sge0Z1bmN0aW9ufSAtIFtTZXJ2ZXJdIENhbGxiYWNrIHRyaWdnZXJlZCBlYWNoIHRpbWUgZmlsZSBpcyByZXF1ZXN0ZWQsIHJldHVybiB0cnV0aHkgdmFsdWUgdG8gY29udGludWUgZG93bmxvYWQsIG9yIGZhbHN5IHRvIGFib3J0XG4gKiBAcGFyYW0gY29uZmlnLmludGVyY2VwdERvd25sb2FkIHtGdW5jdGlvbn0gLSBbU2VydmVyXSBJbnRlcmNlcHQgZG93bmxvYWQgcmVxdWVzdCwgc28geW91IGNhbiBzZXJ2ZSBmaWxlIGZyb20gdGhpcmQtcGFydHkgcmVzb3VyY2UsIGFyZ3VtZW50cyB7aHR0cDoge3JlcXVlc3Q6IHsuLi59LCByZXNwb25zZTogey4uLn19LCBmaWxlUmVmOiB7Li4ufX1cbiAqIEBwYXJhbSBjb25maWcuZGlzYWJsZVVwbG9hZCB7Qm9vbGVhbn0gLSBEaXNhYmxlIGZpbGUgdXBsb2FkLCB1c2VmdWwgZm9yIHNlcnZlciBvbmx5IHNvbHV0aW9uc1xuICogQHBhcmFtIGNvbmZpZy5kaXNhYmxlRG93bmxvYWQge0Jvb2xlYW59IC0gRGlzYWJsZSBmaWxlIGRvd25sb2FkIChzZXJ2aW5nKSwgdXNlZnVsIGZvciBmaWxlIG1hbmFnZW1lbnQgb25seSBzb2x1dGlvbnNcbiAqIEBwYXJhbSBjb25maWcuX3ByZUNvbGxlY3Rpb24gIHtNb25nby5Db2xsZWN0aW9ufSAtIFtTZXJ2ZXJdIE1vbmdvIHByZUNvbGxlY3Rpb24gSW5zdGFuY2VcbiAqIEBwYXJhbSBjb25maWcuX3ByZUNvbGxlY3Rpb25OYW1lIHtTdHJpbmd9ICAtIFtTZXJ2ZXJdICBwcmVDb2xsZWN0aW9uIG5hbWVcbiAqIEBzdW1tYXJ5IENyZWF0ZSBuZXcgaW5zdGFuY2Ugb2YgRmlsZXNDb2xsZWN0aW9uXG4gKi9cbmV4cG9ydCBjbGFzcyBGaWxlc0NvbGxlY3Rpb24gZXh0ZW5kcyBGaWxlc0NvbGxlY3Rpb25Db3JlIHtcbiAgY29uc3RydWN0b3IoY29uZmlnKSB7XG4gICAgc3VwZXIoKTtcbiAgICBsZXQgc3RvcmFnZVBhdGg7XG4gICAgaWYgKGNvbmZpZykge1xuICAgICAgKHtcbiAgICAgICAgc3RvcmFnZVBhdGgsXG4gICAgICAgIGRlYnVnOiB0aGlzLmRlYnVnLFxuICAgICAgICBzY2hlbWE6IHRoaXMuc2NoZW1hLFxuICAgICAgICBwdWJsaWM6IHRoaXMucHVibGljLFxuICAgICAgICBzdHJpY3Q6IHRoaXMuc3RyaWN0LFxuICAgICAgICBjaHVua1NpemU6IHRoaXMuY2h1bmtTaXplLFxuICAgICAgICBwcm90ZWN0ZWQ6IHRoaXMucHJvdGVjdGVkLFxuICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb24sXG4gICAgICAgIHBlcm1pc3Npb25zOiB0aGlzLnBlcm1pc3Npb25zLFxuICAgICAgICBjYWNoZUNvbnRyb2w6IHRoaXMuY2FjaGVDb250cm9sLFxuICAgICAgICBkb3dubG9hZFJvdXRlOiB0aGlzLmRvd25sb2FkUm91dGUsXG4gICAgICAgIG9uQWZ0ZXJVcGxvYWQ6IHRoaXMub25BZnRlclVwbG9hZCxcbiAgICAgICAgb25BZnRlclJlbW92ZTogdGhpcy5vbkFmdGVyUmVtb3ZlLFxuICAgICAgICBkaXNhYmxlVXBsb2FkOiB0aGlzLmRpc2FibGVVcGxvYWQsXG4gICAgICAgIG9uQmVmb3JlUmVtb3ZlOiB0aGlzLm9uQmVmb3JlUmVtb3ZlLFxuICAgICAgICBpbnRlZ3JpdHlDaGVjazogdGhpcy5pbnRlZ3JpdHlDaGVjayxcbiAgICAgICAgY29sbGVjdGlvbk5hbWU6IHRoaXMuY29sbGVjdGlvbk5hbWUsXG4gICAgICAgIG9uQmVmb3JlVXBsb2FkOiB0aGlzLm9uQmVmb3JlVXBsb2FkLFxuICAgICAgICBuYW1pbmdGdW5jdGlvbjogdGhpcy5uYW1pbmdGdW5jdGlvbixcbiAgICAgICAgcmVzcG9uc2VIZWFkZXJzOiB0aGlzLnJlc3BvbnNlSGVhZGVycyxcbiAgICAgICAgZGlzYWJsZURvd25sb2FkOiB0aGlzLmRpc2FibGVEb3dubG9hZCxcbiAgICAgICAgYWxsb3dDbGllbnRDb2RlOiB0aGlzLmFsbG93Q2xpZW50Q29kZSxcbiAgICAgICAgZG93bmxvYWRDYWxsYmFjazogdGhpcy5kb3dubG9hZENhbGxiYWNrLFxuICAgICAgICBvbkluaXRpYXRlVXBsb2FkOiB0aGlzLm9uSW5pdGlhdGVVcGxvYWQsXG4gICAgICAgIGludGVyY2VwdERvd25sb2FkOiB0aGlzLmludGVyY2VwdERvd25sb2FkLFxuICAgICAgICBjb250aW51ZVVwbG9hZFRUTDogdGhpcy5jb250aW51ZVVwbG9hZFRUTCxcbiAgICAgICAgcGFyZW50RGlyUGVybWlzc2lvbnM6IHRoaXMucGFyZW50RGlyUGVybWlzc2lvbnMsXG4gICAgICAgIF9wcmVDb2xsZWN0aW9uOiB0aGlzLl9wcmVDb2xsZWN0aW9uLFxuICAgICAgICBfcHJlQ29sbGVjdGlvbk5hbWU6IHRoaXMuX3ByZUNvbGxlY3Rpb25OYW1lLFxuICAgICAgfSA9IGNvbmZpZyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VsZiAgID0gdGhpcztcbiAgICBuZXcgQ29va2llcygpO1xuXG4gICAgaWYgKCFoZWxwZXJzLmlzQm9vbGVhbih0aGlzLmRlYnVnKSkge1xuICAgICAgdGhpcy5kZWJ1ZyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghaGVscGVycy5pc0Jvb2xlYW4odGhpcy5wdWJsaWMpKSB7XG4gICAgICB0aGlzLnB1YmxpYyA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5wcm90ZWN0ZWQpIHtcbiAgICAgIHRoaXMucHJvdGVjdGVkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmNodW5rU2l6ZSkge1xuICAgICAgdGhpcy5jaHVua1NpemUgPSAxMDI0ICogNTEyO1xuICAgIH1cblxuICAgIHRoaXMuY2h1bmtTaXplID0gTWF0aC5mbG9vcih0aGlzLmNodW5rU2l6ZSAvIDgpICogODtcblxuICAgIGlmICghaGVscGVycy5pc1N0cmluZyh0aGlzLmNvbGxlY3Rpb25OYW1lKSAmJiAhdGhpcy5jb2xsZWN0aW9uKSB7XG4gICAgICB0aGlzLmNvbGxlY3Rpb25OYW1lID0gJ01ldGVvclVwbG9hZEZpbGVzJztcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuY29sbGVjdGlvbikge1xuICAgICAgdGhpcy5jb2xsZWN0aW9uID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24odGhpcy5jb2xsZWN0aW9uTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29sbGVjdGlvbk5hbWUgPSB0aGlzLmNvbGxlY3Rpb24uX25hbWU7XG4gICAgfVxuXG4gICAgdGhpcy5jb2xsZWN0aW9uLmZpbGVzQ29sbGVjdGlvbiA9IHRoaXM7XG4gICAgY2hlY2sodGhpcy5jb2xsZWN0aW9uTmFtZSwgU3RyaW5nKTtcblxuICAgIGlmICh0aGlzLnB1YmxpYyAmJiAhdGhpcy5kb3dubG9hZFJvdXRlKSB7XG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDUwMCwgYFtGaWxlc0NvbGxlY3Rpb24uJHt0aGlzLmNvbGxlY3Rpb25OYW1lfV06IFwiZG93bmxvYWRSb3V0ZVwiIG11c3QgYmUgcHJlY2lzZWx5IHByb3ZpZGVkIG9uIFwicHVibGljXCIgY29sbGVjdGlvbnMhIE5vdGU6IFwiZG93bmxvYWRSb3V0ZVwiIG11c3QgYmUgZXF1YWwgb3IgYmUgaW5zaWRlIG9mIHlvdXIgd2ViL3Byb3h5LXNlcnZlciAocmVsYXRpdmUpIHJvb3QuYCk7XG4gICAgfVxuXG4gICAgaWYgKCFoZWxwZXJzLmlzU3RyaW5nKHRoaXMuZG93bmxvYWRSb3V0ZSkpIHtcbiAgICAgIHRoaXMuZG93bmxvYWRSb3V0ZSA9ICcvY2RuL3N0b3JhZ2UnO1xuICAgIH1cblxuICAgIHRoaXMuZG93bmxvYWRSb3V0ZSA9IHRoaXMuZG93bmxvYWRSb3V0ZS5yZXBsYWNlKC9cXC8kLywgJycpO1xuXG4gICAgaWYgKCFoZWxwZXJzLmlzRnVuY3Rpb24odGhpcy5uYW1pbmdGdW5jdGlvbikpIHtcbiAgICAgIHRoaXMubmFtaW5nRnVuY3Rpb24gPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNGdW5jdGlvbih0aGlzLm9uQmVmb3JlVXBsb2FkKSkge1xuICAgICAgdGhpcy5vbkJlZm9yZVVwbG9hZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghaGVscGVycy5pc0Jvb2xlYW4odGhpcy5hbGxvd0NsaWVudENvZGUpKSB7XG4gICAgICB0aGlzLmFsbG93Q2xpZW50Q29kZSA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKCFoZWxwZXJzLmlzRnVuY3Rpb24odGhpcy5vbkluaXRpYXRlVXBsb2FkKSkge1xuICAgICAgdGhpcy5vbkluaXRpYXRlVXBsb2FkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFoZWxwZXJzLmlzRnVuY3Rpb24odGhpcy5pbnRlcmNlcHREb3dubG9hZCkpIHtcbiAgICAgIHRoaXMuaW50ZXJjZXB0RG93bmxvYWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNCb29sZWFuKHRoaXMuc3RyaWN0KSkge1xuICAgICAgdGhpcy5zdHJpY3QgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICghaGVscGVycy5pc051bWJlcih0aGlzLnBlcm1pc3Npb25zKSkge1xuICAgICAgdGhpcy5wZXJtaXNzaW9ucyA9IHBhcnNlSW50KCc2NDQnLCA4KTtcbiAgICB9XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNOdW1iZXIodGhpcy5wYXJlbnREaXJQZXJtaXNzaW9ucykpIHtcbiAgICAgIHRoaXMucGFyZW50RGlyUGVybWlzc2lvbnMgPSBwYXJzZUludCgnNzU1JywgOCk7XG4gICAgfVxuXG4gICAgaWYgKCFoZWxwZXJzLmlzU3RyaW5nKHRoaXMuY2FjaGVDb250cm9sKSkge1xuICAgICAgdGhpcy5jYWNoZUNvbnRyb2wgPSAncHVibGljLCBtYXgtYWdlPTMxNTM2MDAwLCBzLW1heGFnZT0zMTUzNjAwMCc7XG4gICAgfVxuXG4gICAgaWYgKCFoZWxwZXJzLmlzRnVuY3Rpb24odGhpcy5vbkFmdGVyVXBsb2FkKSkge1xuICAgICAgdGhpcy5vbkFmdGVyVXBsb2FkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFoZWxwZXJzLmlzQm9vbGVhbih0aGlzLmRpc2FibGVVcGxvYWQpKSB7XG4gICAgICB0aGlzLmRpc2FibGVVcGxvYWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNGdW5jdGlvbih0aGlzLm9uQWZ0ZXJSZW1vdmUpKSB7XG4gICAgICB0aGlzLm9uQWZ0ZXJSZW1vdmUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNGdW5jdGlvbih0aGlzLm9uQmVmb3JlUmVtb3ZlKSkge1xuICAgICAgdGhpcy5vbkJlZm9yZVJlbW92ZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghaGVscGVycy5pc0Jvb2xlYW4odGhpcy5pbnRlZ3JpdHlDaGVjaykpIHtcbiAgICAgIHRoaXMuaW50ZWdyaXR5Q2hlY2sgPSB0cnVlO1xuICAgIH1cblxuICAgIGlmICghaGVscGVycy5pc0Jvb2xlYW4odGhpcy5kaXNhYmxlRG93bmxvYWQpKSB7XG4gICAgICB0aGlzLmRpc2FibGVEb3dubG9hZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghaGVscGVycy5pc09iamVjdCh0aGlzLl9jdXJyZW50VXBsb2FkcykpIHtcbiAgICAgIHRoaXMuX2N1cnJlbnRVcGxvYWRzID0ge307XG4gICAgfVxuXG4gICAgaWYgKCFoZWxwZXJzLmlzRnVuY3Rpb24odGhpcy5kb3dubG9hZENhbGxiYWNrKSkge1xuICAgICAgdGhpcy5kb3dubG9hZENhbGxiYWNrID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFoZWxwZXJzLmlzTnVtYmVyKHRoaXMuY29udGludWVVcGxvYWRUVEwpKSB7XG4gICAgICB0aGlzLmNvbnRpbnVlVXBsb2FkVFRMID0gMTA4MDA7XG4gICAgfVxuXG4gICAgaWYgKCFoZWxwZXJzLmlzRnVuY3Rpb24odGhpcy5yZXNwb25zZUhlYWRlcnMpKSB7XG4gICAgICB0aGlzLnJlc3BvbnNlSGVhZGVycyA9IChyZXNwb25zZUNvZGUsIGZpbGVSZWYsIHZlcnNpb25SZWYpID0+IHtcbiAgICAgICAgY29uc3QgaGVhZGVycyA9IHt9O1xuXG4gICAgICAgIHN3aXRjaCAocmVzcG9uc2VDb2RlKSB7XG4gICAgICAgIGNhc2UgJzIwNic6XG4gICAgICAgICAgaGVhZGVycy5QcmFnbWEgICAgICAgICAgICAgICA9ICdwcml2YXRlJztcbiAgICAgICAgICBoZWFkZXJzLlRyYWlsZXIgICAgICAgICAgICAgID0gJ2V4cGlyZXMnO1xuICAgICAgICAgIGhlYWRlcnNbJ1RyYW5zZmVyLUVuY29kaW5nJ10gPSAnY2h1bmtlZCc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJzQwMCc6XG4gICAgICAgICAgaGVhZGVyc1snQ2FjaGUtQ29udHJvbCddICAgICA9ICduby1jYWNoZSc7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJzQxNic6XG4gICAgICAgICAgaGVhZGVyc1snQ29udGVudC1SYW5nZSddICAgICA9IGBieXRlcyAqLyR7dmVyc2lvblJlZi5zaXplfWA7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBoZWFkZXJzLkNvbm5lY3Rpb24gICAgICAgPSAna2VlcC1hbGl2ZSc7XG4gICAgICAgIGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddICA9IHZlcnNpb25SZWYudHlwZSB8fCAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJztcbiAgICAgICAgaGVhZGVyc1snQWNjZXB0LVJhbmdlcyddID0gJ2J5dGVzJztcbiAgICAgICAgcmV0dXJuIGhlYWRlcnM7XG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICh0aGlzLnB1YmxpYyAmJiAhc3RvcmFnZVBhdGgpIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNTAwLCBgW0ZpbGVzQ29sbGVjdGlvbi4ke3RoaXMuY29sbGVjdGlvbk5hbWV9XSBcInN0b3JhZ2VQYXRoXCIgbXVzdCBiZSBzZXQgb24gXCJwdWJsaWNcIiBjb2xsZWN0aW9ucyEgTm90ZTogXCJzdG9yYWdlUGF0aFwiIG11c3QgYmUgZXF1YWwgb24gYmUgaW5zaWRlIG9mIHlvdXIgd2ViL3Byb3h5LXNlcnZlciAoYWJzb2x1dGUpIHJvb3QuYCk7XG4gICAgfVxuXG4gICAgaWYgKCFzdG9yYWdlUGF0aCkge1xuICAgICAgc3RvcmFnZVBhdGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBgYXNzZXRzJHtub2RlUGF0aC5zZXB9YXBwJHtub2RlUGF0aC5zZXB9dXBsb2FkcyR7bm9kZVBhdGguc2VwfSR7c2VsZi5jb2xsZWN0aW9uTmFtZX1gO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoaGVscGVycy5pc1N0cmluZyhzdG9yYWdlUGF0aCkpIHtcbiAgICAgIHRoaXMuc3RvcmFnZVBhdGggPSAoKSA9PiBzdG9yYWdlUGF0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zdG9yYWdlUGF0aCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGV0IHNwID0gc3RvcmFnZVBhdGguYXBwbHkoc2VsZiwgYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKCFoZWxwZXJzLmlzU3RyaW5nKHNwKSkge1xuICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAwLCBgW0ZpbGVzQ29sbGVjdGlvbi4ke3NlbGYuY29sbGVjdGlvbk5hbWV9XSBcInN0b3JhZ2VQYXRoXCIgZnVuY3Rpb24gbXVzdCByZXR1cm4gYSBTdHJpbmchYCk7XG4gICAgICAgIH1cbiAgICAgICAgc3AgPSBzcC5yZXBsYWNlKC9cXC8kLywgJycpO1xuICAgICAgICByZXR1cm4gbm9kZVBhdGgubm9ybWFsaXplKHNwKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdGhpcy5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb24uc3RvcmFnZVBhdGhdIFNldCB0bzonLCB0aGlzLnN0b3JhZ2VQYXRoKHt9KSk7XG5cbiAgICBmcy5ta2RpcnModGhpcy5zdG9yYWdlUGF0aCh7fSksIHsgbW9kZTogdGhpcy5wYXJlbnREaXJQZXJtaXNzaW9ucyB9LCAoZXJyb3IpID0+IHtcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMSwgYFtGaWxlc0NvbGxlY3Rpb24uJHtzZWxmLmNvbGxlY3Rpb25OYW1lfV0gUGF0aCBcIiR7dGhpcy5zdG9yYWdlUGF0aCh7fSl9XCIgaXMgbm90IHdyaXRhYmxlISAke2Vycm9yfWApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY2hlY2sodGhpcy5zdHJpY3QsIEJvb2xlYW4pO1xuICAgIGNoZWNrKHRoaXMucGVybWlzc2lvbnMsIE51bWJlcik7XG4gICAgY2hlY2sodGhpcy5zdG9yYWdlUGF0aCwgRnVuY3Rpb24pO1xuICAgIGNoZWNrKHRoaXMuY2FjaGVDb250cm9sLCBTdHJpbmcpO1xuICAgIGNoZWNrKHRoaXMub25BZnRlclJlbW92ZSwgTWF0Y2guT25lT2YoZmFsc2UsIEZ1bmN0aW9uKSk7XG4gICAgY2hlY2sodGhpcy5vbkFmdGVyVXBsb2FkLCBNYXRjaC5PbmVPZihmYWxzZSwgRnVuY3Rpb24pKTtcbiAgICBjaGVjayh0aGlzLmRpc2FibGVVcGxvYWQsIEJvb2xlYW4pO1xuICAgIGNoZWNrKHRoaXMuaW50ZWdyaXR5Q2hlY2ssIEJvb2xlYW4pO1xuICAgIGNoZWNrKHRoaXMub25CZWZvcmVSZW1vdmUsIE1hdGNoLk9uZU9mKGZhbHNlLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMuZGlzYWJsZURvd25sb2FkLCBCb29sZWFuKTtcbiAgICBjaGVjayh0aGlzLmRvd25sb2FkQ2FsbGJhY2ssIE1hdGNoLk9uZU9mKGZhbHNlLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMuaW50ZXJjZXB0RG93bmxvYWQsIE1hdGNoLk9uZU9mKGZhbHNlLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMuY29udGludWVVcGxvYWRUVEwsIE51bWJlcik7XG4gICAgY2hlY2sodGhpcy5yZXNwb25zZUhlYWRlcnMsIE1hdGNoLk9uZU9mKE9iamVjdCwgRnVuY3Rpb24pKTtcblxuICAgIGlmICghdGhpcy5kaXNhYmxlVXBsb2FkKSB7XG4gICAgICBpZiAoIWhlbHBlcnMuaXNTdHJpbmcodGhpcy5fcHJlQ29sbGVjdGlvbk5hbWUpICYmICF0aGlzLl9wcmVDb2xsZWN0aW9uKSB7XG4gICAgICAgIHRoaXMuX3ByZUNvbGxlY3Rpb25OYW1lID0gYF9fcHJlXyR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuX3ByZUNvbGxlY3Rpb24pIHtcbiAgICAgICAgdGhpcy5fcHJlQ29sbGVjdGlvbiA9IG5ldyBNb25nby5Db2xsZWN0aW9uKHRoaXMuX3ByZUNvbGxlY3Rpb25OYW1lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3ByZUNvbGxlY3Rpb25OYW1lID0gdGhpcy5fcHJlQ29sbGVjdGlvbi5fbmFtZTtcbiAgICAgIH1cbiAgICAgIGNoZWNrKHRoaXMuX3ByZUNvbGxlY3Rpb25OYW1lLCBTdHJpbmcpO1xuXG4gICAgICB0aGlzLl9wcmVDb2xsZWN0aW9uLl9lbnN1cmVJbmRleCh7IGNyZWF0ZWRBdDogMSB9LCB7IGV4cGlyZUFmdGVyU2Vjb25kczogdGhpcy5jb250aW51ZVVwbG9hZFRUTCwgYmFja2dyb3VuZDogdHJ1ZSB9KTtcbiAgICAgIGNvbnN0IF9wcmVDb2xsZWN0aW9uQ3Vyc29yID0gdGhpcy5fcHJlQ29sbGVjdGlvbi5maW5kKHt9LCB7XG4gICAgICAgIGZpZWxkczoge1xuICAgICAgICAgIF9pZDogMSxcbiAgICAgICAgICBpc0ZpbmlzaGVkOiAxXG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBfcHJlQ29sbGVjdGlvbkN1cnNvci5vYnNlcnZlKHtcbiAgICAgICAgY2hhbmdlZChkb2MpIHtcbiAgICAgICAgICBpZiAoZG9jLmlzRmluaXNoZWQpIHtcbiAgICAgICAgICAgIHNlbGYuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbX3ByZUNvbGxlY3Rpb25DdXJzb3Iub2JzZXJ2ZV0gW2NoYW5nZWRdOiAke2RvYy5faWR9YCk7XG4gICAgICAgICAgICBzZWxmLl9wcmVDb2xsZWN0aW9uLnJlbW92ZSh7X2lkOiBkb2MuX2lkfSwgTk9PUCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICByZW1vdmVkKGRvYykge1xuICAgICAgICAgIC8vIEZyZWUgbWVtb3J5IGFmdGVyIHVwbG9hZCBpcyBkb25lXG4gICAgICAgICAgLy8gT3IgaWYgdXBsb2FkIGlzIHVuZmluaXNoZWRcbiAgICAgICAgICBzZWxmLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW19wcmVDb2xsZWN0aW9uQ3Vyc29yLm9ic2VydmVdIFtyZW1vdmVkXTogJHtkb2MuX2lkfWApO1xuICAgICAgICAgIGlmIChoZWxwZXJzLmlzT2JqZWN0KHNlbGYuX2N1cnJlbnRVcGxvYWRzW2RvYy5faWRdKSkge1xuICAgICAgICAgICAgc2VsZi5fY3VycmVudFVwbG9hZHNbZG9jLl9pZF0uc3RvcCgpO1xuICAgICAgICAgICAgc2VsZi5fY3VycmVudFVwbG9hZHNbZG9jLl9pZF0uZW5kKCk7XG5cbiAgICAgICAgICAgIC8vIFdlIGNhbiBiZSB1bmx1Y2t5IHRvIHJ1biBpbnRvIGEgcmFjZSBjb25kaXRpb24gd2hlcmUgYW5vdGhlciBzZXJ2ZXIgcmVtb3ZlZCB0aGlzIGRvY3VtZW50IGJlZm9yZSB0aGUgY2hhbmdlIG9mIGBpc0ZpbmlzaGVkYCBpcyByZWdpc3RlcmVkIG9uIHRoaXMgc2VydmVyLlxuICAgICAgICAgICAgLy8gVGhlcmVmb3JlIGl0J3MgYmV0dGVyIHRvIGRvdWJsZS1jaGVjayB3aXRoIHRoZSBtYWluIGNvbGxlY3Rpb24gaWYgdGhlIGZpbGUgaXMgcmVmZXJlbmNlZCB0aGVyZS4gSXNzdWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9WZWxpb3ZHcm91cC9NZXRlb3ItRmlsZXMvaXNzdWVzLzY3MlxuICAgICAgICAgICAgaWYgKCFkb2MuaXNGaW5pc2hlZCAmJiBzZWxmLmNvbGxlY3Rpb24uZmluZCh7IF9pZDogZG9jLl9pZCB9KS5jb3VudCgpID09PSAwKSB7XG4gICAgICAgICAgICAgIHNlbGYuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbX3ByZUNvbGxlY3Rpb25DdXJzb3Iub2JzZXJ2ZV0gW3JlbW92ZVVuZmluaXNoZWRVcGxvYWRdOiAke2RvYy5faWR9YCk7XG4gICAgICAgICAgICAgIHNlbGYuX2N1cnJlbnRVcGxvYWRzW2RvYy5faWRdLmFib3J0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRlbGV0ZSBzZWxmLl9jdXJyZW50VXBsb2Fkc1tkb2MuX2lkXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLl9jcmVhdGVTdHJlYW0gPSAoX2lkLCBwYXRoLCBvcHRzKSA9PiB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRVcGxvYWRzW19pZF0gPSBuZXcgV3JpdGVTdHJlYW0ocGF0aCwgb3B0cy5maWxlTGVuZ3RoLCBvcHRzLCB0aGlzLnBlcm1pc3Npb25zKTtcbiAgICAgIH07XG5cbiAgICAgIC8vIFRoaXMgbGl0dGxlIGZ1bmN0aW9uIGFsbG93cyB0byBjb250aW51ZSB1cGxvYWRcbiAgICAgIC8vIGV2ZW4gYWZ0ZXIgc2VydmVyIGlzIHJlc3RhcnRlZCAoKm5vdCBvbiBkZXYtc3RhZ2UqKVxuICAgICAgdGhpcy5fY29udGludWVVcGxvYWQgPSAoX2lkKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLl9jdXJyZW50VXBsb2Fkc1tfaWRdICYmIHRoaXMuX2N1cnJlbnRVcGxvYWRzW19pZF0uZmlsZSkge1xuICAgICAgICAgIGlmICghdGhpcy5fY3VycmVudFVwbG9hZHNbX2lkXS5hYm9ydGVkICYmICF0aGlzLl9jdXJyZW50VXBsb2Fkc1tfaWRdLmVuZGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY3VycmVudFVwbG9hZHNbX2lkXS5maWxlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLl9jcmVhdGVTdHJlYW0oX2lkLCB0aGlzLl9jdXJyZW50VXBsb2Fkc1tfaWRdLmZpbGUuZmlsZS5wYXRoLCB0aGlzLl9jdXJyZW50VXBsb2Fkc1tfaWRdLmZpbGUpO1xuICAgICAgICAgIHJldHVybiB0aGlzLl9jdXJyZW50VXBsb2Fkc1tfaWRdLmZpbGU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY29udFVwbGQgPSB0aGlzLl9wcmVDb2xsZWN0aW9uLmZpbmRPbmUoe19pZH0pO1xuICAgICAgICBpZiAoY29udFVwbGQpIHtcbiAgICAgICAgICB0aGlzLl9jcmVhdGVTdHJlYW0oX2lkLCBjb250VXBsZC5maWxlLnBhdGgsIGNvbnRVcGxkKTtcbiAgICAgICAgICByZXR1cm4gdGhpcy5fY3VycmVudFVwbG9hZHNbX2lkXS5maWxlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLnNjaGVtYSkge1xuICAgICAgdGhpcy5zY2hlbWEgPSBGaWxlc0NvbGxlY3Rpb25Db3JlLnNjaGVtYTtcbiAgICB9XG5cbiAgICBjaGVjayh0aGlzLmRlYnVnLCBCb29sZWFuKTtcbiAgICBjaGVjayh0aGlzLnNjaGVtYSwgT2JqZWN0KTtcbiAgICBjaGVjayh0aGlzLnB1YmxpYywgQm9vbGVhbik7XG4gICAgY2hlY2sodGhpcy5wcm90ZWN0ZWQsIE1hdGNoLk9uZU9mKEJvb2xlYW4sIEZ1bmN0aW9uKSk7XG4gICAgY2hlY2sodGhpcy5jaHVua1NpemUsIE51bWJlcik7XG4gICAgY2hlY2sodGhpcy5kb3dubG9hZFJvdXRlLCBTdHJpbmcpO1xuICAgIGNoZWNrKHRoaXMubmFtaW5nRnVuY3Rpb24sIE1hdGNoLk9uZU9mKGZhbHNlLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMub25CZWZvcmVVcGxvYWQsIE1hdGNoLk9uZU9mKGZhbHNlLCBGdW5jdGlvbikpO1xuICAgIGNoZWNrKHRoaXMub25Jbml0aWF0ZVVwbG9hZCwgTWF0Y2guT25lT2YoZmFsc2UsIEZ1bmN0aW9uKSk7XG4gICAgY2hlY2sodGhpcy5hbGxvd0NsaWVudENvZGUsIEJvb2xlYW4pO1xuXG4gICAgaWYgKHRoaXMucHVibGljICYmIHRoaXMucHJvdGVjdGVkKSB7XG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDUwMCwgYFtGaWxlc0NvbGxlY3Rpb24uJHt0aGlzLmNvbGxlY3Rpb25OYW1lfV06IEZpbGVzIGNhbiBub3QgYmUgcHVibGljIGFuZCBwcm90ZWN0ZWQgYXQgdGhlIHNhbWUgdGltZSFgKTtcbiAgICB9XG5cbiAgICB0aGlzLl9jaGVja0FjY2VzcyA9IChodHRwKSA9PiB7XG4gICAgICBpZiAodGhpcy5wcm90ZWN0ZWQpIHtcbiAgICAgICAgbGV0IHJlc3VsdDtcbiAgICAgICAgY29uc3Qge3VzZXIsIHVzZXJJZH0gPSB0aGlzLl9nZXRVc2VyKGh0dHApO1xuXG4gICAgICAgIGlmIChoZWxwZXJzLmlzRnVuY3Rpb24odGhpcy5wcm90ZWN0ZWQpKSB7XG4gICAgICAgICAgbGV0IGZpbGVSZWY7XG4gICAgICAgICAgaWYgKGhlbHBlcnMuaXNPYmplY3QoaHR0cC5wYXJhbXMpICYmICBodHRwLnBhcmFtcy5faWQpIHtcbiAgICAgICAgICAgIGZpbGVSZWYgPSB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShodHRwLnBhcmFtcy5faWQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJlc3VsdCA9IGh0dHAgPyB0aGlzLnByb3RlY3RlZC5jYWxsKE9iamVjdC5hc3NpZ24oaHR0cCwge3VzZXIsIHVzZXJJZH0pLCAoZmlsZVJlZiB8fCBudWxsKSkgOiB0aGlzLnByb3RlY3RlZC5jYWxsKHt1c2VyLCB1c2VySWR9LCAoZmlsZVJlZiB8fCBudWxsKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0ID0gISF1c2VySWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoKGh0dHAgJiYgKHJlc3VsdCA9PT0gdHJ1ZSkpIHx8ICFodHRwKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByYyA9IGhlbHBlcnMuaXNOdW1iZXIocmVzdWx0KSA/IHJlc3VsdCA6IDQwMTtcbiAgICAgICAgdGhpcy5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb24uX2NoZWNrQWNjZXNzXSBXQVJOOiBBY2Nlc3MgZGVuaWVkIScpO1xuICAgICAgICBpZiAoaHR0cCkge1xuICAgICAgICAgIGNvbnN0IHRleHQgPSAnQWNjZXNzIGRlbmllZCEnO1xuICAgICAgICAgIGlmICghaHR0cC5yZXNwb25zZS5oZWFkZXJzU2VudCkge1xuICAgICAgICAgICAgaHR0cC5yZXNwb25zZS53cml0ZUhlYWQocmMsIHtcbiAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJyxcbiAgICAgICAgICAgICAgJ0NvbnRlbnQtTGVuZ3RoJzogdGV4dC5sZW5ndGhcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghaHR0cC5yZXNwb25zZS5maW5pc2hlZCkge1xuICAgICAgICAgICAgaHR0cC5yZXNwb25zZS5lbmQodGV4dCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIHRoaXMuX21ldGhvZE5hbWVzID0ge1xuICAgICAgX0Fib3J0OiBgX0ZpbGVzQ29sbGVjdGlvbkFib3J0XyR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gLFxuICAgICAgX1dyaXRlOiBgX0ZpbGVzQ29sbGVjdGlvbldyaXRlXyR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gLFxuICAgICAgX1N0YXJ0OiBgX0ZpbGVzQ29sbGVjdGlvblN0YXJ0XyR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gLFxuICAgICAgX1JlbW92ZTogYF9GaWxlc0NvbGxlY3Rpb25SZW1vdmVfJHt0aGlzLmNvbGxlY3Rpb25OYW1lfWBcbiAgICB9O1xuXG4gICAgdGhpcy5vbignX2hhbmRsZVVwbG9hZCcsIHRoaXMuX2hhbmRsZVVwbG9hZCk7XG4gICAgdGhpcy5vbignX2ZpbmlzaFVwbG9hZCcsIHRoaXMuX2ZpbmlzaFVwbG9hZCk7XG4gICAgdGhpcy5faGFuZGxlVXBsb2FkU3luYyA9IE1ldGVvci53cmFwQXN5bmModGhpcy5faGFuZGxlVXBsb2FkLmJpbmQodGhpcykpO1xuXG4gICAgaWYgKHRoaXMuZGlzYWJsZVVwbG9hZCAmJiB0aGlzLmRpc2FibGVEb3dubG9hZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBXZWJBcHAuY29ubmVjdEhhbmRsZXJzLnVzZSgoaHR0cFJlcSwgaHR0cFJlc3AsIG5leHQpID0+IHtcbiAgICAgIGlmICghdGhpcy5kaXNhYmxlVXBsb2FkICYmICEhfmh0dHBSZXEuX3BhcnNlZFVybC5wYXRoLmluZGV4T2YoYCR7dGhpcy5kb3dubG9hZFJvdXRlfS8ke3RoaXMuY29sbGVjdGlvbk5hbWV9L19fdXBsb2FkYCkpIHtcbiAgICAgICAgaWYgKGh0dHBSZXEubWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICAgICAgICBjb25zdCBoYW5kbGVFcnJvciA9IChfZXJyb3IpID0+IHtcbiAgICAgICAgICAgIGxldCBlcnJvciA9IF9lcnJvcjtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignW0ZpbGVzQ29sbGVjdGlvbl0gW1VwbG9hZF0gW0hUVFBdIEV4Y2VwdGlvbjonLCBlcnJvcik7XG4gICAgICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG5cbiAgICAgICAgICAgIGlmICghaHR0cFJlc3AuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgICAgICAgaHR0cFJlc3Aud3JpdGVIZWFkKDUwMCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghaHR0cFJlc3AuZmluaXNoZWQpIHtcbiAgICAgICAgICAgICAgaWYgKGhlbHBlcnMuaXNPYmplY3QoZXJyb3IpICYmIGhlbHBlcnMuaXNGdW5jdGlvbihlcnJvci50b1N0cmluZykpIHtcbiAgICAgICAgICAgICAgICBlcnJvciA9IGVycm9yLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBpZiAoIWhlbHBlcnMuaXNTdHJpbmcoZXJyb3IpKSB7XG4gICAgICAgICAgICAgICAgZXJyb3IgPSAnVW5leHBlY3RlZCBlcnJvciEnO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaHR0cFJlc3AuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3IgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBsZXQgYm9keSA9ICcnO1xuICAgICAgICAgIGh0dHBSZXEub24oJ2RhdGEnLCAoZGF0YSkgPT4gYm91bmQoKCkgPT4ge1xuICAgICAgICAgICAgYm9keSArPSBkYXRhO1xuICAgICAgICAgIH0pKTtcblxuICAgICAgICAgIGh0dHBSZXEub24oJ2VuZCcsICgpID0+IGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGxldCBvcHRzO1xuICAgICAgICAgICAgICBsZXQgcmVzdWx0O1xuICAgICAgICAgICAgICBsZXQgdXNlcjtcblxuICAgICAgICAgICAgICBpZiAoaHR0cFJlcS5oZWFkZXJzWyd4LW10b2snXSAmJiB0aGlzLl9nZXRVc2VySWQoaHR0cFJlcS5oZWFkZXJzWyd4LW10b2snXSkpIHtcbiAgICAgICAgICAgICAgICB1c2VyID0ge1xuICAgICAgICAgICAgICAgICAgdXNlcklkOiB0aGlzLl9nZXRVc2VySWQoaHR0cFJlcS5oZWFkZXJzWyd4LW10b2snXSlcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHVzZXIgPSB0aGlzLl9nZXRVc2VyKHtyZXF1ZXN0OiBodHRwUmVxLCByZXNwb25zZTogaHR0cFJlc3B9KTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmIChodHRwUmVxLmhlYWRlcnNbJ3gtc3RhcnQnXSAhPT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgb3B0cyA9IHtcbiAgICAgICAgICAgICAgICAgIGZpbGVJZDogaHR0cFJlcS5oZWFkZXJzWyd4LWZpbGVpZCddXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGlmIChodHRwUmVxLmhlYWRlcnNbJ3gtZW9mJ10gPT09ICcxJykge1xuICAgICAgICAgICAgICAgICAgb3B0cy5lb2YgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBvcHRzLmJpbkRhdGEgPSBCdWZmZXIuZnJvbShib2R5LCAnYmFzZTY0Jyk7XG4gICAgICAgICAgICAgICAgICBvcHRzLmNodW5rSWQgPSBwYXJzZUludChodHRwUmVxLmhlYWRlcnNbJ3gtY2h1bmtpZCddKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBfY29udGludWVVcGxvYWQgPSB0aGlzLl9jb250aW51ZVVwbG9hZChvcHRzLmZpbGVJZCk7XG4gICAgICAgICAgICAgICAgaWYgKCFfY29udGludWVVcGxvYWQpIHtcbiAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDA4LCAnQ2FuXFwndCBjb250aW51ZSB1cGxvYWQsIHNlc3Npb24gZXhwaXJlZC4gU3RhcnQgdXBsb2FkIGFnYWluLicpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICh7cmVzdWx0LCBvcHRzfSAgPSB0aGlzLl9wcmVwYXJlVXBsb2FkKE9iamVjdC5hc3NpZ24ob3B0cywgX2NvbnRpbnVlVXBsb2FkKSwgdXNlci51c2VySWQsICdIVFRQJykpO1xuXG4gICAgICAgICAgICAgICAgaWYgKG9wdHMuZW9mKSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLl9oYW5kbGVVcGxvYWQocmVzdWx0LCBvcHRzLCAoX2Vycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBlcnJvciA9IF9lcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5oZWFkZXJzU2VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHR0cFJlc3Aud3JpdGVIZWFkKDUwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5maW5pc2hlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhlbHBlcnMuaXNPYmplY3QoZXJyb3IpICYmIGhlbHBlcnMuaXNGdW5jdGlvbihlcnJvci50b1N0cmluZykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IgPSBlcnJvci50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWhlbHBlcnMuaXNTdHJpbmcoZXJyb3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yID0gJ1VuZXhwZWN0ZWQgZXJyb3IhJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaHR0cFJlc3AuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3IgfSkpO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICghaHR0cFJlc3AuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBodHRwUmVzcC53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChoZWxwZXJzLmlzT2JqZWN0KHJlc3VsdC5maWxlKSAmJiByZXN1bHQuZmlsZS5tZXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmZpbGUubWV0YSA9IGZpeEpTT05TdHJpbmdpZnkocmVzdWx0LmZpbGUubWV0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoIWh0dHBSZXNwLmZpbmlzaGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgaHR0cFJlc3AuZW5kKEpTT04uc3RyaW5naWZ5KHJlc3VsdCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ19oYW5kbGVVcGxvYWQnLCByZXN1bHQsIG9wdHMsIE5PT1ApO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5oZWFkZXJzU2VudCkge1xuICAgICAgICAgICAgICAgICAgaHR0cFJlc3Aud3JpdGVIZWFkKDIwNCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghaHR0cFJlc3AuZmluaXNoZWQpIHtcbiAgICAgICAgICAgICAgICAgIGh0dHBSZXNwLmVuZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgb3B0cyA9IEpTT04ucGFyc2UoYm9keSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoanNvbkVycikge1xuICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignQ2FuXFwndCBwYXJzZSBpbmNvbWluZyBKU09OIGZyb20gQ2xpZW50IG9uIFsuaW5zZXJ0KCkgfCB1cGxvYWRdLCBzb21ldGhpbmcgd2VudCB3cm9uZyEnLCBqc29uRXJyKTtcbiAgICAgICAgICAgICAgICAgIG9wdHMgPSB7ZmlsZToge319O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICghaGVscGVycy5pc09iamVjdChvcHRzLmZpbGUpKSB7XG4gICAgICAgICAgICAgICAgICBvcHRzLmZpbGUgPSB7fTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBvcHRzLl9fX3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZSBTdGFydCBIVFRQXSAke29wdHMuZmlsZS5uYW1lIHx8ICdbbm8tbmFtZV0nfSAtICR7b3B0cy5maWxlSWR9YCk7XG4gICAgICAgICAgICAgICAgaWYgKGhlbHBlcnMuaXNPYmplY3Qob3B0cy5maWxlKSAmJiBvcHRzLmZpbGUubWV0YSkge1xuICAgICAgICAgICAgICAgICAgb3B0cy5maWxlLm1ldGEgPSBmaXhKU09OUGFyc2Uob3B0cy5maWxlLm1ldGEpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICh7cmVzdWx0fSA9IHRoaXMuX3ByZXBhcmVVcGxvYWQoaGVscGVycy5jbG9uZShvcHRzKSwgdXNlci51c2VySWQsICdIVFRQIFN0YXJ0IE1ldGhvZCcpKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShyZXN1bHQuX2lkKSkge1xuICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDAsICdDYW5cXCd0IHN0YXJ0IHVwbG9hZCwgZGF0YSBzdWJzdGl0dXRpb24gZGV0ZWN0ZWQhJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgb3B0cy5faWQgICAgICAgPSBvcHRzLmZpbGVJZDtcbiAgICAgICAgICAgICAgICBvcHRzLmNyZWF0ZWRBdCA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgb3B0cy5tYXhMZW5ndGggPSBvcHRzLmZpbGVMZW5ndGg7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJlQ29sbGVjdGlvbi5pbnNlcnQoaGVscGVycy5vbWl0KG9wdHMsICdfX19zJykpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2NyZWF0ZVN0cmVhbShyZXN1bHQuX2lkLCByZXN1bHQucGF0aCwgaGVscGVycy5vbWl0KG9wdHMsICdfX19zJykpO1xuXG4gICAgICAgICAgICAgICAgaWYgKG9wdHMucmV0dXJuTWV0YSkge1xuICAgICAgICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5oZWFkZXJzU2VudCkge1xuICAgICAgICAgICAgICAgICAgICBodHRwUmVzcC53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKCFodHRwUmVzcC5maW5pc2hlZCkge1xuICAgICAgICAgICAgICAgICAgICBodHRwUmVzcC5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgIHVwbG9hZFJvdXRlOiBgJHt0aGlzLmRvd25sb2FkUm91dGV9LyR7dGhpcy5jb2xsZWN0aW9uTmFtZX0vX191cGxvYWRgLFxuICAgICAgICAgICAgICAgICAgICAgIGZpbGU6IHJlc3VsdFxuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGlmICghaHR0cFJlc3AuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaHR0cFJlc3Aud3JpdGVIZWFkKDIwNCk7XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGlmICghaHR0cFJlc3AuZmluaXNoZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaHR0cFJlc3AuZW5kKCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChodHRwUmVzcEVycikge1xuICAgICAgICAgICAgICBoYW5kbGVFcnJvcihodHRwUmVzcEVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICghdGhpcy5kaXNhYmxlRG93bmxvYWQpIHtcbiAgICAgICAgbGV0IGh0dHA7XG4gICAgICAgIGxldCBwYXJhbXM7XG4gICAgICAgIGxldCB1cmk7XG4gICAgICAgIGxldCB1cmlzO1xuXG4gICAgICAgIGlmICghdGhpcy5wdWJsaWMpIHtcbiAgICAgICAgICBpZiAoISF+aHR0cFJlcS5fcGFyc2VkVXJsLnBhdGguaW5kZXhPZihgJHt0aGlzLmRvd25sb2FkUm91dGV9LyR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gKSkge1xuICAgICAgICAgICAgdXJpID0gaHR0cFJlcS5fcGFyc2VkVXJsLnBhdGgucmVwbGFjZShgJHt0aGlzLmRvd25sb2FkUm91dGV9LyR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gLCAnJyk7XG4gICAgICAgICAgICBpZiAodXJpLmluZGV4T2YoJy8nKSA9PT0gMCkge1xuICAgICAgICAgICAgICB1cmkgPSB1cmkuc3Vic3RyaW5nKDEpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB1cmlzID0gdXJpLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICBpZiAodXJpcy5sZW5ndGggPT09IDMpIHtcbiAgICAgICAgICAgICAgcGFyYW1zID0ge1xuICAgICAgICAgICAgICAgIF9pZDogdXJpc1swXSxcbiAgICAgICAgICAgICAgICBxdWVyeTogaHR0cFJlcS5fcGFyc2VkVXJsLnF1ZXJ5ID8gbm9kZVFzLnBhcnNlKGh0dHBSZXEuX3BhcnNlZFVybC5xdWVyeSkgOiB7fSxcbiAgICAgICAgICAgICAgICBuYW1lOiB1cmlzWzJdLnNwbGl0KCc/JylbMF0sXG4gICAgICAgICAgICAgICAgdmVyc2lvbjogdXJpc1sxXVxuICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgIGh0dHAgPSB7cmVxdWVzdDogaHR0cFJlcSwgcmVzcG9uc2U6IGh0dHBSZXNwLCBwYXJhbXN9O1xuICAgICAgICAgICAgICBpZiAodGhpcy5fY2hlY2tBY2Nlc3MoaHR0cCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRvd25sb2FkKGh0dHAsIHVyaXNbMV0sIHRoaXMuY29sbGVjdGlvbi5maW5kT25lKHVyaXNbMF0pKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICghIX5odHRwUmVxLl9wYXJzZWRVcmwucGF0aC5pbmRleE9mKGAke3RoaXMuZG93bmxvYWRSb3V0ZX1gKSkge1xuICAgICAgICAgICAgdXJpID0gaHR0cFJlcS5fcGFyc2VkVXJsLnBhdGgucmVwbGFjZShgJHt0aGlzLmRvd25sb2FkUm91dGV9YCwgJycpO1xuICAgICAgICAgICAgaWYgKHVyaS5pbmRleE9mKCcvJykgPT09IDApIHtcbiAgICAgICAgICAgICAgdXJpID0gdXJpLnN1YnN0cmluZygxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdXJpcyAgPSB1cmkuc3BsaXQoJy8nKTtcbiAgICAgICAgICAgIGxldCBfZmlsZSA9IHVyaXNbdXJpcy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIGlmIChfZmlsZSkge1xuICAgICAgICAgICAgICBsZXQgdmVyc2lvbjtcbiAgICAgICAgICAgICAgaWYgKCEhfl9maWxlLmluZGV4T2YoJy0nKSkge1xuICAgICAgICAgICAgICAgIHZlcnNpb24gPSBfZmlsZS5zcGxpdCgnLScpWzBdO1xuICAgICAgICAgICAgICAgIF9maWxlICAgPSBfZmlsZS5zcGxpdCgnLScpWzFdLnNwbGl0KCc/JylbMF07XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmVyc2lvbiA9ICdvcmlnaW5hbCc7XG4gICAgICAgICAgICAgICAgX2ZpbGUgICA9IF9maWxlLnNwbGl0KCc/JylbMF07XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBwYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgcXVlcnk6IGh0dHBSZXEuX3BhcnNlZFVybC5xdWVyeSA/IG5vZGVRcy5wYXJzZShodHRwUmVxLl9wYXJzZWRVcmwucXVlcnkpIDoge30sXG4gICAgICAgICAgICAgICAgZmlsZTogX2ZpbGUsXG4gICAgICAgICAgICAgICAgX2lkOiBfZmlsZS5zcGxpdCgnLicpWzBdLFxuICAgICAgICAgICAgICAgIHZlcnNpb24sXG4gICAgICAgICAgICAgICAgbmFtZTogX2ZpbGVcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgaHR0cCA9IHtyZXF1ZXN0OiBodHRwUmVxLCByZXNwb25zZTogaHR0cFJlc3AsIHBhcmFtc307XG4gICAgICAgICAgICAgIHRoaXMuZG93bmxvYWQoaHR0cCwgdmVyc2lvbiwgdGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUocGFyYW1zLl9pZCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIG5leHQoKTtcbiAgICB9KTtcblxuICAgIGlmICghdGhpcy5kaXNhYmxlVXBsb2FkKSB7XG4gICAgICBjb25zdCBfbWV0aG9kcyA9IHt9O1xuXG4gICAgICAvLyBNZXRob2QgdXNlZCB0byByZW1vdmUgZmlsZVxuICAgICAgLy8gZnJvbSBDbGllbnQgc2lkZVxuICAgICAgX21ldGhvZHNbdGhpcy5fbWV0aG9kTmFtZXMuX1JlbW92ZV0gPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcbiAgICAgICAgY2hlY2soc2VsZWN0b3IsIE1hdGNoLk9uZU9mKFN0cmluZywgT2JqZWN0KSk7XG4gICAgICAgIHNlbGYuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbVW5saW5rIE1ldGhvZF0gWy5yZW1vdmUoJHtzZWxlY3Rvcn0pXWApO1xuXG4gICAgICAgIGlmIChzZWxmLmFsbG93Q2xpZW50Q29kZSkge1xuICAgICAgICAgIGlmIChzZWxmLm9uQmVmb3JlUmVtb3ZlICYmIGhlbHBlcnMuaXNGdW5jdGlvbihzZWxmLm9uQmVmb3JlUmVtb3ZlKSkge1xuICAgICAgICAgICAgY29uc3QgdXNlcklkID0gdGhpcy51c2VySWQ7XG4gICAgICAgICAgICBjb25zdCB1c2VyRnVuY3MgPSB7XG4gICAgICAgICAgICAgIHVzZXJJZDogdGhpcy51c2VySWQsXG4gICAgICAgICAgICAgIHVzZXIoKSB7XG4gICAgICAgICAgICAgICAgaWYgKE1ldGVvci51c2Vycykge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIE1ldGVvci51c2Vycy5maW5kT25lKHVzZXJJZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAoIXNlbGYub25CZWZvcmVSZW1vdmUuY2FsbCh1c2VyRnVuY3MsIChzZWxmLmZpbmQoc2VsZWN0b3IpIHx8IG51bGwpKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgJ1tGaWxlc0NvbGxlY3Rpb25dIFtyZW1vdmVdIE5vdCBwZXJtaXR0ZWQhJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgY3Vyc29yID0gc2VsZi5maW5kKHNlbGVjdG9yKTtcbiAgICAgICAgICBpZiAoY3Vyc29yLmNvdW50KCkgPiAwKSB7XG4gICAgICAgICAgICBzZWxmLnJlbW92ZShzZWxlY3Rvcik7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDQsICdDdXJzb3IgaXMgZW1wdHksIG5vIGZpbGVzIGlzIHJlbW92ZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMSwgJ1tGaWxlc0NvbGxlY3Rpb25dIFtyZW1vdmVdIFJ1biBjb2RlIGZyb20gY2xpZW50IGlzIG5vdCBhbGxvd2VkIScpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG5cbiAgICAgIC8vIE1ldGhvZCB1c2VkIHRvIHJlY2VpdmUgXCJmaXJzdCBieXRlXCIgb2YgdXBsb2FkXG4gICAgICAvLyBhbmQgYWxsIGZpbGUncyBtZXRhLWRhdGEsIHNvXG4gICAgICAvLyBpdCB3b24ndCBiZSB0cmFuc2ZlcnJlZCB3aXRoIGV2ZXJ5IGNodW5rXG4gICAgICAvLyBCYXNpY2FsbHkgaXQgcHJlcGFyZXMgZXZlcnl0aGluZ1xuICAgICAgLy8gU28gdXNlciBjYW4gcGF1c2UvZGlzY29ubmVjdCBhbmRcbiAgICAgIC8vIGNvbnRpbnVlIHVwbG9hZCBsYXRlciwgZHVyaW5nIGBjb250aW51ZVVwbG9hZFRUTGBcbiAgICAgIF9tZXRob2RzW3RoaXMuX21ldGhvZE5hbWVzLl9TdGFydF0gPSBmdW5jdGlvbiAob3B0cywgcmV0dXJuTWV0YSkge1xuICAgICAgICBjaGVjayhvcHRzLCB7XG4gICAgICAgICAgZmlsZTogT2JqZWN0LFxuICAgICAgICAgIGZpbGVJZDogU3RyaW5nLFxuICAgICAgICAgIEZTTmFtZTogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcbiAgICAgICAgICBjaHVua1NpemU6IE51bWJlcixcbiAgICAgICAgICBmaWxlTGVuZ3RoOiBOdW1iZXJcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2hlY2socmV0dXJuTWV0YSwgTWF0Y2guT3B0aW9uYWwoQm9vbGVhbikpO1xuXG4gICAgICAgIHNlbGYuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZSBTdGFydCBNZXRob2RdICR7b3B0cy5maWxlLm5hbWV9IC0gJHtvcHRzLmZpbGVJZH1gKTtcbiAgICAgICAgb3B0cy5fX19zID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgeyByZXN1bHQgfSA9IHNlbGYuX3ByZXBhcmVVcGxvYWQoaGVscGVycy5jbG9uZShvcHRzKSwgdGhpcy51c2VySWQsICdERFAgU3RhcnQgTWV0aG9kJyk7XG5cbiAgICAgICAgaWYgKHNlbGYuY29sbGVjdGlvbi5maW5kT25lKHJlc3VsdC5faWQpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDAsICdDYW5cXCd0IHN0YXJ0IHVwbG9hZCwgZGF0YSBzdWJzdGl0dXRpb24gZGV0ZWN0ZWQhJyk7XG4gICAgICAgIH1cblxuICAgICAgICBvcHRzLl9pZCAgICAgICA9IG9wdHMuZmlsZUlkO1xuICAgICAgICBvcHRzLmNyZWF0ZWRBdCA9IG5ldyBEYXRlKCk7XG4gICAgICAgIG9wdHMubWF4TGVuZ3RoID0gb3B0cy5maWxlTGVuZ3RoO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHNlbGYuX3ByZUNvbGxlY3Rpb24uaW5zZXJ0KGhlbHBlcnMub21pdChvcHRzLCAnX19fcycpKTtcbiAgICAgICAgICBzZWxmLl9jcmVhdGVTdHJlYW0ocmVzdWx0Ll9pZCwgcmVzdWx0LnBhdGgsIGhlbHBlcnMub21pdChvcHRzLCAnX19fcycpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHNlbGYuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZSBTdGFydCBNZXRob2RdIFtFWENFUFRJT046XSAke29wdHMuZmlsZS5uYW1lfSAtICR7b3B0cy5maWxlSWR9YCwgZSk7XG4gICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig1MDAsICdDYW5cXCd0IHN0YXJ0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmV0dXJuTWV0YSkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB1cGxvYWRSb3V0ZTogYCR7c2VsZi5kb3dubG9hZFJvdXRlfS8ke3NlbGYuY29sbGVjdGlvbk5hbWV9L19fdXBsb2FkYCxcbiAgICAgICAgICAgIGZpbGU6IHJlc3VsdFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9O1xuXG5cbiAgICAgIC8vIE1ldGhvZCB1c2VkIHRvIHdyaXRlIGZpbGUgY2h1bmtzXG4gICAgICAvLyBpdCByZWNlaXZlcyB2ZXJ5IGxpbWl0ZWQgYW1vdW50IG9mIG1ldGEtZGF0YVxuICAgICAgLy8gVGhpcyBtZXRob2QgYWxzbyByZXNwb25zaWJsZSBmb3IgRU9GXG4gICAgICBfbWV0aG9kc1t0aGlzLl9tZXRob2ROYW1lcy5fV3JpdGVdID0gZnVuY3Rpb24gKF9vcHRzKSB7XG4gICAgICAgIGxldCBvcHRzID0gX29wdHM7XG4gICAgICAgIGxldCByZXN1bHQ7XG4gICAgICAgIGNoZWNrKG9wdHMsIHtcbiAgICAgICAgICBlb2Y6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pLFxuICAgICAgICAgIGZpbGVJZDogU3RyaW5nLFxuICAgICAgICAgIGJpbkRhdGE6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG4gICAgICAgICAgY2h1bmtJZDogTWF0Y2guT3B0aW9uYWwoTnVtYmVyKVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAob3B0cy5iaW5EYXRhKSB7XG4gICAgICAgICAgb3B0cy5iaW5EYXRhID0gQnVmZmVyLmZyb20ob3B0cy5iaW5EYXRhLCAnYmFzZTY0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBfY29udGludWVVcGxvYWQgPSBzZWxmLl9jb250aW51ZVVwbG9hZChvcHRzLmZpbGVJZCk7XG4gICAgICAgIGlmICghX2NvbnRpbnVlVXBsb2FkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDgsICdDYW5cXCd0IGNvbnRpbnVlIHVwbG9hZCwgc2Vzc2lvbiBleHBpcmVkLiBTdGFydCB1cGxvYWQgYWdhaW4uJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnVuYmxvY2soKTtcbiAgICAgICAgKHtyZXN1bHQsIG9wdHN9ID0gc2VsZi5fcHJlcGFyZVVwbG9hZChPYmplY3QuYXNzaWduKG9wdHMsIF9jb250aW51ZVVwbG9hZCksIHRoaXMudXNlcklkLCAnRERQJykpO1xuXG4gICAgICAgIGlmIChvcHRzLmVvZikge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gc2VsZi5faGFuZGxlVXBsb2FkU3luYyhyZXN1bHQsIG9wdHMpO1xuICAgICAgICAgIH0gY2F0Y2ggKGhhbmRsZVVwbG9hZEVycikge1xuICAgICAgICAgICAgc2VsZi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtXcml0ZSBNZXRob2RdIFtERFBdIEV4Y2VwdGlvbjonLCBoYW5kbGVVcGxvYWRFcnIpO1xuICAgICAgICAgICAgdGhyb3cgaGFuZGxlVXBsb2FkRXJyO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZWxmLmVtaXQoJ19oYW5kbGVVcGxvYWQnLCByZXN1bHQsIG9wdHMsIE5PT1ApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfTtcblxuICAgICAgLy8gTWV0aG9kIHVzZWQgdG8gQWJvcnQgdXBsb2FkXG4gICAgICAvLyAtIEZlZWluZyBtZW1vcnkgYnkgLmVuZCgpaW5nIHdyaXRhYmxlU3RyZWFtc1xuICAgICAgLy8gLSBSZW1vdmluZyB0ZW1wb3JhcnkgcmVjb3JkIGZyb20gQF9wcmVDb2xsZWN0aW9uXG4gICAgICAvLyAtIFJlbW92aW5nIHJlY29yZCBmcm9tIEBjb2xsZWN0aW9uXG4gICAgICAvLyAtIC51bmxpbmsoKWluZyBjaHVua3MgZnJvbSBGU1xuICAgICAgX21ldGhvZHNbdGhpcy5fbWV0aG9kTmFtZXMuX0Fib3J0XSA9IGZ1bmN0aW9uIChfaWQpIHtcbiAgICAgICAgY2hlY2soX2lkLCBTdHJpbmcpO1xuXG4gICAgICAgIGNvbnN0IF9jb250aW51ZVVwbG9hZCA9IHNlbGYuX2NvbnRpbnVlVXBsb2FkKF9pZCk7XG4gICAgICAgIHNlbGYuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbQWJvcnQgTWV0aG9kXTogJHtfaWR9IC0gJHsoaGVscGVycy5pc09iamVjdChfY29udGludWVVcGxvYWQuZmlsZSkgPyBfY29udGludWVVcGxvYWQuZmlsZS5wYXRoIDogJycpfWApO1xuXG4gICAgICAgIGlmIChzZWxmLl9jdXJyZW50VXBsb2FkcyAmJiBzZWxmLl9jdXJyZW50VXBsb2Fkc1tfaWRdKSB7XG4gICAgICAgICAgc2VsZi5fY3VycmVudFVwbG9hZHNbX2lkXS5zdG9wKCk7XG4gICAgICAgICAgc2VsZi5fY3VycmVudFVwbG9hZHNbX2lkXS5hYm9ydCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKF9jb250aW51ZVVwbG9hZCkge1xuICAgICAgICAgIHNlbGYuX3ByZUNvbGxlY3Rpb24ucmVtb3ZlKHtfaWR9KTtcbiAgICAgICAgICBzZWxmLnJlbW92ZSh7X2lkfSk7XG4gICAgICAgICAgaWYgKGhlbHBlcnMuaXNPYmplY3QoX2NvbnRpbnVlVXBsb2FkLmZpbGUpICYmIF9jb250aW51ZVVwbG9hZC5maWxlLnBhdGgpIHtcbiAgICAgICAgICAgIHNlbGYudW5saW5rKHtfaWQsIHBhdGg6IF9jb250aW51ZVVwbG9hZC5maWxlLnBhdGh9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9O1xuXG4gICAgICBNZXRlb3IubWV0aG9kcyhfbWV0aG9kcyk7XG4gICAgfVxuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIF9wcmVwYXJlVXBsb2FkXG4gICAqIEBzdW1tYXJ5IEludGVybmFsIG1ldGhvZC4gVXNlZCB0byBvcHRpbWl6ZSByZWNlaXZlZCBkYXRhIGFuZCBjaGVjayB1cGxvYWQgcGVybWlzc2lvblxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgX3ByZXBhcmVVcGxvYWQob3B0cyA9IHt9LCB1c2VySWQsIHRyYW5zcG9ydCkge1xuICAgIGxldCBjdHg7XG4gICAgaWYgKCFoZWxwZXJzLmlzQm9vbGVhbihvcHRzLmVvZikpIHtcbiAgICAgIG9wdHMuZW9mID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCFvcHRzLmJpbkRhdGEpIHtcbiAgICAgIG9wdHMuYmluRGF0YSA9ICdFT0YnO1xuICAgIH1cblxuICAgIGlmICghaGVscGVycy5pc051bWJlcihvcHRzLmNodW5rSWQpKSB7XG4gICAgICBvcHRzLmNodW5rSWQgPSAtMTtcbiAgICB9XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNTdHJpbmcob3B0cy5GU05hbWUpKSB7XG4gICAgICBvcHRzLkZTTmFtZSA9IG9wdHMuZmlsZUlkO1xuICAgIH1cblxuICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbVXBsb2FkXSBbJHt0cmFuc3BvcnR9XSBHb3QgIyR7b3B0cy5jaHVua0lkfS8ke29wdHMuZmlsZUxlbmd0aH0gY2h1bmtzLCBkc3Q6ICR7b3B0cy5maWxlLm5hbWUgfHwgb3B0cy5maWxlLmZpbGVOYW1lfWApO1xuXG4gICAgY29uc3QgZmlsZU5hbWUgPSB0aGlzLl9nZXRGaWxlTmFtZShvcHRzLmZpbGUpO1xuICAgIGNvbnN0IHtleHRlbnNpb24sIGV4dGVuc2lvbldpdGhEb3R9ID0gdGhpcy5fZ2V0RXh0KGZpbGVOYW1lKTtcblxuICAgIGlmICghaGVscGVycy5pc09iamVjdChvcHRzLmZpbGUubWV0YSkpIHtcbiAgICAgIG9wdHMuZmlsZS5tZXRhID0ge307XG4gICAgfVxuXG4gICAgbGV0IHJlc3VsdCAgICAgICA9IG9wdHMuZmlsZTtcbiAgICByZXN1bHQubmFtZSAgICAgID0gZmlsZU5hbWU7XG4gICAgcmVzdWx0Lm1ldGEgICAgICA9IG9wdHMuZmlsZS5tZXRhO1xuICAgIHJlc3VsdC5leHRlbnNpb24gPSBleHRlbnNpb247XG4gICAgcmVzdWx0LmV4dCAgICAgICA9IGV4dGVuc2lvbjtcbiAgICByZXN1bHQuX2lkICAgICAgID0gb3B0cy5maWxlSWQ7XG4gICAgcmVzdWx0LnVzZXJJZCAgICA9IHVzZXJJZCB8fCBudWxsO1xuICAgIG9wdHMuRlNOYW1lICAgICAgPSBvcHRzLkZTTmFtZS5yZXBsYWNlKC8oW15hLXowLTlcXC1cXF9dKykvZ2ksICctJyk7XG4gICAgcmVzdWx0LnBhdGggICAgICA9IGAke3RoaXMuc3RvcmFnZVBhdGgocmVzdWx0KX0ke25vZGVQYXRoLnNlcH0ke29wdHMuRlNOYW1lfSR7ZXh0ZW5zaW9uV2l0aERvdH1gO1xuICAgIHJlc3VsdCAgICAgICAgICAgPSBPYmplY3QuYXNzaWduKHJlc3VsdCwgdGhpcy5fZGF0YVRvU2NoZW1hKHJlc3VsdCkpO1xuXG4gICAgaWYgKHRoaXMub25CZWZvcmVVcGxvYWQgJiYgaGVscGVycy5pc0Z1bmN0aW9uKHRoaXMub25CZWZvcmVVcGxvYWQpKSB7XG4gICAgICBjdHggPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgZmlsZTogb3B0cy5maWxlXG4gICAgICB9LCB7XG4gICAgICAgIGNodW5rSWQ6IG9wdHMuY2h1bmtJZCxcbiAgICAgICAgdXNlcklkOiByZXN1bHQudXNlcklkLFxuICAgICAgICB1c2VyKCkge1xuICAgICAgICAgIGlmIChNZXRlb3IudXNlcnMgJiYgcmVzdWx0LnVzZXJJZCkge1xuICAgICAgICAgICAgcmV0dXJuIE1ldGVvci51c2Vycy5maW5kT25lKHJlc3VsdC51c2VySWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSxcbiAgICAgICAgZW9mOiBvcHRzLmVvZlxuICAgICAgfSk7XG4gICAgICBjb25zdCBpc1VwbG9hZEFsbG93ZWQgPSB0aGlzLm9uQmVmb3JlVXBsb2FkLmNhbGwoY3R4LCByZXN1bHQpO1xuXG4gICAgICBpZiAoaXNVcGxvYWRBbGxvd2VkICE9PSB0cnVlKSB7XG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBoZWxwZXJzLmlzU3RyaW5nKGlzVXBsb2FkQWxsb3dlZCkgPyBpc1VwbG9hZEFsbG93ZWQgOiAnQG9uQmVmb3JlVXBsb2FkKCkgcmV0dXJuZWQgZmFsc2UnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICgob3B0cy5fX19zID09PSB0cnVlKSAmJiB0aGlzLm9uSW5pdGlhdGVVcGxvYWQgJiYgaGVscGVycy5pc0Z1bmN0aW9uKHRoaXMub25Jbml0aWF0ZVVwbG9hZCkpIHtcbiAgICAgICAgICB0aGlzLm9uSW5pdGlhdGVVcGxvYWQuY2FsbChjdHgsIHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKChvcHRzLl9fX3MgPT09IHRydWUpICYmIHRoaXMub25Jbml0aWF0ZVVwbG9hZCAmJiBoZWxwZXJzLmlzRnVuY3Rpb24odGhpcy5vbkluaXRpYXRlVXBsb2FkKSkge1xuICAgICAgY3R4ID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgIGZpbGU6IG9wdHMuZmlsZVxuICAgICAgfSwge1xuICAgICAgICBjaHVua0lkOiBvcHRzLmNodW5rSWQsXG4gICAgICAgIHVzZXJJZDogcmVzdWx0LnVzZXJJZCxcbiAgICAgICAgdXNlcigpIHtcbiAgICAgICAgICBpZiAoTWV0ZW9yLnVzZXJzICYmIHJlc3VsdC51c2VySWQpIHtcbiAgICAgICAgICAgIHJldHVybiBNZXRlb3IudXNlcnMuZmluZE9uZShyZXN1bHQudXNlcklkKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0sXG4gICAgICAgIGVvZjogb3B0cy5lb2ZcbiAgICAgIH0pO1xuICAgICAgdGhpcy5vbkluaXRpYXRlVXBsb2FkLmNhbGwoY3R4LCByZXN1bHQpO1xuICAgIH1cblxuICAgIHJldHVybiB7cmVzdWx0LCBvcHRzfTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSBfZmluaXNoVXBsb2FkXG4gICAqIEBzdW1tYXJ5IEludGVybmFsIG1ldGhvZC4gRmluaXNoIHVwbG9hZCwgY2xvc2UgV3JpdGFibGUgc3RyZWFtLCBhZGQgcmVjb3JkIHRvIE1vbmdvREIgYW5kIGZsdXNoIHVzZWQgbWVtb3J5XG4gICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAqL1xuICBfZmluaXNoVXBsb2FkKHJlc3VsdCwgb3B0cywgY2IpIHtcbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW1VwbG9hZF0gW2ZpbmlzaChpbmcpVXBsb2FkXSAtPiAke3Jlc3VsdC5wYXRofWApO1xuICAgIGZzLmNobW9kKHJlc3VsdC5wYXRoLCB0aGlzLnBlcm1pc3Npb25zLCBOT09QKTtcbiAgICByZXN1bHQudHlwZSAgID0gdGhpcy5fZ2V0TWltZVR5cGUob3B0cy5maWxlKTtcbiAgICByZXN1bHQucHVibGljID0gdGhpcy5wdWJsaWM7XG4gICAgdGhpcy5fdXBkYXRlRmlsZVR5cGVzKHJlc3VsdCk7XG5cbiAgICB0aGlzLmNvbGxlY3Rpb24uaW5zZXJ0KGhlbHBlcnMuY2xvbmUocmVzdWx0KSwgKGNvbEluc2VydCwgX2lkKSA9PiB7XG4gICAgICBpZiAoY29sSW5zZXJ0KSB7XG4gICAgICAgIGNiICYmIGNiKGNvbEluc2VydCk7XG4gICAgICAgIHRoaXMuX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbVXBsb2FkXSBbX2ZpbmlzaFVwbG9hZF0gW2luc2VydF0gRXJyb3I6JywgY29sSW5zZXJ0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3ByZUNvbGxlY3Rpb24udXBkYXRlKHtfaWQ6IG9wdHMuZmlsZUlkfSwgeyRzZXQ6IHtpc0ZpbmlzaGVkOiB0cnVlfX0sIChwcmVVcGRhdGVFcnJvcikgPT4ge1xuICAgICAgICAgIGlmIChwcmVVcGRhdGVFcnJvcikge1xuICAgICAgICAgICAgY2IgJiYgY2IocHJlVXBkYXRlRXJyb3IpO1xuICAgICAgICAgICAgdGhpcy5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtVcGxvYWRdIFtfZmluaXNoVXBsb2FkXSBbdXBkYXRlXSBFcnJvcjonLCBwcmVVcGRhdGVFcnJvcik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdC5faWQgPSBfaWQ7XG4gICAgICAgICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW1VwbG9hZF0gW2ZpbmlzaChlZClVcGxvYWRdIC0+ICR7cmVzdWx0LnBhdGh9YCk7XG4gICAgICAgICAgICB0aGlzLm9uQWZ0ZXJVcGxvYWQgJiYgdGhpcy5vbkFmdGVyVXBsb2FkLmNhbGwodGhpcywgcmVzdWx0KTtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnYWZ0ZXJVcGxvYWQnLCByZXN1bHQpO1xuICAgICAgICAgICAgY2IgJiYgY2IobnVsbCwgcmVzdWx0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIF9oYW5kbGVVcGxvYWRcbiAgICogQHN1bW1hcnkgSW50ZXJuYWwgbWV0aG9kIHRvIGhhbmRsZSB1cGxvYWQgcHJvY2VzcywgcGlwZSBpbmNvbWluZyBkYXRhIHRvIFdyaXRhYmxlIHN0cmVhbVxuICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgKi9cbiAgX2hhbmRsZVVwbG9hZChyZXN1bHQsIG9wdHMsIGNiKSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmIChvcHRzLmVvZikge1xuICAgICAgICB0aGlzLl9jdXJyZW50VXBsb2Fkc1tyZXN1bHQuX2lkXS5lbmQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMuZW1pdCgnX2ZpbmlzaFVwbG9hZCcsIHJlc3VsdCwgb3B0cywgY2IpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRVcGxvYWRzW3Jlc3VsdC5faWRdLndyaXRlKG9wdHMuY2h1bmtJZCwgb3B0cy5iaW5EYXRhLCBjYik7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhpcy5fZGVidWcoJ1tfaGFuZGxlVXBsb2FkXSBbRVhDRVBUSU9OOl0nLCBlKTtcbiAgICAgIGNiICYmIGNiKGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIF9nZXRNaW1lVHlwZVxuICAgKiBAcGFyYW0ge09iamVjdH0gZmlsZURhdGEgLSBGaWxlIE9iamVjdFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGZpbGUncyBtaW1lLXR5cGVcbiAgICogQHJldHVybnMge1N0cmluZ31cbiAgICovXG4gIF9nZXRNaW1lVHlwZShmaWxlRGF0YSkge1xuICAgIGxldCBtaW1lO1xuICAgIGNoZWNrKGZpbGVEYXRhLCBPYmplY3QpO1xuICAgIGlmIChoZWxwZXJzLmlzT2JqZWN0KGZpbGVEYXRhKSAmJiBmaWxlRGF0YS50eXBlKSB7XG4gICAgICBtaW1lID0gZmlsZURhdGEudHlwZTtcbiAgICB9XG5cbiAgICBpZiAoZmlsZURhdGEucGF0aCAmJiAoIW1pbWUgfHwgIWhlbHBlcnMuaXNTdHJpbmcobWltZSkpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBsZXQgYnVmICA9IEJ1ZmZlci5hbGxvYygyNjIpO1xuICAgICAgICBjb25zdCBmZCA9IGZzLm9wZW5TeW5jKGZpbGVEYXRhLnBhdGgsICdyJyk7XG4gICAgICAgIGNvbnN0IGJyID0gZnMucmVhZFN5bmMoZmQsIGJ1ZiwgMCwgMjYyLCAwKTtcbiAgICAgICAgZnMuY2xvc2UoZmQsIE5PT1ApO1xuICAgICAgICBpZiAoYnIgPCAyNjIpIHtcbiAgICAgICAgICBidWYgPSBidWYuc2xpY2UoMCwgYnIpO1xuICAgICAgICB9XG4gICAgICAgICh7bWltZX0gPSBmaWxlVHlwZShidWYpKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gV2UncmUgZ29vZFxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghbWltZSB8fCAhaGVscGVycy5pc1N0cmluZyhtaW1lKSkge1xuICAgICAgbWltZSA9ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nO1xuICAgIH1cbiAgICByZXR1cm4gbWltZTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIF9nZXRVc2VySWRcbiAgICogQHN1bW1hcnkgUmV0dXJucyBgdXNlcklkYCBtYXRjaGluZyB0aGUgeG10b2sgdG9rZW4gZGVyaXZlZCBmcm9tIE1ldGVvci5zZXJ2ZXIuc2Vzc2lvbnNcbiAgICogQHJldHVybnMge1N0cmluZ31cbiAgICovXG4gIF9nZXRVc2VySWQoeG10b2spIHtcbiAgICBpZiAoIXhtdG9rKSByZXR1cm4gbnVsbDtcblxuICAgIC8vIHRocm93IGFuIGVycm9yIHVwb24gYW4gdW5leHBlY3RlZCB0eXBlIG9mIE1ldGVvci5zZXJ2ZXIuc2Vzc2lvbnMgaW4gb3JkZXIgdG8gaWRlbnRpZnkgYnJlYWtpbmcgY2hhbmdlc1xuICAgIGlmICghTWV0ZW9yLnNlcnZlci5zZXNzaW9ucyBpbnN0YW5jZW9mIE1hcCB8fCAhaGVscGVycy5pc09iamVjdChNZXRlb3Iuc2VydmVyLnNlc3Npb25zKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZWNlaXZlZCBpbmNvbXBhdGlibGUgdHlwZSBvZiBNZXRlb3Iuc2VydmVyLnNlc3Npb25zJyk7XG4gICAgfVxuXG4gICAgaWYgKE1ldGVvci5zZXJ2ZXIuc2Vzc2lvbnMgaW5zdGFuY2VvZiBNYXAgJiYgTWV0ZW9yLnNlcnZlci5zZXNzaW9ucy5oYXMoeG10b2spICYmIGhlbHBlcnMuaXNPYmplY3QoTWV0ZW9yLnNlcnZlci5zZXNzaW9ucy5nZXQoeG10b2spKSkge1xuICAgICAgLy8gdG8gYmUgdXNlZCB3aXRoID49IE1ldGVvciAxLjguMSB3aGVyZSBNZXRlb3Iuc2VydmVyLnNlc3Npb25zIGlzIGEgTWFwXG4gICAgICByZXR1cm4gTWV0ZW9yLnNlcnZlci5zZXNzaW9ucy5nZXQoeG10b2spLnVzZXJJZDtcbiAgICB9IGVsc2UgaWYgKGhlbHBlcnMuaXNPYmplY3QoTWV0ZW9yLnNlcnZlci5zZXNzaW9ucykgJiYgeG10b2sgaW4gTWV0ZW9yLnNlcnZlci5zZXNzaW9ucyAmJiBoZWxwZXJzLmlzT2JqZWN0KE1ldGVvci5zZXJ2ZXIuc2Vzc2lvbnNbeG10b2tdKSkge1xuICAgICAgLy8gdG8gYmUgdXNlZCB3aXRoIDwgTWV0ZW9yIDEuOC4xIHdoZXJlIE1ldGVvci5zZXJ2ZXIuc2Vzc2lvbnMgaXMgYW4gT2JqZWN0XG4gICAgICByZXR1cm4gTWV0ZW9yLnNlcnZlci5zZXNzaW9uc1t4bXRva10udXNlcklkO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgX2dldFVzZXJcbiAgICogQHN1bW1hcnkgUmV0dXJucyBvYmplY3Qgd2l0aCBgdXNlcklkYCBhbmQgYHVzZXIoKWAgbWV0aG9kIHdoaWNoIHJldHVybiB1c2VyJ3Mgb2JqZWN0XG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqL1xuICBfZ2V0VXNlcihodHRwKSB7XG4gICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgdXNlcigpIHsgcmV0dXJuIG51bGw7IH0sXG4gICAgICB1c2VySWQ6IG51bGxcbiAgICB9O1xuXG4gICAgaWYgKGh0dHApIHtcbiAgICAgIGxldCBtdG9rID0gbnVsbDtcbiAgICAgIGlmIChodHRwLnJlcXVlc3QuaGVhZGVyc1sneC1tdG9rJ10pIHtcbiAgICAgICAgbXRvayA9IGh0dHAucmVxdWVzdC5oZWFkZXJzWyd4LW10b2snXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGNvb2tpZSA9IGh0dHAucmVxdWVzdC5Db29raWVzO1xuICAgICAgICBpZiAoY29va2llLmhhcygneF9tdG9rJykpIHtcbiAgICAgICAgICBtdG9rID0gY29va2llLmdldCgneF9tdG9rJyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKG10b2spIHtcbiAgICAgICAgY29uc3QgdXNlcklkID0gdGhpcy5fZ2V0VXNlcklkKG10b2spO1xuXG4gICAgICAgIGlmICh1c2VySWQpIHtcbiAgICAgICAgICByZXN1bHQudXNlciAgID0gKCkgPT4gTWV0ZW9yLnVzZXJzLmZpbmRPbmUodXNlcklkKTtcbiAgICAgICAgICByZXN1bHQudXNlcklkID0gdXNlcklkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSB3cml0ZVxuICAgKiBAcGFyYW0ge0J1ZmZlcn0gYnVmZmVyIC0gQmluYXJ5IEZpbGUncyBCdWZmZXJcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgLSBPYmplY3Qgd2l0aCBmaWxlLWRhdGFcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMubmFtZSAtIEZpbGUgbmFtZSwgYWxpYXM6IGBmaWxlTmFtZWBcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMudHlwZSAtIEZpbGUgbWltZS10eXBlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzLm1ldGEgLSBGaWxlIGFkZGl0aW9uYWwgbWV0YS1kYXRhXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLnVzZXJJZCAtIFVzZXJJZCwgZGVmYXVsdCAqbnVsbCpcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZmlsZUlkIC0gX2lkLCBkZWZhdWx0ICpudWxsKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIGZ1bmN0aW9uKGVycm9yLCBmaWxlT2JqKXsuLi59XG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gcHJvY2VlZEFmdGVyVXBsb2FkIC0gUHJvY2VlZCBvbkFmdGVyVXBsb2FkIGhvb2tcbiAgICogQHN1bW1hcnkgV3JpdGUgYnVmZmVyIHRvIEZTIGFuZCBhZGQgdG8gRmlsZXNDb2xsZWN0aW9uIENvbGxlY3Rpb25cbiAgICogQHJldHVybnMge0ZpbGVzQ29sbGVjdGlvbn0gSW5zdGFuY2VcbiAgICovXG4gIHdyaXRlKGJ1ZmZlciwgX29wdHMgPSB7fSwgX2NhbGxiYWNrLCBfcHJvY2VlZEFmdGVyVXBsb2FkKSB7XG4gICAgdGhpcy5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFt3cml0ZSgpXScpO1xuICAgIGxldCBvcHRzID0gX29wdHM7XG4gICAgbGV0IGNhbGxiYWNrID0gX2NhbGxiYWNrO1xuICAgIGxldCBwcm9jZWVkQWZ0ZXJVcGxvYWQgPSBfcHJvY2VlZEFmdGVyVXBsb2FkO1xuXG4gICAgaWYgKGhlbHBlcnMuaXNGdW5jdGlvbihvcHRzKSkge1xuICAgICAgcHJvY2VlZEFmdGVyVXBsb2FkID0gY2FsbGJhY2s7XG4gICAgICBjYWxsYmFjayA9IG9wdHM7XG4gICAgICBvcHRzICAgICA9IHt9O1xuICAgIH0gZWxzZSBpZiAoaGVscGVycy5pc0Jvb2xlYW4oY2FsbGJhY2spKSB7XG4gICAgICBwcm9jZWVkQWZ0ZXJVcGxvYWQgPSBjYWxsYmFjaztcbiAgICB9IGVsc2UgaWYgKGhlbHBlcnMuaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgICBwcm9jZWVkQWZ0ZXJVcGxvYWQgPSBvcHRzO1xuICAgIH1cblxuICAgIGNoZWNrKG9wdHMsIE1hdGNoLk9wdGlvbmFsKE9iamVjdCkpO1xuICAgIGNoZWNrKGNhbGxiYWNrLCBNYXRjaC5PcHRpb25hbChGdW5jdGlvbikpO1xuICAgIGNoZWNrKHByb2NlZWRBZnRlclVwbG9hZCwgTWF0Y2guT3B0aW9uYWwoQm9vbGVhbikpO1xuXG4gICAgY29uc3QgZmlsZUlkICAgPSBvcHRzLmZpbGVJZCB8fCBSYW5kb20uaWQoKTtcbiAgICBjb25zdCBGU05hbWUgICA9IHRoaXMubmFtaW5nRnVuY3Rpb24gPyB0aGlzLm5hbWluZ0Z1bmN0aW9uKG9wdHMpIDogZmlsZUlkO1xuICAgIGNvbnN0IGZpbGVOYW1lID0gKG9wdHMubmFtZSB8fCBvcHRzLmZpbGVOYW1lKSA/IChvcHRzLm5hbWUgfHwgb3B0cy5maWxlTmFtZSkgOiBGU05hbWU7XG5cbiAgICBjb25zdCB7ZXh0ZW5zaW9uLCBleHRlbnNpb25XaXRoRG90fSA9IHRoaXMuX2dldEV4dChmaWxlTmFtZSk7XG5cbiAgICBvcHRzLnBhdGggPSBgJHt0aGlzLnN0b3JhZ2VQYXRoKG9wdHMpfSR7bm9kZVBhdGguc2VwfSR7RlNOYW1lfSR7ZXh0ZW5zaW9uV2l0aERvdH1gO1xuICAgIG9wdHMudHlwZSA9IHRoaXMuX2dldE1pbWVUeXBlKG9wdHMpO1xuICAgIGlmICghaGVscGVycy5pc09iamVjdChvcHRzLm1ldGEpKSB7XG4gICAgICBvcHRzLm1ldGEgPSB7fTtcbiAgICB9XG5cbiAgICBpZiAoIWhlbHBlcnMuaXNOdW1iZXIob3B0cy5zaXplKSkge1xuICAgICAgb3B0cy5zaXplID0gYnVmZmVyLmxlbmd0aDtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9kYXRhVG9TY2hlbWEoe1xuICAgICAgbmFtZTogZmlsZU5hbWUsXG4gICAgICBwYXRoOiBvcHRzLnBhdGgsXG4gICAgICBtZXRhOiBvcHRzLm1ldGEsXG4gICAgICB0eXBlOiBvcHRzLnR5cGUsXG4gICAgICBzaXplOiBvcHRzLnNpemUsXG4gICAgICB1c2VySWQ6IG9wdHMudXNlcklkLFxuICAgICAgZXh0ZW5zaW9uXG4gICAgfSk7XG5cbiAgICByZXN1bHQuX2lkID0gZmlsZUlkO1xuXG4gICAgY29uc3Qgc3RyZWFtID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0ob3B0cy5wYXRoLCB7ZmxhZ3M6ICd3JywgbW9kZTogdGhpcy5wZXJtaXNzaW9uc30pO1xuICAgIHN0cmVhbS5lbmQoYnVmZmVyLCAoc3RyZWFtRXJyKSA9PiBib3VuZCgoKSA9PiB7XG4gICAgICBpZiAoc3RyZWFtRXJyKSB7XG4gICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKHN0cmVhbUVycik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmNvbGxlY3Rpb24uaW5zZXJ0KHJlc3VsdCwgKGluc2VydEVyciwgX2lkKSA9PiB7XG4gICAgICAgICAgaWYgKGluc2VydEVycikge1xuICAgICAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2soaW5zZXJ0RXJyKTtcbiAgICAgICAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbd3JpdGVdIFtpbnNlcnRdIEVycm9yOiAke2ZpbGVOYW1lfSAtPiAke3RoaXMuY29sbGVjdGlvbk5hbWV9YCwgaW5zZXJ0RXJyKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZmlsZVJlZiA9IHRoaXMuY29sbGVjdGlvbi5maW5kT25lKF9pZCk7XG4gICAgICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhudWxsLCBmaWxlUmVmKTtcbiAgICAgICAgICAgIGlmIChwcm9jZWVkQWZ0ZXJVcGxvYWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgdGhpcy5vbkFmdGVyVXBsb2FkICYmIHRoaXMub25BZnRlclVwbG9hZC5jYWxsKHRoaXMsIGZpbGVSZWYpO1xuICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2FmdGVyVXBsb2FkJywgZmlsZVJlZik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW3dyaXRlXTogJHtmaWxlTmFtZX0gLT4gJHt0aGlzLmNvbGxlY3Rpb25OYW1lfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSkpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIGxvYWRcbiAgICogQHBhcmFtIHtTdHJpbmd9IHVybCAtIFVSTCB0byBmaWxlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIC0gT2JqZWN0IHdpdGggZmlsZS1kYXRhXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzLmhlYWRlcnMgLSBIVFRQIGhlYWRlcnMgdG8gdXNlIHdoZW4gcmVxdWVzdGluZyB0aGUgZmlsZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5uYW1lIC0gRmlsZSBuYW1lLCBhbGlhczogYGZpbGVOYW1lYFxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy50eXBlIC0gRmlsZSBtaW1lLXR5cGVcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMubWV0YSAtIEZpbGUgYWRkaXRpb25hbCBtZXRhLWRhdGFcbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMudXNlcklkIC0gVXNlcklkLCBkZWZhdWx0ICpudWxsKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5maWxlSWQgLSBfaWQsIGRlZmF1bHQgKm51bGwqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gZnVuY3Rpb24oZXJyb3IsIGZpbGVPYmopey4uLn1cbiAgICogQHBhcmFtIHtCb29sZWFufSBwcm9jZWVkQWZ0ZXJVcGxvYWQgLSBQcm9jZWVkIG9uQWZ0ZXJVcGxvYWQgaG9va1xuICAgKiBAc3VtbWFyeSBEb3dubG9hZCBmaWxlLCB3cml0ZSBzdHJlYW0gdG8gRlMgYW5kIGFkZCB0byBGaWxlc0NvbGxlY3Rpb24gQ29sbGVjdGlvblxuICAgKiBAcmV0dXJucyB7RmlsZXNDb2xsZWN0aW9ufSBJbnN0YW5jZVxuICAgKi9cbiAgbG9hZCh1cmwsIF9vcHRzID0ge30sIF9jYWxsYmFjaywgX3Byb2NlZWRBZnRlclVwbG9hZCkge1xuICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbbG9hZCgke3VybH0sICR7SlNPTi5zdHJpbmdpZnkoX29wdHMpfSwgY2FsbGJhY2spXWApO1xuICAgIGxldCBvcHRzID0gX29wdHM7XG4gICAgbGV0IGNhbGxiYWNrID0gX2NhbGxiYWNrO1xuICAgIGxldCBwcm9jZWVkQWZ0ZXJVcGxvYWQgPSBfcHJvY2VlZEFmdGVyVXBsb2FkO1xuXG4gICAgaWYgKGhlbHBlcnMuaXNGdW5jdGlvbihvcHRzKSkge1xuICAgICAgcHJvY2VlZEFmdGVyVXBsb2FkID0gY2FsbGJhY2s7XG4gICAgICBjYWxsYmFjayA9IG9wdHM7XG4gICAgICBvcHRzICAgICA9IHt9O1xuICAgIH0gZWxzZSBpZiAoaGVscGVycy5pc0Jvb2xlYW4oY2FsbGJhY2spKSB7XG4gICAgICBwcm9jZWVkQWZ0ZXJVcGxvYWQgPSBjYWxsYmFjaztcbiAgICB9IGVsc2UgaWYgKGhlbHBlcnMuaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgICBwcm9jZWVkQWZ0ZXJVcGxvYWQgPSBvcHRzO1xuICAgIH1cblxuICAgIGNoZWNrKHVybCwgU3RyaW5nKTtcbiAgICBjaGVjayhvcHRzLCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcbiAgICBjaGVjayhjYWxsYmFjaywgTWF0Y2guT3B0aW9uYWwoRnVuY3Rpb24pKTtcbiAgICBjaGVjayhwcm9jZWVkQWZ0ZXJVcGxvYWQsIE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pKTtcblxuICAgIGlmICghaGVscGVycy5pc09iamVjdChvcHRzKSkge1xuICAgICAgb3B0cyA9IHt9O1xuICAgIH1cblxuICAgIGNvbnN0IGZpbGVJZCAgICA9IG9wdHMuZmlsZUlkIHx8IFJhbmRvbS5pZCgpO1xuICAgIGNvbnN0IEZTTmFtZSAgICA9IHRoaXMubmFtaW5nRnVuY3Rpb24gPyB0aGlzLm5hbWluZ0Z1bmN0aW9uKG9wdHMpIDogZmlsZUlkO1xuICAgIGNvbnN0IHBhdGhQYXJ0cyA9IHVybC5zcGxpdCgnLycpO1xuICAgIGNvbnN0IGZpbGVOYW1lICA9IChvcHRzLm5hbWUgfHwgb3B0cy5maWxlTmFtZSkgPyAob3B0cy5uYW1lIHx8IG9wdHMuZmlsZU5hbWUpIDogcGF0aFBhcnRzW3BhdGhQYXJ0cy5sZW5ndGggLSAxXSB8fCBGU05hbWU7XG5cbiAgICBjb25zdCB7ZXh0ZW5zaW9uLCBleHRlbnNpb25XaXRoRG90fSA9IHRoaXMuX2dldEV4dChmaWxlTmFtZSk7XG4gICAgb3B0cy5wYXRoICA9IGAke3RoaXMuc3RvcmFnZVBhdGgob3B0cyl9JHtub2RlUGF0aC5zZXB9JHtGU05hbWV9JHtleHRlbnNpb25XaXRoRG90fWA7XG5cbiAgICBjb25zdCBzdG9yZVJlc3VsdCA9IChyZXN1bHQsIGNiKSA9PiB7XG4gICAgICByZXN1bHQuX2lkID0gZmlsZUlkO1xuXG4gICAgICB0aGlzLmNvbGxlY3Rpb24uaW5zZXJ0KHJlc3VsdCwgKGVycm9yLCBfaWQpID0+IHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgY2IgJiYgY2IoZXJyb3IpO1xuICAgICAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbbG9hZF0gW2luc2VydF0gRXJyb3I6ICR7ZmlsZU5hbWV9IC0+ICR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gLCBlcnJvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgZmlsZVJlZiA9IHRoaXMuY29sbGVjdGlvbi5maW5kT25lKF9pZCk7XG4gICAgICAgICAgY2IgJiYgY2IobnVsbCwgZmlsZVJlZik7XG4gICAgICAgICAgaWYgKHByb2NlZWRBZnRlclVwbG9hZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgdGhpcy5vbkFmdGVyVXBsb2FkICYmIHRoaXMub25BZnRlclVwbG9hZC5jYWxsKHRoaXMsIGZpbGVSZWYpO1xuICAgICAgICAgICAgdGhpcy5lbWl0KCdhZnRlclVwbG9hZCcsIGZpbGVSZWYpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2xvYWRdIFtpbnNlcnRdICR7ZmlsZU5hbWV9IC0+ICR7dGhpcy5jb2xsZWN0aW9uTmFtZX1gKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJlcXVlc3QuZ2V0KHtcbiAgICAgIHVybCxcbiAgICAgIGhlYWRlcnM6IG9wdHMuaGVhZGVycyB8fCB7fVxuICAgIH0pLm9uKCdlcnJvcicsIChlcnJvcikgPT4gYm91bmQoKCkgPT4ge1xuICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2soZXJyb3IpO1xuICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtsb2FkXSBbcmVxdWVzdC5nZXQoJHt1cmx9KV0gRXJyb3I6YCwgZXJyb3IpO1xuICAgIH0pKS5vbigncmVzcG9uc2UnLCAocmVzcG9uc2UpID0+IGJvdW5kKCgpID0+IHtcbiAgICAgIHJlc3BvbnNlLm9uKCdlbmQnLCAoKSA9PiBib3VuZCgoKSA9PiB7XG4gICAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbbG9hZF0gUmVjZWl2ZWQ6ICR7dXJsfWApO1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLl9kYXRhVG9TY2hlbWEoe1xuICAgICAgICAgIG5hbWU6IGZpbGVOYW1lLFxuICAgICAgICAgIHBhdGg6IG9wdHMucGF0aCxcbiAgICAgICAgICBtZXRhOiBvcHRzLm1ldGEsXG4gICAgICAgICAgdHlwZTogb3B0cy50eXBlIHx8IHJlc3BvbnNlLmhlYWRlcnNbJ2NvbnRlbnQtdHlwZSddIHx8IHRoaXMuX2dldE1pbWVUeXBlKHtwYXRoOiBvcHRzLnBhdGh9KSxcbiAgICAgICAgICBzaXplOiBvcHRzLnNpemUgfHwgcGFyc2VJbnQocmVzcG9uc2UuaGVhZGVyc1snY29udGVudC1sZW5ndGgnXSB8fCAwKSxcbiAgICAgICAgICB1c2VySWQ6IG9wdHMudXNlcklkLFxuICAgICAgICAgIGV4dGVuc2lvblxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIXJlc3VsdC5zaXplKSB7XG4gICAgICAgICAgZnMuc3RhdChvcHRzLnBhdGgsIChlcnJvciwgc3RhdHMpID0+IGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhlcnJvcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXN1bHQudmVyc2lvbnMub3JpZ2luYWwuc2l6ZSA9IChyZXN1bHQuc2l6ZSA9IHN0YXRzLnNpemUpO1xuICAgICAgICAgICAgICBzdG9yZVJlc3VsdChyZXN1bHQsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RvcmVSZXN1bHQocmVzdWx0LCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICB9KSkucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShvcHRzLnBhdGgsIHtmbGFnczogJ3cnLCBtb2RlOiB0aGlzLnBlcm1pc3Npb25zfSkpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgYWRkRmlsZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCAgICAgICAgICAtIFBhdGggdG8gZmlsZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cyAgICAgICAgICAtIFtPcHRpb25hbF0gT2JqZWN0IHdpdGggZmlsZS1kYXRhXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLnR5cGUgICAgIC0gW09wdGlvbmFsXSBGaWxlIG1pbWUtdHlwZVxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cy5tZXRhICAgICAtIFtPcHRpb25hbF0gRmlsZSBhZGRpdGlvbmFsIG1ldGEtZGF0YVxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5maWxlSWQgICAtIF9pZCwgZGVmYXVsdCAqbnVsbCpcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMuZmlsZU5hbWUgLSBbT3B0aW9uYWxdIEZpbGUgbmFtZSwgaWYgbm90IHNwZWNpZmllZCBmaWxlIG5hbWUgYW5kIGV4dGVuc2lvbiB3aWxsIGJlIHRha2VuIGZyb20gcGF0aFxuICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy51c2VySWQgICAtIFtPcHRpb25hbF0gVXNlcklkLCBkZWZhdWx0ICpudWxsKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAgICAtIFtPcHRpb25hbF0gZnVuY3Rpb24oZXJyb3IsIGZpbGVPYmopey4uLn1cbiAgICogQHBhcmFtIHtCb29sZWFufSBwcm9jZWVkQWZ0ZXJVcGxvYWQgLSBQcm9jZWVkIG9uQWZ0ZXJVcGxvYWQgaG9va1xuICAgKiBAc3VtbWFyeSBBZGQgZmlsZSBmcm9tIEZTIHRvIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAcmV0dXJucyB7RmlsZXNDb2xsZWN0aW9ufSBJbnN0YW5jZVxuICAgKi9cbiAgYWRkRmlsZShwYXRoLCBfb3B0cyA9IHt9LCBfY2FsbGJhY2ssIF9wcm9jZWVkQWZ0ZXJVcGxvYWQpIHtcbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW2FkZEZpbGUoJHtwYXRofSldYCk7XG4gICAgbGV0IG9wdHMgPSBfb3B0cztcbiAgICBsZXQgY2FsbGJhY2sgPSBfY2FsbGJhY2s7XG4gICAgbGV0IHByb2NlZWRBZnRlclVwbG9hZCA9IF9wcm9jZWVkQWZ0ZXJVcGxvYWQ7XG5cbiAgICBpZiAoaGVscGVycy5pc0Z1bmN0aW9uKG9wdHMpKSB7XG4gICAgICBwcm9jZWVkQWZ0ZXJVcGxvYWQgPSBjYWxsYmFjaztcbiAgICAgIGNhbGxiYWNrID0gb3B0cztcbiAgICAgIG9wdHMgICAgID0ge307XG4gICAgfSBlbHNlIGlmIChoZWxwZXJzLmlzQm9vbGVhbihjYWxsYmFjaykpIHtcbiAgICAgIHByb2NlZWRBZnRlclVwbG9hZCA9IGNhbGxiYWNrO1xuICAgIH0gZWxzZSBpZiAoaGVscGVycy5pc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAgIHByb2NlZWRBZnRlclVwbG9hZCA9IG9wdHM7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucHVibGljKSB7XG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgJ0NhbiBub3QgcnVuIFthZGRGaWxlXSBvbiBwdWJsaWMgY29sbGVjdGlvbiEgSnVzdCBNb3ZlIGZpbGUgdG8gcm9vdCBvZiB5b3VyIHNlcnZlciwgdGhlbiBhZGQgcmVjb3JkIHRvIENvbGxlY3Rpb24nKTtcbiAgICB9XG5cbiAgICBjaGVjayhwYXRoLCBTdHJpbmcpO1xuICAgIGNoZWNrKG9wdHMsIE1hdGNoLk9wdGlvbmFsKE9iamVjdCkpO1xuICAgIGNoZWNrKGNhbGxiYWNrLCBNYXRjaC5PcHRpb25hbChGdW5jdGlvbikpO1xuICAgIGNoZWNrKHByb2NlZWRBZnRlclVwbG9hZCwgTWF0Y2guT3B0aW9uYWwoQm9vbGVhbikpO1xuXG4gICAgZnMuc3RhdChwYXRoLCAoc3RhdEVyciwgc3RhdHMpID0+IGJvdW5kKCgpID0+IHtcbiAgICAgIGlmIChzdGF0RXJyKSB7XG4gICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKHN0YXRFcnIpO1xuICAgICAgfSBlbHNlIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICBpZiAoIWhlbHBlcnMuaXNPYmplY3Qob3B0cykpIHtcbiAgICAgICAgICBvcHRzID0ge307XG4gICAgICAgIH1cbiAgICAgICAgb3B0cy5wYXRoICA9IHBhdGg7XG5cbiAgICAgICAgaWYgKCFvcHRzLmZpbGVOYW1lKSB7XG4gICAgICAgICAgY29uc3QgcGF0aFBhcnRzID0gcGF0aC5zcGxpdChub2RlUGF0aC5zZXApO1xuICAgICAgICAgIG9wdHMuZmlsZU5hbWUgICA9IHBhdGguc3BsaXQobm9kZVBhdGguc2VwKVtwYXRoUGFydHMubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB7ZXh0ZW5zaW9ufSA9IHRoaXMuX2dldEV4dChvcHRzLmZpbGVOYW1lKTtcblxuICAgICAgICBpZiAoIWhlbHBlcnMuaXNTdHJpbmcob3B0cy50eXBlKSkge1xuICAgICAgICAgIG9wdHMudHlwZSA9IHRoaXMuX2dldE1pbWVUeXBlKG9wdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFoZWxwZXJzLmlzT2JqZWN0KG9wdHMubWV0YSkpIHtcbiAgICAgICAgICBvcHRzLm1ldGEgPSB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaGVscGVycy5pc051bWJlcihvcHRzLnNpemUpKSB7XG4gICAgICAgICAgb3B0cy5zaXplID0gc3RhdHMuc2l6ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX2RhdGFUb1NjaGVtYSh7XG4gICAgICAgICAgbmFtZTogb3B0cy5maWxlTmFtZSxcbiAgICAgICAgICBwYXRoLFxuICAgICAgICAgIG1ldGE6IG9wdHMubWV0YSxcbiAgICAgICAgICB0eXBlOiBvcHRzLnR5cGUsXG4gICAgICAgICAgc2l6ZTogb3B0cy5zaXplLFxuICAgICAgICAgIHVzZXJJZDogb3B0cy51c2VySWQsXG4gICAgICAgICAgZXh0ZW5zaW9uLFxuICAgICAgICAgIF9zdG9yYWdlUGF0aDogcGF0aC5yZXBsYWNlKGAke25vZGVQYXRoLnNlcH0ke29wdHMuZmlsZU5hbWV9YCwgJycpLFxuICAgICAgICAgIGZpbGVJZDogb3B0cy5maWxlSWQgfHwgbnVsbFxuICAgICAgICB9KTtcblxuXG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5pbnNlcnQocmVzdWx0LCAoaW5zZXJ0RXJyLCBfaWQpID0+IHtcbiAgICAgICAgICBpZiAoaW5zZXJ0RXJyKSB7XG4gICAgICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhpbnNlcnRFcnIpO1xuICAgICAgICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFthZGRGaWxlXSBbaW5zZXJ0XSBFcnJvcjogJHtyZXN1bHQubmFtZX0gLT4gJHt0aGlzLmNvbGxlY3Rpb25OYW1lfWAsIGluc2VydEVycik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVSZWYgPSB0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShfaWQpO1xuICAgICAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2sobnVsbCwgZmlsZVJlZik7XG4gICAgICAgICAgICBpZiAocHJvY2VlZEFmdGVyVXBsb2FkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgIHRoaXMub25BZnRlclVwbG9hZCAmJiB0aGlzLm9uQWZ0ZXJVcGxvYWQuY2FsbCh0aGlzLCBmaWxlUmVmKTtcbiAgICAgICAgICAgICAgdGhpcy5lbWl0KCdhZnRlclVwbG9hZCcsIGZpbGVSZWYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFthZGRGaWxlXTogJHtyZXN1bHQubmFtZX0gLT4gJHt0aGlzLmNvbGxlY3Rpb25OYW1lfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhuZXcgTWV0ZW9yLkVycm9yKDQwMCwgYFtGaWxlc0NvbGxlY3Rpb25dIFthZGRGaWxlKCR7cGF0aH0pXTogRmlsZSBkb2VzIG5vdCBleGlzdGApKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSByZW1vdmVcbiAgICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBzZWxlY3RvciAtIE1vbmdvLVN0eWxlIHNlbGVjdG9yIChodHRwOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI3NlbGVjdG9ycylcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayB3aXRoIG9uZSBgZXJyb3JgIGFyZ3VtZW50XG4gICAqIEBzdW1tYXJ5IFJlbW92ZSBkb2N1bWVudHMgZnJvbSB0aGUgY29sbGVjdGlvblxuICAgKiBAcmV0dXJucyB7RmlsZXNDb2xsZWN0aW9ufSBJbnN0YW5jZVxuICAgKi9cbiAgcmVtb3ZlKHNlbGVjdG9yLCBjYWxsYmFjaykge1xuICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbcmVtb3ZlKCR7SlNPTi5zdHJpbmdpZnkoc2VsZWN0b3IpfSldYCk7XG4gICAgaWYgKHNlbGVjdG9yID09PSB2b2lkIDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBjaGVjayhjYWxsYmFjaywgTWF0Y2guT3B0aW9uYWwoRnVuY3Rpb24pKTtcblxuICAgIGNvbnN0IGZpbGVzID0gdGhpcy5jb2xsZWN0aW9uLmZpbmQoc2VsZWN0b3IpO1xuICAgIGlmIChmaWxlcy5jb3VudCgpID4gMCkge1xuICAgICAgZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgICB0aGlzLnVubGluayhmaWxlKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhuZXcgTWV0ZW9yLkVycm9yKDQwNCwgJ0N1cnNvciBpcyBlbXB0eSwgbm8gZmlsZXMgaXMgcmVtb3ZlZCcpKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9uQWZ0ZXJSZW1vdmUpIHtcbiAgICAgIGNvbnN0IGRvY3MgPSBmaWxlcy5mZXRjaCgpO1xuICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICB0aGlzLmNvbGxlY3Rpb24ucmVtb3ZlKHNlbGVjdG9yLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHNlbGYub25BZnRlclJlbW92ZShkb2NzKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbGxlY3Rpb24ucmVtb3ZlKHNlbGVjdG9yLCAoY2FsbGJhY2sgfHwgTk9PUCkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSBkZW55XG4gICAqIEBwYXJhbSB7T2JqZWN0fSBydWxlc1xuICAgKiBAc2VlICBodHRwczovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNNb25nby1Db2xsZWN0aW9uLWRlbnlcbiAgICogQHN1bW1hcnkgbGluayBNb25nby5Db2xsZWN0aW9uIGRlbnkgbWV0aG9kc1xuICAgKiBAcmV0dXJucyB7TW9uZ28uQ29sbGVjdGlvbn0gSW5zdGFuY2VcbiAgICovXG4gIGRlbnkocnVsZXMpIHtcbiAgICB0aGlzLmNvbGxlY3Rpb24uZGVueShydWxlcyk7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbjtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSBhbGxvd1xuICAgKiBAcGFyYW0ge09iamVjdH0gcnVsZXNcbiAgICogQHNlZSBodHRwczovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNNb25nby1Db2xsZWN0aW9uLWFsbG93XG4gICAqIEBzdW1tYXJ5IGxpbmsgTW9uZ28uQ29sbGVjdGlvbiBhbGxvdyBtZXRob2RzXG4gICAqIEByZXR1cm5zIHtNb25nby5Db2xsZWN0aW9ufSBJbnN0YW5jZVxuICAgKi9cbiAgYWxsb3cocnVsZXMpIHtcbiAgICB0aGlzLmNvbGxlY3Rpb24uYWxsb3cocnVsZXMpO1xuICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb247XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgZGVueUNsaWVudFxuICAgKiBAc2VlIGh0dHBzOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI01vbmdvLUNvbGxlY3Rpb24tZGVueVxuICAgKiBAc3VtbWFyeSBTaG9ydGhhbmRzIGZvciBNb25nby5Db2xsZWN0aW9uIGRlbnkgbWV0aG9kXG4gICAqIEByZXR1cm5zIHtNb25nby5Db2xsZWN0aW9ufSBJbnN0YW5jZVxuICAgKi9cbiAgZGVueUNsaWVudCgpIHtcbiAgICB0aGlzLmNvbGxlY3Rpb24uZGVueSh7XG4gICAgICBpbnNlcnQoKSB7IHJldHVybiB0cnVlOyB9LFxuICAgICAgdXBkYXRlKCkgeyByZXR1cm4gdHJ1ZTsgfSxcbiAgICAgIHJlbW92ZSgpIHsgcmV0dXJuIHRydWU7IH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uXG4gICAqIEBuYW1lIGFsbG93Q2xpZW50XG4gICAqIEBzZWUgaHR0cHM6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjTW9uZ28tQ29sbGVjdGlvbi1hbGxvd1xuICAgKiBAc3VtbWFyeSBTaG9ydGhhbmRzIGZvciBNb25nby5Db2xsZWN0aW9uIGFsbG93IG1ldGhvZFxuICAgKiBAcmV0dXJucyB7TW9uZ28uQ29sbGVjdGlvbn0gSW5zdGFuY2VcbiAgICovXG4gIGFsbG93Q2xpZW50KCkge1xuICAgIHRoaXMuY29sbGVjdGlvbi5hbGxvdyh7XG4gICAgICBpbnNlcnQoKSB7IHJldHVybiB0cnVlOyB9LFxuICAgICAgdXBkYXRlKCkgeyByZXR1cm4gdHJ1ZTsgfSxcbiAgICAgIHJlbW92ZSgpIHsgcmV0dXJuIHRydWU7IH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uO1xuICB9XG5cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgdW5saW5rXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlUmVmIC0gZmlsZU9ialxuICAgKiBAcGFyYW0ge1N0cmluZ30gdmVyc2lvbiAtIFtPcHRpb25hbF0gZmlsZSdzIHZlcnNpb25cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBbT3B0aW9uYWxdIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAqIEBzdW1tYXJ5IFVubGluayBmaWxlcyBhbmQgaXQncyB2ZXJzaW9ucyBmcm9tIEZTXG4gICAqIEByZXR1cm5zIHtGaWxlc0NvbGxlY3Rpb259IEluc3RhbmNlXG4gICAqL1xuICB1bmxpbmsoZmlsZVJlZiwgdmVyc2lvbiwgY2FsbGJhY2spIHtcbiAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW3VubGluaygke2ZpbGVSZWYuX2lkfSwgJHt2ZXJzaW9ufSldYCk7XG4gICAgaWYgKHZlcnNpb24pIHtcbiAgICAgIGlmIChoZWxwZXJzLmlzT2JqZWN0KGZpbGVSZWYudmVyc2lvbnMpICYmIGhlbHBlcnMuaXNPYmplY3QoZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXSkgJiYgZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXS5wYXRoKSB7XG4gICAgICAgIGZzLnVubGluayhmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dLnBhdGgsIChjYWxsYmFjayB8fCBOT09QKSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChoZWxwZXJzLmlzT2JqZWN0KGZpbGVSZWYudmVyc2lvbnMpKSB7XG4gICAgICAgIGZvcihsZXQgdktleSBpbiBmaWxlUmVmLnZlcnNpb25zKSB7XG4gICAgICAgICAgaWYgKGZpbGVSZWYudmVyc2lvbnNbdktleV0gJiYgZmlsZVJlZi52ZXJzaW9uc1t2S2V5XS5wYXRoKSB7XG4gICAgICAgICAgICBmcy51bmxpbmsoZmlsZVJlZi52ZXJzaW9uc1t2S2V5XS5wYXRoLCAoY2FsbGJhY2sgfHwgTk9PUCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZnMudW5saW5rKGZpbGVSZWYucGF0aCwgKGNhbGxiYWNrIHx8IE5PT1ApKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgXzQwNFxuICAgKiBAc3VtbWFyeSBJbnRlcm5hbCBtZXRob2QsIHVzZWQgdG8gcmV0dXJuIDQwNCBlcnJvclxuICAgKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICAgKi9cbiAgXzQwNChodHRwKSB7XG4gICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtkb3dubG9hZCgke2h0dHAucmVxdWVzdC5vcmlnaW5hbFVybH0pXSBbXzQwNF0gRmlsZSBub3QgZm91bmRgKTtcbiAgICBjb25zdCB0ZXh0ID0gJ0ZpbGUgTm90IEZvdW5kIDooJztcblxuICAgIGlmICghaHR0cC5yZXNwb25zZS5oZWFkZXJzU2VudCkge1xuICAgICAgaHR0cC5yZXNwb25zZS53cml0ZUhlYWQoNDA0LCB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAndGV4dC9wbGFpbicsXG4gICAgICAgICdDb250ZW50LUxlbmd0aCc6IHRleHQubGVuZ3RoXG4gICAgICB9XG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoIWh0dHAucmVzcG9uc2UuZmluaXNoZWQpIHtcbiAgICAgIGh0dHAucmVzcG9uc2UuZW5kKHRleHQpO1xuICAgIH1cbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvblxuICAgKiBAbmFtZSBkb3dubG9hZFxuICAgKiBAcGFyYW0ge09iamVjdH0gaHR0cCAgICAtIFNlcnZlciBIVFRQIG9iamVjdFxuICAgKiBAcGFyYW0ge1N0cmluZ30gdmVyc2lvbiAtIFJlcXVlc3RlZCBmaWxlIHZlcnNpb25cbiAgICogQHBhcmFtIHtPYmplY3R9IGZpbGVSZWYgLSBSZXF1ZXN0ZWQgZmlsZSBPYmplY3RcbiAgICogQHN1bW1hcnkgSW5pdGlhdGVzIHRoZSBIVFRQIHJlc3BvbnNlXG4gICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gICAqL1xuICBkb3dubG9hZChodHRwLCB2ZXJzaW9uID0gJ29yaWdpbmFsJywgZmlsZVJlZikge1xuICAgIGxldCB2UmVmO1xuICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbZG93bmxvYWQoJHtodHRwLnJlcXVlc3Qub3JpZ2luYWxVcmx9LCAke3ZlcnNpb259KV1gKTtcblxuICAgIGlmIChmaWxlUmVmKSB7XG4gICAgICBpZiAoaGVscGVycy5oYXMoZmlsZVJlZiwgJ3ZlcnNpb25zJykgJiYgaGVscGVycy5oYXMoZmlsZVJlZi52ZXJzaW9ucywgdmVyc2lvbikpIHtcbiAgICAgICAgdlJlZiA9IGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl07XG4gICAgICAgIHZSZWYuX2lkID0gZmlsZVJlZi5faWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2UmVmID0gZmlsZVJlZjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdlJlZiA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghdlJlZiB8fCAhaGVscGVycy5pc09iamVjdCh2UmVmKSkge1xuICAgICAgcmV0dXJuIHRoaXMuXzQwNChodHRwKTtcbiAgICB9IGVsc2UgaWYgKGZpbGVSZWYpIHtcbiAgICAgIGlmICh0aGlzLmRvd25sb2FkQ2FsbGJhY2spIHtcbiAgICAgICAgaWYgKCF0aGlzLmRvd25sb2FkQ2FsbGJhY2suY2FsbChPYmplY3QuYXNzaWduKGh0dHAsIHRoaXMuX2dldFVzZXIoaHR0cCkpLCBmaWxlUmVmKSkge1xuICAgICAgICAgIHJldHVybiB0aGlzLl80MDQoaHR0cCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuaW50ZXJjZXB0RG93bmxvYWQgJiYgaGVscGVycy5pc0Z1bmN0aW9uKHRoaXMuaW50ZXJjZXB0RG93bmxvYWQpKSB7XG4gICAgICAgIGlmICh0aGlzLmludGVyY2VwdERvd25sb2FkKGh0dHAsIGZpbGVSZWYsIHZlcnNpb24pID09PSB0cnVlKSB7XG4gICAgICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmcy5zdGF0KHZSZWYucGF0aCwgKHN0YXRFcnIsIHN0YXRzKSA9PiBib3VuZCgoKSA9PiB7XG4gICAgICAgIGxldCByZXNwb25zZVR5cGU7XG4gICAgICAgIGlmIChzdGF0RXJyIHx8ICFzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICAgIHJldHVybiB0aGlzLl80MDQoaHR0cCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoKHN0YXRzLnNpemUgIT09IHZSZWYuc2l6ZSkgJiYgIXRoaXMuaW50ZWdyaXR5Q2hlY2spIHtcbiAgICAgICAgICB2UmVmLnNpemUgICAgPSBzdGF0cy5zaXplO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKChzdGF0cy5zaXplICE9PSB2UmVmLnNpemUpICYmIHRoaXMuaW50ZWdyaXR5Q2hlY2spIHtcbiAgICAgICAgICByZXNwb25zZVR5cGUgPSAnNDAwJztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLnNlcnZlKGh0dHAsIGZpbGVSZWYsIHZSZWYsIHZlcnNpb24sIG51bGwsIChyZXNwb25zZVR5cGUgfHwgJzIwMCcpKTtcbiAgICAgIH0pKTtcbiAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl80MDQoaHR0cCk7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25cbiAgICogQG5hbWUgc2VydmVcbiAgICogQHBhcmFtIHtPYmplY3R9IGh0dHAgICAgLSBTZXJ2ZXIgSFRUUCBvYmplY3RcbiAgICogQHBhcmFtIHtPYmplY3R9IGZpbGVSZWYgLSBSZXF1ZXN0ZWQgZmlsZSBPYmplY3RcbiAgICogQHBhcmFtIHtPYmplY3R9IHZSZWYgICAgLSBSZXF1ZXN0ZWQgZmlsZSB2ZXJzaW9uIE9iamVjdFxuICAgKiBAcGFyYW0ge1N0cmluZ30gdmVyc2lvbiAtIFJlcXVlc3RlZCBmaWxlIHZlcnNpb25cbiAgICogQHBhcmFtIHtzdHJlYW0uUmVhZGFibGV8bnVsbH0gcmVhZGFibGVTdHJlYW0gLSBSZWFkYWJsZSBzdHJlYW0sIHdoaWNoIHNlcnZlcyBiaW5hcnkgZmlsZSBkYXRhXG4gICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZVR5cGUgLSBSZXNwb25zZSBjb2RlXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gZm9yY2UyMDAgLSBGb3JjZSAyMDAgcmVzcG9uc2UgY29kZSBvdmVyIDIwNlxuICAgKiBAc3VtbWFyeSBIYW5kbGUgYW5kIHJlcGx5IHRvIGluY29taW5nIHJlcXVlc3RcbiAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICovXG4gIHNlcnZlKGh0dHAsIGZpbGVSZWYsIHZSZWYsIHZlcnNpb24gPSAnb3JpZ2luYWwnLCByZWFkYWJsZVN0cmVhbSA9IG51bGwsIF9yZXNwb25zZVR5cGUgPSAnMjAwJywgZm9yY2UyMDAgPSBmYWxzZSkge1xuICAgIGxldCBwYXJ0aXJhbCA9IGZhbHNlO1xuICAgIGxldCByZXFSYW5nZSA9IGZhbHNlO1xuICAgIGxldCBkaXNwb3NpdGlvblR5cGUgPSAnJztcbiAgICBsZXQgc3RhcnQ7XG4gICAgbGV0IGVuZDtcbiAgICBsZXQgdGFrZTtcbiAgICBsZXQgcmVzcG9uc2VUeXBlID0gX3Jlc3BvbnNlVHlwZTtcblxuICAgIGlmIChodHRwLnBhcmFtcy5xdWVyeS5kb3dubG9hZCAmJiAoaHR0cC5wYXJhbXMucXVlcnkuZG93bmxvYWQgPT09ICd0cnVlJykpIHtcbiAgICAgIGRpc3Bvc2l0aW9uVHlwZSA9ICdhdHRhY2htZW50OyAnO1xuICAgIH0gZWxzZSB7XG4gICAgICBkaXNwb3NpdGlvblR5cGUgPSAnaW5saW5lOyAnO1xuICAgIH1cblxuICAgIGNvbnN0IGRpc3Bvc2l0aW9uTmFtZSAgICAgPSBgZmlsZW5hbWU9XFxcIiR7ZW5jb2RlVVJJKHZSZWYubmFtZSB8fCBmaWxlUmVmLm5hbWUpLnJlcGxhY2UoL1xcLC9nLCAnJTJDJyl9XFxcIjsgZmlsZW5hbWUqPVVURi04Jycke2VuY29kZVVSSUNvbXBvbmVudCh2UmVmLm5hbWUgfHwgZmlsZVJlZi5uYW1lKX07IGA7XG4gICAgY29uc3QgZGlzcG9zaXRpb25FbmNvZGluZyA9ICdjaGFyc2V0PVVURi04JztcblxuICAgIGlmICghaHR0cC5yZXNwb25zZS5oZWFkZXJzU2VudCkge1xuICAgICAgaHR0cC5yZXNwb25zZS5zZXRIZWFkZXIoJ0NvbnRlbnQtRGlzcG9zaXRpb24nLCBkaXNwb3NpdGlvblR5cGUgKyBkaXNwb3NpdGlvbk5hbWUgKyBkaXNwb3NpdGlvbkVuY29kaW5nKTtcbiAgICB9XG5cbiAgICBpZiAoaHR0cC5yZXF1ZXN0LmhlYWRlcnMucmFuZ2UgJiYgIWZvcmNlMjAwKSB7XG4gICAgICBwYXJ0aXJhbCAgICA9IHRydWU7XG4gICAgICBjb25zdCBhcnJheSA9IGh0dHAucmVxdWVzdC5oZWFkZXJzLnJhbmdlLnNwbGl0KC9ieXRlcz0oWzAtOV0qKS0oWzAtOV0qKS8pO1xuICAgICAgc3RhcnQgICAgICAgPSBwYXJzZUludChhcnJheVsxXSk7XG4gICAgICBlbmQgICAgICAgICA9IHBhcnNlSW50KGFycmF5WzJdKTtcbiAgICAgIGlmIChpc05hTihlbmQpKSB7XG4gICAgICAgIGVuZCAgICAgICA9IHZSZWYuc2l6ZSAtIDE7XG4gICAgICB9XG4gICAgICB0YWtlICAgICAgICA9IGVuZCAtIHN0YXJ0O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGFydCA9IDA7XG4gICAgICBlbmQgICA9IHZSZWYuc2l6ZSAtIDE7XG4gICAgICB0YWtlICA9IHZSZWYuc2l6ZTtcbiAgICB9XG5cbiAgICBpZiAocGFydGlyYWwgfHwgKGh0dHAucGFyYW1zLnF1ZXJ5LnBsYXkgJiYgKGh0dHAucGFyYW1zLnF1ZXJ5LnBsYXkgPT09ICd0cnVlJykpKSB7XG4gICAgICByZXFSYW5nZSA9IHtzdGFydCwgZW5kfTtcbiAgICAgIGlmIChpc05hTihzdGFydCkgJiYgIWlzTmFOKGVuZCkpIHtcbiAgICAgICAgcmVxUmFuZ2Uuc3RhcnQgPSBlbmQgLSB0YWtlO1xuICAgICAgICByZXFSYW5nZS5lbmQgICA9IGVuZDtcbiAgICAgIH1cbiAgICAgIGlmICghaXNOYU4oc3RhcnQpICYmIGlzTmFOKGVuZCkpIHtcbiAgICAgICAgcmVxUmFuZ2Uuc3RhcnQgPSBzdGFydDtcbiAgICAgICAgcmVxUmFuZ2UuZW5kICAgPSBzdGFydCArIHRha2U7XG4gICAgICB9XG5cbiAgICAgIGlmICgoc3RhcnQgKyB0YWtlKSA+PSB2UmVmLnNpemUpIHsgcmVxUmFuZ2UuZW5kID0gdlJlZi5zaXplIC0gMTsgfVxuXG4gICAgICBpZiAodGhpcy5zdHJpY3QgJiYgKChyZXFSYW5nZS5zdGFydCA+PSAodlJlZi5zaXplIC0gMSkpIHx8IChyZXFSYW5nZS5lbmQgPiAodlJlZi5zaXplIC0gMSkpKSkge1xuICAgICAgICByZXNwb25zZVR5cGUgPSAnNDE2JztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3BvbnNlVHlwZSA9ICcyMDYnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXNwb25zZVR5cGUgPSAnMjAwJztcbiAgICB9XG5cbiAgICBjb25zdCBzdHJlYW1FcnJvckhhbmRsZXIgPSAoZXJyb3IpID0+IHtcbiAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbc2VydmUoJHt2UmVmLnBhdGh9LCAke3ZlcnNpb259KV0gWzUwMF1gLCBlcnJvcik7XG4gICAgICBpZiAoIWh0dHAucmVzcG9uc2UuZmluaXNoZWQpIHtcbiAgICAgICAgaHR0cC5yZXNwb25zZS5lbmQoZXJyb3IudG9TdHJpbmcoKSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IGhlYWRlcnMgPSBoZWxwZXJzLmlzRnVuY3Rpb24odGhpcy5yZXNwb25zZUhlYWRlcnMpID8gdGhpcy5yZXNwb25zZUhlYWRlcnMocmVzcG9uc2VUeXBlLCBmaWxlUmVmLCB2UmVmLCB2ZXJzaW9uKSA6IHRoaXMucmVzcG9uc2VIZWFkZXJzO1xuXG4gICAgaWYgKCFoZWFkZXJzWydDYWNoZS1Db250cm9sJ10pIHtcbiAgICAgIGlmICghaHR0cC5yZXNwb25zZS5oZWFkZXJzU2VudCkge1xuICAgICAgICBodHRwLnJlc3BvbnNlLnNldEhlYWRlcignQ2FjaGUtQ29udHJvbCcsIHRoaXMuY2FjaGVDb250cm9sKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGxldCBrZXkgaW4gaGVhZGVycykge1xuICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmhlYWRlcnNTZW50KSB7XG4gICAgICAgIGh0dHAucmVzcG9uc2Uuc2V0SGVhZGVyKGtleSwgaGVhZGVyc1trZXldKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCByZXNwb25kID0gKHN0cmVhbSwgY29kZSkgPT4ge1xuICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmhlYWRlcnNTZW50ICYmIHJlYWRhYmxlU3RyZWFtKSB7XG4gICAgICAgIGh0dHAucmVzcG9uc2Uud3JpdGVIZWFkKGNvZGUpO1xuICAgICAgfVxuXG4gICAgICBodHRwLnJlc3BvbnNlLm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzdHJlYW0uYWJvcnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBzdHJlYW0uYWJvcnQoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHN0cmVhbS5lbmQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBzdHJlYW0uZW5kKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBodHRwLnJlcXVlc3Qub24oJ2Fib3J0ZWQnLCAoKSA9PiB7XG4gICAgICAgIGh0dHAucmVxdWVzdC5hYm9ydGVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKHR5cGVvZiBzdHJlYW0uYWJvcnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBzdHJlYW0uYWJvcnQoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHN0cmVhbS5lbmQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBzdHJlYW0uZW5kKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBzdHJlYW0ub24oJ29wZW4nLCAoKSA9PiB7XG4gICAgICAgIGlmICghaHR0cC5yZXNwb25zZS5oZWFkZXJzU2VudCkge1xuICAgICAgICAgIGh0dHAucmVzcG9uc2Uud3JpdGVIZWFkKGNvZGUpO1xuICAgICAgICB9XG4gICAgICB9KS5vbignYWJvcnQnLCAoKSA9PiB7XG4gICAgICAgIGlmICghaHR0cC5yZXNwb25zZS5maW5pc2hlZCkge1xuICAgICAgICAgIGh0dHAucmVzcG9uc2UuZW5kKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFodHRwLnJlcXVlc3QuYWJvcnRlZCkge1xuICAgICAgICAgIGh0dHAucmVxdWVzdC5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgIH0pLm9uKCdlcnJvcicsIHN0cmVhbUVycm9ySGFuZGxlclxuICAgICAgKS5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICBpZiAoIWh0dHAucmVzcG9uc2UuZmluaXNoZWQpIHtcbiAgICAgICAgICBodHRwLnJlc3BvbnNlLmVuZCgpO1xuICAgICAgICB9XG4gICAgICB9KS5waXBlKGh0dHAucmVzcG9uc2UpO1xuICAgIH07XG5cbiAgICBzd2l0Y2ggKHJlc3BvbnNlVHlwZSkge1xuICAgIGNhc2UgJzQwMCc6XG4gICAgICB0aGlzLl9kZWJ1ZyhgW0ZpbGVzQ29sbGVjdGlvbl0gW3NlcnZlKCR7dlJlZi5wYXRofSwgJHt2ZXJzaW9ufSldIFs0MDBdIENvbnRlbnQtTGVuZ3RoIG1pc21hdGNoIWApO1xuICAgICAgdmFyIHRleHQgPSAnQ29udGVudC1MZW5ndGggbWlzbWF0Y2ghJztcblxuICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmhlYWRlcnNTZW50KSB7XG4gICAgICAgIGh0dHAucmVzcG9uc2Uud3JpdGVIZWFkKDQwMCwge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAndGV4dC9wbGFpbicsXG4gICAgICAgICAgJ0NvbnRlbnQtTGVuZ3RoJzogdGV4dC5sZW5ndGhcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmICghaHR0cC5yZXNwb25zZS5maW5pc2hlZCkge1xuICAgICAgICBodHRwLnJlc3BvbnNlLmVuZCh0ZXh0KTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJzQwNCc6XG4gICAgICB0aGlzLl80MDQoaHR0cCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICc0MTYnOlxuICAgICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtzZXJ2ZSgke3ZSZWYucGF0aH0sICR7dmVyc2lvbn0pXSBbNDE2XSBDb250ZW50LVJhbmdlIGlzIG5vdCBzcGVjaWZpZWQhYCk7XG4gICAgICBpZiAoIWh0dHAucmVzcG9uc2UuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgaHR0cC5yZXNwb25zZS53cml0ZUhlYWQoNDE2KTtcbiAgICAgIH1cbiAgICAgIGlmICghaHR0cC5yZXNwb25zZS5maW5pc2hlZCkge1xuICAgICAgICBodHRwLnJlc3BvbnNlLmVuZCgpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnMjA2JzpcbiAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbc2VydmUoJHt2UmVmLnBhdGh9LCAke3ZlcnNpb259KV0gWzIwNl1gKTtcbiAgICAgIGlmICghaHR0cC5yZXNwb25zZS5oZWFkZXJzU2VudCkge1xuICAgICAgICBodHRwLnJlc3BvbnNlLnNldEhlYWRlcignQ29udGVudC1SYW5nZScsIGBieXRlcyAke3JlcVJhbmdlLnN0YXJ0fS0ke3JlcVJhbmdlLmVuZH0vJHt2UmVmLnNpemV9YCk7XG4gICAgICB9XG4gICAgICByZXNwb25kKHJlYWRhYmxlU3RyZWFtIHx8IGZzLmNyZWF0ZVJlYWRTdHJlYW0odlJlZi5wYXRoLCB7c3RhcnQ6IHJlcVJhbmdlLnN0YXJ0LCBlbmQ6IHJlcVJhbmdlLmVuZH0pLCAyMDYpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbc2VydmUoJHt2UmVmLnBhdGh9LCAke3ZlcnNpb259KV0gWzIwMF1gKTtcbiAgICAgIHJlc3BvbmQocmVhZGFibGVTdHJlYW0gfHwgZnMuY3JlYXRlUmVhZFN0cmVhbSh2UmVmLnBhdGgpLCAyMDApO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG59XG4iLCJpbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSAgICAgICAgICAgIGZyb20gJ2V2ZW50ZW1pdHRlcjMnO1xuaW1wb3J0IHsgY2hlY2ssIE1hdGNoIH0gICAgICAgICAgICBmcm9tICdtZXRlb3IvY2hlY2snO1xuaW1wb3J0IHsgZm9ybWF0RmxlVVJMLCBoZWxwZXJzIH0gICBmcm9tICcuL2xpYi5qcyc7XG5pbXBvcnQgeyBGaWxlc0N1cnNvciwgRmlsZUN1cnNvciB9IGZyb20gJy4vY3Vyc29yLmpzJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRmlsZXNDb2xsZWN0aW9uQ29yZSBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKCk7XG4gIH1cblxuICBzdGF0aWMgX19oZWxwZXJzID0gaGVscGVycztcblxuICBzdGF0aWMgc2NoZW1hID0ge1xuICAgIF9pZDoge1xuICAgICAgdHlwZTogU3RyaW5nXG4gICAgfSxcbiAgICBzaXplOiB7XG4gICAgICB0eXBlOiBOdW1iZXJcbiAgICB9LFxuICAgIG5hbWU6IHtcbiAgICAgIHR5cGU6IFN0cmluZ1xuICAgIH0sXG4gICAgdHlwZToge1xuICAgICAgdHlwZTogU3RyaW5nXG4gICAgfSxcbiAgICBwYXRoOiB7XG4gICAgICB0eXBlOiBTdHJpbmdcbiAgICB9LFxuICAgIGlzVmlkZW86IHtcbiAgICAgIHR5cGU6IEJvb2xlYW5cbiAgICB9LFxuICAgIGlzQXVkaW86IHtcbiAgICAgIHR5cGU6IEJvb2xlYW5cbiAgICB9LFxuICAgIGlzSW1hZ2U6IHtcbiAgICAgIHR5cGU6IEJvb2xlYW5cbiAgICB9LFxuICAgIGlzVGV4dDoge1xuICAgICAgdHlwZTogQm9vbGVhblxuICAgIH0sXG4gICAgaXNKU09OOiB7XG4gICAgICB0eXBlOiBCb29sZWFuXG4gICAgfSxcbiAgICBpc1BERjoge1xuICAgICAgdHlwZTogQm9vbGVhblxuICAgIH0sXG4gICAgZXh0ZW5zaW9uOiB7XG4gICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICBvcHRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgZXh0OiB7XG4gICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICBvcHRpb25hbDogdHJ1ZVxuICAgIH0sXG4gICAgZXh0ZW5zaW9uV2l0aERvdDoge1xuICAgICAgdHlwZTogU3RyaW5nLFxuICAgICAgb3B0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIG1pbWU6IHtcbiAgICAgIHR5cGU6IFN0cmluZyxcbiAgICAgIG9wdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICAnbWltZS10eXBlJzoge1xuICAgICAgdHlwZTogU3RyaW5nLFxuICAgICAgb3B0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIF9zdG9yYWdlUGF0aDoge1xuICAgICAgdHlwZTogU3RyaW5nXG4gICAgfSxcbiAgICBfZG93bmxvYWRSb3V0ZToge1xuICAgICAgdHlwZTogU3RyaW5nXG4gICAgfSxcbiAgICBfY29sbGVjdGlvbk5hbWU6IHtcbiAgICAgIHR5cGU6IFN0cmluZ1xuICAgIH0sXG4gICAgcHVibGljOiB7XG4gICAgICB0eXBlOiBCb29sZWFuLFxuICAgICAgb3B0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIG1ldGE6IHtcbiAgICAgIHR5cGU6IE9iamVjdCxcbiAgICAgIGJsYWNrYm94OiB0cnVlLFxuICAgICAgb3B0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHVzZXJJZDoge1xuICAgICAgdHlwZTogU3RyaW5nLFxuICAgICAgb3B0aW9uYWw6IHRydWVcbiAgICB9LFxuICAgIHVwZGF0ZWRBdDoge1xuICAgICAgdHlwZTogRGF0ZSxcbiAgICAgIG9wdGlvbmFsOiB0cnVlXG4gICAgfSxcbiAgICB2ZXJzaW9uczoge1xuICAgICAgdHlwZTogT2JqZWN0LFxuICAgICAgYmxhY2tib3g6IHRydWVcbiAgICB9XG4gIH07XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25Db3JlXG4gICAqIEBuYW1lIF9kZWJ1Z1xuICAgKiBAc3VtbWFyeSBQcmludCBsb2dzIGluIGRlYnVnIG1vZGVcbiAgICogQHJldHVybnMge3ZvaWR9XG4gICAqL1xuICBfZGVidWcoKSB7XG4gICAgaWYgKHRoaXMuZGVidWcpIHtcbiAgICAgIChjb25zb2xlLmluZm8gfHwgY29uc29sZS5sb2cgfHwgZnVuY3Rpb24gKCkgeyB9KS5hcHBseSh2b2lkIDAsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25Db3JlXG4gICAqIEBuYW1lIF9nZXRGaWxlTmFtZVxuICAgKiBAcGFyYW0ge09iamVjdH0gZmlsZURhdGEgLSBGaWxlIE9iamVjdFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGZpbGUncyBuYW1lXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9XG4gICAqL1xuICBfZ2V0RmlsZU5hbWUoZmlsZURhdGEpIHtcbiAgICBjb25zdCBmaWxlTmFtZSA9IGZpbGVEYXRhLm5hbWUgfHwgZmlsZURhdGEuZmlsZU5hbWU7XG4gICAgaWYgKGhlbHBlcnMuaXNTdHJpbmcoZmlsZU5hbWUpICYmIChmaWxlTmFtZS5sZW5ndGggPiAwKSkge1xuICAgICAgcmV0dXJuIChmaWxlRGF0YS5uYW1lIHx8IGZpbGVEYXRhLmZpbGVOYW1lKS5yZXBsYWNlKC9eXFwuXFwuKy8sICcnKS5yZXBsYWNlKC9cXC57Mix9L2csICcuJykucmVwbGFjZSgvXFwvL2csICcnKTtcbiAgICB9XG4gICAgcmV0dXJuICcnO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0NvbGxlY3Rpb25Db3JlXG4gICAqIEBuYW1lIF9nZXRFeHRcbiAgICogQHBhcmFtIHtTdHJpbmd9IEZpbGVOYW1lIC0gRmlsZSBuYW1lXG4gICAqIEBzdW1tYXJ5IEdldCBleHRlbnNpb24gZnJvbSBGaWxlTmFtZVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgX2dldEV4dChmaWxlTmFtZSkge1xuICAgIGlmICghIX5maWxlTmFtZS5pbmRleE9mKCcuJykpIHtcbiAgICAgIGNvbnN0IGV4dGVuc2lvbiA9IChmaWxlTmFtZS5zcGxpdCgnLicpLnBvcCgpLnNwbGl0KCc/JylbMF0gfHwgJycpLnRvTG93ZXJDYXNlKCk7XG4gICAgICByZXR1cm4geyBleHQ6IGV4dGVuc2lvbiwgZXh0ZW5zaW9uLCBleHRlbnNpb25XaXRoRG90OiBgLiR7ZXh0ZW5zaW9ufWAgfTtcbiAgICB9XG4gICAgcmV0dXJuIHsgZXh0OiAnJywgZXh0ZW5zaW9uOiAnJywgZXh0ZW5zaW9uV2l0aERvdDogJycgfTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uQ29yZVxuICAgKiBAbmFtZSBfdXBkYXRlRmlsZVR5cGVzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRmlsZSBkYXRhXG4gICAqIEBzdW1tYXJ5IEludGVybmFsIG1ldGhvZC4gQ2xhc3NpZnkgZmlsZSBiYXNlZCBvbiAndHlwZScgZmllbGRcbiAgICovXG4gIF91cGRhdGVGaWxlVHlwZXMoZGF0YSkge1xuICAgIGRhdGEuaXNWaWRlbyAgPSAvXnZpZGVvXFwvL2kudGVzdChkYXRhLnR5cGUpO1xuICAgIGRhdGEuaXNBdWRpbyAgPSAvXmF1ZGlvXFwvL2kudGVzdChkYXRhLnR5cGUpO1xuICAgIGRhdGEuaXNJbWFnZSAgPSAvXmltYWdlXFwvL2kudGVzdChkYXRhLnR5cGUpO1xuICAgIGRhdGEuaXNUZXh0ICAgPSAvXnRleHRcXC8vaS50ZXN0KGRhdGEudHlwZSk7XG4gICAgZGF0YS5pc0pTT04gICA9IC9eYXBwbGljYXRpb25cXC9qc29uJC9pLnRlc3QoZGF0YS50eXBlKTtcbiAgICBkYXRhLmlzUERGICAgID0gL15hcHBsaWNhdGlvblxcLyh4LSk/cGRmJC9pLnRlc3QoZGF0YS50eXBlKTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uQ29yZVxuICAgKiBAbmFtZSBfZGF0YVRvU2NoZW1hXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRmlsZSBkYXRhXG4gICAqIEBzdW1tYXJ5IEludGVybmFsIG1ldGhvZC4gQnVpbGQgb2JqZWN0IGluIGFjY29yZGFuY2Ugd2l0aCBkZWZhdWx0IHNjaGVtYSBmcm9tIEZpbGUgZGF0YVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgX2RhdGFUb1NjaGVtYShkYXRhKSB7XG4gICAgY29uc3QgZHMgPSB7XG4gICAgICBuYW1lOiBkYXRhLm5hbWUsXG4gICAgICBleHRlbnNpb246IGRhdGEuZXh0ZW5zaW9uLFxuICAgICAgZXh0OiBkYXRhLmV4dGVuc2lvbixcbiAgICAgIGV4dGVuc2lvbldpdGhEb3Q6ICcuJyArIGRhdGEuZXh0ZW5zaW9uLFxuICAgICAgcGF0aDogZGF0YS5wYXRoLFxuICAgICAgbWV0YTogZGF0YS5tZXRhLFxuICAgICAgdHlwZTogZGF0YS50eXBlLFxuICAgICAgbWltZTogZGF0YS50eXBlLFxuICAgICAgJ21pbWUtdHlwZSc6IGRhdGEudHlwZSxcbiAgICAgIHNpemU6IGRhdGEuc2l6ZSxcbiAgICAgIHVzZXJJZDogZGF0YS51c2VySWQgfHwgbnVsbCxcbiAgICAgIHZlcnNpb25zOiB7XG4gICAgICAgIG9yaWdpbmFsOiB7XG4gICAgICAgICAgcGF0aDogZGF0YS5wYXRoLFxuICAgICAgICAgIHNpemU6IGRhdGEuc2l6ZSxcbiAgICAgICAgICB0eXBlOiBkYXRhLnR5cGUsXG4gICAgICAgICAgZXh0ZW5zaW9uOiBkYXRhLmV4dGVuc2lvblxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgX2Rvd25sb2FkUm91dGU6IGRhdGEuX2Rvd25sb2FkUm91dGUgfHwgdGhpcy5kb3dubG9hZFJvdXRlLFxuICAgICAgX2NvbGxlY3Rpb25OYW1lOiBkYXRhLl9jb2xsZWN0aW9uTmFtZSB8fCB0aGlzLmNvbGxlY3Rpb25OYW1lXG4gICAgfTtcblxuICAgIC8vT3B0aW9uYWwgZmlsZUlkXG4gICAgaWYgKGRhdGEuZmlsZUlkKSB7XG4gICAgICBkcy5faWQgPSBkYXRhLmZpbGVJZDtcbiAgICB9XG5cbiAgICB0aGlzLl91cGRhdGVGaWxlVHlwZXMoZHMpO1xuICAgIGRzLl9zdG9yYWdlUGF0aCA9IGRhdGEuX3N0b3JhZ2VQYXRoIHx8IHRoaXMuc3RvcmFnZVBhdGgoT2JqZWN0LmFzc2lnbih7fSwgZGF0YSwgZHMpKTtcbiAgICByZXR1cm4gZHM7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvbkNvcmVcbiAgICogQG5hbWUgZmluZE9uZVxuICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IHNlbGVjdG9yIC0gTW9uZ28tU3R5bGUgc2VsZWN0b3IgKGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjc2VsZWN0b3JzKVxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE1vbmdvLVN0eWxlIHNlbGVjdG9yIE9wdGlvbnMgKGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vYXBpL2NvbGxlY3Rpb25zLmh0bWwjc29ydHNwZWNpZmllcnMpXG4gICAqIEBzdW1tYXJ5IEZpbmQgYW5kIHJldHVybiBDdXJzb3IgZm9yIG1hdGNoaW5nIGRvY3VtZW50IE9iamVjdFxuICAgKiBAcmV0dXJucyB7RmlsZUN1cnNvcn0gSW5zdGFuY2VcbiAgICovXG4gIGZpbmRPbmUoc2VsZWN0b3IgPSB7fSwgb3B0aW9ucykge1xuICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbZmluZE9uZSgke0pTT04uc3RyaW5naWZ5KHNlbGVjdG9yKX0sICR7SlNPTi5zdHJpbmdpZnkob3B0aW9ucyl9KV1gKTtcbiAgICBjaGVjayhzZWxlY3RvciwgTWF0Y2guT3B0aW9uYWwoTWF0Y2guT25lT2YoT2JqZWN0LCBTdHJpbmcsIEJvb2xlYW4sIE51bWJlciwgbnVsbCkpKTtcbiAgICBjaGVjayhvcHRpb25zLCBNYXRjaC5PcHRpb25hbChPYmplY3QpKTtcblxuICAgIGNvbnN0IGRvYyA9IHRoaXMuY29sbGVjdGlvbi5maW5kT25lKHNlbGVjdG9yLCBvcHRpb25zKTtcbiAgICBpZiAoZG9jKSB7XG4gICAgICByZXR1cm4gbmV3IEZpbGVDdXJzb3IoZG9jLCB0aGlzKTtcbiAgICB9XG4gICAgcmV0dXJuIGRvYztcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDb2xsZWN0aW9uQ29yZVxuICAgKiBAbmFtZSBmaW5kXG4gICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gc2VsZWN0b3IgLSBNb25nby1TdHlsZSBzZWxlY3RvciAoaHR0cDovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNzZWxlY3RvcnMpXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAgICAgICAgb3B0aW9ucyAgLSBNb25nby1TdHlsZSBzZWxlY3RvciBPcHRpb25zIChodHRwOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI3NvcnRzcGVjaWZpZXJzKVxuICAgKiBAc3VtbWFyeSBGaW5kIGFuZCByZXR1cm4gQ3Vyc29yIGZvciBtYXRjaGluZyBkb2N1bWVudHNcbiAgICogQHJldHVybnMge0ZpbGVzQ3Vyc29yfSBJbnN0YW5jZVxuICAgKi9cbiAgZmluZChzZWxlY3RvciA9IHt9LCBvcHRpb25zKSB7XG4gICAgdGhpcy5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtmaW5kKCR7SlNPTi5zdHJpbmdpZnkoc2VsZWN0b3IpfSwgJHtKU09OLnN0cmluZ2lmeShvcHRpb25zKX0pXWApO1xuICAgIGNoZWNrKHNlbGVjdG9yLCBNYXRjaC5PcHRpb25hbChNYXRjaC5PbmVPZihPYmplY3QsIFN0cmluZywgQm9vbGVhbiwgTnVtYmVyLCBudWxsKSkpO1xuICAgIGNoZWNrKG9wdGlvbnMsIE1hdGNoLk9wdGlvbmFsKE9iamVjdCkpO1xuXG4gICAgcmV0dXJuIG5ldyBGaWxlc0N1cnNvcihzZWxlY3Rvciwgb3B0aW9ucywgdGhpcyk7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvbkNvcmVcbiAgICogQG5hbWUgdXBkYXRlXG4gICAqIEBzZWUgaHR0cDovL2RvY3MubWV0ZW9yLmNvbS8jL2Z1bGwvdXBkYXRlXG4gICAqIEBzdW1tYXJ5IGxpbmsgTW9uZ28uQ29sbGVjdGlvbiB1cGRhdGUgbWV0aG9kXG4gICAqIEByZXR1cm5zIHtNb25nby5Db2xsZWN0aW9ufSBJbnN0YW5jZVxuICAgKi9cbiAgdXBkYXRlKCkge1xuICAgIHRoaXMuY29sbGVjdGlvbi51cGRhdGUuYXBwbHkodGhpcy5jb2xsZWN0aW9uLCBhcmd1bWVudHMpO1xuICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb247XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ29sbGVjdGlvbkNvcmVcbiAgICogQG5hbWUgbGlua1xuICAgKiBAcGFyYW0ge09iamVjdH0gZmlsZVJlZiAtIEZpbGUgcmVmZXJlbmNlIG9iamVjdFxuICAgKiBAcGFyYW0ge1N0cmluZ30gdmVyc2lvbiAtIFZlcnNpb24gb2YgZmlsZSB5b3Ugd291bGQgbGlrZSB0byByZXF1ZXN0XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBVUklCYXNlIC0gW09wdGlvbmFsXSBVUkkgYmFzZSwgc2VlIC0gaHR0cHM6Ly9naXRodWIuY29tL1ZlbGlvdkdyb3VwL01ldGVvci1GaWxlcy9pc3N1ZXMvNjI2XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgZG93bmxvYWRhYmxlIFVSTFxuICAgKiBAcmV0dXJucyB7U3RyaW5nfSBFbXB0eSBzdHJpbmcgcmV0dXJuZWQgaW4gY2FzZSBpZiBmaWxlIG5vdCBmb3VuZCBpbiBEQlxuICAgKi9cbiAgbGluayhmaWxlUmVmLCB2ZXJzaW9uID0gJ29yaWdpbmFsJywgVVJJQmFzZSkge1xuICAgIHRoaXMuX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbbGluaygkeyhoZWxwZXJzLmlzT2JqZWN0KGZpbGVSZWYpID8gZmlsZVJlZi5faWQgOiB2b2lkIDApfSwgJHt2ZXJzaW9ufSldYCk7XG4gICAgY2hlY2soZmlsZVJlZiwgT2JqZWN0KTtcblxuICAgIGlmICghZmlsZVJlZikge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgICByZXR1cm4gZm9ybWF0RmxlVVJMKGZpbGVSZWYsIHZlcnNpb24sIFVSSUJhc2UpO1xuICB9XG59XG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcblxuLypcbiAqIEBwcml2YXRlXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBjbGFzcyBGaWxlQ3Vyc29yXG4gKiBAcGFyYW0gX2ZpbGVSZWYgICAge09iamVjdH0gLSBNb25nby1TdHlsZSBzZWxlY3RvciAoaHR0cDovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNzZWxlY3RvcnMpXG4gKiBAcGFyYW0gX2NvbGxlY3Rpb24ge0ZpbGVzQ29sbGVjdGlvbn0gLSBGaWxlc0NvbGxlY3Rpb24gSW5zdGFuY2VcbiAqIEBzdW1tYXJ5IEludGVybmFsIGNsYXNzLCByZXByZXNlbnRzIGVhY2ggcmVjb3JkIGluIGBGaWxlc0N1cnNvci5lYWNoKClgIG9yIGRvY3VtZW50IHJldHVybmVkIGZyb20gYC5maW5kT25lKClgIG1ldGhvZFxuICovXG5leHBvcnQgY2xhc3MgRmlsZUN1cnNvciB7XG4gIGNvbnN0cnVjdG9yKF9maWxlUmVmLCBfY29sbGVjdGlvbikge1xuICAgIHRoaXMuX2ZpbGVSZWYgICAgPSBfZmlsZVJlZjtcbiAgICB0aGlzLl9jb2xsZWN0aW9uID0gX2NvbGxlY3Rpb247XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCBfZmlsZVJlZik7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVDdXJzb3JcbiAgICogQG5hbWUgcmVtb3ZlXG4gICAqIEBwYXJhbSBjYWxsYmFjayB7RnVuY3Rpb259IC0gVHJpZ2dlcmVkIGFzeW5jaHJvbm91c2x5IGFmdGVyIGl0ZW0gaXMgcmVtb3ZlZCBvciBmYWlsZWQgdG8gYmUgcmVtb3ZlZFxuICAgKiBAc3VtbWFyeSBSZW1vdmUgZG9jdW1lbnRcbiAgICogQHJldHVybnMge0ZpbGVDdXJzb3J9XG4gICAqL1xuICByZW1vdmUoY2FsbGJhY2spIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVDdXJzb3JdIFtyZW1vdmUoKV0nKTtcbiAgICBpZiAodGhpcy5fZmlsZVJlZikge1xuICAgICAgdGhpcy5fY29sbGVjdGlvbi5yZW1vdmUodGhpcy5fZmlsZVJlZi5faWQsIGNhbGxiYWNrKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2sobmV3IE1ldGVvci5FcnJvcig0MDQsICdObyBzdWNoIGZpbGUnKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlQ3Vyc29yXG4gICAqIEBuYW1lIGxpbmtcbiAgICogQHBhcmFtIHZlcnNpb24ge1N0cmluZ30gLSBOYW1lIG9mIGZpbGUncyBzdWJ2ZXJzaW9uXG4gICAqIEBwYXJhbSBVUklCYXNlIHtTdHJpbmd9IC0gW09wdGlvbmFsXSBVUkkgYmFzZSwgc2VlIC0gaHR0cHM6Ly9naXRodWIuY29tL1ZlbGlvdkdyb3VwL01ldGVvci1GaWxlcy9pc3N1ZXMvNjI2XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgZG93bmxvYWRhYmxlIFVSTCB0byBGaWxlXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9XG4gICAqL1xuICBsaW5rKHZlcnNpb24gPSAnb3JpZ2luYWwnLCBVUklCYXNlKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoYFtGaWxlc0NvbGxlY3Rpb25dIFtGaWxlQ3Vyc29yXSBbbGluaygke3ZlcnNpb259KV1gKTtcbiAgICBpZiAodGhpcy5fZmlsZVJlZikge1xuICAgICAgcmV0dXJuIHRoaXMuX2NvbGxlY3Rpb24ubGluayh0aGlzLl9maWxlUmVmLCB2ZXJzaW9uLCBVUklCYXNlKTtcbiAgICB9XG4gICAgcmV0dXJuICcnO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlQ3Vyc29yXG4gICAqIEBuYW1lIGdldFxuICAgKiBAcGFyYW0gcHJvcGVydHkge1N0cmluZ30gLSBOYW1lIG9mIHN1Yi1vYmplY3QgcHJvcGVydHlcbiAgICogQHN1bW1hcnkgUmV0dXJucyBjdXJyZW50IGRvY3VtZW50IGFzIGEgcGxhaW4gT2JqZWN0LCBpZiBgcHJvcGVydHlgIGlzIHNwZWNpZmllZCAtIHJldHVybnMgdmFsdWUgb2Ygc3ViLW9iamVjdCBwcm9wZXJ0eVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fG1peH1cbiAgICovXG4gIGdldChwcm9wZXJ0eSkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKGBbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZUN1cnNvcl0gW2dldCgke3Byb3BlcnR5fSldYCk7XG4gICAgaWYgKHByb3BlcnR5KSB7XG4gICAgICByZXR1cm4gdGhpcy5fZmlsZVJlZltwcm9wZXJ0eV07XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9maWxlUmVmO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlQ3Vyc29yXG4gICAqIEBuYW1lIGZldGNoXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgZG9jdW1lbnQgYXMgcGxhaW4gT2JqZWN0IGluIEFycmF5XG4gICAqIEByZXR1cm5zIHtbT2JqZWN0XX1cbiAgICovXG4gIGZldGNoKCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZUN1cnNvcl0gW2ZldGNoKCldJyk7XG4gICAgcmV0dXJuIFt0aGlzLl9maWxlUmVmXTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZUN1cnNvclxuICAgKiBAbmFtZSB3aXRoXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgcmVhY3RpdmUgdmVyc2lvbiBvZiBjdXJyZW50IEZpbGVDdXJzb3IsIHVzZWZ1bCB0byB1c2Ugd2l0aCBge3sjd2l0aH19Li4ue3svd2l0aH19YCBibG9jayB0ZW1wbGF0ZSBoZWxwZXJcbiAgICogQHJldHVybnMge1tPYmplY3RdfVxuICAgKi9cbiAgd2l0aCgpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVDdXJzb3JdIFt3aXRoKCldJyk7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24odGhpcywgdGhpcy5fY29sbGVjdGlvbi5jb2xsZWN0aW9uLmZpbmRPbmUodGhpcy5fZmlsZVJlZi5faWQpKTtcbiAgfVxufVxuXG4vKlxuICogQHByaXZhdGVcbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQGNsYXNzIEZpbGVzQ3Vyc29yXG4gKiBAcGFyYW0gX3NlbGVjdG9yICAge1N0cmluZ3xPYmplY3R9ICAgLSBNb25nby1TdHlsZSBzZWxlY3RvciAoaHR0cDovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNzZWxlY3RvcnMpXG4gKiBAcGFyYW0gb3B0aW9ucyAgICAge09iamVjdH0gICAgICAgICAgLSBNb25nby1TdHlsZSBzZWxlY3RvciBPcHRpb25zIChodHRwOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI3NlbGVjdG9ycylcbiAqIEBwYXJhbSBfY29sbGVjdGlvbiB7RmlsZXNDb2xsZWN0aW9ufSAtIEZpbGVzQ29sbGVjdGlvbiBJbnN0YW5jZVxuICogQHN1bW1hcnkgSW1wbGVtZW50YXRpb24gb2YgQ3Vyc29yIGZvciBGaWxlc0NvbGxlY3Rpb25cbiAqL1xuZXhwb3J0IGNsYXNzIEZpbGVzQ3Vyc29yIHtcbiAgY29uc3RydWN0b3IoX3NlbGVjdG9yID0ge30sIG9wdGlvbnMsIF9jb2xsZWN0aW9uKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbiA9IF9jb2xsZWN0aW9uO1xuICAgIHRoaXMuX3NlbGVjdG9yICAgPSBfc2VsZWN0b3I7XG4gICAgdGhpcy5fY3VycmVudCAgICA9IC0xO1xuICAgIHRoaXMuY3Vyc29yICAgICAgPSB0aGlzLl9jb2xsZWN0aW9uLmNvbGxlY3Rpb24uZmluZCh0aGlzLl9zZWxlY3Rvciwgb3B0aW9ucyk7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIGdldFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGFsbCBtYXRjaGluZyBkb2N1bWVudChzKSBhcyBhbiBBcnJheS4gQWxpYXMgb2YgYC5mZXRjaCgpYFxuICAgKiBAcmV0dXJucyB7W09iamVjdF19XG4gICAqL1xuICBnZXQoKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW2dldCgpXScpO1xuICAgIHJldHVybiB0aGlzLmN1cnNvci5mZXRjaCgpO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBoYXNOZXh0XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgYHRydWVgIGlmIHRoZXJlIGlzIG5leHQgaXRlbSBhdmFpbGFibGUgb24gQ3Vyc29yXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaGFzTmV4dCgpIHtcbiAgICB0aGlzLl9jb2xsZWN0aW9uLl9kZWJ1ZygnW0ZpbGVzQ29sbGVjdGlvbl0gW0ZpbGVzQ3Vyc29yXSBbaGFzTmV4dCgpXScpO1xuICAgIHJldHVybiB0aGlzLl9jdXJyZW50IDwgKHRoaXMuY3Vyc29yLmNvdW50KCkgLSAxKTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgbmV4dFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIG5leHQgaXRlbSBvbiBDdXJzb3IsIGlmIGF2YWlsYWJsZVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fHVuZGVmaW5lZH1cbiAgICovXG4gIG5leHQoKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW25leHQoKV0nKTtcbiAgICB0aGlzLmN1cnNvci5mZXRjaCgpWysrdGhpcy5fY3VycmVudF07XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIGhhc1ByZXZpb3VzXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgYHRydWVgIGlmIHRoZXJlIGlzIHByZXZpb3VzIGl0ZW0gYXZhaWxhYmxlIG9uIEN1cnNvclxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGhhc1ByZXZpb3VzKCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtoYXNQcmV2aW91cygpXScpO1xuICAgIHJldHVybiB0aGlzLl9jdXJyZW50ICE9PSAtMTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgcHJldmlvdXNcbiAgICogQHN1bW1hcnkgUmV0dXJucyBwcmV2aW91cyBpdGVtIG9uIEN1cnNvciwgaWYgYXZhaWxhYmxlXG4gICAqIEByZXR1cm5zIHtPYmplY3R8dW5kZWZpbmVkfVxuICAgKi9cbiAgcHJldmlvdXMoKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW3ByZXZpb3VzKCldJyk7XG4gICAgdGhpcy5jdXJzb3IuZmV0Y2goKVstLXRoaXMuX2N1cnJlbnRdO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBmZXRjaFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGFsbCBtYXRjaGluZyBkb2N1bWVudChzKSBhcyBhbiBBcnJheS5cbiAgICogQHJldHVybnMge1tPYmplY3RdfVxuICAgKi9cbiAgZmV0Y2goKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW2ZldGNoKCldJyk7XG4gICAgcmV0dXJuIHRoaXMuY3Vyc29yLmZldGNoKCkgfHwgW107XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIGZpcnN0XG4gICAqIEBzdW1tYXJ5IFJldHVybnMgZmlyc3QgaXRlbSBvbiBDdXJzb3IsIGlmIGF2YWlsYWJsZVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fHVuZGVmaW5lZH1cbiAgICovXG4gIGZpcnN0KCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtmaXJzdCgpXScpO1xuICAgIHRoaXMuX2N1cnJlbnQgPSAwO1xuICAgIHJldHVybiB0aGlzLmZldGNoKClbdGhpcy5fY3VycmVudF07XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIGxhc3RcbiAgICogQHN1bW1hcnkgUmV0dXJucyBsYXN0IGl0ZW0gb24gQ3Vyc29yLCBpZiBhdmFpbGFibGVcbiAgICogQHJldHVybnMge09iamVjdHx1bmRlZmluZWR9XG4gICAqL1xuICBsYXN0KCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtsYXN0KCldJyk7XG4gICAgdGhpcy5fY3VycmVudCA9IHRoaXMuY291bnQoKSAtIDE7XG4gICAgcmV0dXJuIHRoaXMuZmV0Y2goKVt0aGlzLl9jdXJyZW50XTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgY291bnRcbiAgICogQHN1bW1hcnkgUmV0dXJucyB0aGUgbnVtYmVyIG9mIGRvY3VtZW50cyB0aGF0IG1hdGNoIGEgcXVlcnlcbiAgICogQHJldHVybnMge051bWJlcn1cbiAgICovXG4gIGNvdW50KCkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtjb3VudCgpXScpO1xuICAgIHJldHVybiB0aGlzLmN1cnNvci5jb3VudCgpO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSByZW1vdmVcbiAgICogQHBhcmFtIGNhbGxiYWNrIHtGdW5jdGlvbn0gLSBUcmlnZ2VyZWQgYXN5bmNocm9ub3VzbHkgYWZ0ZXIgaXRlbSBpcyByZW1vdmVkIG9yIGZhaWxlZCB0byBiZSByZW1vdmVkXG4gICAqIEBzdW1tYXJ5IFJlbW92ZXMgYWxsIGRvY3VtZW50cyB0aGF0IG1hdGNoIGEgcXVlcnlcbiAgICogQHJldHVybnMge0ZpbGVzQ3Vyc29yfVxuICAgKi9cbiAgcmVtb3ZlKGNhbGxiYWNrKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW3JlbW92ZSgpXScpO1xuICAgIHRoaXMuX2NvbGxlY3Rpb24ucmVtb3ZlKHRoaXMuX3NlbGVjdG9yLCBjYWxsYmFjayk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIGZvckVhY2hcbiAgICogQHBhcmFtIGNhbGxiYWNrIHtGdW5jdGlvbn0gLSBGdW5jdGlvbiB0byBjYWxsLiBJdCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRocmVlIGFyZ3VtZW50czogdGhlIGBmaWxlYCwgYSAwLWJhc2VkIGluZGV4LCBhbmQgY3Vyc29yIGl0c2VsZlxuICAgKiBAcGFyYW0gY29udGV4dCB7T2JqZWN0fSAtIEFuIG9iamVjdCB3aGljaCB3aWxsIGJlIHRoZSB2YWx1ZSBvZiBgdGhpc2AgaW5zaWRlIGBjYWxsYmFja2BcbiAgICogQHN1bW1hcnkgQ2FsbCBgY2FsbGJhY2tgIG9uY2UgZm9yIGVhY2ggbWF0Y2hpbmcgZG9jdW1lbnQsIHNlcXVlbnRpYWxseSBhbmQgc3luY2hyb25vdXNseS5cbiAgICogQHJldHVybnMge3VuZGVmaW5lZH1cbiAgICovXG4gIGZvckVhY2goY2FsbGJhY2ssIGNvbnRleHQgPSB7fSkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFtmb3JFYWNoKCldJyk7XG4gICAgdGhpcy5jdXJzb3IuZm9yRWFjaChjYWxsYmFjaywgY29udGV4dCk7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIEZpbGVzQ3Vyc29yXG4gICAqIEBuYW1lIGVhY2hcbiAgICogQHN1bW1hcnkgUmV0dXJucyBhbiBBcnJheSBvZiBGaWxlQ3Vyc29yIG1hZGUgZm9yIGVhY2ggZG9jdW1lbnQgb24gY3VycmVudCBjdXJzb3JcbiAgICogICAgICAgICAgVXNlZnVsIHdoZW4gdXNpbmcgaW4ge3sjZWFjaCBGaWxlc0N1cnNvciNlYWNofX0uLi57ey9lYWNofX0gYmxvY2sgdGVtcGxhdGUgaGVscGVyXG4gICAqIEByZXR1cm5zIHtbRmlsZUN1cnNvcl19XG4gICAqL1xuICBlYWNoKCkge1xuICAgIHJldHVybiB0aGlzLm1hcCgoZmlsZSkgPT4ge1xuICAgICAgcmV0dXJuIG5ldyBGaWxlQ3Vyc29yKGZpbGUsIHRoaXMuX2NvbGxlY3Rpb24pO1xuICAgIH0pO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBtYXBcbiAgICogQHBhcmFtIGNhbGxiYWNrIHtGdW5jdGlvbn0gLSBGdW5jdGlvbiB0byBjYWxsLiBJdCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRocmVlIGFyZ3VtZW50czogdGhlIGBmaWxlYCwgYSAwLWJhc2VkIGluZGV4LCBhbmQgY3Vyc29yIGl0c2VsZlxuICAgKiBAcGFyYW0gY29udGV4dCB7T2JqZWN0fSAtIEFuIG9iamVjdCB3aGljaCB3aWxsIGJlIHRoZSB2YWx1ZSBvZiBgdGhpc2AgaW5zaWRlIGBjYWxsYmFja2BcbiAgICogQHN1bW1hcnkgTWFwIGBjYWxsYmFja2Agb3ZlciBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzLiBSZXR1cm5zIGFuIEFycmF5LlxuICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAqL1xuICBtYXAoY2FsbGJhY2ssIGNvbnRleHQgPSB7fSkge1xuICAgIHRoaXMuX2NvbGxlY3Rpb24uX2RlYnVnKCdbRmlsZXNDb2xsZWN0aW9uXSBbRmlsZXNDdXJzb3JdIFttYXAoKV0nKTtcbiAgICByZXR1cm4gdGhpcy5jdXJzb3IubWFwKGNhbGxiYWNrLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgRmlsZXNDdXJzb3JcbiAgICogQG5hbWUgY3VycmVudFxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIGN1cnJlbnQgaXRlbSBvbiBDdXJzb3IsIGlmIGF2YWlsYWJsZVxuICAgKiBAcmV0dXJucyB7T2JqZWN0fHVuZGVmaW5lZH1cbiAgICovXG4gIGN1cnJlbnQoKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW2N1cnJlbnQoKV0nKTtcbiAgICBpZiAodGhpcy5fY3VycmVudCA8IDApIHtcbiAgICAgIHRoaXMuX2N1cnJlbnQgPSAwO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5mZXRjaCgpW3RoaXMuX2N1cnJlbnRdO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBvYnNlcnZlXG4gICAqIEBwYXJhbSBjYWxsYmFja3Mge09iamVjdH0gLSBGdW5jdGlvbnMgdG8gY2FsbCB0byBkZWxpdmVyIHRoZSByZXN1bHQgc2V0IGFzIGl0IGNoYW5nZXNcbiAgICogQHN1bW1hcnkgV2F0Y2ggYSBxdWVyeS4gUmVjZWl2ZSBjYWxsYmFja3MgYXMgdGhlIHJlc3VsdCBzZXQgY2hhbmdlcy5cbiAgICogQHVybCBodHRwOi8vZG9jcy5tZXRlb3IuY29tL2FwaS9jb2xsZWN0aW9ucy5odG1sI01vbmdvLUN1cnNvci1vYnNlcnZlXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IC0gbGl2ZSBxdWVyeSBoYW5kbGVcbiAgICovXG4gIG9ic2VydmUoY2FsbGJhY2tzKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW29ic2VydmUoKV0nKTtcbiAgICByZXR1cm4gdGhpcy5jdXJzb3Iub2JzZXJ2ZShjYWxsYmFja3MpO1xuICB9XG5cbiAgLypcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZW1iZXJPZiBGaWxlc0N1cnNvclxuICAgKiBAbmFtZSBvYnNlcnZlQ2hhbmdlc1xuICAgKiBAcGFyYW0gY2FsbGJhY2tzIHtPYmplY3R9IC0gRnVuY3Rpb25zIHRvIGNhbGwgdG8gZGVsaXZlciB0aGUgcmVzdWx0IHNldCBhcyBpdCBjaGFuZ2VzXG4gICAqIEBzdW1tYXJ5IFdhdGNoIGEgcXVlcnkuIFJlY2VpdmUgY2FsbGJhY2tzIGFzIHRoZSByZXN1bHQgc2V0IGNoYW5nZXMuIE9ubHkgdGhlIGRpZmZlcmVuY2VzIGJldHdlZW4gdGhlIG9sZCBhbmQgbmV3IGRvY3VtZW50cyBhcmUgcGFzc2VkIHRvIHRoZSBjYWxsYmFja3MuXG4gICAqIEB1cmwgaHR0cDovL2RvY3MubWV0ZW9yLmNvbS9hcGkvY29sbGVjdGlvbnMuaHRtbCNNb25nby1DdXJzb3Itb2JzZXJ2ZUNoYW5nZXNcbiAgICogQHJldHVybnMge09iamVjdH0gLSBsaXZlIHF1ZXJ5IGhhbmRsZVxuICAgKi9cbiAgb2JzZXJ2ZUNoYW5nZXMoY2FsbGJhY2tzKSB7XG4gICAgdGhpcy5fY29sbGVjdGlvbi5fZGVidWcoJ1tGaWxlc0NvbGxlY3Rpb25dIFtGaWxlc0N1cnNvcl0gW29ic2VydmVDaGFuZ2VzKCldJyk7XG4gICAgcmV0dXJuIHRoaXMuY3Vyc29yLm9ic2VydmVDaGFuZ2VzKGNhbGxiYWNrcyk7XG4gIH1cbn1cbiIsImltcG9ydCB7IGNoZWNrIH0gZnJvbSAnbWV0ZW9yL2NoZWNrJztcblxuY29uc3QgaGVscGVycyA9IHtcbiAgaXNVbmRlZmluZWQob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdm9pZCAwO1xuICB9LFxuICBpc09iamVjdChvYmopIHtcbiAgICBpZiAodGhpcy5pc0FycmF5KG9iaikgfHwgdGhpcy5pc0Z1bmN0aW9uKG9iaikpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIG9iaiA9PT0gT2JqZWN0KG9iaik7XG4gIH0sXG4gIGlzQXJyYXkob2JqKSB7XG4gICAgcmV0dXJuIEFycmF5LmlzQXJyYXkob2JqKTtcbiAgfSxcbiAgaXNCb29sZWFuKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHRydWUgfHwgb2JqID09PSBmYWxzZSB8fCBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xuICB9LFxuICBpc0Z1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnZnVuY3Rpb24nIHx8IGZhbHNlO1xuICB9LFxuICBpc0VtcHR5KG9iaikge1xuICAgIGlmICh0aGlzLmlzRGF0ZShvYmopKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICh0aGlzLmlzT2JqZWN0KG9iaikpIHtcbiAgICAgIHJldHVybiAhT2JqZWN0LmtleXMob2JqKS5sZW5ndGg7XG4gICAgfVxuICAgIGlmICh0aGlzLmlzQXJyYXkob2JqKSB8fCB0aGlzLmlzU3RyaW5nKG9iaikpIHtcbiAgICAgIHJldHVybiAhb2JqLmxlbmd0aDtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuICBjbG9uZShvYmopIHtcbiAgICBpZiAoIXRoaXMuaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgICByZXR1cm4gdGhpcy5pc0FycmF5KG9iaikgPyBvYmouc2xpY2UoKSA6IE9iamVjdC5hc3NpZ24oe30sIG9iaik7XG4gIH0sXG4gIGhhcyhfb2JqLCBwYXRoKSB7XG4gICAgbGV0IG9iaiA9IF9vYmo7XG4gICAgaWYgKCF0aGlzLmlzT2JqZWN0KG9iaikpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmlzQXJyYXkocGF0aCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmlzT2JqZWN0KG9iaikgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcGF0aCk7XG4gICAgfVxuXG4gICAgY29uc3QgbGVuZ3RoID0gcGF0aC5sZW5ndGg7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwYXRoW2ldKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBvYmogPSBvYmpbcGF0aFtpXV07XG4gICAgfVxuICAgIHJldHVybiAhIWxlbmd0aDtcbiAgfSxcbiAgb21pdChvYmosIC4uLmtleXMpIHtcbiAgICBjb25zdCBjbGVhciA9IE9iamVjdC5hc3NpZ24oe30sIG9iaik7XG4gICAgZm9yIChsZXQgaSA9IGtleXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIGRlbGV0ZSBjbGVhcltrZXlzW2ldXTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2xlYXI7XG4gIH0sXG4gIG5vdzogRGF0ZS5ub3csXG4gIHRocm90dGxlKGZ1bmMsIHdhaXQsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBwcmV2aW91cyA9IDA7XG4gICAgbGV0IHRpbWVvdXQgPSBudWxsO1xuICAgIGxldCByZXN1bHQ7XG4gICAgY29uc3QgdGhhdCA9IHRoaXM7XG4gICAgbGV0IHNlbGY7XG4gICAgbGV0IGFyZ3M7XG5cbiAgICBjb25zdCBsYXRlciA9ICgpID0+IHtcbiAgICAgIHByZXZpb3VzID0gb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSA/IDAgOiB0aGF0Lm5vdygpO1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICAgICAgaWYgKCF0aW1lb3V0KSB7XG4gICAgICAgIHNlbGYgPSBhcmdzID0gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgdGhyb3R0bGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgY29uc3Qgbm93ID0gdGhhdC5ub3coKTtcbiAgICAgIGlmICghcHJldmlvdXMgJiYgb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSkgcHJldmlvdXMgPSBub3c7XG4gICAgICBjb25zdCByZW1haW5pbmcgPSB3YWl0IC0gKG5vdyAtIHByZXZpb3VzKTtcbiAgICAgIHNlbGYgPSB0aGlzO1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIGlmIChyZW1haW5pbmcgPD0gMCB8fCByZW1haW5pbmcgPiB3YWl0KSB7XG4gICAgICAgIGlmICh0aW1lb3V0KSB7XG4gICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHByZXZpb3VzID0gbm93O1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICAgICAgICBpZiAoIXRpbWVvdXQpIHtcbiAgICAgICAgICBzZWxmID0gYXJncyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoIXRpbWVvdXQgJiYgb3B0aW9ucy50cmFpbGluZyAhPT0gZmFsc2UpIHtcbiAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHJlbWFpbmluZyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICB0aHJvdHRsZWQuY2FuY2VsID0gKCkgPT4ge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgcHJldmlvdXMgPSAwO1xuICAgICAgdGltZW91dCA9IHNlbGYgPSBhcmdzID0gbnVsbDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHRocm90dGxlZDtcbiAgfVxufTtcblxuY29uc3QgX2hlbHBlcnMgPSBbJ1N0cmluZycsICdOdW1iZXInLCAnRGF0ZSddO1xuZm9yIChsZXQgaSA9IDA7IGkgPCBfaGVscGVycy5sZW5ndGg7IGkrKykge1xuICBoZWxwZXJzWydpcycgKyBfaGVscGVyc1tpXV0gPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCAnICsgX2hlbHBlcnNbaV0gKyAnXSc7XG4gIH07XG59XG5cbi8qXG4gKiBAY29uc3Qge0Z1bmN0aW9ufSBmaXhKU09OUGFyc2UgLSBGaXggaXNzdWUgd2l0aCBEYXRlIHBhcnNlXG4gKi9cbmNvbnN0IGZpeEpTT05QYXJzZSA9IGZ1bmN0aW9uKG9iaikge1xuICBmb3IgKGxldCBrZXkgaW4gb2JqKSB7XG4gICAgaWYgKGhlbHBlcnMuaXNTdHJpbmcob2JqW2tleV0pICYmICEhfm9ialtrZXldLmluZGV4T2YoJz0tLUpTT04tREFURS0tPScpKSB7XG4gICAgICBvYmpba2V5XSA9IG9ialtrZXldLnJlcGxhY2UoJz0tLUpTT04tREFURS0tPScsICcnKTtcbiAgICAgIG9ialtrZXldID0gbmV3IERhdGUocGFyc2VJbnQob2JqW2tleV0pKTtcbiAgICB9IGVsc2UgaWYgKGhlbHBlcnMuaXNPYmplY3Qob2JqW2tleV0pKSB7XG4gICAgICBvYmpba2V5XSA9IGZpeEpTT05QYXJzZShvYmpba2V5XSk7XG4gICAgfSBlbHNlIGlmIChoZWxwZXJzLmlzQXJyYXkob2JqW2tleV0pKSB7XG4gICAgICBsZXQgdjtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb2JqW2tleV0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdiA9IG9ialtrZXldW2ldO1xuICAgICAgICBpZiAoaGVscGVycy5pc09iamVjdCh2KSkge1xuICAgICAgICAgIG9ialtrZXldW2ldID0gZml4SlNPTlBhcnNlKHYpO1xuICAgICAgICB9IGVsc2UgaWYgKGhlbHBlcnMuaXNTdHJpbmcodikgJiYgISF+di5pbmRleE9mKCc9LS1KU09OLURBVEUtLT0nKSkge1xuICAgICAgICAgIHYgPSB2LnJlcGxhY2UoJz0tLUpTT04tREFURS0tPScsICcnKTtcbiAgICAgICAgICBvYmpba2V5XVtpXSA9IG5ldyBEYXRlKHBhcnNlSW50KHYpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gb2JqO1xufTtcblxuLypcbiAqIEBjb25zdCB7RnVuY3Rpb259IGZpeEpTT05TdHJpbmdpZnkgLSBGaXggaXNzdWUgd2l0aCBEYXRlIHN0cmluZ2lmeVxuICovXG5jb25zdCBmaXhKU09OU3RyaW5naWZ5ID0gZnVuY3Rpb24ob2JqKSB7XG4gIGZvciAobGV0IGtleSBpbiBvYmopIHtcbiAgICBpZiAoaGVscGVycy5pc0RhdGUob2JqW2tleV0pKSB7XG4gICAgICBvYmpba2V5XSA9IGA9LS1KU09OLURBVEUtLT0keytvYmpba2V5XX1gO1xuICAgIH0gZWxzZSBpZiAoaGVscGVycy5pc09iamVjdChvYmpba2V5XSkpIHtcbiAgICAgIG9ialtrZXldID0gZml4SlNPTlN0cmluZ2lmeShvYmpba2V5XSk7XG4gICAgfSBlbHNlIGlmIChoZWxwZXJzLmlzQXJyYXkob2JqW2tleV0pKSB7XG4gICAgICBsZXQgdjtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb2JqW2tleV0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdiA9IG9ialtrZXldW2ldO1xuICAgICAgICBpZiAoaGVscGVycy5pc09iamVjdCh2KSkge1xuICAgICAgICAgIG9ialtrZXldW2ldID0gZml4SlNPTlN0cmluZ2lmeSh2KTtcbiAgICAgICAgfSBlbHNlIGlmIChoZWxwZXJzLmlzRGF0ZSh2KSkge1xuICAgICAgICAgIG9ialtrZXldW2ldID0gYD0tLUpTT04tREFURS0tPSR7K3Z9YDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gb2JqO1xufTtcblxuLypcbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQHByaXZhdGVcbiAqIEBuYW1lIGZvcm1hdEZsZVVSTFxuICogQHBhcmFtIHtPYmplY3R9IGZpbGVSZWYgLSBGaWxlIHJlZmVyZW5jZSBvYmplY3RcbiAqIEBwYXJhbSB7U3RyaW5nfSB2ZXJzaW9uIC0gW09wdGlvbmFsXSBWZXJzaW9uIG9mIGZpbGUgeW91IHdvdWxkIGxpa2UgYnVpbGQgVVJMIGZvclxuICogQHBhcmFtIHtTdHJpbmd9IFVSSUJhc2UgLSBbT3B0aW9uYWxdIFVSSSBiYXNlLCBzZWUgLSBodHRwczovL2dpdGh1Yi5jb20vVmVsaW92R3JvdXAvTWV0ZW9yLUZpbGVzL2lzc3Vlcy82MjZcbiAqIEBzdW1tYXJ5IFJldHVybnMgZm9ybWF0dGVkIFVSTCBmb3IgZmlsZVxuICogQHJldHVybnMge1N0cmluZ30gRG93bmxvYWRhYmxlIGxpbmtcbiAqL1xuY29uc3QgZm9ybWF0RmxlVVJMID0gKGZpbGVSZWYsIHZlcnNpb24gPSAnb3JpZ2luYWwnLCBfVVJJQmFzZSA9IChfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIHx8IHt9KS5ST09UX1VSTCkgPT4ge1xuICBjaGVjayhmaWxlUmVmLCBPYmplY3QpO1xuICBjaGVjayh2ZXJzaW9uLCBTdHJpbmcpO1xuICBsZXQgVVJJQmFzZSA9IF9VUklCYXNlO1xuXG4gIGlmICghaGVscGVycy5pc1N0cmluZyhVUklCYXNlKSkge1xuICAgIFVSSUJhc2UgPSAoX19tZXRlb3JfcnVudGltZV9jb25maWdfXyB8fCB7fSkuUk9PVF9VUkwgfHwgJy8nO1xuICB9XG5cbiAgY29uc3QgX3Jvb3QgPSBVUklCYXNlLnJlcGxhY2UoL1xcLyskLywgJycpO1xuICBjb25zdCB2UmVmID0gKGZpbGVSZWYudmVyc2lvbnMgJiYgZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXSkgfHwgZmlsZVJlZiB8fCB7fTtcblxuICBsZXQgZXh0O1xuICBpZiAoaGVscGVycy5pc1N0cmluZyh2UmVmLmV4dGVuc2lvbikpIHtcbiAgICBleHQgPSBgLiR7dlJlZi5leHRlbnNpb24ucmVwbGFjZSgvXlxcLi8sICcnKX1gO1xuICB9IGVsc2Uge1xuICAgIGV4dCA9ICcnO1xuICB9XG5cbiAgaWYgKGZpbGVSZWYucHVibGljID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIF9yb290ICsgKHZlcnNpb24gPT09ICdvcmlnaW5hbCcgPyBgJHtmaWxlUmVmLl9kb3dubG9hZFJvdXRlfS8ke2ZpbGVSZWYuX2lkfSR7ZXh0fWAgOiBgJHtmaWxlUmVmLl9kb3dubG9hZFJvdXRlfS8ke3ZlcnNpb259LSR7ZmlsZVJlZi5faWR9JHtleHR9YCk7XG4gIH1cbiAgcmV0dXJuIF9yb290ICsgYCR7ZmlsZVJlZi5fZG93bmxvYWRSb3V0ZX0vJHtmaWxlUmVmLl9jb2xsZWN0aW9uTmFtZX0vJHtmaWxlUmVmLl9pZH0vJHt2ZXJzaW9ufS8ke2ZpbGVSZWYuX2lkfSR7ZXh0fWA7XG59O1xuXG5leHBvcnQgeyBmaXhKU09OUGFyc2UsIGZpeEpTT05TdHJpbmdpZnksIGZvcm1hdEZsZVVSTCwgaGVscGVycyB9O1xuIiwiaW1wb3J0IGZzICAgICAgICAgIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7IE1ldGVvciB9ICBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IGhlbHBlcnMgfSBmcm9tICcuL2xpYi5qcyc7XG5jb25zdCBOT09QID0gKCkgPT4ge307XG5cbi8qXG4gKiBAY29uc3Qge09iamVjdH0gYm91bmQgICAtIE1ldGVvci5iaW5kRW52aXJvbm1lbnQgKEZpYmVyIHdyYXBwZXIpXG4gKiBAY29uc3Qge09iamVjdH0gZmRDYWNoZSAtIEZpbGUgRGVzY3JpcHRvcnMgQ2FjaGVcbiAqL1xuY29uc3QgYm91bmQgICA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoY2FsbGJhY2sgPT4gY2FsbGJhY2soKSk7XG5jb25zdCBmZENhY2hlID0ge307XG5cbi8qXG4gKiBAcHJpdmF0ZVxuICogQGxvY3VzIFNlcnZlclxuICogQGNsYXNzIFdyaXRlU3RyZWFtXG4gKiBAcGFyYW0gcGF0aCAgICAgIHtTdHJpbmd9IC0gUGF0aCB0byBmaWxlIG9uIEZTXG4gKiBAcGFyYW0gbWF4TGVuZ3RoIHtOdW1iZXJ9IC0gTWF4IGFtb3VudCBvZiBjaHVua3MgaW4gc3RyZWFtXG4gKiBAcGFyYW0gZmlsZSAgICAgIHtPYmplY3R9IC0gZmlsZVJlZiBPYmplY3RcbiAqIEBzdW1tYXJ5IHdyaXRhYmxlU3RyZWFtIHdyYXBwZXIgY2xhc3MsIG1ha2VzIHN1cmUgY2h1bmtzIGlzIHdyaXR0ZW4gaW4gZ2l2ZW4gb3JkZXIuIEltcGxlbWVudGF0aW9uIG9mIHF1ZXVlIHN0cmVhbS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgV3JpdGVTdHJlYW0ge1xuICBjb25zdHJ1Y3RvcihwYXRoLCBtYXhMZW5ndGgsIGZpbGUsIHBlcm1pc3Npb25zKSB7XG4gICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgICB0aGlzLm1heExlbmd0aCA9IG1heExlbmd0aDtcbiAgICB0aGlzLmZpbGUgPSBmaWxlO1xuICAgIHRoaXMucGVybWlzc2lvbnMgPSBwZXJtaXNzaW9ucztcbiAgICBpZiAoIXRoaXMucGF0aCB8fCAhaGVscGVycy5pc1N0cmluZyh0aGlzLnBhdGgpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5mZCAgICAgICAgICAgID0gbnVsbDtcbiAgICB0aGlzLndyaXR0ZW5DaHVua3MgPSAwO1xuICAgIHRoaXMuZW5kZWQgICAgICAgICA9IGZhbHNlO1xuICAgIHRoaXMuYWJvcnRlZCAgICAgICA9IGZhbHNlO1xuXG4gICAgaWYgKGZkQ2FjaGVbdGhpcy5wYXRoXSAmJiAhZmRDYWNoZVt0aGlzLnBhdGhdLmVuZGVkICYmICFmZENhY2hlW3RoaXMucGF0aF0uYWJvcnRlZCkge1xuICAgICAgdGhpcy5mZCA9IGZkQ2FjaGVbdGhpcy5wYXRoXS5mZDtcbiAgICAgIHRoaXMud3JpdHRlbkNodW5rcyA9IGZkQ2FjaGVbdGhpcy5wYXRoXS53cml0dGVuQ2h1bmtzO1xuICAgIH0gZWxzZSB7XG4gICAgICBmcy5lbnN1cmVGaWxlKHRoaXMucGF0aCwgKGVmRXJyb3IpID0+IHtcbiAgICAgICAgYm91bmQoKCkgPT4ge1xuICAgICAgICAgIGlmIChlZkVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLmFib3J0KCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDUwMCwgJ1tGaWxlc0NvbGxlY3Rpb25dIFt3cml0ZVN0cmVhbV0gW2Vuc3VyZUZpbGVdIFtFcnJvcjpdICcgKyBlZkVycm9yKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnMub3Blbih0aGlzLnBhdGgsICdyKycsIHRoaXMucGVybWlzc2lvbnMsIChvRXJyb3IsIGZkKSA9PiB7XG4gICAgICAgICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAob0Vycm9yKSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLmFib3J0KCk7XG4gICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDUwMCwgJ1tGaWxlc0NvbGxlY3Rpb25dIFt3cml0ZVN0cmVhbV0gW2Vuc3VyZUZpbGVdIFtvcGVuXSBbRXJyb3I6XSAnICsgb0Vycm9yKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgdGhpcy5mZCA9IGZkO1xuICAgICAgICAgICAgICAgICAgZmRDYWNoZVt0aGlzLnBhdGhdID0gdGhpcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qXG4gICAqIEBtZW1iZXJPZiB3cml0ZVN0cmVhbVxuICAgKiBAbmFtZSB3cml0ZVxuICAgKiBAcGFyYW0ge051bWJlcn0gbnVtIC0gQ2h1bmsgcG9zaXRpb24gaW4gYSBzdHJlYW1cbiAgICogQHBhcmFtIHtCdWZmZXJ9IGNodW5rIC0gQnVmZmVyIChjaHVuayBiaW5hcnkgZGF0YSlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFja1xuICAgKiBAc3VtbWFyeSBXcml0ZSBjaHVuayBpbiBnaXZlbiBvcmRlclxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gLSBUcnVlIGlmIGNodW5rIGlzIHNlbnQgdG8gc3RyZWFtLCBmYWxzZSBpZiBjaHVuayBpcyBzZXQgaW50byBxdWV1ZVxuICAgKi9cbiAgd3JpdGUobnVtLCBjaHVuaywgY2FsbGJhY2spIHtcbiAgICBpZiAoIXRoaXMuYWJvcnRlZCAmJiAhdGhpcy5lbmRlZCkge1xuICAgICAgaWYgKHRoaXMuZmQpIHtcbiAgICAgICAgZnMud3JpdGUodGhpcy5mZCwgY2h1bmssIDAsIGNodW5rLmxlbmd0aCwgKG51bSAtIDEpICogdGhpcy5maWxlLmNodW5rU2l6ZSwgKGVycm9yLCB3cml0dGVuLCBidWZmZXIpID0+IHtcbiAgICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhlcnJvciwgd3JpdHRlbiwgYnVmZmVyKTtcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tGaWxlc0NvbGxlY3Rpb25dIFt3cml0ZVN0cmVhbV0gW3dyaXRlXSBbRXJyb3I6XScsIGVycm9yKTtcbiAgICAgICAgICAgICAgdGhpcy5hYm9ydCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgKyt0aGlzLndyaXR0ZW5DaHVua3M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgTWV0ZW9yLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMud3JpdGUobnVtLCBjaHVuaywgY2FsbGJhY2spO1xuICAgICAgICB9LCAyNSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qXG4gICAqIEBtZW1iZXJPZiB3cml0ZVN0cmVhbVxuICAgKiBAbmFtZSBlbmRcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFja1xuICAgKiBAc3VtbWFyeSBGaW5pc2hlcyB3cml0aW5nIHRvIHdyaXRhYmxlU3RyZWFtLCBvbmx5IGFmdGVyIGFsbCBjaHVua3MgaW4gcXVldWUgaXMgd3JpdHRlblxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gLSBUcnVlIGlmIHN0cmVhbSBpcyBmdWxmaWxsZWQsIGZhbHNlIGlmIHF1ZXVlIGlzIGluIHByb2dyZXNzXG4gICAqL1xuICBlbmQoY2FsbGJhY2spIHtcbiAgICBpZiAoIXRoaXMuYWJvcnRlZCAmJiAhdGhpcy5lbmRlZCkge1xuICAgICAgaWYgKHRoaXMud3JpdHRlbkNodW5rcyA9PT0gdGhpcy5tYXhMZW5ndGgpIHtcbiAgICAgICAgZnMuY2xvc2UodGhpcy5mZCwgKCkgPT4ge1xuICAgICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAgIGRlbGV0ZSBmZENhY2hlW3RoaXMucGF0aF07XG4gICAgICAgICAgICB0aGlzLmVuZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKHZvaWQgMCwgdHJ1ZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgZnMuc3RhdCh0aGlzLnBhdGgsIChlcnJvciwgc3RhdCkgPT4ge1xuICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgaWYgKCFlcnJvciAmJiBzdGF0KSB7XG4gICAgICAgICAgICB0aGlzLndyaXR0ZW5DaHVua3MgPSBNYXRoLmNlaWwoc3RhdC5zaXplIC8gdGhpcy5maWxlLmNodW5rU2l6ZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIE1ldGVvci5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZW5kKGNhbGxiYWNrKTtcbiAgICAgICAgICB9LCAyNSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKHZvaWQgMCwgdGhpcy5lbmRlZCk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qXG4gICAqIEBtZW1iZXJPZiB3cml0ZVN0cmVhbVxuICAgKiBAbmFtZSBhYm9ydFxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrXG4gICAqIEBzdW1tYXJ5IEFib3J0cyB3cml0aW5nIHRvIHdyaXRhYmxlU3RyZWFtLCByZW1vdmVzIGNyZWF0ZWQgZmlsZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gLSBUcnVlXG4gICAqL1xuICBhYm9ydChjYWxsYmFjaykge1xuICAgIHRoaXMuYWJvcnRlZCA9IHRydWU7XG4gICAgZGVsZXRlIGZkQ2FjaGVbdGhpcy5wYXRoXTtcbiAgICBmcy51bmxpbmsodGhpcy5wYXRoLCAoY2FsbGJhY2sgfHwgTk9PUCkpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLypcbiAgICogQG1lbWJlck9mIHdyaXRlU3RyZWFtXG4gICAqIEBuYW1lIHN0b3BcbiAgICogQHN1bW1hcnkgU3RvcCB3cml0aW5nIHRvIHdyaXRhYmxlU3RyZWFtXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSAtIFRydWVcbiAgICovXG4gIHN0b3AoKSB7XG4gICAgdGhpcy5hYm9ydGVkID0gdHJ1ZTtcbiAgICBkZWxldGUgZmRDYWNoZVt0aGlzLnBhdGhdO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59XG4iXX0=
