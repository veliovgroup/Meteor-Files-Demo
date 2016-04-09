(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// lib/files.collection.coffee.js                                      //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Collections.files = new Meteor.Files({                                 // 1
  debug: false,                                                        // 2
  throttle: false,                                                     // 2
  chunkSize: 1024 * 1024,                                              // 2
  storagePath: 'assets/app/uploads/uploadedFiles',                     // 2
  collectionName: 'uploadedFiles',                                     // 2
  allowClientCode: false,                                              // 2
  onBeforeUpload: function() {                                         // 2
    if (this.file.size <= 1024 * 1024 * 128) {                         // 8
      return true;                                                     //
    } else {                                                           //
      return "Max. file size is 128MB you've tried to upload " + (filesize(this.file.size));
    }                                                                  //
  },                                                                   //
  downloadCallback: function(fileObj) {                                // 2
    var ref;                                                           // 10
    if (((ref = this.params) != null ? ref.query.download : void 0) === 'true') {
      Collections.files.collection.update(fileObj._id, {               // 11
        $inc: {                                                        // 11
          'meta.downloads': 1                                          // 11
        }                                                              //
      });                                                              //
    }                                                                  //
    return true;                                                       // 12
  }                                                                    //
});                                                                    //
                                                                       //
if (Meteor.isServer) {                                                 // 14
  Collections.files.collection.deny({                                  // 15
    insert: function() {                                               // 16
      return true;                                                     //
    },                                                                 //
    update: function() {                                               // 16
      return true;                                                     //
    },                                                                 //
    remove: function() {                                               // 16
      return true;                                                     //
    }                                                                  //
  });                                                                  //
  Collections.files.collection._ensureIndex({                          // 15
    'meta.expireAt': 1                                                 // 20
  }, {                                                                 //
    expireAfterSeconds: 0,                                             // 20
    background: true                                                   // 20
  });                                                                  //
  Meteor.setInterval(function() {                                      // 15
    return Collections.files.remove({                                  //
      'meta.expireAt': {                                               // 29
        $lte: new Date((+(new Date)) + 120000)                         // 29
      }                                                                //
    });                                                                //
  }, 120000);                                                          //
  Meteor.publish('latest', function(take) {                            // 15
    if (take == null) {                                                //
      take = 50;                                                       //
    }                                                                  //
    check(take, Number);                                               // 34
    return Collections.files.collection.find({}, {                     //
      limit: take,                                                     // 37
      sort: {                                                          // 37
        'meta.created_at': -1                                          // 38
      },                                                               //
      fields: {                                                        // 37
        _id: 1,                                                        // 40
        name: 1,                                                       // 40
        size: 1,                                                       // 40
        meta: 1,                                                       // 40
        isVideo: 1,                                                    // 40
        isAudio: 1,                                                    // 40
        isImage: 1                                                     // 40
      }                                                                //
    });                                                                //
  });                                                                  //
  Meteor.publish('file', function(_id) {                               // 15
    check(_id, String);                                                // 49
    return Collections.files.collection.find(_id);                     //
  });                                                                  //
  Meteor.methods({                                                     // 15
    'filesLenght': function() {                                        // 53
      return Collections.files.collection.find({}).count();            //
    }                                                                  //
  });                                                                  //
}                                                                      //
                                                                       //
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceMappingURL=files.collection.coffee.js.map
