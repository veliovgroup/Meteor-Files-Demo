'use strict';
/*
@locus Client
@class __Cookies
@param _cookies {Object|String} - Current cookies as String or Object
@summary Internal Class
 */
function __Cookies(_cookies) {
  this.cookies = {};
  if (!_cookies || typeof _cookies !== 'string') {
    _cookies = '';
  }

  if (_cookies && _cookies.length) {
    var self = this;
    var i, key, val;
    _cookies.split(/;\ */).forEach(function (pair) {
      i = pair.indexOf('=');
      if (i < 0) {
        return;
      }

      key = unescape(pair.substr(0, i).trim());
      val = pair.substr(++i, pair.length).trim();

      if (val[0] === '"') {
        val = val.slice(1, -1);
      }

      if (self.cookies[key] === void 0) {
        try {
          self.cookies[key] = unescape(val);
        } catch (e) {
          self.cookies[key] = val;
        }
      }
    });
  }
}


/*
@locus Client
@memberOf __Cookies
@name get
@param {String} key  - The name of the cookie to read
@summary Read a cookie. If the cookie doesn't exist a null value will be returned.
@returns {String|null}
 */
__Cookies.prototype.get = function(key) {
  if (!key) {
    return void 0;
  }

  if (this.cookies.hasOwnProperty(key)) {
    return this.cookies[key];
  }

  return void 0;
};


/*
@locus Client
@memberOf __Cookies
@name set
@param {String}  key   - The name of the cookie to create/overwrite
@param {String}  value - The value of the cookie
@summary Create/overwrite a cookie.
@returns {Boolean}
 */
__Cookies.prototype.set = function(key, value) {
  if (key) {
    this.cookies[key] = value;
    document.cookie = escape(key) + '=' + escape(value) + '; Expires=Fri, 31 Dec 9999 23:59:59 GMT; Path=/';
    return true;
  }
  return false;
};


/*
@locus Client
@memberOf __Cookies
@name remove
@param {String} key  - The name of the cookie to create/overwrite
@summary Remove a cookie(s).
@returns {Boolean}
 */
__Cookies.prototype.remove = function(key) {
  var keys = Object.keys(this.cookies);
  if (key) {
    if (!this.cookies.hasOwnProperty(key)) {
      return false;
    }
    delete this.cookies[key];
    document.cookie = escape(key) + '=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/';
    return true;
  } else if (keys.length > 0 && keys[0] !== '') {
    for (var i = 0; i < keys.length; i++) {
      this.remove(keys[i]);
    }
    return true;
  }
  return false;
};


/*
@locus Client
@memberOf __Cookies
@name has
@param {String} key - The name of the cookie to check
@summary Check whether a cookie key is exists
@returns {Boolean}
 */
__Cookies.prototype.has = function(key) {
  if (!key) {
    return false;
  }

  return this.cookies.hasOwnProperty(key);
};


/*
@locus Client
@memberOf __Cookies
@name keys
@summary Returns an array of all readable cookies from this location.
@returns {[String]}
 */
__Cookies.prototype.keys = function() {
  return Object.keys(this.cookies);
};

/*
@locus Client
@class ClientStorage
@param driver {Sting} - Preferable driver `localStorage` or `cookies`
@summary Implement boilerplate Client storage functions, localStorage with fall-back to Cookies
 */
function ClientStorage(driver) {
  this._data = {};
  if (navigator.cookieEnabled) {
    this.cookies = new __Cookies(document.cookie);
  } else {
    this.cookies = false;
  }

  switch (driver) {
  case 'localStorage':
    if (this.LSSupport) {
      this.ls = window.localStorage || localStorage;
    } else {
      console.warn('ClientStorage is set to "localStorage", but it is not supported on this browser');
    }
    break;
  case 'cookies':
    if (this.cookies) {
      this.LSSupport = false;
      this.ls        = null;
    } else {
      console.warn('ClientStorage is set to "cookies", but Cookies is disabled on this browser');
    }
    break;
  case 'js':
    this.cookies   = false;
    this.LSSupport = false;
    this.ls        = null;
    break;
  default:
    if (this.LSSupport) {
      this.ls = window.localStorage || localStorage;
    } else {
      this.ls = null;
    }
    break;
  }
}


