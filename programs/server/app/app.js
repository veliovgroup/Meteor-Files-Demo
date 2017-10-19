var require = meteorInstall({"imports":{"lib":{"core.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// imports/lib/core.js                                                                                               //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({                                                                                                      // 1
  _app: function () {                                                                                                // 1
    return _app;                                                                                                     // 1
  },                                                                                                                 // 1
  Collections: function () {                                                                                         // 1
    return Collections;                                                                                              // 1
  }                                                                                                                  // 1
});                                                                                                                  // 1
var Collections = {};                                                                                                // 1
var _app = {                                                                                                         // 2
  NOOP: function () {}                                                                                               // 2
};                                                                                                                   // 2
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"files.collection.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// imports/server/files.collection.js                                                                                //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
var _ = void 0;                                                                                                      // 1
                                                                                                                     //
module.watch(require("meteor/underscore"), {                                                                         // 1
  _: function (v) {                                                                                                  // 1
    _ = v;                                                                                                           // 1
  }                                                                                                                  // 1
}, 0);                                                                                                               // 1
var Meteor = void 0;                                                                                                 // 1
module.watch(require("meteor/meteor"), {                                                                             // 1
  Meteor: function (v) {                                                                                             // 1
    Meteor = v;                                                                                                      // 1
  }                                                                                                                  // 1
}, 1);                                                                                                               // 1
var Random = void 0;                                                                                                 // 1
module.watch(require("meteor/random"), {                                                                             // 1
  Random: function (v) {                                                                                             // 1
    Random = v;                                                                                                      // 1
  }                                                                                                                  // 1
}, 2);                                                                                                               // 1
var filesize = void 0;                                                                                               // 1
module.watch(require("meteor/mrt:filesize"), {                                                                       // 1
  filesize: function (v) {                                                                                           // 1
    filesize = v;                                                                                                    // 1
  }                                                                                                                  // 1
}, 3);                                                                                                               // 1
var FilesCollection = void 0;                                                                                        // 1
module.watch(require("meteor/ostrio:files"), {                                                                       // 1
  FilesCollection: function (v) {                                                                                    // 1
    FilesCollection = v;                                                                                             // 1
  }                                                                                                                  // 1
}, 4);                                                                                                               // 1
                                                                                                                     //
var _app = void 0,                                                                                                   // 1
    Collections = void 0;                                                                                            // 1
                                                                                                                     //
module.watch(require("/imports/lib/core.js"), {                                                                      // 1
  _app: function (v) {                                                                                               // 1
    _app = v;                                                                                                        // 1
  },                                                                                                                 // 1
  Collections: function (v) {                                                                                        // 1
    Collections = v;                                                                                                 // 1
  }                                                                                                                  // 1
}, 5);                                                                                                               // 1
// DropBox usage:                                                                                                    // 8
// Read: https://github.com/VeliovGroup/Meteor-Files/wiki/DropBox-Integration                                        // 9
// env.var example: DROPBOX='{"dropbox":{"key": "xxx", "secret": "xxx", "token": "xxx"}}'                            // 10
var useDropBox = false; // AWS:S3 usage:                                                                             // 11
// Read: https://github.com/VeliovGroup/Meteor-Files/wiki/AWS-S3-Integration                                         // 14
// env.var example: S3='{"s3":{"key": "xxx", "secret": "xxx", "bucket": "xxx", "region": "xxx""}}'                   // 15
                                                                                                                     //
var useS3 = false;                                                                                                   // 16
var client = void 0;                                                                                                 // 17
var sendToStorage = void 0;                                                                                          // 18
                                                                                                                     //
var fs = require('fs-extra');                                                                                        // 20
                                                                                                                     //
var S3 = require('aws-sdk/clients/s3');                                                                              // 21
                                                                                                                     //
var stream = require('stream');                                                                                      // 22
                                                                                                                     //
var request = require('request');                                                                                    // 23
                                                                                                                     //
var Dropbox = require('dropbox');                                                                                    // 24
                                                                                                                     //
var bound = Meteor.bindEnvironment(function (callback) {                                                             // 25
  return callback();                                                                                                 // 26
});                                                                                                                  // 27
                                                                                                                     //
if (process.env.DROPBOX) {                                                                                           // 29
  Meteor.settings.dropbox = JSON.parse(process.env.DROPBOX).dropbox;                                                 // 30
} else if (process.env.S3) {                                                                                         // 31
  Meteor.settings.s3 = JSON.parse(process.env.S3).s3;                                                                // 32
}                                                                                                                    // 33
                                                                                                                     //
var s3Conf = Meteor.settings.s3 || {};                                                                               // 35
var dbConf = Meteor.settings.dropbox || {};                                                                          // 36
                                                                                                                     //
if (dbConf && dbConf.key && dbConf.secret && dbConf.token) {                                                         // 38
  useDropBox = true;                                                                                                 // 39
  client = new Dropbox.Client({                                                                                      // 40
    key: dbConf.key,                                                                                                 // 41
    secret: dbConf.secret,                                                                                           // 42
    token: dbConf.token                                                                                              // 43
  });                                                                                                                // 40
} else if (s3Conf && s3Conf.key && s3Conf.secret && s3Conf.bucket && s3Conf.region) {                                // 45
  useS3 = true;                                                                                                      // 46
  client = new S3({                                                                                                  // 47
    secretAccessKey: s3Conf.secret,                                                                                  // 48
    accessKeyId: s3Conf.key,                                                                                         // 49
    region: s3Conf.region,                                                                                           // 50
    sslEnabled: false,                                                                                               // 51
    httpOptions: {                                                                                                   // 52
      timeout: 6000,                                                                                                 // 53
      agent: false                                                                                                   // 54
    }                                                                                                                // 52
  });                                                                                                                // 47
}                                                                                                                    // 57
                                                                                                                     //
Collections.files = new FilesCollection({                                                                            // 59
  // debug: true,                                                                                                    // 60
  storagePath: 'assets/app/uploads/uploadedFiles',                                                                   // 61
  collectionName: 'uploadedFiles',                                                                                   // 62
  allowClientCode: true,                                                                                             // 63
  // disableUpload: true,                                                                                            // 64
  // disableDownload: true,                                                                                          // 65
  "protected": function (fileObj) {                                                                                  // 59
    if (fileObj) {                                                                                                   // 67
      if (!(fileObj.meta && fileObj.meta.secured)) {                                                                 // 68
        return true;                                                                                                 // 69
      } else if (fileObj.meta && fileObj.meta.secured === true && this.userId === fileObj.userId) {                  // 70
        return true;                                                                                                 // 71
      }                                                                                                              // 72
    }                                                                                                                // 73
                                                                                                                     //
    return false;                                                                                                    // 74
  },                                                                                                                 // 75
  onBeforeRemove: function (cursor) {                                                                                // 76
    var _this = this;                                                                                                // 76
                                                                                                                     //
    var res = cursor.map(function (file) {                                                                           // 77
      if (file && file.userId && _.isString(file.userId)) {                                                          // 78
        return file.userId === _this.userId;                                                                         // 79
      }                                                                                                              // 80
                                                                                                                     //
      return false;                                                                                                  // 81
    });                                                                                                              // 82
    return !~res.indexOf(false);                                                                                     // 83
  },                                                                                                                 // 84
  onBeforeUpload: function () {                                                                                      // 85
    if (this.file.size <= 1024 * 1024 * 128) {                                                                       // 86
      return true;                                                                                                   // 87
    }                                                                                                                // 88
                                                                                                                     //
    return "Max. file size is 128MB you've tried to upload " + filesize(this.file.size);                             // 89
  },                                                                                                                 // 90
  downloadCallback: function (fileObj) {                                                                             // 91
    if (this.params && this.params.query && this.params.query.download === 'true') {                                 // 92
      Collections.files.collection.update(fileObj._id, {                                                             // 93
        $inc: {                                                                                                      // 94
          'meta.downloads': 1                                                                                        // 95
        }                                                                                                            // 94
      }, _app.NOOP);                                                                                                 // 93
    }                                                                                                                // 98
                                                                                                                     //
    return true;                                                                                                     // 99
  },                                                                                                                 // 100
  interceptDownload: function (http, fileRef, version) {                                                             // 101
    var path = void 0;                                                                                               // 102
                                                                                                                     //
    if (useDropBox) {                                                                                                // 103
      path = fileRef && fileRef.versions && fileRef.versions[version] && fileRef.versions[version].meta && fileRef.versions[version].meta.pipeFrom ? fileRef.versions[version].meta.pipeFrom : void 0;
                                                                                                                     //
      if (path) {                                                                                                    // 105
        // If file is successfully moved to Storage                                                                  // 106
        // We will pipe request to Storage                                                                           // 107
        // So, original link will stay always secure                                                                 // 108
        // To force ?play and ?download parameters                                                                   // 110
        // and to keep original file name, content-type,                                                             // 111
        // content-disposition and cache-control                                                                     // 112
        // we're using low-level .serve() method                                                                     // 113
        this.serve(http, fileRef, fileRef.versions[version], version, request({                                      // 114
          url: path,                                                                                                 // 115
          headers: _.pick(http.request.headers, 'range', 'cache-control', 'connection')                              // 116
        }));                                                                                                         // 114
        return true;                                                                                                 // 118
      } // While file is not yet uploaded to Storage                                                                 // 119
      // We will serve file from FS                                                                                  // 121
                                                                                                                     //
                                                                                                                     //
      return false;                                                                                                  // 122
    } else if (useS3) {                                                                                              // 123
      path = fileRef && fileRef.versions && fileRef.versions[version] && fileRef.versions[version].meta && fileRef.versions[version].meta.pipePath ? fileRef.versions[version].meta.pipePath : void 0;
                                                                                                                     //
      if (path) {                                                                                                    // 125
        // If file is successfully moved to Storage                                                                  // 126
        // We will pipe request to Storage                                                                           // 127
        // So, original link will stay always secure                                                                 // 128
        // To force ?play and ?download parameters                                                                   // 130
        // and to keep original file name, content-type,                                                             // 131
        // content-disposition and cache-control                                                                     // 132
        // we're using low-level .serve() method                                                                     // 133
        var opts = {                                                                                                 // 134
          Bucket: s3Conf.bucket,                                                                                     // 135
          Key: path                                                                                                  // 136
        };                                                                                                           // 134
                                                                                                                     //
        if (http.request.headers.range) {                                                                            // 139
          var vRef = fileRef.versions[version];                                                                      // 140
                                                                                                                     //
          var range = _.clone(http.request.headers.range);                                                           // 141
                                                                                                                     //
          var array = range.split(/bytes=([0-9]*)-([0-9]*)/);                                                        // 142
          var start = parseInt(array[1]);                                                                            // 143
          var end = parseInt(array[2]);                                                                              // 144
                                                                                                                     //
          if (isNaN(end)) {                                                                                          // 145
            // Request data from AWS:S3 by small chunks                                                              // 146
            end = start + this.chunkSize - 1;                                                                        // 147
                                                                                                                     //
            if (end >= vRef.size) {                                                                                  // 148
              end = vRef.size - 1;                                                                                   // 149
            }                                                                                                        // 150
          }                                                                                                          // 151
                                                                                                                     //
          opts.Range = "bytes=" + start + "-" + end;                                                                 // 152
          http.request.headers.range = "bytes=" + start + "-" + end;                                                 // 153
        }                                                                                                            // 154
                                                                                                                     //
        var fileColl = this;                                                                                         // 156
        client.getObject(opts, function (error) {                                                                    // 157
          if (error) {                                                                                               // 158
            console.error(error);                                                                                    // 159
                                                                                                                     //
            if (!http.response.finished) {                                                                           // 160
              http.response.end();                                                                                   // 161
            }                                                                                                        // 162
          } else {                                                                                                   // 163
            if (http.request.headers.range && this.httpResponse.headers['content-range']) {                          // 164
              // Set proper range header in according to what is returned from AWS:S3                                // 165
              http.request.headers.range = this.httpResponse.headers['content-range'].split('/')[0].replace('bytes ', 'bytes=');
            }                                                                                                        // 167
                                                                                                                     //
            var dataStream = new stream.PassThrough();                                                               // 169
            fileColl.serve(http, fileRef, fileRef.versions[version], version, dataStream);                           // 170
            dataStream.end(this.data.Body);                                                                          // 171
          }                                                                                                          // 172
        });                                                                                                          // 173
        return true;                                                                                                 // 175
      } // While file is not yet uploaded to Storage                                                                 // 176
      // We will serve file from FS                                                                                  // 178
                                                                                                                     //
                                                                                                                     //
      return false;                                                                                                  // 179
    }                                                                                                                // 180
                                                                                                                     //
    return false;                                                                                                    // 181
  }                                                                                                                  // 182
});                                                                                                                  // 59
Collections.files.denyClient();                                                                                      // 185
Collections.files.on('afterUpload', function (_fileRef) {                                                            // 186
  var _this2 = this;                                                                                                 // 186
                                                                                                                     //
  if (useDropBox) {                                                                                                  // 187
    var makeUrl = function (stat, fileRef, version) {                                                                // 188
      var triesUrl = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;                          // 188
      client.makeUrl(stat.path, {                                                                                    // 189
        long: true,                                                                                                  // 190
        downloadHack: true                                                                                           // 191
      }, function (error, xml) {                                                                                     // 189
        bound(function () {                                                                                          // 193
          // Store downloadable link in file's meta object                                                           // 194
          if (error) {                                                                                               // 195
            if (triesUrl < 10) {                                                                                     // 196
              Meteor.setTimeout(function () {                                                                        // 197
                makeUrl(stat, fileRef, version, ++triesUrl);                                                         // 198
              }, 2048);                                                                                              // 199
            } else {                                                                                                 // 200
              console.error(error, {                                                                                 // 201
                triesUrl: triesUrl                                                                                   // 202
              });                                                                                                    // 201
            }                                                                                                        // 204
          } else if (xml) {                                                                                          // 205
            var upd = {                                                                                              // 206
              $set: {}                                                                                               // 206
            };                                                                                                       // 206
            upd['$set']['versions.' + version + '.meta.pipeFrom'] = xml.url;                                         // 207
            upd['$set']['versions.' + version + '.meta.pipePath'] = stat.path;                                       // 208
                                                                                                                     //
            _this2.collection.update({                                                                               // 209
              _id: fileRef._id                                                                                       // 210
            }, upd, function (updError) {                                                                            // 209
              if (updError) {                                                                                        // 212
                console.error(updError);                                                                             // 213
              } else {                                                                                               // 214
                // Unlink original files from FS                                                                     // 215
                // after successful upload to DropBox                                                                // 216
                _this2.unlink(_this2.collection.findOne(fileRef._id), version);                                      // 217
              }                                                                                                      // 218
            });                                                                                                      // 219
          } else {                                                                                                   // 220
            if (triesUrl < 10) {                                                                                     // 221
              Meteor.setTimeout(function () {                                                                        // 222
                // Generate downloadable link                                                                        // 223
                makeUrl(stat, fileRef, version, ++triesUrl);                                                         // 224
              }, 2048);                                                                                              // 225
            } else {                                                                                                 // 226
              console.error("client.makeUrl doesn't returns xml", {                                                  // 227
                triesUrl: triesUrl                                                                                   // 228
              });                                                                                                    // 227
            }                                                                                                        // 230
          }                                                                                                          // 231
        });                                                                                                          // 232
      });                                                                                                            // 233
    };                                                                                                               // 234
                                                                                                                     //
    var writeToDB = function (fileRef, version, data) {                                                              // 236
      var triesSend = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;                         // 236
      // DropBox already uses random URLs                                                                            // 237
      // No need to use random file names                                                                            // 238
      client.writeFile(fileRef._id + '-' + version + '.' + fileRef.extension, data, function (error, stat) {         // 239
        bound(function () {                                                                                          // 240
          if (error) {                                                                                               // 241
            if (triesSend < 10) {                                                                                    // 242
              Meteor.setTimeout(function () {                                                                        // 243
                // Write file to DropBox                                                                             // 244
                writeToDB(fileRef, version, data, ++triesSend);                                                      // 245
              }, 2048);                                                                                              // 246
            } else {                                                                                                 // 247
              console.error(error, {                                                                                 // 248
                triesSend: triesSend                                                                                 // 249
              });                                                                                                    // 248
            }                                                                                                        // 251
          } else {                                                                                                   // 252
            makeUrl(stat, fileRef, version);                                                                         // 253
          }                                                                                                          // 254
        });                                                                                                          // 255
      });                                                                                                            // 256
    };                                                                                                               // 257
                                                                                                                     //
    var readFile = function (fileRef, vRef, version) {                                                               // 259
      var triesRead = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;                         // 259
      fs.readFile(vRef.path, function (error, data) {                                                                // 260
        bound(function () {                                                                                          // 261
          if (error) {                                                                                               // 262
            if (triesRead < 10) {                                                                                    // 263
              readFile(fileRef, vRef, version, ++triesRead);                                                         // 264
            } else {                                                                                                 // 265
              console.error(error);                                                                                  // 266
            }                                                                                                        // 267
          } else {                                                                                                   // 268
            writeToDB(fileRef, version, data);                                                                       // 269
          }                                                                                                          // 270
        });                                                                                                          // 271
      });                                                                                                            // 272
    };                                                                                                               // 273
                                                                                                                     //
    sendToStorage = function (fileRef) {                                                                             // 275
      _.each(fileRef.versions, function (vRef, version) {                                                            // 276
        readFile(fileRef, vRef, version);                                                                            // 277
      });                                                                                                            // 278
    };                                                                                                               // 279
  } else if (useS3) {                                                                                                // 280
    sendToStorage = function (fileRef) {                                                                             // 281
      _.each(fileRef.versions, function (vRef, version) {                                                            // 282
        // We use Random.id() instead of real file's _id                                                             // 283
        // to secure files from reverse engineering                                                                  // 284
        // As after viewing this code it will be easy                                                                // 285
        // to get access to unlisted and protected files                                                             // 286
        var filePath = 'files/' + Random.id() + '-' + version + '.' + fileRef.extension;                             // 287
        client.putObject({                                                                                           // 289
          StorageClass: 'STANDARD',                                                                                  // 290
          Bucket: s3Conf.bucket,                                                                                     // 291
          Key: filePath,                                                                                             // 292
          Body: fs.createReadStream(vRef.path),                                                                      // 293
          ContentType: vRef.type                                                                                     // 294
        }, function (error) {                                                                                        // 289
          bound(function () {                                                                                        // 296
            if (error) {                                                                                             // 297
              console.error(error);                                                                                  // 298
            } else {                                                                                                 // 299
              var upd = {                                                                                            // 300
                $set: {}                                                                                             // 300
              };                                                                                                     // 300
              upd['$set']['versions.' + version + '.meta.pipePath'] = filePath;                                      // 301
                                                                                                                     //
              _this2.collection.update({                                                                             // 302
                _id: fileRef._id                                                                                     // 303
              }, upd, function (updError) {                                                                          // 302
                if (updError) {                                                                                      // 305
                  console.error(updError);                                                                           // 306
                } else {                                                                                             // 307
                  // Unlink original file from FS                                                                    // 308
                  // after successful upload to AWS:S3                                                               // 309
                  _this2.unlink(_this2.collection.findOne(fileRef._id), version);                                    // 310
                }                                                                                                    // 311
              });                                                                                                    // 312
            }                                                                                                        // 313
          });                                                                                                        // 314
        });                                                                                                          // 315
      });                                                                                                            // 316
    };                                                                                                               // 317
  }                                                                                                                  // 318
                                                                                                                     //
  if (/png|jpe?g/i.test(_fileRef.extension || '')) {                                                                 // 320
    Meteor.setTimeout(function () {                                                                                  // 321
      _app.createThumbnails(_this2, _fileRef, function (error) {                                                     // 322
        if (error) {                                                                                                 // 323
          console.error(error);                                                                                      // 324
        }                                                                                                            // 325
                                                                                                                     //
        if (useDropBox || useS3) {                                                                                   // 327
          sendToStorage(_this2.collection.findOne(_fileRef._id));                                                    // 328
        }                                                                                                            // 329
      });                                                                                                            // 330
    }, 1024);                                                                                                        // 331
  } else {                                                                                                           // 332
    if (useDropBox || useS3) {                                                                                       // 333
      sendToStorage(_fileRef);                                                                                       // 334
    }                                                                                                                // 335
  }                                                                                                                  // 336
}); // This line now commented due to Heroku usage                                                                   // 337
// Collections.files.collection._ensureIndex {'meta.expireAt': 1}, {expireAfterSeconds: 0, background: true}         // 340
// Intercept FileCollection's remove method                                                                          // 342
// to remove file from DropBox or AWS S3                                                                             // 343
                                                                                                                     //
if (useDropBox || useS3) {                                                                                           // 344
  var _origRemove = Collections.files.remove;                                                                        // 345
                                                                                                                     //
  Collections.files.remove = function (search) {                                                                     // 346
    var cursor = this.collection.find(search);                                                                       // 347
    cursor.forEach(function (fileRef) {                                                                              // 348
      _.each(fileRef.versions, function (vRef) {                                                                     // 349
        if (vRef && vRef.meta && vRef.meta.pipePath != null) {                                                       // 350
          if (useDropBox) {                                                                                          // 351
            // DropBox usage:                                                                                        // 352
            client.remove(vRef.meta.pipePath, function (error) {                                                     // 353
              bound(function () {                                                                                    // 354
                if (error) {                                                                                         // 355
                  console.error(error);                                                                              // 356
                }                                                                                                    // 357
              });                                                                                                    // 358
            });                                                                                                      // 359
          } else {                                                                                                   // 360
            // AWS:S3 usage:                                                                                         // 361
            client.deleteObject({                                                                                    // 362
              Bucket: s3Conf.bucket,                                                                                 // 363
              Key: vRef.meta.pipePath                                                                                // 364
            }, function (error) {                                                                                    // 362
              bound(function () {                                                                                    // 366
                if (error) {                                                                                         // 367
                  console.error(error);                                                                              // 368
                }                                                                                                    // 369
              });                                                                                                    // 370
            });                                                                                                      // 371
          }                                                                                                          // 372
        }                                                                                                            // 373
      });                                                                                                            // 374
    }); // Call original method                                                                                      // 375
                                                                                                                     //
    _origRemove.call(this, search);                                                                                  // 377
  };                                                                                                                 // 378
} // Remove all files on server load/reload, useful while testing/development                                        // 379
// Meteor.startup -> Collections.files.remove {}                                                                     // 382
// Remove files along with MongoDB records two minutes before expiration date                                        // 384
// If we have 'expireAfterSeconds' index on 'meta.expireAt' field,                                                   // 385
// it won't remove files themselves.                                                                                 // 386
                                                                                                                     //
                                                                                                                     //
Meteor.setInterval(function () {                                                                                     // 387
  Collections.files.remove({                                                                                         // 388
    'meta.expireAt': {                                                                                               // 389
      $lte: new Date(+new Date() + 120000)                                                                           // 390
    }                                                                                                                // 389
  }, _app.NOOP);                                                                                                     // 388
}, 120000);                                                                                                          // 393
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"image-processing.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// imports/server/image-processing.js                                                                                //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
var _ = void 0;                                                                                                      // 1
                                                                                                                     //
module.watch(require("meteor/underscore"), {                                                                         // 1
  _: function (v) {                                                                                                  // 1
    _ = v;                                                                                                           // 1
  }                                                                                                                  // 1
}, 0);                                                                                                               // 1
                                                                                                                     //
var _app = void 0;                                                                                                   // 1
                                                                                                                     //
module.watch(require("/imports/lib/core.js"), {                                                                      // 1
  _app: function (v) {                                                                                               // 1
    _app = v;                                                                                                        // 1
  }                                                                                                                  // 1
}, 1);                                                                                                               // 1
var check = void 0;                                                                                                  // 1
module.watch(require("meteor/check"), {                                                                              // 1
  check: function (v) {                                                                                              // 1
    check = v;                                                                                                       // 1
  }                                                                                                                  // 1
}, 2);                                                                                                               // 1
var Meteor = void 0;                                                                                                 // 1
module.watch(require("meteor/meteor"), {                                                                             // 1
  Meteor: function (v) {                                                                                             // 1
    Meteor = v;                                                                                                      // 1
  }                                                                                                                  // 1
}, 3);                                                                                                               // 1
var fs = void 0;                                                                                                     // 1
module.watch(require("fs-extra"), {                                                                                  // 1
  "default": function (v) {                                                                                          // 1
    fs = v;                                                                                                          // 1
  }                                                                                                                  // 1
}, 4);                                                                                                               // 1
var gm = void 0;                                                                                                     // 1
module.watch(require("gm"), {                                                                                        // 1
  "default": function (v) {                                                                                          // 1
    gm = v;                                                                                                          // 1
  }                                                                                                                  // 1
}, 5);                                                                                                               // 1
//Some platforms may bundle ImageMagick into their tools (like Heroku). In this case you may use GraphicsMagick as Imagemagick in this way:
//npm install gm --save and then where you use it:                                                                   // 9
//const gm = require('gm');                                                                                          // 10
//const im = gm.subClass({ imageMagick: true });                                                                     // 11
//Please note that GM was considered slightly faster than IM so before you chose convenience over performance read the latest news about it.
//https://mazira.com/blog/comparing-speed-imagemagick-graphicsmagick                                                 // 13
var bound = Meteor.bindEnvironment(function (callback) {                                                             // 15
  return callback();                                                                                                 // 16
});                                                                                                                  // 17
                                                                                                                     //
_app.createThumbnails = function (collection, fileRef, cb) {                                                         // 19
  check(fileRef, Object);                                                                                            // 20
  var isLast = false;                                                                                                // 22
                                                                                                                     //
  var finish = function (error) {                                                                                    // 23
    bound(function () {                                                                                              // 24
      if (error) {                                                                                                   // 25
        console.error('[_app.createThumbnails] [finish]', error);                                                    // 26
        cb && cb(error);                                                                                             // 27
      } else {                                                                                                       // 28
        if (isLast) {                                                                                                // 29
          cb && cb(void 0, fileRef);                                                                                 // 30
        }                                                                                                            // 31
      }                                                                                                              // 32
                                                                                                                     //
      return true;                                                                                                   // 33
    });                                                                                                              // 34
  };                                                                                                                 // 35
                                                                                                                     //
  fs.exists(fileRef.path, function (exists) {                                                                        // 37
    bound(function () {                                                                                              // 38
      if (!exists) {                                                                                                 // 39
        throw new Meteor.Error('File ' + fileRef.path + ' not found in [createThumbnails] Method');                  // 40
      }                                                                                                              // 41
                                                                                                                     //
      var image = gm(fileRef.path);                                                                                  // 42
      var sizes = {                                                                                                  // 43
        preview: {                                                                                                   // 44
          width: 400                                                                                                 // 45
        },                                                                                                           // 44
        thumbnail40: {                                                                                               // 47
          width: 40,                                                                                                 // 48
          square: true                                                                                               // 49
        }                                                                                                            // 47
      };                                                                                                             // 43
      image.size(function (error, features) {                                                                        // 53
        bound(function () {                                                                                          // 54
          if (error) {                                                                                               // 55
            console.error('[_app.createThumbnails] [_.each sizes]', error);                                          // 56
            finish(new Meteor.Error('[_app.createThumbnails] [_.each sizes]', error));                               // 57
            return;                                                                                                  // 58
          }                                                                                                          // 59
                                                                                                                     //
          var i = 0;                                                                                                 // 61
          collection.collection.update(fileRef._id, {                                                                // 62
            $set: {                                                                                                  // 63
              'meta.width': features.width,                                                                          // 64
              'meta.height': features.height,                                                                        // 65
              'versions.original.meta.width': features.width,                                                        // 66
              'versions.original.meta.height': features.height                                                       // 67
            }                                                                                                        // 63
          }, _app.NOOP);                                                                                             // 62
                                                                                                                     //
          _.each(sizes, function (size, name) {                                                                      // 71
            var path = collection.storagePath(fileRef) + '/' + name + '-' + fileRef._id + '.' + fileRef.extension;   // 72
                                                                                                                     //
            var copyPaste = function () {                                                                            // 73
              fs.copy(fileRef.path, path, function (fsCopyError) {                                                   // 74
                bound(function () {                                                                                  // 75
                  if (fsCopyError) {                                                                                 // 76
                    console.error('[_app.createThumbnails] [_.each sizes] [fs.copy]', fsCopyError);                  // 77
                    finish(fsCopyError);                                                                             // 78
                    return;                                                                                          // 79
                  }                                                                                                  // 80
                                                                                                                     //
                  var upd = {                                                                                        // 82
                    $set: {}                                                                                         // 82
                  };                                                                                                 // 82
                  upd['$set']['versions.' + name] = {                                                                // 83
                    path: path,                                                                                      // 84
                    size: fileRef.size,                                                                              // 85
                    type: fileRef.type,                                                                              // 86
                    extension: fileRef.extension,                                                                    // 87
                    meta: {                                                                                          // 88
                      width: features.width,                                                                         // 89
                      height: features.height                                                                        // 90
                    }                                                                                                // 88
                  };                                                                                                 // 83
                  collection.collection.update(fileRef._id, upd, function (colUpdError) {                            // 94
                    ++i;                                                                                             // 95
                                                                                                                     //
                    if (i === Object.keys(sizes).length) {                                                           // 96
                      isLast = true;                                                                                 // 97
                    }                                                                                                // 98
                                                                                                                     //
                    finish(colUpdError);                                                                             // 99
                  });                                                                                                // 100
                });                                                                                                  // 101
              });                                                                                                    // 102
            };                                                                                                       // 103
                                                                                                                     //
            if (/png|jpe?g/i.test(fileRef.extension)) {                                                              // 105
              var img = gm(fileRef.path).quality(70).define('filter:support=2').define('jpeg:fancy-upsampling=false').define('jpeg:fancy-upsampling=off').define('png:compression-filter=5').define('png:compression-level=9').define('png:compression-strategy=1').define('png:exclude-chunk=all').autoOrient().noProfile().strip().dither(false).interlace('Line').filter('Triangle');
                                                                                                                     //
              var updateAndSave = function (upNSaveError) {                                                          // 122
                bound(function () {                                                                                  // 123
                  if (upNSaveError) {                                                                                // 124
                    console.error('[_app.createThumbnails] [_.each sizes] [img.resize]', upNSaveError);              // 125
                    finish(upNSaveError);                                                                            // 126
                    return;                                                                                          // 127
                  }                                                                                                  // 128
                                                                                                                     //
                  fs.stat(path, function (fsStatError, stat) {                                                       // 129
                    bound(function () {                                                                              // 130
                      if (fsStatError) {                                                                             // 131
                        console.error('[_app.createThumbnails] [_.each sizes] [img.resize] [fs.stat]', fsStatError);
                        finish(fsStatError);                                                                         // 133
                        return;                                                                                      // 134
                      }                                                                                              // 135
                                                                                                                     //
                      gm(path).size(function (gmSizeError, imgInfo) {                                                // 137
                        bound(function () {                                                                          // 138
                          if (gmSizeError) {                                                                         // 139
                            console.error('[_app.createThumbnails] [_.each sizes] [img.resize] [fs.stat] [gm(path).size]', gmSizeError);
                            finish(gmSizeError);                                                                     // 141
                            return;                                                                                  // 142
                          }                                                                                          // 143
                                                                                                                     //
                          var upd = {                                                                                // 144
                            $set: {}                                                                                 // 144
                          };                                                                                         // 144
                          upd['$set']['versions.' + name] = {                                                        // 145
                            path: path,                                                                              // 146
                            size: stat.size,                                                                         // 147
                            type: fileRef.type,                                                                      // 148
                            extension: fileRef.extension,                                                            // 149
                            name: fileRef.name,                                                                      // 150
                            meta: {                                                                                  // 151
                              width: imgInfo.width,                                                                  // 152
                              height: imgInfo.height                                                                 // 153
                            }                                                                                        // 151
                          };                                                                                         // 145
                          collection.collection.update(fileRef._id, upd, function (colUpdError) {                    // 157
                            ++i;                                                                                     // 158
                                                                                                                     //
                            if (i === Object.keys(sizes).length) {                                                   // 159
                              isLast = true;                                                                         // 160
                            }                                                                                        // 161
                                                                                                                     //
                            finish(colUpdError);                                                                     // 162
                          });                                                                                        // 163
                        });                                                                                          // 164
                      });                                                                                            // 165
                    });                                                                                              // 166
                  });                                                                                                // 167
                });                                                                                                  // 168
              };                                                                                                     // 169
                                                                                                                     //
              if (!size.square) {                                                                                    // 171
                if (features.width > size.width) {                                                                   // 172
                  img.resize(size.width).interlace('Line').write(path, updateAndSave);                               // 173
                } else {                                                                                             // 174
                  copyPaste();                                                                                       // 175
                }                                                                                                    // 176
              } else {                                                                                               // 177
                var x = 0;                                                                                           // 178
                var y = 0;                                                                                           // 179
                var widthRatio = features.width / size.width;                                                        // 180
                var heightRatio = features.height / size.width;                                                      // 181
                var widthNew = size.width;                                                                           // 182
                var heightNew = size.width;                                                                          // 183
                                                                                                                     //
                if (heightRatio < widthRatio) {                                                                      // 185
                  widthNew = size.width * features.width / features.height;                                          // 186
                  x = (widthNew - size.width) / 2;                                                                   // 187
                }                                                                                                    // 188
                                                                                                                     //
                if (heightRatio > widthRatio) {                                                                      // 190
                  heightNew = size.width * features.height / features.width;                                         // 191
                  y = (heightNew - size.width) / 2;                                                                  // 192
                }                                                                                                    // 193
                                                                                                                     //
                img.resize(widthNew, heightNew).crop(size.width, size.width, x, y).interlace('Line').write(path, updateAndSave);
              }                                                                                                      // 200
            } else {                                                                                                 // 201
              copyPaste();                                                                                           // 202
            }                                                                                                        // 203
          });                                                                                                        // 204
        });                                                                                                          // 205
      });                                                                                                            // 206
    });                                                                                                              // 207
  });                                                                                                                // 208
  return true;                                                                                                       // 209
};                                                                                                                   // 210
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"methods.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// imports/server/methods.js                                                                                         //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
var check = void 0;                                                                                                  // 1
module.watch(require("meteor/check"), {                                                                              // 1
  check: function (v) {                                                                                              // 1
    check = v;                                                                                                       // 1
  }                                                                                                                  // 1
}, 0);                                                                                                               // 1
var Meteor = void 0;                                                                                                 // 1
module.watch(require("meteor/meteor"), {                                                                             // 1
  Meteor: function (v) {                                                                                             // 1
    Meteor = v;                                                                                                      // 1
  }                                                                                                                  // 1
}, 1);                                                                                                               // 1
                                                                                                                     //
var _app = void 0,                                                                                                   // 1
    Collections = void 0;                                                                                            // 1
                                                                                                                     //
module.watch(require("/imports/lib/core.js"), {                                                                      // 1
  _app: function (v) {                                                                                               // 1
    _app = v;                                                                                                        // 1
  },                                                                                                                 // 1
  Collections: function (v) {                                                                                        // 1
    Collections = v;                                                                                                 // 1
  }                                                                                                                  // 1
}, 2);                                                                                                               // 1
Meteor.methods({                                                                                                     // 5
  filesLenght: function () {                                                                                         // 6
    var userOnly = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;                        // 6
    check(userOnly, Boolean);                                                                                        // 7
    var selector = void 0;                                                                                           // 9
                                                                                                                     //
    if (userOnly && this.userId) {                                                                                   // 10
      selector = {                                                                                                   // 11
        userId: this.userId                                                                                          // 12
      };                                                                                                             // 11
    } else if (this.userId) {                                                                                        // 14
      selector = {                                                                                                   // 15
        $or: [{                                                                                                      // 16
          'meta.unlisted': false,                                                                                    // 18
          'meta.secured': false,                                                                                     // 19
          'meta.blamed': {                                                                                           // 20
            $lt: 3                                                                                                   // 21
          }                                                                                                          // 20
        }, {                                                                                                         // 17
          userId: this.userId,                                                                                       // 24
          'meta.blamed': {                                                                                           // 25
            $lt: 3                                                                                                   // 26
          }                                                                                                          // 25
        }]                                                                                                           // 23
      };                                                                                                             // 15
    } else {                                                                                                         // 31
      selector = {                                                                                                   // 32
        'meta.unlisted': false,                                                                                      // 33
        'meta.secured': false,                                                                                       // 34
        'meta.blamed': {                                                                                             // 35
          $lt: 3                                                                                                     // 36
        }                                                                                                            // 35
      };                                                                                                             // 32
    }                                                                                                                // 39
                                                                                                                     //
    return Collections.files.find(selector).count();                                                                 // 40
  },                                                                                                                 // 41
  unblame: function (_id) {                                                                                          // 42
    check(_id, String);                                                                                              // 43
    Collections.files.update({                                                                                       // 44
      _id: _id                                                                                                       // 45
    }, {                                                                                                             // 44
      $inc: {                                                                                                        // 47
        'meta.blamed': -1                                                                                            // 48
      }                                                                                                              // 47
    }, _app.NOOP);                                                                                                   // 46
    return true;                                                                                                     // 51
  },                                                                                                                 // 52
  blame: function (_id) {                                                                                            // 53
    check(_id, String);                                                                                              // 54
    Collections.files.update({                                                                                       // 55
      _id: _id                                                                                                       // 56
    }, {                                                                                                             // 55
      $inc: {                                                                                                        // 58
        'meta.blamed': 1                                                                                             // 59
      }                                                                                                              // 58
    }, _app.NOOP);                                                                                                   // 57
    return true;                                                                                                     // 62
  },                                                                                                                 // 63
  changeAccess: function (_id) {                                                                                     // 64
    check(_id, String);                                                                                              // 65
                                                                                                                     //
    if (Meteor.userId()) {                                                                                           // 66
      var file = Collections.files.findOne({                                                                         // 67
        _id: _id,                                                                                                    // 68
        userId: Meteor.userId()                                                                                      // 69
      });                                                                                                            // 67
                                                                                                                     //
      if (file) {                                                                                                    // 72
        Collections.files.update(_id, {                                                                              // 73
          $set: {                                                                                                    // 74
            'meta.unlisted': file.meta.unlisted ? false : true                                                       // 75
          }                                                                                                          // 74
        }, _app.NOOP);                                                                                               // 73
        return true;                                                                                                 // 78
      }                                                                                                              // 79
    }                                                                                                                // 80
                                                                                                                     //
    throw new Meteor.Error(401, 'Access denied!');                                                                   // 81
  },                                                                                                                 // 82
  changePrivacy: function (_id) {                                                                                    // 83
    check(_id, String);                                                                                              // 84
                                                                                                                     //
    if (Meteor.userId()) {                                                                                           // 85
      var file = Collections.files.findOne({                                                                         // 86
        _id: _id,                                                                                                    // 87
        userId: Meteor.userId()                                                                                      // 88
      });                                                                                                            // 86
                                                                                                                     //
      if (file) {                                                                                                    // 91
        Collections.files.update(_id, {                                                                              // 92
          $set: {                                                                                                    // 93
            'meta.unlisted': true,                                                                                   // 94
            'meta.secured': file.meta.secured ? false : true                                                         // 95
          }                                                                                                          // 93
        }, _app.NOOP);                                                                                               // 92
        return true;                                                                                                 // 98
      }                                                                                                              // 99
    }                                                                                                                // 100
                                                                                                                     //
    throw new Meteor.Error(401, 'Access denied!');                                                                   // 101
  },                                                                                                                 // 102
  getServiceConfiguration: function () {                                                                             // 103
    return _app.sc;                                                                                                  // 104
  }                                                                                                                  // 105
});                                                                                                                  // 5
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// imports/server/publications.js                                                                                    //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
var check = void 0;                                                                                                  // 1
module.watch(require("meteor/check"), {                                                                              // 1
  check: function (v) {                                                                                              // 1
    check = v;                                                                                                       // 1
  }                                                                                                                  // 1
}, 0);                                                                                                               // 1
var Meteor = void 0;                                                                                                 // 1
module.watch(require("meteor/meteor"), {                                                                             // 1
  Meteor: function (v) {                                                                                             // 1
    Meteor = v;                                                                                                      // 1
  }                                                                                                                  // 1
}, 1);                                                                                                               // 1
var Collections = void 0;                                                                                            // 1
module.watch(require("/imports/lib/core.js"), {                                                                      // 1
  Collections: function (v) {                                                                                        // 1
    Collections = v;                                                                                                 // 1
  }                                                                                                                  // 1
}, 2);                                                                                                               // 1
Meteor.publish('latest', function () {                                                                               // 5
  var take = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;                                 // 5
  var userOnly = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;                          // 5
  check(take, Number);                                                                                               // 6
  check(userOnly, Boolean);                                                                                          // 7
  var selector = void 0;                                                                                             // 9
                                                                                                                     //
  if (userOnly && this.userId) {                                                                                     // 10
    selector = {                                                                                                     // 11
      userId: this.userId                                                                                            // 12
    };                                                                                                               // 11
  } else if (this.userId) {                                                                                          // 14
    selector = {                                                                                                     // 15
      $or: [{                                                                                                        // 16
        'meta.unlisted': false,                                                                                      // 18
        'meta.secured': false,                                                                                       // 19
        'meta.blamed': {                                                                                             // 20
          $lt: 3                                                                                                     // 21
        }                                                                                                            // 20
      }, {                                                                                                           // 17
        userId: this.userId,                                                                                         // 24
        'meta.blamed': {                                                                                             // 25
          $lt: 3                                                                                                     // 26
        }                                                                                                            // 25
      }]                                                                                                             // 23
    };                                                                                                               // 15
  } else {                                                                                                           // 31
    selector = {                                                                                                     // 32
      'meta.unlisted': false,                                                                                        // 33
      'meta.secured': false,                                                                                         // 34
      'meta.blamed': {                                                                                               // 35
        $lt: 3                                                                                                       // 36
      }                                                                                                              // 35
    };                                                                                                               // 32
  }                                                                                                                  // 39
                                                                                                                     //
  return Collections.files.find(selector, {                                                                          // 41
    limit: take,                                                                                                     // 42
    sort: {                                                                                                          // 43
      'meta.created_at': -1                                                                                          // 44
    },                                                                                                               // 43
    fields: {                                                                                                        // 46
      _id: 1,                                                                                                        // 47
      name: 1,                                                                                                       // 48
      size: 1,                                                                                                       // 49
      meta: 1,                                                                                                       // 50
      type: 1,                                                                                                       // 51
      isPDF: 1,                                                                                                      // 52
      isText: 1,                                                                                                     // 53
      isJSON: 1,                                                                                                     // 54
      isVideo: 1,                                                                                                    // 55
      isAudio: 1,                                                                                                    // 56
      isImage: 1,                                                                                                    // 57
      userId: 1,                                                                                                     // 58
      'versions.thumbnail40.extension': 1,                                                                           // 59
      'versions.preview.extension': 1,                                                                               // 60
      extension: 1,                                                                                                  // 61
      _collectionName: 1,                                                                                            // 62
      _downloadRoute: 1                                                                                              // 63
    }                                                                                                                // 46
  }).cursor;                                                                                                         // 41
});                                                                                                                  // 66
Meteor.publish('file', function (_id) {                                                                              // 68
  check(_id, String);                                                                                                // 69
  return Collections.files.find({                                                                                    // 70
    $or: [{                                                                                                          // 71
      _id: _id,                                                                                                      // 73
      'meta.secured': false                                                                                          // 74
    }, {                                                                                                             // 72
      _id: _id,                                                                                                      // 76
      'meta.secured': true,                                                                                          // 77
      userId: this.userId                                                                                            // 78
    }]                                                                                                               // 75
  }, {                                                                                                               // 70
    fields: {                                                                                                        // 82
      _id: 1,                                                                                                        // 83
      name: 1,                                                                                                       // 84
      size: 1,                                                                                                       // 85
      type: 1,                                                                                                       // 86
      meta: 1,                                                                                                       // 87
      isPDF: 1,                                                                                                      // 88
      isText: 1,                                                                                                     // 89
      isJSON: 1,                                                                                                     // 90
      isVideo: 1,                                                                                                    // 91
      isAudio: 1,                                                                                                    // 92
      isImage: 1,                                                                                                    // 93
      extension: 1,                                                                                                  // 94
      'versions.preview.extension': 1,                                                                               // 95
      _collectionName: 1,                                                                                            // 96
      _downloadRoute: 1                                                                                              // 97
    }                                                                                                                // 82
  }).cursor;                                                                                                         // 81
});                                                                                                                  // 100
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"service-configurations.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// imports/server/service-configurations.js                                                                          //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
var _app = void 0;                                                                                                   // 1
                                                                                                                     //
module.watch(require("/imports/lib/core.js"), {                                                                      // 1
  _app: function (v) {                                                                                               // 1
    _app = v;                                                                                                        // 1
  }                                                                                                                  // 1
}, 0);                                                                                                               // 1
var ServiceConfiguration = void 0;                                                                                   // 1
module.watch(require("meteor/service-configuration"), {                                                              // 1
  ServiceConfiguration: function (v) {                                                                               // 1
    ServiceConfiguration = v;                                                                                        // 1
  }                                                                                                                  // 1
}, 1);                                                                                                               // 1
_app.sc = {};                                                                                                        // 4
ServiceConfiguration.configurations.remove({});                                                                      // 5
                                                                                                                     //
if (process.env.ACCOUNTS_METEOR_ID && process.env.ACCOUNTS_METEOR_SEC) {                                             // 7
  _app.sc.meteor = true;                                                                                             // 8
  ServiceConfiguration.configurations.upsert({                                                                       // 9
    service: 'meteor-developer'                                                                                      // 10
  }, {                                                                                                               // 9
    $set: {                                                                                                          // 12
      secret: process.env.ACCOUNTS_METEOR_SEC,                                                                       // 13
      clientId: process.env.ACCOUNTS_METEOR_ID,                                                                      // 14
      loginStyle: 'redirect'                                                                                         // 15
    }                                                                                                                // 12
  });                                                                                                                // 11
}                                                                                                                    // 18
                                                                                                                     //
if (process.env.ACCOUNTS_GITHUB_ID && process.env.ACCOUNTS_GITHUB_SEC) {                                             // 20
  _app.sc.github = true;                                                                                             // 21
  ServiceConfiguration.configurations.upsert({                                                                       // 22
    service: 'github'                                                                                                // 23
  }, {                                                                                                               // 22
    $set: {                                                                                                          // 25
      secret: process.env.ACCOUNTS_GITHUB_SEC,                                                                       // 26
      clientId: process.env.ACCOUNTS_GITHUB_ID,                                                                      // 27
      loginStyle: 'redirect'                                                                                         // 28
    }                                                                                                                // 25
  });                                                                                                                // 24
}                                                                                                                    // 31
                                                                                                                     //
if (process.env.ACCOUNTS_TWITTER_ID && process.env.ACCOUNTS_TWITTER_SEC) {                                           // 33
  _app.sc.twitter = true;                                                                                            // 34
  ServiceConfiguration.configurations.upsert({                                                                       // 35
    service: 'twitter'                                                                                               // 36
  }, {                                                                                                               // 35
    $set: {                                                                                                          // 38
      loginStyle: 'redirect',                                                                                        // 39
      secret: process.env.ACCOUNTS_TWITTER_SEC,                                                                      // 40
      consumerKey: process.env.ACCOUNTS_TWITTER_ID                                                                   // 41
    }                                                                                                                // 38
  });                                                                                                                // 37
}                                                                                                                    // 44
                                                                                                                     //
if (process.env.ACCOUNTS_FACEBOOK_ID && process.env.ACCOUNTS_FACEBOOK_SEC) {                                         // 46
  _app.sc.facebook = true;                                                                                           // 47
  ServiceConfiguration.configurations.upsert({                                                                       // 48
    service: 'facebook'                                                                                              // 49
  }, {                                                                                                               // 48
    $set: {                                                                                                          // 51
      secret: process.env.ACCOUNTS_FACEBOOK_SEC,                                                                     // 52
      appId: process.env.ACCOUNTS_FACEBOOK_ID,                                                                       // 53
      loginStyle: 'redirect'                                                                                         // 54
    }                                                                                                                // 51
  });                                                                                                                // 50
}                                                                                                                    // 57
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"spiderable.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// imports/server/spiderable.js                                                                                      //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
// import { WebApp } from 'meteor/webapp';                                                                           // 1
// import Spiderable from 'meteor/ostrio:spiderable-middleware';                                                     // 2
//                                                                                                                   // 3
// WebApp.connectHandlers.use(new Spiderable({                                                                       // 4
//   rootURL: 'https://files.veliov.com',                                                                            // 5
//   serviceURL: 'https://render.ostr.io',                                                                           // 6
//   auth: 'xxx:yyy'                                                                                                 // 7
// }));                                                                                                              // 8
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"server":{"core.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// server/core.js                                                                                                    //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.watch(require("/imports/server/files.collection.js"));                                                        // 1
module.watch(require("/imports/server/image-processing.js"));                                                        // 1
module.watch(require("/imports/server/methods.js"));                                                                 // 1
module.watch(require("/imports/server/publications.js"));                                                            // 1
module.watch(require("/imports/server/service-configurations.js"));                                                  // 1
module.watch(require("/imports/server/spiderable.js"));                                                              // 1
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("./server/core.js");
//# sourceMappingURL=app.js.map
