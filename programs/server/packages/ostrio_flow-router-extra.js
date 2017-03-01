(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var Blaze = Package.blaze.Blaze;
var UI = Package.blaze.UI;
var Handlebars = Package.blaze.Handlebars;
var meteorInstall = Package.modules.meteorInstall;
var Buffer = Package.modules.Buffer;
var process = Package.modules.process;
var _ = Package.underscore._;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var ReactiveDict = Package['reactive-dict'].ReactiveDict;
var ReactiveVar = Package['reactive-var'].ReactiveVar;
var EJSON = Package.ejson.EJSON;
var ECMAScript = Package.ecmascript.ECMAScript;
var HTML = Package.htmljs.HTML;
var Symbol = Package['ecmascript-runtime'].Symbol;
var Map = Package['ecmascript-runtime'].Map;
var Set = Package['ecmascript-runtime'].Set;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Router, Group, Route, FlowRouter;

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:flow-router-extra":{"server":{"router.js":["qs",function(require){

///////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                           //
// packages/ostrio_flow-router-extra/server/router.js                                        //
//                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////
                                                                                             //
var Qs = require('qs');                                                                      // 1
                                                                                             //
var pathRegExp = /(:[\w\(\)\\\+\*\.\?\[\]\-]+)+/g;                                           // 2
                                                                                             //
Router = function () {                                                                       // 4
  this._routes = [];                                                                         // 5
  this._routesMap = {};                                                                      // 6
  this.subscriptions = Function.prototype; // holds onRoute callbacks                        // 7
                                                                                             //
  this._onRouteCallbacks = [];                                                               // 10
};                                                                                           // 11
                                                                                             //
Router.prototype.route = function (pathDef) {                                                // 13
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};      // 13
                                                                                             //
  if (!/^\/.*/.test(pathDef)) {                                                              // 14
    throw new Error('route\'s path must start with "/"');                                    // 15
  }                                                                                          // 16
                                                                                             //
  var route = new Route(this, pathDef, options);                                             // 18
                                                                                             //
  this._routes.push(route);                                                                  // 19
                                                                                             //
  if (options.name) {                                                                        // 21
    this._routesMap[options.name] = route;                                                   // 22
  }                                                                                          // 23
                                                                                             //
  this._triggerRouteRegister(route);                                                         // 25
                                                                                             //
  return route;                                                                              // 26
};                                                                                           // 27
                                                                                             //
Router.prototype.group = function (options) {                                                // 29
  return new Group(this, options);                                                           // 30
};                                                                                           // 31
                                                                                             //
Router.prototype.path = function (pathDef) {                                                 // 33
  var fields = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};       // 33
  var queryParams = arguments[2];                                                            // 33
                                                                                             //
  if (this._routesMap[pathDef]) {                                                            // 34
    pathDef = this._routesMap[pathDef].path;                                                 // 35
  }                                                                                          // 36
                                                                                             //
  var path = pathDef.replace(pathRegExp, function (key) {                                    // 38
    var firstRegexpChar = key.indexOf('('); // get the content behind : and (\\d+/)          // 39
                                                                                             //
    key = key.substring(1, firstRegexpChar > 0 ? firstRegexpChar : undefined); // remove +?*
                                                                                             //
    key = key.replace(/[\+\*\?]+/g, '');                                                     // 43
    return fields[key] || '';                                                                // 45
  });                                                                                        // 46
  path = path.replace(/\/\/+/g, '/'); // Replace multiple slashes with single slash          // 48
  // remove trailing slash                                                                   // 50
  // but keep the root slash if it's the only one                                            // 51
                                                                                             //
  path = path.match(/^\/{1}$/) ? path : path.replace(/\/$/, '');                             // 52
  var strQueryParams = Qs.stringify(queryParams || {});                                      // 54
                                                                                             //
  if (strQueryParams) {                                                                      // 55
    path += '?' + strQueryParams;                                                            // 56
  }                                                                                          // 57
                                                                                             //
  return path;                                                                               // 59
};                                                                                           // 60
                                                                                             //
Router.prototype.onRouteRegister = function (cb) {                                           // 62
  this._onRouteCallbacks.push(cb);                                                           // 63
};                                                                                           // 64
                                                                                             //
