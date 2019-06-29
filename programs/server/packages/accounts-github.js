(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var Accounts = Package['accounts-base'].Accounts;
var Github = Package['github-oauth'].Github;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"accounts-github":{"notice.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/accounts-github/notice.js                                                                    //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
if (Package['accounts-ui'] && !Package['service-configuration'] && !Object.prototype.hasOwnProperty.call(Package, 'github-config-ui')) {
  console.warn("Note: You're using accounts-ui and accounts-github,\n" + "but didn't install the configuration UI for the GitHub\n" + "OAuth. You can install it with:\n" + "\n" + "    meteor add github-config-ui" + "\n");
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////

},"github.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/accounts-github/github.js                                                                    //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
Accounts.oauth.registerService('github');

if (Meteor.isClient) {
  const loginWithGithub = (options, callback) => {
    // support a callback without options
    if (!callback && typeof options === "function") {
      callback = options;
      options = null;
    }

    const credentialRequestCompleteCallback = Accounts.oauth.credentialRequestCompleteHandler(callback);
    Github.requestCredential(options, credentialRequestCompleteCallback);
  };

  Accounts.registerClientLoginFunction('github', loginWithGithub);

  Meteor.loginWithGithub = (...args) => Accounts.applyLoginFunction('github', args);
} else {
  Accounts.addAutopublishFields({
    // not sure whether the github api can be used from the browser,
    // thus not sure if we should be sending access tokens; but we do it
    // for all other oauth2 providers, and it may come in handy.
    forLoggedInUser: ['services.github'],
    forOtherUsers: ['services.github.username']
  });
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/accounts-github/notice.js");
require("/node_modules/meteor/accounts-github/github.js");

/* Exports */
Package._define("accounts-github");

})();

//# sourceURL=meteor://💻app/packages/accounts-github.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWNjb3VudHMtZ2l0aHViL25vdGljZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWNjb3VudHMtZ2l0aHViL2dpdGh1Yi5qcyJdLCJuYW1lcyI6WyJQYWNrYWdlIiwiT2JqZWN0IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwiY29uc29sZSIsIndhcm4iLCJBY2NvdW50cyIsIm9hdXRoIiwicmVnaXN0ZXJTZXJ2aWNlIiwiTWV0ZW9yIiwiaXNDbGllbnQiLCJsb2dpbldpdGhHaXRodWIiLCJvcHRpb25zIiwiY2FsbGJhY2siLCJjcmVkZW50aWFsUmVxdWVzdENvbXBsZXRlQ2FsbGJhY2siLCJjcmVkZW50aWFsUmVxdWVzdENvbXBsZXRlSGFuZGxlciIsIkdpdGh1YiIsInJlcXVlc3RDcmVkZW50aWFsIiwicmVnaXN0ZXJDbGllbnRMb2dpbkZ1bmN0aW9uIiwiYXJncyIsImFwcGx5TG9naW5GdW5jdGlvbiIsImFkZEF1dG9wdWJsaXNoRmllbGRzIiwiZm9yTG9nZ2VkSW5Vc2VyIiwiZm9yT3RoZXJVc2VycyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBSUEsT0FBTyxDQUFDLGFBQUQsQ0FBUCxJQUNHLENBQUNBLE9BQU8sQ0FBQyx1QkFBRCxDQURYLElBRUcsQ0FBQ0MsTUFBTSxDQUFDQyxTQUFQLENBQWlCQyxjQUFqQixDQUFnQ0MsSUFBaEMsQ0FBcUNKLE9BQXJDLEVBQThDLGtCQUE5QyxDQUZSLEVBRTJFO0FBQ3pFSyxTQUFPLENBQUNDLElBQVIsQ0FDRSwwREFDQSwwREFEQSxHQUVBLG1DQUZBLEdBR0EsSUFIQSxHQUlBLGlDQUpBLEdBS0EsSUFORjtBQVFELEM7Ozs7Ozs7Ozs7O0FDWERDLFFBQVEsQ0FBQ0MsS0FBVCxDQUFlQyxlQUFmLENBQStCLFFBQS9COztBQUVBLElBQUlDLE1BQU0sQ0FBQ0MsUUFBWCxFQUFxQjtBQUNuQixRQUFNQyxlQUFlLEdBQUcsQ0FBQ0MsT0FBRCxFQUFVQyxRQUFWLEtBQXVCO0FBQzdDO0FBQ0EsUUFBSSxDQUFFQSxRQUFGLElBQWMsT0FBT0QsT0FBUCxLQUFtQixVQUFyQyxFQUFpRDtBQUMvQ0MsY0FBUSxHQUFHRCxPQUFYO0FBQ0FBLGFBQU8sR0FBRyxJQUFWO0FBQ0Q7O0FBRUQsVUFBTUUsaUNBQWlDLEdBQUdSLFFBQVEsQ0FBQ0MsS0FBVCxDQUFlUSxnQ0FBZixDQUFnREYsUUFBaEQsQ0FBMUM7QUFDQUcsVUFBTSxDQUFDQyxpQkFBUCxDQUF5QkwsT0FBekIsRUFBa0NFLGlDQUFsQztBQUNELEdBVEQ7O0FBVUFSLFVBQVEsQ0FBQ1ksMkJBQVQsQ0FBcUMsUUFBckMsRUFBK0NQLGVBQS9DOztBQUNBRixRQUFNLENBQUNFLGVBQVAsR0FDRSxDQUFDLEdBQUdRLElBQUosS0FBYWIsUUFBUSxDQUFDYyxrQkFBVCxDQUE0QixRQUE1QixFQUFzQ0QsSUFBdEMsQ0FEZjtBQUVELENBZEQsTUFjTztBQUNMYixVQUFRLENBQUNlLG9CQUFULENBQThCO0FBQzVCO0FBQ0E7QUFDQTtBQUNBQyxtQkFBZSxFQUFFLENBQUMsaUJBQUQsQ0FKVztBQUs1QkMsaUJBQWEsRUFBRSxDQUFDLDBCQUFEO0FBTGEsR0FBOUI7QUFPRCxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9hY2NvdW50cy1naXRodWIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpZiAoUGFja2FnZVsnYWNjb3VudHMtdWknXVxuICAgICYmICFQYWNrYWdlWydzZXJ2aWNlLWNvbmZpZ3VyYXRpb24nXVxuICAgICYmICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoUGFja2FnZSwgJ2dpdGh1Yi1jb25maWctdWknKSkge1xuICBjb25zb2xlLndhcm4oXG4gICAgXCJOb3RlOiBZb3UncmUgdXNpbmcgYWNjb3VudHMtdWkgYW5kIGFjY291bnRzLWdpdGh1YixcXG5cIiArXG4gICAgXCJidXQgZGlkbid0IGluc3RhbGwgdGhlIGNvbmZpZ3VyYXRpb24gVUkgZm9yIHRoZSBHaXRIdWJcXG5cIiArXG4gICAgXCJPQXV0aC4gWW91IGNhbiBpbnN0YWxsIGl0IHdpdGg6XFxuXCIgK1xuICAgIFwiXFxuXCIgK1xuICAgIFwiICAgIG1ldGVvciBhZGQgZ2l0aHViLWNvbmZpZy11aVwiICtcbiAgICBcIlxcblwiXG4gICk7XG59XG4iLCJBY2NvdW50cy5vYXV0aC5yZWdpc3RlclNlcnZpY2UoJ2dpdGh1YicpO1xuXG5pZiAoTWV0ZW9yLmlzQ2xpZW50KSB7XG4gIGNvbnN0IGxvZ2luV2l0aEdpdGh1YiA9IChvcHRpb25zLCBjYWxsYmFjaykgPT4ge1xuICAgIC8vIHN1cHBvcnQgYSBjYWxsYmFjayB3aXRob3V0IG9wdGlvbnNcbiAgICBpZiAoISBjYWxsYmFjayAmJiB0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBjcmVkZW50aWFsUmVxdWVzdENvbXBsZXRlQ2FsbGJhY2sgPSBBY2NvdW50cy5vYXV0aC5jcmVkZW50aWFsUmVxdWVzdENvbXBsZXRlSGFuZGxlcihjYWxsYmFjayk7XG4gICAgR2l0aHViLnJlcXVlc3RDcmVkZW50aWFsKG9wdGlvbnMsIGNyZWRlbnRpYWxSZXF1ZXN0Q29tcGxldGVDYWxsYmFjayk7XG4gIH07XG4gIEFjY291bnRzLnJlZ2lzdGVyQ2xpZW50TG9naW5GdW5jdGlvbignZ2l0aHViJywgbG9naW5XaXRoR2l0aHViKTtcbiAgTWV0ZW9yLmxvZ2luV2l0aEdpdGh1YiA9IFxuICAgICguLi5hcmdzKSA9PiBBY2NvdW50cy5hcHBseUxvZ2luRnVuY3Rpb24oJ2dpdGh1YicsIGFyZ3MpO1xufSBlbHNlIHtcbiAgQWNjb3VudHMuYWRkQXV0b3B1Ymxpc2hGaWVsZHMoe1xuICAgIC8vIG5vdCBzdXJlIHdoZXRoZXIgdGhlIGdpdGh1YiBhcGkgY2FuIGJlIHVzZWQgZnJvbSB0aGUgYnJvd3NlcixcbiAgICAvLyB0aHVzIG5vdCBzdXJlIGlmIHdlIHNob3VsZCBiZSBzZW5kaW5nIGFjY2VzcyB0b2tlbnM7IGJ1dCB3ZSBkbyBpdFxuICAgIC8vIGZvciBhbGwgb3RoZXIgb2F1dGgyIHByb3ZpZGVycywgYW5kIGl0IG1heSBjb21lIGluIGhhbmR5LlxuICAgIGZvckxvZ2dlZEluVXNlcjogWydzZXJ2aWNlcy5naXRodWInXSxcbiAgICBmb3JPdGhlclVzZXJzOiBbJ3NlcnZpY2VzLmdpdGh1Yi51c2VybmFtZSddXG4gIH0pO1xufVxuIl19
