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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/ostrio_cookies/cookies.js                                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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

const urlRE = /\/___cookie___\/set/; /*
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
const pairSplitRegExp = /; */; /*
                               RegExp to match field-content in RFC 7230 sec 3.2
                               
                               field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
                               field-vchar   = VCHAR / obs-text
                               obs-text      = %x80-FF
                                */
const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/; /*
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
}; /*
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
}; /*
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
}; /*
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
  } /*
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
  } /*
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
  } /*
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
  } /*
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
  } /*
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
  } /*
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

} /*
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
}; /*
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
  } /*
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
} /* Export the Cookies class */
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

//# sourceURL=meteor://💻app/packages/ostrio_cookies.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmNvb2tpZXMvY29va2llcy5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJDb29raWVzIiwiXyIsIndhdGNoIiwicmVxdWlyZSIsInYiLCJNZXRlb3IiLCJIVFRQIiwiV2ViQXBwIiwiaXNTZXJ2ZXIiLCJOb09wIiwidXJsUkUiLCJkZWNvZGUiLCJkZWNvZGVVUklDb21wb25lbnQiLCJlbmNvZGUiLCJlbmNvZGVVUklDb21wb25lbnQiLCJwYWlyU3BsaXRSZWdFeHAiLCJmaWVsZENvbnRlbnRSZWdFeHAiLCJwYXJzZSIsInN0ciIsIm9wdGlvbnMiLCJFcnJvciIsIm9iaiIsIm9wdCIsInZhbCIsImtleSIsImVxSW5keCIsInNwbGl0IiwiZm9yRWFjaCIsInBhaXIiLCJpbmRleE9mIiwic3Vic3RyIiwidHJpbSIsImxlbmd0aCIsInNsaWNlIiwidHJ5RGVjb2RlIiwic2VyaWFsaXplIiwibmFtZSIsInRlc3QiLCJlc2NhcGUiLCJ2YWx1ZSIsImlzVW5kZWZpbmVkIiwicGFpcnMiLCJpc051bWJlciIsIm1heEFnZSIsInB1c2giLCJkb21haW4iLCJpc1N0cmluZyIsInBhdGgiLCJleHBpcmVzIiwiZXhwaXJlIiwiSW5maW5pdHkiLCJEYXRlIiwidG9VVENTdHJpbmciLCJodHRwT25seSIsInNlY3VyZSIsImZpcnN0UGFydHlPbmx5Iiwic2FtZVNpdGUiLCJqb2luIiwiZCIsImUiLCJfX2Nvb2tpZXMiLCJjb25zdHJ1Y3RvciIsIl9jb29raWVzIiwiVFRMIiwicnVuT25TZXJ2ZXIiLCJyZXNwb25zZSIsImlzT2JqZWN0IiwiY29va2llcyIsImdldCIsIl90bXAiLCJfY3MiLCJoYXNPd25Qcm9wZXJ0eSIsInNldCIsIm9wdHMiLCJ1bmRlZmluZWQiLCJuZXdDb29raWUiLCJpc0NsaWVudCIsImRvY3VtZW50IiwiY29va2llIiwic2V0SGVhZGVyIiwicmVtb3ZlIiwia2V5cyIsIk9iamVjdCIsImkiLCJoYXMiLCJzZW5kIiwiY2IiLCJ3aW5kb3ciLCJfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIiwiUk9PVF9VUkxfUEFUSF9QUkVGSVgiLCJfX21pZGRsZXdhcmVIYW5kbGVyIiwicmVxIiwicmVzIiwic2VsZiIsImhlYWRlcnMiLCJhdXRvIiwiaGFuZGxlciIsImlzTG9hZGVkT25TZXJ2ZXIiLCJjb25uZWN0SGFuZGxlcnMiLCJ1c2UiLCJuZXh0IiwiX3BhcnNlZFVybCIsIl9jT2JqIiwiX2NLZXlzIiwiX2NBcnIiLCJfY1N0ciIsIndyaXRlSGVhZCIsImVuZCIsIm1pZGRsZXdhcmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE9BQU9DLE1BQVAsQ0FBYztBQUFDQyxXQUFRLE1BQUlBO0FBQWIsQ0FBZDs7QUFBcUMsSUFBSUMsQ0FBSjs7QUFBTUgsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLG1CQUFSLENBQWIsRUFBMEM7QUFBQ0YsSUFBRUcsQ0FBRixFQUFJO0FBQUNILFFBQUVHLENBQUY7QUFBSTs7QUFBVixDQUExQyxFQUFzRCxDQUF0RDtBQUF5RCxJQUFJQyxNQUFKO0FBQVdQLE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSxlQUFSLENBQWIsRUFBc0M7QUFBQ0UsU0FBT0QsQ0FBUCxFQUFTO0FBQUNDLGFBQU9ELENBQVA7QUFBUzs7QUFBcEIsQ0FBdEMsRUFBNEQsQ0FBNUQ7QUFHL0csSUFBSUUsSUFBSjtBQUNBLElBQUlDLE1BQUo7O0FBRUEsSUFBSUYsT0FBT0csUUFBWCxFQUFxQjtBQUNuQkQsV0FBU0osUUFBUSxlQUFSLEVBQXlCSSxNQUFsQztBQUNELENBRkQsTUFFTztBQUNMRCxTQUFPSCxRQUFRLGFBQVIsRUFBdUJHLElBQTlCO0FBQ0Q7O0FBRUQsTUFBTUcsT0FBUSxNQUFNLENBQUUsQ0FBdEI7O0FBQ0EsTUFBTUMsUUFBUSxxQkFBZCxDLENBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBNkJBLE1BQU1DLFNBQVNDLGtCQUFmO0FBQ0EsTUFB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ZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBfIH0gICAgICBmcm9tICdtZXRlb3IvdW5kZXJzY29yZSc7XG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcblxubGV0IEhUVFA7XG5sZXQgV2ViQXBwO1xuXG5pZiAoTWV0ZW9yLmlzU2VydmVyKSB7XG4gIFdlYkFwcCA9IHJlcXVpcmUoJ21ldGVvci93ZWJhcHAnKS5XZWJBcHA7XG59IGVsc2Uge1xuICBIVFRQID0gcmVxdWlyZSgnbWV0ZW9yL2h0dHAnKS5IVFRQO1xufVxuXG5jb25zdCBOb09wICA9ICgpID0+IHt9O1xuY29uc3QgdXJsUkUgPSAvXFwvX19fY29va2llX19fXFwvc2V0Lztcbi8qXG5AdXJsIGh0dHBzOi8vZ2l0aHViLmNvbS9qc2h0dHAvY29va2llL2Jsb2IvbWFzdGVyL2luZGV4LmpzXG5AbmFtZSBjb29raWVcbkBhdXRob3IganNodHRwXG5AbGljZW5zZVxuKFRoZSBNSVQgTGljZW5zZSlcblxuQ29weXJpZ2h0IChjKSAyMDEyLTIwMTQgUm9tYW4gU2h0eWxtYW4gPHNodHlsbWFuQGdtYWlsLmNvbT5cbkNvcHlyaWdodCAoYykgMjAxNSBEb3VnbGFzIENocmlzdG9waGVyIFdpbHNvbiA8ZG91Z0Bzb21ldGhpbmdkb3VnLmNvbT5cblxuUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nXG5hIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbidTb2Z0d2FyZScpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbndpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbmRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0b1xucGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvXG50aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cblRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlXG5pbmNsdWRlZCBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEICdBUyBJUycsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsXG5FWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbk1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC5cbklOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZXG5DTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULFxuVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEVcblNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuICovXG5jb25zdCBkZWNvZGUgPSBkZWNvZGVVUklDb21wb25lbnQ7XG5jb25zdCBlbmNvZGUgPSBlbmNvZGVVUklDb21wb25lbnQ7XG5jb25zdCBwYWlyU3BsaXRSZWdFeHAgPSAvOyAqLztcblxuLypcblJlZ0V4cCB0byBtYXRjaCBmaWVsZC1jb250ZW50IGluIFJGQyA3MjMwIHNlYyAzLjJcblxuZmllbGQtY29udGVudCA9IGZpZWxkLXZjaGFyIFsgMSooIFNQIC8gSFRBQiApIGZpZWxkLXZjaGFyIF1cbmZpZWxkLXZjaGFyICAgPSBWQ0hBUiAvIG9icy10ZXh0XG5vYnMtdGV4dCAgICAgID0gJXg4MC1GRlxuICovXG5jb25zdCBmaWVsZENvbnRlbnRSZWdFeHAgPSAvXltcXHUwMDA5XFx1MDAyMC1cXHUwMDdlXFx1MDA4MC1cXHUwMGZmXSskLztcblxuLypcbkBmdW5jdGlvblxuQG5hbWUgcGFyc2VcbkBwYXJhbSB7U3RyaW5nfSBzdHJcbkBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbkByZXR1cm4ge09iamVjdH1cbkBzdW1tYXJ5XG5QYXJzZSBhIGNvb2tpZSBoZWFkZXIuXG5QYXJzZSB0aGUgZ2l2ZW4gY29va2llIGhlYWRlciBzdHJpbmcgaW50byBhbiBvYmplY3RcblRoZSBvYmplY3QgaGFzIHRoZSB2YXJpb3VzIGNvb2tpZXMgYXMga2V5cyhuYW1lcykgPT4gdmFsdWVzXG5AcHJpdmF0ZVxuICovXG5jb25zdCBwYXJzZSA9IChzdHIsIG9wdGlvbnMpID0+IHtcbiAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDQsICdhcmd1bWVudCBzdHIgbXVzdCBiZSBhIHN0cmluZycpO1xuICB9XG4gIGNvbnN0IG9iaiA9IHt9O1xuICBjb25zdCBvcHQgPSBvcHRpb25zIHx8IHt9O1xuICBsZXQgdmFsO1xuICBsZXQga2V5O1xuICBsZXQgZXFJbmR4O1xuXG4gIHN0ci5zcGxpdChwYWlyU3BsaXRSZWdFeHApLmZvckVhY2goKHBhaXIpID0+IHtcbiAgICBlcUluZHggPSBwYWlyLmluZGV4T2YoJz0nKTtcbiAgICBpZiAoZXFJbmR4IDwgMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBrZXkgPSBwYWlyLnN1YnN0cigwLCBlcUluZHgpLnRyaW0oKTtcbiAgICB2YWwgPSBwYWlyLnN1YnN0cigrK2VxSW5keCwgcGFpci5sZW5ndGgpLnRyaW0oKTtcbiAgICBpZiAodmFsWzBdID09PSAnXCInKSB7XG4gICAgICB2YWwgPSB2YWwuc2xpY2UoMSwgLTEpO1xuICAgIH1cbiAgICBpZiAodm9pZCAwID09PSBvYmpba2V5XSkge1xuICAgICAgb2JqW2tleV0gPSB0cnlEZWNvZGUodmFsLCAob3B0LmRlY29kZSB8fCBkZWNvZGUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb2JqO1xufTtcblxuLypcbkBmdW5jdGlvblxuQG5hbWUgc2VyaWFsaXplXG5AcGFyYW0ge1N0cmluZ30gbmFtZVxuQHBhcmFtIHtTdHJpbmd9IHZhbFxuQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuQHJldHVybiB7U3RyaW5nfVxuQHN1bW1hcnlcblNlcmlhbGl6ZSBkYXRhIGludG8gYSBjb29raWUgaGVhZGVyLlxuU2VyaWFsaXplIHRoZSBhIG5hbWUgdmFsdWUgcGFpciBpbnRvIGEgY29va2llIHN0cmluZyBzdWl0YWJsZSBmb3Jcbmh0dHAgaGVhZGVycy4gQW4gb3B0aW9uYWwgb3B0aW9ucyBvYmplY3Qgc3BlY2lmaWVkIGNvb2tpZSBwYXJhbWV0ZXJzLlxuc2VyaWFsaXplKCdmb28nLCAnYmFyJywgeyBodHRwT25seTogdHJ1ZSB9KVxuICA9PiBcImZvbz1iYXI7IGh0dHBPbmx5XCJcbkBwcml2YXRlXG4gKi9cbmNvbnN0IHNlcmlhbGl6ZSA9IChrZXksIHZhbCwgb3B0ID0ge30pID0+IHtcbiAgbGV0IG5hbWU7XG5cbiAgaWYgKCFmaWVsZENvbnRlbnRSZWdFeHAudGVzdChrZXkpKSB7XG4gICAgbmFtZSA9IGVzY2FwZShrZXkpO1xuICB9IGVsc2Uge1xuICAgIG5hbWUgPSBrZXk7XG4gIH1cblxuICBsZXQgdmFsdWU7XG4gIGlmICghXy5pc1VuZGVmaW5lZCh2YWwpKSB7XG4gICAgdmFsdWUgPSBlbmNvZGUodmFsKTtcbiAgICBpZiAodmFsdWUgJiYgIWZpZWxkQ29udGVudFJlZ0V4cC50ZXN0KHZhbHVlKSkge1xuICAgICAgdmFsdWUgPSBlc2NhcGUodmFsdWUpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YWx1ZSA9ICcnO1xuICB9XG5cbiAgY29uc3QgcGFpcnMgPSBbYCR7bmFtZX09JHt2YWx1ZX1gXTtcblxuICBpZiAoXy5pc051bWJlcihvcHQubWF4QWdlKSkge1xuICAgIHBhaXJzLnB1c2goYE1heC1BZ2U9JHtvcHQubWF4QWdlfWApO1xuICB9XG5cbiAgaWYgKG9wdC5kb21haW4gJiYgXy5pc1N0cmluZyhvcHQuZG9tYWluKSkge1xuICAgIGlmICghZmllbGRDb250ZW50UmVnRXhwLnRlc3Qob3B0LmRvbWFpbikpIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDA0LCAnb3B0aW9uIGRvbWFpbiBpcyBpbnZhbGlkJyk7XG4gICAgfVxuICAgIHBhaXJzLnB1c2goYERvbWFpbj0ke29wdC5kb21haW59YCk7XG4gIH1cblxuICBpZiAob3B0LnBhdGggJiYgXy5pc1N0cmluZyhvcHQucGF0aCkpIHtcbiAgICBpZiAoIWZpZWxkQ29udGVudFJlZ0V4cC50ZXN0KG9wdC5wYXRoKSkge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDQsICdvcHRpb24gcGF0aCBpcyBpbnZhbGlkJyk7XG4gICAgfVxuICAgIHBhaXJzLnB1c2goYFBhdGg9JHtvcHQucGF0aH1gKTtcbiAgfVxuXG4gIG9wdC5leHBpcmVzID0gb3B0LmV4cGlyZXMgfHwgb3B0LmV4cGlyZSB8fCBmYWxzZTtcbiAgaWYgKG9wdC5leHBpcmVzID09PSBJbmZpbml0eSkge1xuICAgIHBhaXJzLnB1c2goJ0V4cGlyZXM9RnJpLCAzMSBEZWMgOTk5OSAyMzo1OTo1OSBHTVQnKTtcbiAgfSBlbHNlIGlmIChvcHQuZXhwaXJlcyBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICBwYWlycy5wdXNoKGBFeHBpcmVzPSR7b3B0LmV4cGlyZXMudG9VVENTdHJpbmcoKX1gKTtcbiAgfSBlbHNlIGlmIChvcHQuZXhwaXJlcyA9PT0gMCkge1xuICAgIHBhaXJzLnB1c2goJ0V4cGlyZXM9MCcpO1xuICB9IGVsc2UgaWYgKF8uaXNOdW1iZXIob3B0LmV4cGlyZXMpKSB7XG4gICAgcGFpcnMucHVzaChgRXhwaXJlcz0keyhuZXcgRGF0ZShvcHQuZXhwaXJlcykpLnRvVVRDU3RyaW5nKCl9YCk7XG4gIH1cblxuICBpZiAob3B0Lmh0dHBPbmx5KSB7XG4gICAgcGFpcnMucHVzaCgnSHR0cE9ubHknKTtcbiAgfVxuXG4gIGlmIChvcHQuc2VjdXJlKSB7XG4gICAgcGFpcnMucHVzaCgnU2VjdXJlJyk7XG4gIH1cblxuICBpZiAob3B0LmZpcnN0UGFydHlPbmx5KSB7XG4gICAgcGFpcnMucHVzaCgnRmlyc3QtUGFydHktT25seScpO1xuICB9XG5cbiAgaWYgKG9wdC5zYW1lU2l0ZSkge1xuICAgIHBhaXJzLnB1c2goJ1NhbWVTaXRlJyk7XG4gIH1cblxuICByZXR1cm4gcGFpcnMuam9pbignOyAnKTtcbn07XG5cblxuLypcbkBmdW5jdGlvblxuQG5hbWUgdHJ5RGVjb2RlXG5AcGFyYW0ge1N0cmluZ30gc3RyXG5AcGFyYW0ge0Z1bmN0aW9ufSBkXG5Ac3VtbWFyeSBUcnkgZGVjb2RpbmcgYSBzdHJpbmcgdXNpbmcgYSBkZWNvZGluZyBmdW5jdGlvbi5cbkBwcml2YXRlXG4gKi9cbmNvbnN0IHRyeURlY29kZSA9IChzdHIsIGQpID0+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZChzdHIpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufTtcblxuXG4vKlxuQGxvY3VzIEFueXdoZXJlXG5AY2xhc3MgX19jb29raWVzXG5AcGFyYW0gX2Nvb2tpZXMge09iamVjdHxTdHJpbmd9IC0gQ3VycmVudCBjb29raWVzIGFzIFN0cmluZyBvciBPYmplY3RcbkBwYXJhbSBUVEwge051bWJlcn0gLSBEZWZhdWx0IGNvb2tpZXMgZXhwaXJhdGlvbiB0aW1lIChtYXgtYWdlKSBpbiBtaWxsaXNlY29uZHMsIGJ5IGRlZmF1bHQgLSBzZXNzaW9uIChmYWxzZSlcbkBwYXJhbSBydW5PblNlcnZlciB7Qm9vbGVhbn0gLSBFeHBvc2UgQ29va2llcyBjbGFzcyB0byBTZXJ2ZXJcbkBwYXJhbSByZXNwb25zZSB7aHR0cC5TZXJ2ZXJSZXNwb25zZXxPYmplY3R9IC0gVGhpcyBvYmplY3QgaXMgY3JlYXRlZCBpbnRlcm5hbGx5IGJ5IGEgSFRUUCBzZXJ2ZXJcbkBzdW1tYXJ5IEludGVybmFsIENsYXNzXG4gKi9cbmNsYXNzIF9fY29va2llcyB7XG4gIGNvbnN0cnVjdG9yKF9jb29raWVzLCBUVEwsIHJ1bk9uU2VydmVyLCByZXNwb25zZSkge1xuICAgIHRoaXMuVFRMICAgICAgICAgPSBUVEw7XG4gICAgdGhpcy5yZXNwb25zZSAgICA9IHJlc3BvbnNlO1xuICAgIHRoaXMucnVuT25TZXJ2ZXIgPSBydW5PblNlcnZlcjtcblxuICAgIGlmIChfLmlzT2JqZWN0KF9jb29raWVzKSkge1xuICAgICAgdGhpcy5jb29raWVzID0gX2Nvb2tpZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY29va2llcyA9IHBhcnNlKF9jb29raWVzKTtcbiAgICB9XG4gIH1cblxuICAvKlxuICBAbG9jdXMgQW55d2hlcmVcbiAgQG1lbWJlck9mIF9fY29va2llc1xuICBAbmFtZSBnZXRcbiAgQHBhcmFtIHtTdHJpbmd9IGtleSAgLSBUaGUgbmFtZSBvZiB0aGUgY29va2llIHRvIHJlYWRcbiAgQHBhcmFtIHtTdHJpbmd9IF90bXAgLSBVbnBhcnNlZCBzdHJpbmcgaW5zdGVhZCBvZiB1c2VyJ3MgY29va2llc1xuICBAc3VtbWFyeSBSZWFkIGEgY29va2llLiBJZiB0aGUgY29va2llIGRvZXNuJ3QgZXhpc3QgYSBudWxsIHZhbHVlIHdpbGwgYmUgcmV0dXJuZWQuXG4gIEByZXR1cm5zIHtTdHJpbmd8dm9pZH1cbiAgICovXG4gIGdldChrZXksIF90bXApIHtcbiAgICBjb25zdCBfY3MgPSBfdG1wID8gcGFyc2UoX3RtcCkgOiB0aGlzLmNvb2tpZXM7XG4gICAgaWYgKCFrZXkgfHwgIV9jcykge1xuICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICB9XG5cbiAgICBpZiAoX2NzLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgIHJldHVybiBfY3Nba2V5XTtcbiAgICB9XG5cbiAgICByZXR1cm4gdm9pZCAwO1xuICB9XG5cbiAgLypcbiAgQGxvY3VzIEFueXdoZXJlXG4gIEBtZW1iZXJPZiBfX2Nvb2tpZXNcbiAgQG5hbWUgc2V0XG4gIEBwYXJhbSB7U3RyaW5nfSAga2V5ICAgLSBUaGUgbmFtZSBvZiB0aGUgY29va2llIHRvIGNyZWF0ZS9vdmVyd3JpdGVcbiAgQHBhcmFtIHtTdHJpbmd9ICB2YWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgY29va2llXG4gIEBwYXJhbSB7T2JqZWN0fSAgb3B0cyAgLSBbT3B0aW9uYWxdIENvb2tpZSBvcHRpb25zIChzZWUgcmVhZG1lIGRvY3MpXG4gIEBzdW1tYXJ5IENyZWF0ZS9vdmVyd3JpdGUgYSBjb29raWUuXG4gIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2V0KGtleSwgdmFsdWUsIG9wdHMgPSB7fSkge1xuICAgIGlmIChrZXkgJiYgIV8uaXNVbmRlZmluZWQodmFsdWUpKSB7XG4gICAgICBpZiAoXy5pc051bWJlcih0aGlzLlRUTCkgJiYgb3B0cy5leHBpcmVzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgb3B0cy5leHBpcmVzID0gbmV3IERhdGUoK25ldyBEYXRlKCkgKyB0aGlzLlRUTCk7XG4gICAgICB9XG4gICAgICBjb25zdCBuZXdDb29raWUgPSBzZXJpYWxpemUoa2V5LCB2YWx1ZSwgb3B0cyk7XG4gICAgICB0aGlzLmNvb2tpZXNba2V5XSA9IHZhbHVlO1xuICAgICAgaWYgKE1ldGVvci5pc0NsaWVudCkge1xuICAgICAgICBkb2N1bWVudC5jb29raWUgPSBuZXdDb29raWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnJlc3BvbnNlLnNldEhlYWRlcignU2V0LUNvb2tpZScsIG5ld0Nvb2tpZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLypcbiAgQGxvY3VzIEFueXdoZXJlXG4gIEBtZW1iZXJPZiBfX2Nvb2tpZXNcbiAgQG5hbWUgcmVtb3ZlXG4gIEBwYXJhbSB7U3RyaW5nfSBrZXkgICAgLSBUaGUgbmFtZSBvZiB0aGUgY29va2llIHRvIGNyZWF0ZS9vdmVyd3JpdGVcbiAgQHBhcmFtIHtTdHJpbmd9IHBhdGggICAtIFtPcHRpb25hbF0gVGhlIHBhdGggZnJvbSB3aGVyZSB0aGUgY29va2llIHdpbGwgYmVcbiAgcmVhZGFibGUuIEUuZy4sIFwiL1wiLCBcIi9teWRpclwiOyBpZiBub3Qgc3BlY2lmaWVkLCBkZWZhdWx0cyB0byB0aGUgY3VycmVudFxuICBwYXRoIG9mIHRoZSBjdXJyZW50IGRvY3VtZW50IGxvY2F0aW9uIChzdHJpbmcgb3IgbnVsbCkuIFRoZSBwYXRoIG11c3QgYmVcbiAgYWJzb2x1dGUgKHNlZSBSRkMgMjk2NSkuIEZvciBtb3JlIGluZm9ybWF0aW9uIG9uIGhvdyB0byB1c2UgcmVsYXRpdmUgcGF0aHNcbiAgaW4gdGhpcyBhcmd1bWVudCwgc2VlOiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvZG9jdW1lbnQuY29va2llI1VzaW5nX3JlbGF0aXZlX1VSTHNfaW5fdGhlX3BhdGhfcGFyYW1ldGVyXG4gIEBwYXJhbSB7U3RyaW5nfSBkb21haW4gLSBbT3B0aW9uYWxdIFRoZSBkb21haW4gZnJvbSB3aGVyZSB0aGUgY29va2llIHdpbGxcbiAgYmUgcmVhZGFibGUuIEUuZy4sIFwiZXhhbXBsZS5jb21cIiwgXCIuZXhhbXBsZS5jb21cIiAoaW5jbHVkZXMgYWxsIHN1YmRvbWFpbnMpXG4gIG9yIFwic3ViZG9tYWluLmV4YW1wbGUuY29tXCI7IGlmIG5vdCBzcGVjaWZpZWQsIGRlZmF1bHRzIHRvIHRoZSBob3N0IHBvcnRpb25cbiAgb2YgdGhlIGN1cnJlbnQgZG9jdW1lbnQgbG9jYXRpb24gKHN0cmluZyBvciBudWxsKS5cbiAgQHN1bW1hcnkgUmVtb3ZlIGEgY29va2llKHMpLlxuICBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHJlbW92ZShrZXksIHBhdGggPSAnLycsIGRvbWFpbiA9ICcnKSB7XG4gICAgaWYgKGtleSAmJiB0aGlzLmNvb2tpZXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgY29uc3QgbmV3Q29va2llID0gc2VyaWFsaXplKGtleSwgJycsIHtcbiAgICAgICAgZG9tYWluLFxuICAgICAgICBwYXRoLFxuICAgICAgICBleHBpcmVzOiBuZXcgRGF0ZSgwKVxuICAgICAgfSk7XG5cbiAgICAgIGRlbGV0ZSB0aGlzLmNvb2tpZXNba2V5XTtcbiAgICAgIGlmIChNZXRlb3IuaXNDbGllbnQpIHtcbiAgICAgICAgZG9jdW1lbnQuY29va2llID0gbmV3Q29va2llO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5yZXNwb25zZS5zZXRIZWFkZXIoJ1NldC1Db29raWUnLCBuZXdDb29raWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICgha2V5ICYmIHRoaXMua2V5cygpLmxlbmd0aCA+IDAgJiYgdGhpcy5rZXlzKClbMF0gIT09ICcnKSB7XG4gICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXModGhpcy5jb29raWVzKTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLnJlbW92ZShrZXlzW2ldKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKlxuICBAbG9jdXMgQW55d2hlcmVcbiAgQG1lbWJlck9mIF9fY29va2llc1xuICBAbmFtZSBoYXNcbiAgQHBhcmFtIHtTdHJpbmd9IGtleSAgLSBUaGUgbmFtZSBvZiB0aGUgY29va2llIHRvIGNyZWF0ZS9vdmVyd3JpdGVcbiAgQHBhcmFtIHtTdHJpbmd9IF90bXAgLSBVbnBhcnNlZCBzdHJpbmcgaW5zdGVhZCBvZiB1c2VyJ3MgY29va2llc1xuICBAc3VtbWFyeSBDaGVjayB3aGV0aGVyIGEgY29va2llIGV4aXN0cyBpbiB0aGUgY3VycmVudCBwb3NpdGlvbi5cbiAgQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBoYXMoa2V5LCBfdG1wKSB7XG4gICAgY29uc3QgX2NzID0gX3RtcCA/IHBhcnNlKF90bXApIDogdGhpcy5jb29raWVzO1xuICAgIGlmICgha2V5IHx8ICFfY3MpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gX2NzLmhhc093blByb3BlcnR5KGtleSk7XG4gIH1cblxuICAvKlxuICBAbG9jdXMgQW55d2hlcmVcbiAgQG1lbWJlck9mIF9fY29va2llc1xuICBAbmFtZSBrZXlzXG4gIEBzdW1tYXJ5IFJldHVybnMgYW4gYXJyYXkgb2YgYWxsIHJlYWRhYmxlIGNvb2tpZXMgZnJvbSB0aGlzIGxvY2F0aW9uLlxuICBAcmV0dXJucyB7W1N0cmluZ119XG4gICAqL1xuICBrZXlzKCkge1xuICAgIGlmICh0aGlzLmNvb2tpZXMpIHtcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLmNvb2tpZXMpO1xuICAgIH1cbiAgICByZXR1cm4gW107XG4gIH1cblxuICAvKlxuICBAbG9jdXMgQ2xpZW50XG4gIEBtZW1iZXJPZiBfX2Nvb2tpZXNcbiAgQG5hbWUgc2VuZFxuICBAcGFyYW0gY2Ige0Z1bmN0aW9ufSAtIENhbGxiYWNrXG4gIEBzdW1tYXJ5IFNlbmQgYWxsIGNvb2tpZXMgb3ZlciBYSFIgdG8gc2VydmVyLlxuICBAcmV0dXJucyB7dm9pZH1cbiAgICovXG4gIHNlbmQoY2IgPSBOb09wKSB7XG4gICAgaWYgKE1ldGVvci5pc1NlcnZlcikge1xuICAgICAgY2IobmV3IE1ldGVvci5FcnJvcig0MDAsICdDYW5cXCd0IHJ1biBgLnNlbmQoKWAgb24gc2VydmVyLCBpdFxcJ3MgQ2xpZW50IG9ubHkgbWV0aG9kIScpKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5ydW5PblNlcnZlcikge1xuICAgICAgSFRUUC5nZXQoYCR7d2luZG93Ll9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkxfUEFUSF9QUkVGSVggfHwgJyd9L19fX2Nvb2tpZV9fXy9zZXRgLCBjYik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNiKG5ldyBNZXRlb3IuRXJyb3IoNDAwLCAnQ2FuXFwndCBzZW5kIGNvb2tpZXMgb24gc2VydmVyIHdoZW4gYHJ1bk9uU2VydmVyYCBpcyBmYWxzZS4nKSk7XG4gICAgfVxuICAgIHJldHVybiB2b2lkIDA7XG4gIH1cbn1cblxuXG4vKlxuQGZ1bmN0aW9uXG5AbG9jdXMgU2VydmVyXG5Ac3VtbWFyeSBNaWRkbGV3YXJlIGhhbmRsZXJcbkBwcml2YXRlXG4gKi9cbmNvbnN0IF9fbWlkZGxld2FyZUhhbmRsZXIgPSAocmVxLCByZXMsIHNlbGYpID0+IHtcbiAgbGV0IF9jb29raWVzID0ge307XG4gIGlmIChzZWxmLnJ1bk9uU2VydmVyKSB7XG4gICAgaWYgKHJlcS5oZWFkZXJzICYmIHJlcS5oZWFkZXJzLmNvb2tpZSkge1xuICAgICAgX2Nvb2tpZXMgPSBwYXJzZShyZXEuaGVhZGVycy5jb29raWUpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IF9fY29va2llcyhfY29va2llcywgc2VsZi5UVEwsIHNlbGYucnVuT25TZXJ2ZXIsIHJlcyk7XG4gIH1cblxuICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMCwgJ0NhblxcJ3QgdXNlIG1pZGRsZXdhcmUgd2hlbiBgcnVuT25TZXJ2ZXJgIGlzIGZhbHNlLicpO1xufTtcblxuXG4vKlxuQGxvY3VzIEFueXdoZXJlXG5AY2xhc3MgQ29va2llc1xuQHBhcmFtIG9wdHMge09iamVjdH1cbkBwYXJhbSBvcHRzLlRUTCB7TnVtYmVyfSAtIERlZmF1bHQgY29va2llcyBleHBpcmF0aW9uIHRpbWUgKG1heC1hZ2UpIGluIG1pbGxpc2Vjb25kcywgYnkgZGVmYXVsdCAtIHNlc3Npb24gKGZhbHNlKVxuQHBhcmFtIG9wdHMuYXV0byB7Qm9vbGVhbn0gLSBbU2VydmVyXSBBdXRvLWJpbmQgaW4gbWlkZGxld2FyZSBhcyBgcmVxLkNvb2tpZXNgLCBieSBkZWZhdWx0IGB0cnVlYFxuQHBhcmFtIG9wdHMuaGFuZGxlciB7RnVuY3Rpb259IC0gW1NlcnZlcl0gTWlkZGxld2FyZSBoYW5kbGVyXG5AcGFyYW0gb3B0cy5ydW5PblNlcnZlciB7Qm9vbGVhbn0gLSBFeHBvc2UgQ29va2llcyBjbGFzcyB0byBTZXJ2ZXJcbkBzdW1tYXJ5IE1haW4gQ29va2llIGNsYXNzXG4gKi9cbmNsYXNzIENvb2tpZXMgZXh0ZW5kcyBfX2Nvb2tpZXMge1xuICBjb25zdHJ1Y3RvcihvcHRzID0ge30pIHtcbiAgICBvcHRzLlRUTCA9IF8uaXNOdW1iZXIob3B0cy5UVEwpID8gb3B0cy5UVEwgOiBmYWxzZTtcbiAgICBvcHRzLnJ1bk9uU2VydmVyID0gKG9wdHMucnVuT25TZXJ2ZXIgIT09IGZhbHNlKSA/IHRydWUgOiBmYWxzZTtcblxuICAgIGlmIChNZXRlb3IuaXNDbGllbnQpIHtcbiAgICAgIHN1cGVyKGRvY3VtZW50LmNvb2tpZSwgb3B0cy5UVEwsIG9wdHMucnVuT25TZXJ2ZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdXBlcih7fSwgb3B0cy5UVEwsIG9wdHMucnVuT25TZXJ2ZXIpO1xuICAgICAgb3B0cy5hdXRvICAgICAgICA9IG9wdHMuYXV0byAhPT0gZmFsc2UgPyB0cnVlIDogZmFsc2U7XG4gICAgICB0aGlzLmhhbmRsZXIgICAgID0gb3B0cy5oYW5kbGVyIHx8ICgoKSA9PiB7fSk7XG4gICAgICB0aGlzLnJ1bk9uU2VydmVyID0gb3B0cy5ydW5PblNlcnZlcjtcblxuICAgICAgaWYgKHRoaXMucnVuT25TZXJ2ZXIpIHtcbiAgICAgICAgaWYgKCFDb29raWVzLmlzTG9hZGVkT25TZXJ2ZXIpIHtcbiAgICAgICAgICBpZiAob3B0cy5hdXRvKSB7XG4gICAgICAgICAgICBXZWJBcHAuY29ubmVjdEhhbmRsZXJzLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgICAgICAgICAgaWYgKHVybFJFLnRlc3QocmVxLl9wYXJzZWRVcmwucGF0aCkpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVxLmhlYWRlcnMgJiYgcmVxLmhlYWRlcnMuY29va2llKSB7XG4gICAgICAgICAgICAgICAgICBjb25zdCBfY09iaiAgPSBwYXJzZShyZXEuaGVhZGVycy5jb29raWUpO1xuICAgICAgICAgICAgICAgICAgY29uc3QgX2NLZXlzID0gT2JqZWN0LmtleXMoX2NPYmopO1xuICAgICAgICAgICAgICAgICAgY29uc3QgX2NBcnIgID0gW107XG4gICAgICAgICAgICAgICAgICBsZXQgICBfY1N0cjtcblxuICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfY0tleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgX2NTdHIgPSBzZXJpYWxpemUoX2NLZXlzW2ldLCBfY09ialtfY0tleXNbaV1dKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF+X2NBcnIuaW5kZXhPZihfY1N0cikpIHtcbiAgICAgICAgICAgICAgICAgICAgICBfY0Fyci5wdXNoKF9jU3RyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdTZXQtQ29va2llJywgX2NBcnIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKCcnKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXEuQ29va2llcyA9IF9fbWlkZGxld2FyZUhhbmRsZXIocmVxLCByZXMsIHRoaXMpO1xuICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIENvb2tpZXMuaXNMb2FkZWRPblNlcnZlciA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuXG4gIC8qXG4gIEBsb2N1cyBTZXJ2ZXJcbiAgQG1lbWJlck9mIENvb2tpZXNcbiAgQG5hbWUgbWlkZGxld2FyZVxuICBAc3VtbWFyeSBHZXQgQ29va2llcyBpbnN0YW5jZSBpbnRvIGNhbGxiYWNrXG4gIEByZXR1cm5zIHt2b2lkfVxuICAgKi9cbiAgbWlkZGxld2FyZSgpIHtcbiAgICBpZiAoIU1ldGVvci5pc1NlcnZlcikge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig1MDAsICdbb3N0cmlvOmNvb2tpZXNdIENhblxcJ3QgdXNlIGAubWlkZGxld2FyZSgpYCBvbiBDbGllbnQsIGl0XFwncyBTZXJ2ZXIgb25seSEnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICB0aGlzLmhhbmRsZXIgJiYgdGhpcy5oYW5kbGVyKF9fbWlkZGxld2FyZUhhbmRsZXIocmVxLCByZXMsIHRoaXMpKTtcbiAgICAgIG5leHQoKTtcbiAgICB9O1xuICB9XG59XG5cbmlmIChNZXRlb3IuaXNTZXJ2ZXIpIHtcbiAgQ29va2llcy5pc0xvYWRlZE9uU2VydmVyID0gZmFsc2U7XG59XG5cbi8qIEV4cG9ydCB0aGUgQ29va2llcyBjbGFzcyAqL1xuZXhwb3J0IHsgQ29va2llcyB9O1xuIl19
