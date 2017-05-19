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

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:cookies":{"cookies.js":["babel-runtime/helpers/possibleConstructorReturn","babel-runtime/helpers/inherits","babel-runtime/helpers/classCallCheck","meteor/underscore","meteor/meteor","meteor/webapp","meteor/http",function(require,exports,module){

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
module.importSync("meteor/underscore", {                                                                              // 1
  _: function (v) {                                                                                                   // 1
    _ = v;                                                                                                            // 1
  }                                                                                                                   // 1
}, 0);                                                                                                                // 1
var Meteor = void 0;                                                                                                  // 1
module.importSync("meteor/meteor", {                                                                                  // 1
  Meteor: function (v) {                                                                                              // 1
    Meteor = v;                                                                                                       // 1
  }                                                                                                                   // 1
}, 1);                                                                                                                // 1
                                                                                                                      //
if (Meteor.isServer) {                                                                                                // 4
  var _WebApp = void 0;                                                                                               // 1
                                                                                                                      //
  module.importSync("meteor/webapp", {                                                                                // 1
    WebApp: function (v) {                                                                                            // 1
      _WebApp = v;                                                                                                    // 1
    }                                                                                                                 // 1
  }, 2);                                                                                                              // 1
} else {                                                                                                              // 6
  var _HTTP = void 0;                                                                                                 // 1
                                                                                                                      //
  module.importSync("meteor/http", {                                                                                  // 1
    HTTP: function (v) {                                                                                              // 1
      _HTTP = v;                                                                                                      // 1
    }                                                                                                                 // 1
  }, 3);                                                                                                              // 1
}                                                                                                                     // 8
                                                                                                                      //
var NoOp = function () {};                                                                                            // 10
                                                                                                                      //
var urlRE = /\/___cookie___\/set/; /*                                                                                 // 11
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
var decode = decodeURIComponent;                                                                                      // 41
var encode = encodeURIComponent;                                                                                      // 42
var pairSplitRegExp = /; */; /*                                                                                       // 43
                             RegExp to match field-content in RFC 7230 sec 3.2                                        //
                                                                                                                      //
                             field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]                              //
                             field-vchar   = VCHAR / obs-text                                                         //
                             obs-text      = %x80-FF                                                                  //
                              */                                                                                      //
