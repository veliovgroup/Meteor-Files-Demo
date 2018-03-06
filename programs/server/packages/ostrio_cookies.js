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

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:cookies":{"cookies.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/ostrio_cookies/cookies.js                                                                              //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
module.export({
  Cookies: () => Cookies
});

let _;

module.watch(require("meteor/underscore"), {
  _(v) {
    _ = v;
  }

}, 0);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 1);
let HTTP;
let WebApp;

if (Meteor.isServer) {
  WebApp = require('meteor/webapp').WebApp;
} else {
  HTTP = require('meteor/http').HTTP;
}

const NoOp = () => {};

const urlRE = /\/___cookie___\/set/;
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

const decode = decodeURIComponent;
const encode = encodeURIComponent;
const pairSplitRegExp = /; */;
/*
RegExp to match field-content in RFC 7230 sec 3.2

field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
field-vchar   = VCHAR / obs-text
obs-text      = %x80-FF
 */

const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
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

const parse = (str, options) => {
  if (typeof str !== 'string') {
    throw new Meteor.Error(404, 'argument str must be a string');
  }

  const obj = {};
  const opt = options || {};
  let val;
  let key;
  let eqIndx;
  str.split(pairSplitRegExp).forEach(pair => {
    eqIndx = pair.indexOf('=');

    if (eqIndx < 0) {
      return;
    }

    key = pair.substr(0, eqIndx).trim();
    val = pair.substr(++eqIndx, pair.length).trim();

    if (val[0] === '"') {
      val = val.slice(1, -1);
    }

    if (void 0 === obj[key]) {
      obj[key] = tryDecode(val, opt.decode || decode);
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


const serialize = (key, val, opt = {}) => {
  let name;

  if (!fieldContentRegExp.test(key)) {
    name = escape(key);
  } else {
    name = key;
  }

  let value;

  if (!_.isUndefined(val)) {
    value = encode(val);

    if (value && !fieldContentRegExp.test(value)) {
      value = escape(value);
    }
  } else {
    value = '';
  }

  const pairs = [`${name}=${value}`];

  if (_.isNumber(opt.maxAge)) {
    pairs.push(`Max-Age=${opt.maxAge}`);
  }

  if (opt.domain && _.isString(opt.domain)) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new Meteor.Error(404, 'option domain is invalid');
    }

    pairs.push(`Domain=${opt.domain}`);
  }

  if (opt.path && _.isString(opt.path)) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new Meteor.Error(404, 'option path is invalid');
    }

    pairs.push(`Path=${opt.path}`);
  }

  opt.expires = opt.expires || opt.expire || false;

  if (opt.expires === Infinity) {
    pairs.push('Expires=Fri, 31 Dec 9999 23:59:59 GMT');
  } else if (opt.expires instanceof Date) {
    pairs.push(`Expires=${opt.expires.toUTCString()}`);
  } else if (opt.expires === 0) {
    pairs.push('Expires=0');
  } else if (_.isNumber(opt.expires)) {
    pairs.push(`Expires=${new Date(opt.expires).toUTCString()}`);
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

  if (opt.sameSite) {
    pairs.push('SameSite');
  }

  return pairs.join('; ');
};
/*
@function
@name tryDecode
@param {String} str
@param {Function} d
@summary Try decoding a string using a decoding function.
@private
 */


const tryDecode = (str, d) => {
  try {
    return d(str);
  } catch (e) {
    return str;
  }
};
/*
@locus Anywhere
@class __cookies
@param _cookies {Object|String} - Current cookies as String or Object
@param TTL {Number} - Default cookies expiration time (max-age) in milliseconds, by default - session (false)
@param runOnServer {Boolean} - Expose Cookies class to Server
@param response {http.ServerResponse|Object} - This object is created internally by a HTTP server
@summary Internal Class
 */


class __cookies {
  constructor(_cookies, TTL, runOnServer, response) {
    this.TTL = TTL;
    this.response = response;
    this.runOnServer = runOnServer;

    if (_.isObject(_cookies)) {
      this.cookies = _cookies;
    } else {
      this.cookies = parse(_cookies);
    }
  }
  /*
  @locus Anywhere
  @memberOf __cookies
  @name get
  @param {String} key  - The name of the cookie to read
  @param {String} _tmp - Unparsed string instead of user's cookies
  @summary Read a cookie. If the cookie doesn't exist a null value will be returned.
  @returns {String|void}
   */


  get(key, _tmp) {
    const _cs = _tmp ? parse(_tmp) : this.cookies;

    if (!key || !_cs) {
      return void 0;
    }

    if (_cs.hasOwnProperty(key)) {
      return _cs[key];
    }

    return void 0;
  }
  /*
  @locus Anywhere
  @memberOf __cookies
  @name set
  @param {String}  key   - The name of the cookie to create/overwrite
  @param {String}  value - The value of the cookie
  @param {Object}  opts  - [Optional] Cookie options (see readme docs)
  @summary Create/overwrite a cookie.
  @returns {Boolean}
   */


  set(key, value, opts = {}) {
    if (key && !_.isUndefined(value)) {
      if (_.isNumber(this.TTL) && opts.expires === undefined) {
        opts.expires = new Date(+new Date() + this.TTL);
      }

      const newCookie = serialize(key, value, opts);
      this.cookies[key] = value;

      if (Meteor.isClient) {
        document.cookie = newCookie;
      } else {
        this.response.setHeader('Set-Cookie', newCookie);
      }

      return true;
    }

    return false;
  }
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


  remove(key, path = '/', domain = '') {
    if (key && this.cookies.hasOwnProperty(key)) {
      const newCookie = serialize(key, '', {
        domain,
        path,
        expires: new Date(0)
      });
      delete this.cookies[key];

      if (Meteor.isClient) {
        document.cookie = newCookie;
      } else {
        this.response.setHeader('Set-Cookie', newCookie);
      }

      return true;
    } else if (!key && this.keys().length > 0 && this.keys()[0] !== '') {
      const keys = Object.keys(this.cookies);

      for (let i = 0; i < keys.length; i++) {
        this.remove(keys[i]);
      }

      return true;
    }

    return false;
  }
  /*
  @locus Anywhere
  @memberOf __cookies
  @name has
  @param {String} key  - The name of the cookie to create/overwrite
  @param {String} _tmp - Unparsed string instead of user's cookies
  @summary Check whether a cookie exists in the current position.
  @returns {Boolean}
   */


  has(key, _tmp) {
    const _cs = _tmp ? parse(_tmp) : this.cookies;

    if (!key || !_cs) {
      return false;
    }

    return _cs.hasOwnProperty(key);
  }
  /*
  @locus Anywhere
  @memberOf __cookies
  @name keys
  @summary Returns an array of all readable cookies from this location.
  @returns {[String]}
   */


  keys() {
    if (this.cookies) {
      return Object.keys(this.cookies);
    }

    return [];
  }
  /*
  @locus Client
  @memberOf __cookies
  @name send
  @param cb {Function} - Callback
  @summary Send all cookies over XHR to server.
  @returns {void}
   */


  send(cb = NoOp) {
    if (Meteor.isServer) {
      cb(new Meteor.Error(400, 'Can\'t run `.send()` on server, it\'s Client only method!'));
    }

    if (this.runOnServer) {
      HTTP.get(`${window.__meteor_runtime_config__.ROOT_URL_PATH_PREFIX || ''}/___cookie___/set`, cb);
    } else {
      cb(new Meteor.Error(400, 'Can\'t send cookies on server when `runOnServer` is false.'));
    }

    return void 0;
  }

}
/*
@function
@locus Server
@summary Middleware handler
@private
 */


const __middlewareHandler = (req, res, self) => {
  let _cookies = {};

  if (self.runOnServer) {
    if (req.headers && req.headers.cookie) {
      _cookies = parse(req.headers.cookie);
    }

    return new __cookies(_cookies, self.TTL, self.runOnServer, res);
  }

  throw new Meteor.Error(400, 'Can\'t use middleware when `runOnServer` is false.');
};
/*
@locus Anywhere
@class Cookies
@param opts {Object}
@param opts.TTL {Number} - Default cookies expiration time (max-age) in milliseconds, by default - session (false)
@param opts.auto {Boolean} - [Server] Auto-bind in middleware as `req.Cookies`, by default `true`
@param opts.handler {Function} - [Server] Middleware handler
@param opts.runOnServer {Boolean} - Expose Cookies class to Server
@summary Main Cookie class
 */


class Cookies extends __cookies {
  constructor(opts = {}) {
    opts.TTL = _.isNumber(opts.TTL) ? opts.TTL : false;
    opts.runOnServer = opts.runOnServer !== false ? true : false;

    if (Meteor.isClient) {
      super(document.cookie, opts.TTL, opts.runOnServer);
    } else {
      super({}, opts.TTL, opts.runOnServer);
      opts.auto = opts.auto !== false ? true : false;

      this.handler = opts.handler || (() => {});

      this.runOnServer = opts.runOnServer;

      if (this.runOnServer) {
        if (!Cookies.isLoadedOnServer) {
          if (opts.auto) {
            WebApp.connectHandlers.use((req, res, next) => {
              if (urlRE.test(req._parsedUrl.path)) {
                if (req.headers && req.headers.cookie) {
                  const _cObj = parse(req.headers.cookie);

                  const _cKeys = Object.keys(_cObj);

                  const _cArr = [];

                  let _cStr;

                  for (let i = 0; i < _cKeys.length; i++) {
                    _cStr = serialize(_cKeys[i], _cObj[_cKeys[i]]);

                    if (!~_cArr.indexOf(_cStr)) {
                      _cArr.push(_cStr);
                    }
                  }

                  res.setHeader('Set-Cookie', _cArr);
                }

                res.writeHead(200);
                res.end('');
              } else {
                req.Cookies = __middlewareHandler(req, res, this);
                next();
              }
            });
          }

          Cookies.isLoadedOnServer = true;
        }
      }
    }
  }
  /*
  @locus Server
  @memberOf Cookies
  @name middleware
  @summary Get Cookies instance into callback
  @returns {void}
   */


  middleware() {
    if (!Meteor.isServer) {
      throw new Meteor.Error(500, '[ostrio:cookies] Can\'t use `.middleware()` on Client, it\'s Server only!');
    }

    return (req, res, next) => {
      this.handler && this.handler(__middlewareHandler(req, res, this));
      next();
    };
  }

}

if (Meteor.isServer) {
  Cookies.isLoadedOnServer = false;
}
/* Export the Cookies class */
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/ostrio:cookies/cookies.js");

/* Exports */
Package._define("ostrio:cookies", exports);

})();

