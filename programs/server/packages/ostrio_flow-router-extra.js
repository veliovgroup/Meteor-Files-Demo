(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var meteorInstall = Package.modules.meteorInstall;
var ECMAScript = Package.ecmascript.ECMAScript;
var Promise = Package.promise.Promise;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var ReactiveDict = Package['reactive-dict'].ReactiveDict;
var ReactiveVar = Package['reactive-var'].ReactiveVar;
var EJSON = Package.ejson.EJSON;
var check = Package.check.check;
var Match = Package.check.Match;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:flow-router-extra":{"server":{"_init.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/ostrio_flow-router-extra/server/_init.js                                                //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.export({
  FlowRouter: () => FlowRouter,
  Router: () => Router,
  Route: () => Route,
  Group: () => Group,
  Triggers: () => Triggers,
  BlazeRenderer: () => BlazeRenderer
});
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Router;
module.link("./router.js", {
  default(v) {
    Router = v;
  }

}, 1);
let Route;
module.link("./route.js", {
  default(v) {
    Route = v;
  }

}, 2);
let Group;
module.link("./group.js", {
  default(v) {
    Group = v;
  }

}, 3);
module.link("./plugins/fast-render.js");

if (Package['meteorhacks:inject-data']) {
  Meteor._debug('`meteorhacks:inject-data` is deprecated, please remove it and install its successor - `staringatlights:inject-data`');

  Meteor._debug('meteor remove meteorhacks:inject-data');

  Meteor._debug('meteor add staringatlights:inject-data');
}

if (Package['meteorhacks:fast-render']) {
  Meteor._debug('`meteorhacks:fast-render` is deprecated, please remove it and install its successor - `staringatlights:fast-render`');

  Meteor._debug('meteor remove meteorhacks:fast-render');

  Meteor._debug('meteor add staringatlights:fast-render');
}

const Triggers = {};
const BlazeRenderer = {};
const FlowRouter = new Router();
FlowRouter.Router = Router;
FlowRouter.Route = Route;
//////////////////////////////////////////////////////////////////////////////////////////////////////

},"group.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/ostrio_flow-router-extra/server/group.js                                                //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
let _helpers;

module.link("./../lib/_helpers.js", {
  _helpers(v) {
    _helpers = v;
  }

}, 0);

const makeTrigger = trigger => {
  if (_helpers.isFunction(trigger)) {
    return [trigger];
  } else if (!_helpers.isArray(trigger)) {
    return [];
  }

  return trigger;
};

const makeTriggers = (_base, _triggers) => {
  if (!_base && !_triggers) {
    return [];
  }

  return makeTrigger(_base).concat(makeTrigger(_triggers));
};

class Group {
  constructor(router, options = {}, parent) {
    if (options.prefix && !/^\//.test(options.prefix)) {
      throw new Error('group\'s prefix must start with "/"');
    }

    this._router = router;
    this.prefix = options.prefix || '';
    this.name = options.name;
    this.options = options;
    this._triggersEnter = makeTriggers(options.triggersEnter, this._triggersEnter);
    this._triggersExit = makeTriggers(this._triggersExit, options.triggersExit);
    this._subscriptions = options.subscriptions || Function.prototype;
    this.parent = parent;

    if (this.parent) {
      this.prefix = parent.prefix + this.prefix;
      this._triggersEnter = makeTriggers(parent._triggersEnter, this._triggersEnter);
      this._triggersExit = makeTriggers(this._triggersExit, parent._triggersExit);
    }
  }

  route(_pathDef, options = {}, _group) {
    if (!/^\//.test(_pathDef)) {
      throw new Error('route\'s path must start with "/"');
    }

    const group = _group || this;
    const pathDef = this.prefix + _pathDef;
    options.triggersEnter = makeTriggers(this._triggersEnter, options.triggersEnter);
    options.triggersExit = makeTriggers(options.triggersExit, this._triggersExit);
    return this._router.route(pathDef, _helpers.extend(_helpers.omit(this.options, ['triggersEnter', 'triggersExit', 'subscriptions', 'prefix', 'waitOn', 'name', 'title', 'titlePrefix', 'link', 'script', 'meta']), options), group);
  }

  group(options) {
    return new Group(this._router, options, this);
  }

}

module.exportDefault(Group);
//////////////////////////////////////////////////////////////////////////////////////////////////////

},"route.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/ostrio_flow-router-extra/server/route.js                                                //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
class Route {
  constructor(router, pathDef, options = {}) {
    this.options = options;
    this.name = options.name;
    this.pathDef = pathDef; // Route.path is deprecated and will be removed in 3.0

    this.path = pathDef;
    this.action = options.action || Function.prototype;
    this.subscriptions = options.subscriptions || Function.prototype;
    this._subsMap = {};
  }

  register(name, sub) {
    this._subsMap[name] = sub;
  }

  subscription(name) {
    return this._subsMap[name];
  }

  middleware() {// ?
  }

}

module.exportDefault(Route);
//////////////////////////////////////////////////////////////////////////////////////////////////////

},"router.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/ostrio_flow-router-extra/server/router.js                                               //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
let page;
module.link("page", {
  default(v) {
    page = v;
  }

}, 0);
let Route;
module.link("./route.js", {
  default(v) {
    Route = v;
  }

}, 1);
let Group;
module.link("./group.js", {
  default(v) {
    Group = v;
  }

}, 2);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 3);

let _helpers;

module.link("../lib/_helpers.js", {
  _helpers(v) {
    _helpers = v;
  }

}, 4);

const qs = require('qs');

class Router {
  constructor() {
    this.pathRegExp = /(:[\w\(\)\\\+\*\.\?\[\]\-]+)+/g;
    this._routes = [];
    this._routesMap = {};
    this._current = {};
    this._specialChars = ['/', '%', '+'];

    this._encodeParam = param => {
      const paramArr = param.split('');
      let _param = '';

      for (let i = 0; i < paramArr.length; i++) {
        if (this._specialChars.includes(paramArr[i])) {
          _param += encodeURIComponent(encodeURIComponent(paramArr[i]));
        } else {
          try {
            _param += encodeURIComponent(paramArr[i]);
          } catch (e) {
            _param += paramArr[i];
          }
        }
      }

      return _param;
    };

    this.subscriptions = Function.prototype; // holds onRoute callbacks

    this._onRouteCallbacks = [];
    this.triggers = {
      enter() {// client only
      },

      exit() {// client only
      }

    };
  }

  matchPath(path) {
    const params = {};

    const route = this._routes.find(r => {
      const pageRoute = new page.Route(r.pathDef);
      return pageRoute.match(path, params);
    });

    if (!route) {
      return null;
    }

    return {
      params: _helpers.clone(params),
      route: _helpers.clone(route)
    };
  }

  setCurrent(current) {
    this._current = current;
  }

  route(pathDef, options = {}) {
    if (!/^\/.*/.test(pathDef) && pathDef !== '*') {
      throw new Error('route\'s path must start with "/"');
    }

    const route = new Route(this, pathDef, options);

    this._routes.push(route);

    if (options.name) {
      this._routesMap[options.name] = route;
    }

    this._triggerRouteRegister(route);

    return route;
  }

