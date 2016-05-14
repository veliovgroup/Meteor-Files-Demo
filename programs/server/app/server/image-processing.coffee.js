(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/image-processing.coffee.js                                   //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var bound, fs;                                                         // 1
                                                                       //
bound = Meteor.bindEnvironment(function(callback) {                    // 1
  return callback();                                                   // 1
});                                                                    // 1
                                                                       //
fs = Npm.require('fs-extra');                                          // 1
                                                                       //
_app.createThumbnails = function(collection, fileRef, cb) {            // 1
  var finish, isLast;                                                  // 5
  check(fileRef, Object);                                              // 5
  isLast = false;                                                      // 5
  finish = function(error) {                                           // 5
    return bound(function() {                                          //
      if (error) {                                                     // 9
        console.error("[_app.createThumbnails] [finish]", error);      // 10
      } else {                                                         //
        if (isLast) {                                                  // 12
          cb && cb(fileRef);                                           // 13
        }                                                              //
      }                                                                //
      return true;                                                     // 14
    });                                                                //
  };                                                                   //
  fs.exists(fileRef.path, function(exists) {                           // 5
    return bound(function() {                                          //
      var image, sizes;                                                // 17
      if (!exists) {                                                   // 17
        throw Meteor.log.error("File " + fileRef.path + " not found in [createThumbnails] Method");
      }                                                                //
      image = gm(fileRef.path);                                        // 17
      sizes = {                                                        // 17
        preview: {                                                     // 22
          width: 640                                                   // 23
        },                                                             //
        thumbnail40: {                                                 // 22
          width: 40,                                                   // 25
          square: true                                                 // 25
        }                                                              //
      };                                                               //
      return image.size(function(error, features) {                    //
        return bound(function() {                                      //
          var i;                                                       // 29
          if (error) {                                                 // 29
            throw new Meteor.Error("[_app.createThumbnails] [_.each sizes]", error);
          }                                                            //
          i = 0;                                                       // 29
          collection.collection.update(fileRef._id, {                  // 29
            $set: {                                                    // 32
              'meta.width': features.width,                            // 34
              'meta.height': features.height                           // 34
            }                                                          //
          }, _app.NOOP);                                               //
          return _.each(sizes, function(size, name) {                  //
            var copyPaste, heightNew, heightRatio, img, path, updateAndSave, widthNew, widthRatio, x, y;
            path = collection.storagePath + "/" + name + "-" + fileRef._id + "." + fileRef.extension;
            copyPaste = function() {                                   // 39
              fs.copy(fileRef.path, path, function(error) {            // 42
                return bound(function() {                              //
                  var upd;                                             // 43
                  if (error) {                                         // 43
                    console.error("[_app.createThumbnails] [_.each sizes] [fs.copy]", error);
                  } else {                                             //
                    upd = {                                            // 46
                      $set: {}                                         // 47
                    };                                                 //
                    upd['$set']['versions.' + name] = {                // 46
                      path: path,                                      // 49
                      size: fileRef.size,                              // 49
                      type: fileRef.type,                              // 49
                      extension: fileRef.extension,                    // 49
                      meta: {                                          // 49
                        width: features.width,                         // 54
                        height: features.height                        // 54
                      }                                                //
                    };                                                 //
                    collection.collection.update(fileRef._id, upd, function(error) {
                      ++i;                                             // 57
                      if (i === Object.keys(sizes).length) {           // 58
                        isLast = true;                                 // 58
                      }                                                //
                      return finish(error);                            //
                    });                                                //
                  }                                                    //
                });                                                    //
              });                                                      //
            };                                                         //
            if (!!~['jpg', 'jpeg', 'png'].indexOf(fileRef.extension.toLowerCase())) {
              img = gm(fileRef.path).define('filter:support=2').define('jpeg:fancy-upsampling=false').define('jpeg:fancy-upsampling=off').define('png:compression-filter=5').define('png:compression-level=9').define('png:compression-strategy=1').define('png:exclude-chunk=all').noProfile().strip().dither(false).filter('Triangle');
              updateAndSave = function(error) {                        // 64
                return bound(function() {                              //
                  if (error) {                                         // 66
                    console.error("[_app.createThumbnails] [_.each sizes] [img.resize]", error);
                  } else {                                             //
                    fs.stat(path, function(err, stat) {                // 69
                      return bound(function() {                        //
                        gm(path).size(function(error, imgInfo) {       // 70
                          return bound(function() {                    //
                            var upd;                                   // 71
                            if (error) {                               // 71
                              console.error("[_app.createThumbnails] [_.each sizes] [img.resize] [fs.stat] [gm(path).size]", error);
                            } else {                                   //
                              upd = {                                  // 74
                                $set: {}                               // 74
                              };                                       //
                              upd['$set']['versions.' + name] = {      // 74
                                path: path,                            // 76
                                size: stat.size,                       // 76
                                type: fileRef.type,                    // 76
                                extension: fileRef.extension,          // 76
                                meta: {                                // 76
                                  width: imgInfo.width,                // 81
                                  height: imgInfo.height               // 81
                                }                                      //
                              };                                       //
                              collection.collection.update(fileRef._id, upd, function(error) {
                                ++i;                                   // 84
                                if (i === Object.keys(sizes).length) {
                                  isLast = true;                       // 85
                                }                                      //
                                return finish(error);                  //
                              });                                      //
                            }                                          //
                          });                                          //
                        });                                            //
                      });                                              //
                    });                                                //
                  }                                                    //
                });                                                    //
              };                                                       //
              if (!size.square) {                                      // 91
                if (features.width > size.width) {                     // 92
                  img.resize(size.width).interlace('Line').write(path, updateAndSave);
                } else {                                               //
                  copyPaste();                                         // 95
                }                                                      //
              } else {                                                 //
                x = 0;                                                 // 97
                y = 0;                                                 // 97
                widthRatio = features.width / size.width;              // 97
                heightRatio = features.height / size.width;            // 97
                widthNew = size.width;                                 // 97
                heightNew = size.width;                                // 97
                if (heightRatio < widthRatio) {                        // 105
                  widthNew = (size.width * features.width) / features.height;
                  x = (widthNew - size.width) / 2;                     // 106
                }                                                      //
                if (heightRatio > widthRatio) {                        // 109
                  heightNew = (size.width * features.height) / features.width;
                  y = (heightNew - size.width) / 2;                    // 110
                }                                                      //
                img.resize(widthNew, heightNew).crop(size.width, size.width, x, y).interlace('Line').write(path, updateAndSave);
              }                                                        //
            } else {                                                   //
              copyPaste();                                             // 115
            }                                                          //
          });                                                          //
        });                                                            //
      });                                                              //
    });                                                                //
  });                                                                  //
  return true;                                                         // 117
};                                                                     // 4
                                                                       //
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceMappingURL=image-processing.coffee.js.map
