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
var __coffeescriptShare, Cookies;

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:cookies":{"cookies.coffee.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/ostrio_cookies/cookies.coffee.js                                                                       //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
module.export({Cookies:function(){return Cookies}});                                                               //
/*                                                                                                                 //
@url https://github.com/jshttp/cookie/blob/master/index.js                                                         //
@name cookie                                                                                                       //
@author jshttp                                                                                                     //
@license                                                                                                           //
(The MIT License)                                                                                                  //
                                                                                                                   //
Copyright (c) 2012-2014 Roman Shtylman <shtylman@gmail.com>                                                        //
Copyright (c) 2015 Douglas Christopher Wilson <doug@somethingdoug.com>                                             //
                                                                                                                   //
Permission is hereby granted, free of charge, to any person obtaining                                              //
a copy of this software and associated documentation files (the                                                    //
'Software'), to deal in the Software without restriction, including                                                //
without limitation the rights to use, copy, modify, merge, publish,                                                //
distribute, sublicense, and/or sell copies of the Software, and to                                                 //
permit persons to whom the Software is furnished to do so, subject to                                              //
the following conditions:                                                                                          //
                                                                                                                   //
The above copyright notice and this permission notice shall be                                                     //
included in all copies or substantial portions of the Software.                                                    //
                                                                                                                   //
THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,                                                    //
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF                                                 //
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.                                             //
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY                                               //
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,                                               //
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE                                                  //
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                                                             //
 */                                                                                                                //
var __cookies,                                                                                                     //
    __middlewareHandler,                                                                                           //
    decode,                                                                                                        //
    encode,                                                                                                        //
    fieldContentRegExp,                                                                                            //
    pairSplitRegExp,                                                                                               //
    parse,                                                                                                         //
    serialize,                                                                                                     //
    tryDecode,                                                                                                     //
    extend = function extend(child, parent) {                                                                      //
  for (var key in meteorBabelHelpers.sanitizeForInObject(parent)) {                                                //
    if (hasProp.call(parent, key)) child[key] = parent[key];                                                       //
  }function ctor() {                                                                                               //
    this.constructor = child;                                                                                      //
  }ctor.prototype = parent.prototype;child.prototype = new ctor();child.__super__ = parent.prototype;return child;
},                                                                                                                 //
    hasProp = {}.hasOwnProperty;                                                                                   //
                                                                                                                   //
decode = decodeURIComponent;                                                                                       //
                                                                                                                   //
encode = encodeURIComponent;                                                                                       //
                                                                                                                   //
pairSplitRegExp = /; */;                                                                                           //
                                                                                                                   //
/*                                                                                                                 //
RegExp to match field-content in RFC 7230 sec 3.2                                                                  //
                                                                                                                   //
field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]                                                        //
field-vchar   = VCHAR / obs-text                                                                                   //
obs-text      = %x80-FF                                                                                            //
 */                                                                                                                //
                                                                                                                   //
fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;                                                      //
                                                                                                                   //
/*                                                                                                                 //
@function                                                                                                          //
@name parse                                                                                                        //
@param {String} str                                                                                                //
@param {Object} [options]                                                                                          //
@return {Object}                                                                                                   //
@summary                                                                                                           //
Parse a cookie header.                                                                                             //
Parse the given cookie header string into an object                                                                //
The object has the various cookies as keys(names) => values                                                        //
@private                                                                                                           //
 */                                                                                                                //
                                                                                                                   //
