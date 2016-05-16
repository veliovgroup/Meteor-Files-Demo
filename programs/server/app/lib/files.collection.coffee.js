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
    if (this.file.size <= 1024 * 1024 * 128) {                         // 26
      return true;                                                     //
    } else {                                                           //
      return "Max. file size is 128MB you've tried to upload " + (filesize(this.file.size));
    }                                                                  //
  },                                                                   //
  downloadCallback: function(fileObj) {                                // 20
    var ref2;                                                          // 28
    if (((ref2 = this.params) != null ? ref2.query.download : void 0) === 'true') {
      Collections.files.collection.update(fileObj._id, {               // 29
        $inc: {                                                        // 29
          'meta.downloads': 1                                          // 29
        }                                                              //
      });                                                              //
    }                                                                  //
    return true;                                                       // 30
  },                                                                   //
  interceptDownload: function(http, fileRef, version) {                // 20
    var path, ref2, ref3, ref4;                                        // 32
    if (useDropBox) {                                                  // 32
      path = fileRef != null ? (ref2 = fileRef.versions) != null ? (ref3 = ref2[version]) != null ? (ref4 = ref3.meta) != null ? ref4.pipeFrom : void 0 : void 0 : void 0 : void 0;
      if (path) {                                                      // 34
        http.response.writeHead(302, {                                 // 37
          'Location': path                                             // 37
        });                                                            //
        http.response.end();                                           // 37
        return true;                                                   // 39
      } else {                                                         //
        return false;                                                  // 43
      }                                                                //
    } else {                                                           //
      return false;                                                    // 45
    }                                                                  //
  }                                                                    //
});                                                                    //
                                                                       //
