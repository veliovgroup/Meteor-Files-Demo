(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"server-render":{"server.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// packages/server-render/server.js                                                                //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
module.export({
  onPageLoad: () => onPageLoad
});
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
module.watch(require("./server-register.js"));
const startupPromise = new Promise(Meteor.startup);
const pageLoadCallbacks = new Set();

function onPageLoad(callback) {
  if (typeof callback === "function") {
    pageLoadCallbacks.add(callback);
  } // Return the callback so that it can be more easily removed later.


  return callback;
}

onPageLoad.remove = function (callback) {
  pageLoadCallbacks.delete(callback);
};

onPageLoad.clear = function () {
  pageLoadCallbacks.clear();
};

onPageLoad.chain = function (handler) {
  return startupPromise.then(() => {
    let promise = Promise.resolve();
    pageLoadCallbacks.forEach(callback => {
      promise = promise.then(() => handler(callback));
    });
    return promise;
  });
};
/////////////////////////////////////////////////////////////////////////////////////////////////////

},"server-register.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// packages/server-render/server-register.js                                                       //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
let WebAppInternals;
module.watch(require("meteor/webapp"), {
  WebAppInternals(v) {
    WebAppInternals = v;
  }

}, 0);
let MagicString;
module.watch(require("magic-string"), {
  default(v) {
    MagicString = v;
  }

}, 1);
let SAXParser;
module.watch(require("parse5"), {
  SAXParser(v) {
    SAXParser = v;
  }

}, 2);
let createStream;
module.watch(require("combined-stream2"), {
  create(v) {
    createStream = v;
  }

}, 3);
let ServerSink, isReadable;
module.watch(require("./server-sink.js"), {
  ServerSink(v) {
    ServerSink = v;
  },

  isReadable(v) {
    isReadable = v;
  }

}, 4);
let onPageLoad;
module.watch(require("./server.js"), {
  onPageLoad(v) {
    onPageLoad = v;
  }

}, 5);
WebAppInternals.registerBoilerplateDataCallback("meteor/server-render", (request, data, arch) => {
  const sink = new ServerSink(request, arch);
  return onPageLoad.chain(callback => callback(sink, request)).then(() => {
    if (!sink.maybeMadeChanges) {
      return false;
    }

    let reallyMadeChanges = false;

    function rewrite(property) {
      const html = data[property];

      if (typeof html !== "string") {
        return;
      }

      const magic = new MagicString(html);
      const parser = new SAXParser({
        locationInfo: true
      });
      data[property] = parser;

      if (Object.keys(sink.htmlById).length) {
        const stream = createStream();
        let lastStart = magic.start;
        parser.on("startTag", (name, attrs, selfClosing, loc) => {
          attrs.some(attr => {
            if (attr.name === "id") {
              let html = sink.htmlById[attr.value];

              if (html) {
                reallyMadeChanges = true;
                const start = magic.slice(lastStart, loc.endOffset);
                stream.append(Buffer.from(start, "utf8"));
                stream.append(typeof html === "string" ? Buffer.from(html, "utf8") : html);
                lastStart = loc.endOffset;
              }

              return true;
            }
          });
        });
        parser.on("endTag", (name, location) => {
          if (location.endOffset === html.length) {
            // reached the end of the template
            const end = magic.slice(lastStart);
            stream.append(Buffer.from(end, "utf8"));
          }
        });
        data[property] = stream;
      }

      parser.write(html, parser.end.bind(parser));
    }

    if (sink.head) {
      data.dynamicHead = (data.dynamicHead || "") + sink.head;
      reallyMadeChanges = true;
    }

    if (Object.keys(sink.htmlById).length > 0) {
      // We don't currently allow injecting HTML into the <head> except
      // by calling sink.appendHead(html).
      rewrite("body");
      rewrite("dynamicBody");
    }

    if (sink.body) {
      data.dynamicBody = (data.dynamicBody || "") + sink.body;
      reallyMadeChanges = true;
    }

    if (sink.statusCode) {
      data.statusCode = sink.statusCode;
      reallyMadeChanges = true;
    }

    if (Object.keys(sink.responseHeaders)) {
      data.headers = sink.responseHeaders;
      reallyMadeChanges = true;
    }

    return reallyMadeChanges;
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////

},"server-sink.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// packages/server-render/server-sink.js                                                           //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
module.export({
  ServerSink: () => ServerSink,
  isReadable: () => isReadable
});

class ServerSink {
  constructor(request, arch) {
    this.request = request;
    this.arch = arch;
    this.head = "";
    this.body = "";
    this.htmlById = Object.create(null);
    this.maybeMadeChanges = false;
    this.statusCode = null;
    this.responseHeaders = {};
  }

  appendToHead(html) {
    if (appendContent(this, "head", html)) {
      this.maybeMadeChanges = true;
    }
  }

  appendToBody(html) {
    if (appendContent(this, "body", html)) {
      this.maybeMadeChanges = true;
    }
  }

  appendToElementById(id, html) {
    if (appendContent(this.htmlById, id, html)) {
      this.maybeMadeChanges = true;
    }
  }

  renderIntoElementById(id, html) {
    this.htmlById[id] = "";
    this.appendToElementById(id, html);
  }

  redirect(location, code = 301) {
    this.maybeMadeChanges = true;
    this.statusCode = code;
    this.responseHeaders.Location = location;
  } // server only methods


  setStatusCode(code) {
    this.maybeMadeChanges = true;
    this.statusCode = code;
  }

  setHeader(key, value) {
    this.maybeMadeChanges = true;
    this.responseHeaders[key] = value;
  }

  getHeaders() {
    return this.request.headers;
  }

  getCookies() {
    return this.request.cookies;
  }

}

function isReadable(stream) {
  return stream !== null && typeof stream === 'object' && typeof stream.pipe === 'function' && stream.readable !== false && typeof stream._read === 'function' && typeof stream._readableState === 'object';
}

function appendContent(object, property, content) {
  let madeChanges = false;

  if (Array.isArray(content)) {
    content.forEach(elem => {
      if (appendContent(object, property, elem)) {
        madeChanges = true;
      }
    });
  } else if (isReadable(content)) {
    object[property] = content;
    madeChanges = true;
  } else if (content = content && content.toString("utf8")) {
    object[property] = (object[property] || "") + content;
    madeChanges = true;
  }

  return madeChanges;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"magic-string":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// node_modules/meteor/server-render/node_modules/magic-string/package.json                        //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
exports.name = "magic-string";
exports.version = "0.21.3";
exports.main = "dist/magic-string.cjs.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////

},"dist":{"magic-string.cjs.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// node_modules/meteor/server-render/node_modules/magic-string/dist/magic-string.cjs.js            //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"parse5":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// node_modules/meteor/server-render/node_modules/parse5/package.json                              //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
exports.name = "parse5";
exports.version = "3.0.2";
exports.main = "./lib/index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// node_modules/meteor/server-render/node_modules/parse5/lib/index.js                              //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"combined-stream2":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// node_modules/meteor/server-render/node_modules/combined-stream2/package.json                    //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
exports.name = "combined-stream2";
exports.version = "1.1.2";
exports.main = "index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// node_modules/meteor/server-render/node_modules/combined-stream2/index.js                        //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/server-render/server.js");

/* Exports */
Package._define("server-render", exports);

})();

//# sourceURL=meteor://💻app/packages/server-render.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc2VydmVyLXJlbmRlci9zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3NlcnZlci1yZW5kZXIvc2VydmVyLXJlZ2lzdGVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9zZXJ2ZXItcmVuZGVyL3NlcnZlci1zaW5rLmpzIl0sIm5hbWVzIjpbIm1vZHVsZSIsImV4cG9ydCIsIm9uUGFnZUxvYWQiLCJNZXRlb3IiLCJ3YXRjaCIsInJlcXVpcmUiLCJ2Iiwic3RhcnR1cFByb21pc2UiLCJQcm9taXNlIiwic3RhcnR1cCIsInBhZ2VMb2FkQ2FsbGJhY2tzIiwiU2V0IiwiY2FsbGJhY2siLCJhZGQiLCJyZW1vdmUiLCJkZWxldGUiLCJjbGVhciIsImNoYWluIiwiaGFuZGxlciIsInRoZW4iLCJwcm9taXNlIiwicmVzb2x2ZSIsImZvckVhY2giLCJXZWJBcHBJbnRlcm5hbHMiLCJNYWdpY1N0cmluZyIsImRlZmF1bHQiLCJTQVhQYXJzZXIiLCJjcmVhdGVTdHJlYW0iLCJjcmVhdGUiLCJTZXJ2ZXJTaW5rIiwiaXNSZWFkYWJsZSIsInJlZ2lzdGVyQm9pbGVycGxhdGVEYXRhQ2FsbGJhY2siLCJyZXF1ZXN0IiwiZGF0YSIsImFyY2giLCJzaW5rIiwibWF5YmVNYWRlQ2hhbmdlcyIsInJlYWxseU1hZGVDaGFuZ2VzIiwicmV3cml0ZSIsInByb3BlcnR5IiwiaHRtbCIsIm1hZ2ljIiwicGFyc2VyIiwibG9jYXRpb25JbmZvIiwiT2JqZWN0Iiwia2V5cyIsImh0bWxCeUlkIiwibGVuZ3RoIiwic3RyZWFtIiwibGFzdFN0YXJ0Iiwic3RhcnQiLCJvbiIsIm5hbWUiLCJhdHRycyIsInNlbGZDbG9zaW5nIiwibG9jIiwic29tZSIsImF0dHIiLCJ2YWx1ZSIsInNsaWNlIiwiZW5kT2Zmc2V0IiwiYXBwZW5kIiwiQnVmZmVyIiwiZnJvbSIsImxvY2F0aW9uIiwiZW5kIiwid3JpdGUiLCJiaW5kIiwiaGVhZCIsImR5bmFtaWNIZWFkIiwiYm9keSIsImR5bmFtaWNCb2R5Iiwic3RhdHVzQ29kZSIsInJlc3BvbnNlSGVhZGVycyIsImhlYWRlcnMiLCJjb25zdHJ1Y3RvciIsImFwcGVuZFRvSGVhZCIsImFwcGVuZENvbnRlbnQiLCJhcHBlbmRUb0JvZHkiLCJhcHBlbmRUb0VsZW1lbnRCeUlkIiwiaWQiLCJyZW5kZXJJbnRvRWxlbWVudEJ5SWQiLCJyZWRpcmVjdCIsImNvZGUiLCJMb2NhdGlvbiIsInNldFN0YXR1c0NvZGUiLCJzZXRIZWFkZXIiLCJrZXkiLCJnZXRIZWFkZXJzIiwiZ2V0Q29va2llcyIsImNvb2tpZXMiLCJwaXBlIiwicmVhZGFibGUiLCJfcmVhZCIsIl9yZWFkYWJsZVN0YXRlIiwib2JqZWN0IiwiY29udGVudCIsIm1hZGVDaGFuZ2VzIiwiQXJyYXkiLCJpc0FycmF5IiwiZWxlbSIsInRvU3RyaW5nIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE9BQU9DLE1BQVAsQ0FBYztBQUFDQyxjQUFXLE1BQUlBO0FBQWhCLENBQWQ7QUFBMkMsSUFBSUMsTUFBSjtBQUFXSCxPQUFPSSxLQUFQLENBQWFDLFFBQVEsZUFBUixDQUFiLEVBQXNDO0FBQUNGLFNBQU9HLENBQVAsRUFBUztBQUFDSCxhQUFPRyxDQUFQO0FBQVM7O0FBQXBCLENBQXRDLEVBQTRELENBQTVEO0FBQStETixPQUFPSSxLQUFQLENBQWFDLFFBQVEsc0JBQVIsQ0FBYjtBQUdySCxNQUFNRSxpQkFBaUIsSUFBSUMsT0FBSixDQUFZTCxPQUFPTSxPQUFuQixDQUF2QjtBQUNBLE1BQU1DLG9CQUFvQixJQUFJQyxHQUFKLEVBQTFCOztBQUVPLFNBQVNULFVBQVQsQ0FBb0JVLFFBQXBCLEVBQThCO0FBQ25DLE1BQUksT0FBT0EsUUFBUCxLQUFvQixVQUF4QixFQUFvQztBQUNsQ0Ysc0JBQWtCRyxHQUFsQixDQUFzQkQsUUFBdEI7QUFDRCxHQUhrQyxDQUtuQzs7O0FBQ0EsU0FBT0EsUUFBUDtBQUNEOztB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QnhELFFBQXRCLEVBQWdDNkQsSUFBaEMsQ0FBSixFQUEyQztBQUN6Q0gsc0JBQWMsSUFBZDtBQUNEO0FBQ0YsS0FKRDtBQUtELEdBTkQsTUFNTyxJQUFJbkUsV0FBV2tFLE9BQVgsQ0FBSixFQUF5QjtBQUM5QkQsV0FBT3hELFFBQVAsSUFBbUJ5RCxPQUFuQjtBQUNBQyxrQkFBYyxJQUFkO0FBQ0QsR0FITSxNQUdBLElBQUtELFVBQVVBLFdBQVdBLFFBQVFLLFFBQVIsQ0FBaUIsTUFBakIsQ0FBMUIsRUFBcUQ7QUFDMUROLFdBQU94RCxRQUFQLElBQW1CLENBQUN3RCxPQUFPeEQsUUFBUCxLQUFvQixFQUFyQixJQUEyQnlELE9BQTlDO0FBQ0FDLGtCQUFjLElBQWQ7QUFDRDs7QUFDRCxTQUFPQSxXQUFQO0FBQ0QsQyIsImZpbGUiOiIvcGFja2FnZXMvc2VydmVyLXJlbmRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1ldGVvciB9IGZyb20gXCJtZXRlb3IvbWV0ZW9yXCI7XG5pbXBvcnQgXCIuL3NlcnZlci1yZWdpc3Rlci5qc1wiO1xuXG5jb25zdCBzdGFydHVwUHJvbWlzZSA9IG5ldyBQcm9taXNlKE1ldGVvci5zdGFydHVwKTtcbmNvbnN0IHBhZ2VMb2FkQ2FsbGJhY2tzID0gbmV3IFNldDtcblxuZXhwb3J0IGZ1bmN0aW9uIG9uUGFnZUxvYWQoY2FsbGJhY2spIHtcbiAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgcGFnZUxvYWRDYWxsYmFja3MuYWRkKGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8vIFJldHVybiB0aGUgY2FsbGJhY2sgc28gdGhhdCBpdCBjYW4gYmUgbW9yZSBlYXNpbHkgcmVtb3ZlZCBsYXRlci5cbiAgcmV0dXJuIGNhbGxiYWNrO1xufVxuXG5vblBhZ2VMb2FkLnJlbW92ZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICBwYWdlTG9hZENhbGxiYWNrcy5kZWxldGUoY2FsbGJhY2spO1xufTtcblxub25QYWdlTG9hZC5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgcGFnZUxvYWRDYWxsYmFja3MuY2xlYXIoKTtcbn07XG5cbm9uUGFnZUxvYWQuY2hhaW4gPSBmdW5jdGlvbiAoaGFuZGxlcikge1xuICByZXR1cm4gc3RhcnR1cFByb21pc2UudGhlbigoKSA9PiB7XG4gICAgbGV0IHByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcbiAgICBwYWdlTG9hZENhbGxiYWNrcy5mb3JFYWNoKGNhbGxiYWNrID0+IHtcbiAgICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oKCkgPT4gaGFuZGxlcihjYWxsYmFjaykpO1xuICAgIH0pO1xuICAgIHJldHVybiBwcm9taXNlO1xuICB9KTtcbn07XG4iLCJpbXBvcnQgeyBXZWJBcHBJbnRlcm5hbHMgfSBmcm9tIFwibWV0ZW9yL3dlYmFwcFwiO1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gXCJtYWdpYy1zdHJpbmdcIjtcbmltcG9ydCB7IFNBWFBhcnNlciB9IGZyb20gXCJwYXJzZTVcIjtcbmltcG9ydCB7IGNyZWF0ZSBhcyBjcmVhdGVTdHJlYW0gfSBmcm9tIFwiY29tYmluZWQtc3RyZWFtMlwiO1xuaW1wb3J0IHsgU2VydmVyU2luaywgaXNSZWFkYWJsZSB9IGZyb20gXCIuL3NlcnZlci1zaW5rLmpzXCI7XG5pbXBvcnQgeyBvblBhZ2VMb2FkIH0gZnJvbSBcIi4vc2VydmVyLmpzXCI7XG5cbldlYkFwcEludGVybmFscy5yZWdpc3RlckJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrKFxuICBcIm1ldGVvci9zZXJ2ZXItcmVuZGVyXCIsXG4gIChyZXF1ZXN0LCBkYXRhLCBhcmNoKSA9PiB7XG4gICAgY29uc3Qgc2luayA9IG5ldyBTZXJ2ZXJTaW5rKHJlcXVlc3QsIGFyY2gpO1xuXG4gICAgcmV0dXJuIG9uUGFnZUxvYWQuY2hhaW4oXG4gICAgICBjYWxsYmFjayA9PiBjYWxsYmFjayhzaW5rLCByZXF1ZXN0KVxuICAgICkudGhlbigoKSA9PiB7XG4gICAgICBpZiAoISBzaW5rLm1heWJlTWFkZUNoYW5nZXMpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBsZXQgcmVhbGx5TWFkZUNoYW5nZXMgPSBmYWxzZTtcblxuICAgICAgZnVuY3Rpb24gcmV3cml0ZShwcm9wZXJ0eSkge1xuICAgICAgICBjb25zdCBodG1sID0gZGF0YVtwcm9wZXJ0eV07XG4gICAgICAgIGlmICh0eXBlb2YgaHRtbCAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG1hZ2ljID0gbmV3IE1hZ2ljU3RyaW5nKGh0bWwpO1xuICAgICAgICBjb25zdCBwYXJzZXIgPSBuZXcgU0FYUGFyc2VyKHtcbiAgICAgICAgICBsb2NhdGlvbkluZm86IHRydWVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZGF0YVtwcm9wZXJ0eV0gPSBwYXJzZXI7XG5cbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKHNpbmsuaHRtbEJ5SWQpLmxlbmd0aCkge1xuICAgICAgICAgIGNvbnN0IHN0cmVhbSA9IGNyZWF0ZVN0cmVhbSgpO1xuXG4gICAgICAgICAgbGV0IGxhc3RTdGFydCA9IG1hZ2ljLnN0YXJ0O1xuICAgICAgICAgIHBhcnNlci5vbihcInN0YXJ0VGFnXCIsIChuYW1lLCBhdHRycywgc2VsZkNsb3NpbmcsIGxvYykgPT4ge1xuICAgICAgICAgICAgYXR0cnMuc29tZShhdHRyID0+IHtcbiAgICAgICAgICAgICAgaWYgKGF0dHIubmFtZSA9PT0gXCJpZFwiKSB7XG4gICAgICAgICAgICAgICAgbGV0IGh0bWwgPSBzaW5rLmh0bWxCeUlkW2F0dHIudmFsdWVdO1xuICAgICAgICAgICAgICAgIGlmIChodG1sKSB7XG4gICAgICAgICAgICAgICAgICByZWFsbHlNYWRlQ2hhbmdlcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBjb25zdCBzdGFydCA9IG1hZ2ljLnNsaWNlKGxhc3RTdGFydCwgbG9jLmVuZE9mZnNldCk7XG4gICAgICAgICAgICAgICAgICBzdHJlYW0uYXBwZW5kKEJ1ZmZlci5mcm9tKHN0YXJ0LCBcInV0ZjhcIikpO1xuICAgICAgICAgICAgICAgICAgc3RyZWFtLmFwcGVuZChcbiAgICAgICAgICAgICAgICAgICAgdHlwZW9mIGh0bWwgPT09IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgICAgICAgICA/IEJ1ZmZlci5mcm9tKGh0bWwsIFwidXRmOFwiKVxuICAgICAgICAgICAgICAgICAgICAgIDogaHRtbFxuICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgIGxhc3RTdGFydCA9IGxvYy5lbmRPZmZzZXQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHBhcnNlci5vbihcImVuZFRhZ1wiLCAobmFtZSwgbG9jYXRpb24pID0+IHtcbiAgICAgICAgICAgIGlmIChsb2NhdGlvbi5lbmRPZmZzZXQgPT09IGh0bWwubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIC8vIHJlYWNoZWQgdGhlIGVuZCBvZiB0aGUgdGVtcGxhdGVcbiAgICAgICAgICAgICAgY29uc3QgZW5kID0gbWFnaWMuc2xpY2UobGFzdFN0YXJ0KTtcbiAgICAgICAgICAgICAgc3RyZWFtLmFwcGVuZChCdWZmZXIuZnJvbShlbmQsIFwidXRmOFwiKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcblxuICAgICAgICAgIGRhdGFbcHJvcGVydHldID0gc3RyZWFtO1xuICAgICAgICB9XG5cbiAgICAgICAgcGFyc2VyLndyaXRlKGh0bWwsIHBhcnNlci5lbmQuYmluZChwYXJzZXIpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHNpbmsuaGVhZCkge1xuICAgICAgICBkYXRhLmR5bmFtaWNIZWFkID0gKGRhdGEuZHluYW1pY0hlYWQgfHwgXCJcIikgKyBzaW5rLmhlYWQ7XG4gICAgICAgIHJlYWxseU1hZGVDaGFuZ2VzID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKE9iamVjdC5rZXlzKHNpbmsuaHRtbEJ5SWQpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8gV2UgZG9uJ3QgY3VycmVudGx5IGFsbG93IGluamVjdGluZyBIVE1MIGludG8gdGhlIDxoZWFkPiBleGNlcHRcbiAgICAgICAgLy8gYnkgY2FsbGluZyBzaW5rLmFwcGVuZEhlYWQoaHRtbCkuXG4gICAgICAgIHJld3JpdGUoXCJib2R5XCIpO1xuICAgICAgICByZXdyaXRlKFwiZHluYW1pY0JvZHlcIik7XG4gICAgICB9XG5cbiAgICAgIGlmIChzaW5rLmJvZHkpIHtcbiAgICAgICAgZGF0YS5keW5hbWljQm9keSA9IChkYXRhLmR5bmFtaWNCb2R5IHx8IFwiXCIpICsgc2luay5ib2R5O1xuICAgICAgICByZWFsbHlNYWRlQ2hhbmdlcyA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChzaW5rLnN0YXR1c0NvZGUpIHtcbiAgICAgICAgZGF0YS5zdGF0dXNDb2RlID0gc2luay5zdGF0dXNDb2RlO1xuICAgICAgICByZWFsbHlNYWRlQ2hhbmdlcyA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChPYmplY3Qua2V5cyhzaW5rLnJlc3BvbnNlSGVhZGVycykpe1xuICAgICAgICBkYXRhLmhlYWRlcnMgPSBzaW5rLnJlc3BvbnNlSGVhZGVycztcbiAgICAgICAgcmVhbGx5TWFkZUNoYW5nZXMgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVhbGx5TWFkZUNoYW5nZXM7XG4gICAgfSk7XG4gIH1cbik7XG4iLCJleHBvcnQgY2xhc3MgU2VydmVyU2luayB7XG4gIGNvbnN0cnVjdG9yKHJlcXVlc3QsIGFyY2gpIHtcbiAgICB0aGlzLnJlcXVlc3QgPSByZXF1ZXN0O1xuICAgIHRoaXMuYXJjaCA9IGFyY2g7XG4gICAgdGhpcy5oZWFkID0gXCJcIjtcbiAgICB0aGlzLmJvZHkgPSBcIlwiO1xuICAgIHRoaXMuaHRtbEJ5SWQgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIHRoaXMubWF5YmVNYWRlQ2hhbmdlcyA9IGZhbHNlO1xuICAgIHRoaXMuc3RhdHVzQ29kZSA9IG51bGw7XG4gICAgdGhpcy5yZXNwb25zZUhlYWRlcnMgPSB7fTtcbiAgfVxuXG4gIGFwcGVuZFRvSGVhZChodG1sKSB7XG4gICAgaWYgKGFwcGVuZENvbnRlbnQodGhpcywgXCJoZWFkXCIsIGh0bWwpKSB7XG4gICAgICB0aGlzLm1heWJlTWFkZUNoYW5nZXMgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGFwcGVuZFRvQm9keShodG1sKSB7XG4gICAgaWYgKGFwcGVuZENvbnRlbnQodGhpcywgXCJib2R5XCIsIGh0bWwpKSB7XG4gICAgICB0aGlzLm1heWJlTWFkZUNoYW5nZXMgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGFwcGVuZFRvRWxlbWVudEJ5SWQoaWQsIGh0bWwpIHtcbiAgICBpZiAoYXBwZW5kQ29udGVudCh0aGlzLmh0bWxCeUlkLCBpZCwgaHRtbCkpIHtcbiAgICAgIHRoaXMubWF5YmVNYWRlQ2hhbmdlcyA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmVuZGVySW50b0VsZW1lbnRCeUlkKGlkLCBodG1sKSB7XG4gICAgdGhpcy5odG1sQnlJZFtpZF0gPSBcIlwiO1xuICAgIHRoaXMuYXBwZW5kVG9FbGVtZW50QnlJZChpZCwgaHRtbCk7XG4gIH1cblxuICByZWRpcmVjdChsb2NhdGlvbiwgY29kZSA9IDMwMSkge1xuICAgIHRoaXMubWF5YmVNYWRlQ2hhbmdlcyA9IHRydWU7XG4gICAgdGhpcy5zdGF0dXNDb2RlID0gY29kZTtcbiAgICB0aGlzLnJlc3BvbnNlSGVhZGVycy5Mb2NhdGlvbiA9IGxvY2F0aW9uO1xuICB9XG5cbiAgLy8gc2VydmVyIG9ubHkgbWV0aG9kc1xuICBzZXRTdGF0dXNDb2RlKGNvZGUpIHtcbiAgICB0aGlzLm1heWJlTWFkZUNoYW5nZXMgPSB0cnVlO1xuICAgIHRoaXMuc3RhdHVzQ29kZSA9IGNvZGU7XG4gIH1cblxuICBzZXRIZWFkZXIoa2V5LCB2YWx1ZSkge1xuICAgIHRoaXMubWF5YmVNYWRlQ2hhbmdlcyA9IHRydWU7XG4gICAgdGhpcy5yZXNwb25zZUhlYWRlcnNba2V5XSA9IHZhbHVlO1xuICB9XG5cbiAgZ2V0SGVhZGVycygpIHtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0LmhlYWRlcnM7XG4gIH1cblxuICBnZXRDb29raWVzKCkge1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QuY29va2llcztcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNSZWFkYWJsZShzdHJlYW0pIHtcbiAgcmV0dXJuIChcbiAgICBzdHJlYW0gIT09IG51bGwgJiZcbiAgICB0eXBlb2Ygc3RyZWFtID09PSAnb2JqZWN0JyAmJlxuICAgIHR5cGVvZiBzdHJlYW0ucGlwZSA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgIHN0cmVhbS5yZWFkYWJsZSAhPT0gZmFsc2UgJiZcbiAgICB0eXBlb2Ygc3RyZWFtLl9yZWFkID09PSAnZnVuY3Rpb24nICYmXG4gICAgdHlwZW9mIHN0cmVhbS5fcmVhZGFibGVTdGF0ZSA9PT0gJ29iamVjdCdcbiAgKTtcbn1cblxuZnVuY3Rpb24gYXBwZW5kQ29udGVudChvYmplY3QsIHByb3BlcnR5LCBjb250ZW50KSB7XG4gIGxldCBtYWRlQ2hhbmdlcyA9IGZhbHNlO1xuXG4gIGlmIChBcnJheS5pc0FycmF5KGNvbnRlbnQpKSB7XG4gICAgY29udGVudC5mb3JFYWNoKGVsZW0gPT4ge1xuICAgICAgaWYgKGFwcGVuZENvbnRlbnQob2JqZWN0LCBwcm9wZXJ0eSwgZWxlbSkpIHtcbiAgICAgICAgbWFkZUNoYW5nZXMgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICB9IGVsc2UgaWYgKGlzUmVhZGFibGUoY29udGVudCkpIHtcbiAgICBvYmplY3RbcHJvcGVydHldID0gY29udGVudDtcbiAgICBtYWRlQ2hhbmdlcyA9IHRydWU7XG4gIH0gZWxzZSBpZiAoKGNvbnRlbnQgPSBjb250ZW50ICYmIGNvbnRlbnQudG9TdHJpbmcoXCJ1dGY4XCIpKSkge1xuICAgIG9iamVjdFtwcm9wZXJ0eV0gPSAob2JqZWN0W3Byb3BlcnR5XSB8fCBcIlwiKSArIGNvbnRlbnQ7XG4gICAgbWFkZUNoYW5nZXMgPSB0cnVlO1xuICB9IFxuICByZXR1cm4gbWFkZUNoYW5nZXM7XG59XG4iXX0=
