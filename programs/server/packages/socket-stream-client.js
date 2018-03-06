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

var require = meteorInstall({"node_modules":{"meteor":{"socket-stream-client":{"node.js":function(require,exports,module){

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
var _extends = require("@babel/runtime/helpers/builtin/extends");

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
    this.options = _extends({
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

/* Exports */
Package._define("socket-stream-client");

})();

//# sourceURL=meteor://💻app/packages/socket-stream-client.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc29ja2V0LXN0cmVhbS1jbGllbnQvbm9kZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc29ja2V0LXN0cmVhbS1jbGllbnQvY29tbW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9zb2NrZXQtc3RyZWFtLWNsaWVudC91cmxzLmpzIl0sIm5hbWVzIjpbIm1vZHVsZTEiLCJtb2R1bGUiLCJleHBvcnQiLCJDbGllbnRTdHJlYW0iLCJNZXRlb3IiLCJ3YXRjaCIsInJlcXVpcmUiLCJ2IiwidG9XZWJzb2NrZXRVcmwiLCJTdHJlYW1DbGllbnRDb21tb24iLCJjb25zdHJ1Y3RvciIsImVuZHBvaW50Iiwib3B0aW9ucyIsImNsaWVudCIsImhlYWRlcnMiLCJPYmplY3QiLCJjcmVhdGUiLCJucG1GYXllT3B0aW9ucyIsIl9pbml0Q29tbW9uIiwiX2xhdW5jaENvbm5lY3Rpb24iLCJzZW5kIiwiZGF0YSIsImN1cnJlbnRTdGF0dXMiLCJjb25uZWN0ZWQiLCJfY2hhbmdlVXJsIiwidXJsIiwiX29uQ29ubmVjdCIsIkVycm9yIiwiX2ZvcmNlZFRvRGlzY29ubmVjdCIsImNsb3NlIiwiX2NsZWFyQ29ubmVjdGlvblRpbWVyIiwic3RhdHVzIiwicmV0cnlDb3VudCIsInN0YXR1c0NoYW5nZWQiLCJmb3JFYWNoQ2FsbGJhY2siLCJjYWxsYmFjayIsIl9jbGVhbnVwIiwibWF5YmVFcnJvciIsImNvbm5lY3Rpb25UaW1lciIsImNsZWFyVGltZW91dCIsIl9nZXRQcm94eVVybCIsInRhcmdldFVybCIsInByb3h5IiwicHJvY2VzcyIsImVudiIsIkhUVFBfUFJPWFkiLCJodHRwX3Byb3h5IiwibWF0Y2giLCJIVFRQU19QUk9YWSIsImh0dHBzX3Byb3h5IiwiRmF5ZVdlYlNvY2tldCIsIk5wbSIsImRlZmxhdGUiLCJmYXllT3B0aW9ucyIsImV4dGVuc2lvbnMiLCJhc3NpZ24iLCJwcm94eVVybCIsIm9yaWdpbiIsInN1YnByb3RvY29scyIsIkNsaWVudCIsInNldFRpbWVvdXQiLCJfbG9zdENvbm5lY3Rpb24iLCJDb25uZWN0aW9uRXJyb3IiLCJDT05ORUNUX1RJTUVPVVQiLCJvbiIsImJpbmRFbnZpcm9ubWVudCIsImNsaWVudE9uSWZDdXJyZW50IiwiZXZlbnQiLCJkZXNjcmlwdGlvbiIsImFyZ3MiLCJlcnJvciIsIl9kb250UHJpbnRFcnJvcnMiLCJfZGVidWciLCJtZXNzYWdlIiwiUmV0cnkiLCJmb3JjZWRSZWNvbm5lY3RFcnJvciIsInJldHJ5IiwibmFtZSIsImV2ZW50Q2FsbGJhY2tzIiwicHVzaCIsImNiIiwibGVuZ3RoIiwiZm9yRWFjaCIsImNvbm5lY3RUaW1lb3V0TXMiLCJQYWNrYWdlIiwidHJhY2tlciIsInN0YXR1c0xpc3RlbmVycyIsIlRyYWNrZXIiLCJEZXBlbmRlbmN5IiwiY2hhbmdlZCIsIl9yZXRyeSIsInJlY29ubmVjdCIsIl9zb2NranNPcHRpb25zIiwiX2ZvcmNlIiwiY2xlYXIiLCJfcmV0cnlOb3ciLCJkaXNjb25uZWN0IiwiX3Blcm1hbmVudCIsIl9lcnJvciIsInJlYXNvbiIsIl9yZXRyeUxhdGVyIiwiX29ubGluZSIsInRpbWVvdXQiLCJyZXRyeUxhdGVyIiwiYmluZCIsInJldHJ5VGltZSIsIkRhdGUiLCJnZXRUaW1lIiwiZGVwZW5kIiwidG9Tb2NranNVcmwiLCJ0cmFuc2xhdGVVcmwiLCJuZXdTY2hlbWVCYXNlIiwic3ViUGF0aCIsInN0YXJ0c1dpdGgiLCJhYnNvbHV0ZVVybCIsInN1YnN0ciIsImRkcFVybE1hdGNoIiwiaHR0cFVybE1hdGNoIiwibmV3U2NoZW1lIiwidXJsQWZ0ZXJERFAiLCJzbGFzaFBvcyIsImluZGV4T2YiLCJob3N0IiwicmVzdCIsInJlcGxhY2UiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJ1cmxBZnRlckh0dHAiLCJfcmVsYXRpdmVUb1NpdGVSb290VXJsIiwiZW5kc1dpdGgiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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LENBQXhCLElBQTZCLENBQUNoRyxJQUFJd0YsVUFBSixDQUFlLEdBQWYsQ0FBbEMsRUFBdUQ7QUFDckR4RixVQUFNc0YsZ0JBQWdCLEtBQWhCLEdBQXdCdEYsR0FBOUI7QUFDRCxHQW5DZ0QsQ0FxQ2pEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQUEsUUFBTXJCLE9BQU82SCxzQkFBUCxDQUE4QnhHLEdBQTlCLENBQU47QUFFQSxNQUFJQSxJQUFJeUcsUUFBSixDQUFhLEdBQWIsQ0FBSixFQUF1QixPQUFPekcsTUFBTXVGLE9BQWIsQ0FBdkIsS0FDSyxPQUFPdkYsTUFBTSxHQUFOLEdBQVl1RixPQUFuQjtBQUNOOztBQUVNLFNBQVNILFdBQVQsQ0FBcUJwRixHQUFyQixFQUEwQjtBQUMvQixTQUFPcUYsYUFBYXJGLEdBQWIsRUFBa0IsTUFBbEIsRUFBMEIsUUFBMUIsQ0FBUDtBQUNEOztBQUVNLFNBQVNqQixjQUFULENBQXdCaUIsR0FBeEIsRUFBNkI7QUFDbEMsU0FBT3FGLGFBQWFyRixHQUFiLEVBQWtCLElBQWxCLEVBQXdCLFdBQXhCLENBQVA7QUFDRCxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9zb2NrZXQtc3RyZWFtLWNsaWVudC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1ldGVvciB9IGZyb20gXCJtZXRlb3IvbWV0ZW9yXCI7XG5pbXBvcnQgeyB0b1dlYnNvY2tldFVybCB9IGZyb20gXCIuL3VybHMuanNcIjtcbmltcG9ydCB7IFN0cmVhbUNsaWVudENvbW1vbiB9IGZyb20gXCIuL2NvbW1vbi5qc1wiO1xuXG4vLyBAcGFyYW0gZW5kcG9pbnQge1N0cmluZ30gVVJMIHRvIE1ldGVvciBhcHBcbi8vICAgXCJodHRwOi8vc3ViZG9tYWluLm1ldGVvci5jb20vXCIgb3IgXCIvXCIgb3Jcbi8vICAgXCJkZHArc29ja2pzOi8vZm9vLSoqLm1ldGVvci5jb20vc29ja2pzXCJcbi8vXG4vLyBXZSBkbyBzb21lIHJld3JpdGluZyBvZiB0aGUgVVJMIHRvIGV2ZW50dWFsbHkgbWFrZSBpdCBcIndzOi8vXCIgb3IgXCJ3c3M6Ly9cIixcbi8vIHdoYXRldmVyIHdhcyBwYXNzZWQgaW4uICBBdCB0aGUgdmVyeSBsZWFzdCwgd2hhdCBNZXRlb3IuYWJzb2x1dGVVcmwoKSByZXR1cm5zXG4vLyB1cyBzaG91bGQgd29yay5cbi8vXG4vLyBXZSBkb24ndCBkbyBhbnkgaGVhcnRiZWF0aW5nLiAoVGhlIGxvZ2ljIHRoYXQgZGlkIHRoaXMgaW4gc29ja2pzIHdhcyByZW1vdmVkLFxuLy8gYmVjYXVzZSBpdCB1c2VkIGEgYnVpbHQtaW4gc29ja2pzIG1lY2hhbmlzbS4gV2UgY291bGQgZG8gaXQgd2l0aCBXZWJTb2NrZXRcbi8vIHBpbmcgZnJhbWVzIG9yIHdpdGggRERQLWxldmVsIG1lc3NhZ2VzLilcbmV4cG9ydCBjbGFzcyBDbGllbnRTdHJlYW0gZXh0ZW5kcyBTdHJlYW1DbGllbnRDb21tb24ge1xuICBjb25zdHJ1Y3RvcihlbmRwb2ludCwgb3B0aW9ucykge1xuICAgIHN1cGVyKG9wdGlvbnMpO1xuXG4gICAgdGhpcy5jbGllbnQgPSBudWxsOyAvLyBjcmVhdGVkIGluIF9sYXVuY2hDb25uZWN0aW9uXG4gICAgdGhpcy5lbmRwb2ludCA9IGVuZHBvaW50O1xuXG4gICAgdGhpcy5oZWFkZXJzID0gdGhpcy5vcHRpb25zLmhlYWRlcnMgfHwgT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICB0aGlzLm5wbUZheWVPcHRpb25zID0gdGhpcy5vcHRpb25zLm5wbUZheWVPcHRpb25zIHx8IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICB0aGlzLl9pbml0Q29tbW9uKHRoaXMub3B0aW9ucyk7XG5cbiAgICAvLy8vIEtpY2tvZmYhXG4gICAgdGhpcy5fbGF1bmNoQ29ubmVjdGlvbigpO1xuICB9XG5cbiAgLy8gZGF0YSBpcyBhIHV0Zjggc3RyaW5nLiBEYXRhIHNlbnQgd2hpbGUgbm90IGNvbm5lY3RlZCBpcyBkcm9wcGVkIG9uXG4gIC8vIHRoZSBmbG9vciwgYW5kIGl0IGlzIHVwIHRoZSB1c2VyIG9mIHRoaXMgQVBJIHRvIHJldHJhbnNtaXQgbG9zdFxuICAvLyBtZXNzYWdlcyBvbiAncmVzZXQnXG4gIHNlbmQoZGF0YSkge1xuICAgIGlmICh0aGlzLmN1cnJlbnRTdGF0dXMuY29ubmVjdGVkKSB7XG4gICAgICB0aGlzLmNsaWVudC5zZW5kKGRhdGEpO1xuICAgIH1cbiAgfVxuXG4gIC8vIENoYW5nZXMgd2hlcmUgdGhpcyBjb25uZWN0aW9uIHBvaW50c1xuICBfY2hhbmdlVXJsKHVybCkge1xuICAgIHRoaXMuZW5kcG9pbnQgPSB1cmw7XG4gIH1cblxuICBfb25Db25uZWN0KGNsaWVudCkge1xuICAgIGlmIChjbGllbnQgIT09IHRoaXMuY2xpZW50KSB7XG4gICAgICAvLyBUaGlzIGNvbm5lY3Rpb24gaXMgbm90IGZyb20gdGhlIGxhc3QgY2FsbCB0byBfbGF1bmNoQ29ubmVjdGlvbi5cbiAgICAgIC8vIEJ1dCBfbGF1bmNoQ29ubmVjdGlvbiBjYWxscyBfY2xlYW51cCB3aGljaCBjbG9zZXMgcHJldmlvdXMgY29ubmVjdGlvbnMuXG4gICAgICAvLyBJdCdzIG91ciBiZWxpZWYgdGhhdCB0aGlzIHN0aWZsZXMgZnV0dXJlICdvcGVuJyBldmVudHMsIGJ1dCBtYXliZVxuICAgICAgLy8gd2UgYXJlIHdyb25nP1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdHb3Qgb3BlbiBmcm9tIGluYWN0aXZlIGNsaWVudCAnICsgISF0aGlzLmNsaWVudCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2ZvcmNlZFRvRGlzY29ubmVjdCkge1xuICAgICAgLy8gV2Ugd2VyZSBhc2tlZCB0byBkaXNjb25uZWN0IGJldHdlZW4gdHJ5aW5nIHRvIG9wZW4gdGhlIGNvbm5lY3Rpb24gYW5kXG4gICAgICAvLyBhY3R1YWxseSBvcGVuaW5nIGl0LiBMZXQncyBqdXN0IHByZXRlbmQgdGhpcyBuZXZlciBoYXBwZW5lZC5cbiAgICAgIHRoaXMuY2xpZW50LmNsb3NlKCk7XG4gICAgICB0aGlzLmNsaWVudCA9IG51bGw7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY3VycmVudFN0YXR1cy5jb25uZWN0ZWQpIHtcbiAgICAgIC8vIFdlIGFscmVhZHkgaGF2ZSBhIGNvbm5lY3Rpb24uIEl0IG11c3QgaGF2ZSBiZWVuIHRoZSBjYXNlIHRoYXQgd2VcbiAgICAgIC8vIHN0YXJ0ZWQgdHdvIHBhcmFsbGVsIGNvbm5lY3Rpb24gYXR0ZW1wdHMgKGJlY2F1c2Ugd2Ugd2FudGVkIHRvXG4gICAgICAvLyAncmVjb25uZWN0IG5vdycgb24gYSBoYW5naW5nIGNvbm5lY3Rpb24gYW5kIHdlIGhhZCBubyB3YXkgdG8gY2FuY2VsIHRoZVxuICAgICAgLy8gY29ubmVjdGlvbiBhdHRlbXB0LikgQnV0IHRoaXMgc2hvdWxkbid0IGhhcHBlbiAoc2ltaWxhcmx5IHRvIHRoZSBjbGllbnRcbiAgICAgIC8vICE9PSB0aGlzLmNsaWVudCBjaGVjayBhYm92ZSkuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1R3byBwYXJhbGxlbCBjb25uZWN0aW9ucz8nKTtcbiAgICB9XG5cbiAgICB0aGlzLl9jbGVhckNvbm5lY3Rpb25UaW1lcigpO1xuXG4gICAgLy8gdXBkYXRlIHN0YXR1c1xuICAgIHRoaXMuY3VycmVudFN0YXR1cy5zdGF0dXMgPSAnY29ubmVjdGVkJztcbiAgICB0aGlzLmN1cnJlbnRTdGF0dXMuY29ubmVjdGVkID0gdHJ1ZTtcbiAgICB0aGlzLmN1cnJlbnRTdGF0dXMucmV0cnlDb3VudCA9IDA7XG4gICAgdGhpcy5zdGF0dXNDaGFuZ2VkKCk7XG5cbiAgICAvLyBmaXJlIHJlc2V0cy4gVGhpcyBtdXN0IGNvbWUgYWZ0ZXIgc3RhdHVzIGNoYW5nZSBzbyB0aGF0IGNsaWVudHNcbiAgICAvLyBjYW4gY2FsbCBzZW5kIGZyb20gd2l0aGluIGEgcmVzZXQgY2FsbGJhY2suXG4gICAgdGhpcy5mb3JFYWNoQ2FsbGJhY2soJ3Jlc2V0JywgY2FsbGJhY2sgPT4ge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICB9KTtcbiAgfVxuXG4gIF9jbGVhbnVwKG1heWJlRXJyb3IpIHtcbiAgICB0aGlzLl9jbGVhckNvbm5lY3Rpb25UaW1lcigpO1xuICAgIGlmICh0aGlzLmNsaWVudCkge1xuICAgICAgdmFyIGNsaWVudCA9IHRoaXMuY2xpZW50O1xuICAgICAgdGhpcy5jbGllbnQgPSBudWxsO1xuICAgICAgY2xpZW50LmNsb3NlKCk7XG5cbiAgICAgIHRoaXMuZm9yRWFjaENhbGxiYWNrKCdkaXNjb25uZWN0JywgY2FsbGJhY2sgPT4ge1xuICAgICAgICBjYWxsYmFjayhtYXliZUVycm9yKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIF9jbGVhckNvbm5lY3Rpb25UaW1lcigpIHtcbiAgICBpZiAodGhpcy5jb25uZWN0aW9uVGltZXIpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLmNvbm5lY3Rpb25UaW1lcik7XG4gICAgICB0aGlzLmNvbm5lY3Rpb25UaW1lciA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgX2dldFByb3h5VXJsKHRhcmdldFVybCkge1xuICAgIC8vIFNpbWlsYXIgdG8gY29kZSBpbiB0b29scy9odHRwLWhlbHBlcnMuanMuXG4gICAgdmFyIHByb3h5ID0gcHJvY2Vzcy5lbnYuSFRUUF9QUk9YWSB8fCBwcm9jZXNzLmVudi5odHRwX3Byb3h5IHx8IG51bGw7XG4gICAgLy8gaWYgd2UncmUgZ29pbmcgdG8gYSBzZWN1cmUgdXJsLCB0cnkgdGhlIGh0dHBzX3Byb3h5IGVudiB2YXJpYWJsZSBmaXJzdC5cbiAgICBpZiAodGFyZ2V0VXJsLm1hdGNoKC9ed3NzOi8pKSB7XG4gICAgICBwcm94eSA9IHByb2Nlc3MuZW52LkhUVFBTX1BST1hZIHx8IHByb2Nlc3MuZW52Lmh0dHBzX3Byb3h5IHx8IHByb3h5O1xuICAgIH1cbiAgICByZXR1cm4gcHJveHk7XG4gIH1cblxuICBfbGF1bmNoQ29ubmVjdGlvbigpIHtcbiAgICB0aGlzLl9jbGVhbnVwKCk7IC8vIGNsZWFudXAgdGhlIG9sZCBzb2NrZXQsIGlmIHRoZXJlIHdhcyBvbmUuXG5cbiAgICAvLyBTaW5jZSBzZXJ2ZXItdG8tc2VydmVyIEREUCBpcyBzdGlsbCBhbiBleHBlcmltZW50YWwgZmVhdHVyZSwgd2Ugb25seVxuICAgIC8vIHJlcXVpcmUgdGhlIG1vZHVsZSBpZiB3ZSBhY3R1YWxseSBjcmVhdGUgYSBzZXJ2ZXItdG8tc2VydmVyXG4gICAgLy8gY29ubmVjdGlvbi5cbiAgICB2YXIgRmF5ZVdlYlNvY2tldCA9IE5wbS5yZXF1aXJlKCdmYXllLXdlYnNvY2tldCcpO1xuICAgIHZhciBkZWZsYXRlID0gTnBtLnJlcXVpcmUoJ3Blcm1lc3NhZ2UtZGVmbGF0ZScpO1xuXG4gICAgdmFyIHRhcmdldFVybCA9IHRvV2Vic29ja2V0VXJsKHRoaXMuZW5kcG9pbnQpO1xuICAgIHZhciBmYXllT3B0aW9ucyA9IHtcbiAgICAgIGhlYWRlcnM6IHRoaXMuaGVhZGVycyxcbiAgICAgIGV4dGVuc2lvbnM6IFtkZWZsYXRlXVxuICAgIH07XG4gICAgZmF5ZU9wdGlvbnMgPSBPYmplY3QuYXNzaWduKGZheWVPcHRpb25zLCB0aGlzLm5wbUZheWVPcHRpb25zKTtcbiAgICB2YXIgcHJveHlVcmwgPSB0aGlzLl9nZXRQcm94eVVybCh0YXJnZXRVcmwpO1xuICAgIGlmIChwcm94eVVybCkge1xuICAgICAgZmF5ZU9wdGlvbnMucHJveHkgPSB7IG9yaWdpbjogcHJveHlVcmwgfTtcbiAgICB9XG5cbiAgICAvLyBXZSB3b3VsZCBsaWtlIHRvIHNwZWNpZnkgJ2RkcCcgYXMgdGhlIHN1YnByb3RvY29sIGhlcmUuIFRoZSBucG0gbW9kdWxlIHdlXG4gICAgLy8gdXNlZCB0byB1c2UgYXMgYSBjbGllbnQgd291bGQgZmFpbCB0aGUgaGFuZHNoYWtlIGlmIHdlIGFzayBmb3IgYVxuICAgIC8vIHN1YnByb3RvY29sIGFuZCB0aGUgc2VydmVyIGRvZXNuJ3Qgc2VuZCBvbmUgYmFjayAoYW5kIHNvY2tqcyBkb2Vzbid0KS5cbiAgICAvLyBGYXllIGRvZXNuJ3QgaGF2ZSB0aGF0IGJlaGF2aW9yOyBpdCdzIHVuY2xlYXIgZnJvbSByZWFkaW5nIFJGQyA2NDU1IGlmXG4gICAgLy8gRmF5ZSBpcyBlcnJvbmVvdXMgb3Igbm90LiAgU28gZm9yIG5vdywgd2UgZG9uJ3Qgc3BlY2lmeSBwcm90b2NvbHMuXG4gICAgdmFyIHN1YnByb3RvY29scyA9IFtdO1xuXG4gICAgdmFyIGNsaWVudCA9ICh0aGlzLmNsaWVudCA9IG5ldyBGYXllV2ViU29ja2V0LkNsaWVudChcbiAgICAgIHRhcmdldFVybCxcbiAgICAgIHN1YnByb3RvY29scyxcbiAgICAgIGZheWVPcHRpb25zXG4gICAgKSk7XG5cbiAgICB0aGlzLl9jbGVhckNvbm5lY3Rpb25UaW1lcigpO1xuICAgIHRoaXMuY29ubmVjdGlvblRpbWVyID0gTWV0ZW9yLnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5fbG9zdENvbm5lY3Rpb24obmV3IHRoaXMuQ29ubmVjdGlvbkVycm9yKCdERFAgY29ubmVjdGlvbiB0aW1lZCBvdXQnKSk7XG4gICAgfSwgdGhpcy5DT05ORUNUX1RJTUVPVVQpO1xuXG4gICAgdGhpcy5jbGllbnQub24oXG4gICAgICAnb3BlbicsXG4gICAgICBNZXRlb3IuYmluZEVudmlyb25tZW50KCgpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX29uQ29ubmVjdChjbGllbnQpO1xuICAgICAgfSwgJ3N0cmVhbSBjb25uZWN0IGNhbGxiYWNrJylcbiAgICApO1xuXG4gICAgdmFyIGNsaWVudE9uSWZDdXJyZW50ID0gKGV2ZW50LCBkZXNjcmlwdGlvbiwgY2FsbGJhY2spID0+IHtcbiAgICAgIHRoaXMuY2xpZW50Lm9uKFxuICAgICAgICBldmVudCxcbiAgICAgICAgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoLi4uYXJncykgPT4ge1xuICAgICAgICAgIC8vIElnbm9yZSBldmVudHMgZnJvbSBhbnkgY29ubmVjdGlvbiB3ZSd2ZSBhbHJlYWR5IGNsZWFuZWQgdXAuXG4gICAgICAgICAgaWYgKGNsaWVudCAhPT0gdGhpcy5jbGllbnQpIHJldHVybjtcbiAgICAgICAgICBjYWxsYmFjayguLi5hcmdzKTtcbiAgICAgICAgfSwgZGVzY3JpcHRpb24pXG4gICAgICApO1xuICAgIH07XG5cbiAgICBjbGllbnRPbklmQ3VycmVudCgnZXJyb3InLCAnc3RyZWFtIGVycm9yIGNhbGxiYWNrJywgZXJyb3IgPT4ge1xuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuX2RvbnRQcmludEVycm9ycylcbiAgICAgICAgTWV0ZW9yLl9kZWJ1Zygnc3RyZWFtIGVycm9yJywgZXJyb3IubWVzc2FnZSk7XG5cbiAgICAgIC8vIEZheWUncyAnZXJyb3InIG9iamVjdCBpcyBub3QgYSBKUyBlcnJvciAoYW5kIGFtb25nIG90aGVyIHRoaW5ncyxcbiAgICAgIC8vIGRvZXNuJ3Qgc3RyaW5naWZ5IHdlbGwpLiBDb252ZXJ0IGl0IHRvIG9uZS5cbiAgICAgIHRoaXMuX2xvc3RDb25uZWN0aW9uKG5ldyB0aGlzLkNvbm5lY3Rpb25FcnJvcihlcnJvci5tZXNzYWdlKSk7XG4gICAgfSk7XG5cbiAgICBjbGllbnRPbklmQ3VycmVudCgnY2xvc2UnLCAnc3RyZWFtIGNsb3NlIGNhbGxiYWNrJywgKCkgPT4ge1xuICAgICAgdGhpcy5fbG9zdENvbm5lY3Rpb24oKTtcbiAgICB9KTtcblxuICAgIGNsaWVudE9uSWZDdXJyZW50KCdtZXNzYWdlJywgJ3N0cmVhbSBtZXNzYWdlIGNhbGxiYWNrJywgbWVzc2FnZSA9PiB7XG4gICAgICAvLyBJZ25vcmUgYmluYXJ5IGZyYW1lcywgd2hlcmUgbWVzc2FnZS5kYXRhIGlzIGEgQnVmZmVyXG4gICAgICBpZiAodHlwZW9mIG1lc3NhZ2UuZGF0YSAhPT0gJ3N0cmluZycpIHJldHVybjtcblxuICAgICAgdGhpcy5mb3JFYWNoQ2FsbGJhY2soJ21lc3NhZ2UnLCBjYWxsYmFjayA9PiB7XG4gICAgICAgIGNhbGxiYWNrKG1lc3NhZ2UuZGF0YSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuIiwiaW1wb3J0IHsgUmV0cnkgfSBmcm9tICdtZXRlb3IvcmV0cnknO1xuXG5jb25zdCBmb3JjZWRSZWNvbm5lY3RFcnJvciA9IG5ldyBFcnJvcihcImZvcmNlZCByZWNvbm5lY3RcIik7XG5cbmV4cG9ydCBjbGFzcyBTdHJlYW1DbGllbnRDb21tb24ge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0ge1xuICAgICAgcmV0cnk6IHRydWUsXG4gICAgICAuLi4ob3B0aW9ucyB8fCBudWxsKSxcbiAgICB9O1xuXG4gICAgdGhpcy5Db25uZWN0aW9uRXJyb3IgPVxuICAgICAgb3B0aW9ucyAmJiBvcHRpb25zLkNvbm5lY3Rpb25FcnJvciB8fCBFcnJvcjtcbiAgfVxuXG4gIC8vIFJlZ2lzdGVyIGZvciBjYWxsYmFja3MuXG4gIG9uKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgaWYgKG5hbWUgIT09ICdtZXNzYWdlJyAmJiBuYW1lICE9PSAncmVzZXQnICYmIG5hbWUgIT09ICdkaXNjb25uZWN0JylcbiAgICAgIHRocm93IG5ldyBFcnJvcigndW5rbm93biBldmVudCB0eXBlOiAnICsgbmFtZSk7XG5cbiAgICBpZiAoIXRoaXMuZXZlbnRDYWxsYmFja3NbbmFtZV0pIHRoaXMuZXZlbnRDYWxsYmFja3NbbmFtZV0gPSBbXTtcbiAgICB0aGlzLmV2ZW50Q2FsbGJhY2tzW25hbWVdLnB1c2goY2FsbGJhY2spO1xuICB9XG5cbiAgZm9yRWFjaENhbGxiYWNrKG5hbWUsIGNiKSB7XG4gICAgaWYgKCF0aGlzLmV2ZW50Q2FsbGJhY2tzW25hbWVdIHx8ICF0aGlzLmV2ZW50Q2FsbGJhY2tzW25hbWVdLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuZXZlbnRDYWxsYmFja3NbbmFtZV0uZm9yRWFjaChjYik7XG4gIH1cblxuICBfaW5pdENvbW1vbihvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwgT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIC8vLy8gQ29uc3RhbnRzXG5cbiAgICAvLyBob3cgbG9uZyB0byB3YWl0IHVudGlsIHdlIGRlY2xhcmUgdGhlIGNvbm5lY3Rpb24gYXR0ZW1wdFxuICAgIC8vIGZhaWxlZC5cbiAgICB0aGlzLkNPTk5FQ1RfVElNRU9VVCA9IG9wdGlvbnMuY29ubmVjdFRpbWVvdXRNcyB8fCAxMDAwMDtcblxuICAgIHRoaXMuZXZlbnRDYWxsYmFja3MgPSBPYmplY3QuY3JlYXRlKG51bGwpOyAvLyBuYW1lIC0+IFtjYWxsYmFja11cblxuICAgIHRoaXMuX2ZvcmNlZFRvRGlzY29ubmVjdCA9IGZhbHNlO1xuXG4gICAgLy8vLyBSZWFjdGl2ZSBzdGF0dXNcbiAgICB0aGlzLmN1cnJlbnRTdGF0dXMgPSB7XG4gICAgICBzdGF0dXM6ICdjb25uZWN0aW5nJyxcbiAgICAgIGNvbm5lY3RlZDogZmFsc2UsXG4gICAgICByZXRyeUNvdW50OiAwXG4gICAgfTtcblxuICAgIGlmIChQYWNrYWdlLnRyYWNrZXIpIHtcbiAgICAgIHRoaXMuc3RhdHVzTGlzdGVuZXJzID0gbmV3IFBhY2thZ2UudHJhY2tlci5UcmFja2VyLkRlcGVuZGVuY3koKTtcbiAgICB9XG5cbiAgICB0aGlzLnN0YXR1c0NoYW5nZWQgPSAoKSA9PiB7XG4gICAgICBpZiAodGhpcy5zdGF0dXNMaXN0ZW5lcnMpIHtcbiAgICAgICAgdGhpcy5zdGF0dXNMaXN0ZW5lcnMuY2hhbmdlZCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLy8vIFJldHJ5IGxvZ2ljXG4gICAgdGhpcy5fcmV0cnkgPSBuZXcgUmV0cnkoKTtcbiAgICB0aGlzLmNvbm5lY3Rpb25UaW1lciA9IG51bGw7XG4gIH1cblxuICAvLyBUcmlnZ2VyIGEgcmVjb25uZWN0LlxuICByZWNvbm5lY3Qob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICBpZiAob3B0aW9ucy51cmwpIHtcbiAgICAgIHRoaXMuX2NoYW5nZVVybChvcHRpb25zLnVybCk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuX3NvY2tqc09wdGlvbnMpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5fc29ja2pzT3B0aW9ucyA9IG9wdGlvbnMuX3NvY2tqc09wdGlvbnM7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY3VycmVudFN0YXR1cy5jb25uZWN0ZWQpIHtcbiAgICAgIGlmIChvcHRpb25zLl9mb3JjZSB8fCBvcHRpb25zLnVybCkge1xuICAgICAgICB0aGlzLl9sb3N0Q29ubmVjdGlvbihmb3JjZWRSZWNvbm5lY3RFcnJvcik7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gaWYgd2UncmUgbWlkLWNvbm5lY3Rpb24sIHN0b3AgaXQuXG4gICAgaWYgKHRoaXMuY3VycmVudFN0YXR1cy5zdGF0dXMgPT09ICdjb25uZWN0aW5nJykge1xuICAgICAgLy8gUHJldGVuZCBpdCdzIGEgY2xlYW4gY2xvc2UuXG4gICAgICB0aGlzLl9sb3N0Q29ubmVjdGlvbigpO1xuICAgIH1cblxuICAgIHRoaXMuX3JldHJ5LmNsZWFyKCk7XG4gICAgdGhpcy5jdXJyZW50U3RhdHVzLnJldHJ5Q291bnQgLT0gMTsgLy8gZG9uJ3QgY291bnQgbWFudWFsIHJldHJpZXNcbiAgICB0aGlzLl9yZXRyeU5vdygpO1xuICB9XG5cbiAgZGlzY29ubmVjdChvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwgT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIC8vIEZhaWxlZCBpcyBwZXJtYW5lbnQuIElmIHdlJ3JlIGZhaWxlZCwgZG9uJ3QgbGV0IHBlb3BsZSBnbyBiYWNrXG4gICAgLy8gb25saW5lIGJ5IGNhbGxpbmcgJ2Rpc2Nvbm5lY3QnIHRoZW4gJ3JlY29ubmVjdCcuXG4gICAgaWYgKHRoaXMuX2ZvcmNlZFRvRGlzY29ubmVjdCkgcmV0dXJuO1xuXG4gICAgLy8gSWYgX3Blcm1hbmVudCBpcyBzZXQsIHBlcm1hbmVudGx5IGRpc2Nvbm5lY3QgYSBzdHJlYW0uIE9uY2UgYSBzdHJlYW1cbiAgICAvLyBpcyBmb3JjZWQgdG8gZGlzY29ubmVjdCwgaXQgY2FuIG5ldmVyIHJlY29ubmVjdC4gVGhpcyBpcyBmb3JcbiAgICAvLyBlcnJvciBjYXNlcyBzdWNoIGFzIGRkcCB2ZXJzaW9uIG1pc21hdGNoLCB3aGVyZSB0cnlpbmcgYWdhaW5cbiAgICAvLyB3b24ndCBmaXggdGhlIHByb2JsZW0uXG4gICAgaWYgKG9wdGlvbnMuX3Blcm1hbmVudCkge1xuICAgICAgdGhpcy5fZm9yY2VkVG9EaXNjb25uZWN0ID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB0aGlzLl9jbGVhbnVwKCk7XG4gICAgdGhpcy5fcmV0cnkuY2xlYXIoKTtcblxuICAgIHRoaXMuY3VycmVudFN0YXR1cyA9IHtcbiAgICAgIHN0YXR1czogb3B0aW9ucy5fcGVybWFuZW50ID8gJ2ZhaWxlZCcgOiAnb2ZmbGluZScsXG4gICAgICBjb25uZWN0ZWQ6IGZhbHNlLFxuICAgICAgcmV0cnlDb3VudDogMFxuICAgIH07XG5cbiAgICBpZiAob3B0aW9ucy5fcGVybWFuZW50ICYmIG9wdGlvbnMuX2Vycm9yKVxuICAgICAgdGhpcy5jdXJyZW50U3RhdHVzLnJlYXNvbiA9IG9wdGlvbnMuX2Vycm9yO1xuXG4gICAgdGhpcy5zdGF0dXNDaGFuZ2VkKCk7XG4gIH1cblxuICAvLyBtYXliZUVycm9yIGlzIHNldCB1bmxlc3MgaXQncyBhIGNsZWFuIHByb3RvY29sLWxldmVsIGNsb3NlLlxuICBfbG9zdENvbm5lY3Rpb24obWF5YmVFcnJvcikge1xuICAgIHRoaXMuX2NsZWFudXAobWF5YmVFcnJvcik7XG4gICAgdGhpcy5fcmV0cnlMYXRlcihtYXliZUVycm9yKTsgLy8gc2V0cyBzdGF0dXMuIG5vIG5lZWQgdG8gZG8gaXQgaGVyZS5cbiAgfVxuXG4gIC8vIGZpcmVkIHdoZW4gd2UgZGV0ZWN0IHRoYXQgd2UndmUgZ29uZSBvbmxpbmUuIHRyeSB0byByZWNvbm5lY3RcbiAgLy8gaW1tZWRpYXRlbHkuXG4gIF9vbmxpbmUoKSB7XG4gICAgLy8gaWYgd2UndmUgcmVxdWVzdGVkIHRvIGJlIG9mZmxpbmUgYnkgZGlzY29ubmVjdGluZywgZG9uJ3QgcmVjb25uZWN0LlxuICAgIGlmICh0aGlzLmN1cnJlbnRTdGF0dXMuc3RhdHVzICE9ICdvZmZsaW5lJykgdGhpcy5yZWNvbm5lY3QoKTtcbiAgfVxuXG4gIF9yZXRyeUxhdGVyKG1heWJlRXJyb3IpIHtcbiAgICB2YXIgdGltZW91dCA9IDA7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5yZXRyeSB8fFxuICAgICAgICBtYXliZUVycm9yID09PSBmb3JjZWRSZWNvbm5lY3RFcnJvcikge1xuICAgICAgdGltZW91dCA9IHRoaXMuX3JldHJ5LnJldHJ5TGF0ZXIoXG4gICAgICAgIHRoaXMuY3VycmVudFN0YXR1cy5yZXRyeUNvdW50LFxuICAgICAgICB0aGlzLl9yZXRyeU5vdy5iaW5kKHRoaXMpXG4gICAgICApO1xuICAgICAgdGhpcy5jdXJyZW50U3RhdHVzLnN0YXR1cyA9ICd3YWl0aW5nJztcbiAgICAgIHRoaXMuY3VycmVudFN0YXR1cy5yZXRyeVRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSArIHRpbWVvdXQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuY3VycmVudFN0YXR1cy5zdGF0dXMgPSAnZmFpbGVkJztcbiAgICAgIGRlbGV0ZSB0aGlzLmN1cnJlbnRTdGF0dXMucmV0cnlUaW1lO1xuICAgIH1cblxuICAgIHRoaXMuY3VycmVudFN0YXR1cy5jb25uZWN0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLnN0YXR1c0NoYW5nZWQoKTtcbiAgfVxuXG4gIF9yZXRyeU5vdygpIHtcbiAgICBpZiAodGhpcy5fZm9yY2VkVG9EaXNjb25uZWN0KSByZXR1cm47XG5cbiAgICB0aGlzLmN1cnJlbnRTdGF0dXMucmV0cnlDb3VudCArPSAxO1xuICAgIHRoaXMuY3VycmVudFN0YXR1cy5zdGF0dXMgPSAnY29ubmVjdGluZyc7XG4gICAgdGhpcy5jdXJyZW50U3RhdHVzLmNvbm5lY3RlZCA9IGZhbHNlO1xuICAgIGRlbGV0ZSB0aGlzLmN1cnJlbnRTdGF0dXMucmV0cnlUaW1lO1xuICAgIHRoaXMuc3RhdHVzQ2hhbmdlZCgpO1xuXG4gICAgdGhpcy5fbGF1bmNoQ29ubmVjdGlvbigpO1xuICB9XG5cbiAgLy8gR2V0IGN1cnJlbnQgc3RhdHVzLiBSZWFjdGl2ZS5cbiAgc3RhdHVzKCkge1xuICAgIGlmICh0aGlzLnN0YXR1c0xpc3RlbmVycykge1xuICAgICAgdGhpcy5zdGF0dXNMaXN0ZW5lcnMuZGVwZW5kKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmN1cnJlbnRTdGF0dXM7XG4gIH1cbn1cbiIsIi8vIEBwYXJhbSB1cmwge1N0cmluZ30gVVJMIHRvIE1ldGVvciBhcHAsIGVnOlxuLy8gICBcIi9cIiBvciBcIm1hZGV3aXRoLm1ldGVvci5jb21cIiBvciBcImh0dHBzOi8vZm9vLm1ldGVvci5jb21cIlxuLy8gICBvciBcImRkcCtzb2NranM6Ly9kZHAtLSoqKiotZm9vLm1ldGVvci5jb20vc29ja2pzXCJcbi8vIEByZXR1cm5zIHtTdHJpbmd9IFVSTCB0byB0aGUgZW5kcG9pbnQgd2l0aCB0aGUgc3BlY2lmaWMgc2NoZW1lIGFuZCBzdWJQYXRoLCBlLmcuXG4vLyBmb3Igc2NoZW1lIFwiaHR0cFwiIGFuZCBzdWJQYXRoIFwic29ja2pzXCJcbi8vICAgXCJodHRwOi8vc3ViZG9tYWluLm1ldGVvci5jb20vc29ja2pzXCIgb3IgXCIvc29ja2pzXCJcbi8vICAgb3IgXCJodHRwczovL2RkcC0tMTIzNC1mb28ubWV0ZW9yLmNvbS9zb2NranNcIlxuZnVuY3Rpb24gdHJhbnNsYXRlVXJsKHVybCwgbmV3U2NoZW1lQmFzZSwgc3ViUGF0aCkge1xuICBpZiAoIW5ld1NjaGVtZUJhc2UpIHtcbiAgICBuZXdTY2hlbWVCYXNlID0gJ2h0dHAnO1xuICB9XG5cbiAgaWYgKHN1YlBhdGggIT09IFwic29ja2pzXCIgJiYgdXJsLnN0YXJ0c1dpdGgoXCIvXCIpKSB7XG4gICAgdXJsID0gTWV0ZW9yLmFic29sdXRlVXJsKHVybC5zdWJzdHIoMSkpO1xuICB9XG5cbiAgdmFyIGRkcFVybE1hdGNoID0gdXJsLm1hdGNoKC9eZGRwKGk/KVxcK3NvY2tqczpcXC9cXC8vKTtcbiAgdmFyIGh0dHBVcmxNYXRjaCA9IHVybC5tYXRjaCgvXmh0dHAocz8pOlxcL1xcLy8pO1xuICB2YXIgbmV3U2NoZW1lO1xuICBpZiAoZGRwVXJsTWF0Y2gpIHtcbiAgICAvLyBSZW1vdmUgc2NoZW1lIGFuZCBzcGxpdCBvZmYgdGhlIGhvc3QuXG4gICAgdmFyIHVybEFmdGVyRERQID0gdXJsLnN1YnN0cihkZHBVcmxNYXRjaFswXS5sZW5ndGgpO1xuICAgIG5ld1NjaGVtZSA9IGRkcFVybE1hdGNoWzFdID09PSAnaScgPyBuZXdTY2hlbWVCYXNlIDogbmV3U2NoZW1lQmFzZSArICdzJztcbiAgICB2YXIgc2xhc2hQb3MgPSB1cmxBZnRlckREUC5pbmRleE9mKCcvJyk7XG4gICAgdmFyIGhvc3QgPSBzbGFzaFBvcyA9PT0gLTEgPyB1cmxBZnRlckREUCA6IHVybEFmdGVyRERQLnN1YnN0cigwLCBzbGFzaFBvcyk7XG4gICAgdmFyIHJlc3QgPSBzbGFzaFBvcyA9PT0gLTEgPyAnJyA6IHVybEFmdGVyRERQLnN1YnN0cihzbGFzaFBvcyk7XG5cbiAgICAvLyBJbiB0aGUgaG9zdCAoT05MWSEpLCBjaGFuZ2UgJyonIGNoYXJhY3RlcnMgaW50byByYW5kb20gZGlnaXRzLiBUaGlzXG4gICAgLy8gYWxsb3dzIGRpZmZlcmVudCBzdHJlYW0gY29ubmVjdGlvbnMgdG8gY29ubmVjdCB0byBkaWZmZXJlbnQgaG9zdG5hbWVzXG4gICAgLy8gYW5kIGF2b2lkIGJyb3dzZXIgcGVyLWhvc3RuYW1lIGNvbm5lY3Rpb24gbGltaXRzLlxuICAgIGhvc3QgPSBob3N0LnJlcGxhY2UoL1xcKi9nLCAoKSA9PiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMCkpO1xuXG4gICAgcmV0dXJuIG5ld1NjaGVtZSArICc6Ly8nICsgaG9zdCArIHJlc3Q7XG4gIH0gZWxzZSBpZiAoaHR0cFVybE1hdGNoKSB7XG4gICAgbmV3U2NoZW1lID0gIWh0dHBVcmxNYXRjaFsxXSA/IG5ld1NjaGVtZUJhc2UgOiBuZXdTY2hlbWVCYXNlICsgJ3MnO1xuICAgIHZhciB1cmxBZnRlckh0dHAgPSB1cmwuc3Vic3RyKGh0dHBVcmxNYXRjaFswXS5sZW5ndGgpO1xuICAgIHVybCA9IG5ld1NjaGVtZSArICc6Ly8nICsgdXJsQWZ0ZXJIdHRwO1xuICB9XG5cbiAgLy8gUHJlZml4IEZRRE5zIGJ1dCBub3QgcmVsYXRpdmUgVVJMc1xuICBpZiAodXJsLmluZGV4T2YoJzovLycpID09PSAtMSAmJiAhdXJsLnN0YXJ0c1dpdGgoJy8nKSkge1xuICAgIHVybCA9IG5ld1NjaGVtZUJhc2UgKyAnOi8vJyArIHVybDtcbiAgfVxuXG4gIC8vIFhYWCBUaGlzIGlzIG5vdCB3aGF0IHdlIHNob3VsZCBiZSBkb2luZzogaWYgSSBoYXZlIGEgc2l0ZVxuICAvLyBkZXBsb3llZCBhdCBcIi9mb29cIiwgdGhlbiBERFAuY29ubmVjdChcIi9cIikgc2hvdWxkIGFjdHVhbGx5IGNvbm5lY3RcbiAgLy8gdG8gXCIvXCIsIG5vdCB0byBcIi9mb29cIi4gXCIvXCIgaXMgYW4gYWJzb2x1dGUgcGF0aC4gKENvbnRyYXN0OiBpZlxuICAvLyBkZXBsb3llZCBhdCBcIi9mb29cIiwgaXQgd291bGQgYmUgcmVhc29uYWJsZSBmb3IgRERQLmNvbm5lY3QoXCJiYXJcIilcbiAgLy8gdG8gY29ubmVjdCB0byBcIi9mb28vYmFyXCIpLlxuICAvL1xuICAvLyBXZSBzaG91bGQgbWFrZSB0aGlzIHByb3Blcmx5IGhvbm9yIGFic29sdXRlIHBhdGhzIHJhdGhlciB0aGFuXG4gIC8vIGZvcmNpbmcgdGhlIHBhdGggdG8gYmUgcmVsYXRpdmUgdG8gdGhlIHNpdGUgcm9vdC4gU2ltdWx0YW5lb3VzbHksXG4gIC8vIHdlIHNob3VsZCBzZXQgRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkwgdG8gaW5jbHVkZSB0aGUgc2l0ZVxuICAvLyByb290LiBTZWUgYWxzbyBjbGllbnRfY29udmVuaWVuY2UuanMgI1JhdGlvbmFsaXppbmdSZWxhdGl2ZUREUFVSTHNcbiAgdXJsID0gTWV0ZW9yLl9yZWxhdGl2ZVRvU2l0ZVJvb3RVcmwodXJsKTtcblxuICBpZiAodXJsLmVuZHNXaXRoKCcvJykpIHJldHVybiB1cmwgKyBzdWJQYXRoO1xuICBlbHNlIHJldHVybiB1cmwgKyAnLycgKyBzdWJQYXRoO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9Tb2NranNVcmwodXJsKSB7XG4gIHJldHVybiB0cmFuc2xhdGVVcmwodXJsLCAnaHR0cCcsICdzb2NranMnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvV2Vic29ja2V0VXJsKHVybCkge1xuICByZXR1cm4gdHJhbnNsYXRlVXJsKHVybCwgJ3dzJywgJ3dlYnNvY2tldCcpO1xufVxuIl19
