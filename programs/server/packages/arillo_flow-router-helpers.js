(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var check = Package.check.check;
var Match = Package.check.Match;
var _ = Package.underscore._;
var ActiveRoute = Package['zimme:active-route'].ActiveRoute;
var Symbol = Package['ecmascript-runtime'].Symbol;
var Map = Package['ecmascript-runtime'].Map;
var Set = Package['ecmascript-runtime'].Set;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var __coffeescriptShare, FlowRouterHelpers;

(function(){

///////////////////////////////////////////////////////////////////////////////////////
//                                                                                   //
// packages/arillo_flow-router-helpers/client/helpers.coffee.js                      //
//                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////
                                                                                     //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var currentRouteName,                                                                // 2
    currentRouteOption,                                                              // 2
    func,                                                                            // 2
    helpers,                                                                         // 2
    isSubReady,                                                                      // 2
    name,                                                                            // 2
    param,                                                                           // 2
    pathFor,                                                                         // 2
    queryParam,                                                                      // 2
    subsReady,                                                                       // 2
    urlFor,                                                                          // 2
    slice = [].slice,                                                                // 2
    hasProp = {}.hasOwnProperty;                                                     // 2
                                                                                     //
subsReady = function () {                                                            // 2
  var subs;                                                                          // 3
  subs = 1 <= arguments.length ? slice.call(arguments, 0) : [];                      // 2
                                                                                     //
  if (subs.length === 1) {                                                           // 3
    return FlowRouter.subsReady();                                                   // 3
  }                                                                                  // 10
                                                                                     //
  subs = subs.slice(0, subs.length - 1);                                             // 4
  return _.reduce(subs, function (memo, sub) {                                       // 12
    return memo && FlowRouter.subsReady(sub);                                        // 13
  }, true);                                                                          // 5
};                                                                                   // 2
                                                                                     //
pathFor = function (path, view) {                                                    // 10
  var hashBang, query, ref;                                                          // 11
                                                                                     //
  if (view == null) {                                                                // 19
    view = {                                                                         // 10
      hash: {}                                                                       // 10
    };                                                                               // 10
  }                                                                                  // 23
                                                                                     //
  if (!path) {                                                                       // 11
    throw new Error('no path defined');                                              // 11
  }                                                                                  // 26
                                                                                     //
  if (!view.hash) {                                                                  // 13
    view = {                                                                         // 13
      hash: view                                                                     // 13
    };                                                                               // 13
  }                                                                                  // 31
                                                                                     //
  if (((ref = path.hash) != null ? ref.route : void 0) != null) {                    // 14
    view = path;                                                                     // 15
    path = view.hash.route;                                                          // 16
    delete view.hash.route;                                                          // 17
  }                                                                                  // 36
                                                                                     //
  query = view.hash.query ? FlowRouter._qs.parse(view.hash.query) : {};              // 18
  hashBang = view.hash.hash ? view.hash.hash : '';                                   // 19
  return FlowRouter.path(path, view.hash, query) + (hashBang ? "#" + hashBang : '');
};                                                                                   // 10
                                                                                     //
urlFor = function (path, view) {                                                     // 23
  var relativePath;                                                                  // 24
  relativePath = pathFor(path, view);                                                // 24
  return Meteor.absoluteUrl(relativePath.substr(1));                                 // 45
};                                                                                   // 23
                                                                                     //
param = function (name) {                                                            // 28
  return FlowRouter.getParam(name);                                                  // 49
};                                                                                   // 28
                                                                                     //
queryParam = function (key) {                                                        // 32
  return FlowRouter.getQueryParam(key);                                              // 53
};                                                                                   // 32
                                                                                     //
currentRouteName = function () {                                                     // 36
  return FlowRouter.getRouteName();                                                  // 57
};                                                                                   // 36
                                                                                     //
currentRouteOption = function (optionName) {                                         // 40
  return FlowRouter.current().route.options[optionName];                             // 61
};                                                                                   // 40
                                                                                     //
isSubReady = function (sub) {                                                        // 44
  if (sub) {                                                                         // 45
    return FlowRouter.subsReady(sub);                                                // 45
  }                                                                                  // 67
                                                                                     //
  return FlowRouter.subsReady();                                                     // 46
};                                                                                   // 44
                                                                                     //
helpers = {                                                                          // 48
  subsReady: subsReady,                                                              // 49
  pathFor: pathFor,                                                                  // 50
  urlFor: urlFor,                                                                    // 51
  param: param,                                                                      // 52
  queryParam: queryParam,                                                            // 53
  currentRouteName: currentRouteName,                                                // 54
  isSubReady: isSubReady,                                                            // 55
  currentRouteOption: currentRouteOption                                             // 56
};                                                                                   // 49
                                                                                     //
if (Meteor.isClient) {                                                               // 58
  for (name in meteorBabelHelpers.sanitizeForInObject(helpers)) {                    // 59
    if (!hasProp.call(helpers, name)) continue;                                      // 84
    func = helpers[name];                                                            // 85
    Template.registerHelper(name, func);                                             // 59
  }                                                                                  // 58
}                                                                                    // 88
                                                                                     //
if (Meteor.isServer) {                                                               // 61
  FlowRouterHelpers = {                                                              // 62
    pathFor: pathFor,                                                                // 63
    urlFor: urlFor                                                                   // 64
  };                                                                                 // 63
}                                                                                    // 95
///////////////////////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['arillo:flow-router-helpers'] = {}, {
  FlowRouterHelpers: FlowRouterHelpers
});

})();

//# sourceMappingURL=arillo_flow-router-helpers.js.map
