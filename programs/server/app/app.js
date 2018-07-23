var require = meteorInstall({"imports":{"lib":{"core.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// imports/lib/core.js                                                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  _app: () => _app,
  Collections: () => Collections
});
module.watch(require("./routes.js"));
const Collections = {};
const _app = {
  NOOP() {},

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

  pick(obj, ...keys) {
    return Object.assign({}, ...keys.map(key => ({
      [key]: obj[key]
    })));
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
      if (!timeout) self = args = null;
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
        if (!timeout) self = args = null;
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
const helpers = ['String', 'Number', 'Date'];

for (let i = 0; i < helpers.length; i++) {
  _app['is' + helpers[i]] = function (obj) {
    return Object.prototype.toString.call(obj) === '[object ' + helpers[i] + ']';
  };
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"routes.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// imports/lib/routes.js                                                                                              //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let FlowRouter;
module.watch(require("meteor/ostrio:flow-router-extra"), {
  FlowRouter(v) {
    FlowRouter = v;
  }

}, 1);

let _app, Collections;

module.watch(require("/imports/lib/core.js"), {
  _app(v) {
    _app = v;
  },

  Collections(v) {
    Collections = v;
  }

}, 2);
FlowRouter.route('/', {
  name: 'index',

  action() {
    this.render('_layout', 'index');
  },

  waitOn() {
    if (Meteor.isClient) {
      return [_app.subs.subscribe('latest', 10, _app.userOnly.get()), module.dynamicImport('/imports/client/index/index.js')];
    }
  },

  whileWaiting() {
    this.render('_layout', '_loading');
  },

  subscriptions() {
    if (Meteor.isServer) {
      this.register('latest', Meteor.subscribe('latest', 10, false));
    }
  },

  fastRender: true
});
FlowRouter.route('/login', {
  name: 'login',

  title() {
    if (Meteor.userId()) {
      return 'Your account settings';
    }

    return 'Login into Meteor Files';
  },

  meta: {
    keywords: {
      name: 'keywords',
      itemprop: 'keywords',
      content: 'private, unlisted, files, upload, meteor, open source, javascript'
    },
    description: {
      name: 'description',
      itemprop: 'description',
      property: 'og:description',
      content: 'Login into Meteor files. After you logged in you can make files private and unlisted'
    },
    'twitter:description': 'Login into Meteor files. After you logged in you can make files private and unlisted'
  },

  action() {
    this.render('_layout', 'login');
  },

  waitOn() {
    return module.dynamicImport('/imports/client/user-account/login.js');
  },

  whileWaiting() {
    this.render('_layout', '_loading');
  }

});
FlowRouter.route('/:_id', {
  name: 'file',

  title(params, queryParams, file) {
    if (file) {
      return 'View File: ' + file.get('name');
    }

    return '404: Page not found';
  },

  meta(params, queryParams, file) {
    return {
      keywords: {
        name: 'keywords',
        itemprop: 'keywords',
        content: file ? 'file, view, preview, uploaded, shared, ' + file.get('name') + ', ' + file.get('extension') + ', ' + file.get('type') + ', meteor, open source, javascript' : '404, page, not found'
      },
      description: {
        name: 'description',
        itemprop: 'description',
        property: 'og:description',
        content: file ? 'View uploaded and shared file: ' + file.get('name') : '404: No such page'
      },
      'twitter:description': file ? 'View uploaded and shared file: ' + file.get('name') : '404: No such page',
      'og:image': {
        property: 'og:image',
        content: file && file.get('isImage') ? file.link('preview') : Meteor.absoluteUrl('icon_1200x630.png')
      },
      'twitter:image': {
        name: 'twitter:image',
        content: file && file.get('isImage') ? file.link('preview') : Meteor.absoluteUrl('icon_750x560.png')
      }
    };
  },

  link(params, queryParams, file) {
    return {
      image: {
        itemprop: 'image',

        content() {
          if (file && file.get('isImage')) {
            return file.link('preview');
          }

          return Meteor.absoluteUrl('icon_1200x630.png');
        },

        href() {
          if (file && file.get('isImage')) {
            return file.link('preview');
          }

          return Meteor.absoluteUrl('icon_1200x630.png');
        }

      }
    };
  },

  action(params, queryParams, file) {
    if (_app.isObject(file) && !_app.isEmpty(file)) {
      this.render('_layout', 'file', {
        file: file
      });
    }
  },

  waitOn(params) {
    if (Meteor.isClient) {
      return [_app.subs.subscribe('file', params._id), module.dynamicImport('/imports/client/file/file.js')];
    }
  },

  subscriptions(params) {
    if (Meteor.isServer) {
      this.register('file', Meteor.subscribe('file', params._id));
    }
  },

  fastRender: true,

  whileWaiting() {
    this.render('_layout', '_loading');
  },

  onNoData() {
    this.render('_layout', '_404');
  },

  data(params) {
    return Collections.files.findOne(params._id) || false;
  }

}); // 404 route (catch all)

FlowRouter.route('*', {
  action() {
    this.render('_layout', '_404');
  },

  title: '404: Page not found'
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"files.collection.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// imports/server/files.collection.js                                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Random;
module.watch(require("meteor/random"), {
  Random(v) {
    Random = v;
  }

}, 1);
let filesize;
module.watch(require("meteor/mrt:filesize"), {
  filesize(v) {
    filesize = v;
  }

}, 2);
let FilesCollection;
module.watch(require("meteor/ostrio:files"), {
  FilesCollection(v) {
    FilesCollection = v;
  }

}, 3);

let _app, Collections;

module.watch(require("/imports/lib/core.js"), {
  _app(v) {
    _app = v;
  },

  Collections(v) {
    Collections = v;
  }

}, 4);
// DropBox usage:
// Read: https://github.com/VeliovGroup/Meteor-Files/wiki/DropBox-Integration
// env.var example: DROPBOX='{"dropbox":{"key": "xxx", "secret": "xxx", "token": "xxx"}}'
let useDropBox = false; // AWS:S3 usage:
// Read: https://github.com/VeliovGroup/Meteor-Files/wiki/AWS-S3-Integration
// env.var example: S3='{"s3":{"key": "xxx", "secret": "xxx", "bucket": "xxx", "region": "xxx""}}'

let useS3 = false;
let client;
let sendToStorage;

const fs = require('fs-extra');

const S3 = require('aws-sdk/clients/s3');

const stream = require('stream');

const request = require('request');

const Dropbox = require('dropbox');

const bound = Meteor.bindEnvironment(callback => {
  return callback();
});

if (process.env.DROPBOX) {
  Meteor.settings.dropbox = JSON.parse(process.env.DROPBOX).dropbox;
} else if (process.env.S3) {
  Meteor.settings.s3 = JSON.parse(process.env.S3).s3;
}

const s3Conf = Meteor.settings.s3 || {};
const dbConf = Meteor.settings.dropbox || {};

if (dbConf && dbConf.key && dbConf.secret && dbConf.token) {
  useDropBox = true;
  client = new Dropbox.Client({
    key: dbConf.key,
    secret: dbConf.secret,
    token: dbConf.token
  });
} else if (s3Conf && s3Conf.key && s3Conf.secret && s3Conf.bucket && s3Conf.region) {
  useS3 = true;
  client = new S3({
    secretAccessKey: s3Conf.secret,
    accessKeyId: s3Conf.key,
    region: s3Conf.region,
    sslEnabled: false,
    httpOptions: {
      timeout: 6000,
      agent: false
    }
  });
}

Collections.files = new FilesCollection({
  // debug: true,
  storagePath: 'assets/app/uploads/uploadedFiles',
  collectionName: 'uploadedFiles',
  allowClientCode: true,

  // disableUpload: true,
  // disableDownload: true,
  protected(fileObj) {
    if (fileObj) {
      if (!(fileObj.meta && fileObj.meta.secured)) {
        return true;
      } else if (fileObj.meta && fileObj.meta.secured === true && this.userId === fileObj.userId) {
        return true;
      }
    }

    return false;
  },

  onBeforeRemove(cursor) {
    const res = cursor.map(file => {
      if (file && file.userId && _app.isString(file.userId)) {
        return file.userId === this.userId;
      }

      return false;
    });
    return !~res.indexOf(false);
  },

  onBeforeUpload() {
    if (this.file.size <= 1024 * 1024 * 128) {
      return true;
    }

    return "Max. file size is 128MB you've tried to upload " + filesize(this.file.size);
  },

  downloadCallback(fileObj) {
    if (this.params && this.params.query && this.params.query.download === 'true') {
      Collections.files.collection.update(fileObj._id, {
        $inc: {
          'meta.downloads': 1
        }
      }, _app.NOOP);
    }

    return true;
  },

  interceptDownload(http, fileRef, version) {
    let path;

    if (useDropBox) {
      path = fileRef && fileRef.versions && fileRef.versions[version] && fileRef.versions[version].meta && fileRef.versions[version].meta.pipeFrom ? fileRef.versions[version].meta.pipeFrom : void 0;

      if (path) {
        // If file is successfully moved to Storage
        // We will pipe request to Storage
        // So, original link will stay always secure
        // To force ?play and ?download parameters
        // and to keep original file name, content-type,
        // content-disposition and cache-control
        // we're using low-level .serve() method
        this.serve(http, fileRef, fileRef.versions[version], version, request({
          url: path,
          headers: _app.pick(http.request.headers, 'range', 'cache-control', 'connection')
        }));
        return true;
      } // While file is not yet uploaded to Storage
      // We will serve file from FS


      return false;
    } else if (useS3) {
      path = fileRef && fileRef.versions && fileRef.versions[version] && fileRef.versions[version].meta && fileRef.versions[version].meta.pipePath ? fileRef.versions[version].meta.pipePath : void 0;

      if (path) {
        // If file is successfully moved to Storage
        // We will pipe request to Storage
        // So, original link will stay always secure
        // To force ?play and ?download parameters
        // and to keep original file name, content-type,
        // content-disposition and cache-control
        // we're using low-level .serve() method
        const opts = {
          Bucket: s3Conf.bucket,
          Key: path
        };

        if (http.request.headers.range) {
          const vRef = fileRef.versions[version];

          let range = _app.clone(http.request.headers.range);

          const array = range.split(/bytes=([0-9]*)-([0-9]*)/);
          const start = parseInt(array[1]);
          let end = parseInt(array[2]);

          if (isNaN(end)) {
            // Request data from AWS:S3 by small chunks
            end = start + this.chunkSize - 1;

            if (end >= vRef.size) {
              end = vRef.size - 1;
            }
          }

          opts.Range = `bytes=${start}-${end}`;
          http.request.headers.range = `bytes=${start}-${end}`;
        }

        const fileColl = this;
        client.getObject(opts, function (error) {
          if (error) {
            console.error(error);

            if (!http.response.finished) {
              http.response.end();
            }
          } else {
            if (http.request.headers.range && this.httpResponse.headers['content-range']) {
              // Set proper range header in according to what is returned from AWS:S3
              http.request.headers.range = this.httpResponse.headers['content-range'].split('/')[0].replace('bytes ', 'bytes=');
            }

            const dataStream = new stream.PassThrough();
            fileColl.serve(http, fileRef, fileRef.versions[version], version, dataStream);
            dataStream.end(this.data.Body);
          }
        });
        return true;
      } // While file is not yet uploaded to Storage
      // We will serve file from FS


      return false;
    }

    return false;
  }

});
Collections.files.denyClient();
Collections.files.on('afterUpload', function (_fileRef) {
  if (useDropBox) {
    const makeUrl = (stat, fileRef, version, triesUrl = 0) => {
      client.makeUrl(stat.path, {
        long: true,
        downloadHack: true
      }, (error, xml) => {
        bound(() => {
          // Store downloadable link in file's meta object
          if (error) {
            if (triesUrl < 10) {
              Meteor.setTimeout(() => {
                makeUrl(stat, fileRef, version, ++triesUrl);
              }, 2048);
            } else {
              console.error(error, {
                triesUrl: triesUrl
              });
            }
          } else if (xml) {
            const upd = {
              $set: {}
            };
            upd.$set[`versions.${version}.meta.pipeFrom`] = xml.url;
            upd.$set[`versions.${version}.meta.pipePath`] = stat.path;
            this.collection.update({
              _id: fileRef._id
            }, upd, updError => {
              if (updError) {
                console.error(updError);
              } else {
                // Unlink original files from FS
                // after successful upload to DropBox
                this.unlink(this.collection.findOne(fileRef._id), version);
              }
            });
          } else {
            if (triesUrl < 10) {
              Meteor.setTimeout(() => {
                // Generate downloadable link
                makeUrl(stat, fileRef, version, ++triesUrl);
              }, 2048);
            } else {
              console.error('client.makeUrl doesn\'t returns xml', {
                triesUrl: triesUrl
              });
            }
          }
        });
      });
    };

    const writeToDB = (fileRef, version, data, triesSend = 0) => {
      // DropBox already uses random URLs
      // No need to use random file names
      client.writeFile(fileRef._id + '-' + version + '.' + fileRef.extension, data, (error, stat) => {
        bound(() => {
          if (error) {
            if (triesSend < 10) {
              Meteor.setTimeout(() => {
                // Write file to DropBox
                writeToDB(fileRef, version, data, ++triesSend);
              }, 2048);
            } else {
              console.error(error, {
                triesSend: triesSend
              });
            }
          } else {
            makeUrl(stat, fileRef, version);
          }
        });
      });
    };

    const readFile = (fileRef, vRef, version, triesRead = 0) => {
      fs.readFile(vRef.path, (error, data) => {
        bound(() => {
          if (error) {
            if (triesRead < 10) {
              readFile(fileRef, vRef, version, ++triesRead);
            } else {
              console.error(error);
            }
          } else {
            writeToDB(fileRef, version, data);
          }
        });
      });
    };

    sendToStorage = fileRef => {
      for (let version in fileRef.versions) {
        if (fileRef.versions[version]) {
          readFile(fileRef, fileRef.versions[version], version);
        }
      }
    };
  } else if (useS3) {
    sendToStorage = fileRef => {
      for (let version in fileRef.versions) {
        if (fileRef.versions[version]) {
          const vRef = fileRef.versions[version]; // We use Random.id() instead of real file's _id
          // to secure files from reverse engineering
          // As after viewing this code it will be easy
          // to get access to unlisted and protected files

          const filePath = 'files/' + Random.id() + '-' + version + '.' + fileRef.extension;
          client.putObject({
            StorageClass: 'STANDARD',
            Bucket: s3Conf.bucket,
            Key: filePath,
            Body: fs.createReadStream(vRef.path),
            ContentType: vRef.type
          }, error => {
            bound(() => {
              if (error) {
                console.error(error);
              } else {
                const upd = {
                  $set: {}
                };
                upd.$set[`versions.${version}.meta.pipePath`] = filePath;
                this.collection.update({
                  _id: fileRef._id
                }, upd, updError => {
                  if (updError) {
                    console.error(updError);
                  } else {
                    // Unlink original file from FS
                    // after successful upload to AWS:S3
                    this.unlink(this.collection.findOne(fileRef._id), version);
                  }
                });
              }
            });
          });
        }
      }
    };
  }

  if (/png|jpe?g/i.test(_fileRef.extension || '')) {
    Meteor.setTimeout(() => {
      _app.createThumbnails(this, _fileRef, error => {
        if (error) {
          console.error(error);
        }

        if (useDropBox || useS3) {
          sendToStorage(this.collection.findOne(_fileRef._id));
        }
      });
    }, 1024);
  } else {
    if (useDropBox || useS3) {
      sendToStorage(_fileRef);
    }
  }
}); // This line now commented due to Heroku usage
// Collections.files.collection._ensureIndex {'meta.expireAt': 1}, {expireAfterSeconds: 0, background: true}
// Intercept FileCollection's remove method
// to remove file from DropBox or AWS S3

if (useDropBox || useS3) {
  const _origRemove = Collections.files.remove;

  Collections.files.remove = function (search) {
    const cursor = this.collection.find(search);
    cursor.forEach(fileRef => {
      for (let version in fileRef.versions) {
        if (fileRef.versions[version]) {
          const vRef = fileRef.versions[version];

          if (vRef && vRef.meta && vRef.meta.pipePath) {
            if (useDropBox) {
              // DropBox usage:
              client.remove(vRef.meta.pipePath, error => {
                bound(() => {
                  if (error) {
                    console.error(error);
                  }
                });
              });
            } else {
              // AWS:S3 usage:
              client.deleteObject({
                Bucket: s3Conf.bucket,
                Key: vRef.meta.pipePath
              }, error => {
                bound(() => {
                  if (error) {
                    console.error(error);
                  }
                });
              });
            }
          }
        }
      }
    }); // Call original method

    _origRemove.call(this, search);
  };
} // Remove all files on server load/reload, useful while testing/development
// Meteor.startup -> Collections.files.remove {}
// Remove files along with MongoDB records two minutes before expiration date
// If we have 'expireAfterSeconds' index on 'meta.expireAt' field,
// it won't remove files themselves.


Meteor.setInterval(() => {
  Collections.files.remove({
    'meta.expireAt': {
      $lte: new Date(+new Date() + 120000)
    }
  }, _app.NOOP);
}, 120000);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"image-processing.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// imports/server/image-processing.js                                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let _app;

module.watch(require("/imports/lib/core.js"), {
  _app(v) {
    _app = v;
  }

}, 0);
let check;
module.watch(require("meteor/check"), {
  check(v) {
    check = v;
  }

}, 1);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 2);
let fs;
module.watch(require("fs-extra"), {
  default(v) {
    fs = v;
  }

}, 3);
let gm;
module.watch(require("gm"), {
  default(v) {
    gm = v;
  }

}, 4);
//Some platforms may bundle ImageMagick into their tools (like Heroku). In this case you may use GraphicsMagick as Imagemagick in this way:
//npm install gm --save and then where you use it:
//const gm = require('gm');
//const im = gm.subClass({ imageMagick: true });
//Please note that GM was considered slightly faster than IM so before you chose convenience over performance read the latest news about it.
//https://mazira.com/blog/comparing-speed-imagemagick-graphicsmagick
const bound = Meteor.bindEnvironment(callback => {
  return callback();
});

_app.createThumbnails = (collection, fileRef, cb) => {
  check(fileRef, Object);
  let isLast = false;

  const finish = error => {
    bound(() => {
      if (error) {
        console.error('[_app.createThumbnails] [finish]', error);
        cb && cb(error);
      } else {
        if (isLast) {
          cb && cb(void 0, fileRef);
        }
      }

      return true;
    });
  };

  fs.exists(fileRef.path, exists => {
    bound(() => {
      if (!exists) {
        throw new Meteor.Error('File ' + fileRef.path + ' not found in [createThumbnails] Method');
      }

      const image = gm(fileRef.path);
      const sizes = {
        preview: {
          width: 400
        },
        thumbnail40: {
          width: 40,
          square: true
        }
      };
      image.size((error, features) => {
        bound(() => {
          if (error) {
            console.error('[_app.createThumbnails] [forEach sizes]', error);
            finish(new Meteor.Error('[_app.createThumbnails] [forEach sizes]', error));
            return;
          }

          let i = 0;
          collection.collection.update(fileRef._id, {
            $set: {
              'meta.width': features.width,
              'meta.height': features.height,
              'versions.original.meta.width': features.width,
              'versions.original.meta.height': features.height
            }
          }, _app.NOOP);
          Object.keys(sizes).forEach(name => {
            const size = sizes[name];
            const path = collection.storagePath(fileRef) + '/' + name + '-' + fileRef._id + '.' + fileRef.extension;

            const copyPaste = () => {
              fs.copy(fileRef.path, path, fsCopyError => {
                bound(() => {
                  if (fsCopyError) {
                    console.error('[_app.createThumbnails] [forEach sizes] [fs.copy]', fsCopyError);
                    finish(fsCopyError);
                    return;
                  }

                  const upd = {
                    $set: {}
                  };
                  upd.$set[`versions.${name}`] = {
                    path: path,
                    size: fileRef.size,
                    type: fileRef.type,
                    extension: fileRef.extension,
                    meta: {
                      width: features.width,
                      height: features.height
                    }
                  };
                  collection.collection.update(fileRef._id, upd, colUpdError => {
                    ++i;

                    if (i === Object.keys(sizes).length) {
                      isLast = true;
                    }

                    finish(colUpdError);
                  });
                });
              });
            };

            if (/png|jpe?g/i.test(fileRef.extension)) {
              const img = gm(fileRef.path).quality(70).define('filter:support=2').define('jpeg:fancy-upsampling=false').define('jpeg:fancy-upsampling=off').define('png:compression-filter=5').define('png:compression-level=9').define('png:compression-strategy=1').define('png:exclude-chunk=all').autoOrient().noProfile().strip().dither(false).interlace('Line').filter('Triangle');

              const updateAndSave = upNSaveError => {
                bound(() => {
                  if (upNSaveError) {
                    console.error('[_app.createThumbnails] [forEach sizes] [img.resize]', upNSaveError);
                    finish(upNSaveError);
                    return;
                  }

                  fs.stat(path, (fsStatError, stat) => {
                    bound(() => {
                      if (fsStatError) {
                        console.error('[_app.createThumbnails] [forEach sizes] [img.resize] [fs.stat]', fsStatError);
                        finish(fsStatError);
                        return;
                      }

                      gm(path).size((gmSizeError, imgInfo) => {
                        bound(() => {
                          if (gmSizeError) {
                            console.error('[_app.createThumbnails] [forEach sizes] [img.resize] [fs.stat] [gm(path).size]', gmSizeError);
                            finish(gmSizeError);
                            return;
                          }

                          const upd = {
                            $set: {}
                          };
                          upd.$set[`versions.${name}`] = {
                            path: path,
                            size: stat.size,
                            type: fileRef.type,
                            extension: fileRef.extension,
                            name: fileRef.name,
                            meta: {
                              width: imgInfo.width,
                              height: imgInfo.height
                            }
                          };
                          collection.collection.update(fileRef._id, upd, colUpdError => {
                            ++i;

                            if (i === Object.keys(sizes).length) {
                              isLast = true;
                            }

                            finish(colUpdError);
                          });
                        });
                      });
                    });
                  });
                });
              };

              if (!size.square) {
                if (features.width > size.width) {
                  img.resize(size.width).interlace('Line').write(path, updateAndSave);
                } else {
                  copyPaste();
                }
              } else {
                let x = 0;
                let y = 0;
                const widthRatio = features.width / size.width;
                const heightRatio = features.height / size.width;
                let widthNew = size.width;
                let heightNew = size.width;

                if (heightRatio < widthRatio) {
                  widthNew = size.width * features.width / features.height;
                  x = (widthNew - size.width) / 2;
                }

                if (heightRatio > widthRatio) {
                  heightNew = size.width * features.height / features.width;
                  y = (heightNew - size.width) / 2;
                }

                img.resize(widthNew, heightNew).crop(size.width, size.width, x, y).interlace('Line').write(path, updateAndSave);
              }
            } else {
              copyPaste();
            }
          });
        });
      });
    });
  });
  return true;
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"methods.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// imports/server/methods.js                                                                                          //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let check;
module.watch(require("meteor/check"), {
  check(v) {
    check = v;
  }

}, 0);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 1);

let _app, Collections;

module.watch(require("/imports/lib/core.js"), {
  _app(v) {
    _app = v;
  },

  Collections(v) {
    Collections = v;
  }

}, 2);
Meteor.methods({
  filesLenght(userOnly = false) {
    check(userOnly, Boolean);
    let selector;

    if (userOnly && this.userId) {
      selector = {
        userId: this.userId
      };
    } else if (this.userId) {
      selector = {
        $or: [{
          'meta.unlisted': false,
          'meta.secured': false,
          'meta.blamed': {
            $lt: 3
          }
        }, {
          userId: this.userId,
          'meta.blamed': {
            $lt: 3
          }
        }]
      };
    } else {
      selector = {
        'meta.unlisted': false,
        'meta.secured': false,
        'meta.blamed': {
          $lt: 3
        }
      };
    }

    return Collections.files.find(selector).count();
  },

  unblame(_id) {
    check(_id, String);
    Collections.files.update({
      _id: _id
    }, {
      $inc: {
        'meta.blamed': -1
      }
    }, _app.NOOP);
    return true;
  },

  blame(_id) {
    check(_id, String);
    Collections.files.update({
      _id: _id
    }, {
      $inc: {
        'meta.blamed': 1
      }
    }, _app.NOOP);
    return true;
  },

  changeAccess(_id) {
    check(_id, String);

    if (Meteor.userId()) {
      const file = Collections.files.findOne({
        _id: _id,
        userId: Meteor.userId()
      });

      if (file) {
        Collections.files.update(_id, {
          $set: {
            'meta.unlisted': file.meta.unlisted ? false : true
          }
        }, _app.NOOP);
        return true;
      }
    }

    throw new Meteor.Error(401, 'Access denied!');
  },

  changePrivacy(_id) {
    check(_id, String);

    if (Meteor.userId()) {
      const file = Collections.files.findOne({
        _id: _id,
        userId: Meteor.userId()
      });

      if (file) {
        Collections.files.update(_id, {
          $set: {
            'meta.unlisted': true,
            'meta.secured': file.meta.secured ? false : true
          }
        }, _app.NOOP);
        return true;
      }
    }

    throw new Meteor.Error(401, 'Access denied!');
  },

  getServiceConfiguration() {
    return _app.sc;
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// imports/server/publications.js                                                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let check;
module.watch(require("meteor/check"), {
  check(v) {
    check = v;
  }

}, 0);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 1);
let Collections;
module.watch(require("/imports/lib/core.js"), {
  Collections(v) {
    Collections = v;
  }

}, 2);
Meteor.publish('latest', function (take = 10, userOnly = false) {
  check(take, Number);
  check(userOnly, Boolean);
  let selector;

  if (userOnly && this.userId) {
    selector = {
      userId: this.userId
    };
  } else if (this.userId) {
    selector = {
      $or: [{
        'meta.unlisted': false,
        'meta.secured': false,
        'meta.blamed': {
          $lt: 3
        }
      }, {
        userId: this.userId,
        'meta.blamed': {
          $lt: 3
        }
      }]
    };
  } else {
    selector = {
      'meta.unlisted': false,
      'meta.secured': false,
      'meta.blamed': {
        $lt: 3
      }
    };
  }

  return Collections.files.find(selector, {
    limit: take,
    sort: {
      'meta.created_at': -1
    },
    fields: {
      _id: 1,
      name: 1,
      size: 1,
      meta: 1,
      type: 1,
      isPDF: 1,
      isText: 1,
      isJSON: 1,
      isVideo: 1,
      isAudio: 1,
      isImage: 1,
      userId: 1,
      'versions.thumbnail40.extension': 1,
      'versions.preview.extension': 1,
      extension: 1,
      _collectionName: 1,
      _downloadRoute: 1
    }
  }).cursor;
});
Meteor.publish('file', function (_id) {
  check(_id, String);
  let selector = {
    _id: _id,
    'meta.secured': false
  };

  if (this.userId) {
    selector = {
      $or: [selector, {
        _id: _id,
        'meta.secured': true,
        userId: this.userId
      }]
    };
  }

  return Collections.files.find(selector, {
    fields: {
      _id: 1,
      name: 1,
      size: 1,
      type: 1,
      meta: 1,
      isPDF: 1,
      isText: 1,
      isJSON: 1,
      isVideo: 1,
      isAudio: 1,
      isImage: 1,
      extension: 1,
      'versions.thumbnail40.extension': 1,
      'versions.preview.extension': 1,
      _collectionName: 1,
      _downloadRoute: 1
    }
  }).cursor;
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"service-configurations.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// imports/server/service-configurations.js                                                                           //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let _app;

module.watch(require("/imports/lib/core.js"), {
  _app(v) {
    _app = v;
  }

}, 0);
let ServiceConfiguration;
module.watch(require("meteor/service-configuration"), {
  ServiceConfiguration(v) {
    ServiceConfiguration = v;
  }

}, 1);
_app.sc = {};
ServiceConfiguration.configurations.remove({});

if (process.env.ACCOUNTS_METEOR_ID && process.env.ACCOUNTS_METEOR_SEC) {
  _app.sc.meteor = true;
  ServiceConfiguration.configurations.upsert({
    service: 'meteor-developer'
  }, {
    $set: {
      secret: process.env.ACCOUNTS_METEOR_SEC,
      clientId: process.env.ACCOUNTS_METEOR_ID,
      loginStyle: 'redirect'
    }
  });
}

if (process.env.ACCOUNTS_GITHUB_ID && process.env.ACCOUNTS_GITHUB_SEC) {
  _app.sc.github = true;
  ServiceConfiguration.configurations.upsert({
    service: 'github'
  }, {
    $set: {
      secret: process.env.ACCOUNTS_GITHUB_SEC,
      clientId: process.env.ACCOUNTS_GITHUB_ID,
      loginStyle: 'redirect'
    }
  });
}

if (process.env.ACCOUNTS_TWITTER_ID && process.env.ACCOUNTS_TWITTER_SEC) {
  _app.sc.twitter = true;
  ServiceConfiguration.configurations.upsert({
    service: 'twitter'
  }, {
    $set: {
      loginStyle: 'redirect',
      secret: process.env.ACCOUNTS_TWITTER_SEC,
      consumerKey: process.env.ACCOUNTS_TWITTER_ID
    }
  });
}

if (process.env.ACCOUNTS_FACEBOOK_ID && process.env.ACCOUNTS_FACEBOOK_SEC) {
  _app.sc.facebook = true;
  ServiceConfiguration.configurations.upsert({
    service: 'facebook'
  }, {
    $set: {
      secret: process.env.ACCOUNTS_FACEBOOK_SEC,
      appId: process.env.ACCOUNTS_FACEBOOK_ID,
      loginStyle: 'redirect'
    }
  });
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"spiderable.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// imports/server/spiderable.js                                                                                       //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
// import { WebApp } from 'meteor/webapp';
// import Spiderable from 'meteor/ostrio:spiderable-middleware';
//
// WebApp.connectHandlers.use(new Spiderable({
//   rootURL: 'https://files.veliov.com',
//   serviceURL: 'https://render.ostr.io',
//   auth: 'xxx:yyy'
// }));
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"server":{"core.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// server/core.js                                                                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.watch(require("/imports/server/files.collection.js"));
module.watch(require("/imports/server/image-processing.js"));
module.watch(require("/imports/server/methods.js"));
module.watch(require("/imports/server/publications.js"));
module.watch(require("/imports/server/service-configurations.js"));
module.watch(require("/imports/server/spiderable.js"));
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/server/core.js");
//# sourceURL=meteor://💻app/app/app.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9saWIvY29yZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9saWIvcm91dGVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3NlcnZlci9maWxlcy5jb2xsZWN0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3NlcnZlci9pbWFnZS1wcm9jZXNzaW5nLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3NlcnZlci9tZXRob2RzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3NlcnZlci9wdWJsaWNhdGlvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvc2VydmVyL3NlcnZpY2UtY29uZmlndXJhdGlvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvc2VydmVyL3NwaWRlcmFibGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3NlcnZlci9jb3JlLmpzIl0sIm5hbWVzIjpbIm1vZHVsZSIsImV4cG9ydCIsIl9hcHAiLCJDb2xsZWN0aW9ucyIsIndhdGNoIiwicmVxdWlyZSIsIk5PT1AiLCJpc1VuZGVmaW5lZCIsIm9iaiIsImlzT2JqZWN0IiwiaXNBcnJheSIsImlzRnVuY3Rpb24iLCJPYmplY3QiLCJBcnJheSIsImlzQm9vbGVhbiIsInByb3RvdHlwZSIsInRvU3RyaW5nIiwiY2FsbCIsImlzRW1wdHkiLCJpc0RhdGUiLCJrZXlzIiwibGVuZ3RoIiwiaXNTdHJpbmciLCJjbG9uZSIsInNsaWNlIiwiYXNzaWduIiwiaGFzIiwiX29iaiIsInBhdGgiLCJoYXNPd25Qcm9wZXJ0eSIsImkiLCJvbWl0IiwiY2xlYXIiLCJwaWNrIiwibWFwIiwia2V5Iiwibm93IiwiRGF0ZSIsInRocm90dGxlIiwiZnVuYyIsIndhaXQiLCJvcHRpb25zIiwicHJldmlvdXMiLCJ0aW1lb3V0IiwicmVzdWx0IiwidGhhdCIsInNlbGYiLCJhcmdzIiwibGF0ZXIiLCJsZWFkaW5nIiwiYXBwbHkiLCJ0aHJvdHRsZWQiLCJyZW1haW5pbmciLCJhcmd1bWVudHMiLCJjbGVhclRpbWVvdXQiLCJ0cmFpbGluZyIsInNldFRpbWVvdXQiLCJjYW5jZWwiLCJoZWxwZXJzIiwiTWV0ZW9yIiwidiIsIkZsb3dSb3V0ZXIiLCJyb3V0ZSIsIm5hbWUiLCJhY3Rpb24iLCJyZW5kZXIiLCJ3YWl0T24iLCJpc0NsaWVudCIsInN1YnMiLCJzdWJzY3JpYmUiLCJ1c2VyT25seSIsImdldCIsIndoaWxlV2FpdGluZyIsInN1YnNjcmlwdGlvbnMiLCJpc1NlcnZlciIsInJlZ2lzdGVyIiwiZmFzdFJlbmRlciIsInRpdGxlIiwidXNlcklkIiwibWV0YSIsImtleXdvcmRzIiwiaXRlbXByb3AiLCJjb250ZW50IiwiZGVzY3JpcHRpb24iLCJwcm9wZXJ0eSIsInBhcmFtcyIsInF1ZXJ5UGFyYW1zIiwiZmlsZSIsImxpbmsiLCJhYnNvbHV0ZVVybCIsImltYWdlIiwiaHJlZiIsIl9pZCIsIm9uTm9EYXRhIiwiZGF0YSIsImZpbGVzIiwiZmluZE9uZSIsIlJhbmRvbSIsImZpbGVzaXplIiwiRmlsZXNDb2xsZWN0aW9uIiwidXNlRHJvcEJveCIsInVzZVMzIiwiY2xpZW50Iiwic2VuZFRvU3RvcmFnZSIsImZzIiwiUzMiLCJzdHJlYW0iLCJyZXF1ZXN0IiwiRHJvcGJveCIsImJvdW5kIiwiYmluZEVudmlyb25tZW50IiwiY2FsbGJhY2siLCJwcm9jZXNzIiwiZW52IiwiRFJPUEJPWCIsInNldHRpbmdzIiwiZHJvcGJveCIsIkpTT04iLCJwYXJzZSIsInMzIiwiczNDb25mIiwiZGJDb25mIiwic2VjcmV0IiwidG9rZW4iLCJDbGllbnQiLCJidWNrZXQiLCJyZWdpb24iLCJzZWNyZXRBY2Nlc3NLZXkiLCJhY2Nlc3NLZXlJZCIsInNzbEVuYWJsZWQiLCJodHRwT3B0aW9ucyIsImFnZW50Iiwic3RvcmFnZVBhdGgiLCJjb2xsZWN0aW9uTmFtZSIsImFsbG93Q2xpZW50Q29kZSIsInByb3RlY3RlZCIsImZpbGVPYmoiLCJzZWN1cmVkIiwib25CZWZvcmVSZW1vdmUiLCJjdXJzb3IiLCJyZXMiLCJpbmRleE9mIiwib25CZWZvcmVVcGxvYWQiLCJzaXplIiwiZG93bmxvYWRDYWxsYmFjayIsInF1ZXJ5IiwiZG93bmxvYWQiLCJjb2xsZWN0aW9uIiwidXBkYXRlIiwiJGluYyIsImludGVyY2VwdERvd25sb2FkIiwiaHR0cCIsImZpbGVSZWYiLCJ2ZXJzaW9uIiwidmVyc2lvbnMiLCJwaXBlRnJvbSIsInNlcnZlIiwidXJsIiwiaGVhZGVycyIsInBpcGVQYXRoIiwib3B0cyIsIkJ1Y2tldCIsIktleSIsInJhbmdlIiwidlJlZiIsImFycmF5Iiwic3BsaXQiLCJzdGFydCIsInBhcnNlSW50IiwiZW5kIiwiaXNOYU4iLCJjaHVua1NpemUiLCJSYW5nZSIsImZpbGVDb2xsIiwiZ2V0T2JqZWN0IiwiZXJyb3IiLCJjb25zb2xlIiwicmVzcG9uc2UiLCJmaW5pc2hlZCIsImh0dHBSZXNwb25zZSIsInJlcGxhY2UiLCJkYXRhU3RyZWFtIiwiUGFzc1Rocm91Z2giLCJCb2R5IiwiZGVueUNsaWVudCIsIm9uIiwiX2ZpbGVSZWYiLCJtYWtlVXJsIiwic3RhdCIsInRyaWVzVXJsIiwibG9uZyIsImRvd25sb2FkSGFjayIsInhtbCIsInVwZCIsIiRzZXQiLCJ1cGRFcnJvciIsInVubGluayIsIndyaXRlVG9EQiIsInRyaWVzU2VuZCIsIndyaXRlRmlsZSIsImV4dGVuc2lvbiIsInJlYWRGaWxlIiwidHJpZXNSZWFkIiwiZmlsZVBhdGgiLCJpZCIsInB1dE9iamVjdCIsIlN0b3JhZ2VDbGFzcyIsImNyZWF0ZVJlYWRTdHJlYW0iLCJDb250ZW50VHlwZSIsInR5cGUiLCJ0ZXN0IiwiY3JlYXRlVGh1bWJuYWlscyIsIl9vcmlnUmVtb3ZlIiwicmVtb3ZlIiwic2VhcmNoIiwiZmluZCIsImZvckVhY2giLCJkZWxldGVPYmplY3QiLCJzZXRJbnRlcnZhbCIsIiRsdGUiLCJjaGVjayIsImRlZmF1bHQiLCJnbSIsImNiIiwiaXNMYXN0IiwiZmluaXNoIiwiZXhpc3RzIiwiRXJyb3IiLCJzaXplcyIsInByZXZpZXciLCJ3aWR0aCIsInRodW1ibmFpbDQwIiwic3F1YXJlIiwiZmVhdHVyZXMiLCJoZWlnaHQiLCJjb3B5UGFzdGUiLCJjb3B5IiwiZnNDb3B5RXJyb3IiLCJjb2xVcGRFcnJvciIsImltZyIsInF1YWxpdHkiLCJkZWZpbmUiLCJhdXRvT3JpZW50Iiwibm9Qcm9maWxlIiwic3RyaXAiLCJkaXRoZXIiLCJpbnRlcmxhY2UiLCJmaWx0ZXIiLCJ1cGRhdGVBbmRTYXZlIiwidXBOU2F2ZUVycm9yIiwiZnNTdGF0RXJyb3IiLCJnbVNpemVFcnJvciIsImltZ0luZm8iLCJyZXNpemUiLCJ3cml0ZSIsIngiLCJ5Iiwid2lkdGhSYXRpbyIsImhlaWdodFJhdGlvIiwid2lkdGhOZXciLCJoZWlnaHROZXciLCJjcm9wIiwibWV0aG9kcyIsImZpbGVzTGVuZ2h0IiwiQm9vbGVhbiIsInNlbGVjdG9yIiwiJG9yIiwiJGx0IiwiY291bnQiLCJ1bmJsYW1lIiwiU3RyaW5nIiwiYmxhbWUiLCJjaGFuZ2VBY2Nlc3MiLCJ1bmxpc3RlZCIsImNoYW5nZVByaXZhY3kiLCJnZXRTZXJ2aWNlQ29uZmlndXJhdGlvbiIsInNjIiwicHVibGlzaCIsInRha2UiLCJOdW1iZXIiLCJsaW1pdCIsInNvcnQiLCJmaWVsZHMiLCJpc1BERiIsImlzVGV4dCIsImlzSlNPTiIsImlzVmlkZW8iLCJpc0F1ZGlvIiwiaXNJbWFnZSIsIl9jb2xsZWN0aW9uTmFtZSIsIl9kb3dubG9hZFJvdXRlIiwiU2VydmljZUNvbmZpZ3VyYXRpb24iLCJjb25maWd1cmF0aW9ucyIsIkFDQ09VTlRTX01FVEVPUl9JRCIsIkFDQ09VTlRTX01FVEVPUl9TRUMiLCJtZXRlb3IiLCJ1cHNlcnQiLCJzZXJ2aWNlIiwiY2xpZW50SWQiLCJsb2dpblN0eWxlIiwiQUNDT1VOVFNfR0lUSFVCX0lEIiwiQUNDT1VOVFNfR0lUSFVCX1NFQyIsImdpdGh1YiIsIkFDQ09VTlRTX1RXSVRURVJfSUQiLCJBQ0NPVU5UU19UV0lUVEVSX1NFQyIsInR3aXR0ZXIiLCJjb25zdW1lcktleSIsIkFDQ09VTlRTX0ZBQ0VCT09LX0lEIiwiQUNDT1VOVFNfRkFDRUJPT0tfU0VDIiwiZmFjZWJvb2siLCJhcHBJZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQUEsT0FBT0MsTUFBUCxDQUFjO0FBQUNDLFFBQUssTUFBSUEsSUFBVjtBQUFlQyxlQUFZLE1BQUlBO0FBQS9CLENBQWQ7QUFBMkRILE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSxhQUFSLENBQWI7QUFFM0QsTUFBTUYsY0FBYyxFQUFwQjtBQUNBLE1BQU1ELE9BQU87QUFDWEksU0FBTSxDQUFFLENBREc7O0FBRVhDLGNBQVlDLEdBQVosRUFBaUI7QUFDZixXQUFPQSxRQUFRLEtBQUssQ0FBcEI7QUFDRCxHQUpVOztBQUtYQyxXQUFTRCxHQUFULEVBQWM7QUFDWixRQUFJLEtBQUtFLE9BQUwsQ0FBYUYsR0FBYixLQUFxQixLQUFLRyxVQUFMLENBQWdCSCxHQUFoQixDQUF6QixFQUErQztBQUM3QyxhQUFPLEtBQVA7QUFDRDs7QUFDRCxXQUFPQSxRQUFRSSxPQUFPSixHQUFQLENBQWY7QUFDRCxHQVZVOztBQVdYRSxVQUFRRixHQUFSLEVBQWE7QUFDWCxXQUFPSyxNQUFNSCxPQUFOLENBQWNGLEdBQWQsQ0FBUDtBQUNELEdBYlU7O0FBY1hNLFlBQVVOLEdBQVYsRUFBZTtBQUNiLFdBQU9BLFFBQVEsSUFBUixJQUFnQkEsUUFBUSxLQUF4QixJQUFpQ0ksT0FBT0csU0FBUCxDQUFpQkMsUUFBakIsQ0FBMEJDLElBQTFCLENBQStCVCxHQUEvQixNQUF3QyxrQkFBaEY7QUFDRCxHQWhCVTs7QUFpQlhHLGFBQVdILEdBQVgsRUFBZ0I7QUFDZCxXQUFPLE9BQU9BLEdBQVAsS0FBZSxVQUFmLElBQTZCLEtBQXBDO0FBQ0QsR0FuQlU7O0FBb0JYVSxVQUFRVixHQUFSLEVBQWE7QUFDWCxRQUFJLEtBQUtXLE1BQUwsQ0FBWVgsR0FBWixDQUFKLEVBQXNCO0FBQ3BCLGFBQU8sS0FBUDtBQUNEOztB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UjtBQURMLEdBRkg7QUFTRCxDOzs7Ozs7Ozs7OztBQ3hERDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE87Ozs7Ozs7Ozs7O0FDUEEzUyxPQUFPSSxLQUFQLENBQWFDLFFBQVEscUNBQVIsQ0FBYjtBQUE2REwsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLHFDQUFSLENBQWI7QUFBNkRMLE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSw0QkFBUixDQUFiO0FBQW9ETCxPQUFPSSxLQUFQLENBQWFDLFFBQVEsaUNBQVIsQ0FBYjtBQUF5REwsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLDJDQUFSLENBQWI7QUFBbUVMLE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSwrQkFBUixDQUFiLEUiLCJmaWxlIjoiL2FwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnLi9yb3V0ZXMuanMnO1xuXG5jb25zdCBDb2xsZWN0aW9ucyA9IHt9O1xuY29uc3QgX2FwcCA9IHtcbiAgTk9PUCgpe30sXG4gIGlzVW5kZWZpbmVkKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHZvaWQgMDtcbiAgfSxcbiAgaXNPYmplY3Qob2JqKSB7XG4gICAgaWYgKHRoaXMuaXNBcnJheShvYmopIHx8IHRoaXMuaXNGdW5jdGlvbihvYmopKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBvYmogPT09IE9iamVjdChvYmopO1xuICB9LFxuICBpc0FycmF5KG9iaikge1xuICAgIHJldHVybiBBcnJheS5pc0FycmF5KG9iaik7XG4gIH0sXG4gIGlzQm9vbGVhbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB0cnVlIHx8IG9iaiA9PT0gZmFsc2UgfHwgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEJvb2xlYW5dJztcbiAgfSxcbiAgaXNGdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ2Z1bmN0aW9uJyB8fCBmYWxzZTtcbiAgfSxcbiAgaXNFbXB0eShvYmopIHtcbiAgICBpZiAodGhpcy5pc0RhdGUob2JqKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAodGhpcy5pc09iamVjdChvYmopKSB7XG4gICAgICByZXR1cm4gIU9iamVjdC5rZXlzKG9iaikubGVuZ3RoO1xuICAgIH1cbiAgICBpZiAodGhpcy5pc0FycmF5KG9iaikgfHwgdGhpcy5pc1N0cmluZyhvYmopKSB7XG4gICAgICByZXR1cm4gIW9iai5sZW5ndGg7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcbiAgY2xvbmUob2JqKSB7XG4gICAgaWYgKCF0aGlzLmlzT2JqZWN0KG9iaikpIHJldHVybiBvYmo7XG4gICAgcmV0dXJuIHRoaXMuaXNBcnJheShvYmopID8gb2JqLnNsaWNlKCkgOiBPYmplY3QuYXNzaWduKHt9LCBvYmopO1xuICB9LFxuICBoYXMoX29iaiwgcGF0aCkge1xuICAgIGxldCBvYmogPSBfb2JqO1xuICAgIGlmICghdGhpcy5pc09iamVjdChvYmopKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghdGhpcy5pc0FycmF5KHBhdGgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5pc09iamVjdChvYmopICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHBhdGgpO1xuICAgIH1cblxuICAgIGNvbnN0IGxlbmd0aCA9IHBhdGgubGVuZ3RoO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcGF0aFtpXSkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgb2JqID0gb2JqW3BhdGhbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gISFsZW5ndGg7XG4gIH0sXG4gIG9taXQob2JqLCAuLi5rZXlzKSB7XG4gICAgY29uc3QgY2xlYXIgPSBPYmplY3QuYXNzaWduKHt9LCBvYmopO1xuICAgIGZvciAobGV0IGkgPSBrZXlzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICBkZWxldGUgY2xlYXJba2V5c1tpXV07XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsZWFyO1xuICB9LFxuICBwaWNrKG9iaiwgLi4ua2V5cykge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCAuLi5rZXlzLm1hcChrZXkgPT4gKHtba2V5XTogb2JqW2tleV19KSkpO1xuICB9LFxuICBub3c6IERhdGUubm93LFxuICB0aHJvdHRsZShmdW5jLCB3YWl0LCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgcHJldmlvdXMgPSAwO1xuICAgIGxldCB0aW1lb3V0ID0gbnVsbDtcbiAgICBsZXQgcmVzdWx0O1xuICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuICAgIGxldCBzZWxmO1xuICAgIGxldCBhcmdzO1xuXG4gICAgY29uc3QgbGF0ZXIgPSAoKSA9PiB7XG4gICAgICBwcmV2aW91cyA9IG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UgPyAwIDogdGhhdC5ub3coKTtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShzZWxmLCBhcmdzKTtcbiAgICAgIGlmICghdGltZW91dCkgc2VsZiA9IGFyZ3MgPSBudWxsO1xuICAgIH07XG5cbiAgICBjb25zdCB0aHJvdHRsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zdCBub3cgPSB0aGF0Lm5vdygpO1xuICAgICAgaWYgKCFwcmV2aW91cyAmJiBvcHRpb25zLmxlYWRpbmcgPT09IGZhbHNlKSBwcmV2aW91cyA9IG5vdztcbiAgICAgIGNvbnN0IHJlbWFpbmluZyA9IHdhaXQgLSAobm93IC0gcHJldmlvdXMpO1xuICAgICAgc2VsZiA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IHdhaXQpIHtcbiAgICAgICAgaWYgKHRpbWVvdXQpIHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoc2VsZiwgYXJncyk7XG4gICAgICAgIGlmICghdGltZW91dCkgc2VsZiA9IGFyZ3MgPSBudWxsO1xuICAgICAgfSBlbHNlIGlmICghdGltZW91dCAmJiBvcHRpb25zLnRyYWlsaW5nICE9PSBmYWxzZSkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgcmVtYWluaW5nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcblxuICAgIHRocm90dGxlZC5jYW5jZWwgPSAoKSA9PiB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICBwcmV2aW91cyA9IDA7XG4gICAgICB0aW1lb3V0ID0gc2VsZiA9IGFyZ3MgPSBudWxsO1xuICAgIH07XG5cbiAgICByZXR1cm4gdGhyb3R0bGVkO1xuICB9XG59O1xuXG5jb25zdCBoZWxwZXJzID0gWydTdHJpbmcnLCAnTnVtYmVyJywgJ0RhdGUnXTtcbmZvciAobGV0IGkgPSAwOyBpIDwgaGVscGVycy5sZW5ndGg7IGkrKykge1xuICBfYXBwWydpcycgKyBoZWxwZXJzW2ldXSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0ICcgKyBoZWxwZXJzW2ldICsgJ10nO1xuICB9O1xufVxuXG5leHBvcnQgeyBfYXBwLCBDb2xsZWN0aW9ucyB9O1xuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gICAgICAgICAgICBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IEZsb3dSb3V0ZXIgfSAgICAgICAgZnJvbSAnbWV0ZW9yL29zdHJpbzpmbG93LXJvdXRlci1leHRyYSc7XG5pbXBvcnQgeyBfYXBwLCBDb2xsZWN0aW9ucyB9IGZyb20gJy9pbXBvcnRzL2xpYi9jb3JlLmpzJztcblxuRmxvd1JvdXRlci5yb3V0ZSgnLycsIHtcbiAgbmFtZTogJ2luZGV4JyxcbiAgYWN0aW9uKCkge1xuICAgIHRoaXMucmVuZGVyKCdfbGF5b3V0JywgJ2luZGV4Jyk7XG4gIH0sXG4gIHdhaXRPbigpIHtcbiAgICBpZiAoTWV0ZW9yLmlzQ2xpZW50KSB7XG4gICAgICByZXR1cm4gW19hcHAuc3Vicy5zdWJzY3JpYmUoJ2xhdGVzdCcsIDEwLCBfYXBwLnVzZXJPbmx5LmdldCgpKSwgaW1wb3J0KCcvaW1wb3J0cy9jbGllbnQvaW5kZXgvaW5kZXguanMnKV07XG4gICAgfVxuICB9LFxuICB3aGlsZVdhaXRpbmcoKSB7XG4gICAgdGhpcy5yZW5kZXIoJ19sYXlvdXQnLCAnX2xvYWRpbmcnKTtcbiAgfSxcbiAgc3Vic2NyaXB0aW9ucygpIHtcbiAgICBpZiAoTWV0ZW9yLmlzU2VydmVyKSB7XG4gICAgICB0aGlzLnJlZ2lzdGVyKCdsYXRlc3QnLCBNZXRlb3Iuc3Vic2NyaWJlKCdsYXRlc3QnLCAxMCwgZmFsc2UpKTtcbiAgICB9XG4gIH0sXG4gIGZhc3RSZW5kZXI6IHRydWVcbn0pO1xuXG5GbG93Um91dGVyLnJvdXRlKCcvbG9naW4nLCB7XG4gIG5hbWU6ICdsb2dpbicsXG4gIHRpdGxlKCkge1xuICAgIGlmIChNZXRlb3IudXNlcklkKCkpIHtcbiAgICAgIHJldHVybiAnWW91ciBhY2NvdW50IHNldHRpbmdzJztcbiAgICB9XG4gICAgcmV0dXJuICdMb2dpbiBpbnRvIE1ldGVvciBGaWxlcyc7XG4gIH0sXG4gIG1ldGE6IHtcbiAgICBrZXl3b3Jkczoge1xuICAgICAgbmFtZTogJ2tleXdvcmRzJyxcbiAgICAgIGl0ZW1wcm9wOiAna2V5d29yZHMnLFxuICAgICAgY29udGVudDogJ3ByaXZhdGUsIHVubGlzdGVkLCBmaWxlcywgdXBsb2FkLCBtZXRlb3IsIG9wZW4gc291cmNlLCBqYXZhc2NyaXB0J1xuICAgIH0sXG4gICAgZGVzY3JpcHRpb246IHtcbiAgICAgIG5hbWU6ICdkZXNjcmlwdGlvbicsXG4gICAgICBpdGVtcHJvcDogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgIHByb3BlcnR5OiAnb2c6ZGVzY3JpcHRpb24nLFxuICAgICAgY29udGVudDogJ0xvZ2luIGludG8gTWV0ZW9yIGZpbGVzLiBBZnRlciB5b3UgbG9nZ2VkIGluIHlvdSBjYW4gbWFrZSBmaWxlcyBwcml2YXRlIGFuZCB1bmxpc3RlZCdcbiAgICB9LFxuICAgICd0d2l0dGVyOmRlc2NyaXB0aW9uJzogJ0xvZ2luIGludG8gTWV0ZW9yIGZpbGVzLiBBZnRlciB5b3UgbG9nZ2VkIGluIHlvdSBjYW4gbWFrZSBmaWxlcyBwcml2YXRlIGFuZCB1bmxpc3RlZCdcbiAgfSxcbiAgYWN0aW9uKCkge1xuICAgIHRoaXMucmVuZGVyKCdfbGF5b3V0JywgJ2xvZ2luJyk7XG4gIH0sXG4gIHdhaXRPbigpIHtcbiAgICByZXR1cm4gaW1wb3J0KCcvaW1wb3J0cy9jbGllbnQvdXNlci1hY2NvdW50L2xvZ2luLmpzJyk7XG4gIH0sXG4gIHdoaWxlV2FpdGluZygpIHtcbiAgICB0aGlzLnJlbmRlcignX2xheW91dCcsICdfbG9hZGluZycpO1xuICB9XG59KTtcblxuRmxvd1JvdXRlci5yb3V0ZSgnLzpfaWQnLCB7XG4gIG5hbWU6ICdmaWxlJyxcbiAgdGl0bGUocGFyYW1zLCBxdWVyeVBhcmFtcywgZmlsZSkge1xuICAgIGlmIChmaWxlKSB7XG4gICAgICByZXR1cm4gJ1ZpZXcgRmlsZTogJyArIChmaWxlLmdldCgnbmFtZScpKTtcbiAgICB9XG4gICAgcmV0dXJuICc0MDQ6IFBhZ2Ugbm90IGZvdW5kJztcbiAgfSxcbiAgbWV0YShwYXJhbXMsIHF1ZXJ5UGFyYW1zLCBmaWxlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGtleXdvcmRzOiB7XG4gICAgICAgIG5hbWU6ICdrZXl3b3JkcycsXG4gICAgICAgIGl0ZW1wcm9wOiAna2V5d29yZHMnLFxuICAgICAgICBjb250ZW50OiBmaWxlID8gJ2ZpbGUsIHZpZXcsIHByZXZpZXcsIHVwbG9hZGVkLCBzaGFyZWQsICcgKyAoZmlsZS5nZXQoJ25hbWUnKSkgKyAnLCAnICsgKGZpbGUuZ2V0KCdleHRlbnNpb24nKSkgKyAnLCAnICsgKGZpbGUuZ2V0KCd0eXBlJykpICsgJywgbWV0ZW9yLCBvcGVuIHNvdXJjZSwgamF2YXNjcmlwdCcgOiAnNDA0LCBwYWdlLCBub3QgZm91bmQnXG4gICAgICB9LFxuICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgbmFtZTogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgaXRlbXByb3A6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgIHByb3BlcnR5OiAnb2c6ZGVzY3JpcHRpb24nLFxuICAgICAgICBjb250ZW50OiBmaWxlID8gJ1ZpZXcgdXBsb2FkZWQgYW5kIHNoYXJlZCBmaWxlOiAnICsgKGZpbGUuZ2V0KCduYW1lJykpIDogJzQwNDogTm8gc3VjaCBwYWdlJ1xuICAgICAgfSxcbiAgICAgICd0d2l0dGVyOmRlc2NyaXB0aW9uJzogZmlsZSA/ICdWaWV3IHVwbG9hZGVkIGFuZCBzaGFyZWQgZmlsZTogJyArIChmaWxlLmdldCgnbmFtZScpKSA6ICc0MDQ6IE5vIHN1Y2ggcGFnZScsXG4gICAgICAnb2c6aW1hZ2UnOiB7XG4gICAgICAgIHByb3BlcnR5OiAnb2c6aW1hZ2UnLFxuICAgICAgICBjb250ZW50OiBmaWxlICYmIGZpbGUuZ2V0KCdpc0ltYWdlJykgPyBmaWxlLmxpbmsoJ3ByZXZpZXcnKSA6IE1ldGVvci5hYnNvbHV0ZVVybCgnaWNvbl8xMjAweDYzMC5wbmcnKVxuICAgICAgfSxcbiAgICAgICd0d2l0dGVyOmltYWdlJzoge1xuICAgICAgICBuYW1lOiAndHdpdHRlcjppbWFnZScsXG4gICAgICAgIGNvbnRlbnQ6IGZpbGUgJiYgZmlsZS5nZXQoJ2lzSW1hZ2UnKSA/IGZpbGUubGluaygncHJldmlldycpIDogTWV0ZW9yLmFic29sdXRlVXJsKCdpY29uXzc1MHg1NjAucG5nJylcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuICBsaW5rKHBhcmFtcywgcXVlcnlQYXJhbXMsIGZpbGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaW1hZ2U6IHtcbiAgICAgICAgaXRlbXByb3A6ICdpbWFnZScsXG4gICAgICAgIGNvbnRlbnQoKSB7XG4gICAgICAgICAgaWYgKGZpbGUgJiYgZmlsZS5nZXQoJ2lzSW1hZ2UnKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZpbGUubGluaygncHJldmlldycpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gTWV0ZW9yLmFic29sdXRlVXJsKCdpY29uXzEyMDB4NjMwLnBuZycpO1xuICAgICAgICB9LFxuICAgICAgICBocmVmKCkge1xuICAgICAgICAgIGlmIChmaWxlICYmIGZpbGUuZ2V0KCdpc0ltYWdlJykpIHtcbiAgICAgICAgICAgIHJldHVybiBmaWxlLmxpbmsoJ3ByZXZpZXcnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIE1ldGVvci5hYnNvbHV0ZVVybCgnaWNvbl8xMjAweDYzMC5wbmcnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0sXG4gIGFjdGlvbihwYXJhbXMsIHF1ZXJ5UGFyYW1zLCBmaWxlKSB7XG4gICAgaWYgKF9hcHAuaXNPYmplY3QoZmlsZSkgJiYgIV9hcHAuaXNFbXB0eShmaWxlKSkge1xuICAgICAgdGhpcy5yZW5kZXIoJ19sYXlvdXQnLCAnZmlsZScsIHtcbiAgICAgICAgZmlsZTogZmlsZVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICB3YWl0T24ocGFyYW1zKSB7XG4gICAgaWYgKE1ldGVvci5pc0NsaWVudCkge1xuICAgICAgcmV0dXJuIFtfYXBwLnN1YnMuc3Vic2NyaWJlKCdmaWxlJywgcGFyYW1zLl9pZCksIGltcG9ydCgnL2ltcG9ydHMvY2xpZW50L2ZpbGUvZmlsZS5qcycpXTtcbiAgICB9XG4gIH0sXG4gIHN1YnNjcmlwdGlvbnMocGFyYW1zKSB7XG4gICAgaWYgKE1ldGVvci5pc1NlcnZlcikge1xuICAgICAgdGhpcy5yZWdpc3RlcignZmlsZScsIE1ldGVvci5zdWJzY3JpYmUoJ2ZpbGUnLCBwYXJhbXMuX2lkKSk7XG4gICAgfVxuICB9LFxuICBmYXN0UmVuZGVyOiB0cnVlLFxuICB3aGlsZVdhaXRpbmcoKSB7XG4gICAgdGhpcy5yZW5kZXIoJ19sYXlvdXQnLCAnX2xvYWRpbmcnKTtcbiAgfSxcbiAgb25Ob0RhdGEoKSB7XG4gICAgdGhpcy5yZW5kZXIoJ19sYXlvdXQnLCAnXzQwNCcpO1xuICB9LFxuICBkYXRhKHBhcmFtcykge1xuICAgIHJldHVybiBDb2xsZWN0aW9ucy5maWxlcy5maW5kT25lKHBhcmFtcy5faWQpIHx8IGZhbHNlO1xuICB9XG59KTtcblxuLy8gNDA0IHJvdXRlIChjYXRjaCBhbGwpXG5GbG93Um91dGVyLnJvdXRlKCcqJywge1xuICBhY3Rpb24oKSB7XG4gICAgdGhpcy5yZW5kZXIoJ19sYXlvdXQnLCAnXzQwNCcpO1xuICB9LFxuICB0aXRsZTogJzQwNDogUGFnZSBub3QgZm91bmQnXG59KTtcbiIsImltcG9ydCB7IE1ldGVvciB9ICAgICAgICAgICAgZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBSYW5kb20gfSAgICAgICAgICAgIGZyb20gJ21ldGVvci9yYW5kb20nO1xuaW1wb3J0IHsgZmlsZXNpemUgfSAgICAgICAgICBmcm9tICdtZXRlb3IvbXJ0OmZpbGVzaXplJztcbmltcG9ydCB7IEZpbGVzQ29sbGVjdGlvbiB9ICAgZnJvbSAnbWV0ZW9yL29zdHJpbzpmaWxlcyc7XG5pbXBvcnQgeyBfYXBwLCBDb2xsZWN0aW9ucyB9IGZyb20gJy9pbXBvcnRzL2xpYi9jb3JlLmpzJztcblxuLy8gRHJvcEJveCB1c2FnZTpcbi8vIFJlYWQ6IGh0dHBzOi8vZ2l0aHViLmNvbS9WZWxpb3ZHcm91cC9NZXRlb3ItRmlsZXMvd2lraS9Ecm9wQm94LUludGVncmF0aW9uXG4vLyBlbnYudmFyIGV4YW1wbGU6IERST1BCT1g9J3tcImRyb3Bib3hcIjp7XCJrZXlcIjogXCJ4eHhcIiwgXCJzZWNyZXRcIjogXCJ4eHhcIiwgXCJ0b2tlblwiOiBcInh4eFwifX0nXG5sZXQgdXNlRHJvcEJveCA9IGZhbHNlO1xuXG4vLyBBV1M6UzMgdXNhZ2U6XG4vLyBSZWFkOiBodHRwczovL2dpdGh1Yi5jb20vVmVsaW92R3JvdXAvTWV0ZW9yLUZpbGVzL3dpa2kvQVdTLVMzLUludGVncmF0aW9uXG4vLyBlbnYudmFyIGV4YW1wbGU6IFMzPSd7XCJzM1wiOntcImtleVwiOiBcInh4eFwiLCBcInNlY3JldFwiOiBcInh4eFwiLCBcImJ1Y2tldFwiOiBcInh4eFwiLCBcInJlZ2lvblwiOiBcInh4eFwiXCJ9fSdcbmxldCB1c2VTMyA9IGZhbHNlO1xubGV0IGNsaWVudDtcbmxldCBzZW5kVG9TdG9yYWdlO1xuXG5jb25zdCBmcyAgICAgID0gcmVxdWlyZSgnZnMtZXh0cmEnKTtcbmNvbnN0IFMzICAgICAgPSByZXF1aXJlKCdhd3Mtc2RrL2NsaWVudHMvczMnKTtcbmNvbnN0IHN0cmVhbSAgPSByZXF1aXJlKCdzdHJlYW0nKTtcbmNvbnN0IHJlcXVlc3QgPSByZXF1aXJlKCdyZXF1ZXN0Jyk7XG5jb25zdCBEcm9wYm94ID0gcmVxdWlyZSgnZHJvcGJveCcpO1xuY29uc3QgYm91bmQgICA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGNhbGxiYWNrKSA9PiB7XG4gIHJldHVybiBjYWxsYmFjaygpO1xufSk7XG5cbmlmIChwcm9jZXNzLmVudi5EUk9QQk9YKSB7XG4gIE1ldGVvci5zZXR0aW5ncy5kcm9wYm94ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5EUk9QQk9YKS5kcm9wYm94O1xufSBlbHNlIGlmIChwcm9jZXNzLmVudi5TMykge1xuICBNZXRlb3Iuc2V0dGluZ3MuczMgPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52LlMzKS5zMztcbn1cblxuY29uc3QgczNDb25mID0gTWV0ZW9yLnNldHRpbmdzLnMzIHx8IHt9O1xuY29uc3QgZGJDb25mID0gTWV0ZW9yLnNldHRpbmdzLmRyb3Bib3ggfHwge307XG5cbmlmIChkYkNvbmYgJiYgZGJDb25mLmtleSAmJiBkYkNvbmYuc2VjcmV0ICYmIGRiQ29uZi50b2tlbikge1xuICB1c2VEcm9wQm94ID0gdHJ1ZTtcbiAgY2xpZW50ICAgICA9IG5ldyBEcm9wYm94LkNsaWVudCh7XG4gICAga2V5OiBkYkNvbmYua2V5LFxuICAgIHNlY3JldDogZGJDb25mLnNlY3JldCxcbiAgICB0b2tlbjogZGJDb25mLnRva2VuXG4gIH0pO1xufSBlbHNlIGlmIChzM0NvbmYgJiYgczNDb25mLmtleSAmJiBzM0NvbmYuc2VjcmV0ICYmIHMzQ29uZi5idWNrZXQgJiYgczNDb25mLnJlZ2lvbikge1xuICB1c2VTMyAgPSB0cnVlO1xuICBjbGllbnQgPSBuZXcgUzMoe1xuICAgIHNlY3JldEFjY2Vzc0tleTogczNDb25mLnNlY3JldCxcbiAgICBhY2Nlc3NLZXlJZDogczNDb25mLmtleSxcbiAgICByZWdpb246IHMzQ29uZi5yZWdpb24sXG4gICAgc3NsRW5hYmxlZDogZmFsc2UsXG4gICAgaHR0cE9wdGlvbnM6IHtcbiAgICAgIHRpbWVvdXQ6IDYwMDAsXG4gICAgICBhZ2VudDogZmFsc2VcbiAgICB9XG4gIH0pO1xufVxuXG5Db2xsZWN0aW9ucy5maWxlcyA9IG5ldyBGaWxlc0NvbGxlY3Rpb24oe1xuICAvLyBkZWJ1ZzogdHJ1ZSxcbiAgc3RvcmFnZVBhdGg6ICdhc3NldHMvYXBwL3VwbG9hZHMvdXBsb2FkZWRGaWxlcycsXG4gIGNvbGxlY3Rpb25OYW1lOiAndXBsb2FkZWRGaWxlcycsXG4gIGFsbG93Q2xpZW50Q29kZTogdHJ1ZSxcbiAgLy8gZGlzYWJsZVVwbG9hZDogdHJ1ZSxcbiAgLy8gZGlzYWJsZURvd25sb2FkOiB0cnVlLFxuICBwcm90ZWN0ZWQoZmlsZU9iaikge1xuICAgIGlmIChmaWxlT2JqKSB7XG4gICAgICBpZiAoIShmaWxlT2JqLm1ldGEgJiYgZmlsZU9iai5tZXRhLnNlY3VyZWQpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIGlmICgoZmlsZU9iai5tZXRhICYmIGZpbGVPYmoubWV0YS5zZWN1cmVkID09PSB0cnVlKSAmJiB0aGlzLnVzZXJJZCA9PT0gZmlsZU9iai51c2VySWQpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcbiAgb25CZWZvcmVSZW1vdmUoY3Vyc29yKSB7XG4gICAgY29uc3QgcmVzID0gY3Vyc29yLm1hcCgoZmlsZSkgPT4ge1xuICAgICAgaWYgKGZpbGUgJiYgZmlsZS51c2VySWQgJiYgX2FwcC5pc1N0cmluZyhmaWxlLnVzZXJJZCkpIHtcbiAgICAgICAgcmV0dXJuIGZpbGUudXNlcklkID09PSB0aGlzLnVzZXJJZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgICByZXR1cm4gIX5yZXMuaW5kZXhPZihmYWxzZSk7XG4gIH0sXG4gIG9uQmVmb3JlVXBsb2FkKCkge1xuICAgIGlmICh0aGlzLmZpbGUuc2l6ZSA8PSAxMDI0ICogMTAyNCAqIDEyOCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBcIk1heC4gZmlsZSBzaXplIGlzIDEyOE1CIHlvdSd2ZSB0cmllZCB0byB1cGxvYWQgXCIgKyAoZmlsZXNpemUodGhpcy5maWxlLnNpemUpKTtcbiAgfSxcbiAgZG93bmxvYWRDYWxsYmFjayhmaWxlT2JqKSB7XG4gICAgaWYgKHRoaXMucGFyYW1zICYmIHRoaXMucGFyYW1zLnF1ZXJ5ICYmIHRoaXMucGFyYW1zLnF1ZXJ5LmRvd25sb2FkID09PSAndHJ1ZScpIHtcbiAgICAgIENvbGxlY3Rpb25zLmZpbGVzLmNvbGxlY3Rpb24udXBkYXRlKGZpbGVPYmouX2lkLCB7XG4gICAgICAgICRpbmM6IHtcbiAgICAgICAgICAnbWV0YS5kb3dubG9hZHMnOiAxXG4gICAgICAgIH1cbiAgICAgIH0sIF9hcHAuTk9PUCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuICBpbnRlcmNlcHREb3dubG9hZChodHRwLCBmaWxlUmVmLCB2ZXJzaW9uKSB7XG4gICAgbGV0IHBhdGg7XG4gICAgaWYgKHVzZURyb3BCb3gpIHtcbiAgICAgIHBhdGggPSAoZmlsZVJlZiAmJiBmaWxlUmVmLnZlcnNpb25zICYmIGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl0gJiYgZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXS5tZXRhICYmIGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl0ubWV0YS5waXBlRnJvbSkgPyBmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dLm1ldGEucGlwZUZyb20gOiB2b2lkIDA7XG4gICAgICBpZiAocGF0aCkge1xuICAgICAgICAvLyBJZiBmaWxlIGlzIHN1Y2Nlc3NmdWxseSBtb3ZlZCB0byBTdG9yYWdlXG4gICAgICAgIC8vIFdlIHdpbGwgcGlwZSByZXF1ZXN0IHRvIFN0b3JhZ2VcbiAgICAgICAgLy8gU28sIG9yaWdpbmFsIGxpbmsgd2lsbCBzdGF5IGFsd2F5cyBzZWN1cmVcblxuICAgICAgICAvLyBUbyBmb3JjZSA/cGxheSBhbmQgP2Rvd25sb2FkIHBhcmFtZXRlcnNcbiAgICAgICAgLy8gYW5kIHRvIGtlZXAgb3JpZ2luYWwgZmlsZSBuYW1lLCBjb250ZW50LXR5cGUsXG4gICAgICAgIC8vIGNvbnRlbnQtZGlzcG9zaXRpb24gYW5kIGNhY2hlLWNvbnRyb2xcbiAgICAgICAgLy8gd2UncmUgdXNpbmcgbG93LWxldmVsIC5zZXJ2ZSgpIG1ldGhvZFxuICAgICAgICB0aGlzLnNlcnZlKGh0dHAsIGZpbGVSZWYsIGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl0sIHZlcnNpb24sIHJlcXVlc3Qoe1xuICAgICAgICAgIHVybDogcGF0aCxcbiAgICAgICAgICBoZWFkZXJzOiBfYXBwLnBpY2soaHR0cC5yZXF1ZXN0LmhlYWRlcnMsICdyYW5nZScsICdjYWNoZS1jb250cm9sJywgJ2Nvbm5lY3Rpb24nKVxuICAgICAgICB9KSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgLy8gV2hpbGUgZmlsZSBpcyBub3QgeWV0IHVwbG9hZGVkIHRvIFN0b3JhZ2VcbiAgICAgIC8vIFdlIHdpbGwgc2VydmUgZmlsZSBmcm9tIEZTXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmICh1c2VTMykge1xuICAgICAgcGF0aCA9IChmaWxlUmVmICYmIGZpbGVSZWYudmVyc2lvbnMgJiYgZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXSAmJiBmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dLm1ldGEgJiYgZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXS5tZXRhLnBpcGVQYXRoKSA/IGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl0ubWV0YS5waXBlUGF0aCA6IHZvaWQgMDtcbiAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgIC8vIElmIGZpbGUgaXMgc3VjY2Vzc2Z1bGx5IG1vdmVkIHRvIFN0b3JhZ2VcbiAgICAgICAgLy8gV2Ugd2lsbCBwaXBlIHJlcXVlc3QgdG8gU3RvcmFnZVxuICAgICAgICAvLyBTbywgb3JpZ2luYWwgbGluayB3aWxsIHN0YXkgYWx3YXlzIHNlY3VyZVxuXG4gICAgICAgIC8vIFRvIGZvcmNlID9wbGF5IGFuZCA/ZG93bmxvYWQgcGFyYW1ldGVyc1xuICAgICAgICAvLyBhbmQgdG8ga2VlcCBvcmlnaW5hbCBmaWxlIG5hbWUsIGNvbnRlbnQtdHlwZSxcbiAgICAgICAgLy8gY29udGVudC1kaXNwb3NpdGlvbiBhbmQgY2FjaGUtY29udHJvbFxuICAgICAgICAvLyB3ZSdyZSB1c2luZyBsb3ctbGV2ZWwgLnNlcnZlKCkgbWV0aG9kXG4gICAgICAgIGNvbnN0IG9wdHMgPSB7XG4gICAgICAgICAgQnVja2V0OiBzM0NvbmYuYnVja2V0LFxuICAgICAgICAgIEtleTogcGF0aFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChodHRwLnJlcXVlc3QuaGVhZGVycy5yYW5nZSkge1xuICAgICAgICAgIGNvbnN0IHZSZWYgID0gZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXTtcbiAgICAgICAgICBsZXQgcmFuZ2UgICA9IF9hcHAuY2xvbmUoaHR0cC5yZXF1ZXN0LmhlYWRlcnMucmFuZ2UpO1xuICAgICAgICAgIGNvbnN0IGFycmF5ID0gcmFuZ2Uuc3BsaXQoL2J5dGVzPShbMC05XSopLShbMC05XSopLyk7XG4gICAgICAgICAgY29uc3Qgc3RhcnQgPSBwYXJzZUludChhcnJheVsxXSk7XG4gICAgICAgICAgbGV0IGVuZCAgICAgPSBwYXJzZUludChhcnJheVsyXSk7XG4gICAgICAgICAgaWYgKGlzTmFOKGVuZCkpIHtcbiAgICAgICAgICAgIC8vIFJlcXVlc3QgZGF0YSBmcm9tIEFXUzpTMyBieSBzbWFsbCBjaHVua3NcbiAgICAgICAgICAgIGVuZCAgICAgICA9IChzdGFydCArIHRoaXMuY2h1bmtTaXplKSAtIDE7XG4gICAgICAgICAgICBpZiAoZW5kID49IHZSZWYuc2l6ZSkge1xuICAgICAgICAgICAgICBlbmQgICAgID0gdlJlZi5zaXplIC0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgb3B0cy5SYW5nZSAgID0gYGJ5dGVzPSR7c3RhcnR9LSR7ZW5kfWA7XG4gICAgICAgICAgaHR0cC5yZXF1ZXN0LmhlYWRlcnMucmFuZ2UgPSBgYnl0ZXM9JHtzdGFydH0tJHtlbmR9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZpbGVDb2xsID0gdGhpcztcbiAgICAgICAgY2xpZW50LmdldE9iamVjdChvcHRzLCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmZpbmlzaGVkKSB7XG4gICAgICAgICAgICAgIGh0dHAucmVzcG9uc2UuZW5kKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChodHRwLnJlcXVlc3QuaGVhZGVycy5yYW5nZSAmJiB0aGlzLmh0dHBSZXNwb25zZS5oZWFkZXJzWydjb250ZW50LXJhbmdlJ10pIHtcbiAgICAgICAgICAgICAgLy8gU2V0IHByb3BlciByYW5nZSBoZWFkZXIgaW4gYWNjb3JkaW5nIHRvIHdoYXQgaXMgcmV0dXJuZWQgZnJvbSBBV1M6UzNcbiAgICAgICAgICAgICAgaHR0cC5yZXF1ZXN0LmhlYWRlcnMucmFuZ2UgPSB0aGlzLmh0dHBSZXNwb25zZS5oZWFkZXJzWydjb250ZW50LXJhbmdlJ10uc3BsaXQoJy8nKVswXS5yZXBsYWNlKCdieXRlcyAnLCAnYnl0ZXM9Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGRhdGFTdHJlYW0gPSBuZXcgc3RyZWFtLlBhc3NUaHJvdWdoKCk7XG4gICAgICAgICAgICBmaWxlQ29sbC5zZXJ2ZShodHRwLCBmaWxlUmVmLCBmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dLCB2ZXJzaW9uLCBkYXRhU3RyZWFtKTtcbiAgICAgICAgICAgIGRhdGFTdHJlYW0uZW5kKHRoaXMuZGF0YS5Cb2R5KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgLy8gV2hpbGUgZmlsZSBpcyBub3QgeWV0IHVwbG9hZGVkIHRvIFN0b3JhZ2VcbiAgICAgIC8vIFdlIHdpbGwgc2VydmUgZmlsZSBmcm9tIEZTXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufSk7XG5cbkNvbGxlY3Rpb25zLmZpbGVzLmRlbnlDbGllbnQoKTtcbkNvbGxlY3Rpb25zLmZpbGVzLm9uKCdhZnRlclVwbG9hZCcsIGZ1bmN0aW9uKF9maWxlUmVmKSB7XG4gIGlmICh1c2VEcm9wQm94KSB7XG4gICAgY29uc3QgbWFrZVVybCA9IChzdGF0LCBmaWxlUmVmLCB2ZXJzaW9uLCB0cmllc1VybCA9IDApID0+IHtcbiAgICAgIGNsaWVudC5tYWtlVXJsKHN0YXQucGF0aCwge1xuICAgICAgICBsb25nOiB0cnVlLFxuICAgICAgICBkb3dubG9hZEhhY2s6IHRydWVcbiAgICAgIH0sIChlcnJvciwgeG1sKSA9PiB7XG4gICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAvLyBTdG9yZSBkb3dubG9hZGFibGUgbGluayBpbiBmaWxlJ3MgbWV0YSBvYmplY3RcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGlmICh0cmllc1VybCA8IDEwKSB7XG4gICAgICAgICAgICAgIE1ldGVvci5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBtYWtlVXJsKHN0YXQsIGZpbGVSZWYsIHZlcnNpb24sICsrdHJpZXNVcmwpO1xuICAgICAgICAgICAgICB9LCAyMDQ4KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IsIHtcbiAgICAgICAgICAgICAgICB0cmllc1VybDogdHJpZXNVcmxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmICh4bWwpIHtcbiAgICAgICAgICAgIGNvbnN0IHVwZCA9IHsgJHNldDoge30gfTtcbiAgICAgICAgICAgIHVwZC4kc2V0W2B2ZXJzaW9ucy4ke3ZlcnNpb259Lm1ldGEucGlwZUZyb21gXSA9IHhtbC51cmw7XG4gICAgICAgICAgICB1cGQuJHNldFtgdmVyc2lvbnMuJHt2ZXJzaW9ufS5tZXRhLnBpcGVQYXRoYF0gPSBzdGF0LnBhdGg7XG4gICAgICAgICAgICB0aGlzLmNvbGxlY3Rpb24udXBkYXRlKHtcbiAgICAgICAgICAgICAgX2lkOiBmaWxlUmVmLl9pZFxuICAgICAgICAgICAgfSwgdXBkLCAodXBkRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgaWYgKHVwZEVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcih1cGRFcnJvcik7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVW5saW5rIG9yaWdpbmFsIGZpbGVzIGZyb20gRlNcbiAgICAgICAgICAgICAgICAvLyBhZnRlciBzdWNjZXNzZnVsIHVwbG9hZCB0byBEcm9wQm94XG4gICAgICAgICAgICAgICAgdGhpcy51bmxpbmsodGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUoZmlsZVJlZi5faWQpLCB2ZXJzaW9uKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0cmllc1VybCA8IDEwKSB7XG4gICAgICAgICAgICAgIE1ldGVvci5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSBkb3dubG9hZGFibGUgbGlua1xuICAgICAgICAgICAgICAgIG1ha2VVcmwoc3RhdCwgZmlsZVJlZiwgdmVyc2lvbiwgKyt0cmllc1VybCk7XG4gICAgICAgICAgICAgIH0sIDIwNDgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignY2xpZW50Lm1ha2VVcmwgZG9lc25cXCd0IHJldHVybnMgeG1sJywge1xuICAgICAgICAgICAgICAgIHRyaWVzVXJsOiB0cmllc1VybFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHdyaXRlVG9EQiA9IChmaWxlUmVmLCB2ZXJzaW9uLCBkYXRhLCB0cmllc1NlbmQgPSAwKSA9PiB7XG4gICAgICAvLyBEcm9wQm94IGFscmVhZHkgdXNlcyByYW5kb20gVVJMc1xuICAgICAgLy8gTm8gbmVlZCB0byB1c2UgcmFuZG9tIGZpbGUgbmFtZXNcbiAgICAgIGNsaWVudC53cml0ZUZpbGUoZmlsZVJlZi5faWQgKyAnLScgKyB2ZXJzaW9uICsgJy4nICsgZmlsZVJlZi5leHRlbnNpb24sIGRhdGEsIChlcnJvciwgc3RhdCkgPT4ge1xuICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICBpZiAodHJpZXNTZW5kIDwgMTApIHtcbiAgICAgICAgICAgICAgTWV0ZW9yLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFdyaXRlIGZpbGUgdG8gRHJvcEJveFxuICAgICAgICAgICAgICAgIHdyaXRlVG9EQihmaWxlUmVmLCB2ZXJzaW9uLCBkYXRhLCArK3RyaWVzU2VuZCk7XG4gICAgICAgICAgICAgIH0sIDIwNDgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvciwge1xuICAgICAgICAgICAgICAgIHRyaWVzU2VuZDogdHJpZXNTZW5kXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtYWtlVXJsKHN0YXQsIGZpbGVSZWYsIHZlcnNpb24pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgY29uc3QgcmVhZEZpbGUgPSAoZmlsZVJlZiwgdlJlZiwgdmVyc2lvbiwgdHJpZXNSZWFkID0gMCkgPT4ge1xuICAgICAgZnMucmVhZEZpbGUodlJlZi5wYXRoLCAoZXJyb3IsIGRhdGEpID0+IHtcbiAgICAgICAgYm91bmQoKCkgPT4ge1xuICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgaWYgKHRyaWVzUmVhZCA8IDEwKSB7XG4gICAgICAgICAgICAgIHJlYWRGaWxlKGZpbGVSZWYsIHZSZWYsIHZlcnNpb24sICsrdHJpZXNSZWFkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3cml0ZVRvREIoZmlsZVJlZiwgdmVyc2lvbiwgZGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBzZW5kVG9TdG9yYWdlID0gKGZpbGVSZWYpID0+IHtcbiAgICAgIGZvcihsZXQgdmVyc2lvbiBpbiBmaWxlUmVmLnZlcnNpb25zKSB7XG4gICAgICAgIGlmIChmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dKSB7XG4gICAgICAgICAgcmVhZEZpbGUoZmlsZVJlZiwgZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXSwgdmVyc2lvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9IGVsc2UgaWYgKHVzZVMzKSB7XG4gICAgc2VuZFRvU3RvcmFnZSA9IChmaWxlUmVmKSA9PiB7XG4gICAgICBmb3IobGV0IHZlcnNpb24gaW4gZmlsZVJlZi52ZXJzaW9ucykge1xuICAgICAgICBpZiAoZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXSkge1xuICAgICAgICAgIGNvbnN0IHZSZWYgPSBmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dO1xuICAgICAgICAgIC8vIFdlIHVzZSBSYW5kb20uaWQoKSBpbnN0ZWFkIG9mIHJlYWwgZmlsZSdzIF9pZFxuICAgICAgICAgIC8vIHRvIHNlY3VyZSBmaWxlcyBmcm9tIHJldmVyc2UgZW5naW5lZXJpbmdcbiAgICAgICAgICAvLyBBcyBhZnRlciB2aWV3aW5nIHRoaXMgY29kZSBpdCB3aWxsIGJlIGVhc3lcbiAgICAgICAgICAvLyB0byBnZXQgYWNjZXNzIHRvIHVubGlzdGVkIGFuZCBwcm90ZWN0ZWQgZmlsZXNcbiAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9ICdmaWxlcy8nICsgKFJhbmRvbS5pZCgpKSArICctJyArIHZlcnNpb24gKyAnLicgKyBmaWxlUmVmLmV4dGVuc2lvbjtcblxuICAgICAgICAgIGNsaWVudC5wdXRPYmplY3Qoe1xuICAgICAgICAgICAgU3RvcmFnZUNsYXNzOiAnU1RBTkRBUkQnLFxuICAgICAgICAgICAgQnVja2V0OiBzM0NvbmYuYnVja2V0LFxuICAgICAgICAgICAgS2V5OiBmaWxlUGF0aCxcbiAgICAgICAgICAgIEJvZHk6IGZzLmNyZWF0ZVJlYWRTdHJlYW0odlJlZi5wYXRoKSxcbiAgICAgICAgICAgIENvbnRlbnRUeXBlOiB2UmVmLnR5cGUsXG4gICAgICAgICAgfSwgKGVycm9yKSA9PiB7XG4gICAgICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVwZCA9IHsgJHNldDoge30gfTtcbiAgICAgICAgICAgICAgICB1cGQuJHNldFtgdmVyc2lvbnMuJHt2ZXJzaW9ufS5tZXRhLnBpcGVQYXRoYF0gPSBmaWxlUGF0aDtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbGxlY3Rpb24udXBkYXRlKHtcbiAgICAgICAgICAgICAgICAgIF9pZDogZmlsZVJlZi5faWRcbiAgICAgICAgICAgICAgICB9LCB1cGQsICh1cGRFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKHVwZEVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IodXBkRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVW5saW5rIG9yaWdpbmFsIGZpbGUgZnJvbSBGU1xuICAgICAgICAgICAgICAgICAgICAvLyBhZnRlciBzdWNjZXNzZnVsIHVwbG9hZCB0byBBV1M6UzNcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51bmxpbmsodGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUoZmlsZVJlZi5faWQpLCB2ZXJzaW9uKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgaWYgKC9wbmd8anBlP2cvaS50ZXN0KF9maWxlUmVmLmV4dGVuc2lvbiB8fCAnJykpIHtcbiAgICBNZXRlb3Iuc2V0VGltZW91dCggKCkgPT4ge1xuICAgICAgX2FwcC5jcmVhdGVUaHVtYm5haWxzKHRoaXMsIF9maWxlUmVmLCAoZXJyb3IpID0+IHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodXNlRHJvcEJveCB8fCB1c2VTMykge1xuICAgICAgICAgIHNlbmRUb1N0b3JhZ2UodGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUoX2ZpbGVSZWYuX2lkKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0sIDEwMjQpO1xuICB9IGVsc2Uge1xuICAgIGlmICh1c2VEcm9wQm94IHx8IHVzZVMzKSB7XG4gICAgICBzZW5kVG9TdG9yYWdlKF9maWxlUmVmKTtcbiAgICB9XG4gIH1cbn0pO1xuXG4vLyBUaGlzIGxpbmUgbm93IGNvbW1lbnRlZCBkdWUgdG8gSGVyb2t1IHVzYWdlXG4vLyBDb2xsZWN0aW9ucy5maWxlcy5jb2xsZWN0aW9uLl9lbnN1cmVJbmRleCB7J21ldGEuZXhwaXJlQXQnOiAxfSwge2V4cGlyZUFmdGVyU2Vjb25kczogMCwgYmFja2dyb3VuZDogdHJ1ZX1cblxuLy8gSW50ZXJjZXB0IEZpbGVDb2xsZWN0aW9uJ3MgcmVtb3ZlIG1ldGhvZFxuLy8gdG8gcmVtb3ZlIGZpbGUgZnJvbSBEcm9wQm94IG9yIEFXUyBTM1xuaWYgKHVzZURyb3BCb3ggfHwgdXNlUzMpIHtcbiAgY29uc3QgX29yaWdSZW1vdmUgPSBDb2xsZWN0aW9ucy5maWxlcy5yZW1vdmU7XG4gIENvbGxlY3Rpb25zLmZpbGVzLnJlbW92ZSA9IGZ1bmN0aW9uKHNlYXJjaCkge1xuICAgIGNvbnN0IGN1cnNvciA9IHRoaXMuY29sbGVjdGlvbi5maW5kKHNlYXJjaCk7XG4gICAgY3Vyc29yLmZvckVhY2goKGZpbGVSZWYpID0+IHtcbiAgICAgIGZvciAobGV0IHZlcnNpb24gaW4gZmlsZVJlZi52ZXJzaW9ucykge1xuICAgICAgICBpZiAoZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXSkge1xuICAgICAgICAgIGNvbnN0IHZSZWYgPSBmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dO1xuICAgICAgICAgIGlmICh2UmVmICYmIHZSZWYubWV0YSAmJiB2UmVmLm1ldGEucGlwZVBhdGgpIHtcbiAgICAgICAgICAgIGlmICh1c2VEcm9wQm94KSB7XG4gICAgICAgICAgICAgIC8vIERyb3BCb3ggdXNhZ2U6XG4gICAgICAgICAgICAgIGNsaWVudC5yZW1vdmUodlJlZi5tZXRhLnBpcGVQYXRoLCAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gQVdTOlMzIHVzYWdlOlxuICAgICAgICAgICAgICBjbGllbnQuZGVsZXRlT2JqZWN0KHtcbiAgICAgICAgICAgICAgICBCdWNrZXQ6IHMzQ29uZi5idWNrZXQsXG4gICAgICAgICAgICAgICAgS2V5OiB2UmVmLm1ldGEucGlwZVBhdGgsXG4gICAgICAgICAgICAgIH0sIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8gQ2FsbCBvcmlnaW5hbCBtZXRob2RcbiAgICBfb3JpZ1JlbW92ZS5jYWxsKHRoaXMsIHNlYXJjaCk7XG4gIH07XG59XG5cbi8vIFJlbW92ZSBhbGwgZmlsZXMgb24gc2VydmVyIGxvYWQvcmVsb2FkLCB1c2VmdWwgd2hpbGUgdGVzdGluZy9kZXZlbG9wbWVudFxuLy8gTWV0ZW9yLnN0YXJ0dXAgLT4gQ29sbGVjdGlvbnMuZmlsZXMucmVtb3ZlIHt9XG5cbi8vIFJlbW92ZSBmaWxlcyBhbG9uZyB3aXRoIE1vbmdvREIgcmVjb3JkcyB0d28gbWludXRlcyBiZWZvcmUgZXhwaXJhdGlvbiBkYXRlXG4vLyBJZiB3ZSBoYXZlICdleHBpcmVBZnRlclNlY29uZHMnIGluZGV4IG9uICdtZXRhLmV4cGlyZUF0JyBmaWVsZCxcbi8vIGl0IHdvbid0IHJlbW92ZSBmaWxlcyB0aGVtc2VsdmVzLlxuTWV0ZW9yLnNldEludGVydmFsKCgpID0+IHtcbiAgQ29sbGVjdGlvbnMuZmlsZXMucmVtb3ZlKHtcbiAgICAnbWV0YS5leHBpcmVBdCc6IHtcbiAgICAgICRsdGU6IG5ldyBEYXRlKCtuZXcgRGF0ZSgpICsgMTIwMDAwKVxuICAgIH1cbiAgfSwgX2FwcC5OT09QKTtcbn0sIDEyMDAwMCk7XG4iLCJpbXBvcnQgeyBfYXBwIH0gICBmcm9tICcvaW1wb3J0cy9saWIvY29yZS5qcyc7XG5pbXBvcnQgeyBjaGVjayB9ICBmcm9tICdtZXRlb3IvY2hlY2snO1xuaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5cbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgZ20gZnJvbSAnZ20nO1xuLy9Tb21lIHBsYXRmb3JtcyBtYXkgYnVuZGxlIEltYWdlTWFnaWNrIGludG8gdGhlaXIgdG9vbHMgKGxpa2UgSGVyb2t1KS4gSW4gdGhpcyBjYXNlIHlvdSBtYXkgdXNlIEdyYXBoaWNzTWFnaWNrIGFzIEltYWdlbWFnaWNrIGluIHRoaXMgd2F5OlxuLy9ucG0gaW5zdGFsbCBnbSAtLXNhdmUgYW5kIHRoZW4gd2hlcmUgeW91IHVzZSBpdDpcbi8vY29uc3QgZ20gPSByZXF1aXJlKCdnbScpO1xuLy9jb25zdCBpbSA9IGdtLnN1YkNsYXNzKHsgaW1hZ2VNYWdpY2s6IHRydWUgfSk7XG4vL1BsZWFzZSBub3RlIHRoYXQgR00gd2FzIGNvbnNpZGVyZWQgc2xpZ2h0bHkgZmFzdGVyIHRoYW4gSU0gc28gYmVmb3JlIHlvdSBjaG9zZSBjb252ZW5pZW5jZSBvdmVyIHBlcmZvcm1hbmNlIHJlYWQgdGhlIGxhdGVzdCBuZXdzIGFib3V0IGl0LlxuLy9odHRwczovL21hemlyYS5jb20vYmxvZy9jb21wYXJpbmctc3BlZWQtaW1hZ2VtYWdpY2stZ3JhcGhpY3NtYWdpY2tcblxuY29uc3QgYm91bmQgPSBNZXRlb3IuYmluZEVudmlyb25tZW50KChjYWxsYmFjaykgPT4ge1xuICByZXR1cm4gY2FsbGJhY2soKTtcbn0pO1xuXG5fYXBwLmNyZWF0ZVRodW1ibmFpbHMgPSAoY29sbGVjdGlvbiwgZmlsZVJlZiwgY2IpID0+IHtcbiAgY2hlY2soZmlsZVJlZiwgT2JqZWN0KTtcblxuICBsZXQgaXNMYXN0ID0gZmFsc2U7XG4gIGNvbnN0IGZpbmlzaCA9IChlcnJvcikgPT4ge1xuICAgIGJvdW5kKCgpID0+IHtcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdbX2FwcC5jcmVhdGVUaHVtYm5haWxzXSBbZmluaXNoXScsIGVycm9yKTtcbiAgICAgICAgY2IgJiYgY2IgKGVycm9yKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChpc0xhc3QpIHtcbiAgICAgICAgICBjYiAmJiBjYih2b2lkIDAsIGZpbGVSZWYpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfTtcblxuICBmcy5leGlzdHMoZmlsZVJlZi5wYXRoLCAoZXhpc3RzKSA9PiB7XG4gICAgYm91bmQoKCkgPT4ge1xuICAgICAgaWYgKCFleGlzdHMpIHtcbiAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcignRmlsZSAnICsgZmlsZVJlZi5wYXRoICsgJyBub3QgZm91bmQgaW4gW2NyZWF0ZVRodW1ibmFpbHNdIE1ldGhvZCcpO1xuICAgICAgfVxuICAgICAgY29uc3QgaW1hZ2UgPSBnbShmaWxlUmVmLnBhdGgpO1xuICAgICAgY29uc3Qgc2l6ZXMgPSB7XG4gICAgICAgIHByZXZpZXc6IHtcbiAgICAgICAgICB3aWR0aDogNDAwXG4gICAgICAgIH0sXG4gICAgICAgIHRodW1ibmFpbDQwOiB7XG4gICAgICAgICAgd2lkdGg6IDQwLFxuICAgICAgICAgIHNxdWFyZTogdHJ1ZVxuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBpbWFnZS5zaXplKChlcnJvciwgZmVhdHVyZXMpID0+IHtcbiAgICAgICAgYm91bmQoKCkgPT4ge1xuICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW19hcHAuY3JlYXRlVGh1bWJuYWlsc10gW2ZvckVhY2ggc2l6ZXNdJywgZXJyb3IpO1xuICAgICAgICAgICAgZmluaXNoKG5ldyBNZXRlb3IuRXJyb3IoJ1tfYXBwLmNyZWF0ZVRodW1ibmFpbHNdIFtmb3JFYWNoIHNpemVzXScsIGVycm9yKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICAgIGNvbGxlY3Rpb24uY29sbGVjdGlvbi51cGRhdGUoZmlsZVJlZi5faWQsIHtcbiAgICAgICAgICAgICRzZXQ6IHtcbiAgICAgICAgICAgICAgJ21ldGEud2lkdGgnOiBmZWF0dXJlcy53aWR0aCxcbiAgICAgICAgICAgICAgJ21ldGEuaGVpZ2h0JzogZmVhdHVyZXMuaGVpZ2h0LFxuICAgICAgICAgICAgICAndmVyc2lvbnMub3JpZ2luYWwubWV0YS53aWR0aCc6IGZlYXR1cmVzLndpZHRoLFxuICAgICAgICAgICAgICAndmVyc2lvbnMub3JpZ2luYWwubWV0YS5oZWlnaHQnOiBmZWF0dXJlcy5oZWlnaHRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LCBfYXBwLk5PT1ApO1xuXG4gICAgICAgICAgT2JqZWN0LmtleXMoc2l6ZXMpLmZvckVhY2goKG5hbWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNpemUgPSBzaXplc1tuYW1lXTtcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSAoY29sbGVjdGlvbi5zdG9yYWdlUGF0aChmaWxlUmVmKSkgKyAnLycgKyBuYW1lICsgJy0nICsgZmlsZVJlZi5faWQgKyAnLicgKyBmaWxlUmVmLmV4dGVuc2lvbjtcbiAgICAgICAgICAgIGNvbnN0IGNvcHlQYXN0ZSA9ICgpID0+IHtcbiAgICAgICAgICAgICAgZnMuY29weShmaWxlUmVmLnBhdGgsIHBhdGgsIChmc0NvcHlFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChmc0NvcHlFcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbX2FwcC5jcmVhdGVUaHVtYm5haWxzXSBbZm9yRWFjaCBzaXplc10gW2ZzLmNvcHldJywgZnNDb3B5RXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICBmaW5pc2goZnNDb3B5RXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGNvbnN0IHVwZCA9IHsgJHNldDoge30gfTtcbiAgICAgICAgICAgICAgICAgIHVwZC4kc2V0W2B2ZXJzaW9ucy4ke25hbWV9YF0gPSB7XG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHNpemU6IGZpbGVSZWYuc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogZmlsZVJlZi50eXBlLFxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb246IGZpbGVSZWYuZXh0ZW5zaW9uLFxuICAgICAgICAgICAgICAgICAgICBtZXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGZlYXR1cmVzLndpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogZmVhdHVyZXMuaGVpZ2h0XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb24uY29sbGVjdGlvbi51cGRhdGUoZmlsZVJlZi5faWQsIHVwZCwgKGNvbFVwZEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICsraTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPT09IE9iamVjdC5rZXlzKHNpemVzKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICBpc0xhc3QgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZpbmlzaChjb2xVcGRFcnJvcik7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAoL3BuZ3xqcGU/Zy9pLnRlc3QoZmlsZVJlZi5leHRlbnNpb24pKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGltZyA9IGdtKGZpbGVSZWYucGF0aClcbiAgICAgICAgICAgICAgICAucXVhbGl0eSg3MClcbiAgICAgICAgICAgICAgICAuZGVmaW5lKCdmaWx0ZXI6c3VwcG9ydD0yJylcbiAgICAgICAgICAgICAgICAuZGVmaW5lKCdqcGVnOmZhbmN5LXVwc2FtcGxpbmc9ZmFsc2UnKVxuICAgICAgICAgICAgICAgIC5kZWZpbmUoJ2pwZWc6ZmFuY3ktdXBzYW1wbGluZz1vZmYnKVxuICAgICAgICAgICAgICAgIC5kZWZpbmUoJ3BuZzpjb21wcmVzc2lvbi1maWx0ZXI9NScpXG4gICAgICAgICAgICAgICAgLmRlZmluZSgncG5nOmNvbXByZXNzaW9uLWxldmVsPTknKVxuICAgICAgICAgICAgICAgIC5kZWZpbmUoJ3BuZzpjb21wcmVzc2lvbi1zdHJhdGVneT0xJylcbiAgICAgICAgICAgICAgICAuZGVmaW5lKCdwbmc6ZXhjbHVkZS1jaHVuaz1hbGwnKVxuICAgICAgICAgICAgICAgIC5hdXRvT3JpZW50KClcbiAgICAgICAgICAgICAgICAubm9Qcm9maWxlKClcbiAgICAgICAgICAgICAgICAuc3RyaXAoKVxuICAgICAgICAgICAgICAgIC5kaXRoZXIoZmFsc2UpXG4gICAgICAgICAgICAgICAgLmludGVybGFjZSgnTGluZScpXG4gICAgICAgICAgICAgICAgLmZpbHRlcignVHJpYW5nbGUnKTtcblxuICAgICAgICAgICAgICBjb25zdCB1cGRhdGVBbmRTYXZlID0gKHVwTlNhdmVFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmICh1cE5TYXZlRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW19hcHAuY3JlYXRlVGh1bWJuYWlsc10gW2ZvckVhY2ggc2l6ZXNdIFtpbWcucmVzaXplXScsIHVwTlNhdmVFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIGZpbmlzaCh1cE5TYXZlRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBmcy5zdGF0KHBhdGgsIChmc1N0YXRFcnJvciwgc3RhdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGZzU3RhdEVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbX2FwcC5jcmVhdGVUaHVtYm5haWxzXSBbZm9yRWFjaCBzaXplc10gW2ltZy5yZXNpemVdIFtmcy5zdGF0XScsIGZzU3RhdEVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbmlzaChmc1N0YXRFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgZ20ocGF0aCkuc2l6ZSgoZ21TaXplRXJyb3IsIGltZ0luZm8pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdtU2l6ZUVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW19hcHAuY3JlYXRlVGh1bWJuYWlsc10gW2ZvckVhY2ggc2l6ZXNdIFtpbWcucmVzaXplXSBbZnMuc3RhdF0gW2dtKHBhdGgpLnNpemVdJywgZ21TaXplRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbmlzaChnbVNpemVFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVwZCA9IHsgJHNldDoge30gfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkLiRzZXRbYHZlcnNpb25zLiR7bmFtZX1gXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IHN0YXQuc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBmaWxlUmVmLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBmaWxlUmVmLmV4dGVuc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBmaWxlUmVmLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGltZ0luZm8ud2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IGltZ0luZm8uaGVpZ2h0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb24uY29sbGVjdGlvbi51cGRhdGUoZmlsZVJlZi5faWQsIHVwZCwgKGNvbFVwZEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKytpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpID09PSBPYmplY3Qua2V5cyhzaXplcykubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0xhc3QgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5pc2goY29sVXBkRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgIGlmICghc2l6ZS5zcXVhcmUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZXMud2lkdGggPiBzaXplLndpZHRoKSB7XG4gICAgICAgICAgICAgICAgICBpbWcucmVzaXplKHNpemUud2lkdGgpLmludGVybGFjZSgnTGluZScpLndyaXRlKHBhdGgsIHVwZGF0ZUFuZFNhdmUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBjb3B5UGFzdGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IHggPSAwO1xuICAgICAgICAgICAgICAgIGxldCB5ID0gMDtcbiAgICAgICAgICAgICAgICBjb25zdCB3aWR0aFJhdGlvICA9IGZlYXR1cmVzLndpZHRoIC8gc2l6ZS53aWR0aDtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWlnaHRSYXRpbyA9IGZlYXR1cmVzLmhlaWdodCAvIHNpemUud2lkdGg7XG4gICAgICAgICAgICAgICAgbGV0IHdpZHRoTmV3ICAgICAgPSBzaXplLndpZHRoO1xuICAgICAgICAgICAgICAgIGxldCBoZWlnaHROZXcgICAgID0gc2l6ZS53aWR0aDtcblxuICAgICAgICAgICAgICAgIGlmIChoZWlnaHRSYXRpbyA8IHdpZHRoUmF0aW8pIHtcbiAgICAgICAgICAgICAgICAgIHdpZHRoTmV3ID0gKHNpemUud2lkdGggKiBmZWF0dXJlcy53aWR0aCkgLyBmZWF0dXJlcy5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICB4ID0gKHdpZHRoTmV3IC0gc2l6ZS53aWR0aCkgLyAyO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChoZWlnaHRSYXRpbyA+IHdpZHRoUmF0aW8pIHtcbiAgICAgICAgICAgICAgICAgIGhlaWdodE5ldyA9IChzaXplLndpZHRoICogZmVhdHVyZXMuaGVpZ2h0KSAvIGZlYXR1cmVzLndpZHRoO1xuICAgICAgICAgICAgICAgICAgeSA9IChoZWlnaHROZXcgLSBzaXplLndpZHRoKSAvIDI7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaW1nXG4gICAgICAgICAgICAgICAgICAucmVzaXplKHdpZHRoTmV3LCBoZWlnaHROZXcpXG4gICAgICAgICAgICAgICAgICAuY3JvcChzaXplLndpZHRoLCBzaXplLndpZHRoLCB4LCB5KVxuICAgICAgICAgICAgICAgICAgLmludGVybGFjZSgnTGluZScpXG4gICAgICAgICAgICAgICAgICAud3JpdGUocGF0aCwgdXBkYXRlQW5kU2F2ZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvcHlQYXN0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIHRydWU7XG59O1xuIiwiaW1wb3J0IHsgY2hlY2sgfSAgICAgICAgICAgICBmcm9tICdtZXRlb3IvY2hlY2snO1xuaW1wb3J0IHsgTWV0ZW9yIH0gICAgICAgICAgICBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IF9hcHAsIENvbGxlY3Rpb25zIH0gZnJvbSAnL2ltcG9ydHMvbGliL2NvcmUuanMnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG4gIGZpbGVzTGVuZ2h0KHVzZXJPbmx5ID0gZmFsc2UpIHtcbiAgICBjaGVjayh1c2VyT25seSwgQm9vbGVhbik7XG5cbiAgICBsZXQgc2VsZWN0b3I7XG4gICAgaWYgKHVzZXJPbmx5ICYmIHRoaXMudXNlcklkKSB7XG4gICAgICBzZWxlY3RvciA9IHtcbiAgICAgICAgdXNlcklkOiB0aGlzLnVzZXJJZFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKHRoaXMudXNlcklkKSB7XG4gICAgICBzZWxlY3RvciA9IHtcbiAgICAgICAgJG9yOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgJ21ldGEudW5saXN0ZWQnOiBmYWxzZSxcbiAgICAgICAgICAgICdtZXRhLnNlY3VyZWQnOiBmYWxzZSxcbiAgICAgICAgICAgICdtZXRhLmJsYW1lZCc6IHtcbiAgICAgICAgICAgICAgJGx0OiAzXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSwge1xuICAgICAgICAgICAgdXNlcklkOiB0aGlzLnVzZXJJZCxcbiAgICAgICAgICAgICdtZXRhLmJsYW1lZCc6IHtcbiAgICAgICAgICAgICAgJGx0OiAzXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBzZWxlY3RvciA9IHtcbiAgICAgICAgJ21ldGEudW5saXN0ZWQnOiBmYWxzZSxcbiAgICAgICAgJ21ldGEuc2VjdXJlZCc6IGZhbHNlLFxuICAgICAgICAnbWV0YS5ibGFtZWQnOiB7XG4gICAgICAgICAgJGx0OiAzXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBDb2xsZWN0aW9ucy5maWxlcy5maW5kKHNlbGVjdG9yKS5jb3VudCgpO1xuICB9LFxuICB1bmJsYW1lKF9pZCkge1xuICAgIGNoZWNrKF9pZCwgU3RyaW5nKTtcbiAgICBDb2xsZWN0aW9ucy5maWxlcy51cGRhdGUoe1xuICAgICAgX2lkOiBfaWRcbiAgICB9LCB7XG4gICAgICAkaW5jOiB7XG4gICAgICAgICdtZXRhLmJsYW1lZCc6IC0xXG4gICAgICB9XG4gICAgfSwgX2FwcC5OT09QKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcbiAgYmxhbWUoX2lkKSB7XG4gICAgY2hlY2soX2lkLCBTdHJpbmcpO1xuICAgIENvbGxlY3Rpb25zLmZpbGVzLnVwZGF0ZSh7XG4gICAgICBfaWQ6IF9pZFxuICAgIH0sIHtcbiAgICAgICRpbmM6IHtcbiAgICAgICAgJ21ldGEuYmxhbWVkJzogMVxuICAgICAgfVxuICAgIH0sIF9hcHAuTk9PUCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG4gIGNoYW5nZUFjY2VzcyhfaWQpIHtcbiAgICBjaGVjayhfaWQsIFN0cmluZyk7XG4gICAgaWYgKE1ldGVvci51c2VySWQoKSkge1xuICAgICAgY29uc3QgZmlsZSA9IENvbGxlY3Rpb25zLmZpbGVzLmZpbmRPbmUoe1xuICAgICAgICBfaWQ6IF9pZCxcbiAgICAgICAgdXNlcklkOiBNZXRlb3IudXNlcklkKClcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoZmlsZSkge1xuICAgICAgICBDb2xsZWN0aW9ucy5maWxlcy51cGRhdGUoX2lkLCB7XG4gICAgICAgICAgJHNldDoge1xuICAgICAgICAgICAgJ21ldGEudW5saXN0ZWQnOiBmaWxlLm1ldGEudW5saXN0ZWQgPyBmYWxzZSA6IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH0sIF9hcHAuTk9PUCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMSwgJ0FjY2VzcyBkZW5pZWQhJyk7XG4gIH0sXG4gIGNoYW5nZVByaXZhY3koX2lkKSB7XG4gICAgY2hlY2soX2lkLCBTdHJpbmcpO1xuICAgIGlmIChNZXRlb3IudXNlcklkKCkpIHtcbiAgICAgIGNvbnN0IGZpbGUgPSBDb2xsZWN0aW9ucy5maWxlcy5maW5kT25lKHtcbiAgICAgICAgX2lkOiBfaWQsXG4gICAgICAgIHVzZXJJZDogTWV0ZW9yLnVzZXJJZCgpXG4gICAgICB9KTtcblxuICAgICAgaWYgKGZpbGUpIHtcbiAgICAgICAgQ29sbGVjdGlvbnMuZmlsZXMudXBkYXRlKF9pZCwge1xuICAgICAgICAgICRzZXQ6IHtcbiAgICAgICAgICAgICdtZXRhLnVubGlzdGVkJzogdHJ1ZSxcbiAgICAgICAgICAgICdtZXRhLnNlY3VyZWQnOiBmaWxlLm1ldGEuc2VjdXJlZCA/IGZhbHNlIDogdHJ1ZVxuICAgICAgICAgIH1cbiAgICAgICAgfSwgX2FwcC5OT09QKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAxLCAnQWNjZXNzIGRlbmllZCEnKTtcbiAgfSxcbiAgZ2V0U2VydmljZUNvbmZpZ3VyYXRpb24oKSB7XG4gICAgcmV0dXJuIF9hcHAuc2M7XG4gIH1cbn0pO1xuIiwiaW1wb3J0IHsgY2hlY2sgfSAgICAgICBmcm9tICdtZXRlb3IvY2hlY2snO1xuaW1wb3J0IHsgTWV0ZW9yIH0gICAgICBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IENvbGxlY3Rpb25zIH0gZnJvbSAnL2ltcG9ydHMvbGliL2NvcmUuanMnO1xuXG5NZXRlb3IucHVibGlzaCgnbGF0ZXN0JywgZnVuY3Rpb24odGFrZSA9IDEwLCB1c2VyT25seSA9IGZhbHNlKSB7XG4gIGNoZWNrKHRha2UsIE51bWJlcik7XG4gIGNoZWNrKHVzZXJPbmx5LCBCb29sZWFuKTtcblxuICBsZXQgc2VsZWN0b3I7XG4gIGlmICh1c2VyT25seSAmJiB0aGlzLnVzZXJJZCkge1xuICAgIHNlbGVjdG9yID0ge1xuICAgICAgdXNlcklkOiB0aGlzLnVzZXJJZFxuICAgIH07XG4gIH0gZWxzZSBpZiAodGhpcy51c2VySWQpIHtcbiAgICBzZWxlY3RvciA9IHtcbiAgICAgICRvcjogW1xuICAgICAgICB7XG4gICAgICAgICAgJ21ldGEudW5saXN0ZWQnOiBmYWxzZSxcbiAgICAgICAgICAnbWV0YS5zZWN1cmVkJzogZmFsc2UsXG4gICAgICAgICAgJ21ldGEuYmxhbWVkJzoge1xuICAgICAgICAgICAgJGx0OiAzXG4gICAgICAgICAgfVxuICAgICAgICB9LCB7XG4gICAgICAgICAgdXNlcklkOiB0aGlzLnVzZXJJZCxcbiAgICAgICAgICAnbWV0YS5ibGFtZWQnOiB7XG4gICAgICAgICAgICAkbHQ6IDNcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHNlbGVjdG9yID0ge1xuICAgICAgJ21ldGEudW5saXN0ZWQnOiBmYWxzZSxcbiAgICAgICdtZXRhLnNlY3VyZWQnOiBmYWxzZSxcbiAgICAgICdtZXRhLmJsYW1lZCc6IHtcbiAgICAgICAgJGx0OiAzXG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBDb2xsZWN0aW9ucy5maWxlcy5maW5kKHNlbGVjdG9yLCB7XG4gICAgbGltaXQ6IHRha2UsXG4gICAgc29ydDoge1xuICAgICAgJ21ldGEuY3JlYXRlZF9hdCc6IC0xXG4gICAgfSxcbiAgICBmaWVsZHM6IHtcbiAgICAgIF9pZDogMSxcbiAgICAgIG5hbWU6IDEsXG4gICAgICBzaXplOiAxLFxuICAgICAgbWV0YTogMSxcbiAgICAgIHR5cGU6IDEsXG4gICAgICBpc1BERjogMSxcbiAgICAgIGlzVGV4dDogMSxcbiAgICAgIGlzSlNPTjogMSxcbiAgICAgIGlzVmlkZW86IDEsXG4gICAgICBpc0F1ZGlvOiAxLFxuICAgICAgaXNJbWFnZTogMSxcbiAgICAgIHVzZXJJZDogMSxcbiAgICAgICd2ZXJzaW9ucy50aHVtYm5haWw0MC5leHRlbnNpb24nOiAxLFxuICAgICAgJ3ZlcnNpb25zLnByZXZpZXcuZXh0ZW5zaW9uJzogMSxcbiAgICAgIGV4dGVuc2lvbjogMSxcbiAgICAgIF9jb2xsZWN0aW9uTmFtZTogMSxcbiAgICAgIF9kb3dubG9hZFJvdXRlOiAxXG4gICAgfVxuICB9KS5jdXJzb3I7XG59KTtcblxuTWV0ZW9yLnB1Ymxpc2goJ2ZpbGUnLCBmdW5jdGlvbihfaWQpIHtcbiAgY2hlY2soX2lkLCBTdHJpbmcpO1xuXG4gIGxldCBzZWxlY3RvciA9IHtcbiAgICBfaWQ6IF9pZCxcbiAgICAnbWV0YS5zZWN1cmVkJzogZmFsc2VcbiAgfTtcblxuICBpZiAodGhpcy51c2VySWQpIHtcbiAgICBzZWxlY3RvciA9IHtcbiAgICAgICRvcjogW3NlbGVjdG9yLCB7XG4gICAgICAgIF9pZDogX2lkLFxuICAgICAgICAnbWV0YS5zZWN1cmVkJzogdHJ1ZSxcbiAgICAgICAgdXNlcklkOiB0aGlzLnVzZXJJZFxuICAgICAgfV1cbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIENvbGxlY3Rpb25zLmZpbGVzLmZpbmQoc2VsZWN0b3IsIHtcbiAgICBmaWVsZHM6IHtcbiAgICAgIF9pZDogMSxcbiAgICAgIG5hbWU6IDEsXG4gICAgICBzaXplOiAxLFxuICAgICAgdHlwZTogMSxcbiAgICAgIG1ldGE6IDEsXG4gICAgICBpc1BERjogMSxcbiAgICAgIGlzVGV4dDogMSxcbiAgICAgIGlzSlNPTjogMSxcbiAgICAgIGlzVmlkZW86IDEsXG4gICAgICBpc0F1ZGlvOiAxLFxuICAgICAgaXNJbWFnZTogMSxcbiAgICAgIGV4dGVuc2lvbjogMSxcbiAgICAgICd2ZXJzaW9ucy50aHVtYm5haWw0MC5leHRlbnNpb24nOiAxLFxuICAgICAgJ3ZlcnNpb25zLnByZXZpZXcuZXh0ZW5zaW9uJzogMSxcbiAgICAgIF9jb2xsZWN0aW9uTmFtZTogMSxcbiAgICAgIF9kb3dubG9hZFJvdXRlOiAxXG4gICAgfVxuICB9KS5jdXJzb3I7XG59KTtcbiIsImltcG9ydCB7IF9hcHAgfSAgICAgICAgICAgICAgICAgZnJvbSAnL2ltcG9ydHMvbGliL2NvcmUuanMnO1xuaW1wb3J0IHsgU2VydmljZUNvbmZpZ3VyYXRpb24gfSBmcm9tICdtZXRlb3Ivc2VydmljZS1jb25maWd1cmF0aW9uJztcblxuX2FwcC5zYyA9IHt9O1xuU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMucmVtb3ZlKHt9KTtcblxuaWYgKHByb2Nlc3MuZW52LkFDQ09VTlRTX01FVEVPUl9JRCAmJiBwcm9jZXNzLmVudi5BQ0NPVU5UU19NRVRFT1JfU0VDKSB7XG4gIF9hcHAuc2MubWV0ZW9yID0gdHJ1ZTtcbiAgU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMudXBzZXJ0KHtcbiAgICBzZXJ2aWNlOiAnbWV0ZW9yLWRldmVsb3BlcidcbiAgfSwge1xuICAgICRzZXQ6IHtcbiAgICAgIHNlY3JldDogcHJvY2Vzcy5lbnYuQUNDT1VOVFNfTUVURU9SX1NFQyxcbiAgICAgIGNsaWVudElkOiBwcm9jZXNzLmVudi5BQ0NPVU5UU19NRVRFT1JfSUQsXG4gICAgICBsb2dpblN0eWxlOiAncmVkaXJlY3QnXG4gICAgfVxuICB9KTtcbn1cblxuaWYgKHByb2Nlc3MuZW52LkFDQ09VTlRTX0dJVEhVQl9JRCAmJiBwcm9jZXNzLmVudi5BQ0NPVU5UU19HSVRIVUJfU0VDKSB7XG4gIF9hcHAuc2MuZ2l0aHViID0gdHJ1ZTtcbiAgU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMudXBzZXJ0KHtcbiAgICBzZXJ2aWNlOiAnZ2l0aHViJ1xuICB9LCB7XG4gICAgJHNldDoge1xuICAgICAgc2VjcmV0OiBwcm9jZXNzLmVudi5BQ0NPVU5UU19HSVRIVUJfU0VDLFxuICAgICAgY2xpZW50SWQ6IHByb2Nlc3MuZW52LkFDQ09VTlRTX0dJVEhVQl9JRCxcbiAgICAgIGxvZ2luU3R5bGU6ICdyZWRpcmVjdCdcbiAgICB9XG4gIH0pO1xufVxuXG5pZiAocHJvY2Vzcy5lbnYuQUNDT1VOVFNfVFdJVFRFUl9JRCAmJiBwcm9jZXNzLmVudi5BQ0NPVU5UU19UV0lUVEVSX1NFQykge1xuICBfYXBwLnNjLnR3aXR0ZXIgPSB0cnVlO1xuICBTZXJ2aWNlQ29uZmlndXJhdGlvbi5jb25maWd1cmF0aW9ucy51cHNlcnQoe1xuICAgIHNlcnZpY2U6ICd0d2l0dGVyJ1xuICB9LCB7XG4gICAgJHNldDoge1xuICAgICAgbG9naW5TdHlsZTogJ3JlZGlyZWN0JyxcbiAgICAgIHNlY3JldDogcHJvY2Vzcy5lbnYuQUNDT1VOVFNfVFdJVFRFUl9TRUMsXG4gICAgICBjb25zdW1lcktleTogcHJvY2Vzcy5lbnYuQUNDT1VOVFNfVFdJVFRFUl9JRFxuICAgIH1cbiAgfSk7XG59XG5cbmlmIChwcm9jZXNzLmVudi5BQ0NPVU5UU19GQUNFQk9PS19JRCAmJiBwcm9jZXNzLmVudi5BQ0NPVU5UU19GQUNFQk9PS19TRUMpIHtcbiAgX2FwcC5zYy5mYWNlYm9vayA9IHRydWU7XG4gIFNlcnZpY2VDb25maWd1cmF0aW9uLmNvbmZpZ3VyYXRpb25zLnVwc2VydCh7XG4gICAgc2VydmljZTogJ2ZhY2Vib29rJ1xuICB9LCB7XG4gICAgJHNldDoge1xuICAgICAgc2VjcmV0OiBwcm9jZXNzLmVudi5BQ0NPVU5UU19GQUNFQk9PS19TRUMsXG4gICAgICBhcHBJZDogcHJvY2Vzcy5lbnYuQUNDT1VOVFNfRkFDRUJPT0tfSUQsXG4gICAgICBsb2dpblN0eWxlOiAncmVkaXJlY3QnXG4gICAgfVxuICB9KTtcbn1cbiIsIi8vIGltcG9ydCB7IFdlYkFwcCB9IGZyb20gJ21ldGVvci93ZWJhcHAnO1xuLy8gaW1wb3J0IFNwaWRlcmFibGUgZnJvbSAnbWV0ZW9yL29zdHJpbzpzcGlkZXJhYmxlLW1pZGRsZXdhcmUnO1xuLy9cbi8vIFdlYkFwcC5jb25uZWN0SGFuZGxlcnMudXNlKG5ldyBTcGlkZXJhYmxlKHtcbi8vICAgcm9vdFVSTDogJ2h0dHBzOi8vZmlsZXMudmVsaW92LmNvbScsXG4vLyAgIHNlcnZpY2VVUkw6ICdodHRwczovL3JlbmRlci5vc3RyLmlvJyxcbi8vICAgYXV0aDogJ3h4eDp5eXknXG4vLyB9KSk7XG4iLCJpbXBvcnQgJy9pbXBvcnRzL3NlcnZlci9maWxlcy5jb2xsZWN0aW9uLmpzJztcbmltcG9ydCAnL2ltcG9ydHMvc2VydmVyL2ltYWdlLXByb2Nlc3NpbmcuanMnO1xuaW1wb3J0ICcvaW1wb3J0cy9zZXJ2ZXIvbWV0aG9kcy5qcyc7XG5pbXBvcnQgJy9pbXBvcnRzL3NlcnZlci9wdWJsaWNhdGlvbnMuanMnO1xuaW1wb3J0ICcvaW1wb3J0cy9zZXJ2ZXIvc2VydmljZS1jb25maWd1cmF0aW9ucy5qcyc7XG5pbXBvcnQgJy9pbXBvcnRzL3NlcnZlci9zcGlkZXJhYmxlLmpzJztcbiJdfQ==
