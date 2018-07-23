(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
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
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let HTTP;
let WebApp;

if (Meteor.isServer) {
  WebApp = require('meteor/webapp').WebApp;
} else {
  HTTP = require('meteor/http').HTTP;
}

const NoOp = () => {};

const urlRE = /\/___cookie___\/set/;
const helpers = {
  isUndefined(obj) {
    return obj === void 0;
  },

  isObject(obj) {
    return obj === Object(obj);
  }

};
const _helpers = ['String', 'Number'];

for (let i = 0; i < _helpers.length; i++) {
  helpers['is' + _helpers[i]] = function (obj) {
    return Object.prototype.toString.call(obj) === '[object ' + _helpers[i] + ']';
  };
}
/*
 * @url https://github.com/jshttp/cookie/blob/master/index.js
 * @name cookie
 * @author jshttp
 * @license
 * (The MIT License)
 *
 * Copyright (c) 2012-2014 Roman Shtylman <shtylman@gmail.com>
 * Copyright (c) 2015 Douglas Christopher Wilson <doug@somethingdoug.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


const decode = decodeURIComponent;
const encode = encodeURIComponent;
const pairSplitRegExp = /; */;
/*
 * RegExp to match field-content in RFC 7230 sec 3.2
 *
 * field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
 * field-vchar   = VCHAR / obs-text
 * obs-text      = %x80-FF
 */

const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
/*
 * @function
 * @name tryDecode
 * @param {String} str
 * @param {Function} d
 * @summary Try decoding a string using a decoding function.
 * @private
 */

const tryDecode = (str, d) => {
  try {
    return d(str);
  } catch (e) {
    return str;
  }
};
/*
 * @function
 * @name parse
 * @param {String} str
 * @param {Object} [options]
 * @return {Object}
 * @summary
 * Parse a cookie header.
 * Parse the given cookie header string into an object
 * The object has the various cookies as keys(names) => values
 * @private
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
 * @function
 * @name serialize
 * @param {String} name
 * @param {String} val
 * @param {Object} [options]
 * @return {String}
 * @summary
 * Serialize data into a cookie header.
 * Serialize the a name value pair into a cookie string suitable for
 * http headers. An optional options object specified cookie parameters.
 * serialize('foo', 'bar', { httpOnly: true }) => "foo=bar; httpOnly"
 * @private
 */


const serialize = (key, val, opt = {}) => {
  let name;

  if (!fieldContentRegExp.test(key)) {
    name = escape(key);
  } else {
    name = key;
  }

  let value;

  if (!helpers.isUndefined(val)) {
    value = encode(val);

    if (value && !fieldContentRegExp.test(value)) {
      value = escape(value);
    }
  } else {
    value = '';
  }

  const pairs = [`${name}=${value}`];

  if (helpers.isNumber(opt.maxAge)) {
    pairs.push(`Max-Age=${opt.maxAge}`);
  }

  if (opt.domain && helpers.isString(opt.domain)) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new Meteor.Error(404, 'option domain is invalid');
    }

    pairs.push(`Domain=${opt.domain}`);
  }

  if (opt.path && helpers.isString(opt.path)) {
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
  } else if (helpers.isNumber(opt.expires)) {
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
 * @locus Anywhere
 * @class __cookies
 * @param _cookies {Object|String} - Current cookies as String or Object
 * @param TTL {Number} - Default cookies expiration time (max-age) in milliseconds, by default - session (false)
 * @param runOnServer {Boolean} - Expose Cookies class to Server
 * @param response {http.ServerResponse|Object} - This object is created internally by a HTTP server
 * @summary Internal Class
 */


class __cookies {
  constructor(_cookies, TTL, runOnServer, response) {
    this.TTL = TTL;
    this.response = response;
    this.runOnServer = runOnServer;

    if (helpers.isObject(_cookies)) {
      this.cookies = _cookies;
    } else {
      this.cookies = parse(_cookies);
    }
  }
  /*
   * @locus Anywhere
   * @memberOf __cookies
   * @name get
   * @param {String} key  - The name of the cookie to read
   * @param {String} _tmp - Unparsed string instead of user's cookies
   * @summary Read a cookie. If the cookie doesn't exist a null value will be returned.
   * @returns {String|void}
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
   * @locus Anywhere
   * @memberOf __cookies
   * @name set
   * @param {String}  key   - The name of the cookie to create/overwrite
   * @param {String}  value - The value of the cookie
   * @param {Object}  opts  - [Optional] Cookie options (see readme docs)
   * @summary Create/overwrite a cookie.
   * @returns {Boolean}
   */


  set(key, value, opts = {}) {
    if (key && !helpers.isUndefined(value)) {
      if (helpers.isNumber(this.TTL) && opts.expires === undefined) {
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
   * @locus Anywhere
   * @memberOf __cookies
   * @name remove
   * @param {String} key    - The name of the cookie to create/overwrite
   * @param {String} path   - [Optional] The path from where the cookie will be
   * readable. E.g., "/", "/mydir"; if not specified, defaults to the current
   * path of the current document location (string or null). The path must be
   * absolute (see RFC 2965). For more information on how to use relative paths
   * in this argument, see: https://developer.mozilla.org/en-US/docs/Web/API/document.cookie#Using_relative_URLs_in_the_path_parameter
   * @param {String} domain - [Optional] The domain from where the cookie will
   * be readable. E.g., "example.com", ".example.com" (includes all subdomains)
   * or "subdomain.example.com"; if not specified, defaults to the host portion
   * of the current document location (string or null).
   * @summary Remove a cookie(s).
   * @returns {Boolean}
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
   * @locus Anywhere
   * @memberOf __cookies
   * @name has
   * @param {String} key  - The name of the cookie to create/overwrite
   * @param {String} _tmp - Unparsed string instead of user's cookies
   * @summary Check whether a cookie exists in the current position.
   * @returns {Boolean}
   */


  has(key, _tmp) {
    const _cs = _tmp ? parse(_tmp) : this.cookies;

    if (!key || !_cs) {
      return false;
    }

    return _cs.hasOwnProperty(key);
  }
  /*
   * @locus Anywhere
   * @memberOf __cookies
   * @name keys
   * @summary Returns an array of all readable cookies from this location.
   * @returns {[String]}
   */


  keys() {
    if (this.cookies) {
      return Object.keys(this.cookies);
    }

    return [];
  }
  /*
   * @locus Client
   * @memberOf __cookies
   * @name send
   * @param cb {Function} - Callback
   * @summary Send all cookies over XHR to server.
   * @returns {void}
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
 * @function
 * @locus Server
 * @summary Middleware handler
 * @private
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
 * @locus Anywhere
 * @class Cookies
 * @param opts {Object}
 * @param opts.TTL {Number} - Default cookies expiration time (max-age) in milliseconds, by default - session (false)
 * @param opts.auto {Boolean} - [Server] Auto-bind in middleware as `req.Cookies`, by default `true`
 * @param opts.handler {Function} - [Server] Middleware handler
 * @param opts.runOnServer {Boolean} - Expose Cookies class to Server
 * @summary Main Cookie class
 */


class Cookies extends __cookies {
  constructor(opts = {}) {
    opts.TTL = helpers.isNumber(opts.TTL) ? opts.TTL : false;
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
   * @locus Server
   * @memberOf Cookies
   * @name middleware
   * @summary Get Cookies instance into callback
   * @returns {void}
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
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmNvb2tpZXMvY29va2llcy5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJDb29raWVzIiwiTWV0ZW9yIiwid2F0Y2giLCJyZXF1aXJlIiwidiIsIkhUVFAiLCJXZWJBcHAiLCJpc1NlcnZlciIsIk5vT3AiLCJ1cmxSRSIsImhlbHBlcnMiLCJpc1VuZGVmaW5lZCIsIm9iaiIsImlzT2JqZWN0IiwiT2JqZWN0IiwiX2hlbHBlcnMiLCJpIiwibGVuZ3RoIiwicHJvdG90eXBlIiwidG9TdHJpbmciLCJjYWxsIiwiZGVjb2RlIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiZW5jb2RlIiwiZW5jb2RlVVJJQ29tcG9uZW50IiwicGFpclNwbGl0UmVnRXhwIiwiZmllbGRDb250ZW50UmVnRXhwIiwidHJ5RGVjb2RlIiwic3RyIiwiZCIsImUiLCJwYXJzZSIsIm9wdGlvbnMiLCJFcnJvciIsIm9wdCIsInZhbCIsImtleSIsImVxSW5keCIsInNwbGl0IiwiZm9yRWFjaCIsInBhaXIiLCJpbmRleE9mIiwic3Vic3RyIiwidHJpbSIsInNsaWNlIiwic2VyaWFsaXplIiwibmFtZSIsInRlc3QiLCJlc2NhcGUiLCJ2YWx1ZSIsInBhaXJzIiwiaXNOdW1iZXIiLCJtYXhBZ2UiLCJwdXNoIiwiZG9tYWluIiwiaXNTdHJpbmciLCJwYXRoIiwiZXhwaXJlcyIsImV4cGlyZSIsIkluZmluaXR5IiwiRGF0ZSIsInRvVVRDU3RyaW5nIiwiaHR0cE9ubHkiLCJzZWN1cmUiLCJmaXJzdFBhcnR5T25seSIsInNhbWVTaXRlIiwiam9pbiIsIl9fY29va2llcyIsImNvbnN0cnVjdG9yIiwiX2Nvb2tpZXMiLCJUVEwiLCJydW5PblNlcnZlciIsInJlc3BvbnNlIiwiY29va2llcyIsImdldCIsIl90bXAiLCJfY3MiLCJoYXNPd25Qcm9wZXJ0eSIsInNldCIsIm9wdHMiLCJ1bmRlZmluZWQiLCJuZXdDb29raWUiLCJpc0NsaWVudCIsImRvY3VtZW50IiwiY29va2llIiwic2V0SGVhZGVyIiwicmVtb3ZlIiwia2V5cyIsImhhcyIsInNlbmQiLCJjYiIsIndpbmRvdyIsIl9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18iLCJST09UX1VSTF9QQVRIX1BSRUZJWCIsIl9fbWlkZGxld2FyZUhhbmRsZXIiLCJyZXEiLCJyZXMiLCJzZWxmIiwiaGVhZGVycyIsImF1dG8iLCJoYW5kbGVyIiwiaXNMb2FkZWRPblNlcnZlciIsImNvbm5lY3RIYW5kbGVycyIsInVzZSIsIm5leHQiLCJfcGFyc2VkVXJsIiwiX2NPYmoiLCJfY0tleXMiLCJfY0FyciIsIl9jU3RyIiwid3JpdGVIZWFkIiwiZW5kIiwibWlkZGxld2FyZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxPQUFPQyxNQUFQLENBQWM7QUFBQ0MsV0FBUSxNQUFJQTtBQUFiLENBQWQ7QUFBcUMsSUFBSUMsTUFBSjtBQUFXSCxPQUFPSSxLQUFQLENBQWFDLFFBQVEsZUFBUixDQUFiLEVBQXNDO0FBQUNGLFNBQU9HLENBQVAsRUFBUztBQUFDSCxhQUFPRyxDQUFQO0FBQVM7O0FBQXBCLENBQXRDLEVBQTRELENBQTVEO0FBRWhELElBQUlDLElBQUo7QUFDQSxJQUFJQyxNQUFKOztBQUVBLElBQUlMLE9BQU9NLFFBQVgsRUFBcUI7QUFDbkJELFdBQVNILFFBQVEsZUFBUixFQUF5QkcsTUFBbEM7QUFDRCxDQUZELE1BRU87QUFDTEQsU0FBT0YsUUFBUSxhQUFSLEVBQXVCRSxJQUE5QjtBQUNEOztBQUVELE1BQU1HLE9BQVEsTUFBTSxDQUFFLENBQXRCOztBQUNBLE1BQU1DLFFBQVEscUJBQWQ7QUFDQSxNQUFNQyxVQUFVO0FBQ2RDLGNBQVlDLEdBQVosRUFBaUI7QUFDZixXQUFPQSxRQUFRLEtBQUssQ0FBcEI7QUFDRCxHQUhhOztBQUlkQyxXQUFTRCxHQUFULEVBQWM7QUFDWixXQUFPQSxRQUFRRSxPQUFPRixHQUFQLENBQWY7QUFDRDs7QUFOYSxDQUFoQjtBQVFB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QyxLQUFYLENBQWlCLEdBQWpCLEVBQXNCLDJFQUF0QixDQUFOO0FBQ0Q7O0FBRUQsV0FBTyxDQUFDOEQsR0FBRCxFQUFNQyxHQUFOLEVBQVdRLElBQVgsS0FBb0I7QUFDekIsV0FBS0osT0FBTCxJQUFnQixLQUFLQSxPQUFMLENBQWFOLG9CQUFvQkMsR0FBcEIsRUFBeUJDLEdBQXpCLEVBQThCLElBQTlCLENBQWIsQ0FBaEI7QUFDQVE7QUFDRCxLQUhEO0FBSUQ7O0FBakU2Qjs7QUFvRWhDLElBQUl2RyxPQUFPTSxRQUFYLEVBQXFCO0FBQ25CUCxVQUFRcUcsZ0JBQVIsR0FBMkIsS0FBM0I7QUFDRDtBQUVELDhCIiwiZmlsZSI6Ii9wYWNrYWdlcy9vc3RyaW9fY29va2llcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuXG5sZXQgSFRUUDtcbmxldCBXZWJBcHA7XG5cbmlmIChNZXRlb3IuaXNTZXJ2ZXIpIHtcbiAgV2ViQXBwID0gcmVxdWlyZSgnbWV0ZW9yL3dlYmFwcCcpLldlYkFwcDtcbn0gZWxzZSB7XG4gIEhUVFAgPSByZXF1aXJlKCdtZXRlb3IvaHR0cCcpLkhUVFA7XG59XG5cbmNvbnN0IE5vT3AgID0gKCkgPT4ge307XG5jb25zdCB1cmxSRSA9IC9cXC9fX19jb29raWVfX19cXC9zZXQvO1xuY29uc3QgaGVscGVycyA9IHtcbiAgaXNVbmRlZmluZWQob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdm9pZCAwO1xuICB9LFxuICBpc09iamVjdChvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBPYmplY3Qob2JqKTtcbiAgfVxufTtcbmNvbnN0IF9oZWxwZXJzID0gWydTdHJpbmcnLCAnTnVtYmVyJ107XG5mb3IgKGxldCBpID0gMDsgaSA8IF9oZWxwZXJzLmxlbmd0aDsgaSsrKSB7XG4gIGhlbHBlcnNbJ2lzJyArIF9oZWxwZXJzW2ldXSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0ICcgKyBfaGVscGVyc1tpXSArICddJztcbiAgfTtcbn1cblxuLypcbiAqIEB1cmwgaHR0cHM6Ly9naXRodWIuY29tL2pzaHR0cC9jb29raWUvYmxvYi9tYXN0ZXIvaW5kZXguanNcbiAqIEBuYW1lIGNvb2tpZVxuICogQGF1dGhvciBqc2h0dHBcbiAqIEBsaWNlbnNlXG4gKiAoVGhlIE1JVCBMaWNlbnNlKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxMi0yMDE0IFJvbWFuIFNodHlsbWFuIDxzaHR5bG1hbkBnbWFpbC5jb20+XG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRG91Z2xhcyBDaHJpc3RvcGhlciBXaWxzb24gPGRvdWdAc29tZXRoaW5nZG91Zy5jb20+XG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nXG4gKiBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbiAqICdTb2Z0d2FyZScpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbiAqIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbiAqIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0b1xuICogcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvXG4gKiB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmVcbiAqIGluY2x1ZGVkIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCAnQVMgSVMnLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELFxuICogRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4gKiBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuXG4gKiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWVxuICogQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCxcbiAqIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFXG4gKiBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cbiAqL1xuY29uc3QgZGVjb2RlID0gZGVjb2RlVVJJQ29tcG9uZW50O1xuY29uc3QgZW5jb2RlID0gZW5jb2RlVVJJQ29tcG9uZW50O1xuY29uc3QgcGFpclNwbGl0UmVnRXhwID0gLzsgKi87XG5cbi8qXG4gKiBSZWdFeHAgdG8gbWF0Y2ggZmllbGQtY29udGVudCBpbiBSRkMgNzIzMCBzZWMgMy4yXG4gKlxuICogZmllbGQtY29udGVudCA9IGZpZWxkLXZjaGFyIFsgMSooIFNQIC8gSFRBQiApIGZpZWxkLXZjaGFyIF1cbiAqIGZpZWxkLXZjaGFyICAgPSBWQ0hBUiAvIG9icy10ZXh0XG4gKiBvYnMtdGV4dCAgICAgID0gJXg4MC1GRlxuICovXG5jb25zdCBmaWVsZENvbnRlbnRSZWdFeHAgPSAvXltcXHUwMDA5XFx1MDAyMC1cXHUwMDdlXFx1MDA4MC1cXHUwMGZmXSskLztcblxuLypcbiAqIEBmdW5jdGlvblxuICogQG5hbWUgdHJ5RGVjb2RlXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBkXG4gKiBAc3VtbWFyeSBUcnkgZGVjb2RpbmcgYSBzdHJpbmcgdXNpbmcgYSBkZWNvZGluZyBmdW5jdGlvbi5cbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IHRyeURlY29kZSA9IChzdHIsIGQpID0+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZChzdHIpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufTtcblxuLypcbiAqIEBmdW5jdGlvblxuICogQG5hbWUgcGFyc2VcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBzdW1tYXJ5XG4gKiBQYXJzZSBhIGNvb2tpZSBoZWFkZXIuXG4gKiBQYXJzZSB0aGUgZ2l2ZW4gY29va2llIGhlYWRlciBzdHJpbmcgaW50byBhbiBvYmplY3RcbiAqIFRoZSBvYmplY3QgaGFzIHRoZSB2YXJpb3VzIGNvb2tpZXMgYXMga2V5cyhuYW1lcykgPT4gdmFsdWVzXG4gKiBAcHJpdmF0ZVxuICovXG5jb25zdCBwYXJzZSA9IChzdHIsIG9wdGlvbnMpID0+IHtcbiAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDQsICdhcmd1bWVudCBzdHIgbXVzdCBiZSBhIHN0cmluZycpO1xuICB9XG4gIGNvbnN0IG9iaiA9IHt9O1xuICBjb25zdCBvcHQgPSBvcHRpb25zIHx8IHt9O1xuICBsZXQgdmFsO1xuICBsZXQga2V5O1xuICBsZXQgZXFJbmR4O1xuXG4gIHN0ci5zcGxpdChwYWlyU3BsaXRSZWdFeHApLmZvckVhY2goKHBhaXIpID0+IHtcbiAgICBlcUluZHggPSBwYWlyLmluZGV4T2YoJz0nKTtcbiAgICBpZiAoZXFJbmR4IDwgMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBrZXkgPSBwYWlyLnN1YnN0cigwLCBlcUluZHgpLnRyaW0oKTtcbiAgICB2YWwgPSBwYWlyLnN1YnN0cigrK2VxSW5keCwgcGFpci5sZW5ndGgpLnRyaW0oKTtcbiAgICBpZiAodmFsWzBdID09PSAnXCInKSB7XG4gICAgICB2YWwgPSB2YWwuc2xpY2UoMSwgLTEpO1xuICAgIH1cbiAgICBpZiAodm9pZCAwID09PSBvYmpba2V5XSkge1xuICAgICAgb2JqW2tleV0gPSB0cnlEZWNvZGUodmFsLCAob3B0LmRlY29kZSB8fCBkZWNvZGUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb2JqO1xufTtcblxuLypcbiAqIEBmdW5jdGlvblxuICogQG5hbWUgc2VyaWFsaXplXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtTdHJpbmd9IHZhbFxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHJldHVybiB7U3RyaW5nfVxuICogQHN1bW1hcnlcbiAqIFNlcmlhbGl6ZSBkYXRhIGludG8gYSBjb29raWUgaGVhZGVyLlxuICogU2VyaWFsaXplIHRoZSBhIG5hbWUgdmFsdWUgcGFpciBpbnRvIGEgY29va2llIHN0cmluZyBzdWl0YWJsZSBmb3JcbiAqIGh0dHAgaGVhZGVycy4gQW4gb3B0aW9uYWwgb3B0aW9ucyBvYmplY3Qgc3BlY2lmaWVkIGNvb2tpZSBwYXJhbWV0ZXJzLlxuICogc2VyaWFsaXplKCdmb28nLCAnYmFyJywgeyBodHRwT25seTogdHJ1ZSB9KSA9PiBcImZvbz1iYXI7IGh0dHBPbmx5XCJcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IHNlcmlhbGl6ZSA9IChrZXksIHZhbCwgb3B0ID0ge30pID0+IHtcbiAgbGV0IG5hbWU7XG5cbiAgaWYgKCFmaWVsZENvbnRlbnRSZWdFeHAudGVzdChrZXkpKSB7XG4gICAgbmFtZSA9IGVzY2FwZShrZXkpO1xuICB9IGVsc2Uge1xuICAgIG5hbWUgPSBrZXk7XG4gIH1cblxuICBsZXQgdmFsdWU7XG4gIGlmICghaGVscGVycy5pc1VuZGVmaW5lZCh2YWwpKSB7XG4gICAgdmFsdWUgPSBlbmNvZGUodmFsKTtcbiAgICBpZiAodmFsdWUgJiYgIWZpZWxkQ29udGVudFJlZ0V4cC50ZXN0KHZhbHVlKSkge1xuICAgICAgdmFsdWUgPSBlc2NhcGUodmFsdWUpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YWx1ZSA9ICcnO1xuICB9XG5cbiAgY29uc3QgcGFpcnMgPSBbYCR7bmFtZX09JHt2YWx1ZX1gXTtcblxuICBpZiAoaGVscGVycy5pc051bWJlcihvcHQubWF4QWdlKSkge1xuICAgIHBhaXJzLnB1c2goYE1heC1BZ2U9JHtvcHQubWF4QWdlfWApO1xuICB9XG5cbiAgaWYgKG9wdC5kb21haW4gJiYgaGVscGVycy5pc1N0cmluZyhvcHQuZG9tYWluKSkge1xuICAgIGlmICghZmllbGRDb250ZW50UmVnRXhwLnRlc3Qob3B0LmRvbWFpbikpIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDA0LCAnb3B0aW9uIGRvbWFpbiBpcyBpbnZhbGlkJyk7XG4gICAgfVxuICAgIHBhaXJzLnB1c2goYERvbWFpbj0ke29wdC5kb21haW59YCk7XG4gIH1cblxuICBpZiAob3B0LnBhdGggJiYgaGVscGVycy5pc1N0cmluZyhvcHQucGF0aCkpIHtcbiAgICBpZiAoIWZpZWxkQ29udGVudFJlZ0V4cC50ZXN0KG9wdC5wYXRoKSkge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDQsICdvcHRpb24gcGF0aCBpcyBpbnZhbGlkJyk7XG4gICAgfVxuICAgIHBhaXJzLnB1c2goYFBhdGg9JHtvcHQucGF0aH1gKTtcbiAgfVxuXG4gIG9wdC5leHBpcmVzID0gb3B0LmV4cGlyZXMgfHwgb3B0LmV4cGlyZSB8fCBmYWxzZTtcbiAgaWYgKG9wdC5leHBpcmVzID09PSBJbmZpbml0eSkge1xuICAgIHBhaXJzLnB1c2goJ0V4cGlyZXM9RnJpLCAzMSBEZWMgOTk5OSAyMzo1OTo1OSBHTVQnKTtcbiAgfSBlbHNlIGlmIChvcHQuZXhwaXJlcyBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICBwYWlycy5wdXNoKGBFeHBpcmVzPSR7b3B0LmV4cGlyZXMudG9VVENTdHJpbmcoKX1gKTtcbiAgfSBlbHNlIGlmIChvcHQuZXhwaXJlcyA9PT0gMCkge1xuICAgIHBhaXJzLnB1c2goJ0V4cGlyZXM9MCcpO1xuICB9IGVsc2UgaWYgKGhlbHBlcnMuaXNOdW1iZXIob3B0LmV4cGlyZXMpKSB7XG4gICAgcGFpcnMucHVzaChgRXhwaXJlcz0keyhuZXcgRGF0ZShvcHQuZXhwaXJlcykpLnRvVVRDU3RyaW5nKCl9YCk7XG4gIH1cblxuICBpZiAob3B0Lmh0dHBPbmx5KSB7XG4gICAgcGFpcnMucHVzaCgnSHR0cE9ubHknKTtcbiAgfVxuXG4gIGlmIChvcHQuc2VjdXJlKSB7XG4gICAgcGFpcnMucHVzaCgnU2VjdXJlJyk7XG4gIH1cblxuICBpZiAob3B0LmZpcnN0UGFydHlPbmx5KSB7XG4gICAgcGFpcnMucHVzaCgnRmlyc3QtUGFydHktT25seScpO1xuICB9XG5cbiAgaWYgKG9wdC5zYW1lU2l0ZSkge1xuICAgIHBhaXJzLnB1c2goJ1NhbWVTaXRlJyk7XG4gIH1cblxuICByZXR1cm4gcGFpcnMuam9pbignOyAnKTtcbn07XG5cbi8qXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBjbGFzcyBfX2Nvb2tpZXNcbiAqIEBwYXJhbSBfY29va2llcyB7T2JqZWN0fFN0cmluZ30gLSBDdXJyZW50IGNvb2tpZXMgYXMgU3RyaW5nIG9yIE9iamVjdFxuICogQHBhcmFtIFRUTCB7TnVtYmVyfSAtIERlZmF1bHQgY29va2llcyBleHBpcmF0aW9uIHRpbWUgKG1heC1hZ2UpIGluIG1pbGxpc2Vjb25kcywgYnkgZGVmYXVsdCAtIHNlc3Npb24gKGZhbHNlKVxuICogQHBhcmFtIHJ1bk9uU2VydmVyIHtCb29sZWFufSAtIEV4cG9zZSBDb29raWVzIGNsYXNzIHRvIFNlcnZlclxuICogQHBhcmFtIHJlc3BvbnNlIHtodHRwLlNlcnZlclJlc3BvbnNlfE9iamVjdH0gLSBUaGlzIG9iamVjdCBpcyBjcmVhdGVkIGludGVybmFsbHkgYnkgYSBIVFRQIHNlcnZlclxuICogQHN1bW1hcnkgSW50ZXJuYWwgQ2xhc3NcbiAqL1xuY2xhc3MgX19jb29raWVzIHtcbiAgY29uc3RydWN0b3IoX2Nvb2tpZXMsIFRUTCwgcnVuT25TZXJ2ZXIsIHJlc3BvbnNlKSB7XG4gICAgdGhpcy5UVEwgICAgICAgICA9IFRUTDtcbiAgICB0aGlzLnJlc3BvbnNlICAgID0gcmVzcG9uc2U7XG4gICAgdGhpcy5ydW5PblNlcnZlciA9IHJ1bk9uU2VydmVyO1xuXG4gICAgaWYgKGhlbHBlcnMuaXNPYmplY3QoX2Nvb2tpZXMpKSB7XG4gICAgICB0aGlzLmNvb2tpZXMgPSBfY29va2llcztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jb29raWVzID0gcGFyc2UoX2Nvb2tpZXMpO1xuICAgIH1cbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgX19jb29raWVzXG4gICAqIEBuYW1lIGdldFxuICAgKiBAcGFyYW0ge1N0cmluZ30ga2V5ICAtIFRoZSBuYW1lIG9mIHRoZSBjb29raWUgdG8gcmVhZFxuICAgKiBAcGFyYW0ge1N0cmluZ30gX3RtcCAtIFVucGFyc2VkIHN0cmluZyBpbnN0ZWFkIG9mIHVzZXIncyBjb29raWVzXG4gICAqIEBzdW1tYXJ5IFJlYWQgYSBjb29raWUuIElmIHRoZSBjb29raWUgZG9lc24ndCBleGlzdCBhIG51bGwgdmFsdWUgd2lsbCBiZSByZXR1cm5lZC5cbiAgICogQHJldHVybnMge1N0cmluZ3x2b2lkfVxuICAgKi9cbiAgZ2V0KGtleSwgX3RtcCkge1xuICAgIGNvbnN0IF9jcyA9IF90bXAgPyBwYXJzZShfdG1wKSA6IHRoaXMuY29va2llcztcbiAgICBpZiAoIWtleSB8fCAhX2NzKSB7XG4gICAgICByZXR1cm4gdm9pZCAwO1xuICAgIH1cblxuICAgIGlmIChfY3MuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgcmV0dXJuIF9jc1trZXldO1xuICAgIH1cblxuICAgIHJldHVybiB2b2lkIDA7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIF9fY29va2llc1xuICAgKiBAbmFtZSBzZXRcbiAgICogQHBhcmFtIHtTdHJpbmd9ICBrZXkgICAtIFRoZSBuYW1lIG9mIHRoZSBjb29raWUgdG8gY3JlYXRlL292ZXJ3cml0ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gIHZhbHVlIC0gVGhlIHZhbHVlIG9mIHRoZSBjb29raWVcbiAgICogQHBhcmFtIHtPYmplY3R9ICBvcHRzICAtIFtPcHRpb25hbF0gQ29va2llIG9wdGlvbnMgKHNlZSByZWFkbWUgZG9jcylcbiAgICogQHN1bW1hcnkgQ3JlYXRlL292ZXJ3cml0ZSBhIGNvb2tpZS5cbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzZXQoa2V5LCB2YWx1ZSwgb3B0cyA9IHt9KSB7XG4gICAgaWYgKGtleSAmJiAhaGVscGVycy5pc1VuZGVmaW5lZCh2YWx1ZSkpIHtcbiAgICAgIGlmIChoZWxwZXJzLmlzTnVtYmVyKHRoaXMuVFRMKSAmJiBvcHRzLmV4cGlyZXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBvcHRzLmV4cGlyZXMgPSBuZXcgRGF0ZSgrbmV3IERhdGUoKSArIHRoaXMuVFRMKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5ld0Nvb2tpZSA9IHNlcmlhbGl6ZShrZXksIHZhbHVlLCBvcHRzKTtcbiAgICAgIHRoaXMuY29va2llc1trZXldID0gdmFsdWU7XG4gICAgICBpZiAoTWV0ZW9yLmlzQ2xpZW50KSB7XG4gICAgICAgIGRvY3VtZW50LmNvb2tpZSA9IG5ld0Nvb2tpZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucmVzcG9uc2Uuc2V0SGVhZGVyKCdTZXQtQ29va2llJywgbmV3Q29va2llKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIF9fY29va2llc1xuICAgKiBAbmFtZSByZW1vdmVcbiAgICogQHBhcmFtIHtTdHJpbmd9IGtleSAgICAtIFRoZSBuYW1lIG9mIHRoZSBjb29raWUgdG8gY3JlYXRlL292ZXJ3cml0ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCAgIC0gW09wdGlvbmFsXSBUaGUgcGF0aCBmcm9tIHdoZXJlIHRoZSBjb29raWUgd2lsbCBiZVxuICAgKiByZWFkYWJsZS4gRS5nLiwgXCIvXCIsIFwiL215ZGlyXCI7IGlmIG5vdCBzcGVjaWZpZWQsIGRlZmF1bHRzIHRvIHRoZSBjdXJyZW50XG4gICAqIHBhdGggb2YgdGhlIGN1cnJlbnQgZG9jdW1lbnQgbG9jYXRpb24gKHN0cmluZyBvciBudWxsKS4gVGhlIHBhdGggbXVzdCBiZVxuICAgKiBhYnNvbHV0ZSAoc2VlIFJGQyAyOTY1KS4gRm9yIG1vcmUgaW5mb3JtYXRpb24gb24gaG93IHRvIHVzZSByZWxhdGl2ZSBwYXRoc1xuICAgKiBpbiB0aGlzIGFyZ3VtZW50LCBzZWU6IGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9kb2N1bWVudC5jb29raWUjVXNpbmdfcmVsYXRpdmVfVVJMc19pbl90aGVfcGF0aF9wYXJhbWV0ZXJcbiAgICogQHBhcmFtIHtTdHJpbmd9IGRvbWFpbiAtIFtPcHRpb25hbF0gVGhlIGRvbWFpbiBmcm9tIHdoZXJlIHRoZSBjb29raWUgd2lsbFxuICAgKiBiZSByZWFkYWJsZS4gRS5nLiwgXCJleGFtcGxlLmNvbVwiLCBcIi5leGFtcGxlLmNvbVwiIChpbmNsdWRlcyBhbGwgc3ViZG9tYWlucylcbiAgICogb3IgXCJzdWJkb21haW4uZXhhbXBsZS5jb21cIjsgaWYgbm90IHNwZWNpZmllZCwgZGVmYXVsdHMgdG8gdGhlIGhvc3QgcG9ydGlvblxuICAgKiBvZiB0aGUgY3VycmVudCBkb2N1bWVudCBsb2NhdGlvbiAoc3RyaW5nIG9yIG51bGwpLlxuICAgKiBAc3VtbWFyeSBSZW1vdmUgYSBjb29raWUocykuXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgcmVtb3ZlKGtleSwgcGF0aCA9ICcvJywgZG9tYWluID0gJycpIHtcbiAgICBpZiAoa2V5ICYmIHRoaXMuY29va2llcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICBjb25zdCBuZXdDb29raWUgPSBzZXJpYWxpemUoa2V5LCAnJywge1xuICAgICAgICBkb21haW4sXG4gICAgICAgIHBhdGgsXG4gICAgICAgIGV4cGlyZXM6IG5ldyBEYXRlKDApXG4gICAgICB9KTtcblxuICAgICAgZGVsZXRlIHRoaXMuY29va2llc1trZXldO1xuICAgICAgaWYgKE1ldGVvci5pc0NsaWVudCkge1xuICAgICAgICBkb2N1bWVudC5jb29raWUgPSBuZXdDb29raWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnJlc3BvbnNlLnNldEhlYWRlcignU2V0LUNvb2tpZScsIG5ld0Nvb2tpZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKCFrZXkgJiYgdGhpcy5rZXlzKCkubGVuZ3RoID4gMCAmJiB0aGlzLmtleXMoKVswXSAhPT0gJycpIHtcbiAgICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLmNvb2tpZXMpO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlKGtleXNbaV0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgX19jb29raWVzXG4gICAqIEBuYW1lIGhhc1xuICAgKiBAcGFyYW0ge1N0cmluZ30ga2V5ICAtIFRoZSBuYW1lIG9mIHRoZSBjb29raWUgdG8gY3JlYXRlL292ZXJ3cml0ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gX3RtcCAtIFVucGFyc2VkIHN0cmluZyBpbnN0ZWFkIG9mIHVzZXIncyBjb29raWVzXG4gICAqIEBzdW1tYXJ5IENoZWNrIHdoZXRoZXIgYSBjb29raWUgZXhpc3RzIGluIHRoZSBjdXJyZW50IHBvc2l0aW9uLlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGhhcyhrZXksIF90bXApIHtcbiAgICBjb25zdCBfY3MgPSBfdG1wID8gcGFyc2UoX3RtcCkgOiB0aGlzLmNvb2tpZXM7XG4gICAgaWYgKCFrZXkgfHwgIV9jcykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBfY3MuaGFzT3duUHJvcGVydHkoa2V5KTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWVtYmVyT2YgX19jb29raWVzXG4gICAqIEBuYW1lIGtleXNcbiAgICogQHN1bW1hcnkgUmV0dXJucyBhbiBhcnJheSBvZiBhbGwgcmVhZGFibGUgY29va2llcyBmcm9tIHRoaXMgbG9jYXRpb24uXG4gICAqIEByZXR1cm5zIHtbU3RyaW5nXX1cbiAgICovXG4gIGtleXMoKSB7XG4gICAgaWYgKHRoaXMuY29va2llcykge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuY29va2llcyk7XG4gICAgfVxuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIC8qXG4gICAqIEBsb2N1cyBDbGllbnRcbiAgICogQG1lbWJlck9mIF9fY29va2llc1xuICAgKiBAbmFtZSBzZW5kXG4gICAqIEBwYXJhbSBjYiB7RnVuY3Rpb259IC0gQ2FsbGJhY2tcbiAgICogQHN1bW1hcnkgU2VuZCBhbGwgY29va2llcyBvdmVyIFhIUiB0byBzZXJ2ZXIuXG4gICAqIEByZXR1cm5zIHt2b2lkfVxuICAgKi9cbiAgc2VuZChjYiA9IE5vT3ApIHtcbiAgICBpZiAoTWV0ZW9yLmlzU2VydmVyKSB7XG4gICAgICBjYihuZXcgTWV0ZW9yLkVycm9yKDQwMCwgJ0NhblxcJ3QgcnVuIGAuc2VuZCgpYCBvbiBzZXJ2ZXIsIGl0XFwncyBDbGllbnQgb25seSBtZXRob2QhJykpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJ1bk9uU2VydmVyKSB7XG4gICAgICBIVFRQLmdldChgJHt3aW5kb3cuX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTF9QQVRIX1BSRUZJWCB8fCAnJ30vX19fY29va2llX19fL3NldGAsIGNiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2IobmV3IE1ldGVvci5FcnJvcig0MDAsICdDYW5cXCd0IHNlbmQgY29va2llcyBvbiBzZXJ2ZXIgd2hlbiBgcnVuT25TZXJ2ZXJgIGlzIGZhbHNlLicpKTtcbiAgICB9XG4gICAgcmV0dXJuIHZvaWQgMDtcbiAgfVxufVxuXG4vKlxuICogQGZ1bmN0aW9uXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAc3VtbWFyeSBNaWRkbGV3YXJlIGhhbmRsZXJcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IF9fbWlkZGxld2FyZUhhbmRsZXIgPSAocmVxLCByZXMsIHNlbGYpID0+IHtcbiAgbGV0IF9jb29raWVzID0ge307XG4gIGlmIChzZWxmLnJ1bk9uU2VydmVyKSB7XG4gICAgaWYgKHJlcS5oZWFkZXJzICYmIHJlcS5oZWFkZXJzLmNvb2tpZSkge1xuICAgICAgX2Nvb2tpZXMgPSBwYXJzZShyZXEuaGVhZGVycy5jb29raWUpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IF9fY29va2llcyhfY29va2llcywgc2VsZi5UVEwsIHNlbGYucnVuT25TZXJ2ZXIsIHJlcyk7XG4gIH1cblxuICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMCwgJ0NhblxcJ3QgdXNlIG1pZGRsZXdhcmUgd2hlbiBgcnVuT25TZXJ2ZXJgIGlzIGZhbHNlLicpO1xufTtcblxuXG4vKlxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAY2xhc3MgQ29va2llc1xuICogQHBhcmFtIG9wdHMge09iamVjdH1cbiAqIEBwYXJhbSBvcHRzLlRUTCB7TnVtYmVyfSAtIERlZmF1bHQgY29va2llcyBleHBpcmF0aW9uIHRpbWUgKG1heC1hZ2UpIGluIG1pbGxpc2Vjb25kcywgYnkgZGVmYXVsdCAtIHNlc3Npb24gKGZhbHNlKVxuICogQHBhcmFtIG9wdHMuYXV0byB7Qm9vbGVhbn0gLSBbU2VydmVyXSBBdXRvLWJpbmQgaW4gbWlkZGxld2FyZSBhcyBgcmVxLkNvb2tpZXNgLCBieSBkZWZhdWx0IGB0cnVlYFxuICogQHBhcmFtIG9wdHMuaGFuZGxlciB7RnVuY3Rpb259IC0gW1NlcnZlcl0gTWlkZGxld2FyZSBoYW5kbGVyXG4gKiBAcGFyYW0gb3B0cy5ydW5PblNlcnZlciB7Qm9vbGVhbn0gLSBFeHBvc2UgQ29va2llcyBjbGFzcyB0byBTZXJ2ZXJcbiAqIEBzdW1tYXJ5IE1haW4gQ29va2llIGNsYXNzXG4gKi9cbmNsYXNzIENvb2tpZXMgZXh0ZW5kcyBfX2Nvb2tpZXMge1xuICBjb25zdHJ1Y3RvcihvcHRzID0ge30pIHtcbiAgICBvcHRzLlRUTCA9IGhlbHBlcnMuaXNOdW1iZXIob3B0cy5UVEwpID8gb3B0cy5UVEwgOiBmYWxzZTtcbiAgICBvcHRzLnJ1bk9uU2VydmVyID0gKG9wdHMucnVuT25TZXJ2ZXIgIT09IGZhbHNlKSA/IHRydWUgOiBmYWxzZTtcblxuICAgIGlmIChNZXRlb3IuaXNDbGllbnQpIHtcbiAgICAgIHN1cGVyKGRvY3VtZW50LmNvb2tpZSwgb3B0cy5UVEwsIG9wdHMucnVuT25TZXJ2ZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdXBlcih7fSwgb3B0cy5UVEwsIG9wdHMucnVuT25TZXJ2ZXIpO1xuICAgICAgb3B0cy5hdXRvICAgICAgICA9IG9wdHMuYXV0byAhPT0gZmFsc2UgPyB0cnVlIDogZmFsc2U7XG4gICAgICB0aGlzLmhhbmRsZXIgICAgID0gb3B0cy5oYW5kbGVyIHx8ICgoKSA9PiB7fSk7XG4gICAgICB0aGlzLnJ1bk9uU2VydmVyID0gb3B0cy5ydW5PblNlcnZlcjtcblxuICAgICAgaWYgKHRoaXMucnVuT25TZXJ2ZXIpIHtcbiAgICAgICAgaWYgKCFDb29raWVzLmlzTG9hZGVkT25TZXJ2ZXIpIHtcbiAgICAgICAgICBpZiAob3B0cy5hdXRvKSB7XG4gICAgICAgICAgICBXZWJBcHAuY29ubmVjdEhhbmRsZXJzLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgICAgICAgICAgaWYgKHVybFJFLnRlc3QocmVxLl9wYXJzZWRVcmwucGF0aCkpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVxLmhlYWRlcnMgJiYgcmVxLmhlYWRlcnMuY29va2llKSB7XG4gICAgICAgICAgICAgICAgICBjb25zdCBfY09iaiAgPSBwYXJzZShyZXEuaGVhZGVycy5jb29raWUpO1xuICAgICAgICAgICAgICAgICAgY29uc3QgX2NLZXlzID0gT2JqZWN0LmtleXMoX2NPYmopO1xuICAgICAgICAgICAgICAgICAgY29uc3QgX2NBcnIgID0gW107XG4gICAgICAgICAgICAgICAgICBsZXQgICBfY1N0cjtcblxuICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfY0tleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgX2NTdHIgPSBzZXJpYWxpemUoX2NLZXlzW2ldLCBfY09ialtfY0tleXNbaV1dKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF+X2NBcnIuaW5kZXhPZihfY1N0cikpIHtcbiAgICAgICAgICAgICAgICAgICAgICBfY0Fyci5wdXNoKF9jU3RyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdTZXQtQ29va2llJywgX2NBcnIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKCcnKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXEuQ29va2llcyA9IF9fbWlkZGxld2FyZUhhbmRsZXIocmVxLCByZXMsIHRoaXMpO1xuICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIENvb2tpZXMuaXNMb2FkZWRPblNlcnZlciA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuXG4gIC8qXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIENvb2tpZXNcbiAgICogQG5hbWUgbWlkZGxld2FyZVxuICAgKiBAc3VtbWFyeSBHZXQgQ29va2llcyBpbnN0YW5jZSBpbnRvIGNhbGxiYWNrXG4gICAqIEByZXR1cm5zIHt2b2lkfVxuICAgKi9cbiAgbWlkZGxld2FyZSgpIHtcbiAgICBpZiAoIU1ldGVvci5pc1NlcnZlcikge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig1MDAsICdbb3N0cmlvOmNvb2tpZXNdIENhblxcJ3QgdXNlIGAubWlkZGxld2FyZSgpYCBvbiBDbGllbnQsIGl0XFwncyBTZXJ2ZXIgb25seSEnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICB0aGlzLmhhbmRsZXIgJiYgdGhpcy5oYW5kbGVyKF9fbWlkZGxld2FyZUhhbmRsZXIocmVxLCByZXMsIHRoaXMpKTtcbiAgICAgIG5leHQoKTtcbiAgICB9O1xuICB9XG59XG5cbmlmIChNZXRlb3IuaXNTZXJ2ZXIpIHtcbiAgQ29va2llcy5pc0xvYWRlZE9uU2VydmVyID0gZmFsc2U7XG59XG5cbi8qIEV4cG9ydCB0aGUgQ29va2llcyBjbGFzcyAqL1xuZXhwb3J0IHsgQ29va2llcyB9O1xuIl19
