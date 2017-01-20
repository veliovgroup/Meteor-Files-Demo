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
var parse, serialize, value, tryDecode, __middlewareHandler, Cookies;

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:cookies":{"cookies.js":["babel-runtime/helpers/possibleConstructorReturn","babel-runtime/helpers/inherits","babel-runtime/helpers/classCallCheck",function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_cookies/cookies.js                                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({Cookies:function(){return Cookies}});var _possibleConstructorReturn;module.import('babel-runtime/helpers/possibleConstructorReturn',{"default":function(v){_possibleConstructorReturn=v}});var _inherits;module.import('babel-runtime/helpers/inherits',{"default":function(v){_inherits=v}});var _classCallCheck;module.import('babel-runtime/helpers/classCallCheck',{"default":function(v){_classCallCheck=v}});
                                                                                                                       //
                                                                                                                       //
var NoOp = function NoOp() {};                                                                                         // 1
/*                                                                                                                     // 2
@url https://github.com/jshttp/cookie/blob/master/index.js                                                             //
@name cookie                                                                                                           //
@author jshttp                                                                                                         //
@license                                                                                                               //
(The MIT License)                                                                                                      //
                                                                                                                       //
Copyright (c) 2012-2014 Roman Shtylman <shtylman@gmail.com>                                                            //
Copyright (c) 2015 Douglas Christopher Wilson <doug@somethingdoug.com>                                                 //
                                                                                                                       //
Permission is hereby granted, free of charge, to any person obtaining                                                  //
a copy of this software and associated documentation files (the                                                        //
'Software'), to deal in the Software without restriction, including                                                    //
without limitation the rights to use, copy, modify, merge, publish,                                                    //
distribute, sublicense, and/or sell copies of the Software, and to                                                     //
permit persons to whom the Software is furnished to do so, subject to                                                  //
the following conditions:                                                                                              //
                                                                                                                       //
The above copyright notice and this permission notice shall be                                                         //
included in all copies or substantial portions of the Software.                                                        //
                                                                                                                       //
THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,                                                        //
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF                                                     //
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.                                                 //
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY                                                   //
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,                                                   //
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE                                                      //
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                                                                 //
 */                                                                                                                    //
var decode = decodeURIComponent;                                                                                       // 31
var encode = encodeURIComponent;                                                                                       // 32
var pairSplitRegExp = /; */;                                                                                           // 33
                                                                                                                       //
/*                                                                                                                     // 35
RegExp to match field-content in RFC 7230 sec 3.2                                                                      //
                                                                                                                       //
field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]                                                            //
field-vchar   = VCHAR / obs-text                                                                                       //
obs-text      = %x80-FF                                                                                                //
 */                                                                                                                    //
var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;                                                      // 42
                                                                                                                       //
/*                                                                                                                     // 44
@function                                                                                                              //
@name parse                                                                                                            //
@param {String} str                                                                                                    //
@param {Object} [options]                                                                                              //
@return {Object}                                                                                                       //
@summary                                                                                                               //
Parse a cookie header.                                                                                                 //
Parse the given cookie header string into an object                                                                    //
The object has the various cookies as keys(names) => values                                                            //
@private                                                                                                               //
 */                                                                                                                    //
parse = function parse(str, options) {                                                                                 // 56
  if (typeof str !== 'string') {                                                                                       // 57
    throw new TypeError('argument str must be a string');                                                              // 58
  }                                                                                                                    // 59
  var obj = {};                                                                                                        // 60
  var opt = options || {};                                                                                             // 61
  var val = void 0,                                                                                                    // 62
      key = void 0,                                                                                                    // 62
      eqIndx = void 0;                                                                                                 // 62
  str.split(pairSplitRegExp).forEach(function (pair) {                                                                 // 63
    eqIndx = pair.indexOf('=');                                                                                        // 64
    if (eqIndx < 0) {                                                                                                  // 65
      return;                                                                                                          // 66
    }                                                                                                                  // 67
    key = pair.substr(0, eqIndx).trim();                                                                               // 68
    val = pair.substr(++eqIndx, pair.length).trim();                                                                   // 69
    if (val[0] === '"') {                                                                                              // 70
      val = val.slice(1, -1);                                                                                          // 71
    }                                                                                                                  // 72
    if (void 0 === obj[key]) {                                                                                         // 73
      obj[key] = tryDecode(val, opt.decode || decode);                                                                 // 74
    }                                                                                                                  // 75
  });                                                                                                                  // 76
  return obj;                                                                                                          // 77
};                                                                                                                     // 78
                                                                                                                       //