parse = function parse(str, options) {                                                                             //
  var dec, obj, opt, pairs;                                                                                        //
  if (typeof str !== 'string') {                                                                                   //
    throw new TypeError('argument str must be a string');                                                          //
  }                                                                                                                //
  obj = {};                                                                                                        //
  opt = options || {};                                                                                             //
  pairs = str.split(pairSplitRegExp);                                                                              //
  dec = opt.decode || decode;                                                                                      //
  pairs.forEach(function (pair) {                                                                                  //
    var eq_idx, key, val;                                                                                          //
    eq_idx = pair.indexOf('=');                                                                                    //
    if (eq_idx < 0) {                                                                                              //
      return;                                                                                                      //
    }                                                                                                              //
    key = pair.substr(0, eq_idx).trim();                                                                           //
    val = pair.substr(++eq_idx, pair.length).trim();                                                               //
    if ('"' === val[0]) {                                                                                          //
      val = val.slice(1, -1);                                                                                      //
    }                                                                                                              //
    if (void 0 === obj[key]) {                                                                                     //
      obj[key] = tryDecode(val, dec);                                                                              //
    }                                                                                                              //
  });                                                                                                              //
  return obj;                                                                                                      //
};                                                                                                                 //
                                                                                                                   //
/*                                                                                                                 //
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
serialize = function serialize(name, val, opt) {                                                                   //
  var maxAge, pairs, value;                                                                                        //
  if (opt == null) {                                                                                               //
    opt = {};                                                                                                      //
  }                                                                                                                //
  if (!fieldContentRegExp.test(name)) {                                                                            //
    throw new TypeError('argument name is invalid');                                                               //
  }                                                                                                                //
  if (!_.isUndefined(val)) {                                                                                       //
    value = encode(val);                                                                                           //
    if (value && !fieldContentRegExp.test(value)) {                                                                //
      throw new TypeError('argument val is invalid');                                                              //
    }                                                                                                              //
  } else {                                                                                                         //
    value = '';                                                                                                    //
  }                                                                                                                //
  pairs = [name + '=' + value];                                                                                    //
  if (opt.maxAge) {                                                                                                //
    maxAge = opt.maxAge - 0;                                                                                       //
    if (isNaN(maxAge)) {                                                                                           //
      throw new Error('maxAge should be a Number');                                                                //
    }                                                                                                              //
    pairs.push('Max-Age=' + maxAge);                                                                               //
  }                                                                                                                //
  if (opt.domain) {                                                                                                //
    if (!fieldContentRegExp.test(opt.domain)) {                                                                    //
      throw new TypeError('option domain is invalid');                                                             //
    }                                                                                                              //
    pairs.push('Domain=' + opt.domain);                                                                            //
  } else {                                                                                                         //
    pairs.push('Domain=');                                                                                         //
  }                                                                                                                //
  if (opt.path) {                                                                                                  //
    if (!fieldContentRegExp.test(opt.path)) {                                                                      //
      throw new TypeError('option path is invalid');                                                               //
    }                                                                                                              //
    pairs.push('Path=' + opt.path);                                                                                //
  } else {                                                                                                         //
    pairs.push('Path=/');                                                                                          //
  }                                                                                                                //
  opt.expires = opt.expires || opt.expire;                                                                         //
  if (opt.expires) {                                                                                               //
    if (opt.expires === 2e308) {                                                                                   //
      pairs.push('Expires=Fri, 31 Dec 9999 23:59:59 GMT');                                                         //
    } else if (opt.expires instanceof Date) {                                                                      //
      pairs.push('Expires=' + opt.expires.toUTCString());                                                          //
    } else if (_.isNumber(opt.expires)) {                                                                          //
      pairs.push('Expires=' + new Date(opt.expires).toUTCString());                                                //
    }                                                                                                              //
  }                                                                                                                //
  if (opt.httpOnly) {                                                                                              //
    pairs.push('HttpOnly');                                                                                        //
  }                                                                                                                //
  if (opt.secure) {                                                                                                //
    pairs.push('Secure');                                                                                          //
  }                                                                                                                //
  if (opt.firstPartyOnly) {                                                                                        //
    pairs.push('First-Party-Only');                                                                                //
  }                                                                                                                //
  return pairs.join('; ');                                                                                         //
};                                                                                                                 //
                                                                                                                   //
/*                                                                                                                 //
@function                                                                                                          //
@name tryDecode                                                                                                    //
@param {String} str                                                                                                //
@param {Function} decode                                                                                           //
@summary Try decoding a string using a decoding function.                                                          //
@private                                                                                                           //
 */                                                                                                                //
                                                                                                                   //
