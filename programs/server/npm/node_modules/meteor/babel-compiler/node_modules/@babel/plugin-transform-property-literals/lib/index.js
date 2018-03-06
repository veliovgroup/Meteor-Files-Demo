"use strict";

exports.__esModule = true;
exports.default = _default;

var _core = require("@babel/core");

function _default() {
  return {
    visitor: {
      ObjectProperty: {
        exit: function exit(_ref) {
          var node = _ref.node;
          var key = node.key;

          if (!node.computed && _core.types.isIdentifier(key) && !_core.types.isValidES3Identifier(key.name)) {
            node.key = _core.types.stringLiteral(key.name);
          }
        }
      }
    }
  };
}