/*
@function
@memberOf ClientStorage
@name get
@param {String} key - The name of the stored record to read
@summary Read a record. If the record doesn't exist a null value will be returned.
@returns {mixed}
 */
ClientStorage.prototype.get = function(key) {
  if (!this.has(key)) {
    return void 0;
  }
  if (this.LSSupport) {
    return this.__unescape(this.ls.getItem(key));
  } else if (this.cookies) {
    return this.__unescape(this.cookies.get(key));
  }
  return this._data[key];
};


/*
@function
@memberOf ClientStorage
@name set
@param {String} key   - The name of the key to create/overwrite
@param {mixed}  value - The value
@summary Create/overwrite a value in storage.
@returns {Boolean}
 */
ClientStorage.prototype.set = function(key, value) {
  if (this.LSSupport) {
    this.ls.setItem(key, this.__escape(value));
  } else if (this.cookies) {
    this.cookies.set(key, this.__escape(value));
  } else {
    this._data[key] = value;
  }
  return true;
};


/*
@function
@memberOf ClientStorage
@name remove
@param {String} key - The name of the record to create/overwrite
@summary Remove a record.
@returns {Boolean}
 */
ClientStorage.prototype.remove = function(key) {
  if (key && this.has(key)) {
    if (this.LSSupport) {
      this.ls.removeItem(key);
      return true;
    } else if (this.cookies) {
      return this.cookies.remove(key, null, window.location.host);
    }
    delete this._data[key];
    return true;
  }
  return false;
};


/*
@function
@memberOf ClientStorage
@name has
@param {String} key - The name of the record to check
@summary Check if record exists
@returns {Boolean}
 */
ClientStorage.prototype.has = function(key) {
  if (this.LSSupport) {
    return !!this.ls.getItem(key);
  } else if (this.cookies) {
    return this.cookies.has(key);
  }
  return this._data.hasOwnProperty(key);
};


/*
@function
@memberOf ClientStorage
@name keys
@summary Returns all storage keys
@returns {[String]]}
 */
ClientStorage.prototype.keys = function() {
  if (this.LSSupport) {
    var i = this.ls.length;
    var results = [];
    while (i--) {
      results.push(this.ls.key(i));
    }
    return results;
  } else if (this.cookies) {
    return this.cookies.keys();
  }
  return Object.keys(this._data);
};


/*
@function
@memberOf ClientStorage
@name empty
@summary Empty storage (remove all key/value pairs)
@returns {Boolean}
 */
ClientStorage.prototype.empty = function() {
  if (this.LSSupport && this.ls.length > 0) {
    var self = this;
    this.keys().forEach(function(key) {
      return self.remove(key);
    });
    return true;
  } else if (this.cookies) {
    return this.cookies.remove();
  } else if (Object.keys(this._data).length){
    this._data = {};
    return true;
  }
  return false;
};


/*
@function
@memberOf ClientStorage
@name __escape
 */
ClientStorage.prototype.__escape = function(value) {
  try {
    return JSON.stringify(value);
  } catch (e) {
    try {
      return value.toString();
    } catch (e) {
      return value;
    }
  }
};

/*
@function
@memberOf ClientStorage
@name __unescape
 */
ClientStorage.prototype.__unescape = function(value) {
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
};


/*
@memberOf ClientStorage
@name LSSupport
@summary Test browser for localStorage support
 */
ClientStorage.prototype.LSSupport = (function() {
  try {
    var support = 'localStorage' in window && window.localStorage !== null;
    if (support) {
      // Safari will throw an exception in Private mode
      window.localStorage.setItem('___test___', 'test');
      window.localStorage.removeItem('___test___');
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
})();

module.exports.clientStorage = ClientStorage;
module.exports.ClientStorage = new ClientStorage();
