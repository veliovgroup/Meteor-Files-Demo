"use strict";
/*
@url https://github.com/jshttp/cookie/blob/master/index.js
@name cookie
@author jshttp
@license
(The MIT License)
Copyright (c) 2012-2014 Roman Shtylman <shtylman@gmail.com>
Copyright (c) 2015 Douglas Christopher Wilson <doug@somethingdoug.com>
Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:
The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var decode = decodeURIComponent;
var encode = encodeURIComponent;
var pairSplitRegExp = /; */;


/*
RegExp to match field-content in RFC 7230 sec 3.2
field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
field-vchar   = VCHAR / obs-text
obs-text      = %x80-FF
 */
var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;


/*
@function
@name parse
@param {String} str
@param {Object} [options]
@return {Object}
@summary
Parse a cookie header.
Parse the given cookie header string into an object
The object has the various cookies as keys(names) => values
@private
 */
var parse = function(str, options) {
  var dec, obj, opt, pairs;
  if (typeof str !== 'string') {
    throw new TypeError('argument str must be a string');
  }
  obj = {};
  opt = options || {};
  pairs = str.split(pairSplitRegExp);
  dec = opt.decode || decode;
  pairs.forEach(function(pair) {
    var eq_idx, key, val;
    eq_idx = pair.indexOf('=');
    if (eq_idx < 0) {
      return;
    }
    key = pair.substr(0, eq_idx).trim();
    val = pair.substr(++eq_idx, pair.length).trim();
    if ('"' === val[0]) {
      val = val.slice(1, -1);
    }
    if (void 0 === obj[key]) {
      obj[key] = tryDecode(val, dec);
    }
  });
  return obj;
};


/*
@function
@name serialize
@param {String} name
@param {String} val
@param {Object} [options]
@return {String}
@summary
Serialize data into a cookie header.
Serialize the a name value pair into a cookie string suitable for
http headers. An optional options object specified cookie parameters.
serialize('foo', 'bar', { httpOnly: true })
  => "foo=bar; httpOnly"
@private
 */
var serialize = function(name, val, opt) {
  var maxAge, pairs, value;
  if (opt == null) {
    opt = {};
  }
  if (!fieldContentRegExp.test(name)) {
    throw new TypeError('argument name is invalid');
  }
  if (!(typeof value === 'undefined' || value === null)) {
    value = encode(val);
    if (value && !fieldContentRegExp.test(value)) {
      throw new TypeError('argument val is invalid');
    }
  } else {
    value = '';
  }
  pairs = [name + '=' + value];
  if (opt.maxAge) {
    maxAge = opt.maxAge - 0;
    if (isNaN(maxAge)) {
      throw new Error('maxAge should be a Number');
    }
    pairs.push('Max-Age=' + maxAge);
  }
  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new TypeError('option domain is invalid');
    }
    pairs.push('Domain=' + opt.domain);
  } else {
    pairs.push('Domain=');
  }
  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new TypeError('option path is invalid');
    }
    pairs.push('Path=' + opt.path);
  } else {
    pairs.push('Path=/');
  }
  opt.expires = opt.expires || opt.expire;
  if (opt.expires) {
    if (opt.expires === Infinity) {
      pairs.push('Expires=Fri, 31 Dec 9999 23:59:59 GMT');
    } else if (opt.expires instanceof Date) {
      pairs.push('Expires=' + opt.expires.toUTCString());
    } else if (!isNaN(parseFloat(opt.expires)) && isFinite(opt.expires)) {
      pairs.push('Expires=' + (new Date(opt.expires)).toUTCString());
    }
  }
  if (opt.httpOnly) {
    pairs.push('HttpOnly');
  }
  if (opt.secure) {
    pairs.push('Secure');
  }
  if (opt.firstPartyOnly) {
    pairs.push('First-Party-Only');
  }
  return pairs.join('; ');
};


/*
@function
@name tryDecode
@param {String} str
@param {Function} decode
@summary Try decoding a string using a decoding function.
@private
 */
var tryDecode = function(str, decode) {
  try {
    return decode(str);
  } catch (e) {
    return str;
  }
};


/*
@locus Anywhere
@class __cookies
@param _cookies {Object|String} - Current cookies as String or Object
@summary Internal Class
 */