/*                                                                                                                     // 80
@function                                                                                                              //
@name serialize                                                                                                        //
@param {String} name                                                                                                   //
@param {String} val                                                                                                    //
@param {Object} [options]                                                                                              //
@return {String}                                                                                                       //
@summary                                                                                                               //
Serialize data into a cookie header.                                                                                   //
Serialize the a name value pair into a cookie string suitable for                                                      //
http headers. An optional options object specified cookie parameters.                                                  //
serialize('foo', 'bar', { httpOnly: true })                                                                            //
  => "foo=bar; httpOnly"                                                                                               //
@private                                                                                                               //
 */                                                                                                                    //
serialize = function serialize(name, val) {                                                                            // 95
  var opt = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};                                    // 95
                                                                                                                       //
  if (!fieldContentRegExp.test(name)) {                                                                                // 96
    throw new TypeError('argument name is invalid');                                                                   // 97
  }                                                                                                                    // 98
                                                                                                                       //
  if (!_.isUndefined(val)) {                                                                                           // 100
    value = encode(val);                                                                                               // 101
    if (value && !fieldContentRegExp.test(value)) {                                                                    // 102
      throw new TypeError('argument val is invalid');                                                                  // 103
    }                                                                                                                  // 104
  } else {                                                                                                             // 105
    value = '';                                                                                                        // 106
  }                                                                                                                    // 107
                                                                                                                       //
  var pairs = [name + '=' + value];                                                                                    // 109
                                                                                                                       //
  if (_.isNumber(opt.maxAge)) {                                                                                        // 111
    pairs.push('Max-Age=' + opt.maxAge);                                                                               // 112
  }                                                                                                                    // 113
                                                                                                                       //
  if (opt.domain && _.isString(opt.domain)) {                                                                          // 115
    if (!fieldContentRegExp.test(opt.domain)) {                                                                        // 116
      throw new TypeError('option domain is invalid');                                                                 // 117
    }                                                                                                                  // 118
    pairs.push('Domain=' + opt.domain);                                                                                // 119
  }                                                                                                                    // 120
                                                                                                                       //
  if (opt.path && _.isString(opt.path)) {                                                                              // 122
    if (!fieldContentRegExp.test(opt.path)) {                                                                          // 123
      throw new TypeError('option path is invalid');                                                                   // 124
    }                                                                                                                  // 125
    pairs.push('Path=' + opt.path);                                                                                    // 126
  }                                                                                                                    // 127
                                                                                                                       //
  opt.expires = opt.expires || opt.expire || false;                                                                    // 129
  if (opt.expires === Infinity) {                                                                                      // 130
    pairs.push('Expires=Fri, 31 Dec 9999 23:59:59 GMT');                                                               // 131
  } else if (opt.expires instanceof Date) {                                                                            // 132
    pairs.push('Expires=' + opt.expires.toUTCString());                                                                // 133
  } else if (opt.expires === 0) {                                                                                      // 134
    pairs.push('Expires=0');                                                                                           // 135
  } else if (_.isNumber(opt.expires)) {                                                                                // 136
    pairs.push('Expires=' + new Date(opt.expires).toUTCString());                                                      // 137
  }                                                                                                                    // 138
                                                                                                                       //
  if (opt.httpOnly) {                                                                                                  // 140
    pairs.push('HttpOnly');                                                                                            // 141
  }                                                                                                                    // 142
                                                                                                                       //
  if (opt.secure) {                                                                                                    // 144
    pairs.push('Secure');                                                                                              // 145
  }                                                                                                                    // 146
                                                                                                                       //
  if (opt.firstPartyOnly) {                                                                                            // 148
    pairs.push('First-Party-Only');                                                                                    // 149
  }                                                                                                                    // 150
                                                                                                                       //
  if (opt.sameSite) {                                                                                                  // 152
    pairs.push('SameSite');                                                                                            // 153
  }                                                                                                                    // 154
  return pairs.join('; ');                                                                                             // 155
};                                                                                                                     // 156
                                                                                                                       //
