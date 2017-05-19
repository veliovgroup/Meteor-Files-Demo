(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var meteorInstall = Package.modules.meteorInstall;
var Buffer = Package.modules.Buffer;
var process = Package.modules.process;
var ECMAScript = Package.ecmascript.ECMAScript;
var Blaze = Package.blaze.Blaze;
var UI = Package.blaze.UI;
var Handlebars = Package.blaze.Handlebars;
var _ = Package.underscore._;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var ReactiveDict = Package['reactive-dict'].ReactiveDict;
var ReactiveVar = Package['reactive-var'].ReactiveVar;
var EJSON = Package.ejson.EJSON;
var Symbol = Package['ecmascript-runtime'].Symbol;
var Map = Package['ecmascript-runtime'].Map;
var Set = Package['ecmascript-runtime'].Set;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var HTML = Package.htmljs.HTML;

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:flow-router-extra":{"server":{"_init.js":["./router.js","./route.js","./group.js",function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// packages/ostrio_flow-router-extra/server/_init.js                                              //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                  //
module.export({                                                                                   // 1
  FlowRouter: function () {                                                                       // 1
    return FlowRouter;                                                                            // 1
  },                                                                                              // 1
  Router: function () {                                                                           // 1
    return Router;                                                                                // 1
  },                                                                                              // 1
  Route: function () {                                                                            // 1
    return Route;                                                                                 // 1
  },                                                                                              // 1
  Group: function () {                                                                            // 1
    return Group;                                                                                 // 1
  },                                                                                              // 1
  Triggers: function () {                                                                         // 1
    return Triggers;                                                                              // 1
  },                                                                                              // 1
  BlazeRenderer: function () {                                                                    // 1
    return BlazeRenderer;                                                                         // 1
  }                                                                                               // 1
});                                                                                               // 1
var Router = void 0;                                                                              // 1
module.importSync("./router.js", {                                                                // 1
  "default": function (v) {                                                                       // 1
    Router = v;                                                                                   // 1
  }                                                                                               // 1
}, 0);                                                                                            // 1
var Route = void 0;                                                                               // 1
module.importSync("./route.js", {                                                                 // 1
  "default": function (v) {                                                                       // 1
    Route = v;                                                                                    // 1
  }                                                                                               // 1
}, 1);                                                                                            // 1
var Group = void 0;                                                                               // 1
module.importSync("./group.js", {                                                                 // 1
  "default": function (v) {                                                                       // 1
    Group = v;                                                                                    // 1
  }                                                                                               // 1
}, 2);                                                                                            // 1
var Triggers = {};                                                                                // 5
var BlazeRenderer = {};                                                                           // 6
var FlowRouter = new Router();                                                                    // 8
FlowRouter.Router = Router;                                                                       // 9
FlowRouter.Route = Route;                                                                         // 10
////////////////////////////////////////////////////////////////////////////////////////////////////

}],"group.js":["babel-runtime/helpers/classCallCheck","meteor/underscore",function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// packages/ostrio_flow-router-extra/server/group.js                                              //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                  //
var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");                           //
                                                                                                  //
var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);                                  //
                                                                                                  //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
                                                                                                  //
var _ = void 0;                                                                                   // 1
                                                                                                  //
module.importSync("meteor/underscore", {                                                          // 1
  _: function (v) {                                                                               // 1
    _ = v;                                                                                        // 1
  }                                                                                               // 1
}, 0);                                                                                            // 1
                                                                                                  //
var makeTriggers = function (base, _triggers) {                                                   // 3
  var triggers = _triggers || [];                                                                 // 4
                                                                                                  //
  if (triggers) {                                                                                 // 5
    if (!_.isArray(triggers)) {                                                                   // 6
      triggers = [triggers];                                                                      // 7
    }                                                                                             // 8
  }                                                                                               // 9
                                                                                                  //
  return (base || []).concat(triggers);                                                           // 11
};                                                                                                // 12
                                                                                                  //