var __cookies = (function() {
  function __cookies(_cookies) {
    this.cookies = parse(_cookies);
  }


  /*
  @locus Anywhere
  @memberOf __cookies
  @name get
  @param {String} key  - The name of the cookie to read
  @param {String} _tmp - Unparsed string instead of user's cookies
  @summary Read a cookie. If the cookie doesn't exist a null value will be returned.
  @returns {String|null}
   */
  __cookies.prototype.get = function(key, _tmp) {
    var _cs = _tmp ? parse(_tmp) : this.cookies;
    if (!key || !_cs) {
      return null;
    } else {
      if (!(typeof _cs[key] === 'undefined')) {
        return _cs[key];
      } else {
        return null;
      }
    }
  };


  /*
  @locus Anywhere
  @memberOf __cookies
  @name set
  @param {String}  key          - The name of the cookie to create/overwrite
  @param {String}  value        - The value of the cookie
  @param {Number}  opts.expires - [Optional] The max-age in seconds (e.g. 31536e3
  for a year, Infinity for a never-expires cookie), or the expires date in
  GMTString format or as Date object; if not specified the cookie will
  expire at the end of session (number – finite or Infinity – string, Date object or null).
  @param {String}  opts.path    - [Optional] The path from where the cookie will be
  readable. E.g., "/", "/mydir"; if not specified, defaults to the current
  path of the current document location (string or null). The path must be
  absolute (see RFC 2965). For more information on how to use relative paths
  in this argument, see: https://developer.mozilla.org/en-US/docs/Web/API/document.cookie#Using_relative_URLs_in_the_path_parameter
  @param {String}  opts.domain   - [Optional] The domain from where the cookie will
  be readable. E.g., "example.com", ".example.com" (includes all subdomains)
  or "subdomain.example.com"; if not specified, defaults to the host portion
  of the current document location (string or null).
  @param {Boolean} opts.secure  - [Optional] The cookie will be transmitted only
  over secure protocol as https (boolean or null).
  @summary Create/overwrite a cookie.
  @returns {Boolean}
   */
  __cookies.prototype.set = function(key, value, opts) {
    if (opts == null) {
      opts = {};
    }
    if (key && !(typeof value === 'undefined')) {
      if (opts.expires == null) {
        opts.expires = new Date((+(new Date)) + this.TTL);
      }
      if (opts.path == null) {
        opts.path = '/';
      }
      if (opts.domain == null) {
        opts.domain = '';
      }
      if (opts.secure == null) {
        opts.secure = '';
      }
      var newCookie = serialize(key, value, opts);
      this.cookies[key] = value;
      document.cookie = newCookie;
      return true;
    } else {
      return false;
    }
  };


  /*
  @locus Anywhere
  @memberOf __cookies
  @name remove
  @param {String} key    - The name of the cookie to create/overwrite
  @param {String} path   - [Optional] The path from where the cookie will be
  readable. E.g., "/", "/mydir"; if not specified, defaults to the current
  path of the current document location (string or null). The path must be
  absolute (see RFC 2965). For more information on how to use relative paths
  in this argument, see: https://developer.mozilla.org/en-US/docs/Web/API/document.cookie#Using_relative_URLs_in_the_path_parameter
  @param {String} domain - [Optional] The domain from where the cookie will
  be readable. E.g., "example.com", ".example.com" (includes all subdomains)
  or "subdomain.example.com"; if not specified, defaults to the host portion
  of the current document location (string or null).
  @summary Remove a cookie(s).
  @returns {Boolean}
   */
  __cookies.prototype.remove = function(key, path, domain) {
    var k, keys = this.keys();
    if (path == null) {
      path = '/';
    }
    if (domain == null) {
      domain = '';
    }
    if (key) {
      var newCookie = serialize(key, '', {
        domain: domain,
        path: path,
        expires: new Date(0)
      });
      if (!this.has(key)) {
        return false;
      }
      delete this.cookies[key];
      document.cookie = newCookie;
      return true;
    } else if (keys.length > 0 && keys[0] !== "") {
      var i, len;
      for (i = 0, len = keys.length; i < len; i++) {
        k = keys[i];
        this.remove(k);
      }
      return true;
    } else {
      return false;
    }
  };


  /*
  @locus Anywhere
  @memberOf __cookies
  @name has
  @param {String} key  - The name of the cookie to create/overwrite
  @param {String} _tmp - Unparsed string instead of user's cookies
  @summary Check whether a cookie exists in the current position.
  @returns {Boolean}
   */
  __cookies.prototype.has = function(key, _tmp) {
    var _cs = _tmp ? parse(_tmp) : this.cookies;
    if (!key || !_cs) {
      return false;
    } else {
      return !(typeof _cs[key] === 'undefined');
    }
  };


  /*
  @locus Anywhere
  @memberOf __cookies
  @name keys
  @summary Returns an array of all readable cookies from this location.
  @returns {[String]}
   */
  __cookies.prototype.keys = function() {
    if (this.cookies) {
      return Object.keys(this.cookies);
    } else {
      return [];
    }
  };
  return __cookies;
})();

/*
@locus Client
@class clientStorage
@param driver {Sting} - Preferable driver `localStorage` or `cookies`
@summary Implement boilerplate Client storage functions, localStorage with fall-back to Cookies
 */