/*                                                                                                                     // 159
@function                                                                                                              //
@name tryDecode                                                                                                        //
@param {String} str                                                                                                    //
@param {Function} d                                                                                                    //
@summary Try decoding a string using a decoding function.                                                              //
@private                                                                                                               //
 */                                                                                                                    //
tryDecode = function tryDecode(str, d) {                                                                               // 167
  try {                                                                                                                // 168
    return d(str);                                                                                                     // 169
  } catch (e) {                                                                                                        // 170
    return str;                                                                                                        // 171
  }                                                                                                                    // 172
};                                                                                                                     // 173
                                                                                                                       //
/*                                                                                                                     // 176
@locus Anywhere                                                                                                        //
@class __cookies                                                                                                       //
@param _cookies {Object|String} - Current cookies as String or Object                                                  //
@param TTL {Number} - Default cookies expiration time (max-age) in milliseconds, by default - session (false)          //
@param runOnServer {Boolean} - Expose Cookies class to Server                                                          //
@param response {http.ServerResponse|Object} - This object is created internally by a HTTP server                      //
@summary Internal Class                                                                                                //
 */                                                                                                                    //
                                                                                                                       //
var __cookies = function () {                                                                                          //
  function __cookies(_cookies, TTL, runOnServer, response) {                                                           // 186
    _classCallCheck(this, __cookies);                                                                                  // 186
                                                                                                                       //
    this.TTL = TTL;                                                                                                    // 187
    this.response = response;                                                                                          // 188
    this.runOnServer = runOnServer;                                                                                    // 189
                                                                                                                       //
    if (_.isObject(_cookies)) {                                                                                        // 191
      this.cookies = _cookies;                                                                                         // 192
    } else {                                                                                                           // 193
      this.cookies = parse(_cookies);                                                                                  // 194
    }                                                                                                                  // 195
  }                                                                                                                    // 196
                                                                                                                       //
  /*                                                                                                                   // 198
  @locus Anywhere                                                                                                      //
  @memberOf __cookies                                                                                                  //
  @name get                                                                                                            //
  @param {String} key  - The name of the cookie to read                                                                //
  @param {String} _tmp - Unparsed string instead of user's cookies                                                     //
  @summary Read a cookie. If the cookie doesn't exist a null value will be returned.                                   //
  @returns {String|void}                                                                                               //
   */                                                                                                                  //
                                                                                                                       //
                                                                                                                       //
  __cookies.prototype.get = function () {                                                                              //
    function get(key, _tmp) {                                                                                          //
      var _cs = _tmp ? parse(_tmp) : this.cookies;                                                                     // 208
      if (!key || !_cs) {                                                                                              // 209
        return void 0;                                                                                                 // 210
      }                                                                                                                // 211
                                                                                                                       //
      if (_cs.hasOwnProperty(key)) {                                                                                   // 213
        return _cs[key];                                                                                               // 214
      }                                                                                                                // 215
                                                                                                                       //
      return void 0;                                                                                                   // 217
    }                                                                                                                  // 218
                                                                                                                       //
    return get;                                                                                                        //
  }();                                                                                                                 //
                                                                                                                       //
  /*                                                                                                                   // 220
  @locus Anywhere                                                                                                      //
  @memberOf __cookies                                                                                                  //
  @name set                                                                                                            //
  @param {String}  key   - The name of the cookie to create/overwrite                                                  //
  @param {String}  value - The value of the cookie                                                                     //
  @param {Object}  opts  - [Optional] Cookie options (see readme docs)                                                 //
  @summary Create/overwrite a cookie.                                                                                  //
  @returns {Boolean}                                                                                                   //
   */                                                                                                                  //
                                                                                                                       //
                                                                                                                       //
  __cookies.prototype.set = function () {                                                                              //
    function set(key, value) {                                                                                         //
      var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};                               // 230
                                                                                                                       //
      if (key && !_.isUndefined(value)) {                                                                              // 231
        if (_.isNumber(this.TTL) && opts.expires === undefined) {                                                      // 232
          opts.expires = new Date(+new Date() + this.TTL);                                                             // 233
        }                                                                                                              // 234
        var newCookie = serialize(key, value, opts);                                                                   // 235
        this.cookies[key] = value;                                                                                     // 236
        if (Meteor.isClient) {                                                                                         // 237
          document.cookie = newCookie;                                                                                 // 238
        } else {                                                                                                       // 239
          this.response.setHeader('Set-Cookie', newCookie);                                                            // 240
        }                                                                                                              // 241
        return true;                                                                                                   // 242
      }                                                                                                                // 243
      return false;                                                                                                    // 244
    }                                                                                                                  // 245
                                                                                                                       //
    return set;                                                                                                        //
  }();                                                                                                                 //
                                                                                                                       //
  /*                                                                                                                   // 247
  @locus Anywhere                                                                                                      //
  @memberOf __cookies                                                                                                  //
  @name remove                                                                                                         //
  @param {String} key    - The name of the cookie to create/overwrite                                                  //
  @param {String} path   - [Optional] The path from where the cookie will be                                           //
  readable. E.g., "/", "/mydir"; if not specified, defaults to the current                                             //
  path of the current document location (string or null). The path must be                                             //
  absolute (see RFC 2965). For more information on how to use relative paths                                           //
  in this argument, see: https://developer.mozilla.org/en-US/docs/Web/API/document.cookie#Using_relative_URLs_in_the_path_parameter
  @param {String} domain - [Optional] The domain from where the cookie will                                            //
  be readable. E.g., "example.com", ".example.com" (includes all subdomains)                                           //
  or "subdomain.example.com"; if not specified, defaults to the host portion                                           //
  of the current document location (string or null).                                                                   //
  @summary Remove a cookie(s).                                                                                         //
  @returns {Boolean}                                                                                                   //
   */                                                                                                                  //
                                                                                                                       //
                                                                                                                       //
  __cookies.prototype.remove = function () {                                                                           //
    function remove(key) {                                                                                             //
      var path = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '/';                              // 264
      var domain = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';                             // 264
                                                                                                                       //
      if (key && this.cookies.hasOwnProperty(key)) {                                                                   // 265
        var newCookie = serialize(key, '', {                                                                           // 266
          domain: domain,                                                                                              // 267
          path: path,                                                                                                  // 268
          expires: new Date(0)                                                                                         // 269
        });                                                                                                            // 266
                                                                                                                       //
        delete this.cookies[key];                                                                                      // 272
        if (Meteor.isClient) {                                                                                         // 273
          document.cookie = newCookie;                                                                                 // 274
        } else {                                                                                                       // 275
          this.response.setHeader('Set-Cookie', newCookie);                                                            // 276
        }                                                                                                              // 277
        return true;                                                                                                   // 278
      } else if (!key && this.keys().length > 0 && this.keys()[0] !== '') {                                            // 279
        var keys = Object.keys(this.cookies);                                                                          // 280
        for (var i = 0; i < keys.length; i++) {                                                                        // 281
          this.remove(keys[i]);                                                                                        // 282
        }                                                                                                              // 283
        return true;                                                                                                   // 284
      }                                                                                                                // 285
      return false;                                                                                                    // 286
    }                                                                                                                  // 287
                                                                                                                       //
    return remove;                                                                                                     //
  }();                                                                                                                 //
                                                                                                                       //
  /*                                                                                                                   // 289
  @locus Anywhere                                                                                                      //
  @memberOf __cookies                                                                                                  //
  @name has                                                                                                            //
  @param {String} key  - The name of the cookie to create/overwrite                                                    //
  @param {String} _tmp - Unparsed string instead of user's cookies                                                     //
  @summary Check whether a cookie exists in the current position.                                                      //
  @returns {Boolean}                                                                                                   //
   */                                                                                                                  //
                                                                                                                       //
                                                                                                                       //
  __cookies.prototype.has = function () {                                                                              //
    function has(key, _tmp) {                                                                                          //
      var _cs = _tmp ? parse(_tmp) : this.cookies;                                                                     // 299
      if (!key || !_cs) {                                                                                              // 300
        return false;                                                                                                  // 301
      }                                                                                                                // 302
                                                                                                                       //
      return _cs.hasOwnProperty(key);                                                                                  // 304
    }                                                                                                                  // 305
                                                                                                                       //
    return has;                                                                                                        //
  }();                                                                                                                 //
                                                                                                                       //
  /*                                                                                                                   // 307
  @locus Anywhere                                                                                                      //
  @memberOf __cookies                                                                                                  //
  @name keys                                                                                                           //
  @summary Returns an array of all readable cookies from this location.                                                //
  @returns {[String]}                                                                                                  //
   */                                                                                                                  //
                                                                                                                       //
                                                                                                                       //
  __cookies.prototype.keys = function () {                                                                             //
    function keys() {                                                                                                  //
      if (this.cookies) {                                                                                              // 315
        return Object.keys(this.cookies);                                                                              // 316
      }                                                                                                                // 317
      return [];                                                                                                       // 318
    }                                                                                                                  // 319
                                                                                                                       //
    return keys;                                                                                                       //
  }();                                                                                                                 //
                                                                                                                       //
  /*                                                                                                                   // 321
  @locus Client                                                                                                        //
  @memberOf __cookies                                                                                                  //
  @name send                                                                                                           //
  @param cb {Function} - Callback                                                                                      //
  @summary Send all cookies over XHR to server.                                                                        //
  @returns {void}                                                                                                      //
   */                                                                                                                  //
                                                                                                                       //
                                                                                                                       //
  __cookies.prototype.send = function () {                                                                             //
    function send() {                                                                                                  //
      var cb = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : NoOp;                               // 329
                                                                                                                       //
      if (Meteor.isServer) {                                                                                           // 330
        cb(new Meteor.Error(400, 'Can\'t run `.send()` on server, it\'s Client only method!'));                        // 331
      }                                                                                                                // 332
                                                                                                                       //
      if (this.runOnServer) {                                                                                          // 334
        HTTP.get((__meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '') + '/___cookie___/set', cb);                    // 335
      } else {                                                                                                         // 336
        cb(new Meteor.Error(400, 'Can\'t send cookies on server when `runOnServer` is false.'));                       // 337
      }                                                                                                                // 338
      return void 0;                                                                                                   // 339
    }                                                                                                                  // 340
                                                                                                                       //
    return send;                                                                                                       //
  }();                                                                                                                 //
                                                                                                                       //
  return __cookies;                                                                                                    //
}();                                                                                                                   //
                                                                                                                       //