if (Meteor.isServer) {                                                 // 47
  Collections.files.denyClient();                                      // 48
  Collections.files.collection.attachSchema(Collections.files.schema);
  Collections.files.on('afterUpload', function(fileRef) {              // 48
    var makeUrl, readFile, sendToDB, writeToDB;                        // 52
    if (useDropBox) {                                                  // 52
      makeUrl = function(stat, fileRef, version, triesUrl) {           // 53
        if (triesUrl == null) {                                        //
          triesUrl = 0;                                                //
        }                                                              //
        client.makeUrl(stat.path, {                                    // 54
          long: true,                                                  // 54
          downloadHack: true                                           // 54
        }, function(error, xml) {                                      //
          return bound(function() {                                    //
            var upd;                                                   // 56
            if (error) {                                               // 56
              if (triesUrl < 10) {                                     // 57
                Meteor.setTimeout(function() {                         // 58
                  return makeUrl(stat, fileRef, version, ++triesUrl);  //
                }, 2048);                                              //
              } else {                                                 //
                console.error(error, {                                 // 62
                  triesUrl: triesUrl                                   // 62
                });                                                    //
              }                                                        //
            } else if (xml) {                                          //
              upd = {                                                  // 64
                $set: {}                                               // 64
              };                                                       //
              upd['$set']["versions." + version + ".meta.pipeFrom"] = xml.url;
              upd['$set']["versions." + version + ".meta.pipePath"] = stat.path;
              Collections.files.collection.update({                    // 64
                _id: fileRef._id                                       // 67
              }, upd, function(error) {                                //
                if (error) {                                           // 68
                  console.error(error);                                // 69
                } else {                                               //
                  Collections.files.unlink(Collections.files.collection.findOne(fileRef._id), version);
                }                                                      //
              });                                                      //
            } else {                                                   //
              if (triesUrl < 10) {                                     // 74
                Meteor.setTimeout(function() {                         // 75
                  return makeUrl(stat, fileRef, version, ++triesUrl);  //
                }, 2048);                                              //
              } else {                                                 //
                console.error("client.makeUrl doesn't returns xml", {  // 79
                  triesUrl: triesUrl                                   // 79
                });                                                    //
              }                                                        //
            }                                                          //
          });                                                          //
        });                                                            //
      };                                                               //
      writeToDB = function(fileRef, version, data, triesSend) {        // 53
        if (triesSend == null) {                                       //
          triesSend = 0;                                               //
        }                                                              //
        client.writeFile(fileRef._id + "-" + version + "." + fileRef.extension, data, function(error, stat) {
          return bound(function() {                                    //
            if (error) {                                               // 85
              if (triesSend < 10) {                                    // 86
                Meteor.setTimeout(function() {                         // 87
                  return writeToDB(fileRef, version, data, ++triesSend);
                }, 2048);                                              //
              } else {                                                 //
                console.error(error, {                                 // 91
                  triesSend: triesSend                                 // 91
                });                                                    //
              }                                                        //
            } else {                                                   //
              makeUrl(stat, fileRef, version);                         // 94
            }                                                          //
          });                                                          //
        });                                                            //
      };                                                               //
      readFile = function(fileRef, vRef, version, triesRead) {         // 53
        if (triesRead == null) {                                       //
          triesRead = 0;                                               //
        }                                                              //
        fs.readFile(vRef.path, function(error, data) {                 // 99
          return bound(function() {                                    //
            if (error) {                                               // 100
              if (triesRead < 10) {                                    // 101
                readFile(fileRef, vRef, version, ++triesRead);         // 102
              } else {                                                 //
                console.error(error);                                  // 104
              }                                                        //
            } else {                                                   //
              writeToDB(fileRef, version, data);                       // 107
            }                                                          //
          });                                                          //
        });                                                            //
      };                                                               //
      sendToDB = function(fileRef) {                                   // 53
        _.each(fileRef.versions, function(vRef, version) {             // 112
          readFile(fileRef, vRef, version);                            // 113
        });                                                            //
      };                                                               //
    }                                                                  //
    if (!!~fileRef.type.indexOf('image')) {                            // 117
      _app.createThumbnails(Collections.files, fileRef, function(fileRef) {
        if (useDropBox) {                                              // 119
          sendToDB(Collections.files.collection.findOne(fileRef._id));
        }                                                              //
      });                                                              //
    } else {                                                           //
      if (useDropBox) {                                                // 123
        sendToDB(fileRef);                                             // 124
      }                                                                //
    }                                                                  //
  });                                                                  //
  if (useDropBox) {                                                    // 131
    _origRemove = Collections.files.remove;                            // 134
    Collections.files.remove = function(search) {                      // 134
      var cursor;                                                      // 136
      cursor = this.collection.find(search);                           // 136
      cursor.forEach(function(fileRef) {                               // 136
        var ref2;                                                      // 138
        if (fileRef != null ? (ref2 = fileRef.meta) != null ? ref2.pipePath : void 0 : void 0) {
          return client.remove(fileRef.meta.pipePath, function(error) {
            if (error) {                                               // 140
              console.error(error);                                    // 141
            }                                                          //
          });                                                          //
        }                                                              //
      });                                                              //
      return _origRemove.call(this, search);                           //
    };                                                                 //
  }                                                                    //
  Meteor.setInterval(function() {                                      // 48
    return Collections.files.remove({                                  //
      'meta.expireAt': {                                               // 153
        $lte: new Date((+(new Date)) + 120000)                         // 153
      }                                                                //
    }, _app.NOOP);                                                     //
  }, 120000);                                                          //
  Meteor.publish('latest', function(take) {                            // 48
    if (take == null) {                                                //
      take = 50;                                                       //
    }                                                                  //
    check(take, Number);                                               // 158
    return Collections.files.collection.find({}, {                     //
      limit: take,                                                     // 161
      sort: {                                                          // 161
        'meta.created_at': -1                                          // 162
      },                                                               //
      fields: {                                                        // 161
        _id: 1,                                                        // 164
        name: 1,                                                       // 164
        size: 1,                                                       // 164
        meta: 1,                                                       // 164
        isText: 1,                                                     // 164
        isJSON: 1,                                                     // 164
        isVideo: 1,                                                    // 164
        isAudio: 1,                                                    // 164
        isImage: 1,                                                    // 164
        extension: 1,                                                  // 164
        _collectionName: 1,                                            // 164
        _downloadRoute: 1                                              // 164
      }                                                                //
    });                                                                //
  });                                                                  //
  Meteor.publish('file', function(_id) {                               // 48
    check(_id, String);                                                // 178
    return Collections.files.collection.find(_id);                     //
  });                                                                  //
  Meteor.methods({                                                     // 48
    'filesLenght': function() {                                        // 182
      return Collections.files.collection.find({}).count();            //
    }                                                                  //
  });                                                                  //
}                                                                      //
                                                                       //
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceMappingURL=files.collection.coffee.js.map
