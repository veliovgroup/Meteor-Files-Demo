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
                                                                                                                     //
var fs = require('fs-extra');                                                                                        // 19
                                                                                                                     //
var S3 = require('aws-sdk/clients/s3');                                                                              // 20
                                                                                                                     //
var stream = require('stream');                                                                                      // 21
                                                                                                                     //
var request = require('request');                                                                                    // 22
                                                                                                                     //
var Dropbox = require('dropbox');                                                                                    // 23
                                                                                                                     //
var bound = Meteor.bindEnvironment(function (callback) {                                                             // 24
  return callback();                                                                                                 // 25
});                                                                                                                  // 26
                                                                                                                     //
if (process.env.DROPBOX) {                                                                                           // 28
  Meteor.settings.dropbox = JSON.parse(process.env.DROPBOX).dropbox;                                                 // 29
} else if (process.env.S3) {                                                                                         // 30
  Meteor.settings.s3 = JSON.parse(process.env.S3).s3;                                                                // 31
}                                                                                                                    // 32
                                                                                                                     //
var s3Conf = Meteor.settings.s3 || {};                                                                               // 34
var dbConf = Meteor.settings.dropbox || {};                                                                          // 35
                                                                                                                     //
if (dbConf && dbConf.key && dbConf.secret && dbConf.token) {                                                         // 37
  useDropBox = true;                                                                                                 // 38
  client = new Dropbox.Client({                                                                                      // 39
    key: dbConf.key,                                                                                                 // 40
    secret: dbConf.secret,                                                                                           // 41
    token: dbConf.token                                                                                              // 42
  });                                                                                                                // 39
} else if (s3Conf && s3Conf.key && s3Conf.secret && s3Conf.bucket && s3Conf.region) {                                // 44
  useS3 = true;                                                                                                      // 45
  client = new S3({                                                                                                  // 46
    secretAccessKey: s3Conf.secret,                                                                                  // 47
    accessKeyId: s3Conf.key,                                                                                         // 48
    region: s3Conf.region,                                                                                           // 49
    sslEnabled: false,                                                                                               // 50
    httpOptions: {                                                                                                   // 51
      timeout: 6000,                                                                                                 // 52
      agent: false                                                                                                   // 53
    }                                                                                                                // 51
  });                                                                                                                // 46
}                                                                                                                    // 56
                                                                                                                     //
