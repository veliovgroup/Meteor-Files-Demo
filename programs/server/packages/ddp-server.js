(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var check = Package.check.check;
var Match = Package.check.Match;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var _ = Package.underscore._;
var Retry = Package.retry.Retry;
var MongoID = Package['mongo-id'].MongoID;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var ECMAScript = Package.ecmascript.ECMAScript;
var DDPCommon = Package['ddp-common'].DDPCommon;
var DDP = Package['ddp-client'].DDP;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var Hook = Package['callback-hook'].Hook;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var StreamServer, DDPServer, Server;

var require = meteorInstall({"node_modules":{"meteor":{"ddp-server":{"stream_server.js":function(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/ddp-server/stream_server.js                                                                               //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var url = Npm.require('url'); // By default, we use the permessage-deflate extension with default
// configuration. If $SERVER_WEBSOCKET_COMPRESSION is set, then it must be valid
// JSON. If it represents a falsey value, then we do not use permessage-deflate
// at all; otherwise, the JSON value is used as an argument to deflate's
// configure method; see
// https://github.com/faye/permessage-deflate-node/blob/master/README.md
//
// (We do this in an _.once instead of at startup, because we don't want to
// crash the tool during isopacket load if your JSON doesn't parse. This is only
// a problem because the tool has to load the DDP server code just in order to
// be a DDP client; see https://github.com/meteor/meteor/issues/3452 .)


var websocketExtensions = _.once(function () {
  var extensions = [];
  var websocketCompressionConfig = process.env.SERVER_WEBSOCKET_COMPRESSION ? JSON.parse(process.env.SERVER_WEBSOCKET_COMPRESSION) : {};

  if (websocketCompressionConfig) {
    extensions.push(Npm.require('permessage-deflate').configure(websocketCompressionConfig));
  }

  return extensions;
});

var pathPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || "";

StreamServer = function () {
  var self = this;
  self.registration_callbacks = [];
  self.open_sockets = []; // Because we are installing directly onto WebApp.httpServer instead of using
  // WebApp.app, we have to process the path prefix ourselves.

  self.prefix = pathPrefix + '/sockjs';
  RoutePolicy.declare(self.prefix + '/', 'network'); // set up sockjs

  var sockjs = Npm.require('sockjs');

  var serverOptions = {
    prefix: self.prefix,
    log: function () {},
    // this is the default, but we code it explicitly because we depend
    // on it in stream_client:HEARTBEAT_TIMEOUT
    heartbeat_delay: 45000,
    // The default disconnect_delay is 5 seconds, but if the server ends up CPU
    // bound for that much time, SockJS might not notice that the user has
    // reconnected because the timer (of disconnect_delay ms) can fire before
    // SockJS processes the new connection. Eventually we'll fix this by not
    // combining CPU-heavy processing with SockJS termination (eg a proxy which
    // converts to Unix sockets) but for now, raise the delay.
    disconnect_delay: 60 * 1000,
    // Set the USE_JSESSIONID environment variable to enable setting the
    // JSESSIONID cookie. This is useful for setting up proxies with
    // session affinity.
    jsessionid: !!process.env.USE_JSESSIONID
  }; // If you know your server environment (eg, proxies) will prevent websockets
  // from ever working, set $DISABLE_WEBSOCKETS and SockJS clients (ie,
  // browsers) will not waste time attempting to use them.
  // (Your server will still have a /websocket endpoint.)

  if (process.env.DISABLE_WEBSOCKETS) {
    serverOptions.websocket = false;
  } else {
    serverOptions.faye_server_options = {
      extensions: websocketExtensions()
    };
  }

  self.server = sockjs.createServer(serverOptions); // Install the sockjs handlers, but we want to keep around our own particular
  // request handler that adjusts idle timeouts while we have an outstanding
  // request.  This compensates for the fact that sockjs removes all listeners
  // for "request" to add its own.

  WebApp.httpServer.removeListener('request', WebApp._timeoutAdjustmentRequestCallback);
  self.server.installHandlers(WebApp.httpServer);
  WebApp.httpServer.addListener('request', WebApp._timeoutAdjustmentRequestCallback); // Support the /websocket endpoint

  self._redirectWebsocketEndpoint();

  self.server.on('connection', function (socket) {
    // We want to make sure that if a client connects to us and does the initial
    // Websocket handshake but never gets to the DDP handshake, that we
    // eventually kill the socket.  Once the DDP handshake happens, DDP
    // heartbeating will work. And before the Websocket handshake, the timeouts
    // we set at the server level in webapp_server.js will work. But
    // faye-websocket calls setTimeout(0) on any socket it takes over, so there
    // is an "in between" state where this doesn't happen.  We work around this
    // by explicitly setting the socket timeout to a relatively large time here,
    // and setting it back to zero when we set up the heartbeat in
    // livedata_server.js.
    socket.setWebsocketTimeout = function (timeout) {
      if ((socket.protocol === 'websocket' || socket.protocol === 'websocket-raw') && socket._session.recv) {
        socket._session.recv.connection.setTimeout(timeout);
      }
    };

    socket.setWebsocketTimeout(45 * 1000);

    socket.send = function (data) {
      socket.write(data);
    };

    socket.on('close', function () {
      self.open_sockets = _.without(self.open_sockets, socket);
    });
    self.open_sockets.push(socket); // XXX COMPAT WITH 0.6.6. Send the old style welcome message, which
    // will force old clients to reload. Remove this once we're not
    // concerned about people upgrading from a pre-0.7.0 release. Also,
    // remove the clause in the client that ignores the welcome message
    // (livedata_connection.js)

    socket.send(JSON.stringify({
      server_id: "0"
    })); // call all our callbacks when we get a new socket. they will do the
    // work of setting up handlers and such for specific messages.

    _.each(self.registration_callbacks, function (callback) {
      callback(socket);
    });
  });
};

_.extend(StreamServer.prototype, {
  // call my callback when a new socket connects.
  // also call it for all current connections.
  register: function (callback) {
    var self = this;
    self.registration_callbacks.push(callback);

    _.each(self.all_sockets(), function (socket) {
      callback(socket);
    });
  },
  // get a list of all sockets
  all_sockets: function () {
    var self = this;
    return _.values(self.open_sockets);
  },
  // Redirect /websocket to /sockjs/websocket in order to not expose
  // sockjs to clients that want to use raw websockets
  _redirectWebsocketEndpoint: function () {
    var self = this; // Unfortunately we can't use a connect middleware here since
    // sockjs installs itself prior to all existing listeners
    // (meaning prior to any connect middlewares) so we need to take
    // an approach similar to overshadowListeners in
    // https://github.com/sockjs/sockjs-node/blob/cf820c55af6a9953e16558555a31decea554f70e/src/utils.coffee

    _.each(['request', 'upgrade'], function (event) {
      var httpServer = WebApp.httpServer;
      var oldHttpServerListeners = httpServer.listeners(event).slice(0);
      httpServer.removeAllListeners(event); // request and upgrade have different arguments passed but
      // we only care about the first one which is always request

      var newListener = function (request
      /*, moreArguments */
      ) {
        // Store arguments for use within the closure below
        var args = arguments; // Rewrite /websocket and /websocket/ urls to /sockjs/websocket while
        // preserving query string.

        var parsedUrl = url.parse(request.url);

        if (parsedUrl.pathname === pathPrefix + '/websocket' || parsedUrl.pathname === pathPrefix + '/websocket/') {
          parsedUrl.pathname = self.prefix + '/websocket';
          request.url = url.format(parsedUrl);
        }

        _.each(oldHttpServerListeners, function (oldListener) {
          oldListener.apply(httpServer, args);
        });
      };

      httpServer.addListener(event, newListener);
    });
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"livedata_server.js":function(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/ddp-server/livedata_server.js                                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
DDPServer = {};

var Fiber = Npm.require('fibers'); // This file contains classes:
// * Session - The server's connection to a single DDP client
// * Subscription - A single subscription for a single client
// * Server - An entire server that may talk to > 1 client. A DDP endpoint.
//
// Session and Subscription are file scope. For now, until we freeze
// the interface, Server is package scope (in the future it should be
// exported.)
// Represents a single document in a SessionCollectionView


var SessionDocumentView = function () {
  var self = this;
  self.existsIn = {}; // set of subscriptionHandle

  self.dataByKey = {}; // key-> [ {subscriptionHandle, value} by precedence]
};

DDPServer._SessionDocumentView = SessionDocumentView;

_.extend(SessionDocumentView.prototype, {
  getFields: function () {
    var self = this;
    var ret = {};

    _.each(self.dataByKey, function (precedenceList, key) {
      ret[key] = precedenceList[0].value;
    });

    return ret;
  },
  clearField: function (subscriptionHandle, key, changeCollector) {
    var self = this; // Publish API ignores _id if present in fields

    if (key === "_id") return;
    var precedenceList = self.dataByKey[key]; // It's okay to clear fields that didn't exist. No need to throw
    // an error.

    if (!precedenceList) return;
    var removedValue = undefined;

    for (var i = 0; i < precedenceList.length; i++) {
      var precedence = precedenceList[i];

      if (precedence.subscriptionHandle === subscriptionHandle) {
        // The view's value can only change if this subscription is the one that
        // used to have precedence.
        if (i === 0) removedValue = precedence.value;
        precedenceList.splice(i, 1);
        break;
      }
    }

    if (_.isEmpty(precedenceList)) {
      delete self.dataByKey[key];
      changeCollector[key] = undefined;
    } else if (removedValue !== undefined && !EJSON.equals(removedValue, precedenceList[0].value)) {
      changeCollector[key] = precedenceList[0].value;
    }
  },
  changeField: function (subscriptionHandle, key, value, changeCollector, isAdd) {
    var self = this; // Publish API ignores _id if present in fields

    if (key === "_id") return; // Don't share state with the data passed in by the user.

    value = EJSON.clone(value);

    if (!_.has(self.dataByKey, key)) {
      self.dataByKey[key] = [{
        subscriptionHandle: subscriptionHandle,
        value: value
      }];
      changeCollector[key] = value;
      return;
    }

    var precedenceList = self.dataByKey[key];
    var elt;

    if (!isAdd) {
      elt = _.find(precedenceList, function (precedence) {
        return precedence.subscriptionHandle === subscriptionHandle;
      });
    }

    if (elt) {
      if (elt === precedenceList[0] && !EJSON.equals(value, elt.value)) {
        // this subscription is changing the value of this field.
        changeCollector[key] = value;
      }

      elt.value = value;
    } else {
      // this subscription is newly caring about this field
      precedenceList.push({
        subscriptionHandle: subscriptionHandle,
        value: value
      });
    }
  }
});
/**
 * Represents a client's view of a single collection
 * @param {String} collectionName Name of the collection it represents
 * @param {Object.<String, Function>} sessionCallbacks The callbacks for added, changed, removed
 * @class SessionCollectionView
 */


var SessionCollectionView = function (collectionName, sessionCallbacks) {
  var self = this;
  self.collectionName = collectionName;
  self.documents = {};
  self.callbacks = sessionCallbacks;
};

DDPServer._SessionCollectionView = SessionCollectionView;

_.extend(SessionCollectionView.prototype, {
  isEmpty: function () {
    var self = this;
    return _.isEmpty(self.documents);
  },
  diff: function (previous) {
    var self = this;
    DiffSequence.diffObjects(previous.documents, self.documents, {
      both: _.bind(self.diffDocument, self),
      rightOnly: function (id, nowDV) {
        self.callbacks.added(self.collectionName, id, nowDV.getFields());
      },
      leftOnly: function (id, prevDV) {
        self.callbacks.removed(self.collectionName, id);
      }
    });
  },
  diffDocument: function (id, prevDV, nowDV) {
    var self = this;
    var fields = {};
    DiffSequence.diffObjects(prevDV.getFields(), nowDV.getFields(), {
      both: function (key, prev, now) {
        if (!EJSON.equals(prev, now)) fields[key] = now;
      },
      rightOnly: function (key, now) {
        fields[key] = now;
      },
      leftOnly: function (key, prev) {
        fields[key] = undefined;
      }
    });
    self.callbacks.changed(self.collectionName, id, fields);
  },
  added: function (subscriptionHandle, id, fields) {
    var self = this;
    var docView = self.documents[id];
    var added = false;

    if (!docView) {
      added = true;
      docView = new SessionDocumentView();
      self.documents[id] = docView;
    }

    docView.existsIn[subscriptionHandle] = true;
    var changeCollector = {};

    _.each(fields, function (value, key) {
      docView.changeField(subscriptionHandle, key, value, changeCollector, true);
    });

    if (added) self.callbacks.added(self.collectionName, id, changeCollector);else self.callbacks.changed(self.collectionName, id, changeCollector);
  },
  changed: function (subscriptionHandle, id, changed) {
    var self = this;
    var changedResult = {};
    var docView = self.documents[id];
    if (!docView) throw new Error("Could not find element with id " + id + " to change");

    _.each(changed, function (value, key) {
      if (value === undefined) docView.clearField(subscriptionHandle, key, changedResult);else docView.changeField(subscriptionHandle, key, value, changedResult);
    });

    self.callbacks.changed(self.collectionName, id, changedResult);
  },
  removed: function (subscriptionHandle, id) {
    var self = this;
    var docView = self.documents[id];

    if (!docView) {
      var err = new Error("Removed nonexistent document " + id);
      throw err;
    }

    delete docView.existsIn[subscriptionHandle];

    if (_.isEmpty(docView.existsIn)) {
      // it is gone from everyone
      self.callbacks.removed(self.collectionName, id);
      delete self.documents[id];
    } else {
      var changed = {}; // remove this subscription from every precedence list
      // and record the changes

      _.each(docView.dataByKey, function (precedenceList, key) {
        docView.clearField(subscriptionHandle, key, changed);
      });

      self.callbacks.changed(self.collectionName, id, changed);
    }
  }
});
/******************************************************************************/

/* Session                                                                    */

/******************************************************************************/


var Session = function (server, version, socket, options) {
  var self = this;
  self.id = Random.id();
  self.server = server;
  self.version = version;
  self.initialized = false;
  self.socket = socket; // set to null when the session is destroyed. multiple places below
  // use this to determine if the session is alive or not.

  self.inQueue = new Meteor._DoubleEndedQueue();
  self.blocked = false;
  self.workerRunning = false; // Sub objects for active subscriptions

  self._namedSubs = {};
  self._universalSubs = [];
  self.userId = null;
  self.collectionViews = {}; // Set this to false to not send messages when collectionViews are
  // modified. This is done when rerunning subs in _setUserId and those messages
  // are calculated via a diff instead.

  self._isSending = true; // If this is true, don't start a newly-created universal publisher on this
  // session. The session will take care of starting it when appropriate.

  self._dontStartNewUniversalSubs = false; // when we are rerunning subscriptions, any ready messages
  // we want to buffer up for when we are done rerunning subscriptions

  self._pendingReady = []; // List of callbacks to call when this connection is closed.

  self._closeCallbacks = []; // XXX HACK: If a sockjs connection, save off the URL. This is
  // temporary and will go away in the near future.

  self._socketUrl = socket.url; // Allow tests to disable responding to pings.

  self._respondToPings = options.respondToPings; // This object is the public interface to the session. In the public
  // API, it is called the `connection` object.  Internally we call it
  // a `connectionHandle` to avoid ambiguity.

  self.connectionHandle = {
    id: self.id,
    close: function () {
      self.close();
    },
    onClose: function (fn) {
      var cb = Meteor.bindEnvironment(fn, "connection onClose callback");

      if (self.inQueue) {
        self._closeCallbacks.push(cb);
      } else {
        // if we're already closed, call the callback.
        Meteor.defer(cb);
      }
    },
    clientAddress: self._clientAddress(),
    httpHeaders: self.socket.headers
  };
  self.send({
    msg: 'connected',
    session: self.id
  }); // On initial connect, spin up all the universal publishers.

  Fiber(function () {
    self.startUniversalSubs();
  }).run();

  if (version !== 'pre1' && options.heartbeatInterval !== 0) {
    // We no longer need the low level timeout because we have heartbeating.
    socket.setWebsocketTimeout(0);
    self.heartbeat = new DDPCommon.Heartbeat({
      heartbeatInterval: options.heartbeatInterval,
      heartbeatTimeout: options.heartbeatTimeout,
      onTimeout: function () {
        self.close();
      },
      sendPing: function () {
        self.send({
          msg: 'ping'
        });
      }
    });
    self.heartbeat.start();
  }

  Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("livedata", "sessions", 1);
};

_.extend(Session.prototype, {
  sendReady: function (subscriptionIds) {
    var self = this;
    if (self._isSending) self.send({
      msg: "ready",
      subs: subscriptionIds
    });else {
      _.each(subscriptionIds, function (subscriptionId) {
        self._pendingReady.push(subscriptionId);
      });
    }
  },
  sendAdded: function (collectionName, id, fields) {
    var self = this;
    if (self._isSending) self.send({
      msg: "added",
      collection: collectionName,
      id: id,
      fields: fields
    });
  },
  sendChanged: function (collectionName, id, fields) {
    var self = this;
    if (_.isEmpty(fields)) return;

    if (self._isSending) {
      self.send({
        msg: "changed",
        collection: collectionName,
        id: id,
        fields: fields
      });
    }
  },
  sendRemoved: function (collectionName, id) {
    var self = this;
    if (self._isSending) self.send({
      msg: "removed",
      collection: collectionName,
      id: id
    });
  },
  getSendCallbacks: function () {
    var self = this;
    return {
      added: _.bind(self.sendAdded, self),
      changed: _.bind(self.sendChanged, self),
      removed: _.bind(self.sendRemoved, self)
    };
  },
  getCollectionView: function (collectionName) {
    var self = this;

    if (_.has(self.collectionViews, collectionName)) {
      return self.collectionViews[collectionName];
    }

    var ret = new SessionCollectionView(collectionName, self.getSendCallbacks());
    self.collectionViews[collectionName] = ret;
    return ret;
  },
  added: function (subscriptionHandle, collectionName, id, fields) {
    var self = this;
    var view = self.getCollectionView(collectionName);
    view.added(subscriptionHandle, id, fields);
  },
  removed: function (subscriptionHandle, collectionName, id) {
    var self = this;
    var view = self.getCollectionView(collectionName);
    view.removed(subscriptionHandle, id);

    if (view.isEmpty()) {
      delete self.collectionViews[collectionName];
    }
  },
  changed: function (subscriptionHandle, collectionName, id, fields) {
    var self = this;
    var view = self.getCollectionView(collectionName);
    view.changed(subscriptionHandle, id, fields);
  },
  startUniversalSubs: function () {
    var self = this; // Make a shallow copy of the set of universal handlers and start them. If
    // additional universal publishers start while we're running them (due to
    // yielding), they will run separately as part of Server.publish.

    var handlers = _.clone(self.server.universal_publish_handlers);

    _.each(handlers, function (handler) {
      self._startSubscription(handler);
    });
  },
  // Destroy this session and unregister it at the server.
  close: function () {
    var self = this; // Destroy this session, even if it's not registered at the
    // server. Stop all processing and tear everything down. If a socket
    // was attached, close it.
    // Already destroyed.

    if (!self.inQueue) return; // Drop the merge box data immediately.

    self.inQueue = null;
    self.collectionViews = {};

    if (self.heartbeat) {
      self.heartbeat.stop();
      self.heartbeat = null;
    }

    if (self.socket) {
      self.socket.close();
      self.socket._meteorSession = null;
    }

    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("livedata", "sessions", -1);
    Meteor.defer(function () {
      // stop callbacks can yield, so we defer this on close.
      // sub._isDeactivated() detects that we set inQueue to null and
      // treats it as semi-deactivated (it will ignore incoming callbacks, etc).
      self._deactivateAllSubscriptions(); // Defer calling the close callbacks, so that the caller closing
      // the session isn't waiting for all the callbacks to complete.


      _.each(self._closeCallbacks, function (callback) {
        callback();
      });
    }); // Unregister the session.

    self.server._removeSession(self);
  },
  // Send a message (doing nothing if no socket is connected right now.)
  // It should be a JSON object (it will be stringified.)
  send: function (msg) {
    var self = this;

    if (self.socket) {
      if (Meteor._printSentDDP) Meteor._debug("Sent DDP", DDPCommon.stringifyDDP(msg));
      self.socket.send(DDPCommon.stringifyDDP(msg));
    }
  },
  // Send a connection error.
  sendError: function (reason, offendingMessage) {
    var self = this;
    var msg = {
      msg: 'error',
      reason: reason
    };
    if (offendingMessage) msg.offendingMessage = offendingMessage;
    self.send(msg);
  },
  // Process 'msg' as an incoming message. (But as a guard against
  // race conditions during reconnection, ignore the message if
  // 'socket' is not the currently connected socket.)
  //
  // We run the messages from the client one at a time, in the order
  // given by the client. The message handler is passed an idempotent
  // function 'unblock' which it may call to allow other messages to
  // begin running in parallel in another fiber (for example, a method
  // that wants to yield.) Otherwise, it is automatically unblocked
  // when it returns.
  //
  // Actually, we don't have to 'totally order' the messages in this
  // way, but it's the easiest thing that's correct. (unsub needs to
  // be ordered against sub, methods need to be ordered against each
  // other.)
  processMessage: function (msg_in) {
    var self = this;
    if (!self.inQueue) // we have been destroyed.
      return; // Respond to ping and pong messages immediately without queuing.
    // If the negotiated DDP version is "pre1" which didn't support
    // pings, preserve the "pre1" behavior of responding with a "bad
    // request" for the unknown messages.
    //
    // Fibers are needed because heartbeat uses Meteor.setTimeout, which
    // needs a Fiber. We could actually use regular setTimeout and avoid
    // these new fibers, but it is easier to just make everything use
    // Meteor.setTimeout and not think too hard.
    //
    // Any message counts as receiving a pong, as it demonstrates that
    // the client is still alive.

    if (self.heartbeat) {
      Fiber(function () {
        self.heartbeat.messageReceived();
      }).run();
    }

    if (self.version !== 'pre1' && msg_in.msg === 'ping') {
      if (self._respondToPings) self.send({
        msg: "pong",
        id: msg_in.id
      });
      return;
    }

    if (self.version !== 'pre1' && msg_in.msg === 'pong') {
      // Since everything is a pong, nothing to do
      return;
    }

    self.inQueue.push(msg_in);
    if (self.workerRunning) return;
    self.workerRunning = true;

    var processNext = function () {
      var msg = self.inQueue && self.inQueue.shift();

      if (!msg) {
        self.workerRunning = false;
        return;
      }

      Fiber(function () {
        var blocked = true;

        var unblock = function () {
          if (!blocked) return; // idempotent

          blocked = false;
          processNext();
        };

        self.server.onMessageHook.each(function (callback) {
          callback(msg, self);
          return true;
        });
        if (_.has(self.protocol_handlers, msg.msg)) self.protocol_handlers[msg.msg].call(self, msg, unblock);else self.sendError('Bad request', msg);
        unblock(); // in case the handler didn't already do it
      }).run();
    };

    processNext();
  },
  protocol_handlers: {
    sub: function (msg) {
      var self = this; // reject malformed messages

      if (typeof msg.id !== "string" || typeof msg.name !== "string" || 'params' in msg && !(msg.params instanceof Array)) {
        self.sendError("Malformed subscription", msg);
        return;
      }

      if (!self.server.publish_handlers[msg.name]) {
        self.send({
          msg: 'nosub',
          id: msg.id,
          error: new Meteor.Error(404, `Subscription '${msg.name}' not found`)
        });
        return;
      }

      if (_.has(self._namedSubs, msg.id)) // subs are idempotent, or rather, they are ignored if a sub
        // with that id already exists. this is important during
        // reconnect.
        return; // XXX It'd be much better if we had generic hooks where any package can
      // hook into subscription handling, but in the mean while we special case
      // ddp-rate-limiter package. This is also done for weak requirements to
      // add the ddp-rate-limiter package in case we don't have Accounts. A
      // user trying to use the ddp-rate-limiter must explicitly require it.

      if (Package['ddp-rate-limiter']) {
        var DDPRateLimiter = Package['ddp-rate-limiter'].DDPRateLimiter;
        var rateLimiterInput = {
          userId: self.userId,
          clientAddress: self.connectionHandle.clientAddress,
          type: "subscription",
          name: msg.name,
          connectionId: self.id
        };

        DDPRateLimiter._increment(rateLimiterInput);

        var rateLimitResult = DDPRateLimiter._check(rateLimiterInput);

        if (!rateLimitResult.allowed) {
          self.send({
            msg: 'nosub',
            id: msg.id,
            error: new Meteor.Error('too-many-requests', DDPRateLimiter.getErrorMessage(rateLimitResult), {
              timeToReset: rateLimitResult.timeToReset
            })
          });
          return;
        }
      }

      var handler = self.server.publish_handlers[msg.name];

      self._startSubscription(handler, msg.id, msg.params, msg.name);
    },
    unsub: function (msg) {
      var self = this;

      self._stopSubscription(msg.id);
    },
    method: function (msg, unblock) {
      var self = this; // reject malformed messages
      // For now, we silently ignore unknown attributes,
      // for forwards compatibility.

      if (typeof msg.id !== "string" || typeof msg.method !== "string" || 'params' in msg && !(msg.params instanceof Array) || 'randomSeed' in msg && typeof msg.randomSeed !== "string") {
        self.sendError("Malformed method invocation", msg);
        return;
      }

      var randomSeed = msg.randomSeed || null; // set up to mark the method as satisfied once all observers
      // (and subscriptions) have reacted to any writes that were
      // done.

      var fence = new DDPServer._WriteFence();
      fence.onAllCommitted(function () {
        // Retire the fence so that future writes are allowed.
        // This means that callbacks like timers are free to use
        // the fence, and if they fire before it's armed (for
        // example, because the method waits for them) their
        // writes will be included in the fence.
        fence.retire();
        self.send({
          msg: 'updated',
          methods: [msg.id]
        });
      }); // find the handler

      var handler = self.server.method_handlers[msg.method];

      if (!handler) {
        self.send({
          msg: 'result',
          id: msg.id,
          error: new Meteor.Error(404, `Method '${msg.method}' not found`)
        });
        fence.arm();
        return;
      }

      var setUserId = function (userId) {
        self._setUserId(userId);
      };

      var invocation = new DDPCommon.MethodInvocation({
        isSimulation: false,
        userId: self.userId,
        setUserId: setUserId,
        unblock: unblock,
        connection: self.connectionHandle,
        randomSeed: randomSeed
      });
      const promise = new Promise((resolve, reject) => {
        // XXX It'd be better if we could hook into method handlers better but
        // for now, we need to check if the ddp-rate-limiter exists since we
        // have a weak requirement for the ddp-rate-limiter package to be added
        // to our application.
        if (Package['ddp-rate-limiter']) {
          var DDPRateLimiter = Package['ddp-rate-limiter'].DDPRateLimiter;
          var rateLimiterInput = {
            userId: self.userId,
            clientAddress: self.connectionHandle.clientAddress,
            type: "method",
            name: msg.method,
            connectionId: self.id
          };

          DDPRateLimiter._increment(rateLimiterInput);

          var rateLimitResult = DDPRateLimiter._check(rateLimiterInput);

          if (!rateLimitResult.allowed) {
            reject(new Meteor.Error("too-many-requests", DDPRateLimiter.getErrorMessage(rateLimitResult), {
              timeToReset: rateLimitResult.timeToReset
            }));
            return;
          }
        }

        resolve(DDPServer._CurrentWriteFence.withValue(fence, () => DDP._CurrentMethodInvocation.withValue(invocation, () => maybeAuditArgumentChecks(handler, invocation, msg.params, "call to '" + msg.method + "'"))));
      });

      function finish() {
        fence.arm();
        unblock();
      }

      const payload = {
        msg: "result",
        id: msg.id
      };
      promise.then(result => {
        finish();

        if (result !== undefined) {
          payload.result = result;
        }

        self.send(payload);
      }, exception => {
        finish();
        payload.error = wrapInternalException(exception, `while invoking method '${msg.method}'`);
        self.send(payload);
      });
    }
  },
  _eachSub: function (f) {
    var self = this;

    _.each(self._namedSubs, f);

    _.each(self._universalSubs, f);
  },
  _diffCollectionViews: function (beforeCVs) {
    var self = this;
    DiffSequence.diffObjects(beforeCVs, self.collectionViews, {
      both: function (collectionName, leftValue, rightValue) {
        rightValue.diff(leftValue);
      },
      rightOnly: function (collectionName, rightValue) {
        _.each(rightValue.documents, function (docView, id) {
          self.sendAdded(collectionName, id, docView.getFields());
        });
      },
      leftOnly: function (collectionName, leftValue) {
        _.each(leftValue.documents, function (doc, id) {
          self.sendRemoved(collectionName, id);
        });
      }
    });
  },
  // Sets the current user id in all appropriate contexts and reruns
  // all subscriptions
  _setUserId: function (userId) {
    var self = this;
    if (userId !== null && typeof userId !== "string") throw new Error("setUserId must be called on string or null, not " + typeof userId); // Prevent newly-created universal subscriptions from being added to our
    // session; they will be found below when we call startUniversalSubs.
    //
    // (We don't have to worry about named subscriptions, because we only add
    // them when we process a 'sub' message. We are currently processing a
    // 'method' message, and the method did not unblock, because it is illegal
    // to call setUserId after unblock. Thus we cannot be concurrently adding a
    // new named subscription.)

    self._dontStartNewUniversalSubs = true; // Prevent current subs from updating our collectionViews and call their
    // stop callbacks. This may yield.

    self._eachSub(function (sub) {
      sub._deactivate();
    }); // All subs should now be deactivated. Stop sending messages to the client,
    // save the state of the published collections, reset to an empty view, and
    // update the userId.


    self._isSending = false;
    var beforeCVs = self.collectionViews;
    self.collectionViews = {};
    self.userId = userId; // _setUserId is normally called from a Meteor method with
    // DDP._CurrentMethodInvocation set. But DDP._CurrentMethodInvocation is not
    // expected to be set inside a publish function, so we temporary unset it.
    // Inside a publish function DDP._CurrentPublicationInvocation is set.

    DDP._CurrentMethodInvocation.withValue(undefined, function () {
      // Save the old named subs, and reset to having no subscriptions.
      var oldNamedSubs = self._namedSubs;
      self._namedSubs = {};
      self._universalSubs = [];

      _.each(oldNamedSubs, function (sub, subscriptionId) {
        self._namedSubs[subscriptionId] = sub._recreate(); // nb: if the handler throws or calls this.error(), it will in fact
        // immediately send its 'nosub'. This is OK, though.

        self._namedSubs[subscriptionId]._runHandler();
      }); // Allow newly-created universal subs to be started on our connection in
      // parallel with the ones we're spinning up here, and spin up universal
      // subs.


      self._dontStartNewUniversalSubs = false;
      self.startUniversalSubs();
    }); // Start sending messages again, beginning with the diff from the previous
    // state of the world to the current state. No yields are allowed during
    // this diff, so that other changes cannot interleave.


    Meteor._noYieldsAllowed(function () {
      self._isSending = true;

      self._diffCollectionViews(beforeCVs);

      if (!_.isEmpty(self._pendingReady)) {
        self.sendReady(self._pendingReady);
        self._pendingReady = [];
      }
    });
  },
  _startSubscription: function (handler, subId, params, name) {
    var self = this;
    var sub = new Subscription(self, handler, subId, params, name);
    if (subId) self._namedSubs[subId] = sub;else self._universalSubs.push(sub);

    sub._runHandler();
  },
  // tear down specified subscription
  _stopSubscription: function (subId, error) {
    var self = this;
    var subName = null;

    if (subId && self._namedSubs[subId]) {
      subName = self._namedSubs[subId]._name;

      self._namedSubs[subId]._removeAllDocuments();

      self._namedSubs[subId]._deactivate();

      delete self._namedSubs[subId];
    }

    var response = {
      msg: 'nosub',
      id: subId
    };

    if (error) {
      response.error = wrapInternalException(error, subName ? "from sub " + subName + " id " + subId : "from sub id " + subId);
    }

    self.send(response);
  },
  // tear down all subscriptions. Note that this does NOT send removed or nosub
  // messages, since we assume the client is gone.
  _deactivateAllSubscriptions: function () {
    var self = this;

    _.each(self._namedSubs, function (sub, id) {
      sub._deactivate();
    });

    self._namedSubs = {};

    _.each(self._universalSubs, function (sub) {
      sub._deactivate();
    });

    self._universalSubs = [];
  },
  // Determine the remote client's IP address, based on the
  // HTTP_FORWARDED_COUNT environment variable representing how many
  // proxies the server is behind.
  _clientAddress: function () {
    var self = this; // For the reported client address for a connection to be correct,
    // the developer must set the HTTP_FORWARDED_COUNT environment
    // variable to an integer representing the number of hops they
    // expect in the `x-forwarded-for` header. E.g., set to "1" if the
    // server is behind one proxy.
    //
    // This could be computed once at startup instead of every time.

    var httpForwardedCount = parseInt(process.env['HTTP_FORWARDED_COUNT']) || 0;
    if (httpForwardedCount === 0) return self.socket.remoteAddress;
    var forwardedFor = self.socket.headers["x-forwarded-for"];
    if (!_.isString(forwardedFor)) return null;
    forwardedFor = forwardedFor.trim().split(/\s*,\s*/); // Typically the first value in the `x-forwarded-for` header is
    // the original IP address of the client connecting to the first
    // proxy.  However, the end user can easily spoof the header, in
    // which case the first value(s) will be the fake IP address from
    // the user pretending to be a proxy reporting the original IP
    // address value.  By counting HTTP_FORWARDED_COUNT back from the
    // end of the list, we ensure that we get the IP address being
    // reported by *our* first proxy.

    if (httpForwardedCount < 0 || httpForwardedCount > forwardedFor.length) return null;
    return forwardedFor[forwardedFor.length - httpForwardedCount];
  }
});
/******************************************************************************/

/* Subscription                                                               */

/******************************************************************************/
// ctor for a sub handle: the input to each publish function
// Instance name is this because it's usually referred to as this inside a
// publish

/**
 * @summary The server's side of a subscription
 * @class Subscription
 * @instanceName this
 * @showInstanceName true
 */


var Subscription = function (session, handler, subscriptionId, params, name) {
  var self = this;
  self._session = session; // type is Session

  /**
   * @summary Access inside the publish function. The incoming [connection](#meteor_onconnection) for this subscription.
   * @locus Server
   * @name  connection
   * @memberOf Subscription
   * @instance
   */

  self.connection = session.connectionHandle; // public API object

  self._handler = handler; // my subscription ID (generated by client, undefined for universal subs).

  self._subscriptionId = subscriptionId; // undefined for universal subs

  self._name = name;
  self._params = params || []; // Only named subscriptions have IDs, but we need some sort of string
  // internally to keep track of all subscriptions inside
  // SessionDocumentViews. We use this subscriptionHandle for that.

  if (self._subscriptionId) {
    self._subscriptionHandle = 'N' + self._subscriptionId;
  } else {
    self._subscriptionHandle = 'U' + Random.id();
  } // has _deactivate been called?


  self._deactivated = false; // stop callbacks to g/c this sub.  called w/ zero arguments.

  self._stopCallbacks = []; // the set of (collection, documentid) that this subscription has
  // an opinion about

  self._documents = {}; // remember if we are ready.

  self._ready = false; // Part of the public API: the user of this sub.

  /**
   * @summary Access inside the publish function. The id of the logged-in user, or `null` if no user is logged in.
   * @locus Server
   * @memberOf Subscription
   * @name  userId
   * @instance
   */

  self.userId = session.userId; // For now, the id filter is going to default to
  // the to/from DDP methods on MongoID, to
  // specifically deal with mongo/minimongo ObjectIds.
  // Later, you will be able to make this be "raw"
  // if you want to publish a collection that you know
  // just has strings for keys and no funny business, to
  // a ddp consumer that isn't minimongo

  self._idFilter = {
    idStringify: MongoID.idStringify,
    idParse: MongoID.idParse
  };
  Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("livedata", "subscriptions", 1);
};

_.extend(Subscription.prototype, {
  _runHandler: function () {
    // XXX should we unblock() here? Either before running the publish
    // function, or before running _publishCursor.
    //
    // Right now, each publish function blocks all future publishes and
    // methods waiting on data from Mongo (or whatever else the function
    // blocks on). This probably slows page load in common cases.
    var self = this;

    try {
      var res = DDP._CurrentPublicationInvocation.withValue(self, () => maybeAuditArgumentChecks(self._handler, self, EJSON.clone(self._params), // It's OK that this would look weird for universal subscriptions,
      // because they have no arguments so there can never be an
      // audit-argument-checks failure.
      "publisher '" + self._name + "'"));
    } catch (e) {
      self.error(e);
      return;
    } // Did the handler call this.error or this.stop?


    if (self._isDeactivated()) return;

    self._publishHandlerResult(res);
  },
  _publishHandlerResult: function (res) {
    // SPECIAL CASE: Instead of writing their own callbacks that invoke
    // this.added/changed/ready/etc, the user can just return a collection
    // cursor or array of cursors from the publish function; we call their
    // _publishCursor method which starts observing the cursor and publishes the
    // results. Note that _publishCursor does NOT call ready().
    //
    // XXX This uses an undocumented interface which only the Mongo cursor
    // interface publishes. Should we make this interface public and encourage
    // users to implement it themselves? Arguably, it's unnecessary; users can
    // already write their own functions like
    //   var publishMyReactiveThingy = function (name, handler) {
    //     Meteor.publish(name, function () {
    //       var reactiveThingy = handler();
    //       reactiveThingy.publishMe();
    //     });
    //   };
    var self = this;

    var isCursor = function (c) {
      return c && c._publishCursor;
    };

    if (isCursor(res)) {
      try {
        res._publishCursor(self);
      } catch (e) {
        self.error(e);
        return;
      } // _publishCursor only returns after the initial added callbacks have run.
      // mark subscription as ready.


      self.ready();
    } else if (_.isArray(res)) {
      // check all the elements are cursors
      if (!_.all(res, isCursor)) {
        self.error(new Error("Publish function returned an array of non-Cursors"));
        return;
      } // find duplicate collection names
      // XXX we should support overlapping cursors, but that would require the
      // merge box to allow overlap within a subscription


      var collectionNames = {};

      for (var i = 0; i < res.length; ++i) {
        var collectionName = res[i]._getCollectionName();

        if (_.has(collectionNames, collectionName)) {
          self.error(new Error("Publish function returned multiple cursors for collection " + collectionName));
          return;
        }

        collectionNames[collectionName] = true;
      }

      ;

      try {
        _.each(res, function (cur) {
          cur._publishCursor(self);
        });
      } catch (e) {
        self.error(e);
        return;
      }

      self.ready();
    } else if (res) {
      // truthy values other than cursors or arrays are probably a
      // user mistake (possible returning a Mongo document via, say,
      // `coll.findOne()`).
      self.error(new Error("Publish function can only return a Cursor or " + "an array of Cursors"));
    }
  },
  // This calls all stop callbacks and prevents the handler from updating any
  // SessionCollectionViews further. It's used when the user unsubscribes or
  // disconnects, as well as during setUserId re-runs. It does *NOT* send
  // removed messages for the published objects; if that is necessary, call
  // _removeAllDocuments first.
  _deactivate: function () {
    var self = this;
    if (self._deactivated) return;
    self._deactivated = true;

    self._callStopCallbacks();

    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("livedata", "subscriptions", -1);
  },
  _callStopCallbacks: function () {
    var self = this; // tell listeners, so they can clean up

    var callbacks = self._stopCallbacks;
    self._stopCallbacks = [];

    _.each(callbacks, function (callback) {
      callback();
    });
  },
  // Send remove messages for every document.
  _removeAllDocuments: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      _.each(self._documents, function (collectionDocs, collectionName) {
        // Iterate over _.keys instead of the dictionary itself, since we'll be
        // mutating it.
        _.each(_.keys(collectionDocs), function (strId) {
          self.removed(collectionName, self._idFilter.idParse(strId));
        });
      });
    });
  },
  // Returns a new Subscription for the same session with the same
  // initial creation parameters. This isn't a clone: it doesn't have
  // the same _documents cache, stopped state or callbacks; may have a
  // different _subscriptionHandle, and gets its userId from the
  // session, not from this object.
  _recreate: function () {
    var self = this;
    return new Subscription(self._session, self._handler, self._subscriptionId, self._params, self._name);
  },

  /**
   * @summary Call inside the publish function.  Stops this client's subscription, triggering a call on the client to the `onStop` callback passed to [`Meteor.subscribe`](#meteor_subscribe), if any. If `error` is not a [`Meteor.Error`](#meteor_error), it will be [sanitized](#meteor_error).
   * @locus Server
   * @param {Error} error The error to pass to the client.
   * @instance
   * @memberOf Subscription
   */
  error: function (error) {
    var self = this;
    if (self._isDeactivated()) return;

    self._session._stopSubscription(self._subscriptionId, error);
  },
  // Note that while our DDP client will notice that you've called stop() on the
  // server (and clean up its _subscriptions table) we don't actually provide a
  // mechanism for an app to notice this (the subscribe onError callback only
  // triggers if there is an error).

  /**
   * @summary Call inside the publish function.  Stops this client's subscription and invokes the client's `onStop` callback with no error.
   * @locus Server
   * @instance
   * @memberOf Subscription
   */
  stop: function () {
    var self = this;
    if (self._isDeactivated()) return;

    self._session._stopSubscription(self._subscriptionId);
  },

  /**
   * @summary Call inside the publish function.  Registers a callback function to run when the subscription is stopped.
   * @locus Server
   * @memberOf Subscription
   * @instance
   * @param {Function} func The callback function
   */
  onStop: function (callback) {
    var self = this;
    callback = Meteor.bindEnvironment(callback, 'onStop callback', self);
    if (self._isDeactivated()) callback();else self._stopCallbacks.push(callback);
  },
  // This returns true if the sub has been deactivated, *OR* if the session was
  // destroyed but the deferred call to _deactivateAllSubscriptions hasn't
  // happened yet.
  _isDeactivated: function () {
    var self = this;
    return self._deactivated || self._session.inQueue === null;
  },

  /**
   * @summary Call inside the publish function.  Informs the subscriber that a document has been added to the record set.
   * @locus Server
   * @memberOf Subscription
   * @instance
   * @param {String} collection The name of the collection that contains the new document.
   * @param {String} id The new document's ID.
   * @param {Object} fields The fields in the new document.  If `_id` is present it is ignored.
   */
  added: function (collectionName, id, fields) {
    var self = this;
    if (self._isDeactivated()) return;
    id = self._idFilter.idStringify(id);
    Meteor._ensure(self._documents, collectionName)[id] = true;

    self._session.added(self._subscriptionHandle, collectionName, id, fields);
  },

  /**
   * @summary Call inside the publish function.  Informs the subscriber that a document in the record set has been modified.
   * @locus Server
   * @memberOf Subscription
   * @instance
   * @param {String} collection The name of the collection that contains the changed document.
   * @param {String} id The changed document's ID.
   * @param {Object} fields The fields in the document that have changed, together with their new values.  If a field is not present in `fields` it was left unchanged; if it is present in `fields` and has a value of `undefined` it was removed from the document.  If `_id` is present it is ignored.
   */
  changed: function (collectionName, id, fields) {
    var self = this;
    if (self._isDeactivated()) return;
    id = self._idFilter.idStringify(id);

    self._session.changed(self._subscriptionHandle, collectionName, id, fields);
  },

  /**
   * @summary Call inside the publish function.  Informs the subscriber that a document has been removed from the record set.
   * @locus Server
   * @memberOf Subscription
   * @instance
   * @param {String} collection The name of the collection that the document has been removed from.
   * @param {String} id The ID of the document that has been removed.
   */
  removed: function (collectionName, id) {
    var self = this;
    if (self._isDeactivated()) return;
    id = self._idFilter.idStringify(id); // We don't bother to delete sets of things in a collection if the
    // collection is empty.  It could break _removeAllDocuments.

    delete self._documents[collectionName][id];

    self._session.removed(self._subscriptionHandle, collectionName, id);
  },

  /**
   * @summary Call inside the publish function.  Informs the subscriber that an initial, complete snapshot of the record set has been sent.  This will trigger a call on the client to the `onReady` callback passed to  [`Meteor.subscribe`](#meteor_subscribe), if any.
   * @locus Server
   * @memberOf Subscription
   * @instance
   */
  ready: function () {
    var self = this;
    if (self._isDeactivated()) return;
    if (!self._subscriptionId) return; // unnecessary but ignored for universal sub

    if (!self._ready) {
      self._session.sendReady([self._subscriptionId]);

      self._ready = true;
    }
  }
});
/******************************************************************************/

/* Server                                                                     */

/******************************************************************************/


Server = function (options) {
  var self = this; // The default heartbeat interval is 30 seconds on the server and 35
  // seconds on the client.  Since the client doesn't need to send a
  // ping as long as it is receiving pings, this means that pings
  // normally go from the server to the client.
  //
  // Note: Troposphere depends on the ability to mutate
  // Meteor.server.options.heartbeatTimeout! This is a hack, but it's life.

  self.options = _.defaults(options || {}, {
    heartbeatInterval: 15000,
    heartbeatTimeout: 15000,
    // For testing, allow responding to pings to be disabled.
    respondToPings: true
  }); // Map of callbacks to call when a new connection comes in to the
  // server and completes DDP version negotiation. Use an object instead
  // of an array so we can safely remove one from the list while
  // iterating over it.

  self.onConnectionHook = new Hook({
    debugPrintExceptions: "onConnection callback"
  }); // Map of callbacks to call when a new message comes in.

  self.onMessageHook = new Hook({
    debugPrintExceptions: "onMessage callback"
  });
  self.publish_handlers = {};
  self.universal_publish_handlers = [];
  self.method_handlers = {};
  self.sessions = {}; // map from id to session

  self.stream_server = new StreamServer();
  self.stream_server.register(function (socket) {
    // socket implements the SockJSConnection interface
    socket._meteorSession = null;

    var sendError = function (reason, offendingMessage) {
      var msg = {
        msg: 'error',
        reason: reason
      };
      if (offendingMessage) msg.offendingMessage = offendingMessage;
      socket.send(DDPCommon.stringifyDDP(msg));
    };

    socket.on('data', function (raw_msg) {
      if (Meteor._printReceivedDDP) {
        Meteor._debug("Received DDP", raw_msg);
      }

      try {
        try {
          var msg = DDPCommon.parseDDP(raw_msg);
        } catch (err) {
          sendError('Parse error');
          return;
        }

        if (msg === null || !msg.msg) {
          sendError('Bad request', msg);
          return;
        }

        if (msg.msg === 'connect') {
          if (socket._meteorSession) {
            sendError("Already connected", msg);
            return;
          }

          Fiber(function () {
            self._handleConnect(socket, msg);
          }).run();
          return;
        }

        if (!socket._meteorSession) {
          sendError('Must connect first', msg);
          return;
        }

        socket._meteorSession.processMessage(msg);
      } catch (e) {
        // XXX print stack nicely
        Meteor._debug("Internal exception while processing message", msg, e);
      }
    });
    socket.on('close', function () {
      if (socket._meteorSession) {
        Fiber(function () {
          socket._meteorSession.close();
        }).run();
      }
    });
  });
};

_.extend(Server.prototype, {
  /**
   * @summary Register a callback to be called when a new DDP connection is made to the server.
   * @locus Server
   * @param {function} callback The function to call when a new DDP connection is established.
   * @memberOf Meteor
   * @importFromPackage meteor
   */
  onConnection: function (fn) {
    var self = this;
    return self.onConnectionHook.register(fn);
  },

  /**
   * @summary Register a callback to be called when a new DDP message is received.
   * @locus Server
   * @param {function} callback The function to call when a new DDP message is received.
   * @memberOf Meteor
   * @importFromPackage meteor
   */
  onMessage: function (fn) {
    var self = this;
    return self.onMessageHook.register(fn);
  },
  _handleConnect: function (socket, msg) {
    var self = this; // The connect message must specify a version and an array of supported
    // versions, and it must claim to support what it is proposing.

    if (!(typeof msg.version === 'string' && _.isArray(msg.support) && _.all(msg.support, _.isString) && _.contains(msg.support, msg.version))) {
      socket.send(DDPCommon.stringifyDDP({
        msg: 'failed',
        version: DDPCommon.SUPPORTED_DDP_VERSIONS[0]
      }));
      socket.close();
      return;
    } // In the future, handle session resumption: something like:
    //  socket._meteorSession = self.sessions[msg.session]


    var version = calculateVersion(msg.support, DDPCommon.SUPPORTED_DDP_VERSIONS);

    if (msg.version !== version) {
      // The best version to use (according to the client's stated preferences)
      // is not the one the client is trying to use. Inform them about the best
      // version to use.
      socket.send(DDPCommon.stringifyDDP({
        msg: 'failed',
        version: version
      }));
      socket.close();
      return;
    } // Yay, version matches! Create a new session.
    // Note: Troposphere depends on the ability to mutate
    // Meteor.server.options.heartbeatTimeout! This is a hack, but it's life.


    socket._meteorSession = new Session(self, version, socket, self.options);
    self.sessions[socket._meteorSession.id] = socket._meteorSession;
    self.onConnectionHook.each(function (callback) {
      if (socket._meteorSession) callback(socket._meteorSession.connectionHandle);
      return true;
    });
  },

  /**
   * Register a publish handler function.
   *
   * @param name {String} identifier for query
   * @param handler {Function} publish handler
   * @param options {Object}
   *
   * Server will call handler function on each new subscription,
   * either when receiving DDP sub message for a named subscription, or on
   * DDP connect for a universal subscription.
   *
   * If name is null, this will be a subscription that is
   * automatically established and permanently on for all connected
   * client, instead of a subscription that can be turned on and off
   * with subscribe().
   *
   * options to contain:
   *  - (mostly internal) is_auto: true if generated automatically
   *    from an autopublish hook. this is for cosmetic purposes only
   *    (it lets us determine whether to print a warning suggesting
   *    that you turn off autopublish.)
   */

  /**
   * @summary Publish a record set.
   * @memberOf Meteor
   * @importFromPackage meteor
   * @locus Server
   * @param {String|Object} name If String, name of the record set.  If Object, publications Dictionary of publish functions by name.  If `null`, the set has no name, and the record set is automatically sent to all connected clients.
   * @param {Function} func Function called on the server each time a client subscribes.  Inside the function, `this` is the publish handler object, described below.  If the client passed arguments to `subscribe`, the function is called with the same arguments.
   */
  publish: function (name, handler, options) {
    var self = this;

    if (!_.isObject(name)) {
      options = options || {};

      if (name && name in self.publish_handlers) {
        Meteor._debug("Ignoring duplicate publish named '" + name + "'");

        return;
      }

      if (Package.autopublish && !options.is_auto) {
        // They have autopublish on, yet they're trying to manually
        // picking stuff to publish. They probably should turn off
        // autopublish. (This check isn't perfect -- if you create a
        // publish before you turn on autopublish, it won't catch
        // it. But this will definitely handle the simple case where
        // you've added the autopublish package to your app, and are
        // calling publish from your app code.)
        if (!self.warned_about_autopublish) {
          self.warned_about_autopublish = true;

          Meteor._debug("** You've set up some data subscriptions with Meteor.publish(), but\n" + "** you still have autopublish turned on. Because autopublish is still\n" + "** on, your Meteor.publish() calls won't have much effect. All data\n" + "** will still be sent to all clients.\n" + "**\n" + "** Turn off autopublish by removing the autopublish package:\n" + "**\n" + "**   $ meteor remove autopublish\n" + "**\n" + "** .. and make sure you have Meteor.publish() and Meteor.subscribe() calls\n" + "** for each collection that you want clients to see.\n");
        }
      }

      if (name) self.publish_handlers[name] = handler;else {
        self.universal_publish_handlers.push(handler); // Spin up the new publisher on any existing session too. Run each
        // session's subscription in a new Fiber, so that there's no change for
        // self.sessions to change while we're running this loop.

        _.each(self.sessions, function (session) {
          if (!session._dontStartNewUniversalSubs) {
            Fiber(function () {
              session._startSubscription(handler);
            }).run();
          }
        });
      }
    } else {
      _.each(name, function (value, key) {
        self.publish(key, value, {});
      });
    }
  },
  _removeSession: function (session) {
    var self = this;

    if (self.sessions[session.id]) {
      delete self.sessions[session.id];
    }
  },

  /**
   * @summary Defines functions that can be invoked over the network by clients.
   * @locus Anywhere
   * @param {Object} methods Dictionary whose keys are method names and values are functions.
   * @memberOf Meteor
   * @importFromPackage meteor
   */
  methods: function (methods) {
    var self = this;

    _.each(methods, function (func, name) {
      if (typeof func !== 'function') throw new Error("Method '" + name + "' must be a function");
      if (self.method_handlers[name]) throw new Error("A method named '" + name + "' is already defined");
      self.method_handlers[name] = func;
    });
  },
  call: function (name, ...args) {
    if (args.length && typeof args[args.length - 1] === "function") {
      // If it's a function, the last argument is the result callback, not
      // a parameter to the remote method.
      var callback = args.pop();
    }

    return this.apply(name, args, callback);
  },
  // A version of the call method that always returns a Promise.
  callAsync: function (name, ...args) {
    return this.applyAsync(name, args);
  },
  apply: function (name, args, options, callback) {
    // We were passed 3 arguments. They may be either (name, args, options)
    // or (name, args, callback)
    if (!callback && typeof options === 'function') {
      callback = options;
      options = {};
    } else {
      options = options || {};
    }

    const promise = this.applyAsync(name, args, options); // Return the result in whichever way the caller asked for it. Note that we
    // do NOT block on the write fence in an analogous way to how the client
    // blocks on the relevant data being visible, so you are NOT guaranteed that
    // cursor observe callbacks have fired when your callback is invoked. (We
    // can change this if there's a real use case.)

    if (callback) {
      promise.then(result => callback(undefined, result), exception => callback(exception));
    } else {
      return promise.await();
    }
  },
  // @param options {Optional Object}
  applyAsync: function (name, args, options) {
    // Run the handler
    var handler = this.method_handlers[name];

    if (!handler) {
      return Promise.reject(new Meteor.Error(404, `Method '${name}' not found`));
    } // If this is a method call from within another method or publish function,
    // get the user state from the outer method or publish function, otherwise
    // don't allow setUserId to be called


    var userId = null;

    var setUserId = function () {
      throw new Error("Can't call setUserId on a server initiated method call");
    };

    var connection = null;

    var currentMethodInvocation = DDP._CurrentMethodInvocation.get();

    var currentPublicationInvocation = DDP._CurrentPublicationInvocation.get();

    var randomSeed = null;

    if (currentMethodInvocation) {
      userId = currentMethodInvocation.userId;

      setUserId = function (userId) {
        currentMethodInvocation.setUserId(userId);
      };

      connection = currentMethodInvocation.connection;
      randomSeed = DDPCommon.makeRpcSeed(currentMethodInvocation, name);
    } else if (currentPublicationInvocation) {
      userId = currentPublicationInvocation.userId;

      setUserId = function (userId) {
        currentPublicationInvocation._session._setUserId(userId);
      };

      connection = currentPublicationInvocation.connection;
    }

    var invocation = new DDPCommon.MethodInvocation({
      isSimulation: false,
      userId,
      setUserId,
      connection,
      randomSeed
    });
    return new Promise(resolve => resolve(DDP._CurrentMethodInvocation.withValue(invocation, () => maybeAuditArgumentChecks(handler, invocation, EJSON.clone(args), "internal call to '" + name + "'")))).then(EJSON.clone);
  },
  _urlForSession: function (sessionId) {
    var self = this;
    var session = self.sessions[sessionId];
    if (session) return session._socketUrl;else return null;
  }
});

var calculateVersion = function (clientSupportedVersions, serverSupportedVersions) {
  var correctVersion = _.find(clientSupportedVersions, function (version) {
    return _.contains(serverSupportedVersions, version);
  });

  if (!correctVersion) {
    correctVersion = serverSupportedVersions[0];
  }

  return correctVersion;
};

DDPServer._calculateVersion = calculateVersion; // "blind" exceptions other than those that were deliberately thrown to signal
// errors to the client

var wrapInternalException = function (exception, context) {
  if (!exception) return exception; // To allow packages to throw errors intended for the client but not have to
  // depend on the Meteor.Error class, `isClientSafe` can be set to true on any
  // error before it is thrown.

  if (exception.isClientSafe) {
    if (!(exception instanceof Meteor.Error)) {
      const originalMessage = exception.message;
      exception = new Meteor.Error(exception.error, exception.reason, exception.details);
      exception.message = originalMessage;
    }

    return exception;
  } // Tests can set the '_expectedByTest' flag on an exception so it won't go to
  // the server log.


  if (!exception._expectedByTest) {
    Meteor._debug("Exception " + context, exception);

    if (exception.sanitizedError) {
      Meteor._debug("Sanitized and reported to the client as:", exception.sanitizedError);

      Meteor._debug();
    }
  } // Did the error contain more details that could have been useful if caught in
  // server code (or if thrown from non-client-originated code), but also
  // provided a "sanitized" version with more context than 500 Internal server
  // error? Use that.


  if (exception.sanitizedError) {
    if (exception.sanitizedError.isClientSafe) return exception.sanitizedError;

    Meteor._debug("Exception " + context + " provides a sanitizedError that " + "does not have isClientSafe property set; ignoring");
  }

  return new Meteor.Error(500, "Internal server error");
}; // Audit argument checks, if the audit-argument-checks package exists (it is a
// weak dependency of this package).


var maybeAuditArgumentChecks = function (f, context, args, description) {
  args = args || [];

  if (Package['audit-argument-checks']) {
    return Match._failIfArgumentsAreNotAllChecked(f, context, args, description);
  }

  return f.apply(context, args);
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"writefence.js":function(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/ddp-server/writefence.js                                                                                  //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var Future = Npm.require('fibers/future'); // A write fence collects a group of writes, and provides a callback
// when all of the writes are fully committed and propagated (all
// observers have been notified of the write and acknowledged it.)
//


DDPServer._WriteFence = function () {
  var self = this;
  self.armed = false;
  self.fired = false;
  self.retired = false;
  self.outstanding_writes = 0;
  self.before_fire_callbacks = [];
  self.completion_callbacks = [];
}; // The current write fence. When there is a current write fence, code
// that writes to databases should register their writes with it using
// beginWrite().
//


DDPServer._CurrentWriteFence = new Meteor.EnvironmentVariable();

_.extend(DDPServer._WriteFence.prototype, {
  // Start tracking a write, and return an object to represent it. The
  // object has a single method, committed(). This method should be
  // called when the write is fully committed and propagated. You can
  // continue to add writes to the WriteFence up until it is triggered
  // (calls its callbacks because all writes have committed.)
  beginWrite: function () {
    var self = this;
    if (self.retired) return {
      committed: function () {}
    };
    if (self.fired) throw new Error("fence has already activated -- too late to add writes");
    self.outstanding_writes++;
    var committed = false;
    return {
      committed: function () {
        if (committed) throw new Error("committed called twice on the same write");
        committed = true;
        self.outstanding_writes--;

        self._maybeFire();
      }
    };
  },
  // Arm the fence. Once the fence is armed, and there are no more
  // uncommitted writes, it will activate.
  arm: function () {
    var self = this;
    if (self === DDPServer._CurrentWriteFence.get()) throw Error("Can't arm the current fence");
    self.armed = true;

    self._maybeFire();
  },
  // Register a function to be called once before firing the fence.
  // Callback function can add new writes to the fence, in which case
  // it won't fire until those writes are done as well.
  onBeforeFire: function (func) {
    var self = this;
    if (self.fired) throw new Error("fence has already activated -- too late to " + "add a callback");
    self.before_fire_callbacks.push(func);
  },
  // Register a function to be called when the fence fires.
  onAllCommitted: function (func) {
    var self = this;
    if (self.fired) throw new Error("fence has already activated -- too late to " + "add a callback");
    self.completion_callbacks.push(func);
  },
  // Convenience function. Arms the fence, then blocks until it fires.
  armAndWait: function () {
    var self = this;
    var future = new Future();
    self.onAllCommitted(function () {
      future['return']();
    });
    self.arm();
    future.wait();
  },
  _maybeFire: function () {
    var self = this;
    if (self.fired) throw new Error("write fence already activated?");

    if (self.armed && !self.outstanding_writes) {
      function invokeCallback(func) {
        try {
          func(self);
        } catch (err) {
          Meteor._debug("exception in write fence callback", err);
        }
      }

      self.outstanding_writes++;

      while (self.before_fire_callbacks.length > 0) {
        var callbacks = self.before_fire_callbacks;
        self.before_fire_callbacks = [];

        _.each(callbacks, invokeCallback);
      }

      self.outstanding_writes--;

      if (!self.outstanding_writes) {
        self.fired = true;
        var callbacks = self.completion_callbacks;
        self.completion_callbacks = [];

        _.each(callbacks, invokeCallback);
      }
    }
  },
  // Deactivate this fence so that adding more writes has no effect.
  // The fence must have already fired.
  retire: function () {
    var self = this;
    if (!self.fired) throw new Error("Can't retire a fence that hasn't fired.");
    self.retired = true;
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"crossbar.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/ddp-server/crossbar.js                                                                                    //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
// A "crossbar" is a class that provides structured notification registration.
// See _match for the definition of how a notification matches a trigger.
// All notifications and triggers must have a string key named 'collection'.
DDPServer._Crossbar = function (options) {
  var self = this;
  options = options || {};
  self.nextId = 1; // map from collection name (string) -> listener id -> object. each object has
  // keys 'trigger', 'callback'.  As a hack, the empty string means "no
  // collection".

  self.listenersByCollection = {};
  self.listenersByCollectionCount = {};
  self.factPackage = options.factPackage || "livedata";
  self.factName = options.factName || null;
};

_.extend(DDPServer._Crossbar.prototype, {
  // msg is a trigger or a notification
  _collectionForMessage: function (msg) {
    var self = this;

    if (!_.has(msg, 'collection')) {
      return '';
    } else if (typeof msg.collection === 'string') {
      if (msg.collection === '') throw Error("Message has empty collection!");
      return msg.collection;
    } else {
      throw Error("Message has non-string collection!");
    }
  },
  // Listen for notification that match 'trigger'. A notification
  // matches if it has the key-value pairs in trigger as a
  // subset. When a notification matches, call 'callback', passing
  // the actual notification.
  //
  // Returns a listen handle, which is an object with a method
  // stop(). Call stop() to stop listening.
  //
  // XXX It should be legal to call fire() from inside a listen()
  // callback?
  listen: function (trigger, callback) {
    var self = this;
    var id = self.nextId++;

    var collection = self._collectionForMessage(trigger);

    var record = {
      trigger: EJSON.clone(trigger),
      callback: callback
    };

    if (!_.has(self.listenersByCollection, collection)) {
      self.listenersByCollection[collection] = {};
      self.listenersByCollectionCount[collection] = 0;
    }

    self.listenersByCollection[collection][id] = record;
    self.listenersByCollectionCount[collection]++;

    if (self.factName && Package['facts-base']) {
      Package['facts-base'].Facts.incrementServerFact(self.factPackage, self.factName, 1);
    }

    return {
      stop: function () {
        if (self.factName && Package['facts-base']) {
          Package['facts-base'].Facts.incrementServerFact(self.factPackage, self.factName, -1);
        }

        delete self.listenersByCollection[collection][id];
        self.listenersByCollectionCount[collection]--;

        if (self.listenersByCollectionCount[collection] === 0) {
          delete self.listenersByCollection[collection];
          delete self.listenersByCollectionCount[collection];
        }
      }
    };
  },
  // Fire the provided 'notification' (an object whose attribute
  // values are all JSON-compatibile) -- inform all matching listeners
  // (registered with listen()).
  //
  // If fire() is called inside a write fence, then each of the
  // listener callbacks will be called inside the write fence as well.
  //
  // The listeners may be invoked in parallel, rather than serially.
  fire: function (notification) {
    var self = this;

    var collection = self._collectionForMessage(notification);

    if (!_.has(self.listenersByCollection, collection)) {
      return;
    }

    var listenersForCollection = self.listenersByCollection[collection];
    var callbackIds = [];

    _.each(listenersForCollection, function (l, id) {
      if (self._matches(notification, l.trigger)) {
        callbackIds.push(id);
      }
    }); // Listener callbacks can yield, so we need to first find all the ones that
    // match in a single iteration over self.listenersByCollection (which can't
    // be mutated during this iteration), and then invoke the matching
    // callbacks, checking before each call to ensure they haven't stopped.
    // Note that we don't have to check that
    // self.listenersByCollection[collection] still === listenersForCollection,
    // because the only way that stops being true is if listenersForCollection
    // first gets reduced down to the empty object (and then never gets
    // increased again).


    _.each(callbackIds, function (id) {
      if (_.has(listenersForCollection, id)) {
        listenersForCollection[id].callback(notification);
      }
    });
  },
  // A notification matches a trigger if all keys that exist in both are equal.
  //
  // Examples:
  //  N:{collection: "C"} matches T:{collection: "C"}
  //    (a non-targeted write to a collection matches a
  //     non-targeted query)
  //  N:{collection: "C", id: "X"} matches T:{collection: "C"}
  //    (a targeted write to a collection matches a non-targeted query)
  //  N:{collection: "C"} matches T:{collection: "C", id: "X"}
  //    (a non-targeted write to a collection matches a
  //     targeted query)
  //  N:{collection: "C", id: "X"} matches T:{collection: "C", id: "X"}
  //    (a targeted write to a collection matches a targeted query targeted
  //     at the same document)
  //  N:{collection: "C", id: "X"} does not match T:{collection: "C", id: "Y"}
  //    (a targeted write to a collection does not match a targeted query
  //     targeted at a different document)
  _matches: function (notification, trigger) {
    // Most notifications that use the crossbar have a string `collection` and
    // maybe an `id` that is a string or ObjectID. We're already dividing up
    // triggers by collection, but let's fast-track "nope, different ID" (and
    // avoid the overly generic EJSON.equals). This makes a noticeable
    // performance difference; see https://github.com/meteor/meteor/pull/3697
    if (typeof notification.id === 'string' && typeof trigger.id === 'string' && notification.id !== trigger.id) {
      return false;
    }

    if (notification.id instanceof MongoID.ObjectID && trigger.id instanceof MongoID.ObjectID && !notification.id.equals(trigger.id)) {
      return false;
    }

    return _.all(trigger, function (triggerValue, key) {
      return !_.has(notification, key) || EJSON.equals(triggerValue, notification[key]);
    });
  }
}); // The "invalidation crossbar" is a specific instance used by the DDP server to
// implement write fence notifications. Listener callbacks on this crossbar
// should call beginWrite on the current write fence before they return, if they
// want to delay the write fence from firing (ie, the DDP method-data-updated
// message from being sent).


DDPServer._InvalidationCrossbar = new DDPServer._Crossbar({
  factName: "invalidation-crossbar-listeners"
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"server_convenience.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/ddp-server/server_convenience.js                                                                          //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
if (process.env.DDP_DEFAULT_CONNECTION_URL) {
  __meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL = process.env.DDP_DEFAULT_CONNECTION_URL;
}

Meteor.server = new Server();

Meteor.refresh = function (notification) {
  DDPServer._InvalidationCrossbar.fire(notification);
}; // Proxy the public methods of Meteor.server so they can
// be called directly on Meteor.


_.each(['publish', 'methods', 'call', 'apply', 'onConnection', 'onMessage'], function (name) {
  Meteor[name] = _.bind(Meteor.server[name], Meteor.server);
}); // Meteor.server used to be called Meteor.default_server. Provide
// backcompat as a courtesy even though it was never documented.
// XXX COMPAT WITH 0.6.4


Meteor.default_server = Meteor.server;
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/ddp-server/stream_server.js");
require("/node_modules/meteor/ddp-server/livedata_server.js");
require("/node_modules/meteor/ddp-server/writefence.js");
require("/node_modules/meteor/ddp-server/crossbar.js");
require("/node_modules/meteor/ddp-server/server_convenience.js");

/* Exports */
Package._define("ddp-server", {
  DDPServer: DDPServer
});

})();

//# sourceURL=meteor://💻app/packages/ddp-server.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZGRwLXNlcnZlci9zdHJlYW1fc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtc2VydmVyL2xpdmVkYXRhX3NlcnZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZGRwLXNlcnZlci93cml0ZWZlbmNlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtc2VydmVyL2Nyb3NzYmFyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9kZHAtc2VydmVyL3NlcnZlcl9jb252ZW5pZW5jZS5qcyJdLCJuYW1lcyI6WyJ1cmwiLCJOcG0iLCJyZXF1aXJlIiwid2Vic29ja2V0RXh0ZW5zaW9ucyIsIl8iLCJvbmNlIiwiZXh0ZW5zaW9ucyIsIndlYnNvY2tldENvbXByZXNzaW9uQ29uZmlnIiwicHJvY2VzcyIsImVudiIsIlNFUlZFUl9XRUJTT0NLRVRfQ09NUFJFU1NJT04iLCJKU09OIiwicGFyc2UiLCJwdXNoIiwiY29uZmlndXJlIiwicGF0aFByZWZpeCIsIl9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18iLCJST09UX1VSTF9QQVRIX1BSRUZJWCIsIlN0cmVhbVNlcnZlciIsInNlbGYiLCJyZWdpc3RyYXRpb25fY2FsbGJhY2tzIiwib3Blbl9zb2NrZXRzIiwicHJlZml4IiwiUm91dGVQb2xpY3kiLCJkZWNsYXJlIiwic29ja2pzIiwic2VydmVyT3B0aW9ucyIsImxvZyIsImhlYXJ0YmVhdF9kZWxheSIsImRpc2Nvbm5lY3RfZGVsYXkiLCJqc2Vzc2lvbmlkIiwiVVNFX0pTRVNTSU9OSUQiLCJESVNBQkxFX1dFQlNPQ0tFVFMiLCJ3ZWJzb2NrZXQiLCJmYXllX3NlcnZlcl9vcHRpb25zIiwic2VydmVyIiwiY3JlYXRlU2VydmVyIiwiV2ViQXBwIiwiaHR0cFNlcnZlciIsInJlbW92ZUxpc3RlbmVyIiwiX3RpbWVvdXRBZGp1c3RtZW50UmVxdWVzdENhbGxiYWNrIiwiaW5zdGFsbEhhbmRsZXJzIiwiYWRkTGlzdGVuZXIiLCJfcmVkaXJlY3RXZWJzb2NrZXRFbmRwb2ludCIsIm9uIiwic29ja2V0Iiwic2V0V2Vic29ja2V0VGltZW91dCIsInRpbWVvdXQiLCJwcm90b2NvbCIsIl9zZXNzaW9uIiwicmVjdiIsImNvbm5lY3Rpb24iLCJzZXRUaW1lb3V0Iiwic2VuZCIsImRhdGEiLCJ3cml0ZSIsIndpdGhvdXQiLCJzdHJpbmdpZnkiLCJzZXJ2ZXJfaWQiLCJlYWNoIiwiY2FsbGJhY2siLCJleHRlbmQiLCJwcm90b3R5cGUiLCJyZWdpc3RlciIsImFsbF9zb2NrZXRzIiwidmFsdWVzIiwiZXZlbnQiLCJvbGRIdHRwU2VydmVyTGlzdGVuZXJzIiwibGlzdGVuZXJzIiwic2xpY2UiLCJyZW1vdmVBbGxMaXN0ZW5lcnMiLCJuZXdMaXN0ZW5lciIsInJlcXVlc3QiLCJhcmdzIiwiYXJndW1lbnRzIiwicGFyc2VkVXJsIiwicGF0aG5hbWUiLCJmb3JtYXQiLCJvbGRMaXN0ZW5lciIsImFwcGx5IiwiRERQU2VydmVyIiwiRmliZXIiLCJTZXNzaW9uRG9jdW1lbnRWaWV3IiwiZXhpc3RzSW4iLCJkYXRhQnlLZXkiLCJfU2Vzc2lvbkRvY3VtZW50VmlldyIsImdldEZpZWxkcyIsInJldCIsInByZWNlZGVuY2VMaXN0Iiwia2V5IiwidmFsdWUiLCJjbGVhckZpZWxkIiwic3Vic2NyaXB0aW9uSGFuZGxlIiwiY2hhbmdlQ29sbGVjdG9yIiwicmVtb3ZlZFZhbHVlIiwidW5kZWZpbmVkIiwiaSIsImxlbmd0aCIsInByZWNlZGVuY2UiLCJzcGxpY2UiLCJpc0VtcHR5IiwiRUpTT04iLCJlcXVhbHMiLCJjaGFuZ2VGaWVsZCIsImlzQWRkIiwiY2xvbmUiLCJoYXMiLCJlbHQiLCJmaW5kIiwiU2Vzc2lvbkNvbGxlY3Rpb25WaWV3IiwiY29sbGVjdGlvbk5hbWUiLCJzZXNzaW9uQ2FsbGJhY2tzIiwiZG9jdW1lbnRzIiwiY2FsbGJhY2tzIiwiX1Nlc3Npb25Db2xsZWN0aW9uVmlldyIsImRpZmYiLCJwcmV2aW91cyIsIkRpZmZTZXF1ZW5jZSIsImRpZmZPYmplY3RzIiwiYm90aCIsImJpbmQiLCJkaWZmRG9jdW1lbnQiLCJyaWdodE9ubHkiLCJpZCIsIm5vd0RWIiwiYWRkZWQiLCJsZWZ0T25seSIsInByZXZEViIsInJlbW92ZWQiLCJmaWVsZHMiLCJwcmV2Iiwibm93IiwiY2hhbmdlZCIsImRvY1ZpZXciLCJjaGFuZ2VkUmVzdWx0IiwiRXJyb3IiLCJlcnIiLCJTZXNzaW9uIiwidmVyc2lvbiIsIm9wdGlvbnMiLCJSYW5kb20iLCJpbml0aWFsaXplZCIsImluUXVldWUiLCJNZXRlb3IiLCJfRG91YmxlRW5kZWRRdWV1ZSIsImJsb2NrZWQiLCJ3b3JrZXJSdW5uaW5nIiwiX25hbWVkU3VicyIsIl91bml2ZXJzYWxTdWJzIiwidXNlcklkIiwiY29sbGVjdGlvblZpZXdzIiwiX2lzU2VuZGluZyIsIl9kb250U3RhcnROZXdVbml2ZXJzYWxTdWJzIiwiX3BlbmRpbmdSZWFkeSIsIl9jbG9zZUNhbGxiYWNrcyIsIl9zb2NrZXRVcmwiLCJfcmVzcG9uZFRvUGluZ3MiLCJyZXNwb25kVG9QaW5ncyIsImNvbm5lY3Rpb25IYW5kbGUiLCJjbG9zZSIsIm9uQ2xvc2UiLCJmbiIsImNiIiwiYmluZEVudmlyb25tZW50IiwiZGVmZXIiLCJjbGllbnRBZGRyZXNzIiwiX2NsaWVudEFkZHJlc3MiLCJodHRwSGVhZGVycyIsImhlYWRlcnMiLCJtc2ciLCJzZXNzaW9uIiwic3RhcnRVbml2ZXJzYWxTdWJzIiwicnVuIiwiaGVhcnRiZWF0SW50ZXJ2YWwiLCJoZWFydGJlYXQiLCJERFBDb21tb24iLCJIZWFydGJlYXQiLCJoZWFydGJlYXRUaW1lb3V0Iiwib25UaW1lb3V0Iiwic2VuZFBpbmciLCJzdGFydCIsIlBhY2thZ2UiLCJGYWN0cyIsImluY3JlbWVudFNlcnZlckZhY3QiLCJzZW5kUmVhZHkiLCJzdWJzY3JpcHRpb25JZHMiLCJzdWJzIiwic3Vic2NyaXB0aW9uSWQiLCJzZW5kQWRkZWQiLCJjb2xsZWN0aW9uIiwic2VuZENoYW5nZWQiLCJzZW5kUmVtb3ZlZCIsImdldFNlbmRDYWxsYmFja3MiLCJnZXRDb2xsZWN0aW9uVmlldyIsInZpZXciLCJoYW5kbGVycyIsInVuaXZlcnNhbF9wdWJsaXNoX2hhbmRsZXJzIiwiaGFuZGxlciIsIl9zdGFydFN1YnNjcmlwdGlvbiIsInN0b3AiLCJfbWV0ZW9yU2Vzc2lvbiIsIl9kZWFjdGl2YXRlQWxsU3Vic2NyaXB0aW9ucyIsIl9yZW1vdmVTZXNzaW9uIiwiX3ByaW50U2VudEREUCIsIl9kZWJ1ZyIsInN0cmluZ2lmeUREUCIsInNlbmRFcnJvciIsInJlYXNvbiIsIm9mZmVuZGluZ01lc3NhZ2UiLCJwcm9jZXNzTWVzc2FnZSIsIm1zZ19pbiIsIm1lc3NhZ2VSZWNlaXZlZCIsInByb2Nlc3NOZXh0Iiwic2hpZnQiLCJ1bmJsb2NrIiwib25NZXNzYWdlSG9vayIsInByb3RvY29sX2hhbmRsZXJzIiwiY2FsbCIsInN1YiIsIm5hbWUiLCJwYXJhbXMiLCJBcnJheSIsInB1Ymxpc2hfaGFuZGxlcnMiLCJlcnJvciIsIkREUFJhdGVMaW1pdGVyIiwicmF0ZUxpbWl0ZXJJbnB1dCIsInR5cGUiLCJjb25uZWN0aW9uSWQiLCJfaW5jcmVtZW50IiwicmF0ZUxpbWl0UmVzdWx0IiwiX2NoZWNrIiwiYWxsb3dlZCIsImdldEVycm9yTWVzc2FnZSIsInRpbWVUb1Jlc2V0IiwidW5zdWIiLCJfc3RvcFN1YnNjcmlwdGlvbiIsIm1ldGhvZCIsInJhbmRvbVNlZWQiLCJmZW5jZSIsIl9Xcml0ZUZlbmNlIiwib25BbGxDb21taXR0ZWQiLCJyZXRpcmUiLCJtZXRob2RzIiwibWV0aG9kX2hhbmRsZXJzIiwiYXJtIiwic2V0VXNlcklkIiwiX3NldFVzZXJJZCIsImludm9jYXRpb24iLCJNZXRob2RJbnZvY2F0aW9uIiwiaXNTaW11bGF0aW9uIiwicHJvbWlzZSIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiX0N1cnJlbnRXcml0ZUZlbmNlIiwid2l0aFZhbHVlIiwiRERQIiwiX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uIiwibWF5YmVBdWRpdEFyZ3VtZW50Q2hlY2tzIiwiZmluaXNoIiwicGF5bG9hZCIsInRoZW4iLCJyZXN1bHQiLCJleGNlcHRpb24iLCJ3cmFwSW50ZXJuYWxFeGNlcHRpb24iLCJfZWFjaFN1YiIsImYiLCJfZGlmZkNvbGxlY3Rpb25WaWV3cyIsImJlZm9yZUNWcyIsImxlZnRWYWx1ZSIsInJpZ2h0VmFsdWUiLCJkb2MiLCJfZGVhY3RpdmF0ZSIsIm9sZE5hbWVkU3VicyIsIl9yZWNyZWF0ZSIsIl9ydW5IYW5kbGVyIiwiX25vWWllbGRzQWxsb3dlZCIsInN1YklkIiwiU3Vic2NyaXB0aW9uIiwic3ViTmFtZSIsIl9uYW1lIiwiX3JlbW92ZUFsbERvY3VtZW50cyIsInJlc3BvbnNlIiwiaHR0cEZvcndhcmRlZENvdW50IiwicGFyc2VJbnQiLCJyZW1vdGVBZGRyZXNzIiwiZm9yd2FyZGVkRm9yIiwiaXNTdHJpbmciLCJ0cmltIiwic3BsaXQiLCJfaGFuZGxlciIsIl9zdWJzY3JpcHRpb25JZCIsIl9wYXJhbXMiLCJfc3Vic2NyaXB0aW9uSGFuZGxlIiwiX2RlYWN0aXZhdGVkIiwiX3N0b3BDYWxsYmFja3MiLCJfZG9jdW1lbnRzIiwiX3JlYWR5IiwiX2lkRmlsdGVyIiwiaWRTdHJpbmdpZnkiLCJNb25nb0lEIiwiaWRQYXJzZSIsInJlcyIsIl9DdXJyZW50UHVibGljYXRpb25JbnZvY2F0aW9uIiwiZSIsIl9pc0RlYWN0aXZhdGVkIiwiX3B1Ymxpc2hIYW5kbGVyUmVzdWx0IiwiaXNDdXJzb3IiLCJjIiwiX3B1Ymxpc2hDdXJzb3IiLCJyZWFkeSIsImlzQXJyYXkiLCJhbGwiLCJjb2xsZWN0aW9uTmFtZXMiLCJfZ2V0Q29sbGVjdGlvbk5hbWUiLCJjdXIiLCJfY2FsbFN0b3BDYWxsYmFja3MiLCJjb2xsZWN0aW9uRG9jcyIsImtleXMiLCJzdHJJZCIsIm9uU3RvcCIsIl9lbnN1cmUiLCJTZXJ2ZXIiLCJkZWZhdWx0cyIsIm9uQ29ubmVjdGlvbkhvb2siLCJIb29rIiwiZGVidWdQcmludEV4Y2VwdGlvbnMiLCJzZXNzaW9ucyIsInN0cmVhbV9zZXJ2ZXIiLCJyYXdfbXNnIiwiX3ByaW50UmVjZWl2ZWRERFAiLCJwYXJzZUREUCIsIl9oYW5kbGVDb25uZWN0Iiwib25Db25uZWN0aW9uIiwib25NZXNzYWdlIiwic3VwcG9ydCIsImNvbnRhaW5zIiwiU1VQUE9SVEVEX0REUF9WRVJTSU9OUyIsImNhbGN1bGF0ZVZlcnNpb24iLCJwdWJsaXNoIiwiaXNPYmplY3QiLCJhdXRvcHVibGlzaCIsImlzX2F1dG8iLCJ3YXJuZWRfYWJvdXRfYXV0b3B1Ymxpc2giLCJmdW5jIiwicG9wIiwiY2FsbEFzeW5jIiwiYXBwbHlBc3luYyIsImF3YWl0IiwiY3VycmVudE1ldGhvZEludm9jYXRpb24iLCJnZXQiLCJjdXJyZW50UHVibGljYXRpb25JbnZvY2F0aW9uIiwibWFrZVJwY1NlZWQiLCJfdXJsRm9yU2Vzc2lvbiIsInNlc3Npb25JZCIsImNsaWVudFN1cHBvcnRlZFZlcnNpb25zIiwic2VydmVyU3VwcG9ydGVkVmVyc2lvbnMiLCJjb3JyZWN0VmVyc2lvbiIsIl9jYWxjdWxhdGVWZXJzaW9uIiwiY29udGV4dCIsImlzQ2xpZW50U2FmZSIsIm9yaWdpbmFsTWVzc2FnZSIsIm1lc3NhZ2UiLCJkZXRhaWxzIiwiX2V4cGVjdGVkQnlUZXN0Iiwic2FuaXRpemVkRXJyb3IiLCJkZXNjcmlwdGlvbiIsIk1hdGNoIiwiX2ZhaWxJZkFyZ3VtZW50c0FyZU5vdEFsbENoZWNrZWQiLCJGdXR1cmUiLCJhcm1lZCIsImZpcmVkIiwicmV0aXJlZCIsIm91dHN0YW5kaW5nX3dyaXRlcyIsImJlZm9yZV9maXJlX2NhbGxiYWNrcyIsImNvbXBsZXRpb25fY2FsbGJhY2tzIiwiRW52aXJvbm1lbnRWYXJpYWJsZSIsImJlZ2luV3JpdGUiLCJjb21taXR0ZWQiLCJfbWF5YmVGaXJlIiwib25CZWZvcmVGaXJlIiwiYXJtQW5kV2FpdCIsImZ1dHVyZSIsIndhaXQiLCJpbnZva2VDYWxsYmFjayIsIl9Dcm9zc2JhciIsIm5leHRJZCIsImxpc3RlbmVyc0J5Q29sbGVjdGlvbiIsImxpc3RlbmVyc0J5Q29sbGVjdGlvbkNvdW50IiwiZmFjdFBhY2thZ2UiLCJmYWN0TmFtZSIsIl9jb2xsZWN0aW9uRm9yTWVzc2FnZSIsImxpc3RlbiIsInRyaWdnZXIiLCJyZWNvcmQiLCJmaXJlIiwibm90aWZpY2F0aW9uIiwibGlzdGVuZXJzRm9yQ29sbGVjdGlvbiIsImNhbGxiYWNrSWRzIiwibCIsIl9tYXRjaGVzIiwiT2JqZWN0SUQiLCJ0cmlnZ2VyVmFsdWUiLCJfSW52YWxpZGF0aW9uQ3Jvc3NiYXIiLCJERFBfREVGQVVMVF9DT05ORUNUSU9OX1VSTCIsInJlZnJlc2giLCJkZWZhdWx0X3NlcnZlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBSUEsTUFBTUMsSUFBSUMsT0FBSixDQUFZLEtBQVosQ0FBVixDLENBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0EsSUFBSUMsc0JBQXNCQyxFQUFFQyxJQUFGLENBQU8sWUFBWTtBQUMzQyxNQUFJQyxhQUFhLEVBQWpCO0FBRUEsTUFBSUMsNkJBQTZCQyxRQUFRQyxHQUFSLENBQVlDLDRCQUFaLEdBQ3pCQyxLQUFLQyxLQUFMLENBQVdKLFFBQVFDLEdBQVIsQ0FBWUMsNEJBQXZCLENBRHlCLEdBQzhCLEVBRC9EOztBQUVBLE1BQUlILDBCQUFKLEVBQWdDO0FBQzlCRCxlQUFXTyxJQUFYLENBQWdCWixJQUFJQyxPQUFKLENBQVksb0JBQVosRUFBa0NZLFNBQWxDLENBQ2RQLDBCQURjLENBQWhCO0FBR0Q7O0FBRUQsU0FBT0QsVUFBUDtBQUNELENBWnlCLENBQTFCOztBQWNBLElBQUlTLGFBQWFDLDBCQUEwQkMsb0JBQTFCLElBQW1ELEVBQXBFOztBQUVBQyxlQUFlLFlBQVk7QUFDekIsTUFBSUMsT0FBTyxJQUFYO0FBQ0FBLE9BQUtDLHNCQUFM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QWQsQ0FBUCxFQUE0QjVFLE9BQU81RyxNQUFuQyxDQUFmO0FBQ0QsQ0FIUixFLENBS0E7QUFDQTtBQUNBOzs7QUFDQTRHLE9BQU91USxjQUFQLEdBQXdCdlEsT0FBTzVHLE1BQS9CLEMiLCJmaWxlIjoiL3BhY2thZ2VzL2RkcC1zZXJ2ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgdXJsID0gTnBtLnJlcXVpcmUoJ3VybCcpO1xuXG4vLyBCeSBkZWZhdWx0LCB3ZSB1c2UgdGhlIHBlcm1lc3NhZ2UtZGVmbGF0ZSBleHRlbnNpb24gd2l0aCBkZWZhdWx0XG4vLyBjb25maWd1cmF0aW9uLiBJZiAkU0VSVkVSX1dFQlNPQ0tFVF9DT01QUkVTU0lPTiBpcyBzZXQsIHRoZW4gaXQgbXVzdCBiZSB2YWxpZFxuLy8gSlNPTi4gSWYgaXQgcmVwcmVzZW50cyBhIGZhbHNleSB2YWx1ZSwgdGhlbiB3ZSBkbyBub3QgdXNlIHBlcm1lc3NhZ2UtZGVmbGF0ZVxuLy8gYXQgYWxsOyBvdGhlcndpc2UsIHRoZSBKU09OIHZhbHVlIGlzIHVzZWQgYXMgYW4gYXJndW1lbnQgdG8gZGVmbGF0ZSdzXG4vLyBjb25maWd1cmUgbWV0aG9kOyBzZWVcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9mYXllL3Blcm1lc3NhZ2UtZGVmbGF0ZS1ub2RlL2Jsb2IvbWFzdGVyL1JFQURNRS5tZFxuLy9cbi8vIChXZSBkbyB0aGlzIGluIGFuIF8ub25jZSBpbnN0ZWFkIG9mIGF0IHN0YXJ0dXAsIGJlY2F1c2Ugd2UgZG9uJ3Qgd2FudCB0b1xuLy8gY3Jhc2ggdGhlIHRvb2wgZHVyaW5nIGlzb3BhY2tldCBsb2FkIGlmIHlvdXIgSlNPTiBkb2Vzbid0IHBhcnNlLiBUaGlzIGlzIG9ubHlcbi8vIGEgcHJvYmxlbSBiZWNhdXNlIHRoZSB0b29sIGhhcyB0byBsb2FkIHRoZSBERFAgc2VydmVyIGNvZGUganVzdCBpbiBvcmRlciB0b1xuLy8gYmUgYSBERFAgY2xpZW50OyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvaXNzdWVzLzM0NTIgLilcbnZhciB3ZWJzb2NrZXRFeHRlbnNpb25zID0gXy5vbmNlKGZ1bmN0aW9uICgpIHtcbiAgdmFyIGV4dGVuc2lvbnMgPSBbXTtcblxuICB2YXIgd2Vic29ja2V0Q29tcHJlc3Npb25Db25maWcgPSBwcm9jZXNzLmVudi5TRVJWRVJfV0VCU09DS0VUX0NPTVBSRVNTSU9OXG4gICAgICAgID8gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5TRVJWRVJfV0VCU09DS0VUX0NPTVBSRVNTSU9OKSA6IHt9O1xuICBpZiAod2Vic29ja2V0Q29tcHJlc3Npb25Db25maWcpIHtcbiAgICBleHRlbnNpb25zLnB1c2goTnBtLnJlcXVpcmUoJ3Blcm1lc3NhZ2UtZGVmbGF0ZScpLmNvbmZpZ3VyZShcbiAgICAgIHdlYnNvY2tldENvbXByZXNzaW9uQ29uZmlnXG4gICAgKSk7XG4gIH1cblxuICByZXR1cm4gZXh0ZW5zaW9ucztcbn0pO1xuXG52YXIgcGF0aFByZWZpeCA9IF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkxfUEFUSF9QUkVGSVggfHwgIFwiXCI7XG5cblN0cmVhbVNlcnZlciA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLnJlZ2lzdHJhdGlvbl9jYWxsYmFja3MgPSBbXTtcbiAgc2VsZi5vcGVuX3NvY2tldHMgPSBbXTtcblxuICAvLyBCZWNhdXNlIHdlIGFyZSBpbnN0YWxsaW5nIGRpcmVjdGx5IG9udG8gV2ViQXBwLmh0dHBTZXJ2ZXIgaW5zdGVhZCBvZiB1c2luZ1xuICAvLyBXZWJBcHAuYXBwLCB3ZSBoYXZlIHRvIHByb2Nlc3MgdGhlIHBhdGggcHJlZml4IG91cnNlbHZlcy5cbiAgc2VsZi5wcmVmaXggPSBwYXRoUHJlZml4ICsgJy9zb2NranMnO1xuICBSb3V0ZVBvbGljeS5kZWNsYXJlKHNlbGYucHJlZml4ICsgJy8nLCAnbmV0d29yaycpO1xuXG4gIC8vIHNldCB1cCBzb2NranNcbiAgdmFyIHNvY2tqcyA9IE5wbS5yZXF1aXJlKCdzb2NranMnKTtcbiAgdmFyIHNlcnZlck9wdGlvbnMgPSB7XG4gICAgcHJlZml4OiBzZWxmLnByZWZpeCxcbiAgICBsb2c6IGZ1bmN0aW9uKCkge30sXG4gICAgLy8gdGhpcyBpcyB0aGUgZGVmYXVsdCwgYnV0IHdlIGNvZGUgaXQgZXhwbGljaXRseSBiZWNhdXNlIHdlIGRlcGVuZFxuICAgIC8vIG9uIGl0IGluIHN0cmVhbV9jbGllbnQ6SEVBUlRCRUFUX1RJTUVPVVRcbiAgICBoZWFydGJlYXRfZGVsYXk6IDQ1MDAwLFxuICAgIC8vIFRoZSBkZWZhdWx0IGRpc2Nvbm5lY3RfZGVsYXkgaXMgNSBzZWNvbmRzLCBidXQgaWYgdGhlIHNlcnZlciBlbmRzIHVwIENQVVxuICAgIC8vIGJvdW5kIGZvciB0aGF0IG11Y2ggdGltZSwgU29ja0pTIG1pZ2h0IG5vdCBub3RpY2UgdGhhdCB0aGUgdXNlciBoYXNcbiAgICAvLyByZWNvbm5lY3RlZCBiZWNhdXNlIHRoZSB0aW1lciAob2YgZGlzY29ubmVjdF9kZWxheSBtcykgY2FuIGZpcmUgYmVmb3JlXG4gICAgLy8gU29ja0pTIHByb2Nlc3NlcyB0aGUgbmV3IGNvbm5lY3Rpb24uIEV2ZW50dWFsbHkgd2UnbGwgZml4IHRoaXMgYnkgbm90XG4gICAgLy8gY29tYmluaW5nIENQVS1oZWF2eSBwcm9jZXNzaW5nIHdpdGggU29ja0pTIHRlcm1pbmF0aW9uIChlZyBhIHByb3h5IHdoaWNoXG4gICAgLy8gY29udmVydHMgdG8gVW5peCBzb2NrZXRzKSBidXQgZm9yIG5vdywgcmFpc2UgdGhlIGRlbGF5LlxuICAgIGRpc2Nvbm5lY3RfZGVsYXk6IDYwICogMTAwMCxcbiAgICAvLyBTZXQgdGhlIFVTRV9KU0VTU0lPTklEIGVudmlyb25tZW50IHZhcmlhYmxlIHRvIGVuYWJsZSBzZXR0aW5nIHRoZVxuICAgIC8vIEpTRVNTSU9OSUQgY29va2llLiBUaGlzIGlzIHVzZWZ1bCBmb3Igc2V0dGluZyB1cCBwcm94aWVzIHdpdGhcbiAgICAvLyBzZXNzaW9uIGFmZmluaXR5LlxuICAgIGpzZXNzaW9uaWQ6ICEhcHJvY2Vzcy5lbnYuVVNFX0pTRVNTSU9OSURcbiAgfTtcblxuICAvLyBJZiB5b3Uga25vdyB5b3VyIHNlcnZlciBlbnZpcm9ubWVudCAoZWcsIHByb3hpZXMpIHdpbGwgcHJldmVudCB3ZWJzb2NrZXRzXG4gIC8vIGZyb20gZXZlciB3b3JraW5nLCBzZXQgJERJU0FCTEVfV0VCU09DS0VUUyBhbmQgU29ja0pTIGNsaWVudHMgKGllLFxuICAvLyBicm93c2Vycykgd2lsbCBub3Qgd2FzdGUgdGltZSBhdHRlbXB0aW5nIHRvIHVzZSB0aGVtLlxuICAvLyAoWW91ciBzZXJ2ZXIgd2lsbCBzdGlsbCBoYXZlIGEgL3dlYnNvY2tldCBlbmRwb2ludC4pXG4gIGlmIChwcm9jZXNzLmVudi5ESVNBQkxFX1dFQlNPQ0tFVFMpIHtcbiAgICBzZXJ2ZXJPcHRpb25zLndlYnNvY2tldCA9IGZhbHNlO1xuICB9IGVsc2Uge1xuICAgIHNlcnZlck9wdGlvbnMuZmF5ZV9zZXJ2ZXJfb3B0aW9ucyA9IHtcbiAgICAgIGV4dGVuc2lvbnM6IHdlYnNvY2tldEV4dGVuc2lvbnMoKVxuICAgIH07XG4gIH1cblxuICBzZWxmLnNlcnZlciA9IHNvY2tqcy5jcmVhdGVTZXJ2ZXIoc2VydmVyT3B0aW9ucyk7XG5cbiAgLy8gSW5zdGFsbCB0aGUgc29ja2pzIGhhbmRsZXJzLCBidXQgd2Ugd2FudCB0byBrZWVwIGFyb3VuZCBvdXIgb3duIHBhcnRpY3VsYXJcbiAgLy8gcmVxdWVzdCBoYW5kbGVyIHRoYXQgYWRqdXN0cyBpZGxlIHRpbWVvdXRzIHdoaWxlIHdlIGhhdmUgYW4gb3V0c3RhbmRpbmdcbiAgLy8gcmVxdWVzdC4gIFRoaXMgY29tcGVuc2F0ZXMgZm9yIHRoZSBmYWN0IHRoYXQgc29ja2pzIHJlbW92ZXMgYWxsIGxpc3RlbmVyc1xuICAvLyBmb3IgXCJyZXF1ZXN0XCIgdG8gYWRkIGl0cyBvd24uXG4gIFdlYkFwcC5odHRwU2VydmVyLnJlbW92ZUxpc3RlbmVyKFxuICAgICdyZXF1ZXN0JywgV2ViQXBwLl90aW1lb3V0QWRqdXN0bWVudFJlcXVlc3RDYWxsYmFjayk7XG4gIHNlbGYuc2VydmVyLmluc3RhbGxIYW5kbGVycyhXZWJBcHAuaHR0cFNlcnZlcik7XG4gIFdlYkFwcC5odHRwU2VydmVyLmFkZExpc3RlbmVyKFxuICAgICdyZXF1ZXN0JywgV2ViQXBwLl90aW1lb3V0QWRqdXN0bWVudFJlcXVlc3RDYWxsYmFjayk7XG5cbiAgLy8gU3VwcG9ydCB0aGUgL3dlYnNvY2tldCBlbmRwb2ludFxuICBzZWxmLl9yZWRpcmVjdFdlYnNvY2tldEVuZHBvaW50KCk7XG5cbiAgc2VsZi5zZXJ2ZXIub24oJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbiAoc29ja2V0KSB7XG4gICAgLy8gV2Ugd2FudCB0byBtYWtlIHN1cmUgdGhhdCBpZiBhIGNsaWVudCBjb25uZWN0cyB0byB1cyBhbmQgZG9lcyB0aGUgaW5pdGlhbFxuICAgIC8vIFdlYnNvY2tldCBoYW5kc2hha2UgYnV0IG5ldmVyIGdldHMgdG8gdGhlIEREUCBoYW5kc2hha2UsIHRoYXQgd2VcbiAgICAvLyBldmVudHVhbGx5IGtpbGwgdGhlIHNvY2tldC4gIE9uY2UgdGhlIEREUCBoYW5kc2hha2UgaGFwcGVucywgRERQXG4gICAgLy8gaGVhcnRiZWF0aW5nIHdpbGwgd29yay4gQW5kIGJlZm9yZSB0aGUgV2Vic29ja2V0IGhhbmRzaGFrZSwgdGhlIHRpbWVvdXRzXG4gICAgLy8gd2Ugc2V0IGF0IHRoZSBzZXJ2ZXIgbGV2ZWwgaW4gd2ViYXBwX3NlcnZlci5qcyB3aWxsIHdvcmsuIEJ1dFxuICAgIC8vIGZheWUtd2Vic29ja2V0IGNhbGxzIHNldFRpbWVvdXQoMCkgb24gYW55IHNvY2tldCBpdCB0YWtlcyBvdmVyLCBzbyB0aGVyZVxuICAgIC8vIGlzIGFuIFwiaW4gYmV0d2VlblwiIHN0YXRlIHdoZXJlIHRoaXMgZG9lc24ndCBoYXBwZW4uICBXZSB3b3JrIGFyb3VuZCB0aGlzXG4gICAgLy8gYnkgZXhwbGljaXRseSBzZXR0aW5nIHRoZSBzb2NrZXQgdGltZW91dCB0byBhIHJlbGF0aXZlbHkgbGFyZ2UgdGltZSBoZXJlLFxuICAgIC8vIGFuZCBzZXR0aW5nIGl0IGJhY2sgdG8gemVybyB3aGVuIHdlIHNldCB1cCB0aGUgaGVhcnRiZWF0IGluXG4gICAgLy8gbGl2ZWRhdGFfc2VydmVyLmpzLlxuICAgIHNvY2tldC5zZXRXZWJzb2NrZXRUaW1lb3V0ID0gZnVuY3Rpb24gKHRpbWVvdXQpIHtcbiAgICAgIGlmICgoc29ja2V0LnByb3RvY29sID09PSAnd2Vic29ja2V0JyB8fFxuICAgICAgICAgICBzb2NrZXQucHJvdG9jb2wgPT09ICd3ZWJzb2NrZXQtcmF3JylcbiAgICAgICAgICAmJiBzb2NrZXQuX3Nlc3Npb24ucmVjdikge1xuICAgICAgICBzb2NrZXQuX3Nlc3Npb24ucmVjdi5jb25uZWN0aW9uLnNldFRpbWVvdXQodGltZW91dCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBzb2NrZXQuc2V0V2Vic29ja2V0VGltZW91dCg0NSAqIDEwMDApO1xuXG4gICAgc29ja2V0LnNlbmQgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgc29ja2V0LndyaXRlKGRhdGEpO1xuICAgIH07XG4gICAgc29ja2V0Lm9uKCdjbG9zZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYub3Blbl9zb2NrZXRzID0gXy53aXRob3V0KHNlbGYub3Blbl9zb2NrZXRzLCBzb2NrZXQpO1xuICAgIH0pO1xuICAgIHNlbGYub3Blbl9zb2NrZXRzLnB1c2goc29ja2V0KTtcblxuICAgIC8vIFhYWCBDT01QQVQgV0lUSCAwLjYuNi4gU2VuZCB0aGUgb2xkIHN0eWxlIHdlbGNvbWUgbWVzc2FnZSwgd2hpY2hcbiAgICAvLyB3aWxsIGZvcmNlIG9sZCBjbGllbnRzIHRvIHJlbG9hZC4gUmVtb3ZlIHRoaXMgb25jZSB3ZSdyZSBub3RcbiAgICAvLyBjb25jZXJuZWQgYWJvdXQgcGVvcGxlIHVwZ3JhZGluZyBmcm9tIGEgcHJlLTAuNy4wIHJlbGVhc2UuIEFsc28sXG4gICAgLy8gcmVtb3ZlIHRoZSBjbGF1c2UgaW4gdGhlIGNsaWVudCB0aGF0IGlnbm9yZXMgdGhlIHdlbGNvbWUgbWVzc2FnZVxuICAgIC8vIChsaXZlZGF0YV9jb25uZWN0aW9uLmpzKVxuICAgIHNvY2tldC5zZW5kKEpTT04uc3RyaW5naWZ5KHtzZXJ2ZXJfaWQ6IFwiMFwifSkpO1xuXG4gICAgLy8gY2FsbCBhbGwgb3VyIGNhbGxiYWNrcyB3aGVuIHdlIGdldCBhIG5ldyBzb2NrZXQuIHRoZXkgd2lsbCBkbyB0aGVcbiAgICAvLyB3b3JrIG9mIHNldHRpbmcgdXAgaGFuZGxlcnMgYW5kIHN1Y2ggZm9yIHNwZWNpZmljIG1lc3NhZ2VzLlxuICAgIF8uZWFjaChzZWxmLnJlZ2lzdHJhdGlvbl9jYWxsYmFja3MsIGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2soc29ja2V0KTtcbiAgICB9KTtcbiAgfSk7XG5cbn07XG5cbl8uZXh0ZW5kKFN0cmVhbVNlcnZlci5wcm90b3R5cGUsIHtcbiAgLy8gY2FsbCBteSBjYWxsYmFjayB3aGVuIGEgbmV3IHNvY2tldCBjb25uZWN0cy5cbiAgLy8gYWxzbyBjYWxsIGl0IGZvciBhbGwgY3VycmVudCBjb25uZWN0aW9ucy5cbiAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLnJlZ2lzdHJhdGlvbl9jYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gICAgXy5lYWNoKHNlbGYuYWxsX3NvY2tldHMoKSwgZnVuY3Rpb24gKHNvY2tldCkge1xuICAgICAgY2FsbGJhY2soc29ja2V0KTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBnZXQgYSBsaXN0IG9mIGFsbCBzb2NrZXRzXG4gIGFsbF9zb2NrZXRzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBfLnZhbHVlcyhzZWxmLm9wZW5fc29ja2V0cyk7XG4gIH0sXG5cbiAgLy8gUmVkaXJlY3QgL3dlYnNvY2tldCB0byAvc29ja2pzL3dlYnNvY2tldCBpbiBvcmRlciB0byBub3QgZXhwb3NlXG4gIC8vIHNvY2tqcyB0byBjbGllbnRzIHRoYXQgd2FudCB0byB1c2UgcmF3IHdlYnNvY2tldHNcbiAgX3JlZGlyZWN0V2Vic29ja2V0RW5kcG9pbnQ6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBVbmZvcnR1bmF0ZWx5IHdlIGNhbid0IHVzZSBhIGNvbm5lY3QgbWlkZGxld2FyZSBoZXJlIHNpbmNlXG4gICAgLy8gc29ja2pzIGluc3RhbGxzIGl0c2VsZiBwcmlvciB0byBhbGwgZXhpc3RpbmcgbGlzdGVuZXJzXG4gICAgLy8gKG1lYW5pbmcgcHJpb3IgdG8gYW55IGNvbm5lY3QgbWlkZGxld2FyZXMpIHNvIHdlIG5lZWQgdG8gdGFrZVxuICAgIC8vIGFuIGFwcHJvYWNoIHNpbWlsYXIgdG8gb3ZlcnNoYWRvd0xpc3RlbmVycyBpblxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9zb2NranMvc29ja2pzLW5vZGUvYmxvYi9jZjgyMGM1NWFmNmE5OTUzZTE2NTU4NTU1YTMxZGVjZWE1NTRmNzBlL3NyYy91dGlscy5jb2ZmZWVcbiAgICBfLmVhY2goWydyZXF1ZXN0JywgJ3VwZ3JhZGUnXSwgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIHZhciBodHRwU2VydmVyID0gV2ViQXBwLmh0dHBTZXJ2ZXI7XG4gICAgICB2YXIgb2xkSHR0cFNlcnZlckxpc3RlbmVycyA9IGh0dHBTZXJ2ZXIubGlzdGVuZXJzKGV2ZW50KS5zbGljZSgwKTtcbiAgICAgIGh0dHBTZXJ2ZXIucmVtb3ZlQWxsTGlzdGVuZXJzKGV2ZW50KTtcblxuICAgICAgLy8gcmVxdWVzdCBhbmQgdXBncmFkZSBoYXZlIGRpZmZlcmVudCBhcmd1bWVudHMgcGFzc2VkIGJ1dFxuICAgICAgLy8gd2Ugb25seSBjYXJlIGFib3V0IHRoZSBmaXJzdCBvbmUgd2hpY2ggaXMgYWx3YXlzIHJlcXVlc3RcbiAgICAgIHZhciBuZXdMaXN0ZW5lciA9IGZ1bmN0aW9uKHJlcXVlc3QgLyosIG1vcmVBcmd1bWVudHMgKi8pIHtcbiAgICAgICAgLy8gU3RvcmUgYXJndW1lbnRzIGZvciB1c2Ugd2l0aGluIHRoZSBjbG9zdXJlIGJlbG93XG4gICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuXG4gICAgICAgIC8vIFJld3JpdGUgL3dlYnNvY2tldCBhbmQgL3dlYnNvY2tldC8gdXJscyB0byAvc29ja2pzL3dlYnNvY2tldCB3aGlsZVxuICAgICAgICAvLyBwcmVzZXJ2aW5nIHF1ZXJ5IHN0cmluZy5cbiAgICAgICAgdmFyIHBhcnNlZFVybCA9IHVybC5wYXJzZShyZXF1ZXN0LnVybCk7XG4gICAgICAgIGlmIChwYXJzZWRVcmwucGF0aG5hbWUgPT09IHBhdGhQcmVmaXggKyAnL3dlYnNvY2tldCcgfHxcbiAgICAgICAgICAgIHBhcnNlZFVybC5wYXRobmFtZSA9PT0gcGF0aFByZWZpeCArICcvd2Vic29ja2V0LycpIHtcbiAgICAgICAgICBwYXJzZWRVcmwucGF0aG5hbWUgPSBzZWxmLnByZWZpeCArICcvd2Vic29ja2V0JztcbiAgICAgICAgICByZXF1ZXN0LnVybCA9IHVybC5mb3JtYXQocGFyc2VkVXJsKTtcbiAgICAgICAgfVxuICAgICAgICBfLmVhY2gob2xkSHR0cFNlcnZlckxpc3RlbmVycywgZnVuY3Rpb24ob2xkTGlzdGVuZXIpIHtcbiAgICAgICAgICBvbGRMaXN0ZW5lci5hcHBseShodHRwU2VydmVyLCBhcmdzKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgICAgaHR0cFNlcnZlci5hZGRMaXN0ZW5lcihldmVudCwgbmV3TGlzdGVuZXIpO1xuICAgIH0pO1xuICB9XG59KTtcbiIsIkREUFNlcnZlciA9IHt9O1xuXG52YXIgRmliZXIgPSBOcG0ucmVxdWlyZSgnZmliZXJzJyk7XG5cbi8vIFRoaXMgZmlsZSBjb250YWlucyBjbGFzc2VzOlxuLy8gKiBTZXNzaW9uIC0gVGhlIHNlcnZlcidzIGNvbm5lY3Rpb24gdG8gYSBzaW5nbGUgRERQIGNsaWVudFxuLy8gKiBTdWJzY3JpcHRpb24gLSBBIHNpbmdsZSBzdWJzY3JpcHRpb24gZm9yIGEgc2luZ2xlIGNsaWVudFxuLy8gKiBTZXJ2ZXIgLSBBbiBlbnRpcmUgc2VydmVyIHRoYXQgbWF5IHRhbGsgdG8gPiAxIGNsaWVudC4gQSBERFAgZW5kcG9pbnQuXG4vL1xuLy8gU2Vzc2lvbiBhbmQgU3Vic2NyaXB0aW9uIGFyZSBmaWxlIHNjb3BlLiBGb3Igbm93LCB1bnRpbCB3ZSBmcmVlemVcbi8vIHRoZSBpbnRlcmZhY2UsIFNlcnZlciBpcyBwYWNrYWdlIHNjb3BlIChpbiB0aGUgZnV0dXJlIGl0IHNob3VsZCBiZVxuLy8gZXhwb3J0ZWQuKVxuXG4vLyBSZXByZXNlbnRzIGEgc2luZ2xlIGRvY3VtZW50IGluIGEgU2Vzc2lvbkNvbGxlY3Rpb25WaWV3XG52YXIgU2Vzc2lvbkRvY3VtZW50VmlldyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLmV4aXN0c0luID0ge307IC8vIHNldCBvZiBzdWJzY3JpcHRpb25IYW5kbGVcbiAgc2VsZi5kYXRhQnlLZXkgPSB7fTsgLy8ga2V5LT4gWyB7c3Vic2NyaXB0aW9uSGFuZGxlLCB2YWx1ZX0gYnkgcHJlY2VkZW5jZV1cbn07XG5cbkREUFNlcnZlci5fU2Vzc2lvbkRvY3VtZW50VmlldyA9IFNlc3Npb25Eb2N1bWVudFZpZXc7XG5cblxuXy5leHRlbmQoU2Vzc2lvbkRvY3VtZW50Vmlldy5wcm90b3R5cGUsIHtcblxuICBnZXRGaWVsZHM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJldCA9IHt9O1xuICAgIF8uZWFjaChzZWxmLmRhdGFCeUtleSwgZnVuY3Rpb24gKHByZWNlZGVuY2VMaXN0LCBrZXkpIHtcbiAgICAgIHJldFtrZXldID0gcHJlY2VkZW5jZUxpc3RbMF0udmFsdWU7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICBjbGVhckZpZWxkOiBmdW5jdGlvbiAoc3Vic2NyaXB0aW9uSGFuZGxlLCBrZXksIGNoYW5nZUNvbGxlY3Rvcikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBQdWJsaXNoIEFQSSBpZ25vcmVzIF9pZCBpZiBwcmVzZW50IGluIGZpZWxkc1xuICAgIGlmIChrZXkgPT09IFwiX2lkXCIpXG4gICAgICByZXR1cm47XG4gICAgdmFyIHByZWNlZGVuY2VMaXN0ID0gc2VsZi5kYXRhQnlLZXlba2V5XTtcblxuICAgIC8vIEl0J3Mgb2theSB0byBjbGVhciBmaWVsZHMgdGhhdCBkaWRuJ3QgZXhpc3QuIE5vIG5lZWQgdG8gdGhyb3dcbiAgICAvLyBhbiBlcnJvci5cbiAgICBpZiAoIXByZWNlZGVuY2VMaXN0KVxuICAgICAgcmV0dXJuO1xuXG4gICAgdmFyIHJlbW92ZWRWYWx1ZSA9IHVuZGVmaW5lZDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByZWNlZGVuY2VMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgcHJlY2VkZW5jZSA9IHByZWNlZGVuY2VMaXN0W2ldO1xuICAgICAgaWYgKHByZWNlZGVuY2Uuc3Vic2NyaXB0aW9uSGFuZGxlID09PSBzdWJzY3JpcHRpb25IYW5kbGUpIHtcbiAgICAgICAgLy8gVGhlIHZpZXcncyB2YWx1ZSBjYW4gb25seSBjaGFuZ2UgaWYgdGhpcyBzdWJzY3JpcHRpb24gaXMgdGhlIG9uZSB0aGF0XG4gICAgICAgIC8vIHVzZWQgdG8gaGF2ZSBwcmVjZWRlbmNlLlxuICAgICAgICBpZiAoaSA9PT0gMClcbiAgICAgICAgICByZW1vdmVkVmFsdWUgPSBwcmVjZWRlbmNlLnZhbHVlO1xuICAgICAgICBwcmVjZWRlbmNlTGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoXy5pc0VtcHR5KHByZWNlZGVuY2VMaXN0KSkge1xuICAgICAgZGVsZXRlIHNlbGYuZGF0YUJ5S2V5W2tleV07XG4gICAgICBjaGFuZ2VDb2xsZWN0b3Jba2V5XSA9IHVuZGVmaW5lZDtcbiAgICB9IGVsc2UgaWYgKHJlbW92ZWRWYWx1ZSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAgICAhRUpTT04uZXF1YWxzKHJlbW92ZWRWYWx1ZSwgcHJlY2VkZW5jZUxpc3RbMF0udmFsdWUpKSB7XG4gICAgICBjaGFuZ2VDb2xsZWN0b3Jba2V5XSA9IHByZWNlZGVuY2VMaXN0WzBdLnZhbHVlO1xuICAgIH1cbiAgfSxcblxuICBjaGFuZ2VGaWVsZDogZnVuY3Rpb24gKHN1YnNjcmlwdGlvbkhhbmRsZSwga2V5LCB2YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VDb2xsZWN0b3IsIGlzQWRkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIFB1Ymxpc2ggQVBJIGlnbm9yZXMgX2lkIGlmIHByZXNlbnQgaW4gZmllbGRzXG4gICAgaWYgKGtleSA9PT0gXCJfaWRcIilcbiAgICAgIHJldHVybjtcblxuICAgIC8vIERvbid0IHNoYXJlIHN0YXRlIHdpdGggdGhlIGRhdGEgcGFzc2VkIGluIGJ5IHRoZSB1c2VyLlxuICAgIHZhbHVlID0gRUpTT04uY2xvbmUodmFsdWUpO1xuXG4gICAgaWYgKCFfLmhhcyhzZWxmLmRhdGFCeUtleSwga2V5KSkge1xuICAgICAgc2VsZi5kYXRhQnlLZXlba2V5XSA9IFt7c3Vic2NyaXB0aW9uSGFuZGxlOiBzdWJzY3JpcHRpb25IYW5kbGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWV9XTtcbiAgICAgIGNoYW5nZUNvbGxlY3RvcltrZXldID0gdmFsdWU7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBwcmVjZWRlbmNlTGlzdCA9IHNlbGYuZGF0YUJ5S2V5W2tleV07XG4gICAgdmFyIGVsdDtcbiAgICBpZiAoIWlzQWRkKSB7XG4gICAgICBlbHQgPSBfLmZpbmQocHJlY2VkZW5jZUxpc3QsIGZ1bmN0aW9uIChwcmVjZWRlbmNlKSB7XG4gICAgICAgIHJldHVybiBwcmVjZWRlbmNlLnN1YnNjcmlwdGlvbkhhbmRsZSA9PT0gc3Vic2NyaXB0aW9uSGFuZGxlO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKGVsdCkge1xuICAgICAgaWYgKGVsdCA9PT0gcHJlY2VkZW5jZUxpc3RbMF0gJiYgIUVKU09OLmVxdWFscyh2YWx1ZSwgZWx0LnZhbHVlKSkge1xuICAgICAgICAvLyB0aGlzIHN1YnNjcmlwdGlvbiBpcyBjaGFuZ2luZyB0aGUgdmFsdWUgb2YgdGhpcyBmaWVsZC5cbiAgICAgICAgY2hhbmdlQ29sbGVjdG9yW2tleV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIGVsdC52YWx1ZSA9IHZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyB0aGlzIHN1YnNjcmlwdGlvbiBpcyBuZXdseSBjYXJpbmcgYWJvdXQgdGhpcyBmaWVsZFxuICAgICAgcHJlY2VkZW5jZUxpc3QucHVzaCh7c3Vic2NyaXB0aW9uSGFuZGxlOiBzdWJzY3JpcHRpb25IYW5kbGUsIHZhbHVlOiB2YWx1ZX0pO1xuICAgIH1cblxuICB9XG59KTtcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgY2xpZW50J3MgdmlldyBvZiBhIHNpbmdsZSBjb2xsZWN0aW9uXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgTmFtZSBvZiB0aGUgY29sbGVjdGlvbiBpdCByZXByZXNlbnRzXG4gKiBAcGFyYW0ge09iamVjdC48U3RyaW5nLCBGdW5jdGlvbj59IHNlc3Npb25DYWxsYmFja3MgVGhlIGNhbGxiYWNrcyBmb3IgYWRkZWQsIGNoYW5nZWQsIHJlbW92ZWRcbiAqIEBjbGFzcyBTZXNzaW9uQ29sbGVjdGlvblZpZXdcbiAqL1xudmFyIFNlc3Npb25Db2xsZWN0aW9uVmlldyA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgc2Vzc2lvbkNhbGxiYWNrcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYuY29sbGVjdGlvbk5hbWUgPSBjb2xsZWN0aW9uTmFtZTtcbiAgc2VsZi5kb2N1bWVudHMgPSB7fTtcbiAgc2VsZi5jYWxsYmFja3MgPSBzZXNzaW9uQ2FsbGJhY2tzO1xufTtcblxuRERQU2VydmVyLl9TZXNzaW9uQ29sbGVjdGlvblZpZXcgPSBTZXNzaW9uQ29sbGVjdGlvblZpZXc7XG5cblxuXy5leHRlbmQoU2Vzc2lvbkNvbGxlY3Rpb25WaWV3LnByb3RvdHlwZSwge1xuXG4gIGlzRW1wdHk6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIF8uaXNFbXB0eShzZWxmLmRvY3VtZW50cyk7XG4gIH0sXG5cbiAgZGlmZjogZnVuY3Rpb24gKHByZXZpb3VzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIERpZmZTZXF1ZW5jZS5kaWZmT2JqZWN0cyhwcmV2aW91cy5kb2N1bWVudHMsIHNlbGYuZG9jdW1lbnRzLCB7XG4gICAgICBib3RoOiBfLmJpbmQoc2VsZi5kaWZmRG9jdW1lbnQsIHNlbGYpLFxuXG4gICAgICByaWdodE9ubHk6IGZ1bmN0aW9uIChpZCwgbm93RFYpIHtcbiAgICAgICAgc2VsZi5jYWxsYmFja3MuYWRkZWQoc2VsZi5jb2xsZWN0aW9uTmFtZSwgaWQsIG5vd0RWLmdldEZpZWxkcygpKTtcbiAgICAgIH0sXG5cbiAgICAgIGxlZnRPbmx5OiBmdW5jdGlvbiAoaWQsIHByZXZEVikge1xuICAgICAgICBzZWxmLmNhbGxiYWNrcy5yZW1vdmVkKHNlbGYuY29sbGVjdGlvbk5hbWUsIGlkKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICBkaWZmRG9jdW1lbnQ6IGZ1bmN0aW9uIChpZCwgcHJldkRWLCBub3dEVikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZmllbGRzID0ge307XG4gICAgRGlmZlNlcXVlbmNlLmRpZmZPYmplY3RzKHByZXZEVi5nZXRGaWVsZHMoKSwgbm93RFYuZ2V0RmllbGRzKCksIHtcbiAgICAgIGJvdGg6IGZ1bmN0aW9uIChrZXksIHByZXYsIG5vdykge1xuICAgICAgICBpZiAoIUVKU09OLmVxdWFscyhwcmV2LCBub3cpKVxuICAgICAgICAgIGZpZWxkc1trZXldID0gbm93O1xuICAgICAgfSxcbiAgICAgIHJpZ2h0T25seTogZnVuY3Rpb24gKGtleSwgbm93KSB7XG4gICAgICAgIGZpZWxkc1trZXldID0gbm93O1xuICAgICAgfSxcbiAgICAgIGxlZnRPbmx5OiBmdW5jdGlvbihrZXksIHByZXYpIHtcbiAgICAgICAgZmllbGRzW2tleV0gPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgc2VsZi5jYWxsYmFja3MuY2hhbmdlZChzZWxmLmNvbGxlY3Rpb25OYW1lLCBpZCwgZmllbGRzKTtcbiAgfSxcblxuICBhZGRlZDogZnVuY3Rpb24gKHN1YnNjcmlwdGlvbkhhbmRsZSwgaWQsIGZpZWxkcykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZG9jVmlldyA9IHNlbGYuZG9jdW1lbnRzW2lkXTtcbiAgICB2YXIgYWRkZWQgPSBmYWxzZTtcbiAgICBpZiAoIWRvY1ZpZXcpIHtcbiAgICAgIGFkZGVkID0gdHJ1ZTtcbiAgICAgIGRvY1ZpZXcgPSBuZXcgU2Vzc2lvbkRvY3VtZW50VmlldygpO1xuICAgICAgc2VsZi5kb2N1bWVudHNbaWRdID0gZG9jVmlldztcbiAgICB9XG4gICAgZG9jVmlldy5leGlzdHNJbltzdWJzY3JpcHRpb25IYW5kbGVdID0gdHJ1ZTtcbiAgICB2YXIgY2hhbmdlQ29sbGVjdG9yID0ge307XG4gICAgXy5lYWNoKGZpZWxkcywgZnVuY3Rpb24gKHZhbHVlLCBrZXkpIHtcbiAgICAgIGRvY1ZpZXcuY2hhbmdlRmllbGQoXG4gICAgICAgIHN1YnNjcmlwdGlvbkhhbmRsZSwga2V5LCB2YWx1ZSwgY2hhbmdlQ29sbGVjdG9yLCB0cnVlKTtcbiAgICB9KTtcbiAgICBpZiAoYWRkZWQpXG4gICAgICBzZWxmLmNhbGxiYWNrcy5hZGRlZChzZWxmLmNvbGxlY3Rpb25OYW1lLCBpZCwgY2hhbmdlQ29sbGVjdG9yKTtcbiAgICBlbHNlXG4gICAgICBzZWxmLmNhbGxiYWNrcy5jaGFuZ2VkKHNlbGYuY29sbGVjdGlvbk5hbWUsIGlkLCBjaGFuZ2VDb2xsZWN0b3IpO1xuICB9LFxuXG4gIGNoYW5nZWQ6IGZ1bmN0aW9uIChzdWJzY3JpcHRpb25IYW5kbGUsIGlkLCBjaGFuZ2VkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBjaGFuZ2VkUmVzdWx0ID0ge307XG4gICAgdmFyIGRvY1ZpZXcgPSBzZWxmLmRvY3VtZW50c1tpZF07XG4gICAgaWYgKCFkb2NWaWV3KVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IGZpbmQgZWxlbWVudCB3aXRoIGlkIFwiICsgaWQgKyBcIiB0byBjaGFuZ2VcIik7XG4gICAgXy5lYWNoKGNoYW5nZWQsIGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgZG9jVmlldy5jbGVhckZpZWxkKHN1YnNjcmlwdGlvbkhhbmRsZSwga2V5LCBjaGFuZ2VkUmVzdWx0KTtcbiAgICAgIGVsc2VcbiAgICAgICAgZG9jVmlldy5jaGFuZ2VGaWVsZChzdWJzY3JpcHRpb25IYW5kbGUsIGtleSwgdmFsdWUsIGNoYW5nZWRSZXN1bHQpO1xuICAgIH0pO1xuICAgIHNlbGYuY2FsbGJhY2tzLmNoYW5nZWQoc2VsZi5jb2xsZWN0aW9uTmFtZSwgaWQsIGNoYW5nZWRSZXN1bHQpO1xuICB9LFxuXG4gIHJlbW92ZWQ6IGZ1bmN0aW9uIChzdWJzY3JpcHRpb25IYW5kbGUsIGlkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBkb2NWaWV3ID0gc2VsZi5kb2N1bWVudHNbaWRdO1xuICAgIGlmICghZG9jVmlldykge1xuICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcihcIlJlbW92ZWQgbm9uZXhpc3RlbnQgZG9jdW1lbnQgXCIgKyBpZCk7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICAgIGRlbGV0ZSBkb2NWaWV3LmV4aXN0c0luW3N1YnNjcmlwdGlvbkhhbmRsZV07XG4gICAgaWYgKF8uaXNFbXB0eShkb2NWaWV3LmV4aXN0c0luKSkge1xuICAgICAgLy8gaXQgaXMgZ29uZSBmcm9tIGV2ZXJ5b25lXG4gICAgICBzZWxmLmNhbGxiYWNrcy5yZW1vdmVkKHNlbGYuY29sbGVjdGlvbk5hbWUsIGlkKTtcbiAgICAgIGRlbGV0ZSBzZWxmLmRvY3VtZW50c1tpZF07XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBjaGFuZ2VkID0ge307XG4gICAgICAvLyByZW1vdmUgdGhpcyBzdWJzY3JpcHRpb24gZnJvbSBldmVyeSBwcmVjZWRlbmNlIGxpc3RcbiAgICAgIC8vIGFuZCByZWNvcmQgdGhlIGNoYW5nZXNcbiAgICAgIF8uZWFjaChkb2NWaWV3LmRhdGFCeUtleSwgZnVuY3Rpb24gKHByZWNlZGVuY2VMaXN0LCBrZXkpIHtcbiAgICAgICAgZG9jVmlldy5jbGVhckZpZWxkKHN1YnNjcmlwdGlvbkhhbmRsZSwga2V5LCBjaGFuZ2VkKTtcbiAgICAgIH0pO1xuXG4gICAgICBzZWxmLmNhbGxiYWNrcy5jaGFuZ2VkKHNlbGYuY29sbGVjdGlvbk5hbWUsIGlkLCBjaGFuZ2VkKTtcbiAgICB9XG4gIH1cbn0pO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuLyogU2Vzc2lvbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbnZhciBTZXNzaW9uID0gZnVuY3Rpb24gKHNlcnZlciwgdmVyc2lvbiwgc29ja2V0LCBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5pZCA9IFJhbmRvbS5pZCgpO1xuXG4gIHNlbGYuc2VydmVyID0gc2VydmVyO1xuICBzZWxmLnZlcnNpb24gPSB2ZXJzaW9uO1xuXG4gIHNlbGYuaW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgc2VsZi5zb2NrZXQgPSBzb2NrZXQ7XG5cbiAgLy8gc2V0IHRvIG51bGwgd2hlbiB0aGUgc2Vzc2lvbiBpcyBkZXN0cm95ZWQuIG11bHRpcGxlIHBsYWNlcyBiZWxvd1xuICAvLyB1c2UgdGhpcyB0byBkZXRlcm1pbmUgaWYgdGhlIHNlc3Npb24gaXMgYWxpdmUgb3Igbm90LlxuICBzZWxmLmluUXVldWUgPSBuZXcgTWV0ZW9yLl9Eb3VibGVFbmRlZFF1ZXVlKCk7XG5cbiAgc2VsZi5ibG9ja2VkID0gZmFsc2U7XG4gIHNlbGYud29ya2VyUnVubmluZyA9IGZhbHNlO1xuXG4gIC8vIFN1YiBvYmplY3RzIGZvciBhY3RpdmUgc3Vic2NyaXB0aW9uc1xuICBzZWxmLl9uYW1lZFN1YnMgPSB7fTtcbiAgc2VsZi5fdW5pdmVyc2FsU3VicyA9IFtdO1xuXG4gIHNlbGYudXNlcklkID0gbnVsbDtcblxuICBzZWxmLmNvbGxlY3Rpb25WaWV3cyA9IHt9O1xuXG4gIC8vIFNldCB0aGlzIHRvIGZhbHNlIHRvIG5vdCBzZW5kIG1lc3NhZ2VzIHdoZW4gY29sbGVjdGlvblZpZXdzIGFyZVxuICAvLyBtb2RpZmllZC4gVGhpcyBpcyBkb25lIHdoZW4gcmVydW5uaW5nIHN1YnMgaW4gX3NldFVzZXJJZCBhbmQgdGhvc2UgbWVzc2FnZXNcbiAgLy8gYXJlIGNhbGN1bGF0ZWQgdmlhIGEgZGlmZiBpbnN0ZWFkLlxuICBzZWxmLl9pc1NlbmRpbmcgPSB0cnVlO1xuXG4gIC8vIElmIHRoaXMgaXMgdHJ1ZSwgZG9uJ3Qgc3RhcnQgYSBuZXdseS1jcmVhdGVkIHVuaXZlcnNhbCBwdWJsaXNoZXIgb24gdGhpc1xuICAvLyBzZXNzaW9uLiBUaGUgc2Vzc2lvbiB3aWxsIHRha2UgY2FyZSBvZiBzdGFydGluZyBpdCB3aGVuIGFwcHJvcHJpYXRlLlxuICBzZWxmLl9kb250U3RhcnROZXdVbml2ZXJzYWxTdWJzID0gZmFsc2U7XG5cbiAgLy8gd2hlbiB3ZSBhcmUgcmVydW5uaW5nIHN1YnNjcmlwdGlvbnMsIGFueSByZWFkeSBtZXNzYWdlc1xuICAvLyB3ZSB3YW50IHRvIGJ1ZmZlciB1cCBmb3Igd2hlbiB3ZSBhcmUgZG9uZSByZXJ1bm5pbmcgc3Vic2NyaXB0aW9uc1xuICBzZWxmLl9wZW5kaW5nUmVhZHkgPSBbXTtcblxuICAvLyBMaXN0IG9mIGNhbGxiYWNrcyB0byBjYWxsIHdoZW4gdGhpcyBjb25uZWN0aW9uIGlzIGNsb3NlZC5cbiAgc2VsZi5fY2xvc2VDYWxsYmFja3MgPSBbXTtcblxuXG4gIC8vIFhYWCBIQUNLOiBJZiBhIHNvY2tqcyBjb25uZWN0aW9uLCBzYXZlIG9mZiB0aGUgVVJMLiBUaGlzIGlzXG4gIC8vIHRlbXBvcmFyeSBhbmQgd2lsbCBnbyBhd2F5IGluIHRoZSBuZWFyIGZ1dHVyZS5cbiAgc2VsZi5fc29ja2V0VXJsID0gc29ja2V0LnVybDtcblxuICAvLyBBbGxvdyB0ZXN0cyB0byBkaXNhYmxlIHJlc3BvbmRpbmcgdG8gcGluZ3MuXG4gIHNlbGYuX3Jlc3BvbmRUb1BpbmdzID0gb3B0aW9ucy5yZXNwb25kVG9QaW5ncztcblxuICAvLyBUaGlzIG9iamVjdCBpcyB0aGUgcHVibGljIGludGVyZmFjZSB0byB0aGUgc2Vzc2lvbi4gSW4gdGhlIHB1YmxpY1xuICAvLyBBUEksIGl0IGlzIGNhbGxlZCB0aGUgYGNvbm5lY3Rpb25gIG9iamVjdC4gIEludGVybmFsbHkgd2UgY2FsbCBpdFxuICAvLyBhIGBjb25uZWN0aW9uSGFuZGxlYCB0byBhdm9pZCBhbWJpZ3VpdHkuXG4gIHNlbGYuY29ubmVjdGlvbkhhbmRsZSA9IHtcbiAgICBpZDogc2VsZi5pZCxcbiAgICBjbG9zZTogZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5jbG9zZSgpO1xuICAgIH0sXG4gICAgb25DbG9zZTogZnVuY3Rpb24gKGZuKSB7XG4gICAgICB2YXIgY2IgPSBNZXRlb3IuYmluZEVudmlyb25tZW50KGZuLCBcImNvbm5lY3Rpb24gb25DbG9zZSBjYWxsYmFja1wiKTtcbiAgICAgIGlmIChzZWxmLmluUXVldWUpIHtcbiAgICAgICAgc2VsZi5fY2xvc2VDYWxsYmFja3MucHVzaChjYik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpZiB3ZSdyZSBhbHJlYWR5IGNsb3NlZCwgY2FsbCB0aGUgY2FsbGJhY2suXG4gICAgICAgIE1ldGVvci5kZWZlcihjYik7XG4gICAgICB9XG4gICAgfSxcbiAgICBjbGllbnRBZGRyZXNzOiBzZWxmLl9jbGllbnRBZGRyZXNzKCksXG4gICAgaHR0cEhlYWRlcnM6IHNlbGYuc29ja2V0LmhlYWRlcnNcbiAgfTtcblxuICBzZWxmLnNlbmQoeyBtc2c6ICdjb25uZWN0ZWQnLCBzZXNzaW9uOiBzZWxmLmlkIH0pO1xuXG4gIC8vIE9uIGluaXRpYWwgY29ubmVjdCwgc3BpbiB1cCBhbGwgdGhlIHVuaXZlcnNhbCBwdWJsaXNoZXJzLlxuICBGaWJlcihmdW5jdGlvbiAoKSB7XG4gICAgc2VsZi5zdGFydFVuaXZlcnNhbFN1YnMoKTtcbiAgfSkucnVuKCk7XG5cbiAgaWYgKHZlcnNpb24gIT09ICdwcmUxJyAmJiBvcHRpb25zLmhlYXJ0YmVhdEludGVydmFsICE9PSAwKSB7XG4gICAgLy8gV2Ugbm8gbG9uZ2VyIG5lZWQgdGhlIGxvdyBsZXZlbCB0aW1lb3V0IGJlY2F1c2Ugd2UgaGF2ZSBoZWFydGJlYXRpbmcuXG4gICAgc29ja2V0LnNldFdlYnNvY2tldFRpbWVvdXQoMCk7XG5cbiAgICBzZWxmLmhlYXJ0YmVhdCA9IG5ldyBERFBDb21tb24uSGVhcnRiZWF0KHtcbiAgICAgIGhlYXJ0YmVhdEludGVydmFsOiBvcHRpb25zLmhlYXJ0YmVhdEludGVydmFsLFxuICAgICAgaGVhcnRiZWF0VGltZW91dDogb3B0aW9ucy5oZWFydGJlYXRUaW1lb3V0LFxuICAgICAgb25UaW1lb3V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlbGYuY2xvc2UoKTtcbiAgICAgIH0sXG4gICAgICBzZW5kUGluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLnNlbmQoe21zZzogJ3BpbmcnfSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgc2VsZi5oZWFydGJlYXQuc3RhcnQoKTtcbiAgfVxuXG4gIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXSAmJiBQYWNrYWdlWydmYWN0cy1iYXNlJ10uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICBcImxpdmVkYXRhXCIsIFwic2Vzc2lvbnNcIiwgMSk7XG59O1xuXG5fLmV4dGVuZChTZXNzaW9uLnByb3RvdHlwZSwge1xuXG4gIHNlbmRSZWFkeTogZnVuY3Rpb24gKHN1YnNjcmlwdGlvbklkcykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5faXNTZW5kaW5nKVxuICAgICAgc2VsZi5zZW5kKHttc2c6IFwicmVhZHlcIiwgc3Viczogc3Vic2NyaXB0aW9uSWRzfSk7XG4gICAgZWxzZSB7XG4gICAgICBfLmVhY2goc3Vic2NyaXB0aW9uSWRzLCBmdW5jdGlvbiAoc3Vic2NyaXB0aW9uSWQpIHtcbiAgICAgICAgc2VsZi5fcGVuZGluZ1JlYWR5LnB1c2goc3Vic2NyaXB0aW9uSWQpO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIHNlbmRBZGRlZDogZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBpZCwgZmllbGRzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9pc1NlbmRpbmcpXG4gICAgICBzZWxmLnNlbmQoe21zZzogXCJhZGRlZFwiLCBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZSwgaWQ6IGlkLCBmaWVsZHM6IGZpZWxkc30pO1xuICB9LFxuXG4gIHNlbmRDaGFuZ2VkOiBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIGlkLCBmaWVsZHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKF8uaXNFbXB0eShmaWVsZHMpKVxuICAgICAgcmV0dXJuO1xuXG4gICAgaWYgKHNlbGYuX2lzU2VuZGluZykge1xuICAgICAgc2VsZi5zZW5kKHtcbiAgICAgICAgbXNnOiBcImNoYW5nZWRcIixcbiAgICAgICAgY29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWUsXG4gICAgICAgIGlkOiBpZCxcbiAgICAgICAgZmllbGRzOiBmaWVsZHNcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBzZW5kUmVtb3ZlZDogZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBpZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5faXNTZW5kaW5nKVxuICAgICAgc2VsZi5zZW5kKHttc2c6IFwicmVtb3ZlZFwiLCBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZSwgaWQ6IGlkfSk7XG4gIH0sXG5cbiAgZ2V0U2VuZENhbGxiYWNrczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4ge1xuICAgICAgYWRkZWQ6IF8uYmluZChzZWxmLnNlbmRBZGRlZCwgc2VsZiksXG4gICAgICBjaGFuZ2VkOiBfLmJpbmQoc2VsZi5zZW5kQ2hhbmdlZCwgc2VsZiksXG4gICAgICByZW1vdmVkOiBfLmJpbmQoc2VsZi5zZW5kUmVtb3ZlZCwgc2VsZilcbiAgICB9O1xuICB9LFxuXG4gIGdldENvbGxlY3Rpb25WaWV3OiBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKF8uaGFzKHNlbGYuY29sbGVjdGlvblZpZXdzLCBjb2xsZWN0aW9uTmFtZSkpIHtcbiAgICAgIHJldHVybiBzZWxmLmNvbGxlY3Rpb25WaWV3c1tjb2xsZWN0aW9uTmFtZV07XG4gICAgfVxuICAgIHZhciByZXQgPSBuZXcgU2Vzc2lvbkNvbGxlY3Rpb25WaWV3KGNvbGxlY3Rpb25OYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZ2V0U2VuZENhbGxiYWNrcygpKTtcbiAgICBzZWxmLmNvbGxlY3Rpb25WaWV3c1tjb2xsZWN0aW9uTmFtZV0gPSByZXQ7XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcblxuICBhZGRlZDogZnVuY3Rpb24gKHN1YnNjcmlwdGlvbkhhbmRsZSwgY29sbGVjdGlvbk5hbWUsIGlkLCBmaWVsZHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHZpZXcgPSBzZWxmLmdldENvbGxlY3Rpb25WaWV3KGNvbGxlY3Rpb25OYW1lKTtcbiAgICB2aWV3LmFkZGVkKHN1YnNjcmlwdGlvbkhhbmRsZSwgaWQsIGZpZWxkcyk7XG4gIH0sXG5cbiAgcmVtb3ZlZDogZnVuY3Rpb24gKHN1YnNjcmlwdGlvbkhhbmRsZSwgY29sbGVjdGlvbk5hbWUsIGlkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB2aWV3ID0gc2VsZi5nZXRDb2xsZWN0aW9uVmlldyhjb2xsZWN0aW9uTmFtZSk7XG4gICAgdmlldy5yZW1vdmVkKHN1YnNjcmlwdGlvbkhhbmRsZSwgaWQpO1xuICAgIGlmICh2aWV3LmlzRW1wdHkoKSkge1xuICAgICAgZGVsZXRlIHNlbGYuY29sbGVjdGlvblZpZXdzW2NvbGxlY3Rpb25OYW1lXTtcbiAgICB9XG4gIH0sXG5cbiAgY2hhbmdlZDogZnVuY3Rpb24gKHN1YnNjcmlwdGlvbkhhbmRsZSwgY29sbGVjdGlvbk5hbWUsIGlkLCBmaWVsZHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHZpZXcgPSBzZWxmLmdldENvbGxlY3Rpb25WaWV3KGNvbGxlY3Rpb25OYW1lKTtcbiAgICB2aWV3LmNoYW5nZWQoc3Vic2NyaXB0aW9uSGFuZGxlLCBpZCwgZmllbGRzKTtcbiAgfSxcblxuICBzdGFydFVuaXZlcnNhbFN1YnM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gTWFrZSBhIHNoYWxsb3cgY29weSBvZiB0aGUgc2V0IG9mIHVuaXZlcnNhbCBoYW5kbGVycyBhbmQgc3RhcnQgdGhlbS4gSWZcbiAgICAvLyBhZGRpdGlvbmFsIHVuaXZlcnNhbCBwdWJsaXNoZXJzIHN0YXJ0IHdoaWxlIHdlJ3JlIHJ1bm5pbmcgdGhlbSAoZHVlIHRvXG4gICAgLy8geWllbGRpbmcpLCB0aGV5IHdpbGwgcnVuIHNlcGFyYXRlbHkgYXMgcGFydCBvZiBTZXJ2ZXIucHVibGlzaC5cbiAgICB2YXIgaGFuZGxlcnMgPSBfLmNsb25lKHNlbGYuc2VydmVyLnVuaXZlcnNhbF9wdWJsaXNoX2hhbmRsZXJzKTtcbiAgICBfLmVhY2goaGFuZGxlcnMsIGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICBzZWxmLl9zdGFydFN1YnNjcmlwdGlvbihoYW5kbGVyKTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBEZXN0cm95IHRoaXMgc2Vzc2lvbiBhbmQgdW5yZWdpc3RlciBpdCBhdCB0aGUgc2VydmVyLlxuICBjbG9zZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIERlc3Ryb3kgdGhpcyBzZXNzaW9uLCBldmVuIGlmIGl0J3Mgbm90IHJlZ2lzdGVyZWQgYXQgdGhlXG4gICAgLy8gc2VydmVyLiBTdG9wIGFsbCBwcm9jZXNzaW5nIGFuZCB0ZWFyIGV2ZXJ5dGhpbmcgZG93bi4gSWYgYSBzb2NrZXRcbiAgICAvLyB3YXMgYXR0YWNoZWQsIGNsb3NlIGl0LlxuXG4gICAgLy8gQWxyZWFkeSBkZXN0cm95ZWQuXG4gICAgaWYgKCEgc2VsZi5pblF1ZXVlKVxuICAgICAgcmV0dXJuO1xuXG4gICAgLy8gRHJvcCB0aGUgbWVyZ2UgYm94IGRhdGEgaW1tZWRpYXRlbHkuXG4gICAgc2VsZi5pblF1ZXVlID0gbnVsbDtcbiAgICBzZWxmLmNvbGxlY3Rpb25WaWV3cyA9IHt9O1xuXG4gICAgaWYgKHNlbGYuaGVhcnRiZWF0KSB7XG4gICAgICBzZWxmLmhlYXJ0YmVhdC5zdG9wKCk7XG4gICAgICBzZWxmLmhlYXJ0YmVhdCA9IG51bGw7XG4gICAgfVxuXG4gICAgaWYgKHNlbGYuc29ja2V0KSB7XG4gICAgICBzZWxmLnNvY2tldC5jbG9zZSgpO1xuICAgICAgc2VsZi5zb2NrZXQuX21ldGVvclNlc3Npb24gPSBudWxsO1xuICAgIH1cblxuICAgIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXSAmJiBQYWNrYWdlWydmYWN0cy1iYXNlJ10uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgIFwibGl2ZWRhdGFcIiwgXCJzZXNzaW9uc1wiLCAtMSk7XG5cbiAgICBNZXRlb3IuZGVmZXIoZnVuY3Rpb24gKCkge1xuICAgICAgLy8gc3RvcCBjYWxsYmFja3MgY2FuIHlpZWxkLCBzbyB3ZSBkZWZlciB0aGlzIG9uIGNsb3NlLlxuICAgICAgLy8gc3ViLl9pc0RlYWN0aXZhdGVkKCkgZGV0ZWN0cyB0aGF0IHdlIHNldCBpblF1ZXVlIHRvIG51bGwgYW5kXG4gICAgICAvLyB0cmVhdHMgaXQgYXMgc2VtaS1kZWFjdGl2YXRlZCAoaXQgd2lsbCBpZ25vcmUgaW5jb21pbmcgY2FsbGJhY2tzLCBldGMpLlxuICAgICAgc2VsZi5fZGVhY3RpdmF0ZUFsbFN1YnNjcmlwdGlvbnMoKTtcblxuICAgICAgLy8gRGVmZXIgY2FsbGluZyB0aGUgY2xvc2UgY2FsbGJhY2tzLCBzbyB0aGF0IHRoZSBjYWxsZXIgY2xvc2luZ1xuICAgICAgLy8gdGhlIHNlc3Npb24gaXNuJ3Qgd2FpdGluZyBmb3IgYWxsIHRoZSBjYWxsYmFja3MgdG8gY29tcGxldGUuXG4gICAgICBfLmVhY2goc2VsZi5fY2xvc2VDYWxsYmFja3MsIGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBVbnJlZ2lzdGVyIHRoZSBzZXNzaW9uLlxuICAgIHNlbGYuc2VydmVyLl9yZW1vdmVTZXNzaW9uKHNlbGYpO1xuICB9LFxuXG4gIC8vIFNlbmQgYSBtZXNzYWdlIChkb2luZyBub3RoaW5nIGlmIG5vIHNvY2tldCBpcyBjb25uZWN0ZWQgcmlnaHQgbm93LilcbiAgLy8gSXQgc2hvdWxkIGJlIGEgSlNPTiBvYmplY3QgKGl0IHdpbGwgYmUgc3RyaW5naWZpZWQuKVxuICBzZW5kOiBmdW5jdGlvbiAobXNnKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLnNvY2tldCkge1xuICAgICAgaWYgKE1ldGVvci5fcHJpbnRTZW50RERQKVxuICAgICAgICBNZXRlb3IuX2RlYnVnKFwiU2VudCBERFBcIiwgRERQQ29tbW9uLnN0cmluZ2lmeUREUChtc2cpKTtcbiAgICAgIHNlbGYuc29ja2V0LnNlbmQoRERQQ29tbW9uLnN0cmluZ2lmeUREUChtc2cpKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gU2VuZCBhIGNvbm5lY3Rpb24gZXJyb3IuXG4gIHNlbmRFcnJvcjogZnVuY3Rpb24gKHJlYXNvbiwgb2ZmZW5kaW5nTWVzc2FnZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgbXNnID0ge21zZzogJ2Vycm9yJywgcmVhc29uOiByZWFzb259O1xuICAgIGlmIChvZmZlbmRpbmdNZXNzYWdlKVxuICAgICAgbXNnLm9mZmVuZGluZ01lc3NhZ2UgPSBvZmZlbmRpbmdNZXNzYWdlO1xuICAgIHNlbGYuc2VuZChtc2cpO1xuICB9LFxuXG4gIC8vIFByb2Nlc3MgJ21zZycgYXMgYW4gaW5jb21pbmcgbWVzc2FnZS4gKEJ1dCBhcyBhIGd1YXJkIGFnYWluc3RcbiAgLy8gcmFjZSBjb25kaXRpb25zIGR1cmluZyByZWNvbm5lY3Rpb24sIGlnbm9yZSB0aGUgbWVzc2FnZSBpZlxuICAvLyAnc29ja2V0JyBpcyBub3QgdGhlIGN1cnJlbnRseSBjb25uZWN0ZWQgc29ja2V0LilcbiAgLy9cbiAgLy8gV2UgcnVuIHRoZSBtZXNzYWdlcyBmcm9tIHRoZSBjbGllbnQgb25lIGF0IGEgdGltZSwgaW4gdGhlIG9yZGVyXG4gIC8vIGdpdmVuIGJ5IHRoZSBjbGllbnQuIFRoZSBtZXNzYWdlIGhhbmRsZXIgaXMgcGFzc2VkIGFuIGlkZW1wb3RlbnRcbiAgLy8gZnVuY3Rpb24gJ3VuYmxvY2snIHdoaWNoIGl0IG1heSBjYWxsIHRvIGFsbG93IG90aGVyIG1lc3NhZ2VzIHRvXG4gIC8vIGJlZ2luIHJ1bm5pbmcgaW4gcGFyYWxsZWwgaW4gYW5vdGhlciBmaWJlciAoZm9yIGV4YW1wbGUsIGEgbWV0aG9kXG4gIC8vIHRoYXQgd2FudHMgdG8geWllbGQuKSBPdGhlcndpc2UsIGl0IGlzIGF1dG9tYXRpY2FsbHkgdW5ibG9ja2VkXG4gIC8vIHdoZW4gaXQgcmV0dXJucy5cbiAgLy9cbiAgLy8gQWN0dWFsbHksIHdlIGRvbid0IGhhdmUgdG8gJ3RvdGFsbHkgb3JkZXInIHRoZSBtZXNzYWdlcyBpbiB0aGlzXG4gIC8vIHdheSwgYnV0IGl0J3MgdGhlIGVhc2llc3QgdGhpbmcgdGhhdCdzIGNvcnJlY3QuICh1bnN1YiBuZWVkcyB0b1xuICAvLyBiZSBvcmRlcmVkIGFnYWluc3Qgc3ViLCBtZXRob2RzIG5lZWQgdG8gYmUgb3JkZXJlZCBhZ2FpbnN0IGVhY2hcbiAgLy8gb3RoZXIuKVxuICBwcm9jZXNzTWVzc2FnZTogZnVuY3Rpb24gKG1zZ19pbikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIXNlbGYuaW5RdWV1ZSkgLy8gd2UgaGF2ZSBiZWVuIGRlc3Ryb3llZC5cbiAgICAgIHJldHVybjtcblxuICAgIC8vIFJlc3BvbmQgdG8gcGluZyBhbmQgcG9uZyBtZXNzYWdlcyBpbW1lZGlhdGVseSB3aXRob3V0IHF1ZXVpbmcuXG4gICAgLy8gSWYgdGhlIG5lZ290aWF0ZWQgRERQIHZlcnNpb24gaXMgXCJwcmUxXCIgd2hpY2ggZGlkbid0IHN1cHBvcnRcbiAgICAvLyBwaW5ncywgcHJlc2VydmUgdGhlIFwicHJlMVwiIGJlaGF2aW9yIG9mIHJlc3BvbmRpbmcgd2l0aCBhIFwiYmFkXG4gICAgLy8gcmVxdWVzdFwiIGZvciB0aGUgdW5rbm93biBtZXNzYWdlcy5cbiAgICAvL1xuICAgIC8vIEZpYmVycyBhcmUgbmVlZGVkIGJlY2F1c2UgaGVhcnRiZWF0IHVzZXMgTWV0ZW9yLnNldFRpbWVvdXQsIHdoaWNoXG4gICAgLy8gbmVlZHMgYSBGaWJlci4gV2UgY291bGQgYWN0dWFsbHkgdXNlIHJlZ3VsYXIgc2V0VGltZW91dCBhbmQgYXZvaWRcbiAgICAvLyB0aGVzZSBuZXcgZmliZXJzLCBidXQgaXQgaXMgZWFzaWVyIHRvIGp1c3QgbWFrZSBldmVyeXRoaW5nIHVzZVxuICAgIC8vIE1ldGVvci5zZXRUaW1lb3V0IGFuZCBub3QgdGhpbmsgdG9vIGhhcmQuXG4gICAgLy9cbiAgICAvLyBBbnkgbWVzc2FnZSBjb3VudHMgYXMgcmVjZWl2aW5nIGEgcG9uZywgYXMgaXQgZGVtb25zdHJhdGVzIHRoYXRcbiAgICAvLyB0aGUgY2xpZW50IGlzIHN0aWxsIGFsaXZlLlxuICAgIGlmIChzZWxmLmhlYXJ0YmVhdCkge1xuICAgICAgRmliZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLmhlYXJ0YmVhdC5tZXNzYWdlUmVjZWl2ZWQoKTtcbiAgICAgIH0pLnJ1bigpO1xuICAgIH1cblxuICAgIGlmIChzZWxmLnZlcnNpb24gIT09ICdwcmUxJyAmJiBtc2dfaW4ubXNnID09PSAncGluZycpIHtcbiAgICAgIGlmIChzZWxmLl9yZXNwb25kVG9QaW5ncylcbiAgICAgICAgc2VsZi5zZW5kKHttc2c6IFwicG9uZ1wiLCBpZDogbXNnX2luLmlkfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChzZWxmLnZlcnNpb24gIT09ICdwcmUxJyAmJiBtc2dfaW4ubXNnID09PSAncG9uZycpIHtcbiAgICAgIC8vIFNpbmNlIGV2ZXJ5dGhpbmcgaXMgYSBwb25nLCBub3RoaW5nIHRvIGRvXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2VsZi5pblF1ZXVlLnB1c2gobXNnX2luKTtcbiAgICBpZiAoc2VsZi53b3JrZXJSdW5uaW5nKVxuICAgICAgcmV0dXJuO1xuICAgIHNlbGYud29ya2VyUnVubmluZyA9IHRydWU7XG5cbiAgICB2YXIgcHJvY2Vzc05leHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgbXNnID0gc2VsZi5pblF1ZXVlICYmIHNlbGYuaW5RdWV1ZS5zaGlmdCgpO1xuICAgICAgaWYgKCFtc2cpIHtcbiAgICAgICAgc2VsZi53b3JrZXJSdW5uaW5nID0gZmFsc2U7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgRmliZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgYmxvY2tlZCA9IHRydWU7XG5cbiAgICAgICAgdmFyIHVuYmxvY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKCFibG9ja2VkKVxuICAgICAgICAgICAgcmV0dXJuOyAvLyBpZGVtcG90ZW50XG4gICAgICAgICAgYmxvY2tlZCA9IGZhbHNlO1xuICAgICAgICAgIHByb2Nlc3NOZXh0KCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc2VsZi5zZXJ2ZXIub25NZXNzYWdlSG9vay5lYWNoKGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICAgIGNhbGxiYWNrKG1zZywgc2VsZik7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChfLmhhcyhzZWxmLnByb3RvY29sX2hhbmRsZXJzLCBtc2cubXNnKSlcbiAgICAgICAgICBzZWxmLnByb3RvY29sX2hhbmRsZXJzW21zZy5tc2ddLmNhbGwoc2VsZiwgbXNnLCB1bmJsb2NrKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNlbGYuc2VuZEVycm9yKCdCYWQgcmVxdWVzdCcsIG1zZyk7XG4gICAgICAgIHVuYmxvY2soKTsgLy8gaW4gY2FzZSB0aGUgaGFuZGxlciBkaWRuJ3QgYWxyZWFkeSBkbyBpdFxuICAgICAgfSkucnVuKCk7XG4gICAgfTtcblxuICAgIHByb2Nlc3NOZXh0KCk7XG4gIH0sXG5cbiAgcHJvdG9jb2xfaGFuZGxlcnM6IHtcbiAgICBzdWI6IGZ1bmN0aW9uIChtc2cpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgLy8gcmVqZWN0IG1hbGZvcm1lZCBtZXNzYWdlc1xuICAgICAgaWYgKHR5cGVvZiAobXNnLmlkKSAhPT0gXCJzdHJpbmdcIiB8fFxuICAgICAgICAgIHR5cGVvZiAobXNnLm5hbWUpICE9PSBcInN0cmluZ1wiIHx8XG4gICAgICAgICAgKCgncGFyYW1zJyBpbiBtc2cpICYmICEobXNnLnBhcmFtcyBpbnN0YW5jZW9mIEFycmF5KSkpIHtcbiAgICAgICAgc2VsZi5zZW5kRXJyb3IoXCJNYWxmb3JtZWQgc3Vic2NyaXB0aW9uXCIsIG1zZyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKCFzZWxmLnNlcnZlci5wdWJsaXNoX2hhbmRsZXJzW21zZy5uYW1lXSkge1xuICAgICAgICBzZWxmLnNlbmQoe1xuICAgICAgICAgIG1zZzogJ25vc3ViJywgaWQ6IG1zZy5pZCxcbiAgICAgICAgICBlcnJvcjogbmV3IE1ldGVvci5FcnJvcig0MDQsIGBTdWJzY3JpcHRpb24gJyR7bXNnLm5hbWV9JyBub3QgZm91bmRgKX0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChfLmhhcyhzZWxmLl9uYW1lZFN1YnMsIG1zZy5pZCkpXG4gICAgICAgIC8vIHN1YnMgYXJlIGlkZW1wb3RlbnQsIG9yIHJhdGhlciwgdGhleSBhcmUgaWdub3JlZCBpZiBhIHN1YlxuICAgICAgICAvLyB3aXRoIHRoYXQgaWQgYWxyZWFkeSBleGlzdHMuIHRoaXMgaXMgaW1wb3J0YW50IGR1cmluZ1xuICAgICAgICAvLyByZWNvbm5lY3QuXG4gICAgICAgIHJldHVybjtcblxuICAgICAgLy8gWFhYIEl0J2QgYmUgbXVjaCBiZXR0ZXIgaWYgd2UgaGFkIGdlbmVyaWMgaG9va3Mgd2hlcmUgYW55IHBhY2thZ2UgY2FuXG4gICAgICAvLyBob29rIGludG8gc3Vic2NyaXB0aW9uIGhhbmRsaW5nLCBidXQgaW4gdGhlIG1lYW4gd2hpbGUgd2Ugc3BlY2lhbCBjYXNlXG4gICAgICAvLyBkZHAtcmF0ZS1saW1pdGVyIHBhY2thZ2UuIFRoaXMgaXMgYWxzbyBkb25lIGZvciB3ZWFrIHJlcXVpcmVtZW50cyB0b1xuICAgICAgLy8gYWRkIHRoZSBkZHAtcmF0ZS1saW1pdGVyIHBhY2thZ2UgaW4gY2FzZSB3ZSBkb24ndCBoYXZlIEFjY291bnRzLiBBXG4gICAgICAvLyB1c2VyIHRyeWluZyB0byB1c2UgdGhlIGRkcC1yYXRlLWxpbWl0ZXIgbXVzdCBleHBsaWNpdGx5IHJlcXVpcmUgaXQuXG4gICAgICBpZiAoUGFja2FnZVsnZGRwLXJhdGUtbGltaXRlciddKSB7XG4gICAgICAgIHZhciBERFBSYXRlTGltaXRlciA9IFBhY2thZ2VbJ2RkcC1yYXRlLWxpbWl0ZXInXS5ERFBSYXRlTGltaXRlcjtcbiAgICAgICAgdmFyIHJhdGVMaW1pdGVySW5wdXQgPSB7XG4gICAgICAgICAgdXNlcklkOiBzZWxmLnVzZXJJZCxcbiAgICAgICAgICBjbGllbnRBZGRyZXNzOiBzZWxmLmNvbm5lY3Rpb25IYW5kbGUuY2xpZW50QWRkcmVzcyxcbiAgICAgICAgICB0eXBlOiBcInN1YnNjcmlwdGlvblwiLFxuICAgICAgICAgIG5hbWU6IG1zZy5uYW1lLFxuICAgICAgICAgIGNvbm5lY3Rpb25JZDogc2VsZi5pZFxuICAgICAgICB9O1xuXG4gICAgICAgIEREUFJhdGVMaW1pdGVyLl9pbmNyZW1lbnQocmF0ZUxpbWl0ZXJJbnB1dCk7XG4gICAgICAgIHZhciByYXRlTGltaXRSZXN1bHQgPSBERFBSYXRlTGltaXRlci5fY2hlY2socmF0ZUxpbWl0ZXJJbnB1dCk7XG4gICAgICAgIGlmICghcmF0ZUxpbWl0UmVzdWx0LmFsbG93ZWQpIHtcbiAgICAgICAgICBzZWxmLnNlbmQoe1xuICAgICAgICAgICAgbXNnOiAnbm9zdWInLCBpZDogbXNnLmlkLFxuICAgICAgICAgICAgZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoXG4gICAgICAgICAgICAgICd0b28tbWFueS1yZXF1ZXN0cycsXG4gICAgICAgICAgICAgIEREUFJhdGVMaW1pdGVyLmdldEVycm9yTWVzc2FnZShyYXRlTGltaXRSZXN1bHQpLFxuICAgICAgICAgICAgICB7dGltZVRvUmVzZXQ6IHJhdGVMaW1pdFJlc3VsdC50aW1lVG9SZXNldH0pXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciBoYW5kbGVyID0gc2VsZi5zZXJ2ZXIucHVibGlzaF9oYW5kbGVyc1ttc2cubmFtZV07XG5cbiAgICAgIHNlbGYuX3N0YXJ0U3Vic2NyaXB0aW9uKGhhbmRsZXIsIG1zZy5pZCwgbXNnLnBhcmFtcywgbXNnLm5hbWUpO1xuXG4gICAgfSxcblxuICAgIHVuc3ViOiBmdW5jdGlvbiAobXNnKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIHNlbGYuX3N0b3BTdWJzY3JpcHRpb24obXNnLmlkKTtcbiAgICB9LFxuXG4gICAgbWV0aG9kOiBmdW5jdGlvbiAobXNnLCB1bmJsb2NrKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIC8vIHJlamVjdCBtYWxmb3JtZWQgbWVzc2FnZXNcbiAgICAgIC8vIEZvciBub3csIHdlIHNpbGVudGx5IGlnbm9yZSB1bmtub3duIGF0dHJpYnV0ZXMsXG4gICAgICAvLyBmb3IgZm9yd2FyZHMgY29tcGF0aWJpbGl0eS5cbiAgICAgIGlmICh0eXBlb2YgKG1zZy5pZCkgIT09IFwic3RyaW5nXCIgfHxcbiAgICAgICAgICB0eXBlb2YgKG1zZy5tZXRob2QpICE9PSBcInN0cmluZ1wiIHx8XG4gICAgICAgICAgKCgncGFyYW1zJyBpbiBtc2cpICYmICEobXNnLnBhcmFtcyBpbnN0YW5jZW9mIEFycmF5KSkgfHxcbiAgICAgICAgICAoKCdyYW5kb21TZWVkJyBpbiBtc2cpICYmICh0eXBlb2YgbXNnLnJhbmRvbVNlZWQgIT09IFwic3RyaW5nXCIpKSkge1xuICAgICAgICBzZWxmLnNlbmRFcnJvcihcIk1hbGZvcm1lZCBtZXRob2QgaW52b2NhdGlvblwiLCBtc2cpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciByYW5kb21TZWVkID0gbXNnLnJhbmRvbVNlZWQgfHwgbnVsbDtcblxuICAgICAgLy8gc2V0IHVwIHRvIG1hcmsgdGhlIG1ldGhvZCBhcyBzYXRpc2ZpZWQgb25jZSBhbGwgb2JzZXJ2ZXJzXG4gICAgICAvLyAoYW5kIHN1YnNjcmlwdGlvbnMpIGhhdmUgcmVhY3RlZCB0byBhbnkgd3JpdGVzIHRoYXQgd2VyZVxuICAgICAgLy8gZG9uZS5cbiAgICAgIHZhciBmZW5jZSA9IG5ldyBERFBTZXJ2ZXIuX1dyaXRlRmVuY2U7XG4gICAgICBmZW5jZS5vbkFsbENvbW1pdHRlZChmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIFJldGlyZSB0aGUgZmVuY2Ugc28gdGhhdCBmdXR1cmUgd3JpdGVzIGFyZSBhbGxvd2VkLlxuICAgICAgICAvLyBUaGlzIG1lYW5zIHRoYXQgY2FsbGJhY2tzIGxpa2UgdGltZXJzIGFyZSBmcmVlIHRvIHVzZVxuICAgICAgICAvLyB0aGUgZmVuY2UsIGFuZCBpZiB0aGV5IGZpcmUgYmVmb3JlIGl0J3MgYXJtZWQgKGZvclxuICAgICAgICAvLyBleGFtcGxlLCBiZWNhdXNlIHRoZSBtZXRob2Qgd2FpdHMgZm9yIHRoZW0pIHRoZWlyXG4gICAgICAgIC8vIHdyaXRlcyB3aWxsIGJlIGluY2x1ZGVkIGluIHRoZSBmZW5jZS5cbiAgICAgICAgZmVuY2UucmV0aXJlKCk7XG4gICAgICAgIHNlbGYuc2VuZCh7XG4gICAgICAgICAgbXNnOiAndXBkYXRlZCcsIG1ldGhvZHM6IFttc2cuaWRdfSk7XG4gICAgICB9KTtcblxuICAgICAgLy8gZmluZCB0aGUgaGFuZGxlclxuICAgICAgdmFyIGhhbmRsZXIgPSBzZWxmLnNlcnZlci5tZXRob2RfaGFuZGxlcnNbbXNnLm1ldGhvZF07XG4gICAgICBpZiAoIWhhbmRsZXIpIHtcbiAgICAgICAgc2VsZi5zZW5kKHtcbiAgICAgICAgICBtc2c6ICdyZXN1bHQnLCBpZDogbXNnLmlkLFxuICAgICAgICAgIGVycm9yOiBuZXcgTWV0ZW9yLkVycm9yKDQwNCwgYE1ldGhvZCAnJHttc2cubWV0aG9kfScgbm90IGZvdW5kYCl9KTtcbiAgICAgICAgZmVuY2UuYXJtKCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHNldFVzZXJJZCA9IGZ1bmN0aW9uKHVzZXJJZCkge1xuICAgICAgICBzZWxmLl9zZXRVc2VySWQodXNlcklkKTtcbiAgICAgIH07XG5cbiAgICAgIHZhciBpbnZvY2F0aW9uID0gbmV3IEREUENvbW1vbi5NZXRob2RJbnZvY2F0aW9uKHtcbiAgICAgICAgaXNTaW11bGF0aW9uOiBmYWxzZSxcbiAgICAgICAgdXNlcklkOiBzZWxmLnVzZXJJZCxcbiAgICAgICAgc2V0VXNlcklkOiBzZXRVc2VySWQsXG4gICAgICAgIHVuYmxvY2s6IHVuYmxvY2ssXG4gICAgICAgIGNvbm5lY3Rpb246IHNlbGYuY29ubmVjdGlvbkhhbmRsZSxcbiAgICAgICAgcmFuZG9tU2VlZDogcmFuZG9tU2VlZFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIC8vIFhYWCBJdCdkIGJlIGJldHRlciBpZiB3ZSBjb3VsZCBob29rIGludG8gbWV0aG9kIGhhbmRsZXJzIGJldHRlciBidXRcbiAgICAgICAgLy8gZm9yIG5vdywgd2UgbmVlZCB0byBjaGVjayBpZiB0aGUgZGRwLXJhdGUtbGltaXRlciBleGlzdHMgc2luY2Ugd2VcbiAgICAgICAgLy8gaGF2ZSBhIHdlYWsgcmVxdWlyZW1lbnQgZm9yIHRoZSBkZHAtcmF0ZS1saW1pdGVyIHBhY2thZ2UgdG8gYmUgYWRkZWRcbiAgICAgICAgLy8gdG8gb3VyIGFwcGxpY2F0aW9uLlxuICAgICAgICBpZiAoUGFja2FnZVsnZGRwLXJhdGUtbGltaXRlciddKSB7XG4gICAgICAgICAgdmFyIEREUFJhdGVMaW1pdGVyID0gUGFja2FnZVsnZGRwLXJhdGUtbGltaXRlciddLkREUFJhdGVMaW1pdGVyO1xuICAgICAgICAgIHZhciByYXRlTGltaXRlcklucHV0ID0ge1xuICAgICAgICAgICAgdXNlcklkOiBzZWxmLnVzZXJJZCxcbiAgICAgICAgICAgIGNsaWVudEFkZHJlc3M6IHNlbGYuY29ubmVjdGlvbkhhbmRsZS5jbGllbnRBZGRyZXNzLFxuICAgICAgICAgICAgdHlwZTogXCJtZXRob2RcIixcbiAgICAgICAgICAgIG5hbWU6IG1zZy5tZXRob2QsXG4gICAgICAgICAgICBjb25uZWN0aW9uSWQ6IHNlbGYuaWRcbiAgICAgICAgICB9O1xuICAgICAgICAgIEREUFJhdGVMaW1pdGVyLl9pbmNyZW1lbnQocmF0ZUxpbWl0ZXJJbnB1dCk7XG4gICAgICAgICAgdmFyIHJhdGVMaW1pdFJlc3VsdCA9IEREUFJhdGVMaW1pdGVyLl9jaGVjayhyYXRlTGltaXRlcklucHV0KVxuICAgICAgICAgIGlmICghcmF0ZUxpbWl0UmVzdWx0LmFsbG93ZWQpIHtcbiAgICAgICAgICAgIHJlamVjdChuZXcgTWV0ZW9yLkVycm9yKFxuICAgICAgICAgICAgICBcInRvby1tYW55LXJlcXVlc3RzXCIsXG4gICAgICAgICAgICAgIEREUFJhdGVMaW1pdGVyLmdldEVycm9yTWVzc2FnZShyYXRlTGltaXRSZXN1bHQpLFxuICAgICAgICAgICAgICB7dGltZVRvUmVzZXQ6IHJhdGVMaW1pdFJlc3VsdC50aW1lVG9SZXNldH1cbiAgICAgICAgICAgICkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJlc29sdmUoRERQU2VydmVyLl9DdXJyZW50V3JpdGVGZW5jZS53aXRoVmFsdWUoXG4gICAgICAgICAgZmVuY2UsXG4gICAgICAgICAgKCkgPT4gRERQLl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbi53aXRoVmFsdWUoXG4gICAgICAgICAgICBpbnZvY2F0aW9uLFxuICAgICAgICAgICAgKCkgPT4gbWF5YmVBdWRpdEFyZ3VtZW50Q2hlY2tzKFxuICAgICAgICAgICAgICBoYW5kbGVyLCBpbnZvY2F0aW9uLCBtc2cucGFyYW1zLFxuICAgICAgICAgICAgICBcImNhbGwgdG8gJ1wiICsgbXNnLm1ldGhvZCArIFwiJ1wiXG4gICAgICAgICAgICApXG4gICAgICAgICAgKVxuICAgICAgICApKTtcbiAgICAgIH0pO1xuXG4gICAgICBmdW5jdGlvbiBmaW5pc2goKSB7XG4gICAgICAgIGZlbmNlLmFybSgpO1xuICAgICAgICB1bmJsb2NrKCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHBheWxvYWQgPSB7XG4gICAgICAgIG1zZzogXCJyZXN1bHRcIixcbiAgICAgICAgaWQ6IG1zZy5pZFxuICAgICAgfTtcblxuICAgICAgcHJvbWlzZS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgZmluaXNoKCk7XG4gICAgICAgIGlmIChyZXN1bHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHBheWxvYWQucmVzdWx0ID0gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIHNlbGYuc2VuZChwYXlsb2FkKTtcbiAgICAgIH0sIChleGNlcHRpb24pID0+IHtcbiAgICAgICAgZmluaXNoKCk7XG4gICAgICAgIHBheWxvYWQuZXJyb3IgPSB3cmFwSW50ZXJuYWxFeGNlcHRpb24oXG4gICAgICAgICAgZXhjZXB0aW9uLFxuICAgICAgICAgIGB3aGlsZSBpbnZva2luZyBtZXRob2QgJyR7bXNnLm1ldGhvZH0nYFxuICAgICAgICApO1xuICAgICAgICBzZWxmLnNlbmQocGF5bG9hZCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgX2VhY2hTdWI6IGZ1bmN0aW9uIChmKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIF8uZWFjaChzZWxmLl9uYW1lZFN1YnMsIGYpO1xuICAgIF8uZWFjaChzZWxmLl91bml2ZXJzYWxTdWJzLCBmKTtcbiAgfSxcblxuICBfZGlmZkNvbGxlY3Rpb25WaWV3czogZnVuY3Rpb24gKGJlZm9yZUNWcykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBEaWZmU2VxdWVuY2UuZGlmZk9iamVjdHMoYmVmb3JlQ1ZzLCBzZWxmLmNvbGxlY3Rpb25WaWV3cywge1xuICAgICAgYm90aDogZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBsZWZ0VmFsdWUsIHJpZ2h0VmFsdWUpIHtcbiAgICAgICAgcmlnaHRWYWx1ZS5kaWZmKGxlZnRWYWx1ZSk7XG4gICAgICB9LFxuICAgICAgcmlnaHRPbmx5OiBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIHJpZ2h0VmFsdWUpIHtcbiAgICAgICAgXy5lYWNoKHJpZ2h0VmFsdWUuZG9jdW1lbnRzLCBmdW5jdGlvbiAoZG9jVmlldywgaWQpIHtcbiAgICAgICAgICBzZWxmLnNlbmRBZGRlZChjb2xsZWN0aW9uTmFtZSwgaWQsIGRvY1ZpZXcuZ2V0RmllbGRzKCkpO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICBsZWZ0T25seTogZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBsZWZ0VmFsdWUpIHtcbiAgICAgICAgXy5lYWNoKGxlZnRWYWx1ZS5kb2N1bWVudHMsIGZ1bmN0aW9uIChkb2MsIGlkKSB7XG4gICAgICAgICAgc2VsZi5zZW5kUmVtb3ZlZChjb2xsZWN0aW9uTmFtZSwgaWQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvLyBTZXRzIHRoZSBjdXJyZW50IHVzZXIgaWQgaW4gYWxsIGFwcHJvcHJpYXRlIGNvbnRleHRzIGFuZCByZXJ1bnNcbiAgLy8gYWxsIHN1YnNjcmlwdGlvbnNcbiAgX3NldFVzZXJJZDogZnVuY3Rpb24odXNlcklkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHVzZXJJZCAhPT0gbnVsbCAmJiB0eXBlb2YgdXNlcklkICE9PSBcInN0cmluZ1wiKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwic2V0VXNlcklkIG11c3QgYmUgY2FsbGVkIG9uIHN0cmluZyBvciBudWxsLCBub3QgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIHR5cGVvZiB1c2VySWQpO1xuXG4gICAgLy8gUHJldmVudCBuZXdseS1jcmVhdGVkIHVuaXZlcnNhbCBzdWJzY3JpcHRpb25zIGZyb20gYmVpbmcgYWRkZWQgdG8gb3VyXG4gICAgLy8gc2Vzc2lvbjsgdGhleSB3aWxsIGJlIGZvdW5kIGJlbG93IHdoZW4gd2UgY2FsbCBzdGFydFVuaXZlcnNhbFN1YnMuXG4gICAgLy9cbiAgICAvLyAoV2UgZG9uJ3QgaGF2ZSB0byB3b3JyeSBhYm91dCBuYW1lZCBzdWJzY3JpcHRpb25zLCBiZWNhdXNlIHdlIG9ubHkgYWRkXG4gICAgLy8gdGhlbSB3aGVuIHdlIHByb2Nlc3MgYSAnc3ViJyBtZXNzYWdlLiBXZSBhcmUgY3VycmVudGx5IHByb2Nlc3NpbmcgYVxuICAgIC8vICdtZXRob2QnIG1lc3NhZ2UsIGFuZCB0aGUgbWV0aG9kIGRpZCBub3QgdW5ibG9jaywgYmVjYXVzZSBpdCBpcyBpbGxlZ2FsXG4gICAgLy8gdG8gY2FsbCBzZXRVc2VySWQgYWZ0ZXIgdW5ibG9jay4gVGh1cyB3ZSBjYW5ub3QgYmUgY29uY3VycmVudGx5IGFkZGluZyBhXG4gICAgLy8gbmV3IG5hbWVkIHN1YnNjcmlwdGlvbi4pXG4gICAgc2VsZi5fZG9udFN0YXJ0TmV3VW5pdmVyc2FsU3VicyA9IHRydWU7XG5cbiAgICAvLyBQcmV2ZW50IGN1cnJlbnQgc3VicyBmcm9tIHVwZGF0aW5nIG91ciBjb2xsZWN0aW9uVmlld3MgYW5kIGNhbGwgdGhlaXJcbiAgICAvLyBzdG9wIGNhbGxiYWNrcy4gVGhpcyBtYXkgeWllbGQuXG4gICAgc2VsZi5fZWFjaFN1YihmdW5jdGlvbiAoc3ViKSB7XG4gICAgICBzdWIuX2RlYWN0aXZhdGUoKTtcbiAgICB9KTtcblxuICAgIC8vIEFsbCBzdWJzIHNob3VsZCBub3cgYmUgZGVhY3RpdmF0ZWQuIFN0b3Agc2VuZGluZyBtZXNzYWdlcyB0byB0aGUgY2xpZW50LFxuICAgIC8vIHNhdmUgdGhlIHN0YXRlIG9mIHRoZSBwdWJsaXNoZWQgY29sbGVjdGlvbnMsIHJlc2V0IHRvIGFuIGVtcHR5IHZpZXcsIGFuZFxuICAgIC8vIHVwZGF0ZSB0aGUgdXNlcklkLlxuICAgIHNlbGYuX2lzU2VuZGluZyA9IGZhbHNlO1xuICAgIHZhciBiZWZvcmVDVnMgPSBzZWxmLmNvbGxlY3Rpb25WaWV3cztcbiAgICBzZWxmLmNvbGxlY3Rpb25WaWV3cyA9IHt9O1xuICAgIHNlbGYudXNlcklkID0gdXNlcklkO1xuXG4gICAgLy8gX3NldFVzZXJJZCBpcyBub3JtYWxseSBjYWxsZWQgZnJvbSBhIE1ldGVvciBtZXRob2Qgd2l0aFxuICAgIC8vIEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb24gc2V0LiBCdXQgRERQLl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbiBpcyBub3RcbiAgICAvLyBleHBlY3RlZCB0byBiZSBzZXQgaW5zaWRlIGEgcHVibGlzaCBmdW5jdGlvbiwgc28gd2UgdGVtcG9yYXJ5IHVuc2V0IGl0LlxuICAgIC8vIEluc2lkZSBhIHB1Ymxpc2ggZnVuY3Rpb24gRERQLl9DdXJyZW50UHVibGljYXRpb25JbnZvY2F0aW9uIGlzIHNldC5cbiAgICBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLndpdGhWYWx1ZSh1bmRlZmluZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIFNhdmUgdGhlIG9sZCBuYW1lZCBzdWJzLCBhbmQgcmVzZXQgdG8gaGF2aW5nIG5vIHN1YnNjcmlwdGlvbnMuXG4gICAgICB2YXIgb2xkTmFtZWRTdWJzID0gc2VsZi5fbmFtZWRTdWJzO1xuICAgICAgc2VsZi5fbmFtZWRTdWJzID0ge307XG4gICAgICBzZWxmLl91bml2ZXJzYWxTdWJzID0gW107XG5cbiAgICAgIF8uZWFjaChvbGROYW1lZFN1YnMsIGZ1bmN0aW9uIChzdWIsIHN1YnNjcmlwdGlvbklkKSB7XG4gICAgICAgIHNlbGYuX25hbWVkU3Vic1tzdWJzY3JpcHRpb25JZF0gPSBzdWIuX3JlY3JlYXRlKCk7XG4gICAgICAgIC8vIG5iOiBpZiB0aGUgaGFuZGxlciB0aHJvd3Mgb3IgY2FsbHMgdGhpcy5lcnJvcigpLCBpdCB3aWxsIGluIGZhY3RcbiAgICAgICAgLy8gaW1tZWRpYXRlbHkgc2VuZCBpdHMgJ25vc3ViJy4gVGhpcyBpcyBPSywgdGhvdWdoLlxuICAgICAgICBzZWxmLl9uYW1lZFN1YnNbc3Vic2NyaXB0aW9uSWRdLl9ydW5IYW5kbGVyKCk7XG4gICAgICB9KTtcblxuICAgICAgLy8gQWxsb3cgbmV3bHktY3JlYXRlZCB1bml2ZXJzYWwgc3VicyB0byBiZSBzdGFydGVkIG9uIG91ciBjb25uZWN0aW9uIGluXG4gICAgICAvLyBwYXJhbGxlbCB3aXRoIHRoZSBvbmVzIHdlJ3JlIHNwaW5uaW5nIHVwIGhlcmUsIGFuZCBzcGluIHVwIHVuaXZlcnNhbFxuICAgICAgLy8gc3Vicy5cbiAgICAgIHNlbGYuX2RvbnRTdGFydE5ld1VuaXZlcnNhbFN1YnMgPSBmYWxzZTtcbiAgICAgIHNlbGYuc3RhcnRVbml2ZXJzYWxTdWJzKCk7XG4gICAgfSk7XG5cbiAgICAvLyBTdGFydCBzZW5kaW5nIG1lc3NhZ2VzIGFnYWluLCBiZWdpbm5pbmcgd2l0aCB0aGUgZGlmZiBmcm9tIHRoZSBwcmV2aW91c1xuICAgIC8vIHN0YXRlIG9mIHRoZSB3b3JsZCB0byB0aGUgY3VycmVudCBzdGF0ZS4gTm8geWllbGRzIGFyZSBhbGxvd2VkIGR1cmluZ1xuICAgIC8vIHRoaXMgZGlmZiwgc28gdGhhdCBvdGhlciBjaGFuZ2VzIGNhbm5vdCBpbnRlcmxlYXZlLlxuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX2lzU2VuZGluZyA9IHRydWU7XG4gICAgICBzZWxmLl9kaWZmQ29sbGVjdGlvblZpZXdzKGJlZm9yZUNWcyk7XG4gICAgICBpZiAoIV8uaXNFbXB0eShzZWxmLl9wZW5kaW5nUmVhZHkpKSB7XG4gICAgICAgIHNlbGYuc2VuZFJlYWR5KHNlbGYuX3BlbmRpbmdSZWFkeSk7XG4gICAgICAgIHNlbGYuX3BlbmRpbmdSZWFkeSA9IFtdO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIF9zdGFydFN1YnNjcmlwdGlvbjogZnVuY3Rpb24gKGhhbmRsZXIsIHN1YklkLCBwYXJhbXMsIG5hbWUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgc3ViID0gbmV3IFN1YnNjcmlwdGlvbihcbiAgICAgIHNlbGYsIGhhbmRsZXIsIHN1YklkLCBwYXJhbXMsIG5hbWUpO1xuICAgIGlmIChzdWJJZClcbiAgICAgIHNlbGYuX25hbWVkU3Vic1tzdWJJZF0gPSBzdWI7XG4gICAgZWxzZVxuICAgICAgc2VsZi5fdW5pdmVyc2FsU3Vicy5wdXNoKHN1Yik7XG5cbiAgICBzdWIuX3J1bkhhbmRsZXIoKTtcbiAgfSxcblxuICAvLyB0ZWFyIGRvd24gc3BlY2lmaWVkIHN1YnNjcmlwdGlvblxuICBfc3RvcFN1YnNjcmlwdGlvbjogZnVuY3Rpb24gKHN1YklkLCBlcnJvcikge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHZhciBzdWJOYW1lID0gbnVsbDtcblxuICAgIGlmIChzdWJJZCAmJiBzZWxmLl9uYW1lZFN1YnNbc3ViSWRdKSB7XG4gICAgICBzdWJOYW1lID0gc2VsZi5fbmFtZWRTdWJzW3N1YklkXS5fbmFtZTtcbiAgICAgIHNlbGYuX25hbWVkU3Vic1tzdWJJZF0uX3JlbW92ZUFsbERvY3VtZW50cygpO1xuICAgICAgc2VsZi5fbmFtZWRTdWJzW3N1YklkXS5fZGVhY3RpdmF0ZSgpO1xuICAgICAgZGVsZXRlIHNlbGYuX25hbWVkU3Vic1tzdWJJZF07XG4gICAgfVxuXG4gICAgdmFyIHJlc3BvbnNlID0ge21zZzogJ25vc3ViJywgaWQ6IHN1YklkfTtcblxuICAgIGlmIChlcnJvcikge1xuICAgICAgcmVzcG9uc2UuZXJyb3IgPSB3cmFwSW50ZXJuYWxFeGNlcHRpb24oXG4gICAgICAgIGVycm9yLFxuICAgICAgICBzdWJOYW1lID8gKFwiZnJvbSBzdWIgXCIgKyBzdWJOYW1lICsgXCIgaWQgXCIgKyBzdWJJZClcbiAgICAgICAgICA6IChcImZyb20gc3ViIGlkIFwiICsgc3ViSWQpKTtcbiAgICB9XG5cbiAgICBzZWxmLnNlbmQocmVzcG9uc2UpO1xuICB9LFxuXG4gIC8vIHRlYXIgZG93biBhbGwgc3Vic2NyaXB0aW9ucy4gTm90ZSB0aGF0IHRoaXMgZG9lcyBOT1Qgc2VuZCByZW1vdmVkIG9yIG5vc3ViXG4gIC8vIG1lc3NhZ2VzLCBzaW5jZSB3ZSBhc3N1bWUgdGhlIGNsaWVudCBpcyBnb25lLlxuICBfZGVhY3RpdmF0ZUFsbFN1YnNjcmlwdGlvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBfLmVhY2goc2VsZi5fbmFtZWRTdWJzLCBmdW5jdGlvbiAoc3ViLCBpZCkge1xuICAgICAgc3ViLl9kZWFjdGl2YXRlKCk7XG4gICAgfSk7XG4gICAgc2VsZi5fbmFtZWRTdWJzID0ge307XG5cbiAgICBfLmVhY2goc2VsZi5fdW5pdmVyc2FsU3VicywgZnVuY3Rpb24gKHN1Yikge1xuICAgICAgc3ViLl9kZWFjdGl2YXRlKCk7XG4gICAgfSk7XG4gICAgc2VsZi5fdW5pdmVyc2FsU3VicyA9IFtdO1xuICB9LFxuXG4gIC8vIERldGVybWluZSB0aGUgcmVtb3RlIGNsaWVudCdzIElQIGFkZHJlc3MsIGJhc2VkIG9uIHRoZVxuICAvLyBIVFRQX0ZPUldBUkRFRF9DT1VOVCBlbnZpcm9ubWVudCB2YXJpYWJsZSByZXByZXNlbnRpbmcgaG93IG1hbnlcbiAgLy8gcHJveGllcyB0aGUgc2VydmVyIGlzIGJlaGluZC5cbiAgX2NsaWVudEFkZHJlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBGb3IgdGhlIHJlcG9ydGVkIGNsaWVudCBhZGRyZXNzIGZvciBhIGNvbm5lY3Rpb24gdG8gYmUgY29ycmVjdCxcbiAgICAvLyB0aGUgZGV2ZWxvcGVyIG11c3Qgc2V0IHRoZSBIVFRQX0ZPUldBUkRFRF9DT1VOVCBlbnZpcm9ubWVudFxuICAgIC8vIHZhcmlhYmxlIHRvIGFuIGludGVnZXIgcmVwcmVzZW50aW5nIHRoZSBudW1iZXIgb2YgaG9wcyB0aGV5XG4gICAgLy8gZXhwZWN0IGluIHRoZSBgeC1mb3J3YXJkZWQtZm9yYCBoZWFkZXIuIEUuZy4sIHNldCB0byBcIjFcIiBpZiB0aGVcbiAgICAvLyBzZXJ2ZXIgaXMgYmVoaW5kIG9uZSBwcm94eS5cbiAgICAvL1xuICAgIC8vIFRoaXMgY291bGQgYmUgY29tcHV0ZWQgb25jZSBhdCBzdGFydHVwIGluc3RlYWQgb2YgZXZlcnkgdGltZS5cbiAgICB2YXIgaHR0cEZvcndhcmRlZENvdW50ID0gcGFyc2VJbnQocHJvY2Vzcy5lbnZbJ0hUVFBfRk9SV0FSREVEX0NPVU5UJ10pIHx8IDA7XG5cbiAgICBpZiAoaHR0cEZvcndhcmRlZENvdW50ID09PSAwKVxuICAgICAgcmV0dXJuIHNlbGYuc29ja2V0LnJlbW90ZUFkZHJlc3M7XG5cbiAgICB2YXIgZm9yd2FyZGVkRm9yID0gc2VsZi5zb2NrZXQuaGVhZGVyc1tcIngtZm9yd2FyZGVkLWZvclwiXTtcbiAgICBpZiAoISBfLmlzU3RyaW5nKGZvcndhcmRlZEZvcikpXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICBmb3J3YXJkZWRGb3IgPSBmb3J3YXJkZWRGb3IudHJpbSgpLnNwbGl0KC9cXHMqLFxccyovKTtcblxuICAgIC8vIFR5cGljYWxseSB0aGUgZmlyc3QgdmFsdWUgaW4gdGhlIGB4LWZvcndhcmRlZC1mb3JgIGhlYWRlciBpc1xuICAgIC8vIHRoZSBvcmlnaW5hbCBJUCBhZGRyZXNzIG9mIHRoZSBjbGllbnQgY29ubmVjdGluZyB0byB0aGUgZmlyc3RcbiAgICAvLyBwcm94eS4gIEhvd2V2ZXIsIHRoZSBlbmQgdXNlciBjYW4gZWFzaWx5IHNwb29mIHRoZSBoZWFkZXIsIGluXG4gICAgLy8gd2hpY2ggY2FzZSB0aGUgZmlyc3QgdmFsdWUocykgd2lsbCBiZSB0aGUgZmFrZSBJUCBhZGRyZXNzIGZyb21cbiAgICAvLyB0aGUgdXNlciBwcmV0ZW5kaW5nIHRvIGJlIGEgcHJveHkgcmVwb3J0aW5nIHRoZSBvcmlnaW5hbCBJUFxuICAgIC8vIGFkZHJlc3MgdmFsdWUuICBCeSBjb3VudGluZyBIVFRQX0ZPUldBUkRFRF9DT1VOVCBiYWNrIGZyb20gdGhlXG4gICAgLy8gZW5kIG9mIHRoZSBsaXN0LCB3ZSBlbnN1cmUgdGhhdCB3ZSBnZXQgdGhlIElQIGFkZHJlc3MgYmVpbmdcbiAgICAvLyByZXBvcnRlZCBieSAqb3VyKiBmaXJzdCBwcm94eS5cblxuICAgIGlmIChodHRwRm9yd2FyZGVkQ291bnQgPCAwIHx8IGh0dHBGb3J3YXJkZWRDb3VudCA+IGZvcndhcmRlZEZvci5sZW5ndGgpXG4gICAgICByZXR1cm4gbnVsbDtcblxuICAgIHJldHVybiBmb3J3YXJkZWRGb3JbZm9yd2FyZGVkRm9yLmxlbmd0aCAtIGh0dHBGb3J3YXJkZWRDb3VudF07XG4gIH1cbn0pO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuLyogU3Vic2NyaXB0aW9uICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbi8vIGN0b3IgZm9yIGEgc3ViIGhhbmRsZTogdGhlIGlucHV0IHRvIGVhY2ggcHVibGlzaCBmdW5jdGlvblxuXG4vLyBJbnN0YW5jZSBuYW1lIGlzIHRoaXMgYmVjYXVzZSBpdCdzIHVzdWFsbHkgcmVmZXJyZWQgdG8gYXMgdGhpcyBpbnNpZGUgYVxuLy8gcHVibGlzaFxuLyoqXG4gKiBAc3VtbWFyeSBUaGUgc2VydmVyJ3Mgc2lkZSBvZiBhIHN1YnNjcmlwdGlvblxuICogQGNsYXNzIFN1YnNjcmlwdGlvblxuICogQGluc3RhbmNlTmFtZSB0aGlzXG4gKiBAc2hvd0luc3RhbmNlTmFtZSB0cnVlXG4gKi9cbnZhciBTdWJzY3JpcHRpb24gPSBmdW5jdGlvbiAoXG4gICAgc2Vzc2lvbiwgaGFuZGxlciwgc3Vic2NyaXB0aW9uSWQsIHBhcmFtcywgbmFtZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYuX3Nlc3Npb24gPSBzZXNzaW9uOyAvLyB0eXBlIGlzIFNlc3Npb25cblxuICAvKipcbiAgICogQHN1bW1hcnkgQWNjZXNzIGluc2lkZSB0aGUgcHVibGlzaCBmdW5jdGlvbi4gVGhlIGluY29taW5nIFtjb25uZWN0aW9uXSgjbWV0ZW9yX29uY29ubmVjdGlvbikgZm9yIHRoaXMgc3Vic2NyaXB0aW9uLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBuYW1lICBjb25uZWN0aW9uXG4gICAqIEBtZW1iZXJPZiBTdWJzY3JpcHRpb25cbiAgICogQGluc3RhbmNlXG4gICAqL1xuICBzZWxmLmNvbm5lY3Rpb24gPSBzZXNzaW9uLmNvbm5lY3Rpb25IYW5kbGU7IC8vIHB1YmxpYyBBUEkgb2JqZWN0XG5cbiAgc2VsZi5faGFuZGxlciA9IGhhbmRsZXI7XG5cbiAgLy8gbXkgc3Vic2NyaXB0aW9uIElEIChnZW5lcmF0ZWQgYnkgY2xpZW50LCB1bmRlZmluZWQgZm9yIHVuaXZlcnNhbCBzdWJzKS5cbiAgc2VsZi5fc3Vic2NyaXB0aW9uSWQgPSBzdWJzY3JpcHRpb25JZDtcbiAgLy8gdW5kZWZpbmVkIGZvciB1bml2ZXJzYWwgc3Vic1xuICBzZWxmLl9uYW1lID0gbmFtZTtcblxuICBzZWxmLl9wYXJhbXMgPSBwYXJhbXMgfHwgW107XG5cbiAgLy8gT25seSBuYW1lZCBzdWJzY3JpcHRpb25zIGhhdmUgSURzLCBidXQgd2UgbmVlZCBzb21lIHNvcnQgb2Ygc3RyaW5nXG4gIC8vIGludGVybmFsbHkgdG8ga2VlcCB0cmFjayBvZiBhbGwgc3Vic2NyaXB0aW9ucyBpbnNpZGVcbiAgLy8gU2Vzc2lvbkRvY3VtZW50Vmlld3MuIFdlIHVzZSB0aGlzIHN1YnNjcmlwdGlvbkhhbmRsZSBmb3IgdGhhdC5cbiAgaWYgKHNlbGYuX3N1YnNjcmlwdGlvbklkKSB7XG4gICAgc2VsZi5fc3Vic2NyaXB0aW9uSGFuZGxlID0gJ04nICsgc2VsZi5fc3Vic2NyaXB0aW9uSWQ7XG4gIH0gZWxzZSB7XG4gICAgc2VsZi5fc3Vic2NyaXB0aW9uSGFuZGxlID0gJ1UnICsgUmFuZG9tLmlkKCk7XG4gIH1cblxuICAvLyBoYXMgX2RlYWN0aXZhdGUgYmVlbiBjYWxsZWQ/XG4gIHNlbGYuX2RlYWN0aXZhdGVkID0gZmFsc2U7XG5cbiAgLy8gc3RvcCBjYWxsYmFja3MgdG8gZy9jIHRoaXMgc3ViLiAgY2FsbGVkIHcvIHplcm8gYXJndW1lbnRzLlxuICBzZWxmLl9zdG9wQ2FsbGJhY2tzID0gW107XG5cbiAgLy8gdGhlIHNldCBvZiAoY29sbGVjdGlvbiwgZG9jdW1lbnRpZCkgdGhhdCB0aGlzIHN1YnNjcmlwdGlvbiBoYXNcbiAgLy8gYW4gb3BpbmlvbiBhYm91dFxuICBzZWxmLl9kb2N1bWVudHMgPSB7fTtcblxuICAvLyByZW1lbWJlciBpZiB3ZSBhcmUgcmVhZHkuXG4gIHNlbGYuX3JlYWR5ID0gZmFsc2U7XG5cbiAgLy8gUGFydCBvZiB0aGUgcHVibGljIEFQSTogdGhlIHVzZXIgb2YgdGhpcyBzdWIuXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEFjY2VzcyBpbnNpZGUgdGhlIHB1Ymxpc2ggZnVuY3Rpb24uIFRoZSBpZCBvZiB0aGUgbG9nZ2VkLWluIHVzZXIsIG9yIGBudWxsYCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbi5cbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyT2YgU3Vic2NyaXB0aW9uXG4gICAqIEBuYW1lICB1c2VySWRcbiAgICogQGluc3RhbmNlXG4gICAqL1xuICBzZWxmLnVzZXJJZCA9IHNlc3Npb24udXNlcklkO1xuXG4gIC8vIEZvciBub3csIHRoZSBpZCBmaWx0ZXIgaXMgZ29pbmcgdG8gZGVmYXVsdCB0b1xuICAvLyB0aGUgdG8vZnJvbSBERFAgbWV0aG9kcyBvbiBNb25nb0lELCB0b1xuICAvLyBzcGVjaWZpY2FsbHkgZGVhbCB3aXRoIG1vbmdvL21pbmltb25nbyBPYmplY3RJZHMuXG5cbiAgLy8gTGF0ZXIsIHlvdSB3aWxsIGJlIGFibGUgdG8gbWFrZSB0aGlzIGJlIFwicmF3XCJcbiAgLy8gaWYgeW91IHdhbnQgdG8gcHVibGlzaCBhIGNvbGxlY3Rpb24gdGhhdCB5b3Uga25vd1xuICAvLyBqdXN0IGhhcyBzdHJpbmdzIGZvciBrZXlzIGFuZCBubyBmdW5ueSBidXNpbmVzcywgdG9cbiAgLy8gYSBkZHAgY29uc3VtZXIgdGhhdCBpc24ndCBtaW5pbW9uZ29cblxuICBzZWxmLl9pZEZpbHRlciA9IHtcbiAgICBpZFN0cmluZ2lmeTogTW9uZ29JRC5pZFN0cmluZ2lmeSxcbiAgICBpZFBhcnNlOiBNb25nb0lELmlkUGFyc2VcbiAgfTtcblxuICBQYWNrYWdlWydmYWN0cy1iYXNlJ10gJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgXCJsaXZlZGF0YVwiLCBcInN1YnNjcmlwdGlvbnNcIiwgMSk7XG59O1xuXG5fLmV4dGVuZChTdWJzY3JpcHRpb24ucHJvdG90eXBlLCB7XG4gIF9ydW5IYW5kbGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgLy8gWFhYIHNob3VsZCB3ZSB1bmJsb2NrKCkgaGVyZT8gRWl0aGVyIGJlZm9yZSBydW5uaW5nIHRoZSBwdWJsaXNoXG4gICAgLy8gZnVuY3Rpb24sIG9yIGJlZm9yZSBydW5uaW5nIF9wdWJsaXNoQ3Vyc29yLlxuICAgIC8vXG4gICAgLy8gUmlnaHQgbm93LCBlYWNoIHB1Ymxpc2ggZnVuY3Rpb24gYmxvY2tzIGFsbCBmdXR1cmUgcHVibGlzaGVzIGFuZFxuICAgIC8vIG1ldGhvZHMgd2FpdGluZyBvbiBkYXRhIGZyb20gTW9uZ28gKG9yIHdoYXRldmVyIGVsc2UgdGhlIGZ1bmN0aW9uXG4gICAgLy8gYmxvY2tzIG9uKS4gVGhpcyBwcm9iYWJseSBzbG93cyBwYWdlIGxvYWQgaW4gY29tbW9uIGNhc2VzLlxuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRyeSB7XG4gICAgICB2YXIgcmVzID0gRERQLl9DdXJyZW50UHVibGljYXRpb25JbnZvY2F0aW9uLndpdGhWYWx1ZShcbiAgICAgICAgc2VsZixcbiAgICAgICAgKCkgPT4gbWF5YmVBdWRpdEFyZ3VtZW50Q2hlY2tzKFxuICAgICAgICAgIHNlbGYuX2hhbmRsZXIsIHNlbGYsIEVKU09OLmNsb25lKHNlbGYuX3BhcmFtcyksXG4gICAgICAgICAgLy8gSXQncyBPSyB0aGF0IHRoaXMgd291bGQgbG9vayB3ZWlyZCBmb3IgdW5pdmVyc2FsIHN1YnNjcmlwdGlvbnMsXG4gICAgICAgICAgLy8gYmVjYXVzZSB0aGV5IGhhdmUgbm8gYXJndW1lbnRzIHNvIHRoZXJlIGNhbiBuZXZlciBiZSBhblxuICAgICAgICAgIC8vIGF1ZGl0LWFyZ3VtZW50LWNoZWNrcyBmYWlsdXJlLlxuICAgICAgICAgIFwicHVibGlzaGVyICdcIiArIHNlbGYuX25hbWUgKyBcIidcIlxuICAgICAgICApXG4gICAgICApO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHNlbGYuZXJyb3IoZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gRGlkIHRoZSBoYW5kbGVyIGNhbGwgdGhpcy5lcnJvciBvciB0aGlzLnN0b3A/XG4gICAgaWYgKHNlbGYuX2lzRGVhY3RpdmF0ZWQoKSlcbiAgICAgIHJldHVybjtcblxuICAgIHNlbGYuX3B1Ymxpc2hIYW5kbGVyUmVzdWx0KHJlcyk7XG4gIH0sXG5cbiAgX3B1Ymxpc2hIYW5kbGVyUmVzdWx0OiBmdW5jdGlvbiAocmVzKSB7XG4gICAgLy8gU1BFQ0lBTCBDQVNFOiBJbnN0ZWFkIG9mIHdyaXRpbmcgdGhlaXIgb3duIGNhbGxiYWNrcyB0aGF0IGludm9rZVxuICAgIC8vIHRoaXMuYWRkZWQvY2hhbmdlZC9yZWFkeS9ldGMsIHRoZSB1c2VyIGNhbiBqdXN0IHJldHVybiBhIGNvbGxlY3Rpb25cbiAgICAvLyBjdXJzb3Igb3IgYXJyYXkgb2YgY3Vyc29ycyBmcm9tIHRoZSBwdWJsaXNoIGZ1bmN0aW9uOyB3ZSBjYWxsIHRoZWlyXG4gICAgLy8gX3B1Ymxpc2hDdXJzb3IgbWV0aG9kIHdoaWNoIHN0YXJ0cyBvYnNlcnZpbmcgdGhlIGN1cnNvciBhbmQgcHVibGlzaGVzIHRoZVxuICAgIC8vIHJlc3VsdHMuIE5vdGUgdGhhdCBfcHVibGlzaEN1cnNvciBkb2VzIE5PVCBjYWxsIHJlYWR5KCkuXG4gICAgLy9cbiAgICAvLyBYWFggVGhpcyB1c2VzIGFuIHVuZG9jdW1lbnRlZCBpbnRlcmZhY2Ugd2hpY2ggb25seSB0aGUgTW9uZ28gY3Vyc29yXG4gICAgLy8gaW50ZXJmYWNlIHB1Ymxpc2hlcy4gU2hvdWxkIHdlIG1ha2UgdGhpcyBpbnRlcmZhY2UgcHVibGljIGFuZCBlbmNvdXJhZ2VcbiAgICAvLyB1c2VycyB0byBpbXBsZW1lbnQgaXQgdGhlbXNlbHZlcz8gQXJndWFibHksIGl0J3MgdW5uZWNlc3Nhcnk7IHVzZXJzIGNhblxuICAgIC8vIGFscmVhZHkgd3JpdGUgdGhlaXIgb3duIGZ1bmN0aW9ucyBsaWtlXG4gICAgLy8gICB2YXIgcHVibGlzaE15UmVhY3RpdmVUaGluZ3kgPSBmdW5jdGlvbiAobmFtZSwgaGFuZGxlcikge1xuICAgIC8vICAgICBNZXRlb3IucHVibGlzaChuYW1lLCBmdW5jdGlvbiAoKSB7XG4gICAgLy8gICAgICAgdmFyIHJlYWN0aXZlVGhpbmd5ID0gaGFuZGxlcigpO1xuICAgIC8vICAgICAgIHJlYWN0aXZlVGhpbmd5LnB1Ymxpc2hNZSgpO1xuICAgIC8vICAgICB9KTtcbiAgICAvLyAgIH07XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGlzQ3Vyc29yID0gZnVuY3Rpb24gKGMpIHtcbiAgICAgIHJldHVybiBjICYmIGMuX3B1Ymxpc2hDdXJzb3I7XG4gICAgfTtcbiAgICBpZiAoaXNDdXJzb3IocmVzKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzLl9wdWJsaXNoQ3Vyc29yKHNlbGYpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBzZWxmLmVycm9yKGUpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICAvLyBfcHVibGlzaEN1cnNvciBvbmx5IHJldHVybnMgYWZ0ZXIgdGhlIGluaXRpYWwgYWRkZWQgY2FsbGJhY2tzIGhhdmUgcnVuLlxuICAgICAgLy8gbWFyayBzdWJzY3JpcHRpb24gYXMgcmVhZHkuXG4gICAgICBzZWxmLnJlYWR5KCk7XG4gICAgfSBlbHNlIGlmIChfLmlzQXJyYXkocmVzKSkge1xuICAgICAgLy8gY2hlY2sgYWxsIHRoZSBlbGVtZW50cyBhcmUgY3Vyc29yc1xuICAgICAgaWYgKCEgXy5hbGwocmVzLCBpc0N1cnNvcikpIHtcbiAgICAgICAgc2VsZi5lcnJvcihuZXcgRXJyb3IoXCJQdWJsaXNoIGZ1bmN0aW9uIHJldHVybmVkIGFuIGFycmF5IG9mIG5vbi1DdXJzb3JzXCIpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgLy8gZmluZCBkdXBsaWNhdGUgY29sbGVjdGlvbiBuYW1lc1xuICAgICAgLy8gWFhYIHdlIHNob3VsZCBzdXBwb3J0IG92ZXJsYXBwaW5nIGN1cnNvcnMsIGJ1dCB0aGF0IHdvdWxkIHJlcXVpcmUgdGhlXG4gICAgICAvLyBtZXJnZSBib3ggdG8gYWxsb3cgb3ZlcmxhcCB3aXRoaW4gYSBzdWJzY3JpcHRpb25cbiAgICAgIHZhciBjb2xsZWN0aW9uTmFtZXMgPSB7fTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBjb2xsZWN0aW9uTmFtZSA9IHJlc1tpXS5fZ2V0Q29sbGVjdGlvbk5hbWUoKTtcbiAgICAgICAgaWYgKF8uaGFzKGNvbGxlY3Rpb25OYW1lcywgY29sbGVjdGlvbk5hbWUpKSB7XG4gICAgICAgICAgc2VsZi5lcnJvcihuZXcgRXJyb3IoXG4gICAgICAgICAgICBcIlB1Ymxpc2ggZnVuY3Rpb24gcmV0dXJuZWQgbXVsdGlwbGUgY3Vyc29ycyBmb3IgY29sbGVjdGlvbiBcIiArXG4gICAgICAgICAgICAgIGNvbGxlY3Rpb25OYW1lKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbGxlY3Rpb25OYW1lc1tjb2xsZWN0aW9uTmFtZV0gPSB0cnVlO1xuICAgICAgfTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgXy5lYWNoKHJlcywgZnVuY3Rpb24gKGN1cikge1xuICAgICAgICAgIGN1ci5fcHVibGlzaEN1cnNvcihzZWxmKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHNlbGYuZXJyb3IoZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHNlbGYucmVhZHkoKTtcbiAgICB9IGVsc2UgaWYgKHJlcykge1xuICAgICAgLy8gdHJ1dGh5IHZhbHVlcyBvdGhlciB0aGFuIGN1cnNvcnMgb3IgYXJyYXlzIGFyZSBwcm9iYWJseSBhXG4gICAgICAvLyB1c2VyIG1pc3Rha2UgKHBvc3NpYmxlIHJldHVybmluZyBhIE1vbmdvIGRvY3VtZW50IHZpYSwgc2F5LFxuICAgICAgLy8gYGNvbGwuZmluZE9uZSgpYCkuXG4gICAgICBzZWxmLmVycm9yKG5ldyBFcnJvcihcIlB1Ymxpc2ggZnVuY3Rpb24gY2FuIG9ubHkgcmV0dXJuIGEgQ3Vyc29yIG9yIFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICArIFwiYW4gYXJyYXkgb2YgQ3Vyc29yc1wiKSk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFRoaXMgY2FsbHMgYWxsIHN0b3AgY2FsbGJhY2tzIGFuZCBwcmV2ZW50cyB0aGUgaGFuZGxlciBmcm9tIHVwZGF0aW5nIGFueVxuICAvLyBTZXNzaW9uQ29sbGVjdGlvblZpZXdzIGZ1cnRoZXIuIEl0J3MgdXNlZCB3aGVuIHRoZSB1c2VyIHVuc3Vic2NyaWJlcyBvclxuICAvLyBkaXNjb25uZWN0cywgYXMgd2VsbCBhcyBkdXJpbmcgc2V0VXNlcklkIHJlLXJ1bnMuIEl0IGRvZXMgKk5PVCogc2VuZFxuICAvLyByZW1vdmVkIG1lc3NhZ2VzIGZvciB0aGUgcHVibGlzaGVkIG9iamVjdHM7IGlmIHRoYXQgaXMgbmVjZXNzYXJ5LCBjYWxsXG4gIC8vIF9yZW1vdmVBbGxEb2N1bWVudHMgZmlyc3QuXG4gIF9kZWFjdGl2YXRlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX2RlYWN0aXZhdGVkKVxuICAgICAgcmV0dXJuO1xuICAgIHNlbGYuX2RlYWN0aXZhdGVkID0gdHJ1ZTtcbiAgICBzZWxmLl9jYWxsU3RvcENhbGxiYWNrcygpO1xuICAgIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXSAmJiBQYWNrYWdlWydmYWN0cy1iYXNlJ10uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgIFwibGl2ZWRhdGFcIiwgXCJzdWJzY3JpcHRpb25zXCIsIC0xKTtcbiAgfSxcblxuICBfY2FsbFN0b3BDYWxsYmFja3M6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gdGVsbCBsaXN0ZW5lcnMsIHNvIHRoZXkgY2FuIGNsZWFuIHVwXG4gICAgdmFyIGNhbGxiYWNrcyA9IHNlbGYuX3N0b3BDYWxsYmFja3M7XG4gICAgc2VsZi5fc3RvcENhbGxiYWNrcyA9IFtdO1xuICAgIF8uZWFjaChjYWxsYmFja3MsIGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBTZW5kIHJlbW92ZSBtZXNzYWdlcyBmb3IgZXZlcnkgZG9jdW1lbnQuXG4gIF9yZW1vdmVBbGxEb2N1bWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgXy5lYWNoKHNlbGYuX2RvY3VtZW50cywgZnVuY3Rpb24oY29sbGVjdGlvbkRvY3MsIGNvbGxlY3Rpb25OYW1lKSB7XG4gICAgICAgIC8vIEl0ZXJhdGUgb3ZlciBfLmtleXMgaW5zdGVhZCBvZiB0aGUgZGljdGlvbmFyeSBpdHNlbGYsIHNpbmNlIHdlJ2xsIGJlXG4gICAgICAgIC8vIG11dGF0aW5nIGl0LlxuICAgICAgICBfLmVhY2goXy5rZXlzKGNvbGxlY3Rpb25Eb2NzKSwgZnVuY3Rpb24gKHN0cklkKSB7XG4gICAgICAgICAgc2VsZi5yZW1vdmVkKGNvbGxlY3Rpb25OYW1lLCBzZWxmLl9pZEZpbHRlci5pZFBhcnNlKHN0cklkKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gUmV0dXJucyBhIG5ldyBTdWJzY3JpcHRpb24gZm9yIHRoZSBzYW1lIHNlc3Npb24gd2l0aCB0aGUgc2FtZVxuICAvLyBpbml0aWFsIGNyZWF0aW9uIHBhcmFtZXRlcnMuIFRoaXMgaXNuJ3QgYSBjbG9uZTogaXQgZG9lc24ndCBoYXZlXG4gIC8vIHRoZSBzYW1lIF9kb2N1bWVudHMgY2FjaGUsIHN0b3BwZWQgc3RhdGUgb3IgY2FsbGJhY2tzOyBtYXkgaGF2ZSBhXG4gIC8vIGRpZmZlcmVudCBfc3Vic2NyaXB0aW9uSGFuZGxlLCBhbmQgZ2V0cyBpdHMgdXNlcklkIGZyb20gdGhlXG4gIC8vIHNlc3Npb24sIG5vdCBmcm9tIHRoaXMgb2JqZWN0LlxuICBfcmVjcmVhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBTdWJzY3JpcHRpb24oXG4gICAgICBzZWxmLl9zZXNzaW9uLCBzZWxmLl9oYW5kbGVyLCBzZWxmLl9zdWJzY3JpcHRpb25JZCwgc2VsZi5fcGFyYW1zLFxuICAgICAgc2VsZi5fbmFtZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENhbGwgaW5zaWRlIHRoZSBwdWJsaXNoIGZ1bmN0aW9uLiAgU3RvcHMgdGhpcyBjbGllbnQncyBzdWJzY3JpcHRpb24sIHRyaWdnZXJpbmcgYSBjYWxsIG9uIHRoZSBjbGllbnQgdG8gdGhlIGBvblN0b3BgIGNhbGxiYWNrIHBhc3NlZCB0byBbYE1ldGVvci5zdWJzY3JpYmVgXSgjbWV0ZW9yX3N1YnNjcmliZSksIGlmIGFueS4gSWYgYGVycm9yYCBpcyBub3QgYSBbYE1ldGVvci5FcnJvcmBdKCNtZXRlb3JfZXJyb3IpLCBpdCB3aWxsIGJlIFtzYW5pdGl6ZWRdKCNtZXRlb3JfZXJyb3IpLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBwYXJhbSB7RXJyb3J9IGVycm9yIFRoZSBlcnJvciB0byBwYXNzIHRvIHRoZSBjbGllbnQuXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAbWVtYmVyT2YgU3Vic2NyaXB0aW9uXG4gICAqL1xuICBlcnJvcjogZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9pc0RlYWN0aXZhdGVkKCkpXG4gICAgICByZXR1cm47XG4gICAgc2VsZi5fc2Vzc2lvbi5fc3RvcFN1YnNjcmlwdGlvbihzZWxmLl9zdWJzY3JpcHRpb25JZCwgZXJyb3IpO1xuICB9LFxuXG4gIC8vIE5vdGUgdGhhdCB3aGlsZSBvdXIgRERQIGNsaWVudCB3aWxsIG5vdGljZSB0aGF0IHlvdSd2ZSBjYWxsZWQgc3RvcCgpIG9uIHRoZVxuICAvLyBzZXJ2ZXIgKGFuZCBjbGVhbiB1cCBpdHMgX3N1YnNjcmlwdGlvbnMgdGFibGUpIHdlIGRvbid0IGFjdHVhbGx5IHByb3ZpZGUgYVxuICAvLyBtZWNoYW5pc20gZm9yIGFuIGFwcCB0byBub3RpY2UgdGhpcyAodGhlIHN1YnNjcmliZSBvbkVycm9yIGNhbGxiYWNrIG9ubHlcbiAgLy8gdHJpZ2dlcnMgaWYgdGhlcmUgaXMgYW4gZXJyb3IpLlxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBDYWxsIGluc2lkZSB0aGUgcHVibGlzaCBmdW5jdGlvbi4gIFN0b3BzIHRoaXMgY2xpZW50J3Mgc3Vic2NyaXB0aW9uIGFuZCBpbnZva2VzIHRoZSBjbGllbnQncyBgb25TdG9wYCBjYWxsYmFjayB3aXRoIG5vIGVycm9yLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAbWVtYmVyT2YgU3Vic2NyaXB0aW9uXG4gICAqL1xuICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9pc0RlYWN0aXZhdGVkKCkpXG4gICAgICByZXR1cm47XG4gICAgc2VsZi5fc2Vzc2lvbi5fc3RvcFN1YnNjcmlwdGlvbihzZWxmLl9zdWJzY3JpcHRpb25JZCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENhbGwgaW5zaWRlIHRoZSBwdWJsaXNoIGZ1bmN0aW9uLiAgUmVnaXN0ZXJzIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gcnVuIHdoZW4gdGhlIHN1YnNjcmlwdGlvbiBpcyBzdG9wcGVkLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJPZiBTdWJzY3JpcHRpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAqL1xuICBvblN0b3A6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBjYWxsYmFjayA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoY2FsbGJhY2ssICdvblN0b3AgY2FsbGJhY2snLCBzZWxmKTtcbiAgICBpZiAoc2VsZi5faXNEZWFjdGl2YXRlZCgpKVxuICAgICAgY2FsbGJhY2soKTtcbiAgICBlbHNlXG4gICAgICBzZWxmLl9zdG9wQ2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuICB9LFxuXG4gIC8vIFRoaXMgcmV0dXJucyB0cnVlIGlmIHRoZSBzdWIgaGFzIGJlZW4gZGVhY3RpdmF0ZWQsICpPUiogaWYgdGhlIHNlc3Npb24gd2FzXG4gIC8vIGRlc3Ryb3llZCBidXQgdGhlIGRlZmVycmVkIGNhbGwgdG8gX2RlYWN0aXZhdGVBbGxTdWJzY3JpcHRpb25zIGhhc24ndFxuICAvLyBoYXBwZW5lZCB5ZXQuXG4gIF9pc0RlYWN0aXZhdGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBzZWxmLl9kZWFjdGl2YXRlZCB8fCBzZWxmLl9zZXNzaW9uLmluUXVldWUgPT09IG51bGw7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENhbGwgaW5zaWRlIHRoZSBwdWJsaXNoIGZ1bmN0aW9uLiAgSW5mb3JtcyB0aGUgc3Vic2NyaWJlciB0aGF0IGEgZG9jdW1lbnQgaGFzIGJlZW4gYWRkZWQgdG8gdGhlIHJlY29yZCBzZXQuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIFN1YnNjcmlwdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb24gVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gdGhhdCBjb250YWlucyB0aGUgbmV3IGRvY3VtZW50LlxuICAgKiBAcGFyYW0ge1N0cmluZ30gaWQgVGhlIG5ldyBkb2N1bWVudCdzIElELlxuICAgKiBAcGFyYW0ge09iamVjdH0gZmllbGRzIFRoZSBmaWVsZHMgaW4gdGhlIG5ldyBkb2N1bWVudC4gIElmIGBfaWRgIGlzIHByZXNlbnQgaXQgaXMgaWdub3JlZC5cbiAgICovXG4gIGFkZGVkOiBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIGlkLCBmaWVsZHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX2lzRGVhY3RpdmF0ZWQoKSlcbiAgICAgIHJldHVybjtcbiAgICBpZCA9IHNlbGYuX2lkRmlsdGVyLmlkU3RyaW5naWZ5KGlkKTtcbiAgICBNZXRlb3IuX2Vuc3VyZShzZWxmLl9kb2N1bWVudHMsIGNvbGxlY3Rpb25OYW1lKVtpZF0gPSB0cnVlO1xuICAgIHNlbGYuX3Nlc3Npb24uYWRkZWQoc2VsZi5fc3Vic2NyaXB0aW9uSGFuZGxlLCBjb2xsZWN0aW9uTmFtZSwgaWQsIGZpZWxkcyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENhbGwgaW5zaWRlIHRoZSBwdWJsaXNoIGZ1bmN0aW9uLiAgSW5mb3JtcyB0aGUgc3Vic2NyaWJlciB0aGF0IGEgZG9jdW1lbnQgaW4gdGhlIHJlY29yZCBzZXQgaGFzIGJlZW4gbW9kaWZpZWQuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIFN1YnNjcmlwdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb24gVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gdGhhdCBjb250YWlucyB0aGUgY2hhbmdlZCBkb2N1bWVudC5cbiAgICogQHBhcmFtIHtTdHJpbmd9IGlkIFRoZSBjaGFuZ2VkIGRvY3VtZW50J3MgSUQuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBmaWVsZHMgVGhlIGZpZWxkcyBpbiB0aGUgZG9jdW1lbnQgdGhhdCBoYXZlIGNoYW5nZWQsIHRvZ2V0aGVyIHdpdGggdGhlaXIgbmV3IHZhbHVlcy4gIElmIGEgZmllbGQgaXMgbm90IHByZXNlbnQgaW4gYGZpZWxkc2AgaXQgd2FzIGxlZnQgdW5jaGFuZ2VkOyBpZiBpdCBpcyBwcmVzZW50IGluIGBmaWVsZHNgIGFuZCBoYXMgYSB2YWx1ZSBvZiBgdW5kZWZpbmVkYCBpdCB3YXMgcmVtb3ZlZCBmcm9tIHRoZSBkb2N1bWVudC4gIElmIGBfaWRgIGlzIHByZXNlbnQgaXQgaXMgaWdub3JlZC5cbiAgICovXG4gIGNoYW5nZWQ6IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgaWQsIGZpZWxkcykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5faXNEZWFjdGl2YXRlZCgpKVxuICAgICAgcmV0dXJuO1xuICAgIGlkID0gc2VsZi5faWRGaWx0ZXIuaWRTdHJpbmdpZnkoaWQpO1xuICAgIHNlbGYuX3Nlc3Npb24uY2hhbmdlZChzZWxmLl9zdWJzY3JpcHRpb25IYW5kbGUsIGNvbGxlY3Rpb25OYW1lLCBpZCwgZmllbGRzKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgQ2FsbCBpbnNpZGUgdGhlIHB1Ymxpc2ggZnVuY3Rpb24uICBJbmZvcm1zIHRoZSBzdWJzY3JpYmVyIHRoYXQgYSBkb2N1bWVudCBoYXMgYmVlbiByZW1vdmVkIGZyb20gdGhlIHJlY29yZCBzZXQuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIFN1YnNjcmlwdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbGxlY3Rpb24gVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gdGhhdCB0aGUgZG9jdW1lbnQgaGFzIGJlZW4gcmVtb3ZlZCBmcm9tLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gaWQgVGhlIElEIG9mIHRoZSBkb2N1bWVudCB0aGF0IGhhcyBiZWVuIHJlbW92ZWQuXG4gICAqL1xuICByZW1vdmVkOiBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIGlkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9pc0RlYWN0aXZhdGVkKCkpXG4gICAgICByZXR1cm47XG4gICAgaWQgPSBzZWxmLl9pZEZpbHRlci5pZFN0cmluZ2lmeShpZCk7XG4gICAgLy8gV2UgZG9uJ3QgYm90aGVyIHRvIGRlbGV0ZSBzZXRzIG9mIHRoaW5ncyBpbiBhIGNvbGxlY3Rpb24gaWYgdGhlXG4gICAgLy8gY29sbGVjdGlvbiBpcyBlbXB0eS4gIEl0IGNvdWxkIGJyZWFrIF9yZW1vdmVBbGxEb2N1bWVudHMuXG4gICAgZGVsZXRlIHNlbGYuX2RvY3VtZW50c1tjb2xsZWN0aW9uTmFtZV1baWRdO1xuICAgIHNlbGYuX3Nlc3Npb24ucmVtb3ZlZChzZWxmLl9zdWJzY3JpcHRpb25IYW5kbGUsIGNvbGxlY3Rpb25OYW1lLCBpZCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENhbGwgaW5zaWRlIHRoZSBwdWJsaXNoIGZ1bmN0aW9uLiAgSW5mb3JtcyB0aGUgc3Vic2NyaWJlciB0aGF0IGFuIGluaXRpYWwsIGNvbXBsZXRlIHNuYXBzaG90IG9mIHRoZSByZWNvcmQgc2V0IGhhcyBiZWVuIHNlbnQuICBUaGlzIHdpbGwgdHJpZ2dlciBhIGNhbGwgb24gdGhlIGNsaWVudCB0byB0aGUgYG9uUmVhZHlgIGNhbGxiYWNrIHBhc3NlZCB0byAgW2BNZXRlb3Iuc3Vic2NyaWJlYF0oI21ldGVvcl9zdWJzY3JpYmUpLCBpZiBhbnkuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlck9mIFN1YnNjcmlwdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICovXG4gIHJlYWR5OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9pc0RlYWN0aXZhdGVkKCkpXG4gICAgICByZXR1cm47XG4gICAgaWYgKCFzZWxmLl9zdWJzY3JpcHRpb25JZClcbiAgICAgIHJldHVybjsgIC8vIHVubmVjZXNzYXJ5IGJ1dCBpZ25vcmVkIGZvciB1bml2ZXJzYWwgc3ViXG4gICAgaWYgKCFzZWxmLl9yZWFkeSkge1xuICAgICAgc2VsZi5fc2Vzc2lvbi5zZW5kUmVhZHkoW3NlbGYuX3N1YnNjcmlwdGlvbklkXSk7XG4gICAgICBzZWxmLl9yZWFkeSA9IHRydWU7XG4gICAgfVxuICB9XG59KTtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qIFNlcnZlciAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5TZXJ2ZXIgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgLy8gVGhlIGRlZmF1bHQgaGVhcnRiZWF0IGludGVydmFsIGlzIDMwIHNlY29uZHMgb24gdGhlIHNlcnZlciBhbmQgMzVcbiAgLy8gc2Vjb25kcyBvbiB0aGUgY2xpZW50LiAgU2luY2UgdGhlIGNsaWVudCBkb2Vzbid0IG5lZWQgdG8gc2VuZCBhXG4gIC8vIHBpbmcgYXMgbG9uZyBhcyBpdCBpcyByZWNlaXZpbmcgcGluZ3MsIHRoaXMgbWVhbnMgdGhhdCBwaW5nc1xuICAvLyBub3JtYWxseSBnbyBmcm9tIHRoZSBzZXJ2ZXIgdG8gdGhlIGNsaWVudC5cbiAgLy9cbiAgLy8gTm90ZTogVHJvcG9zcGhlcmUgZGVwZW5kcyBvbiB0aGUgYWJpbGl0eSB0byBtdXRhdGVcbiAgLy8gTWV0ZW9yLnNlcnZlci5vcHRpb25zLmhlYXJ0YmVhdFRpbWVvdXQhIFRoaXMgaXMgYSBoYWNrLCBidXQgaXQncyBsaWZlLlxuICBzZWxmLm9wdGlvbnMgPSBfLmRlZmF1bHRzKG9wdGlvbnMgfHwge30sIHtcbiAgICBoZWFydGJlYXRJbnRlcnZhbDogMTUwMDAsXG4gICAgaGVhcnRiZWF0VGltZW91dDogMTUwMDAsXG4gICAgLy8gRm9yIHRlc3RpbmcsIGFsbG93IHJlc3BvbmRpbmcgdG8gcGluZ3MgdG8gYmUgZGlzYWJsZWQuXG4gICAgcmVzcG9uZFRvUGluZ3M6IHRydWVcbiAgfSk7XG5cbiAgLy8gTWFwIG9mIGNhbGxiYWNrcyB0byBjYWxsIHdoZW4gYSBuZXcgY29ubmVjdGlvbiBjb21lcyBpbiB0byB0aGVcbiAgLy8gc2VydmVyIGFuZCBjb21wbGV0ZXMgRERQIHZlcnNpb24gbmVnb3RpYXRpb24uIFVzZSBhbiBvYmplY3QgaW5zdGVhZFxuICAvLyBvZiBhbiBhcnJheSBzbyB3ZSBjYW4gc2FmZWx5IHJlbW92ZSBvbmUgZnJvbSB0aGUgbGlzdCB3aGlsZVxuICAvLyBpdGVyYXRpbmcgb3ZlciBpdC5cbiAgc2VsZi5vbkNvbm5lY3Rpb25Ib29rID0gbmV3IEhvb2soe1xuICAgIGRlYnVnUHJpbnRFeGNlcHRpb25zOiBcIm9uQ29ubmVjdGlvbiBjYWxsYmFja1wiXG4gIH0pO1xuXG4gIC8vIE1hcCBvZiBjYWxsYmFja3MgdG8gY2FsbCB3aGVuIGEgbmV3IG1lc3NhZ2UgY29tZXMgaW4uXG4gIHNlbGYub25NZXNzYWdlSG9vayA9IG5ldyBIb29rKHtcbiAgICBkZWJ1Z1ByaW50RXhjZXB0aW9uczogXCJvbk1lc3NhZ2UgY2FsbGJhY2tcIlxuICB9KTtcblxuICBzZWxmLnB1Ymxpc2hfaGFuZGxlcnMgPSB7fTtcbiAgc2VsZi51bml2ZXJzYWxfcHVibGlzaF9oYW5kbGVycyA9IFtdO1xuXG4gIHNlbGYubWV0aG9kX2hhbmRsZXJzID0ge307XG5cbiAgc2VsZi5zZXNzaW9ucyA9IHt9OyAvLyBtYXAgZnJvbSBpZCB0byBzZXNzaW9uXG5cbiAgc2VsZi5zdHJlYW1fc2VydmVyID0gbmV3IFN0cmVhbVNlcnZlcjtcblxuICBzZWxmLnN0cmVhbV9zZXJ2ZXIucmVnaXN0ZXIoZnVuY3Rpb24gKHNvY2tldCkge1xuICAgIC8vIHNvY2tldCBpbXBsZW1lbnRzIHRoZSBTb2NrSlNDb25uZWN0aW9uIGludGVyZmFjZVxuICAgIHNvY2tldC5fbWV0ZW9yU2Vzc2lvbiA9IG51bGw7XG5cbiAgICB2YXIgc2VuZEVycm9yID0gZnVuY3Rpb24gKHJlYXNvbiwgb2ZmZW5kaW5nTWVzc2FnZSkge1xuICAgICAgdmFyIG1zZyA9IHttc2c6ICdlcnJvcicsIHJlYXNvbjogcmVhc29ufTtcbiAgICAgIGlmIChvZmZlbmRpbmdNZXNzYWdlKVxuICAgICAgICBtc2cub2ZmZW5kaW5nTWVzc2FnZSA9IG9mZmVuZGluZ01lc3NhZ2U7XG4gICAgICBzb2NrZXQuc2VuZChERFBDb21tb24uc3RyaW5naWZ5RERQKG1zZykpO1xuICAgIH07XG5cbiAgICBzb2NrZXQub24oJ2RhdGEnLCBmdW5jdGlvbiAocmF3X21zZykge1xuICAgICAgaWYgKE1ldGVvci5fcHJpbnRSZWNlaXZlZEREUCkge1xuICAgICAgICBNZXRlb3IuX2RlYnVnKFwiUmVjZWl2ZWQgRERQXCIsIHJhd19tc2cpO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB2YXIgbXNnID0gRERQQ29tbW9uLnBhcnNlRERQKHJhd19tc2cpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBzZW5kRXJyb3IoJ1BhcnNlIGVycm9yJyk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtc2cgPT09IG51bGwgfHwgIW1zZy5tc2cpIHtcbiAgICAgICAgICBzZW5kRXJyb3IoJ0JhZCByZXF1ZXN0JywgbXNnKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobXNnLm1zZyA9PT0gJ2Nvbm5lY3QnKSB7XG4gICAgICAgICAgaWYgKHNvY2tldC5fbWV0ZW9yU2Vzc2lvbikge1xuICAgICAgICAgICAgc2VuZEVycm9yKFwiQWxyZWFkeSBjb25uZWN0ZWRcIiwgbXNnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgRmliZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5faGFuZGxlQ29ubmVjdChzb2NrZXQsIG1zZyk7XG4gICAgICAgICAgfSkucnVuKCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzb2NrZXQuX21ldGVvclNlc3Npb24pIHtcbiAgICAgICAgICBzZW5kRXJyb3IoJ011c3QgY29ubmVjdCBmaXJzdCcsIG1zZyk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHNvY2tldC5fbWV0ZW9yU2Vzc2lvbi5wcm9jZXNzTWVzc2FnZShtc2cpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBYWFggcHJpbnQgc3RhY2sgbmljZWx5XG4gICAgICAgIE1ldGVvci5fZGVidWcoXCJJbnRlcm5hbCBleGNlcHRpb24gd2hpbGUgcHJvY2Vzc2luZyBtZXNzYWdlXCIsIG1zZywgZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBzb2NrZXQub24oJ2Nsb3NlJywgZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNvY2tldC5fbWV0ZW9yU2Vzc2lvbikge1xuICAgICAgICBGaWJlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgc29ja2V0Ll9tZXRlb3JTZXNzaW9uLmNsb3NlKCk7XG4gICAgICAgIH0pLnJ1bigpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn07XG5cbl8uZXh0ZW5kKFNlcnZlci5wcm90b3R5cGUsIHtcblxuICAvKipcbiAgICogQHN1bW1hcnkgUmVnaXN0ZXIgYSBjYWxsYmFjayB0byBiZSBjYWxsZWQgd2hlbiBhIG5ldyBERFAgY29ubmVjdGlvbiBpcyBtYWRlIHRvIHRoZSBzZXJ2ZXIuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRvIGNhbGwgd2hlbiBhIG5ldyBERFAgY29ubmVjdGlvbiBpcyBlc3RhYmxpc2hlZC5cbiAgICogQG1lbWJlck9mIE1ldGVvclxuICAgKiBAaW1wb3J0RnJvbVBhY2thZ2UgbWV0ZW9yXG4gICAqL1xuICBvbkNvbm5lY3Rpb246IGZ1bmN0aW9uIChmbikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gc2VsZi5vbkNvbm5lY3Rpb25Ib29rLnJlZ2lzdGVyKGZuKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgUmVnaXN0ZXIgYSBjYWxsYmFjayB0byBiZSBjYWxsZWQgd2hlbiBhIG5ldyBERFAgbWVzc2FnZSBpcyByZWNlaXZlZC5cbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdG8gY2FsbCB3aGVuIGEgbmV3IEREUCBtZXNzYWdlIGlzIHJlY2VpdmVkLlxuICAgKiBAbWVtYmVyT2YgTWV0ZW9yXG4gICAqIEBpbXBvcnRGcm9tUGFja2FnZSBtZXRlb3JcbiAgICovXG4gIG9uTWVzc2FnZTogZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBzZWxmLm9uTWVzc2FnZUhvb2sucmVnaXN0ZXIoZm4pO1xuICB9LFxuXG4gIF9oYW5kbGVDb25uZWN0OiBmdW5jdGlvbiAoc29ja2V0LCBtc2cpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBUaGUgY29ubmVjdCBtZXNzYWdlIG11c3Qgc3BlY2lmeSBhIHZlcnNpb24gYW5kIGFuIGFycmF5IG9mIHN1cHBvcnRlZFxuICAgIC8vIHZlcnNpb25zLCBhbmQgaXQgbXVzdCBjbGFpbSB0byBzdXBwb3J0IHdoYXQgaXQgaXMgcHJvcG9zaW5nLlxuICAgIGlmICghKHR5cGVvZiAobXNnLnZlcnNpb24pID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAgIF8uaXNBcnJheShtc2cuc3VwcG9ydCkgJiZcbiAgICAgICAgICBfLmFsbChtc2cuc3VwcG9ydCwgXy5pc1N0cmluZykgJiZcbiAgICAgICAgICBfLmNvbnRhaW5zKG1zZy5zdXBwb3J0LCBtc2cudmVyc2lvbikpKSB7XG4gICAgICBzb2NrZXQuc2VuZChERFBDb21tb24uc3RyaW5naWZ5RERQKHttc2c6ICdmYWlsZWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiBERFBDb21tb24uU1VQUE9SVEVEX0REUF9WRVJTSU9OU1swXX0pKTtcbiAgICAgIHNvY2tldC5jbG9zZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEluIHRoZSBmdXR1cmUsIGhhbmRsZSBzZXNzaW9uIHJlc3VtcHRpb246IHNvbWV0aGluZyBsaWtlOlxuICAgIC8vICBzb2NrZXQuX21ldGVvclNlc3Npb24gPSBzZWxmLnNlc3Npb25zW21zZy5zZXNzaW9uXVxuICAgIHZhciB2ZXJzaW9uID0gY2FsY3VsYXRlVmVyc2lvbihtc2cuc3VwcG9ydCwgRERQQ29tbW9uLlNVUFBPUlRFRF9ERFBfVkVSU0lPTlMpO1xuXG4gICAgaWYgKG1zZy52ZXJzaW9uICE9PSB2ZXJzaW9uKSB7XG4gICAgICAvLyBUaGUgYmVzdCB2ZXJzaW9uIHRvIHVzZSAoYWNjb3JkaW5nIHRvIHRoZSBjbGllbnQncyBzdGF0ZWQgcHJlZmVyZW5jZXMpXG4gICAgICAvLyBpcyBub3QgdGhlIG9uZSB0aGUgY2xpZW50IGlzIHRyeWluZyB0byB1c2UuIEluZm9ybSB0aGVtIGFib3V0IHRoZSBiZXN0XG4gICAgICAvLyB2ZXJzaW9uIHRvIHVzZS5cbiAgICAgIHNvY2tldC5zZW5kKEREUENvbW1vbi5zdHJpbmdpZnlERFAoe21zZzogJ2ZhaWxlZCcsIHZlcnNpb246IHZlcnNpb259KSk7XG4gICAgICBzb2NrZXQuY2xvc2UoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBZYXksIHZlcnNpb24gbWF0Y2hlcyEgQ3JlYXRlIGEgbmV3IHNlc3Npb24uXG4gICAgLy8gTm90ZTogVHJvcG9zcGhlcmUgZGVwZW5kcyBvbiB0aGUgYWJpbGl0eSB0byBtdXRhdGVcbiAgICAvLyBNZXRlb3Iuc2VydmVyLm9wdGlvbnMuaGVhcnRiZWF0VGltZW91dCEgVGhpcyBpcyBhIGhhY2ssIGJ1dCBpdCdzIGxpZmUuXG4gICAgc29ja2V0Ll9tZXRlb3JTZXNzaW9uID0gbmV3IFNlc3Npb24oc2VsZiwgdmVyc2lvbiwgc29ja2V0LCBzZWxmLm9wdGlvbnMpO1xuICAgIHNlbGYuc2Vzc2lvbnNbc29ja2V0Ll9tZXRlb3JTZXNzaW9uLmlkXSA9IHNvY2tldC5fbWV0ZW9yU2Vzc2lvbjtcbiAgICBzZWxmLm9uQ29ubmVjdGlvbkhvb2suZWFjaChmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgIGlmIChzb2NrZXQuX21ldGVvclNlc3Npb24pXG4gICAgICAgIGNhbGxiYWNrKHNvY2tldC5fbWV0ZW9yU2Vzc2lvbi5jb25uZWN0aW9uSGFuZGxlKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9LFxuICAvKipcbiAgICogUmVnaXN0ZXIgYSBwdWJsaXNoIGhhbmRsZXIgZnVuY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSBuYW1lIHtTdHJpbmd9IGlkZW50aWZpZXIgZm9yIHF1ZXJ5XG4gICAqIEBwYXJhbSBoYW5kbGVyIHtGdW5jdGlvbn0gcHVibGlzaCBoYW5kbGVyXG4gICAqIEBwYXJhbSBvcHRpb25zIHtPYmplY3R9XG4gICAqXG4gICAqIFNlcnZlciB3aWxsIGNhbGwgaGFuZGxlciBmdW5jdGlvbiBvbiBlYWNoIG5ldyBzdWJzY3JpcHRpb24sXG4gICAqIGVpdGhlciB3aGVuIHJlY2VpdmluZyBERFAgc3ViIG1lc3NhZ2UgZm9yIGEgbmFtZWQgc3Vic2NyaXB0aW9uLCBvciBvblxuICAgKiBERFAgY29ubmVjdCBmb3IgYSB1bml2ZXJzYWwgc3Vic2NyaXB0aW9uLlxuICAgKlxuICAgKiBJZiBuYW1lIGlzIG51bGwsIHRoaXMgd2lsbCBiZSBhIHN1YnNjcmlwdGlvbiB0aGF0IGlzXG4gICAqIGF1dG9tYXRpY2FsbHkgZXN0YWJsaXNoZWQgYW5kIHBlcm1hbmVudGx5IG9uIGZvciBhbGwgY29ubmVjdGVkXG4gICAqIGNsaWVudCwgaW5zdGVhZCBvZiBhIHN1YnNjcmlwdGlvbiB0aGF0IGNhbiBiZSB0dXJuZWQgb24gYW5kIG9mZlxuICAgKiB3aXRoIHN1YnNjcmliZSgpLlxuICAgKlxuICAgKiBvcHRpb25zIHRvIGNvbnRhaW46XG4gICAqICAtIChtb3N0bHkgaW50ZXJuYWwpIGlzX2F1dG86IHRydWUgaWYgZ2VuZXJhdGVkIGF1dG9tYXRpY2FsbHlcbiAgICogICAgZnJvbSBhbiBhdXRvcHVibGlzaCBob29rLiB0aGlzIGlzIGZvciBjb3NtZXRpYyBwdXJwb3NlcyBvbmx5XG4gICAqICAgIChpdCBsZXRzIHVzIGRldGVybWluZSB3aGV0aGVyIHRvIHByaW50IGEgd2FybmluZyBzdWdnZXN0aW5nXG4gICAqICAgIHRoYXQgeW91IHR1cm4gb2ZmIGF1dG9wdWJsaXNoLilcbiAgICovXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFB1Ymxpc2ggYSByZWNvcmQgc2V0LlxuICAgKiBAbWVtYmVyT2YgTWV0ZW9yXG4gICAqIEBpbXBvcnRGcm9tUGFja2FnZSBtZXRlb3JcbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IG5hbWUgSWYgU3RyaW5nLCBuYW1lIG9mIHRoZSByZWNvcmQgc2V0LiAgSWYgT2JqZWN0LCBwdWJsaWNhdGlvbnMgRGljdGlvbmFyeSBvZiBwdWJsaXNoIGZ1bmN0aW9ucyBieSBuYW1lLiAgSWYgYG51bGxgLCB0aGUgc2V0IGhhcyBubyBuYW1lLCBhbmQgdGhlIHJlY29yZCBzZXQgaXMgYXV0b21hdGljYWxseSBzZW50IHRvIGFsbCBjb25uZWN0ZWQgY2xpZW50cy5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBGdW5jdGlvbiBjYWxsZWQgb24gdGhlIHNlcnZlciBlYWNoIHRpbWUgYSBjbGllbnQgc3Vic2NyaWJlcy4gIEluc2lkZSB0aGUgZnVuY3Rpb24sIGB0aGlzYCBpcyB0aGUgcHVibGlzaCBoYW5kbGVyIG9iamVjdCwgZGVzY3JpYmVkIGJlbG93LiAgSWYgdGhlIGNsaWVudCBwYXNzZWQgYXJndW1lbnRzIHRvIGBzdWJzY3JpYmVgLCB0aGUgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggdGhlIHNhbWUgYXJndW1lbnRzLlxuICAgKi9cbiAgcHVibGlzaDogZnVuY3Rpb24gKG5hbWUsIGhhbmRsZXIsIG9wdGlvbnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoISBfLmlzT2JqZWN0KG5hbWUpKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgaWYgKG5hbWUgJiYgbmFtZSBpbiBzZWxmLnB1Ymxpc2hfaGFuZGxlcnMpIHtcbiAgICAgICAgTWV0ZW9yLl9kZWJ1ZyhcIklnbm9yaW5nIGR1cGxpY2F0ZSBwdWJsaXNoIG5hbWVkICdcIiArIG5hbWUgKyBcIidcIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKFBhY2thZ2UuYXV0b3B1Ymxpc2ggJiYgIW9wdGlvbnMuaXNfYXV0bykge1xuICAgICAgICAvLyBUaGV5IGhhdmUgYXV0b3B1Ymxpc2ggb24sIHlldCB0aGV5J3JlIHRyeWluZyB0byBtYW51YWxseVxuICAgICAgICAvLyBwaWNraW5nIHN0dWZmIHRvIHB1Ymxpc2guIFRoZXkgcHJvYmFibHkgc2hvdWxkIHR1cm4gb2ZmXG4gICAgICAgIC8vIGF1dG9wdWJsaXNoLiAoVGhpcyBjaGVjayBpc24ndCBwZXJmZWN0IC0tIGlmIHlvdSBjcmVhdGUgYVxuICAgICAgICAvLyBwdWJsaXNoIGJlZm9yZSB5b3UgdHVybiBvbiBhdXRvcHVibGlzaCwgaXQgd29uJ3QgY2F0Y2hcbiAgICAgICAgLy8gaXQuIEJ1dCB0aGlzIHdpbGwgZGVmaW5pdGVseSBoYW5kbGUgdGhlIHNpbXBsZSBjYXNlIHdoZXJlXG4gICAgICAgIC8vIHlvdSd2ZSBhZGRlZCB0aGUgYXV0b3B1Ymxpc2ggcGFja2FnZSB0byB5b3VyIGFwcCwgYW5kIGFyZVxuICAgICAgICAvLyBjYWxsaW5nIHB1Ymxpc2ggZnJvbSB5b3VyIGFwcCBjb2RlLilcbiAgICAgICAgaWYgKCFzZWxmLndhcm5lZF9hYm91dF9hdXRvcHVibGlzaCkge1xuICAgICAgICAgIHNlbGYud2FybmVkX2Fib3V0X2F1dG9wdWJsaXNoID0gdHJ1ZTtcbiAgICAgICAgICBNZXRlb3IuX2RlYnVnKFxuICAgIFwiKiogWW91J3ZlIHNldCB1cCBzb21lIGRhdGEgc3Vic2NyaXB0aW9ucyB3aXRoIE1ldGVvci5wdWJsaXNoKCksIGJ1dFxcblwiICtcbiAgICBcIioqIHlvdSBzdGlsbCBoYXZlIGF1dG9wdWJsaXNoIHR1cm5lZCBvbi4gQmVjYXVzZSBhdXRvcHVibGlzaCBpcyBzdGlsbFxcblwiICtcbiAgICBcIioqIG9uLCB5b3VyIE1ldGVvci5wdWJsaXNoKCkgY2FsbHMgd29uJ3QgaGF2ZSBtdWNoIGVmZmVjdC4gQWxsIGRhdGFcXG5cIiArXG4gICAgXCIqKiB3aWxsIHN0aWxsIGJlIHNlbnQgdG8gYWxsIGNsaWVudHMuXFxuXCIgK1xuICAgIFwiKipcXG5cIiArXG4gICAgXCIqKiBUdXJuIG9mZiBhdXRvcHVibGlzaCBieSByZW1vdmluZyB0aGUgYXV0b3B1Ymxpc2ggcGFja2FnZTpcXG5cIiArXG4gICAgXCIqKlxcblwiICtcbiAgICBcIioqICAgJCBtZXRlb3IgcmVtb3ZlIGF1dG9wdWJsaXNoXFxuXCIgK1xuICAgIFwiKipcXG5cIiArXG4gICAgXCIqKiAuLiBhbmQgbWFrZSBzdXJlIHlvdSBoYXZlIE1ldGVvci5wdWJsaXNoKCkgYW5kIE1ldGVvci5zdWJzY3JpYmUoKSBjYWxsc1xcblwiICtcbiAgICBcIioqIGZvciBlYWNoIGNvbGxlY3Rpb24gdGhhdCB5b3Ugd2FudCBjbGllbnRzIHRvIHNlZS5cXG5cIik7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKG5hbWUpXG4gICAgICAgIHNlbGYucHVibGlzaF9oYW5kbGVyc1tuYW1lXSA9IGhhbmRsZXI7XG4gICAgICBlbHNlIHtcbiAgICAgICAgc2VsZi51bml2ZXJzYWxfcHVibGlzaF9oYW5kbGVycy5wdXNoKGhhbmRsZXIpO1xuICAgICAgICAvLyBTcGluIHVwIHRoZSBuZXcgcHVibGlzaGVyIG9uIGFueSBleGlzdGluZyBzZXNzaW9uIHRvby4gUnVuIGVhY2hcbiAgICAgICAgLy8gc2Vzc2lvbidzIHN1YnNjcmlwdGlvbiBpbiBhIG5ldyBGaWJlciwgc28gdGhhdCB0aGVyZSdzIG5vIGNoYW5nZSBmb3JcbiAgICAgICAgLy8gc2VsZi5zZXNzaW9ucyB0byBjaGFuZ2Ugd2hpbGUgd2UncmUgcnVubmluZyB0aGlzIGxvb3AuXG4gICAgICAgIF8uZWFjaChzZWxmLnNlc3Npb25zLCBmdW5jdGlvbiAoc2Vzc2lvbikge1xuICAgICAgICAgIGlmICghc2Vzc2lvbi5fZG9udFN0YXJ0TmV3VW5pdmVyc2FsU3Vicykge1xuICAgICAgICAgICAgRmliZXIoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHNlc3Npb24uX3N0YXJ0U3Vic2NyaXB0aW9uKGhhbmRsZXIpO1xuICAgICAgICAgICAgfSkucnVuKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZXtcbiAgICAgIF8uZWFjaChuYW1lLCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIHNlbGYucHVibGlzaChrZXksIHZhbHVlLCB7fSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgX3JlbW92ZVNlc3Npb246IGZ1bmN0aW9uIChzZXNzaW9uKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLnNlc3Npb25zW3Nlc3Npb24uaWRdKSB7XG4gICAgICBkZWxldGUgc2VsZi5zZXNzaW9uc1tzZXNzaW9uLmlkXTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IERlZmluZXMgZnVuY3Rpb25zIHRoYXQgY2FuIGJlIGludm9rZWQgb3ZlciB0aGUgbmV0d29yayBieSBjbGllbnRzLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQHBhcmFtIHtPYmplY3R9IG1ldGhvZHMgRGljdGlvbmFyeSB3aG9zZSBrZXlzIGFyZSBtZXRob2QgbmFtZXMgYW5kIHZhbHVlcyBhcmUgZnVuY3Rpb25zLlxuICAgKiBAbWVtYmVyT2YgTWV0ZW9yXG4gICAqIEBpbXBvcnRGcm9tUGFja2FnZSBtZXRlb3JcbiAgICovXG4gIG1ldGhvZHM6IGZ1bmN0aW9uIChtZXRob2RzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIF8uZWFjaChtZXRob2RzLCBmdW5jdGlvbiAoZnVuYywgbmFtZSkge1xuICAgICAgaWYgKHR5cGVvZiBmdW5jICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNZXRob2QgJ1wiICsgbmFtZSArIFwiJyBtdXN0IGJlIGEgZnVuY3Rpb25cIik7XG4gICAgICBpZiAoc2VsZi5tZXRob2RfaGFuZGxlcnNbbmFtZV0pXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkEgbWV0aG9kIG5hbWVkICdcIiArIG5hbWUgKyBcIicgaXMgYWxyZWFkeSBkZWZpbmVkXCIpO1xuICAgICAgc2VsZi5tZXRob2RfaGFuZGxlcnNbbmFtZV0gPSBmdW5jO1xuICAgIH0pO1xuICB9LFxuXG4gIGNhbGw6IGZ1bmN0aW9uIChuYW1lLCAuLi5hcmdzKSB7XG4gICAgaWYgKGFyZ3MubGVuZ3RoICYmIHR5cGVvZiBhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgLy8gSWYgaXQncyBhIGZ1bmN0aW9uLCB0aGUgbGFzdCBhcmd1bWVudCBpcyB0aGUgcmVzdWx0IGNhbGxiYWNrLCBub3RcbiAgICAgIC8vIGEgcGFyYW1ldGVyIHRvIHRoZSByZW1vdGUgbWV0aG9kLlxuICAgICAgdmFyIGNhbGxiYWNrID0gYXJncy5wb3AoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hcHBseShuYW1lLCBhcmdzLCBjYWxsYmFjayk7XG4gIH0sXG5cbiAgLy8gQSB2ZXJzaW9uIG9mIHRoZSBjYWxsIG1ldGhvZCB0aGF0IGFsd2F5cyByZXR1cm5zIGEgUHJvbWlzZS5cbiAgY2FsbEFzeW5jOiBmdW5jdGlvbiAobmFtZSwgLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLmFwcGx5QXN5bmMobmFtZSwgYXJncyk7XG4gIH0sXG5cbiAgYXBwbHk6IGZ1bmN0aW9uIChuYW1lLCBhcmdzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIC8vIFdlIHdlcmUgcGFzc2VkIDMgYXJndW1lbnRzLiBUaGV5IG1heSBiZSBlaXRoZXIgKG5hbWUsIGFyZ3MsIG9wdGlvbnMpXG4gICAgLy8gb3IgKG5hbWUsIGFyZ3MsIGNhbGxiYWNrKVxuICAgIGlmICghIGNhbGxiYWNrICYmIHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfSBlbHNlIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIH1cblxuICAgIGNvbnN0IHByb21pc2UgPSB0aGlzLmFwcGx5QXN5bmMobmFtZSwgYXJncywgb3B0aW9ucyk7XG5cbiAgICAvLyBSZXR1cm4gdGhlIHJlc3VsdCBpbiB3aGljaGV2ZXIgd2F5IHRoZSBjYWxsZXIgYXNrZWQgZm9yIGl0LiBOb3RlIHRoYXQgd2VcbiAgICAvLyBkbyBOT1QgYmxvY2sgb24gdGhlIHdyaXRlIGZlbmNlIGluIGFuIGFuYWxvZ291cyB3YXkgdG8gaG93IHRoZSBjbGllbnRcbiAgICAvLyBibG9ja3Mgb24gdGhlIHJlbGV2YW50IGRhdGEgYmVpbmcgdmlzaWJsZSwgc28geW91IGFyZSBOT1QgZ3VhcmFudGVlZCB0aGF0XG4gICAgLy8gY3Vyc29yIG9ic2VydmUgY2FsbGJhY2tzIGhhdmUgZmlyZWQgd2hlbiB5b3VyIGNhbGxiYWNrIGlzIGludm9rZWQuIChXZVxuICAgIC8vIGNhbiBjaGFuZ2UgdGhpcyBpZiB0aGVyZSdzIGEgcmVhbCB1c2UgY2FzZS4pXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICBwcm9taXNlLnRoZW4oXG4gICAgICAgIHJlc3VsdCA9PiBjYWxsYmFjayh1bmRlZmluZWQsIHJlc3VsdCksXG4gICAgICAgIGV4Y2VwdGlvbiA9PiBjYWxsYmFjayhleGNlcHRpb24pXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gcHJvbWlzZS5hd2FpdCgpO1xuICAgIH1cbiAgfSxcblxuICAvLyBAcGFyYW0gb3B0aW9ucyB7T3B0aW9uYWwgT2JqZWN0fVxuICBhcHBseUFzeW5jOiBmdW5jdGlvbiAobmFtZSwgYXJncywgb3B0aW9ucykge1xuICAgIC8vIFJ1biB0aGUgaGFuZGxlclxuICAgIHZhciBoYW5kbGVyID0gdGhpcy5tZXRob2RfaGFuZGxlcnNbbmFtZV07XG4gICAgaWYgKCEgaGFuZGxlcikge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KFxuICAgICAgICBuZXcgTWV0ZW9yLkVycm9yKDQwNCwgYE1ldGhvZCAnJHtuYW1lfScgbm90IGZvdW5kYClcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhpcyBpcyBhIG1ldGhvZCBjYWxsIGZyb20gd2l0aGluIGFub3RoZXIgbWV0aG9kIG9yIHB1Ymxpc2ggZnVuY3Rpb24sXG4gICAgLy8gZ2V0IHRoZSB1c2VyIHN0YXRlIGZyb20gdGhlIG91dGVyIG1ldGhvZCBvciBwdWJsaXNoIGZ1bmN0aW9uLCBvdGhlcndpc2VcbiAgICAvLyBkb24ndCBhbGxvdyBzZXRVc2VySWQgdG8gYmUgY2FsbGVkXG4gICAgdmFyIHVzZXJJZCA9IG51bGw7XG4gICAgdmFyIHNldFVzZXJJZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgY2FsbCBzZXRVc2VySWQgb24gYSBzZXJ2ZXIgaW5pdGlhdGVkIG1ldGhvZCBjYWxsXCIpO1xuICAgIH07XG4gICAgdmFyIGNvbm5lY3Rpb24gPSBudWxsO1xuICAgIHZhciBjdXJyZW50TWV0aG9kSW52b2NhdGlvbiA9IEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb24uZ2V0KCk7XG4gICAgdmFyIGN1cnJlbnRQdWJsaWNhdGlvbkludm9jYXRpb24gPSBERFAuX0N1cnJlbnRQdWJsaWNhdGlvbkludm9jYXRpb24uZ2V0KCk7XG4gICAgdmFyIHJhbmRvbVNlZWQgPSBudWxsO1xuICAgIGlmIChjdXJyZW50TWV0aG9kSW52b2NhdGlvbikge1xuICAgICAgdXNlcklkID0gY3VycmVudE1ldGhvZEludm9jYXRpb24udXNlcklkO1xuICAgICAgc2V0VXNlcklkID0gZnVuY3Rpb24odXNlcklkKSB7XG4gICAgICAgIGN1cnJlbnRNZXRob2RJbnZvY2F0aW9uLnNldFVzZXJJZCh1c2VySWQpO1xuICAgICAgfTtcbiAgICAgIGNvbm5lY3Rpb24gPSBjdXJyZW50TWV0aG9kSW52b2NhdGlvbi5jb25uZWN0aW9uO1xuICAgICAgcmFuZG9tU2VlZCA9IEREUENvbW1vbi5tYWtlUnBjU2VlZChjdXJyZW50TWV0aG9kSW52b2NhdGlvbiwgbmFtZSk7XG4gICAgfSBlbHNlIGlmIChjdXJyZW50UHVibGljYXRpb25JbnZvY2F0aW9uKSB7XG4gICAgICB1c2VySWQgPSBjdXJyZW50UHVibGljYXRpb25JbnZvY2F0aW9uLnVzZXJJZDtcbiAgICAgIHNldFVzZXJJZCA9IGZ1bmN0aW9uKHVzZXJJZCkge1xuICAgICAgICBjdXJyZW50UHVibGljYXRpb25JbnZvY2F0aW9uLl9zZXNzaW9uLl9zZXRVc2VySWQodXNlcklkKTtcbiAgICAgIH07XG4gICAgICBjb25uZWN0aW9uID0gY3VycmVudFB1YmxpY2F0aW9uSW52b2NhdGlvbi5jb25uZWN0aW9uO1xuICAgIH1cblxuICAgIHZhciBpbnZvY2F0aW9uID0gbmV3IEREUENvbW1vbi5NZXRob2RJbnZvY2F0aW9uKHtcbiAgICAgIGlzU2ltdWxhdGlvbjogZmFsc2UsXG4gICAgICB1c2VySWQsXG4gICAgICBzZXRVc2VySWQsXG4gICAgICBjb25uZWN0aW9uLFxuICAgICAgcmFuZG9tU2VlZFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gcmVzb2x2ZShcbiAgICAgIEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb24ud2l0aFZhbHVlKFxuICAgICAgICBpbnZvY2F0aW9uLFxuICAgICAgICAoKSA9PiBtYXliZUF1ZGl0QXJndW1lbnRDaGVja3MoXG4gICAgICAgICAgaGFuZGxlciwgaW52b2NhdGlvbiwgRUpTT04uY2xvbmUoYXJncyksXG4gICAgICAgICAgXCJpbnRlcm5hbCBjYWxsIHRvICdcIiArIG5hbWUgKyBcIidcIlxuICAgICAgICApXG4gICAgICApXG4gICAgKSkudGhlbihFSlNPTi5jbG9uZSk7XG4gIH0sXG5cbiAgX3VybEZvclNlc3Npb246IGZ1bmN0aW9uIChzZXNzaW9uSWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHNlc3Npb24gPSBzZWxmLnNlc3Npb25zW3Nlc3Npb25JZF07XG4gICAgaWYgKHNlc3Npb24pXG4gICAgICByZXR1cm4gc2Vzc2lvbi5fc29ja2V0VXJsO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBudWxsO1xuICB9XG59KTtcblxudmFyIGNhbGN1bGF0ZVZlcnNpb24gPSBmdW5jdGlvbiAoY2xpZW50U3VwcG9ydGVkVmVyc2lvbnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJTdXBwb3J0ZWRWZXJzaW9ucykge1xuICB2YXIgY29ycmVjdFZlcnNpb24gPSBfLmZpbmQoY2xpZW50U3VwcG9ydGVkVmVyc2lvbnMsIGZ1bmN0aW9uICh2ZXJzaW9uKSB7XG4gICAgcmV0dXJuIF8uY29udGFpbnMoc2VydmVyU3VwcG9ydGVkVmVyc2lvbnMsIHZlcnNpb24pO1xuICB9KTtcbiAgaWYgKCFjb3JyZWN0VmVyc2lvbikge1xuICAgIGNvcnJlY3RWZXJzaW9uID0gc2VydmVyU3VwcG9ydGVkVmVyc2lvbnNbMF07XG4gIH1cbiAgcmV0dXJuIGNvcnJlY3RWZXJzaW9uO1xufTtcblxuRERQU2VydmVyLl9jYWxjdWxhdGVWZXJzaW9uID0gY2FsY3VsYXRlVmVyc2lvbjtcblxuXG4vLyBcImJsaW5kXCIgZXhjZXB0aW9ucyBvdGhlciB0aGFuIHRob3NlIHRoYXQgd2VyZSBkZWxpYmVyYXRlbHkgdGhyb3duIHRvIHNpZ25hbFxuLy8gZXJyb3JzIHRvIHRoZSBjbGllbnRcbnZhciB3cmFwSW50ZXJuYWxFeGNlcHRpb24gPSBmdW5jdGlvbiAoZXhjZXB0aW9uLCBjb250ZXh0KSB7XG4gIGlmICghZXhjZXB0aW9uKSByZXR1cm4gZXhjZXB0aW9uO1xuXG4gIC8vIFRvIGFsbG93IHBhY2thZ2VzIHRvIHRocm93IGVycm9ycyBpbnRlbmRlZCBmb3IgdGhlIGNsaWVudCBidXQgbm90IGhhdmUgdG9cbiAgLy8gZGVwZW5kIG9uIHRoZSBNZXRlb3IuRXJyb3IgY2xhc3MsIGBpc0NsaWVudFNhZmVgIGNhbiBiZSBzZXQgdG8gdHJ1ZSBvbiBhbnlcbiAgLy8gZXJyb3IgYmVmb3JlIGl0IGlzIHRocm93bi5cbiAgaWYgKGV4Y2VwdGlvbi5pc0NsaWVudFNhZmUpIHtcbiAgICBpZiAoIShleGNlcHRpb24gaW5zdGFuY2VvZiBNZXRlb3IuRXJyb3IpKSB7XG4gICAgICBjb25zdCBvcmlnaW5hbE1lc3NhZ2UgPSBleGNlcHRpb24ubWVzc2FnZTtcbiAgICAgIGV4Y2VwdGlvbiA9IG5ldyBNZXRlb3IuRXJyb3IoZXhjZXB0aW9uLmVycm9yLCBleGNlcHRpb24ucmVhc29uLCBleGNlcHRpb24uZGV0YWlscyk7XG4gICAgICBleGNlcHRpb24ubWVzc2FnZSA9IG9yaWdpbmFsTWVzc2FnZTtcbiAgICB9XG4gICAgcmV0dXJuIGV4Y2VwdGlvbjtcbiAgfVxuXG4gIC8vIFRlc3RzIGNhbiBzZXQgdGhlICdfZXhwZWN0ZWRCeVRlc3QnIGZsYWcgb24gYW4gZXhjZXB0aW9uIHNvIGl0IHdvbid0IGdvIHRvXG4gIC8vIHRoZSBzZXJ2ZXIgbG9nLlxuICBpZiAoIWV4Y2VwdGlvbi5fZXhwZWN0ZWRCeVRlc3QpIHtcbiAgICBNZXRlb3IuX2RlYnVnKFwiRXhjZXB0aW9uIFwiICsgY29udGV4dCwgZXhjZXB0aW9uKTtcbiAgICBpZiAoZXhjZXB0aW9uLnNhbml0aXplZEVycm9yKSB7XG4gICAgICBNZXRlb3IuX2RlYnVnKFwiU2FuaXRpemVkIGFuZCByZXBvcnRlZCB0byB0aGUgY2xpZW50IGFzOlwiLCBleGNlcHRpb24uc2FuaXRpemVkRXJyb3IpO1xuICAgICAgTWV0ZW9yLl9kZWJ1ZygpO1xuICAgIH1cbiAgfVxuXG4gIC8vIERpZCB0aGUgZXJyb3IgY29udGFpbiBtb3JlIGRldGFpbHMgdGhhdCBjb3VsZCBoYXZlIGJlZW4gdXNlZnVsIGlmIGNhdWdodCBpblxuICAvLyBzZXJ2ZXIgY29kZSAob3IgaWYgdGhyb3duIGZyb20gbm9uLWNsaWVudC1vcmlnaW5hdGVkIGNvZGUpLCBidXQgYWxzb1xuICAvLyBwcm92aWRlZCBhIFwic2FuaXRpemVkXCIgdmVyc2lvbiB3aXRoIG1vcmUgY29udGV4dCB0aGFuIDUwMCBJbnRlcm5hbCBzZXJ2ZXJcbiAgLy8gZXJyb3I/IFVzZSB0aGF0LlxuICBpZiAoZXhjZXB0aW9uLnNhbml0aXplZEVycm9yKSB7XG4gICAgaWYgKGV4Y2VwdGlvbi5zYW5pdGl6ZWRFcnJvci5pc0NsaWVudFNhZmUpXG4gICAgICByZXR1cm4gZXhjZXB0aW9uLnNhbml0aXplZEVycm9yO1xuICAgIE1ldGVvci5fZGVidWcoXCJFeGNlcHRpb24gXCIgKyBjb250ZXh0ICsgXCIgcHJvdmlkZXMgYSBzYW5pdGl6ZWRFcnJvciB0aGF0IFwiICtcbiAgICAgICAgICAgICAgICAgIFwiZG9lcyBub3QgaGF2ZSBpc0NsaWVudFNhZmUgcHJvcGVydHkgc2V0OyBpZ25vcmluZ1wiKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgTWV0ZW9yLkVycm9yKDUwMCwgXCJJbnRlcm5hbCBzZXJ2ZXIgZXJyb3JcIik7XG59O1xuXG5cbi8vIEF1ZGl0IGFyZ3VtZW50IGNoZWNrcywgaWYgdGhlIGF1ZGl0LWFyZ3VtZW50LWNoZWNrcyBwYWNrYWdlIGV4aXN0cyAoaXQgaXMgYVxuLy8gd2VhayBkZXBlbmRlbmN5IG9mIHRoaXMgcGFja2FnZSkuXG52YXIgbWF5YmVBdWRpdEFyZ3VtZW50Q2hlY2tzID0gZnVuY3Rpb24gKGYsIGNvbnRleHQsIGFyZ3MsIGRlc2NyaXB0aW9uKSB7XG4gIGFyZ3MgPSBhcmdzIHx8IFtdO1xuICBpZiAoUGFja2FnZVsnYXVkaXQtYXJndW1lbnQtY2hlY2tzJ10pIHtcbiAgICByZXR1cm4gTWF0Y2guX2ZhaWxJZkFyZ3VtZW50c0FyZU5vdEFsbENoZWNrZWQoXG4gICAgICBmLCBjb250ZXh0LCBhcmdzLCBkZXNjcmlwdGlvbik7XG4gIH1cbiAgcmV0dXJuIGYuYXBwbHkoY29udGV4dCwgYXJncyk7XG59O1xuIiwidmFyIEZ1dHVyZSA9IE5wbS5yZXF1aXJlKCdmaWJlcnMvZnV0dXJlJyk7XG5cbi8vIEEgd3JpdGUgZmVuY2UgY29sbGVjdHMgYSBncm91cCBvZiB3cml0ZXMsIGFuZCBwcm92aWRlcyBhIGNhbGxiYWNrXG4vLyB3aGVuIGFsbCBvZiB0aGUgd3JpdGVzIGFyZSBmdWxseSBjb21taXR0ZWQgYW5kIHByb3BhZ2F0ZWQgKGFsbFxuLy8gb2JzZXJ2ZXJzIGhhdmUgYmVlbiBub3RpZmllZCBvZiB0aGUgd3JpdGUgYW5kIGFja25vd2xlZGdlZCBpdC4pXG4vL1xuRERQU2VydmVyLl9Xcml0ZUZlbmNlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgc2VsZi5hcm1lZCA9IGZhbHNlO1xuICBzZWxmLmZpcmVkID0gZmFsc2U7XG4gIHNlbGYucmV0aXJlZCA9IGZhbHNlO1xuICBzZWxmLm91dHN0YW5kaW5nX3dyaXRlcyA9IDA7XG4gIHNlbGYuYmVmb3JlX2ZpcmVfY2FsbGJhY2tzID0gW107XG4gIHNlbGYuY29tcGxldGlvbl9jYWxsYmFja3MgPSBbXTtcbn07XG5cbi8vIFRoZSBjdXJyZW50IHdyaXRlIGZlbmNlLiBXaGVuIHRoZXJlIGlzIGEgY3VycmVudCB3cml0ZSBmZW5jZSwgY29kZVxuLy8gdGhhdCB3cml0ZXMgdG8gZGF0YWJhc2VzIHNob3VsZCByZWdpc3RlciB0aGVpciB3cml0ZXMgd2l0aCBpdCB1c2luZ1xuLy8gYmVnaW5Xcml0ZSgpLlxuLy9cbkREUFNlcnZlci5fQ3VycmVudFdyaXRlRmVuY2UgPSBuZXcgTWV0ZW9yLkVudmlyb25tZW50VmFyaWFibGU7XG5cbl8uZXh0ZW5kKEREUFNlcnZlci5fV3JpdGVGZW5jZS5wcm90b3R5cGUsIHtcbiAgLy8gU3RhcnQgdHJhY2tpbmcgYSB3cml0ZSwgYW5kIHJldHVybiBhbiBvYmplY3QgdG8gcmVwcmVzZW50IGl0LiBUaGVcbiAgLy8gb2JqZWN0IGhhcyBhIHNpbmdsZSBtZXRob2QsIGNvbW1pdHRlZCgpLiBUaGlzIG1ldGhvZCBzaG91bGQgYmVcbiAgLy8gY2FsbGVkIHdoZW4gdGhlIHdyaXRlIGlzIGZ1bGx5IGNvbW1pdHRlZCBhbmQgcHJvcGFnYXRlZC4gWW91IGNhblxuICAvLyBjb250aW51ZSB0byBhZGQgd3JpdGVzIHRvIHRoZSBXcml0ZUZlbmNlIHVwIHVudGlsIGl0IGlzIHRyaWdnZXJlZFxuICAvLyAoY2FsbHMgaXRzIGNhbGxiYWNrcyBiZWNhdXNlIGFsbCB3cml0ZXMgaGF2ZSBjb21taXR0ZWQuKVxuICBiZWdpbldyaXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHNlbGYucmV0aXJlZClcbiAgICAgIHJldHVybiB7IGNvbW1pdHRlZDogZnVuY3Rpb24gKCkge30gfTtcblxuICAgIGlmIChzZWxmLmZpcmVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZmVuY2UgaGFzIGFscmVhZHkgYWN0aXZhdGVkIC0tIHRvbyBsYXRlIHRvIGFkZCB3cml0ZXNcIik7XG5cbiAgICBzZWxmLm91dHN0YW5kaW5nX3dyaXRlcysrO1xuICAgIHZhciBjb21taXR0ZWQgPSBmYWxzZTtcbiAgICByZXR1cm4ge1xuICAgICAgY29tbWl0dGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChjb21taXR0ZWQpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiY29tbWl0dGVkIGNhbGxlZCB0d2ljZSBvbiB0aGUgc2FtZSB3cml0ZVwiKTtcbiAgICAgICAgY29tbWl0dGVkID0gdHJ1ZTtcbiAgICAgICAgc2VsZi5vdXRzdGFuZGluZ193cml0ZXMtLTtcbiAgICAgICAgc2VsZi5fbWF5YmVGaXJlKCk7XG4gICAgICB9XG4gICAgfTtcbiAgfSxcblxuICAvLyBBcm0gdGhlIGZlbmNlLiBPbmNlIHRoZSBmZW5jZSBpcyBhcm1lZCwgYW5kIHRoZXJlIGFyZSBubyBtb3JlXG4gIC8vIHVuY29tbWl0dGVkIHdyaXRlcywgaXQgd2lsbCBhY3RpdmF0ZS5cbiAgYXJtOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmID09PSBERFBTZXJ2ZXIuX0N1cnJlbnRXcml0ZUZlbmNlLmdldCgpKVxuICAgICAgdGhyb3cgRXJyb3IoXCJDYW4ndCBhcm0gdGhlIGN1cnJlbnQgZmVuY2VcIik7XG4gICAgc2VsZi5hcm1lZCA9IHRydWU7XG4gICAgc2VsZi5fbWF5YmVGaXJlKCk7XG4gIH0sXG5cbiAgLy8gUmVnaXN0ZXIgYSBmdW5jdGlvbiB0byBiZSBjYWxsZWQgb25jZSBiZWZvcmUgZmlyaW5nIHRoZSBmZW5jZS5cbiAgLy8gQ2FsbGJhY2sgZnVuY3Rpb24gY2FuIGFkZCBuZXcgd3JpdGVzIHRvIHRoZSBmZW5jZSwgaW4gd2hpY2ggY2FzZVxuICAvLyBpdCB3b24ndCBmaXJlIHVudGlsIHRob3NlIHdyaXRlcyBhcmUgZG9uZSBhcyB3ZWxsLlxuICBvbkJlZm9yZUZpcmU6IGZ1bmN0aW9uIChmdW5jKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLmZpcmVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZmVuY2UgaGFzIGFscmVhZHkgYWN0aXZhdGVkIC0tIHRvbyBsYXRlIHRvIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICBcImFkZCBhIGNhbGxiYWNrXCIpO1xuICAgIHNlbGYuYmVmb3JlX2ZpcmVfY2FsbGJhY2tzLnB1c2goZnVuYyk7XG4gIH0sXG5cbiAgLy8gUmVnaXN0ZXIgYSBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgZmVuY2UgZmlyZXMuXG4gIG9uQWxsQ29tbWl0dGVkOiBmdW5jdGlvbiAoZnVuYykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5maXJlZClcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImZlbmNlIGhhcyBhbHJlYWR5IGFjdGl2YXRlZCAtLSB0b28gbGF0ZSB0byBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgXCJhZGQgYSBjYWxsYmFja1wiKTtcbiAgICBzZWxmLmNvbXBsZXRpb25fY2FsbGJhY2tzLnB1c2goZnVuYyk7XG4gIH0sXG5cbiAgLy8gQ29udmVuaWVuY2UgZnVuY3Rpb24uIEFybXMgdGhlIGZlbmNlLCB0aGVuIGJsb2NrcyB1bnRpbCBpdCBmaXJlcy5cbiAgYXJtQW5kV2FpdDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZnV0dXJlID0gbmV3IEZ1dHVyZTtcbiAgICBzZWxmLm9uQWxsQ29tbWl0dGVkKGZ1bmN0aW9uICgpIHtcbiAgICAgIGZ1dHVyZVsncmV0dXJuJ10oKTtcbiAgICB9KTtcbiAgICBzZWxmLmFybSgpO1xuICAgIGZ1dHVyZS53YWl0KCk7XG4gIH0sXG5cbiAgX21heWJlRmlyZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5maXJlZClcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIndyaXRlIGZlbmNlIGFscmVhZHkgYWN0aXZhdGVkP1wiKTtcbiAgICBpZiAoc2VsZi5hcm1lZCAmJiAhc2VsZi5vdXRzdGFuZGluZ193cml0ZXMpIHtcbiAgICAgIGZ1bmN0aW9uIGludm9rZUNhbGxiYWNrIChmdW5jKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgZnVuYyhzZWxmKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgTWV0ZW9yLl9kZWJ1ZyhcImV4Y2VwdGlvbiBpbiB3cml0ZSBmZW5jZSBjYWxsYmFja1wiLCBlcnIpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHNlbGYub3V0c3RhbmRpbmdfd3JpdGVzKys7XG4gICAgICB3aGlsZSAoc2VsZi5iZWZvcmVfZmlyZV9jYWxsYmFja3MubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgY2FsbGJhY2tzID0gc2VsZi5iZWZvcmVfZmlyZV9jYWxsYmFja3M7XG4gICAgICAgIHNlbGYuYmVmb3JlX2ZpcmVfY2FsbGJhY2tzID0gW107XG4gICAgICAgIF8uZWFjaChjYWxsYmFja3MsIGludm9rZUNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIHNlbGYub3V0c3RhbmRpbmdfd3JpdGVzLS07XG5cbiAgICAgIGlmICghc2VsZi5vdXRzdGFuZGluZ193cml0ZXMpIHtcbiAgICAgICAgc2VsZi5maXJlZCA9IHRydWU7XG4gICAgICAgIHZhciBjYWxsYmFja3MgPSBzZWxmLmNvbXBsZXRpb25fY2FsbGJhY2tzO1xuICAgICAgICBzZWxmLmNvbXBsZXRpb25fY2FsbGJhY2tzID0gW107XG4gICAgICAgIF8uZWFjaChjYWxsYmFja3MsIGludm9rZUNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgLy8gRGVhY3RpdmF0ZSB0aGlzIGZlbmNlIHNvIHRoYXQgYWRkaW5nIG1vcmUgd3JpdGVzIGhhcyBubyBlZmZlY3QuXG4gIC8vIFRoZSBmZW5jZSBtdXN0IGhhdmUgYWxyZWFkeSBmaXJlZC5cbiAgcmV0aXJlOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghIHNlbGYuZmlyZWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCByZXRpcmUgYSBmZW5jZSB0aGF0IGhhc24ndCBmaXJlZC5cIik7XG4gICAgc2VsZi5yZXRpcmVkID0gdHJ1ZTtcbiAgfVxufSk7XG4iLCIvLyBBIFwiY3Jvc3NiYXJcIiBpcyBhIGNsYXNzIHRoYXQgcHJvdmlkZXMgc3RydWN0dXJlZCBub3RpZmljYXRpb24gcmVnaXN0cmF0aW9uLlxuLy8gU2VlIF9tYXRjaCBmb3IgdGhlIGRlZmluaXRpb24gb2YgaG93IGEgbm90aWZpY2F0aW9uIG1hdGNoZXMgYSB0cmlnZ2VyLlxuLy8gQWxsIG5vdGlmaWNhdGlvbnMgYW5kIHRyaWdnZXJzIG11c3QgaGF2ZSBhIHN0cmluZyBrZXkgbmFtZWQgJ2NvbGxlY3Rpb24nLlxuXG5ERFBTZXJ2ZXIuX0Nyb3NzYmFyID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICBzZWxmLm5leHRJZCA9IDE7XG4gIC8vIG1hcCBmcm9tIGNvbGxlY3Rpb24gbmFtZSAoc3RyaW5nKSAtPiBsaXN0ZW5lciBpZCAtPiBvYmplY3QuIGVhY2ggb2JqZWN0IGhhc1xuICAvLyBrZXlzICd0cmlnZ2VyJywgJ2NhbGxiYWNrJy4gIEFzIGEgaGFjaywgdGhlIGVtcHR5IHN0cmluZyBtZWFucyBcIm5vXG4gIC8vIGNvbGxlY3Rpb25cIi5cbiAgc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb24gPSB7fTtcbiAgc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb25Db3VudCA9IHt9O1xuICBzZWxmLmZhY3RQYWNrYWdlID0gb3B0aW9ucy5mYWN0UGFja2FnZSB8fCBcImxpdmVkYXRhXCI7XG4gIHNlbGYuZmFjdE5hbWUgPSBvcHRpb25zLmZhY3ROYW1lIHx8IG51bGw7XG59O1xuXG5fLmV4dGVuZChERFBTZXJ2ZXIuX0Nyb3NzYmFyLnByb3RvdHlwZSwge1xuICAvLyBtc2cgaXMgYSB0cmlnZ2VyIG9yIGEgbm90aWZpY2F0aW9uXG4gIF9jb2xsZWN0aW9uRm9yTWVzc2FnZTogZnVuY3Rpb24gKG1zZykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoISBfLmhhcyhtc2csICdjb2xsZWN0aW9uJykpIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9IGVsc2UgaWYgKHR5cGVvZihtc2cuY29sbGVjdGlvbikgPT09ICdzdHJpbmcnKSB7XG4gICAgICBpZiAobXNnLmNvbGxlY3Rpb24gPT09ICcnKVxuICAgICAgICB0aHJvdyBFcnJvcihcIk1lc3NhZ2UgaGFzIGVtcHR5IGNvbGxlY3Rpb24hXCIpO1xuICAgICAgcmV0dXJuIG1zZy5jb2xsZWN0aW9uO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBFcnJvcihcIk1lc3NhZ2UgaGFzIG5vbi1zdHJpbmcgY29sbGVjdGlvbiFcIik7XG4gICAgfVxuICB9LFxuXG4gIC8vIExpc3RlbiBmb3Igbm90aWZpY2F0aW9uIHRoYXQgbWF0Y2ggJ3RyaWdnZXInLiBBIG5vdGlmaWNhdGlvblxuICAvLyBtYXRjaGVzIGlmIGl0IGhhcyB0aGUga2V5LXZhbHVlIHBhaXJzIGluIHRyaWdnZXIgYXMgYVxuICAvLyBzdWJzZXQuIFdoZW4gYSBub3RpZmljYXRpb24gbWF0Y2hlcywgY2FsbCAnY2FsbGJhY2snLCBwYXNzaW5nXG4gIC8vIHRoZSBhY3R1YWwgbm90aWZpY2F0aW9uLlxuICAvL1xuICAvLyBSZXR1cm5zIGEgbGlzdGVuIGhhbmRsZSwgd2hpY2ggaXMgYW4gb2JqZWN0IHdpdGggYSBtZXRob2RcbiAgLy8gc3RvcCgpLiBDYWxsIHN0b3AoKSB0byBzdG9wIGxpc3RlbmluZy5cbiAgLy9cbiAgLy8gWFhYIEl0IHNob3VsZCBiZSBsZWdhbCB0byBjYWxsIGZpcmUoKSBmcm9tIGluc2lkZSBhIGxpc3RlbigpXG4gIC8vIGNhbGxiYWNrP1xuICBsaXN0ZW46IGZ1bmN0aW9uICh0cmlnZ2VyLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgaWQgPSBzZWxmLm5leHRJZCsrO1xuXG4gICAgdmFyIGNvbGxlY3Rpb24gPSBzZWxmLl9jb2xsZWN0aW9uRm9yTWVzc2FnZSh0cmlnZ2VyKTtcbiAgICB2YXIgcmVjb3JkID0ge3RyaWdnZXI6IEVKU09OLmNsb25lKHRyaWdnZXIpLCBjYWxsYmFjazogY2FsbGJhY2t9O1xuICAgIGlmICghIF8uaGFzKHNlbGYubGlzdGVuZXJzQnlDb2xsZWN0aW9uLCBjb2xsZWN0aW9uKSkge1xuICAgICAgc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb25bY29sbGVjdGlvbl0gPSB7fTtcbiAgICAgIHNlbGYubGlzdGVuZXJzQnlDb2xsZWN0aW9uQ291bnRbY29sbGVjdGlvbl0gPSAwO1xuICAgIH1cbiAgICBzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbltjb2xsZWN0aW9uXVtpZF0gPSByZWNvcmQ7XG4gICAgc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb25Db3VudFtjb2xsZWN0aW9uXSsrO1xuXG4gICAgaWYgKHNlbGYuZmFjdE5hbWUgJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddKSB7XG4gICAgICBQYWNrYWdlWydmYWN0cy1iYXNlJ10uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgICAgc2VsZi5mYWN0UGFja2FnZSwgc2VsZi5mYWN0TmFtZSwgMSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHNlbGYuZmFjdE5hbWUgJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddKSB7XG4gICAgICAgICAgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICAgICAgICBzZWxmLmZhY3RQYWNrYWdlLCBzZWxmLmZhY3ROYW1lLCAtMSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIHNlbGYubGlzdGVuZXJzQnlDb2xsZWN0aW9uW2NvbGxlY3Rpb25dW2lkXTtcbiAgICAgICAgc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb25Db3VudFtjb2xsZWN0aW9uXS0tO1xuICAgICAgICBpZiAoc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb25Db3VudFtjb2xsZWN0aW9uXSA9PT0gMCkge1xuICAgICAgICAgIGRlbGV0ZSBzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbltjb2xsZWN0aW9uXTtcbiAgICAgICAgICBkZWxldGUgc2VsZi5saXN0ZW5lcnNCeUNvbGxlY3Rpb25Db3VudFtjb2xsZWN0aW9uXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0sXG5cbiAgLy8gRmlyZSB0aGUgcHJvdmlkZWQgJ25vdGlmaWNhdGlvbicgKGFuIG9iamVjdCB3aG9zZSBhdHRyaWJ1dGVcbiAgLy8gdmFsdWVzIGFyZSBhbGwgSlNPTi1jb21wYXRpYmlsZSkgLS0gaW5mb3JtIGFsbCBtYXRjaGluZyBsaXN0ZW5lcnNcbiAgLy8gKHJlZ2lzdGVyZWQgd2l0aCBsaXN0ZW4oKSkuXG4gIC8vXG4gIC8vIElmIGZpcmUoKSBpcyBjYWxsZWQgaW5zaWRlIGEgd3JpdGUgZmVuY2UsIHRoZW4gZWFjaCBvZiB0aGVcbiAgLy8gbGlzdGVuZXIgY2FsbGJhY2tzIHdpbGwgYmUgY2FsbGVkIGluc2lkZSB0aGUgd3JpdGUgZmVuY2UgYXMgd2VsbC5cbiAgLy9cbiAgLy8gVGhlIGxpc3RlbmVycyBtYXkgYmUgaW52b2tlZCBpbiBwYXJhbGxlbCwgcmF0aGVyIHRoYW4gc2VyaWFsbHkuXG4gIGZpcmU6IGZ1bmN0aW9uIChub3RpZmljYXRpb24pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgY29sbGVjdGlvbiA9IHNlbGYuX2NvbGxlY3Rpb25Gb3JNZXNzYWdlKG5vdGlmaWNhdGlvbik7XG5cbiAgICBpZiAoISBfLmhhcyhzZWxmLmxpc3RlbmVyc0J5Q29sbGVjdGlvbiwgY29sbGVjdGlvbikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgbGlzdGVuZXJzRm9yQ29sbGVjdGlvbiA9IHNlbGYubGlzdGVuZXJzQnlDb2xsZWN0aW9uW2NvbGxlY3Rpb25dO1xuICAgIHZhciBjYWxsYmFja0lkcyA9IFtdO1xuICAgIF8uZWFjaChsaXN0ZW5lcnNGb3JDb2xsZWN0aW9uLCBmdW5jdGlvbiAobCwgaWQpIHtcbiAgICAgIGlmIChzZWxmLl9tYXRjaGVzKG5vdGlmaWNhdGlvbiwgbC50cmlnZ2VyKSkge1xuICAgICAgICBjYWxsYmFja0lkcy5wdXNoKGlkKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIExpc3RlbmVyIGNhbGxiYWNrcyBjYW4geWllbGQsIHNvIHdlIG5lZWQgdG8gZmlyc3QgZmluZCBhbGwgdGhlIG9uZXMgdGhhdFxuICAgIC8vIG1hdGNoIGluIGEgc2luZ2xlIGl0ZXJhdGlvbiBvdmVyIHNlbGYubGlzdGVuZXJzQnlDb2xsZWN0aW9uICh3aGljaCBjYW4ndFxuICAgIC8vIGJlIG11dGF0ZWQgZHVyaW5nIHRoaXMgaXRlcmF0aW9uKSwgYW5kIHRoZW4gaW52b2tlIHRoZSBtYXRjaGluZ1xuICAgIC8vIGNhbGxiYWNrcywgY2hlY2tpbmcgYmVmb3JlIGVhY2ggY2FsbCB0byBlbnN1cmUgdGhleSBoYXZlbid0IHN0b3BwZWQuXG4gICAgLy8gTm90ZSB0aGF0IHdlIGRvbid0IGhhdmUgdG8gY2hlY2sgdGhhdFxuICAgIC8vIHNlbGYubGlzdGVuZXJzQnlDb2xsZWN0aW9uW2NvbGxlY3Rpb25dIHN0aWxsID09PSBsaXN0ZW5lcnNGb3JDb2xsZWN0aW9uLFxuICAgIC8vIGJlY2F1c2UgdGhlIG9ubHkgd2F5IHRoYXQgc3RvcHMgYmVpbmcgdHJ1ZSBpcyBpZiBsaXN0ZW5lcnNGb3JDb2xsZWN0aW9uXG4gICAgLy8gZmlyc3QgZ2V0cyByZWR1Y2VkIGRvd24gdG8gdGhlIGVtcHR5IG9iamVjdCAoYW5kIHRoZW4gbmV2ZXIgZ2V0c1xuICAgIC8vIGluY3JlYXNlZCBhZ2FpbikuXG4gICAgXy5lYWNoKGNhbGxiYWNrSWRzLCBmdW5jdGlvbiAoaWQpIHtcbiAgICAgIGlmIChfLmhhcyhsaXN0ZW5lcnNGb3JDb2xsZWN0aW9uLCBpZCkpIHtcbiAgICAgICAgbGlzdGVuZXJzRm9yQ29sbGVjdGlvbltpZF0uY2FsbGJhY2sobm90aWZpY2F0aW9uKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvLyBBIG5vdGlmaWNhdGlvbiBtYXRjaGVzIGEgdHJpZ2dlciBpZiBhbGwga2V5cyB0aGF0IGV4aXN0IGluIGJvdGggYXJlIGVxdWFsLlxuICAvL1xuICAvLyBFeGFtcGxlczpcbiAgLy8gIE46e2NvbGxlY3Rpb246IFwiQ1wifSBtYXRjaGVzIFQ6e2NvbGxlY3Rpb246IFwiQ1wifVxuICAvLyAgICAoYSBub24tdGFyZ2V0ZWQgd3JpdGUgdG8gYSBjb2xsZWN0aW9uIG1hdGNoZXMgYVxuICAvLyAgICAgbm9uLXRhcmdldGVkIHF1ZXJ5KVxuICAvLyAgTjp7Y29sbGVjdGlvbjogXCJDXCIsIGlkOiBcIlhcIn0gbWF0Y2hlcyBUOntjb2xsZWN0aW9uOiBcIkNcIn1cbiAgLy8gICAgKGEgdGFyZ2V0ZWQgd3JpdGUgdG8gYSBjb2xsZWN0aW9uIG1hdGNoZXMgYSBub24tdGFyZ2V0ZWQgcXVlcnkpXG4gIC8vICBOOntjb2xsZWN0aW9uOiBcIkNcIn0gbWF0Y2hlcyBUOntjb2xsZWN0aW9uOiBcIkNcIiwgaWQ6IFwiWFwifVxuICAvLyAgICAoYSBub24tdGFyZ2V0ZWQgd3JpdGUgdG8gYSBjb2xsZWN0aW9uIG1hdGNoZXMgYVxuICAvLyAgICAgdGFyZ2V0ZWQgcXVlcnkpXG4gIC8vICBOOntjb2xsZWN0aW9uOiBcIkNcIiwgaWQ6IFwiWFwifSBtYXRjaGVzIFQ6e2NvbGxlY3Rpb246IFwiQ1wiLCBpZDogXCJYXCJ9XG4gIC8vICAgIChhIHRhcmdldGVkIHdyaXRlIHRvIGEgY29sbGVjdGlvbiBtYXRjaGVzIGEgdGFyZ2V0ZWQgcXVlcnkgdGFyZ2V0ZWRcbiAgLy8gICAgIGF0IHRoZSBzYW1lIGRvY3VtZW50KVxuICAvLyAgTjp7Y29sbGVjdGlvbjogXCJDXCIsIGlkOiBcIlhcIn0gZG9lcyBub3QgbWF0Y2ggVDp7Y29sbGVjdGlvbjogXCJDXCIsIGlkOiBcIllcIn1cbiAgLy8gICAgKGEgdGFyZ2V0ZWQgd3JpdGUgdG8gYSBjb2xsZWN0aW9uIGRvZXMgbm90IG1hdGNoIGEgdGFyZ2V0ZWQgcXVlcnlcbiAgLy8gICAgIHRhcmdldGVkIGF0IGEgZGlmZmVyZW50IGRvY3VtZW50KVxuICBfbWF0Y2hlczogZnVuY3Rpb24gKG5vdGlmaWNhdGlvbiwgdHJpZ2dlcikge1xuICAgIC8vIE1vc3Qgbm90aWZpY2F0aW9ucyB0aGF0IHVzZSB0aGUgY3Jvc3NiYXIgaGF2ZSBhIHN0cmluZyBgY29sbGVjdGlvbmAgYW5kXG4gICAgLy8gbWF5YmUgYW4gYGlkYCB0aGF0IGlzIGEgc3RyaW5nIG9yIE9iamVjdElELiBXZSdyZSBhbHJlYWR5IGRpdmlkaW5nIHVwXG4gICAgLy8gdHJpZ2dlcnMgYnkgY29sbGVjdGlvbiwgYnV0IGxldCdzIGZhc3QtdHJhY2sgXCJub3BlLCBkaWZmZXJlbnQgSURcIiAoYW5kXG4gICAgLy8gYXZvaWQgdGhlIG92ZXJseSBnZW5lcmljIEVKU09OLmVxdWFscykuIFRoaXMgbWFrZXMgYSBub3RpY2VhYmxlXG4gICAgLy8gcGVyZm9ybWFuY2UgZGlmZmVyZW5jZTsgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tZXRlb3IvbWV0ZW9yL3B1bGwvMzY5N1xuICAgIGlmICh0eXBlb2Yobm90aWZpY2F0aW9uLmlkKSA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgdHlwZW9mKHRyaWdnZXIuaWQpID09PSAnc3RyaW5nJyAmJlxuICAgICAgICBub3RpZmljYXRpb24uaWQgIT09IHRyaWdnZXIuaWQpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKG5vdGlmaWNhdGlvbi5pZCBpbnN0YW5jZW9mIE1vbmdvSUQuT2JqZWN0SUQgJiZcbiAgICAgICAgdHJpZ2dlci5pZCBpbnN0YW5jZW9mIE1vbmdvSUQuT2JqZWN0SUQgJiZcbiAgICAgICAgISBub3RpZmljYXRpb24uaWQuZXF1YWxzKHRyaWdnZXIuaWQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIF8uYWxsKHRyaWdnZXIsIGZ1bmN0aW9uICh0cmlnZ2VyVmFsdWUsIGtleSkge1xuICAgICAgcmV0dXJuICFfLmhhcyhub3RpZmljYXRpb24sIGtleSkgfHxcbiAgICAgICAgRUpTT04uZXF1YWxzKHRyaWdnZXJWYWx1ZSwgbm90aWZpY2F0aW9uW2tleV0pO1xuICAgIH0pO1xuICB9XG59KTtcblxuLy8gVGhlIFwiaW52YWxpZGF0aW9uIGNyb3NzYmFyXCIgaXMgYSBzcGVjaWZpYyBpbnN0YW5jZSB1c2VkIGJ5IHRoZSBERFAgc2VydmVyIHRvXG4vLyBpbXBsZW1lbnQgd3JpdGUgZmVuY2Ugbm90aWZpY2F0aW9ucy4gTGlzdGVuZXIgY2FsbGJhY2tzIG9uIHRoaXMgY3Jvc3NiYXJcbi8vIHNob3VsZCBjYWxsIGJlZ2luV3JpdGUgb24gdGhlIGN1cnJlbnQgd3JpdGUgZmVuY2UgYmVmb3JlIHRoZXkgcmV0dXJuLCBpZiB0aGV5XG4vLyB3YW50IHRvIGRlbGF5IHRoZSB3cml0ZSBmZW5jZSBmcm9tIGZpcmluZyAoaWUsIHRoZSBERFAgbWV0aG9kLWRhdGEtdXBkYXRlZFxuLy8gbWVzc2FnZSBmcm9tIGJlaW5nIHNlbnQpLlxuRERQU2VydmVyLl9JbnZhbGlkYXRpb25Dcm9zc2JhciA9IG5ldyBERFBTZXJ2ZXIuX0Nyb3NzYmFyKHtcbiAgZmFjdE5hbWU6IFwiaW52YWxpZGF0aW9uLWNyb3NzYmFyLWxpc3RlbmVyc1wiXG59KTtcbiIsImlmIChwcm9jZXNzLmVudi5ERFBfREVGQVVMVF9DT05ORUNUSU9OX1VSTCkge1xuICBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLkREUF9ERUZBVUxUX0NPTk5FQ1RJT05fVVJMID1cbiAgICBwcm9jZXNzLmVudi5ERFBfREVGQVVMVF9DT05ORUNUSU9OX1VSTDtcbn1cblxuTWV0ZW9yLnNlcnZlciA9IG5ldyBTZXJ2ZXI7XG5cbk1ldGVvci5yZWZyZXNoID0gZnVuY3Rpb24gKG5vdGlmaWNhdGlvbikge1xuICBERFBTZXJ2ZXIuX0ludmFsaWRhdGlvbkNyb3NzYmFyLmZpcmUobm90aWZpY2F0aW9uKTtcbn07XG5cbi8vIFByb3h5IHRoZSBwdWJsaWMgbWV0aG9kcyBvZiBNZXRlb3Iuc2VydmVyIHNvIHRoZXkgY2FuXG4vLyBiZSBjYWxsZWQgZGlyZWN0bHkgb24gTWV0ZW9yLlxuXy5lYWNoKFsncHVibGlzaCcsICdtZXRob2RzJywgJ2NhbGwnLCAnYXBwbHknLCAnb25Db25uZWN0aW9uJywgJ29uTWVzc2FnZSddLFxuICAgICAgIGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICBNZXRlb3JbbmFtZV0gPSBfLmJpbmQoTWV0ZW9yLnNlcnZlcltuYW1lXSwgTWV0ZW9yLnNlcnZlcik7XG4gICAgICAgfSk7XG5cbi8vIE1ldGVvci5zZXJ2ZXIgdXNlZCB0byBiZSBjYWxsZWQgTWV0ZW9yLmRlZmF1bHRfc2VydmVyLiBQcm92aWRlXG4vLyBiYWNrY29tcGF0IGFzIGEgY291cnRlc3kgZXZlbiB0aG91Z2ggaXQgd2FzIG5ldmVyIGRvY3VtZW50ZWQuXG4vLyBYWFggQ09NUEFUIFdJVEggMC42LjRcbk1ldGVvci5kZWZhdWx0X3NlcnZlciA9IE1ldGVvci5zZXJ2ZXI7XG4iXX0=
