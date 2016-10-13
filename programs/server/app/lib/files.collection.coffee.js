(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// lib/files.collection.coffee.js                                      //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var Dropbox, Request, _origRemove, bound, client, fs, knox, ref, ref1, ref2, ref3, useDropBox, useS3;
                                                                       //
useDropBox = false;                                                    // 4
                                                                       //
useS3 = false;                                                         // 12
                                                                       //
if (Meteor.isServer) {                                                 // 14
  if ((ref = process.env) != null ? ref.DROPBOX : void 0) {            //
    Meteor.settings.dropbox = (ref1 = JSON.parse(process.env.DROPBOX)) != null ? ref1.dropbox : void 0;
  } else if ((ref2 = process.env) != null ? ref2.S3 : void 0) {        //
    Meteor.settings.s3 = (ref3 = JSON.parse(process.env.S3)) != null ? ref3.s3 : void 0;
  }                                                                    //
  if (Meteor.settings.dropbox && Meteor.settings.dropbox.key && Meteor.settings.dropbox.secret && Meteor.settings.dropbox.token) {
    useDropBox = true;                                                 //
    Dropbox = Npm.require('dropbox');                                  //
    Request = Npm.require('request');                                  //
    fs = Npm.require('fs');                                            //
    bound = Meteor.bindEnvironment(function(callback) {                //
      return callback();                                               // 25
    });                                                                //
    client = new Dropbox.Client({                                      //
      key: Meteor.settings.dropbox.key,                                //
      secret: Meteor.settings.dropbox.secret,                          //
      token: Meteor.settings.dropbox.token                             //
    });                                                                //
  } else if (Meteor.settings.s3 && Meteor.settings.s3.key && Meteor.settings.s3.secret && Meteor.settings.s3.bucket && Meteor.settings.s3.region && Meteor.settings.s3.cfdomain) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;                      //
    useS3 = true;                                                      //
    knox = Npm.require('knox');                                        //
    Request = Npm.require('request');                                  //
    bound = Meteor.bindEnvironment(function(callback) {                //
      return callback();                                               // 40
    });                                                                //
    client = knox.createClient({                                       //
      key: Meteor.settings.s3.key,                                     //
      secret: Meteor.settings.s3.secret,                               //
      bucket: Meteor.settings.s3.bucket,                               //
      region: Meteor.settings.s3.region                                //
    });                                                                //
    Meteor.settings.s3.cfdomain = Meteor.settings.s3.cfdomain.replace(/\/+$/, '');
  }                                                                    //
}                                                                      //
                                                                       //
Collections.files = new FilesCollection({                              // 50
  storagePath: 'assets/app/uploads/uploadedFiles',                     //
  collectionName: 'uploadedFiles',                                     //
  allowClientCode: true,                                               //
  "protected": function(fileObj) {                                     //
    var ref4, ref5;                                                    // 58
    if (fileObj) {                                                     //
      if (!((ref4 = fileObj.meta) != null ? ref4.secured : void 0)) {  //
        return true;                                                   // 60
      } else if (((ref5 = fileObj.meta) != null ? ref5.secured : void 0) && this.userId === fileObj.userId) {
        return true;                                                   // 62
      }                                                                //
    }                                                                  //
    return false;                                                      // 63
  },                                                                   //
  onBeforeRemove: function(cursor) {                                   //
    var res, self;                                                     // 65
    self = this;                                                       //
    res = cursor.map(function(file) {                                  //
      if ((file != null ? file.userId : void 0) && _.isString(file.userId)) {
        return file.userId === self.userId;                            // 68
      } else {                                                         //
        return false;                                                  // 70
      }                                                                //
    });                                                                //
    return !~res.indexOf(false);                                       // 71
  },                                                                   //
  onBeforeUpload: function() {                                         //
    if (this.file.size <= 1024 * 1024 * 128) {                         //
      return true;                                                     //
    } else {                                                           //
      return "Max. file size is 128MB you've tried to upload " + (filesize(this.file.size));
    }                                                                  //
  },                                                                   //
  downloadCallback: function(fileObj) {                                //
    var ref4;                                                          // 75
    if (((ref4 = this.params) != null ? ref4.query.download : void 0) === 'true') {
      Collections.files.collection.update(fileObj._id, {               //
        $inc: {                                                        //
          'meta.downloads': 1                                          //
        }                                                              //
      });                                                              //
    }                                                                  //
    return true;                                                       // 77
  },                                                                   //
  interceptDownload: function(http, fileRef, version) {                //
    var path, ref4, ref5, ref6;                                        // 79
    if (useDropBox || useS3) {                                         //
      path = fileRef != null ? (ref4 = fileRef.versions) != null ? (ref5 = ref4[version]) != null ? (ref6 = ref5.meta) != null ? ref6.pipeFrom : void 0 : void 0 : void 0 : void 0;
      if (path) {                                                      //
        this.serve(http, fileRef, fileRef.versions[version], version, Request({
          url: path,                                                   //
          headers: _.pick(http.request.headers, 'range', 'accept-language', 'accept', 'cache-control', 'pragma', 'connection', 'upgrade-insecure-requests', 'user-agent')
        }));                                                           //
        return true;                                                   // 97
      } else {                                                         //
        return false;                                                  // 101
      }                                                                //
    } else {                                                           //
      return false;                                                    // 103
    }                                                                  //
  }                                                                    //
});                                                                    //
                                                                       //
