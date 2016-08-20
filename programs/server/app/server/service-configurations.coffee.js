(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// server/service-configurations.coffee.js                             //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var _sc;                                                               // 1
                                                                       //
_sc = {};                                                              // 1
                                                                       //
ServiceConfiguration.configurations.remove({});                        // 2
                                                                       //
if (process.env['ACCOUNTS_METEOR_ID'] && process.env['ACCOUNTS_METEOR_SEC']) {
  _sc.meteor = true;                                                   //
  ServiceConfiguration.configurations.upsert({                         //
    service: 'meteor-developer'                                        //
  }, {                                                                 //
    $set: {                                                            //
      secret: process.env['ACCOUNTS_METEOR_SEC'],                      //
      clientId: process.env['ACCOUNTS_METEOR_ID'],                     //
      loginStyle: 'redirect'                                           //
    }                                                                  //
  });                                                                  //
}                                                                      //
                                                                       //
if (process.env['ACCOUNTS_GITHUB_ID'] && process.env['ACCOUNTS_GITHUB_SEC']) {
  _sc.github = true;                                                   //
  ServiceConfiguration.configurations.upsert({                         //
    service: 'github'                                                  //
  }, {                                                                 //
    $set: {                                                            //
      secret: process.env['ACCOUNTS_GITHUB_SEC'],                      //
      clientId: process.env['ACCOUNTS_GITHUB_ID'],                     //
      loginStyle: 'redirect'                                           //
    }                                                                  //
  });                                                                  //
}                                                                      //
                                                                       //
if (process.env['ACCOUNTS_TWITTER_ID'] && process.env['ACCOUNTS_TWITTER_SEC']) {
  _sc.twitter = true;                                                  //
  ServiceConfiguration.configurations.upsert({                         //
    service: 'twitter'                                                 //
  }, {                                                                 //
    $set: {                                                            //
      loginStyle: 'redirect',                                          //
      secret: process.env['ACCOUNTS_TWITTER_SEC'],                     //
      consumerKey: process.env['ACCOUNTS_TWITTER_ID']                  //
    }                                                                  //
  });                                                                  //
}                                                                      //
                                                                       //
if (process.env['ACCOUNTS_FACEBOOK_ID'] && process.env['ACCOUNTS_FACEBOOK_SEC']) {
  _sc.facebook = true;                                                 //
  ServiceConfiguration.configurations.upsert({                         //
    service: 'facebook'                                                //
  }, {                                                                 //
    $set: {                                                            //
      secret: process.env['ACCOUNTS_FACEBOOK_SEC'],                    //
      appId: process.env['ACCOUNTS_FACEBOOK_ID'],                      //
      loginStyle: 'redirect'                                           //
    }                                                                  //
  });                                                                  //
}                                                                      //
                                                                       //
Meteor.methods({                                                       // 44
  getServiceConfiguration: function() {                                //
    return _sc;                                                        // 46
  }                                                                    //
});                                                                    //
                                                                       //
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceMappingURL=service-configurations.coffee.js.map