var clientStorage = (function() {
  function clientStorage(driver) {
    if (driver == null) {
      driver = null;
    }
    this._data = {};
    if (navigator.cookieEnabled) {
      this.cookies = new __cookies(document.cookie);
    } else {
      this.cookies = false;
    }
    if (driver === null) {
      if (this.LSSupport) {
        this.ls = window.localStorage || localStorage;
      } else {
        this.ls = null;
      }
    } else if (driver === 'localStorage') {
      if (this.LSSupport) {
        this.ls = window.localStorage || localStorage;
      } else {
        console.warn('ClientStorage is set to "localStorage", but it is not supported on this browser');
      }
    } else if (driver === 'cookies') {
      if (this.cookies) {
        this.LSSupport = false;
        this.ls = null;
      } else {
        console.warn('ClientStorage is set to "cookies", but Cookies is disabled on this browser');
      }
    } else {
      console.warn('Wrong ClientStorage driver!');
    }
  }


  /*
  @function
  @memberOf clientStorage
  @name get
  @param {String} key - The name of the stored record to read
  @summary Read a record. If the record doesn't exist a null value will be returned.
  @returns {mixed}
   */
  clientStorage.prototype.get = function(key) {
    if (this.LSSupport) {
      return this._prepare(this.ls.getItem(key));
    } else if (this.cookies) {
      return this._prepare(this.cookies.get(key));
    } else {
      return this._prepare(this._data[key]);
    }
  };


  /*
  @function
  @memberOf clientStorage
  @name set
  @param {String} key   - The name of the key to create/overwrite
  @param {mixed}  value - The value
  @summary Create/overwrite a value in storage.
  @returns {Boolean}
   */
  clientStorage.prototype.set = function(key, value) {
    if (this.LSSupport) {
      this.ls.setItem(key, this._prepare(value));
    } else if (this.cookies) {
      this.cookies.set(key, this._prepare(value), null, null, false, null);
    } else {
      this._data[key] = this._prepare(value);
    }
    return true;
  };


  /*
  @function
  @memberOf clientStorage
  @name remove
  @param {String} key - The name of the record to create/overwrite
  @summary Remove a record.
  @returns {Boolean}
   */
  clientStorage.prototype.remove = function(key) {
    if (key && this.has(key)) {
      if (this.LSSupport) {
        this.ls.removeItem(key);
        return true;
      } else if (this.cookies) {
        return this.cookies.remove(key, null, window.location.host);
      } else {
        delete this._data[key];
        return true;
      }
    } else {
      return false;
    }
  };


  /*
  @function
  @memberOf clientStorage
  @name has
  @param {String} key - The name of the record to check
  @summary Check if record exists
  @returns {Boolean}
   */
  clientStorage.prototype.has = function(key) {
    if (this.LSSupport) {
      return !!this.ls.getItem(key);
    } else if (this.cookies) {
      return this.cookies.has(key);
    } else {
      return this._data.hasOwnProperty(key);
    }
  };


  /*
  @function
  @memberOf clientStorage
  @name keys
  @summary Returns all storage keys
  @returns {[String]]}
   */
  clientStorage.prototype.keys = function() {
    if (this.LSSupport) {
      var i = this.ls.length;
      var results = [];
      while (i--) {
        results.push(this.ls.key(i));
      }
      return results;
    } else if (this.cookies) {
      return this.cookies.keys();
    } else {
      return Object.keys(this._data);
    }
  };


  /*
  @function
  @memberOf clientStorage
  @name empty
  @summary Empty storage (remove all key/value pairs)
  @returns {Boolean}
   */
  clientStorage.prototype.empty = function() {
    if (this.LSSupport && this.ls.length > 0) {
      var self = this;
      this.keys().forEach(function(key) {
        return self.remove(key);
      });
      return true;
    } else if (this.cookies) {
      return this.cookies.remove();
    } else if (Object.keys(this._data).length) {
      this._data = {};
      return true;
    } else {
      return false;
    }
  };


  /*
  @function
  @memberOf clientStorage
  @name _prepare
  @param {mix} value - Value to prepare
  @summary Stringify objects and parse strings
   */
  clientStorage.prototype._prepare = function(value) {
    var type = typeof value;
    if (type === 'function' || type === 'object' && !!value) {
      return JSON.stringify(value);
    } else {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
  };


  /*
  @memberOf clientStorage
  @name LSSupport
  @summary Test browser for localStorage support
   */
  clientStorage.prototype.LSSupport = (function() {
    var support;
    try {
      support = "localStorage" in window && window.localStorage !== null;
      if (support) {
        window.localStorage.setItem('___test___', 'test');
        window.localStorage.removeItem('___test___');
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  })();
  return clientStorage;
})();

module.exports.clientStorage = clientStorage;
module.exports.ClientStorage = new clientStorage();