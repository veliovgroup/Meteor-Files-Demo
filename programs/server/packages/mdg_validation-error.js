(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var SimpleSchema = Package['aldeed:simple-schema'].SimpleSchema;
var MongoObject = Package['aldeed:simple-schema'].MongoObject;
var meteorInstall = Package.modules.meteorInstall;
var Buffer = Package.modules.Buffer;
var process = Package.modules.process;
var Symbol = Package['ecmascript-runtime'].Symbol;
var Map = Package['ecmascript-runtime'].Map;
var Set = Package['ecmascript-runtime'].Set;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var ValidationError;

var require = meteorInstall({"node_modules":{"meteor":{"mdg:validation-error":{"validation-error.js":["babel-runtime/helpers/classCallCheck","babel-runtime/helpers/possibleConstructorReturn","babel-runtime/helpers/inherits",function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/mdg_validation-error/validation-error.js                                                        //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
var _classCallCheck;module.import('babel-runtime/helpers/classCallCheck',{"default":function(v){_classCallCheck=v}});var _possibleConstructorReturn;module.import('babel-runtime/helpers/possibleConstructorReturn',{"default":function(v){_possibleConstructorReturn=v}});var _inherits;module.import('babel-runtime/helpers/inherits',{"default":function(v){_inherits=v}});
                                                                                                            //
                                                                                                            //
/* global ValidationError:true */                                                                           //
/* global SimpleSchema */                                                                                   //
                                                                                                            //
// This is exactly what comes out of SS.                                                                    //
var errorSchema = new SimpleSchema({                                                                        // 5
  name: { type: String },                                                                                   // 6
  type: { type: String },                                                                                   // 7
  details: { type: Object, blackbox: true, optional: true }                                                 // 8
});                                                                                                         // 5
                                                                                                            //
var errorsSchema = new SimpleSchema({                                                                       // 11
  errors: { type: Array },                                                                                  // 12
  'errors.$': { type: errorSchema }                                                                         // 13
});                                                                                                         // 11
                                                                                                            //
ValidationError = function (_Meteor$Error) {                                                                // 16
  _inherits(_class, _Meteor$Error);                                                                         // 16
                                                                                                            //
  function _class(errors) {                                                                                 // 17
    var message = arguments.length <= 1 || arguments[1] === undefined ? 'Validation Failed' : arguments[1];
                                                                                                            //
    _classCallCheck(this, _class);                                                                          // 17
                                                                                                            //
    errorsSchema.validate({ errors: errors });                                                              // 18
                                                                                                            //
    var _this = _possibleConstructorReturn(this, _Meteor$Error.call(this, ValidationError.ERROR_CODE, message, errors));
                                                                                                            //
    _this.errors = errors;                                                                                  // 22
    return _this;                                                                                           // 17
  }                                                                                                         // 23
                                                                                                            //
  return _class;                                                                                            // 16
}(Meteor.Error);                                                                                            // 16
                                                                                                            //
// If people use this to check for the error code, we can change it                                         //
// in future versions                                                                                       //
ValidationError.ERROR_CODE = 'validation-error';                                                            // 28
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}]}}}},{"extensions":[".js",".json"]});
require("./node_modules/meteor/mdg:validation-error/validation-error.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['mdg:validation-error'] = {}, {
  ValidationError: ValidationError
});

})();

//# sourceMappingURL=mdg_validation-error.js.map
