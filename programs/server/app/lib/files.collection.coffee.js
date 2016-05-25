(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// lib/files.collection.coffee.js                                      //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var Dropbox, _origRemove, bound, client, fs, ref, ref1, useDropBox;    // 3
                                                                       //
useDropBox = false;                                                    // 3
                                                                       //
if (Meteor.isServer) {                                                 // 4
  if ((ref = process.env) != null ? ref.DROPBOX : void 0) {            // 5
    Meteor.settings.dropbox = (ref1 = JSON.parse(process.env.DROPBOX)) != null ? ref1.dropbox : void 0;
  }                                                                    //
  if (Meteor.settings.dropbox && Meteor.settings.dropbox.key && Meteor.settings.dropbox.secret && Meteor.settings.dropbox.token) {
    useDropBox = true;                                                 // 9
    Dropbox = Npm.require('dropbox');                                  // 9
    fs = Npm.require('fs');                                            // 9
    bound = Meteor.bindEnvironment(function(callback) {                // 9
      return callback();                                               // 12
    });                                                                //
    client = new Dropbox.Client({                                      // 9
      key: Meteor.settings.dropbox.key,                                // 13
      secret: Meteor.settings.dropbox.secret,                          // 13
      token: Meteor.settings.dropbox.token                             // 13
    });                                                                //
  }                                                                    //
}                                                                      //
                                                                       //
Collections.files = new FilesCollection({                              // 3
  debug: false,                                                        // 20
  throttle: false,                                                     // 20
  chunkSize: 1024 * 1024,                                              // 20
  storagePath: 'assets/app/uploads/uploadedFiles',                     // 20
  collectionName: 'uploadedFiles',                                     // 20
  allowClientCode: false,                                              // 20
  onBeforeUpload: function() {                                         // 20
    if (this.file.size <= 1024 * 1024 * 128) {                         // 27
      return true;                                                     //
    } else {                                                           //
      return "Max. file size is 128MB you've tried to upload " + (filesize(this.file.size));
    }                                                                  //
  },                                                                   //
  downloadCallback: function(fileObj) {                                // 20
    var ref2;                                                          // 29
    if (((ref2 = this.params) != null ? ref2.query.download : void 0) === 'true') {
      Collections.files.collection.update(fileObj._id, {               // 30
        $inc: {                                                        // 30
          'meta.downloads': 1                                          // 30
        }                                                              //
      });                                                              //
    }                                                                  //
    return true;                                                       // 31
  },                                                                   //
  interceptDownload: function(http, fileRef, version) {                // 20
    var path, ref2, ref3, ref4;                                        // 33
    if (useDropBox) {                                                  // 33
      path = fileRef != null ? (ref2 = fileRef.versions) != null ? (ref3 = ref2[version]) != null ? (ref4 = ref3.meta) != null ? ref4.pipeFrom : void 0 : void 0 : void 0 : void 0;
      if (path) {                                                      // 35
        http.response.writeHead(302, {                                 // 38
          'Location': path                                             // 38
        });                                                            //
        http.response.end();                                           // 38
        return true;                                                   // 40
      } else {                                                         //
        return false;                                                  // 44
      }                                                                //
    } else {                                                           //
      return false;                                                    // 46
    }                                                                  //
  }                                                                    //
});                                                                    //
                                                                       //
if (Meteor.isServer) {                                                 // 48
  Collections.files.denyClient();                                      // 49
  Collections.files.collection.attachSchema(Collections.files.schema);
  Collections.files.on('afterUpload', function(fileRef) {              // 49
    var makeUrl, readFile, sendToDB, writeToDB;                        // 53
    if (useDropBox) {                                                  // 53
      makeUrl = function(stat, fileRef, version, triesUrl) {           // 54
        if (triesUrl == null) {                                        //
          triesUrl = 0;                                                //
        }                                                              //
        client.makeUrl(stat.path, {                                    // 55
          long: true,                                                  // 55
          downloadHack: true                                           // 55
        }, function(error, xml) {                                      //
          return bound(function() {                                    //
            var upd;                                                   // 57
            if (error) {                                               // 57
              if (triesUrl < 10) {                                     // 58
                Meteor.setTimeout(function() {                         // 59
                  return makeUrl(stat, fileRef, version, ++triesUrl);  //
                }, 2048);                                              //
              } else {                                                 //
                console.error(error, {                                 // 63
                  triesUrl: triesUrl                                   // 63
                });                                                    //
              }                                                        //
            } else if (xml) {                                          //
              upd = {                                                  // 65
                $set: {}                                               // 65
              };                                                       //
              upd['$set']["versions." + version + ".meta.pipeFrom"] = xml.url;
              upd['$set']["versions." + version + ".meta.pipePath"] = stat.path;
              Collections.files.collection.update({                    // 65
                _id: fileRef._id                                       // 68
              }, upd, function(error) {                                //
                if (error) {                                           // 69
                  console.error(error);                                // 70
                } else {                                               //
                  Collections.files.unlink(Collections.files.collection.findOne(fileRef._id), version);
                }                                                      //
              });                                                      //
            } else {                                                   //
              if (triesUrl < 10) {                                     // 75
                Meteor.setTimeout(function() {                         // 76
                  return makeUrl(stat, fileRef, version, ++triesUrl);  //
                }, 2048);                                              //
              } else {                                                 //
                console.error("client.makeUrl doesn't returns xml", {  // 80
                  triesUrl: triesUrl                                   // 80
                });                                                    //
              }                                                        //
            }                                                          //
          });                                                          //
        });                                                            //
      };                                                               //
      writeToDB = function(fileRef, version, data, triesSend) {        // 54
        if (triesSend == null) {                                       //
          triesSend = 0;                                               //
        }                                                              //
        client.writeFile(fileRef._id + "-" + version + "." + fileRef.extension, data, function(error, stat) {
          return bound(function() {                                    //
            if (error) {                                               // 86
              if (triesSend < 10) {                                    // 87
                Meteor.setTimeout(function() {                         // 88
                  return writeToDB(fileRef, version, data, ++triesSend);
                }, 2048);                                              //
              } else {                                                 //
                console.error(error, {                                 // 92
                  triesSend: triesSend                                 // 92
                });                                                    //
              }                                                        //
            } else {                                                   //
              makeUrl(stat, fileRef, version);                         // 95
            }                                                          //
          });                                                          //
        });                                                            //
      };                                                               //
      readFile = function(fileRef, vRef, version, triesRead) {         // 54
        if (triesRead == null) {                                       //
          triesRead = 0;                                               //
        }                                                              //
        fs.readFile(vRef.path, function(error, data) {                 // 100
          return bound(function() {                                    //
            if (error) {                                               // 101
              if (triesRead < 10) {                                    // 102
                readFile(fileRef, vRef, version, ++triesRead);         // 103
              } else {                                                 //
                console.error(error);                                  // 105
              }                                                        //
            } else {                                                   //
              writeToDB(fileRef, version, data);                       // 108
            }                                                          //
          });                                                          //
        });                                                            //
      };                                                               //
      sendToDB = function(fileRef) {                                   // 54
        _.each(fileRef.versions, function(vRef, version) {             // 113
          readFile(fileRef, vRef, version);                            // 114
        });                                                            //
      };                                                               //
    }                                                                  //
    if (!!~fileRef.type.indexOf('image')) {                            // 118
      _app.createThumbnails(Collections.files, fileRef, function(fileRef) {
        if (useDropBox) {                                              // 120
          sendToDB(Collections.files.collection.findOne(fileRef._id));
        }                                                              //
      });                                                              //
    } else {                                                           //
      if (useDropBox) {                                                // 124
        sendToDB(fileRef);                                             // 125
      }                                                                //
    }                                                                  //
  });                                                                  //
  if (useDropBox) {                                                    // 132
    _origRemove = Collections.files.remove;                            // 135
    Collections.files.remove = function(search) {                      // 135
      var cursor;                                                      // 137
      cursor = this.collection.find(search);                           // 137
      cursor.forEach(function(fileRef) {                               // 137
        var ref2;                                                      // 139
        if (fileRef != null ? (ref2 = fileRef.meta) != null ? ref2.pipePath : void 0 : void 0) {
          return client.remove(fileRef.meta.pipePath, function(error) {
            if (error) {                                               // 141
              console.error(error);                                    // 142
            }                                                          //
          });                                                          //
        }                                                              //
      });                                                              //
      return _origRemove.call(this, search);                           //
    };                                                                 //
  }                                                                    //
  Meteor.setInterval(function() {                                      // 49
    Collections.files.remove({                                         // 154
      'meta.expireAt': {                                               // 154
        $lte: new Date((+(new Date)) + 120000)                         // 154
      }                                                                //
    }, _app.NOOP);                                                     //
  }, 120000);                                                          //
  Meteor.publish('latest', function(take) {                            // 49
    if (take == null) {                                                //
      take = 50;                                                       //
    }                                                                  //
    check(take, Number);                                               // 160
    return Collections.files.collection.find({                         // 161
      $or: [                                                           // 161
        {                                                              //
          'meta.blamed': {                                             // 163
            $lt: 3                                                     // 163
          }                                                            //
        }, {                                                           //
          'meta.blamed': {                                             // 164
            $exists: false                                             // 164
          }                                                            //
        }                                                              //
      ]                                                                //
    }, {                                                               //
      limit: take,                                                     // 166
      sort: {                                                          // 166
        'meta.created_at': -1                                          // 168
      },                                                               //
      fields: {                                                        // 166
        _id: 1,                                                        // 170
        name: 1,                                                       // 170
        size: 1,                                                       // 170
        meta: 1,                                                       // 170
        isText: 1,                                                     // 170
        isJSON: 1,                                                     // 170
        isVideo: 1,                                                    // 170
        isAudio: 1,                                                    // 170
        isImage: 1,                                                    // 170
        'versions.thumbnail40.path': 1,                                // 170
        extension: 1,                                                  // 170
        _collectionName: 1,                                            // 170
        _downloadRoute: 1                                              // 170
      }                                                                //
    });                                                                //
  });                                                                  //
  Meteor.publish('file', function(_id) {                               // 49
    check(_id, String);                                                // 186
    return Collections.files.collection.find(_id);                     // 187
  });                                                                  //
  Meteor.methods({                                                     // 49
    'filesLenght': function() {                                        // 190
      return Collections.files.collection.find({                       // 191
        $or: [                                                         // 191
          {                                                            //
            'meta.blamed': {                                           // 193
              $lt: 3                                                   // 193
            }                                                          //
          }, {                                                         //
            'meta.blamed': {                                           // 194
              $exists: false                                           // 194
            }                                                          //
          }                                                            //
        ]                                                              //
      }).count();                                                      //
    },                                                                 //
    'blame': function(_id) {                                           // 190
      check(_id, String);                                              // 199
      Collections.files.collection.update({                            // 199
        _id: _id                                                       // 200
      }, {                                                             //
        $inc: {                                                        // 200
          'meta.blamed': 1                                             // 200
        }                                                              //
      }, _app.NOOP);                                                   //
      return true;                                                     // 201
    }                                                                  //
  });                                                                  //
}                                                                      //
                                                                       //
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceMappingURL=files.collection.coffee.js.map