Collections.files = new FilesCollection({                                                                            // 58
  // debug: true,                                                                                                    // 59
  // throttle: false,                                                                                                // 60
  chunkSize: 1024 * 768,                                                                                             // 61
  storagePath: 'assets/app/uploads/uploadedFiles',                                                                   // 62
  collectionName: 'uploadedFiles',                                                                                   // 63
  allowClientCode: true,                                                                                             // 64
  "protected": function (fileObj) {                                                                                  // 58
    if (fileObj) {                                                                                                   // 66
      if (!(fileObj.meta && fileObj.meta.secured)) {                                                                 // 67
        return true;                                                                                                 // 68
      } else if (fileObj.meta && fileObj.meta.secured === true && this.userId === fileObj.userId) {                  // 69
        return true;                                                                                                 // 70
      }                                                                                                              // 71
    }                                                                                                                // 72
                                                                                                                     //
    return false;                                                                                                    // 73
  },                                                                                                                 // 74
  onBeforeRemove: function (cursor) {                                                                                // 75
    var _this = this;                                                                                                // 75
                                                                                                                     //
    var res = cursor.map(function (file) {                                                                           // 76
      if (file && file.userId && _.isString(file.userId)) {                                                          // 77
        return file.userId === _this.userId;                                                                         // 78
      }                                                                                                              // 79
                                                                                                                     //
      return false;                                                                                                  // 80
    });                                                                                                              // 81
    return !~res.indexOf(false);                                                                                     // 82
  },                                                                                                                 // 83
  onBeforeUpload: function () {                                                                                      // 84
    if (this.file.size <= 1024 * 1024 * 128) {                                                                       // 85
      return true;                                                                                                   // 86
    }                                                                                                                // 87
                                                                                                                     //
    return "Max. file size is 128MB you've tried to upload " + filesize(this.file.size);                             // 88
  },                                                                                                                 // 89
  downloadCallback: function (fileObj) {                                                                             // 90
    if (this.params && this.params.query && this.params.query.download === 'true') {                                 // 91
      Collections.files.collection.update(fileObj._id, {                                                             // 92
        $inc: {                                                                                                      // 93
          'meta.downloads': 1                                                                                        // 94
        }                                                                                                            // 93
      }, _app.NOOP);                                                                                                 // 92
    }                                                                                                                // 97
                                                                                                                     //
    return true;                                                                                                     // 98
  },                                                                                                                 // 99
  interceptDownload: function (http, fileRef, version) {                                                             // 100
    var path = void 0;                                                                                               // 101
                                                                                                                     //
    if (useDropBox) {                                                                                                // 102
      path = fileRef && fileRef.versions && fileRef.versions[version] && fileRef.versions[version].meta && fileRef.versions[version].meta.pipeFrom ? fileRef.versions[version].meta.pipeFrom : void 0;
                                                                                                                     //
      if (path) {                                                                                                    // 104
        // If file is successfully moved to Storage                                                                  // 105
        // We will pipe request to Storage                                                                           // 106
        // So, original link will stay always secure                                                                 // 107
        // To force ?play and ?download parameters                                                                   // 109
        // and to keep original file name, content-type,                                                             // 110
        // content-disposition and cache-control                                                                     // 111
        // we're using low-level .serve() method                                                                     // 112
        this.serve(http, fileRef, fileRef.versions[version], version, request({                                      // 113
          url: path,                                                                                                 // 114
          headers: _.pick(http.request.headers, 'range', 'cache-control', 'connection')                              // 115
        }));                                                                                                         // 113
        return true;                                                                                                 // 117
      } // While file is not yet uploaded to Storage                                                                 // 118
      // We will serve file from FS                                                                                  // 120
                                                                                                                     //
                                                                                                                     //
      return false;                                                                                                  // 121
    } else if (useS3) {                                                                                              // 122
      path = fileRef && fileRef.versions && fileRef.versions[version] && fileRef.versions[version].meta && fileRef.versions[version].meta.pipePath ? fileRef.versions[version].meta.pipePath : void 0;
                                                                                                                     //
      if (path) {                                                                                                    // 124
        // If file is successfully moved to Storage                                                                  // 125
        // We will pipe request to Storage                                                                           // 126
        // So, original link will stay always secure                                                                 // 127
        // To force ?play and ?download parameters                                                                   // 129
        // and to keep original file name, content-type,                                                             // 130
        // content-disposition and cache-control                                                                     // 131
        // we're using low-level .serve() method                                                                     // 132
        var opts = {                                                                                                 // 133
          Bucket: s3Conf.bucket,                                                                                     // 134
          Key: path                                                                                                  // 135
        };                                                                                                           // 133
                                                                                                                     //
        if (http.request.headers.range) {                                                                            // 138
          var vRef = fileRef.versions[version];                                                                      // 139
                                                                                                                     //
          var range = _.clone(http.request.headers.range);                                                           // 140
                                                                                                                     //
          var array = range.split(/bytes=([0-9]*)-([0-9]*)/);                                                        // 141
          var start = parseInt(array[1]);                                                                            // 142
          var end = parseInt(array[2]);                                                                              // 143
                                                                                                                     //
          if (isNaN(end)) {                                                                                          // 144
            // Request data from AWS:S3 by small chunks                                                              // 145
            end = start + this.chunkSize - 1;                                                                        // 146
                                                                                                                     //
            if (end >= vRef.size) {                                                                                  // 147
              end = vRef.size - 1;                                                                                   // 148
            }                                                                                                        // 149
          }                                                                                                          // 150
                                                                                                                     //
          opts.Range = "bytes=" + start + "-" + end;                                                                 // 151
          http.request.headers.range = "bytes=" + start + "-" + end;                                                 // 152
        }                                                                                                            // 153
                                                                                                                     //
        var fileColl = this;                                                                                         // 155
        client.getObject(opts, function (error) {                                                                    // 156
          if (error) {                                                                                               // 157
            console.error(error);                                                                                    // 158
                                                                                                                     //
            if (!http.response.finished) {                                                                           // 159
              http.response.end();                                                                                   // 160
            }                                                                                                        // 161
          } else {                                                                                                   // 162
            if (http.request.headers.range && this.httpResponse.headers['content-range']) {                          // 163
              // Set proper range header in according to what is returned from AWS:S3                                // 164
              http.request.headers.range = this.httpResponse.headers['content-range'].split('/')[0].replace('bytes ', 'bytes=');
            }                                                                                                        // 166
                                                                                                                     //
            var dataStream = new stream.PassThrough();                                                               // 168
            fileColl.serve(http, fileRef, fileRef.versions[version], version, dataStream);                           // 169
            dataStream.end(this.data.Body);                                                                          // 170
          }                                                                                                          // 171
        });                                                                                                          // 172
        return true;                                                                                                 // 174
      } // While file is not yet uploaded to Storage                                                                 // 175
      // We will serve file from FS                                                                                  // 177
                                                                                                                     //
                                                                                                                     //
      return false;                                                                                                  // 178
    }                                                                                                                // 179
                                                                                                                     //
    return false;                                                                                                    // 180
  }                                                                                                                  // 181
});                                                                                                                  // 58
Collections.files.denyClient();                                                                                      // 184
Collections.files.on('afterUpload', function (fileRef) {                                                             // 185
  var _this2 = this;                                                                                                 // 185
                                                                                                                     //
  if (useDropBox) {                                                                                                  // 186
    var makeUrl = function (stat, fileRef, version) {                                                                // 187
      var triesUrl = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;                          // 187
      client.makeUrl(stat.path, {                                                                                    // 188
        long: true,                                                                                                  // 189
        downloadHack: true                                                                                           // 190
      }, function (error, xml) {                                                                                     // 188
        bound(function () {                                                                                          // 192
          // Store downloadable link in file's meta object                                                           // 193
          if (error) {                                                                                               // 194
            if (triesUrl < 10) {                                                                                     // 195
              Meteor.setTimeout(function () {                                                                        // 196
                makeUrl(stat, fileRef, version, ++triesUrl);                                                         // 197
              }, 2048);                                                                                              // 198
            } else {                                                                                                 // 199
              console.error(error, {                                                                                 // 200
                triesUrl: triesUrl                                                                                   // 201
              });                                                                                                    // 200
            }                                                                                                        // 203
          } else if (xml) {                                                                                          // 204
            var upd = {                                                                                              // 205
              $set: {}                                                                                               // 205
            };                                                                                                       // 205
            upd['$set']['versions.' + version + '.meta.pipeFrom'] = xml.url;                                         // 206
            upd['$set']['versions.' + version + '.meta.pipePath'] = stat.path;                                       // 207
                                                                                                                     //
            _this2.collection.update({                                                                               // 208
              _id: fileRef._id                                                                                       // 209
            }, upd, function (updError) {                                                                            // 208
              if (updError) {                                                                                        // 211
                console.error(updError);                                                                             // 212
              } else {                                                                                               // 213
                // Unlink original files from FS                                                                     // 214
                // after successful upload to DropBox                                                                // 215
                _this2.unlink(_this2.collection.findOne(fileRef._id), version);                                      // 216
              }                                                                                                      // 217
            });                                                                                                      // 218
          } else {                                                                                                   // 219
            if (triesUrl < 10) {                                                                                     // 220
              Meteor.setTimeout(function () {                                                                        // 221
                // Generate downloadable link                                                                        // 222
                makeUrl(stat, fileRef, version, ++triesUrl);                                                         // 223
              }, 2048);                                                                                              // 224
            } else {                                                                                                 // 225
              console.error("client.makeUrl doesn't returns xml", {                                                  // 226
                triesUrl: triesUrl                                                                                   // 227
              });                                                                                                    // 226
            }                                                                                                        // 229
          }                                                                                                          // 230
        });                                                                                                          // 231
      });                                                                                                            // 232
    };                                                                                                               // 233
                                                                                                                     //
    var writeToDB = function (fileRef, version, data) {                                                              // 235
      var triesSend = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;                         // 235
      // DropBox already uses random URLs                                                                            // 236
      // No need to use random file names                                                                            // 237
      client.writeFile(fileRef._id + '-' + version + '.' + fileRef.extension, data, function (error, stat) {         // 238
        bound(function () {                                                                                          // 239
          if (error) {                                                                                               // 240
            if (triesSend < 10) {                                                                                    // 241
              Meteor.setTimeout(function () {                                                                        // 242
                // Write file to DropBox                                                                             // 243
                writeToDB(fileRef, version, data, ++triesSend);                                                      // 244
              }, 2048);                                                                                              // 245
            } else {                                                                                                 // 246
              console.error(error, {                                                                                 // 247
                triesSend: triesSend                                                                                 // 248
              });                                                                                                    // 247
            }                                                                                                        // 250
          } else {                                                                                                   // 251
            makeUrl(stat, fileRef, version);                                                                         // 252
          }                                                                                                          // 253
        });                                                                                                          // 254
      });                                                                                                            // 255
    };                                                                                                               // 256
                                                                                                                     //
    var readFile = function (fileRef, vRef, version) {                                                               // 258
      var triesRead = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;                         // 258
      fs.readFile(vRef.path, function (error, data) {                                                                // 259
        bound(function () {                                                                                          // 260
          if (error) {                                                                                               // 261
            if (triesRead < 10) {                                                                                    // 262
              readFile(fileRef, vRef, version, ++triesRead);                                                         // 263
            } else {                                                                                                 // 264
              console.error(error);                                                                                  // 265
            }                                                                                                        // 266
          } else {                                                                                                   // 267
            writeToDB(fileRef, version, data);                                                                       // 268
          }                                                                                                          // 269
        });                                                                                                          // 270
      });                                                                                                            // 271
    };                                                                                                               // 272
                                                                                                                     //
    sendToStorage = function (fileRef) {                                                                             // 274
      _.each(fileRef.versions, function (vRef, version) {                                                            // 275
        readFile(fileRef, vRef, version);                                                                            // 276
      });                                                                                                            // 277
    };                                                                                                               // 278
  } else if (useS3) {                                                                                                // 279
    sendToStorage = function (fileRef) {                                                                             // 280
      _.each(fileRef.versions, function (vRef, version) {                                                            // 281
        // We use Random.id() instead of real file's _id                                                             // 282
        // to secure files from reverse engineering                                                                  // 283
        // As after viewing this code it will be easy                                                                // 284
        // to get access to unlisted and protected files                                                             // 285
        var filePath = 'files/' + Random.id() + '-' + version + '.' + fileRef.extension;                             // 286
        client.putObject({                                                                                           // 288
          StorageClass: 'STANDARD',                                                                                  // 289
          Bucket: s3Conf.bucket,                                                                                     // 290
          Key: filePath,                                                                                             // 291
          Body: fs.createReadStream(vRef.path),                                                                      // 292
          ContentType: vRef.type                                                                                     // 293
        }, function (error) {                                                                                        // 288
          bound(function () {                                                                                        // 295
            if (error) {                                                                                             // 296
              console.error(error);                                                                                  // 297
            } else {                                                                                                 // 298
              var upd = {                                                                                            // 299
                $set: {}                                                                                             // 299
              };                                                                                                     // 299
              upd['$set']['versions.' + version + '.meta.pipePath'] = filePath;                                      // 300
                                                                                                                     //
              _this2.collection.update({                                                                             // 301
                _id: fileRef._id                                                                                     // 302
              }, upd, function (updError) {                                                                          // 301
                if (updError) {                                                                                      // 304
                  console.error(updError);                                                                           // 305
                } else {                                                                                             // 306
                  // Unlink original file from FS                                                                    // 307
                  // after successful upload to AWS:S3                                                               // 308
                  _this2.unlink(_this2.collection.findOne(fileRef._id), version);                                    // 309
                }                                                                                                    // 310
              });                                                                                                    // 311
            }                                                                                                        // 312
          });                                                                                                        // 313
        });                                                                                                          // 314
      });                                                                                                            // 315
    };                                                                                                               // 316
  }                                                                                                                  // 317
                                                                                                                     //
  if (/png|jpe?g/i.test(fileRef.extension || '')) {                                                                  // 319
    _app.createThumbnails(this, fileRef, function (error, fileRef) {                                                 // 320
      if (error) {                                                                                                   // 321
        console.error(error);                                                                                        // 322
      }                                                                                                              // 323
                                                                                                                     //
      if (useDropBox || useS3) {                                                                                     // 324
        sendToStorage(_this2.collection.findOne(fileRef._id));                                                       // 325
      }                                                                                                              // 326
    });                                                                                                              // 327
  } else {                                                                                                           // 328
    if (useDropBox || useS3) {                                                                                       // 329
      sendToStorage(fileRef);                                                                                        // 330
    }                                                                                                                // 331
  }                                                                                                                  // 332
}); // This line now commented due to Heroku usage                                                                   // 333
// Collections.files.collection._ensureIndex {'meta.expireAt': 1}, {expireAfterSeconds: 0, background: true}         // 336
// Intercept FileCollection's remove method                                                                          // 338
// to remove file from DropBox or AWS S3                                                                             // 339
                                                                                                                     //
