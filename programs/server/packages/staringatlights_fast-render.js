(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var InjectData = Package['staringatlights:inject-data'].InjectData;
var Picker = Package['meteorhacks:picker'].Picker;
var MeteorX = Package['meteorhacks:meteorx'].MeteorX;
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
module.watch(require("meteor/routepolicy"), {
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
module.watch(require("fibers"), {
  default(v) {
    Fiber = v;
  }

}, 0);
let FastRender;
module.watch(require("./namespace"), {
  FastRender(v) {
    FastRender = v;
  }

}, 1);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 2);
let Picker;
module.watch(require("meteor/meteorhacks:picker"), {
  Picker(v) {
    Picker = v;
  }

}, 3);
let InjectData;
module.watch(require("meteor/staringatlights:inject-data"), {
  InjectData(v) {
    InjectData = v;
  }

}, 4);
let PublishContext;
module.watch(require("./publish_context"), {
  default(v) {
    PublishContext = v;
  }

}, 5);
let IsAppUrl;
module.watch(require("./utils"), {
  IsAppUrl(v) {
    IsAppUrl = v;
  }

}, 6);

let _;

module.watch(require("meteor/underscore"), {
  _(v) {
    _ = v;
  }

}, 7);
let connect;
module.watch(require("connect"), {
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
module.watch(require("meteor/random"), {
  Random(v) {
    Random = v;
  }

}, 0);
let EJSON;
module.watch(require("meteor/ejson"), {
  EJSON(v) {
    EJSON = v;
  }

}, 1);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 2);

let _;

module.watch(require("meteor/underscore"), {
  _(v) {
    _ = v;
  }

}, 3);
let MeteorX;
module.watch(require("meteor/meteorhacks:meteorx"), {
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
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Fibers;
module.watch(require("fibers"), {
  default(v) {
    Fibers = v;
  }

}, 1);
let Future;
module.watch(require("fibers/future"), {
  default(v) {
    Future = v;
  }

}, 2);
let Accounts;
module.watch(require("meteor/accounts-base"), {
  Accounts(v) {
    Accounts = v;
  }

}, 3);
let DDP;
module.watch(require("meteor/ddp"), {
  DDP(v) {
    DDP = v;
  }

}, 4);
let Random;
module.watch(require("meteor/random"), {
  Random(v) {
    Random = v;
  }

}, 5);
let PublishContext;
module.watch(require("./publish_context"), {
  default(v) {
    PublishContext = v;
  }

}, 6);

let _;

module.watch(require("meteor/underscore"), {
  _(v) {
    _ = v;
  }

}, 7);
let EJSON;
module.watch(require("meteor/ejson"), {
  EJSON(v) {
    EJSON = v;
  }

}, 8);
let FastRender;
module.watch(require("./namespace"), {
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
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let FastRender;
module.watch(require("meteor/staringatlights:fast-render"), {
  FastRender(v) {
    FastRender = v;
  }

}, 1);
let InjectData;
module.watch(require("meteor/staringatlights:inject-data"), {
  InjectData(v) {
    InjectData = v;
  }

}, 2);
let onPageLoad;
module.watch(require("meteor/server-render"), {
  onPageLoad(v) {
    onPageLoad = v;
  }

}, 3);

let _;

module.watch(require("meteor/underscore"), {
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

}}},"node_modules":{"connect":{"package.json":function(require,exports){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// node_modules/meteor/staringatlights_fast-render/node_modules/connect/package.json                        //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
exports.name = "connect";
exports.version = "2.13.0";
exports.main = "index";

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc3RhcmluZ2F0bGlnaHRzOmZhc3QtcmVuZGVyL2xpYi9zZXJ2ZXIvbmFtZXNwYWNlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9zdGFyaW5nYXRsaWdodHM6ZmFzdC1yZW5kZXIvbGliL3NlcnZlci91dGlscy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc3RhcmluZ2F0bGlnaHRzOmZhc3QtcmVuZGVyL2xpYi9zZXJ2ZXIvcm91dGVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9zdGFyaW5nYXRsaWdodHM6ZmFzdC1yZW5kZXIvbGliL3NlcnZlci9wdWJsaXNoX2NvbnRleHQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3N0YXJpbmdhdGxpZ2h0czpmYXN0LXJlbmRlci9saWIvc2VydmVyL2NvbnRleHQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3N0YXJpbmdhdGxpZ2h0czpmYXN0LXJlbmRlci9saWIvc2VydmVyL3Nzcl9oZWxwZXIuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiRmFzdFJlbmRlciIsIl9yb3V0ZXMiLCJfb25BbGxSb3V0ZXMiLCJJc0FwcFVybCIsIlJvdXRlUG9saWN5Iiwid2F0Y2giLCJyZXF1aXJlIiwidiIsInJlcSIsInVybCIsImNsYXNzaWZ5IiwidGVzdCIsImhlYWRlcnMiLCJGaWJlciIsImRlZmF1bHQiLCJNZXRlb3IiLCJQaWNrZXIiLCJJbmplY3REYXRhIiwiUHVibGlzaENvbnRleHQiLCJfIiwiY29ubmVjdCIsImZyQ29udGV4dCIsIkVudmlyb25tZW50VmFyaWFibGUiLCJmYXN0UmVuZGVyUm91dGVzIiwiZmlsdGVyIiwicmVzIiwibWlkZGxld2FyZSIsImNvb2tpZVBhcnNlciIsIm5leHQiLCJoYW5kbGVPbkFsbFJvdXRlcyIsInJvdXRlIiwicGF0aCIsImNhbGxiYWNrIiwiaW5kZXhPZiIsIkVycm9yIiwiaGFuZGxlUm91dGUiLCJiaW5kIiwic2V0UXVlcnlEYXRhQ2FsbGJhY2siLCJxdWVyeURhdGEiLCJleGlzdGluZ1BheWxvYWQiLCJnZXREYXRhIiwicHVzaERhdGEiLCJleHRlbmQiLCJzdWJzY3JpcHRpb25zIiwiZWFjaCIsImNvbGxlY3Rpb25EYXRhIiwiZGF0YSIsInB1Yk5hbWUiLCJleGlzdGluZ0RhdGEiLCJjb25jYXQiLCJwcm9jZXNzaW5nQ2FsbGJhY2siLCJwYXJhbXMiLCJhZnRlclByb2Nlc3NlZCIsIl9wcm9jZXNzUm91dGVzIiwiX3Byb2Nlc3NBbGxSb3V0ZXMiLCJvbkFsbFJvdXRlcyIsInB1c2giLCJyb3V0ZUNhbGxiYWNrIiwibG9naW5Ub2tlbiIsImNvb2tpZXMiLCJjb250ZXh0IiwiX0NvbnRleHQiLCJ3aXRoVmFsdWUiLCJjYWxsIiwic3RvcCIsImVyciIsImhhbmRsZUVycm9yIiwiZm9yRWFjaCIsInJ1biIsIm1lc3NhZ2UiLCJzdGFjayIsImNvbnNvbGUiLCJlcnJvciIsIm51bGxIYW5kbGVycyIsImRlZmF1bHRfc2VydmVyIiwidW5pdmVyc2FsX3B1Ymxpc2hfaGFuZGxlcnMiLCJwdWJsaXNoSGFuZGxlciIsInB1Ymxpc2hDb250ZXh0IiwicHJvY2Vzc1B1YmxpY2F0aW9uIiwiUmFuZG9tIiwiRUpTT04iLCJNZXRlb3JYIiwiaGFuZGxlciIsInN1YnNjcmlwdGlvbklkIiwibmFtZSIsInNlbGYiLCJzZXNzaW9uSWQiLCJpZCIsInNlc3Npb24iLCJ1c2VySWQiLCJpblF1ZXVlIiwiY29ubmVjdGlvbkhhbmRsZSIsImNsb3NlIiwib25DbG9zZSIsImNsaWVudEFkZHJlc3MiLCJodHRwSGVhZGVycyIsImFkZGVkIiwic3Vic2NyaXB0aW9uSGFuZGxlIiwiY29sbGVjdGlvbk5hbWUiLCJzdHJJZCIsImZpZWxkcyIsImRvYyIsImNsb25lIiwiX2lkIiwiX2lkRmlsdGVyIiwiaWRQYXJzZSIsIl9lbnN1cmUiLCJfY29sbGVjdGlvbkRhdGEiLCJjaGFuZ2VkIiwidmFsdWUiLCJrZXkiLCJ1bmRlZmluZWQiLCJyZW1vdmVkIiwic2VuZFJlYWR5Iiwic3Vic2NyaXB0aW9uSWRzIiwiX3N1YnNjcmlwdGlvbklkIiwiX2lzRGVhY3RpdmF0ZWQiLCJfY29udGV4dCIsImNvbXBsZXRlU3Vic2NyaXB0aW9ucyIsIl9uYW1lIiwiX3BhcmFtcyIsIlN1YnNjcmlwdGlvbiIsInVuYmxvY2siLCJwcm90b3R5cGUiLCJPYmplY3QiLCJjcmVhdGUiLCJjb25zdHJ1Y3RvciIsIl9kZWFjdGl2YXRlIiwid2FybiIsImV4cG9ydERlZmF1bHQiLCJGaWJlcnMiLCJGdXR1cmUiLCJBY2NvdW50cyIsIkREUCIsIkNvbnRleHQiLCJvdGhlclBhcmFtcyIsIl9zdWJzY3JpcHRpb25zIiwiX2xvZ2luVG9rZW4iLCJ1c2VycyIsImhhc2hlZFRva2VuIiwiX2hhc2hMb2dpblRva2VuIiwicXVlcnkiLCJvcHRpb25zIiwidXNlciIsImZpbmRPbmUiLCJjdXJyZW50IiwiX21ldGVvcl9keW5hbWljcyIsIl9DdXJyZW50SW52b2NhdGlvbiIsInNsb3QiLCJzdWJzY3JpYmUiLCJzdWJOYW1lIiwicHVibGlzaF9oYW5kbGVycyIsIkFycmF5Iiwic2xpY2UiLCJhcmd1bWVudHMiLCJlbnN1cmVDb2xsZWN0aW9uIiwiX2Vuc3VyZUNvbGxlY3Rpb24iLCJmdXR1cmUiLCJvblN0b3AiLCJpc1Jlc29sdmVkIiwicmV0dXJuIiwiX3J1bkhhbmRsZXIiLCJzZXRUaW1lb3V0Iiwid2FpdCIsImNvbGxEYXRhIiwidmFsdWVzIiwic3VicyIsInN0cmluZ2lmeSIsIm9uUGFnZUxvYWQiLCJvcmlnaW5hbFN1YnNjcmliZSIsImFyZ3MiLCJnZXQiLCJhcHBseSIsInJlYWR5IiwiX21lcmdlRnJEYXRhIiwiaW5qZWN0VG9IZWFkIiwic2luayIsInJlcXVlc3QiLCJtZXRlb3JfbG9naW5fdG9rZW4iXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsT0FBT0MsTUFBUCxDQUFjO0FBQUNDLGNB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QStCRSxPQUEvQixDQUFuQjs7QUFDQSxVQUFJQyxZQUFKLEVBQWtCO0FBQ2pCRixlQUFPRSxhQUFhQyxNQUFiLENBQW9CSCxJQUFwQixDQUFQO0FBQ0E7O0FBRURQLHNCQUFnQk0sY0FBaEIsQ0FBK0JFLE9BQS9CLElBQTBDRCxJQUExQztBQUNBN0IsaUJBQVd3QixRQUFYLENBQW9CakMsR0FBcEIsRUFBeUIsa0JBQXpCLEVBQTZDK0IsZUFBN0M7QUFDQSxLQVJEO0FBU0E7QUFDRCxDQWxCRDs7QUFvQkF2QyxXQUFXd0ssVUFBWCxHQUF3QixVQUFTeEksUUFBVCxFQUFtQjtBQUMxQ2YsYUFBVzhKLFlBQVgsR0FBMEIsS0FBMUI7QUFDQVAsYUFBaUJRLElBQU4sNkJBQWM7QUFDeEIsVUFBTTNKLFlBQVksSUFBSXJCLFdBQVc2RCxRQUFmLENBQ2pCbUgsS0FBS0MsT0FBTCxDQUFhdEgsT0FBYixDQUFxQnVILGtCQURKLEVBRWpCO0FBQ0N0SyxlQUFTb0ssS0FBS3BLO0FBRGYsS0FGaUIsQ0FBbEI7QUFPQSxrQkFBTVosV0FBV3FCLFNBQVgsQ0FBcUJ5QyxTQUFyQixDQUErQnpDLFNBQS9CLEVBQTBDO0FBQUEsc0NBQWlCO0FBQ2hFLHNCQUFNVyxTQUFTZ0osSUFBVCxDQUFOOztBQUNBaEwsbUJBQVc4SyxZQUFYLENBQ0NFLEtBQUtDLE9BRE4sRUFFQ2pMLFdBQVdxQixTQUFYLENBQXFCc0osR0FBckIsR0FBMkJuSSxPQUEzQixFQUZEO0FBSUEsT0FOK0M7QUFBQSxLQUExQyxDQUFOO0FBT0EsR0FmVSxDQUFYO0FBZ0JBLENBbEJELEMiLCJmaWxlIjoiL3BhY2thZ2VzL3N0YXJpbmdhdGxpZ2h0c19mYXN0LXJlbmRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCBGYXN0UmVuZGVyID0ge1xuXHRfcm91dGVzOiBbXSxcblx0X29uQWxsUm91dGVzOiBbXSxcbn1cbiIsImltcG9ydCB7IFJvdXRlUG9saWN5IH0gZnJvbSAnbWV0ZW9yL3JvdXRlcG9saWN5J1xuXG4vLyBtZXRlb3IgYWxnb3JpdGhtIHRvIGNoZWNrIGlmIHRoaXMgaXMgYSBtZXRlb3Igc2VydmluZyBodHRwIHJlcXVlc3Qgb3Igbm90XG5leHBvcnQgY29uc3QgSXNBcHBVcmwgPSBmdW5jdGlvbihyZXEpIHtcblx0dmFyIHVybCA9IHJlcS51cmxcblx0aWYgKHVybCA9PT0gJy9mYXZpY29uLmljbycgfHwgdXJsID09PSAnL3JvYm90cy50eHQnKSB7XG5cdFx0cmV0dXJuIGZhbHNlXG5cdH1cblxuXHQvLyBOT1RFOiBhcHAubWFuaWZlc3QgaXMgbm90IGEgd2ViIHN0YW5kYXJkIGxpa2UgZmF2aWNvbi5pY28gYW5kXG5cdC8vIHJvYm90cy50eHQuIEl0IGlzIGEgZmlsZSBuYW1lIHdlIGhhdmUgY2hvc2VuIHRvIHVzZSBmb3IgSFRNTDVcblx0Ly8gYXBwY2FjaGUgVVJMcy4gSXQgaXMgaW5jbHVkZWQgaGVyZSB0byBwcmV2ZW50IHVzaW5nIGFuIGFwcGNhY2hlXG5cdC8vIHRoZW4gcmVtb3ZpbmcgaXQgZnJvbSBwb2lzb25pbmcgYW4gYXBwIHBlcm1hbmVudGx5LiBFdmVudHVhbGx5LFxuXHQvLyBvbmNlIHdlIGhhdmUgc2VydmVyIHNpZGUgcm91dGluZywgdGhpcyB3b24ndCBiZSBuZWVkZWQgYXNcblx0Ly8gdW5rbm93biBVUkxzIHdpdGggcmV0dXJuIGEgNDA0IGF1dG9tYXRpY2FsbHkuXG5cdGlmICh1cmwgPT09ICcvYXBwLm1hbmlmZXN0Jykge1xuXHRcdHJldHVybiBmYWxzZVxuXHR9XG5cblx0Ly8gQXZvaWQgc2VydmluZyBhcHAgSFRNTCBmb3IgZGVjbGFyZWQgcm91dGVzIHN1Y2ggYXMgL3NvY2tqcy8uXG5cdGlmIChSb3V0ZVBvbGljeS5jbGFzc2lmeSh1cmwpKSB7XG5cdFx0cmV0dXJuIGZhbHNlXG5cdH1cblxuXHQvLyB3ZSBvbmx5IG5lZWQgdG8gc3VwcG9ydCBIVE1MIHBhZ2VzIG9ubHlcblx0Ly8gdGhpcyBpcyBhIGNoZWNrIHRvIGRvIGl0XG5cdHJldHVybiAvaHRtbC8udGVzdChyZXEuaGVhZGVyc1snYWNjZXB0J10pXG59XG4iLCJpbXBvcnQgRmliZXIgZnJvbSAnZmliZXJzJ1xuaW1wb3J0IHsgRmFzdFJlbmRlciB9IGZyb20gJy4vbmFtZXNwYWNlJ1xuaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcidcbmltcG9ydCB7IFBpY2tlciB9IGZyb20gJ21ldGVvci9tZXRlb3JoYWNrczpwaWNrZXInXG5pbXBvcnQgeyBJbmplY3REYXRhIH0gZnJvbSAnbWV0ZW9yL3N0YXJpbmdhdGxpZ2h0czppbmplY3QtZGF0YSdcbmltcG9ydCBQdWJsaXNoQ29udGV4dCBmcm9tICcuL3B1Ymxpc2hfY29udGV4dCdcbmltcG9ydCB7IElzQXBwVXJsIH0gZnJvbSAnLi91dGlscydcbmltcG9ydCB7IF8gfSBmcm9tICdtZXRlb3IvdW5kZXJzY29yZSdcbmltcG9ydCBjb25uZWN0IGZyb20gJ2Nvbm5lY3QnXG5cbkZhc3RSZW5kZXIuX29uQWxsUm91dGVzID0gW11cbkZhc3RSZW5kZXIuZnJDb250ZXh0ID0gbmV3IE1ldGVvci5FbnZpcm9ubWVudFZhcmlhYmxlKClcblxudmFyIGZhc3RSZW5kZXJSb3V0ZXMgPSBQaWNrZXIuZmlsdGVyKGZ1bmN0aW9uKHJlcSwgcmVzKSB7XG5cdHJldHVybiBJc0FwcFVybChyZXEpXG59KVxuZmFzdFJlbmRlclJvdXRlcy5taWRkbGV3YXJlKGNvbm5lY3QuY29va2llUGFyc2VyKCkpXG5mYXN0UmVuZGVyUm91dGVzLm1pZGRsZXdhcmUoZnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHtcblx0RmFzdFJlbmRlci5oYW5kbGVPbkFsbFJvdXRlcyhyZXEsIHJlcywgbmV4dClcbn0pXG5cbi8vIGhhbmRsaW5nIHNwZWNpZmljIHJvdXRlc1xuRmFzdFJlbmRlci5yb3V0ZSA9IGZ1bmN0aW9uIHJvdXRlKHBhdGgsIGNhbGxiYWNrKSB7XG5cdGlmIChwYXRoLmluZGV4T2YoJy8nKSAhPT0gMCkge1xuXHRcdHRocm93IG5ldyBFcnJvcihcblx0XHRcdCdFcnJvcjogcGF0aCAoJyArIHBhdGggKyAnKSBtdXN0IGJlZ2luIHdpdGggYSBsZWFkaW5nIHNsYXNoIFwiL1wiJ1xuXHRcdClcblx0fVxuXHRmYXN0UmVuZGVyUm91dGVzLnJvdXRlKHBhdGgsIEZhc3RSZW5kZXIuaGFuZGxlUm91dGUuYmluZChudWxsLCBjYWxsYmFjaykpXG59XG5cbmZ1bmN0aW9uIHNldFF1ZXJ5RGF0YUNhbGxiYWNrKHJlcSwgbmV4dCkge1xuXHRyZXR1cm4gZnVuY3Rpb24ocXVlcnlEYXRhKSB7XG5cdFx0aWYgKCFxdWVyeURhdGEpIHJldHVybiBuZXh0KClcblxuXHRcdHZhciBleGlzdGluZ1BheWxvYWQgPSBJbmplY3REYXRhLmdldERhdGEocmVxLCAnZmFzdC1yZW5kZXItZGF0YScpXG5cdFx0aWYgKCFleGlzdGluZ1BheWxvYWQpIHtcblx0XHRcdEluamVjdERhdGEucHVzaERhdGEocmVxLCAnZmFzdC1yZW5kZXItZGF0YScsIHF1ZXJ5RGF0YSlcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gaXQncyBwb3NzaWJsZSB0byBleGVjdXRlIHRoaXMgY2FsbGJhY2sgdHdpY2Vcblx0XHRcdC8vIHRoZSB3ZSBuZWVkIHRvIG1lcmdlIGV4aXNpdG5nIGRhdGEgd2l0aCB0aGUgbmV3IG9uZVxuXHRcdFx0Xy5leHRlbmQoZXhpc3RpbmdQYXlsb2FkLnN1YnNjcmlwdGlvbnMsIHF1ZXJ5RGF0YS5zdWJzY3JpcHRpb25zKVxuXHRcdFx0Xy5lYWNoKHF1ZXJ5RGF0YS5jb2xsZWN0aW9uRGF0YSwgZnVuY3Rpb24oZGF0YSwgcHViTmFtZSkge1xuXHRcdFx0XHR2YXIgZXhpc3RpbmdEYXRhID0gZXhpc3RpbmdQYXlsb2FkLmNvbGxlY3Rpb25EYXRhW3B1Yk5hbWVdXG5cdFx0XHRcdGlmIChleGlzdGluZ0RhdGEpIHtcblx0XHRcdFx0XHRkYXRhID0gZXhpc3RpbmdEYXRhLmNvbmNhdChkYXRhKVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZXhpc3RpbmdQYXlsb2FkLmNvbGxlY3Rpb25EYXRhW3B1Yk5hbWVdID0gZGF0YVxuXHRcdFx0XHRJbmplY3REYXRhLnB1c2hEYXRhKHJlcSwgJ2Zhc3QtcmVuZGVyLWRhdGEnLCBleGlzdGluZ1BheWxvYWQpXG5cdFx0XHR9KVxuXHRcdH1cblx0XHRuZXh0KClcblx0fVxufVxuXG5GYXN0UmVuZGVyLmhhbmRsZVJvdXRlID0gZnVuY3Rpb24ocHJvY2Vzc2luZ0NhbGxiYWNrLCBwYXJhbXMsIHJlcSwgcmVzLCBuZXh0KSB7XG5cdHZhciBhZnRlclByb2Nlc3NlZCA9IHNldFF1ZXJ5RGF0YUNhbGxiYWNrKHJlcSwgbmV4dClcblx0RmFzdFJlbmRlci5fcHJvY2Vzc1JvdXRlcyhwYXJhbXMsIHJlcSwgcHJvY2Vzc2luZ0NhbGxiYWNrLCBhZnRlclByb2Nlc3NlZClcbn1cblxuRmFzdFJlbmRlci5oYW5kbGVPbkFsbFJvdXRlcyA9IGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG5cdHZhciBhZnRlclByb2Nlc3NlZCA9IHNldFF1ZXJ5RGF0YUNhbGxiYWNrKHJlcSwgbmV4dClcblx0RmFzdFJlbmRlci5fcHJvY2Vzc0FsbFJvdXRlcyhyZXEsIGFmdGVyUHJvY2Vzc2VkKVxufVxuXG5GYXN0UmVuZGVyLm9uQWxsUm91dGVzID0gZnVuY3Rpb24gb25BbGxSb3V0ZXMoY2FsbGJhY2spIHtcblx0RmFzdFJlbmRlci5fb25BbGxSb3V0ZXMucHVzaChjYWxsYmFjaylcbn1cblxuRmFzdFJlbmRlci5fcHJvY2Vzc1JvdXRlcyA9IGZ1bmN0aW9uIF9wcm9jZXNzUm91dGVzKFxuXHRwYXJhbXMsXG5cdHJlcSxcblx0cm91dGVDYWxsYmFjayxcblx0Y2FsbGJhY2tcbikge1xuXHRjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uKCkge31cblxuXHR2YXIgcGF0aCA9IHJlcS51cmxcblx0dmFyIGxvZ2luVG9rZW4gPSByZXEuY29va2llc1snbWV0ZW9yX2xvZ2luX3Rva2VuJ11cblx0dmFyIGhlYWRlcnMgPSByZXEuaGVhZGVyc1xuXG5cdHZhciBjb250ZXh0ID0gbmV3IEZhc3RSZW5kZXIuX0NvbnRleHQobG9naW5Ub2tlbiwgeyBoZWFkZXJzOiBoZWFkZXJzIH0pXG5cblx0dHJ5IHtcblx0XHRGYXN0UmVuZGVyLmZyQ29udGV4dC53aXRoVmFsdWUoY29udGV4dCwgZnVuY3Rpb24oKSB7XG5cdFx0XHRyb3V0ZUNhbGxiYWNrLmNhbGwoY29udGV4dCwgcGFyYW1zLCBwYXRoKVxuXHRcdH0pXG5cblx0XHRpZiAoY29udGV4dC5zdG9wKSB7XG5cdFx0XHRyZXR1cm5cblx0XHR9XG5cblx0XHRjYWxsYmFjayhjb250ZXh0LmdldERhdGEoKSlcblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0aGFuZGxlRXJyb3IoZXJyLCBwYXRoLCBjYWxsYmFjaylcblx0fVxufVxuXG5GYXN0UmVuZGVyLl9wcm9jZXNzQWxsUm91dGVzID0gZnVuY3Rpb24gX3Byb2Nlc3NBbGxSb3V0ZXMocmVxLCBjYWxsYmFjaykge1xuXHRjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGZ1bmN0aW9uKCkge31cblxuXHR2YXIgcGF0aCA9IHJlcS51cmxcblx0dmFyIGxvZ2luVG9rZW4gPSByZXEuY29va2llc1snbWV0ZW9yX2xvZ2luX3Rva2VuJ11cblx0dmFyIGhlYWRlcnMgPSByZXEuaGVhZGVyc1xuXG5cdG5ldyBGaWJlcihmdW5jdGlvbigpIHtcblx0XHR2YXIgY29udGV4dCA9IG5ldyBGYXN0UmVuZGVyLl9Db250ZXh0KGxvZ2luVG9rZW4sIHsgaGVhZGVyczogaGVhZGVycyB9KVxuXG5cdFx0dHJ5IHtcblx0XHRcdEZhc3RSZW5kZXIuX29uQWxsUm91dGVzLmZvckVhY2goZnVuY3Rpb24oY2FsbGJhY2spIHtcblx0XHRcdFx0Y2FsbGJhY2suY2FsbChjb250ZXh0LCByZXEudXJsKVxuXHRcdFx0fSlcblxuXHRcdFx0Y2FsbGJhY2soY29udGV4dC5nZXREYXRhKCkpXG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRoYW5kbGVFcnJvcihlcnIsIHBhdGgsIGNhbGxiYWNrKVxuXHRcdH1cblx0fSkucnVuKClcbn1cblxuZnVuY3Rpb24gaGFuZGxlRXJyb3IoZXJyLCBwYXRoLCBjYWxsYmFjaykge1xuXHR2YXIgbWVzc2FnZSA9XG5cdFx0J2Vycm9yIG9uIGZhc3QtcmVuZGVyaW5nIHBhdGg6ICcgKyBwYXRoICsgJyA7IGVycm9yOiAnICsgZXJyLnN0YWNrXG5cdGNvbnNvbGUuZXJyb3IobWVzc2FnZSlcblx0Y2FsbGJhY2sobnVsbClcbn1cblxuLy8gYWRkaW5nIHN1cHBvcnQgZm9yIG51bGwgcHVibGljYXRpb25zXG5GYXN0UmVuZGVyLm9uQWxsUm91dGVzKGZ1bmN0aW9uKCkge1xuXHR2YXIgY29udGV4dCA9IHRoaXNcblx0dmFyIG51bGxIYW5kbGVycyA9IE1ldGVvci5kZWZhdWx0X3NlcnZlci51bml2ZXJzYWxfcHVibGlzaF9oYW5kbGVyc1xuXG5cdGlmIChudWxsSGFuZGxlcnMpIHtcblx0XHRudWxsSGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbihwdWJsaXNoSGFuZGxlcikge1xuXHRcdFx0Ly8gdW5pdmVyc2FsIHN1YnMgaGF2ZSBzdWJzY3JpcHRpb24gSUQsIHBhcmFtcywgYW5kIG5hbWUgdW5kZWZpbmVkXG5cdFx0XHR2YXIgcHVibGlzaENvbnRleHQgPSBuZXcgUHVibGlzaENvbnRleHQoY29udGV4dCwgcHVibGlzaEhhbmRsZXIpXG5cdFx0XHRjb250ZXh0LnByb2Nlc3NQdWJsaWNhdGlvbihwdWJsaXNoQ29udGV4dClcblx0XHR9KVxuXHR9XG59KVxuIiwiaW1wb3J0IHsgUmFuZG9tIH0gZnJvbSAnbWV0ZW9yL3JhbmRvbSdcbmltcG9ydCB7IEVKU09OIH0gZnJvbSAnbWV0ZW9yL2Vqc29uJ1xuaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcidcbmltcG9ydCB7IF8gfSBmcm9tICdtZXRlb3IvdW5kZXJzY29yZSdcbmltcG9ydCB7IE1ldGVvclggfSBmcm9tICdtZXRlb3IvbWV0ZW9yaGFja3M6bWV0ZW9yeCdcblxuY29uc3QgUHVibGlzaENvbnRleHQgPSBmdW5jdGlvbiBQdWJsaXNoQ29udGV4dChcblx0Y29udGV4dCxcblx0aGFuZGxlcixcblx0c3Vic2NyaXB0aW9uSWQsXG5cdHBhcmFtcyxcblx0bmFtZVxuKSB7XG5cdHZhciBzZWxmID0gdGhpc1xuXG5cdC8vIG1vY2sgc2Vzc2lvblxuXHR2YXIgc2Vzc2lvbklkID0gUmFuZG9tLmlkKClcblx0dmFyIHNlc3Npb24gPSB7XG5cdFx0aWQ6IHNlc3Npb25JZCxcblx0XHR1c2VySWQ6IGNvbnRleHQudXNlcklkLFxuXHRcdC8vIG5vdCBudWxsXG5cdFx0aW5RdWV1ZToge30sXG5cdFx0Y29ubmVjdGlvbkhhbmRsZToge1xuXHRcdFx0aWQ6IHNlc3Npb25JZCxcblx0XHRcdGNsb3NlOiBmdW5jdGlvbigpIHt9LFxuXHRcdFx0b25DbG9zZTogZnVuY3Rpb24oKSB7fSxcblx0XHRcdGNsaWVudEFkZHJlc3M6ICcxMjcuMC4wLjEnLFxuXHRcdFx0aHR0cEhlYWRlcnM6IGNvbnRleHQuaGVhZGVycyxcblx0XHR9LFxuXHRcdGFkZGVkOiBmdW5jdGlvbihzdWJzY3JpcHRpb25IYW5kbGUsIGNvbGxlY3Rpb25OYW1lLCBzdHJJZCwgZmllbGRzKSB7XG5cdFx0XHQvLyBEb24ndCBzaGFyZSBzdGF0ZSB3aXRoIHRoZSBkYXRhIHBhc3NlZCBpbiBieSB0aGUgdXNlci5cblx0XHRcdHZhciBkb2MgPSBFSlNPTi5jbG9uZShmaWVsZHMpXG5cdFx0XHRkb2MuX2lkID0gc2VsZi5faWRGaWx0ZXIuaWRQYXJzZShzdHJJZClcblx0XHRcdE1ldGVvci5fZW5zdXJlKHNlbGYuX2NvbGxlY3Rpb25EYXRhLCBjb2xsZWN0aW9uTmFtZSlbc3RySWRdID0gZG9jXG5cdFx0fSxcblx0XHRjaGFuZ2VkOiBmdW5jdGlvbihzdWJzY3JpcHRpb25IYW5kbGUsIGNvbGxlY3Rpb25OYW1lLCBzdHJJZCwgZmllbGRzKSB7XG5cdFx0XHR2YXIgZG9jID0gc2VsZi5fY29sbGVjdGlvbkRhdGFbY29sbGVjdGlvbk5hbWVdW3N0cklkXVxuXHRcdFx0aWYgKCFkb2MpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFxuXHRcdFx0XHRcdCdDb3VsZCBub3QgZmluZCBlbGVtZW50IHdpdGggaWQgJyArIHN0cklkICsgJyB0byBjaGFuZ2UnXG5cdFx0XHRcdClcblx0XHRcdH1cblx0XHRcdF8uZWFjaChmaWVsZHMsIGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcblx0XHRcdFx0Ly8gUHVibGlzaCBBUEkgaWdub3JlcyBfaWQgaWYgcHJlc2VudCBpbiBmaWVsZHMuXG5cdFx0XHRcdGlmIChrZXkgPT09ICdfaWQnKSByZXR1cm5cblxuXHRcdFx0XHRpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdGRlbGV0ZSBkb2Nba2V5XVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIERvbid0IHNoYXJlIHN0YXRlIHdpdGggdGhlIGRhdGEgcGFzc2VkIGluIGJ5IHRoZSB1c2VyLlxuXHRcdFx0XHRcdGRvY1trZXldID0gRUpTT04uY2xvbmUodmFsdWUpXG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0fSxcblx0XHRyZW1vdmVkOiBmdW5jdGlvbihzdWJzY3JpcHRpb25IYW5kbGUsIGNvbGxlY3Rpb25OYW1lLCBzdHJJZCkge1xuXHRcdFx0aWYgKFxuXHRcdFx0XHQhKFxuXHRcdFx0XHRcdHNlbGYuX2NvbGxlY3Rpb25EYXRhW2NvbGxlY3Rpb25OYW1lXSAmJlxuXHRcdFx0XHRcdHNlbGYuX2NvbGxlY3Rpb25EYXRhW2NvbGxlY3Rpb25OYW1lXVtzdHJJZF1cblx0XHRcdFx0KVxuXHRcdFx0KSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcignUmVtb3ZlZCBub25leGlzdGVudCBkb2N1bWVudCAnICsgc3RySWQpXG5cdFx0XHR9XG5cdFx0XHRkZWxldGUgc2VsZi5fY29sbGVjdGlvbkRhdGFbY29sbGVjdGlvbk5hbWVdW3N0cklkXVxuXHRcdH0sXG5cdFx0c2VuZFJlYWR5OiBmdW5jdGlvbihzdWJzY3JpcHRpb25JZHMpIHtcblx0XHRcdC8vIHRoaXMgaXMgY2FsbGVkIG9ubHkgZm9yIG5vbi11bml2ZXJzYWwgc3Vic2NyaXB0aW9uc1xuXHRcdFx0aWYgKCFzZWxmLl9zdWJzY3JpcHRpb25JZCkgdGhyb3cgbmV3IEVycm9yKCdBc3NlcnRpb24uJylcblxuXHRcdFx0Ly8gbWFrZSB0aGUgc3Vic2NyaXB0aW9uIGJlIG1hcmtlZCBhcyByZWFkeVxuXHRcdFx0aWYgKCFzZWxmLl9pc0RlYWN0aXZhdGVkKCkpIHtcblx0XHRcdFx0c2VsZi5fY29udGV4dC5jb21wbGV0ZVN1YnNjcmlwdGlvbnMoc2VsZi5fbmFtZSwgc2VsZi5fcGFyYW1zKVxuXHRcdFx0fVxuXG5cdFx0XHQvLyB3ZSBqdXN0IHN0b3AgaXRcblx0XHRcdHNlbGYuc3RvcCgpXG5cdFx0fSxcblx0fVxuXG5cdE1ldGVvclguU3Vic2NyaXB0aW9uLmNhbGwoXG5cdFx0c2VsZixcblx0XHRzZXNzaW9uLFxuXHRcdGhhbmRsZXIsXG5cdFx0c3Vic2NyaXB0aW9uSWQsXG5cdFx0cGFyYW1zLFxuXHRcdG5hbWVcblx0KVxuXG5cdHNlbGYudW5ibG9jayA9IGZ1bmN0aW9uKCkge31cblxuXHRzZWxmLl9jb250ZXh0ID0gY29udGV4dFxuXHRzZWxmLl9jb2xsZWN0aW9uRGF0YSA9IHt9XG59XG5cblB1Ymxpc2hDb250ZXh0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTWV0ZW9yWC5TdWJzY3JpcHRpb24ucHJvdG90eXBlKVxuUHVibGlzaENvbnRleHQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gUHVibGlzaENvbnRleHRcblxuUHVibGlzaENvbnRleHQucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcblx0Ly8gb3VyIHN0b3AgZG9lcyBub3QgcmVtb3ZlIGFsbCBkb2N1bWVudHMgKGl0IGp1c3QgY2FsbHMgZGVhY3RpdmF0ZSlcblx0Ly8gTWV0ZW9yIG9uZSByZW1vdmVzIGRvY3VtZW50cyBmb3Igbm9uLXVuaXZlcnNhbCBzdWJzY3JpcHRpb25cblx0Ly8gd2UgZGVhY3RpdmF0ZSBib3RoIGZvciB1bml2ZXJzYWwgYW5kIG5hbWVkIHN1YnNjcmlwdGlvbnNcblx0Ly8gaG9wZWZ1bGx5IHRoaXMgaXMgcmlnaHQgaW4gb3VyIGNhc2Vcblx0Ly8gTWV0ZW9yIGRvZXMgaXQganVzdCBmb3IgbmFtZWQgc3Vic2NyaXB0aW9uc1xuXHR0aGlzLl9kZWFjdGl2YXRlKClcbn1cblxuUHVibGlzaENvbnRleHQucHJvdG90eXBlLmVycm9yID0gZnVuY3Rpb24oZXJyb3IpIHtcblx0Ly8gVE9ETzogU2hvdWxkIHdlIHBhc3MgdGhlIGVycm9yIHRvIHRoZSBzdWJzY3JpcHRpb24gc29tZWhvdz9cblx0Y29uc29sZS53YXJuKFxuXHRcdCdlcnJvciBjYXVnaHQgb24gcHVibGljYXRpb246ICcsXG5cdFx0dGhpcy5fbmFtZSxcblx0XHQnOiAnLFxuXHRcdGVycm9yLm1lc3NhZ2UgfHwgZXJyb3Jcblx0KVxuXHR0aGlzLnN0b3AoKVxufVxuXG5leHBvcnQgZGVmYXVsdCBQdWJsaXNoQ29udGV4dFxuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcidcbmltcG9ydCBGaWJlcnMgZnJvbSAnZmliZXJzJ1xuaW1wb3J0IEZ1dHVyZSBmcm9tICdmaWJlcnMvZnV0dXJlJ1xuaW1wb3J0IHsgQWNjb3VudHMgfSBmcm9tICdtZXRlb3IvYWNjb3VudHMtYmFzZSdcbmltcG9ydCB7IEREUCB9IGZyb20gJ21ldGVvci9kZHAnXG5pbXBvcnQgeyBSYW5kb20gfSBmcm9tICdtZXRlb3IvcmFuZG9tJ1xuaW1wb3J0IFB1Ymxpc2hDb250ZXh0IGZyb20gJy4vcHVibGlzaF9jb250ZXh0J1xuaW1wb3J0IHsgXyB9IGZyb20gJ21ldGVvci91bmRlcnNjb3JlJ1xuaW1wb3J0IHsgRUpTT04gfSBmcm9tICdtZXRlb3IvZWpzb24nXG5pbXBvcnQgeyBGYXN0UmVuZGVyIH0gZnJvbSAnLi9uYW1lc3BhY2UnXG5cbmNvbnN0IENvbnRleHQgPSBmdW5jdGlvbiBDb250ZXh0KGxvZ2luVG9rZW4sIG90aGVyUGFyYW1zKSB7XG5cdHRoaXMuX2NvbGxlY3Rpb25EYXRhID0ge31cblx0dGhpcy5fc3Vic2NyaXB0aW9ucyA9IHt9XG5cdHRoaXMuX2xvZ2luVG9rZW4gPSBsb2dpblRva2VuXG5cblx0Xy5leHRlbmQodGhpcywgb3RoZXJQYXJhbXMpXG5cblx0Ly8gZ2V0IHRoZSB1c2VyXG5cdGlmIChNZXRlb3IudXNlcnMpIHtcblx0XHQvLyBjaGVjayB0byBtYWtlIHN1cmUsIHdlJ3ZlIHRoZSBsb2dpblRva2VuLFxuXHRcdC8vIG90aGVyd2lzZSBhIHJhbmRvbSB1c2VyIHdpbGwgZmV0Y2hlZCBmcm9tIHRoZSBkYlxuXHRcdGlmIChsb2dpblRva2VuKSB7XG5cdFx0XHR2YXIgaGFzaGVkVG9rZW4gPSBsb2dpblRva2VuICYmIEFjY291bnRzLl9oYXNoTG9naW5Ub2tlbihsb2dpblRva2VuKVxuXHRcdFx0dmFyIHF1ZXJ5ID0geyAnc2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zLmhhc2hlZFRva2VuJzogaGFzaGVkVG9rZW4gfVxuXHRcdFx0dmFyIG9wdGlvbnMgPSB7IGZpZWxkczogeyBfaWQ6IDEgfSB9XG5cdFx0XHR2YXIgdXNlciA9IE1ldGVvci51c2Vycy5maW5kT25lKHF1ZXJ5LCBvcHRpb25zKVxuXHRcdH1cblxuXHRcdC8vIHN1cHBvcnQgZm9yIE1ldGVvci51c2VyXG5cdFx0RmliZXJzLmN1cnJlbnQuX21ldGVvcl9keW5hbWljcyA9IFtdXG5cdFx0RmliZXJzLmN1cnJlbnQuX21ldGVvcl9keW5hbWljc1tERFAuX0N1cnJlbnRJbnZvY2F0aW9uLnNsb3RdID0gdGhpc1xuXG5cdFx0aWYgKHVzZXIpIHtcblx0XHRcdHRoaXMudXNlcklkID0gdXNlci5faWRcblx0XHR9XG5cdH1cbn1cblxuQ29udGV4dC5wcm90b3R5cGUuc3Vic2NyaWJlID0gZnVuY3Rpb24oc3ViTmFtZSAvKiwgcGFyYW1zICovKSB7XG5cdHZhciBwdWJsaXNoSGFuZGxlciA9IE1ldGVvci5kZWZhdWx0X3NlcnZlci5wdWJsaXNoX2hhbmRsZXJzW3N1Yk5hbWVdXG5cdGlmIChwdWJsaXNoSGFuZGxlcikge1xuXHRcdHZhciBwYXJhbXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpXG5cdFx0Ly8gbm9uLXVuaXZlcnNhbCBzdWJzIGhhdmUgc3Vic2NyaXB0aW9uIGlkXG5cdFx0dmFyIHN1YnNjcmlwdGlvbklkID0gUmFuZG9tLmlkKClcblx0XHR2YXIgcHVibGlzaENvbnRleHQgPSBuZXcgUHVibGlzaENvbnRleHQoXG5cdFx0XHR0aGlzLFxuXHRcdFx0cHVibGlzaEhhbmRsZXIsXG5cdFx0XHRzdWJzY3JpcHRpb25JZCxcblx0XHRcdHBhcmFtcyxcblx0XHRcdHN1Yk5hbWVcblx0XHQpXG5cblx0XHRyZXR1cm4gdGhpcy5wcm9jZXNzUHVibGljYXRpb24ocHVibGlzaENvbnRleHQpXG5cdH0gZWxzZSB7XG5cdFx0Y29uc29sZS53YXJuKCdUaGVyZSBpcyBubyBzdWNoIHB1Ymxpc2ggaGFuZGxlciBuYW1lZDonLCBzdWJOYW1lKVxuXHRcdHJldHVybiB7fVxuXHR9XG59XG5cbkNvbnRleHQucHJvdG90eXBlLnByb2Nlc3NQdWJsaWNhdGlvbiA9IGZ1bmN0aW9uKHB1Ymxpc2hDb250ZXh0KSB7XG5cdHZhciBzZWxmID0gdGhpc1xuXHR2YXIgZGF0YSA9IHt9XG5cdHZhciBlbnN1cmVDb2xsZWN0aW9uID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUpIHtcblx0XHRzZWxmLl9lbnN1cmVDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKVxuXHRcdGlmICghZGF0YVtjb2xsZWN0aW9uTmFtZV0pIHtcblx0XHRcdGRhdGFbY29sbGVjdGlvbk5hbWVdID0gW11cblx0XHR9XG5cdH1cblxuXHR2YXIgZnV0dXJlID0gbmV3IEZ1dHVyZSgpXG5cdC8vIGRldGVjdCB3aGVuIHRoZSBjb250ZXh0IGlzIHJlYWR5IHRvIGJlIHNlbnQgdG8gdGhlIGNsaWVudFxuXHRwdWJsaXNoQ29udGV4dC5vblN0b3AoZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCFmdXR1cmUuaXNSZXNvbHZlZCgpKSB7XG5cdFx0XHRmdXR1cmUucmV0dXJuKClcblx0XHR9XG5cdH0pXG5cblx0cHVibGlzaENvbnRleHQuX3J1bkhhbmRsZXIoKVxuXG5cdGlmICghcHVibGlzaENvbnRleHQuX3N1YnNjcmlwdGlvbklkKSB7XG5cdFx0Ly8gdW5pdmVyc2FsIHN1YnNjcmlwdGlvbiwgd2Ugc3RvcCBpdCAoc2FtZSBhcyBtYXJraW5nIGl0IGFzIHJlYWR5KSBvdXJzZWx2ZXNcblx0XHQvLyB0aGV5IG90aGVyd2lzZSBkbyBub3QgaGF2ZSByZWFkeSBvciBzdG9wcGVkIHN0YXRlLCBidXQgaW4gb3VyIGNhc2UgdGhleSBkb1xuXHRcdHB1Ymxpc2hDb250ZXh0LnN0b3AoKVxuXHR9XG5cblx0aWYgKCFmdXR1cmUuaXNSZXNvbHZlZCgpKSB7XG5cdFx0Ly8gZG9uJ3Qgd2FpdCBmb3JldmVyIGZvciBoYW5kbGVyIHRvIGZpcmUgcmVhZHkoKVxuXHRcdE1ldGVvci5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCFmdXR1cmUuaXNSZXNvbHZlZCgpKSB7XG5cdFx0XHRcdC8vIHB1Ymxpc2ggaGFuZGxlciBmYWlsZWQgdG8gc2VuZCByZWFkeSBzaWduYWwgaW4gdGltZVxuXHRcdFx0XHQvLyBtYXliZSB5b3VyIG5vbi11bml2ZXJzYWwgcHVibGlzaCBoYW5kbGVyIGlzIG5vdCBjYWxsaW5nIHRoaXMucmVhZHkoKT9cblx0XHRcdFx0Ly8gb3IgbWF5YmUgaXQgaXMgcmV0dXJuaW5nIG51bGwgdG8gc2lnbmFsIGVtcHR5IHB1Ymxpc2g/XG5cdFx0XHRcdC8vIGl0IHNob3VsZCBzdGlsbCBjYWxsIHRoaXMucmVhZHkoKSBvciByZXR1cm4gYW4gZW1wdHkgYXJyYXkgW11cblx0XHRcdFx0dmFyIG1lc3NhZ2UgPVxuXHRcdFx0XHRcdCdQdWJsaXNoIGhhbmRsZXIgZm9yICcgK1xuXHRcdFx0XHRcdHB1Ymxpc2hDb250ZXh0Ll9uYW1lICtcblx0XHRcdFx0XHQnIHNlbnQgbm8gcmVhZHkgc2lnbmFsXFxuJyArXG5cdFx0XHRcdFx0JyBUaGlzIGNvdWxkIGJlIGJlY2F1c2UgdGhpcyBwdWJsaWNhdGlvbiBgcmV0dXJuIG51bGxgLlxcbicgK1xuXHRcdFx0XHRcdCcgVXNlIGByZXR1cm4gdGhpcy5yZWFkeSgpYCBpbnN0ZWFkLidcblx0XHRcdFx0Y29uc29sZS53YXJuKG1lc3NhZ2UpXG5cdFx0XHRcdGZ1dHVyZS5yZXR1cm4oKVxuXHRcdFx0fVxuXHRcdH0sIDUwMCkgLy8gYXJiaXRyYXJpYWxseSBzZXQgdGltZW91dCB0byA1MDBtcywgc2hvdWxkIHByb2JhYmx5IGJlIGNvbmZpZ3VyYWJsZVxuXG5cdFx0Ly8gIHdhaXQgZm9yIHRoZSBzdWJzY3JpcHRpb24gYmVjYW1lIHJlYWR5LlxuXHRcdGZ1dHVyZS53YWl0KClcblx0fVxuXG5cdC8vIHN0b3AgYW55IHJ1bmF3YXkgc3Vic2NyaXB0aW9uXG5cdC8vIHRoaXMgY2FuIGhhcHBlbiBpZiBhIHB1Ymxpc2ggaGFuZGxlciBuZXZlciBjYWxscyByZWFkeSBvciBzdG9wLCBmb3IgZXhhbXBsZVxuXHQvLyBpdCBkb2VzIG5vdCBodXJ0IHRvIGNhbGwgaXQgbXVsdGlwbGUgdGltZXNcblx0cHVibGlzaENvbnRleHQuc3RvcCgpXG5cblx0Ly8gZ2V0IHRoZSBkYXRhXG5cdF8uZWFjaChwdWJsaXNoQ29udGV4dC5fY29sbGVjdGlvbkRhdGEsIGZ1bmN0aW9uKGNvbGxEYXRhLCBjb2xsZWN0aW9uTmFtZSkge1xuXHRcdC8vIG1ha2luZyBhbiBhcnJheSBmcm9tIGEgbWFwXG5cdFx0Y29sbERhdGEgPSBfLnZhbHVlcyhjb2xsRGF0YSlcblxuXHRcdGVuc3VyZUNvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpXG5cdFx0ZGF0YVtjb2xsZWN0aW9uTmFtZV0ucHVzaChjb2xsRGF0YSlcblxuXHRcdC8vIGNvcHkgdGhlIGNvbGxlY3Rpb24gZGF0YSBpbiBwdWJsaXNoIGNvbnRleHQgaW50byB0aGUgRlIgY29udGV4dFxuXHRcdHNlbGYuX2NvbGxlY3Rpb25EYXRhW2NvbGxlY3Rpb25OYW1lXS5wdXNoKGNvbGxEYXRhKVxuXHR9KVxuXG5cdHJldHVybiBkYXRhXG59XG5cbkNvbnRleHQucHJvdG90eXBlLmNvbXBsZXRlU3Vic2NyaXB0aW9ucyA9IGZ1bmN0aW9uKG5hbWUsIHBhcmFtcykge1xuXHR2YXIgc3VicyA9IHRoaXMuX3N1YnNjcmlwdGlvbnNbbmFtZV1cblx0aWYgKCFzdWJzKSB7XG5cdFx0c3VicyA9IHRoaXMuX3N1YnNjcmlwdGlvbnNbbmFtZV0gPSB7fVxuXHR9XG5cblx0c3Vic1tFSlNPTi5zdHJpbmdpZnkocGFyYW1zKV0gPSB0cnVlXG59XG5cbkNvbnRleHQucHJvdG90eXBlLl9lbnN1cmVDb2xsZWN0aW9uID0gZnVuY3Rpb24oY29sbGVjdGlvbk5hbWUpIHtcblx0aWYgKCF0aGlzLl9jb2xsZWN0aW9uRGF0YVtjb2xsZWN0aW9uTmFtZV0pIHtcblx0XHR0aGlzLl9jb2xsZWN0aW9uRGF0YVtjb2xsZWN0aW9uTmFtZV0gPSBbXVxuXHR9XG59XG5cbkNvbnRleHQucHJvdG90eXBlLmdldERhdGEgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHtcblx0XHRjb2xsZWN0aW9uRGF0YTogdGhpcy5fY29sbGVjdGlvbkRhdGEsXG5cdFx0c3Vic2NyaXB0aW9uczogdGhpcy5fc3Vic2NyaXB0aW9ucyxcblx0XHRsb2dpblRva2VuOiB0aGlzLl9sb2dpblRva2VuLFxuXHR9XG59XG5cbkZhc3RSZW5kZXIuX0NvbnRleHQgPSBDb250ZXh0XG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJ1xuaW1wb3J0IHsgRmFzdFJlbmRlciB9IGZyb20gJ21ldGVvci9zdGFyaW5nYXRsaWdodHM6ZmFzdC1yZW5kZXInXG5pbXBvcnQgeyBJbmplY3REYXRhIH0gZnJvbSAnbWV0ZW9yL3N0YXJpbmdhdGxpZ2h0czppbmplY3QtZGF0YSdcbmltcG9ydCB7IG9uUGFnZUxvYWQgfSBmcm9tICdtZXRlb3Ivc2VydmVyLXJlbmRlcidcbmltcG9ydCB7IF8gfSBmcm9tICdtZXRlb3IvdW5kZXJzY29yZSdcblxuY29uc3Qgb3JpZ2luYWxTdWJzY3JpYmUgPSBNZXRlb3Iuc3Vic2NyaWJlXG5NZXRlb3Iuc3Vic2NyaWJlID0gZnVuY3Rpb24obmFtZSwgLi4uYXJncykge1xuXHRjb25zdCBmckNvbnRleHQgPSBGYXN0UmVuZGVyLmZyQ29udGV4dC5nZXQoKVxuXHRpZiAoIWZyQ29udGV4dCkge1xuXHRcdHRocm93IG5ldyBFcnJvcihcblx0XHRcdGBDYW5ub3QgYWRkIGEgc3Vic2NyaXB0aW9uOiAke25hbWV9IHdpdGhvdXQgRmFzdFJlbmRlciBDb250ZXh0YFxuXHRcdClcblx0fVxuXHRmckNvbnRleHQuc3Vic2NyaWJlKG5hbWUsIC4uLmFyZ3MpXG5cblx0aWYgKG9yaWdpbmFsU3Vic2NyaWJlKSB7XG5cdFx0b3JpZ2luYWxTdWJzY3JpYmUuYXBwbHkodGhpcywgYXJndW1lbnRzKVxuXHR9XG5cblx0cmV0dXJuIHtcblx0XHRyZWFkeTogKCkgPT4gdHJ1ZSxcblx0fVxufVxuXG5GYXN0UmVuZGVyLl9tZXJnZUZyRGF0YSA9IGZ1bmN0aW9uKHJlcSwgcXVlcnlEYXRhKSB7XG5cdHZhciBleGlzdGluZ1BheWxvYWQgPSBJbmplY3REYXRhLmdldERhdGEocmVxLCAnZmFzdC1yZW5kZXItZGF0YScpXG5cdGlmICghZXhpc3RpbmdQYXlsb2FkKSB7XG5cdFx0SW5qZWN0RGF0YS5wdXNoRGF0YShyZXEsICdmYXN0LXJlbmRlci1kYXRhJywgcXVlcnlEYXRhKVxuXHR9IGVsc2Uge1xuXHRcdC8vIGl0J3MgcG9zc2libGUgdG8gZXhlY3V0ZSB0aGlzIGNhbGxiYWNrIHR3aWNlXG5cdFx0Ly8gdGhlIHdlIG5lZWQgdG8gbWVyZ2UgZXhpc2l0bmcgZGF0YSB3aXRoIHRoZSBuZXcgb25lXG5cdFx0Xy5leHRlbmQoZXhpc3RpbmdQYXlsb2FkLnN1YnNjcmlwdGlvbnMsIHF1ZXJ5RGF0YS5zdWJzY3JpcHRpb25zKVxuXHRcdF8uZWFjaChxdWVyeURhdGEuY29sbGVjdGlvbkRhdGEsIGZ1bmN0aW9uKGRhdGEsIHB1Yk5hbWUpIHtcblx0XHRcdHZhciBleGlzdGluZ0RhdGEgPSBleGlzdGluZ1BheWxvYWQuY29sbGVjdGlvbkRhdGFbcHViTmFtZV1cblx0XHRcdGlmIChleGlzdGluZ0RhdGEpIHtcblx0XHRcdFx0ZGF0YSA9IGV4aXN0aW5nRGF0YS5jb25jYXQoZGF0YSlcblx0XHRcdH1cblxuXHRcdFx0ZXhpc3RpbmdQYXlsb2FkLmNvbGxlY3Rpb25EYXRhW3B1Yk5hbWVdID0gZGF0YVxuXHRcdFx0SW5qZWN0RGF0YS5wdXNoRGF0YShyZXEsICdmYXN0LXJlbmRlci1kYXRhJywgZXhpc3RpbmdQYXlsb2FkKVxuXHRcdH0pXG5cdH1cbn1cblxuRmFzdFJlbmRlci5vblBhZ2VMb2FkID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcblx0SW5qZWN0RGF0YS5pbmplY3RUb0hlYWQgPSBmYWxzZVxuXHRvblBhZ2VMb2FkKGFzeW5jIHNpbmsgPT4ge1xuXHRcdGNvbnN0IGZyQ29udGV4dCA9IG5ldyBGYXN0UmVuZGVyLl9Db250ZXh0KFxuXHRcdFx0c2luay5yZXF1ZXN0LmNvb2tpZXMubWV0ZW9yX2xvZ2luX3Rva2VuLFxuXHRcdFx0e1xuXHRcdFx0XHRoZWFkZXJzOiBzaW5rLmhlYWRlcnMsXG5cdFx0XHR9XG5cdFx0KVxuXG5cdFx0YXdhaXQgRmFzdFJlbmRlci5mckNvbnRleHQud2l0aFZhbHVlKGZyQ29udGV4dCwgYXN5bmMgZnVuY3Rpb24oKSB7XG5cdFx0XHRhd2FpdCBjYWxsYmFjayhzaW5rKVxuXHRcdFx0RmFzdFJlbmRlci5fbWVyZ2VGckRhdGEoXG5cdFx0XHRcdHNpbmsucmVxdWVzdCxcblx0XHRcdFx0RmFzdFJlbmRlci5mckNvbnRleHQuZ2V0KCkuZ2V0RGF0YSgpXG5cdFx0XHQpXG5cdFx0fSlcblx0fSlcbn1cbiJdfQ==
