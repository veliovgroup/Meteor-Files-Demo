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
var currentRouteName, currentRouteOption, func, helpers, isSubReady, name, param, pathFor, queryParam, subsReady, urlFor,                   
  slice = [].slice,                                                                  //
  hasProp = {}.hasOwnProperty;                                                       //
                                                                                     //
subsReady = function() {                                                             // 2
  var subs;                                                                          // 3
  subs = 1 <= arguments.length ? slice.call(arguments, 0) : [];                      //
  if (subs.length === 1) {                                                           //
    return FlowRouter.subsReady();                                                   // 3
  }                                                                                  //
  subs = subs.slice(0, subs.length - 1);                                             //
  return _.reduce(subs, function(memo, sub) {                                        //
    return memo && FlowRouter.subsReady(sub);                                        //
  }, true);                                                                          //
};                                                                                   // 2
                                                                                     //
pathFor = function(path, view) {                                                     // 10
  var hashBang, query, ref;                                                          // 11
  if (view == null) {                                                                //
    view = {                                                                         //
      hash: {}                                                                       //
    };                                                                               //
  }                                                                                  //
  if (!path) {                                                                       //
    throw new Error('no path defined');                                              // 11
  }                                                                                  //
  if (!view.hash) {                                                                  //
    view = {                                                                         //
      hash: view                                                                     //
    };                                                                               //
  }                                                                                  //
  if (((ref = path.hash) != null ? ref.route : void 0) != null) {                    //
    view = path;                                                                     //
    path = view.hash.route;                                                          //
    delete view.hash.route;                                                          //
  }                                                                                  //
  query = view.hash.query ? FlowRouter._qs.parse(view.hash.query) : {};              //
  hashBang = view.hash.hash ? view.hash.hash : '';                                   //
  return FlowRouter.path(path, view.hash, query) + (hashBang ? "#" + hashBang : '');
};                                                                                   // 10
                                                                                     //
urlFor = function(path, view) {                                                      // 23
  var relativePath;                                                                  // 24
  relativePath = pathFor(path, view);                                                //
  return Meteor.absoluteUrl(relativePath.substr(1));                                 //
};                                                                                   // 23
                                                                                     //
param = function(name) {                                                             // 28
  return FlowRouter.getParam(name);                                                  //
};                                                                                   // 28
                                                                                     //
queryParam = function(key) {                                                         // 32
  return FlowRouter.getQueryParam(key);                                              //
};                                                                                   // 32
                                                                                     //
currentRouteName = function() {                                                      // 36
  return FlowRouter.getRouteName();                                                  //
};                                                                                   // 36
                                                                                     //
currentRouteOption = function(optionName) {                                          // 40
  return FlowRouter.current().route.options[optionName];                             //
};                                                                                   // 40
                                                                                     //
isSubReady = function(sub) {                                                         // 44
  if (sub) {                                                                         //
    return FlowRouter.subsReady(sub);                                                // 45
  }                                                                                  //
  return FlowRouter.subsReady();                                                     // 46
};                                                                                   // 44
                                                                                     //
helpers = {                                                                          // 48
  subsReady: subsReady,                                                              //
  pathFor: pathFor,                                                                  //
  urlFor: urlFor,                                                                    //
  param: param,                                                                      //
  queryParam: queryParam,                                                            //
  currentRouteName: currentRouteName,                                                //
  isSubReady: isSubReady,                                                            //
  currentRouteOption: currentRouteOption                                             //
};                                                                                   //
                                                                                     //
if (Meteor.isClient) {                                                               // 58
  for (name in helpers) {                                                            // 59
    if (!hasProp.call(helpers, name)) continue;                                      //
    func = helpers[name];                                                            //
    Template.registerHelper(name, func);                                             //
  }                                                                                  // 59
}                                                                                    //
                                                                                     //
if (Meteor.isServer) {                                                               // 61
  FlowRouterHelpers = {                                                              //
    pathFor: pathFor,                                                                //
    urlFor: urlFor                                                                   //
  };                                                                                 //
}                                                                                    //
                                                                                     //
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
