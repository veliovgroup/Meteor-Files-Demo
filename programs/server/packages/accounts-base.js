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
exports.__esModule = true;                                                                                         //
exports.AccountsServer = undefined;                                                                                //
                                                                                                                   //
var _accounts_server = require("./accounts_server.js");                                                            // 1
                                                                                                                   //
require("./accounts_rate_limit.js");                                                                               // 2
                                                                                                                   //
require("./url_server.js");                                                                                        // 3
                                                                                                                   //
/**                                                                                                                //
 * @namespace Accounts                                                                                             //
 * @summary The namespace for all server-side accounts-related methods.                                            //
 */                                                                                                                //
Accounts = new _accounts_server.AccountsServer(Meteor.server);                                                     // 9
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
exports.                                                                                                           //
// Since this file is the main module for the server version of the                                                //
// accounts-base package, properties of non-entry-point modules need to                                            //
// be re-exported in order to be accessible to modules that import the                                             //
// accounts-base package.                                                                                          //
AccountsServer = _accounts_server.AccountsServer;                                                                  // 28
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"accounts_common.js":["babel-runtime/helpers/classCallCheck",function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/accounts-base/accounts_common.js                                                                       //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
exports.__esModule = true;                                                                                         //
exports.AccountsCommon = undefined;                                                                                //
                                                                                                                   //
var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");                                            //
                                                                                                                   //
var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);                                                   //
                                                                                                                   //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                  //
                                                                                                                   //
/**                                                                                                                //
 * @summary Super-constructor for AccountsClient and AccountsServer.                                               //
 * @locus Anywhere                                                                                                 //
 * @class AccountsCommon                                                                                           //
 * @instancename accountsClientOrServer                                                                            //
 * @param options {Object} an object with fields:                                                                  //
 * - connection {Object} Optional DDP connection to reuse.                                                         //
 * - ddpUrl {String} Optional URL for creating a new DDP connection.                                               //
 */                                                                                                                //
                                                                                                                   //
var AccountsCommon = exports.AccountsCommon = function () {                                                        //
  function AccountsCommon(options) {                                                                               // 11
    (0, _classCallCheck3["default"])(this, AccountsCommon);                                                        // 11
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
  AccountsCommon.prototype.userId = function userId() {                                                            //
    throw new Error("userId method not implemented");                                                              // 50
  };                                                                                                               // 51
                                                                                                                   //
  /**                                                                                                              //
   * @summary Get the current user record, or `null` if no user is logged in. A reactive data source.              //
   * @locus Anywhere but publish functions                                                                         //
   */                                                                                                              //
                                                                                                                   //
                                                                                                                   //
  AccountsCommon.prototype.user = function user() {                                                                //
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
   */                                                                                                              //
                                                                                                                   //
                                                                                                                   //
  AccountsCommon.prototype.config = function config(options) {                                                     //
    var self = this;                                                                                               // 98
                                                                                                                   //
    // We don't want users to accidentally only call Accounts.config on the                                        //
    // client, where some of the options will have partial effects (eg removing                                    //
    // the "create account" button from accounts-ui if forbidClientAccountCreation                                 //
    // is set, or redirecting Google login to a specific-domain page) without                                      //
    // having their full effects.                                                                                  //
    if (Meteor.isServer) {                                                                                         // 105
      __meteor_runtime_config__.accountsConfigCalled = true;                                                       // 106
    } else if (!__meteor_runtime_config__.accountsConfigCalled) {                                                  // 107
      // XXX would be nice to "crash" the client and replace the UI with an error                                  //
      // message, but there's no trivial way to do this.                                                           //
      Meteor._debug("Accounts.config was called on the client but not on the " + "server; some configuration options may not take effect.");
    }                                                                                                              // 112
                                                                                                                   //
    // We need to validate the oauthSecretKey option at the time                                                   //
    // Accounts.config is called. We also deliberately don't store the                                             //
    // oauthSecretKey in Accounts._options.                                                                        //
    if (_.has(options, "oauthSecretKey")) {                                                                        // 117
      if (Meteor.isClient) throw new Error("The oauthSecretKey option may only be specified on the server");       // 118
      if (!Package["oauth-encryption"]) throw new Error("The oauth-encryption package must be loaded to set oauthSecretKey");
      Package["oauth-encryption"].OAuthEncryption.loadKey(options.oauthSecretKey);                                 // 122
      options = _.omit(options, "oauthSecretKey");                                                                 // 123
    }                                                                                                              // 124
                                                                                                                   //
    // validate option keys                                                                                        //
    var VALID_KEYS = ["sendVerificationEmail", "forbidClientAccountCreation", "restrictCreationByEmailDomain", "loginExpirationInDays"];
    _.each(_.keys(options), function (key) {                                                                       // 129
      if (!_.contains(VALID_KEYS, key)) {                                                                          // 130
        throw new Error("Accounts.config: Invalid key: " + key);                                                   // 131
      }                                                                                                            // 132
    });                                                                                                            // 133
                                                                                                                   //
    // set values in Accounts._options                                                                             //
    _.each(VALID_KEYS, function (key) {                                                                            // 136
      if (key in options) {                                                                                        // 137
        if (key in self._options) {                                                                                // 138
          throw new Error("Can't set `" + key + "` more than once");                                               // 139
        }                                                                                                          // 140
        self._options[key] = options[key];                                                                         // 141
      }                                                                                                            // 142
    });                                                                                                            // 143
  };                                                                                                               // 144
                                                                                                                   //
  /**                                                                                                              //
   * @summary Register a callback to be called after a login attempt succeeds.                                     //
   * @locus Anywhere                                                                                               //
   * @param {Function} func The callback to be called when login is successful.                                    //
   */                                                                                                              //
                                                                                                                   //
                                                                                                                   //
  AccountsCommon.prototype.onLogin = function onLogin(func) {                                                      //
    return this._onLoginHook.register(func);                                                                       // 152
  };                                                                                                               // 153
                                                                                                                   //
  /**                                                                                                              //
   * @summary Register a callback to be called after a login attempt fails.                                        //
   * @locus Anywhere                                                                                               //
   * @param {Function} func The callback to be called after the login has failed.                                  //
   */                                                                                                              //
                                                                                                                   //
                                                                                                                   //
  AccountsCommon.prototype.onLoginFailure = function onLoginFailure(func) {                                        //
    return this._onLoginFailureHook.register(func);                                                                // 161
  };                                                                                                               // 162
                                                                                                                   //
  /**                                                                                                              //
   * @summary Register a callback to be called after a logout attempt succeeds.                                    //
   * @locus Anywhere                                                                                               //
   * @param {Function} func The callback to be called when logout is successful.                                   //
   */                                                                                                              //
                                                                                                                   //
                                                                                                                   //
  AccountsCommon.prototype.onLogout = function onLogout(func) {                                                    //
    return this._onLogoutHook.register(func);                                                                      // 170
  };                                                                                                               // 171
                                                                                                                   //
  AccountsCommon.prototype._initConnection = function _initConnection(options) {                                   //
    if (!Meteor.isClient) {                                                                                        // 174
      return;                                                                                                      // 175
    }                                                                                                              // 176
                                                                                                                   //
    // The connection used by the Accounts system. This is the connection                                          //
    // that will get logged in by Meteor.login(), and this is the                                                  //
    // connection whose login state will be reflected by Meteor.userId().                                          //
    //                                                                                                             //
    // It would be much preferable for this to be in accounts_client.js,                                           //
    // but it has to be here because it's needed to create the                                                     //
    // Meteor.users collection.                                                                                    //
                                                                                                                   //
    if (options.connection) {                                                                                      // 186
      this.connection = options.connection;                                                                        // 187
    } else if (options.ddpUrl) {                                                                                   // 188
      this.connection = DDP.connect(options.ddpUrl);                                                               // 189
    } else if (typeof __meteor_runtime_config__ !== "undefined" && __meteor_runtime_config__.ACCOUNTS_CONNECTION_URL) {
      // Temporary, internal hook to allow the server to point the client                                          //
      // to a different authentication server. This is for a very                                                  //
      // particular use case that comes up when implementing a oauth                                               //
      // server. Unsupported and may go away at any point in time.                                                 //
      //                                                                                                           //
      // We will eventually provide a general way to use account-base                                              //
      // against any DDP connection, not just one special one.                                                     //
      this.connection = DDP.connect(__meteor_runtime_config__.ACCOUNTS_CONNECTION_URL);                            // 199
    } else {                                                                                                       // 201
      this.connection = Meteor.connection;                                                                         // 202
    }                                                                                                              // 203
  };                                                                                                               // 204
                                                                                                                   //
  AccountsCommon.prototype._getTokenLifetimeMs = function _getTokenLifetimeMs() {                                  //
    return (this._options.loginExpirationInDays || DEFAULT_LOGIN_EXPIRATION_DAYS) * 24 * 60 * 60 * 1000;           // 207
  };                                                                                                               // 209
                                                                                                                   //
  AccountsCommon.prototype._tokenExpiration = function _tokenExpiration(when) {                                    //
    // We pass when through the Date constructor for backwards compatibility;                                      //
    // `when` used to be a number.                                                                                 //
    return new Date(new Date(when).getTime() + this._getTokenLifetimeMs());                                        // 214
  };                                                                                                               // 215
                                                                                                                   //
  AccountsCommon.prototype._tokenExpiresSoon = function _tokenExpiresSoon(when) {                                  //
    var minLifetimeMs = .1 * this._getTokenLifetimeMs();                                                           // 218
    var minLifetimeCapMs = MIN_TOKEN_LIFETIME_CAP_SECS * 1000;                                                     // 219
    if (minLifetimeMs > minLifetimeCapMs) minLifetimeMs = minLifetimeCapMs;                                        // 220
    return new Date() > new Date(when) - minLifetimeMs;                                                            // 222
  };                                                                                                               // 223
                                                                                                                   //
  return AccountsCommon;                                                                                           //
}();                                                                                                               //
                                                                                                                   //
var Ap = AccountsCommon.prototype;                                                                                 // 226
                                                                                                                   //
// Note that Accounts is defined separately in accounts_client.js and                                              //
// accounts_server.js.                                                                                             //
                                                                                                                   //
/**                                                                                                                //
 * @summary Get the current user id, or `null` if no user is logged in. A reactive data source.                    //
 * @locus Anywhere but publish functions                                                                           //
 * @importFromPackage meteor                                                                                       //
 */                                                                                                                //
Meteor.userId = function () {                                                                                      // 236
  return Accounts.userId();                                                                                        // 237
};                                                                                                                 // 238
                                                                                                                   //
/**                                                                                                                //
 * @summary Get the current user record, or `null` if no user is logged in. A reactive data source.                //
 * @locus Anywhere but publish functions                                                                           //
 * @importFromPackage meteor                                                                                       //
 */                                                                                                                //
Meteor.user = function () {                                                                                        // 245
  return Accounts.user();                                                                                          // 246
};                                                                                                                 // 247
                                                                                                                   //
// how long (in days) until a login token expires                                                                  //
var DEFAULT_LOGIN_EXPIRATION_DAYS = 90;                                                                            // 250
// Clients don't try to auto-login with a token that is going to expire within                                     //
// .1 * DEFAULT_LOGIN_EXPIRATION_DAYS, capped at MIN_TOKEN_LIFETIME_CAP_SECS.                                      //
// Tries to avoid abrupt disconnects from expiring tokens.                                                         //
var MIN_TOKEN_LIFETIME_CAP_SECS = 3600; // one hour                                                                // 254
// how often (in milliseconds) we check for expired tokens                                                         //
EXPIRE_TOKENS_INTERVAL_MS = 600 * 1000; // 10 minutes                                                              // 256
// how long we wait before logging out clients when Meteor.logoutOtherClients is                                   //
// called                                                                                                          //
CONNECTION_CLOSE_DELAY_MS = 10 * 1000;                                                                             // 259
                                                                                                                   //
// loginServiceConfiguration and ConfigError are maintained for backwards compatibility                            //
Meteor.startup(function () {                                                                                       // 262
  var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;                                // 263
  Ap.loginServiceConfiguration = ServiceConfiguration.configurations;                                              // 265
  Ap.ConfigError = ServiceConfiguration.ConfigError;                                                               // 266
});                                                                                                                // 267
                                                                                                                   //
// Thrown when the user cancels the login process (eg, closes an oauth                                             //
// popup, declines retina scan, etc)                                                                               //
var lceName = 'Accounts.LoginCancelledError';                                                                      // 271
Ap.LoginCancelledError = Meteor.makeErrorType(lceName, function (description) {                                    // 272
  this.message = description;                                                                                      // 275
});                                                                                                                // 276
Ap.LoginCancelledError.prototype.name = lceName;                                                                   // 278
                                                                                                                   //
// This is used to transmit specific subclass errors over the wire. We should                                      //
// come up with a more generic way to do this (eg, with some sort of symbolic                                      //
// error code rather than a number).                                                                               //
Ap.LoginCancelledError.numericError = 0x8acdc2f;                                                                   // 283
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"accounts_rate_limit.js":["./accounts_common.js",function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/accounts-base/accounts_rate_limit.js                                                                   //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
var _accounts_common = require('./accounts_common.js');                                                            // 1
                                                                                                                   //
var Ap = _accounts_common.AccountsCommon.prototype;                                                                // 3
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

}],"accounts_server.js":["babel-runtime/helpers/classCallCheck","babel-runtime/helpers/possibleConstructorReturn","babel-runtime/helpers/inherits","./accounts_common.js",function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/accounts-base/accounts_server.js                                                                       //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
exports.__esModule = true;                                                                                         //
exports.AccountsServer = undefined;                                                                                //
                                                                                                                   //
var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');                                            //
                                                                                                                   //
var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);                                                   //
                                                                                                                   //
var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');                      //
                                                                                                                   //
var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);                             //
                                                                                                                   //