  group(options) {
    return new Group(this, options);
  }

  path(_pathDef, fields = {}, queryParams) {
    let pathDef = _pathDef;

    if (this._routesMap[pathDef]) {
      pathDef = this._routesMap[pathDef].path;
    }

    let path = pathDef.replace(this.pathRegExp, _key => {
      const firstRegexpChar = _key.indexOf('('); // get the content behind : and (\\d+/)


      let key = _key.substring(1, firstRegexpChar > 0 ? firstRegexpChar : undefined); // remove +?*


      key = key.replace(/[\+\*\?]+/g, '');

      if (fields[key]) {
        return this._encodeParam(`${fields[key]}`);
      }

      return '';
    });
    path = path.replace(/\/\/+/g, '/'); // Replace multiple slashes with single slash
    // remove trailing slash
    // but keep the root slash if it's the only one

    path = path.match(/^\/{1}$/) ? path : path.replace(/\/$/, '');
    const strQueryParams = qs.stringify(queryParams || {});

    if (strQueryParams) {
      path += `?${strQueryParams}`;
    }

    return path;
  }

  onRouteRegister(cb) {
    this._onRouteCallbacks.push(cb);
  }

  _triggerRouteRegister(currentRoute) {
    // We should only need to send a safe set of fields on the route
    // object.
    // This is not to hide what's inside the route object, but to show
    // these are the public APIs
    const routePublicApi = _helpers.pick(currentRoute, ['name', 'pathDef', 'path']);

    routePublicApi.options = _helpers.omit(currentRoute.options, ['triggersEnter', 'triggersExit', 'action', 'subscriptions', 'name']);

    this._onRouteCallbacks.forEach(cb => {
      cb(routePublicApi);
    });
  }

  go() {// client only
  }

  current() {
    // client only
    return this._current;
  }

  middleware() {// client only
  }

  getState() {// client only
  }

  getAllStates() {// client only
  }

  getRouteName() {
    return this._current.route ? this._current.route.name : undefined;
  }

  getQueryParam(key) {
    return this._current.query ? this._current.queryParams[key] : undefined;
  }

  setState() {// client only
  }

  setParams() {}

  removeState() {// client only
  }

  clearStates() {// client only
  }

  ready() {// client only
  }

  initialize() {// client only
  }

  wait() {// client only
  }

  url() {
    // We need to remove the leading base path, or "/", as it will be inserted
    // automatically by `Meteor.absoluteUrl` as documented in:
    // http://docs.meteor.com/#/full/meteor_absoluteurl
    return Meteor.absoluteUrl(this.path.apply(this, arguments).replace(new RegExp('^' + ('/' + (this._basePath || '') + '/').replace(/\/\/+/g, '/')), ''));
  }

}

module.exportDefault(Router);
//////////////////////////////////////////////////////////////////////////////////////////////////////

},"plugins":{"fast-render.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/ostrio_flow-router-extra/server/plugins/fast-render.js                                  //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);

let _helpers;

module.link("./../../lib/_helpers.js", {
  _helpers(v) {
    _helpers = v;
  }

}, 1);
let FlowRouter;
module.link("../_init.js", {
  FlowRouter(v) {
    FlowRouter = v;
  }

}, 2);

if (!Package['staringatlights:fast-render']) {
  return;
}

const FastRender = Package['staringatlights:fast-render'].FastRender;

const setupFastRender = () => {
  FlowRouter._routes.forEach(route => {
    if (route.pathDef === '*') {
      return;
    }

    FastRender.route(route.pathDef, function (routeParams, path) {
      // anyone using Meteor.subscribe for something else?
      const meteorSubscribe = Meteor.subscribe;

      Meteor.subscribe = function () {
        return Array.from(arguments);
      };

      route._subsMap = {};
      FlowRouter.subscriptions.call(route, path);

      if (route.subscriptions) {
        route.subscriptions(_helpers.omit(routeParams, ['query']), routeParams.query);
      }

      Object.keys(route._subsMap).forEach(key => {
        this.subscribe.apply(this, route._subsMap[key]);
      }); // restore Meteor.subscribe, ... on server side

      Meteor.subscribe = meteorSubscribe;
    });
  });
}; // hack to run after everything else on startup


Meteor.startup(() => {
  Meteor.startup(() => {
    setupFastRender();
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"lib":{"_helpers.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// packages/ostrio_flow-router-extra/lib/_helpers.js                                                //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.export({
  _helpers: () => _helpers
});
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
const _helpers = {
  isEmpty(obj) {
    // 1
    if (obj == null) {
      return true;
    }

    if (this.isArray(obj) || this.isString(obj) || this.isArguments(obj)) {
      return obj.length === 0;
    }

    return Object.keys(obj).length === 0;
  },

  isObject(obj) {
    const type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  },

  omit(obj, keys) {
    // 10
    if (!this.isObject(obj)) {
      Meteor._debug('[ostrio:flow-router-extra] [_helpers.omit] First argument must be an Object');

      return obj;
    }

    if (!this.isArray(keys)) {
      Meteor._debug('[ostrio:flow-router-extra] [_helpers.omit] Second argument must be an Array');

      return obj;
    }

    const copy = this.clone(obj);
    keys.forEach(key => {
      delete copy[key];
    });
    return copy;
  },

  pick(obj, keys) {
    // 2
    if (!this.isObject(obj)) {
      Meteor._debug('[ostrio:flow-router-extra] [_helpers.omit] First argument must be an Object');

      return obj;
    }

    if (!this.isArray(keys)) {
      Meteor._debug('[ostrio:flow-router-extra] [_helpers.omit] Second argument must be an Array');

      return obj;
    }

    const picked = {};
    keys.forEach(key => {
      picked[key] = obj[key];
    });
    return picked;
  },

  isArray(obj) {
    return Array.isArray(obj);
  },

  extend(...objs) {
    // 4
    return Object.assign({}, ...objs);
  },

  clone(obj) {
    if (!this.isObject(obj)) return obj;
    return this.isArray(obj) ? obj.slice() : this.extend(obj);
  }

};
['Arguments', 'Function', 'String', 'RegExp'].forEach(name => {
  _helpers['is' + name] = function (obj) {
    return Object.prototype.toString.call(obj) === '[object ' + name + ']';
  };
});
//////////////////////////////////////////////////////////////////////////////////////////////////////

}},"node_modules":{"page":{"package.json":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/meteor/ostrio_flow-router-extra/node_modules/page/package.json                      //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.exports = {
  "name": "page",
  "version": "1.9.0",
  "main": "index.js"
};

//////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/meteor/ostrio_flow-router-extra/node_modules/page/index.js                          //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////

}},"qs":{"package.json":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/meteor/ostrio_flow-router-extra/node_modules/qs/package.json                        //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.exports = {
  "name": "qs",
  "version": "6.5.2",
  "main": "lib/index.js"
};

//////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                  //
// node_modules/meteor/ostrio_flow-router-extra/node_modules/qs/lib/index.js                        //
//                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                    //
module.useNode();
//////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/ostrio:flow-router-extra/server/_init.js");

/* Exports */
Package._define("ostrio:flow-router-extra", exports);

})();

