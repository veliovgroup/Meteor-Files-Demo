(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var _ = Package.underscore._;
var WebApp = Package.webapp.WebApp;
var main = Package.webapp.main;
var WebAppInternals = Package.webapp.WebAppInternals;
var meteorInstall = Package.modules.meteorInstall;
var Buffer = Package.modules.Buffer;
var process = Package.modules.process;
var Symbol = Package['ecmascript-runtime'].Symbol;
var Map = Package['ecmascript-runtime'].Map;
var Set = Package['ecmascript-runtime'].Set;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Cookies;

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:cookies":{"cookies.js":["babel-runtime/helpers/possibleConstructorReturn","babel-runtime/helpers/inherits","babel-runtime/helpers/classCallCheck",function(require,exports,module){

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
var NoOp = function () {};                                                                                            // 1
                                                                                                                      //
var urlRE = /\/___cookie___\/set/; /*                                                                                 // 2
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
var decode = decodeURIComponent;                                                                                      // 32
var encode = encodeURIComponent;                                                                                      // 33
var pairSplitRegExp = /; */; /*                                                                                       // 34
                             RegExp to match field-content in RFC 7230 sec 3.2                                        //
                                                                                                                      //
                             field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]                              //
                             field-vchar   = VCHAR / obs-text                                                         //
                             obs-text      = %x80-FF                                                                  //
                              */                                                                                      //
var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/; /*                                                  // 43
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
var parse = function (str, options) {                                                                                 // 57
  if (typeof str !== 'string') {                                                                                      // 58
    throw new TypeError('argument str must be a string');                                                             // 59
  }                                                                                                                   // 60
                                                                                                                      //
  var obj = {};                                                                                                       // 61
  var opt = options || {};                                                                                            // 62
  var val = void 0,                                                                                                   // 63
      key = void 0,                                                                                                   // 63
      eqIndx = void 0;                                                                                                // 63
  str.split(pairSplitRegExp).forEach(function (pair) {                                                                // 64
    eqIndx = pair.indexOf('=');                                                                                       // 65
                                                                                                                      //
    if (eqIndx < 0) {                                                                                                 // 66
      return;                                                                                                         // 67
    }                                                                                                                 // 68
                                                                                                                      //
    key = pair.substr(0, eqIndx).trim();                                                                              // 69
    val = pair.substr(++eqIndx, pair.length).trim();                                                                  // 70
                                                                                                                      //
    if (val[0] === '"') {                                                                                             // 71
      val = val.slice(1, -1);                                                                                         // 72
    }                                                                                                                 // 73
                                                                                                                      //
    if (void 0 === obj[key]) {                                                                                        // 74
      obj[key] = tryDecode(val, opt.decode || decode);                                                                // 75
    }                                                                                                                 // 76
  });                                                                                                                 // 77
  return obj;                                                                                                         // 78
}; /*                                                                                                                 // 79
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
var serialize = function (name, val) {                                                                                // 96
  var opt = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};                                   // 96
                                                                                                                      //
  if (!fieldContentRegExp.test(name)) {                                                                               // 97
    throw new TypeError('argument name is invalid');                                                                  // 98
  }                                                                                                                   // 99
                                                                                                                      //
  var value = void 0;                                                                                                 // 101
                                                                                                                      //
  if (!_.isUndefined(val)) {                                                                                          // 102
    value = encode(val);                                                                                              // 103
                                                                                                                      //
    if (value && !fieldContentRegExp.test(value)) {                                                                   // 104
      throw new TypeError('argument val is invalid');                                                                 // 105
    }                                                                                                                 // 106
  } else {                                                                                                            // 107
    value = '';                                                                                                       // 108
  }                                                                                                                   // 109
                                                                                                                      //
  var pairs = [name + "=" + value];                                                                                   // 111
                                                                                                                      //
  if (_.isNumber(opt.maxAge)) {                                                                                       // 113
    pairs.push("Max-Age=" + opt.maxAge);                                                                              // 114
  }                                                                                                                   // 115
                                                                                                                      //
  if (opt.domain && _.isString(opt.domain)) {                                                                         // 117
    if (!fieldContentRegExp.test(opt.domain)) {                                                                       // 118
      throw new TypeError('option domain is invalid');                                                                // 119
    }                                                                                                                 // 120
                                                                                                                      //
    pairs.push("Domain=" + opt.domain);                                                                               // 121
  }                                                                                                                   // 122
                                                                                                                      //
  if (opt.path && _.isString(opt.path)) {                                                                             // 124
    if (!fieldContentRegExp.test(opt.path)) {                                                                         // 125
      throw new TypeError('option path is invalid');                                                                  // 126
    }                                                                                                                 // 127
                                                                                                                      //
    pairs.push("Path=" + opt.path);                                                                                   // 128
  }                                                                                                                   // 129
                                                                                                                      //
  opt.expires = opt.expires || opt.expire || false;                                                                   // 131
                                                                                                                      //
  if (opt.expires === Infinity) {                                                                                     // 132
    pairs.push('Expires=Fri, 31 Dec 9999 23:59:59 GMT');                                                              // 133
  } else if (opt.expires instanceof Date) {                                                                           // 134
    pairs.push("Expires=" + opt.expires.toUTCString());                                                               // 135
  } else if (opt.expires === 0) {                                                                                     // 136
    pairs.push('Expires=0');                                                                                          // 137
  } else if (_.isNumber(opt.expires)) {                                                                               // 138
    pairs.push("Expires=" + new Date(opt.expires).toUTCString());                                                     // 139
  }                                                                                                                   // 140
                                                                                                                      //
  if (opt.httpOnly) {                                                                                                 // 142
    pairs.push('HttpOnly');                                                                                           // 143
  }                                                                                                                   // 144
                                                                                                                      //
  if (opt.secure) {                                                                                                   // 146
    pairs.push('Secure');                                                                                             // 147
  }                                                                                                                   // 148
                                                                                                                      //
  if (opt.firstPartyOnly) {                                                                                           // 150
    pairs.push('First-Party-Only');                                                                                   // 151
  }                                                                                                                   // 152
                                                                                                                      //
  if (opt.sameSite) {                                                                                                 // 154
    pairs.push('SameSite');                                                                                           // 155
  }                                                                                                                   // 156
                                                                                                                      //
  return pairs.join('; ');                                                                                            // 157
}; /*                                                                                                                 // 158
   @function                                                                                                          //
   @name tryDecode                                                                                                    //
   @param {String} str                                                                                                //
   @param {Function} d                                                                                                //
   @summary Try decoding a string using a decoding function.                                                          //
   @private                                                                                                           //
    */                                                                                                                //
                                                                                                                      //
var tryDecode = function (str, d) {                                                                                   // 169
  try {                                                                                                               // 170
    return d(str);                                                                                                    // 171
  } catch (e) {                                                                                                       // 172
    return str;                                                                                                       // 173
  }                                                                                                                   // 174
}; /*                                                                                                                 // 175
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
  function __cookies(_cookies, TTL, runOnServer, response) {                                                          // 188
    (0, _classCallCheck3.default)(this, __cookies);                                                                   // 188
    this.TTL = TTL;                                                                                                   // 189
    this.response = response;                                                                                         // 190
    this.runOnServer = runOnServer;                                                                                   // 191
                                                                                                                      //
    if (_.isObject(_cookies)) {                                                                                       // 193
      this.cookies = _cookies;                                                                                        // 194
    } else {                                                                                                          // 195
      this.cookies = parse(_cookies);                                                                                 // 196
    }                                                                                                                 // 197
  } /*                                                                                                                // 198
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
      var _cs = _tmp ? parse(_tmp) : this.cookies;                                                                    // 210
                                                                                                                      //
      if (!key || !_cs) {                                                                                             // 211
        return void 0;                                                                                                // 212
      }                                                                                                               // 213
                                                                                                                      //
      if (_cs.hasOwnProperty(key)) {                                                                                  // 215
        return _cs[key];                                                                                              // 216
      }                                                                                                               // 217
                                                                                                                      //
      return void 0;                                                                                                  // 219
    }                                                                                                                 // 220
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
      var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};                              // 232
                                                                                                                      //
      if (key && !_.isUndefined(value)) {                                                                             // 233
        if (_.isNumber(this.TTL) && opts.expires === undefined) {                                                     // 234
          opts.expires = new Date(+new Date() + this.TTL);                                                            // 235
        }                                                                                                             // 236
                                                                                                                      //
        var newCookie = serialize(key, value, opts);                                                                  // 237
        this.cookies[key] = value;                                                                                    // 238
                                                                                                                      //
        if (Meteor.isClient) {                                                                                        // 239
          document.cookie = newCookie;                                                                                // 240
        } else {                                                                                                      // 241
          this.response.setHeader('Set-Cookie', newCookie);                                                           // 242
        }                                                                                                             // 243
                                                                                                                      //
        return true;                                                                                                  // 244
      }                                                                                                               // 245
                                                                                                                      //
      return false;                                                                                                   // 246
    }                                                                                                                 // 247
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
      var path = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '/';                             // 266
      var domain = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';                            // 266
                                                                                                                      //
      if (key && this.cookies.hasOwnProperty(key)) {                                                                  // 267
        var newCookie = serialize(key, '', {                                                                          // 268
          domain: domain,                                                                                             // 269
          path: path,                                                                                                 // 270
          expires: new Date(0)                                                                                        // 271
        });                                                                                                           // 268
        delete this.cookies[key];                                                                                     // 274
                                                                                                                      //
        if (Meteor.isClient) {                                                                                        // 275
          document.cookie = newCookie;                                                                                // 276
        } else {                                                                                                      // 277
          this.response.setHeader('Set-Cookie', newCookie);                                                           // 278
        }                                                                                                             // 279
                                                                                                                      //
        return true;                                                                                                  // 280
      } else if (!key && this.keys().length > 0 && this.keys()[0] !== '') {                                           // 281
        var keys = Object.keys(this.cookies);                                                                         // 282
                                                                                                                      //
        for (var i = 0; i < keys.length; i++) {                                                                       // 283
          this.remove(keys[i]);                                                                                       // 284
        }                                                                                                             // 285
                                                                                                                      //
        return true;                                                                                                  // 286
      }                                                                                                               // 287
                                                                                                                      //
      return false;                                                                                                   // 288
    }                                                                                                                 // 289
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
      var _cs = _tmp ? parse(_tmp) : this.cookies;                                                                    // 301
                                                                                                                      //
      if (!key || !_cs) {                                                                                             // 302
        return false;                                                                                                 // 303
      }                                                                                                               // 304
                                                                                                                      //
      return _cs.hasOwnProperty(key);                                                                                 // 306
    }                                                                                                                 // 307
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
      if (this.cookies) {                                                                                             // 317
        return Object.keys(this.cookies);                                                                             // 318
      }                                                                                                               // 319
                                                                                                                      //
      return [];                                                                                                      // 320
    }                                                                                                                 // 321
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
      var cb = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : NoOp;                              // 331
                                                                                                                      //
      if (Meteor.isServer) {                                                                                          // 332
        cb(new Meteor.Error(400, 'Can\'t run `.send()` on server, it\'s Client only method!'));                       // 333
      }                                                                                                               // 334
                                                                                                                      //
      if (this.runOnServer) {                                                                                         // 336
        HTTP.get((__meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '') + "/___cookie___/set", cb);                   // 337
      } else {                                                                                                        // 338
        cb(new Meteor.Error(400, 'Can\'t send cookies on server when `runOnServer` is false.'));                      // 339
      }                                                                                                               // 340
                                                                                                                      //
      return void 0;                                                                                                  // 341
    }                                                                                                                 // 342
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
var __middlewareHandler = function (req, res, self) {                                                                 // 352
  var _cookies = {};                                                                                                  // 353
                                                                                                                      //
  if (self.runOnServer) {                                                                                             // 354
    if (req.headers && req.headers.cookie) {                                                                          // 355
      _cookies = parse(req.headers.cookie);                                                                           // 356
    }                                                                                                                 // 357
                                                                                                                      //
    return new __cookies(_cookies, self.TTL, self.runOnServer, res);                                                  // 358
  }                                                                                                                   // 359
                                                                                                                      //
  throw new Meteor.Error(400, 'Can\'t use middleware when `runOnServer` is false.');                                  // 361
}; /*                                                                                                                 // 362
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
  function Cookies() {                                                                                                // 376
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};                                // 376
    (0, _classCallCheck3.default)(this, Cookies);                                                                     // 376
    opts.TTL = _.isNumber(opts.TTL) ? opts.TTL : false;                                                               // 377
    opts.runOnServer = opts.runOnServer !== false ? true : false;                                                     // 378
                                                                                                                      //
    if (Meteor.isClient) {                                                                                            // 380
      var _this = (0, _possibleConstructorReturn3.default)(this, _cookies2.call(this, document.cookie, opts.TTL, opts.runOnServer));
    } else {                                                                                                          // 382
      var _this = (0, _possibleConstructorReturn3.default)(this, _cookies2.call(this, {}, opts.TTL, opts.runOnServer));
                                                                                                                      //
      opts.auto = opts.auto !== false ? true : false;                                                                 // 384
                                                                                                                      //
      _this.handler = opts.handler || function () {};                                                                 // 385
                                                                                                                      //
      _this.runOnServer = opts.runOnServer;                                                                           // 386
                                                                                                                      //
      if (_this.runOnServer) {                                                                                        // 387
        if (!Cookies.isLoadedOnServer) {                                                                              // 388
          if (opts.auto) {                                                                                            // 389
            WebApp.connectHandlers.use(function (req, res, next) {                                                    // 390
              if (urlRE.test(req._parsedUrl.path)) {                                                                  // 391
                if (req.headers && req.headers.cookie) {                                                              // 392
                  var _cObj = parse(req.headers.cookie);                                                              // 393
                                                                                                                      //
                  var _cArr = [];                                                                                     // 394
                                                                                                                      //
                  var _cStr = void 0;                                                                                 // 395
                                                                                                                      //
                  for (var _cKey in meteorBabelHelpers.sanitizeForInObject(_cObj)) {                                  // 396
                    _cStr = serialize(_cKey, _cObj[_cKey]);                                                           // 397
                                                                                                                      //
                    if (!~_cArr.indexOf(_cStr)) {                                                                     // 398
                      _cArr.push(_cStr);                                                                              // 399
                    }                                                                                                 // 400
                  }                                                                                                   // 401
                                                                                                                      //
                  res.setHeader('Set-Cookie', _cArr);                                                                 // 402
                }                                                                                                     // 403
                                                                                                                      //
                res.writeHead(200);                                                                                   // 405
                res.end('');                                                                                          // 406
              } else {                                                                                                // 407
                req.Cookies = __middlewareHandler(req, res, _this);                                                   // 408
                next();                                                                                               // 409
              }                                                                                                       // 410
            });                                                                                                       // 411
          }                                                                                                           // 412
                                                                                                                      //
          Cookies.isLoadedOnServer = true;                                                                            // 413
        }                                                                                                             // 414
      }                                                                                                               // 415
    }                                                                                                                 // 416
                                                                                                                      //
    return (0, _possibleConstructorReturn3.default)(_this);                                                           // 376
  } /*                                                                                                                // 417
    @locus Server                                                                                                     //
    @memberOf Cookies                                                                                                 //
    @name middleware                                                                                                  //
    @summary Get Cookies instance into callback                                                                       //
    @returns {void}                                                                                                   //
     */                                                                                                               //
                                                                                                                      //
  Cookies.prototype.middleware = function () {                                                                        //
    function middleware() {                                                                                           //
      var _this2 = this;                                                                                              // 427
                                                                                                                      //
      if (!Meteor.isServer) {                                                                                         // 428
        console.error('[ostrio:cookies] Can\'t use `.middleware()` on Client, it\'s Server only!');                   // 429
        return NoOp;                                                                                                  // 430
      }                                                                                                               // 431
                                                                                                                      //
      return function (req, res, next) {                                                                              // 433
        _this2.handler && _this2.handler(__middlewareHandler(req, res, _this2));                                      // 434
        next();                                                                                                       // 435
      };                                                                                                              // 436
    }                                                                                                                 // 437
                                                                                                                      //
    return middleware;                                                                                                //
  }();                                                                                                                //
                                                                                                                      //
  return Cookies;                                                                                                     //
}(__cookies);                                                                                                         //
                                                                                                                      //
if (Meteor.isServer) {                                                                                                // 440
  Cookies.isLoadedOnServer = false;                                                                                   // 441
} /* Export the Cookies class */                                                                                      // 442
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}]}}}},{"extensions":[".js",".json"]});
var exports = require("./node_modules/meteor/ostrio:cookies/cookies.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['ostrio:cookies'] = exports, {
  Cookies: Cookies
});

})();

//# sourceMappingURL=ostrio_cookies.js.map