/*                                                                                                                     // 344
@function                                                                                                              //
@locus Server                                                                                                          //
@summary Middleware handler                                                                                            //
@private                                                                                                               //
 */                                                                                                                    //
                                                                                                                       //
                                                                                                                       //
__middlewareHandler = function __middlewareHandler(req, res, self) {                                                   // 350
  var _cookies = {};                                                                                                   // 351
  if (self.runOnServer) {                                                                                              // 352
    if (req.headers && req.headers.cookie) {                                                                           // 353
      _cookies = parse(req.headers.cookie);                                                                            // 354
    }                                                                                                                  // 355
    return new __cookies(_cookies, self.TTL, self.runOnServer, res);                                                   // 356
  }                                                                                                                    // 357
                                                                                                                       //
  throw new Meteor.Error(400, 'Can\'t use middleware when `runOnServer` is false.');                                   // 359
};                                                                                                                     // 360
                                                                                                                       //
/*                                                                                                                     // 363
@locus Anywhere                                                                                                        //
@class Cookies                                                                                                         //
@param opts {Object}                                                                                                   //
@param opts.TTL {Number} - Default cookies expiration time (max-age) in milliseconds, by default - session (false)     //
@param opts.auto {Boolean} - [Server] Auto-bind in middleware as `req.Cookies`, by default `true`                      //
@param opts.handler {Function} - [Server] Middleware handler                                                           //
@param opts.runOnServer {Boolean} - Expose Cookies class to Server                                                     //
@summary Main Cookie class                                                                                             //
 */                                                                                                                    //
                                                                                                                       //
