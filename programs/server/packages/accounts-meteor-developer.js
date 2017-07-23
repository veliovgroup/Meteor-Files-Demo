(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var _ = Package.underscore._;
var Random = Package.random.Random;
var Accounts = Package['accounts-base'].Accounts;
var MeteorDeveloperAccounts = Package['meteor-developer-oauth'].MeteorDeveloperAccounts;

(function(){

///////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                           //
// packages/accounts-meteor-developer/notice.js                                              //
//                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////
                                                                                             //
if (Package['accounts-ui']
    && !Package['service-configuration']
    && !Package.hasOwnProperty('meteor-developer-config-ui')) {
  console.warn(
    "Note: You're using accounts-ui and accounts-meteor-developer,\n" +
    "but didn't install the configuration UI for the Meteor Developer\n" +
    "Accounts OAuth. You can install it with:\n" +
    "\n" +
    "    meteor add meteor-developer-config-ui" +
    "\n"
  );
}

///////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);






(function(){

///////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                           //
// packages/accounts-meteor-developer/meteor-developer.js                                    //
//                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////
                                                                                             //
Accounts.oauth.registerService("meteor-developer");

if (Meteor.isClient) {
  const loginWithMeteorDeveloperAccount = function (options, callback) {
    // support a callback without options
    if (! callback && typeof options === "function") {
      callback = options;
      options = null;
    }

    var credentialRequestCompleteCallback =
          Accounts.oauth.credentialRequestCompleteHandler(callback);
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
    forOtherUsers: [
      'services.meteor-developer.username',
      'services.meteor-developer.profile',
      'services.meteor-developer.id'
    ]
  });
}

///////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['accounts-meteor-developer'] = {};

})();