tryDecode = function tryDecode(str, decode) {                                                                      //
  var e;                                                                                                           //
  try {                                                                                                            //
    return decode(str);                                                                                            //
  } catch (error) {                                                                                                //
    e = error;                                                                                                     //
    return str;                                                                                                    //
  }                                                                                                                //
};                                                                                                                 //
                                                                                                                   //
/*                                                                                                                 //
@locus Anywhere                                                                                                    //
@class __cookies                                                                                                   //
@param _cookies {Object|String} - Current cookies as String or Object                                              //
@param TTL {Number} - Default cookies expiration time (max-age) in milliseconds, by default - 31 day               //
@param runOnServer {Boolean} - Expose Cookies class to Server                                                      //
@param response {http.ServerResponse|Object} - This object is created internally by a HTTP server                  //
@summary Internal Class                                                                                            //
 */                                                                                                                //
                                                                                                                   //
__cookies = function () {                                                                                          //
  function __cookies(_cookies, TTL, runOnServer, response) {                                                       //
    this.TTL = TTL;                                                                                                //
    this.runOnServer = runOnServer;                                                                                //
    this.response = response;                                                                                      //
    if (_.isObject(_cookies)) {                                                                                    //
      this.cookies = _cookies;                                                                                     //
    } else {                                                                                                       //
      this.cookies = parse(_cookies);                                                                              //
    }                                                                                                              //
  }                                                                                                                //
                                                                                                                   //
  /*                                                                                                               //
  @locus Anywhere                                                                                                  //
  @memberOf __cookies                                                                                              //
  @name get                                                                                                        //
  @param {String} key  - The name of the cookie to read                                                            //
  @param {String} _tmp - Unparsed string instead of user's cookies                                                 //
  @summary Read a cookie. If the cookie doesn't exist a null value will be returned.                               //
  @returns {String|null}                                                                                           //
   */                                                                                                              //
                                                                                                                   //
  __cookies.prototype.get = function (key, _tmp) {                                                                 //
    var _cs;                                                                                                       //
    _cs = _tmp ? parse(_tmp) : this.cookies;                                                                       //
    if (!key || !_cs) {                                                                                            //
      return null;                                                                                                 //
    } else {                                                                                                       //
      if (!_.isUndefined(_cs != null ? _cs[key] : void 0)) {                                                       //
        return _cs[key];                                                                                           //
      } else {                                                                                                     //
        return null;                                                                                               //
      }                                                                                                            //
    }                                                                                                              //
  };                                                                                                               //
                                                                                                                   //
  /*                                                                                                               //
  @locus Anywhere                                                                                                  //
  @memberOf __cookies                                                                                              //
  @name set                                                                                                        //
  @param {String}  key          - The name of the cookie to create/overwrite                                       //
  @param {String}  value        - The value of the cookie                                                          //
  @param {Number}  opts.expires - [Optional] The max-age in seconds (e.g. 31536e3                                  //
  for a year, Infinity for a never-expires cookie), or the expires date in                                         //
  GMTString format or as Date object; if not specified the cookie will                                             //
  expire at the end of session (number – finite or Infinity – string, Date object or null).                        //
  @param {String}  opts.path    - [Optional] The path from where the cookie will be                                //
  readable. E.g., "/", "/mydir"; if not specified, defaults to the current                                         //
  path of the current document location (string or null). The path must be                                         //
  absolute (see RFC 2965). For more information on how to use relative paths                                       //
  in this argument, see: https://developer.mozilla.org/en-US/docs/Web/API/document.cookie#Using_relative_URLs_in_the_path_parameter
  @param {String}  opts.domain   - [Optional] The domain from where the cookie will                                //
  be readable. E.g., "example.com", ".example.com" (includes all subdomains)                                       //
  or "subdomain.example.com"; if not specified, defaults to the host portion                                       //
  of the current document location (string or null).                                                               //
  @param {Boolean} opts.secure  - [Optional] The cookie will be transmitted only                                   //
  over secure protocol as https (boolean or null).                                                                 //
  @summary Create/overwrite a cookie.                                                                              //
  @returns {Boolean}                                                                                               //
   */                                                                                                              //
                                                                                                                   //
  __cookies.prototype.set = function (key, value, opts) {                                                          //
    var newCookie;                                                                                                 //
    if (opts == null) {                                                                                            //
      opts = {};                                                                                                   //
    }                                                                                                              //
    if (key && !_.isUndefined(value)) {                                                                            //
      if (opts.expires == null) {                                                                                  //
        opts.expires = new Date(+new Date() + this.TTL);                                                           //
      }                                                                                                            //
      if (opts.path == null) {                                                                                     //
        opts.path = '/';                                                                                           //
      }                                                                                                            //
      if (opts.domain == null) {                                                                                   //
        opts.domain = '';                                                                                          //
      }                                                                                                            //
      if (opts.secure == null) {                                                                                   //
        opts.secure = '';                                                                                          //
      }                                                                                                            //
      newCookie = serialize(key, value, opts);                                                                     //
      this.cookies[key] = value;                                                                                   //
      if (Meteor.isClient) {                                                                                       //
        document.cookie = newCookie;                                                                               //
      } else {                                                                                                     //
        this.response.setHeader('Set-Cookie', newCookie);                                                          //
      }                                                                                                            //
      return true;                                                                                                 //
    } else {                                                                                                       //
      return false;                                                                                                //
    }                                                                                                              //
  };                                                                                                               //
                                                                                                                   //
  /*                                                                                                               //
  @locus Anywhere                                                                                                  //
  @memberOf __cookies                                                                                              //
  @name remove                                                                                                     //
  @param {String} key    - The name of the cookie to create/overwrite                                              //
  @param {String} path   - [Optional] The path from where the cookie will be                                       //
  readable. E.g., "/", "/mydir"; if not specified, defaults to the current                                         //
  path of the current document location (string or null). The path must be                                         //
  absolute (see RFC 2965). For more information on how to use relative paths                                       //
  in this argument, see: https://developer.mozilla.org/en-US/docs/Web/API/document.cookie#Using_relative_URLs_in_the_path_parameter
  @param {String} domain - [Optional] The domain from where the cookie will                                        //
  be readable. E.g., "example.com", ".example.com" (includes all subdomains)                                       //
  or "subdomain.example.com"; if not specified, defaults to the host portion                                       //
  of the current document location (string or null).                                                               //
  @summary Remove a cookie(s).                                                                                     //
  @returns {Boolean}                                                                                               //
   */                                                                                                              //
                                                                                                                   //
  __cookies.prototype.remove = function (key, path, domain) {                                                      //
    var i, k, len, newCookie, ref;                                                                                 //
    if (path == null) {                                                                                            //
      path = '/';                                                                                                  //
    }                                                                                                              //
    if (domain == null) {                                                                                          //
      domain = '';                                                                                                 //
    }                                                                                                              //
    if (key) {                                                                                                     //
      newCookie = serialize(key, '', {                                                                             //
        domain: domain,                                                                                            //
        path: path,                                                                                                //
        expires: new Date(0)                                                                                       //
      });                                                                                                          //
      if (!this.has(key)) {                                                                                        //
        return false;                                                                                              //
      }                                                                                                            //
      delete this.cookies[key];                                                                                    //
      if (Meteor.isClient) {                                                                                       //
        document.cookie = newCookie;                                                                               //
      } else {                                                                                                     //
        this.response.setHeader('Set-Cookie', newCookie);                                                          //
      }                                                                                                            //
      return true;                                                                                                 //
    } else if (this.keys().length > 0 && this.keys()[0] !== "") {                                                  //
      ref = this.keys();                                                                                           //
      for (i = 0, len = ref.length; i < len; i++) {                                                                //
        k = ref[i];                                                                                                //
        this.remove(k);                                                                                            //
      }                                                                                                            //
      return true;                                                                                                 //
    } else {                                                                                                       //
      return false;                                                                                                //
    }                                                                                                              //
  };                                                                                                               //
                                                                                                                   //
  /*                                                                                                               //
  @locus Anywhere                                                                                                  //
  @memberOf __cookies                                                                                              //
  @name has                                                                                                        //
  @param {String} key  - The name of the cookie to create/overwrite                                                //
  @param {String} _tmp - Unparsed string instead of user's cookies                                                 //
  @summary Check whether a cookie exists in the current position.                                                  //
  @returns {Boolean}                                                                                               //
   */                                                                                                              //
                                                                                                                   //
  __cookies.prototype.has = function (key, _tmp) {                                                                 //
    var _cs;                                                                                                       //
    _cs = _tmp ? parse(_tmp) : this.cookies;                                                                       //
    if (!key || !_cs) {                                                                                            //
      return false;                                                                                                //
    } else {                                                                                                       //
      return _.has(_cs, key);                                                                                      //
    }                                                                                                              //
  };                                                                                                               //
                                                                                                                   //
  /*                                                                                                               //
  @locus Anywhere                                                                                                  //
  @memberOf __cookies                                                                                              //
  @name keys                                                                                                       //
  @summary Returns an array of all readable cookies from this location.                                            //
  @returns {[String]}                                                                                              //
   */                                                                                                              //
                                                                                                                   //
  __cookies.prototype.keys = function () {                                                                         //
    if (this.cookies) {                                                                                            //
      return Object.keys(this.cookies);                                                                            //
    } else {                                                                                                       //
      return [];                                                                                                   //
    }                                                                                                              //
  };                                                                                                               //
                                                                                                                   //
  /*                                                                                                               //
  @locus Client                                                                                                    //
  @memberOf __cookies                                                                                              //
  @name send                                                                                                       //
  @param cb {Function} - Callback                                                                                  //
  @summary Send all cookies over XHR to server.                                                                    //
  @returns {void}                                                                                                  //
   */                                                                                                              //
                                                                                                                   //
  __cookies.prototype.send = Meteor.isClient ? function (cb) {                                                     //
    if (this.runOnServer) {                                                                                        //
      if (!cb) {                                                                                                   //
        cb = function cb() {};                                                                                     //
      }                                                                                                            //
      HTTP.get((__meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '') + '/___cookie___/set', cb);                  //
    } else {                                                                                                       //
      throw new Meteor.Error('400', 'Can\'t send cookies on server when `runOnServer` is false.');                 //
    }                                                                                                              //
  } : void 0;                                                                                                      //
                                                                                                                   //
  return __cookies;                                                                                                //
}();                                                                                                               //
                                                                                                                   //