var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/; /*                                                  // 52
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
var parse = function (str, options) {                                                                                 // 66
  if (typeof str !== 'string') {                                                                                      // 67
    throw new Meteor.Error(404, 'argument str must be a string');                                                     // 68
  }                                                                                                                   // 69
                                                                                                                      //
  var obj = {};                                                                                                       // 70
  var opt = options || {};                                                                                            // 71
  var val = void 0;                                                                                                   // 72
  var key = void 0;                                                                                                   // 73
  var eqIndx = void 0;                                                                                                // 74
  str.split(pairSplitRegExp).forEach(function (pair) {                                                                // 76
    eqIndx = pair.indexOf('=');                                                                                       // 77
                                                                                                                      //
    if (eqIndx < 0) {                                                                                                 // 78
      return;                                                                                                         // 79
    }                                                                                                                 // 80
                                                                                                                      //
    key = pair.substr(0, eqIndx).trim();                                                                              // 81
    val = pair.substr(++eqIndx, pair.length).trim();                                                                  // 82
                                                                                                                      //
    if (val[0] === '"') {                                                                                             // 83
      val = val.slice(1, -1);                                                                                         // 84
    }                                                                                                                 // 85
                                                                                                                      //
    if (void 0 === obj[key]) {                                                                                        // 86
      obj[key] = tryDecode(val, opt.decode || decode);                                                                // 87
    }                                                                                                                 // 88
  });                                                                                                                 // 89
  return obj;                                                                                                         // 90
}; /*                                                                                                                 // 91
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
var serialize = function (key, val) {                                                                                 // 108
  var opt = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};                                   // 108
  var name = void 0;                                                                                                  // 109
                                                                                                                      //
  if (!fieldContentRegExp.test(key)) {                                                                                // 111
    name = escape(key);                                                                                               // 112
  } else {                                                                                                            // 113
    name = key;                                                                                                       // 114
  }                                                                                                                   // 115
                                                                                                                      //
  var value = void 0;                                                                                                 // 117
                                                                                                                      //
  if (!_.isUndefined(val)) {                                                                                          // 118
    value = encode(val);                                                                                              // 119
                                                                                                                      //
    if (value && !fieldContentRegExp.test(value)) {                                                                   // 120
      value = escape(value);                                                                                          // 121
    }                                                                                                                 // 122
  } else {                                                                                                            // 123
    value = '';                                                                                                       // 124
  }                                                                                                                   // 125
                                                                                                                      //
  var pairs = [name + "=" + value];                                                                                   // 127
                                                                                                                      //
  if (_.isNumber(opt.maxAge)) {                                                                                       // 129
    pairs.push("Max-Age=" + opt.maxAge);                                                                              // 130
  }                                                                                                                   // 131
                                                                                                                      //
  if (opt.domain && _.isString(opt.domain)) {                                                                         // 133
    if (!fieldContentRegExp.test(opt.domain)) {                                                                       // 134
      throw new Meteor.Error(404, 'option domain is invalid');                                                        // 135
    }                                                                                                                 // 136
                                                                                                                      //
    pairs.push("Domain=" + opt.domain);                                                                               // 137
  }                                                                                                                   // 138
                                                                                                                      //
  if (opt.path && _.isString(opt.path)) {                                                                             // 140
    if (!fieldContentRegExp.test(opt.path)) {                                                                         // 141
      throw new Meteor.Error(404, 'option path is invalid');                                                          // 142
    }                                                                                                                 // 143
                                                                                                                      //
    pairs.push("Path=" + opt.path);                                                                                   // 144
  }                                                                                                                   // 145
                                                                                                                      //
  opt.expires = opt.expires || opt.expire || false;                                                                   // 147
                                                                                                                      //
  if (opt.expires === Infinity) {                                                                                     // 148
    pairs.push('Expires=Fri, 31 Dec 9999 23:59:59 GMT');                                                              // 149
  } else if (opt.expires instanceof Date) {                                                                           // 150
    pairs.push("Expires=" + opt.expires.toUTCString());                                                               // 151
  } else if (opt.expires === 0) {                                                                                     // 152
    pairs.push('Expires=0');                                                                                          // 153
  } else if (_.isNumber(opt.expires)) {                                                                               // 154
    pairs.push("Expires=" + new Date(opt.expires).toUTCString());                                                     // 155
  }                                                                                                                   // 156
                                                                                                                      //
  if (opt.httpOnly) {                                                                                                 // 158
    pairs.push('HttpOnly');                                                                                           // 159
  }                                                                                                                   // 160
                                                                                                                      //
  if (opt.secure) {                                                                                                   // 162
    pairs.push('Secure');                                                                                             // 163
  }                                                                                                                   // 164
                                                                                                                      //
  if (opt.firstPartyOnly) {                                                                                           // 166
    pairs.push('First-Party-Only');                                                                                   // 167
  }                                                                                                                   // 168
                                                                                                                      //
  if (opt.sameSite) {                                                                                                 // 170
    pairs.push('SameSite');                                                                                           // 171
  }                                                                                                                   // 172
                                                                                                                      //
  return pairs.join('; ');                                                                                            // 174
}; /*                                                                                                                 // 175
   @function                                                                                                          //
   @name tryDecode                                                                                                    //
   @param {String} str                                                                                                //
   @param {Function} d                                                                                                //
   @summary Try decoding a string using a decoding function.                                                          //
   @private                                                                                                           //
    */                                                                                                                //
                                                                                                                      //
