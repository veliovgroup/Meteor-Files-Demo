(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var Accounts = Package['accounts-base'].Accounts;
var Twitter = Package['twitter-oauth'].Twitter;
var HTTP = Package.http.HTTP;
var HTTPInternals = Package.http.HTTPInternals;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"accounts-twitter":{"notice.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                        //
// packages/accounts-twitter/notice.js                                                                    //
//                                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                          //
if (Package['accounts-ui'] && !Package['service-configuration'] && !Object.prototype.hasOwnProperty.call(Package, 'twitter-config-ui')) {
  console.warn("Note: You're using accounts-ui and accounts-twitter,\n" + "but didn't install the configuration UI for Twitter\n" + "OAuth. You can install it with:\n" + "\n" + "    meteor add twitter-config-ui" + "\n");
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"twitter.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                        //
// packages/accounts-twitter/twitter.js                                                                   //
//                                                                                                        //
////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                          //
Accounts.oauth.registerService('twitter');

if (Meteor.isClient) {
  const loginWithTwitter = (options, callback) => {
    // support a callback without options
    if (!callback && typeof options === "function") {
      callback = options;
      options = null;
    }

    const credentialRequestCompleteCallback = Accounts.oauth.credentialRequestCompleteHandler(callback);
    Twitter.requestCredential(options, credentialRequestCompleteCallback);
  };

  Accounts.registerClientLoginFunction('twitter', loginWithTwitter);

  Meteor.loginWithTwitter = (...args) => Accounts.applyLoginFunction('twitter', args);
} else {
  const autopublishedFields = // don't send access token. https://dev.twitter.com/discussions/5025
  Twitter.whitelistedFields.concat(['id', 'screenName']).map(subfield => `services.twitter.${subfield}`);
  Accounts.addAutopublishFields({
    forLoggedInUser: autopublishedFields,
    forOtherUsers: autopublishedFields
  });
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/accounts-twitter/notice.js");
require("/node_modules/meteor/accounts-twitter/twitter.js");

/* Exports */
Package._define("accounts-twitter");

})();

//# sourceURL=meteor://💻app/packages/accounts-twitter.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWNjb3VudHMtdHdpdHRlci9ub3RpY2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2FjY291bnRzLXR3aXR0ZXIvdHdpdHRlci5qcyJdLCJuYW1lcyI6WyJQYWNrYWdlIiwiT2JqZWN0IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwiY29uc29sZSIsIndhcm4iLCJBY2NvdW50cyIsIm9hdXRoIiwicmVnaXN0ZXJTZXJ2aWNlIiwiTWV0ZW9yIiwiaXNDbGllbnQiLCJsb2dpbldpdGhUd2l0dGVyIiwib3B0aW9ucyIsImNhbGxiYWNrIiwiY3JlZGVudGlhbFJlcXVlc3RDb21wbGV0ZUNhbGxiYWNrIiwiY3JlZGVudGlhbFJlcXVlc3RDb21wbGV0ZUhhbmRsZXIiLCJUd2l0dGVyIiwicmVxdWVzdENyZWRlbnRpYWwiLCJyZWdpc3RlckNsaWVudExvZ2luRnVuY3Rpb24iLCJhcmdzIiwiYXBwbHlMb2dpbkZ1bmN0aW9uIiwiYXV0b3B1Ymxpc2hlZEZpZWxkcyIsIndoaXRlbGlzdGVkRmllbGRzIiwiY29uY2F0IiwibWFwIiwic3ViZmllbGQiLCJhZGRBdXRvcHVibGlzaEZpZWxkcyIsImZvckxvZ2dlZEluVXNlciIsImZvck90aGVyVXNlcnMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBSUEsT0FBTyxDQUFDLGFBQUQsQ0FBUCxJQUNHLENBQUNBLE9BQU8sQ0FBQyx1QkFBRCxDQURYLElBRUcsQ0FBQ0MsTUFBTSxDQUFDQyxTQUFQLENBQWlCQyxjQUFqQixDQUFnQ0MsSUFBaEMsQ0FBcUNKLE9BQXJDLEVBQThDLG1CQUE5QyxDQUZSLEVBRTRFO0FBQzFFSyxTQUFPLENBQUNDLElBQVIsQ0FDRSwyREFDQSx1REFEQSxHQUVBLG1DQUZBLEdBR0EsSUFIQSxHQUlBLGtDQUpBLEdBS0EsSUFORjtBQVFELEM7Ozs7Ozs7Ozs7O0FDWERDLFFBQVEsQ0FBQ0MsS0FBVCxDQUFlQyxlQUFmLENBQStCLFNBQS9COztBQUVBLElBQUlDLE1BQU0sQ0FBQ0MsUUFBWCxFQUFxQjtBQUNuQixRQUFNQyxnQkFBZ0IsR0FBRyxDQUFDQyxPQUFELEVBQVVDLFFBQVYsS0FBdUI7QUFDOUM7QUFDQSxRQUFJLENBQUVBLFFBQUYsSUFBYyxPQUFPRCxPQUFQLEtBQW1CLFVBQXJDLEVBQWlEO0FBQy9DQyxjQUFRLEdBQUdELE9BQVg7QUFDQUEsYUFBTyxHQUFHLElBQVY7QUFDRDs7QUFFRCxVQUFNRSxpQ0FBaUMsR0FBR1IsUUFBUSxDQUFDQyxLQUFULENBQWVRLGdDQUFmLENBQWdERixRQUFoRCxDQUExQztBQUNBRyxXQUFPLENBQUNDLGlCQUFSLENBQTBCTCxPQUExQixFQUFtQ0UsaUNBQW5DO0FBQ0QsR0FURDs7QUFVQVIsVUFBUSxDQUFDWSwyQkFBVCxDQUFxQyxTQUFyQyxFQUFnRFAsZ0JBQWhEOztBQUNBRixRQUFNLENBQUNFLGdCQUFQLEdBQTBCLENBQUMsR0FBR1EsSUFBSixLQUN4QmIsUUFBUSxDQUFDYyxrQkFBVCxDQUE0QixTQUE1QixFQUF1Q0QsSUFBdkMsQ0FERjtBQUVELENBZEQsTUFjTztBQUNMLFFBQU1FLG1CQUFtQixHQUN2QjtBQUNBTCxTQUFPLENBQUNNLGlCQUFSLENBQTBCQyxNQUExQixDQUFpQyxDQUFDLElBQUQsRUFBTyxZQUFQLENBQWpDLEVBQXVEQyxHQUF2RCxDQUNFQyxRQUFRLElBQUssb0JBQW1CQSxRQUFTLEVBRDNDLENBRkY7QUFNQW5CLFVBQVEsQ0FBQ29CLG9CQUFULENBQThCO0FBQzVCQyxtQkFBZSxFQUFFTixtQkFEVztBQUU1Qk8saUJBQWEsRUFBRVA7QUFGYSxHQUE5QjtBQUlELEMiLCJmaWxlIjoiL3BhY2thZ2VzL2FjY291bnRzLXR3aXR0ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpZiAoUGFja2FnZVsnYWNjb3VudHMtdWknXVxuICAgICYmICFQYWNrYWdlWydzZXJ2aWNlLWNvbmZpZ3VyYXRpb24nXVxuICAgICYmICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoUGFja2FnZSwgJ3R3aXR0ZXItY29uZmlnLXVpJykpIHtcbiAgY29uc29sZS53YXJuKFxuICAgIFwiTm90ZTogWW91J3JlIHVzaW5nIGFjY291bnRzLXVpIGFuZCBhY2NvdW50cy10d2l0dGVyLFxcblwiICtcbiAgICBcImJ1dCBkaWRuJ3QgaW5zdGFsbCB0aGUgY29uZmlndXJhdGlvbiBVSSBmb3IgVHdpdHRlclxcblwiICtcbiAgICBcIk9BdXRoLiBZb3UgY2FuIGluc3RhbGwgaXQgd2l0aDpcXG5cIiArXG4gICAgXCJcXG5cIiArXG4gICAgXCIgICAgbWV0ZW9yIGFkZCB0d2l0dGVyLWNvbmZpZy11aVwiICtcbiAgICBcIlxcblwiXG4gICk7XG59XG4iLCJBY2NvdW50cy5vYXV0aC5yZWdpc3RlclNlcnZpY2UoJ3R3aXR0ZXInKTtcblxuaWYgKE1ldGVvci5pc0NsaWVudCkge1xuICBjb25zdCBsb2dpbldpdGhUd2l0dGVyID0gKG9wdGlvbnMsIGNhbGxiYWNrKSA9PiB7XG4gICAgLy8gc3VwcG9ydCBhIGNhbGxiYWNrIHdpdGhvdXQgb3B0aW9uc1xuICAgIGlmICghIGNhbGxiYWNrICYmIHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgIG9wdGlvbnMgPSBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGNyZWRlbnRpYWxSZXF1ZXN0Q29tcGxldGVDYWxsYmFjayA9IEFjY291bnRzLm9hdXRoLmNyZWRlbnRpYWxSZXF1ZXN0Q29tcGxldGVIYW5kbGVyKGNhbGxiYWNrKTtcbiAgICBUd2l0dGVyLnJlcXVlc3RDcmVkZW50aWFsKG9wdGlvbnMsIGNyZWRlbnRpYWxSZXF1ZXN0Q29tcGxldGVDYWxsYmFjayk7XG4gIH07XG4gIEFjY291bnRzLnJlZ2lzdGVyQ2xpZW50TG9naW5GdW5jdGlvbigndHdpdHRlcicsIGxvZ2luV2l0aFR3aXR0ZXIpO1xuICBNZXRlb3IubG9naW5XaXRoVHdpdHRlciA9ICguLi5hcmdzKSA9PlxuICAgIEFjY291bnRzLmFwcGx5TG9naW5GdW5jdGlvbigndHdpdHRlcicsIGFyZ3MpO1xufSBlbHNlIHtcbiAgY29uc3QgYXV0b3B1Ymxpc2hlZEZpZWxkcyA9IFxuICAgIC8vIGRvbid0IHNlbmQgYWNjZXNzIHRva2VuLiBodHRwczovL2Rldi50d2l0dGVyLmNvbS9kaXNjdXNzaW9ucy81MDI1XG4gICAgVHdpdHRlci53aGl0ZWxpc3RlZEZpZWxkcy5jb25jYXQoWydpZCcsICdzY3JlZW5OYW1lJ10pLm1hcChcbiAgICAgIHN1YmZpZWxkID0+IGBzZXJ2aWNlcy50d2l0dGVyLiR7c3ViZmllbGR9YFxuICAgICk7XG5cbiAgQWNjb3VudHMuYWRkQXV0b3B1Ymxpc2hGaWVsZHMoe1xuICAgIGZvckxvZ2dlZEluVXNlcjogYXV0b3B1Ymxpc2hlZEZpZWxkcyxcbiAgICBmb3JPdGhlclVzZXJzOiBhdXRvcHVibGlzaGVkRmllbGRzXG4gIH0pO1xufVxuIl19