/*                                                                                                                 //
@function                                                                                                          //
@locus Server                                                                                                      //
@summary Middleware handler                                                                                        //
@private                                                                                                           //
 */                                                                                                                //
                                                                                                                   //
__middlewareHandler = function __middlewareHandler(req, res, self) {                                               //
  var _cookies, ref;                                                                                               //
  if (self.runOnServer) {                                                                                          //
    if ((ref = req.headers) != null ? ref.cookie : void 0) {                                                       //
      _cookies = parse(req.headers.cookie);                                                                        //
    } else {                                                                                                       //
      _cookies = {};                                                                                               //
    }                                                                                                              //
    return new __cookies(_cookies, self.TTL, self.runOnServer, res);                                               //
  } else {                                                                                                         //
    throw new Meteor.Error('400', 'Can\'t use middleware when `runOnServer` is false.');                           //
  }                                                                                                                //
};                                                                                                                 //
                                                                                                                   //
/*                                                                                                                 //
@locus Anywhere                                                                                                    //
@class Cookies                                                                                                     //
@param opts {Object}                                                                                               //
@param opts.TTL {Number} - Default cookies expiration time (max-age) in milliseconds, by default - 31 day          //
@param opts.auto {Boolean} - [Server] Auto-bind in middleware as `req.Cookies`, by default `true`                  //
@param opts.handler {Function} - [Server] Middleware handler                                                       //
@param opts.runOnServer {Boolean} - Expose Cookies class to Server                                                 //
@summary Main Cookie class                                                                                         //
 */                                                                                                                //
                                                                                                                   //
