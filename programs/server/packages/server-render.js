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
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
module.link("./server-register.js");
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
module.link("meteor/webapp", {
  WebAppInternals(v) {
    WebAppInternals = v;
  }

}, 0);
let MagicString;
module.link("magic-string", {
  default(v) {
    MagicString = v;
  }

}, 1);
let SAXParser;
module.link("parse5", {
  SAXParser(v) {
    SAXParser = v;
  }

}, 2);
let createStream;
module.link("combined-stream2", {
  create(v) {
    createStream = v;
  }

}, 3);
let ServerSink, isReadable;
module.link("./server-sink.js", {
  ServerSink(v) {
    ServerSink = v;
  },

  isReadable(v) {
    isReadable = v;
  }

}, 4);
let onPageLoad;
module.link("./server.js", {
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

},"node_modules":{"magic-string":{"package.json":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// node_modules/meteor/server-render/node_modules/magic-string/package.json                        //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
module.exports = {
  "name": "magic-string",
  "version": "0.21.3",
  "main": "dist/magic-string.cjs.js"
};

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

}}},"parse5":{"package.json":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// node_modules/meteor/server-render/node_modules/parse5/package.json                              //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
module.exports = {
  "name": "parse5",
  "version": "3.0.2",
  "main": "./lib/index.js"
};

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

}}},"combined-stream2":{"package.json":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                 //
// node_modules/meteor/server-render/node_modules/combined-stream2/package.json                    //
//                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                   //
module.exports = {
  "name": "combined-stream2",
  "version": "1.1.2",
  "main": "index.js"
};

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc2VydmVyLXJlbmRlci9zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3NlcnZlci1yZW5kZXIvc2VydmVyLXJlZ2lzdGVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9zZXJ2ZXItcmVuZGVyL3NlcnZlci1zaW5rLmpzIl0sIm5hbWVzIjpbIm1vZHVsZSIsImV4cG9ydCIsIm9uUGFnZUxvYWQiLCJNZXRlb3IiLCJsaW5rIiwidiIsInN0YXJ0dXBQcm9taXNlIiwiUHJvbWlzZSIsInN0YXJ0dXAiLCJwYWdlTG9hZENhbGxiYWNrcyIsIlNldCIsImNhbGxiYWNrIiwiYWRkIiwicmVtb3ZlIiwiZGVsZXRlIiwiY2xlYXIiLCJjaGFpbiIsImhhbmRsZXIiLCJ0aGVuIiwicHJvbWlzZSIsInJlc29sdmUiLCJmb3JFYWNoIiwiV2ViQXBwSW50ZXJuYWxzIiwiTWFnaWNTdHJpbmciLCJkZWZhdWx0IiwiU0FYUGFyc2VyIiwiY3JlYXRlU3RyZWFtIiwiY3JlYXRlIiwiU2VydmVyU2luayIsImlzUmVhZGFibGUiLCJyZWdpc3RlckJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrIiwicmVxdWVzdCIsImRhdGEiLCJhcmNoIiwic2luayIsIm1heWJlTWFkZUNoYW5nZXMiLCJyZWFsbHlNYWRlQ2hhbmdlcyIsInJld3JpdGUiLCJwcm9wZXJ0eSIsImh0bWwiLCJtYWdpYyIsInBhcnNlciIsImxvY2F0aW9uSW5mbyIsIk9iamVjdCIsImtleXMiLCJodG1sQnlJZCIsImxlbmd0aCIsInN0cmVhbSIsImxhc3RTdGFydCIsInN0YXJ0Iiwib24iLCJuYW1lIiwiYXR0cnMiLCJzZWxmQ2xvc2luZyIsImxvYyIsInNvbWUiLCJhdHRyIiwidmFsdWUiLCJzbGljZSIsImVuZE9mZnNldCIsImFwcGVuZCIsIkJ1ZmZlciIsImZyb20iLCJsb2NhdGlvbiIsImVuZCIsIndyaXRlIiwiYmluZCIsImhlYWQiLCJkeW5hbWljSGVhZCIsImJvZHkiLCJkeW5hbWljQm9keSIsInN0YXR1c0NvZGUiLCJyZXNwb25zZUhlYWRlcnMiLCJoZWFkZXJzIiwiY29uc3RydWN0b3IiLCJhcHBlbmRUb0hlYWQiLCJhcHBlbmRDb250ZW50IiwiYXBwZW5kVG9Cb2R5IiwiYXBwZW5kVG9FbGVtZW50QnlJZCIsImlkIiwicmVuZGVySW50b0VsZW1lbnRCeUlkIiwicmVkaXJlY3QiLCJjb2RlIiwiTG9jYXRpb24iLCJzZXRTdGF0dXNDb2RlIiwic2V0SGVhZGVyIiwia2V5IiwiZ2V0SGVhZGVycyIsImdldENvb2tpZXMiLCJjb29raWVzIiwicGlwZSIsInJlYWRhYmxlIiwiX3JlYWQiLCJfcmVhZGFibGVTdGF0ZSIsIm9iamVjdCIsImNvbnRlbnQiLCJtYWRlQ2hhbmdlcyIsIkFycmF5IiwiaXNBcnJheSIsImVsZW0iLCJ0b1N0cmluZyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxNQUFNLENBQUNDLE1BQVAsQ0FBYztBQUFDQyxZQUFVLEVBQUMsTUFBSUE7QUFBaEIsQ0FBZDtBQUEyQyxJQUFJQyxNQUFKO0FBQVdILE1BQU0sQ0FBQ0ksSUFBUCxDQUFZLGVBQVosRUFBNEI7QUFBQ0QsUUFBTSxDQUFDRSxDQUFELEVBQUc7QUFBQ0YsVUFBTSxHQUFDRSxDQUFQO0FBQVM7O0FBQXBCLENBQTVCLEVBQWtELENBQWxEO0FBQXFETCxNQUFNLENBQUNJLElBQVAsQ0FBWSxzQkFBWjtBQUczRyxNQUFNRSxjQUFjLEdBQUcsSUFBSUMsT0FBSixDQUFZSixNQUFNLENBQUNLLE9BQW5CLENBQXZCO0FBQ0EsTUFBTUMsaUJBQWlCLEdBQUcsSUFBSUMsR0FBSixFQUExQjs7QUFFTyxTQUFTUixVQUFULENBQW9CUyxRQUFwQixFQUE4QjtBQUNuQyxNQUFJLE9BQU9BLFFBQVAsS0FBb0IsVUFBeEIsRUFBb0M7QUFDbENGLHFCQUFpQixDQUFDRyxHQUFsQixDQUFzQkQsUUFBdEI7QUFDRCxHQUhrQyxDQUtuQzs7O0FBQ0EsU0FB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TSxDQUFDeEQsUUFBRCxDQUFOLElBQW9CLEVBQXJCLElBQTJCeUQsT0FBOUM7QUFDQUMsZUFBVyxHQUFHLElBQWQ7QUFDRDs7QUFDRCxTQUFPQSxXQUFQO0FBQ0QsQyIsImZpbGUiOiIvcGFja2FnZXMvc2VydmVyLXJlbmRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1ldGVvciB9IGZyb20gXCJtZXRlb3IvbWV0ZW9yXCI7XG5pbXBvcnQgXCIuL3NlcnZlci1yZWdpc3Rlci5qc1wiO1xuXG5jb25zdCBzdGFydHVwUHJvbWlzZSA9IG5ldyBQcm9taXNlKE1ldGVvci5zdGFydHVwKTtcbmNvbnN0IHBhZ2VMb2FkQ2FsbGJhY2tzID0gbmV3IFNldDtcblxuZXhwb3J0IGZ1bmN0aW9uIG9uUGFnZUxvYWQoY2FsbGJhY2spIHtcbiAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgcGFnZUxvYWRDYWxsYmFja3MuYWRkKGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8vIFJldHVybiB0aGUgY2FsbGJhY2sgc28gdGhhdCBpdCBjYW4gYmUgbW9yZSBlYXNpbHkgcmVtb3ZlZCBsYXRlci5cbiAgcmV0dXJuIGNhbGxiYWNrO1xufVxuXG5vblBhZ2VMb2FkLnJlbW92ZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICBwYWdlTG9hZENhbGxiYWNrcy5kZWxldGUoY2FsbGJhY2spO1xufTtcblxub25QYWdlTG9hZC5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgcGFnZUxvYWRDYWxsYmFja3MuY2xlYXIoKTtcbn07XG5cbm9uUGFnZUxvYWQuY2hhaW4gPSBmdW5jdGlvbiAoaGFuZGxlcikge1xuICByZXR1cm4gc3RhcnR1cFByb21pc2UudGhlbigoKSA9PiB7XG4gICAgbGV0IHByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcbiAgICBwYWdlTG9hZENhbGxiYWNrcy5mb3JFYWNoKGNhbGxiYWNrID0+IHtcbiAgICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oKCkgPT4gaGFuZGxlcihjYWxsYmFjaykpO1xuICAgIH0pO1xuICAgIHJldHVybiBwcm9taXNlO1xuICB9KTtcbn07XG4iLCJpbXBvcnQgeyBXZWJBcHBJbnRlcm5hbHMgfSBmcm9tIFwibWV0ZW9yL3dlYmFwcFwiO1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gXCJtYWdpYy1zdHJpbmdcIjtcbmltcG9ydCB7IFNBWFBhcnNlciB9IGZyb20gXCJwYXJzZTVcIjtcbmltcG9ydCB7IGNyZWF0ZSBhcyBjcmVhdGVTdHJlYW0gfSBmcm9tIFwiY29tYmluZWQtc3RyZWFtMlwiO1xuaW1wb3J0IHsgU2VydmVyU2luaywgaXNSZWFkYWJsZSB9IGZyb20gXCIuL3NlcnZlci1zaW5rLmpzXCI7XG5pbXBvcnQgeyBvblBhZ2VMb2FkIH0gZnJvbSBcIi4vc2VydmVyLmpzXCI7XG5cbldlYkFwcEludGVybmFscy5yZWdpc3RlckJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrKFxuICBcIm1ldGVvci9zZXJ2ZXItcmVuZGVyXCIsXG4gIChyZXF1ZXN0LCBkYXRhLCBhcmNoKSA9PiB7XG4gICAgY29uc3Qgc2luayA9IG5ldyBTZXJ2ZXJTaW5rKHJlcXVlc3QsIGFyY2gpO1xuXG4gICAgcmV0dXJuIG9uUGFnZUxvYWQuY2hhaW4oXG4gICAgICBjYWxsYmFjayA9PiBjYWxsYmFjayhzaW5rLCByZXF1ZXN0KVxuICAgICkudGhlbigoKSA9PiB7XG4gICAgICBpZiAoISBzaW5rLm1heWJlTWFkZUNoYW5nZXMpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBsZXQgcmVhbGx5TWFkZUNoYW5nZXMgPSBmYWxzZTtcblxuICAgICAgZnVuY3Rpb24gcmV3cml0ZShwcm9wZXJ0eSkge1xuICAgICAgICBjb25zdCBodG1sID0gZGF0YVtwcm9wZXJ0eV07XG4gICAgICAgIGlmICh0eXBlb2YgaHRtbCAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG1hZ2ljID0gbmV3IE1hZ2ljU3RyaW5nKGh0bWwpO1xuICAgICAgICBjb25zdCBwYXJzZXIgPSBuZXcgU0FYUGFyc2VyKHtcbiAgICAgICAgICBsb2NhdGlvbkluZm86IHRydWVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZGF0YVtwcm9wZXJ0eV0gPSBwYXJzZXI7XG5cbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKHNpbmsuaHRtbEJ5SWQpLmxlbmd0aCkge1xuICAgICAgICAgIGNvbnN0IHN0cmVhbSA9IGNyZWF0ZVN0cmVhbSgpO1xuXG4gICAgICAgICAgbGV0IGxhc3RTdGFydCA9IG1hZ2ljLnN0YXJ0O1xuICAgICAgICAgIHBhcnNlci5vbihcInN0YXJ0VGFnXCIsIChuYW1lLCBhdHRycywgc2VsZkNsb3NpbmcsIGxvYykgPT4ge1xuICAgICAgICAgICAgYXR0cnMuc29tZShhdHRyID0+IHtcbiAgICAgICAgICAgICAgaWYgKGF0dHIubmFtZSA9PT0gXCJpZFwiKSB7XG4gICAgICAgICAgICAgICAgbGV0IGh0bWwgPSBzaW5rLmh0bWxCeUlkW2F0dHIudmFsdWVdO1xuICAgICAgICAgICAgICAgIGlmIChodG1sKSB7XG4gICAgICAgICAgICAgICAgICByZWFsbHlNYWRlQ2hhbmdlcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBjb25zdCBzdGFydCA9IG1hZ2ljLnNsaWNlKGxhc3RTdGFydCwgbG9jLmVuZE9mZnNldCk7XG4gICAgICAgICAgICAgICAgICBzdHJlYW0uYXBwZW5kKEJ1ZmZlci5mcm9tKHN0YXJ0LCBcInV0ZjhcIikpO1xuICAgICAgICAgICAgICAgICAgc3RyZWFtLmFwcGVuZChcbiAgICAgICAgICAgICAgICAgICAgdHlwZW9mIGh0bWwgPT09IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgICAgICAgICA/IEJ1ZmZlci5mcm9tKGh0bWwsIFwidXRmOFwiKVxuICAgICAgICAgICAgICAgICAgICAgIDogaHRtbFxuICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgIGxhc3RTdGFydCA9IGxvYy5lbmRPZmZzZXQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHBhcnNlci5vbihcImVuZFRhZ1wiLCAobmFtZSwgbG9jYXRpb24pID0+IHtcbiAgICAgICAgICAgIGlmIChsb2NhdGlvbi5lbmRPZmZzZXQgPT09IGh0bWwubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIC8vIHJlYWNoZWQgdGhlIGVuZCBvZiB0aGUgdGVtcGxhdGVcbiAgICAgICAgICAgICAgY29uc3QgZW5kID0gbWFnaWMuc2xpY2UobGFzdFN0YXJ0KTtcbiAgICAgICAgICAgICAgc3RyZWFtLmFwcGVuZChCdWZmZXIuZnJvbShlbmQsIFwidXRmOFwiKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcblxuICAgICAgICAgIGRhdGFbcHJvcGVydHldID0gc3RyZWFtO1xuICAgICAgICB9XG5cbiAgICAgICAgcGFyc2VyLndyaXRlKGh0bWwsIHBhcnNlci5lbmQuYmluZChwYXJzZXIpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHNpbmsuaGVhZCkge1xuICAgICAgICBkYXRhLmR5bmFtaWNIZWFkID0gKGRhdGEuZHluYW1pY0hlYWQgfHwgXCJcIikgKyBzaW5rLmhlYWQ7XG4gICAgICAgIHJlYWxseU1hZGVDaGFuZ2VzID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKE9iamVjdC5rZXlzKHNpbmsuaHRtbEJ5SWQpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8gV2UgZG9uJ3QgY3VycmVudGx5IGFsbG93IGluamVjdGluZyBIVE1MIGludG8gdGhlIDxoZWFkPiBleGNlcHRcbiAgICAgICAgLy8gYnkgY2FsbGluZyBzaW5rLmFwcGVuZEhlYWQoaHRtbCkuXG4gICAgICAgIHJld3JpdGUoXCJib2R5XCIpO1xuICAgICAgICByZXdyaXRlKFwiZHluYW1pY0JvZHlcIik7XG4gICAgICB9XG5cbiAgICAgIGlmIChzaW5rLmJvZHkpIHtcbiAgICAgICAgZGF0YS5keW5hbWljQm9keSA9IChkYXRhLmR5bmFtaWNCb2R5IHx8IFwiXCIpICsgc2luay5ib2R5O1xuICAgICAgICByZWFsbHlNYWRlQ2hhbmdlcyA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChzaW5rLnN0YXR1c0NvZGUpIHtcbiAgICAgICAgZGF0YS5zdGF0dXNDb2RlID0gc2luay5zdGF0dXNDb2RlO1xuICAgICAgICByZWFsbHlNYWRlQ2hhbmdlcyA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChPYmplY3Qua2V5cyhzaW5rLnJlc3BvbnNlSGVhZGVycykpe1xuICAgICAgICBkYXRhLmhlYWRlcnMgPSBzaW5rLnJlc3BvbnNlSGVhZGVycztcbiAgICAgICAgcmVhbGx5TWFkZUNoYW5nZXMgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVhbGx5TWFkZUNoYW5nZXM7XG4gICAgfSk7XG4gIH1cbik7XG4iLCJleHBvcnQgY2xhc3MgU2VydmVyU2luayB7XG4gIGNvbnN0cnVjdG9yKHJlcXVlc3QsIGFyY2gpIHtcbiAgICB0aGlzLnJlcXVlc3QgPSByZXF1ZXN0O1xuICAgIHRoaXMuYXJjaCA9IGFyY2g7XG4gICAgdGhpcy5oZWFkID0gXCJcIjtcbiAgICB0aGlzLmJvZHkgPSBcIlwiO1xuICAgIHRoaXMuaHRtbEJ5SWQgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIHRoaXMubWF5YmVNYWRlQ2hhbmdlcyA9IGZhbHNlO1xuICAgIHRoaXMuc3RhdHVzQ29kZSA9IG51bGw7XG4gICAgdGhpcy5yZXNwb25zZUhlYWRlcnMgPSB7fTtcbiAgfVxuXG4gIGFwcGVuZFRvSGVhZChodG1sKSB7XG4gICAgaWYgKGFwcGVuZENvbnRlbnQodGhpcywgXCJoZWFkXCIsIGh0bWwpKSB7XG4gICAgICB0aGlzLm1heWJlTWFkZUNoYW5nZXMgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGFwcGVuZFRvQm9keShodG1sKSB7XG4gICAgaWYgKGFwcGVuZENvbnRlbnQodGhpcywgXCJib2R5XCIsIGh0bWwpKSB7XG4gICAgICB0aGlzLm1heWJlTWFkZUNoYW5nZXMgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGFwcGVuZFRvRWxlbWVudEJ5SWQoaWQsIGh0bWwpIHtcbiAgICBpZiAoYXBwZW5kQ29udGVudCh0aGlzLmh0bWxCeUlkLCBpZCwgaHRtbCkpIHtcbiAgICAgIHRoaXMubWF5YmVNYWRlQ2hhbmdlcyA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmVuZGVySW50b0VsZW1lbnRCeUlkKGlkLCBodG1sKSB7XG4gICAgdGhpcy5odG1sQnlJZFtpZF0gPSBcIlwiO1xuICAgIHRoaXMuYXBwZW5kVG9FbGVtZW50QnlJZChpZCwgaHRtbCk7XG4gIH1cblxuICByZWRpcmVjdChsb2NhdGlvbiwgY29kZSA9IDMwMSkge1xuICAgIHRoaXMubWF5YmVNYWRlQ2hhbmdlcyA9IHRydWU7XG4gICAgdGhpcy5zdGF0dXNDb2RlID0gY29kZTtcbiAgICB0aGlzLnJlc3BvbnNlSGVhZGVycy5Mb2NhdGlvbiA9IGxvY2F0aW9uO1xuICB9XG5cbiAgLy8gc2VydmVyIG9ubHkgbWV0aG9kc1xuICBzZXRTdGF0dXNDb2RlKGNvZGUpIHtcbiAgICB0aGlzLm1heWJlTWFkZUNoYW5nZXMgPSB0cnVlO1xuICAgIHRoaXMuc3RhdHVzQ29kZSA9IGNvZGU7XG4gIH1cblxuICBzZXRIZWFkZXIoa2V5LCB2YWx1ZSkge1xuICAgIHRoaXMubWF5YmVNYWRlQ2hhbmdlcyA9IHRydWU7XG4gICAgdGhpcy5yZXNwb25zZUhlYWRlcnNba2V5XSA9IHZhbHVlO1xuICB9XG5cbiAgZ2V0SGVhZGVycygpIHtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0LmhlYWRlcnM7XG4gIH1cblxuICBnZXRDb29raWVzKCkge1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QuY29va2llcztcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNSZWFkYWJsZShzdHJlYW0pIHtcbiAgcmV0dXJuIChcbiAgICBzdHJlYW0gIT09IG51bGwgJiZcbiAgICB0eXBlb2Ygc3RyZWFtID09PSAnb2JqZWN0JyAmJlxuICAgIHR5cGVvZiBzdHJlYW0ucGlwZSA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgIHN0cmVhbS5yZWFkYWJsZSAhPT0gZmFsc2UgJiZcbiAgICB0eXBlb2Ygc3RyZWFtLl9yZWFkID09PSAnZnVuY3Rpb24nICYmXG4gICAgdHlwZW9mIHN0cmVhbS5fcmVhZGFibGVTdGF0ZSA9PT0gJ29iamVjdCdcbiAgKTtcbn1cblxuZnVuY3Rpb24gYXBwZW5kQ29udGVudChvYmplY3QsIHByb3BlcnR5LCBjb250ZW50KSB7XG4gIGxldCBtYWRlQ2hhbmdlcyA9IGZhbHNlO1xuXG4gIGlmIChBcnJheS5pc0FycmF5KGNvbnRlbnQpKSB7XG4gICAgY29udGVudC5mb3JFYWNoKGVsZW0gPT4ge1xuICAgICAgaWYgKGFwcGVuZENvbnRlbnQob2JqZWN0LCBwcm9wZXJ0eSwgZWxlbSkpIHtcbiAgICAgICAgbWFkZUNoYW5nZXMgPSB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICB9IGVsc2UgaWYgKGlzUmVhZGFibGUoY29udGVudCkpIHtcbiAgICBvYmplY3RbcHJvcGVydHldID0gY29udGVudDtcbiAgICBtYWRlQ2hhbmdlcyA9IHRydWU7XG4gIH0gZWxzZSBpZiAoKGNvbnRlbnQgPSBjb250ZW50ICYmIGNvbnRlbnQudG9TdHJpbmcoXCJ1dGY4XCIpKSkge1xuICAgIG9iamVjdFtwcm9wZXJ0eV0gPSAob2JqZWN0W3Byb3BlcnR5XSB8fCBcIlwiKSArIGNvbnRlbnQ7XG4gICAgbWFkZUNoYW5nZXMgPSB0cnVlO1xuICB9IFxuICByZXR1cm4gbWFkZUNoYW5nZXM7XG59XG4iXX0=
