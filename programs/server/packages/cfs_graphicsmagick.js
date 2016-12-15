(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;

/* Package-scope variables */
var gm;

(function(){

//////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                              //
// packages/cfs_graphicsmagick/packages/cfs_graphicsmagick.js                                   //
//                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                //
(function () {

////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                        //
// packages/cfs:graphicsmagick/gm.js                                                      //
//                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////
                                                                                          //
var nodegm = Npm.require('gm');                                                           // 1
var path = Npm.require('path');                                                           // 2
var fs = Npm.require('fs');                                                               // 3
                                                                                          // 4
gm = function() {                                                                         // 5
  throw new Error('cfs:graphicsmagick could not find "graphicsMagick" or "imageMagick"'); // 6
};                                                                                        // 7
                                                                                          // 8
var graphicsmagick = false;                                                               // 9
var imagemagick = false;                                                                  // 10
                                                                                          // 11
// Split the path by : or ;                                                               // 12
// XXX: windows is not tested                                                             // 13
var binaryPaths = process.env['PATH'].split(/:|;/);                                       // 14
                                                                                          // 15
// XXX: we should properly check if we can access the os temp folder - since              // 16
// gm binaries are using this and therefore may fail?                                     // 17
                                                                                          // 18
// XXX: we could push extra paths if the `gm` library check stuff like:                   // 19
// $MAGIC_HOME The current version does not check there                                   // 20
// $MAGICK_HOME (GraphicsMagick docs)                                                     // 21
                                                                                          // 22
// We check to see if we can find binaries                                                // 23
for (var i = 0; i < binaryPaths.length; i++) {                                            // 24
  var binPath = binaryPaths[i];                                                           // 25
                                                                                          // 26
  // If we have not found GraphicsMagic                                                   // 27
  if (!graphicsmagick) {                                                                  // 28
    // Init                                                                               // 29
    var gmPath = path.join(binPath, 'gm');                                                // 30
    var gmExePath = path.join(binPath, 'gm.exe');                                         // 31
                                                                                          // 32
    // Check to see if binary found                                                       // 33
    graphicsmagick = fs.existsSync(gmPath) || fs.existsSync(gmExePath);                   // 34
                                                                                          // 35
    // If GraphicsMagic we dont have to check for ImageMagic                              // 36
    // Since we prefer GrapicsMagic when selecting api                                    // 37
    if (!graphicsmagick && !imagemagick) {                                                // 38
      // Init paths to check                                                              // 39
      var imPath = path.join(binPath, 'convert');                                         // 40
      var imExePath = path.join(binPath, 'convert.exe');                                  // 41
                                                                                          // 42
      // Check to see if binary found                                                     // 43
      imagemagick = fs.existsSync(imPath) || fs.existsSync(imExePath);                    // 44
                                                                                          // 45
    }                                                                                     // 46
  }                                                                                       // 47
}                                                                                         // 48
                                                                                          // 49
                                                                                          // 50
if (!graphicsmagick && !imagemagick) {                                                    // 51
  // Both failed                                                                          // 52
  console.warn(                                                                           // 53
    'WARNING:\n' +                                                                        // 54
    'cfs:graphicsmagick could not find "graphicsMagic" or "imageMagic" on the\n' +        // 55
    'system.\n' +                                                                         // 56
    '\n' +                                                                                // 57
    'I just checked PATH to see if I could find the GraphicsMagick or ImageMagic\n' +     // 58
    'unix/mac os/windows binaries on your system, I failed.\n' +                          // 59
    '\n' +                                                                                // 60
    'Why:\n' +                                                                            // 61
    '1. I may be blind or naive, help making me smarter\n' +                              // 62
    '2. You havent added the path to the binaries\n' +                                    // 63
    '3. You havent actually installed GraphicsMagick or ImageMagick\n' +                  // 64
    '\n' +                                                                                // 65
    '*** Make sure "$PATH" environment is configured "PATH:/path/to/binaries" ***\n' +    // 66
    '\n' +                                                                                // 67
    'Installation hints:\n' +                                                             // 68
    '* Mac OS X "brew install graphicsmagick" or "brew install imagemagick"\n' +          // 69
    '* Linux download rpm or use packagemanager\n' +                                      // 70
    '* Centos "yum install GraphicsMagick"' +                                             // 71
    '* Windows download the installer and run'                                            // 72
  );                                                                                      // 73
                                                                                          // 74
  gm.isAvailable = false;                                                                 // 75
                                                                                          // 76
} else {                                                                                  // 77
  // Rig the gm scope                                                                     // 78
                                                                                          // 79
  if (graphicsmagick) {                                                                   // 80
    // Prefer graphicsmagick                                                              // 81
    gm = nodegm;                                                                          // 82
  } else {                                                                                // 83
    // Use imageMagick - we subclass for the user                                         // 84
    var imageMagick = nodegm.subClass({ imageMagick: true });                             // 85
    gm = imageMagick;                                                                     // 86
  }                                                                                       // 87
                                                                                          // 88
  gm.isAvailable = true;                                                                  // 89
}                                                                                         // 90
                                                                                          // 91
////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);

//////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['cfs:graphicsmagick'] = {}, {
  gm: gm
});

})();