var tryDecode = function (str, d) {                                                                                   // 186
  try {                                                                                                               // 187
    return d(str);                                                                                                    // 188
  } catch (e) {                                                                                                       // 189
    return str;                                                                                                       // 190
  }                                                                                                                   // 191
}; /*                                                                                                                 // 192
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
  function __cookies(_cookies, TTL, runOnServer, response) {                                                          // 205
    (0, _classCallCheck3.default)(this, __cookies);                                                                   // 205
    this.TTL = TTL;                                                                                                   // 206
    this.response = response;                                                                                         // 207
    this.runOnServer = runOnServer;                                                                                   // 208
                                                                                                                      //
    if (_.isObject(_cookies)) {                                                                                       // 210
      this.cookies = _cookies;                                                                                        // 211
    } else {                                                                                                          // 212
      this.cookies = parse(_cookies);                                                                                 // 213
    }                                                                                                                 // 214
  } /*                                                                                                                // 215
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
      var _cs = _tmp ? parse(_tmp) : this.cookies;                                                                    // 227
                                                                                                                      //
      if (!key || !_cs) {                                                                                             // 228
        return void 0;                                                                                                // 229
      }                                                                                                               // 230
                                                                                                                      //
      if (_cs.hasOwnProperty(key)) {                                                                                  // 232
        return _cs[key];                                                                                              // 233
      }                                                                                                               // 234
                                                                                                                      //
      return void 0;                                                                                                  // 236
    }                                                                                                                 // 237
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
      var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};                              // 249
                                                                                                                      //
      if (key && !_.isUndefined(value)) {                                                                             // 250
        if (_.isNumber(this.TTL) && opts.expires === undefined) {                                                     // 251
          opts.expires = new Date(+new Date() + this.TTL);                                                            // 252
        }                                                                                                             // 253
                                                                                                                      //
        var newCookie = serialize(key, value, opts);                                                                  // 254
        this.cookies[key] = value;                                                                                    // 255
                                                                                                                      //
        if (Meteor.isClient) {                                                                                        // 256
          document.cookie = newCookie;                                                                                // 257
        } else {                                                                                                      // 258
          this.response.setHeader('Set-Cookie', newCookie);                                                           // 259
        }                                                                                                             // 260
                                                                                                                      //
        return true;                                                                                                  // 261
      }                                                                                                               // 262
                                                                                                                      //
      return false;                                                                                                   // 263
    }                                                                                                                 // 264
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
      var path = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '/';                             // 283
      var domain = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';                            // 283
                                                                                                                      //
      if (key && this.cookies.hasOwnProperty(key)) {                                                                  // 284
        var newCookie = serialize(key, '', {                                                                          // 285
          domain: domain,                                                                                             // 286
          path: path,                                                                                                 // 287
          expires: new Date(0)                                                                                        // 288
        });                                                                                                           // 285
        delete this.cookies[key];                                                                                     // 291
                                                                                                                      //
        if (Meteor.isClient) {                                                                                        // 292
          document.cookie = newCookie;                                                                                // 293
        } else {                                                                                                      // 294
          this.response.setHeader('Set-Cookie', newCookie);                                                           // 295
        }                                                                                                             // 296
                                                                                                                      //
        return true;                                                                                                  // 297
      } else if (!key && this.keys().length > 0 && this.keys()[0] !== '') {                                           // 298
        var keys = Object.keys(this.cookies);                                                                         // 299
                                                                                                                      //
        for (var i = 0; i < keys.length; i++) {                                                                       // 300
          this.remove(keys[i]);                                                                                       // 301
        }                                                                                                             // 302
                                                                                                                      //
        return true;                                                                                                  // 303
      }                                                                                                               // 304
                                                                                                                      //
      return false;                                                                                                   // 305
    }                                                                                                                 // 306
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
      var _cs = _tmp ? parse(_tmp) : this.cookies;                                                                    // 318
                                                                                                                      //
      if (!key || !_cs) {                                                                                             // 319
        return false;                                                                                                 // 320
      }                                                                                                               // 321
                                                                                                                      //
      return _cs.hasOwnProperty(key);                                                                                 // 323
    }                                                                                                                 // 324
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
      if (this.cookies) {                                                                                             // 334
        return Object.keys(this.cookies);                                                                             // 335
      }                                                                                                               // 336
                                                                                                                      //
      return [];                                                                                                      // 337
    }                                                                                                                 // 338
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
      var cb = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : NoOp;                              // 348
                                                                                                                      //
      if (Meteor.isServer) {                                                                                          // 349
        cb(new Meteor.Error(400, 'Can\'t run `.send()` on server, it\'s Client only method!'));                       // 350
      }                                                                                                               // 351
                                                                                                                      //
      if (this.runOnServer) {                                                                                         // 353
        HTTP.get((window.__meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '') + "/___cookie___/set", cb);            // 354
      } else {                                                                                                        // 355
        cb(new Meteor.Error(400, 'Can\'t send cookies on server when `runOnServer` is false.'));                      // 356
      }                                                                                                               // 357
                                                                                                                      //
      return void 0;                                                                                                  // 358
    }                                                                                                                 // 359
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
var __middlewareHandler = function (req, res, self) {                                                                 // 369
  var _cookies = {};                                                                                                  // 370
                                                                                                                      //
  if (self.runOnServer) {                                                                                             // 371
    if (req.headers && req.headers.cookie) {                                                                          // 372
      _cookies = parse(req.headers.cookie);                                                                           // 373
    }                                                                                                                 // 374
                                                                                                                      //
    return new __cookies(_cookies, self.TTL, self.runOnServer, res);                                                  // 375
  }                                                                                                                   // 376
                                                                                                                      //
  throw new Meteor.Error(400, 'Can\'t use middleware when `runOnServer` is false.');                                  // 378
}; /*                                                                                                                 // 379
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
  function Cookies() {                                                                                                // 393
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};                                // 393
    (0, _classCallCheck3.default)(this, Cookies);                                                                     // 393
    opts.TTL = _.isNumber(opts.TTL) ? opts.TTL : false;                                                               // 394
    opts.runOnServer = opts.runOnServer !== false ? true : false;                                                     // 395
                                                                                                                      //
    if (Meteor.isClient) {                                                                                            // 397
      var _this = (0, _possibleConstructorReturn3.default)(this, _cookies2.call(this, document.cookie, opts.TTL, opts.runOnServer));
    } else {                                                                                                          // 399
      var _this = (0, _possibleConstructorReturn3.default)(this, _cookies2.call(this, {}, opts.TTL, opts.runOnServer));
                                                                                                                      //
      opts.auto = opts.auto !== false ? true : false;                                                                 // 401
                                                                                                                      //
      _this.handler = opts.handler || function () {};                                                                 // 402
                                                                                                                      //
      _this.runOnServer = opts.runOnServer;                                                                           // 403
                                                                                                                      //
      if (_this.runOnServer) {                                                                                        // 405
        if (!Cookies.isLoadedOnServer) {                                                                              // 406
          if (opts.auto) {                                                                                            // 407
            WebApp.connectHandlers.use(function (req, res, next) {                                                    // 408
              if (urlRE.test(req._parsedUrl.path)) {                                                                  // 409
                if (req.headers && req.headers.cookie) {                                                              // 410
                  var _cObj = parse(req.headers.cookie);                                                              // 411
                                                                                                                      //
                  var _cKeys = Object.keys(_cObj);                                                                    // 412
                                                                                                                      //
                  var _cArr = [];                                                                                     // 413
                                                                                                                      //
                  var _cStr = void 0;                                                                                 // 414
                                                                                                                      //
                  for (var i = 0; i < _cKeys.length; i++) {                                                           // 416
                    _cStr = serialize(_cKeys[i], _cObj[_cKeys[i]]);                                                   // 417
                                                                                                                      //
                    if (!~_cArr.indexOf(_cStr)) {                                                                     // 418
                      _cArr.push(_cStr);                                                                              // 419
                    }                                                                                                 // 420
                  }                                                                                                   // 421
                                                                                                                      //
                  res.setHeader('Set-Cookie', _cArr);                                                                 // 423
                }                                                                                                     // 424
                                                                                                                      //
                res.writeHead(200);                                                                                   // 426
                res.end('');                                                                                          // 427
              } else {                                                                                                // 428
                req.Cookies = __middlewareHandler(req, res, _this);                                                   // 429
                next();                                                                                               // 430
              }                                                                                                       // 431
            });                                                                                                       // 432
          }                                                                                                           // 433
                                                                                                                      //
          Cookies.isLoadedOnServer = true;                                                                            // 434
        }                                                                                                             // 435
      }                                                                                                               // 436
    }                                                                                                                 // 437
                                                                                                                      //
    return (0, _possibleConstructorReturn3.default)(_this);                                                           // 393
  } /*                                                                                                                // 438
    @locus Server                                                                                                     //
    @memberOf Cookies                                                                                                 //
    @name middleware                                                                                                  //
    @summary Get Cookies instance into callback                                                                       //
    @returns {void}                                                                                                   //
     */                                                                                                               //
                                                                                                                      //
  Cookies.prototype.middleware = function () {                                                                        //
    function middleware() {                                                                                           //
      var _this2 = this;                                                                                              // 448
                                                                                                                      //
      if (!Meteor.isServer) {                                                                                         // 449
        throw new Meteor.Error(500, '[ostrio:cookies] Can\'t use `.middleware()` on Client, it\'s Server only!');     // 450
      }                                                                                                               // 451
                                                                                                                      //
      return function (req, res, next) {                                                                              // 453
        _this2.handler && _this2.handler(__middlewareHandler(req, res, _this2));                                      // 454
        next();                                                                                                       // 455
      };                                                                                                              // 456
    }                                                                                                                 // 457
                                                                                                                      //
    return middleware;                                                                                                //
  }();                                                                                                                //
                                                                                                                      //
  return Cookies;                                                                                                     //
}(__cookies);                                                                                                         //
                                                                                                                      //
if (Meteor.isServer) {                                                                                                // 460
  Cookies.isLoadedOnServer = false;                                                                                   // 461
} /* Export the Cookies class */                                                                                      // 462
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}]}}}},{"extensions":[".js",".json"]});
var exports = require("./node_modules/meteor/ostrio:cookies/cookies.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['ostrio:cookies'] = exports;

})();

//# sourceMappingURL=ostrio_cookies.js.map
