(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var meteorInstall = Package.modules.meteorInstall;
var ECMAScript = Package.ecmascript.ECMAScript;
var Promise = Package.promise.Promise;
var Blaze = Package.blaze.Blaze;
var UI = Package.blaze.UI;
var Handlebars = Package.blaze.Handlebars;
var _ = Package.underscore._;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var ReactiveDict = Package['reactive-dict'].ReactiveDict;
var ReactiveVar = Package['reactive-var'].ReactiveVar;
var EJSON = Package.ejson.EJSON;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var HTML = Package.htmljs.HTML;

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

}},"node_modules":{"qs":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                             //
// ../../.3.4.3.1ekkdha.6u2g++os+web.browser+web.cordova/npm/node_modules/qs/package.json      //
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
'use strict';

var stringify = require('./stringify');
var parse = require('./parse');
var formats = require('./formats');

module.exports = {
    formats: formats,
    parse: parse,
    stringify: stringify
};

/////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("./node_modules/meteor/ostrio:flow-router-extra/server/_init.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['ostrio:flow-router-extra'] = exports;

})();

//# sourceURL=meteor://💻app/packages/ostrio_flow-router-extra.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZsb3ctcm91dGVyLWV4dHJhL3NlcnZlci9faW5pdC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZsb3ctcm91dGVyLWV4dHJhL3NlcnZlci9ncm91cC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZsb3ctcm91dGVyLWV4dHJhL3NlcnZlci9yb3V0ZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvb3N0cmlvOmZsb3ctcm91dGVyLWV4dHJhL3NlcnZlci9yb3V0ZXIuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiRmxvd1JvdXRlciIsIlJvdXRlciIsIlJvdXRlIiwiR3JvdXAiLCJUcmlnZ2VycyIsIkJsYXplUmVuZGVyZXIiLCJNZXRlb3IiLCJ3YXRjaCIsInJlcXVpcmUiLCJ2IiwiZGVmYXVsdCIsIlBhY2thZ2UiLCJfZGVidWciLCJfIiwibWFrZVRyaWdnZXIiLCJ0cmlnZ2VyIiwiaXNGdW5jdGlvbiIsImlzQXJyYXkiLCJtYWtlVHJpZ2dlcnMiLCJfYmFzZSIsIl90cmlnZ2VycyIsImNvbmNhdCIsImNvbnN0cnVjdG9yIiwicm91dGVyIiwib3B0aW9ucyIsInBhcmVudCIsInByZWZpeCIsInRlc3QiLCJFcnJvciIsIl9yb3V0ZXIiLCJuYW1lIiwiX3RyaWdnZXJzRW50ZXIiLCJ0cmlnZ2Vyc0VudGVyIiwiX3RyaWdnZXJzRXhpdCIsInRyaWdnZXJzRXhpdCIsIl9zdWJzY3JpcHRpb25zIiwic3Vic2NyaXB0aW9ucyIsIkZ1bmN0aW9uIiwicHJvdG90eXBlIiwicm91dGUiLCJfcGF0aERlZiIsIl9ncm91cCIsImdyb3VwIiwicGF0aERlZiIsImV4dGVuZCIsIm9taXQiLCJleHBvcnREZWZhdWx0IiwicGF0aCIsImFjdGlvbiIsIl9zdWJzTWFwIiwicmVnaXN0ZXIiLCJzdWIiLCJzdWJzY3JpcHRpb24iLCJtaWRkbGV3YXJlIiwicXMiLCJwYXRoUmVnRXhwIiwiX3JvdXRlcyIsIl9yb3V0ZXNNYXAiLCJfb25Sb3V0ZUNhbGxiYWNrcyIsInRyaWdnZXJzIiwiZW50ZXIiLCJleGl0IiwicHVzaCIsIl90cmlnZ2VyUm91dGVSZWdpc3RlciIsImZpZWxkcyIsInF1ZXJ5UGFyYW1zIiwicmVwbGFjZSIsImtleSIsImZpcnN0UmVnZXhwQ2hhciIsImluZGV4T2YiLCJzdWJzdHJpbmciLCJ1bmRlZmluZWQiLCJtYXRjaCIsInN0clF1ZXJ5UGFyYW1zIiwic3RyaW5naWZ5Iiwib25Sb3V0ZVJlZ2lzdGVyIiwiY2IiLCJjdXJyZW50Um91dGUiLCJyb3V0ZVB1YmxpY0FwaSIsInBpY2siLCJlYWNoIiwiZ28iLCJjdXJyZW50IiwiZ2V0U3RhdGUiLCJnZXRBbGxTdGF0ZXMiLCJzZXRTdGF0ZSIsInJlbW92ZVN0YXRlIiwiY2xlYXJTdGF0ZXMiLCJyZWFkeSIsImluaXRpYWxpemUiLCJ3YWl0IiwidXJsIiwiYWJzb2x1dGVVcmwiLCJhcHBseSIsImFyZ3VtZW50cyIsIlJlZ0V4cCIsIl9iYXNlUGF0aCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsT0FBT0MsTUFBUCxDQUFjO0FBQUNDLGNBQVcsTUFBSUEsVUFBaEI7QUFBMkJDLFVBQU8sTUFBSUEsTUFBdEM7QUFBNkNDLFNBQU0sTUFBSUEsS0FBdkQ7QUFBNkRDLFNBQU0sTUFBSUEsS0FBdkU7QUFBNkVDLFlBQVMsTUFBSUEsUUFBMUY7QUFBbUdDLGlCQUFjLE1BQUlBO0FBQXJILENBQWQ7QUFBbUosSUFBSUMsTUFBSjtBQUFXUixPQUFPUyxLQUFQLENBQWFDLFFBQVEsZUFBUixDQUFiLEVBQXNDO0FBQUNGLFNBQU9HLENBQVAsRUFBUztBQUFDSCxhQUFPRyxDQUFQO0FBQVM7O0FBQXBCLENBQXRDLEVBQTRELENBQTVEO0FBQStELElBQUlSLE1BQUo7QUFBV0gsT0FBT1MsS0FBUCxDQUFhQyxRQUFRLGFBQVIsQ0FBYixFQUFvQztBQUFDRSxV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QUFKLENBQVcsTUFBTSxDQUFDLE9BQU8sS0FBS0MsU0FBTCxJQUFrQixFQUF6QixJQUErQixHQUFoQyxFQUFxQzlCLE9BQXJDLENBQTZDLFFBQTdDLEVBQXVELEdBQXZELENBQWpCLENBQXpDLEVBQXdILEVBQXhILENBQW5CLENBQVA7QUFDRDs7QUFoSlU7O0FBUGJwRSxPQUFPZ0QsYUFBUCxDQTBKZTdDLE1BMUpmLEUiLCJmaWxlIjoiL3BhY2thZ2VzL29zdHJpb19mbG93LXJvdXRlci1leHRyYS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IFJvdXRlciAgICAgZnJvbSAnLi9yb3V0ZXIuanMnO1xuaW1wb3J0IFJvdXRlICAgICAgZnJvbSAnLi9yb3V0ZS5qcyc7XG5pbXBvcnQgR3JvdXAgICAgICBmcm9tICcuL2dyb3VwLmpzJztcblxuaWYgKFBhY2thZ2VbJ21ldGVvcmhhY2tzOmluamVjdC1kYXRhJ10pIHtcbiAgTWV0ZW9yLl9kZWJ1ZygnYG1ldGVvcmhhY2tzOmluamVjdC1kYXRhYCBpcyBkZXByZWNhdGVkLCBwbGVhc2UgcmVtb3ZlIGl0IGFuZCBpbnN0YWxsIGl0cyBzdWNjZXNzb3IgLSBgc3RhcmluZ2F0bGlnaHRzOmluamVjdC1kYXRhYCcpO1xuICBNZXRlb3IuX2RlYnVnKCdtZXRlb3IgcmVtb3ZlIG1ldGVvcmhhY2tzOmluamVjdC1kYXRhJyk7XG4gIE1ldGVvci5fZGVidWcoJ21ldGVvciBhZGQgc3RhcmluZ2F0bGlnaHRzOmluamVjdC1kYXRhJyk7XG59XG5cbmlmIChQYWNrYWdlWydtZXRlb3JoYWNrczpmYXN0LXJlbmRlciddKSB7XG4gIE1ldGVvci5fZGVidWcoJ2BtZXRlb3JoYWNrczpmYXN0LXJlbmRlcmAgaXMgZGVwcmVjYXRlZCwgcGxlYXNlIHJlbW92ZSBpdCBhbmQgaW5zdGFsbCBpdHMgc3VjY2Vzc29yIC0gYHN0YXJpbmdhdGxpZ2h0czpmYXN0LXJlbmRlcmAnKTtcbiAgTWV0ZW9yLl9kZWJ1ZygnbWV0ZW9yIHJlbW92ZSBtZXRlb3JoYWNrczpmYXN0LXJlbmRlcicpO1xuICBNZXRlb3IuX2RlYnVnKCdtZXRlb3IgYWRkIHN0YXJpbmdhdGxpZ2h0czpmYXN0LXJlbmRlcicpO1xufVxuXG5jb25zdCBUcmlnZ2VycyA9IHt9O1xuY29uc3QgQmxhemVSZW5kZXJlciA9IHt9O1xuXG5jb25zdCBGbG93Um91dGVyID0gbmV3IFJvdXRlcigpO1xuRmxvd1JvdXRlci5Sb3V0ZXIgPSBSb3V0ZXI7XG5GbG93Um91dGVyLlJvdXRlID0gUm91dGU7XG5cbmV4cG9ydCB7IEZsb3dSb3V0ZXIsIFJvdXRlciwgUm91dGUsIEdyb3VwLCBUcmlnZ2VycywgQmxhemVSZW5kZXJlciB9O1xuIiwiaW1wb3J0IHsgXyB9IGZyb20gJ21ldGVvci91bmRlcnNjb3JlJztcblxuY29uc3QgbWFrZVRyaWdnZXIgPSAodHJpZ2dlcikgPT4ge1xuICBpZiAoXy5pc0Z1bmN0aW9uKHRyaWdnZXIpKSB7XG4gICAgcmV0dXJuIFt0cmlnZ2VyXTtcbiAgfSBlbHNlIGlmICghXy5pc0FycmF5KHRyaWdnZXIpKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgcmV0dXJuIHRyaWdnZXI7XG59O1xuXG5jb25zdCBtYWtlVHJpZ2dlcnMgPSAoX2Jhc2UsIF90cmlnZ2VycykgPT4ge1xuICBpZiAoKCFfYmFzZSAmJiAhX3RyaWdnZXJzKSkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICByZXR1cm4gbWFrZVRyaWdnZXIoX2Jhc2UpLmNvbmNhdChtYWtlVHJpZ2dlcihfdHJpZ2dlcnMpKTtcbn07XG5cbmNsYXNzIEdyb3VwIHtcbiAgY29uc3RydWN0b3Iocm91dGVyLCBvcHRpb25zID0ge30sIHBhcmVudCkge1xuICAgIGlmIChvcHRpb25zLnByZWZpeCAmJiAhL15cXC8vLnRlc3Qob3B0aW9ucy5wcmVmaXgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2dyb3VwXFwncyBwcmVmaXggbXVzdCBzdGFydCB3aXRoIFwiL1wiJyk7XG4gICAgfVxuXG4gICAgdGhpcy5fcm91dGVyID0gcm91dGVyO1xuICAgIHRoaXMucHJlZml4ID0gb3B0aW9ucy5wcmVmaXggfHwgJyc7XG4gICAgdGhpcy5uYW1lID0gb3B0aW9ucy5uYW1lO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICB0aGlzLl90cmlnZ2Vyc0VudGVyID0gbWFrZVRyaWdnZXJzKG9wdGlvbnMudHJpZ2dlcnNFbnRlciwgdGhpcy5fdHJpZ2dlcnNFbnRlcik7XG4gICAgdGhpcy5fdHJpZ2dlcnNFeGl0ICA9IG1ha2VUcmlnZ2Vycyh0aGlzLl90cmlnZ2Vyc0V4aXQsIG9wdGlvbnMudHJpZ2dlcnNFeGl0KTtcblxuICAgIHRoaXMuX3N1YnNjcmlwdGlvbnMgPSBvcHRpb25zLnN1YnNjcmlwdGlvbnMgfHwgRnVuY3Rpb24ucHJvdG90eXBlO1xuXG4gICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgaWYgKHRoaXMucGFyZW50KSB7XG4gICAgICB0aGlzLnByZWZpeCA9IHBhcmVudC5wcmVmaXggKyB0aGlzLnByZWZpeDtcbiAgICAgIHRoaXMuX3RyaWdnZXJzRW50ZXIgPSBtYWtlVHJpZ2dlcnMocGFyZW50Ll90cmlnZ2Vyc0VudGVyLCB0aGlzLl90cmlnZ2Vyc0VudGVyKTtcbiAgICAgIHRoaXMuX3RyaWdnZXJzRXhpdCAgPSBtYWtlVHJpZ2dlcnModGhpcy5fdHJpZ2dlcnNFeGl0LCBwYXJlbnQuX3RyaWdnZXJzRXhpdCk7XG4gICAgfVxuICB9XG5cbiAgcm91dGUoX3BhdGhEZWYsIG9wdGlvbnMgPSB7fSwgX2dyb3VwKSB7XG4gICAgaWYgKCEvXlxcLy8udGVzdChfcGF0aERlZikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncm91dGVcXCdzIHBhdGggbXVzdCBzdGFydCB3aXRoIFwiL1wiJyk7XG4gICAgfVxuXG4gICAgY29uc3QgZ3JvdXAgICA9IF9ncm91cCB8fCB0aGlzO1xuICAgIGNvbnN0IHBhdGhEZWYgPSB0aGlzLnByZWZpeCArIF9wYXRoRGVmO1xuXG4gICAgb3B0aW9ucy50cmlnZ2Vyc0VudGVyID0gbWFrZVRyaWdnZXJzKHRoaXMuX3RyaWdnZXJzRW50ZXIsIG9wdGlvbnMudHJpZ2dlcnNFbnRlcik7XG4gICAgb3B0aW9ucy50cmlnZ2Vyc0V4aXQgID0gbWFrZVRyaWdnZXJzKG9wdGlvbnMudHJpZ2dlcnNFeGl0LCB0aGlzLl90cmlnZ2Vyc0V4aXQpO1xuXG4gICAgcmV0dXJuIHRoaXMuX3JvdXRlci5yb3V0ZShwYXRoRGVmLCBfLmV4dGVuZChfLm9taXQodGhpcy5vcHRpb25zLCAndHJpZ2dlcnNFbnRlcicsICd0cmlnZ2Vyc0V4aXQnLCAnc3Vic2NyaXB0aW9ucycsICdwcmVmaXgnLCAnd2FpdE9uJywgJ25hbWUnLCAndGl0bGUnLCAndGl0bGVQcmVmaXgnLCAnbGluaycsICdzY3JpcHQnLCAnbWV0YScpLCBvcHRpb25zKSwgZ3JvdXApO1xuICB9XG5cbiAgZ3JvdXAob3B0aW9ucykge1xuICAgIHJldHVybiBuZXcgR3JvdXAodGhpcy5fcm91dGVyLCBvcHRpb25zLCB0aGlzKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBHcm91cDtcbiIsImNsYXNzIFJvdXRlIHtcbiAgY29uc3RydWN0b3Iocm91dGVyLCBwYXRoRGVmLCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMubmFtZSA9IG9wdGlvbnMubmFtZTtcbiAgICB0aGlzLnBhdGhEZWYgPSBwYXRoRGVmO1xuXG4gICAgLy8gUm91dGUucGF0aCBpcyBkZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gMy4wXG4gICAgdGhpcy5wYXRoID0gcGF0aERlZjtcblxuICAgIHRoaXMuYWN0aW9uID0gb3B0aW9ucy5hY3Rpb24gfHwgRnVuY3Rpb24ucHJvdG90eXBlO1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucyA9IG9wdGlvbnMuc3Vic2NyaXB0aW9ucyB8fCBGdW5jdGlvbi5wcm90b3R5cGU7XG4gICAgdGhpcy5fc3Vic01hcCA9IHt9O1xuICB9XG5cblxuICByZWdpc3RlcihuYW1lLCBzdWIpIHtcbiAgICB0aGlzLl9zdWJzTWFwW25hbWVdID0gc3ViO1xuICB9XG5cblxuICBzdWJzY3JpcHRpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9zdWJzTWFwW25hbWVdO1xuICB9XG5cblxuICBtaWRkbGV3YXJlKCkge1xuICAgIC8vID9cbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBSb3V0ZTtcbiIsImltcG9ydCB7IF8gfSAgICAgIGZyb20gJ21ldGVvci91bmRlcnNjb3JlJztcbmltcG9ydCBSb3V0ZSAgICAgIGZyb20gJy4vcm91dGUuanMnO1xuaW1wb3J0IEdyb3VwICAgICAgZnJvbSAnLi9ncm91cC5qcyc7XG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcblxuY29uc3QgcXMgPSByZXF1aXJlKCdxcycpO1xuXG5jbGFzcyBSb3V0ZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnBhdGhSZWdFeHAgPSAvKDpbXFx3XFwoXFwpXFxcXFxcK1xcKlxcLlxcP1xcW1xcXVxcLV0rKSsvZztcbiAgICB0aGlzLl9yb3V0ZXMgPSBbXTtcbiAgICB0aGlzLl9yb3V0ZXNNYXAgPSB7fTtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMgPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbiAgICAvLyBob2xkcyBvblJvdXRlIGNhbGxiYWNrc1xuICAgIHRoaXMuX29uUm91dGVDYWxsYmFja3MgPSBbXTtcblxuICAgIHRoaXMudHJpZ2dlcnMgPSB7XG4gICAgICBlbnRlcigpIHtcbiAgICAgICAgLy8gY2xpZW50IG9ubHlcbiAgICAgIH0sXG4gICAgICBleGl0KCkge1xuICAgICAgICAvLyBjbGllbnQgb25seVxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICByb3V0ZShwYXRoRGVmLCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAoIS9eXFwvLiovLnRlc3QocGF0aERlZikgJiYgcGF0aERlZiAhPT0gJyonKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JvdXRlXFwncyBwYXRoIG11c3Qgc3RhcnQgd2l0aCBcIi9cIicpO1xuICAgIH1cblxuICAgIGNvbnN0IHJvdXRlID0gbmV3IFJvdXRlKHRoaXMsIHBhdGhEZWYsIG9wdGlvbnMpO1xuICAgIHRoaXMuX3JvdXRlcy5wdXNoKHJvdXRlKTtcblxuICAgIGlmIChvcHRpb25zLm5hbWUpIHtcbiAgICAgIHRoaXMuX3JvdXRlc01hcFtvcHRpb25zLm5hbWVdID0gcm91dGU7XG4gICAgfVxuXG4gICAgdGhpcy5fdHJpZ2dlclJvdXRlUmVnaXN0ZXIocm91dGUpO1xuICAgIHJldHVybiByb3V0ZTtcbiAgfVxuXG4gIGdyb3VwKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IEdyb3VwKHRoaXMsIG9wdGlvbnMpO1xuICB9XG5cbiAgcGF0aChwYXRoRGVmLCBmaWVsZHMgPSB7fSwgcXVlcnlQYXJhbXMpIHtcbiAgICBpZiAodGhpcy5fcm91dGVzTWFwW3BhdGhEZWZdKSB7XG4gICAgICBwYXRoRGVmID0gdGhpcy5fcm91dGVzTWFwW3BhdGhEZWZdLnBhdGg7XG4gICAgfVxuXG4gICAgbGV0IHBhdGggPSBwYXRoRGVmLnJlcGxhY2UodGhpcy5wYXRoUmVnRXhwLCAoa2V5KSA9PiB7XG4gICAgICBjb25zdCBmaXJzdFJlZ2V4cENoYXIgPSBrZXkuaW5kZXhPZignKCcpO1xuICAgICAgLy8gZ2V0IHRoZSBjb250ZW50IGJlaGluZCA6IGFuZCAoXFxcXGQrLylcbiAgICAgIGtleSA9IGtleS5zdWJzdHJpbmcoMSwgKGZpcnN0UmVnZXhwQ2hhciA+IDApID8gZmlyc3RSZWdleHBDaGFyIDogdW5kZWZpbmVkKTtcbiAgICAgIC8vIHJlbW92ZSArPypcbiAgICAgIGtleSA9IGtleS5yZXBsYWNlKC9bXFwrXFwqXFw/XSsvZywgJycpO1xuXG4gICAgICByZXR1cm4gZmllbGRzW2tleV0gfHwgJyc7XG4gICAgfSk7XG5cbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC9cXC8rL2csICcvJyk7IC8vIFJlcGxhY2UgbXVsdGlwbGUgc2xhc2hlcyB3aXRoIHNpbmdsZSBzbGFzaFxuXG4gICAgLy8gcmVtb3ZlIHRyYWlsaW5nIHNsYXNoXG4gICAgLy8gYnV0IGtlZXAgdGhlIHJvb3Qgc2xhc2ggaWYgaXQncyB0aGUgb25seSBvbmVcbiAgICBwYXRoID0gcGF0aC5tYXRjaCgvXlxcL3sxfSQvKSA/IHBhdGggOiBwYXRoLnJlcGxhY2UoL1xcLyQvLCAnJyk7XG5cbiAgICBjb25zdCBzdHJRdWVyeVBhcmFtcyA9IHFzLnN0cmluZ2lmeShxdWVyeVBhcmFtcyB8fCB7fSk7XG4gICAgaWYoc3RyUXVlcnlQYXJhbXMpIHtcbiAgICAgIHBhdGggKz0gJz8nICsgc3RyUXVlcnlQYXJhbXM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhdGg7XG4gIH1cblxuICBvblJvdXRlUmVnaXN0ZXIoY2IpIHtcbiAgICB0aGlzLl9vblJvdXRlQ2FsbGJhY2tzLnB1c2goY2IpO1xuICB9XG5cbiAgX3RyaWdnZXJSb3V0ZVJlZ2lzdGVyKGN1cnJlbnRSb3V0ZSkge1xuICAgIC8vIFdlIHNob3VsZCBvbmx5IG5lZWQgdG8gc2VuZCBhIHNhZmUgc2V0IG9mIGZpZWxkcyBvbiB0aGUgcm91dGVcbiAgICAvLyBvYmplY3QuXG4gICAgLy8gVGhpcyBpcyBub3QgdG8gaGlkZSB3aGF0J3MgaW5zaWRlIHRoZSByb3V0ZSBvYmplY3QsIGJ1dCB0byBzaG93XG4gICAgLy8gdGhlc2UgYXJlIHRoZSBwdWJsaWMgQVBJc1xuICAgIGNvbnN0IHJvdXRlUHVibGljQXBpID0gXy5waWNrKGN1cnJlbnRSb3V0ZSwgJ25hbWUnLCAncGF0aERlZicsICdwYXRoJyk7XG4gICAgcm91dGVQdWJsaWNBcGkub3B0aW9ucyA9IF8ub21pdChjdXJyZW50Um91dGUub3B0aW9ucywgWyd0cmlnZ2Vyc0VudGVyJywgJ3RyaWdnZXJzRXhpdCcsICdhY3Rpb24nLCAnc3Vic2NyaXB0aW9ucycsICduYW1lJ10pO1xuXG4gICAgXy5lYWNoKHRoaXMuX29uUm91dGVDYWxsYmFja3MsIGZ1bmN0aW9uKGNiKSB7XG4gICAgICBjYihyb3V0ZVB1YmxpY0FwaSk7XG4gICAgfSk7XG4gIH1cblxuXG4gIGdvKCkge1xuICAgIC8vIGNsaWVudCBvbmx5XG4gIH1cblxuXG4gIGN1cnJlbnQoKSB7XG4gICAgLy8gY2xpZW50IG9ubHlcbiAgfVxuXG4gIG1pZGRsZXdhcmUoKSB7XG4gICAgLy8gY2xpZW50IG9ubHlcbiAgfVxuXG5cbiAgZ2V0U3RhdGUoKSB7XG4gICAgLy8gY2xpZW50IG9ubHlcbiAgfVxuXG5cbiAgZ2V0QWxsU3RhdGVzKCkge1xuICAgIC8vIGNsaWVudCBvbmx5XG4gIH1cblxuXG4gIHNldFN0YXRlKCkge1xuICAgIC8vIGNsaWVudCBvbmx5XG4gIH1cblxuXG4gIHJlbW92ZVN0YXRlKCkge1xuICAgIC8vIGNsaWVudCBvbmx5XG4gIH1cblxuXG4gIGNsZWFyU3RhdGVzKCkge1xuICAgIC8vIGNsaWVudCBvbmx5XG4gIH1cblxuXG4gIHJlYWR5KCkge1xuICAgIC8vIGNsaWVudCBvbmx5XG4gIH1cblxuXG4gIGluaXRpYWxpemUoKSB7XG4gICAgLy8gY2xpZW50IG9ubHlcbiAgfVxuXG4gIHdhaXQoKSB7XG4gICAgLy8gY2xpZW50IG9ubHlcbiAgfVxuXG4gIHVybCgpIHtcbiAgICAvLyBXZSBuZWVkIHRvIHJlbW92ZSB0aGUgbGVhZGluZyBiYXNlIHBhdGgsIG9yIFwiL1wiLCBhcyBpdCB3aWxsIGJlIGluc2VydGVkXG4gICAgLy8gYXV0b21hdGljYWxseSBieSBgTWV0ZW9yLmFic29sdXRlVXJsYCBhcyBkb2N1bWVudGVkIGluOlxuICAgIC8vIGh0dHA6Ly9kb2NzLm1ldGVvci5jb20vIy9mdWxsL21ldGVvcl9hYnNvbHV0ZXVybFxuICAgIHJldHVybiBNZXRlb3IuYWJzb2x1dGVVcmwodGhpcy5wYXRoLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykucmVwbGFjZShuZXcgUmVnRXhwKCdeJyArICgnLycgKyAodGhpcy5fYmFzZVBhdGggfHwgJycpICsgJy8nKS5yZXBsYWNlKC9cXC9cXC8rL2csICcvJykpLCAnJykpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFJvdXRlcjtcbiJdfQ==
