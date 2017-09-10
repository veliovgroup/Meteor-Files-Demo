(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var _ = Package.underscore._;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var Symbol = Package['ecmascript-runtime-server'].Symbol;
var Map = Package['ecmascript-runtime-server'].Map;
var Set = Package['ecmascript-runtime-server'].Set;

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:cookies":{"cookies.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/ostrio_cookies/cookies.js                                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var _possibleConstructorReturn2 = require("babel-runtime/helpers/possibleConstructorReturn");                         //
                                                                                                                      //
var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);                                //
                                                                                                                      //
var _inherits2 = require("babel-runtime/helpers/inherits");                                                           //
                                                                                                                      //
var _inherits3 = _interopRequireDefault(_inherits2);                                                                  //
                                                                                                                      //
var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");                                               //
                                                                                                                      //
var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);                                                      //
                                                                                                                      //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                     //
                                                                                                                      //
module.export({                                                                                                       // 1
  Cookies: function () {                                                                                              // 1
    return Cookies;                                                                                                   // 1
  }                                                                                                                   // 1
});                                                                                                                   // 1
                                                                                                                      //
var _ = void 0;                                                                                                       // 1
                                                                                                                      //
module.watch(require("meteor/underscore"), {                                                                          // 1
  _: function (v) {                                                                                                   // 1
    _ = v;                                                                                                            // 1
  }                                                                                                                   // 1
}, 0);                                                                                                                // 1
var Meteor = void 0;                                                                                                  // 1
module.watch(require("meteor/meteor"), {                                                                              // 1
  Meteor: function (v) {                                                                                              // 1
    Meteor = v;                                                                                                       // 1
  }                                                                                                                   // 1
}, 1);                                                                                                                // 1
var HTTP = void 0;                                                                                                    // 4
var WebApp = void 0;                                                                                                  // 5
                                                                                                                      //
if (Meteor.isServer) {                                                                                                // 7
  WebApp = require('meteor/webapp').WebApp;                                                                           // 8
} else {                                                                                                              // 9
  HTTP = require('meteor/http').HTTP;                                                                                 // 10
}                                                                                                                     // 11
                                                                                                                      //
var NoOp = function () {};                                                                                            // 13
                                                                                                                      //
var urlRE = /\/___cookie___\/set/; /*                                                                                 // 14
                                   @url https://github.com/jshttp/cookie/blob/master/index.js                         //
                                   @name cookie                                                                       //
                                   @author jshttp                                                                     //
                                   @license                                                                           //
                                   (The MIT License)                                                                  //
                                                                                                                      //
                                   Copyright (c) 2012-2014 Roman Shtylman <shtylman@gmail.com>                        //
                                   Copyright (c) 2015 Douglas Christopher Wilson <doug@somethingdoug.com>             //
                                                                                                                      //
                                   Permission is hereby granted, free of charge, to any person obtaining              //
                                   a copy of this software and associated documentation files (the                    //
                                   'Software'), to deal in the Software without restriction, including                //
                                   without limitation the rights to use, copy, modify, merge, publish,                //
                                   distribute, sublicense, and/or sell copies of the Software, and to                 //
                                   permit persons to whom the Software is furnished to do so, subject to              //
                                   the following conditions:                                                          //
                                                                                                                      //
                                   The above copyright notice and this permission notice shall be                     //
                                   included in all copies or substantial portions of the Software.                    //
                                                                                                                      //
                                   THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,                    //
                                   EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF                 //
                                   MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.             //
                                   IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY               //
                                   CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,               //
                                   TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE                  //
                                   SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                             //
                                    */                                                                                //
var decode = decodeURIComponent;                                                                                      // 44
var encode = encodeURIComponent;                                                                                      // 45
var pairSplitRegExp = /; */; /*                                                                                       // 46
                             RegExp to match field-content in RFC 7230 sec 3.2                                        //
                                                                                                                      //
                             field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]                              //
                             field-vchar   = VCHAR / obs-text                                                         //
                             obs-text      = %x80-FF                                                                  //
                              */                                                                                      //
var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/; /*                                                  // 55
                                                                  @function                                           //
                                                                  @name parse                                         //
                                                                  @param {String} str                                 //
                                                                  @param {Object} [options]                           //
                                                                  @return {Object}                                    //
                                                                  @summary                                            //
                                                                  Parse a cookie header.                              //
                                                                  Parse the given cookie header string into an object
                                                                  The object has the various cookies as keys(names) => values
                                                                  @private                                            //
                                                                   */                                                 //
                                                                                                                      //
var parse = function (str, options) {                                                                                 // 69
  if (typeof str !== 'string') {                                                                                      // 70
    throw new Meteor.Error(404, 'argument str must be a string');                                                     // 71
  }                                                                                                                   // 72
                                                                                                                      //
  var obj = {};                                                                                                       // 73
  var opt = options || {};                                                                                            // 74
  var val = void 0;                                                                                                   // 75
  var key = void 0;                                                                                                   // 76
  var eqIndx = void 0;                                                                                                // 77
  str.split(pairSplitRegExp).forEach(function (pair) {                                                                // 79
    eqIndx = pair.indexOf('=');                                                                                       // 80
                                                                                                                      //
    if (eqIndx < 0) {                                                                                                 // 81
      return;                                                                                                         // 82
    }                                                                                                                 // 83
                                                                                                                      //
    key = pair.substr(0, eqIndx).trim();                                                                              // 84
    val = pair.substr(++eqIndx, pair.length).trim();                                                                  // 85
                                                                                                                      //
    if (val[0] === '"') {                                                                                             // 86
      val = val.slice(1, -1);                                                                                         // 87
    }                                                                                                                 // 88
                                                                                                                      //
    if (void 0 === obj[key]) {                                                                                        // 89
      obj[key] = tryDecode(val, opt.decode || decode);                                                                // 90
    }                                                                                                                 // 91
  });                                                                                                                 // 92
  return obj;                                                                                                         // 93
}; /*                                                                                                                 // 94
   @function                                                                                                          //
   @name serialize                                                                                                    //
   @param {String} name                                                                                               //
   @param {String} val                                                                                                //
   @param {Object} [options]                                                                                          //
   @return {String}                                                                                                   //
   @summary                                                                                                           //
   Serialize data into a cookie header.                                                                               //
   Serialize the a name value pair into a cookie string suitable for                                                  //
   http headers. An optional options object specified cookie parameters.                                              //
   serialize('foo', 'bar', { httpOnly: true })                                                                        //
     => "foo=bar; httpOnly"                                                                                           //
   @private                                                                                                           //
    */                                                                                                                //
                                                                                                                      //
var serialize = function (key, val) {                                                                                 // 111
  var opt = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};                                   // 111
  var name = void 0;                                                                                                  // 112
                                                                                                                      //
  if (!fieldContentRegExp.test(key)) {                                                                                // 114
    name = escape(key);                                                                                               // 115
  } else {                                                                                                            // 116
    name = key;                                                                                                       // 117
  }                                                                                                                   // 118
                                                                                                                      //
  var value = void 0;                                                                                                 // 120
                                                                                                                      //
  if (!_.isUndefined(val)) {                                                                                          // 121
    value = encode(val);                                                                                              // 122
                                                                                                                      //
    if (value && !fieldContentRegExp.test(value)) {                                                                   // 123
      value = escape(value);                                                                                          // 124
    }                                                                                                                 // 125
  } else {                                                                                                            // 126
    value = '';                                                                                                       // 127
  }                                                                                                                   // 128
                                                                                                                      //
  var pairs = [name + "=" + value];                                                                                   // 130
                                                                                                                      //
  if (_.isNumber(opt.maxAge)) {                                                                                       // 132
    pairs.push("Max-Age=" + opt.maxAge);                                                                              // 133
  }                                                                                                                   // 134
                                                                                                                      //
  if (opt.domain && _.isString(opt.domain)) {                                                                         // 136
    if (!fieldContentRegExp.test(opt.domain)) {                                                                       // 137
      throw new Meteor.Error(404, 'option domain is invalid');                                                        // 138
    }                                                                                                                 // 139
                                                                                                                      //
    pairs.push("Domain=" + opt.domain);                                                                               // 140
  }                                                                                                                   // 141
                                                                                                                      //
  if (opt.path && _.isString(opt.path)) {                                                                             // 143
    if (!fieldContentRegExp.test(opt.path)) {                                                                         // 144
      throw new Meteor.Error(404, 'option path is invalid');                                                          // 145
    }                                                                                                                 // 146
                                                                                                                      //
    pairs.push("Path=" + opt.path);                                                                                   // 147
  }                                                                                                                   // 148
                                                                                                                      //
  opt.expires = opt.expires || opt.expire || false;                                                                   // 150
                                                                                                                      //
  if (opt.expires === Infinity) {                                                                                     // 151
    pairs.push('Expires=Fri, 31 Dec 9999 23:59:59 GMT');                                                              // 152
  } else if (opt.expires instanceof Date) {                                                                           // 153
    pairs.push("Expires=" + opt.expires.toUTCString());                                                               // 154
  } else if (opt.expires === 0) {                                                                                     // 155
    pairs.push('Expires=0');                                                                                          // 156
  } else if (_.isNumber(opt.expires)) {                                                                               // 157
    pairs.push("Expires=" + new Date(opt.expires).toUTCString());                                                     // 158
  }                                                                                                                   // 159
                                                                                                                      //
  if (opt.httpOnly) {                                                                                                 // 161
    pairs.push('HttpOnly');                                                                                           // 162
  }                                                                                                                   // 163
                                                                                                                      //
  if (opt.secure) {                                                                                                   // 165
    pairs.push('Secure');                                                                                             // 166
  }                                                                                                                   // 167
                                                                                                                      //
  if (opt.firstPartyOnly) {                                                                                           // 169
    pairs.push('First-Party-Only');                                                                                   // 170
  }                                                                                                                   // 171
                                                                                                                      //
  if (opt.sameSite) {                                                                                                 // 173
    pairs.push('SameSite');                                                                                           // 174
  }                                                                                                                   // 175
                                                                                                                      //
  return pairs.join('; ');                                                                                            // 177
}; /*                                                                                                                 // 178
   @function                                                                                                          //
   @name tryDecode                                                                                                    //
   @param {String} str                                                                                                //
   @param {Function} d                                                                                                //
   @summary Try decoding a string using a decoding function.                                                          //
   @private                                                                                                           //
    */                                                                                                                //
                                                                                                                      //
var tryDecode = function (str, d) {                                                                                   // 189
  try {                                                                                                               // 190
    return d(str);                                                                                                    // 191
  } catch (e) {                                                                                                       // 192
    return str;                                                                                                       // 193
  }                                                                                                                   // 194
}; /*                                                                                                                 // 195
   @locus Anywhere                                                                                                    //
   @class __cookies                                                                                                   //
   @param _cookies {Object|String} - Current cookies as String or Object                                              //
   @param TTL {Number} - Default cookies expiration time (max-age) in milliseconds, by default - session (false)      //
   @param runOnServer {Boolean} - Expose Cookies class to Server                                                      //
   @param response {http.ServerResponse|Object} - This object is created internally by a HTTP server                  //
   @summary Internal Class                                                                                            //
    */                                                                                                                //
                                                                                                                      //
var __cookies = function () {                                                                                         //
  function __cookies(_cookies, TTL, runOnServer, response) {                                                          // 208
    (0, _classCallCheck3.default)(this, __cookies);                                                                   // 208
    this.TTL = TTL;                                                                                                   // 209
    this.response = response;                                                                                         // 210
    this.runOnServer = runOnServer;                                                                                   // 211
                                                                                                                      //
    if (_.isObject(_cookies)) {                                                                                       // 213
      this.cookies = _cookies;                                                                                        // 214
    } else {                                                                                                          // 215
      this.cookies = parse(_cookies);                                                                                 // 216
    }                                                                                                                 // 217
  } /*                                                                                                                // 218
    @locus Anywhere                                                                                                   //
    @memberOf __cookies                                                                                               //
    @name get                                                                                                         //
    @param {String} key  - The name of the cookie to read                                                             //
    @param {String} _tmp - Unparsed string instead of user's cookies                                                  //
    @summary Read a cookie. If the cookie doesn't exist a null value will be returned.                                //
    @returns {String|void}                                                                                            //
     */                                                                                                               //
                                                                                                                      //
  __cookies.prototype.get = function () {                                                                             //
    function get(key, _tmp) {                                                                                         //
      var _cs = _tmp ? parse(_tmp) : this.cookies;                                                                    // 230
                                                                                                                      //
      if (!key || !_cs) {                                                                                             // 231
        return void 0;                                                                                                // 232
      }                                                                                                               // 233
                                                                                                                      //
      if (_cs.hasOwnProperty(key)) {                                                                                  // 235
        return _cs[key];                                                                                              // 236
      }                                                                                                               // 237
                                                                                                                      //
      return void 0;                                                                                                  // 239
    }                                                                                                                 // 240
                                                                                                                      //
    return get;                                                                                                       //
  }(); /*                                                                                                             //
       @locus Anywhere                                                                                                //
       @memberOf __cookies                                                                                            //
       @name set                                                                                                      //
       @param {String}  key   - The name of the cookie to create/overwrite                                            //
       @param {String}  value - The value of the cookie                                                               //
       @param {Object}  opts  - [Optional] Cookie options (see readme docs)                                           //
       @summary Create/overwrite a cookie.                                                                            //
       @returns {Boolean}                                                                                             //
        */                                                                                                            //
                                                                                                                      //
  __cookies.prototype.set = function () {                                                                             //
    function set(key, value) {                                                                                        //
      var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};                              // 252
                                                                                                                      //
      if (key && !_.isUndefined(value)) {                                                                             // 253
        if (_.isNumber(this.TTL) && opts.expires === undefined) {                                                     // 254
          opts.expires = new Date(+new Date() + this.TTL);                                                            // 255
        }                                                                                                             // 256
                                                                                                                      //
        var newCookie = serialize(key, value, opts);                                                                  // 257
        this.cookies[key] = value;                                                                                    // 258
                                                                                                                      //
        if (Meteor.isClient) {                                                                                        // 259
          document.cookie = newCookie;                                                                                // 260
        } else {                                                                                                      // 261
          this.response.setHeader('Set-Cookie', newCookie);                                                           // 262
        }                                                                                                             // 263
                                                                                                                      //
        return true;                                                                                                  // 264
      }                                                                                                               // 265
                                                                                                                      //
      return false;                                                                                                   // 266
    }                                                                                                                 // 267
                                                                                                                      //
    return set;                                                                                                       //
  }(); /*                                                                                                             //
       @locus Anywhere                                                                                                //
       @memberOf __cookies                                                                                            //
       @name remove                                                                                                   //
       @param {String} key    - The name of the cookie to create/overwrite                                            //
       @param {String} path   - [Optional] The path from where the cookie will be                                     //
       readable. E.g., "/", "/mydir"; if not specified, defaults to the current                                       //
       path of the current document location (string or null). The path must be                                       //
       absolute (see RFC 2965). For more information on how to use relative paths                                     //
       in this argument, see: https://developer.mozilla.org/en-US/docs/Web/API/document.cookie#Using_relative_URLs_in_the_path_parameter
       @param {String} domain - [Optional] The domain from where the cookie will                                      //
       be readable. E.g., "example.com", ".example.com" (includes all subdomains)                                     //
       or "subdomain.example.com"; if not specified, defaults to the host portion                                     //
       of the current document location (string or null).                                                             //
       @summary Remove a cookie(s).                                                                                   //
       @returns {Boolean}                                                                                             //
        */                                                                                                            //
                                                                                                                      //
  __cookies.prototype.remove = function () {                                                                          //
    function remove(key) {                                                                                            //
      var path = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '/';                             // 286
      var domain = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';                            // 286
                                                                                                                      //
      if (key && this.cookies.hasOwnProperty(key)) {                                                                  // 287
        var newCookie = serialize(key, '', {                                                                          // 288
          domain: domain,                                                                                             // 289
          path: path,                                                                                                 // 290
          expires: new Date(0)                                                                                        // 291
        });                                                                                                           // 288
        delete this.cookies[key];                                                                                     // 294
                                                                                                                      //
        if (Meteor.isClient) {                                                                                        // 295
          document.cookie = newCookie;                                                                                // 296
        } else {                                                                                                      // 297
          this.response.setHeader('Set-Cookie', newCookie);                                                           // 298
        }                                                                                                             // 299
                                                                                                                      //
        return true;                                                                                                  // 300
      } else if (!key && this.keys().length > 0 && this.keys()[0] !== '') {                                           // 301
        var keys = Object.keys(this.cookies);                                                                         // 302
                                                                                                                      //
        for (var i = 0; i < keys.length; i++) {                                                                       // 303
          this.remove(keys[i]);                                                                                       // 304
        }                                                                                                             // 305
                                                                                                                      //
        return true;                                                                                                  // 306
      }                                                                                                               // 307
                                                                                                                      //
      return false;                                                                                                   // 308
    }                                                                                                                 // 309
                                                                                                                      //
    return remove;                                                                                                    //
  }(); /*                                                                                                             //
       @locus Anywhere                                                                                                //
       @memberOf __cookies                                                                                            //
       @name has                                                                                                      //
       @param {String} key  - The name of the cookie to create/overwrite                                              //
       @param {String} _tmp - Unparsed string instead of user's cookies                                               //
       @summary Check whether a cookie exists in the current position.                                                //
       @returns {Boolean}                                                                                             //
        */                                                                                                            //
                                                                                                                      //
  __cookies.prototype.has = function () {                                                                             //
    function has(key, _tmp) {                                                                                         //
      var _cs = _tmp ? parse(_tmp) : this.cookies;                                                                    // 321
                                                                                                                      //
      if (!key || !_cs) {                                                                                             // 322
        return false;                                                                                                 // 323
      }                                                                                                               // 324
                                                                                                                      //
      return _cs.hasOwnProperty(key);                                                                                 // 326
    }                                                                                                                 // 327
                                                                                                                      //
    return has;                                                                                                       //
  }(); /*                                                                                                             //
       @locus Anywhere                                                                                                //
       @memberOf __cookies                                                                                            //
       @name keys                                                                                                     //
       @summary Returns an array of all readable cookies from this location.                                          //
       @returns {[String]}                                                                                            //
        */                                                                                                            //
                                                                                                                      //
  __cookies.prototype.keys = function () {                                                                            //
    function keys() {                                                                                                 //
      if (this.cookies) {                                                                                             // 337
        return Object.keys(this.cookies);                                                                             // 338
      }                                                                                                               // 339
                                                                                                                      //
      return [];                                                                                                      // 340
    }                                                                                                                 // 341
                                                                                                                      //
    return keys;                                                                                                      //
  }(); /*                                                                                                             //
       @locus Client                                                                                                  //
       @memberOf __cookies                                                                                            //
       @name send                                                                                                     //
       @param cb {Function} - Callback                                                                                //
       @summary Send all cookies over XHR to server.                                                                  //
       @returns {void}                                                                                                //
        */                                                                                                            //
                                                                                                                      //
  __cookies.prototype.send = function () {                                                                            //
    function send() {                                                                                                 //
      var cb = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : NoOp;                              // 351
                                                                                                                      //
      if (Meteor.isServer) {                                                                                          // 352
        cb(new Meteor.Error(400, 'Can\'t run `.send()` on server, it\'s Client only method!'));                       // 353
      }                                                                                                               // 354
                                                                                                                      //
      if (this.runOnServer) {                                                                                         // 356
        HTTP.get((window.__meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '') + "/___cookie___/set", cb);            // 357
      } else {                                                                                                        // 358
        cb(new Meteor.Error(400, 'Can\'t send cookies on server when `runOnServer` is false.'));                      // 359
      }                                                                                                               // 360
                                                                                                                      //
      return void 0;                                                                                                  // 361
    }                                                                                                                 // 362
                                                                                                                      //
    return send;                                                                                                      //
  }();                                                                                                                //
                                                                                                                      //
  return __cookies;                                                                                                   //
}(); /*                                                                                                               //
     @function                                                                                                        //
     @locus Server                                                                                                    //
     @summary Middleware handler                                                                                      //
     @private                                                                                                         //
      */                                                                                                              //
                                                                                                                      //
