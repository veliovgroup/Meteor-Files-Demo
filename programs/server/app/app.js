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
module.link("./routes.js");
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
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let FlowRouter;
module.link("meteor/ostrio:flow-router-extra", {
  FlowRouter(v) {
    FlowRouter = v;
  }

}, 1);

let _app, Collections;

module.link("/imports/lib/core.js", {
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
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Random;
module.link("meteor/random", {
  Random(v) {
    Random = v;
  }

}, 1);
let filesize;
module.link("meteor/mrt:filesize", {
  filesize(v) {
    filesize = v;
  }

}, 2);
let FilesCollection;
module.link("meteor/ostrio:files", {
  FilesCollection(v) {
    FilesCollection = v;
  }

}, 3);

let _app, Collections;

module.link("/imports/lib/core.js", {
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

module.link("/imports/lib/core.js", {
  _app(v) {
    _app = v;
  }

}, 0);
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 1);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 2);
let fs;
module.link("fs-extra", {
  default(v) {
    fs = v;
  }

}, 3);
let gm;
module.link("gm", {
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
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 0);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 1);

let _app, Collections;

module.link("/imports/lib/core.js", {
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
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 0);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 1);
let Collections;
module.link("/imports/lib/core.js", {
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

module.link("/imports/lib/core.js", {
  _app(v) {
    _app = v;
  }

}, 0);
let ServiceConfiguration;
module.link("meteor/service-configuration", {
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
module.link("/imports/server/files.collection.js");
module.link("/imports/server/image-processing.js");
module.link("/imports/server/methods.js");
module.link("/imports/server/publications.js");
module.link("/imports/server/service-configurations.js");
module.link("/imports/server/spiderable.js");
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/server/core.js");
//# sourceURL=meteor://💻app/app/app.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9saWIvY29yZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9saWIvcm91dGVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3NlcnZlci9maWxlcy5jb2xsZWN0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3NlcnZlci9pbWFnZS1wcm9jZXNzaW5nLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3NlcnZlci9tZXRob2RzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3NlcnZlci9wdWJsaWNhdGlvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvc2VydmVyL3NlcnZpY2UtY29uZmlndXJhdGlvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvc2VydmVyL3NwaWRlcmFibGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3NlcnZlci9jb3JlLmpzIl0sIm5hbWVzIjpbIm1vZHVsZSIsImV4cG9ydCIsIl9hcHAiLCJDb2xsZWN0aW9ucyIsImxpbmsiLCJOT09QIiwiaXNVbmRlZmluZWQiLCJvYmoiLCJpc09iamVjdCIsImlzQXJyYXkiLCJpc0Z1bmN0aW9uIiwiT2JqZWN0IiwiQXJyYXkiLCJpc0Jvb2xlYW4iLCJwcm90b3R5cGUiLCJ0b1N0cmluZyIsImNhbGwiLCJpc0VtcHR5IiwiaXNEYXRlIiwia2V5cyIsImxlbmd0aCIsImlzU3RyaW5nIiwiY2xvbmUiLCJzbGljZSIsImFzc2lnbiIsImhhcyIsIl9vYmoiLCJwYXRoIiwiaGFzT3duUHJvcGVydHkiLCJpIiwib21pdCIsImNsZWFyIiwicGljayIsIm1hcCIsImtleSIsIm5vdyIsIkRhdGUiLCJ0aHJvdHRsZSIsImZ1bmMiLCJ3YWl0Iiwib3B0aW9ucyIsInByZXZpb3VzIiwidGltZW91dCIsInJlc3VsdCIsInRoYXQiLCJzZWxmIiwiYXJncyIsImxhdGVyIiwibGVhZGluZyIsImFwcGx5IiwidGhyb3R0bGVkIiwicmVtYWluaW5nIiwiYXJndW1lbnRzIiwiY2xlYXJUaW1lb3V0IiwidHJhaWxpbmciLCJzZXRUaW1lb3V0IiwiY2FuY2VsIiwiaGVscGVycyIsIk1ldGVvciIsInYiLCJGbG93Um91dGVyIiwicm91dGUiLCJuYW1lIiwiYWN0aW9uIiwicmVuZGVyIiwid2FpdE9uIiwiaXNDbGllbnQiLCJzdWJzIiwic3Vic2NyaWJlIiwidXNlck9ubHkiLCJnZXQiLCJ3aGlsZVdhaXRpbmciLCJzdWJzY3JpcHRpb25zIiwiaXNTZXJ2ZXIiLCJyZWdpc3RlciIsImZhc3RSZW5kZXIiLCJ0aXRsZSIsInVzZXJJZCIsIm1ldGEiLCJrZXl3b3JkcyIsIml0ZW1wcm9wIiwiY29udGVudCIsImRlc2NyaXB0aW9uIiwicHJvcGVydHkiLCJwYXJhbXMiLCJxdWVyeVBhcmFtcyIsImZpbGUiLCJhYnNvbHV0ZVVybCIsImltYWdlIiwiaHJlZiIsIl9pZCIsIm9uTm9EYXRhIiwiZGF0YSIsImZpbGVzIiwiZmluZE9uZSIsIlJhbmRvbSIsImZpbGVzaXplIiwiRmlsZXNDb2xsZWN0aW9uIiwidXNlRHJvcEJveCIsInVzZVMzIiwiY2xpZW50Iiwic2VuZFRvU3RvcmFnZSIsImZzIiwicmVxdWlyZSIsIlMzIiwic3RyZWFtIiwicmVxdWVzdCIsIkRyb3Bib3giLCJib3VuZCIsImJpbmRFbnZpcm9ubWVudCIsImNhbGxiYWNrIiwicHJvY2VzcyIsImVudiIsIkRST1BCT1giLCJzZXR0aW5ncyIsImRyb3Bib3giLCJKU09OIiwicGFyc2UiLCJzMyIsInMzQ29uZiIsImRiQ29uZiIsInNlY3JldCIsInRva2VuIiwiQ2xpZW50IiwiYnVja2V0IiwicmVnaW9uIiwic2VjcmV0QWNjZXNzS2V5IiwiYWNjZXNzS2V5SWQiLCJzc2xFbmFibGVkIiwiaHR0cE9wdGlvbnMiLCJhZ2VudCIsInN0b3JhZ2VQYXRoIiwiY29sbGVjdGlvbk5hbWUiLCJhbGxvd0NsaWVudENvZGUiLCJwcm90ZWN0ZWQiLCJmaWxlT2JqIiwic2VjdXJlZCIsIm9uQmVmb3JlUmVtb3ZlIiwiY3Vyc29yIiwicmVzIiwiaW5kZXhPZiIsIm9uQmVmb3JlVXBsb2FkIiwic2l6ZSIsImRvd25sb2FkQ2FsbGJhY2siLCJxdWVyeSIsImRvd25sb2FkIiwiY29sbGVjdGlvbiIsInVwZGF0ZSIsIiRpbmMiLCJpbnRlcmNlcHREb3dubG9hZCIsImh0dHAiLCJmaWxlUmVmIiwidmVyc2lvbiIsInZlcnNpb25zIiwicGlwZUZyb20iLCJzZXJ2ZSIsInVybCIsImhlYWRlcnMiLCJwaXBlUGF0aCIsIm9wdHMiLCJCdWNrZXQiLCJLZXkiLCJyYW5nZSIsInZSZWYiLCJhcnJheSIsInNwbGl0Iiwic3RhcnQiLCJwYXJzZUludCIsImVuZCIsImlzTmFOIiwiY2h1bmtTaXplIiwiUmFuZ2UiLCJmaWxlQ29sbCIsImdldE9iamVjdCIsImVycm9yIiwiY29uc29sZSIsInJlc3BvbnNlIiwiZmluaXNoZWQiLCJodHRwUmVzcG9uc2UiLCJyZXBsYWNlIiwiZGF0YVN0cmVhbSIsIlBhc3NUaHJvdWdoIiwiQm9keSIsImRlbnlDbGllbnQiLCJvbiIsIl9maWxlUmVmIiwibWFrZVVybCIsInN0YXQiLCJ0cmllc1VybCIsImxvbmciLCJkb3dubG9hZEhhY2siLCJ4bWwiLCJ1cGQiLCIkc2V0IiwidXBkRXJyb3IiLCJ1bmxpbmsiLCJ3cml0ZVRvREIiLCJ0cmllc1NlbmQiLCJ3cml0ZUZpbGUiLCJleHRlbnNpb24iLCJyZWFkRmlsZSIsInRyaWVzUmVhZCIsImZpbGVQYXRoIiwiaWQiLCJwdXRPYmplY3QiLCJTdG9yYWdlQ2xhc3MiLCJjcmVhdGVSZWFkU3RyZWFtIiwiQ29udGVudFR5cGUiLCJ0eXBlIiwidGVzdCIsImNyZWF0ZVRodW1ibmFpbHMiLCJfb3JpZ1JlbW92ZSIsInJlbW92ZSIsInNlYXJjaCIsImZpbmQiLCJmb3JFYWNoIiwiZGVsZXRlT2JqZWN0Iiwic2V0SW50ZXJ2YWwiLCIkbHRlIiwiY2hlY2siLCJkZWZhdWx0IiwiZ20iLCJjYiIsImlzTGFzdCIsImZpbmlzaCIsImV4aXN0cyIsIkVycm9yIiwic2l6ZXMiLCJwcmV2aWV3Iiwid2lkdGgiLCJ0aHVtYm5haWw0MCIsInNxdWFyZSIsImZlYXR1cmVzIiwiaGVpZ2h0IiwiY29weVBhc3RlIiwiY29weSIsImZzQ29weUVycm9yIiwiY29sVXBkRXJyb3IiLCJpbWciLCJxdWFsaXR5IiwiZGVmaW5lIiwiYXV0b09yaWVudCIsIm5vUHJvZmlsZSIsInN0cmlwIiwiZGl0aGVyIiwiaW50ZXJsYWNlIiwiZmlsdGVyIiwidXBkYXRlQW5kU2F2ZSIsInVwTlNhdmVFcnJvciIsImZzU3RhdEVycm9yIiwiZ21TaXplRXJyb3IiLCJpbWdJbmZvIiwicmVzaXplIiwid3JpdGUiLCJ4IiwieSIsIndpZHRoUmF0aW8iLCJoZWlnaHRSYXRpbyIsIndpZHRoTmV3IiwiaGVpZ2h0TmV3IiwiY3JvcCIsIm1ldGhvZHMiLCJmaWxlc0xlbmdodCIsIkJvb2xlYW4iLCJzZWxlY3RvciIsIiRvciIsIiRsdCIsImNvdW50IiwidW5ibGFtZSIsIlN0cmluZyIsImJsYW1lIiwiY2hhbmdlQWNjZXNzIiwidW5saXN0ZWQiLCJjaGFuZ2VQcml2YWN5IiwiZ2V0U2VydmljZUNvbmZpZ3VyYXRpb24iLCJzYyIsInB1Ymxpc2giLCJ0YWtlIiwiTnVtYmVyIiwibGltaXQiLCJzb3J0IiwiZmllbGRzIiwiaXNQREYiLCJpc1RleHQiLCJpc0pTT04iLCJpc1ZpZGVvIiwiaXNBdWRpbyIsImlzSW1hZ2UiLCJfY29sbGVjdGlvbk5hbWUiLCJfZG93bmxvYWRSb3V0ZSIsIlNlcnZpY2VDb25maWd1cmF0aW9uIiwiY29uZmlndXJhdGlvbnMiLCJBQ0NPVU5UU19NRVRFT1JfSUQiLCJBQ0NPVU5UU19NRVRFT1JfU0VDIiwibWV0ZW9yIiwidXBzZXJ0Iiwic2VydmljZSIsImNsaWVudElkIiwibG9naW5TdHlsZSIsIkFDQ09VTlRTX0dJVEhVQl9JRCIsIkFDQ09VTlRTX0dJVEhVQl9TRUMiLCJnaXRodWIiLCJBQ0NPVU5UU19UV0lUVEVSX0lEIiwiQUNDT1VOVFNfVFdJVFRFUl9TRUMiLCJ0d2l0dGVyIiwiY29uc3VtZXJLZXkiLCJBQ0NPVU5UU19GQUNFQk9PS19JRCIsIkFDQ09VTlRTX0ZBQ0VCT09LX1NFQyIsImZhY2Vib29rIiwiYXBwSWQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUFBLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjO0FBQUNDLE1BQUksRUFBQyxNQUFJQSxJQUFWO0FBQWVDLGFBQVcsRUFBQyxNQUFJQTtBQUEvQixDQUFkO0FBQTJESCxNQUFNLENBQUNJLElBQVAsQ0FBWSxhQUFaO0FBRTNELE1BQU1ELFdBQVcsR0FBRyxFQUFwQjtBQUNBLE1BQU1ELElBQUksR0FBRztBQUNYRyxNQUFJLEdBQUUsQ0FBRSxDQURHOztBQUVYQyxhQUFXLENBQUNDLEdBQUQsRUFBTTtBQUNmLFdBQU9BLEdBQUcsS0FBSyxLQUFLLENBQXBCO0FBQ0QsR0FKVTs7QUFLWEMsVUFBUSxDQUFDRCxHQUFELEVBQU07QUFDWixRQUFJLEtBQUtFLE9BQUwsQ0FBYUYsR0FBYixLQUFxQixLQUFLRyxVQUFMLENBQWdCSCxHQUFoQixDQUF6QixFQUErQztBQUM3QyxhQUFPLEtBQVA7QUFDRDs7QUFDRCxXQUFPQSxHQUFHLEtBQUtJLE1BQU0sQ0FBQ0osR0FBRCxDQUFyQjtBQUNELEdBVlU7O0FBV1hFLFNBQU8sQ0FBQ0YsR0FBRCxFQUFNO0FBQ1gsV0FBT0ssS0FBSyxDQUFDSCxPQUFOLENBQWNGLEdBQWQsQ0FBUDtBQUNELEdBYlU7O0FBY1hNLFdBQVMsQ0FBQ04sR0FBRCxFQUFNO0FBQ2IsV0FBT0EsR0FBRyxLQUFLLElBQVIsSUFBZ0JBLEdBQUcsS0FBSyxLQUF4QixJQUFpQ0ksTUFBTSxDQUFDRyxTQUFQLENBQWlCQyxRQUFqQixDQUEwQkMsSUFBMUIsQ0FBK0JULEdBQS9CLE1BQXdDLGtCQUFoRjtBQUNELEdBaEJVOztBQWlCWEcsWUFBVSxDQUFDSCxHQUFELEVBQU07QUFDZCxXQUFPLE9BQU9BLEdBQVAsS0FBZSxVQUFmLElBQTZCLEtBQXBDO0FBQ0QsR0FuQlU7O0FBb0JYVSxTQUFPLENB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QUU7QUFDSnlHLGdCQUFVLEVBQUUsVUFEUjtBQUVKakwsWUFBTSxFQUFFVixPQUFPLENBQUNDLEdBQVIsQ0FBWStMLG9CQUZoQjtBQUdKRSxpQkFBVyxFQUFFbE0sT0FBTyxDQUFDQyxHQUFSLENBQVk4TDtBQUhyQjtBQURMLEdBRkg7QUFTRDs7QUFFRCxJQUFJL0wsT0FBTyxDQUFDQyxHQUFSLENBQVlrTSxvQkFBWixJQUFvQ25NLE9BQU8sQ0FBQ0MsR0FBUixDQUFZbU0scUJBQXBELEVBQTJFO0FBQ3pFalQsTUFBSSxDQUFDaVIsRUFBTCxDQUFRaUMsUUFBUixHQUFtQixJQUFuQjtBQUNBbEIsc0JBQW9CLENBQUNDLGNBQXJCLENBQW9DSSxNQUFwQyxDQUEyQztBQUN6Q0MsV0FBTyxFQUFFO0FBRGdDLEdBQTNDLEVBRUc7QUFDRHZHLFFBQUksRUFBRTtBQUNKeEUsWUFBTSxFQUFFVixPQUFPLENBQUNDLEdBQVIsQ0FBWW1NLHFCQURoQjtBQUVKRSxXQUFLLEVBQUV0TSxPQUFPLENBQUNDLEdBQVIsQ0FBWWtNLG9CQUZmO0FBR0pSLGdCQUFVLEVBQUU7QUFIUjtBQURMLEdBRkg7QUFTRCxDOzs7Ozs7Ozs7OztBQ3hERDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE87Ozs7Ozs7Ozs7O0FDUEExUyxNQUFNLENBQUNJLElBQVAsQ0FBWSxxQ0FBWjtBQUFtREosTUFBTSxDQUFDSSxJQUFQLENBQVkscUNBQVo7QUFBbURKLE1BQU0sQ0FBQ0ksSUFBUCxDQUFZLDRCQUFaO0FBQTBDSixNQUFNLENBQUNJLElBQVAsQ0FBWSxpQ0FBWjtBQUErQ0osTUFBTSxDQUFDSSxJQUFQLENBQVksMkNBQVo7QUFBeURKLE1BQU0sQ0FBQ0ksSUFBUCxDQUFZLCtCQUFaLEUiLCJmaWxlIjoiL2FwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnLi9yb3V0ZXMuanMnO1xuXG5jb25zdCBDb2xsZWN0aW9ucyA9IHt9O1xuY29uc3QgX2FwcCA9IHtcbiAgTk9PUCgpe30sXG4gIGlzVW5kZWZpbmVkKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHZvaWQgMDtcbiAgfSxcbiAgaXNPYmplY3Qob2JqKSB7XG4gICAgaWYgKHRoaXMuaXNBcnJheShvYmopIHx8IHRoaXMuaXNGdW5jdGlvbihvYmopKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBvYmogPT09IE9iamVjdChvYmopO1xuICB9LFxuICBpc0FycmF5KG9iaikge1xuICAgIHJldHVybiBBcnJheS5pc0FycmF5KG9iaik7XG4gIH0sXG4gIGlzQm9vbGVhbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB0cnVlIHx8IG9iaiA9PT0gZmFsc2UgfHwgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEJvb2xlYW5dJztcbiAgfSxcbiAgaXNGdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ2Z1bmN0aW9uJyB8fCBmYWxzZTtcbiAgfSxcbiAgaXNFbXB0eShvYmopIHtcbiAgICBpZiAodGhpcy5pc0RhdGUob2JqKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAodGhpcy5pc09iamVjdChvYmopKSB7XG4gICAgICByZXR1cm4gIU9iamVjdC5rZXlzKG9iaikubGVuZ3RoO1xuICAgIH1cbiAgICBpZiAodGhpcy5pc0FycmF5KG9iaikgfHwgdGhpcy5pc1N0cmluZyhvYmopKSB7XG4gICAgICByZXR1cm4gIW9iai5sZW5ndGg7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcbiAgY2xvbmUob2JqKSB7XG4gICAgaWYgKCF0aGlzLmlzT2JqZWN0KG9iaikpIHJldHVybiBvYmo7XG4gICAgcmV0dXJuIHRoaXMuaXNBcnJheShvYmopID8gb2JqLnNsaWNlKCkgOiBPYmplY3QuYXNzaWduKHt9LCBvYmopO1xuICB9LFxuICBoYXMoX29iaiwgcGF0aCkge1xuICAgIGxldCBvYmogPSBfb2JqO1xuICAgIGlmICghdGhpcy5pc09iamVjdChvYmopKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghdGhpcy5pc0FycmF5KHBhdGgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5pc09iamVjdChvYmopICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHBhdGgpO1xuICAgIH1cblxuICAgIGNvbnN0IGxlbmd0aCA9IHBhdGgubGVuZ3RoO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcGF0aFtpXSkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgb2JqID0gb2JqW3BhdGhbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gISFsZW5ndGg7XG4gIH0sXG4gIG9taXQob2JqLCAuLi5rZXlzKSB7XG4gICAgY29uc3QgY2xlYXIgPSBPYmplY3QuYXNzaWduKHt9LCBvYmopO1xuICAgIGZvciAobGV0IGkgPSBrZXlzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICBkZWxldGUgY2xlYXJba2V5c1tpXV07XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsZWFyO1xuICB9LFxuICBwaWNrKG9iaiwgLi4ua2V5cykge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCAuLi5rZXlzLm1hcChrZXkgPT4gKHtba2V5XTogb2JqW2tleV19KSkpO1xuICB9LFxuICBub3c6IERhdGUubm93LFxuICB0aHJvdHRsZShmdW5jLCB3YWl0LCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgcHJldmlvdXMgPSAwO1xuICAgIGxldCB0aW1lb3V0ID0gbnVsbDtcbiAgICBsZXQgcmVzdWx0O1xuICAgIGNvbnN0IHRoYXQgPSB0aGlzO1xuICAgIGxldCBzZWxmO1xuICAgIGxldCBhcmdzO1xuXG4gICAgY29uc3QgbGF0ZXIgPSAoKSA9PiB7XG4gICAgICBwcmV2aW91cyA9IG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UgPyAwIDogdGhhdC5ub3coKTtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShzZWxmLCBhcmdzKTtcbiAgICAgIGlmICghdGltZW91dCkgc2VsZiA9IGFyZ3MgPSBudWxsO1xuICAgIH07XG5cbiAgICBjb25zdCB0aHJvdHRsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zdCBub3cgPSB0aGF0Lm5vdygpO1xuICAgICAgaWYgKCFwcmV2aW91cyAmJiBvcHRpb25zLmxlYWRpbmcgPT09IGZhbHNlKSBwcmV2aW91cyA9IG5vdztcbiAgICAgIGNvbnN0IHJlbWFpbmluZyA9IHdhaXQgLSAobm93IC0gcHJldmlvdXMpO1xuICAgICAgc2VsZiA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwIHx8IHJlbWFpbmluZyA+IHdhaXQpIHtcbiAgICAgICAgaWYgKHRpbWVvdXQpIHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoc2VsZiwgYXJncyk7XG4gICAgICAgIGlmICghdGltZW91dCkgc2VsZiA9IGFyZ3MgPSBudWxsO1xuICAgICAgfSBlbHNlIGlmICghdGltZW91dCAmJiBvcHRpb25zLnRyYWlsaW5nICE9PSBmYWxzZSkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgcmVtYWluaW5nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcblxuICAgIHRocm90dGxlZC5jYW5jZWwgPSAoKSA9PiB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICBwcmV2aW91cyA9IDA7XG4gICAgICB0aW1lb3V0ID0gc2VsZiA9IGFyZ3MgPSBudWxsO1xuICAgIH07XG5cbiAgICByZXR1cm4gdGhyb3R0bGVkO1xuICB9XG59O1xuXG5jb25zdCBoZWxwZXJzID0gWydTdHJpbmcnLCAnTnVtYmVyJywgJ0RhdGUnXTtcbmZvciAobGV0IGkgPSAwOyBpIDwgaGVscGVycy5sZW5ndGg7IGkrKykge1xuICBfYXBwWydpcycgKyBoZWxwZXJzW2ldXSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0ICcgKyBoZWxwZXJzW2ldICsgJ10nO1xuICB9O1xufVxuXG5leHBvcnQgeyBfYXBwLCBDb2xsZWN0aW9ucyB9O1xuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gICAgICAgICAgICBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IEZsb3dSb3V0ZXIgfSAgICAgICAgZnJvbSAnbWV0ZW9yL29zdHJpbzpmbG93LXJvdXRlci1leHRyYSc7XG5pbXBvcnQgeyBfYXBwLCBDb2xsZWN0aW9ucyB9IGZyb20gJy9pbXBvcnRzL2xpYi9jb3JlLmpzJztcblxuRmxvd1JvdXRlci5yb3V0ZSgnLycsIHtcbiAgbmFtZTogJ2luZGV4JyxcbiAgYWN0aW9uKCkge1xuICAgIHRoaXMucmVuZGVyKCdfbGF5b3V0JywgJ2luZGV4Jyk7XG4gIH0sXG4gIHdhaXRPbigpIHtcbiAgICBpZiAoTWV0ZW9yLmlzQ2xpZW50KSB7XG4gICAgICByZXR1cm4gW19hcHAuc3Vicy5zdWJzY3JpYmUoJ2xhdGVzdCcsIDEwLCBfYXBwLnVzZXJPbmx5LmdldCgpKSwgaW1wb3J0KCcvaW1wb3J0cy9jbGllbnQvaW5kZXgvaW5kZXguanMnKV07XG4gICAgfVxuICB9LFxuICB3aGlsZVdhaXRpbmcoKSB7XG4gICAgdGhpcy5yZW5kZXIoJ19sYXlvdXQnLCAnX2xvYWRpbmcnKTtcbiAgfSxcbiAgc3Vic2NyaXB0aW9ucygpIHtcbiAgICBpZiAoTWV0ZW9yLmlzU2VydmVyKSB7XG4gICAgICB0aGlzLnJlZ2lzdGVyKCdsYXRlc3QnLCBNZXRlb3Iuc3Vic2NyaWJlKCdsYXRlc3QnLCAxMCwgZmFsc2UpKTtcbiAgICB9XG4gIH0sXG4gIGZhc3RSZW5kZXI6IHRydWVcbn0pO1xuXG5GbG93Um91dGVyLnJvdXRlKCcvbG9naW4nLCB7XG4gIG5hbWU6ICdsb2dpbicsXG4gIHRpdGxlKCkge1xuICAgIGlmIChNZXRlb3IudXNlcklkKCkpIHtcbiAgICAgIHJldHVybiAnWW91ciBhY2NvdW50IHNldHRpbmdzJztcbiAgICB9XG4gICAgcmV0dXJuICdMb2dpbiBpbnRvIE1ldGVvciBGaWxlcyc7XG4gIH0sXG4gIG1ldGE6IHtcbiAgICBrZXl3b3Jkczoge1xuICAgICAgbmFtZTogJ2tleXdvcmRzJyxcbiAgICAgIGl0ZW1wcm9wOiAna2V5d29yZHMnLFxuICAgICAgY29udGVudDogJ3ByaXZhdGUsIHVubGlzdGVkLCBmaWxlcywgdXBsb2FkLCBtZXRlb3IsIG9wZW4gc291cmNlLCBqYXZhc2NyaXB0J1xuICAgIH0sXG4gICAgZGVzY3JpcHRpb246IHtcbiAgICAgIG5hbWU6ICdkZXNjcmlwdGlvbicsXG4gICAgICBpdGVtcHJvcDogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgIHByb3BlcnR5OiAnb2c6ZGVzY3JpcHRpb24nLFxuICAgICAgY29udGVudDogJ0xvZ2luIGludG8gTWV0ZW9yIGZpbGVzLiBBZnRlciB5b3UgbG9nZ2VkIGluIHlvdSBjYW4gbWFrZSBmaWxlcyBwcml2YXRlIGFuZCB1bmxpc3RlZCdcbiAgICB9LFxuICAgICd0d2l0dGVyOmRlc2NyaXB0aW9uJzogJ0xvZ2luIGludG8gTWV0ZW9yIGZpbGVzLiBBZnRlciB5b3UgbG9nZ2VkIGluIHlvdSBjYW4gbWFrZSBmaWxlcyBwcml2YXRlIGFuZCB1bmxpc3RlZCdcbiAgfSxcbiAgYWN0aW9uKCkge1xuICAgIHRoaXMucmVuZGVyKCdfbGF5b3V0JywgJ2xvZ2luJyk7XG4gIH0sXG4gIHdhaXRPbigpIHtcbiAgICByZXR1cm4gaW1wb3J0KCcvaW1wb3J0cy9jbGllbnQvdXNlci1hY2NvdW50L2xvZ2luLmpzJyk7XG4gIH0sXG4gIHdoaWxlV2FpdGluZygpIHtcbiAgICB0aGlzLnJlbmRlcignX2xheW91dCcsICdfbG9hZGluZycpO1xuICB9XG59KTtcblxuRmxvd1JvdXRlci5yb3V0ZSgnLzpfaWQnLCB7XG4gIG5hbWU6ICdmaWxlJyxcbiAgdGl0bGUocGFyYW1zLCBxdWVyeVBhcmFtcywgZmlsZSkge1xuICAgIGlmIChmaWxlKSB7XG4gICAgICByZXR1cm4gJ1ZpZXcgRmlsZTogJyArIChmaWxlLmdldCgnbmFtZScpKTtcbiAgICB9XG4gICAgcmV0dXJuICc0MDQ6IFBhZ2Ugbm90IGZvdW5kJztcbiAgfSxcbiAgbWV0YShwYXJhbXMsIHF1ZXJ5UGFyYW1zLCBmaWxlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGtleXdvcmRzOiB7XG4gICAgICAgIG5hbWU6ICdrZXl3b3JkcycsXG4gICAgICAgIGl0ZW1wcm9wOiAna2V5d29yZHMnLFxuICAgICAgICBjb250ZW50OiBmaWxlID8gJ2ZpbGUsIHZpZXcsIHByZXZpZXcsIHVwbG9hZGVkLCBzaGFyZWQsICcgKyAoZmlsZS5nZXQoJ25hbWUnKSkgKyAnLCAnICsgKGZpbGUuZ2V0KCdleHRlbnNpb24nKSkgKyAnLCAnICsgKGZpbGUuZ2V0KCd0eXBlJykpICsgJywgbWV0ZW9yLCBvcGVuIHNvdXJjZSwgamF2YXNjcmlwdCcgOiAnNDA0LCBwYWdlLCBub3QgZm91bmQnXG4gICAgICB9LFxuICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgbmFtZTogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgaXRlbXByb3A6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgIHByb3BlcnR5OiAnb2c6ZGVzY3JpcHRpb24nLFxuICAgICAgICBjb250ZW50OiBmaWxlID8gJ1ZpZXcgdXBsb2FkZWQgYW5kIHNoYXJlZCBmaWxlOiAnICsgKGZpbGUuZ2V0KCduYW1lJykpIDogJzQwNDogTm8gc3VjaCBwYWdlJ1xuICAgICAgfSxcbiAgICAgICd0d2l0dGVyOmRlc2NyaXB0aW9uJzogZmlsZSA/ICdWaWV3IHVwbG9hZGVkIGFuZCBzaGFyZWQgZmlsZTogJyArIChmaWxlLmdldCgnbmFtZScpKSA6ICc0MDQ6IE5vIHN1Y2ggcGFnZScsXG4gICAgICAnb2c6aW1hZ2UnOiB7XG4gICAgICAgIHByb3BlcnR5OiAnb2c6aW1hZ2UnLFxuICAgICAgICBjb250ZW50OiBmaWxlICYmIGZpbGUuZ2V0KCdpc0ltYWdlJykgPyBmaWxlLmxpbmsoJ3ByZXZpZXcnKSA6IE1ldGVvci5hYnNvbHV0ZVVybCgnaWNvbl8xMjAweDYzMC5wbmcnKVxuICAgICAgfSxcbiAgICAgICd0d2l0dGVyOmltYWdlJzoge1xuICAgICAgICBuYW1lOiAndHdpdHRlcjppbWFnZScsXG4gICAgICAgIGNvbnRlbnQ6IGZpbGUgJiYgZmlsZS5nZXQoJ2lzSW1hZ2UnKSA/IGZpbGUubGluaygncHJldmlldycpIDogTWV0ZW9yLmFic29sdXRlVXJsKCdpY29uXzc1MHg1NjAucG5nJylcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuICBsaW5rKHBhcmFtcywgcXVlcnlQYXJhbXMsIGZpbGUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaW1hZ2U6IHtcbiAgICAgICAgaXRlbXByb3A6ICdpbWFnZScsXG4gICAgICAgIGNvbnRlbnQoKSB7XG4gICAgICAgICAgaWYgKGZpbGUgJiYgZmlsZS5nZXQoJ2lzSW1hZ2UnKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZpbGUubGluaygncHJldmlldycpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gTWV0ZW9yLmFic29sdXRlVXJsKCdpY29uXzEyMDB4NjMwLnBuZycpO1xuICAgICAgICB9LFxuICAgICAgICBocmVmKCkge1xuICAgICAgICAgIGlmIChmaWxlICYmIGZpbGUuZ2V0KCdpc0ltYWdlJykpIHtcbiAgICAgICAgICAgIHJldHVybiBmaWxlLmxpbmsoJ3ByZXZpZXcnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIE1ldGVvci5hYnNvbHV0ZVVybCgnaWNvbl8xMjAweDYzMC5wbmcnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0sXG4gIGFjdGlvbihwYXJhbXMsIHF1ZXJ5UGFyYW1zLCBmaWxlKSB7XG4gICAgaWYgKF9hcHAuaXNPYmplY3QoZmlsZSkgJiYgIV9hcHAuaXNFbXB0eShmaWxlKSkge1xuICAgICAgdGhpcy5yZW5kZXIoJ19sYXlvdXQnLCAnZmlsZScsIHtcbiAgICAgICAgZmlsZTogZmlsZVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICB3YWl0T24ocGFyYW1zKSB7XG4gICAgaWYgKE1ldGVvci5pc0NsaWVudCkge1xuICAgICAgcmV0dXJuIFtfYXBwLnN1YnMuc3Vic2NyaWJlKCdmaWxlJywgcGFyYW1zLl9pZCksIGltcG9ydCgnL2ltcG9ydHMvY2xpZW50L2ZpbGUvZmlsZS5qcycpXTtcbiAgICB9XG4gIH0sXG4gIHN1YnNjcmlwdGlvbnMocGFyYW1zKSB7XG4gICAgaWYgKE1ldGVvci5pc1NlcnZlcikge1xuICAgICAgdGhpcy5yZWdpc3RlcignZmlsZScsIE1ldGVvci5zdWJzY3JpYmUoJ2ZpbGUnLCBwYXJhbXMuX2lkKSk7XG4gICAgfVxuICB9LFxuICBmYXN0UmVuZGVyOiB0cnVlLFxuICB3aGlsZVdhaXRpbmcoKSB7XG4gICAgdGhpcy5yZW5kZXIoJ19sYXlvdXQnLCAnX2xvYWRpbmcnKTtcbiAgfSxcbiAgb25Ob0RhdGEoKSB7XG4gICAgdGhpcy5yZW5kZXIoJ19sYXlvdXQnLCAnXzQwNCcpO1xuICB9LFxuICBkYXRhKHBhcmFtcykge1xuICAgIHJldHVybiBDb2xsZWN0aW9ucy5maWxlcy5maW5kT25lKHBhcmFtcy5faWQpIHx8IGZhbHNlO1xuICB9XG59KTtcblxuLy8gNDA0IHJvdXRlIChjYXRjaCBhbGwpXG5GbG93Um91dGVyLnJvdXRlKCcqJywge1xuICBhY3Rpb24oKSB7XG4gICAgdGhpcy5yZW5kZXIoJ19sYXlvdXQnLCAnXzQwNCcpO1xuICB9LFxuICB0aXRsZTogJzQwNDogUGFnZSBub3QgZm91bmQnXG59KTtcbiIsImltcG9ydCB7IE1ldGVvciB9ICAgICAgICAgICAgZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBSYW5kb20gfSAgICAgICAgICAgIGZyb20gJ21ldGVvci9yYW5kb20nO1xuaW1wb3J0IHsgZmlsZXNpemUgfSAgICAgICAgICBmcm9tICdtZXRlb3IvbXJ0OmZpbGVzaXplJztcbmltcG9ydCB7IEZpbGVzQ29sbGVjdGlvbiB9ICAgZnJvbSAnbWV0ZW9yL29zdHJpbzpmaWxlcyc7XG5pbXBvcnQgeyBfYXBwLCBDb2xsZWN0aW9ucyB9IGZyb20gJy9pbXBvcnRzL2xpYi9jb3JlLmpzJztcblxuLy8gRHJvcEJveCB1c2FnZTpcbi8vIFJlYWQ6IGh0dHBzOi8vZ2l0aHViLmNvbS9WZWxpb3ZHcm91cC9NZXRlb3ItRmlsZXMvd2lraS9Ecm9wQm94LUludGVncmF0aW9uXG4vLyBlbnYudmFyIGV4YW1wbGU6IERST1BCT1g9J3tcImRyb3Bib3hcIjp7XCJrZXlcIjogXCJ4eHhcIiwgXCJzZWNyZXRcIjogXCJ4eHhcIiwgXCJ0b2tlblwiOiBcInh4eFwifX0nXG5sZXQgdXNlRHJvcEJveCA9IGZhbHNlO1xuXG4vLyBBV1M6UzMgdXNhZ2U6XG4vLyBSZWFkOiBodHRwczovL2dpdGh1Yi5jb20vVmVsaW92R3JvdXAvTWV0ZW9yLUZpbGVzL3dpa2kvQVdTLVMzLUludGVncmF0aW9uXG4vLyBlbnYudmFyIGV4YW1wbGU6IFMzPSd7XCJzM1wiOntcImtleVwiOiBcInh4eFwiLCBcInNlY3JldFwiOiBcInh4eFwiLCBcImJ1Y2tldFwiOiBcInh4eFwiLCBcInJlZ2lvblwiOiBcInh4eFwiXCJ9fSdcbmxldCB1c2VTMyA9IGZhbHNlO1xubGV0IGNsaWVudDtcbmxldCBzZW5kVG9TdG9yYWdlO1xuXG5jb25zdCBmcyAgICAgID0gcmVxdWlyZSgnZnMtZXh0cmEnKTtcbmNvbnN0IFMzICAgICAgPSByZXF1aXJlKCdhd3Mtc2RrL2NsaWVudHMvczMnKTtcbmNvbnN0IHN0cmVhbSAgPSByZXF1aXJlKCdzdHJlYW0nKTtcbmNvbnN0IHJlcXVlc3QgPSByZXF1aXJlKCdyZXF1ZXN0Jyk7XG5jb25zdCBEcm9wYm94ID0gcmVxdWlyZSgnZHJvcGJveCcpO1xuY29uc3QgYm91bmQgICA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGNhbGxiYWNrKSA9PiB7XG4gIHJldHVybiBjYWxsYmFjaygpO1xufSk7XG5cbmlmIChwcm9jZXNzLmVudi5EUk9QQk9YKSB7XG4gIE1ldGVvci5zZXR0aW5ncy5kcm9wYm94ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5EUk9QQk9YKS5kcm9wYm94O1xufSBlbHNlIGlmIChwcm9jZXNzLmVudi5TMykge1xuICBNZXRlb3Iuc2V0dGluZ3MuczMgPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52LlMzKS5zMztcbn1cblxuY29uc3QgczNDb25mID0gTWV0ZW9yLnNldHRpbmdzLnMzIHx8IHt9O1xuY29uc3QgZGJDb25mID0gTWV0ZW9yLnNldHRpbmdzLmRyb3Bib3ggfHwge307XG5cbmlmIChkYkNvbmYgJiYgZGJDb25mLmtleSAmJiBkYkNvbmYuc2VjcmV0ICYmIGRiQ29uZi50b2tlbikge1xuICB1c2VEcm9wQm94ID0gdHJ1ZTtcbiAgY2xpZW50ICAgICA9IG5ldyBEcm9wYm94LkNsaWVudCh7XG4gICAga2V5OiBkYkNvbmYua2V5LFxuICAgIHNlY3JldDogZGJDb25mLnNlY3JldCxcbiAgICB0b2tlbjogZGJDb25mLnRva2VuXG4gIH0pO1xufSBlbHNlIGlmIChzM0NvbmYgJiYgczNDb25mLmtleSAmJiBzM0NvbmYuc2VjcmV0ICYmIHMzQ29uZi5idWNrZXQgJiYgczNDb25mLnJlZ2lvbikge1xuICB1c2VTMyAgPSB0cnVlO1xuICBjbGllbnQgPSBuZXcgUzMoe1xuICAgIHNlY3JldEFjY2Vzc0tleTogczNDb25mLnNlY3JldCxcbiAgICBhY2Nlc3NLZXlJZDogczNDb25mLmtleSxcbiAgICByZWdpb246IHMzQ29uZi5yZWdpb24sXG4gICAgc3NsRW5hYmxlZDogZmFsc2UsXG4gICAgaHR0cE9wdGlvbnM6IHtcbiAgICAgIHRpbWVvdXQ6IDYwMDAsXG4gICAgICBhZ2VudDogZmFsc2VcbiAgICB9XG4gIH0pO1xufVxuXG5Db2xsZWN0aW9ucy5maWxlcyA9IG5ldyBGaWxlc0NvbGxlY3Rpb24oe1xuICAvLyBkZWJ1ZzogdHJ1ZSxcbiAgc3RvcmFnZVBhdGg6ICdhc3NldHMvYXBwL3VwbG9hZHMvdXBsb2FkZWRGaWxlcycsXG4gIGNvbGxlY3Rpb25OYW1lOiAndXBsb2FkZWRGaWxlcycsXG4gIGFsbG93Q2xpZW50Q29kZTogdHJ1ZSxcbiAgLy8gZGlzYWJsZVVwbG9hZDogdHJ1ZSxcbiAgLy8gZGlzYWJsZURvd25sb2FkOiB0cnVlLFxuICBwcm90ZWN0ZWQoZmlsZU9iaikge1xuICAgIGlmIChmaWxlT2JqKSB7XG4gICAgICBpZiAoIShmaWxlT2JqLm1ldGEgJiYgZmlsZU9iai5tZXRhLnNlY3VyZWQpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIGlmICgoZmlsZU9iai5tZXRhICYmIGZpbGVPYmoubWV0YS5zZWN1cmVkID09PSB0cnVlKSAmJiB0aGlzLnVzZXJJZCA9PT0gZmlsZU9iai51c2VySWQpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcbiAgb25CZWZvcmVSZW1vdmUoY3Vyc29yKSB7XG4gICAgY29uc3QgcmVzID0gY3Vyc29yLm1hcCgoZmlsZSkgPT4ge1xuICAgICAgaWYgKGZpbGUgJiYgZmlsZS51c2VySWQgJiYgX2FwcC5pc1N0cmluZyhmaWxlLnVzZXJJZCkpIHtcbiAgICAgICAgcmV0dXJuIGZpbGUudXNlcklkID09PSB0aGlzLnVzZXJJZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgICByZXR1cm4gIX5yZXMuaW5kZXhPZihmYWxzZSk7XG4gIH0sXG4gIG9uQmVmb3JlVXBsb2FkKCkge1xuICAgIGlmICh0aGlzLmZpbGUuc2l6ZSA8PSAxMDI0ICogMTAyNCAqIDEyOCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBcIk1heC4gZmlsZSBzaXplIGlzIDEyOE1CIHlvdSd2ZSB0cmllZCB0byB1cGxvYWQgXCIgKyAoZmlsZXNpemUodGhpcy5maWxlLnNpemUpKTtcbiAgfSxcbiAgZG93bmxvYWRDYWxsYmFjayhmaWxlT2JqKSB7XG4gICAgaWYgKHRoaXMucGFyYW1zICYmIHRoaXMucGFyYW1zLnF1ZXJ5ICYmIHRoaXMucGFyYW1zLnF1ZXJ5LmRvd25sb2FkID09PSAndHJ1ZScpIHtcbiAgICAgIENvbGxlY3Rpb25zLmZpbGVzLmNvbGxlY3Rpb24udXBkYXRlKGZpbGVPYmouX2lkLCB7XG4gICAgICAgICRpbmM6IHtcbiAgICAgICAgICAnbWV0YS5kb3dubG9hZHMnOiAxXG4gICAgICAgIH1cbiAgICAgIH0sIF9hcHAuTk9PUCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuICBpbnRlcmNlcHREb3dubG9hZChodHRwLCBmaWxlUmVmLCB2ZXJzaW9uKSB7XG4gICAgbGV0IHBhdGg7XG4gICAgaWYgKHVzZURyb3BCb3gpIHtcbiAgICAgIHBhdGggPSAoZmlsZVJlZiAmJiBmaWxlUmVmLnZlcnNpb25zICYmIGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl0gJiYgZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXS5tZXRhICYmIGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl0ubWV0YS5waXBlRnJvbSkgPyBmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dLm1ldGEucGlwZUZyb20gOiB2b2lkIDA7XG4gICAgICBpZiAocGF0aCkge1xuICAgICAgICAvLyBJZiBmaWxlIGlzIHN1Y2Nlc3NmdWxseSBtb3ZlZCB0byBTdG9yYWdlXG4gICAgICAgIC8vIFdlIHdpbGwgcGlwZSByZXF1ZXN0IHRvIFN0b3JhZ2VcbiAgICAgICAgLy8gU28sIG9yaWdpbmFsIGxpbmsgd2lsbCBzdGF5IGFsd2F5cyBzZWN1cmVcblxuICAgICAgICAvLyBUbyBmb3JjZSA/cGxheSBhbmQgP2Rvd25sb2FkIHBhcmFtZXRlcnNcbiAgICAgICAgLy8gYW5kIHRvIGtlZXAgb3JpZ2luYWwgZmlsZSBuYW1lLCBjb250ZW50LXR5cGUsXG4gICAgICAgIC8vIGNvbnRlbnQtZGlzcG9zaXRpb24gYW5kIGNhY2hlLWNvbnRyb2xcbiAgICAgICAgLy8gd2UncmUgdXNpbmcgbG93LWxldmVsIC5zZXJ2ZSgpIG1ldGhvZFxuICAgICAgICB0aGlzLnNlcnZlKGh0dHAsIGZpbGVSZWYsIGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl0sIHZlcnNpb24sIHJlcXVlc3Qoe1xuICAgICAgICAgIHVybDogcGF0aCxcbiAgICAgICAgICBoZWFkZXJzOiBfYXBwLnBpY2soaHR0cC5yZXF1ZXN0LmhlYWRlcnMsICdyYW5nZScsICdjYWNoZS1jb250cm9sJywgJ2Nvbm5lY3Rpb24nKVxuICAgICAgICB9KSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgLy8gV2hpbGUgZmlsZSBpcyBub3QgeWV0IHVwbG9hZGVkIHRvIFN0b3JhZ2VcbiAgICAgIC8vIFdlIHdpbGwgc2VydmUgZmlsZSBmcm9tIEZTXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmICh1c2VTMykge1xuICAgICAgcGF0aCA9IChmaWxlUmVmICYmIGZpbGVSZWYudmVyc2lvbnMgJiYgZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXSAmJiBmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dLm1ldGEgJiYgZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXS5tZXRhLnBpcGVQYXRoKSA/IGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl0ubWV0YS5waXBlUGF0aCA6IHZvaWQgMDtcbiAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgIC8vIElmIGZpbGUgaXMgc3VjY2Vzc2Z1bGx5IG1vdmVkIHRvIFN0b3JhZ2VcbiAgICAgICAgLy8gV2Ugd2lsbCBwaXBlIHJlcXVlc3QgdG8gU3RvcmFnZVxuICAgICAgICAvLyBTbywgb3JpZ2luYWwgbGluayB3aWxsIHN0YXkgYWx3YXlzIHNlY3VyZVxuXG4gICAgICAgIC8vIFRvIGZvcmNlID9wbGF5IGFuZCA/ZG93bmxvYWQgcGFyYW1ldGVyc1xuICAgICAgICAvLyBhbmQgdG8ga2VlcCBvcmlnaW5hbCBmaWxlIG5hbWUsIGNvbnRlbnQtdHlwZSxcbiAgICAgICAgLy8gY29udGVudC1kaXNwb3NpdGlvbiBhbmQgY2FjaGUtY29udHJvbFxuICAgICAgICAvLyB3ZSdyZSB1c2luZyBsb3ctbGV2ZWwgLnNlcnZlKCkgbWV0aG9kXG4gICAgICAgIGNvbnN0IG9wdHMgPSB7XG4gICAgICAgICAgQnVja2V0OiBzM0NvbmYuYnVja2V0LFxuICAgICAgICAgIEtleTogcGF0aFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChodHRwLnJlcXVlc3QuaGVhZGVycy5yYW5nZSkge1xuICAgICAgICAgIGNvbnN0IHZSZWYgID0gZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXTtcbiAgICAgICAgICBsZXQgcmFuZ2UgICA9IF9hcHAuY2xvbmUoaHR0cC5yZXF1ZXN0LmhlYWRlcnMucmFuZ2UpO1xuICAgICAgICAgIGNvbnN0IGFycmF5ID0gcmFuZ2Uuc3BsaXQoL2J5dGVzPShbMC05XSopLShbMC05XSopLyk7XG4gICAgICAgICAgY29uc3Qgc3RhcnQgPSBwYXJzZUludChhcnJheVsxXSk7XG4gICAgICAgICAgbGV0IGVuZCAgICAgPSBwYXJzZUludChhcnJheVsyXSk7XG4gICAgICAgICAgaWYgKGlzTmFOKGVuZCkpIHtcbiAgICAgICAgICAgIC8vIFJlcXVlc3QgZGF0YSBmcm9tIEFXUzpTMyBieSBzbWFsbCBjaHVua3NcbiAgICAgICAgICAgIGVuZCAgICAgICA9IChzdGFydCArIHRoaXMuY2h1bmtTaXplKSAtIDE7XG4gICAgICAgICAgICBpZiAoZW5kID49IHZSZWYuc2l6ZSkge1xuICAgICAgICAgICAgICBlbmQgICAgID0gdlJlZi5zaXplIC0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgb3B0cy5SYW5nZSAgID0gYGJ5dGVzPSR7c3RhcnR9LSR7ZW5kfWA7XG4gICAgICAgICAgaHR0cC5yZXF1ZXN0LmhlYWRlcnMucmFuZ2UgPSBgYnl0ZXM9JHtzdGFydH0tJHtlbmR9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZpbGVDb2xsID0gdGhpcztcbiAgICAgICAgY2xpZW50LmdldE9iamVjdChvcHRzLCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgaWYgKCFodHRwLnJlc3BvbnNlLmZpbmlzaGVkKSB7XG4gICAgICAgICAgICAgIGh0dHAucmVzcG9uc2UuZW5kKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChodHRwLnJlcXVlc3QuaGVhZGVycy5yYW5nZSAmJiB0aGlzLmh0dHBSZXNwb25zZS5oZWFkZXJzWydjb250ZW50LXJhbmdlJ10pIHtcbiAgICAgICAgICAgICAgLy8gU2V0IHByb3BlciByYW5nZSBoZWFkZXIgaW4gYWNjb3JkaW5nIHRvIHdoYXQgaXMgcmV0dXJuZWQgZnJvbSBBV1M6UzNcbiAgICAgICAgICAgICAgaHR0cC5yZXF1ZXN0LmhlYWRlcnMucmFuZ2UgPSB0aGlzLmh0dHBSZXNwb25zZS5oZWFkZXJzWydjb250ZW50LXJhbmdlJ10uc3BsaXQoJy8nKVswXS5yZXBsYWNlKCdieXRlcyAnLCAnYnl0ZXM9Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGRhdGFTdHJlYW0gPSBuZXcgc3RyZWFtLlBhc3NUaHJvdWdoKCk7XG4gICAgICAgICAgICBmaWxlQ29sbC5zZXJ2ZShodHRwLCBmaWxlUmVmLCBmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dLCB2ZXJzaW9uLCBkYXRhU3RyZWFtKTtcbiAgICAgICAgICAgIGRhdGFTdHJlYW0uZW5kKHRoaXMuZGF0YS5Cb2R5KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgLy8gV2hpbGUgZmlsZSBpcyBub3QgeWV0IHVwbG9hZGVkIHRvIFN0b3JhZ2VcbiAgICAgIC8vIFdlIHdpbGwgc2VydmUgZmlsZSBmcm9tIEZTXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufSk7XG5cbkNvbGxlY3Rpb25zLmZpbGVzLmRlbnlDbGllbnQoKTtcbkNvbGxlY3Rpb25zLmZpbGVzLm9uKCdhZnRlclVwbG9hZCcsIGZ1bmN0aW9uKF9maWxlUmVmKSB7XG4gIGlmICh1c2VEcm9wQm94KSB7XG4gICAgY29uc3QgbWFrZVVybCA9IChzdGF0LCBmaWxlUmVmLCB2ZXJzaW9uLCB0cmllc1VybCA9IDApID0+IHtcbiAgICAgIGNsaWVudC5tYWtlVXJsKHN0YXQucGF0aCwge1xuICAgICAgICBsb25nOiB0cnVlLFxuICAgICAgICBkb3dubG9hZEhhY2s6IHRydWVcbiAgICAgIH0sIChlcnJvciwgeG1sKSA9PiB7XG4gICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAvLyBTdG9yZSBkb3dubG9hZGFibGUgbGluayBpbiBmaWxlJ3MgbWV0YSBvYmplY3RcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGlmICh0cmllc1VybCA8IDEwKSB7XG4gICAgICAgICAgICAgIE1ldGVvci5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBtYWtlVXJsKHN0YXQsIGZpbGVSZWYsIHZlcnNpb24sICsrdHJpZXNVcmwpO1xuICAgICAgICAgICAgICB9LCAyMDQ4KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IsIHtcbiAgICAgICAgICAgICAgICB0cmllc1VybDogdHJpZXNVcmxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmICh4bWwpIHtcbiAgICAgICAgICAgIGNvbnN0IHVwZCA9IHsgJHNldDoge30gfTtcbiAgICAgICAgICAgIHVwZC4kc2V0W2B2ZXJzaW9ucy4ke3ZlcnNpb259Lm1ldGEucGlwZUZyb21gXSA9IHhtbC51cmw7XG4gICAgICAgICAgICB1cGQuJHNldFtgdmVyc2lvbnMuJHt2ZXJzaW9ufS5tZXRhLnBpcGVQYXRoYF0gPSBzdGF0LnBhdGg7XG4gICAgICAgICAgICB0aGlzLmNvbGxlY3Rpb24udXBkYXRlKHtcbiAgICAgICAgICAgICAgX2lkOiBmaWxlUmVmLl9pZFxuICAgICAgICAgICAgfSwgdXBkLCAodXBkRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgaWYgKHVwZEVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcih1cGRFcnJvcik7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVW5saW5rIG9yaWdpbmFsIGZpbGVzIGZyb20gRlNcbiAgICAgICAgICAgICAgICAvLyBhZnRlciBzdWNjZXNzZnVsIHVwbG9hZCB0byBEcm9wQm94XG4gICAgICAgICAgICAgICAgdGhpcy51bmxpbmsodGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUoZmlsZVJlZi5faWQpLCB2ZXJzaW9uKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0cmllc1VybCA8IDEwKSB7XG4gICAgICAgICAgICAgIE1ldGVvci5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSBkb3dubG9hZGFibGUgbGlua1xuICAgICAgICAgICAgICAgIG1ha2VVcmwoc3RhdCwgZmlsZVJlZiwgdmVyc2lvbiwgKyt0cmllc1VybCk7XG4gICAgICAgICAgICAgIH0sIDIwNDgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignY2xpZW50Lm1ha2VVcmwgZG9lc25cXCd0IHJldHVybnMgeG1sJywge1xuICAgICAgICAgICAgICAgIHRyaWVzVXJsOiB0cmllc1VybFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHdyaXRlVG9EQiA9IChmaWxlUmVmLCB2ZXJzaW9uLCBkYXRhLCB0cmllc1NlbmQgPSAwKSA9PiB7XG4gICAgICAvLyBEcm9wQm94IGFscmVhZHkgdXNlcyByYW5kb20gVVJMc1xuICAgICAgLy8gTm8gbmVlZCB0byB1c2UgcmFuZG9tIGZpbGUgbmFtZXNcbiAgICAgIGNsaWVudC53cml0ZUZpbGUoZmlsZVJlZi5faWQgKyAnLScgKyB2ZXJzaW9uICsgJy4nICsgZmlsZVJlZi5leHRlbnNpb24sIGRhdGEsIChlcnJvciwgc3RhdCkgPT4ge1xuICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICBpZiAodHJpZXNTZW5kIDwgMTApIHtcbiAgICAgICAgICAgICAgTWV0ZW9yLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFdyaXRlIGZpbGUgdG8gRHJvcEJveFxuICAgICAgICAgICAgICAgIHdyaXRlVG9EQihmaWxlUmVmLCB2ZXJzaW9uLCBkYXRhLCArK3RyaWVzU2VuZCk7XG4gICAgICAgICAgICAgIH0sIDIwNDgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvciwge1xuICAgICAgICAgICAgICAgIHRyaWVzU2VuZDogdHJpZXNTZW5kXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtYWtlVXJsKHN0YXQsIGZpbGVSZWYsIHZlcnNpb24pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgY29uc3QgcmVhZEZpbGUgPSAoZmlsZVJlZiwgdlJlZiwgdmVyc2lvbiwgdHJpZXNSZWFkID0gMCkgPT4ge1xuICAgICAgZnMucmVhZEZpbGUodlJlZi5wYXRoLCAoZXJyb3IsIGRhdGEpID0+IHtcbiAgICAgICAgYm91bmQoKCkgPT4ge1xuICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgaWYgKHRyaWVzUmVhZCA8IDEwKSB7XG4gICAgICAgICAgICAgIHJlYWRGaWxlKGZpbGVSZWYsIHZSZWYsIHZlcnNpb24sICsrdHJpZXNSZWFkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3cml0ZVRvREIoZmlsZVJlZiwgdmVyc2lvbiwgZGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBzZW5kVG9TdG9yYWdlID0gKGZpbGVSZWYpID0+IHtcbiAgICAgIGZvcihsZXQgdmVyc2lvbiBpbiBmaWxlUmVmLnZlcnNpb25zKSB7XG4gICAgICAgIGlmIChmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dKSB7XG4gICAgICAgICAgcmVhZEZpbGUoZmlsZVJlZiwgZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXSwgdmVyc2lvbik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9IGVsc2UgaWYgKHVzZVMzKSB7XG4gICAgc2VuZFRvU3RvcmFnZSA9IChmaWxlUmVmKSA9PiB7XG4gICAgICBmb3IobGV0IHZlcnNpb24gaW4gZmlsZVJlZi52ZXJzaW9ucykge1xuICAgICAgICBpZiAoZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXSkge1xuICAgICAgICAgIGNvbnN0IHZSZWYgPSBmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dO1xuICAgICAgICAgIC8vIFdlIHVzZSBSYW5kb20uaWQoKSBpbnN0ZWFkIG9mIHJlYWwgZmlsZSdzIF9pZFxuICAgICAgICAgIC8vIHRvIHNlY3VyZSBmaWxlcyBmcm9tIHJldmVyc2UgZW5naW5lZXJpbmdcbiAgICAgICAgICAvLyBBcyBhZnRlciB2aWV3aW5nIHRoaXMgY29kZSBpdCB3aWxsIGJlIGVhc3lcbiAgICAgICAgICAvLyB0byBnZXQgYWNjZXNzIHRvIHVubGlzdGVkIGFuZCBwcm90ZWN0ZWQgZmlsZXNcbiAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9ICdmaWxlcy8nICsgKFJhbmRvbS5pZCgpKSArICctJyArIHZlcnNpb24gKyAnLicgKyBmaWxlUmVmLmV4dGVuc2lvbjtcblxuICAgICAgICAgIGNsaWVudC5wdXRPYmplY3Qoe1xuICAgICAgICAgICAgU3RvcmFnZUNsYXNzOiAnU1RBTkRBUkQnLFxuICAgICAgICAgICAgQnVja2V0OiBzM0NvbmYuYnVja2V0LFxuICAgICAgICAgICAgS2V5OiBmaWxlUGF0aCxcbiAgICAgICAgICAgIEJvZHk6IGZzLmNyZWF0ZVJlYWRTdHJlYW0odlJlZi5wYXRoKSxcbiAgICAgICAgICAgIENvbnRlbnRUeXBlOiB2UmVmLnR5cGUsXG4gICAgICAgICAgfSwgKGVycm9yKSA9PiB7XG4gICAgICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVwZCA9IHsgJHNldDoge30gfTtcbiAgICAgICAgICAgICAgICB1cGQuJHNldFtgdmVyc2lvbnMuJHt2ZXJzaW9ufS5tZXRhLnBpcGVQYXRoYF0gPSBmaWxlUGF0aDtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbGxlY3Rpb24udXBkYXRlKHtcbiAgICAgICAgICAgICAgICAgIF9pZDogZmlsZVJlZi5faWRcbiAgICAgICAgICAgICAgICB9LCB1cGQsICh1cGRFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKHVwZEVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IodXBkRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVW5saW5rIG9yaWdpbmFsIGZpbGUgZnJvbSBGU1xuICAgICAgICAgICAgICAgICAgICAvLyBhZnRlciBzdWNjZXNzZnVsIHVwbG9hZCB0byBBV1M6UzNcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51bmxpbmsodGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUoZmlsZVJlZi5faWQpLCB2ZXJzaW9uKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgaWYgKC9wbmd8anBlP2cvaS50ZXN0KF9maWxlUmVmLmV4dGVuc2lvbiB8fCAnJykpIHtcbiAgICBNZXRlb3Iuc2V0VGltZW91dCggKCkgPT4ge1xuICAgICAgX2FwcC5jcmVhdGVUaHVtYm5haWxzKHRoaXMsIF9maWxlUmVmLCAoZXJyb3IpID0+IHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodXNlRHJvcEJveCB8fCB1c2VTMykge1xuICAgICAgICAgIHNlbmRUb1N0b3JhZ2UodGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUoX2ZpbGVSZWYuX2lkKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0sIDEwMjQpO1xuICB9IGVsc2Uge1xuICAgIGlmICh1c2VEcm9wQm94IHx8IHVzZVMzKSB7XG4gICAgICBzZW5kVG9TdG9yYWdlKF9maWxlUmVmKTtcbiAgICB9XG4gIH1cbn0pO1xuXG4vLyBUaGlzIGxpbmUgbm93IGNvbW1lbnRlZCBkdWUgdG8gSGVyb2t1IHVzYWdlXG4vLyBDb2xsZWN0aW9ucy5maWxlcy5jb2xsZWN0aW9uLl9lbnN1cmVJbmRleCB7J21ldGEuZXhwaXJlQXQnOiAxfSwge2V4cGlyZUFmdGVyU2Vjb25kczogMCwgYmFja2dyb3VuZDogdHJ1ZX1cblxuLy8gSW50ZXJjZXB0IEZpbGVDb2xsZWN0aW9uJ3MgcmVtb3ZlIG1ldGhvZFxuLy8gdG8gcmVtb3ZlIGZpbGUgZnJvbSBEcm9wQm94IG9yIEFXUyBTM1xuaWYgKHVzZURyb3BCb3ggfHwgdXNlUzMpIHtcbiAgY29uc3QgX29yaWdSZW1vdmUgPSBDb2xsZWN0aW9ucy5maWxlcy5yZW1vdmU7XG4gIENvbGxlY3Rpb25zLmZpbGVzLnJlbW92ZSA9IGZ1bmN0aW9uKHNlYXJjaCkge1xuICAgIGNvbnN0IGN1cnNvciA9IHRoaXMuY29sbGVjdGlvbi5maW5kKHNlYXJjaCk7XG4gICAgY3Vyc29yLmZvckVhY2goKGZpbGVSZWYpID0+IHtcbiAgICAgIGZvciAobGV0IHZlcnNpb24gaW4gZmlsZVJlZi52ZXJzaW9ucykge1xuICAgICAgICBpZiAoZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXSkge1xuICAgICAgICAgIGNvbnN0IHZSZWYgPSBmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dO1xuICAgICAgICAgIGlmICh2UmVmICYmIHZSZWYubWV0YSAmJiB2UmVmLm1ldGEucGlwZVBhdGgpIHtcbiAgICAgICAgICAgIGlmICh1c2VEcm9wQm94KSB7XG4gICAgICAgICAgICAgIC8vIERyb3BCb3ggdXNhZ2U6XG4gICAgICAgICAgICAgIGNsaWVudC5yZW1vdmUodlJlZi5tZXRhLnBpcGVQYXRoLCAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gQVdTOlMzIHVzYWdlOlxuICAgICAgICAgICAgICBjbGllbnQuZGVsZXRlT2JqZWN0KHtcbiAgICAgICAgICAgICAgICBCdWNrZXQ6IHMzQ29uZi5idWNrZXQsXG4gICAgICAgICAgICAgICAgS2V5OiB2UmVmLm1ldGEucGlwZVBhdGgsXG4gICAgICAgICAgICAgIH0sIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8gQ2FsbCBvcmlnaW5hbCBtZXRob2RcbiAgICBfb3JpZ1JlbW92ZS5jYWxsKHRoaXMsIHNlYXJjaCk7XG4gIH07XG59XG5cbi8vIFJlbW92ZSBhbGwgZmlsZXMgb24gc2VydmVyIGxvYWQvcmVsb2FkLCB1c2VmdWwgd2hpbGUgdGVzdGluZy9kZXZlbG9wbWVudFxuLy8gTWV0ZW9yLnN0YXJ0dXAgLT4gQ29sbGVjdGlvbnMuZmlsZXMucmVtb3ZlIHt9XG5cbi8vIFJlbW92ZSBmaWxlcyBhbG9uZyB3aXRoIE1vbmdvREIgcmVjb3JkcyB0d28gbWludXRlcyBiZWZvcmUgZXhwaXJhdGlvbiBkYXRlXG4vLyBJZiB3ZSBoYXZlICdleHBpcmVBZnRlclNlY29uZHMnIGluZGV4IG9uICdtZXRhLmV4cGlyZUF0JyBmaWVsZCxcbi8vIGl0IHdvbid0IHJlbW92ZSBmaWxlcyB0aGVtc2VsdmVzLlxuTWV0ZW9yLnNldEludGVydmFsKCgpID0+IHtcbiAgQ29sbGVjdGlvbnMuZmlsZXMucmVtb3ZlKHtcbiAgICAnbWV0YS5leHBpcmVBdCc6IHtcbiAgICAgICRsdGU6IG5ldyBEYXRlKCtuZXcgRGF0ZSgpICsgMTIwMDAwKVxuICAgIH1cbiAgfSwgX2FwcC5OT09QKTtcbn0sIDEyMDAwMCk7XG4iLCJpbXBvcnQgeyBfYXBwIH0gICBmcm9tICcvaW1wb3J0cy9saWIvY29yZS5qcyc7XG5pbXBvcnQgeyBjaGVjayB9ICBmcm9tICdtZXRlb3IvY2hlY2snO1xuaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5cbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgZ20gZnJvbSAnZ20nO1xuLy9Tb21lIHBsYXRmb3JtcyBtYXkgYnVuZGxlIEltYWdlTWFnaWNrIGludG8gdGhlaXIgdG9vbHMgKGxpa2UgSGVyb2t1KS4gSW4gdGhpcyBjYXNlIHlvdSBtYXkgdXNlIEdyYXBoaWNzTWFnaWNrIGFzIEltYWdlbWFnaWNrIGluIHRoaXMgd2F5OlxuLy9ucG0gaW5zdGFsbCBnbSAtLXNhdmUgYW5kIHRoZW4gd2hlcmUgeW91IHVzZSBpdDpcbi8vY29uc3QgZ20gPSByZXF1aXJlKCdnbScpO1xuLy9jb25zdCBpbSA9IGdtLnN1YkNsYXNzKHsgaW1hZ2VNYWdpY2s6IHRydWUgfSk7XG4vL1BsZWFzZSBub3RlIHRoYXQgR00gd2FzIGNvbnNpZGVyZWQgc2xpZ2h0bHkgZmFzdGVyIHRoYW4gSU0gc28gYmVmb3JlIHlvdSBjaG9zZSBjb252ZW5pZW5jZSBvdmVyIHBlcmZvcm1hbmNlIHJlYWQgdGhlIGxhdGVzdCBuZXdzIGFib3V0IGl0LlxuLy9odHRwczovL21hemlyYS5jb20vYmxvZy9jb21wYXJpbmctc3BlZWQtaW1hZ2VtYWdpY2stZ3JhcGhpY3NtYWdpY2tcblxuY29uc3QgYm91bmQgPSBNZXRlb3IuYmluZEVudmlyb25tZW50KChjYWxsYmFjaykgPT4ge1xuICByZXR1cm4gY2FsbGJhY2soKTtcbn0pO1xuXG5fYXBwLmNyZWF0ZVRodW1ibmFpbHMgPSAoY29sbGVjdGlvbiwgZmlsZVJlZiwgY2IpID0+IHtcbiAgY2hlY2soZmlsZVJlZiwgT2JqZWN0KTtcblxuICBsZXQgaXNMYXN0ID0gZmFsc2U7XG4gIGNvbnN0IGZpbmlzaCA9IChlcnJvcikgPT4ge1xuICAgIGJvdW5kKCgpID0+IHtcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdbX2FwcC5jcmVhdGVUaHVtYm5haWxzXSBbZmluaXNoXScsIGVycm9yKTtcbiAgICAgICAgY2IgJiYgY2IgKGVycm9yKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChpc0xhc3QpIHtcbiAgICAgICAgICBjYiAmJiBjYih2b2lkIDAsIGZpbGVSZWYpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfTtcblxuICBmcy5leGlzdHMoZmlsZVJlZi5wYXRoLCAoZXhpc3RzKSA9PiB7XG4gICAgYm91bmQoKCkgPT4ge1xuICAgICAgaWYgKCFleGlzdHMpIHtcbiAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcignRmlsZSAnICsgZmlsZVJlZi5wYXRoICsgJyBub3QgZm91bmQgaW4gW2NyZWF0ZVRodW1ibmFpbHNdIE1ldGhvZCcpO1xuICAgICAgfVxuICAgICAgY29uc3QgaW1hZ2UgPSBnbShmaWxlUmVmLnBhdGgpO1xuICAgICAgY29uc3Qgc2l6ZXMgPSB7XG4gICAgICAgIHByZXZpZXc6IHtcbiAgICAgICAgICB3aWR0aDogNDAwXG4gICAgICAgIH0sXG4gICAgICAgIHRodW1ibmFpbDQwOiB7XG4gICAgICAgICAgd2lkdGg6IDQwLFxuICAgICAgICAgIHNxdWFyZTogdHJ1ZVxuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBpbWFnZS5zaXplKChlcnJvciwgZmVhdHVyZXMpID0+IHtcbiAgICAgICAgYm91bmQoKCkgPT4ge1xuICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW19hcHAuY3JlYXRlVGh1bWJuYWlsc10gW2ZvckVhY2ggc2l6ZXNdJywgZXJyb3IpO1xuICAgICAgICAgICAgZmluaXNoKG5ldyBNZXRlb3IuRXJyb3IoJ1tfYXBwLmNyZWF0ZVRodW1ibmFpbHNdIFtmb3JFYWNoIHNpemVzXScsIGVycm9yKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICAgIGNvbGxlY3Rpb24uY29sbGVjdGlvbi51cGRhdGUoZmlsZVJlZi5faWQsIHtcbiAgICAgICAgICAgICRzZXQ6IHtcbiAgICAgICAgICAgICAgJ21ldGEud2lkdGgnOiBmZWF0dXJlcy53aWR0aCxcbiAgICAgICAgICAgICAgJ21ldGEuaGVpZ2h0JzogZmVhdHVyZXMuaGVpZ2h0LFxuICAgICAgICAgICAgICAndmVyc2lvbnMub3JpZ2luYWwubWV0YS53aWR0aCc6IGZlYXR1cmVzLndpZHRoLFxuICAgICAgICAgICAgICAndmVyc2lvbnMub3JpZ2luYWwubWV0YS5oZWlnaHQnOiBmZWF0dXJlcy5oZWlnaHRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LCBfYXBwLk5PT1ApO1xuXG4gICAgICAgICAgT2JqZWN0LmtleXMoc2l6ZXMpLmZvckVhY2goKG5hbWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNpemUgPSBzaXplc1tuYW1lXTtcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSAoY29sbGVjdGlvbi5zdG9yYWdlUGF0aChmaWxlUmVmKSkgKyAnLycgKyBuYW1lICsgJy0nICsgZmlsZVJlZi5faWQgKyAnLicgKyBmaWxlUmVmLmV4dGVuc2lvbjtcbiAgICAgICAgICAgIGNvbnN0IGNvcHlQYXN0ZSA9ICgpID0+IHtcbiAgICAgICAgICAgICAgZnMuY29weShmaWxlUmVmLnBhdGgsIHBhdGgsIChmc0NvcHlFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChmc0NvcHlFcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbX2FwcC5jcmVhdGVUaHVtYm5haWxzXSBbZm9yRWFjaCBzaXplc10gW2ZzLmNvcHldJywgZnNDb3B5RXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICBmaW5pc2goZnNDb3B5RXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGNvbnN0IHVwZCA9IHsgJHNldDoge30gfTtcbiAgICAgICAgICAgICAgICAgIHVwZC4kc2V0W2B2ZXJzaW9ucy4ke25hbWV9YF0gPSB7XG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHNpemU6IGZpbGVSZWYuc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogZmlsZVJlZi50eXBlLFxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb246IGZpbGVSZWYuZXh0ZW5zaW9uLFxuICAgICAgICAgICAgICAgICAgICBtZXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGZlYXR1cmVzLndpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogZmVhdHVyZXMuaGVpZ2h0XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb24uY29sbGVjdGlvbi51cGRhdGUoZmlsZVJlZi5faWQsIHVwZCwgKGNvbFVwZEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICsraTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPT09IE9iamVjdC5rZXlzKHNpemVzKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICBpc0xhc3QgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZpbmlzaChjb2xVcGRFcnJvcik7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAoL3BuZ3xqcGU/Zy9pLnRlc3QoZmlsZVJlZi5leHRlbnNpb24pKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGltZyA9IGdtKGZpbGVSZWYucGF0aClcbiAgICAgICAgICAgICAgICAucXVhbGl0eSg3MClcbiAgICAgICAgICAgICAgICAuZGVmaW5lKCdmaWx0ZXI6c3VwcG9ydD0yJylcbiAgICAgICAgICAgICAgICAuZGVmaW5lKCdqcGVnOmZhbmN5LXVwc2FtcGxpbmc9ZmFsc2UnKVxuICAgICAgICAgICAgICAgIC5kZWZpbmUoJ2pwZWc6ZmFuY3ktdXBzYW1wbGluZz1vZmYnKVxuICAgICAgICAgICAgICAgIC5kZWZpbmUoJ3BuZzpjb21wcmVzc2lvbi1maWx0ZXI9NScpXG4gICAgICAgICAgICAgICAgLmRlZmluZSgncG5nOmNvbXByZXNzaW9uLWxldmVsPTknKVxuICAgICAgICAgICAgICAgIC5kZWZpbmUoJ3BuZzpjb21wcmVzc2lvbi1zdHJhdGVneT0xJylcbiAgICAgICAgICAgICAgICAuZGVmaW5lKCdwbmc6ZXhjbHVkZS1jaHVuaz1hbGwnKVxuICAgICAgICAgICAgICAgIC5hdXRvT3JpZW50KClcbiAgICAgICAgICAgICAgICAubm9Qcm9maWxlKClcbiAgICAgICAgICAgICAgICAuc3RyaXAoKVxuICAgICAgICAgICAgICAgIC5kaXRoZXIoZmFsc2UpXG4gICAgICAgICAgICAgICAgLmludGVybGFjZSgnTGluZScpXG4gICAgICAgICAgICAgICAgLmZpbHRlcignVHJpYW5nbGUnKTtcblxuICAgICAgICAgICAgICBjb25zdCB1cGRhdGVBbmRTYXZlID0gKHVwTlNhdmVFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmICh1cE5TYXZlRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW19hcHAuY3JlYXRlVGh1bWJuYWlsc10gW2ZvckVhY2ggc2l6ZXNdIFtpbWcucmVzaXplXScsIHVwTlNhdmVFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIGZpbmlzaCh1cE5TYXZlRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBmcy5zdGF0KHBhdGgsIChmc1N0YXRFcnJvciwgc3RhdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGZzU3RhdEVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbX2FwcC5jcmVhdGVUaHVtYm5haWxzXSBbZm9yRWFjaCBzaXplc10gW2ltZy5yZXNpemVdIFtmcy5zdGF0XScsIGZzU3RhdEVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbmlzaChmc1N0YXRFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgZ20ocGF0aCkuc2l6ZSgoZ21TaXplRXJyb3IsIGltZ0luZm8pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdtU2l6ZUVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW19hcHAuY3JlYXRlVGh1bWJuYWlsc10gW2ZvckVhY2ggc2l6ZXNdIFtpbWcucmVzaXplXSBbZnMuc3RhdF0gW2dtKHBhdGgpLnNpemVdJywgZ21TaXplRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbmlzaChnbVNpemVFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVwZCA9IHsgJHNldDoge30gfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkLiRzZXRbYHZlcnNpb25zLiR7bmFtZX1gXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IHN0YXQuc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBmaWxlUmVmLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBmaWxlUmVmLmV4dGVuc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBmaWxlUmVmLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGltZ0luZm8ud2lkdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IGltZ0luZm8uaGVpZ2h0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxlY3Rpb24uY29sbGVjdGlvbi51cGRhdGUoZmlsZVJlZi5faWQsIHVwZCwgKGNvbFVwZEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKytpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpID09PSBPYmplY3Qua2V5cyhzaXplcykubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0xhc3QgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5pc2goY29sVXBkRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgIGlmICghc2l6ZS5zcXVhcmUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmVhdHVyZXMud2lkdGggPiBzaXplLndpZHRoKSB7XG4gICAgICAgICAgICAgICAgICBpbWcucmVzaXplKHNpemUud2lkdGgpLmludGVybGFjZSgnTGluZScpLndyaXRlKHBhdGgsIHVwZGF0ZUFuZFNhdmUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBjb3B5UGFzdGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IHggPSAwO1xuICAgICAgICAgICAgICAgIGxldCB5ID0gMDtcbiAgICAgICAgICAgICAgICBjb25zdCB3aWR0aFJhdGlvICA9IGZlYXR1cmVzLndpZHRoIC8gc2l6ZS53aWR0aDtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWlnaHRSYXRpbyA9IGZlYXR1cmVzLmhlaWdodCAvIHNpemUud2lkdGg7XG4gICAgICAgICAgICAgICAgbGV0IHdpZHRoTmV3ICAgICAgPSBzaXplLndpZHRoO1xuICAgICAgICAgICAgICAgIGxldCBoZWlnaHROZXcgICAgID0gc2l6ZS53aWR0aDtcblxuICAgICAgICAgICAgICAgIGlmIChoZWlnaHRSYXRpbyA8IHdpZHRoUmF0aW8pIHtcbiAgICAgICAgICAgICAgICAgIHdpZHRoTmV3ID0gKHNpemUud2lkdGggKiBmZWF0dXJlcy53aWR0aCkgLyBmZWF0dXJlcy5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgICB4ID0gKHdpZHRoTmV3IC0gc2l6ZS53aWR0aCkgLyAyO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChoZWlnaHRSYXRpbyA+IHdpZHRoUmF0aW8pIHtcbiAgICAgICAgICAgICAgICAgIGhlaWdodE5ldyA9IChzaXplLndpZHRoICogZmVhdHVyZXMuaGVpZ2h0KSAvIGZlYXR1cmVzLndpZHRoO1xuICAgICAgICAgICAgICAgICAgeSA9IChoZWlnaHROZXcgLSBzaXplLndpZHRoKSAvIDI7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaW1nXG4gICAgICAgICAgICAgICAgICAucmVzaXplKHdpZHRoTmV3LCBoZWlnaHROZXcpXG4gICAgICAgICAgICAgICAgICAuY3JvcChzaXplLndpZHRoLCBzaXplLndpZHRoLCB4LCB5KVxuICAgICAgICAgICAgICAgICAgLmludGVybGFjZSgnTGluZScpXG4gICAgICAgICAgICAgICAgICAud3JpdGUocGF0aCwgdXBkYXRlQW5kU2F2ZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvcHlQYXN0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIHRydWU7XG59O1xuIiwiaW1wb3J0IHsgY2hlY2sgfSAgICAgICAgICAgICBmcm9tICdtZXRlb3IvY2hlY2snO1xuaW1wb3J0IHsgTWV0ZW9yIH0gICAgICAgICAgICBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IF9hcHAsIENvbGxlY3Rpb25zIH0gZnJvbSAnL2ltcG9ydHMvbGliL2NvcmUuanMnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG4gIGZpbGVzTGVuZ2h0KHVzZXJPbmx5ID0gZmFsc2UpIHtcbiAgICBjaGVjayh1c2VyT25seSwgQm9vbGVhbik7XG5cbiAgICBsZXQgc2VsZWN0b3I7XG4gICAgaWYgKHVzZXJPbmx5ICYmIHRoaXMudXNlcklkKSB7XG4gICAgICBzZWxlY3RvciA9IHtcbiAgICAgICAgdXNlcklkOiB0aGlzLnVzZXJJZFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKHRoaXMudXNlcklkKSB7XG4gICAgICBzZWxlY3RvciA9IHtcbiAgICAgICAgJG9yOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgJ21ldGEudW5saXN0ZWQnOiBmYWxzZSxcbiAgICAgICAgICAgICdtZXRhLnNlY3VyZWQnOiBmYWxzZSxcbiAgICAgICAgICAgICdtZXRhLmJsYW1lZCc6IHtcbiAgICAgICAgICAgICAgJGx0OiAzXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSwge1xuICAgICAgICAgICAgdXNlcklkOiB0aGlzLnVzZXJJZCxcbiAgICAgICAgICAgICdtZXRhLmJsYW1lZCc6IHtcbiAgICAgICAgICAgICAgJGx0OiAzXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBzZWxlY3RvciA9IHtcbiAgICAgICAgJ21ldGEudW5saXN0ZWQnOiBmYWxzZSxcbiAgICAgICAgJ21ldGEuc2VjdXJlZCc6IGZhbHNlLFxuICAgICAgICAnbWV0YS5ibGFtZWQnOiB7XG4gICAgICAgICAgJGx0OiAzXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBDb2xsZWN0aW9ucy5maWxlcy5maW5kKHNlbGVjdG9yKS5jb3VudCgpO1xuICB9LFxuICB1bmJsYW1lKF9pZCkge1xuICAgIGNoZWNrKF9pZCwgU3RyaW5nKTtcbiAgICBDb2xsZWN0aW9ucy5maWxlcy51cGRhdGUoe1xuICAgICAgX2lkOiBfaWRcbiAgICB9LCB7XG4gICAgICAkaW5jOiB7XG4gICAgICAgICdtZXRhLmJsYW1lZCc6IC0xXG4gICAgICB9XG4gICAgfSwgX2FwcC5OT09QKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcbiAgYmxhbWUoX2lkKSB7XG4gICAgY2hlY2soX2lkLCBTdHJpbmcpO1xuICAgIENvbGxlY3Rpb25zLmZpbGVzLnVwZGF0ZSh7XG4gICAgICBfaWQ6IF9pZFxuICAgIH0sIHtcbiAgICAgICRpbmM6IHtcbiAgICAgICAgJ21ldGEuYmxhbWVkJzogMVxuICAgICAgfVxuICAgIH0sIF9hcHAuTk9PUCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG4gIGNoYW5nZUFjY2VzcyhfaWQpIHtcbiAgICBjaGVjayhfaWQsIFN0cmluZyk7XG4gICAgaWYgKE1ldGVvci51c2VySWQoKSkge1xuICAgICAgY29uc3QgZmlsZSA9IENvbGxlY3Rpb25zLmZpbGVzLmZpbmRPbmUoe1xuICAgICAgICBfaWQ6IF9pZCxcbiAgICAgICAgdXNlcklkOiBNZXRlb3IudXNlcklkKClcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoZmlsZSkge1xuICAgICAgICBDb2xsZWN0aW9ucy5maWxlcy51cGRhdGUoX2lkLCB7XG4gICAgICAgICAgJHNldDoge1xuICAgICAgICAgICAgJ21ldGEudW5saXN0ZWQnOiBmaWxlLm1ldGEudW5saXN0ZWQgPyBmYWxzZSA6IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH0sIF9hcHAuTk9PUCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMSwgJ0FjY2VzcyBkZW5pZWQhJyk7XG4gIH0sXG4gIGNoYW5nZVByaXZhY3koX2lkKSB7XG4gICAgY2hlY2soX2lkLCBTdHJpbmcpO1xuICAgIGlmIChNZXRlb3IudXNlcklkKCkpIHtcbiAgICAgIGNvbnN0IGZpbGUgPSBDb2xsZWN0aW9ucy5maWxlcy5maW5kT25lKHtcbiAgICAgICAgX2lkOiBfaWQsXG4gICAgICAgIHVzZXJJZDogTWV0ZW9yLnVzZXJJZCgpXG4gICAgICB9KTtcblxuICAgICAgaWYgKGZpbGUpIHtcbiAgICAgICAgQ29sbGVjdGlvbnMuZmlsZXMudXBkYXRlKF9pZCwge1xuICAgICAgICAgICRzZXQ6IHtcbiAgICAgICAgICAgICdtZXRhLnVubGlzdGVkJzogdHJ1ZSxcbiAgICAgICAgICAgICdtZXRhLnNlY3VyZWQnOiBmaWxlLm1ldGEuc2VjdXJlZCA/IGZhbHNlIDogdHJ1ZVxuICAgICAgICAgIH1cbiAgICAgICAgfSwgX2FwcC5OT09QKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAxLCAnQWNjZXNzIGRlbmllZCEnKTtcbiAgfSxcbiAgZ2V0U2VydmljZUNvbmZpZ3VyYXRpb24oKSB7XG4gICAgcmV0dXJuIF9hcHAuc2M7XG4gIH1cbn0pO1xuIiwiaW1wb3J0IHsgY2hlY2sgfSAgICAgICBmcm9tICdtZXRlb3IvY2hlY2snO1xuaW1wb3J0IHsgTWV0ZW9yIH0gICAgICBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IENvbGxlY3Rpb25zIH0gZnJvbSAnL2ltcG9ydHMvbGliL2NvcmUuanMnO1xuXG5NZXRlb3IucHVibGlzaCgnbGF0ZXN0JywgZnVuY3Rpb24odGFrZSA9IDEwLCB1c2VyT25seSA9IGZhbHNlKSB7XG4gIGNoZWNrKHRha2UsIE51bWJlcik7XG4gIGNoZWNrKHVzZXJPbmx5LCBCb29sZWFuKTtcblxuICBsZXQgc2VsZWN0b3I7XG4gIGlmICh1c2VyT25seSAmJiB0aGlzLnVzZXJJZCkge1xuICAgIHNlbGVjdG9yID0ge1xuICAgICAgdXNlcklkOiB0aGlzLnVzZXJJZFxuICAgIH07XG4gIH0gZWxzZSBpZiAodGhpcy51c2VySWQpIHtcbiAgICBzZWxlY3RvciA9IHtcbiAgICAgICRvcjogW1xuICAgICAgICB7XG4gICAgICAgICAgJ21ldGEudW5saXN0ZWQnOiBmYWxzZSxcbiAgICAgICAgICAnbWV0YS5zZWN1cmVkJzogZmFsc2UsXG4gICAgICAgICAgJ21ldGEuYmxhbWVkJzoge1xuICAgICAgICAgICAgJGx0OiAzXG4gICAgICAgICAgfVxuICAgICAgICB9LCB7XG4gICAgICAgICAgdXNlcklkOiB0aGlzLnVzZXJJZCxcbiAgICAgICAgICAnbWV0YS5ibGFtZWQnOiB7XG4gICAgICAgICAgICAkbHQ6IDNcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHNlbGVjdG9yID0ge1xuICAgICAgJ21ldGEudW5saXN0ZWQnOiBmYWxzZSxcbiAgICAgICdtZXRhLnNlY3VyZWQnOiBmYWxzZSxcbiAgICAgICdtZXRhLmJsYW1lZCc6IHtcbiAgICAgICAgJGx0OiAzXG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBDb2xsZWN0aW9ucy5maWxlcy5maW5kKHNlbGVjdG9yLCB7XG4gICAgbGltaXQ6IHRha2UsXG4gICAgc29ydDoge1xuICAgICAgJ21ldGEuY3JlYXRlZF9hdCc6IC0xXG4gICAgfSxcbiAgICBmaWVsZHM6IHtcbiAgICAgIF9pZDogMSxcbiAgICAgIG5hbWU6IDEsXG4gICAgICBzaXplOiAxLFxuICAgICAgbWV0YTogMSxcbiAgICAgIHR5cGU6IDEsXG4gICAgICBpc1BERjogMSxcbiAgICAgIGlzVGV4dDogMSxcbiAgICAgIGlzSlNPTjogMSxcbiAgICAgIGlzVmlkZW86IDEsXG4gICAgICBpc0F1ZGlvOiAxLFxuICAgICAgaXNJbWFnZTogMSxcbiAgICAgIHVzZXJJZDogMSxcbiAgICAgICd2ZXJzaW9ucy50aHVtYm5haWw0MC5leHRlbnNpb24nOiAxLFxuICAgICAgJ3ZlcnNpb25zLnByZXZpZXcuZXh0ZW5zaW9uJzogMSxcbiAgICAgIGV4dGVuc2lvbjogMSxcbiAgICAgIF9jb2xsZWN0aW9uTmFtZTogMSxcbiAgICAgIF9kb3dubG9hZFJvdXRlOiAxXG4gICAgfVxuICB9KS5jdXJzb3I7XG59KTtcblxuTWV0ZW9yLnB1Ymxpc2goJ2ZpbGUnLCBmdW5jdGlvbihfaWQpIHtcbiAgY2hlY2soX2lkLCBTdHJpbmcpO1xuXG4gIGxldCBzZWxlY3RvciA9IHtcbiAgICBfaWQ6IF9pZCxcbiAgICAnbWV0YS5zZWN1cmVkJzogZmFsc2VcbiAgfTtcblxuICBpZiAodGhpcy51c2VySWQpIHtcbiAgICBzZWxlY3RvciA9IHtcbiAgICAgICRvcjogW3NlbGVjdG9yLCB7XG4gICAgICAgIF9pZDogX2lkLFxuICAgICAgICAnbWV0YS5zZWN1cmVkJzogdHJ1ZSxcbiAgICAgICAgdXNlcklkOiB0aGlzLnVzZXJJZFxuICAgICAgfV1cbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIENvbGxlY3Rpb25zLmZpbGVzLmZpbmQoc2VsZWN0b3IsIHtcbiAgICBmaWVsZHM6IHtcbiAgICAgIF9pZDogMSxcbiAgICAgIG5hbWU6IDEsXG4gICAgICBzaXplOiAxLFxuICAgICAgdHlwZTogMSxcbiAgICAgIG1ldGE6IDEsXG4gICAgICBpc1BERjogMSxcbiAgICAgIGlzVGV4dDogMSxcbiAgICAgIGlzSlNPTjogMSxcbiAgICAgIGlzVmlkZW86IDEsXG4gICAgICBpc0F1ZGlvOiAxLFxuICAgICAgaXNJbWFnZTogMSxcbiAgICAgIGV4dGVuc2lvbjogMSxcbiAgICAgICd2ZXJzaW9ucy50aHVtYm5haWw0MC5leHRlbnNpb24nOiAxLFxuICAgICAgJ3ZlcnNpb25zLnByZXZpZXcuZXh0ZW5zaW9uJzogMSxcbiAgICAgIF9jb2xsZWN0aW9uTmFtZTogMSxcbiAgICAgIF9kb3dubG9hZFJvdXRlOiAxXG4gICAgfVxuICB9KS5jdXJzb3I7XG59KTtcbiIsImltcG9ydCB7IF9hcHAgfSAgICAgICAgICAgICAgICAgZnJvbSAnL2ltcG9ydHMvbGliL2NvcmUuanMnO1xuaW1wb3J0IHsgU2VydmljZUNvbmZpZ3VyYXRpb24gfSBmcm9tICdtZXRlb3Ivc2VydmljZS1jb25maWd1cmF0aW9uJztcblxuX2FwcC5zYyA9IHt9O1xuU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMucmVtb3ZlKHt9KTtcblxuaWYgKHByb2Nlc3MuZW52LkFDQ09VTlRTX01FVEVPUl9JRCAmJiBwcm9jZXNzLmVudi5BQ0NPVU5UU19NRVRFT1JfU0VDKSB7XG4gIF9hcHAuc2MubWV0ZW9yID0gdHJ1ZTtcbiAgU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMudXBzZXJ0KHtcbiAgICBzZXJ2aWNlOiAnbWV0ZW9yLWRldmVsb3BlcidcbiAgfSwge1xuICAgICRzZXQ6IHtcbiAgICAgIHNlY3JldDogcHJvY2Vzcy5lbnYuQUNDT1VOVFNfTUVURU9SX1NFQyxcbiAgICAgIGNsaWVudElkOiBwcm9jZXNzLmVudi5BQ0NPVU5UU19NRVRFT1JfSUQsXG4gICAgICBsb2dpblN0eWxlOiAncmVkaXJlY3QnXG4gICAgfVxuICB9KTtcbn1cblxuaWYgKHByb2Nlc3MuZW52LkFDQ09VTlRTX0dJVEhVQl9JRCAmJiBwcm9jZXNzLmVudi5BQ0NPVU5UU19HSVRIVUJfU0VDKSB7XG4gIF9hcHAuc2MuZ2l0aHViID0gdHJ1ZTtcbiAgU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMudXBzZXJ0KHtcbiAgICBzZXJ2aWNlOiAnZ2l0aHViJ1xuICB9LCB7XG4gICAgJHNldDoge1xuICAgICAgc2VjcmV0OiBwcm9jZXNzLmVudi5BQ0NPVU5UU19HSVRIVUJfU0VDLFxuICAgICAgY2xpZW50SWQ6IHByb2Nlc3MuZW52LkFDQ09VTlRTX0dJVEhVQl9JRCxcbiAgICAgIGxvZ2luU3R5bGU6ICdyZWRpcmVjdCdcbiAgICB9XG4gIH0pO1xufVxuXG5pZiAocHJvY2Vzcy5lbnYuQUNDT1VOVFNfVFdJVFRFUl9JRCAmJiBwcm9jZXNzLmVudi5BQ0NPVU5UU19UV0lUVEVSX1NFQykge1xuICBfYXBwLnNjLnR3aXR0ZXIgPSB0cnVlO1xuICBTZXJ2aWNlQ29uZmlndXJhdGlvbi5jb25maWd1cmF0aW9ucy51cHNlcnQoe1xuICAgIHNlcnZpY2U6ICd0d2l0dGVyJ1xuICB9LCB7XG4gICAgJHNldDoge1xuICAgICAgbG9naW5TdHlsZTogJ3JlZGlyZWN0JyxcbiAgICAgIHNlY3JldDogcHJvY2Vzcy5lbnYuQUNDT1VOVFNfVFdJVFRFUl9TRUMsXG4gICAgICBjb25zdW1lcktleTogcHJvY2Vzcy5lbnYuQUNDT1VOVFNfVFdJVFRFUl9JRFxuICAgIH1cbiAgfSk7XG59XG5cbmlmIChwcm9jZXNzLmVudi5BQ0NPVU5UU19GQUNFQk9PS19JRCAmJiBwcm9jZXNzLmVudi5BQ0NPVU5UU19GQUNFQk9PS19TRUMpIHtcbiAgX2FwcC5zYy5mYWNlYm9vayA9IHRydWU7XG4gIFNlcnZpY2VDb25maWd1cmF0aW9uLmNvbmZpZ3VyYXRpb25zLnVwc2VydCh7XG4gICAgc2VydmljZTogJ2ZhY2Vib29rJ1xuICB9LCB7XG4gICAgJHNldDoge1xuICAgICAgc2VjcmV0OiBwcm9jZXNzLmVudi5BQ0NPVU5UU19GQUNFQk9PS19TRUMsXG4gICAgICBhcHBJZDogcHJvY2Vzcy5lbnYuQUNDT1VOVFNfRkFDRUJPT0tfSUQsXG4gICAgICBsb2dpblN0eWxlOiAncmVkaXJlY3QnXG4gICAgfVxuICB9KTtcbn1cbiIsIi8vIGltcG9ydCB7IFdlYkFwcCB9IGZyb20gJ21ldGVvci93ZWJhcHAnO1xuLy8gaW1wb3J0IFNwaWRlcmFibGUgZnJvbSAnbWV0ZW9yL29zdHJpbzpzcGlkZXJhYmxlLW1pZGRsZXdhcmUnO1xuLy9cbi8vIFdlYkFwcC5jb25uZWN0SGFuZGxlcnMudXNlKG5ldyBTcGlkZXJhYmxlKHtcbi8vICAgcm9vdFVSTDogJ2h0dHBzOi8vZmlsZXMudmVsaW92LmNvbScsXG4vLyAgIHNlcnZpY2VVUkw6ICdodHRwczovL3JlbmRlci5vc3RyLmlvJyxcbi8vICAgYXV0aDogJ3h4eDp5eXknXG4vLyB9KSk7XG4iLCJpbXBvcnQgJy9pbXBvcnRzL3NlcnZlci9maWxlcy5jb2xsZWN0aW9uLmpzJztcbmltcG9ydCAnL2ltcG9ydHMvc2VydmVyL2ltYWdlLXByb2Nlc3NpbmcuanMnO1xuaW1wb3J0ICcvaW1wb3J0cy9zZXJ2ZXIvbWV0aG9kcy5qcyc7XG5pbXBvcnQgJy9pbXBvcnRzL3NlcnZlci9wdWJsaWNhdGlvbnMuanMnO1xuaW1wb3J0ICcvaW1wb3J0cy9zZXJ2ZXIvc2VydmljZS1jb25maWd1cmF0aW9ucy5qcyc7XG5pbXBvcnQgJy9pbXBvcnRzL3NlcnZlci9zcGlkZXJhYmxlLmpzJztcbiJdfQ==
