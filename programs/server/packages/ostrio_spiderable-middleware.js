(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:spiderable-middleware":{"lib":{"meteor.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/ostrio_spiderable-middleware/lib/meteor.js               //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
let Spiderable;
module.watch(require("spiderable-middleware"), {
  default(v) {
    Spiderable = v;
  }

}, 0);
module.exportDefault(Spiderable);
///////////////////////////////////////////////////////////////////////

}},"node_modules":{"spiderable-middleware":{"package.json":function(require,exports){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// node_modules/meteor/ostrio_spiderable-middleware/node_modules/spi //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
exports.name = "spiderable-middleware";
exports.version = "1.3.2";
exports.main = "./lib/index.js";

///////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// node_modules/meteor/ostrio_spiderable-middleware/node_modules/spi //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
module.useNode();
///////////////////////////////////////////////////////////////////////

}}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/ostrio:spiderable-middleware/lib/meteor.js");

/* Exports */
Package._define("ostrio:spiderable-middleware", exports);

})();

//# sourceURL=meteor://💻app/packages/ostrio_spiderable-middleware.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOnNwaWRlcmFibGUtbWlkZGxld2FyZS9saWIvbWV0ZW9yLmpzIl0sIm5hbWVzIjpbIlNwaWRlcmFibGUiLCJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsImV4cG9ydERlZmF1bHQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxVQUFKO0FBQWVDLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSx1QkFBUixDQUFiLEVBQThDO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDTCxpQkFBV0ssQ0FBWDtBQUFhOztBQUF6QixDQUE5QyxFQUF5RSxDQUF6RTtBQUFmSixPQUFPSyxhQUFQLENBQ2VOLFVBRGYsRSIsImZpbGUiOiIvcGFja2FnZXMvb3N0cmlvX3NwaWRlcmFibGUtbWlkZGxld2FyZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBTcGlkZXJhYmxlIGZyb20gJ3NwaWRlcmFibGUtbWlkZGxld2FyZSc7XG5leHBvcnQgZGVmYXVsdCBTcGlkZXJhYmxlO1xuIl19