var __middlewareHandler = function (req, res, self) {                                                                 // 372
  var _cookies = {};                                                                                                  // 373
                                                                                                                      //
  if (self.runOnServer) {                                                                                             // 374
    if (req.headers && req.headers.cookie) {                                                                          // 375
      _cookies = parse(req.headers.cookie);                                                                           // 376
    }                                                                                                                 // 377
                                                                                                                      //
    return new __cookies(_cookies, self.TTL, self.runOnServer, res);                                                  // 378
  }                                                                                                                   // 379
                                                                                                                      //
  throw new Meteor.Error(400, 'Can\'t use middleware when `runOnServer` is false.');                                  // 381
}; /*                                                                                                                 // 382
   @locus Anywhere                                                                                                    //
   @class Cookies                                                                                                     //
   @param opts {Object}                                                                                               //
   @param opts.TTL {Number} - Default cookies expiration time (max-age) in milliseconds, by default - session (false)
   @param opts.auto {Boolean} - [Server] Auto-bind in middleware as `req.Cookies`, by default `true`                  //
   @param opts.handler {Function} - [Server] Middleware handler                                                       //
   @param opts.runOnServer {Boolean} - Expose Cookies class to Server                                                 //
   @summary Main Cookie class                                                                                         //
    */                                                                                                                //
                                                                                                                      //