Router.prototype._triggerRouteRegister = function (currentRoute) {                           // 66
  // We should only need to send a safe set of fields on the route                           // 67
  // object.                                                                                 // 68
  // This is not to hide what's inside the route object, but to show                         // 69
  // these are the public APIs                                                               // 70
  var routePublicApi = _.pick(currentRoute, 'name', 'pathDef', 'path');                      // 71
                                                                                             //
  routePublicApi.options = _.omit(currentRoute.options, ['triggersEnter', 'triggersExit', 'action', 'subscriptions', 'name']);
                                                                                             //
  _.each(this._onRouteCallbacks, function (cb) {                                             // 74
    cb(routePublicApi);                                                                      // 75
  });                                                                                        // 76
};                                                                                           // 77
                                                                                             //
Router.prototype.go = function () {// client only                                            // 80
};                                                                                           // 82
                                                                                             //
Router.prototype.current = function () {// client only                                       // 85
};                                                                                           // 87
                                                                                             //
Router.prototype.triggers = {                                                                // 90
  enter: function () {// client only                                                         // 91
  },                                                                                         // 93
  exit: function () {// client only                                                          // 94
  }                                                                                          // 96
};                                                                                           // 90
                                                                                             //
Router.prototype.middleware = function () {// client only                                    // 99
};                                                                                           // 101
                                                                                             //
Router.prototype.getState = function () {// client only                                      // 104
};                                                                                           // 106
                                                                                             //
Router.prototype.getAllStates = function () {// client only                                  // 109
};                                                                                           // 111
                                                                                             //
Router.prototype.setState = function () {// client only                                      // 114
};                                                                                           // 116
                                                                                             //
Router.prototype.removeState = function () {// client only                                   // 119
};                                                                                           // 121
                                                                                             //
Router.prototype.clearStates = function () {// client only                                   // 124
};                                                                                           // 126
                                                                                             //
Router.prototype.ready = function () {// client only                                         // 129
};                                                                                           // 131
                                                                                             //
Router.prototype.initialize = function () {// client only                                    // 134
};                                                                                           // 136
                                                                                             //
Router.prototype.wait = function () {// client only                                          // 138
};                                                                                           // 140
///////////////////////////////////////////////////////////////////////////////////////////////

}],"group.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                           //
// packages/ostrio_flow-router-extra/server/group.js                                         //
//                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////
                                                                                             //
var makeTriggers = function (base, triggers) {                                               // 1
  if (triggers) {                                                                            // 2
    if (!_.isArray(triggers)) {                                                              // 3
      triggers = [triggers];                                                                 // 4
    }                                                                                        // 5
  } else {                                                                                   // 6
    triggers = [];                                                                           // 7
  }                                                                                          // 8
                                                                                             //
  return (base || []).concat(triggers);                                                      // 10
};                                                                                           // 11
                                                                                             //
Group = function (router) {                                                                  // 13
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};      // 13
  var parent = arguments[2];                                                                 // 13
                                                                                             //
  if (options.prefix && !/^\/.*/.test(options.prefix)) {                                     // 14
    throw new Error('group\'s prefix must start with "/"');                                  // 15
  }                                                                                          // 16
                                                                                             //
  this._router = router;                                                                     // 18
  this.prefix = options.prefix || '';                                                        // 19
  this.name = options.name;                                                                  // 20
  this.options = options;                                                                    // 21
  this._triggersEnter = makeTriggers(this._triggersEnter, options.triggersEnter);            // 23
  this._triggersExit = makeTriggers(this._triggersExit, options.triggersExit);               // 24
  this.parent = parent;                                                                      // 26
                                                                                             //
  if (this.parent) {                                                                         // 27
    this.prefix = parent.prefix + this.prefix;                                               // 28
    this._triggersEnter = makeTriggers(this._triggersEnter, parent.triggersEnter);           // 30
    this._triggersExit = makeTriggers(this._triggersExit, parent.triggersExit);              // 31
  }                                                                                          // 32
};                                                                                           // 33
                                                                                             //
Group.prototype.route = function (pathDef) {                                                 // 35
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};      // 35
  var group = arguments[2];                                                                  // 35
                                                                                             //
  if (!/^\/.*/.test(pathDef)) {                                                              // 36
    throw new Error('route\'s path must start with "/"');                                    // 37
  }                                                                                          // 38
                                                                                             //
  group = group || this;                                                                     // 40
  pathDef = this.prefix + pathDef;                                                           // 41
  options.triggersEnter = makeTriggers(this._triggersEnter, options.triggersEnter);          // 43
  options.triggersExit = makeTriggers(this._triggersExit, options.triggersExit);             // 44
  return this._router.route(pathDef, options, group);                                        // 46
};                                                                                           // 47
                                                                                             //