var _inherits2 = require('babel-runtime/helpers/inherits');                                                        //
                                                                                                                   //
var _inherits3 = _interopRequireDefault(_inherits2);                                                               //
                                                                                                                   //
var _accounts_common = require('./accounts_common.js');                                                            // 3
                                                                                                                   //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }                  //
                                                                                                                   //
var crypto = Npm.require('crypto');                                                                                // 1
                                                                                                                   //
/**                                                                                                                //
 * @summary Constructor for the `Accounts` namespace on the server.                                                //
 * @locus Server                                                                                                   //
 * @class AccountsServer                                                                                           //
 * @extends AccountsCommon                                                                                         //
 * @instancename accountsServer                                                                                    //
 * @param {Object} server A server object such as `Meteor.server`.                                                 //
 */                                                                                                                //
                                                                                                                   //
var AccountsServer = exports.AccountsServer = function (_AccountsCommon) {                                         //
  (0, _inherits3['default'])(AccountsServer, _AccountsCommon);                                                     //
                                                                                                                   //
  // Note that this constructor is less likely to be instantiated multiple                                         //
  // times than the `AccountsClient` constructor, because a single server                                          //
  // can provide only one set of methods.                                                                          //
                                                                                                                   //
  function AccountsServer(server) {                                                                                // 17
    (0, _classCallCheck3['default'])(this, AccountsServer);                                                        // 17
                                                                                                                   //
    var _this = (0, _possibleConstructorReturn3['default'])(this, _AccountsCommon.call(this));                     // 17
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
  AccountsServer.prototype.userId = function userId() {                                                            //
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
  AccountsServer.prototype.validateLoginAttempt = function validateLoginAttempt(func) {                            //
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
  AccountsServer.prototype.validateNewUser = function validateNewUser(func) {                                      //
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
  AccountsServer.prototype.onCreateUser = function onCreateUser(func) {                                            //
    if (this._onCreateUserHook) {                                                                                  // 119
      throw new Error("Can only call onCreateUser once");                                                          // 120
    }                                                                                                              // 121
                                                                                                                   //
    this._onCreateUserHook = func;                                                                                 // 123
  };                                                                                                               // 124
                                                                                                                   //
  return AccountsServer;                                                                                           //
}(_accounts_common.AccountsCommon);                                                                                //
                                                                                                                   //
;                                                                                                                  // 125
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
Ap._successfulLogout = function () {                                                                               // 179
  this._onLogoutHook.each(function (callback) {                                                                    // 180
    callback();                                                                                                    // 181
    return true;                                                                                                   // 182
  });                                                                                                              // 183
};                                                                                                                 // 184
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
var tryLoginMethod = function tryLoginMethod(type, fn) {                                                           // 244
  var result;                                                                                                      // 245
  try {                                                                                                            // 246
    result = fn();                                                                                                 // 247
  } catch (e) {                                                                                                    // 248
    result = { error: e };                                                                                         // 250
  }                                                                                                                // 251
                                                                                                                   //
  if (result && !result.type && type) result.type = type;                                                          // 253
                                                                                                                   //
  return result;                                                                                                   // 256
};                                                                                                                 // 257
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
Ap._loginUser = function (methodInvocation, userId, stampedLoginToken) {                                           // 272
  var self = this;                                                                                                 // 273
                                                                                                                   //
  if (!stampedLoginToken) {                                                                                        // 275
    stampedLoginToken = self._generateStampedLoginToken();                                                         // 276
    self._insertLoginToken(userId, stampedLoginToken);                                                             // 277
  }                                                                                                                // 278
                                                                                                                   //
  // This order (and the avoidance of yields) is important to make                                                 //
  // sure that when publish functions are rerun, they see a                                                        //
  // consistent view of the world: the userId is set and matches                                                   //
  // the login token on the connection (not that there is                                                          //
  // currently a public API for reading the login token on a                                                       //
  // connection).                                                                                                  //
  Meteor._noYieldsAllowed(function () {                                                                            // 286
    self._setLoginToken(userId, methodInvocation.connection, self._hashLoginToken(stampedLoginToken.token));       // 287
  });                                                                                                              // 292
                                                                                                                   //
  methodInvocation.setUserId(userId);                                                                              // 294
                                                                                                                   //
  return {                                                                                                         // 296
    id: userId,                                                                                                    // 297
    token: stampedLoginToken.token,                                                                                // 298
    tokenExpires: self._tokenExpiration(stampedLoginToken.when)                                                    // 299
  };                                                                                                               // 296
};                                                                                                                 // 301
                                                                                                                   //
// After a login method has completed, call the login hooks.  Note                                                 //
// that `attemptLogin` is called for *all* login attempts, even ones                                               //
// which aren't successful (such as an invalid password, etc).                                                     //
//                                                                                                                 //
// If the login is allowed and isn't aborted by a validate login hook                                              //
// callback, log in the user.                                                                                      //
//                                                                                                                 //
Ap._attemptLogin = function (methodInvocation, methodName, methodArgs, result) {                                   // 311
  if (!result) throw new Error("result is required");                                                              // 317
                                                                                                                   //
  // XXX A programming error in a login handler can lead to this occuring, and                                     //
  // then we don't call onLogin or onLoginFailure callbacks. Should                                                //
  // tryLoginMethod catch this case and turn it into an error?                                                     //
  if (!result.userId && !result.error) throw new Error("A login method must specify a userId or an error");        // 323
                                                                                                                   //
  var user;                                                                                                        // 326
  if (result.userId) user = this.users.findOne(result.userId);                                                     // 327
                                                                                                                   //
  var attempt = {                                                                                                  // 330
    type: result.type || "unknown",                                                                                // 331
    allowed: !!(result.userId && !result.error),                                                                   // 332
    methodName: methodName,                                                                                        // 333
    methodArguments: _.toArray(methodArgs)                                                                         // 334
  };                                                                                                               // 330
  if (result.error) attempt.error = result.error;                                                                  // 336
  if (user) attempt.user = user;                                                                                   // 338
                                                                                                                   //
  // _validateLogin may mutate `attempt` by adding an error and changing allowed                                   //
  // to false, but that's the only change it can make (and the user's callbacks                                    //
  // only get a clone of `attempt`).                                                                               //
  this._validateLogin(methodInvocation.connection, attempt);                                                       // 344
                                                                                                                   //
  if (attempt.allowed) {                                                                                           // 346
    var ret = _.extend(this._loginUser(methodInvocation, result.userId, result.stampedLoginToken), result.options || {});
    this._successfulLogin(methodInvocation.connection, attempt);                                                   // 355
    return ret;                                                                                                    // 356
  } else {                                                                                                         // 357
    this._failedLogin(methodInvocation.connection, attempt);                                                       // 359
    throw attempt.error;                                                                                           // 360
  }                                                                                                                // 361
};                                                                                                                 // 362
                                                                                                                   //
// All service specific login methods should go through this function.                                             //
// Ensure that thrown exceptions are caught and that login hook                                                    //
// callbacks are still called.                                                                                     //
//                                                                                                                 //
Ap._loginMethod = function (methodInvocation, methodName, methodArgs, type, fn) {                                  // 369
  return this._attemptLogin(methodInvocation, methodName, methodArgs, tryLoginMethod(type, fn));                   // 376
};                                                                                                                 // 382
                                                                                                                   //
// Report a login attempt failed outside the context of a normal login                                             //
// method. This is for use in the case where there is a multi-step login                                           //
// procedure (eg SRP based password login). If a method early in the                                               //
// chain fails, it should call this function to report a failure. There                                            //
// is no corresponding method for a successful login; methods that can                                             //
// succeed at logging a user in should always be actual login methods                                              //
// (using either Accounts._loginMethod or Accounts.registerLoginHandler).                                          //
Ap._reportLoginFailure = function (methodInvocation, methodName, methodArgs, result) {                             // 392
  var attempt = {                                                                                                  // 398
    type: result.type || "unknown",                                                                                // 399
    allowed: false,                                                                                                // 400
    error: result.error,                                                                                           // 401
    methodName: methodName,                                                                                        // 402
    methodArguments: _.toArray(methodArgs)                                                                         // 403
  };                                                                                                               // 398
                                                                                                                   //
  if (result.userId) {                                                                                             // 406
    attempt.user = this.users.findOne(result.userId);                                                              // 407
  }                                                                                                                // 408
                                                                                                                   //
  this._validateLogin(methodInvocation.connection, attempt);                                                       // 410
  this._failedLogin(methodInvocation.connection, attempt);                                                         // 411
                                                                                                                   //
  // _validateLogin may mutate attempt to set a new error message. Return                                          //
  // the modified version.                                                                                         //
  return attempt;                                                                                                  // 415
};                                                                                                                 // 416
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
Ap.registerLoginHandler = function (name, handler) {                                                               // 436
  if (!handler) {                                                                                                  // 437
    handler = name;                                                                                                // 438
    name = null;                                                                                                   // 439
  }                                                                                                                // 440
                                                                                                                   //
  this._loginHandlers.push({                                                                                       // 442
    name: name,                                                                                                    // 443
    handler: handler                                                                                               // 444
  });                                                                                                              // 442
};                                                                                                                 // 446
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
Ap._runLoginHandlers = function (methodInvocation, options) {                                                      // 463
  for (var i = 0; i < this._loginHandlers.length; ++i) {                                                           // 464
    var handler = this._loginHandlers[i];                                                                          // 465
                                                                                                                   //
    var result = tryLoginMethod(handler.name, function () {                                                        // 467
      return handler.handler.call(methodInvocation, options);                                                      // 470
    });                                                                                                            // 471
                                                                                                                   //
    if (result) {                                                                                                  // 474
      return result;                                                                                               // 475
    }                                                                                                              // 476
                                                                                                                   //
    if (result !== undefined) {                                                                                    // 478
      throw new Meteor.Error(400, "A login handler should return a result or undefined");                          // 479
    }                                                                                                              // 480
  }                                                                                                                // 481
                                                                                                                   //
  return {                                                                                                         // 483
    type: null,                                                                                                    // 484
    error: new Meteor.Error(400, "Unrecognized options for login request")                                         // 485
  };                                                                                                               // 483
};                                                                                                                 // 487
                                                                                                                   //
// Deletes the given loginToken from the database.                                                                 //
//                                                                                                                 //
// For new-style hashed token, this will cause all connections                                                     //
// associated with the token to be closed.                                                                         //
//                                                                                                                 //
// Any connections associated with old-style unhashed tokens will be                                               //
// in the process of becoming associated with hashed tokens and then                                               //
// they'll get closed.                                                                                             //
Ap.destroyToken = function (userId, loginToken) {                                                                  // 497
  this.users.update(userId, {                                                                                      // 498
    $pull: {                                                                                                       // 499
      "services.resume.loginTokens": {                                                                             // 500
        $or: [{ hashedToken: loginToken }, { token: loginToken }]                                                  // 501
      }                                                                                                            // 500
    }                                                                                                              // 499
  });                                                                                                              // 498
};                                                                                                                 // 508
                                                                                                                   //
Ap._initServerMethods = function () {                                                                              // 510
  // The methods created in this function need to be created here so that                                          //
  // this variable is available in their scope.                                                                    //
  var accounts = this;                                                                                             // 513
                                                                                                                   //
  // This object will be populated with methods and then passed to                                                 //
  // accounts._server.methods further below.                                                                       //
  var methods = {};                                                                                                // 517
                                                                                                                   //
  // @returns {Object|null}                                                                                        //
  //   If successful, returns {token: reconnectToken, id: userId}                                                  //
  //   If unsuccessful (for example, if the user closed the oauth login popup),                                    //
  //     throws an error describing the reason                                                                     //
  methods.login = function (options) {                                                                             // 523
    var self = this;                                                                                               // 524
                                                                                                                   //
    // Login handlers should really also check whatever field they look at in                                      //
    // options, but we don't enforce it.                                                                           //
    check(options, Object);                                                                                        // 528
                                                                                                                   //
    var result = accounts._runLoginHandlers(self, options);                                                        // 530
                                                                                                                   //
    return accounts._attemptLogin(self, "login", arguments, result);                                               // 532
  };                                                                                                               // 533
                                                                                                                   //
  methods.logout = function () {                                                                                   // 535
    var token = accounts._getLoginToken(this.connection.id);                                                       // 536
    accounts._setLoginToken(this.userId, this.connection, null);                                                   // 537
    if (token && this.userId) accounts.destroyToken(this.userId, token);                                           // 538
    this.setUserId(null);                                                                                          // 540
    accounts._successfulLogout();                                                                                  // 541
  };                                                                                                               // 542
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
  methods.logoutOtherClients = function () {                                                                       // 561
    var self = this;                                                                                               // 562
    var user = accounts.users.findOne(self.userId, {                                                               // 563
      fields: {                                                                                                    // 564
        "services.resume.loginTokens": true                                                                        // 565
      }                                                                                                            // 564
    });                                                                                                            // 563
    if (user) {                                                                                                    // 568
      // Save the current tokens in the database to be deleted in                                                  //
      // CONNECTION_CLOSE_DELAY_MS ms. This gives other connections in the                                         //
      // caller's browser time to find the fresh token in localStorage. We save                                    //
      // the tokens in the database in case we crash before actually deleting                                      //
      // them.                                                                                                     //
      var tokens = user.services.resume.loginTokens;                                                               // 574
      var newToken = accounts._generateStampedLoginToken();                                                        // 575
      var userId = self.userId;                                                                                    // 576
      accounts.users.update(userId, {                                                                              // 577
        $set: {                                                                                                    // 578
          "services.resume.loginTokensToDelete": tokens,                                                           // 579
          "services.resume.haveLoginTokensToDelete": true                                                          // 580
        },                                                                                                         // 578
        $push: { "services.resume.loginTokens": accounts._hashStampedToken(newToken) }                             // 582
      });                                                                                                          // 577
      Meteor.setTimeout(function () {                                                                              // 584
        // The observe on Meteor.users will take care of closing the connections                                   //
        // associated with `tokens`.                                                                               //
        accounts._deleteSavedTokensForUser(userId, tokens);                                                        // 587
      }, accounts._noConnectionCloseDelayForTest ? 0 : CONNECTION_CLOSE_DELAY_MS);                                 // 588
      // We do not set the login token on this connection, but instead the                                         //
      // observe closes the connection and the client will reconnect with the                                      //
      // new token.                                                                                                //
      return {                                                                                                     // 593
        token: newToken.token,                                                                                     // 594
        tokenExpires: accounts._tokenExpiration(newToken.when)                                                     // 595
      };                                                                                                           // 593
    } else {                                                                                                       // 597
      throw new Meteor.Error("You are not logged in.");                                                            // 598
    }                                                                                                              // 599
  };                                                                                                               // 600
                                                                                                                   //
  // Generates a new login token with the same expiration as the                                                   //
  // connection's current token and saves it to the database. Associates                                           //
  // the connection with this new token and returns it. Throws an error                                            //
  // if called on a connection that isn't logged in.                                                               //
  //                                                                                                               //
  // @returns Object                                                                                               //
  //   If successful, returns { token: <new token>, id: <user id>,                                                 //
  //   tokenExpires: <expiration date> }.                                                                          //
  methods.getNewToken = function () {                                                                              // 610
    var self = this;                                                                                               // 611
    var user = accounts.users.findOne(self.userId, {                                                               // 612
      fields: { "services.resume.loginTokens": 1 }                                                                 // 613
    });                                                                                                            // 612
    if (!self.userId || !user) {                                                                                   // 615
      throw new Meteor.Error("You are not logged in.");                                                            // 616
    }                                                                                                              // 617
    // Be careful not to generate a new token that has a later                                                     //
    // expiration than the curren token. Otherwise, a bad guy with a                                               //
    // stolen token could use this method to stop his stolen token from                                            //
    // ever expiring.                                                                                              //
    var currentHashedToken = accounts._getLoginToken(self.connection.id);                                          // 622
    var currentStampedToken = _.find(user.services.resume.loginTokens, function (stampedToken) {                   // 623
      return stampedToken.hashedToken === currentHashedToken;                                                      // 626
    });                                                                                                            // 627
    if (!currentStampedToken) {                                                                                    // 629
      // safety belt: this should never happen                                                                     //
      throw new Meteor.Error("Invalid login token");                                                               // 630
    }                                                                                                              // 631
    var newStampedToken = accounts._generateStampedLoginToken();                                                   // 632
    newStampedToken.when = currentStampedToken.when;                                                               // 633
    accounts._insertLoginToken(self.userId, newStampedToken);                                                      // 634
    return accounts._loginUser(self, self.userId, newStampedToken);                                                // 635
  };                                                                                                               // 636
                                                                                                                   //
  // Removes all tokens except the token associated with the current                                               //
  // connection. Throws an error if the connection is not logged                                                   //
  // in. Returns nothing on success.                                                                               //
  methods.removeOtherTokens = function () {                                                                        // 641
    var self = this;                                                                                               // 642
    if (!self.userId) {                                                                                            // 643
      throw new Meteor.Error("You are not logged in.");                                                            // 644
    }                                                                                                              // 645
    var currentToken = accounts._getLoginToken(self.connection.id);                                                // 646
    accounts.users.update(self.userId, {                                                                           // 647
      $pull: {                                                                                                     // 648
        "services.resume.loginTokens": { hashedToken: { $ne: currentToken } }                                      // 649
      }                                                                                                            // 648
    });                                                                                                            // 647
  };                                                                                                               // 652
                                                                                                                   //
  // Allow a one-time configuration for a login service. Modifications                                             //
  // to this collection are also allowed in insecure mode.                                                         //
  methods.configureLoginService = function (options) {                                                             // 656
    check(options, Match.ObjectIncluding({ service: String }));                                                    // 657
    // Don't let random users configure a service we haven't added yet (so                                         //
    // that when we do later add it, it's set up with their configuration                                          //
    // instead of ours).                                                                                           //
    // XXX if service configuration is oauth-specific then this code should                                        //
    //     be in accounts-oauth; if it's not then the registry should be                                           //
    //     in this package                                                                                         //
    if (!(accounts.oauth && _.contains(accounts.oauth.serviceNames(), options.service))) {                         // 664
      throw new Meteor.Error(403, "Service unknown");                                                              // 666
    }                                                                                                              // 667
                                                                                                                   //
    var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;                              // 669
    if (ServiceConfiguration.configurations.findOne({ service: options.service })) throw new Meteor.Error(403, "Service " + options.service + " already configured");
                                                                                                                   //
    if (_.has(options, "secret") && usingOAuthEncryption()) options.secret = OAuthEncryption.seal(options.secret);
                                                                                                                   //
    ServiceConfiguration.configurations.insert(options);                                                           // 677
  };                                                                                                               // 678
                                                                                                                   //
  accounts._server.methods(methods);                                                                               // 680
};                                                                                                                 // 681
                                                                                                                   //
Ap._initAccountDataHooks = function () {                                                                           // 683
  var accounts = this;                                                                                             // 684
                                                                                                                   //
  accounts._server.onConnection(function (connection) {                                                            // 686
    accounts._accountData[connection.id] = {                                                                       // 687
      connection: connection                                                                                       // 688
    };                                                                                                             // 687
                                                                                                                   //
    connection.onClose(function () {                                                                               // 691
      accounts._removeTokenFromConnection(connection.id);                                                          // 692
      delete accounts._accountData[connection.id];                                                                 // 693
    });                                                                                                            // 694
  });                                                                                                              // 695
};                                                                                                                 // 696
                                                                                                                   //
Ap._initServerPublications = function () {                                                                         // 698
  var accounts = this;                                                                                             // 699
                                                                                                                   //
  // Publish all login service configuration fields other than secret.                                             //
  accounts._server.publish("meteor.loginServiceConfiguration", function () {                                       // 702
    var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;                              // 703
    return ServiceConfiguration.configurations.find({}, { fields: { secret: 0 } });                                // 705
  }, { is_auto: true }); // not techincally autopublish, but stops the warning.                                    // 706
                                                                                                                   //
  // Publish the current user's record to the client.                                                              //
  accounts._server.publish(null, function () {                                                                     // 709
    if (this.userId) {                                                                                             // 710
      return accounts.users.find({                                                                                 // 711
        _id: this.userId                                                                                           // 712
      }, {                                                                                                         // 711
        fields: {                                                                                                  // 714
          profile: 1,                                                                                              // 715
          username: 1,                                                                                             // 716
          emails: 1                                                                                                // 717
        }                                                                                                          // 714
      });                                                                                                          // 713
    } else {                                                                                                       // 720
      return null;                                                                                                 // 721
    }                                                                                                              // 722
  }, /*suppress autopublish warning*/{ is_auto: true });                                                           // 723
                                                                                                                   //
  // Use Meteor.startup to give other packages a chance to call                                                    //
  // addAutopublishFields.                                                                                         //
  Package.autopublish && Meteor.startup(function () {                                                              // 727
    // ['profile', 'username'] -> {profile: 1, username: 1}                                                        //
    var toFieldSelector = function toFieldSelector(fields) {                                                       // 729
      return _.object(_.map(fields, function (field) {                                                             // 730
        return [field, 1];                                                                                         // 731
      }));                                                                                                         // 732
    };                                                                                                             // 733
                                                                                                                   //
    accounts._server.publish(null, function () {                                                                   // 735
      if (this.userId) {                                                                                           // 736
        return accounts.users.find({                                                                               // 737
          _id: this.userId                                                                                         // 738
        }, {                                                                                                       // 737
          fields: toFieldSelector(accounts._autopublishFields.loggedInUser)                                        // 740
        });                                                                                                        // 739
      } else {                                                                                                     // 742
        return null;                                                                                               // 743
      }                                                                                                            // 744
    }, /*suppress autopublish warning*/{ is_auto: true });                                                         // 745
                                                                                                                   //
    // XXX this publish is neither dedup-able nor is it optimized by our special                                   //
    // treatment of queries on a specific _id. Therefore this will have O(n^2)                                     //
    // run-time performance every time a user document is changed (eg someone                                      //
    // logging in). If this is a problem, we can instead write a manual publish                                    //
    // function which filters out fields based on 'this.userId'.                                                   //
    accounts._server.publish(null, function () {                                                                   // 752
      var selector = this.userId ? {                                                                               // 753
        _id: { $ne: this.userId }                                                                                  // 754
      } : {};                                                                                                      // 753
                                                                                                                   //
      return accounts.users.find(selector, {                                                                       // 757
        fields: toFieldSelector(accounts._autopublishFields.otherUsers)                                            // 758
      });                                                                                                          // 757
    }, /*suppress autopublish warning*/{ is_auto: true });                                                         // 760
  });                                                                                                              // 761
};                                                                                                                 // 762
                                                                                                                   //
// Add to the list of fields or subfields to be automatically                                                      //
// published if autopublish is on. Must be called from top-level                                                   //
// code (ie, before Meteor.startup hooks run).                                                                     //
//                                                                                                                 //
// @param opts {Object} with:                                                                                      //
//   - forLoggedInUser {Array} Array of fields published to the logged-in user                                     //
//   - forOtherUsers {Array} Array of fields published to users that aren't logged in                              //
Ap.addAutopublishFields = function (opts) {                                                                        // 771
  this._autopublishFields.loggedInUser.push.apply(this._autopublishFields.loggedInUser, opts.forLoggedInUser);     // 772
  this._autopublishFields.otherUsers.push.apply(this._autopublishFields.otherUsers, opts.forOtherUsers);           // 774
};                                                                                                                 // 776
                                                                                                                   //
///                                                                                                                //
/// ACCOUNT DATA                                                                                                   //
///                                                                                                                //
                                                                                                                   //
// HACK: This is used by 'meteor-accounts' to get the loginToken for a                                             //
// connection. Maybe there should be a public way to do that.                                                      //
Ap._getAccountData = function (connectionId, field) {                                                              // 784
  var data = this._accountData[connectionId];                                                                      // 785
  return data && data[field];                                                                                      // 786
};                                                                                                                 // 787
                                                                                                                   //
Ap._setAccountData = function (connectionId, field, value) {                                                       // 789
  var data = this._accountData[connectionId];                                                                      // 790
                                                                                                                   //
  // safety belt. shouldn't happen. accountData is set in onConnection,                                            //
  // we don't have a connectionId until it is set.                                                                 //
  if (!data) return;                                                                                               // 794
                                                                                                                   //
  if (value === undefined) delete data[field];else data[field] = value;                                            // 797
};                                                                                                                 // 801
                                                                                                                   //
///                                                                                                                //
/// RECONNECT TOKENS                                                                                               //
///                                                                                                                //
/// support reconnecting using a meteor login token                                                                //
                                                                                                                   //
Ap._hashLoginToken = function (loginToken) {                                                                       // 809
  var hash = crypto.createHash('sha256');                                                                          // 810
  hash.update(loginToken);                                                                                         // 811
  return hash.digest('base64');                                                                                    // 812
};                                                                                                                 // 813
                                                                                                                   //
// {token, when} => {hashedToken, when}                                                                            //
Ap._hashStampedToken = function (stampedToken) {                                                                   // 817
  return _.extend(_.omit(stampedToken, 'token'), {                                                                 // 818
    hashedToken: this._hashLoginToken(stampedToken.token)                                                          // 819
  });                                                                                                              // 818
};                                                                                                                 // 821
                                                                                                                   //
// Using $addToSet avoids getting an index error if another client                                                 //
// logging in simultaneously has already inserted the new hashed                                                   //
// token.                                                                                                          //
Ap._insertHashedLoginToken = function (userId, hashedToken, query) {                                               // 827
  query = query ? _.clone(query) : {};                                                                             // 828
  query._id = userId;                                                                                              // 829
  this.users.update(query, {                                                                                       // 830
    $addToSet: {                                                                                                   // 831
      "services.resume.loginTokens": hashedToken                                                                   // 832
    }                                                                                                              // 831
  });                                                                                                              // 830
};                                                                                                                 // 835
                                                                                                                   //
// Exported for tests.                                                                                             //
Ap._insertLoginToken = function (userId, stampedToken, query) {                                                    // 839
  this._insertHashedLoginToken(userId, this._hashStampedToken(stampedToken), query);                               // 840
};                                                                                                                 // 845
                                                                                                                   //
Ap._clearAllLoginTokens = function (userId) {                                                                      // 848
  this.users.update(userId, {                                                                                      // 849
    $set: {                                                                                                        // 850
      'services.resume.loginTokens': []                                                                            // 851
    }                                                                                                              // 850
  });                                                                                                              // 849
};                                                                                                                 // 854
                                                                                                                   //
// test hook                                                                                                       //
Ap._getUserObserve = function (connectionId) {                                                                     // 857
  return this._userObservesForConnections[connectionId];                                                           // 858
};                                                                                                                 // 859
                                                                                                                   //
// Clean up this connection's association with the token: that is, stop                                            //
// the observe that we started when we associated the connection with                                              //
// this token.                                                                                                     //
Ap._removeTokenFromConnection = function (connectionId) {                                                          // 864
  if (_.has(this._userObservesForConnections, connectionId)) {                                                     // 865
    var observe = this._userObservesForConnections[connectionId];                                                  // 866
    if (typeof observe === 'number') {                                                                             // 867
      // We're in the process of setting up an observe for this connection. We                                     //
      // can't clean up that observe yet, but if we delete the placeholder for                                     //
      // this connection, then the observe will get cleaned up as soon as it has                                   //
      // been set up.                                                                                              //
      delete this._userObservesForConnections[connectionId];                                                       // 872
    } else {                                                                                                       // 873
      delete this._userObservesForConnections[connectionId];                                                       // 874
      observe.stop();                                                                                              // 875
    }                                                                                                              // 876
  }                                                                                                                // 877
};                                                                                                                 // 878
                                                                                                                   //
Ap._getLoginToken = function (connectionId) {                                                                      // 880
  return this._getAccountData(connectionId, 'loginToken');                                                         // 881
};                                                                                                                 // 882
                                                                                                                   //
// newToken is a hashed token.                                                                                     //
Ap._setLoginToken = function (userId, connection, newToken) {                                                      // 885
  var self = this;                                                                                                 // 886
                                                                                                                   //
  self._removeTokenFromConnection(connection.id);                                                                  // 888
  self._setAccountData(connection.id, 'loginToken', newToken);                                                     // 889
                                                                                                                   //
  if (newToken) {                                                                                                  // 891
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
    var myObserveNumber = ++self._nextUserObserveNumber;                                                           // 905
    self._userObservesForConnections[connection.id] = myObserveNumber;                                             // 906
    Meteor.defer(function () {                                                                                     // 907
      // If something else happened on this connection in the meantime (it got                                     //
      // closed, or another call to _setLoginToken happened), just do                                              //
      // nothing. We don't need to start an observe for an old connection or old                                   //
      // token.                                                                                                    //
      if (self._userObservesForConnections[connection.id] !== myObserveNumber) {                                   // 912
        return;                                                                                                    // 913
      }                                                                                                            // 914
                                                                                                                   //
      var foundMatchingUser;                                                                                       // 916
      // Because we upgrade unhashed login tokens to hashed tokens at                                              //
      // login time, sessions will only be logged in with a hashed                                                 //
      // token. Thus we only need to observe hashed tokens here.                                                   //
      var observe = self.users.find({                                                                              // 920
        _id: userId,                                                                                               // 921
        'services.resume.loginTokens.hashedToken': newToken                                                        // 922
      }, { fields: { _id: 1 } }).observeChanges({                                                                  // 920
        added: function added() {                                                                                  // 924
          foundMatchingUser = true;                                                                                // 925
        },                                                                                                         // 926
        removed: function removed() {                                                                              // 927
          connection.close();                                                                                      // 928
          // The onClose callback for the connection takes care of                                                 //
          // cleaning up the observe handle and any other state we have                                            //
          // lying around.                                                                                         //
        }                                                                                                          // 932
      });                                                                                                          // 923
                                                                                                                   //
      // If the user ran another login or logout command we were waiting for the                                   //
      // defer or added to fire (ie, another call to _setLoginToken occurred),                                     //
      // then we let the later one win (start an observe, etc) and just stop our                                   //
      // observe now.                                                                                              //
      //                                                                                                           //
      // Similarly, if the connection was already closed, then the onClose                                         //
      // callback would have called _removeTokenFromConnection and there won't                                     //
      // be an entry in _userObservesForConnections. We can stop the observe.                                      //
      if (self._userObservesForConnections[connection.id] !== myObserveNumber) {                                   // 943
        observe.stop();                                                                                            // 944
        return;                                                                                                    // 945
      }                                                                                                            // 946
                                                                                                                   //
      self._userObservesForConnections[connection.id] = observe;                                                   // 948
                                                                                                                   //
      if (!foundMatchingUser) {                                                                                    // 950
        // We've set up an observe on the user associated with `newToken`,                                         //
        // so if the new token is removed from the database, we'll close                                           //
        // the connection. But the token might have already been deleted                                           //
        // before we set up the observe, which wouldn't have closed the                                            //
        // connection because the observe wasn't running yet.                                                      //
        connection.close();                                                                                        // 956
      }                                                                                                            // 957
    });                                                                                                            // 958
  }                                                                                                                // 959
};                                                                                                                 // 960
                                                                                                                   //
function setupDefaultLoginHandlers(accounts) {                                                                     // 962
  accounts.registerLoginHandler("resume", function (options) {                                                     // 963
    return defaultResumeLoginHandler.call(this, accounts, options);                                                // 964
  });                                                                                                              // 965
}                                                                                                                  // 966
                                                                                                                   //
// Login handler for resume tokens.                                                                                //
function defaultResumeLoginHandler(accounts, options) {                                                            // 969
  if (!options.resume) return undefined;                                                                           // 970
                                                                                                                   //
  check(options.resume, String);                                                                                   // 973
                                                                                                                   //
  var hashedToken = accounts._hashLoginToken(options.resume);                                                      // 975
                                                                                                                   //
  // First look for just the new-style hashed login token, to avoid                                                //
  // sending the unhashed token to the database in a query if we don't                                             //
  // need to.                                                                                                      //
  var user = accounts.users.findOne({ "services.resume.loginTokens.hashedToken": hashedToken });                   // 980
                                                                                                                   //
  if (!user) {                                                                                                     // 983
    // If we didn't find the hashed login token, try also looking for                                              //
    // the old-style unhashed token.  But we need to look for either                                               //
    // the old-style token OR the new-style token, because another                                                 //
    // client connection logging in simultaneously might have already                                              //
    // converted the token.                                                                                        //
    user = accounts.users.findOne({                                                                                // 989
      $or: [{ "services.resume.loginTokens.hashedToken": hashedToken }, { "services.resume.loginTokens.token": options.resume }]
    });                                                                                                            // 989
  }                                                                                                                // 995
                                                                                                                   //
  if (!user) return {                                                                                              // 997
    error: new Meteor.Error(403, "You've been logged out by the server. Please log in again.")                     // 999
  };                                                                                                               // 998
                                                                                                                   //
  // Find the token, which will either be an object with fields                                                    //
  // {hashedToken, when} for a hashed token or {token, when} for an                                                //
  // unhashed token.                                                                                               //
  var oldUnhashedStyleToken;                                                                                       // 1005
  var token = _.find(user.services.resume.loginTokens, function (token) {                                          // 1006
    return token.hashedToken === hashedToken;                                                                      // 1007
  });                                                                                                              // 1008
  if (token) {                                                                                                     // 1009
    oldUnhashedStyleToken = false;                                                                                 // 1010
  } else {                                                                                                         // 1011
    token = _.find(user.services.resume.loginTokens, function (token) {                                            // 1012
      return token.token === options.resume;                                                                       // 1013
    });                                                                                                            // 1014
    oldUnhashedStyleToken = true;                                                                                  // 1015
  }                                                                                                                // 1016
                                                                                                                   //
  var tokenExpires = accounts._tokenExpiration(token.when);                                                        // 1018
  if (new Date() >= tokenExpires) return {                                                                         // 1019
    userId: user._id,                                                                                              // 1021
    error: new Meteor.Error(403, "Your session has expired. Please log in again.")                                 // 1022
  };                                                                                                               // 1020
                                                                                                                   //
  // Update to a hashed token when an unhashed token is encountered.                                               //
  if (oldUnhashedStyleToken) {                                                                                     // 1026
    // Only add the new hashed token if the old unhashed token still                                               //
    // exists (this avoids resurrecting the token if it was deleted                                                //
    // after we read it).  Using $addToSet avoids getting an index                                                 //
    // error if another client logging in simultaneously has already                                               //
    // inserted the new hashed token.                                                                              //
    accounts.users.update({                                                                                        // 1032
      _id: user._id,                                                                                               // 1034
      "services.resume.loginTokens.token": options.resume                                                          // 1035
    }, { $addToSet: {                                                                                              // 1033
        "services.resume.loginTokens": {                                                                           // 1038
          "hashedToken": hashedToken,                                                                              // 1039
          "when": token.when                                                                                       // 1040
        }                                                                                                          // 1038
      } });                                                                                                        // 1037
                                                                                                                   //
    // Remove the old token *after* adding the new, since otherwise                                                //
    // another client trying to login between our removing the old and                                             //
    // adding the new wouldn't find a token to login with.                                                         //
    accounts.users.update(user._id, {                                                                              // 1048
      $pull: {                                                                                                     // 1049
        "services.resume.loginTokens": { "token": options.resume }                                                 // 1050
      }                                                                                                            // 1049
    });                                                                                                            // 1048
  }                                                                                                                // 1053
                                                                                                                   //
  return {                                                                                                         // 1055
    userId: user._id,                                                                                              // 1056
    stampedLoginToken: {                                                                                           // 1057
      token: options.resume,                                                                                       // 1058
      when: token.when                                                                                             // 1059
    }                                                                                                              // 1057
  };                                                                                                               // 1055
}                                                                                                                  // 1062
                                                                                                                   //
// (Also used by Meteor Accounts server and tests).                                                                //
//                                                                                                                 //
Ap._generateStampedLoginToken = function () {                                                                      // 1066
  return {                                                                                                         // 1067
    token: Random.secret(),                                                                                        // 1068
    when: new Date()                                                                                               // 1069
  };                                                                                                               // 1067
};                                                                                                                 // 1071
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
Ap._expireTokens = function (oldestValidDate, userId) {                                                            // 1084
  var tokenLifetimeMs = this._getTokenLifetimeMs();                                                                // 1085
                                                                                                                   //
  // when calling from a test with extra arguments, you must specify both!                                         //
  if (oldestValidDate && !userId || !oldestValidDate && userId) {                                                  // 1088
    throw new Error("Bad test. Must specify both oldestValidDate and userId.");                                    // 1089
  }                                                                                                                // 1090
                                                                                                                   //
  oldestValidDate = oldestValidDate || new Date(new Date() - tokenLifetimeMs);                                     // 1092
  var userFilter = userId ? { _id: userId } : {};                                                                  // 1094
                                                                                                                   //
  // Backwards compatible with older versions of meteor that stored login token                                    //
  // timestamps as numbers.                                                                                        //
  this.users.update(_.extend(userFilter, {                                                                         // 1099
    $or: [{ "services.resume.loginTokens.when": { $lt: oldestValidDate } }, { "services.resume.loginTokens.when": { $lt: +oldestValidDate } }]
  }), {                                                                                                            // 1099
    $pull: {                                                                                                       // 1105
      "services.resume.loginTokens": {                                                                             // 1106
        $or: [{ when: { $lt: oldestValidDate } }, { when: { $lt: +oldestValidDate } }]                             // 1107
      }                                                                                                            // 1106
    }                                                                                                              // 1105
  }, { multi: true });                                                                                             // 1104
  // The observe on Meteor.users will take care of closing connections for                                         //
  // expired tokens.                                                                                               //
};                                                                                                                 // 1116
                                                                                                                   //
// @override from accounts_common.js                                                                               //
Ap.config = function (options) {                                                                                   // 1119
  // Call the overridden implementation of the method.                                                             //
  var superResult = _accounts_common.AccountsCommon.prototype.config.apply(this, arguments);                       // 1121
                                                                                                                   //
  // If the user set loginExpirationInDays to null, then we need to clear the                                      //
  // timer that periodically expires tokens.                                                                       //
  if (_.has(this._options, "loginExpirationInDays") && this._options.loginExpirationInDays === null && this.expireTokenInterval) {
    Meteor.clearInterval(this.expireTokenInterval);                                                                // 1128
    this.expireTokenInterval = null;                                                                               // 1129
  }                                                                                                                // 1130
                                                                                                                   //
  return superResult;                                                                                              // 1132
};                                                                                                                 // 1133
                                                                                                                   //
function setExpireTokensInterval(accounts) {                                                                       // 1135
  accounts.expireTokenInterval = Meteor.setInterval(function () {                                                  // 1136
    accounts._expireTokens();                                                                                      // 1137
  }, EXPIRE_TOKENS_INTERVAL_MS);                                                                                   // 1138
}                                                                                                                  // 1139
                                                                                                                   //
///                                                                                                                //
/// OAuth Encryption Support                                                                                       //
///                                                                                                                //
                                                                                                                   //
var OAuthEncryption = Package["oauth-encryption"] && Package["oauth-encryption"].OAuthEncryption;                  // 1146
                                                                                                                   //
function usingOAuthEncryption() {                                                                                  // 1150
  return OAuthEncryption && OAuthEncryption.keyIsLoaded();                                                         // 1151
}                                                                                                                  // 1152
                                                                                                                   //
// OAuth service data is temporarily stored in the pending credentials                                             //
// collection during the oauth authentication process.  Sensitive data                                             //
// such as access tokens are encrypted without the user id because                                                 //
// we don't know the user id yet.  We re-encrypt these fields with the                                             //
// user id included when storing the service data permanently in                                                   //
// the users collection.                                                                                           //
//                                                                                                                 //
function pinEncryptedFieldsToUser(serviceData, userId) {                                                           // 1162
  _.each(_.keys(serviceData), function (key) {                                                                     // 1163
    var value = serviceData[key];                                                                                  // 1164
    if (OAuthEncryption && OAuthEncryption.isSealed(value)) value = OAuthEncryption.seal(OAuthEncryption.open(value), userId);
    serviceData[key] = value;                                                                                      // 1167
  });                                                                                                              // 1168
}                                                                                                                  // 1169
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
Meteor.startup(function () {                                                                                       // 1181
  if (!usingOAuthEncryption()) {                                                                                   // 1182
    return;                                                                                                        // 1183
  }                                                                                                                // 1184
                                                                                                                   //
  var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;                                // 1186
                                                                                                                   //
  ServiceConfiguration.configurations.find({                                                                       // 1189
    $and: [{                                                                                                       // 1190
      secret: { $exists: true }                                                                                    // 1191
    }, {                                                                                                           // 1190
      "secret.algorithm": { $exists: false }                                                                       // 1193
    }]                                                                                                             // 1192
  }).forEach(function (config) {                                                                                   // 1189
    ServiceConfiguration.configurations.update(config._id, {                                                       // 1196
      $set: {                                                                                                      // 1197
        secret: OAuthEncryption.seal(config.secret)                                                                // 1198
      }                                                                                                            // 1197
    });                                                                                                            // 1196
  });                                                                                                              // 1201
});                                                                                                                // 1202
                                                                                                                   //
// XXX see comment on Accounts.createUser in passwords_server about adding a                                       //
// second "server options" argument.                                                                               //
function defaultCreateUserHook(options, user) {                                                                    // 1206
  if (options.profile) user.profile = options.profile;                                                             // 1207
  return user;                                                                                                     // 1209
}                                                                                                                  // 1210
                                                                                                                   //
// Called by accounts-password                                                                                     //
Ap.insertUserDoc = function (options, user) {                                                                      // 1213
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
  user = _.extend({                                                                                                // 1226
    createdAt: new Date(),                                                                                         // 1227
    _id: Random.id()                                                                                               // 1228
  }, user);                                                                                                        // 1226
                                                                                                                   //
  if (user.services) {                                                                                             // 1231
    _.each(user.services, function (serviceData) {                                                                 // 1232
      pinEncryptedFieldsToUser(serviceData, user._id);                                                             // 1233
    });                                                                                                            // 1234
  }                                                                                                                // 1235
                                                                                                                   //
  var fullUser;                                                                                                    // 1237
  if (this._onCreateUserHook) {                                                                                    // 1238
    fullUser = this._onCreateUserHook(options, user);                                                              // 1239
                                                                                                                   //
    // This is *not* part of the API. We need this because we can't isolate                                        //
    // the global server environment between tests, meaning we can't test                                          //
    // both having a create user hook set and not having one set.                                                  //
    if (fullUser === 'TEST DEFAULT HOOK') fullUser = defaultCreateUserHook(options, user);                         // 1244
  } else {                                                                                                         // 1246
    fullUser = defaultCreateUserHook(options, user);                                                               // 1247
  }                                                                                                                // 1248
                                                                                                                   //
  _.each(this._validateNewUserHooks, function (hook) {                                                             // 1250
    if (!hook(fullUser)) throw new Meteor.Error(403, "User validation failed");                                    // 1251
  });                                                                                                              // 1253
                                                                                                                   //
  var userId;                                                                                                      // 1255
  try {                                                                                                            // 1256
    userId = this.users.insert(fullUser);                                                                          // 1257
  } catch (e) {                                                                                                    // 1258
    // XXX string parsing sucks, maybe                                                                             //
    // https://jira.mongodb.org/browse/SERVER-3069 will get fixed one day                                          //
    if (e.name !== 'MongoError') throw e;                                                                          // 1261
    if (e.code !== 11000) throw e;                                                                                 // 1262
    if (e.err.indexOf('emails.address') !== -1) throw new Meteor.Error(403, "Email already exists.");              // 1263
    if (e.err.indexOf('username') !== -1) throw new Meteor.Error(403, "Username already exists.");                 // 1265
    // XXX better error reporting for services.facebook.id duplicate, etc                                          //
    throw e;                                                                                                       // 1268
  }                                                                                                                // 1269
  return userId;                                                                                                   // 1270
};                                                                                                                 // 1271
                                                                                                                   //
// Helper function: returns false if email does not match company domain from                                      //
// the configuration.                                                                                              //
Ap._testEmailDomain = function (email) {                                                                           // 1275
  var domain = this._options.restrictCreationByEmailDomain;                                                        // 1276
  return !domain || _.isFunction(domain) && domain(email) || _.isString(domain) && new RegExp('@' + Meteor._escapeRegExp(domain) + '$', 'i').test(email);
};                                                                                                                 // 1281
                                                                                                                   //
// Validate new user's email or Google/Facebook/GitHub account's email                                             //
function defaultValidateNewUserHook(user) {                                                                        // 1284
  var self = this;                                                                                                 // 1285
  var domain = self._options.restrictCreationByEmailDomain;                                                        // 1286
  if (!domain) return true;                                                                                        // 1287
                                                                                                                   //
  var emailIsGood = false;                                                                                         // 1290
  if (!_.isEmpty(user.emails)) {                                                                                   // 1291
    emailIsGood = _.any(user.emails, function (email) {                                                            // 1292
      return self._testEmailDomain(email.address);                                                                 // 1293
    });                                                                                                            // 1294
  } else if (!_.isEmpty(user.services)) {                                                                          // 1295
    // Find any email of any service and check it                                                                  //
    emailIsGood = _.any(user.services, function (service) {                                                        // 1297
      return service.email && self._testEmailDomain(service.email);                                                // 1298
    });                                                                                                            // 1299
  }                                                                                                                // 1300
                                                                                                                   //
  if (emailIsGood) return true;                                                                                    // 1302
                                                                                                                   //
  if (_.isString(domain)) throw new Meteor.Error(403, "@" + domain + " email required");else throw new Meteor.Error(403, "Email doesn't match the criteria.");
}                                                                                                                  // 1309
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
Ap.updateOrCreateUserFromExternalService = function (serviceName, serviceData, options) {                          // 1326
  options = _.clone(options || {});                                                                                // 1331
                                                                                                                   //
  if (serviceName === "password" || serviceName === "resume") throw new Error("Can't use updateOrCreateUserFromExternalService with internal service " + serviceName);
  if (!_.has(serviceData, 'id')) throw new Error("Service data for service " + serviceName + " must include id");  // 1337
                                                                                                                   //
  // Look for a user with the appropriate service user id.                                                         //
  var selector = {};                                                                                               // 1342
  var serviceIdKey = "services." + serviceName + ".id";                                                            // 1343
                                                                                                                   //
  // XXX Temporary special case for Twitter. (Issue #629)                                                          //
  //   The serviceData.id will be a string representation of an integer.                                           //
  //   We want it to match either a stored string or int representation.                                           //
  //   This is to cater to earlier versions of Meteor storing twitter                                              //
  //   user IDs in number form, and recent versions storing them as strings.                                       //
  //   This can be removed once migration technology is in place, and twitter                                      //
  //   users stored with integer IDs have been migrated to string IDs.                                             //
  if (serviceName === "twitter" && !isNaN(serviceData.id)) {                                                       // 1352
    selector["$or"] = [{}, {}];                                                                                    // 1353
    selector["$or"][0][serviceIdKey] = serviceData.id;                                                             // 1354
    selector["$or"][1][serviceIdKey] = parseInt(serviceData.id, 10);                                               // 1355
  } else {                                                                                                         // 1356
    selector[serviceIdKey] = serviceData.id;                                                                       // 1357
  }                                                                                                                // 1358
                                                                                                                   //
  var user = this.users.findOne(selector);                                                                         // 1360
                                                                                                                   //
  if (user) {                                                                                                      // 1362
    pinEncryptedFieldsToUser(serviceData, user._id);                                                               // 1363
                                                                                                                   //
    // We *don't* process options (eg, profile) for update, but we do replace                                      //
    // the serviceData (eg, so that we keep an unexpired access token and                                          //
    // don't cache old email addresses in serviceData.email).                                                      //
    // XXX provide an onUpdateUser hook which would let apps update                                                //
    //     the profile too                                                                                         //
    var setAttrs = {};                                                                                             // 1370
    _.each(serviceData, function (value, key) {                                                                    // 1371
      setAttrs["services." + serviceName + "." + key] = value;                                                     // 1372
    });                                                                                                            // 1373
                                                                                                                   //
    // XXX Maybe we should re-use the selector above and notice if the update                                      //
    //     touches nothing?                                                                                        //
    this.users.update(user._id, {                                                                                  // 1377
      $set: setAttrs                                                                                               // 1378
    });                                                                                                            // 1377
                                                                                                                   //
    return {                                                                                                       // 1381
      type: serviceName,                                                                                           // 1382
      userId: user._id                                                                                             // 1383
    };                                                                                                             // 1381
  } else {                                                                                                         // 1386
    // Create a new user with the service data. Pass other options through to                                      //
    // insertUserDoc.                                                                                              //
    user = { services: {} };                                                                                       // 1389
    user.services[serviceName] = serviceData;                                                                      // 1390
    return {                                                                                                       // 1391
      type: serviceName,                                                                                           // 1392
      userId: this.insertUserDoc(options, user)                                                                    // 1393
    };                                                                                                             // 1391
  }                                                                                                                // 1395
};                                                                                                                 // 1396
                                                                                                                   //
function setupUsersCollection(users) {                                                                             // 1398
  ///                                                                                                              //
  /// RESTRICTING WRITES TO USER OBJECTS                                                                           //
  ///                                                                                                              //
  users.allow({                                                                                                    // 1402
    // clients can modify the profile field of their own document, and                                             //
    // nothing else.                                                                                               //
    update: function update(userId, user, fields, modifier) {                                                      // 1405
      // make sure it is our record                                                                                //
      if (user._id !== userId) return false;                                                                       // 1407
                                                                                                                   //
      // user can only modify the 'profile' field. sets to multiple                                                //
      // sub-keys (eg profile.foo and profile.bar) are merged into entry                                           //
      // in the fields list.                                                                                       //
      if (fields.length !== 1 || fields[0] !== 'profile') return false;                                            // 1413
                                                                                                                   //
      return true;                                                                                                 // 1416
    },                                                                                                             // 1417
    fetch: ['_id'] // we only look at _id.                                                                         // 1418
  });                                                                                                              // 1402
                                                                                                                   //
  /// DEFAULT INDEXES ON USERS                                                                                     //
  users._ensureIndex('username', { unique: 1, sparse: 1 });                                                        // 1422
  users._ensureIndex('emails.address', { unique: 1, sparse: 1 });                                                  // 1423
  users._ensureIndex('services.resume.loginTokens.hashedToken', { unique: 1, sparse: 1 });                         // 1424
  users._ensureIndex('services.resume.loginTokens.token', { unique: 1, sparse: 1 });                               // 1426
  // For taking care of logoutOtherClients calls that crashed before the                                           //
  // tokens were deleted.                                                                                          //
  users._ensureIndex('services.resume.haveLoginTokensToDelete', { sparse: 1 });                                    // 1430
  // For expiring login tokens                                                                                     //
  users._ensureIndex("services.resume.loginTokens.when", { sparse: 1 });                                           // 1433
}                                                                                                                  // 1434
                                                                                                                   //
///                                                                                                                //
/// CLEAN UP FOR `logoutOtherClients`                                                                              //
///                                                                                                                //
                                                                                                                   //
Ap._deleteSavedTokensForUser = function (userId, tokensToDelete) {                                                 // 1440
  if (tokensToDelete) {                                                                                            // 1441
    this.users.update(userId, {                                                                                    // 1442
      $unset: {                                                                                                    // 1443
        "services.resume.haveLoginTokensToDelete": 1,                                                              // 1444
        "services.resume.loginTokensToDelete": 1                                                                   // 1445
      },                                                                                                           // 1443
      $pullAll: {                                                                                                  // 1447
        "services.resume.loginTokens": tokensToDelete                                                              // 1448
      }                                                                                                            // 1447
    });                                                                                                            // 1442
  }                                                                                                                // 1451
};                                                                                                                 // 1452
                                                                                                                   //
Ap._deleteSavedTokensForAllUsersOnStartup = function () {                                                          // 1454
  var self = this;                                                                                                 // 1455
                                                                                                                   //
  // If we find users who have saved tokens to delete on startup, delete                                           //
  // them now. It's possible that the server could have crashed and come                                           //
  // back up before new tokens are found in localStorage, but this                                                 //
  // shouldn't happen very often. We shouldn't put a delay here because                                            //
  // that would give a lot of power to an attacker with a stolen login                                             //
  // token and the ability to crash the server.                                                                    //
  Meteor.startup(function () {                                                                                     // 1463
    self.users.find({                                                                                              // 1464
      "services.resume.haveLoginTokensToDelete": true                                                              // 1465
    }, {                                                                                                           // 1464
      "services.resume.loginTokensToDelete": 1                                                                     // 1467
    }).forEach(function (user) {                                                                                   // 1466
      self._deleteSavedTokensForUser(user._id, user.services.resume.loginTokensToDelete);                          // 1469
    });                                                                                                            // 1473
  });                                                                                                              // 1474
};                                                                                                                 // 1475
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"url_server.js":["./accounts_server.js",function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/accounts-base/url_server.js                                                                            //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
var _accounts_server = require('./accounts_server.js');                                                            // 1
                                                                                                                   //
// XXX These should probably not actually be public?                                                               //
                                                                                                                   //
_accounts_server.AccountsServer.prototype.urls = {                                                                 // 5
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
