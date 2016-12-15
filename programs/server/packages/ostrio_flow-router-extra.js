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

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// packages/ostrio_flow-router-extra/server/router.js                                              //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
var Qs = require('qs');                                                                            // 1
                                                                                                   //
Router = function Router() {                                                                       // 3
  this._routes = [];                                                                               // 4
  this._routesMap = {};                                                                            // 5
  this.subscriptions = Function.prototype;                                                         // 6
                                                                                                   //
  // holds onRoute callbacks                                                                       // 8
  this._onRouteCallbacks = [];                                                                     // 9
};                                                                                                 // 10
                                                                                                   //
Router.prototype.route = function (pathDef, options) {                                             // 12
  if (!/^\/.*/.test(pathDef)) {                                                                    // 13
    var message = "route's path must start with '/'";                                              // 14
    throw new Error(message);                                                                      // 15
  }                                                                                                // 16
                                                                                                   //
  options = options || {};                                                                         // 18
  var route = new Route(this, pathDef, options);                                                   // 19
  this._routes.push(route);                                                                        // 20
                                                                                                   //
  if (options.name) {                                                                              // 22
    this._routesMap[options.name] = route;                                                         // 23
  }                                                                                                // 24
                                                                                                   //
  this._triggerRouteRegister(route);                                                               // 26
  return route;                                                                                    // 27
};                                                                                                 // 28
                                                                                                   //
Router.prototype.group = function (options) {                                                      // 30
  return new Group(this, options);                                                                 // 31
};                                                                                                 // 32
                                                                                                   //
Router.prototype.path = function (pathDef, fields, queryParams) {                                  // 34
  if (this._routesMap[pathDef]) {                                                                  // 35
    pathDef = this._routesMap[pathDef].path;                                                       // 36
  }                                                                                                // 37
                                                                                                   //
  fields = fields || {};                                                                           // 39
  var regExp = /(:[\w\(\)\\\+\*\.\?]+)+/g;                                                         // 40
  var path = pathDef.replace(regExp, function (key) {                                              // 41
    var firstRegexpChar = key.indexOf("(");                                                        // 42
    // get the content behind : and (\\d+/)                                                        // 43
    key = key.substring(1, firstRegexpChar > 0 ? firstRegexpChar : undefined);                     // 44
    // remove +?*                                                                                  // 45
    key = key.replace(/[\+\*\?]+/g, "");                                                           // 46
                                                                                                   //
    return fields[key] || "";                                                                      // 48
  });                                                                                              // 49
                                                                                                   //
  path = path.replace(/\/\/+/g, "/"); // Replace multiple slashes with single slash                // 51
                                                                                                   //
  // remove trailing slash                                                                         // 53
  // but keep the root slash if it's the only one                                                  // 54
  path = path.match(/^\/{1}$/) ? path : path.replace(/\/$/, "");                                   // 55
                                                                                                   //
  var strQueryParams = Qs.stringify(queryParams || {});                                            // 57
  if (strQueryParams) {                                                                            // 58
    path += "?" + strQueryParams;                                                                  // 59
  }                                                                                                // 60
                                                                                                   //
  return path;                                                                                     // 62
};                                                                                                 // 63
                                                                                                   //
Router.prototype.onRouteRegister = function (cb) {                                                 // 65
  this._onRouteCallbacks.push(cb);                                                                 // 66
};                                                                                                 // 67
                                                                                                   //
Router.prototype._triggerRouteRegister = function (currentRoute) {                                 // 69
  // We should only need to send a safe set of fields on the route                                 // 70
  // object.                                                                                       // 71
  // This is not to hide what's inside the route object, but to show                               // 72
  // these are the public APIs                                                                     // 73
  var routePublicApi = _.pick(currentRoute, 'name', 'pathDef', 'path');                            // 74
  var omittingOptionFields = ['triggersEnter', 'triggersExit', 'action', 'subscriptions', 'name'];
  routePublicApi.options = _.omit(currentRoute.options, omittingOptionFields);                     // 78
                                                                                                   //
  _.each(this._onRouteCallbacks, function (cb) {                                                   // 80
    cb(routePublicApi);                                                                            // 81
  });                                                                                              // 82
};                                                                                                 // 83
                                                                                                   //
Router.prototype.go = function () {                                                                // 86
  // client only                                                                                   // 87
};                                                                                                 // 88
                                                                                                   //
Router.prototype.current = function () {                                                           // 91
  // client only                                                                                   // 92
};                                                                                                 // 93
                                                                                                   //
Router.prototype.triggers = {                                                                      // 96
  enter: function () {                                                                             // 97
    function enter() {                                                                             // 97
      // client only                                                                               // 98
    }                                                                                              // 99
                                                                                                   //
    return enter;                                                                                  // 97
  }(),                                                                                             // 97
  exit: function () {                                                                              // 100
    function exit() {                                                                              // 100
      // client only                                                                               // 101
    }                                                                                              // 102
                                                                                                   //
    return exit;                                                                                   // 100
  }()                                                                                              // 100
};                                                                                                 // 96
                                                                                                   //
Router.prototype.middleware = function () {                                                        // 105
  // client only                                                                                   // 106
};                                                                                                 // 107
                                                                                                   //