//# sourceURL=meteor://💻app/packages/ostrio_cookies.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmNvb2tpZXMvY29va2llcy5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJDb29raWVzIiwiXyIsIndhdGNoIiwicmVxdWlyZSIsInYiLCJNZXRlb3IiLCJIVFRQIiwiV2ViQXBwIiwiaXNTZXJ2ZXIiLCJOb09wIiwidXJsUkUiLCJkZWNvZGUiLCJkZWNvZGVVUklDb21wb25lbnQiLCJlbmNvZGUiLCJlbmNvZGVVUklDb21wb25lbnQiLCJwYWlyU3BsaXRSZWdFeHAiLCJmaWVsZENvbnRlbnRSZWdFeHAiLCJwYXJzZSIsInN0ciIsIm9wdGlvbnMiLCJFcnJvciIsIm9iaiIsIm9wdCIsInZhbCIsImtleSIsImVxSW5keCIsInNwbGl0IiwiZm9yRWFjaCIsInBhaXIiLCJpbmRleE9mIiwic3Vic3RyIiwidHJpbSIsImxlbmd0aCIsInNsaWNlIiwidHJ5RGVjb2RlIiwic2VyaWFsaXplIiwibmFtZSIsInRlc3QiLCJlc2NhcGUiLCJ2YWx1ZSIsImlzVW5kZWZpbmVkIiwicGFpcnMiLCJpc051bWJlciIsIm1heEFnZSIsInB1c2giLCJkb21haW4iLCJpc1N0cmluZyIsInBhdGgiLCJleHBpcmVzIiwiZXhwaXJlIiwiSW5maW5pdHkiLCJEYXRlIiwidG9VVENTdHJpbmciLCJodHRwT25seSIsInNlY3VyZSIsImZpcnN0UGFydHlPbmx5Iiwic2FtZVNpdGUiLCJqb2luIiwiZCIsImUiLCJfX2Nvb2tpZXMiLCJjb25zdHJ1Y3RvciIsIl9jb29raWVzIiwiVFRMIiwicnVuT25TZXJ2ZXIiLCJyZXNwb25zZSIsImlzT2JqZWN0IiwiY29va2llcyIsImdldCIsIl90bXAiLCJfY3MiLCJoYXNPd25Qcm9wZXJ0eSIsInNldCIsIm9wdHMiLCJ1bmRlZmluZWQiLCJuZXdDb29raWUiLCJpc0NsaWVudCIsImRvY3VtZW50IiwiY29va2llIiwic2V0SGVhZGVyIiwicmVtb3ZlIiwia2V5cyIsIk9iamVjdCIsImkiLCJoYXMiLCJzZW5kIiwiY2IiLCJ3aW5kb3ciLCJfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIiwiUk9PVF9VUkxfUEFUSF9QUkVGSVgiLCJfX21pZGRsZXdhcmVIYW5kbGVyIiwicmVxIiwicmVzIiwic2VsZiIsImhlYWRlcnMiLCJhdXRvIiwiaGFuZGxlciIsImlzTG9hZGVkT25TZXJ2ZXIiLCJjb25uZWN0SGFuZGxlcnMiLCJ1c2UiLCJuZXh0IiwiX3BhcnNlZFVybCIsIl9jT2JqIiwiX2NLZXlzIiwiX2NBcnIiLCJfY1N0ciIsIndyaXRlSGVhZCIsImVuZCIsIm1pZGRsZXdhcmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE9BQU9DLE1BQVAsQ0FBYztBQUFDQyxXQUFRLE1BQUlBO0FBQWIsQ0FBZDs7QUFBcUMsSUFBSUMsQ0FBSjs7QUFBTUgsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLG1CQUFSLENBQWIsRUFBMEM7QUFBQ0YsSUFBRUcsQ0FBRixFQUFJO0FBQUNILFFBQUVHLENBQUY7QUFBSTs7QUFBVixDQUExQyxFQUFzRCxDQUF0RDtBQUF5RCxJQUFJQyxNQUFKO0FBQVdQLE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSxlQUFSLENBQWIsRUFBc0M7QUFBQ0UsU0FBT0QsQ0FBUCxFQUFTO0FBQUNDLGFBQU9ELENBQVA7QUFBUzs7QUFBcEIsQ0FBdEMsRUFBNEQsQ0FBNUQ7QUFHL0csSUFBSUUsSUFBSjtBQUNBLElBQUlDLE1BQUo7O0FBRUEsSUFBSUYsT0FBT0csUUFBWCxFQUFxQjtBQUNuQkQsV0FBU0osUUFBUSxlQUFSLEVBQXlCSSxNQUFsQztBQUNELENBRkQsTUFFTztBQUNMRCxTQUFPSCxRQUFRLGFBQVIsRUFBdUJHLElBQTlCO0FBQ0Q7O0FBRUQsTUFBTUcsT0FBUSxNQUFNLENBQUUsQ0FBdEI7O0FBQ0EsTUFBTUMsUUFBUSxxQkFBZDtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUE2QkEsTUFBTUMsU0FBU0Msa0JBQWY7QUFDQSxNQUFNQyxTQUFTQyxrQkFBZjtBQUNBLE1BQU1DLGtCQUFrQixLQUF4QjtBQUVBOzs7Ozs7OztBQU9BLE1BQU1DLHFCQUFxQix1Q0FBM0I7QUFFQTs7Ozs7Ozs7Ozs7OztBQVlBLE1BQU1DLFFBQVEsQ0FBQ0MsR0FBRCxFQUFNQyxPQUFOLEtBQWtCO0FBQzlCLE1BQUksT0FBT0QsR0FBUCxLQUFlLFFBQW5CLEVBQTZCO0FBQzNCLFVBQU0sSUFBSWIsT0FBT2UsS0FBWCxDQUFpQixHQUFqQixFQUFzQiwrQkFBdEIsQ0FBTjtBQUNEOztBQUNELFFBQU1DLE1BQU0sRUFBWjtBQUNBLFFBQU1DLE1BQU1ILFdBQVcsRUFBdkI7QUFDQSxNQUFJSSxHQUFKO0FBQ0EsTUFBSUMsR0FBSjtBQUNBLE1BQUlDLE1BQUo7QUFFQVAsTUFBSVEsS0FBSixDQUFVWCxlQUFWLEVBQTJCWSxPQUEzQixDQUFvQ0MsSUFBRCxJQUFVO0FBQzNDSCxhQUFTRyxLQUFLQyxPQUFMLENBQWEsR0FBYixDQUFUOztBQUNBLFFBQUlKLFNBQVMsQ0FBYixFQUFnQjtBQUNkO0FBQ0Q7O0FBQ0RELFVBQU1JLEtBQUtFLE1BQUwsQ0FBWSxDQUFaLEVBQWVMLE1BQWYsRUFBdUJNLElBQXZCLEVBQU47QUFDQVIsVUFBTUssS0FBS0UsTUFBTCxDQUFZLEVBQUVMLE1BQWQsRUFBc0JHLEtBQUtJLE1BQTNCLEVBQW1DRCxJQUFuQyxFQUFOOztBQUNBLFFBQUlSLElBQUksQ0FBSixNQUFXLEdBQWYsRUFBb0I7QUFDbEJBLFlBQU1BLElBQUlVLEtBQUosQ0FBVSxDQUFWLEVBQWEsQ0FBQyxDQUFkLENBQU47QUFDRDs7QUFDRCxRQUFJLEtBQUssQ0FBTCxLQUFXWixJQUFJRyxHQUFKLENBQWYsRUFBeUI7QUFDdkJILFVBQUlHLEdBQUosSUFBV1UsVUFBVVgsR0FBVixFQUFnQkQsSUFBSVgsTUFBSixJQUFjQSxNQUE5QixDQUFYO0FBQ0Q7QUFDRixHQWJEO0FBY0EsU0FBT1UsR0FBUDtBQUNELENBekJEO0FBMkJBOzs7Ozs7Ozs7Ozs7Ozs7OztBQWVBLE1BQU1jLFlBQVksQ0FBQ1gsR0FBRCxFQUFNRCxHQUFOLEVBQVdELE1BQU0sRUFBakIsS0FBd0I7QUFDeEMsTUFBSWMsSUFBSjs7QUFFQSxNQUFJLENBQUNwQixtQkFBbUJxQixJQUFuQixDQUF3QmIsR0FBeEIsQ0FBTCxFQUFtQztBQUNqQ1ksV0FBT0UsT0FBT2QsR0FBUCxDQUFQO0FBQ0QsR0FGRCxNQUVPO0FBQ0xZLFdBQU9aLEdBQVA7QUFDRDs7QUFFRCxNQUFJZSxLQUFKOztBQUNBLE1BQUksQ0FBQ3RDLEVBQUV1QyxXQUFGLENBQWNqQixHQUFkLENBQUwsRUFBeUI7QUFDdkJnQixZQUFRMUIsT0FBT1UsR0FBUCxDQUFSOztBQUNBLFFBQUlnQixTQUFTLENBQUN2QixtQkFBbUJxQixJQUFuQixDQUF3QkUsS0FBeEIsQ0FBZCxFQUE4QztBQUM1Q0EsY0FBUUQsT0FBT0MsS0FBUCxDQUFSO0FBQ0Q7QUFDRixHQUxELE1BS087QUFDTEEsWUFBUSxFQUFSO0FBQ0Q7O0FBRUQsUUFBTUUsUUFBUSxDQUFFLEdBQUVMLElBQUssSUFBR0csS0FBTSxFQUFsQixDQUFkOztBQUVBLE1BQUl0QyxFQUFFeUMsUUFBRixDQUFXcEIsSUFBSXFCLE1BQWYsQ0FBSixFQUE0QjtBQUMxQkYsVUFBTUcsSUFBTixDQUFZLFdBQVV0QixJQUFJcUIsTUFBTyxFQUFqQztBQUNEOztBQUVELE1BQUlyQixJQUFJdUIsTUFBSixJQUFjNUMsRUFBRTZDLFFBQUYsQ0FBV3hCLElBQUl1QixNQUFmLENBQWxCLEVBQTBDO0FBQ3hDLFFBQUksQ0FBQzdCLG1CQUFtQnFCLElBQW5CLENBQXdCZixJQUFJdUIsTUFBNUIsQ0FBTCxFQUEwQztBQUN4QyxZQUFNLElBQUl4QyxPQUFPZSxLQUFYLENBQWlCLEdBQWpCLEVBQXNCLDBCQUF0QixDQUFOO0FBQ0Q7O0FBQ0RxQixVQUFNRyxJQUFOLENBQVksVUFBU3RCLElBQUl1QixNQUFPLEVBQWhDO0FBQ0Q7O0FBRUQsTUFBSXZCLElBQUl5QixJQUFKLElBQVk5QyxFQUFFNkMsUUFBRixDQUFXeEIsSUFBSXlCLElBQWYsQ0FBaEIsRUFBc0M7QUFDcEMsUUFBSSxDQUFDL0IsbUJBQW1CcUIsSUFBbkIsQ0FBd0JmLElBQUl5QixJQUE1QixDQUFMLEVBQXdDO0FBQ3RDLFlBQU0sSUFBSTFDLE9BQU9lLEtBQVgsQ0FBaUIsR0FBakIsRUFBc0Isd0JBQXRCLENBQU47QUFDRDs7QUFDRHFCLFVBQU1HLElBQU4sQ0FBWSxRQUFPdEIsSUFBSXlCLElBQUssRUFBNUI7QUFDRDs7QUFFRHpCLE1BQUkwQixPQUFKLEdBQWMxQixJQUFJMEIsT0FBSixJQUFlMUIsSUFBSTJCLE1BQW5CLElBQTZCLEtBQTNDOztBQUNBLE1BQUkzQixJQUFJMEIsT0FBSixLQUFnQkUsUUFBcEIsRUFBOEI7QUFDNUJULFVBQU1HLElBQU4sQ0FBVyx1Q0FBWDtBQUNELEdBRkQsTUFFTyxJQUFJdEIsSUFBSTBCLE9BQUosWUFBdUJHLElBQTNCLEVBQWlDO0FBQ3RDVixVQUFNRyxJQUFOLENBQVksV0FBVXRCLElBQUkwQixPQUFKLENBQVlJLFdBQVosRUFBMEIsRUFBaEQ7QUFDRCxHQUZNLE1BRUEsSUFBSTlCLElBQUkwQixPQUFKLEtBQWdCLENBQXBCLEVBQXVCO0FBQzVCUCxVQUFNRyxJQUFOLENBQVcsV0FBWDtBQUNELEdBRk0sTUFFQSxJQUFJM0MsRUFBRXlDLFFBQUYsQ0FBV3BCLElBQUkwQixPQUFmLENBQUosRUFBNkI7QUFDbENQLFVBQU1HLElBQU4sQ0FBWSxXQUFXLElBQUlPLElBQUosQ0FBUzdCLElBQUkwQixPQUFiLENBQUQsQ0FBd0JJLFdBQXhCLEVBQXNDLEVBQTVEO0FBQ0Q7O0FBRUQsTUFBSTlCLElBQUkrQixRQUFSLEVBQWtCO0FBQ2hCWixVQUFNRyxJQUFOLENBQVcsVUFBWDtBQUNEOztBQUVELE1BQUl0QixJQUFJZ0MsTUFBUixFQUFnQjtBQUNkYixVQUFNRyxJQUFOLENBQVcsUUFBWDtBQUNEOztBQUVELE1BQUl0QixJQUFJaUMsY0FBUixFQUF3QjtBQUN0QmQsVUFBTUcsSUFBTixDQUFXLGtCQUFYO0FBQ0Q7O0FBRUQsTUFBSXRCLElBQUlrQyxRQUFSLEVBQWtCO0FBQ2hCZixVQUFNRyxJQUFOLENBQVcsVUFBWDtBQUNEOztBQUVELFNBQU9ILE1BQU1nQixJQUFOLENBQVcsSUFBWCxDQUFQO0FBQ0QsQ0FuRUQ7QUFzRUE7Ozs7Ozs7Ozs7QUFRQSxNQUFNdkIsWUFBWSxDQUFDaEIsR0FBRCxFQUFNd0MsQ0FBTixLQUFZO0FBQzVCLE1BQUk7QUFDRixXQUFPQSxFQUFFeEMsR0FBRixDQUFQO0FBQ0QsR0FGRCxDQUVFLE9BQU95QyxDQUFQLEVBQVU7QUFDVixXQUFPekMsR0FBUDtBQUNEO0FBQ0YsQ0FORDtBQVNBOzs7Ozs7Ozs7OztBQVNBLE1BQU0wQyxTQUFOLENBQWdCO0FBQ2RDLGNBQVlDLFFBQVosRUFBc0JDLEdBQXRCLEVBQTJCQyxXQUEzQixFQUF3Q0MsUUFBeEMsRUFBa0Q7QUFDaEQsU0FBS0YsR0FBTCxHQUFtQkEsR0FBbkI7QUFDQSxTQUFLRSxRQUFMLEdBQW1CQSxRQUFuQjtBQUNBLFNBQUtELFdBQUwsR0FBbUJBLFdBQW5COztBQUVBLFFBQUkvRCxFQUFFaUUsUUFBRixDQUFXSixRQUFYLENBQUosRUFBMEI7QUFDeEIsV0FBS0ssT0FBTCxHQUFlTCxRQUFmO0FBQ0QsS0FGRCxNQUVPO0FBQ0wsV0FBS0ssT0FBTCxHQUFlbEQsTUFBTTZDLFFBQU4sQ0FBZjtBQUNEO0FBQ0Y7QUFFRDs7Ozs7Ozs7Ozs7QUFTQU0sTUFBSTVDLEdBQUosRUFBUzZDLElBQVQsRUFBZTtBQUNiLFVBQU1DLE1BQU1ELE9BQU9wRCxNQUFNb0QsSUFBTixDQUFQLEdBQXFCLEtBQUtGLE9BQXRDOztBQUNBLFFBQUksQ0FBQzNDLEdBQUQsSUFBUSxDQUFDOEMsR0FBYixFQUFrQjtBQUNoQixhQUFPLEtBQUssQ0FBWjtBQUNEOztBQUVELFFBQUlBLElBQUlDLGNBQUosQ0FBbUIvQyxHQUFuQixDQUFKLEVBQTZCO0FBQzNCLGFBQU84QyxJQUFJOUMsR0FBSixDQUFQO0FBQ0Q7O0FBRUQsV0FBTyxLQUFLLENBQVo7QUFDRDtBQUVEOzs7Ozs7Ozs7Ozs7QUFVQWdELE1BQUloRCxHQUFKLEVBQVNlLEtBQVQsRUFBZ0JrQyxPQUFPLEVBQXZCLEVBQTJCO0FBQ3pCLFFBQUlqRCxPQUFPLENBQUN2QixFQUFFdUMsV0FBRixDQUFjRCxLQUFkLENBQVosRUFBa0M7QUFDaEMsVUFBSXRDLEVBQUV5QyxRQUFGLENBQVcsS0FBS3FCLEdBQWhCLEtBQXdCVSxLQUFLekIsT0FBTCxLQUFpQjBCLFNBQTdDLEVBQXdEO0FBQ3RERCxhQUFLekIsT0FBTCxHQUFlLElBQUlHLElBQUosQ0FBUyxDQUFDLElBQUlBLElBQUosRUFBRCxHQUFjLEtBQUtZLEdBQTVCLENBQWY7QUFDRDs7QUFDRCxZQUFNWSxZQUFZeEMsVUFBVVgsR0FBVixFQUFlZSxLQUFmLEVBQXNCa0MsSUFBdEIsQ0FBbEI7QUFDQSxXQUFLTixPQUFMLENBQWEzQyxHQUFiLElBQW9CZSxLQUFwQjs7QUFDQSxVQUFJbEMsT0FBT3VFLFFBQVgsRUFBcUI7QUFDbkJDLGlCQUFTQyxNQUFULEdBQWtCSCxTQUFsQjtBQUNELE9BRkQsTUFFTztBQUNMLGFBQUtWLFFBQUwsQ0FBY2MsU0FBZCxDQUF3QixZQUF4QixFQUFzQ0osU0FBdEM7QUFDRDs7QUFDRCxhQUFPLElBQVA7QUFDRDs7QUFDRCxXQUFPLEtBQVA7QUFDRDtBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBaUJBSyxTQUFPeEQsR0FBUCxFQUFZdUIsT0FBTyxHQUFuQixFQUF3QkYsU0FBUyxFQUFqQyxFQUFxQztBQUNuQyxRQUFJckIsT0FBTyxLQUFLMkMsT0FBTCxDQUFhSSxjQUFiLENBQTRCL0MsR0FBNUIsQ0FBWCxFQUE2QztBQUMzQyxZQUFNbUQsWUFBWXhDLFVBQVVYLEdBQVYsRUFBZSxFQUFmLEVBQW1CO0FBQ25DcUIsY0FEbUM7QUFFbkNFLFlBRm1DO0FBR25DQyxpQkFBUyxJQUFJRyxJQUFKLENBQVMsQ0FBVDtBQUgwQixPQUFuQixDQUFsQjtBQU1BLGFBQU8sS0FBS2dCLE9BQUwsQ0FBYTNDLEdBQWIsQ0FBUDs7QUFDQSxVQUFJbkIsT0FBT3VFLFFBQVgsRUFBcUI7QUFDbkJDLGlCQUFTQyxNQUFULEdBQWtCSCxTQUFsQjtBQUNELE9BRkQsTUFFTztBQUNMLGFBQUtWLFFBQUwsQ0FBY2MsU0FBZCxDQUF3QixZQUF4QixFQUFzQ0osU0FBdEM7QUFDRDs7QUFDRCxhQUFPLElBQVA7QUFDRCxLQWRELE1BY08sSUFBSSxDQUFDbkQsR0FBRCxJQUFRLEtBQUt5RCxJQUFMLEdBQVlqRCxNQUFaLEdBQXFCLENBQTdCLElBQWtDLEtBQUtpRCxJQUFMLEdBQVksQ0FBWixNQUFtQixFQUF6RCxFQUE2RDtBQUNsRSxZQUFNQSxPQUFPQyxPQUFPRCxJQUFQLENBQVksS0FBS2QsT0FBakIsQ0FBYjs7QUFDQSxXQUFLLElBQUlnQixJQUFJLENBQWIsRUFBZ0JBLElBQUlGLEtBQUtqRCxNQUF6QixFQUFpQ21ELEdBQWpDLEVBQXNDO0FBQ3BDLGFBQUtILE1BQUwsQ0FBWUMsS0FBS0UsQ0FBTCxDQUFaO0FBQ0Q7O0FBQ0QsYUFBTyxJQUFQO0FBQ0Q7O0FBQ0QsV0FBTyxLQUFQO0FBQ0Q7QUFFRDs7Ozs7Ozs7Ozs7QUFTQUMsTUFBSTVELEdBQUosRUFBUzZDLElBQVQsRUFBZTtBQUNiLFVBQU1DLE1BQU1ELE9BQU9wRCxNQUFNb0QsSUFBTixDQUFQLEdBQXFCLEtBQUtGLE9BQXRDOztBQUNBLFFBQUksQ0FBQzNDLEdBQUQsSUFBUSxDQUFDOEMsR0FBYixFQUFrQjtBQUNoQixhQUFPLEtBQVA7QUFDRDs7QUFFRCxXQUFPQSxJQUFJQyxjQUFKLENBQW1CL0MsR0FBbkIsQ0FBUDtBQUNEO0FBRUQ7Ozs7Ozs7OztBQU9BeUQsU0FBTztBQUNMLFFBQUksS0FBS2QsT0FBVCxFQUFrQjtBQUNoQixhQUFPZSxPQUFPRCxJQUFQLENBQVksS0FBS2QsT0FBakIsQ0FBUDtBQUNEOztBQUNELFdBQU8sRUFBUDtBQUNEO0FBRUQ7Ozs7Ozs7Ozs7QUFRQWtCLE9BQUtDLEtBQUs3RSxJQUFWLEVBQWdCO0FBQ2QsUUFBSUosT0FBT0csUUFBWCxFQUFxQjtBQUNuQjhFLFNBQUcsSUFBSWpGLE9BQU9lLEtBQVgsQ0FBaUIsR0FBakIsRUFBc0IsMkRBQXRCLENBQUg7QUFDRDs7QUFFRCxRQUFJLEtBQUs0QyxXQUFULEVBQXNCO0FBQ3BCMUQsV0FBSzhELEdBQUwsQ0FBVSxHQUFFbUIsT0FBT0MseUJBQVAsQ0FBaUNDLG9CQUFqQyxJQUF5RCxFQUFHLG1CQUF4RSxFQUE0RkgsRUFBNUY7QUFDRCxLQUZELE1BRU87QUFDTEEsU0FBRyxJQUFJakYsT0FBT2UsS0FBWCxDQUFpQixHQUFqQixFQUFzQiw0REFBdEIsQ0FBSDtBQUNEOztBQUNELFdBQU8sS0FBSyxDQUFaO0FBQ0Q7O0FBM0phO0FBK0poQjs7Ozs7Ozs7QUFNQSxNQUFNc0Usc0JBQXNCLENBQUNDLEdBQUQsRUFBTUMsR0FBTixFQUFXQyxJQUFYLEtBQW9CO0FBQzlDLE1BQUkvQixXQUFXLEVBQWY7O0FBQ0EsTUFBSStCLEtBQUs3QixXQUFULEVBQXNCO0FBQ3BCLFFBQUkyQixJQUFJRyxPQUFKLElBQWVILElBQUlHLE9BQUosQ0FBWWhCLE1BQS9CLEVBQXVDO0FBQ3JDaEIsaUJBQVc3QyxNQUFNMEUsSUFBSUcsT0FBSixDQUFZaEIsTUFBbEIsQ0FBWDtBQUNEOztBQUNELFdBQU8sSUFBSWxCLFNBQUosQ0FBY0UsUUFBZCxFQUF3QitCLEtBQUs5QixHQUE3QixFQUFrQzhCLEtBQUs3QixXQUF2QyxFQUFvRDRCLEdBQXBELENBQVA7QUFDRDs7QUFFRCxRQUFNLElBQUl2RixPQUFPZSxLQUFYLENBQWlCLEdBQWpCLEVBQXNCLG9EQUF0QixDQUFOO0FBQ0QsQ0FWRDtBQWFBOzs7Ozs7Ozs7Ozs7QUFVQSxNQUFNcEIsT0FBTixTQUFzQjRELFNBQXRCLENBQWdDO0FBQzlCQyxjQUFZWSxPQUFPLEVBQW5CLEVBQXVCO0FBQ3JCQSxTQUFLVixHQUFMLEdBQVc5RCxFQUFFeUMsUUFBRixDQUFXK0IsS0FBS1YsR0FBaEIsSUFBdUJVLEtBQUtWLEdBQTVCLEdBQWtDLEtBQTdDO0FBQ0FVLFNBQUtULFdBQUwsR0FBb0JTLEtBQUtULFdBQUwsS0FBcUIsS0FBdEIsR0FBK0IsSUFBL0IsR0FBc0MsS0FBekQ7O0FBRUEsUUFBSTNELE9BQU91RSxRQUFYLEVBQXFCO0FBQ25CLFlBQU1DLFNBQVNDLE1BQWYsRUFBdUJMLEtBQUtWLEdBQTVCLEVBQWlDVSxLQUFLVCxXQUF0QztBQUNELEtBRkQsTUFFTztBQUNMLFlBQU0sRUFBTixFQUFVUyxLQUFLVixHQUFmLEVBQW9CVSxLQUFLVCxXQUF6QjtBQUNBUyxXQUFLc0IsSUFBTCxHQUFtQnRCLEtBQUtzQixJQUFMLEtBQWMsS0FBZCxHQUFzQixJQUF0QixHQUE2QixLQUFoRDs7QUFDQSxXQUFLQyxPQUFMLEdBQW1CdkIsS0FBS3VCLE9BQUwsS0FBaUIsTUFBTSxDQUFFLENBQXpCLENBQW5COztBQUNBLFdBQUtoQyxXQUFMLEdBQW1CUyxLQUFLVCxXQUF4Qjs7QUFFQSxVQUFJLEtBQUtBLFdBQVQsRUFBc0I7QUFDcEIsWUFBSSxDQUFDaEUsUUFBUWlHLGdCQUFiLEVBQStCO0FBQzdCLGNBQUl4QixLQUFLc0IsSUFBVCxFQUFlO0FBQ2J4RixtQkFBTzJGLGVBQVAsQ0FBdUJDLEdBQXZCLENBQTJCLENBQUNSLEdBQUQsRUFBTUMsR0FBTixFQUFXUSxJQUFYLEtBQW9CO0FBQzdDLGtCQUFJMUYsTUFBTTJCLElBQU4sQ0FBV3NELElBQUlVLFVBQUosQ0FBZXRELElBQTFCLENBQUosRUFBcUM7QUFDbkMsb0JBQUk0QyxJQUFJRyxPQUFKLElBQWVILElBQUlHLE9BQUosQ0FBWWhCLE1BQS9CLEVBQXVDO0FBQ3JDLHdCQUFNd0IsUUFBU3JGLE1BQU0wRSxJQUFJRyxPQUFKLENBQVloQixNQUFsQixDQUFmOztBQUNBLHdCQUFNeUIsU0FBU3JCLE9BQU9ELElBQVAsQ0FBWXFCLEtBQVosQ0FBZjs7QUFDQSx3QkFBTUUsUUFBUyxFQUFmOztBQUNBLHNCQUFNQyxLQUFOOztBQUVBLHVCQUFLLElBQUl0QixJQUFJLENBQWIsRUFBZ0JBLElBQUlvQixPQUFPdkUsTUFBM0IsRUFBbUNtRCxHQUFuQyxFQUF3QztBQUN0Q3NCLDRCQUFRdEUsVUFBVW9FLE9BQU9wQixDQUFQLENBQVYsRUFBcUJtQixNQUFNQyxPQUFPcEIsQ0FBUCxDQUFOLENBQXJCLENBQVI7O0FBQ0Esd0JBQUksQ0FBQyxDQUFDcUIsTUFBTTNFLE9BQU4sQ0FBYzRFLEtBQWQsQ0FBTixFQUE0QjtBQUMxQkQsNEJBQU01RCxJQUFOLENBQVc2RCxLQUFYO0FBQ0Q7QUFDRjs7QUFFRGIsc0JBQUliLFNBQUosQ0FBYyxZQUFkLEVBQTRCeUIsS0FBNUI7QUFDRDs7QUFFRFosb0JBQUljLFNBQUosQ0FBYyxHQUFkO0FBQ0FkLG9CQUFJZSxHQUFKLENBQVEsRUFBUjtBQUNELGVBbkJELE1BbUJPO0FBQ0xoQixvQkFBSTNGLE9BQUosR0FBYzBGLG9CQUFvQkMsR0FBcEIsRUFBeUJDLEdBQXpCLEVBQThCLElBQTlCLENBQWQ7QUFDQVE7QUFDRDtBQUNGLGFBeEJEO0FBeUJEOztBQUNEcEcsa0JBQVFpRyxnQkFBUixHQUEyQixJQUEzQjtBQUNEO0FBQ0Y7QUFDRjtBQUNGO0FBR0Q7Ozs7Ozs7OztBQU9BVyxlQUFhO0FBQ1gsUUFBSSxDQUFDdkcsT0FBT0csUUFBWixFQUFzQjtBQUNwQixZQUFNLElBQUlILE9BQU9lLEtBQVgsQ0FBaUIsR0FBakIsRUFBc0IsMkVBQXRCLENBQU47QUFDRDs7QUFFRCxXQUFPLENBQUN1RSxHQUFELEVBQU1DLEdBQU4sRUFBV1EsSUFBWCxLQUFvQjtBQUN6QixXQUFLSixPQUFMLElBQWdCLEtBQUtBLE9BQUwsQ0FBYU4sb0JBQW9CQyxHQUFwQixFQUF5QkMsR0FBekIsRUFBOEIsSUFBOUIsQ0FBYixDQUFoQjtBQUNBUTtBQUNELEtBSEQ7QUFJRDs7QUFqRTZCOztBQW9FaEMsSUFBSS9GLE9BQU9HLFFBQVgsRUFBcUI7QUFDbkJSLFVBQVFpRyxnQkFBUixHQUEyQixLQUEzQjtBQUNEO0FBRUQsOEIiLCJmaWxlIjoiL3BhY2thZ2VzL29zdHJpb19jb29raWVzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgXyB9ICAgICAgZnJvbSAnbWV0ZW9yL3VuZGVyc2NvcmUnO1xuaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5cbmxldCBIVFRQO1xubGV0IFdlYkFwcDtcblxuaWYgKE1ldGVvci5pc1NlcnZlcikge1xuICBXZWJBcHAgPSByZXF1aXJlKCdtZXRlb3Ivd2ViYXBwJykuV2ViQXBwO1xufSBlbHNlIHtcbiAgSFRUUCA9IHJlcXVpcmUoJ21ldGVvci9odHRwJykuSFRUUDtcbn1cblxuY29uc3QgTm9PcCAgPSAoKSA9PiB7fTtcbmNvbnN0IHVybFJFID0gL1xcL19fX2Nvb2tpZV9fX1xcL3NldC87XG4vKlxuQHVybCBodHRwczovL2dpdGh1Yi5jb20vanNodHRwL2Nvb2tpZS9ibG9iL21hc3Rlci9pbmRleC5qc1xuQG5hbWUgY29va2llXG5AYXV0aG9yIGpzaHR0cFxuQGxpY2Vuc2VcbihUaGUgTUlUIExpY2Vuc2UpXG5cbkNvcHlyaWdodCAoYykgMjAxMi0yMDE0IFJvbWFuIFNodHlsbWFuIDxzaHR5bG1hbkBnbWFpbC5jb20+XG5Db3B5cmlnaHQgKGMpIDIwMTUgRG91Z2xhcyBDaHJpc3RvcGhlciBXaWxzb24gPGRvdWdAc29tZXRoaW5nZG91Zy5jb20+XG5cblBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZ1xuYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4nU29mdHdhcmUnKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG53aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG5kaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG9cbnBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0b1xudGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG5UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZVxuaW5jbHVkZWQgaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCAnQVMgSVMnLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELFxuRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG5NRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuXG5JTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWVxuQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCxcblRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFXG5TT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cbiAqL1xuY29uc3QgZGVjb2RlID0gZGVjb2RlVVJJQ29tcG9uZW50O1xuY29uc3QgZW5jb2RlID0gZW5jb2RlVVJJQ29tcG9uZW50O1xuY29uc3QgcGFpclNwbGl0UmVnRXhwID0gLzsgKi87XG5cbi8qXG5SZWdFeHAgdG8gbWF0Y2ggZmllbGQtY29udGVudCBpbiBSRkMgNzIzMCBzZWMgMy4yXG5cbmZpZWxkLWNvbnRlbnQgPSBmaWVsZC12Y2hhciBbIDEqKCBTUCAvIEhUQUIgKSBmaWVsZC12Y2hhciBdXG5maWVsZC12Y2hhciAgID0gVkNIQVIgLyBvYnMtdGV4dFxub2JzLXRleHQgICAgICA9ICV4ODAtRkZcbiAqL1xuY29uc3QgZmllbGRDb250ZW50UmVnRXhwID0gL15bXFx1MDAwOVxcdTAwMjAtXFx1MDA3ZVxcdTAwODAtXFx1MDBmZl0rJC87XG5cbi8qXG5AZnVuY3Rpb25cbkBuYW1lIHBhcnNlXG5AcGFyYW0ge1N0cmluZ30gc3RyXG5AcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG5AcmV0dXJuIHtPYmplY3R9XG5Ac3VtbWFyeVxuUGFyc2UgYSBjb29raWUgaGVhZGVyLlxuUGFyc2UgdGhlIGdpdmVuIGNvb2tpZSBoZWFkZXIgc3RyaW5nIGludG8gYW4gb2JqZWN0XG5UaGUgb2JqZWN0IGhhcyB0aGUgdmFyaW91cyBjb29raWVzIGFzIGtleXMobmFtZXMpID0+IHZhbHVlc1xuQHByaXZhdGVcbiAqL1xuY29uc3QgcGFyc2UgPSAoc3RyLCBvcHRpb25zKSA9PiB7XG4gIGlmICh0eXBlb2Ygc3RyICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDA0LCAnYXJndW1lbnQgc3RyIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgfVxuICBjb25zdCBvYmogPSB7fTtcbiAgY29uc3Qgb3B0ID0gb3B0aW9ucyB8fCB7fTtcbiAgbGV0IHZhbDtcbiAgbGV0IGtleTtcbiAgbGV0IGVxSW5keDtcblxuICBzdHIuc3BsaXQocGFpclNwbGl0UmVnRXhwKS5mb3JFYWNoKChwYWlyKSA9PiB7XG4gICAgZXFJbmR4ID0gcGFpci5pbmRleE9mKCc9Jyk7XG4gICAgaWYgKGVxSW5keCA8IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAga2V5ID0gcGFpci5zdWJzdHIoMCwgZXFJbmR4KS50cmltKCk7XG4gICAgdmFsID0gcGFpci5zdWJzdHIoKytlcUluZHgsIHBhaXIubGVuZ3RoKS50cmltKCk7XG4gICAgaWYgKHZhbFswXSA9PT0gJ1wiJykge1xuICAgICAgdmFsID0gdmFsLnNsaWNlKDEsIC0xKTtcbiAgICB9XG4gICAgaWYgKHZvaWQgMCA9PT0gb2JqW2tleV0pIHtcbiAgICAgIG9ialtrZXldID0gdHJ5RGVjb2RlKHZhbCwgKG9wdC5kZWNvZGUgfHwgZGVjb2RlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG9iajtcbn07XG5cbi8qXG5AZnVuY3Rpb25cbkBuYW1lIHNlcmlhbGl6ZVxuQHBhcmFtIHtTdHJpbmd9IG5hbWVcbkBwYXJhbSB7U3RyaW5nfSB2YWxcbkBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbkByZXR1cm4ge1N0cmluZ31cbkBzdW1tYXJ5XG5TZXJpYWxpemUgZGF0YSBpbnRvIGEgY29va2llIGhlYWRlci5cblNlcmlhbGl6ZSB0aGUgYSBuYW1lIHZhbHVlIHBhaXIgaW50byBhIGNvb2tpZSBzdHJpbmcgc3VpdGFibGUgZm9yXG5odHRwIGhlYWRlcnMuIEFuIG9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHNwZWNpZmllZCBjb29raWUgcGFyYW1ldGVycy5cbnNlcmlhbGl6ZSgnZm9vJywgJ2JhcicsIHsgaHR0cE9ubHk6IHRydWUgfSlcbiAgPT4gXCJmb289YmFyOyBodHRwT25seVwiXG5AcHJpdmF0ZVxuICovXG5jb25zdCBzZXJpYWxpemUgPSAoa2V5LCB2YWwsIG9wdCA9IHt9KSA9PiB7XG4gIGxldCBuYW1lO1xuXG4gIGlmICghZmllbGRDb250ZW50UmVnRXhwLnRlc3Qoa2V5KSkge1xuICAgIG5hbWUgPSBlc2NhcGUoa2V5KTtcbiAgfSBlbHNlIHtcbiAgICBuYW1lID0ga2V5O1xuICB9XG5cbiAgbGV0IHZhbHVlO1xuICBpZiAoIV8uaXNVbmRlZmluZWQodmFsKSkge1xuICAgIHZhbHVlID0gZW5jb2RlKHZhbCk7XG4gICAgaWYgKHZhbHVlICYmICFmaWVsZENvbnRlbnRSZWdFeHAudGVzdCh2YWx1ZSkpIHtcbiAgICAgIHZhbHVlID0gZXNjYXBlKHZhbHVlKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFsdWUgPSAnJztcbiAgfVxuXG4gIGNvbnN0IHBhaXJzID0gW2Ake25hbWV9PSR7dmFsdWV9YF07XG5cbiAgaWYgKF8uaXNOdW1iZXIob3B0Lm1heEFnZSkpIHtcbiAgICBwYWlycy5wdXNoKGBNYXgtQWdlPSR7b3B0Lm1heEFnZX1gKTtcbiAgfVxuXG4gIGlmIChvcHQuZG9tYWluICYmIF8uaXNTdHJpbmcob3B0LmRvbWFpbikpIHtcbiAgICBpZiAoIWZpZWxkQ29udGVudFJlZ0V4cC50ZXN0KG9wdC5kb21haW4pKSB7XG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwNCwgJ29wdGlvbiBkb21haW4gaXMgaW52YWxpZCcpO1xuICAgIH1cbiAgICBwYWlycy5wdXNoKGBEb21haW49JHtvcHQuZG9tYWlufWApO1xuICB9XG5cbiAgaWYgKG9wdC5wYXRoICYmIF8uaXNTdHJpbmcob3B0LnBhdGgpKSB7XG4gICAgaWYgKCFmaWVsZENvbnRlbnRSZWdFeHAudGVzdChvcHQucGF0aCkpIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDA0LCAnb3B0aW9uIHBhdGggaXMgaW52YWxpZCcpO1xuICAgIH1cbiAgICBwYWlycy5wdXNoKGBQYXRoPSR7b3B0LnBhdGh9YCk7XG4gIH1cblxuICBvcHQuZXhwaXJlcyA9IG9wdC5leHBpcmVzIHx8IG9wdC5leHBpcmUgfHwgZmFsc2U7XG4gIGlmIChvcHQuZXhwaXJlcyA9PT0gSW5maW5pdHkpIHtcbiAgICBwYWlycy5wdXNoKCdFeHBpcmVzPUZyaSwgMzEgRGVjIDk5OTkgMjM6NTk6NTkgR01UJyk7XG4gIH0gZWxzZSBpZiAob3B0LmV4cGlyZXMgaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgcGFpcnMucHVzaChgRXhwaXJlcz0ke29wdC5leHBpcmVzLnRvVVRDU3RyaW5nKCl9YCk7XG4gIH0gZWxzZSBpZiAob3B0LmV4cGlyZXMgPT09IDApIHtcbiAgICBwYWlycy5wdXNoKCdFeHBpcmVzPTAnKTtcbiAgfSBlbHNlIGlmIChfLmlzTnVtYmVyKG9wdC5leHBpcmVzKSkge1xuICAgIHBhaXJzLnB1c2goYEV4cGlyZXM9JHsobmV3IERhdGUob3B0LmV4cGlyZXMpKS50b1VUQ1N0cmluZygpfWApO1xuICB9XG5cbiAgaWYgKG9wdC5odHRwT25seSkge1xuICAgIHBhaXJzLnB1c2goJ0h0dHBPbmx5Jyk7XG4gIH1cblxuICBpZiAob3B0LnNlY3VyZSkge1xuICAgIHBhaXJzLnB1c2goJ1NlY3VyZScpO1xuICB9XG5cbiAgaWYgKG9wdC5maXJzdFBhcnR5T25seSkge1xuICAgIHBhaXJzLnB1c2goJ0ZpcnN0LVBhcnR5LU9ubHknKTtcbiAgfVxuXG4gIGlmIChvcHQuc2FtZVNpdGUpIHtcbiAgICBwYWlycy5wdXNoKCdTYW1lU2l0ZScpO1xuICB9XG5cbiAgcmV0dXJuIHBhaXJzLmpvaW4oJzsgJyk7XG59O1xuXG5cbi8qXG5AZnVuY3Rpb25cbkBuYW1lIHRyeURlY29kZVxuQHBhcmFtIHtTdHJpbmd9IHN0clxuQHBhcmFtIHtGdW5jdGlvbn0gZFxuQHN1bW1hcnkgVHJ5IGRlY29kaW5nIGEgc3RyaW5nIHVzaW5nIGEgZGVjb2RpbmcgZnVuY3Rpb24uXG5AcHJpdmF0ZVxuICovXG5jb25zdCB0cnlEZWNvZGUgPSAoc3RyLCBkKSA9PiB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGQoc3RyKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn07XG5cblxuLypcbkBsb2N1cyBBbnl3aGVyZVxuQGNsYXNzIF9fY29va2llc1xuQHBhcmFtIF9jb29raWVzIHtPYmplY3R8U3RyaW5nfSAtIEN1cnJlbnQgY29va2llcyBhcyBTdHJpbmcgb3IgT2JqZWN0XG5AcGFyYW0gVFRMIHtOdW1iZXJ9IC0gRGVmYXVsdCBjb29raWVzIGV4cGlyYXRpb24gdGltZSAobWF4LWFnZSkgaW4gbWlsbGlzZWNvbmRzLCBieSBkZWZhdWx0IC0gc2Vzc2lvbiAoZmFsc2UpXG5AcGFyYW0gcnVuT25TZXJ2ZXIge0Jvb2xlYW59IC0gRXhwb3NlIENvb2tpZXMgY2xhc3MgdG8gU2VydmVyXG5AcGFyYW0gcmVzcG9uc2Uge2h0dHAuU2VydmVyUmVzcG9uc2V8T2JqZWN0fSAtIFRoaXMgb2JqZWN0IGlzIGNyZWF0ZWQgaW50ZXJuYWxseSBieSBhIEhUVFAgc2VydmVyXG5Ac3VtbWFyeSBJbnRlcm5hbCBDbGFzc1xuICovXG5jbGFzcyBfX2Nvb2tpZXMge1xuICBjb25zdHJ1Y3RvcihfY29va2llcywgVFRMLCBydW5PblNlcnZlciwgcmVzcG9uc2UpIHtcbiAgICB0aGlzLlRUTCAgICAgICAgID0gVFRMO1xuICAgIHRoaXMucmVzcG9uc2UgICAgPSByZXNwb25zZTtcbiAgICB0aGlzLnJ1bk9uU2VydmVyID0gcnVuT25TZXJ2ZXI7XG5cbiAgICBpZiAoXy5pc09iamVjdChfY29va2llcykpIHtcbiAgICAgIHRoaXMuY29va2llcyA9IF9jb29raWVzO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvb2tpZXMgPSBwYXJzZShfY29va2llcyk7XG4gICAgfVxuICB9XG5cbiAgLypcbiAgQGxvY3VzIEFueXdoZXJlXG4gIEBtZW1iZXJPZiBfX2Nvb2tpZXNcbiAgQG5hbWUgZ2V0XG4gIEBwYXJhbSB7U3RyaW5nfSBrZXkgIC0gVGhlIG5hbWUgb2YgdGhlIGNvb2tpZSB0byByZWFkXG4gIEBwYXJhbSB7U3RyaW5nfSBfdG1wIC0gVW5wYXJzZWQgc3RyaW5nIGluc3RlYWQgb2YgdXNlcidzIGNvb2tpZXNcbiAgQHN1bW1hcnkgUmVhZCBhIGNvb2tpZS4gSWYgdGhlIGNvb2tpZSBkb2Vzbid0IGV4aXN0IGEgbnVsbCB2YWx1ZSB3aWxsIGJlIHJldHVybmVkLlxuICBAcmV0dXJucyB7U3RyaW5nfHZvaWR9XG4gICAqL1xuICBnZXQoa2V5LCBfdG1wKSB7XG4gICAgY29uc3QgX2NzID0gX3RtcCA/IHBhcnNlKF90bXApIDogdGhpcy5jb29raWVzO1xuICAgIGlmICgha2V5IHx8ICFfY3MpIHtcbiAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgfVxuXG4gICAgaWYgKF9jcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICByZXR1cm4gX2NzW2tleV07XG4gICAgfVxuXG4gICAgcmV0dXJuIHZvaWQgMDtcbiAgfVxuXG4gIC8qXG4gIEBsb2N1cyBBbnl3aGVyZVxuICBAbWVtYmVyT2YgX19jb29raWVzXG4gIEBuYW1lIHNldFxuICBAcGFyYW0ge1N0cmluZ30gIGtleSAgIC0gVGhlIG5hbWUgb2YgdGhlIGNvb2tpZSB0byBjcmVhdGUvb3ZlcndyaXRlXG4gIEBwYXJhbSB7U3RyaW5nfSAgdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIGNvb2tpZVxuICBAcGFyYW0ge09iamVjdH0gIG9wdHMgIC0gW09wdGlvbmFsXSBDb29raWUgb3B0aW9ucyAoc2VlIHJlYWRtZSBkb2NzKVxuICBAc3VtbWFyeSBDcmVhdGUvb3ZlcndyaXRlIGEgY29va2llLlxuICBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNldChrZXksIHZhbHVlLCBvcHRzID0ge30pIHtcbiAgICBpZiAoa2V5ICYmICFfLmlzVW5kZWZpbmVkKHZhbHVlKSkge1xuICAgICAgaWYgKF8uaXNOdW1iZXIodGhpcy5UVEwpICYmIG9wdHMuZXhwaXJlcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG9wdHMuZXhwaXJlcyA9IG5ldyBEYXRlKCtuZXcgRGF0ZSgpICsgdGhpcy5UVEwpO1xuICAgICAgfVxuICAgICAgY29uc3QgbmV3Q29va2llID0gc2VyaWFsaXplKGtleSwgdmFsdWUsIG9wdHMpO1xuICAgICAgdGhpcy5jb29raWVzW2tleV0gPSB2YWx1ZTtcbiAgICAgIGlmIChNZXRlb3IuaXNDbGllbnQpIHtcbiAgICAgICAgZG9jdW1lbnQuY29va2llID0gbmV3Q29va2llO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5yZXNwb25zZS5zZXRIZWFkZXIoJ1NldC1Db29raWUnLCBuZXdDb29raWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qXG4gIEBsb2N1cyBBbnl3aGVyZVxuICBAbWVtYmVyT2YgX19jb29raWVzXG4gIEBuYW1lIHJlbW92ZVxuICBAcGFyYW0ge1N0cmluZ30ga2V5ICAgIC0gVGhlIG5hbWUgb2YgdGhlIGNvb2tpZSB0byBjcmVhdGUvb3ZlcndyaXRlXG4gIEBwYXJhbSB7U3RyaW5nfSBwYXRoICAgLSBbT3B0aW9uYWxdIFRoZSBwYXRoIGZyb20gd2hlcmUgdGhlIGNvb2tpZSB3aWxsIGJlXG4gIHJlYWRhYmxlLiBFLmcuLCBcIi9cIiwgXCIvbXlkaXJcIjsgaWYgbm90IHNwZWNpZmllZCwgZGVmYXVsdHMgdG8gdGhlIGN1cnJlbnRcbiAgcGF0aCBvZiB0aGUgY3VycmVudCBkb2N1bWVudCBsb2NhdGlvbiAoc3RyaW5nIG9yIG51bGwpLiBUaGUgcGF0aCBtdXN0IGJlXG4gIGFic29sdXRlIChzZWUgUkZDIDI5NjUpLiBGb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiBob3cgdG8gdXNlIHJlbGF0aXZlIHBhdGhzXG4gIGluIHRoaXMgYXJndW1lbnQsIHNlZTogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL2RvY3VtZW50LmNvb2tpZSNVc2luZ19yZWxhdGl2ZV9VUkxzX2luX3RoZV9wYXRoX3BhcmFtZXRlclxuICBAcGFyYW0ge1N0cmluZ30gZG9tYWluIC0gW09wdGlvbmFsXSBUaGUgZG9tYWluIGZyb20gd2hlcmUgdGhlIGNvb2tpZSB3aWxsXG4gIGJlIHJlYWRhYmxlLiBFLmcuLCBcImV4YW1wbGUuY29tXCIsIFwiLmV4YW1wbGUuY29tXCIgKGluY2x1ZGVzIGFsbCBzdWJkb21haW5zKVxuICBvciBcInN1YmRvbWFpbi5leGFtcGxlLmNvbVwiOyBpZiBub3Qgc3BlY2lmaWVkLCBkZWZhdWx0cyB0byB0aGUgaG9zdCBwb3J0aW9uXG4gIG9mIHRoZSBjdXJyZW50IGRvY3VtZW50IGxvY2F0aW9uIChzdHJpbmcgb3IgbnVsbCkuXG4gIEBzdW1tYXJ5IFJlbW92ZSBhIGNvb2tpZShzKS5cbiAgQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICByZW1vdmUoa2V5LCBwYXRoID0gJy8nLCBkb21haW4gPSAnJykge1xuICAgIGlmIChrZXkgJiYgdGhpcy5jb29raWVzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgIGNvbnN0IG5ld0Nvb2tpZSA9IHNlcmlhbGl6ZShrZXksICcnLCB7XG4gICAgICAgIGRvbWFpbixcbiAgICAgICAgcGF0aCxcbiAgICAgICAgZXhwaXJlczogbmV3IERhdGUoMClcbiAgICAgIH0pO1xuXG4gICAgICBkZWxldGUgdGhpcy5jb29raWVzW2tleV07XG4gICAgICBpZiAoTWV0ZW9yLmlzQ2xpZW50KSB7XG4gICAgICAgIGRvY3VtZW50LmNvb2tpZSA9IG5ld0Nvb2tpZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucmVzcG9uc2Uuc2V0SGVhZGVyKCdTZXQtQ29va2llJywgbmV3Q29va2llKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAoIWtleSAmJiB0aGlzLmtleXMoKS5sZW5ndGggPiAwICYmIHRoaXMua2V5cygpWzBdICE9PSAnJykge1xuICAgICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuY29va2llcyk7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5yZW1vdmUoa2V5c1tpXSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLypcbiAgQGxvY3VzIEFueXdoZXJlXG4gIEBtZW1iZXJPZiBfX2Nvb2tpZXNcbiAgQG5hbWUgaGFzXG4gIEBwYXJhbSB7U3RyaW5nfSBrZXkgIC0gVGhlIG5hbWUgb2YgdGhlIGNvb2tpZSB0byBjcmVhdGUvb3ZlcndyaXRlXG4gIEBwYXJhbSB7U3RyaW5nfSBfdG1wIC0gVW5wYXJzZWQgc3RyaW5nIGluc3RlYWQgb2YgdXNlcidzIGNvb2tpZXNcbiAgQHN1bW1hcnkgQ2hlY2sgd2hldGhlciBhIGNvb2tpZSBleGlzdHMgaW4gdGhlIGN1cnJlbnQgcG9zaXRpb24uXG4gIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaGFzKGtleSwgX3RtcCkge1xuICAgIGNvbnN0IF9jcyA9IF90bXAgPyBwYXJzZShfdG1wKSA6IHRoaXMuY29va2llcztcbiAgICBpZiAoIWtleSB8fCAhX2NzKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIF9jcy5oYXNPd25Qcm9wZXJ0eShrZXkpO1xuICB9XG5cbiAgLypcbiAgQGxvY3VzIEFueXdoZXJlXG4gIEBtZW1iZXJPZiBfX2Nvb2tpZXNcbiAgQG5hbWUga2V5c1xuICBAc3VtbWFyeSBSZXR1cm5zIGFuIGFycmF5IG9mIGFsbCByZWFkYWJsZSBjb29raWVzIGZyb20gdGhpcyBsb2NhdGlvbi5cbiAgQHJldHVybnMge1tTdHJpbmddfVxuICAgKi9cbiAga2V5cygpIHtcbiAgICBpZiAodGhpcy5jb29raWVzKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5jb29raWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgLypcbiAgQGxvY3VzIENsaWVudFxuICBAbWVtYmVyT2YgX19jb29raWVzXG4gIEBuYW1lIHNlbmRcbiAgQHBhcmFtIGNiIHtGdW5jdGlvbn0gLSBDYWxsYmFja1xuICBAc3VtbWFyeSBTZW5kIGFsbCBjb29raWVzIG92ZXIgWEhSIHRvIHNlcnZlci5cbiAgQHJldHVybnMge3ZvaWR9XG4gICAqL1xuICBzZW5kKGNiID0gTm9PcCkge1xuICAgIGlmIChNZXRlb3IuaXNTZXJ2ZXIpIHtcbiAgICAgIGNiKG5ldyBNZXRlb3IuRXJyb3IoNDAwLCAnQ2FuXFwndCBydW4gYC5zZW5kKClgIG9uIHNlcnZlciwgaXRcXCdzIENsaWVudCBvbmx5IG1ldGhvZCEnKSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucnVuT25TZXJ2ZXIpIHtcbiAgICAgIEhUVFAuZ2V0KGAke3dpbmRvdy5fX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYIHx8ICcnfS9fX19jb29raWVfX18vc2V0YCwgY2IpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYihuZXcgTWV0ZW9yLkVycm9yKDQwMCwgJ0NhblxcJ3Qgc2VuZCBjb29raWVzIG9uIHNlcnZlciB3aGVuIGBydW5PblNlcnZlcmAgaXMgZmFsc2UuJykpO1xuICAgIH1cbiAgICByZXR1cm4gdm9pZCAwO1xuICB9XG59XG5cblxuLypcbkBmdW5jdGlvblxuQGxvY3VzIFNlcnZlclxuQHN1bW1hcnkgTWlkZGxld2FyZSBoYW5kbGVyXG5AcHJpdmF0ZVxuICovXG5jb25zdCBfX21pZGRsZXdhcmVIYW5kbGVyID0gKHJlcSwgcmVzLCBzZWxmKSA9PiB7XG4gIGxldCBfY29va2llcyA9IHt9O1xuICBpZiAoc2VsZi5ydW5PblNlcnZlcikge1xuICAgIGlmIChyZXEuaGVhZGVycyAmJiByZXEuaGVhZGVycy5jb29raWUpIHtcbiAgICAgIF9jb29raWVzID0gcGFyc2UocmVxLmhlYWRlcnMuY29va2llKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBfX2Nvb2tpZXMoX2Nvb2tpZXMsIHNlbGYuVFRMLCBzZWxmLnJ1bk9uU2VydmVyLCByZXMpO1xuICB9XG5cbiAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDAsICdDYW5cXCd0IHVzZSBtaWRkbGV3YXJlIHdoZW4gYHJ1bk9uU2VydmVyYCBpcyBmYWxzZS4nKTtcbn07XG5cblxuLypcbkBsb2N1cyBBbnl3aGVyZVxuQGNsYXNzIENvb2tpZXNcbkBwYXJhbSBvcHRzIHtPYmplY3R9XG5AcGFyYW0gb3B0cy5UVEwge051bWJlcn0gLSBEZWZhdWx0IGNvb2tpZXMgZXhwaXJhdGlvbiB0aW1lIChtYXgtYWdlKSBpbiBtaWxsaXNlY29uZHMsIGJ5IGRlZmF1bHQgLSBzZXNzaW9uIChmYWxzZSlcbkBwYXJhbSBvcHRzLmF1dG8ge0Jvb2xlYW59IC0gW1NlcnZlcl0gQXV0by1iaW5kIGluIG1pZGRsZXdhcmUgYXMgYHJlcS5Db29raWVzYCwgYnkgZGVmYXVsdCBgdHJ1ZWBcbkBwYXJhbSBvcHRzLmhhbmRsZXIge0Z1bmN0aW9ufSAtIFtTZXJ2ZXJdIE1pZGRsZXdhcmUgaGFuZGxlclxuQHBhcmFtIG9wdHMucnVuT25TZXJ2ZXIge0Jvb2xlYW59IC0gRXhwb3NlIENvb2tpZXMgY2xhc3MgdG8gU2VydmVyXG5Ac3VtbWFyeSBNYWluIENvb2tpZSBjbGFzc1xuICovXG5jbGFzcyBDb29raWVzIGV4dGVuZHMgX19jb29raWVzIHtcbiAgY29uc3RydWN0b3Iob3B0cyA9IHt9KSB7XG4gICAgb3B0cy5UVEwgPSBfLmlzTnVtYmVyKG9wdHMuVFRMKSA/IG9wdHMuVFRMIDogZmFsc2U7XG4gICAgb3B0cy5ydW5PblNlcnZlciA9IChvcHRzLnJ1bk9uU2VydmVyICE9PSBmYWxzZSkgPyB0cnVlIDogZmFsc2U7XG5cbiAgICBpZiAoTWV0ZW9yLmlzQ2xpZW50KSB7XG4gICAgICBzdXBlcihkb2N1bWVudC5jb29raWUsIG9wdHMuVFRMLCBvcHRzLnJ1bk9uU2VydmVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3VwZXIoe30sIG9wdHMuVFRMLCBvcHRzLnJ1bk9uU2VydmVyKTtcbiAgICAgIG9wdHMuYXV0byAgICAgICAgPSBvcHRzLmF1dG8gIT09IGZhbHNlID8gdHJ1ZSA6IGZhbHNlO1xuICAgICAgdGhpcy5oYW5kbGVyICAgICA9IG9wdHMuaGFuZGxlciB8fCAoKCkgPT4ge30pO1xuICAgICAgdGhpcy5ydW5PblNlcnZlciA9IG9wdHMucnVuT25TZXJ2ZXI7XG5cbiAgICAgIGlmICh0aGlzLnJ1bk9uU2VydmVyKSB7XG4gICAgICAgIGlmICghQ29va2llcy5pc0xvYWRlZE9uU2VydmVyKSB7XG4gICAgICAgICAgaWYgKG9wdHMuYXV0bykge1xuICAgICAgICAgICAgV2ViQXBwLmNvbm5lY3RIYW5kbGVycy51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICAgICAgICAgIGlmICh1cmxSRS50ZXN0KHJlcS5fcGFyc2VkVXJsLnBhdGgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlcS5oZWFkZXJzICYmIHJlcS5oZWFkZXJzLmNvb2tpZSkge1xuICAgICAgICAgICAgICAgICAgY29uc3QgX2NPYmogID0gcGFyc2UocmVxLmhlYWRlcnMuY29va2llKTtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IF9jS2V5cyA9IE9iamVjdC5rZXlzKF9jT2JqKTtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IF9jQXJyICA9IFtdO1xuICAgICAgICAgICAgICAgICAgbGV0ICAgX2NTdHI7XG5cbiAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgX2NLZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIF9jU3RyID0gc2VyaWFsaXplKF9jS2V5c1tpXSwgX2NPYmpbX2NLZXlzW2ldXSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghfl9jQXJyLmluZGV4T2YoX2NTdHIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgX2NBcnIucHVzaChfY1N0cik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignU2V0LUNvb2tpZScsIF9jQXJyKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XG4gICAgICAgICAgICAgICAgcmVzLmVuZCgnJyk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVxLkNvb2tpZXMgPSBfX21pZGRsZXdhcmVIYW5kbGVyKHJlcSwgcmVzLCB0aGlzKTtcbiAgICAgICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBDb29raWVzLmlzTG9hZGVkT25TZXJ2ZXIgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cblxuICAvKlxuICBAbG9jdXMgU2VydmVyXG4gIEBtZW1iZXJPZiBDb29raWVzXG4gIEBuYW1lIG1pZGRsZXdhcmVcbiAgQHN1bW1hcnkgR2V0IENvb2tpZXMgaW5zdGFuY2UgaW50byBjYWxsYmFja1xuICBAcmV0dXJucyB7dm9pZH1cbiAgICovXG4gIG1pZGRsZXdhcmUoKSB7XG4gICAgaWYgKCFNZXRlb3IuaXNTZXJ2ZXIpIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNTAwLCAnW29zdHJpbzpjb29raWVzXSBDYW5cXCd0IHVzZSBgLm1pZGRsZXdhcmUoKWAgb24gQ2xpZW50LCBpdFxcJ3MgU2VydmVyIG9ubHkhJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgdGhpcy5oYW5kbGVyICYmIHRoaXMuaGFuZGxlcihfX21pZGRsZXdhcmVIYW5kbGVyKHJlcSwgcmVzLCB0aGlzKSk7XG4gICAgICBuZXh0KCk7XG4gICAgfTtcbiAgfVxufVxuXG5pZiAoTWV0ZW9yLmlzU2VydmVyKSB7XG4gIENvb2tpZXMuaXNMb2FkZWRPblNlcnZlciA9IGZhbHNlO1xufVxuXG4vKiBFeHBvcnQgdGhlIENvb2tpZXMgY2xhc3MgKi9cbmV4cG9ydCB7IENvb2tpZXMgfTtcbiJdfQ==