if (Meteor.isServer) {                                                 // 105
  Collections.files.denyClient();                                      //
  Collections.files.collection.attachSchema(Collections.files.schema);
  Collections.files.on('afterUpload', function(fileRef) {              //
    var makeUrl, readFile, self, sendToStorage, writeToDB;             // 110
    self = this;                                                       //
    if (useDropBox) {                                                  //
      makeUrl = function(stat, fileRef, version, triesUrl) {           //
        if (triesUrl == null) {                                        //
          triesUrl = 0;                                                //
        }                                                              //
        client.makeUrl(stat.path, {                                    //
          long: true,                                                  //
          downloadHack: true                                           //
        }, function(error, xml) {                                      //
          return bound(function() {                                    //
            var upd;                                                   // 115
            if (error) {                                               //
              if (triesUrl < 10) {                                     //
                Meteor.setTimeout(function() {                         //
                  makeUrl(stat, fileRef, version, ++triesUrl);         //
                }, 2048);                                              //
              } else {                                                 //
                console.error(error, {                                 //
                  triesUrl: triesUrl                                   //
                });                                                    //
              }                                                        //
            } else if (xml) {                                          //
              upd = {                                                  //
                $set: {}                                               //
              };                                                       //
              upd['$set']["versions." + version + ".meta.pipeFrom"] = xml.url;
              upd['$set']["versions." + version + ".meta.pipePath"] = stat.path;
              self.collection.update({                                 //
                _id: fileRef._id                                       //
              }, upd, function(error) {                                //
                if (error) {                                           //
                  console.error(error);                                //
                } else {                                               //
                  self.unlink(self.collection.findOne(fileRef._id), version);
                }                                                      //
              });                                                      //
            } else {                                                   //
              if (triesUrl < 10) {                                     //
                Meteor.setTimeout(function() {                         //
                  makeUrl(stat, fileRef, version, ++triesUrl);         //
                }, 2048);                                              //
              } else {                                                 //
                console.error("client.makeUrl doesn't returns xml", {  //
                  triesUrl: triesUrl                                   //
                });                                                    //
              }                                                        //
            }                                                          //
          });                                                          //
        });                                                            //
      };                                                               //
      writeToDB = function(fileRef, version, data, triesSend) {        //
        if (triesSend == null) {                                       //
          triesSend = 0;                                               //
        }                                                              //
        client.writeFile(fileRef._id + "-" + version + "." + fileRef.extension, data, function(error, stat) {
          return bound(function() {                                    //
            if (error) {                                               //
              if (triesSend < 10) {                                    //
                Meteor.setTimeout(function() {                         //
                  writeToDB(fileRef, version, data, ++triesSend);      //
                }, 2048);                                              //
              } else {                                                 //
                console.error(error, {                                 //
                  triesSend: triesSend                                 //
                });                                                    //
              }                                                        //
            } else {                                                   //
              makeUrl(stat, fileRef, version);                         //
            }                                                          //
          });                                                          //
        });                                                            //
      };                                                               //
      readFile = function(fileRef, vRef, version, triesRead) {         //
        if (triesRead == null) {                                       //
          triesRead = 0;                                               //
        }                                                              //
        fs.readFile(vRef.path, function(error, data) {                 //
          return bound(function() {                                    //
            if (error) {                                               //
              if (triesRead < 10) {                                    //
                readFile(fileRef, vRef, version, ++triesRead);         //
              } else {                                                 //
                console.error(error);                                  //
              }                                                        //
            } else {                                                   //
              writeToDB(fileRef, version, data);                       //
            }                                                          //
          });                                                          //
        });                                                            //
      };                                                               //
      sendToStorage = function(fileRef) {                              //
        _.each(fileRef.versions, function(vRef, version) {             //
          readFile(fileRef, vRef, version);                            //
        });                                                            //
      };                                                               //
    } else if (useS3) {                                                //
      sendToStorage = function(fileRef) {                              //
        _.each(fileRef.versions, function(vRef, version) {             //
          var filePath;                                                // 190
          filePath = "files/" + (Random.id()) + "-" + version + "." + fileRef.extension;
          client.putFile(vRef.path, filePath, function(error, res) {   //
            return bound(function() {                                  //
              var upd;                                                 // 192
              if (error) {                                             //
                console.error(error);                                  //
              } else {                                                 //
                upd = {                                                //
                  $set: {}                                             //
                };                                                     //
                upd['$set']["versions." + version + ".meta.pipeFrom"] = Meteor.settings.s3.cfdomain + '/' + filePath;
                upd['$set']["versions." + version + ".meta.pipePath"] = filePath;
                self.collection.update({                               //
                  _id: fileRef._id                                     //
                }, upd, function(error) {                              //
                  if (error) {                                         //
                    console.error(error);                              //
                  } else {                                             //
                    self.unlink(self.collection.findOne(fileRef._id), version);
                  }                                                    //
                });                                                    //
              }                                                        //
            });                                                        //
          });                                                          //
        });                                                            //
      };                                                               //
    }                                                                  //
    if (!!~['png', 'jpg', 'jpeg'].indexOf((fileRef.extension || '').toLowerCase())) {
      _app.createThumbnails(self, fileRef, function(fileRef) {         //
        if (useDropBox || useS3) {                                     //
          sendToStorage(self.collection.findOne(fileRef._id));         //
        }                                                              //
      });                                                              //
    } else {                                                           //
      if (useDropBox || useS3) {                                       //
        sendToStorage(fileRef);                                        //
      }                                                                //
    }                                                                  //
  });                                                                  //
  if (useDropBox || useS3) {                                           //
    _origRemove = Collections.files.remove;                            //
    Collections.files.remove = function(search) {                      //
      var cursor;                                                      // 228
      cursor = this.collection.find(search);                           //
      cursor.forEach(function(fileRef) {                               //
        _.each(fileRef.versions, function(vRef, version) {             //
          var ref4;                                                    // 231
          if (vRef != null ? (ref4 = vRef.meta) != null ? ref4.pipePath : void 0 : void 0) {
            if (useDropBox) {                                          //
              client.remove(vRef.meta.pipePath, function(error) {      //
                return bound(function() {                              //
                  if (error) {                                         //
                    console.error(error);                              //
                  }                                                    //
                });                                                    //
              });                                                      //
            } else {                                                   //
              client.deleteFile(vRef.meta.pipePath, function(error) {  //
                return bound(function() {                              //
                  if (error) {                                         //
                    console.error(error);                              //
                  }                                                    //
                });                                                    //
              });                                                      //
            }                                                          //
          }                                                            //
        });                                                            //
      });                                                              //
      _origRemove.call(this, search);                                  //
    };                                                                 //
  }                                                                    //
  Meteor.setInterval(function() {                                      //
    Collections.files.remove({                                         //
      'meta.expireAt': {                                               //
        $lte: new Date((+(new Date)) + 120000)                         //
      }                                                                //
    }, _app.NOOP);                                                     //
  }, 120000);                                                          //
  Meteor.publish('latest', function(take, userOnly) {                  //
    var selector;                                                      // 263
    if (take == null) {                                                //
      take = 10;                                                       //
    }                                                                  //
    if (userOnly == null) {                                            //
      userOnly = false;                                                //
    }                                                                  //
    check(take, Number);                                               //
    check(userOnly, Boolean);                                          //
    if (userOnly && this.userId) {                                     //
      selector = {                                                     //
        userId: this.userId                                            //
      };                                                               //
    } else {                                                           //
      selector = {                                                     //
        $or: [                                                         //
          {                                                            //
            'meta.unlisted': false,                                    //
            'meta.secured': false,                                     //
            'meta.blamed': {                                           //
              $lt: 3                                                   //
            }                                                          //
          }, {                                                         //
            userId: this.userId                                        //
          }                                                            //
        ]                                                              //
      };                                                               //
    }                                                                  //
    return Collections.files.find(selector, {                          // 277
      limit: take,                                                     //
      sort: {                                                          //
        'meta.created_at': -1                                          //
      },                                                               //
      fields: {                                                        //
        _id: 1,                                                        //
        name: 1,                                                       //
        size: 1,                                                       //
        meta: 1,                                                       //
        type: 1,                                                       //
        isPDF: 1,                                                      //
        isText: 1,                                                     //
        isJSON: 1,                                                     //
        isVideo: 1,                                                    //
        isAudio: 1,                                                    //
        isImage: 1,                                                    //
        userId: 1,                                                     //
        'versions.thumbnail40.type': 1,                                //
        extension: 1,                                                  //
        _collectionName: 1,                                            //
        _downloadRoute: 1                                              //
      }                                                                //
    }).cursor;                                                         //
  });                                                                  //
  Meteor.publish('file', function(_id) {                               //
    check(_id, String);                                                //
    return Collections.files.find({                                    // 301
      $or: [                                                           //
        {                                                              //
          _id: _id,                                                    //
          'meta.secured': false                                        //
        }, {                                                           //
          _id: _id,                                                    //
          'meta.secured': true,                                        //
          userId: this.userId                                          //
        }                                                              //
      ]                                                                //
    }, {                                                               //
      fields: {                                                        //
        _id: 1,                                                        //
        name: 1,                                                       //
        size: 1,                                                       //
        type: 1,                                                       //
        meta: 1,                                                       //
        isPDF: 1,                                                      //
        isText: 1,                                                     //
        isJSON: 1,                                                     //
        isVideo: 1,                                                    //
        isAudio: 1,                                                    //
        isImage: 1,                                                    //
        extension: 1,                                                  //
        _collectionName: 1,                                            //
        _downloadRoute: 1                                              //
      }                                                                //
    }).cursor;                                                         //
  });                                                                  //
  Meteor.methods({                                                     //
    filesLenght: function(userOnly) {                                  //
      var selector;                                                    // 330
      if (userOnly == null) {                                          //
        userOnly = false;                                              //
      }                                                                //
      check(userOnly, Boolean);                                        //
      if (userOnly && this.userId) {                                   //
        selector = {                                                   //
          userId: this.userId                                          //
        };                                                             //
      } else {                                                         //
        selector = {                                                   //
          $or: [                                                       //
            {                                                          //
              'meta.unlisted': false,                                  //
              'meta.secured': false,                                   //
              'meta.blamed': {                                         //
                $lt: 3                                                 //
              }                                                        //
            }, {                                                       //
              userId: this.userId                                      //
            }                                                          //
          ]                                                            //
        };                                                             //
      }                                                                //
      return Collections.files.find(selector).count();                 // 343
    },                                                                 //
    unblame: function(_id) {                                           //
      check(_id, String);                                              //
      Collections.files.update({                                       //
        _id: _id                                                       //
      }, {                                                             //
        $inc: {                                                        //
          'meta.blamed': -1                                            //
        }                                                              //
      }, _app.NOOP);                                                   //
      return true;                                                     // 348
    },                                                                 //
    blame: function(_id) {                                             //
      check(_id, String);                                              //
      Collections.files.update({                                       //
        _id: _id                                                       //
      }, {                                                             //
        $inc: {                                                        //
          'meta.blamed': 1                                             //
        }                                                              //
      }, _app.NOOP);                                                   //
      return true;                                                     // 353
    },                                                                 //
    changeAccess: function(_id) {                                      //
      var file;                                                        // 356
      check(_id, String);                                              //
      if (Meteor.userId()) {                                           //
        file = Collections.files.findOne({                             //
          _id: _id,                                                    //
          userId: Meteor.userId()                                      //
        });                                                            //
        if (file) {                                                    //
          Collections.files.update(_id, {                              //
            $set: {                                                    //
              'meta.unlisted': file.meta.unlisted ? false : true       //
            }                                                          //
          }, _app.NOOP);                                               //
          return true;                                                 // 361
        }                                                              //
      }                                                                //
      throw new Meteor.Error(401, 'Access denied!');                   // 362
    },                                                                 //
    changePrivacy: function(_id) {                                     //
      var file;                                                        // 365
      check(_id, String);                                              //
      if (Meteor.userId()) {                                           //
        file = Collections.files.findOne({                             //
          _id: _id,                                                    //
          userId: Meteor.userId()                                      //
        });                                                            //
        if (file) {                                                    //
          Collections.files.update(_id, {                              //
            $set: {                                                    //
              'meta.unlisted': true,                                   //
              'meta.secured': file.meta.secured ? false : true         //
            }                                                          //
          }, _app.NOOP);                                               //
          return true;                                                 // 370
        }                                                              //
      }                                                                //
      throw new Meteor.Error(401, 'Access denied!');                   // 371
    }                                                                  //
  });                                                                  //
}                                                                      //
                                                                       //
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceMappingURL=files.collection.coffee.js.map
