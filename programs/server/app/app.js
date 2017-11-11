var require = meteorInstall({"imports":{"lib":{"core.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// imports/lib/core.js                                                                                               //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({
  _app: () => _app,
  Collections: () => Collections
});
const Collections = {};
const _app = {
  NOOP() {}

};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"files.collection.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// imports/server/files.collection.js                                                                                //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
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
let Random;
module.watch(require("meteor/random"), {
  Random(v) {
    Random = v;
  }

}, 2);
let filesize;
module.watch(require("meteor/mrt:filesize"), {
  filesize(v) {
    filesize = v;
  }

}, 3);
let FilesCollection;
module.watch(require("meteor/ostrio:files"), {
  FilesCollection(v) {
    FilesCollection = v;
  }

}, 4);

let _app, Collections;

module.watch(require("/imports/lib/core.js"), {
  _app(v) {
    _app = v;
  },

  Collections(v) {
    Collections = v;
  }

}, 5);
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
      if (file && file.userId && _.isString(file.userId)) {
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
          headers: _.pick(http.request.headers, 'range', 'cache-control', 'connection')
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

          let range = _.clone(http.request.headers.range);

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
            upd['$set']['versions.' + version + '.meta.pipeFrom'] = xml.url;
            upd['$set']['versions.' + version + '.meta.pipePath'] = stat.path;
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
              console.error("client.makeUrl doesn't returns xml", {
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
      _.each(fileRef.versions, (vRef, version) => {
        readFile(fileRef, vRef, version);
      });
    };
  } else if (useS3) {
    sendToStorage = fileRef => {
      _.each(fileRef.versions, (vRef, version) => {
        // We use Random.id() instead of real file's _id
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
              upd['$set']['versions.' + version + '.meta.pipePath'] = filePath;
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
      });
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
      _.each(fileRef.versions, vRef => {
        if (vRef && vRef.meta && vRef.meta.pipePath != null) {
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
      });
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
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"image-processing.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// imports/server/image-processing.js                                                                                //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
let _;

module.watch(require("meteor/underscore"), {
  _(v) {
    _ = v;
  }

}, 0);

let _app;

module.watch(require("/imports/lib/core.js"), {
  _app(v) {
    _app = v;
  }

}, 1);
let check;
module.watch(require("meteor/check"), {
  check(v) {
    check = v;
  }

}, 2);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 3);
let fs;
module.watch(require("fs-extra"), {
  default(v) {
    fs = v;
  }

}, 4);
let gm;
module.watch(require("gm"), {
  default(v) {
    gm = v;
  }

}, 5);
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
            console.error('[_app.createThumbnails] [_.each sizes]', error);
            finish(new Meteor.Error('[_app.createThumbnails] [_.each sizes]', error));
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

          _.each(sizes, (size, name) => {
            const path = collection.storagePath(fileRef) + '/' + name + '-' + fileRef._id + '.' + fileRef.extension;

            const copyPaste = () => {
              fs.copy(fileRef.path, path, fsCopyError => {
                bound(() => {
                  if (fsCopyError) {
                    console.error('[_app.createThumbnails] [_.each sizes] [fs.copy]', fsCopyError);
                    finish(fsCopyError);
                    return;
                  }

                  const upd = {
                    $set: {}
                  };
                  upd['$set']['versions.' + name] = {
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
                    console.error('[_app.createThumbnails] [_.each sizes] [img.resize]', upNSaveError);
                    finish(upNSaveError);
                    return;
                  }

                  fs.stat(path, (fsStatError, stat) => {
                    bound(() => {
                      if (fsStatError) {
                        console.error('[_app.createThumbnails] [_.each sizes] [img.resize] [fs.stat]', fsStatError);
                        finish(fsStatError);
                        return;
                      }

                      gm(path).size((gmSizeError, imgInfo) => {
                        bound(() => {
                          if (gmSizeError) {
                            console.error('[_app.createThumbnails] [_.each sizes] [img.resize] [fs.stat] [gm(path).size]', gmSizeError);
                            finish(gmSizeError);
                            return;
                          }

                          const upd = {
                            $set: {}
                          };
                          upd['$set']['versions.' + name] = {
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
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"methods.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// imports/server/methods.js                                                                                         //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// imports/server/publications.js                                                                                    //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
  return Collections.files.find({
    $or: [{
      _id: _id,
      'meta.secured': false
    }, {
      _id: _id,
      'meta.secured': true,
      userId: this.userId
    }]
  }, {
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
      'versions.preview.extension': 1,
      _collectionName: 1,
      _downloadRoute: 1
    }
  }).cursor;
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"service-configurations.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// imports/server/service-configurations.js                                                                          //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"spiderable.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// imports/server/spiderable.js                                                                                      //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
// import { WebApp } from 'meteor/webapp';
// import Spiderable from 'meteor/ostrio:spiderable-middleware';
//
// WebApp.connectHandlers.use(new Spiderable({
//   rootURL: 'https://files.veliov.com',
//   serviceURL: 'https://render.ostr.io',
//   auth: 'xxx:yyy'
// }));
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"server":{"core.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// server/core.js                                                                                                    //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.watch(require("/imports/server/files.collection.js"));
module.watch(require("/imports/server/image-processing.js"));
module.watch(require("/imports/server/methods.js"));
module.watch(require("/imports/server/publications.js"));
module.watch(require("/imports/server/service-configurations.js"));
module.watch(require("/imports/server/spiderable.js"));
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("./server/core.js");
//# sourceURL=meteor://💻app/app/app.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9saWIvY29yZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9zZXJ2ZXIvZmlsZXMuY29sbGVjdGlvbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9zZXJ2ZXIvaW1hZ2UtcHJvY2Vzc2luZy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9zZXJ2ZXIvbWV0aG9kcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9zZXJ2ZXIvcHVibGljYXRpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3NlcnZlci9zZXJ2aWNlLWNvbmZpZ3VyYXRpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3NlcnZlci9zcGlkZXJhYmxlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9zZXJ2ZXIvY29yZS5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJfYXBwIiwiQ29sbGVjdGlvbnMiLCJOT09QIiwiXyIsIndhdGNoIiwicmVxdWlyZSIsInYiLCJNZXRlb3IiLCJSYW5kb20iLCJmaWxlc2l6ZSIsIkZpbGVzQ29sbGVjdGlvbiIsInVzZURyb3BCb3giLCJ1c2VTMyIsImNsaWVudCIsInNlbmRUb1N0b3JhZ2UiLCJmcyIsIlMzIiwic3RyZWFtIiwicmVxdWVzdCIsIkRyb3Bib3giLCJib3VuZCIsImJpbmRFbnZpcm9ubWVudCIsImNhbGxiYWNrIiwicHJvY2VzcyIsImVudiIsIkRST1BCT1giLCJzZXR0aW5ncyIsImRyb3Bib3giLCJKU09OIiwicGFyc2UiLCJzMyIsInMzQ29uZiIsImRiQ29uZiIsImtleSIsInNlY3JldCIsInRva2VuIiwiQ2xpZW50IiwiYnVja2V0IiwicmVnaW9uIiwic2VjcmV0QWNjZXNzS2V5IiwiYWNjZXNzS2V5SWQiLCJzc2xFbmFibGVkIiwiaHR0cE9wdGlvbnMiLCJ0aW1lb3V0IiwiYWdlbnQiLCJmaWxlcyIsInN0b3JhZ2VQYXRoIiwiY29sbGVjdGlvbk5hbWUiLCJhbGxvd0NsaWVudENvZGUiLCJwcm90ZWN0ZWQiLCJmaWxlT2JqIiwibWV0YSIsInNlY3VyZWQiLCJ1c2VySWQiLCJvbkJlZm9yZVJlbW92ZSIsImN1cnNvciIsInJlcyIsIm1hcCIsImZpbGUiLCJpc1N0cmluZyIsImluZGV4T2YiLCJvbkJlZm9yZVVwbG9hZCIsInNpemUiLCJkb3dubG9hZENhbGxiYWNrIiwicGFyYW1zIiwicXVlcnkiLCJkb3dubG9hZCIsImNvbGxlY3Rpb24iLCJ1cGRhdGUiLCJfaWQiLCIkaW5jIiwiaW50ZXJjZXB0RG93bmxvYWQiLCJodHRwIiwiZmlsZVJlZiIsInZlcnNpb24iLCJwYXRoIiwidmVyc2lvbnMiLCJwaXBlRnJvbSIsInNlcnZlIiwidXJsIiwiaGVhZGVycyIsInBpY2siLCJwaXBlUGF0aCIsIm9wdHMiLCJCdWNrZXQiLCJLZXkiLCJyYW5nZSIsInZSZWYiLCJjbG9uZSIsImFycmF5Iiwic3BsaXQiLCJzdGFydCIsInBhcnNlSW50IiwiZW5kIiwiaXNOYU4iLCJjaHVua1NpemUiLCJSYW5nZSIsImZpbGVDb2xsIiwiZ2V0T2JqZWN0IiwiZXJyb3IiLCJjb25zb2xlIiwicmVzcG9uc2UiLCJmaW5pc2hlZCIsImh0dHBSZXNwb25zZSIsInJlcGxhY2UiLCJkYXRhU3RyZWFtIiwiUGFzc1Rocm91Z2giLCJkYXRhIiwiQm9keSIsImRlbnlDbGllbnQiLCJvbiIsIl9maWxlUmVmIiwibWFrZVVybCIsInN0YXQiLCJ0cmllc1VybCIsImxvbmciLCJkb3dubG9hZEhhY2siLCJ4bWwiLCJzZXRUaW1lb3V0IiwidXBkIiwiJHNldCIsInVwZEVycm9yIiwidW5saW5rIiwiZmluZE9uZSIsIndyaXRlVG9EQiIsInRyaWVzU2VuZCIsIndyaXRlRmlsZSIsImV4dGVuc2lvbiIsInJlYWRGaWxlIiwidHJpZXNSZWFkIiwiZWFjaCIsImZpbGVQYXRoIiwiaWQiLCJwdXRPYmplY3QiLCJTdG9yYWdlQ2xhc3MiLCJjcmVhdGVSZWFkU3RyZWFtIiwiQ29udGVudFR5cGUiLCJ0eXBlIiwidGVzdCIsImNyZWF0ZVRodW1ibmFpbHMiLCJfb3JpZ1JlbW92ZSIsInJlbW92ZSIsInNlYXJjaCIsImZpbmQiLCJmb3JFYWNoIiwiZGVsZXRlT2JqZWN0IiwiY2FsbCIsInNldEludGVydmFsIiwiJGx0ZSIsIkRhdGUiLCJjaGVjayIsImRlZmF1bHQiLCJnbSIsImNiIiwiT2JqZWN0IiwiaXNMYXN0IiwiZmluaXNoIiwiZXhpc3RzIiwiRXJyb3IiLCJpbWFnZSIsInNpemVzIiwicHJldmlldyIsIndpZHRoIiwidGh1bWJuYWlsNDAiLCJzcXVhcmUiLCJmZWF0dXJlcyIsImkiLCJoZWlnaHQiLCJuYW1lIiwiY29weVBhc3RlIiwiY29weSIsImZzQ29weUVycm9yIiwiY29sVXBkRXJyb3IiLCJrZXlzIiwibGVuZ3RoIiwiaW1nIiwicXVhbGl0eSIsImRlZmluZSIsImF1dG9PcmllbnQiLCJub1Byb2ZpbGUiLCJzdHJpcCIsImRpdGhlciIsImludGVybGFjZSIsImZpbHRlciIsInVwZGF0ZUFuZFNhdmUiLCJ1cE5TYXZlRXJyb3IiLCJmc1N0YXRFcnJvciIsImdtU2l6ZUVycm9yIiwiaW1nSW5mbyIsInJlc2l6ZSIsIndyaXRlIiwieCIsInkiLCJ3aWR0aFJhdGlvIiwiaGVpZ2h0UmF0aW8iLCJ3aWR0aE5ldyIsImhlaWdodE5ldyIsImNyb3AiLCJtZXRob2RzIiwiZmlsZXNMZW5naHQiLCJ1c2VyT25seSIsIkJvb2xlYW4iLCJzZWxlY3RvciIsIiRvciIsIiRsdCIsImNvdW50IiwidW5ibGFtZSIsIlN0cmluZyIsImJsYW1lIiwiY2hhbmdlQWNjZXNzIiwidW5saXN0ZWQiLCJjaGFuZ2VQcml2YWN5IiwiZ2V0U2VydmljZUNvbmZpZ3VyYXRpb24iLCJzYyIsInB1Ymxpc2giLCJ0YWtlIiwiTnVtYmVyIiwibGltaXQiLCJzb3J0IiwiZmllbGRzIiwiaXNQREYiLCJpc1RleHQiLCJpc0pTT04iLCJpc1ZpZGVvIiwiaXNBdWRpbyIsImlzSW1hZ2UiLCJfY29sbGVjdGlvbk5hbWUiLCJfZG93bmxvYWRSb3V0ZSIsIlNlcnZpY2VDb25maWd1cmF0aW9uIiwiY29uZmlndXJhdGlvbnMiLCJBQ0NPVU5UU19NRVRFT1JfSUQiLCJBQ0NPVU5UU19NRVRFT1JfU0VDIiwibWV0ZW9yIiwidXBzZXJ0Iiwic2VydmljZSIsImNsaWVudElkIiwibG9naW5TdHlsZSIsIkFDQ09VTlRTX0dJVEhVQl9JRCIsIkFDQ09VTlRTX0dJVEhVQl9TRUMiLCJnaXRodWIiLCJBQ0NPVU5UU19UV0lUVEVSX0lEIiwiQUNDT1VOVFNfVFdJVFRFUl9TRUMiLCJ0d2l0dGVyIiwiY29uc3VtZXJLZXkiLCJBQ0NPVU5UU19GQUNFQk9PS19JRCIsIkFDQ09VTlRTX0ZBQ0VCT09LX1NFQyIsImZhY2Vib29rIiwiYXBwSWQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUFBLE9BQU9DLE1BQVAsQ0FBYztBQUFDQyxRQUFLLE1BQUlBLElBQVY7QUFBZUMsZUFBWSxNQUFJQTtBQUEvQixDQUFkO0FBQUEsTUFBTUEsY0FBYyxFQUFwQjtBQUNBLE1BQU1ELE9BQU87QUFBRUUsU0FBTSxDQUFFOztBQUFWLENBQWIsQzs7Ozs7Ozs7Ozs7QUNEQSxJQUFJQyxDQUFKOztBQUFNTCxPQUFPTSxLQUFQLENBQWFDLFFBQVEsbUJBQVIsQ0FBYixFQUEwQztBQUFDRixJQUFFRyxDQUFGLEVBQUk7QUFBQ0gsUUFBRUcsQ0FBRjtBQUFJOztBQUFWLENBQTFDLEVBQXNELENBQXREO0FBQXlELElBQUlDLE1BQUo7QUFBV1QsT0FBT00sS0FBUCxDQUFhQyxRQUFRLGVBQVIsQ0FBYixFQUFzQztBQUFDRSxTQUFPRCxDQUFQLEVBQVM7QUFBQ0MsYUFBT0QsQ0FBUDtBQUFTOztBQUFwQixDQUF0QyxFQUE0RCxDQUE1RDtBQUErRCxJQUFJRSxNQUFKO0FBQVdWLE9BQU9NLEtBQVAsQ0FBYUMsUUFBUSxlQUFSLENBQWIsRUFBc0M7QUFBQ0csU0FBT0YsQ0FBUCxFQUFTO0FBQUNFLGFBQU9GLENBQVA7QUFBUzs7QUFBcEIsQ0FBdEMsRUFBNEQsQ0FBNUQ7QUFB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LENBQWI7QUFBbUVQLE9BQU9NLEtBQVAsQ0FBYUMsUUFBUSwrQkFBUixDQUFiLEUiLCJmaWxlIjoiL2FwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IENvbGxlY3Rpb25zID0ge307XG5jb25zdCBfYXBwID0geyBOT09QKCl7fSB9O1xuXG5leHBvcnQgeyBfYXBwLCBDb2xsZWN0aW9ucyB9O1xuIiwiaW1wb3J0IHsgXyB9ICAgICAgICAgICAgICAgICBmcm9tICdtZXRlb3IvdW5kZXJzY29yZSc7XG5pbXBvcnQgeyBNZXRlb3IgfSAgICAgICAgICAgIGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgUmFuZG9tIH0gICAgICAgICAgICBmcm9tICdtZXRlb3IvcmFuZG9tJztcbmltcG9ydCB7IGZpbGVzaXplIH0gICAgICAgICAgZnJvbSAnbWV0ZW9yL21ydDpmaWxlc2l6ZSc7XG5pbXBvcnQgeyBGaWxlc0NvbGxlY3Rpb24gfSAgIGZyb20gJ21ldGVvci9vc3RyaW86ZmlsZXMnO1xuaW1wb3J0IHsgX2FwcCwgQ29sbGVjdGlvbnMgfSBmcm9tICcvaW1wb3J0cy9saWIvY29yZS5qcyc7XG5cbi8vIERyb3BCb3ggdXNhZ2U6XG4vLyBSZWFkOiBodHRwczovL2dpdGh1Yi5jb20vVmVsaW92R3JvdXAvTWV0ZW9yLUZpbGVzL3dpa2kvRHJvcEJveC1JbnRlZ3JhdGlvblxuLy8gZW52LnZhciBleGFtcGxlOiBEUk9QQk9YPSd7XCJkcm9wYm94XCI6e1wia2V5XCI6IFwieHh4XCIsIFwic2VjcmV0XCI6IFwieHh4XCIsIFwidG9rZW5cIjogXCJ4eHhcIn19J1xubGV0IHVzZURyb3BCb3ggPSBmYWxzZTtcblxuLy8gQVdTOlMzIHVzYWdlOlxuLy8gUmVhZDogaHR0cHM6Ly9naXRodWIuY29tL1ZlbGlvdkdyb3VwL01ldGVvci1GaWxlcy93aWtpL0FXUy1TMy1JbnRlZ3JhdGlvblxuLy8gZW52LnZhciBleGFtcGxlOiBTMz0ne1wiczNcIjp7XCJrZXlcIjogXCJ4eHhcIiwgXCJzZWNyZXRcIjogXCJ4eHhcIiwgXCJidWNrZXRcIjogXCJ4eHhcIiwgXCJyZWdpb25cIjogXCJ4eHhcIlwifX0nXG5sZXQgdXNlUzMgPSBmYWxzZTtcbmxldCBjbGllbnQ7XG5sZXQgc2VuZFRvU3RvcmFnZTtcblxuY29uc3QgZnMgICAgICA9IHJlcXVpcmUoJ2ZzLWV4dHJhJyk7XG5jb25zdCBTMyAgICAgID0gcmVxdWlyZSgnYXdzLXNkay9jbGllbnRzL3MzJyk7XG5jb25zdCBzdHJlYW0gID0gcmVxdWlyZSgnc3RyZWFtJyk7XG5jb25zdCByZXF1ZXN0ID0gcmVxdWlyZSgncmVxdWVzdCcpO1xuY29uc3QgRHJvcGJveCA9IHJlcXVpcmUoJ2Ryb3Bib3gnKTtcbmNvbnN0IGJvdW5kICAgPSBNZXRlb3IuYmluZEVudmlyb25tZW50KChjYWxsYmFjaykgPT4ge1xuICByZXR1cm4gY2FsbGJhY2soKTtcbn0pO1xuXG5pZiAocHJvY2Vzcy5lbnYuRFJPUEJPWCkge1xuICBNZXRlb3Iuc2V0dGluZ3MuZHJvcGJveCA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuRFJPUEJPWCkuZHJvcGJveDtcbn0gZWxzZSBpZiAocHJvY2Vzcy5lbnYuUzMpIHtcbiAgTWV0ZW9yLnNldHRpbmdzLnMzID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5TMykuczM7XG59XG5cbmNvbnN0IHMzQ29uZiA9IE1ldGVvci5zZXR0aW5ncy5zMyB8fCB7fTtcbmNvbnN0IGRiQ29uZiA9IE1ldGVvci5zZXR0aW5ncy5kcm9wYm94IHx8IHt9O1xuXG5pZiAoZGJDb25mICYmIGRiQ29uZi5rZXkgJiYgZGJDb25mLnNlY3JldCAmJiBkYkNvbmYudG9rZW4pIHtcbiAgdXNlRHJvcEJveCA9IHRydWU7XG4gIGNsaWVudCAgICAgPSBuZXcgRHJvcGJveC5DbGllbnQoe1xuICAgIGtleTogZGJDb25mLmtleSxcbiAgICBzZWNyZXQ6IGRiQ29uZi5zZWNyZXQsXG4gICAgdG9rZW46IGRiQ29uZi50b2tlblxuICB9KTtcbn0gZWxzZSBpZiAoczNDb25mICYmIHMzQ29uZi5rZXkgJiYgczNDb25mLnNlY3JldCAmJiBzM0NvbmYuYnVja2V0ICYmIHMzQ29uZi5yZWdpb24pIHtcbiAgdXNlUzMgID0gdHJ1ZTtcbiAgY2xpZW50ID0gbmV3IFMzKHtcbiAgICBzZWNyZXRBY2Nlc3NLZXk6IHMzQ29uZi5zZWNyZXQsXG4gICAgYWNjZXNzS2V5SWQ6IHMzQ29uZi5rZXksXG4gICAgcmVnaW9uOiBzM0NvbmYucmVnaW9uLFxuICAgIHNzbEVuYWJsZWQ6IGZhbHNlLFxuICAgIGh0dHBPcHRpb25zOiB7XG4gICAgICB0aW1lb3V0OiA2MDAwLFxuICAgICAgYWdlbnQ6IGZhbHNlXG4gICAgfVxuICB9KTtcbn1cblxuQ29sbGVjdGlvbnMuZmlsZXMgPSBuZXcgRmlsZXNDb2xsZWN0aW9uKHtcbiAgLy8gZGVidWc6IHRydWUsXG4gIHN0b3JhZ2VQYXRoOiAnYXNzZXRzL2FwcC91cGxvYWRzL3VwbG9hZGVkRmlsZXMnLFxuICBjb2xsZWN0aW9uTmFtZTogJ3VwbG9hZGVkRmlsZXMnLFxuICBhbGxvd0NsaWVudENvZGU6IHRydWUsXG4gIC8vIGRpc2FibGVVcGxvYWQ6IHRydWUsXG4gIC8vIGRpc2FibGVEb3dubG9hZDogdHJ1ZSxcbiAgcHJvdGVjdGVkKGZpbGVPYmopIHtcbiAgICBpZiAoZmlsZU9iaikge1xuICAgICAgaWYgKCEoZmlsZU9iai5tZXRhICYmIGZpbGVPYmoubWV0YS5zZWN1cmVkKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoKGZpbGVPYmoubWV0YSAmJiBmaWxlT2JqLm1ldGEuc2VjdXJlZCA9PT0gdHJ1ZSkgJiYgdGhpcy51c2VySWQgPT09IGZpbGVPYmoudXNlcklkKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG4gIG9uQmVmb3JlUmVtb3ZlKGN1cnNvcikge1xuICAgIGNvbnN0IHJlcyA9IGN1cnNvci5tYXAoKGZpbGUpID0+IHtcbiAgICAgIGlmIChmaWxlICYmIGZpbGUudXNlcklkICYmIF8uaXNTdHJpbmcoZmlsZS51c2VySWQpKSB7XG4gICAgICAgIHJldHVybiBmaWxlLnVzZXJJZCA9PT0gdGhpcy51c2VySWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gICAgcmV0dXJuICF+cmVzLmluZGV4T2YoZmFsc2UpO1xuICB9LFxuICBvbkJlZm9yZVVwbG9hZCgpIHtcbiAgICBpZiAodGhpcy5maWxlLnNpemUgPD0gMTAyNCAqIDEwMjQgKiAxMjgpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gXCJNYXguIGZpbGUgc2l6ZSBpcyAxMjhNQiB5b3UndmUgdHJpZWQgdG8gdXBsb2FkIFwiICsgKGZpbGVzaXplKHRoaXMuZmlsZS5zaXplKSk7XG4gIH0sXG4gIGRvd25sb2FkQ2FsbGJhY2soZmlsZU9iaikge1xuICAgIGlmICh0aGlzLnBhcmFtcyAmJiB0aGlzLnBhcmFtcy5xdWVyeSAmJiB0aGlzLnBhcmFtcy5xdWVyeS5kb3dubG9hZCA9PT0gJ3RydWUnKSB7XG4gICAgICBDb2xsZWN0aW9ucy5maWxlcy5jb2xsZWN0aW9uLnVwZGF0ZShmaWxlT2JqLl9pZCwge1xuICAgICAgICAkaW5jOiB7XG4gICAgICAgICAgJ21ldGEuZG93bmxvYWRzJzogMVxuICAgICAgICB9XG4gICAgICB9LCBfYXBwLk5PT1ApO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcbiAgaW50ZXJjZXB0RG93bmxvYWQoaHR0cCwgZmlsZVJlZiwgdmVyc2lvbikge1xuICAgIGxldCBwYXRoO1xuICAgIGlmICh1c2VEcm9wQm94KSB7XG4gICAgICBwYXRoID0gKGZpbGVSZWYgJiYgZmlsZVJlZi52ZXJzaW9ucyAmJiBmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dICYmIGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl0ubWV0YSAmJiBmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dLm1ldGEucGlwZUZyb20pID8gZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXS5tZXRhLnBpcGVGcm9tIDogdm9pZCAwO1xuICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgLy8gSWYgZmlsZSBpcyBzdWNjZXNzZnVsbHkgbW92ZWQgdG8gU3RvcmFnZVxuICAgICAgICAvLyBXZSB3aWxsIHBpcGUgcmVxdWVzdCB0byBTdG9yYWdlXG4gICAgICAgIC8vIFNvLCBvcmlnaW5hbCBsaW5rIHdpbGwgc3RheSBhbHdheXMgc2VjdXJlXG5cbiAgICAgICAgLy8gVG8gZm9yY2UgP3BsYXkgYW5kID9kb3dubG9hZCBwYXJhbWV0ZXJzXG4gICAgICAgIC8vIGFuZCB0byBrZWVwIG9yaWdpbmFsIGZpbGUgbmFtZSwgY29udGVudC10eXBlLFxuICAgICAgICAvLyBjb250ZW50LWRpc3Bvc2l0aW9uIGFuZCBjYWNoZS1jb250cm9sXG4gICAgICAgIC8vIHdlJ3JlIHVzaW5nIGxvdy1sZXZlbCAuc2VydmUoKSBtZXRob2RcbiAgICAgICAgdGhpcy5zZXJ2ZShodHRwLCBmaWxlUmVmLCBmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dLCB2ZXJzaW9uLCByZXF1ZXN0KHtcbiAgICAgICAgICB1cmw6IHBhdGgsXG4gICAgICAgICAgaGVhZGVyczogXy5waWNrKGh0dHAucmVxdWVzdC5oZWFkZXJzLCAncmFuZ2UnLCAnY2FjaGUtY29udHJvbCcsICdjb25uZWN0aW9uJylcbiAgICAgICAgfSkpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIC8vIFdoaWxlIGZpbGUgaXMgbm90IHlldCB1cGxvYWRlZCB0byBTdG9yYWdlXG4gICAgICAvLyBXZSB3aWxsIHNlcnZlIGZpbGUgZnJvbSBGU1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAodXNlUzMpIHtcbiAgICAgIHBhdGggPSAoZmlsZVJlZiAmJiBmaWxlUmVmLnZlcnNpb25zICYmIGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl0gJiYgZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXS5tZXRhICYmIGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl0ubWV0YS5waXBlUGF0aCkgPyBmaWxlUmVmLnZlcnNpb25zW3ZlcnNpb25dLm1ldGEucGlwZVBhdGggOiB2b2lkIDA7XG4gICAgICBpZiAocGF0aCkge1xuICAgICAgICAvLyBJZiBmaWxlIGlzIHN1Y2Nlc3NmdWxseSBtb3ZlZCB0byBTdG9yYWdlXG4gICAgICAgIC8vIFdlIHdpbGwgcGlwZSByZXF1ZXN0IHRvIFN0b3JhZ2VcbiAgICAgICAgLy8gU28sIG9yaWdpbmFsIGxpbmsgd2lsbCBzdGF5IGFsd2F5cyBzZWN1cmVcblxuICAgICAgICAvLyBUbyBmb3JjZSA/cGxheSBhbmQgP2Rvd25sb2FkIHBhcmFtZXRlcnNcbiAgICAgICAgLy8gYW5kIHRvIGtlZXAgb3JpZ2luYWwgZmlsZSBuYW1lLCBjb250ZW50LXR5cGUsXG4gICAgICAgIC8vIGNvbnRlbnQtZGlzcG9zaXRpb24gYW5kIGNhY2hlLWNvbnRyb2xcbiAgICAgICAgLy8gd2UncmUgdXNpbmcgbG93LWxldmVsIC5zZXJ2ZSgpIG1ldGhvZFxuICAgICAgICBjb25zdCBvcHRzID0ge1xuICAgICAgICAgIEJ1Y2tldDogczNDb25mLmJ1Y2tldCxcbiAgICAgICAgICBLZXk6IHBhdGhcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoaHR0cC5yZXF1ZXN0LmhlYWRlcnMucmFuZ2UpIHtcbiAgICAgICAgICBjb25zdCB2UmVmICA9IGZpbGVSZWYudmVyc2lvbnNbdmVyc2lvbl07XG4gICAgICAgICAgbGV0IHJhbmdlICAgPSBfLmNsb25lKGh0dHAucmVxdWVzdC5oZWFkZXJzLnJhbmdlKTtcbiAgICAgICAgICBjb25zdCBhcnJheSA9IHJhbmdlLnNwbGl0KC9ieXRlcz0oWzAtOV0qKS0oWzAtOV0qKS8pO1xuICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gcGFyc2VJbnQoYXJyYXlbMV0pO1xuICAgICAgICAgIGxldCBlbmQgICAgID0gcGFyc2VJbnQoYXJyYXlbMl0pO1xuICAgICAgICAgIGlmIChpc05hTihlbmQpKSB7XG4gICAgICAgICAgICAvLyBSZXF1ZXN0IGRhdGEgZnJvbSBBV1M6UzMgYnkgc21hbGwgY2h1bmtzXG4gICAgICAgICAgICBlbmQgICAgICAgPSAoc3RhcnQgKyB0aGlzLmNodW5rU2l6ZSkgLSAxO1xuICAgICAgICAgICAgaWYgKGVuZCA+PSB2UmVmLnNpemUpIHtcbiAgICAgICAgICAgICAgZW5kICAgICA9IHZSZWYuc2l6ZSAtIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIG9wdHMuUmFuZ2UgICA9IGBieXRlcz0ke3N0YXJ0fS0ke2VuZH1gO1xuICAgICAgICAgIGh0dHAucmVxdWVzdC5oZWFkZXJzLnJhbmdlID0gYGJ5dGVzPSR7c3RhcnR9LSR7ZW5kfWA7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBmaWxlQ29sbCA9IHRoaXM7XG4gICAgICAgIGNsaWVudC5nZXRPYmplY3Qob3B0cywgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgICAgIGlmICghaHR0cC5yZXNwb25zZS5maW5pc2hlZCkge1xuICAgICAgICAgICAgICBodHRwLnJlc3BvbnNlLmVuZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaHR0cC5yZXF1ZXN0LmhlYWRlcnMucmFuZ2UgJiYgdGhpcy5odHRwUmVzcG9uc2UuaGVhZGVyc1snY29udGVudC1yYW5nZSddKSB7XG4gICAgICAgICAgICAgIC8vIFNldCBwcm9wZXIgcmFuZ2UgaGVhZGVyIGluIGFjY29yZGluZyB0byB3aGF0IGlzIHJldHVybmVkIGZyb20gQVdTOlMzXG4gICAgICAgICAgICAgIGh0dHAucmVxdWVzdC5oZWFkZXJzLnJhbmdlID0gdGhpcy5odHRwUmVzcG9uc2UuaGVhZGVyc1snY29udGVudC1yYW5nZSddLnNwbGl0KCcvJylbMF0ucmVwbGFjZSgnYnl0ZXMgJywgJ2J5dGVzPScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBkYXRhU3RyZWFtID0gbmV3IHN0cmVhbS5QYXNzVGhyb3VnaCgpO1xuICAgICAgICAgICAgZmlsZUNvbGwuc2VydmUoaHR0cCwgZmlsZVJlZiwgZmlsZVJlZi52ZXJzaW9uc1t2ZXJzaW9uXSwgdmVyc2lvbiwgZGF0YVN0cmVhbSk7XG4gICAgICAgICAgICBkYXRhU3RyZWFtLmVuZCh0aGlzLmRhdGEuQm9keSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIC8vIFdoaWxlIGZpbGUgaXMgbm90IHlldCB1cGxvYWRlZCB0byBTdG9yYWdlXG4gICAgICAvLyBXZSB3aWxsIHNlcnZlIGZpbGUgZnJvbSBGU1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn0pO1xuXG5Db2xsZWN0aW9ucy5maWxlcy5kZW55Q2xpZW50KCk7XG5Db2xsZWN0aW9ucy5maWxlcy5vbignYWZ0ZXJVcGxvYWQnLCBmdW5jdGlvbihfZmlsZVJlZikge1xuICBpZiAodXNlRHJvcEJveCkge1xuICAgIGNvbnN0IG1ha2VVcmwgPSAoc3RhdCwgZmlsZVJlZiwgdmVyc2lvbiwgdHJpZXNVcmwgPSAwKSA9PiB7XG4gICAgICBjbGllbnQubWFrZVVybChzdGF0LnBhdGgsIHtcbiAgICAgICAgbG9uZzogdHJ1ZSxcbiAgICAgICAgZG93bmxvYWRIYWNrOiB0cnVlXG4gICAgICB9LCAoZXJyb3IsIHhtbCkgPT4ge1xuICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgLy8gU3RvcmUgZG93bmxvYWRhYmxlIGxpbmsgaW4gZmlsZSdzIG1ldGEgb2JqZWN0XG4gICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICBpZiAodHJpZXNVcmwgPCAxMCkge1xuICAgICAgICAgICAgICBNZXRlb3Iuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgbWFrZVVybChzdGF0LCBmaWxlUmVmLCB2ZXJzaW9uLCArK3RyaWVzVXJsKTtcbiAgICAgICAgICAgICAgfSwgMjA0OCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yLCB7XG4gICAgICAgICAgICAgICAgdHJpZXNVcmw6IHRyaWVzVXJsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoeG1sKSB7XG4gICAgICAgICAgICBjb25zdCB1cGQgPSB7ICRzZXQ6IHt9IH07XG4gICAgICAgICAgICB1cGRbJyRzZXQnXVsndmVyc2lvbnMuJyArIHZlcnNpb24gKyAnLm1ldGEucGlwZUZyb20nXSA9IHhtbC51cmw7XG4gICAgICAgICAgICB1cGRbJyRzZXQnXVsndmVyc2lvbnMuJyArIHZlcnNpb24gKyAnLm1ldGEucGlwZVBhdGgnXSA9IHN0YXQucGF0aDtcbiAgICAgICAgICAgIHRoaXMuY29sbGVjdGlvbi51cGRhdGUoe1xuICAgICAgICAgICAgICBfaWQ6IGZpbGVSZWYuX2lkXG4gICAgICAgICAgICB9LCB1cGQsICh1cGRFcnJvcikgPT4ge1xuICAgICAgICAgICAgICBpZiAodXBkRXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKHVwZEVycm9yKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBVbmxpbmsgb3JpZ2luYWwgZmlsZXMgZnJvbSBGU1xuICAgICAgICAgICAgICAgIC8vIGFmdGVyIHN1Y2Nlc3NmdWwgdXBsb2FkIHRvIERyb3BCb3hcbiAgICAgICAgICAgICAgICB0aGlzLnVubGluayh0aGlzLmNvbGxlY3Rpb24uZmluZE9uZShmaWxlUmVmLl9pZCksIHZlcnNpb24pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHRyaWVzVXJsIDwgMTApIHtcbiAgICAgICAgICAgICAgTWV0ZW9yLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIGRvd25sb2FkYWJsZSBsaW5rXG4gICAgICAgICAgICAgICAgbWFrZVVybChzdGF0LCBmaWxlUmVmLCB2ZXJzaW9uLCArK3RyaWVzVXJsKTtcbiAgICAgICAgICAgICAgfSwgMjA0OCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiY2xpZW50Lm1ha2VVcmwgZG9lc24ndCByZXR1cm5zIHhtbFwiLCB7XG4gICAgICAgICAgICAgICAgdHJpZXNVcmw6IHRyaWVzVXJsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgY29uc3Qgd3JpdGVUb0RCID0gKGZpbGVSZWYsIHZlcnNpb24sIGRhdGEsIHRyaWVzU2VuZCA9IDApID0+IHtcbiAgICAgIC8vIERyb3BCb3ggYWxyZWFkeSB1c2VzIHJhbmRvbSBVUkxzXG4gICAgICAvLyBObyBuZWVkIHRvIHVzZSByYW5kb20gZmlsZSBuYW1lc1xuICAgICAgY2xpZW50LndyaXRlRmlsZShmaWxlUmVmLl9pZCArICctJyArIHZlcnNpb24gKyAnLicgKyBmaWxlUmVmLmV4dGVuc2lvbiwgZGF0YSwgKGVycm9yLCBzdGF0KSA9PiB7XG4gICAgICAgIGJvdW5kKCgpID0+IHtcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGlmICh0cmllc1NlbmQgPCAxMCkge1xuICAgICAgICAgICAgICBNZXRlb3Iuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gV3JpdGUgZmlsZSB0byBEcm9wQm94XG4gICAgICAgICAgICAgICAgd3JpdGVUb0RCKGZpbGVSZWYsIHZlcnNpb24sIGRhdGEsICsrdHJpZXNTZW5kKTtcbiAgICAgICAgICAgICAgfSwgMjA0OCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yLCB7XG4gICAgICAgICAgICAgICAgdHJpZXNTZW5kOiB0cmllc1NlbmRcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1ha2VVcmwoc3RhdCwgZmlsZVJlZiwgdmVyc2lvbik7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBjb25zdCByZWFkRmlsZSA9IChmaWxlUmVmLCB2UmVmLCB2ZXJzaW9uLCB0cmllc1JlYWQgPSAwKSA9PiB7XG4gICAgICBmcy5yZWFkRmlsZSh2UmVmLnBhdGgsIChlcnJvciwgZGF0YSkgPT4ge1xuICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICBpZiAodHJpZXNSZWFkIDwgMTApIHtcbiAgICAgICAgICAgICAgcmVhZEZpbGUoZmlsZVJlZiwgdlJlZiwgdmVyc2lvbiwgKyt0cmllc1JlYWQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdyaXRlVG9EQihmaWxlUmVmLCB2ZXJzaW9uLCBkYXRhKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHNlbmRUb1N0b3JhZ2UgPSAoZmlsZVJlZikgPT4ge1xuICAgICAgXy5lYWNoKGZpbGVSZWYudmVyc2lvbnMsICh2UmVmLCB2ZXJzaW9uKSA9PiB7XG4gICAgICAgIHJlYWRGaWxlKGZpbGVSZWYsIHZSZWYsIHZlcnNpb24pO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfSBlbHNlIGlmICh1c2VTMykge1xuICAgIHNlbmRUb1N0b3JhZ2UgPSAoZmlsZVJlZikgPT4ge1xuICAgICAgXy5lYWNoKGZpbGVSZWYudmVyc2lvbnMsICh2UmVmLCB2ZXJzaW9uKSA9PiB7XG4gICAgICAgIC8vIFdlIHVzZSBSYW5kb20uaWQoKSBpbnN0ZWFkIG9mIHJlYWwgZmlsZSdzIF9pZFxuICAgICAgICAvLyB0byBzZWN1cmUgZmlsZXMgZnJvbSByZXZlcnNlIGVuZ2luZWVyaW5nXG4gICAgICAgIC8vIEFzIGFmdGVyIHZpZXdpbmcgdGhpcyBjb2RlIGl0IHdpbGwgYmUgZWFzeVxuICAgICAgICAvLyB0byBnZXQgYWNjZXNzIHRvIHVubGlzdGVkIGFuZCBwcm90ZWN0ZWQgZmlsZXNcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSAnZmlsZXMvJyArIChSYW5kb20uaWQoKSkgKyAnLScgKyB2ZXJzaW9uICsgJy4nICsgZmlsZVJlZi5leHRlbnNpb247XG5cbiAgICAgICAgY2xpZW50LnB1dE9iamVjdCh7XG4gICAgICAgICAgU3RvcmFnZUNsYXNzOiAnU1RBTkRBUkQnLFxuICAgICAgICAgIEJ1Y2tldDogczNDb25mLmJ1Y2tldCxcbiAgICAgICAgICBLZXk6IGZpbGVQYXRoLFxuICAgICAgICAgIEJvZHk6IGZzLmNyZWF0ZVJlYWRTdHJlYW0odlJlZi5wYXRoKSxcbiAgICAgICAgICBDb250ZW50VHlwZTogdlJlZi50eXBlLFxuICAgICAgICB9LCAoZXJyb3IpID0+IHtcbiAgICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb25zdCB1cGQgPSB7ICRzZXQ6IHt9IH07XG4gICAgICAgICAgICAgIHVwZFsnJHNldCddWyd2ZXJzaW9ucy4nICsgdmVyc2lvbiArICcubWV0YS5waXBlUGF0aCddID0gZmlsZVBhdGg7XG4gICAgICAgICAgICAgIHRoaXMuY29sbGVjdGlvbi51cGRhdGUoe1xuICAgICAgICAgICAgICAgIF9pZDogZmlsZVJlZi5faWRcbiAgICAgICAgICAgICAgfSwgdXBkLCAodXBkRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodXBkRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IodXBkRXJyb3IpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAvLyBVbmxpbmsgb3JpZ2luYWwgZmlsZSBmcm9tIEZTXG4gICAgICAgICAgICAgICAgICAvLyBhZnRlciBzdWNjZXNzZnVsIHVwbG9hZCB0byBBV1M6UzNcbiAgICAgICAgICAgICAgICAgIHRoaXMudW5saW5rKHRoaXMuY29sbGVjdGlvbi5maW5kT25lKGZpbGVSZWYuX2lkKSwgdmVyc2lvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKC9wbmd8anBlP2cvaS50ZXN0KF9maWxlUmVmLmV4dGVuc2lvbiB8fCAnJykpIHtcbiAgICBNZXRlb3Iuc2V0VGltZW91dCggKCkgPT4ge1xuICAgICAgX2FwcC5jcmVhdGVUaHVtYm5haWxzKHRoaXMsIF9maWxlUmVmLCAoZXJyb3IpID0+IHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodXNlRHJvcEJveCB8fCB1c2VTMykge1xuICAgICAgICAgIHNlbmRUb1N0b3JhZ2UodGhpcy5jb2xsZWN0aW9uLmZpbmRPbmUoX2ZpbGVSZWYuX2lkKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0sIDEwMjQpO1xuICB9IGVsc2Uge1xuICAgIGlmICh1c2VEcm9wQm94IHx8IHVzZVMzKSB7XG4gICAgICBzZW5kVG9TdG9yYWdlKF9maWxlUmVmKTtcbiAgICB9XG4gIH1cbn0pO1xuXG4vLyBUaGlzIGxpbmUgbm93IGNvbW1lbnRlZCBkdWUgdG8gSGVyb2t1IHVzYWdlXG4vLyBDb2xsZWN0aW9ucy5maWxlcy5jb2xsZWN0aW9uLl9lbnN1cmVJbmRleCB7J21ldGEuZXhwaXJlQXQnOiAxfSwge2V4cGlyZUFmdGVyU2Vjb25kczogMCwgYmFja2dyb3VuZDogdHJ1ZX1cblxuLy8gSW50ZXJjZXB0IEZpbGVDb2xsZWN0aW9uJ3MgcmVtb3ZlIG1ldGhvZFxuLy8gdG8gcmVtb3ZlIGZpbGUgZnJvbSBEcm9wQm94IG9yIEFXUyBTM1xuaWYgKHVzZURyb3BCb3ggfHwgdXNlUzMpIHtcbiAgY29uc3QgX29yaWdSZW1vdmUgPSBDb2xsZWN0aW9ucy5maWxlcy5yZW1vdmU7XG4gIENvbGxlY3Rpb25zLmZpbGVzLnJlbW92ZSA9IGZ1bmN0aW9uKHNlYXJjaCkge1xuICAgIGNvbnN0IGN1cnNvciA9IHRoaXMuY29sbGVjdGlvbi5maW5kKHNlYXJjaCk7XG4gICAgY3Vyc29yLmZvckVhY2goKGZpbGVSZWYpID0+IHtcbiAgICAgIF8uZWFjaChmaWxlUmVmLnZlcnNpb25zLCAodlJlZikgPT4ge1xuICAgICAgICBpZiAodlJlZiAmJiB2UmVmLm1ldGEgJiYgdlJlZi5tZXRhLnBpcGVQYXRoICE9IG51bGwpIHtcbiAgICAgICAgICBpZiAodXNlRHJvcEJveCkge1xuICAgICAgICAgICAgLy8gRHJvcEJveCB1c2FnZTpcbiAgICAgICAgICAgIGNsaWVudC5yZW1vdmUodlJlZi5tZXRhLnBpcGVQYXRoLCAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgYm91bmQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBBV1M6UzMgdXNhZ2U6XG4gICAgICAgICAgICBjbGllbnQuZGVsZXRlT2JqZWN0KHtcbiAgICAgICAgICAgICAgQnVja2V0OiBzM0NvbmYuYnVja2V0LFxuICAgICAgICAgICAgICBLZXk6IHZSZWYubWV0YS5waXBlUGF0aCxcbiAgICAgICAgICAgIH0sIChlcnJvcikgPT4ge1xuICAgICAgICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICAvLyBDYWxsIG9yaWdpbmFsIG1ldGhvZFxuICAgIF9vcmlnUmVtb3ZlLmNhbGwodGhpcywgc2VhcmNoKTtcbiAgfTtcbn1cblxuLy8gUmVtb3ZlIGFsbCBmaWxlcyBvbiBzZXJ2ZXIgbG9hZC9yZWxvYWQsIHVzZWZ1bCB3aGlsZSB0ZXN0aW5nL2RldmVsb3BtZW50XG4vLyBNZXRlb3Iuc3RhcnR1cCAtPiBDb2xsZWN0aW9ucy5maWxlcy5yZW1vdmUge31cblxuLy8gUmVtb3ZlIGZpbGVzIGFsb25nIHdpdGggTW9uZ29EQiByZWNvcmRzIHR3byBtaW51dGVzIGJlZm9yZSBleHBpcmF0aW9uIGRhdGVcbi8vIElmIHdlIGhhdmUgJ2V4cGlyZUFmdGVyU2Vjb25kcycgaW5kZXggb24gJ21ldGEuZXhwaXJlQXQnIGZpZWxkLFxuLy8gaXQgd29uJ3QgcmVtb3ZlIGZpbGVzIHRoZW1zZWx2ZXMuXG5NZXRlb3Iuc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICBDb2xsZWN0aW9ucy5maWxlcy5yZW1vdmUoe1xuICAgICdtZXRhLmV4cGlyZUF0Jzoge1xuICAgICAgJGx0ZTogbmV3IERhdGUoK25ldyBEYXRlKCkgKyAxMjAwMDApXG4gICAgfVxuICB9LCBfYXBwLk5PT1ApO1xufSwgMTIwMDAwKTtcbiIsImltcG9ydCB7IF8gfSAgICAgIGZyb20gJ21ldGVvci91bmRlcnNjb3JlJztcbmltcG9ydCB7IF9hcHAgfSAgIGZyb20gJy9pbXBvcnRzL2xpYi9jb3JlLmpzJztcbmltcG9ydCB7IGNoZWNrIH0gIGZyb20gJ21ldGVvci9jaGVjayc7XG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcblxuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBnbSBmcm9tICdnbSc7XG4vL1NvbWUgcGxhdGZvcm1zIG1heSBidW5kbGUgSW1hZ2VNYWdpY2sgaW50byB0aGVpciB0b29scyAobGlrZSBIZXJva3UpLiBJbiB0aGlzIGNhc2UgeW91IG1heSB1c2UgR3JhcGhpY3NNYWdpY2sgYXMgSW1hZ2VtYWdpY2sgaW4gdGhpcyB3YXk6XG4vL25wbSBpbnN0YWxsIGdtIC0tc2F2ZSBhbmQgdGhlbiB3aGVyZSB5b3UgdXNlIGl0OlxuLy9jb25zdCBnbSA9IHJlcXVpcmUoJ2dtJyk7XG4vL2NvbnN0IGltID0gZ20uc3ViQ2xhc3MoeyBpbWFnZU1hZ2ljazogdHJ1ZSB9KTtcbi8vUGxlYXNlIG5vdGUgdGhhdCBHTSB3YXMgY29uc2lkZXJlZCBzbGlnaHRseSBmYXN0ZXIgdGhhbiBJTSBzbyBiZWZvcmUgeW91IGNob3NlIGNvbnZlbmllbmNlIG92ZXIgcGVyZm9ybWFuY2UgcmVhZCB0aGUgbGF0ZXN0IG5ld3MgYWJvdXQgaXQuXG4vL2h0dHBzOi8vbWF6aXJhLmNvbS9ibG9nL2NvbXBhcmluZy1zcGVlZC1pbWFnZW1hZ2ljay1ncmFwaGljc21hZ2lja1xuXG5jb25zdCBib3VuZCA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGNhbGxiYWNrKSA9PiB7XG4gIHJldHVybiBjYWxsYmFjaygpO1xufSk7XG5cbl9hcHAuY3JlYXRlVGh1bWJuYWlscyA9IChjb2xsZWN0aW9uLCBmaWxlUmVmLCBjYikgPT4ge1xuICBjaGVjayhmaWxlUmVmLCBPYmplY3QpO1xuXG4gIGxldCBpc0xhc3QgPSBmYWxzZTtcbiAgY29uc3QgZmluaXNoID0gKGVycm9yKSA9PiB7XG4gICAgYm91bmQoKCkgPT4ge1xuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tfYXBwLmNyZWF0ZVRodW1ibmFpbHNdIFtmaW5pc2hdJywgZXJyb3IpO1xuICAgICAgICBjYiAmJiBjYiAoZXJyb3IpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGlzTGFzdCkge1xuICAgICAgICAgIGNiICYmIGNiKHZvaWQgMCwgZmlsZVJlZik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9O1xuXG4gIGZzLmV4aXN0cyhmaWxlUmVmLnBhdGgsIChleGlzdHMpID0+IHtcbiAgICBib3VuZCgoKSA9PiB7XG4gICAgICBpZiAoIWV4aXN0cykge1xuICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdGaWxlICcgKyBmaWxlUmVmLnBhdGggKyAnIG5vdCBmb3VuZCBpbiBbY3JlYXRlVGh1bWJuYWlsc10gTWV0aG9kJyk7XG4gICAgICB9XG4gICAgICBjb25zdCBpbWFnZSA9IGdtKGZpbGVSZWYucGF0aCk7XG4gICAgICBjb25zdCBzaXplcyA9IHtcbiAgICAgICAgcHJldmlldzoge1xuICAgICAgICAgIHdpZHRoOiA0MDBcbiAgICAgICAgfSxcbiAgICAgICAgdGh1bWJuYWlsNDA6IHtcbiAgICAgICAgICB3aWR0aDogNDAsXG4gICAgICAgICAgc3F1YXJlOiB0cnVlXG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGltYWdlLnNpemUoKGVycm9yLCBmZWF0dXJlcykgPT4ge1xuICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbX2FwcC5jcmVhdGVUaHVtYm5haWxzXSBbXy5lYWNoIHNpemVzXScsIGVycm9yKTtcbiAgICAgICAgICAgIGZpbmlzaChuZXcgTWV0ZW9yLkVycm9yKCdbX2FwcC5jcmVhdGVUaHVtYm5haWxzXSBbXy5lYWNoIHNpemVzXScsIGVycm9yKSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICAgIGNvbGxlY3Rpb24uY29sbGVjdGlvbi51cGRhdGUoZmlsZVJlZi5faWQsIHtcbiAgICAgICAgICAgICRzZXQ6IHtcbiAgICAgICAgICAgICAgJ21ldGEud2lkdGgnOiBmZWF0dXJlcy53aWR0aCxcbiAgICAgICAgICAgICAgJ21ldGEuaGVpZ2h0JzogZmVhdHVyZXMuaGVpZ2h0LFxuICAgICAgICAgICAgICAndmVyc2lvbnMub3JpZ2luYWwubWV0YS53aWR0aCc6IGZlYXR1cmVzLndpZHRoLFxuICAgICAgICAgICAgICAndmVyc2lvbnMub3JpZ2luYWwubWV0YS5oZWlnaHQnOiBmZWF0dXJlcy5oZWlnaHRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LCBfYXBwLk5PT1ApO1xuXG4gICAgICAgICAgXy5lYWNoKHNpemVzLCAoc2l6ZSwgbmFtZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcGF0aCA9IChjb2xsZWN0aW9uLnN0b3JhZ2VQYXRoKGZpbGVSZWYpKSArICcvJyArIG5hbWUgKyAnLScgKyBmaWxlUmVmLl9pZCArICcuJyArIGZpbGVSZWYuZXh0ZW5zaW9uO1xuICAgICAgICAgICAgY29uc3QgY29weVBhc3RlID0gKCkgPT4ge1xuICAgICAgICAgICAgICBmcy5jb3B5KGZpbGVSZWYucGF0aCwgcGF0aCwgKGZzQ29weUVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgYm91bmQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGZzQ29weUVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tfYXBwLmNyZWF0ZVRodW1ibmFpbHNdIFtfLmVhY2ggc2l6ZXNdIFtmcy5jb3B5XScsIGZzQ29weUVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgZmluaXNoKGZzQ29weUVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBjb25zdCB1cGQgPSB7ICRzZXQ6IHt9IH07XG4gICAgICAgICAgICAgICAgICB1cGRbJyRzZXQnXVsndmVyc2lvbnMuJyArIG5hbWVdID0ge1xuICAgICAgICAgICAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICAgICAgICAgICAgICBzaXplOiBmaWxlUmVmLnNpemUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGZpbGVSZWYudHlwZSxcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBmaWxlUmVmLmV4dGVuc2lvbixcbiAgICAgICAgICAgICAgICAgICAgbWV0YToge1xuICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBmZWF0dXJlcy53aWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IGZlYXR1cmVzLmhlaWdodFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICBjb2xsZWN0aW9uLmNvbGxlY3Rpb24udXBkYXRlKGZpbGVSZWYuX2lkLCB1cGQsIChjb2xVcGRFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICArK2k7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpID09PSBPYmplY3Qua2V5cyhzaXplcykubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgaXNMYXN0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmaW5pc2goY29sVXBkRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKC9wbmd8anBlP2cvaS50ZXN0KGZpbGVSZWYuZXh0ZW5zaW9uKSkge1xuICAgICAgICAgICAgICBjb25zdCBpbWcgPSBnbShmaWxlUmVmLnBhdGgpXG4gICAgICAgICAgICAgICAgLnF1YWxpdHkoNzApXG4gICAgICAgICAgICAgICAgLmRlZmluZSgnZmlsdGVyOnN1cHBvcnQ9MicpXG4gICAgICAgICAgICAgICAgLmRlZmluZSgnanBlZzpmYW5jeS11cHNhbXBsaW5nPWZhbHNlJylcbiAgICAgICAgICAgICAgICAuZGVmaW5lKCdqcGVnOmZhbmN5LXVwc2FtcGxpbmc9b2ZmJylcbiAgICAgICAgICAgICAgICAuZGVmaW5lKCdwbmc6Y29tcHJlc3Npb24tZmlsdGVyPTUnKVxuICAgICAgICAgICAgICAgIC5kZWZpbmUoJ3BuZzpjb21wcmVzc2lvbi1sZXZlbD05JylcbiAgICAgICAgICAgICAgICAuZGVmaW5lKCdwbmc6Y29tcHJlc3Npb24tc3RyYXRlZ3k9MScpXG4gICAgICAgICAgICAgICAgLmRlZmluZSgncG5nOmV4Y2x1ZGUtY2h1bms9YWxsJylcbiAgICAgICAgICAgICAgICAuYXV0b09yaWVudCgpXG4gICAgICAgICAgICAgICAgLm5vUHJvZmlsZSgpXG4gICAgICAgICAgICAgICAgLnN0cmlwKClcbiAgICAgICAgICAgICAgICAuZGl0aGVyKGZhbHNlKVxuICAgICAgICAgICAgICAgIC5pbnRlcmxhY2UoJ0xpbmUnKVxuICAgICAgICAgICAgICAgIC5maWx0ZXIoJ1RyaWFuZ2xlJyk7XG5cbiAgICAgICAgICAgICAgY29uc3QgdXBkYXRlQW5kU2F2ZSA9ICh1cE5TYXZlRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAodXBOU2F2ZUVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tfYXBwLmNyZWF0ZVRodW1ibmFpbHNdIFtfLmVhY2ggc2l6ZXNdIFtpbWcucmVzaXplXScsIHVwTlNhdmVFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIGZpbmlzaCh1cE5TYXZlRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBmcy5zdGF0KHBhdGgsIChmc1N0YXRFcnJvciwgc3RhdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBib3VuZCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGZzU3RhdEVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbX2FwcC5jcmVhdGVUaHVtYm5haWxzXSBbXy5lYWNoIHNpemVzXSBbaW1nLnJlc2l6ZV0gW2ZzLnN0YXRdJywgZnNTdGF0RXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmluaXNoKGZzU3RhdEVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICBnbShwYXRoKS5zaXplKChnbVNpemVFcnJvciwgaW1nSW5mbykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgYm91bmQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ21TaXplRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbX2FwcC5jcmVhdGVUaHVtYm5haWxzXSBbXy5lYWNoIHNpemVzXSBbaW1nLnJlc2l6ZV0gW2ZzLnN0YXRdIFtnbShwYXRoKS5zaXplXScsIGdtU2l6ZUVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5pc2goZ21TaXplRXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cGQgPSB7ICRzZXQ6IHt9IH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHVwZFsnJHNldCddWyd2ZXJzaW9ucy4nICsgbmFtZV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaXplOiBzdGF0LnNpemUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogZmlsZVJlZi50eXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbjogZmlsZVJlZi5leHRlbnNpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogZmlsZVJlZi5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBpbWdJbmZvLndpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBpbWdJbmZvLmhlaWdodFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xsZWN0aW9uLmNvbGxlY3Rpb24udXBkYXRlKGZpbGVSZWYuX2lkLCB1cGQsIChjb2xVcGRFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICsraTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA9PT0gT2JqZWN0LmtleXMoc2l6ZXMpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNMYXN0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluaXNoKGNvbFVwZEVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICBpZiAoIXNpemUuc3F1YXJlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZlYXR1cmVzLndpZHRoID4gc2l6ZS53aWR0aCkge1xuICAgICAgICAgICAgICAgICAgaW1nLnJlc2l6ZShzaXplLndpZHRoKS5pbnRlcmxhY2UoJ0xpbmUnKS53cml0ZShwYXRoLCB1cGRhdGVBbmRTYXZlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgY29weVBhc3RlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCB4ID0gMDtcbiAgICAgICAgICAgICAgICBsZXQgeSA9IDA7XG4gICAgICAgICAgICAgICAgY29uc3Qgd2lkdGhSYXRpbyAgPSBmZWF0dXJlcy53aWR0aCAvIHNpemUud2lkdGg7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVpZ2h0UmF0aW8gPSBmZWF0dXJlcy5oZWlnaHQgLyBzaXplLndpZHRoO1xuICAgICAgICAgICAgICAgIGxldCB3aWR0aE5ldyAgICAgID0gc2l6ZS53aWR0aDtcbiAgICAgICAgICAgICAgICBsZXQgaGVpZ2h0TmV3ICAgICA9IHNpemUud2lkdGg7XG5cbiAgICAgICAgICAgICAgICBpZiAoaGVpZ2h0UmF0aW8gPCB3aWR0aFJhdGlvKSB7XG4gICAgICAgICAgICAgICAgICB3aWR0aE5ldyA9IChzaXplLndpZHRoICogZmVhdHVyZXMud2lkdGgpIC8gZmVhdHVyZXMuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgeCA9ICh3aWR0aE5ldyAtIHNpemUud2lkdGgpIC8gMjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoaGVpZ2h0UmF0aW8gPiB3aWR0aFJhdGlvKSB7XG4gICAgICAgICAgICAgICAgICBoZWlnaHROZXcgPSAoc2l6ZS53aWR0aCAqIGZlYXR1cmVzLmhlaWdodCkgLyBmZWF0dXJlcy53aWR0aDtcbiAgICAgICAgICAgICAgICAgIHkgPSAoaGVpZ2h0TmV3IC0gc2l6ZS53aWR0aCkgLyAyO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGltZ1xuICAgICAgICAgICAgICAgICAgLnJlc2l6ZSh3aWR0aE5ldywgaGVpZ2h0TmV3KVxuICAgICAgICAgICAgICAgICAgLmNyb3Aoc2l6ZS53aWR0aCwgc2l6ZS53aWR0aCwgeCwgeSlcbiAgICAgICAgICAgICAgICAgIC5pbnRlcmxhY2UoJ0xpbmUnKVxuICAgICAgICAgICAgICAgICAgLndyaXRlKHBhdGgsIHVwZGF0ZUFuZFNhdmUpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb3B5UGFzdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiB0cnVlO1xufTtcbiIsImltcG9ydCB7IGNoZWNrIH0gICAgICAgICAgICAgZnJvbSAnbWV0ZW9yL2NoZWNrJztcbmltcG9ydCB7IE1ldGVvciB9ICAgICAgICAgICAgZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBfYXBwLCBDb2xsZWN0aW9ucyB9IGZyb20gJy9pbXBvcnRzL2xpYi9jb3JlLmpzJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuICBmaWxlc0xlbmdodCh1c2VyT25seSA9IGZhbHNlKSB7XG4gICAgY2hlY2sodXNlck9ubHksIEJvb2xlYW4pO1xuXG4gICAgbGV0IHNlbGVjdG9yO1xuICAgIGlmICh1c2VyT25seSAmJiB0aGlzLnVzZXJJZCkge1xuICAgICAgc2VsZWN0b3IgPSB7XG4gICAgICAgIHVzZXJJZDogdGhpcy51c2VySWRcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmICh0aGlzLnVzZXJJZCkge1xuICAgICAgc2VsZWN0b3IgPSB7XG4gICAgICAgICRvcjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgICdtZXRhLnVubGlzdGVkJzogZmFsc2UsXG4gICAgICAgICAgICAnbWV0YS5zZWN1cmVkJzogZmFsc2UsXG4gICAgICAgICAgICAnbWV0YS5ibGFtZWQnOiB7XG4gICAgICAgICAgICAgICRsdDogM1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgIHVzZXJJZDogdGhpcy51c2VySWQsXG4gICAgICAgICAgICAnbWV0YS5ibGFtZWQnOiB7XG4gICAgICAgICAgICAgICRsdDogM1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2VsZWN0b3IgPSB7XG4gICAgICAgICdtZXRhLnVubGlzdGVkJzogZmFsc2UsXG4gICAgICAgICdtZXRhLnNlY3VyZWQnOiBmYWxzZSxcbiAgICAgICAgJ21ldGEuYmxhbWVkJzoge1xuICAgICAgICAgICRsdDogM1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gQ29sbGVjdGlvbnMuZmlsZXMuZmluZChzZWxlY3RvcikuY291bnQoKTtcbiAgfSxcbiAgdW5ibGFtZShfaWQpIHtcbiAgICBjaGVjayhfaWQsIFN0cmluZyk7XG4gICAgQ29sbGVjdGlvbnMuZmlsZXMudXBkYXRlKHtcbiAgICAgIF9pZDogX2lkXG4gICAgfSwge1xuICAgICAgJGluYzoge1xuICAgICAgICAnbWV0YS5ibGFtZWQnOiAtMVxuICAgICAgfVxuICAgIH0sIF9hcHAuTk9PUCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG4gIGJsYW1lKF9pZCkge1xuICAgIGNoZWNrKF9pZCwgU3RyaW5nKTtcbiAgICBDb2xsZWN0aW9ucy5maWxlcy51cGRhdGUoe1xuICAgICAgX2lkOiBfaWRcbiAgICB9LCB7XG4gICAgICAkaW5jOiB7XG4gICAgICAgICdtZXRhLmJsYW1lZCc6IDFcbiAgICAgIH1cbiAgICB9LCBfYXBwLk5PT1ApO1xuICAgIHJldHVybiB0cnVlO1xuICB9LFxuICBjaGFuZ2VBY2Nlc3MoX2lkKSB7XG4gICAgY2hlY2soX2lkLCBTdHJpbmcpO1xuICAgIGlmIChNZXRlb3IudXNlcklkKCkpIHtcbiAgICAgIGNvbnN0IGZpbGUgPSBDb2xsZWN0aW9ucy5maWxlcy5maW5kT25lKHtcbiAgICAgICAgX2lkOiBfaWQsXG4gICAgICAgIHVzZXJJZDogTWV0ZW9yLnVzZXJJZCgpXG4gICAgICB9KTtcblxuICAgICAgaWYgKGZpbGUpIHtcbiAgICAgICAgQ29sbGVjdGlvbnMuZmlsZXMudXBkYXRlKF9pZCwge1xuICAgICAgICAgICRzZXQ6IHtcbiAgICAgICAgICAgICdtZXRhLnVubGlzdGVkJzogZmlsZS5tZXRhLnVubGlzdGVkID8gZmFsc2UgOiB0cnVlXG4gICAgICAgICAgfVxuICAgICAgICB9LCBfYXBwLk5PT1ApO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDEsICdBY2Nlc3MgZGVuaWVkIScpO1xuICB9LFxuICBjaGFuZ2VQcml2YWN5KF9pZCkge1xuICAgIGNoZWNrKF9pZCwgU3RyaW5nKTtcbiAgICBpZiAoTWV0ZW9yLnVzZXJJZCgpKSB7XG4gICAgICBjb25zdCBmaWxlID0gQ29sbGVjdGlvbnMuZmlsZXMuZmluZE9uZSh7XG4gICAgICAgIF9pZDogX2lkLFxuICAgICAgICB1c2VySWQ6IE1ldGVvci51c2VySWQoKVxuICAgICAgfSk7XG5cbiAgICAgIGlmIChmaWxlKSB7XG4gICAgICAgIENvbGxlY3Rpb25zLmZpbGVzLnVwZGF0ZShfaWQsIHtcbiAgICAgICAgICAkc2V0OiB7XG4gICAgICAgICAgICAnbWV0YS51bmxpc3RlZCc6IHRydWUsXG4gICAgICAgICAgICAnbWV0YS5zZWN1cmVkJzogZmlsZS5tZXRhLnNlY3VyZWQgPyBmYWxzZSA6IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH0sIF9hcHAuTk9PUCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMSwgJ0FjY2VzcyBkZW5pZWQhJyk7XG4gIH0sXG4gIGdldFNlcnZpY2VDb25maWd1cmF0aW9uKCkge1xuICAgIHJldHVybiBfYXBwLnNjO1xuICB9XG59KTtcbiIsImltcG9ydCB7IGNoZWNrIH0gICAgICAgZnJvbSAnbWV0ZW9yL2NoZWNrJztcbmltcG9ydCB7IE1ldGVvciB9ICAgICAgZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBDb2xsZWN0aW9ucyB9IGZyb20gJy9pbXBvcnRzL2xpYi9jb3JlLmpzJztcblxuTWV0ZW9yLnB1Ymxpc2goJ2xhdGVzdCcsIGZ1bmN0aW9uKHRha2UgPSAxMCwgdXNlck9ubHkgPSBmYWxzZSkge1xuICBjaGVjayh0YWtlLCBOdW1iZXIpO1xuICBjaGVjayh1c2VyT25seSwgQm9vbGVhbik7XG5cbiAgbGV0IHNlbGVjdG9yO1xuICBpZiAodXNlck9ubHkgJiYgdGhpcy51c2VySWQpIHtcbiAgICBzZWxlY3RvciA9IHtcbiAgICAgIHVzZXJJZDogdGhpcy51c2VySWRcbiAgICB9O1xuICB9IGVsc2UgaWYgKHRoaXMudXNlcklkKSB7XG4gICAgc2VsZWN0b3IgPSB7XG4gICAgICAkb3I6IFtcbiAgICAgICAge1xuICAgICAgICAgICdtZXRhLnVubGlzdGVkJzogZmFsc2UsXG4gICAgICAgICAgJ21ldGEuc2VjdXJlZCc6IGZhbHNlLFxuICAgICAgICAgICdtZXRhLmJsYW1lZCc6IHtcbiAgICAgICAgICAgICRsdDogM1xuICAgICAgICAgIH1cbiAgICAgICAgfSwge1xuICAgICAgICAgIHVzZXJJZDogdGhpcy51c2VySWQsXG4gICAgICAgICAgJ21ldGEuYmxhbWVkJzoge1xuICAgICAgICAgICAgJGx0OiAzXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICBzZWxlY3RvciA9IHtcbiAgICAgICdtZXRhLnVubGlzdGVkJzogZmFsc2UsXG4gICAgICAnbWV0YS5zZWN1cmVkJzogZmFsc2UsXG4gICAgICAnbWV0YS5ibGFtZWQnOiB7XG4gICAgICAgICRsdDogM1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICByZXR1cm4gQ29sbGVjdGlvbnMuZmlsZXMuZmluZChzZWxlY3Rvciwge1xuICAgIGxpbWl0OiB0YWtlLFxuICAgIHNvcnQ6IHtcbiAgICAgICdtZXRhLmNyZWF0ZWRfYXQnOiAtMVxuICAgIH0sXG4gICAgZmllbGRzOiB7XG4gICAgICBfaWQ6IDEsXG4gICAgICBuYW1lOiAxLFxuICAgICAgc2l6ZTogMSxcbiAgICAgIG1ldGE6IDEsXG4gICAgICB0eXBlOiAxLFxuICAgICAgaXNQREY6IDEsXG4gICAgICBpc1RleHQ6IDEsXG4gICAgICBpc0pTT046IDEsXG4gICAgICBpc1ZpZGVvOiAxLFxuICAgICAgaXNBdWRpbzogMSxcbiAgICAgIGlzSW1hZ2U6IDEsXG4gICAgICB1c2VySWQ6IDEsXG4gICAgICAndmVyc2lvbnMudGh1bWJuYWlsNDAuZXh0ZW5zaW9uJzogMSxcbiAgICAgICd2ZXJzaW9ucy5wcmV2aWV3LmV4dGVuc2lvbic6IDEsXG4gICAgICBleHRlbnNpb246IDEsXG4gICAgICBfY29sbGVjdGlvbk5hbWU6IDEsXG4gICAgICBfZG93bmxvYWRSb3V0ZTogMVxuICAgIH1cbiAgfSkuY3Vyc29yO1xufSk7XG5cbk1ldGVvci5wdWJsaXNoKCdmaWxlJywgZnVuY3Rpb24oX2lkKSB7XG4gIGNoZWNrKF9pZCwgU3RyaW5nKTtcbiAgcmV0dXJuIENvbGxlY3Rpb25zLmZpbGVzLmZpbmQoe1xuICAgICRvcjogW1xuICAgICAge1xuICAgICAgICBfaWQ6IF9pZCxcbiAgICAgICAgJ21ldGEuc2VjdXJlZCc6IGZhbHNlXG4gICAgICB9LCB7XG4gICAgICAgIF9pZDogX2lkLFxuICAgICAgICAnbWV0YS5zZWN1cmVkJzogdHJ1ZSxcbiAgICAgICAgdXNlcklkOiB0aGlzLnVzZXJJZFxuICAgICAgfVxuICAgIF1cbiAgfSwge1xuICAgIGZpZWxkczoge1xuICAgICAgX2lkOiAxLFxuICAgICAgbmFtZTogMSxcbiAgICAgIHNpemU6IDEsXG4gICAgICB0eXBlOiAxLFxuICAgICAgbWV0YTogMSxcbiAgICAgIGlzUERGOiAxLFxuICAgICAgaXNUZXh0OiAxLFxuICAgICAgaXNKU09OOiAxLFxuICAgICAgaXNWaWRlbzogMSxcbiAgICAgIGlzQXVkaW86IDEsXG4gICAgICBpc0ltYWdlOiAxLFxuICAgICAgZXh0ZW5zaW9uOiAxLFxuICAgICAgJ3ZlcnNpb25zLnByZXZpZXcuZXh0ZW5zaW9uJzogMSxcbiAgICAgIF9jb2xsZWN0aW9uTmFtZTogMSxcbiAgICAgIF9kb3dubG9hZFJvdXRlOiAxXG4gICAgfVxuICB9KS5jdXJzb3I7XG59KTtcbiIsImltcG9ydCB7IF9hcHAgfSAgICAgICAgICAgICAgICAgZnJvbSAnL2ltcG9ydHMvbGliL2NvcmUuanMnO1xuaW1wb3J0IHsgU2VydmljZUNvbmZpZ3VyYXRpb24gfSBmcm9tICdtZXRlb3Ivc2VydmljZS1jb25maWd1cmF0aW9uJztcblxuX2FwcC5zYyA9IHt9O1xuU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMucmVtb3ZlKHt9KTtcblxuaWYgKHByb2Nlc3MuZW52LkFDQ09VTlRTX01FVEVPUl9JRCAmJiBwcm9jZXNzLmVudi5BQ0NPVU5UU19NRVRFT1JfU0VDKSB7XG4gIF9hcHAuc2MubWV0ZW9yID0gdHJ1ZTtcbiAgU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMudXBzZXJ0KHtcbiAgICBzZXJ2aWNlOiAnbWV0ZW9yLWRldmVsb3BlcidcbiAgfSwge1xuICAgICRzZXQ6IHtcbiAgICAgIHNlY3JldDogcHJvY2Vzcy5lbnYuQUNDT1VOVFNfTUVURU9SX1NFQyxcbiAgICAgIGNsaWVudElkOiBwcm9jZXNzLmVudi5BQ0NPVU5UU19NRVRFT1JfSUQsXG4gICAgICBsb2dpblN0eWxlOiAncmVkaXJlY3QnXG4gICAgfVxuICB9KTtcbn1cblxuaWYgKHByb2Nlc3MuZW52LkFDQ09VTlRTX0dJVEhVQl9JRCAmJiBwcm9jZXNzLmVudi5BQ0NPVU5UU19HSVRIVUJfU0VDKSB7XG4gIF9hcHAuc2MuZ2l0aHViID0gdHJ1ZTtcbiAgU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMudXBzZXJ0KHtcbiAgICBzZXJ2aWNlOiAnZ2l0aHViJ1xuICB9LCB7XG4gICAgJHNldDoge1xuICAgICAgc2VjcmV0OiBwcm9jZXNzLmVudi5BQ0NPVU5UU19HSVRIVUJfU0VDLFxuICAgICAgY2xpZW50SWQ6IHByb2Nlc3MuZW52LkFDQ09VTlRTX0dJVEhVQl9JRCxcbiAgICAgIGxvZ2luU3R5bGU6ICdyZWRpcmVjdCdcbiAgICB9XG4gIH0pO1xufVxuXG5pZiAocHJvY2Vzcy5lbnYuQUNDT1VOVFNfVFdJVFRFUl9JRCAmJiBwcm9jZXNzLmVudi5BQ0NPVU5UU19UV0lUVEVSX1NFQykge1xuICBfYXBwLnNjLnR3aXR0ZXIgPSB0cnVlO1xuICBTZXJ2aWNlQ29uZmlndXJhdGlvbi5jb25maWd1cmF0aW9ucy51cHNlcnQoe1xuICAgIHNlcnZpY2U6ICd0d2l0dGVyJ1xuICB9LCB7XG4gICAgJHNldDoge1xuICAgICAgbG9naW5TdHlsZTogJ3JlZGlyZWN0JyxcbiAgICAgIHNlY3JldDogcHJvY2Vzcy5lbnYuQUNDT1VOVFNfVFdJVFRFUl9TRUMsXG4gICAgICBjb25zdW1lcktleTogcHJvY2Vzcy5lbnYuQUNDT1VOVFNfVFdJVFRFUl9JRFxuICAgIH1cbiAgfSk7XG59XG5cbmlmIChwcm9jZXNzLmVudi5BQ0NPVU5UU19GQUNFQk9PS19JRCAmJiBwcm9jZXNzLmVudi5BQ0NPVU5UU19GQUNFQk9PS19TRUMpIHtcbiAgX2FwcC5zYy5mYWNlYm9vayA9IHRydWU7XG4gIFNlcnZpY2VDb25maWd1cmF0aW9uLmNvbmZpZ3VyYXRpb25zLnVwc2VydCh7XG4gICAgc2VydmljZTogJ2ZhY2Vib29rJ1xuICB9LCB7XG4gICAgJHNldDoge1xuICAgICAgc2VjcmV0OiBwcm9jZXNzLmVudi5BQ0NPVU5UU19GQUNFQk9PS19TRUMsXG4gICAgICBhcHBJZDogcHJvY2Vzcy5lbnYuQUNDT1VOVFNfRkFDRUJPT0tfSUQsXG4gICAgICBsb2dpblN0eWxlOiAncmVkaXJlY3QnXG4gICAgfVxuICB9KTtcbn1cbiIsIi8vIGltcG9ydCB7IFdlYkFwcCB9IGZyb20gJ21ldGVvci93ZWJhcHAnO1xuLy8gaW1wb3J0IFNwaWRlcmFibGUgZnJvbSAnbWV0ZW9yL29zdHJpbzpzcGlkZXJhYmxlLW1pZGRsZXdhcmUnO1xuLy9cbi8vIFdlYkFwcC5jb25uZWN0SGFuZGxlcnMudXNlKG5ldyBTcGlkZXJhYmxlKHtcbi8vICAgcm9vdFVSTDogJ2h0dHBzOi8vZmlsZXMudmVsaW92LmNvbScsXG4vLyAgIHNlcnZpY2VVUkw6ICdodHRwczovL3JlbmRlci5vc3RyLmlvJyxcbi8vICAgYXV0aDogJ3h4eDp5eXknXG4vLyB9KSk7XG4iLCJpbXBvcnQgJy9pbXBvcnRzL3NlcnZlci9maWxlcy5jb2xsZWN0aW9uLmpzJztcbmltcG9ydCAnL2ltcG9ydHMvc2VydmVyL2ltYWdlLXByb2Nlc3NpbmcuanMnO1xuaW1wb3J0ICcvaW1wb3J0cy9zZXJ2ZXIvbWV0aG9kcy5qcyc7XG5pbXBvcnQgJy9pbXBvcnRzL3NlcnZlci9wdWJsaWNhdGlvbnMuanMnO1xuaW1wb3J0ICcvaW1wb3J0cy9zZXJ2ZXIvc2VydmljZS1jb25maWd1cmF0aW9ucy5qcyc7XG5pbXBvcnQgJy9pbXBvcnRzL3NlcnZlci9zcGlkZXJhYmxlLmpzJztcbiJdfQ==
