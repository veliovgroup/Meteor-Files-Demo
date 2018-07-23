(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var _ = Package.underscore._;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Boilerplate;

var require = meteorInstall({"node_modules":{"meteor":{"boilerplate-generator":{"generator.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/boilerplate-generator/generator.js                                                                       //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

module.export({
  Boilerplate: () => Boilerplate
});
let readFile;
module.watch(require("fs"), {
  readFile(v) {
    readFile = v;
  }

}, 0);
let createStream;
module.watch(require("combined-stream2"), {
  create(v) {
    createStream = v;
  }

}, 1);
let WebBrowserTemplate;
module.watch(require("./template-web.browser"), {
  default(v) {
    WebBrowserTemplate = v;
  }

}, 2);
let WebCordovaTemplate;
module.watch(require("./template-web.cordova"), {
  default(v) {
    WebCordovaTemplate = v;
  }

}, 3);

// Copied from webapp_server
const readUtf8FileSync = filename => Meteor.wrapAsync(readFile)(filename, 'utf8');

const identity = value => value;

function appendToStream(chunk, stream) {
  if (typeof chunk === "string") {
    stream.append(Buffer.from(chunk, "utf8"));
  } else if (Buffer.isBuffer(chunk) || typeof chunk.read === "function") {
    stream.append(chunk);
  }
}

let shouldWarnAboutToHTMLDeprecation = !Meteor.isProduction;

class Boilerplate {
  constructor(arch, manifest, options = {}) {
    const {
      headTemplate,
      closeTemplate
    } = getTemplate(arch);
    this.headTemplate = headTemplate;
    this.closeTemplate = closeTemplate;
    this.baseData = null;

    this._generateBoilerplateFromManifest(manifest, options);
  }

  toHTML(extraData) {
    if (shouldWarnAboutToHTMLDeprecation) {
      shouldWarnAboutToHTMLDeprecation = false;
      console.error("The Boilerplate#toHTML method has been deprecated. " + "Please use Boilerplate#toHTMLStream instead.");
      console.trace();
    } // Calling .await() requires a Fiber.


    return this.toHTMLAsync(extraData).await();
  } // Returns a Promise that resolves to a string of HTML.


  toHTMLAsync(extraData) {
    return new Promise((resolve, reject) => {
      const stream = this.toHTMLStream(extraData);
      const chunks = [];
      stream.on("data", chunk => chunks.push(chunk));
      stream.on("end", () => {
        resolve(Buffer.concat(chunks).toString("utf8"));
      });
      stream.on("error", reject);
    });
  } // The 'extraData' argument can be used to extend 'self.baseData'. Its
  // purpose is to allow you to specify data that you might not know at
  // the time that you construct the Boilerplate object. (e.g. it is used
  // by 'webapp' to specify data that is only known at request-time).
  // this returns a stream


  toHTMLStream(extraData) {
    if (!this.baseData || !this.headTemplate || !this.closeTemplate) {
      throw new Error('Boilerplate did not instantiate correctly.');
    }

    const data = (0, _objectSpread2.default)({}, this.baseData, extraData);
    const start = "<!DOCTYPE html>\n" + this.headTemplate(data);
    const {
      body,
      dynamicBody
    } = data;
    const end = this.closeTemplate(data);
    const response = createStream();
    appendToStream(start, response);

    if (body) {
      appendToStream(body, response);
    }

    if (dynamicBody) {
      appendToStream(dynamicBody, response);
    }

    appendToStream(end, response);
    return response;
  } // XXX Exported to allow client-side only changes to rebuild the boilerplate
  // without requiring a full server restart.
  // Produces an HTML string with given manifest and boilerplateSource.
  // Optionally takes urlMapper in case urls from manifest need to be prefixed
  // or rewritten.
  // Optionally takes pathMapper for resolving relative file system paths.
  // Optionally allows to override fields of the data context.


  _generateBoilerplateFromManifest(manifest, {
    urlMapper = identity,
    pathMapper = identity,
    baseDataExtension,
    inline
  } = {}) {
    const boilerplateBaseData = (0, _objectSpread2.default)({
      css: [],
      js: [],
      head: '',
      body: '',
      meteorManifest: JSON.stringify(manifest)
    }, baseDataExtension);
    manifest.forEach(item => {
      const urlPath = urlMapper(item.url);
      const itemObj = {
        url: urlPath
      };

      if (inline) {
        itemObj.scriptContent = readUtf8FileSync(pathMapper(item.path));
        itemObj.inline = true;
      }

      if (item.type === 'css' && item.where === 'client') {
        boilerplateBaseData.css.push(itemObj);
      }

      if (item.type === 'js' && item.where === 'client' && // Dynamic JS modules should not be loaded eagerly in the
      // initial HTML of the app.
      !item.path.startsWith('dynamic/')) {
        boilerplateBaseData.js.push(itemObj);
      }

      if (item.type === 'head') {
        boilerplateBaseData.head = readUtf8FileSync(pathMapper(item.path));
      }

      if (item.type === 'body') {
        boilerplateBaseData.body = readUtf8FileSync(pathMapper(item.path));
      }
    });
    this.baseData = boilerplateBaseData;
  }

}

; // Returns a template function that, when called, produces the boilerplate
// html as a string.

function getTemplate(arch) {
  const prefix = arch.split(".", 2).join(".");

  if (prefix === "web.browser") {
    return WebBrowserTemplate;
  }

  if (prefix === "web.cordova") {
    return WebCordovaTemplate;
  }

  throw new Error("Unsupported arch: " + arch);
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template-web.browser.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/boilerplate-generator/template-web.browser.js                                                            //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({
  headTemplate: () => headTemplate,
  closeTemplate: () => closeTemplate
});
let template;
module.watch(require("./template"), {
  default(v) {
    template = v;
  }

}, 0);

const headTemplate = ({
  css,
  htmlAttributes,
  bundledJsCssUrlRewriteHook,
  head,
  dynamicHead
}) => {
  var headSections = head.split(/<meteor-bundled-css[^<>]*>/, 2);
  var cssBundle = [...(css || []).map(file => template('  <link rel="stylesheet" type="text/css" class="__meteor-css__" href="<%- href %>">')({
    href: bundledJsCssUrlRewriteHook(file.url)
  }))].join('\n');
  return ['<html' + Object.keys(htmlAttributes || {}).map(key => template(' <%= attrName %>="<%- attrValue %>"')({
    attrName: key,
    attrValue: htmlAttributes[key]
  })).join('') + '>', '<head>', headSections.length === 1 ? [cssBundle, headSections[0]].join('\n') : [headSections[0], cssBundle, headSections[1]].join('\n'), dynamicHead, '</head>', '<body>'].join('\n');
};

const closeTemplate = ({
  meteorRuntimeConfig,
  rootUrlPathPrefix,
  inlineScriptsAllowed,
  js,
  additionalStaticJs,
  bundledJsCssUrlRewriteHook
}) => ['', inlineScriptsAllowed ? template('  <script type="text/javascript">__meteor_runtime_config__ = JSON.parse(decodeURIComponent(<%= conf %>))</script>')({
  conf: meteorRuntimeConfig
}) : template('  <script type="text/javascript" src="<%- src %>/meteor_runtime_config.js"></script>')({
  src: rootUrlPathPrefix
}), '', ...(js || []).map(file => template('  <script type="text/javascript" src="<%- src %>"></script>')({
  src: bundledJsCssUrlRewriteHook(file.url)
})), ...(additionalStaticJs || []).map(({
  contents,
  pathname
}) => inlineScriptsAllowed ? template('  <script><%= contents %></script>')({
  contents
}) : template('  <script type="text/javascript" src="<%- src %>"></script>')({
  src: rootUrlPathPrefix + pathname
})), '', '', '</body>', '</html>'].join('\n');
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template-web.cordova.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/boilerplate-generator/template-web.cordova.js                                                            //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({
  headTemplate: () => headTemplate,
  closeTemplate: () => closeTemplate
});
let template;
module.watch(require("./template"), {
  default(v) {
    template = v;
  }

}, 0);

const headTemplate = ({
  meteorRuntimeConfig,
  rootUrlPathPrefix,
  inlineScriptsAllowed,
  css,
  js,
  additionalStaticJs,
  htmlAttributes,
  bundledJsCssUrlRewriteHook,
  head,
  dynamicHead
}) => {
  var headSections = head.split(/<meteor-bundled-css[^<>]*>/, 2);
  var cssBundle = [// We are explicitly not using bundledJsCssUrlRewriteHook: in cordova we serve assets up directly from disk, so rewriting the URL does not make sense
  ...(css || []).map(file => template('  <link rel="stylesheet" type="text/css" class="__meteor-css__" href="<%- href %>">')({
    href: file.url
  }))].join('\n');
  return ['<html>', '<head>', '  <meta charset="utf-8">', '  <meta name="format-detection" content="telephone=no">', '  <meta name="viewport" content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1, width=device-width, height=device-height, viewport-fit=cover">', '  <meta name="msapplication-tap-highlight" content="no">', '  <meta http-equiv="Content-Security-Policy" content="default-src * gap: data: blob: \'unsafe-inline\' \'unsafe-eval\' ws: wss:;">', headSections.length === 1 ? [cssBundle, headSections[0]].join('\n') : [headSections[0], cssBundle, headSections[1]].join('\n'), '  <script type="text/javascript">', template('    __meteor_runtime_config__ = JSON.parse(decodeURIComponent(<%= conf %>));')({
    conf: meteorRuntimeConfig
  }), '    if (/Android/i.test(navigator.userAgent)) {', // When Android app is emulated, it cannot connect to localhost,
  // instead it should connect to 10.0.2.2
  // (unless we\'re using an http proxy; then it works!)
  '      if (!__meteor_runtime_config__.httpProxyPort) {', '        __meteor_runtime_config__.ROOT_URL = (__meteor_runtime_config__.ROOT_URL || \'\').replace(/localhost/i, \'10.0.2.2\');', '        __meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL = (__meteor_runtime_config__.DDP_DEFAULT_CONNECTION_URL || \'\').replace(/localhost/i, \'10.0.2.2\');', '      }', '    }', '  </script>', '', '  <script type="text/javascript" src="/cordova.js"></script>', ...(js || []).map(file => template('  <script type="text/javascript" src="<%- src %>"></script>')({
    src: file.url
  })), ...(additionalStaticJs || []).map(({
    contents,
    pathname
  }) => inlineScriptsAllowed ? template('  <script><%= contents %></script>')({
    contents
  }) : template('  <script type="text/javascript" src="<%- src %>"></script>')({
    src: rootUrlPathPrefix + pathname
  })), '', head, '</head>', '', '<body>'].join('\n');
};

function closeTemplate() {
  return "</body>\n</html>";
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"template.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/boilerplate-generator/template.js                                                                        //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({
  default: () => template
});

let _;

module.watch(require("meteor/underscore"), {
  _(v) {
    _ = v;
  }

}, 0);

function template(text) {
  return _.template(text, null, {
    evaluate: /<%([\s\S]+?)%>/g,
    interpolate: /<%=([\s\S]+?)%>/g,
    escape: /<%-([\s\S]+?)%>/g
  });
}

;
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"combined-stream2":{"package.json":function(require,exports){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// node_modules/meteor/boilerplate-generator/node_modules/combined-stream2/package.json                              //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
exports.name = "combined-stream2";
exports.version = "1.1.2";
exports.main = "index.js";

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// node_modules/meteor/boilerplate-generator/node_modules/combined-stream2/index.js                                  //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.useNode();
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/boilerplate-generator/generator.js");

/* Exports */
Package._define("boilerplate-generator", exports, {
  Boilerplate: Boilerplate
});

})();

//# sourceURL=meteor://💻app/packages/boilerplate-generator.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYm9pbGVycGxhdGUtZ2VuZXJhdG9yL2dlbmVyYXRvci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYm9pbGVycGxhdGUtZ2VuZXJhdG9yL3RlbXBsYXRlLXdlYi5icm93c2VyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9ib2lsZXJwbGF0ZS1nZW5lcmF0b3IvdGVtcGxhdGUtd2ViLmNvcmRvdmEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2JvaWxlcnBsYXRlLWdlbmVyYXRvci90ZW1wbGF0ZS5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJCb2lsZXJwbGF0ZSIsInJlYWRGaWxlIiwid2F0Y2giLCJyZXF1aXJlIiwidiIsImNyZWF0ZVN0cmVhbSIsImNyZWF0ZSIsIldlYkJyb3dzZXJUZW1wbGF0ZSIsImRlZmF1bHQiLCJXZWJDb3Jkb3ZhVGVtcGxhdGUiLCJyZWFkVXRmOEZpbGVTeW5jIiwiZmlsZW5hbWUiLCJNZXRlb3IiLCJ3cmFwQXN5bmMiLCJpZGVudGl0eSIsInZhbHVlIiwiYXBwZW5kVG9TdHJlYW0iLCJjaHVuayIsInN0cmVhbSIsImFwcGVuZCIsIkJ1ZmZlciIsImZyb20iLCJpc0J1ZmZlciIsInJlYWQiLCJzaG91bGRXYXJuQWJvdXRUb0hUTUxEZXByZWNhdGlvbiIsImlzUHJvZHVjdGlvbiIsImNvbnN0cnVjdG9yIiwiYXJjaCIsIm1hbmlmZXN0Iiwib3B0aW9ucyIsImhlYWRUZW1wbGF0ZSIsImNsb3NlVGVtcGxhdGUiLCJnZXRUZW1wbGF0ZSIsImJhc2VEYXRhIiwiX2dlbmVyYXRlQm9pbGVycGxhdGVGcm9tTWFuaWZlc3QiLCJ0b0hUTUwiLCJleHRyYURhdGEiLCJjb25zb2xlIiwiZXJyb3IiLCJ0cmFjZSIsInRvSFRNTEFzeW5jIiwiYXdhaXQiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInRvSFRNTFN0cmVhbSIsImNodW5rcyIsIm9uIiwicHVzaCIsImNvbmNhdCIsInRvU3RyaW5nIiwiRXJyb3IiLCJkYXRhIiwic3RhcnQiLCJib2R5IiwiZHluYW1pY0JvZHkiLCJlbmQiLCJyZXNwb25zZSIsInVybE1hcHBlciIsInBhdGhNYXBwZXIiLCJiYXNlRGF0YUV4dGVuc2lvbiIsImlubGluZSIsImJvaWxlcnBsYXRlQmFzZURhdGEiLCJjc3MiLCJqcyIsImhlYWQiLCJtZXRlb3JNYW5pZmVzdCIsIkpTT04iLCJzdHJpbmdpZnkiLCJmb3JFYWNoIiwiaXRlbSIsInVybFBhdGgiLCJ1cmwiLCJpdGVtT2JqIiwic2NyaXB0Q29udGVudCIsInBhdGgiLCJ0eXBlIiwid2hlcmUiLCJzdGFydHNXaXRoIiwicHJlZml4Iiwic3BsaXQiLCJqb2luIiwidGVtcGxhdGUiLCJodG1sQXR0cmlidXRlcyIsImJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rIiwiZHluYW1pY0hlYWQiLCJoZWFkU2VjdGlvbnMiLCJjc3NCdW5kbGUiLCJtYXAiLCJmaWxlIiwiaHJlZiIsIk9iamVjdCIsImtleXMiLCJrZXkiLCJhdHRyTmFtZSIsImF0dHJWYWx1ZSIsImxlbmd0aCIsIm1ldGVvclJ1bnRpbWVDb25maWciLCJyb290VXJsUGF0aFByZWZpeCIsImlubGluZVNjcmlwdHNBbGxvd2VkIiwiYWRkaXRpb25hbFN0YXRpY0pzIiwiY29uZiIsInNyYyIsImNvbnRlbnRzIiwicGF0aG5hbWUiLCJfIiwidGV4dCIsImV2YWx1YXRlIiwiaW50ZXJwb2xhdGUiLCJlc2NhcGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxPQUFPQyxNQUFQLENBQWM7QUFBQ0MsZUFBWSxNQUFJQTtBQUFqQixDQUFkO0FBQTZDLElBQUlDLFFBQUo7QUFBYUgsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLElBQVIsQ0FBYixFQUEyQjtBQUFDRixXQUFTRyxDQUFULEVBQVc7QUFBQ0gsZUFBU0csQ0FBVDtBQUFXOztBQUF4QixDQUEzQixFQUFxRCxDQUFyRDtB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LFNBQVM4RSxRQUFULENBQWtCd0IsSUFBbEIsRUFBd0I7QUFDckMsU0FBT0QsRUFBRXZCLFFBQUYsQ0FBV3dCLElBQVgsRUFBaUIsSUFBakIsRUFBdUI7QUFDNUJDLGNBQWMsaUJBRGM7QUFFNUJDLGlCQUFjLGtCQUZjO0FBRzVCQyxZQUFjO0FBSGMsR0FBdkIsQ0FBUDtBQUtEOztBQUFBLEMiLCJmaWxlIjoiL3BhY2thZ2VzL2JvaWxlcnBsYXRlLWdlbmVyYXRvci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHJlYWRGaWxlIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgY3JlYXRlIGFzIGNyZWF0ZVN0cmVhbSB9IGZyb20gXCJjb21iaW5lZC1zdHJlYW0yXCI7XG5cbmltcG9ydCBXZWJCcm93c2VyVGVtcGxhdGUgZnJvbSAnLi90ZW1wbGF0ZS13ZWIuYnJvd3Nlcic7XG5pbXBvcnQgV2ViQ29yZG92YVRlbXBsYXRlIGZyb20gJy4vdGVtcGxhdGUtd2ViLmNvcmRvdmEnO1xuXG4vLyBDb3BpZWQgZnJvbSB3ZWJhcHBfc2VydmVyXG5jb25zdCByZWFkVXRmOEZpbGVTeW5jID0gZmlsZW5hbWUgPT4gTWV0ZW9yLndyYXBBc3luYyhyZWFkRmlsZSkoZmlsZW5hbWUsICd1dGY4Jyk7XG5cbmNvbnN0IGlkZW50aXR5ID0gdmFsdWUgPT4gdmFsdWU7XG5cbmZ1bmN0aW9uIGFwcGVuZFRvU3RyZWFtKGNodW5rLCBzdHJlYW0pIHtcbiAgaWYgKHR5cGVvZiBjaHVuayA9PT0gXCJzdHJpbmdcIikge1xuICAgIHN0cmVhbS5hcHBlbmQoQnVmZmVyLmZyb20oY2h1bmssIFwidXRmOFwiKSk7XG4gIH0gZWxzZSBpZiAoQnVmZmVyLmlzQnVmZmVyKGNodW5rKSB8fFxuICAgICAgICAgICAgIHR5cGVvZiBjaHVuay5yZWFkID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBzdHJlYW0uYXBwZW5kKGNodW5rKTtcbiAgfVxufVxuXG5sZXQgc2hvdWxkV2FybkFib3V0VG9IVE1MRGVwcmVjYXRpb24gPSAhIE1ldGVvci5pc1Byb2R1Y3Rpb247XG5cbmV4cG9ydCBjbGFzcyBCb2lsZXJwbGF0ZSB7XG4gIGNvbnN0cnVjdG9yKGFyY2gsIG1hbmlmZXN0LCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCB7IGhlYWRUZW1wbGF0ZSwgY2xvc2VUZW1wbGF0ZSB9ID0gZ2V0VGVtcGxhdGUoYXJjaCk7XG4gICAgdGhpcy5oZWFkVGVtcGxhdGUgPSBoZWFkVGVtcGxhdGU7XG4gICAgdGhpcy5jbG9zZVRlbXBsYXRlID0gY2xvc2VUZW1wbGF0ZTtcbiAgICB0aGlzLmJhc2VEYXRhID0gbnVsbDtcblxuICAgIHRoaXMuX2dlbmVyYXRlQm9pbGVycGxhdGVGcm9tTWFuaWZlc3QoXG4gICAgICBtYW5pZmVzdCxcbiAgICAgIG9wdGlvbnNcbiAgICApO1xuICB9XG5cbiAgdG9IVE1MKGV4dHJhRGF0YSkge1xuICAgIGlmIChzaG91bGRXYXJuQWJvdXRUb0hUTUxEZXByZWNhdGlvbikge1xuICAgICAgc2hvdWxkV2FybkFib3V0VG9IVE1MRGVwcmVjYXRpb24gPSBmYWxzZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgIFwiVGhlIEJvaWxlcnBsYXRlI3RvSFRNTCBtZXRob2QgaGFzIGJlZW4gZGVwcmVjYXRlZC4gXCIgK1xuICAgICAgICAgIFwiUGxlYXNlIHVzZSBCb2lsZXJwbGF0ZSN0b0hUTUxTdHJlYW0gaW5zdGVhZC5cIlxuICAgICAgKTtcbiAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICB9XG5cbiAgICAvLyBDYWxsaW5nIC5hd2FpdCgpIHJlcXVpcmVzIGEgRmliZXIuXG4gICAgcmV0dXJuIHRoaXMudG9IVE1MQXN5bmMoZXh0cmFEYXRhKS5hd2FpdCgpO1xuICB9XG5cbiAgLy8gUmV0dXJucyBhIFByb21pc2UgdGhhdCByZXNvbHZlcyB0byBhIHN0cmluZyBvZiBIVE1MLlxuICB0b0hUTUxBc3luYyhleHRyYURhdGEpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3Qgc3RyZWFtID0gdGhpcy50b0hUTUxTdHJlYW0oZXh0cmFEYXRhKTtcbiAgICAgIGNvbnN0IGNodW5rcyA9IFtdO1xuICAgICAgc3RyZWFtLm9uKFwiZGF0YVwiLCBjaHVuayA9PiBjaHVua3MucHVzaChjaHVuaykpO1xuICAgICAgc3RyZWFtLm9uKFwiZW5kXCIsICgpID0+IHtcbiAgICAgICAgcmVzb2x2ZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoXCJ1dGY4XCIpKTtcbiAgICAgIH0pO1xuICAgICAgc3RyZWFtLm9uKFwiZXJyb3JcIiwgcmVqZWN0KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFRoZSAnZXh0cmFEYXRhJyBhcmd1bWVudCBjYW4gYmUgdXNlZCB0byBleHRlbmQgJ3NlbGYuYmFzZURhdGEnLiBJdHNcbiAgLy8gcHVycG9zZSBpcyB0byBhbGxvdyB5b3UgdG8gc3BlY2lmeSBkYXRhIHRoYXQgeW91IG1pZ2h0IG5vdCBrbm93IGF0XG4gIC8vIHRoZSB0aW1lIHRoYXQgeW91IGNvbnN0cnVjdCB0aGUgQm9pbGVycGxhdGUgb2JqZWN0LiAoZS5nLiBpdCBpcyB1c2VkXG4gIC8vIGJ5ICd3ZWJhcHAnIHRvIHNwZWNpZnkgZGF0YSB0aGF0IGlzIG9ubHkga25vd24gYXQgcmVxdWVzdC10aW1lKS5cbiAgLy8gdGhpcyByZXR1cm5zIGEgc3RyZWFtXG4gIHRvSFRNTFN0cmVhbShleHRyYURhdGEpIHtcbiAgICBpZiAoIXRoaXMuYmFzZURhdGEgfHwgIXRoaXMuaGVhZFRlbXBsYXRlIHx8ICF0aGlzLmNsb3NlVGVtcGxhdGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQm9pbGVycGxhdGUgZGlkIG5vdCBpbnN0YW50aWF0ZSBjb3JyZWN0bHkuJyk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IHsuLi50aGlzLmJhc2VEYXRhLCAuLi5leHRyYURhdGF9O1xuICAgIGNvbnN0IHN0YXJ0ID0gXCI8IURPQ1RZUEUgaHRtbD5cXG5cIiArIHRoaXMuaGVhZFRlbXBsYXRlKGRhdGEpO1xuXG4gICAgY29uc3QgeyBib2R5LCBkeW5hbWljQm9keSB9ID0gZGF0YTtcblxuICAgIGNvbnN0IGVuZCA9IHRoaXMuY2xvc2VUZW1wbGF0ZShkYXRhKTtcbiAgICBjb25zdCByZXNwb25zZSA9IGNyZWF0ZVN0cmVhbSgpO1xuXG4gICAgYXBwZW5kVG9TdHJlYW0oc3RhcnQsIHJlc3BvbnNlKTtcblxuICAgIGlmIChib2R5KSB7XG4gICAgICBhcHBlbmRUb1N0cmVhbShib2R5LCByZXNwb25zZSk7XG4gICAgfVxuXG4gICAgaWYgKGR5bmFtaWNCb2R5KSB7XG4gICAgICBhcHBlbmRUb1N0cmVhbShkeW5hbWljQm9keSwgcmVzcG9uc2UpO1xuICAgIH1cblxuICAgIGFwcGVuZFRvU3RyZWFtKGVuZCwgcmVzcG9uc2UpO1xuXG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9XG5cbiAgLy8gWFhYIEV4cG9ydGVkIHRvIGFsbG93IGNsaWVudC1zaWRlIG9ubHkgY2hhbmdlcyB0byByZWJ1aWxkIHRoZSBib2lsZXJwbGF0ZVxuICAvLyB3aXRob3V0IHJlcXVpcmluZyBhIGZ1bGwgc2VydmVyIHJlc3RhcnQuXG4gIC8vIFByb2R1Y2VzIGFuIEhUTUwgc3RyaW5nIHdpdGggZ2l2ZW4gbWFuaWZlc3QgYW5kIGJvaWxlcnBsYXRlU291cmNlLlxuICAvLyBPcHRpb25hbGx5IHRha2VzIHVybE1hcHBlciBpbiBjYXNlIHVybHMgZnJvbSBtYW5pZmVzdCBuZWVkIHRvIGJlIHByZWZpeGVkXG4gIC8vIG9yIHJld3JpdHRlbi5cbiAgLy8gT3B0aW9uYWxseSB0YWtlcyBwYXRoTWFwcGVyIGZvciByZXNvbHZpbmcgcmVsYXRpdmUgZmlsZSBzeXN0ZW0gcGF0aHMuXG4gIC8vIE9wdGlvbmFsbHkgYWxsb3dzIHRvIG92ZXJyaWRlIGZpZWxkcyBvZiB0aGUgZGF0YSBjb250ZXh0LlxuICBfZ2VuZXJhdGVCb2lsZXJwbGF0ZUZyb21NYW5pZmVzdChtYW5pZmVzdCwge1xuICAgIHVybE1hcHBlciA9IGlkZW50aXR5LFxuICAgIHBhdGhNYXBwZXIgPSBpZGVudGl0eSxcbiAgICBiYXNlRGF0YUV4dGVuc2lvbixcbiAgICBpbmxpbmUsXG4gIH0gPSB7fSkge1xuXG4gICAgY29uc3QgYm9pbGVycGxhdGVCYXNlRGF0YSA9IHtcbiAgICAgIGNzczogW10sXG4gICAgICBqczogW10sXG4gICAgICBoZWFkOiAnJyxcbiAgICAgIGJvZHk6ICcnLFxuICAgICAgbWV0ZW9yTWFuaWZlc3Q6IEpTT04uc3RyaW5naWZ5KG1hbmlmZXN0KSxcbiAgICAgIC4uLmJhc2VEYXRhRXh0ZW5zaW9uLFxuICAgIH07XG5cbiAgICBtYW5pZmVzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgY29uc3QgdXJsUGF0aCA9IHVybE1hcHBlcihpdGVtLnVybCk7XG4gICAgICBjb25zdCBpdGVtT2JqID0geyB1cmw6IHVybFBhdGggfTtcblxuICAgICAgaWYgKGlubGluZSkge1xuICAgICAgICBpdGVtT2JqLnNjcmlwdENvbnRlbnQgPSByZWFkVXRmOEZpbGVTeW5jKFxuICAgICAgICAgIHBhdGhNYXBwZXIoaXRlbS5wYXRoKSk7XG4gICAgICAgIGl0ZW1PYmouaW5saW5lID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2NzcycgJiYgaXRlbS53aGVyZSA9PT0gJ2NsaWVudCcpIHtcbiAgICAgICAgYm9pbGVycGxhdGVCYXNlRGF0YS5jc3MucHVzaChpdGVtT2JqKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2pzJyAmJiBpdGVtLndoZXJlID09PSAnY2xpZW50JyAmJlxuICAgICAgICAvLyBEeW5hbWljIEpTIG1vZHVsZXMgc2hvdWxkIG5vdCBiZSBsb2FkZWQgZWFnZXJseSBpbiB0aGVcbiAgICAgICAgLy8gaW5pdGlhbCBIVE1MIG9mIHRoZSBhcHAuXG4gICAgICAgICFpdGVtLnBhdGguc3RhcnRzV2l0aCgnZHluYW1pYy8nKSkge1xuICAgICAgICBib2lsZXJwbGF0ZUJhc2VEYXRhLmpzLnB1c2goaXRlbU9iaik7XG4gICAgICB9XG5cbiAgICAgIGlmIChpdGVtLnR5cGUgPT09ICdoZWFkJykge1xuICAgICAgICBib2lsZXJwbGF0ZUJhc2VEYXRhLmhlYWQgPVxuICAgICAgICAgIHJlYWRVdGY4RmlsZVN5bmMocGF0aE1hcHBlcihpdGVtLnBhdGgpKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2JvZHknKSB7XG4gICAgICAgIGJvaWxlcnBsYXRlQmFzZURhdGEuYm9keSA9XG4gICAgICAgICAgcmVhZFV0ZjhGaWxlU3luYyhwYXRoTWFwcGVyKGl0ZW0ucGF0aCkpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5iYXNlRGF0YSA9IGJvaWxlcnBsYXRlQmFzZURhdGE7XG4gIH1cbn07XG5cbi8vIFJldHVybnMgYSB0ZW1wbGF0ZSBmdW5jdGlvbiB0aGF0LCB3aGVuIGNhbGxlZCwgcHJvZHVjZXMgdGhlIGJvaWxlcnBsYXRlXG4vLyBodG1sIGFzIGEgc3RyaW5nLlxuZnVuY3Rpb24gZ2V0VGVtcGxhdGUoYXJjaCkge1xuICBjb25zdCBwcmVmaXggPSBhcmNoLnNwbGl0KFwiLlwiLCAyKS5qb2luKFwiLlwiKTtcblxuICBpZiAocHJlZml4ID09PSBcIndlYi5icm93c2VyXCIpIHtcbiAgICByZXR1cm4gV2ViQnJvd3NlclRlbXBsYXRlO1xuICB9XG5cbiAgaWYgKHByZWZpeCA9PT0gXCJ3ZWIuY29yZG92YVwiKSB7XG4gICAgcmV0dXJuIFdlYkNvcmRvdmFUZW1wbGF0ZTtcbiAgfVxuXG4gIHRocm93IG5ldyBFcnJvcihcIlVuc3VwcG9ydGVkIGFyY2g6IFwiICsgYXJjaCk7XG59XG4iLCJpbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi90ZW1wbGF0ZSc7XG5cbmV4cG9ydCBjb25zdCBoZWFkVGVtcGxhdGUgPSAoe1xuICBjc3MsXG4gIGh0bWxBdHRyaWJ1dGVzLFxuICBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayxcbiAgaGVhZCxcbiAgZHluYW1pY0hlYWQsXG59KSA9PiB7XG4gIHZhciBoZWFkU2VjdGlvbnMgPSBoZWFkLnNwbGl0KC88bWV0ZW9yLWJ1bmRsZWQtY3NzW148Pl0qPi8sIDIpO1xuICB2YXIgY3NzQnVuZGxlID0gWy4uLihjc3MgfHwgW10pLm1hcChmaWxlID0+XG4gICAgdGVtcGxhdGUoJyAgPGxpbmsgcmVsPVwic3R5bGVzaGVldFwiIHR5cGU9XCJ0ZXh0L2Nzc1wiIGNsYXNzPVwiX19tZXRlb3ItY3NzX19cIiBocmVmPVwiPCUtIGhyZWYgJT5cIj4nKSh7XG4gICAgICBocmVmOiBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayhmaWxlLnVybCksXG4gICAgfSlcbiAgKV0uam9pbignXFxuJyk7XG5cbiAgcmV0dXJuIFtcbiAgICAnPGh0bWwnICsgT2JqZWN0LmtleXMoaHRtbEF0dHJpYnV0ZXMgfHwge30pLm1hcChcbiAgICAgIGtleSA9PiB0ZW1wbGF0ZSgnIDwlPSBhdHRyTmFtZSAlPj1cIjwlLSBhdHRyVmFsdWUgJT5cIicpKHtcbiAgICAgICAgYXR0ck5hbWU6IGtleSxcbiAgICAgICAgYXR0clZhbHVlOiBodG1sQXR0cmlidXRlc1trZXldLFxuICAgICAgfSlcbiAgICApLmpvaW4oJycpICsgJz4nLFxuICAgIFxuICAgICc8aGVhZD4nLFxuXG4gICAgKGhlYWRTZWN0aW9ucy5sZW5ndGggPT09IDEpXG4gICAgICA/IFtjc3NCdW5kbGUsIGhlYWRTZWN0aW9uc1swXV0uam9pbignXFxuJylcbiAgICAgIDogW2hlYWRTZWN0aW9uc1swXSwgY3NzQnVuZGxlLCBoZWFkU2VjdGlvbnNbMV1dLmpvaW4oJ1xcbicpLFxuXG4gICAgZHluYW1pY0hlYWQsXG4gICAgJzwvaGVhZD4nLFxuICAgICc8Ym9keT4nLFxuICBdLmpvaW4oJ1xcbicpO1xufTtcblxuLy8gVGVtcGxhdGUgZnVuY3Rpb24gZm9yIHJlbmRlcmluZyB0aGUgYm9pbGVycGxhdGUgaHRtbCBmb3IgYnJvd3NlcnNcbmV4cG9ydCBjb25zdCBjbG9zZVRlbXBsYXRlID0gKHtcbiAgbWV0ZW9yUnVudGltZUNvbmZpZyxcbiAgcm9vdFVybFBhdGhQcmVmaXgsXG4gIGlubGluZVNjcmlwdHNBbGxvd2VkLFxuICBqcyxcbiAgYWRkaXRpb25hbFN0YXRpY0pzLFxuICBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayxcbn0pID0+IFtcbiAgJycsXG4gIGlubGluZVNjcmlwdHNBbGxvd2VkXG4gICAgPyB0ZW1wbGF0ZSgnICA8c2NyaXB0IHR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIj5fX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fID0gSlNPTi5wYXJzZShkZWNvZGVVUklDb21wb25lbnQoPCU9IGNvbmYgJT4pKTwvc2NyaXB0PicpKHtcbiAgICAgIGNvbmY6IG1ldGVvclJ1bnRpbWVDb25maWcsXG4gICAgfSlcbiAgICA6IHRlbXBsYXRlKCcgIDxzY3JpcHQgdHlwZT1cInRleHQvamF2YXNjcmlwdFwiIHNyYz1cIjwlLSBzcmMgJT4vbWV0ZW9yX3J1bnRpbWVfY29uZmlnLmpzXCI+PC9zY3JpcHQ+Jykoe1xuICAgICAgc3JjOiByb290VXJsUGF0aFByZWZpeCxcbiAgICB9KSxcbiAgJycsXG5cbiAgLi4uKGpzIHx8IFtdKS5tYXAoZmlsZSA9PlxuICAgIHRlbXBsYXRlKCcgIDxzY3JpcHQgdHlwZT1cInRleHQvamF2YXNjcmlwdFwiIHNyYz1cIjwlLSBzcmMgJT5cIj48L3NjcmlwdD4nKSh7XG4gICAgICBzcmM6IGJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rKGZpbGUudXJsKSxcbiAgICB9KVxuICApLFxuXG4gIC4uLihhZGRpdGlvbmFsU3RhdGljSnMgfHwgW10pLm1hcCgoeyBjb250ZW50cywgcGF0aG5hbWUgfSkgPT4gKFxuICAgIGlubGluZVNjcmlwdHNBbGxvd2VkXG4gICAgICA/IHRlbXBsYXRlKCcgIDxzY3JpcHQ+PCU9IGNvbnRlbnRzICU+PC9zY3JpcHQ+Jykoe1xuICAgICAgICBjb250ZW50cyxcbiAgICAgIH0pXG4gICAgICA6IHRlbXBsYXRlKCcgIDxzY3JpcHQgdHlwZT1cInRleHQvamF2YXNjcmlwdFwiIHNyYz1cIjwlLSBzcmMgJT5cIj48L3NjcmlwdD4nKSh7XG4gICAgICAgIHNyYzogcm9vdFVybFBhdGhQcmVmaXggKyBwYXRobmFtZSxcbiAgICAgIH0pXG4gICkpLFxuXG4gICcnLFxuICAnJyxcbiAgJzwvYm9keT4nLFxuICAnPC9odG1sPidcbl0uam9pbignXFxuJyk7XG4iLCJpbXBvcnQgdGVtcGxhdGUgZnJvbSAnLi90ZW1wbGF0ZSc7XG5cbi8vIFRlbXBsYXRlIGZ1bmN0aW9uIGZvciByZW5kZXJpbmcgdGhlIGJvaWxlcnBsYXRlIGh0bWwgZm9yIGNvcmRvdmFcbmV4cG9ydCBjb25zdCBoZWFkVGVtcGxhdGUgPSAoe1xuICBtZXRlb3JSdW50aW1lQ29uZmlnLFxuICByb290VXJsUGF0aFByZWZpeCxcbiAgaW5saW5lU2NyaXB0c0FsbG93ZWQsXG4gIGNzcyxcbiAganMsXG4gIGFkZGl0aW9uYWxTdGF0aWNKcyxcbiAgaHRtbEF0dHJpYnV0ZXMsXG4gIGJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rLFxuICBoZWFkLFxuICBkeW5hbWljSGVhZCxcbn0pID0+IHtcbiAgdmFyIGhlYWRTZWN0aW9ucyA9IGhlYWQuc3BsaXQoLzxtZXRlb3ItYnVuZGxlZC1jc3NbXjw+XSo+LywgMik7XG4gIHZhciBjc3NCdW5kbGUgPSBbXG4gICAgLy8gV2UgYXJlIGV4cGxpY2l0bHkgbm90IHVzaW5nIGJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rOiBpbiBjb3Jkb3ZhIHdlIHNlcnZlIGFzc2V0cyB1cCBkaXJlY3RseSBmcm9tIGRpc2ssIHNvIHJld3JpdGluZyB0aGUgVVJMIGRvZXMgbm90IG1ha2Ugc2Vuc2VcbiAgICAuLi4oY3NzIHx8IFtdKS5tYXAoZmlsZSA9PlxuICAgICAgdGVtcGxhdGUoJyAgPGxpbmsgcmVsPVwic3R5bGVzaGVldFwiIHR5cGU9XCJ0ZXh0L2Nzc1wiIGNsYXNzPVwiX19tZXRlb3ItY3NzX19cIiBocmVmPVwiPCUtIGhyZWYgJT5cIj4nKSh7XG4gICAgICAgIGhyZWY6IGZpbGUudXJsLFxuICAgICAgfSlcbiAgKV0uam9pbignXFxuJyk7XG5cbiAgcmV0dXJuIFtcbiAgICAnPGh0bWw+JyxcbiAgICAnPGhlYWQ+JyxcbiAgICAnICA8bWV0YSBjaGFyc2V0PVwidXRmLThcIj4nLFxuICAgICcgIDxtZXRhIG5hbWU9XCJmb3JtYXQtZGV0ZWN0aW9uXCIgY29udGVudD1cInRlbGVwaG9uZT1ub1wiPicsXG4gICAgJyAgPG1ldGEgbmFtZT1cInZpZXdwb3J0XCIgY29udGVudD1cInVzZXItc2NhbGFibGU9bm8sIGluaXRpYWwtc2NhbGU9MSwgbWF4aW11bS1zY2FsZT0xLCBtaW5pbXVtLXNjYWxlPTEsIHdpZHRoPWRldmljZS13aWR0aCwgaGVpZ2h0PWRldmljZS1oZWlnaHQsIHZpZXdwb3J0LWZpdD1jb3ZlclwiPicsXG4gICAgJyAgPG1ldGEgbmFtZT1cIm1zYXBwbGljYXRpb24tdGFwLWhpZ2hsaWdodFwiIGNvbnRlbnQ9XCJub1wiPicsXG4gICAgJyAgPG1ldGEgaHR0cC1lcXVpdj1cIkNvbnRlbnQtU2VjdXJpdHktUG9saWN5XCIgY29udGVudD1cImRlZmF1bHQtc3JjICogZ2FwOiBkYXRhOiBibG9iOiBcXCd1bnNhZmUtaW5saW5lXFwnIFxcJ3Vuc2FmZS1ldmFsXFwnIHdzOiB3c3M6O1wiPicsXG5cbiAgKGhlYWRTZWN0aW9ucy5sZW5ndGggPT09IDEpXG4gICAgPyBbY3NzQnVuZGxlLCBoZWFkU2VjdGlvbnNbMF1dLmpvaW4oJ1xcbicpXG4gICAgOiBbaGVhZFNlY3Rpb25zWzBdLCBjc3NCdW5kbGUsIGhlYWRTZWN0aW9uc1sxXV0uam9pbignXFxuJyksXG5cbiAgICAnICA8c2NyaXB0IHR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIj4nLFxuICAgIHRlbXBsYXRlKCcgICAgX19tZXRlb3JfcnVudGltZV9jb25maWdfXyA9IEpTT04ucGFyc2UoZGVjb2RlVVJJQ29tcG9uZW50KDwlPSBjb25mICU+KSk7Jykoe1xuICAgICAgY29uZjogbWV0ZW9yUnVudGltZUNvbmZpZyxcbiAgICB9KSxcbiAgICAnICAgIGlmICgvQW5kcm9pZC9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkpIHsnLFxuICAgIC8vIFdoZW4gQW5kcm9pZCBhcHAgaXMgZW11bGF0ZWQsIGl0IGNhbm5vdCBjb25uZWN0IHRvIGxvY2FsaG9zdCxcbiAgICAvLyBpbnN0ZWFkIGl0IHNob3VsZCBjb25uZWN0IHRvIDEwLjAuMi4yXG4gICAgLy8gKHVubGVzcyB3ZVxcJ3JlIHVzaW5nIGFuIGh0dHAgcHJveHk7IHRoZW4gaXQgd29ya3MhKVxuICAgICcgICAgICBpZiAoIV9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uaHR0cFByb3h5UG9ydCkgeycsXG4gICAgJyAgICAgICAgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTCA9IChfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMIHx8IFxcJ1xcJykucmVwbGFjZSgvbG9jYWxob3N0L2ksIFxcJzEwLjAuMi4yXFwnKTsnLFxuICAgICcgICAgICAgIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkwgPSAoX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ERFBfREVGQVVMVF9DT05ORUNUSU9OX1VSTCB8fCBcXCdcXCcpLnJlcGxhY2UoL2xvY2FsaG9zdC9pLCBcXCcxMC4wLjIuMlxcJyk7JyxcbiAgICAnICAgICAgfScsXG4gICAgJyAgICB9JyxcbiAgICAnICA8L3NjcmlwdD4nLFxuICAgICcnLFxuICAgICcgIDxzY3JpcHQgdHlwZT1cInRleHQvamF2YXNjcmlwdFwiIHNyYz1cIi9jb3Jkb3ZhLmpzXCI+PC9zY3JpcHQ+JyxcblxuICAgIC4uLihqcyB8fCBbXSkubWFwKGZpbGUgPT5cbiAgICAgIHRlbXBsYXRlKCcgIDxzY3JpcHQgdHlwZT1cInRleHQvamF2YXNjcmlwdFwiIHNyYz1cIjwlLSBzcmMgJT5cIj48L3NjcmlwdD4nKSh7XG4gICAgICAgIHNyYzogZmlsZS51cmwsXG4gICAgICB9KVxuICAgICksXG5cbiAgICAuLi4oYWRkaXRpb25hbFN0YXRpY0pzIHx8IFtdKS5tYXAoKHsgY29udGVudHMsIHBhdGhuYW1lIH0pID0+IChcbiAgICAgIGlubGluZVNjcmlwdHNBbGxvd2VkXG4gICAgICAgID8gdGVtcGxhdGUoJyAgPHNjcmlwdD48JT0gY29udGVudHMgJT48L3NjcmlwdD4nKSh7XG4gICAgICAgICAgY29udGVudHMsXG4gICAgICAgIH0pXG4gICAgICAgIDogdGVtcGxhdGUoJyAgPHNjcmlwdCB0eXBlPVwidGV4dC9qYXZhc2NyaXB0XCIgc3JjPVwiPCUtIHNyYyAlPlwiPjwvc2NyaXB0PicpKHtcbiAgICAgICAgICBzcmM6IHJvb3RVcmxQYXRoUHJlZml4ICsgcGF0aG5hbWVcbiAgICAgICAgfSlcbiAgICApKSxcbiAgICAnJyxcbiAgICBoZWFkLFxuICAgICc8L2hlYWQ+JyxcbiAgICAnJyxcbiAgICAnPGJvZHk+JyxcbiAgXS5qb2luKCdcXG4nKTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBjbG9zZVRlbXBsYXRlKCkge1xuICByZXR1cm4gXCI8L2JvZHk+XFxuPC9odG1sPlwiO1xufVxuIiwiaW1wb3J0IHsgXyB9IGZyb20gJ21ldGVvci91bmRlcnNjb3JlJztcblxuLy8gQXMgaWRlbnRpZmllZCBpbiBpc3N1ZSAjOTE0OSwgd2hlbiBhbiBhcHBsaWNhdGlvbiBvdmVycmlkZXMgdGhlIGRlZmF1bHRcbi8vIF8udGVtcGxhdGUgc2V0dGluZ3MgdXNpbmcgXy50ZW1wbGF0ZVNldHRpbmdzLCB0aG9zZSBuZXcgc2V0dGluZ3MgYXJlXG4vLyB1c2VkIGFueXdoZXJlIF8udGVtcGxhdGUgaXMgdXNlZCwgaW5jbHVkaW5nIHdpdGhpbiB0aGVcbi8vIGJvaWxlcnBsYXRlLWdlbmVyYXRvci4gVG8gaGFuZGxlIHRoaXMsIF8udGVtcGxhdGUgc2V0dGluZ3MgdGhhdCBoYXZlXG4vLyBiZWVuIHZlcmlmaWVkIHRvIHdvcmsgYXJlIG92ZXJyaWRkZW4gaGVyZSBvbiBlYWNoIF8udGVtcGxhdGUgY2FsbC5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHRlbXBsYXRlKHRleHQpIHtcbiAgcmV0dXJuIF8udGVtcGxhdGUodGV4dCwgbnVsbCwge1xuICAgIGV2YWx1YXRlICAgIDogLzwlKFtcXHNcXFNdKz8pJT4vZyxcbiAgICBpbnRlcnBvbGF0ZSA6IC88JT0oW1xcc1xcU10rPyklPi9nLFxuICAgIGVzY2FwZSAgICAgIDogLzwlLShbXFxzXFxTXSs/KSU+L2csXG4gIH0pO1xufTtcbiJdfQ==
