(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var meteorInstall = Package['modules-runtime'].meteorInstall;

var require = meteorInstall({"node_modules":{"meteor":{"modules":{"server.js":function(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// packages/modules/server.js                                                                         //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
require("./install-packages.js");
require("./process.js");
require("./reify.js");

////////////////////////////////////////////////////////////////////////////////////////////////////////

},"install-packages.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// packages/modules/install-packages.js                                                               //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
function install(name, mainModule) {
  var meteorDir = {};

  // Given a package name <name>, install a stub module in the
  // /node_modules/meteor directory called <name>.js, so that
  // require.resolve("meteor/<name>") will always return
  // /node_modules/meteor/<name>.js instead of something like
  // /node_modules/meteor/<name>/index.js, in the rare but possible event
  // that the package contains a file called index.js (#6590).

  if (typeof mainModule === "string") {
    // Set up an alias from /node_modules/meteor/<package>.js to the main
    // module, e.g. meteor/<package>/index.js.
    meteorDir[name + ".js"] = mainModule;
  } else {
    // back compat with old Meteor packages
    meteorDir[name + ".js"] = function (r, e, module) {
      module.exports = Package[name];
    };
  }

  meteorInstall({
    node_modules: {
      meteor: meteorDir
    }
  });
}

// This file will be modified during computeJsOutputFilesMap to include
// install(<name>) calls for every Meteor package.

install("meteor");
install("ecmascript-runtime");
install("modules-runtime");
install("modules", "meteor/modules/server.js");
install("modern-browsers", "meteor/modern-browsers/modern.js");
install("promise", "meteor/promise/server.js");
install("ecmascript-runtime-client", "meteor/ecmascript-runtime-client/versions.js");
install("ecmascript-runtime-server", "meteor/ecmascript-runtime-server/runtime.js");
install("babel-compiler");
install("ecmascript");
install("babel-runtime", "meteor/babel-runtime/babel-runtime.js");
install("fetch", "meteor/fetch/server.js");
install("inter-process-messaging", "meteor/inter-process-messaging/inter-process-messaging.js");
install("dynamic-import", "meteor/dynamic-import/server.js");
install("base64", "meteor/base64/base64.js");
install("ejson", "meteor/ejson/ejson.js");
install("logging", "meteor/logging/logging.js");
install("underscore");
install("routepolicy", "meteor/routepolicy/main.js");
install("boilerplate-generator", "meteor/boilerplate-generator/generator.js");
install("webapp-hashing");
install("webapp", "meteor/webapp/webapp_server.js");
install("check", "meteor/check/match.js");
install("random");
install("tracker");
install("retry", "meteor/retry/retry.js");
install("id-map", "meteor/id-map/id-map.js");
install("callback-hook", "meteor/callback-hook/hook.js");
install("ddp-common");
install("reload");
install("socket-stream-client", "meteor/socket-stream-client/node.js");
install("diff-sequence", "meteor/diff-sequence/diff.js");
install("mongo-id", "meteor/mongo-id/id.js");
install("ddp-client", "meteor/ddp-client/server/server.js");
install("rate-limit", "meteor/rate-limit/rate-limit.js");
install("ddp-rate-limiter");
install("audit-argument-checks");
install("ddp-server");
install("ddp");
install("hot-code-push");
install("livedata");
install("npm-mongo");
install("geojson-utils", "meteor/geojson-utils/main.js");
install("ordered-dict", "meteor/ordered-dict/ordered_dict.js");
install("minimongo", "meteor/minimongo/minimongo_server.js");
install("allow-deny");
install("mongo-decimal", "meteor/mongo-decimal/decimal.js");
install("binary-heap", "meteor/binary-heap/binary-heap.js");
install("mongo");
install("blaze-html-templates");
install("jquery");
install("reactive-var");
install("seba:minifiers-autoprefixer");
install("standard-minifier-js");
install("mrt:filesize");
install("markdown");
install("url", "meteor/url/url_server.js");
install("http", "meteor/http/httpcall_server.js");
install("simple:highlight.js");
install("observe-sequence");
install("deps");
install("htmljs");
install("blaze");
install("mquandalle:jade");
install("fourseven:scss");
install("momentjs:moment");
install("spacebars");
install("templating-compiler");
install("templating-runtime");
install("templating");
install("perak:markdown");
install("meteorhacks:subs-manager");
install("ostrio:cookies", "meteor/ostrio:cookies/cookies.js");
install("ostrio:files", "meteor/ostrio:files/server.js");
install("ostrio:cstorage");
install("ostrio:templatehelpers");
install("staringatlights:inject-data", "meteor/staringatlights:inject-data/lib/namespace.js");
install("meteorhacks:picker");
install("lamhieu:meteorx");
install("accounts-base", "meteor/accounts-base/server_main.js");
install("server-render", "meteor/server-render/server.js");
install("staringatlights:fast-render", "meteor/staringatlights:fast-render/lib/server/namespace.js");
install("reactive-dict", "meteor/reactive-dict/migration.js");
install("ostrio:flow-router-extra", "meteor/ostrio:flow-router-extra/server/_init.js");
install("ostrio:flow-router-title");
install("ostrio:flow-router-meta");
install("ostrio:spiderable-middleware", "meteor/ostrio:spiderable-middleware/lib/index.js");
install("service-configuration");
install("localstorage");
install("oauth");
install("accounts-oauth");
install("oauth2");
install("github-oauth");
install("accounts-github");
install("oauth1");
install("twitter-oauth");
install("accounts-twitter");
install("facebook-oauth");
install("accounts-facebook");
install("meteor-developer-oauth");
install("accounts-meteor-developer");
install("autoupdate", "meteor/autoupdate/autoupdate_server.js");
install("ui");

////////////////////////////////////////////////////////////////////////////////////////////////////////

},"process.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// packages/modules/process.js                                                                        //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
if (! global.process) {
  try {
    // The application can run `npm install process` to provide its own
    // process stub; otherwise this module will provide a partial stub.
    global.process = require("process");
  } catch (missing) {
    global.process = {};
  }
}

var proc = global.process;

if (Meteor.isServer) {
  // Make require("process") work on the server in all versions of Node.
  meteorInstall({
    node_modules: {
      "process.js": function (r, e, module) {
        module.exports = proc;
      }
    }
  });
} else {
  proc.platform = "browser";
  proc.nextTick = proc.nextTick || Meteor._setImmediate;
}

if (typeof proc.env !== "object") {
  proc.env = {};
}

var hasOwn = Object.prototype.hasOwnProperty;
for (var key in meteorEnv) {
  if (hasOwn.call(meteorEnv, key)) {
    proc.env[key] = meteorEnv[key];
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////

},"reify.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// packages/modules/reify.js                                                                          //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
require("reify/lib/runtime").enable(
  module.constructor.prototype
);

////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"reify":{"lib":{"runtime":{"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// node_modules/meteor/modules/node_modules/reify/lib/runtime/index.js                                //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
meteorInstall({"node_modules":{"fs-extra":{"package.json":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// node_modules/fs-extra/package.json                                                                 //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
module.exports = {
  "name": "fs-extra",
  "version": "8.1.0",
  "main": "./lib/index.js"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// node_modules/fs-extra/lib/index.js                                                                 //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"aws-sdk":{"clients":{"s3.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// node_modules/aws-sdk/clients/s3.js                                                                 //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"request":{"package.json":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// node_modules/request/package.json                                                                  //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
module.exports = {
  "name": "request",
  "version": "2.88.0",
  "main": "index.js"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// node_modules/request/index.js                                                                      //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"dropbox":{"package.json":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// node_modules/dropbox/package.json                                                                  //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
module.exports = {
  "name": "dropbox",
  "version": "0.10.3",
  "main": "lib/dropbox.js"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"dropbox.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// node_modules/dropbox/lib/dropbox.js                                                                //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"gm":{"package.json":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// node_modules/gm/package.json                                                                       //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
module.exports = {
  "name": "gm",
  "version": "1.23.1",
  "main": "./index"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// node_modules/gm/index.js                                                                           //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"@babel":{"runtime":{"package.json":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// node_modules/@babel/runtime/package.json                                                           //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////

},"helpers":{"interopRequireDefault.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// node_modules/@babel/runtime/helpers/interopRequireDefault.js                                       //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////

},"objectSpread.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                    //
// node_modules/@babel/runtime/helpers/objectSpread.js                                                //
//                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/modules/server.js");

/* Exports */
Package._define("modules", exports, {
  meteorInstall: meteorInstall
});

})();
