(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var ECMAScript = Package.ecmascript.ECMAScript;
var EJSON = Package.ejson.EJSON;
var GeoJSON = Package['geojson-utils'].GeoJSON;
var IdMap = Package['id-map'].IdMap;
var MongoID = Package['mongo-id'].MongoID;
var OrderedDict = Package['ordered-dict'].OrderedDict;
var Random = Package.random.Random;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var operand, selectorValue, MinimongoTest, MinimongoError, selector, doc, callback, options, oldResults, a, b, LocalCollection, Minimongo;

var require = meteorInstall({"node_modules":{"meteor":{"minimongo":{"minimongo_server.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/minimongo_server.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.watch(require("./minimongo_common.js"));
let hasOwn, isNumericKey, isOperatorObject, pathsToTree, projectionDetails;
module.watch(require("./common.js"), {
  hasOwn(v) {
    hasOwn = v;
  },

  isNumericKey(v) {
    isNumericKey = v;
  },

  isOperatorObject(v) {
    isOperatorObject = v;
  },

  pathsToTree(v) {
    pathsToTree = v;
  },

  projectionDetails(v) {
    projectionDetails = v;
  }

}, 0);

Minimongo._pathsElidingNumericKeys = paths => paths.map(path => path.split('.').filter(part => !isNumericKey(part)).join('.')); // Returns true if the modifier applied to some document may change the result
// of matching the document by selector
// The modifier is always in a form of Object:
//  - $set
//    - 'a.b.22.z': value
//    - 'foo.bar': 42
//  - $unset
//    - 'abc.d': 1


Minimongo.Matcher.prototype.affectedByModifier = function (modifier) {
  // safe check for $set/$unset being objects
  modifier = Object.assign({
    $set: {},
    $unset: {}
  }, modifier);

  const meaningfulPaths = this._getPaths();

  const modifiedPaths = [].concat(Object.keys(modifier.$set), Object.keys(modifier.$unset));
  return modifiedPaths.some(path => {
    const mod = path.split('.');
    return meaningfulPaths.some(meaningfulPath => {
      const sel = meaningfulPath.split('.');
      let i = 0,
          j = 0;

      while (i < sel.length && j < mod.length) {
        if (isNumericKey(sel[i]) && isNumericKey(mod[j])) {
          // foo.4.bar selector affected by foo.4 modifier
          // foo.3.bar selector unaffected by foo.4 modifier
          if (sel[i] === mod[j]) {
            i++;
            j++;
          } else {
            return false;
          }
        } else if (isNumericKey(sel[i])) {
          // foo.4.bar selector unaffected by foo.bar modifier
          return false;
        } else if (isNumericKey(mod[j])) {
          j++;
        } else if (sel[i] === mod[j]) {
          i++;
          j++;
        } else {
          return false;
        }
      } // One is a prefix of another, taking numeric fields into account


      return true;
    });
  });
}; // @param modifier - Object: MongoDB-styled modifier with `$set`s and `$unsets`
//                           only. (assumed to come from oplog)
// @returns - Boolean: if after applying the modifier, selector can start
//                     accepting the modified value.
// NOTE: assumes that document affected by modifier didn't match this Matcher
// before, so if modifier can't convince selector in a positive change it would
// stay 'false'.
// Currently doesn't support $-operators and numeric indices precisely.


Minimongo.Matcher.prototype.canBecomeTrueByModifier = function (modifier) {
  if (!this.affectedByModifier(modifier)) {
    return false;
  }

  if (!this.isSimple()) {
    return true;
  }

  modifier = Object.assign({
    $set: {},
    $unset: {}
  }, modifier);
  const modifierPaths = [].concat(Object.keys(modifier.$set), Object.keys(modifier.$unset));

  if (this._getPaths().some(pathHasNumericKeys) || modifierPaths.some(pathHasNumericKeys)) {
    return true;
  } // check if there is a $set or $unset that indicates something is an
  // object rather than a scalar in the actual object where we saw $-operator
  // NOTE: it is correct since we allow only scalars in $-operators
  // Example: for selector {'a.b': {$gt: 5}} the modifier {'a.b.c':7} would
  // definitely set the result to false as 'a.b' appears to be an object.


  const expectedScalarIsObject = Object.keys(this._selector).some(path => {
    if (!isOperatorObject(this._selector[path])) {
      return false;
    }

    return modifierPaths.some(modifierPath => modifierPath.startsWith(`${path}.`));
  });

  if (expectedScalarIsObject) {
    return false;
  } // See if we can apply the modifier on the ideally matching object. If it
  // still matches the selector, then the modifier could have turned the real
  // object in the database into something matching.


  const matchingDocument = EJSON.clone(this.matchingDocument()); // The selector is too complex, anything can happen.

  if (matchingDocument === null) {
    return true;
  }

  try {
    LocalCollection._modify(matchingDocument, modifier);
  } catch (error) {
    // Couldn't set a property on a field which is a scalar or null in the
    // selector.
    // Example:
    // real document: { 'a.b': 3 }
    // selector: { 'a': 12 }
    // converted selector (ideal document): { 'a': 12 }
    // modifier: { $set: { 'a.b': 4 } }
    // We don't know what real document was like but from the error raised by
    // $set on a scalar field we can reason that the structure of real document
    // is completely different.
    if (error.name === 'MinimongoError' && error.setPropertyError) {
      return false;
    }

    throw error;
  }

  return this.documentMatches(matchingDocument).result;
}; // Knows how to combine a mongo selector and a fields projection to a new fields
// projection taking into account active fields from the passed selector.
// @returns Object - projection object (same as fields option of mongo cursor)


Minimongo.Matcher.prototype.combineIntoProjection = function (projection) {
  const selectorPaths = Minimongo._pathsElidingNumericKeys(this._getPaths()); // Special case for $where operator in the selector - projection should depend
  // on all fields of the document. getSelectorPaths returns a list of paths
  // selector depends on. If one of the paths is '' (empty string) representing
  // the root or the whole document, complete projection should be returned.


  if (selectorPaths.includes('')) {
    return {};
  }

  return combineImportantPathsIntoProjection(selectorPaths, projection);
}; // Returns an object that would match the selector if possible or null if the
// selector is too complex for us to analyze
// { 'a.b': { ans: 42 }, 'foo.bar': null, 'foo.baz': "something" }
// => { a: { b: { ans: 42 } }, foo: { bar: null, baz: "something" } }


Minimongo.Matcher.prototype.matchingDocument = function () {
  // check if it was computed before
  if (this._matchingDocument !== undefined) {
    return this._matchingDocument;
  } // If the analysis of this selector is too hard for our implementation
  // fallback to "YES"


  let fallback = false;
  this._matchingDocument = pathsToTree(this._getPaths(), path => {
    const valueSelector = this._selector[path];

    if (isOperatorObject(valueSelector)) {
      // if there is a strict equality, there is a good
      // chance we can use one of those as "matching"
      // dummy value
      if (valueSelector.$eq) {
        return valueSelector.$eq;
      }

      if (valueSelector.$in) {
        const matcher = new Minimongo.Matcher({
          placeholder: valueSelector
        }); // Return anything from $in that matches the whole selector for this
        // path. If nothing matches, returns `undefined` as nothing can make
        // this selector into `true`.

        return valueSelector.$in.find(placeholder => matcher.documentMatches({
          placeholder
        }).result);
      }

      if (onlyContainsKeys(valueSelector, ['$gt', '$gte', '$lt', '$lte'])) {
        let lowerBound = -Infinity;
        let upperBound = Infinity;
        ['$lte', '$lt'].forEach(op => {
          if (hasOwn.call(valueSelector, op) && valueSelector[op] < upperBound) {
            upperBound = valueSelector[op];
          }
        });
        ['$gte', '$gt'].forEach(op => {
          if (hasOwn.call(valueSelector, op) && valueSelector[op] > lowerBound) {
            lowerBound = valueSelector[op];
          }
        });
        const middle = (lowerBound + upperBound) / 2;
        const matcher = new Minimongo.Matcher({
          placeholder: valueSelector
        });

        if (!matcher.documentMatches({
          placeholder: middle
        }).result && (middle === lowerBound || middle === upperBound)) {
          fallback = true;
        }

        return middle;
      }

      if (onlyContainsKeys(valueSelector, ['$nin', '$ne'])) {
        // Since this._isSimple makes sure $nin and $ne are not combined with
        // objects or arrays, we can confidently return an empty object as it
        // never matches any scalar.
        return {};
      }

      fallback = true;
    }

    return this._selector[path];
  }, x => x);

  if (fallback) {
    this._matchingDocument = null;
  }

  return this._matchingDocument;
}; // Minimongo.Sorter gets a similar method, which delegates to a Matcher it made
// for this exact purpose.


Minimongo.Sorter.prototype.affectedByModifier = function (modifier) {
  return this._selectorForAffectedByModifier.affectedByModifier(modifier);
};

Minimongo.Sorter.prototype.combineIntoProjection = function (projection) {
  return combineImportantPathsIntoProjection(Minimongo._pathsElidingNumericKeys(this._getPaths()), projection);
};

function combineImportantPathsIntoProjection(paths, projection) {
  const details = projectionDetails(projection); // merge the paths to include

  const tree = pathsToTree(paths, path => true, (node, path, fullPath) => true, details.tree);
  const mergedProjection = treeToPaths(tree);

  if (details.including) {
    // both selector and projection are pointing on fields to include
    // so we can just return the merged tree
    return mergedProjection;
  } // selector is pointing at fields to include
  // projection is pointing at fields to exclude
  // make sure we don't exclude important paths


  const mergedExclProjection = {};
  Object.keys(mergedProjection).forEach(path => {
    if (!mergedProjection[path]) {
      mergedExclProjection[path] = false;
    }
  });
  return mergedExclProjection;
}

function getPaths(selector) {
  return Object.keys(new Minimongo.Matcher(selector)._paths); // XXX remove it?
  // return Object.keys(selector).map(k => {
  //   // we don't know how to handle $where because it can be anything
  //   if (k === '$where') {
  //     return ''; // matches everything
  //   }
  //   // we branch from $or/$and/$nor operator
  //   if (['$or', '$and', '$nor'].includes(k)) {
  //     return selector[k].map(getPaths);
  //   }
  //   // the value is a literal or some comparison operator
  //   return k;
  // })
  //   .reduce((a, b) => a.concat(b), [])
  //   .filter((a, b, c) => c.indexOf(a) === b);
} // A helper to ensure object has only certain keys


function onlyContainsKeys(obj, keys) {
  return Object.keys(obj).every(k => keys.includes(k));
}

function pathHasNumericKeys(path) {
  return path.split('.').some(isNumericKey);
} // Returns a set of key paths similar to
// { 'foo.bar': 1, 'a.b.c': 1 }


function treeToPaths(tree, prefix = '') {
  const result = {};
  Object.keys(tree).forEach(key => {
    const value = tree[key];

    if (value === Object(value)) {
      Object.assign(result, treeToPaths(value, `${prefix + key}.`));
    } else {
      result[prefix + key] = value;
    }
  });
  return result;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"common.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/common.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  hasOwn: () => hasOwn,
  ELEMENT_OPERATORS: () => ELEMENT_OPERATORS,
  compileDocumentSelector: () => compileDocumentSelector,
  equalityElementMatcher: () => equalityElementMatcher,
  expandArraysInBranches: () => expandArraysInBranches,
  isIndexable: () => isIndexable,
  isNumericKey: () => isNumericKey,
  isOperatorObject: () => isOperatorObject,
  makeLookupFunction: () => makeLookupFunction,
  nothingMatcher: () => nothingMatcher,
  pathsToTree: () => pathsToTree,
  populateDocumentWithQueryFields: () => populateDocumentWithQueryFields,
  projectionDetails: () => projectionDetails,
  regexpElementMatcher: () => regexpElementMatcher
});
let LocalCollection;
module.watch(require("./local_collection.js"), {
  default(v) {
    LocalCollection = v;
  }

}, 0);
const hasOwn = Object.prototype.hasOwnProperty;
const ELEMENT_OPERATORS = {
  $lt: makeInequality(cmpValue => cmpValue < 0),
  $gt: makeInequality(cmpValue => cmpValue > 0),
  $lte: makeInequality(cmpValue => cmpValue <= 0),
  $gte: makeInequality(cmpValue => cmpValue >= 0),
  $mod: {
    compileElementSelector(operand) {
      if (!(Array.isArray(operand) && operand.length === 2 && typeof operand[0] === 'number' && typeof operand[1] === 'number')) {
        throw Error('argument to $mod must be an array of two numbers');
      } // XXX could require to be ints or round or something


      const divisor = operand[0];
      const remainder = operand[1];
      return value => typeof value === 'number' && value % divisor === remainder;
    }

  },
  $in: {
    compileElementSelector(operand) {
      if (!Array.isArray(operand)) {
        throw Error('$in needs an array');
      }

      const elementMatchers = operand.map(option => {
        if (option instanceof RegExp) {
          return regexpElementMatcher(option);
        }

        if (isOperatorObject(option)) {
          throw Error('cannot nest $ under $in');
        }

        return equalityElementMatcher(option);
      });
      return value => {
        // Allow {a: {$in: [null]}} to match when 'a' does not exist.
        if (value === undefined) {
          value = null;
        }

        return elementMatchers.some(matcher => matcher(value));
      };
    }

  },
  $size: {
    // {a: [[5, 5]]} must match {a: {$size: 1}} but not {a: {$size: 2}}, so we
    // don't want to consider the element [5,5] in the leaf array [[5,5]] as a
    // possible value.
    dontExpandLeafArrays: true,

    compileElementSelector(operand) {
      if (typeof operand === 'string') {
        // Don't ask me why, but by experimentation, this seems to be what Mongo
        // does.
        operand = 0;
      } else if (typeof operand !== 'number') {
        throw Error('$size needs a number');
      }

      return value => Array.isArray(value) && value.length === operand;
    }

  },
  $type: {
    // {a: [5]} must not match {a: {$type: 4}} (4 means array), but it should
    // match {a: {$type: 1}} (1 means number), and {a: [[5]]} must match {$a:
    // {$type: 4}}. Thus, when we see a leaf array, we *should* expand it but
    // should *not* include it itself.
    dontIncludeLeafArrays: true,

    compileElementSelector(operand) {
      if (typeof operand === 'string') {
        const operandAliasMap = {
          'double': 1,
          'string': 2,
          'object': 3,
          'array': 4,
          'binData': 5,
          'undefined': 6,
          'objectId': 7,
          'bool': 8,
          'date': 9,
          'null': 10,
          'regex': 11,
          'dbPointer': 12,
          'javascript': 13,
          'symbol': 14,
          'javascriptWithScope': 15,
          'int': 16,
          'timestamp': 17,
          'long': 18,
          'decimal': 19,
          'minKey': -1,
          'maxKey': 127
        };

        if (!hasOwn.call(operandAliasMap, operand)) {
          throw Error(`unknown string alias for $type: ${operand}`);
        }

        operand = operandAliasMap[operand];
      } else if (typeof operand === 'number') {
        if (operand === 0 || operand < -1 || operand > 19 && operand !== 127) {
          throw Error(`Invalid numerical $type code: ${operand}`);
        }
      } else {
        throw Error('argument to $type is not a number or a string');
      }

      return value => value !== undefined && LocalCollection._f._type(value) === operand;
    }

  },
  $bitsAllSet: {
    compileElementSelector(operand) {
      const mask = getOperandBitmask(operand, '$bitsAllSet');
      return value => {
        const bitmask = getValueBitmask(value, mask.length);
        return bitmask && mask.every((byte, i) => (bitmask[i] & byte) === byte);
      };
    }

  },
  $bitsAnySet: {
    compileElementSelector(operand) {
      const mask = getOperandBitmask(operand, '$bitsAnySet');
      return value => {
        const bitmask = getValueBitmask(value, mask.length);
        return bitmask && mask.some((byte, i) => (~bitmask[i] & byte) !== byte);
      };
    }

  },
  $bitsAllClear: {
    compileElementSelector(operand) {
      const mask = getOperandBitmask(operand, '$bitsAllClear');
      return value => {
        const bitmask = getValueBitmask(value, mask.length);
        return bitmask && mask.every((byte, i) => !(bitmask[i] & byte));
      };
    }

  },
  $bitsAnyClear: {
    compileElementSelector(operand) {
      const mask = getOperandBitmask(operand, '$bitsAnyClear');
      return value => {
        const bitmask = getValueBitmask(value, mask.length);
        return bitmask && mask.some((byte, i) => (bitmask[i] & byte) !== byte);
      };
    }

  },
  $regex: {
    compileElementSelector(operand, valueSelector) {
      if (!(typeof operand === 'string' || operand instanceof RegExp)) {
        throw Error('$regex has to be a string or RegExp');
      }

      let regexp;

      if (valueSelector.$options !== undefined) {
        // Options passed in $options (even the empty string) always overrides
        // options in the RegExp object itself.
        // Be clear that we only support the JS-supported options, not extended
        // ones (eg, Mongo supports x and s). Ideally we would implement x and s
        // by transforming the regexp, but not today...
        if (/[^gim]/.test(valueSelector.$options)) {
          throw new Error('Only the i, m, and g regexp options are supported');
        }

        const source = operand instanceof RegExp ? operand.source : operand;
        regexp = new RegExp(source, valueSelector.$options);
      } else if (operand instanceof RegExp) {
        regexp = operand;
      } else {
        regexp = new RegExp(operand);
      }

      return regexpElementMatcher(regexp);
    }

  },
  $elemMatch: {
    dontExpandLeafArrays: true,

    compileElementSelector(operand, valueSelector, matcher) {
      if (!LocalCollection._isPlainObject(operand)) {
        throw Error('$elemMatch need an object');
      }

      const isDocMatcher = !isOperatorObject(Object.keys(operand).filter(key => !hasOwn.call(LOGICAL_OPERATORS, key)).reduce((a, b) => Object.assign(a, {
        [b]: operand[b]
      }), {}), true);
      let subMatcher;

      if (isDocMatcher) {
        // This is NOT the same as compileValueSelector(operand), and not just
        // because of the slightly different calling convention.
        // {$elemMatch: {x: 3}} means "an element has a field x:3", not
        // "consists only of a field x:3". Also, regexps and sub-$ are allowed.
        subMatcher = compileDocumentSelector(operand, matcher, {
          inElemMatch: true
        });
      } else {
        subMatcher = compileValueSelector(operand, matcher);
      }

      return value => {
        if (!Array.isArray(value)) {
          return false;
        }

        for (let i = 0; i < value.length; ++i) {
          const arrayElement = value[i];
          let arg;

          if (isDocMatcher) {
            // We can only match {$elemMatch: {b: 3}} against objects.
            // (We can also match against arrays, if there's numeric indices,
            // eg {$elemMatch: {'0.b': 3}} or {$elemMatch: {0: 3}}.)
            if (!isIndexable(arrayElement)) {
              return false;
            }

            arg = arrayElement;
          } else {
            // dontIterate ensures that {a: {$elemMatch: {$gt: 5}}} matches
            // {a: [8]} but not {a: [[8]]}
            arg = [{
              value: arrayElement,
              dontIterate: true
            }];
          } // XXX support $near in $elemMatch by propagating $distance?


          if (subMatcher(arg).result) {
            return i; // specially understood to mean "use as arrayIndices"
          }
        }

        return false;
      };
    }

  }
};
// Operators that appear at the top level of a document selector.
const LOGICAL_OPERATORS = {
  $and(subSelector, matcher, inElemMatch) {
    return andDocumentMatchers(compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch));
  },

  $or(subSelector, matcher, inElemMatch) {
    const matchers = compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch); // Special case: if there is only one matcher, use it directly, *preserving*
    // any arrayIndices it returns.

    if (matchers.length === 1) {
      return matchers[0];
    }

    return doc => {
      const result = matchers.some(fn => fn(doc).result); // $or does NOT set arrayIndices when it has multiple
      // sub-expressions. (Tested against MongoDB.)

      return {
        result
      };
    };
  },

  $nor(subSelector, matcher, inElemMatch) {
    const matchers = compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch);
    return doc => {
      const result = matchers.every(fn => !fn(doc).result); // Never set arrayIndices, because we only match if nothing in particular
      // 'matched' (and because this is consistent with MongoDB).

      return {
        result
      };
    };
  },

  $where(selectorValue, matcher) {
    // Record that *any* path may be used.
    matcher._recordPathUsed('');

    matcher._hasWhere = true;

    if (!(selectorValue instanceof Function)) {
      // XXX MongoDB seems to have more complex logic to decide where or or not
      // to add 'return'; not sure exactly what it is.
      selectorValue = Function('obj', `return ${selectorValue}`);
    } // We make the document available as both `this` and `obj`.
    // // XXX not sure what we should do if this throws


    return doc => ({
      result: selectorValue.call(doc, doc)
    });
  },

  // This is just used as a comment in the query (in MongoDB, it also ends up in
  // query logs); it has no effect on the actual selection.
  $comment() {
    return () => ({
      result: true
    });
  }

}; // Operators that (unlike LOGICAL_OPERATORS) pertain to individual paths in a
// document, but (unlike ELEMENT_OPERATORS) do not have a simple definition as
// "match each branched value independently and combine with
// convertElementMatcherToBranchedMatcher".

const VALUE_OPERATORS = {
  $eq(operand) {
    return convertElementMatcherToBranchedMatcher(equalityElementMatcher(operand));
  },

  $not(operand, valueSelector, matcher) {
    return invertBranchedMatcher(compileValueSelector(operand, matcher));
  },

  $ne(operand) {
    return invertBranchedMatcher(convertElementMatcherToBranchedMatcher(equalityElementMatcher(operand)));
  },

  $nin(operand) {
    return invertBranchedMatcher(convertElementMatcherToBranchedMatcher(ELEMENT_OPERATORS.$in.compileElementSelector(operand)));
  },

  $exists(operand) {
    const exists = convertElementMatcherToBranchedMatcher(value => value !== undefined);
    return operand ? exists : invertBranchedMatcher(exists);
  },

  // $options just provides options for $regex; its logic is inside $regex
  $options(operand, valueSelector) {
    if (!hasOwn.call(valueSelector, '$regex')) {
      throw Error('$options needs a $regex');
    }

    return everythingMatcher;
  },

  // $maxDistance is basically an argument to $near
  $maxDistance(operand, valueSelector) {
    if (!valueSelector.$near) {
      throw Error('$maxDistance needs a $near');
    }

    return everythingMatcher;
  },

  $all(operand, valueSelector, matcher) {
    if (!Array.isArray(operand)) {
      throw Error('$all requires array');
    } // Not sure why, but this seems to be what MongoDB does.


    if (operand.length === 0) {
      return nothingMatcher;
    }

    const branchedMatchers = operand.map(criterion => {
      // XXX handle $all/$elemMatch combination
      if (isOperatorObject(criterion)) {
        throw Error('no $ expressions in $all');
      } // This is always a regexp or equality selector.


      return compileValueSelector(criterion, matcher);
    }); // andBranchedMatchers does NOT require all selectors to return true on the
    // SAME branch.

    return andBranchedMatchers(branchedMatchers);
  },

  $near(operand, valueSelector, matcher, isRoot) {
    if (!isRoot) {
      throw Error('$near can\'t be inside another $ operator');
    }

    matcher._hasGeoQuery = true; // There are two kinds of geodata in MongoDB: legacy coordinate pairs and
    // GeoJSON. They use different distance metrics, too. GeoJSON queries are
    // marked with a $geometry property, though legacy coordinates can be
    // matched using $geometry.

    let maxDistance, point, distance;

    if (LocalCollection._isPlainObject(operand) && hasOwn.call(operand, '$geometry')) {
      // GeoJSON "2dsphere" mode.
      maxDistance = operand.$maxDistance;
      point = operand.$geometry;

      distance = value => {
        // XXX: for now, we don't calculate the actual distance between, say,
        // polygon and circle. If people care about this use-case it will get
        // a priority.
        if (!value) {
          return null;
        }

        if (!value.type) {
          return GeoJSON.pointDistance(point, {
            type: 'Point',
            coordinates: pointToArray(value)
          });
        }

        if (value.type === 'Point') {
          return GeoJSON.pointDistance(point, value);
        }

        return GeoJSON.geometryWithinRadius(value, point, maxDistance) ? 0 : maxDistance + 1;
      };
    } else {
      maxDistance = valueSelector.$maxDistance;

      if (!isIndexable(operand)) {
        throw Error('$near argument must be coordinate pair or GeoJSON');
      }

      point = pointToArray(operand);

      distance = value => {
        if (!isIndexable(value)) {
          return null;
        }

        return distanceCoordinatePairs(point, value);
      };
    }

    return branchedValues => {
      // There might be multiple points in the document that match the given
      // field. Only one of them needs to be within $maxDistance, but we need to
      // evaluate all of them and use the nearest one for the implicit sort
      // specifier. (That's why we can't just use ELEMENT_OPERATORS here.)
      //
      // Note: This differs from MongoDB's implementation, where a document will
      // actually show up *multiple times* in the result set, with one entry for
      // each within-$maxDistance branching point.
      const result = {
        result: false
      };
      expandArraysInBranches(branchedValues).every(branch => {
        // if operation is an update, don't skip branches, just return the first
        // one (#3599)
        let curDistance;

        if (!matcher._isUpdate) {
          if (!(typeof branch.value === 'object')) {
            return true;
          }

          curDistance = distance(branch.value); // Skip branches that aren't real points or are too far away.

          if (curDistance === null || curDistance > maxDistance) {
            return true;
          } // Skip anything that's a tie.


          if (result.distance !== undefined && result.distance <= curDistance) {
            return true;
          }
        }

        result.result = true;
        result.distance = curDistance;

        if (branch.arrayIndices) {
          result.arrayIndices = branch.arrayIndices;
        } else {
          delete result.arrayIndices;
        }

        return !matcher._isUpdate;
      });
      return result;
    };
  }

}; // NB: We are cheating and using this function to implement 'AND' for both
// 'document matchers' and 'branched matchers'. They both return result objects
// but the argument is different: for the former it's a whole doc, whereas for
// the latter it's an array of 'branched values'.

function andSomeMatchers(subMatchers) {
  if (subMatchers.length === 0) {
    return everythingMatcher;
  }

  if (subMatchers.length === 1) {
    return subMatchers[0];
  }

  return docOrBranches => {
    const match = {};
    match.result = subMatchers.every(fn => {
      const subResult = fn(docOrBranches); // Copy a 'distance' number out of the first sub-matcher that has
      // one. Yes, this means that if there are multiple $near fields in a
      // query, something arbitrary happens; this appears to be consistent with
      // Mongo.

      if (subResult.result && subResult.distance !== undefined && match.distance === undefined) {
        match.distance = subResult.distance;
      } // Similarly, propagate arrayIndices from sub-matchers... but to match
      // MongoDB behavior, this time the *last* sub-matcher with arrayIndices
      // wins.


      if (subResult.result && subResult.arrayIndices) {
        match.arrayIndices = subResult.arrayIndices;
      }

      return subResult.result;
    }); // If we didn't actually match, forget any extra metadata we came up with.

    if (!match.result) {
      delete match.distance;
      delete match.arrayIndices;
    }

    return match;
  };
}

const andDocumentMatchers = andSomeMatchers;
const andBranchedMatchers = andSomeMatchers;

function compileArrayOfDocumentSelectors(selectors, matcher, inElemMatch) {
  if (!Array.isArray(selectors) || selectors.length === 0) {
    throw Error('$and/$or/$nor must be nonempty array');
  }

  return selectors.map(subSelector => {
    if (!LocalCollection._isPlainObject(subSelector)) {
      throw Error('$or/$and/$nor entries need to be full objects');
    }

    return compileDocumentSelector(subSelector, matcher, {
      inElemMatch
    });
  });
} // Takes in a selector that could match a full document (eg, the original
// selector). Returns a function mapping document->result object.
//
// matcher is the Matcher object we are compiling.
//
// If this is the root document selector (ie, not wrapped in $and or the like),
// then isRoot is true. (This is used by $near.)


function compileDocumentSelector(docSelector, matcher, options = {}) {
  const docMatchers = Object.keys(docSelector).map(key => {
    const subSelector = docSelector[key];

    if (key.substr(0, 1) === '$') {
      // Outer operators are either logical operators (they recurse back into
      // this function), or $where.
      if (!hasOwn.call(LOGICAL_OPERATORS, key)) {
        throw new Error(`Unrecognized logical operator: ${key}`);
      }

      matcher._isSimple = false;
      return LOGICAL_OPERATORS[key](subSelector, matcher, options.inElemMatch);
    } // Record this path, but only if we aren't in an elemMatcher, since in an
    // elemMatch this is a path inside an object in an array, not in the doc
    // root.


    if (!options.inElemMatch) {
      matcher._recordPathUsed(key);
    } // Don't add a matcher if subSelector is a function -- this is to match
    // the behavior of Meteor on the server (inherited from the node mongodb
    // driver), which is to ignore any part of a selector which is a function.


    if (typeof subSelector === 'function') {
      return undefined;
    }

    const lookUpByIndex = makeLookupFunction(key);
    const valueMatcher = compileValueSelector(subSelector, matcher, options.isRoot);
    return doc => valueMatcher(lookUpByIndex(doc));
  }).filter(Boolean);
  return andDocumentMatchers(docMatchers);
}

// Takes in a selector that could match a key-indexed value in a document; eg,
// {$gt: 5, $lt: 9}, or a regular expression, or any non-expression object (to
// indicate equality).  Returns a branched matcher: a function mapping
// [branched value]->result object.
function compileValueSelector(valueSelector, matcher, isRoot) {
  if (valueSelector instanceof RegExp) {
    matcher._isSimple = false;
    return convertElementMatcherToBranchedMatcher(regexpElementMatcher(valueSelector));
  }

  if (isOperatorObject(valueSelector)) {
    return operatorBranchedMatcher(valueSelector, matcher, isRoot);
  }

  return convertElementMatcherToBranchedMatcher(equalityElementMatcher(valueSelector));
} // Given an element matcher (which evaluates a single value), returns a branched
// value (which evaluates the element matcher on all the branches and returns a
// more structured return value possibly including arrayIndices).


function convertElementMatcherToBranchedMatcher(elementMatcher, options = {}) {
  return branches => {
    const expanded = options.dontExpandLeafArrays ? branches : expandArraysInBranches(branches, options.dontIncludeLeafArrays);
    const match = {};
    match.result = expanded.some(element => {
      let matched = elementMatcher(element.value); // Special case for $elemMatch: it means "true, and use this as an array
      // index if I didn't already have one".

      if (typeof matched === 'number') {
        // XXX This code dates from when we only stored a single array index
        // (for the outermost array). Should we be also including deeper array
        // indices from the $elemMatch match?
        if (!element.arrayIndices) {
          element.arrayIndices = [matched];
        }

        matched = true;
      } // If some element matched, and it's tagged with array indices, include
      // those indices in our result object.


      if (matched && element.arrayIndices) {
        match.arrayIndices = element.arrayIndices;
      }

      return matched;
    });
    return match;
  };
} // Helpers for $near.


function distanceCoordinatePairs(a, b) {
  const pointA = pointToArray(a);
  const pointB = pointToArray(b);
  return Math.hypot(pointA[0] - pointB[0], pointA[1] - pointB[1]);
} // Takes something that is not an operator object and returns an element matcher
// for equality with that thing.


function equalityElementMatcher(elementSelector) {
  if (isOperatorObject(elementSelector)) {
    throw Error('Can\'t create equalityValueSelector for operator object');
  } // Special-case: null and undefined are equal (if you got undefined in there
  // somewhere, or if you got it due to some branch being non-existent in the
  // weird special case), even though they aren't with EJSON.equals.
  // undefined or null


  if (elementSelector == null) {
    return value => value == null;
  }

  return value => LocalCollection._f._equal(elementSelector, value);
}

function everythingMatcher(docOrBranchedValues) {
  return {
    result: true
  };
}

function expandArraysInBranches(branches, skipTheArrays) {
  const branchesOut = [];
  branches.forEach(branch => {
    const thisIsArray = Array.isArray(branch.value); // We include the branch itself, *UNLESS* we it's an array that we're going
    // to iterate and we're told to skip arrays.  (That's right, we include some
    // arrays even skipTheArrays is true: these are arrays that were found via
    // explicit numerical indices.)

    if (!(skipTheArrays && thisIsArray && !branch.dontIterate)) {
      branchesOut.push({
        arrayIndices: branch.arrayIndices,
        value: branch.value
      });
    }

    if (thisIsArray && !branch.dontIterate) {
      branch.value.forEach((value, i) => {
        branchesOut.push({
          arrayIndices: (branch.arrayIndices || []).concat(i),
          value
        });
      });
    }
  });
  return branchesOut;
}

// Helpers for $bitsAllSet/$bitsAnySet/$bitsAllClear/$bitsAnyClear.
function getOperandBitmask(operand, selector) {
  // numeric bitmask
  // You can provide a numeric bitmask to be matched against the operand field.
  // It must be representable as a non-negative 32-bit signed integer.
  // Otherwise, $bitsAllSet will return an error.
  if (Number.isInteger(operand) && operand >= 0) {
    return new Uint8Array(new Int32Array([operand]).buffer);
  } // bindata bitmask
  // You can also use an arbitrarily large BinData instance as a bitmask.


  if (EJSON.isBinary(operand)) {
    return new Uint8Array(operand.buffer);
  } // position list
  // If querying a list of bit positions, each <position> must be a non-negative
  // integer. Bit positions start at 0 from the least significant bit.


  if (Array.isArray(operand) && operand.every(x => Number.isInteger(x) && x >= 0)) {
    const buffer = new ArrayBuffer((Math.max(...operand) >> 3) + 1);
    const view = new Uint8Array(buffer);
    operand.forEach(x => {
      view[x >> 3] |= 1 << (x & 0x7);
    });
    return view;
  } // bad operand


  throw Error(`operand to ${selector} must be a numeric bitmask (representable as a ` + 'non-negative 32-bit signed integer), a bindata bitmask or an array with ' + 'bit positions (non-negative integers)');
}

function getValueBitmask(value, length) {
  // The field value must be either numerical or a BinData instance. Otherwise,
  // $bits... will not match the current document.
  // numerical
  if (Number.isSafeInteger(value)) {
    // $bits... will not match numerical values that cannot be represented as a
    // signed 64-bit integer. This can be the case if a value is either too
    // large or small to fit in a signed 64-bit integer, or if it has a
    // fractional component.
    const buffer = new ArrayBuffer(Math.max(length, 2 * Uint32Array.BYTES_PER_ELEMENT));
    let view = new Uint32Array(buffer, 0, 2);
    view[0] = value % ((1 << 16) * (1 << 16)) | 0;
    view[1] = value / ((1 << 16) * (1 << 16)) | 0; // sign extension

    if (value < 0) {
      view = new Uint8Array(buffer, 2);
      view.forEach((byte, i) => {
        view[i] = 0xff;
      });
    }

    return new Uint8Array(buffer);
  } // bindata


  if (EJSON.isBinary(value)) {
    return new Uint8Array(value.buffer);
  } // no match


  return false;
} // Actually inserts a key value into the selector document
// However, this checks there is no ambiguity in setting
// the value for the given key, throws otherwise


function insertIntoDocument(document, key, value) {
  Object.keys(document).forEach(existingKey => {
    if (existingKey.length > key.length && existingKey.indexOf(`${key}.`) === 0 || key.length > existingKey.length && key.indexOf(`${existingKey}.`) === 0) {
      throw new Error(`cannot infer query fields to set, both paths '${existingKey}' and ` + `'${key}' are matched`);
    } else if (existingKey === key) {
      throw new Error(`cannot infer query fields to set, path '${key}' is matched twice`);
    }
  });
  document[key] = value;
} // Returns a branched matcher that matches iff the given matcher does not.
// Note that this implicitly "deMorganizes" the wrapped function.  ie, it
// means that ALL branch values need to fail to match innerBranchedMatcher.


function invertBranchedMatcher(branchedMatcher) {
  return branchValues => {
    // We explicitly choose to strip arrayIndices here: it doesn't make sense to
    // say "update the array element that does not match something", at least
    // in mongo-land.
    return {
      result: !branchedMatcher(branchValues).result
    };
  };
}

function isIndexable(obj) {
  return Array.isArray(obj) || LocalCollection._isPlainObject(obj);
}

function isNumericKey(s) {
  return /^[0-9]+$/.test(s);
}

function isOperatorObject(valueSelector, inconsistentOK) {
  if (!LocalCollection._isPlainObject(valueSelector)) {
    return false;
  }

  let theseAreOperators = undefined;
  Object.keys(valueSelector).forEach(selKey => {
    const thisIsOperator = selKey.substr(0, 1) === '$';

    if (theseAreOperators === undefined) {
      theseAreOperators = thisIsOperator;
    } else if (theseAreOperators !== thisIsOperator) {
      if (!inconsistentOK) {
        throw new Error(`Inconsistent operator: ${JSON.stringify(valueSelector)}`);
      }

      theseAreOperators = false;
    }
  });
  return !!theseAreOperators; // {} has no operators
}

// Helper for $lt/$gt/$lte/$gte.
function makeInequality(cmpValueComparator) {
  return {
    compileElementSelector(operand) {
      // Arrays never compare false with non-arrays for any inequality.
      // XXX This was behavior we observed in pre-release MongoDB 2.5, but
      //     it seems to have been reverted.
      //     See https://jira.mongodb.org/browse/SERVER-11444
      if (Array.isArray(operand)) {
        return () => false;
      } // Special case: consider undefined and null the same (so true with
      // $gte/$lte).


      if (operand === undefined) {
        operand = null;
      }

      const operandType = LocalCollection._f._type(operand);

      return value => {
        if (value === undefined) {
          value = null;
        } // Comparisons are never true among things of different type (except
        // null vs undefined).


        if (LocalCollection._f._type(value) !== operandType) {
          return false;
        }

        return cmpValueComparator(LocalCollection._f._cmp(value, operand));
      };
    }

  };
} // makeLookupFunction(key) returns a lookup function.
//
// A lookup function takes in a document and returns an array of matching
// branches.  If no arrays are found while looking up the key, this array will
// have exactly one branches (possibly 'undefined', if some segment of the key
// was not found).
//
// If arrays are found in the middle, this can have more than one element, since
// we 'branch'. When we 'branch', if there are more key segments to look up,
// then we only pursue branches that are plain objects (not arrays or scalars).
// This means we can actually end up with no branches!
//
// We do *NOT* branch on arrays that are found at the end (ie, at the last
// dotted member of the key). We just return that array; if you want to
// effectively 'branch' over the array's values, post-process the lookup
// function with expandArraysInBranches.
//
// Each branch is an object with keys:
//  - value: the value at the branch
//  - dontIterate: an optional bool; if true, it means that 'value' is an array
//    that expandArraysInBranches should NOT expand. This specifically happens
//    when there is a numeric index in the key, and ensures the
//    perhaps-surprising MongoDB behavior where {'a.0': 5} does NOT
//    match {a: [[5]]}.
//  - arrayIndices: if any array indexing was done during lookup (either due to
//    explicit numeric indices or implicit branching), this will be an array of
//    the array indices used, from outermost to innermost; it is falsey or
//    absent if no array index is used. If an explicit numeric index is used,
//    the index will be followed in arrayIndices by the string 'x'.
//
//    Note: arrayIndices is used for two purposes. First, it is used to
//    implement the '$' modifier feature, which only ever looks at its first
//    element.
//
//    Second, it is used for sort key generation, which needs to be able to tell
//    the difference between different paths. Moreover, it needs to
//    differentiate between explicit and implicit branching, which is why
//    there's the somewhat hacky 'x' entry: this means that explicit and
//    implicit array lookups will have different full arrayIndices paths. (That
//    code only requires that different paths have different arrayIndices; it
//    doesn't actually 'parse' arrayIndices. As an alternative, arrayIndices
//    could contain objects with flags like 'implicit', but I think that only
//    makes the code surrounding them more complex.)
//
//    (By the way, this field ends up getting passed around a lot without
//    cloning, so never mutate any arrayIndices field/var in this package!)
//
//
// At the top level, you may only pass in a plain object or array.
//
// See the test 'minimongo - lookup' for some examples of what lookup functions
// return.


function makeLookupFunction(key, options = {}) {
  const parts = key.split('.');
  const firstPart = parts.length ? parts[0] : '';
  const lookupRest = parts.length > 1 && makeLookupFunction(parts.slice(1).join('.'));

  const omitUnnecessaryFields = result => {
    if (!result.dontIterate) {
      delete result.dontIterate;
    }

    if (result.arrayIndices && !result.arrayIndices.length) {
      delete result.arrayIndices;
    }

    return result;
  }; // Doc will always be a plain object or an array.
  // apply an explicit numeric index, an array.


  return (doc, arrayIndices = []) => {
    if (Array.isArray(doc)) {
      // If we're being asked to do an invalid lookup into an array (non-integer
      // or out-of-bounds), return no results (which is different from returning
      // a single undefined result, in that `null` equality checks won't match).
      if (!(isNumericKey(firstPart) && firstPart < doc.length)) {
        return [];
      } // Remember that we used this array index. Include an 'x' to indicate that
      // the previous index came from being considered as an explicit array
      // index (not branching).


      arrayIndices = arrayIndices.concat(+firstPart, 'x');
    } // Do our first lookup.


    const firstLevel = doc[firstPart]; // If there is no deeper to dig, return what we found.
    //
    // If what we found is an array, most value selectors will choose to treat
    // the elements of the array as matchable values in their own right, but
    // that's done outside of the lookup function. (Exceptions to this are $size
    // and stuff relating to $elemMatch.  eg, {a: {$size: 2}} does not match {a:
    // [[1, 2]]}.)
    //
    // That said, if we just did an *explicit* array lookup (on doc) to find
    // firstLevel, and firstLevel is an array too, we do NOT want value
    // selectors to iterate over it.  eg, {'a.0': 5} does not match {a: [[5]]}.
    // So in that case, we mark the return value as 'don't iterate'.

    if (!lookupRest) {
      return [omitUnnecessaryFields({
        arrayIndices,
        dontIterate: Array.isArray(doc) && Array.isArray(firstLevel),
        value: firstLevel
      })];
    } // We need to dig deeper.  But if we can't, because what we've found is not
    // an array or plain object, we're done. If we just did a numeric index into
    // an array, we return nothing here (this is a change in Mongo 2.5 from
    // Mongo 2.4, where {'a.0.b': null} stopped matching {a: [5]}). Otherwise,
    // return a single `undefined` (which can, for example, match via equality
    // with `null`).


    if (!isIndexable(firstLevel)) {
      if (Array.isArray(doc)) {
        return [];
      }

      return [omitUnnecessaryFields({
        arrayIndices,
        value: undefined
      })];
    }

    const result = [];

    const appendToResult = more => {
      result.push(...more);
    }; // Dig deeper: look up the rest of the parts on whatever we've found.
    // (lookupRest is smart enough to not try to do invalid lookups into
    // firstLevel if it's an array.)


    appendToResult(lookupRest(firstLevel, arrayIndices)); // If we found an array, then in *addition* to potentially treating the next
    // part as a literal integer lookup, we should also 'branch': try to look up
    // the rest of the parts on each array element in parallel.
    //
    // In this case, we *only* dig deeper into array elements that are plain
    // objects. (Recall that we only got this far if we have further to dig.)
    // This makes sense: we certainly don't dig deeper into non-indexable
    // objects. And it would be weird to dig into an array: it's simpler to have
    // a rule that explicit integer indexes only apply to an outer array, not to
    // an array you find after a branching search.
    //
    // In the special case of a numeric part in a *sort selector* (not a query
    // selector), we skip the branching: we ONLY allow the numeric part to mean
    // 'look up this index' in that case, not 'also look up this index in all
    // the elements of the array'.

    if (Array.isArray(firstLevel) && !(isNumericKey(parts[1]) && options.forSort)) {
      firstLevel.forEach((branch, arrayIndex) => {
        if (LocalCollection._isPlainObject(branch)) {
          appendToResult(lookupRest(branch, arrayIndices.concat(arrayIndex)));
        }
      });
    }

    return result;
  };
}

// Object exported only for unit testing.
// Use it to export private functions to test in Tinytest.
MinimongoTest = {
  makeLookupFunction
};

MinimongoError = (message, options = {}) => {
  if (typeof message === 'string' && options.field) {
    message += ` for field '${options.field}'`;
  }

  const error = new Error(message);
  error.name = 'MinimongoError';
  return error;
};

function nothingMatcher(docOrBranchedValues) {
  return {
    result: false
  };
}

// Takes an operator object (an object with $ keys) and returns a branched
// matcher for it.
function operatorBranchedMatcher(valueSelector, matcher, isRoot) {
  // Each valueSelector works separately on the various branches.  So one
  // operator can match one branch and another can match another branch.  This
  // is OK.
  const operatorMatchers = Object.keys(valueSelector).map(operator => {
    const operand = valueSelector[operator];
    const simpleRange = ['$lt', '$lte', '$gt', '$gte'].includes(operator) && typeof operand === 'number';
    const simpleEquality = ['$ne', '$eq'].includes(operator) && operand !== Object(operand);
    const simpleInclusion = ['$in', '$nin'].includes(operator) && Array.isArray(operand) && !operand.some(x => x === Object(x));

    if (!(simpleRange || simpleInclusion || simpleEquality)) {
      matcher._isSimple = false;
    }

    if (hasOwn.call(VALUE_OPERATORS, operator)) {
      return VALUE_OPERATORS[operator](operand, valueSelector, matcher, isRoot);
    }

    if (hasOwn.call(ELEMENT_OPERATORS, operator)) {
      const options = ELEMENT_OPERATORS[operator];
      return convertElementMatcherToBranchedMatcher(options.compileElementSelector(operand, valueSelector, matcher), options);
    }

    throw new Error(`Unrecognized operator: ${operator}`);
  });
  return andBranchedMatchers(operatorMatchers);
} // paths - Array: list of mongo style paths
// newLeafFn - Function: of form function(path) should return a scalar value to
//                       put into list created for that path
// conflictFn - Function: of form function(node, path, fullPath) is called
//                        when building a tree path for 'fullPath' node on
//                        'path' was already a leaf with a value. Must return a
//                        conflict resolution.
// initial tree - Optional Object: starting tree.
// @returns - Object: tree represented as a set of nested objects


function pathsToTree(paths, newLeafFn, conflictFn, root = {}) {
  paths.forEach(path => {
    const pathArray = path.split('.');
    let tree = root; // use .every just for iteration with break

    const success = pathArray.slice(0, -1).every((key, i) => {
      if (!hasOwn.call(tree, key)) {
        tree[key] = {};
      } else if (tree[key] !== Object(tree[key])) {
        tree[key] = conflictFn(tree[key], pathArray.slice(0, i + 1).join('.'), path); // break out of loop if we are failing for this path

        if (tree[key] !== Object(tree[key])) {
          return false;
        }
      }

      tree = tree[key];
      return true;
    });

    if (success) {
      const lastKey = pathArray[pathArray.length - 1];

      if (hasOwn.call(tree, lastKey)) {
        tree[lastKey] = conflictFn(tree[lastKey], path, path);
      } else {
        tree[lastKey] = newLeafFn(path);
      }
    }
  });
  return root;
}

// Makes sure we get 2 elements array and assume the first one to be x and
// the second one to y no matter what user passes.
// In case user passes { lon: x, lat: y } returns [x, y]
function pointToArray(point) {
  return Array.isArray(point) ? point.slice() : [point.x, point.y];
} // Creating a document from an upsert is quite tricky.
// E.g. this selector: {"$or": [{"b.foo": {"$all": ["bar"]}}]}, should result
// in: {"b.foo": "bar"}
// But this selector: {"$or": [{"b": {"foo": {"$all": ["bar"]}}}]} should throw
// an error
// Some rules (found mainly with trial & error, so there might be more):
// - handle all childs of $and (or implicit $and)
// - handle $or nodes with exactly 1 child
// - ignore $or nodes with more than 1 child
// - ignore $nor and $not nodes
// - throw when a value can not be set unambiguously
// - every value for $all should be dealt with as separate $eq-s
// - threat all children of $all as $eq setters (=> set if $all.length === 1,
//   otherwise throw error)
// - you can not mix '$'-prefixed keys and non-'$'-prefixed keys
// - you can only have dotted keys on a root-level
// - you can not have '$'-prefixed keys more than one-level deep in an object
// Handles one key/value pair to put in the selector document


function populateDocumentWithKeyValue(document, key, value) {
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    populateDocumentWithObject(document, key, value);
  } else if (!(value instanceof RegExp)) {
    insertIntoDocument(document, key, value);
  }
} // Handles a key, value pair to put in the selector document
// if the value is an object


function populateDocumentWithObject(document, key, value) {
  const keys = Object.keys(value);
  const unprefixedKeys = keys.filter(op => op[0] !== '$');

  if (unprefixedKeys.length > 0 || !keys.length) {
    // Literal (possibly empty) object ( or empty object )
    // Don't allow mixing '$'-prefixed with non-'$'-prefixed fields
    if (keys.length !== unprefixedKeys.length) {
      throw new Error(`unknown operator: ${unprefixedKeys[0]}`);
    }

    validateObject(value, key);
    insertIntoDocument(document, key, value);
  } else {
    Object.keys(value).forEach(op => {
      const object = value[op];

      if (op === '$eq') {
        populateDocumentWithKeyValue(document, key, object);
      } else if (op === '$all') {
        // every value for $all should be dealt with as separate $eq-s
        object.forEach(element => populateDocumentWithKeyValue(document, key, element));
      }
    });
  }
} // Fills a document with certain fields from an upsert selector


function populateDocumentWithQueryFields(query, document = {}) {
  if (Object.getPrototypeOf(query) === Object.prototype) {
    // handle implicit $and
    Object.keys(query).forEach(key => {
      const value = query[key];

      if (key === '$and') {
        // handle explicit $and
        value.forEach(element => populateDocumentWithQueryFields(element, document));
      } else if (key === '$or') {
        // handle $or nodes with exactly 1 child
        if (value.length === 1) {
          populateDocumentWithQueryFields(value[0], document);
        }
      } else if (key[0] !== '$') {
        // Ignore other '$'-prefixed logical selectors
        populateDocumentWithKeyValue(document, key, value);
      }
    });
  } else {
    // Handle meteor-specific shortcut for selecting _id
    if (LocalCollection._selectorIsId(query)) {
      insertIntoDocument(document, '_id', query);
    }
  }

  return document;
}

function projectionDetails(fields) {
  // Find the non-_id keys (_id is handled specially because it is included
  // unless explicitly excluded). Sort the keys, so that our code to detect
  // overlaps like 'foo' and 'foo.bar' can assume that 'foo' comes first.
  let fieldsKeys = Object.keys(fields).sort(); // If _id is the only field in the projection, do not remove it, since it is
  // required to determine if this is an exclusion or exclusion. Also keep an
  // inclusive _id, since inclusive _id follows the normal rules about mixing
  // inclusive and exclusive fields. If _id is not the only field in the
  // projection and is exclusive, remove it so it can be handled later by a
  // special case, since exclusive _id is always allowed.

  if (!(fieldsKeys.length === 1 && fieldsKeys[0] === '_id') && !(fieldsKeys.includes('_id') && fields._id)) {
    fieldsKeys = fieldsKeys.filter(key => key !== '_id');
  }

  let including = null; // Unknown

  fieldsKeys.forEach(keyPath => {
    const rule = !!fields[keyPath];

    if (including === null) {
      including = rule;
    } // This error message is copied from MongoDB shell


    if (including !== rule) {
      throw MinimongoError('You cannot currently mix including and excluding fields.');
    }
  });
  const projectionRulesTree = pathsToTree(fieldsKeys, path => including, (node, path, fullPath) => {
    // Check passed projection fields' keys: If you have two rules such as
    // 'foo.bar' and 'foo.bar.baz', then the result becomes ambiguous. If
    // that happens, there is a probability you are doing something wrong,
    // framework should notify you about such mistake earlier on cursor
    // compilation step than later during runtime.  Note, that real mongo
    // doesn't do anything about it and the later rule appears in projection
    // project, more priority it takes.
    //
    // Example, assume following in mongo shell:
    // > db.coll.insert({ a: { b: 23, c: 44 } })
    // > db.coll.find({}, { 'a': 1, 'a.b': 1 })
    // {"_id": ObjectId("520bfe456024608e8ef24af3"), "a": {"b": 23}}
    // > db.coll.find({}, { 'a.b': 1, 'a': 1 })
    // {"_id": ObjectId("520bfe456024608e8ef24af3"), "a": {"b": 23, "c": 44}}
    //
    // Note, how second time the return set of keys is different.
    const currentPath = fullPath;
    const anotherPath = path;
    throw MinimongoError(`both ${currentPath} and ${anotherPath} found in fields option, ` + 'using both of them may trigger unexpected behavior. Did you mean to ' + 'use only one of them?');
  });
  return {
    including,
    tree: projectionRulesTree
  };
}

function regexpElementMatcher(regexp) {
  return value => {
    if (value instanceof RegExp) {
      return value.toString() === regexp.toString();
    } // Regexps only work against strings.


    if (typeof value !== 'string') {
      return false;
    } // Reset regexp's state to avoid inconsistent matching for objects with the
    // same value on consecutive calls of regexp.test. This happens only if the
    // regexp has the 'g' flag. Also note that ES6 introduces a new flag 'y' for
    // which we should *not* change the lastIndex but MongoDB doesn't support
    // either of these flags.


    regexp.lastIndex = 0;
    return regexp.test(value);
  };
}

// Validates the key in a path.
// Objects that are nested more then 1 level cannot have dotted fields
// or fields starting with '$'
function validateKeyInPath(key, path) {
  if (key.includes('.')) {
    throw new Error(`The dotted field '${key}' in '${path}.${key} is not valid for storage.`);
  }

  if (key[0] === '$') {
    throw new Error(`The dollar ($) prefixed field  '${path}.${key} is not valid for storage.`);
  }
} // Recursively validates an object that is nested more than one level deep


function validateObject(object, path) {
  if (object && Object.getPrototypeOf(object) === Object.prototype) {
    Object.keys(object).forEach(key => {
      validateKeyInPath(key, path);
      validateObject(object[key], path + '.' + key);
    });
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"cursor.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/cursor.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => Cursor
});
let LocalCollection;
module.watch(require("./local_collection.js"), {
  default(v) {
    LocalCollection = v;
  }

}, 0);
let hasOwn;
module.watch(require("./common.js"), {
  hasOwn(v) {
    hasOwn = v;
  }

}, 1);

class Cursor {
  // don't call this ctor directly.  use LocalCollection.find().
  constructor(collection, selector, options = {}) {
    this.collection = collection;
    this.sorter = null;
    this.matcher = new Minimongo.Matcher(selector);

    if (LocalCollection._selectorIsIdPerhapsAsObject(selector)) {
      // stash for fast _id and { _id }
      this._selectorId = hasOwn.call(selector, '_id') ? selector._id : selector;
    } else {
      this._selectorId = undefined;

      if (this.matcher.hasGeoQuery() || options.sort) {
        this.sorter = new Minimongo.Sorter(options.sort || [], {
          matcher: this.matcher
        });
      }
    }

    this.skip = options.skip || 0;
    this.limit = options.limit;
    this.fields = options.fields;
    this._projectionFn = LocalCollection._compileProjection(this.fields || {});
    this._transform = LocalCollection.wrapTransform(options.transform); // by default, queries register w/ Tracker when it is available.

    if (typeof Tracker !== 'undefined') {
      this.reactive = options.reactive === undefined ? true : options.reactive;
    }
  }
  /**
   * @summary Returns the number of documents that match a query.
   * @memberOf Mongo.Cursor
   * @method  count
   * @param {boolean} [applySkipLimit=true] If set to `false`, the value
   *                                         returned will reflect the total
   *                                         number of matching documents,
   *                                         ignoring any value supplied for
   *                                         limit
   * @instance
   * @locus Anywhere
   * @returns {Number}
   */


  count(applySkipLimit = true) {
    if (this.reactive) {
      // allow the observe to be unordered
      this._depend({
        added: true,
        removed: true
      }, true);
    }

    return this._getRawObjects({
      ordered: true,
      applySkipLimit
    }).length;
  }
  /**
   * @summary Return all matching documents as an Array.
   * @memberOf Mongo.Cursor
   * @method  fetch
   * @instance
   * @locus Anywhere
   * @returns {Object[]}
   */


  fetch() {
    const result = [];
    this.forEach(doc => {
      result.push(doc);
    });
    return result;
  }

  [Symbol.iterator]() {
    if (this.reactive) {
      this._depend({
        addedBefore: true,
        removed: true,
        changed: true,
        movedBefore: true
      });
    }

    let index = 0;

    const objects = this._getRawObjects({
      ordered: true
    });

    return {
      next: () => {
        if (index < objects.length) {
          // This doubles as a clone operation.
          let element = this._projectionFn(objects[index++]);

          if (this._transform) element = this._transform(element);
          return {
            value: element
          };
        }

        return {
          done: true
        };
      }
    };
  }
  /**
   * @callback IterationCallback
   * @param {Object} doc
   * @param {Number} index
   */

  /**
   * @summary Call `callback` once for each matching document, sequentially and
   *          synchronously.
   * @locus Anywhere
   * @method  forEach
   * @instance
   * @memberOf Mongo.Cursor
   * @param {IterationCallback} callback Function to call. It will be called
   *                                     with three arguments: the document, a
   *                                     0-based index, and <em>cursor</em>
   *                                     itself.
   * @param {Any} [thisArg] An object which will be the value of `this` inside
   *                        `callback`.
   */


  forEach(callback, thisArg) {
    if (this.reactive) {
      this._depend({
        addedBefore: true,
        removed: true,
        changed: true,
        movedBefore: true
      });
    }

    this._getRawObjects({
      ordered: true
    }).forEach((element, i) => {
      // This doubles as a clone operation.
      element = this._projectionFn(element);

      if (this._transform) {
        element = this._transform(element);
      }

      callback.call(thisArg, element, i, this);
    });
  }

  getTransform() {
    return this._transform;
  }
  /**
   * @summary Map callback over all matching documents.  Returns an Array.
   * @locus Anywhere
   * @method map
   * @instance
   * @memberOf Mongo.Cursor
   * @param {IterationCallback} callback Function to call. It will be called
   *                                     with three arguments: the document, a
   *                                     0-based index, and <em>cursor</em>
   *                                     itself.
   * @param {Any} [thisArg] An object which will be the value of `this` inside
   *                        `callback`.
   */


  map(callback, thisArg) {
    const result = [];
    this.forEach((doc, i) => {
      result.push(callback.call(thisArg, doc, i, this));
    });
    return result;
  } // options to contain:
  //  * callbacks for observe():
  //    - addedAt (document, atIndex)
  //    - added (document)
  //    - changedAt (newDocument, oldDocument, atIndex)
  //    - changed (newDocument, oldDocument)
  //    - removedAt (document, atIndex)
  //    - removed (document)
  //    - movedTo (document, oldIndex, newIndex)
  //
  // attributes available on returned query handle:
  //  * stop(): end updates
  //  * collection: the collection this query is querying
  //
  // iff x is a returned query handle, (x instanceof
  // LocalCollection.ObserveHandle) is true
  //
  // initial results delivered through added callback
  // XXX maybe callbacks should take a list of objects, to expose transactions?
  // XXX maybe support field limiting (to limit what you're notified on)

  /**
   * @summary Watch a query.  Receive callbacks as the result set changes.
   * @locus Anywhere
   * @memberOf Mongo.Cursor
   * @instance
   * @param {Object} callbacks Functions to call to deliver the result set as it
   *                           changes
   */


  observe(options) {
    return LocalCollection._observeFromObserveChanges(this, options);
  }
  /**
   * @summary Watch a query. Receive callbacks as the result set changes. Only
   *          the differences between the old and new documents are passed to
   *          the callbacks.
   * @locus Anywhere
   * @memberOf Mongo.Cursor
   * @instance
   * @param {Object} callbacks Functions to call to deliver the result set as it
   *                           changes
   */


  observeChanges(options) {
    const ordered = LocalCollection._observeChangesCallbacksAreOrdered(options); // there are several places that assume you aren't combining skip/limit with
    // unordered observe.  eg, update's EJSON.clone, and the "there are several"
    // comment in _modifyAndNotify
    // XXX allow skip/limit with unordered observe


    if (!options._allow_unordered && !ordered && (this.skip || this.limit)) {
      throw new Error("Must use an ordered observe with skip or limit (i.e. 'addedBefore' " + "for observeChanges or 'addedAt' for observe, instead of 'added').");
    }

    if (this.fields && (this.fields._id === 0 || this.fields._id === false)) {
      throw Error('You may not observe a cursor with {fields: {_id: 0}}');
    }

    const distances = this.matcher.hasGeoQuery() && ordered && new LocalCollection._IdMap();
    const query = {
      cursor: this,
      dirty: false,
      distances,
      matcher: this.matcher,
      // not fast pathed
      ordered,
      projectionFn: this._projectionFn,
      resultsSnapshot: null,
      sorter: ordered && this.sorter
    };
    let qid; // Non-reactive queries call added[Before] and then never call anything
    // else.

    if (this.reactive) {
      qid = this.collection.next_qid++;
      this.collection.queries[qid] = query;
    }

    query.results = this._getRawObjects({
      ordered,
      distances: query.distances
    });

    if (this.collection.paused) {
      query.resultsSnapshot = ordered ? [] : new LocalCollection._IdMap();
    } // wrap callbacks we were passed. callbacks only fire when not paused and
    // are never undefined
    // Filters out blacklisted fields according to cursor's projection.
    // XXX wrong place for this?
    // furthermore, callbacks enqueue until the operation we're working on is
    // done.


    const wrapCallback = fn => {
      if (!fn) {
        return () => {};
      }

      const self = this;
      return function ()
      /* args*/
      {
        if (self.collection.paused) {
          return;
        }

        const args = arguments;

        self.collection._observeQueue.queueTask(() => {
          fn.apply(this, args);
        });
      };
    };

    query.added = wrapCallback(options.added);
    query.changed = wrapCallback(options.changed);
    query.removed = wrapCallback(options.removed);

    if (ordered) {
      query.addedBefore = wrapCallback(options.addedBefore);
      query.movedBefore = wrapCallback(options.movedBefore);
    }

    if (!options._suppress_initial && !this.collection.paused) {
      const results = ordered ? query.results : query.results._map;
      Object.keys(results).forEach(key => {
        const doc = results[key];
        const fields = EJSON.clone(doc);
        delete fields._id;

        if (ordered) {
          query.addedBefore(doc._id, this._projectionFn(fields), null);
        }

        query.added(doc._id, this._projectionFn(fields));
      });
    }

    const handle = Object.assign(new LocalCollection.ObserveHandle(), {
      collection: this.collection,
      stop: () => {
        if (this.reactive) {
          delete this.collection.queries[qid];
        }
      }
    });

    if (this.reactive && Tracker.active) {
      // XXX in many cases, the same observe will be recreated when
      // the current autorun is rerun.  we could save work by
      // letting it linger across rerun and potentially get
      // repurposed if the same observe is performed, using logic
      // similar to that of Meteor.subscribe.
      Tracker.onInvalidate(() => {
        handle.stop();
      });
    } // run the observe callbacks resulting from the initial contents
    // before we leave the observe.


    this.collection._observeQueue.drain();

    return handle;
  } // Since we don't actually have a "nextObject" interface, there's really no
  // reason to have a "rewind" interface.  All it did was make multiple calls
  // to fetch/map/forEach return nothing the second time.
  // XXX COMPAT WITH 0.8.1


  rewind() {} // XXX Maybe we need a version of observe that just calls a callback if
  // anything changed.


  _depend(changers, _allow_unordered) {
    if (Tracker.active) {
      const dependency = new Tracker.Dependency();
      const notify = dependency.changed.bind(dependency);
      dependency.depend();
      const options = {
        _allow_unordered,
        _suppress_initial: true
      };
      ['added', 'addedBefore', 'changed', 'movedBefore', 'removed'].forEach(fn => {
        if (changers[fn]) {
          options[fn] = notify;
        }
      }); // observeChanges will stop() when this computation is invalidated

      this.observeChanges(options);
    }
  }

  _getCollectionName() {
    return this.collection.name;
  } // Returns a collection of matching objects, but doesn't deep copy them.
  //
  // If ordered is set, returns a sorted array, respecting sorter, skip, and
  // limit properties of the query provided that options.applySkipLimit is
  // not set to false (#1201). If sorter is falsey, no sort -- you get the
  // natural order.
  //
  // If ordered is not set, returns an object mapping from ID to doc (sorter,
  // skip and limit should not be set).
  //
  // If ordered is set and this cursor is a $near geoquery, then this function
  // will use an _IdMap to track each distance from the $near argument point in
  // order to use it as a sort key. If an _IdMap is passed in the 'distances'
  // argument, this function will clear it and use it for this purpose
  // (otherwise it will just create its own _IdMap). The observeChanges
  // implementation uses this to remember the distances after this function
  // returns.


  _getRawObjects(options = {}) {
    // By default this method will respect skip and limit because .fetch(),
    // .forEach() etc... expect this behaviour. It can be forced to ignore
    // skip and limit by setting applySkipLimit to false (.count() does this,
    // for example)
    const applySkipLimit = options.applySkipLimit !== false; // XXX use OrderedDict instead of array, and make IdMap and OrderedDict
    // compatible

    const results = options.ordered ? [] : new LocalCollection._IdMap(); // fast path for single ID value

    if (this._selectorId !== undefined) {
      // If you have non-zero skip and ask for a single id, you get nothing.
      // This is so it matches the behavior of the '{_id: foo}' path.
      if (applySkipLimit && this.skip) {
        return results;
      }

      const selectedDoc = this.collection._docs.get(this._selectorId);

      if (selectedDoc) {
        if (options.ordered) {
          results.push(selectedDoc);
        } else {
          results.set(this._selectorId, selectedDoc);
        }
      }

      return results;
    } // slow path for arbitrary selector, sort, skip, limit
    // in the observeChanges case, distances is actually part of the "query"
    // (ie, live results set) object.  in other cases, distances is only used
    // inside this function.


    let distances;

    if (this.matcher.hasGeoQuery() && options.ordered) {
      if (options.distances) {
        distances = options.distances;
        distances.clear();
      } else {
        distances = new LocalCollection._IdMap();
      }
    }

    this.collection._docs.forEach((doc, id) => {
      const matchResult = this.matcher.documentMatches(doc);

      if (matchResult.result) {
        if (options.ordered) {
          results.push(doc);

          if (distances && matchResult.distance !== undefined) {
            distances.set(id, matchResult.distance);
          }
        } else {
          results.set(id, doc);
        }
      } // Override to ensure all docs are matched if ignoring skip & limit


      if (!applySkipLimit) {
        return true;
      } // Fast path for limited unsorted queries.
      // XXX 'length' check here seems wrong for ordered


      return !this.limit || this.skip || this.sorter || results.length !== this.limit;
    });

    if (!options.ordered) {
      return results;
    }

    if (this.sorter) {
      results.sort(this.sorter.getComparator({
        distances
      }));
    } // Return the full set of results if there is no skip or limit or if we're
    // ignoring them


    if (!applySkipLimit || !this.limit && !this.skip) {
      return results;
    }

    return results.slice(this.skip, this.limit ? this.limit + this.skip : results.length);
  }

  _publishCursor(subscription) {
    // XXX minimongo should not depend on mongo-livedata!
    if (!Package.mongo) {
      throw new Error('Can\'t publish from Minimongo without the `mongo` package.');
    }

    if (!this.collection.name) {
      throw new Error('Can\'t publish a cursor from a collection without a name.');
    }

    return Package.mongo.Mongo.Collection._publishCursor(this, subscription, this.collection.name);
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"local_collection.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/local_collection.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => LocalCollection
});
let Cursor;
module.watch(require("./cursor.js"), {
  default(v) {
    Cursor = v;
  }

}, 0);
let ObserveHandle;
module.watch(require("./observe_handle.js"), {
  default(v) {
    ObserveHandle = v;
  }

}, 1);
let hasOwn, isIndexable, isNumericKey, isOperatorObject, populateDocumentWithQueryFields, projectionDetails;
module.watch(require("./common.js"), {
  hasOwn(v) {
    hasOwn = v;
  },

  isIndexable(v) {
    isIndexable = v;
  },

  isNumericKey(v) {
    isNumericKey = v;
  },

  isOperatorObject(v) {
    isOperatorObject = v;
  },

  populateDocumentWithQueryFields(v) {
    populateDocumentWithQueryFields = v;
  },

  projectionDetails(v) {
    projectionDetails = v;
  }

}, 2);

class LocalCollection {
  constructor(name) {
    this.name = name; // _id -> document (also containing id)

    this._docs = new LocalCollection._IdMap();
    this._observeQueue = new Meteor._SynchronousQueue();
    this.next_qid = 1; // live query id generator
    // qid -> live query object. keys:
    //  ordered: bool. ordered queries have addedBefore/movedBefore callbacks.
    //  results: array (ordered) or object (unordered) of current results
    //    (aliased with this._docs!)
    //  resultsSnapshot: snapshot of results. null if not paused.
    //  cursor: Cursor object for the query.
    //  selector, sorter, (callbacks): functions

    this.queries = Object.create(null); // null if not saving originals; an IdMap from id to original document value
    // if saving originals. See comments before saveOriginals().

    this._savedOriginals = null; // True when observers are paused and we should not send callbacks.

    this.paused = false;
  } // options may include sort, skip, limit, reactive
  // sort may be any of these forms:
  //     {a: 1, b: -1}
  //     [["a", "asc"], ["b", "desc"]]
  //     ["a", ["b", "desc"]]
  //   (in the first form you're beholden to key enumeration order in
  //   your javascript VM)
  //
  // reactive: if given, and false, don't register with Tracker (default
  // is true)
  //
  // XXX possibly should support retrieving a subset of fields? and
  // have it be a hint (ignored on the client, when not copying the
  // doc?)
  //
  // XXX sort does not yet support subkeys ('a.b') .. fix that!
  // XXX add one more sort form: "key"
  // XXX tests


  find(selector, options) {
    // default syntax for everything is to omit the selector argument.
    // but if selector is explicitly passed in as false or undefined, we
    // want a selector that matches nothing.
    if (arguments.length === 0) {
      selector = {};
    }

    return new LocalCollection.Cursor(this, selector, options);
  }

  findOne(selector, options = {}) {
    if (arguments.length === 0) {
      selector = {};
    } // NOTE: by setting limit 1 here, we end up using very inefficient
    // code that recomputes the whole query on each update. The upside is
    // that when you reactively depend on a findOne you only get
    // invalidated when the found object changes, not any object in the
    // collection. Most findOne will be by id, which has a fast path, so
    // this might not be a big deal. In most cases, invalidation causes
    // the called to re-query anyway, so this should be a net performance
    // improvement.


    options.limit = 1;
    return this.find(selector, options).fetch()[0];
  } // XXX possibly enforce that 'undefined' does not appear (we assume
  // this in our handling of null and $exists)


  insert(doc, callback) {
    doc = EJSON.clone(doc);
    assertHasValidFieldNames(doc); // if you really want to use ObjectIDs, set this global.
    // Mongo.Collection specifies its own ids and does not use this code.

    if (!hasOwn.call(doc, '_id')) {
      doc._id = LocalCollection._useOID ? new MongoID.ObjectID() : Random.id();
    }

    const id = doc._id;

    if (this._docs.has(id)) {
      throw MinimongoError(`Duplicate _id '${id}'`);
    }

    this._saveOriginal(id, undefined);

    this._docs.set(id, doc);

    const queriesToRecompute = []; // trigger live queries that match

    Object.keys(this.queries).forEach(qid => {
      const query = this.queries[qid];

      if (query.dirty) {
        return;
      }

      const matchResult = query.matcher.documentMatches(doc);

      if (matchResult.result) {
        if (query.distances && matchResult.distance !== undefined) {
          query.distances.set(id, matchResult.distance);
        }

        if (query.cursor.skip || query.cursor.limit) {
          queriesToRecompute.push(qid);
        } else {
          LocalCollection._insertInResults(query, doc);
        }
      }
    });
    queriesToRecompute.forEach(qid => {
      if (this.queries[qid]) {
        this._recomputeResults(this.queries[qid]);
      }
    });

    this._observeQueue.drain(); // Defer because the caller likely doesn't expect the callback to be run
    // immediately.


    if (callback) {
      Meteor.defer(() => {
        callback(null, id);
      });
    }

    return id;
  } // Pause the observers. No callbacks from observers will fire until
  // 'resumeObservers' is called.


  pauseObservers() {
    // No-op if already paused.
    if (this.paused) {
      return;
    } // Set the 'paused' flag such that new observer messages don't fire.


    this.paused = true; // Take a snapshot of the query results for each query.

    Object.keys(this.queries).forEach(qid => {
      const query = this.queries[qid];
      query.resultsSnapshot = EJSON.clone(query.results);
    });
  }

  remove(selector, callback) {
    // Easy special case: if we're not calling observeChanges callbacks and
    // we're not saving originals and we got asked to remove everything, then
    // just empty everything directly.
    if (this.paused && !this._savedOriginals && EJSON.equals(selector, {})) {
      const result = this._docs.size();

      this._docs.clear();

      Object.keys(this.queries).forEach(qid => {
        const query = this.queries[qid];

        if (query.ordered) {
          query.results = [];
        } else {
          query.results.clear();
        }
      });

      if (callback) {
        Meteor.defer(() => {
          callback(null, result);
        });
      }

      return result;
    }

    const matcher = new Minimongo.Matcher(selector);
    const remove = [];

    this._eachPossiblyMatchingDoc(selector, (doc, id) => {
      if (matcher.documentMatches(doc).result) {
        remove.push(id);
      }
    });

    const queriesToRecompute = [];
    const queryRemove = [];

    for (let i = 0; i < remove.length; i++) {
      const removeId = remove[i];

      const removeDoc = this._docs.get(removeId);

      Object.keys(this.queries).forEach(qid => {
        const query = this.queries[qid];

        if (query.dirty) {
          return;
        }

        if (query.matcher.documentMatches(removeDoc).result) {
          if (query.cursor.skip || query.cursor.limit) {
            queriesToRecompute.push(qid);
          } else {
            queryRemove.push({
              qid,
              doc: removeDoc
            });
          }
        }
      });

      this._saveOriginal(removeId, removeDoc);

      this._docs.remove(removeId);
    } // run live query callbacks _after_ we've removed the documents.


    queryRemove.forEach(remove => {
      const query = this.queries[remove.qid];

      if (query) {
        query.distances && query.distances.remove(remove.doc._id);

        LocalCollection._removeFromResults(query, remove.doc);
      }
    });
    queriesToRecompute.forEach(qid => {
      const query = this.queries[qid];

      if (query) {
        this._recomputeResults(query);
      }
    });

    this._observeQueue.drain();

    const result = remove.length;

    if (callback) {
      Meteor.defer(() => {
        callback(null, result);
      });
    }

    return result;
  } // Resume the observers. Observers immediately receive change
  // notifications to bring them to the current state of the
  // database. Note that this is not just replaying all the changes that
  // happened during the pause, it is a smarter 'coalesced' diff.


  resumeObservers() {
    // No-op if not paused.
    if (!this.paused) {
      return;
    } // Unset the 'paused' flag. Make sure to do this first, otherwise
    // observer methods won't actually fire when we trigger them.


    this.paused = false;
    Object.keys(this.queries).forEach(qid => {
      const query = this.queries[qid];

      if (query.dirty) {
        query.dirty = false; // re-compute results will perform `LocalCollection._diffQueryChanges`
        // automatically.

        this._recomputeResults(query, query.resultsSnapshot);
      } else {
        // Diff the current results against the snapshot and send to observers.
        // pass the query object for its observer callbacks.
        LocalCollection._diffQueryChanges(query.ordered, query.resultsSnapshot, query.results, query, {
          projectionFn: query.projectionFn
        });
      }

      query.resultsSnapshot = null;
    });

    this._observeQueue.drain();
  }

  retrieveOriginals() {
    if (!this._savedOriginals) {
      throw new Error('Called retrieveOriginals without saveOriginals');
    }

    const originals = this._savedOriginals;
    this._savedOriginals = null;
    return originals;
  } // To track what documents are affected by a piece of code, call
  // saveOriginals() before it and retrieveOriginals() after it.
  // retrieveOriginals returns an object whose keys are the ids of the documents
  // that were affected since the call to saveOriginals(), and the values are
  // equal to the document's contents at the time of saveOriginals. (In the case
  // of an inserted document, undefined is the value.) You must alternate
  // between calls to saveOriginals() and retrieveOriginals().


  saveOriginals() {
    if (this._savedOriginals) {
      throw new Error('Called saveOriginals twice without retrieveOriginals');
    }

    this._savedOriginals = new LocalCollection._IdMap();
  } // XXX atomicity: if multi is true, and one modification fails, do
  // we rollback the whole operation, or what?


  update(selector, mod, options, callback) {
    if (!callback && options instanceof Function) {
      callback = options;
      options = null;
    }

    if (!options) {
      options = {};
    }

    const matcher = new Minimongo.Matcher(selector, true); // Save the original results of any query that we might need to
    // _recomputeResults on, because _modifyAndNotify will mutate the objects in
    // it. (We don't need to save the original results of paused queries because
    // they already have a resultsSnapshot and we won't be diffing in
    // _recomputeResults.)

    const qidToOriginalResults = {}; // We should only clone each document once, even if it appears in multiple
    // queries

    const docMap = new LocalCollection._IdMap();

    const idsMatched = LocalCollection._idsMatchedBySelector(selector);

    Object.keys(this.queries).forEach(qid => {
      const query = this.queries[qid];

      if ((query.cursor.skip || query.cursor.limit) && !this.paused) {
        // Catch the case of a reactive `count()` on a cursor with skip
        // or limit, which registers an unordered observe. This is a
        // pretty rare case, so we just clone the entire result set with
        // no optimizations for documents that appear in these result
        // sets and other queries.
        if (query.results instanceof LocalCollection._IdMap) {
          qidToOriginalResults[qid] = query.results.clone();
          return;
        }

        if (!(query.results instanceof Array)) {
          throw new Error('Assertion failed: query.results not an array');
        } // Clones a document to be stored in `qidToOriginalResults`
        // because it may be modified before the new and old result sets
        // are diffed. But if we know exactly which document IDs we're
        // going to modify, then we only need to clone those.


        const memoizedCloneIfNeeded = doc => {
          if (docMap.has(doc._id)) {
            return docMap.get(doc._id);
          }

          const docToMemoize = idsMatched && !idsMatched.some(id => EJSON.equals(id, doc._id)) ? doc : EJSON.clone(doc);
          docMap.set(doc._id, docToMemoize);
          return docToMemoize;
        };

        qidToOriginalResults[qid] = query.results.map(memoizedCloneIfNeeded);
      }
    });
    const recomputeQids = {};
    let updateCount = 0;

    this._eachPossiblyMatchingDoc(selector, (doc, id) => {
      const queryResult = matcher.documentMatches(doc);

      if (queryResult.result) {
        // XXX Should we save the original even if mod ends up being a no-op?
        this._saveOriginal(id, doc);

        this._modifyAndNotify(doc, mod, recomputeQids, queryResult.arrayIndices);

        ++updateCount;

        if (!options.multi) {
          return false; // break
        }
      }

      return true;
    });

    Object.keys(recomputeQids).forEach(qid => {
      const query = this.queries[qid];

      if (query) {
        this._recomputeResults(query, qidToOriginalResults[qid]);
      }
    });

    this._observeQueue.drain(); // If we are doing an upsert, and we didn't modify any documents yet, then
    // it's time to do an insert. Figure out what document we are inserting, and
    // generate an id for it.


    let insertedId;

    if (updateCount === 0 && options.upsert) {
      const doc = LocalCollection._createUpsertDocument(selector, mod);

      if (!doc._id && options.insertedId) {
        doc._id = options.insertedId;
      }

      insertedId = this.insert(doc);
      updateCount = 1;
    } // Return the number of affected documents, or in the upsert case, an object
    // containing the number of affected docs and the id of the doc that was
    // inserted, if any.


    let result;

    if (options._returnObject) {
      result = {
        numberAffected: updateCount
      };

      if (insertedId !== undefined) {
        result.insertedId = insertedId;
      }
    } else {
      result = updateCount;
    }

    if (callback) {
      Meteor.defer(() => {
        callback(null, result);
      });
    }

    return result;
  } // A convenience wrapper on update. LocalCollection.upsert(sel, mod) is
  // equivalent to LocalCollection.update(sel, mod, {upsert: true,
  // _returnObject: true}).


  upsert(selector, mod, options, callback) {
    if (!callback && typeof options === 'function') {
      callback = options;
      options = {};
    }

    return this.update(selector, mod, Object.assign({}, options, {
      upsert: true,
      _returnObject: true
    }), callback);
  } // Iterates over a subset of documents that could match selector; calls
  // fn(doc, id) on each of them.  Specifically, if selector specifies
  // specific _id's, it only looks at those.  doc is *not* cloned: it is the
  // same object that is in _docs.


  _eachPossiblyMatchingDoc(selector, fn) {
    const specificIds = LocalCollection._idsMatchedBySelector(selector);

    if (specificIds) {
      specificIds.some(id => {
        const doc = this._docs.get(id);

        if (doc) {
          return fn(doc, id) === false;
        }
      });
    } else {
      this._docs.forEach(fn);
    }
  }

  _modifyAndNotify(doc, mod, recomputeQids, arrayIndices) {
    const matched_before = {};
    Object.keys(this.queries).forEach(qid => {
      const query = this.queries[qid];

      if (query.dirty) {
        return;
      }

      if (query.ordered) {
        matched_before[qid] = query.matcher.documentMatches(doc).result;
      } else {
        // Because we don't support skip or limit (yet) in unordered queries, we
        // can just do a direct lookup.
        matched_before[qid] = query.results.has(doc._id);
      }
    });
    const old_doc = EJSON.clone(doc);

    LocalCollection._modify(doc, mod, {
      arrayIndices
    });

    Object.keys(this.queries).forEach(qid => {
      const query = this.queries[qid];

      if (query.dirty) {
        return;
      }

      const afterMatch = query.matcher.documentMatches(doc);
      const after = afterMatch.result;
      const before = matched_before[qid];

      if (after && query.distances && afterMatch.distance !== undefined) {
        query.distances.set(doc._id, afterMatch.distance);
      }

      if (query.cursor.skip || query.cursor.limit) {
        // We need to recompute any query where the doc may have been in the
        // cursor's window either before or after the update. (Note that if skip
        // or limit is set, "before" and "after" being true do not necessarily
        // mean that the document is in the cursor's output after skip/limit is
        // applied... but if they are false, then the document definitely is NOT
        // in the output. So it's safe to skip recompute if neither before or
        // after are true.)
        if (before || after) {
          recomputeQids[qid] = true;
        }
      } else if (before && !after) {
        LocalCollection._removeFromResults(query, doc);
      } else if (!before && after) {
        LocalCollection._insertInResults(query, doc);
      } else if (before && after) {
        LocalCollection._updateInResults(query, doc, old_doc);
      }
    });
  } // Recomputes the results of a query and runs observe callbacks for the
  // difference between the previous results and the current results (unless
  // paused). Used for skip/limit queries.
  //
  // When this is used by insert or remove, it can just use query.results for
  // the old results (and there's no need to pass in oldResults), because these
  // operations don't mutate the documents in the collection. Update needs to
  // pass in an oldResults which was deep-copied before the modifier was
  // applied.
  //
  // oldResults is guaranteed to be ignored if the query is not paused.


  _recomputeResults(query, oldResults) {
    if (this.paused) {
      // There's no reason to recompute the results now as we're still paused.
      // By flagging the query as "dirty", the recompute will be performed
      // when resumeObservers is called.
      query.dirty = true;
      return;
    }

    if (!this.paused && !oldResults) {
      oldResults = query.results;
    }

    if (query.distances) {
      query.distances.clear();
    }

    query.results = query.cursor._getRawObjects({
      distances: query.distances,
      ordered: query.ordered
    });

    if (!this.paused) {
      LocalCollection._diffQueryChanges(query.ordered, oldResults, query.results, query, {
        projectionFn: query.projectionFn
      });
    }
  }

  _saveOriginal(id, doc) {
    // Are we even trying to save originals?
    if (!this._savedOriginals) {
      return;
    } // Have we previously mutated the original (and so 'doc' is not actually
    // original)?  (Note the 'has' check rather than truth: we store undefined
    // here for inserted docs!)


    if (this._savedOriginals.has(id)) {
      return;
    }

    this._savedOriginals.set(id, EJSON.clone(doc));
  }

}

LocalCollection.Cursor = Cursor;
LocalCollection.ObserveHandle = ObserveHandle; // XXX maybe move these into another ObserveHelpers package or something
// _CachingChangeObserver is an object which receives observeChanges callbacks
// and keeps a cache of the current cursor state up to date in this.docs. Users
// of this class should read the docs field but not modify it. You should pass
// the "applyChange" field as the callbacks to the underlying observeChanges
// call. Optionally, you can specify your own observeChanges callbacks which are
// invoked immediately before the docs field is updated; this object is made
// available as `this` to those callbacks.

LocalCollection._CachingChangeObserver = class _CachingChangeObserver {
  constructor(options = {}) {
    const orderedFromCallbacks = options.callbacks && LocalCollection._observeChangesCallbacksAreOrdered(options.callbacks);

    if (hasOwn.call(options, 'ordered')) {
      this.ordered = options.ordered;

      if (options.callbacks && options.ordered !== orderedFromCallbacks) {
        throw Error('ordered option doesn\'t match callbacks');
      }
    } else if (options.callbacks) {
      this.ordered = orderedFromCallbacks;
    } else {
      throw Error('must provide ordered or callbacks');
    }

    const callbacks = options.callbacks || {};

    if (this.ordered) {
      this.docs = new OrderedDict(MongoID.idStringify);
      this.applyChange = {
        addedBefore: (id, fields, before) => {
          const doc = EJSON.clone(fields);
          doc._id = id;

          if (callbacks.addedBefore) {
            callbacks.addedBefore.call(this, id, fields, before);
          } // This line triggers if we provide added with movedBefore.


          if (callbacks.added) {
            callbacks.added.call(this, id, fields);
          } // XXX could `before` be a falsy ID?  Technically
          // idStringify seems to allow for them -- though
          // OrderedDict won't call stringify on a falsy arg.


          this.docs.putBefore(id, doc, before || null);
        },
        movedBefore: (id, before) => {
          const doc = this.docs.get(id);

          if (callbacks.movedBefore) {
            callbacks.movedBefore.call(this, id, before);
          }

          this.docs.moveBefore(id, before || null);
        }
      };
    } else {
      this.docs = new LocalCollection._IdMap();
      this.applyChange = {
        added: (id, fields) => {
          const doc = EJSON.clone(fields);

          if (callbacks.added) {
            callbacks.added.call(this, id, fields);
          }

          doc._id = id;
          this.docs.set(id, doc);
        }
      };
    } // The methods in _IdMap and OrderedDict used by these callbacks are
    // identical.


    this.applyChange.changed = (id, fields) => {
      const doc = this.docs.get(id);

      if (!doc) {
        throw new Error(`Unknown id for changed: ${id}`);
      }

      if (callbacks.changed) {
        callbacks.changed.call(this, id, EJSON.clone(fields));
      }

      DiffSequence.applyChanges(doc, fields);
    };

    this.applyChange.removed = id => {
      if (callbacks.removed) {
        callbacks.removed.call(this, id);
      }

      this.docs.remove(id);
    };
  }

};
LocalCollection._IdMap = class _IdMap extends IdMap {
  constructor() {
    super(MongoID.idStringify, MongoID.idParse);
  }

}; // Wrap a transform function to return objects that have the _id field
// of the untransformed document. This ensures that subsystems such as
// the observe-sequence package that call `observe` can keep track of
// the documents identities.
//
// - Require that it returns objects
// - If the return value has an _id field, verify that it matches the
//   original _id field
// - If the return value doesn't have an _id field, add it back.

LocalCollection.wrapTransform = transform => {
  if (!transform) {
    return null;
  } // No need to doubly-wrap transforms.


  if (transform.__wrappedTransform__) {
    return transform;
  }

  const wrapped = doc => {
    if (!hasOwn.call(doc, '_id')) {
      // XXX do we ever have a transform on the oplog's collection? because that
      // collection has no _id.
      throw new Error('can only transform documents with _id');
    }

    const id = doc._id; // XXX consider making tracker a weak dependency and checking
    // Package.tracker here

    const transformed = Tracker.nonreactive(() => transform(doc));

    if (!LocalCollection._isPlainObject(transformed)) {
      throw new Error('transform must return object');
    }

    if (hasOwn.call(transformed, '_id')) {
      if (!EJSON.equals(transformed._id, id)) {
        throw new Error('transformed document can\'t have different _id');
      }
    } else {
      transformed._id = id;
    }

    return transformed;
  };

  wrapped.__wrappedTransform__ = true;
  return wrapped;
}; // XXX the sorted-query logic below is laughably inefficient. we'll
// need to come up with a better datastructure for this.
//
// XXX the logic for observing with a skip or a limit is even more
// laughably inefficient. we recompute the whole results every time!
// This binary search puts a value between any equal values, and the first
// lesser value.


LocalCollection._binarySearch = (cmp, array, value) => {
  let first = 0;
  let range = array.length;

  while (range > 0) {
    const halfRange = Math.floor(range / 2);

    if (cmp(value, array[first + halfRange]) >= 0) {
      first += halfRange + 1;
      range -= halfRange + 1;
    } else {
      range = halfRange;
    }
  }

  return first;
};

LocalCollection._checkSupportedProjection = fields => {
  if (fields !== Object(fields) || Array.isArray(fields)) {
    throw MinimongoError('fields option must be an object');
  }

  Object.keys(fields).forEach(keyPath => {
    if (keyPath.split('.').includes('$')) {
      throw MinimongoError('Minimongo doesn\'t support $ operator in projections yet.');
    }

    const value = fields[keyPath];

    if (typeof value === 'object' && ['$elemMatch', '$meta', '$slice'].some(key => hasOwn.call(value, key))) {
      throw MinimongoError('Minimongo doesn\'t support operators in projections yet.');
    }

    if (![1, 0, true, false].includes(value)) {
      throw MinimongoError('Projection values should be one of 1, 0, true, or false');
    }
  });
}; // Knows how to compile a fields projection to a predicate function.
// @returns - Function: a closure that filters out an object according to the
//            fields projection rules:
//            @param obj - Object: MongoDB-styled document
//            @returns - Object: a document with the fields filtered out
//                       according to projection rules. Doesn't retain subfields
//                       of passed argument.


LocalCollection._compileProjection = fields => {
  LocalCollection._checkSupportedProjection(fields);

  const _idProjection = fields._id === undefined ? true : fields._id;

  const details = projectionDetails(fields); // returns transformed doc according to ruleTree

  const transform = (doc, ruleTree) => {
    // Special case for "sets"
    if (Array.isArray(doc)) {
      return doc.map(subdoc => transform(subdoc, ruleTree));
    }

    const result = details.including ? {} : EJSON.clone(doc);
    Object.keys(ruleTree).forEach(key => {
      if (!hasOwn.call(doc, key)) {
        return;
      }

      const rule = ruleTree[key];

      if (rule === Object(rule)) {
        // For sub-objects/subsets we branch
        if (doc[key] === Object(doc[key])) {
          result[key] = transform(doc[key], rule);
        }
      } else if (details.including) {
        // Otherwise we don't even touch this subfield
        result[key] = EJSON.clone(doc[key]);
      } else {
        delete result[key];
      }
    });
    return result;
  };

  return doc => {
    const result = transform(doc, details.tree);

    if (_idProjection && hasOwn.call(doc, '_id')) {
      result._id = doc._id;
    }

    if (!_idProjection && hasOwn.call(result, '_id')) {
      delete result._id;
    }

    return result;
  };
}; // Calculates the document to insert in case we're doing an upsert and the
// selector does not match any elements


LocalCollection._createUpsertDocument = (selector, modifier) => {
  const selectorDocument = populateDocumentWithQueryFields(selector);

  const isModify = LocalCollection._isModificationMod(modifier);

  const newDoc = {};

  if (selectorDocument._id) {
    newDoc._id = selectorDocument._id;
    delete selectorDocument._id;
  } // This double _modify call is made to help with nested properties (see issue
  // #8631). We do this even if it's a replacement for validation purposes (e.g.
  // ambiguous id's)


  LocalCollection._modify(newDoc, {
    $set: selectorDocument
  });

  LocalCollection._modify(newDoc, modifier, {
    isInsert: true
  });

  if (isModify) {
    return newDoc;
  } // Replacement can take _id from query document


  const replacement = Object.assign({}, modifier);

  if (newDoc._id) {
    replacement._id = newDoc._id;
  }

  return replacement;
};

LocalCollection._diffObjects = (left, right, callbacks) => {
  return DiffSequence.diffObjects(left, right, callbacks);
}; // ordered: bool.
// old_results and new_results: collections of documents.
//    if ordered, they are arrays.
//    if unordered, they are IdMaps


LocalCollection._diffQueryChanges = (ordered, oldResults, newResults, observer, options) => DiffSequence.diffQueryChanges(ordered, oldResults, newResults, observer, options);

LocalCollection._diffQueryOrderedChanges = (oldResults, newResults, observer, options) => DiffSequence.diffQueryOrderedChanges(oldResults, newResults, observer, options);

LocalCollection._diffQueryUnorderedChanges = (oldResults, newResults, observer, options) => DiffSequence.diffQueryUnorderedChanges(oldResults, newResults, observer, options);

LocalCollection._findInOrderedResults = (query, doc) => {
  if (!query.ordered) {
    throw new Error('Can\'t call _findInOrderedResults on unordered query');
  }

  for (let i = 0; i < query.results.length; i++) {
    if (query.results[i] === doc) {
      return i;
    }
  }

  throw Error('object missing from query');
}; // If this is a selector which explicitly constrains the match by ID to a finite
// number of documents, returns a list of their IDs.  Otherwise returns
// null. Note that the selector may have other restrictions so it may not even
// match those document!  We care about $in and $and since those are generated
// access-controlled update and remove.


LocalCollection._idsMatchedBySelector = selector => {
  // Is the selector just an ID?
  if (LocalCollection._selectorIsId(selector)) {
    return [selector];
  }

  if (!selector) {
    return null;
  } // Do we have an _id clause?


  if (hasOwn.call(selector, '_id')) {
    // Is the _id clause just an ID?
    if (LocalCollection._selectorIsId(selector._id)) {
      return [selector._id];
    } // Is the _id clause {_id: {$in: ["x", "y", "z"]}}?


    if (selector._id && Array.isArray(selector._id.$in) && selector._id.$in.length && selector._id.$in.every(LocalCollection._selectorIsId)) {
      return selector._id.$in;
    }

    return null;
  } // If this is a top-level $and, and any of the clauses constrain their
  // documents, then the whole selector is constrained by any one clause's
  // constraint. (Well, by their intersection, but that seems unlikely.)


  if (Array.isArray(selector.$and)) {
    for (let i = 0; i < selector.$and.length; ++i) {
      const subIds = LocalCollection._idsMatchedBySelector(selector.$and[i]);

      if (subIds) {
        return subIds;
      }
    }
  }

  return null;
};

LocalCollection._insertInResults = (query, doc) => {
  const fields = EJSON.clone(doc);
  delete fields._id;

  if (query.ordered) {
    if (!query.sorter) {
      query.addedBefore(doc._id, query.projectionFn(fields), null);
      query.results.push(doc);
    } else {
      const i = LocalCollection._insertInSortedList(query.sorter.getComparator({
        distances: query.distances
      }), query.results, doc);

      let next = query.results[i + 1];

      if (next) {
        next = next._id;
      } else {
        next = null;
      }

      query.addedBefore(doc._id, query.projectionFn(fields), next);
    }

    query.added(doc._id, query.projectionFn(fields));
  } else {
    query.added(doc._id, query.projectionFn(fields));
    query.results.set(doc._id, doc);
  }
};

LocalCollection._insertInSortedList = (cmp, array, value) => {
  if (array.length === 0) {
    array.push(value);
    return 0;
  }

  const i = LocalCollection._binarySearch(cmp, array, value);

  array.splice(i, 0, value);
  return i;
};

LocalCollection._isModificationMod = mod => {
  let isModify = false;
  let isReplace = false;
  Object.keys(mod).forEach(key => {
    if (key.substr(0, 1) === '$') {
      isModify = true;
    } else {
      isReplace = true;
    }
  });

  if (isModify && isReplace) {
    throw new Error('Update parameter cannot have both modifier and non-modifier fields.');
  }

  return isModify;
}; // XXX maybe this should be EJSON.isObject, though EJSON doesn't know about
// RegExp
// XXX note that _type(undefined) === 3!!!!


LocalCollection._isPlainObject = x => {
  return x && LocalCollection._f._type(x) === 3;
}; // XXX need a strategy for passing the binding of $ into this
// function, from the compiled selector
//
// maybe just {key.up.to.just.before.dollarsign: array_index}
//
// XXX atomicity: if one modification fails, do we roll back the whole
// change?
//
// options:
//   - isInsert is set when _modify is being called to compute the document to
//     insert as part of an upsert operation. We use this primarily to figure
//     out when to set the fields in $setOnInsert, if present.


LocalCollection._modify = (doc, modifier, options = {}) => {
  if (!LocalCollection._isPlainObject(modifier)) {
    throw MinimongoError('Modifier must be an object');
  } // Make sure the caller can't mutate our data structures.


  modifier = EJSON.clone(modifier);
  const isModifier = isOperatorObject(modifier);
  const newDoc = isModifier ? EJSON.clone(doc) : modifier;

  if (isModifier) {
    // apply modifiers to the doc.
    Object.keys(modifier).forEach(operator => {
      // Treat $setOnInsert as $set if this is an insert.
      const setOnInsert = options.isInsert && operator === '$setOnInsert';
      const modFunc = MODIFIERS[setOnInsert ? '$set' : operator];
      const operand = modifier[operator];

      if (!modFunc) {
        throw MinimongoError(`Invalid modifier specified ${operator}`);
      }

      Object.keys(operand).forEach(keypath => {
        const arg = operand[keypath];

        if (keypath === '') {
          throw MinimongoError('An empty update path is not valid.');
        }

        const keyparts = keypath.split('.');

        if (!keyparts.every(Boolean)) {
          throw MinimongoError(`The update path '${keypath}' contains an empty field name, ` + 'which is not allowed.');
        }

        const target = findModTarget(newDoc, keyparts, {
          arrayIndices: options.arrayIndices,
          forbidArray: operator === '$rename',
          noCreate: NO_CREATE_MODIFIERS[operator]
        });
        modFunc(target, keyparts.pop(), arg, keypath, newDoc);
      });
    });

    if (doc._id && !EJSON.equals(doc._id, newDoc._id)) {
      throw MinimongoError(`After applying the update to the document {_id: "${doc._id}", ...},` + ' the (immutable) field \'_id\' was found to have been altered to ' + `_id: "${newDoc._id}"`);
    }
  } else {
    if (doc._id && modifier._id && !EJSON.equals(doc._id, modifier._id)) {
      throw MinimongoError(`The _id field cannot be changed from {_id: "${doc._id}"} to ` + `{_id: "${modifier._id}"}`);
    } // replace the whole document


    assertHasValidFieldNames(modifier);
  } // move new document into place.


  Object.keys(doc).forEach(key => {
    // Note: this used to be for (var key in doc) however, this does not
    // work right in Opera. Deleting from a doc while iterating over it
    // would sometimes cause opera to skip some keys.
    if (key !== '_id') {
      delete doc[key];
    }
  });
  Object.keys(newDoc).forEach(key => {
    doc[key] = newDoc[key];
  });
};

LocalCollection._observeFromObserveChanges = (cursor, observeCallbacks) => {
  const transform = cursor.getTransform() || (doc => doc);

  let suppressed = !!observeCallbacks._suppress_initial;
  let observeChangesCallbacks;

  if (LocalCollection._observeCallbacksAreOrdered(observeCallbacks)) {
    // The "_no_indices" option sets all index arguments to -1 and skips the
    // linear scans required to generate them.  This lets observers that don't
    // need absolute indices benefit from the other features of this API --
    // relative order, transforms, and applyChanges -- without the speed hit.
    const indices = !observeCallbacks._no_indices;
    observeChangesCallbacks = {
      addedBefore(id, fields, before) {
        if (suppressed || !(observeCallbacks.addedAt || observeCallbacks.added)) {
          return;
        }

        const doc = transform(Object.assign(fields, {
          _id: id
        }));

        if (observeCallbacks.addedAt) {
          observeCallbacks.addedAt(doc, indices ? before ? this.docs.indexOf(before) : this.docs.size() : -1, before);
        } else {
          observeCallbacks.added(doc);
        }
      },

      changed(id, fields) {
        if (!(observeCallbacks.changedAt || observeCallbacks.changed)) {
          return;
        }

        let doc = EJSON.clone(this.docs.get(id));

        if (!doc) {
          throw new Error(`Unknown id for changed: ${id}`);
        }

        const oldDoc = transform(EJSON.clone(doc));
        DiffSequence.applyChanges(doc, fields);

        if (observeCallbacks.changedAt) {
          observeCallbacks.changedAt(transform(doc), oldDoc, indices ? this.docs.indexOf(id) : -1);
        } else {
          observeCallbacks.changed(transform(doc), oldDoc);
        }
      },

      movedBefore(id, before) {
        if (!observeCallbacks.movedTo) {
          return;
        }

        const from = indices ? this.docs.indexOf(id) : -1;
        let to = indices ? before ? this.docs.indexOf(before) : this.docs.size() : -1; // When not moving backwards, adjust for the fact that removing the
        // document slides everything back one slot.

        if (to > from) {
          --to;
        }

        observeCallbacks.movedTo(transform(EJSON.clone(this.docs.get(id))), from, to, before || null);
      },

      removed(id) {
        if (!(observeCallbacks.removedAt || observeCallbacks.removed)) {
          return;
        } // technically maybe there should be an EJSON.clone here, but it's about
        // to be removed from this.docs!


        const doc = transform(this.docs.get(id));

        if (observeCallbacks.removedAt) {
          observeCallbacks.removedAt(doc, indices ? this.docs.indexOf(id) : -1);
        } else {
          observeCallbacks.removed(doc);
        }
      }

    };
  } else {
    observeChangesCallbacks = {
      added(id, fields) {
        if (!suppressed && observeCallbacks.added) {
          observeCallbacks.added(transform(Object.assign(fields, {
            _id: id
          })));
        }
      },

      changed(id, fields) {
        if (observeCallbacks.changed) {
          const oldDoc = this.docs.get(id);
          const doc = EJSON.clone(oldDoc);
          DiffSequence.applyChanges(doc, fields);
          observeCallbacks.changed(transform(doc), transform(EJSON.clone(oldDoc)));
        }
      },

      removed(id) {
        if (observeCallbacks.removed) {
          observeCallbacks.removed(transform(this.docs.get(id)));
        }
      }

    };
  }

  const changeObserver = new LocalCollection._CachingChangeObserver({
    callbacks: observeChangesCallbacks
  });
  const handle = cursor.observeChanges(changeObserver.applyChange);
  suppressed = false;
  return handle;
};

LocalCollection._observeCallbacksAreOrdered = callbacks => {
  if (callbacks.added && callbacks.addedAt) {
    throw new Error('Please specify only one of added() and addedAt()');
  }

  if (callbacks.changed && callbacks.changedAt) {
    throw new Error('Please specify only one of changed() and changedAt()');
  }

  if (callbacks.removed && callbacks.removedAt) {
    throw new Error('Please specify only one of removed() and removedAt()');
  }

  return !!(callbacks.addedAt || callbacks.changedAt || callbacks.movedTo || callbacks.removedAt);
};

LocalCollection._observeChangesCallbacksAreOrdered = callbacks => {
  if (callbacks.added && callbacks.addedBefore) {
    throw new Error('Please specify only one of added() and addedBefore()');
  }

  return !!(callbacks.addedBefore || callbacks.movedBefore);
};

LocalCollection._removeFromResults = (query, doc) => {
  if (query.ordered) {
    const i = LocalCollection._findInOrderedResults(query, doc);

    query.removed(doc._id);
    query.results.splice(i, 1);
  } else {
    const id = doc._id; // in case callback mutates doc

    query.removed(doc._id);
    query.results.remove(id);
  }
}; // Is this selector just shorthand for lookup by _id?


LocalCollection._selectorIsId = selector => typeof selector === 'number' || typeof selector === 'string' || selector instanceof MongoID.ObjectID; // Is the selector just lookup by _id (shorthand or not)?


LocalCollection._selectorIsIdPerhapsAsObject = selector => LocalCollection._selectorIsId(selector) || LocalCollection._selectorIsId(selector && selector._id) && Object.keys(selector).length === 1;

LocalCollection._updateInResults = (query, doc, old_doc) => {
  if (!EJSON.equals(doc._id, old_doc._id)) {
    throw new Error('Can\'t change a doc\'s _id while updating');
  }

  const projectionFn = query.projectionFn;
  const changedFields = DiffSequence.makeChangedFields(projectionFn(doc), projectionFn(old_doc));

  if (!query.ordered) {
    if (Object.keys(changedFields).length) {
      query.changed(doc._id, changedFields);
      query.results.set(doc._id, doc);
    }

    return;
  }

  const old_idx = LocalCollection._findInOrderedResults(query, doc);

  if (Object.keys(changedFields).length) {
    query.changed(doc._id, changedFields);
  }

  if (!query.sorter) {
    return;
  } // just take it out and put it back in again, and see if the index changes


  query.results.splice(old_idx, 1);

  const new_idx = LocalCollection._insertInSortedList(query.sorter.getComparator({
    distances: query.distances
  }), query.results, doc);

  if (old_idx !== new_idx) {
    let next = query.results[new_idx + 1];

    if (next) {
      next = next._id;
    } else {
      next = null;
    }

    query.movedBefore && query.movedBefore(doc._id, next);
  }
};

const MODIFIERS = {
  $currentDate(target, field, arg) {
    if (typeof arg === 'object' && hasOwn.call(arg, '$type')) {
      if (arg.$type !== 'date') {
        throw MinimongoError('Minimongo does currently only support the date type in ' + '$currentDate modifiers', {
          field
        });
      }
    } else if (arg !== true) {
      throw MinimongoError('Invalid $currentDate modifier', {
        field
      });
    }

    target[field] = new Date();
  },

  $min(target, field, arg) {
    if (typeof arg !== 'number') {
      throw MinimongoError('Modifier $min allowed for numbers only', {
        field
      });
    }

    if (field in target) {
      if (typeof target[field] !== 'number') {
        throw MinimongoError('Cannot apply $min modifier to non-number', {
          field
        });
      }

      if (target[field] > arg) {
        target[field] = arg;
      }
    } else {
      target[field] = arg;
    }
  },

  $max(target, field, arg) {
    if (typeof arg !== 'number') {
      throw MinimongoError('Modifier $max allowed for numbers only', {
        field
      });
    }

    if (field in target) {
      if (typeof target[field] !== 'number') {
        throw MinimongoError('Cannot apply $max modifier to non-number', {
          field
        });
      }

      if (target[field] < arg) {
        target[field] = arg;
      }
    } else {
      target[field] = arg;
    }
  },

  $inc(target, field, arg) {
    if (typeof arg !== 'number') {
      throw MinimongoError('Modifier $inc allowed for numbers only', {
        field
      });
    }

    if (field in target) {
      if (typeof target[field] !== 'number') {
        throw MinimongoError('Cannot apply $inc modifier to non-number', {
          field
        });
      }

      target[field] += arg;
    } else {
      target[field] = arg;
    }
  },

  $set(target, field, arg) {
    if (target !== Object(target)) {
      // not an array or an object
      const error = MinimongoError('Cannot set property on non-object field', {
        field
      });
      error.setPropertyError = true;
      throw error;
    }

    if (target === null) {
      const error = MinimongoError('Cannot set property on null', {
        field
      });
      error.setPropertyError = true;
      throw error;
    }

    assertHasValidFieldNames(arg);
    target[field] = arg;
  },

  $setOnInsert(target, field, arg) {// converted to `$set` in `_modify`
  },

  $unset(target, field, arg) {
    if (target !== undefined) {
      if (target instanceof Array) {
        if (field in target) {
          target[field] = null;
        }
      } else {
        delete target[field];
      }
    }
  },

  $push(target, field, arg) {
    if (target[field] === undefined) {
      target[field] = [];
    }

    if (!(target[field] instanceof Array)) {
      throw MinimongoError('Cannot apply $push modifier to non-array', {
        field
      });
    }

    if (!(arg && arg.$each)) {
      // Simple mode: not $each
      assertHasValidFieldNames(arg);
      target[field].push(arg);
      return;
    } // Fancy mode: $each (and maybe $slice and $sort and $position)


    const toPush = arg.$each;

    if (!(toPush instanceof Array)) {
      throw MinimongoError('$each must be an array', {
        field
      });
    }

    assertHasValidFieldNames(toPush); // Parse $position

    let position = undefined;

    if ('$position' in arg) {
      if (typeof arg.$position !== 'number') {
        throw MinimongoError('$position must be a numeric value', {
          field
        });
      } // XXX should check to make sure integer


      if (arg.$position < 0) {
        throw MinimongoError('$position in $push must be zero or positive', {
          field
        });
      }

      position = arg.$position;
    } // Parse $slice.


    let slice = undefined;

    if ('$slice' in arg) {
      if (typeof arg.$slice !== 'number') {
        throw MinimongoError('$slice must be a numeric value', {
          field
        });
      } // XXX should check to make sure integer


      slice = arg.$slice;
    } // Parse $sort.


    let sortFunction = undefined;

    if (arg.$sort) {
      if (slice === undefined) {
        throw MinimongoError('$sort requires $slice to be present', {
          field
        });
      } // XXX this allows us to use a $sort whose value is an array, but that's
      // actually an extension of the Node driver, so it won't work
      // server-side. Could be confusing!
      // XXX is it correct that we don't do geo-stuff here?


      sortFunction = new Minimongo.Sorter(arg.$sort).getComparator();
      toPush.forEach(element => {
        if (LocalCollection._f._type(element) !== 3) {
          throw MinimongoError('$push like modifiers using $sort require all elements to be ' + 'objects', {
            field
          });
        }
      });
    } // Actually push.


    if (position === undefined) {
      toPush.forEach(element => {
        target[field].push(element);
      });
    } else {
      const spliceArguments = [position, 0];
      toPush.forEach(element => {
        spliceArguments.push(element);
      });
      target[field].splice(...spliceArguments);
    } // Actually sort.


    if (sortFunction) {
      target[field].sort(sortFunction);
    } // Actually slice.


    if (slice !== undefined) {
      if (slice === 0) {
        target[field] = []; // differs from Array.slice!
      } else if (slice < 0) {
        target[field] = target[field].slice(slice);
      } else {
        target[field] = target[field].slice(0, slice);
      }
    }
  },

  $pushAll(target, field, arg) {
    if (!(typeof arg === 'object' && arg instanceof Array)) {
      throw MinimongoError('Modifier $pushAll/pullAll allowed for arrays only');
    }

    assertHasValidFieldNames(arg);
    const toPush = target[field];

    if (toPush === undefined) {
      target[field] = arg;
    } else if (!(toPush instanceof Array)) {
      throw MinimongoError('Cannot apply $pushAll modifier to non-array', {
        field
      });
    } else {
      toPush.push(...arg);
    }
  },

  $addToSet(target, field, arg) {
    let isEach = false;

    if (typeof arg === 'object') {
      // check if first key is '$each'
      const keys = Object.keys(arg);

      if (keys[0] === '$each') {
        isEach = true;
      }
    }

    const values = isEach ? arg.$each : [arg];
    assertHasValidFieldNames(values);
    const toAdd = target[field];

    if (toAdd === undefined) {
      target[field] = values;
    } else if (!(toAdd instanceof Array)) {
      throw MinimongoError('Cannot apply $addToSet modifier to non-array', {
        field
      });
    } else {
      values.forEach(value => {
        if (toAdd.some(element => LocalCollection._f._equal(value, element))) {
          return;
        }

        toAdd.push(value);
      });
    }
  },

  $pop(target, field, arg) {
    if (target === undefined) {
      return;
    }

    const toPop = target[field];

    if (toPop === undefined) {
      return;
    }

    if (!(toPop instanceof Array)) {
      throw MinimongoError('Cannot apply $pop modifier to non-array', {
        field
      });
    }

    if (typeof arg === 'number' && arg < 0) {
      toPop.splice(0, 1);
    } else {
      toPop.pop();
    }
  },

  $pull(target, field, arg) {
    if (target === undefined) {
      return;
    }

    const toPull = target[field];

    if (toPull === undefined) {
      return;
    }

    if (!(toPull instanceof Array)) {
      throw MinimongoError('Cannot apply $pull/pullAll modifier to non-array', {
        field
      });
    }

    let out;

    if (arg != null && typeof arg === 'object' && !(arg instanceof Array)) {
      // XXX would be much nicer to compile this once, rather than
      // for each document we modify.. but usually we're not
      // modifying that many documents, so we'll let it slide for
      // now
      // XXX Minimongo.Matcher isn't up for the job, because we need
      // to permit stuff like {$pull: {a: {$gt: 4}}}.. something
      // like {$gt: 4} is not normally a complete selector.
      // same issue as $elemMatch possibly?
      const matcher = new Minimongo.Matcher(arg);
      out = toPull.filter(element => !matcher.documentMatches(element).result);
    } else {
      out = toPull.filter(element => !LocalCollection._f._equal(element, arg));
    }

    target[field] = out;
  },

  $pullAll(target, field, arg) {
    if (!(typeof arg === 'object' && arg instanceof Array)) {
      throw MinimongoError('Modifier $pushAll/pullAll allowed for arrays only', {
        field
      });
    }

    if (target === undefined) {
      return;
    }

    const toPull = target[field];

    if (toPull === undefined) {
      return;
    }

    if (!(toPull instanceof Array)) {
      throw MinimongoError('Cannot apply $pull/pullAll modifier to non-array', {
        field
      });
    }

    target[field] = toPull.filter(object => !arg.some(element => LocalCollection._f._equal(object, element)));
  },

  $rename(target, field, arg, keypath, doc) {
    // no idea why mongo has this restriction..
    if (keypath === arg) {
      throw MinimongoError('$rename source must differ from target', {
        field
      });
    }

    if (target === null) {
      throw MinimongoError('$rename source field invalid', {
        field
      });
    }

    if (typeof arg !== 'string') {
      throw MinimongoError('$rename target must be a string', {
        field
      });
    }

    if (arg.includes('\0')) {
      // Null bytes are not allowed in Mongo field names
      // https://docs.mongodb.com/manual/reference/limits/#Restrictions-on-Field-Names
      throw MinimongoError('The \'to\' field for $rename cannot contain an embedded null byte', {
        field
      });
    }

    if (target === undefined) {
      return;
    }

    const object = target[field];
    delete target[field];
    const keyparts = arg.split('.');
    const target2 = findModTarget(doc, keyparts, {
      forbidArray: true
    });

    if (target2 === null) {
      throw MinimongoError('$rename target field invalid', {
        field
      });
    }

    target2[keyparts.pop()] = object;
  },

  $bit(target, field, arg) {
    // XXX mongo only supports $bit on integers, and we only support
    // native javascript numbers (doubles) so far, so we can't support $bit
    throw MinimongoError('$bit is not supported', {
      field
    });
  }

};
const NO_CREATE_MODIFIERS = {
  $pop: true,
  $pull: true,
  $pullAll: true,
  $rename: true,
  $unset: true
}; // Make sure field names do not contain Mongo restricted
// characters ('.', '$', '\0').
// https://docs.mongodb.com/manual/reference/limits/#Restrictions-on-Field-Names

const invalidCharMsg = {
  $: 'start with \'$\'',
  '.': 'contain \'.\'',
  '\0': 'contain null bytes'
}; // checks if all field names in an object are valid

function assertHasValidFieldNames(doc) {
  if (doc && typeof doc === 'object') {
    JSON.stringify(doc, (key, value) => {
      assertIsValidFieldName(key);
      return value;
    });
  }
}

function assertIsValidFieldName(key) {
  let match;

  if (typeof key === 'string' && (match = key.match(/^\$|\.|\0/))) {
    throw MinimongoError(`Key ${key} must not ${invalidCharMsg[match[0]]}`);
  }
} // for a.b.c.2.d.e, keyparts should be ['a', 'b', 'c', '2', 'd', 'e'],
// and then you would operate on the 'e' property of the returned
// object.
//
// if options.noCreate is falsey, creates intermediate levels of
// structure as necessary, like mkdir -p (and raises an exception if
// that would mean giving a non-numeric property to an array.) if
// options.noCreate is true, return undefined instead.
//
// may modify the last element of keyparts to signal to the caller that it needs
// to use a different value to index into the returned object (for example,
// ['a', '01'] -> ['a', 1]).
//
// if forbidArray is true, return null if the keypath goes through an array.
//
// if options.arrayIndices is set, use its first element for the (first) '$' in
// the path.


function findModTarget(doc, keyparts, options = {}) {
  let usedArrayIndex = false;

  for (let i = 0; i < keyparts.length; i++) {
    const last = i === keyparts.length - 1;
    let keypart = keyparts[i];

    if (!isIndexable(doc)) {
      if (options.noCreate) {
        return undefined;
      }

      const error = MinimongoError(`cannot use the part '${keypart}' to traverse ${doc}`);
      error.setPropertyError = true;
      throw error;
    }

    if (doc instanceof Array) {
      if (options.forbidArray) {
        return null;
      }

      if (keypart === '$') {
        if (usedArrayIndex) {
          throw MinimongoError('Too many positional (i.e. \'$\') elements');
        }

        if (!options.arrayIndices || !options.arrayIndices.length) {
          throw MinimongoError('The positional operator did not find the match needed from the ' + 'query');
        }

        keypart = options.arrayIndices[0];
        usedArrayIndex = true;
      } else if (isNumericKey(keypart)) {
        keypart = parseInt(keypart);
      } else {
        if (options.noCreate) {
          return undefined;
        }

        throw MinimongoError(`can't append to array using string field name [${keypart}]`);
      }

      if (last) {
        keyparts[i] = keypart; // handle 'a.01'
      }

      if (options.noCreate && keypart >= doc.length) {
        return undefined;
      }

      while (doc.length < keypart) {
        doc.push(null);
      }

      if (!last) {
        if (doc.length === keypart) {
          doc.push({});
        } else if (typeof doc[keypart] !== 'object') {
          throw MinimongoError(`can't modify field '${keyparts[i + 1]}' of list value ` + JSON.stringify(doc[keypart]));
        }
      }
    } else {
      assertIsValidFieldName(keypart);

      if (!(keypart in doc)) {
        if (options.noCreate) {
          return undefined;
        }

        if (!last) {
          doc[keypart] = {};
        }
      }
    }

    if (last) {
      return doc;
    }

    doc = doc[keypart];
  } // notreached

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"matcher.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/matcher.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => Matcher
});
let LocalCollection;
module.watch(require("./local_collection.js"), {
  default(v) {
    LocalCollection = v;
  }

}, 0);
let compileDocumentSelector, hasOwn, nothingMatcher;
module.watch(require("./common.js"), {
  compileDocumentSelector(v) {
    compileDocumentSelector = v;
  },

  hasOwn(v) {
    hasOwn = v;
  },

  nothingMatcher(v) {
    nothingMatcher = v;
  }

}, 1);

class Matcher {
  constructor(selector, isUpdate) {
    // A set (object mapping string -> *) of all of the document paths looked
    // at by the selector. Also includes the empty string if it may look at any
    // path (eg, $where).
    this._paths = {}; // Set to true if compilation finds a $near.

    this._hasGeoQuery = false; // Set to true if compilation finds a $where.

    this._hasWhere = false; // Set to false if compilation finds anything other than a simple equality
    // or one or more of '$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$nin' used
    // with scalars as operands.

    this._isSimple = true; // Set to a dummy document which always matches this Matcher. Or set to null
    // if such document is too hard to find.

    this._matchingDocument = undefined; // A clone of the original selector. It may just be a function if the user
    // passed in a function; otherwise is definitely an object (eg, IDs are
    // translated into {_id: ID} first. Used by canBecomeTrueByModifier and
    // Sorter._useWithMatcher.

    this._selector = null;
    this._docMatcher = this._compileSelector(selector); // Set to true if selection is done for an update operation
    // Default is false
    // Used for $near array update (issue #3599)

    this._isUpdate = isUpdate;
  }

  documentMatches(doc) {
    if (doc !== Object(doc)) {
      throw Error('documentMatches needs a document');
    }

    return this._docMatcher(doc);
  }

  hasGeoQuery() {
    return this._hasGeoQuery;
  }

  hasWhere() {
    return this._hasWhere;
  }

  isSimple() {
    return this._isSimple;
  } // Given a selector, return a function that takes one argument, a
  // document. It returns a result object.


  _compileSelector(selector) {
    // you can pass a literal function instead of a selector
    if (selector instanceof Function) {
      this._isSimple = false;
      this._selector = selector;

      this._recordPathUsed('');

      return doc => ({
        result: !!selector.call(doc)
      });
    } // shorthand -- scalar _id


    if (LocalCollection._selectorIsId(selector)) {
      this._selector = {
        _id: selector
      };

      this._recordPathUsed('_id');

      return doc => ({
        result: EJSON.equals(doc._id, selector)
      });
    } // protect against dangerous selectors.  falsey and {_id: falsey} are both
    // likely programmer error, and not what you want, particularly for
    // destructive operations.


    if (!selector || hasOwn.call(selector, '_id') && !selector._id) {
      this._isSimple = false;
      return nothingMatcher;
    } // Top level can't be an array or true or binary.


    if (Array.isArray(selector) || EJSON.isBinary(selector) || typeof selector === 'boolean') {
      throw new Error(`Invalid selector: ${selector}`);
    }

    this._selector = EJSON.clone(selector);
    return compileDocumentSelector(selector, this, {
      isRoot: true
    });
  } // Returns a list of key paths the given selector is looking for. It includes
  // the empty string if there is a $where.


  _getPaths() {
    return Object.keys(this._paths);
  }

  _recordPathUsed(path) {
    this._paths[path] = true;
  }

}

// helpers used by compiled selector code
LocalCollection._f = {
  // XXX for _all and _in, consider building 'inquery' at compile time..
  _type(v) {
    if (typeof v === 'number') {
      return 1;
    }

    if (typeof v === 'string') {
      return 2;
    }

    if (typeof v === 'boolean') {
      return 8;
    }

    if (Array.isArray(v)) {
      return 4;
    }

    if (v === null) {
      return 10;
    } // note that typeof(/x/) === "object"


    if (v instanceof RegExp) {
      return 11;
    }

    if (typeof v === 'function') {
      return 13;
    }

    if (v instanceof Date) {
      return 9;
    }

    if (EJSON.isBinary(v)) {
      return 5;
    }

    if (v instanceof MongoID.ObjectID) {
      return 7;
    } // object


    return 3; // XXX support some/all of these:
    // 14, symbol
    // 15, javascript code with scope
    // 16, 18: 32-bit/64-bit integer
    // 17, timestamp
    // 255, minkey
    // 127, maxkey
  },

  // deep equality test: use for literal document and array matches
  _equal(a, b) {
    return EJSON.equals(a, b, {
      keyOrderSensitive: true
    });
  },

  // maps a type code to a value that can be used to sort values of different
  // types
  _typeorder(t) {
    // http://www.mongodb.org/display/DOCS/What+is+the+Compare+Order+for+BSON+Types
    // XXX what is the correct sort position for Javascript code?
    // ('100' in the matrix below)
    // XXX minkey/maxkey
    return [-1, // (not a type)
    1, // number
    2, // string
    3, // object
    4, // array
    5, // binary
    -1, // deprecated
    6, // ObjectID
    7, // bool
    8, // Date
    0, // null
    9, // RegExp
    -1, // deprecated
    100, // JS code
    2, // deprecated (symbol)
    100, // JS code
    1, // 32-bit int
    8, // Mongo timestamp
    1 // 64-bit int
    ][t];
  },

  // compare two values of unknown type according to BSON ordering
  // semantics. (as an extension, consider 'undefined' to be less than
  // any other value.) return negative if a is less, positive if b is
  // less, or 0 if equal
  _cmp(a, b) {
    if (a === undefined) {
      return b === undefined ? 0 : -1;
    }

    if (b === undefined) {
      return 1;
    }

    let ta = LocalCollection._f._type(a);

    let tb = LocalCollection._f._type(b);

    const oa = LocalCollection._f._typeorder(ta);

    const ob = LocalCollection._f._typeorder(tb);

    if (oa !== ob) {
      return oa < ob ? -1 : 1;
    } // XXX need to implement this if we implement Symbol or integers, or
    // Timestamp


    if (ta !== tb) {
      throw Error('Missing type coercion logic in _cmp');
    }

    if (ta === 7) {
      // ObjectID
      // Convert to string.
      ta = tb = 2;
      a = a.toHexString();
      b = b.toHexString();
    }

    if (ta === 9) {
      // Date
      // Convert to millis.
      ta = tb = 1;
      a = a.getTime();
      b = b.getTime();
    }

    if (ta === 1) // double
      return a - b;
    if (tb === 2) // string
      return a < b ? -1 : a === b ? 0 : 1;

    if (ta === 3) {
      // Object
      // this could be much more efficient in the expected case ...
      const toArray = object => {
        const result = [];
        Object.keys(object).forEach(key => {
          result.push(key, object[key]);
        });
        return result;
      };

      return LocalCollection._f._cmp(toArray(a), toArray(b));
    }

    if (ta === 4) {
      // Array
      for (let i = 0;; i++) {
        if (i === a.length) {
          return i === b.length ? 0 : -1;
        }

        if (i === b.length) {
          return 1;
        }

        const s = LocalCollection._f._cmp(a[i], b[i]);

        if (s !== 0) {
          return s;
        }
      }
    }

    if (ta === 5) {
      // binary
      // Surprisingly, a small binary blob is always less than a large one in
      // Mongo.
      if (a.length !== b.length) {
        return a.length - b.length;
      }

      for (let i = 0; i < a.length; i++) {
        if (a[i] < b[i]) {
          return -1;
        }

        if (a[i] > b[i]) {
          return 1;
        }
      }

      return 0;
    }

    if (ta === 8) {
      // boolean
      if (a) {
        return b ? 0 : 1;
      }

      return b ? -1 : 0;
    }

    if (ta === 10) // null
      return 0;
    if (ta === 11) // regexp
      throw Error('Sorting not supported on regular expression'); // XXX
    // 13: javascript code
    // 14: symbol
    // 15: javascript code with scope
    // 16: 32-bit integer
    // 17: timestamp
    // 18: 64-bit integer
    // 255: minkey
    // 127: maxkey

    if (ta === 13) // javascript code
      throw Error('Sorting not supported on Javascript code'); // XXX

    throw Error('Unknown type to sort');
  }

};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"minimongo_common.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/minimongo_common.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let LocalCollection_;
module.watch(require("./local_collection.js"), {
  default(v) {
    LocalCollection_ = v;
  }

}, 0);
let Matcher;
module.watch(require("./matcher.js"), {
  default(v) {
    Matcher = v;
  }

}, 1);
let Sorter;
module.watch(require("./sorter.js"), {
  default(v) {
    Sorter = v;
  }

}, 2);
LocalCollection = LocalCollection_;
Minimongo = {
  LocalCollection: LocalCollection_,
  Matcher,
  Sorter
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"observe_handle.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/observe_handle.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => ObserveHandle
});

class ObserveHandle {}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sorter.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/sorter.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => Sorter
});
let ELEMENT_OPERATORS, equalityElementMatcher, expandArraysInBranches, hasOwn, isOperatorObject, makeLookupFunction, regexpElementMatcher;
module.watch(require("./common.js"), {
  ELEMENT_OPERATORS(v) {
    ELEMENT_OPERATORS = v;
  },

  equalityElementMatcher(v) {
    equalityElementMatcher = v;
  },

  expandArraysInBranches(v) {
    expandArraysInBranches = v;
  },

  hasOwn(v) {
    hasOwn = v;
  },

  isOperatorObject(v) {
    isOperatorObject = v;
  },

  makeLookupFunction(v) {
    makeLookupFunction = v;
  },

  regexpElementMatcher(v) {
    regexpElementMatcher = v;
  }

}, 0);

class Sorter {
  constructor(spec, options = {}) {
    this._sortSpecParts = [];
    this._sortFunction = null;

    const addSpecPart = (path, ascending) => {
      if (!path) {
        throw Error('sort keys must be non-empty');
      }

      if (path.charAt(0) === '$') {
        throw Error(`unsupported sort key: ${path}`);
      }

      this._sortSpecParts.push({
        ascending,
        lookup: makeLookupFunction(path, {
          forSort: true
        }),
        path
      });
    };

    if (spec instanceof Array) {
      spec.forEach(element => {
        if (typeof element === 'string') {
          addSpecPart(element, true);
        } else {
          addSpecPart(element[0], element[1] !== 'desc');
        }
      });
    } else if (typeof spec === 'object') {
      Object.keys(spec).forEach(key => {
        addSpecPart(key, spec[key] >= 0);
      });
    } else if (typeof spec === 'function') {
      this._sortFunction = spec;
    } else {
      throw Error(`Bad sort specification: ${JSON.stringify(spec)}`);
    } // If a function is specified for sorting, we skip the rest.


    if (this._sortFunction) {
      return;
    } // To implement affectedByModifier, we piggy-back on top of Matcher's
    // affectedByModifier code; we create a selector that is affected by the
    // same modifiers as this sort order. This is only implemented on the
    // server.


    if (this.affectedByModifier) {
      const selector = {};

      this._sortSpecParts.forEach(spec => {
        selector[spec.path] = 1;
      });

      this._selectorForAffectedByModifier = new Minimongo.Matcher(selector);
    }

    this._keyComparator = composeComparators(this._sortSpecParts.map((spec, i) => this._keyFieldComparator(i))); // If you specify a matcher for this Sorter, _keyFilter may be set to a
    // function which selects whether or not a given "sort key" (tuple of values
    // for the different sort spec fields) is compatible with the selector.

    this._keyFilter = null;

    if (options.matcher) {
      this._useWithMatcher(options.matcher);
    }
  }

  getComparator(options) {
    // If sort is specified or have no distances, just use the comparator from
    // the source specification (which defaults to "everything is equal".
    // issue #3599
    // https://docs.mongodb.com/manual/reference/operator/query/near/#sort-operation
    // sort effectively overrides $near
    if (this._sortSpecParts.length || !options || !options.distances) {
      return this._getBaseComparator();
    }

    const distances = options.distances; // Return a comparator which compares using $near distances.

    return (a, b) => {
      if (!distances.has(a._id)) {
        throw Error(`Missing distance for ${a._id}`);
      }

      if (!distances.has(b._id)) {
        throw Error(`Missing distance for ${b._id}`);
      }

      return distances.get(a._id) - distances.get(b._id);
    };
  } // Takes in two keys: arrays whose lengths match the number of spec
  // parts. Returns negative, 0, or positive based on using the sort spec to
  // compare fields.


  _compareKeys(key1, key2) {
    if (key1.length !== this._sortSpecParts.length || key2.length !== this._sortSpecParts.length) {
      throw Error('Key has wrong length');
    }

    return this._keyComparator(key1, key2);
  } // Iterates over each possible "key" from doc (ie, over each branch), calling
  // 'cb' with the key.


  _generateKeysFromDoc(doc, cb) {
    if (this._sortSpecParts.length === 0) {
      throw new Error('can\'t generate keys without a spec');
    }

    const pathFromIndices = indices => `${indices.join(',')},`;

    let knownPaths = null; // maps index -> ({'' -> value} or {path -> value})

    const valuesByIndexAndPath = this._sortSpecParts.map(spec => {
      // Expand any leaf arrays that we find, and ignore those arrays
      // themselves.  (We never sort based on an array itself.)
      let branches = expandArraysInBranches(spec.lookup(doc), true); // If there are no values for a key (eg, key goes to an empty array),
      // pretend we found one null value.

      if (!branches.length) {
        branches = [{
          value: null
        }];
      }

      const element = Object.create(null);
      let usedPaths = false;
      branches.forEach(branch => {
        if (!branch.arrayIndices) {
          // If there are no array indices for a branch, then it must be the
          // only branch, because the only thing that produces multiple branches
          // is the use of arrays.
          if (branches.length > 1) {
            throw Error('multiple branches but no array used?');
          }

          element[''] = branch.value;
          return;
        }

        usedPaths = true;
        const path = pathFromIndices(branch.arrayIndices);

        if (hasOwn.call(element, path)) {
          throw Error(`duplicate path: ${path}`);
        }

        element[path] = branch.value; // If two sort fields both go into arrays, they have to go into the
        // exact same arrays and we have to find the same paths.  This is
        // roughly the same condition that makes MongoDB throw this strange
        // error message.  eg, the main thing is that if sort spec is {a: 1,
        // b:1} then a and b cannot both be arrays.
        //
        // (In MongoDB it seems to be OK to have {a: 1, 'a.x.y': 1} where 'a'
        // and 'a.x.y' are both arrays, but we don't allow this for now.
        // #NestedArraySort
        // XXX achieve full compatibility here

        if (knownPaths && !hasOwn.call(knownPaths, path)) {
          throw Error('cannot index parallel arrays');
        }
      });

      if (knownPaths) {
        // Similarly to above, paths must match everywhere, unless this is a
        // non-array field.
        if (!hasOwn.call(element, '') && Object.keys(knownPaths).length !== Object.keys(element).length) {
          throw Error('cannot index parallel arrays!');
        }
      } else if (usedPaths) {
        knownPaths = {};
        Object.keys(element).forEach(path => {
          knownPaths[path] = true;
        });
      }

      return element;
    });

    if (!knownPaths) {
      // Easy case: no use of arrays.
      const soleKey = valuesByIndexAndPath.map(values => {
        if (!hasOwn.call(values, '')) {
          throw Error('no value in sole key case?');
        }

        return values[''];
      });
      cb(soleKey);
      return;
    }

    Object.keys(knownPaths).forEach(path => {
      const key = valuesByIndexAndPath.map(values => {
        if (hasOwn.call(values, '')) {
          return values[''];
        }

        if (!hasOwn.call(values, path)) {
          throw Error('missing path?');
        }

        return values[path];
      });
      cb(key);
    });
  } // Returns a comparator that represents the sort specification (but not
  // including a possible geoquery distance tie-breaker).


  _getBaseComparator() {
    if (this._sortFunction) {
      return this._sortFunction;
    } // If we're only sorting on geoquery distance and no specs, just say
    // everything is equal.


    if (!this._sortSpecParts.length) {
      return (doc1, doc2) => 0;
    }

    return (doc1, doc2) => {
      const key1 = this._getMinKeyFromDoc(doc1);

      const key2 = this._getMinKeyFromDoc(doc2);

      return this._compareKeys(key1, key2);
    };
  } // Finds the minimum key from the doc, according to the sort specs.  (We say
  // "minimum" here but this is with respect to the sort spec, so "descending"
  // sort fields mean we're finding the max for that field.)
  //
  // Note that this is NOT "find the minimum value of the first field, the
  // minimum value of the second field, etc"... it's "choose the
  // lexicographically minimum value of the key vector, allowing only keys which
  // you can find along the same paths".  ie, for a doc {a: [{x: 0, y: 5}, {x:
  // 1, y: 3}]} with sort spec {'a.x': 1, 'a.y': 1}, the only keys are [0,5] and
  // [1,3], and the minimum key is [0,5]; notably, [0,3] is NOT a key.


  _getMinKeyFromDoc(doc) {
    let minKey = null;

    this._generateKeysFromDoc(doc, key => {
      if (!this._keyCompatibleWithSelector(key)) {
        return;
      }

      if (minKey === null) {
        minKey = key;
        return;
      }

      if (this._compareKeys(key, minKey) < 0) {
        minKey = key;
      }
    }); // This could happen if our key filter somehow filters out all the keys even
    // though somehow the selector matches.


    if (minKey === null) {
      throw Error('sort selector found no keys in doc?');
    }

    return minKey;
  }

  _getPaths() {
    return this._sortSpecParts.map(part => part.path);
  }

  _keyCompatibleWithSelector(key) {
    return !this._keyFilter || this._keyFilter(key);
  } // Given an index 'i', returns a comparator that compares two key arrays based
  // on field 'i'.


  _keyFieldComparator(i) {
    const invert = !this._sortSpecParts[i].ascending;
    return (key1, key2) => {
      const compare = LocalCollection._f._cmp(key1[i], key2[i]);

      return invert ? -compare : compare;
    };
  } // In MongoDB, if you have documents
  //    {_id: 'x', a: [1, 10]} and
  //    {_id: 'y', a: [5, 15]},
  // then C.find({}, {sort: {a: 1}}) puts x before y (1 comes before 5).
  // But  C.find({a: {$gt: 3}}, {sort: {a: 1}}) puts y before x (1 does not
  // match the selector, and 5 comes before 10).
  //
  // The way this works is pretty subtle!  For example, if the documents
  // are instead {_id: 'x', a: [{x: 1}, {x: 10}]}) and
  //             {_id: 'y', a: [{x: 5}, {x: 15}]}),
  // then C.find({'a.x': {$gt: 3}}, {sort: {'a.x': 1}}) and
  //      C.find({a: {$elemMatch: {x: {$gt: 3}}}}, {sort: {'a.x': 1}})
  // both follow this rule (y before x).  (ie, you do have to apply this
  // through $elemMatch.)
  //
  // So if you pass a matcher to this sorter's constructor, we will attempt to
  // skip sort keys that don't match the selector. The logic here is pretty
  // subtle and undocumented; we've gotten as close as we can figure out based
  // on our understanding of Mongo's behavior.


  _useWithMatcher(matcher) {
    if (this._keyFilter) {
      throw Error('called _useWithMatcher twice?');
    } // If we are only sorting by distance, then we're not going to bother to
    // build a key filter.
    // XXX figure out how geoqueries interact with this stuff


    if (!this._sortSpecParts.length) {
      return;
    }

    const selector = matcher._selector; // If the user just passed a falsey selector to find(),
    // then we can't get a key filter from it.

    if (!selector) {
      return;
    } // If the user just passed a literal function to find(), then we can't get a
    // key filter from it.


    if (selector instanceof Function) {
      return;
    }

    const constraintsByPath = {};

    this._sortSpecParts.forEach(spec => {
      constraintsByPath[spec.path] = [];
    });

    Object.keys(selector).forEach(key => {
      const subSelector = selector[key]; // XXX support $and and $or

      const constraints = constraintsByPath[key];

      if (!constraints) {
        return;
      } // XXX it looks like the real MongoDB implementation isn't "does the
      // regexp match" but "does the value fall into a range named by the
      // literal prefix of the regexp", ie "foo" in /^foo(bar|baz)+/  But
      // "does the regexp match" is a good approximation.


      if (subSelector instanceof RegExp) {
        // As far as we can tell, using either of the options that both we and
        // MongoDB support ('i' and 'm') disables use of the key filter. This
        // makes sense: MongoDB mostly appears to be calculating ranges of an
        // index to use, which means it only cares about regexps that match
        // one range (with a literal prefix), and both 'i' and 'm' prevent the
        // literal prefix of the regexp from actually meaning one range.
        if (subSelector.ignoreCase || subSelector.multiline) {
          return;
        }

        constraints.push(regexpElementMatcher(subSelector));
        return;
      }

      if (isOperatorObject(subSelector)) {
        Object.keys(subSelector).forEach(operator => {
          const operand = subSelector[operator];

          if (['$lt', '$lte', '$gt', '$gte'].includes(operator)) {
            // XXX this depends on us knowing that these operators don't use any
            // of the arguments to compileElementSelector other than operand.
            constraints.push(ELEMENT_OPERATORS[operator].compileElementSelector(operand));
          } // See comments in the RegExp block above.


          if (operator === '$regex' && !subSelector.$options) {
            constraints.push(ELEMENT_OPERATORS.$regex.compileElementSelector(operand, subSelector));
          } // XXX support {$exists: true}, $mod, $type, $in, $elemMatch

        });
        return;
      } // OK, it's an equality thing.


      constraints.push(equalityElementMatcher(subSelector));
    }); // It appears that the first sort field is treated differently from the
    // others; we shouldn't create a key filter unless the first sort field is
    // restricted, though after that point we can restrict the other sort fields
    // or not as we wish.

    if (!constraintsByPath[this._sortSpecParts[0].path].length) {
      return;
    }

    this._keyFilter = key => this._sortSpecParts.every((specPart, index) => constraintsByPath[specPart.path].every(fn => fn(key[index])));
  }

}

// Given an array of comparators
// (functions (a,b)->(negative or positive or zero)), returns a single
// comparator which uses each comparator in order and returns the first
// non-zero value.
function composeComparators(comparatorArray) {
  return (a, b) => {
    for (let i = 0; i < comparatorArray.length; ++i) {
      const compare = comparatorArray[i](a, b);

      if (compare !== 0) {
        return compare;
      }
    }

    return 0;
  };
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/minimongo/minimongo_server.js");

/* Exports */
Package._define("minimongo", exports, {
  LocalCollection: LocalCollection,
  Minimongo: Minimongo,
  MinimongoTest: MinimongoTest,
  MinimongoError: MinimongoError
});

})();

//# sourceURL=meteor://💻app/packages/minimongo.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaW1vbmdvL21pbmltb25nb19zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9jb21tb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9jdXJzb3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9sb2NhbF9jb2xsZWN0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9taW5pbW9uZ28vbWF0Y2hlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaW1vbmdvL21pbmltb25nb19jb21tb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9vYnNlcnZlX2hhbmRsZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaW1vbmdvL3NvcnRlci5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJoYXNPd24iLCJpc051bWVyaWNLZXkiLCJpc09wZXJhdG9yT2JqZWN0IiwicGF0aHNUb1RyZWUiLCJwcm9qZWN0aW9uRGV0YWlscyIsInYiLCJNaW5pbW9uZ28iLCJfcGF0aHNFbGlkaW5nTnVtZXJpY0tleXMiLCJwYXRocyIsIm1hcCIsInBhdGgiLCJzcGxpdCIsImZpbHRlciIsInBhcnQiLCJqb2luIiwiTWF0Y2hlciIsInByb3RvdHlwZSIsImFmZmVjdGVkQnlNb2RpZmllciIsIm1vZGlmaWVyIiwiT2JqZWN0IiwiYXNzaWduIiwiJHNldCIsIiR1bnNldCIsIm1lYW5pbmdmdWxQYXRocyIsIl9nZXRQYXRocyIsIm1vZGlmaWVkUGF0aHMiLCJjb25jYXQiLCJrZXlzIiwic29tZSIsIm1vZCIsIm1lYW5pbmdmdWxQYXRoIiwic2VsIiwiaSIsImoiLCJsZW5ndGgiLCJjYW5CZWNvbWVUcnVlQnlNb2RpZmllciIsImlzU2ltcGxlIiwibW9kaWZpZXJQYXRocyIsInBhdGhIYXNOdW1lcmljS2V5cyIsImV4cGVjdGVkU2NhbGFySXNPYmplY3QiLCJfc2VsZWN0b3IiLCJtb2RpZmllclBhdGgiLCJzdGFydHNXaXRoIiwibWF0Y2hpbmdEb2N1bWVudCIsIkVKU09OIiwiY2xvbmUiLCJMb2NhbENvbGxlY3Rpb24iLCJfbW9kaWZ5IiwiZXJyb3IiLCJuYW1lIiwic2V0UHJvcGVydHlFcnJvciIsImRvY3VtZW50TWF0Y2hlcyIsInJlc3VsdCIsImNvbWJpbmVJbnRvUHJvamVjdGlvbiIsInByb2plY3Rpb24iLCJzZWxlY3RvclBhdGhzIiwiaW5jbHVkZXMiLCJjb21iaW5lSW1wb3J0YW50UGF0aHNJbnRvUHJvamVjdGlvbiIsIl9tYXRjaGluZ0RvY3VtZW50IiwidW5kZWZpbmVkIiwiZmFsbGJhY2siLCJ2YWx1ZVNlbGVjdG9yIiwiJGVxIiwiJGluIiwibWF0Y2hlciIsInBsYWNlaG9sZGVyIiwiZmluZCIsIm9ubHlDb250YWluc0tleXMiLCJsb3dlckJvdW5kIiwiSW5maW5pdHkiLCJ1cHBlckJvdW5kIiwiZm9yRWFjaCIsIm9wIiwiY2FsbCIsIm1pZGRsZSIsIngiLCJTb3J0ZXIiLCJfc2VsZWN0b3JGb3JBZmZlY3RlZEJ5TW9kaWZpZXIiLCJkZXRhaWxzIiwidHJlZSIsIm5vZGUiLCJmdWxsUGF0aCIsIm1lcmdlZFByb2plY3Rpb24iLCJ0cmVlVG9QYXRocyIsImluY2x1ZGluZyIsIm1lcmdlZEV4Y2xQcm9qZWN0aW9uIiwiZ2V0UGF0aHMiLCJzZWxlY3RvciIsIl9wYXRocyIsIm9iaiIsImV2ZXJ5IiwiayIsInByZWZpeCIsImtleSIsInZhbHVlIiwiZXhwb3J0IiwiRUxFTUVOVF9PUEVSQVRPUlMiLCJjb21waWxlRG9jdW1lbnRTZWxlY3RvciIsImVxdWFsaXR5RWxlbWVudE1hdGNoZXIiLCJleHBhbmRBcnJheXNJbkJyYW5jaGVzIiwiaXNJbmRleGFibGUiLCJtYWtlTG9va3VwRnVuY3Rpb24iLCJub3RoaW5nTWF0Y2hlciIsInBvcHVsYXRlRG9jdW1lbnRXaXRoUXVlcnlGaWVsZHMiLCJyZWdleHBFbGVtZW50TWF0Y2hlciIsImRlZmF1bHQiLCJoYXNPd25Qcm9wZXJ0eSIsIiRsdCIsIm1ha2VJbmVxdWFsaXR5IiwiY21wVmFsdWUiLCIkZ3QiLCIkbHRlIiwiJGd0ZSIsIiRtb2QiLCJjb21waWxlRWxlbWVudFNlbGVjdG9yIiwib3BlcmFuZCIsIkFycmF5IiwiaXNBcnJheSIsIkVycm9yIiwiZGl2aXNvciIsInJlbWFpbmRlciIsImVsZW1lbnRNYXRjaGVycyIsIm9wdGlvbiIsIlJlZ0V4cCIsIiRzaXplIiwiZG9udEV4cGFuZExlYWZBcnJheXMiLCIkdHlwZSIsImRvbnRJbmNsdWRlTGVhZkFycmF5cyIsIm9wZXJhbmRBbGlhc01hcCIsIl9mIiwiX3R5cGUiLCIkYml0c0FsbFNldCIsIm1hc2siLCJnZXRPcGVyYW5kQml0bWFzayIsImJpdG1hc2siLCJnZXRWYWx1ZUJpdG1hc2siLCJieXRlIiwiJGJpdHNBbnlTZXQiLCIkYml0c0FsbENsZWFyIiwiJGJpdHNBbnlDbGVhciIsIiRyZWdleCIsInJlZ2V4cCIsIiRvcHRpb25zIiwidGVzdCIsInNvdXJjZSIsIiRlbGVtTWF0Y2giLCJfaXNQbGFpbk9iamVjdCIsImlzRG9jTWF0Y2hlciIsIkxPR0lDQUxfT1BFUkFUT1JTIiwicmVkdWNlIiwiYSIsImIiLCJzdWJNYXRjaGVyIiwiaW5FbGVtTWF0Y2giLCJjb21waWxlVmFsdWVTZWxlY3RvciIsImFycmF5RWxlbWVudCIsImFyZyIsImRvbnRJdGVyYXRlIiwiJGFuZCIsInN1YlNlbGVjdG9yIiwiYW5kRG9jdW1lbnRNYXRjaGVycyIsImNvbXBpbGVBcnJheU9mRG9jdW1lbnRTZWxlY3RvcnMiLCIkb3IiLCJtYXRjaGVycyIsImRvYyIsImZuIiwiJG5vciIsIiR3aGVyZSIsInNlbGVjdG9yVmFsdWUiLCJfcmVjb3JkUGF0aFVzZWQiLCJfaGFzV2hlcmUiLCJGdW5jdGlvbiIsIiRjb21tZW50IiwiVkFMVUVfT1BFUkFUT1JTIiwiY29udmVydEVsZW1lbnRNYXRjaGVyVG9CcmFuY2hlZE1hdGNoZXIiLCIkbm90IiwiaW52ZXJ0QnJhbmNoZWRNYXRjaGVyIiwiJG5lIiwiJG5pbiIsIiRleGlzdHMiLCJleGlzdHMiLCJldmVyeXRoaW5nTWF0Y2hlciIsIiRtYXhEaXN0YW5jZSIsIiRuZWFyIiwiJGFsbCIsImJyYW5jaGVkTWF0Y2hlcnMiLCJjcml0ZXJpb24iLCJhbmRCcmFuY2hlZE1hdGNoZXJzIiwiaXNSb290IiwiX2hhc0dlb1F1ZXJ5IiwibWF4RGlzdGFuY2UiLCJwb2ludCIsImRpc3RhbmNlIiwiJGdlb21ldHJ5IiwidHlwZSIsIkdlb0pTT04iLCJwb2ludERpc3RhbmNlIiwiY29vcmRpbmF0ZXMiLCJwb2ludFRvQXJyYXkiLCJnZW9tZXRyeVdpdGhpblJhZGl1cyIsImRpc3RhbmNlQ29vcmRpbmF0ZVBhaXJzIiwiYnJhbmNoZWRWYWx1ZXMiLCJicmFuY2giLCJjdXJEaXN0YW5jZSIsIl9pc1VwZGF0ZSIsImFycmF5SW5kaWNlcyIsImFuZFNvbWVNYXRjaGVycyIsInN1Yk1hdGNoZXJzIiwiZG9jT3JCcmFuY2hlcyIsIm1hdGNoIiwic3ViUmVzdWx0Iiwic2VsZWN0b3JzIiwiZG9jU2VsZWN0b3IiLCJvcHRpb25zIiwiZG9jTWF0Y2hlcnMiLCJzdWJzdHIiLCJfaXNTaW1wbGUiLCJsb29rVXBCeUluZGV4IiwidmFsdWVNYXRjaGVyIiwiQm9vbGVhbiIsIm9wZXJhdG9yQnJhbmNoZWRNYXRjaGVyIiwiZWxlbWVudE1hdGNoZXIiLCJicmFuY2hlcyIsImV4cGFuZGVkIiwiZWxlbWVudCIsIm1hdGNoZWQiLCJwb2ludEEiLCJwb2ludEIiLCJNYXRoIiwiaHlwb3QiLCJlbGVtZW50U2VsZWN0b3IiLCJfZXF1YWwiLCJkb2NPckJyYW5jaGVkVmFsdWVzIiwic2tpcFRoZUFycmF5cyIsImJyYW5jaGVzT3V0IiwidGhpc0lzQXJyYXkiLCJwdXNoIiwiTnVtYmVyIiwiaXNJbnRlZ2VyIiwiVWludDhBcnJheSIsIkludDMyQXJyYXkiLCJidWZmZXIiLCJpc0JpbmFyeSIsIkFycmF5QnVmZmVyIiwibWF4IiwidmlldyIsImlzU2FmZUludGVnZXIiLCJVaW50MzJBcnJheSIsIkJZVEVTX1BFUl9FTEVNRU5UIiwiaW5zZXJ0SW50b0RvY3VtZW50IiwiZG9jdW1lbnQiLCJleGlzdGluZ0tleSIsImluZGV4T2YiLCJicmFuY2hlZE1hdGNoZXIiLCJicmFuY2hWYWx1ZXMiLCJzIiwiaW5jb25zaXN0ZW50T0siLCJ0aGVzZUFyZU9wZXJhdG9ycyIsInNlbEtleSIsInRoaXNJc09wZXJhdG9yIiwiSlNPTiIsInN0cmluZ2lmeSIsImNtcFZhbHVlQ29tcGFyYXRvciIsIm9wZXJhbmRUeXBlIiwiX2NtcCIsInBhcnRzIiwiZmlyc3RQYXJ0IiwibG9va3VwUmVzdCIsInNsaWNlIiwib21pdFVubmVjZXNzYXJ5RmllbGRzIiwiZmlyc3RMZXZlbCIsImFwcGVuZFRvUmVzdWx0IiwibW9yZSIsImZvclNvcnQiLCJhcnJheUluZGV4IiwiTWluaW1vbmdvVGVzdCIsIk1pbmltb25nb0Vycm9yIiwibWVzc2FnZSIsImZpZWxkIiwib3BlcmF0b3JNYXRjaGVycyIsIm9wZXJhdG9yIiwic2ltcGxlUmFuZ2UiLCJzaW1wbGVFcXVhbGl0eSIsInNpbXBsZUluY2x1c2lvbiIsIm5ld0xlYWZGbiIsImNvbmZsaWN0Rm4iLCJyb290IiwicGF0aEFycmF5Iiwic3VjY2VzcyIsImxhc3RLZXkiLCJ5IiwicG9wdWxhdGVEb2N1bWVudFdpdGhLZXlWYWx1ZSIsImdldFByb3RvdHlwZU9mIiwicG9wdWxhdGVEb2N1bWVudFdpdGhPYmplY3QiLCJ1bnByZWZpeGVkS2V5cyIsInZhbGlkYXRlT2JqZWN0Iiwib2JqZWN0IiwicXVlcnkiLCJfc2VsZWN0b3JJc0lkIiwiZmllbGRzIiwiZmllbGRzS2V5cyIsInNvcnQiLCJfaWQiLCJrZXlQYXRoIiwicnVsZSIsInByb2plY3Rpb25SdWxlc1RyZWUiLCJjdXJyZW50UGF0aCIsImFub3RoZXJQYXRoIiwidG9TdHJpbmciLCJsYXN0SW5kZXgiLCJ2YWxpZGF0ZUtleUluUGF0aCIsIkN1cnNvciIsImNvbnN0cnVjdG9yIiwiY29sbGVjdGlvbiIsInNvcnRlciIsIl9zZWxlY3RvcklzSWRQZXJoYXBzQXNPYmplY3QiLCJfc2VsZWN0b3JJZCIsImhhc0dlb1F1ZXJ5Iiwic2tpcCIsImxpbWl0IiwiX3Byb2plY3Rpb25GbiIsIl9jb21waWxlUHJvamVjdGlvbiIsIl90cmFuc2Zvcm0iLCJ3cmFwVHJhbnNmb3JtIiwidHJhbnNmb3JtIiwiVHJhY2tlciIsInJlYWN0aXZlIiwiY291bnQiLCJhcHBseVNraXBMaW1pdCIsIl9kZXBlbmQiLCJhZGRlZCIsInJlbW92ZWQiLCJfZ2V0UmF3T2JqZWN0cyIsIm9yZGVyZWQiLCJmZXRjaCIsIlN5bWJvbCIsIml0ZXJhdG9yIiwiYWRkZWRCZWZvcmUiLCJjaGFuZ2VkIiwibW92ZWRCZWZvcmUiLCJpbmRleCIsIm9iamVjdHMiLCJuZXh0IiwiZG9uZSIsImNhbGxiYWNrIiwidGhpc0FyZyIsImdldFRyYW5zZm9ybSIsIm9ic2VydmUiLCJfb2JzZXJ2ZUZyb21PYnNlcnZlQ2hhbmdlcyIsIm9ic2VydmVDaGFuZ2VzIiwiX29ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzQXJlT3JkZXJlZCIsIl9hbGxvd191bm9yZGVyZWQiLCJkaXN0YW5jZXMiLCJfSWRNYXAiLCJjdXJzb3IiLCJkaXJ0eSIsInByb2plY3Rpb25GbiIsInJlc3VsdHNTbmFwc2hvdCIsInFpZCIsIm5leHRfcWlkIiwicXVlcmllcyIsInJlc3VsdHMiLCJwYXVzZWQiLCJ3cmFwQ2FsbGJhY2siLCJzZWxmIiwiYXJncyIsImFyZ3VtZW50cyIsIl9vYnNlcnZlUXVldWUiLCJxdWV1ZVRhc2siLCJhcHBseSIsIl9zdXBwcmVzc19pbml0aWFsIiwiX21hcCIsImhhbmRsZSIsIk9ic2VydmVIYW5kbGUiLCJzdG9wIiwiYWN0aXZlIiwib25JbnZhbGlkYXRlIiwiZHJhaW4iLCJyZXdpbmQiLCJjaGFuZ2VycyIsImRlcGVuZGVuY3kiLCJEZXBlbmRlbmN5Iiwibm90aWZ5IiwiYmluZCIsImRlcGVuZCIsIl9nZXRDb2xsZWN0aW9uTmFtZSIsInNlbGVjdGVkRG9jIiwiX2RvY3MiLCJnZXQiLCJzZXQiLCJjbGVhciIsImlkIiwibWF0Y2hSZXN1bHQiLCJnZXRDb21wYXJhdG9yIiwiX3B1Ymxpc2hDdXJzb3IiLCJzdWJzY3JpcHRpb24iLCJQYWNrYWdlIiwibW9uZ28iLCJNb25nbyIsIkNvbGxlY3Rpb24iLCJNZXRlb3IiLCJfU3luY2hyb25vdXNRdWV1ZSIsImNyZWF0ZSIsIl9zYXZlZE9yaWdpbmFscyIsImZpbmRPbmUiLCJpbnNlcnQiLCJhc3NlcnRIYXNWYWxpZEZpZWxkTmFtZXMiLCJfdXNlT0lEIiwiTW9uZ29JRCIsIk9iamVjdElEIiwiUmFuZG9tIiwiaGFzIiwiX3NhdmVPcmlnaW5hbCIsInF1ZXJpZXNUb1JlY29tcHV0ZSIsIl9pbnNlcnRJblJlc3VsdHMiLCJfcmVjb21wdXRlUmVzdWx0cyIsImRlZmVyIiwicGF1c2VPYnNlcnZlcnMiLCJyZW1vdmUiLCJlcXVhbHMiLCJzaXplIiwiX2VhY2hQb3NzaWJseU1hdGNoaW5nRG9jIiwicXVlcnlSZW1vdmUiLCJyZW1vdmVJZCIsInJlbW92ZURvYyIsIl9yZW1vdmVGcm9tUmVzdWx0cyIsInJlc3VtZU9ic2VydmVycyIsIl9kaWZmUXVlcnlDaGFuZ2VzIiwicmV0cmlldmVPcmlnaW5hbHMiLCJvcmlnaW5hbHMiLCJzYXZlT3JpZ2luYWxzIiwidXBkYXRlIiwicWlkVG9PcmlnaW5hbFJlc3VsdHMiLCJkb2NNYXAiLCJpZHNNYXRjaGVkIiwiX2lkc01hdGNoZWRCeVNlbGVjdG9yIiwibWVtb2l6ZWRDbG9uZUlmTmVlZGVkIiwiZG9jVG9NZW1vaXplIiwicmVjb21wdXRlUWlkcyIsInVwZGF0ZUNvdW50IiwicXVlcnlSZXN1bHQiLCJfbW9kaWZ5QW5kTm90aWZ5IiwibXVsdGkiLCJpbnNlcnRlZElkIiwidXBzZXJ0IiwiX2NyZWF0ZVVwc2VydERvY3VtZW50IiwiX3JldHVybk9iamVjdCIsIm51bWJlckFmZmVjdGVkIiwic3BlY2lmaWNJZHMiLCJtYXRjaGVkX2JlZm9yZSIsIm9sZF9kb2MiLCJhZnRlck1hdGNoIiwiYWZ0ZXIiLCJiZWZvcmUiLCJfdXBkYXRlSW5SZXN1bHRzIiwib2xkUmVzdWx0cyIsIl9DYWNoaW5nQ2hhbmdlT2JzZXJ2ZXIiLCJvcmRlcmVkRnJvbUNhbGxiYWNrcyIsImNhbGxiYWNrcyIsImRvY3MiLCJPcmRlcmVkRGljdCIsImlkU3RyaW5naWZ5IiwiYXBwbHlDaGFuZ2UiLCJwdXRCZWZvcmUiLCJtb3ZlQmVmb3JlIiwiRGlmZlNlcXVlbmNlIiwiYXBwbHlDaGFuZ2VzIiwiSWRNYXAiLCJpZFBhcnNlIiwiX193cmFwcGVkVHJhbnNmb3JtX18iLCJ3cmFwcGVkIiwidHJhbnNmb3JtZWQiLCJub25yZWFjdGl2ZSIsIl9iaW5hcnlTZWFyY2giLCJjbXAiLCJhcnJheSIsImZpcnN0IiwicmFuZ2UiLCJoYWxmUmFuZ2UiLCJmbG9vciIsIl9jaGVja1N1cHBvcnRlZFByb2plY3Rpb24iLCJfaWRQcm9qZWN0aW9uIiwicnVsZVRyZWUiLCJzdWJkb2MiLCJzZWxlY3RvckRvY3VtZW50IiwiaXNNb2RpZnkiLCJfaXNNb2RpZmljYXRpb25Nb2QiLCJuZXdEb2MiLCJpc0luc2VydCIsInJlcGxhY2VtZW50IiwiX2RpZmZPYmplY3RzIiwibGVmdCIsInJpZ2h0IiwiZGlmZk9iamVjdHMiLCJuZXdSZXN1bHRzIiwib2JzZXJ2ZXIiLCJkaWZmUXVlcnlDaGFuZ2VzIiwiX2RpZmZRdWVyeU9yZGVyZWRDaGFuZ2VzIiwiZGlmZlF1ZXJ5T3JkZXJlZENoYW5nZXMiLCJfZGlmZlF1ZXJ5VW5vcmRlcmVkQ2hhbmdlcyIsImRpZmZRdWVyeVVub3JkZXJlZENoYW5nZXMiLCJfZmluZEluT3JkZXJlZFJlc3VsdHMiLCJzdWJJZHMiLCJfaW5zZXJ0SW5Tb3J0ZWRMaXN0Iiwic3BsaWNlIiwiaXNSZXBsYWNlIiwiaXNNb2RpZmllciIsInNldE9uSW5zZXJ0IiwibW9kRnVuYyIsIk1PRElGSUVSUyIsImtleXBhdGgiLCJrZXlwYXJ0cyIsInRhcmdldCIsImZpbmRNb2RUYXJnZXQiLCJmb3JiaWRBcnJheSIsIm5vQ3JlYXRlIiwiTk9fQ1JFQVRFX01PRElGSUVSUyIsInBvcCIsIm9ic2VydmVDYWxsYmFja3MiLCJzdXBwcmVzc2VkIiwib2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3MiLCJfb2JzZXJ2ZUNhbGxiYWNrc0FyZU9yZGVyZWQiLCJpbmRpY2VzIiwiX25vX2luZGljZXMiLCJhZGRlZEF0IiwiY2hhbmdlZEF0Iiwib2xkRG9jIiwibW92ZWRUbyIsImZyb20iLCJ0byIsInJlbW92ZWRBdCIsImNoYW5nZU9ic2VydmVyIiwiY2hhbmdlZEZpZWxkcyIsIm1ha2VDaGFuZ2VkRmllbGRzIiwib2xkX2lkeCIsIm5ld19pZHgiLCIkY3VycmVudERhdGUiLCJEYXRlIiwiJG1pbiIsIiRtYXgiLCIkaW5jIiwiJHNldE9uSW5zZXJ0IiwiJHB1c2giLCIkZWFjaCIsInRvUHVzaCIsInBvc2l0aW9uIiwiJHBvc2l0aW9uIiwiJHNsaWNlIiwic29ydEZ1bmN0aW9uIiwiJHNvcnQiLCJzcGxpY2VBcmd1bWVudHMiLCIkcHVzaEFsbCIsIiRhZGRUb1NldCIsImlzRWFjaCIsInZhbHVlcyIsInRvQWRkIiwiJHBvcCIsInRvUG9wIiwiJHB1bGwiLCJ0b1B1bGwiLCJvdXQiLCIkcHVsbEFsbCIsIiRyZW5hbWUiLCJ0YXJnZXQyIiwiJGJpdCIsImludmFsaWRDaGFyTXNnIiwiJCIsImFzc2VydElzVmFsaWRGaWVsZE5hbWUiLCJ1c2VkQXJyYXlJbmRleCIsImxhc3QiLCJrZXlwYXJ0IiwicGFyc2VJbnQiLCJpc1VwZGF0ZSIsIl9kb2NNYXRjaGVyIiwiX2NvbXBpbGVTZWxlY3RvciIsImhhc1doZXJlIiwia2V5T3JkZXJTZW5zaXRpdmUiLCJfdHlwZW9yZGVyIiwidCIsInRhIiwidGIiLCJvYSIsIm9iIiwidG9IZXhTdHJpbmciLCJnZXRUaW1lIiwidG9BcnJheSIsIkxvY2FsQ29sbGVjdGlvbl8iLCJzcGVjIiwiX3NvcnRTcGVjUGFydHMiLCJfc29ydEZ1bmN0aW9uIiwiYWRkU3BlY1BhcnQiLCJhc2NlbmRpbmciLCJjaGFyQXQiLCJsb29rdXAiLCJfa2V5Q29tcGFyYXRvciIsImNvbXBvc2VDb21wYXJhdG9ycyIsIl9rZXlGaWVsZENvbXBhcmF0b3IiLCJfa2V5RmlsdGVyIiwiX3VzZVdpdGhNYXRjaGVyIiwiX2dldEJhc2VDb21wYXJhdG9yIiwiX2NvbXBhcmVLZXlzIiwia2V5MSIsImtleTIiLCJfZ2VuZXJhdGVLZXlzRnJvbURvYyIsImNiIiwicGF0aEZyb21JbmRpY2VzIiwia25vd25QYXRocyIsInZhbHVlc0J5SW5kZXhBbmRQYXRoIiwidXNlZFBhdGhzIiwic29sZUtleSIsImRvYzEiLCJkb2MyIiwiX2dldE1pbktleUZyb21Eb2MiLCJtaW5LZXkiLCJfa2V5Q29tcGF0aWJsZVdpdGhTZWxlY3RvciIsImludmVydCIsImNvbXBhcmUiLCJjb25zdHJhaW50c0J5UGF0aCIsImNvbnN0cmFpbnRzIiwiaWdub3JlQ2FzZSIsIm11bHRpbGluZSIsInNwZWNQYXJ0IiwiY29tcGFyYXRvckFycmF5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSx1QkFBUixDQUFiO0FBQStDLElBQUlDLE1BQUosRUFBV0MsWUFBWCxFQUF3QkMsZ0JBQXhCLEVBQXlDQyxXQUF6QyxFQUFxREMsaUJBQXJEO0FBQXVFUCxPQUFPQyxLQUFQLENBQWFDLFFBQVEsYUFBUixDQUFiLEVBQW9DO0FBQUNDLFNBQU9LLENBQVAsRUFBUztBQUFDTCxhQUFPSyxDQUFQO0FBQVMsR0FBcEI7O0FBQXFCSixlQUFhSSxDQUFiLEVBQWU7QUFBQ0osbUJBQWFJLENBQWI7QUFBZSxHQUFwRDs7QUFBcURILG1CQUFpQkcsQ0FBakIsRUFBbUI7QUFBQ0gsdUJBQWlCRyxDQUFqQjtBQUFtQixHQUE1Rjs7QUFBNkZGLGNBQVlFLENBQVosRUFBYztBQUFDRixrQkFBWUUsQ0FBWjtBQUFjLEdBQTFIOztBQUEySEQsb0JBQWtC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Q0FBdEIsQ0FBaEI7O0FBQ0EsVUFBSWlkLFlBQVksQ0FBaEIsRUFBbUI7QUFDakIsZUFBT0EsT0FBUDtBQUNEO0FBQ0Y7O0FBRUQsV0FBTyxDQUFQO0FBQ0QsR0FURDtBQVVELEMiLCJmaWxlIjoiL3BhY2thZ2VzL21pbmltb25nby5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnLi9taW5pbW9uZ29fY29tbW9uLmpzJztcbmltcG9ydCB7XG4gIGhhc093bixcbiAgaXNOdW1lcmljS2V5LFxuICBpc09wZXJhdG9yT2JqZWN0LFxuICBwYXRoc1RvVHJlZSxcbiAgcHJvamVjdGlvbkRldGFpbHMsXG59IGZyb20gJy4vY29tbW9uLmpzJztcblxuTWluaW1vbmdvLl9wYXRoc0VsaWRpbmdOdW1lcmljS2V5cyA9IHBhdGhzID0+IHBhdGhzLm1hcChwYXRoID0+XG4gIHBhdGguc3BsaXQoJy4nKS5maWx0ZXIocGFydCA9PiAhaXNOdW1lcmljS2V5KHBhcnQpKS5qb2luKCcuJylcbik7XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiB0aGUgbW9kaWZpZXIgYXBwbGllZCB0byBzb21lIGRvY3VtZW50IG1heSBjaGFuZ2UgdGhlIHJlc3VsdFxuLy8gb2YgbWF0Y2hpbmcgdGhlIGRvY3VtZW50IGJ5IHNlbGVjdG9yXG4vLyBUaGUgbW9kaWZpZXIgaXMgYWx3YXlzIGluIGEgZm9ybSBvZiBPYmplY3Q6XG4vLyAgLSAkc2V0XG4vLyAgICAtICdhLmIuMjIueic6IHZhbHVlXG4vLyAgICAtICdmb28uYmFyJzogNDJcbi8vICAtICR1bnNldFxuLy8gICAgLSAnYWJjLmQnOiAxXG5NaW5pbW9uZ28uTWF0Y2hlci5wcm90b3R5cGUuYWZmZWN0ZWRCeU1vZGlmaWVyID0gZnVuY3Rpb24obW9kaWZpZXIpIHtcbiAgLy8gc2FmZSBjaGVjayBmb3IgJHNldC8kdW5zZXQgYmVpbmcgb2JqZWN0c1xuICBtb2RpZmllciA9IE9iamVjdC5hc3NpZ24oeyRzZXQ6IHt9LCAkdW5zZXQ6IHt9fSwgbW9kaWZpZXIpO1xuXG4gIGNvbnN0IG1lYW5pbmdmdWxQYXRocyA9IHRoaXMuX2dldFBhdGhzKCk7XG4gIGNvbnN0IG1vZGlmaWVkUGF0aHMgPSBbXS5jb25jYXQoXG4gICAgT2JqZWN0LmtleXMobW9kaWZpZXIuJHNldCksXG4gICAgT2JqZWN0LmtleXMobW9kaWZpZXIuJHVuc2V0KVxuICApO1xuXG4gIHJldHVybiBtb2RpZmllZFBhdGhzLnNvbWUocGF0aCA9PiB7XG4gICAgY29uc3QgbW9kID0gcGF0aC5zcGxpdCgnLicpO1xuXG4gICAgcmV0dXJuIG1lYW5pbmdmdWxQYXRocy5zb21lKG1lYW5pbmdmdWxQYXRoID0+IHtcbiAgICAgIGNvbnN0IHNlbCA9IG1lYW5pbmdmdWxQYXRoLnNwbGl0KCcuJyk7XG5cbiAgICAgIGxldCBpID0gMCwgaiA9IDA7XG5cbiAgICAgIHdoaWxlIChpIDwgc2VsLmxlbmd0aCAmJiBqIDwgbW9kLmxlbmd0aCkge1xuICAgICAgICBpZiAoaXNOdW1lcmljS2V5KHNlbFtpXSkgJiYgaXNOdW1lcmljS2V5KG1vZFtqXSkpIHtcbiAgICAgICAgICAvLyBmb28uNC5iYXIgc2VsZWN0b3IgYWZmZWN0ZWQgYnkgZm9vLjQgbW9kaWZpZXJcbiAgICAgICAgICAvLyBmb28uMy5iYXIgc2VsZWN0b3IgdW5hZmZlY3RlZCBieSBmb28uNCBtb2RpZmllclxuICAgICAgICAgIGlmIChzZWxbaV0gPT09IG1vZFtqXSkge1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgaisrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlzTnVtZXJpY0tleShzZWxbaV0pKSB7XG4gICAgICAgICAgLy8gZm9vLjQuYmFyIHNlbGVjdG9yIHVuYWZmZWN0ZWQgYnkgZm9vLmJhciBtb2RpZmllclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIGlmIChpc051bWVyaWNLZXkobW9kW2pdKSkge1xuICAgICAgICAgIGorKztcbiAgICAgICAgfSBlbHNlIGlmIChzZWxbaV0gPT09IG1vZFtqXSkge1xuICAgICAgICAgIGkrKztcbiAgICAgICAgICBqKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIE9uZSBpcyBhIHByZWZpeCBvZiBhbm90aGVyLCB0YWtpbmcgbnVtZXJpYyBmaWVsZHMgaW50byBhY2NvdW50XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG4vLyBAcGFyYW0gbW9kaWZpZXIgLSBPYmplY3Q6IE1vbmdvREItc3R5bGVkIG1vZGlmaWVyIHdpdGggYCRzZXRgcyBhbmQgYCR1bnNldHNgXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ubHkuIChhc3N1bWVkIHRvIGNvbWUgZnJvbSBvcGxvZylcbi8vIEByZXR1cm5zIC0gQm9vbGVhbjogaWYgYWZ0ZXIgYXBwbHlpbmcgdGhlIG1vZGlmaWVyLCBzZWxlY3RvciBjYW4gc3RhcnRcbi8vICAgICAgICAgICAgICAgICAgICAgYWNjZXB0aW5nIHRoZSBtb2RpZmllZCB2YWx1ZS5cbi8vIE5PVEU6IGFzc3VtZXMgdGhhdCBkb2N1bWVudCBhZmZlY3RlZCBieSBtb2RpZmllciBkaWRuJ3QgbWF0Y2ggdGhpcyBNYXRjaGVyXG4vLyBiZWZvcmUsIHNvIGlmIG1vZGlmaWVyIGNhbid0IGNvbnZpbmNlIHNlbGVjdG9yIGluIGEgcG9zaXRpdmUgY2hhbmdlIGl0IHdvdWxkXG4vLyBzdGF5ICdmYWxzZScuXG4vLyBDdXJyZW50bHkgZG9lc24ndCBzdXBwb3J0ICQtb3BlcmF0b3JzIGFuZCBudW1lcmljIGluZGljZXMgcHJlY2lzZWx5LlxuTWluaW1vbmdvLk1hdGNoZXIucHJvdG90eXBlLmNhbkJlY29tZVRydWVCeU1vZGlmaWVyID0gZnVuY3Rpb24obW9kaWZpZXIpIHtcbiAgaWYgKCF0aGlzLmFmZmVjdGVkQnlNb2RpZmllcihtb2RpZmllcikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoIXRoaXMuaXNTaW1wbGUoKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgbW9kaWZpZXIgPSBPYmplY3QuYXNzaWduKHskc2V0OiB7fSwgJHVuc2V0OiB7fX0sIG1vZGlmaWVyKTtcblxuICBjb25zdCBtb2RpZmllclBhdGhzID0gW10uY29uY2F0KFxuICAgIE9iamVjdC5rZXlzKG1vZGlmaWVyLiRzZXQpLFxuICAgIE9iamVjdC5rZXlzKG1vZGlmaWVyLiR1bnNldClcbiAgKTtcblxuICBpZiAodGhpcy5fZ2V0UGF0aHMoKS5zb21lKHBhdGhIYXNOdW1lcmljS2V5cykgfHxcbiAgICAgIG1vZGlmaWVyUGF0aHMuc29tZShwYXRoSGFzTnVtZXJpY0tleXMpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBjaGVjayBpZiB0aGVyZSBpcyBhICRzZXQgb3IgJHVuc2V0IHRoYXQgaW5kaWNhdGVzIHNvbWV0aGluZyBpcyBhblxuICAvLyBvYmplY3QgcmF0aGVyIHRoYW4gYSBzY2FsYXIgaW4gdGhlIGFjdHVhbCBvYmplY3Qgd2hlcmUgd2Ugc2F3ICQtb3BlcmF0b3JcbiAgLy8gTk9URTogaXQgaXMgY29ycmVjdCBzaW5jZSB3ZSBhbGxvdyBvbmx5IHNjYWxhcnMgaW4gJC1vcGVyYXRvcnNcbiAgLy8gRXhhbXBsZTogZm9yIHNlbGVjdG9yIHsnYS5iJzogeyRndDogNX19IHRoZSBtb2RpZmllciB7J2EuYi5jJzo3fSB3b3VsZFxuICAvLyBkZWZpbml0ZWx5IHNldCB0aGUgcmVzdWx0IHRvIGZhbHNlIGFzICdhLmInIGFwcGVhcnMgdG8gYmUgYW4gb2JqZWN0LlxuICBjb25zdCBleHBlY3RlZFNjYWxhcklzT2JqZWN0ID0gT2JqZWN0LmtleXModGhpcy5fc2VsZWN0b3IpLnNvbWUocGF0aCA9PiB7XG4gICAgaWYgKCFpc09wZXJhdG9yT2JqZWN0KHRoaXMuX3NlbGVjdG9yW3BhdGhdKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBtb2RpZmllclBhdGhzLnNvbWUobW9kaWZpZXJQYXRoID0+XG4gICAgICBtb2RpZmllclBhdGguc3RhcnRzV2l0aChgJHtwYXRofS5gKVxuICAgICk7XG4gIH0pO1xuXG4gIGlmIChleHBlY3RlZFNjYWxhcklzT2JqZWN0KSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gU2VlIGlmIHdlIGNhbiBhcHBseSB0aGUgbW9kaWZpZXIgb24gdGhlIGlkZWFsbHkgbWF0Y2hpbmcgb2JqZWN0LiBJZiBpdFxuICAvLyBzdGlsbCBtYXRjaGVzIHRoZSBzZWxlY3RvciwgdGhlbiB0aGUgbW9kaWZpZXIgY291bGQgaGF2ZSB0dXJuZWQgdGhlIHJlYWxcbiAgLy8gb2JqZWN0IGluIHRoZSBkYXRhYmFzZSBpbnRvIHNvbWV0aGluZyBtYXRjaGluZy5cbiAgY29uc3QgbWF0Y2hpbmdEb2N1bWVudCA9IEVKU09OLmNsb25lKHRoaXMubWF0Y2hpbmdEb2N1bWVudCgpKTtcblxuICAvLyBUaGUgc2VsZWN0b3IgaXMgdG9vIGNvbXBsZXgsIGFueXRoaW5nIGNhbiBoYXBwZW4uXG4gIGlmIChtYXRjaGluZ0RvY3VtZW50ID09PSBudWxsKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICB0cnkge1xuICAgIExvY2FsQ29sbGVjdGlvbi5fbW9kaWZ5KG1hdGNoaW5nRG9jdW1lbnQsIG1vZGlmaWVyKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBDb3VsZG4ndCBzZXQgYSBwcm9wZXJ0eSBvbiBhIGZpZWxkIHdoaWNoIGlzIGEgc2NhbGFyIG9yIG51bGwgaW4gdGhlXG4gICAgLy8gc2VsZWN0b3IuXG4gICAgLy8gRXhhbXBsZTpcbiAgICAvLyByZWFsIGRvY3VtZW50OiB7ICdhLmInOiAzIH1cbiAgICAvLyBzZWxlY3RvcjogeyAnYSc6IDEyIH1cbiAgICAvLyBjb252ZXJ0ZWQgc2VsZWN0b3IgKGlkZWFsIGRvY3VtZW50KTogeyAnYSc6IDEyIH1cbiAgICAvLyBtb2RpZmllcjogeyAkc2V0OiB7ICdhLmInOiA0IH0gfVxuICAgIC8vIFdlIGRvbid0IGtub3cgd2hhdCByZWFsIGRvY3VtZW50IHdhcyBsaWtlIGJ1dCBmcm9tIHRoZSBlcnJvciByYWlzZWQgYnlcbiAgICAvLyAkc2V0IG9uIGEgc2NhbGFyIGZpZWxkIHdlIGNhbiByZWFzb24gdGhhdCB0aGUgc3RydWN0dXJlIG9mIHJlYWwgZG9jdW1lbnRcbiAgICAvLyBpcyBjb21wbGV0ZWx5IGRpZmZlcmVudC5cbiAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ01pbmltb25nb0Vycm9yJyAmJiBlcnJvci5zZXRQcm9wZXJ0eUVycm9yKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICByZXR1cm4gdGhpcy5kb2N1bWVudE1hdGNoZXMobWF0Y2hpbmdEb2N1bWVudCkucmVzdWx0O1xufTtcblxuLy8gS25vd3MgaG93IHRvIGNvbWJpbmUgYSBtb25nbyBzZWxlY3RvciBhbmQgYSBmaWVsZHMgcHJvamVjdGlvbiB0byBhIG5ldyBmaWVsZHNcbi8vIHByb2plY3Rpb24gdGFraW5nIGludG8gYWNjb3VudCBhY3RpdmUgZmllbGRzIGZyb20gdGhlIHBhc3NlZCBzZWxlY3Rvci5cbi8vIEByZXR1cm5zIE9iamVjdCAtIHByb2plY3Rpb24gb2JqZWN0IChzYW1lIGFzIGZpZWxkcyBvcHRpb24gb2YgbW9uZ28gY3Vyc29yKVxuTWluaW1vbmdvLk1hdGNoZXIucHJvdG90eXBlLmNvbWJpbmVJbnRvUHJvamVjdGlvbiA9IGZ1bmN0aW9uKHByb2plY3Rpb24pIHtcbiAgY29uc3Qgc2VsZWN0b3JQYXRocyA9IE1pbmltb25nby5fcGF0aHNFbGlkaW5nTnVtZXJpY0tleXModGhpcy5fZ2V0UGF0aHMoKSk7XG5cbiAgLy8gU3BlY2lhbCBjYXNlIGZvciAkd2hlcmUgb3BlcmF0b3IgaW4gdGhlIHNlbGVjdG9yIC0gcHJvamVjdGlvbiBzaG91bGQgZGVwZW5kXG4gIC8vIG9uIGFsbCBmaWVsZHMgb2YgdGhlIGRvY3VtZW50LiBnZXRTZWxlY3RvclBhdGhzIHJldHVybnMgYSBsaXN0IG9mIHBhdGhzXG4gIC8vIHNlbGVjdG9yIGRlcGVuZHMgb24uIElmIG9uZSBvZiB0aGUgcGF0aHMgaXMgJycgKGVtcHR5IHN0cmluZykgcmVwcmVzZW50aW5nXG4gIC8vIHRoZSByb290IG9yIHRoZSB3aG9sZSBkb2N1bWVudCwgY29tcGxldGUgcHJvamVjdGlvbiBzaG91bGQgYmUgcmV0dXJuZWQuXG4gIGlmIChzZWxlY3RvclBhdGhzLmluY2x1ZGVzKCcnKSkge1xuICAgIHJldHVybiB7fTtcbiAgfVxuXG4gIHJldHVybiBjb21iaW5lSW1wb3J0YW50UGF0aHNJbnRvUHJvamVjdGlvbihzZWxlY3RvclBhdGhzLCBwcm9qZWN0aW9uKTtcbn07XG5cbi8vIFJldHVybnMgYW4gb2JqZWN0IHRoYXQgd291bGQgbWF0Y2ggdGhlIHNlbGVjdG9yIGlmIHBvc3NpYmxlIG9yIG51bGwgaWYgdGhlXG4vLyBzZWxlY3RvciBpcyB0b28gY29tcGxleCBmb3IgdXMgdG8gYW5hbHl6ZVxuLy8geyAnYS5iJzogeyBhbnM6IDQyIH0sICdmb28uYmFyJzogbnVsbCwgJ2Zvby5iYXonOiBcInNvbWV0aGluZ1wiIH1cbi8vID0+IHsgYTogeyBiOiB7IGFuczogNDIgfSB9LCBmb286IHsgYmFyOiBudWxsLCBiYXo6IFwic29tZXRoaW5nXCIgfSB9XG5NaW5pbW9uZ28uTWF0Y2hlci5wcm90b3R5cGUubWF0Y2hpbmdEb2N1bWVudCA9IGZ1bmN0aW9uKCkge1xuICAvLyBjaGVjayBpZiBpdCB3YXMgY29tcHV0ZWQgYmVmb3JlXG4gIGlmICh0aGlzLl9tYXRjaGluZ0RvY3VtZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdGhpcy5fbWF0Y2hpbmdEb2N1bWVudDtcbiAgfVxuXG4gIC8vIElmIHRoZSBhbmFseXNpcyBvZiB0aGlzIHNlbGVjdG9yIGlzIHRvbyBoYXJkIGZvciBvdXIgaW1wbGVtZW50YXRpb25cbiAgLy8gZmFsbGJhY2sgdG8gXCJZRVNcIlxuICBsZXQgZmFsbGJhY2sgPSBmYWxzZTtcblxuICB0aGlzLl9tYXRjaGluZ0RvY3VtZW50ID0gcGF0aHNUb1RyZWUoXG4gICAgdGhpcy5fZ2V0UGF0aHMoKSxcbiAgICBwYXRoID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlU2VsZWN0b3IgPSB0aGlzLl9zZWxlY3RvcltwYXRoXTtcblxuICAgICAgaWYgKGlzT3BlcmF0b3JPYmplY3QodmFsdWVTZWxlY3RvcikpIHtcbiAgICAgICAgLy8gaWYgdGhlcmUgaXMgYSBzdHJpY3QgZXF1YWxpdHksIHRoZXJlIGlzIGEgZ29vZFxuICAgICAgICAvLyBjaGFuY2Ugd2UgY2FuIHVzZSBvbmUgb2YgdGhvc2UgYXMgXCJtYXRjaGluZ1wiXG4gICAgICAgIC8vIGR1bW15IHZhbHVlXG4gICAgICAgIGlmICh2YWx1ZVNlbGVjdG9yLiRlcSkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZVNlbGVjdG9yLiRlcTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2YWx1ZVNlbGVjdG9yLiRpbikge1xuICAgICAgICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoe3BsYWNlaG9sZGVyOiB2YWx1ZVNlbGVjdG9yfSk7XG5cbiAgICAgICAgICAvLyBSZXR1cm4gYW55dGhpbmcgZnJvbSAkaW4gdGhhdCBtYXRjaGVzIHRoZSB3aG9sZSBzZWxlY3RvciBmb3IgdGhpc1xuICAgICAgICAgIC8vIHBhdGguIElmIG5vdGhpbmcgbWF0Y2hlcywgcmV0dXJucyBgdW5kZWZpbmVkYCBhcyBub3RoaW5nIGNhbiBtYWtlXG4gICAgICAgICAgLy8gdGhpcyBzZWxlY3RvciBpbnRvIGB0cnVlYC5cbiAgICAgICAgICByZXR1cm4gdmFsdWVTZWxlY3Rvci4kaW4uZmluZChwbGFjZWhvbGRlciA9PlxuICAgICAgICAgICAgbWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoe3BsYWNlaG9sZGVyfSkucmVzdWx0XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvbmx5Q29udGFpbnNLZXlzKHZhbHVlU2VsZWN0b3IsIFsnJGd0JywgJyRndGUnLCAnJGx0JywgJyRsdGUnXSkpIHtcbiAgICAgICAgICBsZXQgbG93ZXJCb3VuZCA9IC1JbmZpbml0eTtcbiAgICAgICAgICBsZXQgdXBwZXJCb3VuZCA9IEluZmluaXR5O1xuXG4gICAgICAgICAgWyckbHRlJywgJyRsdCddLmZvckVhY2gob3AgPT4ge1xuICAgICAgICAgICAgaWYgKGhhc093bi5jYWxsKHZhbHVlU2VsZWN0b3IsIG9wKSAmJlxuICAgICAgICAgICAgICAgIHZhbHVlU2VsZWN0b3Jbb3BdIDwgdXBwZXJCb3VuZCkge1xuICAgICAgICAgICAgICB1cHBlckJvdW5kID0gdmFsdWVTZWxlY3RvcltvcF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBbJyRndGUnLCAnJGd0J10uZm9yRWFjaChvcCA9PiB7XG4gICAgICAgICAgICBpZiAoaGFzT3duLmNhbGwodmFsdWVTZWxlY3Rvciwgb3ApICYmXG4gICAgICAgICAgICAgICAgdmFsdWVTZWxlY3RvcltvcF0gPiBsb3dlckJvdW5kKSB7XG4gICAgICAgICAgICAgIGxvd2VyQm91bmQgPSB2YWx1ZVNlbGVjdG9yW29wXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGNvbnN0IG1pZGRsZSA9IChsb3dlckJvdW5kICsgdXBwZXJCb3VuZCkgLyAyO1xuICAgICAgICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoe3BsYWNlaG9sZGVyOiB2YWx1ZVNlbGVjdG9yfSk7XG5cbiAgICAgICAgICBpZiAoIW1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKHtwbGFjZWhvbGRlcjogbWlkZGxlfSkucmVzdWx0ICYmXG4gICAgICAgICAgICAgIChtaWRkbGUgPT09IGxvd2VyQm91bmQgfHwgbWlkZGxlID09PSB1cHBlckJvdW5kKSkge1xuICAgICAgICAgICAgZmFsbGJhY2sgPSB0cnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBtaWRkbGU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob25seUNvbnRhaW5zS2V5cyh2YWx1ZVNlbGVjdG9yLCBbJyRuaW4nLCAnJG5lJ10pKSB7XG4gICAgICAgICAgLy8gU2luY2UgdGhpcy5faXNTaW1wbGUgbWFrZXMgc3VyZSAkbmluIGFuZCAkbmUgYXJlIG5vdCBjb21iaW5lZCB3aXRoXG4gICAgICAgICAgLy8gb2JqZWN0cyBvciBhcnJheXMsIHdlIGNhbiBjb25maWRlbnRseSByZXR1cm4gYW4gZW1wdHkgb2JqZWN0IGFzIGl0XG4gICAgICAgICAgLy8gbmV2ZXIgbWF0Y2hlcyBhbnkgc2NhbGFyLlxuICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZhbGxiYWNrID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuX3NlbGVjdG9yW3BhdGhdO1xuICAgIH0sXG4gICAgeCA9PiB4KTtcblxuICBpZiAoZmFsbGJhY2spIHtcbiAgICB0aGlzLl9tYXRjaGluZ0RvY3VtZW50ID0gbnVsbDtcbiAgfVxuXG4gIHJldHVybiB0aGlzLl9tYXRjaGluZ0RvY3VtZW50O1xufTtcblxuLy8gTWluaW1vbmdvLlNvcnRlciBnZXRzIGEgc2ltaWxhciBtZXRob2QsIHdoaWNoIGRlbGVnYXRlcyB0byBhIE1hdGNoZXIgaXQgbWFkZVxuLy8gZm9yIHRoaXMgZXhhY3QgcHVycG9zZS5cbk1pbmltb25nby5Tb3J0ZXIucHJvdG90eXBlLmFmZmVjdGVkQnlNb2RpZmllciA9IGZ1bmN0aW9uKG1vZGlmaWVyKSB7XG4gIHJldHVybiB0aGlzLl9zZWxlY3RvckZvckFmZmVjdGVkQnlNb2RpZmllci5hZmZlY3RlZEJ5TW9kaWZpZXIobW9kaWZpZXIpO1xufTtcblxuTWluaW1vbmdvLlNvcnRlci5wcm90b3R5cGUuY29tYmluZUludG9Qcm9qZWN0aW9uID0gZnVuY3Rpb24ocHJvamVjdGlvbikge1xuICByZXR1cm4gY29tYmluZUltcG9ydGFudFBhdGhzSW50b1Byb2plY3Rpb24oXG4gICAgTWluaW1vbmdvLl9wYXRoc0VsaWRpbmdOdW1lcmljS2V5cyh0aGlzLl9nZXRQYXRocygpKSxcbiAgICBwcm9qZWN0aW9uXG4gICk7XG59O1xuXG5mdW5jdGlvbiBjb21iaW5lSW1wb3J0YW50UGF0aHNJbnRvUHJvamVjdGlvbihwYXRocywgcHJvamVjdGlvbikge1xuICBjb25zdCBkZXRhaWxzID0gcHJvamVjdGlvbkRldGFpbHMocHJvamVjdGlvbik7XG5cbiAgLy8gbWVyZ2UgdGhlIHBhdGhzIHRvIGluY2x1ZGVcbiAgY29uc3QgdHJlZSA9IHBhdGhzVG9UcmVlKFxuICAgIHBhdGhzLFxuICAgIHBhdGggPT4gdHJ1ZSxcbiAgICAobm9kZSwgcGF0aCwgZnVsbFBhdGgpID0+IHRydWUsXG4gICAgZGV0YWlscy50cmVlXG4gICk7XG4gIGNvbnN0IG1lcmdlZFByb2plY3Rpb24gPSB0cmVlVG9QYXRocyh0cmVlKTtcblxuICBpZiAoZGV0YWlscy5pbmNsdWRpbmcpIHtcbiAgICAvLyBib3RoIHNlbGVjdG9yIGFuZCBwcm9qZWN0aW9uIGFyZSBwb2ludGluZyBvbiBmaWVsZHMgdG8gaW5jbHVkZVxuICAgIC8vIHNvIHdlIGNhbiBqdXN0IHJldHVybiB0aGUgbWVyZ2VkIHRyZWVcbiAgICByZXR1cm4gbWVyZ2VkUHJvamVjdGlvbjtcbiAgfVxuXG4gIC8vIHNlbGVjdG9yIGlzIHBvaW50aW5nIGF0IGZpZWxkcyB0byBpbmNsdWRlXG4gIC8vIHByb2plY3Rpb24gaXMgcG9pbnRpbmcgYXQgZmllbGRzIHRvIGV4Y2x1ZGVcbiAgLy8gbWFrZSBzdXJlIHdlIGRvbid0IGV4Y2x1ZGUgaW1wb3J0YW50IHBhdGhzXG4gIGNvbnN0IG1lcmdlZEV4Y2xQcm9qZWN0aW9uID0ge307XG5cbiAgT2JqZWN0LmtleXMobWVyZ2VkUHJvamVjdGlvbikuZm9yRWFjaChwYXRoID0+IHtcbiAgICBpZiAoIW1lcmdlZFByb2plY3Rpb25bcGF0aF0pIHtcbiAgICAgIG1lcmdlZEV4Y2xQcm9qZWN0aW9uW3BhdGhdID0gZmFsc2U7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gbWVyZ2VkRXhjbFByb2plY3Rpb247XG59XG5cbmZ1bmN0aW9uIGdldFBhdGhzKHNlbGVjdG9yKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhuZXcgTWluaW1vbmdvLk1hdGNoZXIoc2VsZWN0b3IpLl9wYXRocyk7XG5cbiAgLy8gWFhYIHJlbW92ZSBpdD9cbiAgLy8gcmV0dXJuIE9iamVjdC5rZXlzKHNlbGVjdG9yKS5tYXAoayA9PiB7XG4gIC8vICAgLy8gd2UgZG9uJ3Qga25vdyBob3cgdG8gaGFuZGxlICR3aGVyZSBiZWNhdXNlIGl0IGNhbiBiZSBhbnl0aGluZ1xuICAvLyAgIGlmIChrID09PSAnJHdoZXJlJykge1xuICAvLyAgICAgcmV0dXJuICcnOyAvLyBtYXRjaGVzIGV2ZXJ5dGhpbmdcbiAgLy8gICB9XG5cbiAgLy8gICAvLyB3ZSBicmFuY2ggZnJvbSAkb3IvJGFuZC8kbm9yIG9wZXJhdG9yXG4gIC8vICAgaWYgKFsnJG9yJywgJyRhbmQnLCAnJG5vciddLmluY2x1ZGVzKGspKSB7XG4gIC8vICAgICByZXR1cm4gc2VsZWN0b3Jba10ubWFwKGdldFBhdGhzKTtcbiAgLy8gICB9XG5cbiAgLy8gICAvLyB0aGUgdmFsdWUgaXMgYSBsaXRlcmFsIG9yIHNvbWUgY29tcGFyaXNvbiBvcGVyYXRvclxuICAvLyAgIHJldHVybiBrO1xuICAvLyB9KVxuICAvLyAgIC5yZWR1Y2UoKGEsIGIpID0+IGEuY29uY2F0KGIpLCBbXSlcbiAgLy8gICAuZmlsdGVyKChhLCBiLCBjKSA9PiBjLmluZGV4T2YoYSkgPT09IGIpO1xufVxuXG4vLyBBIGhlbHBlciB0byBlbnN1cmUgb2JqZWN0IGhhcyBvbmx5IGNlcnRhaW4ga2V5c1xuZnVuY3Rpb24gb25seUNvbnRhaW5zS2V5cyhvYmosIGtleXMpIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9iaikuZXZlcnkoayA9PiBrZXlzLmluY2x1ZGVzKGspKTtcbn1cblxuZnVuY3Rpb24gcGF0aEhhc051bWVyaWNLZXlzKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguc3BsaXQoJy4nKS5zb21lKGlzTnVtZXJpY0tleSk7XG59XG5cbi8vIFJldHVybnMgYSBzZXQgb2Yga2V5IHBhdGhzIHNpbWlsYXIgdG9cbi8vIHsgJ2Zvby5iYXInOiAxLCAnYS5iLmMnOiAxIH1cbmZ1bmN0aW9uIHRyZWVUb1BhdGhzKHRyZWUsIHByZWZpeCA9ICcnKSB7XG4gIGNvbnN0IHJlc3VsdCA9IHt9O1xuXG4gIE9iamVjdC5rZXlzKHRyZWUpLmZvckVhY2goa2V5ID0+IHtcbiAgICBjb25zdCB2YWx1ZSA9IHRyZWVba2V5XTtcbiAgICBpZiAodmFsdWUgPT09IE9iamVjdCh2YWx1ZSkpIHtcbiAgICAgIE9iamVjdC5hc3NpZ24ocmVzdWx0LCB0cmVlVG9QYXRocyh2YWx1ZSwgYCR7cHJlZml4ICsga2V5fS5gKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdFtwcmVmaXggKyBrZXldID0gdmFsdWU7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcmVzdWx0O1xufVxuIiwiaW1wb3J0IExvY2FsQ29sbGVjdGlvbiBmcm9tICcuL2xvY2FsX2NvbGxlY3Rpb24uanMnO1xuXG5leHBvcnQgY29uc3QgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy8gRWFjaCBlbGVtZW50IHNlbGVjdG9yIGNvbnRhaW5zOlxuLy8gIC0gY29tcGlsZUVsZW1lbnRTZWxlY3RvciwgYSBmdW5jdGlvbiB3aXRoIGFyZ3M6XG4vLyAgICAtIG9wZXJhbmQgLSB0aGUgXCJyaWdodCBoYW5kIHNpZGVcIiBvZiB0aGUgb3BlcmF0b3Jcbi8vICAgIC0gdmFsdWVTZWxlY3RvciAtIHRoZSBcImNvbnRleHRcIiBmb3IgdGhlIG9wZXJhdG9yIChzbyB0aGF0ICRyZWdleCBjYW4gZmluZFxuLy8gICAgICAkb3B0aW9ucylcbi8vICAgIC0gbWF0Y2hlciAtIHRoZSBNYXRjaGVyIHRoaXMgaXMgZ29pbmcgaW50byAoc28gdGhhdCAkZWxlbU1hdGNoIGNhbiBjb21waWxlXG4vLyAgICAgIG1vcmUgdGhpbmdzKVxuLy8gICAgcmV0dXJuaW5nIGEgZnVuY3Rpb24gbWFwcGluZyBhIHNpbmdsZSB2YWx1ZSB0byBib29sLlxuLy8gIC0gZG9udEV4cGFuZExlYWZBcnJheXMsIGEgYm9vbCB3aGljaCBwcmV2ZW50cyBleHBhbmRBcnJheXNJbkJyYW5jaGVzIGZyb21cbi8vICAgIGJlaW5nIGNhbGxlZFxuLy8gIC0gZG9udEluY2x1ZGVMZWFmQXJyYXlzLCBhIGJvb2wgd2hpY2ggY2F1c2VzIGFuIGFyZ3VtZW50IHRvIGJlIHBhc3NlZCB0b1xuLy8gICAgZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyBpZiBpdCBpcyBjYWxsZWRcbmV4cG9ydCBjb25zdCBFTEVNRU5UX09QRVJBVE9SUyA9IHtcbiAgJGx0OiBtYWtlSW5lcXVhbGl0eShjbXBWYWx1ZSA9PiBjbXBWYWx1ZSA8IDApLFxuICAkZ3Q6IG1ha2VJbmVxdWFsaXR5KGNtcFZhbHVlID0+IGNtcFZhbHVlID4gMCksXG4gICRsdGU6IG1ha2VJbmVxdWFsaXR5KGNtcFZhbHVlID0+IGNtcFZhbHVlIDw9IDApLFxuICAkZ3RlOiBtYWtlSW5lcXVhbGl0eShjbXBWYWx1ZSA9PiBjbXBWYWx1ZSA+PSAwKSxcbiAgJG1vZDoge1xuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCkge1xuICAgICAgaWYgKCEoQXJyYXkuaXNBcnJheShvcGVyYW5kKSAmJiBvcGVyYW5kLmxlbmd0aCA9PT0gMlxuICAgICAgICAgICAgJiYgdHlwZW9mIG9wZXJhbmRbMF0gPT09ICdudW1iZXInXG4gICAgICAgICAgICAmJiB0eXBlb2Ygb3BlcmFuZFsxXSA9PT0gJ251bWJlcicpKSB7XG4gICAgICAgIHRocm93IEVycm9yKCdhcmd1bWVudCB0byAkbW9kIG11c3QgYmUgYW4gYXJyYXkgb2YgdHdvIG51bWJlcnMnKTtcbiAgICAgIH1cblxuICAgICAgLy8gWFhYIGNvdWxkIHJlcXVpcmUgdG8gYmUgaW50cyBvciByb3VuZCBvciBzb21ldGhpbmdcbiAgICAgIGNvbnN0IGRpdmlzb3IgPSBvcGVyYW5kWzBdO1xuICAgICAgY29uc3QgcmVtYWluZGVyID0gb3BlcmFuZFsxXTtcbiAgICAgIHJldHVybiB2YWx1ZSA9PiAoXG4gICAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgdmFsdWUgJSBkaXZpc29yID09PSByZW1haW5kZXJcbiAgICAgICk7XG4gICAgfSxcbiAgfSxcbiAgJGluOiB7XG4gICAgY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kKSB7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkob3BlcmFuZCkpIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoJyRpbiBuZWVkcyBhbiBhcnJheScpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBlbGVtZW50TWF0Y2hlcnMgPSBvcGVyYW5kLm1hcChvcHRpb24gPT4ge1xuICAgICAgICBpZiAob3B0aW9uIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgICAgcmV0dXJuIHJlZ2V4cEVsZW1lbnRNYXRjaGVyKG9wdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNPcGVyYXRvck9iamVjdChvcHRpb24pKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoJ2Nhbm5vdCBuZXN0ICQgdW5kZXIgJGluJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXF1YWxpdHlFbGVtZW50TWF0Y2hlcihvcHRpb24pO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB2YWx1ZSA9PiB7XG4gICAgICAgIC8vIEFsbG93IHthOiB7JGluOiBbbnVsbF19fSB0byBtYXRjaCB3aGVuICdhJyBkb2VzIG5vdCBleGlzdC5cbiAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB2YWx1ZSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZWxlbWVudE1hdGNoZXJzLnNvbWUobWF0Y2hlciA9PiBtYXRjaGVyKHZhbHVlKSk7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG4gICRzaXplOiB7XG4gICAgLy8ge2E6IFtbNSwgNV1dfSBtdXN0IG1hdGNoIHthOiB7JHNpemU6IDF9fSBidXQgbm90IHthOiB7JHNpemU6IDJ9fSwgc28gd2VcbiAgICAvLyBkb24ndCB3YW50IHRvIGNvbnNpZGVyIHRoZSBlbGVtZW50IFs1LDVdIGluIHRoZSBsZWFmIGFycmF5IFtbNSw1XV0gYXMgYVxuICAgIC8vIHBvc3NpYmxlIHZhbHVlLlxuICAgIGRvbnRFeHBhbmRMZWFmQXJyYXlzOiB0cnVlLFxuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCkge1xuICAgICAgaWYgKHR5cGVvZiBvcGVyYW5kID09PSAnc3RyaW5nJykge1xuICAgICAgICAvLyBEb24ndCBhc2sgbWUgd2h5LCBidXQgYnkgZXhwZXJpbWVudGF0aW9uLCB0aGlzIHNlZW1zIHRvIGJlIHdoYXQgTW9uZ29cbiAgICAgICAgLy8gZG9lcy5cbiAgICAgICAgb3BlcmFuZCA9IDA7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBvcGVyYW5kICE9PSAnbnVtYmVyJykge1xuICAgICAgICB0aHJvdyBFcnJvcignJHNpemUgbmVlZHMgYSBudW1iZXInKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHZhbHVlID0+IEFycmF5LmlzQXJyYXkodmFsdWUpICYmIHZhbHVlLmxlbmd0aCA9PT0gb3BlcmFuZDtcbiAgICB9LFxuICB9LFxuICAkdHlwZToge1xuICAgIC8vIHthOiBbNV19IG11c3Qgbm90IG1hdGNoIHthOiB7JHR5cGU6IDR9fSAoNCBtZWFucyBhcnJheSksIGJ1dCBpdCBzaG91bGRcbiAgICAvLyBtYXRjaCB7YTogeyR0eXBlOiAxfX0gKDEgbWVhbnMgbnVtYmVyKSwgYW5kIHthOiBbWzVdXX0gbXVzdCBtYXRjaCB7JGE6XG4gICAgLy8geyR0eXBlOiA0fX0uIFRodXMsIHdoZW4gd2Ugc2VlIGEgbGVhZiBhcnJheSwgd2UgKnNob3VsZCogZXhwYW5kIGl0IGJ1dFxuICAgIC8vIHNob3VsZCAqbm90KiBpbmNsdWRlIGl0IGl0c2VsZi5cbiAgICBkb250SW5jbHVkZUxlYWZBcnJheXM6IHRydWUsXG4gICAgY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kKSB7XG4gICAgICBpZiAodHlwZW9mIG9wZXJhbmQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNvbnN0IG9wZXJhbmRBbGlhc01hcCA9IHtcbiAgICAgICAgICAnZG91YmxlJzogMSxcbiAgICAgICAgICAnc3RyaW5nJzogMixcbiAgICAgICAgICAnb2JqZWN0JzogMyxcbiAgICAgICAgICAnYXJyYXknOiA0LFxuICAgICAgICAgICdiaW5EYXRhJzogNSxcbiAgICAgICAgICAndW5kZWZpbmVkJzogNixcbiAgICAgICAgICAnb2JqZWN0SWQnOiA3LFxuICAgICAgICAgICdib29sJzogOCxcbiAgICAgICAgICAnZGF0ZSc6IDksXG4gICAgICAgICAgJ251bGwnOiAxMCxcbiAgICAgICAgICAncmVnZXgnOiAxMSxcbiAgICAgICAgICAnZGJQb2ludGVyJzogMTIsXG4gICAgICAgICAgJ2phdmFzY3JpcHQnOiAxMyxcbiAgICAgICAgICAnc3ltYm9sJzogMTQsXG4gICAgICAgICAgJ2phdmFzY3JpcHRXaXRoU2NvcGUnOiAxNSxcbiAgICAgICAgICAnaW50JzogMTYsXG4gICAgICAgICAgJ3RpbWVzdGFtcCc6IDE3LFxuICAgICAgICAgICdsb25nJzogMTgsXG4gICAgICAgICAgJ2RlY2ltYWwnOiAxOSxcbiAgICAgICAgICAnbWluS2V5JzogLTEsXG4gICAgICAgICAgJ21heEtleSc6IDEyNyxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCFoYXNPd24uY2FsbChvcGVyYW5kQWxpYXNNYXAsIG9wZXJhbmQpKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoYHVua25vd24gc3RyaW5nIGFsaWFzIGZvciAkdHlwZTogJHtvcGVyYW5kfWApO1xuICAgICAgICB9XG4gICAgICAgIG9wZXJhbmQgPSBvcGVyYW5kQWxpYXNNYXBbb3BlcmFuZF07XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBvcGVyYW5kID09PSAnbnVtYmVyJykge1xuICAgICAgICBpZiAob3BlcmFuZCA9PT0gMCB8fCBvcGVyYW5kIDwgLTFcbiAgICAgICAgICB8fCAob3BlcmFuZCA+IDE5ICYmIG9wZXJhbmQgIT09IDEyNykpIHtcbiAgICAgICAgICB0aHJvdyBFcnJvcihgSW52YWxpZCBudW1lcmljYWwgJHR5cGUgY29kZTogJHtvcGVyYW5kfWApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBFcnJvcignYXJndW1lbnQgdG8gJHR5cGUgaXMgbm90IGEgbnVtYmVyIG9yIGEgc3RyaW5nJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB2YWx1ZSA9PiAoXG4gICAgICAgIHZhbHVlICE9PSB1bmRlZmluZWQgJiYgTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlKHZhbHVlKSA9PT0gb3BlcmFuZFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuICAkYml0c0FsbFNldDoge1xuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCkge1xuICAgICAgY29uc3QgbWFzayA9IGdldE9wZXJhbmRCaXRtYXNrKG9wZXJhbmQsICckYml0c0FsbFNldCcpO1xuICAgICAgcmV0dXJuIHZhbHVlID0+IHtcbiAgICAgICAgY29uc3QgYml0bWFzayA9IGdldFZhbHVlQml0bWFzayh2YWx1ZSwgbWFzay5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gYml0bWFzayAmJiBtYXNrLmV2ZXJ5KChieXRlLCBpKSA9PiAoYml0bWFza1tpXSAmIGJ5dGUpID09PSBieXRlKTtcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcbiAgJGJpdHNBbnlTZXQ6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGNvbnN0IG1hc2sgPSBnZXRPcGVyYW5kQml0bWFzayhvcGVyYW5kLCAnJGJpdHNBbnlTZXQnKTtcbiAgICAgIHJldHVybiB2YWx1ZSA9PiB7XG4gICAgICAgIGNvbnN0IGJpdG1hc2sgPSBnZXRWYWx1ZUJpdG1hc2sodmFsdWUsIG1hc2subGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIGJpdG1hc2sgJiYgbWFzay5zb21lKChieXRlLCBpKSA9PiAofmJpdG1hc2tbaV0gJiBieXRlKSAhPT0gYnl0ZSk7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG4gICRiaXRzQWxsQ2xlYXI6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGNvbnN0IG1hc2sgPSBnZXRPcGVyYW5kQml0bWFzayhvcGVyYW5kLCAnJGJpdHNBbGxDbGVhcicpO1xuICAgICAgcmV0dXJuIHZhbHVlID0+IHtcbiAgICAgICAgY29uc3QgYml0bWFzayA9IGdldFZhbHVlQml0bWFzayh2YWx1ZSwgbWFzay5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gYml0bWFzayAmJiBtYXNrLmV2ZXJ5KChieXRlLCBpKSA9PiAhKGJpdG1hc2tbaV0gJiBieXRlKSk7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG4gICRiaXRzQW55Q2xlYXI6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGNvbnN0IG1hc2sgPSBnZXRPcGVyYW5kQml0bWFzayhvcGVyYW5kLCAnJGJpdHNBbnlDbGVhcicpO1xuICAgICAgcmV0dXJuIHZhbHVlID0+IHtcbiAgICAgICAgY29uc3QgYml0bWFzayA9IGdldFZhbHVlQml0bWFzayh2YWx1ZSwgbWFzay5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gYml0bWFzayAmJiBtYXNrLnNvbWUoKGJ5dGUsIGkpID0+IChiaXRtYXNrW2ldICYgYnl0ZSkgIT09IGJ5dGUpO1xuICAgICAgfTtcbiAgICB9LFxuICB9LFxuICAkcmVnZXg6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQsIHZhbHVlU2VsZWN0b3IpIHtcbiAgICAgIGlmICghKHR5cGVvZiBvcGVyYW5kID09PSAnc3RyaW5nJyB8fCBvcGVyYW5kIGluc3RhbmNlb2YgUmVnRXhwKSkge1xuICAgICAgICB0aHJvdyBFcnJvcignJHJlZ2V4IGhhcyB0byBiZSBhIHN0cmluZyBvciBSZWdFeHAnKTtcbiAgICAgIH1cblxuICAgICAgbGV0IHJlZ2V4cDtcbiAgICAgIGlmICh2YWx1ZVNlbGVjdG9yLiRvcHRpb25zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gT3B0aW9ucyBwYXNzZWQgaW4gJG9wdGlvbnMgKGV2ZW4gdGhlIGVtcHR5IHN0cmluZykgYWx3YXlzIG92ZXJyaWRlc1xuICAgICAgICAvLyBvcHRpb25zIGluIHRoZSBSZWdFeHAgb2JqZWN0IGl0c2VsZi5cblxuICAgICAgICAvLyBCZSBjbGVhciB0aGF0IHdlIG9ubHkgc3VwcG9ydCB0aGUgSlMtc3VwcG9ydGVkIG9wdGlvbnMsIG5vdCBleHRlbmRlZFxuICAgICAgICAvLyBvbmVzIChlZywgTW9uZ28gc3VwcG9ydHMgeCBhbmQgcykuIElkZWFsbHkgd2Ugd291bGQgaW1wbGVtZW50IHggYW5kIHNcbiAgICAgICAgLy8gYnkgdHJhbnNmb3JtaW5nIHRoZSByZWdleHAsIGJ1dCBub3QgdG9kYXkuLi5cbiAgICAgICAgaWYgKC9bXmdpbV0vLnRlc3QodmFsdWVTZWxlY3Rvci4kb3B0aW9ucykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ09ubHkgdGhlIGksIG0sIGFuZCBnIHJlZ2V4cCBvcHRpb25zIGFyZSBzdXBwb3J0ZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IG9wZXJhbmQgaW5zdGFuY2VvZiBSZWdFeHAgPyBvcGVyYW5kLnNvdXJjZSA6IG9wZXJhbmQ7XG4gICAgICAgIHJlZ2V4cCA9IG5ldyBSZWdFeHAoc291cmNlLCB2YWx1ZVNlbGVjdG9yLiRvcHRpb25zKTtcbiAgICAgIH0gZWxzZSBpZiAob3BlcmFuZCBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICByZWdleHAgPSBvcGVyYW5kO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVnZXhwID0gbmV3IFJlZ0V4cChvcGVyYW5kKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlZ2V4cEVsZW1lbnRNYXRjaGVyKHJlZ2V4cCk7XG4gICAgfSxcbiAgfSxcbiAgJGVsZW1NYXRjaDoge1xuICAgIGRvbnRFeHBhbmRMZWFmQXJyYXlzOiB0cnVlLFxuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCwgdmFsdWVTZWxlY3RvciwgbWF0Y2hlcikge1xuICAgICAgaWYgKCFMb2NhbENvbGxlY3Rpb24uX2lzUGxhaW5PYmplY3Qob3BlcmFuZCkpIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoJyRlbGVtTWF0Y2ggbmVlZCBhbiBvYmplY3QnKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaXNEb2NNYXRjaGVyID0gIWlzT3BlcmF0b3JPYmplY3QoXG4gICAgICAgIE9iamVjdC5rZXlzKG9wZXJhbmQpXG4gICAgICAgICAgLmZpbHRlcihrZXkgPT4gIWhhc093bi5jYWxsKExPR0lDQUxfT1BFUkFUT1JTLCBrZXkpKVxuICAgICAgICAgIC5yZWR1Y2UoKGEsIGIpID0+IE9iamVjdC5hc3NpZ24oYSwge1tiXTogb3BlcmFuZFtiXX0pLCB7fSksXG4gICAgICAgIHRydWUpO1xuXG4gICAgICBsZXQgc3ViTWF0Y2hlcjtcbiAgICAgIGlmIChpc0RvY01hdGNoZXIpIHtcbiAgICAgICAgLy8gVGhpcyBpcyBOT1QgdGhlIHNhbWUgYXMgY29tcGlsZVZhbHVlU2VsZWN0b3Iob3BlcmFuZCksIGFuZCBub3QganVzdFxuICAgICAgICAvLyBiZWNhdXNlIG9mIHRoZSBzbGlnaHRseSBkaWZmZXJlbnQgY2FsbGluZyBjb252ZW50aW9uLlxuICAgICAgICAvLyB7JGVsZW1NYXRjaDoge3g6IDN9fSBtZWFucyBcImFuIGVsZW1lbnQgaGFzIGEgZmllbGQgeDozXCIsIG5vdFxuICAgICAgICAvLyBcImNvbnNpc3RzIG9ubHkgb2YgYSBmaWVsZCB4OjNcIi4gQWxzbywgcmVnZXhwcyBhbmQgc3ViLSQgYXJlIGFsbG93ZWQuXG4gICAgICAgIHN1Yk1hdGNoZXIgPVxuICAgICAgICAgIGNvbXBpbGVEb2N1bWVudFNlbGVjdG9yKG9wZXJhbmQsIG1hdGNoZXIsIHtpbkVsZW1NYXRjaDogdHJ1ZX0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3ViTWF0Y2hlciA9IGNvbXBpbGVWYWx1ZVNlbGVjdG9yKG9wZXJhbmQsIG1hdGNoZXIpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdmFsdWUgPT4ge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7ICsraSkge1xuICAgICAgICAgIGNvbnN0IGFycmF5RWxlbWVudCA9IHZhbHVlW2ldO1xuICAgICAgICAgIGxldCBhcmc7XG4gICAgICAgICAgaWYgKGlzRG9jTWF0Y2hlcikge1xuICAgICAgICAgICAgLy8gV2UgY2FuIG9ubHkgbWF0Y2ggeyRlbGVtTWF0Y2g6IHtiOiAzfX0gYWdhaW5zdCBvYmplY3RzLlxuICAgICAgICAgICAgLy8gKFdlIGNhbiBhbHNvIG1hdGNoIGFnYWluc3QgYXJyYXlzLCBpZiB0aGVyZSdzIG51bWVyaWMgaW5kaWNlcyxcbiAgICAgICAgICAgIC8vIGVnIHskZWxlbU1hdGNoOiB7JzAuYic6IDN9fSBvciB7JGVsZW1NYXRjaDogezA6IDN9fS4pXG4gICAgICAgICAgICBpZiAoIWlzSW5kZXhhYmxlKGFycmF5RWxlbWVudCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhcmcgPSBhcnJheUVsZW1lbnQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGRvbnRJdGVyYXRlIGVuc3VyZXMgdGhhdCB7YTogeyRlbGVtTWF0Y2g6IHskZ3Q6IDV9fX0gbWF0Y2hlc1xuICAgICAgICAgICAgLy8ge2E6IFs4XX0gYnV0IG5vdCB7YTogW1s4XV19XG4gICAgICAgICAgICBhcmcgPSBbe3ZhbHVlOiBhcnJheUVsZW1lbnQsIGRvbnRJdGVyYXRlOiB0cnVlfV07XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFhYWCBzdXBwb3J0ICRuZWFyIGluICRlbGVtTWF0Y2ggYnkgcHJvcGFnYXRpbmcgJGRpc3RhbmNlP1xuICAgICAgICAgIGlmIChzdWJNYXRjaGVyKGFyZykucmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gaTsgLy8gc3BlY2lhbGx5IHVuZGVyc3Rvb2QgdG8gbWVhbiBcInVzZSBhcyBhcnJheUluZGljZXNcIlxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcbn07XG5cbi8vIE9wZXJhdG9ycyB0aGF0IGFwcGVhciBhdCB0aGUgdG9wIGxldmVsIG9mIGEgZG9jdW1lbnQgc2VsZWN0b3IuXG5jb25zdCBMT0dJQ0FMX09QRVJBVE9SUyA9IHtcbiAgJGFuZChzdWJTZWxlY3RvciwgbWF0Y2hlciwgaW5FbGVtTWF0Y2gpIHtcbiAgICByZXR1cm4gYW5kRG9jdW1lbnRNYXRjaGVycyhcbiAgICAgIGNvbXBpbGVBcnJheU9mRG9jdW1lbnRTZWxlY3RvcnMoc3ViU2VsZWN0b3IsIG1hdGNoZXIsIGluRWxlbU1hdGNoKVxuICAgICk7XG4gIH0sXG5cbiAgJG9yKHN1YlNlbGVjdG9yLCBtYXRjaGVyLCBpbkVsZW1NYXRjaCkge1xuICAgIGNvbnN0IG1hdGNoZXJzID0gY29tcGlsZUFycmF5T2ZEb2N1bWVudFNlbGVjdG9ycyhcbiAgICAgIHN1YlNlbGVjdG9yLFxuICAgICAgbWF0Y2hlcixcbiAgICAgIGluRWxlbU1hdGNoXG4gICAgKTtcblxuICAgIC8vIFNwZWNpYWwgY2FzZTogaWYgdGhlcmUgaXMgb25seSBvbmUgbWF0Y2hlciwgdXNlIGl0IGRpcmVjdGx5LCAqcHJlc2VydmluZypcbiAgICAvLyBhbnkgYXJyYXlJbmRpY2VzIGl0IHJldHVybnMuXG4gICAgaWYgKG1hdGNoZXJzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgcmV0dXJuIG1hdGNoZXJzWzBdO1xuICAgIH1cblxuICAgIHJldHVybiBkb2MgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gbWF0Y2hlcnMuc29tZShmbiA9PiBmbihkb2MpLnJlc3VsdCk7XG4gICAgICAvLyAkb3IgZG9lcyBOT1Qgc2V0IGFycmF5SW5kaWNlcyB3aGVuIGl0IGhhcyBtdWx0aXBsZVxuICAgICAgLy8gc3ViLWV4cHJlc3Npb25zLiAoVGVzdGVkIGFnYWluc3QgTW9uZ29EQi4pXG4gICAgICByZXR1cm4ge3Jlc3VsdH07XG4gICAgfTtcbiAgfSxcblxuICAkbm9yKHN1YlNlbGVjdG9yLCBtYXRjaGVyLCBpbkVsZW1NYXRjaCkge1xuICAgIGNvbnN0IG1hdGNoZXJzID0gY29tcGlsZUFycmF5T2ZEb2N1bWVudFNlbGVjdG9ycyhcbiAgICAgIHN1YlNlbGVjdG9yLFxuICAgICAgbWF0Y2hlcixcbiAgICAgIGluRWxlbU1hdGNoXG4gICAgKTtcbiAgICByZXR1cm4gZG9jID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IG1hdGNoZXJzLmV2ZXJ5KGZuID0+ICFmbihkb2MpLnJlc3VsdCk7XG4gICAgICAvLyBOZXZlciBzZXQgYXJyYXlJbmRpY2VzLCBiZWNhdXNlIHdlIG9ubHkgbWF0Y2ggaWYgbm90aGluZyBpbiBwYXJ0aWN1bGFyXG4gICAgICAvLyAnbWF0Y2hlZCcgKGFuZCBiZWNhdXNlIHRoaXMgaXMgY29uc2lzdGVudCB3aXRoIE1vbmdvREIpLlxuICAgICAgcmV0dXJuIHtyZXN1bHR9O1xuICAgIH07XG4gIH0sXG5cbiAgJHdoZXJlKHNlbGVjdG9yVmFsdWUsIG1hdGNoZXIpIHtcbiAgICAvLyBSZWNvcmQgdGhhdCAqYW55KiBwYXRoIG1heSBiZSB1c2VkLlxuICAgIG1hdGNoZXIuX3JlY29yZFBhdGhVc2VkKCcnKTtcbiAgICBtYXRjaGVyLl9oYXNXaGVyZSA9IHRydWU7XG5cbiAgICBpZiAoIShzZWxlY3RvclZhbHVlIGluc3RhbmNlb2YgRnVuY3Rpb24pKSB7XG4gICAgICAvLyBYWFggTW9uZ29EQiBzZWVtcyB0byBoYXZlIG1vcmUgY29tcGxleCBsb2dpYyB0byBkZWNpZGUgd2hlcmUgb3Igb3Igbm90XG4gICAgICAvLyB0byBhZGQgJ3JldHVybic7IG5vdCBzdXJlIGV4YWN0bHkgd2hhdCBpdCBpcy5cbiAgICAgIHNlbGVjdG9yVmFsdWUgPSBGdW5jdGlvbignb2JqJywgYHJldHVybiAke3NlbGVjdG9yVmFsdWV9YCk7XG4gICAgfVxuXG4gICAgLy8gV2UgbWFrZSB0aGUgZG9jdW1lbnQgYXZhaWxhYmxlIGFzIGJvdGggYHRoaXNgIGFuZCBgb2JqYC5cbiAgICAvLyAvLyBYWFggbm90IHN1cmUgd2hhdCB3ZSBzaG91bGQgZG8gaWYgdGhpcyB0aHJvd3NcbiAgICByZXR1cm4gZG9jID0+ICh7cmVzdWx0OiBzZWxlY3RvclZhbHVlLmNhbGwoZG9jLCBkb2MpfSk7XG4gIH0sXG5cbiAgLy8gVGhpcyBpcyBqdXN0IHVzZWQgYXMgYSBjb21tZW50IGluIHRoZSBxdWVyeSAoaW4gTW9uZ29EQiwgaXQgYWxzbyBlbmRzIHVwIGluXG4gIC8vIHF1ZXJ5IGxvZ3MpOyBpdCBoYXMgbm8gZWZmZWN0IG9uIHRoZSBhY3R1YWwgc2VsZWN0aW9uLlxuICAkY29tbWVudCgpIHtcbiAgICByZXR1cm4gKCkgPT4gKHtyZXN1bHQ6IHRydWV9KTtcbiAgfSxcbn07XG5cbi8vIE9wZXJhdG9ycyB0aGF0ICh1bmxpa2UgTE9HSUNBTF9PUEVSQVRPUlMpIHBlcnRhaW4gdG8gaW5kaXZpZHVhbCBwYXRocyBpbiBhXG4vLyBkb2N1bWVudCwgYnV0ICh1bmxpa2UgRUxFTUVOVF9PUEVSQVRPUlMpIGRvIG5vdCBoYXZlIGEgc2ltcGxlIGRlZmluaXRpb24gYXNcbi8vIFwibWF0Y2ggZWFjaCBicmFuY2hlZCB2YWx1ZSBpbmRlcGVuZGVudGx5IGFuZCBjb21iaW5lIHdpdGhcbi8vIGNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyXCIuXG5jb25zdCBWQUxVRV9PUEVSQVRPUlMgPSB7XG4gICRlcShvcGVyYW5kKSB7XG4gICAgcmV0dXJuIGNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyKFxuICAgICAgZXF1YWxpdHlFbGVtZW50TWF0Y2hlcihvcGVyYW5kKVxuICAgICk7XG4gIH0sXG4gICRub3Qob3BlcmFuZCwgdmFsdWVTZWxlY3RvciwgbWF0Y2hlcikge1xuICAgIHJldHVybiBpbnZlcnRCcmFuY2hlZE1hdGNoZXIoY29tcGlsZVZhbHVlU2VsZWN0b3Iob3BlcmFuZCwgbWF0Y2hlcikpO1xuICB9LFxuICAkbmUob3BlcmFuZCkge1xuICAgIHJldHVybiBpbnZlcnRCcmFuY2hlZE1hdGNoZXIoXG4gICAgICBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihlcXVhbGl0eUVsZW1lbnRNYXRjaGVyKG9wZXJhbmQpKVxuICAgICk7XG4gIH0sXG4gICRuaW4ob3BlcmFuZCkge1xuICAgIHJldHVybiBpbnZlcnRCcmFuY2hlZE1hdGNoZXIoXG4gICAgICBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihcbiAgICAgICAgRUxFTUVOVF9PUEVSQVRPUlMuJGluLmNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZClcbiAgICAgIClcbiAgICApO1xuICB9LFxuICAkZXhpc3RzKG9wZXJhbmQpIHtcbiAgICBjb25zdCBleGlzdHMgPSBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihcbiAgICAgIHZhbHVlID0+IHZhbHVlICE9PSB1bmRlZmluZWRcbiAgICApO1xuICAgIHJldHVybiBvcGVyYW5kID8gZXhpc3RzIDogaW52ZXJ0QnJhbmNoZWRNYXRjaGVyKGV4aXN0cyk7XG4gIH0sXG4gIC8vICRvcHRpb25zIGp1c3QgcHJvdmlkZXMgb3B0aW9ucyBmb3IgJHJlZ2V4OyBpdHMgbG9naWMgaXMgaW5zaWRlICRyZWdleFxuICAkb3B0aW9ucyhvcGVyYW5kLCB2YWx1ZVNlbGVjdG9yKSB7XG4gICAgaWYgKCFoYXNPd24uY2FsbCh2YWx1ZVNlbGVjdG9yLCAnJHJlZ2V4JykpIHtcbiAgICAgIHRocm93IEVycm9yKCckb3B0aW9ucyBuZWVkcyBhICRyZWdleCcpO1xuICAgIH1cblxuICAgIHJldHVybiBldmVyeXRoaW5nTWF0Y2hlcjtcbiAgfSxcbiAgLy8gJG1heERpc3RhbmNlIGlzIGJhc2ljYWxseSBhbiBhcmd1bWVudCB0byAkbmVhclxuICAkbWF4RGlzdGFuY2Uob3BlcmFuZCwgdmFsdWVTZWxlY3Rvcikge1xuICAgIGlmICghdmFsdWVTZWxlY3Rvci4kbmVhcikge1xuICAgICAgdGhyb3cgRXJyb3IoJyRtYXhEaXN0YW5jZSBuZWVkcyBhICRuZWFyJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGV2ZXJ5dGhpbmdNYXRjaGVyO1xuICB9LFxuICAkYWxsKG9wZXJhbmQsIHZhbHVlU2VsZWN0b3IsIG1hdGNoZXIpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkob3BlcmFuZCkpIHtcbiAgICAgIHRocm93IEVycm9yKCckYWxsIHJlcXVpcmVzIGFycmF5Jyk7XG4gICAgfVxuXG4gICAgLy8gTm90IHN1cmUgd2h5LCBidXQgdGhpcyBzZWVtcyB0byBiZSB3aGF0IE1vbmdvREIgZG9lcy5cbiAgICBpZiAob3BlcmFuZC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBub3RoaW5nTWF0Y2hlcjtcbiAgICB9XG5cbiAgICBjb25zdCBicmFuY2hlZE1hdGNoZXJzID0gb3BlcmFuZC5tYXAoY3JpdGVyaW9uID0+IHtcbiAgICAgIC8vIFhYWCBoYW5kbGUgJGFsbC8kZWxlbU1hdGNoIGNvbWJpbmF0aW9uXG4gICAgICBpZiAoaXNPcGVyYXRvck9iamVjdChjcml0ZXJpb24pKSB7XG4gICAgICAgIHRocm93IEVycm9yKCdubyAkIGV4cHJlc3Npb25zIGluICRhbGwnKTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhpcyBpcyBhbHdheXMgYSByZWdleHAgb3IgZXF1YWxpdHkgc2VsZWN0b3IuXG4gICAgICByZXR1cm4gY29tcGlsZVZhbHVlU2VsZWN0b3IoY3JpdGVyaW9uLCBtYXRjaGVyKTtcbiAgICB9KTtcblxuICAgIC8vIGFuZEJyYW5jaGVkTWF0Y2hlcnMgZG9lcyBOT1QgcmVxdWlyZSBhbGwgc2VsZWN0b3JzIHRvIHJldHVybiB0cnVlIG9uIHRoZVxuICAgIC8vIFNBTUUgYnJhbmNoLlxuICAgIHJldHVybiBhbmRCcmFuY2hlZE1hdGNoZXJzKGJyYW5jaGVkTWF0Y2hlcnMpO1xuICB9LFxuICAkbmVhcihvcGVyYW5kLCB2YWx1ZVNlbGVjdG9yLCBtYXRjaGVyLCBpc1Jvb3QpIHtcbiAgICBpZiAoIWlzUm9vdCkge1xuICAgICAgdGhyb3cgRXJyb3IoJyRuZWFyIGNhblxcJ3QgYmUgaW5zaWRlIGFub3RoZXIgJCBvcGVyYXRvcicpO1xuICAgIH1cblxuICAgIG1hdGNoZXIuX2hhc0dlb1F1ZXJ5ID0gdHJ1ZTtcblxuICAgIC8vIFRoZXJlIGFyZSB0d28ga2luZHMgb2YgZ2VvZGF0YSBpbiBNb25nb0RCOiBsZWdhY3kgY29vcmRpbmF0ZSBwYWlycyBhbmRcbiAgICAvLyBHZW9KU09OLiBUaGV5IHVzZSBkaWZmZXJlbnQgZGlzdGFuY2UgbWV0cmljcywgdG9vLiBHZW9KU09OIHF1ZXJpZXMgYXJlXG4gICAgLy8gbWFya2VkIHdpdGggYSAkZ2VvbWV0cnkgcHJvcGVydHksIHRob3VnaCBsZWdhY3kgY29vcmRpbmF0ZXMgY2FuIGJlXG4gICAgLy8gbWF0Y2hlZCB1c2luZyAkZ2VvbWV0cnkuXG4gICAgbGV0IG1heERpc3RhbmNlLCBwb2ludCwgZGlzdGFuY2U7XG4gICAgaWYgKExvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChvcGVyYW5kKSAmJiBoYXNPd24uY2FsbChvcGVyYW5kLCAnJGdlb21ldHJ5JykpIHtcbiAgICAgIC8vIEdlb0pTT04gXCIyZHNwaGVyZVwiIG1vZGUuXG4gICAgICBtYXhEaXN0YW5jZSA9IG9wZXJhbmQuJG1heERpc3RhbmNlO1xuICAgICAgcG9pbnQgPSBvcGVyYW5kLiRnZW9tZXRyeTtcbiAgICAgIGRpc3RhbmNlID0gdmFsdWUgPT4ge1xuICAgICAgICAvLyBYWFg6IGZvciBub3csIHdlIGRvbid0IGNhbGN1bGF0ZSB0aGUgYWN0dWFsIGRpc3RhbmNlIGJldHdlZW4sIHNheSxcbiAgICAgICAgLy8gcG9seWdvbiBhbmQgY2lyY2xlLiBJZiBwZW9wbGUgY2FyZSBhYm91dCB0aGlzIHVzZS1jYXNlIGl0IHdpbGwgZ2V0XG4gICAgICAgIC8vIGEgcHJpb3JpdHkuXG4gICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdmFsdWUudHlwZSkge1xuICAgICAgICAgIHJldHVybiBHZW9KU09OLnBvaW50RGlzdGFuY2UoXG4gICAgICAgICAgICBwb2ludCxcbiAgICAgICAgICAgIHt0eXBlOiAnUG9pbnQnLCBjb29yZGluYXRlczogcG9pbnRUb0FycmF5KHZhbHVlKX1cbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZhbHVlLnR5cGUgPT09ICdQb2ludCcpIHtcbiAgICAgICAgICByZXR1cm4gR2VvSlNPTi5wb2ludERpc3RhbmNlKHBvaW50LCB2YWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gR2VvSlNPTi5nZW9tZXRyeVdpdGhpblJhZGl1cyh2YWx1ZSwgcG9pbnQsIG1heERpc3RhbmNlKVxuICAgICAgICAgID8gMFxuICAgICAgICAgIDogbWF4RGlzdGFuY2UgKyAxO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWF4RGlzdGFuY2UgPSB2YWx1ZVNlbGVjdG9yLiRtYXhEaXN0YW5jZTtcblxuICAgICAgaWYgKCFpc0luZGV4YWJsZShvcGVyYW5kKSkge1xuICAgICAgICB0aHJvdyBFcnJvcignJG5lYXIgYXJndW1lbnQgbXVzdCBiZSBjb29yZGluYXRlIHBhaXIgb3IgR2VvSlNPTicpO1xuICAgICAgfVxuXG4gICAgICBwb2ludCA9IHBvaW50VG9BcnJheShvcGVyYW5kKTtcblxuICAgICAgZGlzdGFuY2UgPSB2YWx1ZSA9PiB7XG4gICAgICAgIGlmICghaXNJbmRleGFibGUodmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZGlzdGFuY2VDb29yZGluYXRlUGFpcnMocG9pbnQsIHZhbHVlKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGJyYW5jaGVkVmFsdWVzID0+IHtcbiAgICAgIC8vIFRoZXJlIG1pZ2h0IGJlIG11bHRpcGxlIHBvaW50cyBpbiB0aGUgZG9jdW1lbnQgdGhhdCBtYXRjaCB0aGUgZ2l2ZW5cbiAgICAgIC8vIGZpZWxkLiBPbmx5IG9uZSBvZiB0aGVtIG5lZWRzIHRvIGJlIHdpdGhpbiAkbWF4RGlzdGFuY2UsIGJ1dCB3ZSBuZWVkIHRvXG4gICAgICAvLyBldmFsdWF0ZSBhbGwgb2YgdGhlbSBhbmQgdXNlIHRoZSBuZWFyZXN0IG9uZSBmb3IgdGhlIGltcGxpY2l0IHNvcnRcbiAgICAgIC8vIHNwZWNpZmllci4gKFRoYXQncyB3aHkgd2UgY2FuJ3QganVzdCB1c2UgRUxFTUVOVF9PUEVSQVRPUlMgaGVyZS4pXG4gICAgICAvL1xuICAgICAgLy8gTm90ZTogVGhpcyBkaWZmZXJzIGZyb20gTW9uZ29EQidzIGltcGxlbWVudGF0aW9uLCB3aGVyZSBhIGRvY3VtZW50IHdpbGxcbiAgICAgIC8vIGFjdHVhbGx5IHNob3cgdXAgKm11bHRpcGxlIHRpbWVzKiBpbiB0aGUgcmVzdWx0IHNldCwgd2l0aCBvbmUgZW50cnkgZm9yXG4gICAgICAvLyBlYWNoIHdpdGhpbi0kbWF4RGlzdGFuY2UgYnJhbmNoaW5nIHBvaW50LlxuICAgICAgY29uc3QgcmVzdWx0ID0ge3Jlc3VsdDogZmFsc2V9O1xuICAgICAgZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyhicmFuY2hlZFZhbHVlcykuZXZlcnkoYnJhbmNoID0+IHtcbiAgICAgICAgLy8gaWYgb3BlcmF0aW9uIGlzIGFuIHVwZGF0ZSwgZG9uJ3Qgc2tpcCBicmFuY2hlcywganVzdCByZXR1cm4gdGhlIGZpcnN0XG4gICAgICAgIC8vIG9uZSAoIzM1OTkpXG4gICAgICAgIGxldCBjdXJEaXN0YW5jZTtcbiAgICAgICAgaWYgKCFtYXRjaGVyLl9pc1VwZGF0ZSkge1xuICAgICAgICAgIGlmICghKHR5cGVvZiBicmFuY2gudmFsdWUgPT09ICdvYmplY3QnKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY3VyRGlzdGFuY2UgPSBkaXN0YW5jZShicmFuY2gudmFsdWUpO1xuXG4gICAgICAgICAgLy8gU2tpcCBicmFuY2hlcyB0aGF0IGFyZW4ndCByZWFsIHBvaW50cyBvciBhcmUgdG9vIGZhciBhd2F5LlxuICAgICAgICAgIGlmIChjdXJEaXN0YW5jZSA9PT0gbnVsbCB8fCBjdXJEaXN0YW5jZSA+IG1heERpc3RhbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBTa2lwIGFueXRoaW5nIHRoYXQncyBhIHRpZS5cbiAgICAgICAgICBpZiAocmVzdWx0LmRpc3RhbmNlICE9PSB1bmRlZmluZWQgJiYgcmVzdWx0LmRpc3RhbmNlIDw9IGN1ckRpc3RhbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHQucmVzdWx0ID0gdHJ1ZTtcbiAgICAgICAgcmVzdWx0LmRpc3RhbmNlID0gY3VyRGlzdGFuY2U7XG5cbiAgICAgICAgaWYgKGJyYW5jaC5hcnJheUluZGljZXMpIHtcbiAgICAgICAgICByZXN1bHQuYXJyYXlJbmRpY2VzID0gYnJhbmNoLmFycmF5SW5kaWNlcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgcmVzdWx0LmFycmF5SW5kaWNlcztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAhbWF0Y2hlci5faXNVcGRhdGU7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9LFxufTtcblxuLy8gTkI6IFdlIGFyZSBjaGVhdGluZyBhbmQgdXNpbmcgdGhpcyBmdW5jdGlvbiB0byBpbXBsZW1lbnQgJ0FORCcgZm9yIGJvdGhcbi8vICdkb2N1bWVudCBtYXRjaGVycycgYW5kICdicmFuY2hlZCBtYXRjaGVycycuIFRoZXkgYm90aCByZXR1cm4gcmVzdWx0IG9iamVjdHNcbi8vIGJ1dCB0aGUgYXJndW1lbnQgaXMgZGlmZmVyZW50OiBmb3IgdGhlIGZvcm1lciBpdCdzIGEgd2hvbGUgZG9jLCB3aGVyZWFzIGZvclxuLy8gdGhlIGxhdHRlciBpdCdzIGFuIGFycmF5IG9mICdicmFuY2hlZCB2YWx1ZXMnLlxuZnVuY3Rpb24gYW5kU29tZU1hdGNoZXJzKHN1Yk1hdGNoZXJzKSB7XG4gIGlmIChzdWJNYXRjaGVycy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gZXZlcnl0aGluZ01hdGNoZXI7XG4gIH1cblxuICBpZiAoc3ViTWF0Y2hlcnMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIHN1Yk1hdGNoZXJzWzBdO1xuICB9XG5cbiAgcmV0dXJuIGRvY09yQnJhbmNoZXMgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0ge307XG4gICAgbWF0Y2gucmVzdWx0ID0gc3ViTWF0Y2hlcnMuZXZlcnkoZm4gPT4ge1xuICAgICAgY29uc3Qgc3ViUmVzdWx0ID0gZm4oZG9jT3JCcmFuY2hlcyk7XG5cbiAgICAgIC8vIENvcHkgYSAnZGlzdGFuY2UnIG51bWJlciBvdXQgb2YgdGhlIGZpcnN0IHN1Yi1tYXRjaGVyIHRoYXQgaGFzXG4gICAgICAvLyBvbmUuIFllcywgdGhpcyBtZWFucyB0aGF0IGlmIHRoZXJlIGFyZSBtdWx0aXBsZSAkbmVhciBmaWVsZHMgaW4gYVxuICAgICAgLy8gcXVlcnksIHNvbWV0aGluZyBhcmJpdHJhcnkgaGFwcGVuczsgdGhpcyBhcHBlYXJzIHRvIGJlIGNvbnNpc3RlbnQgd2l0aFxuICAgICAgLy8gTW9uZ28uXG4gICAgICBpZiAoc3ViUmVzdWx0LnJlc3VsdCAmJlxuICAgICAgICAgIHN1YlJlc3VsdC5kaXN0YW5jZSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgbWF0Y2guZGlzdGFuY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBtYXRjaC5kaXN0YW5jZSA9IHN1YlJlc3VsdC5kaXN0YW5jZTtcbiAgICAgIH1cblxuICAgICAgLy8gU2ltaWxhcmx5LCBwcm9wYWdhdGUgYXJyYXlJbmRpY2VzIGZyb20gc3ViLW1hdGNoZXJzLi4uIGJ1dCB0byBtYXRjaFxuICAgICAgLy8gTW9uZ29EQiBiZWhhdmlvciwgdGhpcyB0aW1lIHRoZSAqbGFzdCogc3ViLW1hdGNoZXIgd2l0aCBhcnJheUluZGljZXNcbiAgICAgIC8vIHdpbnMuXG4gICAgICBpZiAoc3ViUmVzdWx0LnJlc3VsdCAmJiBzdWJSZXN1bHQuYXJyYXlJbmRpY2VzKSB7XG4gICAgICAgIG1hdGNoLmFycmF5SW5kaWNlcyA9IHN1YlJlc3VsdC5hcnJheUluZGljZXM7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzdWJSZXN1bHQucmVzdWx0O1xuICAgIH0pO1xuXG4gICAgLy8gSWYgd2UgZGlkbid0IGFjdHVhbGx5IG1hdGNoLCBmb3JnZXQgYW55IGV4dHJhIG1ldGFkYXRhIHdlIGNhbWUgdXAgd2l0aC5cbiAgICBpZiAoIW1hdGNoLnJlc3VsdCkge1xuICAgICAgZGVsZXRlIG1hdGNoLmRpc3RhbmNlO1xuICAgICAgZGVsZXRlIG1hdGNoLmFycmF5SW5kaWNlcztcbiAgICB9XG5cbiAgICByZXR1cm4gbWF0Y2g7XG4gIH07XG59XG5cbmNvbnN0IGFuZERvY3VtZW50TWF0Y2hlcnMgPSBhbmRTb21lTWF0Y2hlcnM7XG5jb25zdCBhbmRCcmFuY2hlZE1hdGNoZXJzID0gYW5kU29tZU1hdGNoZXJzO1xuXG5mdW5jdGlvbiBjb21waWxlQXJyYXlPZkRvY3VtZW50U2VsZWN0b3JzKHNlbGVjdG9ycywgbWF0Y2hlciwgaW5FbGVtTWF0Y2gpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHNlbGVjdG9ycykgfHwgc2VsZWN0b3JzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IEVycm9yKCckYW5kLyRvci8kbm9yIG11c3QgYmUgbm9uZW1wdHkgYXJyYXknKTtcbiAgfVxuXG4gIHJldHVybiBzZWxlY3RvcnMubWFwKHN1YlNlbGVjdG9yID0+IHtcbiAgICBpZiAoIUxvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChzdWJTZWxlY3RvcikpIHtcbiAgICAgIHRocm93IEVycm9yKCckb3IvJGFuZC8kbm9yIGVudHJpZXMgbmVlZCB0byBiZSBmdWxsIG9iamVjdHMnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29tcGlsZURvY3VtZW50U2VsZWN0b3Ioc3ViU2VsZWN0b3IsIG1hdGNoZXIsIHtpbkVsZW1NYXRjaH0pO1xuICB9KTtcbn1cblxuLy8gVGFrZXMgaW4gYSBzZWxlY3RvciB0aGF0IGNvdWxkIG1hdGNoIGEgZnVsbCBkb2N1bWVudCAoZWcsIHRoZSBvcmlnaW5hbFxuLy8gc2VsZWN0b3IpLiBSZXR1cm5zIGEgZnVuY3Rpb24gbWFwcGluZyBkb2N1bWVudC0+cmVzdWx0IG9iamVjdC5cbi8vXG4vLyBtYXRjaGVyIGlzIHRoZSBNYXRjaGVyIG9iamVjdCB3ZSBhcmUgY29tcGlsaW5nLlxuLy9cbi8vIElmIHRoaXMgaXMgdGhlIHJvb3QgZG9jdW1lbnQgc2VsZWN0b3IgKGllLCBub3Qgd3JhcHBlZCBpbiAkYW5kIG9yIHRoZSBsaWtlKSxcbi8vIHRoZW4gaXNSb290IGlzIHRydWUuIChUaGlzIGlzIHVzZWQgYnkgJG5lYXIuKVxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGVEb2N1bWVudFNlbGVjdG9yKGRvY1NlbGVjdG9yLCBtYXRjaGVyLCBvcHRpb25zID0ge30pIHtcbiAgY29uc3QgZG9jTWF0Y2hlcnMgPSBPYmplY3Qua2V5cyhkb2NTZWxlY3RvcikubWFwKGtleSA9PiB7XG4gICAgY29uc3Qgc3ViU2VsZWN0b3IgPSBkb2NTZWxlY3RvcltrZXldO1xuXG4gICAgaWYgKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJykge1xuICAgICAgLy8gT3V0ZXIgb3BlcmF0b3JzIGFyZSBlaXRoZXIgbG9naWNhbCBvcGVyYXRvcnMgKHRoZXkgcmVjdXJzZSBiYWNrIGludG9cbiAgICAgIC8vIHRoaXMgZnVuY3Rpb24pLCBvciAkd2hlcmUuXG4gICAgICBpZiAoIWhhc093bi5jYWxsKExPR0lDQUxfT1BFUkFUT1JTLCBrZXkpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIGxvZ2ljYWwgb3BlcmF0b3I6ICR7a2V5fWApO1xuICAgICAgfVxuXG4gICAgICBtYXRjaGVyLl9pc1NpbXBsZSA9IGZhbHNlO1xuICAgICAgcmV0dXJuIExPR0lDQUxfT1BFUkFUT1JTW2tleV0oc3ViU2VsZWN0b3IsIG1hdGNoZXIsIG9wdGlvbnMuaW5FbGVtTWF0Y2gpO1xuICAgIH1cblxuICAgIC8vIFJlY29yZCB0aGlzIHBhdGgsIGJ1dCBvbmx5IGlmIHdlIGFyZW4ndCBpbiBhbiBlbGVtTWF0Y2hlciwgc2luY2UgaW4gYW5cbiAgICAvLyBlbGVtTWF0Y2ggdGhpcyBpcyBhIHBhdGggaW5zaWRlIGFuIG9iamVjdCBpbiBhbiBhcnJheSwgbm90IGluIHRoZSBkb2NcbiAgICAvLyByb290LlxuICAgIGlmICghb3B0aW9ucy5pbkVsZW1NYXRjaCkge1xuICAgICAgbWF0Y2hlci5fcmVjb3JkUGF0aFVzZWQoa2V5KTtcbiAgICB9XG5cbiAgICAvLyBEb24ndCBhZGQgYSBtYXRjaGVyIGlmIHN1YlNlbGVjdG9yIGlzIGEgZnVuY3Rpb24gLS0gdGhpcyBpcyB0byBtYXRjaFxuICAgIC8vIHRoZSBiZWhhdmlvciBvZiBNZXRlb3Igb24gdGhlIHNlcnZlciAoaW5oZXJpdGVkIGZyb20gdGhlIG5vZGUgbW9uZ29kYlxuICAgIC8vIGRyaXZlciksIHdoaWNoIGlzIHRvIGlnbm9yZSBhbnkgcGFydCBvZiBhIHNlbGVjdG9yIHdoaWNoIGlzIGEgZnVuY3Rpb24uXG4gICAgaWYgKHR5cGVvZiBzdWJTZWxlY3RvciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBsb29rVXBCeUluZGV4ID0gbWFrZUxvb2t1cEZ1bmN0aW9uKGtleSk7XG4gICAgY29uc3QgdmFsdWVNYXRjaGVyID0gY29tcGlsZVZhbHVlU2VsZWN0b3IoXG4gICAgICBzdWJTZWxlY3RvcixcbiAgICAgIG1hdGNoZXIsXG4gICAgICBvcHRpb25zLmlzUm9vdFxuICAgICk7XG5cbiAgICByZXR1cm4gZG9jID0+IHZhbHVlTWF0Y2hlcihsb29rVXBCeUluZGV4KGRvYykpO1xuICB9KS5maWx0ZXIoQm9vbGVhbik7XG5cbiAgcmV0dXJuIGFuZERvY3VtZW50TWF0Y2hlcnMoZG9jTWF0Y2hlcnMpO1xufVxuXG4vLyBUYWtlcyBpbiBhIHNlbGVjdG9yIHRoYXQgY291bGQgbWF0Y2ggYSBrZXktaW5kZXhlZCB2YWx1ZSBpbiBhIGRvY3VtZW50OyBlZyxcbi8vIHskZ3Q6IDUsICRsdDogOX0sIG9yIGEgcmVndWxhciBleHByZXNzaW9uLCBvciBhbnkgbm9uLWV4cHJlc3Npb24gb2JqZWN0ICh0b1xuLy8gaW5kaWNhdGUgZXF1YWxpdHkpLiAgUmV0dXJucyBhIGJyYW5jaGVkIG1hdGNoZXI6IGEgZnVuY3Rpb24gbWFwcGluZ1xuLy8gW2JyYW5jaGVkIHZhbHVlXS0+cmVzdWx0IG9iamVjdC5cbmZ1bmN0aW9uIGNvbXBpbGVWYWx1ZVNlbGVjdG9yKHZhbHVlU2VsZWN0b3IsIG1hdGNoZXIsIGlzUm9vdCkge1xuICBpZiAodmFsdWVTZWxlY3RvciBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgIG1hdGNoZXIuX2lzU2ltcGxlID0gZmFsc2U7XG4gICAgcmV0dXJuIGNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyKFxuICAgICAgcmVnZXhwRWxlbWVudE1hdGNoZXIodmFsdWVTZWxlY3RvcilcbiAgICApO1xuICB9XG5cbiAgaWYgKGlzT3BlcmF0b3JPYmplY3QodmFsdWVTZWxlY3RvcikpIHtcbiAgICByZXR1cm4gb3BlcmF0b3JCcmFuY2hlZE1hdGNoZXIodmFsdWVTZWxlY3RvciwgbWF0Y2hlciwgaXNSb290KTtcbiAgfVxuXG4gIHJldHVybiBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihcbiAgICBlcXVhbGl0eUVsZW1lbnRNYXRjaGVyKHZhbHVlU2VsZWN0b3IpXG4gICk7XG59XG5cbi8vIEdpdmVuIGFuIGVsZW1lbnQgbWF0Y2hlciAod2hpY2ggZXZhbHVhdGVzIGEgc2luZ2xlIHZhbHVlKSwgcmV0dXJucyBhIGJyYW5jaGVkXG4vLyB2YWx1ZSAod2hpY2ggZXZhbHVhdGVzIHRoZSBlbGVtZW50IG1hdGNoZXIgb24gYWxsIHRoZSBicmFuY2hlcyBhbmQgcmV0dXJucyBhXG4vLyBtb3JlIHN0cnVjdHVyZWQgcmV0dXJuIHZhbHVlIHBvc3NpYmx5IGluY2x1ZGluZyBhcnJheUluZGljZXMpLlxuZnVuY3Rpb24gY29udmVydEVsZW1lbnRNYXRjaGVyVG9CcmFuY2hlZE1hdGNoZXIoZWxlbWVudE1hdGNoZXIsIG9wdGlvbnMgPSB7fSkge1xuICByZXR1cm4gYnJhbmNoZXMgPT4ge1xuICAgIGNvbnN0IGV4cGFuZGVkID0gb3B0aW9ucy5kb250RXhwYW5kTGVhZkFycmF5c1xuICAgICAgPyBicmFuY2hlc1xuICAgICAgOiBleHBhbmRBcnJheXNJbkJyYW5jaGVzKGJyYW5jaGVzLCBvcHRpb25zLmRvbnRJbmNsdWRlTGVhZkFycmF5cyk7XG5cbiAgICBjb25zdCBtYXRjaCA9IHt9O1xuICAgIG1hdGNoLnJlc3VsdCA9IGV4cGFuZGVkLnNvbWUoZWxlbWVudCA9PiB7XG4gICAgICBsZXQgbWF0Y2hlZCA9IGVsZW1lbnRNYXRjaGVyKGVsZW1lbnQudmFsdWUpO1xuXG4gICAgICAvLyBTcGVjaWFsIGNhc2UgZm9yICRlbGVtTWF0Y2g6IGl0IG1lYW5zIFwidHJ1ZSwgYW5kIHVzZSB0aGlzIGFzIGFuIGFycmF5XG4gICAgICAvLyBpbmRleCBpZiBJIGRpZG4ndCBhbHJlYWR5IGhhdmUgb25lXCIuXG4gICAgICBpZiAodHlwZW9mIG1hdGNoZWQgPT09ICdudW1iZXInKSB7XG4gICAgICAgIC8vIFhYWCBUaGlzIGNvZGUgZGF0ZXMgZnJvbSB3aGVuIHdlIG9ubHkgc3RvcmVkIGEgc2luZ2xlIGFycmF5IGluZGV4XG4gICAgICAgIC8vIChmb3IgdGhlIG91dGVybW9zdCBhcnJheSkuIFNob3VsZCB3ZSBiZSBhbHNvIGluY2x1ZGluZyBkZWVwZXIgYXJyYXlcbiAgICAgICAgLy8gaW5kaWNlcyBmcm9tIHRoZSAkZWxlbU1hdGNoIG1hdGNoP1xuICAgICAgICBpZiAoIWVsZW1lbnQuYXJyYXlJbmRpY2VzKSB7XG4gICAgICAgICAgZWxlbWVudC5hcnJheUluZGljZXMgPSBbbWF0Y2hlZF07XG4gICAgICAgIH1cblxuICAgICAgICBtYXRjaGVkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgc29tZSBlbGVtZW50IG1hdGNoZWQsIGFuZCBpdCdzIHRhZ2dlZCB3aXRoIGFycmF5IGluZGljZXMsIGluY2x1ZGVcbiAgICAgIC8vIHRob3NlIGluZGljZXMgaW4gb3VyIHJlc3VsdCBvYmplY3QuXG4gICAgICBpZiAobWF0Y2hlZCAmJiBlbGVtZW50LmFycmF5SW5kaWNlcykge1xuICAgICAgICBtYXRjaC5hcnJheUluZGljZXMgPSBlbGVtZW50LmFycmF5SW5kaWNlcztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG1hdGNoZWQ7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbWF0Y2g7XG4gIH07XG59XG5cbi8vIEhlbHBlcnMgZm9yICRuZWFyLlxuZnVuY3Rpb24gZGlzdGFuY2VDb29yZGluYXRlUGFpcnMoYSwgYikge1xuICBjb25zdCBwb2ludEEgPSBwb2ludFRvQXJyYXkoYSk7XG4gIGNvbnN0IHBvaW50QiA9IHBvaW50VG9BcnJheShiKTtcblxuICByZXR1cm4gTWF0aC5oeXBvdChwb2ludEFbMF0gLSBwb2ludEJbMF0sIHBvaW50QVsxXSAtIHBvaW50QlsxXSk7XG59XG5cbi8vIFRha2VzIHNvbWV0aGluZyB0aGF0IGlzIG5vdCBhbiBvcGVyYXRvciBvYmplY3QgYW5kIHJldHVybnMgYW4gZWxlbWVudCBtYXRjaGVyXG4vLyBmb3IgZXF1YWxpdHkgd2l0aCB0aGF0IHRoaW5nLlxuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsaXR5RWxlbWVudE1hdGNoZXIoZWxlbWVudFNlbGVjdG9yKSB7XG4gIGlmIChpc09wZXJhdG9yT2JqZWN0KGVsZW1lbnRTZWxlY3RvcikpIHtcbiAgICB0aHJvdyBFcnJvcignQ2FuXFwndCBjcmVhdGUgZXF1YWxpdHlWYWx1ZVNlbGVjdG9yIGZvciBvcGVyYXRvciBvYmplY3QnKTtcbiAgfVxuXG4gIC8vIFNwZWNpYWwtY2FzZTogbnVsbCBhbmQgdW5kZWZpbmVkIGFyZSBlcXVhbCAoaWYgeW91IGdvdCB1bmRlZmluZWQgaW4gdGhlcmVcbiAgLy8gc29tZXdoZXJlLCBvciBpZiB5b3UgZ290IGl0IGR1ZSB0byBzb21lIGJyYW5jaCBiZWluZyBub24tZXhpc3RlbnQgaW4gdGhlXG4gIC8vIHdlaXJkIHNwZWNpYWwgY2FzZSksIGV2ZW4gdGhvdWdoIHRoZXkgYXJlbid0IHdpdGggRUpTT04uZXF1YWxzLlxuICAvLyB1bmRlZmluZWQgb3IgbnVsbFxuICBpZiAoZWxlbWVudFNlbGVjdG9yID09IG51bGwpIHtcbiAgICByZXR1cm4gdmFsdWUgPT4gdmFsdWUgPT0gbnVsbDtcbiAgfVxuXG4gIHJldHVybiB2YWx1ZSA9PiBMb2NhbENvbGxlY3Rpb24uX2YuX2VxdWFsKGVsZW1lbnRTZWxlY3RvciwgdmFsdWUpO1xufVxuXG5mdW5jdGlvbiBldmVyeXRoaW5nTWF0Y2hlcihkb2NPckJyYW5jaGVkVmFsdWVzKSB7XG4gIHJldHVybiB7cmVzdWx0OiB0cnVlfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4cGFuZEFycmF5c0luQnJhbmNoZXMoYnJhbmNoZXMsIHNraXBUaGVBcnJheXMpIHtcbiAgY29uc3QgYnJhbmNoZXNPdXQgPSBbXTtcblxuICBicmFuY2hlcy5mb3JFYWNoKGJyYW5jaCA9PiB7XG4gICAgY29uc3QgdGhpc0lzQXJyYXkgPSBBcnJheS5pc0FycmF5KGJyYW5jaC52YWx1ZSk7XG5cbiAgICAvLyBXZSBpbmNsdWRlIHRoZSBicmFuY2ggaXRzZWxmLCAqVU5MRVNTKiB3ZSBpdCdzIGFuIGFycmF5IHRoYXQgd2UncmUgZ29pbmdcbiAgICAvLyB0byBpdGVyYXRlIGFuZCB3ZSdyZSB0b2xkIHRvIHNraXAgYXJyYXlzLiAgKFRoYXQncyByaWdodCwgd2UgaW5jbHVkZSBzb21lXG4gICAgLy8gYXJyYXlzIGV2ZW4gc2tpcFRoZUFycmF5cyBpcyB0cnVlOiB0aGVzZSBhcmUgYXJyYXlzIHRoYXQgd2VyZSBmb3VuZCB2aWFcbiAgICAvLyBleHBsaWNpdCBudW1lcmljYWwgaW5kaWNlcy4pXG4gICAgaWYgKCEoc2tpcFRoZUFycmF5cyAmJiB0aGlzSXNBcnJheSAmJiAhYnJhbmNoLmRvbnRJdGVyYXRlKSkge1xuICAgICAgYnJhbmNoZXNPdXQucHVzaCh7YXJyYXlJbmRpY2VzOiBicmFuY2guYXJyYXlJbmRpY2VzLCB2YWx1ZTogYnJhbmNoLnZhbHVlfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXNJc0FycmF5ICYmICFicmFuY2guZG9udEl0ZXJhdGUpIHtcbiAgICAgIGJyYW5jaC52YWx1ZS5mb3JFYWNoKCh2YWx1ZSwgaSkgPT4ge1xuICAgICAgICBicmFuY2hlc091dC5wdXNoKHtcbiAgICAgICAgICBhcnJheUluZGljZXM6IChicmFuY2guYXJyYXlJbmRpY2VzIHx8IFtdKS5jb25jYXQoaSksXG4gICAgICAgICAgdmFsdWVcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBicmFuY2hlc091dDtcbn1cblxuLy8gSGVscGVycyBmb3IgJGJpdHNBbGxTZXQvJGJpdHNBbnlTZXQvJGJpdHNBbGxDbGVhci8kYml0c0FueUNsZWFyLlxuZnVuY3Rpb24gZ2V0T3BlcmFuZEJpdG1hc2sob3BlcmFuZCwgc2VsZWN0b3IpIHtcbiAgLy8gbnVtZXJpYyBiaXRtYXNrXG4gIC8vIFlvdSBjYW4gcHJvdmlkZSBhIG51bWVyaWMgYml0bWFzayB0byBiZSBtYXRjaGVkIGFnYWluc3QgdGhlIG9wZXJhbmQgZmllbGQuXG4gIC8vIEl0IG11c3QgYmUgcmVwcmVzZW50YWJsZSBhcyBhIG5vbi1uZWdhdGl2ZSAzMi1iaXQgc2lnbmVkIGludGVnZXIuXG4gIC8vIE90aGVyd2lzZSwgJGJpdHNBbGxTZXQgd2lsbCByZXR1cm4gYW4gZXJyb3IuXG4gIGlmIChOdW1iZXIuaXNJbnRlZ2VyKG9wZXJhbmQpICYmIG9wZXJhbmQgPj0gMCkge1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShuZXcgSW50MzJBcnJheShbb3BlcmFuZF0pLmJ1ZmZlcik7XG4gIH1cblxuICAvLyBiaW5kYXRhIGJpdG1hc2tcbiAgLy8gWW91IGNhbiBhbHNvIHVzZSBhbiBhcmJpdHJhcmlseSBsYXJnZSBCaW5EYXRhIGluc3RhbmNlIGFzIGEgYml0bWFzay5cbiAgaWYgKEVKU09OLmlzQmluYXJ5KG9wZXJhbmQpKSB7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KG9wZXJhbmQuYnVmZmVyKTtcbiAgfVxuXG4gIC8vIHBvc2l0aW9uIGxpc3RcbiAgLy8gSWYgcXVlcnlpbmcgYSBsaXN0IG9mIGJpdCBwb3NpdGlvbnMsIGVhY2ggPHBvc2l0aW9uPiBtdXN0IGJlIGEgbm9uLW5lZ2F0aXZlXG4gIC8vIGludGVnZXIuIEJpdCBwb3NpdGlvbnMgc3RhcnQgYXQgMCBmcm9tIHRoZSBsZWFzdCBzaWduaWZpY2FudCBiaXQuXG4gIGlmIChBcnJheS5pc0FycmF5KG9wZXJhbmQpICYmXG4gICAgICBvcGVyYW5kLmV2ZXJ5KHggPT4gTnVtYmVyLmlzSW50ZWdlcih4KSAmJiB4ID49IDApKSB7XG4gICAgY29uc3QgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKChNYXRoLm1heCguLi5vcGVyYW5kKSA+PiAzKSArIDEpO1xuICAgIGNvbnN0IHZpZXcgPSBuZXcgVWludDhBcnJheShidWZmZXIpO1xuXG4gICAgb3BlcmFuZC5mb3JFYWNoKHggPT4ge1xuICAgICAgdmlld1t4ID4+IDNdIHw9IDEgPDwgKHggJiAweDcpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHZpZXc7XG4gIH1cblxuICAvLyBiYWQgb3BlcmFuZFxuICB0aHJvdyBFcnJvcihcbiAgICBgb3BlcmFuZCB0byAke3NlbGVjdG9yfSBtdXN0IGJlIGEgbnVtZXJpYyBiaXRtYXNrIChyZXByZXNlbnRhYmxlIGFzIGEgYCArXG4gICAgJ25vbi1uZWdhdGl2ZSAzMi1iaXQgc2lnbmVkIGludGVnZXIpLCBhIGJpbmRhdGEgYml0bWFzayBvciBhbiBhcnJheSB3aXRoICcgK1xuICAgICdiaXQgcG9zaXRpb25zIChub24tbmVnYXRpdmUgaW50ZWdlcnMpJ1xuICApO1xufVxuXG5mdW5jdGlvbiBnZXRWYWx1ZUJpdG1hc2sodmFsdWUsIGxlbmd0aCkge1xuICAvLyBUaGUgZmllbGQgdmFsdWUgbXVzdCBiZSBlaXRoZXIgbnVtZXJpY2FsIG9yIGEgQmluRGF0YSBpbnN0YW5jZS4gT3RoZXJ3aXNlLFxuICAvLyAkYml0cy4uLiB3aWxsIG5vdCBtYXRjaCB0aGUgY3VycmVudCBkb2N1bWVudC5cblxuICAvLyBudW1lcmljYWxcbiAgaWYgKE51bWJlci5pc1NhZmVJbnRlZ2VyKHZhbHVlKSkge1xuICAgIC8vICRiaXRzLi4uIHdpbGwgbm90IG1hdGNoIG51bWVyaWNhbCB2YWx1ZXMgdGhhdCBjYW5ub3QgYmUgcmVwcmVzZW50ZWQgYXMgYVxuICAgIC8vIHNpZ25lZCA2NC1iaXQgaW50ZWdlci4gVGhpcyBjYW4gYmUgdGhlIGNhc2UgaWYgYSB2YWx1ZSBpcyBlaXRoZXIgdG9vXG4gICAgLy8gbGFyZ2Ugb3Igc21hbGwgdG8gZml0IGluIGEgc2lnbmVkIDY0LWJpdCBpbnRlZ2VyLCBvciBpZiBpdCBoYXMgYVxuICAgIC8vIGZyYWN0aW9uYWwgY29tcG9uZW50LlxuICAgIGNvbnN0IGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihcbiAgICAgIE1hdGgubWF4KGxlbmd0aCwgMiAqIFVpbnQzMkFycmF5LkJZVEVTX1BFUl9FTEVNRU5UKVxuICAgICk7XG5cbiAgICBsZXQgdmlldyA9IG5ldyBVaW50MzJBcnJheShidWZmZXIsIDAsIDIpO1xuICAgIHZpZXdbMF0gPSB2YWx1ZSAlICgoMSA8PCAxNikgKiAoMSA8PCAxNikpIHwgMDtcbiAgICB2aWV3WzFdID0gdmFsdWUgLyAoKDEgPDwgMTYpICogKDEgPDwgMTYpKSB8IDA7XG5cbiAgICAvLyBzaWduIGV4dGVuc2lvblxuICAgIGlmICh2YWx1ZSA8IDApIHtcbiAgICAgIHZpZXcgPSBuZXcgVWludDhBcnJheShidWZmZXIsIDIpO1xuICAgICAgdmlldy5mb3JFYWNoKChieXRlLCBpKSA9PiB7XG4gICAgICAgIHZpZXdbaV0gPSAweGZmO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gIH1cblxuICAvLyBiaW5kYXRhXG4gIGlmIChFSlNPTi5pc0JpbmFyeSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkodmFsdWUuYnVmZmVyKTtcbiAgfVxuXG4gIC8vIG5vIG1hdGNoXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLy8gQWN0dWFsbHkgaW5zZXJ0cyBhIGtleSB2YWx1ZSBpbnRvIHRoZSBzZWxlY3RvciBkb2N1bWVudFxuLy8gSG93ZXZlciwgdGhpcyBjaGVja3MgdGhlcmUgaXMgbm8gYW1iaWd1aXR5IGluIHNldHRpbmdcbi8vIHRoZSB2YWx1ZSBmb3IgdGhlIGdpdmVuIGtleSwgdGhyb3dzIG90aGVyd2lzZVxuZnVuY3Rpb24gaW5zZXJ0SW50b0RvY3VtZW50KGRvY3VtZW50LCBrZXksIHZhbHVlKSB7XG4gIE9iamVjdC5rZXlzKGRvY3VtZW50KS5mb3JFYWNoKGV4aXN0aW5nS2V5ID0+IHtcbiAgICBpZiAoXG4gICAgICAoZXhpc3RpbmdLZXkubGVuZ3RoID4ga2V5Lmxlbmd0aCAmJiBleGlzdGluZ0tleS5pbmRleE9mKGAke2tleX0uYCkgPT09IDApIHx8XG4gICAgICAoa2V5Lmxlbmd0aCA+IGV4aXN0aW5nS2V5Lmxlbmd0aCAmJiBrZXkuaW5kZXhPZihgJHtleGlzdGluZ0tleX0uYCkgPT09IDApXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBjYW5ub3QgaW5mZXIgcXVlcnkgZmllbGRzIHRvIHNldCwgYm90aCBwYXRocyAnJHtleGlzdGluZ0tleX0nIGFuZCBgICtcbiAgICAgICAgYCcke2tleX0nIGFyZSBtYXRjaGVkYFxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKGV4aXN0aW5nS2V5ID09PSBrZXkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYGNhbm5vdCBpbmZlciBxdWVyeSBmaWVsZHMgdG8gc2V0LCBwYXRoICcke2tleX0nIGlzIG1hdGNoZWQgdHdpY2VgXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgZG9jdW1lbnRba2V5XSA9IHZhbHVlO1xufVxuXG4vLyBSZXR1cm5zIGEgYnJhbmNoZWQgbWF0Y2hlciB0aGF0IG1hdGNoZXMgaWZmIHRoZSBnaXZlbiBtYXRjaGVyIGRvZXMgbm90LlxuLy8gTm90ZSB0aGF0IHRoaXMgaW1wbGljaXRseSBcImRlTW9yZ2FuaXplc1wiIHRoZSB3cmFwcGVkIGZ1bmN0aW9uLiAgaWUsIGl0XG4vLyBtZWFucyB0aGF0IEFMTCBicmFuY2ggdmFsdWVzIG5lZWQgdG8gZmFpbCB0byBtYXRjaCBpbm5lckJyYW5jaGVkTWF0Y2hlci5cbmZ1bmN0aW9uIGludmVydEJyYW5jaGVkTWF0Y2hlcihicmFuY2hlZE1hdGNoZXIpIHtcbiAgcmV0dXJuIGJyYW5jaFZhbHVlcyA9PiB7XG4gICAgLy8gV2UgZXhwbGljaXRseSBjaG9vc2UgdG8gc3RyaXAgYXJyYXlJbmRpY2VzIGhlcmU6IGl0IGRvZXNuJ3QgbWFrZSBzZW5zZSB0b1xuICAgIC8vIHNheSBcInVwZGF0ZSB0aGUgYXJyYXkgZWxlbWVudCB0aGF0IGRvZXMgbm90IG1hdGNoIHNvbWV0aGluZ1wiLCBhdCBsZWFzdFxuICAgIC8vIGluIG1vbmdvLWxhbmQuXG4gICAgcmV0dXJuIHtyZXN1bHQ6ICFicmFuY2hlZE1hdGNoZXIoYnJhbmNoVmFsdWVzKS5yZXN1bHR9O1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJbmRleGFibGUob2JqKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KG9iaikgfHwgTG9jYWxDb2xsZWN0aW9uLl9pc1BsYWluT2JqZWN0KG9iaik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc051bWVyaWNLZXkocykge1xuICByZXR1cm4gL15bMC05XSskLy50ZXN0KHMpO1xufVxuXG4vLyBSZXR1cm5zIHRydWUgaWYgdGhpcyBpcyBhbiBvYmplY3Qgd2l0aCBhdCBsZWFzdCBvbmUga2V5IGFuZCBhbGwga2V5cyBiZWdpblxuLy8gd2l0aCAkLiAgVW5sZXNzIGluY29uc2lzdGVudE9LIGlzIHNldCwgdGhyb3dzIGlmIHNvbWUga2V5cyBiZWdpbiB3aXRoICQgYW5kXG4vLyBvdGhlcnMgZG9uJ3QuXG5leHBvcnQgZnVuY3Rpb24gaXNPcGVyYXRvck9iamVjdCh2YWx1ZVNlbGVjdG9yLCBpbmNvbnNpc3RlbnRPSykge1xuICBpZiAoIUxvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdCh2YWx1ZVNlbGVjdG9yKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGxldCB0aGVzZUFyZU9wZXJhdG9ycyA9IHVuZGVmaW5lZDtcbiAgT2JqZWN0LmtleXModmFsdWVTZWxlY3RvcikuZm9yRWFjaChzZWxLZXkgPT4ge1xuICAgIGNvbnN0IHRoaXNJc09wZXJhdG9yID0gc2VsS2V5LnN1YnN0cigwLCAxKSA9PT0gJyQnO1xuXG4gICAgaWYgKHRoZXNlQXJlT3BlcmF0b3JzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoZXNlQXJlT3BlcmF0b3JzID0gdGhpc0lzT3BlcmF0b3I7XG4gICAgfSBlbHNlIGlmICh0aGVzZUFyZU9wZXJhdG9ycyAhPT0gdGhpc0lzT3BlcmF0b3IpIHtcbiAgICAgIGlmICghaW5jb25zaXN0ZW50T0spIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBJbmNvbnNpc3RlbnQgb3BlcmF0b3I6ICR7SlNPTi5zdHJpbmdpZnkodmFsdWVTZWxlY3Rvcil9YFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICB0aGVzZUFyZU9wZXJhdG9ycyA9IGZhbHNlO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuICEhdGhlc2VBcmVPcGVyYXRvcnM7IC8vIHt9IGhhcyBubyBvcGVyYXRvcnNcbn1cblxuLy8gSGVscGVyIGZvciAkbHQvJGd0LyRsdGUvJGd0ZS5cbmZ1bmN0aW9uIG1ha2VJbmVxdWFsaXR5KGNtcFZhbHVlQ29tcGFyYXRvcikge1xuICByZXR1cm4ge1xuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCkge1xuICAgICAgLy8gQXJyYXlzIG5ldmVyIGNvbXBhcmUgZmFsc2Ugd2l0aCBub24tYXJyYXlzIGZvciBhbnkgaW5lcXVhbGl0eS5cbiAgICAgIC8vIFhYWCBUaGlzIHdhcyBiZWhhdmlvciB3ZSBvYnNlcnZlZCBpbiBwcmUtcmVsZWFzZSBNb25nb0RCIDIuNSwgYnV0XG4gICAgICAvLyAgICAgaXQgc2VlbXMgdG8gaGF2ZSBiZWVuIHJldmVydGVkLlxuICAgICAgLy8gICAgIFNlZSBodHRwczovL2ppcmEubW9uZ29kYi5vcmcvYnJvd3NlL1NFUlZFUi0xMTQ0NFxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkob3BlcmFuZCkpIHtcbiAgICAgICAgcmV0dXJuICgpID0+IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyBTcGVjaWFsIGNhc2U6IGNvbnNpZGVyIHVuZGVmaW5lZCBhbmQgbnVsbCB0aGUgc2FtZSAoc28gdHJ1ZSB3aXRoXG4gICAgICAvLyAkZ3RlLyRsdGUpLlxuICAgICAgaWYgKG9wZXJhbmQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBvcGVyYW5kID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgb3BlcmFuZFR5cGUgPSBMb2NhbENvbGxlY3Rpb24uX2YuX3R5cGUob3BlcmFuZCk7XG5cbiAgICAgIHJldHVybiB2YWx1ZSA9PiB7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29tcGFyaXNvbnMgYXJlIG5ldmVyIHRydWUgYW1vbmcgdGhpbmdzIG9mIGRpZmZlcmVudCB0eXBlIChleGNlcHRcbiAgICAgICAgLy8gbnVsbCB2cyB1bmRlZmluZWQpLlxuICAgICAgICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlKHZhbHVlKSAhPT0gb3BlcmFuZFR5cGUpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY21wVmFsdWVDb21wYXJhdG9yKExvY2FsQ29sbGVjdGlvbi5fZi5fY21wKHZhbHVlLCBvcGVyYW5kKSk7XG4gICAgICB9O1xuICAgIH0sXG4gIH07XG59XG5cbi8vIG1ha2VMb29rdXBGdW5jdGlvbihrZXkpIHJldHVybnMgYSBsb29rdXAgZnVuY3Rpb24uXG4vL1xuLy8gQSBsb29rdXAgZnVuY3Rpb24gdGFrZXMgaW4gYSBkb2N1bWVudCBhbmQgcmV0dXJucyBhbiBhcnJheSBvZiBtYXRjaGluZ1xuLy8gYnJhbmNoZXMuICBJZiBubyBhcnJheXMgYXJlIGZvdW5kIHdoaWxlIGxvb2tpbmcgdXAgdGhlIGtleSwgdGhpcyBhcnJheSB3aWxsXG4vLyBoYXZlIGV4YWN0bHkgb25lIGJyYW5jaGVzIChwb3NzaWJseSAndW5kZWZpbmVkJywgaWYgc29tZSBzZWdtZW50IG9mIHRoZSBrZXlcbi8vIHdhcyBub3QgZm91bmQpLlxuLy9cbi8vIElmIGFycmF5cyBhcmUgZm91bmQgaW4gdGhlIG1pZGRsZSwgdGhpcyBjYW4gaGF2ZSBtb3JlIHRoYW4gb25lIGVsZW1lbnQsIHNpbmNlXG4vLyB3ZSAnYnJhbmNoJy4gV2hlbiB3ZSAnYnJhbmNoJywgaWYgdGhlcmUgYXJlIG1vcmUga2V5IHNlZ21lbnRzIHRvIGxvb2sgdXAsXG4vLyB0aGVuIHdlIG9ubHkgcHVyc3VlIGJyYW5jaGVzIHRoYXQgYXJlIHBsYWluIG9iamVjdHMgKG5vdCBhcnJheXMgb3Igc2NhbGFycykuXG4vLyBUaGlzIG1lYW5zIHdlIGNhbiBhY3R1YWxseSBlbmQgdXAgd2l0aCBubyBicmFuY2hlcyFcbi8vXG4vLyBXZSBkbyAqTk9UKiBicmFuY2ggb24gYXJyYXlzIHRoYXQgYXJlIGZvdW5kIGF0IHRoZSBlbmQgKGllLCBhdCB0aGUgbGFzdFxuLy8gZG90dGVkIG1lbWJlciBvZiB0aGUga2V5KS4gV2UganVzdCByZXR1cm4gdGhhdCBhcnJheTsgaWYgeW91IHdhbnQgdG9cbi8vIGVmZmVjdGl2ZWx5ICdicmFuY2gnIG92ZXIgdGhlIGFycmF5J3MgdmFsdWVzLCBwb3N0LXByb2Nlc3MgdGhlIGxvb2t1cFxuLy8gZnVuY3Rpb24gd2l0aCBleHBhbmRBcnJheXNJbkJyYW5jaGVzLlxuLy9cbi8vIEVhY2ggYnJhbmNoIGlzIGFuIG9iamVjdCB3aXRoIGtleXM6XG4vLyAgLSB2YWx1ZTogdGhlIHZhbHVlIGF0IHRoZSBicmFuY2hcbi8vICAtIGRvbnRJdGVyYXRlOiBhbiBvcHRpb25hbCBib29sOyBpZiB0cnVlLCBpdCBtZWFucyB0aGF0ICd2YWx1ZScgaXMgYW4gYXJyYXlcbi8vICAgIHRoYXQgZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyBzaG91bGQgTk9UIGV4cGFuZC4gVGhpcyBzcGVjaWZpY2FsbHkgaGFwcGVuc1xuLy8gICAgd2hlbiB0aGVyZSBpcyBhIG51bWVyaWMgaW5kZXggaW4gdGhlIGtleSwgYW5kIGVuc3VyZXMgdGhlXG4vLyAgICBwZXJoYXBzLXN1cnByaXNpbmcgTW9uZ29EQiBiZWhhdmlvciB3aGVyZSB7J2EuMCc6IDV9IGRvZXMgTk9UXG4vLyAgICBtYXRjaCB7YTogW1s1XV19LlxuLy8gIC0gYXJyYXlJbmRpY2VzOiBpZiBhbnkgYXJyYXkgaW5kZXhpbmcgd2FzIGRvbmUgZHVyaW5nIGxvb2t1cCAoZWl0aGVyIGR1ZSB0b1xuLy8gICAgZXhwbGljaXQgbnVtZXJpYyBpbmRpY2VzIG9yIGltcGxpY2l0IGJyYW5jaGluZyksIHRoaXMgd2lsbCBiZSBhbiBhcnJheSBvZlxuLy8gICAgdGhlIGFycmF5IGluZGljZXMgdXNlZCwgZnJvbSBvdXRlcm1vc3QgdG8gaW5uZXJtb3N0OyBpdCBpcyBmYWxzZXkgb3Jcbi8vICAgIGFic2VudCBpZiBubyBhcnJheSBpbmRleCBpcyB1c2VkLiBJZiBhbiBleHBsaWNpdCBudW1lcmljIGluZGV4IGlzIHVzZWQsXG4vLyAgICB0aGUgaW5kZXggd2lsbCBiZSBmb2xsb3dlZCBpbiBhcnJheUluZGljZXMgYnkgdGhlIHN0cmluZyAneCcuXG4vL1xuLy8gICAgTm90ZTogYXJyYXlJbmRpY2VzIGlzIHVzZWQgZm9yIHR3byBwdXJwb3Nlcy4gRmlyc3QsIGl0IGlzIHVzZWQgdG9cbi8vICAgIGltcGxlbWVudCB0aGUgJyQnIG1vZGlmaWVyIGZlYXR1cmUsIHdoaWNoIG9ubHkgZXZlciBsb29rcyBhdCBpdHMgZmlyc3Rcbi8vICAgIGVsZW1lbnQuXG4vL1xuLy8gICAgU2Vjb25kLCBpdCBpcyB1c2VkIGZvciBzb3J0IGtleSBnZW5lcmF0aW9uLCB3aGljaCBuZWVkcyB0byBiZSBhYmxlIHRvIHRlbGxcbi8vICAgIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gZGlmZmVyZW50IHBhdGhzLiBNb3Jlb3ZlciwgaXQgbmVlZHMgdG9cbi8vICAgIGRpZmZlcmVudGlhdGUgYmV0d2VlbiBleHBsaWNpdCBhbmQgaW1wbGljaXQgYnJhbmNoaW5nLCB3aGljaCBpcyB3aHlcbi8vICAgIHRoZXJlJ3MgdGhlIHNvbWV3aGF0IGhhY2t5ICd4JyBlbnRyeTogdGhpcyBtZWFucyB0aGF0IGV4cGxpY2l0IGFuZFxuLy8gICAgaW1wbGljaXQgYXJyYXkgbG9va3VwcyB3aWxsIGhhdmUgZGlmZmVyZW50IGZ1bGwgYXJyYXlJbmRpY2VzIHBhdGhzLiAoVGhhdFxuLy8gICAgY29kZSBvbmx5IHJlcXVpcmVzIHRoYXQgZGlmZmVyZW50IHBhdGhzIGhhdmUgZGlmZmVyZW50IGFycmF5SW5kaWNlczsgaXRcbi8vICAgIGRvZXNuJ3QgYWN0dWFsbHkgJ3BhcnNlJyBhcnJheUluZGljZXMuIEFzIGFuIGFsdGVybmF0aXZlLCBhcnJheUluZGljZXNcbi8vICAgIGNvdWxkIGNvbnRhaW4gb2JqZWN0cyB3aXRoIGZsYWdzIGxpa2UgJ2ltcGxpY2l0JywgYnV0IEkgdGhpbmsgdGhhdCBvbmx5XG4vLyAgICBtYWtlcyB0aGUgY29kZSBzdXJyb3VuZGluZyB0aGVtIG1vcmUgY29tcGxleC4pXG4vL1xuLy8gICAgKEJ5IHRoZSB3YXksIHRoaXMgZmllbGQgZW5kcyB1cCBnZXR0aW5nIHBhc3NlZCBhcm91bmQgYSBsb3Qgd2l0aG91dFxuLy8gICAgY2xvbmluZywgc28gbmV2ZXIgbXV0YXRlIGFueSBhcnJheUluZGljZXMgZmllbGQvdmFyIGluIHRoaXMgcGFja2FnZSEpXG4vL1xuLy9cbi8vIEF0IHRoZSB0b3AgbGV2ZWwsIHlvdSBtYXkgb25seSBwYXNzIGluIGEgcGxhaW4gb2JqZWN0IG9yIGFycmF5LlxuLy9cbi8vIFNlZSB0aGUgdGVzdCAnbWluaW1vbmdvIC0gbG9va3VwJyBmb3Igc29tZSBleGFtcGxlcyBvZiB3aGF0IGxvb2t1cCBmdW5jdGlvbnNcbi8vIHJldHVybi5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlTG9va3VwRnVuY3Rpb24oa2V5LCBvcHRpb25zID0ge30pIHtcbiAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQoJy4nKTtcbiAgY29uc3QgZmlyc3RQYXJ0ID0gcGFydHMubGVuZ3RoID8gcGFydHNbMF0gOiAnJztcbiAgY29uc3QgbG9va3VwUmVzdCA9IChcbiAgICBwYXJ0cy5sZW5ndGggPiAxICYmXG4gICAgbWFrZUxvb2t1cEZ1bmN0aW9uKHBhcnRzLnNsaWNlKDEpLmpvaW4oJy4nKSlcbiAgKTtcblxuICBjb25zdCBvbWl0VW5uZWNlc3NhcnlGaWVsZHMgPSByZXN1bHQgPT4ge1xuICAgIGlmICghcmVzdWx0LmRvbnRJdGVyYXRlKSB7XG4gICAgICBkZWxldGUgcmVzdWx0LmRvbnRJdGVyYXRlO1xuICAgIH1cblxuICAgIGlmIChyZXN1bHQuYXJyYXlJbmRpY2VzICYmICFyZXN1bHQuYXJyYXlJbmRpY2VzLmxlbmd0aCkge1xuICAgICAgZGVsZXRlIHJlc3VsdC5hcnJheUluZGljZXM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBEb2Mgd2lsbCBhbHdheXMgYmUgYSBwbGFpbiBvYmplY3Qgb3IgYW4gYXJyYXkuXG4gIC8vIGFwcGx5IGFuIGV4cGxpY2l0IG51bWVyaWMgaW5kZXgsIGFuIGFycmF5LlxuICByZXR1cm4gKGRvYywgYXJyYXlJbmRpY2VzID0gW10pID0+IHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkb2MpKSB7XG4gICAgICAvLyBJZiB3ZSdyZSBiZWluZyBhc2tlZCB0byBkbyBhbiBpbnZhbGlkIGxvb2t1cCBpbnRvIGFuIGFycmF5IChub24taW50ZWdlclxuICAgICAgLy8gb3Igb3V0LW9mLWJvdW5kcyksIHJldHVybiBubyByZXN1bHRzICh3aGljaCBpcyBkaWZmZXJlbnQgZnJvbSByZXR1cm5pbmdcbiAgICAgIC8vIGEgc2luZ2xlIHVuZGVmaW5lZCByZXN1bHQsIGluIHRoYXQgYG51bGxgIGVxdWFsaXR5IGNoZWNrcyB3b24ndCBtYXRjaCkuXG4gICAgICBpZiAoIShpc051bWVyaWNLZXkoZmlyc3RQYXJ0KSAmJiBmaXJzdFBhcnQgPCBkb2MubGVuZ3RoKSkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgICB9XG5cbiAgICAgIC8vIFJlbWVtYmVyIHRoYXQgd2UgdXNlZCB0aGlzIGFycmF5IGluZGV4LiBJbmNsdWRlIGFuICd4JyB0byBpbmRpY2F0ZSB0aGF0XG4gICAgICAvLyB0aGUgcHJldmlvdXMgaW5kZXggY2FtZSBmcm9tIGJlaW5nIGNvbnNpZGVyZWQgYXMgYW4gZXhwbGljaXQgYXJyYXlcbiAgICAgIC8vIGluZGV4IChub3QgYnJhbmNoaW5nKS5cbiAgICAgIGFycmF5SW5kaWNlcyA9IGFycmF5SW5kaWNlcy5jb25jYXQoK2ZpcnN0UGFydCwgJ3gnKTtcbiAgICB9XG5cbiAgICAvLyBEbyBvdXIgZmlyc3QgbG9va3VwLlxuICAgIGNvbnN0IGZpcnN0TGV2ZWwgPSBkb2NbZmlyc3RQYXJ0XTtcblxuICAgIC8vIElmIHRoZXJlIGlzIG5vIGRlZXBlciB0byBkaWcsIHJldHVybiB3aGF0IHdlIGZvdW5kLlxuICAgIC8vXG4gICAgLy8gSWYgd2hhdCB3ZSBmb3VuZCBpcyBhbiBhcnJheSwgbW9zdCB2YWx1ZSBzZWxlY3RvcnMgd2lsbCBjaG9vc2UgdG8gdHJlYXRcbiAgICAvLyB0aGUgZWxlbWVudHMgb2YgdGhlIGFycmF5IGFzIG1hdGNoYWJsZSB2YWx1ZXMgaW4gdGhlaXIgb3duIHJpZ2h0LCBidXRcbiAgICAvLyB0aGF0J3MgZG9uZSBvdXRzaWRlIG9mIHRoZSBsb29rdXAgZnVuY3Rpb24uIChFeGNlcHRpb25zIHRvIHRoaXMgYXJlICRzaXplXG4gICAgLy8gYW5kIHN0dWZmIHJlbGF0aW5nIHRvICRlbGVtTWF0Y2guICBlZywge2E6IHskc2l6ZTogMn19IGRvZXMgbm90IG1hdGNoIHthOlxuICAgIC8vIFtbMSwgMl1dfS4pXG4gICAgLy9cbiAgICAvLyBUaGF0IHNhaWQsIGlmIHdlIGp1c3QgZGlkIGFuICpleHBsaWNpdCogYXJyYXkgbG9va3VwIChvbiBkb2MpIHRvIGZpbmRcbiAgICAvLyBmaXJzdExldmVsLCBhbmQgZmlyc3RMZXZlbCBpcyBhbiBhcnJheSB0b28sIHdlIGRvIE5PVCB3YW50IHZhbHVlXG4gICAgLy8gc2VsZWN0b3JzIHRvIGl0ZXJhdGUgb3ZlciBpdC4gIGVnLCB7J2EuMCc6IDV9IGRvZXMgbm90IG1hdGNoIHthOiBbWzVdXX0uXG4gICAgLy8gU28gaW4gdGhhdCBjYXNlLCB3ZSBtYXJrIHRoZSByZXR1cm4gdmFsdWUgYXMgJ2Rvbid0IGl0ZXJhdGUnLlxuICAgIGlmICghbG9va3VwUmVzdCkge1xuICAgICAgcmV0dXJuIFtvbWl0VW5uZWNlc3NhcnlGaWVsZHMoe1xuICAgICAgICBhcnJheUluZGljZXMsXG4gICAgICAgIGRvbnRJdGVyYXRlOiBBcnJheS5pc0FycmF5KGRvYykgJiYgQXJyYXkuaXNBcnJheShmaXJzdExldmVsKSxcbiAgICAgICAgdmFsdWU6IGZpcnN0TGV2ZWxcbiAgICAgIH0pXTtcbiAgICB9XG5cbiAgICAvLyBXZSBuZWVkIHRvIGRpZyBkZWVwZXIuICBCdXQgaWYgd2UgY2FuJ3QsIGJlY2F1c2Ugd2hhdCB3ZSd2ZSBmb3VuZCBpcyBub3RcbiAgICAvLyBhbiBhcnJheSBvciBwbGFpbiBvYmplY3QsIHdlJ3JlIGRvbmUuIElmIHdlIGp1c3QgZGlkIGEgbnVtZXJpYyBpbmRleCBpbnRvXG4gICAgLy8gYW4gYXJyYXksIHdlIHJldHVybiBub3RoaW5nIGhlcmUgKHRoaXMgaXMgYSBjaGFuZ2UgaW4gTW9uZ28gMi41IGZyb21cbiAgICAvLyBNb25nbyAyLjQsIHdoZXJlIHsnYS4wLmInOiBudWxsfSBzdG9wcGVkIG1hdGNoaW5nIHthOiBbNV19KS4gT3RoZXJ3aXNlLFxuICAgIC8vIHJldHVybiBhIHNpbmdsZSBgdW5kZWZpbmVkYCAod2hpY2ggY2FuLCBmb3IgZXhhbXBsZSwgbWF0Y2ggdmlhIGVxdWFsaXR5XG4gICAgLy8gd2l0aCBgbnVsbGApLlxuICAgIGlmICghaXNJbmRleGFibGUoZmlyc3RMZXZlbCkpIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGRvYykpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gW29taXRVbm5lY2Vzc2FyeUZpZWxkcyh7YXJyYXlJbmRpY2VzLCB2YWx1ZTogdW5kZWZpbmVkfSldO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IFtdO1xuICAgIGNvbnN0IGFwcGVuZFRvUmVzdWx0ID0gbW9yZSA9PiB7XG4gICAgICByZXN1bHQucHVzaCguLi5tb3JlKTtcbiAgICB9O1xuXG4gICAgLy8gRGlnIGRlZXBlcjogbG9vayB1cCB0aGUgcmVzdCBvZiB0aGUgcGFydHMgb24gd2hhdGV2ZXIgd2UndmUgZm91bmQuXG4gICAgLy8gKGxvb2t1cFJlc3QgaXMgc21hcnQgZW5vdWdoIHRvIG5vdCB0cnkgdG8gZG8gaW52YWxpZCBsb29rdXBzIGludG9cbiAgICAvLyBmaXJzdExldmVsIGlmIGl0J3MgYW4gYXJyYXkuKVxuICAgIGFwcGVuZFRvUmVzdWx0KGxvb2t1cFJlc3QoZmlyc3RMZXZlbCwgYXJyYXlJbmRpY2VzKSk7XG5cbiAgICAvLyBJZiB3ZSBmb3VuZCBhbiBhcnJheSwgdGhlbiBpbiAqYWRkaXRpb24qIHRvIHBvdGVudGlhbGx5IHRyZWF0aW5nIHRoZSBuZXh0XG4gICAgLy8gcGFydCBhcyBhIGxpdGVyYWwgaW50ZWdlciBsb29rdXAsIHdlIHNob3VsZCBhbHNvICdicmFuY2gnOiB0cnkgdG8gbG9vayB1cFxuICAgIC8vIHRoZSByZXN0IG9mIHRoZSBwYXJ0cyBvbiBlYWNoIGFycmF5IGVsZW1lbnQgaW4gcGFyYWxsZWwuXG4gICAgLy9cbiAgICAvLyBJbiB0aGlzIGNhc2UsIHdlICpvbmx5KiBkaWcgZGVlcGVyIGludG8gYXJyYXkgZWxlbWVudHMgdGhhdCBhcmUgcGxhaW5cbiAgICAvLyBvYmplY3RzLiAoUmVjYWxsIHRoYXQgd2Ugb25seSBnb3QgdGhpcyBmYXIgaWYgd2UgaGF2ZSBmdXJ0aGVyIHRvIGRpZy4pXG4gICAgLy8gVGhpcyBtYWtlcyBzZW5zZTogd2UgY2VydGFpbmx5IGRvbid0IGRpZyBkZWVwZXIgaW50byBub24taW5kZXhhYmxlXG4gICAgLy8gb2JqZWN0cy4gQW5kIGl0IHdvdWxkIGJlIHdlaXJkIHRvIGRpZyBpbnRvIGFuIGFycmF5OiBpdCdzIHNpbXBsZXIgdG8gaGF2ZVxuICAgIC8vIGEgcnVsZSB0aGF0IGV4cGxpY2l0IGludGVnZXIgaW5kZXhlcyBvbmx5IGFwcGx5IHRvIGFuIG91dGVyIGFycmF5LCBub3QgdG9cbiAgICAvLyBhbiBhcnJheSB5b3UgZmluZCBhZnRlciBhIGJyYW5jaGluZyBzZWFyY2guXG4gICAgLy9cbiAgICAvLyBJbiB0aGUgc3BlY2lhbCBjYXNlIG9mIGEgbnVtZXJpYyBwYXJ0IGluIGEgKnNvcnQgc2VsZWN0b3IqIChub3QgYSBxdWVyeVxuICAgIC8vIHNlbGVjdG9yKSwgd2Ugc2tpcCB0aGUgYnJhbmNoaW5nOiB3ZSBPTkxZIGFsbG93IHRoZSBudW1lcmljIHBhcnQgdG8gbWVhblxuICAgIC8vICdsb29rIHVwIHRoaXMgaW5kZXgnIGluIHRoYXQgY2FzZSwgbm90ICdhbHNvIGxvb2sgdXAgdGhpcyBpbmRleCBpbiBhbGxcbiAgICAvLyB0aGUgZWxlbWVudHMgb2YgdGhlIGFycmF5Jy5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShmaXJzdExldmVsKSAmJlxuICAgICAgICAhKGlzTnVtZXJpY0tleShwYXJ0c1sxXSkgJiYgb3B0aW9ucy5mb3JTb3J0KSkge1xuICAgICAgZmlyc3RMZXZlbC5mb3JFYWNoKChicmFuY2gsIGFycmF5SW5kZXgpID0+IHtcbiAgICAgICAgaWYgKExvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChicmFuY2gpKSB7XG4gICAgICAgICAgYXBwZW5kVG9SZXN1bHQobG9va3VwUmVzdChicmFuY2gsIGFycmF5SW5kaWNlcy5jb25jYXQoYXJyYXlJbmRleCkpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn1cblxuLy8gT2JqZWN0IGV4cG9ydGVkIG9ubHkgZm9yIHVuaXQgdGVzdGluZy5cbi8vIFVzZSBpdCB0byBleHBvcnQgcHJpdmF0ZSBmdW5jdGlvbnMgdG8gdGVzdCBpbiBUaW55dGVzdC5cbk1pbmltb25nb1Rlc3QgPSB7bWFrZUxvb2t1cEZ1bmN0aW9ufTtcbk1pbmltb25nb0Vycm9yID0gKG1lc3NhZ2UsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBpZiAodHlwZW9mIG1lc3NhZ2UgPT09ICdzdHJpbmcnICYmIG9wdGlvbnMuZmllbGQpIHtcbiAgICBtZXNzYWdlICs9IGAgZm9yIGZpZWxkICcke29wdGlvbnMuZmllbGR9J2A7XG4gIH1cblxuICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgZXJyb3IubmFtZSA9ICdNaW5pbW9uZ29FcnJvcic7XG4gIHJldHVybiBlcnJvcjtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBub3RoaW5nTWF0Y2hlcihkb2NPckJyYW5jaGVkVmFsdWVzKSB7XG4gIHJldHVybiB7cmVzdWx0OiBmYWxzZX07XG59XG5cbi8vIFRha2VzIGFuIG9wZXJhdG9yIG9iamVjdCAoYW4gb2JqZWN0IHdpdGggJCBrZXlzKSBhbmQgcmV0dXJucyBhIGJyYW5jaGVkXG4vLyBtYXRjaGVyIGZvciBpdC5cbmZ1bmN0aW9uIG9wZXJhdG9yQnJhbmNoZWRNYXRjaGVyKHZhbHVlU2VsZWN0b3IsIG1hdGNoZXIsIGlzUm9vdCkge1xuICAvLyBFYWNoIHZhbHVlU2VsZWN0b3Igd29ya3Mgc2VwYXJhdGVseSBvbiB0aGUgdmFyaW91cyBicmFuY2hlcy4gIFNvIG9uZVxuICAvLyBvcGVyYXRvciBjYW4gbWF0Y2ggb25lIGJyYW5jaCBhbmQgYW5vdGhlciBjYW4gbWF0Y2ggYW5vdGhlciBicmFuY2guICBUaGlzXG4gIC8vIGlzIE9LLlxuICBjb25zdCBvcGVyYXRvck1hdGNoZXJzID0gT2JqZWN0LmtleXModmFsdWVTZWxlY3RvcikubWFwKG9wZXJhdG9yID0+IHtcbiAgICBjb25zdCBvcGVyYW5kID0gdmFsdWVTZWxlY3RvcltvcGVyYXRvcl07XG5cbiAgICBjb25zdCBzaW1wbGVSYW5nZSA9IChcbiAgICAgIFsnJGx0JywgJyRsdGUnLCAnJGd0JywgJyRndGUnXS5pbmNsdWRlcyhvcGVyYXRvcikgJiZcbiAgICAgIHR5cGVvZiBvcGVyYW5kID09PSAnbnVtYmVyJ1xuICAgICk7XG5cbiAgICBjb25zdCBzaW1wbGVFcXVhbGl0eSA9IChcbiAgICAgIFsnJG5lJywgJyRlcSddLmluY2x1ZGVzKG9wZXJhdG9yKSAmJlxuICAgICAgb3BlcmFuZCAhPT0gT2JqZWN0KG9wZXJhbmQpXG4gICAgKTtcblxuICAgIGNvbnN0IHNpbXBsZUluY2x1c2lvbiA9IChcbiAgICAgIFsnJGluJywgJyRuaW4nXS5pbmNsdWRlcyhvcGVyYXRvcilcbiAgICAgICYmIEFycmF5LmlzQXJyYXkob3BlcmFuZClcbiAgICAgICYmICFvcGVyYW5kLnNvbWUoeCA9PiB4ID09PSBPYmplY3QoeCkpXG4gICAgKTtcblxuICAgIGlmICghKHNpbXBsZVJhbmdlIHx8IHNpbXBsZUluY2x1c2lvbiB8fCBzaW1wbGVFcXVhbGl0eSkpIHtcbiAgICAgIG1hdGNoZXIuX2lzU2ltcGxlID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKGhhc093bi5jYWxsKFZBTFVFX09QRVJBVE9SUywgb3BlcmF0b3IpKSB7XG4gICAgICByZXR1cm4gVkFMVUVfT1BFUkFUT1JTW29wZXJhdG9yXShvcGVyYW5kLCB2YWx1ZVNlbGVjdG9yLCBtYXRjaGVyLCBpc1Jvb3QpO1xuICAgIH1cblxuICAgIGlmIChoYXNPd24uY2FsbChFTEVNRU5UX09QRVJBVE9SUywgb3BlcmF0b3IpKSB7XG4gICAgICBjb25zdCBvcHRpb25zID0gRUxFTUVOVF9PUEVSQVRPUlNbb3BlcmF0b3JdO1xuICAgICAgcmV0dXJuIGNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyKFxuICAgICAgICBvcHRpb25zLmNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCwgdmFsdWVTZWxlY3RvciwgbWF0Y2hlciksXG4gICAgICAgIG9wdGlvbnNcbiAgICAgICk7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKGBVbnJlY29nbml6ZWQgb3BlcmF0b3I6ICR7b3BlcmF0b3J9YCk7XG4gIH0pO1xuXG4gIHJldHVybiBhbmRCcmFuY2hlZE1hdGNoZXJzKG9wZXJhdG9yTWF0Y2hlcnMpO1xufVxuXG4vLyBwYXRocyAtIEFycmF5OiBsaXN0IG9mIG1vbmdvIHN0eWxlIHBhdGhzXG4vLyBuZXdMZWFmRm4gLSBGdW5jdGlvbjogb2YgZm9ybSBmdW5jdGlvbihwYXRoKSBzaG91bGQgcmV0dXJuIGEgc2NhbGFyIHZhbHVlIHRvXG4vLyAgICAgICAgICAgICAgICAgICAgICAgcHV0IGludG8gbGlzdCBjcmVhdGVkIGZvciB0aGF0IHBhdGhcbi8vIGNvbmZsaWN0Rm4gLSBGdW5jdGlvbjogb2YgZm9ybSBmdW5jdGlvbihub2RlLCBwYXRoLCBmdWxsUGF0aCkgaXMgY2FsbGVkXG4vLyAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gYnVpbGRpbmcgYSB0cmVlIHBhdGggZm9yICdmdWxsUGF0aCcgbm9kZSBvblxuLy8gICAgICAgICAgICAgICAgICAgICAgICAncGF0aCcgd2FzIGFscmVhZHkgYSBsZWFmIHdpdGggYSB2YWx1ZS4gTXVzdCByZXR1cm4gYVxuLy8gICAgICAgICAgICAgICAgICAgICAgICBjb25mbGljdCByZXNvbHV0aW9uLlxuLy8gaW5pdGlhbCB0cmVlIC0gT3B0aW9uYWwgT2JqZWN0OiBzdGFydGluZyB0cmVlLlxuLy8gQHJldHVybnMgLSBPYmplY3Q6IHRyZWUgcmVwcmVzZW50ZWQgYXMgYSBzZXQgb2YgbmVzdGVkIG9iamVjdHNcbmV4cG9ydCBmdW5jdGlvbiBwYXRoc1RvVHJlZShwYXRocywgbmV3TGVhZkZuLCBjb25mbGljdEZuLCByb290ID0ge30pIHtcbiAgcGF0aHMuZm9yRWFjaChwYXRoID0+IHtcbiAgICBjb25zdCBwYXRoQXJyYXkgPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgbGV0IHRyZWUgPSByb290O1xuXG4gICAgLy8gdXNlIC5ldmVyeSBqdXN0IGZvciBpdGVyYXRpb24gd2l0aCBicmVha1xuICAgIGNvbnN0IHN1Y2Nlc3MgPSBwYXRoQXJyYXkuc2xpY2UoMCwgLTEpLmV2ZXJ5KChrZXksIGkpID0+IHtcbiAgICAgIGlmICghaGFzT3duLmNhbGwodHJlZSwga2V5KSkge1xuICAgICAgICB0cmVlW2tleV0gPSB7fTtcbiAgICAgIH0gZWxzZSBpZiAodHJlZVtrZXldICE9PSBPYmplY3QodHJlZVtrZXldKSkge1xuICAgICAgICB0cmVlW2tleV0gPSBjb25mbGljdEZuKFxuICAgICAgICAgIHRyZWVba2V5XSxcbiAgICAgICAgICBwYXRoQXJyYXkuc2xpY2UoMCwgaSArIDEpLmpvaW4oJy4nKSxcbiAgICAgICAgICBwYXRoXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gYnJlYWsgb3V0IG9mIGxvb3AgaWYgd2UgYXJlIGZhaWxpbmcgZm9yIHRoaXMgcGF0aFxuICAgICAgICBpZiAodHJlZVtrZXldICE9PSBPYmplY3QodHJlZVtrZXldKSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0cmVlID0gdHJlZVtrZXldO1xuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcblxuICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICBjb25zdCBsYXN0S2V5ID0gcGF0aEFycmF5W3BhdGhBcnJheS5sZW5ndGggLSAxXTtcbiAgICAgIGlmIChoYXNPd24uY2FsbCh0cmVlLCBsYXN0S2V5KSkge1xuICAgICAgICB0cmVlW2xhc3RLZXldID0gY29uZmxpY3RGbih0cmVlW2xhc3RLZXldLCBwYXRoLCBwYXRoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRyZWVbbGFzdEtleV0gPSBuZXdMZWFmRm4ocGF0aCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcm9vdDtcbn1cblxuLy8gTWFrZXMgc3VyZSB3ZSBnZXQgMiBlbGVtZW50cyBhcnJheSBhbmQgYXNzdW1lIHRoZSBmaXJzdCBvbmUgdG8gYmUgeCBhbmRcbi8vIHRoZSBzZWNvbmQgb25lIHRvIHkgbm8gbWF0dGVyIHdoYXQgdXNlciBwYXNzZXMuXG4vLyBJbiBjYXNlIHVzZXIgcGFzc2VzIHsgbG9uOiB4LCBsYXQ6IHkgfSByZXR1cm5zIFt4LCB5XVxuZnVuY3Rpb24gcG9pbnRUb0FycmF5KHBvaW50KSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KHBvaW50KSA/IHBvaW50LnNsaWNlKCkgOiBbcG9pbnQueCwgcG9pbnQueV07XG59XG5cbi8vIENyZWF0aW5nIGEgZG9jdW1lbnQgZnJvbSBhbiB1cHNlcnQgaXMgcXVpdGUgdHJpY2t5LlxuLy8gRS5nLiB0aGlzIHNlbGVjdG9yOiB7XCIkb3JcIjogW3tcImIuZm9vXCI6IHtcIiRhbGxcIjogW1wiYmFyXCJdfX1dfSwgc2hvdWxkIHJlc3VsdFxuLy8gaW46IHtcImIuZm9vXCI6IFwiYmFyXCJ9XG4vLyBCdXQgdGhpcyBzZWxlY3Rvcjoge1wiJG9yXCI6IFt7XCJiXCI6IHtcImZvb1wiOiB7XCIkYWxsXCI6IFtcImJhclwiXX19fV19IHNob3VsZCB0aHJvd1xuLy8gYW4gZXJyb3JcblxuLy8gU29tZSBydWxlcyAoZm91bmQgbWFpbmx5IHdpdGggdHJpYWwgJiBlcnJvciwgc28gdGhlcmUgbWlnaHQgYmUgbW9yZSk6XG4vLyAtIGhhbmRsZSBhbGwgY2hpbGRzIG9mICRhbmQgKG9yIGltcGxpY2l0ICRhbmQpXG4vLyAtIGhhbmRsZSAkb3Igbm9kZXMgd2l0aCBleGFjdGx5IDEgY2hpbGRcbi8vIC0gaWdub3JlICRvciBub2RlcyB3aXRoIG1vcmUgdGhhbiAxIGNoaWxkXG4vLyAtIGlnbm9yZSAkbm9yIGFuZCAkbm90IG5vZGVzXG4vLyAtIHRocm93IHdoZW4gYSB2YWx1ZSBjYW4gbm90IGJlIHNldCB1bmFtYmlndW91c2x5XG4vLyAtIGV2ZXJ5IHZhbHVlIGZvciAkYWxsIHNob3VsZCBiZSBkZWFsdCB3aXRoIGFzIHNlcGFyYXRlICRlcS1zXG4vLyAtIHRocmVhdCBhbGwgY2hpbGRyZW4gb2YgJGFsbCBhcyAkZXEgc2V0dGVycyAoPT4gc2V0IGlmICRhbGwubGVuZ3RoID09PSAxLFxuLy8gICBvdGhlcndpc2UgdGhyb3cgZXJyb3IpXG4vLyAtIHlvdSBjYW4gbm90IG1peCAnJCctcHJlZml4ZWQga2V5cyBhbmQgbm9uLSckJy1wcmVmaXhlZCBrZXlzXG4vLyAtIHlvdSBjYW4gb25seSBoYXZlIGRvdHRlZCBrZXlzIG9uIGEgcm9vdC1sZXZlbFxuLy8gLSB5b3UgY2FuIG5vdCBoYXZlICckJy1wcmVmaXhlZCBrZXlzIG1vcmUgdGhhbiBvbmUtbGV2ZWwgZGVlcCBpbiBhbiBvYmplY3RcblxuLy8gSGFuZGxlcyBvbmUga2V5L3ZhbHVlIHBhaXIgdG8gcHV0IGluIHRoZSBzZWxlY3RvciBkb2N1bWVudFxuZnVuY3Rpb24gcG9wdWxhdGVEb2N1bWVudFdpdGhLZXlWYWx1ZShkb2N1bWVudCwga2V5LCB2YWx1ZSkge1xuICBpZiAodmFsdWUgJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKSA9PT0gT2JqZWN0LnByb3RvdHlwZSkge1xuICAgIHBvcHVsYXRlRG9jdW1lbnRXaXRoT2JqZWN0KGRvY3VtZW50LCBrZXksIHZhbHVlKTtcbiAgfSBlbHNlIGlmICghKHZhbHVlIGluc3RhbmNlb2YgUmVnRXhwKSkge1xuICAgIGluc2VydEludG9Eb2N1bWVudChkb2N1bWVudCwga2V5LCB2YWx1ZSk7XG4gIH1cbn1cblxuLy8gSGFuZGxlcyBhIGtleSwgdmFsdWUgcGFpciB0byBwdXQgaW4gdGhlIHNlbGVjdG9yIGRvY3VtZW50XG4vLyBpZiB0aGUgdmFsdWUgaXMgYW4gb2JqZWN0XG5mdW5jdGlvbiBwb3B1bGF0ZURvY3VtZW50V2l0aE9iamVjdChkb2N1bWVudCwga2V5LCB2YWx1ZSkge1xuICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICBjb25zdCB1bnByZWZpeGVkS2V5cyA9IGtleXMuZmlsdGVyKG9wID0+IG9wWzBdICE9PSAnJCcpO1xuXG4gIGlmICh1bnByZWZpeGVkS2V5cy5sZW5ndGggPiAwIHx8ICFrZXlzLmxlbmd0aCkge1xuICAgIC8vIExpdGVyYWwgKHBvc3NpYmx5IGVtcHR5KSBvYmplY3QgKCBvciBlbXB0eSBvYmplY3QgKVxuICAgIC8vIERvbid0IGFsbG93IG1peGluZyAnJCctcHJlZml4ZWQgd2l0aCBub24tJyQnLXByZWZpeGVkIGZpZWxkc1xuICAgIGlmIChrZXlzLmxlbmd0aCAhPT0gdW5wcmVmaXhlZEtleXMubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHVua25vd24gb3BlcmF0b3I6ICR7dW5wcmVmaXhlZEtleXNbMF19YCk7XG4gICAgfVxuXG4gICAgdmFsaWRhdGVPYmplY3QodmFsdWUsIGtleSk7XG4gICAgaW5zZXJ0SW50b0RvY3VtZW50KGRvY3VtZW50LCBrZXksIHZhbHVlKTtcbiAgfSBlbHNlIHtcbiAgICBPYmplY3Qua2V5cyh2YWx1ZSkuZm9yRWFjaChvcCA9PiB7XG4gICAgICBjb25zdCBvYmplY3QgPSB2YWx1ZVtvcF07XG5cbiAgICAgIGlmIChvcCA9PT0gJyRlcScpIHtcbiAgICAgICAgcG9wdWxhdGVEb2N1bWVudFdpdGhLZXlWYWx1ZShkb2N1bWVudCwga2V5LCBvYmplY3QpO1xuICAgICAgfSBlbHNlIGlmIChvcCA9PT0gJyRhbGwnKSB7XG4gICAgICAgIC8vIGV2ZXJ5IHZhbHVlIGZvciAkYWxsIHNob3VsZCBiZSBkZWFsdCB3aXRoIGFzIHNlcGFyYXRlICRlcS1zXG4gICAgICAgIG9iamVjdC5mb3JFYWNoKGVsZW1lbnQgPT5cbiAgICAgICAgICBwb3B1bGF0ZURvY3VtZW50V2l0aEtleVZhbHVlKGRvY3VtZW50LCBrZXksIGVsZW1lbnQpXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuLy8gRmlsbHMgYSBkb2N1bWVudCB3aXRoIGNlcnRhaW4gZmllbGRzIGZyb20gYW4gdXBzZXJ0IHNlbGVjdG9yXG5leHBvcnQgZnVuY3Rpb24gcG9wdWxhdGVEb2N1bWVudFdpdGhRdWVyeUZpZWxkcyhxdWVyeSwgZG9jdW1lbnQgPSB7fSkge1xuICBpZiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKHF1ZXJ5KSA9PT0gT2JqZWN0LnByb3RvdHlwZSkge1xuICAgIC8vIGhhbmRsZSBpbXBsaWNpdCAkYW5kXG4gICAgT2JqZWN0LmtleXMocXVlcnkpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gcXVlcnlba2V5XTtcblxuICAgICAgaWYgKGtleSA9PT0gJyRhbmQnKSB7XG4gICAgICAgIC8vIGhhbmRsZSBleHBsaWNpdCAkYW5kXG4gICAgICAgIHZhbHVlLmZvckVhY2goZWxlbWVudCA9PlxuICAgICAgICAgIHBvcHVsYXRlRG9jdW1lbnRXaXRoUXVlcnlGaWVsZHMoZWxlbWVudCwgZG9jdW1lbnQpXG4gICAgICAgICk7XG4gICAgICB9IGVsc2UgaWYgKGtleSA9PT0gJyRvcicpIHtcbiAgICAgICAgLy8gaGFuZGxlICRvciBub2RlcyB3aXRoIGV4YWN0bHkgMSBjaGlsZFxuICAgICAgICBpZiAodmFsdWUubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgcG9wdWxhdGVEb2N1bWVudFdpdGhRdWVyeUZpZWxkcyh2YWx1ZVswXSwgZG9jdW1lbnQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGtleVswXSAhPT0gJyQnKSB7XG4gICAgICAgIC8vIElnbm9yZSBvdGhlciAnJCctcHJlZml4ZWQgbG9naWNhbCBzZWxlY3RvcnNcbiAgICAgICAgcG9wdWxhdGVEb2N1bWVudFdpdGhLZXlWYWx1ZShkb2N1bWVudCwga2V5LCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gSGFuZGxlIG1ldGVvci1zcGVjaWZpYyBzaG9ydGN1dCBmb3Igc2VsZWN0aW5nIF9pZFxuICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZChxdWVyeSkpIHtcbiAgICAgIGluc2VydEludG9Eb2N1bWVudChkb2N1bWVudCwgJ19pZCcsIHF1ZXJ5KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZG9jdW1lbnQ7XG59XG5cbi8vIFRyYXZlcnNlcyB0aGUga2V5cyBvZiBwYXNzZWQgcHJvamVjdGlvbiBhbmQgY29uc3RydWN0cyBhIHRyZWUgd2hlcmUgYWxsXG4vLyBsZWF2ZXMgYXJlIGVpdGhlciBhbGwgVHJ1ZSBvciBhbGwgRmFsc2Vcbi8vIEByZXR1cm5zIE9iamVjdDpcbi8vICAtIHRyZWUgLSBPYmplY3QgLSB0cmVlIHJlcHJlc2VudGF0aW9uIG9mIGtleXMgaW52b2x2ZWQgaW4gcHJvamVjdGlvblxuLy8gIChleGNlcHRpb24gZm9yICdfaWQnIGFzIGl0IGlzIGEgc3BlY2lhbCBjYXNlIGhhbmRsZWQgc2VwYXJhdGVseSlcbi8vICAtIGluY2x1ZGluZyAtIEJvb2xlYW4gLSBcInRha2Ugb25seSBjZXJ0YWluIGZpZWxkc1wiIHR5cGUgb2YgcHJvamVjdGlvblxuZXhwb3J0IGZ1bmN0aW9uIHByb2plY3Rpb25EZXRhaWxzKGZpZWxkcykge1xuICAvLyBGaW5kIHRoZSBub24tX2lkIGtleXMgKF9pZCBpcyBoYW5kbGVkIHNwZWNpYWxseSBiZWNhdXNlIGl0IGlzIGluY2x1ZGVkXG4gIC8vIHVubGVzcyBleHBsaWNpdGx5IGV4Y2x1ZGVkKS4gU29ydCB0aGUga2V5cywgc28gdGhhdCBvdXIgY29kZSB0byBkZXRlY3RcbiAgLy8gb3ZlcmxhcHMgbGlrZSAnZm9vJyBhbmQgJ2Zvby5iYXInIGNhbiBhc3N1bWUgdGhhdCAnZm9vJyBjb21lcyBmaXJzdC5cbiAgbGV0IGZpZWxkc0tleXMgPSBPYmplY3Qua2V5cyhmaWVsZHMpLnNvcnQoKTtcblxuICAvLyBJZiBfaWQgaXMgdGhlIG9ubHkgZmllbGQgaW4gdGhlIHByb2plY3Rpb24sIGRvIG5vdCByZW1vdmUgaXQsIHNpbmNlIGl0IGlzXG4gIC8vIHJlcXVpcmVkIHRvIGRldGVybWluZSBpZiB0aGlzIGlzIGFuIGV4Y2x1c2lvbiBvciBleGNsdXNpb24uIEFsc28ga2VlcCBhblxuICAvLyBpbmNsdXNpdmUgX2lkLCBzaW5jZSBpbmNsdXNpdmUgX2lkIGZvbGxvd3MgdGhlIG5vcm1hbCBydWxlcyBhYm91dCBtaXhpbmdcbiAgLy8gaW5jbHVzaXZlIGFuZCBleGNsdXNpdmUgZmllbGRzLiBJZiBfaWQgaXMgbm90IHRoZSBvbmx5IGZpZWxkIGluIHRoZVxuICAvLyBwcm9qZWN0aW9uIGFuZCBpcyBleGNsdXNpdmUsIHJlbW92ZSBpdCBzbyBpdCBjYW4gYmUgaGFuZGxlZCBsYXRlciBieSBhXG4gIC8vIHNwZWNpYWwgY2FzZSwgc2luY2UgZXhjbHVzaXZlIF9pZCBpcyBhbHdheXMgYWxsb3dlZC5cbiAgaWYgKCEoZmllbGRzS2V5cy5sZW5ndGggPT09IDEgJiYgZmllbGRzS2V5c1swXSA9PT0gJ19pZCcpICYmXG4gICAgICAhKGZpZWxkc0tleXMuaW5jbHVkZXMoJ19pZCcpICYmIGZpZWxkcy5faWQpKSB7XG4gICAgZmllbGRzS2V5cyA9IGZpZWxkc0tleXMuZmlsdGVyKGtleSA9PiBrZXkgIT09ICdfaWQnKTtcbiAgfVxuXG4gIGxldCBpbmNsdWRpbmcgPSBudWxsOyAvLyBVbmtub3duXG5cbiAgZmllbGRzS2V5cy5mb3JFYWNoKGtleVBhdGggPT4ge1xuICAgIGNvbnN0IHJ1bGUgPSAhIWZpZWxkc1trZXlQYXRoXTtcblxuICAgIGlmIChpbmNsdWRpbmcgPT09IG51bGwpIHtcbiAgICAgIGluY2x1ZGluZyA9IHJ1bGU7XG4gICAgfVxuXG4gICAgLy8gVGhpcyBlcnJvciBtZXNzYWdlIGlzIGNvcGllZCBmcm9tIE1vbmdvREIgc2hlbGxcbiAgICBpZiAoaW5jbHVkaW5nICE9PSBydWxlKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ1lvdSBjYW5ub3QgY3VycmVudGx5IG1peCBpbmNsdWRpbmcgYW5kIGV4Y2x1ZGluZyBmaWVsZHMuJ1xuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IHByb2plY3Rpb25SdWxlc1RyZWUgPSBwYXRoc1RvVHJlZShcbiAgICBmaWVsZHNLZXlzLFxuICAgIHBhdGggPT4gaW5jbHVkaW5nLFxuICAgIChub2RlLCBwYXRoLCBmdWxsUGF0aCkgPT4ge1xuICAgICAgLy8gQ2hlY2sgcGFzc2VkIHByb2plY3Rpb24gZmllbGRzJyBrZXlzOiBJZiB5b3UgaGF2ZSB0d28gcnVsZXMgc3VjaCBhc1xuICAgICAgLy8gJ2Zvby5iYXInIGFuZCAnZm9vLmJhci5iYXonLCB0aGVuIHRoZSByZXN1bHQgYmVjb21lcyBhbWJpZ3VvdXMuIElmXG4gICAgICAvLyB0aGF0IGhhcHBlbnMsIHRoZXJlIGlzIGEgcHJvYmFiaWxpdHkgeW91IGFyZSBkb2luZyBzb21ldGhpbmcgd3JvbmcsXG4gICAgICAvLyBmcmFtZXdvcmsgc2hvdWxkIG5vdGlmeSB5b3UgYWJvdXQgc3VjaCBtaXN0YWtlIGVhcmxpZXIgb24gY3Vyc29yXG4gICAgICAvLyBjb21waWxhdGlvbiBzdGVwIHRoYW4gbGF0ZXIgZHVyaW5nIHJ1bnRpbWUuICBOb3RlLCB0aGF0IHJlYWwgbW9uZ29cbiAgICAgIC8vIGRvZXNuJ3QgZG8gYW55dGhpbmcgYWJvdXQgaXQgYW5kIHRoZSBsYXRlciBydWxlIGFwcGVhcnMgaW4gcHJvamVjdGlvblxuICAgICAgLy8gcHJvamVjdCwgbW9yZSBwcmlvcml0eSBpdCB0YWtlcy5cbiAgICAgIC8vXG4gICAgICAvLyBFeGFtcGxlLCBhc3N1bWUgZm9sbG93aW5nIGluIG1vbmdvIHNoZWxsOlxuICAgICAgLy8gPiBkYi5jb2xsLmluc2VydCh7IGE6IHsgYjogMjMsIGM6IDQ0IH0gfSlcbiAgICAgIC8vID4gZGIuY29sbC5maW5kKHt9LCB7ICdhJzogMSwgJ2EuYic6IDEgfSlcbiAgICAgIC8vIHtcIl9pZFwiOiBPYmplY3RJZChcIjUyMGJmZTQ1NjAyNDYwOGU4ZWYyNGFmM1wiKSwgXCJhXCI6IHtcImJcIjogMjN9fVxuICAgICAgLy8gPiBkYi5jb2xsLmZpbmQoe30sIHsgJ2EuYic6IDEsICdhJzogMSB9KVxuICAgICAgLy8ge1wiX2lkXCI6IE9iamVjdElkKFwiNTIwYmZlNDU2MDI0NjA4ZThlZjI0YWYzXCIpLCBcImFcIjoge1wiYlwiOiAyMywgXCJjXCI6IDQ0fX1cbiAgICAgIC8vXG4gICAgICAvLyBOb3RlLCBob3cgc2Vjb25kIHRpbWUgdGhlIHJldHVybiBzZXQgb2Yga2V5cyBpcyBkaWZmZXJlbnQuXG4gICAgICBjb25zdCBjdXJyZW50UGF0aCA9IGZ1bGxQYXRoO1xuICAgICAgY29uc3QgYW5vdGhlclBhdGggPSBwYXRoO1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgIGBib3RoICR7Y3VycmVudFBhdGh9IGFuZCAke2Fub3RoZXJQYXRofSBmb3VuZCBpbiBmaWVsZHMgb3B0aW9uLCBgICtcbiAgICAgICAgJ3VzaW5nIGJvdGggb2YgdGhlbSBtYXkgdHJpZ2dlciB1bmV4cGVjdGVkIGJlaGF2aW9yLiBEaWQgeW91IG1lYW4gdG8gJyArXG4gICAgICAgICd1c2Ugb25seSBvbmUgb2YgdGhlbT8nXG4gICAgICApO1xuICAgIH0pO1xuXG4gIHJldHVybiB7aW5jbHVkaW5nLCB0cmVlOiBwcm9qZWN0aW9uUnVsZXNUcmVlfTtcbn1cblxuLy8gVGFrZXMgYSBSZWdFeHAgb2JqZWN0IGFuZCByZXR1cm5zIGFuIGVsZW1lbnQgbWF0Y2hlci5cbmV4cG9ydCBmdW5jdGlvbiByZWdleHBFbGVtZW50TWF0Y2hlcihyZWdleHApIHtcbiAgcmV0dXJuIHZhbHVlID0+IHtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpID09PSByZWdleHAudG9TdHJpbmcoKTtcbiAgICB9XG5cbiAgICAvLyBSZWdleHBzIG9ubHkgd29yayBhZ2FpbnN0IHN0cmluZ3MuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBSZXNldCByZWdleHAncyBzdGF0ZSB0byBhdm9pZCBpbmNvbnNpc3RlbnQgbWF0Y2hpbmcgZm9yIG9iamVjdHMgd2l0aCB0aGVcbiAgICAvLyBzYW1lIHZhbHVlIG9uIGNvbnNlY3V0aXZlIGNhbGxzIG9mIHJlZ2V4cC50ZXN0LiBUaGlzIGhhcHBlbnMgb25seSBpZiB0aGVcbiAgICAvLyByZWdleHAgaGFzIHRoZSAnZycgZmxhZy4gQWxzbyBub3RlIHRoYXQgRVM2IGludHJvZHVjZXMgYSBuZXcgZmxhZyAneScgZm9yXG4gICAgLy8gd2hpY2ggd2Ugc2hvdWxkICpub3QqIGNoYW5nZSB0aGUgbGFzdEluZGV4IGJ1dCBNb25nb0RCIGRvZXNuJ3Qgc3VwcG9ydFxuICAgIC8vIGVpdGhlciBvZiB0aGVzZSBmbGFncy5cbiAgICByZWdleHAubGFzdEluZGV4ID0gMDtcblxuICAgIHJldHVybiByZWdleHAudGVzdCh2YWx1ZSk7XG4gIH07XG59XG5cbi8vIFZhbGlkYXRlcyB0aGUga2V5IGluIGEgcGF0aC5cbi8vIE9iamVjdHMgdGhhdCBhcmUgbmVzdGVkIG1vcmUgdGhlbiAxIGxldmVsIGNhbm5vdCBoYXZlIGRvdHRlZCBmaWVsZHNcbi8vIG9yIGZpZWxkcyBzdGFydGluZyB3aXRoICckJ1xuZnVuY3Rpb24gdmFsaWRhdGVLZXlJblBhdGgoa2V5LCBwYXRoKSB7XG4gIGlmIChrZXkuaW5jbHVkZXMoJy4nKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBUaGUgZG90dGVkIGZpZWxkICcke2tleX0nIGluICcke3BhdGh9LiR7a2V5fSBpcyBub3QgdmFsaWQgZm9yIHN0b3JhZ2UuYFxuICAgICk7XG4gIH1cblxuICBpZiAoa2V5WzBdID09PSAnJCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgVGhlIGRvbGxhciAoJCkgcHJlZml4ZWQgZmllbGQgICcke3BhdGh9LiR7a2V5fSBpcyBub3QgdmFsaWQgZm9yIHN0b3JhZ2UuYFxuICAgICk7XG4gIH1cbn1cblxuLy8gUmVjdXJzaXZlbHkgdmFsaWRhdGVzIGFuIG9iamVjdCB0aGF0IGlzIG5lc3RlZCBtb3JlIHRoYW4gb25lIGxldmVsIGRlZXBcbmZ1bmN0aW9uIHZhbGlkYXRlT2JqZWN0KG9iamVjdCwgcGF0aCkge1xuICBpZiAob2JqZWN0ICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmplY3QpID09PSBPYmplY3QucHJvdG90eXBlKSB7XG4gICAgT2JqZWN0LmtleXMob2JqZWN0KS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICB2YWxpZGF0ZUtleUluUGF0aChrZXksIHBhdGgpO1xuICAgICAgdmFsaWRhdGVPYmplY3Qob2JqZWN0W2tleV0sIHBhdGggKyAnLicgKyBrZXkpO1xuICAgIH0pO1xuICB9XG59XG4iLCJpbXBvcnQgTG9jYWxDb2xsZWN0aW9uIGZyb20gJy4vbG9jYWxfY29sbGVjdGlvbi5qcyc7XG5pbXBvcnQgeyBoYXNPd24gfSBmcm9tICcuL2NvbW1vbi5qcyc7XG5cbi8vIEN1cnNvcjogYSBzcGVjaWZpY2F0aW9uIGZvciBhIHBhcnRpY3VsYXIgc3Vic2V0IG9mIGRvY3VtZW50cywgdy8gYSBkZWZpbmVkXG4vLyBvcmRlciwgbGltaXQsIGFuZCBvZmZzZXQuICBjcmVhdGluZyBhIEN1cnNvciB3aXRoIExvY2FsQ29sbGVjdGlvbi5maW5kKCksXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDdXJzb3Ige1xuICAvLyBkb24ndCBjYWxsIHRoaXMgY3RvciBkaXJlY3RseS4gIHVzZSBMb2NhbENvbGxlY3Rpb24uZmluZCgpLlxuICBjb25zdHJ1Y3Rvcihjb2xsZWN0aW9uLCBzZWxlY3Rvciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5jb2xsZWN0aW9uID0gY29sbGVjdGlvbjtcbiAgICB0aGlzLnNvcnRlciA9IG51bGw7XG4gICAgdGhpcy5tYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKHNlbGVjdG9yKTtcblxuICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZFBlcmhhcHNBc09iamVjdChzZWxlY3RvcikpIHtcbiAgICAgIC8vIHN0YXNoIGZvciBmYXN0IF9pZCBhbmQgeyBfaWQgfVxuICAgICAgdGhpcy5fc2VsZWN0b3JJZCA9IGhhc093bi5jYWxsKHNlbGVjdG9yLCAnX2lkJylcbiAgICAgICAgPyBzZWxlY3Rvci5faWRcbiAgICAgICAgOiBzZWxlY3RvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fc2VsZWN0b3JJZCA9IHVuZGVmaW5lZDtcblxuICAgICAgaWYgKHRoaXMubWF0Y2hlci5oYXNHZW9RdWVyeSgpIHx8IG9wdGlvbnMuc29ydCkge1xuICAgICAgICB0aGlzLnNvcnRlciA9IG5ldyBNaW5pbW9uZ28uU29ydGVyKFxuICAgICAgICAgIG9wdGlvbnMuc29ydCB8fCBbXSxcbiAgICAgICAgICB7bWF0Y2hlcjogdGhpcy5tYXRjaGVyfVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuc2tpcCA9IG9wdGlvbnMuc2tpcCB8fCAwO1xuICAgIHRoaXMubGltaXQgPSBvcHRpb25zLmxpbWl0O1xuICAgIHRoaXMuZmllbGRzID0gb3B0aW9ucy5maWVsZHM7XG5cbiAgICB0aGlzLl9wcm9qZWN0aW9uRm4gPSBMb2NhbENvbGxlY3Rpb24uX2NvbXBpbGVQcm9qZWN0aW9uKHRoaXMuZmllbGRzIHx8IHt9KTtcblxuICAgIHRoaXMuX3RyYW5zZm9ybSA9IExvY2FsQ29sbGVjdGlvbi53cmFwVHJhbnNmb3JtKG9wdGlvbnMudHJhbnNmb3JtKTtcblxuICAgIC8vIGJ5IGRlZmF1bHQsIHF1ZXJpZXMgcmVnaXN0ZXIgdy8gVHJhY2tlciB3aGVuIGl0IGlzIGF2YWlsYWJsZS5cbiAgICBpZiAodHlwZW9mIFRyYWNrZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLnJlYWN0aXZlID0gb3B0aW9ucy5yZWFjdGl2ZSA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IG9wdGlvbnMucmVhY3RpdmU7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgdGhlIG51bWJlciBvZiBkb2N1bWVudHMgdGhhdCBtYXRjaCBhIHF1ZXJ5LlxuICAgKiBAbWVtYmVyT2YgTW9uZ28uQ3Vyc29yXG4gICAqIEBtZXRob2QgIGNvdW50XG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2FwcGx5U2tpcExpbWl0PXRydWVdIElmIHNldCB0byBgZmFsc2VgLCB0aGUgdmFsdWVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybmVkIHdpbGwgcmVmbGVjdCB0aGUgdG90YWxcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlciBvZiBtYXRjaGluZyBkb2N1bWVudHMsXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZ25vcmluZyBhbnkgdmFsdWUgc3VwcGxpZWQgZm9yXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW1pdFxuICAgKiBAaW5zdGFuY2VcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gICAqL1xuICBjb3VudChhcHBseVNraXBMaW1pdCA9IHRydWUpIHtcbiAgICBpZiAodGhpcy5yZWFjdGl2ZSkge1xuICAgICAgLy8gYWxsb3cgdGhlIG9ic2VydmUgdG8gYmUgdW5vcmRlcmVkXG4gICAgICB0aGlzLl9kZXBlbmQoe2FkZGVkOiB0cnVlLCByZW1vdmVkOiB0cnVlfSwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2dldFJhd09iamVjdHMoe1xuICAgICAgb3JkZXJlZDogdHJ1ZSxcbiAgICAgIGFwcGx5U2tpcExpbWl0XG4gICAgfSkubGVuZ3RoO1xuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFJldHVybiBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzIGFzIGFuIEFycmF5LlxuICAgKiBAbWVtYmVyT2YgTW9uZ28uQ3Vyc29yXG4gICAqIEBtZXRob2QgIGZldGNoXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQHJldHVybnMge09iamVjdFtdfVxuICAgKi9cbiAgZmV0Y2goKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gW107XG5cbiAgICB0aGlzLmZvckVhY2goZG9jID0+IHtcbiAgICAgIHJlc3VsdC5wdXNoKGRvYyk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgaWYgKHRoaXMucmVhY3RpdmUpIHtcbiAgICAgIHRoaXMuX2RlcGVuZCh7XG4gICAgICAgIGFkZGVkQmVmb3JlOiB0cnVlLFxuICAgICAgICByZW1vdmVkOiB0cnVlLFxuICAgICAgICBjaGFuZ2VkOiB0cnVlLFxuICAgICAgICBtb3ZlZEJlZm9yZTogdHJ1ZX0pO1xuICAgIH1cblxuICAgIGxldCBpbmRleCA9IDA7XG4gICAgY29uc3Qgb2JqZWN0cyA9IHRoaXMuX2dldFJhd09iamVjdHMoe29yZGVyZWQ6IHRydWV9KTtcblxuICAgIHJldHVybiB7XG4gICAgICBuZXh0OiAoKSA9PiB7XG4gICAgICAgIGlmIChpbmRleCA8IG9iamVjdHMubGVuZ3RoKSB7XG4gICAgICAgICAgLy8gVGhpcyBkb3VibGVzIGFzIGEgY2xvbmUgb3BlcmF0aW9uLlxuICAgICAgICAgIGxldCBlbGVtZW50ID0gdGhpcy5fcHJvamVjdGlvbkZuKG9iamVjdHNbaW5kZXgrK10pO1xuXG4gICAgICAgICAgaWYgKHRoaXMuX3RyYW5zZm9ybSlcbiAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLl90cmFuc2Zvcm0oZWxlbWVudCk7XG5cbiAgICAgICAgICByZXR1cm4ge3ZhbHVlOiBlbGVtZW50fTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7ZG9uZTogdHJ1ZX07XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAY2FsbGJhY2sgSXRlcmF0aW9uQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtPYmplY3R9IGRvY1xuICAgKiBAcGFyYW0ge051bWJlcn0gaW5kZXhcbiAgICovXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBDYWxsIGBjYWxsYmFja2Agb25jZSBmb3IgZWFjaCBtYXRjaGluZyBkb2N1bWVudCwgc2VxdWVudGlhbGx5IGFuZFxuICAgKiAgICAgICAgICBzeW5jaHJvbm91c2x5LlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCAgZm9yRWFjaFxuICAgKiBAaW5zdGFuY2VcbiAgICogQG1lbWJlck9mIE1vbmdvLkN1cnNvclxuICAgKiBAcGFyYW0ge0l0ZXJhdGlvbkNhbGxiYWNrfSBjYWxsYmFjayBGdW5jdGlvbiB0byBjYWxsLiBJdCB3aWxsIGJlIGNhbGxlZFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aXRoIHRocmVlIGFyZ3VtZW50czogdGhlIGRvY3VtZW50LCBhXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAtYmFzZWQgaW5kZXgsIGFuZCA8ZW0+Y3Vyc29yPC9lbT5cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRzZWxmLlxuICAgKiBAcGFyYW0ge0FueX0gW3RoaXNBcmddIEFuIG9iamVjdCB3aGljaCB3aWxsIGJlIHRoZSB2YWx1ZSBvZiBgdGhpc2AgaW5zaWRlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgYGNhbGxiYWNrYC5cbiAgICovXG4gIGZvckVhY2goY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBpZiAodGhpcy5yZWFjdGl2ZSkge1xuICAgICAgdGhpcy5fZGVwZW5kKHtcbiAgICAgICAgYWRkZWRCZWZvcmU6IHRydWUsXG4gICAgICAgIHJlbW92ZWQ6IHRydWUsXG4gICAgICAgIGNoYW5nZWQ6IHRydWUsXG4gICAgICAgIG1vdmVkQmVmb3JlOiB0cnVlfSk7XG4gICAgfVxuXG4gICAgdGhpcy5fZ2V0UmF3T2JqZWN0cyh7b3JkZXJlZDogdHJ1ZX0pLmZvckVhY2goKGVsZW1lbnQsIGkpID0+IHtcbiAgICAgIC8vIFRoaXMgZG91YmxlcyBhcyBhIGNsb25lIG9wZXJhdGlvbi5cbiAgICAgIGVsZW1lbnQgPSB0aGlzLl9wcm9qZWN0aW9uRm4oZWxlbWVudCk7XG5cbiAgICAgIGlmICh0aGlzLl90cmFuc2Zvcm0pIHtcbiAgICAgICAgZWxlbWVudCA9IHRoaXMuX3RyYW5zZm9ybShlbGVtZW50KTtcbiAgICAgIH1cblxuICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBlbGVtZW50LCBpLCB0aGlzKTtcbiAgICB9KTtcbiAgfVxuXG4gIGdldFRyYW5zZm9ybSgpIHtcbiAgICByZXR1cm4gdGhpcy5fdHJhbnNmb3JtO1xuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IE1hcCBjYWxsYmFjayBvdmVyIGFsbCBtYXRjaGluZyBkb2N1bWVudHMuICBSZXR1cm5zIGFuIEFycmF5LlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCBtYXBcbiAgICogQGluc3RhbmNlXG4gICAqIEBtZW1iZXJPZiBNb25nby5DdXJzb3JcbiAgICogQHBhcmFtIHtJdGVyYXRpb25DYWxsYmFja30gY2FsbGJhY2sgRnVuY3Rpb24gdG8gY2FsbC4gSXQgd2lsbCBiZSBjYWxsZWRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2l0aCB0aHJlZSBhcmd1bWVudHM6IHRoZSBkb2N1bWVudCwgYVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLWJhc2VkIGluZGV4LCBhbmQgPGVtPmN1cnNvcjwvZW0+XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0c2VsZi5cbiAgICogQHBhcmFtIHtBbnl9IFt0aGlzQXJnXSBBbiBvYmplY3Qgd2hpY2ggd2lsbCBiZSB0aGUgdmFsdWUgb2YgYHRoaXNgIGluc2lkZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgIGBjYWxsYmFja2AuXG4gICAqL1xuICBtYXAoY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBjb25zdCByZXN1bHQgPSBbXTtcblxuICAgIHRoaXMuZm9yRWFjaCgoZG9jLCBpKSA9PiB7XG4gICAgICByZXN1bHQucHVzaChjYWxsYmFjay5jYWxsKHRoaXNBcmcsIGRvYywgaSwgdGhpcykpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIG9wdGlvbnMgdG8gY29udGFpbjpcbiAgLy8gICogY2FsbGJhY2tzIGZvciBvYnNlcnZlKCk6XG4gIC8vICAgIC0gYWRkZWRBdCAoZG9jdW1lbnQsIGF0SW5kZXgpXG4gIC8vICAgIC0gYWRkZWQgKGRvY3VtZW50KVxuICAvLyAgICAtIGNoYW5nZWRBdCAobmV3RG9jdW1lbnQsIG9sZERvY3VtZW50LCBhdEluZGV4KVxuICAvLyAgICAtIGNoYW5nZWQgKG5ld0RvY3VtZW50LCBvbGREb2N1bWVudClcbiAgLy8gICAgLSByZW1vdmVkQXQgKGRvY3VtZW50LCBhdEluZGV4KVxuICAvLyAgICAtIHJlbW92ZWQgKGRvY3VtZW50KVxuICAvLyAgICAtIG1vdmVkVG8gKGRvY3VtZW50LCBvbGRJbmRleCwgbmV3SW5kZXgpXG4gIC8vXG4gIC8vIGF0dHJpYnV0ZXMgYXZhaWxhYmxlIG9uIHJldHVybmVkIHF1ZXJ5IGhhbmRsZTpcbiAgLy8gICogc3RvcCgpOiBlbmQgdXBkYXRlc1xuICAvLyAgKiBjb2xsZWN0aW9uOiB0aGUgY29sbGVjdGlvbiB0aGlzIHF1ZXJ5IGlzIHF1ZXJ5aW5nXG4gIC8vXG4gIC8vIGlmZiB4IGlzIGEgcmV0dXJuZWQgcXVlcnkgaGFuZGxlLCAoeCBpbnN0YW5jZW9mXG4gIC8vIExvY2FsQ29sbGVjdGlvbi5PYnNlcnZlSGFuZGxlKSBpcyB0cnVlXG4gIC8vXG4gIC8vIGluaXRpYWwgcmVzdWx0cyBkZWxpdmVyZWQgdGhyb3VnaCBhZGRlZCBjYWxsYmFja1xuICAvLyBYWFggbWF5YmUgY2FsbGJhY2tzIHNob3VsZCB0YWtlIGEgbGlzdCBvZiBvYmplY3RzLCB0byBleHBvc2UgdHJhbnNhY3Rpb25zP1xuICAvLyBYWFggbWF5YmUgc3VwcG9ydCBmaWVsZCBsaW1pdGluZyAodG8gbGltaXQgd2hhdCB5b3UncmUgbm90aWZpZWQgb24pXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFdhdGNoIGEgcXVlcnkuICBSZWNlaXZlIGNhbGxiYWNrcyBhcyB0aGUgcmVzdWx0IHNldCBjaGFuZ2VzLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIE1vbmdvLkN1cnNvclxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtPYmplY3R9IGNhbGxiYWNrcyBGdW5jdGlvbnMgdG8gY2FsbCB0byBkZWxpdmVyIHRoZSByZXN1bHQgc2V0IGFzIGl0XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlc1xuICAgKi9cbiAgb2JzZXJ2ZShvcHRpb25zKSB7XG4gICAgcmV0dXJuIExvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUZyb21PYnNlcnZlQ2hhbmdlcyh0aGlzLCBvcHRpb25zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBXYXRjaCBhIHF1ZXJ5LiBSZWNlaXZlIGNhbGxiYWNrcyBhcyB0aGUgcmVzdWx0IHNldCBjaGFuZ2VzLiBPbmx5XG4gICAqICAgICAgICAgIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIHRoZSBvbGQgYW5kIG5ldyBkb2N1bWVudHMgYXJlIHBhc3NlZCB0b1xuICAgKiAgICAgICAgICB0aGUgY2FsbGJhY2tzLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIE1vbmdvLkN1cnNvclxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtPYmplY3R9IGNhbGxiYWNrcyBGdW5jdGlvbnMgdG8gY2FsbCB0byBkZWxpdmVyIHRoZSByZXN1bHQgc2V0IGFzIGl0XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlc1xuICAgKi9cbiAgb2JzZXJ2ZUNoYW5nZXMob3B0aW9ucykge1xuICAgIGNvbnN0IG9yZGVyZWQgPSBMb2NhbENvbGxlY3Rpb24uX29ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzQXJlT3JkZXJlZChvcHRpb25zKTtcblxuICAgIC8vIHRoZXJlIGFyZSBzZXZlcmFsIHBsYWNlcyB0aGF0IGFzc3VtZSB5b3UgYXJlbid0IGNvbWJpbmluZyBza2lwL2xpbWl0IHdpdGhcbiAgICAvLyB1bm9yZGVyZWQgb2JzZXJ2ZS4gIGVnLCB1cGRhdGUncyBFSlNPTi5jbG9uZSwgYW5kIHRoZSBcInRoZXJlIGFyZSBzZXZlcmFsXCJcbiAgICAvLyBjb21tZW50IGluIF9tb2RpZnlBbmROb3RpZnlcbiAgICAvLyBYWFggYWxsb3cgc2tpcC9saW1pdCB3aXRoIHVub3JkZXJlZCBvYnNlcnZlXG4gICAgaWYgKCFvcHRpb25zLl9hbGxvd191bm9yZGVyZWQgJiYgIW9yZGVyZWQgJiYgKHRoaXMuc2tpcCB8fCB0aGlzLmxpbWl0KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBcIk11c3QgdXNlIGFuIG9yZGVyZWQgb2JzZXJ2ZSB3aXRoIHNraXAgb3IgbGltaXQgKGkuZS4gJ2FkZGVkQmVmb3JlJyBcIiArXG4gICAgICAgIFwiZm9yIG9ic2VydmVDaGFuZ2VzIG9yICdhZGRlZEF0JyBmb3Igb2JzZXJ2ZSwgaW5zdGVhZCBvZiAnYWRkZWQnKS5cIlxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5maWVsZHMgJiYgKHRoaXMuZmllbGRzLl9pZCA9PT0gMCB8fCB0aGlzLmZpZWxkcy5faWQgPT09IGZhbHNlKSkge1xuICAgICAgdGhyb3cgRXJyb3IoJ1lvdSBtYXkgbm90IG9ic2VydmUgYSBjdXJzb3Igd2l0aCB7ZmllbGRzOiB7X2lkOiAwfX0nKTtcbiAgICB9XG5cbiAgICBjb25zdCBkaXN0YW5jZXMgPSAoXG4gICAgICB0aGlzLm1hdGNoZXIuaGFzR2VvUXVlcnkoKSAmJlxuICAgICAgb3JkZXJlZCAmJlxuICAgICAgbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXBcbiAgICApO1xuXG4gICAgY29uc3QgcXVlcnkgPSB7XG4gICAgICBjdXJzb3I6IHRoaXMsXG4gICAgICBkaXJ0eTogZmFsc2UsXG4gICAgICBkaXN0YW5jZXMsXG4gICAgICBtYXRjaGVyOiB0aGlzLm1hdGNoZXIsIC8vIG5vdCBmYXN0IHBhdGhlZFxuICAgICAgb3JkZXJlZCxcbiAgICAgIHByb2plY3Rpb25GbjogdGhpcy5fcHJvamVjdGlvbkZuLFxuICAgICAgcmVzdWx0c1NuYXBzaG90OiBudWxsLFxuICAgICAgc29ydGVyOiBvcmRlcmVkICYmIHRoaXMuc29ydGVyXG4gICAgfTtcblxuICAgIGxldCBxaWQ7XG5cbiAgICAvLyBOb24tcmVhY3RpdmUgcXVlcmllcyBjYWxsIGFkZGVkW0JlZm9yZV0gYW5kIHRoZW4gbmV2ZXIgY2FsbCBhbnl0aGluZ1xuICAgIC8vIGVsc2UuXG4gICAgaWYgKHRoaXMucmVhY3RpdmUpIHtcbiAgICAgIHFpZCA9IHRoaXMuY29sbGVjdGlvbi5uZXh0X3FpZCsrO1xuICAgICAgdGhpcy5jb2xsZWN0aW9uLnF1ZXJpZXNbcWlkXSA9IHF1ZXJ5O1xuICAgIH1cblxuICAgIHF1ZXJ5LnJlc3VsdHMgPSB0aGlzLl9nZXRSYXdPYmplY3RzKHtvcmRlcmVkLCBkaXN0YW5jZXM6IHF1ZXJ5LmRpc3RhbmNlc30pO1xuXG4gICAgaWYgKHRoaXMuY29sbGVjdGlvbi5wYXVzZWQpIHtcbiAgICAgIHF1ZXJ5LnJlc3VsdHNTbmFwc2hvdCA9IG9yZGVyZWQgPyBbXSA6IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICAgIH1cblxuICAgIC8vIHdyYXAgY2FsbGJhY2tzIHdlIHdlcmUgcGFzc2VkLiBjYWxsYmFja3Mgb25seSBmaXJlIHdoZW4gbm90IHBhdXNlZCBhbmRcbiAgICAvLyBhcmUgbmV2ZXIgdW5kZWZpbmVkXG4gICAgLy8gRmlsdGVycyBvdXQgYmxhY2tsaXN0ZWQgZmllbGRzIGFjY29yZGluZyB0byBjdXJzb3IncyBwcm9qZWN0aW9uLlxuICAgIC8vIFhYWCB3cm9uZyBwbGFjZSBmb3IgdGhpcz9cblxuICAgIC8vIGZ1cnRoZXJtb3JlLCBjYWxsYmFja3MgZW5xdWV1ZSB1bnRpbCB0aGUgb3BlcmF0aW9uIHdlJ3JlIHdvcmtpbmcgb24gaXNcbiAgICAvLyBkb25lLlxuICAgIGNvbnN0IHdyYXBDYWxsYmFjayA9IGZuID0+IHtcbiAgICAgIGlmICghZm4pIHtcbiAgICAgICAgcmV0dXJuICgpID0+IHt9O1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgIHJldHVybiBmdW5jdGlvbigvKiBhcmdzKi8pIHtcbiAgICAgICAgaWYgKHNlbGYuY29sbGVjdGlvbi5wYXVzZWQpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBhcmdzID0gYXJndW1lbnRzO1xuXG4gICAgICAgIHNlbGYuY29sbGVjdGlvbi5fb2JzZXJ2ZVF1ZXVlLnF1ZXVlVGFzaygoKSA9PiB7XG4gICAgICAgICAgZm4uYXBwbHkodGhpcywgYXJncyk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICB9O1xuXG4gICAgcXVlcnkuYWRkZWQgPSB3cmFwQ2FsbGJhY2sob3B0aW9ucy5hZGRlZCk7XG4gICAgcXVlcnkuY2hhbmdlZCA9IHdyYXBDYWxsYmFjayhvcHRpb25zLmNoYW5nZWQpO1xuICAgIHF1ZXJ5LnJlbW92ZWQgPSB3cmFwQ2FsbGJhY2sob3B0aW9ucy5yZW1vdmVkKTtcblxuICAgIGlmIChvcmRlcmVkKSB7XG4gICAgICBxdWVyeS5hZGRlZEJlZm9yZSA9IHdyYXBDYWxsYmFjayhvcHRpb25zLmFkZGVkQmVmb3JlKTtcbiAgICAgIHF1ZXJ5Lm1vdmVkQmVmb3JlID0gd3JhcENhbGxiYWNrKG9wdGlvbnMubW92ZWRCZWZvcmUpO1xuICAgIH1cblxuICAgIGlmICghb3B0aW9ucy5fc3VwcHJlc3NfaW5pdGlhbCAmJiAhdGhpcy5jb2xsZWN0aW9uLnBhdXNlZCkge1xuICAgICAgY29uc3QgcmVzdWx0cyA9IG9yZGVyZWQgPyBxdWVyeS5yZXN1bHRzIDogcXVlcnkucmVzdWx0cy5fbWFwO1xuXG4gICAgICBPYmplY3Qua2V5cyhyZXN1bHRzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgIGNvbnN0IGRvYyA9IHJlc3VsdHNba2V5XTtcbiAgICAgICAgY29uc3QgZmllbGRzID0gRUpTT04uY2xvbmUoZG9jKTtcblxuICAgICAgICBkZWxldGUgZmllbGRzLl9pZDtcblxuICAgICAgICBpZiAob3JkZXJlZCkge1xuICAgICAgICAgIHF1ZXJ5LmFkZGVkQmVmb3JlKGRvYy5faWQsIHRoaXMuX3Byb2plY3Rpb25GbihmaWVsZHMpLCBudWxsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHF1ZXJ5LmFkZGVkKGRvYy5faWQsIHRoaXMuX3Byb2plY3Rpb25GbihmaWVsZHMpKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IGhhbmRsZSA9IE9iamVjdC5hc3NpZ24obmV3IExvY2FsQ29sbGVjdGlvbi5PYnNlcnZlSGFuZGxlLCB7XG4gICAgICBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb24sXG4gICAgICBzdG9wOiAoKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLnJlYWN0aXZlKSB7XG4gICAgICAgICAgZGVsZXRlIHRoaXMuY29sbGVjdGlvbi5xdWVyaWVzW3FpZF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICh0aGlzLnJlYWN0aXZlICYmIFRyYWNrZXIuYWN0aXZlKSB7XG4gICAgICAvLyBYWFggaW4gbWFueSBjYXNlcywgdGhlIHNhbWUgb2JzZXJ2ZSB3aWxsIGJlIHJlY3JlYXRlZCB3aGVuXG4gICAgICAvLyB0aGUgY3VycmVudCBhdXRvcnVuIGlzIHJlcnVuLiAgd2UgY291bGQgc2F2ZSB3b3JrIGJ5XG4gICAgICAvLyBsZXR0aW5nIGl0IGxpbmdlciBhY3Jvc3MgcmVydW4gYW5kIHBvdGVudGlhbGx5IGdldFxuICAgICAgLy8gcmVwdXJwb3NlZCBpZiB0aGUgc2FtZSBvYnNlcnZlIGlzIHBlcmZvcm1lZCwgdXNpbmcgbG9naWNcbiAgICAgIC8vIHNpbWlsYXIgdG8gdGhhdCBvZiBNZXRlb3Iuc3Vic2NyaWJlLlxuICAgICAgVHJhY2tlci5vbkludmFsaWRhdGUoKCkgPT4ge1xuICAgICAgICBoYW5kbGUuc3RvcCgpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gcnVuIHRoZSBvYnNlcnZlIGNhbGxiYWNrcyByZXN1bHRpbmcgZnJvbSB0aGUgaW5pdGlhbCBjb250ZW50c1xuICAgIC8vIGJlZm9yZSB3ZSBsZWF2ZSB0aGUgb2JzZXJ2ZS5cbiAgICB0aGlzLmNvbGxlY3Rpb24uX29ic2VydmVRdWV1ZS5kcmFpbigpO1xuXG4gICAgcmV0dXJuIGhhbmRsZTtcbiAgfVxuXG4gIC8vIFNpbmNlIHdlIGRvbid0IGFjdHVhbGx5IGhhdmUgYSBcIm5leHRPYmplY3RcIiBpbnRlcmZhY2UsIHRoZXJlJ3MgcmVhbGx5IG5vXG4gIC8vIHJlYXNvbiB0byBoYXZlIGEgXCJyZXdpbmRcIiBpbnRlcmZhY2UuICBBbGwgaXQgZGlkIHdhcyBtYWtlIG11bHRpcGxlIGNhbGxzXG4gIC8vIHRvIGZldGNoL21hcC9mb3JFYWNoIHJldHVybiBub3RoaW5nIHRoZSBzZWNvbmQgdGltZS5cbiAgLy8gWFhYIENPTVBBVCBXSVRIIDAuOC4xXG4gIHJld2luZCgpIHt9XG5cbiAgLy8gWFhYIE1heWJlIHdlIG5lZWQgYSB2ZXJzaW9uIG9mIG9ic2VydmUgdGhhdCBqdXN0IGNhbGxzIGEgY2FsbGJhY2sgaWZcbiAgLy8gYW55dGhpbmcgY2hhbmdlZC5cbiAgX2RlcGVuZChjaGFuZ2VycywgX2FsbG93X3Vub3JkZXJlZCkge1xuICAgIGlmIChUcmFja2VyLmFjdGl2ZSkge1xuICAgICAgY29uc3QgZGVwZW5kZW5jeSA9IG5ldyBUcmFja2VyLkRlcGVuZGVuY3k7XG4gICAgICBjb25zdCBub3RpZnkgPSBkZXBlbmRlbmN5LmNoYW5nZWQuYmluZChkZXBlbmRlbmN5KTtcblxuICAgICAgZGVwZW5kZW5jeS5kZXBlbmQoKTtcblxuICAgICAgY29uc3Qgb3B0aW9ucyA9IHtfYWxsb3dfdW5vcmRlcmVkLCBfc3VwcHJlc3NfaW5pdGlhbDogdHJ1ZX07XG5cbiAgICAgIFsnYWRkZWQnLCAnYWRkZWRCZWZvcmUnLCAnY2hhbmdlZCcsICdtb3ZlZEJlZm9yZScsICdyZW1vdmVkJ11cbiAgICAgICAgLmZvckVhY2goZm4gPT4ge1xuICAgICAgICAgIGlmIChjaGFuZ2Vyc1tmbl0pIHtcbiAgICAgICAgICAgIG9wdGlvbnNbZm5dID0gbm90aWZ5O1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgIC8vIG9ic2VydmVDaGFuZ2VzIHdpbGwgc3RvcCgpIHdoZW4gdGhpcyBjb21wdXRhdGlvbiBpcyBpbnZhbGlkYXRlZFxuICAgICAgdGhpcy5vYnNlcnZlQ2hhbmdlcyhvcHRpb25zKTtcbiAgICB9XG4gIH1cblxuICBfZ2V0Q29sbGVjdGlvbk5hbWUoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbi5uYW1lO1xuICB9XG5cbiAgLy8gUmV0dXJucyBhIGNvbGxlY3Rpb24gb2YgbWF0Y2hpbmcgb2JqZWN0cywgYnV0IGRvZXNuJ3QgZGVlcCBjb3B5IHRoZW0uXG4gIC8vXG4gIC8vIElmIG9yZGVyZWQgaXMgc2V0LCByZXR1cm5zIGEgc29ydGVkIGFycmF5LCByZXNwZWN0aW5nIHNvcnRlciwgc2tpcCwgYW5kXG4gIC8vIGxpbWl0IHByb3BlcnRpZXMgb2YgdGhlIHF1ZXJ5IHByb3ZpZGVkIHRoYXQgb3B0aW9ucy5hcHBseVNraXBMaW1pdCBpc1xuICAvLyBub3Qgc2V0IHRvIGZhbHNlICgjMTIwMSkuIElmIHNvcnRlciBpcyBmYWxzZXksIG5vIHNvcnQgLS0geW91IGdldCB0aGVcbiAgLy8gbmF0dXJhbCBvcmRlci5cbiAgLy9cbiAgLy8gSWYgb3JkZXJlZCBpcyBub3Qgc2V0LCByZXR1cm5zIGFuIG9iamVjdCBtYXBwaW5nIGZyb20gSUQgdG8gZG9jIChzb3J0ZXIsXG4gIC8vIHNraXAgYW5kIGxpbWl0IHNob3VsZCBub3QgYmUgc2V0KS5cbiAgLy9cbiAgLy8gSWYgb3JkZXJlZCBpcyBzZXQgYW5kIHRoaXMgY3Vyc29yIGlzIGEgJG5lYXIgZ2VvcXVlcnksIHRoZW4gdGhpcyBmdW5jdGlvblxuICAvLyB3aWxsIHVzZSBhbiBfSWRNYXAgdG8gdHJhY2sgZWFjaCBkaXN0YW5jZSBmcm9tIHRoZSAkbmVhciBhcmd1bWVudCBwb2ludCBpblxuICAvLyBvcmRlciB0byB1c2UgaXQgYXMgYSBzb3J0IGtleS4gSWYgYW4gX0lkTWFwIGlzIHBhc3NlZCBpbiB0aGUgJ2Rpc3RhbmNlcydcbiAgLy8gYXJndW1lbnQsIHRoaXMgZnVuY3Rpb24gd2lsbCBjbGVhciBpdCBhbmQgdXNlIGl0IGZvciB0aGlzIHB1cnBvc2VcbiAgLy8gKG90aGVyd2lzZSBpdCB3aWxsIGp1c3QgY3JlYXRlIGl0cyBvd24gX0lkTWFwKS4gVGhlIG9ic2VydmVDaGFuZ2VzXG4gIC8vIGltcGxlbWVudGF0aW9uIHVzZXMgdGhpcyB0byByZW1lbWJlciB0aGUgZGlzdGFuY2VzIGFmdGVyIHRoaXMgZnVuY3Rpb25cbiAgLy8gcmV0dXJucy5cbiAgX2dldFJhd09iamVjdHMob3B0aW9ucyA9IHt9KSB7XG4gICAgLy8gQnkgZGVmYXVsdCB0aGlzIG1ldGhvZCB3aWxsIHJlc3BlY3Qgc2tpcCBhbmQgbGltaXQgYmVjYXVzZSAuZmV0Y2goKSxcbiAgICAvLyAuZm9yRWFjaCgpIGV0Yy4uLiBleHBlY3QgdGhpcyBiZWhhdmlvdXIuIEl0IGNhbiBiZSBmb3JjZWQgdG8gaWdub3JlXG4gICAgLy8gc2tpcCBhbmQgbGltaXQgYnkgc2V0dGluZyBhcHBseVNraXBMaW1pdCB0byBmYWxzZSAoLmNvdW50KCkgZG9lcyB0aGlzLFxuICAgIC8vIGZvciBleGFtcGxlKVxuICAgIGNvbnN0IGFwcGx5U2tpcExpbWl0ID0gb3B0aW9ucy5hcHBseVNraXBMaW1pdCAhPT0gZmFsc2U7XG5cbiAgICAvLyBYWFggdXNlIE9yZGVyZWREaWN0IGluc3RlYWQgb2YgYXJyYXksIGFuZCBtYWtlIElkTWFwIGFuZCBPcmRlcmVkRGljdFxuICAgIC8vIGNvbXBhdGlibGVcbiAgICBjb25zdCByZXN1bHRzID0gb3B0aW9ucy5vcmRlcmVkID8gW10gOiBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcblxuICAgIC8vIGZhc3QgcGF0aCBmb3Igc2luZ2xlIElEIHZhbHVlXG4gICAgaWYgKHRoaXMuX3NlbGVjdG9ySWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gSWYgeW91IGhhdmUgbm9uLXplcm8gc2tpcCBhbmQgYXNrIGZvciBhIHNpbmdsZSBpZCwgeW91IGdldCBub3RoaW5nLlxuICAgICAgLy8gVGhpcyBpcyBzbyBpdCBtYXRjaGVzIHRoZSBiZWhhdmlvciBvZiB0aGUgJ3tfaWQ6IGZvb30nIHBhdGguXG4gICAgICBpZiAoYXBwbHlTa2lwTGltaXQgJiYgdGhpcy5za2lwKSB7XG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBzZWxlY3RlZERvYyA9IHRoaXMuY29sbGVjdGlvbi5fZG9jcy5nZXQodGhpcy5fc2VsZWN0b3JJZCk7XG5cbiAgICAgIGlmIChzZWxlY3RlZERvYykge1xuICAgICAgICBpZiAob3B0aW9ucy5vcmRlcmVkKSB7XG4gICAgICAgICAgcmVzdWx0cy5wdXNoKHNlbGVjdGVkRG9jKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHRzLnNldCh0aGlzLl9zZWxlY3RvcklkLCBzZWxlY3RlZERvYyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfVxuXG4gICAgLy8gc2xvdyBwYXRoIGZvciBhcmJpdHJhcnkgc2VsZWN0b3IsIHNvcnQsIHNraXAsIGxpbWl0XG5cbiAgICAvLyBpbiB0aGUgb2JzZXJ2ZUNoYW5nZXMgY2FzZSwgZGlzdGFuY2VzIGlzIGFjdHVhbGx5IHBhcnQgb2YgdGhlIFwicXVlcnlcIlxuICAgIC8vIChpZSwgbGl2ZSByZXN1bHRzIHNldCkgb2JqZWN0LiAgaW4gb3RoZXIgY2FzZXMsIGRpc3RhbmNlcyBpcyBvbmx5IHVzZWRcbiAgICAvLyBpbnNpZGUgdGhpcyBmdW5jdGlvbi5cbiAgICBsZXQgZGlzdGFuY2VzO1xuICAgIGlmICh0aGlzLm1hdGNoZXIuaGFzR2VvUXVlcnkoKSAmJiBvcHRpb25zLm9yZGVyZWQpIHtcbiAgICAgIGlmIChvcHRpb25zLmRpc3RhbmNlcykge1xuICAgICAgICBkaXN0YW5jZXMgPSBvcHRpb25zLmRpc3RhbmNlcztcbiAgICAgICAgZGlzdGFuY2VzLmNsZWFyKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkaXN0YW5jZXMgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY29sbGVjdGlvbi5fZG9jcy5mb3JFYWNoKChkb2MsIGlkKSA9PiB7XG4gICAgICBjb25zdCBtYXRjaFJlc3VsdCA9IHRoaXMubWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoZG9jKTtcblxuICAgICAgaWYgKG1hdGNoUmVzdWx0LnJlc3VsdCkge1xuICAgICAgICBpZiAob3B0aW9ucy5vcmRlcmVkKSB7XG4gICAgICAgICAgcmVzdWx0cy5wdXNoKGRvYyk7XG5cbiAgICAgICAgICBpZiAoZGlzdGFuY2VzICYmIG1hdGNoUmVzdWx0LmRpc3RhbmNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRpc3RhbmNlcy5zZXQoaWQsIG1hdGNoUmVzdWx0LmRpc3RhbmNlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0cy5zZXQoaWQsIGRvYyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gT3ZlcnJpZGUgdG8gZW5zdXJlIGFsbCBkb2NzIGFyZSBtYXRjaGVkIGlmIGlnbm9yaW5nIHNraXAgJiBsaW1pdFxuICAgICAgaWYgKCFhcHBseVNraXBMaW1pdCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gRmFzdCBwYXRoIGZvciBsaW1pdGVkIHVuc29ydGVkIHF1ZXJpZXMuXG4gICAgICAvLyBYWFggJ2xlbmd0aCcgY2hlY2sgaGVyZSBzZWVtcyB3cm9uZyBmb3Igb3JkZXJlZFxuICAgICAgcmV0dXJuIChcbiAgICAgICAgIXRoaXMubGltaXQgfHxcbiAgICAgICAgdGhpcy5za2lwIHx8XG4gICAgICAgIHRoaXMuc29ydGVyIHx8XG4gICAgICAgIHJlc3VsdHMubGVuZ3RoICE9PSB0aGlzLmxpbWl0XG4gICAgICApO1xuICAgIH0pO1xuXG4gICAgaWYgKCFvcHRpb25zLm9yZGVyZWQpIHtcbiAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnNvcnRlcikge1xuICAgICAgcmVzdWx0cy5zb3J0KHRoaXMuc29ydGVyLmdldENvbXBhcmF0b3Ioe2Rpc3RhbmNlc30pKTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdGhlIGZ1bGwgc2V0IG9mIHJlc3VsdHMgaWYgdGhlcmUgaXMgbm8gc2tpcCBvciBsaW1pdCBvciBpZiB3ZSdyZVxuICAgIC8vIGlnbm9yaW5nIHRoZW1cbiAgICBpZiAoIWFwcGx5U2tpcExpbWl0IHx8ICghdGhpcy5saW1pdCAmJiAhdGhpcy5za2lwKSkge1xuICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdHMuc2xpY2UoXG4gICAgICB0aGlzLnNraXAsXG4gICAgICB0aGlzLmxpbWl0ID8gdGhpcy5saW1pdCArIHRoaXMuc2tpcCA6IHJlc3VsdHMubGVuZ3RoXG4gICAgKTtcbiAgfVxuXG4gIF9wdWJsaXNoQ3Vyc29yKHN1YnNjcmlwdGlvbikge1xuICAgIC8vIFhYWCBtaW5pbW9uZ28gc2hvdWxkIG5vdCBkZXBlbmQgb24gbW9uZ28tbGl2ZWRhdGEhXG4gICAgaWYgKCFQYWNrYWdlLm1vbmdvKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdDYW5cXCd0IHB1Ymxpc2ggZnJvbSBNaW5pbW9uZ28gd2l0aG91dCB0aGUgYG1vbmdvYCBwYWNrYWdlLidcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmNvbGxlY3Rpb24ubmFtZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnQ2FuXFwndCBwdWJsaXNoIGEgY3Vyc29yIGZyb20gYSBjb2xsZWN0aW9uIHdpdGhvdXQgYSBuYW1lLidcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIFBhY2thZ2UubW9uZ28uTW9uZ28uQ29sbGVjdGlvbi5fcHVibGlzaEN1cnNvcihcbiAgICAgIHRoaXMsXG4gICAgICBzdWJzY3JpcHRpb24sXG4gICAgICB0aGlzLmNvbGxlY3Rpb24ubmFtZVxuICAgICk7XG4gIH1cbn1cbiIsImltcG9ydCBDdXJzb3IgZnJvbSAnLi9jdXJzb3IuanMnO1xuaW1wb3J0IE9ic2VydmVIYW5kbGUgZnJvbSAnLi9vYnNlcnZlX2hhbmRsZS5qcyc7XG5pbXBvcnQge1xuICBoYXNPd24sXG4gIGlzSW5kZXhhYmxlLFxuICBpc051bWVyaWNLZXksXG4gIGlzT3BlcmF0b3JPYmplY3QsXG4gIHBvcHVsYXRlRG9jdW1lbnRXaXRoUXVlcnlGaWVsZHMsXG4gIHByb2plY3Rpb25EZXRhaWxzLFxufSBmcm9tICcuL2NvbW1vbi5qcyc7XG5cbi8vIFhYWCB0eXBlIGNoZWNraW5nIG9uIHNlbGVjdG9ycyAoZ3JhY2VmdWwgZXJyb3IgaWYgbWFsZm9ybWVkKVxuXG4vLyBMb2NhbENvbGxlY3Rpb246IGEgc2V0IG9mIGRvY3VtZW50cyB0aGF0IHN1cHBvcnRzIHF1ZXJpZXMgYW5kIG1vZGlmaWVycy5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExvY2FsQ29sbGVjdGlvbiB7XG4gIGNvbnN0cnVjdG9yKG5hbWUpIHtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIC8vIF9pZCAtPiBkb2N1bWVudCAoYWxzbyBjb250YWluaW5nIGlkKVxuICAgIHRoaXMuX2RvY3MgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcblxuICAgIHRoaXMuX29ic2VydmVRdWV1ZSA9IG5ldyBNZXRlb3IuX1N5bmNocm9ub3VzUXVldWUoKTtcblxuICAgIHRoaXMubmV4dF9xaWQgPSAxOyAvLyBsaXZlIHF1ZXJ5IGlkIGdlbmVyYXRvclxuXG4gICAgLy8gcWlkIC0+IGxpdmUgcXVlcnkgb2JqZWN0LiBrZXlzOlxuICAgIC8vICBvcmRlcmVkOiBib29sLiBvcmRlcmVkIHF1ZXJpZXMgaGF2ZSBhZGRlZEJlZm9yZS9tb3ZlZEJlZm9yZSBjYWxsYmFja3MuXG4gICAgLy8gIHJlc3VsdHM6IGFycmF5IChvcmRlcmVkKSBvciBvYmplY3QgKHVub3JkZXJlZCkgb2YgY3VycmVudCByZXN1bHRzXG4gICAgLy8gICAgKGFsaWFzZWQgd2l0aCB0aGlzLl9kb2NzISlcbiAgICAvLyAgcmVzdWx0c1NuYXBzaG90OiBzbmFwc2hvdCBvZiByZXN1bHRzLiBudWxsIGlmIG5vdCBwYXVzZWQuXG4gICAgLy8gIGN1cnNvcjogQ3Vyc29yIG9iamVjdCBmb3IgdGhlIHF1ZXJ5LlxuICAgIC8vICBzZWxlY3Rvciwgc29ydGVyLCAoY2FsbGJhY2tzKTogZnVuY3Rpb25zXG4gICAgdGhpcy5xdWVyaWVzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAgIC8vIG51bGwgaWYgbm90IHNhdmluZyBvcmlnaW5hbHM7IGFuIElkTWFwIGZyb20gaWQgdG8gb3JpZ2luYWwgZG9jdW1lbnQgdmFsdWVcbiAgICAvLyBpZiBzYXZpbmcgb3JpZ2luYWxzLiBTZWUgY29tbWVudHMgYmVmb3JlIHNhdmVPcmlnaW5hbHMoKS5cbiAgICB0aGlzLl9zYXZlZE9yaWdpbmFscyA9IG51bGw7XG5cbiAgICAvLyBUcnVlIHdoZW4gb2JzZXJ2ZXJzIGFyZSBwYXVzZWQgYW5kIHdlIHNob3VsZCBub3Qgc2VuZCBjYWxsYmFja3MuXG4gICAgdGhpcy5wYXVzZWQgPSBmYWxzZTtcbiAgfVxuXG4gIC8vIG9wdGlvbnMgbWF5IGluY2x1ZGUgc29ydCwgc2tpcCwgbGltaXQsIHJlYWN0aXZlXG4gIC8vIHNvcnQgbWF5IGJlIGFueSBvZiB0aGVzZSBmb3JtczpcbiAgLy8gICAgIHthOiAxLCBiOiAtMX1cbiAgLy8gICAgIFtbXCJhXCIsIFwiYXNjXCJdLCBbXCJiXCIsIFwiZGVzY1wiXV1cbiAgLy8gICAgIFtcImFcIiwgW1wiYlwiLCBcImRlc2NcIl1dXG4gIC8vICAgKGluIHRoZSBmaXJzdCBmb3JtIHlvdSdyZSBiZWhvbGRlbiB0byBrZXkgZW51bWVyYXRpb24gb3JkZXIgaW5cbiAgLy8gICB5b3VyIGphdmFzY3JpcHQgVk0pXG4gIC8vXG4gIC8vIHJlYWN0aXZlOiBpZiBnaXZlbiwgYW5kIGZhbHNlLCBkb24ndCByZWdpc3RlciB3aXRoIFRyYWNrZXIgKGRlZmF1bHRcbiAgLy8gaXMgdHJ1ZSlcbiAgLy9cbiAgLy8gWFhYIHBvc3NpYmx5IHNob3VsZCBzdXBwb3J0IHJldHJpZXZpbmcgYSBzdWJzZXQgb2YgZmllbGRzPyBhbmRcbiAgLy8gaGF2ZSBpdCBiZSBhIGhpbnQgKGlnbm9yZWQgb24gdGhlIGNsaWVudCwgd2hlbiBub3QgY29weWluZyB0aGVcbiAgLy8gZG9jPylcbiAgLy9cbiAgLy8gWFhYIHNvcnQgZG9lcyBub3QgeWV0IHN1cHBvcnQgc3Via2V5cyAoJ2EuYicpIC4uIGZpeCB0aGF0IVxuICAvLyBYWFggYWRkIG9uZSBtb3JlIHNvcnQgZm9ybTogXCJrZXlcIlxuICAvLyBYWFggdGVzdHNcbiAgZmluZChzZWxlY3Rvciwgb3B0aW9ucykge1xuICAgIC8vIGRlZmF1bHQgc3ludGF4IGZvciBldmVyeXRoaW5nIGlzIHRvIG9taXQgdGhlIHNlbGVjdG9yIGFyZ3VtZW50LlxuICAgIC8vIGJ1dCBpZiBzZWxlY3RvciBpcyBleHBsaWNpdGx5IHBhc3NlZCBpbiBhcyBmYWxzZSBvciB1bmRlZmluZWQsIHdlXG4gICAgLy8gd2FudCBhIHNlbGVjdG9yIHRoYXQgbWF0Y2hlcyBub3RoaW5nLlxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBzZWxlY3RvciA9IHt9O1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgTG9jYWxDb2xsZWN0aW9uLkN1cnNvcih0aGlzLCBzZWxlY3Rvciwgb3B0aW9ucyk7XG4gIH1cblxuICBmaW5kT25lKHNlbGVjdG9yLCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgc2VsZWN0b3IgPSB7fTtcbiAgICB9XG5cbiAgICAvLyBOT1RFOiBieSBzZXR0aW5nIGxpbWl0IDEgaGVyZSwgd2UgZW5kIHVwIHVzaW5nIHZlcnkgaW5lZmZpY2llbnRcbiAgICAvLyBjb2RlIHRoYXQgcmVjb21wdXRlcyB0aGUgd2hvbGUgcXVlcnkgb24gZWFjaCB1cGRhdGUuIFRoZSB1cHNpZGUgaXNcbiAgICAvLyB0aGF0IHdoZW4geW91IHJlYWN0aXZlbHkgZGVwZW5kIG9uIGEgZmluZE9uZSB5b3Ugb25seSBnZXRcbiAgICAvLyBpbnZhbGlkYXRlZCB3aGVuIHRoZSBmb3VuZCBvYmplY3QgY2hhbmdlcywgbm90IGFueSBvYmplY3QgaW4gdGhlXG4gICAgLy8gY29sbGVjdGlvbi4gTW9zdCBmaW5kT25lIHdpbGwgYmUgYnkgaWQsIHdoaWNoIGhhcyBhIGZhc3QgcGF0aCwgc29cbiAgICAvLyB0aGlzIG1pZ2h0IG5vdCBiZSBhIGJpZyBkZWFsLiBJbiBtb3N0IGNhc2VzLCBpbnZhbGlkYXRpb24gY2F1c2VzXG4gICAgLy8gdGhlIGNhbGxlZCB0byByZS1xdWVyeSBhbnl3YXksIHNvIHRoaXMgc2hvdWxkIGJlIGEgbmV0IHBlcmZvcm1hbmNlXG4gICAgLy8gaW1wcm92ZW1lbnQuXG4gICAgb3B0aW9ucy5saW1pdCA9IDE7XG5cbiAgICByZXR1cm4gdGhpcy5maW5kKHNlbGVjdG9yLCBvcHRpb25zKS5mZXRjaCgpWzBdO1xuICB9XG5cbiAgLy8gWFhYIHBvc3NpYmx5IGVuZm9yY2UgdGhhdCAndW5kZWZpbmVkJyBkb2VzIG5vdCBhcHBlYXIgKHdlIGFzc3VtZVxuICAvLyB0aGlzIGluIG91ciBoYW5kbGluZyBvZiBudWxsIGFuZCAkZXhpc3RzKVxuICBpbnNlcnQoZG9jLCBjYWxsYmFjaykge1xuICAgIGRvYyA9IEVKU09OLmNsb25lKGRvYyk7XG5cbiAgICBhc3NlcnRIYXNWYWxpZEZpZWxkTmFtZXMoZG9jKTtcblxuICAgIC8vIGlmIHlvdSByZWFsbHkgd2FudCB0byB1c2UgT2JqZWN0SURzLCBzZXQgdGhpcyBnbG9iYWwuXG4gICAgLy8gTW9uZ28uQ29sbGVjdGlvbiBzcGVjaWZpZXMgaXRzIG93biBpZHMgYW5kIGRvZXMgbm90IHVzZSB0aGlzIGNvZGUuXG4gICAgaWYgKCFoYXNPd24uY2FsbChkb2MsICdfaWQnKSkge1xuICAgICAgZG9jLl9pZCA9IExvY2FsQ29sbGVjdGlvbi5fdXNlT0lEID8gbmV3IE1vbmdvSUQuT2JqZWN0SUQoKSA6IFJhbmRvbS5pZCgpO1xuICAgIH1cblxuICAgIGNvbnN0IGlkID0gZG9jLl9pZDtcblxuICAgIGlmICh0aGlzLl9kb2NzLmhhcyhpZCkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKGBEdXBsaWNhdGUgX2lkICcke2lkfSdgKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zYXZlT3JpZ2luYWwoaWQsIHVuZGVmaW5lZCk7XG4gICAgdGhpcy5fZG9jcy5zZXQoaWQsIGRvYyk7XG5cbiAgICBjb25zdCBxdWVyaWVzVG9SZWNvbXB1dGUgPSBbXTtcblxuICAgIC8vIHRyaWdnZXIgbGl2ZSBxdWVyaWVzIHRoYXQgbWF0Y2hcbiAgICBPYmplY3Qua2V5cyh0aGlzLnF1ZXJpZXMpLmZvckVhY2gocWlkID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3FpZF07XG5cbiAgICAgIGlmIChxdWVyeS5kaXJ0eSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG1hdGNoUmVzdWx0ID0gcXVlcnkubWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoZG9jKTtcblxuICAgICAgaWYgKG1hdGNoUmVzdWx0LnJlc3VsdCkge1xuICAgICAgICBpZiAocXVlcnkuZGlzdGFuY2VzICYmIG1hdGNoUmVzdWx0LmRpc3RhbmNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBxdWVyeS5kaXN0YW5jZXMuc2V0KGlkLCBtYXRjaFJlc3VsdC5kaXN0YW5jZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocXVlcnkuY3Vyc29yLnNraXAgfHwgcXVlcnkuY3Vyc29yLmxpbWl0KSB7XG4gICAgICAgICAgcXVlcmllc1RvUmVjb21wdXRlLnB1c2gocWlkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBMb2NhbENvbGxlY3Rpb24uX2luc2VydEluUmVzdWx0cyhxdWVyeSwgZG9jKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcXVlcmllc1RvUmVjb21wdXRlLmZvckVhY2gocWlkID0+IHtcbiAgICAgIGlmICh0aGlzLnF1ZXJpZXNbcWlkXSkge1xuICAgICAgICB0aGlzLl9yZWNvbXB1dGVSZXN1bHRzKHRoaXMucXVlcmllc1txaWRdKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuX29ic2VydmVRdWV1ZS5kcmFpbigpO1xuXG4gICAgLy8gRGVmZXIgYmVjYXVzZSB0aGUgY2FsbGVyIGxpa2VseSBkb2Vzbid0IGV4cGVjdCB0aGUgY2FsbGJhY2sgdG8gYmUgcnVuXG4gICAgLy8gaW1tZWRpYXRlbHkuXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICBNZXRlb3IuZGVmZXIoKCkgPT4ge1xuICAgICAgICBjYWxsYmFjayhudWxsLCBpZCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gaWQ7XG4gIH1cblxuICAvLyBQYXVzZSB0aGUgb2JzZXJ2ZXJzLiBObyBjYWxsYmFja3MgZnJvbSBvYnNlcnZlcnMgd2lsbCBmaXJlIHVudGlsXG4gIC8vICdyZXN1bWVPYnNlcnZlcnMnIGlzIGNhbGxlZC5cbiAgcGF1c2VPYnNlcnZlcnMoKSB7XG4gICAgLy8gTm8tb3AgaWYgYWxyZWFkeSBwYXVzZWQuXG4gICAgaWYgKHRoaXMucGF1c2VkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gU2V0IHRoZSAncGF1c2VkJyBmbGFnIHN1Y2ggdGhhdCBuZXcgb2JzZXJ2ZXIgbWVzc2FnZXMgZG9uJ3QgZmlyZS5cbiAgICB0aGlzLnBhdXNlZCA9IHRydWU7XG5cbiAgICAvLyBUYWtlIGEgc25hcHNob3Qgb2YgdGhlIHF1ZXJ5IHJlc3VsdHMgZm9yIGVhY2ggcXVlcnkuXG4gICAgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuICAgICAgcXVlcnkucmVzdWx0c1NuYXBzaG90ID0gRUpTT04uY2xvbmUocXVlcnkucmVzdWx0cyk7XG4gICAgfSk7XG4gIH1cblxuICByZW1vdmUoc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG4gICAgLy8gRWFzeSBzcGVjaWFsIGNhc2U6IGlmIHdlJ3JlIG5vdCBjYWxsaW5nIG9ic2VydmVDaGFuZ2VzIGNhbGxiYWNrcyBhbmRcbiAgICAvLyB3ZSdyZSBub3Qgc2F2aW5nIG9yaWdpbmFscyBhbmQgd2UgZ290IGFza2VkIHRvIHJlbW92ZSBldmVyeXRoaW5nLCB0aGVuXG4gICAgLy8ganVzdCBlbXB0eSBldmVyeXRoaW5nIGRpcmVjdGx5LlxuICAgIGlmICh0aGlzLnBhdXNlZCAmJiAhdGhpcy5fc2F2ZWRPcmlnaW5hbHMgJiYgRUpTT04uZXF1YWxzKHNlbGVjdG9yLCB7fSkpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX2RvY3Muc2l6ZSgpO1xuXG4gICAgICB0aGlzLl9kb2NzLmNsZWFyKCk7XG5cbiAgICAgIE9iamVjdC5rZXlzKHRoaXMucXVlcmllcykuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICAgIGlmIChxdWVyeS5vcmRlcmVkKSB7XG4gICAgICAgICAgcXVlcnkucmVzdWx0cyA9IFtdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHF1ZXJ5LnJlc3VsdHMuY2xlYXIoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBNZXRlb3IuZGVmZXIoKCkgPT4ge1xuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoc2VsZWN0b3IpO1xuICAgIGNvbnN0IHJlbW92ZSA9IFtdO1xuXG4gICAgdGhpcy5fZWFjaFBvc3NpYmx5TWF0Y2hpbmdEb2Moc2VsZWN0b3IsIChkb2MsIGlkKSA9PiB7XG4gICAgICBpZiAobWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoZG9jKS5yZXN1bHQpIHtcbiAgICAgICAgcmVtb3ZlLnB1c2goaWQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgcXVlcmllc1RvUmVjb21wdXRlID0gW107XG4gICAgY29uc3QgcXVlcnlSZW1vdmUgPSBbXTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVtb3ZlLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCByZW1vdmVJZCA9IHJlbW92ZVtpXTtcbiAgICAgIGNvbnN0IHJlbW92ZURvYyA9IHRoaXMuX2RvY3MuZ2V0KHJlbW92ZUlkKTtcblxuICAgICAgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3FpZF07XG5cbiAgICAgICAgaWYgKHF1ZXJ5LmRpcnR5KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHF1ZXJ5Lm1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKHJlbW92ZURvYykucmVzdWx0KSB7XG4gICAgICAgICAgaWYgKHF1ZXJ5LmN1cnNvci5za2lwIHx8IHF1ZXJ5LmN1cnNvci5saW1pdCkge1xuICAgICAgICAgICAgcXVlcmllc1RvUmVjb21wdXRlLnB1c2gocWlkKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcXVlcnlSZW1vdmUucHVzaCh7cWlkLCBkb2M6IHJlbW92ZURvY30pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuX3NhdmVPcmlnaW5hbChyZW1vdmVJZCwgcmVtb3ZlRG9jKTtcbiAgICAgIHRoaXMuX2RvY3MucmVtb3ZlKHJlbW92ZUlkKTtcbiAgICB9XG5cbiAgICAvLyBydW4gbGl2ZSBxdWVyeSBjYWxsYmFja3MgX2FmdGVyXyB3ZSd2ZSByZW1vdmVkIHRoZSBkb2N1bWVudHMuXG4gICAgcXVlcnlSZW1vdmUuZm9yRWFjaChyZW1vdmUgPT4ge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcmVtb3ZlLnFpZF07XG5cbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICBxdWVyeS5kaXN0YW5jZXMgJiYgcXVlcnkuZGlzdGFuY2VzLnJlbW92ZShyZW1vdmUuZG9jLl9pZCk7XG4gICAgICAgIExvY2FsQ29sbGVjdGlvbi5fcmVtb3ZlRnJvbVJlc3VsdHMocXVlcnksIHJlbW92ZS5kb2MpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcXVlcmllc1RvUmVjb21wdXRlLmZvckVhY2gocWlkID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3FpZF07XG5cbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICB0aGlzLl9yZWNvbXB1dGVSZXN1bHRzKHF1ZXJ5KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuX29ic2VydmVRdWV1ZS5kcmFpbigpO1xuXG4gICAgY29uc3QgcmVzdWx0ID0gcmVtb3ZlLmxlbmd0aDtcblxuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgTWV0ZW9yLmRlZmVyKCgpID0+IHtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyBSZXN1bWUgdGhlIG9ic2VydmVycy4gT2JzZXJ2ZXJzIGltbWVkaWF0ZWx5IHJlY2VpdmUgY2hhbmdlXG4gIC8vIG5vdGlmaWNhdGlvbnMgdG8gYnJpbmcgdGhlbSB0byB0aGUgY3VycmVudCBzdGF0ZSBvZiB0aGVcbiAgLy8gZGF0YWJhc2UuIE5vdGUgdGhhdCB0aGlzIGlzIG5vdCBqdXN0IHJlcGxheWluZyBhbGwgdGhlIGNoYW5nZXMgdGhhdFxuICAvLyBoYXBwZW5lZCBkdXJpbmcgdGhlIHBhdXNlLCBpdCBpcyBhIHNtYXJ0ZXIgJ2NvYWxlc2NlZCcgZGlmZi5cbiAgcmVzdW1lT2JzZXJ2ZXJzKCkge1xuICAgIC8vIE5vLW9wIGlmIG5vdCBwYXVzZWQuXG4gICAgaWYgKCF0aGlzLnBhdXNlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFVuc2V0IHRoZSAncGF1c2VkJyBmbGFnLiBNYWtlIHN1cmUgdG8gZG8gdGhpcyBmaXJzdCwgb3RoZXJ3aXNlXG4gICAgLy8gb2JzZXJ2ZXIgbWV0aG9kcyB3b24ndCBhY3R1YWxseSBmaXJlIHdoZW4gd2UgdHJpZ2dlciB0aGVtLlxuICAgIHRoaXMucGF1c2VkID0gZmFsc2U7XG5cbiAgICBPYmplY3Qua2V5cyh0aGlzLnF1ZXJpZXMpLmZvckVhY2gocWlkID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3FpZF07XG5cbiAgICAgIGlmIChxdWVyeS5kaXJ0eSkge1xuICAgICAgICBxdWVyeS5kaXJ0eSA9IGZhbHNlO1xuXG4gICAgICAgIC8vIHJlLWNvbXB1dGUgcmVzdWx0cyB3aWxsIHBlcmZvcm0gYExvY2FsQ29sbGVjdGlvbi5fZGlmZlF1ZXJ5Q2hhbmdlc2BcbiAgICAgICAgLy8gYXV0b21hdGljYWxseS5cbiAgICAgICAgdGhpcy5fcmVjb21wdXRlUmVzdWx0cyhxdWVyeSwgcXVlcnkucmVzdWx0c1NuYXBzaG90KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIERpZmYgdGhlIGN1cnJlbnQgcmVzdWx0cyBhZ2FpbnN0IHRoZSBzbmFwc2hvdCBhbmQgc2VuZCB0byBvYnNlcnZlcnMuXG4gICAgICAgIC8vIHBhc3MgdGhlIHF1ZXJ5IG9iamVjdCBmb3IgaXRzIG9ic2VydmVyIGNhbGxiYWNrcy5cbiAgICAgICAgTG9jYWxDb2xsZWN0aW9uLl9kaWZmUXVlcnlDaGFuZ2VzKFxuICAgICAgICAgIHF1ZXJ5Lm9yZGVyZWQsXG4gICAgICAgICAgcXVlcnkucmVzdWx0c1NuYXBzaG90LFxuICAgICAgICAgIHF1ZXJ5LnJlc3VsdHMsXG4gICAgICAgICAgcXVlcnksXG4gICAgICAgICAge3Byb2plY3Rpb25GbjogcXVlcnkucHJvamVjdGlvbkZufVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBxdWVyeS5yZXN1bHRzU25hcHNob3QgPSBudWxsO1xuICAgIH0pO1xuXG4gICAgdGhpcy5fb2JzZXJ2ZVF1ZXVlLmRyYWluKCk7XG4gIH1cblxuICByZXRyaWV2ZU9yaWdpbmFscygpIHtcbiAgICBpZiAoIXRoaXMuX3NhdmVkT3JpZ2luYWxzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbGxlZCByZXRyaWV2ZU9yaWdpbmFscyB3aXRob3V0IHNhdmVPcmlnaW5hbHMnKTtcbiAgICB9XG5cbiAgICBjb25zdCBvcmlnaW5hbHMgPSB0aGlzLl9zYXZlZE9yaWdpbmFscztcblxuICAgIHRoaXMuX3NhdmVkT3JpZ2luYWxzID0gbnVsbDtcblxuICAgIHJldHVybiBvcmlnaW5hbHM7XG4gIH1cblxuICAvLyBUbyB0cmFjayB3aGF0IGRvY3VtZW50cyBhcmUgYWZmZWN0ZWQgYnkgYSBwaWVjZSBvZiBjb2RlLCBjYWxsXG4gIC8vIHNhdmVPcmlnaW5hbHMoKSBiZWZvcmUgaXQgYW5kIHJldHJpZXZlT3JpZ2luYWxzKCkgYWZ0ZXIgaXQuXG4gIC8vIHJldHJpZXZlT3JpZ2luYWxzIHJldHVybnMgYW4gb2JqZWN0IHdob3NlIGtleXMgYXJlIHRoZSBpZHMgb2YgdGhlIGRvY3VtZW50c1xuICAvLyB0aGF0IHdlcmUgYWZmZWN0ZWQgc2luY2UgdGhlIGNhbGwgdG8gc2F2ZU9yaWdpbmFscygpLCBhbmQgdGhlIHZhbHVlcyBhcmVcbiAgLy8gZXF1YWwgdG8gdGhlIGRvY3VtZW50J3MgY29udGVudHMgYXQgdGhlIHRpbWUgb2Ygc2F2ZU9yaWdpbmFscy4gKEluIHRoZSBjYXNlXG4gIC8vIG9mIGFuIGluc2VydGVkIGRvY3VtZW50LCB1bmRlZmluZWQgaXMgdGhlIHZhbHVlLikgWW91IG11c3QgYWx0ZXJuYXRlXG4gIC8vIGJldHdlZW4gY2FsbHMgdG8gc2F2ZU9yaWdpbmFscygpIGFuZCByZXRyaWV2ZU9yaWdpbmFscygpLlxuICBzYXZlT3JpZ2luYWxzKCkge1xuICAgIGlmICh0aGlzLl9zYXZlZE9yaWdpbmFscykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYWxsZWQgc2F2ZU9yaWdpbmFscyB0d2ljZSB3aXRob3V0IHJldHJpZXZlT3JpZ2luYWxzJyk7XG4gICAgfVxuXG4gICAgdGhpcy5fc2F2ZWRPcmlnaW5hbHMgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgfVxuXG4gIC8vIFhYWCBhdG9taWNpdHk6IGlmIG11bHRpIGlzIHRydWUsIGFuZCBvbmUgbW9kaWZpY2F0aW9uIGZhaWxzLCBkb1xuICAvLyB3ZSByb2xsYmFjayB0aGUgd2hvbGUgb3BlcmF0aW9uLCBvciB3aGF0P1xuICB1cGRhdGUoc2VsZWN0b3IsIG1vZCwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoISBjYWxsYmFjayAmJiBvcHRpb25zIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgIG9wdGlvbnMgPSBudWxsO1xuICAgIH1cblxuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoc2VsZWN0b3IsIHRydWUpO1xuXG4gICAgLy8gU2F2ZSB0aGUgb3JpZ2luYWwgcmVzdWx0cyBvZiBhbnkgcXVlcnkgdGhhdCB3ZSBtaWdodCBuZWVkIHRvXG4gICAgLy8gX3JlY29tcHV0ZVJlc3VsdHMgb24sIGJlY2F1c2UgX21vZGlmeUFuZE5vdGlmeSB3aWxsIG11dGF0ZSB0aGUgb2JqZWN0cyBpblxuICAgIC8vIGl0LiAoV2UgZG9uJ3QgbmVlZCB0byBzYXZlIHRoZSBvcmlnaW5hbCByZXN1bHRzIG9mIHBhdXNlZCBxdWVyaWVzIGJlY2F1c2VcbiAgICAvLyB0aGV5IGFscmVhZHkgaGF2ZSBhIHJlc3VsdHNTbmFwc2hvdCBhbmQgd2Ugd29uJ3QgYmUgZGlmZmluZyBpblxuICAgIC8vIF9yZWNvbXB1dGVSZXN1bHRzLilcbiAgICBjb25zdCBxaWRUb09yaWdpbmFsUmVzdWx0cyA9IHt9O1xuXG4gICAgLy8gV2Ugc2hvdWxkIG9ubHkgY2xvbmUgZWFjaCBkb2N1bWVudCBvbmNlLCBldmVuIGlmIGl0IGFwcGVhcnMgaW4gbXVsdGlwbGVcbiAgICAvLyBxdWVyaWVzXG4gICAgY29uc3QgZG9jTWFwID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gICAgY29uc3QgaWRzTWF0Y2hlZCA9IExvY2FsQ29sbGVjdGlvbi5faWRzTWF0Y2hlZEJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuXG4gICAgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAoKHF1ZXJ5LmN1cnNvci5za2lwIHx8IHF1ZXJ5LmN1cnNvci5saW1pdCkgJiYgISB0aGlzLnBhdXNlZCkge1xuICAgICAgICAvLyBDYXRjaCB0aGUgY2FzZSBvZiBhIHJlYWN0aXZlIGBjb3VudCgpYCBvbiBhIGN1cnNvciB3aXRoIHNraXBcbiAgICAgICAgLy8gb3IgbGltaXQsIHdoaWNoIHJlZ2lzdGVycyBhbiB1bm9yZGVyZWQgb2JzZXJ2ZS4gVGhpcyBpcyBhXG4gICAgICAgIC8vIHByZXR0eSByYXJlIGNhc2UsIHNvIHdlIGp1c3QgY2xvbmUgdGhlIGVudGlyZSByZXN1bHQgc2V0IHdpdGhcbiAgICAgICAgLy8gbm8gb3B0aW1pemF0aW9ucyBmb3IgZG9jdW1lbnRzIHRoYXQgYXBwZWFyIGluIHRoZXNlIHJlc3VsdFxuICAgICAgICAvLyBzZXRzIGFuZCBvdGhlciBxdWVyaWVzLlxuICAgICAgICBpZiAocXVlcnkucmVzdWx0cyBpbnN0YW5jZW9mIExvY2FsQ29sbGVjdGlvbi5fSWRNYXApIHtcbiAgICAgICAgICBxaWRUb09yaWdpbmFsUmVzdWx0c1txaWRdID0gcXVlcnkucmVzdWx0cy5jbG9uZSgpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghKHF1ZXJ5LnJlc3VsdHMgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Fzc2VydGlvbiBmYWlsZWQ6IHF1ZXJ5LnJlc3VsdHMgbm90IGFuIGFycmF5Jyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbG9uZXMgYSBkb2N1bWVudCB0byBiZSBzdG9yZWQgaW4gYHFpZFRvT3JpZ2luYWxSZXN1bHRzYFxuICAgICAgICAvLyBiZWNhdXNlIGl0IG1heSBiZSBtb2RpZmllZCBiZWZvcmUgdGhlIG5ldyBhbmQgb2xkIHJlc3VsdCBzZXRzXG4gICAgICAgIC8vIGFyZSBkaWZmZWQuIEJ1dCBpZiB3ZSBrbm93IGV4YWN0bHkgd2hpY2ggZG9jdW1lbnQgSURzIHdlJ3JlXG4gICAgICAgIC8vIGdvaW5nIHRvIG1vZGlmeSwgdGhlbiB3ZSBvbmx5IG5lZWQgdG8gY2xvbmUgdGhvc2UuXG4gICAgICAgIGNvbnN0IG1lbW9pemVkQ2xvbmVJZk5lZWRlZCA9IGRvYyA9PiB7XG4gICAgICAgICAgaWYgKGRvY01hcC5oYXMoZG9jLl9pZCkpIHtcbiAgICAgICAgICAgIHJldHVybiBkb2NNYXAuZ2V0KGRvYy5faWQpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGRvY1RvTWVtb2l6ZSA9IChcbiAgICAgICAgICAgIGlkc01hdGNoZWQgJiZcbiAgICAgICAgICAgICFpZHNNYXRjaGVkLnNvbWUoaWQgPT4gRUpTT04uZXF1YWxzKGlkLCBkb2MuX2lkKSlcbiAgICAgICAgICApID8gZG9jIDogRUpTT04uY2xvbmUoZG9jKTtcblxuICAgICAgICAgIGRvY01hcC5zZXQoZG9jLl9pZCwgZG9jVG9NZW1vaXplKTtcblxuICAgICAgICAgIHJldHVybiBkb2NUb01lbW9pemU7XG4gICAgICAgIH07XG5cbiAgICAgICAgcWlkVG9PcmlnaW5hbFJlc3VsdHNbcWlkXSA9IHF1ZXJ5LnJlc3VsdHMubWFwKG1lbW9pemVkQ2xvbmVJZk5lZWRlZCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCByZWNvbXB1dGVRaWRzID0ge307XG5cbiAgICBsZXQgdXBkYXRlQ291bnQgPSAwO1xuXG4gICAgdGhpcy5fZWFjaFBvc3NpYmx5TWF0Y2hpbmdEb2Moc2VsZWN0b3IsIChkb2MsIGlkKSA9PiB7XG4gICAgICBjb25zdCBxdWVyeVJlc3VsdCA9IG1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKGRvYyk7XG5cbiAgICAgIGlmIChxdWVyeVJlc3VsdC5yZXN1bHQpIHtcbiAgICAgICAgLy8gWFhYIFNob3VsZCB3ZSBzYXZlIHRoZSBvcmlnaW5hbCBldmVuIGlmIG1vZCBlbmRzIHVwIGJlaW5nIGEgbm8tb3A/XG4gICAgICAgIHRoaXMuX3NhdmVPcmlnaW5hbChpZCwgZG9jKTtcbiAgICAgICAgdGhpcy5fbW9kaWZ5QW5kTm90aWZ5KFxuICAgICAgICAgIGRvYyxcbiAgICAgICAgICBtb2QsXG4gICAgICAgICAgcmVjb21wdXRlUWlkcyxcbiAgICAgICAgICBxdWVyeVJlc3VsdC5hcnJheUluZGljZXNcbiAgICAgICAgKTtcblxuICAgICAgICArK3VwZGF0ZUNvdW50O1xuXG4gICAgICAgIGlmICghb3B0aW9ucy5tdWx0aSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTsgLy8gYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcblxuICAgIE9iamVjdC5rZXlzKHJlY29tcHV0ZVFpZHMpLmZvckVhY2gocWlkID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3FpZF07XG5cbiAgICAgIGlmIChxdWVyeSkge1xuICAgICAgICB0aGlzLl9yZWNvbXB1dGVSZXN1bHRzKHF1ZXJ5LCBxaWRUb09yaWdpbmFsUmVzdWx0c1txaWRdKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuX29ic2VydmVRdWV1ZS5kcmFpbigpO1xuXG4gICAgLy8gSWYgd2UgYXJlIGRvaW5nIGFuIHVwc2VydCwgYW5kIHdlIGRpZG4ndCBtb2RpZnkgYW55IGRvY3VtZW50cyB5ZXQsIHRoZW5cbiAgICAvLyBpdCdzIHRpbWUgdG8gZG8gYW4gaW5zZXJ0LiBGaWd1cmUgb3V0IHdoYXQgZG9jdW1lbnQgd2UgYXJlIGluc2VydGluZywgYW5kXG4gICAgLy8gZ2VuZXJhdGUgYW4gaWQgZm9yIGl0LlxuICAgIGxldCBpbnNlcnRlZElkO1xuICAgIGlmICh1cGRhdGVDb3VudCA9PT0gMCAmJiBvcHRpb25zLnVwc2VydCkge1xuICAgICAgY29uc3QgZG9jID0gTG9jYWxDb2xsZWN0aW9uLl9jcmVhdGVVcHNlcnREb2N1bWVudChzZWxlY3RvciwgbW9kKTtcbiAgICAgIGlmICghIGRvYy5faWQgJiYgb3B0aW9ucy5pbnNlcnRlZElkKSB7XG4gICAgICAgIGRvYy5faWQgPSBvcHRpb25zLmluc2VydGVkSWQ7XG4gICAgICB9XG5cbiAgICAgIGluc2VydGVkSWQgPSB0aGlzLmluc2VydChkb2MpO1xuICAgICAgdXBkYXRlQ291bnQgPSAxO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0aGUgbnVtYmVyIG9mIGFmZmVjdGVkIGRvY3VtZW50cywgb3IgaW4gdGhlIHVwc2VydCBjYXNlLCBhbiBvYmplY3RcbiAgICAvLyBjb250YWluaW5nIHRoZSBudW1iZXIgb2YgYWZmZWN0ZWQgZG9jcyBhbmQgdGhlIGlkIG9mIHRoZSBkb2MgdGhhdCB3YXNcbiAgICAvLyBpbnNlcnRlZCwgaWYgYW55LlxuICAgIGxldCByZXN1bHQ7XG4gICAgaWYgKG9wdGlvbnMuX3JldHVybk9iamVjdCkge1xuICAgICAgcmVzdWx0ID0ge251bWJlckFmZmVjdGVkOiB1cGRhdGVDb3VudH07XG5cbiAgICAgIGlmIChpbnNlcnRlZElkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVzdWx0Lmluc2VydGVkSWQgPSBpbnNlcnRlZElkO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQgPSB1cGRhdGVDb3VudDtcbiAgICB9XG5cbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIE1ldGVvci5kZWZlcigoKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gQSBjb252ZW5pZW5jZSB3cmFwcGVyIG9uIHVwZGF0ZS4gTG9jYWxDb2xsZWN0aW9uLnVwc2VydChzZWwsIG1vZCkgaXNcbiAgLy8gZXF1aXZhbGVudCB0byBMb2NhbENvbGxlY3Rpb24udXBkYXRlKHNlbCwgbW9kLCB7dXBzZXJ0OiB0cnVlLFxuICAvLyBfcmV0dXJuT2JqZWN0OiB0cnVlfSkuXG4gIHVwc2VydChzZWxlY3RvciwgbW9kLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmICghY2FsbGJhY2sgJiYgdHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy51cGRhdGUoXG4gICAgICBzZWxlY3RvcixcbiAgICAgIG1vZCxcbiAgICAgIE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHt1cHNlcnQ6IHRydWUsIF9yZXR1cm5PYmplY3Q6IHRydWV9KSxcbiAgICAgIGNhbGxiYWNrXG4gICAgKTtcbiAgfVxuXG4gIC8vIEl0ZXJhdGVzIG92ZXIgYSBzdWJzZXQgb2YgZG9jdW1lbnRzIHRoYXQgY291bGQgbWF0Y2ggc2VsZWN0b3I7IGNhbGxzXG4gIC8vIGZuKGRvYywgaWQpIG9uIGVhY2ggb2YgdGhlbS4gIFNwZWNpZmljYWxseSwgaWYgc2VsZWN0b3Igc3BlY2lmaWVzXG4gIC8vIHNwZWNpZmljIF9pZCdzLCBpdCBvbmx5IGxvb2tzIGF0IHRob3NlLiAgZG9jIGlzICpub3QqIGNsb25lZDogaXQgaXMgdGhlXG4gIC8vIHNhbWUgb2JqZWN0IHRoYXQgaXMgaW4gX2RvY3MuXG4gIF9lYWNoUG9zc2libHlNYXRjaGluZ0RvYyhzZWxlY3RvciwgZm4pIHtcbiAgICBjb25zdCBzcGVjaWZpY0lkcyA9IExvY2FsQ29sbGVjdGlvbi5faWRzTWF0Y2hlZEJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuXG4gICAgaWYgKHNwZWNpZmljSWRzKSB7XG4gICAgICBzcGVjaWZpY0lkcy5zb21lKGlkID0+IHtcbiAgICAgICAgY29uc3QgZG9jID0gdGhpcy5fZG9jcy5nZXQoaWQpO1xuXG4gICAgICAgIGlmIChkb2MpIHtcbiAgICAgICAgICByZXR1cm4gZm4oZG9jLCBpZCkgPT09IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZG9jcy5mb3JFYWNoKGZuKTtcbiAgICB9XG4gIH1cblxuICBfbW9kaWZ5QW5kTm90aWZ5KGRvYywgbW9kLCByZWNvbXB1dGVRaWRzLCBhcnJheUluZGljZXMpIHtcbiAgICBjb25zdCBtYXRjaGVkX2JlZm9yZSA9IHt9O1xuXG4gICAgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1txaWRdO1xuXG4gICAgICBpZiAocXVlcnkuZGlydHkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAocXVlcnkub3JkZXJlZCkge1xuICAgICAgICBtYXRjaGVkX2JlZm9yZVtxaWRdID0gcXVlcnkubWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoZG9jKS5yZXN1bHQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBCZWNhdXNlIHdlIGRvbid0IHN1cHBvcnQgc2tpcCBvciBsaW1pdCAoeWV0KSBpbiB1bm9yZGVyZWQgcXVlcmllcywgd2VcbiAgICAgICAgLy8gY2FuIGp1c3QgZG8gYSBkaXJlY3QgbG9va3VwLlxuICAgICAgICBtYXRjaGVkX2JlZm9yZVtxaWRdID0gcXVlcnkucmVzdWx0cy5oYXMoZG9jLl9pZCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBvbGRfZG9jID0gRUpTT04uY2xvbmUoZG9jKTtcblxuICAgIExvY2FsQ29sbGVjdGlvbi5fbW9kaWZ5KGRvYywgbW9kLCB7YXJyYXlJbmRpY2VzfSk7XG5cbiAgICBPYmplY3Qua2V5cyh0aGlzLnF1ZXJpZXMpLmZvckVhY2gocWlkID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3FpZF07XG5cbiAgICAgIGlmIChxdWVyeS5kaXJ0eSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGFmdGVyTWF0Y2ggPSBxdWVyeS5tYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhkb2MpO1xuICAgICAgY29uc3QgYWZ0ZXIgPSBhZnRlck1hdGNoLnJlc3VsdDtcbiAgICAgIGNvbnN0IGJlZm9yZSA9IG1hdGNoZWRfYmVmb3JlW3FpZF07XG5cbiAgICAgIGlmIChhZnRlciAmJiBxdWVyeS5kaXN0YW5jZXMgJiYgYWZ0ZXJNYXRjaC5kaXN0YW5jZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHF1ZXJ5LmRpc3RhbmNlcy5zZXQoZG9jLl9pZCwgYWZ0ZXJNYXRjaC5kaXN0YW5jZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChxdWVyeS5jdXJzb3Iuc2tpcCB8fCBxdWVyeS5jdXJzb3IubGltaXQpIHtcbiAgICAgICAgLy8gV2UgbmVlZCB0byByZWNvbXB1dGUgYW55IHF1ZXJ5IHdoZXJlIHRoZSBkb2MgbWF5IGhhdmUgYmVlbiBpbiB0aGVcbiAgICAgICAgLy8gY3Vyc29yJ3Mgd2luZG93IGVpdGhlciBiZWZvcmUgb3IgYWZ0ZXIgdGhlIHVwZGF0ZS4gKE5vdGUgdGhhdCBpZiBza2lwXG4gICAgICAgIC8vIG9yIGxpbWl0IGlzIHNldCwgXCJiZWZvcmVcIiBhbmQgXCJhZnRlclwiIGJlaW5nIHRydWUgZG8gbm90IG5lY2Vzc2FyaWx5XG4gICAgICAgIC8vIG1lYW4gdGhhdCB0aGUgZG9jdW1lbnQgaXMgaW4gdGhlIGN1cnNvcidzIG91dHB1dCBhZnRlciBza2lwL2xpbWl0IGlzXG4gICAgICAgIC8vIGFwcGxpZWQuLi4gYnV0IGlmIHRoZXkgYXJlIGZhbHNlLCB0aGVuIHRoZSBkb2N1bWVudCBkZWZpbml0ZWx5IGlzIE5PVFxuICAgICAgICAvLyBpbiB0aGUgb3V0cHV0LiBTbyBpdCdzIHNhZmUgdG8gc2tpcCByZWNvbXB1dGUgaWYgbmVpdGhlciBiZWZvcmUgb3JcbiAgICAgICAgLy8gYWZ0ZXIgYXJlIHRydWUuKVxuICAgICAgICBpZiAoYmVmb3JlIHx8IGFmdGVyKSB7XG4gICAgICAgICAgcmVjb21wdXRlUWlkc1txaWRdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChiZWZvcmUgJiYgIWFmdGVyKSB7XG4gICAgICAgIExvY2FsQ29sbGVjdGlvbi5fcmVtb3ZlRnJvbVJlc3VsdHMocXVlcnksIGRvYyk7XG4gICAgICB9IGVsc2UgaWYgKCFiZWZvcmUgJiYgYWZ0ZXIpIHtcbiAgICAgICAgTG9jYWxDb2xsZWN0aW9uLl9pbnNlcnRJblJlc3VsdHMocXVlcnksIGRvYyk7XG4gICAgICB9IGVsc2UgaWYgKGJlZm9yZSAmJiBhZnRlcikge1xuICAgICAgICBMb2NhbENvbGxlY3Rpb24uX3VwZGF0ZUluUmVzdWx0cyhxdWVyeSwgZG9jLCBvbGRfZG9jKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8vIFJlY29tcHV0ZXMgdGhlIHJlc3VsdHMgb2YgYSBxdWVyeSBhbmQgcnVucyBvYnNlcnZlIGNhbGxiYWNrcyBmb3IgdGhlXG4gIC8vIGRpZmZlcmVuY2UgYmV0d2VlbiB0aGUgcHJldmlvdXMgcmVzdWx0cyBhbmQgdGhlIGN1cnJlbnQgcmVzdWx0cyAodW5sZXNzXG4gIC8vIHBhdXNlZCkuIFVzZWQgZm9yIHNraXAvbGltaXQgcXVlcmllcy5cbiAgLy9cbiAgLy8gV2hlbiB0aGlzIGlzIHVzZWQgYnkgaW5zZXJ0IG9yIHJlbW92ZSwgaXQgY2FuIGp1c3QgdXNlIHF1ZXJ5LnJlc3VsdHMgZm9yXG4gIC8vIHRoZSBvbGQgcmVzdWx0cyAoYW5kIHRoZXJlJ3Mgbm8gbmVlZCB0byBwYXNzIGluIG9sZFJlc3VsdHMpLCBiZWNhdXNlIHRoZXNlXG4gIC8vIG9wZXJhdGlvbnMgZG9uJ3QgbXV0YXRlIHRoZSBkb2N1bWVudHMgaW4gdGhlIGNvbGxlY3Rpb24uIFVwZGF0ZSBuZWVkcyB0b1xuICAvLyBwYXNzIGluIGFuIG9sZFJlc3VsdHMgd2hpY2ggd2FzIGRlZXAtY29waWVkIGJlZm9yZSB0aGUgbW9kaWZpZXIgd2FzXG4gIC8vIGFwcGxpZWQuXG4gIC8vXG4gIC8vIG9sZFJlc3VsdHMgaXMgZ3VhcmFudGVlZCB0byBiZSBpZ25vcmVkIGlmIHRoZSBxdWVyeSBpcyBub3QgcGF1c2VkLlxuICBfcmVjb21wdXRlUmVzdWx0cyhxdWVyeSwgb2xkUmVzdWx0cykge1xuICAgIGlmICh0aGlzLnBhdXNlZCkge1xuICAgICAgLy8gVGhlcmUncyBubyByZWFzb24gdG8gcmVjb21wdXRlIHRoZSByZXN1bHRzIG5vdyBhcyB3ZSdyZSBzdGlsbCBwYXVzZWQuXG4gICAgICAvLyBCeSBmbGFnZ2luZyB0aGUgcXVlcnkgYXMgXCJkaXJ0eVwiLCB0aGUgcmVjb21wdXRlIHdpbGwgYmUgcGVyZm9ybWVkXG4gICAgICAvLyB3aGVuIHJlc3VtZU9ic2VydmVycyBpcyBjYWxsZWQuXG4gICAgICBxdWVyeS5kaXJ0eSA9IHRydWU7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLnBhdXNlZCAmJiAhb2xkUmVzdWx0cykge1xuICAgICAgb2xkUmVzdWx0cyA9IHF1ZXJ5LnJlc3VsdHM7XG4gICAgfVxuXG4gICAgaWYgKHF1ZXJ5LmRpc3RhbmNlcykge1xuICAgICAgcXVlcnkuZGlzdGFuY2VzLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgcXVlcnkucmVzdWx0cyA9IHF1ZXJ5LmN1cnNvci5fZ2V0UmF3T2JqZWN0cyh7XG4gICAgICBkaXN0YW5jZXM6IHF1ZXJ5LmRpc3RhbmNlcyxcbiAgICAgIG9yZGVyZWQ6IHF1ZXJ5Lm9yZGVyZWRcbiAgICB9KTtcblxuICAgIGlmICghdGhpcy5wYXVzZWQpIHtcbiAgICAgIExvY2FsQ29sbGVjdGlvbi5fZGlmZlF1ZXJ5Q2hhbmdlcyhcbiAgICAgICAgcXVlcnkub3JkZXJlZCxcbiAgICAgICAgb2xkUmVzdWx0cyxcbiAgICAgICAgcXVlcnkucmVzdWx0cyxcbiAgICAgICAgcXVlcnksXG4gICAgICAgIHtwcm9qZWN0aW9uRm46IHF1ZXJ5LnByb2plY3Rpb25Gbn1cbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgX3NhdmVPcmlnaW5hbChpZCwgZG9jKSB7XG4gICAgLy8gQXJlIHdlIGV2ZW4gdHJ5aW5nIHRvIHNhdmUgb3JpZ2luYWxzP1xuICAgIGlmICghdGhpcy5fc2F2ZWRPcmlnaW5hbHMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBIYXZlIHdlIHByZXZpb3VzbHkgbXV0YXRlZCB0aGUgb3JpZ2luYWwgKGFuZCBzbyAnZG9jJyBpcyBub3QgYWN0dWFsbHlcbiAgICAvLyBvcmlnaW5hbCk/ICAoTm90ZSB0aGUgJ2hhcycgY2hlY2sgcmF0aGVyIHRoYW4gdHJ1dGg6IHdlIHN0b3JlIHVuZGVmaW5lZFxuICAgIC8vIGhlcmUgZm9yIGluc2VydGVkIGRvY3MhKVxuICAgIGlmICh0aGlzLl9zYXZlZE9yaWdpbmFscy5oYXMoaWQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fc2F2ZWRPcmlnaW5hbHMuc2V0KGlkLCBFSlNPTi5jbG9uZShkb2MpKTtcbiAgfVxufVxuXG5Mb2NhbENvbGxlY3Rpb24uQ3Vyc29yID0gQ3Vyc29yO1xuXG5Mb2NhbENvbGxlY3Rpb24uT2JzZXJ2ZUhhbmRsZSA9IE9ic2VydmVIYW5kbGU7XG5cbi8vIFhYWCBtYXliZSBtb3ZlIHRoZXNlIGludG8gYW5vdGhlciBPYnNlcnZlSGVscGVycyBwYWNrYWdlIG9yIHNvbWV0aGluZ1xuXG4vLyBfQ2FjaGluZ0NoYW5nZU9ic2VydmVyIGlzIGFuIG9iamVjdCB3aGljaCByZWNlaXZlcyBvYnNlcnZlQ2hhbmdlcyBjYWxsYmFja3Ncbi8vIGFuZCBrZWVwcyBhIGNhY2hlIG9mIHRoZSBjdXJyZW50IGN1cnNvciBzdGF0ZSB1cCB0byBkYXRlIGluIHRoaXMuZG9jcy4gVXNlcnNcbi8vIG9mIHRoaXMgY2xhc3Mgc2hvdWxkIHJlYWQgdGhlIGRvY3MgZmllbGQgYnV0IG5vdCBtb2RpZnkgaXQuIFlvdSBzaG91bGQgcGFzc1xuLy8gdGhlIFwiYXBwbHlDaGFuZ2VcIiBmaWVsZCBhcyB0aGUgY2FsbGJhY2tzIHRvIHRoZSB1bmRlcmx5aW5nIG9ic2VydmVDaGFuZ2VzXG4vLyBjYWxsLiBPcHRpb25hbGx5LCB5b3UgY2FuIHNwZWNpZnkgeW91ciBvd24gb2JzZXJ2ZUNoYW5nZXMgY2FsbGJhY2tzIHdoaWNoIGFyZVxuLy8gaW52b2tlZCBpbW1lZGlhdGVseSBiZWZvcmUgdGhlIGRvY3MgZmllbGQgaXMgdXBkYXRlZDsgdGhpcyBvYmplY3QgaXMgbWFkZVxuLy8gYXZhaWxhYmxlIGFzIGB0aGlzYCB0byB0aG9zZSBjYWxsYmFja3MuXG5Mb2NhbENvbGxlY3Rpb24uX0NhY2hpbmdDaGFuZ2VPYnNlcnZlciA9IGNsYXNzIF9DYWNoaW5nQ2hhbmdlT2JzZXJ2ZXIge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBvcmRlcmVkRnJvbUNhbGxiYWNrcyA9IChcbiAgICAgIG9wdGlvbnMuY2FsbGJhY2tzICYmXG4gICAgICBMb2NhbENvbGxlY3Rpb24uX29ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzQXJlT3JkZXJlZChvcHRpb25zLmNhbGxiYWNrcylcbiAgICApO1xuXG4gICAgaWYgKGhhc093bi5jYWxsKG9wdGlvbnMsICdvcmRlcmVkJykpIHtcbiAgICAgIHRoaXMub3JkZXJlZCA9IG9wdGlvbnMub3JkZXJlZDtcblxuICAgICAgaWYgKG9wdGlvbnMuY2FsbGJhY2tzICYmIG9wdGlvbnMub3JkZXJlZCAhPT0gb3JkZXJlZEZyb21DYWxsYmFja3MpIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoJ29yZGVyZWQgb3B0aW9uIGRvZXNuXFwndCBtYXRjaCBjYWxsYmFja3MnKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKG9wdGlvbnMuY2FsbGJhY2tzKSB7XG4gICAgICB0aGlzLm9yZGVyZWQgPSBvcmRlcmVkRnJvbUNhbGxiYWNrcztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgRXJyb3IoJ211c3QgcHJvdmlkZSBvcmRlcmVkIG9yIGNhbGxiYWNrcycpO1xuICAgIH1cblxuICAgIGNvbnN0IGNhbGxiYWNrcyA9IG9wdGlvbnMuY2FsbGJhY2tzIHx8IHt9O1xuXG4gICAgaWYgKHRoaXMub3JkZXJlZCkge1xuICAgICAgdGhpcy5kb2NzID0gbmV3IE9yZGVyZWREaWN0KE1vbmdvSUQuaWRTdHJpbmdpZnkpO1xuICAgICAgdGhpcy5hcHBseUNoYW5nZSA9IHtcbiAgICAgICAgYWRkZWRCZWZvcmU6IChpZCwgZmllbGRzLCBiZWZvcmUpID0+IHtcbiAgICAgICAgICBjb25zdCBkb2MgPSBFSlNPTi5jbG9uZShmaWVsZHMpO1xuXG4gICAgICAgICAgZG9jLl9pZCA9IGlkO1xuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrcy5hZGRlZEJlZm9yZSkge1xuICAgICAgICAgICAgY2FsbGJhY2tzLmFkZGVkQmVmb3JlLmNhbGwodGhpcywgaWQsIGZpZWxkcywgYmVmb3JlKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBUaGlzIGxpbmUgdHJpZ2dlcnMgaWYgd2UgcHJvdmlkZSBhZGRlZCB3aXRoIG1vdmVkQmVmb3JlLlxuICAgICAgICAgIGlmIChjYWxsYmFja3MuYWRkZWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrcy5hZGRlZC5jYWxsKHRoaXMsIGlkLCBmaWVsZHMpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFhYWCBjb3VsZCBgYmVmb3JlYCBiZSBhIGZhbHN5IElEPyAgVGVjaG5pY2FsbHlcbiAgICAgICAgICAvLyBpZFN0cmluZ2lmeSBzZWVtcyB0byBhbGxvdyBmb3IgdGhlbSAtLSB0aG91Z2hcbiAgICAgICAgICAvLyBPcmRlcmVkRGljdCB3b24ndCBjYWxsIHN0cmluZ2lmeSBvbiBhIGZhbHN5IGFyZy5cbiAgICAgICAgICB0aGlzLmRvY3MucHV0QmVmb3JlKGlkLCBkb2MsIGJlZm9yZSB8fCBudWxsKTtcbiAgICAgICAgfSxcbiAgICAgICAgbW92ZWRCZWZvcmU6IChpZCwgYmVmb3JlKSA9PiB7XG4gICAgICAgICAgY29uc3QgZG9jID0gdGhpcy5kb2NzLmdldChpZCk7XG5cbiAgICAgICAgICBpZiAoY2FsbGJhY2tzLm1vdmVkQmVmb3JlKSB7XG4gICAgICAgICAgICBjYWxsYmFja3MubW92ZWRCZWZvcmUuY2FsbCh0aGlzLCBpZCwgYmVmb3JlKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLmRvY3MubW92ZUJlZm9yZShpZCwgYmVmb3JlIHx8IG51bGwpO1xuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5kb2NzID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gICAgICB0aGlzLmFwcGx5Q2hhbmdlID0ge1xuICAgICAgICBhZGRlZDogKGlkLCBmaWVsZHMpID0+IHtcbiAgICAgICAgICBjb25zdCBkb2MgPSBFSlNPTi5jbG9uZShmaWVsZHMpO1xuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrcy5hZGRlZCkge1xuICAgICAgICAgICAgY2FsbGJhY2tzLmFkZGVkLmNhbGwodGhpcywgaWQsIGZpZWxkcyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZG9jLl9pZCA9IGlkO1xuXG4gICAgICAgICAgdGhpcy5kb2NzLnNldChpZCwgIGRvYyk7XG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFRoZSBtZXRob2RzIGluIF9JZE1hcCBhbmQgT3JkZXJlZERpY3QgdXNlZCBieSB0aGVzZSBjYWxsYmFja3MgYXJlXG4gICAgLy8gaWRlbnRpY2FsLlxuICAgIHRoaXMuYXBwbHlDaGFuZ2UuY2hhbmdlZCA9IChpZCwgZmllbGRzKSA9PiB7XG4gICAgICBjb25zdCBkb2MgPSB0aGlzLmRvY3MuZ2V0KGlkKTtcblxuICAgICAgaWYgKCFkb2MpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGlkIGZvciBjaGFuZ2VkOiAke2lkfWApO1xuICAgICAgfVxuXG4gICAgICBpZiAoY2FsbGJhY2tzLmNoYW5nZWQpIHtcbiAgICAgICAgY2FsbGJhY2tzLmNoYW5nZWQuY2FsbCh0aGlzLCBpZCwgRUpTT04uY2xvbmUoZmllbGRzKSk7XG4gICAgICB9XG5cbiAgICAgIERpZmZTZXF1ZW5jZS5hcHBseUNoYW5nZXMoZG9jLCBmaWVsZHMpO1xuICAgIH07XG5cbiAgICB0aGlzLmFwcGx5Q2hhbmdlLnJlbW92ZWQgPSBpZCA9PiB7XG4gICAgICBpZiAoY2FsbGJhY2tzLnJlbW92ZWQpIHtcbiAgICAgICAgY2FsbGJhY2tzLnJlbW92ZWQuY2FsbCh0aGlzLCBpZCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuZG9jcy5yZW1vdmUoaWQpO1xuICAgIH07XG4gIH1cbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5fSWRNYXAgPSBjbGFzcyBfSWRNYXAgZXh0ZW5kcyBJZE1hcCB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKE1vbmdvSUQuaWRTdHJpbmdpZnksIE1vbmdvSUQuaWRQYXJzZSk7XG4gIH1cbn07XG5cbi8vIFdyYXAgYSB0cmFuc2Zvcm0gZnVuY3Rpb24gdG8gcmV0dXJuIG9iamVjdHMgdGhhdCBoYXZlIHRoZSBfaWQgZmllbGRcbi8vIG9mIHRoZSB1bnRyYW5zZm9ybWVkIGRvY3VtZW50LiBUaGlzIGVuc3VyZXMgdGhhdCBzdWJzeXN0ZW1zIHN1Y2ggYXNcbi8vIHRoZSBvYnNlcnZlLXNlcXVlbmNlIHBhY2thZ2UgdGhhdCBjYWxsIGBvYnNlcnZlYCBjYW4ga2VlcCB0cmFjayBvZlxuLy8gdGhlIGRvY3VtZW50cyBpZGVudGl0aWVzLlxuLy9cbi8vIC0gUmVxdWlyZSB0aGF0IGl0IHJldHVybnMgb2JqZWN0c1xuLy8gLSBJZiB0aGUgcmV0dXJuIHZhbHVlIGhhcyBhbiBfaWQgZmllbGQsIHZlcmlmeSB0aGF0IGl0IG1hdGNoZXMgdGhlXG4vLyAgIG9yaWdpbmFsIF9pZCBmaWVsZFxuLy8gLSBJZiB0aGUgcmV0dXJuIHZhbHVlIGRvZXNuJ3QgaGF2ZSBhbiBfaWQgZmllbGQsIGFkZCBpdCBiYWNrLlxuTG9jYWxDb2xsZWN0aW9uLndyYXBUcmFuc2Zvcm0gPSB0cmFuc2Zvcm0gPT4ge1xuICBpZiAoIXRyYW5zZm9ybSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gTm8gbmVlZCB0byBkb3VibHktd3JhcCB0cmFuc2Zvcm1zLlxuICBpZiAodHJhbnNmb3JtLl9fd3JhcHBlZFRyYW5zZm9ybV9fKSB7XG4gICAgcmV0dXJuIHRyYW5zZm9ybTtcbiAgfVxuXG4gIGNvbnN0IHdyYXBwZWQgPSBkb2MgPT4ge1xuICAgIGlmICghaGFzT3duLmNhbGwoZG9jLCAnX2lkJykpIHtcbiAgICAgIC8vIFhYWCBkbyB3ZSBldmVyIGhhdmUgYSB0cmFuc2Zvcm0gb24gdGhlIG9wbG9nJ3MgY29sbGVjdGlvbj8gYmVjYXVzZSB0aGF0XG4gICAgICAvLyBjb2xsZWN0aW9uIGhhcyBubyBfaWQuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NhbiBvbmx5IHRyYW5zZm9ybSBkb2N1bWVudHMgd2l0aCBfaWQnKTtcbiAgICB9XG5cbiAgICBjb25zdCBpZCA9IGRvYy5faWQ7XG5cbiAgICAvLyBYWFggY29uc2lkZXIgbWFraW5nIHRyYWNrZXIgYSB3ZWFrIGRlcGVuZGVuY3kgYW5kIGNoZWNraW5nXG4gICAgLy8gUGFja2FnZS50cmFja2VyIGhlcmVcbiAgICBjb25zdCB0cmFuc2Zvcm1lZCA9IFRyYWNrZXIubm9ucmVhY3RpdmUoKCkgPT4gdHJhbnNmb3JtKGRvYykpO1xuXG4gICAgaWYgKCFMb2NhbENvbGxlY3Rpb24uX2lzUGxhaW5PYmplY3QodHJhbnNmb3JtZWQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3RyYW5zZm9ybSBtdXN0IHJldHVybiBvYmplY3QnKTtcbiAgICB9XG5cbiAgICBpZiAoaGFzT3duLmNhbGwodHJhbnNmb3JtZWQsICdfaWQnKSkge1xuICAgICAgaWYgKCFFSlNPTi5lcXVhbHModHJhbnNmb3JtZWQuX2lkLCBpZCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd0cmFuc2Zvcm1lZCBkb2N1bWVudCBjYW5cXCd0IGhhdmUgZGlmZmVyZW50IF9pZCcpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0cmFuc2Zvcm1lZC5faWQgPSBpZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJhbnNmb3JtZWQ7XG4gIH07XG5cbiAgd3JhcHBlZC5fX3dyYXBwZWRUcmFuc2Zvcm1fXyA9IHRydWU7XG5cbiAgcmV0dXJuIHdyYXBwZWQ7XG59O1xuXG4vLyBYWFggdGhlIHNvcnRlZC1xdWVyeSBsb2dpYyBiZWxvdyBpcyBsYXVnaGFibHkgaW5lZmZpY2llbnQuIHdlJ2xsXG4vLyBuZWVkIHRvIGNvbWUgdXAgd2l0aCBhIGJldHRlciBkYXRhc3RydWN0dXJlIGZvciB0aGlzLlxuLy9cbi8vIFhYWCB0aGUgbG9naWMgZm9yIG9ic2VydmluZyB3aXRoIGEgc2tpcCBvciBhIGxpbWl0IGlzIGV2ZW4gbW9yZVxuLy8gbGF1Z2hhYmx5IGluZWZmaWNpZW50LiB3ZSByZWNvbXB1dGUgdGhlIHdob2xlIHJlc3VsdHMgZXZlcnkgdGltZSFcblxuLy8gVGhpcyBiaW5hcnkgc2VhcmNoIHB1dHMgYSB2YWx1ZSBiZXR3ZWVuIGFueSBlcXVhbCB2YWx1ZXMsIGFuZCB0aGUgZmlyc3Rcbi8vIGxlc3NlciB2YWx1ZS5cbkxvY2FsQ29sbGVjdGlvbi5fYmluYXJ5U2VhcmNoID0gKGNtcCwgYXJyYXksIHZhbHVlKSA9PiB7XG4gIGxldCBmaXJzdCA9IDA7XG4gIGxldCByYW5nZSA9IGFycmF5Lmxlbmd0aDtcblxuICB3aGlsZSAocmFuZ2UgPiAwKSB7XG4gICAgY29uc3QgaGFsZlJhbmdlID0gTWF0aC5mbG9vcihyYW5nZSAvIDIpO1xuXG4gICAgaWYgKGNtcCh2YWx1ZSwgYXJyYXlbZmlyc3QgKyBoYWxmUmFuZ2VdKSA+PSAwKSB7XG4gICAgICBmaXJzdCArPSBoYWxmUmFuZ2UgKyAxO1xuICAgICAgcmFuZ2UgLT0gaGFsZlJhbmdlICsgMTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmFuZ2UgPSBoYWxmUmFuZ2U7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZpcnN0O1xufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9jaGVja1N1cHBvcnRlZFByb2plY3Rpb24gPSBmaWVsZHMgPT4ge1xuICBpZiAoZmllbGRzICE9PSBPYmplY3QoZmllbGRzKSB8fCBBcnJheS5pc0FycmF5KGZpZWxkcykpIHtcbiAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignZmllbGRzIG9wdGlvbiBtdXN0IGJlIGFuIG9iamVjdCcpO1xuICB9XG5cbiAgT2JqZWN0LmtleXMoZmllbGRzKS5mb3JFYWNoKGtleVBhdGggPT4ge1xuICAgIGlmIChrZXlQYXRoLnNwbGl0KCcuJykuaW5jbHVkZXMoJyQnKSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdNaW5pbW9uZ28gZG9lc25cXCd0IHN1cHBvcnQgJCBvcGVyYXRvciBpbiBwcm9qZWN0aW9ucyB5ZXQuJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zdCB2YWx1ZSA9IGZpZWxkc1trZXlQYXRoXTtcblxuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmXG4gICAgICAgIFsnJGVsZW1NYXRjaCcsICckbWV0YScsICckc2xpY2UnXS5zb21lKGtleSA9PlxuICAgICAgICAgIGhhc093bi5jYWxsKHZhbHVlLCBrZXkpXG4gICAgICAgICkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnTWluaW1vbmdvIGRvZXNuXFwndCBzdXBwb3J0IG9wZXJhdG9ycyBpbiBwcm9qZWN0aW9ucyB5ZXQuJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoIVsxLCAwLCB0cnVlLCBmYWxzZV0uaW5jbHVkZXModmFsdWUpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ1Byb2plY3Rpb24gdmFsdWVzIHNob3VsZCBiZSBvbmUgb2YgMSwgMCwgdHJ1ZSwgb3IgZmFsc2UnXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG59O1xuXG4vLyBLbm93cyBob3cgdG8gY29tcGlsZSBhIGZpZWxkcyBwcm9qZWN0aW9uIHRvIGEgcHJlZGljYXRlIGZ1bmN0aW9uLlxuLy8gQHJldHVybnMgLSBGdW5jdGlvbjogYSBjbG9zdXJlIHRoYXQgZmlsdGVycyBvdXQgYW4gb2JqZWN0IGFjY29yZGluZyB0byB0aGVcbi8vICAgICAgICAgICAgZmllbGRzIHByb2plY3Rpb24gcnVsZXM6XG4vLyAgICAgICAgICAgIEBwYXJhbSBvYmogLSBPYmplY3Q6IE1vbmdvREItc3R5bGVkIGRvY3VtZW50XG4vLyAgICAgICAgICAgIEByZXR1cm5zIC0gT2JqZWN0OiBhIGRvY3VtZW50IHdpdGggdGhlIGZpZWxkcyBmaWx0ZXJlZCBvdXRcbi8vICAgICAgICAgICAgICAgICAgICAgICBhY2NvcmRpbmcgdG8gcHJvamVjdGlvbiBydWxlcy4gRG9lc24ndCByZXRhaW4gc3ViZmllbGRzXG4vLyAgICAgICAgICAgICAgICAgICAgICAgb2YgcGFzc2VkIGFyZ3VtZW50LlxuTG9jYWxDb2xsZWN0aW9uLl9jb21waWxlUHJvamVjdGlvbiA9IGZpZWxkcyA9PiB7XG4gIExvY2FsQ29sbGVjdGlvbi5fY2hlY2tTdXBwb3J0ZWRQcm9qZWN0aW9uKGZpZWxkcyk7XG5cbiAgY29uc3QgX2lkUHJvamVjdGlvbiA9IGZpZWxkcy5faWQgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBmaWVsZHMuX2lkO1xuICBjb25zdCBkZXRhaWxzID0gcHJvamVjdGlvbkRldGFpbHMoZmllbGRzKTtcblxuICAvLyByZXR1cm5zIHRyYW5zZm9ybWVkIGRvYyBhY2NvcmRpbmcgdG8gcnVsZVRyZWVcbiAgY29uc3QgdHJhbnNmb3JtID0gKGRvYywgcnVsZVRyZWUpID0+IHtcbiAgICAvLyBTcGVjaWFsIGNhc2UgZm9yIFwic2V0c1wiXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZG9jKSkge1xuICAgICAgcmV0dXJuIGRvYy5tYXAoc3ViZG9jID0+IHRyYW5zZm9ybShzdWJkb2MsIHJ1bGVUcmVlKSk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0gZGV0YWlscy5pbmNsdWRpbmcgPyB7fSA6IEVKU09OLmNsb25lKGRvYyk7XG5cbiAgICBPYmplY3Qua2V5cyhydWxlVHJlZSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgaWYgKCFoYXNPd24uY2FsbChkb2MsIGtleSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBydWxlID0gcnVsZVRyZWVba2V5XTtcblxuICAgICAgaWYgKHJ1bGUgPT09IE9iamVjdChydWxlKSkge1xuICAgICAgICAvLyBGb3Igc3ViLW9iamVjdHMvc3Vic2V0cyB3ZSBicmFuY2hcbiAgICAgICAgaWYgKGRvY1trZXldID09PSBPYmplY3QoZG9jW2tleV0pKSB7XG4gICAgICAgICAgcmVzdWx0W2tleV0gPSB0cmFuc2Zvcm0oZG9jW2tleV0sIHJ1bGUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGRldGFpbHMuaW5jbHVkaW5nKSB7XG4gICAgICAgIC8vIE90aGVyd2lzZSB3ZSBkb24ndCBldmVuIHRvdWNoIHRoaXMgc3ViZmllbGRcbiAgICAgICAgcmVzdWx0W2tleV0gPSBFSlNPTi5jbG9uZShkb2Nba2V5XSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgcmVzdWx0W2tleV07XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIHJldHVybiBkb2MgPT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IHRyYW5zZm9ybShkb2MsIGRldGFpbHMudHJlZSk7XG5cbiAgICBpZiAoX2lkUHJvamVjdGlvbiAmJiBoYXNPd24uY2FsbChkb2MsICdfaWQnKSkge1xuICAgICAgcmVzdWx0Ll9pZCA9IGRvYy5faWQ7XG4gICAgfVxuXG4gICAgaWYgKCFfaWRQcm9qZWN0aW9uICYmIGhhc093bi5jYWxsKHJlc3VsdCwgJ19pZCcpKSB7XG4gICAgICBkZWxldGUgcmVzdWx0Ll9pZDtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufTtcblxuLy8gQ2FsY3VsYXRlcyB0aGUgZG9jdW1lbnQgdG8gaW5zZXJ0IGluIGNhc2Ugd2UncmUgZG9pbmcgYW4gdXBzZXJ0IGFuZCB0aGVcbi8vIHNlbGVjdG9yIGRvZXMgbm90IG1hdGNoIGFueSBlbGVtZW50c1xuTG9jYWxDb2xsZWN0aW9uLl9jcmVhdGVVcHNlcnREb2N1bWVudCA9IChzZWxlY3RvciwgbW9kaWZpZXIpID0+IHtcbiAgY29uc3Qgc2VsZWN0b3JEb2N1bWVudCA9IHBvcHVsYXRlRG9jdW1lbnRXaXRoUXVlcnlGaWVsZHMoc2VsZWN0b3IpO1xuICBjb25zdCBpc01vZGlmeSA9IExvY2FsQ29sbGVjdGlvbi5faXNNb2RpZmljYXRpb25Nb2QobW9kaWZpZXIpO1xuXG4gIGNvbnN0IG5ld0RvYyA9IHt9O1xuXG4gIGlmIChzZWxlY3RvckRvY3VtZW50Ll9pZCkge1xuICAgIG5ld0RvYy5faWQgPSBzZWxlY3RvckRvY3VtZW50Ll9pZDtcbiAgICBkZWxldGUgc2VsZWN0b3JEb2N1bWVudC5faWQ7XG4gIH1cblxuICAvLyBUaGlzIGRvdWJsZSBfbW9kaWZ5IGNhbGwgaXMgbWFkZSB0byBoZWxwIHdpdGggbmVzdGVkIHByb3BlcnRpZXMgKHNlZSBpc3N1ZVxuICAvLyAjODYzMSkuIFdlIGRvIHRoaXMgZXZlbiBpZiBpdCdzIGEgcmVwbGFjZW1lbnQgZm9yIHZhbGlkYXRpb24gcHVycG9zZXMgKGUuZy5cbiAgLy8gYW1iaWd1b3VzIGlkJ3MpXG4gIExvY2FsQ29sbGVjdGlvbi5fbW9kaWZ5KG5ld0RvYywgeyRzZXQ6IHNlbGVjdG9yRG9jdW1lbnR9KTtcbiAgTG9jYWxDb2xsZWN0aW9uLl9tb2RpZnkobmV3RG9jLCBtb2RpZmllciwge2lzSW5zZXJ0OiB0cnVlfSk7XG5cbiAgaWYgKGlzTW9kaWZ5KSB7XG4gICAgcmV0dXJuIG5ld0RvYztcbiAgfVxuXG4gIC8vIFJlcGxhY2VtZW50IGNhbiB0YWtlIF9pZCBmcm9tIHF1ZXJ5IGRvY3VtZW50XG4gIGNvbnN0IHJlcGxhY2VtZW50ID0gT2JqZWN0LmFzc2lnbih7fSwgbW9kaWZpZXIpO1xuICBpZiAobmV3RG9jLl9pZCkge1xuICAgIHJlcGxhY2VtZW50Ll9pZCA9IG5ld0RvYy5faWQ7XG4gIH1cblxuICByZXR1cm4gcmVwbGFjZW1lbnQ7XG59O1xuXG5Mb2NhbENvbGxlY3Rpb24uX2RpZmZPYmplY3RzID0gKGxlZnQsIHJpZ2h0LCBjYWxsYmFja3MpID0+IHtcbiAgcmV0dXJuIERpZmZTZXF1ZW5jZS5kaWZmT2JqZWN0cyhsZWZ0LCByaWdodCwgY2FsbGJhY2tzKTtcbn07XG5cbi8vIG9yZGVyZWQ6IGJvb2wuXG4vLyBvbGRfcmVzdWx0cyBhbmQgbmV3X3Jlc3VsdHM6IGNvbGxlY3Rpb25zIG9mIGRvY3VtZW50cy5cbi8vICAgIGlmIG9yZGVyZWQsIHRoZXkgYXJlIGFycmF5cy5cbi8vICAgIGlmIHVub3JkZXJlZCwgdGhleSBhcmUgSWRNYXBzXG5Mb2NhbENvbGxlY3Rpb24uX2RpZmZRdWVyeUNoYW5nZXMgPSAob3JkZXJlZCwgb2xkUmVzdWx0cywgbmV3UmVzdWx0cywgb2JzZXJ2ZXIsIG9wdGlvbnMpID0+XG4gIERpZmZTZXF1ZW5jZS5kaWZmUXVlcnlDaGFuZ2VzKG9yZGVyZWQsIG9sZFJlc3VsdHMsIG5ld1Jlc3VsdHMsIG9ic2VydmVyLCBvcHRpb25zKVxuO1xuXG5Mb2NhbENvbGxlY3Rpb24uX2RpZmZRdWVyeU9yZGVyZWRDaGFuZ2VzID0gKG9sZFJlc3VsdHMsIG5ld1Jlc3VsdHMsIG9ic2VydmVyLCBvcHRpb25zKSA9PlxuICBEaWZmU2VxdWVuY2UuZGlmZlF1ZXJ5T3JkZXJlZENoYW5nZXMob2xkUmVzdWx0cywgbmV3UmVzdWx0cywgb2JzZXJ2ZXIsIG9wdGlvbnMpXG47XG5cbkxvY2FsQ29sbGVjdGlvbi5fZGlmZlF1ZXJ5VW5vcmRlcmVkQ2hhbmdlcyA9IChvbGRSZXN1bHRzLCBuZXdSZXN1bHRzLCBvYnNlcnZlciwgb3B0aW9ucykgPT5cbiAgRGlmZlNlcXVlbmNlLmRpZmZRdWVyeVVub3JkZXJlZENoYW5nZXMob2xkUmVzdWx0cywgbmV3UmVzdWx0cywgb2JzZXJ2ZXIsIG9wdGlvbnMpXG47XG5cbkxvY2FsQ29sbGVjdGlvbi5fZmluZEluT3JkZXJlZFJlc3VsdHMgPSAocXVlcnksIGRvYykgPT4ge1xuICBpZiAoIXF1ZXJ5Lm9yZGVyZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhblxcJ3QgY2FsbCBfZmluZEluT3JkZXJlZFJlc3VsdHMgb24gdW5vcmRlcmVkIHF1ZXJ5Jyk7XG4gIH1cblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHF1ZXJ5LnJlc3VsdHMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAocXVlcnkucmVzdWx0c1tpXSA9PT0gZG9jKSB7XG4gICAgICByZXR1cm4gaTtcbiAgICB9XG4gIH1cblxuICB0aHJvdyBFcnJvcignb2JqZWN0IG1pc3NpbmcgZnJvbSBxdWVyeScpO1xufTtcblxuLy8gSWYgdGhpcyBpcyBhIHNlbGVjdG9yIHdoaWNoIGV4cGxpY2l0bHkgY29uc3RyYWlucyB0aGUgbWF0Y2ggYnkgSUQgdG8gYSBmaW5pdGVcbi8vIG51bWJlciBvZiBkb2N1bWVudHMsIHJldHVybnMgYSBsaXN0IG9mIHRoZWlyIElEcy4gIE90aGVyd2lzZSByZXR1cm5zXG4vLyBudWxsLiBOb3RlIHRoYXQgdGhlIHNlbGVjdG9yIG1heSBoYXZlIG90aGVyIHJlc3RyaWN0aW9ucyBzbyBpdCBtYXkgbm90IGV2ZW5cbi8vIG1hdGNoIHRob3NlIGRvY3VtZW50ISAgV2UgY2FyZSBhYm91dCAkaW4gYW5kICRhbmQgc2luY2UgdGhvc2UgYXJlIGdlbmVyYXRlZFxuLy8gYWNjZXNzLWNvbnRyb2xsZWQgdXBkYXRlIGFuZCByZW1vdmUuXG5Mb2NhbENvbGxlY3Rpb24uX2lkc01hdGNoZWRCeVNlbGVjdG9yID0gc2VsZWN0b3IgPT4ge1xuICAvLyBJcyB0aGUgc2VsZWN0b3IganVzdCBhbiBJRD9cbiAgaWYgKExvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkKHNlbGVjdG9yKSkge1xuICAgIHJldHVybiBbc2VsZWN0b3JdO1xuICB9XG5cbiAgaWYgKCFzZWxlY3Rvcikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gRG8gd2UgaGF2ZSBhbiBfaWQgY2xhdXNlP1xuICBpZiAoaGFzT3duLmNhbGwoc2VsZWN0b3IsICdfaWQnKSkge1xuICAgIC8vIElzIHRoZSBfaWQgY2xhdXNlIGp1c3QgYW4gSUQ/XG4gICAgaWYgKExvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkKHNlbGVjdG9yLl9pZCkpIHtcbiAgICAgIHJldHVybiBbc2VsZWN0b3IuX2lkXTtcbiAgICB9XG5cbiAgICAvLyBJcyB0aGUgX2lkIGNsYXVzZSB7X2lkOiB7JGluOiBbXCJ4XCIsIFwieVwiLCBcInpcIl19fT9cbiAgICBpZiAoc2VsZWN0b3IuX2lkXG4gICAgICAgICYmIEFycmF5LmlzQXJyYXkoc2VsZWN0b3IuX2lkLiRpbilcbiAgICAgICAgJiYgc2VsZWN0b3IuX2lkLiRpbi5sZW5ndGhcbiAgICAgICAgJiYgc2VsZWN0b3IuX2lkLiRpbi5ldmVyeShMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZCkpIHtcbiAgICAgIHJldHVybiBzZWxlY3Rvci5faWQuJGluO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gSWYgdGhpcyBpcyBhIHRvcC1sZXZlbCAkYW5kLCBhbmQgYW55IG9mIHRoZSBjbGF1c2VzIGNvbnN0cmFpbiB0aGVpclxuICAvLyBkb2N1bWVudHMsIHRoZW4gdGhlIHdob2xlIHNlbGVjdG9yIGlzIGNvbnN0cmFpbmVkIGJ5IGFueSBvbmUgY2xhdXNlJ3NcbiAgLy8gY29uc3RyYWludC4gKFdlbGwsIGJ5IHRoZWlyIGludGVyc2VjdGlvbiwgYnV0IHRoYXQgc2VlbXMgdW5saWtlbHkuKVxuICBpZiAoQXJyYXkuaXNBcnJheShzZWxlY3Rvci4kYW5kKSkge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2VsZWN0b3IuJGFuZC5sZW5ndGg7ICsraSkge1xuICAgICAgY29uc3Qgc3ViSWRzID0gTG9jYWxDb2xsZWN0aW9uLl9pZHNNYXRjaGVkQnlTZWxlY3RvcihzZWxlY3Rvci4kYW5kW2ldKTtcblxuICAgICAgaWYgKHN1Yklkcykge1xuICAgICAgICByZXR1cm4gc3ViSWRzO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9pbnNlcnRJblJlc3VsdHMgPSAocXVlcnksIGRvYykgPT4ge1xuICBjb25zdCBmaWVsZHMgPSBFSlNPTi5jbG9uZShkb2MpO1xuXG4gIGRlbGV0ZSBmaWVsZHMuX2lkO1xuXG4gIGlmIChxdWVyeS5vcmRlcmVkKSB7XG4gICAgaWYgKCFxdWVyeS5zb3J0ZXIpIHtcbiAgICAgIHF1ZXJ5LmFkZGVkQmVmb3JlKGRvYy5faWQsIHF1ZXJ5LnByb2plY3Rpb25GbihmaWVsZHMpLCBudWxsKTtcbiAgICAgIHF1ZXJ5LnJlc3VsdHMucHVzaChkb2MpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBpID0gTG9jYWxDb2xsZWN0aW9uLl9pbnNlcnRJblNvcnRlZExpc3QoXG4gICAgICAgIHF1ZXJ5LnNvcnRlci5nZXRDb21wYXJhdG9yKHtkaXN0YW5jZXM6IHF1ZXJ5LmRpc3RhbmNlc30pLFxuICAgICAgICBxdWVyeS5yZXN1bHRzLFxuICAgICAgICBkb2NcbiAgICAgICk7XG5cbiAgICAgIGxldCBuZXh0ID0gcXVlcnkucmVzdWx0c1tpICsgMV07XG4gICAgICBpZiAobmV4dCkge1xuICAgICAgICBuZXh0ID0gbmV4dC5faWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXh0ID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcXVlcnkuYWRkZWRCZWZvcmUoZG9jLl9pZCwgcXVlcnkucHJvamVjdGlvbkZuKGZpZWxkcyksIG5leHQpO1xuICAgIH1cblxuICAgIHF1ZXJ5LmFkZGVkKGRvYy5faWQsIHF1ZXJ5LnByb2plY3Rpb25GbihmaWVsZHMpKTtcbiAgfSBlbHNlIHtcbiAgICBxdWVyeS5hZGRlZChkb2MuX2lkLCBxdWVyeS5wcm9qZWN0aW9uRm4oZmllbGRzKSk7XG4gICAgcXVlcnkucmVzdWx0cy5zZXQoZG9jLl9pZCwgZG9jKTtcbiAgfVxufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9pbnNlcnRJblNvcnRlZExpc3QgPSAoY21wLCBhcnJheSwgdmFsdWUpID0+IHtcbiAgaWYgKGFycmF5Lmxlbmd0aCA9PT0gMCkge1xuICAgIGFycmF5LnB1c2godmFsdWUpO1xuICAgIHJldHVybiAwO1xuICB9XG5cbiAgY29uc3QgaSA9IExvY2FsQ29sbGVjdGlvbi5fYmluYXJ5U2VhcmNoKGNtcCwgYXJyYXksIHZhbHVlKTtcblxuICBhcnJheS5zcGxpY2UoaSwgMCwgdmFsdWUpO1xuXG4gIHJldHVybiBpO1xufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9pc01vZGlmaWNhdGlvbk1vZCA9IG1vZCA9PiB7XG4gIGxldCBpc01vZGlmeSA9IGZhbHNlO1xuICBsZXQgaXNSZXBsYWNlID0gZmFsc2U7XG5cbiAgT2JqZWN0LmtleXMobW9kKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgaWYgKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJykge1xuICAgICAgaXNNb2RpZnkgPSB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBpc1JlcGxhY2UgPSB0cnVlO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKGlzTW9kaWZ5ICYmIGlzUmVwbGFjZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdVcGRhdGUgcGFyYW1ldGVyIGNhbm5vdCBoYXZlIGJvdGggbW9kaWZpZXIgYW5kIG5vbi1tb2RpZmllciBmaWVsZHMuJ1xuICAgICk7XG4gIH1cblxuICByZXR1cm4gaXNNb2RpZnk7XG59O1xuXG4vLyBYWFggbWF5YmUgdGhpcyBzaG91bGQgYmUgRUpTT04uaXNPYmplY3QsIHRob3VnaCBFSlNPTiBkb2Vzbid0IGtub3cgYWJvdXRcbi8vIFJlZ0V4cFxuLy8gWFhYIG5vdGUgdGhhdCBfdHlwZSh1bmRlZmluZWQpID09PSAzISEhIVxuTG9jYWxDb2xsZWN0aW9uLl9pc1BsYWluT2JqZWN0ID0geCA9PiB7XG4gIHJldHVybiB4ICYmIExvY2FsQ29sbGVjdGlvbi5fZi5fdHlwZSh4KSA9PT0gMztcbn07XG5cbi8vIFhYWCBuZWVkIGEgc3RyYXRlZ3kgZm9yIHBhc3NpbmcgdGhlIGJpbmRpbmcgb2YgJCBpbnRvIHRoaXNcbi8vIGZ1bmN0aW9uLCBmcm9tIHRoZSBjb21waWxlZCBzZWxlY3RvclxuLy9cbi8vIG1heWJlIGp1c3Qge2tleS51cC50by5qdXN0LmJlZm9yZS5kb2xsYXJzaWduOiBhcnJheV9pbmRleH1cbi8vXG4vLyBYWFggYXRvbWljaXR5OiBpZiBvbmUgbW9kaWZpY2F0aW9uIGZhaWxzLCBkbyB3ZSByb2xsIGJhY2sgdGhlIHdob2xlXG4vLyBjaGFuZ2U/XG4vL1xuLy8gb3B0aW9uczpcbi8vICAgLSBpc0luc2VydCBpcyBzZXQgd2hlbiBfbW9kaWZ5IGlzIGJlaW5nIGNhbGxlZCB0byBjb21wdXRlIHRoZSBkb2N1bWVudCB0b1xuLy8gICAgIGluc2VydCBhcyBwYXJ0IG9mIGFuIHVwc2VydCBvcGVyYXRpb24uIFdlIHVzZSB0aGlzIHByaW1hcmlseSB0byBmaWd1cmVcbi8vICAgICBvdXQgd2hlbiB0byBzZXQgdGhlIGZpZWxkcyBpbiAkc2V0T25JbnNlcnQsIGlmIHByZXNlbnQuXG5Mb2NhbENvbGxlY3Rpb24uX21vZGlmeSA9IChkb2MsIG1vZGlmaWVyLCBvcHRpb25zID0ge30pID0+IHtcbiAgaWYgKCFMb2NhbENvbGxlY3Rpb24uX2lzUGxhaW5PYmplY3QobW9kaWZpZXIpKSB7XG4gICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ01vZGlmaWVyIG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gIH1cblxuICAvLyBNYWtlIHN1cmUgdGhlIGNhbGxlciBjYW4ndCBtdXRhdGUgb3VyIGRhdGEgc3RydWN0dXJlcy5cbiAgbW9kaWZpZXIgPSBFSlNPTi5jbG9uZShtb2RpZmllcik7XG5cbiAgY29uc3QgaXNNb2RpZmllciA9IGlzT3BlcmF0b3JPYmplY3QobW9kaWZpZXIpO1xuICBjb25zdCBuZXdEb2MgPSBpc01vZGlmaWVyID8gRUpTT04uY2xvbmUoZG9jKSA6IG1vZGlmaWVyO1xuXG4gIGlmIChpc01vZGlmaWVyKSB7XG4gICAgLy8gYXBwbHkgbW9kaWZpZXJzIHRvIHRoZSBkb2MuXG4gICAgT2JqZWN0LmtleXMobW9kaWZpZXIpLmZvckVhY2gob3BlcmF0b3IgPT4ge1xuICAgICAgLy8gVHJlYXQgJHNldE9uSW5zZXJ0IGFzICRzZXQgaWYgdGhpcyBpcyBhbiBpbnNlcnQuXG4gICAgICBjb25zdCBzZXRPbkluc2VydCA9IG9wdGlvbnMuaXNJbnNlcnQgJiYgb3BlcmF0b3IgPT09ICckc2V0T25JbnNlcnQnO1xuICAgICAgY29uc3QgbW9kRnVuYyA9IE1PRElGSUVSU1tzZXRPbkluc2VydCA/ICckc2V0JyA6IG9wZXJhdG9yXTtcbiAgICAgIGNvbnN0IG9wZXJhbmQgPSBtb2RpZmllcltvcGVyYXRvcl07XG5cbiAgICAgIGlmICghbW9kRnVuYykge1xuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihgSW52YWxpZCBtb2RpZmllciBzcGVjaWZpZWQgJHtvcGVyYXRvcn1gKTtcbiAgICAgIH1cblxuICAgICAgT2JqZWN0LmtleXMob3BlcmFuZCkuZm9yRWFjaChrZXlwYXRoID0+IHtcbiAgICAgICAgY29uc3QgYXJnID0gb3BlcmFuZFtrZXlwYXRoXTtcblxuICAgICAgICBpZiAoa2V5cGF0aCA9PT0gJycpIHtcbiAgICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignQW4gZW1wdHkgdXBkYXRlIHBhdGggaXMgbm90IHZhbGlkLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qga2V5cGFydHMgPSBrZXlwYXRoLnNwbGl0KCcuJyk7XG5cbiAgICAgICAgaWYgKCFrZXlwYXJ0cy5ldmVyeShCb29sZWFuKSkge1xuICAgICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAgICAgYFRoZSB1cGRhdGUgcGF0aCAnJHtrZXlwYXRofScgY29udGFpbnMgYW4gZW1wdHkgZmllbGQgbmFtZSwgYCArXG4gICAgICAgICAgICAnd2hpY2ggaXMgbm90IGFsbG93ZWQuJ1xuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0YXJnZXQgPSBmaW5kTW9kVGFyZ2V0KG5ld0RvYywga2V5cGFydHMsIHtcbiAgICAgICAgICBhcnJheUluZGljZXM6IG9wdGlvbnMuYXJyYXlJbmRpY2VzLFxuICAgICAgICAgIGZvcmJpZEFycmF5OiBvcGVyYXRvciA9PT0gJyRyZW5hbWUnLFxuICAgICAgICAgIG5vQ3JlYXRlOiBOT19DUkVBVEVfTU9ESUZJRVJTW29wZXJhdG9yXVxuICAgICAgICB9KTtcblxuICAgICAgICBtb2RGdW5jKHRhcmdldCwga2V5cGFydHMucG9wKCksIGFyZywga2V5cGF0aCwgbmV3RG9jKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgaWYgKGRvYy5faWQgJiYgIUVKU09OLmVxdWFscyhkb2MuX2lkLCBuZXdEb2MuX2lkKSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgIGBBZnRlciBhcHBseWluZyB0aGUgdXBkYXRlIHRvIHRoZSBkb2N1bWVudCB7X2lkOiBcIiR7ZG9jLl9pZH1cIiwgLi4ufSxgICtcbiAgICAgICAgJyB0aGUgKGltbXV0YWJsZSkgZmllbGQgXFwnX2lkXFwnIHdhcyBmb3VuZCB0byBoYXZlIGJlZW4gYWx0ZXJlZCB0byAnICtcbiAgICAgICAgYF9pZDogXCIke25ld0RvYy5faWR9XCJgXG4gICAgICApO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZG9jLl9pZCAmJiBtb2RpZmllci5faWQgJiYgIUVKU09OLmVxdWFscyhkb2MuX2lkLCBtb2RpZmllci5faWQpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgYFRoZSBfaWQgZmllbGQgY2Fubm90IGJlIGNoYW5nZWQgZnJvbSB7X2lkOiBcIiR7ZG9jLl9pZH1cIn0gdG8gYCArXG4gICAgICAgIGB7X2lkOiBcIiR7bW9kaWZpZXIuX2lkfVwifWBcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gcmVwbGFjZSB0aGUgd2hvbGUgZG9jdW1lbnRcbiAgICBhc3NlcnRIYXNWYWxpZEZpZWxkTmFtZXMobW9kaWZpZXIpO1xuICB9XG5cbiAgLy8gbW92ZSBuZXcgZG9jdW1lbnQgaW50byBwbGFjZS5cbiAgT2JqZWN0LmtleXMoZG9jKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgLy8gTm90ZTogdGhpcyB1c2VkIHRvIGJlIGZvciAodmFyIGtleSBpbiBkb2MpIGhvd2V2ZXIsIHRoaXMgZG9lcyBub3RcbiAgICAvLyB3b3JrIHJpZ2h0IGluIE9wZXJhLiBEZWxldGluZyBmcm9tIGEgZG9jIHdoaWxlIGl0ZXJhdGluZyBvdmVyIGl0XG4gICAgLy8gd291bGQgc29tZXRpbWVzIGNhdXNlIG9wZXJhIHRvIHNraXAgc29tZSBrZXlzLlxuICAgIGlmIChrZXkgIT09ICdfaWQnKSB7XG4gICAgICBkZWxldGUgZG9jW2tleV07XG4gICAgfVxuICB9KTtcblxuICBPYmplY3Qua2V5cyhuZXdEb2MpLmZvckVhY2goa2V5ID0+IHtcbiAgICBkb2Nba2V5XSA9IG5ld0RvY1trZXldO1xuICB9KTtcbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUZyb21PYnNlcnZlQ2hhbmdlcyA9IChjdXJzb3IsIG9ic2VydmVDYWxsYmFja3MpID0+IHtcbiAgY29uc3QgdHJhbnNmb3JtID0gY3Vyc29yLmdldFRyYW5zZm9ybSgpIHx8IChkb2MgPT4gZG9jKTtcbiAgbGV0IHN1cHByZXNzZWQgPSAhIW9ic2VydmVDYWxsYmFja3MuX3N1cHByZXNzX2luaXRpYWw7XG5cbiAgbGV0IG9ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzO1xuICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9vYnNlcnZlQ2FsbGJhY2tzQXJlT3JkZXJlZChvYnNlcnZlQ2FsbGJhY2tzKSkge1xuICAgIC8vIFRoZSBcIl9ub19pbmRpY2VzXCIgb3B0aW9uIHNldHMgYWxsIGluZGV4IGFyZ3VtZW50cyB0byAtMSBhbmQgc2tpcHMgdGhlXG4gICAgLy8gbGluZWFyIHNjYW5zIHJlcXVpcmVkIHRvIGdlbmVyYXRlIHRoZW0uICBUaGlzIGxldHMgb2JzZXJ2ZXJzIHRoYXQgZG9uJ3RcbiAgICAvLyBuZWVkIGFic29sdXRlIGluZGljZXMgYmVuZWZpdCBmcm9tIHRoZSBvdGhlciBmZWF0dXJlcyBvZiB0aGlzIEFQSSAtLVxuICAgIC8vIHJlbGF0aXZlIG9yZGVyLCB0cmFuc2Zvcm1zLCBhbmQgYXBwbHlDaGFuZ2VzIC0tIHdpdGhvdXQgdGhlIHNwZWVkIGhpdC5cbiAgICBjb25zdCBpbmRpY2VzID0gIW9ic2VydmVDYWxsYmFja3MuX25vX2luZGljZXM7XG5cbiAgICBvYnNlcnZlQ2hhbmdlc0NhbGxiYWNrcyA9IHtcbiAgICAgIGFkZGVkQmVmb3JlKGlkLCBmaWVsZHMsIGJlZm9yZSkge1xuICAgICAgICBpZiAoc3VwcHJlc3NlZCB8fCAhKG9ic2VydmVDYWxsYmFja3MuYWRkZWRBdCB8fCBvYnNlcnZlQ2FsbGJhY2tzLmFkZGVkKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGRvYyA9IHRyYW5zZm9ybShPYmplY3QuYXNzaWduKGZpZWxkcywge19pZDogaWR9KSk7XG5cbiAgICAgICAgaWYgKG9ic2VydmVDYWxsYmFja3MuYWRkZWRBdCkge1xuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MuYWRkZWRBdChcbiAgICAgICAgICAgIGRvYyxcbiAgICAgICAgICAgIGluZGljZXNcbiAgICAgICAgICAgICAgPyBiZWZvcmVcbiAgICAgICAgICAgICAgICA/IHRoaXMuZG9jcy5pbmRleE9mKGJlZm9yZSlcbiAgICAgICAgICAgICAgICA6IHRoaXMuZG9jcy5zaXplKClcbiAgICAgICAgICAgICAgOiAtMSxcbiAgICAgICAgICAgIGJlZm9yZVxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb2JzZXJ2ZUNhbGxiYWNrcy5hZGRlZChkb2MpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgY2hhbmdlZChpZCwgZmllbGRzKSB7XG4gICAgICAgIGlmICghKG9ic2VydmVDYWxsYmFja3MuY2hhbmdlZEF0IHx8IG9ic2VydmVDYWxsYmFja3MuY2hhbmdlZCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgZG9jID0gRUpTT04uY2xvbmUodGhpcy5kb2NzLmdldChpZCkpO1xuICAgICAgICBpZiAoIWRvYykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBpZCBmb3IgY2hhbmdlZDogJHtpZH1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9sZERvYyA9IHRyYW5zZm9ybShFSlNPTi5jbG9uZShkb2MpKTtcblxuICAgICAgICBEaWZmU2VxdWVuY2UuYXBwbHlDaGFuZ2VzKGRvYywgZmllbGRzKTtcblxuICAgICAgICBpZiAob2JzZXJ2ZUNhbGxiYWNrcy5jaGFuZ2VkQXQpIHtcbiAgICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLmNoYW5nZWRBdChcbiAgICAgICAgICAgIHRyYW5zZm9ybShkb2MpLFxuICAgICAgICAgICAgb2xkRG9jLFxuICAgICAgICAgICAgaW5kaWNlcyA/IHRoaXMuZG9jcy5pbmRleE9mKGlkKSA6IC0xXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLmNoYW5nZWQodHJhbnNmb3JtKGRvYyksIG9sZERvYyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBtb3ZlZEJlZm9yZShpZCwgYmVmb3JlKSB7XG4gICAgICAgIGlmICghb2JzZXJ2ZUNhbGxiYWNrcy5tb3ZlZFRvKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZnJvbSA9IGluZGljZXMgPyB0aGlzLmRvY3MuaW5kZXhPZihpZCkgOiAtMTtcbiAgICAgICAgbGV0IHRvID0gaW5kaWNlc1xuICAgICAgICAgID8gYmVmb3JlXG4gICAgICAgICAgICA/IHRoaXMuZG9jcy5pbmRleE9mKGJlZm9yZSlcbiAgICAgICAgICAgIDogdGhpcy5kb2NzLnNpemUoKVxuICAgICAgICAgIDogLTE7XG5cbiAgICAgICAgLy8gV2hlbiBub3QgbW92aW5nIGJhY2t3YXJkcywgYWRqdXN0IGZvciB0aGUgZmFjdCB0aGF0IHJlbW92aW5nIHRoZVxuICAgICAgICAvLyBkb2N1bWVudCBzbGlkZXMgZXZlcnl0aGluZyBiYWNrIG9uZSBzbG90LlxuICAgICAgICBpZiAodG8gPiBmcm9tKSB7XG4gICAgICAgICAgLS10bztcbiAgICAgICAgfVxuXG4gICAgICAgIG9ic2VydmVDYWxsYmFja3MubW92ZWRUbyhcbiAgICAgICAgICB0cmFuc2Zvcm0oRUpTT04uY2xvbmUodGhpcy5kb2NzLmdldChpZCkpKSxcbiAgICAgICAgICBmcm9tLFxuICAgICAgICAgIHRvLFxuICAgICAgICAgIGJlZm9yZSB8fCBudWxsXG4gICAgICAgICk7XG4gICAgICB9LFxuICAgICAgcmVtb3ZlZChpZCkge1xuICAgICAgICBpZiAoIShvYnNlcnZlQ2FsbGJhY2tzLnJlbW92ZWRBdCB8fCBvYnNlcnZlQ2FsbGJhY2tzLnJlbW92ZWQpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gdGVjaG5pY2FsbHkgbWF5YmUgdGhlcmUgc2hvdWxkIGJlIGFuIEVKU09OLmNsb25lIGhlcmUsIGJ1dCBpdCdzIGFib3V0XG4gICAgICAgIC8vIHRvIGJlIHJlbW92ZWQgZnJvbSB0aGlzLmRvY3MhXG4gICAgICAgIGNvbnN0IGRvYyA9IHRyYW5zZm9ybSh0aGlzLmRvY3MuZ2V0KGlkKSk7XG5cbiAgICAgICAgaWYgKG9ic2VydmVDYWxsYmFja3MucmVtb3ZlZEF0KSB7XG4gICAgICAgICAgb2JzZXJ2ZUNhbGxiYWNrcy5yZW1vdmVkQXQoZG9jLCBpbmRpY2VzID8gdGhpcy5kb2NzLmluZGV4T2YoaWQpIDogLTEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MucmVtb3ZlZChkb2MpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgb2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3MgPSB7XG4gICAgICBhZGRlZChpZCwgZmllbGRzKSB7XG4gICAgICAgIGlmICghc3VwcHJlc3NlZCAmJiBvYnNlcnZlQ2FsbGJhY2tzLmFkZGVkKSB7XG4gICAgICAgICAgb2JzZXJ2ZUNhbGxiYWNrcy5hZGRlZCh0cmFuc2Zvcm0oT2JqZWN0LmFzc2lnbihmaWVsZHMsIHtfaWQ6IGlkfSkpKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGNoYW5nZWQoaWQsIGZpZWxkcykge1xuICAgICAgICBpZiAob2JzZXJ2ZUNhbGxiYWNrcy5jaGFuZ2VkKSB7XG4gICAgICAgICAgY29uc3Qgb2xkRG9jID0gdGhpcy5kb2NzLmdldChpZCk7XG4gICAgICAgICAgY29uc3QgZG9jID0gRUpTT04uY2xvbmUob2xkRG9jKTtcblxuICAgICAgICAgIERpZmZTZXF1ZW5jZS5hcHBseUNoYW5nZXMoZG9jLCBmaWVsZHMpO1xuXG4gICAgICAgICAgb2JzZXJ2ZUNhbGxiYWNrcy5jaGFuZ2VkKFxuICAgICAgICAgICAgdHJhbnNmb3JtKGRvYyksXG4gICAgICAgICAgICB0cmFuc2Zvcm0oRUpTT04uY2xvbmUob2xkRG9jKSlcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgcmVtb3ZlZChpZCkge1xuICAgICAgICBpZiAob2JzZXJ2ZUNhbGxiYWNrcy5yZW1vdmVkKSB7XG4gICAgICAgICAgb2JzZXJ2ZUNhbGxiYWNrcy5yZW1vdmVkKHRyYW5zZm9ybSh0aGlzLmRvY3MuZ2V0KGlkKSkpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICBjb25zdCBjaGFuZ2VPYnNlcnZlciA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0NhY2hpbmdDaGFuZ2VPYnNlcnZlcih7XG4gICAgY2FsbGJhY2tzOiBvYnNlcnZlQ2hhbmdlc0NhbGxiYWNrc1xuICB9KTtcblxuICBjb25zdCBoYW5kbGUgPSBjdXJzb3Iub2JzZXJ2ZUNoYW5nZXMoY2hhbmdlT2JzZXJ2ZXIuYXBwbHlDaGFuZ2UpO1xuXG4gIHN1cHByZXNzZWQgPSBmYWxzZTtcblxuICByZXR1cm4gaGFuZGxlO1xufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9vYnNlcnZlQ2FsbGJhY2tzQXJlT3JkZXJlZCA9IGNhbGxiYWNrcyA9PiB7XG4gIGlmIChjYWxsYmFja3MuYWRkZWQgJiYgY2FsbGJhY2tzLmFkZGVkQXQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1BsZWFzZSBzcGVjaWZ5IG9ubHkgb25lIG9mIGFkZGVkKCkgYW5kIGFkZGVkQXQoKScpO1xuICB9XG5cbiAgaWYgKGNhbGxiYWNrcy5jaGFuZ2VkICYmIGNhbGxiYWNrcy5jaGFuZ2VkQXQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1BsZWFzZSBzcGVjaWZ5IG9ubHkgb25lIG9mIGNoYW5nZWQoKSBhbmQgY2hhbmdlZEF0KCknKTtcbiAgfVxuXG4gIGlmIChjYWxsYmFja3MucmVtb3ZlZCAmJiBjYWxsYmFja3MucmVtb3ZlZEF0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdQbGVhc2Ugc3BlY2lmeSBvbmx5IG9uZSBvZiByZW1vdmVkKCkgYW5kIHJlbW92ZWRBdCgpJyk7XG4gIH1cblxuICByZXR1cm4gISEoXG4gICAgY2FsbGJhY2tzLmFkZGVkQXQgfHxcbiAgICBjYWxsYmFja3MuY2hhbmdlZEF0IHx8XG4gICAgY2FsbGJhY2tzLm1vdmVkVG8gfHxcbiAgICBjYWxsYmFja3MucmVtb3ZlZEF0XG4gICk7XG59O1xuXG5Mb2NhbENvbGxlY3Rpb24uX29ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzQXJlT3JkZXJlZCA9IGNhbGxiYWNrcyA9PiB7XG4gIGlmIChjYWxsYmFja3MuYWRkZWQgJiYgY2FsbGJhY2tzLmFkZGVkQmVmb3JlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdQbGVhc2Ugc3BlY2lmeSBvbmx5IG9uZSBvZiBhZGRlZCgpIGFuZCBhZGRlZEJlZm9yZSgpJyk7XG4gIH1cblxuICByZXR1cm4gISEoY2FsbGJhY2tzLmFkZGVkQmVmb3JlIHx8IGNhbGxiYWNrcy5tb3ZlZEJlZm9yZSk7XG59O1xuXG5Mb2NhbENvbGxlY3Rpb24uX3JlbW92ZUZyb21SZXN1bHRzID0gKHF1ZXJ5LCBkb2MpID0+IHtcbiAgaWYgKHF1ZXJ5Lm9yZGVyZWQpIHtcbiAgICBjb25zdCBpID0gTG9jYWxDb2xsZWN0aW9uLl9maW5kSW5PcmRlcmVkUmVzdWx0cyhxdWVyeSwgZG9jKTtcblxuICAgIHF1ZXJ5LnJlbW92ZWQoZG9jLl9pZCk7XG4gICAgcXVlcnkucmVzdWx0cy5zcGxpY2UoaSwgMSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgaWQgPSBkb2MuX2lkOyAgLy8gaW4gY2FzZSBjYWxsYmFjayBtdXRhdGVzIGRvY1xuXG4gICAgcXVlcnkucmVtb3ZlZChkb2MuX2lkKTtcbiAgICBxdWVyeS5yZXN1bHRzLnJlbW92ZShpZCk7XG4gIH1cbn07XG5cbi8vIElzIHRoaXMgc2VsZWN0b3IganVzdCBzaG9ydGhhbmQgZm9yIGxvb2t1cCBieSBfaWQ/XG5Mb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZCA9IHNlbGVjdG9yID0+XG4gIHR5cGVvZiBzZWxlY3RvciA9PT0gJ251bWJlcicgfHxcbiAgdHlwZW9mIHNlbGVjdG9yID09PSAnc3RyaW5nJyB8fFxuICBzZWxlY3RvciBpbnN0YW5jZW9mIE1vbmdvSUQuT2JqZWN0SURcbjtcblxuLy8gSXMgdGhlIHNlbGVjdG9yIGp1c3QgbG9va3VwIGJ5IF9pZCAoc2hvcnRoYW5kIG9yIG5vdCk/XG5Mb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZFBlcmhhcHNBc09iamVjdCA9IHNlbGVjdG9yID0+XG4gIExvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkKHNlbGVjdG9yKSB8fFxuICBMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZChzZWxlY3RvciAmJiBzZWxlY3Rvci5faWQpICYmXG4gIE9iamVjdC5rZXlzKHNlbGVjdG9yKS5sZW5ndGggPT09IDFcbjtcblxuTG9jYWxDb2xsZWN0aW9uLl91cGRhdGVJblJlc3VsdHMgPSAocXVlcnksIGRvYywgb2xkX2RvYykgPT4ge1xuICBpZiAoIUVKU09OLmVxdWFscyhkb2MuX2lkLCBvbGRfZG9jLl9pZCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhblxcJ3QgY2hhbmdlIGEgZG9jXFwncyBfaWQgd2hpbGUgdXBkYXRpbmcnKTtcbiAgfVxuXG4gIGNvbnN0IHByb2plY3Rpb25GbiA9IHF1ZXJ5LnByb2plY3Rpb25GbjtcbiAgY29uc3QgY2hhbmdlZEZpZWxkcyA9IERpZmZTZXF1ZW5jZS5tYWtlQ2hhbmdlZEZpZWxkcyhcbiAgICBwcm9qZWN0aW9uRm4oZG9jKSxcbiAgICBwcm9qZWN0aW9uRm4ob2xkX2RvYylcbiAgKTtcblxuICBpZiAoIXF1ZXJ5Lm9yZGVyZWQpIHtcbiAgICBpZiAoT2JqZWN0LmtleXMoY2hhbmdlZEZpZWxkcykubGVuZ3RoKSB7XG4gICAgICBxdWVyeS5jaGFuZ2VkKGRvYy5faWQsIGNoYW5nZWRGaWVsZHMpO1xuICAgICAgcXVlcnkucmVzdWx0cy5zZXQoZG9jLl9pZCwgZG9jKTtcbiAgICB9XG5cbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBvbGRfaWR4ID0gTG9jYWxDb2xsZWN0aW9uLl9maW5kSW5PcmRlcmVkUmVzdWx0cyhxdWVyeSwgZG9jKTtcblxuICBpZiAoT2JqZWN0LmtleXMoY2hhbmdlZEZpZWxkcykubGVuZ3RoKSB7XG4gICAgcXVlcnkuY2hhbmdlZChkb2MuX2lkLCBjaGFuZ2VkRmllbGRzKTtcbiAgfVxuXG4gIGlmICghcXVlcnkuc29ydGVyKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8ganVzdCB0YWtlIGl0IG91dCBhbmQgcHV0IGl0IGJhY2sgaW4gYWdhaW4sIGFuZCBzZWUgaWYgdGhlIGluZGV4IGNoYW5nZXNcbiAgcXVlcnkucmVzdWx0cy5zcGxpY2Uob2xkX2lkeCwgMSk7XG5cbiAgY29uc3QgbmV3X2lkeCA9IExvY2FsQ29sbGVjdGlvbi5faW5zZXJ0SW5Tb3J0ZWRMaXN0KFxuICAgIHF1ZXJ5LnNvcnRlci5nZXRDb21wYXJhdG9yKHtkaXN0YW5jZXM6IHF1ZXJ5LmRpc3RhbmNlc30pLFxuICAgIHF1ZXJ5LnJlc3VsdHMsXG4gICAgZG9jXG4gICk7XG5cbiAgaWYgKG9sZF9pZHggIT09IG5ld19pZHgpIHtcbiAgICBsZXQgbmV4dCA9IHF1ZXJ5LnJlc3VsdHNbbmV3X2lkeCArIDFdO1xuICAgIGlmIChuZXh0KSB7XG4gICAgICBuZXh0ID0gbmV4dC5faWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5leHQgPSBudWxsO1xuICAgIH1cblxuICAgIHF1ZXJ5Lm1vdmVkQmVmb3JlICYmIHF1ZXJ5Lm1vdmVkQmVmb3JlKGRvYy5faWQsIG5leHQpO1xuICB9XG59O1xuXG5jb25zdCBNT0RJRklFUlMgPSB7XG4gICRjdXJyZW50RGF0ZSh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAodHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgaGFzT3duLmNhbGwoYXJnLCAnJHR5cGUnKSkge1xuICAgICAgaWYgKGFyZy4kdHlwZSAhPT0gJ2RhdGUnKSB7XG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAgICdNaW5pbW9uZ28gZG9lcyBjdXJyZW50bHkgb25seSBzdXBwb3J0IHRoZSBkYXRlIHR5cGUgaW4gJyArXG4gICAgICAgICAgJyRjdXJyZW50RGF0ZSBtb2RpZmllcnMnLFxuICAgICAgICAgIHtmaWVsZH1cbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGFyZyAhPT0gdHJ1ZSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ0ludmFsaWQgJGN1cnJlbnREYXRlIG1vZGlmaWVyJywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgdGFyZ2V0W2ZpZWxkXSA9IG5ldyBEYXRlKCk7XG4gIH0sXG4gICRtaW4odGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKHR5cGVvZiBhcmcgIT09ICdudW1iZXInKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignTW9kaWZpZXIgJG1pbiBhbGxvd2VkIGZvciBudW1iZXJzIG9ubHknLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICBpZiAoZmllbGQgaW4gdGFyZ2V0KSB7XG4gICAgICBpZiAodHlwZW9mIHRhcmdldFtmaWVsZF0gIT09ICdudW1iZXInKSB7XG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAgICdDYW5ub3QgYXBwbHkgJG1pbiBtb2RpZmllciB0byBub24tbnVtYmVyJyxcbiAgICAgICAgICB7ZmllbGR9XG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0YXJnZXRbZmllbGRdID4gYXJnKSB7XG4gICAgICAgIHRhcmdldFtmaWVsZF0gPSBhcmc7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldFtmaWVsZF0gPSBhcmc7XG4gICAgfVxuICB9LFxuICAkbWF4KHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICh0eXBlb2YgYXJnICE9PSAnbnVtYmVyJykge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ01vZGlmaWVyICRtYXggYWxsb3dlZCBmb3IgbnVtYmVycyBvbmx5Jywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgaWYgKHR5cGVvZiB0YXJnZXRbZmllbGRdICE9PSAnbnVtYmVyJykge1xuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAnQ2Fubm90IGFwcGx5ICRtYXggbW9kaWZpZXIgdG8gbm9uLW51bWJlcicsXG4gICAgICAgICAge2ZpZWxkfVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBpZiAodGFyZ2V0W2ZpZWxkXSA8IGFyZykge1xuICAgICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgIH1cbiAgfSxcbiAgJGluYyh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAodHlwZW9mIGFyZyAhPT0gJ251bWJlcicpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdNb2RpZmllciAkaW5jIGFsbG93ZWQgZm9yIG51bWJlcnMgb25seScsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIGlmIChmaWVsZCBpbiB0YXJnZXQpIHtcbiAgICAgIGlmICh0eXBlb2YgdGFyZ2V0W2ZpZWxkXSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgJ0Nhbm5vdCBhcHBseSAkaW5jIG1vZGlmaWVyIHRvIG5vbi1udW1iZXInLFxuICAgICAgICAgIHtmaWVsZH1cbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgdGFyZ2V0W2ZpZWxkXSArPSBhcmc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldFtmaWVsZF0gPSBhcmc7XG4gICAgfVxuICB9LFxuICAkc2V0KHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICh0YXJnZXQgIT09IE9iamVjdCh0YXJnZXQpKSB7IC8vIG5vdCBhbiBhcnJheSBvciBhbiBvYmplY3RcbiAgICAgIGNvbnN0IGVycm9yID0gTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdDYW5ub3Qgc2V0IHByb3BlcnR5IG9uIG5vbi1vYmplY3QgZmllbGQnLFxuICAgICAgICB7ZmllbGR9XG4gICAgICApO1xuICAgICAgZXJyb3Iuc2V0UHJvcGVydHlFcnJvciA9IHRydWU7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICBpZiAodGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICBjb25zdCBlcnJvciA9IE1pbmltb25nb0Vycm9yKCdDYW5ub3Qgc2V0IHByb3BlcnR5IG9uIG51bGwnLCB7ZmllbGR9KTtcbiAgICAgIGVycm9yLnNldFByb3BlcnR5RXJyb3IgPSB0cnVlO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuXG4gICAgYXNzZXJ0SGFzVmFsaWRGaWVsZE5hbWVzKGFyZyk7XG5cbiAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICB9LFxuICAkc2V0T25JbnNlcnQodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgLy8gY29udmVydGVkIHRvIGAkc2V0YCBpbiBgX21vZGlmeWBcbiAgfSxcbiAgJHVuc2V0KHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICh0YXJnZXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKHRhcmdldCBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGlmIChmaWVsZCBpbiB0YXJnZXQpIHtcbiAgICAgICAgICB0YXJnZXRbZmllbGRdID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVsZXRlIHRhcmdldFtmaWVsZF07XG4gICAgICB9XG4gICAgfVxuICB9LFxuICAkcHVzaCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAodGFyZ2V0W2ZpZWxkXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0YXJnZXRbZmllbGRdID0gW107XG4gICAgfVxuXG4gICAgaWYgKCEodGFyZ2V0W2ZpZWxkXSBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ0Nhbm5vdCBhcHBseSAkcHVzaCBtb2RpZmllciB0byBub24tYXJyYXknLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICBpZiAoIShhcmcgJiYgYXJnLiRlYWNoKSkge1xuICAgICAgLy8gU2ltcGxlIG1vZGU6IG5vdCAkZWFjaFxuICAgICAgYXNzZXJ0SGFzVmFsaWRGaWVsZE5hbWVzKGFyZyk7XG5cbiAgICAgIHRhcmdldFtmaWVsZF0ucHVzaChhcmcpO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gRmFuY3kgbW9kZTogJGVhY2ggKGFuZCBtYXliZSAkc2xpY2UgYW5kICRzb3J0IGFuZCAkcG9zaXRpb24pXG4gICAgY29uc3QgdG9QdXNoID0gYXJnLiRlYWNoO1xuICAgIGlmICghKHRvUHVzaCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJyRlYWNoIG11c3QgYmUgYW4gYXJyYXknLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICBhc3NlcnRIYXNWYWxpZEZpZWxkTmFtZXModG9QdXNoKTtcblxuICAgIC8vIFBhcnNlICRwb3NpdGlvblxuICAgIGxldCBwb3NpdGlvbiA9IHVuZGVmaW5lZDtcbiAgICBpZiAoJyRwb3NpdGlvbicgaW4gYXJnKSB7XG4gICAgICBpZiAodHlwZW9mIGFyZy4kcG9zaXRpb24gIT09ICdudW1iZXInKSB7XG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCckcG9zaXRpb24gbXVzdCBiZSBhIG51bWVyaWMgdmFsdWUnLCB7ZmllbGR9KTtcbiAgICAgIH1cblxuICAgICAgLy8gWFhYIHNob3VsZCBjaGVjayB0byBtYWtlIHN1cmUgaW50ZWdlclxuICAgICAgaWYgKGFyZy4kcG9zaXRpb24gPCAwKSB7XG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAgICckcG9zaXRpb24gaW4gJHB1c2ggbXVzdCBiZSB6ZXJvIG9yIHBvc2l0aXZlJyxcbiAgICAgICAgICB7ZmllbGR9XG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHBvc2l0aW9uID0gYXJnLiRwb3NpdGlvbjtcbiAgICB9XG5cbiAgICAvLyBQYXJzZSAkc2xpY2UuXG4gICAgbGV0IHNsaWNlID0gdW5kZWZpbmVkO1xuICAgIGlmICgnJHNsaWNlJyBpbiBhcmcpIHtcbiAgICAgIGlmICh0eXBlb2YgYXJnLiRzbGljZSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJyRzbGljZSBtdXN0IGJlIGEgbnVtZXJpYyB2YWx1ZScsIHtmaWVsZH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBYWFggc2hvdWxkIGNoZWNrIHRvIG1ha2Ugc3VyZSBpbnRlZ2VyXG4gICAgICBzbGljZSA9IGFyZy4kc2xpY2U7XG4gICAgfVxuXG4gICAgLy8gUGFyc2UgJHNvcnQuXG4gICAgbGV0IHNvcnRGdW5jdGlvbiA9IHVuZGVmaW5lZDtcbiAgICBpZiAoYXJnLiRzb3J0KSB7XG4gICAgICBpZiAoc2xpY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignJHNvcnQgcmVxdWlyZXMgJHNsaWNlIHRvIGJlIHByZXNlbnQnLCB7ZmllbGR9KTtcbiAgICAgIH1cblxuICAgICAgLy8gWFhYIHRoaXMgYWxsb3dzIHVzIHRvIHVzZSBhICRzb3J0IHdob3NlIHZhbHVlIGlzIGFuIGFycmF5LCBidXQgdGhhdCdzXG4gICAgICAvLyBhY3R1YWxseSBhbiBleHRlbnNpb24gb2YgdGhlIE5vZGUgZHJpdmVyLCBzbyBpdCB3b24ndCB3b3JrXG4gICAgICAvLyBzZXJ2ZXItc2lkZS4gQ291bGQgYmUgY29uZnVzaW5nIVxuICAgICAgLy8gWFhYIGlzIGl0IGNvcnJlY3QgdGhhdCB3ZSBkb24ndCBkbyBnZW8tc3R1ZmYgaGVyZT9cbiAgICAgIHNvcnRGdW5jdGlvbiA9IG5ldyBNaW5pbW9uZ28uU29ydGVyKGFyZy4kc29ydCkuZ2V0Q29tcGFyYXRvcigpO1xuXG4gICAgICB0b1B1c2guZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgaWYgKExvY2FsQ29sbGVjdGlvbi5fZi5fdHlwZShlbGVtZW50KSAhPT0gMykge1xuICAgICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAgICAgJyRwdXNoIGxpa2UgbW9kaWZpZXJzIHVzaW5nICRzb3J0IHJlcXVpcmUgYWxsIGVsZW1lbnRzIHRvIGJlICcgK1xuICAgICAgICAgICAgJ29iamVjdHMnLFxuICAgICAgICAgICAge2ZpZWxkfVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFjdHVhbGx5IHB1c2guXG4gICAgaWYgKHBvc2l0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRvUHVzaC5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICB0YXJnZXRbZmllbGRdLnB1c2goZWxlbWVudCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc3BsaWNlQXJndW1lbnRzID0gW3Bvc2l0aW9uLCAwXTtcblxuICAgICAgdG9QdXNoLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIHNwbGljZUFyZ3VtZW50cy5wdXNoKGVsZW1lbnQpO1xuICAgICAgfSk7XG5cbiAgICAgIHRhcmdldFtmaWVsZF0uc3BsaWNlKC4uLnNwbGljZUFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgLy8gQWN0dWFsbHkgc29ydC5cbiAgICBpZiAoc29ydEZ1bmN0aW9uKSB7XG4gICAgICB0YXJnZXRbZmllbGRdLnNvcnQoc29ydEZ1bmN0aW9uKTtcbiAgICB9XG5cbiAgICAvLyBBY3R1YWxseSBzbGljZS5cbiAgICBpZiAoc2xpY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKHNsaWNlID09PSAwKSB7XG4gICAgICAgIHRhcmdldFtmaWVsZF0gPSBbXTsgLy8gZGlmZmVycyBmcm9tIEFycmF5LnNsaWNlIVxuICAgICAgfSBlbHNlIGlmIChzbGljZSA8IDApIHtcbiAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IHRhcmdldFtmaWVsZF0uc2xpY2Uoc2xpY2UpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IHRhcmdldFtmaWVsZF0uc2xpY2UoMCwgc2xpY2UpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgJHB1c2hBbGwodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKCEodHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignTW9kaWZpZXIgJHB1c2hBbGwvcHVsbEFsbCBhbGxvd2VkIGZvciBhcnJheXMgb25seScpO1xuICAgIH1cblxuICAgIGFzc2VydEhhc1ZhbGlkRmllbGROYW1lcyhhcmcpO1xuXG4gICAgY29uc3QgdG9QdXNoID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgIGlmICh0b1B1c2ggPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICB9IGVsc2UgaWYgKCEodG9QdXNoIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ0Nhbm5vdCBhcHBseSAkcHVzaEFsbCBtb2RpZmllciB0byBub24tYXJyYXknLFxuICAgICAgICB7ZmllbGR9XG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB0b1B1c2gucHVzaCguLi5hcmcpO1xuICAgIH1cbiAgfSxcbiAgJGFkZFRvU2V0KHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGxldCBpc0VhY2ggPSBmYWxzZTtcblxuICAgIGlmICh0eXBlb2YgYXJnID09PSAnb2JqZWN0Jykge1xuICAgICAgLy8gY2hlY2sgaWYgZmlyc3Qga2V5IGlzICckZWFjaCdcbiAgICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhhcmcpO1xuICAgICAgaWYgKGtleXNbMF0gPT09ICckZWFjaCcpIHtcbiAgICAgICAgaXNFYWNoID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB2YWx1ZXMgPSBpc0VhY2ggPyBhcmcuJGVhY2ggOiBbYXJnXTtcblxuICAgIGFzc2VydEhhc1ZhbGlkRmllbGROYW1lcyh2YWx1ZXMpO1xuXG4gICAgY29uc3QgdG9BZGQgPSB0YXJnZXRbZmllbGRdO1xuICAgIGlmICh0b0FkZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0YXJnZXRbZmllbGRdID0gdmFsdWVzO1xuICAgIH0gZWxzZSBpZiAoISh0b0FkZCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdDYW5ub3QgYXBwbHkgJGFkZFRvU2V0IG1vZGlmaWVyIHRvIG5vbi1hcnJheScsXG4gICAgICAgIHtmaWVsZH1cbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlcy5mb3JFYWNoKHZhbHVlID0+IHtcbiAgICAgICAgaWYgKHRvQWRkLnNvbWUoZWxlbWVudCA9PiBMb2NhbENvbGxlY3Rpb24uX2YuX2VxdWFsKHZhbHVlLCBlbGVtZW50KSkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0b0FkZC5wdXNoKHZhbHVlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcbiAgJHBvcCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAodGFyZ2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB0b1BvcCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICBpZiAodG9Qb3AgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghKHRvUG9wIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignQ2Fubm90IGFwcGx5ICRwb3AgbW9kaWZpZXIgdG8gbm9uLWFycmF5Jywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBhcmcgPT09ICdudW1iZXInICYmIGFyZyA8IDApIHtcbiAgICAgIHRvUG9wLnNwbGljZSgwLCAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdG9Qb3AucG9wKCk7XG4gICAgfVxuICB9LFxuICAkcHVsbCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAodGFyZ2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB0b1B1bGwgPSB0YXJnZXRbZmllbGRdO1xuICAgIGlmICh0b1B1bGwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghKHRvUHVsbCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdDYW5ub3QgYXBwbHkgJHB1bGwvcHVsbEFsbCBtb2RpZmllciB0byBub24tYXJyYXknLFxuICAgICAgICB7ZmllbGR9XG4gICAgICApO1xuICAgIH1cblxuICAgIGxldCBvdXQ7XG4gICAgaWYgKGFyZyAhPSBudWxsICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmICEoYXJnIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICAvLyBYWFggd291bGQgYmUgbXVjaCBuaWNlciB0byBjb21waWxlIHRoaXMgb25jZSwgcmF0aGVyIHRoYW5cbiAgICAgIC8vIGZvciBlYWNoIGRvY3VtZW50IHdlIG1vZGlmeS4uIGJ1dCB1c3VhbGx5IHdlJ3JlIG5vdFxuICAgICAgLy8gbW9kaWZ5aW5nIHRoYXQgbWFueSBkb2N1bWVudHMsIHNvIHdlJ2xsIGxldCBpdCBzbGlkZSBmb3JcbiAgICAgIC8vIG5vd1xuXG4gICAgICAvLyBYWFggTWluaW1vbmdvLk1hdGNoZXIgaXNuJ3QgdXAgZm9yIHRoZSBqb2IsIGJlY2F1c2Ugd2UgbmVlZFxuICAgICAgLy8gdG8gcGVybWl0IHN0dWZmIGxpa2UgeyRwdWxsOiB7YTogeyRndDogNH19fS4uIHNvbWV0aGluZ1xuICAgICAgLy8gbGlrZSB7JGd0OiA0fSBpcyBub3Qgbm9ybWFsbHkgYSBjb21wbGV0ZSBzZWxlY3Rvci5cbiAgICAgIC8vIHNhbWUgaXNzdWUgYXMgJGVsZW1NYXRjaCBwb3NzaWJseT9cbiAgICAgIGNvbnN0IG1hdGNoZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoYXJnKTtcblxuICAgICAgb3V0ID0gdG9QdWxsLmZpbHRlcihlbGVtZW50ID0+ICFtYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhlbGVtZW50KS5yZXN1bHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgPSB0b1B1bGwuZmlsdGVyKGVsZW1lbnQgPT4gIUxvY2FsQ29sbGVjdGlvbi5fZi5fZXF1YWwoZWxlbWVudCwgYXJnKSk7XG4gICAgfVxuXG4gICAgdGFyZ2V0W2ZpZWxkXSA9IG91dDtcbiAgfSxcbiAgJHB1bGxBbGwodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKCEodHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ01vZGlmaWVyICRwdXNoQWxsL3B1bGxBbGwgYWxsb3dlZCBmb3IgYXJyYXlzIG9ubHknLFxuICAgICAgICB7ZmllbGR9XG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHRvUHVsbCA9IHRhcmdldFtmaWVsZF07XG5cbiAgICBpZiAodG9QdWxsID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoISh0b1B1bGwgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnQ2Fubm90IGFwcGx5ICRwdWxsL3B1bGxBbGwgbW9kaWZpZXIgdG8gbm9uLWFycmF5JyxcbiAgICAgICAge2ZpZWxkfVxuICAgICAgKTtcbiAgICB9XG5cbiAgICB0YXJnZXRbZmllbGRdID0gdG9QdWxsLmZpbHRlcihvYmplY3QgPT5cbiAgICAgICFhcmcuc29tZShlbGVtZW50ID0+IExvY2FsQ29sbGVjdGlvbi5fZi5fZXF1YWwob2JqZWN0LCBlbGVtZW50KSlcbiAgICApO1xuICB9LFxuICAkcmVuYW1lKHRhcmdldCwgZmllbGQsIGFyZywga2V5cGF0aCwgZG9jKSB7XG4gICAgLy8gbm8gaWRlYSB3aHkgbW9uZ28gaGFzIHRoaXMgcmVzdHJpY3Rpb24uLlxuICAgIGlmIChrZXlwYXRoID09PSBhcmcpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCckcmVuYW1lIHNvdXJjZSBtdXN0IGRpZmZlciBmcm9tIHRhcmdldCcsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIGlmICh0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCckcmVuYW1lIHNvdXJjZSBmaWVsZCBpbnZhbGlkJywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBhcmcgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignJHJlbmFtZSB0YXJnZXQgbXVzdCBiZSBhIHN0cmluZycsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIGlmIChhcmcuaW5jbHVkZXMoJ1xcMCcpKSB7XG4gICAgICAvLyBOdWxsIGJ5dGVzIGFyZSBub3QgYWxsb3dlZCBpbiBNb25nbyBmaWVsZCBuYW1lc1xuICAgICAgLy8gaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9yZWZlcmVuY2UvbGltaXRzLyNSZXN0cmljdGlvbnMtb24tRmllbGQtTmFtZXNcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnVGhlIFxcJ3RvXFwnIGZpZWxkIGZvciAkcmVuYW1lIGNhbm5vdCBjb250YWluIGFuIGVtYmVkZGVkIG51bGwgYnl0ZScsXG4gICAgICAgIHtmaWVsZH1cbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgb2JqZWN0ID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgIGRlbGV0ZSB0YXJnZXRbZmllbGRdO1xuXG4gICAgY29uc3Qga2V5cGFydHMgPSBhcmcuc3BsaXQoJy4nKTtcbiAgICBjb25zdCB0YXJnZXQyID0gZmluZE1vZFRhcmdldChkb2MsIGtleXBhcnRzLCB7Zm9yYmlkQXJyYXk6IHRydWV9KTtcblxuICAgIGlmICh0YXJnZXQyID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignJHJlbmFtZSB0YXJnZXQgZmllbGQgaW52YWxpZCcsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIHRhcmdldDJba2V5cGFydHMucG9wKCldID0gb2JqZWN0O1xuICB9LFxuICAkYml0KHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIC8vIFhYWCBtb25nbyBvbmx5IHN1cHBvcnRzICRiaXQgb24gaW50ZWdlcnMsIGFuZCB3ZSBvbmx5IHN1cHBvcnRcbiAgICAvLyBuYXRpdmUgamF2YXNjcmlwdCBudW1iZXJzIChkb3VibGVzKSBzbyBmYXIsIHNvIHdlIGNhbid0IHN1cHBvcnQgJGJpdFxuICAgIHRocm93IE1pbmltb25nb0Vycm9yKCckYml0IGlzIG5vdCBzdXBwb3J0ZWQnLCB7ZmllbGR9KTtcbiAgfSxcbn07XG5cbmNvbnN0IE5PX0NSRUFURV9NT0RJRklFUlMgPSB7XG4gICRwb3A6IHRydWUsXG4gICRwdWxsOiB0cnVlLFxuICAkcHVsbEFsbDogdHJ1ZSxcbiAgJHJlbmFtZTogdHJ1ZSxcbiAgJHVuc2V0OiB0cnVlXG59O1xuXG4vLyBNYWtlIHN1cmUgZmllbGQgbmFtZXMgZG8gbm90IGNvbnRhaW4gTW9uZ28gcmVzdHJpY3RlZFxuLy8gY2hhcmFjdGVycyAoJy4nLCAnJCcsICdcXDAnKS5cbi8vIGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvcmVmZXJlbmNlL2xpbWl0cy8jUmVzdHJpY3Rpb25zLW9uLUZpZWxkLU5hbWVzXG5jb25zdCBpbnZhbGlkQ2hhck1zZyA9IHtcbiAgJDogJ3N0YXJ0IHdpdGggXFwnJFxcJycsXG4gICcuJzogJ2NvbnRhaW4gXFwnLlxcJycsXG4gICdcXDAnOiAnY29udGFpbiBudWxsIGJ5dGVzJ1xufTtcblxuLy8gY2hlY2tzIGlmIGFsbCBmaWVsZCBuYW1lcyBpbiBhbiBvYmplY3QgYXJlIHZhbGlkXG5mdW5jdGlvbiBhc3NlcnRIYXNWYWxpZEZpZWxkTmFtZXMoZG9jKSB7XG4gIGlmIChkb2MgJiYgdHlwZW9mIGRvYyA9PT0gJ29iamVjdCcpIHtcbiAgICBKU09OLnN0cmluZ2lmeShkb2MsIChrZXksIHZhbHVlKSA9PiB7XG4gICAgICBhc3NlcnRJc1ZhbGlkRmllbGROYW1lKGtleSk7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYXNzZXJ0SXNWYWxpZEZpZWxkTmFtZShrZXkpIHtcbiAgbGV0IG1hdGNoO1xuICBpZiAodHlwZW9mIGtleSA9PT0gJ3N0cmluZycgJiYgKG1hdGNoID0ga2V5Lm1hdGNoKC9eXFwkfFxcLnxcXDAvKSkpIHtcbiAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihgS2V5ICR7a2V5fSBtdXN0IG5vdCAke2ludmFsaWRDaGFyTXNnW21hdGNoWzBdXX1gKTtcbiAgfVxufVxuXG4vLyBmb3IgYS5iLmMuMi5kLmUsIGtleXBhcnRzIHNob3VsZCBiZSBbJ2EnLCAnYicsICdjJywgJzInLCAnZCcsICdlJ10sXG4vLyBhbmQgdGhlbiB5b3Ugd291bGQgb3BlcmF0ZSBvbiB0aGUgJ2UnIHByb3BlcnR5IG9mIHRoZSByZXR1cm5lZFxuLy8gb2JqZWN0LlxuLy9cbi8vIGlmIG9wdGlvbnMubm9DcmVhdGUgaXMgZmFsc2V5LCBjcmVhdGVzIGludGVybWVkaWF0ZSBsZXZlbHMgb2Zcbi8vIHN0cnVjdHVyZSBhcyBuZWNlc3NhcnksIGxpa2UgbWtkaXIgLXAgKGFuZCByYWlzZXMgYW4gZXhjZXB0aW9uIGlmXG4vLyB0aGF0IHdvdWxkIG1lYW4gZ2l2aW5nIGEgbm9uLW51bWVyaWMgcHJvcGVydHkgdG8gYW4gYXJyYXkuKSBpZlxuLy8gb3B0aW9ucy5ub0NyZWF0ZSBpcyB0cnVlLCByZXR1cm4gdW5kZWZpbmVkIGluc3RlYWQuXG4vL1xuLy8gbWF5IG1vZGlmeSB0aGUgbGFzdCBlbGVtZW50IG9mIGtleXBhcnRzIHRvIHNpZ25hbCB0byB0aGUgY2FsbGVyIHRoYXQgaXQgbmVlZHNcbi8vIHRvIHVzZSBhIGRpZmZlcmVudCB2YWx1ZSB0byBpbmRleCBpbnRvIHRoZSByZXR1cm5lZCBvYmplY3QgKGZvciBleGFtcGxlLFxuLy8gWydhJywgJzAxJ10gLT4gWydhJywgMV0pLlxuLy9cbi8vIGlmIGZvcmJpZEFycmF5IGlzIHRydWUsIHJldHVybiBudWxsIGlmIHRoZSBrZXlwYXRoIGdvZXMgdGhyb3VnaCBhbiBhcnJheS5cbi8vXG4vLyBpZiBvcHRpb25zLmFycmF5SW5kaWNlcyBpcyBzZXQsIHVzZSBpdHMgZmlyc3QgZWxlbWVudCBmb3IgdGhlIChmaXJzdCkgJyQnIGluXG4vLyB0aGUgcGF0aC5cbmZ1bmN0aW9uIGZpbmRNb2RUYXJnZXQoZG9jLCBrZXlwYXJ0cywgb3B0aW9ucyA9IHt9KSB7XG4gIGxldCB1c2VkQXJyYXlJbmRleCA9IGZhbHNlO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwga2V5cGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBsYXN0ID0gaSA9PT0ga2V5cGFydHMubGVuZ3RoIC0gMTtcbiAgICBsZXQga2V5cGFydCA9IGtleXBhcnRzW2ldO1xuXG4gICAgaWYgKCFpc0luZGV4YWJsZShkb2MpKSB7XG4gICAgICBpZiAob3B0aW9ucy5ub0NyZWF0ZSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBlcnJvciA9IE1pbmltb25nb0Vycm9yKFxuICAgICAgICBgY2Fubm90IHVzZSB0aGUgcGFydCAnJHtrZXlwYXJ0fScgdG8gdHJhdmVyc2UgJHtkb2N9YFxuICAgICAgKTtcbiAgICAgIGVycm9yLnNldFByb3BlcnR5RXJyb3IgPSB0cnVlO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuXG4gICAgaWYgKGRvYyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICBpZiAob3B0aW9ucy5mb3JiaWRBcnJheSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgaWYgKGtleXBhcnQgPT09ICckJykge1xuICAgICAgICBpZiAodXNlZEFycmF5SW5kZXgpIHtcbiAgICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignVG9vIG1hbnkgcG9zaXRpb25hbCAoaS5lLiBcXCckXFwnKSBlbGVtZW50cycpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFvcHRpb25zLmFycmF5SW5kaWNlcyB8fCAhb3B0aW9ucy5hcnJheUluZGljZXMubGVuZ3RoKSB7XG4gICAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgICAnVGhlIHBvc2l0aW9uYWwgb3BlcmF0b3IgZGlkIG5vdCBmaW5kIHRoZSBtYXRjaCBuZWVkZWQgZnJvbSB0aGUgJyArXG4gICAgICAgICAgICAncXVlcnknXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGtleXBhcnQgPSBvcHRpb25zLmFycmF5SW5kaWNlc1swXTtcbiAgICAgICAgdXNlZEFycmF5SW5kZXggPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChpc051bWVyaWNLZXkoa2V5cGFydCkpIHtcbiAgICAgICAga2V5cGFydCA9IHBhcnNlSW50KGtleXBhcnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKG9wdGlvbnMubm9DcmVhdGUpIHtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgYGNhbid0IGFwcGVuZCB0byBhcnJheSB1c2luZyBzdHJpbmcgZmllbGQgbmFtZSBbJHtrZXlwYXJ0fV1gXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGlmIChsYXN0KSB7XG4gICAgICAgIGtleXBhcnRzW2ldID0ga2V5cGFydDsgLy8gaGFuZGxlICdhLjAxJ1xuICAgICAgfVxuXG4gICAgICBpZiAob3B0aW9ucy5ub0NyZWF0ZSAmJiBrZXlwYXJ0ID49IGRvYy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgd2hpbGUgKGRvYy5sZW5ndGggPCBrZXlwYXJ0KSB7XG4gICAgICAgIGRvYy5wdXNoKG51bGwpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWxhc3QpIHtcbiAgICAgICAgaWYgKGRvYy5sZW5ndGggPT09IGtleXBhcnQpIHtcbiAgICAgICAgICBkb2MucHVzaCh7fSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGRvY1trZXlwYXJ0XSAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAgIGBjYW4ndCBtb2RpZnkgZmllbGQgJyR7a2V5cGFydHNbaSArIDFdfScgb2YgbGlzdCB2YWx1ZSBgICtcbiAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGRvY1trZXlwYXJ0XSlcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGFzc2VydElzVmFsaWRGaWVsZE5hbWUoa2V5cGFydCk7XG5cbiAgICAgIGlmICghKGtleXBhcnQgaW4gZG9jKSkge1xuICAgICAgICBpZiAob3B0aW9ucy5ub0NyZWF0ZSkge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWxhc3QpIHtcbiAgICAgICAgICBkb2Nba2V5cGFydF0gPSB7fTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChsYXN0KSB7XG4gICAgICByZXR1cm4gZG9jO1xuICAgIH1cblxuICAgIGRvYyA9IGRvY1trZXlwYXJ0XTtcbiAgfVxuXG4gIC8vIG5vdHJlYWNoZWRcbn1cbiIsImltcG9ydCBMb2NhbENvbGxlY3Rpb24gZnJvbSAnLi9sb2NhbF9jb2xsZWN0aW9uLmpzJztcbmltcG9ydCB7XG4gIGNvbXBpbGVEb2N1bWVudFNlbGVjdG9yLFxuICBoYXNPd24sXG4gIG5vdGhpbmdNYXRjaGVyLFxufSBmcm9tICcuL2NvbW1vbi5qcyc7XG5cbi8vIFRoZSBtaW5pbW9uZ28gc2VsZWN0b3IgY29tcGlsZXIhXG5cbi8vIFRlcm1pbm9sb2d5OlxuLy8gIC0gYSAnc2VsZWN0b3InIGlzIHRoZSBFSlNPTiBvYmplY3QgcmVwcmVzZW50aW5nIGEgc2VsZWN0b3Jcbi8vICAtIGEgJ21hdGNoZXInIGlzIGl0cyBjb21waWxlZCBmb3JtICh3aGV0aGVyIGEgZnVsbCBNaW5pbW9uZ28uTWF0Y2hlclxuLy8gICAgb2JqZWN0IG9yIG9uZSBvZiB0aGUgY29tcG9uZW50IGxhbWJkYXMgdGhhdCBtYXRjaGVzIHBhcnRzIG9mIGl0KVxuLy8gIC0gYSAncmVzdWx0IG9iamVjdCcgaXMgYW4gb2JqZWN0IHdpdGggYSAncmVzdWx0JyBmaWVsZCBhbmQgbWF5YmVcbi8vICAgIGRpc3RhbmNlIGFuZCBhcnJheUluZGljZXMuXG4vLyAgLSBhICdicmFuY2hlZCB2YWx1ZScgaXMgYW4gb2JqZWN0IHdpdGggYSAndmFsdWUnIGZpZWxkIGFuZCBtYXliZVxuLy8gICAgJ2RvbnRJdGVyYXRlJyBhbmQgJ2FycmF5SW5kaWNlcycuXG4vLyAgLSBhICdkb2N1bWVudCcgaXMgYSB0b3AtbGV2ZWwgb2JqZWN0IHRoYXQgY2FuIGJlIHN0b3JlZCBpbiBhIGNvbGxlY3Rpb24uXG4vLyAgLSBhICdsb29rdXAgZnVuY3Rpb24nIGlzIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyBpbiBhIGRvY3VtZW50IGFuZCByZXR1cm5zXG4vLyAgICBhbiBhcnJheSBvZiAnYnJhbmNoZWQgdmFsdWVzJy5cbi8vICAtIGEgJ2JyYW5jaGVkIG1hdGNoZXInIG1hcHMgZnJvbSBhbiBhcnJheSBvZiBicmFuY2hlZCB2YWx1ZXMgdG8gYSByZXN1bHRcbi8vICAgIG9iamVjdC5cbi8vICAtIGFuICdlbGVtZW50IG1hdGNoZXInIG1hcHMgZnJvbSBhIHNpbmdsZSB2YWx1ZSB0byBhIGJvb2wuXG5cbi8vIE1haW4gZW50cnkgcG9pbnQuXG4vLyAgIHZhciBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKHthOiB7JGd0OiA1fX0pO1xuLy8gICBpZiAobWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoe2E6IDd9KSkgLi4uXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNYXRjaGVyIHtcbiAgY29uc3RydWN0b3Ioc2VsZWN0b3IsIGlzVXBkYXRlKSB7XG4gICAgLy8gQSBzZXQgKG9iamVjdCBtYXBwaW5nIHN0cmluZyAtPiAqKSBvZiBhbGwgb2YgdGhlIGRvY3VtZW50IHBhdGhzIGxvb2tlZFxuICAgIC8vIGF0IGJ5IHRoZSBzZWxlY3Rvci4gQWxzbyBpbmNsdWRlcyB0aGUgZW1wdHkgc3RyaW5nIGlmIGl0IG1heSBsb29rIGF0IGFueVxuICAgIC8vIHBhdGggKGVnLCAkd2hlcmUpLlxuICAgIHRoaXMuX3BhdGhzID0ge307XG4gICAgLy8gU2V0IHRvIHRydWUgaWYgY29tcGlsYXRpb24gZmluZHMgYSAkbmVhci5cbiAgICB0aGlzLl9oYXNHZW9RdWVyeSA9IGZhbHNlO1xuICAgIC8vIFNldCB0byB0cnVlIGlmIGNvbXBpbGF0aW9uIGZpbmRzIGEgJHdoZXJlLlxuICAgIHRoaXMuX2hhc1doZXJlID0gZmFsc2U7XG4gICAgLy8gU2V0IHRvIGZhbHNlIGlmIGNvbXBpbGF0aW9uIGZpbmRzIGFueXRoaW5nIG90aGVyIHRoYW4gYSBzaW1wbGUgZXF1YWxpdHlcbiAgICAvLyBvciBvbmUgb3IgbW9yZSBvZiAnJGd0JywgJyRndGUnLCAnJGx0JywgJyRsdGUnLCAnJG5lJywgJyRpbicsICckbmluJyB1c2VkXG4gICAgLy8gd2l0aCBzY2FsYXJzIGFzIG9wZXJhbmRzLlxuICAgIHRoaXMuX2lzU2ltcGxlID0gdHJ1ZTtcbiAgICAvLyBTZXQgdG8gYSBkdW1teSBkb2N1bWVudCB3aGljaCBhbHdheXMgbWF0Y2hlcyB0aGlzIE1hdGNoZXIuIE9yIHNldCB0byBudWxsXG4gICAgLy8gaWYgc3VjaCBkb2N1bWVudCBpcyB0b28gaGFyZCB0byBmaW5kLlxuICAgIHRoaXMuX21hdGNoaW5nRG9jdW1lbnQgPSB1bmRlZmluZWQ7XG4gICAgLy8gQSBjbG9uZSBvZiB0aGUgb3JpZ2luYWwgc2VsZWN0b3IuIEl0IG1heSBqdXN0IGJlIGEgZnVuY3Rpb24gaWYgdGhlIHVzZXJcbiAgICAvLyBwYXNzZWQgaW4gYSBmdW5jdGlvbjsgb3RoZXJ3aXNlIGlzIGRlZmluaXRlbHkgYW4gb2JqZWN0IChlZywgSURzIGFyZVxuICAgIC8vIHRyYW5zbGF0ZWQgaW50byB7X2lkOiBJRH0gZmlyc3QuIFVzZWQgYnkgY2FuQmVjb21lVHJ1ZUJ5TW9kaWZpZXIgYW5kXG4gICAgLy8gU29ydGVyLl91c2VXaXRoTWF0Y2hlci5cbiAgICB0aGlzLl9zZWxlY3RvciA9IG51bGw7XG4gICAgdGhpcy5fZG9jTWF0Y2hlciA9IHRoaXMuX2NvbXBpbGVTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgLy8gU2V0IHRvIHRydWUgaWYgc2VsZWN0aW9uIGlzIGRvbmUgZm9yIGFuIHVwZGF0ZSBvcGVyYXRpb25cbiAgICAvLyBEZWZhdWx0IGlzIGZhbHNlXG4gICAgLy8gVXNlZCBmb3IgJG5lYXIgYXJyYXkgdXBkYXRlIChpc3N1ZSAjMzU5OSlcbiAgICB0aGlzLl9pc1VwZGF0ZSA9IGlzVXBkYXRlO1xuICB9XG5cbiAgZG9jdW1lbnRNYXRjaGVzKGRvYykge1xuICAgIGlmIChkb2MgIT09IE9iamVjdChkb2MpKSB7XG4gICAgICB0aHJvdyBFcnJvcignZG9jdW1lbnRNYXRjaGVzIG5lZWRzIGEgZG9jdW1lbnQnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fZG9jTWF0Y2hlcihkb2MpO1xuICB9XG5cbiAgaGFzR2VvUXVlcnkoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hhc0dlb1F1ZXJ5O1xuICB9XG5cbiAgaGFzV2hlcmUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hhc1doZXJlO1xuICB9XG5cbiAgaXNTaW1wbGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lzU2ltcGxlO1xuICB9XG5cbiAgLy8gR2l2ZW4gYSBzZWxlY3RvciwgcmV0dXJuIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyBvbmUgYXJndW1lbnQsIGFcbiAgLy8gZG9jdW1lbnQuIEl0IHJldHVybnMgYSByZXN1bHQgb2JqZWN0LlxuICBfY29tcGlsZVNlbGVjdG9yKHNlbGVjdG9yKSB7XG4gICAgLy8geW91IGNhbiBwYXNzIGEgbGl0ZXJhbCBmdW5jdGlvbiBpbnN0ZWFkIG9mIGEgc2VsZWN0b3JcbiAgICBpZiAoc2VsZWN0b3IgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgdGhpcy5faXNTaW1wbGUgPSBmYWxzZTtcbiAgICAgIHRoaXMuX3NlbGVjdG9yID0gc2VsZWN0b3I7XG4gICAgICB0aGlzLl9yZWNvcmRQYXRoVXNlZCgnJyk7XG5cbiAgICAgIHJldHVybiBkb2MgPT4gKHtyZXN1bHQ6ICEhc2VsZWN0b3IuY2FsbChkb2MpfSk7XG4gICAgfVxuXG4gICAgLy8gc2hvcnRoYW5kIC0tIHNjYWxhciBfaWRcbiAgICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWQoc2VsZWN0b3IpKSB7XG4gICAgICB0aGlzLl9zZWxlY3RvciA9IHtfaWQ6IHNlbGVjdG9yfTtcbiAgICAgIHRoaXMuX3JlY29yZFBhdGhVc2VkKCdfaWQnKTtcblxuICAgICAgcmV0dXJuIGRvYyA9PiAoe3Jlc3VsdDogRUpTT04uZXF1YWxzKGRvYy5faWQsIHNlbGVjdG9yKX0pO1xuICAgIH1cblxuICAgIC8vIHByb3RlY3QgYWdhaW5zdCBkYW5nZXJvdXMgc2VsZWN0b3JzLiAgZmFsc2V5IGFuZCB7X2lkOiBmYWxzZXl9IGFyZSBib3RoXG4gICAgLy8gbGlrZWx5IHByb2dyYW1tZXIgZXJyb3IsIGFuZCBub3Qgd2hhdCB5b3Ugd2FudCwgcGFydGljdWxhcmx5IGZvclxuICAgIC8vIGRlc3RydWN0aXZlIG9wZXJhdGlvbnMuXG4gICAgaWYgKCFzZWxlY3RvciB8fCBoYXNPd24uY2FsbChzZWxlY3RvciwgJ19pZCcpICYmICFzZWxlY3Rvci5faWQpIHtcbiAgICAgIHRoaXMuX2lzU2ltcGxlID0gZmFsc2U7XG4gICAgICByZXR1cm4gbm90aGluZ01hdGNoZXI7XG4gICAgfVxuXG4gICAgLy8gVG9wIGxldmVsIGNhbid0IGJlIGFuIGFycmF5IG9yIHRydWUgb3IgYmluYXJ5LlxuICAgIGlmIChBcnJheS5pc0FycmF5KHNlbGVjdG9yKSB8fFxuICAgICAgICBFSlNPTi5pc0JpbmFyeShzZWxlY3RvcikgfHxcbiAgICAgICAgdHlwZW9mIHNlbGVjdG9yID09PSAnYm9vbGVhbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBzZWxlY3RvcjogJHtzZWxlY3Rvcn1gKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zZWxlY3RvciA9IEVKU09OLmNsb25lKHNlbGVjdG9yKTtcblxuICAgIHJldHVybiBjb21waWxlRG9jdW1lbnRTZWxlY3RvcihzZWxlY3RvciwgdGhpcywge2lzUm9vdDogdHJ1ZX0pO1xuICB9XG5cbiAgLy8gUmV0dXJucyBhIGxpc3Qgb2Yga2V5IHBhdGhzIHRoZSBnaXZlbiBzZWxlY3RvciBpcyBsb29raW5nIGZvci4gSXQgaW5jbHVkZXNcbiAgLy8gdGhlIGVtcHR5IHN0cmluZyBpZiB0aGVyZSBpcyBhICR3aGVyZS5cbiAgX2dldFBhdGhzKCkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9wYXRocyk7XG4gIH1cblxuICBfcmVjb3JkUGF0aFVzZWQocGF0aCkge1xuICAgIHRoaXMuX3BhdGhzW3BhdGhdID0gdHJ1ZTtcbiAgfVxufVxuXG4vLyBoZWxwZXJzIHVzZWQgYnkgY29tcGlsZWQgc2VsZWN0b3IgY29kZVxuTG9jYWxDb2xsZWN0aW9uLl9mID0ge1xuICAvLyBYWFggZm9yIF9hbGwgYW5kIF9pbiwgY29uc2lkZXIgYnVpbGRpbmcgJ2lucXVlcnknIGF0IGNvbXBpbGUgdGltZS4uXG4gIF90eXBlKHYpIHtcbiAgICBpZiAodHlwZW9mIHYgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHYgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gMjtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHYgPT09ICdib29sZWFuJykge1xuICAgICAgcmV0dXJuIDg7XG4gICAgfVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodikpIHtcbiAgICAgIHJldHVybiA0O1xuICAgIH1cblxuICAgIGlmICh2ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gMTA7XG4gICAgfVxuXG4gICAgLy8gbm90ZSB0aGF0IHR5cGVvZigveC8pID09PSBcIm9iamVjdFwiXG4gICAgaWYgKHYgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIHJldHVybiAxMTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHYgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiAxMztcbiAgICB9XG5cbiAgICBpZiAodiBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgIHJldHVybiA5O1xuICAgIH1cblxuICAgIGlmIChFSlNPTi5pc0JpbmFyeSh2KSkge1xuICAgICAgcmV0dXJuIDU7XG4gICAgfVxuXG4gICAgaWYgKHYgaW5zdGFuY2VvZiBNb25nb0lELk9iamVjdElEKSB7XG4gICAgICByZXR1cm4gNztcbiAgICB9XG5cbiAgICAvLyBvYmplY3RcbiAgICByZXR1cm4gMztcblxuICAgIC8vIFhYWCBzdXBwb3J0IHNvbWUvYWxsIG9mIHRoZXNlOlxuICAgIC8vIDE0LCBzeW1ib2xcbiAgICAvLyAxNSwgamF2YXNjcmlwdCBjb2RlIHdpdGggc2NvcGVcbiAgICAvLyAxNiwgMTg6IDMyLWJpdC82NC1iaXQgaW50ZWdlclxuICAgIC8vIDE3LCB0aW1lc3RhbXBcbiAgICAvLyAyNTUsIG1pbmtleVxuICAgIC8vIDEyNywgbWF4a2V5XG4gIH0sXG5cbiAgLy8gZGVlcCBlcXVhbGl0eSB0ZXN0OiB1c2UgZm9yIGxpdGVyYWwgZG9jdW1lbnQgYW5kIGFycmF5IG1hdGNoZXNcbiAgX2VxdWFsKGEsIGIpIHtcbiAgICByZXR1cm4gRUpTT04uZXF1YWxzKGEsIGIsIHtrZXlPcmRlclNlbnNpdGl2ZTogdHJ1ZX0pO1xuICB9LFxuXG4gIC8vIG1hcHMgYSB0eXBlIGNvZGUgdG8gYSB2YWx1ZSB0aGF0IGNhbiBiZSB1c2VkIHRvIHNvcnQgdmFsdWVzIG9mIGRpZmZlcmVudFxuICAvLyB0eXBlc1xuICBfdHlwZW9yZGVyKHQpIHtcbiAgICAvLyBodHRwOi8vd3d3Lm1vbmdvZGIub3JnL2Rpc3BsYXkvRE9DUy9XaGF0K2lzK3RoZStDb21wYXJlK09yZGVyK2ZvcitCU09OK1R5cGVzXG4gICAgLy8gWFhYIHdoYXQgaXMgdGhlIGNvcnJlY3Qgc29ydCBwb3NpdGlvbiBmb3IgSmF2YXNjcmlwdCBjb2RlP1xuICAgIC8vICgnMTAwJyBpbiB0aGUgbWF0cml4IGJlbG93KVxuICAgIC8vIFhYWCBtaW5rZXkvbWF4a2V5XG4gICAgcmV0dXJuIFtcbiAgICAgIC0xLCAgLy8gKG5vdCBhIHR5cGUpXG4gICAgICAxLCAgIC8vIG51bWJlclxuICAgICAgMiwgICAvLyBzdHJpbmdcbiAgICAgIDMsICAgLy8gb2JqZWN0XG4gICAgICA0LCAgIC8vIGFycmF5XG4gICAgICA1LCAgIC8vIGJpbmFyeVxuICAgICAgLTEsICAvLyBkZXByZWNhdGVkXG4gICAgICA2LCAgIC8vIE9iamVjdElEXG4gICAgICA3LCAgIC8vIGJvb2xcbiAgICAgIDgsICAgLy8gRGF0ZVxuICAgICAgMCwgICAvLyBudWxsXG4gICAgICA5LCAgIC8vIFJlZ0V4cFxuICAgICAgLTEsICAvLyBkZXByZWNhdGVkXG4gICAgICAxMDAsIC8vIEpTIGNvZGVcbiAgICAgIDIsICAgLy8gZGVwcmVjYXRlZCAoc3ltYm9sKVxuICAgICAgMTAwLCAvLyBKUyBjb2RlXG4gICAgICAxLCAgIC8vIDMyLWJpdCBpbnRcbiAgICAgIDgsICAgLy8gTW9uZ28gdGltZXN0YW1wXG4gICAgICAxICAgIC8vIDY0LWJpdCBpbnRcbiAgICBdW3RdO1xuICB9LFxuXG4gIC8vIGNvbXBhcmUgdHdvIHZhbHVlcyBvZiB1bmtub3duIHR5cGUgYWNjb3JkaW5nIHRvIEJTT04gb3JkZXJpbmdcbiAgLy8gc2VtYW50aWNzLiAoYXMgYW4gZXh0ZW5zaW9uLCBjb25zaWRlciAndW5kZWZpbmVkJyB0byBiZSBsZXNzIHRoYW5cbiAgLy8gYW55IG90aGVyIHZhbHVlLikgcmV0dXJuIG5lZ2F0aXZlIGlmIGEgaXMgbGVzcywgcG9zaXRpdmUgaWYgYiBpc1xuICAvLyBsZXNzLCBvciAwIGlmIGVxdWFsXG4gIF9jbXAoYSwgYikge1xuICAgIGlmIChhID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBiID09PSB1bmRlZmluZWQgPyAwIDogLTE7XG4gICAgfVxuXG4gICAgaWYgKGIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuXG4gICAgbGV0IHRhID0gTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlKGEpO1xuICAgIGxldCB0YiA9IExvY2FsQ29sbGVjdGlvbi5fZi5fdHlwZShiKTtcblxuICAgIGNvbnN0IG9hID0gTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlb3JkZXIodGEpO1xuICAgIGNvbnN0IG9iID0gTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlb3JkZXIodGIpO1xuXG4gICAgaWYgKG9hICE9PSBvYikge1xuICAgICAgcmV0dXJuIG9hIDwgb2IgPyAtMSA6IDE7XG4gICAgfVxuXG4gICAgLy8gWFhYIG5lZWQgdG8gaW1wbGVtZW50IHRoaXMgaWYgd2UgaW1wbGVtZW50IFN5bWJvbCBvciBpbnRlZ2Vycywgb3JcbiAgICAvLyBUaW1lc3RhbXBcbiAgICBpZiAodGEgIT09IHRiKSB7XG4gICAgICB0aHJvdyBFcnJvcignTWlzc2luZyB0eXBlIGNvZXJjaW9uIGxvZ2ljIGluIF9jbXAnKTtcbiAgICB9XG5cbiAgICBpZiAodGEgPT09IDcpIHsgLy8gT2JqZWN0SURcbiAgICAgIC8vIENvbnZlcnQgdG8gc3RyaW5nLlxuICAgICAgdGEgPSB0YiA9IDI7XG4gICAgICBhID0gYS50b0hleFN0cmluZygpO1xuICAgICAgYiA9IGIudG9IZXhTdHJpbmcoKTtcbiAgICB9XG5cbiAgICBpZiAodGEgPT09IDkpIHsgLy8gRGF0ZVxuICAgICAgLy8gQ29udmVydCB0byBtaWxsaXMuXG4gICAgICB0YSA9IHRiID0gMTtcbiAgICAgIGEgPSBhLmdldFRpbWUoKTtcbiAgICAgIGIgPSBiLmdldFRpbWUoKTtcbiAgICB9XG5cbiAgICBpZiAodGEgPT09IDEpIC8vIGRvdWJsZVxuICAgICAgcmV0dXJuIGEgLSBiO1xuXG4gICAgaWYgKHRiID09PSAyKSAvLyBzdHJpbmdcbiAgICAgIHJldHVybiBhIDwgYiA/IC0xIDogYSA9PT0gYiA/IDAgOiAxO1xuXG4gICAgaWYgKHRhID09PSAzKSB7IC8vIE9iamVjdFxuICAgICAgLy8gdGhpcyBjb3VsZCBiZSBtdWNoIG1vcmUgZWZmaWNpZW50IGluIHRoZSBleHBlY3RlZCBjYXNlIC4uLlxuICAgICAgY29uc3QgdG9BcnJheSA9IG9iamVjdCA9PiB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IFtdO1xuXG4gICAgICAgIE9iamVjdC5rZXlzKG9iamVjdCkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKGtleSwgb2JqZWN0W2tleV0pO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfTtcblxuICAgICAgcmV0dXJuIExvY2FsQ29sbGVjdGlvbi5fZi5fY21wKHRvQXJyYXkoYSksIHRvQXJyYXkoYikpO1xuICAgIH1cblxuICAgIGlmICh0YSA9PT0gNCkgeyAvLyBBcnJheVxuICAgICAgZm9yIChsZXQgaSA9IDA7IDsgaSsrKSB7XG4gICAgICAgIGlmIChpID09PSBhLmxlbmd0aCkge1xuICAgICAgICAgIHJldHVybiBpID09PSBiLmxlbmd0aCA/IDAgOiAtMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpID09PSBiLmxlbmd0aCkge1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcyA9IExvY2FsQ29sbGVjdGlvbi5fZi5fY21wKGFbaV0sIGJbaV0pO1xuICAgICAgICBpZiAocyAhPT0gMCkge1xuICAgICAgICAgIHJldHVybiBzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRhID09PSA1KSB7IC8vIGJpbmFyeVxuICAgICAgLy8gU3VycHJpc2luZ2x5LCBhIHNtYWxsIGJpbmFyeSBibG9iIGlzIGFsd2F5cyBsZXNzIHRoYW4gYSBsYXJnZSBvbmUgaW5cbiAgICAgIC8vIE1vbmdvLlxuICAgICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gYS5sZW5ndGggLSBiLmxlbmd0aDtcbiAgICAgIH1cblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChhW2ldIDwgYltpXSkge1xuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhW2ldID4gYltpXSkge1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGlmICh0YSA9PT0gOCkgeyAvLyBib29sZWFuXG4gICAgICBpZiAoYSkge1xuICAgICAgICByZXR1cm4gYiA/IDAgOiAxO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYiA/IC0xIDogMDtcbiAgICB9XG5cbiAgICBpZiAodGEgPT09IDEwKSAvLyBudWxsXG4gICAgICByZXR1cm4gMDtcblxuICAgIGlmICh0YSA9PT0gMTEpIC8vIHJlZ2V4cFxuICAgICAgdGhyb3cgRXJyb3IoJ1NvcnRpbmcgbm90IHN1cHBvcnRlZCBvbiByZWd1bGFyIGV4cHJlc3Npb24nKTsgLy8gWFhYXG5cbiAgICAvLyAxMzogamF2YXNjcmlwdCBjb2RlXG4gICAgLy8gMTQ6IHN5bWJvbFxuICAgIC8vIDE1OiBqYXZhc2NyaXB0IGNvZGUgd2l0aCBzY29wZVxuICAgIC8vIDE2OiAzMi1iaXQgaW50ZWdlclxuICAgIC8vIDE3OiB0aW1lc3RhbXBcbiAgICAvLyAxODogNjQtYml0IGludGVnZXJcbiAgICAvLyAyNTU6IG1pbmtleVxuICAgIC8vIDEyNzogbWF4a2V5XG4gICAgaWYgKHRhID09PSAxMykgLy8gamF2YXNjcmlwdCBjb2RlXG4gICAgICB0aHJvdyBFcnJvcignU29ydGluZyBub3Qgc3VwcG9ydGVkIG9uIEphdmFzY3JpcHQgY29kZScpOyAvLyBYWFhcblxuICAgIHRocm93IEVycm9yKCdVbmtub3duIHR5cGUgdG8gc29ydCcpO1xuICB9LFxufTtcbiIsImltcG9ydCBMb2NhbENvbGxlY3Rpb25fIGZyb20gJy4vbG9jYWxfY29sbGVjdGlvbi5qcyc7XG5pbXBvcnQgTWF0Y2hlciBmcm9tICcuL21hdGNoZXIuanMnO1xuaW1wb3J0IFNvcnRlciBmcm9tICcuL3NvcnRlci5qcyc7XG5cbkxvY2FsQ29sbGVjdGlvbiA9IExvY2FsQ29sbGVjdGlvbl87XG5NaW5pbW9uZ28gPSB7XG4gICAgTG9jYWxDb2xsZWN0aW9uOiBMb2NhbENvbGxlY3Rpb25fLFxuICAgIE1hdGNoZXIsXG4gICAgU29ydGVyXG59O1xuIiwiLy8gT2JzZXJ2ZUhhbmRsZTogdGhlIHJldHVybiB2YWx1ZSBvZiBhIGxpdmUgcXVlcnkuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBPYnNlcnZlSGFuZGxlIHt9XG4iLCJpbXBvcnQge1xuICBFTEVNRU5UX09QRVJBVE9SUyxcbiAgZXF1YWxpdHlFbGVtZW50TWF0Y2hlcixcbiAgZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyxcbiAgaGFzT3duLFxuICBpc09wZXJhdG9yT2JqZWN0LFxuICBtYWtlTG9va3VwRnVuY3Rpb24sXG4gIHJlZ2V4cEVsZW1lbnRNYXRjaGVyLFxufSBmcm9tICcuL2NvbW1vbi5qcyc7XG5cbi8vIEdpdmUgYSBzb3J0IHNwZWMsIHdoaWNoIGNhbiBiZSBpbiBhbnkgb2YgdGhlc2UgZm9ybXM6XG4vLyAgIHtcImtleTFcIjogMSwgXCJrZXkyXCI6IC0xfVxuLy8gICBbW1wia2V5MVwiLCBcImFzY1wiXSwgW1wia2V5MlwiLCBcImRlc2NcIl1dXG4vLyAgIFtcImtleTFcIiwgW1wia2V5MlwiLCBcImRlc2NcIl1dXG4vL1xuLy8gKC4uIHdpdGggdGhlIGZpcnN0IGZvcm0gYmVpbmcgZGVwZW5kZW50IG9uIHRoZSBrZXkgZW51bWVyYXRpb25cbi8vIGJlaGF2aW9yIG9mIHlvdXIgamF2YXNjcmlwdCBWTSwgd2hpY2ggdXN1YWxseSBkb2VzIHdoYXQgeW91IG1lYW4gaW5cbi8vIHRoaXMgY2FzZSBpZiB0aGUga2V5IG5hbWVzIGRvbid0IGxvb2sgbGlrZSBpbnRlZ2VycyAuLilcbi8vXG4vLyByZXR1cm4gYSBmdW5jdGlvbiB0aGF0IHRha2VzIHR3byBvYmplY3RzLCBhbmQgcmV0dXJucyAtMSBpZiB0aGVcbi8vIGZpcnN0IG9iamVjdCBjb21lcyBmaXJzdCBpbiBvcmRlciwgMSBpZiB0aGUgc2Vjb25kIG9iamVjdCBjb21lc1xuLy8gZmlyc3QsIG9yIDAgaWYgbmVpdGhlciBvYmplY3QgY29tZXMgYmVmb3JlIHRoZSBvdGhlci5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU29ydGVyIHtcbiAgY29uc3RydWN0b3Ioc3BlYywgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5fc29ydFNwZWNQYXJ0cyA9IFtdO1xuICAgIHRoaXMuX3NvcnRGdW5jdGlvbiA9IG51bGw7XG5cbiAgICBjb25zdCBhZGRTcGVjUGFydCA9IChwYXRoLCBhc2NlbmRpbmcpID0+IHtcbiAgICAgIGlmICghcGF0aCkge1xuICAgICAgICB0aHJvdyBFcnJvcignc29ydCBrZXlzIG11c3QgYmUgbm9uLWVtcHR5Jyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChwYXRoLmNoYXJBdCgwKSA9PT0gJyQnKSB7XG4gICAgICAgIHRocm93IEVycm9yKGB1bnN1cHBvcnRlZCBzb3J0IGtleTogJHtwYXRofWApO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9zb3J0U3BlY1BhcnRzLnB1c2goe1xuICAgICAgICBhc2NlbmRpbmcsXG4gICAgICAgIGxvb2t1cDogbWFrZUxvb2t1cEZ1bmN0aW9uKHBhdGgsIHtmb3JTb3J0OiB0cnVlfSksXG4gICAgICAgIHBhdGhcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBpZiAoc3BlYyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICBzcGVjLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgZWxlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBhZGRTcGVjUGFydChlbGVtZW50LCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhZGRTcGVjUGFydChlbGVtZW50WzBdLCBlbGVtZW50WzFdICE9PSAnZGVzYycpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBzcGVjID09PSAnb2JqZWN0Jykge1xuICAgICAgT2JqZWN0LmtleXMoc3BlYykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICBhZGRTcGVjUGFydChrZXksIHNwZWNba2V5XSA+PSAwKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHNwZWMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX3NvcnRGdW5jdGlvbiA9IHNwZWM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IEVycm9yKGBCYWQgc29ydCBzcGVjaWZpY2F0aW9uOiAke0pTT04uc3RyaW5naWZ5KHNwZWMpfWApO1xuICAgIH1cblxuICAgIC8vIElmIGEgZnVuY3Rpb24gaXMgc3BlY2lmaWVkIGZvciBzb3J0aW5nLCB3ZSBza2lwIHRoZSByZXN0LlxuICAgIGlmICh0aGlzLl9zb3J0RnVuY3Rpb24pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBUbyBpbXBsZW1lbnQgYWZmZWN0ZWRCeU1vZGlmaWVyLCB3ZSBwaWdneS1iYWNrIG9uIHRvcCBvZiBNYXRjaGVyJ3NcbiAgICAvLyBhZmZlY3RlZEJ5TW9kaWZpZXIgY29kZTsgd2UgY3JlYXRlIGEgc2VsZWN0b3IgdGhhdCBpcyBhZmZlY3RlZCBieSB0aGVcbiAgICAvLyBzYW1lIG1vZGlmaWVycyBhcyB0aGlzIHNvcnQgb3JkZXIuIFRoaXMgaXMgb25seSBpbXBsZW1lbnRlZCBvbiB0aGVcbiAgICAvLyBzZXJ2ZXIuXG4gICAgaWYgKHRoaXMuYWZmZWN0ZWRCeU1vZGlmaWVyKSB7XG4gICAgICBjb25zdCBzZWxlY3RvciA9IHt9O1xuXG4gICAgICB0aGlzLl9zb3J0U3BlY1BhcnRzLmZvckVhY2goc3BlYyA9PiB7XG4gICAgICAgIHNlbGVjdG9yW3NwZWMucGF0aF0gPSAxO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuX3NlbGVjdG9yRm9yQWZmZWN0ZWRCeU1vZGlmaWVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKHNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICB0aGlzLl9rZXlDb21wYXJhdG9yID0gY29tcG9zZUNvbXBhcmF0b3JzKFxuICAgICAgdGhpcy5fc29ydFNwZWNQYXJ0cy5tYXAoKHNwZWMsIGkpID0+IHRoaXMuX2tleUZpZWxkQ29tcGFyYXRvcihpKSlcbiAgICApO1xuXG4gICAgLy8gSWYgeW91IHNwZWNpZnkgYSBtYXRjaGVyIGZvciB0aGlzIFNvcnRlciwgX2tleUZpbHRlciBtYXkgYmUgc2V0IHRvIGFcbiAgICAvLyBmdW5jdGlvbiB3aGljaCBzZWxlY3RzIHdoZXRoZXIgb3Igbm90IGEgZ2l2ZW4gXCJzb3J0IGtleVwiICh0dXBsZSBvZiB2YWx1ZXNcbiAgICAvLyBmb3IgdGhlIGRpZmZlcmVudCBzb3J0IHNwZWMgZmllbGRzKSBpcyBjb21wYXRpYmxlIHdpdGggdGhlIHNlbGVjdG9yLlxuICAgIHRoaXMuX2tleUZpbHRlciA9IG51bGw7XG5cbiAgICBpZiAob3B0aW9ucy5tYXRjaGVyKSB7XG4gICAgICB0aGlzLl91c2VXaXRoTWF0Y2hlcihvcHRpb25zLm1hdGNoZXIpO1xuICAgIH1cbiAgfVxuXG4gIGdldENvbXBhcmF0b3Iob3B0aW9ucykge1xuICAgIC8vIElmIHNvcnQgaXMgc3BlY2lmaWVkIG9yIGhhdmUgbm8gZGlzdGFuY2VzLCBqdXN0IHVzZSB0aGUgY29tcGFyYXRvciBmcm9tXG4gICAgLy8gdGhlIHNvdXJjZSBzcGVjaWZpY2F0aW9uICh3aGljaCBkZWZhdWx0cyB0byBcImV2ZXJ5dGhpbmcgaXMgZXF1YWxcIi5cbiAgICAvLyBpc3N1ZSAjMzU5OVxuICAgIC8vIGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvcmVmZXJlbmNlL29wZXJhdG9yL3F1ZXJ5L25lYXIvI3NvcnQtb3BlcmF0aW9uXG4gICAgLy8gc29ydCBlZmZlY3RpdmVseSBvdmVycmlkZXMgJG5lYXJcbiAgICBpZiAodGhpcy5fc29ydFNwZWNQYXJ0cy5sZW5ndGggfHwgIW9wdGlvbnMgfHwgIW9wdGlvbnMuZGlzdGFuY2VzKSB7XG4gICAgICByZXR1cm4gdGhpcy5fZ2V0QmFzZUNvbXBhcmF0b3IoKTtcbiAgICB9XG5cbiAgICBjb25zdCBkaXN0YW5jZXMgPSBvcHRpb25zLmRpc3RhbmNlcztcblxuICAgIC8vIFJldHVybiBhIGNvbXBhcmF0b3Igd2hpY2ggY29tcGFyZXMgdXNpbmcgJG5lYXIgZGlzdGFuY2VzLlxuICAgIHJldHVybiAoYSwgYikgPT4ge1xuICAgICAgaWYgKCFkaXN0YW5jZXMuaGFzKGEuX2lkKSkge1xuICAgICAgICB0aHJvdyBFcnJvcihgTWlzc2luZyBkaXN0YW5jZSBmb3IgJHthLl9pZH1gKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFkaXN0YW5jZXMuaGFzKGIuX2lkKSkge1xuICAgICAgICB0aHJvdyBFcnJvcihgTWlzc2luZyBkaXN0YW5jZSBmb3IgJHtiLl9pZH1gKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRpc3RhbmNlcy5nZXQoYS5faWQpIC0gZGlzdGFuY2VzLmdldChiLl9pZCk7XG4gICAgfTtcbiAgfVxuXG4gIC8vIFRha2VzIGluIHR3byBrZXlzOiBhcnJheXMgd2hvc2UgbGVuZ3RocyBtYXRjaCB0aGUgbnVtYmVyIG9mIHNwZWNcbiAgLy8gcGFydHMuIFJldHVybnMgbmVnYXRpdmUsIDAsIG9yIHBvc2l0aXZlIGJhc2VkIG9uIHVzaW5nIHRoZSBzb3J0IHNwZWMgdG9cbiAgLy8gY29tcGFyZSBmaWVsZHMuXG4gIF9jb21wYXJlS2V5cyhrZXkxLCBrZXkyKSB7XG4gICAgaWYgKGtleTEubGVuZ3RoICE9PSB0aGlzLl9zb3J0U3BlY1BhcnRzLmxlbmd0aCB8fFxuICAgICAgICBrZXkyLmxlbmd0aCAhPT0gdGhpcy5fc29ydFNwZWNQYXJ0cy5sZW5ndGgpIHtcbiAgICAgIHRocm93IEVycm9yKCdLZXkgaGFzIHdyb25nIGxlbmd0aCcpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9rZXlDb21wYXJhdG9yKGtleTEsIGtleTIpO1xuICB9XG5cbiAgLy8gSXRlcmF0ZXMgb3ZlciBlYWNoIHBvc3NpYmxlIFwia2V5XCIgZnJvbSBkb2MgKGllLCBvdmVyIGVhY2ggYnJhbmNoKSwgY2FsbGluZ1xuICAvLyAnY2InIHdpdGggdGhlIGtleS5cbiAgX2dlbmVyYXRlS2V5c0Zyb21Eb2MoZG9jLCBjYikge1xuICAgIGlmICh0aGlzLl9zb3J0U3BlY1BhcnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5cXCd0IGdlbmVyYXRlIGtleXMgd2l0aG91dCBhIHNwZWMnKTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXRoRnJvbUluZGljZXMgPSBpbmRpY2VzID0+IGAke2luZGljZXMuam9pbignLCcpfSxgO1xuXG4gICAgbGV0IGtub3duUGF0aHMgPSBudWxsO1xuXG4gICAgLy8gbWFwcyBpbmRleCAtPiAoeycnIC0+IHZhbHVlfSBvciB7cGF0aCAtPiB2YWx1ZX0pXG4gICAgY29uc3QgdmFsdWVzQnlJbmRleEFuZFBhdGggPSB0aGlzLl9zb3J0U3BlY1BhcnRzLm1hcChzcGVjID0+IHtcbiAgICAgIC8vIEV4cGFuZCBhbnkgbGVhZiBhcnJheXMgdGhhdCB3ZSBmaW5kLCBhbmQgaWdub3JlIHRob3NlIGFycmF5c1xuICAgICAgLy8gdGhlbXNlbHZlcy4gIChXZSBuZXZlciBzb3J0IGJhc2VkIG9uIGFuIGFycmF5IGl0c2VsZi4pXG4gICAgICBsZXQgYnJhbmNoZXMgPSBleHBhbmRBcnJheXNJbkJyYW5jaGVzKHNwZWMubG9va3VwKGRvYyksIHRydWUpO1xuXG4gICAgICAvLyBJZiB0aGVyZSBhcmUgbm8gdmFsdWVzIGZvciBhIGtleSAoZWcsIGtleSBnb2VzIHRvIGFuIGVtcHR5IGFycmF5KSxcbiAgICAgIC8vIHByZXRlbmQgd2UgZm91bmQgb25lIG51bGwgdmFsdWUuXG4gICAgICBpZiAoIWJyYW5jaGVzLmxlbmd0aCkge1xuICAgICAgICBicmFuY2hlcyA9IFt7dmFsdWU6IG51bGx9XTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZWxlbWVudCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICBsZXQgdXNlZFBhdGhzID0gZmFsc2U7XG5cbiAgICAgIGJyYW5jaGVzLmZvckVhY2goYnJhbmNoID0+IHtcbiAgICAgICAgaWYgKCFicmFuY2guYXJyYXlJbmRpY2VzKSB7XG4gICAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG5vIGFycmF5IGluZGljZXMgZm9yIGEgYnJhbmNoLCB0aGVuIGl0IG11c3QgYmUgdGhlXG4gICAgICAgICAgLy8gb25seSBicmFuY2gsIGJlY2F1c2UgdGhlIG9ubHkgdGhpbmcgdGhhdCBwcm9kdWNlcyBtdWx0aXBsZSBicmFuY2hlc1xuICAgICAgICAgIC8vIGlzIHRoZSB1c2Ugb2YgYXJyYXlzLlxuICAgICAgICAgIGlmIChicmFuY2hlcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcignbXVsdGlwbGUgYnJhbmNoZXMgYnV0IG5vIGFycmF5IHVzZWQ/Jyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZWxlbWVudFsnJ10gPSBicmFuY2gudmFsdWU7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdXNlZFBhdGhzID0gdHJ1ZTtcblxuICAgICAgICBjb25zdCBwYXRoID0gcGF0aEZyb21JbmRpY2VzKGJyYW5jaC5hcnJheUluZGljZXMpO1xuXG4gICAgICAgIGlmIChoYXNPd24uY2FsbChlbGVtZW50LCBwYXRoKSkge1xuICAgICAgICAgIHRocm93IEVycm9yKGBkdXBsaWNhdGUgcGF0aDogJHtwYXRofWApO1xuICAgICAgICB9XG5cbiAgICAgICAgZWxlbWVudFtwYXRoXSA9IGJyYW5jaC52YWx1ZTtcblxuICAgICAgICAvLyBJZiB0d28gc29ydCBmaWVsZHMgYm90aCBnbyBpbnRvIGFycmF5cywgdGhleSBoYXZlIHRvIGdvIGludG8gdGhlXG4gICAgICAgIC8vIGV4YWN0IHNhbWUgYXJyYXlzIGFuZCB3ZSBoYXZlIHRvIGZpbmQgdGhlIHNhbWUgcGF0aHMuICBUaGlzIGlzXG4gICAgICAgIC8vIHJvdWdobHkgdGhlIHNhbWUgY29uZGl0aW9uIHRoYXQgbWFrZXMgTW9uZ29EQiB0aHJvdyB0aGlzIHN0cmFuZ2VcbiAgICAgICAgLy8gZXJyb3IgbWVzc2FnZS4gIGVnLCB0aGUgbWFpbiB0aGluZyBpcyB0aGF0IGlmIHNvcnQgc3BlYyBpcyB7YTogMSxcbiAgICAgICAgLy8gYjoxfSB0aGVuIGEgYW5kIGIgY2Fubm90IGJvdGggYmUgYXJyYXlzLlxuICAgICAgICAvL1xuICAgICAgICAvLyAoSW4gTW9uZ29EQiBpdCBzZWVtcyB0byBiZSBPSyB0byBoYXZlIHthOiAxLCAnYS54LnknOiAxfSB3aGVyZSAnYSdcbiAgICAgICAgLy8gYW5kICdhLngueScgYXJlIGJvdGggYXJyYXlzLCBidXQgd2UgZG9uJ3QgYWxsb3cgdGhpcyBmb3Igbm93LlxuICAgICAgICAvLyAjTmVzdGVkQXJyYXlTb3J0XG4gICAgICAgIC8vIFhYWCBhY2hpZXZlIGZ1bGwgY29tcGF0aWJpbGl0eSBoZXJlXG4gICAgICAgIGlmIChrbm93blBhdGhzICYmICFoYXNPd24uY2FsbChrbm93blBhdGhzLCBwYXRoKSkge1xuICAgICAgICAgIHRocm93IEVycm9yKCdjYW5ub3QgaW5kZXggcGFyYWxsZWwgYXJyYXlzJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAoa25vd25QYXRocykge1xuICAgICAgICAvLyBTaW1pbGFybHkgdG8gYWJvdmUsIHBhdGhzIG11c3QgbWF0Y2ggZXZlcnl3aGVyZSwgdW5sZXNzIHRoaXMgaXMgYVxuICAgICAgICAvLyBub24tYXJyYXkgZmllbGQuXG4gICAgICAgIGlmICghaGFzT3duLmNhbGwoZWxlbWVudCwgJycpICYmXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhrbm93blBhdGhzKS5sZW5ndGggIT09IE9iamVjdC5rZXlzKGVsZW1lbnQpLmxlbmd0aCkge1xuICAgICAgICAgIHRocm93IEVycm9yKCdjYW5ub3QgaW5kZXggcGFyYWxsZWwgYXJyYXlzIScpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHVzZWRQYXRocykge1xuICAgICAgICBrbm93blBhdGhzID0ge307XG5cbiAgICAgICAgT2JqZWN0LmtleXMoZWxlbWVudCkuZm9yRWFjaChwYXRoID0+IHtcbiAgICAgICAgICBrbm93blBhdGhzW3BhdGhdID0gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH0pO1xuXG4gICAgaWYgKCFrbm93blBhdGhzKSB7XG4gICAgICAvLyBFYXN5IGNhc2U6IG5vIHVzZSBvZiBhcnJheXMuXG4gICAgICBjb25zdCBzb2xlS2V5ID0gdmFsdWVzQnlJbmRleEFuZFBhdGgubWFwKHZhbHVlcyA9PiB7XG4gICAgICAgIGlmICghaGFzT3duLmNhbGwodmFsdWVzLCAnJykpIHtcbiAgICAgICAgICB0aHJvdyBFcnJvcignbm8gdmFsdWUgaW4gc29sZSBrZXkgY2FzZT8nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2YWx1ZXNbJyddO1xuICAgICAgfSk7XG5cbiAgICAgIGNiKHNvbGVLZXkpO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgT2JqZWN0LmtleXMoa25vd25QYXRocykuZm9yRWFjaChwYXRoID0+IHtcbiAgICAgIGNvbnN0IGtleSA9IHZhbHVlc0J5SW5kZXhBbmRQYXRoLm1hcCh2YWx1ZXMgPT4ge1xuICAgICAgICBpZiAoaGFzT3duLmNhbGwodmFsdWVzLCAnJykpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWVzWycnXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghaGFzT3duLmNhbGwodmFsdWVzLCBwYXRoKSkge1xuICAgICAgICAgIHRocm93IEVycm9yKCdtaXNzaW5nIHBhdGg/Jyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdmFsdWVzW3BhdGhdO1xuICAgICAgfSk7XG5cbiAgICAgIGNiKGtleSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBSZXR1cm5zIGEgY29tcGFyYXRvciB0aGF0IHJlcHJlc2VudHMgdGhlIHNvcnQgc3BlY2lmaWNhdGlvbiAoYnV0IG5vdFxuICAvLyBpbmNsdWRpbmcgYSBwb3NzaWJsZSBnZW9xdWVyeSBkaXN0YW5jZSB0aWUtYnJlYWtlcikuXG4gIF9nZXRCYXNlQ29tcGFyYXRvcigpIHtcbiAgICBpZiAodGhpcy5fc29ydEZ1bmN0aW9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5fc29ydEZ1bmN0aW9uO1xuICAgIH1cblxuICAgIC8vIElmIHdlJ3JlIG9ubHkgc29ydGluZyBvbiBnZW9xdWVyeSBkaXN0YW5jZSBhbmQgbm8gc3BlY3MsIGp1c3Qgc2F5XG4gICAgLy8gZXZlcnl0aGluZyBpcyBlcXVhbC5cbiAgICBpZiAoIXRoaXMuX3NvcnRTcGVjUGFydHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gKGRvYzEsIGRvYzIpID0+IDA7XG4gICAgfVxuXG4gICAgcmV0dXJuIChkb2MxLCBkb2MyKSA9PiB7XG4gICAgICBjb25zdCBrZXkxID0gdGhpcy5fZ2V0TWluS2V5RnJvbURvYyhkb2MxKTtcbiAgICAgIGNvbnN0IGtleTIgPSB0aGlzLl9nZXRNaW5LZXlGcm9tRG9jKGRvYzIpO1xuICAgICAgcmV0dXJuIHRoaXMuX2NvbXBhcmVLZXlzKGtleTEsIGtleTIpO1xuICAgIH07XG4gIH1cblxuICAvLyBGaW5kcyB0aGUgbWluaW11bSBrZXkgZnJvbSB0aGUgZG9jLCBhY2NvcmRpbmcgdG8gdGhlIHNvcnQgc3BlY3MuICAoV2Ugc2F5XG4gIC8vIFwibWluaW11bVwiIGhlcmUgYnV0IHRoaXMgaXMgd2l0aCByZXNwZWN0IHRvIHRoZSBzb3J0IHNwZWMsIHNvIFwiZGVzY2VuZGluZ1wiXG4gIC8vIHNvcnQgZmllbGRzIG1lYW4gd2UncmUgZmluZGluZyB0aGUgbWF4IGZvciB0aGF0IGZpZWxkLilcbiAgLy9cbiAgLy8gTm90ZSB0aGF0IHRoaXMgaXMgTk9UIFwiZmluZCB0aGUgbWluaW11bSB2YWx1ZSBvZiB0aGUgZmlyc3QgZmllbGQsIHRoZVxuICAvLyBtaW5pbXVtIHZhbHVlIG9mIHRoZSBzZWNvbmQgZmllbGQsIGV0Y1wiLi4uIGl0J3MgXCJjaG9vc2UgdGhlXG4gIC8vIGxleGljb2dyYXBoaWNhbGx5IG1pbmltdW0gdmFsdWUgb2YgdGhlIGtleSB2ZWN0b3IsIGFsbG93aW5nIG9ubHkga2V5cyB3aGljaFxuICAvLyB5b3UgY2FuIGZpbmQgYWxvbmcgdGhlIHNhbWUgcGF0aHNcIi4gIGllLCBmb3IgYSBkb2Mge2E6IFt7eDogMCwgeTogNX0sIHt4OlxuICAvLyAxLCB5OiAzfV19IHdpdGggc29ydCBzcGVjIHsnYS54JzogMSwgJ2EueSc6IDF9LCB0aGUgb25seSBrZXlzIGFyZSBbMCw1XSBhbmRcbiAgLy8gWzEsM10sIGFuZCB0aGUgbWluaW11bSBrZXkgaXMgWzAsNV07IG5vdGFibHksIFswLDNdIGlzIE5PVCBhIGtleS5cbiAgX2dldE1pbktleUZyb21Eb2MoZG9jKSB7XG4gICAgbGV0IG1pbktleSA9IG51bGw7XG5cbiAgICB0aGlzLl9nZW5lcmF0ZUtleXNGcm9tRG9jKGRvYywga2V5ID0+IHtcbiAgICAgIGlmICghdGhpcy5fa2V5Q29tcGF0aWJsZVdpdGhTZWxlY3RvcihrZXkpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKG1pbktleSA9PT0gbnVsbCkge1xuICAgICAgICBtaW5LZXkgPSBrZXk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX2NvbXBhcmVLZXlzKGtleSwgbWluS2V5KSA8IDApIHtcbiAgICAgICAgbWluS2V5ID0ga2V5O1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gVGhpcyBjb3VsZCBoYXBwZW4gaWYgb3VyIGtleSBmaWx0ZXIgc29tZWhvdyBmaWx0ZXJzIG91dCBhbGwgdGhlIGtleXMgZXZlblxuICAgIC8vIHRob3VnaCBzb21laG93IHRoZSBzZWxlY3RvciBtYXRjaGVzLlxuICAgIGlmIChtaW5LZXkgPT09IG51bGwpIHtcbiAgICAgIHRocm93IEVycm9yKCdzb3J0IHNlbGVjdG9yIGZvdW5kIG5vIGtleXMgaW4gZG9jPycpO1xuICAgIH1cblxuICAgIHJldHVybiBtaW5LZXk7XG4gIH1cblxuICBfZ2V0UGF0aHMoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NvcnRTcGVjUGFydHMubWFwKHBhcnQgPT4gcGFydC5wYXRoKTtcbiAgfVxuXG4gIF9rZXlDb21wYXRpYmxlV2l0aFNlbGVjdG9yKGtleSkge1xuICAgIHJldHVybiAhdGhpcy5fa2V5RmlsdGVyIHx8IHRoaXMuX2tleUZpbHRlcihrZXkpO1xuICB9XG5cbiAgLy8gR2l2ZW4gYW4gaW5kZXggJ2knLCByZXR1cm5zIGEgY29tcGFyYXRvciB0aGF0IGNvbXBhcmVzIHR3byBrZXkgYXJyYXlzIGJhc2VkXG4gIC8vIG9uIGZpZWxkICdpJy5cbiAgX2tleUZpZWxkQ29tcGFyYXRvcihpKSB7XG4gICAgY29uc3QgaW52ZXJ0ID0gIXRoaXMuX3NvcnRTcGVjUGFydHNbaV0uYXNjZW5kaW5nO1xuXG4gICAgcmV0dXJuIChrZXkxLCBrZXkyKSA9PiB7XG4gICAgICBjb25zdCBjb21wYXJlID0gTG9jYWxDb2xsZWN0aW9uLl9mLl9jbXAoa2V5MVtpXSwga2V5MltpXSk7XG4gICAgICByZXR1cm4gaW52ZXJ0ID8gLWNvbXBhcmUgOiBjb21wYXJlO1xuICAgIH07XG4gIH1cblxuICAvLyBJbiBNb25nb0RCLCBpZiB5b3UgaGF2ZSBkb2N1bWVudHNcbiAgLy8gICAge19pZDogJ3gnLCBhOiBbMSwgMTBdfSBhbmRcbiAgLy8gICAge19pZDogJ3knLCBhOiBbNSwgMTVdfSxcbiAgLy8gdGhlbiBDLmZpbmQoe30sIHtzb3J0OiB7YTogMX19KSBwdXRzIHggYmVmb3JlIHkgKDEgY29tZXMgYmVmb3JlIDUpLlxuICAvLyBCdXQgIEMuZmluZCh7YTogeyRndDogM319LCB7c29ydDoge2E6IDF9fSkgcHV0cyB5IGJlZm9yZSB4ICgxIGRvZXMgbm90XG4gIC8vIG1hdGNoIHRoZSBzZWxlY3RvciwgYW5kIDUgY29tZXMgYmVmb3JlIDEwKS5cbiAgLy9cbiAgLy8gVGhlIHdheSB0aGlzIHdvcmtzIGlzIHByZXR0eSBzdWJ0bGUhICBGb3IgZXhhbXBsZSwgaWYgdGhlIGRvY3VtZW50c1xuICAvLyBhcmUgaW5zdGVhZCB7X2lkOiAneCcsIGE6IFt7eDogMX0sIHt4OiAxMH1dfSkgYW5kXG4gIC8vICAgICAgICAgICAgIHtfaWQ6ICd5JywgYTogW3t4OiA1fSwge3g6IDE1fV19KSxcbiAgLy8gdGhlbiBDLmZpbmQoeydhLngnOiB7JGd0OiAzfX0sIHtzb3J0OiB7J2EueCc6IDF9fSkgYW5kXG4gIC8vICAgICAgQy5maW5kKHthOiB7JGVsZW1NYXRjaDoge3g6IHskZ3Q6IDN9fX19LCB7c29ydDogeydhLngnOiAxfX0pXG4gIC8vIGJvdGggZm9sbG93IHRoaXMgcnVsZSAoeSBiZWZvcmUgeCkuICAoaWUsIHlvdSBkbyBoYXZlIHRvIGFwcGx5IHRoaXNcbiAgLy8gdGhyb3VnaCAkZWxlbU1hdGNoLilcbiAgLy9cbiAgLy8gU28gaWYgeW91IHBhc3MgYSBtYXRjaGVyIHRvIHRoaXMgc29ydGVyJ3MgY29uc3RydWN0b3IsIHdlIHdpbGwgYXR0ZW1wdCB0b1xuICAvLyBza2lwIHNvcnQga2V5cyB0aGF0IGRvbid0IG1hdGNoIHRoZSBzZWxlY3Rvci4gVGhlIGxvZ2ljIGhlcmUgaXMgcHJldHR5XG4gIC8vIHN1YnRsZSBhbmQgdW5kb2N1bWVudGVkOyB3ZSd2ZSBnb3R0ZW4gYXMgY2xvc2UgYXMgd2UgY2FuIGZpZ3VyZSBvdXQgYmFzZWRcbiAgLy8gb24gb3VyIHVuZGVyc3RhbmRpbmcgb2YgTW9uZ28ncyBiZWhhdmlvci5cbiAgX3VzZVdpdGhNYXRjaGVyKG1hdGNoZXIpIHtcbiAgICBpZiAodGhpcy5fa2V5RmlsdGVyKSB7XG4gICAgICB0aHJvdyBFcnJvcignY2FsbGVkIF91c2VXaXRoTWF0Y2hlciB0d2ljZT8nKTtcbiAgICB9XG5cbiAgICAvLyBJZiB3ZSBhcmUgb25seSBzb3J0aW5nIGJ5IGRpc3RhbmNlLCB0aGVuIHdlJ3JlIG5vdCBnb2luZyB0byBib3RoZXIgdG9cbiAgICAvLyBidWlsZCBhIGtleSBmaWx0ZXIuXG4gICAgLy8gWFhYIGZpZ3VyZSBvdXQgaG93IGdlb3F1ZXJpZXMgaW50ZXJhY3Qgd2l0aCB0aGlzIHN0dWZmXG4gICAgaWYgKCF0aGlzLl9zb3J0U3BlY1BhcnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHNlbGVjdG9yID0gbWF0Y2hlci5fc2VsZWN0b3I7XG5cbiAgICAvLyBJZiB0aGUgdXNlciBqdXN0IHBhc3NlZCBhIGZhbHNleSBzZWxlY3RvciB0byBmaW5kKCksXG4gICAgLy8gdGhlbiB3ZSBjYW4ndCBnZXQgYSBrZXkgZmlsdGVyIGZyb20gaXQuXG4gICAgaWYgKCFzZWxlY3Rvcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIHRoZSB1c2VyIGp1c3QgcGFzc2VkIGEgbGl0ZXJhbCBmdW5jdGlvbiB0byBmaW5kKCksIHRoZW4gd2UgY2FuJ3QgZ2V0IGFcbiAgICAvLyBrZXkgZmlsdGVyIGZyb20gaXQuXG4gICAgaWYgKHNlbGVjdG9yIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBjb25zdHJhaW50c0J5UGF0aCA9IHt9O1xuXG4gICAgdGhpcy5fc29ydFNwZWNQYXJ0cy5mb3JFYWNoKHNwZWMgPT4ge1xuICAgICAgY29uc3RyYWludHNCeVBhdGhbc3BlYy5wYXRoXSA9IFtdO1xuICAgIH0pO1xuXG4gICAgT2JqZWN0LmtleXMoc2VsZWN0b3IpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIGNvbnN0IHN1YlNlbGVjdG9yID0gc2VsZWN0b3Jba2V5XTtcblxuICAgICAgLy8gWFhYIHN1cHBvcnQgJGFuZCBhbmQgJG9yXG4gICAgICBjb25zdCBjb25zdHJhaW50cyA9IGNvbnN0cmFpbnRzQnlQYXRoW2tleV07XG4gICAgICBpZiAoIWNvbnN0cmFpbnRzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gWFhYIGl0IGxvb2tzIGxpa2UgdGhlIHJlYWwgTW9uZ29EQiBpbXBsZW1lbnRhdGlvbiBpc24ndCBcImRvZXMgdGhlXG4gICAgICAvLyByZWdleHAgbWF0Y2hcIiBidXQgXCJkb2VzIHRoZSB2YWx1ZSBmYWxsIGludG8gYSByYW5nZSBuYW1lZCBieSB0aGVcbiAgICAgIC8vIGxpdGVyYWwgcHJlZml4IG9mIHRoZSByZWdleHBcIiwgaWUgXCJmb29cIiBpbiAvXmZvbyhiYXJ8YmF6KSsvICBCdXRcbiAgICAgIC8vIFwiZG9lcyB0aGUgcmVnZXhwIG1hdGNoXCIgaXMgYSBnb29kIGFwcHJveGltYXRpb24uXG4gICAgICBpZiAoc3ViU2VsZWN0b3IgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgLy8gQXMgZmFyIGFzIHdlIGNhbiB0ZWxsLCB1c2luZyBlaXRoZXIgb2YgdGhlIG9wdGlvbnMgdGhhdCBib3RoIHdlIGFuZFxuICAgICAgICAvLyBNb25nb0RCIHN1cHBvcnQgKCdpJyBhbmQgJ20nKSBkaXNhYmxlcyB1c2Ugb2YgdGhlIGtleSBmaWx0ZXIuIFRoaXNcbiAgICAgICAgLy8gbWFrZXMgc2Vuc2U6IE1vbmdvREIgbW9zdGx5IGFwcGVhcnMgdG8gYmUgY2FsY3VsYXRpbmcgcmFuZ2VzIG9mIGFuXG4gICAgICAgIC8vIGluZGV4IHRvIHVzZSwgd2hpY2ggbWVhbnMgaXQgb25seSBjYXJlcyBhYm91dCByZWdleHBzIHRoYXQgbWF0Y2hcbiAgICAgICAgLy8gb25lIHJhbmdlICh3aXRoIGEgbGl0ZXJhbCBwcmVmaXgpLCBhbmQgYm90aCAnaScgYW5kICdtJyBwcmV2ZW50IHRoZVxuICAgICAgICAvLyBsaXRlcmFsIHByZWZpeCBvZiB0aGUgcmVnZXhwIGZyb20gYWN0dWFsbHkgbWVhbmluZyBvbmUgcmFuZ2UuXG4gICAgICAgIGlmIChzdWJTZWxlY3Rvci5pZ25vcmVDYXNlIHx8IHN1YlNlbGVjdG9yLm11bHRpbGluZSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0cmFpbnRzLnB1c2gocmVnZXhwRWxlbWVudE1hdGNoZXIoc3ViU2VsZWN0b3IpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXNPcGVyYXRvck9iamVjdChzdWJTZWxlY3RvcikpIHtcbiAgICAgICAgT2JqZWN0LmtleXMoc3ViU2VsZWN0b3IpLmZvckVhY2gob3BlcmF0b3IgPT4ge1xuICAgICAgICAgIGNvbnN0IG9wZXJhbmQgPSBzdWJTZWxlY3RvcltvcGVyYXRvcl07XG5cbiAgICAgICAgICBpZiAoWyckbHQnLCAnJGx0ZScsICckZ3QnLCAnJGd0ZSddLmluY2x1ZGVzKG9wZXJhdG9yKSkge1xuICAgICAgICAgICAgLy8gWFhYIHRoaXMgZGVwZW5kcyBvbiB1cyBrbm93aW5nIHRoYXQgdGhlc2Ugb3BlcmF0b3JzIGRvbid0IHVzZSBhbnlcbiAgICAgICAgICAgIC8vIG9mIHRoZSBhcmd1bWVudHMgdG8gY29tcGlsZUVsZW1lbnRTZWxlY3RvciBvdGhlciB0aGFuIG9wZXJhbmQuXG4gICAgICAgICAgICBjb25zdHJhaW50cy5wdXNoKFxuICAgICAgICAgICAgICBFTEVNRU5UX09QRVJBVE9SU1tvcGVyYXRvcl0uY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBTZWUgY29tbWVudHMgaW4gdGhlIFJlZ0V4cCBibG9jayBhYm92ZS5cbiAgICAgICAgICBpZiAob3BlcmF0b3IgPT09ICckcmVnZXgnICYmICFzdWJTZWxlY3Rvci4kb3B0aW9ucykge1xuICAgICAgICAgICAgY29uc3RyYWludHMucHVzaChcbiAgICAgICAgICAgICAgRUxFTUVOVF9PUEVSQVRPUlMuJHJlZ2V4LmNvbXBpbGVFbGVtZW50U2VsZWN0b3IoXG4gICAgICAgICAgICAgICAgb3BlcmFuZCxcbiAgICAgICAgICAgICAgICBzdWJTZWxlY3RvclxuICAgICAgICAgICAgICApXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFhYWCBzdXBwb3J0IHskZXhpc3RzOiB0cnVlfSwgJG1vZCwgJHR5cGUsICRpbiwgJGVsZW1NYXRjaFxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIE9LLCBpdCdzIGFuIGVxdWFsaXR5IHRoaW5nLlxuICAgICAgY29uc3RyYWludHMucHVzaChlcXVhbGl0eUVsZW1lbnRNYXRjaGVyKHN1YlNlbGVjdG9yKSk7XG4gICAgfSk7XG5cbiAgICAvLyBJdCBhcHBlYXJzIHRoYXQgdGhlIGZpcnN0IHNvcnQgZmllbGQgaXMgdHJlYXRlZCBkaWZmZXJlbnRseSBmcm9tIHRoZVxuICAgIC8vIG90aGVyczsgd2Ugc2hvdWxkbid0IGNyZWF0ZSBhIGtleSBmaWx0ZXIgdW5sZXNzIHRoZSBmaXJzdCBzb3J0IGZpZWxkIGlzXG4gICAgLy8gcmVzdHJpY3RlZCwgdGhvdWdoIGFmdGVyIHRoYXQgcG9pbnQgd2UgY2FuIHJlc3RyaWN0IHRoZSBvdGhlciBzb3J0IGZpZWxkc1xuICAgIC8vIG9yIG5vdCBhcyB3ZSB3aXNoLlxuICAgIGlmICghY29uc3RyYWludHNCeVBhdGhbdGhpcy5fc29ydFNwZWNQYXJ0c1swXS5wYXRoXS5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLl9rZXlGaWx0ZXIgPSBrZXkgPT5cbiAgICAgIHRoaXMuX3NvcnRTcGVjUGFydHMuZXZlcnkoKHNwZWNQYXJ0LCBpbmRleCkgPT5cbiAgICAgICAgY29uc3RyYWludHNCeVBhdGhbc3BlY1BhcnQucGF0aF0uZXZlcnkoZm4gPT4gZm4oa2V5W2luZGV4XSkpXG4gICAgICApXG4gICAgO1xuICB9XG59XG5cbi8vIEdpdmVuIGFuIGFycmF5IG9mIGNvbXBhcmF0b3JzXG4vLyAoZnVuY3Rpb25zIChhLGIpLT4obmVnYXRpdmUgb3IgcG9zaXRpdmUgb3IgemVybykpLCByZXR1cm5zIGEgc2luZ2xlXG4vLyBjb21wYXJhdG9yIHdoaWNoIHVzZXMgZWFjaCBjb21wYXJhdG9yIGluIG9yZGVyIGFuZCByZXR1cm5zIHRoZSBmaXJzdFxuLy8gbm9uLXplcm8gdmFsdWUuXG5mdW5jdGlvbiBjb21wb3NlQ29tcGFyYXRvcnMoY29tcGFyYXRvckFycmF5KSB7XG4gIHJldHVybiAoYSwgYikgPT4ge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY29tcGFyYXRvckFycmF5Lmxlbmd0aDsgKytpKSB7XG4gICAgICBjb25zdCBjb21wYXJlID0gY29tcGFyYXRvckFycmF5W2ldKGEsIGIpO1xuICAgICAgaWYgKGNvbXBhcmUgIT09IDApIHtcbiAgICAgICAgcmV0dXJuIGNvbXBhcmU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIDA7XG4gIH07XG59XG4iXX0=
