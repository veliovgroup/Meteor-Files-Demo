(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// lib/files.collection.coffee.js                                      //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Collections.files = new Meteor.Files({                                 // 13
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
  Collections.files.collection.deny({                                  // 60
    insert: function() {                                               // 61
      return true;                                                     //
    },                                                                 //
    update: function() {                                               // 61
      return true;                                                     //
    },                                                                 //
    remove: function() {                                               // 61
      return true;                                                     //
    }                                                                  //
  });                                                                  //
  Collections.files.collection._ensureIndex({                          // 60
    'meta.expireAt': 1                                                 // 65
  }, {                                                                 //
    expireAfterSeconds: 0,                                             // 65
    background: true                                                   // 65
  });                                                                  //
  Meteor.setInterval(function() {                                      // 60
    return Collections.files.remove({                                  //
      'meta.expireAt': {                                               // 88
        $lte: new Date((+(new Date)) + 120000)                         // 88
      }                                                                //
    });                                                                //
  }, 120000);                                                          //
  Meteor.publish('latest', function(take) {                            // 60
    if (take == null) {                                                //
      take = 50;                                                       //
    }                                                                  //
    check(take, Number);                                               // 93
    return Collections.files.collection.find({}, {                     //
      limit: take,                                                     // 96
      sort: {                                                          // 96
        'meta.created_at': -1                                          // 97
      },                                                               //
      fields: {                                                        // 96
        _id: 1,                                                        // 99
        name: 1,                                                       // 99
        size: 1,                                                       // 99
        meta: 1,                                                       // 99
        isVideo: 1,                                                    // 99
        isAudio: 1,                                                    // 99
        isImage: 1                                                     // 99
      }                                                                //
    });                                                                //
  });                                                                  //
  Meteor.publish('file', function(_id) {                               // 60
    check(_id, String);                                                // 108
    return Collections.files.collection.find(_id);                     //
  });                                                                  //
  Meteor.methods({                                                     // 60
    'filesLenght': function() {                                        // 112
      return Collections.files.collection.find({}).count();            //
    }                                                                  //
  });                                                                  //
}                                                                      //
                                                                       //
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceMappingURL=files.collection.coffee.js.map
