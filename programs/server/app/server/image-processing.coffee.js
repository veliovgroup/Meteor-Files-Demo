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
fs = Npm.require('fs-extra');                                          // 2
                                                                       //
_app.createThumbnails = function(collection, fileRef, cb) {            // 4
  var finish, isLast;                                                  // 5
  check(fileRef, Object);                                              //
  isLast = false;                                                      //
  finish = function(error) {                                           //
    return bound(function() {                                          //
      if (error) {                                                     //
        console.error("[_app.createThumbnails] [finish]", error);      //
      } else {                                                         //
        if (isLast) {                                                  //
          cb && cb(fileRef);                                           //
        }                                                              //
      }                                                                //
      return true;                                                     // 14
    });                                                                //
  };                                                                   //
  fs.exists(fileRef.path, function(exists) {                           //
    return bound(function() {                                          //
      var image, sizes;                                                // 17
      if (!exists) {                                                   //
        throw Meteor.log.error("File " + fileRef.path + " not found in [createThumbnails] Method");
      }                                                                //
      image = gm(fileRef.path);                                        //
      sizes = {                                                        //
        preview: {                                                     //
          width: 400                                                   //
        },                                                             //
        thumbnail40: {                                                 //
          width: 40,                                                   //
          square: true                                                 //
        }                                                              //
      };                                                               //
      return image.size(function(error, features) {                    //
        return bound(function() {                                      //
          var i;                                                       // 29
          if (error) {                                                 //
            throw new Meteor.Error("[_app.createThumbnails] [_.each sizes]", error);
          }                                                            //
          i = 0;                                                       //
          collection.collection.update(fileRef._id, {                  //
            $set: {                                                    //
              'meta.width': features.width,                            //
              'meta.height': features.height                           //
            }                                                          //
          }, _app.NOOP);                                               //
          return _.each(sizes, function(size, name) {                  //
            var copyPaste, heightNew, heightRatio, img, path, updateAndSave, widthNew, widthRatio, x, y;
            path = (collection.storagePath(fileRef)) + "/" + name + "-" + fileRef._id + "." + fileRef.extension;
            copyPaste = function() {                                   //
              fs.copy(fileRef.path, path, function(error) {            //
                return bound(function() {                              //
                  var upd;                                             // 43
                  if (error) {                                         //
                    console.error("[_app.createThumbnails] [_.each sizes] [fs.copy]", error);
                  } else {                                             //
                    upd = {                                            //
                      $set: {}                                         //
                    };                                                 //
                    upd['$set']['versions.' + name] = {                //
                      path: path,                                      //
                      size: fileRef.size,                              //
                      type: fileRef.type,                              //
                      extension: fileRef.extension,                    //
                      meta: {                                          //
                        width: features.width,                         //
                        height: features.height                        //
                      }                                                //
                    };                                                 //
                    collection.collection.update(fileRef._id, upd, function(error) {
                      ++i;                                             //
                      if (i === Object.keys(sizes).length) {           //
                        isLast = true;                                 //
                      }                                                //
                      return finish(error);                            //
                    });                                                //
                  }                                                    //
                });                                                    //
              });                                                      //
            };                                                         //
            if (!!~['jpg', 'jpeg', 'png'].indexOf(fileRef.extension.toLowerCase())) {
              img = gm(fileRef.path).define('filter:support=2').define('jpeg:fancy-upsampling=false').define('jpeg:fancy-upsampling=off').define('png:compression-filter=5').define('png:compression-level=9').define('png:compression-strategy=1').define('png:exclude-chunk=all').noProfile().strip().dither(false).filter('Triangle');
              updateAndSave = function(error) {                        //
                return bound(function() {                              //
                  if (error) {                                         //
                    console.error("[_app.createThumbnails] [_.each sizes] [img.resize]", error);
                  } else {                                             //
                    fs.stat(path, function(err, stat) {                //
                      return bound(function() {                        //
                        gm(path).size(function(error, imgInfo) {       //
                          return bound(function() {                    //
                            var upd;                                   // 71
                            if (error) {                               //
                              console.error("[_app.createThumbnails] [_.each sizes] [img.resize] [fs.stat] [gm(path).size]", error);
                            } else {                                   //
                              upd = {                                  //
                                $set: {}                               //
                              };                                       //
                              upd['$set']['versions.' + name] = {      //
                                path: path,                            //
                                size: stat.size,                       //
                                type: fileRef.type,                    //
                                extension: fileRef.extension,          //
                                meta: {                                //
                                  width: imgInfo.width,                //
                                  height: imgInfo.height               //
                                }                                      //
                              };                                       //
                              collection.collection.update(fileRef._id, upd, function(error) {
                                ++i;                                   //
                                if (i === Object.keys(sizes).length) {
                                  isLast = true;                       //
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
              if (!size.square) {                                      //
                if (features.width > size.width) {                     //
                  img.resize(size.width).interlace('Line').write(path, updateAndSave);
                } else {                                               //
                  copyPaste();                                         //
                }                                                      //
              } else {                                                 //
                x = 0;                                                 //
                y = 0;                                                 //
                widthRatio = features.width / size.width;              //
                heightRatio = features.height / size.width;            //
                widthNew = size.width;                                 //
                heightNew = size.width;                                //
                if (heightRatio < widthRatio) {                        //
                  widthNew = (size.width * features.width) / features.height;
                  x = (widthNew - size.width) / 2;                     //
                }                                                      //
                if (heightRatio > widthRatio) {                        //
                  heightNew = (size.width * features.height) / features.width;
                  y = (heightNew - size.width) / 2;                    //
                }                                                      //
                img.resize(widthNew, heightNew).crop(size.width, size.width, x, y).interlace('Line').write(path, updateAndSave);
              }                                                        //
            } else {                                                   //
              copyPaste();                                             //
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