Group.prototype.group = function (options) {                                                 // 49
  var group = new Group(this._router, options, this);                                        // 50
  group.parent = this;                                                                       // 51
  return group;                                                                              // 53
};                                                                                           // 54
///////////////////////////////////////////////////////////////////////////////////////////////

},"route.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                           //
// packages/ostrio_flow-router-extra/server/route.js                                         //
//                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////
                                                                                             //
Route = function (router, pathDef) {                                                         // 1
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};      // 1
  this.options = options;                                                                    // 2
  this.name = options.name;                                                                  // 3
  this.pathDef = pathDef; // Route.path is deprecated and will be removed in 3.0             // 4
                                                                                             //
  this.path = pathDef;                                                                       // 7
  this.action = options.action || Function.prototype;                                        // 9
  this.subscriptions = options.subscriptions || Function.prototype;                          // 10
  this._subsMap = {};                                                                        // 11
};                                                                                           // 12
                                                                                             //
Route.prototype.register = function (name, sub) {                                            // 15
  this._subsMap[name] = sub;                                                                 // 16
};                                                                                           // 17
                                                                                             //
Route.prototype.subscription = function (name) {                                             // 20
  return this._subsMap[name];                                                                // 21
};                                                                                           // 22
                                                                                             //
Route.prototype.middleware = function () {// ?                                               // 25
};                                                                                           // 27
///////////////////////////////////////////////////////////////////////////////////////////////

},"_init.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                           //
// packages/ostrio_flow-router-extra/server/_init.js                                         //
//                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////
                                                                                             //
module.export({                                                                              // 1
  FlowRouter: function () {                                                                  // 1
    return FlowRouter;                                                                       // 1
  }                                                                                          // 1
});                                                                                          // 1
// Export Router Instance                                                                    // 1
module.runModuleSetters(FlowRouter = new Router());                                          // 2
FlowRouter.Router = Router;                                                                  // 3
FlowRouter.Route = Route;                                                                    // 4
///////////////////////////////////////////////////////////////////////////////////////////////

}},"lib":{"router.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                           //
// packages/ostrio_flow-router-extra/lib/router.js                                           //
//                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////
                                                                                             //
Router.prototype.url = function () {                                                         // 1
  // We need to remove the leading base path, or "/", as it will be inserted                 // 2
  // automatically by `Meteor.absoluteUrl` as documented in:                                 // 3
  // http://docs.meteor.com/#/full/meteor_absoluteurl                                        // 4
  return Meteor.absoluteUrl(this.path.apply(this, arguments).replace(new RegExp('^' + ('/' + (this._basePath || '') + '/').replace(/\/\/+/g, "/")), ''));
};                                                                                           // 6
                                                                                             //
Meteor.startup(function () {                                                                 // 8
  Package['kadira:flow-router'] = Package['ostrio:flow-router-extra'];                       // 9
});                                                                                          // 10
///////////////////////////////////////////////////////////////////////////////////////////////

}},"node_modules":{"qs":{"package.json":function(require,exports){

///////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                           //
// ../../.2.12.9.1javthe++os+web.browser+web.cordova/npm/node_modules/qs/package.json        //
//                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////
                                                                                             //
exports.name = "qs";
exports.version = "6.3.1";
exports.main = "lib/index.js";

///////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                           //
// node_modules/meteor/ostrio_flow-router-extra/node_modules/qs/lib/index.js                 //
//                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////
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

///////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}}},{"extensions":[".js",".json"]});
require("./node_modules/meteor/ostrio:flow-router-extra/server/router.js");
require("./node_modules/meteor/ostrio:flow-router-extra/server/group.js");
require("./node_modules/meteor/ostrio:flow-router-extra/server/route.js");
var exports = require("./node_modules/meteor/ostrio:flow-router-extra/server/_init.js");
require("./node_modules/meteor/ostrio:flow-router-extra/lib/router.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['ostrio:flow-router-extra'] = exports, {
  FlowRouter: FlowRouter
});

})();

//# sourceMappingURL=ostrio_flow-router-extra.js.map
