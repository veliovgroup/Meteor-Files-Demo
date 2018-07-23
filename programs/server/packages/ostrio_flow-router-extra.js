(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var meteorInstall = Package.modules.meteorInstall;
var ECMAScript = Package.ecmascript.ECMAScript;
var Promise = Package.promise.Promise;
var _ = Package.underscore._;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var ReactiveDict = Package['reactive-dict'].ReactiveDict;
var ReactiveVar = Package['reactive-var'].ReactiveVar;
var EJSON = Package.ejson.EJSON;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;

/* Package-scope variables */
var pathDef;

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:flow-router-extra":{"server":{"_init.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                             //
// packages/ostrio_flow-router-extra/server/_init.js                                           //
//                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////
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
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Router;
module.watch(require("./router.js"), {
  default(v) {
    Router = v;
  }

}, 1);
let Route;
module.watch(require("./route.js"), {
  default(v) {
    Route = v;
  }

}, 2);
let Group;
module.watch(require("./group.js"), {
  default(v) {
    Group = v;
  }

}, 3);
module.watch(require("./plugins/fast-render.js"));

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
/////////////////////////////////////////////////////////////////////////////////////////////////

},"group.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                             //
// packages/ostrio_flow-router-extra/server/group.js                                           //
//                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                               //
let _;

module.watch(require("meteor/underscore"), {
  _(v) {
    _ = v;
  }

}, 0);

const makeTrigger = trigger => {
  if (_.isFunction(trigger)) {
    return [trigger];
  } else if (!_.isArray(trigger)) {
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
    return this._router.route(pathDef, _.extend(_.omit(this.options, 'triggersEnter', 'triggersExit', 'subscriptions', 'prefix', 'waitOn', 'name', 'title', 'titlePrefix', 'link', 'script', 'meta'), options), group);
  }

  group(options) {
    return new Group(this._router, options, this);
  }

}

module.exportDefault(Group);
/////////////////////////////////////////////////////////////////////////////////////////////////

},"route.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                             //
// packages/ostrio_flow-router-extra/server/route.js                                           //
//                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////
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
/////////////////////////////////////////////////////////////////////////////////////////////////

},"router.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                             //
// packages/ostrio_flow-router-extra/server/router.js                                          //
//                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                               //
let _;

module.watch(require("meteor/underscore"), {
  _(v) {
    _ = v;
  }

}, 0);
let Route;
module.watch(require("./route.js"), {
  default(v) {
    Route = v;
  }

}, 1);
let Group;
module.watch(require("./group.js"), {
  default(v) {
    Group = v;
  }

}, 2);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 3);

const qs = require('qs');

