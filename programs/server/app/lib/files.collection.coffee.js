(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// lib/files.collection.coffee.js                                      //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Collections.files = new FilesCollection({                              // 13
  debug: false,                                                        // 14
  throttle: false,                                                     // 14
  chunkSize: 1024 * 1024,                                              // 14
  storagePath: 'assets/app/uploads/uploadedFiles',                     // 14
  collectionName: 'uploadedFiles',                                     // 14
  allowClientCode: false,                                              // 14
  onBeforeUpload: function() {                                         // 14
    if (this.file.size <= 1024 * 1024 * 128) {                         // 20
      return true;                                                     //
    } else {                                                           //
      return "Max. file size is 128MB you've tried to upload " + (filesize(this.file.size));
    }                                                                  //
  },                                                                   //
  downloadCallback: function(fileObj) {                                // 14
    var ref;                                                           // 22
    if (((ref = this.params) != null ? ref.query.download : void 0) === 'true') {
      Collections.files.collection.update(fileObj._id, {               // 23
        $inc: {                                                        // 23
          'meta.downloads': 1                                          // 23
        }                                                              //
      });                                                              //
    }                                                                  //
    return true;                                                       // 24
  }                                                                    //
});                                                                    //
                                                                       //
if (Meteor.isServer) {                                                 // 59
  Collections.files.denyClient();                                      // 60
  Collections.files.collection.attachSchema(Collections.files.schema);
  Collections.files.collection._ensureIndex({                          // 60
    'meta.expireAt': 1                                                 // 62
  }, {                                                                 //
    expireAfterSeconds: 0,                                             // 62
    background: true                                                   // 62
  });                                                                  //
  Meteor.setInterval(function() {                                      // 60
    return Collections.files.remove({                                  //
      'meta.expireAt': {                                               // 85
        $lte: new Date((+(new Date)) + 120000)                         // 85
      }                                                                //
    });                                                                //
  }, 120000);                                                          //
  Meteor.publish('latest', function(take) {                            // 60
    if (take == null) {                                                //
      take = 50;                                                       //
    }                                                                  //
    check(take, Number);                                               // 90
    return Collections.files.collection.find({}, {                     //
      limit: take,                                                     // 93
      sort: {                                                          // 93
        'meta.created_at': -1                                          // 94
      },                                                               //
      fields: {                                                        // 93
        _id: 1,                                                        // 96
        name: 1,                                                       // 96
        size: 1,                                                       // 96
        meta: 1,                                                       // 96
        isVideo: 1,                                                    // 96
        isAudio: 1,                                                    // 96
        isImage: 1,                                                    // 96
        isText: 1,                                                     // 96
        extension: 1                                                   // 96
      }                                                                //
    });                                                                //
  });                                                                  //
  Meteor.publish('file', function(_id) {                               // 60
    check(_id, String);                                                // 107
    return Collections.files.collection.find(_id);                     //
  });                                                                  //
  Meteor.methods({                                                     // 60
    'filesLenght': function() {                                        // 111
      return Collections.files.collection.find({}).count();            //
    }                                                                  //
  });                                                                  //
}                                                                      //
                                                                       //
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceMappingURL=files.collection.coffee.js.map
