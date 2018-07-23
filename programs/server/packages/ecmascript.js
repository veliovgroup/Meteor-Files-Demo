(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var Babel = Package['babel-compiler'].Babel;
var BabelCompiler = Package['babel-compiler'].BabelCompiler;

/* Package-scope variables */
var ECMAScript;

(function(){

///////////////////////////////////////////////////////////////////////
//                                                                   //
// packages/ecmascript/ecmascript.js                                 //
//                                                                   //
///////////////////////////////////////////////////////////////////////
                                                                     //
ECMAScript = {
  compileForShell(command) {
    const babelOptions = Babel.getDefaultOptions();
    delete babelOptions.sourceMap;
    delete babelOptions.sourceMaps;
    babelOptions.ast = false;
    return Babel.compile(command, babelOptions).code;
  }

};
///////////////////////////////////////////////////////////////////////

}).call(this);


/* Exports */
Package._define("ecmascript", {
  ECMAScript: ECMAScript
});

})();

//# sourceURL=meteor://💻app/packages/ecmascript.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZWNtYXNjcmlwdC9lY21hc2NyaXB0LmpzIl0sIm5hbWVzIjpbIkVDTUFTY3JpcHQiLCJjb21waWxlRm9yU2hlbGwiLCJjb21tYW5kIiwiYmFiZWxPcHRpb25zIiwiQmFiZWwiLCJnZXREZWZhdWx0T3B0aW9ucyIsInNvdXJjZU1hcCIsInNvdXJjZU1hcHMiLCJhc3QiLCJjb21waWxlIiwiY29kZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsYUFBYTtBQUNYQyxrQkFBZ0JDLE9BQWhCLEVBQXlCO0FBQ3ZCLFVBQU1DLGVBQWVDLE1BQU1DLGlCQUFOLEVBQXJCO0FBQ0EsV0FBT0YsYUFBYUcsU0FBcEI7QUFDQSxXQUFPSCxhQUFhSSxVQUFwQjtBQUNBSixpQkFBYUssR0FBYixHQUFtQixLQUFuQjtBQUNBLFdBQU9KLE1BQU1LLE9BQU4sQ0FBY1AsT0FBZCxFQUF1QkMsWUFBdkIsRUFBcUNPLElBQTVDO0FBQ0Q7O0FBUFUsQ0FBYixDIiwiZmlsZSI6Ii9wYWNrYWdlcy9lY21hc2NyaXB0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiRUNNQVNjcmlwdCA9IHtcbiAgY29tcGlsZUZvclNoZWxsKGNvbW1hbmQpIHtcbiAgICBjb25zdCBiYWJlbE9wdGlvbnMgPSBCYWJlbC5nZXREZWZhdWx0T3B0aW9ucygpO1xuICAgIGRlbGV0ZSBiYWJlbE9wdGlvbnMuc291cmNlTWFwO1xuICAgIGRlbGV0ZSBiYWJlbE9wdGlvbnMuc291cmNlTWFwcztcbiAgICBiYWJlbE9wdGlvbnMuYXN0ID0gZmFsc2U7XG4gICAgcmV0dXJuIEJhYmVsLmNvbXBpbGUoY29tbWFuZCwgYmFiZWxPcHRpb25zKS5jb2RlO1xuICB9XG59O1xuIl19
