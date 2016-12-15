(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;

/* Package-scope variables */
var Spiderable;

(function(){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/ostrio_spiderable-middleware/lib/meteor.js               //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
Spiderable = Npm.require("spiderable-middleware");
///////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['ostrio:spiderable-middleware'] = {}, {
  Spiderable: Spiderable
});

})();
