(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var Retry = Package.retry.Retry;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var options;

var require = meteorInstall({"node_modules":{"meteor":{"socket-stream-client":{"server.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/socket-stream-client/server.js                                                                        //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
const module1 = module;
let setMinimumBrowserVersions;
module1.watch(require("meteor/modern-browsers"), {
  setMinimumBrowserVersions(v) {
    setMinimumBrowserVersions = v;
  }

}, 0);
setMinimumBrowserVersions({
  chrome: 16,
  edge: 12,
  firefox: 11,
  ie: 10,
  mobileSafari: [6, 1],
  phantomjs: 2,
  safari: 7,
  electron: [0, 20]
}, module.id);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/socket-stream-client/node.js                                                                          //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
const module1 = module;
module1.export({
  ClientStream: () => ClientStream
});
let Meteor;
module1.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let toWebsocketUrl;
module1.watch(require("./urls.js"), {
  toWebsocketUrl(v) {
    toWebsocketUrl = v;
  }

}, 1);
let StreamClientCommon;
module1.watch(require("./common.js"), {
  StreamClientCommon(v) {
    StreamClientCommon = v;
  }

}, 2);

class ClientStream extends StreamClientCommon {
  constructor(endpoint, options) {
    super(options);
    this.client = null; // created in _launchConnection

    this.endpoint = endpoint;
    this.headers = this.options.headers || Object.create(null);
    this.npmFayeOptions = this.options.npmFayeOptions || Object.create(null);

    this._initCommon(this.options); //// Kickoff!


    this._launchConnection();
  } // data is a utf8 string. Data sent while not connected is dropped on
  // the floor, and it is up the user of this API to retransmit lost
  // messages on 'reset'


  send(data) {
    if (this.currentStatus.connected) {
      this.client.send(data);
    }
  } // Changes where this connection points


  _changeUrl(url) {
    this.endpoint = url;
  }

  _onConnect(client) {
    if (client !== this.client) {
      // This connection is not from the last call to _launchConnection.
      // But _launchConnection calls _cleanup which closes previous connections.
      // It's our belief that this stifles future 'open' events, but maybe
      // we are wrong?
      throw new Error('Got open from inactive client ' + !!this.client);
    }

    if (this._forcedToDisconnect) {
      // We were asked to disconnect between trying to open the connection and
      // actually opening it. Let's just pretend this never happened.
      this.client.close();
      this.client = null;
      return;
    }

    if (this.currentStatus.connected) {
      // We already have a connection. It must have been the case that we
      // started two parallel connection attempts (because we wanted to
      // 'reconnect now' on a hanging connection and we had no way to cancel the
      // connection attempt.) But this shouldn't happen (similarly to the client
      // !== this.client check above).
      throw new Error('Two parallel connections?');
    }

    this._clearConnectionTimer(); // update status


    this.currentStatus.status = 'connected';
    this.currentStatus.connected = true;
    this.currentStatus.retryCount = 0;
    this.statusChanged(); // fire resets. This must come after status change so that clients
    // can call send from within a reset callback.

    this.forEachCallback('reset', callback => {
      callback();
    });
  }

  _cleanup(maybeError) {
    this._clearConnectionTimer();

    if (this.client) {
      var client = this.client;
      this.client = null;
      client.close();
      this.forEachCallback('disconnect', callback => {
        callback(maybeError);
      });
    }
  }

  _clearConnectionTimer() {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  _getProxyUrl(targetUrl) {
    // Similar to code in tools/http-helpers.js.
    var proxy = process.env.HTTP_PROXY || process.env.http_proxy || null; // if we're going to a secure url, try the https_proxy env variable first.

    if (targetUrl.match(/^wss:/)) {
      proxy = process.env.HTTPS_PROXY || process.env.https_proxy || proxy;
    }

    return proxy;
  }

  _launchConnection() {
    this._cleanup(); // cleanup the old socket, if there was one.
    // Since server-to-server DDP is still an experimental feature, we only
    // require the module if we actually create a server-to-server
    // connection.


    var FayeWebSocket = Npm.require('faye-websocket');

    var deflate = Npm.require('permessage-deflate');

    var targetUrl = toWebsocketUrl(this.endpoint);
    var fayeOptions = {
      headers: this.headers,
      extensions: [deflate]
    };
    fayeOptions = Object.assign(fayeOptions, this.npmFayeOptions);

    var proxyUrl = this._getProxyUrl(targetUrl);

    if (proxyUrl) {
      fayeOptions.proxy = {
        origin: proxyUrl
      };
    } // We would like to specify 'ddp' as the subprotocol here. The npm module we
    // used to use as a client would fail the handshake if we ask for a
    // subprotocol and the server doesn't send one back (and sockjs doesn't).
    // Faye doesn't have that behavior; it's unclear from reading RFC 6455 if
    // Faye is erroneous or not.  So for now, we don't specify protocols.


    var subprotocols = [];
    var client = this.client = new FayeWebSocket.Client(targetUrl, subprotocols, fayeOptions);

    this._clearConnectionTimer();

    this.connectionTimer = Meteor.setTimeout(() => {
      this._lostConnection(new this.ConnectionError('DDP connection timed out'));
    }, this.CONNECT_TIMEOUT);
    this.client.on('open', Meteor.bindEnvironment(() => {
      return this._onConnect(client);
    }, 'stream connect callback'));

    var clientOnIfCurrent = (event, description, callback) => {
      this.client.on(event, Meteor.bindEnvironment((...args) => {
        // Ignore events from any connection we've already cleaned up.
        if (client !== this.client) return;
        callback(...args);
      }, description));
    };

    clientOnIfCurrent('error', 'stream error callback', error => {
      if (!this.options._dontPrintErrors) Meteor._debug('stream error', error.message); // Faye's 'error' object is not a JS error (and among other things,
      // doesn't stringify well). Convert it to one.

      this._lostConnection(new this.ConnectionError(error.message));
    });
    clientOnIfCurrent('close', 'stream close callback', () => {
      this._lostConnection();
    });
    clientOnIfCurrent('message', 'stream message callback', message => {
      // Ignore binary frames, where message.data is a Buffer
      if (typeof message.data !== 'string') return;
      this.forEachCallback('message', callback => {
        callback(message.data);
      });
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"common.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/socket-stream-client/common.js                                                                        //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

module.export({
  StreamClientCommon: () => StreamClientCommon
});
let Retry;
module.watch(require("meteor/retry"), {
  Retry(v) {
    Retry = v;
  }

}, 0);
const forcedReconnectError = new Error("forced reconnect");

class StreamClientCommon {
  constructor(options) {
    this.options = (0, _objectSpread2.default)({
      retry: true
    }, options || null);
    this.ConnectionError = options && options.ConnectionError || Error;
  } // Register for callbacks.


  on(name, callback) {
    if (name !== 'message' && name !== 'reset' && name !== 'disconnect') throw new Error('unknown event type: ' + name);
    if (!this.eventCallbacks[name]) this.eventCallbacks[name] = [];
    this.eventCallbacks[name].push(callback);
  }

  forEachCallback(name, cb) {
    if (!this.eventCallbacks[name] || !this.eventCallbacks[name].length) {
      return;
    }

    this.eventCallbacks[name].forEach(cb);
  }

  _initCommon(options) {
    options = options || Object.create(null); //// Constants
    // how long to wait until we declare the connection attempt
    // failed.

    this.CONNECT_TIMEOUT = options.connectTimeoutMs || 10000;
    this.eventCallbacks = Object.create(null); // name -> [callback]

    this._forcedToDisconnect = false; //// Reactive status

    this.currentStatus = {
      status: 'connecting',
      connected: false,
      retryCount: 0
    };

    if (Package.tracker) {
      this.statusListeners = new Package.tracker.Tracker.Dependency();
    }

    this.statusChanged = () => {
      if (this.statusListeners) {
        this.statusListeners.changed();
      }
    }; //// Retry logic


    this._retry = new Retry();
    this.connectionTimer = null;
  } // Trigger a reconnect.


  reconnect(options) {
    options = options || Object.create(null);

    if (options.url) {
      this._changeUrl(options.url);
    }

    if (options._sockjsOptions) {
      this.options._sockjsOptions = options._sockjsOptions;
    }

    if (this.currentStatus.connected) {
      if (options._force || options.url) {
        this._lostConnection(forcedReconnectError);
      }

      return;
    } // if we're mid-connection, stop it.


    if (this.currentStatus.status === 'connecting') {
      // Pretend it's a clean close.
      this._lostConnection();
    }

    this._retry.clear();

    this.currentStatus.retryCount -= 1; // don't count manual retries

    this._retryNow();
  }

  disconnect(options) {
    options = options || Object.create(null); // Failed is permanent. If we're failed, don't let people go back
    // online by calling 'disconnect' then 'reconnect'.

    if (this._forcedToDisconnect) return; // If _permanent is set, permanently disconnect a stream. Once a stream
    // is forced to disconnect, it can never reconnect. This is for
    // error cases such as ddp version mismatch, where trying again
    // won't fix the problem.

    if (options._permanent) {
      this._forcedToDisconnect = true;
    }

    this._cleanup();

    this._retry.clear();

    this.currentStatus = {
      status: options._permanent ? 'failed' : 'offline',
      connected: false,
      retryCount: 0
    };
    if (options._permanent && options._error) this.currentStatus.reason = options._error;
    this.statusChanged();
  } // maybeError is set unless it's a clean protocol-level close.


  _lostConnection(maybeError) {
    this._cleanup(maybeError);

    this._retryLater(maybeError); // sets status. no need to do it here.

  } // fired when we detect that we've gone online. try to reconnect
  // immediately.


  _online() {
    // if we've requested to be offline by disconnecting, don't reconnect.
    if (this.currentStatus.status != 'offline') this.reconnect();
  }

  _retryLater(maybeError) {
    var timeout = 0;

    if (this.options.retry || maybeError === forcedReconnectError) {
      timeout = this._retry.retryLater(this.currentStatus.retryCount, this._retryNow.bind(this));
      this.currentStatus.status = 'waiting';
      this.currentStatus.retryTime = new Date().getTime() + timeout;
    } else {
      this.currentStatus.status = 'failed';
      delete this.currentStatus.retryTime;
    }

    this.currentStatus.connected = false;
    this.statusChanged();
  }

  _retryNow() {
    if (this._forcedToDisconnect) return;
    this.currentStatus.retryCount += 1;
    this.currentStatus.status = 'connecting';
    this.currentStatus.connected = false;
    delete this.currentStatus.retryTime;
    this.statusChanged();

    this._launchConnection();
  } // Get current status. Reactive.


  status() {
    if (this.statusListeners) {
      this.statusListeners.depend();
    }

    return this.currentStatus;
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"urls.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/socket-stream-client/urls.js                                                                          //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
module.export({
  toSockjsUrl: () => toSockjsUrl,
  toWebsocketUrl: () => toWebsocketUrl
});

// @param url {String} URL to Meteor app, eg:
//   "/" or "madewith.meteor.com" or "https://foo.meteor.com"
//   or "ddp+sockjs://ddp--****-foo.meteor.com/sockjs"
// @returns {String} URL to the endpoint with the specific scheme and subPath, e.g.
// for scheme "http" and subPath "sockjs"
//   "http://subdomain.meteor.com/sockjs" or "/sockjs"
//   or "https://ddp--1234-foo.meteor.com/sockjs"
function translateUrl(url, newSchemeBase, subPath) {
  if (!newSchemeBase) {
    newSchemeBase = 'http';
  }

  if (subPath !== "sockjs" && url.startsWith("/")) {
    url = Meteor.absoluteUrl(url.substr(1));
  }

  var ddpUrlMatch = url.match(/^ddp(i?)\+sockjs:\/\//);
  var httpUrlMatch = url.match(/^http(s?):\/\//);
  var newScheme;

  if (ddpUrlMatch) {
    // Remove scheme and split off the host.
    var urlAfterDDP = url.substr(ddpUrlMatch[0].length);
    newScheme = ddpUrlMatch[1] === 'i' ? newSchemeBase : newSchemeBase + 's';
    var slashPos = urlAfterDDP.indexOf('/');
    var host = slashPos === -1 ? urlAfterDDP : urlAfterDDP.substr(0, slashPos);
    var rest = slashPos === -1 ? '' : urlAfterDDP.substr(slashPos); // In the host (ONLY!), change '*' characters into random digits. This
    // allows different stream connections to connect to different hostnames
    // and avoid browser per-hostname connection limits.

    host = host.replace(/\*/g, () => Math.floor(Math.random() * 10));
    return newScheme + '://' + host + rest;
  } else if (httpUrlMatch) {
    newScheme = !httpUrlMatch[1] ? newSchemeBase : newSchemeBase + 's';
    var urlAfterHttp = url.substr(httpUrlMatch[0].length);
    url = newScheme + '://' + urlAfterHttp;
  } // Prefix FQDNs but not relative URLs


  if (url.indexOf('://') === -1 && !url.startsWith('/')) {
    url = newSchemeBase + '://' + url;
  } // XXX This is not what we should be doing: if I have a site
  // deployed at "/foo", then DDP.connect("/") should actually connect
  // to "/", not to "/foo". "/" is an absolute path. (Contrast: if
  // deployed at "/foo", it would be reasonable for DDP.connect("bar")
  // to connect to "/foo/bar").
  //
  // We should make this properly honor absolute paths rather than
  // forcing the path to be relative to the site root. Simultaneously,
  // we should set DDP_DEFAULT_CONNECTION_URL to include the site
  // root. See also client_convenience.js #RationalizingRelativeDDPURLs


  url = Meteor._relativeToSiteRootUrl(url);
  if (url.endsWith('/')) return url + subPath;else return url + '/' + subPath;
}

function toSockjsUrl(url) {
  return translateUrl(url, 'http', 'sockjs');
}

function toWebsocketUrl(url) {
  return translateUrl(url, 'ws', 'websocket');
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/socket-stream-client/server.js");

/* Exports */
Package._define("socket-stream-client");

})();

//# sourceURL=meteor://💻app/packages/socket-stream-client.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc29ja2V0LXN0cmVhbS1jbGllbnQvc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9zb2NrZXQtc3RyZWFtLWNsaWVudC9ub2RlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9zb2NrZXQtc3RyZWFtLWNsaWVudC9jb21tb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3NvY2tldC1zdHJlYW0tY2xpZW50L3VybHMuanMiXSwibmFtZXMiOlsibW9kdWxlMSIsIm1vZHVsZSIsInNldE1pbmltdW1Ccm93c2VyVmVyc2lvbnMiLCJ3YXRjaCIsInJlcXVpcmUiLCJ2IiwiY2hyb21lIiwiZWRnZSIsImZpcmVmb3giLCJpZSIsIm1vYmlsZVNhZmFyaSIsInBoYW50b21qcyIsInNhZmFyaSIsImVsZWN0cm9uIiwiaWQiLCJleHBvcnQiLCJDbGllbnRTdHJlYW0iLCJNZXRlb3IiLCJ0b1dlYnNvY2tldFVybCIsIlN0cmVhbUNsaWVudENvbW1vbiIsImNvbnN0cnVjdG9yIiwiZW5kcG9pbnQiLCJvcHRpb25zIiwiY2xpZW50IiwiaGVhZGVycyIsIk9iamVjdCIsImNyZWF0ZSIsIm5wbUZheWVPcHRpb25zIiwiX2luaXRDb21tb24iLCJfbGF1bmNoQ29ubmVjdGlvbiIsInNlbmQiLCJkYXRhIiwiY3VycmVudFN0YXR1cyIsImNvbm5lY3RlZCIsIl9jaGFuZ2VVcmwiLCJ1cmwiLCJfb25Db25uZWN0IiwiRXJyb3IiLCJfZm9yY2VkVG9EaXNjb25uZWN0IiwiY2xvc2UiLCJfY2xlYXJDb25uZWN0aW9uVGltZXIiLCJzdGF0dXMiLCJyZXRyeUNvdW50Iiwic3RhdHVzQ2hhbmdlZCIsImZvckVhY2hDYWxsYmFjayIsImNhbGxiYWNrIiwiX2NsZWFudXAiLCJtYXliZUVycm9yIiwiY29ubmVjdGlvblRpbWVyIiwiY2xlYXJUaW1lb3V0IiwiX2dldFByb3h5VXJsIiwidGFyZ2V0VXJsIiwicHJveHkiLCJwcm9jZXNzIiwiZW52IiwiSFRUUF9QUk9YWSIsImh0dHBfcHJveHkiLCJtYXRjaCIsIkhUVFBTX1BST1hZIiwiaHR0cHNfcHJveHkiLCJGYXllV2ViU29ja2V0IiwiTnBtIiwiZGVmbGF0ZSIsImZheWVPcHRpb25zIiwiZXh0ZW5zaW9ucyIsImFzc2lnbiIsInByb3h5VXJsIiwib3JpZ2luIiwic3VicHJvdG9jb2xzIiwiQ2xpZW50Iiwic2V0VGltZW91dCIsIl9sb3N0Q29ubmVjdGlvbiIsIkNvbm5lY3Rpb25FcnJvciIsIkNPTk5FQ1RfVElNRU9VVCIsIm9uIiwiYmluZEVudmlyb25tZW50IiwiY2xpZW50T25JZkN1cnJlbnQiLCJldmVudCIsImRlc2NyaXB0aW9uIiwiYXJncyIsImVycm9yIiwiX2RvbnRQcmludEVycm9ycyIsIl9kZWJ1ZyIsIm1lc3NhZ2UiLCJSZXRyeSIsImZvcmNlZFJlY29ubmVjdEVycm9yIiwicmV0cnkiLCJuYW1lIiwiZXZlbnRDYWxsYmFja3MiLCJwdXNoIiwiY2IiLCJsZW5ndGgiLCJmb3JFYWNoIiwiY29ubmVjdFRpbWVvdXRNcyIsIlBhY2thZ2UiLCJ0cmFja2VyIiwic3RhdHVzTGlzdGVuZXJzIiwiVHJhY2tlciIsIkRlcGVuZGVuY3kiLCJjaGFuZ2VkIiwiX3JldHJ5IiwicmVjb25uZWN0IiwiX3NvY2tqc09wdGlvbnMiLCJfZm9yY2UiLCJjbGVhciIsIl9yZXRyeU5vdyIsImRpc2Nvbm5lY3QiLCJfcGVybWFuZW50IiwiX2Vycm9yIiwicmVhc29uIiwiX3JldHJ5TGF0ZXIiLCJfb25saW5lIiwidGltZW91dCIsInJldHJ5TGF0ZXIiLCJiaW5kIiwicmV0cnlUaW1lIiwiRGF0ZSIsImdldFRpbWUiLCJkZXBlbmQiLCJ0b1NvY2tqc1VybCIsInRyYW5zbGF0ZVVybCIsIm5ld1NjaGVtZUJhc2UiLCJzdWJQYXRoIiwic3RhcnRzV2l0aCIsImFic29sdXRlVXJsIiwic3Vic3RyIiwiZGRwVXJsTWF0Y2giLCJodHRwVXJsTWF0Y2giLCJuZXdTY2hlbWUiLCJ1cmxBZnRlckREUCIsInNsYXNoUG9zIiwiaW5kZXhPZiIsImhvc3QiLCJyZXN0IiwicmVwbGFjZSIsIk1hdGgiLCJmbG9vciIsInJhbmRvbSIsInVybEFmdGVySHR0cCIsIl9yZWxhdGl2ZVRvU2l0ZVJvb3RVcmwiLCJlbmRzV2l0aCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFNQSxVQUFRQyxNQUFkO0FBQXFCLElBQUlDLHlCQUFKO0FBQThCRixRQUFRRyxLQUFSLENBQWNDLFFBQVEsd0JBQVIsQ0FBZCxFQUFnRDtBQUFDRiw0QkFBMEJHLENBQTFCLEVBQTRCO0FBQUNILGdDQUEwQkcsQ0FBMUI7QUFBNEI7O0FBQTFELENBQWhELEVBQTRHLENBQTVHO0FBSW5ESCwwQkFBMEI7QUFDeEJJLFVBQVEsRUFEZ0I7QUFFeEJDLFFBQU0sRUFGa0I7QUFHeEJDLFdBQVMsRUFIZTtBQUl4QkMsTUFBSSxFQUpvQjtBQUt4QkMsZ0JBQWMsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUxVO0FBTXhCQyxhQUFXLENBTmE7QUFPeEJDLFVBQVEsQ0FQZ0I7QUFReEJDLFlBQVUsQ0FBQyxDQUFELEVBQUksRUFBSjtBQVJjLENBQTFCLEVBU0daLE9BQU9hLEVBVFYsRTs7Ozs7Ozs7Ozs7QUNKQSxNQUFNZCxVQUFRQyxNQUFkO0FBQXFCRCxRQUFRZSxNQUFSLENBQWU7QUFBQ0MsZ0JBQWEsTUFBSUE7QUFBbEIsQ0FBZjtBQUFnRCxJQUFJQyxNQUFKO0FBQVdqQixRQUFRRyxLQUFSLENBQWNDLFFBQVEsZUFBUixDQUFkLEVBQXVDO0FBQUNhLFNBQU9aLENBQVAsRUFBUztBQUFDWSxhQUFPWixDQUFQO0FBQVM7O0FBQXBCLENBQXZDLEVBQTZELENBQTdEO0FBQWdFLElBQUlhLGNBQUo7QUFBbUJsQixRQUFRRyxLQUFSLENBQWNDLFFBQVEsV0FBUixDQUFkLEVBQW1DO0FBQUNjLGlCQUFlYixDQUFmLEVBQWlCO0FBQUNhLHFCQUFlYixDQUFmO0FBQWlCOztBQUFwQyxDQUFuQyxFQUF5RSxDQUF6RTtBQUE0RSxJQUFJYyxrQkFBSjtBQUF1Qm5CLFFBQVFHLEtBQVIsQ0FBY0MsUUFBUSxhQUFSLENBQWQsRUFBcUM7QUFBQ2UscUJBQW1CZCxDQUFuQixFQUFxQjtBQUFDYyx5QkFBbUJkLENBQW5CO0FBQXFCOztBQUE1QyxDQUFyQyxFQUFtRixDQUFuRjs7QUFlL1AsTUFBTVcsWUFBTixTQUEyQkcsa0JBQTNCLENBQThDO0FBQ25EQyxjQUFZQyxRQUFaLEVBQXNCQyxPQUF0QixFQUErQjtBQUM3QixVQUFNQSxPQUFOO0FBRUEsU0FBS0MsTUFBTCxHQUFjLElBQWQsQ0FINkIsQ0FHVDs7QUFDcEIsU0FBS0YsUUFBTCxHQUFnQkEsUUFBaEI7QUFFQSxTQUFLRyxPQUFMLEdBQWUsS0FBS0YsT0FBTCxDQUFhRSxPQUFiLElBQXdCQyxPQUFPQyxNQUFQLENBQWMsSUFBZCxDQUF2QztBQUNBLFNBQUtDLGNBQUwsR0FBc0IsS0FBS0wsT0FBTCxDQUFhSyxjQUFiLElBQStCRixPQUFPQyxNQUFQLENBQWMsSUFBZCxDQUFyRDs7QUFFQSxTQUFLRSxXQUFMLENBQWlCLEtBQUtOLE9BQXRCLEVBVDZCLENBVzdCOzs7QUFDQSxTQUFLTyxpQkFBTDtBQUNELEdBZGtELENBZ0JuRDtBQUNBO0FBQ0E7OztBQUNBQyxPQUFLQyxJQUFMLEVBQVc7QUFDVCxRQUFJLEtBQUtDLGFBQUwsQ0FBbUJDLFNBQXZCLEVBQWtDO0FBQ2hDLFdBQUtWLE1BQUwsQ0FBWU8sSUFBWixDQUFpQkMsSUFBakI7QUFDRDtBQUNGLEdBdkJrRCxDQXlCbkQ7OztBQUNBRyxhQUFXQyxHQUFYLEVBQWdCO0FBQ2QsU0FBS2QsUUFBTCxHQUFnQmMsR0FBaEI7QUFDRDs7QUFFREMsYUFBV2IsTUFBWCxFQUFtQjtBQUNqQixRQUFJQSxXQUFXLEtBQUtBLE1BQXBCLEVBQTRCO0FBQzFCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsWUFBTSxJQUFJYyxLQUFKLENBQVUsbUNBQW1DLENBQUMsQ0FBQyxLQUFLZCxNQUFwRCxDQUFOO0FBQ0Q7O0FBRUQsUUFBSSxLQUFLZSxtQkFBVCxFQUE4QjtBQUM1QjtBQUNBO0FBQ0EsV0FBS2YsTUFBTCxDQUFZZ0IsS0FBWjtBQUNBLFdBQUtoQixNQUFMLEdBQWMsSUFBZDtBQUNBO0FBQ0Q7O0FBRUQsUUFBSSxLQUFLUyxhQUFMLENBQW1CQyxTQUF2QixFQUFrQztBQUNoQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsWUFBTSxJQUFJSSxLQUFKLENBQVUsMkJBQVYsQ0FBTjtBQUNEOztBQUVELFNBQUtHLHFCQUFMLEdBMUJpQixDQTRCakI7OztBQUNBLFNBQUtSLGFBQUwsQ0FBbUJTLE1BQW5CLEdBQTRCLFdBQTVCO0FBQ0EsU0FBS1QsYUFBTCxDQUFtQkMsU0FBbkIsR0FBK0IsSUFBL0I7QUFDQSxTQUFLRCxhQUFMLENBQW1CVSxVQUFuQixHQUFnQyxDQUFoQztBQUNBLFNBQUtDLGFBQUwsR0FoQ2lCLENBa0NqQjtBQUNBOztBQUNBLFNBQUtDLGVBQUwsQ0FBcUIsT0FBckIsRUFBOEJDLFlBQVk7QUFDeENBO0FBQ0QsS0FGRDtBQUdEOztBQUVEQyxXQUFTQyxVQUFULEVBQXFCO0FBQ25CLFNBQUtQLHFCQUFMOztBQUNBLFFBQUksS0FBS2pCLE1BQVQsRUFBaUI7QUFDZixVQUFJQSxTQUFTLEtBQUtBLE1BQWxCO0FBQ0EsV0FBS0EsTUFBTCxHQUFjLElBQWQ7QUFDQUEsYUFBT2dCLEtBQVA7QUFFQSxXQUFLSyxlQUFMLENBQXFCLFlBQXJCLEVBQW1DQyxZQUFZO0FBQzdDQSxpQkFBU0UsVUFBVDtBQUNELE9BRkQ7QUFHRDtBQUNGOztBQUVEUCwwQkFBd0I7QUFDdEIsUUFBSSxLQUFLUSxlQUFULEVBQTBCO0FBQ3hCQyxtQkFBYSxLQUFLRCxlQUFsQjtBQUNBLFdBQUtBLGVBQUwsR0FBdUIsSUFBdkI7QUFDRDtBQUNGOztBQUVERSxlQUFhQyxTQUFiLEVBQXdCO0FBQ3RCO0FBQ0EsUUFBSUMsUUFBUUMsUUFBUUMsR0FBUixDQUFZQyxVQUFaLElBQTBCRixRQUFRQyxHQUFSLENBQVlFLFVBQXRDLElBQW9ELElBQWhFLENBRnNCLENBR3RCOztBQUNBLFFBQUlMLFVBQVVNLEtBQVYsQ0FBZ0IsT0FBaEIsQ0FBSixFQUE4QjtBQUM1QkwsY0FBUUMsUUFBUUMsR0FBUixDQUFZSSxXQUFaLElBQTJCTCxRQUFRQyxHQUFSLENBQVlLLFdBQXZDLElBQXNEUCxLQUE5RDtBQUNEOztBQUNELFdBQU9BLEtBQVA7QUFDRDs7QUFFRHZCLHNCQUFvQjtBQUNsQixTQUFLaUIsUUFBTCxHQURrQixDQUNEO0FBRWpCO0FBQ0E7QUFDQTs7O0FBQ0EsUUFBSWMsZ0JBQWdCQyxJQUFJekQsT0FBSixDQUFZLGdCQUFaLENBQXBCOztBQUNBLFFBQUkwRCxVQUFVRCxJQUFJekQsT0FBSixDQUFZLG9CQUFaLENBQWQ7O0FBRUEsUUFBSStDLFlBQVlqQyxlQUFlLEtBQUtHLFFBQXBCLENBQWhCO0FBQ0EsUUFBSTBDLGNBQWM7QUFDaEJ2QyxlQUFTLEtBQUtBLE9BREU7QUFFaEJ3QyxrQkFBWSxDQUFDRixPQUFEO0FBRkksS0FBbEI7QUFJQUMsa0JBQWN0QyxPQUFPd0MsTUFBUCxDQUFjRixXQUFkLEVBQTJCLEtBQUtwQyxjQUFoQyxDQUFkOztBQUNBLFFBQUl1QyxXQUFXLEtBQUtoQixZQUFMLENBQWtCQyxTQUFsQixDQUFmOztBQUNBLFFBQUllLFFBQUosRUFBYztBQUNaSCxrQkFBWVgsS0FBWixHQUFvQjtBQUFFZSxnQkFBUUQ7QUFBVixPQUFwQjtBQUNELEtBbEJpQixDQW9CbEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0EsUUFBSUUsZUFBZSxFQUFuQjtBQUVBLFFBQUk3QyxTQUFVLEtBQUtBLE1BQUwsR0FBYyxJQUFJcUMsY0FBY1MsTUFBbEIsQ0FDMUJsQixTQUQwQixFQUUxQmlCLFlBRjBCLEVBRzFCTCxXQUgwQixDQUE1Qjs7QUFNQSxTQUFLdkIscUJBQUw7O0FBQ0EsU0FBS1EsZUFBTCxHQUF1Qi9CLE9BQU9xRCxVQUFQLENBQWtCLE1BQU07QUFDN0MsV0FBS0MsZUFBTCxDQUFxQixJQUFJLEtBQUtDLGVBQVQsQ0FBeUIsMEJBQXpCLENBQXJCO0FBQ0QsS0FGc0IsRUFFcEIsS0FBS0MsZUFGZSxDQUF2QjtBQUlBLFNBQUtsRCxNQUFMLENBQVltRCxFQUFaLENBQ0UsTUFERixFQUVFekQsT0FBTzBELGVBQVAsQ0FBdUIsTUFBTTtBQUMzQixhQUFPLEtBQUt2QyxVQUFMLENBQWdCYixNQUFoQixDQUFQO0FBQ0QsS0FGRCxFQUVHLHlCQUZILENBRkY7O0FBT0EsUUFBSXFELG9CQUFvQixDQUFDQyxLQUFELEVBQVFDLFdBQVIsRUFBcUJqQyxRQUFyQixLQUFrQztBQUN4RCxXQUFLdEIsTUFBTCxDQUFZbUQsRUFBWixDQUNFRyxLQURGLEVBRUU1RCxPQUFPMEQsZUFBUCxDQUF1QixDQUFDLEdBQUdJLElBQUosS0FBYTtBQUNsQztBQUNBLFlBQUl4RCxXQUFXLEtBQUtBLE1BQXBCLEVBQTRCO0FBQzVCc0IsaUJBQVMsR0FBR2tDLElBQVo7QUFDRCxPQUpELEVBSUdELFdBSkgsQ0FGRjtBQVFELEtBVEQ7O0FBV0FGLHNCQUFrQixPQUFsQixFQUEyQix1QkFBM0IsRUFBb0RJLFNBQVM7QUFDM0QsVUFBSSxDQUFDLEtBQUsxRCxPQUFMLENBQWEyRCxnQkFBbEIsRUFDRWhFLE9BQU9pRSxNQUFQLENBQWMsY0FBZCxFQUE4QkYsTUFBTUcsT0FBcEMsRUFGeUQsQ0FJM0Q7QUFDQTs7QUFDQSxXQUFLWixlQUFMLENBQXFCLElBQUksS0FBS0MsZUFBVCxDQUF5QlEsTUFBTUcsT0FBL0IsQ0FBckI7QUFDRCxLQVBEO0FBU0FQLHNCQUFrQixPQUFsQixFQUEyQix1QkFBM0IsRUFBb0QsTUFBTTtBQUN4RCxXQUFLTCxlQUFMO0FBQ0QsS0FGRDtBQUlBSyxzQkFBa0IsU0FBbEIsRUFBNkIseUJBQTdCLEVBQXdETyxXQUFXO0FBQ2pFO0FBQ0EsVUFBSSxPQUFPQSxRQUFRcEQsSUFBZixLQUF3QixRQUE1QixFQUFzQztBQUV0QyxXQUFLYSxlQUFMLENBQXFCLFNBQXJCLEVBQWdDQyxZQUFZO0FBQzFDQSxpQkFBU3NDLFFBQVFwRCxJQUFqQjtBQUNELE9BRkQ7QUFHRCxLQVBEO0FBUUQ7O0FBbExrRCxDOzs7Ozs7Ozs7Ozs7Ozs7QUNmckQ5QixPQUFPYyxNQUFQLENBQWM7QUFBQ0ksc0JBQW1CLE1BQUlBO0FBQXhCLENBQWQ7QUFBMkQsSUFBSWlFLEtBQUo7QUFBVW5GLE9BQU9FLEtBQVAsQ0FBYUMsUUFBUSxjQUFSLENBQWIsRUFBcUM7QUFBQ2dGLFFBQU0vRSxDQUFOLEVBQVE7QUFBQytFLFlBQU0vRSxDQUFOO0FBQVE7O0FBQWxCLENBQXJDLEVBQXlELENBQXpEO0FBRXJFLE1BQU1nRix1QkFBdUIsSUFBSWhELEtBQUosQ0FBVSxrQkFBVixDQUE3Qjs7QUFFTyxNQUFNbEIsa0JBQU4sQ0FBeUI7QUFDOUJDLGNBQVlFLE9BQVosRUFBcUI7QUFDbkIsU0FBS0EsT0FBTDtBQUNFZ0UsYUFBTztBQURULE9BRU1oRSxXQUFXLElBRmpCO0FBS0EsU0FBS2tELGVBQUwsR0FDRWxELFdBQVdBLFFBQVFrRCxlQUFuQixJQUFzQ25DLEtBRHhDO0FBRUQsR0FUNkIsQ0FXOUI7OztBQUNBcUMsS0FBR2EsSUFBSCxFQUFTMUMsUUFBVCxFQUFtQjtBQUNqQixRQUFJMEMsU0FBUyxTQUFULElBQXNCQSxTQUFTLE9BQS9CLElBQTBDQSxTQUFTLFlBQXZELEVBQ0UsTUFBTSxJQUFJbEQsS0FBSixDQUFVLHlCQUF5QmtELElBQW5DLENBQU47QUFFRixRQUFJLENBQUMsS0FBS0MsY0FBTCxDQUFvQkQsSUFBcEIsQ0FBTCxFQUFnQyxLQUFLQyxjQUFMLENBQW9CRCxJQUFwQixJQUE0QixFQUE1QjtBQUNoQyxTQUFLQyxjQUFMLENBQW9CRCxJQUFwQixFQUEwQkUsSUFBMUIsQ0FBK0I1QyxRQUEvQjtBQUNEOztBQUVERCxrQkFBZ0IyQyxJQUFoQixFQUFzQkcsRUFBdEIsRUFBMEI7QUFDeEIsUUFBSSxDQUFDLEtBQUtGLGNBQUwsQ0FBb0JELElBQXBCLENBQUQsSUFBOEIsQ0FBQyxLQUFLQyxjQUFMLENBQW9CRCxJQUFwQixFQUEwQkksTUFBN0QsRUFBcUU7QUFDbkU7QUFDRDs7QUFFRCxTQUFLSCxjQUFMLENBQW9CRCxJQUFwQixFQUEwQkssT0FBMUIsQ0FBa0NGLEVBQWxDO0FBQ0Q7O0FBRUQ5RCxjQUFZTixPQUFaLEVBQXFCO0FBQ25CQSxjQUFVQSxXQUFXRyxPQUFPQyxNQUFQLENBQWMsSUFBZCxDQUFyQixDQURtQixDQUduQjtBQUVBO0FBQ0E7O0FBQ0EsU0FBSytDLGVBQUwsR0FBdUJuRCxRQUFRdUUsZ0JBQVIsSUFBNEIsS0FBbkQ7QUFFQSxTQUFLTCxjQUFMLEdBQXNCL0QsT0FBT0MsTUFBUCxDQUFjLElBQWQsQ0FBdEIsQ0FUbUIsQ0FTd0I7O0FBRTNDLFNBQUtZLG1CQUFMLEdBQTJCLEtBQTNCLENBWG1CLENBYW5COztBQUNBLFNBQUtOLGFBQUwsR0FBcUI7QUFDbkJTLGNBQVEsWUFEVztBQUVuQlIsaUJBQVcsS0FGUTtBQUduQlMsa0JBQVk7QUFITyxLQUFyQjs7QUFNQSxRQUFJb0QsUUFBUUMsT0FBWixFQUFxQjtBQUNuQixXQUFLQyxlQUFMLEdBQXVCLElBQUlGLFFBQVFDLE9BQVIsQ0FBZ0JFLE9BQWhCLENBQXdCQyxVQUE1QixFQUF2QjtBQUNEOztBQUVELFNBQUt2RCxhQUFMLEdBQXFCLE1BQU07QUFDekIsVUFBSSxLQUFLcUQsZUFBVCxFQUEwQjtBQUN4QixhQUFLQSxlQUFMLENBQXFCRyxPQUFyQjtBQUNEO0FBQ0YsS0FKRCxDQXhCbUIsQ0E4Qm5COzs7QUFDQSxTQUFLQyxNQUFMLEdBQWMsSUFBSWhCLEtBQUosRUFBZDtBQUNBLFNBQUtwQyxlQUFMLEdBQXVCLElBQXZCO0FBQ0QsR0E3RDZCLENBK0Q5Qjs7O0FBQ0FxRCxZQUFVL0UsT0FBVixFQUFtQjtBQUNqQkEsY0FBVUEsV0FBV0csT0FBT0MsTUFBUCxDQUFjLElBQWQsQ0FBckI7O0FBRUEsUUFBSUosUUFBUWEsR0FBWixFQUFpQjtBQUNmLFdBQUtELFVBQUwsQ0FBZ0JaLFFBQVFhLEdBQXhCO0FBQ0Q7O0FBRUQsUUFBSWIsUUFBUWdGLGNBQVosRUFBNEI7QUFDMUIsV0FBS2hGLE9BQUwsQ0FBYWdGLGNBQWIsR0FBOEJoRixRQUFRZ0YsY0FBdEM7QUFDRDs7QUFFRCxRQUFJLEtBQUt0RSxhQUFMLENBQW1CQyxTQUF2QixFQUFrQztBQUNoQyxVQUFJWCxRQUFRaUYsTUFBUixJQUFrQmpGLFFBQVFhLEdBQTlCLEVBQW1DO0FBQ2pDLGFBQUtvQyxlQUFMLENBQXFCYyxvQkFBckI7QUFDRDs7QUFDRDtBQUNELEtBaEJnQixDQWtCakI7OztBQUNBLFFBQUksS0FBS3JELGFBQUwsQ0FBbUJTLE1BQW5CLEtBQThCLFlBQWxDLEVBQWdEO0FBQzlDO0FBQ0EsV0FBSzhCLGVBQUw7QUFDRDs7QUFFRCxTQUFLNkIsTUFBTCxDQUFZSSxLQUFaOztBQUNBLFNBQUt4RSxhQUFMLENBQW1CVSxVQUFuQixJQUFpQyxDQUFqQyxDQXpCaUIsQ0F5Qm1COztBQUNwQyxTQUFLK0QsU0FBTDtBQUNEOztBQUVEQyxhQUFXcEYsT0FBWCxFQUFvQjtBQUNsQkEsY0FBVUEsV0FBV0csT0FBT0MsTUFBUCxDQUFjLElBQWQsQ0FBckIsQ0FEa0IsQ0FHbEI7QUFDQTs7QUFDQSxRQUFJLEtBQUtZLG1CQUFULEVBQThCLE9BTFosQ0FPbEI7QUFDQTtBQUNBO0FBQ0E7O0FBQ0EsUUFBSWhCLFFBQVFxRixVQUFaLEVBQXdCO0FBQ3RCLFdBQUtyRSxtQkFBTCxHQUEyQixJQUEzQjtBQUNEOztBQUVELFNBQUtRLFFBQUw7O0FBQ0EsU0FBS3NELE1BQUwsQ0FBWUksS0FBWjs7QUFFQSxTQUFLeEUsYUFBTCxHQUFxQjtBQUNuQlMsY0FBUW5CLFFBQVFxRixVQUFSLEdBQXFCLFFBQXJCLEdBQWdDLFNBRHJCO0FBRW5CMUUsaUJBQVcsS0FGUTtBQUduQlMsa0JBQVk7QUFITyxLQUFyQjtBQU1BLFFBQUlwQixRQUFRcUYsVUFBUixJQUFzQnJGLFFBQVFzRixNQUFsQyxFQUNFLEtBQUs1RSxhQUFMLENBQW1CNkUsTUFBbkIsR0FBNEJ2RixRQUFRc0YsTUFBcEM7QUFFRixTQUFLakUsYUFBTDtBQUNELEdBekg2QixDQTJIOUI7OztBQUNBNEIsa0JBQWdCeEIsVUFBaEIsRUFBNEI7QUFDMUIsU0FBS0QsUUFBTCxDQUFjQyxVQUFkOztBQUNBLFNBQUsrRCxXQUFMLENBQWlCL0QsVUFBakIsRUFGMEIsQ0FFSTs7QUFDL0IsR0EvSDZCLENBaUk5QjtBQUNBOzs7QUFDQWdFLFlBQVU7QUFDUjtBQUNBLFFBQUksS0FBSy9FLGFBQUwsQ0FBbUJTLE1BQW5CLElBQTZCLFNBQWpDLEVBQTRDLEtBQUs0RCxTQUFMO0FBQzdDOztBQUVEUyxjQUFZL0QsVUFBWixFQUF3QjtBQUN0QixRQUFJaUUsVUFBVSxDQUFkOztBQUNBLFFBQUksS0FBSzFGLE9BQUwsQ0FBYWdFLEtBQWIsSUFDQXZDLGVBQWVzQyxvQkFEbkIsRUFDeUM7QUFDdkMyQixnQkFBVSxLQUFLWixNQUFMLENBQVlhLFVBQVosQ0FDUixLQUFLakYsYUFBTCxDQUFtQlUsVUFEWCxFQUVSLEtBQUsrRCxTQUFMLENBQWVTLElBQWYsQ0FBb0IsSUFBcEIsQ0FGUSxDQUFWO0FBSUEsV0FBS2xGLGFBQUwsQ0FBbUJTLE1BQW5CLEdBQTRCLFNBQTVCO0FBQ0EsV0FBS1QsYUFBTCxDQUFtQm1GLFNBQW5CLEdBQStCLElBQUlDLElBQUosR0FBV0MsT0FBWCxLQUF1QkwsT0FBdEQ7QUFDRCxLQVJELE1BUU87QUFDTCxXQUFLaEYsYUFBTCxDQUFtQlMsTUFBbkIsR0FBNEIsUUFBNUI7QUFDQSxhQUFPLEtBQUtULGFBQUwsQ0FBbUJtRixTQUExQjtBQUNEOztBQUVELFNBQUtuRixhQUFMLENBQW1CQyxTQUFuQixHQUErQixLQUEvQjtBQUNBLFNBQUtVLGFBQUw7QUFDRDs7QUFFRDhELGNBQVk7QUFDVixRQUFJLEtBQUtuRSxtQkFBVCxFQUE4QjtBQUU5QixTQUFLTixhQUFMLENBQW1CVSxVQUFuQixJQUFpQyxDQUFqQztBQUNBLFNBQUtWLGFBQUwsQ0FBbUJTLE1BQW5CLEdBQTRCLFlBQTVCO0FBQ0EsU0FBS1QsYUFBTCxDQUFtQkMsU0FBbkIsR0FBK0IsS0FBL0I7QUFDQSxXQUFPLEtBQUtELGFBQUwsQ0FBbUJtRixTQUExQjtBQUNBLFNBQUt4RSxhQUFMOztBQUVBLFNBQUtkLGlCQUFMO0FBQ0QsR0FySzZCLENBdUs5Qjs7O0FBQ0FZLFdBQVM7QUFDUCxRQUFJLEtBQUt1RCxlQUFULEVBQTBCO0FBQ3hCLFdBQUtBLGVBQUwsQ0FBcUJzQixNQUFyQjtBQUNEOztBQUNELFdBQU8sS0FBS3RGLGFBQVo7QUFDRDs7QUE3SzZCLEM7Ozs7Ozs7Ozs7O0FDSmhDL0IsT0FBT2MsTUFBUCxDQUFjO0FBQUN3RyxlQUFZLE1BQUlBLFdBQWpCO0FBQTZCckcsa0JBQWUsTUFBSUE7QUFBaEQsQ0FBZDs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVNzRyxZQUFULENBQXNCckYsR0FBdEIsRUFBMkJzRixhQUEzQixFQUEwQ0MsT0FBMUMsRUFBbUQ7QUFDakQsTUFBSSxDQUFDRCxhQUFMLEVBQW9CO0FBQ2xCQSxvQkFBZ0IsTUFBaEI7QUFDRDs7QUFFRCxNQUFJQyxZQUFZLFFBQVosSUFBd0J2RixJQUFJd0YsVUFBSixDQUFlLEdBQWYsQ0FBNUIsRUFBaUQ7QUFDL0N4RixVQUFNbEIsT0FBTzJHLFdBQVAsQ0FBbUJ6RixJQUFJMEYsTUFBSixDQUFXLENBQVgsQ0FBbkIsQ0FBTjtBQUNEOztBQUVELE1BQUlDLGNBQWMzRixJQUFJc0IsS0FBSixDQUFVLHVCQUFWLENBQWxCO0FBQ0EsTUFBSXNFLGVBQWU1RixJQUFJc0IsS0FBSixDQUFVLGdCQUFWLENBQW5CO0FBQ0EsTUFBSXVFLFNBQUo7O0FBQ0EsTUFBSUYsV0FBSixFQUFpQjtBQUNmO0FBQ0EsUUFBSUcsY0FBYzlGLElBQUkwRixNQUFKLENBQVdDLFlBQVksQ0FBWixFQUFlbkMsTUFBMUIsQ0FBbEI7QUFDQXFDLGdCQUFZRixZQUFZLENBQVosTUFBbUIsR0FBbkIsR0FBeUJMLGFBQXpCLEdBQXlDQSxnQkFBZ0IsR0FBckU7QUFDQSxRQUFJUyxXQUFXRCxZQUFZRSxPQUFaLENBQW9CLEdBQXBCLENBQWY7QUFDQSxRQUFJQyxPQUFPRixhQUFhLENBQUMsQ0FBZCxHQUFrQkQsV0FBbEIsR0FBZ0NBLFlBQVlKLE1BQVosQ0FBbUIsQ0FBbkIsRUFBc0JLLFFBQXRCLENBQTNDO0FBQ0EsUUFBSUcsT0FBT0gsYUFBYSxDQUFDLENBQWQsR0FBa0IsRUFBbEIsR0FBdUJELFlBQVlKLE1BQVosQ0FBbUJLLFFBQW5CLENBQWxDLENBTmUsQ0FRZjtBQUNBO0FBQ0E7O0FBQ0FFLFdBQU9BLEtBQUtFLE9BQUwsQ0FBYSxLQUFiLEVBQW9CLE1BQU1DLEtBQUtDLEtBQUwsQ0FBV0QsS0FBS0UsTUFBTCxLQUFnQixFQUEzQixDQUExQixDQUFQO0FBRUEsV0FBT1QsWUFBWSxLQUFaLEdBQW9CSSxJQUFwQixHQUEyQkMsSUFBbEM7QUFDRCxHQWRELE1BY08sSUFBSU4sWUFBSixFQUFrQjtBQUN2QkMsZ0JBQVksQ0FBQ0QsYUFBYSxDQUFiLENBQUQsR0FBbUJOLGFBQW5CLEdBQW1DQSxnQkFBZ0IsR0FBL0Q7QUFDQSxRQUFJaUIsZUFBZXZHLElBQUkwRixNQUFKLENBQVdFLGFBQWEsQ0FBYixFQUFnQnBDLE1BQTNCLENBQW5CO0FBQ0F4RCxVQUFNNkYsWUFBWSxLQUFaLEdBQW9CVSxZQUExQjtBQUNELEdBOUJnRCxDQWdDakQ7OztBQUNBLE1BQUl2RyxJQUFJZ0csT0FBSixDQUFZLEtBQVosTUFBdUIsQ0FBQyxDQUF4QixJQUE2QixDQUFDaEcsSUFBSXdGLFVBQUosQ0FBZSxHQUFmLENBQWxDLEVBQXVEO0FBQ3JEeEYsVUFBTXNGLGdCQUFnQixLQUFoQixHQUF3QnRGLEdBQTlCO0FBQ0QsR0FuQ2dELENBcUNqRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0FBLFFBQU1sQixPQUFPMEgsc0JBQVAsQ0FBOEJ4RyxHQUE5QixDQUFOO0FBRUEsTUFBSUEsSUFBSXlHLFFBQUosQ0FBYSxHQUFiLENBQUosRUFBdUIsT0FBT3pHLE1BQU11RixPQUFiLENBQXZCLEtBQ0ssT0FBT3ZGLE1BQU0sR0FBTixHQUFZdUYsT0FBbkI7QUFDTjs7QUFFTSxTQUFTSCxXQUFULENBQXFCcEYsR0FBckIsRUFBMEI7QUFDL0IsU0FBT3FGLGFBQWFyRixHQUFiLEVBQWtCLE1BQWxCLEVBQTBCLFFBQTFCLENBQVA7QUFDRDs7QUFFTSxTQUFTakIsY0FBVCxDQUF3QmlCLEdBQXhCLEVBQTZCO0FBQ2xDLFNBQU9xRixhQUFhckYsR0FBYixFQUFrQixJQUFsQixFQUF3QixXQUF4QixDQUFQO0FBQ0QsQyIsImZpbGUiOiIvcGFja2FnZXMvc29ja2V0LXN0cmVhbS1jbGllbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBzZXRNaW5pbXVtQnJvd3NlclZlcnNpb25zLFxufSBmcm9tIFwibWV0ZW9yL21vZGVybi1icm93c2Vyc1wiO1xuXG5zZXRNaW5pbXVtQnJvd3NlclZlcnNpb25zKHtcbiAgY2hyb21lOiAxNixcbiAgZWRnZTogMTIsXG4gIGZpcmVmb3g6IDExLFxuICBpZTogMTAsXG4gIG1vYmlsZVNhZmFyaTogWzYsIDFdLFxuICBwaGFudG9tanM6IDIsXG4gIHNhZmFyaTogNyxcbiAgZWxlY3Ryb246IFswLCAyMF0sXG59LCBtb2R1bGUuaWQpO1xuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSBcIm1ldGVvci9tZXRlb3JcIjtcbmltcG9ydCB7IHRvV2Vic29ja2V0VXJsIH0gZnJvbSBcIi4vdXJscy5qc1wiO1xuaW1wb3J0IHsgU3RyZWFtQ2xpZW50Q29tbW9uIH0gZnJvbSBcIi4vY29tbW9uLmpzXCI7XG5cbi8vIEBwYXJhbSBlbmRwb2ludCB7U3RyaW5nfSBVUkwgdG8gTWV0ZW9yIGFwcFxuLy8gICBcImh0dHA6Ly9zdWJkb21haW4ubWV0ZW9yLmNvbS9cIiBvciBcIi9cIiBvclxuLy8gICBcImRkcCtzb2NranM6Ly9mb28tKioubWV0ZW9yLmNvbS9zb2NranNcIlxuLy9cbi8vIFdlIGRvIHNvbWUgcmV3cml0aW5nIG9mIHRoZSBVUkwgdG8gZXZlbnR1YWxseSBtYWtlIGl0IFwid3M6Ly9cIiBvciBcIndzczovL1wiLFxuLy8gd2hhdGV2ZXIgd2FzIHBhc3NlZCBpbi4gIEF0IHRoZSB2ZXJ5IGxlYXN0LCB3aGF0IE1ldGVvci5hYnNvbHV0ZVVybCgpIHJldHVybnNcbi8vIHVzIHNob3VsZCB3b3JrLlxuLy9cbi8vIFdlIGRvbid0IGRvIGFueSBoZWFydGJlYXRpbmcuIChUaGUgbG9naWMgdGhhdCBkaWQgdGhpcyBpbiBzb2NranMgd2FzIHJlbW92ZWQsXG4vLyBiZWNhdXNlIGl0IHVzZWQgYSBidWlsdC1pbiBzb2NranMgbWVjaGFuaXNtLiBXZSBjb3VsZCBkbyBpdCB3aXRoIFdlYlNvY2tldFxuLy8gcGluZyBmcmFtZXMgb3Igd2l0aCBERFAtbGV2ZWwgbWVzc2FnZXMuKVxuZXhwb3J0IGNsYXNzIENsaWVudFN0cmVhbSBleHRlbmRzIFN0cmVhbUNsaWVudENvbW1vbiB7XG4gIGNvbnN0cnVjdG9yKGVuZHBvaW50LCBvcHRpb25zKSB7XG4gICAgc3VwZXIob3B0aW9ucyk7XG5cbiAgICB0aGlzLmNsaWVudCA9IG51bGw7IC8vIGNyZWF0ZWQgaW4gX2xhdW5jaENvbm5lY3Rpb25cbiAgICB0aGlzLmVuZHBvaW50ID0gZW5kcG9pbnQ7XG5cbiAgICB0aGlzLmhlYWRlcnMgPSB0aGlzLm9wdGlvbnMuaGVhZGVycyB8fCBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIHRoaXMubnBtRmF5ZU9wdGlvbnMgPSB0aGlzLm9wdGlvbnMubnBtRmF5ZU9wdGlvbnMgfHwgT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIHRoaXMuX2luaXRDb21tb24odGhpcy5vcHRpb25zKTtcblxuICAgIC8vLy8gS2lja29mZiFcbiAgICB0aGlzLl9sYXVuY2hDb25uZWN0aW9uKCk7XG4gIH1cblxuICAvLyBkYXRhIGlzIGEgdXRmOCBzdHJpbmcuIERhdGEgc2VudCB3aGlsZSBub3QgY29ubmVjdGVkIGlzIGRyb3BwZWQgb25cbiAgLy8gdGhlIGZsb29yLCBhbmQgaXQgaXMgdXAgdGhlIHVzZXIgb2YgdGhpcyBBUEkgdG8gcmV0cmFuc21pdCBsb3N0XG4gIC8vIG1lc3NhZ2VzIG9uICdyZXNldCdcbiAgc2VuZChkYXRhKSB7XG4gICAgaWYgKHRoaXMuY3VycmVudFN0YXR1cy5jb25uZWN0ZWQpIHtcbiAgICAgIHRoaXMuY2xpZW50LnNlbmQoZGF0YSk7XG4gICAgfVxuICB9XG5cbiAgLy8gQ2hhbmdlcyB3aGVyZSB0aGlzIGNvbm5lY3Rpb24gcG9pbnRzXG4gIF9jaGFuZ2VVcmwodXJsKSB7XG4gICAgdGhpcy5lbmRwb2ludCA9IHVybDtcbiAgfVxuXG4gIF9vbkNvbm5lY3QoY2xpZW50KSB7XG4gICAgaWYgKGNsaWVudCAhPT0gdGhpcy5jbGllbnQpIHtcbiAgICAgIC8vIFRoaXMgY29ubmVjdGlvbiBpcyBub3QgZnJvbSB0aGUgbGFzdCBjYWxsIHRvIF9sYXVuY2hDb25uZWN0aW9uLlxuICAgICAgLy8gQnV0IF9sYXVuY2hDb25uZWN0aW9uIGNhbGxzIF9jbGVhbnVwIHdoaWNoIGNsb3NlcyBwcmV2aW91cyBjb25uZWN0aW9ucy5cbiAgICAgIC8vIEl0J3Mgb3VyIGJlbGllZiB0aGF0IHRoaXMgc3RpZmxlcyBmdXR1cmUgJ29wZW4nIGV2ZW50cywgYnV0IG1heWJlXG4gICAgICAvLyB3ZSBhcmUgd3Jvbmc/XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0dvdCBvcGVuIGZyb20gaW5hY3RpdmUgY2xpZW50ICcgKyAhIXRoaXMuY2xpZW50KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZm9yY2VkVG9EaXNjb25uZWN0KSB7XG4gICAgICAvLyBXZSB3ZXJlIGFza2VkIHRvIGRpc2Nvbm5lY3QgYmV0d2VlbiB0cnlpbmcgdG8gb3BlbiB0aGUgY29ubmVjdGlvbiBhbmRcbiAgICAgIC8vIGFjdHVhbGx5IG9wZW5pbmcgaXQuIExldCdzIGp1c3QgcHJldGVuZCB0aGlzIG5ldmVyIGhhcHBlbmVkLlxuICAgICAgdGhpcy5jbGllbnQuY2xvc2UoKTtcbiAgICAgIHRoaXMuY2xpZW50ID0gbnVsbDtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jdXJyZW50U3RhdHVzLmNvbm5lY3RlZCkge1xuICAgICAgLy8gV2UgYWxyZWFkeSBoYXZlIGEgY29ubmVjdGlvbi4gSXQgbXVzdCBoYXZlIGJlZW4gdGhlIGNhc2UgdGhhdCB3ZVxuICAgICAgLy8gc3RhcnRlZCB0d28gcGFyYWxsZWwgY29ubmVjdGlvbiBhdHRlbXB0cyAoYmVjYXVzZSB3ZSB3YW50ZWQgdG9cbiAgICAgIC8vICdyZWNvbm5lY3Qgbm93JyBvbiBhIGhhbmdpbmcgY29ubmVjdGlvbiBhbmQgd2UgaGFkIG5vIHdheSB0byBjYW5jZWwgdGhlXG4gICAgICAvLyBjb25uZWN0aW9uIGF0dGVtcHQuKSBCdXQgdGhpcyBzaG91bGRuJ3QgaGFwcGVuIChzaW1pbGFybHkgdG8gdGhlIGNsaWVudFxuICAgICAgLy8gIT09IHRoaXMuY2xpZW50IGNoZWNrIGFib3ZlKS5cbiAgICAgIHRocm93IG5ldyBFcnJvcignVHdvIHBhcmFsbGVsIGNvbm5lY3Rpb25zPycpO1xuICAgIH1cblxuICAgIHRoaXMuX2NsZWFyQ29ubmVjdGlvblRpbWVyKCk7XG5cbiAgICAvLyB1cGRhdGUgc3RhdHVzXG4gICAgdGhpcy5jdXJyZW50U3RhdHVzLnN0YXR1cyA9ICdjb25uZWN0ZWQnO1xuICAgIHRoaXMuY3VycmVudFN0YXR1cy5jb25uZWN0ZWQgPSB0cnVlO1xuICAgIHRoaXMuY3VycmVudFN0YXR1cy5yZXRyeUNvdW50ID0gMDtcbiAgICB0aGlzLnN0YXR1c0NoYW5nZWQoKTtcblxuICAgIC8vIGZpcmUgcmVzZXRzLiBUaGlzIG11c3QgY29tZSBhZnRlciBzdGF0dXMgY2hhbmdlIHNvIHRoYXQgY2xpZW50c1xuICAgIC8vIGNhbiBjYWxsIHNlbmQgZnJvbSB3aXRoaW4gYSByZXNldCBjYWxsYmFjay5cbiAgICB0aGlzLmZvckVhY2hDYWxsYmFjaygncmVzZXQnLCBjYWxsYmFjayA9PiB7XG4gICAgICBjYWxsYmFjaygpO1xuICAgIH0pO1xuICB9XG5cbiAgX2NsZWFudXAobWF5YmVFcnJvcikge1xuICAgIHRoaXMuX2NsZWFyQ29ubmVjdGlvblRpbWVyKCk7XG4gICAgaWYgKHRoaXMuY2xpZW50KSB7XG4gICAgICB2YXIgY2xpZW50ID0gdGhpcy5jbGllbnQ7XG4gICAgICB0aGlzLmNsaWVudCA9IG51bGw7XG4gICAgICBjbGllbnQuY2xvc2UoKTtcblxuICAgICAgdGhpcy5mb3JFYWNoQ2FsbGJhY2soJ2Rpc2Nvbm5lY3QnLCBjYWxsYmFjayA9PiB7XG4gICAgICAgIGNhbGxiYWNrKG1heWJlRXJyb3IpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgX2NsZWFyQ29ubmVjdGlvblRpbWVyKCkge1xuICAgIGlmICh0aGlzLmNvbm5lY3Rpb25UaW1lcikge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuY29ubmVjdGlvblRpbWVyKTtcbiAgICAgIHRoaXMuY29ubmVjdGlvblRpbWVyID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICBfZ2V0UHJveHlVcmwodGFyZ2V0VXJsKSB7XG4gICAgLy8gU2ltaWxhciB0byBjb2RlIGluIHRvb2xzL2h0dHAtaGVscGVycy5qcy5cbiAgICB2YXIgcHJveHkgPSBwcm9jZXNzLmVudi5IVFRQX1BST1hZIHx8IHByb2Nlc3MuZW52Lmh0dHBfcHJveHkgfHwgbnVsbDtcbiAgICAvLyBpZiB3ZSdyZSBnb2luZyB0byBhIHNlY3VyZSB1cmwsIHRyeSB0aGUgaHR0cHNfcHJveHkgZW52IHZhcmlhYmxlIGZpcnN0LlxuICAgIGlmICh0YXJnZXRVcmwubWF0Y2goL153c3M6LykpIHtcbiAgICAgIHByb3h5ID0gcHJvY2Vzcy5lbnYuSFRUUFNfUFJPWFkgfHwgcHJvY2Vzcy5lbnYuaHR0cHNfcHJveHkgfHwgcHJveHk7XG4gICAgfVxuICAgIHJldHVybiBwcm94eTtcbiAgfVxuXG4gIF9sYXVuY2hDb25uZWN0aW9uKCkge1xuICAgIHRoaXMuX2NsZWFudXAoKTsgLy8gY2xlYW51cCB0aGUgb2xkIHNvY2tldCwgaWYgdGhlcmUgd2FzIG9uZS5cblxuICAgIC8vIFNpbmNlIHNlcnZlci10by1zZXJ2ZXIgRERQIGlzIHN0aWxsIGFuIGV4cGVyaW1lbnRhbCBmZWF0dXJlLCB3ZSBvbmx5XG4gICAgLy8gcmVxdWlyZSB0aGUgbW9kdWxlIGlmIHdlIGFjdHVhbGx5IGNyZWF0ZSBhIHNlcnZlci10by1zZXJ2ZXJcbiAgICAvLyBjb25uZWN0aW9uLlxuICAgIHZhciBGYXllV2ViU29ja2V0ID0gTnBtLnJlcXVpcmUoJ2ZheWUtd2Vic29ja2V0Jyk7XG4gICAgdmFyIGRlZmxhdGUgPSBOcG0ucmVxdWlyZSgncGVybWVzc2FnZS1kZWZsYXRlJyk7XG5cbiAgICB2YXIgdGFyZ2V0VXJsID0gdG9XZWJzb2NrZXRVcmwodGhpcy5lbmRwb2ludCk7XG4gICAgdmFyIGZheWVPcHRpb25zID0ge1xuICAgICAgaGVhZGVyczogdGhpcy5oZWFkZXJzLFxuICAgICAgZXh0ZW5zaW9uczogW2RlZmxhdGVdXG4gICAgfTtcbiAgICBmYXllT3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oZmF5ZU9wdGlvbnMsIHRoaXMubnBtRmF5ZU9wdGlvbnMpO1xuICAgIHZhciBwcm94eVVybCA9IHRoaXMuX2dldFByb3h5VXJsKHRhcmdldFVybCk7XG4gICAgaWYgKHByb3h5VXJsKSB7XG4gICAgICBmYXllT3B0aW9ucy5wcm94eSA9IHsgb3JpZ2luOiBwcm94eVVybCB9O1xuICAgIH1cblxuICAgIC8vIFdlIHdvdWxkIGxpa2UgdG8gc3BlY2lmeSAnZGRwJyBhcyB0aGUgc3VicHJvdG9jb2wgaGVyZS4gVGhlIG5wbSBtb2R1bGUgd2VcbiAgICAvLyB1c2VkIHRvIHVzZSBhcyBhIGNsaWVudCB3b3VsZCBmYWlsIHRoZSBoYW5kc2hha2UgaWYgd2UgYXNrIGZvciBhXG4gICAgLy8gc3VicHJvdG9jb2wgYW5kIHRoZSBzZXJ2ZXIgZG9lc24ndCBzZW5kIG9uZSBiYWNrIChhbmQgc29ja2pzIGRvZXNuJ3QpLlxuICAgIC8vIEZheWUgZG9lc24ndCBoYXZlIHRoYXQgYmVoYXZpb3I7IGl0J3MgdW5jbGVhciBmcm9tIHJlYWRpbmcgUkZDIDY0NTUgaWZcbiAgICAvLyBGYXllIGlzIGVycm9uZW91cyBvciBub3QuICBTbyBmb3Igbm93LCB3ZSBkb24ndCBzcGVjaWZ5IHByb3RvY29scy5cbiAgICB2YXIgc3VicHJvdG9jb2xzID0gW107XG5cbiAgICB2YXIgY2xpZW50ID0gKHRoaXMuY2xpZW50ID0gbmV3IEZheWVXZWJTb2NrZXQuQ2xpZW50KFxuICAgICAgdGFyZ2V0VXJsLFxuICAgICAgc3VicHJvdG9jb2xzLFxuICAgICAgZmF5ZU9wdGlvbnNcbiAgICApKTtcblxuICAgIHRoaXMuX2NsZWFyQ29ubmVjdGlvblRpbWVyKCk7XG4gICAgdGhpcy5jb25uZWN0aW9uVGltZXIgPSBNZXRlb3Iuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLl9sb3N0Q29ubmVjdGlvbihuZXcgdGhpcy5Db25uZWN0aW9uRXJyb3IoJ0REUCBjb25uZWN0aW9uIHRpbWVkIG91dCcpKTtcbiAgICB9LCB0aGlzLkNPTk5FQ1RfVElNRU9VVCk7XG5cbiAgICB0aGlzLmNsaWVudC5vbihcbiAgICAgICdvcGVuJyxcbiAgICAgIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5fb25Db25uZWN0KGNsaWVudCk7XG4gICAgICB9LCAnc3RyZWFtIGNvbm5lY3QgY2FsbGJhY2snKVxuICAgICk7XG5cbiAgICB2YXIgY2xpZW50T25JZkN1cnJlbnQgPSAoZXZlbnQsIGRlc2NyaXB0aW9uLCBjYWxsYmFjaykgPT4ge1xuICAgICAgdGhpcy5jbGllbnQub24oXG4gICAgICAgIGV2ZW50LFxuICAgICAgICBNZXRlb3IuYmluZEVudmlyb25tZW50KCguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgLy8gSWdub3JlIGV2ZW50cyBmcm9tIGFueSBjb25uZWN0aW9uIHdlJ3ZlIGFscmVhZHkgY2xlYW5lZCB1cC5cbiAgICAgICAgICBpZiAoY2xpZW50ICE9PSB0aGlzLmNsaWVudCkgcmV0dXJuO1xuICAgICAgICAgIGNhbGxiYWNrKC4uLmFyZ3MpO1xuICAgICAgICB9LCBkZXNjcmlwdGlvbilcbiAgICAgICk7XG4gICAgfTtcblxuICAgIGNsaWVudE9uSWZDdXJyZW50KCdlcnJvcicsICdzdHJlYW0gZXJyb3IgY2FsbGJhY2snLCBlcnJvciA9PiB7XG4gICAgICBpZiAoIXRoaXMub3B0aW9ucy5fZG9udFByaW50RXJyb3JzKVxuICAgICAgICBNZXRlb3IuX2RlYnVnKCdzdHJlYW0gZXJyb3InLCBlcnJvci5tZXNzYWdlKTtcblxuICAgICAgLy8gRmF5ZSdzICdlcnJvcicgb2JqZWN0IGlzIG5vdCBhIEpTIGVycm9yIChhbmQgYW1vbmcgb3RoZXIgdGhpbmdzLFxuICAgICAgLy8gZG9lc24ndCBzdHJpbmdpZnkgd2VsbCkuIENvbnZlcnQgaXQgdG8gb25lLlxuICAgICAgdGhpcy5fbG9zdENvbm5lY3Rpb24obmV3IHRoaXMuQ29ubmVjdGlvbkVycm9yKGVycm9yLm1lc3NhZ2UpKTtcbiAgICB9KTtcblxuICAgIGNsaWVudE9uSWZDdXJyZW50KCdjbG9zZScsICdzdHJlYW0gY2xvc2UgY2FsbGJhY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLl9sb3N0Q29ubmVjdGlvbigpO1xuICAgIH0pO1xuXG4gICAgY2xpZW50T25JZkN1cnJlbnQoJ21lc3NhZ2UnLCAnc3RyZWFtIG1lc3NhZ2UgY2FsbGJhY2snLCBtZXNzYWdlID0+IHtcbiAgICAgIC8vIElnbm9yZSBiaW5hcnkgZnJhbWVzLCB3aGVyZSBtZXNzYWdlLmRhdGEgaXMgYSBCdWZmZXJcbiAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS5kYXRhICE9PSAnc3RyaW5nJykgcmV0dXJuO1xuXG4gICAgICB0aGlzLmZvckVhY2hDYWxsYmFjaygnbWVzc2FnZScsIGNhbGxiYWNrID0+IHtcbiAgICAgICAgY2FsbGJhY2sobWVzc2FnZS5kYXRhKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG4iLCJpbXBvcnQgeyBSZXRyeSB9IGZyb20gJ21ldGVvci9yZXRyeSc7XG5cbmNvbnN0IGZvcmNlZFJlY29ubmVjdEVycm9yID0gbmV3IEVycm9yKFwiZm9yY2VkIHJlY29ubmVjdFwiKTtcblxuZXhwb3J0IGNsYXNzIFN0cmVhbUNsaWVudENvbW1vbiB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgICByZXRyeTogdHJ1ZSxcbiAgICAgIC4uLihvcHRpb25zIHx8IG51bGwpLFxuICAgIH07XG5cbiAgICB0aGlzLkNvbm5lY3Rpb25FcnJvciA9XG4gICAgICBvcHRpb25zICYmIG9wdGlvbnMuQ29ubmVjdGlvbkVycm9yIHx8IEVycm9yO1xuICB9XG5cbiAgLy8gUmVnaXN0ZXIgZm9yIGNhbGxiYWNrcy5cbiAgb24obmFtZSwgY2FsbGJhY2spIHtcbiAgICBpZiAobmFtZSAhPT0gJ21lc3NhZ2UnICYmIG5hbWUgIT09ICdyZXNldCcgJiYgbmFtZSAhPT0gJ2Rpc2Nvbm5lY3QnKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bmtub3duIGV2ZW50IHR5cGU6ICcgKyBuYW1lKTtcblxuICAgIGlmICghdGhpcy5ldmVudENhbGxiYWNrc1tuYW1lXSkgdGhpcy5ldmVudENhbGxiYWNrc1tuYW1lXSA9IFtdO1xuICAgIHRoaXMuZXZlbnRDYWxsYmFja3NbbmFtZV0ucHVzaChjYWxsYmFjayk7XG4gIH1cblxuICBmb3JFYWNoQ2FsbGJhY2sobmFtZSwgY2IpIHtcbiAgICBpZiAoIXRoaXMuZXZlbnRDYWxsYmFja3NbbmFtZV0gfHwgIXRoaXMuZXZlbnRDYWxsYmFja3NbbmFtZV0ubGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5ldmVudENhbGxiYWNrc1tuYW1lXS5mb3JFYWNoKGNiKTtcbiAgfVxuXG4gIF9pbml0Q29tbW9uKG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgLy8vLyBDb25zdGFudHNcblxuICAgIC8vIGhvdyBsb25nIHRvIHdhaXQgdW50aWwgd2UgZGVjbGFyZSB0aGUgY29ubmVjdGlvbiBhdHRlbXB0XG4gICAgLy8gZmFpbGVkLlxuICAgIHRoaXMuQ09OTkVDVF9USU1FT1VUID0gb3B0aW9ucy5jb25uZWN0VGltZW91dE1zIHx8IDEwMDAwO1xuXG4gICAgdGhpcy5ldmVudENhbGxiYWNrcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7IC8vIG5hbWUgLT4gW2NhbGxiYWNrXVxuXG4gICAgdGhpcy5fZm9yY2VkVG9EaXNjb25uZWN0ID0gZmFsc2U7XG5cbiAgICAvLy8vIFJlYWN0aXZlIHN0YXR1c1xuICAgIHRoaXMuY3VycmVudFN0YXR1cyA9IHtcbiAgICAgIHN0YXR1czogJ2Nvbm5lY3RpbmcnLFxuICAgICAgY29ubmVjdGVkOiBmYWxzZSxcbiAgICAgIHJldHJ5Q291bnQ6IDBcbiAgICB9O1xuXG4gICAgaWYgKFBhY2thZ2UudHJhY2tlcikge1xuICAgICAgdGhpcy5zdGF0dXNMaXN0ZW5lcnMgPSBuZXcgUGFja2FnZS50cmFja2VyLlRyYWNrZXIuRGVwZW5kZW5jeSgpO1xuICAgIH1cblxuICAgIHRoaXMuc3RhdHVzQ2hhbmdlZCA9ICgpID0+IHtcbiAgICAgIGlmICh0aGlzLnN0YXR1c0xpc3RlbmVycykge1xuICAgICAgICB0aGlzLnN0YXR1c0xpc3RlbmVycy5jaGFuZ2VkKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8vLy8gUmV0cnkgbG9naWNcbiAgICB0aGlzLl9yZXRyeSA9IG5ldyBSZXRyeSgpO1xuICAgIHRoaXMuY29ubmVjdGlvblRpbWVyID0gbnVsbDtcbiAgfVxuXG4gIC8vIFRyaWdnZXIgYSByZWNvbm5lY3QuXG4gIHJlY29ubmVjdChvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwgT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIGlmIChvcHRpb25zLnVybCkge1xuICAgICAgdGhpcy5fY2hhbmdlVXJsKG9wdGlvbnMudXJsKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5fc29ja2pzT3B0aW9ucykge1xuICAgICAgdGhpcy5vcHRpb25zLl9zb2NranNPcHRpb25zID0gb3B0aW9ucy5fc29ja2pzT3B0aW9ucztcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jdXJyZW50U3RhdHVzLmNvbm5lY3RlZCkge1xuICAgICAgaWYgKG9wdGlvbnMuX2ZvcmNlIHx8IG9wdGlvbnMudXJsKSB7XG4gICAgICAgIHRoaXMuX2xvc3RDb25uZWN0aW9uKGZvcmNlZFJlY29ubmVjdEVycm9yKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBpZiB3ZSdyZSBtaWQtY29ubmVjdGlvbiwgc3RvcCBpdC5cbiAgICBpZiAodGhpcy5jdXJyZW50U3RhdHVzLnN0YXR1cyA9PT0gJ2Nvbm5lY3RpbmcnKSB7XG4gICAgICAvLyBQcmV0ZW5kIGl0J3MgYSBjbGVhbiBjbG9zZS5cbiAgICAgIHRoaXMuX2xvc3RDb25uZWN0aW9uKCk7XG4gICAgfVxuXG4gICAgdGhpcy5fcmV0cnkuY2xlYXIoKTtcbiAgICB0aGlzLmN1cnJlbnRTdGF0dXMucmV0cnlDb3VudCAtPSAxOyAvLyBkb24ndCBjb3VudCBtYW51YWwgcmV0cmllc1xuICAgIHRoaXMuX3JldHJ5Tm93KCk7XG4gIH1cblxuICBkaXNjb25uZWN0KG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgLy8gRmFpbGVkIGlzIHBlcm1hbmVudC4gSWYgd2UncmUgZmFpbGVkLCBkb24ndCBsZXQgcGVvcGxlIGdvIGJhY2tcbiAgICAvLyBvbmxpbmUgYnkgY2FsbGluZyAnZGlzY29ubmVjdCcgdGhlbiAncmVjb25uZWN0Jy5cbiAgICBpZiAodGhpcy5fZm9yY2VkVG9EaXNjb25uZWN0KSByZXR1cm47XG5cbiAgICAvLyBJZiBfcGVybWFuZW50IGlzIHNldCwgcGVybWFuZW50bHkgZGlzY29ubmVjdCBhIHN0cmVhbS4gT25jZSBhIHN0cmVhbVxuICAgIC8vIGlzIGZvcmNlZCB0byBkaXNjb25uZWN0LCBpdCBjYW4gbmV2ZXIgcmVjb25uZWN0LiBUaGlzIGlzIGZvclxuICAgIC8vIGVycm9yIGNhc2VzIHN1Y2ggYXMgZGRwIHZlcnNpb24gbWlzbWF0Y2gsIHdoZXJlIHRyeWluZyBhZ2FpblxuICAgIC8vIHdvbid0IGZpeCB0aGUgcHJvYmxlbS5cbiAgICBpZiAob3B0aW9ucy5fcGVybWFuZW50KSB7XG4gICAgICB0aGlzLl9mb3JjZWRUb0Rpc2Nvbm5lY3QgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMuX2NsZWFudXAoKTtcbiAgICB0aGlzLl9yZXRyeS5jbGVhcigpO1xuXG4gICAgdGhpcy5jdXJyZW50U3RhdHVzID0ge1xuICAgICAgc3RhdHVzOiBvcHRpb25zLl9wZXJtYW5lbnQgPyAnZmFpbGVkJyA6ICdvZmZsaW5lJyxcbiAgICAgIGNvbm5lY3RlZDogZmFsc2UsXG4gICAgICByZXRyeUNvdW50OiAwXG4gICAgfTtcblxuICAgIGlmIChvcHRpb25zLl9wZXJtYW5lbnQgJiYgb3B0aW9ucy5fZXJyb3IpXG4gICAgICB0aGlzLmN1cnJlbnRTdGF0dXMucmVhc29uID0gb3B0aW9ucy5fZXJyb3I7XG5cbiAgICB0aGlzLnN0YXR1c0NoYW5nZWQoKTtcbiAgfVxuXG4gIC8vIG1heWJlRXJyb3IgaXMgc2V0IHVubGVzcyBpdCdzIGEgY2xlYW4gcHJvdG9jb2wtbGV2ZWwgY2xvc2UuXG4gIF9sb3N0Q29ubmVjdGlvbihtYXliZUVycm9yKSB7XG4gICAgdGhpcy5fY2xlYW51cChtYXliZUVycm9yKTtcbiAgICB0aGlzLl9yZXRyeUxhdGVyKG1heWJlRXJyb3IpOyAvLyBzZXRzIHN0YXR1cy4gbm8gbmVlZCB0byBkbyBpdCBoZXJlLlxuICB9XG5cbiAgLy8gZmlyZWQgd2hlbiB3ZSBkZXRlY3QgdGhhdCB3ZSd2ZSBnb25lIG9ubGluZS4gdHJ5IHRvIHJlY29ubmVjdFxuICAvLyBpbW1lZGlhdGVseS5cbiAgX29ubGluZSgpIHtcbiAgICAvLyBpZiB3ZSd2ZSByZXF1ZXN0ZWQgdG8gYmUgb2ZmbGluZSBieSBkaXNjb25uZWN0aW5nLCBkb24ndCByZWNvbm5lY3QuXG4gICAgaWYgKHRoaXMuY3VycmVudFN0YXR1cy5zdGF0dXMgIT0gJ29mZmxpbmUnKSB0aGlzLnJlY29ubmVjdCgpO1xuICB9XG5cbiAgX3JldHJ5TGF0ZXIobWF5YmVFcnJvcikge1xuICAgIHZhciB0aW1lb3V0ID0gMDtcbiAgICBpZiAodGhpcy5vcHRpb25zLnJldHJ5IHx8XG4gICAgICAgIG1heWJlRXJyb3IgPT09IGZvcmNlZFJlY29ubmVjdEVycm9yKSB7XG4gICAgICB0aW1lb3V0ID0gdGhpcy5fcmV0cnkucmV0cnlMYXRlcihcbiAgICAgICAgdGhpcy5jdXJyZW50U3RhdHVzLnJldHJ5Q291bnQsXG4gICAgICAgIHRoaXMuX3JldHJ5Tm93LmJpbmQodGhpcylcbiAgICAgICk7XG4gICAgICB0aGlzLmN1cnJlbnRTdGF0dXMuc3RhdHVzID0gJ3dhaXRpbmcnO1xuICAgICAgdGhpcy5jdXJyZW50U3RhdHVzLnJldHJ5VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpICsgdGltZW91dDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jdXJyZW50U3RhdHVzLnN0YXR1cyA9ICdmYWlsZWQnO1xuICAgICAgZGVsZXRlIHRoaXMuY3VycmVudFN0YXR1cy5yZXRyeVRpbWU7XG4gICAgfVxuXG4gICAgdGhpcy5jdXJyZW50U3RhdHVzLmNvbm5lY3RlZCA9IGZhbHNlO1xuICAgIHRoaXMuc3RhdHVzQ2hhbmdlZCgpO1xuICB9XG5cbiAgX3JldHJ5Tm93KCkge1xuICAgIGlmICh0aGlzLl9mb3JjZWRUb0Rpc2Nvbm5lY3QpIHJldHVybjtcblxuICAgIHRoaXMuY3VycmVudFN0YXR1cy5yZXRyeUNvdW50ICs9IDE7XG4gICAgdGhpcy5jdXJyZW50U3RhdHVzLnN0YXR1cyA9ICdjb25uZWN0aW5nJztcbiAgICB0aGlzLmN1cnJlbnRTdGF0dXMuY29ubmVjdGVkID0gZmFsc2U7XG4gICAgZGVsZXRlIHRoaXMuY3VycmVudFN0YXR1cy5yZXRyeVRpbWU7XG4gICAgdGhpcy5zdGF0dXNDaGFuZ2VkKCk7XG5cbiAgICB0aGlzLl9sYXVuY2hDb25uZWN0aW9uKCk7XG4gIH1cblxuICAvLyBHZXQgY3VycmVudCBzdGF0dXMuIFJlYWN0aXZlLlxuICBzdGF0dXMoKSB7XG4gICAgaWYgKHRoaXMuc3RhdHVzTGlzdGVuZXJzKSB7XG4gICAgICB0aGlzLnN0YXR1c0xpc3RlbmVycy5kZXBlbmQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY3VycmVudFN0YXR1cztcbiAgfVxufVxuIiwiLy8gQHBhcmFtIHVybCB7U3RyaW5nfSBVUkwgdG8gTWV0ZW9yIGFwcCwgZWc6XG4vLyAgIFwiL1wiIG9yIFwibWFkZXdpdGgubWV0ZW9yLmNvbVwiIG9yIFwiaHR0cHM6Ly9mb28ubWV0ZW9yLmNvbVwiXG4vLyAgIG9yIFwiZGRwK3NvY2tqczovL2RkcC0tKioqKi1mb28ubWV0ZW9yLmNvbS9zb2NranNcIlxuLy8gQHJldHVybnMge1N0cmluZ30gVVJMIHRvIHRoZSBlbmRwb2ludCB3aXRoIHRoZSBzcGVjaWZpYyBzY2hlbWUgYW5kIHN1YlBhdGgsIGUuZy5cbi8vIGZvciBzY2hlbWUgXCJodHRwXCIgYW5kIHN1YlBhdGggXCJzb2NranNcIlxuLy8gICBcImh0dHA6Ly9zdWJkb21haW4ubWV0ZW9yLmNvbS9zb2NranNcIiBvciBcIi9zb2NranNcIlxuLy8gICBvciBcImh0dHBzOi8vZGRwLS0xMjM0LWZvby5tZXRlb3IuY29tL3NvY2tqc1wiXG5mdW5jdGlvbiB0cmFuc2xhdGVVcmwodXJsLCBuZXdTY2hlbWVCYXNlLCBzdWJQYXRoKSB7XG4gIGlmICghbmV3U2NoZW1lQmFzZSkge1xuICAgIG5ld1NjaGVtZUJhc2UgPSAnaHR0cCc7XG4gIH1cblxuICBpZiAoc3ViUGF0aCAhPT0gXCJzb2NranNcIiAmJiB1cmwuc3RhcnRzV2l0aChcIi9cIikpIHtcbiAgICB1cmwgPSBNZXRlb3IuYWJzb2x1dGVVcmwodXJsLnN1YnN0cigxKSk7XG4gIH1cblxuICB2YXIgZGRwVXJsTWF0Y2ggPSB1cmwubWF0Y2goL15kZHAoaT8pXFwrc29ja2pzOlxcL1xcLy8pO1xuICB2YXIgaHR0cFVybE1hdGNoID0gdXJsLm1hdGNoKC9eaHR0cChzPyk6XFwvXFwvLyk7XG4gIHZhciBuZXdTY2hlbWU7XG4gIGlmIChkZHBVcmxNYXRjaCkge1xuICAgIC8vIFJlbW92ZSBzY2hlbWUgYW5kIHNwbGl0IG9mZiB0aGUgaG9zdC5cbiAgICB2YXIgdXJsQWZ0ZXJERFAgPSB1cmwuc3Vic3RyKGRkcFVybE1hdGNoWzBdLmxlbmd0aCk7XG4gICAgbmV3U2NoZW1lID0gZGRwVXJsTWF0Y2hbMV0gPT09ICdpJyA/IG5ld1NjaGVtZUJhc2UgOiBuZXdTY2hlbWVCYXNlICsgJ3MnO1xuICAgIHZhciBzbGFzaFBvcyA9IHVybEFmdGVyRERQLmluZGV4T2YoJy8nKTtcbiAgICB2YXIgaG9zdCA9IHNsYXNoUG9zID09PSAtMSA/IHVybEFmdGVyRERQIDogdXJsQWZ0ZXJERFAuc3Vic3RyKDAsIHNsYXNoUG9zKTtcbiAgICB2YXIgcmVzdCA9IHNsYXNoUG9zID09PSAtMSA/ICcnIDogdXJsQWZ0ZXJERFAuc3Vic3RyKHNsYXNoUG9zKTtcblxuICAgIC8vIEluIHRoZSBob3N0IChPTkxZISksIGNoYW5nZSAnKicgY2hhcmFjdGVycyBpbnRvIHJhbmRvbSBkaWdpdHMuIFRoaXNcbiAgICAvLyBhbGxvd3MgZGlmZmVyZW50IHN0cmVhbSBjb25uZWN0aW9ucyB0byBjb25uZWN0IHRvIGRpZmZlcmVudCBob3N0bmFtZXNcbiAgICAvLyBhbmQgYXZvaWQgYnJvd3NlciBwZXItaG9zdG5hbWUgY29ubmVjdGlvbiBsaW1pdHMuXG4gICAgaG9zdCA9IGhvc3QucmVwbGFjZSgvXFwqL2csICgpID0+IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwKSk7XG5cbiAgICByZXR1cm4gbmV3U2NoZW1lICsgJzovLycgKyBob3N0ICsgcmVzdDtcbiAgfSBlbHNlIGlmIChodHRwVXJsTWF0Y2gpIHtcbiAgICBuZXdTY2hlbWUgPSAhaHR0cFVybE1hdGNoWzFdID8gbmV3U2NoZW1lQmFzZSA6IG5ld1NjaGVtZUJhc2UgKyAncyc7XG4gICAgdmFyIHVybEFmdGVySHR0cCA9IHVybC5zdWJzdHIoaHR0cFVybE1hdGNoWzBdLmxlbmd0aCk7XG4gICAgdXJsID0gbmV3U2NoZW1lICsgJzovLycgKyB1cmxBZnRlckh0dHA7XG4gIH1cblxuICAvLyBQcmVmaXggRlFETnMgYnV0IG5vdCByZWxhdGl2ZSBVUkxzXG4gIGlmICh1cmwuaW5kZXhPZignOi8vJykgPT09IC0xICYmICF1cmwuc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgdXJsID0gbmV3U2NoZW1lQmFzZSArICc6Ly8nICsgdXJsO1xuICB9XG5cbiAgLy8gWFhYIFRoaXMgaXMgbm90IHdoYXQgd2Ugc2hvdWxkIGJlIGRvaW5nOiBpZiBJIGhhdmUgYSBzaXRlXG4gIC8vIGRlcGxveWVkIGF0IFwiL2Zvb1wiLCB0aGVuIEREUC5jb25uZWN0KFwiL1wiKSBzaG91bGQgYWN0dWFsbHkgY29ubmVjdFxuICAvLyB0byBcIi9cIiwgbm90IHRvIFwiL2Zvb1wiLiBcIi9cIiBpcyBhbiBhYnNvbHV0ZSBwYXRoLiAoQ29udHJhc3Q6IGlmXG4gIC8vIGRlcGxveWVkIGF0IFwiL2Zvb1wiLCBpdCB3b3VsZCBiZSByZWFzb25hYmxlIGZvciBERFAuY29ubmVjdChcImJhclwiKVxuICAvLyB0byBjb25uZWN0IHRvIFwiL2Zvby9iYXJcIikuXG4gIC8vXG4gIC8vIFdlIHNob3VsZCBtYWtlIHRoaXMgcHJvcGVybHkgaG9ub3IgYWJzb2x1dGUgcGF0aHMgcmF0aGVyIHRoYW5cbiAgLy8gZm9yY2luZyB0aGUgcGF0aCB0byBiZSByZWxhdGl2ZSB0byB0aGUgc2l0ZSByb290LiBTaW11bHRhbmVvdXNseSxcbiAgLy8gd2Ugc2hvdWxkIHNldCBERFBfREVGQVVMVF9DT05ORUNUSU9OX1VSTCB0byBpbmNsdWRlIHRoZSBzaXRlXG4gIC8vIHJvb3QuIFNlZSBhbHNvIGNsaWVudF9jb252ZW5pZW5jZS5qcyAjUmF0aW9uYWxpemluZ1JlbGF0aXZlRERQVVJMc1xuICB1cmwgPSBNZXRlb3IuX3JlbGF0aXZlVG9TaXRlUm9vdFVybCh1cmwpO1xuXG4gIGlmICh1cmwuZW5kc1dpdGgoJy8nKSkgcmV0dXJuIHVybCArIHN1YlBhdGg7XG4gIGVsc2UgcmV0dXJuIHVybCArICcvJyArIHN1YlBhdGg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1NvY2tqc1VybCh1cmwpIHtcbiAgcmV0dXJuIHRyYW5zbGF0ZVVybCh1cmwsICdodHRwJywgJ3NvY2tqcycpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9XZWJzb2NrZXRVcmwodXJsKSB7XG4gIHJldHVybiB0cmFuc2xhdGVVcmwodXJsLCAnd3MnLCAnd2Vic29ja2V0Jyk7XG59XG4iXX0=
