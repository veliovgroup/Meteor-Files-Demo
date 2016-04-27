(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var _ = Package.underscore._;
var meteorInstall = Package['modules-runtime'].meteorInstall;

/* Package-scope variables */
var Buffer, process;

var require = meteorInstall({"node_modules":{"meteor":{"modules":{"server.js":["./install-packages.js","./buffer.js","./process.js",function(require){

////////////////////////////////////////////////////////////////////////////
//                                                                        //
// packages/modules/server.js                                             //
//                                                                        //
////////////////////////////////////////////////////////////////////////////
                                                                          //
require("./install-packages.js");
require("./buffer.js");
require("./process.js");

////////////////////////////////////////////////////////////////////////////

}],"buffer.js":["buffer",function(require){

////////////////////////////////////////////////////////////////////////////
//                                                                        //
// packages/modules/buffer.js                                             //
//                                                                        //
////////////////////////////////////////////////////////////////////////////
                                                                          //
try {
  Buffer = global.Buffer || require("buffer").Buffer;
} catch (noBuffer) {}

////////////////////////////////////////////////////////////////////////////

}],"install-packages.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////
//                                                                        //
// packages/modules/install-packages.js                                   //
//                                                                        //
////////////////////////////////////////////////////////////////////////////
                                                                          //
function install(name) {
  var meteorDir = {};

  // Given a package name <name>, install a stub module in the
  // /node_modules/meteor directory called <name>.js, so that
  // require.resolve("meteor/<name>") will always return
  // /node_modules/meteor/<name>.js instead of something like
  // /node_modules/meteor/<name>/index.js, in the rare but possible event
  // that the package contains a file called index.js (#6590).
  meteorDir[name + ".js"] = function (r, e, module) {
    module.exports = Package[name];
  };

  meteorInstall({
    node_modules: {
      meteor: meteorDir
    }
  });
}

// This file will be modified during computeJsOutputFilesMap to include
// install(<name>) calls for every Meteor package.

install("underscore");
install("meteor");
install("meteor-base");
install("mobile-experience");
install("npm-mongo");
install("babel-compiler");
install("ecmascript");
install("base64");
install("ejson");
install("id-map");
install("ordered-dict");
install("tracker");
install("modules-runtime");
install("modules");
install("promise");
install("ecmascript-runtime");
install("babel-runtime");
install("random");
install("mongo-id");
install("diff-sequence");
install("geojson-utils");
install("minimongo");
install("check");
install("retry");
install("ddp-common");
install("ddp-client");
install("logging");
install("routepolicy");
install("deps");
install("htmljs");
install("html-tools");
install("blaze-tools");
install("spacebars-compiler");
install("jquery");
install("observe-sequence");
install("reactive-var");
install("blaze");
install("spacebars");
install("ui");
install("boilerplate-generator");
install("webapp-hashing");
install("webapp");
install("audit-argument-checks");
install("callback-hook");
install("ddp-server");
install("ddp");
install("allow-deny");
install("binary-heap");
install("mongo");
install("blaze-html-templates");
install("session");
install("fourseven:scss");
install("mquandalle:jade");
install("coffeescript");
install("templating");
install("iron:core");
install("iron:dynamic-template");
install("iron:layout");
install("iron:url");
install("iron:middleware-stack");
install("iron:location");
install("reactive-dict");
install("iron:controller");
install("iron:router");
install("sha");
install("ostrio:cookies");
install("ostrio:files");
install("ostrio:iron-router-title");
install("meteorhacks:subs-manager");
install("aldeed:simple-schema");
install("raix:eventemitter");
install("aldeed:collection2-core");
install("aldeed:schema-index");
install("aldeed:schema-deny");
install("aldeed:collection2");
install("momentjs:moment");
install("ostrio:templatehelpers");
install("twbs:bootstrap");
install("fortawesome:fontawesome");
install("mrt:filesize");
install("standard-minifier-css");
install("standard-minifier-js");
install("markdown");
install("perak:markdown");
install("simple:highlight.js");
install("livedata");
install("hot-code-push");
install("launch-screen");
install("autoupdate");
install("reload");
install("mdg:validation-error");

////////////////////////////////////////////////////////////////////////////

},"process.js":["process",function(require,exports,module){

////////////////////////////////////////////////////////////////////////////
//                                                                        //
// packages/modules/process.js                                            //
//                                                                        //
////////////////////////////////////////////////////////////////////////////
                                                                          //
try {
  // The application can run `npm install process` to provide its own
  // process stub; otherwise this module will provide a partial stub.
  process = global.process || require("process");
} catch (noProcess) {
  process = {};
}

if (Meteor.isServer) {
  // Make require("process") work on the server in all versions of Node.
  meteorInstall({
    node_modules: {
      "process.js": function (r, e, module) {
        module.exports = process;
      }
    }
  });
} else {
  process.platform = "browser";
  process.nextTick = process.nextTick || Meteor._setImmediate;
}

if (typeof process.env !== "object") {
  process.env = {};
}

_.extend(process.env, meteorEnv);

////////////////////////////////////////////////////////////////////////////

}]}}}},{"extensions":[".js",".json"]});
var exports = require("./node_modules/meteor/modules/server.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package.modules = exports, {
  meteorInstall: meteorInstall,
  Buffer: Buffer,
  process: process
});

})();

//# sourceMappingURL=modules.js.map
