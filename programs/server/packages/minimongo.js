(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var _ = Package.underscore._;
var EJSON = Package.ejson.EJSON;
var IdMap = Package['id-map'].IdMap;
var OrderedDict = Package['ordered-dict'].OrderedDict;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var MongoID = Package['mongo-id'].MongoID;
var Random = Package.random.Random;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var ECMAScript = Package.ecmascript.ECMAScript;
var GeoJSON = Package['geojson-utils'].GeoJSON;
var meteorInstall = Package.modules.meteorInstall;
var Buffer = Package.modules.Buffer;
var process = Package.modules.process;
var Symbol = Package['ecmascript-runtime'].Symbol;
var Map = Package['ecmascript-runtime'].Map;
var Set = Package['ecmascript-runtime'].Set;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var LocalCollection, Minimongo, MinimongoTest, MinimongoError, isArray, isPlainObject, isIndexable, isOperatorObject, isNumericKey, regexpElementMatcher, equalityElementMatcher, ELEMENT_OPERATORS, makeLookupFunction, expandArraysInBranches, projectionDetails, pathsToTree, combineImportantPathsIntoProjection;

var require = meteorInstall({"node_modules":{"meteor":{"minimongo":{"minimongo.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/minimongo.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// XXX type checking on selectors (graceful error if malformed)                                                        // 1
// LocalCollection: a set of documents that supports queries and modifiers.                                            // 3
// Cursor: a specification for a particular subset of documents, w/                                                    // 5
// a defined order, limit, and offset.  creating a Cursor with LocalCollection.find(),                                 // 6
// ObserveHandle: the return value of a live query.                                                                    // 8
LocalCollection = function (name) {                                                                                    // 10
  var self = this;                                                                                                     // 11
  self.name = name; // _id -> document (also containing id)                                                            // 12
                                                                                                                       //
  self._docs = new LocalCollection._IdMap();                                                                           // 14
  self._observeQueue = new Meteor._SynchronousQueue();                                                                 // 16
  self.next_qid = 1; // live query id generator                                                                        // 18
  // qid -> live query object. keys:                                                                                   // 20
  //  ordered: bool. ordered queries have addedBefore/movedBefore callbacks.                                           // 21
  //  results: array (ordered) or object (unordered) of current results                                                // 22
  //    (aliased with self._docs!)                                                                                     // 23
  //  resultsSnapshot: snapshot of results. null if not paused.                                                        // 24
  //  cursor: Cursor object for the query.                                                                             // 25
  //  selector, sorter, (callbacks): functions                                                                         // 26
                                                                                                                       //
  self.queries = {}; // null if not saving originals; an IdMap from id to original document value if                   // 27
  // saving originals. See comments before saveOriginals().                                                            // 30
                                                                                                                       //
  self._savedOriginals = null; // True when observers are paused and we should not send callbacks.                     // 31
                                                                                                                       //
  self.paused = false;                                                                                                 // 34
};                                                                                                                     // 35
                                                                                                                       //
Minimongo = {}; // Object exported only for unit testing.                                                              // 37
// Use it to export private functions to test in Tinytest.                                                             // 40
                                                                                                                       //
MinimongoTest = {};                                                                                                    // 41
                                                                                                                       //
MinimongoError = function (message) {                                                                                  // 43
  var e = new Error(message);                                                                                          // 44
  e.name = "MinimongoError";                                                                                           // 45
  return e;                                                                                                            // 46
}; // options may include sort, skip, limit, reactive                                                                  // 47
// sort may be any of these forms:                                                                                     // 51
//     {a: 1, b: -1}                                                                                                   // 52
//     [["a", "asc"], ["b", "desc"]]                                                                                   // 53
//     ["a", ["b", "desc"]]                                                                                            // 54
//   (in the first form you're beholden to key enumeration order in                                                    // 55
//   your javascript VM)                                                                                               // 56
//                                                                                                                     // 57
// reactive: if given, and false, don't register with Tracker (default                                                 // 58
// is true)                                                                                                            // 59
//                                                                                                                     // 60
// XXX possibly should support retrieving a subset of fields? and                                                      // 61
// have it be a hint (ignored on the client, when not copying the                                                      // 62
// doc?)                                                                                                               // 63
//                                                                                                                     // 64
// XXX sort does not yet support subkeys ('a.b') .. fix that!                                                          // 65
// XXX add one more sort form: "key"                                                                                   // 66
// XXX tests                                                                                                           // 67
                                                                                                                       //
                                                                                                                       //
LocalCollection.prototype.find = function (selector, options) {                                                        // 68
  // default syntax for everything is to omit the selector argument.                                                   // 69
  // but if selector is explicitly passed in as false or undefined, we                                                 // 70
  // want a selector that matches nothing.                                                                             // 71
  if (arguments.length === 0) selector = {};                                                                           // 72
  return new LocalCollection.Cursor(this, selector, options);                                                          // 75
}; // don't call this ctor directly.  use LocalCollection.find().                                                      // 76
                                                                                                                       //
                                                                                                                       //
LocalCollection.Cursor = function (collection, selector, options) {                                                    // 80
  var self = this;                                                                                                     // 81
  if (!options) options = {};                                                                                          // 82
  self.collection = collection;                                                                                        // 84
  self.sorter = null;                                                                                                  // 85
  self.matcher = new Minimongo.Matcher(selector);                                                                      // 86
                                                                                                                       //
  if (LocalCollection._selectorIsId(selector)) {                                                                       // 88
    // stash for fast path                                                                                             // 89
    self._selectorId = selector;                                                                                       // 90
  } else if (LocalCollection._selectorIsIdPerhapsAsObject(selector)) {                                                 // 91
    // also do the fast path for { _id: idString }                                                                     // 92
    self._selectorId = selector._id;                                                                                   // 93
  } else {                                                                                                             // 94
    self._selectorId = undefined;                                                                                      // 95
                                                                                                                       //
    if (self.matcher.hasGeoQuery() || options.sort) {                                                                  // 96
      self.sorter = new Minimongo.Sorter(options.sort || [], {                                                         // 97
        matcher: self.matcher                                                                                          // 98
      });                                                                                                              // 98
    }                                                                                                                  // 99
  }                                                                                                                    // 100
                                                                                                                       //
  self.skip = options.skip;                                                                                            // 102
  self.limit = options.limit;                                                                                          // 103
  self.fields = options.fields;                                                                                        // 104
  self._projectionFn = LocalCollection._compileProjection(self.fields || {});                                          // 106
  self._transform = LocalCollection.wrapTransform(options.transform); // by default, queries register w/ Tracker when it is available.
                                                                                                                       //
  if (typeof Tracker !== "undefined") self.reactive = options.reactive === undefined ? true : options.reactive;        // 111
}; // Since we don't actually have a "nextObject" interface, there's really no                                         // 113
// reason to have a "rewind" interface.  All it did was make multiple calls                                            // 116
// to fetch/map/forEach return nothing the second time.                                                                // 117
// XXX COMPAT WITH 0.8.1                                                                                               // 118
                                                                                                                       //
                                                                                                                       //
LocalCollection.Cursor.prototype.rewind = function () {};                                                              // 119
                                                                                                                       //
LocalCollection.prototype.findOne = function (selector, options) {                                                     // 122
  if (arguments.length === 0) selector = {}; // NOTE: by setting limit 1 here, we end up using very inefficient        // 123
  // code that recomputes the whole query on each update. The upside is                                                // 127
  // that when you reactively depend on a findOne you only get                                                         // 128
  // invalidated when the found object changes, not any object in the                                                  // 129
  // collection. Most findOne will be by id, which has a fast path, so                                                 // 130
  // this might not be a big deal. In most cases, invalidation causes                                                  // 131
  // the called to re-query anyway, so this should be a net performance                                                // 132
  // improvement.                                                                                                      // 133
                                                                                                                       //
  options = options || {};                                                                                             // 134
  options.limit = 1;                                                                                                   // 135
  return this.find(selector, options).fetch()[0];                                                                      // 137
}; /**                                                                                                                 // 138
    * @callback IterationCallback                                                                                      //
    * @param {Object} doc                                                                                              //
    * @param {Number} index                                                                                            //
    */ /**                                                                                                             //
        * @summary Call `callback` once for each matching document, sequentially and synchronously.                    //
        * @locus Anywhere                                                                                              //
        * @method  forEach                                                                                             //
        * @instance                                                                                                    //
        * @memberOf Mongo.Cursor                                                                                       //
        * @param {IterationCallback} callback Function to call. It will be called with three arguments: the document, a 0-based index, and <em>cursor</em> itself.
        * @param {Any} [thisArg] An object which will be the value of `this` inside `callback`.                        //
        */                                                                                                             //
                                                                                                                       //
LocalCollection.Cursor.prototype.forEach = function (callback, thisArg) {                                              // 154
  var self = this;                                                                                                     // 155
                                                                                                                       //
  var objects = self._getRawObjects({                                                                                  // 157
    ordered: true                                                                                                      // 157
  });                                                                                                                  // 157
                                                                                                                       //
  if (self.reactive) {                                                                                                 // 159
    self._depend({                                                                                                     // 160
      addedBefore: true,                                                                                               // 161
      removed: true,                                                                                                   // 162
      changed: true,                                                                                                   // 163
      movedBefore: true                                                                                                // 164
    });                                                                                                                // 160
  }                                                                                                                    // 165
                                                                                                                       //
  _.each(objects, function (elt, i) {                                                                                  // 167
    // This doubles as a clone operation.                                                                              // 168
    elt = self._projectionFn(elt);                                                                                     // 169
    if (self._transform) elt = self._transform(elt);                                                                   // 171
    callback.call(thisArg, elt, i, self);                                                                              // 173
  });                                                                                                                  // 174
};                                                                                                                     // 175
                                                                                                                       //
LocalCollection.Cursor.prototype.getTransform = function () {                                                          // 177
  return this._transform;                                                                                              // 178
}; /**                                                                                                                 // 179
    * @summary Map callback over all matching documents.  Returns an Array.                                            //
    * @locus Anywhere                                                                                                  //
    * @method map                                                                                                      //
    * @instance                                                                                                        //
    * @memberOf Mongo.Cursor                                                                                           //
    * @param {IterationCallback} callback Function to call. It will be called with three arguments: the document, a 0-based index, and <em>cursor</em> itself.
    * @param {Any} [thisArg] An object which will be the value of `this` inside `callback`.                            //
    */                                                                                                                 //
                                                                                                                       //
LocalCollection.Cursor.prototype.map = function (callback, thisArg) {                                                  // 190
  var self = this;                                                                                                     // 191
  var res = [];                                                                                                        // 192
  self.forEach(function (doc, index) {                                                                                 // 193
    res.push(callback.call(thisArg, doc, index, self));                                                                // 194
  });                                                                                                                  // 195
  return res;                                                                                                          // 196
}; /**                                                                                                                 // 197
    * @summary Return all matching documents as an Array.                                                              //
    * @memberOf Mongo.Cursor                                                                                           //
    * @method  fetch                                                                                                   //
    * @instance                                                                                                        //
    * @locus Anywhere                                                                                                  //
    * @returns {Object[]}                                                                                              //
    */                                                                                                                 //
                                                                                                                       //
LocalCollection.Cursor.prototype.fetch = function () {                                                                 // 207
  var self = this;                                                                                                     // 208
  var res = [];                                                                                                        // 209
  self.forEach(function (doc) {                                                                                        // 210
    res.push(doc);                                                                                                     // 211
  });                                                                                                                  // 212
  return res;                                                                                                          // 213
}; /**                                                                                                                 // 214
    * @summary Returns the number of documents that match a query.                                                     //
    * @memberOf Mongo.Cursor                                                                                           //
    * @method  count                                                                                                   //
    * @instance                                                                                                        //
    * @locus Anywhere                                                                                                  //
    * @returns {Number}                                                                                                //
    */                                                                                                                 //
                                                                                                                       //
LocalCollection.Cursor.prototype.count = function () {                                                                 // 224
  var self = this;                                                                                                     // 225
  if (self.reactive) self._depend({                                                                                    // 227
    added: true,                                                                                                       // 228
    removed: true                                                                                                      // 228
  }, true /* allow the observe to be unordered */);                                                                    // 228
  return self._getRawObjects({                                                                                         // 231
    ordered: true                                                                                                      // 231
  }).length;                                                                                                           // 231
};                                                                                                                     // 232
                                                                                                                       //
LocalCollection.Cursor.prototype._publishCursor = function (sub) {                                                     // 234
  var self = this;                                                                                                     // 235
  if (!self.collection.name) throw new Error("Can't publish a cursor from a collection without a name.");              // 236
  var collection = self.collection.name; // XXX minimongo should not depend on mongo-livedata!                         // 238
                                                                                                                       //
  if (!Package.mongo) {                                                                                                // 241
    throw new Error("Can't publish from Minimongo without the `mongo` package.");                                      // 242
  }                                                                                                                    // 243
                                                                                                                       //
  return Package.mongo.Mongo.Collection._publishCursor(self, sub, collection);                                         // 245
};                                                                                                                     // 246
                                                                                                                       //
LocalCollection.Cursor.prototype._getCollectionName = function () {                                                    // 248
  var self = this;                                                                                                     // 249
  return self.collection.name;                                                                                         // 250
};                                                                                                                     // 251
                                                                                                                       //
LocalCollection._observeChangesCallbacksAreOrdered = function (callbacks) {                                            // 253
  if (callbacks.added && callbacks.addedBefore) throw new Error("Please specify only one of added() and addedBefore()");
  return !!(callbacks.addedBefore || callbacks.movedBefore);                                                           // 256
};                                                                                                                     // 257
                                                                                                                       //
LocalCollection._observeCallbacksAreOrdered = function (callbacks) {                                                   // 259
  if (callbacks.addedAt && callbacks.added) throw new Error("Please specify only one of added() and addedAt()");       // 260
  if (callbacks.changedAt && callbacks.changed) throw new Error("Please specify only one of changed() and changedAt()");
  if (callbacks.removed && callbacks.removedAt) throw new Error("Please specify only one of removed() and removedAt()");
  return !!(callbacks.addedAt || callbacks.movedTo || callbacks.changedAt || callbacks.removedAt);                     // 267
}; // the handle that comes back from observe.                                                                         // 269
                                                                                                                       //
                                                                                                                       //
LocalCollection.ObserveHandle = function () {}; // options to contain:                                                 // 272
//  * callbacks for observe():                                                                                         // 275
//    - addedAt (document, atIndex)                                                                                    // 276
//    - added (document)                                                                                               // 277
//    - changedAt (newDocument, oldDocument, atIndex)                                                                  // 278
//    - changed (newDocument, oldDocument)                                                                             // 279
//    - removedAt (document, atIndex)                                                                                  // 280
//    - removed (document)                                                                                             // 281
//    - movedTo (document, oldIndex, newIndex)                                                                         // 282
//                                                                                                                     // 283
// attributes available on returned query handle:                                                                      // 284
//  * stop(): end updates                                                                                              // 285
//  * collection: the collection this query is querying                                                                // 286
//                                                                                                                     // 287
// iff x is a returned query handle, (x instanceof                                                                     // 288
// LocalCollection.ObserveHandle) is true                                                                              // 289
//                                                                                                                     // 290
// initial results delivered through added callback                                                                    // 291
// XXX maybe callbacks should take a list of objects, to expose transactions?                                          // 292
// XXX maybe support field limiting (to limit what you're notified on)                                                 // 293
                                                                                                                       //
                                                                                                                       //
_.extend(LocalCollection.Cursor.prototype, {                                                                           // 295
  /**                                                                                                                  // 296
   * @summary Watch a query.  Receive callbacks as the result set changes.                                             //
   * @locus Anywhere                                                                                                   //
   * @memberOf Mongo.Cursor                                                                                            //
   * @instance                                                                                                         //
   * @param {Object} callbacks Functions to call to deliver the result set as it changes                               //
   */observe: function (options) {                                                                                     //
    var self = this;                                                                                                   // 304
    return LocalCollection._observeFromObserveChanges(self, options);                                                  // 305
  },                                                                                                                   // 306
  /**                                                                                                                  // 308
   * @summary Watch a query.  Receive callbacks as the result set changes.  Only the differences between the old and new documents are passed to the callbacks.
   * @locus Anywhere                                                                                                   //
   * @memberOf Mongo.Cursor                                                                                            //
   * @instance                                                                                                         //
   * @param {Object} callbacks Functions to call to deliver the result set as it changes                               //
   */observeChanges: function (options) {                                                                              //
    var self = this;                                                                                                   // 316
                                                                                                                       //
    var ordered = LocalCollection._observeChangesCallbacksAreOrdered(options); // there are several places that assume you aren't combining skip/limit with
    // unordered observe.  eg, update's EJSON.clone, and the "there are several"                                       // 321
    // comment in _modifyAndNotify                                                                                     // 322
    // XXX allow skip/limit with unordered observe                                                                     // 323
                                                                                                                       //
                                                                                                                       //
    if (!options._allow_unordered && !ordered && (self.skip || self.limit)) throw new Error("must use ordered observe (ie, 'addedBefore' instead of 'added') with skip or limit");
    if (self.fields && (self.fields._id === 0 || self.fields._id === false)) throw Error("You may not observe a cursor with {fields: {_id: 0}}");
    var query = {                                                                                                      // 330
      dirty: false,                                                                                                    // 331
      matcher: self.matcher,                                                                                           // 332
      // not fast pathed                                                                                               // 332
      sorter: ordered && self.sorter,                                                                                  // 333
      distances: self.matcher.hasGeoQuery() && ordered && new LocalCollection._IdMap(),                                // 334
      resultsSnapshot: null,                                                                                           // 336
      ordered: ordered,                                                                                                // 337
      cursor: self,                                                                                                    // 338
      projectionFn: self._projectionFn                                                                                 // 339
    };                                                                                                                 // 330
    var qid; // Non-reactive queries call added[Before] and then never call anything                                   // 341
    // else.                                                                                                           // 344
                                                                                                                       //
    if (self.reactive) {                                                                                               // 345
      qid = self.collection.next_qid++;                                                                                // 346
      self.collection.queries[qid] = query;                                                                            // 347
    }                                                                                                                  // 348
                                                                                                                       //
    query.results = self._getRawObjects({                                                                              // 349
      ordered: ordered,                                                                                                // 350
      distances: query.distances                                                                                       // 350
    });                                                                                                                // 349
    if (self.collection.paused) query.resultsSnapshot = ordered ? [] : new LocalCollection._IdMap(); // wrap callbacks we were passed. callbacks only fire when not paused and
    // are never undefined                                                                                             // 355
    // Filters out blacklisted fields according to cursor's projection.                                                // 356
    // XXX wrong place for this?                                                                                       // 357
    // furthermore, callbacks enqueue until the operation we're working on is                                          // 359
    // done.                                                                                                           // 360
                                                                                                                       //
    var wrapCallback = function (f) {                                                                                  // 361
      if (!f) return function () {};                                                                                   // 362
      return function () /*args*/{                                                                                     // 364
        var context = this;                                                                                            // 365
        var args = arguments;                                                                                          // 366
        if (self.collection.paused) return;                                                                            // 368
                                                                                                                       //
        self.collection._observeQueue.queueTask(function () {                                                          // 371
          f.apply(context, args);                                                                                      // 372
        });                                                                                                            // 373
      };                                                                                                               // 374
    };                                                                                                                 // 375
                                                                                                                       //
    query.added = wrapCallback(options.added);                                                                         // 376
    query.changed = wrapCallback(options.changed);                                                                     // 377
    query.removed = wrapCallback(options.removed);                                                                     // 378
                                                                                                                       //
    if (ordered) {                                                                                                     // 379
      query.addedBefore = wrapCallback(options.addedBefore);                                                           // 380
      query.movedBefore = wrapCallback(options.movedBefore);                                                           // 381
    }                                                                                                                  // 382
                                                                                                                       //
    if (!options._suppress_initial && !self.collection.paused) {                                                       // 384
      // XXX unify ordered and unordered interface                                                                     // 385
      var each = ordered ? _.bind(_.each, null, query.results) : _.bind(query.results.forEach, query.results);         // 386
      each(function (doc) {                                                                                            // 389
        var fields = EJSON.clone(doc);                                                                                 // 390
        delete fields._id;                                                                                             // 392
        if (ordered) query.addedBefore(doc._id, self._projectionFn(fields), null);                                     // 393
        query.added(doc._id, self._projectionFn(fields));                                                              // 395
      });                                                                                                              // 396
    }                                                                                                                  // 397
                                                                                                                       //
    var handle = new LocalCollection.ObserveHandle();                                                                  // 399
                                                                                                                       //
    _.extend(handle, {                                                                                                 // 400
      collection: self.collection,                                                                                     // 401
      stop: function () {                                                                                              // 402
        if (self.reactive) delete self.collection.queries[qid];                                                        // 403
      }                                                                                                                // 405
    });                                                                                                                // 400
                                                                                                                       //
    if (self.reactive && Tracker.active) {                                                                             // 408
      // XXX in many cases, the same observe will be recreated when                                                    // 409
      // the current autorun is rerun.  we could save work by                                                          // 410
      // letting it linger across rerun and potentially get                                                            // 411
      // repurposed if the same observe is performed, using logic                                                      // 412
      // similar to that of Meteor.subscribe.                                                                          // 413
      Tracker.onInvalidate(function () {                                                                               // 414
        handle.stop();                                                                                                 // 415
      });                                                                                                              // 416
    } // run the observe callbacks resulting from the initial contents                                                 // 417
    // before we leave the observe.                                                                                    // 419
                                                                                                                       //
                                                                                                                       //
    self.collection._observeQueue.drain();                                                                             // 420
                                                                                                                       //
    return handle;                                                                                                     // 422
  }                                                                                                                    // 423
}); // Returns a collection of matching objects, but doesn't deep copy them.                                           // 295
//                                                                                                                     // 427
// If ordered is set, returns a sorted array, respecting sorter, skip, and limit                                       // 428
// properties of the query.  if sorter is falsey, no sort -- you get the natural                                       // 429
// order.                                                                                                              // 430
//                                                                                                                     // 431
// If ordered is not set, returns an object mapping from ID to doc (sorter, skip                                       // 432
// and limit should not be set).                                                                                       // 433
//                                                                                                                     // 434
// If ordered is set and this cursor is a $near geoquery, then this function                                           // 435
// will use an _IdMap to track each distance from the $near argument point in                                          // 436
// order to use it as a sort key. If an _IdMap is passed in the 'distances'                                            // 437
// argument, this function will clear it and use it for this purpose (otherwise                                        // 438
// it will just create its own _IdMap). The observeChanges implementation uses                                         // 439
// this to remember the distances after this function returns.                                                         // 440
                                                                                                                       //
                                                                                                                       //
LocalCollection.Cursor.prototype._getRawObjects = function (options) {                                                 // 441
  var self = this;                                                                                                     // 442
  options = options || {}; // XXX use OrderedDict instead of array, and make IdMap and OrderedDict                     // 443
  // compatible                                                                                                        // 446
                                                                                                                       //
  var results = options.ordered ? [] : new LocalCollection._IdMap(); // fast path for single ID value                  // 447
                                                                                                                       //
  if (self._selectorId !== undefined) {                                                                                // 450
    // If you have non-zero skip and ask for a single id, you get                                                      // 451
    // nothing. This is so it matches the behavior of the '{_id: foo}'                                                 // 452
    // path.                                                                                                           // 453
    if (self.skip) return results;                                                                                     // 454
                                                                                                                       //
    var selectedDoc = self.collection._docs.get(self._selectorId);                                                     // 457
                                                                                                                       //
    if (selectedDoc) {                                                                                                 // 458
      if (options.ordered) results.push(selectedDoc);else results.set(self._selectorId, selectedDoc);                  // 459
    }                                                                                                                  // 463
                                                                                                                       //
    return results;                                                                                                    // 464
  } // slow path for arbitrary selector, sort, skip, limit                                                             // 465
  // in the observeChanges case, distances is actually part of the "query" (ie,                                        // 469
  // live results set) object.  in other cases, distances is only used inside                                          // 470
  // this function.                                                                                                    // 471
                                                                                                                       //
                                                                                                                       //
  var distances;                                                                                                       // 472
                                                                                                                       //
  if (self.matcher.hasGeoQuery() && options.ordered) {                                                                 // 473
    if (options.distances) {                                                                                           // 474
      distances = options.distances;                                                                                   // 475
      distances.clear();                                                                                               // 476
    } else {                                                                                                           // 477
      distances = new LocalCollection._IdMap();                                                                        // 478
    }                                                                                                                  // 479
  }                                                                                                                    // 480
                                                                                                                       //
  self.collection._docs.forEach(function (doc, id) {                                                                   // 482
    var matchResult = self.matcher.documentMatches(doc);                                                               // 483
                                                                                                                       //
    if (matchResult.result) {                                                                                          // 484
      if (options.ordered) {                                                                                           // 485
        results.push(doc);                                                                                             // 486
        if (distances && matchResult.distance !== undefined) distances.set(id, matchResult.distance);                  // 487
      } else {                                                                                                         // 489
        results.set(id, doc);                                                                                          // 490
      }                                                                                                                // 491
    } // Fast path for limited unsorted queries.                                                                       // 492
    // XXX 'length' check here seems wrong for ordered                                                                 // 494
                                                                                                                       //
                                                                                                                       //
    if (self.limit && !self.skip && !self.sorter && results.length === self.limit) return false; // break              // 495
                                                                                                                       //
    return true; // continue                                                                                           // 498
  });                                                                                                                  // 499
                                                                                                                       //
  if (!options.ordered) return results;                                                                                // 501
                                                                                                                       //
  if (self.sorter) {                                                                                                   // 504
    var comparator = self.sorter.getComparator({                                                                       // 505
      distances: distances                                                                                             // 505
    });                                                                                                                // 505
    results.sort(comparator);                                                                                          // 506
  }                                                                                                                    // 507
                                                                                                                       //
  var idx_start = self.skip || 0;                                                                                      // 509
  var idx_end = self.limit ? self.limit + idx_start : results.length;                                                  // 510
  return results.slice(idx_start, idx_end);                                                                            // 511
}; // XXX Maybe we need a version of observe that just calls a callback if                                             // 512
// anything changed.                                                                                                   // 515
                                                                                                                       //
                                                                                                                       //
LocalCollection.Cursor.prototype._depend = function (changers, _allow_unordered) {                                     // 516
  var self = this;                                                                                                     // 517
                                                                                                                       //
  if (Tracker.active) {                                                                                                // 519
    var v = new Tracker.Dependency();                                                                                  // 520
    v.depend();                                                                                                        // 521
                                                                                                                       //
    var notifyChange = _.bind(v.changed, v);                                                                           // 522
                                                                                                                       //
    var options = {                                                                                                    // 524
      _suppress_initial: true,                                                                                         // 525
      _allow_unordered: _allow_unordered                                                                               // 526
    };                                                                                                                 // 524
                                                                                                                       //
    _.each(['added', 'changed', 'removed', 'addedBefore', 'movedBefore'], function (fnName) {                          // 528
      if (changers[fnName]) options[fnName] = notifyChange;                                                            // 530
    }); // observeChanges will stop() when this computation is invalidated                                             // 532
                                                                                                                       //
                                                                                                                       //
    self.observeChanges(options);                                                                                      // 535
  }                                                                                                                    // 536
}; // XXX enforce rule that field names can't start with '$' or contain '.'                                            // 537
// (real mongodb does in fact enforce this)                                                                            // 540
// XXX possibly enforce that 'undefined' does not appear (we assume                                                    // 541
// this in our handling of null and $exists)                                                                           // 542
                                                                                                                       //
                                                                                                                       //
LocalCollection.prototype.insert = function (doc, callback) {                                                          // 543
  var self = this;                                                                                                     // 544
  doc = EJSON.clone(doc); // Make sure field names do not contain Mongo restricted                                     // 545
  // characters ('.', '$', '\0').                                                                                      // 548
  // https://docs.mongodb.com/manual/reference/limits/#Restrictions-on-Field-Names                                     // 549
                                                                                                                       //
  if (doc) {                                                                                                           // 550
    (function () {                                                                                                     // 550
      var invalidCharMsg = {                                                                                           // 551
        '.': "contain '.'",                                                                                            // 552
        '$': "start with '$'",                                                                                         // 553
        '\0': "contain null bytes"                                                                                     // 554
      };                                                                                                               // 551
      JSON.stringify(doc, function (key, value) {                                                                      // 556
        var match = void 0;                                                                                            // 557
                                                                                                                       //
        if (_.isString(key) && (match = key.match(/^\$|\.|\0/))) {                                                     // 558
          throw MinimongoError("Key " + key + " must not " + invalidCharMsg[match[0]]);                                // 559
        }                                                                                                              // 560
                                                                                                                       //
        return value;                                                                                                  // 561
      });                                                                                                              // 562
    })();                                                                                                              // 550
  }                                                                                                                    // 563
                                                                                                                       //
  if (!_.has(doc, '_id')) {                                                                                            // 565
    // if you really want to use ObjectIDs, set this global.                                                           // 566
    // Mongo.Collection specifies its own ids and does not use this code.                                              // 567
    doc._id = LocalCollection._useOID ? new MongoID.ObjectID() : Random.id();                                          // 568
  }                                                                                                                    // 570
                                                                                                                       //
  var id = doc._id;                                                                                                    // 571
  if (self._docs.has(id)) throw MinimongoError("Duplicate _id '" + id + "'");                                          // 573
                                                                                                                       //
  self._saveOriginal(id, undefined);                                                                                   // 576
                                                                                                                       //
  self._docs.set(id, doc);                                                                                             // 577
                                                                                                                       //
  var queriesToRecompute = []; // trigger live queries that match                                                      // 579
                                                                                                                       //
  for (var qid in meteorBabelHelpers.sanitizeForInObject(self.queries)) {                                              // 581
    var query = self.queries[qid];                                                                                     // 582
    if (query.dirty) continue;                                                                                         // 583
    var matchResult = query.matcher.documentMatches(doc);                                                              // 584
                                                                                                                       //
    if (matchResult.result) {                                                                                          // 585
      if (query.distances && matchResult.distance !== undefined) query.distances.set(id, matchResult.distance);        // 586
      if (query.cursor.skip || query.cursor.limit) queriesToRecompute.push(qid);else LocalCollection._insertInResults(query, doc);
    }                                                                                                                  // 592
  }                                                                                                                    // 593
                                                                                                                       //
  _.each(queriesToRecompute, function (qid) {                                                                          // 595
    if (self.queries[qid]) self._recomputeResults(self.queries[qid]);                                                  // 596
  });                                                                                                                  // 598
                                                                                                                       //
  self._observeQueue.drain(); // Defer because the caller likely doesn't expect the callback to be run                 // 599
  // immediately.                                                                                                      // 602
                                                                                                                       //
                                                                                                                       //
  if (callback) Meteor.defer(function () {                                                                             // 603
    callback(null, id);                                                                                                // 605
  });                                                                                                                  // 606
  return id;                                                                                                           // 607
}; // Iterates over a subset of documents that could match selector; calls                                             // 608
// f(doc, id) on each of them.  Specifically, if selector specifies                                                    // 611
// specific _id's, it only looks at those.  doc is *not* cloned: it is the                                             // 612
// same object that is in _docs.                                                                                       // 613
                                                                                                                       //
                                                                                                                       //
LocalCollection.prototype._eachPossiblyMatchingDoc = function (selector, f) {                                          // 614
  var self = this;                                                                                                     // 615
                                                                                                                       //
  var specificIds = LocalCollection._idsMatchedBySelector(selector);                                                   // 616
                                                                                                                       //
  if (specificIds) {                                                                                                   // 617
    for (var i = 0; i < specificIds.length; ++i) {                                                                     // 618
      var id = specificIds[i];                                                                                         // 619
                                                                                                                       //
      var doc = self._docs.get(id);                                                                                    // 620
                                                                                                                       //
      if (doc) {                                                                                                       // 621
        var breakIfFalse = f(doc, id);                                                                                 // 622
        if (breakIfFalse === false) break;                                                                             // 623
      }                                                                                                                // 625
    }                                                                                                                  // 626
  } else {                                                                                                             // 627
    self._docs.forEach(f);                                                                                             // 628
  }                                                                                                                    // 629
};                                                                                                                     // 630
                                                                                                                       //
LocalCollection.prototype.remove = function (selector, callback) {                                                     // 632
  var self = this; // Easy special case: if we're not calling observeChanges callbacks and we're                       // 633
  // not saving originals and we got asked to remove everything, then just empty                                       // 636
  // everything directly.                                                                                              // 637
                                                                                                                       //
  if (self.paused && !self._savedOriginals && EJSON.equals(selector, {})) {                                            // 638
    var result = self._docs.size();                                                                                    // 639
                                                                                                                       //
    self._docs.clear();                                                                                                // 640
                                                                                                                       //
    _.each(self.queries, function (query) {                                                                            // 641
      if (query.ordered) {                                                                                             // 642
        query.results = [];                                                                                            // 643
      } else {                                                                                                         // 644
        query.results.clear();                                                                                         // 645
      }                                                                                                                // 646
    });                                                                                                                // 647
                                                                                                                       //
    if (callback) {                                                                                                    // 648
      Meteor.defer(function () {                                                                                       // 649
        callback(null, result);                                                                                        // 650
      });                                                                                                              // 651
    }                                                                                                                  // 652
                                                                                                                       //
    return result;                                                                                                     // 653
  }                                                                                                                    // 654
                                                                                                                       //
  var matcher = new Minimongo.Matcher(selector);                                                                       // 656
  var remove = [];                                                                                                     // 657
                                                                                                                       //
  self._eachPossiblyMatchingDoc(selector, function (doc, id) {                                                         // 658
    if (matcher.documentMatches(doc).result) remove.push(id);                                                          // 659
  });                                                                                                                  // 661
                                                                                                                       //
  var queriesToRecompute = [];                                                                                         // 663
  var queryRemove = [];                                                                                                // 664
                                                                                                                       //
  for (var i = 0; i < remove.length; i++) {                                                                            // 665
    var removeId = remove[i];                                                                                          // 666
                                                                                                                       //
    var removeDoc = self._docs.get(removeId);                                                                          // 667
                                                                                                                       //
    _.each(self.queries, function (query, qid) {                                                                       // 668
      if (query.dirty) return;                                                                                         // 669
                                                                                                                       //
      if (query.matcher.documentMatches(removeDoc).result) {                                                           // 671
        if (query.cursor.skip || query.cursor.limit) queriesToRecompute.push(qid);else queryRemove.push({              // 672
          qid: qid,                                                                                                    // 675
          doc: removeDoc                                                                                               // 675
        });                                                                                                            // 675
      }                                                                                                                // 676
    });                                                                                                                // 677
                                                                                                                       //
    self._saveOriginal(removeId, removeDoc);                                                                           // 678
                                                                                                                       //
    self._docs.remove(removeId);                                                                                       // 679
  } // run live query callbacks _after_ we've removed the documents.                                                   // 680
                                                                                                                       //
                                                                                                                       //
  _.each(queryRemove, function (remove) {                                                                              // 683
    var query = self.queries[remove.qid];                                                                              // 684
                                                                                                                       //
    if (query) {                                                                                                       // 685
      query.distances && query.distances.remove(remove.doc._id);                                                       // 686
                                                                                                                       //
      LocalCollection._removeFromResults(query, remove.doc);                                                           // 687
    }                                                                                                                  // 688
  });                                                                                                                  // 689
                                                                                                                       //
  _.each(queriesToRecompute, function (qid) {                                                                          // 690
    var query = self.queries[qid];                                                                                     // 691
    if (query) self._recomputeResults(query);                                                                          // 692
  });                                                                                                                  // 694
                                                                                                                       //
  self._observeQueue.drain();                                                                                          // 695
                                                                                                                       //
  result = remove.length;                                                                                              // 696
  if (callback) Meteor.defer(function () {                                                                             // 697
    callback(null, result);                                                                                            // 699
  });                                                                                                                  // 700
  return result;                                                                                                       // 701
}; // XXX atomicity: if multi is true, and one modification fails, do                                                  // 702
// we rollback the whole operation, or what?                                                                           // 705
                                                                                                                       //
                                                                                                                       //
LocalCollection.prototype.update = function (selector, mod, options, callback) {                                       // 706
  var self = this;                                                                                                     // 707
                                                                                                                       //
  if (!callback && options instanceof Function) {                                                                      // 708
    callback = options;                                                                                                // 709
    options = null;                                                                                                    // 710
  }                                                                                                                    // 711
                                                                                                                       //
  if (!options) options = {};                                                                                          // 712
  var matcher = new Minimongo.Matcher(selector); // Save the original results of any query that we might need to       // 714
  // _recomputeResults on, because _modifyAndNotify will mutate the objects in                                         // 717
  // it. (We don't need to save the original results of paused queries because                                         // 718
  // they already have a resultsSnapshot and we won't be diffing in                                                    // 719
  // _recomputeResults.)                                                                                               // 720
                                                                                                                       //
  var qidToOriginalResults = {}; // We should only clone each document once, even if it appears in multiple queries    // 721
                                                                                                                       //
  var docMap = new LocalCollection._IdMap();                                                                           // 723
                                                                                                                       //
  var idsMatchedBySelector = LocalCollection._idsMatchedBySelector(selector);                                          // 724
                                                                                                                       //
  _.each(self.queries, function (query, qid) {                                                                         // 726
    if ((query.cursor.skip || query.cursor.limit) && !self.paused) {                                                   // 727
      // Catch the case of a reactive `count()` on a cursor with skip                                                  // 728
      // or limit, which registers an unordered observe. This is a                                                     // 729
      // pretty rare case, so we just clone the entire result set with                                                 // 730
      // no optimizations for documents that appear in these result                                                    // 731
      // sets and other queries.                                                                                       // 732
      if (query.results instanceof LocalCollection._IdMap) {                                                           // 733
        qidToOriginalResults[qid] = query.results.clone();                                                             // 734
        return;                                                                                                        // 735
      }                                                                                                                // 736
                                                                                                                       //
      if (!(query.results instanceof Array)) {                                                                         // 738
        throw new Error("Assertion failed: query.results not an array");                                               // 739
      } // Clones a document to be stored in `qidToOriginalResults`                                                    // 740
      // because it may be modified before the new and old result sets                                                 // 743
      // are diffed. But if we know exactly which document IDs we're                                                   // 744
      // going to modify, then we only need to clone those.                                                            // 745
                                                                                                                       //
                                                                                                                       //
      var memoizedCloneIfNeeded = function (doc) {                                                                     // 746
        if (docMap.has(doc._id)) {                                                                                     // 747
          return docMap.get(doc._id);                                                                                  // 748
        } else {                                                                                                       // 749
          var docToMemoize;                                                                                            // 750
                                                                                                                       //
          if (idsMatchedBySelector && !_.any(idsMatchedBySelector, function (id) {                                     // 752
            return EJSON.equals(id, doc._id);                                                                          // 753
          })) {                                                                                                        // 754
            docToMemoize = doc;                                                                                        // 755
          } else {                                                                                                     // 756
            docToMemoize = EJSON.clone(doc);                                                                           // 757
          }                                                                                                            // 758
                                                                                                                       //
          docMap.set(doc._id, docToMemoize);                                                                           // 760
          return docToMemoize;                                                                                         // 761
        }                                                                                                              // 762
      };                                                                                                               // 763
                                                                                                                       //
      qidToOriginalResults[qid] = query.results.map(memoizedCloneIfNeeded);                                            // 765
    }                                                                                                                  // 766
  });                                                                                                                  // 767
                                                                                                                       //
  var recomputeQids = {};                                                                                              // 768
  var updateCount = 0;                                                                                                 // 770
                                                                                                                       //
  self._eachPossiblyMatchingDoc(selector, function (doc, id) {                                                         // 772
    var queryResult = matcher.documentMatches(doc);                                                                    // 773
                                                                                                                       //
    if (queryResult.result) {                                                                                          // 774
      // XXX Should we save the original even if mod ends up being a no-op?                                            // 775
      self._saveOriginal(id, doc);                                                                                     // 776
                                                                                                                       //
      self._modifyAndNotify(doc, mod, recomputeQids, queryResult.arrayIndices);                                        // 777
                                                                                                                       //
      ++updateCount;                                                                                                   // 778
      if (!options.multi) return false; // break                                                                       // 779
    }                                                                                                                  // 781
                                                                                                                       //
    return true;                                                                                                       // 782
  });                                                                                                                  // 783
                                                                                                                       //
  _.each(recomputeQids, function (dummy, qid) {                                                                        // 785
    var query = self.queries[qid];                                                                                     // 786
    if (query) self._recomputeResults(query, qidToOriginalResults[qid]);                                               // 787
  });                                                                                                                  // 789
                                                                                                                       //
  self._observeQueue.drain(); // If we are doing an upsert, and we didn't modify any documents yet, then               // 790
  // it's time to do an insert. Figure out what document we are inserting, and                                         // 793
  // generate an id for it.                                                                                            // 794
                                                                                                                       //
                                                                                                                       //
  var insertedId;                                                                                                      // 795
                                                                                                                       //
  if (updateCount === 0 && options.upsert) {                                                                           // 796
    var newDoc = LocalCollection._removeDollarOperators(selector);                                                     // 797
                                                                                                                       //
    LocalCollection._modify(newDoc, mod, {                                                                             // 798
      isInsert: true                                                                                                   // 798
    });                                                                                                                // 798
                                                                                                                       //
    if (!newDoc._id && options.insertedId) newDoc._id = options.insertedId;                                            // 799
    insertedId = self.insert(newDoc);                                                                                  // 801
    updateCount = 1;                                                                                                   // 802
  } // Return the number of affected documents, or in the upsert case, an object                                       // 803
  // containing the number of affected docs and the id of the doc that was                                             // 806
  // inserted, if any.                                                                                                 // 807
                                                                                                                       //
                                                                                                                       //
  var result;                                                                                                          // 808
                                                                                                                       //
  if (options._returnObject) {                                                                                         // 809
    result = {                                                                                                         // 810
      numberAffected: updateCount                                                                                      // 811
    };                                                                                                                 // 810
    if (insertedId !== undefined) result.insertedId = insertedId;                                                      // 813
  } else {                                                                                                             // 815
    result = updateCount;                                                                                              // 816
  }                                                                                                                    // 817
                                                                                                                       //
  if (callback) Meteor.defer(function () {                                                                             // 819
    callback(null, result);                                                                                            // 821
  });                                                                                                                  // 822
  return result;                                                                                                       // 823
}; // A convenience wrapper on update. LocalCollection.upsert(sel, mod) is                                             // 824
// equivalent to LocalCollection.update(sel, mod, { upsert: true, _returnObject:                                       // 827
// true }).                                                                                                            // 828
                                                                                                                       //
                                                                                                                       //
LocalCollection.prototype.upsert = function (selector, mod, options, callback) {                                       // 829
  var self = this;                                                                                                     // 830
                                                                                                                       //
  if (!callback && typeof options === "function") {                                                                    // 831
    callback = options;                                                                                                // 832
    options = {};                                                                                                      // 833
  }                                                                                                                    // 834
                                                                                                                       //
  return self.update(selector, mod, _.extend({}, options, {                                                            // 835
    upsert: true,                                                                                                      // 836
    _returnObject: true                                                                                                // 837
  }), callback);                                                                                                       // 835
};                                                                                                                     // 839
                                                                                                                       //
LocalCollection.prototype._modifyAndNotify = function (doc, mod, recomputeQids, arrayIndices) {                        // 841
  var self = this;                                                                                                     // 843
  var matched_before = {};                                                                                             // 845
                                                                                                                       //
  for (var qid in meteorBabelHelpers.sanitizeForInObject(self.queries)) {                                              // 846
    var query = self.queries[qid];                                                                                     // 847
    if (query.dirty) continue;                                                                                         // 848
                                                                                                                       //
    if (query.ordered) {                                                                                               // 850
      matched_before[qid] = query.matcher.documentMatches(doc).result;                                                 // 851
    } else {                                                                                                           // 852
      // Because we don't support skip or limit (yet) in unordered queries, we                                         // 853
      // can just do a direct lookup.                                                                                  // 854
      matched_before[qid] = query.results.has(doc._id);                                                                // 855
    }                                                                                                                  // 856
  }                                                                                                                    // 857
                                                                                                                       //
  var old_doc = EJSON.clone(doc);                                                                                      // 859
                                                                                                                       //
  LocalCollection._modify(doc, mod, {                                                                                  // 861
    arrayIndices: arrayIndices                                                                                         // 861
  });                                                                                                                  // 861
                                                                                                                       //
  for (qid in meteorBabelHelpers.sanitizeForInObject(self.queries)) {                                                  // 863
    query = self.queries[qid];                                                                                         // 864
    if (query.dirty) continue;                                                                                         // 865
    var before = matched_before[qid];                                                                                  // 867
    var afterMatch = query.matcher.documentMatches(doc);                                                               // 868
    var after = afterMatch.result;                                                                                     // 869
    if (after && query.distances && afterMatch.distance !== undefined) query.distances.set(doc._id, afterMatch.distance);
                                                                                                                       //
    if (query.cursor.skip || query.cursor.limit) {                                                                     // 873
      // We need to recompute any query where the doc may have been in the                                             // 874
      // cursor's window either before or after the update. (Note that if skip                                         // 875
      // or limit is set, "before" and "after" being true do not necessarily                                           // 876
      // mean that the document is in the cursor's output after skip/limit is                                          // 877
      // applied... but if they are false, then the document definitely is NOT                                         // 878
      // in the output. So it's safe to skip recompute if neither before or                                            // 879
      // after are true.)                                                                                              // 880
      if (before || after) recomputeQids[qid] = true;                                                                  // 881
    } else if (before && !after) {                                                                                     // 883
      LocalCollection._removeFromResults(query, doc);                                                                  // 884
    } else if (!before && after) {                                                                                     // 885
      LocalCollection._insertInResults(query, doc);                                                                    // 886
    } else if (before && after) {                                                                                      // 887
      LocalCollection._updateInResults(query, doc, old_doc);                                                           // 888
    }                                                                                                                  // 889
  }                                                                                                                    // 890
}; // XXX the sorted-query logic below is laughably inefficient. we'll                                                 // 891
// need to come up with a better datastructure for this.                                                               // 894
//                                                                                                                     // 895
// XXX the logic for observing with a skip or a limit is even more                                                     // 896
// laughably inefficient. we recompute the whole results every time!                                                   // 897
                                                                                                                       //
                                                                                                                       //
LocalCollection._insertInResults = function (query, doc) {                                                             // 899
  var fields = EJSON.clone(doc);                                                                                       // 900
  delete fields._id;                                                                                                   // 901
                                                                                                                       //
  if (query.ordered) {                                                                                                 // 902
    if (!query.sorter) {                                                                                               // 903
      query.addedBefore(doc._id, query.projectionFn(fields), null);                                                    // 904
      query.results.push(doc);                                                                                         // 905
    } else {                                                                                                           // 906
      var i = LocalCollection._insertInSortedList(query.sorter.getComparator({                                         // 907
        distances: query.distances                                                                                     // 908
      }), query.results, doc);                                                                                         // 908
                                                                                                                       //
      var next = query.results[i + 1];                                                                                 // 910
      if (next) next = next._id;else next = null;                                                                      // 911
      query.addedBefore(doc._id, query.projectionFn(fields), next);                                                    // 915
    }                                                                                                                  // 916
                                                                                                                       //
    query.added(doc._id, query.projectionFn(fields));                                                                  // 917
  } else {                                                                                                             // 918
    query.added(doc._id, query.projectionFn(fields));                                                                  // 919
    query.results.set(doc._id, doc);                                                                                   // 920
  }                                                                                                                    // 921
};                                                                                                                     // 922
                                                                                                                       //
LocalCollection._removeFromResults = function (query, doc) {                                                           // 924
  if (query.ordered) {                                                                                                 // 925
    var i = LocalCollection._findInOrderedResults(query, doc);                                                         // 926
                                                                                                                       //
    query.removed(doc._id);                                                                                            // 927
    query.results.splice(i, 1);                                                                                        // 928
  } else {                                                                                                             // 929
    var id = doc._id; // in case callback mutates doc                                                                  // 930
                                                                                                                       //
    query.removed(doc._id);                                                                                            // 931
    query.results.remove(id);                                                                                          // 932
  }                                                                                                                    // 933
};                                                                                                                     // 934
                                                                                                                       //
LocalCollection._updateInResults = function (query, doc, old_doc) {                                                    // 936
  if (!EJSON.equals(doc._id, old_doc._id)) throw new Error("Can't change a doc's _id while updating");                 // 937
  var projectionFn = query.projectionFn;                                                                               // 939
  var changedFields = DiffSequence.makeChangedFields(projectionFn(doc), projectionFn(old_doc));                        // 940
                                                                                                                       //
  if (!query.ordered) {                                                                                                // 943
    if (!_.isEmpty(changedFields)) {                                                                                   // 944
      query.changed(doc._id, changedFields);                                                                           // 945
      query.results.set(doc._id, doc);                                                                                 // 946
    }                                                                                                                  // 947
                                                                                                                       //
    return;                                                                                                            // 948
  }                                                                                                                    // 949
                                                                                                                       //
  var orig_idx = LocalCollection._findInOrderedResults(query, doc);                                                    // 951
                                                                                                                       //
  if (!_.isEmpty(changedFields)) query.changed(doc._id, changedFields);                                                // 953
  if (!query.sorter) return; // just take it out and put it back in again, and see if the index                        // 955
  // changes                                                                                                           // 959
                                                                                                                       //
  query.results.splice(orig_idx, 1);                                                                                   // 960
                                                                                                                       //
  var new_idx = LocalCollection._insertInSortedList(query.sorter.getComparator({                                       // 961
    distances: query.distances                                                                                         // 962
  }), query.results, doc);                                                                                             // 962
                                                                                                                       //
  if (orig_idx !== new_idx) {                                                                                          // 964
    var next = query.results[new_idx + 1];                                                                             // 965
    if (next) next = next._id;else next = null;                                                                        // 966
    query.movedBefore && query.movedBefore(doc._id, next);                                                             // 970
  }                                                                                                                    // 971
}; // Recomputes the results of a query and runs observe callbacks for the                                             // 972
// difference between the previous results and the current results (unless                                             // 975
// paused). Used for skip/limit queries.                                                                               // 976
//                                                                                                                     // 977
// When this is used by insert or remove, it can just use query.results for the                                        // 978
// old results (and there's no need to pass in oldResults), because these                                              // 979
// operations don't mutate the documents in the collection. Update needs to pass                                       // 980
// in an oldResults which was deep-copied before the modifier was applied.                                             // 981
//                                                                                                                     // 982
// oldResults is guaranteed to be ignored if the query is not paused.                                                  // 983
                                                                                                                       //
                                                                                                                       //
LocalCollection.prototype._recomputeResults = function (query, oldResults) {                                           // 984
  var self = this;                                                                                                     // 985
                                                                                                                       //
  if (self.paused) {                                                                                                   // 986
    // There's no reason to recompute the results now as we're still paused.                                           // 987
    // By flagging the query as "dirty", the recompute will be performed                                               // 988
    // when resumeObservers is called.                                                                                 // 989
    query.dirty = true;                                                                                                // 990
    return;                                                                                                            // 991
  }                                                                                                                    // 992
                                                                                                                       //
  if (!self.paused && !oldResults) oldResults = query.results;                                                         // 994
  if (query.distances) query.distances.clear();                                                                        // 996
  query.results = query.cursor._getRawObjects({                                                                        // 998
    ordered: query.ordered,                                                                                            // 999
    distances: query.distances                                                                                         // 999
  });                                                                                                                  // 998
                                                                                                                       //
  if (!self.paused) {                                                                                                  // 1001
    LocalCollection._diffQueryChanges(query.ordered, oldResults, query.results, query, {                               // 1002
      projectionFn: query.projectionFn                                                                                 // 1004
    });                                                                                                                // 1004
  }                                                                                                                    // 1005
};                                                                                                                     // 1006
                                                                                                                       //
LocalCollection._findInOrderedResults = function (query, doc) {                                                        // 1009
  if (!query.ordered) throw new Error("Can't call _findInOrderedResults on unordered query");                          // 1010
                                                                                                                       //
  for (var i = 0; i < query.results.length; i++) {                                                                     // 1012
    if (query.results[i] === doc) return i;                                                                            // 1013
  }                                                                                                                    // 1012
                                                                                                                       //
  throw Error("object missing from query");                                                                            // 1015
}; // This binary search puts a value between any equal values, and the first                                          // 1016
// lesser value.                                                                                                       // 1019
                                                                                                                       //
                                                                                                                       //
LocalCollection._binarySearch = function (cmp, array, value) {                                                         // 1020
  var first = 0,                                                                                                       // 1021
      rangeLength = array.length;                                                                                      // 1021
                                                                                                                       //
  while (rangeLength > 0) {                                                                                            // 1023
    var halfRange = Math.floor(rangeLength / 2);                                                                       // 1024
                                                                                                                       //
    if (cmp(value, array[first + halfRange]) >= 0) {                                                                   // 1025
      first += halfRange + 1;                                                                                          // 1026
      rangeLength -= halfRange + 1;                                                                                    // 1027
    } else {                                                                                                           // 1028
      rangeLength = halfRange;                                                                                         // 1029
    }                                                                                                                  // 1030
  }                                                                                                                    // 1031
                                                                                                                       //
  return first;                                                                                                        // 1032
};                                                                                                                     // 1033
                                                                                                                       //
LocalCollection._insertInSortedList = function (cmp, array, value) {                                                   // 1035
  if (array.length === 0) {                                                                                            // 1036
    array.push(value);                                                                                                 // 1037
    return 0;                                                                                                          // 1038
  }                                                                                                                    // 1039
                                                                                                                       //
  var idx = LocalCollection._binarySearch(cmp, array, value);                                                          // 1041
                                                                                                                       //
  array.splice(idx, 0, value);                                                                                         // 1042
  return idx;                                                                                                          // 1043
}; // To track what documents are affected by a piece of code, call saveOriginals()                                    // 1044
// before it and retrieveOriginals() after it. retrieveOriginals returns an                                            // 1047
// object whose keys are the ids of the documents that were affected since the                                         // 1048
// call to saveOriginals(), and the values are equal to the document's contents                                        // 1049
// at the time of saveOriginals. (In the case of an inserted document, undefined                                       // 1050
// is the value.) You must alternate between calls to saveOriginals() and                                              // 1051
// retrieveOriginals().                                                                                                // 1052
                                                                                                                       //
                                                                                                                       //
LocalCollection.prototype.saveOriginals = function () {                                                                // 1053
  var self = this;                                                                                                     // 1054
  if (self._savedOriginals) throw new Error("Called saveOriginals twice without retrieveOriginals");                   // 1055
  self._savedOriginals = new LocalCollection._IdMap();                                                                 // 1057
};                                                                                                                     // 1058
                                                                                                                       //
LocalCollection.prototype.retrieveOriginals = function () {                                                            // 1059
  var self = this;                                                                                                     // 1060
  if (!self._savedOriginals) throw new Error("Called retrieveOriginals without saveOriginals");                        // 1061
  var originals = self._savedOriginals;                                                                                // 1064
  self._savedOriginals = null;                                                                                         // 1065
  return originals;                                                                                                    // 1066
};                                                                                                                     // 1067
                                                                                                                       //
LocalCollection.prototype._saveOriginal = function (id, doc) {                                                         // 1069
  var self = this; // Are we even trying to save originals?                                                            // 1070
                                                                                                                       //
  if (!self._savedOriginals) return; // Have we previously mutated the original (and so 'doc' is not actually          // 1072
  // original)?  (Note the 'has' check rather than truth: we store undefined                                           // 1075
  // here for inserted docs!)                                                                                          // 1076
                                                                                                                       //
  if (self._savedOriginals.has(id)) return;                                                                            // 1077
                                                                                                                       //
  self._savedOriginals.set(id, EJSON.clone(doc));                                                                      // 1079
}; // Pause the observers. No callbacks from observers will fire until                                                 // 1080
// 'resumeObservers' is called.                                                                                        // 1083
                                                                                                                       //
                                                                                                                       //
LocalCollection.prototype.pauseObservers = function () {                                                               // 1084
  // No-op if already paused.                                                                                          // 1085
  if (this.paused) return; // Set the 'paused' flag such that new observer messages don't fire.                        // 1086
                                                                                                                       //
  this.paused = true; // Take a snapshot of the query results for each query.                                          // 1090
                                                                                                                       //
  for (var qid in meteorBabelHelpers.sanitizeForInObject(this.queries)) {                                              // 1093
    var query = this.queries[qid];                                                                                     // 1094
    query.resultsSnapshot = EJSON.clone(query.results);                                                                // 1096
  }                                                                                                                    // 1097
}; // Resume the observers. Observers immediately receive change                                                       // 1098
// notifications to bring them to the current state of the                                                             // 1101
// database. Note that this is not just replaying all the changes that                                                 // 1102
// happened during the pause, it is a smarter 'coalesced' diff.                                                        // 1103
                                                                                                                       //
                                                                                                                       //
LocalCollection.prototype.resumeObservers = function () {                                                              // 1104
  var self = this; // No-op if not paused.                                                                             // 1105
                                                                                                                       //
  if (!this.paused) return; // Unset the 'paused' flag. Make sure to do this first, otherwise                          // 1107
  // observer methods won't actually fire when we trigger them.                                                        // 1111
                                                                                                                       //
  this.paused = false;                                                                                                 // 1112
                                                                                                                       //
  for (var qid in meteorBabelHelpers.sanitizeForInObject(this.queries)) {                                              // 1114
    var query = self.queries[qid];                                                                                     // 1115
                                                                                                                       //
    if (query.dirty) {                                                                                                 // 1116
      query.dirty = false; // re-compute results will perform `LocalCollection._diffQueryChanges` automatically.       // 1117
                                                                                                                       //
      self._recomputeResults(query, query.resultsSnapshot);                                                            // 1119
    } else {                                                                                                           // 1120
      // Diff the current results against the snapshot and send to observers.                                          // 1121
      // pass the query object for its observer callbacks.                                                             // 1122
      LocalCollection._diffQueryChanges(query.ordered, query.resultsSnapshot, query.results, query, {                  // 1123
        projectionFn: query.projectionFn                                                                               // 1125
      });                                                                                                              // 1125
    }                                                                                                                  // 1126
                                                                                                                       //
    query.resultsSnapshot = null;                                                                                      // 1127
  }                                                                                                                    // 1128
                                                                                                                       //
  self._observeQueue.drain();                                                                                          // 1129
};                                                                                                                     // 1130
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"wrap_transform.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/wrap_transform.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// Wrap a transform function to return objects that have the _id field                                                 // 1
// of the untransformed document. This ensures that subsystems such as                                                 // 2
// the observe-sequence package that call `observe` can keep track of                                                  // 3
// the documents identities.                                                                                           // 4
//                                                                                                                     // 5
// - Require that it returns objects                                                                                   // 6
// - If the return value has an _id field, verify that it matches the                                                  // 7
//   original _id field                                                                                                // 8
// - If the return value doesn't have an _id field, add it back.                                                       // 9
LocalCollection.wrapTransform = function (transform) {                                                                 // 10
  if (!transform) return null; // No need to doubly-wrap transforms.                                                   // 11
                                                                                                                       //
  if (transform.__wrappedTransform__) return transform;                                                                // 15
                                                                                                                       //
  var wrapped = function (doc) {                                                                                       // 18
    if (!_.has(doc, '_id')) {                                                                                          // 19
      // XXX do we ever have a transform on the oplog's collection? because that                                       // 20
      // collection has no _id.                                                                                        // 21
      throw new Error("can only transform documents with _id");                                                        // 22
    }                                                                                                                  // 23
                                                                                                                       //
    var id = doc._id; // XXX consider making tracker a weak dependency and checking Package.tracker here               // 25
                                                                                                                       //
    var transformed = Tracker.nonreactive(function () {                                                                // 27
      return transform(doc);                                                                                           // 28
    });                                                                                                                // 29
                                                                                                                       //
    if (!isPlainObject(transformed)) {                                                                                 // 31
      throw new Error("transform must return object");                                                                 // 32
    }                                                                                                                  // 33
                                                                                                                       //
    if (_.has(transformed, '_id')) {                                                                                   // 35
      if (!EJSON.equals(transformed._id, id)) {                                                                        // 36
        throw new Error("transformed document can't have different _id");                                              // 37
      }                                                                                                                // 38
    } else {                                                                                                           // 39
      transformed._id = id;                                                                                            // 40
    }                                                                                                                  // 41
                                                                                                                       //
    return transformed;                                                                                                // 42
  };                                                                                                                   // 43
                                                                                                                       //
  wrapped.__wrappedTransform__ = true;                                                                                 // 44
  return wrapped;                                                                                                      // 45
};                                                                                                                     // 46
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"helpers.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/helpers.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// Like _.isArray, but doesn't regard polyfilled Uint8Arrays on old browsers as                                        // 1
// arrays.                                                                                                             // 2
// XXX maybe this should be EJSON.isArray                                                                              // 3
isArray = function (x) {                                                                                               // 4
  return _.isArray(x) && !EJSON.isBinary(x);                                                                           // 5
}; // XXX maybe this should be EJSON.isObject, though EJSON doesn't know about                                         // 6
// RegExp                                                                                                              // 9
// XXX note that _type(undefined) === 3!!!!                                                                            // 10
                                                                                                                       //
                                                                                                                       //
isPlainObject = LocalCollection._isPlainObject = function (x) {                                                        // 11
  return x && LocalCollection._f._type(x) === 3;                                                                       // 12
};                                                                                                                     // 13
                                                                                                                       //
isIndexable = function (x) {                                                                                           // 15
  return isArray(x) || isPlainObject(x);                                                                               // 16
}; // Returns true if this is an object with at least one key and all keys begin                                       // 17
// with $.  Unless inconsistentOK is set, throws if some keys begin with $ and                                         // 20
// others don't.                                                                                                       // 21
                                                                                                                       //
                                                                                                                       //
isOperatorObject = function (valueSelector, inconsistentOK) {                                                          // 22
  if (!isPlainObject(valueSelector)) return false;                                                                     // 23
  var theseAreOperators = undefined;                                                                                   // 26
                                                                                                                       //
  _.each(valueSelector, function (value, selKey) {                                                                     // 27
    var thisIsOperator = selKey.substr(0, 1) === '$';                                                                  // 28
                                                                                                                       //
    if (theseAreOperators === undefined) {                                                                             // 29
      theseAreOperators = thisIsOperator;                                                                              // 30
    } else if (theseAreOperators !== thisIsOperator) {                                                                 // 31
      if (!inconsistentOK) throw new Error("Inconsistent operator: " + JSON.stringify(valueSelector));                 // 32
      theseAreOperators = false;                                                                                       // 35
    }                                                                                                                  // 36
  });                                                                                                                  // 37
                                                                                                                       //
  return !!theseAreOperators; // {} has no operators                                                                   // 38
}; // string can be converted to integer                                                                               // 39
                                                                                                                       //
                                                                                                                       //
isNumericKey = function (s) {                                                                                          // 43
  return (/^[0-9]+$/.test(s)                                                                                           // 44
  );                                                                                                                   // 44
};                                                                                                                     // 45
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"selector.js":["babel-runtime/helpers/typeof",function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/selector.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _typeof2 = require("babel-runtime/helpers/typeof");                                                                //
                                                                                                                       //
var _typeof3 = _interopRequireDefault(_typeof2);                                                                       //
                                                                                                                       //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                      //
                                                                                                                       //
// The minimongo selector compiler!                                                                                    // 1
// Terminology:                                                                                                        // 3
//  - a "selector" is the EJSON object representing a selector                                                         // 4
//  - a "matcher" is its compiled form (whether a full Minimongo.Matcher                                               // 5
//    object or one of the component lambdas that matches parts of it)                                                 // 6
//  - a "result object" is an object with a "result" field and maybe                                                   // 7
//    distance and arrayIndices.                                                                                       // 8
//  - a "branched value" is an object with a "value" field and maybe                                                   // 9
//    "dontIterate" and "arrayIndices".                                                                                // 10
//  - a "document" is a top-level object that can be stored in a collection.                                           // 11
//  - a "lookup function" is a function that takes in a document and returns                                           // 12
//    an array of "branched values".                                                                                   // 13
//  - a "branched matcher" maps from an array of branched values to a result                                           // 14
//    object.                                                                                                          // 15
//  - an "element matcher" maps from a single value to a bool.                                                         // 16
// Main entry point.                                                                                                   // 18
//   var matcher = new Minimongo.Matcher({a: {$gt: 5}});                                                               // 19
//   if (matcher.documentMatches({a: 7})) ...                                                                          // 20
Minimongo.Matcher = function (selector) {                                                                              // 21
  var self = this; // A set (object mapping string -> *) of all of the document paths looked                           // 22
  // at by the selector. Also includes the empty string if it may look at any                                          // 24
  // path (eg, $where).                                                                                                // 25
                                                                                                                       //
  self._paths = {}; // Set to true if compilation finds a $near.                                                       // 26
                                                                                                                       //
  self._hasGeoQuery = false; // Set to true if compilation finds a $where.                                             // 28
                                                                                                                       //
  self._hasWhere = false; // Set to false if compilation finds anything other than a simple equality or                // 30
  // one or more of '$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$nin' used with                                       // 32
  // scalars as operands.                                                                                              // 33
                                                                                                                       //
  self._isSimple = true; // Set to a dummy document which always matches this Matcher. Or set to null                  // 34
  // if such document is too hard to find.                                                                             // 36
                                                                                                                       //
  self._matchingDocument = undefined; // A clone of the original selector. It may just be a function if the user       // 37
  // passed in a function; otherwise is definitely an object (eg, IDs are                                              // 39
  // translated into {_id: ID} first. Used by canBecomeTrueByModifier and                                              // 40
  // Sorter._useWithMatcher.                                                                                           // 41
                                                                                                                       //
  self._selector = null;                                                                                               // 42
  self._docMatcher = self._compileSelector(selector);                                                                  // 43
};                                                                                                                     // 44
                                                                                                                       //
_.extend(Minimongo.Matcher.prototype, {                                                                                // 46
  documentMatches: function (doc) {                                                                                    // 47
    if (!doc || (typeof doc === "undefined" ? "undefined" : (0, _typeof3.default)(doc)) !== "object") {                // 48
      throw Error("documentMatches needs a document");                                                                 // 49
    }                                                                                                                  // 50
                                                                                                                       //
    return this._docMatcher(doc);                                                                                      // 51
  },                                                                                                                   // 52
  hasGeoQuery: function () {                                                                                           // 53
    return this._hasGeoQuery;                                                                                          // 54
  },                                                                                                                   // 55
  hasWhere: function () {                                                                                              // 56
    return this._hasWhere;                                                                                             // 57
  },                                                                                                                   // 58
  isSimple: function () {                                                                                              // 59
    return this._isSimple;                                                                                             // 60
  },                                                                                                                   // 61
  // Given a selector, return a function that takes one argument, a                                                    // 63
  // document. It returns a result object.                                                                             // 64
  _compileSelector: function (selector) {                                                                              // 65
    var self = this; // you can pass a literal function instead of a selector                                          // 66
                                                                                                                       //
    if (selector instanceof Function) {                                                                                // 68
      self._isSimple = false;                                                                                          // 69
      self._selector = selector;                                                                                       // 70
                                                                                                                       //
      self._recordPathUsed('');                                                                                        // 71
                                                                                                                       //
      return function (doc) {                                                                                          // 72
        return {                                                                                                       // 73
          result: !!selector.call(doc)                                                                                 // 73
        };                                                                                                             // 73
      };                                                                                                               // 74
    } // shorthand -- scalars match _id                                                                                // 75
                                                                                                                       //
                                                                                                                       //
    if (LocalCollection._selectorIsId(selector)) {                                                                     // 78
      self._selector = {                                                                                               // 79
        _id: selector                                                                                                  // 79
      };                                                                                                               // 79
                                                                                                                       //
      self._recordPathUsed('_id');                                                                                     // 80
                                                                                                                       //
      return function (doc) {                                                                                          // 81
        return {                                                                                                       // 82
          result: EJSON.equals(doc._id, selector)                                                                      // 82
        };                                                                                                             // 82
      };                                                                                                               // 83
    } // protect against dangerous selectors.  falsey and {_id: falsey} are both                                       // 84
    // likely programmer error, and not what you want, particularly for                                                // 87
    // destructive operations.                                                                                         // 88
                                                                                                                       //
                                                                                                                       //
    if (!selector || '_id' in selector && !selector._id) {                                                             // 89
      self._isSimple = false;                                                                                          // 90
      return nothingMatcher;                                                                                           // 91
    } // Top level can't be an array or true or binary.                                                                // 92
                                                                                                                       //
                                                                                                                       //
    if (typeof selector === 'boolean' || isArray(selector) || EJSON.isBinary(selector)) throw new Error("Invalid selector: " + selector);
    self._selector = EJSON.clone(selector);                                                                            // 99
    return compileDocumentSelector(selector, self, {                                                                   // 100
      isRoot: true                                                                                                     // 100
    });                                                                                                                // 100
  },                                                                                                                   // 101
  _recordPathUsed: function (path) {                                                                                   // 102
    this._paths[path] = true;                                                                                          // 103
  },                                                                                                                   // 104
  // Returns a list of key paths the given selector is looking for. It includes                                        // 105
  // the empty string if there is a $where.                                                                            // 106
  _getPaths: function () {                                                                                             // 107
    return _.keys(this._paths);                                                                                        // 108
  }                                                                                                                    // 109
}); // Takes in a selector that could match a full document (eg, the original                                          // 46
// selector). Returns a function mapping document->result object.                                                      // 114
//                                                                                                                     // 115
// matcher is the Matcher object we are compiling.                                                                     // 116
//                                                                                                                     // 117
// If this is the root document selector (ie, not wrapped in $and or the like),                                        // 118
// then isRoot is true. (This is used by $near.)                                                                       // 119
                                                                                                                       //
                                                                                                                       //
var compileDocumentSelector = function (docSelector, matcher, options) {                                               // 120
  options = options || {};                                                                                             // 121
  var docMatchers = [];                                                                                                // 122
                                                                                                                       //
  _.each(docSelector, function (subSelector, key) {                                                                    // 123
    if (key.substr(0, 1) === '$') {                                                                                    // 124
      // Outer operators are either logical operators (they recurse back into                                          // 125
      // this function), or $where.                                                                                    // 126
      if (!_.has(LOGICAL_OPERATORS, key)) throw new Error("Unrecognized logical operator: " + key);                    // 127
      matcher._isSimple = false;                                                                                       // 129
      docMatchers.push(LOGICAL_OPERATORS[key](subSelector, matcher, options.inElemMatch));                             // 130
    } else {                                                                                                           // 132
      // Record this path, but only if we aren't in an elemMatcher, since in an                                        // 133
      // elemMatch this is a path inside an object in an array, not in the doc                                         // 134
      // root.                                                                                                         // 135
      if (!options.inElemMatch) matcher._recordPathUsed(key);                                                          // 136
      var lookUpByIndex = makeLookupFunction(key);                                                                     // 138
      var valueMatcher = compileValueSelector(subSelector, matcher, options.isRoot);                                   // 139
      docMatchers.push(function (doc) {                                                                                // 141
        var branchValues = lookUpByIndex(doc);                                                                         // 142
        return valueMatcher(branchValues);                                                                             // 143
      });                                                                                                              // 144
    }                                                                                                                  // 145
  });                                                                                                                  // 146
                                                                                                                       //
  return andDocumentMatchers(docMatchers);                                                                             // 148
}; // Takes in a selector that could match a key-indexed value in a document; eg,                                      // 149
// {$gt: 5, $lt: 9}, or a regular expression, or any non-expression object (to                                         // 152
// indicate equality).  Returns a branched matcher: a function mapping                                                 // 153
// [branched value]->result object.                                                                                    // 154
                                                                                                                       //
                                                                                                                       //
var compileValueSelector = function (valueSelector, matcher, isRoot) {                                                 // 155
  if (valueSelector instanceof RegExp) {                                                                               // 156
    matcher._isSimple = false;                                                                                         // 157
    return convertElementMatcherToBranchedMatcher(regexpElementMatcher(valueSelector));                                // 158
  } else if (isOperatorObject(valueSelector)) {                                                                        // 160
    return operatorBranchedMatcher(valueSelector, matcher, isRoot);                                                    // 161
  } else {                                                                                                             // 162
    return convertElementMatcherToBranchedMatcher(equalityElementMatcher(valueSelector));                              // 163
  }                                                                                                                    // 165
}; // Given an element matcher (which evaluates a single value), returns a branched                                    // 166
// value (which evaluates the element matcher on all the branches and returns a                                        // 169
// more structured return value possibly including arrayIndices).                                                      // 170
                                                                                                                       //
                                                                                                                       //
var convertElementMatcherToBranchedMatcher = function (elementMatcher, options) {                                      // 171
  options = options || {};                                                                                             // 173
  return function (branches) {                                                                                         // 174
    var expanded = branches;                                                                                           // 175
                                                                                                                       //
    if (!options.dontExpandLeafArrays) {                                                                               // 176
      expanded = expandArraysInBranches(branches, options.dontIncludeLeafArrays);                                      // 177
    }                                                                                                                  // 179
                                                                                                                       //
    var ret = {};                                                                                                      // 180
    ret.result = _.any(expanded, function (element) {                                                                  // 181
      var matched = elementMatcher(element.value); // Special case for $elemMatch: it means "true, and use this as an array
      // index if I didn't already have one".                                                                          // 185
                                                                                                                       //
      if (typeof matched === 'number') {                                                                               // 186
        // XXX This code dates from when we only stored a single array index                                           // 187
        // (for the outermost array). Should we be also including deeper array                                         // 188
        // indices from the $elemMatch match?                                                                          // 189
        if (!element.arrayIndices) element.arrayIndices = [matched];                                                   // 190
        matched = true;                                                                                                // 192
      } // If some element matched, and it's tagged with array indices, include                                        // 193
      // those indices in our result object.                                                                           // 196
                                                                                                                       //
                                                                                                                       //
      if (matched && element.arrayIndices) ret.arrayIndices = element.arrayIndices;                                    // 197
      return matched;                                                                                                  // 200
    });                                                                                                                // 201
    return ret;                                                                                                        // 202
  };                                                                                                                   // 203
}; // Takes a RegExp object and returns an element matcher.                                                            // 204
                                                                                                                       //
                                                                                                                       //
regexpElementMatcher = function (regexp) {                                                                             // 207
  return function (value) {                                                                                            // 208
    if (value instanceof RegExp) {                                                                                     // 209
      // Comparing two regexps means seeing if the regexps are identical                                               // 210
      // (really!). Underscore knows how.                                                                              // 211
      return _.isEqual(value, regexp);                                                                                 // 212
    } // Regexps only work against strings.                                                                            // 213
                                                                                                                       //
                                                                                                                       //
    if (typeof value !== 'string') return false; // Reset regexp's state to avoid inconsistent matching for objects with the
    // same value on consecutive calls of regexp.test. This happens only if the                                        // 219
    // regexp has the 'g' flag. Also note that ES6 introduces a new flag 'y' for                                       // 220
    // which we should *not* change the lastIndex but MongoDB doesn't support                                          // 221
    // either of these flags.                                                                                          // 222
                                                                                                                       //
    regexp.lastIndex = 0;                                                                                              // 223
    return regexp.test(value);                                                                                         // 225
  };                                                                                                                   // 226
}; // Takes something that is not an operator object and returns an element matcher                                    // 227
// for equality with that thing.                                                                                       // 230
                                                                                                                       //
                                                                                                                       //
equalityElementMatcher = function (elementSelector) {                                                                  // 231
  if (isOperatorObject(elementSelector)) throw Error("Can't create equalityValueSelector for operator object"); // Special-case: null and undefined are equal (if you got undefined in there
  // somewhere, or if you got it due to some branch being non-existent in the                                          // 236
  // weird special case), even though they aren't with EJSON.equals.                                                   // 237
                                                                                                                       //
  if (elementSelector == null) {                                                                                       // 238
    // undefined or null                                                                                               // 238
    return function (value) {                                                                                          // 239
      return value == null; // undefined or null                                                                       // 240
    };                                                                                                                 // 241
  }                                                                                                                    // 242
                                                                                                                       //
  return function (value) {                                                                                            // 244
    return LocalCollection._f._equal(elementSelector, value);                                                          // 245
  };                                                                                                                   // 246
}; // Takes an operator object (an object with $ keys) and returns a branched                                          // 247
// matcher for it.                                                                                                     // 250
                                                                                                                       //
                                                                                                                       //
var operatorBranchedMatcher = function (valueSelector, matcher, isRoot) {                                              // 251
  // Each valueSelector works separately on the various branches.  So one                                              // 252
  // operator can match one branch and another can match another branch.  This                                         // 253
  // is OK.                                                                                                            // 254
  var operatorMatchers = [];                                                                                           // 256
                                                                                                                       //
  _.each(valueSelector, function (operand, operator) {                                                                 // 257
    var simpleRange = _.contains(['$lt', '$lte', '$gt', '$gte'], operator) && _.isNumber(operand);                     // 258
                                                                                                                       //
    var simpleEquality = _.contains(['$ne', '$eq'], operator) && !_.isObject(operand);                                 // 260
    var simpleInclusion = _.contains(['$in', '$nin'], operator) && _.isArray(operand) && !_.any(operand, _.isObject);  // 261
                                                                                                                       //
    if (!(simpleRange || simpleInclusion || simpleEquality)) {                                                         // 264
      matcher._isSimple = false;                                                                                       // 265
    }                                                                                                                  // 266
                                                                                                                       //
    if (_.has(VALUE_OPERATORS, operator)) {                                                                            // 268
      operatorMatchers.push(VALUE_OPERATORS[operator](operand, valueSelector, matcher, isRoot));                       // 269
    } else if (_.has(ELEMENT_OPERATORS, operator)) {                                                                   // 271
      var options = ELEMENT_OPERATORS[operator];                                                                       // 272
      operatorMatchers.push(convertElementMatcherToBranchedMatcher(options.compileElementSelector(operand, valueSelector, matcher), options));
    } else {                                                                                                           // 278
      throw new Error("Unrecognized operator: " + operator);                                                           // 279
    }                                                                                                                  // 280
  });                                                                                                                  // 281
                                                                                                                       //
  return andBranchedMatchers(operatorMatchers);                                                                        // 283
};                                                                                                                     // 284
                                                                                                                       //
var compileArrayOfDocumentSelectors = function (selectors, matcher, inElemMatch) {                                     // 286
  if (!isArray(selectors) || _.isEmpty(selectors)) throw Error("$and/$or/$nor must be nonempty array");                // 288
  return _.map(selectors, function (subSelector) {                                                                     // 290
    if (!isPlainObject(subSelector)) throw Error("$or/$and/$nor entries need to be full objects");                     // 291
    return compileDocumentSelector(subSelector, matcher, {                                                             // 293
      inElemMatch: inElemMatch                                                                                         // 294
    });                                                                                                                // 294
  });                                                                                                                  // 295
}; // Operators that appear at the top level of a document selector.                                                   // 296
                                                                                                                       //
                                                                                                                       //
var LOGICAL_OPERATORS = {                                                                                              // 299
  $and: function (subSelector, matcher, inElemMatch) {                                                                 // 300
    var matchers = compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch);                                 // 301
    return andDocumentMatchers(matchers);                                                                              // 303
  },                                                                                                                   // 304
  $or: function (subSelector, matcher, inElemMatch) {                                                                  // 306
    var matchers = compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch); // Special case: if there is only one matcher, use it directly, *preserving*
    // any arrayIndices it returns.                                                                                    // 311
                                                                                                                       //
    if (matchers.length === 1) return matchers[0];                                                                     // 312
    return function (doc) {                                                                                            // 315
      var result = _.any(matchers, function (f) {                                                                      // 316
        return f(doc).result;                                                                                          // 317
      }); // $or does NOT set arrayIndices when it has multiple                                                        // 318
      // sub-expressions. (Tested against MongoDB.)                                                                    // 320
                                                                                                                       //
                                                                                                                       //
      return {                                                                                                         // 321
        result: result                                                                                                 // 321
      };                                                                                                               // 321
    };                                                                                                                 // 322
  },                                                                                                                   // 323
  $nor: function (subSelector, matcher, inElemMatch) {                                                                 // 325
    var matchers = compileArrayOfDocumentSelectors(subSelector, matcher, inElemMatch);                                 // 326
    return function (doc) {                                                                                            // 328
      var result = _.all(matchers, function (f) {                                                                      // 329
        return !f(doc).result;                                                                                         // 330
      }); // Never set arrayIndices, because we only match if nothing in particular                                    // 331
      // "matched" (and because this is consistent with MongoDB).                                                      // 333
                                                                                                                       //
                                                                                                                       //
      return {                                                                                                         // 334
        result: result                                                                                                 // 334
      };                                                                                                               // 334
    };                                                                                                                 // 335
  },                                                                                                                   // 336
  $where: function (selectorValue, matcher) {                                                                          // 338
    // Record that *any* path may be used.                                                                             // 339
    matcher._recordPathUsed('');                                                                                       // 340
                                                                                                                       //
    matcher._hasWhere = true;                                                                                          // 341
                                                                                                                       //
    if (!(selectorValue instanceof Function)) {                                                                        // 342
      // XXX MongoDB seems to have more complex logic to decide where or or not                                        // 343
      // to add "return"; not sure exactly what it is.                                                                 // 344
      selectorValue = Function("obj", "return " + selectorValue);                                                      // 345
    }                                                                                                                  // 346
                                                                                                                       //
    return function (doc) {                                                                                            // 347
      // We make the document available as both `this` and `obj`.                                                      // 348
      // XXX not sure what we should do if this throws                                                                 // 349
      return {                                                                                                         // 350
        result: selectorValue.call(doc, doc)                                                                           // 350
      };                                                                                                               // 350
    };                                                                                                                 // 351
  },                                                                                                                   // 352
  // This is just used as a comment in the query (in MongoDB, it also ends up in                                       // 354
  // query logs); it has no effect on the actual selection.                                                            // 355
  $comment: function () {                                                                                              // 356
    return function () {                                                                                               // 357
      return {                                                                                                         // 358
        result: true                                                                                                   // 358
      };                                                                                                               // 358
    };                                                                                                                 // 359
  }                                                                                                                    // 360
}; // Returns a branched matcher that matches iff the given matcher does not.                                          // 299
// Note that this implicitly "deMorganizes" the wrapped function.  ie, it                                              // 364
// means that ALL branch values need to fail to match innerBranchedMatcher.                                            // 365
                                                                                                                       //
var invertBranchedMatcher = function (branchedMatcher) {                                                               // 366
  return function (branchValues) {                                                                                     // 367
    var invertMe = branchedMatcher(branchValues); // We explicitly choose to strip arrayIndices here: it doesn't make sense to
    // say "update the array element that does not match something", at least                                          // 370
    // in mongo-land.                                                                                                  // 371
                                                                                                                       //
    return {                                                                                                           // 372
      result: !invertMe.result                                                                                         // 372
    };                                                                                                                 // 372
  };                                                                                                                   // 373
}; // Operators that (unlike LOGICAL_OPERATORS) pertain to individual paths in a                                       // 374
// document, but (unlike ELEMENT_OPERATORS) do not have a simple definition as                                         // 377
// "match each branched value independently and combine with                                                           // 378
// convertElementMatcherToBranchedMatcher".                                                                            // 379
                                                                                                                       //
                                                                                                                       //
var VALUE_OPERATORS = {                                                                                                // 380
  $eq: function (operand) {                                                                                            // 381
    return convertElementMatcherToBranchedMatcher(equalityElementMatcher(operand));                                    // 382
  },                                                                                                                   // 384
  $not: function (operand, valueSelector, matcher) {                                                                   // 385
    return invertBranchedMatcher(compileValueSelector(operand, matcher));                                              // 386
  },                                                                                                                   // 387
  $ne: function (operand) {                                                                                            // 388
    return invertBranchedMatcher(convertElementMatcherToBranchedMatcher(equalityElementMatcher(operand)));             // 389
  },                                                                                                                   // 391
  $nin: function (operand) {                                                                                           // 392
    return invertBranchedMatcher(convertElementMatcherToBranchedMatcher(ELEMENT_OPERATORS.$in.compileElementSelector(operand)));
  },                                                                                                                   // 395
  $exists: function (operand) {                                                                                        // 396
    var exists = convertElementMatcherToBranchedMatcher(function (value) {                                             // 397
      return value !== undefined;                                                                                      // 398
    });                                                                                                                // 399
    return operand ? exists : invertBranchedMatcher(exists);                                                           // 400
  },                                                                                                                   // 401
  // $options just provides options for $regex; its logic is inside $regex                                             // 402
  $options: function (operand, valueSelector) {                                                                        // 403
    if (!_.has(valueSelector, '$regex')) throw Error("$options needs a $regex");                                       // 404
    return everythingMatcher;                                                                                          // 406
  },                                                                                                                   // 407
  // $maxDistance is basically an argument to $near                                                                    // 408
  $maxDistance: function (operand, valueSelector) {                                                                    // 409
    if (!valueSelector.$near) throw Error("$maxDistance needs a $near");                                               // 410
    return everythingMatcher;                                                                                          // 412
  },                                                                                                                   // 413
  $all: function (operand, valueSelector, matcher) {                                                                   // 414
    if (!isArray(operand)) throw Error("$all requires array"); // Not sure why, but this seems to be what MongoDB does.
                                                                                                                       //
    if (_.isEmpty(operand)) return nothingMatcher;                                                                     // 418
    var branchedMatchers = [];                                                                                         // 421
                                                                                                                       //
    _.each(operand, function (criterion) {                                                                             // 422
      // XXX handle $all/$elemMatch combination                                                                        // 423
      if (isOperatorObject(criterion)) throw Error("no $ expressions in $all"); // This is always a regexp or equality selector.
                                                                                                                       //
      branchedMatchers.push(compileValueSelector(criterion, matcher));                                                 // 427
    }); // andBranchedMatchers does NOT require all selectors to return true on the                                    // 428
    // SAME branch.                                                                                                    // 430
                                                                                                                       //
                                                                                                                       //
    return andBranchedMatchers(branchedMatchers);                                                                      // 431
  },                                                                                                                   // 432
  $near: function (operand, valueSelector, matcher, isRoot) {                                                          // 433
    if (!isRoot) throw Error("$near can't be inside another $ operator");                                              // 434
    matcher._hasGeoQuery = true; // There are two kinds of geodata in MongoDB: coordinate pairs and                    // 436
    // GeoJSON. They use different distance metrics, too. GeoJSON queries are                                          // 439
    // marked with a $geometry property.                                                                               // 440
                                                                                                                       //
    var maxDistance, point, distance;                                                                                  // 442
                                                                                                                       //
    if (isPlainObject(operand) && _.has(operand, '$geometry')) {                                                       // 443
      // GeoJSON "2dsphere" mode.                                                                                      // 444
      maxDistance = operand.$maxDistance;                                                                              // 445
      point = operand.$geometry;                                                                                       // 446
                                                                                                                       //
      distance = function (value) {                                                                                    // 447
        // XXX: for now, we don't calculate the actual distance between, say,                                          // 448
        // polygon and circle. If people care about this use-case it will get                                          // 449
        // a priority.                                                                                                 // 450
        if (!value || !value.type) return null;                                                                        // 451
                                                                                                                       //
        if (value.type === "Point") {                                                                                  // 453
          return GeoJSON.pointDistance(point, value);                                                                  // 454
        } else {                                                                                                       // 455
          return GeoJSON.geometryWithinRadius(value, point, maxDistance) ? 0 : maxDistance + 1;                        // 456
        }                                                                                                              // 458
      };                                                                                                               // 459
    } else {                                                                                                           // 460
      maxDistance = valueSelector.$maxDistance;                                                                        // 461
      if (!isArray(operand) && !isPlainObject(operand)) throw Error("$near argument must be coordinate pair or GeoJSON");
      point = pointToArray(operand);                                                                                   // 464
                                                                                                                       //
      distance = function (value) {                                                                                    // 465
        if (!isArray(value) && !isPlainObject(value)) return null;                                                     // 466
        return distanceCoordinatePairs(point, value);                                                                  // 468
      };                                                                                                               // 469
    }                                                                                                                  // 470
                                                                                                                       //
    return function (branchedValues) {                                                                                 // 472
      // There might be multiple points in the document that match the given                                           // 473
      // field. Only one of them needs to be within $maxDistance, but we need to                                       // 474
      // evaluate all of them and use the nearest one for the implicit sort                                            // 475
      // specifier. (That's why we can't just use ELEMENT_OPERATORS here.)                                             // 476
      //                                                                                                               // 477
      // Note: This differs from MongoDB's implementation, where a document will                                       // 478
      // actually show up *multiple times* in the result set, with one entry for                                       // 479
      // each within-$maxDistance branching point.                                                                     // 480
      branchedValues = expandArraysInBranches(branchedValues);                                                         // 481
      var result = {                                                                                                   // 482
        result: false                                                                                                  // 482
      };                                                                                                               // 482
                                                                                                                       //
      _.each(branchedValues, function (branch) {                                                                       // 483
        var curDistance = distance(branch.value); // Skip branches that aren't real points or are too far away.        // 484
                                                                                                                       //
        if (curDistance === null || curDistance > maxDistance) return; // Skip anything that's a tie.                  // 486
                                                                                                                       //
        if (result.distance !== undefined && result.distance <= curDistance) return;                                   // 489
        result.result = true;                                                                                          // 491
        result.distance = curDistance;                                                                                 // 492
        if (!branch.arrayIndices) delete result.arrayIndices;else result.arrayIndices = branch.arrayIndices;           // 493
      });                                                                                                              // 497
                                                                                                                       //
      return result;                                                                                                   // 498
    };                                                                                                                 // 499
  }                                                                                                                    // 500
}; // Helpers for $near.                                                                                               // 380
                                                                                                                       //
var distanceCoordinatePairs = function (a, b) {                                                                        // 504
  a = pointToArray(a);                                                                                                 // 505
  b = pointToArray(b);                                                                                                 // 506
  var x = a[0] - b[0];                                                                                                 // 507
  var y = a[1] - b[1];                                                                                                 // 508
  if (_.isNaN(x) || _.isNaN(y)) return null;                                                                           // 509
  return Math.sqrt(x * x + y * y);                                                                                     // 511
}; // Makes sure we get 2 elements array and assume the first one to be x and                                          // 512
// the second one to y no matter what user passes.                                                                     // 514
// In case user passes { lon: x, lat: y } returns [x, y]                                                               // 515
                                                                                                                       //
                                                                                                                       //
var pointToArray = function (point) {                                                                                  // 516
  return _.map(point, _.identity);                                                                                     // 517
}; // Helper for $lt/$gt/$lte/$gte.                                                                                    // 518
                                                                                                                       //
                                                                                                                       //
var makeInequality = function (cmpValueComparator) {                                                                   // 521
  return {                                                                                                             // 522
    compileElementSelector: function (operand) {                                                                       // 523
      // Arrays never compare false with non-arrays for any inequality.                                                // 524
      // XXX This was behavior we observed in pre-release MongoDB 2.5, but                                             // 525
      //     it seems to have been reverted.                                                                           // 526
      //     See https://jira.mongodb.org/browse/SERVER-11444                                                          // 527
      if (isArray(operand)) {                                                                                          // 528
        return function () {                                                                                           // 529
          return false;                                                                                                // 530
        };                                                                                                             // 531
      } // Special case: consider undefined and null the same (so true with                                            // 532
      // $gte/$lte).                                                                                                   // 535
                                                                                                                       //
                                                                                                                       //
      if (operand === undefined) operand = null;                                                                       // 536
                                                                                                                       //
      var operandType = LocalCollection._f._type(operand);                                                             // 539
                                                                                                                       //
      return function (value) {                                                                                        // 541
        if (value === undefined) value = null; // Comparisons are never true among things of different type (except    // 542
        // null vs undefined).                                                                                         // 545
                                                                                                                       //
        if (LocalCollection._f._type(value) !== operandType) return false;                                             // 546
        return cmpValueComparator(LocalCollection._f._cmp(value, operand));                                            // 548
      };                                                                                                               // 549
    }                                                                                                                  // 550
  };                                                                                                                   // 522
}; // Each element selector contains:                                                                                  // 552
//  - compileElementSelector, a function with args:                                                                    // 555
//    - operand - the "right hand side" of the operator                                                                // 556
//    - valueSelector - the "context" for the operator (so that $regex can find                                        // 557
//      $options)                                                                                                      // 558
//    - matcher - the Matcher this is going into (so that $elemMatch can compile                                       // 559
//      more things)                                                                                                   // 560
//    returning a function mapping a single value to bool.                                                             // 561
//  - dontExpandLeafArrays, a bool which prevents expandArraysInBranches from                                          // 562
//    being called                                                                                                     // 563
//  - dontIncludeLeafArrays, a bool which causes an argument to be passed to                                           // 564
//    expandArraysInBranches if it is called                                                                           // 565
                                                                                                                       //
                                                                                                                       //
ELEMENT_OPERATORS = {                                                                                                  // 566
  $lt: makeInequality(function (cmpValue) {                                                                            // 567
    return cmpValue < 0;                                                                                               // 568
  }),                                                                                                                  // 569
  $gt: makeInequality(function (cmpValue) {                                                                            // 570
    return cmpValue > 0;                                                                                               // 571
  }),                                                                                                                  // 572
  $lte: makeInequality(function (cmpValue) {                                                                           // 573
    return cmpValue <= 0;                                                                                              // 574
  }),                                                                                                                  // 575
  $gte: makeInequality(function (cmpValue) {                                                                           // 576
    return cmpValue >= 0;                                                                                              // 577
  }),                                                                                                                  // 578
  $mod: {                                                                                                              // 579
    compileElementSelector: function (operand) {                                                                       // 580
      if (!(isArray(operand) && operand.length === 2 && typeof operand[0] === 'number' && typeof operand[1] === 'number')) {
        throw Error("argument to $mod must be an array of two numbers");                                               // 584
      } // XXX could require to be ints or round or something                                                          // 585
                                                                                                                       //
                                                                                                                       //
      var divisor = operand[0];                                                                                        // 587
      var remainder = operand[1];                                                                                      // 588
      return function (value) {                                                                                        // 589
        return typeof value === 'number' && value % divisor === remainder;                                             // 590
      };                                                                                                               // 591
    }                                                                                                                  // 592
  },                                                                                                                   // 579
  $in: {                                                                                                               // 594
    compileElementSelector: function (operand) {                                                                       // 595
      if (!isArray(operand)) throw Error("$in needs an array");                                                        // 596
      var elementMatchers = [];                                                                                        // 599
                                                                                                                       //
      _.each(operand, function (option) {                                                                              // 600
        if (option instanceof RegExp) elementMatchers.push(regexpElementMatcher(option));else if (isOperatorObject(option)) throw Error("cannot nest $ under $in");else elementMatchers.push(equalityElementMatcher(option));
      });                                                                                                              // 607
                                                                                                                       //
      return function (value) {                                                                                        // 609
        // Allow {a: {$in: [null]}} to match when 'a' does not exist.                                                  // 610
        if (value === undefined) value = null;                                                                         // 611
        return _.any(elementMatchers, function (e) {                                                                   // 613
          return e(value);                                                                                             // 614
        });                                                                                                            // 615
      };                                                                                                               // 616
    }                                                                                                                  // 617
  },                                                                                                                   // 594
  $size: {                                                                                                             // 619
    // {a: [[5, 5]]} must match {a: {$size: 1}} but not {a: {$size: 2}}, so we                                         // 620
    // don't want to consider the element [5,5] in the leaf array [[5,5]] as a                                         // 621
    // possible value.                                                                                                 // 622
    dontExpandLeafArrays: true,                                                                                        // 623
    compileElementSelector: function (operand) {                                                                       // 624
      if (typeof operand === 'string') {                                                                               // 625
        // Don't ask me why, but by experimentation, this seems to be what Mongo                                       // 626
        // does.                                                                                                       // 627
        operand = 0;                                                                                                   // 628
      } else if (typeof operand !== 'number') {                                                                        // 629
        throw Error("$size needs a number");                                                                           // 630
      }                                                                                                                // 631
                                                                                                                       //
      return function (value) {                                                                                        // 632
        return isArray(value) && value.length === operand;                                                             // 633
      };                                                                                                               // 634
    }                                                                                                                  // 635
  },                                                                                                                   // 619
  $type: {                                                                                                             // 637
    // {a: [5]} must not match {a: {$type: 4}} (4 means array), but it should                                          // 638
    // match {a: {$type: 1}} (1 means number), and {a: [[5]]} must match {$a:                                          // 639
    // {$type: 4}}. Thus, when we see a leaf array, we *should* expand it but                                          // 640
    // should *not* include it itself.                                                                                 // 641
    dontIncludeLeafArrays: true,                                                                                       // 642
    compileElementSelector: function (operand) {                                                                       // 643
      if (typeof operand !== 'number') throw Error("$type needs a number");                                            // 644
      return function (value) {                                                                                        // 646
        return value !== undefined && LocalCollection._f._type(value) === operand;                                     // 647
      };                                                                                                               // 649
    }                                                                                                                  // 650
  },                                                                                                                   // 637
  $regex: {                                                                                                            // 652
    compileElementSelector: function (operand, valueSelector) {                                                        // 653
      if (!(typeof operand === 'string' || operand instanceof RegExp)) throw Error("$regex has to be a string or RegExp");
      var regexp;                                                                                                      // 657
                                                                                                                       //
      if (valueSelector.$options !== undefined) {                                                                      // 658
        // Options passed in $options (even the empty string) always overrides                                         // 659
        // options in the RegExp object itself. (See also                                                              // 660
        // Mongo.Collection._rewriteSelector.)                                                                         // 661
        // Be clear that we only support the JS-supported options, not extended                                        // 663
        // ones (eg, Mongo supports x and s). Ideally we would implement x and s                                       // 664
        // by transforming the regexp, but not today...                                                                // 665
        if (/[^gim]/.test(valueSelector.$options)) throw new Error("Only the i, m, and g regexp options are supported");
        var regexSource = operand instanceof RegExp ? operand.source : operand;                                        // 669
        regexp = new RegExp(regexSource, valueSelector.$options);                                                      // 670
      } else if (operand instanceof RegExp) {                                                                          // 671
        regexp = operand;                                                                                              // 672
      } else {                                                                                                         // 673
        regexp = new RegExp(operand);                                                                                  // 674
      }                                                                                                                // 675
                                                                                                                       //
      return regexpElementMatcher(regexp);                                                                             // 676
    }                                                                                                                  // 677
  },                                                                                                                   // 652
  $elemMatch: {                                                                                                        // 679
    dontExpandLeafArrays: true,                                                                                        // 680
    compileElementSelector: function (operand, valueSelector, matcher) {                                               // 681
      if (!isPlainObject(operand)) throw Error("$elemMatch need an object");                                           // 682
      var subMatcher, isDocMatcher;                                                                                    // 685
                                                                                                                       //
      if (isOperatorObject(_.omit(operand, _.keys(LOGICAL_OPERATORS)), true)) {                                        // 686
        subMatcher = compileValueSelector(operand, matcher);                                                           // 687
        isDocMatcher = false;                                                                                          // 688
      } else {                                                                                                         // 689
        // This is NOT the same as compileValueSelector(operand), and not just                                         // 690
        // because of the slightly different calling convention.                                                       // 691
        // {$elemMatch: {x: 3}} means "an element has a field x:3", not                                                // 692
        // "consists only of a field x:3". Also, regexps and sub-$ are allowed.                                        // 693
        subMatcher = compileDocumentSelector(operand, matcher, {                                                       // 694
          inElemMatch: true                                                                                            // 695
        });                                                                                                            // 695
        isDocMatcher = true;                                                                                           // 696
      }                                                                                                                // 697
                                                                                                                       //
      return function (value) {                                                                                        // 699
        if (!isArray(value)) return false;                                                                             // 700
                                                                                                                       //
        for (var i = 0; i < value.length; ++i) {                                                                       // 702
          var arrayElement = value[i];                                                                                 // 703
          var arg;                                                                                                     // 704
                                                                                                                       //
          if (isDocMatcher) {                                                                                          // 705
            // We can only match {$elemMatch: {b: 3}} against objects.                                                 // 706
            // (We can also match against arrays, if there's numeric indices,                                          // 707
            // eg {$elemMatch: {'0.b': 3}} or {$elemMatch: {0: 3}}.)                                                   // 708
            if (!isPlainObject(arrayElement) && !isArray(arrayElement)) return false;                                  // 709
            arg = arrayElement;                                                                                        // 711
          } else {                                                                                                     // 712
            // dontIterate ensures that {a: {$elemMatch: {$gt: 5}}} matches                                            // 713
            // {a: [8]} but not {a: [[8]]}                                                                             // 714
            arg = [{                                                                                                   // 715
              value: arrayElement,                                                                                     // 715
              dontIterate: true                                                                                        // 715
            }];                                                                                                        // 715
          } // XXX support $near in $elemMatch by propagating $distance?                                               // 716
                                                                                                                       //
                                                                                                                       //
          if (subMatcher(arg).result) return i; // specially understood to mean "use as arrayIndices"                  // 718
        }                                                                                                              // 720
                                                                                                                       //
        return false;                                                                                                  // 721
      };                                                                                                               // 722
    }                                                                                                                  // 723
  }                                                                                                                    // 679
}; // makeLookupFunction(key) returns a lookup function.                                                               // 566
//                                                                                                                     // 728
// A lookup function takes in a document and returns an array of matching                                              // 729
// branches.  If no arrays are found while looking up the key, this array will                                         // 730
// have exactly one branches (possibly 'undefined', if some segment of the key                                         // 731
// was not found).                                                                                                     // 732
//                                                                                                                     // 733
// If arrays are found in the middle, this can have more than one element, since                                       // 734
// we "branch". When we "branch", if there are more key segments to look up,                                           // 735
// then we only pursue branches that are plain objects (not arrays or scalars).                                        // 736
// This means we can actually end up with no branches!                                                                 // 737
//                                                                                                                     // 738
// We do *NOT* branch on arrays that are found at the end (ie, at the last                                             // 739
// dotted member of the key). We just return that array; if you want to                                                // 740
// effectively "branch" over the array's values, post-process the lookup                                               // 741
// function with expandArraysInBranches.                                                                               // 742
//                                                                                                                     // 743
// Each branch is an object with keys:                                                                                 // 744
//  - value: the value at the branch                                                                                   // 745
//  - dontIterate: an optional bool; if true, it means that 'value' is an array                                        // 746
//    that expandArraysInBranches should NOT expand. This specifically happens                                         // 747
//    when there is a numeric index in the key, and ensures the                                                        // 748
//    perhaps-surprising MongoDB behavior where {'a.0': 5} does NOT                                                    // 749
//    match {a: [[5]]}.                                                                                                // 750
//  - arrayIndices: if any array indexing was done during lookup (either due to                                        // 751
//    explicit numeric indices or implicit branching), this will be an array of                                        // 752
//    the array indices used, from outermost to innermost; it is falsey or                                             // 753
//    absent if no array index is used. If an explicit numeric index is used,                                          // 754
//    the index will be followed in arrayIndices by the string 'x'.                                                    // 755
//                                                                                                                     // 756
//    Note: arrayIndices is used for two purposes. First, it is used to                                                // 757
//    implement the '$' modifier feature, which only ever looks at its first                                           // 758
//    element.                                                                                                         // 759
//                                                                                                                     // 760
//    Second, it is used for sort key generation, which needs to be able to tell                                       // 761
//    the difference between different paths. Moreover, it needs to                                                    // 762
//    differentiate between explicit and implicit branching, which is why                                              // 763
//    there's the somewhat hacky 'x' entry: this means that explicit and                                               // 764
//    implicit array lookups will have different full arrayIndices paths. (That                                        // 765
//    code only requires that different paths have different arrayIndices; it                                          // 766
//    doesn't actually "parse" arrayIndices. As an alternative, arrayIndices                                           // 767
//    could contain objects with flags like "implicit", but I think that only                                          // 768
//    makes the code surrounding them more complex.)                                                                   // 769
//                                                                                                                     // 770
//    (By the way, this field ends up getting passed around a lot without                                              // 771
//    cloning, so never mutate any arrayIndices field/var in this package!)                                            // 772
//                                                                                                                     // 773
//                                                                                                                     // 774
// At the top level, you may only pass in a plain object or array.                                                     // 775
//                                                                                                                     // 776
// See the test 'minimongo - lookup' for some examples of what lookup functions                                        // 777
// return.                                                                                                             // 778
                                                                                                                       //
makeLookupFunction = function (key, options) {                                                                         // 779
  options = options || {};                                                                                             // 780
  var parts = key.split('.');                                                                                          // 781
  var firstPart = parts.length ? parts[0] : '';                                                                        // 782
  var firstPartIsNumeric = isNumericKey(firstPart);                                                                    // 783
  var nextPartIsNumeric = parts.length >= 2 && isNumericKey(parts[1]);                                                 // 784
  var lookupRest;                                                                                                      // 785
                                                                                                                       //
  if (parts.length > 1) {                                                                                              // 786
    lookupRest = makeLookupFunction(parts.slice(1).join('.'));                                                         // 787
  }                                                                                                                    // 788
                                                                                                                       //
  var omitUnnecessaryFields = function (retVal) {                                                                      // 790
    if (!retVal.dontIterate) delete retVal.dontIterate;                                                                // 791
    if (retVal.arrayIndices && !retVal.arrayIndices.length) delete retVal.arrayIndices;                                // 793
    return retVal;                                                                                                     // 795
  }; // Doc will always be a plain object or an array.                                                                 // 796
  // apply an explicit numeric index, an array.                                                                        // 799
                                                                                                                       //
                                                                                                                       //
  return function (doc, arrayIndices) {                                                                                // 800
    if (!arrayIndices) arrayIndices = [];                                                                              // 801
                                                                                                                       //
    if (isArray(doc)) {                                                                                                // 804
      // If we're being asked to do an invalid lookup into an array (non-integer                                       // 805
      // or out-of-bounds), return no results (which is different from returning                                       // 806
      // a single undefined result, in that `null` equality checks won't match).                                       // 807
      if (!(firstPartIsNumeric && firstPart < doc.length)) return []; // Remember that we used this array index. Include an 'x' to indicate that
      // the previous index came from being considered as an explicit array                                            // 812
      // index (not branching).                                                                                        // 813
                                                                                                                       //
      arrayIndices = arrayIndices.concat(+firstPart, 'x');                                                             // 814
    } // Do our first lookup.                                                                                          // 815
                                                                                                                       //
                                                                                                                       //
    var firstLevel = doc[firstPart]; // If there is no deeper to dig, return what we found.                            // 818
    //                                                                                                                 // 821
    // If what we found is an array, most value selectors will choose to treat                                         // 822
    // the elements of the array as matchable values in their own right, but                                           // 823
    // that's done outside of the lookup function. (Exceptions to this are $size                                       // 824
    // and stuff relating to $elemMatch.  eg, {a: {$size: 2}} does not match {a:                                       // 825
    // [[1, 2]]}.)                                                                                                     // 826
    //                                                                                                                 // 827
    // That said, if we just did an *explicit* array lookup (on doc) to find                                           // 828
    // firstLevel, and firstLevel is an array too, we do NOT want value                                                // 829
    // selectors to iterate over it.  eg, {'a.0': 5} does not match {a: [[5]]}.                                        // 830
    // So in that case, we mark the return value as "don't iterate".                                                   // 831
                                                                                                                       //
    if (!lookupRest) {                                                                                                 // 832
      return [omitUnnecessaryFields({                                                                                  // 833
        value: firstLevel,                                                                                             // 834
        dontIterate: isArray(doc) && isArray(firstLevel),                                                              // 835
        arrayIndices: arrayIndices                                                                                     // 836
      })];                                                                                                             // 833
    } // We need to dig deeper.  But if we can't, because what we've found is not                                      // 837
    // an array or plain object, we're done. If we just did a numeric index into                                       // 840
    // an array, we return nothing here (this is a change in Mongo 2.5 from                                            // 841
    // Mongo 2.4, where {'a.0.b': null} stopped matching {a: [5]}). Otherwise,                                         // 842
    // return a single `undefined` (which can, for example, match via equality                                         // 843
    // with `null`).                                                                                                   // 844
                                                                                                                       //
                                                                                                                       //
    if (!isIndexable(firstLevel)) {                                                                                    // 845
      if (isArray(doc)) return [];                                                                                     // 846
      return [omitUnnecessaryFields({                                                                                  // 848
        value: undefined,                                                                                              // 848
        arrayIndices: arrayIndices                                                                                     // 849
      })];                                                                                                             // 848
    }                                                                                                                  // 850
                                                                                                                       //
    var result = [];                                                                                                   // 852
                                                                                                                       //
    var appendToResult = function (more) {                                                                             // 853
      Array.prototype.push.apply(result, more);                                                                        // 854
    }; // Dig deeper: look up the rest of the parts on whatever we've found.                                           // 855
    // (lookupRest is smart enough to not try to do invalid lookups into                                               // 858
    // firstLevel if it's an array.)                                                                                   // 859
                                                                                                                       //
                                                                                                                       //
    appendToResult(lookupRest(firstLevel, arrayIndices)); // If we found an array, then in *addition* to potentially treating the next
    // part as a literal integer lookup, we should also "branch": try to look up                                       // 863
    // the rest of the parts on each array element in parallel.                                                        // 864
    //                                                                                                                 // 865
    // In this case, we *only* dig deeper into array elements that are plain                                           // 866
    // objects. (Recall that we only got this far if we have further to dig.)                                          // 867
    // This makes sense: we certainly don't dig deeper into non-indexable                                              // 868
    // objects. And it would be weird to dig into an array: it's simpler to have                                       // 869
    // a rule that explicit integer indexes only apply to an outer array, not to                                       // 870
    // an array you find after a branching search.                                                                     // 871
    //                                                                                                                 // 872
    // In the special case of a numeric part in a *sort selector* (not a query                                         // 873
    // selector), we skip the branching: we ONLY allow the numeric part to mean                                        // 874
    // "look up this index" in that case, not "also look up this index in all                                          // 875
    // the elements of the array".                                                                                     // 876
                                                                                                                       //
    if (isArray(firstLevel) && !(nextPartIsNumeric && options.forSort)) {                                              // 877
      _.each(firstLevel, function (branch, arrayIndex) {                                                               // 878
        if (isPlainObject(branch)) {                                                                                   // 879
          appendToResult(lookupRest(branch, arrayIndices.concat(arrayIndex)));                                         // 880
        }                                                                                                              // 883
      });                                                                                                              // 884
    }                                                                                                                  // 885
                                                                                                                       //
    return result;                                                                                                     // 887
  };                                                                                                                   // 888
};                                                                                                                     // 889
                                                                                                                       //
MinimongoTest.makeLookupFunction = makeLookupFunction;                                                                 // 890
                                                                                                                       //
expandArraysInBranches = function (branches, skipTheArrays) {                                                          // 892
  var branchesOut = [];                                                                                                // 893
                                                                                                                       //
  _.each(branches, function (branch) {                                                                                 // 894
    var thisIsArray = isArray(branch.value); // We include the branch itself, *UNLESS* we it's an array that we're going
    // to iterate and we're told to skip arrays.  (That's right, we include some                                       // 897
    // arrays even skipTheArrays is true: these are arrays that were found via                                         // 898
    // explicit numerical indices.)                                                                                    // 899
                                                                                                                       //
    if (!(skipTheArrays && thisIsArray && !branch.dontIterate)) {                                                      // 900
      branchesOut.push({                                                                                               // 901
        value: branch.value,                                                                                           // 902
        arrayIndices: branch.arrayIndices                                                                              // 903
      });                                                                                                              // 901
    }                                                                                                                  // 905
                                                                                                                       //
    if (thisIsArray && !branch.dontIterate) {                                                                          // 906
      _.each(branch.value, function (leaf, i) {                                                                        // 907
        branchesOut.push({                                                                                             // 908
          value: leaf,                                                                                                 // 909
          arrayIndices: (branch.arrayIndices || []).concat(i)                                                          // 910
        });                                                                                                            // 908
      });                                                                                                              // 912
    }                                                                                                                  // 913
  });                                                                                                                  // 914
                                                                                                                       //
  return branchesOut;                                                                                                  // 915
};                                                                                                                     // 916
                                                                                                                       //
var nothingMatcher = function (docOrBranchedValues) {                                                                  // 918
  return {                                                                                                             // 919
    result: false                                                                                                      // 919
  };                                                                                                                   // 919
};                                                                                                                     // 920
                                                                                                                       //
var everythingMatcher = function (docOrBranchedValues) {                                                               // 922
  return {                                                                                                             // 923
    result: true                                                                                                       // 923
  };                                                                                                                   // 923
}; // NB: We are cheating and using this function to implement "AND" for both                                          // 924
// "document matchers" and "branched matchers". They both return result objects                                        // 928
// but the argument is different: for the former it's a whole doc, whereas for                                         // 929
// the latter it's an array of "branched values".                                                                      // 930
                                                                                                                       //
                                                                                                                       //
var andSomeMatchers = function (subMatchers) {                                                                         // 931
  if (subMatchers.length === 0) return everythingMatcher;                                                              // 932
  if (subMatchers.length === 1) return subMatchers[0];                                                                 // 934
  return function (docOrBranches) {                                                                                    // 937
    var ret = {};                                                                                                      // 938
    ret.result = _.all(subMatchers, function (f) {                                                                     // 939
      var subResult = f(docOrBranches); // Copy a 'distance' number out of the first sub-matcher that has              // 940
      // one. Yes, this means that if there are multiple $near fields in a                                             // 942
      // query, something arbitrary happens; this appears to be consistent with                                        // 943
      // Mongo.                                                                                                        // 944
                                                                                                                       //
      if (subResult.result && subResult.distance !== undefined && ret.distance === undefined) {                        // 945
        ret.distance = subResult.distance;                                                                             // 947
      } // Similarly, propagate arrayIndices from sub-matchers... but to match                                         // 948
      // MongoDB behavior, this time the *last* sub-matcher with arrayIndices                                          // 950
      // wins.                                                                                                         // 951
                                                                                                                       //
                                                                                                                       //
      if (subResult.result && subResult.arrayIndices) {                                                                // 952
        ret.arrayIndices = subResult.arrayIndices;                                                                     // 953
      }                                                                                                                // 954
                                                                                                                       //
      return subResult.result;                                                                                         // 955
    }); // If we didn't actually match, forget any extra metadata we came up with.                                     // 956
                                                                                                                       //
    if (!ret.result) {                                                                                                 // 959
      delete ret.distance;                                                                                             // 960
      delete ret.arrayIndices;                                                                                         // 961
    }                                                                                                                  // 962
                                                                                                                       //
    return ret;                                                                                                        // 963
  };                                                                                                                   // 964
};                                                                                                                     // 965
                                                                                                                       //
var andDocumentMatchers = andSomeMatchers;                                                                             // 967
var andBranchedMatchers = andSomeMatchers; // helpers used by compiled selector code                                   // 968
                                                                                                                       //
LocalCollection._f = {                                                                                                 // 972
  // XXX for _all and _in, consider building 'inquery' at compile time..                                               // 973
  _type: function (v) {                                                                                                // 975
    if (typeof v === "number") return 1;                                                                               // 976
    if (typeof v === "string") return 2;                                                                               // 978
    if (typeof v === "boolean") return 8;                                                                              // 980
    if (isArray(v)) return 4;                                                                                          // 982
    if (v === null) return 10;                                                                                         // 984
    if (v instanceof RegExp) // note that typeof(/x/) === "object"                                                     // 986
      return 11;                                                                                                       // 988
    if (typeof v === "function") return 13;                                                                            // 989
    if (v instanceof Date) return 9;                                                                                   // 991
    if (EJSON.isBinary(v)) return 5;                                                                                   // 993
    if (v instanceof MongoID.ObjectID) return 7;                                                                       // 995
    return 3; // object                                                                                                // 997
    // XXX support some/all of these:                                                                                  // 999
    // 14, symbol                                                                                                      // 1000
    // 15, javascript code with scope                                                                                  // 1001
    // 16, 18: 32-bit/64-bit integer                                                                                   // 1002
    // 17, timestamp                                                                                                   // 1003
    // 255, minkey                                                                                                     // 1004
    // 127, maxkey                                                                                                     // 1005
  },                                                                                                                   // 1006
  // deep equality test: use for literal document and array matches                                                    // 1008
  _equal: function (a, b) {                                                                                            // 1009
    return EJSON.equals(a, b, {                                                                                        // 1010
      keyOrderSensitive: true                                                                                          // 1010
    });                                                                                                                // 1010
  },                                                                                                                   // 1011
  // maps a type code to a value that can be used to sort values of                                                    // 1013
  // different types                                                                                                   // 1014
  _typeorder: function (t) {                                                                                           // 1015
    // http://www.mongodb.org/display/DOCS/What+is+the+Compare+Order+for+BSON+Types                                    // 1016
    // XXX what is the correct sort position for Javascript code?                                                      // 1017
    // ('100' in the matrix below)                                                                                     // 1018
    // XXX minkey/maxkey                                                                                               // 1019
    return [-1, // (not a type)                                                                                        // 1020
    1, // number                                                                                                       // 1021
    2, // string                                                                                                       // 1022
    3, // object                                                                                                       // 1023
    4, // array                                                                                                        // 1024
    5, // binary                                                                                                       // 1025
    -1, // deprecated                                                                                                  // 1026
    6, // ObjectID                                                                                                     // 1027
    7, // bool                                                                                                         // 1028
    8, // Date                                                                                                         // 1029
    0, // null                                                                                                         // 1030
    9, // RegExp                                                                                                       // 1031
    -1, // deprecated                                                                                                  // 1032
    100, // JS code                                                                                                    // 1033
    2, // deprecated (symbol)                                                                                          // 1034
    100, // JS code                                                                                                    // 1035
    1, // 32-bit int                                                                                                   // 1036
    8, // Mongo timestamp                                                                                              // 1037
    1 // 64-bit int                                                                                                    // 1038
    ][t];                                                                                                              // 1020
  },                                                                                                                   // 1040
  // compare two values of unknown type according to BSON ordering                                                     // 1042
  // semantics. (as an extension, consider 'undefined' to be less than                                                 // 1043
  // any other value.) return negative if a is less, positive if b is                                                  // 1044
  // less, or 0 if equal                                                                                               // 1045
  _cmp: function (a, b) {                                                                                              // 1046
    if (a === undefined) return b === undefined ? 0 : -1;                                                              // 1047
    if (b === undefined) return 1;                                                                                     // 1049
                                                                                                                       //
    var ta = LocalCollection._f._type(a);                                                                              // 1051
                                                                                                                       //
    var tb = LocalCollection._f._type(b);                                                                              // 1052
                                                                                                                       //
    var oa = LocalCollection._f._typeorder(ta);                                                                        // 1053
                                                                                                                       //
    var ob = LocalCollection._f._typeorder(tb);                                                                        // 1054
                                                                                                                       //
    if (oa !== ob) return oa < ob ? -1 : 1;                                                                            // 1055
    if (ta !== tb) // XXX need to implement this if we implement Symbol or integers, or                                // 1057
      // Timestamp                                                                                                     // 1059
      throw Error("Missing type coercion logic in _cmp");                                                              // 1060
                                                                                                                       //
    if (ta === 7) {                                                                                                    // 1061
      // ObjectID                                                                                                      // 1061
      // Convert to string.                                                                                            // 1062
      ta = tb = 2;                                                                                                     // 1063
      a = a.toHexString();                                                                                             // 1064
      b = b.toHexString();                                                                                             // 1065
    }                                                                                                                  // 1066
                                                                                                                       //
    if (ta === 9) {                                                                                                    // 1067
      // Date                                                                                                          // 1067
      // Convert to millis.                                                                                            // 1068
      ta = tb = 1;                                                                                                     // 1069
      a = a.getTime();                                                                                                 // 1070
      b = b.getTime();                                                                                                 // 1071
    }                                                                                                                  // 1072
                                                                                                                       //
    if (ta === 1) // double                                                                                            // 1074
      return a - b;                                                                                                    // 1075
    if (tb === 2) // string                                                                                            // 1076
      return a < b ? -1 : a === b ? 0 : 1;                                                                             // 1077
                                                                                                                       //
    if (ta === 3) {                                                                                                    // 1078
      // Object                                                                                                        // 1078
      // this could be much more efficient in the expected case ...                                                    // 1079
      var to_array = function (obj) {                                                                                  // 1080
        var ret = [];                                                                                                  // 1081
                                                                                                                       //
        for (var key in meteorBabelHelpers.sanitizeForInObject(obj)) {                                                 // 1082
          ret.push(key);                                                                                               // 1083
          ret.push(obj[key]);                                                                                          // 1084
        }                                                                                                              // 1085
                                                                                                                       //
        return ret;                                                                                                    // 1086
      };                                                                                                               // 1087
                                                                                                                       //
      return LocalCollection._f._cmp(to_array(a), to_array(b));                                                        // 1088
    }                                                                                                                  // 1089
                                                                                                                       //
    if (ta === 4) {                                                                                                    // 1090
      // Array                                                                                                         // 1090
      for (var i = 0;; i++) {                                                                                          // 1091
        if (i === a.length) return i === b.length ? 0 : -1;                                                            // 1092
        if (i === b.length) return 1;                                                                                  // 1094
                                                                                                                       //
        var s = LocalCollection._f._cmp(a[i], b[i]);                                                                   // 1096
                                                                                                                       //
        if (s !== 0) return s;                                                                                         // 1097
      }                                                                                                                // 1099
    }                                                                                                                  // 1100
                                                                                                                       //
    if (ta === 5) {                                                                                                    // 1101
      // binary                                                                                                        // 1101
      // Surprisingly, a small binary blob is always less than a large one in                                          // 1102
      // Mongo.                                                                                                        // 1103
      if (a.length !== b.length) return a.length - b.length;                                                           // 1104
                                                                                                                       //
      for (i = 0; i < a.length; i++) {                                                                                 // 1106
        if (a[i] < b[i]) return -1;                                                                                    // 1107
        if (a[i] > b[i]) return 1;                                                                                     // 1109
      }                                                                                                                // 1111
                                                                                                                       //
      return 0;                                                                                                        // 1112
    }                                                                                                                  // 1113
                                                                                                                       //
    if (ta === 8) {                                                                                                    // 1114
      // boolean                                                                                                       // 1114
      if (a) return b ? 0 : 1;                                                                                         // 1115
      return b ? -1 : 0;                                                                                               // 1116
    }                                                                                                                  // 1117
                                                                                                                       //
    if (ta === 10) // null                                                                                             // 1118
      return 0;                                                                                                        // 1119
    if (ta === 11) // regexp                                                                                           // 1120
      throw Error("Sorting not supported on regular expression"); // XXX                                               // 1121
    // 13: javascript code                                                                                             // 1122
    // 14: symbol                                                                                                      // 1123
    // 15: javascript code with scope                                                                                  // 1124
    // 16: 32-bit integer                                                                                              // 1125
    // 17: timestamp                                                                                                   // 1126
    // 18: 64-bit integer                                                                                              // 1127
    // 255: minkey                                                                                                     // 1128
    // 127: maxkey                                                                                                     // 1129
                                                                                                                       //
    if (ta === 13) // javascript code                                                                                  // 1130
      throw Error("Sorting not supported on Javascript code"); // XXX                                                  // 1131
                                                                                                                       //
    throw Error("Unknown type to sort");                                                                               // 1132
  }                                                                                                                    // 1133
}; // Oddball function used by upsert.                                                                                 // 972
                                                                                                                       //
LocalCollection._removeDollarOperators = function (selector) {                                                         // 1137
  var selectorDoc = {};                                                                                                // 1138
                                                                                                                       //
  for (var k in meteorBabelHelpers.sanitizeForInObject(selector)) {                                                    // 1139
    if (k.substr(0, 1) !== '$') selectorDoc[k] = selector[k];                                                          // 1140
  }                                                                                                                    // 1139
                                                                                                                       //
  return selectorDoc;                                                                                                  // 1142
};                                                                                                                     // 1143
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"sort.js":["babel-runtime/helpers/typeof",function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/sort.js                                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _typeof2 = require("babel-runtime/helpers/typeof");                                                                //
                                                                                                                       //
var _typeof3 = _interopRequireDefault(_typeof2);                                                                       //
                                                                                                                       //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                      //
                                                                                                                       //
// Give a sort spec, which can be in any of these forms:                                                               // 1
//   {"key1": 1, "key2": -1}                                                                                           // 2
//   [["key1", "asc"], ["key2", "desc"]]                                                                               // 3
//   ["key1", ["key2", "desc"]]                                                                                        // 4
//                                                                                                                     // 5
// (.. with the first form being dependent on the key enumeration                                                      // 6
// behavior of your javascript VM, which usually does what you mean in                                                 // 7
// this case if the key names don't look like integers ..)                                                             // 8
//                                                                                                                     // 9
// return a function that takes two objects, and returns -1 if the                                                     // 10
// first object comes first in order, 1 if the second object comes                                                     // 11
// first, or 0 if neither object comes before the other.                                                               // 12
Minimongo.Sorter = function (spec, options) {                                                                          // 14
  var self = this;                                                                                                     // 15
  options = options || {};                                                                                             // 16
  self._sortSpecParts = [];                                                                                            // 18
  self._sortFunction = null;                                                                                           // 19
                                                                                                                       //
  var addSpecPart = function (path, ascending) {                                                                       // 21
    if (!path) throw Error("sort keys must be non-empty");                                                             // 22
    if (path.charAt(0) === '$') throw Error("unsupported sort key: " + path);                                          // 24
                                                                                                                       //
    self._sortSpecParts.push({                                                                                         // 26
      path: path,                                                                                                      // 27
      lookup: makeLookupFunction(path, {                                                                               // 28
        forSort: true                                                                                                  // 28
      }),                                                                                                              // 28
      ascending: ascending                                                                                             // 29
    });                                                                                                                // 26
  };                                                                                                                   // 31
                                                                                                                       //
  if (spec instanceof Array) {                                                                                         // 33
    for (var i = 0; i < spec.length; i++) {                                                                            // 34
      if (typeof spec[i] === "string") {                                                                               // 35
        addSpecPart(spec[i], true);                                                                                    // 36
      } else {                                                                                                         // 37
        addSpecPart(spec[i][0], spec[i][1] !== "desc");                                                                // 38
      }                                                                                                                // 39
    }                                                                                                                  // 40
  } else if ((typeof spec === "undefined" ? "undefined" : (0, _typeof3.default)(spec)) === "object") {                 // 41
    _.each(spec, function (value, key) {                                                                               // 42
      addSpecPart(key, value >= 0);                                                                                    // 43
    });                                                                                                                // 44
  } else if (typeof spec === "function") {                                                                             // 45
    self._sortFunction = spec;                                                                                         // 46
  } else {                                                                                                             // 47
    throw Error("Bad sort specification: " + JSON.stringify(spec));                                                    // 48
  } // If a function is specified for sorting, we skip the rest.                                                       // 49
                                                                                                                       //
                                                                                                                       //
  if (self._sortFunction) return; // To implement affectedByModifier, we piggy-back on top of Matcher's                // 52
  // affectedByModifier code; we create a selector that is affected by the same                                        // 56
  // modifiers as this sort order. This is only implemented on the server.                                             // 57
                                                                                                                       //
  if (self.affectedByModifier) {                                                                                       // 58
    var selector = {};                                                                                                 // 59
                                                                                                                       //
    _.each(self._sortSpecParts, function (spec) {                                                                      // 60
      selector[spec.path] = 1;                                                                                         // 61
    });                                                                                                                // 62
                                                                                                                       //
    self._selectorForAffectedByModifier = new Minimongo.Matcher(selector);                                             // 63
  }                                                                                                                    // 64
                                                                                                                       //
  self._keyComparator = composeComparators(_.map(self._sortSpecParts, function (spec, i) {                             // 66
    return self._keyFieldComparator(i);                                                                                // 68
  })); // If you specify a matcher for this Sorter, _keyFilter may be set to a                                         // 69
  // function which selects whether or not a given "sort key" (tuple of values                                         // 72
  // for the different sort spec fields) is compatible with the selector.                                              // 73
                                                                                                                       //
  self._keyFilter = null;                                                                                              // 74
  options.matcher && self._useWithMatcher(options.matcher);                                                            // 75
}; // In addition to these methods, sorter_project.js defines combineIntoProjection                                    // 76
// on the server only.                                                                                                 // 79
                                                                                                                       //
                                                                                                                       //
_.extend(Minimongo.Sorter.prototype, {                                                                                 // 80
  getComparator: function (options) {                                                                                  // 81
    var self = this; // If we have no distances, just use the comparator from the source                               // 82
    // specification (which defaults to "everything is equal".                                                         // 85
                                                                                                                       //
    if (!options || !options.distances) {                                                                              // 86
      return self._getBaseComparator();                                                                                // 87
    }                                                                                                                  // 88
                                                                                                                       //
    var distances = options.distances; // Return a comparator which first tries the sort specification, and if that    // 90
    // says "it's equal", breaks ties using $near distances.                                                           // 93
                                                                                                                       //
    return composeComparators([self._getBaseComparator(), function (a, b) {                                            // 94
      if (!distances.has(a._id)) throw Error("Missing distance for " + a._id);                                         // 95
      if (!distances.has(b._id)) throw Error("Missing distance for " + b._id);                                         // 97
      return distances.get(a._id) - distances.get(b._id);                                                              // 99
    }]);                                                                                                               // 100
  },                                                                                                                   // 101
  _getPaths: function () {                                                                                             // 103
    var self = this;                                                                                                   // 104
    return _.pluck(self._sortSpecParts, 'path');                                                                       // 105
  },                                                                                                                   // 106
  // Finds the minimum key from the doc, according to the sort specs.  (We say                                         // 108
  // "minimum" here but this is with respect to the sort spec, so "descending"                                         // 109
  // sort fields mean we're finding the max for that field.)                                                           // 110
  //                                                                                                                   // 111
  // Note that this is NOT "find the minimum value of the first field, the                                             // 112
  // minimum value of the second field, etc"... it's "choose the                                                       // 113
  // lexicographically minimum value of the key vector, allowing only keys which                                       // 114
  // you can find along the same paths".  ie, for a doc {a: [{x: 0, y: 5}, {x:                                         // 115
  // 1, y: 3}]} with sort spec {'a.x': 1, 'a.y': 1}, the only keys are [0,5] and                                       // 116
  // [1,3], and the minimum key is [0,5]; notably, [0,3] is NOT a key.                                                 // 117
  _getMinKeyFromDoc: function (doc) {                                                                                  // 118
    var self = this;                                                                                                   // 119
    var minKey = null;                                                                                                 // 120
                                                                                                                       //
    self._generateKeysFromDoc(doc, function (key) {                                                                    // 122
      if (!self._keyCompatibleWithSelector(key)) return;                                                               // 123
                                                                                                                       //
      if (minKey === null) {                                                                                           // 126
        minKey = key;                                                                                                  // 127
        return;                                                                                                        // 128
      }                                                                                                                // 129
                                                                                                                       //
      if (self._compareKeys(key, minKey) < 0) {                                                                        // 130
        minKey = key;                                                                                                  // 131
      }                                                                                                                // 132
    }); // This could happen if our key filter somehow filters out all the keys even                                   // 133
    // though somehow the selector matches.                                                                            // 136
                                                                                                                       //
                                                                                                                       //
    if (minKey === null) throw Error("sort selector found no keys in doc?");                                           // 137
    return minKey;                                                                                                     // 139
  },                                                                                                                   // 140
  _keyCompatibleWithSelector: function (key) {                                                                         // 142
    var self = this;                                                                                                   // 143
    return !self._keyFilter || self._keyFilter(key);                                                                   // 144
  },                                                                                                                   // 145
  // Iterates over each possible "key" from doc (ie, over each branch), calling                                        // 147
  // 'cb' with the key.                                                                                                // 148
  _generateKeysFromDoc: function (doc, cb) {                                                                           // 149
    var self = this;                                                                                                   // 150
    if (self._sortSpecParts.length === 0) throw new Error("can't generate keys without a spec"); // maps index -> ({'' -> value} or {path -> value})
                                                                                                                       //
    var valuesByIndexAndPath = [];                                                                                     // 156
                                                                                                                       //
    var pathFromIndices = function (indices) {                                                                         // 158
      return indices.join(',') + ',';                                                                                  // 159
    };                                                                                                                 // 160
                                                                                                                       //
    var knownPaths = null;                                                                                             // 162
                                                                                                                       //
    _.each(self._sortSpecParts, function (spec, whichField) {                                                          // 164
      // Expand any leaf arrays that we find, and ignore those arrays                                                  // 165
      // themselves.  (We never sort based on an array itself.)                                                        // 166
      var branches = expandArraysInBranches(spec.lookup(doc), true); // If there are no values for a key (eg, key goes to an empty array),
      // pretend we found one null value.                                                                              // 170
                                                                                                                       //
      if (!branches.length) branches = [{                                                                              // 171
        value: null                                                                                                    // 172
      }];                                                                                                              // 172
      var usedPaths = false;                                                                                           // 174
      valuesByIndexAndPath[whichField] = {};                                                                           // 175
                                                                                                                       //
      _.each(branches, function (branch) {                                                                             // 176
        if (!branch.arrayIndices) {                                                                                    // 177
          // If there are no array indices for a branch, then it must be the                                           // 178
          // only branch, because the only thing that produces multiple branches                                       // 179
          // is the use of arrays.                                                                                     // 180
          if (branches.length > 1) throw Error("multiple branches but no array used?");                                // 181
          valuesByIndexAndPath[whichField][''] = branch.value;                                                         // 183
          return;                                                                                                      // 184
        }                                                                                                              // 185
                                                                                                                       //
        usedPaths = true;                                                                                              // 187
        var path = pathFromIndices(branch.arrayIndices);                                                               // 188
        if (_.has(valuesByIndexAndPath[whichField], path)) throw Error("duplicate path: " + path);                     // 189
        valuesByIndexAndPath[whichField][path] = branch.value; // If two sort fields both go into arrays, they have to go into the
        // exact same arrays and we have to find the same paths.  This is                                              // 194
        // roughly the same condition that makes MongoDB throw this strange                                            // 195
        // error message.  eg, the main thing is that if sort spec is {a: 1,                                           // 196
        // b:1} then a and b cannot both be arrays.                                                                    // 197
        //                                                                                                             // 198
        // (In MongoDB it seems to be OK to have {a: 1, 'a.x.y': 1} where 'a'                                          // 199
        // and 'a.x.y' are both arrays, but we don't allow this for now.                                               // 200
        // #NestedArraySort                                                                                            // 201
        // XXX achieve full compatibility here                                                                         // 202
                                                                                                                       //
        if (knownPaths && !_.has(knownPaths, path)) {                                                                  // 203
          throw Error("cannot index parallel arrays");                                                                 // 204
        }                                                                                                              // 205
      });                                                                                                              // 206
                                                                                                                       //
      if (knownPaths) {                                                                                                // 208
        // Similarly to above, paths must match everywhere, unless this is a                                           // 209
        // non-array field.                                                                                            // 210
        if (!_.has(valuesByIndexAndPath[whichField], '') && _.size(knownPaths) !== _.size(valuesByIndexAndPath[whichField])) {
          throw Error("cannot index parallel arrays!");                                                                // 213
        }                                                                                                              // 214
      } else if (usedPaths) {                                                                                          // 215
        knownPaths = {};                                                                                               // 216
                                                                                                                       //
        _.each(valuesByIndexAndPath[whichField], function (x, path) {                                                  // 217
          knownPaths[path] = true;                                                                                     // 218
        });                                                                                                            // 219
      }                                                                                                                // 220
    });                                                                                                                // 221
                                                                                                                       //
    if (!knownPaths) {                                                                                                 // 223
      // Easy case: no use of arrays.                                                                                  // 224
      var soleKey = _.map(valuesByIndexAndPath, function (values) {                                                    // 225
        if (!_.has(values, '')) throw Error("no value in sole key case?");                                             // 226
        return values[''];                                                                                             // 228
      });                                                                                                              // 229
                                                                                                                       //
      cb(soleKey);                                                                                                     // 230
      return;                                                                                                          // 231
    }                                                                                                                  // 232
                                                                                                                       //
    _.each(knownPaths, function (x, path) {                                                                            // 234
      var key = _.map(valuesByIndexAndPath, function (values) {                                                        // 235
        if (_.has(values, '')) return values[''];                                                                      // 236
        if (!_.has(values, path)) throw Error("missing path?");                                                        // 238
        return values[path];                                                                                           // 240
      });                                                                                                              // 241
                                                                                                                       //
      cb(key);                                                                                                         // 242
    });                                                                                                                // 243
  },                                                                                                                   // 244
  // Takes in two keys: arrays whose lengths match the number of spec                                                  // 246
  // parts. Returns negative, 0, or positive based on using the sort spec to                                           // 247
  // compare fields.                                                                                                   // 248
  _compareKeys: function (key1, key2) {                                                                                // 249
    var self = this;                                                                                                   // 250
                                                                                                                       //
    if (key1.length !== self._sortSpecParts.length || key2.length !== self._sortSpecParts.length) {                    // 251
      throw Error("Key has wrong length");                                                                             // 253
    }                                                                                                                  // 254
                                                                                                                       //
    return self._keyComparator(key1, key2);                                                                            // 256
  },                                                                                                                   // 257
  // Given an index 'i', returns a comparator that compares two key arrays based                                       // 259
  // on field 'i'.                                                                                                     // 260
  _keyFieldComparator: function (i) {                                                                                  // 261
    var self = this;                                                                                                   // 262
    var invert = !self._sortSpecParts[i].ascending;                                                                    // 263
    return function (key1, key2) {                                                                                     // 264
      var compare = LocalCollection._f._cmp(key1[i], key2[i]);                                                         // 265
                                                                                                                       //
      if (invert) compare = -compare;                                                                                  // 266
      return compare;                                                                                                  // 268
    };                                                                                                                 // 269
  },                                                                                                                   // 270
  // Returns a comparator that represents the sort specification (but not                                              // 272
  // including a possible geoquery distance tie-breaker).                                                              // 273
  _getBaseComparator: function () {                                                                                    // 274
    var self = this;                                                                                                   // 275
    if (self._sortFunction) return self._sortFunction; // If we're only sorting on geoquery distance and no specs, just say
    // everything is equal.                                                                                            // 281
                                                                                                                       //
    if (!self._sortSpecParts.length) {                                                                                 // 282
      return function (doc1, doc2) {                                                                                   // 283
        return 0;                                                                                                      // 284
      };                                                                                                               // 285
    }                                                                                                                  // 286
                                                                                                                       //
    return function (doc1, doc2) {                                                                                     // 288
      var key1 = self._getMinKeyFromDoc(doc1);                                                                         // 289
                                                                                                                       //
      var key2 = self._getMinKeyFromDoc(doc2);                                                                         // 290
                                                                                                                       //
      return self._compareKeys(key1, key2);                                                                            // 291
    };                                                                                                                 // 292
  },                                                                                                                   // 293
  // In MongoDB, if you have documents                                                                                 // 295
  //    {_id: 'x', a: [1, 10]} and                                                                                     // 296
  //    {_id: 'y', a: [5, 15]},                                                                                        // 297
  // then C.find({}, {sort: {a: 1}}) puts x before y (1 comes before 5).                                               // 298
  // But  C.find({a: {$gt: 3}}, {sort: {a: 1}}) puts y before x (1 does not                                            // 299
  // match the selector, and 5 comes before 10).                                                                       // 300
  //                                                                                                                   // 301
  // The way this works is pretty subtle!  For example, if the documents                                               // 302
  // are instead {_id: 'x', a: [{x: 1}, {x: 10}]}) and                                                                 // 303
  //             {_id: 'y', a: [{x: 5}, {x: 15}]}),                                                                    // 304
  // then C.find({'a.x': {$gt: 3}}, {sort: {'a.x': 1}}) and                                                            // 305
  //      C.find({a: {$elemMatch: {x: {$gt: 3}}}}, {sort: {'a.x': 1}})                                                 // 306
  // both follow this rule (y before x).  (ie, you do have to apply this                                               // 307
  // through $elemMatch.)                                                                                              // 308
  //                                                                                                                   // 309
  // So if you pass a matcher to this sorter's constructor, we will attempt to                                         // 310
  // skip sort keys that don't match the selector. The logic here is pretty                                            // 311
  // subtle and undocumented; we've gotten as close as we can figure out based                                         // 312
  // on our understanding of Mongo's behavior.                                                                         // 313
  _useWithMatcher: function (matcher) {                                                                                // 314
    var self = this;                                                                                                   // 315
    if (self._keyFilter) throw Error("called _useWithMatcher twice?"); // If we are only sorting by distance, then we're not going to bother to
    // build a key filter.                                                                                             // 321
    // XXX figure out how geoqueries interact with this stuff                                                          // 322
                                                                                                                       //
    if (_.isEmpty(self._sortSpecParts)) return;                                                                        // 323
    var selector = matcher._selector; // If the user just passed a literal function to find(), then we can't get a     // 326
    // key filter from it.                                                                                             // 329
                                                                                                                       //
    if (selector instanceof Function) return;                                                                          // 330
    var constraintsByPath = {};                                                                                        // 333
                                                                                                                       //
    _.each(self._sortSpecParts, function (spec, i) {                                                                   // 334
      constraintsByPath[spec.path] = [];                                                                               // 335
    });                                                                                                                // 336
                                                                                                                       //
    _.each(selector, function (subSelector, key) {                                                                     // 338
      // XXX support $and and $or                                                                                      // 339
      var constraints = constraintsByPath[key];                                                                        // 341
      if (!constraints) return; // XXX it looks like the real MongoDB implementation isn't "does the                   // 342
      // regexp match" but "does the value fall into a range named by the                                              // 346
      // literal prefix of the regexp", ie "foo" in /^foo(bar|baz)+/  But                                              // 347
      // "does the regexp match" is a good approximation.                                                              // 348
                                                                                                                       //
      if (subSelector instanceof RegExp) {                                                                             // 349
        // As far as we can tell, using either of the options that both we and                                         // 350
        // MongoDB support ('i' and 'm') disables use of the key filter. This                                          // 351
        // makes sense: MongoDB mostly appears to be calculating ranges of an                                          // 352
        // index to use, which means it only cares about regexps that match                                            // 353
        // one range (with a literal prefix), and both 'i' and 'm' prevent the                                         // 354
        // literal prefix of the regexp from actually meaning one range.                                               // 355
        if (subSelector.ignoreCase || subSelector.multiline) return;                                                   // 356
        constraints.push(regexpElementMatcher(subSelector));                                                           // 358
        return;                                                                                                        // 359
      }                                                                                                                // 360
                                                                                                                       //
      if (isOperatorObject(subSelector)) {                                                                             // 362
        _.each(subSelector, function (operand, operator) {                                                             // 363
          if (_.contains(['$lt', '$lte', '$gt', '$gte'], operator)) {                                                  // 364
            // XXX this depends on us knowing that these operators don't use any                                       // 365
            // of the arguments to compileElementSelector other than operand.                                          // 366
            constraints.push(ELEMENT_OPERATORS[operator].compileElementSelector(operand));                             // 367
          } // See comments in the RegExp block above.                                                                 // 369
                                                                                                                       //
                                                                                                                       //
          if (operator === '$regex' && !subSelector.$options) {                                                        // 372
            constraints.push(ELEMENT_OPERATORS.$regex.compileElementSelector(operand, subSelector));                   // 373
          } // XXX support {$exists: true}, $mod, $type, $in, $elemMatch                                               // 376
                                                                                                                       //
        });                                                                                                            // 379
                                                                                                                       //
        return;                                                                                                        // 380
      } // OK, it's an equality thing.                                                                                 // 381
                                                                                                                       //
                                                                                                                       //
      constraints.push(equalityElementMatcher(subSelector));                                                           // 384
    }); // It appears that the first sort field is treated differently from the                                        // 385
    // others; we shouldn't create a key filter unless the first sort field is                                         // 388
    // restricted, though after that point we can restrict the other sort fields                                       // 389
    // or not as we wish.                                                                                              // 390
                                                                                                                       //
                                                                                                                       //
    if (_.isEmpty(constraintsByPath[self._sortSpecParts[0].path])) return;                                             // 391
                                                                                                                       //
    self._keyFilter = function (key) {                                                                                 // 394
      return _.all(self._sortSpecParts, function (specPart, index) {                                                   // 395
        return _.all(constraintsByPath[specPart.path], function (f) {                                                  // 396
          return f(key[index]);                                                                                        // 397
        });                                                                                                            // 398
      });                                                                                                              // 399
    };                                                                                                                 // 400
  }                                                                                                                    // 401
}); // Given an array of comparators                                                                                   // 80
// (functions (a,b)->(negative or positive or zero)), returns a single                                                 // 405
// comparator which uses each comparator in order and returns the first                                                // 406
// non-zero value.                                                                                                     // 407
                                                                                                                       //
                                                                                                                       //
var composeComparators = function (comparatorArray) {                                                                  // 408
  return function (a, b) {                                                                                             // 409
    for (var i = 0; i < comparatorArray.length; ++i) {                                                                 // 410
      var compare = comparatorArray[i](a, b);                                                                          // 411
      if (compare !== 0) return compare;                                                                               // 412
    }                                                                                                                  // 414
                                                                                                                       //
    return 0;                                                                                                          // 415
  };                                                                                                                   // 416
};                                                                                                                     // 417
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"projection.js":["babel-runtime/helpers/typeof",function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/projection.js                                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _typeof2 = require("babel-runtime/helpers/typeof");                                                                //
                                                                                                                       //
var _typeof3 = _interopRequireDefault(_typeof2);                                                                       //
                                                                                                                       //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                      //
                                                                                                                       //
// Knows how to compile a fields projection to a predicate function.                                                   // 1
// @returns - Function: a closure that filters out an object according to the                                          // 2
//            fields projection rules:                                                                                 // 3
//            @param obj - Object: MongoDB-styled document                                                             // 4
//            @returns - Object: a document with the fields filtered out                                               // 5
//                       according to projection rules. Doesn't retain subfields                                       // 6
//                       of passed argument.                                                                           // 7
LocalCollection._compileProjection = function (fields) {                                                               // 8
  LocalCollection._checkSupportedProjection(fields);                                                                   // 9
                                                                                                                       //
  var _idProjection = _.isUndefined(fields._id) ? true : fields._id;                                                   // 11
                                                                                                                       //
  var details = projectionDetails(fields); // returns transformed doc according to ruleTree                            // 12
                                                                                                                       //
  var transform = function (doc, ruleTree) {                                                                           // 15
    // Special case for "sets"                                                                                         // 16
    if (_.isArray(doc)) return _.map(doc, function (subdoc) {                                                          // 17
      return transform(subdoc, ruleTree);                                                                              // 18
    });                                                                                                                // 18
    var res = details.including ? {} : EJSON.clone(doc);                                                               // 20
                                                                                                                       //
    _.each(ruleTree, function (rule, key) {                                                                            // 21
      if (!_.has(doc, key)) return;                                                                                    // 22
                                                                                                                       //
      if (_.isObject(rule)) {                                                                                          // 24
        // For sub-objects/subsets we branch                                                                           // 25
        if (_.isObject(doc[key])) res[key] = transform(doc[key], rule); // Otherwise we don't even touch this subfield
      } else if (details.including) res[key] = EJSON.clone(doc[key]);else delete res[key];                             // 29
    });                                                                                                                // 33
                                                                                                                       //
    return res;                                                                                                        // 35
  };                                                                                                                   // 36
                                                                                                                       //
  return function (obj) {                                                                                              // 38
    var res = transform(obj, details.tree);                                                                            // 39
    if (_idProjection && _.has(obj, '_id')) res._id = obj._id;                                                         // 41
    if (!_idProjection && _.has(res, '_id')) delete res._id;                                                           // 43
    return res;                                                                                                        // 45
  };                                                                                                                   // 46
}; // Traverses the keys of passed projection and constructs a tree where all                                          // 47
// leaves are either all True or all False                                                                             // 50
// @returns Object:                                                                                                    // 51
//  - tree - Object - tree representation of keys involved in projection                                               // 52
//  (exception for '_id' as it is a special case handled separately)                                                   // 53
//  - including - Boolean - "take only certain fields" type of projection                                              // 54
                                                                                                                       //
                                                                                                                       //
projectionDetails = function (fields) {                                                                                // 55
  // Find the non-_id keys (_id is handled specially because it is included unless                                     // 56
  // explicitly excluded). Sort the keys, so that our code to detect overlaps                                          // 57
  // like 'foo' and 'foo.bar' can assume that 'foo' comes first.                                                       // 58
  var fieldsKeys = _.keys(fields).sort(); // If _id is the only field in the projection, do not remove it, since it is
  // required to determine if this is an exclusion or exclusion. Also keep an                                          // 62
  // inclusive _id, since inclusive _id follows the normal rules about mixing                                          // 63
  // inclusive and exclusive fields. If _id is not the only field in the                                               // 64
  // projection and is exclusive, remove it so it can be handled later by a                                            // 65
  // special case, since exclusive _id is always allowed.                                                              // 66
                                                                                                                       //
                                                                                                                       //
  if (fieldsKeys.length > 0 && !(fieldsKeys.length === 1 && fieldsKeys[0] === '_id') && !(_.contains(fieldsKeys, '_id') && fields['_id'])) fieldsKeys = _.reject(fieldsKeys, function (key) {
    return key === '_id';                                                                                              // 70
  });                                                                                                                  // 70
  var including = null; // Unknown                                                                                     // 72
                                                                                                                       //
  _.each(fieldsKeys, function (keyPath) {                                                                              // 74
    var rule = !!fields[keyPath];                                                                                      // 75
    if (including === null) including = rule;                                                                          // 76
    if (including !== rule) // This error message is copied from MongoDB shell                                         // 78
      throw MinimongoError("You cannot currently mix including and excluding fields.");                                // 80
  });                                                                                                                  // 81
                                                                                                                       //
  var projectionRulesTree = pathsToTree(fieldsKeys, function (path) {                                                  // 84
    return including;                                                                                                  // 86
  }, function (node, path, fullPath) {                                                                                 // 86
    // Check passed projection fields' keys: If you have two rules such as                                             // 88
    // 'foo.bar' and 'foo.bar.baz', then the result becomes ambiguous. If                                              // 89
    // that happens, there is a probability you are doing something wrong,                                             // 90
    // framework should notify you about such mistake earlier on cursor                                                // 91
    // compilation step than later during runtime.  Note, that real mongo                                              // 92
    // doesn't do anything about it and the later rule appears in projection                                           // 93
    // project, more priority it takes.                                                                                // 94
    //                                                                                                                 // 95
    // Example, assume following in mongo shell:                                                                       // 96
    // > db.coll.insert({ a: { b: 23, c: 44 } })                                                                       // 97
    // > db.coll.find({}, { 'a': 1, 'a.b': 1 })                                                                        // 98
    // { "_id" : ObjectId("520bfe456024608e8ef24af3"), "a" : { "b" : 23 } }                                            // 99
    // > db.coll.find({}, { 'a.b': 1, 'a': 1 })                                                                        // 100
    // { "_id" : ObjectId("520bfe456024608e8ef24af3"), "a" : { "b" : 23, "c" : 44 } }                                  // 101
    //                                                                                                                 // 102
    // Note, how second time the return set of keys is different.                                                      // 103
    var currentPath = fullPath;                                                                                        // 105
    var anotherPath = path;                                                                                            // 106
    throw MinimongoError("both " + currentPath + " and " + anotherPath + " found in fields option, using both of them may trigger " + "unexpected behavior. Did you mean to use only one of them?");
  });                                                                                                                  // 110
  return {                                                                                                             // 112
    tree: projectionRulesTree,                                                                                         // 113
    including: including                                                                                               // 114
  };                                                                                                                   // 112
}; // paths - Array: list of mongo style paths                                                                         // 116
// newLeafFn - Function: of form function(path) should return a scalar value to                                        // 119
//                       put into list created for that path                                                           // 120
// conflictFn - Function: of form function(node, path, fullPath) is called                                             // 121
//                        when building a tree path for 'fullPath' node on                                             // 122
//                        'path' was already a leaf with a value. Must return a                                        // 123
//                        conflict resolution.                                                                         // 124
// initial tree - Optional Object: starting tree.                                                                      // 125
// @returns - Object: tree represented as a set of nested objects                                                      // 126
                                                                                                                       //
                                                                                                                       //
pathsToTree = function (paths, newLeafFn, conflictFn, tree) {                                                          // 127
  tree = tree || {};                                                                                                   // 128
                                                                                                                       //
  _.each(paths, function (keyPath) {                                                                                   // 129
    var treePos = tree;                                                                                                // 130
    var pathArr = keyPath.split('.'); // use _.all just for iteration with break                                       // 131
                                                                                                                       //
    var success = _.all(pathArr.slice(0, -1), function (key, idx) {                                                    // 134
      if (!_.has(treePos, key)) treePos[key] = {};else if (!_.isObject(treePos[key])) {                                // 135
        treePos[key] = conflictFn(treePos[key], pathArr.slice(0, idx + 1).join('.'), keyPath); // break out of loop if we are failing for this path
                                                                                                                       //
        if (!_.isObject(treePos[key])) return false;                                                                   // 142
      }                                                                                                                // 144
      treePos = treePos[key];                                                                                          // 146
      return true;                                                                                                     // 147
    });                                                                                                                // 148
                                                                                                                       //
    if (success) {                                                                                                     // 150
      var lastKey = _.last(pathArr);                                                                                   // 151
                                                                                                                       //
      if (!_.has(treePos, lastKey)) treePos[lastKey] = newLeafFn(keyPath);else treePos[lastKey] = conflictFn(treePos[lastKey], keyPath, keyPath);
    }                                                                                                                  // 156
  });                                                                                                                  // 157
                                                                                                                       //
  return tree;                                                                                                         // 159
};                                                                                                                     // 160
                                                                                                                       //
LocalCollection._checkSupportedProjection = function (fields) {                                                        // 162
  if (!_.isObject(fields) || _.isArray(fields)) throw MinimongoError("fields option must be an object");               // 163
                                                                                                                       //
  _.each(fields, function (val, keyPath) {                                                                             // 166
    if (_.contains(keyPath.split('.'), '$')) throw MinimongoError("Minimongo doesn't support $ operator in projections yet.");
    if ((typeof val === "undefined" ? "undefined" : (0, _typeof3.default)(val)) === 'object' && _.intersection(['$elemMatch', '$meta', '$slice'], _.keys(val)).length > 0) throw MinimongoError("Minimongo doesn't support operators in projections yet.");
    if (_.indexOf([1, 0, true, false], val) === -1) throw MinimongoError("Projection values should be one of 1, 0, true, or false");
  });                                                                                                                  // 173
};                                                                                                                     // 174
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"modify.js":["babel-runtime/helpers/typeof",function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/modify.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _typeof2 = require("babel-runtime/helpers/typeof");                                                                //
                                                                                                                       //
var _typeof3 = _interopRequireDefault(_typeof2);                                                                       //
                                                                                                                       //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                      //
                                                                                                                       //
// XXX need a strategy for passing the binding of $ into this                                                          // 1
// function, from the compiled selector                                                                                // 2
//                                                                                                                     // 3
// maybe just {key.up.to.just.before.dollarsign: array_index}                                                          // 4
//                                                                                                                     // 5
// XXX atomicity: if one modification fails, do we roll back the whole                                                 // 6
// change?                                                                                                             // 7
//                                                                                                                     // 8
// options:                                                                                                            // 9
//   - isInsert is set when _modify is being called to compute the document to                                         // 10
//     insert as part of an upsert operation. We use this primarily to figure                                          // 11
//     out when to set the fields in $setOnInsert, if present.                                                         // 12
LocalCollection._modify = function (doc, mod, options) {                                                               // 13
  options = options || {};                                                                                             // 14
  if (!isPlainObject(mod)) throw MinimongoError("Modifier must be an object"); // Make sure the caller can't mutate our data structures.
                                                                                                                       //
  mod = EJSON.clone(mod);                                                                                              // 19
  var isModifier = isOperatorObject(mod);                                                                              // 21
  var newDoc;                                                                                                          // 23
                                                                                                                       //
  if (!isModifier) {                                                                                                   // 25
    if (mod._id && !EJSON.equals(doc._id, mod._id)) throw MinimongoError("Cannot change the _id of a document"); // replace the whole document
                                                                                                                       //
    for (var k in meteorBabelHelpers.sanitizeForInObject(mod)) {                                                       // 30
      if (/\./.test(k)) throw MinimongoError("When replacing document, field name may not contain '.'");               // 31
    }                                                                                                                  // 34
                                                                                                                       //
    newDoc = mod;                                                                                                      // 35
  } else {                                                                                                             // 36
    // apply modifiers to the doc.                                                                                     // 37
    newDoc = EJSON.clone(doc);                                                                                         // 38
                                                                                                                       //
    _.each(mod, function (operand, op) {                                                                               // 40
      var modFunc = MODIFIERS[op]; // Treat $setOnInsert as $set if this is an insert.                                 // 41
                                                                                                                       //
      if (options.isInsert && op === '$setOnInsert') modFunc = MODIFIERS['$set'];                                      // 43
      if (!modFunc) throw MinimongoError("Invalid modifier specified " + op);                                          // 45
                                                                                                                       //
      _.each(operand, function (arg, keypath) {                                                                        // 47
        if (keypath === '') {                                                                                          // 48
          throw MinimongoError("An empty update path is not valid.");                                                  // 49
        }                                                                                                              // 50
                                                                                                                       //
        if (keypath === '_id' && op !== '$setOnInsert') {                                                              // 52
          throw MinimongoError("Mod on _id not allowed");                                                              // 53
        }                                                                                                              // 54
                                                                                                                       //
        var keyparts = keypath.split('.');                                                                             // 56
                                                                                                                       //
        if (!_.all(keyparts, _.identity)) {                                                                            // 58
          throw MinimongoError("The update path '" + keypath + "' contains an empty field name, which is not allowed.");
        }                                                                                                              // 62
                                                                                                                       //
        var noCreate = _.has(NO_CREATE_MODIFIERS, op);                                                                 // 64
                                                                                                                       //
        var forbidArray = op === "$rename";                                                                            // 65
        var target = findModTarget(newDoc, keyparts, {                                                                 // 66
          noCreate: NO_CREATE_MODIFIERS[op],                                                                           // 67
          forbidArray: op === "$rename",                                                                               // 68
          arrayIndices: options.arrayIndices                                                                           // 69
        });                                                                                                            // 66
        var field = keyparts.pop();                                                                                    // 71
        modFunc(target, field, arg, keypath, newDoc);                                                                  // 72
      });                                                                                                              // 73
    });                                                                                                                // 74
  } // move new document into place.                                                                                   // 75
                                                                                                                       //
                                                                                                                       //
  _.each(_.keys(doc), function (k) {                                                                                   // 78
    // Note: this used to be for (var k in doc) however, this does not                                                 // 79
    // work right in Opera. Deleting from a doc while iterating over it                                                // 80
    // would sometimes cause opera to skip some keys.                                                                  // 81
    if (k !== '_id') delete doc[k];                                                                                    // 82
  });                                                                                                                  // 84
                                                                                                                       //
  _.each(newDoc, function (v, k) {                                                                                     // 85
    doc[k] = v;                                                                                                        // 86
  });                                                                                                                  // 87
}; // for a.b.c.2.d.e, keyparts should be ['a', 'b', 'c', '2', 'd', 'e'],                                              // 88
// and then you would operate on the 'e' property of the returned                                                      // 91
// object.                                                                                                             // 92
//                                                                                                                     // 93
// if options.noCreate is falsey, creates intermediate levels of                                                       // 94
// structure as necessary, like mkdir -p (and raises an exception if                                                   // 95
// that would mean giving a non-numeric property to an array.) if                                                      // 96
// options.noCreate is true, return undefined instead.                                                                 // 97
//                                                                                                                     // 98
// may modify the last element of keyparts to signal to the caller that it needs                                       // 99
// to use a different value to index into the returned object (for example,                                            // 100
// ['a', '01'] -> ['a', 1]).                                                                                           // 101
//                                                                                                                     // 102
// if forbidArray is true, return null if the keypath goes through an array.                                           // 103
//                                                                                                                     // 104
// if options.arrayIndices is set, use its first element for the (first) '$' in                                        // 105
// the path.                                                                                                           // 106
                                                                                                                       //
                                                                                                                       //
var findModTarget = function (doc, keyparts, options) {                                                                // 107
  options = options || {};                                                                                             // 108
  var usedArrayIndex = false;                                                                                          // 109
                                                                                                                       //
  for (var i = 0; i < keyparts.length; i++) {                                                                          // 110
    var last = i === keyparts.length - 1;                                                                              // 111
    var keypart = keyparts[i];                                                                                         // 112
    var indexable = isIndexable(doc);                                                                                  // 113
                                                                                                                       //
    if (!indexable) {                                                                                                  // 114
      if (options.noCreate) return undefined;                                                                          // 115
      var e = MinimongoError("cannot use the part '" + keypart + "' to traverse " + doc);                              // 117
      e.setPropertyError = true;                                                                                       // 119
      throw e;                                                                                                         // 120
    }                                                                                                                  // 121
                                                                                                                       //
    if (doc instanceof Array) {                                                                                        // 122
      if (options.forbidArray) return null;                                                                            // 123
                                                                                                                       //
      if (keypart === '$') {                                                                                           // 125
        if (usedArrayIndex) throw MinimongoError("Too many positional (i.e. '$') elements");                           // 126
                                                                                                                       //
        if (!options.arrayIndices || !options.arrayIndices.length) {                                                   // 128
          throw MinimongoError("The positional operator did not find the " + "match needed from the query");           // 129
        }                                                                                                              // 131
                                                                                                                       //
        keypart = options.arrayIndices[0];                                                                             // 132
        usedArrayIndex = true;                                                                                         // 133
      } else if (isNumericKey(keypart)) {                                                                              // 134
        keypart = parseInt(keypart);                                                                                   // 135
      } else {                                                                                                         // 136
        if (options.noCreate) return undefined;                                                                        // 137
        throw MinimongoError("can't append to array using string field name [" + keypart + "]");                       // 139
      }                                                                                                                // 142
                                                                                                                       //
      if (last) // handle 'a.01'                                                                                       // 143
        keyparts[i] = keypart;                                                                                         // 145
      if (options.noCreate && keypart >= doc.length) return undefined;                                                 // 146
                                                                                                                       //
      while (doc.length < keypart) {                                                                                   // 148
        doc.push(null);                                                                                                // 149
      }                                                                                                                // 148
                                                                                                                       //
      if (!last) {                                                                                                     // 150
        if (doc.length === keypart) doc.push({});else if ((0, _typeof3.default)(doc[keypart]) !== "object") throw MinimongoError("can't modify field '" + keyparts[i + 1] + "' of list value " + JSON.stringify(doc[keypart]));
      }                                                                                                                // 156
    } else {                                                                                                           // 157
      if (keypart.length && keypart.substr(0, 1) === '$') throw MinimongoError("can't set field named " + keypart);    // 158
                                                                                                                       //
      if (!(keypart in doc)) {                                                                                         // 160
        if (options.noCreate) return undefined;                                                                        // 161
        if (!last) doc[keypart] = {};                                                                                  // 163
      }                                                                                                                // 165
    }                                                                                                                  // 166
                                                                                                                       //
    if (last) return doc;                                                                                              // 168
    doc = doc[keypart];                                                                                                // 170
  } // notreached                                                                                                      // 171
                                                                                                                       //
};                                                                                                                     // 174
                                                                                                                       //
var NO_CREATE_MODIFIERS = {                                                                                            // 176
  $unset: true,                                                                                                        // 177
  $pop: true,                                                                                                          // 178
  $rename: true,                                                                                                       // 179
  $pull: true,                                                                                                         // 180
  $pullAll: true                                                                                                       // 181
};                                                                                                                     // 176
var MODIFIERS = {                                                                                                      // 184
  $currentDate: function (target, field, arg) {                                                                        // 185
    if ((typeof arg === "undefined" ? "undefined" : (0, _typeof3.default)(arg)) === "object" && arg.hasOwnProperty("$type")) {
      if (arg.$type !== "date") {                                                                                      // 187
        throw MinimongoError("Minimongo does currently only support the date type in $currentDate modifiers");         // 188
      }                                                                                                                // 189
    } else if (arg !== true) {                                                                                         // 190
      throw MinimongoError("Invalid $currentDate modifier");                                                           // 191
    }                                                                                                                  // 192
                                                                                                                       //
    target[field] = new Date();                                                                                        // 193
  },                                                                                                                   // 194
  $min: function (target, field, arg) {                                                                                // 195
    if (typeof arg !== "number") {                                                                                     // 196
      throw MinimongoError("Modifier $min allowed for numbers only");                                                  // 197
    }                                                                                                                  // 198
                                                                                                                       //
    if (field in target) {                                                                                             // 199
      if (typeof target[field] !== "number") {                                                                         // 200
        throw MinimongoError("Cannot apply $min modifier to non-number");                                              // 201
      }                                                                                                                // 202
                                                                                                                       //
      if (target[field] > arg) {                                                                                       // 203
        target[field] = arg;                                                                                           // 204
      }                                                                                                                // 205
    } else {                                                                                                           // 206
      target[field] = arg;                                                                                             // 207
    }                                                                                                                  // 208
  },                                                                                                                   // 209
  $max: function (target, field, arg) {                                                                                // 210
    if (typeof arg !== "number") {                                                                                     // 211
      throw MinimongoError("Modifier $max allowed for numbers only");                                                  // 212
    }                                                                                                                  // 213
                                                                                                                       //
    if (field in target) {                                                                                             // 214
      if (typeof target[field] !== "number") {                                                                         // 215
        throw MinimongoError("Cannot apply $max modifier to non-number");                                              // 216
      }                                                                                                                // 217
                                                                                                                       //
      if (target[field] < arg) {                                                                                       // 218
        target[field] = arg;                                                                                           // 219
      }                                                                                                                // 220
    } else {                                                                                                           // 221
      target[field] = arg;                                                                                             // 222
    }                                                                                                                  // 223
  },                                                                                                                   // 224
  $inc: function (target, field, arg) {                                                                                // 225
    if (typeof arg !== "number") throw MinimongoError("Modifier $inc allowed for numbers only");                       // 226
                                                                                                                       //
    if (field in target) {                                                                                             // 228
      if (typeof target[field] !== "number") throw MinimongoError("Cannot apply $inc modifier to non-number");         // 229
      target[field] += arg;                                                                                            // 231
    } else {                                                                                                           // 232
      target[field] = arg;                                                                                             // 233
    }                                                                                                                  // 234
  },                                                                                                                   // 235
  $set: function (target, field, arg) {                                                                                // 236
    if (!_.isObject(target)) {                                                                                         // 237
      // not an array or an object                                                                                     // 237
      var e = MinimongoError("Cannot set property on non-object field");                                               // 238
      e.setPropertyError = true;                                                                                       // 239
      throw e;                                                                                                         // 240
    }                                                                                                                  // 241
                                                                                                                       //
    if (target === null) {                                                                                             // 242
      var e = MinimongoError("Cannot set property on null");                                                           // 243
      e.setPropertyError = true;                                                                                       // 244
      throw e;                                                                                                         // 245
    }                                                                                                                  // 246
                                                                                                                       //
    if (_.isString(field) && field.indexOf('\0') > -1) {                                                               // 247
      // Null bytes are not allowed in Mongo field names                                                               // 248
      // https://docs.mongodb.com/manual/reference/limits/#Restrictions-on-Field-Names                                 // 249
      throw MinimongoError("Key " + field + " must not contain null bytes");                                           // 250
    }                                                                                                                  // 251
                                                                                                                       //
    target[field] = arg;                                                                                               // 252
  },                                                                                                                   // 253
  $setOnInsert: function (target, field, arg) {// converted to `$set` in `_modify`                                     // 254
  },                                                                                                                   // 256
  $unset: function (target, field, arg) {                                                                              // 257
    if (target !== undefined) {                                                                                        // 258
      if (target instanceof Array) {                                                                                   // 259
        if (field in target) target[field] = null;                                                                     // 260
      } else delete target[field];                                                                                     // 262
    }                                                                                                                  // 264
  },                                                                                                                   // 265
  $push: function (target, field, arg) {                                                                               // 266
    if (target[field] === undefined) target[field] = [];                                                               // 267
    if (!(target[field] instanceof Array)) throw MinimongoError("Cannot apply $push modifier to non-array");           // 269
                                                                                                                       //
    if (!(arg && arg.$each)) {                                                                                         // 272
      // Simple mode: not $each                                                                                        // 273
      target[field].push(arg);                                                                                         // 274
      return;                                                                                                          // 275
    } // Fancy mode: $each (and maybe $slice and $sort and $position)                                                  // 276
                                                                                                                       //
                                                                                                                       //
    var toPush = arg.$each;                                                                                            // 279
    if (!(toPush instanceof Array)) throw MinimongoError("$each must be an array"); // Parse $position                 // 280
                                                                                                                       //
    var position = undefined;                                                                                          // 284
                                                                                                                       //
    if ('$position' in arg) {                                                                                          // 285
      if (typeof arg.$position !== "number") throw MinimongoError("$position must be a numeric value"); // XXX should check to make sure integer
                                                                                                                       //
      if (arg.$position < 0) throw MinimongoError("$position in $push must be zero or positive");                      // 289
      position = arg.$position;                                                                                        // 291
    } // Parse $slice.                                                                                                 // 292
                                                                                                                       //
                                                                                                                       //
    var slice = undefined;                                                                                             // 295
                                                                                                                       //
    if ('$slice' in arg) {                                                                                             // 296
      if (typeof arg.$slice !== "number") throw MinimongoError("$slice must be a numeric value"); // XXX should check to make sure integer
                                                                                                                       //
      if (arg.$slice > 0) throw MinimongoError("$slice in $push must be zero or negative");                            // 300
      slice = arg.$slice;                                                                                              // 302
    } // Parse $sort.                                                                                                  // 303
                                                                                                                       //
                                                                                                                       //
    var sortFunction = undefined;                                                                                      // 306
                                                                                                                       //
    if (arg.$sort) {                                                                                                   // 307
      if (slice === undefined) throw MinimongoError("$sort requires $slice to be present"); // XXX this allows us to use a $sort whose value is an array, but that's
      // actually an extension of the Node driver, so it won't work                                                    // 311
      // server-side. Could be confusing!                                                                              // 312
      // XXX is it correct that we don't do geo-stuff here?                                                            // 313
                                                                                                                       //
      sortFunction = new Minimongo.Sorter(arg.$sort).getComparator();                                                  // 314
                                                                                                                       //
      for (var i = 0; i < toPush.length; i++) {                                                                        // 315
        if (LocalCollection._f._type(toPush[i]) !== 3) {                                                               // 316
          throw MinimongoError("$push like modifiers using $sort " + "require all elements to be objects");            // 317
        }                                                                                                              // 319
      }                                                                                                                // 320
    } // Actually push.                                                                                                // 321
                                                                                                                       //
                                                                                                                       //
    if (position === undefined) {                                                                                      // 324
      for (var j = 0; j < toPush.length; j++) {                                                                        // 325
        target[field].push(toPush[j]);                                                                                 // 326
      }                                                                                                                // 325
    } else {                                                                                                           // 327
      var spliceArguments = [position, 0];                                                                             // 328
                                                                                                                       //
      for (var j = 0; j < toPush.length; j++) {                                                                        // 329
        spliceArguments.push(toPush[j]);                                                                               // 330
      }                                                                                                                // 329
                                                                                                                       //
      Array.prototype.splice.apply(target[field], spliceArguments);                                                    // 331
    } // Actually sort.                                                                                                // 332
                                                                                                                       //
                                                                                                                       //
    if (sortFunction) target[field].sort(sortFunction); // Actually slice.                                             // 335
                                                                                                                       //
    if (slice !== undefined) {                                                                                         // 339
      if (slice === 0) target[field] = []; // differs from Array.slice!                                                // 340
      else target[field] = target[field].slice(slice);                                                                 // 340
    }                                                                                                                  // 344
  },                                                                                                                   // 345
  $pushAll: function (target, field, arg) {                                                                            // 346
    if (!((typeof arg === "undefined" ? "undefined" : (0, _typeof3.default)(arg)) === "object" && arg instanceof Array)) throw MinimongoError("Modifier $pushAll/pullAll allowed for arrays only");
    var x = target[field];                                                                                             // 349
    if (x === undefined) target[field] = arg;else if (!(x instanceof Array)) throw MinimongoError("Cannot apply $pushAll modifier to non-array");else {
      for (var i = 0; i < arg.length; i++) {                                                                           // 355
        x.push(arg[i]);                                                                                                // 356
      }                                                                                                                // 355
    }                                                                                                                  // 357
  },                                                                                                                   // 358
  $addToSet: function (target, field, arg) {                                                                           // 359
    var isEach = false;                                                                                                // 360
                                                                                                                       //
    if ((typeof arg === "undefined" ? "undefined" : (0, _typeof3.default)(arg)) === "object") {                        // 361
      //check if first key is '$each'                                                                                  // 362
      for (var k in meteorBabelHelpers.sanitizeForInObject(arg)) {                                                     // 363
        if (k === "$each") isEach = true;                                                                              // 364
        break;                                                                                                         // 366
      }                                                                                                                // 367
    }                                                                                                                  // 368
                                                                                                                       //
    var values = isEach ? arg["$each"] : [arg];                                                                        // 369
    var x = target[field];                                                                                             // 370
    if (x === undefined) target[field] = values;else if (!(x instanceof Array)) throw MinimongoError("Cannot apply $addToSet modifier to non-array");else {
      _.each(values, function (value) {                                                                                // 376
        for (var i = 0; i < x.length; i++) {                                                                           // 377
          if (LocalCollection._f._equal(value, x[i])) return;                                                          // 378
        }                                                                                                              // 377
                                                                                                                       //
        x.push(value);                                                                                                 // 380
      });                                                                                                              // 381
    }                                                                                                                  // 382
  },                                                                                                                   // 383
  $pop: function (target, field, arg) {                                                                                // 384
    if (target === undefined) return;                                                                                  // 385
    var x = target[field];                                                                                             // 387
    if (x === undefined) return;else if (!(x instanceof Array)) throw MinimongoError("Cannot apply $pop modifier to non-array");else {
      if (typeof arg === 'number' && arg < 0) x.splice(0, 1);else x.pop();                                             // 393
    }                                                                                                                  // 397
  },                                                                                                                   // 398
  $pull: function (target, field, arg) {                                                                               // 399
    if (target === undefined) return;                                                                                  // 400
    var x = target[field];                                                                                             // 402
    if (x === undefined) return;else if (!(x instanceof Array)) throw MinimongoError("Cannot apply $pull/pullAll modifier to non-array");else {
      var out = [];                                                                                                    // 408
                                                                                                                       //
      if (arg != null && (typeof arg === "undefined" ? "undefined" : (0, _typeof3.default)(arg)) === "object" && !(arg instanceof Array)) {
        // XXX would be much nicer to compile this once, rather than                                                   // 410
        // for each document we modify.. but usually we're not                                                         // 411
        // modifying that many documents, so we'll let it slide for                                                    // 412
        // now                                                                                                         // 413
        // XXX Minimongo.Matcher isn't up for the job, because we need                                                 // 415
        // to permit stuff like {$pull: {a: {$gt: 4}}}.. something                                                     // 416
        // like {$gt: 4} is not normally a complete selector.                                                          // 417
        // same issue as $elemMatch possibly?                                                                          // 418
        var matcher = new Minimongo.Matcher(arg);                                                                      // 419
                                                                                                                       //
        for (var i = 0; i < x.length; i++) {                                                                           // 420
          if (!matcher.documentMatches(x[i]).result) out.push(x[i]);                                                   // 421
        }                                                                                                              // 420
      } else {                                                                                                         // 423
        for (var i = 0; i < x.length; i++) {                                                                           // 424
          if (!LocalCollection._f._equal(x[i], arg)) out.push(x[i]);                                                   // 425
        }                                                                                                              // 424
      }                                                                                                                // 427
                                                                                                                       //
      target[field] = out;                                                                                             // 428
    }                                                                                                                  // 429
  },                                                                                                                   // 430
  $pullAll: function (target, field, arg) {                                                                            // 431
    if (!((typeof arg === "undefined" ? "undefined" : (0, _typeof3.default)(arg)) === "object" && arg instanceof Array)) throw MinimongoError("Modifier $pushAll/pullAll allowed for arrays only");
    if (target === undefined) return;                                                                                  // 434
    var x = target[field];                                                                                             // 436
    if (x === undefined) return;else if (!(x instanceof Array)) throw MinimongoError("Cannot apply $pull/pullAll modifier to non-array");else {
      var out = [];                                                                                                    // 442
                                                                                                                       //
      for (var i = 0; i < x.length; i++) {                                                                             // 443
        var exclude = false;                                                                                           // 444
                                                                                                                       //
        for (var j = 0; j < arg.length; j++) {                                                                         // 445
          if (LocalCollection._f._equal(x[i], arg[j])) {                                                               // 446
            exclude = true;                                                                                            // 447
            break;                                                                                                     // 448
          }                                                                                                            // 449
        }                                                                                                              // 450
                                                                                                                       //
        if (!exclude) out.push(x[i]);                                                                                  // 451
      }                                                                                                                // 453
                                                                                                                       //
      target[field] = out;                                                                                             // 454
    }                                                                                                                  // 455
  },                                                                                                                   // 456
  $rename: function (target, field, arg, keypath, doc) {                                                               // 457
    if (keypath === arg) // no idea why mongo has this restriction..                                                   // 458
      throw MinimongoError("$rename source must differ from target");                                                  // 460
    if (target === null) throw MinimongoError("$rename source field invalid");                                         // 461
    if (typeof arg !== "string") throw MinimongoError("$rename target must be a string");                              // 463
                                                                                                                       //
    if (arg.indexOf('\0') > -1) {                                                                                      // 465
      // Null bytes are not allowed in Mongo field names                                                               // 466
      // https://docs.mongodb.com/manual/reference/limits/#Restrictions-on-Field-Names                                 // 467
      throw MinimongoError("The 'to' field for $rename cannot contain an embedded null byte");                         // 468
    }                                                                                                                  // 469
                                                                                                                       //
    if (target === undefined) return;                                                                                  // 470
    var v = target[field];                                                                                             // 472
    delete target[field];                                                                                              // 473
    var keyparts = arg.split('.');                                                                                     // 475
    var target2 = findModTarget(doc, keyparts, {                                                                       // 476
      forbidArray: true                                                                                                // 476
    });                                                                                                                // 476
    if (target2 === null) throw MinimongoError("$rename target field invalid");                                        // 477
    var field2 = keyparts.pop();                                                                                       // 479
    target2[field2] = v;                                                                                               // 480
  },                                                                                                                   // 481
  $bit: function (target, field, arg) {                                                                                // 482
    // XXX mongo only supports $bit on integers, and we only support                                                   // 483
    // native javascript numbers (doubles) so far, so we can't support $bit                                            // 484
    throw MinimongoError("$bit is not supported");                                                                     // 485
  }                                                                                                                    // 486
};                                                                                                                     // 184
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"diff.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/diff.js                                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// ordered: bool.                                                                                                      // 1
// old_results and new_results: collections of documents.                                                              // 2
//    if ordered, they are arrays.                                                                                     // 3
//    if unordered, they are IdMaps                                                                                    // 4
LocalCollection._diffQueryChanges = function (ordered, oldResults, newResults, observer, options) {                    // 5
  return DiffSequence.diffQueryChanges(ordered, oldResults, newResults, observer, options);                            // 6
};                                                                                                                     // 7
                                                                                                                       //
LocalCollection._diffQueryUnorderedChanges = function (oldResults, newResults, observer, options) {                    // 9
  return DiffSequence.diffQueryUnorderedChanges(oldResults, newResults, observer, options);                            // 10
};                                                                                                                     // 11
                                                                                                                       //
LocalCollection._diffQueryOrderedChanges = function (oldResults, newResults, observer, options) {                      // 14
  return DiffSequence.diffQueryOrderedChanges(oldResults, newResults, observer, options);                              // 16
};                                                                                                                     // 17
                                                                                                                       //
LocalCollection._diffObjects = function (left, right, callbacks) {                                                     // 19
  return DiffSequence.diffObjects(left, right, callbacks);                                                             // 20
};                                                                                                                     // 21
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"id_map.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/id_map.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
LocalCollection._IdMap = function () {                                                                                 // 1
  var self = this;                                                                                                     // 2
  IdMap.call(self, MongoID.idStringify, MongoID.idParse);                                                              // 3
};                                                                                                                     // 4
                                                                                                                       //
Meteor._inherits(LocalCollection._IdMap, IdMap);                                                                       // 6
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"observe.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/observe.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// XXX maybe move these into another ObserveHelpers package or something                                               // 1
// _CachingChangeObserver is an object which receives observeChanges callbacks                                         // 3
// and keeps a cache of the current cursor state up to date in self.docs. Users                                        // 4
// of this class should read the docs field but not modify it. You should pass                                         // 5
// the "applyChange" field as the callbacks to the underlying observeChanges                                           // 6
// call. Optionally, you can specify your own observeChanges callbacks which are                                       // 7
// invoked immediately before the docs field is updated; this object is made                                           // 8
// available as `this` to those callbacks.                                                                             // 9
LocalCollection._CachingChangeObserver = function (options) {                                                          // 10
  var self = this;                                                                                                     // 11
  options = options || {};                                                                                             // 12
                                                                                                                       //
  var orderedFromCallbacks = options.callbacks && LocalCollection._observeChangesCallbacksAreOrdered(options.callbacks);
                                                                                                                       //
  if (_.has(options, 'ordered')) {                                                                                     // 16
    self.ordered = options.ordered;                                                                                    // 17
    if (options.callbacks && options.ordered !== orderedFromCallbacks) throw Error("ordered option doesn't match callbacks");
  } else if (options.callbacks) {                                                                                      // 20
    self.ordered = orderedFromCallbacks;                                                                               // 21
  } else {                                                                                                             // 22
    throw Error("must provide ordered or callbacks");                                                                  // 23
  }                                                                                                                    // 24
                                                                                                                       //
  var callbacks = options.callbacks || {};                                                                             // 25
                                                                                                                       //
  if (self.ordered) {                                                                                                  // 27
    self.docs = new OrderedDict(MongoID.idStringify);                                                                  // 28
    self.applyChange = {                                                                                               // 29
      addedBefore: function (id, fields, before) {                                                                     // 30
        var doc = EJSON.clone(fields);                                                                                 // 31
        doc._id = id;                                                                                                  // 32
        callbacks.addedBefore && callbacks.addedBefore.call(self, id, fields, before); // This line triggers if we provide added with movedBefore.
                                                                                                                       //
        callbacks.added && callbacks.added.call(self, id, fields); // XXX could `before` be a falsy ID?  Technically   // 36
        // idStringify seems to allow for them -- though                                                               // 38
        // OrderedDict won't call stringify on a falsy arg.                                                            // 39
                                                                                                                       //
        self.docs.putBefore(id, doc, before || null);                                                                  // 40
      },                                                                                                               // 41
      movedBefore: function (id, before) {                                                                             // 42
        var doc = self.docs.get(id);                                                                                   // 43
        callbacks.movedBefore && callbacks.movedBefore.call(self, id, before);                                         // 44
        self.docs.moveBefore(id, before || null);                                                                      // 45
      }                                                                                                                // 46
    };                                                                                                                 // 29
  } else {                                                                                                             // 48
    self.docs = new LocalCollection._IdMap();                                                                          // 49
    self.applyChange = {                                                                                               // 50
      added: function (id, fields) {                                                                                   // 51
        var doc = EJSON.clone(fields);                                                                                 // 52
        callbacks.added && callbacks.added.call(self, id, fields);                                                     // 53
        doc._id = id;                                                                                                  // 54
        self.docs.set(id, doc);                                                                                        // 55
      }                                                                                                                // 56
    };                                                                                                                 // 50
  } // The methods in _IdMap and OrderedDict used by these callbacks are                                               // 58
  // identical.                                                                                                        // 61
                                                                                                                       //
                                                                                                                       //
  self.applyChange.changed = function (id, fields) {                                                                   // 62
    var doc = self.docs.get(id);                                                                                       // 63
    if (!doc) throw new Error("Unknown id for changed: " + id);                                                        // 64
    callbacks.changed && callbacks.changed.call(self, id, EJSON.clone(fields));                                        // 66
    DiffSequence.applyChanges(doc, fields);                                                                            // 68
  };                                                                                                                   // 69
                                                                                                                       //
  self.applyChange.removed = function (id) {                                                                           // 70
    callbacks.removed && callbacks.removed.call(self, id);                                                             // 71
    self.docs.remove(id);                                                                                              // 72
  };                                                                                                                   // 73
};                                                                                                                     // 74
                                                                                                                       //
LocalCollection._observeFromObserveChanges = function (cursor, observeCallbacks) {                                     // 76
  var transform = cursor.getTransform() || function (doc) {                                                            // 77
    return doc;                                                                                                        // 77
  };                                                                                                                   // 77
                                                                                                                       //
  var suppressed = !!observeCallbacks._suppress_initial;                                                               // 78
  var observeChangesCallbacks;                                                                                         // 80
                                                                                                                       //
  if (LocalCollection._observeCallbacksAreOrdered(observeCallbacks)) {                                                 // 81
    // The "_no_indices" option sets all index arguments to -1 and skips the                                           // 82
    // linear scans required to generate them.  This lets observers that don't                                         // 83
    // need absolute indices benefit from the other features of this API --                                            // 84
    // relative order, transforms, and applyChanges -- without the speed hit.                                          // 85
    var indices = !observeCallbacks._no_indices;                                                                       // 86
    observeChangesCallbacks = {                                                                                        // 87
      addedBefore: function (id, fields, before) {                                                                     // 88
        var self = this;                                                                                               // 89
        if (suppressed || !(observeCallbacks.addedAt || observeCallbacks.added)) return;                               // 90
        var doc = transform(_.extend(fields, {                                                                         // 92
          _id: id                                                                                                      // 92
        }));                                                                                                           // 92
                                                                                                                       //
        if (observeCallbacks.addedAt) {                                                                                // 93
          var index = indices ? before ? self.docs.indexOf(before) : self.docs.size() : -1;                            // 94
          observeCallbacks.addedAt(doc, index, before);                                                                // 96
        } else {                                                                                                       // 97
          observeCallbacks.added(doc);                                                                                 // 98
        }                                                                                                              // 99
      },                                                                                                               // 100
      changed: function (id, fields) {                                                                                 // 101
        var self = this;                                                                                               // 102
        if (!(observeCallbacks.changedAt || observeCallbacks.changed)) return;                                         // 103
        var doc = EJSON.clone(self.docs.get(id));                                                                      // 105
        if (!doc) throw new Error("Unknown id for changed: " + id);                                                    // 106
        var oldDoc = transform(EJSON.clone(doc));                                                                      // 108
        DiffSequence.applyChanges(doc, fields);                                                                        // 109
        doc = transform(doc);                                                                                          // 110
                                                                                                                       //
        if (observeCallbacks.changedAt) {                                                                              // 111
          var index = indices ? self.docs.indexOf(id) : -1;                                                            // 112
          observeCallbacks.changedAt(doc, oldDoc, index);                                                              // 113
        } else {                                                                                                       // 114
          observeCallbacks.changed(doc, oldDoc);                                                                       // 115
        }                                                                                                              // 116
      },                                                                                                               // 117
      movedBefore: function (id, before) {                                                                             // 118
        var self = this;                                                                                               // 119
        if (!observeCallbacks.movedTo) return;                                                                         // 120
        var from = indices ? self.docs.indexOf(id) : -1;                                                               // 122
        var to = indices ? before ? self.docs.indexOf(before) : self.docs.size() : -1; // When not moving backwards, adjust for the fact that removing the
        // document slides everything back one slot.                                                                   // 127
                                                                                                                       //
        if (to > from) --to;                                                                                           // 128
        observeCallbacks.movedTo(transform(EJSON.clone(self.docs.get(id))), from, to, before || null);                 // 130
      },                                                                                                               // 132
      removed: function (id) {                                                                                         // 133
        var self = this;                                                                                               // 134
        if (!(observeCallbacks.removedAt || observeCallbacks.removed)) return; // technically maybe there should be an EJSON.clone here, but it's about
        // to be removed from self.docs!                                                                               // 138
                                                                                                                       //
        var doc = transform(self.docs.get(id));                                                                        // 139
                                                                                                                       //
        if (observeCallbacks.removedAt) {                                                                              // 140
          var index = indices ? self.docs.indexOf(id) : -1;                                                            // 141
          observeCallbacks.removedAt(doc, index);                                                                      // 142
        } else {                                                                                                       // 143
          observeCallbacks.removed(doc);                                                                               // 144
        }                                                                                                              // 145
      }                                                                                                                // 146
    };                                                                                                                 // 87
  } else {                                                                                                             // 148
    observeChangesCallbacks = {                                                                                        // 149
      added: function (id, fields) {                                                                                   // 150
        if (!suppressed && observeCallbacks.added) {                                                                   // 151
          var doc = _.extend(fields, {                                                                                 // 152
            _id: id                                                                                                    // 152
          });                                                                                                          // 152
                                                                                                                       //
          observeCallbacks.added(transform(doc));                                                                      // 153
        }                                                                                                              // 154
      },                                                                                                               // 155
      changed: function (id, fields) {                                                                                 // 156
        var self = this;                                                                                               // 157
                                                                                                                       //
        if (observeCallbacks.changed) {                                                                                // 158
          var oldDoc = self.docs.get(id);                                                                              // 159
          var doc = EJSON.clone(oldDoc);                                                                               // 160
          DiffSequence.applyChanges(doc, fields);                                                                      // 161
          observeCallbacks.changed(transform(doc), transform(EJSON.clone(oldDoc)));                                    // 162
        }                                                                                                              // 164
      },                                                                                                               // 165
      removed: function (id) {                                                                                         // 166
        var self = this;                                                                                               // 167
                                                                                                                       //
        if (observeCallbacks.removed) {                                                                                // 168
          observeCallbacks.removed(transform(self.docs.get(id)));                                                      // 169
        }                                                                                                              // 170
      }                                                                                                                // 171
    };                                                                                                                 // 149
  }                                                                                                                    // 173
                                                                                                                       //
  var changeObserver = new LocalCollection._CachingChangeObserver({                                                    // 175
    callbacks: observeChangesCallbacks                                                                                 // 176
  });                                                                                                                  // 176
  var handle = cursor.observeChanges(changeObserver.applyChange);                                                      // 177
  suppressed = false;                                                                                                  // 178
  return handle;                                                                                                       // 180
};                                                                                                                     // 181
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"objectid.js":["babel-runtime/helpers/typeof",function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/objectid.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _typeof2 = require("babel-runtime/helpers/typeof");                                                                //
                                                                                                                       //
var _typeof3 = _interopRequireDefault(_typeof2);                                                                       //
                                                                                                                       //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                      //
                                                                                                                       //
// Is this selector just shorthand for lookup by _id?                                                                  // 1
LocalCollection._selectorIsId = function (selector) {                                                                  // 2
  return typeof selector === "string" || typeof selector === "number" || selector instanceof MongoID.ObjectID;         // 3
}; // Is the selector just lookup by _id (shorthand or not)?                                                           // 6
                                                                                                                       //
                                                                                                                       //
LocalCollection._selectorIsIdPerhapsAsObject = function (selector) {                                                   // 9
  return LocalCollection._selectorIsId(selector) || selector && (typeof selector === "undefined" ? "undefined" : (0, _typeof3.default)(selector)) === "object" && selector._id && LocalCollection._selectorIsId(selector._id) && _.size(selector) === 1;
}; // If this is a selector which explicitly constrains the match by ID to a finite                                    // 14
// number of documents, returns a list of their IDs.  Otherwise returns                                                // 17
// null. Note that the selector may have other restrictions so it may not even                                         // 18
// match those document!  We care about $in and $and since those are generated                                         // 19
// access-controlled update and remove.                                                                                // 20
                                                                                                                       //
                                                                                                                       //
LocalCollection._idsMatchedBySelector = function (selector) {                                                          // 21
  // Is the selector just an ID?                                                                                       // 22
  if (LocalCollection._selectorIsId(selector)) return [selector];                                                      // 23
  if (!selector) return null; // Do we have an _id clause?                                                             // 25
                                                                                                                       //
  if (_.has(selector, '_id')) {                                                                                        // 29
    // Is the _id clause just an ID?                                                                                   // 30
    if (LocalCollection._selectorIsId(selector._id)) return [selector._id]; // Is the _id clause {_id: {$in: ["x", "y", "z"]}}?
                                                                                                                       //
    if (selector._id && selector._id.$in && _.isArray(selector._id.$in) && !_.isEmpty(selector._id.$in) && _.all(selector._id.$in, LocalCollection._selectorIsId)) {
      return selector._id.$in;                                                                                         // 38
    }                                                                                                                  // 39
                                                                                                                       //
    return null;                                                                                                       // 40
  } // If this is a top-level $and, and any of the clauses constrain their                                             // 41
  // documents, then the whole selector is constrained by any one clause's                                             // 44
  // constraint. (Well, by their intersection, but that seems unlikely.)                                               // 45
                                                                                                                       //
                                                                                                                       //
  if (selector.$and && _.isArray(selector.$and)) {                                                                     // 46
    for (var i = 0; i < selector.$and.length; ++i) {                                                                   // 47
      var subIds = LocalCollection._idsMatchedBySelector(selector.$and[i]);                                            // 48
                                                                                                                       //
      if (subIds) return subIds;                                                                                       // 49
    }                                                                                                                  // 51
  }                                                                                                                    // 52
                                                                                                                       //
  return null;                                                                                                         // 54
};                                                                                                                     // 55
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"selector_projection.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/selector_projection.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// Knows how to combine a mongo selector and a fields projection to a new fields                                       // 1
// projection taking into account active fields from the passed selector.                                              // 2
// @returns Object - projection object (same as fields option of mongo cursor)                                         // 3
Minimongo.Matcher.prototype.combineIntoProjection = function (projection) {                                            // 4
  var self = this;                                                                                                     // 5
                                                                                                                       //
  var selectorPaths = Minimongo._pathsElidingNumericKeys(self._getPaths()); // Special case for $where operator in the selector - projection should depend
  // on all fields of the document. getSelectorPaths returns a list of paths                                           // 9
  // selector depends on. If one of the paths is '' (empty string) representing                                        // 10
  // the root or the whole document, complete projection should be returned.                                           // 11
                                                                                                                       //
                                                                                                                       //
  if (_.contains(selectorPaths, '')) return {};                                                                        // 12
  return combineImportantPathsIntoProjection(selectorPaths, projection);                                               // 15
};                                                                                                                     // 16
                                                                                                                       //
Minimongo._pathsElidingNumericKeys = function (paths) {                                                                // 18
  var self = this;                                                                                                     // 19
  return _.map(paths, function (path) {                                                                                // 20
    return _.reject(path.split('.'), isNumericKey).join('.');                                                          // 21
  });                                                                                                                  // 22
};                                                                                                                     // 23
                                                                                                                       //
combineImportantPathsIntoProjection = function (paths, projection) {                                                   // 25
  var prjDetails = projectionDetails(projection);                                                                      // 26
  var tree = prjDetails.tree;                                                                                          // 27
  var mergedProjection = {}; // merge the paths to include                                                             // 28
                                                                                                                       //
  tree = pathsToTree(paths, function (path) {                                                                          // 31
    return true;                                                                                                       // 32
  }, function (node, path, fullPath) {                                                                                 // 32
    return true;                                                                                                       // 33
  }, tree);                                                                                                            // 33
  mergedProjection = treeToPaths(tree);                                                                                // 35
                                                                                                                       //
  if (prjDetails.including) {                                                                                          // 36
    // both selector and projection are pointing on fields to include                                                  // 37
    // so we can just return the merged tree                                                                           // 38
    return mergedProjection;                                                                                           // 39
  } else {                                                                                                             // 40
    // selector is pointing at fields to include                                                                       // 41
    // projection is pointing at fields to exclude                                                                     // 42
    // make sure we don't exclude important paths                                                                      // 43
    var mergedExclProjection = {};                                                                                     // 44
                                                                                                                       //
    _.each(mergedProjection, function (incl, path) {                                                                   // 45
      if (!incl) mergedExclProjection[path] = false;                                                                   // 46
    });                                                                                                                // 48
                                                                                                                       //
    return mergedExclProjection;                                                                                       // 50
  }                                                                                                                    // 51
}; // Returns a set of key paths similar to                                                                            // 52
// { 'foo.bar': 1, 'a.b.c': 1 }                                                                                        // 55
                                                                                                                       //
                                                                                                                       //
var treeToPaths = function (tree, prefix) {                                                                            // 56
  prefix = prefix || '';                                                                                               // 57
  var result = {};                                                                                                     // 58
                                                                                                                       //
  _.each(tree, function (val, key) {                                                                                   // 60
    if (_.isObject(val)) _.extend(result, treeToPaths(val, prefix + key + '.'));else result[prefix + key] = val;       // 61
  });                                                                                                                  // 65
                                                                                                                       //
  return result;                                                                                                       // 67
};                                                                                                                     // 68
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"selector_modifier.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/selector_modifier.js                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// Returns true if the modifier applied to some document may change the result                                         // 1
// of matching the document by selector                                                                                // 2
// The modifier is always in a form of Object:                                                                         // 3
//  - $set                                                                                                             // 4
//    - 'a.b.22.z': value                                                                                              // 5
//    - 'foo.bar': 42                                                                                                  // 6
//  - $unset                                                                                                           // 7
//    - 'abc.d': 1                                                                                                     // 8
Minimongo.Matcher.prototype.affectedByModifier = function (modifier) {                                                 // 9
  var self = this; // safe check for $set/$unset being objects                                                         // 10
                                                                                                                       //
  modifier = _.extend({                                                                                                // 12
    $set: {},                                                                                                          // 12
    $unset: {}                                                                                                         // 12
  }, modifier);                                                                                                        // 12
                                                                                                                       //
  var modifiedPaths = _.keys(modifier.$set).concat(_.keys(modifier.$unset));                                           // 13
                                                                                                                       //
  var meaningfulPaths = self._getPaths();                                                                              // 14
                                                                                                                       //
  return _.any(modifiedPaths, function (path) {                                                                        // 16
    var mod = path.split('.');                                                                                         // 17
    return _.any(meaningfulPaths, function (meaningfulPath) {                                                          // 18
      var sel = meaningfulPath.split('.');                                                                             // 19
      var i = 0,                                                                                                       // 20
          j = 0;                                                                                                       // 20
                                                                                                                       //
      while (i < sel.length && j < mod.length) {                                                                       // 22
        if (isNumericKey(sel[i]) && isNumericKey(mod[j])) {                                                            // 23
          // foo.4.bar selector affected by foo.4 modifier                                                             // 24
          // foo.3.bar selector unaffected by foo.4 modifier                                                           // 25
          if (sel[i] === mod[j]) i++, j++;else return false;                                                           // 26
        } else if (isNumericKey(sel[i])) {                                                                             // 30
          // foo.4.bar selector unaffected by foo.bar modifier                                                         // 31
          return false;                                                                                                // 32
        } else if (isNumericKey(mod[j])) {                                                                             // 33
          j++;                                                                                                         // 34
        } else if (sel[i] === mod[j]) i++, j++;else return false;                                                      // 35
      } // One is a prefix of another, taking numeric fields into account                                              // 39
                                                                                                                       //
                                                                                                                       //
      return true;                                                                                                     // 42
    });                                                                                                                // 43
  });                                                                                                                  // 44
}; // Minimongo.Sorter gets a similar method, which delegates to a Matcher it made                                     // 45
// for this exact purpose.                                                                                             // 48
                                                                                                                       //
                                                                                                                       //
Minimongo.Sorter.prototype.affectedByModifier = function (modifier) {                                                  // 49
  var self = this;                                                                                                     // 50
  return self._selectorForAffectedByModifier.affectedByModifier(modifier);                                             // 51
}; // @param modifier - Object: MongoDB-styled modifier with `$set`s and `$unsets`                                     // 52
//                           only. (assumed to come from oplog)                                                        // 55
// @returns - Boolean: if after applying the modifier, selector can start                                              // 56
//                     accepting the modified value.                                                                   // 57
// NOTE: assumes that document affected by modifier didn't match this Matcher                                          // 58
// before, so if modifier can't convince selector in a positive change it would                                        // 59
// stay 'false'.                                                                                                       // 60
// Currently doesn't support $-operators and numeric indices precisely.                                                // 61
                                                                                                                       //
                                                                                                                       //
Minimongo.Matcher.prototype.canBecomeTrueByModifier = function (modifier) {                                            // 62
  var self = this;                                                                                                     // 63
  if (!this.affectedByModifier(modifier)) return false;                                                                // 64
  modifier = _.extend({                                                                                                // 67
    $set: {},                                                                                                          // 67
    $unset: {}                                                                                                         // 67
  }, modifier);                                                                                                        // 67
                                                                                                                       //
  var modifierPaths = _.keys(modifier.$set).concat(_.keys(modifier.$unset));                                           // 68
                                                                                                                       //
  if (!self.isSimple()) return true;                                                                                   // 70
  if (_.any(self._getPaths(), pathHasNumericKeys) || _.any(modifierPaths, pathHasNumericKeys)) return true; // check if there is a $set or $unset that indicates something is an
  // object rather than a scalar in the actual object where we saw $-operator                                          // 78
  // NOTE: it is correct since we allow only scalars in $-operators                                                    // 79
  // Example: for selector {'a.b': {$gt: 5}} the modifier {'a.b.c':7} would                                            // 80
  // definitely set the result to false as 'a.b' appears to be an object.                                              // 81
                                                                                                                       //
  var expectedScalarIsObject = _.any(self._selector, function (sel, path) {                                            // 82
    if (!isOperatorObject(sel)) return false;                                                                          // 83
    return _.any(modifierPaths, function (modifierPath) {                                                              // 85
      return startsWith(modifierPath, path + '.');                                                                     // 86
    });                                                                                                                // 87
  });                                                                                                                  // 88
                                                                                                                       //
  if (expectedScalarIsObject) return false; // See if we can apply the modifier on the ideally matching object. If it  // 90
  // still matches the selector, then the modifier could have turned the real                                          // 94
  // object in the database into something matching.                                                                   // 95
                                                                                                                       //
  var matchingDocument = EJSON.clone(self.matchingDocument()); // The selector is too complex, anything can happen.    // 96
                                                                                                                       //
  if (matchingDocument === null) return true;                                                                          // 99
                                                                                                                       //
  try {                                                                                                                // 102
    LocalCollection._modify(matchingDocument, modifier);                                                               // 103
  } catch (e) {                                                                                                        // 104
    // Couldn't set a property on a field which is a scalar or null in the                                             // 105
    // selector.                                                                                                       // 106
    // Example:                                                                                                        // 107
    // real document: { 'a.b': 3 }                                                                                     // 108
    // selector: { 'a': 12 }                                                                                           // 109
    // converted selector (ideal document): { 'a': 12 }                                                                // 110
    // modifier: { $set: { 'a.b': 4 } }                                                                                // 111
    // We don't know what real document was like but from the error raised by                                          // 112
    // $set on a scalar field we can reason that the structure of real document                                        // 113
    // is completely different.                                                                                        // 114
    if (e.name === "MinimongoError" && e.setPropertyError) return false;                                               // 115
    throw e;                                                                                                           // 117
  }                                                                                                                    // 118
                                                                                                                       //
  return self.documentMatches(matchingDocument).result;                                                                // 120
}; // Returns an object that would match the selector if possible or null if the                                       // 121
// selector is too complex for us to analyze                                                                           // 124
// { 'a.b': { ans: 42 }, 'foo.bar': null, 'foo.baz': "something" }                                                     // 125
// => { a: { b: { ans: 42 } }, foo: { bar: null, baz: "something" } }                                                  // 126
                                                                                                                       //
                                                                                                                       //
Minimongo.Matcher.prototype.matchingDocument = function () {                                                           // 127
  var self = this; // check if it was computed before                                                                  // 128
                                                                                                                       //
  if (self._matchingDocument !== undefined) return self._matchingDocument; // If the analysis of this selector is too hard for our implementation
  // fallback to "YES"                                                                                                 // 135
                                                                                                                       //
  var fallback = false;                                                                                                // 136
  self._matchingDocument = pathsToTree(self._getPaths(), function (path) {                                             // 137
    var valueSelector = self._selector[path];                                                                          // 139
                                                                                                                       //
    if (isOperatorObject(valueSelector)) {                                                                             // 140
      // if there is a strict equality, there is a good                                                                // 141
      // chance we can use one of those as "matching"                                                                  // 142
      // dummy value                                                                                                   // 143
      if (valueSelector.$eq) {                                                                                         // 144
        return valueSelector.$eq;                                                                                      // 145
      } else if (valueSelector.$in) {                                                                                  // 146
        var matcher = new Minimongo.Matcher({                                                                          // 147
          placeholder: valueSelector                                                                                   // 147
        }); // Return anything from $in that matches the whole selector for this                                       // 147
        // path. If nothing matches, returns `undefined` as nothing can make                                           // 150
        // this selector into `true`.                                                                                  // 151
                                                                                                                       //
        return _.find(valueSelector.$in, function (x) {                                                                // 152
          return matcher.documentMatches({                                                                             // 153
            placeholder: x                                                                                             // 153
          }).result;                                                                                                   // 153
        });                                                                                                            // 154
      } else if (onlyContainsKeys(valueSelector, ['$gt', '$gte', '$lt', '$lte'])) {                                    // 155
        var lowerBound = -Infinity,                                                                                    // 156
            upperBound = Infinity;                                                                                     // 156
                                                                                                                       //
        _.each(['$lte', '$lt'], function (op) {                                                                        // 157
          if (_.has(valueSelector, op) && valueSelector[op] < upperBound) upperBound = valueSelector[op];              // 158
        });                                                                                                            // 160
                                                                                                                       //
        _.each(['$gte', '$gt'], function (op) {                                                                        // 161
          if (_.has(valueSelector, op) && valueSelector[op] > lowerBound) lowerBound = valueSelector[op];              // 162
        });                                                                                                            // 164
                                                                                                                       //
        var middle = (lowerBound + upperBound) / 2;                                                                    // 166
        var matcher = new Minimongo.Matcher({                                                                          // 167
          placeholder: valueSelector                                                                                   // 167
        });                                                                                                            // 167
        if (!matcher.documentMatches({                                                                                 // 168
          placeholder: middle                                                                                          // 168
        }).result && (middle === lowerBound || middle === upperBound)) fallback = true;                                // 168
        return middle;                                                                                                 // 172
      } else if (onlyContainsKeys(valueSelector, ['$nin', '$ne'])) {                                                   // 173
        // Since self._isSimple makes sure $nin and $ne are not combined with                                          // 174
        // objects or arrays, we can confidently return an empty object as it                                          // 175
        // never matches any scalar.                                                                                   // 176
        return {};                                                                                                     // 177
      } else {                                                                                                         // 178
        fallback = true;                                                                                               // 179
      }                                                                                                                // 180
    }                                                                                                                  // 181
                                                                                                                       //
    return self._selector[path];                                                                                       // 182
  }, _.identity /*conflict resolution is no resolution*/);                                                             // 183
  if (fallback) self._matchingDocument = null;                                                                         // 186
  return self._matchingDocument;                                                                                       // 189
};                                                                                                                     // 190
                                                                                                                       //
var getPaths = function (sel) {                                                                                        // 192
  return _.keys(new Minimongo.Matcher(sel)._paths);                                                                    // 193
  return _.chain(sel).map(function (v, k) {                                                                            // 194
    // we don't know how to handle $where because it can be anything                                                   // 195
    if (k === "$where") return ''; // matches everything                                                               // 196
    // we branch from $or/$and/$nor operator                                                                           // 198
                                                                                                                       //
    if (_.contains(['$or', '$and', '$nor'], k)) return _.map(v, getPaths); // the value is a literal or some comparison operator
                                                                                                                       //
    return k;                                                                                                          // 202
  }).flatten().uniq().value();                                                                                         // 203
}; // A helper to ensure object has only certain keys                                                                  // 204
                                                                                                                       //
                                                                                                                       //
var onlyContainsKeys = function (obj, keys) {                                                                          // 207
  return _.all(obj, function (v, k) {                                                                                  // 208
    return _.contains(keys, k);                                                                                        // 209
  });                                                                                                                  // 210
};                                                                                                                     // 211
                                                                                                                       //
var pathHasNumericKeys = function (path) {                                                                             // 213
  return _.any(path.split('.'), isNumericKey);                                                                         // 214
}; // XXX from Underscore.String (http://epeli.github.com/underscore.string/)                                          // 215
                                                                                                                       //
                                                                                                                       //
var startsWith = function (str, starts) {                                                                              // 218
  return str.length >= starts.length && str.substring(0, starts.length) === starts;                                    // 219
};                                                                                                                     // 221
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sorter_projection.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/minimongo/sorter_projection.js                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Minimongo.Sorter.prototype.combineIntoProjection = function (projection) {                                             // 1
  var self = this;                                                                                                     // 2
                                                                                                                       //
  var specPaths = Minimongo._pathsElidingNumericKeys(self._getPaths());                                                // 3
                                                                                                                       //
  return combineImportantPathsIntoProjection(specPaths, projection);                                                   // 4
};                                                                                                                     // 5
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{"extensions":[".js",".json"]});
require("./node_modules/meteor/minimongo/minimongo.js");
require("./node_modules/meteor/minimongo/wrap_transform.js");
require("./node_modules/meteor/minimongo/helpers.js");
require("./node_modules/meteor/minimongo/selector.js");
require("./node_modules/meteor/minimongo/sort.js");
require("./node_modules/meteor/minimongo/projection.js");
require("./node_modules/meteor/minimongo/modify.js");
require("./node_modules/meteor/minimongo/diff.js");
require("./node_modules/meteor/minimongo/id_map.js");
require("./node_modules/meteor/minimongo/observe.js");
require("./node_modules/meteor/minimongo/objectid.js");
require("./node_modules/meteor/minimongo/selector_projection.js");
require("./node_modules/meteor/minimongo/selector_modifier.js");
require("./node_modules/meteor/minimongo/sorter_projection.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package.minimongo = {}, {
  LocalCollection: LocalCollection,
  Minimongo: Minimongo,
  MinimongoTest: MinimongoTest
});

})();

//# sourceMappingURL=minimongo.js.map
