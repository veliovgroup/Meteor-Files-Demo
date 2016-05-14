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
    var sendToDB;                                                      // 52
    if (useDropBox) {                                                  // 52
      sendToDB = function(fileRef) {                                   // 53
        _.each(fileRef.versions, function(vRef, version) {             // 54
          fs.readFile(vRef.path, function(error, data) {               // 55
            return bound(function() {                                  //
              if (error) {                                             // 56
                console.error(error);                                  // 57
              } else {                                                 //
                client.writeFile(fileRef._id + "-" + version + "." + fileRef.extension, data, function(error, stat) {
                  return bound(function() {                            //
                    if (error) {                                       // 61
                      console.error(error);                            // 62
                    } else {                                           //
                      client.makeUrl(stat.path, {                      // 65
                        long: true,                                    // 65
                        downloadHack: true                             // 65
                      }, function(error, xml) {                        //
                        return bound(function() {                      //
                          var upd;                                     // 67
                          upd = {                                      // 67
                            $set: {}                                   // 67
                          };                                           //
                          upd['$set']["versions." + version + ".meta.pipeFrom"] = xml.url;
                          upd['$set']["versions." + version + ".meta.pipePath"] = stat.path;
                          Collections.files.collection.update({        // 67
                            _id: fileRef._id                           // 70
                          }, upd, function(error) {                    //
                            if (error) {                               // 71
                              console.error(error);                    // 72
                            }                                          //
                          });                                          //
                        });                                            //
                      });                                              //
                    }                                                  //
                  });                                                  //
                });                                                    //
              }                                                        //
            });                                                        //
          });                                                          //
        });                                                            //
        Collections.files.unlink(fileRef);                             // 54
      };                                                               //
    }                                                                  //
    return Meteor.setTimeout(function() {                              //
      if (!!~fileRef.type.indexOf('image')) {                          // 82
        _app.createThumbnails(Collections.files, fileRef, function(fileRef) {
          if (useDropBox) {                                            // 84
            sendToDB(Collections.files.collection.findOne(fileRef._id));
          }                                                            //
        });                                                            //
      } else {                                                         //
        if (useDropBox) {                                              // 88
          sendToDB(fileRef);                                           // 89
        }                                                              //
      }                                                                //
    }, 1024);                                                          //
  });                                                                  //
  if (useDropBox) {                                                    // 97
    _origRemove = Collections.files.remove;                            // 100
    Collections.files.remove = function(search) {                      // 100
      var cursor;                                                      // 102
      cursor = this.collection.find(search);                           // 102
      cursor.forEach(function(fileRef) {                               // 102
        var ref2;                                                      // 104
        if (fileRef != null ? (ref2 = fileRef.meta) != null ? ref2.pipePath : void 0 : void 0) {
          return client.remove(fileRef.meta.pipePath, function(error) {
            if (error) {                                               // 106
              console.error(error);                                    // 107
            }                                                          //
          });                                                          //
        }                                                              //
      });                                                              //
      return _origRemove.call(this, search);                           //
    };                                                                 //
  }                                                                    //
  Meteor.setInterval(function() {                                      // 48
    return Collections.files.remove({                                  //
      'meta.expireAt': {                                               // 119
        $lte: new Date((+(new Date)) + 120000)                         // 119
      }                                                                //
    }, _app.NOOP);                                                     //
  }, 120000);                                                          //
  Meteor.publish('latest', function(take) {                            // 48
    if (take == null) {                                                //
      take = 50;                                                       //
    }                                                                  //
    check(take, Number);                                               // 124
    return Collections.files.collection.find({}, {                     //
      limit: take,                                                     // 127
      sort: {                                                          // 127
        'meta.created_at': -1                                          // 128
      },                                                               //
      fields: {                                                        // 127
        _id: 1,                                                        // 130
        name: 1,                                                       // 130
        size: 1,                                                       // 130
        meta: 1,                                                       // 130
        isText: 1,                                                     // 130
        isJSON: 1,                                                     // 130
        isVideo: 1,                                                    // 130
        isAudio: 1,                                                    // 130
        isImage: 1,                                                    // 130
        extension: 1,                                                  // 130
        _collectionName: 1,                                            // 130
        _downloadRoute: 1                                              // 130
      }                                                                //
    });                                                                //
  });                                                                  //
  Meteor.publish('file', function(_id) {                               // 48
    check(_id, String);                                                // 144
    return Collections.files.collection.find(_id);                     //
  });                                                                  //
  Meteor.methods({                                                     // 48
    'filesLenght': function() {                                        // 148
      return Collections.files.collection.find({}).count();            //
    }                                                                  //
  });                                                                  //
}                                                                      //
                                                                       //
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceMappingURL=files.collection.coffee.js.map