module.runModuleSetters(Cookies = function (superClass) {                                                          //
  extend(Cookies, superClass);                                                                                     //
                                                                                                                   //
  function Cookies(opts) {                                                                                         //
    var self;                                                                                                      //
    if (opts == null) {                                                                                            //
      opts = {};                                                                                                   //
    }                                                                                                              //
    this.runOnServer = opts.runOnServer, this.handler = opts.handler, this.TTL = opts.TTL, this.auto = opts.auto;  //
    if (this.runOnServer == null) {                                                                                //
      this.runOnServer = opts.runOnServer || true;                                                                 //
    }                                                                                                              //
    if (this.TTL == null) {                                                                                        //
      this.TTL = opts.TTL || 1000 * 60 * 60 * 24 * 31;                                                             //
    }                                                                                                              //
    if (Meteor.isServer) {                                                                                         //
      if (this.runOnServer) {                                                                                      //
        if (this.auto == null) {                                                                                   //
          this.auto = true;                                                                                        //
        }                                                                                                          //
        if (this.handler == null) {                                                                                //
          this.handler = function (c) {};                                                                          //
        }                                                                                                          //
        if (!Cookies.isLoadedOnServer) {                                                                           //
          if (this.auto) {                                                                                         //
            self = this;                                                                                           //
            WebApp.connectHandlers.use(function (req, res, next) {                                                 //
              if (!!~req._parsedUrl.path.indexOf('/___cookie___/set')) {                                           //
                res.setHeader('Set-Cookie', req.headers.cookie);                                                   //
                res.writeHead(200);                                                                                //
                res.end('');                                                                                       //
              } else {                                                                                             //
                req.Cookies = __middlewareHandler(req, res, self);                                                 //
                next();                                                                                            //
              }                                                                                                    //
            });                                                                                                    //
          }                                                                                                        //
          Cookies.isLoadedOnServer = true;                                                                         //
        }                                                                                                          //
      }                                                                                                            //
    } else {                                                                                                       //
      Cookies.__super__.constructor.call(this, document.cookie, this.TTL, this.runOnServer);                       //
    }                                                                                                              //
  }                                                                                                                //
                                                                                                                   //
  /*                                                                                                               //
  @locus Server                                                                                                    //
  @memberOf Cookies                                                                                                //
  @name middleware                                                                                                 //
  @summary Get Cookies instance into callback                                                                      //
  @returns {void}                                                                                                  //
   */                                                                                                              //
                                                                                                                   //
  Cookies.prototype.middleware = Meteor.isServer ? function () {                                                   //
    var self;                                                                                                      //
    self = this;                                                                                                   //
    return function (req, res, next) {                                                                             //
      var _cookie;                                                                                                 //
      _cookie = __middlewareHandler(req, res, self);                                                               //
      self.handler && self.handler(_cookie);                                                                       //
      next();                                                                                                      //
    };                                                                                                             //
  } : void 0;                                                                                                      //
                                                                                                                   //
  return Cookies;                                                                                                  //
}(__cookies));                                                                                                     //
                                                                                                                   //
if (Meteor.isServer) {                                                                                             //
  Cookies.isLoadedOnServer = false;                                                                                //
}                                                                                                                  //
                                                                                                                   //
/*                                                                                                                 //
Export the Cookies class                                                                                           //
 */                                                                                                                //
                                                                                                                   //
                                                                                                                   //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{"extensions":[".js",".json",".coffee"]});
var exports = require("./node_modules/meteor/ostrio:cookies/cookies.coffee.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['ostrio:cookies'] = exports, {
  Cookies: Cookies
});

})();