class Router {
  constructor() {
    this.pathRegExp = /(:[\w\(\)\\\+\*\.\?\[\]\-]+)+/g;
    this._routes = [];
    this._routesMap = {};
    this.subscriptions = Function.prototype; // holds onRoute callbacks

    this._onRouteCallbacks = [];
    this.triggers = {
      enter() {// client only
      },

      exit() {// client only
      }

    };
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

  path(pathDef, fields = {}, queryParams) {
    if (this._routesMap[pathDef]) {
      pathDef = this._routesMap[pathDef].path;
    }

    let path = pathDef.replace(this.pathRegExp, key => {
      const firstRegexpChar = key.indexOf('('); // get the content behind : and (\\d+/)

      key = key.substring(1, firstRegexpChar > 0 ? firstRegexpChar : undefined); // remove +?*

      key = key.replace(/[\+\*\?]+/g, '');
      return fields[key] || '';
    });
    path = path.replace(/\/\/+/g, '/'); // Replace multiple slashes with single slash
    // remove trailing slash
    // but keep the root slash if it's the only one

    path = path.match(/^\/{1}$/) ? path : path.replace(/\/$/, '');
    const strQueryParams = qs.stringify(queryParams || {});

    if (strQueryParams) {
      path += '?' + strQueryParams;
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
    const routePublicApi = _.pick(currentRoute, 'name', 'pathDef', 'path');

    routePublicApi.options = _.omit(currentRoute.options, ['triggersEnter', 'triggersExit', 'action', 'subscriptions', 'name']);

    _.each(this._onRouteCallbacks, function (cb) {
      cb(routePublicApi);
    });
  }

  go() {// client only
  }

  current() {// client only
  }

  middleware() {// client only
  }

  getState() {// client only
  }

  getAllStates() {// client only
  }

  setState() {// client only
  }

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
/////////////////////////////////////////////////////////////////////////////////////////////////

},"plugins":{"fast-render.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                             //
// packages/ostrio_flow-router-extra/server/plugins/fast-render.js                             //
//                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                               //
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
let FlowRouter;
module.watch(require("../_init.js"), {
  FlowRouter(v) {
    FlowRouter = v;
  }

}, 2);

if (!Package['staringatlights:fast-render']) {
  return;
}

const FastRender = Package['staringatlights:fast-render'].FastRender;

const setupFastRender = () => {
  _.each(FlowRouter._routes, route => {
    if (route.pathDef === '*') {
      return;
    }

    FastRender.route(route.pathDef, function (routeParams, path) {
      // anyone using Meteor.subscribe for something else?
      const meteorSubscribe = Meteor.subscribe;

      Meteor.subscribe = function () {
        return _.toArray(arguments);
      };

      route._subsMap = {};
      FlowRouter.subscriptions.call(route, path);

      if (route.subscriptions) {
        route.subscriptions(_.omit(routeParams, 'query'), routeParams.query);
      }

      _.each(route._subsMap, args => {
        this.subscribe.apply(this, args);
      }); // restore Meteor.subscribe, ... on server side


      Meteor.subscribe = meteorSubscribe;
    });
  });
}; // hack to run after eveything else on startup


Meteor.startup(() => {
  Meteor.startup(() => {
    setupFastRender();
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////

}}},"node_modules":{"qs":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                             //
// node_modules/meteor/ostrio_flow-router-extra/node_modules/qs/package.json                   //
//                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                               //
exports.name = "qs";
exports.version = "6.5.1";
exports.main = "lib/index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                             //
// node_modules/meteor/ostrio_flow-router-extra/node_modules/qs/lib/index.js                   //
//                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                               //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZsb3ctcm91dGVyLWV4dHJhL3NlcnZlci9faW5pdC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZsb3ctcm91dGVyLWV4dHJhL3NlcnZlci9ncm91cC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZsb3ctcm91dGVyLWV4dHJhL3NlcnZlci9yb3V0ZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZsb3ctcm91dGVyLWV4dHJhL3NlcnZlci9yb3V0ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL29zdHJpbzpmbG93LXJvdXRlci1leHRyYS9zZXJ2ZXIvcGx1Z2lucy9mYXN0LXJlbmRlci5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJGbG93Um91dGVyIiwiUm91dGVyIiwiUm91dGUiLCJHcm91cCIsIlRyaWdnZXJzIiwiQmxhemVSZW5kZXJlciIsIk1ldGVvciIsIndhdGNoIiwicmVxdWlyZSIsInYiLCJkZWZhdWx0IiwiUGFja2FnZSIsIl9kZWJ1ZyIsIl8iLCJtYWtlVHJpZ2dlciIsInRyaWdnZXIiLCJpc0Z1bmN0aW9uIiwiaXNBcnJheSIsIm1ha2VUcmlnZ2VycyIsIl9iYXNlIiwiX3RyaWdnZXJzIiwiY29uY2F0IiwiY29uc3RydWN0b3IiLCJyb3V0ZXIiLCJvcHRpb25zIiwicGFyZW50IiwicHJlZml4IiwidGVzdCIsIkVycm9yIiwiX3JvdXRlciIsIm5hbWUiLCJfdHJpZ2dlcnNFbnRlciIsInRyaWdnZXJzRW50ZXIiLCJfdHJpZ2dlcnNFeGl0IiwidHJpZ2dlcnNFeGl0IiwiX3N1YnNjcmlwdGlvbnMiLCJzdWJzY3JpcHRpb25zIiwiRnVuY3Rpb24iLCJwcm90b3R5cGUiLCJyb3V0ZSIsIl9wYXRoRGVmIiwiX2dyb3VwIiwiZ3JvdXAiLCJwYXRoRGVmIiwiZXh0ZW5kIiwib21pdCIsImV4cG9ydERlZmF1bHQiLCJwYXRoIiwiYWN0aW9uIiwiX3N1YnNNYXAiLCJyZWdpc3RlciIsInN1YiIsInN1YnNjcmlwdGlvbiIsIm1pZGRsZXdhcmUiLCJxcyIsInBhdGhSZWdFeHAiLCJfcm91dGVzIiwiX3JvdXRlc01hcCIsIl9vblJvdXRlQ2FsbGJhY2tzIiwidHJpZ2dlcnMiLCJlbnRlciIsImV4aXQiLCJwdXNoIiwiX3RyaWdnZXJSb3V0ZVJlZ2lzdGVyIiwiZmllbGRzIiwicXVlcnlQYXJhbXMiLCJyZXBsYWNlIiwia2V5IiwiZmlyc3RSZWdleHBDaGFyIiwiaW5kZXhPZiIsInN1YnN0cmluZyIsInVuZGVmaW5lZCIsIm1hdGNoIiwic3RyUXVlcnlQYXJhbXMiLCJzdHJpbmdpZnkiLCJvblJvdXRlUmVnaXN0ZXIiLCJjYiIsImN1cnJlbnRSb3V0ZSIsInJvdXRlUHVibGljQXBpIiwicGljayIsImVhY2giLCJnbyIsImN1cnJlbnQiLCJnZXRTdGF0ZSIsImdldEFsbFN0YXRlcyIsInNldFN0YXRlIiwicmVtb3ZlU3RhdGUiLCJjbGVhclN0YXRlcyIsInJlYWR5IiwiaW5pdGlhbGl6ZSIsIndhaXQiLCJ1cmwiLCJhYnNvbHV0ZVVybCIsImFwcGx5IiwiYXJndW1lbnRzIiwiUmVnRXhwIiwiX2Jhc2VQYXRoIiwiRmFzdFJlbmRlciIsInNldHVwRmFzdFJlbmRlciIsInJvdXRlUGFyYW1zIiwibWV0ZW9yU3Vic2NyaWJlIiwic3Vic2NyaWJlIiwidG9BcnJheSIsImNhbGwiLCJxdWVyeSIsImFyZ3MiLCJzdGFydHVwIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE9BQU9DLE1BQVAsQ0FBYztBQUFDQyxjQUFXLE1BQUlBLFVBQWhCO0FBQTJCQyxVQUFPLE1BQUlBLE1BQXRDO0FBQTZDQyxTQUFNLE1BQUlBLEtBQXZEO0FBQTZEQyxTQUFNLE1BQUlBLEtBQXZFO0FBQTZFQyxZQUFTLE1BQUlBLFFBQTFGO0FBQW1HQyxpQkFBYyxNQUFJQTtBQUFySCxDQUFkO0FB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YS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IFJvdXRlciAgICAgZnJvbSAnLi9yb3V0ZXIuanMnO1xuaW1wb3J0IFJvdXRlICAgICAgZnJvbSAnLi9yb3V0ZS5qcyc7XG5pbXBvcnQgR3JvdXAgICAgICBmcm9tICcuL2dyb3VwLmpzJztcbmltcG9ydCAnLi9wbHVnaW5zL2Zhc3QtcmVuZGVyLmpzJ1xuXG5pZiAoUGFja2FnZVsnbWV0ZW9yaGFja3M6aW5qZWN0LWRhdGEnXSkge1xuICBNZXRlb3IuX2RlYnVnKCdgbWV0ZW9yaGFja3M6aW5qZWN0LWRhdGFgIGlzIGRlcHJlY2F0ZWQsIHBsZWFzZSByZW1vdmUgaXQgYW5kIGluc3RhbGwgaXRzIHN1Y2Nlc3NvciAtIGBzdGFyaW5nYXRsaWdodHM6aW5qZWN0LWRhdGFgJyk7XG4gIE1ldGVvci5fZGVidWcoJ21ldGVvciByZW1vdmUgbWV0ZW9yaGFja3M6aW5qZWN0LWRhdGEnKTtcbiAgTWV0ZW9yLl9kZWJ1ZygnbWV0ZW9yIGFkZCBzdGFyaW5nYXRsaWdodHM6aW5qZWN0LWRhdGEnKTtcbn1cblxuaWYgKFBhY2thZ2VbJ21ldGVvcmhhY2tzOmZhc3QtcmVuZGVyJ10pIHtcbiAgTWV0ZW9yLl9kZWJ1ZygnYG1ldGVvcmhhY2tzOmZhc3QtcmVuZGVyYCBpcyBkZXByZWNhdGVkLCBwbGVhc2UgcmVtb3ZlIGl0IGFuZCBpbnN0YWxsIGl0cyBzdWNjZXNzb3IgLSBgc3RhcmluZ2F0bGlnaHRzOmZhc3QtcmVuZGVyYCcpO1xuICBNZXRlb3IuX2RlYnVnKCdtZXRlb3IgcmVtb3ZlIG1ldGVvcmhhY2tzOmZhc3QtcmVuZGVyJyk7XG4gIE1ldGVvci5fZGVidWcoJ21ldGVvciBhZGQgc3RhcmluZ2F0bGlnaHRzOmZhc3QtcmVuZGVyJyk7XG59XG5cbmNvbnN0IFRyaWdnZXJzID0ge307XG5jb25zdCBCbGF6ZVJlbmRlcmVyID0ge307XG5cbmNvbnN0IEZsb3dSb3V0ZXIgPSBuZXcgUm91dGVyKCk7XG5GbG93Um91dGVyLlJvdXRlciA9IFJvdXRlcjtcbkZsb3dSb3V0ZXIuUm91dGUgPSBSb3V0ZTtcblxuZXhwb3J0IHsgRmxvd1JvdXRlciwgUm91dGVyLCBSb3V0ZSwgR3JvdXAsIFRyaWdnZXJzLCBCbGF6ZVJlbmRlcmVyIH07XG4iLCJpbXBvcnQgeyBfIH0gZnJvbSAnbWV0ZW9yL3VuZGVyc2NvcmUnO1xuXG5jb25zdCBtYWtlVHJpZ2dlciA9ICh0cmlnZ2VyKSA9PiB7XG4gIGlmIChfLmlzRnVuY3Rpb24odHJpZ2dlcikpIHtcbiAgICByZXR1cm4gW3RyaWdnZXJdO1xuICB9IGVsc2UgaWYgKCFfLmlzQXJyYXkodHJpZ2dlcikpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICByZXR1cm4gdHJpZ2dlcjtcbn07XG5cbmNvbnN0IG1ha2VUcmlnZ2VycyA9IChfYmFzZSwgX3RyaWdnZXJzKSA9PiB7XG4gIGlmICgoIV9iYXNlICYmICFfdHJpZ2dlcnMpKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIHJldHVybiBtYWtlVHJpZ2dlcihfYmFzZSkuY29uY2F0KG1ha2VUcmlnZ2VyKF90cmlnZ2VycykpO1xufTtcblxuY2xhc3MgR3JvdXAge1xuICBjb25zdHJ1Y3Rvcihyb3V0ZXIsIG9wdGlvbnMgPSB7fSwgcGFyZW50KSB7XG4gICAgaWYgKG9wdGlvbnMucHJlZml4ICYmICEvXlxcLy8udGVzdChvcHRpb25zLnByZWZpeCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignZ3JvdXBcXCdzIHByZWZpeCBtdXN0IHN0YXJ0IHdpdGggXCIvXCInKTtcbiAgICB9XG5cbiAgICB0aGlzLl9yb3V0ZXIgPSByb3V0ZXI7XG4gICAgdGhpcy5wcmVmaXggPSBvcHRpb25zLnByZWZpeCB8fCAnJztcbiAgICB0aGlzLm5hbWUgPSBvcHRpb25zLm5hbWU7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICAgIHRoaXMuX3RyaWdnZXJzRW50ZXIgPSBtYWtlVHJpZ2dlcnMob3B0aW9ucy50cmlnZ2Vyc0VudGVyLCB0aGlzLl90cmlnZ2Vyc0VudGVyKTtcbiAgICB0aGlzLl90cmlnZ2Vyc0V4aXQgID0gbWFrZVRyaWdnZXJzKHRoaXMuX3RyaWdnZXJzRXhpdCwgb3B0aW9ucy50cmlnZ2Vyc0V4aXQpO1xuXG4gICAgdGhpcy5fc3Vic2NyaXB0aW9ucyA9IG9wdGlvbnMuc3Vic2NyaXB0aW9ucyB8fCBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgICBpZiAodGhpcy5wYXJlbnQpIHtcbiAgICAgIHRoaXMucHJlZml4ID0gcGFyZW50LnByZWZpeCArIHRoaXMucHJlZml4O1xuICAgICAgdGhpcy5fdHJpZ2dlcnNFbnRlciA9IG1ha2VUcmlnZ2VycyhwYXJlbnQuX3RyaWdnZXJzRW50ZXIsIHRoaXMuX3RyaWdnZXJzRW50ZXIpO1xuICAgICAgdGhpcy5fdHJpZ2dlcnNFeGl0ICA9IG1ha2VUcmlnZ2Vycyh0aGlzLl90cmlnZ2Vyc0V4aXQsIHBhcmVudC5fdHJpZ2dlcnNFeGl0KTtcbiAgICB9XG4gIH1cblxuICByb3V0ZShfcGF0aERlZiwgb3B0aW9ucyA9IHt9LCBfZ3JvdXApIHtcbiAgICBpZiAoIS9eXFwvLy50ZXN0KF9wYXRoRGVmKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdyb3V0ZVxcJ3MgcGF0aCBtdXN0IHN0YXJ0IHdpdGggXCIvXCInKTtcbiAgICB9XG5cbiAgICBjb25zdCBncm91cCAgID0gX2dyb3VwIHx8IHRoaXM7XG4gICAgY29uc3QgcGF0aERlZiA9IHRoaXMucHJlZml4ICsgX3BhdGhEZWY7XG5cbiAgICBvcHRpb25zLnRyaWdnZXJzRW50ZXIgPSBtYWtlVHJpZ2dlcnModGhpcy5fdHJpZ2dlcnNFbnRlciwgb3B0aW9ucy50cmlnZ2Vyc0VudGVyKTtcbiAgICBvcHRpb25zLnRyaWdnZXJzRXhpdCAgPSBtYWtlVHJpZ2dlcnMob3B0aW9ucy50cmlnZ2Vyc0V4aXQsIHRoaXMuX3RyaWdnZXJzRXhpdCk7XG5cbiAgICByZXR1cm4gdGhpcy5fcm91dGVyLnJvdXRlKHBhdGhEZWYsIF8uZXh0ZW5kKF8ub21pdCh0aGlzLm9wdGlvbnMsICd0cmlnZ2Vyc0VudGVyJywgJ3RyaWdnZXJzRXhpdCcsICdzdWJzY3JpcHRpb25zJywgJ3ByZWZpeCcsICd3YWl0T24nLCAnbmFtZScsICd0aXRsZScsICd0aXRsZVByZWZpeCcsICdsaW5rJywgJ3NjcmlwdCcsICdtZXRhJyksIG9wdGlvbnMpLCBncm91cCk7XG4gIH1cblxuICBncm91cChvcHRpb25zKSB7XG4gICAgcmV0dXJuIG5ldyBHcm91cCh0aGlzLl9yb3V0ZXIsIG9wdGlvbnMsIHRoaXMpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEdyb3VwO1xuIiwiY2xhc3MgUm91dGUge1xuICBjb25zdHJ1Y3Rvcihyb3V0ZXIsIHBhdGhEZWYsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5uYW1lID0gb3B0aW9ucy5uYW1lO1xuICAgIHRoaXMucGF0aERlZiA9IHBhdGhEZWY7XG5cbiAgICAvLyBSb3V0ZS5wYXRoIGlzIGRlcHJlY2F0ZWQgYW5kIHdpbGwgYmUgcmVtb3ZlZCBpbiAzLjBcbiAgICB0aGlzLnBhdGggPSBwYXRoRGVmO1xuXG4gICAgdGhpcy5hY3Rpb24gPSBvcHRpb25zLmFjdGlvbiB8fCBGdW5jdGlvbi5wcm90b3R5cGU7XG4gICAgdGhpcy5zdWJzY3JpcHRpb25zID0gb3B0aW9ucy5zdWJzY3JpcHRpb25zIHx8IEZ1bmN0aW9uLnByb3RvdHlwZTtcbiAgICB0aGlzLl9zdWJzTWFwID0ge307XG4gIH1cblxuXG4gIHJlZ2lzdGVyKG5hbWUsIHN1Yikge1xuICAgIHRoaXMuX3N1YnNNYXBbbmFtZV0gPSBzdWI7XG4gIH1cblxuXG4gIHN1YnNjcmlwdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N1YnNNYXBbbmFtZV07XG4gIH1cblxuXG4gIG1pZGRsZXdhcmUoKSB7XG4gICAgLy8gP1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFJvdXRlO1xuIiwiaW1wb3J0IHsgXyB9ICAgICAgZnJvbSAnbWV0ZW9yL3VuZGVyc2NvcmUnO1xuaW1wb3J0IFJvdXRlICAgICAgZnJvbSAnLi9yb3V0ZS5qcyc7XG5pbXBvcnQgR3JvdXAgICAgICBmcm9tICcuL2dyb3VwLmpzJztcbmltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuXG5jb25zdCBxcyA9IHJlcXVpcmUoJ3FzJyk7XG5cbmNsYXNzIFJvdXRlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMucGF0aFJlZ0V4cCA9IC8oOltcXHdcXChcXClcXFxcXFwrXFwqXFwuXFw/XFxbXFxdXFwtXSspKy9nO1xuICAgIHRoaXMuX3JvdXRlcyA9IFtdO1xuICAgIHRoaXMuX3JvdXRlc01hcCA9IHt9O1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucyA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcblxuICAgIC8vIGhvbGRzIG9uUm91dGUgY2FsbGJhY2tzXG4gICAgdGhpcy5fb25Sb3V0ZUNhbGxiYWNrcyA9IFtdO1xuXG4gICAgdGhpcy50cmlnZ2VycyA9IHtcbiAgICAgIGVudGVyKCkge1xuICAgICAgICAvLyBjbGllbnQgb25seVxuICAgICAgfSxcbiAgICAgIGV4aXQoKSB7XG4gICAgICAgIC8vIGNsaWVudCBvbmx5XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHJvdXRlKHBhdGhEZWYsIG9wdGlvbnMgPSB7fSkge1xuICAgIGlmICghL15cXC8uKi8udGVzdChwYXRoRGVmKSAmJiBwYXRoRGVmICE9PSAnKicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncm91dGVcXCdzIHBhdGggbXVzdCBzdGFydCB3aXRoIFwiL1wiJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgcm91dGUgPSBuZXcgUm91dGUodGhpcywgcGF0aERlZiwgb3B0aW9ucyk7XG4gICAgdGhpcy5fcm91dGVzLnB1c2gocm91dGUpO1xuXG4gICAgaWYgKG9wdGlvbnMubmFtZSkge1xuICAgICAgdGhpcy5fcm91dGVzTWFwW29wdGlvbnMubmFtZV0gPSByb3V0ZTtcbiAgICB9XG5cbiAgICB0aGlzLl90cmlnZ2VyUm91dGVSZWdpc3Rlcihyb3V0ZSk7XG4gICAgcmV0dXJuIHJvdXRlO1xuICB9XG5cbiAgZ3JvdXAob3B0aW9ucykge1xuICAgIHJldHVybiBuZXcgR3JvdXAodGhpcywgb3B0aW9ucyk7XG4gIH1cblxuICBwYXRoKHBhdGhEZWYsIGZpZWxkcyA9IHt9LCBxdWVyeVBhcmFtcykge1xuICAgIGlmICh0aGlzLl9yb3V0ZXNNYXBbcGF0aERlZl0pIHtcbiAgICAgIHBhdGhEZWYgPSB0aGlzLl9yb3V0ZXNNYXBbcGF0aERlZl0ucGF0aDtcbiAgICB9XG5cbiAgICBsZXQgcGF0aCA9IHBhdGhEZWYucmVwbGFjZSh0aGlzLnBhdGhSZWdFeHAsIChrZXkpID0+IHtcbiAgICAgIGNvbnN0IGZpcnN0UmVnZXhwQ2hhciA9IGtleS5pbmRleE9mKCcoJyk7XG4gICAgICAvLyBnZXQgdGhlIGNvbnRlbnQgYmVoaW5kIDogYW5kIChcXFxcZCsvKVxuICAgICAga2V5ID0ga2V5LnN1YnN0cmluZygxLCAoZmlyc3RSZWdleHBDaGFyID4gMCkgPyBmaXJzdFJlZ2V4cENoYXIgOiB1bmRlZmluZWQpO1xuICAgICAgLy8gcmVtb3ZlICs/KlxuICAgICAga2V5ID0ga2V5LnJlcGxhY2UoL1tcXCtcXCpcXD9dKy9nLCAnJyk7XG5cbiAgICAgIHJldHVybiBmaWVsZHNba2V5XSB8fCAnJztcbiAgICB9KTtcblxuICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcL1xcLysvZywgJy8nKTsgLy8gUmVwbGFjZSBtdWx0aXBsZSBzbGFzaGVzIHdpdGggc2luZ2xlIHNsYXNoXG5cbiAgICAvLyByZW1vdmUgdHJhaWxpbmcgc2xhc2hcbiAgICAvLyBidXQga2VlcCB0aGUgcm9vdCBzbGFzaCBpZiBpdCdzIHRoZSBvbmx5IG9uZVxuICAgIHBhdGggPSBwYXRoLm1hdGNoKC9eXFwvezF9JC8pID8gcGF0aCA6IHBhdGgucmVwbGFjZSgvXFwvJC8sICcnKTtcblxuICAgIGNvbnN0IHN0clF1ZXJ5UGFyYW1zID0gcXMuc3RyaW5naWZ5KHF1ZXJ5UGFyYW1zIHx8IHt9KTtcbiAgICBpZihzdHJRdWVyeVBhcmFtcykge1xuICAgICAgcGF0aCArPSAnPycgKyBzdHJRdWVyeVBhcmFtcztcbiAgICB9XG5cbiAgICByZXR1cm4gcGF0aDtcbiAgfVxuXG4gIG9uUm91dGVSZWdpc3RlcihjYikge1xuICAgIHRoaXMuX29uUm91dGVDYWxsYmFja3MucHVzaChjYik7XG4gIH1cblxuICBfdHJpZ2dlclJvdXRlUmVnaXN0ZXIoY3VycmVudFJvdXRlKSB7XG4gICAgLy8gV2Ugc2hvdWxkIG9ubHkgbmVlZCB0byBzZW5kIGEgc2FmZSBzZXQgb2YgZmllbGRzIG9uIHRoZSByb3V0ZVxuICAgIC8vIG9iamVjdC5cbiAgICAvLyBUaGlzIGlzIG5vdCB0byBoaWRlIHdoYXQncyBpbnNpZGUgdGhlIHJvdXRlIG9iamVjdCwgYnV0IHRvIHNob3dcbiAgICAvLyB0aGVzZSBhcmUgdGhlIHB1YmxpYyBBUElzXG4gICAgY29uc3Qgcm91dGVQdWJsaWNBcGkgPSBfLnBpY2soY3VycmVudFJvdXRlLCAnbmFtZScsICdwYXRoRGVmJywgJ3BhdGgnKTtcbiAgICByb3V0ZVB1YmxpY0FwaS5vcHRpb25zID0gXy5vbWl0KGN1cnJlbnRSb3V0ZS5vcHRpb25zLCBbJ3RyaWdnZXJzRW50ZXInLCAndHJpZ2dlcnNFeGl0JywgJ2FjdGlvbicsICdzdWJzY3JpcHRpb25zJywgJ25hbWUnXSk7XG5cbiAgICBfLmVhY2godGhpcy5fb25Sb3V0ZUNhbGxiYWNrcywgZnVuY3Rpb24oY2IpIHtcbiAgICAgIGNiKHJvdXRlUHVibGljQXBpKTtcbiAgICB9KTtcbiAgfVxuXG5cbiAgZ28oKSB7XG4gICAgLy8gY2xpZW50IG9ubHlcbiAgfVxuXG5cbiAgY3VycmVudCgpIHtcbiAgICAvLyBjbGllbnQgb25seVxuICB9XG5cbiAgbWlkZGxld2FyZSgpIHtcbiAgICAvLyBjbGllbnQgb25seVxuICB9XG5cblxuICBnZXRTdGF0ZSgpIHtcbiAgICAvLyBjbGllbnQgb25seVxuICB9XG5cblxuICBnZXRBbGxTdGF0ZXMoKSB7XG4gICAgLy8gY2xpZW50IG9ubHlcbiAgfVxuXG5cbiAgc2V0U3RhdGUoKSB7XG4gICAgLy8gY2xpZW50IG9ubHlcbiAgfVxuXG5cbiAgcmVtb3ZlU3RhdGUoKSB7XG4gICAgLy8gY2xpZW50IG9ubHlcbiAgfVxuXG5cbiAgY2xlYXJTdGF0ZXMoKSB7XG4gICAgLy8gY2xpZW50IG9ubHlcbiAgfVxuXG5cbiAgcmVhZHkoKSB7XG4gICAgLy8gY2xpZW50IG9ubHlcbiAgfVxuXG5cbiAgaW5pdGlhbGl6ZSgpIHtcbiAgICAvLyBjbGllbnQgb25seVxuICB9XG5cbiAgd2FpdCgpIHtcbiAgICAvLyBjbGllbnQgb25seVxuICB9XG5cbiAgdXJsKCkge1xuICAgIC8vIFdlIG5lZWQgdG8gcmVtb3ZlIHRoZSBsZWFkaW5nIGJhc2UgcGF0aCwgb3IgXCIvXCIsIGFzIGl0IHdpbGwgYmUgaW5zZXJ0ZWRcbiAgICAvLyBhdXRvbWF0aWNhbGx5IGJ5IGBNZXRlb3IuYWJzb2x1dGVVcmxgIGFzIGRvY3VtZW50ZWQgaW46XG4gICAgLy8gaHR0cDovL2RvY3MubWV0ZW9yLmNvbS8jL2Z1bGwvbWV0ZW9yX2Fic29sdXRldXJsXG4gICAgcmV0dXJuIE1ldGVvci5hYnNvbHV0ZVVybCh0aGlzLnBhdGguYXBwbHkodGhpcywgYXJndW1lbnRzKS5yZXBsYWNlKG5ldyBSZWdFeHAoJ14nICsgKCcvJyArICh0aGlzLl9iYXNlUGF0aCB8fCAnJykgKyAnLycpLnJlcGxhY2UoL1xcL1xcLysvZywgJy8nKSksICcnKSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUm91dGVyO1xuIiwiaW1wb3J0IHsgXyB9ICAgICAgICAgIGZyb20gJ21ldGVvci91bmRlcnNjb3JlJztcbmltcG9ydCB7IE1ldGVvciB9ICAgICBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IEZsb3dSb3V0ZXIgfSBmcm9tICcuLi9faW5pdC5qcyc7XG5cbmlmKCFQYWNrYWdlWydzdGFyaW5nYXRsaWdodHM6ZmFzdC1yZW5kZXInXSkge1xuICByZXR1cm47XG59XG5cbmNvbnN0IEZhc3RSZW5kZXIgPSBQYWNrYWdlWydzdGFyaW5nYXRsaWdodHM6ZmFzdC1yZW5kZXInXS5GYXN0UmVuZGVyO1xuXG5jb25zdCBzZXR1cEZhc3RSZW5kZXIgPSAoKSA9PiB7XG4gIF8uZWFjaChGbG93Um91dGVyLl9yb3V0ZXMsIChyb3V0ZSkgPT4ge1xuICAgIGlmIChyb3V0ZS5wYXRoRGVmID09PSAnKicpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBGYXN0UmVuZGVyLnJvdXRlKHJvdXRlLnBhdGhEZWYsIGZ1bmN0aW9uIChyb3V0ZVBhcmFtcywgcGF0aCkge1xuICAgICAgLy8gYW55b25lIHVzaW5nIE1ldGVvci5zdWJzY3JpYmUgZm9yIHNvbWV0aGluZyBlbHNlP1xuICAgICAgY29uc3QgbWV0ZW9yU3Vic2NyaWJlID0gTWV0ZW9yLnN1YnNjcmliZTtcbiAgICAgIE1ldGVvci5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBfLnRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgIH07XG5cbiAgICAgIHJvdXRlLl9zdWJzTWFwID0ge307XG4gICAgICBGbG93Um91dGVyLnN1YnNjcmlwdGlvbnMuY2FsbChyb3V0ZSwgcGF0aCk7XG4gICAgICBpZiAocm91dGUuc3Vic2NyaXB0aW9ucykge1xuICAgICAgICByb3V0ZS5zdWJzY3JpcHRpb25zKF8ub21pdChyb3V0ZVBhcmFtcywgJ3F1ZXJ5JyksIHJvdXRlUGFyYW1zLnF1ZXJ5KTtcbiAgICAgIH1cblxuICAgICAgXy5lYWNoKHJvdXRlLl9zdWJzTWFwLCAoYXJncykgPT4ge1xuICAgICAgICB0aGlzLnN1YnNjcmliZS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyByZXN0b3JlIE1ldGVvci5zdWJzY3JpYmUsIC4uLiBvbiBzZXJ2ZXIgc2lkZVxuICAgICAgTWV0ZW9yLnN1YnNjcmliZSA9IG1ldGVvclN1YnNjcmliZTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG4vLyBoYWNrIHRvIHJ1biBhZnRlciBldmV5dGhpbmcgZWxzZSBvbiBzdGFydHVwXG5NZXRlb3Iuc3RhcnR1cCgoKSA9PiB7XG4gIE1ldGVvci5zdGFydHVwKCgpID0+IHtcbiAgICBzZXR1cEZhc3RSZW5kZXIoKTtcbiAgfSk7XG59KTtcbiJdfQ==