if (useDropBox || useS3) {                                                                                           // 340
  var _origRemove = Collections.files.remove;                                                                        // 341
                                                                                                                     //
  Collections.files.remove = function (search) {                                                                     // 342
    var cursor = this.collection.find(search);                                                                       // 343
    cursor.forEach(function (fileRef) {                                                                              // 344
      _.each(fileRef.versions, function (vRef) {                                                                     // 345
        if (vRef && vRef.meta && vRef.meta.pipePath != null) {                                                       // 346
          if (useDropBox) {                                                                                          // 347
            // DropBox usage:                                                                                        // 348
            client.remove(vRef.meta.pipePath, function (error) {                                                     // 349
              bound(function () {                                                                                    // 350
                if (error) {                                                                                         // 351
                  console.error(error);                                                                              // 352
                }                                                                                                    // 353
              });                                                                                                    // 354
            });                                                                                                      // 355
          } else {                                                                                                   // 356
            // AWS:S3 usage:                                                                                         // 357
            client.deleteObject({                                                                                    // 358
              Bucket: s3Conf.bucket,                                                                                 // 359
              Key: vRef.meta.pipePath                                                                                // 360
            }, function (error) {                                                                                    // 358
              bound(function () {                                                                                    // 362
                if (error) {                                                                                         // 363
                  console.error(error);                                                                              // 364
                }                                                                                                    // 365
              });                                                                                                    // 366
            });                                                                                                      // 367
          }                                                                                                          // 368
        }                                                                                                            // 369
      });                                                                                                            // 370
    }); // Call original method                                                                                      // 371
                                                                                                                     //
    _origRemove.call(this, search);                                                                                  // 373
  };                                                                                                                 // 374
} // Remove all files on server load/reload, useful while testing/development                                        // 375
// Meteor.startup -> Collections.files.remove {}                                                                     // 378
// Remove files along with MongoDB records two minutes before expiration date                                        // 380
// If we have 'expireAfterSeconds' index on 'meta.expireAt' field,                                                   // 381
// it won't remove files themselves.                                                                                 // 382
                                                                                                                     //
                                                                                                                     //
