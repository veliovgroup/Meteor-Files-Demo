(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var HTTP = Package.http.HTTP;
var HTTPInternals = Package.http.HTTPInternals;
var OAuth1Binding = Package.oauth1.OAuth1Binding;
var OAuth = Package.oauth.OAuth;
var Oauth = Package.oauth.Oauth;
var _ = Package.underscore._;
var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;

/* Package-scope variables */
var Twitter;

(function(){

/////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                             //
// packages/twitter/twitter_server.js                                                          //
//                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                               //
Twitter = {};

var urls = {
  requestToken: "https://api.twitter.com/oauth/request_token",
  authorize: "https://api.twitter.com/oauth/authorize",
  accessToken: "https://api.twitter.com/oauth/access_token",
  authenticate: "https://api.twitter.com/oauth/authenticate"
};


// https://dev.twitter.com/docs/api/1.1/get/account/verify_credentials
Twitter.whitelistedFields = ['profile_image_url', 'profile_image_url_https', 'lang', 'email'];

OAuth.registerService('twitter', 1, urls, function(oauthBinding) {
  var identity = oauthBinding.get('https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true').data;

  var serviceData = {
    id: identity.id_str,
    screenName: identity.screen_name,
    accessToken: OAuth.sealSecret(oauthBinding.accessToken),
    accessTokenSecret: OAuth.sealSecret(oauthBinding.accessTokenSecret)
  };

  // include helpful fields from twitter
  var fields = _.pick(identity, Twitter.whitelistedFields);
  _.extend(serviceData, fields);

  return {
    serviceData: serviceData,
    options: {
      profile: {
        name: identity.name
      }
    }
  };
});


Twitter.retrieveCredential = function(credentialToken, credentialSecret) {
  return OAuth.retrieveCredential(credentialToken, credentialSecret);
};

/////////////////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package.twitter = {}, {
  Twitter: Twitter
});

})();

//# sourceMappingURL=twitter.js.map
