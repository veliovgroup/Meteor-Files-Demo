(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var Accounts = Package['accounts-base'].Accounts;
var Facebook = Package['facebook-oauth'].Facebook;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"accounts-facebook":{"notice.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/accounts-facebook/notice.js                                                                  //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
if (Package['accounts-ui'] && !Package['service-configuration'] && !Object.prototype.hasOwnProperty.call(Package, 'facebook-config-ui')) {
  console.warn("Note: You're using accounts-ui and accounts-facebook,\n" + "but didn't install the configuration UI for the Facebook\n" + "OAuth. You can install it with:\n" + "\n" + "    meteor add facebook-config-ui" + "\n");
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////

},"facebook.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/accounts-facebook/facebook.js                                                                //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
Accounts.oauth.registerService('facebook');

if (Meteor.isClient) {
  const loginWithFacebook = (options, callback) => {
    // support a callback without options
    if (!callback && typeof options === "function") {
      callback = options;
      options = null;
    }

    const credentialRequestCompleteCallback = Accounts.oauth.credentialRequestCompleteHandler(callback);
    Facebook.requestCredential(options, credentialRequestCompleteCallback);
  };

  Accounts.registerClientLoginFunction('facebook', loginWithFacebook);

  Meteor.loginWithFacebook = (...args) => Accounts.applyLoginFunction('facebook', args);
} else {
  Accounts.addAutopublishFields({
    // publish all fields including access token, which can legitimately
    // be used from the client (if transmitted over ssl or on
    // localhost). https://developers.facebook.com/docs/concepts/login/access-tokens-and-types/,
    // "Sharing of Access Tokens"
    forLoggedInUser: ['services.facebook'],
    forOtherUsers: [// https://www.facebook.com/help/167709519956542
    'services.facebook.id', 'services.facebook.username', 'services.facebook.gender']
  });
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/accounts-facebook/notice.js");
require("/node_modules/meteor/accounts-facebook/facebook.js");

/* Exports */
Package._define("accounts-facebook");

})();

//# sourceURL=meteor://💻app/packages/accounts-facebook.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWNjb3VudHMtZmFjZWJvb2svbm90aWNlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9hY2NvdW50cy1mYWNlYm9vay9mYWNlYm9vay5qcyJdLCJuYW1lcyI6WyJQYWNrYWdlIiwiT2JqZWN0IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwiY29uc29sZSIsIndhcm4iLCJBY2NvdW50cyIsIm9hdXRoIiwicmVnaXN0ZXJTZXJ2aWNlIiwiTWV0ZW9yIiwiaXNDbGllbnQiLCJsb2dpbldpdGhGYWNlYm9vayIsIm9wdGlvbnMiLCJjYWxsYmFjayIsImNyZWRlbnRpYWxSZXF1ZXN0Q29tcGxldGVDYWxsYmFjayIsImNyZWRlbnRpYWxSZXF1ZXN0Q29tcGxldGVIYW5kbGVyIiwiRmFjZWJvb2siLCJyZXF1ZXN0Q3JlZGVudGlhbCIsInJlZ2lzdGVyQ2xpZW50TG9naW5GdW5jdGlvbiIsImFyZ3MiLCJhcHBseUxvZ2luRnVuY3Rpb24iLCJhZGRBdXRvcHVibGlzaEZpZWxkcyIsImZvckxvZ2dlZEluVXNlciIsImZvck90aGVyVXNlcnMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLE9BQU8sQ0FBQyxhQUFELENBQVAsSUFDRyxDQUFDQSxPQUFPLENBQUMsdUJBQUQsQ0FEWCxJQUVHLENBQUNDLE1BQU0sQ0FBQ0MsU0FBUCxDQUFpQkMsY0FBakIsQ0FBZ0NDLElBQWhDLENBQXFDSixPQUFyQyxFQUE4QyxvQkFBOUMsQ0FGUixFQUU2RTtBQUMzRUssU0FBTyxDQUFDQyxJQUFSLENBQ0UsNERBQ0EsNERBREEsR0FFQSxtQ0FGQSxHQUdBLElBSEEsR0FJQSxtQ0FKQSxHQUtBLElBTkY7QUFRRCxDOzs7Ozs7Ozs7OztBQ1hEQyxRQUFRLENBQUNDLEtBQVQsQ0FBZUMsZUFBZixDQUErQixVQUEvQjs7QUFFQSxJQUFJQyxNQUFNLENBQUNDLFFBQVgsRUFBcUI7QUFDbkIsUUFBTUMsaUJBQWlCLEdBQUcsQ0FBQ0MsT0FBRCxFQUFVQyxRQUFWLEtBQXVCO0FBQy9DO0FBQ0EsUUFBSSxDQUFFQSxRQUFGLElBQWMsT0FBT0QsT0FBUCxLQUFtQixVQUFyQyxFQUFpRDtBQUMvQ0MsY0FBUSxHQUFHRCxPQUFYO0FBQ0FBLGFBQU8sR0FBRyxJQUFWO0FBQ0Q7O0FBRUQsVUFBTUUsaUNBQWlDLEdBQUdSLFFBQVEsQ0FBQ0MsS0FBVCxDQUFlUSxnQ0FBZixDQUFnREYsUUFBaEQsQ0FBMUM7QUFDQUcsWUFBUSxDQUFDQyxpQkFBVCxDQUEyQkwsT0FBM0IsRUFBb0NFLGlDQUFwQztBQUNELEdBVEQ7O0FBVUFSLFVBQVEsQ0FBQ1ksMkJBQVQsQ0FBcUMsVUFBckMsRUFBaURQLGlCQUFqRDs7QUFDQUYsUUFBTSxDQUFDRSxpQkFBUCxHQUNFLENBQUMsR0FBR1EsSUFBSixLQUFhYixRQUFRLENBQUNjLGtCQUFULENBQTRCLFVBQTVCLEVBQXdDRCxJQUF4QyxDQURmO0FBRUQsQ0FkRCxNQWNPO0FBQ0xiLFVBQVEsQ0FBQ2Usb0JBQVQsQ0FBOEI7QUFDNUI7QUFDQTtBQUNBO0FBQ0E7QUFDQUMsbUJBQWUsRUFBRSxDQUFDLG1CQUFELENBTFc7QUFNNUJDLGlCQUFhLEVBQUUsQ0FDYjtBQUNBLDBCQUZhLEVBRVcsNEJBRlgsRUFFeUMsMEJBRnpDO0FBTmEsR0FBOUI7QUFXRCxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9hY2NvdW50cy1mYWNlYm9vay5qcyIsInNvdXJjZXNDb250ZW50IjpbImlmIChQYWNrYWdlWydhY2NvdW50cy11aSddXG4gICAgJiYgIVBhY2thZ2VbJ3NlcnZpY2UtY29uZmlndXJhdGlvbiddXG4gICAgJiYgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChQYWNrYWdlLCAnZmFjZWJvb2stY29uZmlnLXVpJykpIHtcbiAgY29uc29sZS53YXJuKFxuICAgIFwiTm90ZTogWW91J3JlIHVzaW5nIGFjY291bnRzLXVpIGFuZCBhY2NvdW50cy1mYWNlYm9vayxcXG5cIiArXG4gICAgXCJidXQgZGlkbid0IGluc3RhbGwgdGhlIGNvbmZpZ3VyYXRpb24gVUkgZm9yIHRoZSBGYWNlYm9va1xcblwiICtcbiAgICBcIk9BdXRoLiBZb3UgY2FuIGluc3RhbGwgaXQgd2l0aDpcXG5cIiArXG4gICAgXCJcXG5cIiArXG4gICAgXCIgICAgbWV0ZW9yIGFkZCBmYWNlYm9vay1jb25maWctdWlcIiArXG4gICAgXCJcXG5cIlxuICApO1xufVxuIiwiQWNjb3VudHMub2F1dGgucmVnaXN0ZXJTZXJ2aWNlKCdmYWNlYm9vaycpO1xuXG5pZiAoTWV0ZW9yLmlzQ2xpZW50KSB7XG4gIGNvbnN0IGxvZ2luV2l0aEZhY2Vib29rID0gKG9wdGlvbnMsIGNhbGxiYWNrKSA9PiB7XG4gICAgLy8gc3VwcG9ydCBhIGNhbGxiYWNrIHdpdGhvdXQgb3B0aW9uc1xuICAgIGlmICghIGNhbGxiYWNrICYmIHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgIG9wdGlvbnMgPSBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGNyZWRlbnRpYWxSZXF1ZXN0Q29tcGxldGVDYWxsYmFjayA9IEFjY291bnRzLm9hdXRoLmNyZWRlbnRpYWxSZXF1ZXN0Q29tcGxldGVIYW5kbGVyKGNhbGxiYWNrKTtcbiAgICBGYWNlYm9vay5yZXF1ZXN0Q3JlZGVudGlhbChvcHRpb25zLCBjcmVkZW50aWFsUmVxdWVzdENvbXBsZXRlQ2FsbGJhY2spO1xuICB9O1xuICBBY2NvdW50cy5yZWdpc3RlckNsaWVudExvZ2luRnVuY3Rpb24oJ2ZhY2Vib29rJywgbG9naW5XaXRoRmFjZWJvb2spO1xuICBNZXRlb3IubG9naW5XaXRoRmFjZWJvb2sgPSBcbiAgICAoLi4uYXJncykgPT4gQWNjb3VudHMuYXBwbHlMb2dpbkZ1bmN0aW9uKCdmYWNlYm9vaycsIGFyZ3MpO1xufSBlbHNlIHtcbiAgQWNjb3VudHMuYWRkQXV0b3B1Ymxpc2hGaWVsZHMoe1xuICAgIC8vIHB1Ymxpc2ggYWxsIGZpZWxkcyBpbmNsdWRpbmcgYWNjZXNzIHRva2VuLCB3aGljaCBjYW4gbGVnaXRpbWF0ZWx5XG4gICAgLy8gYmUgdXNlZCBmcm9tIHRoZSBjbGllbnQgKGlmIHRyYW5zbWl0dGVkIG92ZXIgc3NsIG9yIG9uXG4gICAgLy8gbG9jYWxob3N0KS4gaHR0cHM6Ly9kZXZlbG9wZXJzLmZhY2Vib29rLmNvbS9kb2NzL2NvbmNlcHRzL2xvZ2luL2FjY2Vzcy10b2tlbnMtYW5kLXR5cGVzLyxcbiAgICAvLyBcIlNoYXJpbmcgb2YgQWNjZXNzIFRva2Vuc1wiXG4gICAgZm9yTG9nZ2VkSW5Vc2VyOiBbJ3NlcnZpY2VzLmZhY2Vib29rJ10sXG4gICAgZm9yT3RoZXJVc2VyczogW1xuICAgICAgLy8gaHR0cHM6Ly93d3cuZmFjZWJvb2suY29tL2hlbHAvMTY3NzA5NTE5OTU2NTQyXG4gICAgICAnc2VydmljZXMuZmFjZWJvb2suaWQnLCAnc2VydmljZXMuZmFjZWJvb2sudXNlcm5hbWUnLCAnc2VydmljZXMuZmFjZWJvb2suZ2VuZGVyJ1xuICAgIF1cbiAgfSk7XG59XG4iXX0=
