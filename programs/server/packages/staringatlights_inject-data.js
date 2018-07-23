(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var EJSON = Package.ejson.EJSON;
var _ = Package.underscore._;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var InjectData;

var require = meteorInstall({"node_modules":{"meteor":{"staringatlights:inject-data":{"lib":{"namespace.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/staringatlights_inject-data/lib/namespace.js                                                         //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
module.export({
  InjectData: () => InjectData
});
const InjectData = {};

// Replace meteorhacks:inject-data with our new API, this is for compatibility
// with third party packages that still depend upon the meteorhacks version.
if (Package['meteorhacks:inject-data']) {
  Package['meteorhacks:inject-data'].InjectData = InjectData;
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"utils.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/staringatlights_inject-data/lib/utils.js                                                             //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
let EJSON;
module.watch(require("meteor/ejson"), {
  EJSON(v) {
    EJSON = v;
  }

}, 0);
let InjectData;
module.watch(require("./namespace"), {
  InjectData(v) {
    InjectData = v;
  }

}, 1);

/**
 * Returns an encoded string that represents an object.
 * @param {object} ejson
 */
InjectData.encode = InjectData._encode = function (ejson) {
  var ejsonString = EJSON.stringify(ejson);
  return encodeURIComponent(ejsonString);
};
/**
 * Decodes an encoded string into an object.
 * @param {string} encodedEjson
 */


InjectData.decode = InjectData._decode = function (encodedEjson) {
  var decodedEjsonString = decodeURIComponent(encodedEjson);
  if (!decodedEjsonString) return null;
  return EJSON.parse(decodedEjsonString);
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"server.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/staringatlights_inject-data/lib/server.js                                                            //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
let _;

module.watch(require("meteor/underscore"), {
  _(v) {
    _ = v;
  }

}, 0);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 1);
let InjectData;
module.watch(require("./namespace"), {
  InjectData(v) {
    InjectData = v;
  }

}, 2);
let WebApp, WebAppInternals;
module.watch(require("meteor/webapp"), {
  WebApp(v) {
    WebApp = v;
  },

  WebAppInternals(v) {
    WebAppInternals = v;
  }

}, 3);
let Random;
module.watch(require("meteor/random"), {
  Random(v) {
    Random = v;
  }

}, 4);
const Env = new Meteor.EnvironmentVariable(); // Supports legacy uses of inject data, SSR users should turn this to false

InjectData.injectToHead = true;
WebAppInternals.registerBoilerplateDataCallback('inject-data', (req, data, arch) => {
  if (req && req.headers && req.headers._injectPayload && !InjectData.disableInjection) {
    const payload = `<script type="text/inject-data">${InjectData.encode(req.headers._injectPayload)}</script>`;

    if (InjectData.injectToHead) {
      if (!data.dynamicHead) {
        data.dynamicHead = '';
      }

      data.dynamicHead += payload;
    } else {
      if (!data.dynamicBody) {
        data.dynamicBody = '';
      }

      data.dynamicBody += payload;
    }
  }

  return false;
});
/**
 * Pushes data into the InjectData payload.
 * @param {object} node request object
 * @param {string} key
 * @param {*} value
 */

InjectData.pushData = function pushData(req, key, value) {
  if (!req.headers) {
    req.headers = {};
  }

  if (!req.headers._injectPayload) {
    req.headers._injectPayload = {};
  }

  req.headers._injectPayload[key] = value;
};
/**
 * Returns the object associated with the specified key.
 * @param {string} key
 */


InjectData.getData = function getData(req, key) {
  if (req.headers._injectPayload) {
    return _.clone(req.headers._injectPayload[key]);
  } else {
    return null;
  }
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/staringatlights:inject-data/lib/namespace.js");
require("/node_modules/meteor/staringatlights:inject-data/lib/utils.js");
require("/node_modules/meteor/staringatlights:inject-data/lib/server.js");

/* Exports */
Package._define("staringatlights:inject-data", exports, {
  InjectData: InjectData
});

})();

//# sourceURL=meteor://💻app/packages/staringatlights_inject-data.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc3RhcmluZ2F0bGlnaHRzOmluamVjdC1kYXRhL2xpYi9uYW1lc3BhY2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3N0YXJpbmdhdGxpZ2h0czppbmplY3QtZGF0YS9saWIvdXRpbHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3N0YXJpbmdhdGxpZ2h0czppbmplY3QtZGF0YS9saWIvc2VydmVyLmpzIl0sIm5hbWVzIjpbIm1vZHVsZSIsImV4cG9ydCIsIkluamVjdERhdGEiLCJQYWNrYWdlIiwiRUpTT04iLCJ3YXRjaCIsInJlcXVpcmUiLCJ2IiwiZW5jb2RlIiwiX2VuY29kZSIsImVqc29uIiwiZWpzb25TdHJpbmciLCJzdHJpbmdpZnkiLCJlbmNvZGVVUklDb21wb25lbnQiLCJkZWNvZGUiLCJfZGVjb2RlIiwiZW5jb2RlZEVqc29uIiwiZGVjb2RlZEVqc29uU3RyaW5nIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwicGFyc2UiLCJfIiwiTWV0ZW9yIiwiV2ViQXBwIiwiV2ViQXBwSW50ZXJuYWxzIiwiUmFuZG9tIiwiRW52IiwiRW52aXJvbm1lbnRWYXJpYWJsZSIsImluamVjdFRvSGVhZCIsInJlZ2lzdGVyQm9pbGVycGxhdGVEYXRhQ2FsbGJhY2siLCJyZXEiLCJkYXRhIiwiYXJjaCIsImhlYWRlcnMiLCJfaW5qZWN0UGF5bG9hZCIsImRpc2FibGVJbmplY3Rpb24iLCJwYXlsb2FkIiwiZHluYW1pY0hlYWQiLCJkeW5hbWljQm9keSIsInB1c2hEYXRhIiwia2V5IiwidmFsdWUiLCJnZXREYXRhIiwiY2xvbmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxPQUFPQyxNQUFQLENBQWM7QUFBQ0MsY0FBVyxNQUFJQTtBQUFoQixDQUFkO0FBQ08sTUFBTUEsYUFBYSxFQUFuQjs7QUFFUDtBQUNBO0FBQ0EsSUFBSUMsUUFBUSx5QkFBUixDQUFKLEVB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LFdBQVYsRUFBdUI7QUFDdEJOLGFBQUtNLFdBQUwsR0FBbUIsRUFBbkI7QUFDQTs7QUFDRE4sV0FBS00sV0FBTCxJQUFvQkQsT0FBcEI7QUFDQSxLQUxELE1BS087QUFDTixVQUFJLENBQUNMLEtBQUtPLFdBQVYsRUFBdUI7QUFDdEJQLGFBQUtPLFdBQUwsR0FBbUIsRUFBbkI7QUFDQTs7QUFDRFAsV0FBS08sV0FBTCxJQUFvQkYsT0FBcEI7QUFDQTtBQUNEOztBQUNELFNBQU8sS0FBUDtBQUNBLENBMUJGO0FBNkJBOzs7Ozs7O0FBTUFqQyxXQUFXb0MsUUFBWCxHQUFzQixTQUFTQSxRQUFULENBQWtCVCxHQUFsQixFQUF1QlUsR0FBdkIsRUFBNEJDLEtBQTVCLEVBQW1DO0FBQ3hELE1BQUksQ0FBQ1gsSUFBSUcsT0FBVCxFQUFrQjtBQUNqQkgsUUFBSUcsT0FBSixHQUFjLEVBQWQ7QUFDQTs7QUFDRCxNQUFJLENBQUNILElBQUlHLE9BQUosQ0FBWUMsY0FBakIsRUFBaUM7QUFDaENKLFFBQUlHLE9BQUosQ0FBWUMsY0FBWixHQUE2QixFQUE3QjtBQUNBOztBQUVESixNQUFJRyxPQUFKLENBQVlDLGNBQVosQ0FBMkJNLEdBQTNCLElBQWtDQyxLQUFsQztBQUNBLENBVEQ7QUFXQTs7Ozs7O0FBSUF0QyxXQUFXdUMsT0FBWCxHQUFxQixTQUFTQSxPQUFULENBQWlCWixHQUFqQixFQUFzQlUsR0FBdEIsRUFBMkI7QUFDL0MsTUFBSVYsSUFBSUcsT0FBSixDQUFZQyxjQUFoQixFQUFnQztBQUMvQixXQUFPYixFQUFFc0IsS0FBRixDQUFRYixJQUFJRyxPQUFKLENBQVlDLGNBQVosQ0FBMkJNLEdBQTNCLENBQVIsQ0FBUDtBQUNBLEdBRkQsTUFFTztBQUNOLFdBQU8sSUFBUDtBQUNBO0FBQ0QsQ0FORCxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9zdGFyaW5nYXRsaWdodHNfaW5qZWN0LWRhdGEuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBnbG9iYWwgUGFja2FnZSAqL1xuZXhwb3J0IGNvbnN0IEluamVjdERhdGEgPSB7fVxuXG4vLyBSZXBsYWNlIG1ldGVvcmhhY2tzOmluamVjdC1kYXRhIHdpdGggb3VyIG5ldyBBUEksIHRoaXMgaXMgZm9yIGNvbXBhdGliaWxpdHlcbi8vIHdpdGggdGhpcmQgcGFydHkgcGFja2FnZXMgdGhhdCBzdGlsbCBkZXBlbmQgdXBvbiB0aGUgbWV0ZW9yaGFja3MgdmVyc2lvbi5cbmlmIChQYWNrYWdlWydtZXRlb3JoYWNrczppbmplY3QtZGF0YSddKSB7XG5cdFBhY2thZ2VbJ21ldGVvcmhhY2tzOmluamVjdC1kYXRhJ10uSW5qZWN0RGF0YSA9IEluamVjdERhdGFcbn1cbiIsImltcG9ydCB7IEVKU09OIH0gZnJvbSAnbWV0ZW9yL2Vqc29uJ1xuaW1wb3J0IHsgSW5qZWN0RGF0YSB9IGZyb20gJy4vbmFtZXNwYWNlJ1xuXG4vKipcbiAqIFJldHVybnMgYW4gZW5jb2RlZCBzdHJpbmcgdGhhdCByZXByZXNlbnRzIGFuIG9iamVjdC5cbiAqIEBwYXJhbSB7b2JqZWN0fSBlanNvblxuICovXG5JbmplY3REYXRhLmVuY29kZSA9IEluamVjdERhdGEuX2VuY29kZSA9IGZ1bmN0aW9uKGVqc29uKSB7XG5cdHZhciBlanNvblN0cmluZyA9IEVKU09OLnN0cmluZ2lmeShlanNvbilcblx0cmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChlanNvblN0cmluZylcbn1cblxuLyoqXG4gKiBEZWNvZGVzIGFuIGVuY29kZWQgc3RyaW5nIGludG8gYW4gb2JqZWN0LlxuICogQHBhcmFtIHtzdHJpbmd9IGVuY29kZWRFanNvblxuICovXG5JbmplY3REYXRhLmRlY29kZSA9IEluamVjdERhdGEuX2RlY29kZSA9IGZ1bmN0aW9uKGVuY29kZWRFanNvbikge1xuXHR2YXIgZGVjb2RlZEVqc29uU3RyaW5nID0gZGVjb2RlVVJJQ29tcG9uZW50KGVuY29kZWRFanNvbilcblx0aWYgKCFkZWNvZGVkRWpzb25TdHJpbmcpIHJldHVybiBudWxsXG5cblx0cmV0dXJuIEVKU09OLnBhcnNlKGRlY29kZWRFanNvblN0cmluZylcbn1cbiIsImltcG9ydCB7IF8gfSBmcm9tICdtZXRlb3IvdW5kZXJzY29yZSdcbmltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InXG5pbXBvcnQgeyBJbmplY3REYXRhIH0gZnJvbSAnLi9uYW1lc3BhY2UnXG5pbXBvcnQgeyBXZWJBcHAsIFdlYkFwcEludGVybmFscyB9IGZyb20gJ21ldGVvci93ZWJhcHAnXG5pbXBvcnQgeyBSYW5kb20gfSBmcm9tICdtZXRlb3IvcmFuZG9tJ1xuXG5jb25zdCBFbnYgPSBuZXcgTWV0ZW9yLkVudmlyb25tZW50VmFyaWFibGUoKVxuXG4vLyBTdXBwb3J0cyBsZWdhY3kgdXNlcyBvZiBpbmplY3QgZGF0YSwgU1NSIHVzZXJzIHNob3VsZCB0dXJuIHRoaXMgdG8gZmFsc2VcbkluamVjdERhdGEuaW5qZWN0VG9IZWFkID0gdHJ1ZVxuXG5XZWJBcHBJbnRlcm5hbHMucmVnaXN0ZXJCb2lsZXJwbGF0ZURhdGFDYWxsYmFjayhcblx0J2luamVjdC1kYXRhJyxcblx0KHJlcSwgZGF0YSwgYXJjaCkgPT4ge1xuXHRcdGlmIChcblx0XHRcdHJlcSAmJlxuXHRcdFx0cmVxLmhlYWRlcnMgJiZcblx0XHRcdHJlcS5oZWFkZXJzLl9pbmplY3RQYXlsb2FkICYmXG5cdFx0XHQhSW5qZWN0RGF0YS5kaXNhYmxlSW5qZWN0aW9uXG5cdFx0KSB7XG5cdFx0XHRjb25zdCBwYXlsb2FkID0gYDxzY3JpcHQgdHlwZT1cInRleHQvaW5qZWN0LWRhdGFcIj4ke0luamVjdERhdGEuZW5jb2RlKFxuXHRcdFx0XHRyZXEuaGVhZGVycy5faW5qZWN0UGF5bG9hZFxuXHRcdFx0KX08L3NjcmlwdD5gXG5cblx0XHRcdGlmIChJbmplY3REYXRhLmluamVjdFRvSGVhZCkge1xuXHRcdFx0XHRpZiAoIWRhdGEuZHluYW1pY0hlYWQpIHtcblx0XHRcdFx0XHRkYXRhLmR5bmFtaWNIZWFkID0gJydcblx0XHRcdFx0fVxuXHRcdFx0XHRkYXRhLmR5bmFtaWNIZWFkICs9IHBheWxvYWRcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICghZGF0YS5keW5hbWljQm9keSkge1xuXHRcdFx0XHRcdGRhdGEuZHluYW1pY0JvZHkgPSAnJ1xuXHRcdFx0XHR9XG5cdFx0XHRcdGRhdGEuZHluYW1pY0JvZHkgKz0gcGF5bG9hZFxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2Vcblx0fVxuKVxuXG4vKipcbiAqIFB1c2hlcyBkYXRhIGludG8gdGhlIEluamVjdERhdGEgcGF5bG9hZC5cbiAqIEBwYXJhbSB7b2JqZWN0fSBub2RlIHJlcXVlc3Qgb2JqZWN0XG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5XG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKi9cbkluamVjdERhdGEucHVzaERhdGEgPSBmdW5jdGlvbiBwdXNoRGF0YShyZXEsIGtleSwgdmFsdWUpIHtcblx0aWYgKCFyZXEuaGVhZGVycykge1xuXHRcdHJlcS5oZWFkZXJzID0ge31cblx0fVxuXHRpZiAoIXJlcS5oZWFkZXJzLl9pbmplY3RQYXlsb2FkKSB7XG5cdFx0cmVxLmhlYWRlcnMuX2luamVjdFBheWxvYWQgPSB7fVxuXHR9XG5cblx0cmVxLmhlYWRlcnMuX2luamVjdFBheWxvYWRba2V5XSA9IHZhbHVlXG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgc3BlY2lmaWVkIGtleS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXlcbiAqL1xuSW5qZWN0RGF0YS5nZXREYXRhID0gZnVuY3Rpb24gZ2V0RGF0YShyZXEsIGtleSkge1xuXHRpZiAocmVxLmhlYWRlcnMuX2luamVjdFBheWxvYWQpIHtcblx0XHRyZXR1cm4gXy5jbG9uZShyZXEuaGVhZGVycy5faW5qZWN0UGF5bG9hZFtrZXldKVxuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBudWxsXG5cdH1cbn1cbiJdfQ==