Meteor.setInterval(function () {                                                                                     // 383
  Collections.files.remove({                                                                                         // 384
    'meta.expireAt': {                                                                                               // 385
      $lte: new Date(+new Date() + 120000)                                                                           // 386
    }                                                                                                                // 385
  }, _app.NOOP);                                                                                                     // 384
}, 120000);                                                                                                          // 389
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
                            meta: {                                                                                  // 150
                              width: imgInfo.width,                                                                  // 151
                              height: imgInfo.height                                                                 // 152
                            }                                                                                        // 150
                          };                                                                                         // 145
                          collection.collection.update(fileRef._id, upd, function (colUpdError) {                    // 156
                            ++i;                                                                                     // 157
                                                                                                                     //
                            if (i === Object.keys(sizes).length) {                                                   // 158
                              isLast = true;                                                                         // 159
                            }                                                                                        // 160
                                                                                                                     //
                            finish(colUpdError);                                                                     // 161
                          });                                                                                        // 162
                        });                                                                                          // 163
                      });                                                                                            // 164
                    });                                                                                              // 165
                  });                                                                                                // 166
                });                                                                                                  // 167
              };                                                                                                     // 168
                                                                                                                     //
              if (!size.square) {                                                                                    // 170
                if (features.width > size.width) {                                                                   // 171
                  img.resize(size.width).interlace('Line').write(path, updateAndSave);                               // 172
                } else {                                                                                             // 173
                  copyPaste();                                                                                       // 174
                }                                                                                                    // 175
              } else {                                                                                               // 176
                var x = 0;                                                                                           // 177
                var y = 0;                                                                                           // 178
                var widthRatio = features.width / size.width;                                                        // 179
                var heightRatio = features.height / size.width;                                                      // 180
                var widthNew = size.width;                                                                           // 181
                var heightNew = size.width;                                                                          // 182
                                                                                                                     //
                if (heightRatio < widthRatio) {                                                                      // 184
                  widthNew = size.width * features.width / features.height;                                          // 185
                  x = (widthNew - size.width) / 2;                                                                   // 186
                }                                                                                                    // 187
                                                                                                                     //
                if (heightRatio > widthRatio) {                                                                      // 189
                  heightNew = size.width * features.height / features.width;                                         // 190
                  y = (heightNew - size.width) / 2;                                                                  // 191
                }                                                                                                    // 192
                                                                                                                     //
                img.resize(widthNew, heightNew).crop(size.width, size.width, x, y).interlace('Line').write(path, updateAndSave);
              }                                                                                                      // 199
            } else {                                                                                                 // 200
              copyPaste();                                                                                           // 201
            }                                                                                                        // 202
          });                                                                                                        // 203
        });                                                                                                          // 204
      });                                                                                                            // 205
    });                                                                                                              // 206
  });                                                                                                                // 207
  return true;                                                                                                       // 208
};                                                                                                                   // 209
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
    } else {                                                                                                         // 14
      selector = {                                                                                                   // 15
        $or: [{                                                                                                      // 16
          'meta.unlisted': false,                                                                                    // 18
          'meta.secured': false,                                                                                     // 19
          'meta.blamed': {                                                                                           // 20
            $lt: 3                                                                                                   // 21
          }                                                                                                          // 20
        }, {                                                                                                         // 17
          userId: this.userId                                                                                        // 24
        }]                                                                                                           // 23
      };                                                                                                             // 15
    }                                                                                                                // 28
                                                                                                                     //
    return Collections.files.find(selector).count();                                                                 // 29
  },                                                                                                                 // 30
  unblame: function (_id) {                                                                                          // 31
    check(_id, String);                                                                                              // 32
    Collections.files.update({                                                                                       // 33
      _id: _id                                                                                                       // 34
    }, {                                                                                                             // 33
      $inc: {                                                                                                        // 36
        'meta.blamed': -1                                                                                            // 37
      }                                                                                                              // 36
    }, _app.NOOP);                                                                                                   // 35
    return true;                                                                                                     // 40
  },                                                                                                                 // 41
  blame: function (_id) {                                                                                            // 42
    check(_id, String);                                                                                              // 43
    Collections.files.update({                                                                                       // 44
      _id: _id                                                                                                       // 45
    }, {                                                                                                             // 44
      $inc: {                                                                                                        // 47
        'meta.blamed': 1                                                                                             // 48
      }                                                                                                              // 47
    }, _app.NOOP);                                                                                                   // 46
    return true;                                                                                                     // 51
  },                                                                                                                 // 52
  changeAccess: function (_id) {                                                                                     // 53
    check(_id, String);                                                                                              // 54
                                                                                                                     //
    if (Meteor.userId()) {                                                                                           // 55
      var file = Collections.files.findOne({                                                                         // 56
        _id: _id,                                                                                                    // 57
        userId: Meteor.userId()                                                                                      // 58
      });                                                                                                            // 56
                                                                                                                     //
      if (file) {                                                                                                    // 61
        Collections.files.update(_id, {                                                                              // 62
          $set: {                                                                                                    // 63
            'meta.unlisted': file.meta.unlisted ? false : true                                                       // 64
          }                                                                                                          // 63
        }, _app.NOOP);                                                                                               // 62
        return true;                                                                                                 // 67
      }                                                                                                              // 68
    }                                                                                                                // 69
                                                                                                                     //
    throw new Meteor.Error(401, 'Access denied!');                                                                   // 70
  },                                                                                                                 // 71
  changePrivacy: function (_id) {                                                                                    // 72
    check(_id, String);                                                                                              // 73
                                                                                                                     //
    if (Meteor.userId()) {                                                                                           // 74
      var file = Collections.files.findOne({                                                                         // 75
        _id: _id,                                                                                                    // 76
        userId: Meteor.userId()                                                                                      // 77
      });                                                                                                            // 75
                                                                                                                     //
      if (file) {                                                                                                    // 80
        Collections.files.update(_id, {                                                                              // 81
          $set: {                                                                                                    // 82
            'meta.unlisted': true,                                                                                   // 83
            'meta.secured': file.meta.secured ? false : true                                                         // 84
          }                                                                                                          // 82
        }, _app.NOOP);                                                                                               // 81
        return true;                                                                                                 // 87
      }                                                                                                              // 88
    }                                                                                                                // 89
                                                                                                                     //
    throw new Meteor.Error(401, 'Access denied!');                                                                   // 90
  },                                                                                                                 // 91
  getServiceConfiguration: function () {                                                                             // 92
    return _app.sc;                                                                                                  // 93
  }                                                                                                                  // 94
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
  } else {                                                                                                           // 14
    selector = {                                                                                                     // 15
      $or: [{                                                                                                        // 16
        'meta.unlisted': false,                                                                                      // 18
        'meta.secured': false,                                                                                       // 19
        'meta.blamed': {                                                                                             // 20
          $lt: 3                                                                                                     // 21
        }                                                                                                            // 20
      }, {                                                                                                           // 17
        userId: this.userId                                                                                          // 24
      }]                                                                                                             // 23
    };                                                                                                               // 15
  }                                                                                                                  // 28
                                                                                                                     //
  return Collections.files.find(selector, {                                                                          // 30
    limit: take,                                                                                                     // 31
    sort: {                                                                                                          // 32
      'meta.created_at': -1                                                                                          // 33
    },                                                                                                               // 32
    fields: {                                                                                                        // 35
      _id: 1,                                                                                                        // 36
      name: 1,                                                                                                       // 37
      size: 1,                                                                                                       // 38
      meta: 1,                                                                                                       // 39
      type: 1,                                                                                                       // 40
      isPDF: 1,                                                                                                      // 41
      isText: 1,                                                                                                     // 42
      isJSON: 1,                                                                                                     // 43
      isVideo: 1,                                                                                                    // 44
      isAudio: 1,                                                                                                    // 45
      isImage: 1,                                                                                                    // 46
      userId: 1,                                                                                                     // 47
      'versions.thumbnail40.extension': 1,                                                                           // 48
      'versions.preview.extension': 1,                                                                               // 49
      extension: 1,                                                                                                  // 50
      _collectionName: 1,                                                                                            // 51
      _downloadRoute: 1                                                                                              // 52
    }                                                                                                                // 35
  }).cursor;                                                                                                         // 30
});                                                                                                                  // 55
Meteor.publish('file', function (_id) {                                                                              // 57
  check(_id, String);                                                                                                // 58
  return Collections.files.find({                                                                                    // 59
    $or: [{                                                                                                          // 60
      _id: _id,                                                                                                      // 62
      'meta.secured': false                                                                                          // 63
    }, {                                                                                                             // 61
      _id: _id,                                                                                                      // 65
      'meta.secured': true,                                                                                          // 66
      userId: this.userId                                                                                            // 67
    }]                                                                                                               // 64
  }, {                                                                                                               // 59
    fields: {                                                                                                        // 71
      _id: 1,                                                                                                        // 72
      name: 1,                                                                                                       // 73
      size: 1,                                                                                                       // 74
      type: 1,                                                                                                       // 75
      meta: 1,                                                                                                       // 76
      isPDF: 1,                                                                                                      // 77
      isText: 1,                                                                                                     // 78
      isJSON: 1,                                                                                                     // 79
      isVideo: 1,                                                                                                    // 80
      isAudio: 1,                                                                                                    // 81
      isImage: 1,                                                                                                    // 82
      extension: 1,                                                                                                  // 83
      'versions.preview.extension': 1,                                                                               // 84
      _collectionName: 1,                                                                                            // 85
      _downloadRoute: 1                                                                                              // 86
    }                                                                                                                // 71
  }).cursor;                                                                                                         // 70
});                                                                                                                  // 89
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