//# sourceURL=meteor://💻app/packages/ostrio_flow-router-extra.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZsb3ctcm91dGVyLWV4dHJhL3NlcnZlci9faW5pdC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZsb3ctcm91dGVyLWV4dHJhL3NlcnZlci9ncm91cC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZsb3ctcm91dGVyLWV4dHJhL3NlcnZlci9yb3V0ZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZsb3ctcm91dGVyLWV4dHJhL3NlcnZlci9yb3V0ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL29zdHJpbzpmbG93LXJvdXRlci1leHRyYS9zZXJ2ZXIvcGx1Z2lucy9mYXN0LXJlbmRlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZsb3ctcm91dGVyLWV4dHJhL2xpYi9faGVscGVycy5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJGbG93Um91dGVyIiwiUm91dGVyIiwiUm91dGUiLCJHcm91cCIsIlRyaWdnZXJzIiwiQmxhemVSZW5kZXJlciIsIk1ldGVvciIsImxpbmsiLCJ2IiwiZGVmYXVsdCIsIlBhY2thZ2UiLCJfZGVidWciLCJfaGVscGVycyIsIm1ha2VUcmlnZ2VyIiwidHJpZ2dlciIsImlzRnVuY3Rpb24iLCJpc0FycmF5IiwibWFrZVRyaWdnZXJzIiwiX2Jhc2UiLCJfdHJpZ2dlcnMiLCJjb25jYXQiLCJjb25zdHJ1Y3RvciIsInJvdXRlciIsIm9wdGlvbnMiLCJwYXJlbnQiLCJwcmVmaXgiLCJ0ZXN0IiwiRXJyb3IiLCJfcm91dGVyIiwibmFtZSIsIl90cmlnZ2Vyc0VudGVyIiwidHJpZ2dlcnNFbnRlciIsIl90cmlnZ2Vyc0V4aXQiLCJ0cmlnZ2Vyc0V4aXQiLCJfc3Vic2NyaXB0aW9ucyIsInN1YnNjcmlwdGlvbnMiLCJGdW5jdGlvbiIsInByb3RvdHlwZSIsInJvdXRlIiwiX3BhdGhEZWYiLCJfZ3JvdXAiLCJncm91cCIsInBhdGhEZWYiLCJleHRlbmQiLCJvbWl0IiwiZXhwb3J0RGVmYXVsdCIsInBhdGgiLCJhY3Rpb24iLCJfc3Vic01hcCIsInJlZ2lzdGVyIiwic3ViIiwic3Vic2NyaXB0aW9uIiwibWlkZGxld2FyZSIsInBhZ2UiLCJxcyIsInJlcXVpcmUiLCJwYXRoUmVnRXhwIiwiX3JvdXRlcyIsIl9yb3V0ZXNNYXAiLCJfY3VycmVudCIsIl9zcGVjaWFsQ2hhcnMiLCJfZW5jb2RlUGFyYW0iLCJwYXJhbSIsInBhcmFtQXJyIiwic3BsaXQiLCJfcGFyYW0iLCJpIiwibGVuZ3RoIiwiaW5jbHVkZXMiLCJlbmNvZGVVUklDb21wb25lbnQiLCJlIiwiX29uUm91dGVDYWxsYmFja3MiLCJ0cmlnZ2VycyIsImVudGVyIiwiZXhpdCIsIm1hdGNoUGF0aCIsInBhcmFtcyIsImZpbmQiLCJyIiwicGFnZVJvdXRlIiwibWF0Y2giLCJjbG9uZSIsInNldEN1cnJlbnQiLCJjdXJyZW50IiwicHVzaCIsIl90cmlnZ2VyUm91dGVSZWdpc3RlciIsImZpZWxkcyIsInF1ZXJ5UGFyYW1zIiwicmVwbGFjZSIsIl9rZXkiLCJmaXJzdFJlZ2V4cENoYXIiLCJpbmRleE9mIiwia2V5Iiwic3Vic3RyaW5nIiwidW5kZWZpbmVkIiwic3RyUXVlcnlQYXJhbXMiLCJzdHJpbmdpZnkiLCJvblJvdXRlUmVnaXN0ZXIiLCJjYiIsImN1cnJlbnRSb3V0ZSIsInJvdXRlUHVibGljQXBpIiwicGljayIsImZvckVhY2giLCJnbyIsImdldFN0YXRlIiwiZ2V0QWxsU3RhdGVzIiwiZ2V0Um91dGVOYW1lIiwiZ2V0UXVlcnlQYXJhbSIsInF1ZXJ5Iiwic2V0U3RhdGUiLCJzZXRQYXJhbXMiLCJyZW1vdmVTdGF0ZSIsImNsZWFyU3RhdGVzIiwicmVhZHkiLCJpbml0aWFsaXplIiwid2FpdCIsInVybCIsImFic29sdXRlVXJsIiwiYXBwbHkiLCJhcmd1bWVudHMiLCJSZWdFeHAiLCJfYmFzZVBhdGgiLCJGYXN0UmVuZGVyIiwic2V0dXBGYXN0UmVuZGVyIiwicm91dGVQYXJhbXMiLCJtZXRlb3JTdWJzY3JpYmUiLCJzdWJzY3JpYmUiLCJBcnJheSIsImZyb20iLCJjYWxsIiwiT2JqZWN0Iiwia2V5cyIsInN0YXJ0dXAiLCJpc0VtcHR5Iiwib2JqIiwiaXNTdHJpbmciLCJpc0FyZ3VtZW50cyIsImlzT2JqZWN0IiwidHlwZSIsImNvcHkiLCJwaWNrZWQiLCJvYmpzIiwiYXNzaWduIiwic2xpY2UiLCJ0b1N0cmluZyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsTUFBTSxDQUFDQyxNQUFQLENBQWM7QUFBQ0MsWUFBVSxFQUFDLE1BQUlBLFVBQWhCO0FBQTJCQyxRQUFNLEVBQUMsTUFBSUEsTUFBdEM7QUFBNkNDLE9BQUssRUFBQyxNQUFJQSxLQUF2RDtBQUE2REMsT0FBSyxFQUFDLE1BQUlBLEtBQXZFO0FBQTZFQyxVQUFRLEVBQUMsTUFBSUEsUUFBMUY7QUFBbUdDLGVBQWEsRUFBQyxNQUFJQTtBQUFySCxDQUFkO0FBQW1KLElBQUlDLE1BQUo7QUFBV1IsTUFBTSxDQUFDUyxJQUFQLENBQVksZUFBWixFQUE0QjtBQUFDRCxRQUFNLENBQUNFLENBQUQsRUFBRztBQUFDRixVQUFNLEdBQUNFLENBQVA7QUFBUzs7QUFBcEIsQ0FBNUIsRUFBa0QsQ0FBbEQ7QUFBcUQsSUFBSVAsTUFBSjtBQUFXSCxNQUFNLENBQUNTLElBQVAsQ0FBWSxhQUFaLEVBQTBCO0FBQUNFLFNBQU8sQ0FBQ0QsQ0FBRCxFQUFHO0FBQUNQLFVBQU0sR0FBQ08sQ0FBUDtBQUFTOztBQUFyQixDQUExQixFQUFpRCxDQUFqRDtBQUFvRCxJQUFJTixLQUFKO0FBQVVKLE1BQU0sQ0FBQ1MsSUFBUCxDQUFZLFlBQVosRUFBeUI7QUFBQ0UsU0FBTyxDQUFDRCxDQUFELEVBQUc7QUFBQ04sU0FBSyxHQUFDTSxDQUFOO0FBQVE7O0FBQXBCLENBQXpCLEVBQStDLENBQS9DO0FBQWtELElBQUlMLEtBQUo7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UDtBQUNELEdBbkRjOztBQW9EZjVILFNBQU8sQ0FBQ3NILEdBQUQsRUFBTTtBQUNYLFdBQU9QLEtBQUssQ0FBQy9HLE9BQU4sQ0FBY3NILEdBQWQsQ0FBUDtBQUNELEdBdERjOztBQXVEZjNGLFFBQU0sQ0FBQyxHQUFHa0csSUFBSixFQUFVO0FBQUU7QUFDaEIsV0FBT1gsTUFBTSxDQUFDWSxNQUFQLENBQWMsRUFBZCxFQUFrQixHQUFHRCxJQUFyQixDQUFQO0FBQ0QsR0F6RGM7O0FBMERmNUQsT0FBSyxDQUFDcUQsR0FBRCxFQUFNO0FBQ1QsUUFBSSxDQUFDLEtBQUtHLFFBQUwsQ0FBY0gsR0FBZCxDQUFMLEVBQXlCLE9BQU9BLEdBQVA7QUFDekIsV0FBTyxLQUFLdEgsT0FBTCxDQUFhc0gsR0FBYixJQUFvQkEsR0FBRyxDQUFDUyxLQUFKLEVBQXBCLEdBQWtDLEtBQUtwRyxNQUFMLENBQVkyRixHQUFaLENBQXpDO0FBQ0Q7O0FBN0RjLENBQWpCO0FBZ0VBLENBQUMsV0FBRCxFQUFjLFVBQWQsRUFBMEIsUUFBMUIsRUFBb0MsUUFBcEMsRUFBOENoQyxPQUE5QyxDQUF1RHpFLElBQUQsSUFBVTtBQUM5RGpCLFVBQVEsQ0FBQyxPQUFPaUIsSUFBUixDQUFSLEdBQXdCLFVBQVV5RyxHQUFWLEVBQWU7QUFDckMsV0FBT0osTUFBTSxDQUFDN0YsU0FBUCxDQUFpQjJHLFFBQWpCLENBQTBCZixJQUExQixDQUErQkssR0FBL0IsTUFBd0MsYUFBYXpHLElBQWIsR0FBb0IsR0FBbkU7QUFDRCxHQUZEO0FBR0QsQ0FKRCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9vc3RyaW9fZmxvdy1yb3V0ZXItZXh0cmEuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCBSb3V0ZXIgICAgIGZyb20gJy4vcm91dGVyLmpzJztcbmltcG9ydCBSb3V0ZSAgICAgIGZyb20gJy4vcm91dGUuanMnO1xuaW1wb3J0IEdyb3VwICAgICAgZnJvbSAnLi9ncm91cC5qcyc7XG5pbXBvcnQgJy4vcGx1Z2lucy9mYXN0LXJlbmRlci5qcyc7XG5cbmlmIChQYWNrYWdlWydtZXRlb3JoYWNrczppbmplY3QtZGF0YSddKSB7XG4gIE1ldGVvci5fZGVidWcoJ2BtZXRlb3JoYWNrczppbmplY3QtZGF0YWAgaXMgZGVwcmVjYXRlZCwgcGxlYXNlIHJlbW92ZSBpdCBhbmQgaW5zdGFsbCBpdHMgc3VjY2Vzc29yIC0gYHN0YXJpbmdhdGxpZ2h0czppbmplY3QtZGF0YWAnKTtcbiAgTWV0ZW9yLl9kZWJ1ZygnbWV0ZW9yIHJlbW92ZSBtZXRlb3JoYWNrczppbmplY3QtZGF0YScpO1xuICBNZXRlb3IuX2RlYnVnKCdtZXRlb3IgYWRkIHN0YXJpbmdhdGxpZ2h0czppbmplY3QtZGF0YScpO1xufVxuXG5pZiAoUGFja2FnZVsnbWV0ZW9yaGFja3M6ZmFzdC1yZW5kZXInXSkge1xuICBNZXRlb3IuX2RlYnVnKCdgbWV0ZW9yaGFja3M6ZmFzdC1yZW5kZXJgIGlzIGRlcHJlY2F0ZWQsIHBsZWFzZSByZW1vdmUgaXQgYW5kIGluc3RhbGwgaXRzIHN1Y2Nlc3NvciAtIGBzdGFyaW5nYXRsaWdodHM6ZmFzdC1yZW5kZXJgJyk7XG4gIE1ldGVvci5fZGVidWcoJ21ldGVvciByZW1vdmUgbWV0ZW9yaGFja3M6ZmFzdC1yZW5kZXInKTtcbiAgTWV0ZW9yLl9kZWJ1ZygnbWV0ZW9yIGFkZCBzdGFyaW5nYXRsaWdodHM6ZmFzdC1yZW5kZXInKTtcbn1cblxuY29uc3QgVHJpZ2dlcnMgPSB7fTtcbmNvbnN0IEJsYXplUmVuZGVyZXIgPSB7fTtcblxuY29uc3QgRmxvd1JvdXRlciA9IG5ldyBSb3V0ZXIoKTtcbkZsb3dSb3V0ZXIuUm91dGVyID0gUm91dGVyO1xuRmxvd1JvdXRlci5Sb3V0ZSA9IFJvdXRlO1xuXG5leHBvcnQgeyBGbG93Um91dGVyLCBSb3V0ZXIsIFJvdXRlLCBHcm91cCwgVHJpZ2dlcnMsIEJsYXplUmVuZGVyZXIgfTtcbiIsImltcG9ydCB7IF9oZWxwZXJzIH0gZnJvbSAnLi8uLi9saWIvX2hlbHBlcnMuanMnO1xuXG5jb25zdCBtYWtlVHJpZ2dlciA9ICh0cmlnZ2VyKSA9PiB7XG4gIGlmIChfaGVscGVycy5pc0Z1bmN0aW9uKHRyaWdnZXIpKSB7XG4gICAgcmV0dXJuIFt0cmlnZ2VyXTtcbiAgfSBlbHNlIGlmICghX2hlbHBlcnMuaXNBcnJheSh0cmlnZ2VyKSkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIHJldHVybiB0cmlnZ2VyO1xufTtcblxuY29uc3QgbWFrZVRyaWdnZXJzID0gKF9iYXNlLCBfdHJpZ2dlcnMpID0+IHtcbiAgaWYgKCghX2Jhc2UgJiYgIV90cmlnZ2VycykpIHtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgcmV0dXJuIG1ha2VUcmlnZ2VyKF9iYXNlKS5jb25jYXQobWFrZVRyaWdnZXIoX3RyaWdnZXJzKSk7XG59O1xuXG5jbGFzcyBHcm91cCB7XG4gIGNvbnN0cnVjdG9yKHJvdXRlciwgb3B0aW9ucyA9IHt9LCBwYXJlbnQpIHtcbiAgICBpZiAob3B0aW9ucy5wcmVmaXggJiYgIS9eXFwvLy50ZXN0KG9wdGlvbnMucHJlZml4KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdncm91cFxcJ3MgcHJlZml4IG11c3Qgc3RhcnQgd2l0aCBcIi9cIicpO1xuICAgIH1cblxuICAgIHRoaXMuX3JvdXRlciA9IHJvdXRlcjtcbiAgICB0aGlzLnByZWZpeCA9IG9wdGlvbnMucHJlZml4IHx8ICcnO1xuICAgIHRoaXMubmFtZSA9IG9wdGlvbnMubmFtZTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgdGhpcy5fdHJpZ2dlcnNFbnRlciA9IG1ha2VUcmlnZ2VycyhvcHRpb25zLnRyaWdnZXJzRW50ZXIsIHRoaXMuX3RyaWdnZXJzRW50ZXIpO1xuICAgIHRoaXMuX3RyaWdnZXJzRXhpdCAgPSBtYWtlVHJpZ2dlcnModGhpcy5fdHJpZ2dlcnNFeGl0LCBvcHRpb25zLnRyaWdnZXJzRXhpdCk7XG5cbiAgICB0aGlzLl9zdWJzY3JpcHRpb25zID0gb3B0aW9ucy5zdWJzY3JpcHRpb25zIHx8IEZ1bmN0aW9uLnByb3RvdHlwZTtcblxuICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xuICAgIGlmICh0aGlzLnBhcmVudCkge1xuICAgICAgdGhpcy5wcmVmaXggPSBwYXJlbnQucHJlZml4ICsgdGhpcy5wcmVmaXg7XG4gICAgICB0aGlzLl90cmlnZ2Vyc0VudGVyID0gbWFrZVRyaWdnZXJzKHBhcmVudC5fdHJpZ2dlcnNFbnRlciwgdGhpcy5fdHJpZ2dlcnNFbnRlcik7XG4gICAgICB0aGlzLl90cmlnZ2Vyc0V4aXQgID0gbWFrZVRyaWdnZXJzKHRoaXMuX3RyaWdnZXJzRXhpdCwgcGFyZW50Ll90cmlnZ2Vyc0V4aXQpO1xuICAgIH1cbiAgfVxuXG4gIHJvdXRlKF9wYXRoRGVmLCBvcHRpb25zID0ge30sIF9ncm91cCkge1xuICAgIGlmICghL15cXC8vLnRlc3QoX3BhdGhEZWYpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JvdXRlXFwncyBwYXRoIG11c3Qgc3RhcnQgd2l0aCBcIi9cIicpO1xuICAgIH1cblxuICAgIGNvbnN0IGdyb3VwICAgPSBfZ3JvdXAgfHwgdGhpcztcbiAgICBjb25zdCBwYXRoRGVmID0gdGhpcy5wcmVmaXggKyBfcGF0aERlZjtcblxuICAgIG9wdGlvbnMudHJpZ2dlcnNFbnRlciA9IG1ha2VUcmlnZ2Vycyh0aGlzLl90cmlnZ2Vyc0VudGVyLCBvcHRpb25zLnRyaWdnZXJzRW50ZXIpO1xuICAgIG9wdGlvbnMudHJpZ2dlcnNFeGl0ICA9IG1ha2VUcmlnZ2VycyhvcHRpb25zLnRyaWdnZXJzRXhpdCwgdGhpcy5fdHJpZ2dlcnNFeGl0KTtcblxuICAgIHJldHVybiB0aGlzLl9yb3V0ZXIucm91dGUocGF0aERlZiwgX2hlbHBlcnMuZXh0ZW5kKF9oZWxwZXJzLm9taXQodGhpcy5vcHRpb25zLCBbJ3RyaWdnZXJzRW50ZXInLCAndHJpZ2dlcnNFeGl0JywgJ3N1YnNjcmlwdGlvbnMnLCAncHJlZml4JywgJ3dhaXRPbicsICduYW1lJywgJ3RpdGxlJywgJ3RpdGxlUHJlZml4JywgJ2xpbmsnLCAnc2NyaXB0JywgJ21ldGEnXSksIG9wdGlvbnMpLCBncm91cCk7XG4gIH1cblxuICBncm91cChvcHRpb25zKSB7XG4gICAgcmV0dXJuIG5ldyBHcm91cCh0aGlzLl9yb3V0ZXIsIG9wdGlvbnMsIHRoaXMpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEdyb3VwO1xuIiwiY2xhc3MgUm91dGUge1xuICBjb25zdHJ1Y3Rvcihyb3V0ZXIsIHBhdGhEZWYsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5uYW1lID0gb3B0aW9ucy5uYW1lO1xuICAgIHRoaXMucGF0aERlZiA9IHBhdGhEZWY7XG5cbiAgICAvLyBSb3V0ZS5wYXRoIGlzIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiAzLjBcbiAgICB0aGlzLnBhdGggPSBwYXRoRGVmO1xuXG4gICAgdGhpcy5hY3Rpb24gPSBvcHRpb25zLmFjdGlvbiB8fCBGdW5jdGlvbi5wcm90b3R5cGU7XG4gICAgdGhpcy5zdWJzY3JpcHRpb25zID0gb3B0aW9ucy5zdWJzY3JpcHRpb25zIHx8IEZ1bmN0aW9uLnByb3RvdHlwZTtcbiAgICB0aGlzLl9zdWJzTWFwID0ge307XG4gIH1cblxuXG4gIHJlZ2lzdGVyKG5hbWUsIHN1Yikge1xuICAgIHRoaXMuX3N1YnNNYXBbbmFtZV0gPSBzdWI7XG4gIH1cblxuXG4gIHN1YnNjcmlwdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N1YnNNYXBbbmFtZV07XG4gIH1cblxuXG4gIG1pZGRsZXdhcmUoKSB7XG4gICAgLy8gP1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFJvdXRlO1xuIiwiaW1wb3J0IHBhZ2UgICAgICAgICBmcm9tICdwYWdlJztcbmltcG9ydCBSb3V0ZSAgICAgICAgZnJvbSAnLi9yb3V0ZS5qcyc7XG5pbXBvcnQgR3JvdXAgICAgICAgIGZyb20gJy4vZ3JvdXAuanMnO1xuaW1wb3J0IHsgTWV0ZW9yIH0gICBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IF9oZWxwZXJzIH0gZnJvbSAnLi4vbGliL19oZWxwZXJzLmpzJztcblxuY29uc3QgcXMgPSByZXF1aXJlKCdxcycpO1xuXG5jbGFzcyBSb3V0ZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnBhdGhSZWdFeHAgPSAvKDpbXFx3XFwoXFwpXFxcXFxcK1xcKlxcLlxcP1xcW1xcXVxcLV0rKSsvZztcbiAgICB0aGlzLl9yb3V0ZXMgPSBbXTtcbiAgICB0aGlzLl9yb3V0ZXNNYXAgPSB7fTtcbiAgICB0aGlzLl9jdXJyZW50ID0ge307XG4gICAgdGhpcy5fc3BlY2lhbENoYXJzID0gWycvJywgJyUnLCAnKyddO1xuICAgIHRoaXMuX2VuY29kZVBhcmFtID0gcGFyYW0gPT4ge1xuICAgICAgY29uc3QgcGFyYW1BcnIgPSBwYXJhbS5zcGxpdCgnJyk7XG4gICAgICBsZXQgX3BhcmFtID0gJyc7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcmFtQXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh0aGlzLl9zcGVjaWFsQ2hhcnMuaW5jbHVkZXMocGFyYW1BcnJbaV0pKSB7XG4gICAgICAgICAgX3BhcmFtICs9IGVuY29kZVVSSUNvbXBvbmVudChlbmNvZGVVUklDb21wb25lbnQocGFyYW1BcnJbaV0pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgX3BhcmFtICs9IGVuY29kZVVSSUNvbXBvbmVudChwYXJhbUFycltpXSk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgX3BhcmFtICs9IHBhcmFtQXJyW2ldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIF9wYXJhbTtcbiAgICB9O1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucyA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcblxuICAgIC8vIGhvbGRzIG9uUm91dGUgY2FsbGJhY2tzXG4gICAgdGhpcy5fb25Sb3V0ZUNhbGxiYWNrcyA9IFtdO1xuXG4gICAgdGhpcy50cmlnZ2VycyA9IHtcbiAgICAgIGVudGVyKCkge1xuICAgICAgICAvLyBjbGllbnQgb25seVxuICAgICAgfSxcbiAgICAgIGV4aXQoKSB7XG4gICAgICAgIC8vIGNsaWVudCBvbmx5XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIG1hdGNoUGF0aChwYXRoKSB7XG4gICAgY29uc3QgcGFyYW1zID0ge307XG4gICAgY29uc3Qgcm91dGUgPSB0aGlzLl9yb3V0ZXMuZmluZChyID0+IHtcbiAgICAgIGNvbnN0IHBhZ2VSb3V0ZSA9IG5ldyBwYWdlLlJvdXRlKHIucGF0aERlZik7XG4gICAgICByZXR1cm4gcGFnZVJvdXRlLm1hdGNoKHBhdGgsIHBhcmFtcyk7XG4gICAgfSk7XG4gICAgaWYgKCFyb3V0ZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHBhcmFtczogX2hlbHBlcnMuY2xvbmUocGFyYW1zKSxcbiAgICAgIHJvdXRlOiBfaGVscGVycy5jbG9uZShyb3V0ZSksXG4gICAgfTtcbiAgfVxuXG4gIHNldEN1cnJlbnQoY3VycmVudCkge1xuICAgIHRoaXMuX2N1cnJlbnQgPSBjdXJyZW50O1xuICB9XG5cbiAgcm91dGUocGF0aERlZiwgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKCEvXlxcLy4qLy50ZXN0KHBhdGhEZWYpICYmIHBhdGhEZWYgIT09ICcqJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdyb3V0ZVxcJ3MgcGF0aCBtdXN0IHN0YXJ0IHdpdGggXCIvXCInKTtcbiAgICB9XG5cbiAgICBjb25zdCByb3V0ZSA9IG5ldyBSb3V0ZSh0aGlzLCBwYXRoRGVmLCBvcHRpb25zKTtcbiAgICB0aGlzLl9yb3V0ZXMucHVzaChyb3V0ZSk7XG5cbiAgICBpZiAob3B0aW9ucy5uYW1lKSB7XG4gICAgICB0aGlzLl9yb3V0ZXNNYXBbb3B0aW9ucy5uYW1lXSA9IHJvdXRlO1xuICAgIH1cblxuICAgIHRoaXMuX3RyaWdnZXJSb3V0ZVJlZ2lzdGVyKHJvdXRlKTtcbiAgICByZXR1cm4gcm91dGU7XG4gIH1cblxuICBncm91cChvcHRpb25zKSB7XG4gICAgcmV0dXJuIG5ldyBHcm91cCh0aGlzLCBvcHRpb25zKTtcbiAgfVxuXG4gIHBhdGgoX3BhdGhEZWYsIGZpZWxkcyA9IHt9LCBxdWVyeVBhcmFtcykge1xuICAgIGxldCBwYXRoRGVmID0gX3BhdGhEZWY7XG4gICAgaWYgKHRoaXMuX3JvdXRlc01hcFtwYXRoRGVmXSkge1xuICAgICAgcGF0aERlZiA9IHRoaXMuX3JvdXRlc01hcFtwYXRoRGVmXS5wYXRoO1xuICAgIH1cblxuICAgIGxldCBwYXRoID0gcGF0aERlZi5yZXBsYWNlKHRoaXMucGF0aFJlZ0V4cCwgKF9rZXkpID0+IHtcbiAgICAgIGNvbnN0IGZpcnN0UmVnZXhwQ2hhciA9IF9rZXkuaW5kZXhPZignKCcpO1xuICAgICAgLy8gZ2V0IHRoZSBjb250ZW50IGJlaGluZCA6IGFuZCAoXFxcXGQrLylcbiAgICAgIGxldCBrZXkgPSBfa2V5LnN1YnN0cmluZygxLCBmaXJzdFJlZ2V4cENoYXIgPiAwID8gZmlyc3RSZWdleHBDaGFyIDogdW5kZWZpbmVkKTtcbiAgICAgIC8vIHJlbW92ZSArPypcbiAgICAgIGtleSA9IGtleS5yZXBsYWNlKC9bXFwrXFwqXFw/XSsvZywgJycpO1xuXG4gICAgICBpZiAoZmllbGRzW2tleV0pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VuY29kZVBhcmFtKGAke2ZpZWxkc1trZXldfWApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gJyc7XG4gICAgfSk7XG5cbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC9cXC8rL2csICcvJyk7IC8vIFJlcGxhY2UgbXVsdGlwbGUgc2xhc2hlcyB3aXRoIHNpbmdsZSBzbGFzaFxuXG4gICAgLy8gcmVtb3ZlIHRyYWlsaW5nIHNsYXNoXG4gICAgLy8gYnV0IGtlZXAgdGhlIHJvb3Qgc2xhc2ggaWYgaXQncyB0aGUgb25seSBvbmVcbiAgICBwYXRoID0gcGF0aC5tYXRjaCgvXlxcL3sxfSQvKSA/IHBhdGggOiBwYXRoLnJlcGxhY2UoL1xcLyQvLCAnJyk7XG5cbiAgICBjb25zdCBzdHJRdWVyeVBhcmFtcyA9IHFzLnN0cmluZ2lmeShxdWVyeVBhcmFtcyB8fCB7fSk7XG4gICAgaWYgKHN0clF1ZXJ5UGFyYW1zKSB7XG4gICAgICBwYXRoICs9IGA/JHtzdHJRdWVyeVBhcmFtc31gO1xuICAgIH1cblxuICAgIHJldHVybiBwYXRoO1xuICB9XG5cbiAgb25Sb3V0ZVJlZ2lzdGVyKGNiKSB7XG4gICAgdGhpcy5fb25Sb3V0ZUNhbGxiYWNrcy5wdXNoKGNiKTtcbiAgfVxuXG4gIF90cmlnZ2VyUm91dGVSZWdpc3RlcihjdXJyZW50Um91dGUpIHtcbiAgICAvLyBXZSBzaG91bGQgb25seSBuZWVkIHRvIHNlbmQgYSBzYWZlIHNldCBvZiBmaWVsZHMgb24gdGhlIHJvdXRlXG4gICAgLy8gb2JqZWN0LlxuICAgIC8vIFRoaXMgaXMgbm90IHRvIGhpZGUgd2hhdCdzIGluc2lkZSB0aGUgcm91dGUgb2JqZWN0LCBidXQgdG8gc2hvd1xuICAgIC8vIHRoZXNlIGFyZSB0aGUgcHVibGljIEFQSXNcbiAgICBjb25zdCByb3V0ZVB1YmxpY0FwaSA9IF9oZWxwZXJzLnBpY2soY3VycmVudFJvdXRlLCBbXG4gICAgICAnbmFtZScsXG4gICAgICAncGF0aERlZicsXG4gICAgICAncGF0aCcsXG4gICAgXSk7XG4gICAgcm91dGVQdWJsaWNBcGkub3B0aW9ucyA9IF9oZWxwZXJzLm9taXQoY3VycmVudFJvdXRlLm9wdGlvbnMsIFtcbiAgICAgICd0cmlnZ2Vyc0VudGVyJyxcbiAgICAgICd0cmlnZ2Vyc0V4aXQnLFxuICAgICAgJ2FjdGlvbicsXG4gICAgICAnc3Vic2NyaXB0aW9ucycsXG4gICAgICAnbmFtZScsXG4gICAgXSk7XG5cbiAgICB0aGlzLl9vblJvdXRlQ2FsbGJhY2tzLmZvckVhY2goY2IgPT4ge1xuICAgICAgY2Iocm91dGVQdWJsaWNBcGkpO1xuICAgIH0pO1xuICB9XG5cbiAgZ28oKSB7XG4gICAgLy8gY2xpZW50IG9ubHlcbiAgfVxuXG4gIGN1cnJlbnQoKSB7XG4gICAgLy8gY2xpZW50IG9ubHlcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudDtcbiAgfVxuXG4gIG1pZGRsZXdhcmUoKSB7XG4gICAgLy8gY2xpZW50IG9ubHlcbiAgfVxuXG4gIGdldFN0YXRlKCkge1xuICAgIC8vIGNsaWVudCBvbmx5XG4gIH1cblxuICBnZXRBbGxTdGF0ZXMoKSB7XG4gICAgLy8gY2xpZW50IG9ubHlcbiAgfVxuXG4gIGdldFJvdXRlTmFtZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudC5yb3V0ZSA/IHRoaXMuX2N1cnJlbnQucm91dGUubmFtZSA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGdldFF1ZXJ5UGFyYW0oa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuX2N1cnJlbnQucXVlcnkgPyB0aGlzLl9jdXJyZW50LnF1ZXJ5UGFyYW1zW2tleV0gOiB1bmRlZmluZWQ7XG4gIH1cblxuICBzZXRTdGF0ZSgpIHtcbiAgICAvLyBjbGllbnQgb25seVxuICB9XG5cbiAgc2V0UGFyYW1zKCkge31cblxuICByZW1vdmVTdGF0ZSgpIHtcbiAgICAvLyBjbGllbnQgb25seVxuICB9XG5cbiAgY2xlYXJTdGF0ZXMoKSB7XG4gICAgLy8gY2xpZW50IG9ubHlcbiAgfVxuXG4gIHJlYWR5KCkge1xuICAgIC8vIGNsaWVudCBvbmx5XG4gIH1cblxuICBpbml0aWFsaXplKCkge1xuICAgIC8vIGNsaWVudCBvbmx5XG4gIH1cblxuICB3YWl0KCkge1xuICAgIC8vIGNsaWVudCBvbmx5XG4gIH1cblxuICB1cmwoKSB7XG4gICAgLy8gV2UgbmVlZCB0byByZW1vdmUgdGhlIGxlYWRpbmcgYmFzZSBwYXRoLCBvciBcIi9cIiwgYXMgaXQgd2lsbCBiZSBpbnNlcnRlZFxuICAgIC8vIGF1dG9tYXRpY2FsbHkgYnkgYE1ldGVvci5hYnNvbHV0ZVVybGAgYXMgZG9jdW1lbnRlZCBpbjpcbiAgICAvLyBodHRwOi8vZG9jcy5tZXRlb3IuY29tLyMvZnVsbC9tZXRlb3JfYWJzb2x1dGV1cmxcbiAgICByZXR1cm4gTWV0ZW9yLmFic29sdXRlVXJsKHRoaXMucGF0aC5hcHBseSh0aGlzLCBhcmd1bWVudHMpLnJlcGxhY2UobmV3IFJlZ0V4cCgnXicgKyAoJy8nICsgKHRoaXMuX2Jhc2VQYXRoIHx8ICcnKSArICcvJykucmVwbGFjZSgvXFwvXFwvKy9nLCAnLycpKSwgJycpKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBSb3V0ZXI7XG4iLCJpbXBvcnQgeyBNZXRlb3IgfSAgICAgZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBfaGVscGVycyB9ICAgZnJvbSAnLi8uLi8uLi9saWIvX2hlbHBlcnMuanMnO1xuaW1wb3J0IHsgRmxvd1JvdXRlciB9IGZyb20gJy4uL19pbml0LmpzJztcblxuaWYoIVBhY2thZ2VbJ3N0YXJpbmdhdGxpZ2h0czpmYXN0LXJlbmRlciddKSB7XG4gIHJldHVybjtcbn1cblxuY29uc3QgRmFzdFJlbmRlciA9IFBhY2thZ2VbJ3N0YXJpbmdhdGxpZ2h0czpmYXN0LXJlbmRlciddLkZhc3RSZW5kZXI7XG5cbmNvbnN0IHNldHVwRmFzdFJlbmRlciA9ICgpID0+IHtcbiAgRmxvd1JvdXRlci5fcm91dGVzLmZvckVhY2goKHJvdXRlKSA9PiB7XG4gICAgaWYgKHJvdXRlLnBhdGhEZWYgPT09ICcqJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIEZhc3RSZW5kZXIucm91dGUocm91dGUucGF0aERlZiwgZnVuY3Rpb24gKHJvdXRlUGFyYW1zLCBwYXRoKSB7XG4gICAgICAvLyBhbnlvbmUgdXNpbmcgTWV0ZW9yLnN1YnNjcmliZSBmb3Igc29tZXRoaW5nIGVsc2U/XG4gICAgICBjb25zdCBtZXRlb3JTdWJzY3JpYmUgPSBNZXRlb3Iuc3Vic2NyaWJlO1xuICAgICAgTWV0ZW9yLnN1YnNjcmliZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIEFycmF5LmZyb20oYXJndW1lbnRzKTtcbiAgICAgIH07XG5cbiAgICAgIHJvdXRlLl9zdWJzTWFwID0ge307XG4gICAgICBGbG93Um91dGVyLnN1YnNjcmlwdGlvbnMuY2FsbChyb3V0ZSwgcGF0aCk7XG4gICAgICBpZiAocm91dGUuc3Vic2NyaXB0aW9ucykge1xuICAgICAgICByb3V0ZS5zdWJzY3JpcHRpb25zKF9oZWxwZXJzLm9taXQocm91dGVQYXJhbXMsIFsncXVlcnknXSksIHJvdXRlUGFyYW1zLnF1ZXJ5KTtcbiAgICAgIH1cblxuICAgICAgT2JqZWN0LmtleXMocm91dGUuX3N1YnNNYXApLmZvckVhY2goKGtleSkgPT4ge1xuICAgICAgICB0aGlzLnN1YnNjcmliZS5hcHBseSh0aGlzLCByb3V0ZS5fc3Vic01hcFtrZXldKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyByZXN0b3JlIE1ldGVvci5zdWJzY3JpYmUsIC4uLiBvbiBzZXJ2ZXIgc2lkZVxuICAgICAgTWV0ZW9yLnN1YnNjcmliZSA9IG1ldGVvclN1YnNjcmliZTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG4vLyBoYWNrIHRvIHJ1biBhZnRlciBldmVyeXRoaW5nIGVsc2Ugb24gc3RhcnR1cFxuTWV0ZW9yLnN0YXJ0dXAoKCkgPT4ge1xuICBNZXRlb3Iuc3RhcnR1cCgoKSA9PiB7XG4gICAgc2V0dXBGYXN0UmVuZGVyKCk7XG4gIH0pO1xufSk7XG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcblxuY29uc3QgX2hlbHBlcnMgPSB7XG4gIGlzRW1wdHkob2JqKSB7IC8vIDFcbiAgICBpZiAob2JqID09IG51bGwpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmlzQXJyYXkob2JqKSB8fCB0aGlzLmlzU3RyaW5nKG9iaikgfHwgdGhpcy5pc0FyZ3VtZW50cyhvYmopKSB7XG4gICAgICByZXR1cm4gb2JqLmxlbmd0aCA9PT0gMDtcbiAgICB9XG5cbiAgICByZXR1cm4gT2JqZWN0LmtleXMob2JqKS5sZW5ndGggPT09IDA7XG4gIH0sXG4gIGlzT2JqZWN0KG9iaikge1xuICAgIGNvbnN0IHR5cGUgPSB0eXBlb2Ygb2JqO1xuICAgIHJldHVybiB0eXBlID09PSAnZnVuY3Rpb24nIHx8IHR5cGUgPT09ICdvYmplY3QnICYmICEhb2JqO1xuICB9LFxuICBvbWl0KG9iaiwga2V5cykgeyAvLyAxMFxuICAgIGlmICghdGhpcy5pc09iamVjdChvYmopKSB7XG4gICAgICBNZXRlb3IuX2RlYnVnKCdbb3N0cmlvOmZsb3ctcm91dGVyLWV4dHJhXSBbX2hlbHBlcnMub21pdF0gRmlyc3QgYXJndW1lbnQgbXVzdCBiZSBhbiBPYmplY3QnKTtcbiAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmlzQXJyYXkoa2V5cykpIHtcbiAgICAgIE1ldGVvci5fZGVidWcoJ1tvc3RyaW86Zmxvdy1yb3V0ZXItZXh0cmFdIFtfaGVscGVycy5vbWl0XSBTZWNvbmQgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheScpO1xuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICBjb25zdCBjb3B5ID0gdGhpcy5jbG9uZShvYmopO1xuICAgIGtleXMuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICBkZWxldGUgY29weVtrZXldO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGNvcHk7XG4gIH0sXG4gIHBpY2sob2JqLCBrZXlzKSB7IC8vIDJcbiAgICBpZiAoIXRoaXMuaXNPYmplY3Qob2JqKSkge1xuICAgICAgTWV0ZW9yLl9kZWJ1ZygnW29zdHJpbzpmbG93LXJvdXRlci1leHRyYV0gW19oZWxwZXJzLm9taXRdIEZpcnN0IGFyZ3VtZW50IG11c3QgYmUgYW4gT2JqZWN0Jyk7XG4gICAgICByZXR1cm4gb2JqO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5pc0FycmF5KGtleXMpKSB7XG4gICAgICBNZXRlb3IuX2RlYnVnKCdbb3N0cmlvOmZsb3ctcm91dGVyLWV4dHJhXSBbX2hlbHBlcnMub21pdF0gU2Vjb25kIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXknKTtcbiAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgY29uc3QgcGlja2VkID0ge307XG4gICAga2V5cy5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgIHBpY2tlZFtrZXldID0gb2JqW2tleV07XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcGlja2VkO1xuICB9LFxuICBpc0FycmF5KG9iaikge1xuICAgIHJldHVybiBBcnJheS5pc0FycmF5KG9iaik7XG4gIH0sXG4gIGV4dGVuZCguLi5vYmpzKSB7IC8vIDRcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgLi4ub2Jqcyk7XG4gIH0sXG4gIGNsb25lKG9iaikge1xuICAgIGlmICghdGhpcy5pc09iamVjdChvYmopKSByZXR1cm4gb2JqO1xuICAgIHJldHVybiB0aGlzLmlzQXJyYXkob2JqKSA/IG9iai5zbGljZSgpIDogdGhpcy5leHRlbmQob2JqKTtcbiAgfVxufTtcblxuWydBcmd1bWVudHMnLCAnRnVuY3Rpb24nLCAnU3RyaW5nJywgJ1JlZ0V4cCddLmZvckVhY2goKG5hbWUpID0+IHtcbiAgX2hlbHBlcnNbJ2lzJyArIG5hbWVdID0gZnVuY3Rpb24gKG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgJyArIG5hbWUgKyAnXSc7XG4gIH07XG59KTtcblxuZXhwb3J0IHsgX2hlbHBlcnMgfTtcbiJdfQ==