Router.prototype.getState = function () {                                                          // 110
  // client only                                                                                   // 111
};                                                                                                 // 112
                                                                                                   //
Router.prototype.getAllStates = function () {                                                      // 115
  // client only                                                                                   // 116
};                                                                                                 // 117
                                                                                                   //
Router.prototype.setState = function () {                                                          // 120
  // client only                                                                                   // 121
};                                                                                                 // 122
                                                                                                   //
Router.prototype.removeState = function () {                                                       // 125
  // client only                                                                                   // 126
};                                                                                                 // 127
                                                                                                   //
Router.prototype.clearStates = function () {                                                       // 130
  // client only                                                                                   // 131
};                                                                                                 // 132
                                                                                                   //
Router.prototype.ready = function () {                                                             // 135
  // client only                                                                                   // 136
};                                                                                                 // 137
                                                                                                   //
Router.prototype.initialize = function () {                                                        // 140
  // client only                                                                                   // 141
};                                                                                                 // 142
                                                                                                   //
Router.prototype.wait = function () {                                                              // 144
  // client only                                                                                   // 145
};                                                                                                 // 146
/////////////////////////////////////////////////////////////////////////////////////////////////////

}],"group.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// packages/ostrio_flow-router-extra/server/group.js                                               //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
Group = function Group(router, options) {                                                          // 1
  options = options || {};                                                                         // 2
  this.prefix = options.prefix || '';                                                              // 3
  this.options = options;                                                                          // 4
  this._router = router;                                                                           // 5
};                                                                                                 // 6
                                                                                                   //
Group.prototype.route = function (pathDef, options) {                                              // 8
  pathDef = this.prefix + pathDef;                                                                 // 9
  return this._router.route(pathDef, options);                                                     // 10
};                                                                                                 // 11
                                                                                                   //
Group.prototype.group = function (options) {                                                       // 13
  var group = new Group(this._router, options);                                                    // 14
  group.parent = this;                                                                             // 15
                                                                                                   //
  return group;                                                                                    // 17
};                                                                                                 // 18
/////////////////////////////////////////////////////////////////////////////////////////////////////

},"route.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// packages/ostrio_flow-router-extra/server/route.js                                               //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
Route = function Route(router, pathDef, options) {                                                 // 1
  options = options || {};                                                                         // 2
  this.options = options;                                                                          // 3
  this.name = options.name;                                                                        // 4
  this.pathDef = pathDef;                                                                          // 5
                                                                                                   //
  // Route.path is deprecated and will be removed in 3.0                                           // 7
  this.path = pathDef;                                                                             // 8
                                                                                                   //
  this.action = options.action || Function.prototype;                                              // 10
  this.subscriptions = options.subscriptions || Function.prototype;                                // 11
  this._subsMap = {};                                                                              // 12
};                                                                                                 // 13
                                                                                                   //
Route.prototype.register = function (name, sub, options) {                                         // 16
  this._subsMap[name] = sub;                                                                       // 17
};                                                                                                 // 18
                                                                                                   //
Route.prototype.subscription = function (name) {                                                   // 21
  return this._subsMap[name];                                                                      // 22
};                                                                                                 // 23
                                                                                                   //
Route.prototype.middleware = function (middleware) {};                                             // 26
/////////////////////////////////////////////////////////////////////////////////////////////////////

},"_init.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// packages/ostrio_flow-router-extra/server/_init.js                                               //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
module.export({FlowRouter:function(){return FlowRouter}});// Export Router Instance                // 1
module.runModuleSetters(FlowRouter = new Router());                                                // 2
FlowRouter.Router = Router;                                                                        // 3
FlowRouter.Route = Route;                                                                          // 4
                                                                                                   //
                                                                                                   // 6
/////////////////////////////////////////////////////////////////////////////////////////////////////

}},"lib":{"router.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// packages/ostrio_flow-router-extra/lib/router.js                                                 //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
Router.prototype.url = function () {                                                               // 1
  // We need to remove the leading base path, or "/", as it will be inserted                       // 2
  // automatically by `Meteor.absoluteUrl` as documented in:                                       // 3
  // http://docs.meteor.com/#/full/meteor_absoluteurl                                              // 4
  var completePath = this.path.apply(this, arguments);                                             // 5
  var basePath = this._basePath || '/';                                                            // 6
  var pathWithoutBase = completePath.replace(new RegExp('^' + basePath), '');                      // 7
  return Meteor.absoluteUrl(pathWithoutBase);                                                      // 8
};                                                                                                 // 9
                                                                                                   //
Meteor.startup(function () {                                                                       // 11
  Package['kadira:flow-router'] = Package['ostrio:flow-router-extra'];                             // 12
});                                                                                                // 13
/////////////////////////////////////////////////////////////////////////////////////////////////////

}},"node_modules":{"qs":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// ../../.2.12.6.4i0xse++os+web.browser+web.cordova/npm/node_modules/qs/package.json               //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
exports.name = "qs";
exports.version = "6.3.0";
exports.main = "lib/index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// node_modules/meteor/ostrio:flow-router-extra/node_modules/qs/lib/index.js                       //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
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

/////////////////////////////////////////////////////////////////////////////////////////////////////

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
