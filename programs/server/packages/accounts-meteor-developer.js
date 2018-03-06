(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var _ = Package.underscore._;
var Random = Package.random.Random;
var Accounts = Package['accounts-base'].Accounts;
var MeteorDeveloperAccounts = Package['meteor-developer-oauth'].MeteorDeveloperAccounts;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"accounts-meteor-developer":{"notice.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                     //
// packages/accounts-meteor-developer/notice.js                                                        //
//                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                       //
if (Package['accounts-ui'] && !Package['service-configuration'] && !Package.hasOwnProperty('meteor-developer-config-ui')) {
  console.warn("Note: You're using accounts-ui and accounts-meteor-developer,\n" + "but didn't install the configuration UI for the Meteor Developer\n" + "Accounts OAuth. You can install it with:\n" + "\n" + "    meteor add meteor-developer-config-ui" + "\n");
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////

},"meteor-developer.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                     //
// packages/accounts-meteor-developer/meteor-developer.js                                              //
//                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                       //
Accounts.oauth.registerService("meteor-developer");

if (Meteor.isClient) {
  const loginWithMeteorDeveloperAccount = function (options, callback) {
    // support a callback without options
    if (!callback && typeof options === "function") {
      callback = options;
      options = null;
    }

    var credentialRequestCompleteCallback = Accounts.oauth.credentialRequestCompleteHandler(callback);
    MeteorDeveloperAccounts.requestCredential(options, credentialRequestCompleteCallback);
  };

  Accounts.registerClientLoginFunction('meteor-developer', loginWithMeteorDeveloperAccount);

  Meteor.loginWithMeteorDeveloperAccount = function () {
    return Accounts.applyLoginFunction('meteor-developer', arguments);
  };
} else {
  Accounts.addAutopublishFields({
    // publish all fields including access token, which can legitimately be used
    // from the client (if transmitted over ssl or on localhost).
    forLoggedInUser: ['services.meteor-developer'],
    forOtherUsers: ['services.meteor-developer.username', 'services.meteor-developer.profile', 'services.meteor-developer.id']
  });
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWNjb3VudHMtbWV0ZW9yLWRldmVsb3Blci9ub3RpY2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2FjY291bnRzLW1ldGVvci1kZXZlbG9wZXIvbWV0ZW9yLWRldmVsb3Blci5qcyJdLCJuYW1lcyI6WyJQYWNrYWdlIiwiaGFzT3duUHJvcGVydHkiLCJjb25zb2xlIiwid2FybiIsIkFjY291bnRzIiwib2F1dGgiLCJyZWdpc3RlclNlcnZpY2UiLCJNZXRlb3IiLCJpc0NsaWVudCIsImxvZ2luV2l0aE1ldGVvckRldmVsb3BlckFjY291bnQiLCJvcHRpb25zIiwiY2FsbGJhY2siLCJjcmVkZW50aWFsUmVxdWVzdENvbXBsZXRlQ2FsbGJhY2siLCJjcmVkZW50aWFsUmVxdWVzdENvbXBsZXRlSGFuZGxlciIsIk1ldGVvckRldmVsb3BlckFjY291bnRzIiwicmVxdWVzdENyZWRlbnRpYWwiLCJyZWdpc3RlckNsaWVudExvZ2luRnVuY3Rpb24iLCJhcHBseUxvZ2luRnVuY3Rpb24iLCJhcmd1bWVudHMiLCJhZGRBdXRvcHVibGlzaEZpZWxkcyIsImZvckxvZ2dlZEluVXNlciIsImZvck90aGVyVXNlcnMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBSUEsUUFBUSxhQUFSLEtBQ0csQ0FBQ0EsUUFBUSx1QkFBUixDQURKLElBRUcsQ0FBQ0EsUUFBUUMsY0FBUixDQUF1Qiw0QkFBdkIsQ0FGUixFQUU4RDtBQUM1REMsVUFBUUMsSUFBUixDQUNFLG9FQUNBLG9FQURBLEdBRUEsNENBRkEsR0FHQSxJQUhBLEdBSUEsMkNBSkEsR0FLQSxJQU5GO0FBUUQsQzs7Ozs7Ozs7Ozs7QUNYREMsU0FBU0MsS0FBVCxDQUFlQyxlQUFmLENBQStCLGtCQUEvQjs7QUFFQSxJQUFJQyxPQUFPQyxRQUFYLEVBQXFCO0FBQ25CLFFBQU1DLGtDQUFrQyxVQUFVQyxPQUFWLEVBQW1CQyxRQUFuQixFQUE2QjtBQUNuRTtBQUNBLFFBQUksQ0FBRUEsUUFBRixJQUFjLE9BQU9ELE9BQVAsS0FBbUIsVUFBckMsRUFBaUQ7QUFDL0NDLGlCQUFXRCxPQUFYO0FBQ0FBLGdCQUFVLElBQVY7QUFDRDs7QUFFRCxRQUFJRSxvQ0FDRVIsU0FBU0MsS0FBVCxDQUFlUSxnQ0FBZixDQUFnREYsUUFBaEQsQ0FETjtBQUVBRyw0QkFBd0JDLGlCQUF4QixDQUEwQ0wsT0FBMUMsRUFBbURFLGlDQUFuRDtBQUNELEdBVkQ7O0FBV0FSLFdBQVNZLDJCQUFULENBQXFDLGtCQUFyQyxFQUF5RFAsK0JBQXpEOztBQUNBRixTQUFPRSwrQkFBUCxHQUF5QyxZQUFZO0FBQ25ELFdBQU9MLFNBQVNhLGtCQUFULENBQTRCLGtCQUE1QixFQUFnREMsU0FBaEQsQ0FBUDtBQUNELEdBRkQ7QUFHRCxDQWhCRCxNQWdCTztBQUNMZCxXQUFTZSxvQkFBVCxDQUE4QjtBQUM1QjtBQUNBO0FBQ0FDLHFCQUFpQixDQUFDLDJCQUFELENBSFc7QUFJNUJDLG1CQUFlLENBQ2Isb0NBRGEsRUFFYixtQ0FGYSxFQUdiLDhCQUhhO0FBSmEsR0FBOUI7QUFVRCxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9hY2NvdW50cy1tZXRlb3ItZGV2ZWxvcGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaWYgKFBhY2thZ2VbJ2FjY291bnRzLXVpJ11cbiAgICAmJiAhUGFja2FnZVsnc2VydmljZS1jb25maWd1cmF0aW9uJ11cbiAgICAmJiAhUGFja2FnZS5oYXNPd25Qcm9wZXJ0eSgnbWV0ZW9yLWRldmVsb3Blci1jb25maWctdWknKSkge1xuICBjb25zb2xlLndhcm4oXG4gICAgXCJOb3RlOiBZb3UncmUgdXNpbmcgYWNjb3VudHMtdWkgYW5kIGFjY291bnRzLW1ldGVvci1kZXZlbG9wZXIsXFxuXCIgK1xuICAgIFwiYnV0IGRpZG4ndCBpbnN0YWxsIHRoZSBjb25maWd1cmF0aW9uIFVJIGZvciB0aGUgTWV0ZW9yIERldmVsb3BlclxcblwiICtcbiAgICBcIkFjY291bnRzIE9BdXRoLiBZb3UgY2FuIGluc3RhbGwgaXQgd2l0aDpcXG5cIiArXG4gICAgXCJcXG5cIiArXG4gICAgXCIgICAgbWV0ZW9yIGFkZCBtZXRlb3ItZGV2ZWxvcGVyLWNvbmZpZy11aVwiICtcbiAgICBcIlxcblwiXG4gICk7XG59XG4iLCJBY2NvdW50cy5vYXV0aC5yZWdpc3RlclNlcnZpY2UoXCJtZXRlb3ItZGV2ZWxvcGVyXCIpO1xuXG5pZiAoTWV0ZW9yLmlzQ2xpZW50KSB7XG4gIGNvbnN0IGxvZ2luV2l0aE1ldGVvckRldmVsb3BlckFjY291bnQgPSBmdW5jdGlvbiAob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAvLyBzdXBwb3J0IGEgY2FsbGJhY2sgd2l0aG91dCBvcHRpb25zXG4gICAgaWYgKCEgY2FsbGJhY2sgJiYgdHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFyIGNyZWRlbnRpYWxSZXF1ZXN0Q29tcGxldGVDYWxsYmFjayA9XG4gICAgICAgICAgQWNjb3VudHMub2F1dGguY3JlZGVudGlhbFJlcXVlc3RDb21wbGV0ZUhhbmRsZXIoY2FsbGJhY2spO1xuICAgIE1ldGVvckRldmVsb3BlckFjY291bnRzLnJlcXVlc3RDcmVkZW50aWFsKG9wdGlvbnMsIGNyZWRlbnRpYWxSZXF1ZXN0Q29tcGxldGVDYWxsYmFjayk7XG4gIH07XG4gIEFjY291bnRzLnJlZ2lzdGVyQ2xpZW50TG9naW5GdW5jdGlvbignbWV0ZW9yLWRldmVsb3BlcicsIGxvZ2luV2l0aE1ldGVvckRldmVsb3BlckFjY291bnQpO1xuICBNZXRlb3IubG9naW5XaXRoTWV0ZW9yRGV2ZWxvcGVyQWNjb3VudCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gQWNjb3VudHMuYXBwbHlMb2dpbkZ1bmN0aW9uKCdtZXRlb3ItZGV2ZWxvcGVyJywgYXJndW1lbnRzKTtcbiAgfTtcbn0gZWxzZSB7XG4gIEFjY291bnRzLmFkZEF1dG9wdWJsaXNoRmllbGRzKHtcbiAgICAvLyBwdWJsaXNoIGFsbCBmaWVsZHMgaW5jbHVkaW5nIGFjY2VzcyB0b2tlbiwgd2hpY2ggY2FuIGxlZ2l0aW1hdGVseSBiZSB1c2VkXG4gICAgLy8gZnJvbSB0aGUgY2xpZW50IChpZiB0cmFuc21pdHRlZCBvdmVyIHNzbCBvciBvbiBsb2NhbGhvc3QpLlxuICAgIGZvckxvZ2dlZEluVXNlcjogWydzZXJ2aWNlcy5tZXRlb3ItZGV2ZWxvcGVyJ10sXG4gICAgZm9yT3RoZXJVc2VyczogW1xuICAgICAgJ3NlcnZpY2VzLm1ldGVvci1kZXZlbG9wZXIudXNlcm5hbWUnLFxuICAgICAgJ3NlcnZpY2VzLm1ldGVvci1kZXZlbG9wZXIucHJvZmlsZScsXG4gICAgICAnc2VydmljZXMubWV0ZW9yLWRldmVsb3Blci5pZCdcbiAgICBdXG4gIH0pO1xufVxuIl19
