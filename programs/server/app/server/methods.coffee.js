(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/methods.coffee.js                                            //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var fs;                                                                // 1
                                                                       //
fs = Npm.require('fs');                                                // 1
                                                                       //
Meteor.methods({                                                       // 1
  getTextFile: function(fileRef) {                                     // 4
    var error, text;                                                   // 5
    check(fileRef, Object);                                            // 5
    text = false;                                                      // 5
    if (fileRef.size < 1024 * 64) {                                    // 7
      try {                                                            // 8
        text = fs.readFileSync(fileRef.path, {                         // 9
          encoding: 'utf8'                                             // 9
        });                                                            //
      } catch (_error) {                                               //
        error = _error;                                                // 11
        console.error("[getTextFile] Error happens", error);           // 11
      }                                                                //
    } else {                                                           //
      throw new Meteor.Error(500, 'File too big to show, please download.');
    }                                                                  //
    return text;                                                       // 14
  }                                                                    //
});                                                                    //
                                                                       //
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceMappingURL=methods.coffee.js.map
