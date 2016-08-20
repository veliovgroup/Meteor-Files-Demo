(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var check = Package.check.check;
var Match = Package.check.Match;
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

//////////////////////////////////////////////////////////////////////////////////////
//                                                                                  //
// packages/mdg_validation-error/validation-error.js                                //
//                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////
                                                                                    //
var _classCallCheck;module.import('babel-runtime/helpers/classCallCheck',{"default":function(v){_classCallCheck=v}});var _possibleConstructorReturn;module.import('babel-runtime/helpers/possibleConstructorReturn',{"default":function(v){_possibleConstructorReturn=v}});var _inherits;module.import('babel-runtime/helpers/inherits',{"default":function(v){_inherits=v}});
                                                                                    //
                                                                                    //
// The "details" property of the ValidationError must be an array of objects        //
// containing at least two properties. The "name" and "type" properties are         //
// required.                                                                        //
var errorsPattern = [Match.ObjectIncluding({                                        // 4
  name: String,                                                                     // 5
  type: String                                                                      // 6
})];                                                                                // 4
                                                                                    //
ValidationError = function (_Meteor$Error) {                                        // 9
  _inherits(_class, _Meteor$Error);                                                 // 9
                                                                                    //
  function _class(errors) {                                                         // 10
    var _this, _ret;                                                                // 10
                                                                                    //
    var message = arguments.length <= 1 || arguments[1] === undefined ? ValidationError.DEFAULT_MESSAGE : arguments[1];
                                                                                    //
    _classCallCheck(this, _class);                                                  // 10
                                                                                    //
    check(errors, errorsPattern);                                                   // 11
    check(message, String);                                                         // 12
                                                                                    //
    return _ret = (_this = _possibleConstructorReturn(this, _Meteor$Error.call(this, ValidationError.ERROR_CODE, message, errors)), _this), _possibleConstructorReturn(_this, _ret);
  }                                                                                 // 15
                                                                                    //
  // Static method checking if a given Meteor.Error is an instance of               //
  // ValidationError.                                                               //
                                                                                    //
                                                                                    //
  _class.is = function is(err) {                                                    // 9
    return err instanceof Meteor.Error && err.error === ValidationError.ERROR_CODE;
  };                                                                                // 21
                                                                                    //
  return _class;                                                                    // 9
}(Meteor.Error);                                                                    // 9
                                                                                    //
// Universal validation error code to be use in applications and packages.          //
ValidationError.ERROR_CODE = 'validation-error';                                    // 25
// Default validation error message that can be changed globally.                   //
ValidationError.DEFAULT_MESSAGE = 'Validation failed';                              // 27
//////////////////////////////////////////////////////////////////////////////////////

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
