(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var _ = Package.underscore._;
var ECMAScript = Package.ecmascript.ECMAScript;
var DDPRateLimiter = Package['ddp-rate-limiter'].DDPRateLimiter;
var check = Package.check.check;
var Match = Package.check.Match;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var Hook = Package['callback-hook'].Hook;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var meteorInstall = Package.modules.meteorInstall;
var Buffer = Package.modules.Buffer;
var process = Package.modules.process;
var Symbol = Package['ecmascript-runtime'].Symbol;
var Map = Package['ecmascript-runtime'].Map;
var Set = Package['ecmascript-runtime'].Set;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Accounts, EXPIRE_TOKENS_INTERVAL_MS, CONNECTION_CLOSE_DELAY_MS;

var require = meteorInstall({"node_modules":{"meteor":{"accounts-base":{"server_main.js":["./accounts_server.js","./accounts_rate_limit.js","./url_server.js",function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/accounts-base/server_main.js                                                                           //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
module.export({AccountsServer:function(){return AccountsServer}});var AccountsServer;module.import("./accounts_server.js",{"AccountsServer":function(v){AccountsServer=v}});module.import("./accounts_rate_limit.js");module.import("./url_server.js");
                                                                                                                   // 2
                                                                                                                   // 3
                                                                                                                   //
/**                                                                                                                //
 * @namespace Accounts                                                                                             //
 * @summary The namespace for all server-side accounts-related methods.                                            //
 */                                                                                                                //
Accounts = new AccountsServer(Meteor.server);                                                                      // 9
                                                                                                                   //
// Users table. Don't use the normal autopublish, since we want to hide                                            //
// some fields. Code to autopublish this is in accounts_server.js.                                                 //
// XXX Allow users to configure this collection name.                                                              //
                                                                                                                   //
/**                                                                                                                //
 * @summary A [Mongo.Collection](#collections) containing user documents.                                          //
 * @locus Anywhere                                                                                                 //
 * @type {Mongo.Collection}                                                                                        //
 * @importFromPackage meteor                                                                                       //
*/                                                                                                                 //
Meteor.users = Accounts.users;                                                                                     // 21
                                                                                                                   //
                                                                                                                   // 23
                                                                                                                   //
                                                                                                                   //
                                                                                                                   //
                                                                                                                   //
                                                                                                                   // 28
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"accounts_common.js":["babel-runtime/helpers/classCallCheck",function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/accounts-base/accounts_common.js                                                                       //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
module.export({AccountsCommon:function(){return AccountsCommon}});var _classCallCheck;module.import("babel-runtime/helpers/classCallCheck",{"default":function(v){_classCallCheck=v}});
/**                                                                                                                //
 * @summary Super-constructor for AccountsClient and AccountsServer.                                               //
 * @locus Anywhere                                                                                                 //
 * @class AccountsCommon                                                                                           //
 * @instancename accountsClientOrServer                                                                            //
 * @param options {Object} an object with fields:                                                                  //
 * - connection {Object} Optional DDP connection to reuse.                                                         //
 * - ddpUrl {String} Optional URL for creating a new DDP connection.                                               //
 */                                                                                                                //
var AccountsCommon = function () {                                                                                 // 10
  function AccountsCommon(options) {                                                                               // 11
    _classCallCheck(this, AccountsCommon);                                                                         // 11
                                                                                                                   //
    // Currently this is read directly by packages like accounts-password                                          //
    // and accounts-ui-unstyled.                                                                                   //
    this._options = {};                                                                                            // 14
                                                                                                                   //
    // Note that setting this.connection = null causes this.users to be a                                          //
    // LocalCollection, which is not what we want.                                                                 //
    this.connection = undefined;                                                                                   // 18
    this._initConnection(options || {});                                                                           // 19
                                                                                                                   //
    // There is an allow call in accounts_server.js that restricts writes to                                       //
    // this collection.                                                                                            //
    this.users = new Mongo.Collection("users", {                                                                   // 23
      _preventAutopublish: true,                                                                                   // 24
      connection: this.connection                                                                                  // 25
    });                                                                                                            // 23
                                                                                                                   //
    // Callback exceptions are printed with Meteor._debug and ignored.                                             //
    this._onLoginHook = new Hook({                                                                                 // 29
      bindEnvironment: false,                                                                                      // 30
      debugPrintExceptions: "onLogin callback"                                                                     // 31
    });                                                                                                            // 29
                                                                                                                   //
    this._onLoginFailureHook = new Hook({                                                                          // 34
      bindEnvironment: false,                                                                                      // 35
      debugPrintExceptions: "onLoginFailure callback"                                                              // 36
    });                                                                                                            // 34
                                                                                                                   //
    this._onLogoutHook = new Hook({                                                                                // 39
      bindEnvironment: false,                                                                                      // 40
      debugPrintExceptions: "onLogout callback"                                                                    // 41
    });                                                                                                            // 39
  }                                                                                                                // 43
                                                                                                                   //
  /**                                                                                                              //
   * @summary Get the current user id, or `null` if no user is logged in. A reactive data source.                  //
   * @locus Anywhere but publish functions                                                                         //
   */                                                                                                              //
                                                                                                                   //
                                                                                                                   //
  AccountsCommon.prototype.userId = function userId() {                                                            // 10
    throw new Error("userId method not implemented");                                                              // 50
  };                                                                                                               // 51
                                                                                                                   //
  /**                                                                                                              //
   * @summary Get the current user record, or `null` if no user is logged in. A reactive data source.              //
   * @locus Anywhere but publish functions                                                                         //
   */                                                                                                              //
                                                                                                                   //
                                                                                                                   //
  AccountsCommon.prototype.user = function user() {                                                                // 10
    var userId = this.userId();                                                                                    // 58
    return userId ? this.users.findOne(userId) : null;                                                             // 59
  };                                                                                                               // 60
                                                                                                                   //
  // Set up config for the accounts system. Call this on both the client                                           //
  // and the server.                                                                                               //
  //                                                                                                               //
  // Note that this method gets overridden on AccountsServer.prototype, but                                        //
  // the overriding method calls the overridden method.                                                            //
  //                                                                                                               //
  // XXX we should add some enforcement that this is called on both the                                            //
  // client and the server. Otherwise, a user can                                                                  //
  // 'forbidClientAccountCreation' only on the client and while it looks                                           //
  // like their app is secure, the server will still accept createUser                                             //
  // calls. https://github.com/meteor/meteor/issues/828                                                            //
  //                                                                                                               //
  // @param options {Object} an object with fields:                                                                //
  // - sendVerificationEmail {Boolean}                                                                             //
  //     Send email address verification emails to new users created from                                          //
  //     client signups.                                                                                           //
  // - forbidClientAccountCreation {Boolean}                                                                       //
  //     Do not allow clients to create accounts directly.                                                         //
  // - restrictCreationByEmailDomain {Function or String}                                                          //
  //     Require created users to have an email matching the function or                                           //
  //     having the string as domain.                                                                              //
  // - loginExpirationInDays {Number}                                                                              //
  //     Number of days since login until a user is logged out (login token                                        //
  //     expires).                                                                                                 //
  // - passwordResetTokenExpirationInDays {Number}                                                                 //
  //     Number of days since password reset token creation until the                                              //
  //     token cannt be used any longer (password reset token expires).                                            //
                                                                                                                   //
  /**                                                                                                              //
   * @summary Set global accounts options.                                                                         //
   * @locus Anywhere                                                                                               //
   * @param {Object} options                                                                                       //
   * @param {Boolean} options.sendVerificationEmail New users with an email address will receive an address verification email.
   * @param {Boolean} options.forbidClientAccountCreation Calls to [`createUser`](#accounts_createuser) from the client will be rejected. In addition, if you are using [accounts-ui](#accountsui), the "Create account" link will not be available.
   * @param {String | Function} options.restrictCreationByEmailDomain If set to a string, only allows new users if the domain part of their email address matches the string. If set to a function, only allows new users if the function returns true.  The function is passed the full email address of the proposed new user.  Works with password-based sign-in and external services that expose email addresses (Google, Facebook, GitHub). All existing users still can log in after enabling this option. Example: `Accounts.config({ restrictCreationByEmailDomain: 'school.edu' })`.
   * @param {Number} options.loginExpirationInDays The number of days from when a user logs in until their token expires and they are logged out. Defaults to 90. Set to `null` to disable login expiration.
   * @param {String} options.oauthSecretKey When using the `oauth-encryption` package, the 16 byte key using to encrypt sensitive account credentials in the database, encoded in base64.  This option may only be specifed on the server.  See packages/oauth-encryption/README.md for details.
   * @param {Number} options.passwordResetTokenExpirationInDays The number of days from when a link to reset password is sent until token expires and user can't reset password with the link anymore. Defaults to 3.
   */                                                                                                              //
                                                                                                                   //
                                                                                                                   //
  AccountsCommon.prototype.config = function config(options) {                                                     // 10
    var self = this;                                                                                               // 102
                                                                                                                   //
    // We don't want users to accidentally only call Accounts.config on the                                        //
    // client, where some of the options will have partial effects (eg removing                                    //
    // the "create account" button from accounts-ui if forbidClientAccountCreation                                 //
    // is set, or redirecting Google login to a specific-domain page) without                                      //
    // having their full effects.                                                                                  //
    if (Meteor.isServer) {                                                                                         // 109
      __meteor_runtime_config__.accountsConfigCalled = true;                                                       // 110
    } else if (!__meteor_runtime_config__.accountsConfigCalled) {                                                  // 111
      // XXX would be nice to "crash" the client and replace the UI with an error                                  //
      // message, but there's no trivial way to do this.                                                           //
      Meteor._debug("Accounts.config was called on the client but not on the " + "server; some configuration options may not take effect.");
    }                                                                                                              // 116
                                                                                                                   //
    // We need to validate the oauthSecretKey option at the time                                                   //
    // Accounts.config is called. We also deliberately don't store the                                             //
    // oauthSecretKey in Accounts._options.                                                                        //
    if (_.has(options, "oauthSecretKey")) {                                                                        // 121
      if (Meteor.isClient) throw new Error("The oauthSecretKey option may only be specified on the server");       // 122
      if (!Package["oauth-encryption"]) throw new Error("The oauth-encryption package must be loaded to set oauthSecretKey");
      Package["oauth-encryption"].OAuthEncryption.loadKey(options.oauthSecretKey);                                 // 126
      options = _.omit(options, "oauthSecretKey");                                                                 // 127
    }                                                                                                              // 128
                                                                                                                   //
    // validate option keys                                                                                        //
    var VALID_KEYS = ["sendVerificationEmail", "forbidClientAccountCreation", "restrictCreationByEmailDomain", "loginExpirationInDays", "passwordResetTokenExpirationInDays"];
    _.each(_.keys(options), function (key) {                                                                       // 133
      if (!_.contains(VALID_KEYS, key)) {                                                                          // 134
        throw new Error("Accounts.config: Invalid key: " + key);                                                   // 135
      }                                                                                                            // 136
    });                                                                                                            // 137
                                                                                                                   //
    // set values in Accounts._options                                                                             //
    _.each(VALID_KEYS, function (key) {                                                                            // 140
      if (key in options) {                                                                                        // 141
        if (key in self._options) {                                                                                // 142
          throw new Error("Can't set `" + key + "` more than once");                                               // 143
        }                                                                                                          // 144
        self._options[key] = options[key];                                                                         // 145
      }                                                                                                            // 146
    });                                                                                                            // 147
  };                                                                                                               // 148
                                                                                                                   //
  /**                                                                                                              //
   * @summary Register a callback to be called after a login attempt succeeds.                                     //
   * @locus Anywhere                                                                                               //
   * @param {Function} func The callback to be called when login is successful.                                    //
   */                                                                                                              //
                                                                                                                   //
                                                                                                                   //
  AccountsCommon.prototype.onLogin = function onLogin(func) {                                                      // 10
    return this._onLoginHook.register(func);                                                                       // 156
  };                                                                                                               // 157
                                                                                                                   //
  /**                                                                                                              //
   * @summary Register a callback to be called after a login attempt fails.                                        //
   * @locus Anywhere                                                                                               //
   * @param {Function} func The callback to be called after the login has failed.                                  //
   */                                                                                                              //
                                                                                                                   //
                                                                                                                   //
  AccountsCommon.prototype.onLoginFailure = function onLoginFailure(func) {                                        // 10
    return this._onLoginFailureHook.register(func);                                                                // 165
  };                                                                                                               // 166
                                                                                                                   //
  /**                                                                                                              //
   * @summary Register a callback to be called after a logout attempt succeeds.                                    //
   * @locus Anywhere                                                                                               //
   * @param {Function} func The callback to be called when logout is successful.                                   //
   */                                                                                                              //
                                                                                                                   //
                                                                                                                   //
  AccountsCommon.prototype.onLogout = function onLogout(func) {                                                    // 10
    return this._onLogoutHook.register(func);                                                                      // 174
  };                                                                                                               // 175
                                                                                                                   //
  AccountsCommon.prototype._initConnection = function _initConnection(options) {                                   // 10
    if (!Meteor.isClient) {                                                                                        // 178
      return;                                                                                                      // 179
    }                                                                                                              // 180
                                                                                                                   //
    // The connection used by the Accounts system. This is the connection                                          //
    // that will get logged in by Meteor.login(), and this is the                                                  //
    // connection whose login state will be reflected by Meteor.userId().                                          //
    //                                                                                                             //
    // It would be much preferable for this to be in accounts_client.js,                                           //
    // but it has to be here because it's needed to create the                                                     //
    // Meteor.users collection.                                                                                    //
                                                                                                                   //
    if (options.connection) {                                                                                      // 190
      this.connection = options.connection;                                                                        // 191
    } else if (options.ddpUrl) {                                                                                   // 192
      this.connection = DDP.connect(options.ddpUrl);                                                               // 193
    } else if (typeof __meteor_runtime_config__ !== "undefined" && __meteor_runtime_config__.ACCOUNTS_CONNECTION_URL) {
      // Temporary, internal hook to allow the server to point the client                                          //
      // to a different authentication server. This is for a very                                                  //
      // particular use case that comes up when implementing a oauth                                               //
      // server. Unsupported and may go away at any point in time.                                                 //
      //                                                                                                           //
      // We will eventually provide a general way to use account-base                                              //
      // against any DDP connection, not just one special one.                                                     //
      this.connection = DDP.connect(__meteor_runtime_config__.ACCOUNTS_CONNECTION_URL);                            // 203
    } else {                                                                                                       // 205
      this.connection = Meteor.connection;                                                                         // 206
    }                                                                                                              // 207
  };                                                                                                               // 208
                                                                                                                   //
  AccountsCommon.prototype._getTokenLifetimeMs = function _getTokenLifetimeMs() {                                  // 10
    return (this._options.loginExpirationInDays || DEFAULT_LOGIN_EXPIRATION_DAYS) * 24 * 60 * 60 * 1000;           // 211
  };                                                                                                               // 213
                                                                                                                   //
  AccountsCommon.prototype._getPasswordResetTokenLifetimeMs = function _getPasswordResetTokenLifetimeMs() {        // 10
    return (this._options.passwordResetTokenExpirationInDays || DEFAULT_PASSWORD_RESET_TOKEN_EXPIRATION_DAYS) * 24 * 60 * 60 * 1000;
  };                                                                                                               // 218
                                                                                                                   //
  AccountsCommon.prototype._tokenExpiration = function _tokenExpiration(when) {                                    // 10
    // We pass when through the Date constructor for backwards compatibility;                                      //
    // `when` used to be a number.                                                                                 //
    return new Date(new Date(when).getTime() + this._getTokenLifetimeMs());                                        // 223
  };                                                                                                               // 224
                                                                                                                   //
  AccountsCommon.prototype._tokenExpiresSoon = function _tokenExpiresSoon(when) {                                  // 10
    var minLifetimeMs = .1 * this._getTokenLifetimeMs();                                                           // 227
    var minLifetimeCapMs = MIN_TOKEN_LIFETIME_CAP_SECS * 1000;                                                     // 228
    if (minLifetimeMs > minLifetimeCapMs) minLifetimeMs = minLifetimeCapMs;                                        // 229
    return new Date() > new Date(when) - minLifetimeMs;                                                            // 231
  };                                                                                                               // 232
                                                                                                                   //
  return AccountsCommon;                                                                                           // 10
}();                                                                                                               // 10
                                                                                                                   //
var Ap = AccountsCommon.prototype;                                                                                 // 235
                                                                                                                   //
// Note that Accounts is defined separately in accounts_client.js and                                              //
// accounts_server.js.                                                                                             //
                                                                                                                   //
/**                                                                                                                //
 * @summary Get the current user id, or `null` if no user is logged in. A reactive data source.                    //
 * @locus Anywhere but publish functions                                                                           //
 * @importFromPackage meteor                                                                                       //
 */                                                                                                                //
Meteor.userId = function () {                                                                                      // 245
  return Accounts.userId();                                                                                        // 246
};                                                                                                                 // 247
                                                                                                                   //
/**                                                                                                                //
 * @summary Get the current user record, or `null` if no user is logged in. A reactive data source.                //
 * @locus Anywhere but publish functions                                                                           //
 * @importFromPackage meteor                                                                                       //
 */                                                                                                                //
Meteor.user = function () {                                                                                        // 254
  return Accounts.user();                                                                                          // 255
};                                                                                                                 // 256
                                                                                                                   //
// how long (in days) until a login token expires                                                                  //
var DEFAULT_LOGIN_EXPIRATION_DAYS = 90;                                                                            // 259
// how long (in days) until reset password token expires                                                           //
var DEFAULT_PASSWORD_RESET_TOKEN_EXPIRATION_DAYS = 3;                                                              // 261
// Clients don't try to auto-login with a token that is going to expire within                                     //
// .1 * DEFAULT_LOGIN_EXPIRATION_DAYS, capped at MIN_TOKEN_LIFETIME_CAP_SECS.                                      //
// Tries to avoid abrupt disconnects from expiring tokens.                                                         //
var MIN_TOKEN_LIFETIME_CAP_SECS = 3600; // one hour                                                                // 265
// how often (in milliseconds) we check for expired tokens                                                         //
EXPIRE_TOKENS_INTERVAL_MS = 600 * 1000; // 10 minutes                                                              // 267
// how long we wait before logging out clients when Meteor.logoutOtherClients is                                   //
// called                                                                                                          //
CONNECTION_CLOSE_DELAY_MS = 10 * 1000;                                                                             // 270
                                                                                                                   //
// loginServiceConfiguration and ConfigError are maintained for backwards compatibility                            //
Meteor.startup(function () {                                                                                       // 273
  var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;                                // 274
  Ap.loginServiceConfiguration = ServiceConfiguration.configurations;                                              // 276
  Ap.ConfigError = ServiceConfiguration.ConfigError;                                                               // 277
});                                                                                                                // 278
                                                                                                                   //
// Thrown when the user cancels the login process (eg, closes an oauth                                             //
// popup, declines retina scan, etc)                                                                               //
var lceName = 'Accounts.LoginCancelledError';                                                                      // 282
Ap.LoginCancelledError = Meteor.makeErrorType(lceName, function (description) {                                    // 283
  this.message = description;                                                                                      // 286
});                                                                                                                // 287
Ap.LoginCancelledError.prototype.name = lceName;                                                                   // 289
                                                                                                                   //
// This is used to transmit specific subclass errors over the wire. We should                                      //
// come up with a more generic way to do this (eg, with some sort of symbolic                                      //
// error code rather than a number).                                                                               //
Ap.LoginCancelledError.numericError = 0x8acdc2f;                                                                   // 294
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"accounts_rate_limit.js":["./accounts_common.js",function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/accounts-base/accounts_rate_limit.js                                                                   //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
var AccountsCommon;module.import("./accounts_common.js",{"AccountsCommon":function(v){AccountsCommon=v}});         // 1
                                                                                                                   //
var Ap = AccountsCommon.prototype;                                                                                 // 3
var defaultRateLimiterRuleId;                                                                                      // 4
// Removes default rate limiting rule                                                                              //
Ap.removeDefaultRateLimit = function () {                                                                          // 6
  var resp = DDPRateLimiter.removeRule(defaultRateLimiterRuleId);                                                  // 7
  defaultRateLimiterRuleId = null;                                                                                 // 8
  return resp;                                                                                                     // 9
};                                                                                                                 // 10
                                                                                                                   //
// Add a default rule of limiting logins, creating new users and password reset                                    //
// to 5 times every 10 seconds per connection.                                                                     //
Ap.addDefaultRateLimit = function () {                                                                             // 14
  if (!defaultRateLimiterRuleId) {                                                                                 // 15
    defaultRateLimiterRuleId = DDPRateLimiter.addRule({                                                            // 16
      userId: null,                                                                                                // 17
      clientAddress: null,                                                                                         // 18
      type: 'method',                                                                                              // 19
      name: function name(_name) {                                                                                 // 20
        return _.contains(['login', 'createUser', 'resetPassword', 'forgotPassword'], _name);                      // 21
      },                                                                                                           // 23
      connectionId: function connectionId(_connectionId) {                                                         // 24
        return true;                                                                                               // 25
      }                                                                                                            // 26
    }, 5, 10000);                                                                                                  // 16
  }                                                                                                                // 28
};                                                                                                                 // 29
                                                                                                                   //
Ap.addDefaultRateLimit();                                                                                          // 31
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"accounts_server.js":["babel-runtime/helpers/classCallCheck","babel-runtime/helpers/possibleConstructorReturn","babel-runtime/helpers/inherits","./accounts_common.js",function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/accounts-base/accounts_server.js                                                                       //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
module.export({AccountsServer:function(){return AccountsServer}});var _classCallCheck;module.import('babel-runtime/helpers/classCallCheck',{"default":function(v){_classCallCheck=v}});var _possibleConstructorReturn;module.import('babel-runtime/helpers/possibleConstructorReturn',{"default":function(v){_possibleConstructorReturn=v}});var _inherits;module.import('babel-runtime/helpers/inherits',{"default":function(v){_inherits=v}});var AccountsCommon;module.import("./accounts_common.js",{"AccountsCommon":function(v){AccountsCommon=v}});
                                                                                                                   //
                                                                                                                   //
var crypto = Npm.require('crypto');                                                                                // 1
                                                                                                                   //
                                                                                                                   // 3
                                                                                                                   //
/**                                                                                                                //
 * @summary Constructor for the `Accounts` namespace on the server.                                                //
 * @locus Server                                                                                                   //
 * @class AccountsServer                                                                                           //
 * @extends AccountsCommon                                                                                         //
 * @instancename accountsServer                                                                                    //
 * @param {Object} server A server object such as `Meteor.server`.                                                 //
 */                                                                                                                //
var AccountsServer = function (_AccountsCommon) {                                                                  // 13
  _inherits(AccountsServer, _AccountsCommon);                                                                      // 13
                                                                                                                   //
  // Note that this constructor is less likely to be instantiated multiple                                         //
  // times than the `AccountsClient` constructor, because a single server                                          //
  // can provide only one set of methods.                                                                          //
                                                                                                                   //
  function AccountsServer(server) {                                                                                // 17
    _classCallCheck(this, AccountsServer);                                                                         // 17
                                                                                                                   //
    var _this = _possibleConstructorReturn(this, _AccountsCommon.call(this));                                      // 17
                                                                                                                   //
    _this._server = server || Meteor.server;                                                                       // 20
    // Set up the server's methods, as if by calling Meteor.methods.                                               //
    _this._initServerMethods();                                                                                    // 22
                                                                                                                   //
    _this._initAccountDataHooks();                                                                                 // 24
                                                                                                                   //
    // If autopublish is on, publish these user fields. Login service                                              //
    // packages (eg accounts-google) add to these by calling                                                       //
    // addAutopublishFields.  Notably, this isn't implemented with multiple                                        //
    // publishes since DDP only merges only across top-level fields, not                                           //
    // subfields (such as 'services.facebook.accessToken')                                                         //
    _this._autopublishFields = {                                                                                   // 31
      loggedInUser: ['profile', 'username', 'emails'],                                                             // 32
      otherUsers: ['profile', 'username']                                                                          // 33
    };                                                                                                             // 31
    _this._initServerPublications();                                                                               // 35
                                                                                                                   //
    // connectionId -> {connection, loginToken}                                                                    //
    _this._accountData = {};                                                                                       // 38
                                                                                                                   //
    // connection id -> observe handle for the login token that this connection is                                 //
    // currently associated with, or a number. The number indicates that we are in                                 //
    // the process of setting up the observe (using a number instead of a single                                   //
    // sentinel allows multiple attempts to set up the observe to identify which                                   //
    // one was theirs).                                                                                            //
    _this._userObservesForConnections = {};                                                                        // 45
    _this._nextUserObserveNumber = 1; // for the number described above.                                           // 46
                                                                                                                   //
    // list of all registered handlers.                                                                            //
    _this._loginHandlers = [];                                                                                     // 49
                                                                                                                   //
    setupUsersCollection(_this.users);                                                                             // 51
    setupDefaultLoginHandlers(_this);                                                                              // 52
    setExpireTokensInterval(_this);                                                                                // 53
                                                                                                                   //
    _this._validateLoginHook = new Hook({ bindEnvironment: false });                                               // 55
    _this._validateNewUserHooks = [defaultValidateNewUserHook.bind(_this)];                                        // 56
                                                                                                                   //
    _this._deleteSavedTokensForAllUsersOnStartup();                                                                // 60
                                                                                                                   //
    _this._skipCaseInsensitiveChecksForTest = {};                                                                  // 62
    return _this;                                                                                                  // 17
  }                                                                                                                // 63
                                                                                                                   //
  ///                                                                                                              //
  /// CURRENT USER                                                                                                 //
  ///                                                                                                              //
                                                                                                                   //
  // @override of "abstract" non-implementation in accounts_common.js                                              //
                                                                                                                   //
                                                                                                                   //
  AccountsServer.prototype.userId = function userId() {                                                            // 13
    // This function only works if called inside a method. In theory, it                                           //
    // could also be called from publish statements, since they also                                               //
    // have a userId associated with them. However, given that publish                                             //
    // functions aren't reactive, using any of the infomation from                                                 //
    // Meteor.user() in a publish function will always use the value                                               //
    // from when the function first runs. This is likely not what the                                              //
    // user expects. The way to make this work in a publish is to do                                               //
    // Meteor.find(this.userId).observe and recompute when the user                                                //
    // record changes.                                                                                             //
    var currentInvocation = DDP._CurrentInvocation.get();                                                          // 80
    if (!currentInvocation) throw new Error("Meteor.userId can only be invoked in method calls. Use this.userId in publish functions.");
    return currentInvocation.userId;                                                                               // 83
  };                                                                                                               // 84
                                                                                                                   //
  ///                                                                                                              //
  /// LOGIN HOOKS                                                                                                  //
  ///                                                                                                              //
                                                                                                                   //
  /**                                                                                                              //
   * @summary Validate login attempts.                                                                             //
   * @locus Server                                                                                                 //
   * @param {Function} func Called whenever a login is attempted (either successful or unsuccessful).  A login can be aborted by returning a falsy value or throwing an exception.
   */                                                                                                              //
                                                                                                                   //
                                                                                                                   //
  AccountsServer.prototype.validateLoginAttempt = function validateLoginAttempt(func) {                            // 13
    // Exceptions inside the hook callback are passed up to us.                                                    //
    return this._validateLoginHook.register(func);                                                                 // 97
  };                                                                                                               // 98
                                                                                                                   //
  /**                                                                                                              //
   * @summary Set restrictions on new user creation.                                                               //
   * @locus Server                                                                                                 //
   * @param {Function} func Called whenever a new user is created. Takes the new user object, and returns true to allow the creation or false to abort.
   */                                                                                                              //
                                                                                                                   //
                                                                                                                   //
  AccountsServer.prototype.validateNewUser = function validateNewUser(func) {                                      // 13
    this._validateNewUserHooks.push(func);                                                                         // 106
  };                                                                                                               // 107
                                                                                                                   //
  ///                                                                                                              //
  /// CREATE USER HOOKS                                                                                            //
  ///                                                                                                              //
                                                                                                                   //
  /**                                                                                                              //
   * @summary Customize new user creation.                                                                         //
   * @locus Server                                                                                                 //
   * @param {Function} func Called whenever a new user is created. Return the new user object, or throw an `Error` to abort the creation.
   */                                                                                                              //
                                                                                                                   //
                                                                                                                   //
  AccountsServer.prototype.onCreateUser = function onCreateUser(func) {                                            // 13
    if (this._onCreateUserHook) {                                                                                  // 119
      throw new Error("Can only call onCreateUser once");                                                          // 120
    }                                                                                                              // 121
                                                                                                                   //
    this._onCreateUserHook = func;                                                                                 // 123
  };                                                                                                               // 124
                                                                                                                   //
  return AccountsServer;                                                                                           // 13
}(AccountsCommon);;                                                                                                // 13
                                                                                                                   //
var Ap = AccountsServer.prototype;                                                                                 // 127
                                                                                                                   //
// Give each login hook callback a fresh cloned copy of the attempt                                                //
// object, but don't clone the connection.                                                                         //
//                                                                                                                 //
function cloneAttemptWithConnection(connection, attempt) {                                                         // 132
  var clonedAttempt = EJSON.clone(attempt);                                                                        // 133
  clonedAttempt.connection = connection;                                                                           // 134
  return clonedAttempt;                                                                                            // 135
}                                                                                                                  // 136
                                                                                                                   //
Ap._validateLogin = function (connection, attempt) {                                                               // 138
  this._validateLoginHook.each(function (callback) {                                                               // 139
    var ret;                                                                                                       // 140
    try {                                                                                                          // 141
      ret = callback(cloneAttemptWithConnection(connection, attempt));                                             // 142
    } catch (e) {                                                                                                  // 143
      attempt.allowed = false;                                                                                     // 145
      // XXX this means the last thrown error overrides previous error                                             //
      // messages. Maybe this is surprising to users and we should make                                            //
      // overriding errors more explicit. (see                                                                     //
      // https://github.com/meteor/meteor/issues/1960)                                                             //
      attempt.error = e;                                                                                           // 150
      return true;                                                                                                 // 151
    }                                                                                                              // 152
    if (!ret) {                                                                                                    // 153
      attempt.allowed = false;                                                                                     // 154
      // don't override a specific error provided by a previous                                                    //
      // validator or the initial attempt (eg "incorrect password").                                               //
      if (!attempt.error) attempt.error = new Meteor.Error(403, "Login forbidden");                                // 157
    }                                                                                                              // 159
    return true;                                                                                                   // 160
  });                                                                                                              // 161
};                                                                                                                 // 162
                                                                                                                   //
Ap._successfulLogin = function (connection, attempt) {                                                             // 165
  this._onLoginHook.each(function (callback) {                                                                     // 166
    callback(cloneAttemptWithConnection(connection, attempt));                                                     // 167
    return true;                                                                                                   // 168
  });                                                                                                              // 169
};                                                                                                                 // 170
                                                                                                                   //
Ap._failedLogin = function (connection, attempt) {                                                                 // 172
  this._onLoginFailureHook.each(function (callback) {                                                              // 173
    callback(cloneAttemptWithConnection(connection, attempt));                                                     // 174
    return true;                                                                                                   // 175
  });                                                                                                              // 176
};                                                                                                                 // 177
                                                                                                                   //
Ap._successfulLogout = function (connection, userId) {                                                             // 179
  var user = userId && this.users.findOne(userId);                                                                 // 180
  this._onLogoutHook.each(function (callback) {                                                                    // 181
    callback({ user: user, connection: connection });                                                              // 182
    return true;                                                                                                   // 183
  });                                                                                                              // 184
};                                                                                                                 // 185
                                                                                                                   //
///                                                                                                                //
/// LOGIN METHODS                                                                                                  //
///                                                                                                                //
                                                                                                                   //
// Login methods return to the client an object containing these                                                   //
// fields when the user was logged in successfully:                                                                //
//                                                                                                                 //
//   id: userId                                                                                                    //
//   token: *                                                                                                      //
//   tokenExpires: *                                                                                               //
//                                                                                                                 //
// tokenExpires is optional and intends to provide a hint to the                                                   //
// client as to when the token will expire. If not provided, the                                                   //
// client will call Accounts._tokenExpiration, passing it the date                                                 //
// that it received the token.                                                                                     //
//                                                                                                                 //
// The login method will throw an error back to the client if the user                                             //
// failed to log in.                                                                                               //
//                                                                                                                 //
//                                                                                                                 //
// Login handlers and service specific login methods such as                                                       //
// `createUser` internally return a `result` object containing these                                               //
// fields:                                                                                                         //
//                                                                                                                 //
//   type:                                                                                                         //
//     optional string; the service name, overrides the handler                                                    //
//     default if present.                                                                                         //
//                                                                                                                 //
//   error:                                                                                                        //
//     exception; if the user is not allowed to login, the reason why.                                             //
//                                                                                                                 //
//   userId:                                                                                                       //
//     string; the user id of the user attempting to login (if                                                     //
//     known), required for an allowed login.                                                                      //
//                                                                                                                 //
//   options:                                                                                                      //
//     optional object merged into the result returned by the login                                                //
//     method; used by HAMK from SRP.                                                                              //
//                                                                                                                 //
//   stampedLoginToken:                                                                                            //
//     optional object with `token` and `when` indicating the login                                                //
//     token is already present in the database, returned by the                                                   //
//     "resume" login handler.                                                                                     //
//                                                                                                                 //
// For convenience, login methods can also throw an exception, which                                               //
// is converted into an {error} result.  However, if the id of the                                                 //
// user attempting the login is known, a {userId, error} result should                                             //
// be returned instead since the user id is not captured when an                                                   //
// exception is thrown.                                                                                            //
//                                                                                                                 //
// This internal `result` object is automatically converted into the                                               //
// public {id, token, tokenExpires} object returned to the client.                                                 //
                                                                                                                   //
// Try a login method, converting thrown exceptions into an {error}                                                //
// result.  The `type` argument is a default, inserted into the result                                             //
// object if not explicitly returned.                                                                              //
//                                                                                                                 //
var tryLoginMethod = function tryLoginMethod(type, fn) {                                                           // 245
  var result;                                                                                                      // 246
  try {                                                                                                            // 247
    result = fn();                                                                                                 // 248
  } catch (e) {                                                                                                    // 249
    result = { error: e };                                                                                         // 251
  }                                                                                                                // 252
                                                                                                                   //
  if (result && !result.type && type) result.type = type;                                                          // 254
                                                                                                                   //
  return result;                                                                                                   // 257
};                                                                                                                 // 258
                                                                                                                   //
// Log in a user on a connection.                                                                                  //
//                                                                                                                 //
// We use the method invocation to set the user id on the connection,                                              //
// not the connection object directly. setUserId is tied to methods to                                             //
// enforce clear ordering of method application (using wait methods on                                             //
// the client, and a no setUserId after unblock restriction on the                                                 //
// server)                                                                                                         //
//                                                                                                                 //
// The `stampedLoginToken` parameter is optional.  When present, it                                                //
// indicates that the login token has already been inserted into the                                               //
// database and doesn't need to be inserted again.  (It's used by the                                              //
// "resume" login handler).                                                                                        //
Ap._loginUser = function (methodInvocation, userId, stampedLoginToken) {                                           // 273
  var self = this;                                                                                                 // 274
                                                                                                                   //
  if (!stampedLoginToken) {                                                                                        // 276
    stampedLoginToken = self._generateStampedLoginToken();                                                         // 277
    self._insertLoginToken(userId, stampedLoginToken);                                                             // 278
  }                                                                                                                // 279
                                                                                                                   //
  // This order (and the avoidance of yields) is important to make                                                 //
  // sure that when publish functions are rerun, they see a                                                        //
  // consistent view of the world: the userId is set and matches                                                   //
  // the login token on the connection (not that there is                                                          //
  // currently a public API for reading the login token on a                                                       //
  // connection).                                                                                                  //
  Meteor._noYieldsAllowed(function () {                                                                            // 287
    self._setLoginToken(userId, methodInvocation.connection, self._hashLoginToken(stampedLoginToken.token));       // 288
  });                                                                                                              // 293
                                                                                                                   //
  methodInvocation.setUserId(userId);                                                                              // 295
                                                                                                                   //
  return {                                                                                                         // 297
    id: userId,                                                                                                    // 298
    token: stampedLoginToken.token,                                                                                // 299
    tokenExpires: self._tokenExpiration(stampedLoginToken.when)                                                    // 300
  };                                                                                                               // 297
};                                                                                                                 // 302
                                                                                                                   //
// After a login method has completed, call the login hooks.  Note                                                 //
// that `attemptLogin` is called for *all* login attempts, even ones                                               //
// which aren't successful (such as an invalid password, etc).                                                     //
//                                                                                                                 //
// If the login is allowed and isn't aborted by a validate login hook                                              //
// callback, log in the user.                                                                                      //
//                                                                                                                 //
Ap._attemptLogin = function (methodInvocation, methodName, methodArgs, result) {                                   // 312
  if (!result) throw new Error("result is required");                                                              // 318
                                                                                                                   //
  // XXX A programming error in a login handler can lead to this occuring, and                                     //
  // then we don't call onLogin or onLoginFailure callbacks. Should                                                //
  // tryLoginMethod catch this case and turn it into an error?                                                     //
  if (!result.userId && !result.error) throw new Error("A login method must specify a userId or an error");        // 324
                                                                                                                   //
  var user;                                                                                                        // 327
  if (result.userId) user = this.users.findOne(result.userId);                                                     // 328
                                                                                                                   //
  var attempt = {                                                                                                  // 331
    type: result.type || "unknown",                                                                                // 332
    allowed: !!(result.userId && !result.error),                                                                   // 333
    methodName: methodName,                                                                                        // 334
    methodArguments: _.toArray(methodArgs)                                                                         // 335
  };                                                                                                               // 331
  if (result.error) attempt.error = result.error;                                                                  // 337
  if (user) attempt.user = user;                                                                                   // 339
                                                                                                                   //
  // _validateLogin may mutate `attempt` by adding an error and changing allowed                                   //
  // to false, but that's the only change it can make (and the user's callbacks                                    //
  // only get a clone of `attempt`).                                                                               //
  this._validateLogin(methodInvocation.connection, attempt);                                                       // 345
                                                                                                                   //
  if (attempt.allowed) {                                                                                           // 347
    var ret = _.extend(this._loginUser(methodInvocation, result.userId, result.stampedLoginToken), result.options || {});
    this._successfulLogin(methodInvocation.connection, attempt);                                                   // 356
    return ret;                                                                                                    // 357
  } else {                                                                                                         // 358
    this._failedLogin(methodInvocation.connection, attempt);                                                       // 360
    throw attempt.error;                                                                                           // 361
  }                                                                                                                // 362
};                                                                                                                 // 363
                                                                                                                   //
// All service specific login methods should go through this function.                                             //
// Ensure that thrown exceptions are caught and that login hook                                                    //
// callbacks are still called.                                                                                     //
//                                                                                                                 //
Ap._loginMethod = function (methodInvocation, methodName, methodArgs, type, fn) {                                  // 370
  return this._attemptLogin(methodInvocation, methodName, methodArgs, tryLoginMethod(type, fn));                   // 377
};                                                                                                                 // 383
                                                                                                                   //
// Report a login attempt failed outside the context of a normal login                                             //
// method. This is for use in the case where there is a multi-step login                                           //
// procedure (eg SRP based password login). If a method early in the                                               //
// chain fails, it should call this function to report a failure. There                                            //
// is no corresponding method for a successful login; methods that can                                             //
// succeed at logging a user in should always be actual login methods                                              //
// (using either Accounts._loginMethod or Accounts.registerLoginHandler).                                          //
Ap._reportLoginFailure = function (methodInvocation, methodName, methodArgs, result) {                             // 393
  var attempt = {                                                                                                  // 399
    type: result.type || "unknown",                                                                                // 400
    allowed: false,                                                                                                // 401
    error: result.error,                                                                                           // 402
    methodName: methodName,                                                                                        // 403
    methodArguments: _.toArray(methodArgs)                                                                         // 404
  };                                                                                                               // 399
                                                                                                                   //
  if (result.userId) {                                                                                             // 407
    attempt.user = this.users.findOne(result.userId);                                                              // 408
  }                                                                                                                // 409
                                                                                                                   //
  this._validateLogin(methodInvocation.connection, attempt);                                                       // 411
  this._failedLogin(methodInvocation.connection, attempt);                                                         // 412
                                                                                                                   //
  // _validateLogin may mutate attempt to set a new error message. Return                                          //
  // the modified version.                                                                                         //
  return attempt;                                                                                                  // 416
};                                                                                                                 // 417
                                                                                                                   //
///                                                                                                                //
/// LOGIN HANDLERS                                                                                                 //
///                                                                                                                //
                                                                                                                   //
// The main entry point for auth packages to hook in to login.                                                     //
//                                                                                                                 //
// A login handler is a login method which can return `undefined` to                                               //
// indicate that the login request is not handled by this handler.                                                 //
//                                                                                                                 //
// @param name {String} Optional.  The service name, used by default                                               //
// if a specific service name isn't returned in the result.                                                        //
//                                                                                                                 //
// @param handler {Function} A function that receives an options object                                            //
// (as passed as an argument to the `login` method) and returns one of:                                            //
// - `undefined`, meaning don't handle;                                                                            //
// - a login method result object                                                                                  //
                                                                                                                   //
Ap.registerLoginHandler = function (name, handler) {                                                               // 437
  if (!handler) {                                                                                                  // 438
    handler = name;                                                                                                // 439
    name = null;                                                                                                   // 440
  }                                                                                                                // 441
                                                                                                                   //
  this._loginHandlers.push({                                                                                       // 443
    name: name,                                                                                                    // 444
    handler: handler                                                                                               // 445
  });                                                                                                              // 443
};                                                                                                                 // 447
                                                                                                                   //
// Checks a user's credentials against all the registered login                                                    //
// handlers, and returns a login token if the credentials are valid. It                                            //
// is like the login method, except that it doesn't set the logged-in                                              //
// user on the connection. Throws a Meteor.Error if logging in fails,                                              //
// including the case where none of the login handlers handled the login                                           //
// request. Otherwise, returns {id: userId, token: *, tokenExpires: *}.                                            //
//                                                                                                                 //
// For example, if you want to login with a plaintext password, `options` could be                                 //
//   { user: { username: <username> }, password: <password> }, or                                                  //
//   { user: { email: <email> }, password: <password> }.                                                           //
                                                                                                                   //
// Try all of the registered login handlers until one of them doesn't                                              //
// return `undefined`, meaning it handled this call to `login`. Return                                             //
// that return value.                                                                                              //
Ap._runLoginHandlers = function (methodInvocation, options) {                                                      // 464
  for (var i = 0; i < this._loginHandlers.length; ++i) {                                                           // 465
    var handler = this._loginHandlers[i];                                                                          // 466
                                                                                                                   //
    var result = tryLoginMethod(handler.name, function () {                                                        // 468
      return handler.handler.call(methodInvocation, options);                                                      // 471
    });                                                                                                            // 472
                                                                                                                   //
    if (result) {                                                                                                  // 475
      return result;                                                                                               // 476
    }                                                                                                              // 477
                                                                                                                   //
    if (result !== undefined) {                                                                                    // 479
      throw new Meteor.Error(400, "A login handler should return a result or undefined");                          // 480
    }                                                                                                              // 481
  }                                                                                                                // 482
                                                                                                                   //
  return {                                                                                                         // 484
    type: null,                                                                                                    // 485
    error: new Meteor.Error(400, "Unrecognized options for login request")                                         // 486
  };                                                                                                               // 484
};                                                                                                                 // 488
                                                                                                                   //
// Deletes the given loginToken from the database.                                                                 //
//                                                                                                                 //
// For new-style hashed token, this will cause all connections                                                     //
// associated with the token to be closed.                                                                         //
//                                                                                                                 //
// Any connections associated with old-style unhashed tokens will be                                               //
// in the process of becoming associated with hashed tokens and then                                               //
// they'll get closed.                                                                                             //
Ap.destroyToken = function (userId, loginToken) {                                                                  // 498
  this.users.update(userId, {                                                                                      // 499
    $pull: {                                                                                                       // 500
      "services.resume.loginTokens": {                                                                             // 501
        $or: [{ hashedToken: loginToken }, { token: loginToken }]                                                  // 502
      }                                                                                                            // 501
    }                                                                                                              // 500
  });                                                                                                              // 499
};                                                                                                                 // 509
                                                                                                                   //
Ap._initServerMethods = function () {                                                                              // 511
  // The methods created in this function need to be created here so that                                          //
  // this variable is available in their scope.                                                                    //
  var accounts = this;                                                                                             // 514
                                                                                                                   //
  // This object will be populated with methods and then passed to                                                 //
  // accounts._server.methods further below.                                                                       //
  var methods = {};                                                                                                // 518
                                                                                                                   //
  // @returns {Object|null}                                                                                        //
  //   If successful, returns {token: reconnectToken, id: userId}                                                  //
  //   If unsuccessful (for example, if the user closed the oauth login popup),                                    //
  //     throws an error describing the reason                                                                     //
  methods.login = function (options) {                                                                             // 524
    var self = this;                                                                                               // 525
                                                                                                                   //
    // Login handlers should really also check whatever field they look at in                                      //
    // options, but we don't enforce it.                                                                           //
    check(options, Object);                                                                                        // 529
                                                                                                                   //
    var result = accounts._runLoginHandlers(self, options);                                                        // 531
                                                                                                                   //
    return accounts._attemptLogin(self, "login", arguments, result);                                               // 533
  };                                                                                                               // 534
                                                                                                                   //
  methods.logout = function () {                                                                                   // 536
    var token = accounts._getLoginToken(this.connection.id);                                                       // 537
    accounts._setLoginToken(this.userId, this.connection, null);                                                   // 538
    if (token && this.userId) accounts.destroyToken(this.userId, token);                                           // 539
    accounts._successfulLogout(this.connection, this.userId);                                                      // 541
    this.setUserId(null);                                                                                          // 542
  };                                                                                                               // 543
                                                                                                                   //
  // Delete all the current user's tokens and close all open connections logged                                    //
  // in as this user. Returns a fresh new login token that this client can                                         //
  // use. Tests set Accounts._noConnectionCloseDelayForTest to delete tokens                                       //
  // immediately instead of using a delay.                                                                         //
  //                                                                                                               //
  // XXX COMPAT WITH 0.7.2                                                                                         //
  // This single `logoutOtherClients` method has been replaced with two                                            //
  // methods, one that you call to get a new token, and another that you                                           //
  // call to remove all tokens except your own. The new design allows                                              //
  // clients to know when other clients have actually been logged                                                  //
  // out. (The `logoutOtherClients` method guarantees the caller that                                              //
  // the other clients will be logged out at some point, but makes no                                              //
  // guarantees about when.) This method is left in for backwards                                                  //
  // compatibility, especially since application code might be calling                                             //
  // this method directly.                                                                                         //
  //                                                                                                               //
  // @returns {Object} Object with token and tokenExpires keys.                                                    //
  methods.logoutOtherClients = function () {                                                                       // 562
    var self = this;                                                                                               // 563
    var user = accounts.users.findOne(self.userId, {                                                               // 564
      fields: {                                                                                                    // 565
        "services.resume.loginTokens": true                                                                        // 566
      }                                                                                                            // 565
    });                                                                                                            // 564
    if (user) {                                                                                                    // 569
      // Save the current tokens in the database to be deleted in                                                  //
      // CONNECTION_CLOSE_DELAY_MS ms. This gives other connections in the                                         //
      // caller's browser time to find the fresh token in localStorage. We save                                    //
      // the tokens in the database in case we crash before actually deleting                                      //
      // them.                                                                                                     //
      var tokens = user.services.resume.loginTokens;                                                               // 575
      var newToken = accounts._generateStampedLoginToken();                                                        // 576
      var userId = self.userId;                                                                                    // 577
      accounts.users.update(userId, {                                                                              // 578
        $set: {                                                                                                    // 579
          "services.resume.loginTokensToDelete": tokens,                                                           // 580
          "services.resume.haveLoginTokensToDelete": true                                                          // 581
        },                                                                                                         // 579
        $push: { "services.resume.loginTokens": accounts._hashStampedToken(newToken) }                             // 583
      });                                                                                                          // 578
      Meteor.setTimeout(function () {                                                                              // 585
        // The observe on Meteor.users will take care of closing the connections                                   //
        // associated with `tokens`.                                                                               //
        accounts._deleteSavedTokensForUser(userId, tokens);                                                        // 588
      }, accounts._noConnectionCloseDelayForTest ? 0 : CONNECTION_CLOSE_DELAY_MS);                                 // 589
      // We do not set the login token on this connection, but instead the                                         //
      // observe closes the connection and the client will reconnect with the                                      //
      // new token.                                                                                                //
      return {                                                                                                     // 594
        token: newToken.token,                                                                                     // 595
        tokenExpires: accounts._tokenExpiration(newToken.when)                                                     // 596
      };                                                                                                           // 594
    } else {                                                                                                       // 598
      throw new Meteor.Error("You are not logged in.");                                                            // 599
    }                                                                                                              // 600
  };                                                                                                               // 601
                                                                                                                   //
  // Generates a new login token with the same expiration as the                                                   //
  // connection's current token and saves it to the database. Associates                                           //
  // the connection with this new token and returns it. Throws an error                                            //
  // if called on a connection that isn't logged in.                                                               //
  //                                                                                                               //
  // @returns Object                                                                                               //
  //   If successful, returns { token: <new token>, id: <user id>,                                                 //
  //   tokenExpires: <expiration date> }.                                                                          //
  methods.getNewToken = function () {                                                                              // 611
    var self = this;                                                                                               // 612
    var user = accounts.users.findOne(self.userId, {                                                               // 613
      fields: { "services.resume.loginTokens": 1 }                                                                 // 614
    });                                                                                                            // 613
    if (!self.userId || !user) {                                                                                   // 616
      throw new Meteor.Error("You are not logged in.");                                                            // 617
    }                                                                                                              // 618
    // Be careful not to generate a new token that has a later                                                     //
    // expiration than the curren token. Otherwise, a bad guy with a                                               //
    // stolen token could use this method to stop his stolen token from                                            //
    // ever expiring.                                                                                              //
    var currentHashedToken = accounts._getLoginToken(self.connection.id);                                          // 623
    var currentStampedToken = _.find(user.services.resume.loginTokens, function (stampedToken) {                   // 624
      return stampedToken.hashedToken === currentHashedToken;                                                      // 627
    });                                                                                                            // 628
    if (!currentStampedToken) {                                                                                    // 630
      // safety belt: this should never happen                                                                     //
      throw new Meteor.Error("Invalid login token");                                                               // 631
    }                                                                                                              // 632
    var newStampedToken = accounts._generateStampedLoginToken();                                                   // 633
    newStampedToken.when = currentStampedToken.when;                                                               // 634
    accounts._insertLoginToken(self.userId, newStampedToken);                                                      // 635
    return accounts._loginUser(self, self.userId, newStampedToken);                                                // 636
  };                                                                                                               // 637
                                                                                                                   //
  // Removes all tokens except the token associated with the current                                               //
  // connection. Throws an error if the connection is not logged                                                   //
  // in. Returns nothing on success.                                                                               //
  methods.removeOtherTokens = function () {                                                                        // 642
    var self = this;                                                                                               // 643
    if (!self.userId) {                                                                                            // 644
      throw new Meteor.Error("You are not logged in.");                                                            // 645
    }                                                                                                              // 646
    var currentToken = accounts._getLoginToken(self.connection.id);                                                // 647
    accounts.users.update(self.userId, {                                                                           // 648
      $pull: {                                                                                                     // 649
        "services.resume.loginTokens": { hashedToken: { $ne: currentToken } }                                      // 650
      }                                                                                                            // 649
    });                                                                                                            // 648
  };                                                                                                               // 653
                                                                                                                   //
  // Allow a one-time configuration for a login service. Modifications                                             //
  // to this collection are also allowed in insecure mode.                                                         //
  methods.configureLoginService = function (options) {                                                             // 657
    check(options, Match.ObjectIncluding({ service: String }));                                                    // 658
    // Don't let random users configure a service we haven't added yet (so                                         //
    // that when we do later add it, it's set up with their configuration                                          //
    // instead of ours).                                                                                           //
    // XXX if service configuration is oauth-specific then this code should                                        //
    //     be in accounts-oauth; if it's not then the registry should be                                           //
    //     in this package                                                                                         //
    if (!(accounts.oauth && _.contains(accounts.oauth.serviceNames(), options.service))) {                         // 665
      throw new Meteor.Error(403, "Service unknown");                                                              // 667
    }                                                                                                              // 668
                                                                                                                   //
    var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;                              // 670
    if (ServiceConfiguration.configurations.findOne({ service: options.service })) throw new Meteor.Error(403, "Service " + options.service + " already configured");
                                                                                                                   //
    if (_.has(options, "secret") && usingOAuthEncryption()) options.secret = OAuthEncryption.seal(options.secret);
                                                                                                                   //
    ServiceConfiguration.configurations.insert(options);                                                           // 678
  };                                                                                                               // 679
                                                                                                                   //
  accounts._server.methods(methods);                                                                               // 681
};                                                                                                                 // 682
                                                                                                                   //
Ap._initAccountDataHooks = function () {                                                                           // 684
  var accounts = this;                                                                                             // 685
                                                                                                                   //
  accounts._server.onConnection(function (connection) {                                                            // 687
    accounts._accountData[connection.id] = {                                                                       // 688
      connection: connection                                                                                       // 689
    };                                                                                                             // 688
                                                                                                                   //
    connection.onClose(function () {                                                                               // 692
      accounts._removeTokenFromConnection(connection.id);                                                          // 693
      delete accounts._accountData[connection.id];                                                                 // 694
    });                                                                                                            // 695
  });                                                                                                              // 696
};                                                                                                                 // 697
                                                                                                                   //
Ap._initServerPublications = function () {                                                                         // 699
  var accounts = this;                                                                                             // 700
                                                                                                                   //
  // Publish all login service configuration fields other than secret.                                             //
  accounts._server.publish("meteor.loginServiceConfiguration", function () {                                       // 703
    var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;                              // 704
    return ServiceConfiguration.configurations.find({}, { fields: { secret: 0 } });                                // 706
  }, { is_auto: true }); // not techincally autopublish, but stops the warning.                                    // 707
                                                                                                                   //
  // Publish the current user's record to the client.                                                              //
  accounts._server.publish(null, function () {                                                                     // 710
    if (this.userId) {                                                                                             // 711
      return accounts.users.find({                                                                                 // 712
        _id: this.userId                                                                                           // 713
      }, {                                                                                                         // 712
        fields: {                                                                                                  // 715
          profile: 1,                                                                                              // 716
          username: 1,                                                                                             // 717
          emails: 1                                                                                                // 718
        }                                                                                                          // 715
      });                                                                                                          // 714
    } else {                                                                                                       // 721
      return null;                                                                                                 // 722
    }                                                                                                              // 723
  }, /*suppress autopublish warning*/{ is_auto: true });                                                           // 724
                                                                                                                   //
  // Use Meteor.startup to give other packages a chance to call                                                    //
  // addAutopublishFields.                                                                                         //
  Package.autopublish && Meteor.startup(function () {                                                              // 728
    // ['profile', 'username'] -> {profile: 1, username: 1}                                                        //
    var toFieldSelector = function toFieldSelector(fields) {                                                       // 730
      return _.object(_.map(fields, function (field) {                                                             // 731
        return [field, 1];                                                                                         // 732
      }));                                                                                                         // 733
    };                                                                                                             // 734
                                                                                                                   //
    accounts._server.publish(null, function () {                                                                   // 736
      if (this.userId) {                                                                                           // 737
        return accounts.users.find({                                                                               // 738
          _id: this.userId                                                                                         // 739
        }, {                                                                                                       // 738
          fields: toFieldSelector(accounts._autopublishFields.loggedInUser)                                        // 741
        });                                                                                                        // 740
      } else {                                                                                                     // 743
        return null;                                                                                               // 744
      }                                                                                                            // 745
    }, /*suppress autopublish warning*/{ is_auto: true });                                                         // 746
                                                                                                                   //
    // XXX this publish is neither dedup-able nor is it optimized by our special                                   //
    // treatment of queries on a specific _id. Therefore this will have O(n^2)                                     //
    // run-time performance every time a user document is changed (eg someone                                      //
    // logging in). If this is a problem, we can instead write a manual publish                                    //
    // function which filters out fields based on 'this.userId'.                                                   //
    accounts._server.publish(null, function () {                                                                   // 753
      var selector = this.userId ? {                                                                               // 754
        _id: { $ne: this.userId }                                                                                  // 755
      } : {};                                                                                                      // 754
                                                                                                                   //
      return accounts.users.find(selector, {                                                                       // 758
        fields: toFieldSelector(accounts._autopublishFields.otherUsers)                                            // 759
      });                                                                                                          // 758
    }, /*suppress autopublish warning*/{ is_auto: true });                                                         // 761
  });                                                                                                              // 762
};                                                                                                                 // 763
                                                                                                                   //
// Add to the list of fields or subfields to be automatically                                                      //
// published if autopublish is on. Must be called from top-level                                                   //
// code (ie, before Meteor.startup hooks run).                                                                     //
//                                                                                                                 //
// @param opts {Object} with:                                                                                      //
//   - forLoggedInUser {Array} Array of fields published to the logged-in user                                     //
//   - forOtherUsers {Array} Array of fields published to users that aren't logged in                              //
Ap.addAutopublishFields = function (opts) {                                                                        // 772
  this._autopublishFields.loggedInUser.push.apply(this._autopublishFields.loggedInUser, opts.forLoggedInUser);     // 773
  this._autopublishFields.otherUsers.push.apply(this._autopublishFields.otherUsers, opts.forOtherUsers);           // 775
};                                                                                                                 // 777
                                                                                                                   //
///                                                                                                                //
/// ACCOUNT DATA                                                                                                   //
///                                                                                                                //
                                                                                                                   //
// HACK: This is used by 'meteor-accounts' to get the loginToken for a                                             //
// connection. Maybe there should be a public way to do that.                                                      //
Ap._getAccountData = function (connectionId, field) {                                                              // 785
  var data = this._accountData[connectionId];                                                                      // 786
  return data && data[field];                                                                                      // 787
};                                                                                                                 // 788
                                                                                                                   //
Ap._setAccountData = function (connectionId, field, value) {                                                       // 790
  var data = this._accountData[connectionId];                                                                      // 791
                                                                                                                   //
  // safety belt. shouldn't happen. accountData is set in onConnection,                                            //
  // we don't have a connectionId until it is set.                                                                 //
  if (!data) return;                                                                                               // 795
                                                                                                                   //
  if (value === undefined) delete data[field];else data[field] = value;                                            // 798
};                                                                                                                 // 802
                                                                                                                   //
///                                                                                                                //
/// RECONNECT TOKENS                                                                                               //
///                                                                                                                //
/// support reconnecting using a meteor login token                                                                //
                                                                                                                   //
Ap._hashLoginToken = function (loginToken) {                                                                       // 810
  var hash = crypto.createHash('sha256');                                                                          // 811
  hash.update(loginToken);                                                                                         // 812
  return hash.digest('base64');                                                                                    // 813
};                                                                                                                 // 814
                                                                                                                   //
// {token, when} => {hashedToken, when}                                                                            //
Ap._hashStampedToken = function (stampedToken) {                                                                   // 818
  return _.extend(_.omit(stampedToken, 'token'), {                                                                 // 819
    hashedToken: this._hashLoginToken(stampedToken.token)                                                          // 820
  });                                                                                                              // 819
};                                                                                                                 // 822
                                                                                                                   //
// Using $addToSet avoids getting an index error if another client                                                 //
// logging in simultaneously has already inserted the new hashed                                                   //
// token.                                                                                                          //
Ap._insertHashedLoginToken = function (userId, hashedToken, query) {                                               // 828
  query = query ? _.clone(query) : {};                                                                             // 829
  query._id = userId;                                                                                              // 830
  this.users.update(query, {                                                                                       // 831
    $addToSet: {                                                                                                   // 832
      "services.resume.loginTokens": hashedToken                                                                   // 833
    }                                                                                                              // 832
  });                                                                                                              // 831
};                                                                                                                 // 836
                                                                                                                   //
// Exported for tests.                                                                                             //
Ap._insertLoginToken = function (userId, stampedToken, query) {                                                    // 840
  this._insertHashedLoginToken(userId, this._hashStampedToken(stampedToken), query);                               // 841
};                                                                                                                 // 846
                                                                                                                   //
Ap._clearAllLoginTokens = function (userId) {                                                                      // 849
  this.users.update(userId, {                                                                                      // 850
    $set: {                                                                                                        // 851
      'services.resume.loginTokens': []                                                                            // 852
    }                                                                                                              // 851
  });                                                                                                              // 850
};                                                                                                                 // 855
                                                                                                                   //
// test hook                                                                                                       //
Ap._getUserObserve = function (connectionId) {                                                                     // 858
  return this._userObservesForConnections[connectionId];                                                           // 859
};                                                                                                                 // 860
                                                                                                                   //
// Clean up this connection's association with the token: that is, stop                                            //
// the observe that we started when we associated the connection with                                              //
// this token.                                                                                                     //
Ap._removeTokenFromConnection = function (connectionId) {                                                          // 865
  if (_.has(this._userObservesForConnections, connectionId)) {                                                     // 866
    var observe = this._userObservesForConnections[connectionId];                                                  // 867
    if (typeof observe === 'number') {                                                                             // 868
      // We're in the process of setting up an observe for this connection. We                                     //
      // can't clean up that observe yet, but if we delete the placeholder for                                     //
      // this connection, then the observe will get cleaned up as soon as it has                                   //
      // been set up.                                                                                              //
      delete this._userObservesForConnections[connectionId];                                                       // 873
    } else {                                                                                                       // 874
      delete this._userObservesForConnections[connectionId];                                                       // 875
      observe.stop();                                                                                              // 876
    }                                                                                                              // 877
  }                                                                                                                // 878
};                                                                                                                 // 879
                                                                                                                   //
Ap._getLoginToken = function (connectionId) {                                                                      // 881
  return this._getAccountData(connectionId, 'loginToken');                                                         // 882
};                                                                                                                 // 883
                                                                                                                   //
// newToken is a hashed token.                                                                                     //
Ap._setLoginToken = function (userId, connection, newToken) {                                                      // 886
  var self = this;                                                                                                 // 887
                                                                                                                   //
  self._removeTokenFromConnection(connection.id);                                                                  // 889
  self._setAccountData(connection.id, 'loginToken', newToken);                                                     // 890
                                                                                                                   //
  if (newToken) {                                                                                                  // 892
    // Set up an observe for this token. If the token goes away, we need                                           //
    // to close the connection.  We defer the observe because there's                                              //
    // no need for it to be on the critical path for login; we just need                                           //
    // to ensure that the connection will get closed at some point if                                              //
    // the token gets deleted.                                                                                     //
    //                                                                                                             //
    // Initially, we set the observe for this connection to a number; this                                         //
    // signifies to other code (which might run while we yield) that we are in                                     //
    // the process of setting up an observe for this connection. Once the                                          //
    // observe is ready to go, we replace the number with the real observe                                         //
    // handle (unless the placeholder has been deleted or replaced by a                                            //
    // different placehold number, signifying that the connection was closed                                       //
    // already -- in this case we just clean up the observe that we started).                                      //
    var myObserveNumber = ++self._nextUserObserveNumber;                                                           // 906
    self._userObservesForConnections[connection.id] = myObserveNumber;                                             // 907
    Meteor.defer(function () {                                                                                     // 908
      // If something else happened on this connection in the meantime (it got                                     //
      // closed, or another call to _setLoginToken happened), just do                                              //
      // nothing. We don't need to start an observe for an old connection or old                                   //
      // token.                                                                                                    //
      if (self._userObservesForConnections[connection.id] !== myObserveNumber) {                                   // 913
        return;                                                                                                    // 914
      }                                                                                                            // 915
                                                                                                                   //
      var foundMatchingUser;                                                                                       // 917
      // Because we upgrade unhashed login tokens to hashed tokens at                                              //
      // login time, sessions will only be logged in with a hashed                                                 //
      // token. Thus we only need to observe hashed tokens here.                                                   //
      var observe = self.users.find({                                                                              // 921
        _id: userId,                                                                                               // 922
        'services.resume.loginTokens.hashedToken': newToken                                                        // 923
      }, { fields: { _id: 1 } }).observeChanges({                                                                  // 921
        added: function added() {                                                                                  // 925
          foundMatchingUser = true;                                                                                // 926
        },                                                                                                         // 927
        removed: function removed() {                                                                              // 928
          connection.close();                                                                                      // 929
          // The onClose callback for the connection takes care of                                                 //
          // cleaning up the observe handle and any other state we have                                            //
          // lying around.                                                                                         //
        }                                                                                                          // 933
      });                                                                                                          // 924
                                                                                                                   //
      // If the user ran another login or logout command we were waiting for the                                   //
      // defer or added to fire (ie, another call to _setLoginToken occurred),                                     //
      // then we let the later one win (start an observe, etc) and just stop our                                   //
      // observe now.                                                                                              //
      //                                                                                                           //
      // Similarly, if the connection was already closed, then the onClose                                         //
      // callback would have called _removeTokenFromConnection and there won't                                     //
      // be an entry in _userObservesForConnections. We can stop the observe.                                      //
      if (self._userObservesForConnections[connection.id] !== myObserveNumber) {                                   // 944
        observe.stop();                                                                                            // 945
        return;                                                                                                    // 946
      }                                                                                                            // 947
                                                                                                                   //
      self._userObservesForConnections[connection.id] = observe;                                                   // 949
                                                                                                                   //
      if (!foundMatchingUser) {                                                                                    // 951
        // We've set up an observe on the user associated with `newToken`,                                         //
        // so if the new token is removed from the database, we'll close                                           //
        // the connection. But the token might have already been deleted                                           //
        // before we set up the observe, which wouldn't have closed the                                            //
        // connection because the observe wasn't running yet.                                                      //
        connection.close();                                                                                        // 957
      }                                                                                                            // 958
    });                                                                                                            // 959
  }                                                                                                                // 960
};                                                                                                                 // 961
                                                                                                                   //
function setupDefaultLoginHandlers(accounts) {                                                                     // 963
  accounts.registerLoginHandler("resume", function (options) {                                                     // 964
    return defaultResumeLoginHandler.call(this, accounts, options);                                                // 965
  });                                                                                                              // 966
}                                                                                                                  // 967
                                                                                                                   //
// Login handler for resume tokens.                                                                                //
function defaultResumeLoginHandler(accounts, options) {                                                            // 970
  if (!options.resume) return undefined;                                                                           // 971
                                                                                                                   //
  check(options.resume, String);                                                                                   // 974
                                                                                                                   //
  var hashedToken = accounts._hashLoginToken(options.resume);                                                      // 976
                                                                                                                   //
  // First look for just the new-style hashed login token, to avoid                                                //
  // sending the unhashed token to the database in a query if we don't                                             //
  // need to.                                                                                                      //
  var user = accounts.users.findOne({ "services.resume.loginTokens.hashedToken": hashedToken });                   // 981
                                                                                                                   //
  if (!user) {                                                                                                     // 984
    // If we didn't find the hashed login token, try also looking for                                              //
    // the old-style unhashed token.  But we need to look for either                                               //
    // the old-style token OR the new-style token, because another                                                 //
    // client connection logging in simultaneously might have already                                              //
    // converted the token.                                                                                        //
    user = accounts.users.findOne({                                                                                // 990
      $or: [{ "services.resume.loginTokens.hashedToken": hashedToken }, { "services.resume.loginTokens.token": options.resume }]
    });                                                                                                            // 990
  }                                                                                                                // 996
                                                                                                                   //
  if (!user) return {                                                                                              // 998
    error: new Meteor.Error(403, "You've been logged out by the server. Please log in again.")                     // 1000
  };                                                                                                               // 999
                                                                                                                   //
  // Find the token, which will either be an object with fields                                                    //
  // {hashedToken, when} for a hashed token or {token, when} for an                                                //
  // unhashed token.                                                                                               //
  var oldUnhashedStyleToken;                                                                                       // 1006
  var token = _.find(user.services.resume.loginTokens, function (token) {                                          // 1007
    return token.hashedToken === hashedToken;                                                                      // 1008
  });                                                                                                              // 1009
  if (token) {                                                                                                     // 1010
    oldUnhashedStyleToken = false;                                                                                 // 1011
  } else {                                                                                                         // 1012
    token = _.find(user.services.resume.loginTokens, function (token) {                                            // 1013
      return token.token === options.resume;                                                                       // 1014
    });                                                                                                            // 1015
    oldUnhashedStyleToken = true;                                                                                  // 1016
  }                                                                                                                // 1017
                                                                                                                   //
  var tokenExpires = accounts._tokenExpiration(token.when);                                                        // 1019
  if (new Date() >= tokenExpires) return {                                                                         // 1020
    userId: user._id,                                                                                              // 1022
    error: new Meteor.Error(403, "Your session has expired. Please log in again.")                                 // 1023
  };                                                                                                               // 1021
                                                                                                                   //
  // Update to a hashed token when an unhashed token is encountered.                                               //
  if (oldUnhashedStyleToken) {                                                                                     // 1027
    // Only add the new hashed token if the old unhashed token still                                               //
    // exists (this avoids resurrecting the token if it was deleted                                                //
    // after we read it).  Using $addToSet avoids getting an index                                                 //
    // error if another client logging in simultaneously has already                                               //
    // inserted the new hashed token.                                                                              //
    accounts.users.update({                                                                                        // 1033
      _id: user._id,                                                                                               // 1035
      "services.resume.loginTokens.token": options.resume                                                          // 1036
    }, { $addToSet: {                                                                                              // 1034
        "services.resume.loginTokens": {                                                                           // 1039
          "hashedToken": hashedToken,                                                                              // 1040
          "when": token.when                                                                                       // 1041
        }                                                                                                          // 1039
      } });                                                                                                        // 1038
                                                                                                                   //
    // Remove the old token *after* adding the new, since otherwise                                                //
    // another client trying to login between our removing the old and                                             //
    // adding the new wouldn't find a token to login with.                                                         //
    accounts.users.update(user._id, {                                                                              // 1049
      $pull: {                                                                                                     // 1050
        "services.resume.loginTokens": { "token": options.resume }                                                 // 1051
      }                                                                                                            // 1050
    });                                                                                                            // 1049
  }                                                                                                                // 1054
                                                                                                                   //
  return {                                                                                                         // 1056
    userId: user._id,                                                                                              // 1057
    stampedLoginToken: {                                                                                           // 1058
      token: options.resume,                                                                                       // 1059
      when: token.when                                                                                             // 1060
    }                                                                                                              // 1058
  };                                                                                                               // 1056
}                                                                                                                  // 1063
                                                                                                                   //
// (Also used by Meteor Accounts server and tests).                                                                //
//                                                                                                                 //
Ap._generateStampedLoginToken = function () {                                                                      // 1067
  return {                                                                                                         // 1068
    token: Random.secret(),                                                                                        // 1069
    when: new Date()                                                                                               // 1070
  };                                                                                                               // 1068
};                                                                                                                 // 1072
                                                                                                                   //
///                                                                                                                //
/// TOKEN EXPIRATION                                                                                               //
///                                                                                                                //
                                                                                                                   //
// Deletes expired tokens from the database and closes all open connections                                        //
// associated with these tokens.                                                                                   //
//                                                                                                                 //
// Exported for tests. Also, the arguments are only used by                                                        //
// tests. oldestValidDate is simulate expiring tokens without waiting                                              //
// for them to actually expire. userId is used by tests to only expire                                             //
// tokens for the test user.                                                                                       //
Ap._expireTokens = function (oldestValidDate, userId) {                                                            // 1085
  var tokenLifetimeMs = this._getTokenLifetimeMs();                                                                // 1086
                                                                                                                   //
  // when calling from a test with extra arguments, you must specify both!                                         //
  if (oldestValidDate && !userId || !oldestValidDate && userId) {                                                  // 1089
    throw new Error("Bad test. Must specify both oldestValidDate and userId.");                                    // 1090
  }                                                                                                                // 1091
                                                                                                                   //
  oldestValidDate = oldestValidDate || new Date(new Date() - tokenLifetimeMs);                                     // 1093
  var userFilter = userId ? { _id: userId } : {};                                                                  // 1095
                                                                                                                   //
  // Backwards compatible with older versions of meteor that stored login token                                    //
  // timestamps as numbers.                                                                                        //
  this.users.update(_.extend(userFilter, {                                                                         // 1100
    $or: [{ "services.resume.loginTokens.when": { $lt: oldestValidDate } }, { "services.resume.loginTokens.when": { $lt: +oldestValidDate } }]
  }), {                                                                                                            // 1100
    $pull: {                                                                                                       // 1106
      "services.resume.loginTokens": {                                                                             // 1107
        $or: [{ when: { $lt: oldestValidDate } }, { when: { $lt: +oldestValidDate } }]                             // 1108
      }                                                                                                            // 1107
    }                                                                                                              // 1106
  }, { multi: true });                                                                                             // 1105
  // The observe on Meteor.users will take care of closing connections for                                         //
  // expired tokens.                                                                                               //
};                                                                                                                 // 1117
                                                                                                                   //
// Deletes expired password reset tokens from the database.                                                        //
//                                                                                                                 //
// Exported for tests. Also, the arguments are only used by                                                        //
// tests. oldestValidDate is simulate expiring tokens without waiting                                              //
// for them to actually expire. userId is used by tests to only expire                                             //
// tokens for the test user.                                                                                       //
Ap._expirePasswordResetTokens = function (oldestValidDate, userId) {                                               // 1125
  var tokenLifetimeMs = this._getPasswordResetTokenLifetimeMs();                                                   // 1126
                                                                                                                   //
  // when calling from a test with extra arguments, you must specify both!                                         //
  if (oldestValidDate && !userId || !oldestValidDate && userId) {                                                  // 1129
    throw new Error("Bad test. Must specify both oldestValidDate and userId.");                                    // 1130
  }                                                                                                                // 1131
                                                                                                                   //
  oldestValidDate = oldestValidDate || new Date(new Date() - tokenLifetimeMs);                                     // 1133
  var userFilter = userId ? { _id: userId } : {};                                                                  // 1135
                                                                                                                   //
  this.users.update(_.extend(userFilter, {                                                                         // 1137
    $or: [{ "services.password.reset.when": { $lt: oldestValidDate } }, { "services.password.reset.when": { $lt: +oldestValidDate } }]
  }), {                                                                                                            // 1137
    $unset: {                                                                                                      // 1143
      "services.password.reset": {                                                                                 // 1144
        $or: [{ when: { $lt: oldestValidDate } }, { when: { $lt: +oldestValidDate } }]                             // 1145
      }                                                                                                            // 1144
    }                                                                                                              // 1143
  }, { multi: true });                                                                                             // 1142
};                                                                                                                 // 1152
                                                                                                                   //
// @override from accounts_common.js                                                                               //
Ap.config = function (options) {                                                                                   // 1155
  // Call the overridden implementation of the method.                                                             //
  var superResult = AccountsCommon.prototype.config.apply(this, arguments);                                        // 1157
                                                                                                                   //
  // If the user set loginExpirationInDays to null, then we need to clear the                                      //
  // timer that periodically expires tokens.                                                                       //
  if (_.has(this._options, "loginExpirationInDays") && this._options.loginExpirationInDays === null && this.expireTokenInterval) {
    Meteor.clearInterval(this.expireTokenInterval);                                                                // 1164
    this.expireTokenInterval = null;                                                                               // 1165
  }                                                                                                                // 1166
                                                                                                                   //
  return superResult;                                                                                              // 1168
};                                                                                                                 // 1169
                                                                                                                   //
function setExpireTokensInterval(accounts) {                                                                       // 1171
  accounts.expireTokenInterval = Meteor.setInterval(function () {                                                  // 1172
    accounts._expireTokens();                                                                                      // 1173
    accounts._expirePasswordResetTokens();                                                                         // 1174
  }, EXPIRE_TOKENS_INTERVAL_MS);                                                                                   // 1175
}                                                                                                                  // 1176
                                                                                                                   //
///                                                                                                                //
/// OAuth Encryption Support                                                                                       //
///                                                                                                                //
                                                                                                                   //
var OAuthEncryption = Package["oauth-encryption"] && Package["oauth-encryption"].OAuthEncryption;                  // 1183
                                                                                                                   //
function usingOAuthEncryption() {                                                                                  // 1187
  return OAuthEncryption && OAuthEncryption.keyIsLoaded();                                                         // 1188
}                                                                                                                  // 1189
                                                                                                                   //
// OAuth service data is temporarily stored in the pending credentials                                             //
// collection during the oauth authentication process.  Sensitive data                                             //
// such as access tokens are encrypted without the user id because                                                 //
// we don't know the user id yet.  We re-encrypt these fields with the                                             //
// user id included when storing the service data permanently in                                                   //
// the users collection.                                                                                           //
//                                                                                                                 //
function pinEncryptedFieldsToUser(serviceData, userId) {                                                           // 1199
  _.each(_.keys(serviceData), function (key) {                                                                     // 1200
    var value = serviceData[key];                                                                                  // 1201
    if (OAuthEncryption && OAuthEncryption.isSealed(value)) value = OAuthEncryption.seal(OAuthEncryption.open(value), userId);
    serviceData[key] = value;                                                                                      // 1204
  });                                                                                                              // 1205
}                                                                                                                  // 1206
                                                                                                                   //
// Encrypt unencrypted login service secrets when oauth-encryption is                                              //
// added.                                                                                                          //
//                                                                                                                 //
// XXX For the oauthSecretKey to be available here at startup, the                                                 //
// developer must call Accounts.config({oauthSecretKey: ...}) at load                                              //
// time, instead of in a Meteor.startup block, because the startup                                                 //
// block in the app code will run after this accounts-base startup                                                 //
// block.  Perhaps we need a post-startup callback?                                                                //
                                                                                                                   //
Meteor.startup(function () {                                                                                       // 1218
  if (!usingOAuthEncryption()) {                                                                                   // 1219
    return;                                                                                                        // 1220
  }                                                                                                                // 1221
                                                                                                                   //
  var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;                                // 1223
                                                                                                                   //
  ServiceConfiguration.configurations.find({                                                                       // 1226
    $and: [{                                                                                                       // 1227
      secret: { $exists: true }                                                                                    // 1228
    }, {                                                                                                           // 1227
      "secret.algorithm": { $exists: false }                                                                       // 1230
    }]                                                                                                             // 1229
  }).forEach(function (config) {                                                                                   // 1226
    ServiceConfiguration.configurations.update(config._id, {                                                       // 1233
      $set: {                                                                                                      // 1234
        secret: OAuthEncryption.seal(config.secret)                                                                // 1235
      }                                                                                                            // 1234
    });                                                                                                            // 1233
  });                                                                                                              // 1238
});                                                                                                                // 1239
                                                                                                                   //
// XXX see comment on Accounts.createUser in passwords_server about adding a                                       //
// second "server options" argument.                                                                               //
function defaultCreateUserHook(options, user) {                                                                    // 1243
  if (options.profile) user.profile = options.profile;                                                             // 1244
  return user;                                                                                                     // 1246
}                                                                                                                  // 1247
                                                                                                                   //
// Called by accounts-password                                                                                     //
Ap.insertUserDoc = function (options, user) {                                                                      // 1250
  // - clone user document, to protect from modification                                                           //
  // - add createdAt timestamp                                                                                     //
  // - prepare an _id, so that you can modify other collections (eg                                                //
  // create a first task for every new user)                                                                       //
  //                                                                                                               //
  // XXX If the onCreateUser or validateNewUser hooks fail, we might                                               //
  // end up having modified some other collection                                                                  //
  // inappropriately. The solution is probably to have onCreateUser                                                //
  // accept two callbacks - one that gets called before inserting                                                  //
  // the user document (in which you can modify its contents), and                                                 //
  // one that gets called after (in which you should change other                                                  //
  // collections)                                                                                                  //
  user = _.extend({                                                                                                // 1263
    createdAt: new Date(),                                                                                         // 1264
    _id: Random.id()                                                                                               // 1265
  }, user);                                                                                                        // 1263
                                                                                                                   //
  if (user.services) {                                                                                             // 1268
    _.each(user.services, function (serviceData) {                                                                 // 1269
      pinEncryptedFieldsToUser(serviceData, user._id);                                                             // 1270
    });                                                                                                            // 1271
  }                                                                                                                // 1272
                                                                                                                   //
  var fullUser;                                                                                                    // 1274
  if (this._onCreateUserHook) {                                                                                    // 1275
    fullUser = this._onCreateUserHook(options, user);                                                              // 1276
                                                                                                                   //
    // This is *not* part of the API. We need this because we can't isolate                                        //
    // the global server environment between tests, meaning we can't test                                          //
    // both having a create user hook set and not having one set.                                                  //
    if (fullUser === 'TEST DEFAULT HOOK') fullUser = defaultCreateUserHook(options, user);                         // 1281
  } else {                                                                                                         // 1283
    fullUser = defaultCreateUserHook(options, user);                                                               // 1284
  }                                                                                                                // 1285
                                                                                                                   //
  _.each(this._validateNewUserHooks, function (hook) {                                                             // 1287
    if (!hook(fullUser)) throw new Meteor.Error(403, "User validation failed");                                    // 1288
  });                                                                                                              // 1290
                                                                                                                   //
  var userId;                                                                                                      // 1292
  try {                                                                                                            // 1293
    userId = this.users.insert(fullUser);                                                                          // 1294
  } catch (e) {                                                                                                    // 1295
    // XXX string parsing sucks, maybe                                                                             //
    // https://jira.mongodb.org/browse/SERVER-3069 will get fixed one day                                          //
    if (e.name !== 'MongoError') throw e;                                                                          // 1298
    if (e.code !== 11000) throw e;                                                                                 // 1299
    if (e.errmsg.indexOf('emails.address') !== -1) throw new Meteor.Error(403, "Email already exists.");           // 1300
    if (e.errmsg.indexOf('username') !== -1) throw new Meteor.Error(403, "Username already exists.");              // 1302
    // XXX better error reporting for services.facebook.id duplicate, etc                                          //
    throw e;                                                                                                       // 1305
  }                                                                                                                // 1306
  return userId;                                                                                                   // 1307
};                                                                                                                 // 1308
                                                                                                                   //
// Helper function: returns false if email does not match company domain from                                      //
// the configuration.                                                                                              //
Ap._testEmailDomain = function (email) {                                                                           // 1312
  var domain = this._options.restrictCreationByEmailDomain;                                                        // 1313
  return !domain || _.isFunction(domain) && domain(email) || _.isString(domain) && new RegExp('@' + Meteor._escapeRegExp(domain) + '$', 'i').test(email);
};                                                                                                                 // 1318
                                                                                                                   //
// Validate new user's email or Google/Facebook/GitHub account's email                                             //
function defaultValidateNewUserHook(user) {                                                                        // 1321
  var self = this;                                                                                                 // 1322
  var domain = self._options.restrictCreationByEmailDomain;                                                        // 1323
  if (!domain) return true;                                                                                        // 1324
                                                                                                                   //
  var emailIsGood = false;                                                                                         // 1327
  if (!_.isEmpty(user.emails)) {                                                                                   // 1328
    emailIsGood = _.any(user.emails, function (email) {                                                            // 1329
      return self._testEmailDomain(email.address);                                                                 // 1330
    });                                                                                                            // 1331
  } else if (!_.isEmpty(user.services)) {                                                                          // 1332
    // Find any email of any service and check it                                                                  //
    emailIsGood = _.any(user.services, function (service) {                                                        // 1334
      return service.email && self._testEmailDomain(service.email);                                                // 1335
    });                                                                                                            // 1336
  }                                                                                                                // 1337
                                                                                                                   //
  if (emailIsGood) return true;                                                                                    // 1339
                                                                                                                   //
  if (_.isString(domain)) throw new Meteor.Error(403, "@" + domain + " email required");else throw new Meteor.Error(403, "Email doesn't match the criteria.");
}                                                                                                                  // 1346
                                                                                                                   //
///                                                                                                                //
/// MANAGING USER OBJECTS                                                                                          //
///                                                                                                                //
                                                                                                                   //
// Updates or creates a user after we authenticate with a 3rd party.                                               //
//                                                                                                                 //
// @param serviceName {String} Service name (eg, twitter).                                                         //
// @param serviceData {Object} Data to store in the user's record                                                  //
//        under services[serviceName]. Must include an "id" field                                                  //
//        which is a unique identifier for the user in the service.                                                //
// @param options {Object, optional} Other options to pass to insertUserDoc                                        //
//        (eg, profile)                                                                                            //
// @returns {Object} Object with token and id keys, like the result                                                //
//        of the "login" method.                                                                                   //
//                                                                                                                 //
Ap.updateOrCreateUserFromExternalService = function (serviceName, serviceData, options) {                          // 1363
  options = _.clone(options || {});                                                                                // 1368
                                                                                                                   //
  if (serviceName === "password" || serviceName === "resume") throw new Error("Can't use updateOrCreateUserFromExternalService with internal service " + serviceName);
  if (!_.has(serviceData, 'id')) throw new Error("Service data for service " + serviceName + " must include id");  // 1374
                                                                                                                   //
  // Look for a user with the appropriate service user id.                                                         //
  var selector = {};                                                                                               // 1379
  var serviceIdKey = "services." + serviceName + ".id";                                                            // 1380
                                                                                                                   //
  // XXX Temporary special case for Twitter. (Issue #629)                                                          //
  //   The serviceData.id will be a string representation of an integer.                                           //
  //   We want it to match either a stored string or int representation.                                           //
  //   This is to cater to earlier versions of Meteor storing twitter                                              //
  //   user IDs in number form, and recent versions storing them as strings.                                       //
  //   This can be removed once migration technology is in place, and twitter                                      //
  //   users stored with integer IDs have been migrated to string IDs.                                             //
  if (serviceName === "twitter" && !isNaN(serviceData.id)) {                                                       // 1389
    selector["$or"] = [{}, {}];                                                                                    // 1390
    selector["$or"][0][serviceIdKey] = serviceData.id;                                                             // 1391
    selector["$or"][1][serviceIdKey] = parseInt(serviceData.id, 10);                                               // 1392
  } else {                                                                                                         // 1393
    selector[serviceIdKey] = serviceData.id;                                                                       // 1394
  }                                                                                                                // 1395
                                                                                                                   //
  var user = this.users.findOne(selector);                                                                         // 1397
                                                                                                                   //
  if (user) {                                                                                                      // 1399
    pinEncryptedFieldsToUser(serviceData, user._id);                                                               // 1400
                                                                                                                   //
    // We *don't* process options (eg, profile) for update, but we do replace                                      //
    // the serviceData (eg, so that we keep an unexpired access token and                                          //
    // don't cache old email addresses in serviceData.email).                                                      //
    // XXX provide an onUpdateUser hook which would let apps update                                                //
    //     the profile too                                                                                         //
    var setAttrs = {};                                                                                             // 1407
    _.each(serviceData, function (value, key) {                                                                    // 1408
      setAttrs["services." + serviceName + "." + key] = value;                                                     // 1409
    });                                                                                                            // 1410
                                                                                                                   //
    // XXX Maybe we should re-use the selector above and notice if the update                                      //
    //     touches nothing?                                                                                        //
    this.users.update(user._id, {                                                                                  // 1414
      $set: setAttrs                                                                                               // 1415
    });                                                                                                            // 1414
                                                                                                                   //
    return {                                                                                                       // 1418
      type: serviceName,                                                                                           // 1419
      userId: user._id                                                                                             // 1420
    };                                                                                                             // 1418
  } else {                                                                                                         // 1423
    // Create a new user with the service data. Pass other options through to                                      //
    // insertUserDoc.                                                                                              //
    user = { services: {} };                                                                                       // 1426
    user.services[serviceName] = serviceData;                                                                      // 1427
    return {                                                                                                       // 1428
      type: serviceName,                                                                                           // 1429
      userId: this.insertUserDoc(options, user)                                                                    // 1430
    };                                                                                                             // 1428
  }                                                                                                                // 1432
};                                                                                                                 // 1433
                                                                                                                   //
function setupUsersCollection(users) {                                                                             // 1435
  ///                                                                                                              //
  /// RESTRICTING WRITES TO USER OBJECTS                                                                           //
  ///                                                                                                              //
  users.allow({                                                                                                    // 1439
    // clients can modify the profile field of their own document, and                                             //
    // nothing else.                                                                                               //
    update: function update(userId, user, fields, modifier) {                                                      // 1442
      // make sure it is our record                                                                                //
      if (user._id !== userId) return false;                                                                       // 1444
                                                                                                                   //
      // user can only modify the 'profile' field. sets to multiple                                                //
      // sub-keys (eg profile.foo and profile.bar) are merged into entry                                           //
      // in the fields list.                                                                                       //
      if (fields.length !== 1 || fields[0] !== 'profile') return false;                                            // 1450
                                                                                                                   //
      return true;                                                                                                 // 1453
    },                                                                                                             // 1454
    fetch: ['_id'] // we only look at _id.                                                                         // 1455
  });                                                                                                              // 1439
                                                                                                                   //
  /// DEFAULT INDEXES ON USERS                                                                                     //
  users._ensureIndex('username', { unique: 1, sparse: 1 });                                                        // 1459
  users._ensureIndex('emails.address', { unique: 1, sparse: 1 });                                                  // 1460
  users._ensureIndex('services.resume.loginTokens.hashedToken', { unique: 1, sparse: 1 });                         // 1461
  users._ensureIndex('services.resume.loginTokens.token', { unique: 1, sparse: 1 });                               // 1463
  // For taking care of logoutOtherClients calls that crashed before the                                           //
  // tokens were deleted.                                                                                          //
  users._ensureIndex('services.resume.haveLoginTokensToDelete', { sparse: 1 });                                    // 1467
  // For expiring login tokens                                                                                     //
  users._ensureIndex("services.resume.loginTokens.when", { sparse: 1 });                                           // 1470
}                                                                                                                  // 1471
                                                                                                                   //
///                                                                                                                //
/// CLEAN UP FOR `logoutOtherClients`                                                                              //
///                                                                                                                //
                                                                                                                   //
Ap._deleteSavedTokensForUser = function (userId, tokensToDelete) {                                                 // 1477
  if (tokensToDelete) {                                                                                            // 1478
    this.users.update(userId, {                                                                                    // 1479
      $unset: {                                                                                                    // 1480
        "services.resume.haveLoginTokensToDelete": 1,                                                              // 1481
        "services.resume.loginTokensToDelete": 1                                                                   // 1482
      },                                                                                                           // 1480
      $pullAll: {                                                                                                  // 1484
        "services.resume.loginTokens": tokensToDelete                                                              // 1485
      }                                                                                                            // 1484
    });                                                                                                            // 1479
  }                                                                                                                // 1488
};                                                                                                                 // 1489
                                                                                                                   //
Ap._deleteSavedTokensForAllUsersOnStartup = function () {                                                          // 1491
  var self = this;                                                                                                 // 1492
                                                                                                                   //
  // If we find users who have saved tokens to delete on startup, delete                                           //
  // them now. It's possible that the server could have crashed and come                                           //
  // back up before new tokens are found in localStorage, but this                                                 //
  // shouldn't happen very often. We shouldn't put a delay here because                                            //
  // that would give a lot of power to an attacker with a stolen login                                             //
  // token and the ability to crash the server.                                                                    //
  Meteor.startup(function () {                                                                                     // 1500
    self.users.find({                                                                                              // 1501
      "services.resume.haveLoginTokensToDelete": true                                                              // 1502
    }, {                                                                                                           // 1501
      "services.resume.loginTokensToDelete": 1                                                                     // 1504
    }).forEach(function (user) {                                                                                   // 1503
      self._deleteSavedTokensForUser(user._id, user.services.resume.loginTokensToDelete);                          // 1506
    });                                                                                                            // 1510
  });                                                                                                              // 1511
};                                                                                                                 // 1512
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"url_server.js":["./accounts_server.js",function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/accounts-base/url_server.js                                                                            //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
var AccountsServer;module.import("./accounts_server.js",{"AccountsServer":function(v){AccountsServer=v}});         // 1
                                                                                                                   //
// XXX These should probably not actually be public?                                                               //
                                                                                                                   //
AccountsServer.prototype.urls = {                                                                                  // 5
  resetPassword: function resetPassword(token) {                                                                   // 6
    return Meteor.absoluteUrl('#/reset-password/' + token);                                                        // 7
  },                                                                                                               // 8
                                                                                                                   //
  verifyEmail: function verifyEmail(token) {                                                                       // 10
    return Meteor.absoluteUrl('#/verify-email/' + token);                                                          // 11
  },                                                                                                               // 12
                                                                                                                   //
  enrollAccount: function enrollAccount(token) {                                                                   // 14
    return Meteor.absoluteUrl('#/enroll-account/' + token);                                                        // 15
  }                                                                                                                // 16
};                                                                                                                 // 5
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}]}}}},{"extensions":[".js",".json"]});
var exports = require("./node_modules/meteor/accounts-base/server_main.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['accounts-base'] = exports, {
  Accounts: Accounts
});

})();

//# sourceMappingURL=accounts-base.js.map
