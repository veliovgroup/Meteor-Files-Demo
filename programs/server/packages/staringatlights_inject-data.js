(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var EJSON = Package.ejson.EJSON;
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
module.link("meteor/ejson", {
  EJSON(v) {
    EJSON = v;
  }

}, 0);
let InjectData;
module.link("./namespace", {
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
let InjectData;
module.link("./namespace", {
  InjectData(v) {
    InjectData = v;
  }

}, 0);
let WebAppInternals;
module.link("meteor/webapp", {
  WebAppInternals(v) {
    WebAppInternals = v;
  }

}, 1);
// Supports legacy uses of inject data, SSR users should turn this to false
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
  if (req.headers && req.headers._injectPayload) {
    return Object.assign({}, req.headers._injectPayload[key]);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc3RhcmluZ2F0bGlnaHRzOmluamVjdC1kYXRhL2xpYi9uYW1lc3BhY2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3N0YXJpbmdhdGxpZ2h0czppbmplY3QtZGF0YS9saWIvdXRpbHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3N0YXJpbmdhdGxpZ2h0czppbmplY3QtZGF0YS9saWIvc2VydmVyLmpzIl0sIm5hbWVzIjpbIm1vZHVsZSIsImV4cG9ydCIsIkluamVjdERhdGEiLCJQYWNrYWdlIiwiRUpTT04iLCJsaW5rIiwidiIsImVuY29kZSIsIl9lbmNvZGUiLCJlanNvbiIsImVqc29uU3RyaW5nIiwic3RyaW5naWZ5IiwiZW5jb2RlVVJJQ29tcG9uZW50IiwiZGVjb2RlIiwiX2RlY29kZSIsImVuY29kZWRFanNvbiIsImRlY29kZWRFanNvblN0cmluZyIsImRlY29kZVVSSUNvbXBvbmVudCIsInBhcnNlIiwiV2ViQXBwSW50ZXJuYWxzIiwiaW5qZWN0VG9IZWFkIiwicmVnaXN0ZXJCb2lsZXJwbGF0ZURhdGFDYWxsYmFjayIsInJlcSIsImRhdGEiLCJhcmNoIiwiaGVhZGVycyIsIl9pbmplY3RQYXlsb2FkIiwiZGlzYWJsZUluamVjdGlvbiIsInBheWxvYWQiLCJkeW5hbWljSGVhZCIsImR5bmFtaWNCb2R5IiwicHVzaERhdGEiLCJrZXkiLCJ2YWx1ZSIsImdldERhdGEiLCJPYmplY3QiLCJhc3NpZ24iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjO0FBQUNDLFlBQVUsRUFBQyxNQUFJQTtBQUFoQixDQUFkO0FBQ08sTUFBTUEsVUFBVSxHQUFHLEVBQW5COztBQUVQO0FBQ0E7QUFDQSxJQUFJQyxPQUFPLENBQUMseUJBQUQsQ0FBWCxFQUF3QztBQUN2Q0EsU0FBTyxDQUFDLHlCQUFELENBQVAsQ0FBbUNELFVB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QUNELE1BQUksQ0FBQ0gsR0FBRyxDQUFDRyxPQUFKLENBQVlDLGNBQWpCLEVBQWlDO0FBQ2hDSixPQUFHLENBQUNHLE9BQUosQ0FBWUMsY0FBWixHQUE2QixFQUE3QjtBQUNBOztBQUVESixLQUFHLENBQUNHLE9BQUosQ0FBWUMsY0FBWixDQUEyQk0sR0FBM0IsSUFBa0NDLEtBQWxDO0FBQ0EsQ0FURDtBQVdBOzs7Ozs7QUFJQS9CLFVBQVUsQ0FBQ2dDLE9BQVgsR0FBcUIsU0FBU0EsT0FBVCxDQUFpQlosR0FBakIsRUFBc0JVLEdBQXRCLEVBQTJCO0FBQy9DLE1BQUlWLEdBQUcsQ0FBQ0csT0FBSixJQUFlSCxHQUFHLENBQUNHLE9BQUosQ0FBWUMsY0FBL0IsRUFBK0M7QUFDOUMsV0FBT1MsTUFBTSxDQUFDQyxNQUFQLENBQWMsRUFBZCxFQUFrQmQsR0FBRyxDQUFDRyxPQUFKLENBQVlDLGNBQVosQ0FBMkJNLEdBQTNCLENBQWxCLENBQVA7QUFDQSxHQUZELE1BRU87QUFDTixXQUFPLElBQVA7QUFDQTtBQUNELENBTkQsQyIsImZpbGUiOiIvcGFja2FnZXMvc3RhcmluZ2F0bGlnaHRzX2luamVjdC1kYXRhLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZ2xvYmFsIFBhY2thZ2UgKi9cbmV4cG9ydCBjb25zdCBJbmplY3REYXRhID0ge31cblxuLy8gUmVwbGFjZSBtZXRlb3JoYWNrczppbmplY3QtZGF0YSB3aXRoIG91ciBuZXcgQVBJLCB0aGlzIGlzIGZvciBjb21wYXRpYmlsaXR5XG4vLyB3aXRoIHRoaXJkIHBhcnR5IHBhY2thZ2VzIHRoYXQgc3RpbGwgZGVwZW5kIHVwb24gdGhlIG1ldGVvcmhhY2tzIHZlcnNpb24uXG5pZiAoUGFja2FnZVsnbWV0ZW9yaGFja3M6aW5qZWN0LWRhdGEnXSkge1xuXHRQYWNrYWdlWydtZXRlb3JoYWNrczppbmplY3QtZGF0YSddLkluamVjdERhdGEgPSBJbmplY3REYXRhXG59XG4iLCJpbXBvcnQgeyBFSlNPTiB9IGZyb20gJ21ldGVvci9lanNvbidcbmltcG9ydCB7IEluamVjdERhdGEgfSBmcm9tICcuL25hbWVzcGFjZSdcblxuLyoqXG4gKiBSZXR1cm5zIGFuIGVuY29kZWQgc3RyaW5nIHRoYXQgcmVwcmVzZW50cyBhbiBvYmplY3QuXG4gKiBAcGFyYW0ge29iamVjdH0gZWpzb25cbiAqL1xuSW5qZWN0RGF0YS5lbmNvZGUgPSBJbmplY3REYXRhLl9lbmNvZGUgPSBmdW5jdGlvbihlanNvbikge1xuXHR2YXIgZWpzb25TdHJpbmcgPSBFSlNPTi5zdHJpbmdpZnkoZWpzb24pXG5cdHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoZWpzb25TdHJpbmcpXG59XG5cbi8qKlxuICogRGVjb2RlcyBhbiBlbmNvZGVkIHN0cmluZyBpbnRvIGFuIG9iamVjdC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBlbmNvZGVkRWpzb25cbiAqL1xuSW5qZWN0RGF0YS5kZWNvZGUgPSBJbmplY3REYXRhLl9kZWNvZGUgPSBmdW5jdGlvbihlbmNvZGVkRWpzb24pIHtcblx0dmFyIGRlY29kZWRFanNvblN0cmluZyA9IGRlY29kZVVSSUNvbXBvbmVudChlbmNvZGVkRWpzb24pXG5cdGlmICghZGVjb2RlZEVqc29uU3RyaW5nKSByZXR1cm4gbnVsbFxuXG5cdHJldHVybiBFSlNPTi5wYXJzZShkZWNvZGVkRWpzb25TdHJpbmcpXG59XG4iLCJcbmltcG9ydCB7IEluamVjdERhdGEgfSBmcm9tICcuL25hbWVzcGFjZSdcbmltcG9ydCB7IFdlYkFwcEludGVybmFscyB9IGZyb20gJ21ldGVvci93ZWJhcHAnXG5cbi8vIFN1cHBvcnRzIGxlZ2FjeSB1c2VzIG9mIGluamVjdCBkYXRhLCBTU1IgdXNlcnMgc2hvdWxkIHR1cm4gdGhpcyB0byBmYWxzZVxuSW5qZWN0RGF0YS5pbmplY3RUb0hlYWQgPSB0cnVlXG5cbldlYkFwcEludGVybmFscy5yZWdpc3RlckJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrKFxuXHQnaW5qZWN0LWRhdGEnLFxuXHQocmVxLCBkYXRhLCBhcmNoKSA9PiB7XG5cdFx0aWYgKFxuXHRcdFx0cmVxICYmXG5cdFx0XHRyZXEuaGVhZGVycyAmJlxuXHRcdFx0cmVxLmhlYWRlcnMuX2luamVjdFBheWxvYWQgJiZcblx0XHRcdCFJbmplY3REYXRhLmRpc2FibGVJbmplY3Rpb25cblx0XHQpIHtcblx0XHRcdGNvbnN0IHBheWxvYWQgPSBgPHNjcmlwdCB0eXBlPVwidGV4dC9pbmplY3QtZGF0YVwiPiR7SW5qZWN0RGF0YS5lbmNvZGUoXG5cdFx0XHRcdHJlcS5oZWFkZXJzLl9pbmplY3RQYXlsb2FkXG5cdFx0XHQpfTwvc2NyaXB0PmBcblxuXHRcdFx0aWYgKEluamVjdERhdGEuaW5qZWN0VG9IZWFkKSB7XG5cdFx0XHRcdGlmICghZGF0YS5keW5hbWljSGVhZCkge1xuXHRcdFx0XHRcdGRhdGEuZHluYW1pY0hlYWQgPSAnJ1xuXHRcdFx0XHR9XG5cdFx0XHRcdGRhdGEuZHluYW1pY0hlYWQgKz0gcGF5bG9hZFxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKCFkYXRhLmR5bmFtaWNCb2R5KSB7XG5cdFx0XHRcdFx0ZGF0YS5keW5hbWljQm9keSA9ICcnXG5cdFx0XHRcdH1cblx0XHRcdFx0ZGF0YS5keW5hbWljQm9keSArPSBwYXlsb2FkXG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZVxuXHR9XG4pXG5cbi8qKlxuICogUHVzaGVzIGRhdGEgaW50byB0aGUgSW5qZWN0RGF0YSBwYXlsb2FkLlxuICogQHBhcmFtIHtvYmplY3R9IG5vZGUgcmVxdWVzdCBvYmplY3RcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqL1xuSW5qZWN0RGF0YS5wdXNoRGF0YSA9IGZ1bmN0aW9uIHB1c2hEYXRhKHJlcSwga2V5LCB2YWx1ZSkge1xuXHRpZiAoIXJlcS5oZWFkZXJzKSB7XG5cdFx0cmVxLmhlYWRlcnMgPSB7fVxuXHR9XG5cdGlmICghcmVxLmhlYWRlcnMuX2luamVjdFBheWxvYWQpIHtcblx0XHRyZXEuaGVhZGVycy5faW5qZWN0UGF5bG9hZCA9IHt9XG5cdH1cblxuXHRyZXEuaGVhZGVycy5faW5qZWN0UGF5bG9hZFtrZXldID0gdmFsdWVcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBzcGVjaWZpZWQga2V5LlxuICogQHBhcmFtIHtzdHJpbmd9IGtleVxuICovXG5JbmplY3REYXRhLmdldERhdGEgPSBmdW5jdGlvbiBnZXREYXRhKHJlcSwga2V5KSB7XG5cdGlmIChyZXEuaGVhZGVycyAmJiByZXEuaGVhZGVycy5faW5qZWN0UGF5bG9hZCkge1xuXHRcdHJldHVybiBPYmplY3QuYXNzaWduKHt9LCByZXEuaGVhZGVycy5faW5qZWN0UGF5bG9hZFtrZXldKTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gbnVsbFxuXHR9XG59XG4iXX0=
