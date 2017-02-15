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
var Router, Group, Route, FlowRouter, pathWithoutBase;

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:flow-router-extra":{"server":{"router.js":["qs",function(require){

///////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                           //
// packages/ostrio_flow-router-extra/server/router.js                                        //
//                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////
                                                                                             //
var Qs = require('qs');                                                                      // 1
                                                                                             //
var pathRegExp = /(:[\w\(\)\\\+\*\.\?]+)+/g;                                                 // 2
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
Group = function (router) {                                                                  // 1
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};      // 1
  this.prefix = options.prefix || '';                                                        // 2
  this.options = options;                                                                    // 3
  this._router = router;                                                                     // 4
};                                                                                           // 5
                                                                                             //
Group.prototype.route = function (pathDef, options) {                                        // 7
  pathDef = this.prefix + pathDef;                                                           // 8
  return this._router.route(pathDef, options);                                               // 9
};                                                                                           // 10
                                                                                             //
Group.prototype.group = function (options) {                                                 // 12
  var group = new Group(this._router, options);                                              // 13
  group.parent = this;                                                                       // 14
  return group;                                                                              // 16
};                                                                                           // 17
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
  return Meteor.absoluteUrl(pathWithoutBase = this.path.apply(this, arguments).replace(new RegExp('^' + (this._basePath || '/')), ''));
};                                                                                           // 6
                                                                                             //
Meteor.startup(function () {                                                                 // 8
  Package['kadira:flow-router'] = Package['ostrio:flow-router-extra'];                       // 9
});                                                                                          // 10
///////////////////////////////////////////////////////////////////////////////////////////////

}},"node_modules":{"qs":{"package.json":function(require,exports){

///////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                           //
// ../../.2.12.7.l9gryp++os+web.browser+web.cordova/npm/node_modules/qs/package.json         //
//                                                                                           //
///////////////////////////////////////////////////////////////////////////////////////////////
                                                                                             //
exports.name = "qs";
exports.version = "6.3.0";
exports.main = "lib/index.js";

///////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                           //
// node_modules/meteor/ostrio:flow-router-extra/node_modules/qs/lib/index.js                 //
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
