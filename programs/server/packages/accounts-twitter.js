(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var _ = Package.underscore._;
var Accounts = Package['accounts-base'].Accounts;
var Twitter = Package.twitter.Twitter;
var HTTP = Package.http.HTTP;
var HTTPInternals = Package.http.HTTPInternals;

(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                     //
// packages/accounts-twitter/twitter.js                                                                //
//                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                       //
Accounts.oauth.registerService('twitter');

if (Meteor.isClient) {
  Meteor.loginWithTwitter = function(options, callback) {
    // support a callback without options
    if (! callback && typeof options === "function") {
      callback = options;
      options = null;
    }

    var credentialRequestCompleteCallback = Accounts.oauth.credentialRequestCompleteHandler(callback);
    Twitter.requestCredential(options, credentialRequestCompleteCallback);
  };
} else {
  var autopublishedFields = _.map(
    // don't send access token. https://dev.twitter.com/discussions/5025
    Twitter.whitelistedFields.concat(['id', 'screenName']),
    function (subfield) { return 'services.twitter.' + subfield; });

  Accounts.addAutopublishFields({
    forLoggedInUser: autopublishedFields,
    forOtherUsers: autopublishedFields
  });
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['accounts-twitter'] = {};

})();

//# sourceMappingURL=accounts-twitter.js.map
