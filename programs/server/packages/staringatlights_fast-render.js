(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var InjectData = Package['staringatlights:inject-data'].InjectData;
var Picker = Package['meteorhacks:picker'].Picker;
var MeteorX = Package['lamhieu:meteorx'].MeteorX;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var EJSON = Package.ejson.EJSON;
var _ = Package.underscore._;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var Accounts = Package['accounts-base'].Accounts;
var Random = Package.random.Random;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"staringatlights:fast-render":{"lib":{"server":{"namespace.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/staringatlights_fast-render/lib/server/namespace.js                                             //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
module.export({
  FastRender: () => FastRender
});
const FastRender = {
  _routes: [],
  _onAllRoutes: []
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"utils.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/staringatlights_fast-render/lib/server/utils.js                                                 //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
module.export({
  IsAppUrl: () => IsAppUrl
});
let RoutePolicy;
module.link("meteor/routepolicy", {
  RoutePolicy(v) {
    RoutePolicy = v;
  }

}, 0);

const IsAppUrl = function (req) {
  var url = req.url;

  if (url === '/favicon.ico' || url === '/robots.txt') {
    return false;
  } // NOTE: app.manifest is not a web standard like favicon.ico and
  // robots.txt. It is a file name we have chosen to use for HTML5
  // appcache URLs. It is included here to prevent using an appcache
  // then removing it from poisoning an app permanently. Eventually,
  // once we have server side routing, this won't be needed as
  // unknown URLs with return a 404 automatically.


  if (url === '/app.manifest') {
    return false;
  } // Avoid serving app HTML for declared routes such as /sockjs/.


  if (RoutePolicy.classify(url)) {
    return false;
  } // we only need to support HTML pages only
  // this is a check to do it


  return /html/.test(req.headers['accept']);
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"routes.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/staringatlights_fast-render/lib/server/routes.js                                                //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
let Fiber;
module.link("fibers", {
  default(v) {
    Fiber = v;
  }

}, 0);
let FastRender;
module.link("./namespace", {
  FastRender(v) {
    FastRender = v;
  }

}, 1);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 2);
let Picker;
module.link("meteor/meteorhacks:picker", {
  Picker(v) {
    Picker = v;
  }

}, 3);
let InjectData;
module.link("meteor/staringatlights:inject-data", {
  InjectData(v) {
    InjectData = v;
  }

}, 4);
let PublishContext;
module.link("./publish_context", {
  default(v) {
    PublishContext = v;
  }

}, 5);
let IsAppUrl;
module.link("./utils", {
  IsAppUrl(v) {
    IsAppUrl = v;
  }

}, 6);

let _;

module.link("meteor/underscore", {
  _(v) {
    _ = v;
  }

}, 7);
let connect;
module.link("connect", {
  default(v) {
    connect = v;
  }

}, 8);
FastRender._onAllRoutes = [];
FastRender.frContext = new Meteor.EnvironmentVariable();
var fastRenderRoutes = Picker.filter(function (req, res) {
  return IsAppUrl(req);
});
fastRenderRoutes.middleware(connect.cookieParser());
fastRenderRoutes.middleware(function (req, res, next) {
  FastRender.handleOnAllRoutes(req, res, next);
}); // handling specific routes

FastRender.route = function route(path, callback) {
  if (path.indexOf('/') !== 0) {
    throw new Error('Error: path (' + path + ') must begin with a leading slash "/"');
  }

  fastRenderRoutes.route(path, FastRender.handleRoute.bind(null, callback));
};

function setQueryDataCallback(req, next) {
  return function (queryData) {
    if (!queryData) return next();
    var existingPayload = InjectData.getData(req, 'fast-render-data');

    if (!existingPayload) {
      InjectData.pushData(req, 'fast-render-data', queryData);
    } else {
      // it's possible to execute this callback twice
      // the we need to merge exisitng data with the new one
      _.extend(existingPayload.subscriptions, queryData.subscriptions);

      _.each(queryData.collectionData, function (data, pubName) {
        var existingData = existingPayload.collectionData[pubName];

        if (existingData) {
          data = existingData.concat(data);
        }

        existingPayload.collectionData[pubName] = data;
        InjectData.pushData(req, 'fast-render-data', existingPayload);
      });
    }

    next();
  };
}

FastRender.handleRoute = function (processingCallback, params, req, res, next) {
  var afterProcessed = setQueryDataCallback(req, next);

  FastRender._processRoutes(params, req, processingCallback, afterProcessed);
};

FastRender.handleOnAllRoutes = function (req, res, next) {
  var afterProcessed = setQueryDataCallback(req, next);

  FastRender._processAllRoutes(req, afterProcessed);
};

FastRender.onAllRoutes = function onAllRoutes(callback) {
  FastRender._onAllRoutes.push(callback);
};

FastRender._processRoutes = function _processRoutes(params, req, routeCallback, callback) {
  callback = callback || function () {};

  var path = req.url;
  var loginToken = req.cookies['meteor_login_token'];
  var headers = req.headers;
  var context = new FastRender._Context(loginToken, {
    headers: headers
  });

  try {
    FastRender.frContext.withValue(context, function () {
      routeCallback.call(context, params, path);
    });

    if (context.stop) {
      return;
    }

    callback(context.getData());
  } catch (err) {
    handleError(err, path, callback);
  }
};

FastRender._processAllRoutes = function _processAllRoutes(req, callback) {
  callback = callback || function () {};

  var path = req.url;
  var loginToken = req.cookies['meteor_login_token'];
  var headers = req.headers;
  new Fiber(function () {
    var context = new FastRender._Context(loginToken, {
      headers: headers
    });

    try {
      FastRender._onAllRoutes.forEach(function (callback) {
        callback.call(context, req.url);
      });

      callback(context.getData());
    } catch (err) {
      handleError(err, path, callback);
    }
  }).run();
};

function handleError(err, path, callback) {
  var message = 'error on fast-rendering path: ' + path + ' ; error: ' + err.stack;
  console.error(message);
  callback(null);
} // adding support for null publications


FastRender.onAllRoutes(function () {
  var context = this;
  var nullHandlers = Meteor.default_server.universal_publish_handlers;

  if (nullHandlers) {
    nullHandlers.forEach(function (publishHandler) {
      // universal subs have subscription ID, params, and name undefined
      var publishContext = new PublishContext(context, publishHandler);
      context.processPublication(publishContext);
    });
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publish_context.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/staringatlights_fast-render/lib/server/publish_context.js                                       //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
let Random;
module.link("meteor/random", {
  Random(v) {
    Random = v;
  }

}, 0);
let EJSON;
module.link("meteor/ejson", {
  EJSON(v) {
    EJSON = v;
  }

}, 1);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 2);

let _;

module.link("meteor/underscore", {
  _(v) {
    _ = v;
  }

}, 3);
let MeteorX;
module.link("meteor/lamhieu:meteorx", {
  MeteorX(v) {
    MeteorX = v;
  }

}, 4);

const PublishContext = function PublishContext(context, handler, subscriptionId, params, name) {
  var self = this; // mock session

  var sessionId = Random.id();
  var session = {
    id: sessionId,
    userId: context.userId,
    // not null
    inQueue: {},
    connectionHandle: {
      id: sessionId,
      close: function () {},
      onClose: function () {},
      clientAddress: '127.0.0.1',
      httpHeaders: context.headers
    },
    added: function (subscriptionHandle, collectionName, strId, fields) {
      // Don't share state with the data passed in by the user.
      var doc = EJSON.clone(fields);
      doc._id = self._idFilter.idParse(strId);
      Meteor._ensure(self._collectionData, collectionName)[strId] = doc;
    },
    changed: function (subscriptionHandle, collectionName, strId, fields) {
      var doc = self._collectionData[collectionName][strId];

      if (!doc) {
        throw new Error('Could not find element with id ' + strId + ' to change');
      }

      _.each(fields, function (value, key) {
        // Publish API ignores _id if present in fields.
        if (key === '_id') return;

        if (value === undefined) {
          delete doc[key];
        } else {
          // Don't share state with the data passed in by the user.
          doc[key] = EJSON.clone(value);
        }
      });
    },
    removed: function (subscriptionHandle, collectionName, strId) {
      if (!(self._collectionData[collectionName] && self._collectionData[collectionName][strId])) {
        throw new Error('Removed nonexistent document ' + strId);
      }

      delete self._collectionData[collectionName][strId];
    },
    sendReady: function (subscriptionIds) {
      // this is called only for non-universal subscriptions
      if (!self._subscriptionId) throw new Error('Assertion.'); // make the subscription be marked as ready

      if (!self._isDeactivated()) {
        self._context.completeSubscriptions(self._name, self._params);
      } // we just stop it


      self.stop();
    }
  };
  MeteorX.Subscription.call(self, session, handler, subscriptionId, params, name);

  self.unblock = function () {};

  self._context = context;
  self._collectionData = {};
};

PublishContext.prototype = Object.create(MeteorX.Subscription.prototype);
PublishContext.prototype.constructor = PublishContext;

PublishContext.prototype.stop = function () {
  // our stop does not remove all documents (it just calls deactivate)
  // Meteor one removes documents for non-universal subscription
  // we deactivate both for universal and named subscriptions
  // hopefully this is right in our case
  // Meteor does it just for named subscriptions
  this._deactivate();
};

PublishContext.prototype.error = function (error) {
  // TODO: Should we pass the error to the subscription somehow?
  console.warn('error caught on publication: ', this._name, ': ', error.message || error);
  this.stop();
};

module.exportDefault(PublishContext);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"context.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/staringatlights_fast-render/lib/server/context.js                                               //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Fibers;
module.link("fibers", {
  default(v) {
    Fibers = v;
  }

}, 1);
let Future;
module.link("fibers/future", {
  default(v) {
    Future = v;
  }

}, 2);
let Accounts;
module.link("meteor/accounts-base", {
  Accounts(v) {
    Accounts = v;
  }

}, 3);
let DDP;
module.link("meteor/ddp", {
  DDP(v) {
    DDP = v;
  }

}, 4);
let Random;
module.link("meteor/random", {
  Random(v) {
    Random = v;
  }

}, 5);
let PublishContext;
module.link("./publish_context", {
  default(v) {
    PublishContext = v;
  }

}, 6);

let _;

module.link("meteor/underscore", {
  _(v) {
    _ = v;
  }

}, 7);
let EJSON;
module.link("meteor/ejson", {
  EJSON(v) {
    EJSON = v;
  }

}, 8);
let FastRender;
module.link("./namespace", {
  FastRender(v) {
    FastRender = v;
  }

}, 9);

const Context = function Context(loginToken, otherParams) {
  this._collectionData = {};
  this._subscriptions = {};
  this._loginToken = loginToken;

  _.extend(this, otherParams); // get the user


  if (Meteor.users) {
    // check to make sure, we've the loginToken,
    // otherwise a random user will fetched from the db
    if (loginToken) {
      var hashedToken = loginToken && Accounts._hashLoginToken(loginToken);

      var query = {
        'services.resume.loginTokens.hashedToken': hashedToken
      };
      var options = {
        fields: {
          _id: 1
        }
      };
      var user = Meteor.users.findOne(query, options);
    } // support for Meteor.user


    Fibers.current._meteor_dynamics = [];
    Fibers.current._meteor_dynamics[DDP._CurrentInvocation.slot] = this;

    if (user) {
      this.userId = user._id;
    }
  }
};

Context.prototype.subscribe = function (subName
/*, params */
) {
  var publishHandler = Meteor.default_server.publish_handlers[subName];

  if (publishHandler) {
    var params = Array.prototype.slice.call(arguments, 1); // non-universal subs have subscription id

    var subscriptionId = Random.id();
    var publishContext = new PublishContext(this, publishHandler, subscriptionId, params, subName);
    return this.processPublication(publishContext);
  } else {
    console.warn('There is no such publish handler named:', subName);
    return {};
  }
};

Context.prototype.processPublication = function (publishContext) {
  var self = this;
  var data = {};

  var ensureCollection = function (collectionName) {
    self._ensureCollection(collectionName);

    if (!data[collectionName]) {
      data[collectionName] = [];
    }
  };

  var future = new Future(); // detect when the context is ready to be sent to the client

  publishContext.onStop(function () {
    if (!future.isResolved()) {
      future.return();
    }
  });

  publishContext._runHandler();

  if (!publishContext._subscriptionId) {
    // universal subscription, we stop it (same as marking it as ready) ourselves
    // they otherwise do not have ready or stopped state, but in our case they do
    publishContext.stop();
  }

  if (!future.isResolved()) {
    // don't wait forever for handler to fire ready()
    Meteor.setTimeout(function () {
      if (!future.isResolved()) {
        // publish handler failed to send ready signal in time
        // maybe your non-universal publish handler is not calling this.ready()?
        // or maybe it is returning null to signal empty publish?
        // it should still call this.ready() or return an empty array []
        var message = 'Publish handler for ' + publishContext._name + ' sent no ready signal\n' + ' This could be because this publication `return null`.\n' + ' Use `return this.ready()` instead.';
        console.warn(message);
        future.return();
      }
    }, 500); // arbitrarially set timeout to 500ms, should probably be configurable
    //  wait for the subscription became ready.

    future.wait();
  } // stop any runaway subscription
  // this can happen if a publish handler never calls ready or stop, for example
  // it does not hurt to call it multiple times


  publishContext.stop(); // get the data

  _.each(publishContext._collectionData, function (collData, collectionName) {
    // making an array from a map
    collData = _.values(collData);
    ensureCollection(collectionName);
    data[collectionName].push(collData); // copy the collection data in publish context into the FR context

    self._collectionData[collectionName].push(collData);
  });

  return data;
};

Context.prototype.completeSubscriptions = function (name, params) {
  var subs = this._subscriptions[name];

  if (!subs) {
    subs = this._subscriptions[name] = {};
  }

  if (params && params.length) {
    var lastParam = params[params.length - 1];

    if (lastParam && (lastParam.hasOwnProperty('onStop') || lastParam.hasOwnProperty('onReady'))) {
      params.pop();
    }
  }

  subs[EJSON.stringify(params)] = true;
};

Context.prototype._ensureCollection = function (collectionName) {
  if (!this._collectionData[collectionName]) {
    this._collectionData[collectionName] = [];
  }
};

Context.prototype.getData = function () {
  return {
    collectionData: this._collectionData,
    subscriptions: this._subscriptions,
    loginToken: this._loginToken
  };
};

FastRender._Context = Context;
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ssr_helper.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/staringatlights_fast-render/lib/server/ssr_helper.js                                            //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let FastRender;
module.link("meteor/staringatlights:fast-render", {
  FastRender(v) {
    FastRender = v;
  }

}, 1);
let InjectData;
module.link("meteor/staringatlights:inject-data", {
  InjectData(v) {
    InjectData = v;
  }

}, 2);
let onPageLoad;
module.link("meteor/server-render", {
  onPageLoad(v) {
    onPageLoad = v;
  }

}, 3);

let _;

module.link("meteor/underscore", {
  _(v) {
    _ = v;
  }

}, 4);
const originalSubscribe = Meteor.subscribe;

Meteor.subscribe = function (name, ...args) {
  const frContext = FastRender.frContext.get();

  if (!frContext) {
    throw new Error(`Cannot add a subscription: ${name} without FastRender Context`);
  }

  frContext.subscribe(name, ...args);

  if (originalSubscribe) {
    originalSubscribe.apply(this, arguments);
  }

  return {
    ready: () => true
  };
};

FastRender._mergeFrData = function (req, queryData) {
  var existingPayload = InjectData.getData(req, 'fast-render-data');

  if (!existingPayload) {
    InjectData.pushData(req, 'fast-render-data', queryData);
  } else {
    // it's possible to execute this callback twice
    // the we need to merge exisitng data with the new one
    _.extend(existingPayload.subscriptions, queryData.subscriptions);

    _.each(queryData.collectionData, function (data, pubName) {
      var existingData = existingPayload.collectionData[pubName];

      if (existingData) {
        data = existingData.concat(data);
      }

      existingPayload.collectionData[pubName] = data;
      InjectData.pushData(req, 'fast-render-data', existingPayload);
    });
  }
};

FastRender.onPageLoad = function (callback) {
  InjectData.injectToHead = false;
  onPageLoad(sink => Promise.asyncApply(() => {
    const frContext = new FastRender._Context(sink.request.cookies.meteor_login_token, {
      headers: sink.headers
    });
    Promise.await(FastRender.frContext.withValue(frContext, function () {
      return Promise.asyncApply(() => {
        Promise.await(callback(sink));

        FastRender._mergeFrData(sink.request, FastRender.frContext.get().getData());
      });
    }));
  }));
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"node_modules":{"connect":{"package.json":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// node_modules/meteor/staringatlights_fast-render/node_modules/connect/package.json                        //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
module.exports = {
  "name": "connect",
  "version": "2.13.0",
  "main": "index"
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// node_modules/meteor/staringatlights_fast-render/node_modules/connect/index.js                            //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/staringatlights:fast-render/lib/server/namespace.js");
require("/node_modules/meteor/staringatlights:fast-render/lib/server/utils.js");
require("/node_modules/meteor/staringatlights:fast-render/lib/server/routes.js");
require("/node_modules/meteor/staringatlights:fast-render/lib/server/publish_context.js");
require("/node_modules/meteor/staringatlights:fast-render/lib/server/context.js");
require("/node_modules/meteor/staringatlights:fast-render/lib/server/ssr_helper.js");

/* Exports */
Package._define("staringatlights:fast-render", exports);

})();

//# sourceURL=meteor://💻app/packages/staringatlights_fast-render.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc3RhcmluZ2F0bGlnaHRzOmZhc3QtcmVuZGVyL2xpYi9zZXJ2ZXIvbmFtZXNwYWNlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9zdGFyaW5nYXRsaWdodHM6ZmFzdC1yZW5kZXIvbGliL3NlcnZlci91dGlscy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc3RhcmluZ2F0bGlnaHRzOmZhc3QtcmVuZGVyL2xpYi9zZXJ2ZXIvcm91dGVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9zdGFyaW5nYXRsaWdodHM6ZmFzdC1yZW5kZXIvbGliL3NlcnZlci9wdWJsaXNoX2NvbnRleHQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3N0YXJpbmdhdGxpZ2h0czpmYXN0LXJlbmRlci9saWIvc2VydmVyL2NvbnRleHQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3N0YXJpbmdhdGxpZ2h0czpmYXN0LXJlbmRlci9saWIvc2VydmVyL3Nzcl9oZWxwZXIuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiRmFzdFJlbmRlciIsIl9yb3V0ZXMiLCJfb25BbGxSb3V0ZXMiLCJJc0FwcFVybCIsIlJvdXRlUG9saWN5IiwibGluayIsInYiLCJyZXEiLCJ1cmwiLCJjbGFzc2lmeSIsInRlc3QiLCJoZWFkZXJzIiwiRmliZXIiLCJkZWZhdWx0IiwiTWV0ZW9yIiwiUGlja2VyIiwiSW5qZWN0RGF0YSIsIlB1Ymxpc2hDb250ZXh0IiwiXyIsImNvbm5lY3QiLCJmckNvbnRleHQiLCJFbnZpcm9ubWVudFZhcmlhYmxlIiwiZmFzdFJlbmRlclJvdXRlcyIsImZpbHRlciIsInJlcyIsIm1pZGRsZXdhcmUiLCJjb29raWVQYXJzZXIiLCJuZXh0IiwiaGFuZGxlT25BbGxSb3V0ZXMiLCJyb3V0ZSIsInBhdGgiLCJjYWxsYmFjayIsImluZGV4T2YiLCJFcnJvciIsImhhbmRsZVJvdXRlIiwiYmluZCIsInNldFF1ZXJ5RGF0YUNhbGxiYWNrIiwicXVlcnlEYXRhIiwiZXhpc3RpbmdQYXlsb2FkIiwiZ2V0RGF0YSIsInB1c2hEYXRhIiwiZXh0ZW5kIiwic3Vic2NyaXB0aW9ucyIsImVhY2giLCJjb2xsZWN0aW9uRGF0YSIsImRhdGEiLCJwdWJOYW1lIiwiZXhpc3RpbmdEYXRhIiwiY29uY2F0IiwicHJvY2Vzc2luZ0NhbGxiYWNrIiwicGFyYW1zIiwiYWZ0ZXJQcm9jZXNzZWQiLCJfcHJvY2Vzc1JvdXRlcyIsIl9wcm9jZXNzQWxsUm91dGVzIiwib25BbGxSb3V0ZXMiLCJwdXNoIiwicm91dGVDYWxsYmFjayIsImxvZ2luVG9rZW4iLCJjb29raWVzIiwiY29udGV4dCIsIl9Db250ZXh0Iiwid2l0aFZhbHVlIiwiY2FsbCIsInN0b3AiLCJlcnIiLCJoYW5kbGVFcnJvciIsImZvckVhY2giLCJydW4iLCJtZXNzYWdlIiwic3RhY2siLCJjb25zb2xlIiwiZXJyb3IiLCJudWxsSGFuZGxlcnMiLCJkZWZhdWx0X3NlcnZlciIsInVuaXZlcnNhbF9wdWJsaXNoX2hhbmRsZXJzIiwicHVibGlzaEhhbmRsZXIiLCJwdWJsaXNoQ29udGV4dCIsInByb2Nlc3NQdWJsaWNhdGlvbiIsIlJhbmRvbSIsIkVKU09OIiwiTWV0ZW9yWCIsImhhbmRsZXIiLCJzdWJzY3JpcHRpb25JZCIsIm5hbWUiLCJzZWxmIiwic2Vzc2lvbklkIiwiaWQiLCJzZXNzaW9uIiwidXNlcklkIiwiaW5RdWV1ZSIsImNvbm5lY3Rpb25IYW5kbGUiLCJjbG9zZSIsIm9uQ2xvc2UiLCJjbGllbnRBZGRyZXNzIiwiaHR0cEhlYWRlcnMiLCJhZGRlZCIsInN1YnNjcmlwdGlvbkhhbmRsZSIsImNvbGxlY3Rpb25OYW1lIiwic3RySWQiLCJmaWVsZHMiLCJkb2MiLCJjbG9uZSIsIl9pZCIsIl9pZEZpbHRlciIsImlkUGFyc2UiLCJfZW5zdXJlIiwiX2NvbGxlY3Rpb25EYXRhIiwiY2hhbmdlZCIsInZhbHVlIiwia2V5IiwidW5kZWZpbmVkIiwicmVtb3ZlZCIsInNlbmRSZWFkeSIsInN1YnNjcmlwdGlvbklkcyIsIl9zdWJzY3JpcHRpb25JZCIsIl9pc0RlYWN0aXZhdGVkIiwiX2NvbnRleHQiLCJjb21wbGV0ZVN1YnNjcmlwdGlvbnMiLCJfbmFtZSIsIl9wYXJhbXMiLCJTdWJzY3JpcHRpb24iLCJ1bmJsb2NrIiwicHJvdG90eXBlIiwiT2JqZWN0IiwiY3JlYXRlIiwiY29uc3RydWN0b3IiLCJfZGVhY3RpdmF0ZSIsIndhcm4iLCJleHBvcnREZWZhdWx0IiwiRmliZXJzIiwiRnV0dXJlIiwiQWNjb3VudHMiLCJERFAiLCJDb250ZXh0Iiwib3RoZXJQYXJhbXMiLCJfc3Vic2NyaXB0aW9ucyIsIl9sb2dpblRva2VuIiwidXNlcnMiLCJoYXNoZWRUb2tlbiIsIl9oYXNoTG9naW5Ub2tlbiIsInF1ZXJ5Iiwib3B0aW9ucyIsInVzZXIiLCJmaW5kT25lIiwiY3VycmVudCIsIl9tZXRlb3JfZHluYW1pY3MiLCJfQ3VycmVudEludm9jYXRpb24iLCJzbG90Iiwic3Vic2NyaWJlIiwic3ViTmFtZSIsInB1Ymxpc2hfaGFuZGxlcnMiLCJBcnJheSIsInNsaWNlIiwiYXJndW1lbnRzIiwiZW5zdXJlQ29sbGVjdGlvbiIsIl9lbnN1cmVDb2xsZWN0aW9uIiwiZnV0dXJlIiwib25TdG9wIiwiaXNSZXNvbHZlZCIsInJldHVybiIsIl9ydW5IYW5kbGVyIiwic2V0VGltZW91dCIsIndhaXQiLCJjb2xsRGF0YSIsInZhbHVlcyIsInN1YnMiLCJsZW5ndGgiLCJsYXN0UGFyYW0iLCJoYXNPd25Qcm9wZXJ0eSIsInBvcCIsInN0cmluZ2lmeSIsIm9uUGFnZUxvYWQiLCJvcmlnaW5hbFN1YnNjcmliZSIsImFyZ3MiLCJnZXQiLCJhcHBseSIsInJlYWR5IiwiX21lcmdlRnJEYXRhIiwiaW5qZWN0VG9IZWFkIiwic2luayIsInJlcXVlc3QiLCJtZXRlb3JfbG9naW5fdG9rZW4iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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cEIsRUFBeUIsa0JBQXpCLEVBQTZDK0IsZUFBN0M7QUFDQSxLQVJEO0FBU0E7QUFDRCxDQWxCRDs7QUFvQkF0QyxVQUFVLENBQUMySyxVQUFYLEdBQXdCLFVBQVM1SSxRQUFULEVBQW1CO0FBQzFDZixZQUFVLENBQUNrSyxZQUFYLEdBQTBCLEtBQTFCO0FBQ0FQLFlBQVUsQ0FBT1EsSUFBTiw2QkFBYztBQUN4QixVQUFNL0osU0FBUyxHQUFHLElBQUlwQixVQUFVLENBQUM0RCxRQUFmLENBQ2pCdUgsSUFBSSxDQUFDQyxPQUFMLENBQWExSCxPQUFiLENBQXFCMkgsa0JBREosRUFFakI7QUFDQzFLLGFBQU8sRUFBRXdLLElBQUksQ0FBQ3hLO0FBRGYsS0FGaUIsQ0FBbEI7QUFPQSxrQkFBTVgsVUFBVSxDQUFDb0IsU0FBWCxDQUFxQnlDLFNBQXJCLENBQStCekMsU0FBL0IsRUFBMEM7QUFBQSxzQ0FBaUI7QUFDaEUsc0JBQU1XLFFBQVEsQ0FBQ29KLElBQUQsQ0FBZDs7QUFDQW5MLGtCQUFVLENBQUNpTCxZQUFYLENBQ0NFLElBQUksQ0FBQ0MsT0FETixFQUVDcEwsVUFBVSxDQUFDb0IsU0FBWCxDQUFxQjBKLEdBQXJCLEdBQTJCdkksT0FBM0IsRUFGRDtBQUlBLE9BTitDO0FBQUEsS0FBMUMsQ0FBTjtBQU9BLEdBZlUsQ0FBRCxDQUFWO0FBZ0JBLENBbEJELEMiLCJmaWxlIjoiL3BhY2thZ2VzL3N0YXJpbmdhdGxpZ2h0c19mYXN0LXJlbmRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCBGYXN0UmVuZGVyID0ge1xuXHRfcm91dGVzOiBbXSxcblx0X29uQWxsUm91dGVzOiBbXSxcbn1cbiIsImltcG9ydCB7IFJvdXRlUG9saWN5IH0gZnJvbSAnbWV0ZW9yL3JvdXRlcG9saWN5J1xuXG4vLyBtZXRlb3IgYWxnb3JpdGhtIHRvIGNoZWNrIGlmIHRoaXMgaXMgYSBtZXRlb3Igc2VydmluZyBodHRwIHJlcXVlc3Qgb3Igbm90XG5leHBvcnQgY29uc3QgSXNBcHBVcmwgPSBmdW5jdGlvbihyZXEpIHtcblx0dmFyIHVybCA9IHJlcS51cmxcblx0aWYgKHVybCA9PT0gJy9mYXZpY29uLmljbycgfHwgdXJsID09PSAnL3JvYm90cy50eHQnKSB7XG5cdFx0cmV0dXJuIGZhbHNlXG5cdH1cblxuXHQvLyBOT1RFOiBhcHAubWFuaWZlc3QgaXMgbm90IGEgd2ViIHN0YW5kYXJkIGxpa2UgZmF2aWNvbi5pY28gYW5kXG5cdC8vIHJvYm90cy50eHQuIEl0IGlzIGEgZmlsZSBuYW1lIHdlIGhhdmUgY2hvc2VuIHRvIHVzZSBmb3IgSFRNTDVcblx0Ly8gYXBwY2FjaGUgVVJMcy4gSXQgaXMgaW5jbHVkZWQgaGVyZSB0byBwcmV2ZW50IHVzaW5nIGFuIGFwcGNhY2hlXG5cdC8vIHRoZW4gcmVtb3ZpbmcgaXQgZnJvbSBwb2lzb25pbmcgYW4gYXBwIHBlcm1hbmVudGx5LiBFdmVudHVhbGx5LFxuXHQvLyBvbmNlIHdlIGhhdmUgc2VydmVyIHNpZGUgcm91dGluZywgdGhpcyB3b24ndCBiZSBuZWVkZWQgYXNcblx0Ly8gdW5rbm93biBVUkxzIHdpdGggcmV0dXJuIGEgNDA0IGF1dG9tYXRpY2FsbHkuXG5cdGlmICh1cmwgPT09ICcvYXBwLm1hbmlmZXN0Jykge1xuXHRcdHJldHVybiBmYWxzZVxuXHR9XG5cblx0Ly8gQXZvaWQgc2VydmluZyBhcHAgSFRNTCBmb3IgZGVjbGFyZWQgcm91dGVzIHN1Y2ggYXMgL3NvY2tqcy8uXG5cdGlmIChSb3V0ZVBvbGljeS5jbGFzc2lmeSh1cmwpKSB7XG5cdFx0cmV0dXJuIGZhbHNlXG5cdH1cblxuXHQvLyB3ZSBvbmx5IG5lZWQgdG8gc3VwcG9ydCBIVE1MIHBhZ2VzIG9ubHlcblx0Ly8gdGhpcyBpcyBhIGNoZWNrIHRvIGRvIGl0XG5cdHJldHVybiAvaHRtbC8udGVzdChyZXEuaGVhZGVyc1snYWNjZXB0J10pXG59XG4iLCJpbXBvcnQgRmliZXIgZnJvbSAnZmliZXJzJ1xuaW1wb3J0IHsgRmFzdFJlbmRlciB9IGZyb20gJy4vbmFtZXNwYWNlJ1xuaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcidcbmltcG9ydCB7IFBpY2tlciB9IGZyb20gJ21ldGVvci9tZXRlb3JoYWNrczpwaWNrZXInXG5pbXBvcnQgeyBJbmplY3REYXRhIH0gZnJvbSAnbWV0ZW9yL3N0YXJpbmdhdGxpZ2h0czppbmplY3QtZGF0YSdcbmltcG9ydCBQdWJsaXNoQ29udGV4dCBmcm9tICcuL3B1Ymxpc2hfY29udGV4dCdcbmltcG9ydCB7IElzQXBwVXJsIH0gZnJvbSAnLi91dGlscydcbmltcG9ydCB7IF8gfSBmcm9tICdtZXRlb3IvdW5kZXJzY29yZSdcbmltcG9ydCBjb25uZWN0IGZyb20gJ2Nvbm5lY3QnXG5cbkZhc3RSZW5kZXIuX29uQWxsUm91dGVzID0gW11cbkZhc3RSZW5kZXIuZnJDb250ZXh0ID0gbmV3IE1ldGVvci5FbnZpcm9ubWVudFZhcmlhYmxlKClcblxudmFyIGZhc3RSZW5kZXJSb3V0ZXMgPSBQaWNrZXIuZmlsdGVyKGZ1bmN0aW9uKHJlcSwgcmVzKSB7XG5cdHJldHVybiBJc0FwcFVybChyZXEpXG59KVxuZmFzdFJlbmRlclJvdXRlcy5taWRkbGV3YXJlKGNvbm5lY3QuY29va2llUGFyc2VyKCkpXG5mYXN0UmVuZGVyUm91dGVzLm1pZGRsZXdhcmUoZnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHtcblx0RmFzdFJlbmRlci5oYW5kbGVPbkFsbFJvdXRlcyhyZXEsIHJlcywgbmV4dClcbn0pXG5cbi8vIGhhbmRsaW5nIHNwZWNpZmljIHJvdXRlc1xuRmFzdFJlbmRlci5yb3V0ZSA9IGZ1bmN0aW9uIHJvdXRlKHBhdGgsIGNhbGxiYWNrKSB7XG5cdGlmIChwYXRoLmluZGV4T2YoJy8nKSAhPT0gMCkge1xuXHRcdHRocm93IG5ldyBFcnJvcihcblx0XHRcdCdFcnJvcjogcGF0aCAoJyArIHBhdGggKyAnKSBtdXN0IGJlZ2luIHdpdGggYSBsZWFkaW5nIHNsYXNoIFwiL1wiJ1xuXHRcdClcblx0fVxuXHRmYXN0UmVuZGVyUm91dGVzLnJvdXRlKHBhdGgsIEZhc3RSZW5kZXIuaGFuZGxlUm91dGUuYmluZChudWxsLCBjYWxsYmFjaykpXG59XG5cbmZ1bmN0aW9uIHNldFF1ZXJ5RGF0YUNhbGxiYWNrKHJlcSwgbmV4dCkge1xuXHRyZXR1cm4gZnVuY3Rpb24ocXVlcnlEYXRhKSB7XG5cdFx0aWYgKCFxdWVyeURhdGEpIHJldHVybiBuZXh0KClcblxuXHRcdHZhciBleGlzdGluZ1BheWxvYWQgPSBJbmplY3REYXRhLmdldERhdGEocmVxLCAnZmFzdC1yZW5kZXItZGF0YScpXG5cdFx0aWYgKCFleGlzdGluZ1BheWxvYWQpIHtcblx0XHRcdEluamVjdERhdGEucHVzaERhdGEocmVxLCAnZmFzdC1yZW5kZXItZGF0YScsIHF1ZXJ5RGF0YSlcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gaXQncyBwb3NzaWJsZSB0byBleGVjdXRlIHRoaXMgY2FsbGJhY2sgdHdpY2Vcblx0XHRcdC8vIHRoZSB3ZSBuZWVkIHRvIG1lcmdlIGV4aXNpdG5nIGRhdGEgd2l0aCB0aGUgbmV3IG9uZVxuXHRcdFx0Xy5leHRlbmQoZXhpc3RpbmdQYXlsb2FkLnN1YnNjcmlwdGlvbnMsIHF1ZXJ5RGF0YS5zdWJzY3JpcHRpb25zKVxuXHRcdFx0Xy5lYWNoKHF1ZXJ5RGF0YS5jb2xsZWN0aW9uRGF0YSwgZnVuY3Rpb24oZGF0YSwgcHViTmFtZSkge1xuXHRcdFx0XHR2YXIgZXhpc3RpbmdEYXRhID0gZXhpc3RpbmdQYXlsb2FkLmNvbGxlY3Rpb25EYXRhW3B1Yk5hbWVdXG5cdFx0XHRcdGlmIChleGlzdGluZ0RhdGEpIHtcblx0XHRcdFx0XHRkYXRhID0gZXhpc3RpbmdEYXRhLmNvbmNhdChkYXRhKVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZXhpc3RpbmdQYXlsb2FkLmNvbGxlY3Rpb25EYXRhW3B1Yk5hbWVdID0gZGF0YVxuXHRcdFx0XHRJbmplY3REYXRhLnB1c2hEYXRhKHJlcSwgJ2Zhc3QtcmVuZGVyLWRhdGEnLCBleGlzdGluZ1BheWxvYWQpXG5cdFx0XHR9KVxuXHRcdH1cblx0XHRuZXh0KClcblx0fVxufVxuXG5GYXN0UmVuZGVyLmhhbmRsZVJvdXRlID0gZnVuY3Rpb24ocHJvY2Vzc2luZ0NhbGxiYWNrLCBwYXJhbXMsIHJlcSwgcmVzLCBuZXh0KSB7XG5cdHZhciBhZnRlclByb2Nlc3NlZCA9IHNldFF1ZXJ5RGF0YUNhbGxiYWNrKHJlcSwgbmV4dClcblx0RmFzdFJlbmRlci5fcHJvY2Vzc1JvdXRlcyhwYXJhbXMsIHJlcSwgcHJvY2Vzc2luZ0NhbGxiYWNrLCBhZnRlclByb2Nlc3NlZClcbn1cblxuRmFzdFJlbmRlci5oYW5kbGVPbkFsbFJvdXRlcyA9IGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG5cdHZhciBhZnRlclByb2Nlc3NlZCA9IHNldFF1ZXJ5RGF0YUNhbGxiYWNrKHJlcSwgbmV4dClcblx0RmFzdFJlbmRlci5fcHJvY2Vzc0FsbFJvdXRlcyhyZXEsIGFmdGVyUHJvY2Vzc2VkKVxufVxuXG5GYXN0UmVuZGVyLm9uQWxsUm91dGVzID0gZnVuY3Rpb24gb25BbGxSb3V0ZXMoY2FsbGJhY2spIHtcblx0RmFzdFJlbmRlci5fb25BbGxSb3V0ZXMucHVzaChjYWxsYmFjaylcbn1cblxuRmFzdFJlbmRlci5fcHJvY2Vzc1JvdXRlcyA9IGZ1bmN0aW9uIF9wcm9jZXNzUm91dGVzKFxuXHRwYXJhbXMsXG5cdHJlcSxcblx0cm91dGVDYWxsYmFjayxcblx0Y2FsbGJhY2tcbikge1xuXHRjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uKCkge31cblxuXHR2YXIgcGF0aCA9IHJlcS51cmxcblx0dmFyIGxvZ2luVG9rZW4gPSByZXEuY29va2llc1snbWV0ZW9yX2xvZ2luX3Rva2VuJ11cblx0dmFyIGhlYWRlcnMgPSByZXEuaGVhZGVyc1xuXG5cdHZhciBjb250ZXh0ID0gbmV3IEZhc3RSZW5kZXIuX0NvbnRleHQobG9naW5Ub2tlbiwgeyBoZWFkZXJzOiBoZWFkZXJzIH0pXG5cblx0dHJ5IHtcblx0XHRGYXN0UmVuZGVyLmZyQ29udGV4dC53aXRoVmFsdWUoY29udGV4dCwgZnVuY3Rpb24oKSB7XG5cdFx0XHRyb3V0ZUNhbGxiYWNrLmNhbGwoY29udGV4dCwgcGFyYW1zLCBwYXRoKVxuXHRcdH0pXG5cblx0XHRpZiAoY29udGV4dC5zdG9wKSB7XG5cdFx0XHRyZXR1cm5cblx0XHR9XG5cblx0XHRjYWxsYmFjayhjb250ZXh0LmdldERhdGEoKSlcblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0aGFuZGxlRXJyb3IoZXJyLCBwYXRoLCBjYWxsYmFjaylcblx0fVxufVxuXG5GYXN0UmVuZGVyLl9wcm9jZXNzQWxsUm91dGVzID0gZnVuY3Rpb24gX3Byb2Nlc3NBbGxSb3V0ZXMocmVxLCBjYWxsYmFjaykge1xuXHRjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uKCkge31cblxuXHR2YXIgcGF0aCA9IHJlcS51cmxcblx0dmFyIGxvZ2luVG9rZW4gPSByZXEuY29va2llc1snbWV0ZW9yX2xvZ2luX3Rva2VuJ11cblx0dmFyIGhlYWRlcnMgPSByZXEuaGVhZGVyc1xuXG5cdG5ldyBGaWJlcihmdW5jdGlvbigpIHtcblx0XHR2YXIgY29udGV4dCA9IG5ldyBGYXN0UmVuZGVyLl9Db250ZXh0KGxvZ2luVG9rZW4sIHsgaGVhZGVyczogaGVhZGVycyB9KVxuXG5cdFx0dHJ5IHtcblx0XHRcdEZhc3RSZW5kZXIuX29uQWxsUm91dGVzLmZvckVhY2goZnVuY3Rpb24oY2FsbGJhY2spIHtcblx0XHRcdFx0Y2FsbGJhY2suY2FsbChjb250ZXh0LCByZXEudXJsKVxuXHRcdFx0fSlcblxuXHRcdFx0Y2FsbGJhY2soY29udGV4dC5nZXREYXRhKCkpXG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRoYW5kbGVFcnJvcihlcnIsIHBhdGgsIGNhbGxiYWNrKVxuXHRcdH1cblx0fSkucnVuKClcbn1cblxuZnVuY3Rpb24gaGFuZGxlRXJyb3IoZXJyLCBwYXRoLCBjYWxsYmFjaykge1xuXHR2YXIgbWVzc2FnZSA9XG5cdFx0J2Vycm9yIG9uIGZhc3QtcmVuZGVyaW5nIHBhdGg6ICcgKyBwYXRoICsgJyA7IGVycm9yOiAnICsgZXJyLnN0YWNrXG5cdGNvbnNvbGUuZXJyb3IobWVzc2FnZSlcblx0Y2FsbGJhY2sobnVsbClcbn1cblxuLy8gYWRkaW5nIHN1cHBvcnQgZm9yIG51bGwgcHVibGljYXRpb25zXG5GYXN0UmVuZGVyLm9uQWxsUm91dGVzKGZ1bmN0aW9uKCkge1xuXHR2YXIgY29udGV4dCA9IHRoaXNcblx0dmFyIG51bGxIYW5kbGVycyA9IE1ldGVvci5kZWZhdWx0X3NlcnZlci51bml2ZXJzYWxfcHVibGlzaF9oYW5kbGVyc1xuXG5cdGlmIChudWxsSGFuZGxlcnMpIHtcblx0XHRudWxsSGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbihwdWJsaXNoSGFuZGxlcikge1xuXHRcdFx0Ly8gdW5pdmVyc2FsIHN1YnMgaGF2ZSBzdWJzY3JpcHRpb24gSUQsIHBhcmFtcywgYW5kIG5hbWUgdW5kZWZpbmVkXG5cdFx0XHR2YXIgcHVibGlzaENvbnRleHQgPSBuZXcgUHVibGlzaENvbnRleHQoY29udGV4dCwgcHVibGlzaEhhbmRsZXIpXG5cdFx0XHRjb250ZXh0LnByb2Nlc3NQdWJsaWNhdGlvbihwdWJsaXNoQ29udGV4dClcblx0XHR9KVxuXHR9XG59KVxuIiwiaW1wb3J0IHsgUmFuZG9tIH0gZnJvbSAnbWV0ZW9yL3JhbmRvbSdcbmltcG9ydCB7IEVKU09OIH0gZnJvbSAnbWV0ZW9yL2Vqc29uJ1xuaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcidcbmltcG9ydCB7IF8gfSBmcm9tICdtZXRlb3IvdW5kZXJzY29yZSdcbmltcG9ydCB7IE1ldGVvclggfSBmcm9tICdtZXRlb3IvbGFtaGlldTptZXRlb3J4J1xuXG5jb25zdCBQdWJsaXNoQ29udGV4dCA9IGZ1bmN0aW9uIFB1Ymxpc2hDb250ZXh0KFxuXHRjb250ZXh0LFxuXHRoYW5kbGVyLFxuXHRzdWJzY3JpcHRpb25JZCxcblx0cGFyYW1zLFxuXHRuYW1lXG4pIHtcblx0dmFyIHNlbGYgPSB0aGlzXG5cblx0Ly8gbW9jayBzZXNzaW9uXG5cdHZhciBzZXNzaW9uSWQgPSBSYW5kb20uaWQoKVxuXHR2YXIgc2Vzc2lvbiA9IHtcblx0XHRpZDogc2Vzc2lvbklkLFxuXHRcdHVzZXJJZDogY29udGV4dC51c2VySWQsXG5cdFx0Ly8gbm90IG51bGxcblx0XHRpblF1ZXVlOiB7fSxcblx0XHRjb25uZWN0aW9uSGFuZGxlOiB7XG5cdFx0XHRpZDogc2Vzc2lvbklkLFxuXHRcdFx0Y2xvc2U6IGZ1bmN0aW9uKCkge30sXG5cdFx0XHRvbkNsb3NlOiBmdW5jdGlvbigpIHt9LFxuXHRcdFx0Y2xpZW50QWRkcmVzczogJzEyNy4wLjAuMScsXG5cdFx0XHRodHRwSGVhZGVyczogY29udGV4dC5oZWFkZXJzLFxuXHRcdH0sXG5cdFx0YWRkZWQ6IGZ1bmN0aW9uKHN1YnNjcmlwdGlvbkhhbmRsZSwgY29sbGVjdGlvbk5hbWUsIHN0cklkLCBmaWVsZHMpIHtcblx0XHRcdC8vIERvbid0IHNoYXJlIHN0YXRlIHdpdGggdGhlIGRhdGEgcGFzc2VkIGluIGJ5IHRoZSB1c2VyLlxuXHRcdFx0dmFyIGRvYyA9IEVKU09OLmNsb25lKGZpZWxkcylcblx0XHRcdGRvYy5faWQgPSBzZWxmLl9pZEZpbHRlci5pZFBhcnNlKHN0cklkKVxuXHRcdFx0TWV0ZW9yLl9lbnN1cmUoc2VsZi5fY29sbGVjdGlvbkRhdGEsIGNvbGxlY3Rpb25OYW1lKVtzdHJJZF0gPSBkb2Ncblx0XHR9LFxuXHRcdGNoYW5nZWQ6IGZ1bmN0aW9uKHN1YnNjcmlwdGlvbkhhbmRsZSwgY29sbGVjdGlvbk5hbWUsIHN0cklkLCBmaWVsZHMpIHtcblx0XHRcdHZhciBkb2MgPSBzZWxmLl9jb2xsZWN0aW9uRGF0YVtjb2xsZWN0aW9uTmFtZV1bc3RySWRdXG5cdFx0XHRpZiAoIWRvYykge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXG5cdFx0XHRcdFx0J0NvdWxkIG5vdCBmaW5kIGVsZW1lbnQgd2l0aCBpZCAnICsgc3RySWQgKyAnIHRvIGNoYW5nZSdcblx0XHRcdFx0KVxuXHRcdFx0fVxuXHRcdFx0Xy5lYWNoKGZpZWxkcywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuXHRcdFx0XHQvLyBQdWJsaXNoIEFQSSBpZ25vcmVzIF9pZCBpZiBwcmVzZW50IGluIGZpZWxkcy5cblx0XHRcdFx0aWYgKGtleSA9PT0gJ19pZCcpIHJldHVyblxuXG5cdFx0XHRcdGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0ZGVsZXRlIGRvY1trZXldXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gRG9uJ3Qgc2hhcmUgc3RhdGUgd2l0aCB0aGUgZGF0YSBwYXNzZWQgaW4gYnkgdGhlIHVzZXIuXG5cdFx0XHRcdFx0ZG9jW2tleV0gPSBFSlNPTi5jbG9uZSh2YWx1ZSlcblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHR9LFxuXHRcdHJlbW92ZWQ6IGZ1bmN0aW9uKHN1YnNjcmlwdGlvbkhhbmRsZSwgY29sbGVjdGlvbk5hbWUsIHN0cklkKSB7XG5cdFx0XHRpZiAoXG5cdFx0XHRcdCEoXG5cdFx0XHRcdFx0c2VsZi5fY29sbGVjdGlvbkRhdGFbY29sbGVjdGlvbk5hbWVdICYmXG5cdFx0XHRcdFx0c2VsZi5fY29sbGVjdGlvbkRhdGFbY29sbGVjdGlvbk5hbWVdW3N0cklkXVxuXHRcdFx0XHQpXG5cdFx0XHQpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdSZW1vdmVkIG5vbmV4aXN0ZW50IGRvY3VtZW50ICcgKyBzdHJJZClcblx0XHRcdH1cblx0XHRcdGRlbGV0ZSBzZWxmLl9jb2xsZWN0aW9uRGF0YVtjb2xsZWN0aW9uTmFtZV1bc3RySWRdXG5cdFx0fSxcblx0XHRzZW5kUmVhZHk6IGZ1bmN0aW9uKHN1YnNjcmlwdGlvbklkcykge1xuXHRcdFx0Ly8gdGhpcyBpcyBjYWxsZWQgb25seSBmb3Igbm9uLXVuaXZlcnNhbCBzdWJzY3JpcHRpb25zXG5cdFx0XHRpZiAoIXNlbGYuX3N1YnNjcmlwdGlvbklkKSB0aHJvdyBuZXcgRXJyb3IoJ0Fzc2VydGlvbi4nKVxuXG5cdFx0XHQvLyBtYWtlIHRoZSBzdWJzY3JpcHRpb24gYmUgbWFya2VkIGFzIHJlYWR5XG5cdFx0XHRpZiAoIXNlbGYuX2lzRGVhY3RpdmF0ZWQoKSkge1xuXHRcdFx0XHRzZWxmLl9jb250ZXh0LmNvbXBsZXRlU3Vic2NyaXB0aW9ucyhzZWxmLl9uYW1lLCBzZWxmLl9wYXJhbXMpXG5cdFx0XHR9XG5cblx0XHRcdC8vIHdlIGp1c3Qgc3RvcCBpdFxuXHRcdFx0c2VsZi5zdG9wKClcblx0XHR9LFxuXHR9XG5cblx0TWV0ZW9yWC5TdWJzY3JpcHRpb24uY2FsbChcblx0XHRzZWxmLFxuXHRcdHNlc3Npb24sXG5cdFx0aGFuZGxlcixcblx0XHRzdWJzY3JpcHRpb25JZCxcblx0XHRwYXJhbXMsXG5cdFx0bmFtZVxuXHQpXG5cblx0c2VsZi51bmJsb2NrID0gZnVuY3Rpb24oKSB7fVxuXG5cdHNlbGYuX2NvbnRleHQgPSBjb250ZXh0XG5cdHNlbGYuX2NvbGxlY3Rpb25EYXRhID0ge31cbn1cblxuUHVibGlzaENvbnRleHQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShNZXRlb3JYLlN1YnNjcmlwdGlvbi5wcm90b3R5cGUpXG5QdWJsaXNoQ29udGV4dC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBQdWJsaXNoQ29udGV4dFxuXG5QdWJsaXNoQ29udGV4dC5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuXHQvLyBvdXIgc3RvcCBkb2VzIG5vdCByZW1vdmUgYWxsIGRvY3VtZW50cyAoaXQganVzdCBjYWxscyBkZWFjdGl2YXRlKVxuXHQvLyBNZXRlb3Igb25lIHJlbW92ZXMgZG9jdW1lbnRzIGZvciBub24tdW5pdmVyc2FsIHN1YnNjcmlwdGlvblxuXHQvLyB3ZSBkZWFjdGl2YXRlIGJvdGggZm9yIHVuaXZlcnNhbCBhbmQgbmFtZWQgc3Vic2NyaXB0aW9uc1xuXHQvLyBob3BlZnVsbHkgdGhpcyBpcyByaWdodCBpbiBvdXIgY2FzZVxuXHQvLyBNZXRlb3IgZG9lcyBpdCBqdXN0IGZvciBuYW1lZCBzdWJzY3JpcHRpb25zXG5cdHRoaXMuX2RlYWN0aXZhdGUoKVxufVxuXG5QdWJsaXNoQ29udGV4dC5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbihlcnJvcikge1xuXHQvLyBUT0RPOiBTaG91bGQgd2UgcGFzcyB0aGUgZXJyb3IgdG8gdGhlIHN1YnNjcmlwdGlvbiBzb21laG93P1xuXHRjb25zb2xlLndhcm4oXG5cdFx0J2Vycm9yIGNhdWdodCBvbiBwdWJsaWNhdGlvbjogJyxcblx0XHR0aGlzLl9uYW1lLFxuXHRcdCc6ICcsXG5cdFx0ZXJyb3IubWVzc2FnZSB8fCBlcnJvclxuXHQpXG5cdHRoaXMuc3RvcCgpXG59XG5cbmV4cG9ydCBkZWZhdWx0IFB1Ymxpc2hDb250ZXh0XG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJ1xuaW1wb3J0IEZpYmVycyBmcm9tICdmaWJlcnMnXG5pbXBvcnQgRnV0dXJlIGZyb20gJ2ZpYmVycy9mdXR1cmUnXG5pbXBvcnQgeyBBY2NvdW50cyB9IGZyb20gJ21ldGVvci9hY2NvdW50cy1iYXNlJ1xuaW1wb3J0IHsgRERQIH0gZnJvbSAnbWV0ZW9yL2RkcCdcbmltcG9ydCB7IFJhbmRvbSB9IGZyb20gJ21ldGVvci9yYW5kb20nXG5pbXBvcnQgUHVibGlzaENvbnRleHQgZnJvbSAnLi9wdWJsaXNoX2NvbnRleHQnXG5pbXBvcnQgeyBfIH0gZnJvbSAnbWV0ZW9yL3VuZGVyc2NvcmUnXG5pbXBvcnQgeyBFSlNPTiB9IGZyb20gJ21ldGVvci9lanNvbidcbmltcG9ydCB7IEZhc3RSZW5kZXIgfSBmcm9tICcuL25hbWVzcGFjZSdcblxuY29uc3QgQ29udGV4dCA9IGZ1bmN0aW9uIENvbnRleHQobG9naW5Ub2tlbiwgb3RoZXJQYXJhbXMpIHtcblx0dGhpcy5fY29sbGVjdGlvbkRhdGEgPSB7fVxuXHR0aGlzLl9zdWJzY3JpcHRpb25zID0ge31cblx0dGhpcy5fbG9naW5Ub2tlbiA9IGxvZ2luVG9rZW5cblxuXHRfLmV4dGVuZCh0aGlzLCBvdGhlclBhcmFtcylcblxuXHQvLyBnZXQgdGhlIHVzZXJcblx0aWYgKE1ldGVvci51c2Vycykge1xuXHRcdC8vIGNoZWNrIHRvIG1ha2Ugc3VyZSwgd2UndmUgdGhlIGxvZ2luVG9rZW4sXG5cdFx0Ly8gb3RoZXJ3aXNlIGEgcmFuZG9tIHVzZXIgd2lsbCBmZXRjaGVkIGZyb20gdGhlIGRiXG5cdFx0aWYgKGxvZ2luVG9rZW4pIHtcblx0XHRcdHZhciBoYXNoZWRUb2tlbiA9IGxvZ2luVG9rZW4gJiYgQWNjb3VudHMuX2hhc2hMb2dpblRva2VuKGxvZ2luVG9rZW4pXG5cdFx0XHR2YXIgcXVlcnkgPSB7ICdzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnMuaGFzaGVkVG9rZW4nOiBoYXNoZWRUb2tlbiB9XG5cdFx0XHR2YXIgb3B0aW9ucyA9IHsgZmllbGRzOiB7IF9pZDogMSB9IH1cblx0XHRcdHZhciB1c2VyID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUocXVlcnksIG9wdGlvbnMpXG5cdFx0fVxuXG5cdFx0Ly8gc3VwcG9ydCBmb3IgTWV0ZW9yLnVzZXJcblx0XHRGaWJlcnMuY3VycmVudC5fbWV0ZW9yX2R5bmFtaWNzID0gW11cblx0XHRGaWJlcnMuY3VycmVudC5fbWV0ZW9yX2R5bmFtaWNzW0REUC5fQ3VycmVudEludm9jYXRpb24uc2xvdF0gPSB0aGlzXG5cblx0XHRpZiAodXNlcikge1xuXHRcdFx0dGhpcy51c2VySWQgPSB1c2VyLl9pZFxuXHRcdH1cblx0fVxufVxuXG5Db250ZXh0LnByb3RvdHlwZS5zdWJzY3JpYmUgPSBmdW5jdGlvbihzdWJOYW1lIC8qLCBwYXJhbXMgKi8pIHtcblx0dmFyIHB1Ymxpc2hIYW5kbGVyID0gTWV0ZW9yLmRlZmF1bHRfc2VydmVyLnB1Ymxpc2hfaGFuZGxlcnNbc3ViTmFtZV1cblx0aWYgKHB1Ymxpc2hIYW5kbGVyKSB7XG5cdFx0dmFyIHBhcmFtcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSlcblx0XHQvLyBub24tdW5pdmVyc2FsIHN1YnMgaGF2ZSBzdWJzY3JpcHRpb24gaWRcblx0XHR2YXIgc3Vic2NyaXB0aW9uSWQgPSBSYW5kb20uaWQoKVxuXHRcdHZhciBwdWJsaXNoQ29udGV4dCA9IG5ldyBQdWJsaXNoQ29udGV4dChcblx0XHRcdHRoaXMsXG5cdFx0XHRwdWJsaXNoSGFuZGxlcixcblx0XHRcdHN1YnNjcmlwdGlvbklkLFxuXHRcdFx0cGFyYW1zLFxuXHRcdFx0c3ViTmFtZVxuXHRcdClcblxuXHRcdHJldHVybiB0aGlzLnByb2Nlc3NQdWJsaWNhdGlvbihwdWJsaXNoQ29udGV4dClcblx0fSBlbHNlIHtcblx0XHRjb25zb2xlLndhcm4oJ1RoZXJlIGlzIG5vIHN1Y2ggcHVibGlzaCBoYW5kbGVyIG5hbWVkOicsIHN1Yk5hbWUpXG5cdFx0cmV0dXJuIHt9XG5cdH1cbn1cblxuQ29udGV4dC5wcm90b3R5cGUucHJvY2Vzc1B1YmxpY2F0aW9uID0gZnVuY3Rpb24ocHVibGlzaENvbnRleHQpIHtcblx0dmFyIHNlbGYgPSB0aGlzXG5cdHZhciBkYXRhID0ge31cblx0dmFyIGVuc3VyZUNvbGxlY3Rpb24gPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSkge1xuXHRcdHNlbGYuX2Vuc3VyZUNvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpXG5cdFx0aWYgKCFkYXRhW2NvbGxlY3Rpb25OYW1lXSkge1xuXHRcdFx0ZGF0YVtjb2xsZWN0aW9uTmFtZV0gPSBbXVxuXHRcdH1cblx0fVxuXG5cdHZhciBmdXR1cmUgPSBuZXcgRnV0dXJlKClcblx0Ly8gZGV0ZWN0IHdoZW4gdGhlIGNvbnRleHQgaXMgcmVhZHkgdG8gYmUgc2VudCB0byB0aGUgY2xpZW50XG5cdHB1Ymxpc2hDb250ZXh0Lm9uU3RvcChmdW5jdGlvbigpIHtcblx0XHRpZiAoIWZ1dHVyZS5pc1Jlc29sdmVkKCkpIHtcblx0XHRcdGZ1dHVyZS5yZXR1cm4oKVxuXHRcdH1cblx0fSlcblxuXHRwdWJsaXNoQ29udGV4dC5fcnVuSGFuZGxlcigpXG5cblx0aWYgKCFwdWJsaXNoQ29udGV4dC5fc3Vic2NyaXB0aW9uSWQpIHtcblx0XHQvLyB1bml2ZXJzYWwgc3Vic2NyaXB0aW9uLCB3ZSBzdG9wIGl0IChzYW1lIGFzIG1hcmtpbmcgaXQgYXMgcmVhZHkpIG91cnNlbHZlc1xuXHRcdC8vIHRoZXkgb3RoZXJ3aXNlIGRvIG5vdCBoYXZlIHJlYWR5IG9yIHN0b3BwZWQgc3RhdGUsIGJ1dCBpbiBvdXIgY2FzZSB0aGV5IGRvXG5cdFx0cHVibGlzaENvbnRleHQuc3RvcCgpXG5cdH1cblxuXHRpZiAoIWZ1dHVyZS5pc1Jlc29sdmVkKCkpIHtcblx0XHQvLyBkb24ndCB3YWl0IGZvcmV2ZXIgZm9yIGhhbmRsZXIgdG8gZmlyZSByZWFkeSgpXG5cdFx0TWV0ZW9yLnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoIWZ1dHVyZS5pc1Jlc29sdmVkKCkpIHtcblx0XHRcdFx0Ly8gcHVibGlzaCBoYW5kbGVyIGZhaWxlZCB0byBzZW5kIHJlYWR5IHNpZ25hbCBpbiB0aW1lXG5cdFx0XHRcdC8vIG1heWJlIHlvdXIgbm9uLXVuaXZlcnNhbCBwdWJsaXNoIGhhbmRsZXIgaXMgbm90IGNhbGxpbmcgdGhpcy5yZWFkeSgpP1xuXHRcdFx0XHQvLyBvciBtYXliZSBpdCBpcyByZXR1cm5pbmcgbnVsbCB0byBzaWduYWwgZW1wdHkgcHVibGlzaD9cblx0XHRcdFx0Ly8gaXQgc2hvdWxkIHN0aWxsIGNhbGwgdGhpcy5yZWFkeSgpIG9yIHJldHVybiBhbiBlbXB0eSBhcnJheSBbXVxuXHRcdFx0XHR2YXIgbWVzc2FnZSA9XG5cdFx0XHRcdFx0J1B1Ymxpc2ggaGFuZGxlciBmb3IgJyArXG5cdFx0XHRcdFx0cHVibGlzaENvbnRleHQuX25hbWUgK1xuXHRcdFx0XHRcdCcgc2VudCBubyByZWFkeSBzaWduYWxcXG4nICtcblx0XHRcdFx0XHQnIFRoaXMgY291bGQgYmUgYmVjYXVzZSB0aGlzIHB1YmxpY2F0aW9uIGByZXR1cm4gbnVsbGAuXFxuJyArXG5cdFx0XHRcdFx0JyBVc2UgYHJldHVybiB0aGlzLnJlYWR5KClgIGluc3RlYWQuJ1xuXHRcdFx0XHRjb25zb2xlLndhcm4obWVzc2FnZSlcblx0XHRcdFx0ZnV0dXJlLnJldHVybigpXG5cdFx0XHR9XG5cdFx0fSwgNTAwKSAvLyBhcmJpdHJhcmlhbGx5IHNldCB0aW1lb3V0IHRvIDUwMG1zLCBzaG91bGQgcHJvYmFibHkgYmUgY29uZmlndXJhYmxlXG5cblx0XHQvLyAgd2FpdCBmb3IgdGhlIHN1YnNjcmlwdGlvbiBiZWNhbWUgcmVhZHkuXG5cdFx0ZnV0dXJlLndhaXQoKVxuXHR9XG5cblx0Ly8gc3RvcCBhbnkgcnVuYXdheSBzdWJzY3JpcHRpb25cblx0Ly8gdGhpcyBjYW4gaGFwcGVuIGlmIGEgcHVibGlzaCBoYW5kbGVyIG5ldmVyIGNhbGxzIHJlYWR5IG9yIHN0b3AsIGZvciBleGFtcGxlXG5cdC8vIGl0IGRvZXMgbm90IGh1cnQgdG8gY2FsbCBpdCBtdWx0aXBsZSB0aW1lc1xuXHRwdWJsaXNoQ29udGV4dC5zdG9wKClcblxuXHQvLyBnZXQgdGhlIGRhdGFcblx0Xy5lYWNoKHB1Ymxpc2hDb250ZXh0Ll9jb2xsZWN0aW9uRGF0YSwgZnVuY3Rpb24oY29sbERhdGEsIGNvbGxlY3Rpb25OYW1lKSB7XG5cdFx0Ly8gbWFraW5nIGFuIGFycmF5IGZyb20gYSBtYXBcblx0XHRjb2xsRGF0YSA9IF8udmFsdWVzKGNvbGxEYXRhKVxuXG5cdFx0ZW5zdXJlQ29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSlcblx0XHRkYXRhW2NvbGxlY3Rpb25OYW1lXS5wdXNoKGNvbGxEYXRhKVxuXG5cdFx0Ly8gY29weSB0aGUgY29sbGVjdGlvbiBkYXRhIGluIHB1Ymxpc2ggY29udGV4dCBpbnRvIHRoZSBGUiBjb250ZXh0XG5cdFx0c2VsZi5fY29sbGVjdGlvbkRhdGFbY29sbGVjdGlvbk5hbWVdLnB1c2goY29sbERhdGEpXG5cdH0pXG5cblx0cmV0dXJuIGRhdGFcbn1cblxuQ29udGV4dC5wcm90b3R5cGUuY29tcGxldGVTdWJzY3JpcHRpb25zID0gZnVuY3Rpb24obmFtZSwgcGFyYW1zKSB7XG5cdHZhciBzdWJzID0gdGhpcy5fc3Vic2NyaXB0aW9uc1tuYW1lXVxuXHRpZiAoIXN1YnMpIHtcblx0XHRzdWJzID0gdGhpcy5fc3Vic2NyaXB0aW9uc1tuYW1lXSA9IHt9XG5cdH1cblxuXHRpZiAocGFyYW1zICYmIHBhcmFtcy5sZW5ndGgpIHtcblx0XHR2YXIgbGFzdFBhcmFtID0gcGFyYW1zW3BhcmFtcy5sZW5ndGggLSAxXVxuXHRcdGlmIChcblx0XHRcdGxhc3RQYXJhbSAmJlxuXHRcdFx0KGxhc3RQYXJhbS5oYXNPd25Qcm9wZXJ0eSgnb25TdG9wJykgfHxcblx0XHRcdFx0bGFzdFBhcmFtLmhhc093blByb3BlcnR5KCdvblJlYWR5JykpXG5cdFx0KSB7XG5cdFx0XHRwYXJhbXMucG9wKClcblx0XHR9XG5cdH1cblxuXHRzdWJzW0VKU09OLnN0cmluZ2lmeShwYXJhbXMpXSA9IHRydWVcbn1cblxuQ29udGV4dC5wcm90b3R5cGUuX2Vuc3VyZUNvbGxlY3Rpb24gPSBmdW5jdGlvbihjb2xsZWN0aW9uTmFtZSkge1xuXHRpZiAoIXRoaXMuX2NvbGxlY3Rpb25EYXRhW2NvbGxlY3Rpb25OYW1lXSkge1xuXHRcdHRoaXMuX2NvbGxlY3Rpb25EYXRhW2NvbGxlY3Rpb25OYW1lXSA9IFtdXG5cdH1cbn1cblxuQ29udGV4dC5wcm90b3R5cGUuZ2V0RGF0YSA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4ge1xuXHRcdGNvbGxlY3Rpb25EYXRhOiB0aGlzLl9jb2xsZWN0aW9uRGF0YSxcblx0XHRzdWJzY3JpcHRpb25zOiB0aGlzLl9zdWJzY3JpcHRpb25zLFxuXHRcdGxvZ2luVG9rZW46IHRoaXMuX2xvZ2luVG9rZW4sXG5cdH1cbn1cblxuRmFzdFJlbmRlci5fQ29udGV4dCA9IENvbnRleHRcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InXG5pbXBvcnQgeyBGYXN0UmVuZGVyIH0gZnJvbSAnbWV0ZW9yL3N0YXJpbmdhdGxpZ2h0czpmYXN0LXJlbmRlcidcbmltcG9ydCB7IEluamVjdERhdGEgfSBmcm9tICdtZXRlb3Ivc3RhcmluZ2F0bGlnaHRzOmluamVjdC1kYXRhJ1xuaW1wb3J0IHsgb25QYWdlTG9hZCB9IGZyb20gJ21ldGVvci9zZXJ2ZXItcmVuZGVyJ1xuaW1wb3J0IHsgXyB9IGZyb20gJ21ldGVvci91bmRlcnNjb3JlJ1xuXG5jb25zdCBvcmlnaW5hbFN1YnNjcmliZSA9IE1ldGVvci5zdWJzY3JpYmVcbk1ldGVvci5zdWJzY3JpYmUgPSBmdW5jdGlvbihuYW1lLCAuLi5hcmdzKSB7XG5cdGNvbnN0IGZyQ29udGV4dCA9IEZhc3RSZW5kZXIuZnJDb250ZXh0LmdldCgpXG5cdGlmICghZnJDb250ZXh0KSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKFxuXHRcdFx0YENhbm5vdCBhZGQgYSBzdWJzY3JpcHRpb246ICR7bmFtZX0gd2l0aG91dCBGYXN0UmVuZGVyIENvbnRleHRgXG5cdFx0KVxuXHR9XG5cdGZyQ29udGV4dC5zdWJzY3JpYmUobmFtZSwgLi4uYXJncylcblxuXHRpZiAob3JpZ2luYWxTdWJzY3JpYmUpIHtcblx0XHRvcmlnaW5hbFN1YnNjcmliZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdHJlYWR5OiAoKSA9PiB0cnVlLFxuXHR9XG59XG5cbkZhc3RSZW5kZXIuX21lcmdlRnJEYXRhID0gZnVuY3Rpb24ocmVxLCBxdWVyeURhdGEpIHtcblx0dmFyIGV4aXN0aW5nUGF5bG9hZCA9IEluamVjdERhdGEuZ2V0RGF0YShyZXEsICdmYXN0LXJlbmRlci1kYXRhJylcblx0aWYgKCFleGlzdGluZ1BheWxvYWQpIHtcblx0XHRJbmplY3REYXRhLnB1c2hEYXRhKHJlcSwgJ2Zhc3QtcmVuZGVyLWRhdGEnLCBxdWVyeURhdGEpXG5cdH0gZWxzZSB7XG5cdFx0Ly8gaXQncyBwb3NzaWJsZSB0byBleGVjdXRlIHRoaXMgY2FsbGJhY2sgdHdpY2Vcblx0XHQvLyB0aGUgd2UgbmVlZCB0byBtZXJnZSBleGlzaXRuZyBkYXRhIHdpdGggdGhlIG5ldyBvbmVcblx0XHRfLmV4dGVuZChleGlzdGluZ1BheWxvYWQuc3Vic2NyaXB0aW9ucywgcXVlcnlEYXRhLnN1YnNjcmlwdGlvbnMpXG5cdFx0Xy5lYWNoKHF1ZXJ5RGF0YS5jb2xsZWN0aW9uRGF0YSwgZnVuY3Rpb24oZGF0YSwgcHViTmFtZSkge1xuXHRcdFx0dmFyIGV4aXN0aW5nRGF0YSA9IGV4aXN0aW5nUGF5bG9hZC5jb2xsZWN0aW9uRGF0YVtwdWJOYW1lXVxuXHRcdFx0aWYgKGV4aXN0aW5nRGF0YSkge1xuXHRcdFx0XHRkYXRhID0gZXhpc3RpbmdEYXRhLmNvbmNhdChkYXRhKVxuXHRcdFx0fVxuXG5cdFx0XHRleGlzdGluZ1BheWxvYWQuY29sbGVjdGlvbkRhdGFbcHViTmFtZV0gPSBkYXRhXG5cdFx0XHRJbmplY3REYXRhLnB1c2hEYXRhKHJlcSwgJ2Zhc3QtcmVuZGVyLWRhdGEnLCBleGlzdGluZ1BheWxvYWQpXG5cdFx0fSlcblx0fVxufVxuXG5GYXN0UmVuZGVyLm9uUGFnZUxvYWQgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuXHRJbmplY3REYXRhLmluamVjdFRvSGVhZCA9IGZhbHNlXG5cdG9uUGFnZUxvYWQoYXN5bmMgc2luayA9PiB7XG5cdFx0Y29uc3QgZnJDb250ZXh0ID0gbmV3IEZhc3RSZW5kZXIuX0NvbnRleHQoXG5cdFx0XHRzaW5rLnJlcXVlc3QuY29va2llcy5tZXRlb3JfbG9naW5fdG9rZW4sXG5cdFx0XHR7XG5cdFx0XHRcdGhlYWRlcnM6IHNpbmsuaGVhZGVycyxcblx0XHRcdH1cblx0XHQpXG5cblx0XHRhd2FpdCBGYXN0UmVuZGVyLmZyQ29udGV4dC53aXRoVmFsdWUoZnJDb250ZXh0LCBhc3luYyBmdW5jdGlvbigpIHtcblx0XHRcdGF3YWl0IGNhbGxiYWNrKHNpbmspXG5cdFx0XHRGYXN0UmVuZGVyLl9tZXJnZUZyRGF0YShcblx0XHRcdFx0c2luay5yZXF1ZXN0LFxuXHRcdFx0XHRGYXN0UmVuZGVyLmZyQ29udGV4dC5nZXQoKS5nZXREYXRhKClcblx0XHRcdClcblx0XHR9KVxuXHR9KVxufVxuIl19
