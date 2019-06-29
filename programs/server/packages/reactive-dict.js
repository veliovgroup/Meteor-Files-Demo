(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var EJSON = Package.ejson.EJSON;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var value, ReactiveDict;

var require = meteorInstall({"node_modules":{"meteor":{"reactive-dict":{"migration.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/reactive-dict/migration.js                                                                           //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
module.export({
  ReactiveDict: () => ReactiveDict
});
let ReactiveDict;
module.link("./reactive-dict", {
  ReactiveDict(v) {
    ReactiveDict = v;
  }

}, 0);
const hasOwn = Object.prototype.hasOwnProperty;
ReactiveDict._migratedDictData = {}; // name -> data

ReactiveDict._dictsToMigrate = {}; // name -> ReactiveDict

ReactiveDict._loadMigratedDict = function (dictName) {
  if (hasOwn.call(ReactiveDict._migratedDictData, dictName)) {
    const data = ReactiveDict._migratedDictData[dictName];
    delete ReactiveDict._migratedDictData[dictName];
    return data;
  }

  return null;
};

ReactiveDict._registerDictForMigrate = function (dictName, dict) {
  if (hasOwn.call(ReactiveDict._dictsToMigrate, dictName)) throw new Error("Duplicate ReactiveDict name: " + dictName);
  ReactiveDict._dictsToMigrate[dictName] = dict;
};

if (Meteor.isClient && Package.reload) {
  // Put old migrated data into ReactiveDict._migratedDictData,
  // where it can be accessed by ReactiveDict._loadMigratedDict.
  var migrationData = Package.reload.Reload._migrationData('reactive-dict');

  if (migrationData && migrationData.dicts) ReactiveDict._migratedDictData = migrationData.dicts; // On migration, assemble the data from all the dicts that have been
  // registered.

  Package.reload.Reload._onMigrate('reactive-dict', function () {
    var dictsToMigrate = ReactiveDict._dictsToMigrate;
    var dataToMigrate = {};

    for (var dictName in dictsToMigrate) dataToMigrate[dictName] = dictsToMigrate[dictName]._getMigrationData();

    return [true, {
      dicts: dataToMigrate
    }];
  });
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"reactive-dict.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/reactive-dict/reactive-dict.js                                                                       //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
module.export({
  ReactiveDict: () => ReactiveDict
});
const hasOwn = Object.prototype.hasOwnProperty; // XXX come up with a serialization method which canonicalizes object key
// order, which would allow us to use objects as values for equals.

function stringify(value) {
  if (value === undefined) {
    return 'undefined';
  }

  return EJSON.stringify(value);
}

function parse(serialized) {
  if (serialized === undefined || serialized === 'undefined') {
    return undefined;
  }

  return EJSON.parse(serialized);
}

function changed(v) {
  v && v.changed();
} // XXX COMPAT WITH 0.9.1 : accept migrationData instead of dictName

/**
 * @class
 * @instanceName ReactiveDict
 * @summary Constructor for a ReactiveDict, which represents a reactive dictionary of key/value pairs.
 * @locus Client
 * @param {String} [name] Optional.  When a name is passed, preserves contents across Hot Code Pushes
 * @param {Object} [initialValue] Optional.  The default values for the dictionary
 */


class ReactiveDict {
  constructor(dictName, dictData) {
    // this.keys: key -> value
    this.keys = {};

    if (dictName) {
      // name given; migration will be performed
      if (typeof dictName === 'string') {
        // the normal case, argument is a string name.
        // Only run migration logic on client, it will cause
        // duplicate name errors on server during reloads.
        // _registerDictForMigrate will throw an error on duplicate name.
        Meteor.isClient && ReactiveDict._registerDictForMigrate(dictName, this);

        const migratedData = Meteor.isClient && ReactiveDict._loadMigratedDict(dictName);

        if (migratedData) {
          // Don't stringify migrated data
          this.keys = migratedData;
        } else {
          // Use _setObject to make sure values are stringified
          this._setObject(dictData || {});
        }

        this.name = dictName;
      } else if (typeof dictName === 'object') {
        // back-compat case: dictName is actually migrationData
        // Use _setObject to make sure values are stringified
        this._setObject(dictName);
      } else {
        throw new Error("Invalid ReactiveDict argument: " + dictName);
      }
    } else if (typeof dictData === 'object') {
      this._setObject(dictData);
    }

    this.allDeps = new Tracker.Dependency();
    this.keyDeps = {}; // key -> Dependency

    this.keyValueDeps = {}; // key -> Dependency
  } // set() began as a key/value method, but we are now overloading it
  // to take an object of key/value pairs, similar to backbone
  // http://backbonejs.org/#Model-set

  /**
   * @summary Set a value for a key in the ReactiveDict. Notify any listeners
   * that the value has changed (eg: redraw templates, and rerun any
   * [`Tracker.autorun`](#tracker_autorun) computations, that called
   * [`ReactiveDict.get`](#ReactiveDict_get) on this `key`.)
   * @locus Client
   * @param {String} key The key to set, eg, `selectedItem`
   * @param {EJSONable | undefined} value The new value for `key`
   */


  set(keyOrObject, value) {
    if (typeof keyOrObject === 'object' && value === undefined) {
      // Called as `dict.set({...})`
      this._setObject(keyOrObject);

      return;
    } // the input isn't an object, so it must be a key
    // and we resume with the rest of the function


    const key = keyOrObject;
    value = stringify(value);
    const keyExisted = hasOwn.call(this.keys, key);
    const oldSerializedValue = keyExisted ? this.keys[key] : 'undefined';
    const isNewValue = value !== oldSerializedValue;
    this.keys[key] = value;

    if (isNewValue || !keyExisted) {
      // Using the changed utility function here because this.allDeps might not exist yet,
      // when setting initial data from constructor
      changed(this.allDeps);
    } // Don't trigger changes when setting initial data from constructor,
    // this.KeyDeps is undefined in this case


    if (isNewValue && this.keyDeps) {
      changed(this.keyDeps[key]);

      if (this.keyValueDeps[key]) {
        changed(this.keyValueDeps[key][oldSerializedValue]);
        changed(this.keyValueDeps[key][value]);
      }
    }
  }
  /**
   * @summary Set a value for a key if it hasn't been set before.
   * Otherwise works exactly the same as [`ReactiveDict.set`](#ReactiveDict-set).
   * @locus Client
   * @param {String} key The key to set, eg, `selectedItem`
   * @param {EJSONable | undefined} value The new value for `key`
   */


  setDefault(keyOrObject, value) {
    if (typeof keyOrObject === 'object' && value === undefined) {
      // Called as `dict.setDefault({...})`
      this._setDefaultObject(keyOrObject);

      return;
    } // the input isn't an object, so it must be a key
    // and we resume with the rest of the function


    const key = keyOrObject;

    if (!hasOwn.call(this.keys, key)) {
      this.set(key, value);
    }
  }
  /**
   * @summary Get the value assiciated with a key. If inside a [reactive
   * computation](#reactivity), invalidate the computation the next time the
   * value associated with this key is changed by
   * [`ReactiveDict.set`](#ReactiveDict-set).
   * This returns a clone of the value, so if it's an object or an array,
   * mutating the returned value has no effect on the value stored in the
   * ReactiveDict.
   * @locus Client
   * @param {String} key The key of the element to return
   */


  get(key) {
    this._ensureKey(key);

    this.keyDeps[key].depend();
    return parse(this.keys[key]);
  }
  /**
   * @summary Test if the stored entry for a key is equal to a value. If inside a
   * [reactive computation](#reactivity), invalidate the computation the next
   * time the variable changes to or from the value.
   * @locus Client
   * @param {String} key The name of the session variable to test
   * @param {String | Number | Boolean | null | undefined} value The value to
   * test against
   */


  equals(key, value) {
    // Mongo.ObjectID is in the 'mongo' package
    let ObjectID = null;

    if (Package.mongo) {
      ObjectID = Package.mongo.Mongo.ObjectID;
    } // We don't allow objects (or arrays that might include objects) for
    // .equals, because JSON.stringify doesn't canonicalize object key
    // order. (We can make equals have the right return value by parsing the
    // current value and using EJSON.equals, but we won't have a canonical
    // element of keyValueDeps[key] to store the dependency.) You can still use
    // "EJSON.equals(reactiveDict.get(key), value)".
    //
    // XXX we could allow arrays as long as we recursively check that there
    // are no objects


    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean' && typeof value !== 'undefined' && !(value instanceof Date) && !(ObjectID && value instanceof ObjectID) && value !== null) {
      throw new Error("ReactiveDict.equals: value must be scalar");
    }

    const serializedValue = stringify(value);

    if (Tracker.active) {
      this._ensureKey(key);

      if (!hasOwn.call(this.keyValueDeps[key], serializedValue)) {
        this.keyValueDeps[key][serializedValue] = new Tracker.Dependency();
      }

      var isNew = this.keyValueDeps[key][serializedValue].depend();

      if (isNew) {
        Tracker.onInvalidate(() => {
          // clean up [key][serializedValue] if it's now empty, so we don't
          // use O(n) memory for n = values seen ever
          if (!this.keyValueDeps[key][serializedValue].hasDependents()) {
            delete this.keyValueDeps[key][serializedValue];
          }
        });
      }
    }

    let oldValue = undefined;

    if (hasOwn.call(this.keys, key)) {
      oldValue = parse(this.keys[key]);
    }

    return EJSON.equals(oldValue, value);
  }
  /**
   * @summary Get all key-value pairs as a plain object. If inside a [reactive
   * computation](#reactivity), invalidate the computation the next time the
   * value associated with any key is changed by
   * [`ReactiveDict.set`](#ReactiveDict-set).
   * This returns a clone of each value, so if it's an object or an array,
   * mutating the returned value has no effect on the value stored in the
   * ReactiveDict.
   * @locus Client
   */


  all() {
    this.allDeps.depend();
    let ret = {};
    Object.keys(this.keys).forEach(key => {
      ret[key] = parse(this.keys[key]);
    });
    return ret;
  }
  /**
   * @summary remove all key-value pairs from the ReactiveDict. Notify any
   * listeners that the value has changed (eg: redraw templates, and rerun any
   * [`Tracker.autorun`](#tracker_autorun) computations, that called
   * [`ReactiveDict.get`](#ReactiveDict_get) on this `key`.)
   * @locus Client
   */


  clear() {
    const oldKeys = this.keys;
    this.keys = {};
    this.allDeps.changed();
    Object.keys(oldKeys).forEach(key => {
      changed(this.keyDeps[key]);

      if (this.keyValueDeps[key]) {
        changed(this.keyValueDeps[key][oldKeys[key]]);
        changed(this.keyValueDeps[key]['undefined']);
      }
    });
  }
  /**
   * @summary remove a key-value pair from the ReactiveDict. Notify any listeners
   * that the value has changed (eg: redraw templates, and rerun any
   * [`Tracker.autorun`](#tracker_autorun) computations, that called
   * [`ReactiveDict.get`](#ReactiveDict_get) on this `key`.)
   * @locus Client
   * @param {String} key The key to delete, eg, `selectedItem`
   */


  delete(key) {
    let didRemove = false;

    if (hasOwn.call(this.keys, key)) {
      const oldValue = this.keys[key];
      delete this.keys[key];
      changed(this.keyDeps[key]);

      if (this.keyValueDeps[key]) {
        changed(this.keyValueDeps[key][oldValue]);
        changed(this.keyValueDeps[key]['undefined']);
      }

      this.allDeps.changed();
      didRemove = true;
    }

    return didRemove;
  }
  /**
   * @summary Clear all values from the reactiveDict and prevent it from being
   * migrated on a Hot Code Pushes. Notify any listeners
   * that the value has changed (eg: redraw templates, and rerun any
   * [`Tracker.autorun`](#tracker_autorun) computations, that called
   * [`ReactiveDict.get`](#ReactiveDict_get) on this `key`.)
   * @locus Client
   */


  destroy() {
    this.clear();

    if (this.name && hasOwn.call(ReactiveDict._dictsToMigrate, this.name)) {
      delete ReactiveDict._dictsToMigrate[this.name];
    }
  }

  _setObject(object) {
    Object.keys(object).forEach(key => {
      this.set(key, object[key]);
    });
  }

  _setDefaultObject(object) {
    Object.keys(object).forEach(key => {
      this.setDefault(key, object[key]);
    });
  }

  _ensureKey(key) {
    if (!(key in this.keyDeps)) {
      this.keyDeps[key] = new Tracker.Dependency();
      this.keyValueDeps[key] = {};
    }
  } // Get a JSON value that can be passed to the constructor to
  // create a new ReactiveDict with the same contents as this one


  _getMigrationData() {
    // XXX sanitize and make sure it's JSONible?
    return this.keys;
  }

}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/reactive-dict/migration.js");

/* Exports */
Package._define("reactive-dict", exports, {
  ReactiveDict: ReactiveDict
});

})();

//# sourceURL=meteor://💻app/packages/reactive-dict.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcmVhY3RpdmUtZGljdC9taWdyYXRpb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JlYWN0aXZlLWRpY3QvcmVhY3RpdmUtZGljdC5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJSZWFjdGl2ZURpY3QiLCJsaW5rIiwidiIsImhhc093biIsIk9iamVjdCIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiX21pZ3JhdGVkRGljdERhdGEiLCJfZGljdHNUb01pZ3JhdGUiLCJfbG9hZE1pZ3JhdGVkRGljdCIsImRpY3ROYW1lIiwiY2FsbCIsImRhdGEiLCJfcmVnaXN0ZXJEaWN0Rm9yTWlncmF0ZSIsImRpY3QiLCJFcnJvciIsIk1ldGVvciIsImlzQ2xpZW50IiwiUGFja2FnZSIsInJlbG9hZCIsIm1pZ3JhdGlvbkRhdGEiLCJSZWxvYWQiLCJfbWlncmF0aW9uRGF0YSIsImRpY3RzIiwiX29uTWlncmF0ZSIsImRpY3RzVG9NaWdyYXRlIiwiZGF0YVRvTWlncmF0ZSIsIl9nZXRNaWdyYXRpb25EYXRhIiwic3RyaW5naWZ5IiwidmFsdWUiLCJ1bmRlZmluZWQiLCJFSlNPTiIsInBhcnNlIiwic2VyaWFsaXplZCIsImNoYW5nZWQiLCJjb25zdHJ1Y3RvciIsImRpY3REYXRhIiwia2V5cyIsIm1pZ3JhdGVkRGF0YSIsIl9zZXRPYmplY3QiLCJuYW1lIiwiYWxsRGVwcyIsIlRyYWNrZXIiLCJEZXBlbmRlbmN5Iiwia2V5RGVwcyIsImtleVZhbHVlRGVwcyIsInNldCIsImtleU9yT2JqZWN0Iiwia2V5Iiwia2V5RXhpc3RlZCIsIm9sZFNlcmlhbGl6ZWRWYWx1ZSIsImlzTmV3VmFsdWUiLCJzZXREZWZhdWx0IiwiX3NldERlZmF1bHRPYmplY3QiLCJnZXQiLCJfZW5zdXJlS2V5IiwiZGVwZW5kIiwiZXF1YWxzIiwiT2JqZWN0SUQiLCJtb25nbyIsIk1vbmdvIiwiRGF0ZSIsInNlcmlhbGl6ZWRWYWx1ZSIsImFjdGl2ZSIsImlzTmV3Iiwib25JbnZhbGlkYXRlIiwiaGFzRGVwZW5kZW50cyIsIm9sZFZhbHVlIiwiYWxsIiwicmV0IiwiZm9yRWFjaCIsImNsZWFyIiwib2xkS2V5cyIsImRlbGV0ZSIsImRpZFJlbW92ZSIsImRlc3Ryb3kiLCJvYmplY3QiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsTUFBTSxDQUFDQyxNQUFQLENBQWM7QUFBQ0MsY0FBWSxFQUFDLE1BQUlBO0FBQWxCLENBQWQ7QUFBK0MsSUFBSUEsWUFBSjtBQUFpQkYsTUFBTSxDQUFDRyxJQUFQLENBQVksaUJBQVosRUFBOEI7QUFBQ0QsY0FBWSxDQUFDRSxDQUFELEVBQUc7QUFBQ0YsZ0JBQVksR0FBQ0UsQ0FBYjtBQUFlOztBQUFoQyxDQUE5QixFQUFnRSxDQUFoRTtBQUVoRSxNQUFNQyxNQUFNLEdBQUdDLE1BQU0sQ0FBQ0MsU0FBUCxDQUFpQkMsY0FBaEM7QUFFQU4sWUFBWSxDQUFDTyxpQkFBYixHQUFpQyxFQUFqQyxDLENBQXFDOztBQUNyQ1AsWUFBWSxDQUFDUSxlQUFiLEdBQStCLEVBQS9CLEMsQ0FBbUM7O0FBRW5DUixZQUFZLENBQUNTLGlCQUFiLEdBQWlDLFVBQVVDLFFBQVYsRUFBb0I7QUFDbkQsTUFBSVAsTUFBTSxDQUFDUSxJQUFQLENBQVlYLFlBQVksQ0FBQ08saUJBQXpCLEVBQTRDRyxRQUE1QyxDQUFKLEVBQTJEO0FBQ3pELFVBQU1FLElBQUksR0FBR1osWUFBWSxDQUFDTyxpQkFBYixDQUErQkcsUUFBL0IsQ0FBYjtBQUNBLFdBQU9WLFlBQVksQ0FBQ08saUJBQWIsQ0FBK0JHLFFBQS9CLENBQVA7QUFDQSxXQUFPRSxJQUFQO0FBQ0Q7O0FBRUQsU0FBTyxJQUFQO0FBQ0QsQ0FSRDs7QUFVQVosWUFBWSxDQUFDYSx1QkFBYixHQUF1QyxVQUFVSCxRQUFWLEVBQW9CSSxJQUFwQixFQUEwQjtBQUMvRCxNQUFJWCxNQUFNLENBQUNRLElBQVAsQ0FBWVgsWUFBWSxDQUFDUSxlQUF6QixFQUEwQ0UsUUFBMUMsQ0FBSixFQUNFLE1BQU0sSUFBSUssS0FBSixDQUFVLGtDQUFrQ0wsUUFBNUMsQ0FBTjtBQUVGVixjQUFZLENBQUNRLGVBQWIsQ0FBNkJFLFFBQTdCLElBQXlDSSxJQUF6QztBQUNELENBTEQ7O0FBT0EsSUFBSUUsTUFBTSxDQUFDQyxRQUFQLElBQW1CQyxPQUFPLENBQUNDLE1BQS9CLEVBQXVDO0FBQ3JDO0FBQ0E7QUFDQSxNQUFJQyxhQUFhLEdBQUdGLE9BQU8sQ0FBQ0MsTUFBUixDQUFlRSxNQUFmLENBQXNCQyxjQUF0QixDQUFxQyxlQUFyQyxDQUFwQjs7QUFDQSxNQUFJRixhQUFhLElBQUlBLGFBQWEsQ0FBQ0csS0FBbkMsRUFDRXZCLFlBQVksQ0FBQ08saUJBQWIsR0FBaUNhLGFBQWEsQ0FBQ0csS0FBL0MsQ0FMbUMsQ0FPckM7QUFDQTs7QUFDQUwsU0FBTyxDQUFDQyxNQUFSLENBQWVFLE1BQWYsQ0FBc0JHLFVBQXRCLENBQWlDLGVBQWpDLEVBQWtELFlBQVk7QUFDNUQsUUFBSUMsY0FBYyxHQUFHekIsWUFBWSxDQUFDUSxlQUFsQztBQUNBLFFBQUlrQixhQUFhLEdBQUcsRUFBcEI7O0FBRUEsU0FBSyxJQUFJaEIsUUFBVCxJQUFxQmUsY0FBckIsRUFDRUMsYUFBYSxDQUFDaEIsUUFBRCxDQUFiLEdBQTBCZSxjQUFjLENBQUNmLFFBQUQsQ0FBZCxDQUF5QmlCLGlCQUF6QixFQUExQjs7QUFFRixXQUFPLENBQUMsSUFBRCxFQUFPO0FBQUNKLFdBQUssRUFBRUc7QUFBUixLQUFQLENBQVA7QUFDRCxHQVJEO0FBU0QsQzs7Ozs7Ozs7Ozs7QUMxQ0Q1QixNQUFNLENBQUNDLE1BQVAsQ0FBYztBQUFDQyxjQUFZLEVBQUMsTUFBSUE7QUFBbEIsQ0FBZDtBQUFBLE1BQU1HLE1BQU0sR0FBR0MsTUFBTSxDQUFDQyxTQUFQLENBQWlCQyxjQUFoQyxDLENBRUE7QUFDQTs7QUFDQSxTQUFTc0IsU0FBVCxDQUFtQkMsS0FBbkIsRUFBMEI7QUFDeEIsTUFBSUEsS0FBSyxLQUFLQyxTQUFkLEVBQXlCO0FBQ3ZCLFdBQU8sV0FBUDtBQUNEOztBQUNELFNBQU9DLEtBQUssQ0FBQ0gsU0FBTixDQUFnQkMsS0FBaEIsQ0FBUDtBQUNEOztBQUVELFNBQVNHLEtBQVQsQ0FBZUMsVUFBZixFQUEyQjtBQUN6QixNQUFJQSxVQUFVLEtBQUtILFNBQWYsSUFBNEJHLFVBQVUsS0FBSyxXQUEvQyxFQUE0RDtBQUMxRCxXQUFPSCxTQUFQO0FBQ0Q7O0FBQ0QsU0FBT0MsS0FBSyxDQUFDQyxLQUFOLENBQVlDLFVBQVosQ0FBUDtBQUNEOztBQUVELFNBQVNDLE9BQVQsQ0FBaUJoQyxDQUFqQixFQUFvQjtBQUNsQkEsR0FBQyxJQUFJQSxDQUFDLENBQUNnQyxPQUFGLEVBQUw7QUFDRCxDLENBRUQ7O0FBQ0E7Ozs7Ozs7Ozs7QUFRTyxNQUFNbEMsWUFBTixDQUFtQjtBQUN4Qm1DLGFBQVcsQ0FBQ3pCLFFBQUQsRUFBVzBCLFFBQVgsRUFBcUI7QUFDOUI7QUFDQSxTQUFLQyxJQUFMLEdBQVksRUFBWjs7QUFFQSxRQUFJM0IsUUFBSixFQUFjO0FBQ1o7QUFDQSxVQUFJLE9BQU9BLFFBQVAsS0FBb0IsUUFBeEIsRUFBa0M7QUFDaEM7QUFFQTtBQUNBO0FBQ0E7QUFDQU0sY0FBTSxDQUFDQyxRQUFQLElBQW1CakIsWUFBWSxDQUFDYSx1QkFBYixDQUFxQ0gsUUFBckMsRUFBK0MsSUFBL0MsQ0FBbkI7O0FBQ0EsY0FBTTRCLFlBQVksR0FBR3RCLE1BQU0sQ0FBQ0MsUUFBUCxJQUFtQmpCLFlBQVksQ0FBQ1MsaUJBQWIsQ0FBK0JDLFFBQS9CLENBQXhDOztBQUVBLFlBQUk0QixZQUFKLEVBQWtCO0FBQ2hCO0FBQ0EsZUFBS0QsSUFBTCxHQUFZQyxZQUFaO0FBQ0QsU0FIRCxNQUdPO0FBQ0w7QUFDQSxlQUFLQyxVQUFMLENBQWdCSCxRQUFRLElBQUksRUFBNUI7QUFDRDs7QUFDRCxhQUFLSSxJQUFMLEdBQVk5QixRQUFaO0FBQ0QsT0FqQkQsTUFpQk8sSUFBSSxPQUFPQSxRQUFQLEtBQW9CLFFBQXhCLEVBQWtDO0FBQ3ZDO0FBQ0E7QUFDQSxhQUFLNkIsVUFBTCxDQUFnQjdCLFFBQWhCO0FBQ0QsT0FKTSxNQUlBO0FBQ0wsY0FBTSxJQUFJSyxLQUFKLENBQVUsb0NBQW9DTCxRQUE5QyxDQUFOO0FBQ0Q7QUFDRixLQTFCRCxNQTBCTyxJQUFJLE9BQU8wQixRQUFQLEtBQW9CLFFBQXhCLEVBQWtDO0FBQ3ZDLFdBQUtHLFVBQUwsQ0FBZ0JILFFBQWhCO0FBQ0Q7O0FBRUQsU0FBS0ssT0FBTCxHQUFlLElBQUlDLE9BQU8sQ0FBQ0MsVUFBWixFQUFmO0FBQ0EsU0FBS0MsT0FBTCxHQUFlLEVBQWYsQ0FuQzhCLENBbUNYOztBQUNuQixTQUFLQyxZQUFMLEdBQW9CLEVBQXBCLENBcEM4QixDQW9DTjtBQUN6QixHQXRDdUIsQ0F3Q3hCO0FBQ0E7QUFDQTs7QUFDQTs7Ozs7Ozs7Ozs7QUFTQUMsS0FBRyxDQUFDQyxXQUFELEVBQWNsQixLQUFkLEVBQXFCO0FBQ3RCLFFBQUssT0FBT2tCLFdBQVAsS0FBdUIsUUFBeEIsSUFBc0NsQixLQUFLLEtBQUtDLFNBQXBELEVBQWdFO0FBQzlEO0FBQ0EsV0FBS1MsVUFBTCxDQUFnQlEsV0FBaEI7O0FBQ0E7QUFDRCxLQUxxQixDQU10QjtBQUNBOzs7QUFDQSxVQUFNQyxHQUFHLEdBQUdELFdBQVo7QUFFQWxCLFNBQUssR0FBR0QsU0FBUyxDQUFDQyxLQUFELENBQWpCO0FBRUEsVUFBTW9CLFVBQVUsR0FBRzlDLE1BQU0sQ0FBQ1EsSUFBUCxDQUFZLEtBQUswQixJQUFqQixFQUF1QlcsR0FBdkIsQ0FBbkI7QUFDQSxVQUFNRSxrQkFBa0IsR0FBR0QsVUFBVSxHQUFHLEtBQUtaLElBQUwsQ0FBVVcsR0FBVixDQUFILEdBQW9CLFdBQXpEO0FBQ0EsVUFBTUcsVUFBVSxHQUFJdEIsS0FBSyxLQUFLcUIsa0JBQTlCO0FBRUEsU0FBS2IsSUFBTCxDQUFVVyxHQUFWLElBQWlCbkIsS0FBakI7O0FBRUEsUUFBSXNCLFVBQVUsSUFBSSxDQUFDRixVQUFuQixFQUErQjtBQUM3QjtBQUNBO0FBQ0FmLGFBQU8sQ0FBQyxLQUFLTyxPQUFOLENBQVA7QUFDRCxLQXRCcUIsQ0F3QnRCO0FBQ0E7OztBQUNBLFFBQUlVLFVBQVUsSUFBSSxLQUFLUCxPQUF2QixFQUFnQztBQUM5QlYsYUFBTyxDQUFDLEtBQUtVLE9BQUwsQ0FBYUksR0FBYixDQUFELENBQVA7O0FBQ0EsVUFBSSxLQUFLSCxZQUFMLENBQWtCRyxHQUFsQixDQUFKLEVBQTRCO0FBQzFCZCxlQUFPLENBQUMsS0FBS1csWUFBTCxDQUFrQkcsR0FBbEIsRUFBdUJFLGtCQUF2QixDQUFELENBQVA7QUFDQWhCLGVBQU8sQ0FBQyxLQUFLVyxZQUFMLENBQWtCRyxHQUFsQixFQUF1Qm5CLEtBQXZCLENBQUQsQ0FBUDtBQUNEO0FBQ0Y7QUFDRjtBQUVEOzs7Ozs7Ozs7QUFPQXVCLFlBQVUsQ0FBQ0wsV0FBRCxFQUFjbEIsS0FBZCxFQUFxQjtBQUM3QixRQUFLLE9BQU9rQixXQUFQLEtBQXVCLFFBQXhCLElBQXNDbEIsS0FBSyxLQUFLQyxTQUFwRCxFQUFnRTtBQUM5RDtBQUNBLFdBQUt1QixpQkFBTCxDQUF1Qk4sV0FBdkI7O0FBQ0E7QUFDRCxLQUw0QixDQU03QjtBQUNBOzs7QUFDQSxVQUFNQyxHQUFHLEdBQUdELFdBQVo7O0FBRUEsUUFBSSxDQUFFNUMsTUFBTSxDQUFDUSxJQUFQLENBQVksS0FBSzBCLElBQWpCLEVBQXVCVyxHQUF2QixDQUFOLEVBQW1DO0FBQ2pDLFdBQUtGLEdBQUwsQ0FBU0UsR0FBVCxFQUFjbkIsS0FBZDtBQUNEO0FBQ0Y7QUFFRDs7Ozs7Ozs7Ozs7OztBQVdBeUIsS0FBRyxDQUFDTixHQUFELEVBQU07QUFDUCxTQUFLTyxVQUFMLENBQWdCUCxHQUFoQjs7QUFDQSxTQUFLSixPQUFMLENBQWFJLEdBQWIsRUFBa0JRLE1BQWxCO0FBQ0EsV0FBT3hCLEtBQUssQ0FBQyxLQUFLSyxJQUFMLENBQVVXLEdBQVYsQ0FBRCxDQUFaO0FBQ0Q7QUFFRDs7Ozs7Ozs7Ozs7QUFTQVMsUUFBTSxDQUFDVCxHQUFELEVBQU1uQixLQUFOLEVBQWE7QUFDakI7QUFDQSxRQUFJNkIsUUFBUSxHQUFHLElBQWY7O0FBQ0EsUUFBSXhDLE9BQU8sQ0FBQ3lDLEtBQVosRUFBbUI7QUFDakJELGNBQVEsR0FBR3hDLE9BQU8sQ0FBQ3lDLEtBQVIsQ0FBY0MsS0FBZCxDQUFvQkYsUUFBL0I7QUFDRCxLQUxnQixDQU1qQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBLFFBQUksT0FBTzdCLEtBQVAsS0FBaUIsUUFBakIsSUFDQSxPQUFPQSxLQUFQLEtBQWlCLFFBRGpCLElBRUEsT0FBT0EsS0FBUCxLQUFpQixTQUZqQixJQUdBLE9BQU9BLEtBQVAsS0FBaUIsV0FIakIsSUFJQSxFQUFFQSxLQUFLLFlBQVlnQyxJQUFuQixDQUpBLElBS0EsRUFBRUgsUUFBUSxJQUFJN0IsS0FBSyxZQUFZNkIsUUFBL0IsQ0FMQSxJQU1BN0IsS0FBSyxLQUFLLElBTmQsRUFNb0I7QUFDbEIsWUFBTSxJQUFJZCxLQUFKLENBQVUsMkNBQVYsQ0FBTjtBQUNEOztBQUNELFVBQU0rQyxlQUFlLEdBQUdsQyxTQUFTLENBQUNDLEtBQUQsQ0FBakM7O0FBRUEsUUFBSWEsT0FBTyxDQUFDcUIsTUFBWixFQUFvQjtBQUNsQixXQUFLUixVQUFMLENBQWdCUCxHQUFoQjs7QUFFQSxVQUFJLENBQUU3QyxNQUFNLENBQUNRLElBQVAsQ0FBWSxLQUFLa0MsWUFBTCxDQUFrQkcsR0FBbEIsQ0FBWixFQUFvQ2MsZUFBcEMsQ0FBTixFQUE0RDtBQUMxRCxhQUFLakIsWUFBTCxDQUFrQkcsR0FBbEIsRUFBdUJjLGVBQXZCLElBQTBDLElBQUlwQixPQUFPLENBQUNDLFVBQVosRUFBMUM7QUFDRDs7QUFFRCxVQUFJcUIsS0FBSyxHQUFHLEtBQUtuQixZQUFMLENBQWtCRyxHQUFsQixFQUF1QmMsZUFBdkIsRUFBd0NOLE1BQXhDLEVBQVo7O0FBQ0EsVUFBSVEsS0FBSixFQUFXO0FBQ1R0QixlQUFPLENBQUN1QixZQUFSLENBQXFCLE1BQU07QUFDekI7QUFDQTtBQUNBLGNBQUksQ0FBRSxLQUFLcEIsWUFBTCxDQUFrQkcsR0FBbEIsRUFBdUJjLGVBQXZCLEVBQXdDSSxhQUF4QyxFQUFOLEVBQStEO0FBQzdELG1CQUFPLEtBQUtyQixZQUFMLENBQWtCRyxHQUFsQixFQUF1QmMsZUFBdkIsQ0FBUDtBQUNEO0FBQ0YsU0FORDtBQU9EO0FBQ0Y7O0FBRUQsUUFBSUssUUFBUSxHQUFHckMsU0FBZjs7QUFDQSxRQUFJM0IsTUFBTSxDQUFDUSxJQUFQLENBQVksS0FBSzBCLElBQWpCLEVBQXVCVyxHQUF2QixDQUFKLEVBQWlDO0FBQy9CbUIsY0FBUSxHQUFHbkMsS0FBSyxDQUFDLEtBQUtLLElBQUwsQ0FBVVcsR0FBVixDQUFELENBQWhCO0FBQ0Q7O0FBQ0QsV0FBT2pCLEtBQUssQ0FBQzBCLE1BQU4sQ0FBYVUsUUFBYixFQUF1QnRDLEtBQXZCLENBQVA7QUFDRDtBQUVEOzs7Ozs7Ozs7Ozs7QUFVQXVDLEtBQUcsR0FBRztBQUNKLFNBQUszQixPQUFMLENBQWFlLE1BQWI7QUFDQSxRQUFJYSxHQUFHLEdBQUcsRUFBVjtBQUNBakUsVUFBTSxDQUFDaUMsSUFBUCxDQUFZLEtBQUtBLElBQWpCLEVBQXVCaUMsT0FBdkIsQ0FBK0J0QixHQUFHLElBQUk7QUFDcENxQixTQUFHLENBQUNyQixHQUFELENBQUgsR0FBV2hCLEtBQUssQ0FBQyxLQUFLSyxJQUFMLENBQVVXLEdBQVYsQ0FBRCxDQUFoQjtBQUNELEtBRkQ7QUFHQSxXQUFPcUIsR0FBUDtBQUNEO0FBRUQ7Ozs7Ozs7OztBQU9BRSxPQUFLLEdBQUc7QUFDTixVQUFNQyxPQUFPLEdBQUcsS0FBS25DLElBQXJCO0FBQ0EsU0FBS0EsSUFBTCxHQUFZLEVBQVo7QUFFQSxTQUFLSSxPQUFMLENBQWFQLE9BQWI7QUFFQTlCLFVBQU0sQ0FBQ2lDLElBQVAsQ0FBWW1DLE9BQVosRUFBcUJGLE9BQXJCLENBQTZCdEIsR0FBRyxJQUFJO0FBQ2xDZCxhQUFPLENBQUMsS0FBS1UsT0FBTCxDQUFhSSxHQUFiLENBQUQsQ0FBUDs7QUFDQSxVQUFJLEtBQUtILFlBQUwsQ0FBa0JHLEdBQWxCLENBQUosRUFBNEI7QUFDMUJkLGVBQU8sQ0FBQyxLQUFLVyxZQUFMLENBQWtCRyxHQUFsQixFQUF1QndCLE9BQU8sQ0FBQ3hCLEdBQUQsQ0FBOUIsQ0FBRCxDQUFQO0FBQ0FkLGVBQU8sQ0FBQyxLQUFLVyxZQUFMLENBQWtCRyxHQUFsQixFQUF1QixXQUF2QixDQUFELENBQVA7QUFDRDtBQUNGLEtBTkQ7QUFPRDtBQUVEOzs7Ozs7Ozs7O0FBUUF5QixRQUFNLENBQUN6QixHQUFELEVBQU07QUFDVixRQUFJMEIsU0FBUyxHQUFHLEtBQWhCOztBQUVBLFFBQUl2RSxNQUFNLENBQUNRLElBQVAsQ0FBWSxLQUFLMEIsSUFBakIsRUFBdUJXLEdBQXZCLENBQUosRUFBaUM7QUFDL0IsWUFBTW1CLFFBQVEsR0FBRyxLQUFLOUIsSUFBTCxDQUFVVyxHQUFWLENBQWpCO0FBQ0EsYUFBTyxLQUFLWCxJQUFMLENBQVVXLEdBQVYsQ0FBUDtBQUNBZCxhQUFPLENBQUMsS0FBS1UsT0FBTCxDQUFhSSxHQUFiLENBQUQsQ0FBUDs7QUFDQSxVQUFJLEtBQUtILFlBQUwsQ0FBa0JHLEdBQWxCLENBQUosRUFBNEI7QUFDMUJkLGVBQU8sQ0FBQyxLQUFLVyxZQUFMLENBQWtCRyxHQUFsQixFQUF1Qm1CLFFBQXZCLENBQUQsQ0FBUDtBQUNBakMsZUFBTyxDQUFDLEtBQUtXLFlBQUwsQ0FBa0JHLEdBQWxCLEVBQXVCLFdBQXZCLENBQUQsQ0FBUDtBQUNEOztBQUNELFdBQUtQLE9BQUwsQ0FBYVAsT0FBYjtBQUNBd0MsZUFBUyxHQUFHLElBQVo7QUFDRDs7QUFDRCxXQUFPQSxTQUFQO0FBQ0Q7QUFFRDs7Ozs7Ozs7OztBQVFBQyxTQUFPLEdBQUc7QUFDUixTQUFLSixLQUFMOztBQUNBLFFBQUksS0FBSy9CLElBQUwsSUFBYXJDLE1BQU0sQ0FBQ1EsSUFBUCxDQUFZWCxZQUFZLENBQUNRLGVBQXpCLEVBQTBDLEtBQUtnQyxJQUEvQyxDQUFqQixFQUF1RTtBQUNyRSxhQUFPeEMsWUFBWSxDQUFDUSxlQUFiLENBQTZCLEtBQUtnQyxJQUFsQyxDQUFQO0FBQ0Q7QUFDRjs7QUFFREQsWUFBVSxDQUFDcUMsTUFBRCxFQUFTO0FBQ2pCeEUsVUFBTSxDQUFDaUMsSUFBUCxDQUFZdUMsTUFBWixFQUFvQk4sT0FBcEIsQ0FBNEJ0QixHQUFHLElBQUk7QUFDakMsV0FBS0YsR0FBTCxDQUFTRSxHQUFULEVBQWM0QixNQUFNLENBQUM1QixHQUFELENBQXBCO0FBQ0QsS0FGRDtBQUdEOztBQUVESyxtQkFBaUIsQ0FBQ3VCLE1BQUQsRUFBUztBQUN4QnhFLFVBQU0sQ0FBQ2lDLElBQVAsQ0FBWXVDLE1BQVosRUFBb0JOLE9BQXBCLENBQTRCdEIsR0FBRyxJQUFJO0FBQ2pDLFdBQUtJLFVBQUwsQ0FBZ0JKLEdBQWhCLEVBQXFCNEIsTUFBTSxDQUFDNUIsR0FBRCxDQUEzQjtBQUNELEtBRkQ7QUFHRDs7QUFFRE8sWUFBVSxDQUFDUCxHQUFELEVBQU07QUFDZCxRQUFJLEVBQUVBLEdBQUcsSUFBSSxLQUFLSixPQUFkLENBQUosRUFBNEI7QUFDMUIsV0FBS0EsT0FBTCxDQUFhSSxHQUFiLElBQW9CLElBQUlOLE9BQU8sQ0FBQ0MsVUFBWixFQUFwQjtBQUNBLFdBQUtFLFlBQUwsQ0FBa0JHLEdBQWxCLElBQXlCLEVBQXpCO0FBQ0Q7QUFDRixHQTdSdUIsQ0ErUnhCO0FBQ0E7OztBQUNBckIsbUJBQWlCLEdBQUc7QUFDbEI7QUFDQSxXQUFPLEtBQUtVLElBQVo7QUFDRDs7QUFwU3VCLEMiLCJmaWxlIjoiL3BhY2thZ2VzL3JlYWN0aXZlLWRpY3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSZWFjdGl2ZURpY3QgfSBmcm9tICcuL3JlYWN0aXZlLWRpY3QnO1xuXG5jb25zdCBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG5SZWFjdGl2ZURpY3QuX21pZ3JhdGVkRGljdERhdGEgPSB7fTsgLy8gbmFtZSAtPiBkYXRhXG5SZWFjdGl2ZURpY3QuX2RpY3RzVG9NaWdyYXRlID0ge307IC8vIG5hbWUgLT4gUmVhY3RpdmVEaWN0XG5cblJlYWN0aXZlRGljdC5fbG9hZE1pZ3JhdGVkRGljdCA9IGZ1bmN0aW9uIChkaWN0TmFtZSkge1xuICBpZiAoaGFzT3duLmNhbGwoUmVhY3RpdmVEaWN0Ll9taWdyYXRlZERpY3REYXRhLCBkaWN0TmFtZSkpIHtcbiAgICBjb25zdCBkYXRhID0gUmVhY3RpdmVEaWN0Ll9taWdyYXRlZERpY3REYXRhW2RpY3ROYW1lXTtcbiAgICBkZWxldGUgUmVhY3RpdmVEaWN0Ll9taWdyYXRlZERpY3REYXRhW2RpY3ROYW1lXTtcbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufTtcblxuUmVhY3RpdmVEaWN0Ll9yZWdpc3RlckRpY3RGb3JNaWdyYXRlID0gZnVuY3Rpb24gKGRpY3ROYW1lLCBkaWN0KSB7XG4gIGlmIChoYXNPd24uY2FsbChSZWFjdGl2ZURpY3QuX2RpY3RzVG9NaWdyYXRlLCBkaWN0TmFtZSkpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRHVwbGljYXRlIFJlYWN0aXZlRGljdCBuYW1lOiBcIiArIGRpY3ROYW1lKTtcblxuICBSZWFjdGl2ZURpY3QuX2RpY3RzVG9NaWdyYXRlW2RpY3ROYW1lXSA9IGRpY3Q7XG59O1xuXG5pZiAoTWV0ZW9yLmlzQ2xpZW50ICYmIFBhY2thZ2UucmVsb2FkKSB7XG4gIC8vIFB1dCBvbGQgbWlncmF0ZWQgZGF0YSBpbnRvIFJlYWN0aXZlRGljdC5fbWlncmF0ZWREaWN0RGF0YSxcbiAgLy8gd2hlcmUgaXQgY2FuIGJlIGFjY2Vzc2VkIGJ5IFJlYWN0aXZlRGljdC5fbG9hZE1pZ3JhdGVkRGljdC5cbiAgdmFyIG1pZ3JhdGlvbkRhdGEgPSBQYWNrYWdlLnJlbG9hZC5SZWxvYWQuX21pZ3JhdGlvbkRhdGEoJ3JlYWN0aXZlLWRpY3QnKTtcbiAgaWYgKG1pZ3JhdGlvbkRhdGEgJiYgbWlncmF0aW9uRGF0YS5kaWN0cylcbiAgICBSZWFjdGl2ZURpY3QuX21pZ3JhdGVkRGljdERhdGEgPSBtaWdyYXRpb25EYXRhLmRpY3RzO1xuXG4gIC8vIE9uIG1pZ3JhdGlvbiwgYXNzZW1ibGUgdGhlIGRhdGEgZnJvbSBhbGwgdGhlIGRpY3RzIHRoYXQgaGF2ZSBiZWVuXG4gIC8vIHJlZ2lzdGVyZWQuXG4gIFBhY2thZ2UucmVsb2FkLlJlbG9hZC5fb25NaWdyYXRlKCdyZWFjdGl2ZS1kaWN0JywgZnVuY3Rpb24gKCkge1xuICAgIHZhciBkaWN0c1RvTWlncmF0ZSA9IFJlYWN0aXZlRGljdC5fZGljdHNUb01pZ3JhdGU7XG4gICAgdmFyIGRhdGFUb01pZ3JhdGUgPSB7fTtcblxuICAgIGZvciAodmFyIGRpY3ROYW1lIGluIGRpY3RzVG9NaWdyYXRlKVxuICAgICAgZGF0YVRvTWlncmF0ZVtkaWN0TmFtZV0gPSBkaWN0c1RvTWlncmF0ZVtkaWN0TmFtZV0uX2dldE1pZ3JhdGlvbkRhdGEoKTtcblxuICAgIHJldHVybiBbdHJ1ZSwge2RpY3RzOiBkYXRhVG9NaWdyYXRlfV07XG4gIH0pO1xufVxuXG5leHBvcnQgeyBSZWFjdGl2ZURpY3QgfTtcbiIsImNvbnN0IGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbi8vIFhYWCBjb21lIHVwIHdpdGggYSBzZXJpYWxpemF0aW9uIG1ldGhvZCB3aGljaCBjYW5vbmljYWxpemVzIG9iamVjdCBrZXlcbi8vIG9yZGVyLCB3aGljaCB3b3VsZCBhbGxvdyB1cyB0byB1c2Ugb2JqZWN0cyBhcyB2YWx1ZXMgZm9yIGVxdWFscy5cbmZ1bmN0aW9uIHN0cmluZ2lmeSh2YWx1ZSkge1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiAndW5kZWZpbmVkJztcbiAgfVxuICByZXR1cm4gRUpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gcGFyc2Uoc2VyaWFsaXplZCkge1xuICBpZiAoc2VyaWFsaXplZCA9PT0gdW5kZWZpbmVkIHx8IHNlcmlhbGl6ZWQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICByZXR1cm4gRUpTT04ucGFyc2Uoc2VyaWFsaXplZCk7XG59XG5cbmZ1bmN0aW9uIGNoYW5nZWQodikge1xuICB2ICYmIHYuY2hhbmdlZCgpO1xufVxuXG4vLyBYWFggQ09NUEFUIFdJVEggMC45LjEgOiBhY2NlcHQgbWlncmF0aW9uRGF0YSBpbnN0ZWFkIG9mIGRpY3ROYW1lXG4vKipcbiAqIEBjbGFzc1xuICogQGluc3RhbmNlTmFtZSBSZWFjdGl2ZURpY3RcbiAqIEBzdW1tYXJ5IENvbnN0cnVjdG9yIGZvciBhIFJlYWN0aXZlRGljdCwgd2hpY2ggcmVwcmVzZW50cyBhIHJlYWN0aXZlIGRpY3Rpb25hcnkgb2Yga2V5L3ZhbHVlIHBhaXJzLlxuICogQGxvY3VzIENsaWVudFxuICogQHBhcmFtIHtTdHJpbmd9IFtuYW1lXSBPcHRpb25hbC4gIFdoZW4gYSBuYW1lIGlzIHBhc3NlZCwgcHJlc2VydmVzIGNvbnRlbnRzIGFjcm9zcyBIb3QgQ29kZSBQdXNoZXNcbiAqIEBwYXJhbSB7T2JqZWN0fSBbaW5pdGlhbFZhbHVlXSBPcHRpb25hbC4gIFRoZSBkZWZhdWx0IHZhbHVlcyBmb3IgdGhlIGRpY3Rpb25hcnlcbiAqL1xuZXhwb3J0IGNsYXNzIFJlYWN0aXZlRGljdCB7XG4gIGNvbnN0cnVjdG9yKGRpY3ROYW1lLCBkaWN0RGF0YSkge1xuICAgIC8vIHRoaXMua2V5czoga2V5IC0+IHZhbHVlXG4gICAgdGhpcy5rZXlzID0ge307XG5cbiAgICBpZiAoZGljdE5hbWUpIHtcbiAgICAgIC8vIG5hbWUgZ2l2ZW47IG1pZ3JhdGlvbiB3aWxsIGJlIHBlcmZvcm1lZFxuICAgICAgaWYgKHR5cGVvZiBkaWN0TmFtZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgLy8gdGhlIG5vcm1hbCBjYXNlLCBhcmd1bWVudCBpcyBhIHN0cmluZyBuYW1lLlxuXG4gICAgICAgIC8vIE9ubHkgcnVuIG1pZ3JhdGlvbiBsb2dpYyBvbiBjbGllbnQsIGl0IHdpbGwgY2F1c2VcbiAgICAgICAgLy8gZHVwbGljYXRlIG5hbWUgZXJyb3JzIG9uIHNlcnZlciBkdXJpbmcgcmVsb2Fkcy5cbiAgICAgICAgLy8gX3JlZ2lzdGVyRGljdEZvck1pZ3JhdGUgd2lsbCB0aHJvdyBhbiBlcnJvciBvbiBkdXBsaWNhdGUgbmFtZS5cbiAgICAgICAgTWV0ZW9yLmlzQ2xpZW50ICYmIFJlYWN0aXZlRGljdC5fcmVnaXN0ZXJEaWN0Rm9yTWlncmF0ZShkaWN0TmFtZSwgdGhpcyk7XG4gICAgICAgIGNvbnN0IG1pZ3JhdGVkRGF0YSA9IE1ldGVvci5pc0NsaWVudCAmJiBSZWFjdGl2ZURpY3QuX2xvYWRNaWdyYXRlZERpY3QoZGljdE5hbWUpO1xuXG4gICAgICAgIGlmIChtaWdyYXRlZERhdGEpIHtcbiAgICAgICAgICAvLyBEb24ndCBzdHJpbmdpZnkgbWlncmF0ZWQgZGF0YVxuICAgICAgICAgIHRoaXMua2V5cyA9IG1pZ3JhdGVkRGF0YTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBVc2UgX3NldE9iamVjdCB0byBtYWtlIHN1cmUgdmFsdWVzIGFyZSBzdHJpbmdpZmllZFxuICAgICAgICAgIHRoaXMuX3NldE9iamVjdChkaWN0RGF0YSB8fCB7fSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5uYW1lID0gZGljdE5hbWU7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBkaWN0TmFtZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgLy8gYmFjay1jb21wYXQgY2FzZTogZGljdE5hbWUgaXMgYWN0dWFsbHkgbWlncmF0aW9uRGF0YVxuICAgICAgICAvLyBVc2UgX3NldE9iamVjdCB0byBtYWtlIHN1cmUgdmFsdWVzIGFyZSBzdHJpbmdpZmllZFxuICAgICAgICB0aGlzLl9zZXRPYmplY3QoZGljdE5hbWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBSZWFjdGl2ZURpY3QgYXJndW1lbnQ6IFwiICsgZGljdE5hbWUpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRpY3REYXRhID09PSAnb2JqZWN0Jykge1xuICAgICAgdGhpcy5fc2V0T2JqZWN0KGRpY3REYXRhKTtcbiAgICB9XG5cbiAgICB0aGlzLmFsbERlcHMgPSBuZXcgVHJhY2tlci5EZXBlbmRlbmN5O1xuICAgIHRoaXMua2V5RGVwcyA9IHt9OyAvLyBrZXkgLT4gRGVwZW5kZW5jeVxuICAgIHRoaXMua2V5VmFsdWVEZXBzID0ge307IC8vIGtleSAtPiBEZXBlbmRlbmN5XG4gIH1cblxuICAvLyBzZXQoKSBiZWdhbiBhcyBhIGtleS92YWx1ZSBtZXRob2QsIGJ1dCB3ZSBhcmUgbm93IG92ZXJsb2FkaW5nIGl0XG4gIC8vIHRvIHRha2UgYW4gb2JqZWN0IG9mIGtleS92YWx1ZSBwYWlycywgc2ltaWxhciB0byBiYWNrYm9uZVxuICAvLyBodHRwOi8vYmFja2JvbmVqcy5vcmcvI01vZGVsLXNldFxuICAvKipcbiAgICogQHN1bW1hcnkgU2V0IGEgdmFsdWUgZm9yIGEga2V5IGluIHRoZSBSZWFjdGl2ZURpY3QuIE5vdGlmeSBhbnkgbGlzdGVuZXJzXG4gICAqIHRoYXQgdGhlIHZhbHVlIGhhcyBjaGFuZ2VkIChlZzogcmVkcmF3IHRlbXBsYXRlcywgYW5kIHJlcnVuIGFueVxuICAgKiBbYFRyYWNrZXIuYXV0b3J1bmBdKCN0cmFja2VyX2F1dG9ydW4pIGNvbXB1dGF0aW9ucywgdGhhdCBjYWxsZWRcbiAgICogW2BSZWFjdGl2ZURpY3QuZ2V0YF0oI1JlYWN0aXZlRGljdF9nZXQpIG9uIHRoaXMgYGtleWAuKVxuICAgKiBAbG9jdXMgQ2xpZW50XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgVGhlIGtleSB0byBzZXQsIGVnLCBgc2VsZWN0ZWRJdGVtYFxuICAgKiBAcGFyYW0ge0VKU09OYWJsZSB8IHVuZGVmaW5lZH0gdmFsdWUgVGhlIG5ldyB2YWx1ZSBmb3IgYGtleWBcbiAgICovXG4gIHNldChrZXlPck9iamVjdCwgdmFsdWUpIHtcbiAgICBpZiAoKHR5cGVvZiBrZXlPck9iamVjdCA9PT0gJ29iamVjdCcpICYmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSkge1xuICAgICAgLy8gQ2FsbGVkIGFzIGBkaWN0LnNldCh7Li4ufSlgXG4gICAgICB0aGlzLl9zZXRPYmplY3Qoa2V5T3JPYmplY3QpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyB0aGUgaW5wdXQgaXNuJ3QgYW4gb2JqZWN0LCBzbyBpdCBtdXN0IGJlIGEga2V5XG4gICAgLy8gYW5kIHdlIHJlc3VtZSB3aXRoIHRoZSByZXN0IG9mIHRoZSBmdW5jdGlvblxuICAgIGNvbnN0IGtleSA9IGtleU9yT2JqZWN0O1xuXG4gICAgdmFsdWUgPSBzdHJpbmdpZnkodmFsdWUpO1xuXG4gICAgY29uc3Qga2V5RXhpc3RlZCA9IGhhc093bi5jYWxsKHRoaXMua2V5cywga2V5KTtcbiAgICBjb25zdCBvbGRTZXJpYWxpemVkVmFsdWUgPSBrZXlFeGlzdGVkID8gdGhpcy5rZXlzW2tleV0gOiAndW5kZWZpbmVkJztcbiAgICBjb25zdCBpc05ld1ZhbHVlID0gKHZhbHVlICE9PSBvbGRTZXJpYWxpemVkVmFsdWUpO1xuXG4gICAgdGhpcy5rZXlzW2tleV0gPSB2YWx1ZTtcblxuICAgIGlmIChpc05ld1ZhbHVlIHx8ICFrZXlFeGlzdGVkKSB7XG4gICAgICAvLyBVc2luZyB0aGUgY2hhbmdlZCB1dGlsaXR5IGZ1bmN0aW9uIGhlcmUgYmVjYXVzZSB0aGlzLmFsbERlcHMgbWlnaHQgbm90IGV4aXN0IHlldCxcbiAgICAgIC8vIHdoZW4gc2V0dGluZyBpbml0aWFsIGRhdGEgZnJvbSBjb25zdHJ1Y3RvclxuICAgICAgY2hhbmdlZCh0aGlzLmFsbERlcHMpO1xuICAgIH1cblxuICAgIC8vIERvbid0IHRyaWdnZXIgY2hhbmdlcyB3aGVuIHNldHRpbmcgaW5pdGlhbCBkYXRhIGZyb20gY29uc3RydWN0b3IsXG4gICAgLy8gdGhpcy5LZXlEZXBzIGlzIHVuZGVmaW5lZCBpbiB0aGlzIGNhc2VcbiAgICBpZiAoaXNOZXdWYWx1ZSAmJiB0aGlzLmtleURlcHMpIHtcbiAgICAgIGNoYW5nZWQodGhpcy5rZXlEZXBzW2tleV0pO1xuICAgICAgaWYgKHRoaXMua2V5VmFsdWVEZXBzW2tleV0pIHtcbiAgICAgICAgY2hhbmdlZCh0aGlzLmtleVZhbHVlRGVwc1trZXldW29sZFNlcmlhbGl6ZWRWYWx1ZV0pO1xuICAgICAgICBjaGFuZ2VkKHRoaXMua2V5VmFsdWVEZXBzW2tleV1bdmFsdWVdKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHN1bW1hcnkgU2V0IGEgdmFsdWUgZm9yIGEga2V5IGlmIGl0IGhhc24ndCBiZWVuIHNldCBiZWZvcmUuXG4gICAqIE90aGVyd2lzZSB3b3JrcyBleGFjdGx5IHRoZSBzYW1lIGFzIFtgUmVhY3RpdmVEaWN0LnNldGBdKCNSZWFjdGl2ZURpY3Qtc2V0KS5cbiAgICogQGxvY3VzIENsaWVudFxuICAgKiBAcGFyYW0ge1N0cmluZ30ga2V5IFRoZSBrZXkgdG8gc2V0LCBlZywgYHNlbGVjdGVkSXRlbWBcbiAgICogQHBhcmFtIHtFSlNPTmFibGUgfCB1bmRlZmluZWR9IHZhbHVlIFRoZSBuZXcgdmFsdWUgZm9yIGBrZXlgXG4gICAqL1xuICBzZXREZWZhdWx0KGtleU9yT2JqZWN0LCB2YWx1ZSkge1xuICAgIGlmICgodHlwZW9mIGtleU9yT2JqZWN0ID09PSAnb2JqZWN0JykgJiYgKHZhbHVlID09PSB1bmRlZmluZWQpKSB7XG4gICAgICAvLyBDYWxsZWQgYXMgYGRpY3Quc2V0RGVmYXVsdCh7Li4ufSlgXG4gICAgICB0aGlzLl9zZXREZWZhdWx0T2JqZWN0KGtleU9yT2JqZWN0KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gdGhlIGlucHV0IGlzbid0IGFuIG9iamVjdCwgc28gaXQgbXVzdCBiZSBhIGtleVxuICAgIC8vIGFuZCB3ZSByZXN1bWUgd2l0aCB0aGUgcmVzdCBvZiB0aGUgZnVuY3Rpb25cbiAgICBjb25zdCBrZXkgPSBrZXlPck9iamVjdDtcblxuICAgIGlmICghIGhhc093bi5jYWxsKHRoaXMua2V5cywga2V5KSkge1xuICAgICAgdGhpcy5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEdldCB0aGUgdmFsdWUgYXNzaWNpYXRlZCB3aXRoIGEga2V5LiBJZiBpbnNpZGUgYSBbcmVhY3RpdmVcbiAgICogY29tcHV0YXRpb25dKCNyZWFjdGl2aXR5KSwgaW52YWxpZGF0ZSB0aGUgY29tcHV0YXRpb24gdGhlIG5leHQgdGltZSB0aGVcbiAgICogdmFsdWUgYXNzb2NpYXRlZCB3aXRoIHRoaXMga2V5IGlzIGNoYW5nZWQgYnlcbiAgICogW2BSZWFjdGl2ZURpY3Quc2V0YF0oI1JlYWN0aXZlRGljdC1zZXQpLlxuICAgKiBUaGlzIHJldHVybnMgYSBjbG9uZSBvZiB0aGUgdmFsdWUsIHNvIGlmIGl0J3MgYW4gb2JqZWN0IG9yIGFuIGFycmF5LFxuICAgKiBtdXRhdGluZyB0aGUgcmV0dXJuZWQgdmFsdWUgaGFzIG5vIGVmZmVjdCBvbiB0aGUgdmFsdWUgc3RvcmVkIGluIHRoZVxuICAgKiBSZWFjdGl2ZURpY3QuXG4gICAqIEBsb2N1cyBDbGllbnRcbiAgICogQHBhcmFtIHtTdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBlbGVtZW50IHRvIHJldHVyblxuICAgKi9cbiAgZ2V0KGtleSkge1xuICAgIHRoaXMuX2Vuc3VyZUtleShrZXkpO1xuICAgIHRoaXMua2V5RGVwc1trZXldLmRlcGVuZCgpO1xuICAgIHJldHVybiBwYXJzZSh0aGlzLmtleXNba2V5XSk7XG4gIH1cblxuICAvKipcbiAgICogQHN1bW1hcnkgVGVzdCBpZiB0aGUgc3RvcmVkIGVudHJ5IGZvciBhIGtleSBpcyBlcXVhbCB0byBhIHZhbHVlLiBJZiBpbnNpZGUgYVxuICAgKiBbcmVhY3RpdmUgY29tcHV0YXRpb25dKCNyZWFjdGl2aXR5KSwgaW52YWxpZGF0ZSB0aGUgY29tcHV0YXRpb24gdGhlIG5leHRcbiAgICogdGltZSB0aGUgdmFyaWFibGUgY2hhbmdlcyB0byBvciBmcm9tIHRoZSB2YWx1ZS5cbiAgICogQGxvY3VzIENsaWVudFxuICAgKiBAcGFyYW0ge1N0cmluZ30ga2V5IFRoZSBuYW1lIG9mIHRoZSBzZXNzaW9uIHZhcmlhYmxlIHRvIHRlc3RcbiAgICogQHBhcmFtIHtTdHJpbmcgfCBOdW1iZXIgfCBCb29sZWFuIHwgbnVsbCB8IHVuZGVmaW5lZH0gdmFsdWUgVGhlIHZhbHVlIHRvXG4gICAqIHRlc3QgYWdhaW5zdFxuICAgKi9cbiAgZXF1YWxzKGtleSwgdmFsdWUpIHtcbiAgICAvLyBNb25nby5PYmplY3RJRCBpcyBpbiB0aGUgJ21vbmdvJyBwYWNrYWdlXG4gICAgbGV0IE9iamVjdElEID0gbnVsbDtcbiAgICBpZiAoUGFja2FnZS5tb25nbykge1xuICAgICAgT2JqZWN0SUQgPSBQYWNrYWdlLm1vbmdvLk1vbmdvLk9iamVjdElEO1xuICAgIH1cbiAgICAvLyBXZSBkb24ndCBhbGxvdyBvYmplY3RzIChvciBhcnJheXMgdGhhdCBtaWdodCBpbmNsdWRlIG9iamVjdHMpIGZvclxuICAgIC8vIC5lcXVhbHMsIGJlY2F1c2UgSlNPTi5zdHJpbmdpZnkgZG9lc24ndCBjYW5vbmljYWxpemUgb2JqZWN0IGtleVxuICAgIC8vIG9yZGVyLiAoV2UgY2FuIG1ha2UgZXF1YWxzIGhhdmUgdGhlIHJpZ2h0IHJldHVybiB2YWx1ZSBieSBwYXJzaW5nIHRoZVxuICAgIC8vIGN1cnJlbnQgdmFsdWUgYW5kIHVzaW5nIEVKU09OLmVxdWFscywgYnV0IHdlIHdvbid0IGhhdmUgYSBjYW5vbmljYWxcbiAgICAvLyBlbGVtZW50IG9mIGtleVZhbHVlRGVwc1trZXldIHRvIHN0b3JlIHRoZSBkZXBlbmRlbmN5LikgWW91IGNhbiBzdGlsbCB1c2VcbiAgICAvLyBcIkVKU09OLmVxdWFscyhyZWFjdGl2ZURpY3QuZ2V0KGtleSksIHZhbHVlKVwiLlxuICAgIC8vXG4gICAgLy8gWFhYIHdlIGNvdWxkIGFsbG93IGFycmF5cyBhcyBsb25nIGFzIHdlIHJlY3Vyc2l2ZWx5IGNoZWNrIHRoYXQgdGhlcmVcbiAgICAvLyBhcmUgbm8gb2JqZWN0c1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnICYmXG4gICAgICAgIHR5cGVvZiB2YWx1ZSAhPT0gJ251bWJlcicgJiZcbiAgICAgICAgdHlwZW9mIHZhbHVlICE9PSAnYm9vbGVhbicgJiZcbiAgICAgICAgdHlwZW9mIHZhbHVlICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICAhKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkgJiZcbiAgICAgICAgIShPYmplY3RJRCAmJiB2YWx1ZSBpbnN0YW5jZW9mIE9iamVjdElEKSAmJlxuICAgICAgICB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUmVhY3RpdmVEaWN0LmVxdWFsczogdmFsdWUgbXVzdCBiZSBzY2FsYXJcIik7XG4gICAgfVxuICAgIGNvbnN0IHNlcmlhbGl6ZWRWYWx1ZSA9IHN0cmluZ2lmeSh2YWx1ZSk7XG5cbiAgICBpZiAoVHJhY2tlci5hY3RpdmUpIHtcbiAgICAgIHRoaXMuX2Vuc3VyZUtleShrZXkpO1xuXG4gICAgICBpZiAoISBoYXNPd24uY2FsbCh0aGlzLmtleVZhbHVlRGVwc1trZXldLCBzZXJpYWxpemVkVmFsdWUpKSB7XG4gICAgICAgIHRoaXMua2V5VmFsdWVEZXBzW2tleV1bc2VyaWFsaXplZFZhbHVlXSA9IG5ldyBUcmFja2VyLkRlcGVuZGVuY3k7XG4gICAgICB9XG5cbiAgICAgIHZhciBpc05ldyA9IHRoaXMua2V5VmFsdWVEZXBzW2tleV1bc2VyaWFsaXplZFZhbHVlXS5kZXBlbmQoKTtcbiAgICAgIGlmIChpc05ldykge1xuICAgICAgICBUcmFja2VyLm9uSW52YWxpZGF0ZSgoKSA9PiB7XG4gICAgICAgICAgLy8gY2xlYW4gdXAgW2tleV1bc2VyaWFsaXplZFZhbHVlXSBpZiBpdCdzIG5vdyBlbXB0eSwgc28gd2UgZG9uJ3RcbiAgICAgICAgICAvLyB1c2UgTyhuKSBtZW1vcnkgZm9yIG4gPSB2YWx1ZXMgc2VlbiBldmVyXG4gICAgICAgICAgaWYgKCEgdGhpcy5rZXlWYWx1ZURlcHNba2V5XVtzZXJpYWxpemVkVmFsdWVdLmhhc0RlcGVuZGVudHMoKSkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMua2V5VmFsdWVEZXBzW2tleV1bc2VyaWFsaXplZFZhbHVlXTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBvbGRWYWx1ZSA9IHVuZGVmaW5lZDtcbiAgICBpZiAoaGFzT3duLmNhbGwodGhpcy5rZXlzLCBrZXkpKSB7XG4gICAgICBvbGRWYWx1ZSA9IHBhcnNlKHRoaXMua2V5c1trZXldKTtcbiAgICB9XG4gICAgcmV0dXJuIEVKU09OLmVxdWFscyhvbGRWYWx1ZSwgdmFsdWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEdldCBhbGwga2V5LXZhbHVlIHBhaXJzIGFzIGEgcGxhaW4gb2JqZWN0LiBJZiBpbnNpZGUgYSBbcmVhY3RpdmVcbiAgICogY29tcHV0YXRpb25dKCNyZWFjdGl2aXR5KSwgaW52YWxpZGF0ZSB0aGUgY29tcHV0YXRpb24gdGhlIG5leHQgdGltZSB0aGVcbiAgICogdmFsdWUgYXNzb2NpYXRlZCB3aXRoIGFueSBrZXkgaXMgY2hhbmdlZCBieVxuICAgKiBbYFJlYWN0aXZlRGljdC5zZXRgXSgjUmVhY3RpdmVEaWN0LXNldCkuXG4gICAqIFRoaXMgcmV0dXJucyBhIGNsb25lIG9mIGVhY2ggdmFsdWUsIHNvIGlmIGl0J3MgYW4gb2JqZWN0IG9yIGFuIGFycmF5LFxuICAgKiBtdXRhdGluZyB0aGUgcmV0dXJuZWQgdmFsdWUgaGFzIG5vIGVmZmVjdCBvbiB0aGUgdmFsdWUgc3RvcmVkIGluIHRoZVxuICAgKiBSZWFjdGl2ZURpY3QuXG4gICAqIEBsb2N1cyBDbGllbnRcbiAgICovXG4gIGFsbCgpIHtcbiAgICB0aGlzLmFsbERlcHMuZGVwZW5kKCk7XG4gICAgbGV0IHJldCA9IHt9O1xuICAgIE9iamVjdC5rZXlzKHRoaXMua2V5cykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgcmV0W2tleV0gPSBwYXJzZSh0aGlzLmtleXNba2V5XSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSByZW1vdmUgYWxsIGtleS12YWx1ZSBwYWlycyBmcm9tIHRoZSBSZWFjdGl2ZURpY3QuIE5vdGlmeSBhbnlcbiAgICogbGlzdGVuZXJzIHRoYXQgdGhlIHZhbHVlIGhhcyBjaGFuZ2VkIChlZzogcmVkcmF3IHRlbXBsYXRlcywgYW5kIHJlcnVuIGFueVxuICAgKiBbYFRyYWNrZXIuYXV0b3J1bmBdKCN0cmFja2VyX2F1dG9ydW4pIGNvbXB1dGF0aW9ucywgdGhhdCBjYWxsZWRcbiAgICogW2BSZWFjdGl2ZURpY3QuZ2V0YF0oI1JlYWN0aXZlRGljdF9nZXQpIG9uIHRoaXMgYGtleWAuKVxuICAgKiBAbG9jdXMgQ2xpZW50XG4gICAqL1xuICBjbGVhcigpIHtcbiAgICBjb25zdCBvbGRLZXlzID0gdGhpcy5rZXlzO1xuICAgIHRoaXMua2V5cyA9IHt9O1xuXG4gICAgdGhpcy5hbGxEZXBzLmNoYW5nZWQoKTtcblxuICAgIE9iamVjdC5rZXlzKG9sZEtleXMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIGNoYW5nZWQodGhpcy5rZXlEZXBzW2tleV0pO1xuICAgICAgaWYgKHRoaXMua2V5VmFsdWVEZXBzW2tleV0pIHtcbiAgICAgICAgY2hhbmdlZCh0aGlzLmtleVZhbHVlRGVwc1trZXldW29sZEtleXNba2V5XV0pO1xuICAgICAgICBjaGFuZ2VkKHRoaXMua2V5VmFsdWVEZXBzW2tleV1bJ3VuZGVmaW5lZCddKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSByZW1vdmUgYSBrZXktdmFsdWUgcGFpciBmcm9tIHRoZSBSZWFjdGl2ZURpY3QuIE5vdGlmeSBhbnkgbGlzdGVuZXJzXG4gICAqIHRoYXQgdGhlIHZhbHVlIGhhcyBjaGFuZ2VkIChlZzogcmVkcmF3IHRlbXBsYXRlcywgYW5kIHJlcnVuIGFueVxuICAgKiBbYFRyYWNrZXIuYXV0b3J1bmBdKCN0cmFja2VyX2F1dG9ydW4pIGNvbXB1dGF0aW9ucywgdGhhdCBjYWxsZWRcbiAgICogW2BSZWFjdGl2ZURpY3QuZ2V0YF0oI1JlYWN0aXZlRGljdF9nZXQpIG9uIHRoaXMgYGtleWAuKVxuICAgKiBAbG9jdXMgQ2xpZW50XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgVGhlIGtleSB0byBkZWxldGUsIGVnLCBgc2VsZWN0ZWRJdGVtYFxuICAgKi9cbiAgZGVsZXRlKGtleSkge1xuICAgIGxldCBkaWRSZW1vdmUgPSBmYWxzZTtcblxuICAgIGlmIChoYXNPd24uY2FsbCh0aGlzLmtleXMsIGtleSkpIHtcbiAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGhpcy5rZXlzW2tleV07XG4gICAgICBkZWxldGUgdGhpcy5rZXlzW2tleV07XG4gICAgICBjaGFuZ2VkKHRoaXMua2V5RGVwc1trZXldKTtcbiAgICAgIGlmICh0aGlzLmtleVZhbHVlRGVwc1trZXldKSB7XG4gICAgICAgIGNoYW5nZWQodGhpcy5rZXlWYWx1ZURlcHNba2V5XVtvbGRWYWx1ZV0pO1xuICAgICAgICBjaGFuZ2VkKHRoaXMua2V5VmFsdWVEZXBzW2tleV1bJ3VuZGVmaW5lZCddKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuYWxsRGVwcy5jaGFuZ2VkKCk7XG4gICAgICBkaWRSZW1vdmUgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZGlkUmVtb3ZlO1xuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IENsZWFyIGFsbCB2YWx1ZXMgZnJvbSB0aGUgcmVhY3RpdmVEaWN0IGFuZCBwcmV2ZW50IGl0IGZyb20gYmVpbmdcbiAgICogbWlncmF0ZWQgb24gYSBIb3QgQ29kZSBQdXNoZXMuIE5vdGlmeSBhbnkgbGlzdGVuZXJzXG4gICAqIHRoYXQgdGhlIHZhbHVlIGhhcyBjaGFuZ2VkIChlZzogcmVkcmF3IHRlbXBsYXRlcywgYW5kIHJlcnVuIGFueVxuICAgKiBbYFRyYWNrZXIuYXV0b3J1bmBdKCN0cmFja2VyX2F1dG9ydW4pIGNvbXB1dGF0aW9ucywgdGhhdCBjYWxsZWRcbiAgICogW2BSZWFjdGl2ZURpY3QuZ2V0YF0oI1JlYWN0aXZlRGljdF9nZXQpIG9uIHRoaXMgYGtleWAuKVxuICAgKiBAbG9jdXMgQ2xpZW50XG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuY2xlYXIoKTtcbiAgICBpZiAodGhpcy5uYW1lICYmIGhhc093bi5jYWxsKFJlYWN0aXZlRGljdC5fZGljdHNUb01pZ3JhdGUsIHRoaXMubmFtZSkpIHtcbiAgICAgIGRlbGV0ZSBSZWFjdGl2ZURpY3QuX2RpY3RzVG9NaWdyYXRlW3RoaXMubmFtZV07XG4gICAgfVxuICB9XG5cbiAgX3NldE9iamVjdChvYmplY3QpIHtcbiAgICBPYmplY3Qua2V5cyhvYmplY3QpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIHRoaXMuc2V0KGtleSwgb2JqZWN0W2tleV0pO1xuICAgIH0pO1xuICB9XG5cbiAgX3NldERlZmF1bHRPYmplY3Qob2JqZWN0KSB7XG4gICAgT2JqZWN0LmtleXMob2JqZWN0KS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICB0aGlzLnNldERlZmF1bHQoa2V5LCBvYmplY3Rba2V5XSk7XG4gICAgfSk7XG4gIH1cblxuICBfZW5zdXJlS2V5KGtleSkge1xuICAgIGlmICghKGtleSBpbiB0aGlzLmtleURlcHMpKSB7XG4gICAgICB0aGlzLmtleURlcHNba2V5XSA9IG5ldyBUcmFja2VyLkRlcGVuZGVuY3k7XG4gICAgICB0aGlzLmtleVZhbHVlRGVwc1trZXldID0ge307XG4gICAgfVxuICB9XG5cbiAgLy8gR2V0IGEgSlNPTiB2YWx1ZSB0aGF0IGNhbiBiZSBwYXNzZWQgdG8gdGhlIGNvbnN0cnVjdG9yIHRvXG4gIC8vIGNyZWF0ZSBhIG5ldyBSZWFjdGl2ZURpY3Qgd2l0aCB0aGUgc2FtZSBjb250ZW50cyBhcyB0aGlzIG9uZVxuICBfZ2V0TWlncmF0aW9uRGF0YSgpIHtcbiAgICAvLyBYWFggc2FuaXRpemUgYW5kIG1ha2Ugc3VyZSBpdCdzIEpTT05pYmxlP1xuICAgIHJldHVybiB0aGlzLmtleXM7XG4gIH1cbn1cbiJdfQ==