var Group = function () {                                                                         //
  function Group(router) {                                                                        // 15
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};         // 15
    var parent = arguments[2];                                                                    // 15
    (0, _classCallCheck3.default)(this, Group);                                                   // 15
                                                                                                  //
    if (options.prefix && !/^\/.*/.test(options.prefix)) {                                        // 16
      throw new Error('group\'s prefix must start with "/"');                                     // 17
    }                                                                                             // 18
                                                                                                  //
    this._router = router;                                                                        // 20
    this.prefix = options.prefix || '';                                                           // 21
    this.name = options.name;                                                                     // 22
    this.options = options;                                                                       // 23
    this._triggersEnter = makeTriggers(this._triggersEnter, options.triggersEnter);               // 25
    this._triggersExit = makeTriggers(this._triggersExit, options.triggersExit);                  // 26
    this.parent = parent;                                                                         // 28
                                                                                                  //
    if (this.parent) {                                                                            // 29
      this.prefix = parent.prefix + this.prefix;                                                  // 30
      this._triggersEnter = makeTriggers(this._triggersEnter, parent.triggersEnter);              // 32
      this._triggersExit = makeTriggers(this._triggersExit, parent.triggersExit);                 // 33
    }                                                                                             // 34
  }                                                                                               // 35
                                                                                                  //
  Group.prototype.route = function () {                                                           //
    function route(_pathDef) {                                                                    //
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};       // 37
      var _group = arguments[2];                                                                  // 37
                                                                                                  //
      if (!/^\/.*/.test(_pathDef)) {                                                              // 38
        throw new Error('route\'s path must start with "/"');                                     // 39
      }                                                                                           // 40
                                                                                                  //
      var group = _group || this;                                                                 // 42
      var pathDef = this.prefix + _pathDef;                                                       // 43
      options.triggersEnter = makeTriggers(this._triggersEnter, options.triggersEnter);           // 45
      options.triggersExit = makeTriggers(this._triggersExit, options.triggersExit);              // 46
      return this._router.route(pathDef, options, group);                                         // 48
    }                                                                                             // 49
                                                                                                  //
    return route;                                                                                 //
  }();                                                                                            //
                                                                                                  //
  Group.prototype.group = function () {                                                           //
    function group(options) {                                                                     //
      var group = new Group(this._router, options, this);                                         // 52
      group.parent = this;                                                                        // 53
      return group;                                                                               // 55
    }                                                                                             // 56
                                                                                                  //
    return group;                                                                                 //
  }();                                                                                            //
                                                                                                  //
  return Group;                                                                                   //
}();                                                                                              //
                                                                                                  //
module.export("default", exports.default = Group);                                                // 1
////////////////////////////////////////////////////////////////////////////////////////////////////

}],"route.js":["babel-runtime/helpers/classCallCheck",function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// packages/ostrio_flow-router-extra/server/route.js                                              //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                  //
var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");                           //
                                                                                                  //
var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);                                  //
                                                                                                  //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
                                                                                                  //
var Route = function () {                                                                         //
  function Route(router, pathDef) {                                                               // 2
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};         // 2
    (0, _classCallCheck3.default)(this, Route);                                                   // 2
    this.options = options;                                                                       // 3
    this.name = options.name;                                                                     // 4
    this.pathDef = pathDef; // Route.path is deprecated and will be removed in 3.0                // 5
                                                                                                  //
    this.path = pathDef;                                                                          // 8
    this.action = options.action || Function.prototype;                                           // 10
    this.subscriptions = options.subscriptions || Function.prototype;                             // 11
    this._subsMap = {};                                                                           // 12
  }                                                                                               // 13
                                                                                                  //
  Route.prototype.register = function () {                                                        //
    function register(name, sub) {                                                                //
      this._subsMap[name] = sub;                                                                  // 17
    }                                                                                             // 18
                                                                                                  //
    return register;                                                                              //
  }();                                                                                            //
                                                                                                  //
  Route.prototype.subscription = function () {                                                    //
    function subscription(name) {                                                                 //
      return this._subsMap[name];                                                                 // 22
    }                                                                                             // 23
                                                                                                  //
    return subscription;                                                                          //
  }();                                                                                            //
                                                                                                  //
  Route.prototype.middleware = function () {                                                      //
    function middleware() {// ?                                                                   //
    }                                                                                             // 28
                                                                                                  //
    return middleware;                                                                            //
  }();                                                                                            //
                                                                                                  //
  return Route;                                                                                   //
}();                                                                                              //
                                                                                                  //
module.export("default", exports.default = Route);                                                // 1
////////////////////////////////////////////////////////////////////////////////////////////////////

}],"router.js":["babel-runtime/helpers/classCallCheck","meteor/underscore","./route.js","./group.js","meteor/meteor","qs",function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// packages/ostrio_flow-router-extra/server/router.js                                             //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                  //
var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");                           //
                                                                                                  //
var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);                                  //
                                                                                                  //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
                                                                                                  //
var _ = void 0;                                                                                   // 1
                                                                                                  //
