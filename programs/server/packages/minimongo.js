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
      if (typeof operand !== 'number') {
        throw Error('$type needs a number');
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
  return (/^[0-9]+$/.test(s)
  );
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
  } /**
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
  } /**
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
  } /**
     * @callback IterationCallback
     * @param {Object} doc
     * @param {Number} index
     */ /**
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
  } /**
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
  } /**
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
      throw new Error('must use ordered observe (ie, \'addedBefore\' instead of \'added\') ' + 'with skip or limit');
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
      return function () /* args*/{
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
var exports = require("./node_modules/meteor/minimongo/minimongo_server.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package.minimongo = exports, {
  LocalCollection: LocalCollection,
  Minimongo: Minimongo,
  MinimongoTest: MinimongoTest,
  MinimongoError: MinimongoError
});

})();

//# sourceURL=meteor://💻app/packages/minimongo.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaW1vbmdvL21pbmltb25nb19zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9jb21tb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9jdXJzb3IuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9sb2NhbF9jb2xsZWN0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9taW5pbW9uZ28vbWF0Y2hlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaW1vbmdvL21pbmltb25nb19jb21tb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21pbmltb25nby9vYnNlcnZlX2hhbmRsZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWluaW1vbmdvL3NvcnRlci5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJoYXNPd24iLCJpc051bWVyaWNLZXkiLCJpc09wZXJhdG9yT2JqZWN0IiwicGF0aHNUb1RyZWUiLCJwcm9qZWN0aW9uRGV0YWlscyIsInYiLCJNaW5pbW9uZ28iLCJfcGF0aHNFbGlkaW5nTnVtZXJpY0tleXMiLCJwYXRocyIsIm1hcCIsInBhdGgiLCJzcGxpdCIsImZpbHRlciIsInBhcnQiLCJqb2luIiwiTWF0Y2hlciIsInByb3RvdHlwZSIsImFmZmVjdGVkQnlNb2RpZmllciIsIm1vZGlmaWVyIiwiT2JqZWN0IiwiYXNzaWduIiwiJHNldCIsIiR1bnNldCIsIm1lYW5pbmdmdWxQYXRocyIsIl9nZXRQYXRocyIsIm1vZGlmaWVkUGF0aHMiLCJjb25jYXQiLCJrZXlzIiwic29tZSIsIm1vZCIsIm1lYW5pbmdmdWxQYXRoIiwic2VsIiwiaSIsImoiLCJsZW5ndGgiLCJjYW5CZWNvbWVUcnVlQnlNb2RpZmllciIsImlzU2ltcGxlIiwibW9kaWZpZXJQYXRocyIsInBhdGhIYXNOdW1lcmljS2V5cyIsImV4cGVjdGVkU2NhbGFySXNPYmplY3QiLCJfc2VsZWN0b3IiLCJtb2RpZmllclBhdGgiLCJzdGFydHNXaXRoIiwibWF0Y2hpbmdEb2N1bWVudCIsIkVKU09OIiwiY2xvbmUiLCJMb2NhbENvbGxlY3Rpb24iLCJfbW9kaWZ5IiwiZXJyb3IiLCJuYW1lIiwic2V0UHJvcGVydHlFcnJvciIsImRvY3VtZW50TWF0Y2hlcyIsInJlc3VsdCIsImNvbWJpbmVJbnRvUHJvamVjdGlvbiIsInByb2plY3Rpb24iLCJzZWxlY3RvclBhdGhzIiwiaW5jbHVkZXMiLCJjb21iaW5lSW1wb3J0YW50UGF0aHNJbnRvUHJvamVjdGlvbiIsIl9tYXRjaGluZ0RvY3VtZW50IiwidW5kZWZpbmVkIiwiZmFsbGJhY2siLCJ2YWx1ZVNlbGVjdG9yIiwiJGVxIiwiJGluIiwibWF0Y2hlciIsInBsYWNlaG9sZGVyIiwiZmluZCIsIm9ubHlDb250YWluc0tleXMiLCJsb3dlckJvdW5kIiwiSW5maW5pdHkiLCJ1cHBlckJvdW5kIiwiZm9yRWFjaCIsIm9wIiwiY2FsbCIsIm1pZGRsZSIsIngiLCJTb3J0ZXIiLCJfc2VsZWN0b3JGb3JBZmZlY3RlZEJ5TW9kaWZpZXIiLCJkZXRhaWxzIiwidHJlZSIsIm5vZGUiLCJmdWxsUGF0aCIsIm1lcmdlZFByb2plY3Rpb24iLCJ0cmVlVG9QYXRocyIsImluY2x1ZGluZyIsIm1lcmdlZEV4Y2xQcm9qZWN0aW9uIiwiZ2V0UGF0aHMiLCJzZWxlY3RvciIsIl9wYXRocyIsIm9iaiIsImV2ZXJ5IiwiayIsInByZWZpeCIsImtleSIsInZhbHVlIiwiZXhwb3J0IiwiRUxFTUVOVF9PUEVSQVRPUlMiLCJjb21waWxlRG9jdW1lbnRTZWxlY3RvciIsImVxdWFsaXR5RWxlbWVudE1hdGNoZXIiLCJleHBhbmRBcnJheXNJbkJyYW5jaGVzIiwiaXNJbmRleGFibGUiLCJtYWtlTG9va3VwRnVuY3Rpb24iLCJub3RoaW5nTWF0Y2hlciIsInBvcHVsYXRlRG9jdW1lbnRXaXRoUXVlcnlGaWVsZHMiLCJyZWdleHBFbGVtZW50TWF0Y2hlciIsImRlZmF1bHQiLCJoYXNPd25Qcm9wZXJ0eSIsIiRsdCIsIm1ha2VJbmVxdWFsaXR5IiwiY21wVmFsdWUiLCIkZ3QiLCIkbHRlIiwiJGd0ZSIsIiRtb2QiLCJjb21waWxlRWxlbWVudFNlbGVjdG9yIiwib3BlcmFuZCIsIkFycmF5IiwiaXNBcnJheSIsIkVycm9yIiwiZGl2aXNvciIsInJlbWFpbmRlciIsImVsZW1lbnRNYXRjaGVycyIsIm9wdGlvbiIsIlJlZ0V4cCIsIiRzaXplIiwiZG9udEV4cGFuZExlYWZBcnJheXMiLCIkdHlwZSIsImRvbnRJbmNsdWRlTGVhZkFycmF5cyIsIl9mIiwiX3R5cGUiLCIkYml0c0FsbFNldCIsIm1hc2siLCJnZXRPcGVyYW5kQml0bWFzayIsImJpdG1hc2siLCJnZXRWYWx1ZUJpdG1hc2siLCJieXRlIiwiJGJpdHNBbnlTZXQiLCIkYml0c0FsbENsZWFyIiwiJGJpdHNBbnlDbGVhciIsIiRyZWdleCIsInJlZ2V4cCIsIiRvcHRpb25zIiwidGVzdCIsInNvdXJjZSIsIiRlbGVtTWF0Y2giLCJfaXNQbGFpbk9iamVjdCIsImlzRG9jTWF0Y2hlciIsIkxPR0lDQUxfT1BFUkFUT1JTIiwicmVkdWNlIiwiYSIsImIiLCJzdWJNYXRjaGVyIiwiaW5FbGVtTWF0Y2giLCJjb21waWxlVmFsdWVTZWxlY3RvciIsImFycmF5RWxlbWVudCIsImFyZyIsImRvbnRJdGVyYXRlIiwiJGFuZCIsInN1YlNlbGVjdG9yIiwiYW5kRG9jdW1lbnRNYXRjaGVycyIsImNvbXBpbGVBcnJheU9mRG9jdW1lbnRTZWxlY3RvcnMiLCIkb3IiLCJtYXRjaGVycyIsImRvYyIsImZuIiwiJG5vciIsIiR3aGVyZSIsInNlbGVjdG9yVmFsdWUiLCJfcmVjb3JkUGF0aFVzZWQiLCJfaGFzV2hlcmUiLCJGdW5jdGlvbiIsIiRjb21tZW50IiwiVkFMVUVfT1BFUkFUT1JTIiwiY29udmVydEVsZW1lbnRNYXRjaGVyVG9CcmFuY2hlZE1hdGNoZXIiLCIkbm90IiwiaW52ZXJ0QnJhbmNoZWRNYXRjaGVyIiwiJG5lIiwiJG5pbiIsIiRleGlzdHMiLCJleGlzdHMiLCJldmVyeXRoaW5nTWF0Y2hlciIsIiRtYXhEaXN0YW5jZSIsIiRuZWFyIiwiJGFsbCIsImJyYW5jaGVkTWF0Y2hlcnMiLCJjcml0ZXJpb24iLCJhbmRCcmFuY2hlZE1hdGNoZXJzIiwiaXNSb290IiwiX2hhc0dlb1F1ZXJ5IiwibWF4RGlzdGFuY2UiLCJwb2ludCIsImRpc3RhbmNlIiwiJGdlb21ldHJ5IiwidHlwZSIsIkdlb0pTT04iLCJwb2ludERpc3RhbmNlIiwiY29vcmRpbmF0ZXMiLCJwb2ludFRvQXJyYXkiLCJnZW9tZXRyeVdpdGhpblJhZGl1cyIsImRpc3RhbmNlQ29vcmRpbmF0ZVBhaXJzIiwiYnJhbmNoZWRWYWx1ZXMiLCJicmFuY2giLCJjdXJEaXN0YW5jZSIsIl9pc1VwZGF0ZSIsImFycmF5SW5kaWNlcyIsImFuZFNvbWVNYXRjaGVycyIsInN1Yk1hdGNoZXJzIiwiZG9jT3JCcmFuY2hlcyIsIm1hdGNoIiwic3ViUmVzdWx0Iiwic2VsZWN0b3JzIiwiZG9jU2VsZWN0b3IiLCJvcHRpb25zIiwiZG9jTWF0Y2hlcnMiLCJzdWJzdHIiLCJfaXNTaW1wbGUiLCJsb29rVXBCeUluZGV4IiwidmFsdWVNYXRjaGVyIiwiQm9vbGVhbiIsIm9wZXJhdG9yQnJhbmNoZWRNYXRjaGVyIiwiZWxlbWVudE1hdGNoZXIiLCJicmFuY2hlcyIsImV4cGFuZGVkIiwiZWxlbWVudCIsIm1hdGNoZWQiLCJwb2ludEEiLCJwb2ludEIiLCJNYXRoIiwiaHlwb3QiLCJlbGVtZW50U2VsZWN0b3IiLCJfZXF1YWwiLCJkb2NPckJyYW5jaGVkVmFsdWVzIiwic2tpcFRoZUFycmF5cyIsImJyYW5jaGVzT3V0IiwidGhpc0lzQXJyYXkiLCJwdXNoIiwiTnVtYmVyIiwiaXNJbnRlZ2VyIiwiVWludDhBcnJheSIsIkludDMyQXJyYXkiLCJidWZmZXIiLCJpc0JpbmFyeSIsIkFycmF5QnVmZmVyIiwibWF4IiwidmlldyIsImlzU2FmZUludGVnZXIiLCJVaW50MzJBcnJheSIsIkJZVEVTX1BFUl9FTEVNRU5UIiwiaW5zZXJ0SW50b0RvY3VtZW50IiwiZG9jdW1lbnQiLCJleGlzdGluZ0tleSIsImluZGV4T2YiLCJicmFuY2hlZE1hdGNoZXIiLCJicmFuY2hWYWx1ZXMiLCJzIiwiaW5jb25zaXN0ZW50T0siLCJ0aGVzZUFyZU9wZXJhdG9ycyIsInNlbEtleSIsInRoaXNJc09wZXJhdG9yIiwiSlNPTiIsInN0cmluZ2lmeSIsImNtcFZhbHVlQ29tcGFyYXRvciIsIm9wZXJhbmRUeXBlIiwiX2NtcCIsInBhcnRzIiwiZmlyc3RQYXJ0IiwibG9va3VwUmVzdCIsInNsaWNlIiwib21pdFVubmVjZXNzYXJ5RmllbGRzIiwiZmlyc3RMZXZlbCIsImFwcGVuZFRvUmVzdWx0IiwibW9yZSIsImZvclNvcnQiLCJhcnJheUluZGV4IiwiTWluaW1vbmdvVGVzdCIsIk1pbmltb25nb0Vycm9yIiwibWVzc2FnZSIsImZpZWxkIiwib3BlcmF0b3JNYXRjaGVycyIsIm9wZXJhdG9yIiwic2ltcGxlUmFuZ2UiLCJzaW1wbGVFcXVhbGl0eSIsInNpbXBsZUluY2x1c2lvbiIsIm5ld0xlYWZGbiIsImNvbmZsaWN0Rm4iLCJyb290IiwicGF0aEFycmF5Iiwic3VjY2VzcyIsImxhc3RLZXkiLCJ5IiwicG9wdWxhdGVEb2N1bWVudFdpdGhLZXlWYWx1ZSIsImdldFByb3RvdHlwZU9mIiwicG9wdWxhdGVEb2N1bWVudFdpdGhPYmplY3QiLCJ1bnByZWZpeGVkS2V5cyIsInZhbGlkYXRlT2JqZWN0Iiwib2JqZWN0IiwicXVlcnkiLCJfc2VsZWN0b3JJc0lkIiwiZmllbGRzIiwiZmllbGRzS2V5cyIsInNvcnQiLCJfaWQiLCJrZXlQYXRoIiwicnVsZSIsInByb2plY3Rpb25SdWxlc1RyZWUiLCJjdXJyZW50UGF0aCIsImFub3RoZXJQYXRoIiwidG9TdHJpbmciLCJsYXN0SW5kZXgiLCJ2YWxpZGF0ZUtleUluUGF0aCIsIkN1cnNvciIsImNvbnN0cnVjdG9yIiwiY29sbGVjdGlvbiIsInNvcnRlciIsIl9zZWxlY3RvcklzSWRQZXJoYXBzQXNPYmplY3QiLCJfc2VsZWN0b3JJZCIsImhhc0dlb1F1ZXJ5Iiwic2tpcCIsImxpbWl0IiwiX3Byb2plY3Rpb25GbiIsIl9jb21waWxlUHJvamVjdGlvbiIsIl90cmFuc2Zvcm0iLCJ3cmFwVHJhbnNmb3JtIiwidHJhbnNmb3JtIiwiVHJhY2tlciIsInJlYWN0aXZlIiwiY291bnQiLCJhcHBseVNraXBMaW1pdCIsIl9kZXBlbmQiLCJhZGRlZCIsInJlbW92ZWQiLCJfZ2V0UmF3T2JqZWN0cyIsIm9yZGVyZWQiLCJmZXRjaCIsIlN5bWJvbCIsIml0ZXJhdG9yIiwiYWRkZWRCZWZvcmUiLCJjaGFuZ2VkIiwibW92ZWRCZWZvcmUiLCJpbmRleCIsIm9iamVjdHMiLCJuZXh0IiwiZG9uZSIsImNhbGxiYWNrIiwidGhpc0FyZyIsImdldFRyYW5zZm9ybSIsIm9ic2VydmUiLCJfb2JzZXJ2ZUZyb21PYnNlcnZlQ2hhbmdlcyIsIm9ic2VydmVDaGFuZ2VzIiwiX29ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzQXJlT3JkZXJlZCIsIl9hbGxvd191bm9yZGVyZWQiLCJkaXN0YW5jZXMiLCJfSWRNYXAiLCJjdXJzb3IiLCJkaXJ0eSIsInByb2plY3Rpb25GbiIsInJlc3VsdHNTbmFwc2hvdCIsInFpZCIsIm5leHRfcWlkIiwicXVlcmllcyIsInJlc3VsdHMiLCJwYXVzZWQiLCJ3cmFwQ2FsbGJhY2siLCJzZWxmIiwiYXJncyIsImFyZ3VtZW50cyIsIl9vYnNlcnZlUXVldWUiLCJxdWV1ZVRhc2siLCJhcHBseSIsIl9zdXBwcmVzc19pbml0aWFsIiwiX21hcCIsImhhbmRsZSIsIk9ic2VydmVIYW5kbGUiLCJzdG9wIiwiYWN0aXZlIiwib25JbnZhbGlkYXRlIiwiZHJhaW4iLCJyZXdpbmQiLCJjaGFuZ2VycyIsImRlcGVuZGVuY3kiLCJEZXBlbmRlbmN5Iiwibm90aWZ5IiwiYmluZCIsImRlcGVuZCIsIl9nZXRDb2xsZWN0aW9uTmFtZSIsInNlbGVjdGVkRG9jIiwiX2RvY3MiLCJnZXQiLCJzZXQiLCJjbGVhciIsImlkIiwibWF0Y2hSZXN1bHQiLCJnZXRDb21wYXJhdG9yIiwiX3B1Ymxpc2hDdXJzb3IiLCJzdWJzY3JpcHRpb24iLCJQYWNrYWdlIiwibW9uZ28iLCJNb25nbyIsIkNvbGxlY3Rpb24iLCJNZXRlb3IiLCJfU3luY2hyb25vdXNRdWV1ZSIsImNyZWF0ZSIsIl9zYXZlZE9yaWdpbmFscyIsImZpbmRPbmUiLCJpbnNlcnQiLCJhc3NlcnRIYXNWYWxpZEZpZWxkTmFtZXMiLCJfdXNlT0lEIiwiTW9uZ29JRCIsIk9iamVjdElEIiwiUmFuZG9tIiwiaGFzIiwiX3NhdmVPcmlnaW5hbCIsInF1ZXJpZXNUb1JlY29tcHV0ZSIsIl9pbnNlcnRJblJlc3VsdHMiLCJfcmVjb21wdXRlUmVzdWx0cyIsImRlZmVyIiwicGF1c2VPYnNlcnZlcnMiLCJyZW1vdmUiLCJlcXVhbHMiLCJzaXplIiwiX2VhY2hQb3NzaWJseU1hdGNoaW5nRG9jIiwicXVlcnlSZW1vdmUiLCJyZW1vdmVJZCIsInJlbW92ZURvYyIsIl9yZW1vdmVGcm9tUmVzdWx0cyIsInJlc3VtZU9ic2VydmVycyIsIl9kaWZmUXVlcnlDaGFuZ2VzIiwicmV0cmlldmVPcmlnaW5hbHMiLCJvcmlnaW5hbHMiLCJzYXZlT3JpZ2luYWxzIiwidXBkYXRlIiwicWlkVG9PcmlnaW5hbFJlc3VsdHMiLCJkb2NNYXAiLCJpZHNNYXRjaGVkIiwiX2lkc01hdGNoZWRCeVNlbGVjdG9yIiwibWVtb2l6ZWRDbG9uZUlmTmVlZGVkIiwiZG9jVG9NZW1vaXplIiwicmVjb21wdXRlUWlkcyIsInVwZGF0ZUNvdW50IiwicXVlcnlSZXN1bHQiLCJfbW9kaWZ5QW5kTm90aWZ5IiwibXVsdGkiLCJpbnNlcnRlZElkIiwidXBzZXJ0IiwiX2NyZWF0ZVVwc2VydERvY3VtZW50IiwiX3JldHVybk9iamVjdCIsIm51bWJlckFmZmVjdGVkIiwic3BlY2lmaWNJZHMiLCJtYXRjaGVkX2JlZm9yZSIsIm9sZF9kb2MiLCJhZnRlck1hdGNoIiwiYWZ0ZXIiLCJiZWZvcmUiLCJfdXBkYXRlSW5SZXN1bHRzIiwib2xkUmVzdWx0cyIsIl9DYWNoaW5nQ2hhbmdlT2JzZXJ2ZXIiLCJvcmRlcmVkRnJvbUNhbGxiYWNrcyIsImNhbGxiYWNrcyIsImRvY3MiLCJPcmRlcmVkRGljdCIsImlkU3RyaW5naWZ5IiwiYXBwbHlDaGFuZ2UiLCJwdXRCZWZvcmUiLCJtb3ZlQmVmb3JlIiwiRGlmZlNlcXVlbmNlIiwiYXBwbHlDaGFuZ2VzIiwiSWRNYXAiLCJpZFBhcnNlIiwiX193cmFwcGVkVHJhbnNmb3JtX18iLCJ3cmFwcGVkIiwidHJhbnNmb3JtZWQiLCJub25yZWFjdGl2ZSIsIl9iaW5hcnlTZWFyY2giLCJjbXAiLCJhcnJheSIsImZpcnN0IiwicmFuZ2UiLCJoYWxmUmFuZ2UiLCJmbG9vciIsIl9jaGVja1N1cHBvcnRlZFByb2plY3Rpb24iLCJfaWRQcm9qZWN0aW9uIiwicnVsZVRyZWUiLCJzdWJkb2MiLCJzZWxlY3RvckRvY3VtZW50IiwiaXNNb2RpZnkiLCJfaXNNb2RpZmljYXRpb25Nb2QiLCJuZXdEb2MiLCJpc0luc2VydCIsInJlcGxhY2VtZW50IiwiX2RpZmZPYmplY3RzIiwibGVmdCIsInJpZ2h0IiwiZGlmZk9iamVjdHMiLCJuZXdSZXN1bHRzIiwib2JzZXJ2ZXIiLCJkaWZmUXVlcnlDaGFuZ2VzIiwiX2RpZmZRdWVyeU9yZGVyZWRDaGFuZ2VzIiwiZGlmZlF1ZXJ5T3JkZXJlZENoYW5nZXMiLCJfZGlmZlF1ZXJ5VW5vcmRlcmVkQ2hhbmdlcyIsImRpZmZRdWVyeVVub3JkZXJlZENoYW5nZXMiLCJfZmluZEluT3JkZXJlZFJlc3VsdHMiLCJzdWJJZHMiLCJfaW5zZXJ0SW5Tb3J0ZWRMaXN0Iiwic3BsaWNlIiwiaXNSZXBsYWNlIiwiaXNNb2RpZmllciIsInNldE9uSW5zZXJ0IiwibW9kRnVuYyIsIk1PRElGSUVSUyIsImtleXBhdGgiLCJrZXlwYXJ0cyIsInRhcmdldCIsImZpbmRNb2RUYXJnZXQiLCJmb3JiaWRBcnJheSIsIm5vQ3JlYXRlIiwiTk9fQ1JFQVRFX01PRElGSUVSUyIsInBvcCIsIm9ic2VydmVDYWxsYmFja3MiLCJzdXBwcmVzc2VkIiwib2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3MiLCJfb2JzZXJ2ZUNhbGxiYWNrc0FyZU9yZGVyZWQiLCJpbmRpY2VzIiwiX25vX2luZGljZXMiLCJhZGRlZEF0IiwiY2hhbmdlZEF0Iiwib2xkRG9jIiwibW92ZWRUbyIsImZyb20iLCJ0byIsInJlbW92ZWRBdCIsImNoYW5nZU9ic2VydmVyIiwiY2hhbmdlZEZpZWxkcyIsIm1ha2VDaGFuZ2VkRmllbGRzIiwib2xkX2lkeCIsIm5ld19pZHgiLCIkY3VycmVudERhdGUiLCJEYXRlIiwiJG1pbiIsIiRtYXgiLCIkaW5jIiwiJHNldE9uSW5zZXJ0IiwiJHB1c2giLCIkZWFjaCIsInRvUHVzaCIsInBvc2l0aW9uIiwiJHBvc2l0aW9uIiwiJHNsaWNlIiwic29ydEZ1bmN0aW9uIiwiJHNvcnQiLCJzcGxpY2VBcmd1bWVudHMiLCIkcHVzaEFsbCIsIiRhZGRUb1NldCIsImlzRWFjaCIsInZhbHVlcyIsInRvQWRkIiwiJHBvcCIsInRvUG9wIiwiJHB1bGwiLCJ0b1B1bGwiLCJvdXQiLCIkcHVsbEFsbCIsIiRyZW5hbWUiLCJ0YXJnZXQyIiwiJGJpdCIsImludmFsaWRDaGFyTXNnIiwiJCIsImFzc2VydElzVmFsaWRGaWVsZE5hbWUiLCJ1c2VkQXJyYXlJbmRleCIsImxhc3QiLCJrZXlwYXJ0IiwicGFyc2VJbnQiLCJpc1VwZGF0ZSIsIl9kb2NNYXRjaGVyIiwiX2NvbXBpbGVTZWxlY3RvciIsImhhc1doZXJlIiwia2V5T3JkZXJTZW5zaXRpdmUiLCJfdHlwZW9yZGVyIiwidCIsInRhIiwidGIiLCJvYSIsIm9iIiwidG9IZXhTdHJpbmciLCJnZXRUaW1lIiwidG9BcnJheSIsIkxvY2FsQ29sbGVjdGlvbl8iLCJzcGVjIiwiX3NvcnRTcGVjUGFydHMiLCJfc29ydEZ1bmN0aW9uIiwiYWRkU3BlY1BhcnQiLCJhc2NlbmRpbmciLCJjaGFyQXQiLCJsb29rdXAiLCJfa2V5Q29tcGFyYXRvciIsImNvbXBvc2VDb21wYXJhdG9ycyIsIl9rZXlGaWVsZENvbXBhcmF0b3IiLCJfa2V5RmlsdGVyIiwiX3VzZVdpdGhNYXRjaGVyIiwiX2dldEJhc2VDb21wYXJhdG9yIiwiX2NvbXBhcmVLZXlzIiwia2V5MSIsImtleTIiLCJfZ2VuZXJhdGVLZXlzRnJvbURvYyIsImNiIiwicGF0aEZyb21JbmRpY2VzIiwia25vd25QYXRocyIsInZhbHVlc0J5SW5kZXhBbmRQYXRoIiwidXNlZFBhdGhzIiwic29sZUtleSIsImRvYzEiLCJkb2MyIiwiX2dldE1pbktleUZyb21Eb2MiLCJtaW5LZXkiLCJfa2V5Q29tcGF0aWJsZVdpdGhTZWxlY3RvciIsImludmVydCIsImNvbXBhcmUiLCJjb25zdHJhaW50c0J5UGF0aCIsImNvbnN0cmFpbnRzIiwiaWdub3JlQ2FzZSIsIm11bHRpbGluZSIsInNwZWNQYXJ0IiwiY29tcGFyYXRvckFycmF5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSx1QkFBUixDQUFiO0FBQStDLElBQUlDLE1BQUosRUFBV0MsWUFBWCxFQUF3QkMsZ0JBQXhCLEVBQXlDQyxXQUF6QyxFQUFxREMsaUJBQXJEO0FBQXVFUCxPQUFPQyxLQUFQLENBQWFDLFFBQVEsYUFBUixDQUFiLEVBQW9DO0FBQUNDLFNBQU9LLENBQVAsRUFBUztBQUFDTCxhQUFPSyxDQUFQO0FBQVMsR0FBcEI7O0FBQXFCSixlQUFhSSxDQUFiLEVBQWU7QUFBQ0osbUJBQWFJLENBQWI7QUFBZSxHQUFwRDs7QUFBcURILG1CQUFpQkcsQ0FBakIsRUFBbUI7QUFBQ0gsdUJBQWlCRyxDQUFqQjtBQUFtQixHQUE1Rjs7QUFBNkZGLGNBQVlFLENBQVosRUFBYztBQUFDRixrQkFBWUUsQ0FBWjtBQUFjLEdBQTFIOztBQUEySEQsb0JBQWtCQyxDQUFsQixFQUFvQjtBQUFD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QTZDO0FBQzNDLFNBQU8sQ0FBQ3hkLENBQUQsRUFBSUMsQ0FBSixLQUFVO0FBQ2YsU0FBSyxJQUFJdEgsSUFBSSxDQUFiLEVBQWdCQSxJQUFJNmtCLGdCQUFnQjNrQixNQUFwQyxFQUE0QyxFQUFFRixDQUE5QyxFQUFpRDtBQUMvQyxZQUFNdWtCLFVBQVVNLGdCQUFnQjdrQixDQUFoQixFQUFtQnFILENBQW5CLEVBQXNCQyxDQUF0QixDQUFoQjs7QUFDQSxVQUFJaWQsWUFBWSxDQUFoQixFQUFtQjtBQUNqQixlQUFPQSxPQUFQO0FBQ0Q7QUFDRjs7QUFFRCxXQUFPLENBQVA7QUFDRCxHQVREO0FBVUQsQyIsImZpbGUiOiIvcGFja2FnZXMvbWluaW1vbmdvLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICcuL21pbmltb25nb19jb21tb24uanMnO1xuaW1wb3J0IHtcbiAgaGFzT3duLFxuICBpc051bWVyaWNLZXksXG4gIGlzT3BlcmF0b3JPYmplY3QsXG4gIHBhdGhzVG9UcmVlLFxuICBwcm9qZWN0aW9uRGV0YWlscyxcbn0gZnJvbSAnLi9jb21tb24uanMnO1xuXG5NaW5pbW9uZ28uX3BhdGhzRWxpZGluZ051bWVyaWNLZXlzID0gcGF0aHMgPT4gcGF0aHMubWFwKHBhdGggPT5cbiAgcGF0aC5zcGxpdCgnLicpLmZpbHRlcihwYXJ0ID0+ICFpc051bWVyaWNLZXkocGFydCkpLmpvaW4oJy4nKVxuKTtcblxuLy8gUmV0dXJucyB0cnVlIGlmIHRoZSBtb2RpZmllciBhcHBsaWVkIHRvIHNvbWUgZG9jdW1lbnQgbWF5IGNoYW5nZSB0aGUgcmVzdWx0XG4vLyBvZiBtYXRjaGluZyB0aGUgZG9jdW1lbnQgYnkgc2VsZWN0b3Jcbi8vIFRoZSBtb2RpZmllciBpcyBhbHdheXMgaW4gYSBmb3JtIG9mIE9iamVjdDpcbi8vICAtICRzZXRcbi8vICAgIC0gJ2EuYi4yMi56JzogdmFsdWVcbi8vICAgIC0gJ2Zvby5iYXInOiA0MlxuLy8gIC0gJHVuc2V0XG4vLyAgICAtICdhYmMuZCc6IDFcbk1pbmltb25nby5NYXRjaGVyLnByb3RvdHlwZS5hZmZlY3RlZEJ5TW9kaWZpZXIgPSBmdW5jdGlvbihtb2RpZmllcikge1xuICAvLyBzYWZlIGNoZWNrIGZvciAkc2V0LyR1bnNldCBiZWluZyBvYmplY3RzXG4gIG1vZGlmaWVyID0gT2JqZWN0LmFzc2lnbih7JHNldDoge30sICR1bnNldDoge319LCBtb2RpZmllcik7XG5cbiAgY29uc3QgbWVhbmluZ2Z1bFBhdGhzID0gdGhpcy5fZ2V0UGF0aHMoKTtcbiAgY29uc3QgbW9kaWZpZWRQYXRocyA9IFtdLmNvbmNhdChcbiAgICBPYmplY3Qua2V5cyhtb2RpZmllci4kc2V0KSxcbiAgICBPYmplY3Qua2V5cyhtb2RpZmllci4kdW5zZXQpXG4gICk7XG5cbiAgcmV0dXJuIG1vZGlmaWVkUGF0aHMuc29tZShwYXRoID0+IHtcbiAgICBjb25zdCBtb2QgPSBwYXRoLnNwbGl0KCcuJyk7XG5cbiAgICByZXR1cm4gbWVhbmluZ2Z1bFBhdGhzLnNvbWUobWVhbmluZ2Z1bFBhdGggPT4ge1xuICAgICAgY29uc3Qgc2VsID0gbWVhbmluZ2Z1bFBhdGguc3BsaXQoJy4nKTtcblxuICAgICAgbGV0IGkgPSAwLCBqID0gMDtcblxuICAgICAgd2hpbGUgKGkgPCBzZWwubGVuZ3RoICYmIGogPCBtb2QubGVuZ3RoKSB7XG4gICAgICAgIGlmIChpc051bWVyaWNLZXkoc2VsW2ldKSAmJiBpc051bWVyaWNLZXkobW9kW2pdKSkge1xuICAgICAgICAgIC8vIGZvby40LmJhciBzZWxlY3RvciBhZmZlY3RlZCBieSBmb28uNCBtb2RpZmllclxuICAgICAgICAgIC8vIGZvby4zLmJhciBzZWxlY3RvciB1bmFmZmVjdGVkIGJ5IGZvby40IG1vZGlmaWVyXG4gICAgICAgICAgaWYgKHNlbFtpXSA9PT0gbW9kW2pdKSB7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgICBqKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaXNOdW1lcmljS2V5KHNlbFtpXSkpIHtcbiAgICAgICAgICAvLyBmb28uNC5iYXIgc2VsZWN0b3IgdW5hZmZlY3RlZCBieSBmb28uYmFyIG1vZGlmaWVyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2UgaWYgKGlzTnVtZXJpY0tleShtb2Rbal0pKSB7XG4gICAgICAgICAgaisrO1xuICAgICAgICB9IGVsc2UgaWYgKHNlbFtpXSA9PT0gbW9kW2pdKSB7XG4gICAgICAgICAgaSsrO1xuICAgICAgICAgIGorKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gT25lIGlzIGEgcHJlZml4IG9mIGFub3RoZXIsIHRha2luZyBudW1lcmljIGZpZWxkcyBpbnRvIGFjY291bnRcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbi8vIEBwYXJhbSBtb2RpZmllciAtIE9iamVjdDogTW9uZ29EQi1zdHlsZWQgbW9kaWZpZXIgd2l0aCBgJHNldGBzIGFuZCBgJHVuc2V0c2Bcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgb25seS4gKGFzc3VtZWQgdG8gY29tZSBmcm9tIG9wbG9nKVxuLy8gQHJldHVybnMgLSBCb29sZWFuOiBpZiBhZnRlciBhcHBseWluZyB0aGUgbW9kaWZpZXIsIHNlbGVjdG9yIGNhbiBzdGFydFxuLy8gICAgICAgICAgICAgICAgICAgICBhY2NlcHRpbmcgdGhlIG1vZGlmaWVkIHZhbHVlLlxuLy8gTk9URTogYXNzdW1lcyB0aGF0IGRvY3VtZW50IGFmZmVjdGVkIGJ5IG1vZGlmaWVyIGRpZG4ndCBtYXRjaCB0aGlzIE1hdGNoZXJcbi8vIGJlZm9yZSwgc28gaWYgbW9kaWZpZXIgY2FuJ3QgY29udmluY2Ugc2VsZWN0b3IgaW4gYSBwb3NpdGl2ZSBjaGFuZ2UgaXQgd291bGRcbi8vIHN0YXkgJ2ZhbHNlJy5cbi8vIEN1cnJlbnRseSBkb2Vzbid0IHN1cHBvcnQgJC1vcGVyYXRvcnMgYW5kIG51bWVyaWMgaW5kaWNlcyBwcmVjaXNlbHkuXG5NaW5pbW9uZ28uTWF0Y2hlci5wcm90b3R5cGUuY2FuQmVjb21lVHJ1ZUJ5TW9kaWZpZXIgPSBmdW5jdGlvbihtb2RpZmllcikge1xuICBpZiAoIXRoaXMuYWZmZWN0ZWRCeU1vZGlmaWVyKG1vZGlmaWVyKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmICghdGhpcy5pc1NpbXBsZSgpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBtb2RpZmllciA9IE9iamVjdC5hc3NpZ24oeyRzZXQ6IHt9LCAkdW5zZXQ6IHt9fSwgbW9kaWZpZXIpO1xuXG4gIGNvbnN0IG1vZGlmaWVyUGF0aHMgPSBbXS5jb25jYXQoXG4gICAgT2JqZWN0LmtleXMobW9kaWZpZXIuJHNldCksXG4gICAgT2JqZWN0LmtleXMobW9kaWZpZXIuJHVuc2V0KVxuICApO1xuXG4gIGlmICh0aGlzLl9nZXRQYXRocygpLnNvbWUocGF0aEhhc051bWVyaWNLZXlzKSB8fFxuICAgICAgbW9kaWZpZXJQYXRocy5zb21lKHBhdGhIYXNOdW1lcmljS2V5cykpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIGNoZWNrIGlmIHRoZXJlIGlzIGEgJHNldCBvciAkdW5zZXQgdGhhdCBpbmRpY2F0ZXMgc29tZXRoaW5nIGlzIGFuXG4gIC8vIG9iamVjdCByYXRoZXIgdGhhbiBhIHNjYWxhciBpbiB0aGUgYWN0dWFsIG9iamVjdCB3aGVyZSB3ZSBzYXcgJC1vcGVyYXRvclxuICAvLyBOT1RFOiBpdCBpcyBjb3JyZWN0IHNpbmNlIHdlIGFsbG93IG9ubHkgc2NhbGFycyBpbiAkLW9wZXJhdG9yc1xuICAvLyBFeGFtcGxlOiBmb3Igc2VsZWN0b3IgeydhLmInOiB7JGd0OiA1fX0gdGhlIG1vZGlmaWVyIHsnYS5iLmMnOjd9IHdvdWxkXG4gIC8vIGRlZmluaXRlbHkgc2V0IHRoZSByZXN1bHQgdG8gZmFsc2UgYXMgJ2EuYicgYXBwZWFycyB0byBiZSBhbiBvYmplY3QuXG4gIGNvbnN0IGV4cGVjdGVkU2NhbGFySXNPYmplY3QgPSBPYmplY3Qua2V5cyh0aGlzLl9zZWxlY3Rvcikuc29tZShwYXRoID0+IHtcbiAgICBpZiAoIWlzT3BlcmF0b3JPYmplY3QodGhpcy5fc2VsZWN0b3JbcGF0aF0pKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1vZGlmaWVyUGF0aHMuc29tZShtb2RpZmllclBhdGggPT5cbiAgICAgIG1vZGlmaWVyUGF0aC5zdGFydHNXaXRoKGAke3BhdGh9LmApXG4gICAgKTtcbiAgfSk7XG5cbiAgaWYgKGV4cGVjdGVkU2NhbGFySXNPYmplY3QpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBTZWUgaWYgd2UgY2FuIGFwcGx5IHRoZSBtb2RpZmllciBvbiB0aGUgaWRlYWxseSBtYXRjaGluZyBvYmplY3QuIElmIGl0XG4gIC8vIHN0aWxsIG1hdGNoZXMgdGhlIHNlbGVjdG9yLCB0aGVuIHRoZSBtb2RpZmllciBjb3VsZCBoYXZlIHR1cm5lZCB0aGUgcmVhbFxuICAvLyBvYmplY3QgaW4gdGhlIGRhdGFiYXNlIGludG8gc29tZXRoaW5nIG1hdGNoaW5nLlxuICBjb25zdCBtYXRjaGluZ0RvY3VtZW50ID0gRUpTT04uY2xvbmUodGhpcy5tYXRjaGluZ0RvY3VtZW50KCkpO1xuXG4gIC8vIFRoZSBzZWxlY3RvciBpcyB0b28gY29tcGxleCwgYW55dGhpbmcgY2FuIGhhcHBlbi5cbiAgaWYgKG1hdGNoaW5nRG9jdW1lbnQgPT09IG51bGwpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgTG9jYWxDb2xsZWN0aW9uLl9tb2RpZnkobWF0Y2hpbmdEb2N1bWVudCwgbW9kaWZpZXIpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIC8vIENvdWxkbid0IHNldCBhIHByb3BlcnR5IG9uIGEgZmllbGQgd2hpY2ggaXMgYSBzY2FsYXIgb3IgbnVsbCBpbiB0aGVcbiAgICAvLyBzZWxlY3Rvci5cbiAgICAvLyBFeGFtcGxlOlxuICAgIC8vIHJlYWwgZG9jdW1lbnQ6IHsgJ2EuYic6IDMgfVxuICAgIC8vIHNlbGVjdG9yOiB7ICdhJzogMTIgfVxuICAgIC8vIGNvbnZlcnRlZCBzZWxlY3RvciAoaWRlYWwgZG9jdW1lbnQpOiB7ICdhJzogMTIgfVxuICAgIC8vIG1vZGlmaWVyOiB7ICRzZXQ6IHsgJ2EuYic6IDQgfSB9XG4gICAgLy8gV2UgZG9uJ3Qga25vdyB3aGF0IHJlYWwgZG9jdW1lbnQgd2FzIGxpa2UgYnV0IGZyb20gdGhlIGVycm9yIHJhaXNlZCBieVxuICAgIC8vICRzZXQgb24gYSBzY2FsYXIgZmllbGQgd2UgY2FuIHJlYXNvbiB0aGF0IHRoZSBzdHJ1Y3R1cmUgb2YgcmVhbCBkb2N1bWVudFxuICAgIC8vIGlzIGNvbXBsZXRlbHkgZGlmZmVyZW50LlxuICAgIGlmIChlcnJvci5uYW1lID09PSAnTWluaW1vbmdvRXJyb3InICYmIGVycm9yLnNldFByb3BlcnR5RXJyb3IpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIHJldHVybiB0aGlzLmRvY3VtZW50TWF0Y2hlcyhtYXRjaGluZ0RvY3VtZW50KS5yZXN1bHQ7XG59O1xuXG4vLyBLbm93cyBob3cgdG8gY29tYmluZSBhIG1vbmdvIHNlbGVjdG9yIGFuZCBhIGZpZWxkcyBwcm9qZWN0aW9uIHRvIGEgbmV3IGZpZWxkc1xuLy8gcHJvamVjdGlvbiB0YWtpbmcgaW50byBhY2NvdW50IGFjdGl2ZSBmaWVsZHMgZnJvbSB0aGUgcGFzc2VkIHNlbGVjdG9yLlxuLy8gQHJldHVybnMgT2JqZWN0IC0gcHJvamVjdGlvbiBvYmplY3QgKHNhbWUgYXMgZmllbGRzIG9wdGlvbiBvZiBtb25nbyBjdXJzb3IpXG5NaW5pbW9uZ28uTWF0Y2hlci5wcm90b3R5cGUuY29tYmluZUludG9Qcm9qZWN0aW9uID0gZnVuY3Rpb24ocHJvamVjdGlvbikge1xuICBjb25zdCBzZWxlY3RvclBhdGhzID0gTWluaW1vbmdvLl9wYXRoc0VsaWRpbmdOdW1lcmljS2V5cyh0aGlzLl9nZXRQYXRocygpKTtcblxuICAvLyBTcGVjaWFsIGNhc2UgZm9yICR3aGVyZSBvcGVyYXRvciBpbiB0aGUgc2VsZWN0b3IgLSBwcm9qZWN0aW9uIHNob3VsZCBkZXBlbmRcbiAgLy8gb24gYWxsIGZpZWxkcyBvZiB0aGUgZG9jdW1lbnQuIGdldFNlbGVjdG9yUGF0aHMgcmV0dXJucyBhIGxpc3Qgb2YgcGF0aHNcbiAgLy8gc2VsZWN0b3IgZGVwZW5kcyBvbi4gSWYgb25lIG9mIHRoZSBwYXRocyBpcyAnJyAoZW1wdHkgc3RyaW5nKSByZXByZXNlbnRpbmdcbiAgLy8gdGhlIHJvb3Qgb3IgdGhlIHdob2xlIGRvY3VtZW50LCBjb21wbGV0ZSBwcm9qZWN0aW9uIHNob3VsZCBiZSByZXR1cm5lZC5cbiAgaWYgKHNlbGVjdG9yUGF0aHMuaW5jbHVkZXMoJycpKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG5cbiAgcmV0dXJuIGNvbWJpbmVJbXBvcnRhbnRQYXRoc0ludG9Qcm9qZWN0aW9uKHNlbGVjdG9yUGF0aHMsIHByb2plY3Rpb24pO1xufTtcblxuLy8gUmV0dXJucyBhbiBvYmplY3QgdGhhdCB3b3VsZCBtYXRjaCB0aGUgc2VsZWN0b3IgaWYgcG9zc2libGUgb3IgbnVsbCBpZiB0aGVcbi8vIHNlbGVjdG9yIGlzIHRvbyBjb21wbGV4IGZvciB1cyB0byBhbmFseXplXG4vLyB7ICdhLmInOiB7IGFuczogNDIgfSwgJ2Zvby5iYXInOiBudWxsLCAnZm9vLmJheic6IFwic29tZXRoaW5nXCIgfVxuLy8gPT4geyBhOiB7IGI6IHsgYW5zOiA0MiB9IH0sIGZvbzogeyBiYXI6IG51bGwsIGJhejogXCJzb21ldGhpbmdcIiB9IH1cbk1pbmltb25nby5NYXRjaGVyLnByb3RvdHlwZS5tYXRjaGluZ0RvY3VtZW50ID0gZnVuY3Rpb24oKSB7XG4gIC8vIGNoZWNrIGlmIGl0IHdhcyBjb21wdXRlZCBiZWZvcmVcbiAgaWYgKHRoaXMuX21hdGNoaW5nRG9jdW1lbnQgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB0aGlzLl9tYXRjaGluZ0RvY3VtZW50O1xuICB9XG5cbiAgLy8gSWYgdGhlIGFuYWx5c2lzIG9mIHRoaXMgc2VsZWN0b3IgaXMgdG9vIGhhcmQgZm9yIG91ciBpbXBsZW1lbnRhdGlvblxuICAvLyBmYWxsYmFjayB0byBcIllFU1wiXG4gIGxldCBmYWxsYmFjayA9IGZhbHNlO1xuXG4gIHRoaXMuX21hdGNoaW5nRG9jdW1lbnQgPSBwYXRoc1RvVHJlZShcbiAgICB0aGlzLl9nZXRQYXRocygpLFxuICAgIHBhdGggPT4ge1xuICAgICAgY29uc3QgdmFsdWVTZWxlY3RvciA9IHRoaXMuX3NlbGVjdG9yW3BhdGhdO1xuXG4gICAgICBpZiAoaXNPcGVyYXRvck9iamVjdCh2YWx1ZVNlbGVjdG9yKSkge1xuICAgICAgICAvLyBpZiB0aGVyZSBpcyBhIHN0cmljdCBlcXVhbGl0eSwgdGhlcmUgaXMgYSBnb29kXG4gICAgICAgIC8vIGNoYW5jZSB3ZSBjYW4gdXNlIG9uZSBvZiB0aG9zZSBhcyBcIm1hdGNoaW5nXCJcbiAgICAgICAgLy8gZHVtbXkgdmFsdWVcbiAgICAgICAgaWYgKHZhbHVlU2VsZWN0b3IuJGVxKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlU2VsZWN0b3IuJGVxO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZhbHVlU2VsZWN0b3IuJGluKSB7XG4gICAgICAgICAgY29uc3QgbWF0Y2hlciA9IG5ldyBNaW5pbW9uZ28uTWF0Y2hlcih7cGxhY2Vob2xkZXI6IHZhbHVlU2VsZWN0b3J9KTtcblxuICAgICAgICAgIC8vIFJldHVybiBhbnl0aGluZyBmcm9tICRpbiB0aGF0IG1hdGNoZXMgdGhlIHdob2xlIHNlbGVjdG9yIGZvciB0aGlzXG4gICAgICAgICAgLy8gcGF0aC4gSWYgbm90aGluZyBtYXRjaGVzLCByZXR1cm5zIGB1bmRlZmluZWRgIGFzIG5vdGhpbmcgY2FuIG1ha2VcbiAgICAgICAgICAvLyB0aGlzIHNlbGVjdG9yIGludG8gYHRydWVgLlxuICAgICAgICAgIHJldHVybiB2YWx1ZVNlbGVjdG9yLiRpbi5maW5kKHBsYWNlaG9sZGVyID0+XG4gICAgICAgICAgICBtYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyh7cGxhY2Vob2xkZXJ9KS5yZXN1bHRcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9ubHlDb250YWluc0tleXModmFsdWVTZWxlY3RvciwgWyckZ3QnLCAnJGd0ZScsICckbHQnLCAnJGx0ZSddKSkge1xuICAgICAgICAgIGxldCBsb3dlckJvdW5kID0gLUluZmluaXR5O1xuICAgICAgICAgIGxldCB1cHBlckJvdW5kID0gSW5maW5pdHk7XG5cbiAgICAgICAgICBbJyRsdGUnLCAnJGx0J10uZm9yRWFjaChvcCA9PiB7XG4gICAgICAgICAgICBpZiAoaGFzT3duLmNhbGwodmFsdWVTZWxlY3Rvciwgb3ApICYmXG4gICAgICAgICAgICAgICAgdmFsdWVTZWxlY3RvcltvcF0gPCB1cHBlckJvdW5kKSB7XG4gICAgICAgICAgICAgIHVwcGVyQm91bmQgPSB2YWx1ZVNlbGVjdG9yW29wXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIFsnJGd0ZScsICckZ3QnXS5mb3JFYWNoKG9wID0+IHtcbiAgICAgICAgICAgIGlmIChoYXNPd24uY2FsbCh2YWx1ZVNlbGVjdG9yLCBvcCkgJiZcbiAgICAgICAgICAgICAgICB2YWx1ZVNlbGVjdG9yW29wXSA+IGxvd2VyQm91bmQpIHtcbiAgICAgICAgICAgICAgbG93ZXJCb3VuZCA9IHZhbHVlU2VsZWN0b3Jbb3BdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgY29uc3QgbWlkZGxlID0gKGxvd2VyQm91bmQgKyB1cHBlckJvdW5kKSAvIDI7XG4gICAgICAgICAgY29uc3QgbWF0Y2hlciA9IG5ldyBNaW5pbW9uZ28uTWF0Y2hlcih7cGxhY2Vob2xkZXI6IHZhbHVlU2VsZWN0b3J9KTtcblxuICAgICAgICAgIGlmICghbWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoe3BsYWNlaG9sZGVyOiBtaWRkbGV9KS5yZXN1bHQgJiZcbiAgICAgICAgICAgICAgKG1pZGRsZSA9PT0gbG93ZXJCb3VuZCB8fCBtaWRkbGUgPT09IHVwcGVyQm91bmQpKSB7XG4gICAgICAgICAgICBmYWxsYmFjayA9IHRydWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIG1pZGRsZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvbmx5Q29udGFpbnNLZXlzKHZhbHVlU2VsZWN0b3IsIFsnJG5pbicsICckbmUnXSkpIHtcbiAgICAgICAgICAvLyBTaW5jZSB0aGlzLl9pc1NpbXBsZSBtYWtlcyBzdXJlICRuaW4gYW5kICRuZSBhcmUgbm90IGNvbWJpbmVkIHdpdGhcbiAgICAgICAgICAvLyBvYmplY3RzIG9yIGFycmF5cywgd2UgY2FuIGNvbmZpZGVudGx5IHJldHVybiBhbiBlbXB0eSBvYmplY3QgYXMgaXRcbiAgICAgICAgICAvLyBuZXZlciBtYXRjaGVzIGFueSBzY2FsYXIuXG4gICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgZmFsbGJhY2sgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5fc2VsZWN0b3JbcGF0aF07XG4gICAgfSxcbiAgICB4ID0+IHgpO1xuXG4gIGlmIChmYWxsYmFjaykge1xuICAgIHRoaXMuX21hdGNoaW5nRG9jdW1lbnQgPSBudWxsO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuX21hdGNoaW5nRG9jdW1lbnQ7XG59O1xuXG4vLyBNaW5pbW9uZ28uU29ydGVyIGdldHMgYSBzaW1pbGFyIG1ldGhvZCwgd2hpY2ggZGVsZWdhdGVzIHRvIGEgTWF0Y2hlciBpdCBtYWRlXG4vLyBmb3IgdGhpcyBleGFjdCBwdXJwb3NlLlxuTWluaW1vbmdvLlNvcnRlci5wcm90b3R5cGUuYWZmZWN0ZWRCeU1vZGlmaWVyID0gZnVuY3Rpb24obW9kaWZpZXIpIHtcbiAgcmV0dXJuIHRoaXMuX3NlbGVjdG9yRm9yQWZmZWN0ZWRCeU1vZGlmaWVyLmFmZmVjdGVkQnlNb2RpZmllcihtb2RpZmllcik7XG59O1xuXG5NaW5pbW9uZ28uU29ydGVyLnByb3RvdHlwZS5jb21iaW5lSW50b1Byb2plY3Rpb24gPSBmdW5jdGlvbihwcm9qZWN0aW9uKSB7XG4gIHJldHVybiBjb21iaW5lSW1wb3J0YW50UGF0aHNJbnRvUHJvamVjdGlvbihcbiAgICBNaW5pbW9uZ28uX3BhdGhzRWxpZGluZ051bWVyaWNLZXlzKHRoaXMuX2dldFBhdGhzKCkpLFxuICAgIHByb2plY3Rpb25cbiAgKTtcbn07XG5cbmZ1bmN0aW9uIGNvbWJpbmVJbXBvcnRhbnRQYXRoc0ludG9Qcm9qZWN0aW9uKHBhdGhzLCBwcm9qZWN0aW9uKSB7XG4gIGNvbnN0IGRldGFpbHMgPSBwcm9qZWN0aW9uRGV0YWlscyhwcm9qZWN0aW9uKTtcblxuICAvLyBtZXJnZSB0aGUgcGF0aHMgdG8gaW5jbHVkZVxuICBjb25zdCB0cmVlID0gcGF0aHNUb1RyZWUoXG4gICAgcGF0aHMsXG4gICAgcGF0aCA9PiB0cnVlLFxuICAgIChub2RlLCBwYXRoLCBmdWxsUGF0aCkgPT4gdHJ1ZSxcbiAgICBkZXRhaWxzLnRyZWVcbiAgKTtcbiAgY29uc3QgbWVyZ2VkUHJvamVjdGlvbiA9IHRyZWVUb1BhdGhzKHRyZWUpO1xuXG4gIGlmIChkZXRhaWxzLmluY2x1ZGluZykge1xuICAgIC8vIGJvdGggc2VsZWN0b3IgYW5kIHByb2plY3Rpb24gYXJlIHBvaW50aW5nIG9uIGZpZWxkcyB0byBpbmNsdWRlXG4gICAgLy8gc28gd2UgY2FuIGp1c3QgcmV0dXJuIHRoZSBtZXJnZWQgdHJlZVxuICAgIHJldHVybiBtZXJnZWRQcm9qZWN0aW9uO1xuICB9XG5cbiAgLy8gc2VsZWN0b3IgaXMgcG9pbnRpbmcgYXQgZmllbGRzIHRvIGluY2x1ZGVcbiAgLy8gcHJvamVjdGlvbiBpcyBwb2ludGluZyBhdCBmaWVsZHMgdG8gZXhjbHVkZVxuICAvLyBtYWtlIHN1cmUgd2UgZG9uJ3QgZXhjbHVkZSBpbXBvcnRhbnQgcGF0aHNcbiAgY29uc3QgbWVyZ2VkRXhjbFByb2plY3Rpb24gPSB7fTtcblxuICBPYmplY3Qua2V5cyhtZXJnZWRQcm9qZWN0aW9uKS5mb3JFYWNoKHBhdGggPT4ge1xuICAgIGlmICghbWVyZ2VkUHJvamVjdGlvbltwYXRoXSkge1xuICAgICAgbWVyZ2VkRXhjbFByb2plY3Rpb25bcGF0aF0gPSBmYWxzZTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBtZXJnZWRFeGNsUHJvamVjdGlvbjtcbn1cblxuZnVuY3Rpb24gZ2V0UGF0aHMoc2VsZWN0b3IpIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG5ldyBNaW5pbW9uZ28uTWF0Y2hlcihzZWxlY3RvcikuX3BhdGhzKTtcblxuICAvLyBYWFggcmVtb3ZlIGl0P1xuICAvLyByZXR1cm4gT2JqZWN0LmtleXMoc2VsZWN0b3IpLm1hcChrID0+IHtcbiAgLy8gICAvLyB3ZSBkb24ndCBrbm93IGhvdyB0byBoYW5kbGUgJHdoZXJlIGJlY2F1c2UgaXQgY2FuIGJlIGFueXRoaW5nXG4gIC8vICAgaWYgKGsgPT09ICckd2hlcmUnKSB7XG4gIC8vICAgICByZXR1cm4gJyc7IC8vIG1hdGNoZXMgZXZlcnl0aGluZ1xuICAvLyAgIH1cblxuICAvLyAgIC8vIHdlIGJyYW5jaCBmcm9tICRvci8kYW5kLyRub3Igb3BlcmF0b3JcbiAgLy8gICBpZiAoWyckb3InLCAnJGFuZCcsICckbm9yJ10uaW5jbHVkZXMoaykpIHtcbiAgLy8gICAgIHJldHVybiBzZWxlY3RvcltrXS5tYXAoZ2V0UGF0aHMpO1xuICAvLyAgIH1cblxuICAvLyAgIC8vIHRoZSB2YWx1ZSBpcyBhIGxpdGVyYWwgb3Igc29tZSBjb21wYXJpc29uIG9wZXJhdG9yXG4gIC8vICAgcmV0dXJuIGs7XG4gIC8vIH0pXG4gIC8vICAgLnJlZHVjZSgoYSwgYikgPT4gYS5jb25jYXQoYiksIFtdKVxuICAvLyAgIC5maWx0ZXIoKGEsIGIsIGMpID0+IGMuaW5kZXhPZihhKSA9PT0gYik7XG59XG5cbi8vIEEgaGVscGVyIHRvIGVuc3VyZSBvYmplY3QgaGFzIG9ubHkgY2VydGFpbiBrZXlzXG5mdW5jdGlvbiBvbmx5Q29udGFpbnNLZXlzKG9iaiwga2V5cykge1xuICByZXR1cm4gT2JqZWN0LmtleXMob2JqKS5ldmVyeShrID0+IGtleXMuaW5jbHVkZXMoaykpO1xufVxuXG5mdW5jdGlvbiBwYXRoSGFzTnVtZXJpY0tleXMocGF0aCkge1xuICByZXR1cm4gcGF0aC5zcGxpdCgnLicpLnNvbWUoaXNOdW1lcmljS2V5KTtcbn1cblxuLy8gUmV0dXJucyBhIHNldCBvZiBrZXkgcGF0aHMgc2ltaWxhciB0b1xuLy8geyAnZm9vLmJhcic6IDEsICdhLmIuYyc6IDEgfVxuZnVuY3Rpb24gdHJlZVRvUGF0aHModHJlZSwgcHJlZml4ID0gJycpIHtcbiAgY29uc3QgcmVzdWx0ID0ge307XG5cbiAgT2JqZWN0LmtleXModHJlZSkuZm9yRWFjaChrZXkgPT4ge1xuICAgIGNvbnN0IHZhbHVlID0gdHJlZVtrZXldO1xuICAgIGlmICh2YWx1ZSA9PT0gT2JqZWN0KHZhbHVlKSkge1xuICAgICAgT2JqZWN0LmFzc2lnbihyZXN1bHQsIHRyZWVUb1BhdGhzKHZhbHVlLCBgJHtwcmVmaXggKyBrZXl9LmApKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0W3ByZWZpeCArIGtleV0gPSB2YWx1ZTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiByZXN1bHQ7XG59XG4iLCJpbXBvcnQgTG9jYWxDb2xsZWN0aW9uIGZyb20gJy4vbG9jYWxfY29sbGVjdGlvbi5qcyc7XG5cbmV4cG9ydCBjb25zdCBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG4vLyBFYWNoIGVsZW1lbnQgc2VsZWN0b3IgY29udGFpbnM6XG4vLyAgLSBjb21waWxlRWxlbWVudFNlbGVjdG9yLCBhIGZ1bmN0aW9uIHdpdGggYXJnczpcbi8vICAgIC0gb3BlcmFuZCAtIHRoZSBcInJpZ2h0IGhhbmQgc2lkZVwiIG9mIHRoZSBvcGVyYXRvclxuLy8gICAgLSB2YWx1ZVNlbGVjdG9yIC0gdGhlIFwiY29udGV4dFwiIGZvciB0aGUgb3BlcmF0b3IgKHNvIHRoYXQgJHJlZ2V4IGNhbiBmaW5kXG4vLyAgICAgICRvcHRpb25zKVxuLy8gICAgLSBtYXRjaGVyIC0gdGhlIE1hdGNoZXIgdGhpcyBpcyBnb2luZyBpbnRvIChzbyB0aGF0ICRlbGVtTWF0Y2ggY2FuIGNvbXBpbGVcbi8vICAgICAgbW9yZSB0aGluZ3MpXG4vLyAgICByZXR1cm5pbmcgYSBmdW5jdGlvbiBtYXBwaW5nIGEgc2luZ2xlIHZhbHVlIHRvIGJvb2wuXG4vLyAgLSBkb250RXhwYW5kTGVhZkFycmF5cywgYSBib29sIHdoaWNoIHByZXZlbnRzIGV4cGFuZEFycmF5c0luQnJhbmNoZXMgZnJvbVxuLy8gICAgYmVpbmcgY2FsbGVkXG4vLyAgLSBkb250SW5jbHVkZUxlYWZBcnJheXMsIGEgYm9vbCB3aGljaCBjYXVzZXMgYW4gYXJndW1lbnQgdG8gYmUgcGFzc2VkIHRvXG4vLyAgICBleHBhbmRBcnJheXNJbkJyYW5jaGVzIGlmIGl0IGlzIGNhbGxlZFxuZXhwb3J0IGNvbnN0IEVMRU1FTlRfT1BFUkFUT1JTID0ge1xuICAkbHQ6IG1ha2VJbmVxdWFsaXR5KGNtcFZhbHVlID0+IGNtcFZhbHVlIDwgMCksXG4gICRndDogbWFrZUluZXF1YWxpdHkoY21wVmFsdWUgPT4gY21wVmFsdWUgPiAwKSxcbiAgJGx0ZTogbWFrZUluZXF1YWxpdHkoY21wVmFsdWUgPT4gY21wVmFsdWUgPD0gMCksXG4gICRndGU6IG1ha2VJbmVxdWFsaXR5KGNtcFZhbHVlID0+IGNtcFZhbHVlID49IDApLFxuICAkbW9kOiB7XG4gICAgY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kKSB7XG4gICAgICBpZiAoIShBcnJheS5pc0FycmF5KG9wZXJhbmQpICYmIG9wZXJhbmQubGVuZ3RoID09PSAyXG4gICAgICAgICAgICAmJiB0eXBlb2Ygb3BlcmFuZFswXSA9PT0gJ251bWJlcidcbiAgICAgICAgICAgICYmIHR5cGVvZiBvcGVyYW5kWzFdID09PSAnbnVtYmVyJykpIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoJ2FyZ3VtZW50IHRvICRtb2QgbXVzdCBiZSBhbiBhcnJheSBvZiB0d28gbnVtYmVycycpO1xuICAgICAgfVxuXG4gICAgICAvLyBYWFggY291bGQgcmVxdWlyZSB0byBiZSBpbnRzIG9yIHJvdW5kIG9yIHNvbWV0aGluZ1xuICAgICAgY29uc3QgZGl2aXNvciA9IG9wZXJhbmRbMF07XG4gICAgICBjb25zdCByZW1haW5kZXIgPSBvcGVyYW5kWzFdO1xuICAgICAgcmV0dXJuIHZhbHVlID0+IChcbiAgICAgICAgdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyAmJiB2YWx1ZSAlIGRpdmlzb3IgPT09IHJlbWFpbmRlclxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuICAkaW46IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShvcGVyYW5kKSkge1xuICAgICAgICB0aHJvdyBFcnJvcignJGluIG5lZWRzIGFuIGFycmF5Jyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGVsZW1lbnRNYXRjaGVycyA9IG9wZXJhbmQubWFwKG9wdGlvbiA9PiB7XG4gICAgICAgIGlmIChvcHRpb24gaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgICByZXR1cm4gcmVnZXhwRWxlbWVudE1hdGNoZXIob3B0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc09wZXJhdG9yT2JqZWN0KG9wdGlvbikpIHtcbiAgICAgICAgICB0aHJvdyBFcnJvcignY2Fubm90IG5lc3QgJCB1bmRlciAkaW4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlcXVhbGl0eUVsZW1lbnRNYXRjaGVyKG9wdGlvbik7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHZhbHVlID0+IHtcbiAgICAgICAgLy8gQWxsb3cge2E6IHskaW46IFtudWxsXX19IHRvIG1hdGNoIHdoZW4gJ2EnIGRvZXMgbm90IGV4aXN0LlxuICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHZhbHVlID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlbGVtZW50TWF0Y2hlcnMuc29tZShtYXRjaGVyID0+IG1hdGNoZXIodmFsdWUpKTtcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcbiAgJHNpemU6IHtcbiAgICAvLyB7YTogW1s1LCA1XV19IG11c3QgbWF0Y2gge2E6IHskc2l6ZTogMX19IGJ1dCBub3Qge2E6IHskc2l6ZTogMn19LCBzbyB3ZVxuICAgIC8vIGRvbid0IHdhbnQgdG8gY29uc2lkZXIgdGhlIGVsZW1lbnQgWzUsNV0gaW4gdGhlIGxlYWYgYXJyYXkgW1s1LDVdXSBhcyBhXG4gICAgLy8gcG9zc2libGUgdmFsdWUuXG4gICAgZG9udEV4cGFuZExlYWZBcnJheXM6IHRydWUsXG4gICAgY29tcGlsZUVsZW1lbnRTZWxlY3RvcihvcGVyYW5kKSB7XG4gICAgICBpZiAodHlwZW9mIG9wZXJhbmQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIC8vIERvbid0IGFzayBtZSB3aHksIGJ1dCBieSBleHBlcmltZW50YXRpb24sIHRoaXMgc2VlbXMgdG8gYmUgd2hhdCBNb25nb1xuICAgICAgICAvLyBkb2VzLlxuICAgICAgICBvcGVyYW5kID0gMDtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG9wZXJhbmQgIT09ICdudW1iZXInKSB7XG4gICAgICAgIHRocm93IEVycm9yKCckc2l6ZSBuZWVkcyBhIG51bWJlcicpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdmFsdWUgPT4gQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSBvcGVyYW5kO1xuICAgIH0sXG4gIH0sXG4gICR0eXBlOiB7XG4gICAgLy8ge2E6IFs1XX0gbXVzdCBub3QgbWF0Y2gge2E6IHskdHlwZTogNH19ICg0IG1lYW5zIGFycmF5KSwgYnV0IGl0IHNob3VsZFxuICAgIC8vIG1hdGNoIHthOiB7JHR5cGU6IDF9fSAoMSBtZWFucyBudW1iZXIpLCBhbmQge2E6IFtbNV1dfSBtdXN0IG1hdGNoIHskYTpcbiAgICAvLyB7JHR5cGU6IDR9fS4gVGh1cywgd2hlbiB3ZSBzZWUgYSBsZWFmIGFycmF5LCB3ZSAqc2hvdWxkKiBleHBhbmQgaXQgYnV0XG4gICAgLy8gc2hvdWxkICpub3QqIGluY2x1ZGUgaXQgaXRzZWxmLlxuICAgIGRvbnRJbmNsdWRlTGVhZkFycmF5czogdHJ1ZSxcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGlmICh0eXBlb2Ygb3BlcmFuZCAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoJyR0eXBlIG5lZWRzIGEgbnVtYmVyJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB2YWx1ZSA9PiAoXG4gICAgICAgIHZhbHVlICE9PSB1bmRlZmluZWQgJiYgTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlKHZhbHVlKSA9PT0gb3BlcmFuZFxuICAgICAgKTtcbiAgICB9LFxuICB9LFxuICAkYml0c0FsbFNldDoge1xuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCkge1xuICAgICAgY29uc3QgbWFzayA9IGdldE9wZXJhbmRCaXRtYXNrKG9wZXJhbmQsICckYml0c0FsbFNldCcpO1xuICAgICAgcmV0dXJuIHZhbHVlID0+IHtcbiAgICAgICAgY29uc3QgYml0bWFzayA9IGdldFZhbHVlQml0bWFzayh2YWx1ZSwgbWFzay5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gYml0bWFzayAmJiBtYXNrLmV2ZXJ5KChieXRlLCBpKSA9PiAoYml0bWFza1tpXSAmIGJ5dGUpID09PSBieXRlKTtcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcbiAgJGJpdHNBbnlTZXQ6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGNvbnN0IG1hc2sgPSBnZXRPcGVyYW5kQml0bWFzayhvcGVyYW5kLCAnJGJpdHNBbnlTZXQnKTtcbiAgICAgIHJldHVybiB2YWx1ZSA9PiB7XG4gICAgICAgIGNvbnN0IGJpdG1hc2sgPSBnZXRWYWx1ZUJpdG1hc2sodmFsdWUsIG1hc2subGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIGJpdG1hc2sgJiYgbWFzay5zb21lKChieXRlLCBpKSA9PiAofmJpdG1hc2tbaV0gJiBieXRlKSAhPT0gYnl0ZSk7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG4gICRiaXRzQWxsQ2xlYXI6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGNvbnN0IG1hc2sgPSBnZXRPcGVyYW5kQml0bWFzayhvcGVyYW5kLCAnJGJpdHNBbGxDbGVhcicpO1xuICAgICAgcmV0dXJuIHZhbHVlID0+IHtcbiAgICAgICAgY29uc3QgYml0bWFzayA9IGdldFZhbHVlQml0bWFzayh2YWx1ZSwgbWFzay5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gYml0bWFzayAmJiBtYXNrLmV2ZXJ5KChieXRlLCBpKSA9PiAhKGJpdG1hc2tbaV0gJiBieXRlKSk7XG4gICAgICB9O1xuICAgIH0sXG4gIH0sXG4gICRiaXRzQW55Q2xlYXI6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpIHtcbiAgICAgIGNvbnN0IG1hc2sgPSBnZXRPcGVyYW5kQml0bWFzayhvcGVyYW5kLCAnJGJpdHNBbnlDbGVhcicpO1xuICAgICAgcmV0dXJuIHZhbHVlID0+IHtcbiAgICAgICAgY29uc3QgYml0bWFzayA9IGdldFZhbHVlQml0bWFzayh2YWx1ZSwgbWFzay5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gYml0bWFzayAmJiBtYXNrLnNvbWUoKGJ5dGUsIGkpID0+IChiaXRtYXNrW2ldICYgYnl0ZSkgIT09IGJ5dGUpO1xuICAgICAgfTtcbiAgICB9LFxuICB9LFxuICAkcmVnZXg6IHtcbiAgICBjb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQsIHZhbHVlU2VsZWN0b3IpIHtcbiAgICAgIGlmICghKHR5cGVvZiBvcGVyYW5kID09PSAnc3RyaW5nJyB8fCBvcGVyYW5kIGluc3RhbmNlb2YgUmVnRXhwKSkge1xuICAgICAgICB0aHJvdyBFcnJvcignJHJlZ2V4IGhhcyB0byBiZSBhIHN0cmluZyBvciBSZWdFeHAnKTtcbiAgICAgIH1cblxuICAgICAgbGV0IHJlZ2V4cDtcbiAgICAgIGlmICh2YWx1ZVNlbGVjdG9yLiRvcHRpb25zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gT3B0aW9ucyBwYXNzZWQgaW4gJG9wdGlvbnMgKGV2ZW4gdGhlIGVtcHR5IHN0cmluZykgYWx3YXlzIG92ZXJyaWRlc1xuICAgICAgICAvLyBvcHRpb25zIGluIHRoZSBSZWdFeHAgb2JqZWN0IGl0c2VsZi5cblxuICAgICAgICAvLyBCZSBjbGVhciB0aGF0IHdlIG9ubHkgc3VwcG9ydCB0aGUgSlMtc3VwcG9ydGVkIG9wdGlvbnMsIG5vdCBleHRlbmRlZFxuICAgICAgICAvLyBvbmVzIChlZywgTW9uZ28gc3VwcG9ydHMgeCBhbmQgcykuIElkZWFsbHkgd2Ugd291bGQgaW1wbGVtZW50IHggYW5kIHNcbiAgICAgICAgLy8gYnkgdHJhbnNmb3JtaW5nIHRoZSByZWdleHAsIGJ1dCBub3QgdG9kYXkuLi5cbiAgICAgICAgaWYgKC9bXmdpbV0vLnRlc3QodmFsdWVTZWxlY3Rvci4kb3B0aW9ucykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ09ubHkgdGhlIGksIG0sIGFuZCBnIHJlZ2V4cCBvcHRpb25zIGFyZSBzdXBwb3J0ZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IG9wZXJhbmQgaW5zdGFuY2VvZiBSZWdFeHAgPyBvcGVyYW5kLnNvdXJjZSA6IG9wZXJhbmQ7XG4gICAgICAgIHJlZ2V4cCA9IG5ldyBSZWdFeHAoc291cmNlLCB2YWx1ZVNlbGVjdG9yLiRvcHRpb25zKTtcbiAgICAgIH0gZWxzZSBpZiAob3BlcmFuZCBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICByZWdleHAgPSBvcGVyYW5kO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVnZXhwID0gbmV3IFJlZ0V4cChvcGVyYW5kKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlZ2V4cEVsZW1lbnRNYXRjaGVyKHJlZ2V4cCk7XG4gICAgfSxcbiAgfSxcbiAgJGVsZW1NYXRjaDoge1xuICAgIGRvbnRFeHBhbmRMZWFmQXJyYXlzOiB0cnVlLFxuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCwgdmFsdWVTZWxlY3RvciwgbWF0Y2hlcikge1xuICAgICAgaWYgKCFMb2NhbENvbGxlY3Rpb24uX2lzUGxhaW5PYmplY3Qob3BlcmFuZCkpIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoJyRlbGVtTWF0Y2ggbmVlZCBhbiBvYmplY3QnKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaXNEb2NNYXRjaGVyID0gIWlzT3BlcmF0b3JPYmplY3QoXG4gICAgICAgIE9iamVjdC5rZXlzKG9wZXJhbmQpXG4gICAgICAgICAgLmZpbHRlcihrZXkgPT4gIWhhc093bi5jYWxsKExPR0lDQUxfT1BFUkFUT1JTLCBrZXkpKVxuICAgICAgICAgIC5yZWR1Y2UoKGEsIGIpID0+IE9iamVjdC5hc3NpZ24oYSwge1tiXTogb3BlcmFuZFtiXX0pLCB7fSksXG4gICAgICAgIHRydWUpO1xuXG4gICAgICBsZXQgc3ViTWF0Y2hlcjtcbiAgICAgIGlmIChpc0RvY01hdGNoZXIpIHtcbiAgICAgICAgLy8gVGhpcyBpcyBOT1QgdGhlIHNhbWUgYXMgY29tcGlsZVZhbHVlU2VsZWN0b3Iob3BlcmFuZCksIGFuZCBub3QganVzdFxuICAgICAgICAvLyBiZWNhdXNlIG9mIHRoZSBzbGlnaHRseSBkaWZmZXJlbnQgY2FsbGluZyBjb252ZW50aW9uLlxuICAgICAgICAvLyB7JGVsZW1NYXRjaDoge3g6IDN9fSBtZWFucyBcImFuIGVsZW1lbnQgaGFzIGEgZmllbGQgeDozXCIsIG5vdFxuICAgICAgICAvLyBcImNvbnNpc3RzIG9ubHkgb2YgYSBmaWVsZCB4OjNcIi4gQWxzbywgcmVnZXhwcyBhbmQgc3ViLSQgYXJlIGFsbG93ZWQuXG4gICAgICAgIHN1Yk1hdGNoZXIgPVxuICAgICAgICAgIGNvbXBpbGVEb2N1bWVudFNlbGVjdG9yKG9wZXJhbmQsIG1hdGNoZXIsIHtpbkVsZW1NYXRjaDogdHJ1ZX0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3ViTWF0Y2hlciA9IGNvbXBpbGVWYWx1ZVNlbGVjdG9yKG9wZXJhbmQsIG1hdGNoZXIpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdmFsdWUgPT4ge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7ICsraSkge1xuICAgICAgICAgIGNvbnN0IGFycmF5RWxlbWVudCA9IHZhbHVlW2ldO1xuICAgICAgICAgIGxldCBhcmc7XG4gICAgICAgICAgaWYgKGlzRG9jTWF0Y2hlcikge1xuICAgICAgICAgICAgLy8gV2UgY2FuIG9ubHkgbWF0Y2ggeyRlbGVtTWF0Y2g6IHtiOiAzfX0gYWdhaW5zdCBvYmplY3RzLlxuICAgICAgICAgICAgLy8gKFdlIGNhbiBhbHNvIG1hdGNoIGFnYWluc3QgYXJyYXlzLCBpZiB0aGVyZSdzIG51bWVyaWMgaW5kaWNlcyxcbiAgICAgICAgICAgIC8vIGVnIHskZWxlbU1hdGNoOiB7JzAuYic6IDN9fSBvciB7JGVsZW1NYXRjaDogezA6IDN9fS4pXG4gICAgICAgICAgICBpZiAoIWlzSW5kZXhhYmxlKGFycmF5RWxlbWVudCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhcmcgPSBhcnJheUVsZW1lbnQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGRvbnRJdGVyYXRlIGVuc3VyZXMgdGhhdCB7YTogeyRlbGVtTWF0Y2g6IHskZ3Q6IDV9fX0gbWF0Y2hlc1xuICAgICAgICAgICAgLy8ge2E6IFs4XX0gYnV0IG5vdCB7YTogW1s4XV19XG4gICAgICAgICAgICBhcmcgPSBbe3ZhbHVlOiBhcnJheUVsZW1lbnQsIGRvbnRJdGVyYXRlOiB0cnVlfV07XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFhYWCBzdXBwb3J0ICRuZWFyIGluICRlbGVtTWF0Y2ggYnkgcHJvcGFnYXRpbmcgJGRpc3RhbmNlP1xuICAgICAgICAgIGlmIChzdWJNYXRjaGVyKGFyZykucmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gaTsgLy8gc3BlY2lhbGx5IHVuZGVyc3Rvb2QgdG8gbWVhbiBcInVzZSBhcyBhcnJheUluZGljZXNcIlxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcbn07XG5cbi8vIE9wZXJhdG9ycyB0aGF0IGFwcGVhciBhdCB0aGUgdG9wIGxldmVsIG9mIGEgZG9jdW1lbnQgc2VsZWN0b3IuXG5jb25zdCBMT0dJQ0FMX09QRVJBVE9SUyA9IHtcbiAgJGFuZChzdWJTZWxlY3RvciwgbWF0Y2hlciwgaW5FbGVtTWF0Y2gpIHtcbiAgICByZXR1cm4gYW5kRG9jdW1lbnRNYXRjaGVycyhcbiAgICAgIGNvbXBpbGVBcnJheU9mRG9jdW1lbnRTZWxlY3RvcnMoc3ViU2VsZWN0b3IsIG1hdGNoZXIsIGluRWxlbU1hdGNoKVxuICAgICk7XG4gIH0sXG5cbiAgJG9yKHN1YlNlbGVjdG9yLCBtYXRjaGVyLCBpbkVsZW1NYXRjaCkge1xuICAgIGNvbnN0IG1hdGNoZXJzID0gY29tcGlsZUFycmF5T2ZEb2N1bWVudFNlbGVjdG9ycyhcbiAgICAgIHN1YlNlbGVjdG9yLFxuICAgICAgbWF0Y2hlcixcbiAgICAgIGluRWxlbU1hdGNoXG4gICAgKTtcblxuICAgIC8vIFNwZWNpYWwgY2FzZTogaWYgdGhlcmUgaXMgb25seSBvbmUgbWF0Y2hlciwgdXNlIGl0IGRpcmVjdGx5LCAqcHJlc2VydmluZypcbiAgICAvLyBhbnkgYXJyYXlJbmRpY2VzIGl0IHJldHVybnMuXG4gICAgaWYgKG1hdGNoZXJzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgcmV0dXJuIG1hdGNoZXJzWzBdO1xuICAgIH1cblxuICAgIHJldHVybiBkb2MgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gbWF0Y2hlcnMuc29tZShmbiA9PiBmbihkb2MpLnJlc3VsdCk7XG4gICAgICAvLyAkb3IgZG9lcyBOT1Qgc2V0IGFycmF5SW5kaWNlcyB3aGVuIGl0IGhhcyBtdWx0aXBsZVxuICAgICAgLy8gc3ViLWV4cHJlc3Npb25zLiAoVGVzdGVkIGFnYWluc3QgTW9uZ29EQi4pXG4gICAgICByZXR1cm4ge3Jlc3VsdH07XG4gICAgfTtcbiAgfSxcblxuICAkbm9yKHN1YlNlbGVjdG9yLCBtYXRjaGVyLCBpbkVsZW1NYXRjaCkge1xuICAgIGNvbnN0IG1hdGNoZXJzID0gY29tcGlsZUFycmF5T2ZEb2N1bWVudFNlbGVjdG9ycyhcbiAgICAgIHN1YlNlbGVjdG9yLFxuICAgICAgbWF0Y2hlcixcbiAgICAgIGluRWxlbU1hdGNoXG4gICAgKTtcbiAgICByZXR1cm4gZG9jID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IG1hdGNoZXJzLmV2ZXJ5KGZuID0+ICFmbihkb2MpLnJlc3VsdCk7XG4gICAgICAvLyBOZXZlciBzZXQgYXJyYXlJbmRpY2VzLCBiZWNhdXNlIHdlIG9ubHkgbWF0Y2ggaWYgbm90aGluZyBpbiBwYXJ0aWN1bGFyXG4gICAgICAvLyAnbWF0Y2hlZCcgKGFuZCBiZWNhdXNlIHRoaXMgaXMgY29uc2lzdGVudCB3aXRoIE1vbmdvREIpLlxuICAgICAgcmV0dXJuIHtyZXN1bHR9O1xuICAgIH07XG4gIH0sXG5cbiAgJHdoZXJlKHNlbGVjdG9yVmFsdWUsIG1hdGNoZXIpIHtcbiAgICAvLyBSZWNvcmQgdGhhdCAqYW55KiBwYXRoIG1heSBiZSB1c2VkLlxuICAgIG1hdGNoZXIuX3JlY29yZFBhdGhVc2VkKCcnKTtcbiAgICBtYXRjaGVyLl9oYXNXaGVyZSA9IHRydWU7XG5cbiAgICBpZiAoIShzZWxlY3RvclZhbHVlIGluc3RhbmNlb2YgRnVuY3Rpb24pKSB7XG4gICAgICAvLyBYWFggTW9uZ29EQiBzZWVtcyB0byBoYXZlIG1vcmUgY29tcGxleCBsb2dpYyB0byBkZWNpZGUgd2hlcmUgb3Igb3Igbm90XG4gICAgICAvLyB0byBhZGQgJ3JldHVybic7IG5vdCBzdXJlIGV4YWN0bHkgd2hhdCBpdCBpcy5cbiAgICAgIHNlbGVjdG9yVmFsdWUgPSBGdW5jdGlvbignb2JqJywgYHJldHVybiAke3NlbGVjdG9yVmFsdWV9YCk7XG4gICAgfVxuXG4gICAgLy8gV2UgbWFrZSB0aGUgZG9jdW1lbnQgYXZhaWxhYmxlIGFzIGJvdGggYHRoaXNgIGFuZCBgb2JqYC5cbiAgICAvLyAvLyBYWFggbm90IHN1cmUgd2hhdCB3ZSBzaG91bGQgZG8gaWYgdGhpcyB0aHJvd3NcbiAgICByZXR1cm4gZG9jID0+ICh7cmVzdWx0OiBzZWxlY3RvclZhbHVlLmNhbGwoZG9jLCBkb2MpfSk7XG4gIH0sXG5cbiAgLy8gVGhpcyBpcyBqdXN0IHVzZWQgYXMgYSBjb21tZW50IGluIHRoZSBxdWVyeSAoaW4gTW9uZ29EQiwgaXQgYWxzbyBlbmRzIHVwIGluXG4gIC8vIHF1ZXJ5IGxvZ3MpOyBpdCBoYXMgbm8gZWZmZWN0IG9uIHRoZSBhY3R1YWwgc2VsZWN0aW9uLlxuICAkY29tbWVudCgpIHtcbiAgICByZXR1cm4gKCkgPT4gKHtyZXN1bHQ6IHRydWV9KTtcbiAgfSxcbn07XG5cbi8vIE9wZXJhdG9ycyB0aGF0ICh1bmxpa2UgTE9HSUNBTF9PUEVSQVRPUlMpIHBlcnRhaW4gdG8gaW5kaXZpZHVhbCBwYXRocyBpbiBhXG4vLyBkb2N1bWVudCwgYnV0ICh1bmxpa2UgRUxFTUVOVF9PUEVSQVRPUlMpIGRvIG5vdCBoYXZlIGEgc2ltcGxlIGRlZmluaXRpb24gYXNcbi8vIFwibWF0Y2ggZWFjaCBicmFuY2hlZCB2YWx1ZSBpbmRlcGVuZGVudGx5IGFuZCBjb21iaW5lIHdpdGhcbi8vIGNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyXCIuXG5jb25zdCBWQUxVRV9PUEVSQVRPUlMgPSB7XG4gICRlcShvcGVyYW5kKSB7XG4gICAgcmV0dXJuIGNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyKFxuICAgICAgZXF1YWxpdHlFbGVtZW50TWF0Y2hlcihvcGVyYW5kKVxuICAgICk7XG4gIH0sXG4gICRub3Qob3BlcmFuZCwgdmFsdWVTZWxlY3RvciwgbWF0Y2hlcikge1xuICAgIHJldHVybiBpbnZlcnRCcmFuY2hlZE1hdGNoZXIoY29tcGlsZVZhbHVlU2VsZWN0b3Iob3BlcmFuZCwgbWF0Y2hlcikpO1xuICB9LFxuICAkbmUob3BlcmFuZCkge1xuICAgIHJldHVybiBpbnZlcnRCcmFuY2hlZE1hdGNoZXIoXG4gICAgICBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihlcXVhbGl0eUVsZW1lbnRNYXRjaGVyKG9wZXJhbmQpKVxuICAgICk7XG4gIH0sXG4gICRuaW4ob3BlcmFuZCkge1xuICAgIHJldHVybiBpbnZlcnRCcmFuY2hlZE1hdGNoZXIoXG4gICAgICBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihcbiAgICAgICAgRUxFTUVOVF9PUEVSQVRPUlMuJGluLmNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZClcbiAgICAgIClcbiAgICApO1xuICB9LFxuICAkZXhpc3RzKG9wZXJhbmQpIHtcbiAgICBjb25zdCBleGlzdHMgPSBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihcbiAgICAgIHZhbHVlID0+IHZhbHVlICE9PSB1bmRlZmluZWRcbiAgICApO1xuICAgIHJldHVybiBvcGVyYW5kID8gZXhpc3RzIDogaW52ZXJ0QnJhbmNoZWRNYXRjaGVyKGV4aXN0cyk7XG4gIH0sXG4gIC8vICRvcHRpb25zIGp1c3QgcHJvdmlkZXMgb3B0aW9ucyBmb3IgJHJlZ2V4OyBpdHMgbG9naWMgaXMgaW5zaWRlICRyZWdleFxuICAkb3B0aW9ucyhvcGVyYW5kLCB2YWx1ZVNlbGVjdG9yKSB7XG4gICAgaWYgKCFoYXNPd24uY2FsbCh2YWx1ZVNlbGVjdG9yLCAnJHJlZ2V4JykpIHtcbiAgICAgIHRocm93IEVycm9yKCckb3B0aW9ucyBuZWVkcyBhICRyZWdleCcpO1xuICAgIH1cblxuICAgIHJldHVybiBldmVyeXRoaW5nTWF0Y2hlcjtcbiAgfSxcbiAgLy8gJG1heERpc3RhbmNlIGlzIGJhc2ljYWxseSBhbiBhcmd1bWVudCB0byAkbmVhclxuICAkbWF4RGlzdGFuY2Uob3BlcmFuZCwgdmFsdWVTZWxlY3Rvcikge1xuICAgIGlmICghdmFsdWVTZWxlY3Rvci4kbmVhcikge1xuICAgICAgdGhyb3cgRXJyb3IoJyRtYXhEaXN0YW5jZSBuZWVkcyBhICRuZWFyJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGV2ZXJ5dGhpbmdNYXRjaGVyO1xuICB9LFxuICAkYWxsKG9wZXJhbmQsIHZhbHVlU2VsZWN0b3IsIG1hdGNoZXIpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkob3BlcmFuZCkpIHtcbiAgICAgIHRocm93IEVycm9yKCckYWxsIHJlcXVpcmVzIGFycmF5Jyk7XG4gICAgfVxuXG4gICAgLy8gTm90IHN1cmUgd2h5LCBidXQgdGhpcyBzZWVtcyB0byBiZSB3aGF0IE1vbmdvREIgZG9lcy5cbiAgICBpZiAob3BlcmFuZC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBub3RoaW5nTWF0Y2hlcjtcbiAgICB9XG5cbiAgICBjb25zdCBicmFuY2hlZE1hdGNoZXJzID0gb3BlcmFuZC5tYXAoY3JpdGVyaW9uID0+IHtcbiAgICAgIC8vIFhYWCBoYW5kbGUgJGFsbC8kZWxlbU1hdGNoIGNvbWJpbmF0aW9uXG4gICAgICBpZiAoaXNPcGVyYXRvck9iamVjdChjcml0ZXJpb24pKSB7XG4gICAgICAgIHRocm93IEVycm9yKCdubyAkIGV4cHJlc3Npb25zIGluICRhbGwnKTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhpcyBpcyBhbHdheXMgYSByZWdleHAgb3IgZXF1YWxpdHkgc2VsZWN0b3IuXG4gICAgICByZXR1cm4gY29tcGlsZVZhbHVlU2VsZWN0b3IoY3JpdGVyaW9uLCBtYXRjaGVyKTtcbiAgICB9KTtcblxuICAgIC8vIGFuZEJyYW5jaGVkTWF0Y2hlcnMgZG9lcyBOT1QgcmVxdWlyZSBhbGwgc2VsZWN0b3JzIHRvIHJldHVybiB0cnVlIG9uIHRoZVxuICAgIC8vIFNBTUUgYnJhbmNoLlxuICAgIHJldHVybiBhbmRCcmFuY2hlZE1hdGNoZXJzKGJyYW5jaGVkTWF0Y2hlcnMpO1xuICB9LFxuICAkbmVhcihvcGVyYW5kLCB2YWx1ZVNlbGVjdG9yLCBtYXRjaGVyLCBpc1Jvb3QpIHtcbiAgICBpZiAoIWlzUm9vdCkge1xuICAgICAgdGhyb3cgRXJyb3IoJyRuZWFyIGNhblxcJ3QgYmUgaW5zaWRlIGFub3RoZXIgJCBvcGVyYXRvcicpO1xuICAgIH1cblxuICAgIG1hdGNoZXIuX2hhc0dlb1F1ZXJ5ID0gdHJ1ZTtcblxuICAgIC8vIFRoZXJlIGFyZSB0d28ga2luZHMgb2YgZ2VvZGF0YSBpbiBNb25nb0RCOiBsZWdhY3kgY29vcmRpbmF0ZSBwYWlycyBhbmRcbiAgICAvLyBHZW9KU09OLiBUaGV5IHVzZSBkaWZmZXJlbnQgZGlzdGFuY2UgbWV0cmljcywgdG9vLiBHZW9KU09OIHF1ZXJpZXMgYXJlXG4gICAgLy8gbWFya2VkIHdpdGggYSAkZ2VvbWV0cnkgcHJvcGVydHksIHRob3VnaCBsZWdhY3kgY29vcmRpbmF0ZXMgY2FuIGJlXG4gICAgLy8gbWF0Y2hlZCB1c2luZyAkZ2VvbWV0cnkuXG4gICAgbGV0IG1heERpc3RhbmNlLCBwb2ludCwgZGlzdGFuY2U7XG4gICAgaWYgKExvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChvcGVyYW5kKSAmJiBoYXNPd24uY2FsbChvcGVyYW5kLCAnJGdlb21ldHJ5JykpIHtcbiAgICAgIC8vIEdlb0pTT04gXCIyZHNwaGVyZVwiIG1vZGUuXG4gICAgICBtYXhEaXN0YW5jZSA9IG9wZXJhbmQuJG1heERpc3RhbmNlO1xuICAgICAgcG9pbnQgPSBvcGVyYW5kLiRnZW9tZXRyeTtcbiAgICAgIGRpc3RhbmNlID0gdmFsdWUgPT4ge1xuICAgICAgICAvLyBYWFg6IGZvciBub3csIHdlIGRvbid0IGNhbGN1bGF0ZSB0aGUgYWN0dWFsIGRpc3RhbmNlIGJldHdlZW4sIHNheSxcbiAgICAgICAgLy8gcG9seWdvbiBhbmQgY2lyY2xlLiBJZiBwZW9wbGUgY2FyZSBhYm91dCB0aGlzIHVzZS1jYXNlIGl0IHdpbGwgZ2V0XG4gICAgICAgIC8vIGEgcHJpb3JpdHkuXG4gICAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdmFsdWUudHlwZSkge1xuICAgICAgICAgIHJldHVybiBHZW9KU09OLnBvaW50RGlzdGFuY2UoXG4gICAgICAgICAgICBwb2ludCxcbiAgICAgICAgICAgIHt0eXBlOiAnUG9pbnQnLCBjb29yZGluYXRlczogcG9pbnRUb0FycmF5KHZhbHVlKX1cbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZhbHVlLnR5cGUgPT09ICdQb2ludCcpIHtcbiAgICAgICAgICByZXR1cm4gR2VvSlNPTi5wb2ludERpc3RhbmNlKHBvaW50LCB2YWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gR2VvSlNPTi5nZW9tZXRyeVdpdGhpblJhZGl1cyh2YWx1ZSwgcG9pbnQsIG1heERpc3RhbmNlKVxuICAgICAgICAgID8gMFxuICAgICAgICAgIDogbWF4RGlzdGFuY2UgKyAxO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWF4RGlzdGFuY2UgPSB2YWx1ZVNlbGVjdG9yLiRtYXhEaXN0YW5jZTtcblxuICAgICAgaWYgKCFpc0luZGV4YWJsZShvcGVyYW5kKSkge1xuICAgICAgICB0aHJvdyBFcnJvcignJG5lYXIgYXJndW1lbnQgbXVzdCBiZSBjb29yZGluYXRlIHBhaXIgb3IgR2VvSlNPTicpO1xuICAgICAgfVxuXG4gICAgICBwb2ludCA9IHBvaW50VG9BcnJheShvcGVyYW5kKTtcblxuICAgICAgZGlzdGFuY2UgPSB2YWx1ZSA9PiB7XG4gICAgICAgIGlmICghaXNJbmRleGFibGUodmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZGlzdGFuY2VDb29yZGluYXRlUGFpcnMocG9pbnQsIHZhbHVlKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGJyYW5jaGVkVmFsdWVzID0+IHtcbiAgICAgIC8vIFRoZXJlIG1pZ2h0IGJlIG11bHRpcGxlIHBvaW50cyBpbiB0aGUgZG9jdW1lbnQgdGhhdCBtYXRjaCB0aGUgZ2l2ZW5cbiAgICAgIC8vIGZpZWxkLiBPbmx5IG9uZSBvZiB0aGVtIG5lZWRzIHRvIGJlIHdpdGhpbiAkbWF4RGlzdGFuY2UsIGJ1dCB3ZSBuZWVkIHRvXG4gICAgICAvLyBldmFsdWF0ZSBhbGwgb2YgdGhlbSBhbmQgdXNlIHRoZSBuZWFyZXN0IG9uZSBmb3IgdGhlIGltcGxpY2l0IHNvcnRcbiAgICAgIC8vIHNwZWNpZmllci4gKFRoYXQncyB3aHkgd2UgY2FuJ3QganVzdCB1c2UgRUxFTUVOVF9PUEVSQVRPUlMgaGVyZS4pXG4gICAgICAvL1xuICAgICAgLy8gTm90ZTogVGhpcyBkaWZmZXJzIGZyb20gTW9uZ29EQidzIGltcGxlbWVudGF0aW9uLCB3aGVyZSBhIGRvY3VtZW50IHdpbGxcbiAgICAgIC8vIGFjdHVhbGx5IHNob3cgdXAgKm11bHRpcGxlIHRpbWVzKiBpbiB0aGUgcmVzdWx0IHNldCwgd2l0aCBvbmUgZW50cnkgZm9yXG4gICAgICAvLyBlYWNoIHdpdGhpbi0kbWF4RGlzdGFuY2UgYnJhbmNoaW5nIHBvaW50LlxuICAgICAgY29uc3QgcmVzdWx0ID0ge3Jlc3VsdDogZmFsc2V9O1xuICAgICAgZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyhicmFuY2hlZFZhbHVlcykuZXZlcnkoYnJhbmNoID0+IHtcbiAgICAgICAgLy8gaWYgb3BlcmF0aW9uIGlzIGFuIHVwZGF0ZSwgZG9uJ3Qgc2tpcCBicmFuY2hlcywganVzdCByZXR1cm4gdGhlIGZpcnN0XG4gICAgICAgIC8vIG9uZSAoIzM1OTkpXG4gICAgICAgIGxldCBjdXJEaXN0YW5jZTtcbiAgICAgICAgaWYgKCFtYXRjaGVyLl9pc1VwZGF0ZSkge1xuICAgICAgICAgIGlmICghKHR5cGVvZiBicmFuY2gudmFsdWUgPT09ICdvYmplY3QnKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY3VyRGlzdGFuY2UgPSBkaXN0YW5jZShicmFuY2gudmFsdWUpO1xuXG4gICAgICAgICAgLy8gU2tpcCBicmFuY2hlcyB0aGF0IGFyZW4ndCByZWFsIHBvaW50cyBvciBhcmUgdG9vIGZhciBhd2F5LlxuICAgICAgICAgIGlmIChjdXJEaXN0YW5jZSA9PT0gbnVsbCB8fCBjdXJEaXN0YW5jZSA+IG1heERpc3RhbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBTa2lwIGFueXRoaW5nIHRoYXQncyBhIHRpZS5cbiAgICAgICAgICBpZiAocmVzdWx0LmRpc3RhbmNlICE9PSB1bmRlZmluZWQgJiYgcmVzdWx0LmRpc3RhbmNlIDw9IGN1ckRpc3RhbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHQucmVzdWx0ID0gdHJ1ZTtcbiAgICAgICAgcmVzdWx0LmRpc3RhbmNlID0gY3VyRGlzdGFuY2U7XG5cbiAgICAgICAgaWYgKGJyYW5jaC5hcnJheUluZGljZXMpIHtcbiAgICAgICAgICByZXN1bHQuYXJyYXlJbmRpY2VzID0gYnJhbmNoLmFycmF5SW5kaWNlcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgcmVzdWx0LmFycmF5SW5kaWNlcztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAhbWF0Y2hlci5faXNVcGRhdGU7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9LFxufTtcblxuLy8gTkI6IFdlIGFyZSBjaGVhdGluZyBhbmQgdXNpbmcgdGhpcyBmdW5jdGlvbiB0byBpbXBsZW1lbnQgJ0FORCcgZm9yIGJvdGhcbi8vICdkb2N1bWVudCBtYXRjaGVycycgYW5kICdicmFuY2hlZCBtYXRjaGVycycuIFRoZXkgYm90aCByZXR1cm4gcmVzdWx0IG9iamVjdHNcbi8vIGJ1dCB0aGUgYXJndW1lbnQgaXMgZGlmZmVyZW50OiBmb3IgdGhlIGZvcm1lciBpdCdzIGEgd2hvbGUgZG9jLCB3aGVyZWFzIGZvclxuLy8gdGhlIGxhdHRlciBpdCdzIGFuIGFycmF5IG9mICdicmFuY2hlZCB2YWx1ZXMnLlxuZnVuY3Rpb24gYW5kU29tZU1hdGNoZXJzKHN1Yk1hdGNoZXJzKSB7XG4gIGlmIChzdWJNYXRjaGVycy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gZXZlcnl0aGluZ01hdGNoZXI7XG4gIH1cblxuICBpZiAoc3ViTWF0Y2hlcnMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIHN1Yk1hdGNoZXJzWzBdO1xuICB9XG5cbiAgcmV0dXJuIGRvY09yQnJhbmNoZXMgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0ge307XG4gICAgbWF0Y2gucmVzdWx0ID0gc3ViTWF0Y2hlcnMuZXZlcnkoZm4gPT4ge1xuICAgICAgY29uc3Qgc3ViUmVzdWx0ID0gZm4oZG9jT3JCcmFuY2hlcyk7XG5cbiAgICAgIC8vIENvcHkgYSAnZGlzdGFuY2UnIG51bWJlciBvdXQgb2YgdGhlIGZpcnN0IHN1Yi1tYXRjaGVyIHRoYXQgaGFzXG4gICAgICAvLyBvbmUuIFllcywgdGhpcyBtZWFucyB0aGF0IGlmIHRoZXJlIGFyZSBtdWx0aXBsZSAkbmVhciBmaWVsZHMgaW4gYVxuICAgICAgLy8gcXVlcnksIHNvbWV0aGluZyBhcmJpdHJhcnkgaGFwcGVuczsgdGhpcyBhcHBlYXJzIHRvIGJlIGNvbnNpc3RlbnQgd2l0aFxuICAgICAgLy8gTW9uZ28uXG4gICAgICBpZiAoc3ViUmVzdWx0LnJlc3VsdCAmJlxuICAgICAgICAgIHN1YlJlc3VsdC5kaXN0YW5jZSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgbWF0Y2guZGlzdGFuY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBtYXRjaC5kaXN0YW5jZSA9IHN1YlJlc3VsdC5kaXN0YW5jZTtcbiAgICAgIH1cblxuICAgICAgLy8gU2ltaWxhcmx5LCBwcm9wYWdhdGUgYXJyYXlJbmRpY2VzIGZyb20gc3ViLW1hdGNoZXJzLi4uIGJ1dCB0byBtYXRjaFxuICAgICAgLy8gTW9uZ29EQiBiZWhhdmlvciwgdGhpcyB0aW1lIHRoZSAqbGFzdCogc3ViLW1hdGNoZXIgd2l0aCBhcnJheUluZGljZXNcbiAgICAgIC8vIHdpbnMuXG4gICAgICBpZiAoc3ViUmVzdWx0LnJlc3VsdCAmJiBzdWJSZXN1bHQuYXJyYXlJbmRpY2VzKSB7XG4gICAgICAgIG1hdGNoLmFycmF5SW5kaWNlcyA9IHN1YlJlc3VsdC5hcnJheUluZGljZXM7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzdWJSZXN1bHQucmVzdWx0O1xuICAgIH0pO1xuXG4gICAgLy8gSWYgd2UgZGlkbid0IGFjdHVhbGx5IG1hdGNoLCBmb3JnZXQgYW55IGV4dHJhIG1ldGFkYXRhIHdlIGNhbWUgdXAgd2l0aC5cbiAgICBpZiAoIW1hdGNoLnJlc3VsdCkge1xuICAgICAgZGVsZXRlIG1hdGNoLmRpc3RhbmNlO1xuICAgICAgZGVsZXRlIG1hdGNoLmFycmF5SW5kaWNlcztcbiAgICB9XG5cbiAgICByZXR1cm4gbWF0Y2g7XG4gIH07XG59XG5cbmNvbnN0IGFuZERvY3VtZW50TWF0Y2hlcnMgPSBhbmRTb21lTWF0Y2hlcnM7XG5jb25zdCBhbmRCcmFuY2hlZE1hdGNoZXJzID0gYW5kU29tZU1hdGNoZXJzO1xuXG5mdW5jdGlvbiBjb21waWxlQXJyYXlPZkRvY3VtZW50U2VsZWN0b3JzKHNlbGVjdG9ycywgbWF0Y2hlciwgaW5FbGVtTWF0Y2gpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHNlbGVjdG9ycykgfHwgc2VsZWN0b3JzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IEVycm9yKCckYW5kLyRvci8kbm9yIG11c3QgYmUgbm9uZW1wdHkgYXJyYXknKTtcbiAgfVxuXG4gIHJldHVybiBzZWxlY3RvcnMubWFwKHN1YlNlbGVjdG9yID0+IHtcbiAgICBpZiAoIUxvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChzdWJTZWxlY3RvcikpIHtcbiAgICAgIHRocm93IEVycm9yKCckb3IvJGFuZC8kbm9yIGVudHJpZXMgbmVlZCB0byBiZSBmdWxsIG9iamVjdHMnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29tcGlsZURvY3VtZW50U2VsZWN0b3Ioc3ViU2VsZWN0b3IsIG1hdGNoZXIsIHtpbkVsZW1NYXRjaH0pO1xuICB9KTtcbn1cblxuLy8gVGFrZXMgaW4gYSBzZWxlY3RvciB0aGF0IGNvdWxkIG1hdGNoIGEgZnVsbCBkb2N1bWVudCAoZWcsIHRoZSBvcmlnaW5hbFxuLy8gc2VsZWN0b3IpLiBSZXR1cm5zIGEgZnVuY3Rpb24gbWFwcGluZyBkb2N1bWVudC0+cmVzdWx0IG9iamVjdC5cbi8vXG4vLyBtYXRjaGVyIGlzIHRoZSBNYXRjaGVyIG9iamVjdCB3ZSBhcmUgY29tcGlsaW5nLlxuLy9cbi8vIElmIHRoaXMgaXMgdGhlIHJvb3QgZG9jdW1lbnQgc2VsZWN0b3IgKGllLCBub3Qgd3JhcHBlZCBpbiAkYW5kIG9yIHRoZSBsaWtlKSxcbi8vIHRoZW4gaXNSb290IGlzIHRydWUuIChUaGlzIGlzIHVzZWQgYnkgJG5lYXIuKVxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGVEb2N1bWVudFNlbGVjdG9yKGRvY1NlbGVjdG9yLCBtYXRjaGVyLCBvcHRpb25zID0ge30pIHtcbiAgY29uc3QgZG9jTWF0Y2hlcnMgPSBPYmplY3Qua2V5cyhkb2NTZWxlY3RvcikubWFwKGtleSA9PiB7XG4gICAgY29uc3Qgc3ViU2VsZWN0b3IgPSBkb2NTZWxlY3RvcltrZXldO1xuXG4gICAgaWYgKGtleS5zdWJzdHIoMCwgMSkgPT09ICckJykge1xuICAgICAgLy8gT3V0ZXIgb3BlcmF0b3JzIGFyZSBlaXRoZXIgbG9naWNhbCBvcGVyYXRvcnMgKHRoZXkgcmVjdXJzZSBiYWNrIGludG9cbiAgICAgIC8vIHRoaXMgZnVuY3Rpb24pLCBvciAkd2hlcmUuXG4gICAgICBpZiAoIWhhc093bi5jYWxsKExPR0lDQUxfT1BFUkFUT1JTLCBrZXkpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5yZWNvZ25pemVkIGxvZ2ljYWwgb3BlcmF0b3I6ICR7a2V5fWApO1xuICAgICAgfVxuXG4gICAgICBtYXRjaGVyLl9pc1NpbXBsZSA9IGZhbHNlO1xuICAgICAgcmV0dXJuIExPR0lDQUxfT1BFUkFUT1JTW2tleV0oc3ViU2VsZWN0b3IsIG1hdGNoZXIsIG9wdGlvbnMuaW5FbGVtTWF0Y2gpO1xuICAgIH1cblxuICAgIC8vIFJlY29yZCB0aGlzIHBhdGgsIGJ1dCBvbmx5IGlmIHdlIGFyZW4ndCBpbiBhbiBlbGVtTWF0Y2hlciwgc2luY2UgaW4gYW5cbiAgICAvLyBlbGVtTWF0Y2ggdGhpcyBpcyBhIHBhdGggaW5zaWRlIGFuIG9iamVjdCBpbiBhbiBhcnJheSwgbm90IGluIHRoZSBkb2NcbiAgICAvLyByb290LlxuICAgIGlmICghb3B0aW9ucy5pbkVsZW1NYXRjaCkge1xuICAgICAgbWF0Y2hlci5fcmVjb3JkUGF0aFVzZWQoa2V5KTtcbiAgICB9XG5cbiAgICAvLyBEb24ndCBhZGQgYSBtYXRjaGVyIGlmIHN1YlNlbGVjdG9yIGlzIGEgZnVuY3Rpb24gLS0gdGhpcyBpcyB0byBtYXRjaFxuICAgIC8vIHRoZSBiZWhhdmlvciBvZiBNZXRlb3Igb24gdGhlIHNlcnZlciAoaW5oZXJpdGVkIGZyb20gdGhlIG5vZGUgbW9uZ29kYlxuICAgIC8vIGRyaXZlciksIHdoaWNoIGlzIHRvIGlnbm9yZSBhbnkgcGFydCBvZiBhIHNlbGVjdG9yIHdoaWNoIGlzIGEgZnVuY3Rpb24uXG4gICAgaWYgKHR5cGVvZiBzdWJTZWxlY3RvciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBsb29rVXBCeUluZGV4ID0gbWFrZUxvb2t1cEZ1bmN0aW9uKGtleSk7XG4gICAgY29uc3QgdmFsdWVNYXRjaGVyID0gY29tcGlsZVZhbHVlU2VsZWN0b3IoXG4gICAgICBzdWJTZWxlY3RvcixcbiAgICAgIG1hdGNoZXIsXG4gICAgICBvcHRpb25zLmlzUm9vdFxuICAgICk7XG5cbiAgICByZXR1cm4gZG9jID0+IHZhbHVlTWF0Y2hlcihsb29rVXBCeUluZGV4KGRvYykpO1xuICB9KS5maWx0ZXIoQm9vbGVhbik7XG5cbiAgcmV0dXJuIGFuZERvY3VtZW50TWF0Y2hlcnMoZG9jTWF0Y2hlcnMpO1xufVxuXG4vLyBUYWtlcyBpbiBhIHNlbGVjdG9yIHRoYXQgY291bGQgbWF0Y2ggYSBrZXktaW5kZXhlZCB2YWx1ZSBpbiBhIGRvY3VtZW50OyBlZyxcbi8vIHskZ3Q6IDUsICRsdDogOX0sIG9yIGEgcmVndWxhciBleHByZXNzaW9uLCBvciBhbnkgbm9uLWV4cHJlc3Npb24gb2JqZWN0ICh0b1xuLy8gaW5kaWNhdGUgZXF1YWxpdHkpLiAgUmV0dXJucyBhIGJyYW5jaGVkIG1hdGNoZXI6IGEgZnVuY3Rpb24gbWFwcGluZ1xuLy8gW2JyYW5jaGVkIHZhbHVlXS0+cmVzdWx0IG9iamVjdC5cbmZ1bmN0aW9uIGNvbXBpbGVWYWx1ZVNlbGVjdG9yKHZhbHVlU2VsZWN0b3IsIG1hdGNoZXIsIGlzUm9vdCkge1xuICBpZiAodmFsdWVTZWxlY3RvciBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgIG1hdGNoZXIuX2lzU2ltcGxlID0gZmFsc2U7XG4gICAgcmV0dXJuIGNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyKFxuICAgICAgcmVnZXhwRWxlbWVudE1hdGNoZXIodmFsdWVTZWxlY3RvcilcbiAgICApO1xuICB9XG5cbiAgaWYgKGlzT3BlcmF0b3JPYmplY3QodmFsdWVTZWxlY3RvcikpIHtcbiAgICByZXR1cm4gb3BlcmF0b3JCcmFuY2hlZE1hdGNoZXIodmFsdWVTZWxlY3RvciwgbWF0Y2hlciwgaXNSb290KTtcbiAgfVxuXG4gIHJldHVybiBjb252ZXJ0RWxlbWVudE1hdGNoZXJUb0JyYW5jaGVkTWF0Y2hlcihcbiAgICBlcXVhbGl0eUVsZW1lbnRNYXRjaGVyKHZhbHVlU2VsZWN0b3IpXG4gICk7XG59XG5cbi8vIEdpdmVuIGFuIGVsZW1lbnQgbWF0Y2hlciAod2hpY2ggZXZhbHVhdGVzIGEgc2luZ2xlIHZhbHVlKSwgcmV0dXJucyBhIGJyYW5jaGVkXG4vLyB2YWx1ZSAod2hpY2ggZXZhbHVhdGVzIHRoZSBlbGVtZW50IG1hdGNoZXIgb24gYWxsIHRoZSBicmFuY2hlcyBhbmQgcmV0dXJucyBhXG4vLyBtb3JlIHN0cnVjdHVyZWQgcmV0dXJuIHZhbHVlIHBvc3NpYmx5IGluY2x1ZGluZyBhcnJheUluZGljZXMpLlxuZnVuY3Rpb24gY29udmVydEVsZW1lbnRNYXRjaGVyVG9CcmFuY2hlZE1hdGNoZXIoZWxlbWVudE1hdGNoZXIsIG9wdGlvbnMgPSB7fSkge1xuICByZXR1cm4gYnJhbmNoZXMgPT4ge1xuICAgIGNvbnN0IGV4cGFuZGVkID0gb3B0aW9ucy5kb250RXhwYW5kTGVhZkFycmF5c1xuICAgICAgPyBicmFuY2hlc1xuICAgICAgOiBleHBhbmRBcnJheXNJbkJyYW5jaGVzKGJyYW5jaGVzLCBvcHRpb25zLmRvbnRJbmNsdWRlTGVhZkFycmF5cyk7XG5cbiAgICBjb25zdCBtYXRjaCA9IHt9O1xuICAgIG1hdGNoLnJlc3VsdCA9IGV4cGFuZGVkLnNvbWUoZWxlbWVudCA9PiB7XG4gICAgICBsZXQgbWF0Y2hlZCA9IGVsZW1lbnRNYXRjaGVyKGVsZW1lbnQudmFsdWUpO1xuXG4gICAgICAvLyBTcGVjaWFsIGNhc2UgZm9yICRlbGVtTWF0Y2g6IGl0IG1lYW5zIFwidHJ1ZSwgYW5kIHVzZSB0aGlzIGFzIGFuIGFycmF5XG4gICAgICAvLyBpbmRleCBpZiBJIGRpZG4ndCBhbHJlYWR5IGhhdmUgb25lXCIuXG4gICAgICBpZiAodHlwZW9mIG1hdGNoZWQgPT09ICdudW1iZXInKSB7XG4gICAgICAgIC8vIFhYWCBUaGlzIGNvZGUgZGF0ZXMgZnJvbSB3aGVuIHdlIG9ubHkgc3RvcmVkIGEgc2luZ2xlIGFycmF5IGluZGV4XG4gICAgICAgIC8vIChmb3IgdGhlIG91dGVybW9zdCBhcnJheSkuIFNob3VsZCB3ZSBiZSBhbHNvIGluY2x1ZGluZyBkZWVwZXIgYXJyYXlcbiAgICAgICAgLy8gaW5kaWNlcyBmcm9tIHRoZSAkZWxlbU1hdGNoIG1hdGNoP1xuICAgICAgICBpZiAoIWVsZW1lbnQuYXJyYXlJbmRpY2VzKSB7XG4gICAgICAgICAgZWxlbWVudC5hcnJheUluZGljZXMgPSBbbWF0Y2hlZF07XG4gICAgICAgIH1cblxuICAgICAgICBtYXRjaGVkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgLy8gSWYgc29tZSBlbGVtZW50IG1hdGNoZWQsIGFuZCBpdCdzIHRhZ2dlZCB3aXRoIGFycmF5IGluZGljZXMsIGluY2x1ZGVcbiAgICAgIC8vIHRob3NlIGluZGljZXMgaW4gb3VyIHJlc3VsdCBvYmplY3QuXG4gICAgICBpZiAobWF0Y2hlZCAmJiBlbGVtZW50LmFycmF5SW5kaWNlcykge1xuICAgICAgICBtYXRjaC5hcnJheUluZGljZXMgPSBlbGVtZW50LmFycmF5SW5kaWNlcztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG1hdGNoZWQ7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbWF0Y2g7XG4gIH07XG59XG5cbi8vIEhlbHBlcnMgZm9yICRuZWFyLlxuZnVuY3Rpb24gZGlzdGFuY2VDb29yZGluYXRlUGFpcnMoYSwgYikge1xuICBjb25zdCBwb2ludEEgPSBwb2ludFRvQXJyYXkoYSk7XG4gIGNvbnN0IHBvaW50QiA9IHBvaW50VG9BcnJheShiKTtcblxuICByZXR1cm4gTWF0aC5oeXBvdChwb2ludEFbMF0gLSBwb2ludEJbMF0sIHBvaW50QVsxXSAtIHBvaW50QlsxXSk7XG59XG5cbi8vIFRha2VzIHNvbWV0aGluZyB0aGF0IGlzIG5vdCBhbiBvcGVyYXRvciBvYmplY3QgYW5kIHJldHVybnMgYW4gZWxlbWVudCBtYXRjaGVyXG4vLyBmb3IgZXF1YWxpdHkgd2l0aCB0aGF0IHRoaW5nLlxuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsaXR5RWxlbWVudE1hdGNoZXIoZWxlbWVudFNlbGVjdG9yKSB7XG4gIGlmIChpc09wZXJhdG9yT2JqZWN0KGVsZW1lbnRTZWxlY3RvcikpIHtcbiAgICB0aHJvdyBFcnJvcignQ2FuXFwndCBjcmVhdGUgZXF1YWxpdHlWYWx1ZVNlbGVjdG9yIGZvciBvcGVyYXRvciBvYmplY3QnKTtcbiAgfVxuXG4gIC8vIFNwZWNpYWwtY2FzZTogbnVsbCBhbmQgdW5kZWZpbmVkIGFyZSBlcXVhbCAoaWYgeW91IGdvdCB1bmRlZmluZWQgaW4gdGhlcmVcbiAgLy8gc29tZXdoZXJlLCBvciBpZiB5b3UgZ290IGl0IGR1ZSB0byBzb21lIGJyYW5jaCBiZWluZyBub24tZXhpc3RlbnQgaW4gdGhlXG4gIC8vIHdlaXJkIHNwZWNpYWwgY2FzZSksIGV2ZW4gdGhvdWdoIHRoZXkgYXJlbid0IHdpdGggRUpTT04uZXF1YWxzLlxuICAvLyB1bmRlZmluZWQgb3IgbnVsbFxuICBpZiAoZWxlbWVudFNlbGVjdG9yID09IG51bGwpIHtcbiAgICByZXR1cm4gdmFsdWUgPT4gdmFsdWUgPT0gbnVsbDtcbiAgfVxuXG4gIHJldHVybiB2YWx1ZSA9PiBMb2NhbENvbGxlY3Rpb24uX2YuX2VxdWFsKGVsZW1lbnRTZWxlY3RvciwgdmFsdWUpO1xufVxuXG5mdW5jdGlvbiBldmVyeXRoaW5nTWF0Y2hlcihkb2NPckJyYW5jaGVkVmFsdWVzKSB7XG4gIHJldHVybiB7cmVzdWx0OiB0cnVlfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4cGFuZEFycmF5c0luQnJhbmNoZXMoYnJhbmNoZXMsIHNraXBUaGVBcnJheXMpIHtcbiAgY29uc3QgYnJhbmNoZXNPdXQgPSBbXTtcblxuICBicmFuY2hlcy5mb3JFYWNoKGJyYW5jaCA9PiB7XG4gICAgY29uc3QgdGhpc0lzQXJyYXkgPSBBcnJheS5pc0FycmF5KGJyYW5jaC52YWx1ZSk7XG5cbiAgICAvLyBXZSBpbmNsdWRlIHRoZSBicmFuY2ggaXRzZWxmLCAqVU5MRVNTKiB3ZSBpdCdzIGFuIGFycmF5IHRoYXQgd2UncmUgZ29pbmdcbiAgICAvLyB0byBpdGVyYXRlIGFuZCB3ZSdyZSB0b2xkIHRvIHNraXAgYXJyYXlzLiAgKFRoYXQncyByaWdodCwgd2UgaW5jbHVkZSBzb21lXG4gICAgLy8gYXJyYXlzIGV2ZW4gc2tpcFRoZUFycmF5cyBpcyB0cnVlOiB0aGVzZSBhcmUgYXJyYXlzIHRoYXQgd2VyZSBmb3VuZCB2aWFcbiAgICAvLyBleHBsaWNpdCBudW1lcmljYWwgaW5kaWNlcy4pXG4gICAgaWYgKCEoc2tpcFRoZUFycmF5cyAmJiB0aGlzSXNBcnJheSAmJiAhYnJhbmNoLmRvbnRJdGVyYXRlKSkge1xuICAgICAgYnJhbmNoZXNPdXQucHVzaCh7YXJyYXlJbmRpY2VzOiBicmFuY2guYXJyYXlJbmRpY2VzLCB2YWx1ZTogYnJhbmNoLnZhbHVlfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXNJc0FycmF5ICYmICFicmFuY2guZG9udEl0ZXJhdGUpIHtcbiAgICAgIGJyYW5jaC52YWx1ZS5mb3JFYWNoKCh2YWx1ZSwgaSkgPT4ge1xuICAgICAgICBicmFuY2hlc091dC5wdXNoKHtcbiAgICAgICAgICBhcnJheUluZGljZXM6IChicmFuY2guYXJyYXlJbmRpY2VzIHx8IFtdKS5jb25jYXQoaSksXG4gICAgICAgICAgdmFsdWVcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBicmFuY2hlc091dDtcbn1cblxuLy8gSGVscGVycyBmb3IgJGJpdHNBbGxTZXQvJGJpdHNBbnlTZXQvJGJpdHNBbGxDbGVhci8kYml0c0FueUNsZWFyLlxuZnVuY3Rpb24gZ2V0T3BlcmFuZEJpdG1hc2sob3BlcmFuZCwgc2VsZWN0b3IpIHtcbiAgLy8gbnVtZXJpYyBiaXRtYXNrXG4gIC8vIFlvdSBjYW4gcHJvdmlkZSBhIG51bWVyaWMgYml0bWFzayB0byBiZSBtYXRjaGVkIGFnYWluc3QgdGhlIG9wZXJhbmQgZmllbGQuXG4gIC8vIEl0IG11c3QgYmUgcmVwcmVzZW50YWJsZSBhcyBhIG5vbi1uZWdhdGl2ZSAzMi1iaXQgc2lnbmVkIGludGVnZXIuXG4gIC8vIE90aGVyd2lzZSwgJGJpdHNBbGxTZXQgd2lsbCByZXR1cm4gYW4gZXJyb3IuXG4gIGlmIChOdW1iZXIuaXNJbnRlZ2VyKG9wZXJhbmQpICYmIG9wZXJhbmQgPj0gMCkge1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShuZXcgSW50MzJBcnJheShbb3BlcmFuZF0pLmJ1ZmZlcik7XG4gIH1cblxuICAvLyBiaW5kYXRhIGJpdG1hc2tcbiAgLy8gWW91IGNhbiBhbHNvIHVzZSBhbiBhcmJpdHJhcmlseSBsYXJnZSBCaW5EYXRhIGluc3RhbmNlIGFzIGEgYml0bWFzay5cbiAgaWYgKEVKU09OLmlzQmluYXJ5KG9wZXJhbmQpKSB7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KG9wZXJhbmQuYnVmZmVyKTtcbiAgfVxuXG4gIC8vIHBvc2l0aW9uIGxpc3RcbiAgLy8gSWYgcXVlcnlpbmcgYSBsaXN0IG9mIGJpdCBwb3NpdGlvbnMsIGVhY2ggPHBvc2l0aW9uPiBtdXN0IGJlIGEgbm9uLW5lZ2F0aXZlXG4gIC8vIGludGVnZXIuIEJpdCBwb3NpdGlvbnMgc3RhcnQgYXQgMCBmcm9tIHRoZSBsZWFzdCBzaWduaWZpY2FudCBiaXQuXG4gIGlmIChBcnJheS5pc0FycmF5KG9wZXJhbmQpICYmXG4gICAgICBvcGVyYW5kLmV2ZXJ5KHggPT4gTnVtYmVyLmlzSW50ZWdlcih4KSAmJiB4ID49IDApKSB7XG4gICAgY29uc3QgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKChNYXRoLm1heCguLi5vcGVyYW5kKSA+PiAzKSArIDEpO1xuICAgIGNvbnN0IHZpZXcgPSBuZXcgVWludDhBcnJheShidWZmZXIpO1xuXG4gICAgb3BlcmFuZC5mb3JFYWNoKHggPT4ge1xuICAgICAgdmlld1t4ID4+IDNdIHw9IDEgPDwgKHggJiAweDcpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHZpZXc7XG4gIH1cblxuICAvLyBiYWQgb3BlcmFuZFxuICB0aHJvdyBFcnJvcihcbiAgICBgb3BlcmFuZCB0byAke3NlbGVjdG9yfSBtdXN0IGJlIGEgbnVtZXJpYyBiaXRtYXNrIChyZXByZXNlbnRhYmxlIGFzIGEgYCArXG4gICAgJ25vbi1uZWdhdGl2ZSAzMi1iaXQgc2lnbmVkIGludGVnZXIpLCBhIGJpbmRhdGEgYml0bWFzayBvciBhbiBhcnJheSB3aXRoICcgK1xuICAgICdiaXQgcG9zaXRpb25zIChub24tbmVnYXRpdmUgaW50ZWdlcnMpJ1xuICApO1xufVxuXG5mdW5jdGlvbiBnZXRWYWx1ZUJpdG1hc2sodmFsdWUsIGxlbmd0aCkge1xuICAvLyBUaGUgZmllbGQgdmFsdWUgbXVzdCBiZSBlaXRoZXIgbnVtZXJpY2FsIG9yIGEgQmluRGF0YSBpbnN0YW5jZS4gT3RoZXJ3aXNlLFxuICAvLyAkYml0cy4uLiB3aWxsIG5vdCBtYXRjaCB0aGUgY3VycmVudCBkb2N1bWVudC5cblxuICAvLyBudW1lcmljYWxcbiAgaWYgKE51bWJlci5pc1NhZmVJbnRlZ2VyKHZhbHVlKSkge1xuICAgIC8vICRiaXRzLi4uIHdpbGwgbm90IG1hdGNoIG51bWVyaWNhbCB2YWx1ZXMgdGhhdCBjYW5ub3QgYmUgcmVwcmVzZW50ZWQgYXMgYVxuICAgIC8vIHNpZ25lZCA2NC1iaXQgaW50ZWdlci4gVGhpcyBjYW4gYmUgdGhlIGNhc2UgaWYgYSB2YWx1ZSBpcyBlaXRoZXIgdG9vXG4gICAgLy8gbGFyZ2Ugb3Igc21hbGwgdG8gZml0IGluIGEgc2lnbmVkIDY0LWJpdCBpbnRlZ2VyLCBvciBpZiBpdCBoYXMgYVxuICAgIC8vIGZyYWN0aW9uYWwgY29tcG9uZW50LlxuICAgIGNvbnN0IGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcihcbiAgICAgIE1hdGgubWF4KGxlbmd0aCwgMiAqIFVpbnQzMkFycmF5LkJZVEVTX1BFUl9FTEVNRU5UKVxuICAgICk7XG5cbiAgICBsZXQgdmlldyA9IG5ldyBVaW50MzJBcnJheShidWZmZXIsIDAsIDIpO1xuICAgIHZpZXdbMF0gPSB2YWx1ZSAlICgoMSA8PCAxNikgKiAoMSA8PCAxNikpIHwgMDtcbiAgICB2aWV3WzFdID0gdmFsdWUgLyAoKDEgPDwgMTYpICogKDEgPDwgMTYpKSB8IDA7XG5cbiAgICAvLyBzaWduIGV4dGVuc2lvblxuICAgIGlmICh2YWx1ZSA8IDApIHtcbiAgICAgIHZpZXcgPSBuZXcgVWludDhBcnJheShidWZmZXIsIDIpO1xuICAgICAgdmlldy5mb3JFYWNoKChieXRlLCBpKSA9PiB7XG4gICAgICAgIHZpZXdbaV0gPSAweGZmO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gIH1cblxuICAvLyBiaW5kYXRhXG4gIGlmIChFSlNPTi5pc0JpbmFyeSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkodmFsdWUuYnVmZmVyKTtcbiAgfVxuXG4gIC8vIG5vIG1hdGNoXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLy8gQWN0dWFsbHkgaW5zZXJ0cyBhIGtleSB2YWx1ZSBpbnRvIHRoZSBzZWxlY3RvciBkb2N1bWVudFxuLy8gSG93ZXZlciwgdGhpcyBjaGVja3MgdGhlcmUgaXMgbm8gYW1iaWd1aXR5IGluIHNldHRpbmdcbi8vIHRoZSB2YWx1ZSBmb3IgdGhlIGdpdmVuIGtleSwgdGhyb3dzIG90aGVyd2lzZVxuZnVuY3Rpb24gaW5zZXJ0SW50b0RvY3VtZW50KGRvY3VtZW50LCBrZXksIHZhbHVlKSB7XG4gIE9iamVjdC5rZXlzKGRvY3VtZW50KS5mb3JFYWNoKGV4aXN0aW5nS2V5ID0+IHtcbiAgICBpZiAoXG4gICAgICAoZXhpc3RpbmdLZXkubGVuZ3RoID4ga2V5Lmxlbmd0aCAmJiBleGlzdGluZ0tleS5pbmRleE9mKGAke2tleX0uYCkgPT09IDApIHx8XG4gICAgICAoa2V5Lmxlbmd0aCA+IGV4aXN0aW5nS2V5Lmxlbmd0aCAmJiBrZXkuaW5kZXhPZihgJHtleGlzdGluZ0tleX0uYCkgPT09IDApXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBjYW5ub3QgaW5mZXIgcXVlcnkgZmllbGRzIHRvIHNldCwgYm90aCBwYXRocyAnJHtleGlzdGluZ0tleX0nIGFuZCBgICtcbiAgICAgICAgYCcke2tleX0nIGFyZSBtYXRjaGVkYFxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKGV4aXN0aW5nS2V5ID09PSBrZXkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYGNhbm5vdCBpbmZlciBxdWVyeSBmaWVsZHMgdG8gc2V0LCBwYXRoICcke2tleX0nIGlzIG1hdGNoZWQgdHdpY2VgXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgZG9jdW1lbnRba2V5XSA9IHZhbHVlO1xufVxuXG4vLyBSZXR1cm5zIGEgYnJhbmNoZWQgbWF0Y2hlciB0aGF0IG1hdGNoZXMgaWZmIHRoZSBnaXZlbiBtYXRjaGVyIGRvZXMgbm90LlxuLy8gTm90ZSB0aGF0IHRoaXMgaW1wbGljaXRseSBcImRlTW9yZ2FuaXplc1wiIHRoZSB3cmFwcGVkIGZ1bmN0aW9uLiAgaWUsIGl0XG4vLyBtZWFucyB0aGF0IEFMTCBicmFuY2ggdmFsdWVzIG5lZWQgdG8gZmFpbCB0byBtYXRjaCBpbm5lckJyYW5jaGVkTWF0Y2hlci5cbmZ1bmN0aW9uIGludmVydEJyYW5jaGVkTWF0Y2hlcihicmFuY2hlZE1hdGNoZXIpIHtcbiAgcmV0dXJuIGJyYW5jaFZhbHVlcyA9PiB7XG4gICAgLy8gV2UgZXhwbGljaXRseSBjaG9vc2UgdG8gc3RyaXAgYXJyYXlJbmRpY2VzIGhlcmU6IGl0IGRvZXNuJ3QgbWFrZSBzZW5zZSB0b1xuICAgIC8vIHNheSBcInVwZGF0ZSB0aGUgYXJyYXkgZWxlbWVudCB0aGF0IGRvZXMgbm90IG1hdGNoIHNvbWV0aGluZ1wiLCBhdCBsZWFzdFxuICAgIC8vIGluIG1vbmdvLWxhbmQuXG4gICAgcmV0dXJuIHtyZXN1bHQ6ICFicmFuY2hlZE1hdGNoZXIoYnJhbmNoVmFsdWVzKS5yZXN1bHR9O1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJbmRleGFibGUob2JqKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KG9iaikgfHwgTG9jYWxDb2xsZWN0aW9uLl9pc1BsYWluT2JqZWN0KG9iaik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc051bWVyaWNLZXkocykge1xuICByZXR1cm4gL15bMC05XSskLy50ZXN0KHMpO1xufVxuXG4vLyBSZXR1cm5zIHRydWUgaWYgdGhpcyBpcyBhbiBvYmplY3Qgd2l0aCBhdCBsZWFzdCBvbmUga2V5IGFuZCBhbGwga2V5cyBiZWdpblxuLy8gd2l0aCAkLiAgVW5sZXNzIGluY29uc2lzdGVudE9LIGlzIHNldCwgdGhyb3dzIGlmIHNvbWUga2V5cyBiZWdpbiB3aXRoICQgYW5kXG4vLyBvdGhlcnMgZG9uJ3QuXG5leHBvcnQgZnVuY3Rpb24gaXNPcGVyYXRvck9iamVjdCh2YWx1ZVNlbGVjdG9yLCBpbmNvbnNpc3RlbnRPSykge1xuICBpZiAoIUxvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdCh2YWx1ZVNlbGVjdG9yKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGxldCB0aGVzZUFyZU9wZXJhdG9ycyA9IHVuZGVmaW5lZDtcbiAgT2JqZWN0LmtleXModmFsdWVTZWxlY3RvcikuZm9yRWFjaChzZWxLZXkgPT4ge1xuICAgIGNvbnN0IHRoaXNJc09wZXJhdG9yID0gc2VsS2V5LnN1YnN0cigwLCAxKSA9PT0gJyQnO1xuXG4gICAgaWYgKHRoZXNlQXJlT3BlcmF0b3JzID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoZXNlQXJlT3BlcmF0b3JzID0gdGhpc0lzT3BlcmF0b3I7XG4gICAgfSBlbHNlIGlmICh0aGVzZUFyZU9wZXJhdG9ycyAhPT0gdGhpc0lzT3BlcmF0b3IpIHtcbiAgICAgIGlmICghaW5jb25zaXN0ZW50T0spIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBJbmNvbnNpc3RlbnQgb3BlcmF0b3I6ICR7SlNPTi5zdHJpbmdpZnkodmFsdWVTZWxlY3Rvcil9YFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICB0aGVzZUFyZU9wZXJhdG9ycyA9IGZhbHNlO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuICEhdGhlc2VBcmVPcGVyYXRvcnM7IC8vIHt9IGhhcyBubyBvcGVyYXRvcnNcbn1cblxuLy8gSGVscGVyIGZvciAkbHQvJGd0LyRsdGUvJGd0ZS5cbmZ1bmN0aW9uIG1ha2VJbmVxdWFsaXR5KGNtcFZhbHVlQ29tcGFyYXRvcikge1xuICByZXR1cm4ge1xuICAgIGNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCkge1xuICAgICAgLy8gQXJyYXlzIG5ldmVyIGNvbXBhcmUgZmFsc2Ugd2l0aCBub24tYXJyYXlzIGZvciBhbnkgaW5lcXVhbGl0eS5cbiAgICAgIC8vIFhYWCBUaGlzIHdhcyBiZWhhdmlvciB3ZSBvYnNlcnZlZCBpbiBwcmUtcmVsZWFzZSBNb25nb0RCIDIuNSwgYnV0XG4gICAgICAvLyAgICAgaXQgc2VlbXMgdG8gaGF2ZSBiZWVuIHJldmVydGVkLlxuICAgICAgLy8gICAgIFNlZSBodHRwczovL2ppcmEubW9uZ29kYi5vcmcvYnJvd3NlL1NFUlZFUi0xMTQ0NFxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkob3BlcmFuZCkpIHtcbiAgICAgICAgcmV0dXJuICgpID0+IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyBTcGVjaWFsIGNhc2U6IGNvbnNpZGVyIHVuZGVmaW5lZCBhbmQgbnVsbCB0aGUgc2FtZSAoc28gdHJ1ZSB3aXRoXG4gICAgICAvLyAkZ3RlLyRsdGUpLlxuICAgICAgaWYgKG9wZXJhbmQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBvcGVyYW5kID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgb3BlcmFuZFR5cGUgPSBMb2NhbENvbGxlY3Rpb24uX2YuX3R5cGUob3BlcmFuZCk7XG5cbiAgICAgIHJldHVybiB2YWx1ZSA9PiB7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdmFsdWUgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29tcGFyaXNvbnMgYXJlIG5ldmVyIHRydWUgYW1vbmcgdGhpbmdzIG9mIGRpZmZlcmVudCB0eXBlIChleGNlcHRcbiAgICAgICAgLy8gbnVsbCB2cyB1bmRlZmluZWQpLlxuICAgICAgICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlKHZhbHVlKSAhPT0gb3BlcmFuZFR5cGUpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY21wVmFsdWVDb21wYXJhdG9yKExvY2FsQ29sbGVjdGlvbi5fZi5fY21wKHZhbHVlLCBvcGVyYW5kKSk7XG4gICAgICB9O1xuICAgIH0sXG4gIH07XG59XG5cbi8vIG1ha2VMb29rdXBGdW5jdGlvbihrZXkpIHJldHVybnMgYSBsb29rdXAgZnVuY3Rpb24uXG4vL1xuLy8gQSBsb29rdXAgZnVuY3Rpb24gdGFrZXMgaW4gYSBkb2N1bWVudCBhbmQgcmV0dXJucyBhbiBhcnJheSBvZiBtYXRjaGluZ1xuLy8gYnJhbmNoZXMuICBJZiBubyBhcnJheXMgYXJlIGZvdW5kIHdoaWxlIGxvb2tpbmcgdXAgdGhlIGtleSwgdGhpcyBhcnJheSB3aWxsXG4vLyBoYXZlIGV4YWN0bHkgb25lIGJyYW5jaGVzIChwb3NzaWJseSAndW5kZWZpbmVkJywgaWYgc29tZSBzZWdtZW50IG9mIHRoZSBrZXlcbi8vIHdhcyBub3QgZm91bmQpLlxuLy9cbi8vIElmIGFycmF5cyBhcmUgZm91bmQgaW4gdGhlIG1pZGRsZSwgdGhpcyBjYW4gaGF2ZSBtb3JlIHRoYW4gb25lIGVsZW1lbnQsIHNpbmNlXG4vLyB3ZSAnYnJhbmNoJy4gV2hlbiB3ZSAnYnJhbmNoJywgaWYgdGhlcmUgYXJlIG1vcmUga2V5IHNlZ21lbnRzIHRvIGxvb2sgdXAsXG4vLyB0aGVuIHdlIG9ubHkgcHVyc3VlIGJyYW5jaGVzIHRoYXQgYXJlIHBsYWluIG9iamVjdHMgKG5vdCBhcnJheXMgb3Igc2NhbGFycykuXG4vLyBUaGlzIG1lYW5zIHdlIGNhbiBhY3R1YWxseSBlbmQgdXAgd2l0aCBubyBicmFuY2hlcyFcbi8vXG4vLyBXZSBkbyAqTk9UKiBicmFuY2ggb24gYXJyYXlzIHRoYXQgYXJlIGZvdW5kIGF0IHRoZSBlbmQgKGllLCBhdCB0aGUgbGFzdFxuLy8gZG90dGVkIG1lbWJlciBvZiB0aGUga2V5KS4gV2UganVzdCByZXR1cm4gdGhhdCBhcnJheTsgaWYgeW91IHdhbnQgdG9cbi8vIGVmZmVjdGl2ZWx5ICdicmFuY2gnIG92ZXIgdGhlIGFycmF5J3MgdmFsdWVzLCBwb3N0LXByb2Nlc3MgdGhlIGxvb2t1cFxuLy8gZnVuY3Rpb24gd2l0aCBleHBhbmRBcnJheXNJbkJyYW5jaGVzLlxuLy9cbi8vIEVhY2ggYnJhbmNoIGlzIGFuIG9iamVjdCB3aXRoIGtleXM6XG4vLyAgLSB2YWx1ZTogdGhlIHZhbHVlIGF0IHRoZSBicmFuY2hcbi8vICAtIGRvbnRJdGVyYXRlOiBhbiBvcHRpb25hbCBib29sOyBpZiB0cnVlLCBpdCBtZWFucyB0aGF0ICd2YWx1ZScgaXMgYW4gYXJyYXlcbi8vICAgIHRoYXQgZXhwYW5kQXJyYXlzSW5CcmFuY2hlcyBzaG91bGQgTk9UIGV4cGFuZC4gVGhpcyBzcGVjaWZpY2FsbHkgaGFwcGVuc1xuLy8gICAgd2hlbiB0aGVyZSBpcyBhIG51bWVyaWMgaW5kZXggaW4gdGhlIGtleSwgYW5kIGVuc3VyZXMgdGhlXG4vLyAgICBwZXJoYXBzLXN1cnByaXNpbmcgTW9uZ29EQiBiZWhhdmlvciB3aGVyZSB7J2EuMCc6IDV9IGRvZXMgTk9UXG4vLyAgICBtYXRjaCB7YTogW1s1XV19LlxuLy8gIC0gYXJyYXlJbmRpY2VzOiBpZiBhbnkgYXJyYXkgaW5kZXhpbmcgd2FzIGRvbmUgZHVyaW5nIGxvb2t1cCAoZWl0aGVyIGR1ZSB0b1xuLy8gICAgZXhwbGljaXQgbnVtZXJpYyBpbmRpY2VzIG9yIGltcGxpY2l0IGJyYW5jaGluZyksIHRoaXMgd2lsbCBiZSBhbiBhcnJheSBvZlxuLy8gICAgdGhlIGFycmF5IGluZGljZXMgdXNlZCwgZnJvbSBvdXRlcm1vc3QgdG8gaW5uZXJtb3N0OyBpdCBpcyBmYWxzZXkgb3Jcbi8vICAgIGFic2VudCBpZiBubyBhcnJheSBpbmRleCBpcyB1c2VkLiBJZiBhbiBleHBsaWNpdCBudW1lcmljIGluZGV4IGlzIHVzZWQsXG4vLyAgICB0aGUgaW5kZXggd2lsbCBiZSBmb2xsb3dlZCBpbiBhcnJheUluZGljZXMgYnkgdGhlIHN0cmluZyAneCcuXG4vL1xuLy8gICAgTm90ZTogYXJyYXlJbmRpY2VzIGlzIHVzZWQgZm9yIHR3byBwdXJwb3Nlcy4gRmlyc3QsIGl0IGlzIHVzZWQgdG9cbi8vICAgIGltcGxlbWVudCB0aGUgJyQnIG1vZGlmaWVyIGZlYXR1cmUsIHdoaWNoIG9ubHkgZXZlciBsb29rcyBhdCBpdHMgZmlyc3Rcbi8vICAgIGVsZW1lbnQuXG4vL1xuLy8gICAgU2Vjb25kLCBpdCBpcyB1c2VkIGZvciBzb3J0IGtleSBnZW5lcmF0aW9uLCB3aGljaCBuZWVkcyB0byBiZSBhYmxlIHRvIHRlbGxcbi8vICAgIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gZGlmZmVyZW50IHBhdGhzLiBNb3Jlb3ZlciwgaXQgbmVlZHMgdG9cbi8vICAgIGRpZmZlcmVudGlhdGUgYmV0d2VlbiBleHBsaWNpdCBhbmQgaW1wbGljaXQgYnJhbmNoaW5nLCB3aGljaCBpcyB3aHlcbi8vICAgIHRoZXJlJ3MgdGhlIHNvbWV3aGF0IGhhY2t5ICd4JyBlbnRyeTogdGhpcyBtZWFucyB0aGF0IGV4cGxpY2l0IGFuZFxuLy8gICAgaW1wbGljaXQgYXJyYXkgbG9va3VwcyB3aWxsIGhhdmUgZGlmZmVyZW50IGZ1bGwgYXJyYXlJbmRpY2VzIHBhdGhzLiAoVGhhdFxuLy8gICAgY29kZSBvbmx5IHJlcXVpcmVzIHRoYXQgZGlmZmVyZW50IHBhdGhzIGhhdmUgZGlmZmVyZW50IGFycmF5SW5kaWNlczsgaXRcbi8vICAgIGRvZXNuJ3QgYWN0dWFsbHkgJ3BhcnNlJyBhcnJheUluZGljZXMuIEFzIGFuIGFsdGVybmF0aXZlLCBhcnJheUluZGljZXNcbi8vICAgIGNvdWxkIGNvbnRhaW4gb2JqZWN0cyB3aXRoIGZsYWdzIGxpa2UgJ2ltcGxpY2l0JywgYnV0IEkgdGhpbmsgdGhhdCBvbmx5XG4vLyAgICBtYWtlcyB0aGUgY29kZSBzdXJyb3VuZGluZyB0aGVtIG1vcmUgY29tcGxleC4pXG4vL1xuLy8gICAgKEJ5IHRoZSB3YXksIHRoaXMgZmllbGQgZW5kcyB1cCBnZXR0aW5nIHBhc3NlZCBhcm91bmQgYSBsb3Qgd2l0aG91dFxuLy8gICAgY2xvbmluZywgc28gbmV2ZXIgbXV0YXRlIGFueSBhcnJheUluZGljZXMgZmllbGQvdmFyIGluIHRoaXMgcGFja2FnZSEpXG4vL1xuLy9cbi8vIEF0IHRoZSB0b3AgbGV2ZWwsIHlvdSBtYXkgb25seSBwYXNzIGluIGEgcGxhaW4gb2JqZWN0IG9yIGFycmF5LlxuLy9cbi8vIFNlZSB0aGUgdGVzdCAnbWluaW1vbmdvIC0gbG9va3VwJyBmb3Igc29tZSBleGFtcGxlcyBvZiB3aGF0IGxvb2t1cCBmdW5jdGlvbnNcbi8vIHJldHVybi5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlTG9va3VwRnVuY3Rpb24oa2V5LCBvcHRpb25zID0ge30pIHtcbiAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQoJy4nKTtcbiAgY29uc3QgZmlyc3RQYXJ0ID0gcGFydHMubGVuZ3RoID8gcGFydHNbMF0gOiAnJztcbiAgY29uc3QgbG9va3VwUmVzdCA9IChcbiAgICBwYXJ0cy5sZW5ndGggPiAxICYmXG4gICAgbWFrZUxvb2t1cEZ1bmN0aW9uKHBhcnRzLnNsaWNlKDEpLmpvaW4oJy4nKSlcbiAgKTtcblxuICBjb25zdCBvbWl0VW5uZWNlc3NhcnlGaWVsZHMgPSByZXN1bHQgPT4ge1xuICAgIGlmICghcmVzdWx0LmRvbnRJdGVyYXRlKSB7XG4gICAgICBkZWxldGUgcmVzdWx0LmRvbnRJdGVyYXRlO1xuICAgIH1cblxuICAgIGlmIChyZXN1bHQuYXJyYXlJbmRpY2VzICYmICFyZXN1bHQuYXJyYXlJbmRpY2VzLmxlbmd0aCkge1xuICAgICAgZGVsZXRlIHJlc3VsdC5hcnJheUluZGljZXM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBEb2Mgd2lsbCBhbHdheXMgYmUgYSBwbGFpbiBvYmplY3Qgb3IgYW4gYXJyYXkuXG4gIC8vIGFwcGx5IGFuIGV4cGxpY2l0IG51bWVyaWMgaW5kZXgsIGFuIGFycmF5LlxuICByZXR1cm4gKGRvYywgYXJyYXlJbmRpY2VzID0gW10pID0+IHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkb2MpKSB7XG4gICAgICAvLyBJZiB3ZSdyZSBiZWluZyBhc2tlZCB0byBkbyBhbiBpbnZhbGlkIGxvb2t1cCBpbnRvIGFuIGFycmF5IChub24taW50ZWdlclxuICAgICAgLy8gb3Igb3V0LW9mLWJvdW5kcyksIHJldHVybiBubyByZXN1bHRzICh3aGljaCBpcyBkaWZmZXJlbnQgZnJvbSByZXR1cm5pbmdcbiAgICAgIC8vIGEgc2luZ2xlIHVuZGVmaW5lZCByZXN1bHQsIGluIHRoYXQgYG51bGxgIGVxdWFsaXR5IGNoZWNrcyB3b24ndCBtYXRjaCkuXG4gICAgICBpZiAoIShpc051bWVyaWNLZXkoZmlyc3RQYXJ0KSAmJiBmaXJzdFBhcnQgPCBkb2MubGVuZ3RoKSkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgICB9XG5cbiAgICAgIC8vIFJlbWVtYmVyIHRoYXQgd2UgdXNlZCB0aGlzIGFycmF5IGluZGV4LiBJbmNsdWRlIGFuICd4JyB0byBpbmRpY2F0ZSB0aGF0XG4gICAgICAvLyB0aGUgcHJldmlvdXMgaW5kZXggY2FtZSBmcm9tIGJlaW5nIGNvbnNpZGVyZWQgYXMgYW4gZXhwbGljaXQgYXJyYXlcbiAgICAgIC8vIGluZGV4IChub3QgYnJhbmNoaW5nKS5cbiAgICAgIGFycmF5SW5kaWNlcyA9IGFycmF5SW5kaWNlcy5jb25jYXQoK2ZpcnN0UGFydCwgJ3gnKTtcbiAgICB9XG5cbiAgICAvLyBEbyBvdXIgZmlyc3QgbG9va3VwLlxuICAgIGNvbnN0IGZpcnN0TGV2ZWwgPSBkb2NbZmlyc3RQYXJ0XTtcblxuICAgIC8vIElmIHRoZXJlIGlzIG5vIGRlZXBlciB0byBkaWcsIHJldHVybiB3aGF0IHdlIGZvdW5kLlxuICAgIC8vXG4gICAgLy8gSWYgd2hhdCB3ZSBmb3VuZCBpcyBhbiBhcnJheSwgbW9zdCB2YWx1ZSBzZWxlY3RvcnMgd2lsbCBjaG9vc2UgdG8gdHJlYXRcbiAgICAvLyB0aGUgZWxlbWVudHMgb2YgdGhlIGFycmF5IGFzIG1hdGNoYWJsZSB2YWx1ZXMgaW4gdGhlaXIgb3duIHJpZ2h0LCBidXRcbiAgICAvLyB0aGF0J3MgZG9uZSBvdXRzaWRlIG9mIHRoZSBsb29rdXAgZnVuY3Rpb24uIChFeGNlcHRpb25zIHRvIHRoaXMgYXJlICRzaXplXG4gICAgLy8gYW5kIHN0dWZmIHJlbGF0aW5nIHRvICRlbGVtTWF0Y2guICBlZywge2E6IHskc2l6ZTogMn19IGRvZXMgbm90IG1hdGNoIHthOlxuICAgIC8vIFtbMSwgMl1dfS4pXG4gICAgLy9cbiAgICAvLyBUaGF0IHNhaWQsIGlmIHdlIGp1c3QgZGlkIGFuICpleHBsaWNpdCogYXJyYXkgbG9va3VwIChvbiBkb2MpIHRvIGZpbmRcbiAgICAvLyBmaXJzdExldmVsLCBhbmQgZmlyc3RMZXZlbCBpcyBhbiBhcnJheSB0b28sIHdlIGRvIE5PVCB3YW50IHZhbHVlXG4gICAgLy8gc2VsZWN0b3JzIHRvIGl0ZXJhdGUgb3ZlciBpdC4gIGVnLCB7J2EuMCc6IDV9IGRvZXMgbm90IG1hdGNoIHthOiBbWzVdXX0uXG4gICAgLy8gU28gaW4gdGhhdCBjYXNlLCB3ZSBtYXJrIHRoZSByZXR1cm4gdmFsdWUgYXMgJ2Rvbid0IGl0ZXJhdGUnLlxuICAgIGlmICghbG9va3VwUmVzdCkge1xuICAgICAgcmV0dXJuIFtvbWl0VW5uZWNlc3NhcnlGaWVsZHMoe1xuICAgICAgICBhcnJheUluZGljZXMsXG4gICAgICAgIGRvbnRJdGVyYXRlOiBBcnJheS5pc0FycmF5KGRvYykgJiYgQXJyYXkuaXNBcnJheShmaXJzdExldmVsKSxcbiAgICAgICAgdmFsdWU6IGZpcnN0TGV2ZWxcbiAgICAgIH0pXTtcbiAgICB9XG5cbiAgICAvLyBXZSBuZWVkIHRvIGRpZyBkZWVwZXIuICBCdXQgaWYgd2UgY2FuJ3QsIGJlY2F1c2Ugd2hhdCB3ZSd2ZSBmb3VuZCBpcyBub3RcbiAgICAvLyBhbiBhcnJheSBvciBwbGFpbiBvYmplY3QsIHdlJ3JlIGRvbmUuIElmIHdlIGp1c3QgZGlkIGEgbnVtZXJpYyBpbmRleCBpbnRvXG4gICAgLy8gYW4gYXJyYXksIHdlIHJldHVybiBub3RoaW5nIGhlcmUgKHRoaXMgaXMgYSBjaGFuZ2UgaW4gTW9uZ28gMi41IGZyb21cbiAgICAvLyBNb25nbyAyLjQsIHdoZXJlIHsnYS4wLmInOiBudWxsfSBzdG9wcGVkIG1hdGNoaW5nIHthOiBbNV19KS4gT3RoZXJ3aXNlLFxuICAgIC8vIHJldHVybiBhIHNpbmdsZSBgdW5kZWZpbmVkYCAod2hpY2ggY2FuLCBmb3IgZXhhbXBsZSwgbWF0Y2ggdmlhIGVxdWFsaXR5XG4gICAgLy8gd2l0aCBgbnVsbGApLlxuICAgIGlmICghaXNJbmRleGFibGUoZmlyc3RMZXZlbCkpIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGRvYykpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gW29taXRVbm5lY2Vzc2FyeUZpZWxkcyh7YXJyYXlJbmRpY2VzLCB2YWx1ZTogdW5kZWZpbmVkfSldO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IFtdO1xuICAgIGNvbnN0IGFwcGVuZFRvUmVzdWx0ID0gbW9yZSA9PiB7XG4gICAgICByZXN1bHQucHVzaCguLi5tb3JlKTtcbiAgICB9O1xuXG4gICAgLy8gRGlnIGRlZXBlcjogbG9vayB1cCB0aGUgcmVzdCBvZiB0aGUgcGFydHMgb24gd2hhdGV2ZXIgd2UndmUgZm91bmQuXG4gICAgLy8gKGxvb2t1cFJlc3QgaXMgc21hcnQgZW5vdWdoIHRvIG5vdCB0cnkgdG8gZG8gaW52YWxpZCBsb29rdXBzIGludG9cbiAgICAvLyBmaXJzdExldmVsIGlmIGl0J3MgYW4gYXJyYXkuKVxuICAgIGFwcGVuZFRvUmVzdWx0KGxvb2t1cFJlc3QoZmlyc3RMZXZlbCwgYXJyYXlJbmRpY2VzKSk7XG5cbiAgICAvLyBJZiB3ZSBmb3VuZCBhbiBhcnJheSwgdGhlbiBpbiAqYWRkaXRpb24qIHRvIHBvdGVudGlhbGx5IHRyZWF0aW5nIHRoZSBuZXh0XG4gICAgLy8gcGFydCBhcyBhIGxpdGVyYWwgaW50ZWdlciBsb29rdXAsIHdlIHNob3VsZCBhbHNvICdicmFuY2gnOiB0cnkgdG8gbG9vayB1cFxuICAgIC8vIHRoZSByZXN0IG9mIHRoZSBwYXJ0cyBvbiBlYWNoIGFycmF5IGVsZW1lbnQgaW4gcGFyYWxsZWwuXG4gICAgLy9cbiAgICAvLyBJbiB0aGlzIGNhc2UsIHdlICpvbmx5KiBkaWcgZGVlcGVyIGludG8gYXJyYXkgZWxlbWVudHMgdGhhdCBhcmUgcGxhaW5cbiAgICAvLyBvYmplY3RzLiAoUmVjYWxsIHRoYXQgd2Ugb25seSBnb3QgdGhpcyBmYXIgaWYgd2UgaGF2ZSBmdXJ0aGVyIHRvIGRpZy4pXG4gICAgLy8gVGhpcyBtYWtlcyBzZW5zZTogd2UgY2VydGFpbmx5IGRvbid0IGRpZyBkZWVwZXIgaW50byBub24taW5kZXhhYmxlXG4gICAgLy8gb2JqZWN0cy4gQW5kIGl0IHdvdWxkIGJlIHdlaXJkIHRvIGRpZyBpbnRvIGFuIGFycmF5OiBpdCdzIHNpbXBsZXIgdG8gaGF2ZVxuICAgIC8vIGEgcnVsZSB0aGF0IGV4cGxpY2l0IGludGVnZXIgaW5kZXhlcyBvbmx5IGFwcGx5IHRvIGFuIG91dGVyIGFycmF5LCBub3QgdG9cbiAgICAvLyBhbiBhcnJheSB5b3UgZmluZCBhZnRlciBhIGJyYW5jaGluZyBzZWFyY2guXG4gICAgLy9cbiAgICAvLyBJbiB0aGUgc3BlY2lhbCBjYXNlIG9mIGEgbnVtZXJpYyBwYXJ0IGluIGEgKnNvcnQgc2VsZWN0b3IqIChub3QgYSBxdWVyeVxuICAgIC8vIHNlbGVjdG9yKSwgd2Ugc2tpcCB0aGUgYnJhbmNoaW5nOiB3ZSBPTkxZIGFsbG93IHRoZSBudW1lcmljIHBhcnQgdG8gbWVhblxuICAgIC8vICdsb29rIHVwIHRoaXMgaW5kZXgnIGluIHRoYXQgY2FzZSwgbm90ICdhbHNvIGxvb2sgdXAgdGhpcyBpbmRleCBpbiBhbGxcbiAgICAvLyB0aGUgZWxlbWVudHMgb2YgdGhlIGFycmF5Jy5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShmaXJzdExldmVsKSAmJlxuICAgICAgICAhKGlzTnVtZXJpY0tleShwYXJ0c1sxXSkgJiYgb3B0aW9ucy5mb3JTb3J0KSkge1xuICAgICAgZmlyc3RMZXZlbC5mb3JFYWNoKChicmFuY2gsIGFycmF5SW5kZXgpID0+IHtcbiAgICAgICAgaWYgKExvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChicmFuY2gpKSB7XG4gICAgICAgICAgYXBwZW5kVG9SZXN1bHQobG9va3VwUmVzdChicmFuY2gsIGFycmF5SW5kaWNlcy5jb25jYXQoYXJyYXlJbmRleCkpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn1cblxuLy8gT2JqZWN0IGV4cG9ydGVkIG9ubHkgZm9yIHVuaXQgdGVzdGluZy5cbi8vIFVzZSBpdCB0byBleHBvcnQgcHJpdmF0ZSBmdW5jdGlvbnMgdG8gdGVzdCBpbiBUaW55dGVzdC5cbk1pbmltb25nb1Rlc3QgPSB7bWFrZUxvb2t1cEZ1bmN0aW9ufTtcbk1pbmltb25nb0Vycm9yID0gKG1lc3NhZ2UsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBpZiAodHlwZW9mIG1lc3NhZ2UgPT09ICdzdHJpbmcnICYmIG9wdGlvbnMuZmllbGQpIHtcbiAgICBtZXNzYWdlICs9IGAgZm9yIGZpZWxkICcke29wdGlvbnMuZmllbGR9J2A7XG4gIH1cblxuICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgZXJyb3IubmFtZSA9ICdNaW5pbW9uZ29FcnJvcic7XG4gIHJldHVybiBlcnJvcjtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBub3RoaW5nTWF0Y2hlcihkb2NPckJyYW5jaGVkVmFsdWVzKSB7XG4gIHJldHVybiB7cmVzdWx0OiBmYWxzZX07XG59XG5cbi8vIFRha2VzIGFuIG9wZXJhdG9yIG9iamVjdCAoYW4gb2JqZWN0IHdpdGggJCBrZXlzKSBhbmQgcmV0dXJucyBhIGJyYW5jaGVkXG4vLyBtYXRjaGVyIGZvciBpdC5cbmZ1bmN0aW9uIG9wZXJhdG9yQnJhbmNoZWRNYXRjaGVyKHZhbHVlU2VsZWN0b3IsIG1hdGNoZXIsIGlzUm9vdCkge1xuICAvLyBFYWNoIHZhbHVlU2VsZWN0b3Igd29ya3Mgc2VwYXJhdGVseSBvbiB0aGUgdmFyaW91cyBicmFuY2hlcy4gIFNvIG9uZVxuICAvLyBvcGVyYXRvciBjYW4gbWF0Y2ggb25lIGJyYW5jaCBhbmQgYW5vdGhlciBjYW4gbWF0Y2ggYW5vdGhlciBicmFuY2guICBUaGlzXG4gIC8vIGlzIE9LLlxuICBjb25zdCBvcGVyYXRvck1hdGNoZXJzID0gT2JqZWN0LmtleXModmFsdWVTZWxlY3RvcikubWFwKG9wZXJhdG9yID0+IHtcbiAgICBjb25zdCBvcGVyYW5kID0gdmFsdWVTZWxlY3RvcltvcGVyYXRvcl07XG5cbiAgICBjb25zdCBzaW1wbGVSYW5nZSA9IChcbiAgICAgIFsnJGx0JywgJyRsdGUnLCAnJGd0JywgJyRndGUnXS5pbmNsdWRlcyhvcGVyYXRvcikgJiZcbiAgICAgIHR5cGVvZiBvcGVyYW5kID09PSAnbnVtYmVyJ1xuICAgICk7XG5cbiAgICBjb25zdCBzaW1wbGVFcXVhbGl0eSA9IChcbiAgICAgIFsnJG5lJywgJyRlcSddLmluY2x1ZGVzKG9wZXJhdG9yKSAmJlxuICAgICAgb3BlcmFuZCAhPT0gT2JqZWN0KG9wZXJhbmQpXG4gICAgKTtcblxuICAgIGNvbnN0IHNpbXBsZUluY2x1c2lvbiA9IChcbiAgICAgIFsnJGluJywgJyRuaW4nXS5pbmNsdWRlcyhvcGVyYXRvcilcbiAgICAgICYmIEFycmF5LmlzQXJyYXkob3BlcmFuZClcbiAgICAgICYmICFvcGVyYW5kLnNvbWUoeCA9PiB4ID09PSBPYmplY3QoeCkpXG4gICAgKTtcblxuICAgIGlmICghKHNpbXBsZVJhbmdlIHx8IHNpbXBsZUluY2x1c2lvbiB8fCBzaW1wbGVFcXVhbGl0eSkpIHtcbiAgICAgIG1hdGNoZXIuX2lzU2ltcGxlID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKGhhc093bi5jYWxsKFZBTFVFX09QRVJBVE9SUywgb3BlcmF0b3IpKSB7XG4gICAgICByZXR1cm4gVkFMVUVfT1BFUkFUT1JTW29wZXJhdG9yXShvcGVyYW5kLCB2YWx1ZVNlbGVjdG9yLCBtYXRjaGVyLCBpc1Jvb3QpO1xuICAgIH1cblxuICAgIGlmIChoYXNPd24uY2FsbChFTEVNRU5UX09QRVJBVE9SUywgb3BlcmF0b3IpKSB7XG4gICAgICBjb25zdCBvcHRpb25zID0gRUxFTUVOVF9PUEVSQVRPUlNbb3BlcmF0b3JdO1xuICAgICAgcmV0dXJuIGNvbnZlcnRFbGVtZW50TWF0Y2hlclRvQnJhbmNoZWRNYXRjaGVyKFxuICAgICAgICBvcHRpb25zLmNvbXBpbGVFbGVtZW50U2VsZWN0b3Iob3BlcmFuZCwgdmFsdWVTZWxlY3RvciwgbWF0Y2hlciksXG4gICAgICAgIG9wdGlvbnNcbiAgICAgICk7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKGBVbnJlY29nbml6ZWQgb3BlcmF0b3I6ICR7b3BlcmF0b3J9YCk7XG4gIH0pO1xuXG4gIHJldHVybiBhbmRCcmFuY2hlZE1hdGNoZXJzKG9wZXJhdG9yTWF0Y2hlcnMpO1xufVxuXG4vLyBwYXRocyAtIEFycmF5OiBsaXN0IG9mIG1vbmdvIHN0eWxlIHBhdGhzXG4vLyBuZXdMZWFmRm4gLSBGdW5jdGlvbjogb2YgZm9ybSBmdW5jdGlvbihwYXRoKSBzaG91bGQgcmV0dXJuIGEgc2NhbGFyIHZhbHVlIHRvXG4vLyAgICAgICAgICAgICAgICAgICAgICAgcHV0IGludG8gbGlzdCBjcmVhdGVkIGZvciB0aGF0IHBhdGhcbi8vIGNvbmZsaWN0Rm4gLSBGdW5jdGlvbjogb2YgZm9ybSBmdW5jdGlvbihub2RlLCBwYXRoLCBmdWxsUGF0aCkgaXMgY2FsbGVkXG4vLyAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gYnVpbGRpbmcgYSB0cmVlIHBhdGggZm9yICdmdWxsUGF0aCcgbm9kZSBvblxuLy8gICAgICAgICAgICAgICAgICAgICAgICAncGF0aCcgd2FzIGFscmVhZHkgYSBsZWFmIHdpdGggYSB2YWx1ZS4gTXVzdCByZXR1cm4gYVxuLy8gICAgICAgICAgICAgICAgICAgICAgICBjb25mbGljdCByZXNvbHV0aW9uLlxuLy8gaW5pdGlhbCB0cmVlIC0gT3B0aW9uYWwgT2JqZWN0OiBzdGFydGluZyB0cmVlLlxuLy8gQHJldHVybnMgLSBPYmplY3Q6IHRyZWUgcmVwcmVzZW50ZWQgYXMgYSBzZXQgb2YgbmVzdGVkIG9iamVjdHNcbmV4cG9ydCBmdW5jdGlvbiBwYXRoc1RvVHJlZShwYXRocywgbmV3TGVhZkZuLCBjb25mbGljdEZuLCByb290ID0ge30pIHtcbiAgcGF0aHMuZm9yRWFjaChwYXRoID0+IHtcbiAgICBjb25zdCBwYXRoQXJyYXkgPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgbGV0IHRyZWUgPSByb290O1xuXG4gICAgLy8gdXNlIC5ldmVyeSBqdXN0IGZvciBpdGVyYXRpb24gd2l0aCBicmVha1xuICAgIGNvbnN0IHN1Y2Nlc3MgPSBwYXRoQXJyYXkuc2xpY2UoMCwgLTEpLmV2ZXJ5KChrZXksIGkpID0+IHtcbiAgICAgIGlmICghaGFzT3duLmNhbGwodHJlZSwga2V5KSkge1xuICAgICAgICB0cmVlW2tleV0gPSB7fTtcbiAgICAgIH0gZWxzZSBpZiAodHJlZVtrZXldICE9PSBPYmplY3QodHJlZVtrZXldKSkge1xuICAgICAgICB0cmVlW2tleV0gPSBjb25mbGljdEZuKFxuICAgICAgICAgIHRyZWVba2V5XSxcbiAgICAgICAgICBwYXRoQXJyYXkuc2xpY2UoMCwgaSArIDEpLmpvaW4oJy4nKSxcbiAgICAgICAgICBwYXRoXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gYnJlYWsgb3V0IG9mIGxvb3AgaWYgd2UgYXJlIGZhaWxpbmcgZm9yIHRoaXMgcGF0aFxuICAgICAgICBpZiAodHJlZVtrZXldICE9PSBPYmplY3QodHJlZVtrZXldKSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0cmVlID0gdHJlZVtrZXldO1xuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcblxuICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICBjb25zdCBsYXN0S2V5ID0gcGF0aEFycmF5W3BhdGhBcnJheS5sZW5ndGggLSAxXTtcbiAgICAgIGlmIChoYXNPd24uY2FsbCh0cmVlLCBsYXN0S2V5KSkge1xuICAgICAgICB0cmVlW2xhc3RLZXldID0gY29uZmxpY3RGbih0cmVlW2xhc3RLZXldLCBwYXRoLCBwYXRoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRyZWVbbGFzdEtleV0gPSBuZXdMZWFmRm4ocGF0aCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcm9vdDtcbn1cblxuLy8gTWFrZXMgc3VyZSB3ZSBnZXQgMiBlbGVtZW50cyBhcnJheSBhbmQgYXNzdW1lIHRoZSBmaXJzdCBvbmUgdG8gYmUgeCBhbmRcbi8vIHRoZSBzZWNvbmQgb25lIHRvIHkgbm8gbWF0dGVyIHdoYXQgdXNlciBwYXNzZXMuXG4vLyBJbiBjYXNlIHVzZXIgcGFzc2VzIHsgbG9uOiB4LCBsYXQ6IHkgfSByZXR1cm5zIFt4LCB5XVxuZnVuY3Rpb24gcG9pbnRUb0FycmF5KHBvaW50KSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KHBvaW50KSA/IHBvaW50LnNsaWNlKCkgOiBbcG9pbnQueCwgcG9pbnQueV07XG59XG5cbi8vIENyZWF0aW5nIGEgZG9jdW1lbnQgZnJvbSBhbiB1cHNlcnQgaXMgcXVpdGUgdHJpY2t5LlxuLy8gRS5nLiB0aGlzIHNlbGVjdG9yOiB7XCIkb3JcIjogW3tcImIuZm9vXCI6IHtcIiRhbGxcIjogW1wiYmFyXCJdfX1dfSwgc2hvdWxkIHJlc3VsdFxuLy8gaW46IHtcImIuZm9vXCI6IFwiYmFyXCJ9XG4vLyBCdXQgdGhpcyBzZWxlY3Rvcjoge1wiJG9yXCI6IFt7XCJiXCI6IHtcImZvb1wiOiB7XCIkYWxsXCI6IFtcImJhclwiXX19fV19IHNob3VsZCB0aHJvd1xuLy8gYW4gZXJyb3JcblxuLy8gU29tZSBydWxlcyAoZm91bmQgbWFpbmx5IHdpdGggdHJpYWwgJiBlcnJvciwgc28gdGhlcmUgbWlnaHQgYmUgbW9yZSk6XG4vLyAtIGhhbmRsZSBhbGwgY2hpbGRzIG9mICRhbmQgKG9yIGltcGxpY2l0ICRhbmQpXG4vLyAtIGhhbmRsZSAkb3Igbm9kZXMgd2l0aCBleGFjdGx5IDEgY2hpbGRcbi8vIC0gaWdub3JlICRvciBub2RlcyB3aXRoIG1vcmUgdGhhbiAxIGNoaWxkXG4vLyAtIGlnbm9yZSAkbm9yIGFuZCAkbm90IG5vZGVzXG4vLyAtIHRocm93IHdoZW4gYSB2YWx1ZSBjYW4gbm90IGJlIHNldCB1bmFtYmlndW91c2x5XG4vLyAtIGV2ZXJ5IHZhbHVlIGZvciAkYWxsIHNob3VsZCBiZSBkZWFsdCB3aXRoIGFzIHNlcGFyYXRlICRlcS1zXG4vLyAtIHRocmVhdCBhbGwgY2hpbGRyZW4gb2YgJGFsbCBhcyAkZXEgc2V0dGVycyAoPT4gc2V0IGlmICRhbGwubGVuZ3RoID09PSAxLFxuLy8gICBvdGhlcndpc2UgdGhyb3cgZXJyb3IpXG4vLyAtIHlvdSBjYW4gbm90IG1peCAnJCctcHJlZml4ZWQga2V5cyBhbmQgbm9uLSckJy1wcmVmaXhlZCBrZXlzXG4vLyAtIHlvdSBjYW4gb25seSBoYXZlIGRvdHRlZCBrZXlzIG9uIGEgcm9vdC1sZXZlbFxuLy8gLSB5b3UgY2FuIG5vdCBoYXZlICckJy1wcmVmaXhlZCBrZXlzIG1vcmUgdGhhbiBvbmUtbGV2ZWwgZGVlcCBpbiBhbiBvYmplY3RcblxuLy8gSGFuZGxlcyBvbmUga2V5L3ZhbHVlIHBhaXIgdG8gcHV0IGluIHRoZSBzZWxlY3RvciBkb2N1bWVudFxuZnVuY3Rpb24gcG9wdWxhdGVEb2N1bWVudFdpdGhLZXlWYWx1ZShkb2N1bWVudCwga2V5LCB2YWx1ZSkge1xuICBpZiAodmFsdWUgJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKSA9PT0gT2JqZWN0LnByb3RvdHlwZSkge1xuICAgIHBvcHVsYXRlRG9jdW1lbnRXaXRoT2JqZWN0KGRvY3VtZW50LCBrZXksIHZhbHVlKTtcbiAgfSBlbHNlIGlmICghKHZhbHVlIGluc3RhbmNlb2YgUmVnRXhwKSkge1xuICAgIGluc2VydEludG9Eb2N1bWVudChkb2N1bWVudCwga2V5LCB2YWx1ZSk7XG4gIH1cbn1cblxuLy8gSGFuZGxlcyBhIGtleSwgdmFsdWUgcGFpciB0byBwdXQgaW4gdGhlIHNlbGVjdG9yIGRvY3VtZW50XG4vLyBpZiB0aGUgdmFsdWUgaXMgYW4gb2JqZWN0XG5mdW5jdGlvbiBwb3B1bGF0ZURvY3VtZW50V2l0aE9iamVjdChkb2N1bWVudCwga2V5LCB2YWx1ZSkge1xuICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICBjb25zdCB1bnByZWZpeGVkS2V5cyA9IGtleXMuZmlsdGVyKG9wID0+IG9wWzBdICE9PSAnJCcpO1xuXG4gIGlmICh1bnByZWZpeGVkS2V5cy5sZW5ndGggPiAwIHx8ICFrZXlzLmxlbmd0aCkge1xuICAgIC8vIExpdGVyYWwgKHBvc3NpYmx5IGVtcHR5KSBvYmplY3QgKCBvciBlbXB0eSBvYmplY3QgKVxuICAgIC8vIERvbid0IGFsbG93IG1peGluZyAnJCctcHJlZml4ZWQgd2l0aCBub24tJyQnLXByZWZpeGVkIGZpZWxkc1xuICAgIGlmIChrZXlzLmxlbmd0aCAhPT0gdW5wcmVmaXhlZEtleXMubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHVua25vd24gb3BlcmF0b3I6ICR7dW5wcmVmaXhlZEtleXNbMF19YCk7XG4gICAgfVxuXG4gICAgdmFsaWRhdGVPYmplY3QodmFsdWUsIGtleSk7XG4gICAgaW5zZXJ0SW50b0RvY3VtZW50KGRvY3VtZW50LCBrZXksIHZhbHVlKTtcbiAgfSBlbHNlIHtcbiAgICBPYmplY3Qua2V5cyh2YWx1ZSkuZm9yRWFjaChvcCA9PiB7XG4gICAgICBjb25zdCBvYmplY3QgPSB2YWx1ZVtvcF07XG5cbiAgICAgIGlmIChvcCA9PT0gJyRlcScpIHtcbiAgICAgICAgcG9wdWxhdGVEb2N1bWVudFdpdGhLZXlWYWx1ZShkb2N1bWVudCwga2V5LCBvYmplY3QpO1xuICAgICAgfSBlbHNlIGlmIChvcCA9PT0gJyRhbGwnKSB7XG4gICAgICAgIC8vIGV2ZXJ5IHZhbHVlIGZvciAkYWxsIHNob3VsZCBiZSBkZWFsdCB3aXRoIGFzIHNlcGFyYXRlICRlcS1zXG4gICAgICAgIG9iamVjdC5mb3JFYWNoKGVsZW1lbnQgPT5cbiAgICAgICAgICBwb3B1bGF0ZURvY3VtZW50V2l0aEtleVZhbHVlKGRvY3VtZW50LCBrZXksIGVsZW1lbnQpXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuLy8gRmlsbHMgYSBkb2N1bWVudCB3aXRoIGNlcnRhaW4gZmllbGRzIGZyb20gYW4gdXBzZXJ0IHNlbGVjdG9yXG5leHBvcnQgZnVuY3Rpb24gcG9wdWxhdGVEb2N1bWVudFdpdGhRdWVyeUZpZWxkcyhxdWVyeSwgZG9jdW1lbnQgPSB7fSkge1xuICBpZiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKHF1ZXJ5KSA9PT0gT2JqZWN0LnByb3RvdHlwZSkge1xuICAgIC8vIGhhbmRsZSBpbXBsaWNpdCAkYW5kXG4gICAgT2JqZWN0LmtleXMocXVlcnkpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlID0gcXVlcnlba2V5XTtcblxuICAgICAgaWYgKGtleSA9PT0gJyRhbmQnKSB7XG4gICAgICAgIC8vIGhhbmRsZSBleHBsaWNpdCAkYW5kXG4gICAgICAgIHZhbHVlLmZvckVhY2goZWxlbWVudCA9PlxuICAgICAgICAgIHBvcHVsYXRlRG9jdW1lbnRXaXRoUXVlcnlGaWVsZHMoZWxlbWVudCwgZG9jdW1lbnQpXG4gICAgICAgICk7XG4gICAgICB9IGVsc2UgaWYgKGtleSA9PT0gJyRvcicpIHtcbiAgICAgICAgLy8gaGFuZGxlICRvciBub2RlcyB3aXRoIGV4YWN0bHkgMSBjaGlsZFxuICAgICAgICBpZiAodmFsdWUubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgcG9wdWxhdGVEb2N1bWVudFdpdGhRdWVyeUZpZWxkcyh2YWx1ZVswXSwgZG9jdW1lbnQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGtleVswXSAhPT0gJyQnKSB7XG4gICAgICAgIC8vIElnbm9yZSBvdGhlciAnJCctcHJlZml4ZWQgbG9naWNhbCBzZWxlY3RvcnNcbiAgICAgICAgcG9wdWxhdGVEb2N1bWVudFdpdGhLZXlWYWx1ZShkb2N1bWVudCwga2V5LCB2YWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gSGFuZGxlIG1ldGVvci1zcGVjaWZpYyBzaG9ydGN1dCBmb3Igc2VsZWN0aW5nIF9pZFxuICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZChxdWVyeSkpIHtcbiAgICAgIGluc2VydEludG9Eb2N1bWVudChkb2N1bWVudCwgJ19pZCcsIHF1ZXJ5KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZG9jdW1lbnQ7XG59XG5cbi8vIFRyYXZlcnNlcyB0aGUga2V5cyBvZiBwYXNzZWQgcHJvamVjdGlvbiBhbmQgY29uc3RydWN0cyBhIHRyZWUgd2hlcmUgYWxsXG4vLyBsZWF2ZXMgYXJlIGVpdGhlciBhbGwgVHJ1ZSBvciBhbGwgRmFsc2Vcbi8vIEByZXR1cm5zIE9iamVjdDpcbi8vICAtIHRyZWUgLSBPYmplY3QgLSB0cmVlIHJlcHJlc2VudGF0aW9uIG9mIGtleXMgaW52b2x2ZWQgaW4gcHJvamVjdGlvblxuLy8gIChleGNlcHRpb24gZm9yICdfaWQnIGFzIGl0IGlzIGEgc3BlY2lhbCBjYXNlIGhhbmRsZWQgc2VwYXJhdGVseSlcbi8vICAtIGluY2x1ZGluZyAtIEJvb2xlYW4gLSBcInRha2Ugb25seSBjZXJ0YWluIGZpZWxkc1wiIHR5cGUgb2YgcHJvamVjdGlvblxuZXhwb3J0IGZ1bmN0aW9uIHByb2plY3Rpb25EZXRhaWxzKGZpZWxkcykge1xuICAvLyBGaW5kIHRoZSBub24tX2lkIGtleXMgKF9pZCBpcyBoYW5kbGVkIHNwZWNpYWxseSBiZWNhdXNlIGl0IGlzIGluY2x1ZGVkXG4gIC8vIHVubGVzcyBleHBsaWNpdGx5IGV4Y2x1ZGVkKS4gU29ydCB0aGUga2V5cywgc28gdGhhdCBvdXIgY29kZSB0byBkZXRlY3RcbiAgLy8gb3ZlcmxhcHMgbGlrZSAnZm9vJyBhbmQgJ2Zvby5iYXInIGNhbiBhc3N1bWUgdGhhdCAnZm9vJyBjb21lcyBmaXJzdC5cbiAgbGV0IGZpZWxkc0tleXMgPSBPYmplY3Qua2V5cyhmaWVsZHMpLnNvcnQoKTtcblxuICAvLyBJZiBfaWQgaXMgdGhlIG9ubHkgZmllbGQgaW4gdGhlIHByb2plY3Rpb24sIGRvIG5vdCByZW1vdmUgaXQsIHNpbmNlIGl0IGlzXG4gIC8vIHJlcXVpcmVkIHRvIGRldGVybWluZSBpZiB0aGlzIGlzIGFuIGV4Y2x1c2lvbiBvciBleGNsdXNpb24uIEFsc28ga2VlcCBhblxuICAvLyBpbmNsdXNpdmUgX2lkLCBzaW5jZSBpbmNsdXNpdmUgX2lkIGZvbGxvd3MgdGhlIG5vcm1hbCBydWxlcyBhYm91dCBtaXhpbmdcbiAgLy8gaW5jbHVzaXZlIGFuZCBleGNsdXNpdmUgZmllbGRzLiBJZiBfaWQgaXMgbm90IHRoZSBvbmx5IGZpZWxkIGluIHRoZVxuICAvLyBwcm9qZWN0aW9uIGFuZCBpcyBleGNsdXNpdmUsIHJlbW92ZSBpdCBzbyBpdCBjYW4gYmUgaGFuZGxlZCBsYXRlciBieSBhXG4gIC8vIHNwZWNpYWwgY2FzZSwgc2luY2UgZXhjbHVzaXZlIF9pZCBpcyBhbHdheXMgYWxsb3dlZC5cbiAgaWYgKCEoZmllbGRzS2V5cy5sZW5ndGggPT09IDEgJiYgZmllbGRzS2V5c1swXSA9PT0gJ19pZCcpICYmXG4gICAgICAhKGZpZWxkc0tleXMuaW5jbHVkZXMoJ19pZCcpICYmIGZpZWxkcy5faWQpKSB7XG4gICAgZmllbGRzS2V5cyA9IGZpZWxkc0tleXMuZmlsdGVyKGtleSA9PiBrZXkgIT09ICdfaWQnKTtcbiAgfVxuXG4gIGxldCBpbmNsdWRpbmcgPSBudWxsOyAvLyBVbmtub3duXG5cbiAgZmllbGRzS2V5cy5mb3JFYWNoKGtleVBhdGggPT4ge1xuICAgIGNvbnN0IHJ1bGUgPSAhIWZpZWxkc1trZXlQYXRoXTtcblxuICAgIGlmIChpbmNsdWRpbmcgPT09IG51bGwpIHtcbiAgICAgIGluY2x1ZGluZyA9IHJ1bGU7XG4gICAgfVxuXG4gICAgLy8gVGhpcyBlcnJvciBtZXNzYWdlIGlzIGNvcGllZCBmcm9tIE1vbmdvREIgc2hlbGxcbiAgICBpZiAoaW5jbHVkaW5nICE9PSBydWxlKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ1lvdSBjYW5ub3QgY3VycmVudGx5IG1peCBpbmNsdWRpbmcgYW5kIGV4Y2x1ZGluZyBmaWVsZHMuJ1xuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IHByb2plY3Rpb25SdWxlc1RyZWUgPSBwYXRoc1RvVHJlZShcbiAgICBmaWVsZHNLZXlzLFxuICAgIHBhdGggPT4gaW5jbHVkaW5nLFxuICAgIChub2RlLCBwYXRoLCBmdWxsUGF0aCkgPT4ge1xuICAgICAgLy8gQ2hlY2sgcGFzc2VkIHByb2plY3Rpb24gZmllbGRzJyBrZXlzOiBJZiB5b3UgaGF2ZSB0d28gcnVsZXMgc3VjaCBhc1xuICAgICAgLy8gJ2Zvby5iYXInIGFuZCAnZm9vLmJhci5iYXonLCB0aGVuIHRoZSByZXN1bHQgYmVjb21lcyBhbWJpZ3VvdXMuIElmXG4gICAgICAvLyB0aGF0IGhhcHBlbnMsIHRoZXJlIGlzIGEgcHJvYmFiaWxpdHkgeW91IGFyZSBkb2luZyBzb21ldGhpbmcgd3JvbmcsXG4gICAgICAvLyBmcmFtZXdvcmsgc2hvdWxkIG5vdGlmeSB5b3UgYWJvdXQgc3VjaCBtaXN0YWtlIGVhcmxpZXIgb24gY3Vyc29yXG4gICAgICAvLyBjb21waWxhdGlvbiBzdGVwIHRoYW4gbGF0ZXIgZHVyaW5nIHJ1bnRpbWUuICBOb3RlLCB0aGF0IHJlYWwgbW9uZ29cbiAgICAgIC8vIGRvZXNuJ3QgZG8gYW55dGhpbmcgYWJvdXQgaXQgYW5kIHRoZSBsYXRlciBydWxlIGFwcGVhcnMgaW4gcHJvamVjdGlvblxuICAgICAgLy8gcHJvamVjdCwgbW9yZSBwcmlvcml0eSBpdCB0YWtlcy5cbiAgICAgIC8vXG4gICAgICAvLyBFeGFtcGxlLCBhc3N1bWUgZm9sbG93aW5nIGluIG1vbmdvIHNoZWxsOlxuICAgICAgLy8gPiBkYi5jb2xsLmluc2VydCh7IGE6IHsgYjogMjMsIGM6IDQ0IH0gfSlcbiAgICAgIC8vID4gZGIuY29sbC5maW5kKHt9LCB7ICdhJzogMSwgJ2EuYic6IDEgfSlcbiAgICAgIC8vIHtcIl9pZFwiOiBPYmplY3RJZChcIjUyMGJmZTQ1NjAyNDYwOGU4ZWYyNGFmM1wiKSwgXCJhXCI6IHtcImJcIjogMjN9fVxuICAgICAgLy8gPiBkYi5jb2xsLmZpbmQoe30sIHsgJ2EuYic6IDEsICdhJzogMSB9KVxuICAgICAgLy8ge1wiX2lkXCI6IE9iamVjdElkKFwiNTIwYmZlNDU2MDI0NjA4ZThlZjI0YWYzXCIpLCBcImFcIjoge1wiYlwiOiAyMywgXCJjXCI6IDQ0fX1cbiAgICAgIC8vXG4gICAgICAvLyBOb3RlLCBob3cgc2Vjb25kIHRpbWUgdGhlIHJldHVybiBzZXQgb2Yga2V5cyBpcyBkaWZmZXJlbnQuXG4gICAgICBjb25zdCBjdXJyZW50UGF0aCA9IGZ1bGxQYXRoO1xuICAgICAgY29uc3QgYW5vdGhlclBhdGggPSBwYXRoO1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgIGBib3RoICR7Y3VycmVudFBhdGh9IGFuZCAke2Fub3RoZXJQYXRofSBmb3VuZCBpbiBmaWVsZHMgb3B0aW9uLCBgICtcbiAgICAgICAgJ3VzaW5nIGJvdGggb2YgdGhlbSBtYXkgdHJpZ2dlciB1bmV4cGVjdGVkIGJlaGF2aW9yLiBEaWQgeW91IG1lYW4gdG8gJyArXG4gICAgICAgICd1c2Ugb25seSBvbmUgb2YgdGhlbT8nXG4gICAgICApO1xuICAgIH0pO1xuXG4gIHJldHVybiB7aW5jbHVkaW5nLCB0cmVlOiBwcm9qZWN0aW9uUnVsZXNUcmVlfTtcbn1cblxuLy8gVGFrZXMgYSBSZWdFeHAgb2JqZWN0IGFuZCByZXR1cm5zIGFuIGVsZW1lbnQgbWF0Y2hlci5cbmV4cG9ydCBmdW5jdGlvbiByZWdleHBFbGVtZW50TWF0Y2hlcihyZWdleHApIHtcbiAgcmV0dXJuIHZhbHVlID0+IHtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpID09PSByZWdleHAudG9TdHJpbmcoKTtcbiAgICB9XG5cbiAgICAvLyBSZWdleHBzIG9ubHkgd29yayBhZ2FpbnN0IHN0cmluZ3MuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBSZXNldCByZWdleHAncyBzdGF0ZSB0byBhdm9pZCBpbmNvbnNpc3RlbnQgbWF0Y2hpbmcgZm9yIG9iamVjdHMgd2l0aCB0aGVcbiAgICAvLyBzYW1lIHZhbHVlIG9uIGNvbnNlY3V0aXZlIGNhbGxzIG9mIHJlZ2V4cC50ZXN0LiBUaGlzIGhhcHBlbnMgb25seSBpZiB0aGVcbiAgICAvLyByZWdleHAgaGFzIHRoZSAnZycgZmxhZy4gQWxzbyBub3RlIHRoYXQgRVM2IGludHJvZHVjZXMgYSBuZXcgZmxhZyAneScgZm9yXG4gICAgLy8gd2hpY2ggd2Ugc2hvdWxkICpub3QqIGNoYW5nZSB0aGUgbGFzdEluZGV4IGJ1dCBNb25nb0RCIGRvZXNuJ3Qgc3VwcG9ydFxuICAgIC8vIGVpdGhlciBvZiB0aGVzZSBmbGFncy5cbiAgICByZWdleHAubGFzdEluZGV4ID0gMDtcblxuICAgIHJldHVybiByZWdleHAudGVzdCh2YWx1ZSk7XG4gIH07XG59XG5cbi8vIFZhbGlkYXRlcyB0aGUga2V5IGluIGEgcGF0aC5cbi8vIE9iamVjdHMgdGhhdCBhcmUgbmVzdGVkIG1vcmUgdGhlbiAxIGxldmVsIGNhbm5vdCBoYXZlIGRvdHRlZCBmaWVsZHNcbi8vIG9yIGZpZWxkcyBzdGFydGluZyB3aXRoICckJ1xuZnVuY3Rpb24gdmFsaWRhdGVLZXlJblBhdGgoa2V5LCBwYXRoKSB7XG4gIGlmIChrZXkuaW5jbHVkZXMoJy4nKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBUaGUgZG90dGVkIGZpZWxkICcke2tleX0nIGluICcke3BhdGh9LiR7a2V5fSBpcyBub3QgdmFsaWQgZm9yIHN0b3JhZ2UuYFxuICAgICk7XG4gIH1cblxuICBpZiAoa2V5WzBdID09PSAnJCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgVGhlIGRvbGxhciAoJCkgcHJlZml4ZWQgZmllbGQgICcke3BhdGh9LiR7a2V5fSBpcyBub3QgdmFsaWQgZm9yIHN0b3JhZ2UuYFxuICAgICk7XG4gIH1cbn1cblxuLy8gUmVjdXJzaXZlbHkgdmFsaWRhdGVzIGFuIG9iamVjdCB0aGF0IGlzIG5lc3RlZCBtb3JlIHRoYW4gb25lIGxldmVsIGRlZXBcbmZ1bmN0aW9uIHZhbGlkYXRlT2JqZWN0KG9iamVjdCwgcGF0aCkge1xuICBpZiAob2JqZWN0ICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmplY3QpID09PSBPYmplY3QucHJvdG90eXBlKSB7XG4gICAgT2JqZWN0LmtleXMob2JqZWN0KS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICB2YWxpZGF0ZUtleUluUGF0aChrZXksIHBhdGgpO1xuICAgICAgdmFsaWRhdGVPYmplY3Qob2JqZWN0W2tleV0sIHBhdGggKyAnLicgKyBrZXkpO1xuICAgIH0pO1xuICB9XG59XG4iLCJpbXBvcnQgTG9jYWxDb2xsZWN0aW9uIGZyb20gJy4vbG9jYWxfY29sbGVjdGlvbi5qcyc7XG5pbXBvcnQgeyBoYXNPd24gfSBmcm9tICcuL2NvbW1vbi5qcyc7XG5cbi8vIEN1cnNvcjogYSBzcGVjaWZpY2F0aW9uIGZvciBhIHBhcnRpY3VsYXIgc3Vic2V0IG9mIGRvY3VtZW50cywgdy8gYSBkZWZpbmVkXG4vLyBvcmRlciwgbGltaXQsIGFuZCBvZmZzZXQuICBjcmVhdGluZyBhIEN1cnNvciB3aXRoIExvY2FsQ29sbGVjdGlvbi5maW5kKCksXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDdXJzb3Ige1xuICAvLyBkb24ndCBjYWxsIHRoaXMgY3RvciBkaXJlY3RseS4gIHVzZSBMb2NhbENvbGxlY3Rpb24uZmluZCgpLlxuICBjb25zdHJ1Y3Rvcihjb2xsZWN0aW9uLCBzZWxlY3Rvciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5jb2xsZWN0aW9uID0gY29sbGVjdGlvbjtcbiAgICB0aGlzLnNvcnRlciA9IG51bGw7XG4gICAgdGhpcy5tYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKHNlbGVjdG9yKTtcblxuICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZFBlcmhhcHNBc09iamVjdChzZWxlY3RvcikpIHtcbiAgICAgIC8vIHN0YXNoIGZvciBmYXN0IF9pZCBhbmQgeyBfaWQgfVxuICAgICAgdGhpcy5fc2VsZWN0b3JJZCA9IGhhc093bi5jYWxsKHNlbGVjdG9yLCAnX2lkJylcbiAgICAgICAgPyBzZWxlY3Rvci5faWRcbiAgICAgICAgOiBzZWxlY3RvcjtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fc2VsZWN0b3JJZCA9IHVuZGVmaW5lZDtcblxuICAgICAgaWYgKHRoaXMubWF0Y2hlci5oYXNHZW9RdWVyeSgpIHx8IG9wdGlvbnMuc29ydCkge1xuICAgICAgICB0aGlzLnNvcnRlciA9IG5ldyBNaW5pbW9uZ28uU29ydGVyKFxuICAgICAgICAgIG9wdGlvbnMuc29ydCB8fCBbXSxcbiAgICAgICAgICB7bWF0Y2hlcjogdGhpcy5tYXRjaGVyfVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuc2tpcCA9IG9wdGlvbnMuc2tpcCB8fCAwO1xuICAgIHRoaXMubGltaXQgPSBvcHRpb25zLmxpbWl0O1xuICAgIHRoaXMuZmllbGRzID0gb3B0aW9ucy5maWVsZHM7XG5cbiAgICB0aGlzLl9wcm9qZWN0aW9uRm4gPSBMb2NhbENvbGxlY3Rpb24uX2NvbXBpbGVQcm9qZWN0aW9uKHRoaXMuZmllbGRzIHx8IHt9KTtcblxuICAgIHRoaXMuX3RyYW5zZm9ybSA9IExvY2FsQ29sbGVjdGlvbi53cmFwVHJhbnNmb3JtKG9wdGlvbnMudHJhbnNmb3JtKTtcblxuICAgIC8vIGJ5IGRlZmF1bHQsIHF1ZXJpZXMgcmVnaXN0ZXIgdy8gVHJhY2tlciB3aGVuIGl0IGlzIGF2YWlsYWJsZS5cbiAgICBpZiAodHlwZW9mIFRyYWNrZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLnJlYWN0aXZlID0gb3B0aW9ucy5yZWFjdGl2ZSA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IG9wdGlvbnMucmVhY3RpdmU7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgdGhlIG51bWJlciBvZiBkb2N1bWVudHMgdGhhdCBtYXRjaCBhIHF1ZXJ5LlxuICAgKiBAbWVtYmVyT2YgTW9uZ28uQ3Vyc29yXG4gICAqIEBtZXRob2QgIGNvdW50XG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2FwcGx5U2tpcExpbWl0PXRydWVdIElmIHNldCB0byBgZmFsc2VgLCB0aGUgdmFsdWVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybmVkIHdpbGwgcmVmbGVjdCB0aGUgdG90YWxcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlciBvZiBtYXRjaGluZyBkb2N1bWVudHMsXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZ25vcmluZyBhbnkgdmFsdWUgc3VwcGxpZWQgZm9yXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW1pdFxuICAgKiBAaW5zdGFuY2VcbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gICAqL1xuICBjb3VudChhcHBseVNraXBMaW1pdCA9IHRydWUpIHtcbiAgICBpZiAodGhpcy5yZWFjdGl2ZSkge1xuICAgICAgLy8gYWxsb3cgdGhlIG9ic2VydmUgdG8gYmUgdW5vcmRlcmVkXG4gICAgICB0aGlzLl9kZXBlbmQoe2FkZGVkOiB0cnVlLCByZW1vdmVkOiB0cnVlfSwgdHJ1ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2dldFJhd09iamVjdHMoe1xuICAgICAgb3JkZXJlZDogdHJ1ZSxcbiAgICAgIGFwcGx5U2tpcExpbWl0XG4gICAgfSkubGVuZ3RoO1xuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFJldHVybiBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzIGFzIGFuIEFycmF5LlxuICAgKiBAbWVtYmVyT2YgTW9uZ28uQ3Vyc29yXG4gICAqIEBtZXRob2QgIGZldGNoXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQHJldHVybnMge09iamVjdFtdfVxuICAgKi9cbiAgZmV0Y2goKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gW107XG5cbiAgICB0aGlzLmZvckVhY2goZG9jID0+IHtcbiAgICAgIHJlc3VsdC5wdXNoKGRvYyk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgaWYgKHRoaXMucmVhY3RpdmUpIHtcbiAgICAgIHRoaXMuX2RlcGVuZCh7XG4gICAgICAgIGFkZGVkQmVmb3JlOiB0cnVlLFxuICAgICAgICByZW1vdmVkOiB0cnVlLFxuICAgICAgICBjaGFuZ2VkOiB0cnVlLFxuICAgICAgICBtb3ZlZEJlZm9yZTogdHJ1ZX0pO1xuICAgIH1cblxuICAgIGxldCBpbmRleCA9IDA7XG4gICAgY29uc3Qgb2JqZWN0cyA9IHRoaXMuX2dldFJhd09iamVjdHMoe29yZGVyZWQ6IHRydWV9KTtcblxuICAgIHJldHVybiB7XG4gICAgICBuZXh0OiAoKSA9PiB7XG4gICAgICAgIGlmIChpbmRleCA8IG9iamVjdHMubGVuZ3RoKSB7XG4gICAgICAgICAgLy8gVGhpcyBkb3VibGVzIGFzIGEgY2xvbmUgb3BlcmF0aW9uLlxuICAgICAgICAgIGxldCBlbGVtZW50ID0gdGhpcy5fcHJvamVjdGlvbkZuKG9iamVjdHNbaW5kZXgrK10pO1xuXG4gICAgICAgICAgaWYgKHRoaXMuX3RyYW5zZm9ybSlcbiAgICAgICAgICAgIGVsZW1lbnQgPSB0aGlzLl90cmFuc2Zvcm0oZWxlbWVudCk7XG5cbiAgICAgICAgICByZXR1cm4ge3ZhbHVlOiBlbGVtZW50fTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7ZG9uZTogdHJ1ZX07XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAY2FsbGJhY2sgSXRlcmF0aW9uQ2FsbGJhY2tcbiAgICogQHBhcmFtIHtPYmplY3R9IGRvY1xuICAgKiBAcGFyYW0ge051bWJlcn0gaW5kZXhcbiAgICovXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBDYWxsIGBjYWxsYmFja2Agb25jZSBmb3IgZWFjaCBtYXRjaGluZyBkb2N1bWVudCwgc2VxdWVudGlhbGx5IGFuZFxuICAgKiAgICAgICAgICBzeW5jaHJvbm91c2x5LlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCAgZm9yRWFjaFxuICAgKiBAaW5zdGFuY2VcbiAgICogQG1lbWJlck9mIE1vbmdvLkN1cnNvclxuICAgKiBAcGFyYW0ge0l0ZXJhdGlvbkNhbGxiYWNrfSBjYWxsYmFjayBGdW5jdGlvbiB0byBjYWxsLiBJdCB3aWxsIGJlIGNhbGxlZFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aXRoIHRocmVlIGFyZ3VtZW50czogdGhlIGRvY3VtZW50LCBhXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAtYmFzZWQgaW5kZXgsIGFuZCA8ZW0+Y3Vyc29yPC9lbT5cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRzZWxmLlxuICAgKiBAcGFyYW0ge0FueX0gW3RoaXNBcmddIEFuIG9iamVjdCB3aGljaCB3aWxsIGJlIHRoZSB2YWx1ZSBvZiBgdGhpc2AgaW5zaWRlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgYGNhbGxiYWNrYC5cbiAgICovXG4gIGZvckVhY2goY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBpZiAodGhpcy5yZWFjdGl2ZSkge1xuICAgICAgdGhpcy5fZGVwZW5kKHtcbiAgICAgICAgYWRkZWRCZWZvcmU6IHRydWUsXG4gICAgICAgIHJlbW92ZWQ6IHRydWUsXG4gICAgICAgIGNoYW5nZWQ6IHRydWUsXG4gICAgICAgIG1vdmVkQmVmb3JlOiB0cnVlfSk7XG4gICAgfVxuXG4gICAgdGhpcy5fZ2V0UmF3T2JqZWN0cyh7b3JkZXJlZDogdHJ1ZX0pLmZvckVhY2goKGVsZW1lbnQsIGkpID0+IHtcbiAgICAgIC8vIFRoaXMgZG91YmxlcyBhcyBhIGNsb25lIG9wZXJhdGlvbi5cbiAgICAgIGVsZW1lbnQgPSB0aGlzLl9wcm9qZWN0aW9uRm4oZWxlbWVudCk7XG5cbiAgICAgIGlmICh0aGlzLl90cmFuc2Zvcm0pIHtcbiAgICAgICAgZWxlbWVudCA9IHRoaXMuX3RyYW5zZm9ybShlbGVtZW50KTtcbiAgICAgIH1cblxuICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBlbGVtZW50LCBpLCB0aGlzKTtcbiAgICB9KTtcbiAgfVxuXG4gIGdldFRyYW5zZm9ybSgpIHtcbiAgICByZXR1cm4gdGhpcy5fdHJhbnNmb3JtO1xuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IE1hcCBjYWxsYmFjayBvdmVyIGFsbCBtYXRjaGluZyBkb2N1bWVudHMuICBSZXR1cm5zIGFuIEFycmF5LlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCBtYXBcbiAgICogQGluc3RhbmNlXG4gICAqIEBtZW1iZXJPZiBNb25nby5DdXJzb3JcbiAgICogQHBhcmFtIHtJdGVyYXRpb25DYWxsYmFja30gY2FsbGJhY2sgRnVuY3Rpb24gdG8gY2FsbC4gSXQgd2lsbCBiZSBjYWxsZWRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2l0aCB0aHJlZSBhcmd1bWVudHM6IHRoZSBkb2N1bWVudCwgYVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwLWJhc2VkIGluZGV4LCBhbmQgPGVtPmN1cnNvcjwvZW0+XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0c2VsZi5cbiAgICogQHBhcmFtIHtBbnl9IFt0aGlzQXJnXSBBbiBvYmplY3Qgd2hpY2ggd2lsbCBiZSB0aGUgdmFsdWUgb2YgYHRoaXNgIGluc2lkZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgIGBjYWxsYmFja2AuXG4gICAqL1xuICBtYXAoY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICBjb25zdCByZXN1bHQgPSBbXTtcblxuICAgIHRoaXMuZm9yRWFjaCgoZG9jLCBpKSA9PiB7XG4gICAgICByZXN1bHQucHVzaChjYWxsYmFjay5jYWxsKHRoaXNBcmcsIGRvYywgaSwgdGhpcykpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIG9wdGlvbnMgdG8gY29udGFpbjpcbiAgLy8gICogY2FsbGJhY2tzIGZvciBvYnNlcnZlKCk6XG4gIC8vICAgIC0gYWRkZWRBdCAoZG9jdW1lbnQsIGF0SW5kZXgpXG4gIC8vICAgIC0gYWRkZWQgKGRvY3VtZW50KVxuICAvLyAgICAtIGNoYW5nZWRBdCAobmV3RG9jdW1lbnQsIG9sZERvY3VtZW50LCBhdEluZGV4KVxuICAvLyAgICAtIGNoYW5nZWQgKG5ld0RvY3VtZW50LCBvbGREb2N1bWVudClcbiAgLy8gICAgLSByZW1vdmVkQXQgKGRvY3VtZW50LCBhdEluZGV4KVxuICAvLyAgICAtIHJlbW92ZWQgKGRvY3VtZW50KVxuICAvLyAgICAtIG1vdmVkVG8gKGRvY3VtZW50LCBvbGRJbmRleCwgbmV3SW5kZXgpXG4gIC8vXG4gIC8vIGF0dHJpYnV0ZXMgYXZhaWxhYmxlIG9uIHJldHVybmVkIHF1ZXJ5IGhhbmRsZTpcbiAgLy8gICogc3RvcCgpOiBlbmQgdXBkYXRlc1xuICAvLyAgKiBjb2xsZWN0aW9uOiB0aGUgY29sbGVjdGlvbiB0aGlzIHF1ZXJ5IGlzIHF1ZXJ5aW5nXG4gIC8vXG4gIC8vIGlmZiB4IGlzIGEgcmV0dXJuZWQgcXVlcnkgaGFuZGxlLCAoeCBpbnN0YW5jZW9mXG4gIC8vIExvY2FsQ29sbGVjdGlvbi5PYnNlcnZlSGFuZGxlKSBpcyB0cnVlXG4gIC8vXG4gIC8vIGluaXRpYWwgcmVzdWx0cyBkZWxpdmVyZWQgdGhyb3VnaCBhZGRlZCBjYWxsYmFja1xuICAvLyBYWFggbWF5YmUgY2FsbGJhY2tzIHNob3VsZCB0YWtlIGEgbGlzdCBvZiBvYmplY3RzLCB0byBleHBvc2UgdHJhbnNhY3Rpb25zP1xuICAvLyBYWFggbWF5YmUgc3VwcG9ydCBmaWVsZCBsaW1pdGluZyAodG8gbGltaXQgd2hhdCB5b3UncmUgbm90aWZpZWQgb24pXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFdhdGNoIGEgcXVlcnkuICBSZWNlaXZlIGNhbGxiYWNrcyBhcyB0aGUgcmVzdWx0IHNldCBjaGFuZ2VzLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIE1vbmdvLkN1cnNvclxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtPYmplY3R9IGNhbGxiYWNrcyBGdW5jdGlvbnMgdG8gY2FsbCB0byBkZWxpdmVyIHRoZSByZXN1bHQgc2V0IGFzIGl0XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlc1xuICAgKi9cbiAgb2JzZXJ2ZShvcHRpb25zKSB7XG4gICAgcmV0dXJuIExvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUZyb21PYnNlcnZlQ2hhbmdlcyh0aGlzLCBvcHRpb25zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBXYXRjaCBhIHF1ZXJ5LiBSZWNlaXZlIGNhbGxiYWNrcyBhcyB0aGUgcmVzdWx0IHNldCBjaGFuZ2VzLiBPbmx5XG4gICAqICAgICAgICAgIHRoZSBkaWZmZXJlbmNlcyBiZXR3ZWVuIHRoZSBvbGQgYW5kIG5ldyBkb2N1bWVudHMgYXJlIHBhc3NlZCB0b1xuICAgKiAgICAgICAgICB0aGUgY2FsbGJhY2tzLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1lbWJlck9mIE1vbmdvLkN1cnNvclxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtPYmplY3R9IGNhbGxiYWNrcyBGdW5jdGlvbnMgdG8gY2FsbCB0byBkZWxpdmVyIHRoZSByZXN1bHQgc2V0IGFzIGl0XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlc1xuICAgKi9cbiAgb2JzZXJ2ZUNoYW5nZXMob3B0aW9ucykge1xuICAgIGNvbnN0IG9yZGVyZWQgPSBMb2NhbENvbGxlY3Rpb24uX29ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzQXJlT3JkZXJlZChvcHRpb25zKTtcblxuICAgIC8vIHRoZXJlIGFyZSBzZXZlcmFsIHBsYWNlcyB0aGF0IGFzc3VtZSB5b3UgYXJlbid0IGNvbWJpbmluZyBza2lwL2xpbWl0IHdpdGhcbiAgICAvLyB1bm9yZGVyZWQgb2JzZXJ2ZS4gIGVnLCB1cGRhdGUncyBFSlNPTi5jbG9uZSwgYW5kIHRoZSBcInRoZXJlIGFyZSBzZXZlcmFsXCJcbiAgICAvLyBjb21tZW50IGluIF9tb2RpZnlBbmROb3RpZnlcbiAgICAvLyBYWFggYWxsb3cgc2tpcC9saW1pdCB3aXRoIHVub3JkZXJlZCBvYnNlcnZlXG4gICAgaWYgKCFvcHRpb25zLl9hbGxvd191bm9yZGVyZWQgJiYgIW9yZGVyZWQgJiYgKHRoaXMuc2tpcCB8fCB0aGlzLmxpbWl0KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnbXVzdCB1c2Ugb3JkZXJlZCBvYnNlcnZlIChpZSwgXFwnYWRkZWRCZWZvcmVcXCcgaW5zdGVhZCBvZiBcXCdhZGRlZFxcJykgJyArXG4gICAgICAgICd3aXRoIHNraXAgb3IgbGltaXQnXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmZpZWxkcyAmJiAodGhpcy5maWVsZHMuX2lkID09PSAwIHx8IHRoaXMuZmllbGRzLl9pZCA9PT0gZmFsc2UpKSB7XG4gICAgICB0aHJvdyBFcnJvcignWW91IG1heSBub3Qgb2JzZXJ2ZSBhIGN1cnNvciB3aXRoIHtmaWVsZHM6IHtfaWQ6IDB9fScpO1xuICAgIH1cblxuICAgIGNvbnN0IGRpc3RhbmNlcyA9IChcbiAgICAgIHRoaXMubWF0Y2hlci5oYXNHZW9RdWVyeSgpICYmXG4gICAgICBvcmRlcmVkICYmXG4gICAgICBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcFxuICAgICk7XG5cbiAgICBjb25zdCBxdWVyeSA9IHtcbiAgICAgIGN1cnNvcjogdGhpcyxcbiAgICAgIGRpcnR5OiBmYWxzZSxcbiAgICAgIGRpc3RhbmNlcyxcbiAgICAgIG1hdGNoZXI6IHRoaXMubWF0Y2hlciwgLy8gbm90IGZhc3QgcGF0aGVkXG4gICAgICBvcmRlcmVkLFxuICAgICAgcHJvamVjdGlvbkZuOiB0aGlzLl9wcm9qZWN0aW9uRm4sXG4gICAgICByZXN1bHRzU25hcHNob3Q6IG51bGwsXG4gICAgICBzb3J0ZXI6IG9yZGVyZWQgJiYgdGhpcy5zb3J0ZXJcbiAgICB9O1xuXG4gICAgbGV0IHFpZDtcblxuICAgIC8vIE5vbi1yZWFjdGl2ZSBxdWVyaWVzIGNhbGwgYWRkZWRbQmVmb3JlXSBhbmQgdGhlbiBuZXZlciBjYWxsIGFueXRoaW5nXG4gICAgLy8gZWxzZS5cbiAgICBpZiAodGhpcy5yZWFjdGl2ZSkge1xuICAgICAgcWlkID0gdGhpcy5jb2xsZWN0aW9uLm5leHRfcWlkKys7XG4gICAgICB0aGlzLmNvbGxlY3Rpb24ucXVlcmllc1txaWRdID0gcXVlcnk7XG4gICAgfVxuXG4gICAgcXVlcnkucmVzdWx0cyA9IHRoaXMuX2dldFJhd09iamVjdHMoe29yZGVyZWQsIGRpc3RhbmNlczogcXVlcnkuZGlzdGFuY2VzfSk7XG5cbiAgICBpZiAodGhpcy5jb2xsZWN0aW9uLnBhdXNlZCkge1xuICAgICAgcXVlcnkucmVzdWx0c1NuYXBzaG90ID0gb3JkZXJlZCA/IFtdIDogbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gICAgfVxuXG4gICAgLy8gd3JhcCBjYWxsYmFja3Mgd2Ugd2VyZSBwYXNzZWQuIGNhbGxiYWNrcyBvbmx5IGZpcmUgd2hlbiBub3QgcGF1c2VkIGFuZFxuICAgIC8vIGFyZSBuZXZlciB1bmRlZmluZWRcbiAgICAvLyBGaWx0ZXJzIG91dCBibGFja2xpc3RlZCBmaWVsZHMgYWNjb3JkaW5nIHRvIGN1cnNvcidzIHByb2plY3Rpb24uXG4gICAgLy8gWFhYIHdyb25nIHBsYWNlIGZvciB0aGlzP1xuXG4gICAgLy8gZnVydGhlcm1vcmUsIGNhbGxiYWNrcyBlbnF1ZXVlIHVudGlsIHRoZSBvcGVyYXRpb24gd2UncmUgd29ya2luZyBvbiBpc1xuICAgIC8vIGRvbmUuXG4gICAgY29uc3Qgd3JhcENhbGxiYWNrID0gZm4gPT4ge1xuICAgICAgaWYgKCFmbikge1xuICAgICAgICByZXR1cm4gKCkgPT4ge307XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKC8qIGFyZ3MqLykge1xuICAgICAgICBpZiAoc2VsZi5jb2xsZWN0aW9uLnBhdXNlZCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGFyZ3MgPSBhcmd1bWVudHM7XG5cbiAgICAgICAgc2VsZi5jb2xsZWN0aW9uLl9vYnNlcnZlUXVldWUucXVldWVUYXNrKCgpID0+IHtcbiAgICAgICAgICBmbi5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgIH07XG5cbiAgICBxdWVyeS5hZGRlZCA9IHdyYXBDYWxsYmFjayhvcHRpb25zLmFkZGVkKTtcbiAgICBxdWVyeS5jaGFuZ2VkID0gd3JhcENhbGxiYWNrKG9wdGlvbnMuY2hhbmdlZCk7XG4gICAgcXVlcnkucmVtb3ZlZCA9IHdyYXBDYWxsYmFjayhvcHRpb25zLnJlbW92ZWQpO1xuXG4gICAgaWYgKG9yZGVyZWQpIHtcbiAgICAgIHF1ZXJ5LmFkZGVkQmVmb3JlID0gd3JhcENhbGxiYWNrKG9wdGlvbnMuYWRkZWRCZWZvcmUpO1xuICAgICAgcXVlcnkubW92ZWRCZWZvcmUgPSB3cmFwQ2FsbGJhY2sob3B0aW9ucy5tb3ZlZEJlZm9yZSk7XG4gICAgfVxuXG4gICAgaWYgKCFvcHRpb25zLl9zdXBwcmVzc19pbml0aWFsICYmICF0aGlzLmNvbGxlY3Rpb24ucGF1c2VkKSB7XG4gICAgICBjb25zdCByZXN1bHRzID0gb3JkZXJlZCA/IHF1ZXJ5LnJlc3VsdHMgOiBxdWVyeS5yZXN1bHRzLl9tYXA7XG5cbiAgICAgIE9iamVjdC5rZXlzKHJlc3VsdHMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgY29uc3QgZG9jID0gcmVzdWx0c1trZXldO1xuICAgICAgICBjb25zdCBmaWVsZHMgPSBFSlNPTi5jbG9uZShkb2MpO1xuXG4gICAgICAgIGRlbGV0ZSBmaWVsZHMuX2lkO1xuXG4gICAgICAgIGlmIChvcmRlcmVkKSB7XG4gICAgICAgICAgcXVlcnkuYWRkZWRCZWZvcmUoZG9jLl9pZCwgdGhpcy5fcHJvamVjdGlvbkZuKGZpZWxkcyksIG51bGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgcXVlcnkuYWRkZWQoZG9jLl9pZCwgdGhpcy5fcHJvamVjdGlvbkZuKGZpZWxkcykpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgaGFuZGxlID0gT2JqZWN0LmFzc2lnbihuZXcgTG9jYWxDb2xsZWN0aW9uLk9ic2VydmVIYW5kbGUsIHtcbiAgICAgIGNvbGxlY3Rpb246IHRoaXMuY29sbGVjdGlvbixcbiAgICAgIHN0b3A6ICgpID0+IHtcbiAgICAgICAgaWYgKHRoaXMucmVhY3RpdmUpIHtcbiAgICAgICAgICBkZWxldGUgdGhpcy5jb2xsZWN0aW9uLnF1ZXJpZXNbcWlkXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMucmVhY3RpdmUgJiYgVHJhY2tlci5hY3RpdmUpIHtcbiAgICAgIC8vIFhYWCBpbiBtYW55IGNhc2VzLCB0aGUgc2FtZSBvYnNlcnZlIHdpbGwgYmUgcmVjcmVhdGVkIHdoZW5cbiAgICAgIC8vIHRoZSBjdXJyZW50IGF1dG9ydW4gaXMgcmVydW4uICB3ZSBjb3VsZCBzYXZlIHdvcmsgYnlcbiAgICAgIC8vIGxldHRpbmcgaXQgbGluZ2VyIGFjcm9zcyByZXJ1biBhbmQgcG90ZW50aWFsbHkgZ2V0XG4gICAgICAvLyByZXB1cnBvc2VkIGlmIHRoZSBzYW1lIG9ic2VydmUgaXMgcGVyZm9ybWVkLCB1c2luZyBsb2dpY1xuICAgICAgLy8gc2ltaWxhciB0byB0aGF0IG9mIE1ldGVvci5zdWJzY3JpYmUuXG4gICAgICBUcmFja2VyLm9uSW52YWxpZGF0ZSgoKSA9PiB7XG4gICAgICAgIGhhbmRsZS5zdG9wKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBydW4gdGhlIG9ic2VydmUgY2FsbGJhY2tzIHJlc3VsdGluZyBmcm9tIHRoZSBpbml0aWFsIGNvbnRlbnRzXG4gICAgLy8gYmVmb3JlIHdlIGxlYXZlIHRoZSBvYnNlcnZlLlxuICAgIHRoaXMuY29sbGVjdGlvbi5fb2JzZXJ2ZVF1ZXVlLmRyYWluKCk7XG5cbiAgICByZXR1cm4gaGFuZGxlO1xuICB9XG5cbiAgLy8gU2luY2Ugd2UgZG9uJ3QgYWN0dWFsbHkgaGF2ZSBhIFwibmV4dE9iamVjdFwiIGludGVyZmFjZSwgdGhlcmUncyByZWFsbHkgbm9cbiAgLy8gcmVhc29uIHRvIGhhdmUgYSBcInJld2luZFwiIGludGVyZmFjZS4gIEFsbCBpdCBkaWQgd2FzIG1ha2UgbXVsdGlwbGUgY2FsbHNcbiAgLy8gdG8gZmV0Y2gvbWFwL2ZvckVhY2ggcmV0dXJuIG5vdGhpbmcgdGhlIHNlY29uZCB0aW1lLlxuICAvLyBYWFggQ09NUEFUIFdJVEggMC44LjFcbiAgcmV3aW5kKCkge31cblxuICAvLyBYWFggTWF5YmUgd2UgbmVlZCBhIHZlcnNpb24gb2Ygb2JzZXJ2ZSB0aGF0IGp1c3QgY2FsbHMgYSBjYWxsYmFjayBpZlxuICAvLyBhbnl0aGluZyBjaGFuZ2VkLlxuICBfZGVwZW5kKGNoYW5nZXJzLCBfYWxsb3dfdW5vcmRlcmVkKSB7XG4gICAgaWYgKFRyYWNrZXIuYWN0aXZlKSB7XG4gICAgICBjb25zdCBkZXBlbmRlbmN5ID0gbmV3IFRyYWNrZXIuRGVwZW5kZW5jeTtcbiAgICAgIGNvbnN0IG5vdGlmeSA9IGRlcGVuZGVuY3kuY2hhbmdlZC5iaW5kKGRlcGVuZGVuY3kpO1xuXG4gICAgICBkZXBlbmRlbmN5LmRlcGVuZCgpO1xuXG4gICAgICBjb25zdCBvcHRpb25zID0ge19hbGxvd191bm9yZGVyZWQsIF9zdXBwcmVzc19pbml0aWFsOiB0cnVlfTtcblxuICAgICAgWydhZGRlZCcsICdhZGRlZEJlZm9yZScsICdjaGFuZ2VkJywgJ21vdmVkQmVmb3JlJywgJ3JlbW92ZWQnXVxuICAgICAgICAuZm9yRWFjaChmbiA9PiB7XG4gICAgICAgICAgaWYgKGNoYW5nZXJzW2ZuXSkge1xuICAgICAgICAgICAgb3B0aW9uc1tmbl0gPSBub3RpZnk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgLy8gb2JzZXJ2ZUNoYW5nZXMgd2lsbCBzdG9wKCkgd2hlbiB0aGlzIGNvbXB1dGF0aW9uIGlzIGludmFsaWRhdGVkXG4gICAgICB0aGlzLm9ic2VydmVDaGFuZ2VzKG9wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gIF9nZXRDb2xsZWN0aW9uTmFtZSgpIHtcbiAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uLm5hbWU7XG4gIH1cblxuICAvLyBSZXR1cm5zIGEgY29sbGVjdGlvbiBvZiBtYXRjaGluZyBvYmplY3RzLCBidXQgZG9lc24ndCBkZWVwIGNvcHkgdGhlbS5cbiAgLy9cbiAgLy8gSWYgb3JkZXJlZCBpcyBzZXQsIHJldHVybnMgYSBzb3J0ZWQgYXJyYXksIHJlc3BlY3Rpbmcgc29ydGVyLCBza2lwLCBhbmRcbiAgLy8gbGltaXQgcHJvcGVydGllcyBvZiB0aGUgcXVlcnkgcHJvdmlkZWQgdGhhdCBvcHRpb25zLmFwcGx5U2tpcExpbWl0IGlzXG4gIC8vIG5vdCBzZXQgdG8gZmFsc2UgKCMxMjAxKS4gSWYgc29ydGVyIGlzIGZhbHNleSwgbm8gc29ydCAtLSB5b3UgZ2V0IHRoZVxuICAvLyBuYXR1cmFsIG9yZGVyLlxuICAvL1xuICAvLyBJZiBvcmRlcmVkIGlzIG5vdCBzZXQsIHJldHVybnMgYW4gb2JqZWN0IG1hcHBpbmcgZnJvbSBJRCB0byBkb2MgKHNvcnRlcixcbiAgLy8gc2tpcCBhbmQgbGltaXQgc2hvdWxkIG5vdCBiZSBzZXQpLlxuICAvL1xuICAvLyBJZiBvcmRlcmVkIGlzIHNldCBhbmQgdGhpcyBjdXJzb3IgaXMgYSAkbmVhciBnZW9xdWVyeSwgdGhlbiB0aGlzIGZ1bmN0aW9uXG4gIC8vIHdpbGwgdXNlIGFuIF9JZE1hcCB0byB0cmFjayBlYWNoIGRpc3RhbmNlIGZyb20gdGhlICRuZWFyIGFyZ3VtZW50IHBvaW50IGluXG4gIC8vIG9yZGVyIHRvIHVzZSBpdCBhcyBhIHNvcnQga2V5LiBJZiBhbiBfSWRNYXAgaXMgcGFzc2VkIGluIHRoZSAnZGlzdGFuY2VzJ1xuICAvLyBhcmd1bWVudCwgdGhpcyBmdW5jdGlvbiB3aWxsIGNsZWFyIGl0IGFuZCB1c2UgaXQgZm9yIHRoaXMgcHVycG9zZVxuICAvLyAob3RoZXJ3aXNlIGl0IHdpbGwganVzdCBjcmVhdGUgaXRzIG93biBfSWRNYXApLiBUaGUgb2JzZXJ2ZUNoYW5nZXNcbiAgLy8gaW1wbGVtZW50YXRpb24gdXNlcyB0aGlzIHRvIHJlbWVtYmVyIHRoZSBkaXN0YW5jZXMgYWZ0ZXIgdGhpcyBmdW5jdGlvblxuICAvLyByZXR1cm5zLlxuICBfZ2V0UmF3T2JqZWN0cyhvcHRpb25zID0ge30pIHtcbiAgICAvLyBCeSBkZWZhdWx0IHRoaXMgbWV0aG9kIHdpbGwgcmVzcGVjdCBza2lwIGFuZCBsaW1pdCBiZWNhdXNlIC5mZXRjaCgpLFxuICAgIC8vIC5mb3JFYWNoKCkgZXRjLi4uIGV4cGVjdCB0aGlzIGJlaGF2aW91ci4gSXQgY2FuIGJlIGZvcmNlZCB0byBpZ25vcmVcbiAgICAvLyBza2lwIGFuZCBsaW1pdCBieSBzZXR0aW5nIGFwcGx5U2tpcExpbWl0IHRvIGZhbHNlICguY291bnQoKSBkb2VzIHRoaXMsXG4gICAgLy8gZm9yIGV4YW1wbGUpXG4gICAgY29uc3QgYXBwbHlTa2lwTGltaXQgPSBvcHRpb25zLmFwcGx5U2tpcExpbWl0ICE9PSBmYWxzZTtcblxuICAgIC8vIFhYWCB1c2UgT3JkZXJlZERpY3QgaW5zdGVhZCBvZiBhcnJheSwgYW5kIG1ha2UgSWRNYXAgYW5kIE9yZGVyZWREaWN0XG4gICAgLy8gY29tcGF0aWJsZVxuICAgIGNvbnN0IHJlc3VsdHMgPSBvcHRpb25zLm9yZGVyZWQgPyBbXSA6IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuXG4gICAgLy8gZmFzdCBwYXRoIGZvciBzaW5nbGUgSUQgdmFsdWVcbiAgICBpZiAodGhpcy5fc2VsZWN0b3JJZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBJZiB5b3UgaGF2ZSBub24temVybyBza2lwIGFuZCBhc2sgZm9yIGEgc2luZ2xlIGlkLCB5b3UgZ2V0IG5vdGhpbmcuXG4gICAgICAvLyBUaGlzIGlzIHNvIGl0IG1hdGNoZXMgdGhlIGJlaGF2aW9yIG9mIHRoZSAne19pZDogZm9vfScgcGF0aC5cbiAgICAgIGlmIChhcHBseVNraXBMaW1pdCAmJiB0aGlzLnNraXApIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHNlbGVjdGVkRG9jID0gdGhpcy5jb2xsZWN0aW9uLl9kb2NzLmdldCh0aGlzLl9zZWxlY3RvcklkKTtcblxuICAgICAgaWYgKHNlbGVjdGVkRG9jKSB7XG4gICAgICAgIGlmIChvcHRpb25zLm9yZGVyZWQpIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2goc2VsZWN0ZWREb2MpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdHMuc2V0KHRoaXMuX3NlbGVjdG9ySWQsIHNlbGVjdGVkRG9jKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0cztcbiAgICB9XG5cbiAgICAvLyBzbG93IHBhdGggZm9yIGFyYml0cmFyeSBzZWxlY3Rvciwgc29ydCwgc2tpcCwgbGltaXRcblxuICAgIC8vIGluIHRoZSBvYnNlcnZlQ2hhbmdlcyBjYXNlLCBkaXN0YW5jZXMgaXMgYWN0dWFsbHkgcGFydCBvZiB0aGUgXCJxdWVyeVwiXG4gICAgLy8gKGllLCBsaXZlIHJlc3VsdHMgc2V0KSBvYmplY3QuICBpbiBvdGhlciBjYXNlcywgZGlzdGFuY2VzIGlzIG9ubHkgdXNlZFxuICAgIC8vIGluc2lkZSB0aGlzIGZ1bmN0aW9uLlxuICAgIGxldCBkaXN0YW5jZXM7XG4gICAgaWYgKHRoaXMubWF0Y2hlci5oYXNHZW9RdWVyeSgpICYmIG9wdGlvbnMub3JkZXJlZCkge1xuICAgICAgaWYgKG9wdGlvbnMuZGlzdGFuY2VzKSB7XG4gICAgICAgIGRpc3RhbmNlcyA9IG9wdGlvbnMuZGlzdGFuY2VzO1xuICAgICAgICBkaXN0YW5jZXMuY2xlYXIoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRpc3RhbmNlcyA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jb2xsZWN0aW9uLl9kb2NzLmZvckVhY2goKGRvYywgaWQpID0+IHtcbiAgICAgIGNvbnN0IG1hdGNoUmVzdWx0ID0gdGhpcy5tYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhkb2MpO1xuXG4gICAgICBpZiAobWF0Y2hSZXN1bHQucmVzdWx0KSB7XG4gICAgICAgIGlmIChvcHRpb25zLm9yZGVyZWQpIHtcbiAgICAgICAgICByZXN1bHRzLnB1c2goZG9jKTtcblxuICAgICAgICAgIGlmIChkaXN0YW5jZXMgJiYgbWF0Y2hSZXN1bHQuZGlzdGFuY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZGlzdGFuY2VzLnNldChpZCwgbWF0Y2hSZXN1bHQuZGlzdGFuY2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHRzLnNldChpZCwgZG9jKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBPdmVycmlkZSB0byBlbnN1cmUgYWxsIGRvY3MgYXJlIG1hdGNoZWQgaWYgaWdub3Jpbmcgc2tpcCAmIGxpbWl0XG4gICAgICBpZiAoIWFwcGx5U2tpcExpbWl0KSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBGYXN0IHBhdGggZm9yIGxpbWl0ZWQgdW5zb3J0ZWQgcXVlcmllcy5cbiAgICAgIC8vIFhYWCAnbGVuZ3RoJyBjaGVjayBoZXJlIHNlZW1zIHdyb25nIGZvciBvcmRlcmVkXG4gICAgICByZXR1cm4gKFxuICAgICAgICAhdGhpcy5saW1pdCB8fFxuICAgICAgICB0aGlzLnNraXAgfHxcbiAgICAgICAgdGhpcy5zb3J0ZXIgfHxcbiAgICAgICAgcmVzdWx0cy5sZW5ndGggIT09IHRoaXMubGltaXRcbiAgICAgICk7XG4gICAgfSk7XG5cbiAgICBpZiAoIW9wdGlvbnMub3JkZXJlZCkge1xuICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc29ydGVyKSB7XG4gICAgICByZXN1bHRzLnNvcnQodGhpcy5zb3J0ZXIuZ2V0Q29tcGFyYXRvcih7ZGlzdGFuY2VzfSkpO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0aGUgZnVsbCBzZXQgb2YgcmVzdWx0cyBpZiB0aGVyZSBpcyBubyBza2lwIG9yIGxpbWl0IG9yIGlmIHdlJ3JlXG4gICAgLy8gaWdub3JpbmcgdGhlbVxuICAgIGlmICghYXBwbHlTa2lwTGltaXQgfHwgKCF0aGlzLmxpbWl0ICYmICF0aGlzLnNraXApKSB7XG4gICAgICByZXR1cm4gcmVzdWx0cztcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0cy5zbGljZShcbiAgICAgIHRoaXMuc2tpcCxcbiAgICAgIHRoaXMubGltaXQgPyB0aGlzLmxpbWl0ICsgdGhpcy5za2lwIDogcmVzdWx0cy5sZW5ndGhcbiAgICApO1xuICB9XG5cbiAgX3B1Ymxpc2hDdXJzb3Ioc3Vic2NyaXB0aW9uKSB7XG4gICAgLy8gWFhYIG1pbmltb25nbyBzaG91bGQgbm90IGRlcGVuZCBvbiBtb25nby1saXZlZGF0YSFcbiAgICBpZiAoIVBhY2thZ2UubW9uZ28pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ0NhblxcJ3QgcHVibGlzaCBmcm9tIE1pbmltb25nbyB3aXRob3V0IHRoZSBgbW9uZ29gIHBhY2thZ2UuJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuY29sbGVjdGlvbi5uYW1lKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdDYW5cXCd0IHB1Ymxpc2ggYSBjdXJzb3IgZnJvbSBhIGNvbGxlY3Rpb24gd2l0aG91dCBhIG5hbWUuJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gUGFja2FnZS5tb25nby5Nb25nby5Db2xsZWN0aW9uLl9wdWJsaXNoQ3Vyc29yKFxuICAgICAgdGhpcyxcbiAgICAgIHN1YnNjcmlwdGlvbixcbiAgICAgIHRoaXMuY29sbGVjdGlvbi5uYW1lXG4gICAgKTtcbiAgfVxufVxuIiwiaW1wb3J0IEN1cnNvciBmcm9tICcuL2N1cnNvci5qcyc7XG5pbXBvcnQgT2JzZXJ2ZUhhbmRsZSBmcm9tICcuL29ic2VydmVfaGFuZGxlLmpzJztcbmltcG9ydCB7XG4gIGhhc093bixcbiAgaXNJbmRleGFibGUsXG4gIGlzTnVtZXJpY0tleSxcbiAgaXNPcGVyYXRvck9iamVjdCxcbiAgcG9wdWxhdGVEb2N1bWVudFdpdGhRdWVyeUZpZWxkcyxcbiAgcHJvamVjdGlvbkRldGFpbHMsXG59IGZyb20gJy4vY29tbW9uLmpzJztcblxuLy8gWFhYIHR5cGUgY2hlY2tpbmcgb24gc2VsZWN0b3JzIChncmFjZWZ1bCBlcnJvciBpZiBtYWxmb3JtZWQpXG5cbi8vIExvY2FsQ29sbGVjdGlvbjogYSBzZXQgb2YgZG9jdW1lbnRzIHRoYXQgc3VwcG9ydHMgcXVlcmllcyBhbmQgbW9kaWZpZXJzLlxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTG9jYWxDb2xsZWN0aW9uIHtcbiAgY29uc3RydWN0b3IobmFtZSkge1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgLy8gX2lkIC0+IGRvY3VtZW50IChhbHNvIGNvbnRhaW5pbmcgaWQpXG4gICAgdGhpcy5fZG9jcyA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuXG4gICAgdGhpcy5fb2JzZXJ2ZVF1ZXVlID0gbmV3IE1ldGVvci5fU3luY2hyb25vdXNRdWV1ZSgpO1xuXG4gICAgdGhpcy5uZXh0X3FpZCA9IDE7IC8vIGxpdmUgcXVlcnkgaWQgZ2VuZXJhdG9yXG5cbiAgICAvLyBxaWQgLT4gbGl2ZSBxdWVyeSBvYmplY3QuIGtleXM6XG4gICAgLy8gIG9yZGVyZWQ6IGJvb2wuIG9yZGVyZWQgcXVlcmllcyBoYXZlIGFkZGVkQmVmb3JlL21vdmVkQmVmb3JlIGNhbGxiYWNrcy5cbiAgICAvLyAgcmVzdWx0czogYXJyYXkgKG9yZGVyZWQpIG9yIG9iamVjdCAodW5vcmRlcmVkKSBvZiBjdXJyZW50IHJlc3VsdHNcbiAgICAvLyAgICAoYWxpYXNlZCB3aXRoIHRoaXMuX2RvY3MhKVxuICAgIC8vICByZXN1bHRzU25hcHNob3Q6IHNuYXBzaG90IG9mIHJlc3VsdHMuIG51bGwgaWYgbm90IHBhdXNlZC5cbiAgICAvLyAgY3Vyc29yOiBDdXJzb3Igb2JqZWN0IGZvciB0aGUgcXVlcnkuXG4gICAgLy8gIHNlbGVjdG9yLCBzb3J0ZXIsIChjYWxsYmFja3MpOiBmdW5jdGlvbnNcbiAgICB0aGlzLnF1ZXJpZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgLy8gbnVsbCBpZiBub3Qgc2F2aW5nIG9yaWdpbmFsczsgYW4gSWRNYXAgZnJvbSBpZCB0byBvcmlnaW5hbCBkb2N1bWVudCB2YWx1ZVxuICAgIC8vIGlmIHNhdmluZyBvcmlnaW5hbHMuIFNlZSBjb21tZW50cyBiZWZvcmUgc2F2ZU9yaWdpbmFscygpLlxuICAgIHRoaXMuX3NhdmVkT3JpZ2luYWxzID0gbnVsbDtcblxuICAgIC8vIFRydWUgd2hlbiBvYnNlcnZlcnMgYXJlIHBhdXNlZCBhbmQgd2Ugc2hvdWxkIG5vdCBzZW5kIGNhbGxiYWNrcy5cbiAgICB0aGlzLnBhdXNlZCA9IGZhbHNlO1xuICB9XG5cbiAgLy8gb3B0aW9ucyBtYXkgaW5jbHVkZSBzb3J0LCBza2lwLCBsaW1pdCwgcmVhY3RpdmVcbiAgLy8gc29ydCBtYXkgYmUgYW55IG9mIHRoZXNlIGZvcm1zOlxuICAvLyAgICAge2E6IDEsIGI6IC0xfVxuICAvLyAgICAgW1tcImFcIiwgXCJhc2NcIl0sIFtcImJcIiwgXCJkZXNjXCJdXVxuICAvLyAgICAgW1wiYVwiLCBbXCJiXCIsIFwiZGVzY1wiXV1cbiAgLy8gICAoaW4gdGhlIGZpcnN0IGZvcm0geW91J3JlIGJlaG9sZGVuIHRvIGtleSBlbnVtZXJhdGlvbiBvcmRlciBpblxuICAvLyAgIHlvdXIgamF2YXNjcmlwdCBWTSlcbiAgLy9cbiAgLy8gcmVhY3RpdmU6IGlmIGdpdmVuLCBhbmQgZmFsc2UsIGRvbid0IHJlZ2lzdGVyIHdpdGggVHJhY2tlciAoZGVmYXVsdFxuICAvLyBpcyB0cnVlKVxuICAvL1xuICAvLyBYWFggcG9zc2libHkgc2hvdWxkIHN1cHBvcnQgcmV0cmlldmluZyBhIHN1YnNldCBvZiBmaWVsZHM/IGFuZFxuICAvLyBoYXZlIGl0IGJlIGEgaGludCAoaWdub3JlZCBvbiB0aGUgY2xpZW50LCB3aGVuIG5vdCBjb3B5aW5nIHRoZVxuICAvLyBkb2M/KVxuICAvL1xuICAvLyBYWFggc29ydCBkb2VzIG5vdCB5ZXQgc3VwcG9ydCBzdWJrZXlzICgnYS5iJykgLi4gZml4IHRoYXQhXG4gIC8vIFhYWCBhZGQgb25lIG1vcmUgc29ydCBmb3JtOiBcImtleVwiXG4gIC8vIFhYWCB0ZXN0c1xuICBmaW5kKHNlbGVjdG9yLCBvcHRpb25zKSB7XG4gICAgLy8gZGVmYXVsdCBzeW50YXggZm9yIGV2ZXJ5dGhpbmcgaXMgdG8gb21pdCB0aGUgc2VsZWN0b3IgYXJndW1lbnQuXG4gICAgLy8gYnV0IGlmIHNlbGVjdG9yIGlzIGV4cGxpY2l0bHkgcGFzc2VkIGluIGFzIGZhbHNlIG9yIHVuZGVmaW5lZCwgd2VcbiAgICAvLyB3YW50IGEgc2VsZWN0b3IgdGhhdCBtYXRjaGVzIG5vdGhpbmcuXG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHNlbGVjdG9yID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBMb2NhbENvbGxlY3Rpb24uQ3Vyc29yKHRoaXMsIHNlbGVjdG9yLCBvcHRpb25zKTtcbiAgfVxuXG4gIGZpbmRPbmUoc2VsZWN0b3IsIG9wdGlvbnMgPSB7fSkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICBzZWxlY3RvciA9IHt9O1xuICAgIH1cblxuICAgIC8vIE5PVEU6IGJ5IHNldHRpbmcgbGltaXQgMSBoZXJlLCB3ZSBlbmQgdXAgdXNpbmcgdmVyeSBpbmVmZmljaWVudFxuICAgIC8vIGNvZGUgdGhhdCByZWNvbXB1dGVzIHRoZSB3aG9sZSBxdWVyeSBvbiBlYWNoIHVwZGF0ZS4gVGhlIHVwc2lkZSBpc1xuICAgIC8vIHRoYXQgd2hlbiB5b3UgcmVhY3RpdmVseSBkZXBlbmQgb24gYSBmaW5kT25lIHlvdSBvbmx5IGdldFxuICAgIC8vIGludmFsaWRhdGVkIHdoZW4gdGhlIGZvdW5kIG9iamVjdCBjaGFuZ2VzLCBub3QgYW55IG9iamVjdCBpbiB0aGVcbiAgICAvLyBjb2xsZWN0aW9uLiBNb3N0IGZpbmRPbmUgd2lsbCBiZSBieSBpZCwgd2hpY2ggaGFzIGEgZmFzdCBwYXRoLCBzb1xuICAgIC8vIHRoaXMgbWlnaHQgbm90IGJlIGEgYmlnIGRlYWwuIEluIG1vc3QgY2FzZXMsIGludmFsaWRhdGlvbiBjYXVzZXNcbiAgICAvLyB0aGUgY2FsbGVkIHRvIHJlLXF1ZXJ5IGFueXdheSwgc28gdGhpcyBzaG91bGQgYmUgYSBuZXQgcGVyZm9ybWFuY2VcbiAgICAvLyBpbXByb3ZlbWVudC5cbiAgICBvcHRpb25zLmxpbWl0ID0gMTtcblxuICAgIHJldHVybiB0aGlzLmZpbmQoc2VsZWN0b3IsIG9wdGlvbnMpLmZldGNoKClbMF07XG4gIH1cblxuICAvLyBYWFggcG9zc2libHkgZW5mb3JjZSB0aGF0ICd1bmRlZmluZWQnIGRvZXMgbm90IGFwcGVhciAod2UgYXNzdW1lXG4gIC8vIHRoaXMgaW4gb3VyIGhhbmRsaW5nIG9mIG51bGwgYW5kICRleGlzdHMpXG4gIGluc2VydChkb2MsIGNhbGxiYWNrKSB7XG4gICAgZG9jID0gRUpTT04uY2xvbmUoZG9jKTtcblxuICAgIGFzc2VydEhhc1ZhbGlkRmllbGROYW1lcyhkb2MpO1xuXG4gICAgLy8gaWYgeW91IHJlYWxseSB3YW50IHRvIHVzZSBPYmplY3RJRHMsIHNldCB0aGlzIGdsb2JhbC5cbiAgICAvLyBNb25nby5Db2xsZWN0aW9uIHNwZWNpZmllcyBpdHMgb3duIGlkcyBhbmQgZG9lcyBub3QgdXNlIHRoaXMgY29kZS5cbiAgICBpZiAoIWhhc093bi5jYWxsKGRvYywgJ19pZCcpKSB7XG4gICAgICBkb2MuX2lkID0gTG9jYWxDb2xsZWN0aW9uLl91c2VPSUQgPyBuZXcgTW9uZ29JRC5PYmplY3RJRCgpIDogUmFuZG9tLmlkKCk7XG4gICAgfVxuXG4gICAgY29uc3QgaWQgPSBkb2MuX2lkO1xuXG4gICAgaWYgKHRoaXMuX2RvY3MuaGFzKGlkKSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoYER1cGxpY2F0ZSBfaWQgJyR7aWR9J2ApO1xuICAgIH1cblxuICAgIHRoaXMuX3NhdmVPcmlnaW5hbChpZCwgdW5kZWZpbmVkKTtcbiAgICB0aGlzLl9kb2NzLnNldChpZCwgZG9jKTtcblxuICAgIGNvbnN0IHF1ZXJpZXNUb1JlY29tcHV0ZSA9IFtdO1xuXG4gICAgLy8gdHJpZ2dlciBsaXZlIHF1ZXJpZXMgdGhhdCBtYXRjaFxuICAgIE9iamVjdC5rZXlzKHRoaXMucXVlcmllcykuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgaWYgKHF1ZXJ5LmRpcnR5KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWF0Y2hSZXN1bHQgPSBxdWVyeS5tYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhkb2MpO1xuXG4gICAgICBpZiAobWF0Y2hSZXN1bHQucmVzdWx0KSB7XG4gICAgICAgIGlmIChxdWVyeS5kaXN0YW5jZXMgJiYgbWF0Y2hSZXN1bHQuZGlzdGFuY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHF1ZXJ5LmRpc3RhbmNlcy5zZXQoaWQsIG1hdGNoUmVzdWx0LmRpc3RhbmNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChxdWVyeS5jdXJzb3Iuc2tpcCB8fCBxdWVyeS5jdXJzb3IubGltaXQpIHtcbiAgICAgICAgICBxdWVyaWVzVG9SZWNvbXB1dGUucHVzaChxaWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIExvY2FsQ29sbGVjdGlvbi5faW5zZXJ0SW5SZXN1bHRzKHF1ZXJ5LCBkb2MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBxdWVyaWVzVG9SZWNvbXB1dGUuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgaWYgKHRoaXMucXVlcmllc1txaWRdKSB7XG4gICAgICAgIHRoaXMuX3JlY29tcHV0ZVJlc3VsdHModGhpcy5xdWVyaWVzW3FpZF0pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5fb2JzZXJ2ZVF1ZXVlLmRyYWluKCk7XG5cbiAgICAvLyBEZWZlciBiZWNhdXNlIHRoZSBjYWxsZXIgbGlrZWx5IGRvZXNuJ3QgZXhwZWN0IHRoZSBjYWxsYmFjayB0byBiZSBydW5cbiAgICAvLyBpbW1lZGlhdGVseS5cbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIE1ldGVvci5kZWZlcigoKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIGlkKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBpZDtcbiAgfVxuXG4gIC8vIFBhdXNlIHRoZSBvYnNlcnZlcnMuIE5vIGNhbGxiYWNrcyBmcm9tIG9ic2VydmVycyB3aWxsIGZpcmUgdW50aWxcbiAgLy8gJ3Jlc3VtZU9ic2VydmVycycgaXMgY2FsbGVkLlxuICBwYXVzZU9ic2VydmVycygpIHtcbiAgICAvLyBOby1vcCBpZiBhbHJlYWR5IHBhdXNlZC5cbiAgICBpZiAodGhpcy5wYXVzZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBTZXQgdGhlICdwYXVzZWQnIGZsYWcgc3VjaCB0aGF0IG5ldyBvYnNlcnZlciBtZXNzYWdlcyBkb24ndCBmaXJlLlxuICAgIHRoaXMucGF1c2VkID0gdHJ1ZTtcblxuICAgIC8vIFRha2UgYSBzbmFwc2hvdCBvZiB0aGUgcXVlcnkgcmVzdWx0cyBmb3IgZWFjaCBxdWVyeS5cbiAgICBPYmplY3Qua2V5cyh0aGlzLnF1ZXJpZXMpLmZvckVhY2gocWlkID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3FpZF07XG4gICAgICBxdWVyeS5yZXN1bHRzU25hcHNob3QgPSBFSlNPTi5jbG9uZShxdWVyeS5yZXN1bHRzKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJlbW92ZShzZWxlY3RvciwgY2FsbGJhY2spIHtcbiAgICAvLyBFYXN5IHNwZWNpYWwgY2FzZTogaWYgd2UncmUgbm90IGNhbGxpbmcgb2JzZXJ2ZUNoYW5nZXMgY2FsbGJhY2tzIGFuZFxuICAgIC8vIHdlJ3JlIG5vdCBzYXZpbmcgb3JpZ2luYWxzIGFuZCB3ZSBnb3QgYXNrZWQgdG8gcmVtb3ZlIGV2ZXJ5dGhpbmcsIHRoZW5cbiAgICAvLyBqdXN0IGVtcHR5IGV2ZXJ5dGhpbmcgZGlyZWN0bHkuXG4gICAgaWYgKHRoaXMucGF1c2VkICYmICF0aGlzLl9zYXZlZE9yaWdpbmFscyAmJiBFSlNPTi5lcXVhbHMoc2VsZWN0b3IsIHt9KSkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fZG9jcy5zaXplKCk7XG5cbiAgICAgIHRoaXMuX2RvY3MuY2xlYXIoKTtcblxuICAgICAgT2JqZWN0LmtleXModGhpcy5xdWVyaWVzKS5mb3JFYWNoKHFpZCA9PiB7XG4gICAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3FpZF07XG5cbiAgICAgICAgaWYgKHF1ZXJ5Lm9yZGVyZWQpIHtcbiAgICAgICAgICBxdWVyeS5yZXN1bHRzID0gW107XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcXVlcnkucmVzdWx0cy5jbGVhcigpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIE1ldGVvci5kZWZlcigoKSA9PiB7XG4gICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgY29uc3QgbWF0Y2hlciA9IG5ldyBNaW5pbW9uZ28uTWF0Y2hlcihzZWxlY3Rvcik7XG4gICAgY29uc3QgcmVtb3ZlID0gW107XG5cbiAgICB0aGlzLl9lYWNoUG9zc2libHlNYXRjaGluZ0RvYyhzZWxlY3RvciwgKGRvYywgaWQpID0+IHtcbiAgICAgIGlmIChtYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhkb2MpLnJlc3VsdCkge1xuICAgICAgICByZW1vdmUucHVzaChpZCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBxdWVyaWVzVG9SZWNvbXB1dGUgPSBbXTtcbiAgICBjb25zdCBxdWVyeVJlbW92ZSA9IFtdO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZW1vdmUubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHJlbW92ZUlkID0gcmVtb3ZlW2ldO1xuICAgICAgY29uc3QgcmVtb3ZlRG9jID0gdGhpcy5fZG9jcy5nZXQocmVtb3ZlSWQpO1xuXG4gICAgICBPYmplY3Qua2V5cyh0aGlzLnF1ZXJpZXMpLmZvckVhY2gocWlkID0+IHtcbiAgICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgICBpZiAocXVlcnkuZGlydHkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocXVlcnkubWF0Y2hlci5kb2N1bWVudE1hdGNoZXMocmVtb3ZlRG9jKS5yZXN1bHQpIHtcbiAgICAgICAgICBpZiAocXVlcnkuY3Vyc29yLnNraXAgfHwgcXVlcnkuY3Vyc29yLmxpbWl0KSB7XG4gICAgICAgICAgICBxdWVyaWVzVG9SZWNvbXB1dGUucHVzaChxaWQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBxdWVyeVJlbW92ZS5wdXNoKHtxaWQsIGRvYzogcmVtb3ZlRG9jfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5fc2F2ZU9yaWdpbmFsKHJlbW92ZUlkLCByZW1vdmVEb2MpO1xuICAgICAgdGhpcy5fZG9jcy5yZW1vdmUocmVtb3ZlSWQpO1xuICAgIH1cblxuICAgIC8vIHJ1biBsaXZlIHF1ZXJ5IGNhbGxiYWNrcyBfYWZ0ZXJfIHdlJ3ZlIHJlbW92ZWQgdGhlIGRvY3VtZW50cy5cbiAgICBxdWVyeVJlbW92ZS5mb3JFYWNoKHJlbW92ZSA9PiB7XG4gICAgICBjb25zdCBxdWVyeSA9IHRoaXMucXVlcmllc1tyZW1vdmUucWlkXTtcblxuICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgIHF1ZXJ5LmRpc3RhbmNlcyAmJiBxdWVyeS5kaXN0YW5jZXMucmVtb3ZlKHJlbW92ZS5kb2MuX2lkKTtcbiAgICAgICAgTG9jYWxDb2xsZWN0aW9uLl9yZW1vdmVGcm9tUmVzdWx0cyhxdWVyeSwgcmVtb3ZlLmRvYyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBxdWVyaWVzVG9SZWNvbXB1dGUuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgIHRoaXMuX3JlY29tcHV0ZVJlc3VsdHMocXVlcnkpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5fb2JzZXJ2ZVF1ZXVlLmRyYWluKCk7XG5cbiAgICBjb25zdCByZXN1bHQgPSByZW1vdmUubGVuZ3RoO1xuXG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICBNZXRlb3IuZGVmZXIoKCkgPT4ge1xuICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIFJlc3VtZSB0aGUgb2JzZXJ2ZXJzLiBPYnNlcnZlcnMgaW1tZWRpYXRlbHkgcmVjZWl2ZSBjaGFuZ2VcbiAgLy8gbm90aWZpY2F0aW9ucyB0byBicmluZyB0aGVtIHRvIHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZVxuICAvLyBkYXRhYmFzZS4gTm90ZSB0aGF0IHRoaXMgaXMgbm90IGp1c3QgcmVwbGF5aW5nIGFsbCB0aGUgY2hhbmdlcyB0aGF0XG4gIC8vIGhhcHBlbmVkIGR1cmluZyB0aGUgcGF1c2UsIGl0IGlzIGEgc21hcnRlciAnY29hbGVzY2VkJyBkaWZmLlxuICByZXN1bWVPYnNlcnZlcnMoKSB7XG4gICAgLy8gTm8tb3AgaWYgbm90IHBhdXNlZC5cbiAgICBpZiAoIXRoaXMucGF1c2VkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gVW5zZXQgdGhlICdwYXVzZWQnIGZsYWcuIE1ha2Ugc3VyZSB0byBkbyB0aGlzIGZpcnN0LCBvdGhlcndpc2VcbiAgICAvLyBvYnNlcnZlciBtZXRob2RzIHdvbid0IGFjdHVhbGx5IGZpcmUgd2hlbiB3ZSB0cmlnZ2VyIHRoZW0uXG4gICAgdGhpcy5wYXVzZWQgPSBmYWxzZTtcblxuICAgIE9iamVjdC5rZXlzKHRoaXMucXVlcmllcykuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgaWYgKHF1ZXJ5LmRpcnR5KSB7XG4gICAgICAgIHF1ZXJ5LmRpcnR5ID0gZmFsc2U7XG5cbiAgICAgICAgLy8gcmUtY29tcHV0ZSByZXN1bHRzIHdpbGwgcGVyZm9ybSBgTG9jYWxDb2xsZWN0aW9uLl9kaWZmUXVlcnlDaGFuZ2VzYFxuICAgICAgICAvLyBhdXRvbWF0aWNhbGx5LlxuICAgICAgICB0aGlzLl9yZWNvbXB1dGVSZXN1bHRzKHF1ZXJ5LCBxdWVyeS5yZXN1bHRzU25hcHNob3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRGlmZiB0aGUgY3VycmVudCByZXN1bHRzIGFnYWluc3QgdGhlIHNuYXBzaG90IGFuZCBzZW5kIHRvIG9ic2VydmVycy5cbiAgICAgICAgLy8gcGFzcyB0aGUgcXVlcnkgb2JqZWN0IGZvciBpdHMgb2JzZXJ2ZXIgY2FsbGJhY2tzLlxuICAgICAgICBMb2NhbENvbGxlY3Rpb24uX2RpZmZRdWVyeUNoYW5nZXMoXG4gICAgICAgICAgcXVlcnkub3JkZXJlZCxcbiAgICAgICAgICBxdWVyeS5yZXN1bHRzU25hcHNob3QsXG4gICAgICAgICAgcXVlcnkucmVzdWx0cyxcbiAgICAgICAgICBxdWVyeSxcbiAgICAgICAgICB7cHJvamVjdGlvbkZuOiBxdWVyeS5wcm9qZWN0aW9uRm59XG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHF1ZXJ5LnJlc3VsdHNTbmFwc2hvdCA9IG51bGw7XG4gICAgfSk7XG5cbiAgICB0aGlzLl9vYnNlcnZlUXVldWUuZHJhaW4oKTtcbiAgfVxuXG4gIHJldHJpZXZlT3JpZ2luYWxzKCkge1xuICAgIGlmICghdGhpcy5fc2F2ZWRPcmlnaW5hbHMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQ2FsbGVkIHJldHJpZXZlT3JpZ2luYWxzIHdpdGhvdXQgc2F2ZU9yaWdpbmFscycpO1xuICAgIH1cblxuICAgIGNvbnN0IG9yaWdpbmFscyA9IHRoaXMuX3NhdmVkT3JpZ2luYWxzO1xuXG4gICAgdGhpcy5fc2F2ZWRPcmlnaW5hbHMgPSBudWxsO1xuXG4gICAgcmV0dXJuIG9yaWdpbmFscztcbiAgfVxuXG4gIC8vIFRvIHRyYWNrIHdoYXQgZG9jdW1lbnRzIGFyZSBhZmZlY3RlZCBieSBhIHBpZWNlIG9mIGNvZGUsIGNhbGxcbiAgLy8gc2F2ZU9yaWdpbmFscygpIGJlZm9yZSBpdCBhbmQgcmV0cmlldmVPcmlnaW5hbHMoKSBhZnRlciBpdC5cbiAgLy8gcmV0cmlldmVPcmlnaW5hbHMgcmV0dXJucyBhbiBvYmplY3Qgd2hvc2Uga2V5cyBhcmUgdGhlIGlkcyBvZiB0aGUgZG9jdW1lbnRzXG4gIC8vIHRoYXQgd2VyZSBhZmZlY3RlZCBzaW5jZSB0aGUgY2FsbCB0byBzYXZlT3JpZ2luYWxzKCksIGFuZCB0aGUgdmFsdWVzIGFyZVxuICAvLyBlcXVhbCB0byB0aGUgZG9jdW1lbnQncyBjb250ZW50cyBhdCB0aGUgdGltZSBvZiBzYXZlT3JpZ2luYWxzLiAoSW4gdGhlIGNhc2VcbiAgLy8gb2YgYW4gaW5zZXJ0ZWQgZG9jdW1lbnQsIHVuZGVmaW5lZCBpcyB0aGUgdmFsdWUuKSBZb3UgbXVzdCBhbHRlcm5hdGVcbiAgLy8gYmV0d2VlbiBjYWxscyB0byBzYXZlT3JpZ2luYWxzKCkgYW5kIHJldHJpZXZlT3JpZ2luYWxzKCkuXG4gIHNhdmVPcmlnaW5hbHMoKSB7XG4gICAgaWYgKHRoaXMuX3NhdmVkT3JpZ2luYWxzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbGxlZCBzYXZlT3JpZ2luYWxzIHR3aWNlIHdpdGhvdXQgcmV0cmlldmVPcmlnaW5hbHMnKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zYXZlZE9yaWdpbmFscyA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICB9XG5cbiAgLy8gWFhYIGF0b21pY2l0eTogaWYgbXVsdGkgaXMgdHJ1ZSwgYW5kIG9uZSBtb2RpZmljYXRpb24gZmFpbHMsIGRvXG4gIC8vIHdlIHJvbGxiYWNrIHRoZSB3aG9sZSBvcGVyYXRpb24sIG9yIHdoYXQ/XG4gIHVwZGF0ZShzZWxlY3RvciwgbW9kLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmICghIGNhbGxiYWNrICYmIG9wdGlvbnMgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IG51bGw7XG4gICAgfVxuXG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgY29uc3QgbWF0Y2hlciA9IG5ldyBNaW5pbW9uZ28uTWF0Y2hlcihzZWxlY3RvciwgdHJ1ZSk7XG5cbiAgICAvLyBTYXZlIHRoZSBvcmlnaW5hbCByZXN1bHRzIG9mIGFueSBxdWVyeSB0aGF0IHdlIG1pZ2h0IG5lZWQgdG9cbiAgICAvLyBfcmVjb21wdXRlUmVzdWx0cyBvbiwgYmVjYXVzZSBfbW9kaWZ5QW5kTm90aWZ5IHdpbGwgbXV0YXRlIHRoZSBvYmplY3RzIGluXG4gICAgLy8gaXQuIChXZSBkb24ndCBuZWVkIHRvIHNhdmUgdGhlIG9yaWdpbmFsIHJlc3VsdHMgb2YgcGF1c2VkIHF1ZXJpZXMgYmVjYXVzZVxuICAgIC8vIHRoZXkgYWxyZWFkeSBoYXZlIGEgcmVzdWx0c1NuYXBzaG90IGFuZCB3ZSB3b24ndCBiZSBkaWZmaW5nIGluXG4gICAgLy8gX3JlY29tcHV0ZVJlc3VsdHMuKVxuICAgIGNvbnN0IHFpZFRvT3JpZ2luYWxSZXN1bHRzID0ge307XG5cbiAgICAvLyBXZSBzaG91bGQgb25seSBjbG9uZSBlYWNoIGRvY3VtZW50IG9uY2UsIGV2ZW4gaWYgaXQgYXBwZWFycyBpbiBtdWx0aXBsZVxuICAgIC8vIHF1ZXJpZXNcbiAgICBjb25zdCBkb2NNYXAgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgICBjb25zdCBpZHNNYXRjaGVkID0gTG9jYWxDb2xsZWN0aW9uLl9pZHNNYXRjaGVkQnlTZWxlY3RvcihzZWxlY3Rvcik7XG5cbiAgICBPYmplY3Qua2V5cyh0aGlzLnF1ZXJpZXMpLmZvckVhY2gocWlkID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3FpZF07XG5cbiAgICAgIGlmICgocXVlcnkuY3Vyc29yLnNraXAgfHwgcXVlcnkuY3Vyc29yLmxpbWl0KSAmJiAhIHRoaXMucGF1c2VkKSB7XG4gICAgICAgIC8vIENhdGNoIHRoZSBjYXNlIG9mIGEgcmVhY3RpdmUgYGNvdW50KClgIG9uIGEgY3Vyc29yIHdpdGggc2tpcFxuICAgICAgICAvLyBvciBsaW1pdCwgd2hpY2ggcmVnaXN0ZXJzIGFuIHVub3JkZXJlZCBvYnNlcnZlLiBUaGlzIGlzIGFcbiAgICAgICAgLy8gcHJldHR5IHJhcmUgY2FzZSwgc28gd2UganVzdCBjbG9uZSB0aGUgZW50aXJlIHJlc3VsdCBzZXQgd2l0aFxuICAgICAgICAvLyBubyBvcHRpbWl6YXRpb25zIGZvciBkb2N1bWVudHMgdGhhdCBhcHBlYXIgaW4gdGhlc2UgcmVzdWx0XG4gICAgICAgIC8vIHNldHMgYW5kIG90aGVyIHF1ZXJpZXMuXG4gICAgICAgIGlmIChxdWVyeS5yZXN1bHRzIGluc3RhbmNlb2YgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcCkge1xuICAgICAgICAgIHFpZFRvT3JpZ2luYWxSZXN1bHRzW3FpZF0gPSBxdWVyeS5yZXN1bHRzLmNsb25lKCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCEocXVlcnkucmVzdWx0cyBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQXNzZXJ0aW9uIGZhaWxlZDogcXVlcnkucmVzdWx0cyBub3QgYW4gYXJyYXknKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENsb25lcyBhIGRvY3VtZW50IHRvIGJlIHN0b3JlZCBpbiBgcWlkVG9PcmlnaW5hbFJlc3VsdHNgXG4gICAgICAgIC8vIGJlY2F1c2UgaXQgbWF5IGJlIG1vZGlmaWVkIGJlZm9yZSB0aGUgbmV3IGFuZCBvbGQgcmVzdWx0IHNldHNcbiAgICAgICAgLy8gYXJlIGRpZmZlZC4gQnV0IGlmIHdlIGtub3cgZXhhY3RseSB3aGljaCBkb2N1bWVudCBJRHMgd2UncmVcbiAgICAgICAgLy8gZ29pbmcgdG8gbW9kaWZ5LCB0aGVuIHdlIG9ubHkgbmVlZCB0byBjbG9uZSB0aG9zZS5cbiAgICAgICAgY29uc3QgbWVtb2l6ZWRDbG9uZUlmTmVlZGVkID0gZG9jID0+IHtcbiAgICAgICAgICBpZiAoZG9jTWFwLmhhcyhkb2MuX2lkKSkge1xuICAgICAgICAgICAgcmV0dXJuIGRvY01hcC5nZXQoZG9jLl9pZCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgZG9jVG9NZW1vaXplID0gKFxuICAgICAgICAgICAgaWRzTWF0Y2hlZCAmJlxuICAgICAgICAgICAgIWlkc01hdGNoZWQuc29tZShpZCA9PiBFSlNPTi5lcXVhbHMoaWQsIGRvYy5faWQpKVxuICAgICAgICAgICkgPyBkb2MgOiBFSlNPTi5jbG9uZShkb2MpO1xuXG4gICAgICAgICAgZG9jTWFwLnNldChkb2MuX2lkLCBkb2NUb01lbW9pemUpO1xuXG4gICAgICAgICAgcmV0dXJuIGRvY1RvTWVtb2l6ZTtcbiAgICAgICAgfTtcblxuICAgICAgICBxaWRUb09yaWdpbmFsUmVzdWx0c1txaWRdID0gcXVlcnkucmVzdWx0cy5tYXAobWVtb2l6ZWRDbG9uZUlmTmVlZGVkKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IHJlY29tcHV0ZVFpZHMgPSB7fTtcblxuICAgIGxldCB1cGRhdGVDb3VudCA9IDA7XG5cbiAgICB0aGlzLl9lYWNoUG9zc2libHlNYXRjaGluZ0RvYyhzZWxlY3RvciwgKGRvYywgaWQpID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5UmVzdWx0ID0gbWF0Y2hlci5kb2N1bWVudE1hdGNoZXMoZG9jKTtcblxuICAgICAgaWYgKHF1ZXJ5UmVzdWx0LnJlc3VsdCkge1xuICAgICAgICAvLyBYWFggU2hvdWxkIHdlIHNhdmUgdGhlIG9yaWdpbmFsIGV2ZW4gaWYgbW9kIGVuZHMgdXAgYmVpbmcgYSBuby1vcD9cbiAgICAgICAgdGhpcy5fc2F2ZU9yaWdpbmFsKGlkLCBkb2MpO1xuICAgICAgICB0aGlzLl9tb2RpZnlBbmROb3RpZnkoXG4gICAgICAgICAgZG9jLFxuICAgICAgICAgIG1vZCxcbiAgICAgICAgICByZWNvbXB1dGVRaWRzLFxuICAgICAgICAgIHF1ZXJ5UmVzdWx0LmFycmF5SW5kaWNlc1xuICAgICAgICApO1xuXG4gICAgICAgICsrdXBkYXRlQ291bnQ7XG5cbiAgICAgICAgaWYgKCFvcHRpb25zLm11bHRpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBicmVha1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuXG4gICAgT2JqZWN0LmtleXMocmVjb21wdXRlUWlkcykuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgIHRoaXMuX3JlY29tcHV0ZVJlc3VsdHMocXVlcnksIHFpZFRvT3JpZ2luYWxSZXN1bHRzW3FpZF0pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5fb2JzZXJ2ZVF1ZXVlLmRyYWluKCk7XG5cbiAgICAvLyBJZiB3ZSBhcmUgZG9pbmcgYW4gdXBzZXJ0LCBhbmQgd2UgZGlkbid0IG1vZGlmeSBhbnkgZG9jdW1lbnRzIHlldCwgdGhlblxuICAgIC8vIGl0J3MgdGltZSB0byBkbyBhbiBpbnNlcnQuIEZpZ3VyZSBvdXQgd2hhdCBkb2N1bWVudCB3ZSBhcmUgaW5zZXJ0aW5nLCBhbmRcbiAgICAvLyBnZW5lcmF0ZSBhbiBpZCBmb3IgaXQuXG4gICAgbGV0IGluc2VydGVkSWQ7XG4gICAgaWYgKHVwZGF0ZUNvdW50ID09PSAwICYmIG9wdGlvbnMudXBzZXJ0KSB7XG4gICAgICBjb25zdCBkb2MgPSBMb2NhbENvbGxlY3Rpb24uX2NyZWF0ZVVwc2VydERvY3VtZW50KHNlbGVjdG9yLCBtb2QpO1xuICAgICAgaWYgKCEgZG9jLl9pZCAmJiBvcHRpb25zLmluc2VydGVkSWQpIHtcbiAgICAgICAgZG9jLl9pZCA9IG9wdGlvbnMuaW5zZXJ0ZWRJZDtcbiAgICAgIH1cblxuICAgICAgaW5zZXJ0ZWRJZCA9IHRoaXMuaW5zZXJ0KGRvYyk7XG4gICAgICB1cGRhdGVDb3VudCA9IDE7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRoZSBudW1iZXIgb2YgYWZmZWN0ZWQgZG9jdW1lbnRzLCBvciBpbiB0aGUgdXBzZXJ0IGNhc2UsIGFuIG9iamVjdFxuICAgIC8vIGNvbnRhaW5pbmcgdGhlIG51bWJlciBvZiBhZmZlY3RlZCBkb2NzIGFuZCB0aGUgaWQgb2YgdGhlIGRvYyB0aGF0IHdhc1xuICAgIC8vIGluc2VydGVkLCBpZiBhbnkuXG4gICAgbGV0IHJlc3VsdDtcbiAgICBpZiAob3B0aW9ucy5fcmV0dXJuT2JqZWN0KSB7XG4gICAgICByZXN1bHQgPSB7bnVtYmVyQWZmZWN0ZWQ6IHVwZGF0ZUNvdW50fTtcblxuICAgICAgaWYgKGluc2VydGVkSWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXN1bHQuaW5zZXJ0ZWRJZCA9IGluc2VydGVkSWQ7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCA9IHVwZGF0ZUNvdW50O1xuICAgIH1cblxuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgTWV0ZW9yLmRlZmVyKCgpID0+IHtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyBBIGNvbnZlbmllbmNlIHdyYXBwZXIgb24gdXBkYXRlLiBMb2NhbENvbGxlY3Rpb24udXBzZXJ0KHNlbCwgbW9kKSBpc1xuICAvLyBlcXVpdmFsZW50IHRvIExvY2FsQ29sbGVjdGlvbi51cGRhdGUoc2VsLCBtb2QsIHt1cHNlcnQ6IHRydWUsXG4gIC8vIF9yZXR1cm5PYmplY3Q6IHRydWV9KS5cbiAgdXBzZXJ0KHNlbGVjdG9yLCBtb2QsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFjYWxsYmFjayAmJiB0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnVwZGF0ZShcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgbW9kLFxuICAgICAgT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywge3Vwc2VydDogdHJ1ZSwgX3JldHVybk9iamVjdDogdHJ1ZX0pLFxuICAgICAgY2FsbGJhY2tcbiAgICApO1xuICB9XG5cbiAgLy8gSXRlcmF0ZXMgb3ZlciBhIHN1YnNldCBvZiBkb2N1bWVudHMgdGhhdCBjb3VsZCBtYXRjaCBzZWxlY3RvcjsgY2FsbHNcbiAgLy8gZm4oZG9jLCBpZCkgb24gZWFjaCBvZiB0aGVtLiAgU3BlY2lmaWNhbGx5LCBpZiBzZWxlY3RvciBzcGVjaWZpZXNcbiAgLy8gc3BlY2lmaWMgX2lkJ3MsIGl0IG9ubHkgbG9va3MgYXQgdGhvc2UuICBkb2MgaXMgKm5vdCogY2xvbmVkOiBpdCBpcyB0aGVcbiAgLy8gc2FtZSBvYmplY3QgdGhhdCBpcyBpbiBfZG9jcy5cbiAgX2VhY2hQb3NzaWJseU1hdGNoaW5nRG9jKHNlbGVjdG9yLCBmbikge1xuICAgIGNvbnN0IHNwZWNpZmljSWRzID0gTG9jYWxDb2xsZWN0aW9uLl9pZHNNYXRjaGVkQnlTZWxlY3RvcihzZWxlY3Rvcik7XG5cbiAgICBpZiAoc3BlY2lmaWNJZHMpIHtcbiAgICAgIHNwZWNpZmljSWRzLnNvbWUoaWQgPT4ge1xuICAgICAgICBjb25zdCBkb2MgPSB0aGlzLl9kb2NzLmdldChpZCk7XG5cbiAgICAgICAgaWYgKGRvYykge1xuICAgICAgICAgIHJldHVybiBmbihkb2MsIGlkKSA9PT0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9kb2NzLmZvckVhY2goZm4pO1xuICAgIH1cbiAgfVxuXG4gIF9tb2RpZnlBbmROb3RpZnkoZG9jLCBtb2QsIHJlY29tcHV0ZVFpZHMsIGFycmF5SW5kaWNlcykge1xuICAgIGNvbnN0IG1hdGNoZWRfYmVmb3JlID0ge307XG5cbiAgICBPYmplY3Qua2V5cyh0aGlzLnF1ZXJpZXMpLmZvckVhY2gocWlkID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW3FpZF07XG5cbiAgICAgIGlmIChxdWVyeS5kaXJ0eSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChxdWVyeS5vcmRlcmVkKSB7XG4gICAgICAgIG1hdGNoZWRfYmVmb3JlW3FpZF0gPSBxdWVyeS5tYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhkb2MpLnJlc3VsdDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEJlY2F1c2Ugd2UgZG9uJ3Qgc3VwcG9ydCBza2lwIG9yIGxpbWl0ICh5ZXQpIGluIHVub3JkZXJlZCBxdWVyaWVzLCB3ZVxuICAgICAgICAvLyBjYW4ganVzdCBkbyBhIGRpcmVjdCBsb29rdXAuXG4gICAgICAgIG1hdGNoZWRfYmVmb3JlW3FpZF0gPSBxdWVyeS5yZXN1bHRzLmhhcyhkb2MuX2lkKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IG9sZF9kb2MgPSBFSlNPTi5jbG9uZShkb2MpO1xuXG4gICAgTG9jYWxDb2xsZWN0aW9uLl9tb2RpZnkoZG9jLCBtb2QsIHthcnJheUluZGljZXN9KTtcblxuICAgIE9iamVjdC5rZXlzKHRoaXMucXVlcmllcykuZm9yRWFjaChxaWQgPT4ge1xuICAgICAgY29uc3QgcXVlcnkgPSB0aGlzLnF1ZXJpZXNbcWlkXTtcblxuICAgICAgaWYgKHF1ZXJ5LmRpcnR5KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYWZ0ZXJNYXRjaCA9IHF1ZXJ5Lm1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKGRvYyk7XG4gICAgICBjb25zdCBhZnRlciA9IGFmdGVyTWF0Y2gucmVzdWx0O1xuICAgICAgY29uc3QgYmVmb3JlID0gbWF0Y2hlZF9iZWZvcmVbcWlkXTtcblxuICAgICAgaWYgKGFmdGVyICYmIHF1ZXJ5LmRpc3RhbmNlcyAmJiBhZnRlck1hdGNoLmRpc3RhbmNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcXVlcnkuZGlzdGFuY2VzLnNldChkb2MuX2lkLCBhZnRlck1hdGNoLmRpc3RhbmNlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHF1ZXJ5LmN1cnNvci5za2lwIHx8IHF1ZXJ5LmN1cnNvci5saW1pdCkge1xuICAgICAgICAvLyBXZSBuZWVkIHRvIHJlY29tcHV0ZSBhbnkgcXVlcnkgd2hlcmUgdGhlIGRvYyBtYXkgaGF2ZSBiZWVuIGluIHRoZVxuICAgICAgICAvLyBjdXJzb3IncyB3aW5kb3cgZWl0aGVyIGJlZm9yZSBvciBhZnRlciB0aGUgdXBkYXRlLiAoTm90ZSB0aGF0IGlmIHNraXBcbiAgICAgICAgLy8gb3IgbGltaXQgaXMgc2V0LCBcImJlZm9yZVwiIGFuZCBcImFmdGVyXCIgYmVpbmcgdHJ1ZSBkbyBub3QgbmVjZXNzYXJpbHlcbiAgICAgICAgLy8gbWVhbiB0aGF0IHRoZSBkb2N1bWVudCBpcyBpbiB0aGUgY3Vyc29yJ3Mgb3V0cHV0IGFmdGVyIHNraXAvbGltaXQgaXNcbiAgICAgICAgLy8gYXBwbGllZC4uLiBidXQgaWYgdGhleSBhcmUgZmFsc2UsIHRoZW4gdGhlIGRvY3VtZW50IGRlZmluaXRlbHkgaXMgTk9UXG4gICAgICAgIC8vIGluIHRoZSBvdXRwdXQuIFNvIGl0J3Mgc2FmZSB0byBza2lwIHJlY29tcHV0ZSBpZiBuZWl0aGVyIGJlZm9yZSBvclxuICAgICAgICAvLyBhZnRlciBhcmUgdHJ1ZS4pXG4gICAgICAgIGlmIChiZWZvcmUgfHwgYWZ0ZXIpIHtcbiAgICAgICAgICByZWNvbXB1dGVRaWRzW3FpZF0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGJlZm9yZSAmJiAhYWZ0ZXIpIHtcbiAgICAgICAgTG9jYWxDb2xsZWN0aW9uLl9yZW1vdmVGcm9tUmVzdWx0cyhxdWVyeSwgZG9jKTtcbiAgICAgIH0gZWxzZSBpZiAoIWJlZm9yZSAmJiBhZnRlcikge1xuICAgICAgICBMb2NhbENvbGxlY3Rpb24uX2luc2VydEluUmVzdWx0cyhxdWVyeSwgZG9jKTtcbiAgICAgIH0gZWxzZSBpZiAoYmVmb3JlICYmIGFmdGVyKSB7XG4gICAgICAgIExvY2FsQ29sbGVjdGlvbi5fdXBkYXRlSW5SZXN1bHRzKHF1ZXJ5LCBkb2MsIG9sZF9kb2MpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8gUmVjb21wdXRlcyB0aGUgcmVzdWx0cyBvZiBhIHF1ZXJ5IGFuZCBydW5zIG9ic2VydmUgY2FsbGJhY2tzIGZvciB0aGVcbiAgLy8gZGlmZmVyZW5jZSBiZXR3ZWVuIHRoZSBwcmV2aW91cyByZXN1bHRzIGFuZCB0aGUgY3VycmVudCByZXN1bHRzICh1bmxlc3NcbiAgLy8gcGF1c2VkKS4gVXNlZCBmb3Igc2tpcC9saW1pdCBxdWVyaWVzLlxuICAvL1xuICAvLyBXaGVuIHRoaXMgaXMgdXNlZCBieSBpbnNlcnQgb3IgcmVtb3ZlLCBpdCBjYW4ganVzdCB1c2UgcXVlcnkucmVzdWx0cyBmb3JcbiAgLy8gdGhlIG9sZCByZXN1bHRzIChhbmQgdGhlcmUncyBubyBuZWVkIHRvIHBhc3MgaW4gb2xkUmVzdWx0cyksIGJlY2F1c2UgdGhlc2VcbiAgLy8gb3BlcmF0aW9ucyBkb24ndCBtdXRhdGUgdGhlIGRvY3VtZW50cyBpbiB0aGUgY29sbGVjdGlvbi4gVXBkYXRlIG5lZWRzIHRvXG4gIC8vIHBhc3MgaW4gYW4gb2xkUmVzdWx0cyB3aGljaCB3YXMgZGVlcC1jb3BpZWQgYmVmb3JlIHRoZSBtb2RpZmllciB3YXNcbiAgLy8gYXBwbGllZC5cbiAgLy9cbiAgLy8gb2xkUmVzdWx0cyBpcyBndWFyYW50ZWVkIHRvIGJlIGlnbm9yZWQgaWYgdGhlIHF1ZXJ5IGlzIG5vdCBwYXVzZWQuXG4gIF9yZWNvbXB1dGVSZXN1bHRzKHF1ZXJ5LCBvbGRSZXN1bHRzKSB7XG4gICAgaWYgKHRoaXMucGF1c2VkKSB7XG4gICAgICAvLyBUaGVyZSdzIG5vIHJlYXNvbiB0byByZWNvbXB1dGUgdGhlIHJlc3VsdHMgbm93IGFzIHdlJ3JlIHN0aWxsIHBhdXNlZC5cbiAgICAgIC8vIEJ5IGZsYWdnaW5nIHRoZSBxdWVyeSBhcyBcImRpcnR5XCIsIHRoZSByZWNvbXB1dGUgd2lsbCBiZSBwZXJmb3JtZWRcbiAgICAgIC8vIHdoZW4gcmVzdW1lT2JzZXJ2ZXJzIGlzIGNhbGxlZC5cbiAgICAgIHF1ZXJ5LmRpcnR5ID0gdHJ1ZTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMucGF1c2VkICYmICFvbGRSZXN1bHRzKSB7XG4gICAgICBvbGRSZXN1bHRzID0gcXVlcnkucmVzdWx0cztcbiAgICB9XG5cbiAgICBpZiAocXVlcnkuZGlzdGFuY2VzKSB7XG4gICAgICBxdWVyeS5kaXN0YW5jZXMuY2xlYXIoKTtcbiAgICB9XG5cbiAgICBxdWVyeS5yZXN1bHRzID0gcXVlcnkuY3Vyc29yLl9nZXRSYXdPYmplY3RzKHtcbiAgICAgIGRpc3RhbmNlczogcXVlcnkuZGlzdGFuY2VzLFxuICAgICAgb3JkZXJlZDogcXVlcnkub3JkZXJlZFxuICAgIH0pO1xuXG4gICAgaWYgKCF0aGlzLnBhdXNlZCkge1xuICAgICAgTG9jYWxDb2xsZWN0aW9uLl9kaWZmUXVlcnlDaGFuZ2VzKFxuICAgICAgICBxdWVyeS5vcmRlcmVkLFxuICAgICAgICBvbGRSZXN1bHRzLFxuICAgICAgICBxdWVyeS5yZXN1bHRzLFxuICAgICAgICBxdWVyeSxcbiAgICAgICAge3Byb2plY3Rpb25GbjogcXVlcnkucHJvamVjdGlvbkZufVxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBfc2F2ZU9yaWdpbmFsKGlkLCBkb2MpIHtcbiAgICAvLyBBcmUgd2UgZXZlbiB0cnlpbmcgdG8gc2F2ZSBvcmlnaW5hbHM/XG4gICAgaWYgKCF0aGlzLl9zYXZlZE9yaWdpbmFscykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIEhhdmUgd2UgcHJldmlvdXNseSBtdXRhdGVkIHRoZSBvcmlnaW5hbCAoYW5kIHNvICdkb2MnIGlzIG5vdCBhY3R1YWxseVxuICAgIC8vIG9yaWdpbmFsKT8gIChOb3RlIHRoZSAnaGFzJyBjaGVjayByYXRoZXIgdGhhbiB0cnV0aDogd2Ugc3RvcmUgdW5kZWZpbmVkXG4gICAgLy8gaGVyZSBmb3IgaW5zZXJ0ZWQgZG9jcyEpXG4gICAgaWYgKHRoaXMuX3NhdmVkT3JpZ2luYWxzLmhhcyhpZCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLl9zYXZlZE9yaWdpbmFscy5zZXQoaWQsIEVKU09OLmNsb25lKGRvYykpO1xuICB9XG59XG5cbkxvY2FsQ29sbGVjdGlvbi5DdXJzb3IgPSBDdXJzb3I7XG5cbkxvY2FsQ29sbGVjdGlvbi5PYnNlcnZlSGFuZGxlID0gT2JzZXJ2ZUhhbmRsZTtcblxuLy8gWFhYIG1heWJlIG1vdmUgdGhlc2UgaW50byBhbm90aGVyIE9ic2VydmVIZWxwZXJzIHBhY2thZ2Ugb3Igc29tZXRoaW5nXG5cbi8vIF9DYWNoaW5nQ2hhbmdlT2JzZXJ2ZXIgaXMgYW4gb2JqZWN0IHdoaWNoIHJlY2VpdmVzIG9ic2VydmVDaGFuZ2VzIGNhbGxiYWNrc1xuLy8gYW5kIGtlZXBzIGEgY2FjaGUgb2YgdGhlIGN1cnJlbnQgY3Vyc29yIHN0YXRlIHVwIHRvIGRhdGUgaW4gdGhpcy5kb2NzLiBVc2Vyc1xuLy8gb2YgdGhpcyBjbGFzcyBzaG91bGQgcmVhZCB0aGUgZG9jcyBmaWVsZCBidXQgbm90IG1vZGlmeSBpdC4gWW91IHNob3VsZCBwYXNzXG4vLyB0aGUgXCJhcHBseUNoYW5nZVwiIGZpZWxkIGFzIHRoZSBjYWxsYmFja3MgdG8gdGhlIHVuZGVybHlpbmcgb2JzZXJ2ZUNoYW5nZXNcbi8vIGNhbGwuIE9wdGlvbmFsbHksIHlvdSBjYW4gc3BlY2lmeSB5b3VyIG93biBvYnNlcnZlQ2hhbmdlcyBjYWxsYmFja3Mgd2hpY2ggYXJlXG4vLyBpbnZva2VkIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgZG9jcyBmaWVsZCBpcyB1cGRhdGVkOyB0aGlzIG9iamVjdCBpcyBtYWRlXG4vLyBhdmFpbGFibGUgYXMgYHRoaXNgIHRvIHRob3NlIGNhbGxiYWNrcy5cbkxvY2FsQ29sbGVjdGlvbi5fQ2FjaGluZ0NoYW5nZU9ic2VydmVyID0gY2xhc3MgX0NhY2hpbmdDaGFuZ2VPYnNlcnZlciB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IG9yZGVyZWRGcm9tQ2FsbGJhY2tzID0gKFxuICAgICAgb3B0aW9ucy5jYWxsYmFja3MgJiZcbiAgICAgIExvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3NBcmVPcmRlcmVkKG9wdGlvbnMuY2FsbGJhY2tzKVxuICAgICk7XG5cbiAgICBpZiAoaGFzT3duLmNhbGwob3B0aW9ucywgJ29yZGVyZWQnKSkge1xuICAgICAgdGhpcy5vcmRlcmVkID0gb3B0aW9ucy5vcmRlcmVkO1xuXG4gICAgICBpZiAob3B0aW9ucy5jYWxsYmFja3MgJiYgb3B0aW9ucy5vcmRlcmVkICE9PSBvcmRlcmVkRnJvbUNhbGxiYWNrcykge1xuICAgICAgICB0aHJvdyBFcnJvcignb3JkZXJlZCBvcHRpb24gZG9lc25cXCd0IG1hdGNoIGNhbGxiYWNrcycpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5jYWxsYmFja3MpIHtcbiAgICAgIHRoaXMub3JkZXJlZCA9IG9yZGVyZWRGcm9tQ2FsbGJhY2tzO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBFcnJvcignbXVzdCBwcm92aWRlIG9yZGVyZWQgb3IgY2FsbGJhY2tzJyk7XG4gICAgfVxuXG4gICAgY29uc3QgY2FsbGJhY2tzID0gb3B0aW9ucy5jYWxsYmFja3MgfHwge307XG5cbiAgICBpZiAodGhpcy5vcmRlcmVkKSB7XG4gICAgICB0aGlzLmRvY3MgPSBuZXcgT3JkZXJlZERpY3QoTW9uZ29JRC5pZFN0cmluZ2lmeSk7XG4gICAgICB0aGlzLmFwcGx5Q2hhbmdlID0ge1xuICAgICAgICBhZGRlZEJlZm9yZTogKGlkLCBmaWVsZHMsIGJlZm9yZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGRvYyA9IEVKU09OLmNsb25lKGZpZWxkcyk7XG5cbiAgICAgICAgICBkb2MuX2lkID0gaWQ7XG5cbiAgICAgICAgICBpZiAoY2FsbGJhY2tzLmFkZGVkQmVmb3JlKSB7XG4gICAgICAgICAgICBjYWxsYmFja3MuYWRkZWRCZWZvcmUuY2FsbCh0aGlzLCBpZCwgZmllbGRzLCBiZWZvcmUpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFRoaXMgbGluZSB0cmlnZ2VycyBpZiB3ZSBwcm92aWRlIGFkZGVkIHdpdGggbW92ZWRCZWZvcmUuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrcy5hZGRlZCkge1xuICAgICAgICAgICAgY2FsbGJhY2tzLmFkZGVkLmNhbGwodGhpcywgaWQsIGZpZWxkcyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gWFhYIGNvdWxkIGBiZWZvcmVgIGJlIGEgZmFsc3kgSUQ/ICBUZWNobmljYWxseVxuICAgICAgICAgIC8vIGlkU3RyaW5naWZ5IHNlZW1zIHRvIGFsbG93IGZvciB0aGVtIC0tIHRob3VnaFxuICAgICAgICAgIC8vIE9yZGVyZWREaWN0IHdvbid0IGNhbGwgc3RyaW5naWZ5IG9uIGEgZmFsc3kgYXJnLlxuICAgICAgICAgIHRoaXMuZG9jcy5wdXRCZWZvcmUoaWQsIGRvYywgYmVmb3JlIHx8IG51bGwpO1xuICAgICAgICB9LFxuICAgICAgICBtb3ZlZEJlZm9yZTogKGlkLCBiZWZvcmUpID0+IHtcbiAgICAgICAgICBjb25zdCBkb2MgPSB0aGlzLmRvY3MuZ2V0KGlkKTtcblxuICAgICAgICAgIGlmIChjYWxsYmFja3MubW92ZWRCZWZvcmUpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrcy5tb3ZlZEJlZm9yZS5jYWxsKHRoaXMsIGlkLCBiZWZvcmUpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMuZG9jcy5tb3ZlQmVmb3JlKGlkLCBiZWZvcmUgfHwgbnVsbCk7XG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRvY3MgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgICAgIHRoaXMuYXBwbHlDaGFuZ2UgPSB7XG4gICAgICAgIGFkZGVkOiAoaWQsIGZpZWxkcykgPT4ge1xuICAgICAgICAgIGNvbnN0IGRvYyA9IEVKU09OLmNsb25lKGZpZWxkcyk7XG5cbiAgICAgICAgICBpZiAoY2FsbGJhY2tzLmFkZGVkKSB7XG4gICAgICAgICAgICBjYWxsYmFja3MuYWRkZWQuY2FsbCh0aGlzLCBpZCwgZmllbGRzKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBkb2MuX2lkID0gaWQ7XG5cbiAgICAgICAgICB0aGlzLmRvY3Muc2V0KGlkLCAgZG9jKTtcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gVGhlIG1ldGhvZHMgaW4gX0lkTWFwIGFuZCBPcmRlcmVkRGljdCB1c2VkIGJ5IHRoZXNlIGNhbGxiYWNrcyBhcmVcbiAgICAvLyBpZGVudGljYWwuXG4gICAgdGhpcy5hcHBseUNoYW5nZS5jaGFuZ2VkID0gKGlkLCBmaWVsZHMpID0+IHtcbiAgICAgIGNvbnN0IGRvYyA9IHRoaXMuZG9jcy5nZXQoaWQpO1xuXG4gICAgICBpZiAoIWRvYykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gaWQgZm9yIGNoYW5nZWQ6ICR7aWR9YCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjYWxsYmFja3MuY2hhbmdlZCkge1xuICAgICAgICBjYWxsYmFja3MuY2hhbmdlZC5jYWxsKHRoaXMsIGlkLCBFSlNPTi5jbG9uZShmaWVsZHMpKTtcbiAgICAgIH1cblxuICAgICAgRGlmZlNlcXVlbmNlLmFwcGx5Q2hhbmdlcyhkb2MsIGZpZWxkcyk7XG4gICAgfTtcblxuICAgIHRoaXMuYXBwbHlDaGFuZ2UucmVtb3ZlZCA9IGlkID0+IHtcbiAgICAgIGlmIChjYWxsYmFja3MucmVtb3ZlZCkge1xuICAgICAgICBjYWxsYmFja3MucmVtb3ZlZC5jYWxsKHRoaXMsIGlkKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5kb2NzLnJlbW92ZShpZCk7XG4gICAgfTtcbiAgfVxufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9JZE1hcCA9IGNsYXNzIF9JZE1hcCBleHRlbmRzIElkTWFwIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoTW9uZ29JRC5pZFN0cmluZ2lmeSwgTW9uZ29JRC5pZFBhcnNlKTtcbiAgfVxufTtcblxuLy8gV3JhcCBhIHRyYW5zZm9ybSBmdW5jdGlvbiB0byByZXR1cm4gb2JqZWN0cyB0aGF0IGhhdmUgdGhlIF9pZCBmaWVsZFxuLy8gb2YgdGhlIHVudHJhbnNmb3JtZWQgZG9jdW1lbnQuIFRoaXMgZW5zdXJlcyB0aGF0IHN1YnN5c3RlbXMgc3VjaCBhc1xuLy8gdGhlIG9ic2VydmUtc2VxdWVuY2UgcGFja2FnZSB0aGF0IGNhbGwgYG9ic2VydmVgIGNhbiBrZWVwIHRyYWNrIG9mXG4vLyB0aGUgZG9jdW1lbnRzIGlkZW50aXRpZXMuXG4vL1xuLy8gLSBSZXF1aXJlIHRoYXQgaXQgcmV0dXJucyBvYmplY3RzXG4vLyAtIElmIHRoZSByZXR1cm4gdmFsdWUgaGFzIGFuIF9pZCBmaWVsZCwgdmVyaWZ5IHRoYXQgaXQgbWF0Y2hlcyB0aGVcbi8vICAgb3JpZ2luYWwgX2lkIGZpZWxkXG4vLyAtIElmIHRoZSByZXR1cm4gdmFsdWUgZG9lc24ndCBoYXZlIGFuIF9pZCBmaWVsZCwgYWRkIGl0IGJhY2suXG5Mb2NhbENvbGxlY3Rpb24ud3JhcFRyYW5zZm9ybSA9IHRyYW5zZm9ybSA9PiB7XG4gIGlmICghdHJhbnNmb3JtKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBObyBuZWVkIHRvIGRvdWJseS13cmFwIHRyYW5zZm9ybXMuXG4gIGlmICh0cmFuc2Zvcm0uX193cmFwcGVkVHJhbnNmb3JtX18pIHtcbiAgICByZXR1cm4gdHJhbnNmb3JtO1xuICB9XG5cbiAgY29uc3Qgd3JhcHBlZCA9IGRvYyA9PiB7XG4gICAgaWYgKCFoYXNPd24uY2FsbChkb2MsICdfaWQnKSkge1xuICAgICAgLy8gWFhYIGRvIHdlIGV2ZXIgaGF2ZSBhIHRyYW5zZm9ybSBvbiB0aGUgb3Bsb2cncyBjb2xsZWN0aW9uPyBiZWNhdXNlIHRoYXRcbiAgICAgIC8vIGNvbGxlY3Rpb24gaGFzIG5vIF9pZC5cbiAgICAgIHRocm93IG5ldyBFcnJvcignY2FuIG9ubHkgdHJhbnNmb3JtIGRvY3VtZW50cyB3aXRoIF9pZCcpO1xuICAgIH1cblxuICAgIGNvbnN0IGlkID0gZG9jLl9pZDtcblxuICAgIC8vIFhYWCBjb25zaWRlciBtYWtpbmcgdHJhY2tlciBhIHdlYWsgZGVwZW5kZW5jeSBhbmQgY2hlY2tpbmdcbiAgICAvLyBQYWNrYWdlLnRyYWNrZXIgaGVyZVxuICAgIGNvbnN0IHRyYW5zZm9ybWVkID0gVHJhY2tlci5ub25yZWFjdGl2ZSgoKSA9PiB0cmFuc2Zvcm0oZG9jKSk7XG5cbiAgICBpZiAoIUxvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdCh0cmFuc2Zvcm1lZCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigndHJhbnNmb3JtIG11c3QgcmV0dXJuIG9iamVjdCcpO1xuICAgIH1cblxuICAgIGlmIChoYXNPd24uY2FsbCh0cmFuc2Zvcm1lZCwgJ19pZCcpKSB7XG4gICAgICBpZiAoIUVKU09OLmVxdWFscyh0cmFuc2Zvcm1lZC5faWQsIGlkKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3RyYW5zZm9ybWVkIGRvY3VtZW50IGNhblxcJ3QgaGF2ZSBkaWZmZXJlbnQgX2lkJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRyYW5zZm9ybWVkLl9pZCA9IGlkO1xuICAgIH1cblxuICAgIHJldHVybiB0cmFuc2Zvcm1lZDtcbiAgfTtcblxuICB3cmFwcGVkLl9fd3JhcHBlZFRyYW5zZm9ybV9fID0gdHJ1ZTtcblxuICByZXR1cm4gd3JhcHBlZDtcbn07XG5cbi8vIFhYWCB0aGUgc29ydGVkLXF1ZXJ5IGxvZ2ljIGJlbG93IGlzIGxhdWdoYWJseSBpbmVmZmljaWVudC4gd2UnbGxcbi8vIG5lZWQgdG8gY29tZSB1cCB3aXRoIGEgYmV0dGVyIGRhdGFzdHJ1Y3R1cmUgZm9yIHRoaXMuXG4vL1xuLy8gWFhYIHRoZSBsb2dpYyBmb3Igb2JzZXJ2aW5nIHdpdGggYSBza2lwIG9yIGEgbGltaXQgaXMgZXZlbiBtb3JlXG4vLyBsYXVnaGFibHkgaW5lZmZpY2llbnQuIHdlIHJlY29tcHV0ZSB0aGUgd2hvbGUgcmVzdWx0cyBldmVyeSB0aW1lIVxuXG4vLyBUaGlzIGJpbmFyeSBzZWFyY2ggcHV0cyBhIHZhbHVlIGJldHdlZW4gYW55IGVxdWFsIHZhbHVlcywgYW5kIHRoZSBmaXJzdFxuLy8gbGVzc2VyIHZhbHVlLlxuTG9jYWxDb2xsZWN0aW9uLl9iaW5hcnlTZWFyY2ggPSAoY21wLCBhcnJheSwgdmFsdWUpID0+IHtcbiAgbGV0IGZpcnN0ID0gMDtcbiAgbGV0IHJhbmdlID0gYXJyYXkubGVuZ3RoO1xuXG4gIHdoaWxlIChyYW5nZSA+IDApIHtcbiAgICBjb25zdCBoYWxmUmFuZ2UgPSBNYXRoLmZsb29yKHJhbmdlIC8gMik7XG5cbiAgICBpZiAoY21wKHZhbHVlLCBhcnJheVtmaXJzdCArIGhhbGZSYW5nZV0pID49IDApIHtcbiAgICAgIGZpcnN0ICs9IGhhbGZSYW5nZSArIDE7XG4gICAgICByYW5nZSAtPSBoYWxmUmFuZ2UgKyAxO1xuICAgIH0gZWxzZSB7XG4gICAgICByYW5nZSA9IGhhbGZSYW5nZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmlyc3Q7XG59O1xuXG5Mb2NhbENvbGxlY3Rpb24uX2NoZWNrU3VwcG9ydGVkUHJvamVjdGlvbiA9IGZpZWxkcyA9PiB7XG4gIGlmIChmaWVsZHMgIT09IE9iamVjdChmaWVsZHMpIHx8IEFycmF5LmlzQXJyYXkoZmllbGRzKSkge1xuICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdmaWVsZHMgb3B0aW9uIG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gIH1cblxuICBPYmplY3Qua2V5cyhmaWVsZHMpLmZvckVhY2goa2V5UGF0aCA9PiB7XG4gICAgaWYgKGtleVBhdGguc3BsaXQoJy4nKS5pbmNsdWRlcygnJCcpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ01pbmltb25nbyBkb2VzblxcJ3Qgc3VwcG9ydCAkIG9wZXJhdG9yIGluIHByb2plY3Rpb25zIHlldC4nXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IHZhbHVlID0gZmllbGRzW2tleVBhdGhdO1xuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiZcbiAgICAgICAgWyckZWxlbU1hdGNoJywgJyRtZXRhJywgJyRzbGljZSddLnNvbWUoa2V5ID0+XG4gICAgICAgICAgaGFzT3duLmNhbGwodmFsdWUsIGtleSlcbiAgICAgICAgKSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdNaW5pbW9uZ28gZG9lc25cXCd0IHN1cHBvcnQgb3BlcmF0b3JzIGluIHByb2plY3Rpb25zIHlldC4nXG4gICAgICApO1xuICAgIH1cblxuICAgIGlmICghWzEsIDAsIHRydWUsIGZhbHNlXS5pbmNsdWRlcyh2YWx1ZSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnUHJvamVjdGlvbiB2YWx1ZXMgc2hvdWxkIGJlIG9uZSBvZiAxLCAwLCB0cnVlLCBvciBmYWxzZSdcbiAgICAgICk7XG4gICAgfVxuICB9KTtcbn07XG5cbi8vIEtub3dzIGhvdyB0byBjb21waWxlIGEgZmllbGRzIHByb2plY3Rpb24gdG8gYSBwcmVkaWNhdGUgZnVuY3Rpb24uXG4vLyBAcmV0dXJucyAtIEZ1bmN0aW9uOiBhIGNsb3N1cmUgdGhhdCBmaWx0ZXJzIG91dCBhbiBvYmplY3QgYWNjb3JkaW5nIHRvIHRoZVxuLy8gICAgICAgICAgICBmaWVsZHMgcHJvamVjdGlvbiBydWxlczpcbi8vICAgICAgICAgICAgQHBhcmFtIG9iaiAtIE9iamVjdDogTW9uZ29EQi1zdHlsZWQgZG9jdW1lbnRcbi8vICAgICAgICAgICAgQHJldHVybnMgLSBPYmplY3Q6IGEgZG9jdW1lbnQgd2l0aCB0aGUgZmllbGRzIGZpbHRlcmVkIG91dFxuLy8gICAgICAgICAgICAgICAgICAgICAgIGFjY29yZGluZyB0byBwcm9qZWN0aW9uIHJ1bGVzLiBEb2Vzbid0IHJldGFpbiBzdWJmaWVsZHNcbi8vICAgICAgICAgICAgICAgICAgICAgICBvZiBwYXNzZWQgYXJndW1lbnQuXG5Mb2NhbENvbGxlY3Rpb24uX2NvbXBpbGVQcm9qZWN0aW9uID0gZmllbGRzID0+IHtcbiAgTG9jYWxDb2xsZWN0aW9uLl9jaGVja1N1cHBvcnRlZFByb2plY3Rpb24oZmllbGRzKTtcblxuICBjb25zdCBfaWRQcm9qZWN0aW9uID0gZmllbGRzLl9pZCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IGZpZWxkcy5faWQ7XG4gIGNvbnN0IGRldGFpbHMgPSBwcm9qZWN0aW9uRGV0YWlscyhmaWVsZHMpO1xuXG4gIC8vIHJldHVybnMgdHJhbnNmb3JtZWQgZG9jIGFjY29yZGluZyB0byBydWxlVHJlZVxuICBjb25zdCB0cmFuc2Zvcm0gPSAoZG9jLCBydWxlVHJlZSkgPT4ge1xuICAgIC8vIFNwZWNpYWwgY2FzZSBmb3IgXCJzZXRzXCJcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkb2MpKSB7XG4gICAgICByZXR1cm4gZG9jLm1hcChzdWJkb2MgPT4gdHJhbnNmb3JtKHN1YmRvYywgcnVsZVRyZWUpKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSBkZXRhaWxzLmluY2x1ZGluZyA/IHt9IDogRUpTT04uY2xvbmUoZG9jKTtcblxuICAgIE9iamVjdC5rZXlzKHJ1bGVUcmVlKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICBpZiAoIWhhc093bi5jYWxsKGRvYywga2V5KSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJ1bGUgPSBydWxlVHJlZVtrZXldO1xuXG4gICAgICBpZiAocnVsZSA9PT0gT2JqZWN0KHJ1bGUpKSB7XG4gICAgICAgIC8vIEZvciBzdWItb2JqZWN0cy9zdWJzZXRzIHdlIGJyYW5jaFxuICAgICAgICBpZiAoZG9jW2tleV0gPT09IE9iamVjdChkb2Nba2V5XSkpIHtcbiAgICAgICAgICByZXN1bHRba2V5XSA9IHRyYW5zZm9ybShkb2Nba2V5XSwgcnVsZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZGV0YWlscy5pbmNsdWRpbmcpIHtcbiAgICAgICAgLy8gT3RoZXJ3aXNlIHdlIGRvbid0IGV2ZW4gdG91Y2ggdGhpcyBzdWJmaWVsZFxuICAgICAgICByZXN1bHRba2V5XSA9IEVKU09OLmNsb25lKGRvY1trZXldKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlbGV0ZSByZXN1bHRba2V5XTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgcmV0dXJuIGRvYyA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gdHJhbnNmb3JtKGRvYywgZGV0YWlscy50cmVlKTtcblxuICAgIGlmIChfaWRQcm9qZWN0aW9uICYmIGhhc093bi5jYWxsKGRvYywgJ19pZCcpKSB7XG4gICAgICByZXN1bHQuX2lkID0gZG9jLl9pZDtcbiAgICB9XG5cbiAgICBpZiAoIV9pZFByb2plY3Rpb24gJiYgaGFzT3duLmNhbGwocmVzdWx0LCAnX2lkJykpIHtcbiAgICAgIGRlbGV0ZSByZXN1bHQuX2lkO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG59O1xuXG4vLyBDYWxjdWxhdGVzIHRoZSBkb2N1bWVudCB0byBpbnNlcnQgaW4gY2FzZSB3ZSdyZSBkb2luZyBhbiB1cHNlcnQgYW5kIHRoZVxuLy8gc2VsZWN0b3IgZG9lcyBub3QgbWF0Y2ggYW55IGVsZW1lbnRzXG5Mb2NhbENvbGxlY3Rpb24uX2NyZWF0ZVVwc2VydERvY3VtZW50ID0gKHNlbGVjdG9yLCBtb2RpZmllcikgPT4ge1xuICBjb25zdCBzZWxlY3RvckRvY3VtZW50ID0gcG9wdWxhdGVEb2N1bWVudFdpdGhRdWVyeUZpZWxkcyhzZWxlY3Rvcik7XG4gIGNvbnN0IGlzTW9kaWZ5ID0gTG9jYWxDb2xsZWN0aW9uLl9pc01vZGlmaWNhdGlvbk1vZChtb2RpZmllcik7XG5cbiAgY29uc3QgbmV3RG9jID0ge307XG5cbiAgaWYgKHNlbGVjdG9yRG9jdW1lbnQuX2lkKSB7XG4gICAgbmV3RG9jLl9pZCA9IHNlbGVjdG9yRG9jdW1lbnQuX2lkO1xuICAgIGRlbGV0ZSBzZWxlY3RvckRvY3VtZW50Ll9pZDtcbiAgfVxuXG4gIC8vIFRoaXMgZG91YmxlIF9tb2RpZnkgY2FsbCBpcyBtYWRlIHRvIGhlbHAgd2l0aCBuZXN0ZWQgcHJvcGVydGllcyAoc2VlIGlzc3VlXG4gIC8vICM4NjMxKS4gV2UgZG8gdGhpcyBldmVuIGlmIGl0J3MgYSByZXBsYWNlbWVudCBmb3IgdmFsaWRhdGlvbiBwdXJwb3NlcyAoZS5nLlxuICAvLyBhbWJpZ3VvdXMgaWQncylcbiAgTG9jYWxDb2xsZWN0aW9uLl9tb2RpZnkobmV3RG9jLCB7JHNldDogc2VsZWN0b3JEb2N1bWVudH0pO1xuICBMb2NhbENvbGxlY3Rpb24uX21vZGlmeShuZXdEb2MsIG1vZGlmaWVyLCB7aXNJbnNlcnQ6IHRydWV9KTtcblxuICBpZiAoaXNNb2RpZnkpIHtcbiAgICByZXR1cm4gbmV3RG9jO1xuICB9XG5cbiAgLy8gUmVwbGFjZW1lbnQgY2FuIHRha2UgX2lkIGZyb20gcXVlcnkgZG9jdW1lbnRcbiAgY29uc3QgcmVwbGFjZW1lbnQgPSBPYmplY3QuYXNzaWduKHt9LCBtb2RpZmllcik7XG4gIGlmIChuZXdEb2MuX2lkKSB7XG4gICAgcmVwbGFjZW1lbnQuX2lkID0gbmV3RG9jLl9pZDtcbiAgfVxuXG4gIHJldHVybiByZXBsYWNlbWVudDtcbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5fZGlmZk9iamVjdHMgPSAobGVmdCwgcmlnaHQsIGNhbGxiYWNrcykgPT4ge1xuICByZXR1cm4gRGlmZlNlcXVlbmNlLmRpZmZPYmplY3RzKGxlZnQsIHJpZ2h0LCBjYWxsYmFja3MpO1xufTtcblxuLy8gb3JkZXJlZDogYm9vbC5cbi8vIG9sZF9yZXN1bHRzIGFuZCBuZXdfcmVzdWx0czogY29sbGVjdGlvbnMgb2YgZG9jdW1lbnRzLlxuLy8gICAgaWYgb3JkZXJlZCwgdGhleSBhcmUgYXJyYXlzLlxuLy8gICAgaWYgdW5vcmRlcmVkLCB0aGV5IGFyZSBJZE1hcHNcbkxvY2FsQ29sbGVjdGlvbi5fZGlmZlF1ZXJ5Q2hhbmdlcyA9IChvcmRlcmVkLCBvbGRSZXN1bHRzLCBuZXdSZXN1bHRzLCBvYnNlcnZlciwgb3B0aW9ucykgPT5cbiAgRGlmZlNlcXVlbmNlLmRpZmZRdWVyeUNoYW5nZXMob3JkZXJlZCwgb2xkUmVzdWx0cywgbmV3UmVzdWx0cywgb2JzZXJ2ZXIsIG9wdGlvbnMpXG47XG5cbkxvY2FsQ29sbGVjdGlvbi5fZGlmZlF1ZXJ5T3JkZXJlZENoYW5nZXMgPSAob2xkUmVzdWx0cywgbmV3UmVzdWx0cywgb2JzZXJ2ZXIsIG9wdGlvbnMpID0+XG4gIERpZmZTZXF1ZW5jZS5kaWZmUXVlcnlPcmRlcmVkQ2hhbmdlcyhvbGRSZXN1bHRzLCBuZXdSZXN1bHRzLCBvYnNlcnZlciwgb3B0aW9ucylcbjtcblxuTG9jYWxDb2xsZWN0aW9uLl9kaWZmUXVlcnlVbm9yZGVyZWRDaGFuZ2VzID0gKG9sZFJlc3VsdHMsIG5ld1Jlc3VsdHMsIG9ic2VydmVyLCBvcHRpb25zKSA9PlxuICBEaWZmU2VxdWVuY2UuZGlmZlF1ZXJ5VW5vcmRlcmVkQ2hhbmdlcyhvbGRSZXN1bHRzLCBuZXdSZXN1bHRzLCBvYnNlcnZlciwgb3B0aW9ucylcbjtcblxuTG9jYWxDb2xsZWN0aW9uLl9maW5kSW5PcmRlcmVkUmVzdWx0cyA9IChxdWVyeSwgZG9jKSA9PiB7XG4gIGlmICghcXVlcnkub3JkZXJlZCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ2FuXFwndCBjYWxsIF9maW5kSW5PcmRlcmVkUmVzdWx0cyBvbiB1bm9yZGVyZWQgcXVlcnknKTtcbiAgfVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcXVlcnkucmVzdWx0cy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChxdWVyeS5yZXN1bHRzW2ldID09PSBkb2MpIHtcbiAgICAgIHJldHVybiBpO1xuICAgIH1cbiAgfVxuXG4gIHRocm93IEVycm9yKCdvYmplY3QgbWlzc2luZyBmcm9tIHF1ZXJ5Jyk7XG59O1xuXG4vLyBJZiB0aGlzIGlzIGEgc2VsZWN0b3Igd2hpY2ggZXhwbGljaXRseSBjb25zdHJhaW5zIHRoZSBtYXRjaCBieSBJRCB0byBhIGZpbml0ZVxuLy8gbnVtYmVyIG9mIGRvY3VtZW50cywgcmV0dXJucyBhIGxpc3Qgb2YgdGhlaXIgSURzLiAgT3RoZXJ3aXNlIHJldHVybnNcbi8vIG51bGwuIE5vdGUgdGhhdCB0aGUgc2VsZWN0b3IgbWF5IGhhdmUgb3RoZXIgcmVzdHJpY3Rpb25zIHNvIGl0IG1heSBub3QgZXZlblxuLy8gbWF0Y2ggdGhvc2UgZG9jdW1lbnQhICBXZSBjYXJlIGFib3V0ICRpbiBhbmQgJGFuZCBzaW5jZSB0aG9zZSBhcmUgZ2VuZXJhdGVkXG4vLyBhY2Nlc3MtY29udHJvbGxlZCB1cGRhdGUgYW5kIHJlbW92ZS5cbkxvY2FsQ29sbGVjdGlvbi5faWRzTWF0Y2hlZEJ5U2VsZWN0b3IgPSBzZWxlY3RvciA9PiB7XG4gIC8vIElzIHRoZSBzZWxlY3RvciBqdXN0IGFuIElEP1xuICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWQoc2VsZWN0b3IpKSB7XG4gICAgcmV0dXJuIFtzZWxlY3Rvcl07XG4gIH1cblxuICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBEbyB3ZSBoYXZlIGFuIF9pZCBjbGF1c2U/XG4gIGlmIChoYXNPd24uY2FsbChzZWxlY3RvciwgJ19pZCcpKSB7XG4gICAgLy8gSXMgdGhlIF9pZCBjbGF1c2UganVzdCBhbiBJRD9cbiAgICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWQoc2VsZWN0b3IuX2lkKSkge1xuICAgICAgcmV0dXJuIFtzZWxlY3Rvci5faWRdO1xuICAgIH1cblxuICAgIC8vIElzIHRoZSBfaWQgY2xhdXNlIHtfaWQ6IHskaW46IFtcInhcIiwgXCJ5XCIsIFwielwiXX19P1xuICAgIGlmIChzZWxlY3Rvci5faWRcbiAgICAgICAgJiYgQXJyYXkuaXNBcnJheShzZWxlY3Rvci5faWQuJGluKVxuICAgICAgICAmJiBzZWxlY3Rvci5faWQuJGluLmxlbmd0aFxuICAgICAgICAmJiBzZWxlY3Rvci5faWQuJGluLmV2ZXJ5KExvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkKSkge1xuICAgICAgcmV0dXJuIHNlbGVjdG9yLl9pZC4kaW47XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBJZiB0aGlzIGlzIGEgdG9wLWxldmVsICRhbmQsIGFuZCBhbnkgb2YgdGhlIGNsYXVzZXMgY29uc3RyYWluIHRoZWlyXG4gIC8vIGRvY3VtZW50cywgdGhlbiB0aGUgd2hvbGUgc2VsZWN0b3IgaXMgY29uc3RyYWluZWQgYnkgYW55IG9uZSBjbGF1c2Unc1xuICAvLyBjb25zdHJhaW50LiAoV2VsbCwgYnkgdGhlaXIgaW50ZXJzZWN0aW9uLCBidXQgdGhhdCBzZWVtcyB1bmxpa2VseS4pXG4gIGlmIChBcnJheS5pc0FycmF5KHNlbGVjdG9yLiRhbmQpKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZWxlY3Rvci4kYW5kLmxlbmd0aDsgKytpKSB7XG4gICAgICBjb25zdCBzdWJJZHMgPSBMb2NhbENvbGxlY3Rpb24uX2lkc01hdGNoZWRCeVNlbGVjdG9yKHNlbGVjdG9yLiRhbmRbaV0pO1xuXG4gICAgICBpZiAoc3ViSWRzKSB7XG4gICAgICAgIHJldHVybiBzdWJJZHM7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59O1xuXG5Mb2NhbENvbGxlY3Rpb24uX2luc2VydEluUmVzdWx0cyA9IChxdWVyeSwgZG9jKSA9PiB7XG4gIGNvbnN0IGZpZWxkcyA9IEVKU09OLmNsb25lKGRvYyk7XG5cbiAgZGVsZXRlIGZpZWxkcy5faWQ7XG5cbiAgaWYgKHF1ZXJ5Lm9yZGVyZWQpIHtcbiAgICBpZiAoIXF1ZXJ5LnNvcnRlcikge1xuICAgICAgcXVlcnkuYWRkZWRCZWZvcmUoZG9jLl9pZCwgcXVlcnkucHJvamVjdGlvbkZuKGZpZWxkcyksIG51bGwpO1xuICAgICAgcXVlcnkucmVzdWx0cy5wdXNoKGRvYyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGkgPSBMb2NhbENvbGxlY3Rpb24uX2luc2VydEluU29ydGVkTGlzdChcbiAgICAgICAgcXVlcnkuc29ydGVyLmdldENvbXBhcmF0b3Ioe2Rpc3RhbmNlczogcXVlcnkuZGlzdGFuY2VzfSksXG4gICAgICAgIHF1ZXJ5LnJlc3VsdHMsXG4gICAgICAgIGRvY1xuICAgICAgKTtcblxuICAgICAgbGV0IG5leHQgPSBxdWVyeS5yZXN1bHRzW2kgKyAxXTtcbiAgICAgIGlmIChuZXh0KSB7XG4gICAgICAgIG5leHQgPSBuZXh0Ll9pZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5leHQgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBxdWVyeS5hZGRlZEJlZm9yZShkb2MuX2lkLCBxdWVyeS5wcm9qZWN0aW9uRm4oZmllbGRzKSwgbmV4dCk7XG4gICAgfVxuXG4gICAgcXVlcnkuYWRkZWQoZG9jLl9pZCwgcXVlcnkucHJvamVjdGlvbkZuKGZpZWxkcykpO1xuICB9IGVsc2Uge1xuICAgIHF1ZXJ5LmFkZGVkKGRvYy5faWQsIHF1ZXJ5LnByb2plY3Rpb25GbihmaWVsZHMpKTtcbiAgICBxdWVyeS5yZXN1bHRzLnNldChkb2MuX2lkLCBkb2MpO1xuICB9XG59O1xuXG5Mb2NhbENvbGxlY3Rpb24uX2luc2VydEluU29ydGVkTGlzdCA9IChjbXAsIGFycmF5LCB2YWx1ZSkgPT4ge1xuICBpZiAoYXJyYXkubGVuZ3RoID09PSAwKSB7XG4gICAgYXJyYXkucHVzaCh2YWx1ZSk7XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBjb25zdCBpID0gTG9jYWxDb2xsZWN0aW9uLl9iaW5hcnlTZWFyY2goY21wLCBhcnJheSwgdmFsdWUpO1xuXG4gIGFycmF5LnNwbGljZShpLCAwLCB2YWx1ZSk7XG5cbiAgcmV0dXJuIGk7XG59O1xuXG5Mb2NhbENvbGxlY3Rpb24uX2lzTW9kaWZpY2F0aW9uTW9kID0gbW9kID0+IHtcbiAgbGV0IGlzTW9kaWZ5ID0gZmFsc2U7XG4gIGxldCBpc1JlcGxhY2UgPSBmYWxzZTtcblxuICBPYmplY3Qua2V5cyhtb2QpLmZvckVhY2goa2V5ID0+IHtcbiAgICBpZiAoa2V5LnN1YnN0cigwLCAxKSA9PT0gJyQnKSB7XG4gICAgICBpc01vZGlmeSA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlzUmVwbGFjZSA9IHRydWU7XG4gICAgfVxuICB9KTtcblxuICBpZiAoaXNNb2RpZnkgJiYgaXNSZXBsYWNlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ1VwZGF0ZSBwYXJhbWV0ZXIgY2Fubm90IGhhdmUgYm90aCBtb2RpZmllciBhbmQgbm9uLW1vZGlmaWVyIGZpZWxkcy4nXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBpc01vZGlmeTtcbn07XG5cbi8vIFhYWCBtYXliZSB0aGlzIHNob3VsZCBiZSBFSlNPTi5pc09iamVjdCwgdGhvdWdoIEVKU09OIGRvZXNuJ3Qga25vdyBhYm91dFxuLy8gUmVnRXhwXG4vLyBYWFggbm90ZSB0aGF0IF90eXBlKHVuZGVmaW5lZCkgPT09IDMhISEhXG5Mb2NhbENvbGxlY3Rpb24uX2lzUGxhaW5PYmplY3QgPSB4ID0+IHtcbiAgcmV0dXJuIHggJiYgTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlKHgpID09PSAzO1xufTtcblxuLy8gWFhYIG5lZWQgYSBzdHJhdGVneSBmb3IgcGFzc2luZyB0aGUgYmluZGluZyBvZiAkIGludG8gdGhpc1xuLy8gZnVuY3Rpb24sIGZyb20gdGhlIGNvbXBpbGVkIHNlbGVjdG9yXG4vL1xuLy8gbWF5YmUganVzdCB7a2V5LnVwLnRvLmp1c3QuYmVmb3JlLmRvbGxhcnNpZ246IGFycmF5X2luZGV4fVxuLy9cbi8vIFhYWCBhdG9taWNpdHk6IGlmIG9uZSBtb2RpZmljYXRpb24gZmFpbHMsIGRvIHdlIHJvbGwgYmFjayB0aGUgd2hvbGVcbi8vIGNoYW5nZT9cbi8vXG4vLyBvcHRpb25zOlxuLy8gICAtIGlzSW5zZXJ0IGlzIHNldCB3aGVuIF9tb2RpZnkgaXMgYmVpbmcgY2FsbGVkIHRvIGNvbXB1dGUgdGhlIGRvY3VtZW50IHRvXG4vLyAgICAgaW5zZXJ0IGFzIHBhcnQgb2YgYW4gdXBzZXJ0IG9wZXJhdGlvbi4gV2UgdXNlIHRoaXMgcHJpbWFyaWx5IHRvIGZpZ3VyZVxuLy8gICAgIG91dCB3aGVuIHRvIHNldCB0aGUgZmllbGRzIGluICRzZXRPbkluc2VydCwgaWYgcHJlc2VudC5cbkxvY2FsQ29sbGVjdGlvbi5fbW9kaWZ5ID0gKGRvYywgbW9kaWZpZXIsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICBpZiAoIUxvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChtb2RpZmllcikpIHtcbiAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignTW9kaWZpZXIgbXVzdCBiZSBhbiBvYmplY3QnKTtcbiAgfVxuXG4gIC8vIE1ha2Ugc3VyZSB0aGUgY2FsbGVyIGNhbid0IG11dGF0ZSBvdXIgZGF0YSBzdHJ1Y3R1cmVzLlxuICBtb2RpZmllciA9IEVKU09OLmNsb25lKG1vZGlmaWVyKTtcblxuICBjb25zdCBpc01vZGlmaWVyID0gaXNPcGVyYXRvck9iamVjdChtb2RpZmllcik7XG4gIGNvbnN0IG5ld0RvYyA9IGlzTW9kaWZpZXIgPyBFSlNPTi5jbG9uZShkb2MpIDogbW9kaWZpZXI7XG5cbiAgaWYgKGlzTW9kaWZpZXIpIHtcbiAgICAvLyBhcHBseSBtb2RpZmllcnMgdG8gdGhlIGRvYy5cbiAgICBPYmplY3Qua2V5cyhtb2RpZmllcikuZm9yRWFjaChvcGVyYXRvciA9PiB7XG4gICAgICAvLyBUcmVhdCAkc2V0T25JbnNlcnQgYXMgJHNldCBpZiB0aGlzIGlzIGFuIGluc2VydC5cbiAgICAgIGNvbnN0IHNldE9uSW5zZXJ0ID0gb3B0aW9ucy5pc0luc2VydCAmJiBvcGVyYXRvciA9PT0gJyRzZXRPbkluc2VydCc7XG4gICAgICBjb25zdCBtb2RGdW5jID0gTU9ESUZJRVJTW3NldE9uSW5zZXJ0ID8gJyRzZXQnIDogb3BlcmF0b3JdO1xuICAgICAgY29uc3Qgb3BlcmFuZCA9IG1vZGlmaWVyW29wZXJhdG9yXTtcblxuICAgICAgaWYgKCFtb2RGdW5jKSB7XG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKGBJbnZhbGlkIG1vZGlmaWVyIHNwZWNpZmllZCAke29wZXJhdG9yfWApO1xuICAgICAgfVxuXG4gICAgICBPYmplY3Qua2V5cyhvcGVyYW5kKS5mb3JFYWNoKGtleXBhdGggPT4ge1xuICAgICAgICBjb25zdCBhcmcgPSBvcGVyYW5kW2tleXBhdGhdO1xuXG4gICAgICAgIGlmIChrZXlwYXRoID09PSAnJykge1xuICAgICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdBbiBlbXB0eSB1cGRhdGUgcGF0aCBpcyBub3QgdmFsaWQuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBrZXlwYXJ0cyA9IGtleXBhdGguc3BsaXQoJy4nKTtcblxuICAgICAgICBpZiAoIWtleXBhcnRzLmV2ZXJ5KEJvb2xlYW4pKSB7XG4gICAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgICBgVGhlIHVwZGF0ZSBwYXRoICcke2tleXBhdGh9JyBjb250YWlucyBhbiBlbXB0eSBmaWVsZCBuYW1lLCBgICtcbiAgICAgICAgICAgICd3aGljaCBpcyBub3QgYWxsb3dlZC4nXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGZpbmRNb2RUYXJnZXQobmV3RG9jLCBrZXlwYXJ0cywge1xuICAgICAgICAgIGFycmF5SW5kaWNlczogb3B0aW9ucy5hcnJheUluZGljZXMsXG4gICAgICAgICAgZm9yYmlkQXJyYXk6IG9wZXJhdG9yID09PSAnJHJlbmFtZScsXG4gICAgICAgICAgbm9DcmVhdGU6IE5PX0NSRUFURV9NT0RJRklFUlNbb3BlcmF0b3JdXG4gICAgICAgIH0pO1xuXG4gICAgICAgIG1vZEZ1bmModGFyZ2V0LCBrZXlwYXJ0cy5wb3AoKSwgYXJnLCBrZXlwYXRoLCBuZXdEb2MpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBpZiAoZG9jLl9pZCAmJiAhRUpTT04uZXF1YWxzKGRvYy5faWQsIG5ld0RvYy5faWQpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgYEFmdGVyIGFwcGx5aW5nIHRoZSB1cGRhdGUgdG8gdGhlIGRvY3VtZW50IHtfaWQ6IFwiJHtkb2MuX2lkfVwiLCAuLi59LGAgK1xuICAgICAgICAnIHRoZSAoaW1tdXRhYmxlKSBmaWVsZCBcXCdfaWRcXCcgd2FzIGZvdW5kIHRvIGhhdmUgYmVlbiBhbHRlcmVkIHRvICcgK1xuICAgICAgICBgX2lkOiBcIiR7bmV3RG9jLl9pZH1cImBcbiAgICAgICk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkb2MuX2lkICYmIG1vZGlmaWVyLl9pZCAmJiAhRUpTT04uZXF1YWxzKGRvYy5faWQsIG1vZGlmaWVyLl9pZCkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICBgVGhlIF9pZCBmaWVsZCBjYW5ub3QgYmUgY2hhbmdlZCBmcm9tIHtfaWQ6IFwiJHtkb2MuX2lkfVwifSB0byBgICtcbiAgICAgICAgYHtfaWQ6IFwiJHttb2RpZmllci5faWR9XCJ9YFxuICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyByZXBsYWNlIHRoZSB3aG9sZSBkb2N1bWVudFxuICAgIGFzc2VydEhhc1ZhbGlkRmllbGROYW1lcyhtb2RpZmllcik7XG4gIH1cblxuICAvLyBtb3ZlIG5ldyBkb2N1bWVudCBpbnRvIHBsYWNlLlxuICBPYmplY3Qua2V5cyhkb2MpLmZvckVhY2goa2V5ID0+IHtcbiAgICAvLyBOb3RlOiB0aGlzIHVzZWQgdG8gYmUgZm9yICh2YXIga2V5IGluIGRvYykgaG93ZXZlciwgdGhpcyBkb2VzIG5vdFxuICAgIC8vIHdvcmsgcmlnaHQgaW4gT3BlcmEuIERlbGV0aW5nIGZyb20gYSBkb2Mgd2hpbGUgaXRlcmF0aW5nIG92ZXIgaXRcbiAgICAvLyB3b3VsZCBzb21ldGltZXMgY2F1c2Ugb3BlcmEgdG8gc2tpcCBzb21lIGtleXMuXG4gICAgaWYgKGtleSAhPT0gJ19pZCcpIHtcbiAgICAgIGRlbGV0ZSBkb2Nba2V5XTtcbiAgICB9XG4gIH0pO1xuXG4gIE9iamVjdC5rZXlzKG5ld0RvYykuZm9yRWFjaChrZXkgPT4ge1xuICAgIGRvY1trZXldID0gbmV3RG9jW2tleV07XG4gIH0pO1xufTtcblxuTG9jYWxDb2xsZWN0aW9uLl9vYnNlcnZlRnJvbU9ic2VydmVDaGFuZ2VzID0gKGN1cnNvciwgb2JzZXJ2ZUNhbGxiYWNrcykgPT4ge1xuICBjb25zdCB0cmFuc2Zvcm0gPSBjdXJzb3IuZ2V0VHJhbnNmb3JtKCkgfHwgKGRvYyA9PiBkb2MpO1xuICBsZXQgc3VwcHJlc3NlZCA9ICEhb2JzZXJ2ZUNhbGxiYWNrcy5fc3VwcHJlc3NfaW5pdGlhbDtcblxuICBsZXQgb2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3M7XG4gIGlmIChMb2NhbENvbGxlY3Rpb24uX29ic2VydmVDYWxsYmFja3NBcmVPcmRlcmVkKG9ic2VydmVDYWxsYmFja3MpKSB7XG4gICAgLy8gVGhlIFwiX25vX2luZGljZXNcIiBvcHRpb24gc2V0cyBhbGwgaW5kZXggYXJndW1lbnRzIHRvIC0xIGFuZCBza2lwcyB0aGVcbiAgICAvLyBsaW5lYXIgc2NhbnMgcmVxdWlyZWQgdG8gZ2VuZXJhdGUgdGhlbS4gIFRoaXMgbGV0cyBvYnNlcnZlcnMgdGhhdCBkb24ndFxuICAgIC8vIG5lZWQgYWJzb2x1dGUgaW5kaWNlcyBiZW5lZml0IGZyb20gdGhlIG90aGVyIGZlYXR1cmVzIG9mIHRoaXMgQVBJIC0tXG4gICAgLy8gcmVsYXRpdmUgb3JkZXIsIHRyYW5zZm9ybXMsIGFuZCBhcHBseUNoYW5nZXMgLS0gd2l0aG91dCB0aGUgc3BlZWQgaGl0LlxuICAgIGNvbnN0IGluZGljZXMgPSAhb2JzZXJ2ZUNhbGxiYWNrcy5fbm9faW5kaWNlcztcblxuICAgIG9ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzID0ge1xuICAgICAgYWRkZWRCZWZvcmUoaWQsIGZpZWxkcywgYmVmb3JlKSB7XG4gICAgICAgIGlmIChzdXBwcmVzc2VkIHx8ICEob2JzZXJ2ZUNhbGxiYWNrcy5hZGRlZEF0IHx8IG9ic2VydmVDYWxsYmFja3MuYWRkZWQpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZG9jID0gdHJhbnNmb3JtKE9iamVjdC5hc3NpZ24oZmllbGRzLCB7X2lkOiBpZH0pKTtcblxuICAgICAgICBpZiAob2JzZXJ2ZUNhbGxiYWNrcy5hZGRlZEF0KSB7XG4gICAgICAgICAgb2JzZXJ2ZUNhbGxiYWNrcy5hZGRlZEF0KFxuICAgICAgICAgICAgZG9jLFxuICAgICAgICAgICAgaW5kaWNlc1xuICAgICAgICAgICAgICA/IGJlZm9yZVxuICAgICAgICAgICAgICAgID8gdGhpcy5kb2NzLmluZGV4T2YoYmVmb3JlKVxuICAgICAgICAgICAgICAgIDogdGhpcy5kb2NzLnNpemUoKVxuICAgICAgICAgICAgICA6IC0xLFxuICAgICAgICAgICAgYmVmb3JlXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLmFkZGVkKGRvYyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBjaGFuZ2VkKGlkLCBmaWVsZHMpIHtcbiAgICAgICAgaWYgKCEob2JzZXJ2ZUNhbGxiYWNrcy5jaGFuZ2VkQXQgfHwgb2JzZXJ2ZUNhbGxiYWNrcy5jaGFuZ2VkKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBkb2MgPSBFSlNPTi5jbG9uZSh0aGlzLmRvY3MuZ2V0KGlkKSk7XG4gICAgICAgIGlmICghZG9jKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGlkIGZvciBjaGFuZ2VkOiAke2lkfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb2xkRG9jID0gdHJhbnNmb3JtKEVKU09OLmNsb25lKGRvYykpO1xuXG4gICAgICAgIERpZmZTZXF1ZW5jZS5hcHBseUNoYW5nZXMoZG9jLCBmaWVsZHMpO1xuXG4gICAgICAgIGlmIChvYnNlcnZlQ2FsbGJhY2tzLmNoYW5nZWRBdCkge1xuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MuY2hhbmdlZEF0KFxuICAgICAgICAgICAgdHJhbnNmb3JtKGRvYyksXG4gICAgICAgICAgICBvbGREb2MsXG4gICAgICAgICAgICBpbmRpY2VzID8gdGhpcy5kb2NzLmluZGV4T2YoaWQpIDogLTFcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG9ic2VydmVDYWxsYmFja3MuY2hhbmdlZCh0cmFuc2Zvcm0oZG9jKSwgb2xkRG9jKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIG1vdmVkQmVmb3JlKGlkLCBiZWZvcmUpIHtcbiAgICAgICAgaWYgKCFvYnNlcnZlQ2FsbGJhY2tzLm1vdmVkVG8pIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBmcm9tID0gaW5kaWNlcyA/IHRoaXMuZG9jcy5pbmRleE9mKGlkKSA6IC0xO1xuICAgICAgICBsZXQgdG8gPSBpbmRpY2VzXG4gICAgICAgICAgPyBiZWZvcmVcbiAgICAgICAgICAgID8gdGhpcy5kb2NzLmluZGV4T2YoYmVmb3JlKVxuICAgICAgICAgICAgOiB0aGlzLmRvY3Muc2l6ZSgpXG4gICAgICAgICAgOiAtMTtcblxuICAgICAgICAvLyBXaGVuIG5vdCBtb3ZpbmcgYmFja3dhcmRzLCBhZGp1c3QgZm9yIHRoZSBmYWN0IHRoYXQgcmVtb3ZpbmcgdGhlXG4gICAgICAgIC8vIGRvY3VtZW50IHNsaWRlcyBldmVyeXRoaW5nIGJhY2sgb25lIHNsb3QuXG4gICAgICAgIGlmICh0byA+IGZyb20pIHtcbiAgICAgICAgICAtLXRvO1xuICAgICAgICB9XG5cbiAgICAgICAgb2JzZXJ2ZUNhbGxiYWNrcy5tb3ZlZFRvKFxuICAgICAgICAgIHRyYW5zZm9ybShFSlNPTi5jbG9uZSh0aGlzLmRvY3MuZ2V0KGlkKSkpLFxuICAgICAgICAgIGZyb20sXG4gICAgICAgICAgdG8sXG4gICAgICAgICAgYmVmb3JlIHx8IG51bGxcbiAgICAgICAgKTtcbiAgICAgIH0sXG4gICAgICByZW1vdmVkKGlkKSB7XG4gICAgICAgIGlmICghKG9ic2VydmVDYWxsYmFja3MucmVtb3ZlZEF0IHx8IG9ic2VydmVDYWxsYmFja3MucmVtb3ZlZCkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyB0ZWNobmljYWxseSBtYXliZSB0aGVyZSBzaG91bGQgYmUgYW4gRUpTT04uY2xvbmUgaGVyZSwgYnV0IGl0J3MgYWJvdXRcbiAgICAgICAgLy8gdG8gYmUgcmVtb3ZlZCBmcm9tIHRoaXMuZG9jcyFcbiAgICAgICAgY29uc3QgZG9jID0gdHJhbnNmb3JtKHRoaXMuZG9jcy5nZXQoaWQpKTtcblxuICAgICAgICBpZiAob2JzZXJ2ZUNhbGxiYWNrcy5yZW1vdmVkQXQpIHtcbiAgICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLnJlbW92ZWRBdChkb2MsIGluZGljZXMgPyB0aGlzLmRvY3MuaW5kZXhPZihpZCkgOiAtMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb2JzZXJ2ZUNhbGxiYWNrcy5yZW1vdmVkKGRvYyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICBvYnNlcnZlQ2hhbmdlc0NhbGxiYWNrcyA9IHtcbiAgICAgIGFkZGVkKGlkLCBmaWVsZHMpIHtcbiAgICAgICAgaWYgKCFzdXBwcmVzc2VkICYmIG9ic2VydmVDYWxsYmFja3MuYWRkZWQpIHtcbiAgICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLmFkZGVkKHRyYW5zZm9ybShPYmplY3QuYXNzaWduKGZpZWxkcywge19pZDogaWR9KSkpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgY2hhbmdlZChpZCwgZmllbGRzKSB7XG4gICAgICAgIGlmIChvYnNlcnZlQ2FsbGJhY2tzLmNoYW5nZWQpIHtcbiAgICAgICAgICBjb25zdCBvbGREb2MgPSB0aGlzLmRvY3MuZ2V0KGlkKTtcbiAgICAgICAgICBjb25zdCBkb2MgPSBFSlNPTi5jbG9uZShvbGREb2MpO1xuXG4gICAgICAgICAgRGlmZlNlcXVlbmNlLmFwcGx5Q2hhbmdlcyhkb2MsIGZpZWxkcyk7XG5cbiAgICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLmNoYW5nZWQoXG4gICAgICAgICAgICB0cmFuc2Zvcm0oZG9jKSxcbiAgICAgICAgICAgIHRyYW5zZm9ybShFSlNPTi5jbG9uZShvbGREb2MpKVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICByZW1vdmVkKGlkKSB7XG4gICAgICAgIGlmIChvYnNlcnZlQ2FsbGJhY2tzLnJlbW92ZWQpIHtcbiAgICAgICAgICBvYnNlcnZlQ2FsbGJhY2tzLnJlbW92ZWQodHJhbnNmb3JtKHRoaXMuZG9jcy5nZXQoaWQpKSk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IGNoYW5nZU9ic2VydmVyID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fQ2FjaGluZ0NoYW5nZU9ic2VydmVyKHtcbiAgICBjYWxsYmFja3M6IG9ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzXG4gIH0pO1xuXG4gIGNvbnN0IGhhbmRsZSA9IGN1cnNvci5vYnNlcnZlQ2hhbmdlcyhjaGFuZ2VPYnNlcnZlci5hcHBseUNoYW5nZSk7XG5cbiAgc3VwcHJlc3NlZCA9IGZhbHNlO1xuXG4gIHJldHVybiBoYW5kbGU7XG59O1xuXG5Mb2NhbENvbGxlY3Rpb24uX29ic2VydmVDYWxsYmFja3NBcmVPcmRlcmVkID0gY2FsbGJhY2tzID0+IHtcbiAgaWYgKGNhbGxiYWNrcy5hZGRlZCAmJiBjYWxsYmFja3MuYWRkZWRBdCkge1xuICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHNwZWNpZnkgb25seSBvbmUgb2YgYWRkZWQoKSBhbmQgYWRkZWRBdCgpJyk7XG4gIH1cblxuICBpZiAoY2FsbGJhY2tzLmNoYW5nZWQgJiYgY2FsbGJhY2tzLmNoYW5nZWRBdCkge1xuICAgIHRocm93IG5ldyBFcnJvcignUGxlYXNlIHNwZWNpZnkgb25seSBvbmUgb2YgY2hhbmdlZCgpIGFuZCBjaGFuZ2VkQXQoKScpO1xuICB9XG5cbiAgaWYgKGNhbGxiYWNrcy5yZW1vdmVkICYmIGNhbGxiYWNrcy5yZW1vdmVkQXQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1BsZWFzZSBzcGVjaWZ5IG9ubHkgb25lIG9mIHJlbW92ZWQoKSBhbmQgcmVtb3ZlZEF0KCknKTtcbiAgfVxuXG4gIHJldHVybiAhIShcbiAgICBjYWxsYmFja3MuYWRkZWRBdCB8fFxuICAgIGNhbGxiYWNrcy5jaGFuZ2VkQXQgfHxcbiAgICBjYWxsYmFja3MubW92ZWRUbyB8fFxuICAgIGNhbGxiYWNrcy5yZW1vdmVkQXRcbiAgKTtcbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3NBcmVPcmRlcmVkID0gY2FsbGJhY2tzID0+IHtcbiAgaWYgKGNhbGxiYWNrcy5hZGRlZCAmJiBjYWxsYmFja3MuYWRkZWRCZWZvcmUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1BsZWFzZSBzcGVjaWZ5IG9ubHkgb25lIG9mIGFkZGVkKCkgYW5kIGFkZGVkQmVmb3JlKCknKTtcbiAgfVxuXG4gIHJldHVybiAhIShjYWxsYmFja3MuYWRkZWRCZWZvcmUgfHwgY2FsbGJhY2tzLm1vdmVkQmVmb3JlKTtcbn07XG5cbkxvY2FsQ29sbGVjdGlvbi5fcmVtb3ZlRnJvbVJlc3VsdHMgPSAocXVlcnksIGRvYykgPT4ge1xuICBpZiAocXVlcnkub3JkZXJlZCkge1xuICAgIGNvbnN0IGkgPSBMb2NhbENvbGxlY3Rpb24uX2ZpbmRJbk9yZGVyZWRSZXN1bHRzKHF1ZXJ5LCBkb2MpO1xuXG4gICAgcXVlcnkucmVtb3ZlZChkb2MuX2lkKTtcbiAgICBxdWVyeS5yZXN1bHRzLnNwbGljZShpLCAxKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBpZCA9IGRvYy5faWQ7ICAvLyBpbiBjYXNlIGNhbGxiYWNrIG11dGF0ZXMgZG9jXG5cbiAgICBxdWVyeS5yZW1vdmVkKGRvYy5faWQpO1xuICAgIHF1ZXJ5LnJlc3VsdHMucmVtb3ZlKGlkKTtcbiAgfVxufTtcblxuLy8gSXMgdGhpcyBzZWxlY3RvciBqdXN0IHNob3J0aGFuZCBmb3IgbG9va3VwIGJ5IF9pZD9cbkxvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkID0gc2VsZWN0b3IgPT5cbiAgdHlwZW9mIHNlbGVjdG9yID09PSAnbnVtYmVyJyB8fFxuICB0eXBlb2Ygc2VsZWN0b3IgPT09ICdzdHJpbmcnIHx8XG4gIHNlbGVjdG9yIGluc3RhbmNlb2YgTW9uZ29JRC5PYmplY3RJRFxuO1xuXG4vLyBJcyB0aGUgc2VsZWN0b3IganVzdCBsb29rdXAgYnkgX2lkIChzaG9ydGhhbmQgb3Igbm90KT9cbkxvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkUGVyaGFwc0FzT2JqZWN0ID0gc2VsZWN0b3IgPT5cbiAgTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWQoc2VsZWN0b3IpIHx8XG4gIExvY2FsQ29sbGVjdGlvbi5fc2VsZWN0b3JJc0lkKHNlbGVjdG9yICYmIHNlbGVjdG9yLl9pZCkgJiZcbiAgT2JqZWN0LmtleXMoc2VsZWN0b3IpLmxlbmd0aCA9PT0gMVxuO1xuXG5Mb2NhbENvbGxlY3Rpb24uX3VwZGF0ZUluUmVzdWx0cyA9IChxdWVyeSwgZG9jLCBvbGRfZG9jKSA9PiB7XG4gIGlmICghRUpTT04uZXF1YWxzKGRvYy5faWQsIG9sZF9kb2MuX2lkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ2FuXFwndCBjaGFuZ2UgYSBkb2NcXCdzIF9pZCB3aGlsZSB1cGRhdGluZycpO1xuICB9XG5cbiAgY29uc3QgcHJvamVjdGlvbkZuID0gcXVlcnkucHJvamVjdGlvbkZuO1xuICBjb25zdCBjaGFuZ2VkRmllbGRzID0gRGlmZlNlcXVlbmNlLm1ha2VDaGFuZ2VkRmllbGRzKFxuICAgIHByb2plY3Rpb25Gbihkb2MpLFxuICAgIHByb2plY3Rpb25GbihvbGRfZG9jKVxuICApO1xuXG4gIGlmICghcXVlcnkub3JkZXJlZCkge1xuICAgIGlmIChPYmplY3Qua2V5cyhjaGFuZ2VkRmllbGRzKS5sZW5ndGgpIHtcbiAgICAgIHF1ZXJ5LmNoYW5nZWQoZG9jLl9pZCwgY2hhbmdlZEZpZWxkcyk7XG4gICAgICBxdWVyeS5yZXN1bHRzLnNldChkb2MuX2lkLCBkb2MpO1xuICAgIH1cblxuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IG9sZF9pZHggPSBMb2NhbENvbGxlY3Rpb24uX2ZpbmRJbk9yZGVyZWRSZXN1bHRzKHF1ZXJ5LCBkb2MpO1xuXG4gIGlmIChPYmplY3Qua2V5cyhjaGFuZ2VkRmllbGRzKS5sZW5ndGgpIHtcbiAgICBxdWVyeS5jaGFuZ2VkKGRvYy5faWQsIGNoYW5nZWRGaWVsZHMpO1xuICB9XG5cbiAgaWYgKCFxdWVyeS5zb3J0ZXIpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBqdXN0IHRha2UgaXQgb3V0IGFuZCBwdXQgaXQgYmFjayBpbiBhZ2FpbiwgYW5kIHNlZSBpZiB0aGUgaW5kZXggY2hhbmdlc1xuICBxdWVyeS5yZXN1bHRzLnNwbGljZShvbGRfaWR4LCAxKTtcblxuICBjb25zdCBuZXdfaWR4ID0gTG9jYWxDb2xsZWN0aW9uLl9pbnNlcnRJblNvcnRlZExpc3QoXG4gICAgcXVlcnkuc29ydGVyLmdldENvbXBhcmF0b3Ioe2Rpc3RhbmNlczogcXVlcnkuZGlzdGFuY2VzfSksXG4gICAgcXVlcnkucmVzdWx0cyxcbiAgICBkb2NcbiAgKTtcblxuICBpZiAob2xkX2lkeCAhPT0gbmV3X2lkeCkge1xuICAgIGxldCBuZXh0ID0gcXVlcnkucmVzdWx0c1tuZXdfaWR4ICsgMV07XG4gICAgaWYgKG5leHQpIHtcbiAgICAgIG5leHQgPSBuZXh0Ll9pZDtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV4dCA9IG51bGw7XG4gICAgfVxuXG4gICAgcXVlcnkubW92ZWRCZWZvcmUgJiYgcXVlcnkubW92ZWRCZWZvcmUoZG9jLl9pZCwgbmV4dCk7XG4gIH1cbn07XG5cbmNvbnN0IE1PRElGSUVSUyA9IHtcbiAgJGN1cnJlbnREYXRlKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICh0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBoYXNPd24uY2FsbChhcmcsICckdHlwZScpKSB7XG4gICAgICBpZiAoYXJnLiR0eXBlICE9PSAnZGF0ZScpIHtcbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgJ01pbmltb25nbyBkb2VzIGN1cnJlbnRseSBvbmx5IHN1cHBvcnQgdGhlIGRhdGUgdHlwZSBpbiAnICtcbiAgICAgICAgICAnJGN1cnJlbnREYXRlIG1vZGlmaWVycycsXG4gICAgICAgICAge2ZpZWxkfVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoYXJnICE9PSB0cnVlKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignSW52YWxpZCAkY3VycmVudERhdGUgbW9kaWZpZXInLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICB0YXJnZXRbZmllbGRdID0gbmV3IERhdGUoKTtcbiAgfSxcbiAgJG1pbih0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAodHlwZW9mIGFyZyAhPT0gJ251bWJlcicpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdNb2RpZmllciAkbWluIGFsbG93ZWQgZm9yIG51bWJlcnMgb25seScsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIGlmIChmaWVsZCBpbiB0YXJnZXQpIHtcbiAgICAgIGlmICh0eXBlb2YgdGFyZ2V0W2ZpZWxkXSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgJ0Nhbm5vdCBhcHBseSAkbWluIG1vZGlmaWVyIHRvIG5vbi1udW1iZXInLFxuICAgICAgICAgIHtmaWVsZH1cbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRhcmdldFtmaWVsZF0gPiBhcmcpIHtcbiAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICB9XG4gIH0sXG4gICRtYXgodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKHR5cGVvZiBhcmcgIT09ICdudW1iZXInKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignTW9kaWZpZXIgJG1heCBhbGxvd2VkIGZvciBudW1iZXJzIG9ubHknLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICBpZiAoZmllbGQgaW4gdGFyZ2V0KSB7XG4gICAgICBpZiAodHlwZW9mIHRhcmdldFtmaWVsZF0gIT09ICdudW1iZXInKSB7XG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAgICdDYW5ub3QgYXBwbHkgJG1heCBtb2RpZmllciB0byBub24tbnVtYmVyJyxcbiAgICAgICAgICB7ZmllbGR9XG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0YXJnZXRbZmllbGRdIDwgYXJnKSB7XG4gICAgICAgIHRhcmdldFtmaWVsZF0gPSBhcmc7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldFtmaWVsZF0gPSBhcmc7XG4gICAgfVxuICB9LFxuICAkaW5jKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICh0eXBlb2YgYXJnICE9PSAnbnVtYmVyJykge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJ01vZGlmaWVyICRpbmMgYWxsb3dlZCBmb3IgbnVtYmVycyBvbmx5Jywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgaWYgKHR5cGVvZiB0YXJnZXRbZmllbGRdICE9PSAnbnVtYmVyJykge1xuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAnQ2Fubm90IGFwcGx5ICRpbmMgbW9kaWZpZXIgdG8gbm9uLW51bWJlcicsXG4gICAgICAgICAge2ZpZWxkfVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICB0YXJnZXRbZmllbGRdICs9IGFyZztcbiAgICB9IGVsc2Uge1xuICAgICAgdGFyZ2V0W2ZpZWxkXSA9IGFyZztcbiAgICB9XG4gIH0sXG4gICRzZXQodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKHRhcmdldCAhPT0gT2JqZWN0KHRhcmdldCkpIHsgLy8gbm90IGFuIGFycmF5IG9yIGFuIG9iamVjdFxuICAgICAgY29uc3QgZXJyb3IgPSBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ0Nhbm5vdCBzZXQgcHJvcGVydHkgb24gbm9uLW9iamVjdCBmaWVsZCcsXG4gICAgICAgIHtmaWVsZH1cbiAgICAgICk7XG4gICAgICBlcnJvci5zZXRQcm9wZXJ0eUVycm9yID0gdHJ1ZTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cblxuICAgIGlmICh0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGVycm9yID0gTWluaW1vbmdvRXJyb3IoJ0Nhbm5vdCBzZXQgcHJvcGVydHkgb24gbnVsbCcsIHtmaWVsZH0pO1xuICAgICAgZXJyb3Iuc2V0UHJvcGVydHlFcnJvciA9IHRydWU7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICBhc3NlcnRIYXNWYWxpZEZpZWxkTmFtZXMoYXJnKTtcblxuICAgIHRhcmdldFtmaWVsZF0gPSBhcmc7XG4gIH0sXG4gICRzZXRPbkluc2VydCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICAvLyBjb252ZXJ0ZWQgdG8gYCRzZXRgIGluIGBfbW9kaWZ5YFxuICB9LFxuICAkdW5zZXQodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgaWYgKHRhcmdldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAodGFyZ2V0IGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgaWYgKGZpZWxkIGluIHRhcmdldCkge1xuICAgICAgICAgIHRhcmdldFtmaWVsZF0gPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgdGFyZ2V0W2ZpZWxkXTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gICRwdXNoKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICh0YXJnZXRbZmllbGRdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRhcmdldFtmaWVsZF0gPSBbXTtcbiAgICB9XG5cbiAgICBpZiAoISh0YXJnZXRbZmllbGRdIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignQ2Fubm90IGFwcGx5ICRwdXNoIG1vZGlmaWVyIHRvIG5vbi1hcnJheScsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIGlmICghKGFyZyAmJiBhcmcuJGVhY2gpKSB7XG4gICAgICAvLyBTaW1wbGUgbW9kZTogbm90ICRlYWNoXG4gICAgICBhc3NlcnRIYXNWYWxpZEZpZWxkTmFtZXMoYXJnKTtcblxuICAgICAgdGFyZ2V0W2ZpZWxkXS5wdXNoKGFyZyk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBGYW5jeSBtb2RlOiAkZWFjaCAoYW5kIG1heWJlICRzbGljZSBhbmQgJHNvcnQgYW5kICRwb3NpdGlvbilcbiAgICBjb25zdCB0b1B1c2ggPSBhcmcuJGVhY2g7XG4gICAgaWYgKCEodG9QdXNoIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignJGVhY2ggbXVzdCBiZSBhbiBhcnJheScsIHtmaWVsZH0pO1xuICAgIH1cblxuICAgIGFzc2VydEhhc1ZhbGlkRmllbGROYW1lcyh0b1B1c2gpO1xuXG4gICAgLy8gUGFyc2UgJHBvc2l0aW9uXG4gICAgbGV0IHBvc2l0aW9uID0gdW5kZWZpbmVkO1xuICAgIGlmICgnJHBvc2l0aW9uJyBpbiBhcmcpIHtcbiAgICAgIGlmICh0eXBlb2YgYXJnLiRwb3NpdGlvbiAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJyRwb3NpdGlvbiBtdXN0IGJlIGEgbnVtZXJpYyB2YWx1ZScsIHtmaWVsZH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBYWFggc2hvdWxkIGNoZWNrIHRvIG1ha2Ugc3VyZSBpbnRlZ2VyXG4gICAgICBpZiAoYXJnLiRwb3NpdGlvbiA8IDApIHtcbiAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgJyRwb3NpdGlvbiBpbiAkcHVzaCBtdXN0IGJlIHplcm8gb3IgcG9zaXRpdmUnLFxuICAgICAgICAgIHtmaWVsZH1cbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgcG9zaXRpb24gPSBhcmcuJHBvc2l0aW9uO1xuICAgIH1cblxuICAgIC8vIFBhcnNlICRzbGljZS5cbiAgICBsZXQgc2xpY2UgPSB1bmRlZmluZWQ7XG4gICAgaWYgKCckc2xpY2UnIGluIGFyZykge1xuICAgICAgaWYgKHR5cGVvZiBhcmcuJHNsaWNlICE9PSAnbnVtYmVyJykge1xuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcignJHNsaWNlIG11c3QgYmUgYSBudW1lcmljIHZhbHVlJywge2ZpZWxkfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFhYWCBzaG91bGQgY2hlY2sgdG8gbWFrZSBzdXJlIGludGVnZXJcbiAgICAgIHNsaWNlID0gYXJnLiRzbGljZTtcbiAgICB9XG5cbiAgICAvLyBQYXJzZSAkc29ydC5cbiAgICBsZXQgc29ydEZ1bmN0aW9uID0gdW5kZWZpbmVkO1xuICAgIGlmIChhcmcuJHNvcnQpIHtcbiAgICAgIGlmIChzbGljZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCckc29ydCByZXF1aXJlcyAkc2xpY2UgdG8gYmUgcHJlc2VudCcsIHtmaWVsZH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBYWFggdGhpcyBhbGxvd3MgdXMgdG8gdXNlIGEgJHNvcnQgd2hvc2UgdmFsdWUgaXMgYW4gYXJyYXksIGJ1dCB0aGF0J3NcbiAgICAgIC8vIGFjdHVhbGx5IGFuIGV4dGVuc2lvbiBvZiB0aGUgTm9kZSBkcml2ZXIsIHNvIGl0IHdvbid0IHdvcmtcbiAgICAgIC8vIHNlcnZlci1zaWRlLiBDb3VsZCBiZSBjb25mdXNpbmchXG4gICAgICAvLyBYWFggaXMgaXQgY29ycmVjdCB0aGF0IHdlIGRvbid0IGRvIGdlby1zdHVmZiBoZXJlP1xuICAgICAgc29ydEZ1bmN0aW9uID0gbmV3IE1pbmltb25nby5Tb3J0ZXIoYXJnLiRzb3J0KS5nZXRDb21wYXJhdG9yKCk7XG5cbiAgICAgIHRvUHVzaC5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgICAgICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlKGVsZW1lbnQpICE9PSAzKSB7XG4gICAgICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICAgICAnJHB1c2ggbGlrZSBtb2RpZmllcnMgdXNpbmcgJHNvcnQgcmVxdWlyZSBhbGwgZWxlbWVudHMgdG8gYmUgJyArXG4gICAgICAgICAgICAnb2JqZWN0cycsXG4gICAgICAgICAgICB7ZmllbGR9XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQWN0dWFsbHkgcHVzaC5cbiAgICBpZiAocG9zaXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdG9QdXNoLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgIHRhcmdldFtmaWVsZF0ucHVzaChlbGVtZW50KTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzcGxpY2VBcmd1bWVudHMgPSBbcG9zaXRpb24sIDBdO1xuXG4gICAgICB0b1B1c2guZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgc3BsaWNlQXJndW1lbnRzLnB1c2goZWxlbWVudCk7XG4gICAgICB9KTtcblxuICAgICAgdGFyZ2V0W2ZpZWxkXS5zcGxpY2UoLi4uc3BsaWNlQXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICAvLyBBY3R1YWxseSBzb3J0LlxuICAgIGlmIChzb3J0RnVuY3Rpb24pIHtcbiAgICAgIHRhcmdldFtmaWVsZF0uc29ydChzb3J0RnVuY3Rpb24pO1xuICAgIH1cblxuICAgIC8vIEFjdHVhbGx5IHNsaWNlLlxuICAgIGlmIChzbGljZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoc2xpY2UgPT09IDApIHtcbiAgICAgICAgdGFyZ2V0W2ZpZWxkXSA9IFtdOyAvLyBkaWZmZXJzIGZyb20gQXJyYXkuc2xpY2UhXG4gICAgICB9IGVsc2UgaWYgKHNsaWNlIDwgMCkge1xuICAgICAgICB0YXJnZXRbZmllbGRdID0gdGFyZ2V0W2ZpZWxkXS5zbGljZShzbGljZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0YXJnZXRbZmllbGRdID0gdGFyZ2V0W2ZpZWxkXS5zbGljZSgwLCBzbGljZSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICAkcHVzaEFsbCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAoISh0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdNb2RpZmllciAkcHVzaEFsbC9wdWxsQWxsIGFsbG93ZWQgZm9yIGFycmF5cyBvbmx5Jyk7XG4gICAgfVxuXG4gICAgYXNzZXJ0SGFzVmFsaWRGaWVsZE5hbWVzKGFyZyk7XG5cbiAgICBjb25zdCB0b1B1c2ggPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgaWYgKHRvUHVzaCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0YXJnZXRbZmllbGRdID0gYXJnO1xuICAgIH0gZWxzZSBpZiAoISh0b1B1c2ggaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnQ2Fubm90IGFwcGx5ICRwdXNoQWxsIG1vZGlmaWVyIHRvIG5vbi1hcnJheScsXG4gICAgICAgIHtmaWVsZH1cbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRvUHVzaC5wdXNoKC4uLmFyZyk7XG4gICAgfVxuICB9LFxuICAkYWRkVG9TZXQodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgbGV0IGlzRWFjaCA9IGZhbHNlO1xuXG4gICAgaWYgKHR5cGVvZiBhcmcgPT09ICdvYmplY3QnKSB7XG4gICAgICAvLyBjaGVjayBpZiBmaXJzdCBrZXkgaXMgJyRlYWNoJ1xuICAgICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKGFyZyk7XG4gICAgICBpZiAoa2V5c1swXSA9PT0gJyRlYWNoJykge1xuICAgICAgICBpc0VhY2ggPSB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHZhbHVlcyA9IGlzRWFjaCA/IGFyZy4kZWFjaCA6IFthcmddO1xuXG4gICAgYXNzZXJ0SGFzVmFsaWRGaWVsZE5hbWVzKHZhbHVlcyk7XG5cbiAgICBjb25zdCB0b0FkZCA9IHRhcmdldFtmaWVsZF07XG4gICAgaWYgKHRvQWRkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRhcmdldFtmaWVsZF0gPSB2YWx1ZXM7XG4gICAgfSBlbHNlIGlmICghKHRvQWRkIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ0Nhbm5vdCBhcHBseSAkYWRkVG9TZXQgbW9kaWZpZXIgdG8gbm9uLWFycmF5JyxcbiAgICAgICAge2ZpZWxkfVxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWVzLmZvckVhY2godmFsdWUgPT4ge1xuICAgICAgICBpZiAodG9BZGQuc29tZShlbGVtZW50ID0+IExvY2FsQ29sbGVjdGlvbi5fZi5fZXF1YWwodmFsdWUsIGVsZW1lbnQpKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRvQWRkLnB1c2godmFsdWUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICAkcG9wKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHRvUG9wID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgIGlmICh0b1BvcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCEodG9Qb3AgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdDYW5ub3QgYXBwbHkgJHBvcCBtb2RpZmllciB0byBub24tYXJyYXknLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicgJiYgYXJnIDwgMCkge1xuICAgICAgdG9Qb3Auc3BsaWNlKDAsIDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0b1BvcC5wb3AoKTtcbiAgICB9XG4gIH0sXG4gICRwdWxsKHRhcmdldCwgZmllbGQsIGFyZykge1xuICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHRvUHVsbCA9IHRhcmdldFtmaWVsZF07XG4gICAgaWYgKHRvUHVsbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCEodG9QdWxsIGluc3RhbmNlb2YgQXJyYXkpKSB7XG4gICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgJ0Nhbm5vdCBhcHBseSAkcHVsbC9wdWxsQWxsIG1vZGlmaWVyIHRvIG5vbi1hcnJheScsXG4gICAgICAgIHtmaWVsZH1cbiAgICAgICk7XG4gICAgfVxuXG4gICAgbGV0IG91dDtcbiAgICBpZiAoYXJnICE9IG51bGwgJiYgdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgIShhcmcgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIC8vIFhYWCB3b3VsZCBiZSBtdWNoIG5pY2VyIHRvIGNvbXBpbGUgdGhpcyBvbmNlLCByYXRoZXIgdGhhblxuICAgICAgLy8gZm9yIGVhY2ggZG9jdW1lbnQgd2UgbW9kaWZ5Li4gYnV0IHVzdWFsbHkgd2UncmUgbm90XG4gICAgICAvLyBtb2RpZnlpbmcgdGhhdCBtYW55IGRvY3VtZW50cywgc28gd2UnbGwgbGV0IGl0IHNsaWRlIGZvclxuICAgICAgLy8gbm93XG5cbiAgICAgIC8vIFhYWCBNaW5pbW9uZ28uTWF0Y2hlciBpc24ndCB1cCBmb3IgdGhlIGpvYiwgYmVjYXVzZSB3ZSBuZWVkXG4gICAgICAvLyB0byBwZXJtaXQgc3R1ZmYgbGlrZSB7JHB1bGw6IHthOiB7JGd0OiA0fX19Li4gc29tZXRoaW5nXG4gICAgICAvLyBsaWtlIHskZ3Q6IDR9IGlzIG5vdCBub3JtYWxseSBhIGNvbXBsZXRlIHNlbGVjdG9yLlxuICAgICAgLy8gc2FtZSBpc3N1ZSBhcyAkZWxlbU1hdGNoIHBvc3NpYmx5P1xuICAgICAgY29uc3QgbWF0Y2hlciA9IG5ldyBNaW5pbW9uZ28uTWF0Y2hlcihhcmcpO1xuXG4gICAgICBvdXQgPSB0b1B1bGwuZmlsdGVyKGVsZW1lbnQgPT4gIW1hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKGVsZW1lbnQpLnJlc3VsdCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCA9IHRvUHVsbC5maWx0ZXIoZWxlbWVudCA9PiAhTG9jYWxDb2xsZWN0aW9uLl9mLl9lcXVhbChlbGVtZW50LCBhcmcpKTtcbiAgICB9XG5cbiAgICB0YXJnZXRbZmllbGRdID0gb3V0O1xuICB9LFxuICAkcHVsbEFsbCh0YXJnZXQsIGZpZWxkLCBhcmcpIHtcbiAgICBpZiAoISh0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAnTW9kaWZpZXIgJHB1c2hBbGwvcHVsbEFsbCBhbGxvd2VkIGZvciBhcnJheXMgb25seScsXG4gICAgICAgIHtmaWVsZH1cbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgdG9QdWxsID0gdGFyZ2V0W2ZpZWxkXTtcblxuICAgIGlmICh0b1B1bGwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghKHRvUHVsbCBpbnN0YW5jZW9mIEFycmF5KSkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdDYW5ub3QgYXBwbHkgJHB1bGwvcHVsbEFsbCBtb2RpZmllciB0byBub24tYXJyYXknLFxuICAgICAgICB7ZmllbGR9XG4gICAgICApO1xuICAgIH1cblxuICAgIHRhcmdldFtmaWVsZF0gPSB0b1B1bGwuZmlsdGVyKG9iamVjdCA9PlxuICAgICAgIWFyZy5zb21lKGVsZW1lbnQgPT4gTG9jYWxDb2xsZWN0aW9uLl9mLl9lcXVhbChvYmplY3QsIGVsZW1lbnQpKVxuICAgICk7XG4gIH0sXG4gICRyZW5hbWUodGFyZ2V0LCBmaWVsZCwgYXJnLCBrZXlwYXRoLCBkb2MpIHtcbiAgICAvLyBubyBpZGVhIHdoeSBtb25nbyBoYXMgdGhpcyByZXN0cmljdGlvbi4uXG4gICAgaWYgKGtleXBhdGggPT09IGFyZykge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJyRyZW5hbWUgc291cmNlIG11c3QgZGlmZmVyIGZyb20gdGFyZ2V0Jywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgaWYgKHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJyRyZW5hbWUgc291cmNlIGZpZWxkIGludmFsaWQnLCB7ZmllbGR9KTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGFyZyAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCckcmVuYW1lIHRhcmdldCBtdXN0IGJlIGEgc3RyaW5nJywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgaWYgKGFyZy5pbmNsdWRlcygnXFwwJykpIHtcbiAgICAgIC8vIE51bGwgYnl0ZXMgYXJlIG5vdCBhbGxvd2VkIGluIE1vbmdvIGZpZWxkIG5hbWVzXG4gICAgICAvLyBodHRwczovL2RvY3MubW9uZ29kYi5jb20vbWFudWFsL3JlZmVyZW5jZS9saW1pdHMvI1Jlc3RyaWN0aW9ucy1vbi1GaWVsZC1OYW1lc1xuICAgICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoXG4gICAgICAgICdUaGUgXFwndG9cXCcgZmllbGQgZm9yICRyZW5hbWUgY2Fubm90IGNvbnRhaW4gYW4gZW1iZWRkZWQgbnVsbCBieXRlJyxcbiAgICAgICAge2ZpZWxkfVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAodGFyZ2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBvYmplY3QgPSB0YXJnZXRbZmllbGRdO1xuXG4gICAgZGVsZXRlIHRhcmdldFtmaWVsZF07XG5cbiAgICBjb25zdCBrZXlwYXJ0cyA9IGFyZy5zcGxpdCgnLicpO1xuICAgIGNvbnN0IHRhcmdldDIgPSBmaW5kTW9kVGFyZ2V0KGRvYywga2V5cGFydHMsIHtmb3JiaWRBcnJheTogdHJ1ZX0pO1xuXG4gICAgaWYgKHRhcmdldDIgPT09IG51bGwpIHtcbiAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCckcmVuYW1lIHRhcmdldCBmaWVsZCBpbnZhbGlkJywge2ZpZWxkfSk7XG4gICAgfVxuXG4gICAgdGFyZ2V0MltrZXlwYXJ0cy5wb3AoKV0gPSBvYmplY3Q7XG4gIH0sXG4gICRiaXQodGFyZ2V0LCBmaWVsZCwgYXJnKSB7XG4gICAgLy8gWFhYIG1vbmdvIG9ubHkgc3VwcG9ydHMgJGJpdCBvbiBpbnRlZ2VycywgYW5kIHdlIG9ubHkgc3VwcG9ydFxuICAgIC8vIG5hdGl2ZSBqYXZhc2NyaXB0IG51bWJlcnMgKGRvdWJsZXMpIHNvIGZhciwgc28gd2UgY2FuJ3Qgc3VwcG9ydCAkYml0XG4gICAgdGhyb3cgTWluaW1vbmdvRXJyb3IoJyRiaXQgaXMgbm90IHN1cHBvcnRlZCcsIHtmaWVsZH0pO1xuICB9LFxufTtcblxuY29uc3QgTk9fQ1JFQVRFX01PRElGSUVSUyA9IHtcbiAgJHBvcDogdHJ1ZSxcbiAgJHB1bGw6IHRydWUsXG4gICRwdWxsQWxsOiB0cnVlLFxuICAkcmVuYW1lOiB0cnVlLFxuICAkdW5zZXQ6IHRydWVcbn07XG5cbi8vIE1ha2Ugc3VyZSBmaWVsZCBuYW1lcyBkbyBub3QgY29udGFpbiBNb25nbyByZXN0cmljdGVkXG4vLyBjaGFyYWN0ZXJzICgnLicsICckJywgJ1xcMCcpLlxuLy8gaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9yZWZlcmVuY2UvbGltaXRzLyNSZXN0cmljdGlvbnMtb24tRmllbGQtTmFtZXNcbmNvbnN0IGludmFsaWRDaGFyTXNnID0ge1xuICAkOiAnc3RhcnQgd2l0aCBcXCckXFwnJyxcbiAgJy4nOiAnY29udGFpbiBcXCcuXFwnJyxcbiAgJ1xcMCc6ICdjb250YWluIG51bGwgYnl0ZXMnXG59O1xuXG4vLyBjaGVja3MgaWYgYWxsIGZpZWxkIG5hbWVzIGluIGFuIG9iamVjdCBhcmUgdmFsaWRcbmZ1bmN0aW9uIGFzc2VydEhhc1ZhbGlkRmllbGROYW1lcyhkb2MpIHtcbiAgaWYgKGRvYyAmJiB0eXBlb2YgZG9jID09PSAnb2JqZWN0Jykge1xuICAgIEpTT04uc3RyaW5naWZ5KGRvYywgKGtleSwgdmFsdWUpID0+IHtcbiAgICAgIGFzc2VydElzVmFsaWRGaWVsZE5hbWUoa2V5KTtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhc3NlcnRJc1ZhbGlkRmllbGROYW1lKGtleSkge1xuICBsZXQgbWF0Y2g7XG4gIGlmICh0eXBlb2Yga2V5ID09PSAnc3RyaW5nJyAmJiAobWF0Y2ggPSBrZXkubWF0Y2goL15cXCR8XFwufFxcMC8pKSkge1xuICAgIHRocm93IE1pbmltb25nb0Vycm9yKGBLZXkgJHtrZXl9IG11c3Qgbm90ICR7aW52YWxpZENoYXJNc2dbbWF0Y2hbMF1dfWApO1xuICB9XG59XG5cbi8vIGZvciBhLmIuYy4yLmQuZSwga2V5cGFydHMgc2hvdWxkIGJlIFsnYScsICdiJywgJ2MnLCAnMicsICdkJywgJ2UnXSxcbi8vIGFuZCB0aGVuIHlvdSB3b3VsZCBvcGVyYXRlIG9uIHRoZSAnZScgcHJvcGVydHkgb2YgdGhlIHJldHVybmVkXG4vLyBvYmplY3QuXG4vL1xuLy8gaWYgb3B0aW9ucy5ub0NyZWF0ZSBpcyBmYWxzZXksIGNyZWF0ZXMgaW50ZXJtZWRpYXRlIGxldmVscyBvZlxuLy8gc3RydWN0dXJlIGFzIG5lY2Vzc2FyeSwgbGlrZSBta2RpciAtcCAoYW5kIHJhaXNlcyBhbiBleGNlcHRpb24gaWZcbi8vIHRoYXQgd291bGQgbWVhbiBnaXZpbmcgYSBub24tbnVtZXJpYyBwcm9wZXJ0eSB0byBhbiBhcnJheS4pIGlmXG4vLyBvcHRpb25zLm5vQ3JlYXRlIGlzIHRydWUsIHJldHVybiB1bmRlZmluZWQgaW5zdGVhZC5cbi8vXG4vLyBtYXkgbW9kaWZ5IHRoZSBsYXN0IGVsZW1lbnQgb2Yga2V5cGFydHMgdG8gc2lnbmFsIHRvIHRoZSBjYWxsZXIgdGhhdCBpdCBuZWVkc1xuLy8gdG8gdXNlIGEgZGlmZmVyZW50IHZhbHVlIHRvIGluZGV4IGludG8gdGhlIHJldHVybmVkIG9iamVjdCAoZm9yIGV4YW1wbGUsXG4vLyBbJ2EnLCAnMDEnXSAtPiBbJ2EnLCAxXSkuXG4vL1xuLy8gaWYgZm9yYmlkQXJyYXkgaXMgdHJ1ZSwgcmV0dXJuIG51bGwgaWYgdGhlIGtleXBhdGggZ29lcyB0aHJvdWdoIGFuIGFycmF5LlxuLy9cbi8vIGlmIG9wdGlvbnMuYXJyYXlJbmRpY2VzIGlzIHNldCwgdXNlIGl0cyBmaXJzdCBlbGVtZW50IGZvciB0aGUgKGZpcnN0KSAnJCcgaW5cbi8vIHRoZSBwYXRoLlxuZnVuY3Rpb24gZmluZE1vZFRhcmdldChkb2MsIGtleXBhcnRzLCBvcHRpb25zID0ge30pIHtcbiAgbGV0IHVzZWRBcnJheUluZGV4ID0gZmFsc2U7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBrZXlwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGxhc3QgPSBpID09PSBrZXlwYXJ0cy5sZW5ndGggLSAxO1xuICAgIGxldCBrZXlwYXJ0ID0ga2V5cGFydHNbaV07XG5cbiAgICBpZiAoIWlzSW5kZXhhYmxlKGRvYykpIHtcbiAgICAgIGlmIChvcHRpb25zLm5vQ3JlYXRlKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGVycm9yID0gTWluaW1vbmdvRXJyb3IoXG4gICAgICAgIGBjYW5ub3QgdXNlIHRoZSBwYXJ0ICcke2tleXBhcnR9JyB0byB0cmF2ZXJzZSAke2RvY31gXG4gICAgICApO1xuICAgICAgZXJyb3Iuc2V0UHJvcGVydHlFcnJvciA9IHRydWU7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICBpZiAoZG9jIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgIGlmIChvcHRpb25zLmZvcmJpZEFycmF5KSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuXG4gICAgICBpZiAoa2V5cGFydCA9PT0gJyQnKSB7XG4gICAgICAgIGlmICh1c2VkQXJyYXlJbmRleCkge1xuICAgICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKCdUb28gbWFueSBwb3NpdGlvbmFsIChpLmUuIFxcJyRcXCcpIGVsZW1lbnRzJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW9wdGlvbnMuYXJyYXlJbmRpY2VzIHx8ICFvcHRpb25zLmFycmF5SW5kaWNlcy5sZW5ndGgpIHtcbiAgICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICAgICdUaGUgcG9zaXRpb25hbCBvcGVyYXRvciBkaWQgbm90IGZpbmQgdGhlIG1hdGNoIG5lZWRlZCBmcm9tIHRoZSAnICtcbiAgICAgICAgICAgICdxdWVyeSdcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAga2V5cGFydCA9IG9wdGlvbnMuYXJyYXlJbmRpY2VzWzBdO1xuICAgICAgICB1c2VkQXJyYXlJbmRleCA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGlzTnVtZXJpY0tleShrZXlwYXJ0KSkge1xuICAgICAgICBrZXlwYXJ0ID0gcGFyc2VJbnQoa2V5cGFydCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAob3B0aW9ucy5ub0NyZWF0ZSkge1xuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyBNaW5pbW9uZ29FcnJvcihcbiAgICAgICAgICBgY2FuJ3QgYXBwZW5kIHRvIGFycmF5IHVzaW5nIHN0cmluZyBmaWVsZCBuYW1lIFske2tleXBhcnR9XWBcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGxhc3QpIHtcbiAgICAgICAga2V5cGFydHNbaV0gPSBrZXlwYXJ0OyAvLyBoYW5kbGUgJ2EuMDEnXG4gICAgICB9XG5cbiAgICAgIGlmIChvcHRpb25zLm5vQ3JlYXRlICYmIGtleXBhcnQgPj0gZG9jLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICB3aGlsZSAoZG9jLmxlbmd0aCA8IGtleXBhcnQpIHtcbiAgICAgICAgZG9jLnB1c2gobnVsbCk7XG4gICAgICB9XG5cbiAgICAgIGlmICghbGFzdCkge1xuICAgICAgICBpZiAoZG9jLmxlbmd0aCA9PT0ga2V5cGFydCkge1xuICAgICAgICAgIGRvYy5wdXNoKHt9KTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZG9jW2tleXBhcnRdICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgIHRocm93IE1pbmltb25nb0Vycm9yKFxuICAgICAgICAgICAgYGNhbid0IG1vZGlmeSBmaWVsZCAnJHtrZXlwYXJ0c1tpICsgMV19JyBvZiBsaXN0IHZhbHVlIGAgK1xuICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoZG9jW2tleXBhcnRdKVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYXNzZXJ0SXNWYWxpZEZpZWxkTmFtZShrZXlwYXJ0KTtcblxuICAgICAgaWYgKCEoa2V5cGFydCBpbiBkb2MpKSB7XG4gICAgICAgIGlmIChvcHRpb25zLm5vQ3JlYXRlKSB7XG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbGFzdCkge1xuICAgICAgICAgIGRvY1trZXlwYXJ0XSA9IHt9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGxhc3QpIHtcbiAgICAgIHJldHVybiBkb2M7XG4gICAgfVxuXG4gICAgZG9jID0gZG9jW2tleXBhcnRdO1xuICB9XG5cbiAgLy8gbm90cmVhY2hlZFxufVxuIiwiaW1wb3J0IExvY2FsQ29sbGVjdGlvbiBmcm9tICcuL2xvY2FsX2NvbGxlY3Rpb24uanMnO1xuaW1wb3J0IHtcbiAgY29tcGlsZURvY3VtZW50U2VsZWN0b3IsXG4gIGhhc093bixcbiAgbm90aGluZ01hdGNoZXIsXG59IGZyb20gJy4vY29tbW9uLmpzJztcblxuLy8gVGhlIG1pbmltb25nbyBzZWxlY3RvciBjb21waWxlciFcblxuLy8gVGVybWlub2xvZ3k6XG4vLyAgLSBhICdzZWxlY3RvcicgaXMgdGhlIEVKU09OIG9iamVjdCByZXByZXNlbnRpbmcgYSBzZWxlY3RvclxuLy8gIC0gYSAnbWF0Y2hlcicgaXMgaXRzIGNvbXBpbGVkIGZvcm0gKHdoZXRoZXIgYSBmdWxsIE1pbmltb25nby5NYXRjaGVyXG4vLyAgICBvYmplY3Qgb3Igb25lIG9mIHRoZSBjb21wb25lbnQgbGFtYmRhcyB0aGF0IG1hdGNoZXMgcGFydHMgb2YgaXQpXG4vLyAgLSBhICdyZXN1bHQgb2JqZWN0JyBpcyBhbiBvYmplY3Qgd2l0aCBhICdyZXN1bHQnIGZpZWxkIGFuZCBtYXliZVxuLy8gICAgZGlzdGFuY2UgYW5kIGFycmF5SW5kaWNlcy5cbi8vICAtIGEgJ2JyYW5jaGVkIHZhbHVlJyBpcyBhbiBvYmplY3Qgd2l0aCBhICd2YWx1ZScgZmllbGQgYW5kIG1heWJlXG4vLyAgICAnZG9udEl0ZXJhdGUnIGFuZCAnYXJyYXlJbmRpY2VzJy5cbi8vICAtIGEgJ2RvY3VtZW50JyBpcyBhIHRvcC1sZXZlbCBvYmplY3QgdGhhdCBjYW4gYmUgc3RvcmVkIGluIGEgY29sbGVjdGlvbi5cbi8vICAtIGEgJ2xvb2t1cCBmdW5jdGlvbicgaXMgYSBmdW5jdGlvbiB0aGF0IHRha2VzIGluIGEgZG9jdW1lbnQgYW5kIHJldHVybnNcbi8vICAgIGFuIGFycmF5IG9mICdicmFuY2hlZCB2YWx1ZXMnLlxuLy8gIC0gYSAnYnJhbmNoZWQgbWF0Y2hlcicgbWFwcyBmcm9tIGFuIGFycmF5IG9mIGJyYW5jaGVkIHZhbHVlcyB0byBhIHJlc3VsdFxuLy8gICAgb2JqZWN0LlxuLy8gIC0gYW4gJ2VsZW1lbnQgbWF0Y2hlcicgbWFwcyBmcm9tIGEgc2luZ2xlIHZhbHVlIHRvIGEgYm9vbC5cblxuLy8gTWFpbiBlbnRyeSBwb2ludC5cbi8vICAgdmFyIG1hdGNoZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoe2E6IHskZ3Q6IDV9fSk7XG4vLyAgIGlmIChtYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyh7YTogN30pKSAuLi5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1hdGNoZXIge1xuICBjb25zdHJ1Y3RvcihzZWxlY3RvciwgaXNVcGRhdGUpIHtcbiAgICAvLyBBIHNldCAob2JqZWN0IG1hcHBpbmcgc3RyaW5nIC0+ICopIG9mIGFsbCBvZiB0aGUgZG9jdW1lbnQgcGF0aHMgbG9va2VkXG4gICAgLy8gYXQgYnkgdGhlIHNlbGVjdG9yLiBBbHNvIGluY2x1ZGVzIHRoZSBlbXB0eSBzdHJpbmcgaWYgaXQgbWF5IGxvb2sgYXQgYW55XG4gICAgLy8gcGF0aCAoZWcsICR3aGVyZSkuXG4gICAgdGhpcy5fcGF0aHMgPSB7fTtcbiAgICAvLyBTZXQgdG8gdHJ1ZSBpZiBjb21waWxhdGlvbiBmaW5kcyBhICRuZWFyLlxuICAgIHRoaXMuX2hhc0dlb1F1ZXJ5ID0gZmFsc2U7XG4gICAgLy8gU2V0IHRvIHRydWUgaWYgY29tcGlsYXRpb24gZmluZHMgYSAkd2hlcmUuXG4gICAgdGhpcy5faGFzV2hlcmUgPSBmYWxzZTtcbiAgICAvLyBTZXQgdG8gZmFsc2UgaWYgY29tcGlsYXRpb24gZmluZHMgYW55dGhpbmcgb3RoZXIgdGhhbiBhIHNpbXBsZSBlcXVhbGl0eVxuICAgIC8vIG9yIG9uZSBvciBtb3JlIG9mICckZ3QnLCAnJGd0ZScsICckbHQnLCAnJGx0ZScsICckbmUnLCAnJGluJywgJyRuaW4nIHVzZWRcbiAgICAvLyB3aXRoIHNjYWxhcnMgYXMgb3BlcmFuZHMuXG4gICAgdGhpcy5faXNTaW1wbGUgPSB0cnVlO1xuICAgIC8vIFNldCB0byBhIGR1bW15IGRvY3VtZW50IHdoaWNoIGFsd2F5cyBtYXRjaGVzIHRoaXMgTWF0Y2hlci4gT3Igc2V0IHRvIG51bGxcbiAgICAvLyBpZiBzdWNoIGRvY3VtZW50IGlzIHRvbyBoYXJkIHRvIGZpbmQuXG4gICAgdGhpcy5fbWF0Y2hpbmdEb2N1bWVudCA9IHVuZGVmaW5lZDtcbiAgICAvLyBBIGNsb25lIG9mIHRoZSBvcmlnaW5hbCBzZWxlY3Rvci4gSXQgbWF5IGp1c3QgYmUgYSBmdW5jdGlvbiBpZiB0aGUgdXNlclxuICAgIC8vIHBhc3NlZCBpbiBhIGZ1bmN0aW9uOyBvdGhlcndpc2UgaXMgZGVmaW5pdGVseSBhbiBvYmplY3QgKGVnLCBJRHMgYXJlXG4gICAgLy8gdHJhbnNsYXRlZCBpbnRvIHtfaWQ6IElEfSBmaXJzdC4gVXNlZCBieSBjYW5CZWNvbWVUcnVlQnlNb2RpZmllciBhbmRcbiAgICAvLyBTb3J0ZXIuX3VzZVdpdGhNYXRjaGVyLlxuICAgIHRoaXMuX3NlbGVjdG9yID0gbnVsbDtcbiAgICB0aGlzLl9kb2NNYXRjaGVyID0gdGhpcy5fY29tcGlsZVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICAvLyBTZXQgdG8gdHJ1ZSBpZiBzZWxlY3Rpb24gaXMgZG9uZSBmb3IgYW4gdXBkYXRlIG9wZXJhdGlvblxuICAgIC8vIERlZmF1bHQgaXMgZmFsc2VcbiAgICAvLyBVc2VkIGZvciAkbmVhciBhcnJheSB1cGRhdGUgKGlzc3VlICMzNTk5KVxuICAgIHRoaXMuX2lzVXBkYXRlID0gaXNVcGRhdGU7XG4gIH1cblxuICBkb2N1bWVudE1hdGNoZXMoZG9jKSB7XG4gICAgaWYgKGRvYyAhPT0gT2JqZWN0KGRvYykpIHtcbiAgICAgIHRocm93IEVycm9yKCdkb2N1bWVudE1hdGNoZXMgbmVlZHMgYSBkb2N1bWVudCcpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9kb2NNYXRjaGVyKGRvYyk7XG4gIH1cblxuICBoYXNHZW9RdWVyeSgpIHtcbiAgICByZXR1cm4gdGhpcy5faGFzR2VvUXVlcnk7XG4gIH1cblxuICBoYXNXaGVyZSgpIHtcbiAgICByZXR1cm4gdGhpcy5faGFzV2hlcmU7XG4gIH1cblxuICBpc1NpbXBsZSgpIHtcbiAgICByZXR1cm4gdGhpcy5faXNTaW1wbGU7XG4gIH1cblxuICAvLyBHaXZlbiBhIHNlbGVjdG9yLCByZXR1cm4gYSBmdW5jdGlvbiB0aGF0IHRha2VzIG9uZSBhcmd1bWVudCwgYVxuICAvLyBkb2N1bWVudC4gSXQgcmV0dXJucyBhIHJlc3VsdCBvYmplY3QuXG4gIF9jb21waWxlU2VsZWN0b3Ioc2VsZWN0b3IpIHtcbiAgICAvLyB5b3UgY2FuIHBhc3MgYSBsaXRlcmFsIGZ1bmN0aW9uIGluc3RlYWQgb2YgYSBzZWxlY3RvclxuICAgIGlmIChzZWxlY3RvciBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICB0aGlzLl9pc1NpbXBsZSA9IGZhbHNlO1xuICAgICAgdGhpcy5fc2VsZWN0b3IgPSBzZWxlY3RvcjtcbiAgICAgIHRoaXMuX3JlY29yZFBhdGhVc2VkKCcnKTtcblxuICAgICAgcmV0dXJuIGRvYyA9PiAoe3Jlc3VsdDogISFzZWxlY3Rvci5jYWxsKGRvYyl9KTtcbiAgICB9XG5cbiAgICAvLyBzaG9ydGhhbmQgLS0gc2NhbGFyIF9pZFxuICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZChzZWxlY3RvcikpIHtcbiAgICAgIHRoaXMuX3NlbGVjdG9yID0ge19pZDogc2VsZWN0b3J9O1xuICAgICAgdGhpcy5fcmVjb3JkUGF0aFVzZWQoJ19pZCcpO1xuXG4gICAgICByZXR1cm4gZG9jID0+ICh7cmVzdWx0OiBFSlNPTi5lcXVhbHMoZG9jLl9pZCwgc2VsZWN0b3IpfSk7XG4gICAgfVxuXG4gICAgLy8gcHJvdGVjdCBhZ2FpbnN0IGRhbmdlcm91cyBzZWxlY3RvcnMuICBmYWxzZXkgYW5kIHtfaWQ6IGZhbHNleX0gYXJlIGJvdGhcbiAgICAvLyBsaWtlbHkgcHJvZ3JhbW1lciBlcnJvciwgYW5kIG5vdCB3aGF0IHlvdSB3YW50LCBwYXJ0aWN1bGFybHkgZm9yXG4gICAgLy8gZGVzdHJ1Y3RpdmUgb3BlcmF0aW9ucy5cbiAgICBpZiAoIXNlbGVjdG9yIHx8IGhhc093bi5jYWxsKHNlbGVjdG9yLCAnX2lkJykgJiYgIXNlbGVjdG9yLl9pZCkge1xuICAgICAgdGhpcy5faXNTaW1wbGUgPSBmYWxzZTtcbiAgICAgIHJldHVybiBub3RoaW5nTWF0Y2hlcjtcbiAgICB9XG5cbiAgICAvLyBUb3AgbGV2ZWwgY2FuJ3QgYmUgYW4gYXJyYXkgb3IgdHJ1ZSBvciBiaW5hcnkuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoc2VsZWN0b3IpIHx8XG4gICAgICAgIEVKU09OLmlzQmluYXJ5KHNlbGVjdG9yKSB8fFxuICAgICAgICB0eXBlb2Ygc2VsZWN0b3IgPT09ICdib29sZWFuJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHNlbGVjdG9yOiAke3NlbGVjdG9yfWApO1xuICAgIH1cblxuICAgIHRoaXMuX3NlbGVjdG9yID0gRUpTT04uY2xvbmUoc2VsZWN0b3IpO1xuXG4gICAgcmV0dXJuIGNvbXBpbGVEb2N1bWVudFNlbGVjdG9yKHNlbGVjdG9yLCB0aGlzLCB7aXNSb290OiB0cnVlfSk7XG4gIH1cblxuICAvLyBSZXR1cm5zIGEgbGlzdCBvZiBrZXkgcGF0aHMgdGhlIGdpdmVuIHNlbGVjdG9yIGlzIGxvb2tpbmcgZm9yLiBJdCBpbmNsdWRlc1xuICAvLyB0aGUgZW1wdHkgc3RyaW5nIGlmIHRoZXJlIGlzIGEgJHdoZXJlLlxuICBfZ2V0UGF0aHMoKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX3BhdGhzKTtcbiAgfVxuXG4gIF9yZWNvcmRQYXRoVXNlZChwYXRoKSB7XG4gICAgdGhpcy5fcGF0aHNbcGF0aF0gPSB0cnVlO1xuICB9XG59XG5cbi8vIGhlbHBlcnMgdXNlZCBieSBjb21waWxlZCBzZWxlY3RvciBjb2RlXG5Mb2NhbENvbGxlY3Rpb24uX2YgPSB7XG4gIC8vIFhYWCBmb3IgX2FsbCBhbmQgX2luLCBjb25zaWRlciBidWlsZGluZyAnaW5xdWVyeScgYXQgY29tcGlsZSB0aW1lLi5cbiAgX3R5cGUodikge1xuICAgIGlmICh0eXBlb2YgdiA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdiA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiAyO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdiA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICByZXR1cm4gODtcbiAgICB9XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2KSkge1xuICAgICAgcmV0dXJuIDQ7XG4gICAgfVxuXG4gICAgaWYgKHYgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiAxMDtcbiAgICB9XG5cbiAgICAvLyBub3RlIHRoYXQgdHlwZW9mKC94LykgPT09IFwib2JqZWN0XCJcbiAgICBpZiAodiBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgcmV0dXJuIDExO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIDEzO1xuICAgIH1cblxuICAgIGlmICh2IGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgcmV0dXJuIDk7XG4gICAgfVxuXG4gICAgaWYgKEVKU09OLmlzQmluYXJ5KHYpKSB7XG4gICAgICByZXR1cm4gNTtcbiAgICB9XG5cbiAgICBpZiAodiBpbnN0YW5jZW9mIE1vbmdvSUQuT2JqZWN0SUQpIHtcbiAgICAgIHJldHVybiA3O1xuICAgIH1cblxuICAgIC8vIG9iamVjdFxuICAgIHJldHVybiAzO1xuXG4gICAgLy8gWFhYIHN1cHBvcnQgc29tZS9hbGwgb2YgdGhlc2U6XG4gICAgLy8gMTQsIHN5bWJvbFxuICAgIC8vIDE1LCBqYXZhc2NyaXB0IGNvZGUgd2l0aCBzY29wZVxuICAgIC8vIDE2LCAxODogMzItYml0LzY0LWJpdCBpbnRlZ2VyXG4gICAgLy8gMTcsIHRpbWVzdGFtcFxuICAgIC8vIDI1NSwgbWlua2V5XG4gICAgLy8gMTI3LCBtYXhrZXlcbiAgfSxcblxuICAvLyBkZWVwIGVxdWFsaXR5IHRlc3Q6IHVzZSBmb3IgbGl0ZXJhbCBkb2N1bWVudCBhbmQgYXJyYXkgbWF0Y2hlc1xuICBfZXF1YWwoYSwgYikge1xuICAgIHJldHVybiBFSlNPTi5lcXVhbHMoYSwgYiwge2tleU9yZGVyU2Vuc2l0aXZlOiB0cnVlfSk7XG4gIH0sXG5cbiAgLy8gbWFwcyBhIHR5cGUgY29kZSB0byBhIHZhbHVlIHRoYXQgY2FuIGJlIHVzZWQgdG8gc29ydCB2YWx1ZXMgb2YgZGlmZmVyZW50XG4gIC8vIHR5cGVzXG4gIF90eXBlb3JkZXIodCkge1xuICAgIC8vIGh0dHA6Ly93d3cubW9uZ29kYi5vcmcvZGlzcGxheS9ET0NTL1doYXQraXMrdGhlK0NvbXBhcmUrT3JkZXIrZm9yK0JTT04rVHlwZXNcbiAgICAvLyBYWFggd2hhdCBpcyB0aGUgY29ycmVjdCBzb3J0IHBvc2l0aW9uIGZvciBKYXZhc2NyaXB0IGNvZGU/XG4gICAgLy8gKCcxMDAnIGluIHRoZSBtYXRyaXggYmVsb3cpXG4gICAgLy8gWFhYIG1pbmtleS9tYXhrZXlcbiAgICByZXR1cm4gW1xuICAgICAgLTEsICAvLyAobm90IGEgdHlwZSlcbiAgICAgIDEsICAgLy8gbnVtYmVyXG4gICAgICAyLCAgIC8vIHN0cmluZ1xuICAgICAgMywgICAvLyBvYmplY3RcbiAgICAgIDQsICAgLy8gYXJyYXlcbiAgICAgIDUsICAgLy8gYmluYXJ5XG4gICAgICAtMSwgIC8vIGRlcHJlY2F0ZWRcbiAgICAgIDYsICAgLy8gT2JqZWN0SURcbiAgICAgIDcsICAgLy8gYm9vbFxuICAgICAgOCwgICAvLyBEYXRlXG4gICAgICAwLCAgIC8vIG51bGxcbiAgICAgIDksICAgLy8gUmVnRXhwXG4gICAgICAtMSwgIC8vIGRlcHJlY2F0ZWRcbiAgICAgIDEwMCwgLy8gSlMgY29kZVxuICAgICAgMiwgICAvLyBkZXByZWNhdGVkIChzeW1ib2wpXG4gICAgICAxMDAsIC8vIEpTIGNvZGVcbiAgICAgIDEsICAgLy8gMzItYml0IGludFxuICAgICAgOCwgICAvLyBNb25nbyB0aW1lc3RhbXBcbiAgICAgIDEgICAgLy8gNjQtYml0IGludFxuICAgIF1bdF07XG4gIH0sXG5cbiAgLy8gY29tcGFyZSB0d28gdmFsdWVzIG9mIHVua25vd24gdHlwZSBhY2NvcmRpbmcgdG8gQlNPTiBvcmRlcmluZ1xuICAvLyBzZW1hbnRpY3MuIChhcyBhbiBleHRlbnNpb24sIGNvbnNpZGVyICd1bmRlZmluZWQnIHRvIGJlIGxlc3MgdGhhblxuICAvLyBhbnkgb3RoZXIgdmFsdWUuKSByZXR1cm4gbmVnYXRpdmUgaWYgYSBpcyBsZXNzLCBwb3NpdGl2ZSBpZiBiIGlzXG4gIC8vIGxlc3MsIG9yIDAgaWYgZXF1YWxcbiAgX2NtcChhLCBiKSB7XG4gICAgaWYgKGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGIgPT09IHVuZGVmaW5lZCA/IDAgOiAtMTtcbiAgICB9XG5cbiAgICBpZiAoYiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9XG5cbiAgICBsZXQgdGEgPSBMb2NhbENvbGxlY3Rpb24uX2YuX3R5cGUoYSk7XG4gICAgbGV0IHRiID0gTG9jYWxDb2xsZWN0aW9uLl9mLl90eXBlKGIpO1xuXG4gICAgY29uc3Qgb2EgPSBMb2NhbENvbGxlY3Rpb24uX2YuX3R5cGVvcmRlcih0YSk7XG4gICAgY29uc3Qgb2IgPSBMb2NhbENvbGxlY3Rpb24uX2YuX3R5cGVvcmRlcih0Yik7XG5cbiAgICBpZiAob2EgIT09IG9iKSB7XG4gICAgICByZXR1cm4gb2EgPCBvYiA/IC0xIDogMTtcbiAgICB9XG5cbiAgICAvLyBYWFggbmVlZCB0byBpbXBsZW1lbnQgdGhpcyBpZiB3ZSBpbXBsZW1lbnQgU3ltYm9sIG9yIGludGVnZXJzLCBvclxuICAgIC8vIFRpbWVzdGFtcFxuICAgIGlmICh0YSAhPT0gdGIpIHtcbiAgICAgIHRocm93IEVycm9yKCdNaXNzaW5nIHR5cGUgY29lcmNpb24gbG9naWMgaW4gX2NtcCcpO1xuICAgIH1cblxuICAgIGlmICh0YSA9PT0gNykgeyAvLyBPYmplY3RJRFxuICAgICAgLy8gQ29udmVydCB0byBzdHJpbmcuXG4gICAgICB0YSA9IHRiID0gMjtcbiAgICAgIGEgPSBhLnRvSGV4U3RyaW5nKCk7XG4gICAgICBiID0gYi50b0hleFN0cmluZygpO1xuICAgIH1cblxuICAgIGlmICh0YSA9PT0gOSkgeyAvLyBEYXRlXG4gICAgICAvLyBDb252ZXJ0IHRvIG1pbGxpcy5cbiAgICAgIHRhID0gdGIgPSAxO1xuICAgICAgYSA9IGEuZ2V0VGltZSgpO1xuICAgICAgYiA9IGIuZ2V0VGltZSgpO1xuICAgIH1cblxuICAgIGlmICh0YSA9PT0gMSkgLy8gZG91YmxlXG4gICAgICByZXR1cm4gYSAtIGI7XG5cbiAgICBpZiAodGIgPT09IDIpIC8vIHN0cmluZ1xuICAgICAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID09PSBiID8gMCA6IDE7XG5cbiAgICBpZiAodGEgPT09IDMpIHsgLy8gT2JqZWN0XG4gICAgICAvLyB0aGlzIGNvdWxkIGJlIG11Y2ggbW9yZSBlZmZpY2llbnQgaW4gdGhlIGV4cGVjdGVkIGNhc2UgLi4uXG4gICAgICBjb25zdCB0b0FycmF5ID0gb2JqZWN0ID0+IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gW107XG5cbiAgICAgICAgT2JqZWN0LmtleXMob2JqZWN0KS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgcmVzdWx0LnB1c2goa2V5LCBvYmplY3Rba2V5XSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gTG9jYWxDb2xsZWN0aW9uLl9mLl9jbXAodG9BcnJheShhKSwgdG9BcnJheShiKSk7XG4gICAgfVxuXG4gICAgaWYgKHRhID09PSA0KSB7IC8vIEFycmF5XG4gICAgICBmb3IgKGxldCBpID0gMDsgOyBpKyspIHtcbiAgICAgICAgaWYgKGkgPT09IGEubGVuZ3RoKSB7XG4gICAgICAgICAgcmV0dXJuIGkgPT09IGIubGVuZ3RoID8gMCA6IC0xO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGkgPT09IGIubGVuZ3RoKSB7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzID0gTG9jYWxDb2xsZWN0aW9uLl9mLl9jbXAoYVtpXSwgYltpXSk7XG4gICAgICAgIGlmIChzICE9PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGEgPT09IDUpIHsgLy8gYmluYXJ5XG4gICAgICAvLyBTdXJwcmlzaW5nbHksIGEgc21hbGwgYmluYXJ5IGJsb2IgaXMgYWx3YXlzIGxlc3MgdGhhbiBhIGxhcmdlIG9uZSBpblxuICAgICAgLy8gTW9uZ28uXG4gICAgICBpZiAoYS5sZW5ndGggIT09IGIubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBhLmxlbmd0aCAtIGIubGVuZ3RoO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGFbaV0gPCBiW2ldKSB7XG4gICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGFbaV0gPiBiW2ldKSB7XG4gICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgaWYgKHRhID09PSA4KSB7IC8vIGJvb2xlYW5cbiAgICAgIGlmIChhKSB7XG4gICAgICAgIHJldHVybiBiID8gMCA6IDE7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBiID8gLTEgOiAwO1xuICAgIH1cblxuICAgIGlmICh0YSA9PT0gMTApIC8vIG51bGxcbiAgICAgIHJldHVybiAwO1xuXG4gICAgaWYgKHRhID09PSAxMSkgLy8gcmVnZXhwXG4gICAgICB0aHJvdyBFcnJvcignU29ydGluZyBub3Qgc3VwcG9ydGVkIG9uIHJlZ3VsYXIgZXhwcmVzc2lvbicpOyAvLyBYWFhcblxuICAgIC8vIDEzOiBqYXZhc2NyaXB0IGNvZGVcbiAgICAvLyAxNDogc3ltYm9sXG4gICAgLy8gMTU6IGphdmFzY3JpcHQgY29kZSB3aXRoIHNjb3BlXG4gICAgLy8gMTY6IDMyLWJpdCBpbnRlZ2VyXG4gICAgLy8gMTc6IHRpbWVzdGFtcFxuICAgIC8vIDE4OiA2NC1iaXQgaW50ZWdlclxuICAgIC8vIDI1NTogbWlua2V5XG4gICAgLy8gMTI3OiBtYXhrZXlcbiAgICBpZiAodGEgPT09IDEzKSAvLyBqYXZhc2NyaXB0IGNvZGVcbiAgICAgIHRocm93IEVycm9yKCdTb3J0aW5nIG5vdCBzdXBwb3J0ZWQgb24gSmF2YXNjcmlwdCBjb2RlJyk7IC8vIFhYWFxuXG4gICAgdGhyb3cgRXJyb3IoJ1Vua25vd24gdHlwZSB0byBzb3J0Jyk7XG4gIH0sXG59O1xuIiwiaW1wb3J0IExvY2FsQ29sbGVjdGlvbl8gZnJvbSAnLi9sb2NhbF9jb2xsZWN0aW9uLmpzJztcbmltcG9ydCBNYXRjaGVyIGZyb20gJy4vbWF0Y2hlci5qcyc7XG5pbXBvcnQgU29ydGVyIGZyb20gJy4vc29ydGVyLmpzJztcblxuTG9jYWxDb2xsZWN0aW9uID0gTG9jYWxDb2xsZWN0aW9uXztcbk1pbmltb25nbyA9IHtcbiAgICBMb2NhbENvbGxlY3Rpb246IExvY2FsQ29sbGVjdGlvbl8sXG4gICAgTWF0Y2hlcixcbiAgICBTb3J0ZXJcbn07XG4iLCIvLyBPYnNlcnZlSGFuZGxlOiB0aGUgcmV0dXJuIHZhbHVlIG9mIGEgbGl2ZSBxdWVyeS5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE9ic2VydmVIYW5kbGUge31cbiIsImltcG9ydCB7XG4gIEVMRU1FTlRfT1BFUkFUT1JTLFxuICBlcXVhbGl0eUVsZW1lbnRNYXRjaGVyLFxuICBleHBhbmRBcnJheXNJbkJyYW5jaGVzLFxuICBoYXNPd24sXG4gIGlzT3BlcmF0b3JPYmplY3QsXG4gIG1ha2VMb29rdXBGdW5jdGlvbixcbiAgcmVnZXhwRWxlbWVudE1hdGNoZXIsXG59IGZyb20gJy4vY29tbW9uLmpzJztcblxuLy8gR2l2ZSBhIHNvcnQgc3BlYywgd2hpY2ggY2FuIGJlIGluIGFueSBvZiB0aGVzZSBmb3Jtczpcbi8vICAge1wia2V5MVwiOiAxLCBcImtleTJcIjogLTF9XG4vLyAgIFtbXCJrZXkxXCIsIFwiYXNjXCJdLCBbXCJrZXkyXCIsIFwiZGVzY1wiXV1cbi8vICAgW1wia2V5MVwiLCBbXCJrZXkyXCIsIFwiZGVzY1wiXV1cbi8vXG4vLyAoLi4gd2l0aCB0aGUgZmlyc3QgZm9ybSBiZWluZyBkZXBlbmRlbnQgb24gdGhlIGtleSBlbnVtZXJhdGlvblxuLy8gYmVoYXZpb3Igb2YgeW91ciBqYXZhc2NyaXB0IFZNLCB3aGljaCB1c3VhbGx5IGRvZXMgd2hhdCB5b3UgbWVhbiBpblxuLy8gdGhpcyBjYXNlIGlmIHRoZSBrZXkgbmFtZXMgZG9uJ3QgbG9vayBsaWtlIGludGVnZXJzIC4uKVxuLy9cbi8vIHJldHVybiBhIGZ1bmN0aW9uIHRoYXQgdGFrZXMgdHdvIG9iamVjdHMsIGFuZCByZXR1cm5zIC0xIGlmIHRoZVxuLy8gZmlyc3Qgb2JqZWN0IGNvbWVzIGZpcnN0IGluIG9yZGVyLCAxIGlmIHRoZSBzZWNvbmQgb2JqZWN0IGNvbWVzXG4vLyBmaXJzdCwgb3IgMCBpZiBuZWl0aGVyIG9iamVjdCBjb21lcyBiZWZvcmUgdGhlIG90aGVyLlxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTb3J0ZXIge1xuICBjb25zdHJ1Y3RvcihzcGVjLCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLl9zb3J0U3BlY1BhcnRzID0gW107XG4gICAgdGhpcy5fc29ydEZ1bmN0aW9uID0gbnVsbDtcblxuICAgIGNvbnN0IGFkZFNwZWNQYXJ0ID0gKHBhdGgsIGFzY2VuZGluZykgPT4ge1xuICAgICAgaWYgKCFwYXRoKSB7XG4gICAgICAgIHRocm93IEVycm9yKCdzb3J0IGtleXMgbXVzdCBiZSBub24tZW1wdHknKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHBhdGguY2hhckF0KDApID09PSAnJCcpIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoYHVuc3VwcG9ydGVkIHNvcnQga2V5OiAke3BhdGh9YCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3NvcnRTcGVjUGFydHMucHVzaCh7XG4gICAgICAgIGFzY2VuZGluZyxcbiAgICAgICAgbG9va3VwOiBtYWtlTG9va3VwRnVuY3Rpb24ocGF0aCwge2ZvclNvcnQ6IHRydWV9KSxcbiAgICAgICAgcGF0aFxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGlmIChzcGVjIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgIHNwZWMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIGFkZFNwZWNQYXJ0KGVsZW1lbnQsIHRydWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFkZFNwZWNQYXJ0KGVsZW1lbnRbMF0sIGVsZW1lbnRbMV0gIT09ICdkZXNjJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHNwZWMgPT09ICdvYmplY3QnKSB7XG4gICAgICBPYmplY3Qua2V5cyhzcGVjKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgIGFkZFNwZWNQYXJ0KGtleSwgc3BlY1trZXldID49IDApO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygc3BlYyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5fc29ydEZ1bmN0aW9uID0gc3BlYztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgRXJyb3IoYEJhZCBzb3J0IHNwZWNpZmljYXRpb246ICR7SlNPTi5zdHJpbmdpZnkoc3BlYyl9YCk7XG4gICAgfVxuXG4gICAgLy8gSWYgYSBmdW5jdGlvbiBpcyBzcGVjaWZpZWQgZm9yIHNvcnRpbmcsIHdlIHNraXAgdGhlIHJlc3QuXG4gICAgaWYgKHRoaXMuX3NvcnRGdW5jdGlvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFRvIGltcGxlbWVudCBhZmZlY3RlZEJ5TW9kaWZpZXIsIHdlIHBpZ2d5LWJhY2sgb24gdG9wIG9mIE1hdGNoZXInc1xuICAgIC8vIGFmZmVjdGVkQnlNb2RpZmllciBjb2RlOyB3ZSBjcmVhdGUgYSBzZWxlY3RvciB0aGF0IGlzIGFmZmVjdGVkIGJ5IHRoZVxuICAgIC8vIHNhbWUgbW9kaWZpZXJzIGFzIHRoaXMgc29ydCBvcmRlci4gVGhpcyBpcyBvbmx5IGltcGxlbWVudGVkIG9uIHRoZVxuICAgIC8vIHNlcnZlci5cbiAgICBpZiAodGhpcy5hZmZlY3RlZEJ5TW9kaWZpZXIpIHtcbiAgICAgIGNvbnN0IHNlbGVjdG9yID0ge307XG5cbiAgICAgIHRoaXMuX3NvcnRTcGVjUGFydHMuZm9yRWFjaChzcGVjID0+IHtcbiAgICAgICAgc2VsZWN0b3Jbc3BlYy5wYXRoXSA9IDE7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5fc2VsZWN0b3JGb3JBZmZlY3RlZEJ5TW9kaWZpZXIgPSBuZXcgTWluaW1vbmdvLk1hdGNoZXIoc2VsZWN0b3IpO1xuICAgIH1cblxuICAgIHRoaXMuX2tleUNvbXBhcmF0b3IgPSBjb21wb3NlQ29tcGFyYXRvcnMoXG4gICAgICB0aGlzLl9zb3J0U3BlY1BhcnRzLm1hcCgoc3BlYywgaSkgPT4gdGhpcy5fa2V5RmllbGRDb21wYXJhdG9yKGkpKVxuICAgICk7XG5cbiAgICAvLyBJZiB5b3Ugc3BlY2lmeSBhIG1hdGNoZXIgZm9yIHRoaXMgU29ydGVyLCBfa2V5RmlsdGVyIG1heSBiZSBzZXQgdG8gYVxuICAgIC8vIGZ1bmN0aW9uIHdoaWNoIHNlbGVjdHMgd2hldGhlciBvciBub3QgYSBnaXZlbiBcInNvcnQga2V5XCIgKHR1cGxlIG9mIHZhbHVlc1xuICAgIC8vIGZvciB0aGUgZGlmZmVyZW50IHNvcnQgc3BlYyBmaWVsZHMpIGlzIGNvbXBhdGlibGUgd2l0aCB0aGUgc2VsZWN0b3IuXG4gICAgdGhpcy5fa2V5RmlsdGVyID0gbnVsbDtcblxuICAgIGlmIChvcHRpb25zLm1hdGNoZXIpIHtcbiAgICAgIHRoaXMuX3VzZVdpdGhNYXRjaGVyKG9wdGlvbnMubWF0Y2hlcik7XG4gICAgfVxuICB9XG5cbiAgZ2V0Q29tcGFyYXRvcihvcHRpb25zKSB7XG4gICAgLy8gSWYgc29ydCBpcyBzcGVjaWZpZWQgb3IgaGF2ZSBubyBkaXN0YW5jZXMsIGp1c3QgdXNlIHRoZSBjb21wYXJhdG9yIGZyb21cbiAgICAvLyB0aGUgc291cmNlIHNwZWNpZmljYXRpb24gKHdoaWNoIGRlZmF1bHRzIHRvIFwiZXZlcnl0aGluZyBpcyBlcXVhbFwiLlxuICAgIC8vIGlzc3VlICMzNTk5XG4gICAgLy8gaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9yZWZlcmVuY2Uvb3BlcmF0b3IvcXVlcnkvbmVhci8jc29ydC1vcGVyYXRpb25cbiAgICAvLyBzb3J0IGVmZmVjdGl2ZWx5IG92ZXJyaWRlcyAkbmVhclxuICAgIGlmICh0aGlzLl9zb3J0U3BlY1BhcnRzLmxlbmd0aCB8fCAhb3B0aW9ucyB8fCAhb3B0aW9ucy5kaXN0YW5jZXMpIHtcbiAgICAgIHJldHVybiB0aGlzLl9nZXRCYXNlQ29tcGFyYXRvcigpO1xuICAgIH1cblxuICAgIGNvbnN0IGRpc3RhbmNlcyA9IG9wdGlvbnMuZGlzdGFuY2VzO1xuXG4gICAgLy8gUmV0dXJuIGEgY29tcGFyYXRvciB3aGljaCBjb21wYXJlcyB1c2luZyAkbmVhciBkaXN0YW5jZXMuXG4gICAgcmV0dXJuIChhLCBiKSA9PiB7XG4gICAgICBpZiAoIWRpc3RhbmNlcy5oYXMoYS5faWQpKSB7XG4gICAgICAgIHRocm93IEVycm9yKGBNaXNzaW5nIGRpc3RhbmNlIGZvciAke2EuX2lkfWApO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWRpc3RhbmNlcy5oYXMoYi5faWQpKSB7XG4gICAgICAgIHRocm93IEVycm9yKGBNaXNzaW5nIGRpc3RhbmNlIGZvciAke2IuX2lkfWApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZGlzdGFuY2VzLmdldChhLl9pZCkgLSBkaXN0YW5jZXMuZ2V0KGIuX2lkKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gVGFrZXMgaW4gdHdvIGtleXM6IGFycmF5cyB3aG9zZSBsZW5ndGhzIG1hdGNoIHRoZSBudW1iZXIgb2Ygc3BlY1xuICAvLyBwYXJ0cy4gUmV0dXJucyBuZWdhdGl2ZSwgMCwgb3IgcG9zaXRpdmUgYmFzZWQgb24gdXNpbmcgdGhlIHNvcnQgc3BlYyB0b1xuICAvLyBjb21wYXJlIGZpZWxkcy5cbiAgX2NvbXBhcmVLZXlzKGtleTEsIGtleTIpIHtcbiAgICBpZiAoa2V5MS5sZW5ndGggIT09IHRoaXMuX3NvcnRTcGVjUGFydHMubGVuZ3RoIHx8XG4gICAgICAgIGtleTIubGVuZ3RoICE9PSB0aGlzLl9zb3J0U3BlY1BhcnRzLmxlbmd0aCkge1xuICAgICAgdGhyb3cgRXJyb3IoJ0tleSBoYXMgd3JvbmcgbGVuZ3RoJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2tleUNvbXBhcmF0b3Ioa2V5MSwga2V5Mik7XG4gIH1cblxuICAvLyBJdGVyYXRlcyBvdmVyIGVhY2ggcG9zc2libGUgXCJrZXlcIiBmcm9tIGRvYyAoaWUsIG92ZXIgZWFjaCBicmFuY2gpLCBjYWxsaW5nXG4gIC8vICdjYicgd2l0aCB0aGUga2V5LlxuICBfZ2VuZXJhdGVLZXlzRnJvbURvYyhkb2MsIGNiKSB7XG4gICAgaWYgKHRoaXMuX3NvcnRTcGVjUGFydHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NhblxcJ3QgZ2VuZXJhdGUga2V5cyB3aXRob3V0IGEgc3BlYycpO1xuICAgIH1cblxuICAgIGNvbnN0IHBhdGhGcm9tSW5kaWNlcyA9IGluZGljZXMgPT4gYCR7aW5kaWNlcy5qb2luKCcsJyl9LGA7XG5cbiAgICBsZXQga25vd25QYXRocyA9IG51bGw7XG5cbiAgICAvLyBtYXBzIGluZGV4IC0+ICh7JycgLT4gdmFsdWV9IG9yIHtwYXRoIC0+IHZhbHVlfSlcbiAgICBjb25zdCB2YWx1ZXNCeUluZGV4QW5kUGF0aCA9IHRoaXMuX3NvcnRTcGVjUGFydHMubWFwKHNwZWMgPT4ge1xuICAgICAgLy8gRXhwYW5kIGFueSBsZWFmIGFycmF5cyB0aGF0IHdlIGZpbmQsIGFuZCBpZ25vcmUgdGhvc2UgYXJyYXlzXG4gICAgICAvLyB0aGVtc2VsdmVzLiAgKFdlIG5ldmVyIHNvcnQgYmFzZWQgb24gYW4gYXJyYXkgaXRzZWxmLilcbiAgICAgIGxldCBicmFuY2hlcyA9IGV4cGFuZEFycmF5c0luQnJhbmNoZXMoc3BlYy5sb29rdXAoZG9jKSwgdHJ1ZSk7XG5cbiAgICAgIC8vIElmIHRoZXJlIGFyZSBubyB2YWx1ZXMgZm9yIGEga2V5IChlZywga2V5IGdvZXMgdG8gYW4gZW1wdHkgYXJyYXkpLFxuICAgICAgLy8gcHJldGVuZCB3ZSBmb3VuZCBvbmUgbnVsbCB2YWx1ZS5cbiAgICAgIGlmICghYnJhbmNoZXMubGVuZ3RoKSB7XG4gICAgICAgIGJyYW5jaGVzID0gW3t2YWx1ZTogbnVsbH1dO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBlbGVtZW50ID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgIGxldCB1c2VkUGF0aHMgPSBmYWxzZTtcblxuICAgICAgYnJhbmNoZXMuZm9yRWFjaChicmFuY2ggPT4ge1xuICAgICAgICBpZiAoIWJyYW5jaC5hcnJheUluZGljZXMpIHtcbiAgICAgICAgICAvLyBJZiB0aGVyZSBhcmUgbm8gYXJyYXkgaW5kaWNlcyBmb3IgYSBicmFuY2gsIHRoZW4gaXQgbXVzdCBiZSB0aGVcbiAgICAgICAgICAvLyBvbmx5IGJyYW5jaCwgYmVjYXVzZSB0aGUgb25seSB0aGluZyB0aGF0IHByb2R1Y2VzIG11bHRpcGxlIGJyYW5jaGVzXG4gICAgICAgICAgLy8gaXMgdGhlIHVzZSBvZiBhcnJheXMuXG4gICAgICAgICAgaWYgKGJyYW5jaGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKCdtdWx0aXBsZSBicmFuY2hlcyBidXQgbm8gYXJyYXkgdXNlZD8nKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBlbGVtZW50WycnXSA9IGJyYW5jaC52YWx1ZTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB1c2VkUGF0aHMgPSB0cnVlO1xuXG4gICAgICAgIGNvbnN0IHBhdGggPSBwYXRoRnJvbUluZGljZXMoYnJhbmNoLmFycmF5SW5kaWNlcyk7XG5cbiAgICAgICAgaWYgKGhhc093bi5jYWxsKGVsZW1lbnQsIHBhdGgpKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoYGR1cGxpY2F0ZSBwYXRoOiAke3BhdGh9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBlbGVtZW50W3BhdGhdID0gYnJhbmNoLnZhbHVlO1xuXG4gICAgICAgIC8vIElmIHR3byBzb3J0IGZpZWxkcyBib3RoIGdvIGludG8gYXJyYXlzLCB0aGV5IGhhdmUgdG8gZ28gaW50byB0aGVcbiAgICAgICAgLy8gZXhhY3Qgc2FtZSBhcnJheXMgYW5kIHdlIGhhdmUgdG8gZmluZCB0aGUgc2FtZSBwYXRocy4gIFRoaXMgaXNcbiAgICAgICAgLy8gcm91Z2hseSB0aGUgc2FtZSBjb25kaXRpb24gdGhhdCBtYWtlcyBNb25nb0RCIHRocm93IHRoaXMgc3RyYW5nZVxuICAgICAgICAvLyBlcnJvciBtZXNzYWdlLiAgZWcsIHRoZSBtYWluIHRoaW5nIGlzIHRoYXQgaWYgc29ydCBzcGVjIGlzIHthOiAxLFxuICAgICAgICAvLyBiOjF9IHRoZW4gYSBhbmQgYiBjYW5ub3QgYm90aCBiZSBhcnJheXMuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIChJbiBNb25nb0RCIGl0IHNlZW1zIHRvIGJlIE9LIHRvIGhhdmUge2E6IDEsICdhLngueSc6IDF9IHdoZXJlICdhJ1xuICAgICAgICAvLyBhbmQgJ2EueC55JyBhcmUgYm90aCBhcnJheXMsIGJ1dCB3ZSBkb24ndCBhbGxvdyB0aGlzIGZvciBub3cuXG4gICAgICAgIC8vICNOZXN0ZWRBcnJheVNvcnRcbiAgICAgICAgLy8gWFhYIGFjaGlldmUgZnVsbCBjb21wYXRpYmlsaXR5IGhlcmVcbiAgICAgICAgaWYgKGtub3duUGF0aHMgJiYgIWhhc093bi5jYWxsKGtub3duUGF0aHMsIHBhdGgpKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoJ2Nhbm5vdCBpbmRleCBwYXJhbGxlbCBhcnJheXMnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmIChrbm93blBhdGhzKSB7XG4gICAgICAgIC8vIFNpbWlsYXJseSB0byBhYm92ZSwgcGF0aHMgbXVzdCBtYXRjaCBldmVyeXdoZXJlLCB1bmxlc3MgdGhpcyBpcyBhXG4gICAgICAgIC8vIG5vbi1hcnJheSBmaWVsZC5cbiAgICAgICAgaWYgKCFoYXNPd24uY2FsbChlbGVtZW50LCAnJykgJiZcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGtub3duUGF0aHMpLmxlbmd0aCAhPT0gT2JqZWN0LmtleXMoZWxlbWVudCkubGVuZ3RoKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoJ2Nhbm5vdCBpbmRleCBwYXJhbGxlbCBhcnJheXMhJyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodXNlZFBhdGhzKSB7XG4gICAgICAgIGtub3duUGF0aHMgPSB7fTtcblxuICAgICAgICBPYmplY3Qua2V5cyhlbGVtZW50KS5mb3JFYWNoKHBhdGggPT4ge1xuICAgICAgICAgIGtub3duUGF0aHNbcGF0aF0gPSB0cnVlO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfSk7XG5cbiAgICBpZiAoIWtub3duUGF0aHMpIHtcbiAgICAgIC8vIEVhc3kgY2FzZTogbm8gdXNlIG9mIGFycmF5cy5cbiAgICAgIGNvbnN0IHNvbGVLZXkgPSB2YWx1ZXNCeUluZGV4QW5kUGF0aC5tYXAodmFsdWVzID0+IHtcbiAgICAgICAgaWYgKCFoYXNPd24uY2FsbCh2YWx1ZXMsICcnKSkge1xuICAgICAgICAgIHRocm93IEVycm9yKCdubyB2YWx1ZSBpbiBzb2xlIGtleSBjYXNlPycpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHZhbHVlc1snJ107XG4gICAgICB9KTtcblxuICAgICAgY2Ioc29sZUtleSk7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBPYmplY3Qua2V5cyhrbm93blBhdGhzKS5mb3JFYWNoKHBhdGggPT4ge1xuICAgICAgY29uc3Qga2V5ID0gdmFsdWVzQnlJbmRleEFuZFBhdGgubWFwKHZhbHVlcyA9PiB7XG4gICAgICAgIGlmIChoYXNPd24uY2FsbCh2YWx1ZXMsICcnKSkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZXNbJyddO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFoYXNPd24uY2FsbCh2YWx1ZXMsIHBhdGgpKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoJ21pc3NpbmcgcGF0aD8nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2YWx1ZXNbcGF0aF07XG4gICAgICB9KTtcblxuICAgICAgY2Ioa2V5KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFJldHVybnMgYSBjb21wYXJhdG9yIHRoYXQgcmVwcmVzZW50cyB0aGUgc29ydCBzcGVjaWZpY2F0aW9uIChidXQgbm90XG4gIC8vIGluY2x1ZGluZyBhIHBvc3NpYmxlIGdlb3F1ZXJ5IGRpc3RhbmNlIHRpZS1icmVha2VyKS5cbiAgX2dldEJhc2VDb21wYXJhdG9yKCkge1xuICAgIGlmICh0aGlzLl9zb3J0RnVuY3Rpb24pIHtcbiAgICAgIHJldHVybiB0aGlzLl9zb3J0RnVuY3Rpb247XG4gICAgfVxuXG4gICAgLy8gSWYgd2UncmUgb25seSBzb3J0aW5nIG9uIGdlb3F1ZXJ5IGRpc3RhbmNlIGFuZCBubyBzcGVjcywganVzdCBzYXlcbiAgICAvLyBldmVyeXRoaW5nIGlzIGVxdWFsLlxuICAgIGlmICghdGhpcy5fc29ydFNwZWNQYXJ0cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiAoZG9jMSwgZG9jMikgPT4gMDtcbiAgICB9XG5cbiAgICByZXR1cm4gKGRvYzEsIGRvYzIpID0+IHtcbiAgICAgIGNvbnN0IGtleTEgPSB0aGlzLl9nZXRNaW5LZXlGcm9tRG9jKGRvYzEpO1xuICAgICAgY29uc3Qga2V5MiA9IHRoaXMuX2dldE1pbktleUZyb21Eb2MoZG9jMik7XG4gICAgICByZXR1cm4gdGhpcy5fY29tcGFyZUtleXMoa2V5MSwga2V5Mik7XG4gICAgfTtcbiAgfVxuXG4gIC8vIEZpbmRzIHRoZSBtaW5pbXVtIGtleSBmcm9tIHRoZSBkb2MsIGFjY29yZGluZyB0byB0aGUgc29ydCBzcGVjcy4gIChXZSBzYXlcbiAgLy8gXCJtaW5pbXVtXCIgaGVyZSBidXQgdGhpcyBpcyB3aXRoIHJlc3BlY3QgdG8gdGhlIHNvcnQgc3BlYywgc28gXCJkZXNjZW5kaW5nXCJcbiAgLy8gc29ydCBmaWVsZHMgbWVhbiB3ZSdyZSBmaW5kaW5nIHRoZSBtYXggZm9yIHRoYXQgZmllbGQuKVxuICAvL1xuICAvLyBOb3RlIHRoYXQgdGhpcyBpcyBOT1QgXCJmaW5kIHRoZSBtaW5pbXVtIHZhbHVlIG9mIHRoZSBmaXJzdCBmaWVsZCwgdGhlXG4gIC8vIG1pbmltdW0gdmFsdWUgb2YgdGhlIHNlY29uZCBmaWVsZCwgZXRjXCIuLi4gaXQncyBcImNob29zZSB0aGVcbiAgLy8gbGV4aWNvZ3JhcGhpY2FsbHkgbWluaW11bSB2YWx1ZSBvZiB0aGUga2V5IHZlY3RvciwgYWxsb3dpbmcgb25seSBrZXlzIHdoaWNoXG4gIC8vIHlvdSBjYW4gZmluZCBhbG9uZyB0aGUgc2FtZSBwYXRoc1wiLiAgaWUsIGZvciBhIGRvYyB7YTogW3t4OiAwLCB5OiA1fSwge3g6XG4gIC8vIDEsIHk6IDN9XX0gd2l0aCBzb3J0IHNwZWMgeydhLngnOiAxLCAnYS55JzogMX0sIHRoZSBvbmx5IGtleXMgYXJlIFswLDVdIGFuZFxuICAvLyBbMSwzXSwgYW5kIHRoZSBtaW5pbXVtIGtleSBpcyBbMCw1XTsgbm90YWJseSwgWzAsM10gaXMgTk9UIGEga2V5LlxuICBfZ2V0TWluS2V5RnJvbURvYyhkb2MpIHtcbiAgICBsZXQgbWluS2V5ID0gbnVsbDtcblxuICAgIHRoaXMuX2dlbmVyYXRlS2V5c0Zyb21Eb2MoZG9jLCBrZXkgPT4ge1xuICAgICAgaWYgKCF0aGlzLl9rZXlDb21wYXRpYmxlV2l0aFNlbGVjdG9yKGtleSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAobWluS2V5ID09PSBudWxsKSB7XG4gICAgICAgIG1pbktleSA9IGtleTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5fY29tcGFyZUtleXMoa2V5LCBtaW5LZXkpIDwgMCkge1xuICAgICAgICBtaW5LZXkgPSBrZXk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBUaGlzIGNvdWxkIGhhcHBlbiBpZiBvdXIga2V5IGZpbHRlciBzb21laG93IGZpbHRlcnMgb3V0IGFsbCB0aGUga2V5cyBldmVuXG4gICAgLy8gdGhvdWdoIHNvbWVob3cgdGhlIHNlbGVjdG9yIG1hdGNoZXMuXG4gICAgaWYgKG1pbktleSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgRXJyb3IoJ3NvcnQgc2VsZWN0b3IgZm91bmQgbm8ga2V5cyBpbiBkb2M/Jyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1pbktleTtcbiAgfVxuXG4gIF9nZXRQYXRocygpIHtcbiAgICByZXR1cm4gdGhpcy5fc29ydFNwZWNQYXJ0cy5tYXAocGFydCA9PiBwYXJ0LnBhdGgpO1xuICB9XG5cbiAgX2tleUNvbXBhdGlibGVXaXRoU2VsZWN0b3Ioa2V5KSB7XG4gICAgcmV0dXJuICF0aGlzLl9rZXlGaWx0ZXIgfHwgdGhpcy5fa2V5RmlsdGVyKGtleSk7XG4gIH1cblxuICAvLyBHaXZlbiBhbiBpbmRleCAnaScsIHJldHVybnMgYSBjb21wYXJhdG9yIHRoYXQgY29tcGFyZXMgdHdvIGtleSBhcnJheXMgYmFzZWRcbiAgLy8gb24gZmllbGQgJ2knLlxuICBfa2V5RmllbGRDb21wYXJhdG9yKGkpIHtcbiAgICBjb25zdCBpbnZlcnQgPSAhdGhpcy5fc29ydFNwZWNQYXJ0c1tpXS5hc2NlbmRpbmc7XG5cbiAgICByZXR1cm4gKGtleTEsIGtleTIpID0+IHtcbiAgICAgIGNvbnN0IGNvbXBhcmUgPSBMb2NhbENvbGxlY3Rpb24uX2YuX2NtcChrZXkxW2ldLCBrZXkyW2ldKTtcbiAgICAgIHJldHVybiBpbnZlcnQgPyAtY29tcGFyZSA6IGNvbXBhcmU7XG4gICAgfTtcbiAgfVxuXG4gIC8vIEluIE1vbmdvREIsIGlmIHlvdSBoYXZlIGRvY3VtZW50c1xuICAvLyAgICB7X2lkOiAneCcsIGE6IFsxLCAxMF19IGFuZFxuICAvLyAgICB7X2lkOiAneScsIGE6IFs1LCAxNV19LFxuICAvLyB0aGVuIEMuZmluZCh7fSwge3NvcnQ6IHthOiAxfX0pIHB1dHMgeCBiZWZvcmUgeSAoMSBjb21lcyBiZWZvcmUgNSkuXG4gIC8vIEJ1dCAgQy5maW5kKHthOiB7JGd0OiAzfX0sIHtzb3J0OiB7YTogMX19KSBwdXRzIHkgYmVmb3JlIHggKDEgZG9lcyBub3RcbiAgLy8gbWF0Y2ggdGhlIHNlbGVjdG9yLCBhbmQgNSBjb21lcyBiZWZvcmUgMTApLlxuICAvL1xuICAvLyBUaGUgd2F5IHRoaXMgd29ya3MgaXMgcHJldHR5IHN1YnRsZSEgIEZvciBleGFtcGxlLCBpZiB0aGUgZG9jdW1lbnRzXG4gIC8vIGFyZSBpbnN0ZWFkIHtfaWQ6ICd4JywgYTogW3t4OiAxfSwge3g6IDEwfV19KSBhbmRcbiAgLy8gICAgICAgICAgICAge19pZDogJ3knLCBhOiBbe3g6IDV9LCB7eDogMTV9XX0pLFxuICAvLyB0aGVuIEMuZmluZCh7J2EueCc6IHskZ3Q6IDN9fSwge3NvcnQ6IHsnYS54JzogMX19KSBhbmRcbiAgLy8gICAgICBDLmZpbmQoe2E6IHskZWxlbU1hdGNoOiB7eDogeyRndDogM319fX0sIHtzb3J0OiB7J2EueCc6IDF9fSlcbiAgLy8gYm90aCBmb2xsb3cgdGhpcyBydWxlICh5IGJlZm9yZSB4KS4gIChpZSwgeW91IGRvIGhhdmUgdG8gYXBwbHkgdGhpc1xuICAvLyB0aHJvdWdoICRlbGVtTWF0Y2guKVxuICAvL1xuICAvLyBTbyBpZiB5b3UgcGFzcyBhIG1hdGNoZXIgdG8gdGhpcyBzb3J0ZXIncyBjb25zdHJ1Y3Rvciwgd2Ugd2lsbCBhdHRlbXB0IHRvXG4gIC8vIHNraXAgc29ydCBrZXlzIHRoYXQgZG9uJ3QgbWF0Y2ggdGhlIHNlbGVjdG9yLiBUaGUgbG9naWMgaGVyZSBpcyBwcmV0dHlcbiAgLy8gc3VidGxlIGFuZCB1bmRvY3VtZW50ZWQ7IHdlJ3ZlIGdvdHRlbiBhcyBjbG9zZSBhcyB3ZSBjYW4gZmlndXJlIG91dCBiYXNlZFxuICAvLyBvbiBvdXIgdW5kZXJzdGFuZGluZyBvZiBNb25nbydzIGJlaGF2aW9yLlxuICBfdXNlV2l0aE1hdGNoZXIobWF0Y2hlcikge1xuICAgIGlmICh0aGlzLl9rZXlGaWx0ZXIpIHtcbiAgICAgIHRocm93IEVycm9yKCdjYWxsZWQgX3VzZVdpdGhNYXRjaGVyIHR3aWNlPycpO1xuICAgIH1cblxuICAgIC8vIElmIHdlIGFyZSBvbmx5IHNvcnRpbmcgYnkgZGlzdGFuY2UsIHRoZW4gd2UncmUgbm90IGdvaW5nIHRvIGJvdGhlciB0b1xuICAgIC8vIGJ1aWxkIGEga2V5IGZpbHRlci5cbiAgICAvLyBYWFggZmlndXJlIG91dCBob3cgZ2VvcXVlcmllcyBpbnRlcmFjdCB3aXRoIHRoaXMgc3R1ZmZcbiAgICBpZiAoIXRoaXMuX3NvcnRTcGVjUGFydHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgc2VsZWN0b3IgPSBtYXRjaGVyLl9zZWxlY3RvcjtcblxuICAgIC8vIElmIHRoZSB1c2VyIGp1c3QgcGFzc2VkIGEgZmFsc2V5IHNlbGVjdG9yIHRvIGZpbmQoKSxcbiAgICAvLyB0aGVuIHdlIGNhbid0IGdldCBhIGtleSBmaWx0ZXIgZnJvbSBpdC5cbiAgICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIHVzZXIganVzdCBwYXNzZWQgYSBsaXRlcmFsIGZ1bmN0aW9uIHRvIGZpbmQoKSwgdGhlbiB3ZSBjYW4ndCBnZXQgYVxuICAgIC8vIGtleSBmaWx0ZXIgZnJvbSBpdC5cbiAgICBpZiAoc2VsZWN0b3IgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbnN0cmFpbnRzQnlQYXRoID0ge307XG5cbiAgICB0aGlzLl9zb3J0U3BlY1BhcnRzLmZvckVhY2goc3BlYyA9PiB7XG4gICAgICBjb25zdHJhaW50c0J5UGF0aFtzcGVjLnBhdGhdID0gW107XG4gICAgfSk7XG5cbiAgICBPYmplY3Qua2V5cyhzZWxlY3RvcikuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgY29uc3Qgc3ViU2VsZWN0b3IgPSBzZWxlY3RvcltrZXldO1xuXG4gICAgICAvLyBYWFggc3VwcG9ydCAkYW5kIGFuZCAkb3JcbiAgICAgIGNvbnN0IGNvbnN0cmFpbnRzID0gY29uc3RyYWludHNCeVBhdGhba2V5XTtcbiAgICAgIGlmICghY29uc3RyYWludHMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBYWFggaXQgbG9va3MgbGlrZSB0aGUgcmVhbCBNb25nb0RCIGltcGxlbWVudGF0aW9uIGlzbid0IFwiZG9lcyB0aGVcbiAgICAgIC8vIHJlZ2V4cCBtYXRjaFwiIGJ1dCBcImRvZXMgdGhlIHZhbHVlIGZhbGwgaW50byBhIHJhbmdlIG5hbWVkIGJ5IHRoZVxuICAgICAgLy8gbGl0ZXJhbCBwcmVmaXggb2YgdGhlIHJlZ2V4cFwiLCBpZSBcImZvb1wiIGluIC9eZm9vKGJhcnxiYXopKy8gIEJ1dFxuICAgICAgLy8gXCJkb2VzIHRoZSByZWdleHAgbWF0Y2hcIiBpcyBhIGdvb2QgYXBwcm94aW1hdGlvbi5cbiAgICAgIGlmIChzdWJTZWxlY3RvciBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICAvLyBBcyBmYXIgYXMgd2UgY2FuIHRlbGwsIHVzaW5nIGVpdGhlciBvZiB0aGUgb3B0aW9ucyB0aGF0IGJvdGggd2UgYW5kXG4gICAgICAgIC8vIE1vbmdvREIgc3VwcG9ydCAoJ2knIGFuZCAnbScpIGRpc2FibGVzIHVzZSBvZiB0aGUga2V5IGZpbHRlci4gVGhpc1xuICAgICAgICAvLyBtYWtlcyBzZW5zZTogTW9uZ29EQiBtb3N0bHkgYXBwZWFycyB0byBiZSBjYWxjdWxhdGluZyByYW5nZXMgb2YgYW5cbiAgICAgICAgLy8gaW5kZXggdG8gdXNlLCB3aGljaCBtZWFucyBpdCBvbmx5IGNhcmVzIGFib3V0IHJlZ2V4cHMgdGhhdCBtYXRjaFxuICAgICAgICAvLyBvbmUgcmFuZ2UgKHdpdGggYSBsaXRlcmFsIHByZWZpeCksIGFuZCBib3RoICdpJyBhbmQgJ20nIHByZXZlbnQgdGhlXG4gICAgICAgIC8vIGxpdGVyYWwgcHJlZml4IG9mIHRoZSByZWdleHAgZnJvbSBhY3R1YWxseSBtZWFuaW5nIG9uZSByYW5nZS5cbiAgICAgICAgaWYgKHN1YlNlbGVjdG9yLmlnbm9yZUNhc2UgfHwgc3ViU2VsZWN0b3IubXVsdGlsaW5lKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3RyYWludHMucHVzaChyZWdleHBFbGVtZW50TWF0Y2hlcihzdWJTZWxlY3RvcikpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChpc09wZXJhdG9yT2JqZWN0KHN1YlNlbGVjdG9yKSkge1xuICAgICAgICBPYmplY3Qua2V5cyhzdWJTZWxlY3RvcikuZm9yRWFjaChvcGVyYXRvciA9PiB7XG4gICAgICAgICAgY29uc3Qgb3BlcmFuZCA9IHN1YlNlbGVjdG9yW29wZXJhdG9yXTtcblxuICAgICAgICAgIGlmIChbJyRsdCcsICckbHRlJywgJyRndCcsICckZ3RlJ10uaW5jbHVkZXMob3BlcmF0b3IpKSB7XG4gICAgICAgICAgICAvLyBYWFggdGhpcyBkZXBlbmRzIG9uIHVzIGtub3dpbmcgdGhhdCB0aGVzZSBvcGVyYXRvcnMgZG9uJ3QgdXNlIGFueVxuICAgICAgICAgICAgLy8gb2YgdGhlIGFyZ3VtZW50cyB0byBjb21waWxlRWxlbWVudFNlbGVjdG9yIG90aGVyIHRoYW4gb3BlcmFuZC5cbiAgICAgICAgICAgIGNvbnN0cmFpbnRzLnB1c2goXG4gICAgICAgICAgICAgIEVMRU1FTlRfT1BFUkFUT1JTW29wZXJhdG9yXS5jb21waWxlRWxlbWVudFNlbGVjdG9yKG9wZXJhbmQpXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFNlZSBjb21tZW50cyBpbiB0aGUgUmVnRXhwIGJsb2NrIGFib3ZlLlxuICAgICAgICAgIGlmIChvcGVyYXRvciA9PT0gJyRyZWdleCcgJiYgIXN1YlNlbGVjdG9yLiRvcHRpb25zKSB7XG4gICAgICAgICAgICBjb25zdHJhaW50cy5wdXNoKFxuICAgICAgICAgICAgICBFTEVNRU5UX09QRVJBVE9SUy4kcmVnZXguY29tcGlsZUVsZW1lbnRTZWxlY3RvcihcbiAgICAgICAgICAgICAgICBvcGVyYW5kLFxuICAgICAgICAgICAgICAgIHN1YlNlbGVjdG9yXG4gICAgICAgICAgICAgIClcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gWFhYIHN1cHBvcnQgeyRleGlzdHM6IHRydWV9LCAkbW9kLCAkdHlwZSwgJGluLCAkZWxlbU1hdGNoXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gT0ssIGl0J3MgYW4gZXF1YWxpdHkgdGhpbmcuXG4gICAgICBjb25zdHJhaW50cy5wdXNoKGVxdWFsaXR5RWxlbWVudE1hdGNoZXIoc3ViU2VsZWN0b3IpKTtcbiAgICB9KTtcblxuICAgIC8vIEl0IGFwcGVhcnMgdGhhdCB0aGUgZmlyc3Qgc29ydCBmaWVsZCBpcyB0cmVhdGVkIGRpZmZlcmVudGx5IGZyb20gdGhlXG4gICAgLy8gb3RoZXJzOyB3ZSBzaG91bGRuJ3QgY3JlYXRlIGEga2V5IGZpbHRlciB1bmxlc3MgdGhlIGZpcnN0IHNvcnQgZmllbGQgaXNcbiAgICAvLyByZXN0cmljdGVkLCB0aG91Z2ggYWZ0ZXIgdGhhdCBwb2ludCB3ZSBjYW4gcmVzdHJpY3QgdGhlIG90aGVyIHNvcnQgZmllbGRzXG4gICAgLy8gb3Igbm90IGFzIHdlIHdpc2guXG4gICAgaWYgKCFjb25zdHJhaW50c0J5UGF0aFt0aGlzLl9zb3J0U3BlY1BhcnRzWzBdLnBhdGhdLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuX2tleUZpbHRlciA9IGtleSA9PlxuICAgICAgdGhpcy5fc29ydFNwZWNQYXJ0cy5ldmVyeSgoc3BlY1BhcnQsIGluZGV4KSA9PlxuICAgICAgICBjb25zdHJhaW50c0J5UGF0aFtzcGVjUGFydC5wYXRoXS5ldmVyeShmbiA9PiBmbihrZXlbaW5kZXhdKSlcbiAgICAgIClcbiAgICA7XG4gIH1cbn1cblxuLy8gR2l2ZW4gYW4gYXJyYXkgb2YgY29tcGFyYXRvcnNcbi8vIChmdW5jdGlvbnMgKGEsYiktPihuZWdhdGl2ZSBvciBwb3NpdGl2ZSBvciB6ZXJvKSksIHJldHVybnMgYSBzaW5nbGVcbi8vIGNvbXBhcmF0b3Igd2hpY2ggdXNlcyBlYWNoIGNvbXBhcmF0b3IgaW4gb3JkZXIgYW5kIHJldHVybnMgdGhlIGZpcnN0XG4vLyBub24temVybyB2YWx1ZS5cbmZ1bmN0aW9uIGNvbXBvc2VDb21wYXJhdG9ycyhjb21wYXJhdG9yQXJyYXkpIHtcbiAgcmV0dXJuIChhLCBiKSA9PiB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb21wYXJhdG9yQXJyYXkubGVuZ3RoOyArK2kpIHtcbiAgICAgIGNvbnN0IGNvbXBhcmUgPSBjb21wYXJhdG9yQXJyYXlbaV0oYSwgYik7XG4gICAgICBpZiAoY29tcGFyZSAhPT0gMCkge1xuICAgICAgICByZXR1cm4gY29tcGFyZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gMDtcbiAgfTtcbn1cbiJdfQ==