var Cookies = function (_cookies2) {                                                                                   //
  _inherits(Cookies, _cookies2);                                                                                       //
                                                                                                                       //
  function Cookies() {                                                                                                 // 374
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};                                 // 374
                                                                                                                       //
    _classCallCheck(this, Cookies);                                                                                    // 374
                                                                                                                       //
    opts.TTL = _.isNumber(opts.TTL) ? opts.TTL : false;                                                                // 375
    opts.runOnServer = opts.runOnServer !== false ? true : false;                                                      // 376
                                                                                                                       //
    if (Meteor.isClient) {                                                                                             // 378
      var _this = _possibleConstructorReturn(this, _cookies2.call(this, document.cookie, opts.TTL, opts.runOnServer));
    } else {                                                                                                           // 380
      var _this = _possibleConstructorReturn(this, _cookies2.call(this, {}, opts.TTL, opts.runOnServer));              // 380
                                                                                                                       //
      opts.auto = opts.auto !== false ? true : false;                                                                  // 382
      _this.handler = opts.handler || function () {};                                                                  // 383
      _this.runOnServer = opts.runOnServer;                                                                            // 384
      if (_this.runOnServer) {                                                                                         // 385
        if (!Cookies.isLoadedOnServer) {                                                                               // 386
          if (opts.auto) {                                                                                             // 387
            WebApp.connectHandlers.use(function (req, res, next) {                                                     // 388
              if (!!~req._parsedUrl.path.indexOf('/___cookie___/set')) {                                               // 389
                if (req.headers && req.headers.cookie) {                                                               // 390
                  var _cObj = parse(req.headers.cookie);                                                               // 391
                  var _cArr = [];                                                                                      // 392
                  var _cStr = void 0;                                                                                  // 393
                  for (var _cKey in meteorBabelHelpers.sanitizeForInObject(_cObj)) {                                   // 394
                    _cStr = serialize(_cKey, _cObj[_cKey]);                                                            // 395
                    if (!~_cArr.indexOf(_cStr)) {                                                                      // 396
                      _cArr.push(_cStr);                                                                               // 397
                    }                                                                                                  // 398
                  }                                                                                                    // 399
                  res.setHeader('Set-Cookie', _cArr);                                                                  // 400
                }                                                                                                      // 401
                                                                                                                       //
                res.writeHead(200);                                                                                    // 403
                res.end('');                                                                                           // 404
              } else {                                                                                                 // 405
                req.Cookies = __middlewareHandler(req, res, _this);                                                    // 406
                next();                                                                                                // 407
              }                                                                                                        // 408
            });                                                                                                        // 409
          }                                                                                                            // 410
          Cookies.isLoadedOnServer = true;                                                                             // 411
        }                                                                                                              // 412
      }                                                                                                                // 413
    }                                                                                                                  // 414
    return _possibleConstructorReturn(_this);                                                                          // 374
  }                                                                                                                    // 415
                                                                                                                       //
  /*                                                                                                                   // 418
  @locus Server                                                                                                        //
  @memberOf Cookies                                                                                                    //
  @name middleware                                                                                                     //
  @summary Get Cookies instance into callback                                                                          //
  @returns {void}                                                                                                      //
   */                                                                                                                  //
                                                                                                                       //
                                                                                                                       //
  Cookies.prototype.middleware = function () {                                                                         //
    function middleware() {                                                                                            //
      var _this2 = this;                                                                                               // 425
                                                                                                                       //
      if (!Meteor.isServer) {                                                                                          // 426
        console.error('[ostrio:cookies] Can\'t use `.middleware()` on Client, it\'s Server only!');                    // 427
        return NoOp;                                                                                                   // 428
      }                                                                                                                // 429
                                                                                                                       //
      return function (req, res, next) {                                                                               // 431
        _this2.handler && _this2.handler(__middlewareHandler(req, res, _this2));                                       // 432
        next();                                                                                                        // 433
      };                                                                                                               // 434
    }                                                                                                                  // 435
                                                                                                                       //
    return middleware;                                                                                                 //
  }();                                                                                                                 //
                                                                                                                       //
  return Cookies;                                                                                                      //
}(__cookies);                                                                                                          //
                                                                                                                       //
if (Meteor.isServer) {                                                                                                 // 438
  Cookies.isLoadedOnServer = false;                                                                                    // 439
}                                                                                                                      // 440
                                                                                                                       //
/* Export the Cookies class */                                                                                         // 442
                                                                                                                       // 443
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