module.importSync("meteor/underscore", {                                                          // 1
  _: function (v) {                                                                               // 1
    _ = v;                                                                                        // 1
  }                                                                                               // 1
}, 0);                                                                                            // 1
var Route = void 0;                                                                               // 1
module.importSync("./route.js", {                                                                 // 1
  "default": function (v) {                                                                       // 1
    Route = v;                                                                                    // 1
  }                                                                                               // 1
}, 1);                                                                                            // 1
var Group = void 0;                                                                               // 1
module.importSync("./group.js", {                                                                 // 1
  "default": function (v) {                                                                       // 1
    Group = v;                                                                                    // 1
  }                                                                                               // 1
}, 2);                                                                                            // 1
var Meteor = void 0;                                                                              // 1
module.importSync("meteor/meteor", {                                                              // 1
  Meteor: function (v) {                                                                          // 1
    Meteor = v;                                                                                   // 1
  }                                                                                               // 1
}, 3);                                                                                            // 1
                                                                                                  //
var qs = require('qs');                                                                           // 6
                                                                                                  //
var pathRegExp = /(:[\w\(\)\\\+\*\.\?\[\]\-]+)+/g;                                                // 7
                                                                                                  //
var Router = function () {                                                                        //
  function Router() {                                                                             // 10
    (0, _classCallCheck3.default)(this, Router);                                                  // 10
    this._routes = [];                                                                            // 11
    this._routesMap = {};                                                                         // 12
    this.subscriptions = Function.prototype; // holds onRoute callbacks                           // 13
                                                                                                  //
    this._onRouteCallbacks = [];                                                                  // 16
    this.triggers = {                                                                             // 18
      enter: function () {// client only                                                          // 19
      },                                                                                          // 21
      exit: function () {// client only                                                           // 22
      }                                                                                           // 24
    };                                                                                            // 18
  }                                                                                               // 26
                                                                                                  //
  Router.prototype.route = function () {                                                          //
    function route(pathDef) {                                                                     //
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};       // 28
                                                                                                  //
      if (!/^\/.*/.test(pathDef)) {                                                               // 29
        throw new Error('route\'s path must start with "/"');                                     // 30
      }                                                                                           // 31
                                                                                                  //
      var route = new Route(this, pathDef, options);                                              // 33
                                                                                                  //
      this._routes.push(route);                                                                   // 34
                                                                                                  //
      if (options.name) {                                                                         // 36
        this._routesMap[options.name] = route;                                                    // 37
      }                                                                                           // 38
                                                                                                  //
      this._triggerRouteRegister(route);                                                          // 40
                                                                                                  //
      return route;                                                                               // 41
    }                                                                                             // 42
                                                                                                  //
    return route;                                                                                 //
  }();                                                                                            //
                                                                                                  //
  Router.prototype.group = function () {                                                          //
    function group(options) {                                                                     //
      return new Group(this, options);                                                            // 45
    }                                                                                             // 46
                                                                                                  //
    return group;                                                                                 //
  }();                                                                                            //
                                                                                                  //
  Router.prototype.path = function () {                                                           //
    function path(pathDef) {                                                                      //
      var fields = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};        // 48
      var queryParams = arguments[2];                                                             // 48
                                                                                                  //
      if (this._routesMap[pathDef]) {                                                             // 49
        pathDef = this._routesMap[pathDef].path;                                                  // 50
      }                                                                                           // 51
                                                                                                  //
      var path = pathDef.replace(pathRegExp, function (key) {                                     // 53
        var firstRegexpChar = key.indexOf('('); // get the content behind : and (\\d+/)           // 54
                                                                                                  //
        key = key.substring(1, firstRegexpChar > 0 ? firstRegexpChar : undefined); // remove +?*  // 56
                                                                                                  //
        key = key.replace(/[\+\*\?]+/g, '');                                                      // 58
        return fields[key] || '';                                                                 // 60
      });                                                                                         // 61
      path = path.replace(/\/\/+/g, '/'); // Replace multiple slashes with single slash           // 63
      // remove trailing slash                                                                    // 65
      // but keep the root slash if it's the only one                                             // 66
                                                                                                  //
      path = path.match(/^\/{1}$/) ? path : path.replace(/\/$/, '');                              // 67
      var strQueryParams = qs.stringify(queryParams || {});                                       // 69
                                                                                                  //
      if (strQueryParams) {                                                                       // 70
        path += '?' + strQueryParams;                                                             // 71
      }                                                                                           // 72
                                                                                                  //
      return path;                                                                                // 74
    }                                                                                             // 75
                                                                                                  //
    return path;                                                                                  //
  }();                                                                                            //
                                                                                                  //
  Router.prototype.onRouteRegister = function () {                                                //
    function onRouteRegister(cb) {                                                                //
      this._onRouteCallbacks.push(cb);                                                            // 78
    }                                                                                             // 79
                                                                                                  //
    return onRouteRegister;                                                                       //
  }();                                                                                            //
                                                                                                  //
  Router.prototype._triggerRouteRegister = function () {                                          //
    function _triggerRouteRegister(currentRoute) {                                                //
      // We should only need to send a safe set of fields on the route                            // 82
      // object.                                                                                  // 83
      // This is not to hide what's inside the route object, but to show                          // 84
      // these are the public APIs                                                                // 85
      var routePublicApi = _.pick(currentRoute, 'name', 'pathDef', 'path');                       // 86
                                                                                                  //
      routePublicApi.options = _.omit(currentRoute.options, ['triggersEnter', 'triggersExit', 'action', 'subscriptions', 'name']);
                                                                                                  //
      _.each(this._onRouteCallbacks, function (cb) {                                              // 89
        cb(routePublicApi);                                                                       // 90
      });                                                                                         // 91
    }                                                                                             // 92
                                                                                                  //
    return _triggerRouteRegister;                                                                 //
  }();                                                                                            //
                                                                                                  //
  Router.prototype.go = function () {                                                             //
    function go() {// client only                                                                 //
    }                                                                                             // 97
                                                                                                  //
    return go;                                                                                    //
  }();                                                                                            //
                                                                                                  //
  Router.prototype.current = function () {                                                        //
    function current() {// client only                                                            //
    }                                                                                             // 102
                                                                                                  //
    return current;                                                                               //
  }();                                                                                            //
                                                                                                  //
  Router.prototype.middleware = function () {                                                     //
    function middleware() {// client only                                                         //
    }                                                                                             // 106
                                                                                                  //
    return middleware;                                                                            //
  }();                                                                                            //
                                                                                                  //
  Router.prototype.getState = function () {                                                       //
    function getState() {// client only                                                           //
    }                                                                                             // 111
                                                                                                  //
    return getState;                                                                              //
  }();                                                                                            //
                                                                                                  //
  Router.prototype.getAllStates = function () {                                                   //
    function getAllStates() {// client only                                                       //
    }                                                                                             // 116
                                                                                                  //
    return getAllStates;                                                                          //
  }();                                                                                            //
                                                                                                  //
  Router.prototype.setState = function () {                                                       //
    function setState() {// client only                                                           //
    }                                                                                             // 121
                                                                                                  //
    return setState;                                                                              //
  }();                                                                                            //
                                                                                                  //
  Router.prototype.removeState = function () {                                                    //
    function removeState() {// client only                                                        //
    }                                                                                             // 126
                                                                                                  //
    return removeState;                                                                           //
  }();                                                                                            //
                                                                                                  //
  Router.prototype.clearStates = function () {                                                    //
    function clearStates() {// client only                                                        //
    }                                                                                             // 131
                                                                                                  //
    return clearStates;                                                                           //
  }();                                                                                            //
                                                                                                  //
  Router.prototype.ready = function () {                                                          //
    function ready() {// client only                                                              //
    }                                                                                             // 136
                                                                                                  //
    return ready;                                                                                 //
  }();                                                                                            //
                                                                                                  //
  Router.prototype.initialize = function () {                                                     //
    function initialize() {// client only                                                         //
    }                                                                                             // 141
                                                                                                  //
    return initialize;                                                                            //
  }();                                                                                            //
                                                                                                  //
  Router.prototype.wait = function () {                                                           //
    function wait() {// client only                                                               //
    }                                                                                             // 145
                                                                                                  //
    return wait;                                                                                  //
  }();                                                                                            //
                                                                                                  //
  Router.prototype.url = function () {                                                            //
    function url() {                                                                              //
      // We need to remove the leading base path, or "/", as it will be inserted                  // 148
      // automatically by `Meteor.absoluteUrl` as documented in:                                  // 149
      // http://docs.meteor.com/#/full/meteor_absoluteurl                                         // 150
      return Meteor.absoluteUrl(this.path.apply(this, arguments).replace(new RegExp('^' + ('/' + (this._basePath || '') + '/').replace(/\/\/+/g, '/')), ''));
    }                                                                                             // 152
                                                                                                  //
    return url;                                                                                   //
  }();                                                                                            //
                                                                                                  //
  return Router;                                                                                  //
}();                                                                                              //
                                                                                                  //
module.export("default", exports.default = Router);                                               // 1
////////////////////////////////////////////////////////////////////////////////////////////////////

}]},"node_modules":{"qs":{"package.json":function(require,exports){

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// ../../.3.1.1.1jlmbkc++os+web.browser+web.cordova/npm/node_modules/qs/package.json              //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                  //
exports.name = "qs";
exports.version = "6.4.0";
exports.main = "lib/index.js";

////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// node_modules/meteor/ostrio_flow-router-extra/node_modules/qs/lib/index.js                      //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////
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

////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}}},{"extensions":[".js",".json"]});
var exports = require("./node_modules/meteor/ostrio:flow-router-extra/server/_init.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['ostrio:flow-router-extra'] = exports;

})();

//# sourceMappingURL=ostrio_flow-router-extra.js.map
