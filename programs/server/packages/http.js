(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var _ = Package.underscore._;
var URL = Package.url.URL;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var makeErrorByStatus, populateData, HTTP, HTTPInternals;

var require = meteorInstall({"node_modules":{"meteor":{"http":{"httpcall_common.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/http/httpcall_common.js                                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
const MAX_LENGTH = 500; // if you change this, also change the appropriate test

makeErrorByStatus = function (statusCode, content) {
  let message = `failed [${statusCode}]`;

  if (content) {
    const stringContent = typeof content == "string" ? content : content.toString();
    message += ' ' + truncate(stringContent.replace(/\n/g, ' '), MAX_LENGTH);
  }

  return new Error(message);
};

function truncate(str, length) {
  return str.length > length ? str.slice(0, length) + '...' : str;
} // Fill in `response.data` if the content-type is JSON.


populateData = function (response) {
  // Read Content-Type header, up to a ';' if there is one.
  // A typical header might be "application/json; charset=utf-8"
  // or just "application/json".
  var contentType = (response.headers['content-type'] || ';').split(';')[0]; // Only try to parse data as JSON if server sets correct content type.

  if (_.include(['application/json', 'text/javascript', 'application/javascript', 'application/x-javascript'], contentType)) {
    try {
      response.data = JSON.parse(response.content);
    } catch (err) {
      response.data = null;
    }
  } else {
    response.data = null;
  }
};

HTTP = {}; /**
            * @summary Send an HTTP `GET` request. Equivalent to calling [`HTTP.call`](#http_call) with "GET" as the first argument.
            * @param {String} url The URL to which the request should be sent.
            * @param {Object} [callOptions] Options passed on to [`HTTP.call`](#http_call).
            * @param {Function} [asyncCallback] Callback that is called when the request is completed. Required on the client.
            * @locus Anywhere
            */

HTTP.get = function () /* varargs */{
  return HTTP.call.apply(this, ["GET"].concat(_.toArray(arguments)));
}; /**
    * @summary Send an HTTP `POST` request. Equivalent to calling [`HTTP.call`](#http_call) with "POST" as the first argument.
    * @param {String} url The URL to which the request should be sent.
    * @param {Object} [callOptions] Options passed on to [`HTTP.call`](#http_call).
    * @param {Function} [asyncCallback] Callback that is called when the request is completed. Required on the client.
    * @locus Anywhere
    */

HTTP.post = function () /* varargs */{
  return HTTP.call.apply(this, ["POST"].concat(_.toArray(arguments)));
}; /**
    * @summary Send an HTTP `PUT` request. Equivalent to calling [`HTTP.call`](#http_call) with "PUT" as the first argument.
    * @param {String} url The URL to which the request should be sent.
    * @param {Object} [callOptions] Options passed on to [`HTTP.call`](#http_call).
    * @param {Function} [asyncCallback] Callback that is called when the request is completed. Required on the client.
    * @locus Anywhere
    */

HTTP.put = function () /* varargs */{
  return HTTP.call.apply(this, ["PUT"].concat(_.toArray(arguments)));
}; /**
    * @summary Send an HTTP `DELETE` request. Equivalent to calling [`HTTP.call`](#http_call) with "DELETE" as the first argument. (Named `del` to avoid conflict with the Javascript keyword `delete`)
    * @param {String} url The URL to which the request should be sent.
    * @param {Object} [callOptions] Options passed on to [`HTTP.call`](#http_call).
    * @param {Function} [asyncCallback] Callback that is called when the request is completed. Required on the client.
    * @locus Anywhere
    */

HTTP.del = function () /* varargs */{
  return HTTP.call.apply(this, ["DELETE"].concat(_.toArray(arguments)));
}; /**
    * @summary Send an HTTP `PATCH` request. Equivalent to calling [`HTTP.call`](#http_call) with "PATCH" as the first argument.
    * @param {String} url The URL to which the request should be sent.
    * @param {Object} [callOptions] Options passed on to [`HTTP.call`](#http_call).
    * @param {Function} [asyncCallback] Callback that is called when the request is completed. Required on the client.
    * @locus Anywhere
    */

HTTP.patch = function () /* varargs */{
  return HTTP.call.apply(this, ["PATCH"].concat(_.toArray(arguments)));
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"httpcall_server.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/http/httpcall_server.js                                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var path = Npm.require('path');

var request = Npm.require('request');

var url_util = Npm.require('url');

HTTPInternals = {
  NpmModules: {
    request: {
      version: Npm.require('request/package.json').version,
      module: request
    }
  }
}; // _call always runs asynchronously; HTTP.call, defined below,
// wraps _call and runs synchronously when no callback is provided.

var _call = function (method, url, options, callback) {
  ////////// Process arguments //////////
  if (!callback && typeof options === "function") {
    // support (method, url, callback) argument list
    callback = options;
    options = null;
  }

  options = options || {};

  if (_.has(options, 'beforeSend')) {
    throw new Error("Option beforeSend not supported on server.");
  }

  method = (method || "").toUpperCase();
  if (!/^https?:\/\//.test(url)) throw new Error("url must be absolute and start with http:// or https://");
  var headers = {};
  var content = options.content;

  if (options.data) {
    content = JSON.stringify(options.data);
    headers['Content-Type'] = 'application/json';
  }

  var paramsForUrl, paramsForBody;
  if (content || method === "GET" || method === "HEAD") paramsForUrl = options.params;else paramsForBody = options.params;

  var newUrl = URL._constructUrl(url, options.query, paramsForUrl);

  if (options.auth) {
    if (options.auth.indexOf(':') < 0) throw new Error('auth option should be of the form "username:password"');
    headers['Authorization'] = "Basic " + Buffer.from(options.auth, "ascii").toString("base64");
  }

  if (paramsForBody) {
    content = URL._encodeParams(paramsForBody);
    headers['Content-Type'] = "application/x-www-form-urlencoded";
  }

  _.extend(headers, options.headers || {}); // wrap callback to add a 'response' property on an error, in case
  // we have both (http 4xx/5xx error, which has a response payload)


  callback = function (callback) {
    return function (error, response) {
      if (error && response) error.response = response;
      callback(error, response);
    };
  }(callback); // safety belt: only call the callback once.


  callback = _.once(callback); ////////// Kickoff! //////////
  // Allow users to override any request option with the npmRequestOptions
  // option.

  var reqOptions = _.extend({
    url: newUrl,
    method: method,
    encoding: "utf8",
    jar: false,
    timeout: options.timeout,
    body: content,
    followRedirect: options.followRedirects,
    // Follow redirects on non-GET requests
    // also. (https://github.com/meteor/meteor/issues/2808)
    followAllRedirects: options.followRedirects,
    headers: headers
  }, options.npmRequestOptions || {});

  request(reqOptions, function (error, res, body) {
    var response = null;

    if (!error) {
      response = {};
      response.statusCode = res.statusCode;
      response.content = body;
      response.headers = res.headers;
      populateData(response);
      if (response.statusCode >= 400) error = makeErrorByStatus(response.statusCode, response.content);
    }

    callback(error, response);
  });
};

HTTP.call = Meteor.wrapAsync(_call);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deprecated.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/http/deprecated.js                                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// The HTTP object used to be called Meteor.http.
// XXX COMPAT WITH 0.6.4
Meteor.http = HTTP;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("./node_modules/meteor/http/httpcall_common.js");
require("./node_modules/meteor/http/httpcall_server.js");
require("./node_modules/meteor/http/deprecated.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package.http = {}, {
  HTTP: HTTP,
  HTTPInternals: HTTPInternals
});

})();

//# sourceURL=meteor://💻app/packages/http.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvaHR0cC9odHRwY2FsbF9jb21tb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2h0dHAvaHR0cGNhbGxfc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9odHRwL2RlcHJlY2F0ZWQuanMiXSwibmFtZXMiOlsiTUFYX0xFTkdUSCIsIm1ha2VFcnJvckJ5U3RhdHVzIiwic3RhdHVzQ29kZSIsImNvbnRlbnQiLCJtZXNzYWdlIiwic3RyaW5nQ29udGVudCIsInRvU3RyaW5nIiwidHJ1bmNhdGUiLCJyZXBsYWNlIiwiRXJyb3IiLCJzdHIiLCJsZW5ndGgiLCJzbGljZSIsInBvcHVsYXRlRGF0YSIsInJlc3BvbnNlIiwiY29udGVudFR5cGUiLCJoZWFkZXJzIiwic3BsaXQiLCJfIiwiaW5jbHVkZSIsImRhdGEiLCJKU09OIiwicGFyc2UiLCJlcnIiLCJIVFRQIiwiZ2V0IiwiY2FsbCIsImFwcGx5IiwiY29uY2F0IiwidG9BcnJheSIsImFyZ3VtZW50cyIsInBvc3QiLCJwdXQiLCJkZWwiLCJwYXRjaCIsInBhdGgiLCJOcG0iLCJyZXF1aXJlIiwicmVxdWVzdCIsInVybF91dGlsIiwiSFRUUEludGVybmFscyIsIk5wbU1vZHVsZXMiLCJ2ZXJzaW9uIiwibW9kdWxlIiwiX2NhbGwiLCJtZXRob2QiLCJ1cmwiLCJvcHRpb25zIiwiY2FsbGJhY2siLCJoYXMiLCJ0b1VwcGVyQ2FzZSIsInRlc3QiLCJzdHJpbmdpZnkiLCJwYXJhbXNGb3JVcmwiLCJwYXJhbXNGb3JCb2R5IiwicGFyYW1zIiwibmV3VXJsIiwiVVJMIiwiX2NvbnN0cnVjdFVybCIsInF1ZXJ5IiwiYXV0aCIsImluZGV4T2YiLCJCdWZmZXIiLCJmcm9tIiwiX2VuY29kZVBhcmFtcyIsImV4dGVuZCIsImVycm9yIiwib25jZSIsInJlcU9wdGlvbnMiLCJlbmNvZGluZyIsImphciIsInRpbWVvdXQiLCJib2R5IiwiZm9sbG93UmVkaXJlY3QiLCJmb2xsb3dSZWRpcmVjdHMiLCJmb2xsb3dBbGxSZWRpcmVjdHMiLCJucG1SZXF1ZXN0T3B0aW9ucyIsInJlcyIsIk1ldGVvciIsIndyYXBBc3luYyIsImh0dHAiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLE1BQU1BLGFBQWEsR0FBbkIsQyxDQUF3Qjs7QUFFeEJDLG9CQUFvQixVQUFTQyxVQUFULEVBQXFCQyxPQUFyQixFQUE4QjtBQUNoRCxNQUFJQyxVQUFXLFdBQVVGLFVBQVcsR0FBcEM7O0FBRUEsTUFBSUMsT0FBSixFQUFhO0FBQ1gsVUFBTUUsZ0JBQWdCLE9BQU9GLE9BQVAsSUFBa0IsUUFBbEIsR0FDcEJBLE9BRG9CLEdBQ1ZBLFFBQVFHLFFBQVIsRUFEWjtBQUdBRixlQUFXLE1BQU1HLFNBQVNGLGNBQWNHLE9BQWQsQ0FBc0IsS0FBdEIsRUFBNkIsR0FBN0IsQ0FBVCxFQUE0Q1IsVUFBNUMsQ0FBakI7QUFDRDs7QUFFRCxTQUFPLElBQUlTLEtBQUosQ0FBVUwsT0FBVixDQUFQO0FBQ0QsQ0FYRDs7QUFhQSxTQUFTRyxRQUFULENBQWtCRyxHQUFsQixFQUF1QkMsTUFBdkIsRUFBK0I7QUFDN0IsU0FBT0QsSUFBSUMsTUFBSixHQUFhQSxNQUFiLEdBQXNCRCxJQUFJRSxLQUFKLENBQVUsQ0FBVixFQUFhRCxNQUFiLElBQXVCLEtBQTdDLEdBQXFERCxHQUE1RDtBQUNELEMsQ0FFRDs7O0FBQ0FHLGVBQWUsVUFBU0MsUUFBVCxFQUFtQjtBQUNoQztBQUNBO0FBQ0E7QUFDQSxNQUFJQyxjQUFjLENBQUNELFNBQVNFLE9BQVQsQ0FBaUIsY0FBakIsS0FBb0MsR0FBckMsRUFBMENDLEtBQTFDLENBQWdELEdBQWhELEVBQXFELENBQXJELENBQWxCLENBSmdDLENBTWhDOztBQUNBLE1BQUlDLEVBQUVDLE9BQUYsQ0FBVSxDQUFDLGtCQUFELEVBQXFCLGlCQUFyQixFQUNWLHdCQURVLEVBQ2dCLDBCQURoQixDQUFWLEVBQ3VESixXQUR2RCxDQUFKLEVBQ3lF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T0FBT0MsU0FBUCxDQUFpQm5DLEtBQWpCLENBQVosQzs7Ozs7Ozs7Ozs7QUN4SEE7QUFDQTtBQUNBa0MsT0FBT0UsSUFBUCxHQUFjeEQsSUFBZCxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9odHRwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgTUFYX0xFTkdUSCA9IDUwMDsgLy8gaWYgeW91IGNoYW5nZSB0aGlzLCBhbHNvIGNoYW5nZSB0aGUgYXBwcm9wcmlhdGUgdGVzdFxuXG5tYWtlRXJyb3JCeVN0YXR1cyA9IGZ1bmN0aW9uKHN0YXR1c0NvZGUsIGNvbnRlbnQpIHtcbiAgbGV0IG1lc3NhZ2UgPSBgZmFpbGVkIFske3N0YXR1c0NvZGV9XWA7XG5cbiAgaWYgKGNvbnRlbnQpIHtcbiAgICBjb25zdCBzdHJpbmdDb250ZW50ID0gdHlwZW9mIGNvbnRlbnQgPT0gXCJzdHJpbmdcIiA/XG4gICAgICBjb250ZW50IDogY29udGVudC50b1N0cmluZygpO1xuXG4gICAgbWVzc2FnZSArPSAnICcgKyB0cnVuY2F0ZShzdHJpbmdDb250ZW50LnJlcGxhY2UoL1xcbi9nLCAnICcpLCBNQVhfTEVOR1RIKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgRXJyb3IobWVzc2FnZSk7XG59O1xuXG5mdW5jdGlvbiB0cnVuY2F0ZShzdHIsIGxlbmd0aCkge1xuICByZXR1cm4gc3RyLmxlbmd0aCA+IGxlbmd0aCA/IHN0ci5zbGljZSgwLCBsZW5ndGgpICsgJy4uLicgOiBzdHI7XG59XG5cbi8vIEZpbGwgaW4gYHJlc3BvbnNlLmRhdGFgIGlmIHRoZSBjb250ZW50LXR5cGUgaXMgSlNPTi5cbnBvcHVsYXRlRGF0YSA9IGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gIC8vIFJlYWQgQ29udGVudC1UeXBlIGhlYWRlciwgdXAgdG8gYSAnOycgaWYgdGhlcmUgaXMgb25lLlxuICAvLyBBIHR5cGljYWwgaGVhZGVyIG1pZ2h0IGJlIFwiYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOFwiXG4gIC8vIG9yIGp1c3QgXCJhcHBsaWNhdGlvbi9qc29uXCIuXG4gIHZhciBjb250ZW50VHlwZSA9IChyZXNwb25zZS5oZWFkZXJzWydjb250ZW50LXR5cGUnXSB8fCAnOycpLnNwbGl0KCc7JylbMF07XG5cbiAgLy8gT25seSB0cnkgdG8gcGFyc2UgZGF0YSBhcyBKU09OIGlmIHNlcnZlciBzZXRzIGNvcnJlY3QgY29udGVudCB0eXBlLlxuICBpZiAoXy5pbmNsdWRlKFsnYXBwbGljYXRpb24vanNvbicsICd0ZXh0L2phdmFzY3JpcHQnLFxuICAgICAgJ2FwcGxpY2F0aW9uL2phdmFzY3JpcHQnLCAnYXBwbGljYXRpb24veC1qYXZhc2NyaXB0J10sIGNvbnRlbnRUeXBlKSkge1xuICAgIHRyeSB7XG4gICAgICByZXNwb25zZS5kYXRhID0gSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHJlc3BvbnNlLmRhdGEgPSBudWxsO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXNwb25zZS5kYXRhID0gbnVsbDtcbiAgfVxufTtcblxuSFRUUCA9IHt9O1xuXG4vKipcbiAqIEBzdW1tYXJ5IFNlbmQgYW4gSFRUUCBgR0VUYCByZXF1ZXN0LiBFcXVpdmFsZW50IHRvIGNhbGxpbmcgW2BIVFRQLmNhbGxgXSgjaHR0cF9jYWxsKSB3aXRoIFwiR0VUXCIgYXMgdGhlIGZpcnN0IGFyZ3VtZW50LlxuICogQHBhcmFtIHtTdHJpbmd9IHVybCBUaGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IHNob3VsZCBiZSBzZW50LlxuICogQHBhcmFtIHtPYmplY3R9IFtjYWxsT3B0aW9uc10gT3B0aW9ucyBwYXNzZWQgb24gdG8gW2BIVFRQLmNhbGxgXSgjaHR0cF9jYWxsKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFthc3luY0NhbGxiYWNrXSBDYWxsYmFjayB0aGF0IGlzIGNhbGxlZCB3aGVuIHRoZSByZXF1ZXN0IGlzIGNvbXBsZXRlZC4gUmVxdWlyZWQgb24gdGhlIGNsaWVudC5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICovXG5IVFRQLmdldCA9IGZ1bmN0aW9uICgvKiB2YXJhcmdzICovKSB7XG4gIHJldHVybiBIVFRQLmNhbGwuYXBwbHkodGhpcywgW1wiR0VUXCJdLmNvbmNhdChfLnRvQXJyYXkoYXJndW1lbnRzKSkpO1xufTtcblxuLyoqXG4gKiBAc3VtbWFyeSBTZW5kIGFuIEhUVFAgYFBPU1RgIHJlcXVlc3QuIEVxdWl2YWxlbnQgdG8gY2FsbGluZyBbYEhUVFAuY2FsbGBdKCNodHRwX2NhbGwpIHdpdGggXCJQT1NUXCIgYXMgdGhlIGZpcnN0IGFyZ3VtZW50LlxuICogQHBhcmFtIHtTdHJpbmd9IHVybCBUaGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IHNob3VsZCBiZSBzZW50LlxuICogQHBhcmFtIHtPYmplY3R9IFtjYWxsT3B0aW9uc10gT3B0aW9ucyBwYXNzZWQgb24gdG8gW2BIVFRQLmNhbGxgXSgjaHR0cF9jYWxsKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFthc3luY0NhbGxiYWNrXSBDYWxsYmFjayB0aGF0IGlzIGNhbGxlZCB3aGVuIHRoZSByZXF1ZXN0IGlzIGNvbXBsZXRlZC4gUmVxdWlyZWQgb24gdGhlIGNsaWVudC5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICovXG5IVFRQLnBvc3QgPSBmdW5jdGlvbiAoLyogdmFyYXJncyAqLykge1xuICByZXR1cm4gSFRUUC5jYWxsLmFwcGx5KHRoaXMsIFtcIlBPU1RcIl0uY29uY2F0KF8udG9BcnJheShhcmd1bWVudHMpKSk7XG59O1xuXG4vKipcbiAqIEBzdW1tYXJ5IFNlbmQgYW4gSFRUUCBgUFVUYCByZXF1ZXN0LiBFcXVpdmFsZW50IHRvIGNhbGxpbmcgW2BIVFRQLmNhbGxgXSgjaHR0cF9jYWxsKSB3aXRoIFwiUFVUXCIgYXMgdGhlIGZpcnN0IGFyZ3VtZW50LlxuICogQHBhcmFtIHtTdHJpbmd9IHVybCBUaGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IHNob3VsZCBiZSBzZW50LlxuICogQHBhcmFtIHtPYmplY3R9IFtjYWxsT3B0aW9uc10gT3B0aW9ucyBwYXNzZWQgb24gdG8gW2BIVFRQLmNhbGxgXSgjaHR0cF9jYWxsKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFthc3luY0NhbGxiYWNrXSBDYWxsYmFjayB0aGF0IGlzIGNhbGxlZCB3aGVuIHRoZSByZXF1ZXN0IGlzIGNvbXBsZXRlZC4gUmVxdWlyZWQgb24gdGhlIGNsaWVudC5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICovXG5IVFRQLnB1dCA9IGZ1bmN0aW9uICgvKiB2YXJhcmdzICovKSB7XG4gIHJldHVybiBIVFRQLmNhbGwuYXBwbHkodGhpcywgW1wiUFVUXCJdLmNvbmNhdChfLnRvQXJyYXkoYXJndW1lbnRzKSkpO1xufTtcblxuLyoqXG4gKiBAc3VtbWFyeSBTZW5kIGFuIEhUVFAgYERFTEVURWAgcmVxdWVzdC4gRXF1aXZhbGVudCB0byBjYWxsaW5nIFtgSFRUUC5jYWxsYF0oI2h0dHBfY2FsbCkgd2l0aCBcIkRFTEVURVwiIGFzIHRoZSBmaXJzdCBhcmd1bWVudC4gKE5hbWVkIGBkZWxgIHRvIGF2b2lkIGNvbmZsaWN0IHdpdGggdGhlIEphdmFzY3JpcHQga2V5d29yZCBgZGVsZXRlYClcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgVGhlIFVSTCB0byB3aGljaCB0aGUgcmVxdWVzdCBzaG91bGQgYmUgc2VudC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbY2FsbE9wdGlvbnNdIE9wdGlvbnMgcGFzc2VkIG9uIHRvIFtgSFRUUC5jYWxsYF0oI2h0dHBfY2FsbCkuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbYXN5bmNDYWxsYmFja10gQ2FsbGJhY2sgdGhhdCBpcyBjYWxsZWQgd2hlbiB0aGUgcmVxdWVzdCBpcyBjb21wbGV0ZWQuIFJlcXVpcmVkIG9uIHRoZSBjbGllbnQuXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqL1xuSFRUUC5kZWwgPSBmdW5jdGlvbiAoLyogdmFyYXJncyAqLykge1xuICByZXR1cm4gSFRUUC5jYWxsLmFwcGx5KHRoaXMsIFtcIkRFTEVURVwiXS5jb25jYXQoXy50b0FycmF5KGFyZ3VtZW50cykpKTtcbn07XG5cbi8qKlxuICogQHN1bW1hcnkgU2VuZCBhbiBIVFRQIGBQQVRDSGAgcmVxdWVzdC4gRXF1aXZhbGVudCB0byBjYWxsaW5nIFtgSFRUUC5jYWxsYF0oI2h0dHBfY2FsbCkgd2l0aCBcIlBBVENIXCIgYXMgdGhlIGZpcnN0IGFyZ3VtZW50LlxuICogQHBhcmFtIHtTdHJpbmd9IHVybCBUaGUgVVJMIHRvIHdoaWNoIHRoZSByZXF1ZXN0IHNob3VsZCBiZSBzZW50LlxuICogQHBhcmFtIHtPYmplY3R9IFtjYWxsT3B0aW9uc10gT3B0aW9ucyBwYXNzZWQgb24gdG8gW2BIVFRQLmNhbGxgXSgjaHR0cF9jYWxsKS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFthc3luY0NhbGxiYWNrXSBDYWxsYmFjayB0aGF0IGlzIGNhbGxlZCB3aGVuIHRoZSByZXF1ZXN0IGlzIGNvbXBsZXRlZC4gUmVxdWlyZWQgb24gdGhlIGNsaWVudC5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICovXG5IVFRQLnBhdGNoID0gZnVuY3Rpb24gKC8qIHZhcmFyZ3MgKi8pIHtcbiAgcmV0dXJuIEhUVFAuY2FsbC5hcHBseSh0aGlzLCBbXCJQQVRDSFwiXS5jb25jYXQoXy50b0FycmF5KGFyZ3VtZW50cykpKTtcbn07XG4iLCJ2YXIgcGF0aCA9IE5wbS5yZXF1aXJlKCdwYXRoJyk7XG52YXIgcmVxdWVzdCA9IE5wbS5yZXF1aXJlKCdyZXF1ZXN0Jyk7XG52YXIgdXJsX3V0aWwgPSBOcG0ucmVxdWlyZSgndXJsJyk7XG5cbkhUVFBJbnRlcm5hbHMgPSB7XG4gIE5wbU1vZHVsZXM6IHtcbiAgICByZXF1ZXN0OiB7XG4gICAgICB2ZXJzaW9uOiBOcG0ucmVxdWlyZSgncmVxdWVzdC9wYWNrYWdlLmpzb24nKS52ZXJzaW9uLFxuICAgICAgbW9kdWxlOiByZXF1ZXN0XG4gICAgfVxuICB9XG59O1xuXG4vLyBfY2FsbCBhbHdheXMgcnVucyBhc3luY2hyb25vdXNseTsgSFRUUC5jYWxsLCBkZWZpbmVkIGJlbG93LFxuLy8gd3JhcHMgX2NhbGwgYW5kIHJ1bnMgc3luY2hyb25vdXNseSB3aGVuIG5vIGNhbGxiYWNrIGlzIHByb3ZpZGVkLlxudmFyIF9jYWxsID0gZnVuY3Rpb24obWV0aG9kLCB1cmwsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG5cbiAgLy8vLy8vLy8vLyBQcm9jZXNzIGFyZ3VtZW50cyAvLy8vLy8vLy8vXG5cbiAgaWYgKCEgY2FsbGJhY2sgJiYgdHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIC8vIHN1cHBvcnQgKG1ldGhvZCwgdXJsLCBjYWxsYmFjaykgYXJndW1lbnQgbGlzdFxuICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICBvcHRpb25zID0gbnVsbDtcbiAgfVxuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIGlmIChfLmhhcyhvcHRpb25zLCAnYmVmb3JlU2VuZCcpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiT3B0aW9uIGJlZm9yZVNlbmQgbm90IHN1cHBvcnRlZCBvbiBzZXJ2ZXIuXCIpO1xuICB9XG5cbiAgbWV0aG9kID0gKG1ldGhvZCB8fCBcIlwiKS50b1VwcGVyQ2FzZSgpO1xuXG4gIGlmICghIC9eaHR0cHM/OlxcL1xcLy8udGVzdCh1cmwpKVxuICAgIHRocm93IG5ldyBFcnJvcihcInVybCBtdXN0IGJlIGFic29sdXRlIGFuZCBzdGFydCB3aXRoIGh0dHA6Ly8gb3IgaHR0cHM6Ly9cIik7XG5cbiAgdmFyIGhlYWRlcnMgPSB7fTtcblxuICB2YXIgY29udGVudCA9IG9wdGlvbnMuY29udGVudDtcbiAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgIGNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShvcHRpb25zLmRhdGEpO1xuICAgIGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddID0gJ2FwcGxpY2F0aW9uL2pzb24nO1xuICB9XG5cblxuICB2YXIgcGFyYW1zRm9yVXJsLCBwYXJhbXNGb3JCb2R5O1xuICBpZiAoY29udGVudCB8fCBtZXRob2QgPT09IFwiR0VUXCIgfHwgbWV0aG9kID09PSBcIkhFQURcIilcbiAgICBwYXJhbXNGb3JVcmwgPSBvcHRpb25zLnBhcmFtcztcbiAgZWxzZVxuICAgIHBhcmFtc0ZvckJvZHkgPSBvcHRpb25zLnBhcmFtcztcblxuICB2YXIgbmV3VXJsID0gVVJMLl9jb25zdHJ1Y3RVcmwodXJsLCBvcHRpb25zLnF1ZXJ5LCBwYXJhbXNGb3JVcmwpO1xuXG4gIGlmIChvcHRpb25zLmF1dGgpIHtcbiAgICBpZiAob3B0aW9ucy5hdXRoLmluZGV4T2YoJzonKSA8IDApXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2F1dGggb3B0aW9uIHNob3VsZCBiZSBvZiB0aGUgZm9ybSBcInVzZXJuYW1lOnBhc3N3b3JkXCInKTtcbiAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSBcIkJhc2ljIFwiK1xuICAgICAgQnVmZmVyLmZyb20ob3B0aW9ucy5hdXRoLCBcImFzY2lpXCIpLnRvU3RyaW5nKFwiYmFzZTY0XCIpO1xuICB9XG5cbiAgaWYgKHBhcmFtc0ZvckJvZHkpIHtcbiAgICBjb250ZW50ID0gVVJMLl9lbmNvZGVQYXJhbXMocGFyYW1zRm9yQm9keSk7XG4gICAgaGVhZGVyc1snQ29udGVudC1UeXBlJ10gPSBcImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZFwiO1xuICB9XG5cbiAgXy5leHRlbmQoaGVhZGVycywgb3B0aW9ucy5oZWFkZXJzIHx8IHt9KTtcblxuICAvLyB3cmFwIGNhbGxiYWNrIHRvIGFkZCBhICdyZXNwb25zZScgcHJvcGVydHkgb24gYW4gZXJyb3IsIGluIGNhc2VcbiAgLy8gd2UgaGF2ZSBib3RoIChodHRwIDR4eC81eHggZXJyb3IsIHdoaWNoIGhhcyBhIHJlc3BvbnNlIHBheWxvYWQpXG4gIGNhbGxiYWNrID0gKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGVycm9yLCByZXNwb25zZSkge1xuICAgICAgaWYgKGVycm9yICYmIHJlc3BvbnNlKVxuICAgICAgICBlcnJvci5yZXNwb25zZSA9IHJlc3BvbnNlO1xuICAgICAgY2FsbGJhY2soZXJyb3IsIHJlc3BvbnNlKTtcbiAgICB9O1xuICB9KShjYWxsYmFjayk7XG5cbiAgLy8gc2FmZXR5IGJlbHQ6IG9ubHkgY2FsbCB0aGUgY2FsbGJhY2sgb25jZS5cbiAgY2FsbGJhY2sgPSBfLm9uY2UoY2FsbGJhY2spO1xuXG5cbiAgLy8vLy8vLy8vLyBLaWNrb2ZmISAvLy8vLy8vLy8vXG5cbiAgLy8gQWxsb3cgdXNlcnMgdG8gb3ZlcnJpZGUgYW55IHJlcXVlc3Qgb3B0aW9uIHdpdGggdGhlIG5wbVJlcXVlc3RPcHRpb25zXG4gIC8vIG9wdGlvbi5cbiAgdmFyIHJlcU9wdGlvbnMgPSBfLmV4dGVuZCh7XG4gICAgdXJsOiBuZXdVcmwsXG4gICAgbWV0aG9kOiBtZXRob2QsXG4gICAgZW5jb2Rpbmc6IFwidXRmOFwiLFxuICAgIGphcjogZmFsc2UsXG4gICAgdGltZW91dDogb3B0aW9ucy50aW1lb3V0LFxuICAgIGJvZHk6IGNvbnRlbnQsXG4gICAgZm9sbG93UmVkaXJlY3Q6IG9wdGlvbnMuZm9sbG93UmVkaXJlY3RzLFxuICAgIC8vIEZvbGxvdyByZWRpcmVjdHMgb24gbm9uLUdFVCByZXF1ZXN0c1xuICAgIC8vIGFsc28uIChodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci9pc3N1ZXMvMjgwOClcbiAgICBmb2xsb3dBbGxSZWRpcmVjdHM6IG9wdGlvbnMuZm9sbG93UmVkaXJlY3RzLFxuICAgIGhlYWRlcnM6IGhlYWRlcnNcbiAgfSwgb3B0aW9ucy5ucG1SZXF1ZXN0T3B0aW9ucyB8fCB7fSk7XG5cbiAgcmVxdWVzdChyZXFPcHRpb25zLCBmdW5jdGlvbihlcnJvciwgcmVzLCBib2R5KSB7XG4gICAgdmFyIHJlc3BvbnNlID0gbnVsbDtcblxuICAgIGlmICghIGVycm9yKSB7XG5cbiAgICAgIHJlc3BvbnNlID0ge307XG4gICAgICByZXNwb25zZS5zdGF0dXNDb2RlID0gcmVzLnN0YXR1c0NvZGU7XG4gICAgICByZXNwb25zZS5jb250ZW50ID0gYm9keTtcbiAgICAgIHJlc3BvbnNlLmhlYWRlcnMgPSByZXMuaGVhZGVycztcblxuICAgICAgcG9wdWxhdGVEYXRhKHJlc3BvbnNlKTtcblxuICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPj0gNDAwKVxuICAgICAgICBlcnJvciA9IG1ha2VFcnJvckJ5U3RhdHVzKHJlc3BvbnNlLnN0YXR1c0NvZGUsIHJlc3BvbnNlLmNvbnRlbnQpO1xuICAgIH1cblxuICAgIGNhbGxiYWNrKGVycm9yLCByZXNwb25zZSk7XG5cbiAgfSk7XG59O1xuXG5IVFRQLmNhbGwgPSBNZXRlb3Iud3JhcEFzeW5jKF9jYWxsKTtcbiIsIi8vIFRoZSBIVFRQIG9iamVjdCB1c2VkIHRvIGJlIGNhbGxlZCBNZXRlb3IuaHR0cC5cbi8vIFhYWCBDT01QQVQgV0lUSCAwLjYuNFxuTWV0ZW9yLmh0dHAgPSBIVFRQO1xuIl19
