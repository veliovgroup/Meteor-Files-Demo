(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var EJSON = Package.ejson.EJSON;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var check, Match;

var require = meteorInstall({"node_modules":{"meteor":{"check":{"match.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/check/match.js                                                                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  check: () => check,
  Match: () => Match
});
// XXX docs
// Things we explicitly do NOT support:
//    - heterogenous arrays
var currentArgumentChecker = new Meteor.EnvironmentVariable();

var isPlainObject = require("./isPlainObject.js").isPlainObject;

var hasOwn = Object.prototype.hasOwnProperty;
/**
 * @summary Check that a value matches a [pattern](#matchpatterns).
 * If the value does not match the pattern, throw a `Match.Error`.
 *
 * Particularly useful to assert that arguments to a function have the right
 * types and structure.
 * @locus Anywhere
 * @param {Any} value The value to check
 * @param {MatchPattern} pattern The pattern to match
 * `value` against
 */

const check = function (value, pattern) {
  // Record that check got called, if somebody cared.
  //
  // We use getOrNullIfOutsideFiber so that it's OK to call check()
  // from non-Fiber server contexts; the downside is that if you forget to
  // bindEnvironment on some random callback in your method/publisher,
  // it might not find the argumentChecker and you'll get an error about
  // not checking an argument that it looks like you're checking (instead
  // of just getting a "Node code must run in a Fiber" error).
  var argChecker = currentArgumentChecker.getOrNullIfOutsideFiber();
  if (argChecker) argChecker.checking(value);
  var result = testSubtree(value, pattern);

  if (result) {
    var err = new Match.Error(result.message);

    if (result.path) {
      err.message += " in field " + result.path;
      err.path = result.path;
    }

    throw err;
  }
};

const Match = {
  Optional: function (pattern) {
    return new Optional(pattern);
  },
  Maybe: function (pattern) {
    return new Maybe(pattern);
  },
  OneOf: function (...args) {
    return new OneOf(args);
  },
  Any: ['__any__'],
  Where: function (condition) {
    return new Where(condition);
  },
  ObjectIncluding: function (pattern) {
    return new ObjectIncluding(pattern);
  },
  ObjectWithValues: function (pattern) {
    return new ObjectWithValues(pattern);
  },
  // Matches only signed 32-bit integers
  Integer: ['__integer__'],
  // XXX matchers should know how to describe themselves for errors
  Error: Meteor.makeErrorType("Match.Error", function (msg) {
    this.message = "Match error: " + msg; // The path of the value that failed to match. Initially empty, this gets
    // populated by catching and rethrowing the exception as it goes back up the
    // stack.
    // E.g.: "vals[3].entity.created"

    this.path = ""; // If this gets sent over DDP, don't give full internal details but at least
    // provide something better than 500 Internal server error.

    this.sanitizedError = new Meteor.Error(400, "Match failed");
  }),

  // Tests to see if value matches pattern. Unlike check, it merely returns true
  // or false (unless an error other than Match.Error was thrown). It does not
  // interact with _failIfArgumentsAreNotAllChecked.
  // XXX maybe also implement a Match.match which returns more information about
  //     failures but without using exception handling or doing what check()
  //     does with _failIfArgumentsAreNotAllChecked and Meteor.Error conversion

  /**
   * @summary Returns true if the value matches the pattern.
   * @locus Anywhere
   * @param {Any} value The value to check
   * @param {MatchPattern} pattern The pattern to match `value` against
   */
  test(value, pattern) {
    return !testSubtree(value, pattern);
  },

  // Runs `f.apply(context, args)`. If check() is not called on every element of
  // `args` (either directly or in the first level of an array), throws an error
  // (using `description` in the message).
  //
  _failIfArgumentsAreNotAllChecked(f, context, args, description) {
    var argChecker = new ArgumentChecker(args, description);
    var result = currentArgumentChecker.withValue(argChecker, function () {
      return f.apply(context, args);
    }); // If f didn't itself throw, make sure it checked all of its arguments.

    argChecker.throwUnlessAllArgumentsHaveBeenChecked();
    return result;
  }

};

class Optional {
  constructor(pattern) {
    this.pattern = pattern;
  }

}

class Maybe {
  constructor(pattern) {
    this.pattern = pattern;
  }

}

class OneOf {
  constructor(choices) {
    if (!choices || choices.length === 0) throw new Error("Must provide at least one choice to Match.OneOf");
    this.choices = choices;
  }

}

class Where {
  constructor(condition) {
    this.condition = condition;
  }

}

class ObjectIncluding {
  constructor(pattern) {
    this.pattern = pattern;
  }

}

class ObjectWithValues {
  constructor(pattern) {
    this.pattern = pattern;
  }

}

var stringForErrorMessage = function (value, options) {
  options = options || {};
  if (value === null) return "null";

  if (options.onlyShowType) {
    return typeof value;
  } // Your average non-object things.  Saves from doing the try/catch below for.


  if (typeof value !== "object") {
    return EJSON.stringify(value);
  }

  try {
    // Find objects with circular references since EJSON doesn't support them yet (Issue #4778 + Unaccepted PR)
    // If the native stringify is going to choke, EJSON.stringify is going to choke too.
    JSON.stringify(value);
  } catch (stringifyError) {
    if (stringifyError.name === "TypeError") {
      return typeof value;
    }
  }

  return EJSON.stringify(value);
};

var typeofChecks = [[String, "string"], [Number, "number"], [Boolean, "boolean"], // While we don't allow undefined/function in EJSON, this is good for optional
// arguments with OneOf.
[Function, "function"], [undefined, "undefined"]]; // Return `false` if it matches. Otherwise, return an object with a `message` and a `path` field.

var testSubtree = function (value, pattern) {
  // Match anything!
  if (pattern === Match.Any) return false; // Basic atomic types.
  // Do not match boxed objects (e.g. String, Boolean)

  for (var i = 0; i < typeofChecks.length; ++i) {
    if (pattern === typeofChecks[i][0]) {
      if (typeof value === typeofChecks[i][1]) return false;
      return {
        message: "Expected " + typeofChecks[i][1] + ", got " + stringForErrorMessage(value, {
          onlyShowType: true
        }),
        path: ""
      };
    }
  }

  if (pattern === null) {
    if (value === null) {
      return false;
    }

    return {
      message: "Expected null, got " + stringForErrorMessage(value),
      path: ""
    };
  } // Strings, numbers, and booleans match literally. Goes well with Match.OneOf.


  if (typeof pattern === "string" || typeof pattern === "number" || typeof pattern === "boolean") {
    if (value === pattern) return false;
    return {
      message: "Expected " + pattern + ", got " + stringForErrorMessage(value),
      path: ""
    };
  } // Match.Integer is special type encoded with array


  if (pattern === Match.Integer) {
    // There is no consistent and reliable way to check if variable is a 64-bit
    // integer. One of the popular solutions is to get reminder of division by 1
    // but this method fails on really large floats with big precision.
    // E.g.: 1.348192308491824e+23 % 1 === 0 in V8
    // Bitwise operators work consistantly but always cast variable to 32-bit
    // signed integer according to JavaScript specs.
    if (typeof value === "number" && (value | 0) === value) return false;
    return {
      message: "Expected Integer, got " + stringForErrorMessage(value),
      path: ""
    };
  } // "Object" is shorthand for Match.ObjectIncluding({});


  if (pattern === Object) pattern = Match.ObjectIncluding({}); // Array (checked AFTER Any, which is implemented as an Array).

  if (pattern instanceof Array) {
    if (pattern.length !== 1) {
      return {
        message: "Bad pattern: arrays must have one type element" + stringForErrorMessage(pattern),
        path: ""
      };
    }

    if (!Array.isArray(value) && !isArguments(value)) {
      return {
        message: "Expected array, got " + stringForErrorMessage(value),
        path: ""
      };
    }

    for (var i = 0, length = value.length; i < length; i++) {
      var result = testSubtree(value[i], pattern[0]);

      if (result) {
        result.path = _prependPath(i, result.path);
        return result;
      }
    }

    return false;
  } // Arbitrary validation checks. The condition can return false or throw a
  // Match.Error (ie, it can internally use check()) to fail.


  if (pattern instanceof Where) {
    var result;

    try {
      result = pattern.condition(value);
    } catch (err) {
      if (!(err instanceof Match.Error)) throw err;
      return {
        message: err.message,
        path: err.path
      };
    }

    if (result) return false; // XXX this error is terrible

    return {
      message: "Failed Match.Where validation",
      path: ""
    };
  }

  if (pattern instanceof Maybe) {
    pattern = Match.OneOf(undefined, null, pattern.pattern);
  } else if (pattern instanceof Optional) {
    pattern = Match.OneOf(undefined, pattern.pattern);
  }

  if (pattern instanceof OneOf) {
    for (var i = 0; i < pattern.choices.length; ++i) {
      var result = testSubtree(value, pattern.choices[i]);

      if (!result) {
        // No error? Yay, return.
        return false;
      } // Match errors just mean try another choice.

    } // XXX this error is terrible


    return {
      message: "Failed Match.OneOf, Match.Maybe or Match.Optional validation",
      path: ""
    };
  } // A function that isn't something we special-case is assumed to be a
  // constructor.


  if (pattern instanceof Function) {
    if (value instanceof pattern) return false;
    return {
      message: "Expected " + (pattern.name || "particular constructor"),
      path: ""
    };
  }

  var unknownKeysAllowed = false;
  var unknownKeyPattern;

  if (pattern instanceof ObjectIncluding) {
    unknownKeysAllowed = true;
    pattern = pattern.pattern;
  }

  if (pattern instanceof ObjectWithValues) {
    unknownKeysAllowed = true;
    unknownKeyPattern = [pattern.pattern];
    pattern = {}; // no required keys
  }

  if (typeof pattern !== "object") {
    return {
      message: "Bad pattern: unknown pattern type",
      path: ""
    };
  } // An object, with required and optional keys. Note that this does NOT do
  // structural matches against objects of special types that happen to match
  // the pattern: this really needs to be a plain old {Object}!


  if (typeof value !== 'object') {
    return {
      message: "Expected object, got " + typeof value,
      path: ""
    };
  }

  if (value === null) {
    return {
      message: "Expected object, got null",
      path: ""
    };
  }

  if (!isPlainObject(value)) {
    return {
      message: "Expected plain object",
      path: ""
    };
  }

  var requiredPatterns = {};
  var optionalPatterns = {};
  Object.keys(pattern).forEach(key => {
    const subPattern = pattern[key];

    if (subPattern instanceof Optional || subPattern instanceof Maybe) {
      optionalPatterns[key] = subPattern.pattern;
    } else {
      requiredPatterns[key] = subPattern;
    }
  });

  for (var key in Object(value)) {
    var subValue = value[key];

    if (hasOwn.call(requiredPatterns, key)) {
      var result = testSubtree(subValue, requiredPatterns[key]);

      if (result) {
        result.path = _prependPath(key, result.path);
        return result;
      }

      delete requiredPatterns[key];
    } else if (hasOwn.call(optionalPatterns, key)) {
      var result = testSubtree(subValue, optionalPatterns[key]);

      if (result) {
        result.path = _prependPath(key, result.path);
        return result;
      }
    } else {
      if (!unknownKeysAllowed) {
        return {
          message: "Unknown key",
          path: key
        };
      }

      if (unknownKeyPattern) {
        var result = testSubtree(subValue, unknownKeyPattern[0]);

        if (result) {
          result.path = _prependPath(key, result.path);
          return result;
        }
      }
    }
  }

  var keys = Object.keys(requiredPatterns);

  if (keys.length) {
    return {
      message: "Missing key '" + keys[0] + "'",
      path: ""
    };
  }
};

class ArgumentChecker {
  constructor(args, description) {
    // Make a SHALLOW copy of the arguments. (We'll be doing identity checks
    // against its contents.)
    this.args = [...args]; // Since the common case will be to check arguments in order, and we splice
    // out arguments when we check them, make it so we splice out from the end
    // rather than the beginning.

    this.args.reverse();
    this.description = description;
  }

  checking(value) {
    if (this._checkingOneValue(value)) return; // Allow check(arguments, [String]) or check(arguments.slice(1), [String])
    // or check([foo, bar], [String]) to count... but only if value wasn't
    // itself an argument.

    if (Array.isArray(value) || isArguments(value)) {
      Array.prototype.forEach.call(value, this._checkingOneValue.bind(this));
    }
  }

  _checkingOneValue(value) {
    for (var i = 0; i < this.args.length; ++i) {
      // Is this value one of the arguments? (This can have a false positive if
      // the argument is an interned primitive, but it's still a good enough
      // check.)
      // (NaN is not === to itself, so we have to check specially.)
      if (value === this.args[i] || Number.isNaN(value) && Number.isNaN(this.args[i])) {
        this.args.splice(i, 1);
        return true;
      }
    }

    return false;
  }

  throwUnlessAllArgumentsHaveBeenChecked() {
    if (this.args.length > 0) throw new Error("Did not check() all arguments during " + this.description);
  }

}

var _jsKeywords = ["do", "if", "in", "for", "let", "new", "try", "var", "case", "else", "enum", "eval", "false", "null", "this", "true", "void", "with", "break", "catch", "class", "const", "super", "throw", "while", "yield", "delete", "export", "import", "public", "return", "static", "switch", "typeof", "default", "extends", "finally", "package", "private", "continue", "debugger", "function", "arguments", "interface", "protected", "implements", "instanceof"]; // Assumes the base of path is already escaped properly
// returns key + base

function _prependPath(key, base) {
  if (typeof key === "number" || key.match(/^[0-9]+$/)) {
    key = "[" + key + "]";
  } else if (!key.match(/^[a-z_$][0-9a-z_$]*$/i) || _jsKeywords.indexOf(key) >= 0) {
    key = JSON.stringify([key]);
  }

  if (base && base[0] !== "[") {
    return key + '.' + base;
  }

  return key + base;
}

function isObject(value) {
  return typeof value === "object" && value !== null;
}

function baseIsArguments(item) {
  return isObject(item) && Object.prototype.toString.call(item) === '[object Arguments]';
}

var isArguments = baseIsArguments(function () {
  return arguments;
}()) ? baseIsArguments : function (value) {
  return isObject(value) && typeof value.callee === "function";
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"isPlainObject.js":function(require,exports){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/check/isPlainObject.js                                                                                  //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
// Copy of jQuery.isPlainObject for the server side from jQuery v3.1.1.
var class2type = {};
var toString = class2type.toString;
var hasOwn = class2type.hasOwnProperty;
var fnToString = hasOwn.toString;
var ObjectFunctionString = fnToString.call(Object);
var getProto = Object.getPrototypeOf;

exports.isPlainObject = function (obj) {
  var proto, Ctor; // Detect obvious negatives
  // Use toString instead of jQuery.type to catch host objects

  if (!obj || toString.call(obj) !== "[object Object]") {
    return false;
  }

  proto = getProto(obj); // Objects with no prototype (e.g., `Object.create( null )`) are plain

  if (!proto) {
    return true;
  } // Objects with prototype are plain iff they were constructed by a global Object function


  Ctor = hasOwn.call(proto, "constructor") && proto.constructor;
  return typeof Ctor === "function" && fnToString.call(Ctor) === ObjectFunctionString;
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/check/match.js");

/* Exports */
Package._define("check", exports, {
  check: check,
  Match: Match
});

})();

//# sourceURL=meteor://💻app/packages/check.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvY2hlY2svbWF0Y2guanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2NoZWNrL2lzUGxhaW5PYmplY3QuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiY2hlY2siLCJNYXRjaCIsImN1cnJlbnRBcmd1bWVudENoZWNrZXIiLCJNZXRlb3IiLCJFbnZpcm9ubWVudFZhcmlhYmxlIiwiaXNQbGFpbk9iamVjdCIsInJlcXVpcmUiLCJoYXNPd24iLCJPYmplY3QiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsInZhbHVlIiwicGF0dGVybiIsImFyZ0NoZWNrZXIiLCJnZXRPck51bGxJZk91dHNpZGVGaWJlciIsImNoZWNraW5nIiwicmVzdWx0IiwidGVzdFN1YnRyZWUiLCJlcnIiLCJFcnJvciIsIm1lc3NhZ2UiLCJwYXRoIiwiT3B0aW9uYWwiLCJNYXliZSIsIk9uZU9mIiwiYXJncyIsIkFueSIsIldoZXJlIiwiY29uZGl0aW9uIiwiT2JqZWN0SW5jbHVkaW5nIiwiT2JqZWN0V2l0aFZhbHVlcyIsIkludGVnZXIiLCJtYWtlRXJyb3JUeXBlIiwibXNnIiwic2FuaXRpemVkRXJyb3IiLCJ0ZXN0IiwiX2ZhaWxJZkFyZ3VtZW50c0FyZU5vdEFsbENoZWNrZWQiLCJmIiwiY29udGV4dCIsImRlc2NyaXB0aW9uIiwiQXJndW1lbnRDaGVja2VyIiwid2l0aFZhbHVlIiwiYXBwbHkiLCJ0aHJvd1VubGVzc0FsbEFyZ3VtZW50c0hhdmVCZWVuQ2hlY2tlZCIsImNvbnN0cnVjdG9yIiwiY2hvaWNlcyIsImxlbmd0aCIsInN0cmluZ0ZvckVycm9yTWVzc2FnZSIsIm9wdGlvbnMiLCJvbmx5U2hvd1R5cGUiLCJFSlNPTiIsInN0cmluZ2lmeSIsIkpTT04iLCJzdHJpbmdpZnlFcnJvciIsIm5hbWUiLCJ0eXBlb2ZDaGVja3MiLCJTdHJpbmciLCJOdW1iZXIiLCJCb29sZWFuIiwiRnVuY3Rpb24iLCJ1bmRlZmluZWQiLCJpIiwiQXJyYXkiLCJpc0FycmF5IiwiaXNBcmd1bWVudHMiLCJfcHJlcGVuZFBhdGgiLCJ1bmtub3duS2V5c0FsbG93ZWQiLCJ1bmtub3duS2V5UGF0dGVybiIsInJlcXVpcmVkUGF0dGVybnMiLCJvcHRpb25hbFBhdHRlcm5zIiwia2V5cyIsImZvckVhY2giLCJrZXkiLCJzdWJQYXR0ZXJuIiwic3ViVmFsdWUiLCJjYWxsIiwicmV2ZXJzZSIsIl9jaGVja2luZ09uZVZhbHVlIiwiYmluZCIsImlzTmFOIiwic3BsaWNlIiwiX2pzS2V5d29yZHMiLCJiYXNlIiwibWF0Y2giLCJpbmRleE9mIiwiaXNPYmplY3QiLCJiYXNlSXNBcmd1bWVudHMiLCJpdGVtIiwidG9TdHJpbmciLCJhcmd1bWVudHMiLCJjYWxsZWUiLCJjbGFzczJ0eXBlIiwiZm5Ub1N0cmluZyIsIk9iamVjdEZ1bmN0aW9uU3RyaW5nIiwiZ2V0UHJvdG8iLCJnZXRQcm90b3R5cGVPZiIsImV4cG9ydHMiLCJvYmoiLCJwcm90byIsIkN0b3IiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE9BQU9DLE1BQVAsQ0FBYztBQUFDQyxTQUFNLE1BQUlBLEtBQVg7QUFBaUJDLFNBQU0sTUFBSUE7QUFBM0IsQ0FBZDtBQUFBO0FBRUE7QUFDQTtBQUVBLElBQUlDLHlCQUF5QixJQUFJQyxPQUFPQyxtQkFBWCxFQUE3Qjs7QUFDQSxJQUFJQyxnQkFBZ0JDLFFBQVEsb0JBQVIsRUFBOEJELGFBQWxEOztBQUNBLElBQUlFLFNBQVNDLE9BQU9DLFNBQVAsQ0FBaUJDLGNBQTlCO0FBRUE7Ozs7Ozs7Ozs7OztBQVdPLE1BQU1WLFFBQVEsVUFBVVcsS0FBVixFQUFpQkMsT0FBakIsRUFBMEI7QUFDN0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQUlDLGFBQWFYLHVCQUF1QlksdUJBQXZCLEVBQWpCO0FBQ0EsTUFBSUQsVUFBSixFQUNFQSxXQUFXRSxRQUFYLENBQW9CSixLQUFwQjtB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QW5CLEtBQXFDQSxNQUFNdEQsV0FBbEQ7QUFDQSxTQUFPLE9BQU91RCxJQUFQLEtBQWdCLFVBQWhCLElBQThCUCxXQUFXakIsSUFBWCxDQUFnQndCLElBQWhCLE1BQTBCTixvQkFBL0Q7QUFDRCxDQXBCRCxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9jaGVjay5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFhYWCBkb2NzXG5cbi8vIFRoaW5ncyB3ZSBleHBsaWNpdGx5IGRvIE5PVCBzdXBwb3J0OlxuLy8gICAgLSBoZXRlcm9nZW5vdXMgYXJyYXlzXG5cbnZhciBjdXJyZW50QXJndW1lbnRDaGVja2VyID0gbmV3IE1ldGVvci5FbnZpcm9ubWVudFZhcmlhYmxlO1xudmFyIGlzUGxhaW5PYmplY3QgPSByZXF1aXJlKFwiLi9pc1BsYWluT2JqZWN0LmpzXCIpLmlzUGxhaW5PYmplY3Q7XG52YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLyoqXG4gKiBAc3VtbWFyeSBDaGVjayB0aGF0IGEgdmFsdWUgbWF0Y2hlcyBhIFtwYXR0ZXJuXSgjbWF0Y2hwYXR0ZXJucykuXG4gKiBJZiB0aGUgdmFsdWUgZG9lcyBub3QgbWF0Y2ggdGhlIHBhdHRlcm4sIHRocm93IGEgYE1hdGNoLkVycm9yYC5cbiAqXG4gKiBQYXJ0aWN1bGFybHkgdXNlZnVsIHRvIGFzc2VydCB0aGF0IGFyZ3VtZW50cyB0byBhIGZ1bmN0aW9uIGhhdmUgdGhlIHJpZ2h0XG4gKiB0eXBlcyBhbmQgc3RydWN0dXJlLlxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAcGFyYW0ge0FueX0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrXG4gKiBAcGFyYW0ge01hdGNoUGF0dGVybn0gcGF0dGVybiBUaGUgcGF0dGVybiB0byBtYXRjaFxuICogYHZhbHVlYCBhZ2FpbnN0XG4gKi9cbmV4cG9ydCBjb25zdCBjaGVjayA9IGZ1bmN0aW9uICh2YWx1ZSwgcGF0dGVybikge1xuICAvLyBSZWNvcmQgdGhhdCBjaGVjayBnb3QgY2FsbGVkLCBpZiBzb21lYm9keSBjYXJlZC5cbiAgLy9cbiAgLy8gV2UgdXNlIGdldE9yTnVsbElmT3V0c2lkZUZpYmVyIHNvIHRoYXQgaXQncyBPSyB0byBjYWxsIGNoZWNrKClcbiAgLy8gZnJvbSBub24tRmliZXIgc2VydmVyIGNvbnRleHRzOyB0aGUgZG93bnNpZGUgaXMgdGhhdCBpZiB5b3UgZm9yZ2V0IHRvXG4gIC8vIGJpbmRFbnZpcm9ubWVudCBvbiBzb21lIHJhbmRvbSBjYWxsYmFjayBpbiB5b3VyIG1ldGhvZC9wdWJsaXNoZXIsXG4gIC8vIGl0IG1pZ2h0IG5vdCBmaW5kIHRoZSBhcmd1bWVudENoZWNrZXIgYW5kIHlvdSdsbCBnZXQgYW4gZXJyb3IgYWJvdXRcbiAgLy8gbm90IGNoZWNraW5nIGFuIGFyZ3VtZW50IHRoYXQgaXQgbG9va3MgbGlrZSB5b3UncmUgY2hlY2tpbmcgKGluc3RlYWRcbiAgLy8gb2YganVzdCBnZXR0aW5nIGEgXCJOb2RlIGNvZGUgbXVzdCBydW4gaW4gYSBGaWJlclwiIGVycm9yKS5cbiAgdmFyIGFyZ0NoZWNrZXIgPSBjdXJyZW50QXJndW1lbnRDaGVja2VyLmdldE9yTnVsbElmT3V0c2lkZUZpYmVyKCk7XG4gIGlmIChhcmdDaGVja2VyKVxuICAgIGFyZ0NoZWNrZXIuY2hlY2tpbmcodmFsdWUpO1xuICB2YXIgcmVzdWx0ID0gdGVzdFN1YnRyZWUodmFsdWUsIHBhdHRlcm4pO1xuICBpZiAocmVzdWx0KSB7XG4gICAgdmFyIGVyciA9IG5ldyBNYXRjaC5FcnJvcihyZXN1bHQubWVzc2FnZSk7XG4gICAgaWYgKHJlc3VsdC5wYXRoKSB7XG4gICAgICBlcnIubWVzc2FnZSArPSBcIiBpbiBmaWVsZCBcIiArIHJlc3VsdC5wYXRoO1xuICAgICAgZXJyLnBhdGggPSByZXN1bHQucGF0aDtcbiAgICB9XG4gICAgdGhyb3cgZXJyO1xuICB9XG59O1xuXG4vKipcbiAqIEBuYW1lc3BhY2UgTWF0Y2hcbiAqIEBzdW1tYXJ5IFRoZSBuYW1lc3BhY2UgZm9yIGFsbCBNYXRjaCB0eXBlcyBhbmQgbWV0aG9kcy5cbiAqL1xuZXhwb3J0IGNvbnN0IE1hdGNoID0ge1xuICBPcHRpb25hbDogZnVuY3Rpb24gKHBhdHRlcm4pIHtcbiAgICByZXR1cm4gbmV3IE9wdGlvbmFsKHBhdHRlcm4pO1xuICB9LFxuICBNYXliZTogZnVuY3Rpb24gKHBhdHRlcm4pIHtcbiAgICByZXR1cm4gbmV3IE1heWJlKHBhdHRlcm4pO1xuICB9LFxuICBPbmVPZjogZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gbmV3IE9uZU9mKGFyZ3MpO1xuICB9LFxuICBBbnk6IFsnX19hbnlfXyddLFxuICBXaGVyZTogZnVuY3Rpb24gKGNvbmRpdGlvbikge1xuICAgIHJldHVybiBuZXcgV2hlcmUoY29uZGl0aW9uKTtcbiAgfSxcbiAgT2JqZWN0SW5jbHVkaW5nOiBmdW5jdGlvbiAocGF0dGVybikge1xuICAgIHJldHVybiBuZXcgT2JqZWN0SW5jbHVkaW5nKHBhdHRlcm4pO1xuICB9LFxuICBPYmplY3RXaXRoVmFsdWVzOiBmdW5jdGlvbiAocGF0dGVybikge1xuICAgIHJldHVybiBuZXcgT2JqZWN0V2l0aFZhbHVlcyhwYXR0ZXJuKTtcbiAgfSxcbiAgLy8gTWF0Y2hlcyBvbmx5IHNpZ25lZCAzMi1iaXQgaW50ZWdlcnNcbiAgSW50ZWdlcjogWydfX2ludGVnZXJfXyddLFxuXG4gIC8vIFhYWCBtYXRjaGVycyBzaG91bGQga25vdyBob3cgdG8gZGVzY3JpYmUgdGhlbXNlbHZlcyBmb3IgZXJyb3JzXG4gIEVycm9yOiBNZXRlb3IubWFrZUVycm9yVHlwZShcIk1hdGNoLkVycm9yXCIsIGZ1bmN0aW9uIChtc2cpIHtcbiAgICB0aGlzLm1lc3NhZ2UgPSBcIk1hdGNoIGVycm9yOiBcIiArIG1zZztcbiAgICAvLyBUaGUgcGF0aCBvZiB0aGUgdmFsdWUgdGhhdCBmYWlsZWQgdG8gbWF0Y2guIEluaXRpYWxseSBlbXB0eSwgdGhpcyBnZXRzXG4gICAgLy8gcG9wdWxhdGVkIGJ5IGNhdGNoaW5nIGFuZCByZXRocm93aW5nIHRoZSBleGNlcHRpb24gYXMgaXQgZ29lcyBiYWNrIHVwIHRoZVxuICAgIC8vIHN0YWNrLlxuICAgIC8vIEUuZy46IFwidmFsc1szXS5lbnRpdHkuY3JlYXRlZFwiXG4gICAgdGhpcy5wYXRoID0gXCJcIjtcbiAgICAvLyBJZiB0aGlzIGdldHMgc2VudCBvdmVyIEREUCwgZG9uJ3QgZ2l2ZSBmdWxsIGludGVybmFsIGRldGFpbHMgYnV0IGF0IGxlYXN0XG4gICAgLy8gcHJvdmlkZSBzb21ldGhpbmcgYmV0dGVyIHRoYW4gNTAwIEludGVybmFsIHNlcnZlciBlcnJvci5cbiAgICB0aGlzLnNhbml0aXplZEVycm9yID0gbmV3IE1ldGVvci5FcnJvcig0MDAsIFwiTWF0Y2ggZmFpbGVkXCIpO1xuICB9KSxcblxuICAvLyBUZXN0cyB0byBzZWUgaWYgdmFsdWUgbWF0Y2hlcyBwYXR0ZXJuLiBVbmxpa2UgY2hlY2ssIGl0IG1lcmVseSByZXR1cm5zIHRydWVcbiAgLy8gb3IgZmFsc2UgKHVubGVzcyBhbiBlcnJvciBvdGhlciB0aGFuIE1hdGNoLkVycm9yIHdhcyB0aHJvd24pLiBJdCBkb2VzIG5vdFxuICAvLyBpbnRlcmFjdCB3aXRoIF9mYWlsSWZBcmd1bWVudHNBcmVOb3RBbGxDaGVja2VkLlxuICAvLyBYWFggbWF5YmUgYWxzbyBpbXBsZW1lbnQgYSBNYXRjaC5tYXRjaCB3aGljaCByZXR1cm5zIG1vcmUgaW5mb3JtYXRpb24gYWJvdXRcbiAgLy8gICAgIGZhaWx1cmVzIGJ1dCB3aXRob3V0IHVzaW5nIGV4Y2VwdGlvbiBoYW5kbGluZyBvciBkb2luZyB3aGF0IGNoZWNrKClcbiAgLy8gICAgIGRvZXMgd2l0aCBfZmFpbElmQXJndW1lbnRzQXJlTm90QWxsQ2hlY2tlZCBhbmQgTWV0ZW9yLkVycm9yIGNvbnZlcnNpb25cblxuICAvKipcbiAgICogQHN1bW1hcnkgUmV0dXJucyB0cnVlIGlmIHRoZSB2YWx1ZSBtYXRjaGVzIHRoZSBwYXR0ZXJuLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQHBhcmFtIHtBbnl9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVja1xuICAgKiBAcGFyYW0ge01hdGNoUGF0dGVybn0gcGF0dGVybiBUaGUgcGF0dGVybiB0byBtYXRjaCBgdmFsdWVgIGFnYWluc3RcbiAgICovXG4gIHRlc3QodmFsdWUsIHBhdHRlcm4pIHtcbiAgICByZXR1cm4gIXRlc3RTdWJ0cmVlKHZhbHVlLCBwYXR0ZXJuKTtcbiAgfSxcblxuICAvLyBSdW5zIGBmLmFwcGx5KGNvbnRleHQsIGFyZ3MpYC4gSWYgY2hlY2soKSBpcyBub3QgY2FsbGVkIG9uIGV2ZXJ5IGVsZW1lbnQgb2ZcbiAgLy8gYGFyZ3NgIChlaXRoZXIgZGlyZWN0bHkgb3IgaW4gdGhlIGZpcnN0IGxldmVsIG9mIGFuIGFycmF5KSwgdGhyb3dzIGFuIGVycm9yXG4gIC8vICh1c2luZyBgZGVzY3JpcHRpb25gIGluIHRoZSBtZXNzYWdlKS5cbiAgLy9cbiAgX2ZhaWxJZkFyZ3VtZW50c0FyZU5vdEFsbENoZWNrZWQoZiwgY29udGV4dCwgYXJncywgZGVzY3JpcHRpb24pIHtcbiAgICB2YXIgYXJnQ2hlY2tlciA9IG5ldyBBcmd1bWVudENoZWNrZXIoYXJncywgZGVzY3JpcHRpb24pO1xuICAgIHZhciByZXN1bHQgPSBjdXJyZW50QXJndW1lbnRDaGVja2VyLndpdGhWYWx1ZShhcmdDaGVja2VyLCBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gZi5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICB9KTtcbiAgICAvLyBJZiBmIGRpZG4ndCBpdHNlbGYgdGhyb3csIG1ha2Ugc3VyZSBpdCBjaGVja2VkIGFsbCBvZiBpdHMgYXJndW1lbnRzLlxuICAgIGFyZ0NoZWNrZXIudGhyb3dVbmxlc3NBbGxBcmd1bWVudHNIYXZlQmVlbkNoZWNrZWQoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59O1xuXG5jbGFzcyBPcHRpb25hbCB7XG4gIGNvbnN0cnVjdG9yKHBhdHRlcm4pIHtcbiAgICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xuICB9XG59XG5cbmNsYXNzIE1heWJlIHtcbiAgY29uc3RydWN0b3IocGF0dGVybikge1xuICAgIHRoaXMucGF0dGVybiA9IHBhdHRlcm47XG4gIH1cbn1cblxuY2xhc3MgT25lT2Yge1xuICBjb25zdHJ1Y3RvcihjaG9pY2VzKSB7XG4gICAgaWYgKCFjaG9pY2VzIHx8IGNob2ljZXMubGVuZ3RoID09PSAwKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBwcm92aWRlIGF0IGxlYXN0IG9uZSBjaG9pY2UgdG8gTWF0Y2guT25lT2ZcIik7XG4gICAgdGhpcy5jaG9pY2VzID0gY2hvaWNlcztcbiAgfVxufVxuXG5jbGFzcyBXaGVyZSB7XG4gIGNvbnN0cnVjdG9yKGNvbmRpdGlvbikge1xuICAgIHRoaXMuY29uZGl0aW9uID0gY29uZGl0aW9uO1xuICB9XG59XG5cbmNsYXNzIE9iamVjdEluY2x1ZGluZyB7XG4gIGNvbnN0cnVjdG9yKHBhdHRlcm4pIHtcbiAgICB0aGlzLnBhdHRlcm4gPSBwYXR0ZXJuO1xuICB9XG59XG5cbmNsYXNzIE9iamVjdFdpdGhWYWx1ZXMge1xuICBjb25zdHJ1Y3RvcihwYXR0ZXJuKSB7XG4gICAgdGhpcy5wYXR0ZXJuID0gcGF0dGVybjtcbiAgfVxufVxuXG52YXIgc3RyaW5nRm9yRXJyb3JNZXNzYWdlID0gZnVuY3Rpb24gKHZhbHVlLCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIGlmICggdmFsdWUgPT09IG51bGwgKSByZXR1cm4gXCJudWxsXCI7XG5cbiAgaWYgKCBvcHRpb25zLm9ubHlTaG93VHlwZSApIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlO1xuICB9XG5cbiAgLy8gWW91ciBhdmVyYWdlIG5vbi1vYmplY3QgdGhpbmdzLiAgU2F2ZXMgZnJvbSBkb2luZyB0aGUgdHJ5L2NhdGNoIGJlbG93IGZvci5cbiAgaWYgKCB0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIgKSB7XG4gICAgcmV0dXJuIEVKU09OLnN0cmluZ2lmeSh2YWx1ZSlcbiAgfVxuXG4gIHRyeSB7XG4gICAgLy8gRmluZCBvYmplY3RzIHdpdGggY2lyY3VsYXIgcmVmZXJlbmNlcyBzaW5jZSBFSlNPTiBkb2Vzbid0IHN1cHBvcnQgdGhlbSB5ZXQgKElzc3VlICM0Nzc4ICsgVW5hY2NlcHRlZCBQUilcbiAgICAvLyBJZiB0aGUgbmF0aXZlIHN0cmluZ2lmeSBpcyBnb2luZyB0byBjaG9rZSwgRUpTT04uc3RyaW5naWZ5IGlzIGdvaW5nIHRvIGNob2tlIHRvby5cbiAgICBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG4gIH0gY2F0Y2ggKHN0cmluZ2lmeUVycm9yKSB7XG4gICAgaWYgKCBzdHJpbmdpZnlFcnJvci5uYW1lID09PSBcIlR5cGVFcnJvclwiICkge1xuICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gRUpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbn07XG5cbnZhciB0eXBlb2ZDaGVja3MgPSBbXG4gIFtTdHJpbmcsIFwic3RyaW5nXCJdLFxuICBbTnVtYmVyLCBcIm51bWJlclwiXSxcbiAgW0Jvb2xlYW4sIFwiYm9vbGVhblwiXSxcbiAgLy8gV2hpbGUgd2UgZG9uJ3QgYWxsb3cgdW5kZWZpbmVkL2Z1bmN0aW9uIGluIEVKU09OLCB0aGlzIGlzIGdvb2QgZm9yIG9wdGlvbmFsXG4gIC8vIGFyZ3VtZW50cyB3aXRoIE9uZU9mLlxuICBbRnVuY3Rpb24sIFwiZnVuY3Rpb25cIl0sXG4gIFt1bmRlZmluZWQsIFwidW5kZWZpbmVkXCJdXG5dO1xuXG4vLyBSZXR1cm4gYGZhbHNlYCBpZiBpdCBtYXRjaGVzLiBPdGhlcndpc2UsIHJldHVybiBhbiBvYmplY3Qgd2l0aCBhIGBtZXNzYWdlYCBhbmQgYSBgcGF0aGAgZmllbGQuXG52YXIgdGVzdFN1YnRyZWUgPSBmdW5jdGlvbiAodmFsdWUsIHBhdHRlcm4pIHtcbiAgLy8gTWF0Y2ggYW55dGhpbmchXG4gIGlmIChwYXR0ZXJuID09PSBNYXRjaC5BbnkpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIEJhc2ljIGF0b21pYyB0eXBlcy5cbiAgLy8gRG8gbm90IG1hdGNoIGJveGVkIG9iamVjdHMgKGUuZy4gU3RyaW5nLCBCb29sZWFuKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHR5cGVvZkNoZWNrcy5sZW5ndGg7ICsraSkge1xuICAgIGlmIChwYXR0ZXJuID09PSB0eXBlb2ZDaGVja3NbaV1bMF0pIHtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IHR5cGVvZkNoZWNrc1tpXVsxXSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbWVzc2FnZTogXCJFeHBlY3RlZCBcIiArIHR5cGVvZkNoZWNrc1tpXVsxXSArIFwiLCBnb3QgXCIgKyBzdHJpbmdGb3JFcnJvck1lc3NhZ2UodmFsdWUsIHsgb25seVNob3dUeXBlOiB0cnVlIH0pLFxuICAgICAgICBwYXRoOiBcIlwiXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIGlmIChwYXR0ZXJuID09PSBudWxsKSB7XG4gICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBtZXNzYWdlOiBcIkV4cGVjdGVkIG51bGwsIGdvdCBcIiArIHN0cmluZ0ZvckVycm9yTWVzc2FnZSh2YWx1ZSksXG4gICAgICBwYXRoOiBcIlwiXG4gICAgfTtcbiAgfVxuXG4gIC8vIFN0cmluZ3MsIG51bWJlcnMsIGFuZCBib29sZWFucyBtYXRjaCBsaXRlcmFsbHkuIEdvZXMgd2VsbCB3aXRoIE1hdGNoLk9uZU9mLlxuICBpZiAodHlwZW9mIHBhdHRlcm4gPT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHBhdHRlcm4gPT09IFwibnVtYmVyXCIgfHwgdHlwZW9mIHBhdHRlcm4gPT09IFwiYm9vbGVhblwiKSB7XG4gICAgaWYgKHZhbHVlID09PSBwYXR0ZXJuKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB7XG4gICAgICBtZXNzYWdlOiBcIkV4cGVjdGVkIFwiICsgcGF0dGVybiArIFwiLCBnb3QgXCIgKyBzdHJpbmdGb3JFcnJvck1lc3NhZ2UodmFsdWUpLFxuICAgICAgcGF0aDogXCJcIlxuICAgIH07XG4gIH1cblxuICAvLyBNYXRjaC5JbnRlZ2VyIGlzIHNwZWNpYWwgdHlwZSBlbmNvZGVkIHdpdGggYXJyYXlcbiAgaWYgKHBhdHRlcm4gPT09IE1hdGNoLkludGVnZXIpIHtcbiAgICAvLyBUaGVyZSBpcyBubyBjb25zaXN0ZW50IGFuZCByZWxpYWJsZSB3YXkgdG8gY2hlY2sgaWYgdmFyaWFibGUgaXMgYSA2NC1iaXRcbiAgICAvLyBpbnRlZ2VyLiBPbmUgb2YgdGhlIHBvcHVsYXIgc29sdXRpb25zIGlzIHRvIGdldCByZW1pbmRlciBvZiBkaXZpc2lvbiBieSAxXG4gICAgLy8gYnV0IHRoaXMgbWV0aG9kIGZhaWxzIG9uIHJlYWxseSBsYXJnZSBmbG9hdHMgd2l0aCBiaWcgcHJlY2lzaW9uLlxuICAgIC8vIEUuZy46IDEuMzQ4MTkyMzA4NDkxODI0ZSsyMyAlIDEgPT09IDAgaW4gVjhcbiAgICAvLyBCaXR3aXNlIG9wZXJhdG9ycyB3b3JrIGNvbnNpc3RhbnRseSBidXQgYWx3YXlzIGNhc3QgdmFyaWFibGUgdG8gMzItYml0XG4gICAgLy8gc2lnbmVkIGludGVnZXIgYWNjb3JkaW5nIHRvIEphdmFTY3JpcHQgc3BlY3MuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIiAmJiAodmFsdWUgfCAwKSA9PT0gdmFsdWUpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHtcbiAgICAgIG1lc3NhZ2U6IFwiRXhwZWN0ZWQgSW50ZWdlciwgZ290IFwiICsgc3RyaW5nRm9yRXJyb3JNZXNzYWdlKHZhbHVlKSxcbiAgICAgIHBhdGg6IFwiXCJcbiAgICB9O1xuICB9XG5cbiAgLy8gXCJPYmplY3RcIiBpcyBzaG9ydGhhbmQgZm9yIE1hdGNoLk9iamVjdEluY2x1ZGluZyh7fSk7XG4gIGlmIChwYXR0ZXJuID09PSBPYmplY3QpXG4gICAgcGF0dGVybiA9IE1hdGNoLk9iamVjdEluY2x1ZGluZyh7fSk7XG5cbiAgLy8gQXJyYXkgKGNoZWNrZWQgQUZURVIgQW55LCB3aGljaCBpcyBpbXBsZW1lbnRlZCBhcyBhbiBBcnJheSkuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICBpZiAocGF0dGVybi5sZW5ndGggIT09IDEpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG1lc3NhZ2U6IFwiQmFkIHBhdHRlcm46IGFycmF5cyBtdXN0IGhhdmUgb25lIHR5cGUgZWxlbWVudFwiICsgc3RyaW5nRm9yRXJyb3JNZXNzYWdlKHBhdHRlcm4pLFxuICAgICAgICBwYXRoOiBcIlwiXG4gICAgICB9O1xuICAgIH1cbiAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpICYmICFpc0FyZ3VtZW50cyh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG1lc3NhZ2U6IFwiRXhwZWN0ZWQgYXJyYXksIGdvdCBcIiArIHN0cmluZ0ZvckVycm9yTWVzc2FnZSh2YWx1ZSksXG4gICAgICAgIHBhdGg6IFwiXCJcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdGVzdFN1YnRyZWUodmFsdWVbaV0sIHBhdHRlcm5bMF0pO1xuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICByZXN1bHQucGF0aCA9IF9wcmVwZW5kUGF0aChpLCByZXN1bHQucGF0aCk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIEFyYml0cmFyeSB2YWxpZGF0aW9uIGNoZWNrcy4gVGhlIGNvbmRpdGlvbiBjYW4gcmV0dXJuIGZhbHNlIG9yIHRocm93IGFcbiAgLy8gTWF0Y2guRXJyb3IgKGllLCBpdCBjYW4gaW50ZXJuYWxseSB1c2UgY2hlY2soKSkgdG8gZmFpbC5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBXaGVyZSkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgdHJ5IHtcbiAgICAgIHJlc3VsdCA9IHBhdHRlcm4uY29uZGl0aW9uKHZhbHVlKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmICghKGVyciBpbnN0YW5jZW9mIE1hdGNoLkVycm9yKSlcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbWVzc2FnZTogZXJyLm1lc3NhZ2UsXG4gICAgICAgIHBhdGg6IGVyci5wYXRoXG4gICAgICB9O1xuICAgIH1cbiAgICBpZiAocmVzdWx0KVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIC8vIFhYWCB0aGlzIGVycm9yIGlzIHRlcnJpYmxlXG4gICAgcmV0dXJuIHtcbiAgICAgIG1lc3NhZ2U6IFwiRmFpbGVkIE1hdGNoLldoZXJlIHZhbGlkYXRpb25cIixcbiAgICAgIHBhdGg6IFwiXCJcbiAgICB9O1xuICB9XG5cblxuICBpZiAocGF0dGVybiBpbnN0YW5jZW9mIE1heWJlKSB7XG4gICAgcGF0dGVybiA9IE1hdGNoLk9uZU9mKHVuZGVmaW5lZCwgbnVsbCwgcGF0dGVybi5wYXR0ZXJuKTtcbiAgfVxuICBlbHNlIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT3B0aW9uYWwpIHtcbiAgICBwYXR0ZXJuID0gTWF0Y2guT25lT2YodW5kZWZpbmVkLCBwYXR0ZXJuLnBhdHRlcm4pO1xuICB9XG5cbiAgaWYgKHBhdHRlcm4gaW5zdGFuY2VvZiBPbmVPZikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0dGVybi5jaG9pY2VzLmxlbmd0aDsgKytpKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdGVzdFN1YnRyZWUodmFsdWUsIHBhdHRlcm4uY2hvaWNlc1tpXSk7XG4gICAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgICAvLyBObyBlcnJvcj8gWWF5LCByZXR1cm4uXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8vIE1hdGNoIGVycm9ycyBqdXN0IG1lYW4gdHJ5IGFub3RoZXIgY2hvaWNlLlxuICAgIH1cbiAgICAvLyBYWFggdGhpcyBlcnJvciBpcyB0ZXJyaWJsZVxuICAgIHJldHVybiB7XG4gICAgICBtZXNzYWdlOiBcIkZhaWxlZCBNYXRjaC5PbmVPZiwgTWF0Y2guTWF5YmUgb3IgTWF0Y2guT3B0aW9uYWwgdmFsaWRhdGlvblwiLFxuICAgICAgcGF0aDogXCJcIlxuICAgIH07XG4gIH1cblxuICAvLyBBIGZ1bmN0aW9uIHRoYXQgaXNuJ3Qgc29tZXRoaW5nIHdlIHNwZWNpYWwtY2FzZSBpcyBhc3N1bWVkIHRvIGJlIGFcbiAgLy8gY29uc3RydWN0b3IuXG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBwYXR0ZXJuKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB7XG4gICAgICBtZXNzYWdlOiBcIkV4cGVjdGVkIFwiICsgKHBhdHRlcm4ubmFtZSB8fFwicGFydGljdWxhciBjb25zdHJ1Y3RvclwiKSxcbiAgICAgIHBhdGg6IFwiXCJcbiAgICB9O1xuICB9XG5cbiAgdmFyIHVua25vd25LZXlzQWxsb3dlZCA9IGZhbHNlO1xuICB2YXIgdW5rbm93bktleVBhdHRlcm47XG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT2JqZWN0SW5jbHVkaW5nKSB7XG4gICAgdW5rbm93bktleXNBbGxvd2VkID0gdHJ1ZTtcbiAgICBwYXR0ZXJuID0gcGF0dGVybi5wYXR0ZXJuO1xuICB9XG4gIGlmIChwYXR0ZXJuIGluc3RhbmNlb2YgT2JqZWN0V2l0aFZhbHVlcykge1xuICAgIHVua25vd25LZXlzQWxsb3dlZCA9IHRydWU7XG4gICAgdW5rbm93bktleVBhdHRlcm4gPSBbcGF0dGVybi5wYXR0ZXJuXTtcbiAgICBwYXR0ZXJuID0ge307ICAvLyBubyByZXF1aXJlZCBrZXlzXG4gIH1cblxuICBpZiAodHlwZW9mIHBhdHRlcm4gIT09IFwib2JqZWN0XCIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbWVzc2FnZTogXCJCYWQgcGF0dGVybjogdW5rbm93biBwYXR0ZXJuIHR5cGVcIixcbiAgICAgIHBhdGg6IFwiXCJcbiAgICB9O1xuICB9XG5cbiAgLy8gQW4gb2JqZWN0LCB3aXRoIHJlcXVpcmVkIGFuZCBvcHRpb25hbCBrZXlzLiBOb3RlIHRoYXQgdGhpcyBkb2VzIE5PVCBkb1xuICAvLyBzdHJ1Y3R1cmFsIG1hdGNoZXMgYWdhaW5zdCBvYmplY3RzIG9mIHNwZWNpYWwgdHlwZXMgdGhhdCBoYXBwZW4gdG8gbWF0Y2hcbiAgLy8gdGhlIHBhdHRlcm46IHRoaXMgcmVhbGx5IG5lZWRzIHRvIGJlIGEgcGxhaW4gb2xkIHtPYmplY3R9IVxuICBpZiAodHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiB7XG4gICAgICBtZXNzYWdlOiBcIkV4cGVjdGVkIG9iamVjdCwgZ290IFwiICsgdHlwZW9mIHZhbHVlLFxuICAgICAgcGF0aDogXCJcIlxuICAgIH07XG4gIH1cbiAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG1lc3NhZ2U6IFwiRXhwZWN0ZWQgb2JqZWN0LCBnb3QgbnVsbFwiLFxuICAgICAgcGF0aDogXCJcIlxuICAgIH07XG4gIH1cbiAgaWYgKCEgaXNQbGFpbk9iamVjdCh2YWx1ZSkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbWVzc2FnZTogXCJFeHBlY3RlZCBwbGFpbiBvYmplY3RcIixcbiAgICAgIHBhdGg6IFwiXCJcbiAgICB9O1xuICB9XG5cbiAgdmFyIHJlcXVpcmVkUGF0dGVybnMgPSB7fTtcbiAgdmFyIG9wdGlvbmFsUGF0dGVybnMgPSB7fTtcblxuICBPYmplY3Qua2V5cyhwYXR0ZXJuKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgY29uc3Qgc3ViUGF0dGVybiA9IHBhdHRlcm5ba2V5XTtcbiAgICBpZiAoc3ViUGF0dGVybiBpbnN0YW5jZW9mIE9wdGlvbmFsIHx8XG4gICAgICAgIHN1YlBhdHRlcm4gaW5zdGFuY2VvZiBNYXliZSkge1xuICAgICAgb3B0aW9uYWxQYXR0ZXJuc1trZXldID0gc3ViUGF0dGVybi5wYXR0ZXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXF1aXJlZFBhdHRlcm5zW2tleV0gPSBzdWJQYXR0ZXJuO1xuICAgIH1cbiAgfSk7XG5cbiAgZm9yICh2YXIga2V5IGluIE9iamVjdCh2YWx1ZSkpIHtcbiAgICB2YXIgc3ViVmFsdWUgPSB2YWx1ZVtrZXldO1xuICAgIGlmIChoYXNPd24uY2FsbChyZXF1aXJlZFBhdHRlcm5zLCBrZXkpKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gdGVzdFN1YnRyZWUoc3ViVmFsdWUsIHJlcXVpcmVkUGF0dGVybnNba2V5XSk7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIHJlc3VsdC5wYXRoID0gX3ByZXBlbmRQYXRoKGtleSwgcmVzdWx0LnBhdGgpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuICAgICAgZGVsZXRlIHJlcXVpcmVkUGF0dGVybnNba2V5XTtcbiAgICB9IGVsc2UgaWYgKGhhc093bi5jYWxsKG9wdGlvbmFsUGF0dGVybnMsIGtleSkpIHtcbiAgICAgIHZhciByZXN1bHQgPSB0ZXN0U3VidHJlZShzdWJWYWx1ZSwgb3B0aW9uYWxQYXR0ZXJuc1trZXldKTtcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgcmVzdWx0LnBhdGggPSBfcHJlcGVuZFBhdGgoa2V5LCByZXN1bHQucGF0aCk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghdW5rbm93bktleXNBbGxvd2VkKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgbWVzc2FnZTogXCJVbmtub3duIGtleVwiLFxuICAgICAgICAgIHBhdGg6IGtleVxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgaWYgKHVua25vd25LZXlQYXR0ZXJuKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSB0ZXN0U3VidHJlZShzdWJWYWx1ZSwgdW5rbm93bktleVBhdHRlcm5bMF0pO1xuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgcmVzdWx0LnBhdGggPSBfcHJlcGVuZFBhdGgoa2V5LCByZXN1bHQucGF0aCk7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMocmVxdWlyZWRQYXR0ZXJucyk7XG4gIGlmIChrZXlzLmxlbmd0aCkge1xuICAgIHJldHVybiB7XG4gICAgICBtZXNzYWdlOiBcIk1pc3Npbmcga2V5ICdcIiArIGtleXNbMF0gKyBcIidcIixcbiAgICAgIHBhdGg6IFwiXCJcbiAgICB9O1xuICB9XG59O1xuXG5jbGFzcyBBcmd1bWVudENoZWNrZXIge1xuICBjb25zdHJ1Y3RvciAoYXJncywgZGVzY3JpcHRpb24pIHtcbiAgICAvLyBNYWtlIGEgU0hBTExPVyBjb3B5IG9mIHRoZSBhcmd1bWVudHMuIChXZSdsbCBiZSBkb2luZyBpZGVudGl0eSBjaGVja3NcbiAgICAvLyBhZ2FpbnN0IGl0cyBjb250ZW50cy4pXG4gICAgdGhpcy5hcmdzID0gWy4uLmFyZ3NdO1xuICAgIC8vIFNpbmNlIHRoZSBjb21tb24gY2FzZSB3aWxsIGJlIHRvIGNoZWNrIGFyZ3VtZW50cyBpbiBvcmRlciwgYW5kIHdlIHNwbGljZVxuICAgIC8vIG91dCBhcmd1bWVudHMgd2hlbiB3ZSBjaGVjayB0aGVtLCBtYWtlIGl0IHNvIHdlIHNwbGljZSBvdXQgZnJvbSB0aGUgZW5kXG4gICAgLy8gcmF0aGVyIHRoYW4gdGhlIGJlZ2lubmluZy5cbiAgICB0aGlzLmFyZ3MucmV2ZXJzZSgpO1xuICAgIHRoaXMuZGVzY3JpcHRpb24gPSBkZXNjcmlwdGlvbjtcbiAgfVxuXG4gIGNoZWNraW5nKHZhbHVlKSB7XG4gICAgaWYgKHRoaXMuX2NoZWNraW5nT25lVmFsdWUodmFsdWUpKVxuICAgICAgcmV0dXJuO1xuICAgIC8vIEFsbG93IGNoZWNrKGFyZ3VtZW50cywgW1N0cmluZ10pIG9yIGNoZWNrKGFyZ3VtZW50cy5zbGljZSgxKSwgW1N0cmluZ10pXG4gICAgLy8gb3IgY2hlY2soW2ZvbywgYmFyXSwgW1N0cmluZ10pIHRvIGNvdW50Li4uIGJ1dCBvbmx5IGlmIHZhbHVlIHdhc24ndFxuICAgIC8vIGl0c2VsZiBhbiBhcmd1bWVudC5cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHwgaXNBcmd1bWVudHModmFsdWUpKSB7XG4gICAgICBBcnJheS5wcm90b3R5cGUuZm9yRWFjaC5jYWxsKHZhbHVlLCB0aGlzLl9jaGVja2luZ09uZVZhbHVlLmJpbmQodGhpcykpO1xuICAgIH1cbiAgfVxuXG4gIF9jaGVja2luZ09uZVZhbHVlKHZhbHVlKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmFyZ3MubGVuZ3RoOyArK2kpIHtcbiAgICAgIC8vIElzIHRoaXMgdmFsdWUgb25lIG9mIHRoZSBhcmd1bWVudHM/IChUaGlzIGNhbiBoYXZlIGEgZmFsc2UgcG9zaXRpdmUgaWZcbiAgICAgIC8vIHRoZSBhcmd1bWVudCBpcyBhbiBpbnRlcm5lZCBwcmltaXRpdmUsIGJ1dCBpdCdzIHN0aWxsIGEgZ29vZCBlbm91Z2hcbiAgICAgIC8vIGNoZWNrLilcbiAgICAgIC8vIChOYU4gaXMgbm90ID09PSB0byBpdHNlbGYsIHNvIHdlIGhhdmUgdG8gY2hlY2sgc3BlY2lhbGx5LilcbiAgICAgIGlmICh2YWx1ZSA9PT0gdGhpcy5hcmdzW2ldIHx8XG4gICAgICAgICAgKE51bWJlci5pc05hTih2YWx1ZSkgJiYgTnVtYmVyLmlzTmFOKHRoaXMuYXJnc1tpXSkpKSB7XG4gICAgICAgIHRoaXMuYXJncy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICB0aHJvd1VubGVzc0FsbEFyZ3VtZW50c0hhdmVCZWVuQ2hlY2tlZCgpIHtcbiAgICBpZiAodGhpcy5hcmdzLmxlbmd0aCA+IDApXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEaWQgbm90IGNoZWNrKCkgYWxsIGFyZ3VtZW50cyBkdXJpbmcgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGVzY3JpcHRpb24pO1xuICB9XG59XG5cbnZhciBfanNLZXl3b3JkcyA9IFtcImRvXCIsIFwiaWZcIiwgXCJpblwiLCBcImZvclwiLCBcImxldFwiLCBcIm5ld1wiLCBcInRyeVwiLCBcInZhclwiLCBcImNhc2VcIixcbiAgXCJlbHNlXCIsIFwiZW51bVwiLCBcImV2YWxcIiwgXCJmYWxzZVwiLCBcIm51bGxcIiwgXCJ0aGlzXCIsIFwidHJ1ZVwiLCBcInZvaWRcIiwgXCJ3aXRoXCIsXG4gIFwiYnJlYWtcIiwgXCJjYXRjaFwiLCBcImNsYXNzXCIsIFwiY29uc3RcIiwgXCJzdXBlclwiLCBcInRocm93XCIsIFwid2hpbGVcIiwgXCJ5aWVsZFwiLFxuICBcImRlbGV0ZVwiLCBcImV4cG9ydFwiLCBcImltcG9ydFwiLCBcInB1YmxpY1wiLCBcInJldHVyblwiLCBcInN0YXRpY1wiLCBcInN3aXRjaFwiLFxuICBcInR5cGVvZlwiLCBcImRlZmF1bHRcIiwgXCJleHRlbmRzXCIsIFwiZmluYWxseVwiLCBcInBhY2thZ2VcIiwgXCJwcml2YXRlXCIsIFwiY29udGludWVcIixcbiAgXCJkZWJ1Z2dlclwiLCBcImZ1bmN0aW9uXCIsIFwiYXJndW1lbnRzXCIsIFwiaW50ZXJmYWNlXCIsIFwicHJvdGVjdGVkXCIsIFwiaW1wbGVtZW50c1wiLFxuICBcImluc3RhbmNlb2ZcIl07XG5cbi8vIEFzc3VtZXMgdGhlIGJhc2Ugb2YgcGF0aCBpcyBhbHJlYWR5IGVzY2FwZWQgcHJvcGVybHlcbi8vIHJldHVybnMga2V5ICsgYmFzZVxuZnVuY3Rpb24gX3ByZXBlbmRQYXRoKGtleSwgYmFzZSkge1xuICBpZiAoKHR5cGVvZiBrZXkpID09PSBcIm51bWJlclwiIHx8IGtleS5tYXRjaCgvXlswLTldKyQvKSkge1xuICAgIGtleSA9IFwiW1wiICsga2V5ICsgXCJdXCI7XG4gIH0gZWxzZSBpZiAoIWtleS5tYXRjaCgvXlthLXpfJF1bMC05YS16XyRdKiQvaSkgfHxcbiAgICAgICAgICAgICBfanNLZXl3b3Jkcy5pbmRleE9mKGtleSkgPj0gMCkge1xuICAgIGtleSA9IEpTT04uc3RyaW5naWZ5KFtrZXldKTtcbiAgfVxuXG4gIGlmIChiYXNlICYmIGJhc2VbMF0gIT09IFwiW1wiKSB7XG4gICAgcmV0dXJuIGtleSArICcuJyArIGJhc2U7XG4gIH1cblxuICByZXR1cm4ga2V5ICsgYmFzZTtcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiB2YWx1ZSAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gYmFzZUlzQXJndW1lbnRzKGl0ZW0pIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGl0ZW0pICYmXG4gICAgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGl0ZW0pID09PSAnW29iamVjdCBBcmd1bWVudHNdJztcbn1cblxudmFyIGlzQXJndW1lbnRzID0gYmFzZUlzQXJndW1lbnRzKGZ1bmN0aW9uKCkge1xuICByZXR1cm4gYXJndW1lbnRzO1xufSgpKSA/IGJhc2VJc0FyZ3VtZW50cyA6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiBpc09iamVjdCh2YWx1ZSkgJiYgdHlwZW9mIHZhbHVlLmNhbGxlZSA9PT0gXCJmdW5jdGlvblwiO1xufTtcbiIsIi8vIENvcHkgb2YgalF1ZXJ5LmlzUGxhaW5PYmplY3QgZm9yIHRoZSBzZXJ2ZXIgc2lkZSBmcm9tIGpRdWVyeSB2My4xLjEuXG5cbnZhciBjbGFzczJ0eXBlID0ge307XG5cbnZhciB0b1N0cmluZyA9IGNsYXNzMnR5cGUudG9TdHJpbmc7XG5cbnZhciBoYXNPd24gPSBjbGFzczJ0eXBlLmhhc093blByb3BlcnR5O1xuXG52YXIgZm5Ub1N0cmluZyA9IGhhc093bi50b1N0cmluZztcblxudmFyIE9iamVjdEZ1bmN0aW9uU3RyaW5nID0gZm5Ub1N0cmluZy5jYWxsKE9iamVjdCk7XG5cbnZhciBnZXRQcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZjtcblxuZXhwb3J0cy5pc1BsYWluT2JqZWN0ID0gZnVuY3Rpb24oIG9iaiApIHtcbiAgdmFyIHByb3RvLFxuICAgIEN0b3I7XG5cbiAgLy8gRGV0ZWN0IG9idmlvdXMgbmVnYXRpdmVzXG4gIC8vIFVzZSB0b1N0cmluZyBpbnN0ZWFkIG9mIGpRdWVyeS50eXBlIHRvIGNhdGNoIGhvc3Qgb2JqZWN0c1xuICBpZiAoIW9iaiB8fCB0b1N0cmluZy5jYWxsKG9iaikgIT09IFwiW29iamVjdCBPYmplY3RdXCIpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBwcm90byA9IGdldFByb3RvKG9iaik7XG5cbiAgLy8gT2JqZWN0cyB3aXRoIG5vIHByb3RvdHlwZSAoZS5nLiwgYE9iamVjdC5jcmVhdGUoIG51bGwgKWApIGFyZSBwbGFpblxuICBpZiAoIXByb3RvKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBPYmplY3RzIHdpdGggcHJvdG90eXBlIGFyZSBwbGFpbiBpZmYgdGhleSB3ZXJlIGNvbnN0cnVjdGVkIGJ5IGEgZ2xvYmFsIE9iamVjdCBmdW5jdGlvblxuICBDdG9yID0gaGFzT3duLmNhbGwocHJvdG8sIFwiY29uc3RydWN0b3JcIikgJiYgcHJvdG8uY29uc3RydWN0b3I7XG4gIHJldHVybiB0eXBlb2YgQ3RvciA9PT0gXCJmdW5jdGlvblwiICYmIGZuVG9TdHJpbmcuY2FsbChDdG9yKSA9PT0gT2JqZWN0RnVuY3Rpb25TdHJpbmc7XG59O1xuIl19
