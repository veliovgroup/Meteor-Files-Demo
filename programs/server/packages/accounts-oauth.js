(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var check = Package.check.check;
var Match = Package.check.Match;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var Accounts = Package['accounts-base'].Accounts;
var ECMAScript = Package.ecmascript.ECMAScript;
var OAuth = Package.oauth.OAuth;
var Oauth = Package.oauth.Oauth;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"accounts-oauth":{"oauth_common.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/accounts-oauth/oauth_common.js                                                                         //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
Accounts.oauth = {};
const services = {};
const hasOwn = Object.prototype.hasOwnProperty; // Helper for registering OAuth based accounts packages.
// On the server, adds an index to the user collection.

Accounts.oauth.registerService = name => {
  if (hasOwn.call(services, name)) throw new Error(`Duplicate service: ${name}`);
  services[name] = true;

  if (Meteor.server) {
    // Accounts.updateOrCreateUserFromExternalService does a lookup by this id,
    // so this should be a unique index. You might want to add indexes for other
    // fields returned by your service (eg services.github.login) but you can do
    // that in your app.
    Meteor.users._ensureIndex(`services.${name}.id`, {
      unique: 1,
      sparse: 1
    });
  }
}; // Removes a previously registered service.
// This will disable logging in with this service, and serviceNames() will not
// contain it.
// It's worth noting that already logged in users will remain logged in unless
// you manually expire their sessions.


Accounts.oauth.unregisterService = name => {
  if (!hasOwn.call(services, name)) throw new Error(`Service not found: ${name}`);
  delete services[name];
};

Accounts.oauth.serviceNames = () => Object.keys(services);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oauth_server.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/accounts-oauth/oauth_server.js                                                                         //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
// Listen to calls to `login` with an oauth option set. This is where
// users actually get logged in to meteor via oauth.
Accounts.registerLoginHandler(options => {
  if (!options.oauth) return undefined; // don't handle

  check(options.oauth, {
    credentialToken: String,
    // When an error occurs while retrieving the access token, we store
    // the error in the pending credentials table, with a secret of
    // null. The client can call the login method with a secret of null
    // to retrieve the error.
    credentialSecret: Match.OneOf(null, String)
  });
  const result = OAuth.retrieveCredential(options.oauth.credentialToken, options.oauth.credentialSecret);

  if (!result) {
    // OAuth credentialToken is not recognized, which could be either
    // because the popup was closed by the user before completion, or
    // some sort of error where the oauth provider didn't talk to our
    // server correctly and closed the popup somehow.
    //
    // We assume it was user canceled and report it as such, using a
    // numeric code that the client recognizes (XXX this will get
    // replaced by a symbolic error code at some point
    // https://trello.com/c/kMkw800Z/53-official-ddp-specification). This
    // will mask failures where things are misconfigured such that the
    // server doesn't see the request but does close the window. This
    // seems unlikely.
    //
    // XXX we want `type` to be the service name such as "facebook"
    return {
      type: "oauth",
      error: new Meteor.Error(Accounts.LoginCancelledError.numericError, "No matching login attempt found")
    };
  }

  if (result instanceof Error) // We tried to login, but there was a fatal error. Report it back
    // to the user.
    throw result;else {
    if (!Accounts.oauth.serviceNames().includes(result.serviceName)) {
      // serviceName was not found in the registered services list.
      // This could happen because the service never registered itself or
      // unregisterService was called on it.
      return {
        type: "oauth",
        error: new Meteor.Error(Accounts.LoginCancelledError.numericError, `No registered oauth service found for: ${result.serviceName}`)
      };
    }

    return Accounts.updateOrCreateUserFromExternalService(result.serviceName, result.serviceData, result.options);
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/accounts-oauth/oauth_common.js");
require("/node_modules/meteor/accounts-oauth/oauth_server.js");

/* Exports */
Package._define("accounts-oauth");

})();

//# sourceURL=meteor://💻app/packages/accounts-oauth.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWNjb3VudHMtb2F1dGgvb2F1dGhfY29tbW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9hY2NvdW50cy1vYXV0aC9vYXV0aF9zZXJ2ZXIuanMiXSwibmFtZXMiOlsiQWNjb3VudHMiLCJvYXV0aCIsInNlcnZpY2VzIiwiaGFzT3duIiwiT2JqZWN0IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJyZWdpc3RlclNlcnZpY2UiLCJuYW1lIiwiY2FsbCIsIkVycm9yIiwiTWV0ZW9yIiwic2VydmVyIiwidXNlcnMiLCJfZW5zdXJlSW5kZXgiLCJ1bmlxdWUiLCJzcGFyc2UiLCJ1bnJlZ2lzdGVyU2VydmljZSIsInNlcnZpY2VOYW1lcyIsImtleXMiLCJyZWdpc3RlckxvZ2luSGFuZGxlciIsIm9wdGlvbnMiLCJ1bmRlZmluZWQiLCJjaGVjayIsImNyZWRlbnRpYWxUb2tlbiIsIlN0cmluZyIsImNyZWRlbnRpYWxTZWNyZXQiLCJNYXRjaCIsIk9uZU9mIiwicmVzdWx0IiwiT0F1dGgiLCJyZXRyaWV2ZUNyZWRlbnRpYWwiLCJ0eXBlIiwiZXJyb3IiLCJMb2dpbkNhbmNlbGxlZEVycm9yIiwibnVtZXJpY0Vycm9yIiwiaW5jbHVkZXMiLCJzZXJ2aWNlTmFtZSIsInVwZGF0ZU9yQ3JlYXRlVXNlckZyb21FeHRlcm5hbFNlcnZpY2UiLCJzZXJ2aWNlRGF0YSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLFFBQVEsQ0FBQ0MsS0FBVCxHQUFpQixFQUFqQjtBQUVBLE1BQU1DLFFBQVEsR0FBRyxFQUFqQjtBQUNBLE1BQU1DLE1BQU0sR0FBR0MsTUFBTSxDQUFDQyxTQUFQLENBQWlCQyxjQUFoQyxDLENBRUE7QUFDQTs7QUFDQU4sUUFBUSxDQUFDQyxLQUFULENBQWVNLGVBQWYsR0FBaUNDLElBQUksSUFBSTtBQUN2QyxNQUFJTCxNQUFNLENBQUNNLElBQVAsQ0FBWVAsUUFBWixFQUFzQk0sSUFBdEIsQ0FBSixFQUNFLE1BQU0sSUFBSUUsS0FBSixDQUFXLHNCQUFxQkYsSUFBSyxFQUFyQyxDQUFOO0FBQ0ZOLFVBQVEsQ0FBQ00sSUFBRCxDQUFSLEdBQWlCLElBQWpCOztBQUVBLE1BQUlHLE1BQU0sQ0FBQ0MsTUFBWCxFQUFtQjtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBRCxVQUFNLENBQUNFLEtBQVAsQ0FBYUMsWUFBYixDQUEyQixZQUFXTixJQUFLLEtBQTNDLEVBQWlEO0FBQUNPLFlBQU0sRUFBRSxDQUFUO0FBQVlDLFlBQU0sRUFBRTtBQUFwQixLQUFqRDtBQUNEO0FBQ0YsQ0FaRCxDLENBY0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0FoQixRQUFRLENBQUNDLEtBQVQsQ0FBZWdCLGlCQUFmLEdBQW1DVCxJQUFJLElBQUk7QUFDekMsTUFBSSxDQUFDTCxNQUFNLENBQUNNLElBQVAsQ0FBWVAsUUFBWixFQUFzQk0sSUFBdEIsQ0FBTCxFQUNFLE1BQU0sSUFBSUUsS0FBSixDQUFXLHNCQUFxQkYsSUFBSyxFQUFyQyxDQUFOO0FBQ0YsU0FBT04sUUFBUSxDQUFDTSxJQUFELENBQWY7QUFDRCxDQUpEOztBQU1BUixRQUFRLENBQUNDLEtBQVQsQ0FBZWlCLFlBQWYsR0FBOEIsTUFBTWQsTUFBTSxDQUFDZSxJQUFQLENBQVlqQixRQUFaLENBQXBDLEM7Ozs7Ozs7Ozs7O0FDaENBO0FBQ0E7QUFDQUYsUUFBUSxDQUFDb0Isb0JBQVQsQ0FBOEJDLE9BQU8sSUFBSTtBQUN2QyxNQUFJLENBQUNBLE9BQU8sQ0FBQ3BCLEtBQWIsRUFDRSxPQUFPcUIsU0FBUCxDQUZxQyxDQUVuQjs7QUFFcEJDLE9BQUssQ0FBQ0YsT0FBTyxDQUFDcEIsS0FBVCxFQUFnQjtBQUNuQnVCLG1CQUFlLEVBQUVDLE1BREU7QUFFbkI7QUFDQTtBQUNBO0FBQ0E7QUFDQUMsb0JBQWdCLEVBQUVDLEtBQUssQ0FBQ0MsS0FBTixDQUFZLElBQVosRUFBa0JILE1BQWxCO0FBTkMsR0FBaEIsQ0FBTDtBQVNBLFFBQU1JLE1BQU0sR0FBR0MsS0FBSyxDQUFDQyxrQkFBTixDQUF5QlYsT0FBTyxDQUFDcEIsS0FBUixDQUFjdUIsZUFBdkMsRUFDdUJILE9BQU8sQ0FBQ3BCLEtBQVIsQ0FBY3lCLGdCQURyQyxDQUFmOztBQUdBLE1BQUksQ0FBQ0csTUFBTCxFQUFhO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQU87QUFBRUcsVUFBSSxFQUFFLE9BQVI7QUFDRUMsV0FBSyxFQUFFLElBQUl0QixNQUFNLENBQUNELEtBQVgsQ0FDTFYsUUFBUSxDQUFDa0MsbUJBQVQsQ0FBNkJDLFlBRHhCLEVBRUwsaUNBRks7QUFEVCxLQUFQO0FBSUQ7O0FBRUQsTUFBSU4sTUFBTSxZQUFZbkIsS0FBdEIsRUFDRTtBQUNBO0FBQ0EsVUFBTW1CLE1BQU4sQ0FIRixLQUlLO0FBQ0gsUUFBSSxDQUFFN0IsUUFBUSxDQUFDQyxLQUFULENBQWVpQixZQUFmLEdBQThCa0IsUUFBOUIsQ0FBdUNQLE1BQU0sQ0FBQ1EsV0FBOUMsQ0FBTixFQUFrRTtBQUNoRTtBQUNBO0FBQ0E7QUFDQSxhQUFPO0FBQUVMLFlBQUksRUFBRSxPQUFSO0FBQ0VDLGFBQUssRUFBRSxJQUFJdEIsTUFBTSxDQUFDRCxLQUFYLENBQ0xWLFFBQVEsQ0FBQ2tDLG1CQUFULENBQTZCQyxZQUR4QixFQUVKLDBDQUF5Q04sTUFBTSxDQUFDUSxXQUFZLEVBRnhEO0FBRFQsT0FBUDtBQUtEOztBQUNELFdBQU9yQyxRQUFRLENBQUNzQyxxQ0FBVCxDQUErQ1QsTUFBTSxDQUFDUSxXQUF0RCxFQUFtRVIsTUFBTSxDQUFDVSxXQUExRSxFQUF1RlYsTUFBTSxDQUFDUixPQUE5RixDQUFQO0FBQ0Q7QUFDRixDQXRERCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9hY2NvdW50cy1vYXV0aC5qcyIsInNvdXJjZXNDb250ZW50IjpbIkFjY291bnRzLm9hdXRoID0ge307XG5cbmNvbnN0IHNlcnZpY2VzID0ge307XG5jb25zdCBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG4vLyBIZWxwZXIgZm9yIHJlZ2lzdGVyaW5nIE9BdXRoIGJhc2VkIGFjY291bnRzIHBhY2thZ2VzLlxuLy8gT24gdGhlIHNlcnZlciwgYWRkcyBhbiBpbmRleCB0byB0aGUgdXNlciBjb2xsZWN0aW9uLlxuQWNjb3VudHMub2F1dGgucmVnaXN0ZXJTZXJ2aWNlID0gbmFtZSA9PiB7XG4gIGlmIChoYXNPd24uY2FsbChzZXJ2aWNlcywgbmFtZSkpXG4gICAgdGhyb3cgbmV3IEVycm9yKGBEdXBsaWNhdGUgc2VydmljZTogJHtuYW1lfWApO1xuICBzZXJ2aWNlc1tuYW1lXSA9IHRydWU7XG5cbiAgaWYgKE1ldGVvci5zZXJ2ZXIpIHtcbiAgICAvLyBBY2NvdW50cy51cGRhdGVPckNyZWF0ZVVzZXJGcm9tRXh0ZXJuYWxTZXJ2aWNlIGRvZXMgYSBsb29rdXAgYnkgdGhpcyBpZCxcbiAgICAvLyBzbyB0aGlzIHNob3VsZCBiZSBhIHVuaXF1ZSBpbmRleC4gWW91IG1pZ2h0IHdhbnQgdG8gYWRkIGluZGV4ZXMgZm9yIG90aGVyXG4gICAgLy8gZmllbGRzIHJldHVybmVkIGJ5IHlvdXIgc2VydmljZSAoZWcgc2VydmljZXMuZ2l0aHViLmxvZ2luKSBidXQgeW91IGNhbiBkb1xuICAgIC8vIHRoYXQgaW4geW91ciBhcHAuXG4gICAgTWV0ZW9yLnVzZXJzLl9lbnN1cmVJbmRleChgc2VydmljZXMuJHtuYW1lfS5pZGAsIHt1bmlxdWU6IDEsIHNwYXJzZTogMX0pO1xuICB9XG59O1xuXG4vLyBSZW1vdmVzIGEgcHJldmlvdXNseSByZWdpc3RlcmVkIHNlcnZpY2UuXG4vLyBUaGlzIHdpbGwgZGlzYWJsZSBsb2dnaW5nIGluIHdpdGggdGhpcyBzZXJ2aWNlLCBhbmQgc2VydmljZU5hbWVzKCkgd2lsbCBub3Rcbi8vIGNvbnRhaW4gaXQuXG4vLyBJdCdzIHdvcnRoIG5vdGluZyB0aGF0IGFscmVhZHkgbG9nZ2VkIGluIHVzZXJzIHdpbGwgcmVtYWluIGxvZ2dlZCBpbiB1bmxlc3Ncbi8vIHlvdSBtYW51YWxseSBleHBpcmUgdGhlaXIgc2Vzc2lvbnMuXG5BY2NvdW50cy5vYXV0aC51bnJlZ2lzdGVyU2VydmljZSA9IG5hbWUgPT4ge1xuICBpZiAoIWhhc093bi5jYWxsKHNlcnZpY2VzLCBuYW1lKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFNlcnZpY2Ugbm90IGZvdW5kOiAke25hbWV9YCk7XG4gIGRlbGV0ZSBzZXJ2aWNlc1tuYW1lXTtcbn07XG5cbkFjY291bnRzLm9hdXRoLnNlcnZpY2VOYW1lcyA9ICgpID0+IE9iamVjdC5rZXlzKHNlcnZpY2VzKTtcbiIsIi8vIExpc3RlbiB0byBjYWxscyB0byBgbG9naW5gIHdpdGggYW4gb2F1dGggb3B0aW9uIHNldC4gVGhpcyBpcyB3aGVyZVxuLy8gdXNlcnMgYWN0dWFsbHkgZ2V0IGxvZ2dlZCBpbiB0byBtZXRlb3IgdmlhIG9hdXRoLlxuQWNjb3VudHMucmVnaXN0ZXJMb2dpbkhhbmRsZXIob3B0aW9ucyA9PiB7XG4gIGlmICghb3B0aW9ucy5vYXV0aClcbiAgICByZXR1cm4gdW5kZWZpbmVkOyAvLyBkb24ndCBoYW5kbGVcblxuICBjaGVjayhvcHRpb25zLm9hdXRoLCB7XG4gICAgY3JlZGVudGlhbFRva2VuOiBTdHJpbmcsXG4gICAgLy8gV2hlbiBhbiBlcnJvciBvY2N1cnMgd2hpbGUgcmV0cmlldmluZyB0aGUgYWNjZXNzIHRva2VuLCB3ZSBzdG9yZVxuICAgIC8vIHRoZSBlcnJvciBpbiB0aGUgcGVuZGluZyBjcmVkZW50aWFscyB0YWJsZSwgd2l0aCBhIHNlY3JldCBvZlxuICAgIC8vIG51bGwuIFRoZSBjbGllbnQgY2FuIGNhbGwgdGhlIGxvZ2luIG1ldGhvZCB3aXRoIGEgc2VjcmV0IG9mIG51bGxcbiAgICAvLyB0byByZXRyaWV2ZSB0aGUgZXJyb3IuXG4gICAgY3JlZGVudGlhbFNlY3JldDogTWF0Y2guT25lT2YobnVsbCwgU3RyaW5nKVxuICB9KTtcblxuICBjb25zdCByZXN1bHQgPSBPQXV0aC5yZXRyaWV2ZUNyZWRlbnRpYWwob3B0aW9ucy5vYXV0aC5jcmVkZW50aWFsVG9rZW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy5vYXV0aC5jcmVkZW50aWFsU2VjcmV0KTtcblxuICBpZiAoIXJlc3VsdCkge1xuICAgIC8vIE9BdXRoIGNyZWRlbnRpYWxUb2tlbiBpcyBub3QgcmVjb2duaXplZCwgd2hpY2ggY291bGQgYmUgZWl0aGVyXG4gICAgLy8gYmVjYXVzZSB0aGUgcG9wdXAgd2FzIGNsb3NlZCBieSB0aGUgdXNlciBiZWZvcmUgY29tcGxldGlvbiwgb3JcbiAgICAvLyBzb21lIHNvcnQgb2YgZXJyb3Igd2hlcmUgdGhlIG9hdXRoIHByb3ZpZGVyIGRpZG4ndCB0YWxrIHRvIG91clxuICAgIC8vIHNlcnZlciBjb3JyZWN0bHkgYW5kIGNsb3NlZCB0aGUgcG9wdXAgc29tZWhvdy5cbiAgICAvL1xuICAgIC8vIFdlIGFzc3VtZSBpdCB3YXMgdXNlciBjYW5jZWxlZCBhbmQgcmVwb3J0IGl0IGFzIHN1Y2gsIHVzaW5nIGFcbiAgICAvLyBudW1lcmljIGNvZGUgdGhhdCB0aGUgY2xpZW50IHJlY29nbml6ZXMgKFhYWCB0aGlzIHdpbGwgZ2V0XG4gICAgLy8gcmVwbGFjZWQgYnkgYSBzeW1ib2xpYyBlcnJvciBjb2RlIGF0IHNvbWUgcG9pbnRcbiAgICAvLyBodHRwczovL3RyZWxsby5jb20vYy9rTWt3ODAwWi81My1vZmZpY2lhbC1kZHAtc3BlY2lmaWNhdGlvbikuIFRoaXNcbiAgICAvLyB3aWxsIG1hc2sgZmFpbHVyZXMgd2hlcmUgdGhpbmdzIGFyZSBtaXNjb25maWd1cmVkIHN1Y2ggdGhhdCB0aGVcbiAgICAvLyBzZXJ2ZXIgZG9lc24ndCBzZWUgdGhlIHJlcXVlc3QgYnV0IGRvZXMgY2xvc2UgdGhlIHdpbmRvdy4gVGhpc1xuICAgIC8vIHNlZW1zIHVubGlrZWx5LlxuICAgIC8vXG4gICAgLy8gWFhYIHdlIHdhbnQgYHR5cGVgIHRvIGJlIHRoZSBzZXJ2aWNlIG5hbWUgc3VjaCBhcyBcImZhY2Vib29rXCJcbiAgICByZXR1cm4geyB0eXBlOiBcIm9hdXRoXCIsXG4gICAgICAgICAgICAgZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoXG4gICAgICAgICAgICAgICBBY2NvdW50cy5Mb2dpbkNhbmNlbGxlZEVycm9yLm51bWVyaWNFcnJvcixcbiAgICAgICAgICAgICAgIFwiTm8gbWF0Y2hpbmcgbG9naW4gYXR0ZW1wdCBmb3VuZFwiKSB9O1xuICB9XG5cbiAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIEVycm9yKVxuICAgIC8vIFdlIHRyaWVkIHRvIGxvZ2luLCBidXQgdGhlcmUgd2FzIGEgZmF0YWwgZXJyb3IuIFJlcG9ydCBpdCBiYWNrXG4gICAgLy8gdG8gdGhlIHVzZXIuXG4gICAgdGhyb3cgcmVzdWx0O1xuICBlbHNlIHtcbiAgICBpZiAoISBBY2NvdW50cy5vYXV0aC5zZXJ2aWNlTmFtZXMoKS5pbmNsdWRlcyhyZXN1bHQuc2VydmljZU5hbWUpKSB7XG4gICAgICAvLyBzZXJ2aWNlTmFtZSB3YXMgbm90IGZvdW5kIGluIHRoZSByZWdpc3RlcmVkIHNlcnZpY2VzIGxpc3QuXG4gICAgICAvLyBUaGlzIGNvdWxkIGhhcHBlbiBiZWNhdXNlIHRoZSBzZXJ2aWNlIG5ldmVyIHJlZ2lzdGVyZWQgaXRzZWxmIG9yXG4gICAgICAvLyB1bnJlZ2lzdGVyU2VydmljZSB3YXMgY2FsbGVkIG9uIGl0LlxuICAgICAgcmV0dXJuIHsgdHlwZTogXCJvYXV0aFwiLFxuICAgICAgICAgICAgICAgZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoXG4gICAgICAgICAgICAgICAgIEFjY291bnRzLkxvZ2luQ2FuY2VsbGVkRXJyb3IubnVtZXJpY0Vycm9yLFxuICAgICAgICAgICAgICAgICBgTm8gcmVnaXN0ZXJlZCBvYXV0aCBzZXJ2aWNlIGZvdW5kIGZvcjogJHtyZXN1bHQuc2VydmljZU5hbWV9YCkgfTtcblxuICAgIH1cbiAgICByZXR1cm4gQWNjb3VudHMudXBkYXRlT3JDcmVhdGVVc2VyRnJvbUV4dGVybmFsU2VydmljZShyZXN1bHQuc2VydmljZU5hbWUsIHJlc3VsdC5zZXJ2aWNlRGF0YSwgcmVzdWx0Lm9wdGlvbnMpO1xuICB9XG59KTtcbiJdfQ==
