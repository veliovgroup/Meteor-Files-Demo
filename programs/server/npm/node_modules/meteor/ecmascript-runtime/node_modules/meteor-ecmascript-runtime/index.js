require("core-js/es6/object");
require("core-js/es6/array");
require("core-js/es6/string");
require("core-js/es6/function");
require("core-js/fn/array/includes");
require("core-js/fn/object/values");
require("core-js/fn/object/entries");
require("core-js/fn/object/get-own-property-descriptors");
require("core-js/fn/string/pad-start");
require("core-js/fn/string/pad-end");
require("core-js/fn/string/trim-start");
require("core-js/fn/string/trim-end");

Symbol = exports.Symbol = global.Symbol ||
  require("core-js/es6/symbol");

Map = exports.Map = require("core-js/es6/map");
Set = exports.Set = require("core-js/es6/set");
