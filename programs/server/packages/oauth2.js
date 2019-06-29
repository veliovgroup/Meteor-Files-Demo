(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var Random = Package.random.Random;
var OAuth = Package.oauth.OAuth;
var Oauth = Package.oauth.Oauth;
var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"oauth2":{"oauth2_server.js":function(){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/oauth2/oauth2_server.js                                  //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
// connect middleware
OAuth._requestHandlers['2'] = (service, query, res) => {
  let credentialSecret; // check if user authorized access

  if (!query.error) {
    // Prepare the login results before returning.
    // Run service-specific handler.
    const oauthResult = service.handleOauthRequest(query);
    credentialSecret = Random.secret();

    const credentialToken = OAuth._credentialTokenFromQuery(query); // Store the login result so it can be retrieved in another
    // browser tab by the result handler


    OAuth._storePendingCredential(credentialToken, {
      serviceName: service.serviceName,
      serviceData: oauthResult.serviceData,
      options: oauthResult.options
    }, credentialSecret);
  } // Either close the window, redirect, or render nothing
  // if all else fails


  OAuth._renderOauthResults(res, query, credentialSecret);
};
///////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/oauth2/oauth2_server.js");

/* Exports */
Package._define("oauth2");

})();

//# sourceURL=meteor://💻app/packages/oauth2.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb2F1dGgyL29hdXRoMl9zZXJ2ZXIuanMiXSwibmFtZXMiOlsiT0F1dGgiLCJfcmVxdWVzdEhhbmRsZXJzIiwic2VydmljZSIsInF1ZXJ5IiwicmVzIiwiY3JlZGVudGlhbFNlY3JldCIsImVycm9yIiwib2F1dGhSZXN1bHQiLCJoYW5kbGVPYXV0aFJlcXVlc3QiLCJSYW5kb20iLCJzZWNyZXQiLCJjcmVkZW50aWFsVG9rZW4iLCJfY3JlZGVudGlhbFRva2VuRnJvbVF1ZXJ5IiwiX3N0b3JlUGVuZGluZ0NyZWRlbnRpYWwiLCJzZXJ2aWNlTmFtZSIsInNlcnZpY2VEYXRhIiwib3B0aW9ucyIsIl9yZW5kZXJPYXV0aFJlc3VsdHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQUEsS0FBSyxDQUFDQyxnQkFBTixDQUF1QixHQUF2QixJQUE4QixDQUFDQyxPQUFELEVBQVVDLEtBQVYsRUFBaUJDLEdBQWpCLEtBQXlCO0FBQ3JELE1BQUlDLGdCQUFKLENBRHFELENBR3JEOztBQUNBLE1BQUksQ0FBQ0YsS0FBSyxDQUFDRyxLQUFYLEVBQWtCO0FBQ2hCO0FBRUE7QUFDQSxVQUFNQyxXQUFXLEdBQUdMLE9BQU8sQ0FBQ00sa0JBQVIsQ0FBMkJMLEtBQTNCLENBQXBCO0FBQ0FFLG9CQUFnQixHQUFHSSxNQUFNLENBQUNDLE1BQVAsRUFBbkI7O0FBRUEsVUFBTUMsZUFBZSxHQUFHWCxLQUFLLENBQUNZLHlCQUFOLENBQWdDVCxLQUFoQyxDQUF4QixDQVBnQixDQVNoQjtBQUNBOzs7QUFDQUgsU0FBSyxDQUFDYSx1QkFBTixDQUE4QkYsZUFBOUIsRUFBK0M7QUFDN0NHLGlCQUFXLEVBQUVaLE9BQU8sQ0FBQ1ksV0FEd0I7QUFFN0NDLGlCQUFXLEVBQUVSLFdBQVcsQ0FBQ1EsV0FGb0I7QUFHN0NDLGFBQU8sRUFBRVQsV0FBVyxDQUFDUztBQUh3QixLQUEvQyxFQUlHWCxnQkFKSDtBQUtELEdBcEJvRCxDQXNCckQ7QUFDQTs7O0FBQ0FMLE9BQUssQ0FBQ2lCLG1CQUFOLENBQTBCYixHQUExQixFQUErQkQsS0FBL0IsRUFBc0NFLGdCQUF0QztBQUNELENBekJELEMiLCJmaWxlIjoiL3BhY2thZ2VzL29hdXRoMi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGNvbm5lY3QgbWlkZGxld2FyZVxuT0F1dGguX3JlcXVlc3RIYW5kbGVyc1snMiddID0gKHNlcnZpY2UsIHF1ZXJ5LCByZXMpID0+IHtcbiAgbGV0IGNyZWRlbnRpYWxTZWNyZXQ7XG5cbiAgLy8gY2hlY2sgaWYgdXNlciBhdXRob3JpemVkIGFjY2Vzc1xuICBpZiAoIXF1ZXJ5LmVycm9yKSB7XG4gICAgLy8gUHJlcGFyZSB0aGUgbG9naW4gcmVzdWx0cyBiZWZvcmUgcmV0dXJuaW5nLlxuXG4gICAgLy8gUnVuIHNlcnZpY2Utc3BlY2lmaWMgaGFuZGxlci5cbiAgICBjb25zdCBvYXV0aFJlc3VsdCA9IHNlcnZpY2UuaGFuZGxlT2F1dGhSZXF1ZXN0KHF1ZXJ5KTtcbiAgICBjcmVkZW50aWFsU2VjcmV0ID0gUmFuZG9tLnNlY3JldCgpO1xuXG4gICAgY29uc3QgY3JlZGVudGlhbFRva2VuID0gT0F1dGguX2NyZWRlbnRpYWxUb2tlbkZyb21RdWVyeShxdWVyeSk7XG5cbiAgICAvLyBTdG9yZSB0aGUgbG9naW4gcmVzdWx0IHNvIGl0IGNhbiBiZSByZXRyaWV2ZWQgaW4gYW5vdGhlclxuICAgIC8vIGJyb3dzZXIgdGFiIGJ5IHRoZSByZXN1bHQgaGFuZGxlclxuICAgIE9BdXRoLl9zdG9yZVBlbmRpbmdDcmVkZW50aWFsKGNyZWRlbnRpYWxUb2tlbiwge1xuICAgICAgc2VydmljZU5hbWU6IHNlcnZpY2Uuc2VydmljZU5hbWUsXG4gICAgICBzZXJ2aWNlRGF0YTogb2F1dGhSZXN1bHQuc2VydmljZURhdGEsXG4gICAgICBvcHRpb25zOiBvYXV0aFJlc3VsdC5vcHRpb25zXG4gICAgfSwgY3JlZGVudGlhbFNlY3JldCk7XG4gIH1cblxuICAvLyBFaXRoZXIgY2xvc2UgdGhlIHdpbmRvdywgcmVkaXJlY3QsIG9yIHJlbmRlciBub3RoaW5nXG4gIC8vIGlmIGFsbCBlbHNlIGZhaWxzXG4gIE9BdXRoLl9yZW5kZXJPYXV0aFJlc3VsdHMocmVzLCBxdWVyeSwgY3JlZGVudGlhbFNlY3JldCk7XG59O1xuIl19