var Cookies = function (_cookies2) {                                                                                  //
  (0, _inherits3.default)(Cookies, _cookies2);                                                                        //
                                                                                                                      //
  function Cookies() {                                                                                                // 396
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};                                // 396
    (0, _classCallCheck3.default)(this, Cookies);                                                                     // 396
    opts.TTL = _.isNumber(opts.TTL) ? opts.TTL : false;                                                               // 397
    opts.runOnServer = opts.runOnServer !== false ? true : false;                                                     // 398
                                                                                                                      //
    if (Meteor.isClient) {                                                                                            // 400
      var _this = (0, _possibleConstructorReturn3.default)(this, _cookies2.call(this, document.cookie, opts.TTL, opts.runOnServer));
    } else {                                                                                                          // 402
      var _this = (0, _possibleConstructorReturn3.default)(this, _cookies2.call(this, {}, opts.TTL, opts.runOnServer));
                                                                                                                      //
      opts.auto = opts.auto !== false ? true : false;                                                                 // 404
                                                                                                                      //
      _this.handler = opts.handler || function () {};                                                                 // 405
                                                                                                                      //
      _this.runOnServer = opts.runOnServer;                                                                           // 406
                                                                                                                      //
      if (_this.runOnServer) {                                                                                        // 408
        if (!Cookies.isLoadedOnServer) {                                                                              // 409
          if (opts.auto) {                                                                                            // 410
            WebApp.connectHandlers.use(function (req, res, next) {                                                    // 411
              if (urlRE.test(req._parsedUrl.path)) {                                                                  // 412
                if (req.headers && req.headers.cookie) {                                                              // 413
                  var _cObj = parse(req.headers.cookie);                                                              // 414
                                                                                                                      //
                  var _cKeys = Object.keys(_cObj);                                                                    // 415
                                                                                                                      //
                  var _cArr = [];                                                                                     // 416
                                                                                                                      //
                  var _cStr = void 0;                                                                                 // 417
                                                                                                                      //
                  for (var i = 0; i < _cKeys.length; i++) {                                                           // 419
                    _cStr = serialize(_cKeys[i], _cObj[_cKeys[i]]);                                                   // 420
                                                                                                                      //
                    if (!~_cArr.indexOf(_cStr)) {                                                                     // 421
                      _cArr.push(_cStr);                                                                              // 422
                    }                                                                                                 // 423
                  }                                                                                                   // 424
                                                                                                                      //
                  res.setHeader('Set-Cookie', _cArr);                                                                 // 426
                }                                                                                                     // 427
                                                                                                                      //
                res.writeHead(200);                                                                                   // 429
                res.end('');                                                                                          // 430
              } else {                                                                                                // 431
                req.Cookies = __middlewareHandler(req, res, _this);                                                   // 432
                next();                                                                                               // 433
              }                                                                                                       // 434
            });                                                                                                       // 435
          }                                                                                                           // 436
                                                                                                                      //
          Cookies.isLoadedOnServer = true;                                                                            // 437
        }                                                                                                             // 438
      }                                                                                                               // 439
    }                                                                                                                 // 440
                                                                                                                      //
    return (0, _possibleConstructorReturn3.default)(_this);                                                           // 396
  } /*                                                                                                                // 441
    @locus Server                                                                                                     //
    @memberOf Cookies                                                                                                 //
    @name middleware                                                                                                  //
    @summary Get Cookies instance into callback                                                                       //
    @returns {void}                                                                                                   //
     */                                                                                                               //
                                                                                                                      //
  Cookies.prototype.middleware = function () {                                                                        //
    function middleware() {                                                                                           //
      var _this2 = this;                                                                                              // 451
                                                                                                                      //
      if (!Meteor.isServer) {                                                                                         // 452
        throw new Meteor.Error(500, '[ostrio:cookies] Can\'t use `.middleware()` on Client, it\'s Server only!');     // 453
      }                                                                                                               // 454
                                                                                                                      //
      return function (req, res, next) {                                                                              // 456
        _this2.handler && _this2.handler(__middlewareHandler(req, res, _this2));                                      // 457
        next();                                                                                                       // 458
      };                                                                                                              // 459
    }                                                                                                                 // 460
                                                                                                                      //
    return middleware;                                                                                                //
  }();                                                                                                                //
                                                                                                                      //
  return Cookies;                                                                                                     //
}(__cookies);                                                                                                         //
                                                                                                                      //
if (Meteor.isServer) {                                                                                                // 463
  Cookies.isLoadedOnServer = false;                                                                                   // 464
} /* Export the Cookies class */                                                                                      // 465
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("./node_modules/meteor/ostrio:cookies/cookies.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['ostrio:cookies'] = exports;

})();

//# sourceMappingURL=ostrio_cookies.js.map
