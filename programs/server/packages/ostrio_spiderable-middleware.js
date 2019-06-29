(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:spiderable-middleware":{"lib":{"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/ostrio_spiderable-middleware/lib/index.js                                                               //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
var url = require('url');

var request = require('request-libcurl');

if (typeof window !== 'undefined') {
  throw new Error('Running `spiderable-middleware` in Browser environment isn\'t allowed! Please make sure `spiderable-middleware` NPM package is imported and used only in Node.js environment.');
}

var re = {
  proto: /^https?:\/\//i,
  semi: /:(.+)/,
  trailingSlash: /\/$/,
  beginningSlash: /^\//,
  nonDigit: /\D+/g,
  staticExt: /\.(?:3ds|3g2|3gp|3gpp|7z|a|aac|aaf|adp|ai|aif|aiff|alz|ape|apk|appcache|ar|arj|asf|asx|atom|au|avchd|avi|bak|bbaw|bh|bin|bk|bmp|btif|bz2|bzip2|cab|caf|cco|cgm|class|cmx|cpio|cr2|crt|crx|css|csv|cur|dat|deb|der|dex|djvu|dll|dmg|dng|doc|docm|docx|dot|dotm|dra|drc|DS_Store|dsk|dts|dtshd|dvb|dwg|dxf|ear|ecelp4800|ecelp7470|ecelp9600|egg|eol|eot|eps|epub|exe|f4a|f4b|f4p|f4v|fbs|fh|fla|flac|fli|flv|fpx|fst|fvt|g3|geojson|gif|graffle|gz|gzip|h261|h263|h264|hqx|htc|ico|ief|img|ipa|iso|jad|jar|jardiff|jng|jnlp|jpeg|jpg|jpgv|jpm|js|jxr|key|kml|kmz|ktx|less|lha|lvp|lz|lzh|lzma|lzo|m2v|m3u|m4a|m4p|m4v|map|manifest|mar|markdown|md|mdi|mdown|mdwn|mht|mid|midi|mj2|mka|mkd|mkdn|mkdown|mkv|mml|mmr|mng|mobi|mov|movie|mp2|mp3|mp4|mp4a|mpe|mpeg|mpg|mpga|mpv|msi|msm|msp|mxf|mxu|nef|npx|nsv|numbers|o|oex|oga|ogg|ogv|opus|otf|pages|pbm|pcx|pdb|pdf|pea|pem|pgm|pic|pl|pm|png|pnm|pot|potm|potx|ppa|ppam|ppm|pps|ppsm|ppsx|ppt|pptm|pptx|prc|ps|psd|pya|pyc|pyo|pyv|qt|ra|rar|ras|raw|rdf|rgb|rip|rlc|rm|rmf|rmvb|ron|roq|rpm|rss|rtf|run|rz|s3m|s7z|safariextz|scpt|sea|sgi|shar|sil|sit|slk|smv|so|sub|svg|svgz|svi|swf|tar|tbz|tbz2|tcl|tga|tgz|thmx|tif|tiff|tk|tlz|topojson|torrent|ttc|ttf|txt|txz|udf|uvh|uvi|uvm|uvp|uvs|uvu|vcard|vcf|viv|vob|vtt|war|wav|wax|wbmp|wdp|weba|webapp|webm|webmanifest|webp|whl|wim|wm|wma|wml|wmlc|wmv|wmx|woff|woff2|wvx|xbm|xif|xla|xlam|xloc|xls|xlsb|xlsm|xlsx|xlt|xltm|xltx|xm|xmind|xml|xpi|xpm|xsl|xwd|xz|yuv|z|zip|zipx)(?:\?[a-zA-Z0-9\-\.\_\~\:\/\#\[\]\@\!\$\&\'\(\)\*\+\,\;\=]*)?$/i
};

var _debug = function debug() {
  console.trace();
  console.warn.apply(null, arguments);
};

request.defaultOptions.debug = false;

module.exports = function () {
  function Spiderable(_opts) {
    var opts = {};

    if (_opts && Object.prototype.toString.call(_opts) === '[object Object]') {
      opts = _opts;
    }

    this.auth = opts.auth;
    var ignore = opts.ignore || false;
    this.only = opts.only || false;
    this.onlyRE = opts.onlyRE || false;
    this.botsUA = opts.botsUA || Spiderable.prototype.botsUA;
    this.rootURL = opts.rootURL;
    this.staticExt = opts.staticExt || re.staticExt;
    this.serviceURL = opts.serviceURL;
    this.ignoredHeaders = opts.ignoredHeaders || Spiderable.prototype.ignoredHeaders;

    if (Object.prototype.toString.call(this.staticExt) !== '[object RegExp]') {
      _debug('[Spiderable-Middleware] `opts.staticExt` must be instance of RegExp, falling back to defaults.');

      this.staticExt = re.staticExt;
    }

    if (this.onlyRE && Object.prototype.toString.call(this.onlyRE) !== '[object RegExp]') {
      _debug('[Spiderable-Middleware] `opts.onlyRE` must be instance of RegExp, rules are ignored!');

      this.onlyRE = false;
    }

    if (Object.prototype.toString.call(this.botsUA) !== '[object Array]') {
      _debug('[Spiderable-Middleware] `opts.botsUA` must be instance of Array, falling back to defaults.');

      this.botsUA = this.prototype.botsUA;
    }

    if (Object.prototype.toString.call(this.ignoredHeaders) !== '[object Array]') {
      _debug('[Spiderable-Middleware] `opts.ignoredHeaders` must be instance of Array, falling back to defaults.');

      this.ignoredHeaders = this.prototype.ignoredHeaders;
    }

    if (this.only && Object.prototype.toString.call(this.only) !== '[object Array]') {
      _debug('[Spiderable-Middleware] `opts.only` must be instance of Array, rules are ignored!');

      this.only = false;
    }

    if (!this.handler) {
      this.handler = this.middleware;
    }

    if (!this.handle) {
      this.handle = this.middleware;
    }

    this.headersRE = new RegExp(this.ignoredHeaders.join('|'), 'i');
    this.botsRE = new RegExp(this.botsUA.join('|'), 'i');

    if (!this.auth) {
      this.auth = process.env.SPIDERABLE_SERVICE_AUTH || process.env.PRERENDER_SERVICE_AUTH || '';
    }

    if (ignore && Object.prototype.toString.call(ignore) !== '[object Array]') {
      _debug('[Spiderable-Middleware] `opts.ignore` must be instance of Array, rules are ignored!');

      ignore = false;
    }

    if (!this.rootURL) {
      this.rootURL = process.env.ROOT_URL;
    }

    if (!this.serviceURL) {
      this.serviceURL = process.env.SPIDERABLE_SERVICE_URL || process.env.PRERENDER_SERVICE_URL || 'https://render.ostr.io';
    }

    if (!this.rootURL) {
      throw new Error('[Spiderable-Middleware] {rootURL} or env variable ROOT_URL is not detected! But must be specified!');
    }

    if (!this.serviceURL) {
      throw new Error('[Spiderable-Middleware] {serviceURL} or env variable SPIDERABLE_SERVICE_URL or PRERENDER_SERVICE_URL is not detected! But must be specified!');
    }

    if (!re.proto.test(this.rootURL)) {
      throw new Error('[Spiderable-Middleware] {rootURL} is malformed! Must start with protocol http or https');
    }

    if (!re.proto.test(this.serviceURL)) {
      throw new Error('[Spiderable-Middleware] {serviceURL} is malformed! Must start with protocol http or https');
    }

    this.rootURL = this.rootURL.replace(re.trailingSlash, '').replace(re.beginningSlash, '');
    this.serviceURL = this.serviceURL.replace(re.trailingSlash, '').replace(re.beginningSlash, '');

    if (ignore) {
      this.ignoreRE = new RegExp(ignore.join('|'), '');
    } else {
      this.ignoreRE = false;
    }
  }

  Spiderable.prototype.botsUA = ['\\.net crawler', '360spider', '50\\.nu', '8bo crawler bot', 'aboundex', 'accoona', 'adldxbot', 'adsbot-google', 'ahrefsbot', 'altavista', 'appengine-google', 'applebot', 'archiver', 'arielisbot', 'ask jeeves', 'auskunftbot', 'baidumobaider', 'baiduspider', 'becomebot', 'bingbot', 'bingpreview', 'bitbot', 'bitlybot', 'blitzbot', 'blogbridge', 'boardreader', 'botseer', 'catchbot', 'catchpoint bot', 'charlotte', 'checklinks', 'cliqzbot', 'clumboot', 'coccocbot', 'converacrawler', 'crawl-e', 'crawlconvera', 'dataparksearch', 'daum', 'deusu', 'developers\\.google\\.com/+/web/snippet', 'discordbot', 'dotbot', 'duckduckbot', 'elefent', 'embedly', 'evernote', 'exabot', 'facebookbot', 'facebookexternalhit', 'fatbot', 'fdse robot', 'feed seeker bot', 'feedfetcher', 'femtosearchbot', 'findlinks', 'flamingo_searchengine', 'flipboard', 'followsite bot', 'furlbot', 'fyberspider', 'gaisbot', 'galaxybot', 'geniebot', 'genieo', 'gigablast', 'gigabot', 'girafabot', 'gomezagent', 'gonzo1', 'google sketchup', 'google-structured-data-testing-tool', 'googlebot', 'haosouspider', 'heritrix', 'holmes', 'hoowwwer', 'htdig', 'ia_archiver', 'idbot', 'infuzapp', 'innovazion crawler', 'instagram', 'internetarchive', 'iqdb', 'iskanie', 'istellabot', 'izsearch\\.com', 'kaloogabot', 'kaz\\.kz_bot', 'kd bot', 'konqueror', 'kraken', 'kurzor', 'larbin', 'leia', 'lesnikbot', 'linguee bot', 'linkaider', 'linkapediabot', 'linkedinbot', 'lite bot', 'llaut', 'lookseek', 'lycos', 'mail\\.ru_bot', 'masidani_bot', 'masscan', 'mediapartners-google', 'metajobbot', 'mj12bot', 'mnogosearch', 'mogimogi', 'mojeekbot', 'motominerbot', 'mozdex', 'msiecrawler', 'msnbot', 'msrbot', 'netpursual', 'netresearch', 'netvibes', 'newsgator', 'ng-search', 'nicebot', 'nutchcvs', 'nuzzel', 'nymesis', 'objectssearch', 'odklbot', 'omgili', 'oovoo', 'oozbot', 'openfosbot', 'orangebot', 'orbiter', 'org_bot', 'outbrain', 'pagepeeker', 'pagesinventory', 'parsijoobot', 'paxleframework', 'peeplo screenshot bot', 'pinterest', 'plantynet_webrobot', 'plukkie', 'pompos', 'psbot', 'quora link preview', 'qwantify', 'read%20later', 'reaper', 'redcarpet', 'redditbot', 'retreiver', 'riddler', 'rival iq', 'rogerbot', 'saucenao', 'scooter', 'scrapy', 'scrubby', 'searchie', 'searchsight', 'seekbot', 'semanticdiscovery', 'seznambot', 'showyoubot', 'simplepie', 'simpy', 'sitelockspider', 'skypeuripreview', 'slack-imgproxy', 'slackbot', 'slurp', 'snappy', 'sogou', 'solofield', 'speedy spider', 'speedyspider', 'sputnikbot', 'stackrambler', 'teeraidbot', 'teoma', 'theusefulbot', 'thumbshots\\.ru', 'thumbshotsbot', 'tineye', 'toweya\\.com', 'toweyabot', 'tumblr', 'tweetedtimes', 'tweetmemebot', 'twitterbot', 'url2png', 'vagabondo', 'vebidoobot', 'viber', 'visionutils', 'vkshare', 'voilabot', 'vortex', 'votay bot', 'voyager', 'w3c_validator', 'wasalive\\.bot', 'web-sniffer', 'websquash\\.com', 'webthumb', 'whatsapp', 'whatweb', 'wire', 'wotbox', 'yacybot', 'yahoo', 'yandex', 'yeti', 'yisouspider', 'yodaobot', 'yooglifetchagent', 'yoozbot', 'yottaamonitor', 'yowedo', 'zao-crawler', 'zebot_www\\.ze\\.bz', 'zooshot', 'zyborg'];
  Spiderable.prototype.ignoredHeaders = ['age', 'alt-svc', 'cache-status', 'cf-cache-status', 'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cnection', 'cneonction', 'connection', 'content-encoding', 'content-length', 'date', 'etag', 'expect-ct', 'expires', 'keep-alive', 'last-modified', 'link', 'nncoection', 'pragma', 'server', 'set-cookie', 'status', 'transfer-encoding', 'vary', 'via', 'www-authenticate', 'x-accel-buffering', 'x-accel-charset', 'x-accel-expires', 'x-accel-limit-rate', 'x-accel-redirect', 'x-ostrio-domain', 'x-powered-by', 'x-preprender-status', 'x-prerender-status', 'x-real-ip', 'x-runtime'];

  Spiderable.prototype.middleware = function (req, res, next) {
    if (req.method.toLowerCase() !== 'get' && req.method.toLowerCase() !== 'head') {
      return next();
    }

    var urlObj = url.parse(req.url, true);

    if (urlObj.query._escaped_fragment_ !== void 0 || this.botsRE.test(req.headers['user-agent'] || '')) {
      var hasIgnored = false;
      var hasOnly = false;

      if (this.staticExt.test(urlObj.pathname)) {
        return next();
      }

      if (this.onlyRE) {
        hasOnly = this.onlyRE.test(urlObj.pathname);
        hasIgnored = !hasOnly;
      }

      if (!hasOnly && this.only) {
        hasIgnored = true;

        for (var i = 0; i < this.only.length; i++) {
          if (Object.prototype.toString.call(this.only[i]) === '[object String]') {
            if (this.only[i] === urlObj.pathname) {
              hasIgnored = false;
              hasOnly = true;
              break;
            }
          } else if (Object.prototype.toString.call(this.only[i]) === '[object RegExp]') {
            if (this.only[i].test(urlObj.pathname)) {
              hasIgnored = false;
              hasOnly = true;
              break;
            }
          } else {
            _debug('[Spiderable-Middleware] `opts.only` {' + this.only[i] + '} rule isn\'t instance of {String} nor {RegExp}, rule ignored!');
          }
        }
      }

      if (this.ignoreRE && this.ignoreRE.test(urlObj.pathname)) {
        hasIgnored = true;
      }

      if (hasIgnored) {
        return next();
      }

      var reqUrl = this.rootURL;
      urlObj.path = urlObj.path.replace(re.trailingSlash, '').replace(re.beginningSlash, '');

      if (urlObj.query._escaped_fragment_ !== void 0 && urlObj.query._escaped_fragment_.length) {
        urlObj.pathname += '/' + urlObj.query._escaped_fragment_.replace(re.beginningSlash, '');
      }

      reqUrl += '/' + urlObj.pathname;
      reqUrl = reqUrl.replace(/([^:]\/)\/+/g, '$1');
      var opts = {
        uri: (this.serviceURL + '/?url=' + encodeURIComponent(reqUrl)).replace(/([^:]\/)\/+/g, '$1'),
        wait: true,
        auth: this.auth || false,
        headers: {
          'User-Agent': 'spiderable-middleware/1.4.2'
        },
        rawBody: true
      };

      try {
        var usedHeaders = [];
        var _headersRE = this.headersRE;
        var serviceReq = request(opts, function (error, resp) {
          if (error) {
            _debug('[Spiderable-Middleware] [request.get] Error while connecting to external service:', error);

            next();
          } else {
            if (resp.statusCode === 401 || resp.statusCode === 403) {
              _debug('[Spiderable-Middleware] Can\'t authenticate! Please check you "auth" parameter and other settings.');
            }

            res.statusCode = resp.statusCode || 200;
            res.end();
          }
        });
        serviceReq.request.on('header', function (header) {
          var h = header.toString('utf8');

          if (!!~h.indexOf(':')) {
            h = h.split(re.semi);
            h[0] = h[0].trim().toLowerCase();
            h[1] = h[1].replace(/\r|\n/, '').trim();

            if (!res.headersSent && h[1].length && !_headersRE.test(h[0]) && !usedHeaders.includes(h[0])) {
              res.setHeader(h[0], h[1]);
              usedHeaders.push(h[0]);
            }
          }
        });
        serviceReq.request.on('data', function (data) {
          res.write(data.toString('utf8'), 'utf8');
        });
        req.on('aborted', function () {
          _debug('[Spiderable-Middleware] [REQ] ["aborted" event]:', arguments);

          req.aborted = true;
          serviceReq.abort();
          res.end();
        });
        req.on('error', function (error) {
          _debug('[Spiderable-Middleware] [REQ] ["error" event] Unexpected error:', error);

          serviceReq.abort();
          next();
        });
        res.on('error', function (error) {
          _debug('[Spiderable-Middleware] [RES] ["error" event] Unexpected error:', error);

          serviceReq.abort();
          next();
        });
        res.on('close', function () {
          _debug('[Spiderable-Middleware] [RES] ["close" event]:', arguments);

          serviceReq.abort();
          next();
        });
        res.sendDate = false;
        serviceReq.send();
      } catch (e) {
        _debug('[Spiderable-Middleware] Exception while connecting to external service:', e);

        next();
      }

      return true;
    }

    return next();
  };

  return Spiderable;
}();
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"node_modules":{"request-libcurl":{"package.json":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/ostrio_spiderable-middleware/node_modules/request-libcurl/package.json                       //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.exports = {
  "name": "request-libcurl",
  "version": "1.0.3",
  "main": "index.js"
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// node_modules/meteor/ostrio_spiderable-middleware/node_modules/request-libcurl/index.js                           //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/ostrio:spiderable-middleware/lib/index.js");

/* Exports */
Package._define("ostrio:spiderable-middleware", exports);

})();

//# sourceURL=meteor://💻app/packages/ostrio_spiderable-middleware.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOnNwaWRlcmFibGUtbWlkZGxld2FyZS9saWIvaW5kZXguanMiXSwibmFtZXMiOlsidXJsIiwicmVxdWlyZSIsInJlcXVlc3QiLCJ3aW5kb3ciLCJFcnJvciIsInJlIiwicHJvdG8iLCJzZW1pIiwidHJhaWxpbmdTbGFzaCIsImJlZ2lubmluZ1NsYXNoIiwibm9uRGlnaXQiLCJzdGF0aWNFeHQiLCJfZGVidWciLCJkZWJ1ZyIsImNvbnNvbGUiLCJ0cmFjZSIsIndhcm4iLCJhcHBseSIsImFyZ3VtZW50cyIsImRlZmF1bHRPcHRpb25zIiwibW9kdWxlIiwiZXhwb3J0cyIsIlNwaWRlcmFibGUiLCJfb3B0cyIsIm9wdHMiLCJPYmplY3QiLCJwcm90b3R5cGUiLCJ0b1N0cmluZyIsImNhbGwiLCJhdXRoIiwiaWdub3JlIiwib25seSIsIm9ubHlSRSIsImJvdHNVQSIsInJvb3RVUkwiLCJzZXJ2aWNlVVJMIiwiaWdub3JlZEhlYWRlcnMiLCJoYW5kbGVyIiwibWlkZGxld2FyZSIsImhhbmRsZSIsImhlYWRlcnNSRSIsIlJlZ0V4cCIsImpvaW4iLCJib3RzUkUiLCJwcm9jZXNzIiwiZW52IiwiU1BJREVSQUJMRV9TRVJWSUNFX0FVVEgiLCJQUkVSRU5ERVJfU0VSVklDRV9BVVRIIiwiUk9PVF9VUkwiLCJTUElERVJBQkxFX1NFUlZJQ0VfVVJMIiwiUFJFUkVOREVSX1NFUlZJQ0VfVVJMIiwidGVzdCIsInJlcGxhY2UiLCJpZ25vcmVSRSIsInJlcSIsInJlcyIsIm5leHQiLCJtZXRob2QiLCJ0b0xvd2VyQ2FzZSIsInVybE9iaiIsInBhcnNlIiwicXVlcnkiLCJfZXNjYXBlZF9mcmFnbWVudF8iLCJoZWFkZXJzIiwiaGFzSWdub3JlZCIsImhhc09ubHkiLCJwYXRobmFtZSIsImkiLCJsZW5ndGgiLCJyZXFVcmwiLCJwYXRoIiwidXJpIiwiZW5jb2RlVVJJQ29tcG9uZW50Iiwid2FpdCIsInJhd0JvZHkiLCJ1c2VkSGVhZGVycyIsIl9oZWFkZXJzUkUiLCJzZXJ2aWNlUmVxIiwiZXJyb3IiLCJyZXNwIiwic3RhdHVzQ29kZSIsImVuZCIsIm9uIiwiaGVhZGVyIiwiaCIsImluZGV4T2YiLCJzcGxpdCIsInRyaW0iLCJoZWFkZXJzU2VudCIsImluY2x1ZGVzIiwic2V0SGVhZGVyIiwicHVzaCIsImRhdGEiLCJ3cml0ZSIsImFib3J0ZWQiLCJhYm9ydCIsInNlbmREYXRlIiwic2VuZCIsImUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxHQUFHLEdBQU9DLE9BQU8sQ0FBQyxLQUFELENBQXJCOztBQUNBLElBQUlDLE9BQU8sR0FBR0QsT0FBTyxDQUFDLGlCQUFELENBQXJCOztBQUVBLElBQUksT0FBT0UsTUFBUCxLQUFrQixXQUF0QixFQUFtQztBQUNqQyxRQUFNLElBQUlDLEtBQUosQ0FBVSwrS0FBVixDQUFOO0FBQ0Q7O0FBRUQsSUFBSUMsRUFBRSxHQUFHO0FBQ1BDLE9BQUssRUFBRSxlQURBO0FBRVBDLE1BQUksRUFBRSxPQUZDO0FBR1BDLGVBQWEsRUFBRSxLQUhSO0FBSVBDLGdCQUFjLEVBQUUsS0FKVDtBQUtQQyxVQUFRLEVBQUUsTUFMSDtBQU1QQyxXQUFTLEVBQUU7QUFOSixDQUFUOztBQVNBLElBQUlDLE1BQU0sR0FBRyxTQUFTQyxLQUFULEdBQWtCO0FBQzdCQyxTQUFPLENBQUNDLEtBQVI7QUFDQUQsU0FBTyxDQUFDRSxJQUFSLENBQWFDLEtBQWIsQ0FBbUIsSUFBbkIsRUFBeUJDLFNBQXpCO0FBQ0QsQ0FIRDs7QUFLQWhCLE9BQU8sQ0FBQ2lCLGNBQVIsQ0FBdUJOLEtBQXZCLEdBQStCLEtBQS9COztBQUVBTyxNQUFNLENBQUNDLE9BQVAsR0FBa0IsWUFBWTtBQUM1QixXQUFTQyxVQUFULENBQW9CQyxLQUFwQixFQUEyQjtBQUN6QixRQUFJQyxJQUFJLEdBQUcsRUFBWDs7QUFDQSxRQUFJRCxLQUFLLElBQUlFLE1BQU0sQ0FBQ0MsU0FBUCxDQUFpQkMsUUFBakIs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QixvQkFBVSxDQUFDa0IsS0FBWDtBQUNBeEMsYUFBRyxDQUFDMEIsR0FBSjtBQUNELFNBTEQ7QUFPQTNCLFdBQUcsQ0FBQzRCLEVBQUosQ0FBTyxPQUFQLEVBQWdCLFVBQVVKLEtBQVYsRUFBaUI7QUFDL0JsRSxnQkFBTSxDQUFDLGlFQUFELEVBQW9Fa0UsS0FBcEUsQ0FBTjs7QUFDQUQsb0JBQVUsQ0FBQ2tCLEtBQVg7QUFDQXZDLGNBQUk7QUFDTCxTQUpEO0FBTUFELFdBQUcsQ0FBQzJCLEVBQUosQ0FBTyxPQUFQLEVBQWdCLFVBQVVKLEtBQVYsRUFBaUI7QUFDL0JsRSxnQkFBTSxDQUFDLGlFQUFELEVBQW9Fa0UsS0FBcEUsQ0FBTjs7QUFDQUQsb0JBQVUsQ0FBQ2tCLEtBQVg7QUFDQXZDLGNBQUk7QUFDTCxTQUpEO0FBTUFELFdBQUcsQ0FBQzJCLEVBQUosQ0FBTyxPQUFQLEVBQWdCLFlBQVk7QUFDMUJ0RSxnQkFBTSxDQUFDLGdEQUFELEVBQW1ETSxTQUFuRCxDQUFOOztBQUNBMkQsb0JBQVUsQ0FBQ2tCLEtBQVg7QUFDQXZDLGNBQUk7QUFDTCxTQUpEO0FBTUFELFdBQUcsQ0FBQ3lDLFFBQUosR0FBZSxLQUFmO0FBQ0FuQixrQkFBVSxDQUFDb0IsSUFBWDtBQUNELE9BN0RELENBNkRFLE9BQU9DLENBQVAsRUFBVTtBQUNWdEYsY0FBTSxDQUFDLHlFQUFELEVBQTRFc0YsQ0FBNUUsQ0FBTjs7QUFDQTFDLFlBQUk7QUFDTDs7QUFDRCxhQUFPLElBQVA7QUFDRDs7QUFDRCxXQUFPQSxJQUFJLEVBQVg7QUFDRCxHQXpJRDs7QUEySUEsU0FBT2xDLFVBQVA7QUFDRCxDQS9PZ0IsRUFBakIsQyIsImZpbGUiOiIvcGFja2FnZXMvb3N0cmlvX3NwaWRlcmFibGUtbWlkZGxld2FyZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciB1cmwgICAgID0gcmVxdWlyZSgndXJsJyk7XG52YXIgcmVxdWVzdCA9IHJlcXVpcmUoJ3JlcXVlc3QtbGliY3VybCcpO1xuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdSdW5uaW5nIGBzcGlkZXJhYmxlLW1pZGRsZXdhcmVgIGluIEJyb3dzZXIgZW52aXJvbm1lbnQgaXNuXFwndCBhbGxvd2VkISBQbGVhc2UgbWFrZSBzdXJlIGBzcGlkZXJhYmxlLW1pZGRsZXdhcmVgIE5QTSBwYWNrYWdlIGlzIGltcG9ydGVkIGFuZCB1c2VkIG9ubHkgaW4gTm9kZS5qcyBlbnZpcm9ubWVudC4nKTtcbn1cblxudmFyIHJlID0ge1xuICBwcm90bzogL15odHRwcz86XFwvXFwvL2ksXG4gIHNlbWk6IC86KC4rKS8sXG4gIHRyYWlsaW5nU2xhc2g6IC9cXC8kLyxcbiAgYmVnaW5uaW5nU2xhc2g6IC9eXFwvLyxcbiAgbm9uRGlnaXQ6IC9cXEQrL2csXG4gIHN0YXRpY0V4dDogL1xcLig/OjNkc3wzZzJ8M2dwfDNncHB8N3p8YXxhYWN8YWFmfGFkcHxhaXxhaWZ8YWlmZnxhbHp8YXBlfGFwa3xhcHBjYWNoZXxhcnxhcmp8YXNmfGFzeHxhdG9tfGF1fGF2Y2hkfGF2aXxiYWt8YmJhd3xiaHxiaW58Ymt8Ym1wfGJ0aWZ8YnoyfGJ6aXAyfGNhYnxjYWZ8Y2NvfGNnbXxjbGFzc3xjbXh8Y3Bpb3xjcjJ8Y3J0fGNyeHxjc3N8Y3N2fGN1cnxkYXR8ZGVifGRlcnxkZXh8ZGp2dXxkbGx8ZG1nfGRuZ3xkb2N8ZG9jbXxkb2N4fGRvdHxkb3RtfGRyYXxkcmN8RFNfU3RvcmV8ZHNrfGR0c3xkdHNoZHxkdmJ8ZHdnfGR4ZnxlYXJ8ZWNlbHA0ODAwfGVjZWxwNzQ3MHxlY2VscDk2MDB8ZWdnfGVvbHxlb3R8ZXBzfGVwdWJ8ZXhlfGY0YXxmNGJ8ZjRwfGY0dnxmYnN8Zmh8ZmxhfGZsYWN8ZmxpfGZsdnxmcHh8ZnN0fGZ2dHxnM3xnZW9qc29ufGdpZnxncmFmZmxlfGd6fGd6aXB8aDI2MXxoMjYzfGgyNjR8aHF4fGh0Y3xpY298aWVmfGltZ3xpcGF8aXNvfGphZHxqYXJ8amFyZGlmZnxqbmd8am5scHxqcGVnfGpwZ3xqcGd2fGpwbXxqc3xqeHJ8a2V5fGttbHxrbXp8a3R4fGxlc3N8bGhhfGx2cHxsenxsemh8bHptYXxsem98bTJ2fG0zdXxtNGF8bTRwfG00dnxtYXB8bWFuaWZlc3R8bWFyfG1hcmtkb3dufG1kfG1kaXxtZG93bnxtZHdufG1odHxtaWR8bWlkaXxtajJ8bWthfG1rZHxta2RufG1rZG93bnxta3Z8bW1sfG1tcnxtbmd8bW9iaXxtb3Z8bW92aWV8bXAyfG1wM3xtcDR8bXA0YXxtcGV8bXBlZ3xtcGd8bXBnYXxtcHZ8bXNpfG1zbXxtc3B8bXhmfG14dXxuZWZ8bnB4fG5zdnxudW1iZXJzfG98b2V4fG9nYXxvZ2d8b2d2fG9wdXN8b3RmfHBhZ2VzfHBibXxwY3h8cGRifHBkZnxwZWF8cGVtfHBnbXxwaWN8cGx8cG18cG5nfHBubXxwb3R8cG90bXxwb3R4fHBwYXxwcGFtfHBwbXxwcHN8cHBzbXxwcHN4fHBwdHxwcHRtfHBwdHh8cHJjfHBzfHBzZHxweWF8cHljfHB5b3xweXZ8cXR8cmF8cmFyfHJhc3xyYXd8cmRmfHJnYnxyaXB8cmxjfHJtfHJtZnxybXZifHJvbnxyb3F8cnBtfHJzc3xydGZ8cnVufHJ6fHMzbXxzN3p8c2FmYXJpZXh0enxzY3B0fHNlYXxzZ2l8c2hhcnxzaWx8c2l0fHNsa3xzbXZ8c298c3VifHN2Z3xzdmd6fHN2aXxzd2Z8dGFyfHRienx0YnoyfHRjbHx0Z2F8dGd6fHRobXh8dGlmfHRpZmZ8dGt8dGx6fHRvcG9qc29ufHRvcnJlbnR8dHRjfHR0Znx0eHR8dHh6fHVkZnx1dmh8dXZpfHV2bXx1dnB8dXZzfHV2dXx2Y2FyZHx2Y2Z8dml2fHZvYnx2dHR8d2FyfHdhdnx3YXh8d2JtcHx3ZHB8d2ViYXx3ZWJhcHB8d2VibXx3ZWJtYW5pZmVzdHx3ZWJwfHdobHx3aW18d218d21hfHdtbHx3bWxjfHdtdnx3bXh8d29mZnx3b2ZmMnx3dnh8eGJtfHhpZnx4bGF8eGxhbXx4bG9jfHhsc3x4bHNifHhsc218eGxzeHx4bHR8eGx0bXx4bHR4fHhtfHhtaW5kfHhtbHx4cGl8eHBtfHhzbHx4d2R8eHp8eXV2fHp8emlwfHppcHgpKD86XFw/W2EtekEtWjAtOVxcLVxcLlxcX1xcflxcOlxcL1xcI1xcW1xcXVxcQFxcIVxcJFxcJlxcJ1xcKFxcKVxcKlxcK1xcLFxcO1xcPV0qKT8kL2lcbn07XG5cbnZhciBfZGVidWcgPSBmdW5jdGlvbiBkZWJ1ZyAoKSB7XG4gIGNvbnNvbGUudHJhY2UoKTtcbiAgY29uc29sZS53YXJuLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG59O1xuXG5yZXF1ZXN0LmRlZmF1bHRPcHRpb25zLmRlYnVnID0gZmFsc2U7XG5cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gU3BpZGVyYWJsZShfb3B0cykge1xuICAgIHZhciBvcHRzID0ge307XG4gICAgaWYgKF9vcHRzICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChfb3B0cykgPT09ICdbb2JqZWN0IE9iamVjdF0nKSB7XG4gICAgICBvcHRzID0gX29wdHM7XG4gICAgfVxuXG4gICAgdGhpcy5hdXRoICAgICAgID0gb3B0cy5hdXRoO1xuICAgIHZhciBpZ25vcmUgICAgICA9IG9wdHMuaWdub3JlIHx8IGZhbHNlO1xuICAgIHRoaXMub25seSAgICAgICA9IG9wdHMub25seSB8fCBmYWxzZTtcbiAgICB0aGlzLm9ubHlSRSAgICAgPSBvcHRzLm9ubHlSRSB8fCBmYWxzZTtcbiAgICB0aGlzLmJvdHNVQSAgICAgPSBvcHRzLmJvdHNVQSB8fCBTcGlkZXJhYmxlLnByb3RvdHlwZS5ib3RzVUE7XG4gICAgdGhpcy5yb290VVJMICAgID0gb3B0cy5yb290VVJMO1xuICAgIHRoaXMuc3RhdGljRXh0ICA9IG9wdHMuc3RhdGljRXh0IHx8IHJlLnN0YXRpY0V4dDtcbiAgICB0aGlzLnNlcnZpY2VVUkwgPSBvcHRzLnNlcnZpY2VVUkw7XG4gICAgdGhpcy5pZ25vcmVkSGVhZGVycyA9IG9wdHMuaWdub3JlZEhlYWRlcnMgfHwgU3BpZGVyYWJsZS5wcm90b3R5cGUuaWdub3JlZEhlYWRlcnM7XG5cbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHRoaXMuc3RhdGljRXh0KSAhPT0gJ1tvYmplY3QgUmVnRXhwXScpIHtcbiAgICAgIF9kZWJ1ZygnW1NwaWRlcmFibGUtTWlkZGxld2FyZV0gYG9wdHMuc3RhdGljRXh0YCBtdXN0IGJlIGluc3RhbmNlIG9mIFJlZ0V4cCwgZmFsbGluZyBiYWNrIHRvIGRlZmF1bHRzLicpO1xuICAgICAgdGhpcy5zdGF0aWNFeHQgPSByZS5zdGF0aWNFeHQ7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub25seVJFICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh0aGlzLm9ubHlSRSkgIT09ICdbb2JqZWN0IFJlZ0V4cF0nKSB7XG4gICAgICBfZGVidWcoJ1tTcGlkZXJhYmxlLU1pZGRsZXdhcmVdIGBvcHRzLm9ubHlSRWAgbXVzdCBiZSBpbnN0YW5jZSBvZiBSZWdFeHAsIHJ1bGVzIGFyZSBpZ25vcmVkIScpO1xuICAgICAgdGhpcy5vbmx5UkUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHRoaXMuYm90c1VBKSAhPT0gJ1tvYmplY3QgQXJyYXldJykge1xuICAgICAgX2RlYnVnKCdbU3BpZGVyYWJsZS1NaWRkbGV3YXJlXSBgb3B0cy5ib3RzVUFgIG11c3QgYmUgaW5zdGFuY2Ugb2YgQXJyYXksIGZhbGxpbmcgYmFjayB0byBkZWZhdWx0cy4nKTtcbiAgICAgIHRoaXMuYm90c1VBID0gdGhpcy5wcm90b3R5cGUuYm90c1VBO1xuICAgIH1cblxuICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodGhpcy5pZ25vcmVkSGVhZGVycykgIT09ICdbb2JqZWN0IEFycmF5XScpIHtcbiAgICAgIF9kZWJ1ZygnW1NwaWRlcmFibGUtTWlkZGxld2FyZV0gYG9wdHMuaWdub3JlZEhlYWRlcnNgIG11c3QgYmUgaW5zdGFuY2Ugb2YgQXJyYXksIGZhbGxpbmcgYmFjayB0byBkZWZhdWx0cy4nKTtcbiAgICAgIHRoaXMuaWdub3JlZEhlYWRlcnMgPSB0aGlzLnByb3RvdHlwZS5pZ25vcmVkSGVhZGVycztcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vbmx5ICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh0aGlzLm9ubHkpICE9PSAnW29iamVjdCBBcnJheV0nKSB7XG4gICAgICBfZGVidWcoJ1tTcGlkZXJhYmxlLU1pZGRsZXdhcmVdIGBvcHRzLm9ubHlgIG11c3QgYmUgaW5zdGFuY2Ugb2YgQXJyYXksIHJ1bGVzIGFyZSBpZ25vcmVkIScpO1xuICAgICAgdGhpcy5vbmx5ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmhhbmRsZXIpIHtcbiAgICAgIHRoaXMuaGFuZGxlciA9IHRoaXMubWlkZGxld2FyZTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuaGFuZGxlKSB7XG4gICAgICB0aGlzLmhhbmRsZSA9IHRoaXMubWlkZGxld2FyZTtcbiAgICB9XG5cbiAgICB0aGlzLmhlYWRlcnNSRSA9IG5ldyBSZWdFeHAodGhpcy5pZ25vcmVkSGVhZGVycy5qb2luKCd8JyksICdpJyk7XG4gICAgdGhpcy5ib3RzUkUgPSBuZXcgUmVnRXhwKHRoaXMuYm90c1VBLmpvaW4oJ3wnKSwgJ2knKTtcbiAgICBpZiAoIXRoaXMuYXV0aCkge1xuICAgICAgdGhpcy5hdXRoID0gcHJvY2Vzcy5lbnYuU1BJREVSQUJMRV9TRVJWSUNFX0FVVEggfHwgcHJvY2Vzcy5lbnYuUFJFUkVOREVSX1NFUlZJQ0VfQVVUSCB8fCAnJztcbiAgICB9XG5cbiAgICBpZiAoaWdub3JlICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChpZ25vcmUpICE9PSAnW29iamVjdCBBcnJheV0nKSB7XG4gICAgICBfZGVidWcoJ1tTcGlkZXJhYmxlLU1pZGRsZXdhcmVdIGBvcHRzLmlnbm9yZWAgbXVzdCBiZSBpbnN0YW5jZSBvZiBBcnJheSwgcnVsZXMgYXJlIGlnbm9yZWQhJyk7XG4gICAgICBpZ25vcmUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMucm9vdFVSTCkge1xuICAgICAgdGhpcy5yb290VVJMID0gcHJvY2Vzcy5lbnYuUk9PVF9VUkw7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLnNlcnZpY2VVUkwpIHtcbiAgICAgIHRoaXMuc2VydmljZVVSTCA9IHByb2Nlc3MuZW52LlNQSURFUkFCTEVfU0VSVklDRV9VUkwgfHwgcHJvY2Vzcy5lbnYuUFJFUkVOREVSX1NFUlZJQ0VfVVJMIHx8ICdodHRwczovL3JlbmRlci5vc3RyLmlvJztcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMucm9vdFVSTCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdbU3BpZGVyYWJsZS1NaWRkbGV3YXJlXSB7cm9vdFVSTH0gb3IgZW52IHZhcmlhYmxlIFJPT1RfVVJMIGlzIG5vdCBkZXRlY3RlZCEgQnV0IG11c3QgYmUgc3BlY2lmaWVkIScpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5zZXJ2aWNlVVJMKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1tTcGlkZXJhYmxlLU1pZGRsZXdhcmVdIHtzZXJ2aWNlVVJMfSBvciBlbnYgdmFyaWFibGUgU1BJREVSQUJMRV9TRVJWSUNFX1VSTCBvciBQUkVSRU5ERVJfU0VSVklDRV9VUkwgaXMgbm90IGRldGVjdGVkISBCdXQgbXVzdCBiZSBzcGVjaWZpZWQhJyk7XG4gICAgfVxuXG4gICAgaWYgKCFyZS5wcm90by50ZXN0KHRoaXMucm9vdFVSTCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignW1NwaWRlcmFibGUtTWlkZGxld2FyZV0ge3Jvb3RVUkx9IGlzIG1hbGZvcm1lZCEgTXVzdCBzdGFydCB3aXRoIHByb3RvY29sIGh0dHAgb3IgaHR0cHMnKTtcbiAgICB9XG5cbiAgICBpZiAoIXJlLnByb3RvLnRlc3QodGhpcy5zZXJ2aWNlVVJMKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdbU3BpZGVyYWJsZS1NaWRkbGV3YXJlXSB7c2VydmljZVVSTH0gaXMgbWFsZm9ybWVkISBNdXN0IHN0YXJ0IHdpdGggcHJvdG9jb2wgaHR0cCBvciBodHRwcycpO1xuICAgIH1cblxuICAgIHRoaXMucm9vdFVSTCAgICA9IHRoaXMucm9vdFVSTC5yZXBsYWNlKHJlLnRyYWlsaW5nU2xhc2gsICcnKS5yZXBsYWNlKHJlLmJlZ2lubmluZ1NsYXNoLCAnJyk7XG4gICAgdGhpcy5zZXJ2aWNlVVJMID0gdGhpcy5zZXJ2aWNlVVJMLnJlcGxhY2UocmUudHJhaWxpbmdTbGFzaCwgJycpLnJlcGxhY2UocmUuYmVnaW5uaW5nU2xhc2gsICcnKTtcblxuICAgIGlmIChpZ25vcmUpIHtcbiAgICAgIHRoaXMuaWdub3JlUkUgPSBuZXcgUmVnRXhwKGlnbm9yZS5qb2luKCd8JyksICcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5pZ25vcmVSRSA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIFNwaWRlcmFibGUucHJvdG90eXBlLmJvdHNVQSA9IFsnXFxcXC5uZXQgY3Jhd2xlcicsICczNjBzcGlkZXInLCAnNTBcXFxcLm51JywgJzhibyBjcmF3bGVyIGJvdCcsICdhYm91bmRleCcsICdhY2Nvb25hJywgJ2FkbGR4Ym90JywgJ2Fkc2JvdC1nb29nbGUnLCAnYWhyZWZzYm90JywgJ2FsdGF2aXN0YScsICdhcHBlbmdpbmUtZ29vZ2xlJywgJ2FwcGxlYm90JywgJ2FyY2hpdmVyJywgJ2FyaWVsaXNib3QnLCAnYXNrIGplZXZlcycsICdhdXNrdW5mdGJvdCcsICdiYWlkdW1vYmFpZGVyJywgJ2JhaWR1c3BpZGVyJywgJ2JlY29tZWJvdCcsICdiaW5nYm90JywgJ2JpbmdwcmV2aWV3JywgJ2JpdGJvdCcsICdiaXRseWJvdCcsICdibGl0emJvdCcsICdibG9nYnJpZGdlJywgJ2JvYXJkcmVhZGVyJywgJ2JvdHNlZXInLCAnY2F0Y2hib3QnLCAnY2F0Y2hwb2ludCBib3QnLCAnY2hhcmxvdHRlJywgJ2NoZWNrbGlua3MnLCAnY2xpcXpib3QnLCAnY2x1bWJvb3QnLCAnY29jY29jYm90JywgJ2NvbnZlcmFjcmF3bGVyJywgJ2NyYXdsLWUnLCAnY3Jhd2xjb252ZXJhJywgJ2RhdGFwYXJrc2VhcmNoJywgJ2RhdW0nLCAnZGV1c3UnLCAnZGV2ZWxvcGVyc1xcXFwuZ29vZ2xlXFxcXC5jb20vKy93ZWIvc25pcHBldCcsICdkaXNjb3JkYm90JywgJ2RvdGJvdCcsICdkdWNrZHVja2JvdCcsICdlbGVmZW50JywgJ2VtYmVkbHknLCAnZXZlcm5vdGUnLCAnZXhhYm90JywgJ2ZhY2Vib29rYm90JywgJ2ZhY2Vib29rZXh0ZXJuYWxoaXQnLCAnZmF0Ym90JywgJ2Zkc2Ugcm9ib3QnLCAnZmVlZCBzZWVrZXIgYm90JywgJ2ZlZWRmZXRjaGVyJywgJ2ZlbXRvc2VhcmNoYm90JywgJ2ZpbmRsaW5rcycsICdmbGFtaW5nb19zZWFyY2hlbmdpbmUnLCAnZmxpcGJvYXJkJywgJ2ZvbGxvd3NpdGUgYm90JywgJ2Z1cmxib3QnLCAnZnliZXJzcGlkZXInLCAnZ2Fpc2JvdCcsICdnYWxheHlib3QnLCAnZ2VuaWVib3QnLCAnZ2VuaWVvJywgJ2dpZ2FibGFzdCcsICdnaWdhYm90JywgJ2dpcmFmYWJvdCcsICdnb21lemFnZW50JywgJ2dvbnpvMScsICdnb29nbGUgc2tldGNodXAnLCAnZ29vZ2xlLXN0cnVjdHVyZWQtZGF0YS10ZXN0aW5nLXRvb2wnLCAnZ29vZ2xlYm90JywgJ2hhb3NvdXNwaWRlcicsICdoZXJpdHJpeCcsICdob2xtZXMnLCAnaG9vd3d3ZXInLCAnaHRkaWcnLCAnaWFfYXJjaGl2ZXInLCAnaWRib3QnLCAnaW5mdXphcHAnLCAnaW5ub3ZhemlvbiBjcmF3bGVyJywgJ2luc3RhZ3JhbScsICdpbnRlcm5ldGFyY2hpdmUnLCAnaXFkYicsICdpc2thbmllJywgJ2lzdGVsbGFib3QnLCAnaXpzZWFyY2hcXFxcLmNvbScsICdrYWxvb2dhYm90JywgJ2thelxcXFwua3pfYm90JywgJ2tkIGJvdCcsICdrb25xdWVyb3InLCAna3Jha2VuJywgJ2t1cnpvcicsICdsYXJiaW4nLCAnbGVpYScsICdsZXNuaWtib3QnLCAnbGluZ3VlZSBib3QnLCAnbGlua2FpZGVyJywgJ2xpbmthcGVkaWFib3QnLCAnbGlua2VkaW5ib3QnLCAnbGl0ZSBib3QnLCAnbGxhdXQnLCAnbG9va3NlZWsnLCAnbHljb3MnLCAnbWFpbFxcXFwucnVfYm90JywgJ21hc2lkYW5pX2JvdCcsICdtYXNzY2FuJywgJ21lZGlhcGFydG5lcnMtZ29vZ2xlJywgJ21ldGFqb2Jib3QnLCAnbWoxMmJvdCcsICdtbm9nb3NlYXJjaCcsICdtb2dpbW9naScsICdtb2plZWtib3QnLCAnbW90b21pbmVyYm90JywgJ21vemRleCcsICdtc2llY3Jhd2xlcicsICdtc25ib3QnLCAnbXNyYm90JywgJ25ldHB1cnN1YWwnLCAnbmV0cmVzZWFyY2gnLCAnbmV0dmliZXMnLCAnbmV3c2dhdG9yJywgJ25nLXNlYXJjaCcsICduaWNlYm90JywgJ251dGNoY3ZzJywgJ251enplbCcsICdueW1lc2lzJywgJ29iamVjdHNzZWFyY2gnLCAnb2RrbGJvdCcsICdvbWdpbGknLCAnb292b28nLCAnb296Ym90JywgJ29wZW5mb3Nib3QnLCAnb3JhbmdlYm90JywgJ29yYml0ZXInLCAnb3JnX2JvdCcsICdvdXRicmFpbicsICdwYWdlcGVla2VyJywgJ3BhZ2VzaW52ZW50b3J5JywgJ3BhcnNpam9vYm90JywgJ3BheGxlZnJhbWV3b3JrJywgJ3BlZXBsbyBzY3JlZW5zaG90IGJvdCcsICdwaW50ZXJlc3QnLCAncGxhbnR5bmV0X3dlYnJvYm90JywgJ3BsdWtraWUnLCAncG9tcG9zJywgJ3BzYm90JywgJ3F1b3JhIGxpbmsgcHJldmlldycsICdxd2FudGlmeScsICdyZWFkJTIwbGF0ZXInLCAncmVhcGVyJywgJ3JlZGNhcnBldCcsICdyZWRkaXRib3QnLCAncmV0cmVpdmVyJywgJ3JpZGRsZXInLCAncml2YWwgaXEnLCAncm9nZXJib3QnLCAnc2F1Y2VuYW8nLCAnc2Nvb3RlcicsICdzY3JhcHknLCAnc2NydWJieScsICdzZWFyY2hpZScsICdzZWFyY2hzaWdodCcsICdzZWVrYm90JywgJ3NlbWFudGljZGlzY292ZXJ5JywgJ3Nlem5hbWJvdCcsICdzaG93eW91Ym90JywgJ3NpbXBsZXBpZScsICdzaW1weScsICdzaXRlbG9ja3NwaWRlcicsICdza3lwZXVyaXByZXZpZXcnLCAnc2xhY2staW1ncHJveHknLCAnc2xhY2tib3QnLCAnc2x1cnAnLCAnc25hcHB5JywgJ3NvZ291JywgJ3NvbG9maWVsZCcsICdzcGVlZHkgc3BpZGVyJywgJ3NwZWVkeXNwaWRlcicsICdzcHV0bmlrYm90JywgJ3N0YWNrcmFtYmxlcicsICd0ZWVyYWlkYm90JywgJ3Rlb21hJywgJ3RoZXVzZWZ1bGJvdCcsICd0aHVtYnNob3RzXFxcXC5ydScsICd0aHVtYnNob3RzYm90JywgJ3RpbmV5ZScsICd0b3dleWFcXFxcLmNvbScsICd0b3dleWFib3QnLCAndHVtYmxyJywgJ3R3ZWV0ZWR0aW1lcycsICd0d2VldG1lbWVib3QnLCAndHdpdHRlcmJvdCcsICd1cmwycG5nJywgJ3ZhZ2Fib25kbycsICd2ZWJpZG9vYm90JywgJ3ZpYmVyJywgJ3Zpc2lvbnV0aWxzJywgJ3Zrc2hhcmUnLCAndm9pbGFib3QnLCAndm9ydGV4JywgJ3ZvdGF5IGJvdCcsICd2b3lhZ2VyJywgJ3czY192YWxpZGF0b3InLCAnd2FzYWxpdmVcXFxcLmJvdCcsICd3ZWItc25pZmZlcicsICd3ZWJzcXVhc2hcXFxcLmNvbScsICd3ZWJ0aHVtYicsICd3aGF0c2FwcCcsICd3aGF0d2ViJywgJ3dpcmUnLCAnd290Ym94JywgJ3lhY3lib3QnLCAneWFob28nLCAneWFuZGV4JywgJ3lldGknLCAneWlzb3VzcGlkZXInLCAneW9kYW9ib3QnLCAneW9vZ2xpZmV0Y2hhZ2VudCcsICd5b296Ym90JywgJ3lvdHRhYW1vbml0b3InLCAneW93ZWRvJywgJ3phby1jcmF3bGVyJywgJ3plYm90X3d3d1xcXFwuemVcXFxcLmJ6JywgJ3pvb3Nob3QnLCAnenlib3JnJ107XG5cbiAgU3BpZGVyYWJsZS5wcm90b3R5cGUuaWdub3JlZEhlYWRlcnMgPSBbJ2FnZScsICdhbHQtc3ZjJywgJ2NhY2hlLXN0YXR1cycsICdjZi1jYWNoZS1zdGF0dXMnLCAnY2YtY29ubmVjdGluZy1pcCcsICdjZi1pcGNvdW50cnknLCAnY2YtcmF5JywgJ2NuZWN0aW9uJywgJ2NuZW9uY3Rpb24nLCAnY29ubmVjdGlvbicsICdjb250ZW50LWVuY29kaW5nJywgJ2NvbnRlbnQtbGVuZ3RoJywgJ2RhdGUnLCAnZXRhZycsICdleHBlY3QtY3QnLCAnZXhwaXJlcycsICdrZWVwLWFsaXZlJywgJ2xhc3QtbW9kaWZpZWQnLCAnbGluaycsICdubmNvZWN0aW9uJywgJ3ByYWdtYScsICdzZXJ2ZXInLCAnc2V0LWNvb2tpZScsICdzdGF0dXMnLCAndHJhbnNmZXItZW5jb2RpbmcnLCAndmFyeScsICd2aWEnLCAnd3d3LWF1dGhlbnRpY2F0ZScsICd4LWFjY2VsLWJ1ZmZlcmluZycsICd4LWFjY2VsLWNoYXJzZXQnLCAneC1hY2NlbC1leHBpcmVzJywgJ3gtYWNjZWwtbGltaXQtcmF0ZScsICd4LWFjY2VsLXJlZGlyZWN0JywgJ3gtb3N0cmlvLWRvbWFpbicsICd4LXBvd2VyZWQtYnknLCAneC1wcmVwcmVuZGVyLXN0YXR1cycsICd4LXByZXJlbmRlci1zdGF0dXMnLCAneC1yZWFsLWlwJywgJ3gtcnVudGltZSddO1xuXG4gIFNwaWRlcmFibGUucHJvdG90eXBlLm1pZGRsZXdhcmUgPSBmdW5jdGlvbiAocmVxLCByZXMsIG5leHQpIHtcbiAgICBpZiAocmVxLm1ldGhvZC50b0xvd2VyQ2FzZSgpICE9PSAnZ2V0JyAmJiByZXEubWV0aG9kLnRvTG93ZXJDYXNlKCkgIT09ICdoZWFkJykge1xuICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICB9XG5cbiAgICB2YXIgdXJsT2JqID0gdXJsLnBhcnNlKHJlcS51cmwsIHRydWUpO1xuICAgIGlmICh1cmxPYmoucXVlcnkuX2VzY2FwZWRfZnJhZ21lbnRfICE9PSB2b2lkIDAgfHwgdGhpcy5ib3RzUkUudGVzdChyZXEuaGVhZGVyc1sndXNlci1hZ2VudCddIHx8ICcnKSkge1xuICAgICAgdmFyIGhhc0lnbm9yZWQgPSBmYWxzZTtcbiAgICAgIHZhciBoYXNPbmx5ICAgID0gZmFsc2U7XG5cbiAgICAgIGlmICh0aGlzLnN0YXRpY0V4dC50ZXN0KHVybE9iai5wYXRobmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub25seVJFKSB7XG4gICAgICAgIGhhc09ubHkgICAgPSB0aGlzLm9ubHlSRS50ZXN0KHVybE9iai5wYXRobmFtZSk7XG4gICAgICAgIGhhc0lnbm9yZWQgPSAhaGFzT25seTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFoYXNPbmx5ICYmIHRoaXMub25seSkge1xuICAgICAgICBoYXNJZ25vcmVkID0gdHJ1ZTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMub25seS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodGhpcy5vbmx5W2ldKSA9PT0gJ1tvYmplY3QgU3RyaW5nXScpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLm9ubHlbaV0gPT09IHVybE9iai5wYXRobmFtZSkge1xuICAgICAgICAgICAgICBoYXNJZ25vcmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgIGhhc09ubHkgICAgPSB0cnVlO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh0aGlzLm9ubHlbaV0pID09PSAnW29iamVjdCBSZWdFeHBdJykge1xuICAgICAgICAgICAgaWYgKHRoaXMub25seVtpXS50ZXN0KHVybE9iai5wYXRobmFtZSkpIHtcbiAgICAgICAgICAgICAgaGFzSWdub3JlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICBoYXNPbmx5ICAgID0gdHJ1ZTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIF9kZWJ1ZygnW1NwaWRlcmFibGUtTWlkZGxld2FyZV0gYG9wdHMub25seWAgeycgKyB0aGlzLm9ubHlbaV0gKyAnfSBydWxlIGlzblxcJ3QgaW5zdGFuY2Ugb2Yge1N0cmluZ30gbm9yIHtSZWdFeHB9LCBydWxlIGlnbm9yZWQhJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmlnbm9yZVJFICYmIHRoaXMuaWdub3JlUkUudGVzdCh1cmxPYmoucGF0aG5hbWUpKSB7XG4gICAgICAgIGhhc0lnbm9yZWQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoaGFzSWdub3JlZCkge1xuICAgICAgICByZXR1cm4gbmV4dCgpO1xuICAgICAgfVxuXG4gICAgICB2YXIgcmVxVXJsID0gdGhpcy5yb290VVJMO1xuXG4gICAgICB1cmxPYmoucGF0aCA9IHVybE9iai5wYXRoLnJlcGxhY2UocmUudHJhaWxpbmdTbGFzaCwgJycpLnJlcGxhY2UocmUuYmVnaW5uaW5nU2xhc2gsICcnKTtcbiAgICAgIGlmICh1cmxPYmoucXVlcnkuX2VzY2FwZWRfZnJhZ21lbnRfICE9PSB2b2lkIDAgJiYgdXJsT2JqLnF1ZXJ5Ll9lc2NhcGVkX2ZyYWdtZW50Xy5sZW5ndGgpIHtcbiAgICAgICAgdXJsT2JqLnBhdGhuYW1lICs9ICcvJyArIHVybE9iai5xdWVyeS5fZXNjYXBlZF9mcmFnbWVudF8ucmVwbGFjZShyZS5iZWdpbm5pbmdTbGFzaCwgJycpO1xuICAgICAgfVxuXG4gICAgICByZXFVcmwgKz0gJy8nICsgdXJsT2JqLnBhdGhuYW1lO1xuICAgICAgcmVxVXJsICA9IHJlcVVybC5yZXBsYWNlKC8oW146XVxcLylcXC8rL2csICckMScpO1xuXG4gICAgICB2YXIgb3B0cyAgPSB7XG4gICAgICAgIHVyaTogKHRoaXMuc2VydmljZVVSTCArICcvP3VybD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHJlcVVybCkpLnJlcGxhY2UoLyhbXjpdXFwvKVxcLysvZywgJyQxJyksXG4gICAgICAgIHdhaXQ6IHRydWUsXG4gICAgICAgIGF1dGg6IHRoaXMuYXV0aCB8fCBmYWxzZSxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdVc2VyLUFnZW50JzogJ3NwaWRlcmFibGUtbWlkZGxld2FyZS8xLjQuMidcbiAgICAgICAgfSxcbiAgICAgICAgcmF3Qm9keTogdHJ1ZVxuICAgICAgfTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIHVzZWRIZWFkZXJzID0gW107XG4gICAgICAgIHZhciBfaGVhZGVyc1JFICA9IHRoaXMuaGVhZGVyc1JFO1xuICAgICAgICB2YXIgc2VydmljZVJlcSAgPSByZXF1ZXN0KG9wdHMsIGZ1bmN0aW9uIChlcnJvciwgcmVzcCkge1xuICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgX2RlYnVnKCdbU3BpZGVyYWJsZS1NaWRkbGV3YXJlXSBbcmVxdWVzdC5nZXRdIEVycm9yIHdoaWxlIGNvbm5lY3RpbmcgdG8gZXh0ZXJuYWwgc2VydmljZTonLCBlcnJvcik7XG4gICAgICAgICAgICBuZXh0KCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChyZXNwLnN0YXR1c0NvZGUgPT09IDQwMSB8fCByZXNwLnN0YXR1c0NvZGUgPT09IDQwMykge1xuICAgICAgICAgICAgICBfZGVidWcoJ1tTcGlkZXJhYmxlLU1pZGRsZXdhcmVdIENhblxcJ3QgYXV0aGVudGljYXRlISBQbGVhc2UgY2hlY2sgeW91IFwiYXV0aFwiIHBhcmFtZXRlciBhbmQgb3RoZXIgc2V0dGluZ3MuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IHJlc3Auc3RhdHVzQ29kZSB8fCAyMDA7XG4gICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBzZXJ2aWNlUmVxLnJlcXVlc3Qub24oJ2hlYWRlcicsIGZ1bmN0aW9uIChoZWFkZXIpIHtcbiAgICAgICAgICB2YXIgaCA9IGhlYWRlci50b1N0cmluZygndXRmOCcpO1xuICAgICAgICAgIGlmICghIX5oLmluZGV4T2YoJzonKSkge1xuICAgICAgICAgICAgaCA9IGguc3BsaXQocmUuc2VtaSk7XG4gICAgICAgICAgICBoWzBdID0gaFswXS50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIGhbMV0gPSBoWzFdLnJlcGxhY2UoL1xccnxcXG4vLCAnJykudHJpbSgpO1xuXG4gICAgICAgICAgICBpZiAoIXJlcy5oZWFkZXJzU2VudCAmJiBoWzFdLmxlbmd0aCAmJiAhX2hlYWRlcnNSRS50ZXN0KGhbMF0pICYmICF1c2VkSGVhZGVycy5pbmNsdWRlcyhoWzBdKSkge1xuICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKGhbMF0sIGhbMV0pO1xuICAgICAgICAgICAgICB1c2VkSGVhZGVycy5wdXNoKGhbMF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2VydmljZVJlcS5yZXF1ZXN0Lm9uKCdkYXRhJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICByZXMud3JpdGUoZGF0YS50b1N0cmluZygndXRmOCcpLCAndXRmOCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXEub24oJ2Fib3J0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgX2RlYnVnKCdbU3BpZGVyYWJsZS1NaWRkbGV3YXJlXSBbUkVRXSBbXCJhYm9ydGVkXCIgZXZlbnRdOicsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgcmVxLmFib3J0ZWQgPSB0cnVlO1xuICAgICAgICAgIHNlcnZpY2VSZXEuYWJvcnQoKTtcbiAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJlcS5vbignZXJyb3InLCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICBfZGVidWcoJ1tTcGlkZXJhYmxlLU1pZGRsZXdhcmVdIFtSRVFdIFtcImVycm9yXCIgZXZlbnRdIFVuZXhwZWN0ZWQgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgICAgIHNlcnZpY2VSZXEuYWJvcnQoKTtcbiAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJlcy5vbignZXJyb3InLCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgICBfZGVidWcoJ1tTcGlkZXJhYmxlLU1pZGRsZXdhcmVdIFtSRVNdIFtcImVycm9yXCIgZXZlbnRdIFVuZXhwZWN0ZWQgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgICAgIHNlcnZpY2VSZXEuYWJvcnQoKTtcbiAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJlcy5vbignY2xvc2UnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgX2RlYnVnKCdbU3BpZGVyYWJsZS1NaWRkbGV3YXJlXSBbUkVTXSBbXCJjbG9zZVwiIGV2ZW50XTonLCBhcmd1bWVudHMpO1xuICAgICAgICAgIHNlcnZpY2VSZXEuYWJvcnQoKTtcbiAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJlcy5zZW5kRGF0ZSA9IGZhbHNlO1xuICAgICAgICBzZXJ2aWNlUmVxLnNlbmQoKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgX2RlYnVnKCdbU3BpZGVyYWJsZS1NaWRkbGV3YXJlXSBFeGNlcHRpb24gd2hpbGUgY29ubmVjdGluZyB0byBleHRlcm5hbCBzZXJ2aWNlOicsIGUpO1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIG5leHQoKTtcbiAgfTtcblxuICByZXR1cm4gU3BpZGVyYWJsZTtcbn0pKCk7XG4iXX0=
