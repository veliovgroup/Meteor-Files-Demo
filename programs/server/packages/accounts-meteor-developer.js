(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var Accounts = Package['accounts-base'].Accounts;
var MeteorDeveloperAccounts = Package['meteor-developer-oauth'].MeteorDeveloperAccounts;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"accounts-meteor-developer":{"notice.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/accounts-meteor-developer/notice.js                                                                //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
if (Package['accounts-ui'] && !Package['service-configuration'] && !Object.prototype.hasOwnProperty.call(Package, 'meteor-developer-config-ui')) {
  console.warn("Note: You're using accounts-ui and accounts-meteor-developer,\n" + "but didn't install the configuration UI for the Meteor Developer\n" + "Accounts OAuth. You can install it with:\n" + "\n" + "    meteor add meteor-developer-config-ui" + "\n");
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"meteor-developer.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                             //
// packages/accounts-meteor-developer/meteor-developer.js                                                      //
//                                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                               //
Accounts.oauth.registerService("meteor-developer");

if (Meteor.isClient) {
  const loginWithMeteorDeveloperAccount = (options, callback) => {
    // support a callback without options
    if (!callback && typeof options === "function") {
      callback = options;
      options = null;
    }

    const credentialRequestCompleteCallback = Accounts.oauth.credentialRequestCompleteHandler(callback);
    MeteorDeveloperAccounts.requestCredential(options, credentialRequestCompleteCallback);
  };

  Accounts.registerClientLoginFunction('meteor-developer', loginWithMeteorDeveloperAccount);

  Meteor.loginWithMeteorDeveloperAccount = (...args) => Accounts.applyLoginFunction('meteor-developer', args);
} else {
  Accounts.addAutopublishFields({
    // publish all fields including access token, which can legitimately be used
    // from the client (if transmitted over ssl or on localhost).
    forLoggedInUser: ['services.meteor-developer'],
    forOtherUsers: ['services.meteor-developer.username', 'services.meteor-developer.profile', 'services.meteor-developer.id']
  });
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/accounts-meteor-developer/notice.js");
require("/node_modules/meteor/accounts-meteor-developer/meteor-developer.js");

/* Exports */
Package._define("accounts-meteor-developer");

})();

//# sourceURL=meteor://💻app/packages/accounts-meteor-developer.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWNjb3VudHMtbWV0ZW9yLWRldmVsb3Blci9ub3RpY2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2FjY291bnRzLW1ldGVvci1kZXZlbG9wZXIvbWV0ZW9yLWRldmVsb3Blci5qcyJdLCJuYW1lcyI6WyJQYWNrYWdlIiwiT2JqZWN0IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwiY29uc29sZSIsIndhcm4iLCJBY2NvdW50cyIsIm9hdXRoIiwicmVnaXN0ZXJTZXJ2aWNlIiwiTWV0ZW9yIiwiaXNDbGllbnQiLCJsb2dpbldpdGhNZXRlb3JEZXZlbG9wZXJBY2NvdW50Iiwib3B0aW9ucyIsImNhbGxiYWNrIiwiY3JlZGVudGlhbFJlcXVlc3RDb21wbGV0ZUNhbGxiYWNrIiwiY3JlZGVudGlhbFJlcXVlc3RDb21wbGV0ZUhhbmRsZXIiLCJNZXRlb3JEZXZlbG9wZXJBY2NvdW50cyIsInJlcXVlc3RDcmVkZW50aWFsIiwicmVnaXN0ZXJDbGllbnRMb2dpbkZ1bmN0aW9uIiwiYXJncyIsImFwcGx5TG9naW5GdW5jdGlvbiIsImFkZEF1dG9wdWJsaXNoRmllbGRzIiwiZm9yTG9nZ2VkSW5Vc2VyIiwiZm9yT3RoZXJVc2VycyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBSUEsT0FBTyxDQUFDLGFBQUQsQ0FBUCxJQUNHLENBQUNBLE9BQU8sQ0FBQyx1QkFBRCxDQURYLElBRUcsQ0FBQ0MsTUFBTSxDQUFDQyxTQUFQLENBQWlCQyxjQUFqQixDQUFnQ0MsSUFBaEMsQ0FBcUNKLE9BQXJDLEVBQThDLDRCQUE5QyxDQUZSLEVBRXFGO0FBQ25GSyxTQUFPLENBQUNDLElBQVIsQ0FDRSxvRUFDQSxvRUFEQSxHQUVBLDRDQUZBLEdBR0EsSUFIQSxHQUlBLDJDQUpBLEdBS0EsSUFORjtBQVFELEM7Ozs7Ozs7Ozs7O0FDWERDLFFBQVEsQ0FBQ0MsS0FBVCxDQUFlQyxlQUFmLENBQStCLGtCQUEvQjs7QUFFQSxJQUFJQyxNQUFNLENBQUNDLFFBQVgsRUFBcUI7QUFDbkIsUUFBTUMsK0JBQStCLEdBQUcsQ0FBQ0MsT0FBRCxFQUFVQyxRQUFWLEtBQXVCO0FBQzdEO0FBQ0EsUUFBSSxDQUFFQSxRQUFGLElBQWMsT0FBT0QsT0FBUCxLQUFtQixVQUFyQyxFQUFpRDtBQUMvQ0MsY0FBUSxHQUFHRCxPQUFYO0FBQ0FBLGFBQU8sR0FBRyxJQUFWO0FBQ0Q7O0FBRUQsVUFBTUUsaUNBQWlDLEdBQ2pDUixRQUFRLENBQUNDLEtBQVQsQ0FBZVEsZ0NBQWYsQ0FBZ0RGLFFBQWhELENBRE47QUFFQUcsMkJBQXVCLENBQUNDLGlCQUF4QixDQUEwQ0wsT0FBMUMsRUFBbURFLGlDQUFuRDtBQUNELEdBVkQ7O0FBV0FSLFVBQVEsQ0FBQ1ksMkJBQVQsQ0FBcUMsa0JBQXJDLEVBQXlEUCwrQkFBekQ7O0FBQ0FGLFFBQU0sQ0FBQ0UsK0JBQVAsR0FBeUMsQ0FBQyxHQUFHUSxJQUFKLEtBQ3ZDYixRQUFRLENBQUNjLGtCQUFULENBQTRCLGtCQUE1QixFQUFnREQsSUFBaEQsQ0FERjtBQUVELENBZkQsTUFlTztBQUNMYixVQUFRLENBQUNlLG9CQUFULENBQThCO0FBQzVCO0FBQ0E7QUFDQUMsbUJBQWUsRUFBRSxDQUFDLDJCQUFELENBSFc7QUFJNUJDLGlCQUFhLEVBQUUsQ0FDYixvQ0FEYSxFQUViLG1DQUZhLEVBR2IsOEJBSGE7QUFKYSxHQUE5QjtBQVVELEMiLCJmaWxlIjoiL3BhY2thZ2VzL2FjY291bnRzLW1ldGVvci1kZXZlbG9wZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpZiAoUGFja2FnZVsnYWNjb3VudHMtdWknXVxuICAgICYmICFQYWNrYWdlWydzZXJ2aWNlLWNvbmZpZ3VyYXRpb24nXVxuICAgICYmICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoUGFja2FnZSwgJ21ldGVvci1kZXZlbG9wZXItY29uZmlnLXVpJykpIHtcbiAgY29uc29sZS53YXJuKFxuICAgIFwiTm90ZTogWW91J3JlIHVzaW5nIGFjY291bnRzLXVpIGFuZCBhY2NvdW50cy1tZXRlb3ItZGV2ZWxvcGVyLFxcblwiICtcbiAgICBcImJ1dCBkaWRuJ3QgaW5zdGFsbCB0aGUgY29uZmlndXJhdGlvbiBVSSBmb3IgdGhlIE1ldGVvciBEZXZlbG9wZXJcXG5cIiArXG4gICAgXCJBY2NvdW50cyBPQXV0aC4gWW91IGNhbiBpbnN0YWxsIGl0IHdpdGg6XFxuXCIgK1xuICAgIFwiXFxuXCIgK1xuICAgIFwiICAgIG1ldGVvciBhZGQgbWV0ZW9yLWRldmVsb3Blci1jb25maWctdWlcIiArXG4gICAgXCJcXG5cIlxuICApO1xufVxuIiwiQWNjb3VudHMub2F1dGgucmVnaXN0ZXJTZXJ2aWNlKFwibWV0ZW9yLWRldmVsb3BlclwiKTtcblxuaWYgKE1ldGVvci5pc0NsaWVudCkge1xuICBjb25zdCBsb2dpbldpdGhNZXRlb3JEZXZlbG9wZXJBY2NvdW50ID0gKG9wdGlvbnMsIGNhbGxiYWNrKSA9PiB7XG4gICAgLy8gc3VwcG9ydCBhIGNhbGxiYWNrIHdpdGhvdXQgb3B0aW9uc1xuICAgIGlmICghIGNhbGxiYWNrICYmIHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgIG9wdGlvbnMgPSBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGNyZWRlbnRpYWxSZXF1ZXN0Q29tcGxldGVDYWxsYmFjayA9XG4gICAgICAgICAgQWNjb3VudHMub2F1dGguY3JlZGVudGlhbFJlcXVlc3RDb21wbGV0ZUhhbmRsZXIoY2FsbGJhY2spO1xuICAgIE1ldGVvckRldmVsb3BlckFjY291bnRzLnJlcXVlc3RDcmVkZW50aWFsKG9wdGlvbnMsIGNyZWRlbnRpYWxSZXF1ZXN0Q29tcGxldGVDYWxsYmFjayk7XG4gIH07XG4gIEFjY291bnRzLnJlZ2lzdGVyQ2xpZW50TG9naW5GdW5jdGlvbignbWV0ZW9yLWRldmVsb3BlcicsIGxvZ2luV2l0aE1ldGVvckRldmVsb3BlckFjY291bnQpO1xuICBNZXRlb3IubG9naW5XaXRoTWV0ZW9yRGV2ZWxvcGVyQWNjb3VudCA9ICguLi5hcmdzKSA9PlxuICAgIEFjY291bnRzLmFwcGx5TG9naW5GdW5jdGlvbignbWV0ZW9yLWRldmVsb3BlcicsIGFyZ3MpO1xufSBlbHNlIHtcbiAgQWNjb3VudHMuYWRkQXV0b3B1Ymxpc2hGaWVsZHMoe1xuICAgIC8vIHB1Ymxpc2ggYWxsIGZpZWxkcyBpbmNsdWRpbmcgYWNjZXNzIHRva2VuLCB3aGljaCBjYW4gbGVnaXRpbWF0ZWx5IGJlIHVzZWRcbiAgICAvLyBmcm9tIHRoZSBjbGllbnQgKGlmIHRyYW5zbWl0dGVkIG92ZXIgc3NsIG9yIG9uIGxvY2FsaG9zdCkuXG4gICAgZm9yTG9nZ2VkSW5Vc2VyOiBbJ3NlcnZpY2VzLm1ldGVvci1kZXZlbG9wZXInXSxcbiAgICBmb3JPdGhlclVzZXJzOiBbXG4gICAgICAnc2VydmljZXMubWV0ZW9yLWRldmVsb3Blci51c2VybmFtZScsXG4gICAgICAnc2VydmljZXMubWV0ZW9yLWRldmVsb3Blci5wcm9maWxlJyxcbiAgICAgICdzZXJ2aWNlcy5tZXRlb3ItZGV2ZWxvcGVyLmlkJ1xuICAgIF1cbiAgfSk7XG59XG4iXX0=
