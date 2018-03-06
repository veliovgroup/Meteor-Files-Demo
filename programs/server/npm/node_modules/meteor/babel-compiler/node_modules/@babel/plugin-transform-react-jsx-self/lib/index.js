"use strict";

exports.__esModule = true;
exports.default = _default;

var _core = require("@babel/core");

var TRACE_ID = "__self";

function _default() {
  var visitor = {
    JSXOpeningElement: function JSXOpeningElement(_ref) {
      var node = _ref.node;

      var id = _core.types.jsxIdentifier(TRACE_ID);

      var trace = _core.types.thisExpression();

      node.attributes.push(_core.types.jsxAttribute(id, _core.types.jsxExpressionContainer(trace)));
    }
  };
  return {
    visitor: visitor
  };
}