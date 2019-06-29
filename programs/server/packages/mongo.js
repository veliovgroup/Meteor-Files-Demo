(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var NpmModuleMongodb = Package['npm-mongo'].NpmModuleMongodb;
var NpmModuleMongodbVersion = Package['npm-mongo'].NpmModuleMongodbVersion;
var AllowDeny = Package['allow-deny'].AllowDeny;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var MongoID = Package['mongo-id'].MongoID;
var check = Package.check.check;
var Match = Package.check.Match;
var ECMAScript = Package.ecmascript.ECMAScript;
var Decimal = Package['mongo-decimal'].Decimal;
var _ = Package.underscore._;
var MaxHeap = Package['binary-heap'].MaxHeap;
var MinHeap = Package['binary-heap'].MinHeap;
var MinMaxHeap = Package['binary-heap'].MinMaxHeap;
var Hook = Package['callback-hook'].Hook;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var MongoInternals, MongoTest, MongoConnection, CursorDescription, Cursor, listenAll, forEachTrigger, OPLOG_COLLECTION, idForOp, OplogHandle, ObserveMultiplexer, ObserveHandle, DocFetcher, PollingObserveDriver, OplogObserveDriver, Mongo, selector, callback, options;

var require = meteorInstall({"node_modules":{"meteor":{"mongo":{"mongo_driver.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/mongo_driver.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * Provide a synchronous Collection API using fibers, backed by
 * MongoDB.  This is only for use on the server, and mostly identical
 * to the client API.
 *
 * NOTE: the public API methods must be run within a fiber. If you call
 * these outside of a fiber they will explode!
 */
var MongoDB = NpmModuleMongodb;

var Future = Npm.require('fibers/future');

MongoInternals = {};
MongoTest = {};
MongoInternals.NpmModules = {
  mongodb: {
    version: NpmModuleMongodbVersion,
    module: MongoDB
  }
}; // Older version of what is now available via
// MongoInternals.NpmModules.mongodb.module.  It was never documented, but
// people do use it.
// XXX COMPAT WITH 1.0.3.2

MongoInternals.NpmModule = MongoDB; // This is used to add or remove EJSON from the beginning of everything nested
// inside an EJSON custom type. It should only be called on pure JSON!

var replaceNames = function (filter, thing) {
  if (typeof thing === "object" && thing !== null) {
    if (_.isArray(thing)) {
      return _.map(thing, _.bind(replaceNames, null, filter));
    }

    var ret = {};

    _.each(thing, function (value, key) {
      ret[filter(key)] = replaceNames(filter, value);
    });

    return ret;
  }

  return thing;
}; // Ensure that EJSON.clone keeps a Timestamp as a Timestamp (instead of just
// doing a structural clone).
// XXX how ok is this? what if there are multiple copies of MongoDB loaded?


MongoDB.Timestamp.prototype.clone = function () {
  // Timestamps should be immutable.
  return this;
};

var makeMongoLegal = function (name) {
  return "EJSON" + name;
};

var unmakeMongoLegal = function (name) {
  return name.substr(5);
};

var replaceMongoAtomWithMeteor = function (document) {
  if (document instanceof MongoDB.Binary) {
    var buffer = document.value(true);
    return new Uint8Array(buffer);
  }

  if (document instanceof MongoDB.ObjectID) {
    return new Mongo.ObjectID(document.toHexString());
  }

  if (document instanceof MongoDB.Decimal128) {
    return Decimal(document.toString());
  }

  if (document["EJSON$type"] && document["EJSON$value"] && _.size(document) === 2) {
    return EJSON.fromJSONValue(replaceNames(unmakeMongoLegal, document));
  }

  if (document instanceof MongoDB.Timestamp) {
    // For now, the Meteor representation of a Mongo timestamp type (not a date!
    // this is a weird internal thing used in the oplog!) is the same as the
    // Mongo representation. We need to do this explicitly or else we would do a
    // structural clone and lose the prototype.
    return document;
  }

  return undefined;
};

var replaceMeteorAtomWithMongo = function (document) {
  if (EJSON.isBinary(document)) {
    // This does more copies than we'd like, but is necessary because
    // MongoDB.BSON only looks like it takes a Uint8Array (and doesn't actually
    // serialize it correctly).
    return new MongoDB.Binary(Buffer.from(document));
  }

  if (document instanceof Mongo.ObjectID) {
    return new MongoDB.ObjectID(document.toHexString());
  }

  if (document instanceof MongoDB.Timestamp) {
    // For now, the Meteor representation of a Mongo timestamp type (not a date!
    // this is a weird internal thing used in the oplog!) is the same as the
    // Mongo representation. We need to do this explicitly or else we would do a
    // structural clone and lose the prototype.
    return document;
  }

  if (document instanceof Decimal) {
    return MongoDB.Decimal128.fromString(document.toString());
  }

  if (EJSON._isCustomType(document)) {
    return replaceNames(makeMongoLegal, EJSON.toJSONValue(document));
  } // It is not ordinarily possible to stick dollar-sign keys into mongo
  // so we don't bother checking for things that need escaping at this time.


  return undefined;
};

var replaceTypes = function (document, atomTransformer) {
  if (typeof document !== 'object' || document === null) return document;
  var replacedTopLevelAtom = atomTransformer(document);
  if (replacedTopLevelAtom !== undefined) return replacedTopLevelAtom;
  var ret = document;

  _.each(document, function (val, key) {
    var valReplaced = replaceTypes(val, atomTransformer);

    if (val !== valReplaced) {
      // Lazy clone. Shallow copy.
      if (ret === document) ret = _.clone(document);
      ret[key] = valReplaced;
    }
  });

  return ret;
};

MongoConnection = function (url, options) {
  var self = this;
  options = options || {};
  self._observeMultiplexers = {};
  self._onFailoverHook = new Hook();
  var mongoOptions = Object.assign({
    // Reconnect on error.
    autoReconnect: true,
    // Try to reconnect forever, instead of stopping after 30 tries (the
    // default), with each attempt separated by 1000ms.
    reconnectTries: Infinity,
    ignoreUndefined: true,
    // Required to silence deprecation warnings with mongodb@3.1.1.
    useNewUrlParser: true
  }, Mongo._connectionOptions); // Disable the native parser by default, unless specifically enabled
  // in the mongo URL.
  // - The native driver can cause errors which normally would be
  //   thrown, caught, and handled into segfaults that take down the
  //   whole app.
  // - Binary modules don't yet work when you bundle and move the bundle
  //   to a different platform (aka deploy)
  // We should revisit this after binary npm module support lands.

  if (!/[\?&]native_?[pP]arser=/.test(url)) {
    mongoOptions.native_parser = false;
  } // Internally the oplog connections specify their own poolSize
  // which we don't want to overwrite with any user defined value


  if (_.has(options, 'poolSize')) {
    // If we just set this for "server", replSet will override it. If we just
    // set it for replSet, it will be ignored if we're not using a replSet.
    mongoOptions.poolSize = options.poolSize;
  }

  self.db = null; // We keep track of the ReplSet's primary, so that we can trigger hooks when
  // it changes.  The Node driver's joined callback seems to fire way too
  // often, which is why we need to track it ourselves.

  self._primary = null;
  self._oplogHandle = null;
  self._docFetcher = null;
  var connectFuture = new Future();
  MongoDB.connect(url, mongoOptions, Meteor.bindEnvironment(function (err, client) {
    if (err) {
      throw err;
    }

    var db = client.db(); // First, figure out what the current primary is, if any.

    if (db.serverConfig.isMasterDoc) {
      self._primary = db.serverConfig.isMasterDoc.primary;
    }

    db.serverConfig.on('joined', Meteor.bindEnvironment(function (kind, doc) {
      if (kind === 'primary') {
        if (doc.primary !== self._primary) {
          self._primary = doc.primary;

          self._onFailoverHook.each(function (callback) {
            callback();
            return true;
          });
        }
      } else if (doc.me === self._primary) {
        // The thing we thought was primary is now something other than
        // primary.  Forget that we thought it was primary.  (This means
        // that if a server stops being primary and then starts being
        // primary again without another server becoming primary in the
        // middle, we'll correctly count it as a failover.)
        self._primary = null;
      }
    })); // Allow the constructor to return.

    connectFuture['return']({
      client,
      db
    });
  }, connectFuture.resolver() // onException
  )); // Wait for the connection to be successful (throws on failure) and assign the
  // results (`client` and `db`) to `self`.

  Object.assign(self, connectFuture.wait());

  if (options.oplogUrl && !Package['disable-oplog']) {
    self._oplogHandle = new OplogHandle(options.oplogUrl, self.db.databaseName);
    self._docFetcher = new DocFetcher(self);
  }
};

MongoConnection.prototype.close = function () {
  var self = this;
  if (!self.db) throw Error("close called before Connection created?"); // XXX probably untested

  var oplogHandle = self._oplogHandle;
  self._oplogHandle = null;
  if (oplogHandle) oplogHandle.stop(); // Use Future.wrap so that errors get thrown. This happens to
  // work even outside a fiber since the 'close' method is not
  // actually asynchronous.

  Future.wrap(_.bind(self.client.close, self.client))(true).wait();
}; // Returns the Mongo Collection object; may yield.


MongoConnection.prototype.rawCollection = function (collectionName) {
  var self = this;
  if (!self.db) throw Error("rawCollection called before Connection created?");
  var future = new Future();
  self.db.collection(collectionName, future.resolver());
  return future.wait();
};

MongoConnection.prototype._createCappedCollection = function (collectionName, byteSize, maxDocuments) {
  var self = this;
  if (!self.db) throw Error("_createCappedCollection called before Connection created?");
  var future = new Future();
  self.db.createCollection(collectionName, {
    capped: true,
    size: byteSize,
    max: maxDocuments
  }, future.resolver());
  future.wait();
}; // This should be called synchronously with a write, to create a
// transaction on the current write fence, if any. After we can read
// the write, and after observers have been notified (or at least,
// after the observer notifiers have added themselves to the write
// fence), you should call 'committed()' on the object returned.


MongoConnection.prototype._maybeBeginWrite = function () {
  var fence = DDPServer._CurrentWriteFence.get();

  if (fence) {
    return fence.beginWrite();
  } else {
    return {
      committed: function () {}
    };
  }
}; // Internal interface: adds a callback which is called when the Mongo primary
// changes. Returns a stop handle.


MongoConnection.prototype._onFailover = function (callback) {
  return this._onFailoverHook.register(callback);
}; //////////// Public API //////////
// The write methods block until the database has confirmed the write (it may
// not be replicated or stable on disk, but one server has confirmed it) if no
// callback is provided. If a callback is provided, then they call the callback
// when the write is confirmed. They return nothing on success, and raise an
// exception on failure.
//
// After making a write (with insert, update, remove), observers are
// notified asynchronously. If you want to receive a callback once all
// of the observer notifications have landed for your write, do the
// writes inside a write fence (set DDPServer._CurrentWriteFence to a new
// _WriteFence, and then set a callback on the write fence.)
//
// Since our execution environment is single-threaded, this is
// well-defined -- a write "has been made" if it's returned, and an
// observer "has been notified" if its callback has returned.


var writeCallback = function (write, refresh, callback) {
  return function (err, result) {
    if (!err) {
      // XXX We don't have to run this on error, right?
      try {
        refresh();
      } catch (refreshErr) {
        if (callback) {
          callback(refreshErr);
          return;
        } else {
          throw refreshErr;
        }
      }
    }

    write.committed();

    if (callback) {
      callback(err, result);
    } else if (err) {
      throw err;
    }
  };
};

var bindEnvironmentForWrite = function (callback) {
  return Meteor.bindEnvironment(callback, "Mongo write");
};

MongoConnection.prototype._insert = function (collection_name, document, callback) {
  var self = this;

  var sendError = function (e) {
    if (callback) return callback(e);
    throw e;
  };

  if (collection_name === "___meteor_failure_test_collection") {
    var e = new Error("Failure test");
    e._expectedByTest = true;
    sendError(e);
    return;
  }

  if (!(LocalCollection._isPlainObject(document) && !EJSON._isCustomType(document))) {
    sendError(new Error("Only plain objects may be inserted into MongoDB"));
    return;
  }

  var write = self._maybeBeginWrite();

  var refresh = function () {
    Meteor.refresh({
      collection: collection_name,
      id: document._id
    });
  };

  callback = bindEnvironmentForWrite(writeCallback(write, refresh, callback));

  try {
    var collection = self.rawCollection(collection_name);
    collection.insert(replaceTypes(document, replaceMeteorAtomWithMongo), {
      safe: true
    }, callback);
  } catch (err) {
    write.committed();
    throw err;
  }
}; // Cause queries that may be affected by the selector to poll in this write
// fence.


MongoConnection.prototype._refresh = function (collectionName, selector) {
  var refreshKey = {
    collection: collectionName
  }; // If we know which documents we're removing, don't poll queries that are
  // specific to other documents. (Note that multiple notifications here should
  // not cause multiple polls, since all our listener is doing is enqueueing a
  // poll.)

  var specificIds = LocalCollection._idsMatchedBySelector(selector);

  if (specificIds) {
    _.each(specificIds, function (id) {
      Meteor.refresh(_.extend({
        id: id
      }, refreshKey));
    });
  } else {
    Meteor.refresh(refreshKey);
  }
};

MongoConnection.prototype._remove = function (collection_name, selector, callback) {
  var self = this;

  if (collection_name === "___meteor_failure_test_collection") {
    var e = new Error("Failure test");
    e._expectedByTest = true;

    if (callback) {
      return callback(e);
    } else {
      throw e;
    }
  }

  var write = self._maybeBeginWrite();

  var refresh = function () {
    self._refresh(collection_name, selector);
  };

  callback = bindEnvironmentForWrite(writeCallback(write, refresh, callback));

  try {
    var collection = self.rawCollection(collection_name);

    var wrappedCallback = function (err, driverResult) {
      callback(err, transformResult(driverResult).numberAffected);
    };

    collection.remove(replaceTypes(selector, replaceMeteorAtomWithMongo), {
      safe: true
    }, wrappedCallback);
  } catch (err) {
    write.committed();
    throw err;
  }
};

MongoConnection.prototype._dropCollection = function (collectionName, cb) {
  var self = this;

  var write = self._maybeBeginWrite();

  var refresh = function () {
    Meteor.refresh({
      collection: collectionName,
      id: null,
      dropCollection: true
    });
  };

  cb = bindEnvironmentForWrite(writeCallback(write, refresh, cb));

  try {
    var collection = self.rawCollection(collectionName);
    collection.drop(cb);
  } catch (e) {
    write.committed();
    throw e;
  }
}; // For testing only.  Slightly better than `c.rawDatabase().dropDatabase()`
// because it lets the test's fence wait for it to be complete.


MongoConnection.prototype._dropDatabase = function (cb) {
  var self = this;

  var write = self._maybeBeginWrite();

  var refresh = function () {
    Meteor.refresh({
      dropDatabase: true
    });
  };

  cb = bindEnvironmentForWrite(writeCallback(write, refresh, cb));

  try {
    self.db.dropDatabase(cb);
  } catch (e) {
    write.committed();
    throw e;
  }
};

MongoConnection.prototype._update = function (collection_name, selector, mod, options, callback) {
  var self = this;

  if (!callback && options instanceof Function) {
    callback = options;
    options = null;
  }

  if (collection_name === "___meteor_failure_test_collection") {
    var e = new Error("Failure test");
    e._expectedByTest = true;

    if (callback) {
      return callback(e);
    } else {
      throw e;
    }
  } // explicit safety check. null and undefined can crash the mongo
  // driver. Although the node driver and minimongo do 'support'
  // non-object modifier in that they don't crash, they are not
  // meaningful operations and do not do anything. Defensively throw an
  // error here.


  if (!mod || typeof mod !== 'object') throw new Error("Invalid modifier. Modifier must be an object.");

  if (!(LocalCollection._isPlainObject(mod) && !EJSON._isCustomType(mod))) {
    throw new Error("Only plain objects may be used as replacement" + " documents in MongoDB");
  }

  if (!options) options = {};

  var write = self._maybeBeginWrite();

  var refresh = function () {
    self._refresh(collection_name, selector);
  };

  callback = writeCallback(write, refresh, callback);

  try {
    var collection = self.rawCollection(collection_name);
    var mongoOpts = {
      safe: true
    }; // explictly enumerate options that minimongo supports

    if (options.upsert) mongoOpts.upsert = true;
    if (options.multi) mongoOpts.multi = true; // Lets you get a more more full result from MongoDB. Use with caution:
    // might not work with C.upsert (as opposed to C.update({upsert:true}) or
    // with simulated upsert.

    if (options.fullResult) mongoOpts.fullResult = true;
    var mongoSelector = replaceTypes(selector, replaceMeteorAtomWithMongo);
    var mongoMod = replaceTypes(mod, replaceMeteorAtomWithMongo);

    var isModify = LocalCollection._isModificationMod(mongoMod);

    if (options._forbidReplace && !isModify) {
      var err = new Error("Invalid modifier. Replacements are forbidden.");

      if (callback) {
        return callback(err);
      } else {
        throw err;
      }
    } // We've already run replaceTypes/replaceMeteorAtomWithMongo on
    // selector and mod.  We assume it doesn't matter, as far as
    // the behavior of modifiers is concerned, whether `_modify`
    // is run on EJSON or on mongo-converted EJSON.
    // Run this code up front so that it fails fast if someone uses
    // a Mongo update operator we don't support.


    let knownId;

    if (options.upsert) {
      try {
        let newDoc = LocalCollection._createUpsertDocument(selector, mod);

        knownId = newDoc._id;
      } catch (err) {
        if (callback) {
          return callback(err);
        } else {
          throw err;
        }
      }
    }

    if (options.upsert && !isModify && !knownId && options.insertedId && !(options.insertedId instanceof Mongo.ObjectID && options.generatedId)) {
      // In case of an upsert with a replacement, where there is no _id defined
      // in either the query or the replacement doc, mongo will generate an id itself.
      // Therefore we need this special strategy if we want to control the id ourselves.
      // We don't need to do this when:
      // - This is not a replacement, so we can add an _id to $setOnInsert
      // - The id is defined by query or mod we can just add it to the replacement doc
      // - The user did not specify any id preference and the id is a Mongo ObjectId,
      //     then we can just let Mongo generate the id
      simulateUpsertWithInsertedId(collection, mongoSelector, mongoMod, options, // This callback does not need to be bindEnvironment'ed because
      // simulateUpsertWithInsertedId() wraps it and then passes it through
      // bindEnvironmentForWrite.
      function (error, result) {
        // If we got here via a upsert() call, then options._returnObject will
        // be set and we should return the whole object. Otherwise, we should
        // just return the number of affected docs to match the mongo API.
        if (result && !options._returnObject) {
          callback(error, result.numberAffected);
        } else {
          callback(error, result);
        }
      });
    } else {
      if (options.upsert && !knownId && options.insertedId && isModify) {
        if (!mongoMod.hasOwnProperty('$setOnInsert')) {
          mongoMod.$setOnInsert = {};
        }

        knownId = options.insertedId;
        Object.assign(mongoMod.$setOnInsert, replaceTypes({
          _id: options.insertedId
        }, replaceMeteorAtomWithMongo));
      }

      collection.update(mongoSelector, mongoMod, mongoOpts, bindEnvironmentForWrite(function (err, result) {
        if (!err) {
          var meteorResult = transformResult(result);

          if (meteorResult && options._returnObject) {
            // If this was an upsert() call, and we ended up
            // inserting a new doc and we know its id, then
            // return that id as well.
            if (options.upsert && meteorResult.insertedId) {
              if (knownId) {
                meteorResult.insertedId = knownId;
              } else if (meteorResult.insertedId instanceof MongoDB.ObjectID) {
                meteorResult.insertedId = new Mongo.ObjectID(meteorResult.insertedId.toHexString());
              }
            }

            callback(err, meteorResult);
          } else {
            callback(err, meteorResult.numberAffected);
          }
        } else {
          callback(err);
        }
      }));
    }
  } catch (e) {
    write.committed();
    throw e;
  }
};

var transformResult = function (driverResult) {
  var meteorResult = {
    numberAffected: 0
  };

  if (driverResult) {
    var mongoResult = driverResult.result; // On updates with upsert:true, the inserted values come as a list of
    // upserted values -- even with options.multi, when the upsert does insert,
    // it only inserts one element.

    if (mongoResult.upserted) {
      meteorResult.numberAffected += mongoResult.upserted.length;

      if (mongoResult.upserted.length == 1) {
        meteorResult.insertedId = mongoResult.upserted[0]._id;
      }
    } else {
      meteorResult.numberAffected = mongoResult.n;
    }
  }

  return meteorResult;
};

var NUM_OPTIMISTIC_TRIES = 3; // exposed for testing

MongoConnection._isCannotChangeIdError = function (err) {
  // Mongo 3.2.* returns error as next Object:
  // {name: String, code: Number, errmsg: String}
  // Older Mongo returns:
  // {name: String, code: Number, err: String}
  var error = err.errmsg || err.err; // We don't use the error code here
  // because the error code we observed it producing (16837) appears to be
  // a far more generic error code based on examining the source.

  if (error.indexOf('The _id field cannot be changed') === 0 || error.indexOf("the (immutable) field '_id' was found to have been altered to _id") !== -1) {
    return true;
  }

  return false;
};

var simulateUpsertWithInsertedId = function (collection, selector, mod, options, callback) {
  // STRATEGY: First try doing an upsert with a generated ID.
  // If this throws an error about changing the ID on an existing document
  // then without affecting the database, we know we should probably try
  // an update without the generated ID. If it affected 0 documents,
  // then without affecting the database, we the document that first
  // gave the error is probably removed and we need to try an insert again
  // We go back to step one and repeat.
  // Like all "optimistic write" schemes, we rely on the fact that it's
  // unlikely our writes will continue to be interfered with under normal
  // circumstances (though sufficiently heavy contention with writers
  // disagreeing on the existence of an object will cause writes to fail
  // in theory).
  var insertedId = options.insertedId; // must exist

  var mongoOptsForUpdate = {
    safe: true,
    multi: options.multi
  };
  var mongoOptsForInsert = {
    safe: true,
    upsert: true
  };
  var replacementWithId = Object.assign(replaceTypes({
    _id: insertedId
  }, replaceMeteorAtomWithMongo), mod);
  var tries = NUM_OPTIMISTIC_TRIES;

  var doUpdate = function () {
    tries--;

    if (!tries) {
      callback(new Error("Upsert failed after " + NUM_OPTIMISTIC_TRIES + " tries."));
    } else {
      collection.update(selector, mod, mongoOptsForUpdate, bindEnvironmentForWrite(function (err, result) {
        if (err) {
          callback(err);
        } else if (result && result.result.n != 0) {
          callback(null, {
            numberAffected: result.result.n
          });
        } else {
          doConditionalInsert();
        }
      }));
    }
  };

  var doConditionalInsert = function () {
    collection.update(selector, replacementWithId, mongoOptsForInsert, bindEnvironmentForWrite(function (err, result) {
      if (err) {
        // figure out if this is a
        // "cannot change _id of document" error, and
        // if so, try doUpdate() again, up to 3 times.
        if (MongoConnection._isCannotChangeIdError(err)) {
          doUpdate();
        } else {
          callback(err);
        }
      } else {
        callback(null, {
          numberAffected: result.result.upserted.length,
          insertedId: insertedId
        });
      }
    }));
  };

  doUpdate();
};

_.each(["insert", "update", "remove", "dropCollection", "dropDatabase"], function (method) {
  MongoConnection.prototype[method] = function ()
  /* arguments */
  {
    var self = this;
    return Meteor.wrapAsync(self["_" + method]).apply(self, arguments);
  };
}); // XXX MongoConnection.upsert() does not return the id of the inserted document
// unless you set it explicitly in the selector or modifier (as a replacement
// doc).


MongoConnection.prototype.upsert = function (collectionName, selector, mod, options, callback) {
  var self = this;

  if (typeof options === "function" && !callback) {
    callback = options;
    options = {};
  }

  return self.update(collectionName, selector, mod, _.extend({}, options, {
    upsert: true,
    _returnObject: true
  }), callback);
};

MongoConnection.prototype.find = function (collectionName, selector, options) {
  var self = this;
  if (arguments.length === 1) selector = {};
  return new Cursor(self, new CursorDescription(collectionName, selector, options));
};

MongoConnection.prototype.findOne = function (collection_name, selector, options) {
  var self = this;
  if (arguments.length === 1) selector = {};
  options = options || {};
  options.limit = 1;
  return self.find(collection_name, selector, options).fetch()[0];
}; // We'll actually design an index API later. For now, we just pass through to
// Mongo's, but make it synchronous.


MongoConnection.prototype._ensureIndex = function (collectionName, index, options) {
  var self = this; // We expect this function to be called at startup, not from within a method,
  // so we don't interact with the write fence.

  var collection = self.rawCollection(collectionName);
  var future = new Future();
  var indexName = collection.ensureIndex(index, options, future.resolver());
  future.wait();
};

MongoConnection.prototype._dropIndex = function (collectionName, index) {
  var self = this; // This function is only used by test code, not within a method, so we don't
  // interact with the write fence.

  var collection = self.rawCollection(collectionName);
  var future = new Future();
  var indexName = collection.dropIndex(index, future.resolver());
  future.wait();
}; // CURSORS
// There are several classes which relate to cursors:
//
// CursorDescription represents the arguments used to construct a cursor:
// collectionName, selector, and (find) options.  Because it is used as a key
// for cursor de-dup, everything in it should either be JSON-stringifiable or
// not affect observeChanges output (eg, options.transform functions are not
// stringifiable but do not affect observeChanges).
//
// SynchronousCursor is a wrapper around a MongoDB cursor
// which includes fully-synchronous versions of forEach, etc.
//
// Cursor is the cursor object returned from find(), which implements the
// documented Mongo.Collection cursor API.  It wraps a CursorDescription and a
// SynchronousCursor (lazily: it doesn't contact Mongo until you call a method
// like fetch or forEach on it).
//
// ObserveHandle is the "observe handle" returned from observeChanges. It has a
// reference to an ObserveMultiplexer.
//
// ObserveMultiplexer allows multiple identical ObserveHandles to be driven by a
// single observe driver.
//
// There are two "observe drivers" which drive ObserveMultiplexers:
//   - PollingObserveDriver caches the results of a query and reruns it when
//     necessary.
//   - OplogObserveDriver follows the Mongo operation log to directly observe
//     database changes.
// Both implementations follow the same simple interface: when you create them,
// they start sending observeChanges callbacks (and a ready() invocation) to
// their ObserveMultiplexer, and you stop them by calling their stop() method.


CursorDescription = function (collectionName, selector, options) {
  var self = this;
  self.collectionName = collectionName;
  self.selector = Mongo.Collection._rewriteSelector(selector);
  self.options = options || {};
};

Cursor = function (mongo, cursorDescription) {
  var self = this;
  self._mongo = mongo;
  self._cursorDescription = cursorDescription;
  self._synchronousCursor = null;
};

_.each(['forEach', 'map', 'fetch', 'count', Symbol.iterator], function (method) {
  Cursor.prototype[method] = function () {
    var self = this; // You can only observe a tailable cursor.

    if (self._cursorDescription.options.tailable) throw new Error("Cannot call " + method + " on a tailable cursor");

    if (!self._synchronousCursor) {
      self._synchronousCursor = self._mongo._createSynchronousCursor(self._cursorDescription, {
        // Make sure that the "self" argument to forEach/map callbacks is the
        // Cursor, not the SynchronousCursor.
        selfForIteration: self,
        useTransform: true
      });
    }

    return self._synchronousCursor[method].apply(self._synchronousCursor, arguments);
  };
}); // Since we don't actually have a "nextObject" interface, there's really no
// reason to have a "rewind" interface.  All it did was make multiple calls
// to fetch/map/forEach return nothing the second time.
// XXX COMPAT WITH 0.8.1


Cursor.prototype.rewind = function () {};

Cursor.prototype.getTransform = function () {
  return this._cursorDescription.options.transform;
}; // When you call Meteor.publish() with a function that returns a Cursor, we need
// to transmute it into the equivalent subscription.  This is the function that
// does that.


Cursor.prototype._publishCursor = function (sub) {
  var self = this;
  var collection = self._cursorDescription.collectionName;
  return Mongo.Collection._publishCursor(self, sub, collection);
}; // Used to guarantee that publish functions return at most one cursor per
// collection. Private, because we might later have cursors that include
// documents from multiple collections somehow.


Cursor.prototype._getCollectionName = function () {
  var self = this;
  return self._cursorDescription.collectionName;
};

Cursor.prototype.observe = function (callbacks) {
  var self = this;
  return LocalCollection._observeFromObserveChanges(self, callbacks);
};

Cursor.prototype.observeChanges = function (callbacks) {
  var self = this;
  var methods = ['addedAt', 'added', 'changedAt', 'changed', 'removedAt', 'removed', 'movedTo'];

  var ordered = LocalCollection._observeChangesCallbacksAreOrdered(callbacks); // XXX: Can we find out if callbacks are from observe?


  var exceptionName = ' observe/observeChanges callback';
  methods.forEach(function (method) {
    if (callbacks[method] && typeof callbacks[method] == "function") {
      callbacks[method] = Meteor.bindEnvironment(callbacks[method], method + exceptionName);
    }
  });
  return self._mongo._observeChanges(self._cursorDescription, ordered, callbacks);
};

MongoConnection.prototype._createSynchronousCursor = function (cursorDescription, options) {
  var self = this;
  options = _.pick(options || {}, 'selfForIteration', 'useTransform');
  var collection = self.rawCollection(cursorDescription.collectionName);
  var cursorOptions = cursorDescription.options;
  var mongoOptions = {
    sort: cursorOptions.sort,
    limit: cursorOptions.limit,
    skip: cursorOptions.skip,
    projection: cursorOptions.fields
  }; // Do we want a tailable cursor (which only works on capped collections)?

  if (cursorOptions.tailable) {
    // We want a tailable cursor...
    mongoOptions.tailable = true; // ... and for the server to wait a bit if any getMore has no data (rather
    // than making us put the relevant sleeps in the client)...

    mongoOptions.awaitdata = true; // ... and to keep querying the server indefinitely rather than just 5 times
    // if there's no more data.

    mongoOptions.numberOfRetries = -1; // And if this is on the oplog collection and the cursor specifies a 'ts',
    // then set the undocumented oplog replay flag, which does a special scan to
    // find the first document (instead of creating an index on ts). This is a
    // very hard-coded Mongo flag which only works on the oplog collection and
    // only works with the ts field.

    if (cursorDescription.collectionName === OPLOG_COLLECTION && cursorDescription.selector.ts) {
      mongoOptions.oplogReplay = true;
    }
  }

  var dbCursor = collection.find(replaceTypes(cursorDescription.selector, replaceMeteorAtomWithMongo), mongoOptions);

  if (typeof cursorOptions.maxTimeMs !== 'undefined') {
    dbCursor = dbCursor.maxTimeMS(cursorOptions.maxTimeMs);
  }

  if (typeof cursorOptions.hint !== 'undefined') {
    dbCursor = dbCursor.hint(cursorOptions.hint);
  }

  return new SynchronousCursor(dbCursor, cursorDescription, options);
};

var SynchronousCursor = function (dbCursor, cursorDescription, options) {
  var self = this;
  options = _.pick(options || {}, 'selfForIteration', 'useTransform');
  self._dbCursor = dbCursor;
  self._cursorDescription = cursorDescription; // The "self" argument passed to forEach/map callbacks. If we're wrapped
  // inside a user-visible Cursor, we want to provide the outer cursor!

  self._selfForIteration = options.selfForIteration || self;

  if (options.useTransform && cursorDescription.options.transform) {
    self._transform = LocalCollection.wrapTransform(cursorDescription.options.transform);
  } else {
    self._transform = null;
  }

  self._synchronousCount = Future.wrap(dbCursor.count.bind(dbCursor));
  self._visitedIds = new LocalCollection._IdMap();
};

_.extend(SynchronousCursor.prototype, {
  // Returns a Promise for the next object from the underlying cursor (before
  // the Mongo->Meteor type replacement).
  _rawNextObjectPromise: function () {
    const self = this;
    return new Promise((resolve, reject) => {
      self._dbCursor.next((err, doc) => {
        if (err) {
          reject(err);
        } else {
          resolve(doc);
        }
      });
    });
  },
  // Returns a Promise for the next object from the cursor, skipping those whose
  // IDs we've already seen and replacing Mongo atoms with Meteor atoms.
  _nextObjectPromise: function () {
    return Promise.asyncApply(() => {
      var self = this;

      while (true) {
        var doc = Promise.await(self._rawNextObjectPromise());
        if (!doc) return null;
        doc = replaceTypes(doc, replaceMongoAtomWithMeteor);

        if (!self._cursorDescription.options.tailable && _.has(doc, '_id')) {
          // Did Mongo give us duplicate documents in the same cursor? If so,
          // ignore this one. (Do this before the transform, since transform might
          // return some unrelated value.) We don't do this for tailable cursors,
          // because we want to maintain O(1) memory usage. And if there isn't _id
          // for some reason (maybe it's the oplog), then we don't do this either.
          // (Be careful to do this for falsey but existing _id, though.)
          if (self._visitedIds.has(doc._id)) continue;

          self._visitedIds.set(doc._id, true);
        }

        if (self._transform) doc = self._transform(doc);
        return doc;
      }
    });
  },
  // Returns a promise which is resolved with the next object (like with
  // _nextObjectPromise) or rejected if the cursor doesn't return within
  // timeoutMS ms.
  _nextObjectPromiseWithTimeout: function (timeoutMS) {
    const self = this;

    if (!timeoutMS) {
      return self._nextObjectPromise();
    }

    const nextObjectPromise = self._nextObjectPromise();

    const timeoutErr = new Error('Client-side timeout waiting for next object');
    const timeoutPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(timeoutErr);
      }, timeoutMS);
    });
    return Promise.race([nextObjectPromise, timeoutPromise]).catch(err => {
      if (err === timeoutErr) {
        self.close();
      }

      throw err;
    });
  },
  _nextObject: function () {
    var self = this;
    return self._nextObjectPromise().await();
  },
  forEach: function (callback, thisArg) {
    var self = this; // Get back to the beginning.

    self._rewind(); // We implement the loop ourself instead of using self._dbCursor.each,
    // because "each" will call its callback outside of a fiber which makes it
    // much more complex to make this function synchronous.


    var index = 0;

    while (true) {
      var doc = self._nextObject();

      if (!doc) return;
      callback.call(thisArg, doc, index++, self._selfForIteration);
    }
  },
  // XXX Allow overlapping callback executions if callback yields.
  map: function (callback, thisArg) {
    var self = this;
    var res = [];
    self.forEach(function (doc, index) {
      res.push(callback.call(thisArg, doc, index, self._selfForIteration));
    });
    return res;
  },
  _rewind: function () {
    var self = this; // known to be synchronous

    self._dbCursor.rewind();

    self._visitedIds = new LocalCollection._IdMap();
  },
  // Mostly usable for tailable cursors.
  close: function () {
    var self = this;

    self._dbCursor.close();
  },
  fetch: function () {
    var self = this;
    return self.map(_.identity);
  },
  count: function (applySkipLimit = false) {
    var self = this;
    return self._synchronousCount(applySkipLimit).wait();
  },
  // This method is NOT wrapped in Cursor.
  getRawObjects: function (ordered) {
    var self = this;

    if (ordered) {
      return self.fetch();
    } else {
      var results = new LocalCollection._IdMap();
      self.forEach(function (doc) {
        results.set(doc._id, doc);
      });
      return results;
    }
  }
});

SynchronousCursor.prototype[Symbol.iterator] = function () {
  var self = this; // Get back to the beginning.

  self._rewind();

  return {
    next() {
      const doc = self._nextObject();

      return doc ? {
        value: doc
      } : {
        done: true
      };
    }

  };
}; // Tails the cursor described by cursorDescription, most likely on the
// oplog. Calls docCallback with each document found. Ignores errors and just
// restarts the tail on error.
//
// If timeoutMS is set, then if we don't get a new document every timeoutMS,
// kill and restart the cursor. This is primarily a workaround for #8598.


MongoConnection.prototype.tail = function (cursorDescription, docCallback, timeoutMS) {
  var self = this;
  if (!cursorDescription.options.tailable) throw new Error("Can only tail a tailable cursor");

  var cursor = self._createSynchronousCursor(cursorDescription);

  var stopped = false;
  var lastTS;

  var loop = function () {
    var doc = null;

    while (true) {
      if (stopped) return;

      try {
        doc = cursor._nextObjectPromiseWithTimeout(timeoutMS).await();
      } catch (err) {
        // There's no good way to figure out if this was actually an error from
        // Mongo, or just client-side (including our own timeout error). Ah
        // well. But either way, we need to retry the cursor (unless the failure
        // was because the observe got stopped).
        doc = null;
      } // Since we awaited a promise above, we need to check again to see if
      // we've been stopped before calling the callback.


      if (stopped) return;

      if (doc) {
        // If a tailable cursor contains a "ts" field, use it to recreate the
        // cursor on error. ("ts" is a standard that Mongo uses internally for
        // the oplog, and there's a special flag that lets you do binary search
        // on it instead of needing to use an index.)
        lastTS = doc.ts;
        docCallback(doc);
      } else {
        var newSelector = _.clone(cursorDescription.selector);

        if (lastTS) {
          newSelector.ts = {
            $gt: lastTS
          };
        }

        cursor = self._createSynchronousCursor(new CursorDescription(cursorDescription.collectionName, newSelector, cursorDescription.options)); // Mongo failover takes many seconds.  Retry in a bit.  (Without this
        // setTimeout, we peg the CPU at 100% and never notice the actual
        // failover.

        Meteor.setTimeout(loop, 100);
        break;
      }
    }
  };

  Meteor.defer(loop);
  return {
    stop: function () {
      stopped = true;
      cursor.close();
    }
  };
};

MongoConnection.prototype._observeChanges = function (cursorDescription, ordered, callbacks) {
  var self = this;

  if (cursorDescription.options.tailable) {
    return self._observeChangesTailable(cursorDescription, ordered, callbacks);
  } // You may not filter out _id when observing changes, because the id is a core
  // part of the observeChanges API.


  if (cursorDescription.options.fields && (cursorDescription.options.fields._id === 0 || cursorDescription.options.fields._id === false)) {
    throw Error("You may not observe a cursor with {fields: {_id: 0}}");
  }

  var observeKey = EJSON.stringify(_.extend({
    ordered: ordered
  }, cursorDescription));
  var multiplexer, observeDriver;
  var firstHandle = false; // Find a matching ObserveMultiplexer, or create a new one. This next block is
  // guaranteed to not yield (and it doesn't call anything that can observe a
  // new query), so no other calls to this function can interleave with it.

  Meteor._noYieldsAllowed(function () {
    if (_.has(self._observeMultiplexers, observeKey)) {
      multiplexer = self._observeMultiplexers[observeKey];
    } else {
      firstHandle = true; // Create a new ObserveMultiplexer.

      multiplexer = new ObserveMultiplexer({
        ordered: ordered,
        onStop: function () {
          delete self._observeMultiplexers[observeKey];
          observeDriver.stop();
        }
      });
      self._observeMultiplexers[observeKey] = multiplexer;
    }
  });

  var observeHandle = new ObserveHandle(multiplexer, callbacks);

  if (firstHandle) {
    var matcher, sorter;

    var canUseOplog = _.all([function () {
      // At a bare minimum, using the oplog requires us to have an oplog, to
      // want unordered callbacks, and to not want a callback on the polls
      // that won't happen.
      return self._oplogHandle && !ordered && !callbacks._testOnlyPollCallback;
    }, function () {
      // We need to be able to compile the selector. Fall back to polling for
      // some newfangled $selector that minimongo doesn't support yet.
      try {
        matcher = new Minimongo.Matcher(cursorDescription.selector);
        return true;
      } catch (e) {
        // XXX make all compilation errors MinimongoError or something
        //     so that this doesn't ignore unrelated exceptions
        return false;
      }
    }, function () {
      // ... and the selector itself needs to support oplog.
      return OplogObserveDriver.cursorSupported(cursorDescription, matcher);
    }, function () {
      // And we need to be able to compile the sort, if any.  eg, can't be
      // {$natural: 1}.
      if (!cursorDescription.options.sort) return true;

      try {
        sorter = new Minimongo.Sorter(cursorDescription.options.sort);
        return true;
      } catch (e) {
        // XXX make all compilation errors MinimongoError or something
        //     so that this doesn't ignore unrelated exceptions
        return false;
      }
    }], function (f) {
      return f();
    }); // invoke each function


    var driverClass = canUseOplog ? OplogObserveDriver : PollingObserveDriver;
    observeDriver = new driverClass({
      cursorDescription: cursorDescription,
      mongoHandle: self,
      multiplexer: multiplexer,
      ordered: ordered,
      matcher: matcher,
      // ignored by polling
      sorter: sorter,
      // ignored by polling
      _testOnlyPollCallback: callbacks._testOnlyPollCallback
    }); // This field is only set for use in tests.

    multiplexer._observeDriver = observeDriver;
  } // Blocks until the initial adds have been sent.


  multiplexer.addHandleAndSendInitialAdds(observeHandle);
  return observeHandle;
}; // Listen for the invalidation messages that will trigger us to poll the
// database for changes. If this selector specifies specific IDs, specify them
// here, so that updates to different specific IDs don't cause us to poll.
// listenCallback is the same kind of (notification, complete) callback passed
// to InvalidationCrossbar.listen.


listenAll = function (cursorDescription, listenCallback) {
  var listeners = [];
  forEachTrigger(cursorDescription, function (trigger) {
    listeners.push(DDPServer._InvalidationCrossbar.listen(trigger, listenCallback));
  });
  return {
    stop: function () {
      _.each(listeners, function (listener) {
        listener.stop();
      });
    }
  };
};

forEachTrigger = function (cursorDescription, triggerCallback) {
  var key = {
    collection: cursorDescription.collectionName
  };

  var specificIds = LocalCollection._idsMatchedBySelector(cursorDescription.selector);

  if (specificIds) {
    _.each(specificIds, function (id) {
      triggerCallback(_.extend({
        id: id
      }, key));
    });

    triggerCallback(_.extend({
      dropCollection: true,
      id: null
    }, key));
  } else {
    triggerCallback(key);
  } // Everyone cares about the database being dropped.


  triggerCallback({
    dropDatabase: true
  });
}; // observeChanges for tailable cursors on capped collections.
//
// Some differences from normal cursors:
//   - Will never produce anything other than 'added' or 'addedBefore'. If you
//     do update a document that has already been produced, this will not notice
//     it.
//   - If you disconnect and reconnect from Mongo, it will essentially restart
//     the query, which will lead to duplicate results. This is pretty bad,
//     but if you include a field called 'ts' which is inserted as
//     new MongoInternals.MongoTimestamp(0, 0) (which is initialized to the
//     current Mongo-style timestamp), we'll be able to find the place to
//     restart properly. (This field is specifically understood by Mongo with an
//     optimization which allows it to find the right place to start without
//     an index on ts. It's how the oplog works.)
//   - No callbacks are triggered synchronously with the call (there's no
//     differentiation between "initial data" and "later changes"; everything
//     that matches the query gets sent asynchronously).
//   - De-duplication is not implemented.
//   - Does not yet interact with the write fence. Probably, this should work by
//     ignoring removes (which don't work on capped collections) and updates
//     (which don't affect tailable cursors), and just keeping track of the ID
//     of the inserted object, and closing the write fence once you get to that
//     ID (or timestamp?).  This doesn't work well if the document doesn't match
//     the query, though.  On the other hand, the write fence can close
//     immediately if it does not match the query. So if we trust minimongo
//     enough to accurately evaluate the query against the write fence, we
//     should be able to do this...  Of course, minimongo doesn't even support
//     Mongo Timestamps yet.


MongoConnection.prototype._observeChangesTailable = function (cursorDescription, ordered, callbacks) {
  var self = this; // Tailable cursors only ever call added/addedBefore callbacks, so it's an
  // error if you didn't provide them.

  if (ordered && !callbacks.addedBefore || !ordered && !callbacks.added) {
    throw new Error("Can't observe an " + (ordered ? "ordered" : "unordered") + " tailable cursor without a " + (ordered ? "addedBefore" : "added") + " callback");
  }

  return self.tail(cursorDescription, function (doc) {
    var id = doc._id;
    delete doc._id; // The ts is an implementation detail. Hide it.

    delete doc.ts;

    if (ordered) {
      callbacks.addedBefore(id, doc, null);
    } else {
      callbacks.added(id, doc);
    }
  });
}; // XXX We probably need to find a better way to expose this. Right now
// it's only used by tests, but in fact you need it in normal
// operation to interact with capped collections.


MongoInternals.MongoTimestamp = MongoDB.Timestamp;
MongoInternals.Connection = MongoConnection;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oplog_tailing.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/oplog_tailing.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Future = Npm.require('fibers/future');

OPLOG_COLLECTION = 'oplog.rs';
var TOO_FAR_BEHIND = process.env.METEOR_OPLOG_TOO_FAR_BEHIND || 2000;
var TAIL_TIMEOUT = +process.env.METEOR_OPLOG_TAIL_TIMEOUT || 30000;

var showTS = function (ts) {
  return "Timestamp(" + ts.getHighBits() + ", " + ts.getLowBits() + ")";
};

idForOp = function (op) {
  if (op.op === 'd') return op.o._id;else if (op.op === 'i') return op.o._id;else if (op.op === 'u') return op.o2._id;else if (op.op === 'c') throw Error("Operator 'c' doesn't supply an object with id: " + EJSON.stringify(op));else throw Error("Unknown op: " + EJSON.stringify(op));
};

OplogHandle = function (oplogUrl, dbName) {
  var self = this;
  self._oplogUrl = oplogUrl;
  self._dbName = dbName;
  self._oplogLastEntryConnection = null;
  self._oplogTailConnection = null;
  self._stopped = false;
  self._tailHandle = null;
  self._readyFuture = new Future();
  self._crossbar = new DDPServer._Crossbar({
    factPackage: "mongo-livedata",
    factName: "oplog-watchers"
  });
  self._baseOplogSelector = {
    ns: new RegExp("^(?:" + [Meteor._escapeRegExp(self._dbName + "."), Meteor._escapeRegExp("admin.$cmd")].join("|") + ")"),
    $or: [{
      op: {
        $in: ['i', 'u', 'd']
      }
    }, // drop collection
    {
      op: 'c',
      'o.drop': {
        $exists: true
      }
    }, {
      op: 'c',
      'o.dropDatabase': 1
    }, {
      op: 'c',
      'o.applyOps': {
        $exists: true
      }
    }]
  }; // Data structures to support waitUntilCaughtUp(). Each oplog entry has a
  // MongoTimestamp object on it (which is not the same as a Date --- it's a
  // combination of time and an incrementing counter; see
  // http://docs.mongodb.org/manual/reference/bson-types/#timestamps).
  //
  // _catchingUpFutures is an array of {ts: MongoTimestamp, future: Future}
  // objects, sorted by ascending timestamp. _lastProcessedTS is the
  // MongoTimestamp of the last oplog entry we've processed.
  //
  // Each time we call waitUntilCaughtUp, we take a peek at the final oplog
  // entry in the db.  If we've already processed it (ie, it is not greater than
  // _lastProcessedTS), waitUntilCaughtUp immediately returns. Otherwise,
  // waitUntilCaughtUp makes a new Future and inserts it along with the final
  // timestamp entry that it read, into _catchingUpFutures. waitUntilCaughtUp
  // then waits on that future, which is resolved once _lastProcessedTS is
  // incremented to be past its timestamp by the worker fiber.
  //
  // XXX use a priority queue or something else that's faster than an array

  self._catchingUpFutures = [];
  self._lastProcessedTS = null;
  self._onSkippedEntriesHook = new Hook({
    debugPrintExceptions: "onSkippedEntries callback"
  });
  self._entryQueue = new Meteor._DoubleEndedQueue();
  self._workerActive = false;

  self._startTailing();
};

_.extend(OplogHandle.prototype, {
  stop: function () {
    var self = this;
    if (self._stopped) return;
    self._stopped = true;
    if (self._tailHandle) self._tailHandle.stop(); // XXX should close connections too
  },
  onOplogEntry: function (trigger, callback) {
    var self = this;
    if (self._stopped) throw new Error("Called onOplogEntry on stopped handle!"); // Calling onOplogEntry requires us to wait for the tailing to be ready.

    self._readyFuture.wait();

    var originalCallback = callback;
    callback = Meteor.bindEnvironment(function (notification) {
      originalCallback(notification);
    }, function (err) {
      Meteor._debug("Error in oplog callback", err);
    });

    var listenHandle = self._crossbar.listen(trigger, callback);

    return {
      stop: function () {
        listenHandle.stop();
      }
    };
  },
  // Register a callback to be invoked any time we skip oplog entries (eg,
  // because we are too far behind).
  onSkippedEntries: function (callback) {
    var self = this;
    if (self._stopped) throw new Error("Called onSkippedEntries on stopped handle!");
    return self._onSkippedEntriesHook.register(callback);
  },
  // Calls `callback` once the oplog has been processed up to a point that is
  // roughly "now": specifically, once we've processed all ops that are
  // currently visible.
  // XXX become convinced that this is actually safe even if oplogConnection
  // is some kind of pool
  waitUntilCaughtUp: function () {
    var self = this;
    if (self._stopped) throw new Error("Called waitUntilCaughtUp on stopped handle!"); // Calling waitUntilCaughtUp requries us to wait for the oplog connection to
    // be ready.

    self._readyFuture.wait();

    var lastEntry;

    while (!self._stopped) {
      // We need to make the selector at least as restrictive as the actual
      // tailing selector (ie, we need to specify the DB name) or else we might
      // find a TS that won't show up in the actual tail stream.
      try {
        lastEntry = self._oplogLastEntryConnection.findOne(OPLOG_COLLECTION, self._baseOplogSelector, {
          fields: {
            ts: 1
          },
          sort: {
            $natural: -1
          }
        });
        break;
      } catch (e) {
        // During failover (eg) if we get an exception we should log and retry
        // instead of crashing.
        Meteor._debug("Got exception while reading last entry", e);

        Meteor._sleepForMs(100);
      }
    }

    if (self._stopped) return;

    if (!lastEntry) {
      // Really, nothing in the oplog? Well, we've processed everything.
      return;
    }

    var ts = lastEntry.ts;
    if (!ts) throw Error("oplog entry without ts: " + EJSON.stringify(lastEntry));

    if (self._lastProcessedTS && ts.lessThanOrEqual(self._lastProcessedTS)) {
      // We've already caught up to here.
      return;
    } // Insert the future into our list. Almost always, this will be at the end,
    // but it's conceivable that if we fail over from one primary to another,
    // the oplog entries we see will go backwards.


    var insertAfter = self._catchingUpFutures.length;

    while (insertAfter - 1 > 0 && self._catchingUpFutures[insertAfter - 1].ts.greaterThan(ts)) {
      insertAfter--;
    }

    var f = new Future();

    self._catchingUpFutures.splice(insertAfter, 0, {
      ts: ts,
      future: f
    });

    f.wait();
  },
  _startTailing: function () {
    var self = this; // First, make sure that we're talking to the local database.

    var mongodbUri = Npm.require('mongodb-uri');

    if (mongodbUri.parse(self._oplogUrl).database !== 'local') {
      throw Error("$MONGO_OPLOG_URL must be set to the 'local' database of " + "a Mongo replica set");
    } // We make two separate connections to Mongo. The Node Mongo driver
    // implements a naive round-robin connection pool: each "connection" is a
    // pool of several (5 by default) TCP connections, and each request is
    // rotated through the pools. Tailable cursor queries block on the server
    // until there is some data to return (or until a few seconds have
    // passed). So if the connection pool used for tailing cursors is the same
    // pool used for other queries, the other queries will be delayed by seconds
    // 1/5 of the time.
    //
    // The tail connection will only ever be running a single tail command, so
    // it only needs to make one underlying TCP connection.


    self._oplogTailConnection = new MongoConnection(self._oplogUrl, {
      poolSize: 1
    }); // XXX better docs, but: it's to get monotonic results
    // XXX is it safe to say "if there's an in flight query, just use its
    //     results"? I don't think so but should consider that

    self._oplogLastEntryConnection = new MongoConnection(self._oplogUrl, {
      poolSize: 1
    }); // Now, make sure that there actually is a repl set here. If not, oplog
    // tailing won't ever find anything!
    // More on the isMasterDoc
    // https://docs.mongodb.com/manual/reference/command/isMaster/

    var f = new Future();

    self._oplogLastEntryConnection.db.admin().command({
      ismaster: 1
    }, f.resolver());

    var isMasterDoc = f.wait();

    if (!(isMasterDoc && isMasterDoc.setName)) {
      throw Error("$MONGO_OPLOG_URL must be set to the 'local' database of " + "a Mongo replica set");
    } // Find the last oplog entry.


    var lastOplogEntry = self._oplogLastEntryConnection.findOne(OPLOG_COLLECTION, {}, {
      sort: {
        $natural: -1
      },
      fields: {
        ts: 1
      }
    });

    var oplogSelector = _.clone(self._baseOplogSelector);

    if (lastOplogEntry) {
      // Start after the last entry that currently exists.
      oplogSelector.ts = {
        $gt: lastOplogEntry.ts
      }; // If there are any calls to callWhenProcessedLatest before any other
      // oplog entries show up, allow callWhenProcessedLatest to call its
      // callback immediately.

      self._lastProcessedTS = lastOplogEntry.ts;
    }

    var cursorDescription = new CursorDescription(OPLOG_COLLECTION, oplogSelector, {
      tailable: true
    }); // Start tailing the oplog.
    //
    // We restart the low-level oplog query every 30 seconds if we didn't get a
    // doc. This is a workaround for #8598: the Node Mongo driver has at least
    // one bug that can lead to query callbacks never getting called (even with
    // an error) when leadership failover occur.

    self._tailHandle = self._oplogTailConnection.tail(cursorDescription, function (doc) {
      self._entryQueue.push(doc);

      self._maybeStartWorker();
    }, TAIL_TIMEOUT);

    self._readyFuture.return();
  },
  _maybeStartWorker: function () {
    var self = this;
    if (self._workerActive) return;
    self._workerActive = true;
    Meteor.defer(function () {
      // May be called recursively in case of transactions.
      function handleDoc(doc) {
        if (doc.ns === "admin.$cmd") {
          if (doc.o.applyOps) {
            // This was a successful transaction, so we need to apply the
            // operations that were involved.
            doc.o.applyOps.forEach(op => {
              // See https://github.com/meteor/meteor/issues/10420.
              op.ts = op.ts || doc.ts;
              handleDoc(op);
            });
            return;
          }

          throw new Error("Unknown command " + EJSON.stringify(doc));
        }

        const trigger = {
          dropCollection: false,
          dropDatabase: false,
          op: doc
        };

        if (typeof doc.ns === "string" && doc.ns.startsWith(self._dbName + ".")) {
          trigger.collection = doc.ns.slice(self._dbName.length + 1);
        } else {
          throw new Error("Unexpected ns");
        } // Is it a special command and the collection name is hidden
        // somewhere in operator?


        if (trigger.collection === "$cmd") {
          if (doc.o.dropDatabase) {
            delete trigger.collection;
            trigger.dropDatabase = true;
          } else if (_.has(doc.o, "drop")) {
            trigger.collection = doc.o.drop;
            trigger.dropCollection = true;
            trigger.id = null;
          } else {
            throw Error("Unknown command " + EJSON.stringify(doc));
          }
        } else {
          // All other ops have an id.
          trigger.id = idForOp(doc);
        }

        self._crossbar.fire(trigger);
      }

      try {
        while (!self._stopped && !self._entryQueue.isEmpty()) {
          // Are we too far behind? Just tell our observers that they need to
          // repoll, and drop our queue.
          if (self._entryQueue.length > TOO_FAR_BEHIND) {
            var lastEntry = self._entryQueue.pop();

            self._entryQueue.clear();

            self._onSkippedEntriesHook.each(function (callback) {
              callback();
              return true;
            }); // Free any waitUntilCaughtUp() calls that were waiting for us to
            // pass something that we just skipped.


            self._setLastProcessedTS(lastEntry.ts);

            continue;
          }

          const doc = self._entryQueue.shift(); // Fire trigger(s) for this doc.


          handleDoc(doc); // Now that we've processed this operation, process pending
          // sequencers.

          if (doc.ts) {
            self._setLastProcessedTS(doc.ts);
          } else {
            throw Error("oplog entry without ts: " + EJSON.stringify(doc));
          }
        }
      } finally {
        self._workerActive = false;
      }
    });
  },
  _setLastProcessedTS: function (ts) {
    var self = this;
    self._lastProcessedTS = ts;

    while (!_.isEmpty(self._catchingUpFutures) && self._catchingUpFutures[0].ts.lessThanOrEqual(self._lastProcessedTS)) {
      var sequencer = self._catchingUpFutures.shift();

      sequencer.future.return();
    }
  },
  //Methods used on tests to dinamically change TOO_FAR_BEHIND
  _defineTooFarBehind: function (value) {
    TOO_FAR_BEHIND = value;
  },
  _resetTooFarBehind: function () {
    TOO_FAR_BEHIND = process.env.METEOR_OPLOG_TOO_FAR_BEHIND || 2000;
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"observe_multiplex.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/observe_multiplex.js                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Future = Npm.require('fibers/future');

ObserveMultiplexer = function (options) {
  var self = this;
  if (!options || !_.has(options, 'ordered')) throw Error("must specified ordered");
  Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-multiplexers", 1);
  self._ordered = options.ordered;

  self._onStop = options.onStop || function () {};

  self._queue = new Meteor._SynchronousQueue();
  self._handles = {};
  self._readyFuture = new Future();
  self._cache = new LocalCollection._CachingChangeObserver({
    ordered: options.ordered
  }); // Number of addHandleAndSendInitialAdds tasks scheduled but not yet
  // running. removeHandle uses this to know if it's time to call the onStop
  // callback.

  self._addHandleTasksScheduledButNotPerformed = 0;

  _.each(self.callbackNames(), function (callbackName) {
    self[callbackName] = function ()
    /* ... */
    {
      self._applyCallback(callbackName, _.toArray(arguments));
    };
  });
};

_.extend(ObserveMultiplexer.prototype, {
  addHandleAndSendInitialAdds: function (handle) {
    var self = this; // Check this before calling runTask (even though runTask does the same
    // check) so that we don't leak an ObserveMultiplexer on error by
    // incrementing _addHandleTasksScheduledButNotPerformed and never
    // decrementing it.

    if (!self._queue.safeToRunTask()) throw new Error("Can't call observeChanges from an observe callback on the same query");
    ++self._addHandleTasksScheduledButNotPerformed;
    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-handles", 1);

    self._queue.runTask(function () {
      self._handles[handle._id] = handle; // Send out whatever adds we have so far (whether or not we the
      // multiplexer is ready).

      self._sendAdds(handle);

      --self._addHandleTasksScheduledButNotPerformed;
    }); // *outside* the task, since otherwise we'd deadlock


    self._readyFuture.wait();
  },
  // Remove an observe handle. If it was the last observe handle, call the
  // onStop callback; you cannot add any more observe handles after this.
  //
  // This is not synchronized with polls and handle additions: this means that
  // you can safely call it from within an observe callback, but it also means
  // that we have to be careful when we iterate over _handles.
  removeHandle: function (id) {
    var self = this; // This should not be possible: you can only call removeHandle by having
    // access to the ObserveHandle, which isn't returned to user code until the
    // multiplex is ready.

    if (!self._ready()) throw new Error("Can't remove handles until the multiplex is ready");
    delete self._handles[id];
    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-handles", -1);

    if (_.isEmpty(self._handles) && self._addHandleTasksScheduledButNotPerformed === 0) {
      self._stop();
    }
  },
  _stop: function (options) {
    var self = this;
    options = options || {}; // It shouldn't be possible for us to stop when all our handles still
    // haven't been returned from observeChanges!

    if (!self._ready() && !options.fromQueryError) throw Error("surprising _stop: not ready"); // Call stop callback (which kills the underlying process which sends us
    // callbacks and removes us from the connection's dictionary).

    self._onStop();

    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-multiplexers", -1); // Cause future addHandleAndSendInitialAdds calls to throw (but the onStop
    // callback should make our connection forget about us).

    self._handles = null;
  },
  // Allows all addHandleAndSendInitialAdds calls to return, once all preceding
  // adds have been processed. Does not block.
  ready: function () {
    var self = this;

    self._queue.queueTask(function () {
      if (self._ready()) throw Error("can't make ObserveMultiplex ready twice!");

      self._readyFuture.return();
    });
  },
  // If trying to execute the query results in an error, call this. This is
  // intended for permanent errors, not transient network errors that could be
  // fixed. It should only be called before ready(), because if you called ready
  // that meant that you managed to run the query once. It will stop this
  // ObserveMultiplex and cause addHandleAndSendInitialAdds calls (and thus
  // observeChanges calls) to throw the error.
  queryError: function (err) {
    var self = this;

    self._queue.runTask(function () {
      if (self._ready()) throw Error("can't claim query has an error after it worked!");

      self._stop({
        fromQueryError: true
      });

      self._readyFuture.throw(err);
    });
  },
  // Calls "cb" once the effects of all "ready", "addHandleAndSendInitialAdds"
  // and observe callbacks which came before this call have been propagated to
  // all handles. "ready" must have already been called on this multiplexer.
  onFlush: function (cb) {
    var self = this;

    self._queue.queueTask(function () {
      if (!self._ready()) throw Error("only call onFlush on a multiplexer that will be ready");
      cb();
    });
  },
  callbackNames: function () {
    var self = this;
    if (self._ordered) return ["addedBefore", "changed", "movedBefore", "removed"];else return ["added", "changed", "removed"];
  },
  _ready: function () {
    return this._readyFuture.isResolved();
  },
  _applyCallback: function (callbackName, args) {
    var self = this;

    self._queue.queueTask(function () {
      // If we stopped in the meantime, do nothing.
      if (!self._handles) return; // First, apply the change to the cache.
      // XXX We could make applyChange callbacks promise not to hang on to any
      // state from their arguments (assuming that their supplied callbacks
      // don't) and skip this clone. Currently 'changed' hangs on to state
      // though.

      self._cache.applyChange[callbackName].apply(null, EJSON.clone(args)); // If we haven't finished the initial adds, then we should only be getting
      // adds.


      if (!self._ready() && callbackName !== 'added' && callbackName !== 'addedBefore') {
        throw new Error("Got " + callbackName + " during initial adds");
      } // Now multiplex the callbacks out to all observe handles. It's OK if
      // these calls yield; since we're inside a task, no other use of our queue
      // can continue until these are done. (But we do have to be careful to not
      // use a handle that got removed, because removeHandle does not use the
      // queue; thus, we iterate over an array of keys that we control.)


      _.each(_.keys(self._handles), function (handleId) {
        var handle = self._handles && self._handles[handleId];
        if (!handle) return;
        var callback = handle['_' + callbackName]; // clone arguments so that callbacks can mutate their arguments

        callback && callback.apply(null, EJSON.clone(args));
      });
    });
  },
  // Sends initial adds to a handle. It should only be called from within a task
  // (the task that is processing the addHandleAndSendInitialAdds call). It
  // synchronously invokes the handle's added or addedBefore; there's no need to
  // flush the queue afterwards to ensure that the callbacks get out.
  _sendAdds: function (handle) {
    var self = this;
    if (self._queue.safeToRunTask()) throw Error("_sendAdds may only be called from within a task!");
    var add = self._ordered ? handle._addedBefore : handle._added;
    if (!add) return; // note: docs may be an _IdMap or an OrderedDict

    self._cache.docs.forEach(function (doc, id) {
      if (!_.has(self._handles, handle._id)) throw Error("handle got removed before sending initial adds!");
      var fields = EJSON.clone(doc);
      delete fields._id;
      if (self._ordered) add(id, fields, null); // we're going in order, so add at end
      else add(id, fields);
    });
  }
});

var nextObserveHandleId = 1;

ObserveHandle = function (multiplexer, callbacks) {
  var self = this; // The end user is only supposed to call stop().  The other fields are
  // accessible to the multiplexer, though.

  self._multiplexer = multiplexer;

  _.each(multiplexer.callbackNames(), function (name) {
    if (callbacks[name]) {
      self['_' + name] = callbacks[name];
    } else if (name === "addedBefore" && callbacks.added) {
      // Special case: if you specify "added" and "movedBefore", you get an
      // ordered observe where for some reason you don't get ordering data on
      // the adds.  I dunno, we wrote tests for it, there must have been a
      // reason.
      self._addedBefore = function (id, fields, before) {
        callbacks.added(id, fields);
      };
    }
  });

  self._stopped = false;
  self._id = nextObserveHandleId++;
};

ObserveHandle.prototype.stop = function () {
  var self = this;
  if (self._stopped) return;
  self._stopped = true;

  self._multiplexer.removeHandle(self._id);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"doc_fetcher.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/doc_fetcher.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Fiber = Npm.require('fibers');

var Future = Npm.require('fibers/future');

DocFetcher = function (mongoConnection) {
  var self = this;
  self._mongoConnection = mongoConnection; // Map from cache key -> [callback]

  self._callbacksForCacheKey = {};
};

_.extend(DocFetcher.prototype, {
  // Fetches document "id" from collectionName, returning it or null if not
  // found.
  //
  // If you make multiple calls to fetch() with the same cacheKey (a string),
  // DocFetcher may assume that they all return the same document. (It does
  // not check to see if collectionName/id match.)
  //
  // You may assume that callback is never called synchronously (and in fact
  // OplogObserveDriver does so).
  fetch: function (collectionName, id, cacheKey, callback) {
    var self = this;
    check(collectionName, String); // id is some sort of scalar

    check(cacheKey, String); // If there's already an in-progress fetch for this cache key, yield until
    // it's done and return whatever it returns.

    if (_.has(self._callbacksForCacheKey, cacheKey)) {
      self._callbacksForCacheKey[cacheKey].push(callback);

      return;
    }

    var callbacks = self._callbacksForCacheKey[cacheKey] = [callback];
    Fiber(function () {
      try {
        var doc = self._mongoConnection.findOne(collectionName, {
          _id: id
        }) || null; // Return doc to all relevant callbacks. Note that this array can
        // continue to grow during callback excecution.

        while (!_.isEmpty(callbacks)) {
          // Clone the document so that the various calls to fetch don't return
          // objects that are intertwingled with each other. Clone before
          // popping the future, so that if clone throws, the error gets passed
          // to the next callback.
          var clonedDoc = EJSON.clone(doc);
          callbacks.pop()(null, clonedDoc);
        }
      } catch (e) {
        while (!_.isEmpty(callbacks)) {
          callbacks.pop()(e);
        }
      } finally {
        // XXX consider keeping the doc around for a period of time before
        // removing from the cache
        delete self._callbacksForCacheKey[cacheKey];
      }
    }).run();
  }
});

MongoTest.DocFetcher = DocFetcher;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"polling_observe_driver.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/polling_observe_driver.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var POLLING_THROTTLE_MS = +process.env.METEOR_POLLING_THROTTLE_MS || 50;
var POLLING_INTERVAL_MS = +process.env.METEOR_POLLING_INTERVAL_MS || 10 * 1000;

PollingObserveDriver = function (options) {
  var self = this;
  self._cursorDescription = options.cursorDescription;
  self._mongoHandle = options.mongoHandle;
  self._ordered = options.ordered;
  self._multiplexer = options.multiplexer;
  self._stopCallbacks = [];
  self._stopped = false;
  self._synchronousCursor = self._mongoHandle._createSynchronousCursor(self._cursorDescription); // previous results snapshot.  on each poll cycle, diffs against
  // results drives the callbacks.

  self._results = null; // The number of _pollMongo calls that have been added to self._taskQueue but
  // have not started running. Used to make sure we never schedule more than one
  // _pollMongo (other than possibly the one that is currently running). It's
  // also used by _suspendPolling to pretend there's a poll scheduled. Usually,
  // it's either 0 (for "no polls scheduled other than maybe one currently
  // running") or 1 (for "a poll scheduled that isn't running yet"), but it can
  // also be 2 if incremented by _suspendPolling.

  self._pollsScheduledButNotStarted = 0;
  self._pendingWrites = []; // people to notify when polling completes
  // Make sure to create a separately throttled function for each
  // PollingObserveDriver object.

  self._ensurePollIsScheduled = _.throttle(self._unthrottledEnsurePollIsScheduled, self._cursorDescription.options.pollingThrottleMs || POLLING_THROTTLE_MS
  /* ms */
  ); // XXX figure out if we still need a queue

  self._taskQueue = new Meteor._SynchronousQueue();
  var listenersHandle = listenAll(self._cursorDescription, function (notification) {
    // When someone does a transaction that might affect us, schedule a poll
    // of the database. If that transaction happens inside of a write fence,
    // block the fence until we've polled and notified observers.
    var fence = DDPServer._CurrentWriteFence.get();

    if (fence) self._pendingWrites.push(fence.beginWrite()); // Ensure a poll is scheduled... but if we already know that one is,
    // don't hit the throttled _ensurePollIsScheduled function (which might
    // lead to us calling it unnecessarily in <pollingThrottleMs> ms).

    if (self._pollsScheduledButNotStarted === 0) self._ensurePollIsScheduled();
  });

  self._stopCallbacks.push(function () {
    listenersHandle.stop();
  }); // every once and a while, poll even if we don't think we're dirty, for
  // eventual consistency with database writes from outside the Meteor
  // universe.
  //
  // For testing, there's an undocumented callback argument to observeChanges
  // which disables time-based polling and gets called at the beginning of each
  // poll.


  if (options._testOnlyPollCallback) {
    self._testOnlyPollCallback = options._testOnlyPollCallback;
  } else {
    var pollingInterval = self._cursorDescription.options.pollingIntervalMs || self._cursorDescription.options._pollingInterval || // COMPAT with 1.2
    POLLING_INTERVAL_MS;
    var intervalHandle = Meteor.setInterval(_.bind(self._ensurePollIsScheduled, self), pollingInterval);

    self._stopCallbacks.push(function () {
      Meteor.clearInterval(intervalHandle);
    });
  } // Make sure we actually poll soon!


  self._unthrottledEnsurePollIsScheduled();

  Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-drivers-polling", 1);
};

_.extend(PollingObserveDriver.prototype, {
  // This is always called through _.throttle (except once at startup).
  _unthrottledEnsurePollIsScheduled: function () {
    var self = this;
    if (self._pollsScheduledButNotStarted > 0) return;
    ++self._pollsScheduledButNotStarted;

    self._taskQueue.queueTask(function () {
      self._pollMongo();
    });
  },
  // test-only interface for controlling polling.
  //
  // _suspendPolling blocks until any currently running and scheduled polls are
  // done, and prevents any further polls from being scheduled. (new
  // ObserveHandles can be added and receive their initial added callbacks,
  // though.)
  //
  // _resumePolling immediately polls, and allows further polls to occur.
  _suspendPolling: function () {
    var self = this; // Pretend that there's another poll scheduled (which will prevent
    // _ensurePollIsScheduled from queueing any more polls).

    ++self._pollsScheduledButNotStarted; // Now block until all currently running or scheduled polls are done.

    self._taskQueue.runTask(function () {}); // Confirm that there is only one "poll" (the fake one we're pretending to
    // have) scheduled.


    if (self._pollsScheduledButNotStarted !== 1) throw new Error("_pollsScheduledButNotStarted is " + self._pollsScheduledButNotStarted);
  },
  _resumePolling: function () {
    var self = this; // We should be in the same state as in the end of _suspendPolling.

    if (self._pollsScheduledButNotStarted !== 1) throw new Error("_pollsScheduledButNotStarted is " + self._pollsScheduledButNotStarted); // Run a poll synchronously (which will counteract the
    // ++_pollsScheduledButNotStarted from _suspendPolling).

    self._taskQueue.runTask(function () {
      self._pollMongo();
    });
  },
  _pollMongo: function () {
    var self = this;
    --self._pollsScheduledButNotStarted;
    if (self._stopped) return;
    var first = false;
    var newResults;
    var oldResults = self._results;

    if (!oldResults) {
      first = true; // XXX maybe use OrderedDict instead?

      oldResults = self._ordered ? [] : new LocalCollection._IdMap();
    }

    self._testOnlyPollCallback && self._testOnlyPollCallback(); // Save the list of pending writes which this round will commit.

    var writesForCycle = self._pendingWrites;
    self._pendingWrites = []; // Get the new query results. (This yields.)

    try {
      newResults = self._synchronousCursor.getRawObjects(self._ordered);
    } catch (e) {
      if (first && typeof e.code === 'number') {
        // This is an error document sent to us by mongod, not a connection
        // error generated by the client. And we've never seen this query work
        // successfully. Probably it's a bad selector or something, so we should
        // NOT retry. Instead, we should halt the observe (which ends up calling
        // `stop` on us).
        self._multiplexer.queryError(new Error("Exception while polling query " + JSON.stringify(self._cursorDescription) + ": " + e.message));

        return;
      } // getRawObjects can throw if we're having trouble talking to the
      // database.  That's fine --- we will repoll later anyway. But we should
      // make sure not to lose track of this cycle's writes.
      // (It also can throw if there's just something invalid about this query;
      // unfortunately the ObserveDriver API doesn't provide a good way to
      // "cancel" the observe from the inside in this case.


      Array.prototype.push.apply(self._pendingWrites, writesForCycle);

      Meteor._debug("Exception while polling query " + JSON.stringify(self._cursorDescription), e);

      return;
    } // Run diffs.


    if (!self._stopped) {
      LocalCollection._diffQueryChanges(self._ordered, oldResults, newResults, self._multiplexer);
    } // Signals the multiplexer to allow all observeChanges calls that share this
    // multiplexer to return. (This happens asynchronously, via the
    // multiplexer's queue.)


    if (first) self._multiplexer.ready(); // Replace self._results atomically.  (This assignment is what makes `first`
    // stay through on the next cycle, so we've waited until after we've
    // committed to ready-ing the multiplexer.)

    self._results = newResults; // Once the ObserveMultiplexer has processed everything we've done in this
    // round, mark all the writes which existed before this call as
    // commmitted. (If new writes have shown up in the meantime, there'll
    // already be another _pollMongo task scheduled.)

    self._multiplexer.onFlush(function () {
      _.each(writesForCycle, function (w) {
        w.committed();
      });
    });
  },
  stop: function () {
    var self = this;
    self._stopped = true;

    _.each(self._stopCallbacks, function (c) {
      c();
    }); // Release any write fences that are waiting on us.


    _.each(self._pendingWrites, function (w) {
      w.committed();
    });

    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-drivers-polling", -1);
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oplog_observe_driver.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/oplog_observe_driver.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Future = Npm.require('fibers/future');

var PHASE = {
  QUERYING: "QUERYING",
  FETCHING: "FETCHING",
  STEADY: "STEADY"
}; // Exception thrown by _needToPollQuery which unrolls the stack up to the
// enclosing call to finishIfNeedToPollQuery.

var SwitchedToQuery = function () {};

var finishIfNeedToPollQuery = function (f) {
  return function () {
    try {
      f.apply(this, arguments);
    } catch (e) {
      if (!(e instanceof SwitchedToQuery)) throw e;
    }
  };
};

var currentId = 0; // OplogObserveDriver is an alternative to PollingObserveDriver which follows
// the Mongo operation log instead of just re-polling the query. It obeys the
// same simple interface: constructing it starts sending observeChanges
// callbacks (and a ready() invocation) to the ObserveMultiplexer, and you stop
// it by calling the stop() method.

OplogObserveDriver = function (options) {
  var self = this;
  self._usesOplog = true; // tests look at this

  self._id = currentId;
  currentId++;
  self._cursorDescription = options.cursorDescription;
  self._mongoHandle = options.mongoHandle;
  self._multiplexer = options.multiplexer;

  if (options.ordered) {
    throw Error("OplogObserveDriver only supports unordered observeChanges");
  }

  var sorter = options.sorter; // We don't support $near and other geo-queries so it's OK to initialize the
  // comparator only once in the constructor.

  var comparator = sorter && sorter.getComparator();

  if (options.cursorDescription.options.limit) {
    // There are several properties ordered driver implements:
    // - _limit is a positive number
    // - _comparator is a function-comparator by which the query is ordered
    // - _unpublishedBuffer is non-null Min/Max Heap,
    //                      the empty buffer in STEADY phase implies that the
    //                      everything that matches the queries selector fits
    //                      into published set.
    // - _published - Min Heap (also implements IdMap methods)
    var heapOptions = {
      IdMap: LocalCollection._IdMap
    };
    self._limit = self._cursorDescription.options.limit;
    self._comparator = comparator;
    self._sorter = sorter;
    self._unpublishedBuffer = new MinMaxHeap(comparator, heapOptions); // We need something that can find Max value in addition to IdMap interface

    self._published = new MaxHeap(comparator, heapOptions);
  } else {
    self._limit = 0;
    self._comparator = null;
    self._sorter = null;
    self._unpublishedBuffer = null;
    self._published = new LocalCollection._IdMap();
  } // Indicates if it is safe to insert a new document at the end of the buffer
  // for this query. i.e. it is known that there are no documents matching the
  // selector those are not in published or buffer.


  self._safeAppendToBuffer = false;
  self._stopped = false;
  self._stopHandles = [];
  Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-drivers-oplog", 1);

  self._registerPhaseChange(PHASE.QUERYING);

  self._matcher = options.matcher;
  var projection = self._cursorDescription.options.fields || {};
  self._projectionFn = LocalCollection._compileProjection(projection); // Projection function, result of combining important fields for selector and
  // existing fields projection

  self._sharedProjection = self._matcher.combineIntoProjection(projection);
  if (sorter) self._sharedProjection = sorter.combineIntoProjection(self._sharedProjection);
  self._sharedProjectionFn = LocalCollection._compileProjection(self._sharedProjection);
  self._needToFetch = new LocalCollection._IdMap();
  self._currentlyFetching = null;
  self._fetchGeneration = 0;
  self._requeryWhenDoneThisQuery = false;
  self._writesToCommitWhenWeReachSteady = []; // If the oplog handle tells us that it skipped some entries (because it got
  // behind, say), re-poll.

  self._stopHandles.push(self._mongoHandle._oplogHandle.onSkippedEntries(finishIfNeedToPollQuery(function () {
    self._needToPollQuery();
  })));

  forEachTrigger(self._cursorDescription, function (trigger) {
    self._stopHandles.push(self._mongoHandle._oplogHandle.onOplogEntry(trigger, function (notification) {
      Meteor._noYieldsAllowed(finishIfNeedToPollQuery(function () {
        var op = notification.op;

        if (notification.dropCollection || notification.dropDatabase) {
          // Note: this call is not allowed to block on anything (especially
          // on waiting for oplog entries to catch up) because that will block
          // onOplogEntry!
          self._needToPollQuery();
        } else {
          // All other operators should be handled depending on phase
          if (self._phase === PHASE.QUERYING) {
            self._handleOplogEntryQuerying(op);
          } else {
            self._handleOplogEntrySteadyOrFetching(op);
          }
        }
      }));
    }));
  }); // XXX ordering w.r.t. everything else?

  self._stopHandles.push(listenAll(self._cursorDescription, function (notification) {
    // If we're not in a pre-fire write fence, we don't have to do anything.
    var fence = DDPServer._CurrentWriteFence.get();

    if (!fence || fence.fired) return;

    if (fence._oplogObserveDrivers) {
      fence._oplogObserveDrivers[self._id] = self;
      return;
    }

    fence._oplogObserveDrivers = {};
    fence._oplogObserveDrivers[self._id] = self;
    fence.onBeforeFire(function () {
      var drivers = fence._oplogObserveDrivers;
      delete fence._oplogObserveDrivers; // This fence cannot fire until we've caught up to "this point" in the
      // oplog, and all observers made it back to the steady state.

      self._mongoHandle._oplogHandle.waitUntilCaughtUp();

      _.each(drivers, function (driver) {
        if (driver._stopped) return;
        var write = fence.beginWrite();

        if (driver._phase === PHASE.STEADY) {
          // Make sure that all of the callbacks have made it through the
          // multiplexer and been delivered to ObserveHandles before committing
          // writes.
          driver._multiplexer.onFlush(function () {
            write.committed();
          });
        } else {
          driver._writesToCommitWhenWeReachSteady.push(write);
        }
      });
    });
  })); // When Mongo fails over, we need to repoll the query, in case we processed an
  // oplog entry that got rolled back.


  self._stopHandles.push(self._mongoHandle._onFailover(finishIfNeedToPollQuery(function () {
    self._needToPollQuery();
  }))); // Give _observeChanges a chance to add the new ObserveHandle to our
  // multiplexer, so that the added calls get streamed.


  Meteor.defer(finishIfNeedToPollQuery(function () {
    self._runInitialQuery();
  }));
};

_.extend(OplogObserveDriver.prototype, {
  _addPublished: function (id, doc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var fields = _.clone(doc);

      delete fields._id;

      self._published.set(id, self._sharedProjectionFn(doc));

      self._multiplexer.added(id, self._projectionFn(fields)); // After adding this document, the published set might be overflowed
      // (exceeding capacity specified by limit). If so, push the maximum
      // element to the buffer, we might want to save it in memory to reduce the
      // amount of Mongo lookups in the future.


      if (self._limit && self._published.size() > self._limit) {
        // XXX in theory the size of published is no more than limit+1
        if (self._published.size() !== self._limit + 1) {
          throw new Error("After adding to published, " + (self._published.size() - self._limit) + " documents are overflowing the set");
        }

        var overflowingDocId = self._published.maxElementId();

        var overflowingDoc = self._published.get(overflowingDocId);

        if (EJSON.equals(overflowingDocId, id)) {
          throw new Error("The document just added is overflowing the published set");
        }

        self._published.remove(overflowingDocId);

        self._multiplexer.removed(overflowingDocId);

        self._addBuffered(overflowingDocId, overflowingDoc);
      }
    });
  },
  _removePublished: function (id) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._published.remove(id);

      self._multiplexer.removed(id);

      if (!self._limit || self._published.size() === self._limit) return;
      if (self._published.size() > self._limit) throw Error("self._published got too big"); // OK, we are publishing less than the limit. Maybe we should look in the
      // buffer to find the next element past what we were publishing before.

      if (!self._unpublishedBuffer.empty()) {
        // There's something in the buffer; move the first thing in it to
        // _published.
        var newDocId = self._unpublishedBuffer.minElementId();

        var newDoc = self._unpublishedBuffer.get(newDocId);

        self._removeBuffered(newDocId);

        self._addPublished(newDocId, newDoc);

        return;
      } // There's nothing in the buffer.  This could mean one of a few things.
      // (a) We could be in the middle of re-running the query (specifically, we
      // could be in _publishNewResults). In that case, _unpublishedBuffer is
      // empty because we clear it at the beginning of _publishNewResults. In
      // this case, our caller already knows the entire answer to the query and
      // we don't need to do anything fancy here.  Just return.


      if (self._phase === PHASE.QUERYING) return; // (b) We're pretty confident that the union of _published and
      // _unpublishedBuffer contain all documents that match selector. Because
      // _unpublishedBuffer is empty, that means we're confident that _published
      // contains all documents that match selector. So we have nothing to do.

      if (self._safeAppendToBuffer) return; // (c) Maybe there are other documents out there that should be in our
      // buffer. But in that case, when we emptied _unpublishedBuffer in
      // _removeBuffered, we should have called _needToPollQuery, which will
      // either put something in _unpublishedBuffer or set _safeAppendToBuffer
      // (or both), and it will put us in QUERYING for that whole time. So in
      // fact, we shouldn't be able to get here.

      throw new Error("Buffer inexplicably empty");
    });
  },
  _changePublished: function (id, oldDoc, newDoc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._published.set(id, self._sharedProjectionFn(newDoc));

      var projectedNew = self._projectionFn(newDoc);

      var projectedOld = self._projectionFn(oldDoc);

      var changed = DiffSequence.makeChangedFields(projectedNew, projectedOld);
      if (!_.isEmpty(changed)) self._multiplexer.changed(id, changed);
    });
  },
  _addBuffered: function (id, doc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._unpublishedBuffer.set(id, self._sharedProjectionFn(doc)); // If something is overflowing the buffer, we just remove it from cache


      if (self._unpublishedBuffer.size() > self._limit) {
        var maxBufferedId = self._unpublishedBuffer.maxElementId();

        self._unpublishedBuffer.remove(maxBufferedId); // Since something matching is removed from cache (both published set and
        // buffer), set flag to false


        self._safeAppendToBuffer = false;
      }
    });
  },
  // Is called either to remove the doc completely from matching set or to move
  // it to the published set later.
  _removeBuffered: function (id) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._unpublishedBuffer.remove(id); // To keep the contract "buffer is never empty in STEADY phase unless the
      // everything matching fits into published" true, we poll everything as
      // soon as we see the buffer becoming empty.


      if (!self._unpublishedBuffer.size() && !self._safeAppendToBuffer) self._needToPollQuery();
    });
  },
  // Called when a document has joined the "Matching" results set.
  // Takes responsibility of keeping _unpublishedBuffer in sync with _published
  // and the effect of limit enforced.
  _addMatching: function (doc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var id = doc._id;
      if (self._published.has(id)) throw Error("tried to add something already published " + id);
      if (self._limit && self._unpublishedBuffer.has(id)) throw Error("tried to add something already existed in buffer " + id);
      var limit = self._limit;
      var comparator = self._comparator;
      var maxPublished = limit && self._published.size() > 0 ? self._published.get(self._published.maxElementId()) : null;
      var maxBuffered = limit && self._unpublishedBuffer.size() > 0 ? self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId()) : null; // The query is unlimited or didn't publish enough documents yet or the
      // new document would fit into published set pushing the maximum element
      // out, then we need to publish the doc.

      var toPublish = !limit || self._published.size() < limit || comparator(doc, maxPublished) < 0; // Otherwise we might need to buffer it (only in case of limited query).
      // Buffering is allowed if the buffer is not filled up yet and all
      // matching docs are either in the published set or in the buffer.

      var canAppendToBuffer = !toPublish && self._safeAppendToBuffer && self._unpublishedBuffer.size() < limit; // Or if it is small enough to be safely inserted to the middle or the
      // beginning of the buffer.

      var canInsertIntoBuffer = !toPublish && maxBuffered && comparator(doc, maxBuffered) <= 0;
      var toBuffer = canAppendToBuffer || canInsertIntoBuffer;

      if (toPublish) {
        self._addPublished(id, doc);
      } else if (toBuffer) {
        self._addBuffered(id, doc);
      } else {
        // dropping it and not saving to the cache
        self._safeAppendToBuffer = false;
      }
    });
  },
  // Called when a document leaves the "Matching" results set.
  // Takes responsibility of keeping _unpublishedBuffer in sync with _published
  // and the effect of limit enforced.
  _removeMatching: function (id) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      if (!self._published.has(id) && !self._limit) throw Error("tried to remove something matching but not cached " + id);

      if (self._published.has(id)) {
        self._removePublished(id);
      } else if (self._unpublishedBuffer.has(id)) {
        self._removeBuffered(id);
      }
    });
  },
  _handleDoc: function (id, newDoc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var matchesNow = newDoc && self._matcher.documentMatches(newDoc).result;

      var publishedBefore = self._published.has(id);

      var bufferedBefore = self._limit && self._unpublishedBuffer.has(id);

      var cachedBefore = publishedBefore || bufferedBefore;

      if (matchesNow && !cachedBefore) {
        self._addMatching(newDoc);
      } else if (cachedBefore && !matchesNow) {
        self._removeMatching(id);
      } else if (cachedBefore && matchesNow) {
        var oldDoc = self._published.get(id);

        var comparator = self._comparator;

        var minBuffered = self._limit && self._unpublishedBuffer.size() && self._unpublishedBuffer.get(self._unpublishedBuffer.minElementId());

        var maxBuffered;

        if (publishedBefore) {
          // Unlimited case where the document stays in published once it
          // matches or the case when we don't have enough matching docs to
          // publish or the changed but matching doc will stay in published
          // anyways.
          //
          // XXX: We rely on the emptiness of buffer. Be sure to maintain the
          // fact that buffer can't be empty if there are matching documents not
          // published. Notably, we don't want to schedule repoll and continue
          // relying on this property.
          var staysInPublished = !self._limit || self._unpublishedBuffer.size() === 0 || comparator(newDoc, minBuffered) <= 0;

          if (staysInPublished) {
            self._changePublished(id, oldDoc, newDoc);
          } else {
            // after the change doc doesn't stay in the published, remove it
            self._removePublished(id); // but it can move into buffered now, check it


            maxBuffered = self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId());
            var toBuffer = self._safeAppendToBuffer || maxBuffered && comparator(newDoc, maxBuffered) <= 0;

            if (toBuffer) {
              self._addBuffered(id, newDoc);
            } else {
              // Throw away from both published set and buffer
              self._safeAppendToBuffer = false;
            }
          }
        } else if (bufferedBefore) {
          oldDoc = self._unpublishedBuffer.get(id); // remove the old version manually instead of using _removeBuffered so
          // we don't trigger the querying immediately.  if we end this block
          // with the buffer empty, we will need to trigger the query poll
          // manually too.

          self._unpublishedBuffer.remove(id);

          var maxPublished = self._published.get(self._published.maxElementId());

          maxBuffered = self._unpublishedBuffer.size() && self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId()); // the buffered doc was updated, it could move to published

          var toPublish = comparator(newDoc, maxPublished) < 0; // or stays in buffer even after the change

          var staysInBuffer = !toPublish && self._safeAppendToBuffer || !toPublish && maxBuffered && comparator(newDoc, maxBuffered) <= 0;

          if (toPublish) {
            self._addPublished(id, newDoc);
          } else if (staysInBuffer) {
            // stays in buffer but changes
            self._unpublishedBuffer.set(id, newDoc);
          } else {
            // Throw away from both published set and buffer
            self._safeAppendToBuffer = false; // Normally this check would have been done in _removeBuffered but
            // we didn't use it, so we need to do it ourself now.

            if (!self._unpublishedBuffer.size()) {
              self._needToPollQuery();
            }
          }
        } else {
          throw new Error("cachedBefore implies either of publishedBefore or bufferedBefore is true.");
        }
      }
    });
  },
  _fetchModifiedDocuments: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._registerPhaseChange(PHASE.FETCHING); // Defer, because nothing called from the oplog entry handler may yield,
      // but fetch() yields.


      Meteor.defer(finishIfNeedToPollQuery(function () {
        while (!self._stopped && !self._needToFetch.empty()) {
          if (self._phase === PHASE.QUERYING) {
            // While fetching, we decided to go into QUERYING mode, and then we
            // saw another oplog entry, so _needToFetch is not empty. But we
            // shouldn't fetch these documents until AFTER the query is done.
            break;
          } // Being in steady phase here would be surprising.


          if (self._phase !== PHASE.FETCHING) throw new Error("phase in fetchModifiedDocuments: " + self._phase);
          self._currentlyFetching = self._needToFetch;
          var thisGeneration = ++self._fetchGeneration;
          self._needToFetch = new LocalCollection._IdMap();
          var waiting = 0;
          var fut = new Future(); // This loop is safe, because _currentlyFetching will not be updated
          // during this loop (in fact, it is never mutated).

          self._currentlyFetching.forEach(function (cacheKey, id) {
            waiting++;

            self._mongoHandle._docFetcher.fetch(self._cursorDescription.collectionName, id, cacheKey, finishIfNeedToPollQuery(function (err, doc) {
              try {
                if (err) {
                  Meteor._debug("Got exception while fetching documents", err); // If we get an error from the fetcher (eg, trouble
                  // connecting to Mongo), let's just abandon the fetch phase
                  // altogether and fall back to polling. It's not like we're
                  // getting live updates anyway.


                  if (self._phase !== PHASE.QUERYING) {
                    self._needToPollQuery();
                  }
                } else if (!self._stopped && self._phase === PHASE.FETCHING && self._fetchGeneration === thisGeneration) {
                  // We re-check the generation in case we've had an explicit
                  // _pollQuery call (eg, in another fiber) which should
                  // effectively cancel this round of fetches.  (_pollQuery
                  // increments the generation.)
                  self._handleDoc(id, doc);
                }
              } finally {
                waiting--; // Because fetch() never calls its callback synchronously,
                // this is safe (ie, we won't call fut.return() before the
                // forEach is done).

                if (waiting === 0) fut.return();
              }
            }));
          });

          fut.wait(); // Exit now if we've had a _pollQuery call (here or in another fiber).

          if (self._phase === PHASE.QUERYING) return;
          self._currentlyFetching = null;
        } // We're done fetching, so we can be steady, unless we've had a
        // _pollQuery call (here or in another fiber).


        if (self._phase !== PHASE.QUERYING) self._beSteady();
      }));
    });
  },
  _beSteady: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._registerPhaseChange(PHASE.STEADY);

      var writes = self._writesToCommitWhenWeReachSteady;
      self._writesToCommitWhenWeReachSteady = [];

      self._multiplexer.onFlush(function () {
        _.each(writes, function (w) {
          w.committed();
        });
      });
    });
  },
  _handleOplogEntryQuerying: function (op) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._needToFetch.set(idForOp(op), op.ts.toString());
    });
  },
  _handleOplogEntrySteadyOrFetching: function (op) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var id = idForOp(op); // If we're already fetching this one, or about to, we can't optimize;
      // make sure that we fetch it again if necessary.

      if (self._phase === PHASE.FETCHING && (self._currentlyFetching && self._currentlyFetching.has(id) || self._needToFetch.has(id))) {
        self._needToFetch.set(id, op.ts.toString());

        return;
      }

      if (op.op === 'd') {
        if (self._published.has(id) || self._limit && self._unpublishedBuffer.has(id)) self._removeMatching(id);
      } else if (op.op === 'i') {
        if (self._published.has(id)) throw new Error("insert found for already-existing ID in published");
        if (self._unpublishedBuffer && self._unpublishedBuffer.has(id)) throw new Error("insert found for already-existing ID in buffer"); // XXX what if selector yields?  for now it can't but later it could
        // have $where

        if (self._matcher.documentMatches(op.o).result) self._addMatching(op.o);
      } else if (op.op === 'u') {
        // Is this a modifier ($set/$unset, which may require us to poll the
        // database to figure out if the whole document matches the selector) or
        // a replacement (in which case we can just directly re-evaluate the
        // selector)?
        var isReplace = !_.has(op.o, '$set') && !_.has(op.o, '$unset'); // If this modifier modifies something inside an EJSON custom type (ie,
        // anything with EJSON$), then we can't try to use
        // LocalCollection._modify, since that just mutates the EJSON encoding,
        // not the actual object.

        var canDirectlyModifyDoc = !isReplace && modifierCanBeDirectlyApplied(op.o);

        var publishedBefore = self._published.has(id);

        var bufferedBefore = self._limit && self._unpublishedBuffer.has(id);

        if (isReplace) {
          self._handleDoc(id, _.extend({
            _id: id
          }, op.o));
        } else if ((publishedBefore || bufferedBefore) && canDirectlyModifyDoc) {
          // Oh great, we actually know what the document is, so we can apply
          // this directly.
          var newDoc = self._published.has(id) ? self._published.get(id) : self._unpublishedBuffer.get(id);
          newDoc = EJSON.clone(newDoc);
          newDoc._id = id;

          try {
            LocalCollection._modify(newDoc, op.o);
          } catch (e) {
            if (e.name !== "MinimongoError") throw e; // We didn't understand the modifier.  Re-fetch.

            self._needToFetch.set(id, op.ts.toString());

            if (self._phase === PHASE.STEADY) {
              self._fetchModifiedDocuments();
            }

            return;
          }

          self._handleDoc(id, self._sharedProjectionFn(newDoc));
        } else if (!canDirectlyModifyDoc || self._matcher.canBecomeTrueByModifier(op.o) || self._sorter && self._sorter.affectedByModifier(op.o)) {
          self._needToFetch.set(id, op.ts.toString());

          if (self._phase === PHASE.STEADY) self._fetchModifiedDocuments();
        }
      } else {
        throw Error("XXX SURPRISING OPERATION: " + op);
      }
    });
  },
  // Yields!
  _runInitialQuery: function () {
    var self = this;
    if (self._stopped) throw new Error("oplog stopped surprisingly early");

    self._runQuery({
      initial: true
    }); // yields


    if (self._stopped) return; // can happen on queryError
    // Allow observeChanges calls to return. (After this, it's possible for
    // stop() to be called.)

    self._multiplexer.ready();

    self._doneQuerying(); // yields

  },
  // In various circumstances, we may just want to stop processing the oplog and
  // re-run the initial query, just as if we were a PollingObserveDriver.
  //
  // This function may not block, because it is called from an oplog entry
  // handler.
  //
  // XXX We should call this when we detect that we've been in FETCHING for "too
  // long".
  //
  // XXX We should call this when we detect Mongo failover (since that might
  // mean that some of the oplog entries we have processed have been rolled
  // back). The Node Mongo driver is in the middle of a bunch of huge
  // refactorings, including the way that it notifies you when primary
  // changes. Will put off implementing this until driver 1.4 is out.
  _pollQuery: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      if (self._stopped) return; // Yay, we get to forget about all the things we thought we had to fetch.

      self._needToFetch = new LocalCollection._IdMap();
      self._currentlyFetching = null;
      ++self._fetchGeneration; // ignore any in-flight fetches

      self._registerPhaseChange(PHASE.QUERYING); // Defer so that we don't yield.  We don't need finishIfNeedToPollQuery
      // here because SwitchedToQuery is not thrown in QUERYING mode.


      Meteor.defer(function () {
        self._runQuery();

        self._doneQuerying();
      });
    });
  },
  // Yields!
  _runQuery: function (options) {
    var self = this;
    options = options || {};
    var newResults, newBuffer; // This while loop is just to retry failures.

    while (true) {
      // If we've been stopped, we don't have to run anything any more.
      if (self._stopped) return;
      newResults = new LocalCollection._IdMap();
      newBuffer = new LocalCollection._IdMap(); // Query 2x documents as the half excluded from the original query will go
      // into unpublished buffer to reduce additional Mongo lookups in cases
      // when documents are removed from the published set and need a
      // replacement.
      // XXX needs more thought on non-zero skip
      // XXX 2 is a "magic number" meaning there is an extra chunk of docs for
      // buffer if such is needed.

      var cursor = self._cursorForQuery({
        limit: self._limit * 2
      });

      try {
        cursor.forEach(function (doc, i) {
          // yields
          if (!self._limit || i < self._limit) {
            newResults.set(doc._id, doc);
          } else {
            newBuffer.set(doc._id, doc);
          }
        });
        break;
      } catch (e) {
        if (options.initial && typeof e.code === 'number') {
          // This is an error document sent to us by mongod, not a connection
          // error generated by the client. And we've never seen this query work
          // successfully. Probably it's a bad selector or something, so we
          // should NOT retry. Instead, we should halt the observe (which ends
          // up calling `stop` on us).
          self._multiplexer.queryError(e);

          return;
        } // During failover (eg) if we get an exception we should log and retry
        // instead of crashing.


        Meteor._debug("Got exception while polling query", e);

        Meteor._sleepForMs(100);
      }
    }

    if (self._stopped) return;

    self._publishNewResults(newResults, newBuffer);
  },
  // Transitions to QUERYING and runs another query, or (if already in QUERYING)
  // ensures that we will query again later.
  //
  // This function may not block, because it is called from an oplog entry
  // handler. However, if we were not already in the QUERYING phase, it throws
  // an exception that is caught by the closest surrounding
  // finishIfNeedToPollQuery call; this ensures that we don't continue running
  // close that was designed for another phase inside PHASE.QUERYING.
  //
  // (It's also necessary whenever logic in this file yields to check that other
  // phases haven't put us into QUERYING mode, though; eg,
  // _fetchModifiedDocuments does this.)
  _needToPollQuery: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      if (self._stopped) return; // If we're not already in the middle of a query, we can query now
      // (possibly pausing FETCHING).

      if (self._phase !== PHASE.QUERYING) {
        self._pollQuery();

        throw new SwitchedToQuery();
      } // We're currently in QUERYING. Set a flag to ensure that we run another
      // query when we're done.


      self._requeryWhenDoneThisQuery = true;
    });
  },
  // Yields!
  _doneQuerying: function () {
    var self = this;
    if (self._stopped) return;

    self._mongoHandle._oplogHandle.waitUntilCaughtUp(); // yields


    if (self._stopped) return;
    if (self._phase !== PHASE.QUERYING) throw Error("Phase unexpectedly " + self._phase);

    Meteor._noYieldsAllowed(function () {
      if (self._requeryWhenDoneThisQuery) {
        self._requeryWhenDoneThisQuery = false;

        self._pollQuery();
      } else if (self._needToFetch.empty()) {
        self._beSteady();
      } else {
        self._fetchModifiedDocuments();
      }
    });
  },
  _cursorForQuery: function (optionsOverwrite) {
    var self = this;
    return Meteor._noYieldsAllowed(function () {
      // The query we run is almost the same as the cursor we are observing,
      // with a few changes. We need to read all the fields that are relevant to
      // the selector, not just the fields we are going to publish (that's the
      // "shared" projection). And we don't want to apply any transform in the
      // cursor, because observeChanges shouldn't use the transform.
      var options = _.clone(self._cursorDescription.options); // Allow the caller to modify the options. Useful to specify different
      // skip and limit values.


      _.extend(options, optionsOverwrite);

      options.fields = self._sharedProjection;
      delete options.transform; // We are NOT deep cloning fields or selector here, which should be OK.

      var description = new CursorDescription(self._cursorDescription.collectionName, self._cursorDescription.selector, options);
      return new Cursor(self._mongoHandle, description);
    });
  },
  // Replace self._published with newResults (both are IdMaps), invoking observe
  // callbacks on the multiplexer.
  // Replace self._unpublishedBuffer with newBuffer.
  //
  // XXX This is very similar to LocalCollection._diffQueryUnorderedChanges. We
  // should really: (a) Unify IdMap and OrderedDict into Unordered/OrderedDict
  // (b) Rewrite diff.js to use these classes instead of arrays and objects.
  _publishNewResults: function (newResults, newBuffer) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      // If the query is limited and there is a buffer, shut down so it doesn't
      // stay in a way.
      if (self._limit) {
        self._unpublishedBuffer.clear();
      } // First remove anything that's gone. Be careful not to modify
      // self._published while iterating over it.


      var idsToRemove = [];

      self._published.forEach(function (doc, id) {
        if (!newResults.has(id)) idsToRemove.push(id);
      });

      _.each(idsToRemove, function (id) {
        self._removePublished(id);
      }); // Now do adds and changes.
      // If self has a buffer and limit, the new fetched result will be
      // limited correctly as the query has sort specifier.


      newResults.forEach(function (doc, id) {
        self._handleDoc(id, doc);
      }); // Sanity-check that everything we tried to put into _published ended up
      // there.
      // XXX if this is slow, remove it later

      if (self._published.size() !== newResults.size()) {
        console.error('The Mongo server and the Meteor query disagree on how ' + 'many documents match your query. Cursor description: ', self._cursorDescription);
        throw Error("The Mongo server and the Meteor query disagree on how " + "many documents match your query. Maybe it is hitting a Mongo " + "edge case? The query is: " + EJSON.stringify(self._cursorDescription.selector));
      }

      self._published.forEach(function (doc, id) {
        if (!newResults.has(id)) throw Error("_published has a doc that newResults doesn't; " + id);
      }); // Finally, replace the buffer


      newBuffer.forEach(function (doc, id) {
        self._addBuffered(id, doc);
      });
      self._safeAppendToBuffer = newBuffer.size() < self._limit;
    });
  },
  // This stop function is invoked from the onStop of the ObserveMultiplexer, so
  // it shouldn't actually be possible to call it until the multiplexer is
  // ready.
  //
  // It's important to check self._stopped after every call in this file that
  // can yield!
  stop: function () {
    var self = this;
    if (self._stopped) return;
    self._stopped = true;

    _.each(self._stopHandles, function (handle) {
      handle.stop();
    }); // Note: we *don't* use multiplexer.onFlush here because this stop
    // callback is actually invoked by the multiplexer itself when it has
    // determined that there are no handles left. So nothing is actually going
    // to get flushed (and it's probably not valid to call methods on the
    // dying multiplexer).


    _.each(self._writesToCommitWhenWeReachSteady, function (w) {
      w.committed(); // maybe yields?
    });

    self._writesToCommitWhenWeReachSteady = null; // Proactively drop references to potentially big things.

    self._published = null;
    self._unpublishedBuffer = null;
    self._needToFetch = null;
    self._currentlyFetching = null;
    self._oplogEntryHandle = null;
    self._listenersHandle = null;
    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-drivers-oplog", -1);
  },
  _registerPhaseChange: function (phase) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var now = new Date();

      if (self._phase) {
        var timeDiff = now - self._phaseStartTime;
        Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "time-spent-in-" + self._phase + "-phase", timeDiff);
      }

      self._phase = phase;
      self._phaseStartTime = now;
    });
  }
}); // Does our oplog tailing code support this cursor? For now, we are being very
// conservative and allowing only simple queries with simple options.
// (This is a "static method".)


OplogObserveDriver.cursorSupported = function (cursorDescription, matcher) {
  // First, check the options.
  var options = cursorDescription.options; // Did the user say no explicitly?
  // underscored version of the option is COMPAT with 1.2

  if (options.disableOplog || options._disableOplog) return false; // skip is not supported: to support it we would need to keep track of all
  // "skipped" documents or at least their ids.
  // limit w/o a sort specifier is not supported: current implementation needs a
  // deterministic way to order documents.

  if (options.skip || options.limit && !options.sort) return false; // If a fields projection option is given check if it is supported by
  // minimongo (some operators are not supported).

  if (options.fields) {
    try {
      LocalCollection._checkSupportedProjection(options.fields);
    } catch (e) {
      if (e.name === "MinimongoError") {
        return false;
      } else {
        throw e;
      }
    }
  } // We don't allow the following selectors:
  //   - $where (not confident that we provide the same JS environment
  //             as Mongo, and can yield!)
  //   - $near (has "interesting" properties in MongoDB, like the possibility
  //            of returning an ID multiple times, though even polling maybe
  //            have a bug there)
  //           XXX: once we support it, we would need to think more on how we
  //           initialize the comparators when we create the driver.


  return !matcher.hasWhere() && !matcher.hasGeoQuery();
};

var modifierCanBeDirectlyApplied = function (modifier) {
  return _.all(modifier, function (fields, operation) {
    return _.all(fields, function (value, field) {
      return !/EJSON\$/.test(field);
    });
  });
};

MongoInternals.OplogObserveDriver = OplogObserveDriver;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"local_collection_driver.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/local_collection_driver.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  LocalCollectionDriver: () => LocalCollectionDriver
});
const LocalCollectionDriver = new class LocalCollectionDriver {
  constructor() {
    this.noConnCollections = Object.create(null);
  }

  open(name, conn) {
    if (!name) {
      return new LocalCollection();
    }

    if (!conn) {
      return ensureCollection(name, this.noConnCollections);
    }

    if (!conn._mongo_livedata_collections) {
      conn._mongo_livedata_collections = Object.create(null);
    } // XXX is there a way to keep track of a connection's collections without
    // dangling it off the connection object?


    return ensureCollection(name, conn._mongo_livedata_collections);
  }

}();

function ensureCollection(name, collections) {
  return name in collections ? collections[name] : collections[name] = new LocalCollection(name);
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"remote_collection_driver.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/remote_collection_driver.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
MongoInternals.RemoteCollectionDriver = function (mongo_url, options) {
  var self = this;
  self.mongo = new MongoConnection(mongo_url, options);
};

_.extend(MongoInternals.RemoteCollectionDriver.prototype, {
  open: function (name) {
    var self = this;
    var ret = {};

    _.each(['find', 'findOne', 'insert', 'update', 'upsert', 'remove', '_ensureIndex', '_dropIndex', '_createCappedCollection', 'dropCollection', 'rawCollection'], function (m) {
      ret[m] = _.bind(self.mongo[m], self.mongo, name);
    });

    return ret;
  }
}); // Create the singleton RemoteCollectionDriver only on demand, so we
// only require Mongo configuration if it's actually used (eg, not if
// you're only trying to receive data from a remote DDP server.)


MongoInternals.defaultRemoteCollectionDriver = _.once(function () {
  var connectionOptions = {};
  var mongoUrl = process.env.MONGO_URL;

  if (process.env.MONGO_OPLOG_URL) {
    connectionOptions.oplogUrl = process.env.MONGO_OPLOG_URL;
  }

  if (!mongoUrl) throw new Error("MONGO_URL must be set in environment");
  return new MongoInternals.RemoteCollectionDriver(mongoUrl, connectionOptions);
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"collection.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/collection.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

// options.connection, if given, is a LivedataClient or LivedataServer
// XXX presently there is no way to destroy/clean up a Collection

/**
 * @summary Namespace for MongoDB-related items
 * @namespace
 */
Mongo = {};
/**
 * @summary Constructor for a Collection
 * @locus Anywhere
 * @instancename collection
 * @class
 * @param {String} name The name of the collection.  If null, creates an unmanaged (unsynchronized) local collection.
 * @param {Object} [options]
 * @param {Object} options.connection The server connection that will manage this collection. Uses the default connection if not specified.  Pass the return value of calling [`DDP.connect`](#ddp_connect) to specify a different server. Pass `null` to specify no connection. Unmanaged (`name` is null) collections cannot specify a connection.
 * @param {String} options.idGeneration The method of generating the `_id` fields of new documents in this collection.  Possible values:

 - **`'STRING'`**: random strings
 - **`'MONGO'`**:  random [`Mongo.ObjectID`](#mongo_object_id) values

The default id generation technique is `'STRING'`.
 * @param {Function} options.transform An optional transformation function. Documents will be passed through this function before being returned from `fetch` or `findOne`, and before being passed to callbacks of `observe`, `map`, `forEach`, `allow`, and `deny`. Transforms are *not* applied for the callbacks of `observeChanges` or to cursors returned from publish functions.
 * @param {Boolean} options.defineMutationMethods Set to `false` to skip setting up the mutation methods that enable insert/update/remove from client code. Default `true`.
 */

Mongo.Collection = function Collection(name, options) {
  if (!name && name !== null) {
    Meteor._debug("Warning: creating anonymous collection. It will not be " + "saved or synchronized over the network. (Pass null for " + "the collection name to turn off this warning.)");

    name = null;
  }

  if (name !== null && typeof name !== "string") {
    throw new Error("First argument to new Mongo.Collection must be a string or null");
  }

  if (options && options.methods) {
    // Backwards compatibility hack with original signature (which passed
    // "connection" directly instead of in options. (Connections must have a "methods"
    // method.)
    // XXX remove before 1.0
    options = {
      connection: options
    };
  } // Backwards compatibility: "connection" used to be called "manager".


  if (options && options.manager && !options.connection) {
    options.connection = options.manager;
  }

  options = (0, _objectSpread2.default)({
    connection: undefined,
    idGeneration: 'STRING',
    transform: null,
    _driver: undefined,
    _preventAutopublish: false
  }, options);

  switch (options.idGeneration) {
    case 'MONGO':
      this._makeNewID = function () {
        var src = name ? DDP.randomStream('/collection/' + name) : Random.insecure;
        return new Mongo.ObjectID(src.hexString(24));
      };

      break;

    case 'STRING':
    default:
      this._makeNewID = function () {
        var src = name ? DDP.randomStream('/collection/' + name) : Random.insecure;
        return src.id();
      };

      break;
  }

  this._transform = LocalCollection.wrapTransform(options.transform);
  if (!name || options.connection === null) // note: nameless collections never have a connection
    this._connection = null;else if (options.connection) this._connection = options.connection;else if (Meteor.isClient) this._connection = Meteor.connection;else this._connection = Meteor.server;

  if (!options._driver) {
    // XXX This check assumes that webapp is loaded so that Meteor.server !==
    // null. We should fully support the case of "want to use a Mongo-backed
    // collection from Node code without webapp", but we don't yet.
    // #MeteorServerNull
    if (name && this._connection === Meteor.server && typeof MongoInternals !== "undefined" && MongoInternals.defaultRemoteCollectionDriver) {
      options._driver = MongoInternals.defaultRemoteCollectionDriver();
    } else {
      const {
        LocalCollectionDriver
      } = require("./local_collection_driver.js");

      options._driver = LocalCollectionDriver;
    }
  }

  this._collection = options._driver.open(name, this._connection);
  this._name = name;
  this._driver = options._driver;

  this._maybeSetUpReplication(name, options); // XXX don't define these until allow or deny is actually used for this
  // collection. Could be hard if the security rules are only defined on the
  // server.


  if (options.defineMutationMethods !== false) {
    try {
      this._defineMutationMethods({
        useExisting: options._suppressSameNameError === true
      });
    } catch (error) {
      // Throw a more understandable error on the server for same collection name
      if (error.message === `A method named '/${name}/insert' is already defined`) throw new Error(`There is already a collection named "${name}"`);
      throw error;
    }
  } // autopublish


  if (Package.autopublish && !options._preventAutopublish && this._connection && this._connection.publish) {
    this._connection.publish(null, () => this.find(), {
      is_auto: true
    });
  }
};

Object.assign(Mongo.Collection.prototype, {
  _maybeSetUpReplication(name, {
    _suppressSameNameError = false
  }) {
    const self = this;

    if (!(self._connection && self._connection.registerStore)) {
      return;
    } // OK, we're going to be a slave, replicating some remote
    // database, except possibly with some temporary divergence while
    // we have unacknowledged RPC's.


    const ok = self._connection.registerStore(name, {
      // Called at the beginning of a batch of updates. batchSize is the number
      // of update calls to expect.
      //
      // XXX This interface is pretty janky. reset probably ought to go back to
      // being its own function, and callers shouldn't have to calculate
      // batchSize. The optimization of not calling pause/remove should be
      // delayed until later: the first call to update() should buffer its
      // message, and then we can either directly apply it at endUpdate time if
      // it was the only update, or do pauseObservers/apply/apply at the next
      // update() if there's another one.
      beginUpdate(batchSize, reset) {
        // pause observers so users don't see flicker when updating several
        // objects at once (including the post-reconnect reset-and-reapply
        // stage), and so that a re-sorting of a query can take advantage of the
        // full _diffQuery moved calculation instead of applying change one at a
        // time.
        if (batchSize > 1 || reset) self._collection.pauseObservers();
        if (reset) self._collection.remove({});
      },

      // Apply an update.
      // XXX better specify this interface (not in terms of a wire message)?
      update(msg) {
        var mongoId = MongoID.idParse(msg.id);

        var doc = self._collection.findOne(mongoId); // Is this a "replace the whole doc" message coming from the quiescence
        // of method writes to an object? (Note that 'undefined' is a valid
        // value meaning "remove it".)


        if (msg.msg === 'replace') {
          var replace = msg.replace;

          if (!replace) {
            if (doc) self._collection.remove(mongoId);
          } else if (!doc) {
            self._collection.insert(replace);
          } else {
            // XXX check that replace has no $ ops
            self._collection.update(mongoId, replace);
          }

          return;
        } else if (msg.msg === 'added') {
          if (doc) {
            throw new Error("Expected not to find a document already present for an add");
          }

          self._collection.insert((0, _objectSpread2.default)({
            _id: mongoId
          }, msg.fields));
        } else if (msg.msg === 'removed') {
          if (!doc) throw new Error("Expected to find a document already present for removed");

          self._collection.remove(mongoId);
        } else if (msg.msg === 'changed') {
          if (!doc) throw new Error("Expected to find a document to change");
          const keys = Object.keys(msg.fields);

          if (keys.length > 0) {
            var modifier = {};
            keys.forEach(key => {
              const value = msg.fields[key];

              if (EJSON.equals(doc[key], value)) {
                return;
              }

              if (typeof value === "undefined") {
                if (!modifier.$unset) {
                  modifier.$unset = {};
                }

                modifier.$unset[key] = 1;
              } else {
                if (!modifier.$set) {
                  modifier.$set = {};
                }

                modifier.$set[key] = value;
              }
            });

            if (Object.keys(modifier).length > 0) {
              self._collection.update(mongoId, modifier);
            }
          }
        } else {
          throw new Error("I don't know how to deal with this message");
        }
      },

      // Called at the end of a batch of updates.
      endUpdate() {
        self._collection.resumeObservers();
      },

      // Called around method stub invocations to capture the original versions
      // of modified documents.
      saveOriginals() {
        self._collection.saveOriginals();
      },

      retrieveOriginals() {
        return self._collection.retrieveOriginals();
      },

      // Used to preserve current versions of documents across a store reset.
      getDoc(id) {
        return self.findOne(id);
      },

      // To be able to get back to the collection from the store.
      _getCollection() {
        return self;
      }

    });

    if (!ok) {
      const message = `There is already a collection named "${name}"`;

      if (_suppressSameNameError === true) {
        // XXX In theory we do not have to throw when `ok` is falsy. The
        // store is already defined for this collection name, but this
        // will simply be another reference to it and everything should
        // work. However, we have historically thrown an error here, so
        // for now we will skip the error only when _suppressSameNameError
        // is `true`, allowing people to opt in and give this some real
        // world testing.
        console.warn ? console.warn(message) : console.log(message);
      } else {
        throw new Error(message);
      }
    }
  },

  ///
  /// Main collection API
  ///
  _getFindSelector(args) {
    if (args.length == 0) return {};else return args[0];
  },

  _getFindOptions(args) {
    var self = this;

    if (args.length < 2) {
      return {
        transform: self._transform
      };
    } else {
      check(args[1], Match.Optional(Match.ObjectIncluding({
        fields: Match.Optional(Match.OneOf(Object, undefined)),
        sort: Match.Optional(Match.OneOf(Object, Array, Function, undefined)),
        limit: Match.Optional(Match.OneOf(Number, undefined)),
        skip: Match.Optional(Match.OneOf(Number, undefined))
      })));
      return (0, _objectSpread2.default)({
        transform: self._transform
      }, args[1]);
    }
  },

  /**
   * @summary Find the documents in a collection that match the selector.
   * @locus Anywhere
   * @method find
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} [selector] A query describing the documents to find
   * @param {Object} [options]
   * @param {MongoSortSpecifier} options.sort Sort order (default: natural order)
   * @param {Number} options.skip Number of results to skip at the beginning
   * @param {Number} options.limit Maximum number of results to return
   * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
   * @param {Boolean} options.reactive (Client only) Default `true`; pass `false` to disable reactivity
   * @param {Function} options.transform Overrides `transform` on the  [`Collection`](#collections) for this cursor.  Pass `null` to disable transformation.
   * @param {Boolean} options.disableOplog (Server only) Pass true to disable oplog-tailing on this query. This affects the way server processes calls to `observe` on this query. Disabling the oplog can be useful when working with data that updates in large batches.
   * @param {Number} options.pollingIntervalMs (Server only) When oplog is disabled (through the use of `disableOplog` or when otherwise not available), the frequency (in milliseconds) of how often to poll this query when observing on the server. Defaults to 10000ms (10 seconds).
   * @param {Number} options.pollingThrottleMs (Server only) When oplog is disabled (through the use of `disableOplog` or when otherwise not available), the minimum time (in milliseconds) to allow between re-polling when observing on the server. Increasing this will save CPU and mongo load at the expense of slower updates to users. Decreasing this is not recommended. Defaults to 50ms.
   * @param {Number} options.maxTimeMs (Server only) If set, instructs MongoDB to set a time limit for this cursor's operations. If the operation reaches the specified time limit (in milliseconds) without the having been completed, an exception will be thrown. Useful to prevent an (accidental or malicious) unoptimized query from causing a full collection scan that would disrupt other database users, at the expense of needing to handle the resulting error.
   * @param {String|Object} options.hint (Server only) Overrides MongoDB's default index selection and query optimization process. Specify an index to force its use, either by its name or index specification. You can also specify `{ $natural : 1 }` to force a forwards collection scan, or `{ $natural : -1 }` for a reverse collection scan. Setting this is only recommended for advanced users.
   * @returns {Mongo.Cursor}
   */
  find(...args) {
    // Collection.find() (return all docs) behaves differently
    // from Collection.find(undefined) (return 0 docs).  so be
    // careful about the length of arguments.
    return this._collection.find(this._getFindSelector(args), this._getFindOptions(args));
  },

  /**
   * @summary Finds the first document that matches the selector, as ordered by sort and skip options. Returns `undefined` if no matching document is found.
   * @locus Anywhere
   * @method findOne
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} [selector] A query describing the documents to find
   * @param {Object} [options]
   * @param {MongoSortSpecifier} options.sort Sort order (default: natural order)
   * @param {Number} options.skip Number of results to skip at the beginning
   * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
   * @param {Boolean} options.reactive (Client only) Default true; pass false to disable reactivity
   * @param {Function} options.transform Overrides `transform` on the [`Collection`](#collections) for this cursor.  Pass `null` to disable transformation.
   * @returns {Object}
   */
  findOne(...args) {
    return this._collection.findOne(this._getFindSelector(args), this._getFindOptions(args));
  }

});
Object.assign(Mongo.Collection, {
  _publishCursor(cursor, sub, collection) {
    var observeHandle = cursor.observeChanges({
      added: function (id, fields) {
        sub.added(collection, id, fields);
      },
      changed: function (id, fields) {
        sub.changed(collection, id, fields);
      },
      removed: function (id) {
        sub.removed(collection, id);
      }
    }); // We don't call sub.ready() here: it gets called in livedata_server, after
    // possibly calling _publishCursor on multiple returned cursors.
    // register stop callback (expects lambda w/ no args).

    sub.onStop(function () {
      observeHandle.stop();
    }); // return the observeHandle in case it needs to be stopped early

    return observeHandle;
  },

  // protect against dangerous selectors.  falsey and {_id: falsey} are both
  // likely programmer error, and not what you want, particularly for destructive
  // operations. If a falsey _id is sent in, a new string _id will be
  // generated and returned; if a fallbackId is provided, it will be returned
  // instead.
  _rewriteSelector(selector, {
    fallbackId
  } = {}) {
    // shorthand -- scalars match _id
    if (LocalCollection._selectorIsId(selector)) selector = {
      _id: selector
    };

    if (Array.isArray(selector)) {
      // This is consistent with the Mongo console itself; if we don't do this
      // check passing an empty array ends up selecting all items
      throw new Error("Mongo selector can't be an array.");
    }

    if (!selector || '_id' in selector && !selector._id) {
      // can't match anything
      return {
        _id: fallbackId || Random.id()
      };
    }

    return selector;
  }

});
Object.assign(Mongo.Collection.prototype, {
  // 'insert' immediately returns the inserted document's new _id.
  // The others return values immediately if you are in a stub, an in-memory
  // unmanaged collection, or a mongo-backed collection and you don't pass a
  // callback. 'update' and 'remove' return the number of affected
  // documents. 'upsert' returns an object with keys 'numberAffected' and, if an
  // insert happened, 'insertedId'.
  //
  // Otherwise, the semantics are exactly like other methods: they take
  // a callback as an optional last argument; if no callback is
  // provided, they block until the operation is complete, and throw an
  // exception if it fails; if a callback is provided, then they don't
  // necessarily block, and they call the callback when they finish with error and
  // result arguments.  (The insert method provides the document ID as its result;
  // update and remove provide the number of affected docs as the result; upsert
  // provides an object with numberAffected and maybe insertedId.)
  //
  // On the client, blocking is impossible, so if a callback
  // isn't provided, they just return immediately and any error
  // information is lost.
  //
  // There's one more tweak. On the client, if you don't provide a
  // callback, then if there is an error, a message will be logged with
  // Meteor._debug.
  //
  // The intent (though this is actually determined by the underlying
  // drivers) is that the operations should be done synchronously, not
  // generating their result until the database has acknowledged
  // them. In the future maybe we should provide a flag to turn this
  // off.

  /**
   * @summary Insert a document in the collection.  Returns its unique _id.
   * @locus Anywhere
   * @method  insert
   * @memberof Mongo.Collection
   * @instance
   * @param {Object} doc The document to insert. May not yet have an _id attribute, in which case Meteor will generate one for you.
   * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the _id as the second.
   */
  insert(doc, callback) {
    // Make sure we were passed a document to insert
    if (!doc) {
      throw new Error("insert requires an argument");
    } // Make a shallow clone of the document, preserving its prototype.


    doc = Object.create(Object.getPrototypeOf(doc), Object.getOwnPropertyDescriptors(doc));

    if ('_id' in doc) {
      if (!doc._id || !(typeof doc._id === 'string' || doc._id instanceof Mongo.ObjectID)) {
        throw new Error("Meteor requires document _id fields to be non-empty strings or ObjectIDs");
      }
    } else {
      let generateId = true; // Don't generate the id if we're the client and the 'outermost' call
      // This optimization saves us passing both the randomSeed and the id
      // Passing both is redundant.

      if (this._isRemoteCollection()) {
        const enclosing = DDP._CurrentMethodInvocation.get();

        if (!enclosing) {
          generateId = false;
        }
      }

      if (generateId) {
        doc._id = this._makeNewID();
      }
    } // On inserts, always return the id that we generated; on all other
    // operations, just return the result from the collection.


    var chooseReturnValueFromCollectionResult = function (result) {
      if (doc._id) {
        return doc._id;
      } // XXX what is this for??
      // It's some iteraction between the callback to _callMutatorMethod and
      // the return value conversion


      doc._id = result;
      return result;
    };

    const wrappedCallback = wrapCallback(callback, chooseReturnValueFromCollectionResult);

    if (this._isRemoteCollection()) {
      const result = this._callMutatorMethod("insert", [doc], wrappedCallback);

      return chooseReturnValueFromCollectionResult(result);
    } // it's my collection.  descend into the collection object
    // and propagate any exception.


    try {
      // If the user provided a callback and the collection implements this
      // operation asynchronously, then queryRet will be undefined, and the
      // result will be returned through the callback instead.
      const result = this._collection.insert(doc, wrappedCallback);

      return chooseReturnValueFromCollectionResult(result);
    } catch (e) {
      if (callback) {
        callback(e);
        return null;
      }

      throw e;
    }
  },

  /**
   * @summary Modify one or more documents in the collection. Returns the number of matched documents.
   * @locus Anywhere
   * @method update
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} selector Specifies which documents to modify
   * @param {MongoModifier} modifier Specifies how to modify the documents
   * @param {Object} [options]
   * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
   * @param {Boolean} options.upsert True to insert a document if no matching documents are found.
   * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the number of affected documents as the second.
   */
  update(selector, modifier, ...optionsAndCallback) {
    const callback = popCallbackFromArgs(optionsAndCallback); // We've already popped off the callback, so we are left with an array
    // of one or zero items

    const options = (0, _objectSpread2.default)({}, optionsAndCallback[0] || null);
    let insertedId;

    if (options && options.upsert) {
      // set `insertedId` if absent.  `insertedId` is a Meteor extension.
      if (options.insertedId) {
        if (!(typeof options.insertedId === 'string' || options.insertedId instanceof Mongo.ObjectID)) throw new Error("insertedId must be string or ObjectID");
        insertedId = options.insertedId;
      } else if (!selector || !selector._id) {
        insertedId = this._makeNewID();
        options.generatedId = true;
        options.insertedId = insertedId;
      }
    }

    selector = Mongo.Collection._rewriteSelector(selector, {
      fallbackId: insertedId
    });
    const wrappedCallback = wrapCallback(callback);

    if (this._isRemoteCollection()) {
      const args = [selector, modifier, options];
      return this._callMutatorMethod("update", args, wrappedCallback);
    } // it's my collection.  descend into the collection object
    // and propagate any exception.


    try {
      // If the user provided a callback and the collection implements this
      // operation asynchronously, then queryRet will be undefined, and the
      // result will be returned through the callback instead.
      return this._collection.update(selector, modifier, options, wrappedCallback);
    } catch (e) {
      if (callback) {
        callback(e);
        return null;
      }

      throw e;
    }
  },

  /**
   * @summary Remove documents from the collection
   * @locus Anywhere
   * @method remove
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} selector Specifies which documents to remove
   * @param {Function} [callback] Optional.  If present, called with an error object as its argument.
   */
  remove(selector, callback) {
    selector = Mongo.Collection._rewriteSelector(selector);
    const wrappedCallback = wrapCallback(callback);

    if (this._isRemoteCollection()) {
      return this._callMutatorMethod("remove", [selector], wrappedCallback);
    } // it's my collection.  descend into the collection object
    // and propagate any exception.


    try {
      // If the user provided a callback and the collection implements this
      // operation asynchronously, then queryRet will be undefined, and the
      // result will be returned through the callback instead.
      return this._collection.remove(selector, wrappedCallback);
    } catch (e) {
      if (callback) {
        callback(e);
        return null;
      }

      throw e;
    }
  },

  // Determine if this collection is simply a minimongo representation of a real
  // database on another server
  _isRemoteCollection() {
    // XXX see #MeteorServerNull
    return this._connection && this._connection !== Meteor.server;
  },

  /**
   * @summary Modify one or more documents in the collection, or insert one if no matching documents were found. Returns an object with keys `numberAffected` (the number of documents modified)  and `insertedId` (the unique _id of the document that was inserted, if any).
   * @locus Anywhere
   * @method upsert
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} selector Specifies which documents to modify
   * @param {MongoModifier} modifier Specifies how to modify the documents
   * @param {Object} [options]
   * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
   * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the number of affected documents as the second.
   */
  upsert(selector, modifier, options, callback) {
    if (!callback && typeof options === "function") {
      callback = options;
      options = {};
    }

    return this.update(selector, modifier, (0, _objectSpread2.default)({}, options, {
      _returnObject: true,
      upsert: true
    }), callback);
  },

  // We'll actually design an index API later. For now, we just pass through to
  // Mongo's, but make it synchronous.
  _ensureIndex(index, options) {
    var self = this;
    if (!self._collection._ensureIndex) throw new Error("Can only call _ensureIndex on server collections");

    self._collection._ensureIndex(index, options);
  },

  _dropIndex(index) {
    var self = this;
    if (!self._collection._dropIndex) throw new Error("Can only call _dropIndex on server collections");

    self._collection._dropIndex(index);
  },

  _dropCollection() {
    var self = this;
    if (!self._collection.dropCollection) throw new Error("Can only call _dropCollection on server collections");

    self._collection.dropCollection();
  },

  _createCappedCollection(byteSize, maxDocuments) {
    var self = this;
    if (!self._collection._createCappedCollection) throw new Error("Can only call _createCappedCollection on server collections");

    self._collection._createCappedCollection(byteSize, maxDocuments);
  },

  /**
   * @summary Returns the [`Collection`](http://mongodb.github.io/node-mongodb-native/3.0/api/Collection.html) object corresponding to this collection from the [npm `mongodb` driver module](https://www.npmjs.com/package/mongodb) which is wrapped by `Mongo.Collection`.
   * @locus Server
   * @memberof Mongo.Collection
   * @instance
   */
  rawCollection() {
    var self = this;

    if (!self._collection.rawCollection) {
      throw new Error("Can only call rawCollection on server collections");
    }

    return self._collection.rawCollection();
  },

  /**
   * @summary Returns the [`Db`](http://mongodb.github.io/node-mongodb-native/3.0/api/Db.html) object corresponding to this collection's database connection from the [npm `mongodb` driver module](https://www.npmjs.com/package/mongodb) which is wrapped by `Mongo.Collection`.
   * @locus Server
   * @memberof Mongo.Collection
   * @instance
   */
  rawDatabase() {
    var self = this;

    if (!(self._driver.mongo && self._driver.mongo.db)) {
      throw new Error("Can only call rawDatabase on server collections");
    }

    return self._driver.mongo.db;
  }

}); // Convert the callback to not return a result if there is an error

function wrapCallback(callback, convertResult) {
  return callback && function (error, result) {
    if (error) {
      callback(error);
    } else if (typeof convertResult === "function") {
      callback(error, convertResult(result));
    } else {
      callback(error, result);
    }
  };
}
/**
 * @summary Create a Mongo-style `ObjectID`.  If you don't specify a `hexString`, the `ObjectID` will generated randomly (not using MongoDB's ID construction rules).
 * @locus Anywhere
 * @class
 * @param {String} [hexString] Optional.  The 24-character hexadecimal contents of the ObjectID to create
 */


Mongo.ObjectID = MongoID.ObjectID;
/**
 * @summary To create a cursor, use find. To access the documents in a cursor, use forEach, map, or fetch.
 * @class
 * @instanceName cursor
 */

Mongo.Cursor = LocalCollection.Cursor;
/**
 * @deprecated in 0.9.1
 */

Mongo.Collection.Cursor = Mongo.Cursor;
/**
 * @deprecated in 0.9.1
 */

Mongo.Collection.ObjectID = Mongo.ObjectID;
/**
 * @deprecated in 0.9.1
 */

Meteor.Collection = Mongo.Collection; // Allow deny stuff is now in the allow-deny package

Object.assign(Meteor.Collection.prototype, AllowDeny.CollectionPrototype);

function popCallbackFromArgs(args) {
  // Pull off any callback (or perhaps a 'callback' variable that was passed
  // in undefined, like how 'upsert' does it).
  if (args.length && (args[args.length - 1] === undefined || args[args.length - 1] instanceof Function)) {
    return args.pop();
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"connection_options.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/connection_options.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * @summary Allows for user specified connection options
 * @example http://mongodb.github.io/node-mongodb-native/3.0/reference/connecting/connection-settings/
 * @locus Server
 * @param {Object} options User specified Mongo connection options
 */
Mongo.setConnectionOptions = function setConnectionOptions(options) {
  check(options, Object);
  Mongo._connectionOptions = options;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/mongo/mongo_driver.js");
require("/node_modules/meteor/mongo/oplog_tailing.js");
require("/node_modules/meteor/mongo/observe_multiplex.js");
require("/node_modules/meteor/mongo/doc_fetcher.js");
require("/node_modules/meteor/mongo/polling_observe_driver.js");
require("/node_modules/meteor/mongo/oplog_observe_driver.js");
require("/node_modules/meteor/mongo/local_collection_driver.js");
require("/node_modules/meteor/mongo/remote_collection_driver.js");
require("/node_modules/meteor/mongo/collection.js");
require("/node_modules/meteor/mongo/connection_options.js");

/* Exports */
Package._define("mongo", {
  MongoInternals: MongoInternals,
  MongoTest: MongoTest,
  Mongo: Mongo
});

})();

//# sourceURL=meteor://💻app/packages/mongo.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vbW9uZ29fZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9vcGxvZ190YWlsaW5nLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9vYnNlcnZlX211bHRpcGxleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vZG9jX2ZldGNoZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL3BvbGxpbmdfb2JzZXJ2ZV9kcml2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL29wbG9nX29ic2VydmVfZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9sb2NhbF9jb2xsZWN0aW9uX2RyaXZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vcmVtb3RlX2NvbGxlY3Rpb25fZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9jb2xsZWN0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9jb25uZWN0aW9uX29wdGlvbnMuanMiXSwibmFtZXMiOlsiTW9uZ29EQiIsIk5wbU1vZHVsZU1vbmdvZGIiLCJGdXR1cmUiLCJOcG0iLCJyZXF1aXJlIiwiTW9uZ29JbnRlcm5hbHMiLCJNb25nb1Rlc3QiLCJOcG1Nb2R1bGVzIiwibW9uZ29kYiIsInZlcnNpb24iLCJOcG1Nb2R1bGVNb25nb2RiVmVyc2lvbiIsIm1vZHVsZSIsIk5wbU1vZHVsZSIsInJlcGxhY2VOYW1lcyIsImZpbHRlciIsInRoaW5nIiwiXyIsImlzQXJyYXkiLCJtYXAiLCJiaW5kIiwicmV0IiwiZWFjaCIsInZhbHVlIiwia2V5IiwiVGltZXN0YW1wIiwicHJvdG90eXBlIiwiY2xvbmUiLCJtYWtlTW9uZ29MZWdhbCIsIm5hbWUiLCJ1bm1ha2VNb25nb0xlZ2FsIiwic3Vic3RyIiwicmVwbGFjZU1vbmdvQXRvbVdpdGhNZXRlb3IiLCJkb2N1bWVudCIsIkJpbmFyeSIsImJ1ZmZlciIsIlVpbnQ4QXJyYXkiLCJPYmplY3RJRCIsIk1vbmdvIiwidG9IZXhTdHJpbmciLCJEZWNpbWFsMTI4IiwiRGVjaW1hbCIsInRvU3RyaW5nIiwic2l6ZSIsIkVKU09OIiwiZnJvbUpTT05WYWx1ZSIsInVuZGVmaW5lZCIsInJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvIiwiaXNCaW5hcnkiLCJCdWZmZXIiLCJmcm9tIiwiZnJvbVN0cmluZyIsIl9pc0N1c3RvbVR5cGUiLCJ0b0pTT05WYWx1ZSIsInJlcGxhY2VUeXBlcyIsImF0b21UcmFuc2Zvcm1lciIsInJlcGxhY2VkVG9wTGV2ZWxBdG9tIiwidmFsIiwidmFsUmVwbGFjZWQiLCJNb25nb0Nvbm5lY3Rpb24iLCJ1cmwiLCJvcHRpb25zIiwic2VsZiIsIl9vYnNlcnZlTXVsdGlwbGV4ZXJzIiwiX29uRmFpbG92ZXJIb29rIiwiSG9vayIsIm1vbmdvT3B0aW9ucyIsIk9iamVjdCIsImFzc2lnbiIsImF1dG9SZWNvbm5lY3QiLCJyZWNvbm5lY3RUcmllcyIsIkluZmluaXR5IiwiaWdub3JlVW5kZWZpbmVkIiwidXNlTmV3VXJsUGFyc2VyIiwiX2Nvbm5lY3Rpb25PcHRpb25zIiwidGVzdCIsIm5hdGl2ZV9wYXJzZXIiLCJoYXMiLCJwb29sU2l6ZSIsImRiIiwiX3ByaW1hcnkiLCJfb3Bsb2dIYW5kbGUiLCJfZG9jRmV0Y2hlciIsImNvbm5lY3RGdXR1cmUiLCJjb25uZWN0IiwiTWV0ZW9yIiwiYmluZEVudmlyb25tZW50IiwiZXJyIiwiY2xpZW50Iiwic2VydmVyQ29uZmlnIiwiaXNNYXN0ZXJEb2MiLCJwcmltYXJ5Iiwib24iLCJraW5kIiwiZG9jIiwiY2FsbGJhY2siLCJtZSIsInJlc29sdmVyIiwid2FpdCIsIm9wbG9nVXJsIiwiUGFja2FnZSIsIk9wbG9nSGFuZGxlIiwiZGF0YWJhc2VOYW1lIiwiRG9jRmV0Y2hlciIsImNsb3NlIiwiRXJyb3IiLCJvcGxvZ0hhbmRsZSIsInN0b3AiLCJ3cmFwIiwicmF3Q29sbGVjdGlvbiIsImNvbGxlY3Rpb25OYW1lIiwiZnV0dXJlIiwiY29sbGVjdGlvbiIsIl9jcmVhdGVDYXBwZWRDb2xsZWN0aW9uIiwiYnl0ZVNpemUiLCJtYXhEb2N1bWVudHMiLCJjcmVhdGVDb2xsZWN0aW9uIiwiY2FwcGVkIiwibWF4IiwiX21heWJlQmVnaW5Xcml0ZSIsImZlbmNlIiwiRERQU2VydmVyIiwiX0N1cnJlbnRXcml0ZUZlbmNlIiwiZ2V0IiwiYmVnaW5Xcml0ZSIsImNvbW1pdHRlZCIsIl9vbkZhaWxvdmVyIiwicmVnaXN0ZXIiLCJ3cml0ZUNhbGxiYWNrIiwid3JpdGUiLCJyZWZyZXNoIiwicmVzdWx0IiwicmVmcmVzaEVyciIsImJpbmRFbnZpcm9ubWVudEZvcldyaXRlIiwiX2luc2VydCIsImNvbGxlY3Rpb25fbmFtZSIsInNlbmRFcnJvciIsImUiLCJfZXhwZWN0ZWRCeVRlc3QiLCJMb2NhbENvbGxlY3Rpb24iLCJfaXNQbGFpbk9iamVjdCIsImlkIiwiX2lkIiwiaW5zZXJ0Iiwic2FmZSIsIl9yZWZyZXNoIiwic2VsZWN0b3IiLCJyZWZyZXNoS2V5Iiwic3BlY2lmaWNJZHMiLCJfaWRzTWF0Y2hlZEJ5U2VsZWN0b3IiLCJleHRlbmQiLCJfcmVtb3ZlIiwid3JhcHBlZENhbGxiYWNrIiwiZHJpdmVyUmVzdWx0IiwidHJhbnNmb3JtUmVzdWx0IiwibnVtYmVyQWZmZWN0ZWQiLCJyZW1vdmUiLCJfZHJvcENvbGxlY3Rpb24iLCJjYiIsImRyb3BDb2xsZWN0aW9uIiwiZHJvcCIsIl9kcm9wRGF0YWJhc2UiLCJkcm9wRGF0YWJhc2UiLCJfdXBkYXRlIiwibW9kIiwiRnVuY3Rpb24iLCJtb25nb09wdHMiLCJ1cHNlcnQiLCJtdWx0aSIsImZ1bGxSZXN1bHQiLCJtb25nb1NlbGVjdG9yIiwibW9uZ29Nb2QiLCJpc01vZGlmeSIsIl9pc01vZGlmaWNhdGlvbk1vZCIsIl9mb3JiaWRSZXBsYWNlIiwia25vd25JZCIsIm5ld0RvYyIsIl9jcmVhdGVVcHNlcnREb2N1bWVudCIsImluc2VydGVkSWQiLCJnZW5lcmF0ZWRJZCIsInNpbXVsYXRlVXBzZXJ0V2l0aEluc2VydGVkSWQiLCJlcnJvciIsIl9yZXR1cm5PYmplY3QiLCJoYXNPd25Qcm9wZXJ0eSIsIiRzZXRPbkluc2VydCIsInVwZGF0ZSIsIm1ldGVvclJlc3VsdCIsIm1vbmdvUmVzdWx0IiwidXBzZXJ0ZWQiLCJsZW5ndGgiLCJuIiwiTlVNX09QVElNSVNUSUNfVFJJRVMiLCJfaXNDYW5ub3RDaGFuZ2VJZEVycm9yIiwiZXJybXNnIiwiaW5kZXhPZiIsIm1vbmdvT3B0c0ZvclVwZGF0ZSIsIm1vbmdvT3B0c0Zvckluc2VydCIsInJlcGxhY2VtZW50V2l0aElkIiwidHJpZXMiLCJkb1VwZGF0ZSIsImRvQ29uZGl0aW9uYWxJbnNlcnQiLCJtZXRob2QiLCJ3cmFwQXN5bmMiLCJhcHBseSIsImFyZ3VtZW50cyIsImZpbmQiLCJDdXJzb3IiLCJDdXJzb3JEZXNjcmlwdGlvbiIsImZpbmRPbmUiLCJsaW1pdCIsImZldGNoIiwiX2Vuc3VyZUluZGV4IiwiaW5kZXgiLCJpbmRleE5hbWUiLCJlbnN1cmVJbmRleCIsIl9kcm9wSW5kZXgiLCJkcm9wSW5kZXgiLCJDb2xsZWN0aW9uIiwiX3Jld3JpdGVTZWxlY3RvciIsIm1vbmdvIiwiY3Vyc29yRGVzY3JpcHRpb24iLCJfbW9uZ28iLCJfY3Vyc29yRGVzY3JpcHRpb24iLCJfc3luY2hyb25vdXNDdXJzb3IiLCJTeW1ib2wiLCJpdGVyYXRvciIsInRhaWxhYmxlIiwiX2NyZWF0ZVN5bmNocm9ub3VzQ3Vyc29yIiwic2VsZkZvckl0ZXJhdGlvbiIsInVzZVRyYW5zZm9ybSIsInJld2luZCIsImdldFRyYW5zZm9ybSIsInRyYW5zZm9ybSIsIl9wdWJsaXNoQ3Vyc29yIiwic3ViIiwiX2dldENvbGxlY3Rpb25OYW1lIiwib2JzZXJ2ZSIsImNhbGxiYWNrcyIsIl9vYnNlcnZlRnJvbU9ic2VydmVDaGFuZ2VzIiwib2JzZXJ2ZUNoYW5nZXMiLCJtZXRob2RzIiwib3JkZXJlZCIsIl9vYnNlcnZlQ2hhbmdlc0NhbGxiYWNrc0FyZU9yZGVyZWQiLCJleGNlcHRpb25OYW1lIiwiZm9yRWFjaCIsIl9vYnNlcnZlQ2hhbmdlcyIsInBpY2siLCJjdXJzb3JPcHRpb25zIiwic29ydCIsInNraXAiLCJwcm9qZWN0aW9uIiwiZmllbGRzIiwiYXdhaXRkYXRhIiwibnVtYmVyT2ZSZXRyaWVzIiwiT1BMT0dfQ09MTEVDVElPTiIsInRzIiwib3Bsb2dSZXBsYXkiLCJkYkN1cnNvciIsIm1heFRpbWVNcyIsIm1heFRpbWVNUyIsImhpbnQiLCJTeW5jaHJvbm91c0N1cnNvciIsIl9kYkN1cnNvciIsIl9zZWxmRm9ySXRlcmF0aW9uIiwiX3RyYW5zZm9ybSIsIndyYXBUcmFuc2Zvcm0iLCJfc3luY2hyb25vdXNDb3VudCIsImNvdW50IiwiX3Zpc2l0ZWRJZHMiLCJfSWRNYXAiLCJfcmF3TmV4dE9iamVjdFByb21pc2UiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsIm5leHQiLCJfbmV4dE9iamVjdFByb21pc2UiLCJzZXQiLCJfbmV4dE9iamVjdFByb21pc2VXaXRoVGltZW91dCIsInRpbWVvdXRNUyIsIm5leHRPYmplY3RQcm9taXNlIiwidGltZW91dEVyciIsInRpbWVvdXRQcm9taXNlIiwidGltZXIiLCJzZXRUaW1lb3V0IiwicmFjZSIsImNhdGNoIiwiX25leHRPYmplY3QiLCJhd2FpdCIsInRoaXNBcmciLCJfcmV3aW5kIiwiY2FsbCIsInJlcyIsInB1c2giLCJpZGVudGl0eSIsImFwcGx5U2tpcExpbWl0IiwiZ2V0UmF3T2JqZWN0cyIsInJlc3VsdHMiLCJkb25lIiwidGFpbCIsImRvY0NhbGxiYWNrIiwiY3Vyc29yIiwic3RvcHBlZCIsImxhc3RUUyIsImxvb3AiLCJuZXdTZWxlY3RvciIsIiRndCIsImRlZmVyIiwiX29ic2VydmVDaGFuZ2VzVGFpbGFibGUiLCJvYnNlcnZlS2V5Iiwic3RyaW5naWZ5IiwibXVsdGlwbGV4ZXIiLCJvYnNlcnZlRHJpdmVyIiwiZmlyc3RIYW5kbGUiLCJfbm9ZaWVsZHNBbGxvd2VkIiwiT2JzZXJ2ZU11bHRpcGxleGVyIiwib25TdG9wIiwib2JzZXJ2ZUhhbmRsZSIsIk9ic2VydmVIYW5kbGUiLCJtYXRjaGVyIiwic29ydGVyIiwiY2FuVXNlT3Bsb2ciLCJhbGwiLCJfdGVzdE9ubHlQb2xsQ2FsbGJhY2siLCJNaW5pbW9uZ28iLCJNYXRjaGVyIiwiT3Bsb2dPYnNlcnZlRHJpdmVyIiwiY3Vyc29yU3VwcG9ydGVkIiwiU29ydGVyIiwiZiIsImRyaXZlckNsYXNzIiwiUG9sbGluZ09ic2VydmVEcml2ZXIiLCJtb25nb0hhbmRsZSIsIl9vYnNlcnZlRHJpdmVyIiwiYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzIiwibGlzdGVuQWxsIiwibGlzdGVuQ2FsbGJhY2siLCJsaXN0ZW5lcnMiLCJmb3JFYWNoVHJpZ2dlciIsInRyaWdnZXIiLCJfSW52YWxpZGF0aW9uQ3Jvc3NiYXIiLCJsaXN0ZW4iLCJsaXN0ZW5lciIsInRyaWdnZXJDYWxsYmFjayIsImFkZGVkQmVmb3JlIiwiYWRkZWQiLCJNb25nb1RpbWVzdGFtcCIsIkNvbm5lY3Rpb24iLCJUT09fRkFSX0JFSElORCIsInByb2Nlc3MiLCJlbnYiLCJNRVRFT1JfT1BMT0dfVE9PX0ZBUl9CRUhJTkQiLCJUQUlMX1RJTUVPVVQiLCJNRVRFT1JfT1BMT0dfVEFJTF9USU1FT1VUIiwic2hvd1RTIiwiZ2V0SGlnaEJpdHMiLCJnZXRMb3dCaXRzIiwiaWRGb3JPcCIsIm9wIiwibyIsIm8yIiwiZGJOYW1lIiwiX29wbG9nVXJsIiwiX2RiTmFtZSIsIl9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb24iLCJfb3Bsb2dUYWlsQ29ubmVjdGlvbiIsIl9zdG9wcGVkIiwiX3RhaWxIYW5kbGUiLCJfcmVhZHlGdXR1cmUiLCJfY3Jvc3NiYXIiLCJfQ3Jvc3NiYXIiLCJmYWN0UGFja2FnZSIsImZhY3ROYW1lIiwiX2Jhc2VPcGxvZ1NlbGVjdG9yIiwibnMiLCJSZWdFeHAiLCJfZXNjYXBlUmVnRXhwIiwiam9pbiIsIiRvciIsIiRpbiIsIiRleGlzdHMiLCJfY2F0Y2hpbmdVcEZ1dHVyZXMiLCJfbGFzdFByb2Nlc3NlZFRTIiwiX29uU2tpcHBlZEVudHJpZXNIb29rIiwiZGVidWdQcmludEV4Y2VwdGlvbnMiLCJfZW50cnlRdWV1ZSIsIl9Eb3VibGVFbmRlZFF1ZXVlIiwiX3dvcmtlckFjdGl2ZSIsIl9zdGFydFRhaWxpbmciLCJvbk9wbG9nRW50cnkiLCJvcmlnaW5hbENhbGxiYWNrIiwibm90aWZpY2F0aW9uIiwiX2RlYnVnIiwibGlzdGVuSGFuZGxlIiwib25Ta2lwcGVkRW50cmllcyIsIndhaXRVbnRpbENhdWdodFVwIiwibGFzdEVudHJ5IiwiJG5hdHVyYWwiLCJfc2xlZXBGb3JNcyIsImxlc3NUaGFuT3JFcXVhbCIsImluc2VydEFmdGVyIiwiZ3JlYXRlclRoYW4iLCJzcGxpY2UiLCJtb25nb2RiVXJpIiwicGFyc2UiLCJkYXRhYmFzZSIsImFkbWluIiwiY29tbWFuZCIsImlzbWFzdGVyIiwic2V0TmFtZSIsImxhc3RPcGxvZ0VudHJ5Iiwib3Bsb2dTZWxlY3RvciIsIl9tYXliZVN0YXJ0V29ya2VyIiwicmV0dXJuIiwiaGFuZGxlRG9jIiwiYXBwbHlPcHMiLCJzdGFydHNXaXRoIiwic2xpY2UiLCJmaXJlIiwiaXNFbXB0eSIsInBvcCIsImNsZWFyIiwiX3NldExhc3RQcm9jZXNzZWRUUyIsInNoaWZ0Iiwic2VxdWVuY2VyIiwiX2RlZmluZVRvb0ZhckJlaGluZCIsIl9yZXNldFRvb0ZhckJlaGluZCIsIkZhY3RzIiwiaW5jcmVtZW50U2VydmVyRmFjdCIsIl9vcmRlcmVkIiwiX29uU3RvcCIsIl9xdWV1ZSIsIl9TeW5jaHJvbm91c1F1ZXVlIiwiX2hhbmRsZXMiLCJfY2FjaGUiLCJfQ2FjaGluZ0NoYW5nZU9ic2VydmVyIiwiX2FkZEhhbmRsZVRhc2tzU2NoZWR1bGVkQnV0Tm90UGVyZm9ybWVkIiwiY2FsbGJhY2tOYW1lcyIsImNhbGxiYWNrTmFtZSIsIl9hcHBseUNhbGxiYWNrIiwidG9BcnJheSIsImhhbmRsZSIsInNhZmVUb1J1blRhc2siLCJydW5UYXNrIiwiX3NlbmRBZGRzIiwicmVtb3ZlSGFuZGxlIiwiX3JlYWR5IiwiX3N0b3AiLCJmcm9tUXVlcnlFcnJvciIsInJlYWR5IiwicXVldWVUYXNrIiwicXVlcnlFcnJvciIsInRocm93Iiwib25GbHVzaCIsImlzUmVzb2x2ZWQiLCJhcmdzIiwiYXBwbHlDaGFuZ2UiLCJrZXlzIiwiaGFuZGxlSWQiLCJhZGQiLCJfYWRkZWRCZWZvcmUiLCJfYWRkZWQiLCJkb2NzIiwibmV4dE9ic2VydmVIYW5kbGVJZCIsIl9tdWx0aXBsZXhlciIsImJlZm9yZSIsIkZpYmVyIiwibW9uZ29Db25uZWN0aW9uIiwiX21vbmdvQ29ubmVjdGlvbiIsIl9jYWxsYmFja3NGb3JDYWNoZUtleSIsImNhY2hlS2V5IiwiY2hlY2siLCJTdHJpbmciLCJjbG9uZWREb2MiLCJydW4iLCJQT0xMSU5HX1RIUk9UVExFX01TIiwiTUVURU9SX1BPTExJTkdfVEhST1RUTEVfTVMiLCJQT0xMSU5HX0lOVEVSVkFMX01TIiwiTUVURU9SX1BPTExJTkdfSU5URVJWQUxfTVMiLCJfbW9uZ29IYW5kbGUiLCJfc3RvcENhbGxiYWNrcyIsIl9yZXN1bHRzIiwiX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCIsIl9wZW5kaW5nV3JpdGVzIiwiX2Vuc3VyZVBvbGxJc1NjaGVkdWxlZCIsInRocm90dGxlIiwiX3VudGhyb3R0bGVkRW5zdXJlUG9sbElzU2NoZWR1bGVkIiwicG9sbGluZ1Rocm90dGxlTXMiLCJfdGFza1F1ZXVlIiwibGlzdGVuZXJzSGFuZGxlIiwicG9sbGluZ0ludGVydmFsIiwicG9sbGluZ0ludGVydmFsTXMiLCJfcG9sbGluZ0ludGVydmFsIiwiaW50ZXJ2YWxIYW5kbGUiLCJzZXRJbnRlcnZhbCIsImNsZWFySW50ZXJ2YWwiLCJfcG9sbE1vbmdvIiwiX3N1c3BlbmRQb2xsaW5nIiwiX3Jlc3VtZVBvbGxpbmciLCJmaXJzdCIsIm5ld1Jlc3VsdHMiLCJvbGRSZXN1bHRzIiwid3JpdGVzRm9yQ3ljbGUiLCJjb2RlIiwiSlNPTiIsIm1lc3NhZ2UiLCJBcnJheSIsIl9kaWZmUXVlcnlDaGFuZ2VzIiwidyIsImMiLCJQSEFTRSIsIlFVRVJZSU5HIiwiRkVUQ0hJTkciLCJTVEVBRFkiLCJTd2l0Y2hlZFRvUXVlcnkiLCJmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeSIsImN1cnJlbnRJZCIsIl91c2VzT3Bsb2ciLCJjb21wYXJhdG9yIiwiZ2V0Q29tcGFyYXRvciIsImhlYXBPcHRpb25zIiwiSWRNYXAiLCJfbGltaXQiLCJfY29tcGFyYXRvciIsIl9zb3J0ZXIiLCJfdW5wdWJsaXNoZWRCdWZmZXIiLCJNaW5NYXhIZWFwIiwiX3B1Ymxpc2hlZCIsIk1heEhlYXAiLCJfc2FmZUFwcGVuZFRvQnVmZmVyIiwiX3N0b3BIYW5kbGVzIiwiX3JlZ2lzdGVyUGhhc2VDaGFuZ2UiLCJfbWF0Y2hlciIsIl9wcm9qZWN0aW9uRm4iLCJfY29tcGlsZVByb2plY3Rpb24iLCJfc2hhcmVkUHJvamVjdGlvbiIsImNvbWJpbmVJbnRvUHJvamVjdGlvbiIsIl9zaGFyZWRQcm9qZWN0aW9uRm4iLCJfbmVlZFRvRmV0Y2giLCJfY3VycmVudGx5RmV0Y2hpbmciLCJfZmV0Y2hHZW5lcmF0aW9uIiwiX3JlcXVlcnlXaGVuRG9uZVRoaXNRdWVyeSIsIl93cml0ZXNUb0NvbW1pdFdoZW5XZVJlYWNoU3RlYWR5IiwiX25lZWRUb1BvbGxRdWVyeSIsIl9waGFzZSIsIl9oYW5kbGVPcGxvZ0VudHJ5UXVlcnlpbmciLCJfaGFuZGxlT3Bsb2dFbnRyeVN0ZWFkeU9yRmV0Y2hpbmciLCJmaXJlZCIsIl9vcGxvZ09ic2VydmVEcml2ZXJzIiwib25CZWZvcmVGaXJlIiwiZHJpdmVycyIsImRyaXZlciIsIl9ydW5Jbml0aWFsUXVlcnkiLCJfYWRkUHVibGlzaGVkIiwib3ZlcmZsb3dpbmdEb2NJZCIsIm1heEVsZW1lbnRJZCIsIm92ZXJmbG93aW5nRG9jIiwiZXF1YWxzIiwicmVtb3ZlZCIsIl9hZGRCdWZmZXJlZCIsIl9yZW1vdmVQdWJsaXNoZWQiLCJlbXB0eSIsIm5ld0RvY0lkIiwibWluRWxlbWVudElkIiwiX3JlbW92ZUJ1ZmZlcmVkIiwiX2NoYW5nZVB1Ymxpc2hlZCIsIm9sZERvYyIsInByb2plY3RlZE5ldyIsInByb2plY3RlZE9sZCIsImNoYW5nZWQiLCJEaWZmU2VxdWVuY2UiLCJtYWtlQ2hhbmdlZEZpZWxkcyIsIm1heEJ1ZmZlcmVkSWQiLCJfYWRkTWF0Y2hpbmciLCJtYXhQdWJsaXNoZWQiLCJtYXhCdWZmZXJlZCIsInRvUHVibGlzaCIsImNhbkFwcGVuZFRvQnVmZmVyIiwiY2FuSW5zZXJ0SW50b0J1ZmZlciIsInRvQnVmZmVyIiwiX3JlbW92ZU1hdGNoaW5nIiwiX2hhbmRsZURvYyIsIm1hdGNoZXNOb3ciLCJkb2N1bWVudE1hdGNoZXMiLCJwdWJsaXNoZWRCZWZvcmUiLCJidWZmZXJlZEJlZm9yZSIsImNhY2hlZEJlZm9yZSIsIm1pbkJ1ZmZlcmVkIiwic3RheXNJblB1Ymxpc2hlZCIsInN0YXlzSW5CdWZmZXIiLCJfZmV0Y2hNb2RpZmllZERvY3VtZW50cyIsInRoaXNHZW5lcmF0aW9uIiwid2FpdGluZyIsImZ1dCIsIl9iZVN0ZWFkeSIsIndyaXRlcyIsImlzUmVwbGFjZSIsImNhbkRpcmVjdGx5TW9kaWZ5RG9jIiwibW9kaWZpZXJDYW5CZURpcmVjdGx5QXBwbGllZCIsIl9tb2RpZnkiLCJjYW5CZWNvbWVUcnVlQnlNb2RpZmllciIsImFmZmVjdGVkQnlNb2RpZmllciIsIl9ydW5RdWVyeSIsImluaXRpYWwiLCJfZG9uZVF1ZXJ5aW5nIiwiX3BvbGxRdWVyeSIsIm5ld0J1ZmZlciIsIl9jdXJzb3JGb3JRdWVyeSIsImkiLCJfcHVibGlzaE5ld1Jlc3VsdHMiLCJvcHRpb25zT3ZlcndyaXRlIiwiZGVzY3JpcHRpb24iLCJpZHNUb1JlbW92ZSIsImNvbnNvbGUiLCJfb3Bsb2dFbnRyeUhhbmRsZSIsIl9saXN0ZW5lcnNIYW5kbGUiLCJwaGFzZSIsIm5vdyIsIkRhdGUiLCJ0aW1lRGlmZiIsIl9waGFzZVN0YXJ0VGltZSIsImRpc2FibGVPcGxvZyIsIl9kaXNhYmxlT3Bsb2ciLCJfY2hlY2tTdXBwb3J0ZWRQcm9qZWN0aW9uIiwiaGFzV2hlcmUiLCJoYXNHZW9RdWVyeSIsIm1vZGlmaWVyIiwib3BlcmF0aW9uIiwiZmllbGQiLCJleHBvcnQiLCJMb2NhbENvbGxlY3Rpb25Ecml2ZXIiLCJjb25zdHJ1Y3RvciIsIm5vQ29ubkNvbGxlY3Rpb25zIiwiY3JlYXRlIiwib3BlbiIsImNvbm4iLCJlbnN1cmVDb2xsZWN0aW9uIiwiX21vbmdvX2xpdmVkYXRhX2NvbGxlY3Rpb25zIiwiY29sbGVjdGlvbnMiLCJSZW1vdGVDb2xsZWN0aW9uRHJpdmVyIiwibW9uZ29fdXJsIiwibSIsImRlZmF1bHRSZW1vdGVDb2xsZWN0aW9uRHJpdmVyIiwib25jZSIsImNvbm5lY3Rpb25PcHRpb25zIiwibW9uZ29VcmwiLCJNT05HT19VUkwiLCJNT05HT19PUExPR19VUkwiLCJjb25uZWN0aW9uIiwibWFuYWdlciIsImlkR2VuZXJhdGlvbiIsIl9kcml2ZXIiLCJfcHJldmVudEF1dG9wdWJsaXNoIiwiX21ha2VOZXdJRCIsInNyYyIsIkREUCIsInJhbmRvbVN0cmVhbSIsIlJhbmRvbSIsImluc2VjdXJlIiwiaGV4U3RyaW5nIiwiX2Nvbm5lY3Rpb24iLCJpc0NsaWVudCIsInNlcnZlciIsIl9jb2xsZWN0aW9uIiwiX25hbWUiLCJfbWF5YmVTZXRVcFJlcGxpY2F0aW9uIiwiZGVmaW5lTXV0YXRpb25NZXRob2RzIiwiX2RlZmluZU11dGF0aW9uTWV0aG9kcyIsInVzZUV4aXN0aW5nIiwiX3N1cHByZXNzU2FtZU5hbWVFcnJvciIsImF1dG9wdWJsaXNoIiwicHVibGlzaCIsImlzX2F1dG8iLCJyZWdpc3RlclN0b3JlIiwib2siLCJiZWdpblVwZGF0ZSIsImJhdGNoU2l6ZSIsInJlc2V0IiwicGF1c2VPYnNlcnZlcnMiLCJtc2ciLCJtb25nb0lkIiwiTW9uZ29JRCIsImlkUGFyc2UiLCJyZXBsYWNlIiwiJHVuc2V0IiwiJHNldCIsImVuZFVwZGF0ZSIsInJlc3VtZU9ic2VydmVycyIsInNhdmVPcmlnaW5hbHMiLCJyZXRyaWV2ZU9yaWdpbmFscyIsImdldERvYyIsIl9nZXRDb2xsZWN0aW9uIiwid2FybiIsImxvZyIsIl9nZXRGaW5kU2VsZWN0b3IiLCJfZ2V0RmluZE9wdGlvbnMiLCJNYXRjaCIsIk9wdGlvbmFsIiwiT2JqZWN0SW5jbHVkaW5nIiwiT25lT2YiLCJOdW1iZXIiLCJmYWxsYmFja0lkIiwiX3NlbGVjdG9ySXNJZCIsImdldFByb3RvdHlwZU9mIiwiZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyIsImdlbmVyYXRlSWQiLCJfaXNSZW1vdGVDb2xsZWN0aW9uIiwiZW5jbG9zaW5nIiwiX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uIiwiY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdCIsIndyYXBDYWxsYmFjayIsIl9jYWxsTXV0YXRvck1ldGhvZCIsIm9wdGlvbnNBbmRDYWxsYmFjayIsInBvcENhbGxiYWNrRnJvbUFyZ3MiLCJyYXdEYXRhYmFzZSIsImNvbnZlcnRSZXN1bHQiLCJBbGxvd0RlbnkiLCJDb2xsZWN0aW9uUHJvdG90eXBlIiwic2V0Q29ubmVjdGlvbk9wdGlvbnMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7Ozs7Ozs7QUFTQSxJQUFJQSxPQUFPLEdBQUdDLGdCQUFkOztBQUNBLElBQUlDLE1BQU0sR0FBR0MsR0FBRyxDQUFDQyxPQUFKLENBQVksZUFBWixDQUFiOztBQUVBQyxjQUFjLEdBQUcsRUFBakI7QUFDQUMsU0FBUyxHQUFHLEVBQVo7QUFFQUQsY0FBYyxDQUFDRSxVQUFmLEdBQTRCO0FBQzFCQyxTQUFPLEVBQUU7QUFDUEMsV0FBTyxFQUFFQyx1QkFERjtBQUVQQyxVQUFNLEVBQUVYO0FBRkQ7QUFEaUIsQ0FBNUIsQyxDQU9BO0FBQ0E7QUFDQTtBQUNBOztBQUNB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Ozs7OztBQU1BN1gsS0FBSyxDQUFDdXFCLG9CQUFOLEdBQTZCLFNBQVNBLG9CQUFULENBQStCaHBCLE9BQS9CLEVBQXdDO0FBQ25FeVosT0FBSyxDQUFDelosT0FBRCxFQUFVTSxNQUFWLENBQUw7QUFDQTdCLE9BQUssQ0FBQ29DLGtCQUFOLEdBQTJCYixPQUEzQjtBQUNELENBSEQsQyIsImZpbGUiOiIvcGFja2FnZXMvbW9uZ28uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFByb3ZpZGUgYSBzeW5jaHJvbm91cyBDb2xsZWN0aW9uIEFQSSB1c2luZyBmaWJlcnMsIGJhY2tlZCBieVxuICogTW9uZ29EQi4gIFRoaXMgaXMgb25seSBmb3IgdXNlIG9uIHRoZSBzZXJ2ZXIsIGFuZCBtb3N0bHkgaWRlbnRpY2FsXG4gKiB0byB0aGUgY2xpZW50IEFQSS5cbiAqXG4gKiBOT1RFOiB0aGUgcHVibGljIEFQSSBtZXRob2RzIG11c3QgYmUgcnVuIHdpdGhpbiBhIGZpYmVyLiBJZiB5b3UgY2FsbFxuICogdGhlc2Ugb3V0c2lkZSBvZiBhIGZpYmVyIHRoZXkgd2lsbCBleHBsb2RlIVxuICovXG5cbnZhciBNb25nb0RCID0gTnBtTW9kdWxlTW9uZ29kYjtcbnZhciBGdXR1cmUgPSBOcG0ucmVxdWlyZSgnZmliZXJzL2Z1dHVyZScpO1xuXG5Nb25nb0ludGVybmFscyA9IHt9O1xuTW9uZ29UZXN0ID0ge307XG5cbk1vbmdvSW50ZXJuYWxzLk5wbU1vZHVsZXMgPSB7XG4gIG1vbmdvZGI6IHtcbiAgICB2ZXJzaW9uOiBOcG1Nb2R1bGVNb25nb2RiVmVyc2lvbixcbiAgICBtb2R1bGU6IE1vbmdvREJcbiAgfVxufTtcblxuLy8gT2xkZXIgdmVyc2lvbiBvZiB3aGF0IGlzIG5vdyBhdmFpbGFibGUgdmlhXG4vLyBNb25nb0ludGVybmFscy5OcG1Nb2R1bGVzLm1vbmdvZGIubW9kdWxlLiAgSXQgd2FzIG5ldmVyIGRvY3VtZW50ZWQsIGJ1dFxuLy8gcGVvcGxlIGRvIHVzZSBpdC5cbi8vIFhYWCBDT01QQVQgV0lUSCAxLjAuMy4yXG5Nb25nb0ludGVybmFscy5OcG1Nb2R1bGUgPSBNb25nb0RCO1xuXG4vLyBUaGlzIGlzIHVzZWQgdG8gYWRkIG9yIHJlbW92ZSBFSlNPTiBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgZXZlcnl0aGluZyBuZXN0ZWRcbi8vIGluc2lkZSBhbiBFSlNPTiBjdXN0b20gdHlwZS4gSXQgc2hvdWxkIG9ubHkgYmUgY2FsbGVkIG9uIHB1cmUgSlNPTiFcbnZhciByZXBsYWNlTmFtZXMgPSBmdW5jdGlvbiAoZmlsdGVyLCB0aGluZykge1xuICBpZiAodHlwZW9mIHRoaW5nID09PSBcIm9iamVjdFwiICYmIHRoaW5nICE9PSBudWxsKSB7XG4gICAgaWYgKF8uaXNBcnJheSh0aGluZykpIHtcbiAgICAgIHJldHVybiBfLm1hcCh0aGluZywgXy5iaW5kKHJlcGxhY2VOYW1lcywgbnVsbCwgZmlsdGVyKSk7XG4gICAgfVxuICAgIHZhciByZXQgPSB7fTtcbiAgICBfLmVhY2godGhpbmcsIGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICByZXRbZmlsdGVyKGtleSldID0gcmVwbGFjZU5hbWVzKGZpbHRlciwgdmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXQ7XG4gIH1cbiAgcmV0dXJuIHRoaW5nO1xufTtcblxuLy8gRW5zdXJlIHRoYXQgRUpTT04uY2xvbmUga2VlcHMgYSBUaW1lc3RhbXAgYXMgYSBUaW1lc3RhbXAgKGluc3RlYWQgb2YganVzdFxuLy8gZG9pbmcgYSBzdHJ1Y3R1cmFsIGNsb25lKS5cbi8vIFhYWCBob3cgb2sgaXMgdGhpcz8gd2hhdCBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgY29waWVzIG9mIE1vbmdvREIgbG9hZGVkP1xuTW9uZ29EQi5UaW1lc3RhbXAucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24gKCkge1xuICAvLyBUaW1lc3RhbXBzIHNob3VsZCBiZSBpbW11dGFibGUuXG4gIHJldHVybiB0aGlzO1xufTtcblxudmFyIG1ha2VNb25nb0xlZ2FsID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFwiRUpTT05cIiArIG5hbWU7IH07XG52YXIgdW5tYWtlTW9uZ29MZWdhbCA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBuYW1lLnN1YnN0cig1KTsgfTtcblxudmFyIHJlcGxhY2VNb25nb0F0b21XaXRoTWV0ZW9yID0gZnVuY3Rpb24gKGRvY3VtZW50KSB7XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIE1vbmdvREIuQmluYXJ5KSB7XG4gICAgdmFyIGJ1ZmZlciA9IGRvY3VtZW50LnZhbHVlKHRydWUpO1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShidWZmZXIpO1xuICB9XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIE1vbmdvREIuT2JqZWN0SUQpIHtcbiAgICByZXR1cm4gbmV3IE1vbmdvLk9iamVjdElEKGRvY3VtZW50LnRvSGV4U3RyaW5nKCkpO1xuICB9XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIE1vbmdvREIuRGVjaW1hbDEyOCkge1xuICAgIHJldHVybiBEZWNpbWFsKGRvY3VtZW50LnRvU3RyaW5nKCkpO1xuICB9XG4gIGlmIChkb2N1bWVudFtcIkVKU09OJHR5cGVcIl0gJiYgZG9jdW1lbnRbXCJFSlNPTiR2YWx1ZVwiXSAmJiBfLnNpemUoZG9jdW1lbnQpID09PSAyKSB7XG4gICAgcmV0dXJuIEVKU09OLmZyb21KU09OVmFsdWUocmVwbGFjZU5hbWVzKHVubWFrZU1vbmdvTGVnYWwsIGRvY3VtZW50KSk7XG4gIH1cbiAgaWYgKGRvY3VtZW50IGluc3RhbmNlb2YgTW9uZ29EQi5UaW1lc3RhbXApIHtcbiAgICAvLyBGb3Igbm93LCB0aGUgTWV0ZW9yIHJlcHJlc2VudGF0aW9uIG9mIGEgTW9uZ28gdGltZXN0YW1wIHR5cGUgKG5vdCBhIGRhdGUhXG4gICAgLy8gdGhpcyBpcyBhIHdlaXJkIGludGVybmFsIHRoaW5nIHVzZWQgaW4gdGhlIG9wbG9nISkgaXMgdGhlIHNhbWUgYXMgdGhlXG4gICAgLy8gTW9uZ28gcmVwcmVzZW50YXRpb24uIFdlIG5lZWQgdG8gZG8gdGhpcyBleHBsaWNpdGx5IG9yIGVsc2Ugd2Ugd291bGQgZG8gYVxuICAgIC8vIHN0cnVjdHVyYWwgY2xvbmUgYW5kIGxvc2UgdGhlIHByb3RvdHlwZS5cbiAgICByZXR1cm4gZG9jdW1lbnQ7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn07XG5cbnZhciByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyA9IGZ1bmN0aW9uIChkb2N1bWVudCkge1xuICBpZiAoRUpTT04uaXNCaW5hcnkoZG9jdW1lbnQpKSB7XG4gICAgLy8gVGhpcyBkb2VzIG1vcmUgY29waWVzIHRoYW4gd2UnZCBsaWtlLCBidXQgaXMgbmVjZXNzYXJ5IGJlY2F1c2VcbiAgICAvLyBNb25nb0RCLkJTT04gb25seSBsb29rcyBsaWtlIGl0IHRha2VzIGEgVWludDhBcnJheSAoYW5kIGRvZXNuJ3QgYWN0dWFsbHlcbiAgICAvLyBzZXJpYWxpemUgaXQgY29ycmVjdGx5KS5cbiAgICByZXR1cm4gbmV3IE1vbmdvREIuQmluYXJ5KEJ1ZmZlci5mcm9tKGRvY3VtZW50KSk7XG4gIH1cbiAgaWYgKGRvY3VtZW50IGluc3RhbmNlb2YgTW9uZ28uT2JqZWN0SUQpIHtcbiAgICByZXR1cm4gbmV3IE1vbmdvREIuT2JqZWN0SUQoZG9jdW1lbnQudG9IZXhTdHJpbmcoKSk7XG4gIH1cbiAgaWYgKGRvY3VtZW50IGluc3RhbmNlb2YgTW9uZ29EQi5UaW1lc3RhbXApIHtcbiAgICAvLyBGb3Igbm93LCB0aGUgTWV0ZW9yIHJlcHJlc2VudGF0aW9uIG9mIGEgTW9uZ28gdGltZXN0YW1wIHR5cGUgKG5vdCBhIGRhdGUhXG4gICAgLy8gdGhpcyBpcyBhIHdlaXJkIGludGVybmFsIHRoaW5nIHVzZWQgaW4gdGhlIG9wbG9nISkgaXMgdGhlIHNhbWUgYXMgdGhlXG4gICAgLy8gTW9uZ28gcmVwcmVzZW50YXRpb24uIFdlIG5lZWQgdG8gZG8gdGhpcyBleHBsaWNpdGx5IG9yIGVsc2Ugd2Ugd291bGQgZG8gYVxuICAgIC8vIHN0cnVjdHVyYWwgY2xvbmUgYW5kIGxvc2UgdGhlIHByb3RvdHlwZS5cbiAgICByZXR1cm4gZG9jdW1lbnQ7XG4gIH1cbiAgaWYgKGRvY3VtZW50IGluc3RhbmNlb2YgRGVjaW1hbCkge1xuICAgIHJldHVybiBNb25nb0RCLkRlY2ltYWwxMjguZnJvbVN0cmluZyhkb2N1bWVudC50b1N0cmluZygpKTtcbiAgfVxuICBpZiAoRUpTT04uX2lzQ3VzdG9tVHlwZShkb2N1bWVudCkpIHtcbiAgICByZXR1cm4gcmVwbGFjZU5hbWVzKG1ha2VNb25nb0xlZ2FsLCBFSlNPTi50b0pTT05WYWx1ZShkb2N1bWVudCkpO1xuICB9XG4gIC8vIEl0IGlzIG5vdCBvcmRpbmFyaWx5IHBvc3NpYmxlIHRvIHN0aWNrIGRvbGxhci1zaWduIGtleXMgaW50byBtb25nb1xuICAvLyBzbyB3ZSBkb24ndCBib3RoZXIgY2hlY2tpbmcgZm9yIHRoaW5ncyB0aGF0IG5lZWQgZXNjYXBpbmcgYXQgdGhpcyB0aW1lLlxuICByZXR1cm4gdW5kZWZpbmVkO1xufTtcblxudmFyIHJlcGxhY2VUeXBlcyA9IGZ1bmN0aW9uIChkb2N1bWVudCwgYXRvbVRyYW5zZm9ybWVyKSB7XG4gIGlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICdvYmplY3QnIHx8IGRvY3VtZW50ID09PSBudWxsKVxuICAgIHJldHVybiBkb2N1bWVudDtcblxuICB2YXIgcmVwbGFjZWRUb3BMZXZlbEF0b20gPSBhdG9tVHJhbnNmb3JtZXIoZG9jdW1lbnQpO1xuICBpZiAocmVwbGFjZWRUb3BMZXZlbEF0b20gIT09IHVuZGVmaW5lZClcbiAgICByZXR1cm4gcmVwbGFjZWRUb3BMZXZlbEF0b207XG5cbiAgdmFyIHJldCA9IGRvY3VtZW50O1xuICBfLmVhY2goZG9jdW1lbnQsIGZ1bmN0aW9uICh2YWwsIGtleSkge1xuICAgIHZhciB2YWxSZXBsYWNlZCA9IHJlcGxhY2VUeXBlcyh2YWwsIGF0b21UcmFuc2Zvcm1lcik7XG4gICAgaWYgKHZhbCAhPT0gdmFsUmVwbGFjZWQpIHtcbiAgICAgIC8vIExhenkgY2xvbmUuIFNoYWxsb3cgY29weS5cbiAgICAgIGlmIChyZXQgPT09IGRvY3VtZW50KVxuICAgICAgICByZXQgPSBfLmNsb25lKGRvY3VtZW50KTtcbiAgICAgIHJldFtrZXldID0gdmFsUmVwbGFjZWQ7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHJldDtcbn07XG5cblxuTW9uZ29Db25uZWN0aW9uID0gZnVuY3Rpb24gKHVybCwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBzZWxmLl9vYnNlcnZlTXVsdGlwbGV4ZXJzID0ge307XG4gIHNlbGYuX29uRmFpbG92ZXJIb29rID0gbmV3IEhvb2s7XG5cbiAgdmFyIG1vbmdvT3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe1xuICAgIC8vIFJlY29ubmVjdCBvbiBlcnJvci5cbiAgICBhdXRvUmVjb25uZWN0OiB0cnVlLFxuICAgIC8vIFRyeSB0byByZWNvbm5lY3QgZm9yZXZlciwgaW5zdGVhZCBvZiBzdG9wcGluZyBhZnRlciAzMCB0cmllcyAodGhlXG4gICAgLy8gZGVmYXVsdCksIHdpdGggZWFjaCBhdHRlbXB0IHNlcGFyYXRlZCBieSAxMDAwbXMuXG4gICAgcmVjb25uZWN0VHJpZXM6IEluZmluaXR5LFxuICAgIGlnbm9yZVVuZGVmaW5lZDogdHJ1ZSxcbiAgICAvLyBSZXF1aXJlZCB0byBzaWxlbmNlIGRlcHJlY2F0aW9uIHdhcm5pbmdzIHdpdGggbW9uZ29kYkAzLjEuMS5cbiAgICB1c2VOZXdVcmxQYXJzZXI6IHRydWUsXG4gIH0sIE1vbmdvLl9jb25uZWN0aW9uT3B0aW9ucyk7XG5cbiAgLy8gRGlzYWJsZSB0aGUgbmF0aXZlIHBhcnNlciBieSBkZWZhdWx0LCB1bmxlc3Mgc3BlY2lmaWNhbGx5IGVuYWJsZWRcbiAgLy8gaW4gdGhlIG1vbmdvIFVSTC5cbiAgLy8gLSBUaGUgbmF0aXZlIGRyaXZlciBjYW4gY2F1c2UgZXJyb3JzIHdoaWNoIG5vcm1hbGx5IHdvdWxkIGJlXG4gIC8vICAgdGhyb3duLCBjYXVnaHQsIGFuZCBoYW5kbGVkIGludG8gc2VnZmF1bHRzIHRoYXQgdGFrZSBkb3duIHRoZVxuICAvLyAgIHdob2xlIGFwcC5cbiAgLy8gLSBCaW5hcnkgbW9kdWxlcyBkb24ndCB5ZXQgd29yayB3aGVuIHlvdSBidW5kbGUgYW5kIG1vdmUgdGhlIGJ1bmRsZVxuICAvLyAgIHRvIGEgZGlmZmVyZW50IHBsYXRmb3JtIChha2EgZGVwbG95KVxuICAvLyBXZSBzaG91bGQgcmV2aXNpdCB0aGlzIGFmdGVyIGJpbmFyeSBucG0gbW9kdWxlIHN1cHBvcnQgbGFuZHMuXG4gIGlmICghKC9bXFw/Jl1uYXRpdmVfP1twUF1hcnNlcj0vLnRlc3QodXJsKSkpIHtcbiAgICBtb25nb09wdGlvbnMubmF0aXZlX3BhcnNlciA9IGZhbHNlO1xuICB9XG5cbiAgLy8gSW50ZXJuYWxseSB0aGUgb3Bsb2cgY29ubmVjdGlvbnMgc3BlY2lmeSB0aGVpciBvd24gcG9vbFNpemVcbiAgLy8gd2hpY2ggd2UgZG9uJ3Qgd2FudCB0byBvdmVyd3JpdGUgd2l0aCBhbnkgdXNlciBkZWZpbmVkIHZhbHVlXG4gIGlmIChfLmhhcyhvcHRpb25zLCAncG9vbFNpemUnKSkge1xuICAgIC8vIElmIHdlIGp1c3Qgc2V0IHRoaXMgZm9yIFwic2VydmVyXCIsIHJlcGxTZXQgd2lsbCBvdmVycmlkZSBpdC4gSWYgd2UganVzdFxuICAgIC8vIHNldCBpdCBmb3IgcmVwbFNldCwgaXQgd2lsbCBiZSBpZ25vcmVkIGlmIHdlJ3JlIG5vdCB1c2luZyBhIHJlcGxTZXQuXG4gICAgbW9uZ29PcHRpb25zLnBvb2xTaXplID0gb3B0aW9ucy5wb29sU2l6ZTtcbiAgfVxuXG4gIHNlbGYuZGIgPSBudWxsO1xuICAvLyBXZSBrZWVwIHRyYWNrIG9mIHRoZSBSZXBsU2V0J3MgcHJpbWFyeSwgc28gdGhhdCB3ZSBjYW4gdHJpZ2dlciBob29rcyB3aGVuXG4gIC8vIGl0IGNoYW5nZXMuICBUaGUgTm9kZSBkcml2ZXIncyBqb2luZWQgY2FsbGJhY2sgc2VlbXMgdG8gZmlyZSB3YXkgdG9vXG4gIC8vIG9mdGVuLCB3aGljaCBpcyB3aHkgd2UgbmVlZCB0byB0cmFjayBpdCBvdXJzZWx2ZXMuXG4gIHNlbGYuX3ByaW1hcnkgPSBudWxsO1xuICBzZWxmLl9vcGxvZ0hhbmRsZSA9IG51bGw7XG4gIHNlbGYuX2RvY0ZldGNoZXIgPSBudWxsO1xuXG5cbiAgdmFyIGNvbm5lY3RGdXR1cmUgPSBuZXcgRnV0dXJlO1xuICBNb25nb0RCLmNvbm5lY3QoXG4gICAgdXJsLFxuICAgIG1vbmdvT3B0aW9ucyxcbiAgICBNZXRlb3IuYmluZEVudmlyb25tZW50KFxuICAgICAgZnVuY3Rpb24gKGVyciwgY2xpZW50KSB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZGIgPSBjbGllbnQuZGIoKTtcblxuICAgICAgICAvLyBGaXJzdCwgZmlndXJlIG91dCB3aGF0IHRoZSBjdXJyZW50IHByaW1hcnkgaXMsIGlmIGFueS5cbiAgICAgICAgaWYgKGRiLnNlcnZlckNvbmZpZy5pc01hc3RlckRvYykge1xuICAgICAgICAgIHNlbGYuX3ByaW1hcnkgPSBkYi5zZXJ2ZXJDb25maWcuaXNNYXN0ZXJEb2MucHJpbWFyeTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRiLnNlcnZlckNvbmZpZy5vbihcbiAgICAgICAgICAnam9pbmVkJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChmdW5jdGlvbiAoa2luZCwgZG9jKSB7XG4gICAgICAgICAgICBpZiAoa2luZCA9PT0gJ3ByaW1hcnknKSB7XG4gICAgICAgICAgICAgIGlmIChkb2MucHJpbWFyeSAhPT0gc2VsZi5fcHJpbWFyeSkge1xuICAgICAgICAgICAgICAgIHNlbGYuX3ByaW1hcnkgPSBkb2MucHJpbWFyeTtcbiAgICAgICAgICAgICAgICBzZWxmLl9vbkZhaWxvdmVySG9vay5lYWNoKGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRvYy5tZSA9PT0gc2VsZi5fcHJpbWFyeSkge1xuICAgICAgICAgICAgICAvLyBUaGUgdGhpbmcgd2UgdGhvdWdodCB3YXMgcHJpbWFyeSBpcyBub3cgc29tZXRoaW5nIG90aGVyIHRoYW5cbiAgICAgICAgICAgICAgLy8gcHJpbWFyeS4gIEZvcmdldCB0aGF0IHdlIHRob3VnaHQgaXQgd2FzIHByaW1hcnkuICAoVGhpcyBtZWFuc1xuICAgICAgICAgICAgICAvLyB0aGF0IGlmIGEgc2VydmVyIHN0b3BzIGJlaW5nIHByaW1hcnkgYW5kIHRoZW4gc3RhcnRzIGJlaW5nXG4gICAgICAgICAgICAgIC8vIHByaW1hcnkgYWdhaW4gd2l0aG91dCBhbm90aGVyIHNlcnZlciBiZWNvbWluZyBwcmltYXJ5IGluIHRoZVxuICAgICAgICAgICAgICAvLyBtaWRkbGUsIHdlJ2xsIGNvcnJlY3RseSBjb3VudCBpdCBhcyBhIGZhaWxvdmVyLilcbiAgICAgICAgICAgICAgc2VsZi5fcHJpbWFyeSA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkpO1xuXG4gICAgICAgIC8vIEFsbG93IHRoZSBjb25zdHJ1Y3RvciB0byByZXR1cm4uXG4gICAgICAgIGNvbm5lY3RGdXR1cmVbJ3JldHVybiddKHsgY2xpZW50LCBkYiB9KTtcbiAgICAgIH0sXG4gICAgICBjb25uZWN0RnV0dXJlLnJlc29sdmVyKCkgIC8vIG9uRXhjZXB0aW9uXG4gICAgKVxuICApO1xuXG4gIC8vIFdhaXQgZm9yIHRoZSBjb25uZWN0aW9uIHRvIGJlIHN1Y2Nlc3NmdWwgKHRocm93cyBvbiBmYWlsdXJlKSBhbmQgYXNzaWduIHRoZVxuICAvLyByZXN1bHRzIChgY2xpZW50YCBhbmQgYGRiYCkgdG8gYHNlbGZgLlxuICBPYmplY3QuYXNzaWduKHNlbGYsIGNvbm5lY3RGdXR1cmUud2FpdCgpKTtcblxuICBpZiAob3B0aW9ucy5vcGxvZ1VybCAmJiAhIFBhY2thZ2VbJ2Rpc2FibGUtb3Bsb2cnXSkge1xuICAgIHNlbGYuX29wbG9nSGFuZGxlID0gbmV3IE9wbG9nSGFuZGxlKG9wdGlvbnMub3Bsb2dVcmwsIHNlbGYuZGIuZGF0YWJhc2VOYW1lKTtcbiAgICBzZWxmLl9kb2NGZXRjaGVyID0gbmV3IERvY0ZldGNoZXIoc2VsZik7XG4gIH1cbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICghIHNlbGYuZGIpXG4gICAgdGhyb3cgRXJyb3IoXCJjbG9zZSBjYWxsZWQgYmVmb3JlIENvbm5lY3Rpb24gY3JlYXRlZD9cIik7XG5cbiAgLy8gWFhYIHByb2JhYmx5IHVudGVzdGVkXG4gIHZhciBvcGxvZ0hhbmRsZSA9IHNlbGYuX29wbG9nSGFuZGxlO1xuICBzZWxmLl9vcGxvZ0hhbmRsZSA9IG51bGw7XG4gIGlmIChvcGxvZ0hhbmRsZSlcbiAgICBvcGxvZ0hhbmRsZS5zdG9wKCk7XG5cbiAgLy8gVXNlIEZ1dHVyZS53cmFwIHNvIHRoYXQgZXJyb3JzIGdldCB0aHJvd24uIFRoaXMgaGFwcGVucyB0b1xuICAvLyB3b3JrIGV2ZW4gb3V0c2lkZSBhIGZpYmVyIHNpbmNlIHRoZSAnY2xvc2UnIG1ldGhvZCBpcyBub3RcbiAgLy8gYWN0dWFsbHkgYXN5bmNocm9ub3VzLlxuICBGdXR1cmUud3JhcChfLmJpbmQoc2VsZi5jbGllbnQuY2xvc2UsIHNlbGYuY2xpZW50KSkodHJ1ZSkud2FpdCgpO1xufTtcblxuLy8gUmV0dXJucyB0aGUgTW9uZ28gQ29sbGVjdGlvbiBvYmplY3Q7IG1heSB5aWVsZC5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUucmF3Q29sbGVjdGlvbiA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKCEgc2VsZi5kYilcbiAgICB0aHJvdyBFcnJvcihcInJhd0NvbGxlY3Rpb24gY2FsbGVkIGJlZm9yZSBDb25uZWN0aW9uIGNyZWF0ZWQ/XCIpO1xuXG4gIHZhciBmdXR1cmUgPSBuZXcgRnV0dXJlO1xuICBzZWxmLmRiLmNvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUsIGZ1dHVyZS5yZXNvbHZlcigpKTtcbiAgcmV0dXJuIGZ1dHVyZS53YWl0KCk7XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9jcmVhdGVDYXBwZWRDb2xsZWN0aW9uID0gZnVuY3Rpb24gKFxuICAgIGNvbGxlY3Rpb25OYW1lLCBieXRlU2l6ZSwgbWF4RG9jdW1lbnRzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoISBzZWxmLmRiKVxuICAgIHRocm93IEVycm9yKFwiX2NyZWF0ZUNhcHBlZENvbGxlY3Rpb24gY2FsbGVkIGJlZm9yZSBDb25uZWN0aW9uIGNyZWF0ZWQ/XCIpO1xuXG4gIHZhciBmdXR1cmUgPSBuZXcgRnV0dXJlKCk7XG4gIHNlbGYuZGIuY3JlYXRlQ29sbGVjdGlvbihcbiAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICB7IGNhcHBlZDogdHJ1ZSwgc2l6ZTogYnl0ZVNpemUsIG1heDogbWF4RG9jdW1lbnRzIH0sXG4gICAgZnV0dXJlLnJlc29sdmVyKCkpO1xuICBmdXR1cmUud2FpdCgpO1xufTtcblxuLy8gVGhpcyBzaG91bGQgYmUgY2FsbGVkIHN5bmNocm9ub3VzbHkgd2l0aCBhIHdyaXRlLCB0byBjcmVhdGUgYVxuLy8gdHJhbnNhY3Rpb24gb24gdGhlIGN1cnJlbnQgd3JpdGUgZmVuY2UsIGlmIGFueS4gQWZ0ZXIgd2UgY2FuIHJlYWRcbi8vIHRoZSB3cml0ZSwgYW5kIGFmdGVyIG9ic2VydmVycyBoYXZlIGJlZW4gbm90aWZpZWQgKG9yIGF0IGxlYXN0LFxuLy8gYWZ0ZXIgdGhlIG9ic2VydmVyIG5vdGlmaWVycyBoYXZlIGFkZGVkIHRoZW1zZWx2ZXMgdG8gdGhlIHdyaXRlXG4vLyBmZW5jZSksIHlvdSBzaG91bGQgY2FsbCAnY29tbWl0dGVkKCknIG9uIHRoZSBvYmplY3QgcmV0dXJuZWQuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9tYXliZUJlZ2luV3JpdGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBmZW5jZSA9IEREUFNlcnZlci5fQ3VycmVudFdyaXRlRmVuY2UuZ2V0KCk7XG4gIGlmIChmZW5jZSkge1xuICAgIHJldHVybiBmZW5jZS5iZWdpbldyaXRlKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHtjb21taXR0ZWQ6IGZ1bmN0aW9uICgpIHt9fTtcbiAgfVxufTtcblxuLy8gSW50ZXJuYWwgaW50ZXJmYWNlOiBhZGRzIGEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gdGhlIE1vbmdvIHByaW1hcnlcbi8vIGNoYW5nZXMuIFJldHVybnMgYSBzdG9wIGhhbmRsZS5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX29uRmFpbG92ZXIgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgcmV0dXJuIHRoaXMuX29uRmFpbG92ZXJIb29rLnJlZ2lzdGVyKGNhbGxiYWNrKTtcbn07XG5cblxuLy8vLy8vLy8vLy8vIFB1YmxpYyBBUEkgLy8vLy8vLy8vL1xuXG4vLyBUaGUgd3JpdGUgbWV0aG9kcyBibG9jayB1bnRpbCB0aGUgZGF0YWJhc2UgaGFzIGNvbmZpcm1lZCB0aGUgd3JpdGUgKGl0IG1heVxuLy8gbm90IGJlIHJlcGxpY2F0ZWQgb3Igc3RhYmxlIG9uIGRpc2ssIGJ1dCBvbmUgc2VydmVyIGhhcyBjb25maXJtZWQgaXQpIGlmIG5vXG4vLyBjYWxsYmFjayBpcyBwcm92aWRlZC4gSWYgYSBjYWxsYmFjayBpcyBwcm92aWRlZCwgdGhlbiB0aGV5IGNhbGwgdGhlIGNhbGxiYWNrXG4vLyB3aGVuIHRoZSB3cml0ZSBpcyBjb25maXJtZWQuIFRoZXkgcmV0dXJuIG5vdGhpbmcgb24gc3VjY2VzcywgYW5kIHJhaXNlIGFuXG4vLyBleGNlcHRpb24gb24gZmFpbHVyZS5cbi8vXG4vLyBBZnRlciBtYWtpbmcgYSB3cml0ZSAod2l0aCBpbnNlcnQsIHVwZGF0ZSwgcmVtb3ZlKSwgb2JzZXJ2ZXJzIGFyZVxuLy8gbm90aWZpZWQgYXN5bmNocm9ub3VzbHkuIElmIHlvdSB3YW50IHRvIHJlY2VpdmUgYSBjYWxsYmFjayBvbmNlIGFsbFxuLy8gb2YgdGhlIG9ic2VydmVyIG5vdGlmaWNhdGlvbnMgaGF2ZSBsYW5kZWQgZm9yIHlvdXIgd3JpdGUsIGRvIHRoZVxuLy8gd3JpdGVzIGluc2lkZSBhIHdyaXRlIGZlbmNlIChzZXQgRERQU2VydmVyLl9DdXJyZW50V3JpdGVGZW5jZSB0byBhIG5ld1xuLy8gX1dyaXRlRmVuY2UsIGFuZCB0aGVuIHNldCBhIGNhbGxiYWNrIG9uIHRoZSB3cml0ZSBmZW5jZS4pXG4vL1xuLy8gU2luY2Ugb3VyIGV4ZWN1dGlvbiBlbnZpcm9ubWVudCBpcyBzaW5nbGUtdGhyZWFkZWQsIHRoaXMgaXNcbi8vIHdlbGwtZGVmaW5lZCAtLSBhIHdyaXRlIFwiaGFzIGJlZW4gbWFkZVwiIGlmIGl0J3MgcmV0dXJuZWQsIGFuZCBhblxuLy8gb2JzZXJ2ZXIgXCJoYXMgYmVlbiBub3RpZmllZFwiIGlmIGl0cyBjYWxsYmFjayBoYXMgcmV0dXJuZWQuXG5cbnZhciB3cml0ZUNhbGxiYWNrID0gZnVuY3Rpb24gKHdyaXRlLCByZWZyZXNoLCBjYWxsYmFjaykge1xuICByZXR1cm4gZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG4gICAgaWYgKCEgZXJyKSB7XG4gICAgICAvLyBYWFggV2UgZG9uJ3QgaGF2ZSB0byBydW4gdGhpcyBvbiBlcnJvciwgcmlnaHQ/XG4gICAgICB0cnkge1xuICAgICAgICByZWZyZXNoKCk7XG4gICAgICB9IGNhdGNoIChyZWZyZXNoRXJyKSB7XG4gICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgIGNhbGxiYWNrKHJlZnJlc2hFcnIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyByZWZyZXNoRXJyO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHQpO1xuICAgIH0gZWxzZSBpZiAoZXJyKSB7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9O1xufTtcblxudmFyIGJpbmRFbnZpcm9ubWVudEZvcldyaXRlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIHJldHVybiBNZXRlb3IuYmluZEVudmlyb25tZW50KGNhbGxiYWNrLCBcIk1vbmdvIHdyaXRlXCIpO1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5faW5zZXJ0ID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25fbmFtZSwgZG9jdW1lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2spIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBzZW5kRXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChjYWxsYmFjaylcbiAgICAgIHJldHVybiBjYWxsYmFjayhlKTtcbiAgICB0aHJvdyBlO1xuICB9O1xuXG4gIGlmIChjb2xsZWN0aW9uX25hbWUgPT09IFwiX19fbWV0ZW9yX2ZhaWx1cmVfdGVzdF9jb2xsZWN0aW9uXCIpIHtcbiAgICB2YXIgZSA9IG5ldyBFcnJvcihcIkZhaWx1cmUgdGVzdFwiKTtcbiAgICBlLl9leHBlY3RlZEJ5VGVzdCA9IHRydWU7XG4gICAgc2VuZEVycm9yKGUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICghKExvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChkb2N1bWVudCkgJiZcbiAgICAgICAgIUVKU09OLl9pc0N1c3RvbVR5cGUoZG9jdW1lbnQpKSkge1xuICAgIHNlbmRFcnJvcihuZXcgRXJyb3IoXG4gICAgICBcIk9ubHkgcGxhaW4gb2JqZWN0cyBtYXkgYmUgaW5zZXJ0ZWQgaW50byBNb25nb0RCXCIpKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgd3JpdGUgPSBzZWxmLl9tYXliZUJlZ2luV3JpdGUoKTtcbiAgdmFyIHJlZnJlc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgTWV0ZW9yLnJlZnJlc2goe2NvbGxlY3Rpb246IGNvbGxlY3Rpb25fbmFtZSwgaWQ6IGRvY3VtZW50Ll9pZCB9KTtcbiAgfTtcbiAgY2FsbGJhY2sgPSBiaW5kRW52aXJvbm1lbnRGb3JXcml0ZSh3cml0ZUNhbGxiYWNrKHdyaXRlLCByZWZyZXNoLCBjYWxsYmFjaykpO1xuICB0cnkge1xuICAgIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25fbmFtZSk7XG4gICAgY29sbGVjdGlvbi5pbnNlcnQocmVwbGFjZVR5cGVzKGRvY3VtZW50LCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyksXG4gICAgICAgICAgICAgICAgICAgICAge3NhZmU6IHRydWV9LCBjYWxsYmFjayk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgIHRocm93IGVycjtcbiAgfVxufTtcblxuLy8gQ2F1c2UgcXVlcmllcyB0aGF0IG1heSBiZSBhZmZlY3RlZCBieSB0aGUgc2VsZWN0b3IgdG8gcG9sbCBpbiB0aGlzIHdyaXRlXG4vLyBmZW5jZS5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX3JlZnJlc2ggPSBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIHNlbGVjdG9yKSB7XG4gIHZhciByZWZyZXNoS2V5ID0ge2NvbGxlY3Rpb246IGNvbGxlY3Rpb25OYW1lfTtcbiAgLy8gSWYgd2Uga25vdyB3aGljaCBkb2N1bWVudHMgd2UncmUgcmVtb3ZpbmcsIGRvbid0IHBvbGwgcXVlcmllcyB0aGF0IGFyZVxuICAvLyBzcGVjaWZpYyB0byBvdGhlciBkb2N1bWVudHMuIChOb3RlIHRoYXQgbXVsdGlwbGUgbm90aWZpY2F0aW9ucyBoZXJlIHNob3VsZFxuICAvLyBub3QgY2F1c2UgbXVsdGlwbGUgcG9sbHMsIHNpbmNlIGFsbCBvdXIgbGlzdGVuZXIgaXMgZG9pbmcgaXMgZW5xdWV1ZWluZyBhXG4gIC8vIHBvbGwuKVxuICB2YXIgc3BlY2lmaWNJZHMgPSBMb2NhbENvbGxlY3Rpb24uX2lkc01hdGNoZWRCeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgaWYgKHNwZWNpZmljSWRzKSB7XG4gICAgXy5lYWNoKHNwZWNpZmljSWRzLCBmdW5jdGlvbiAoaWQpIHtcbiAgICAgIE1ldGVvci5yZWZyZXNoKF8uZXh0ZW5kKHtpZDogaWR9LCByZWZyZXNoS2V5KSk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgTWV0ZW9yLnJlZnJlc2gocmVmcmVzaEtleSk7XG4gIH1cbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX3JlbW92ZSA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uX25hbWUsIHNlbGVjdG9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoY29sbGVjdGlvbl9uYW1lID09PSBcIl9fX21ldGVvcl9mYWlsdXJlX3Rlc3RfY29sbGVjdGlvblwiKSB7XG4gICAgdmFyIGUgPSBuZXcgRXJyb3IoXCJGYWlsdXJlIHRlc3RcIik7XG4gICAgZS5fZXhwZWN0ZWRCeVRlc3QgPSB0cnVlO1xuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuXG4gIHZhciB3cml0ZSA9IHNlbGYuX21heWJlQmVnaW5Xcml0ZSgpO1xuICB2YXIgcmVmcmVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICBzZWxmLl9yZWZyZXNoKGNvbGxlY3Rpb25fbmFtZSwgc2VsZWN0b3IpO1xuICB9O1xuICBjYWxsYmFjayA9IGJpbmRFbnZpcm9ubWVudEZvcldyaXRlKHdyaXRlQ2FsbGJhY2sod3JpdGUsIHJlZnJlc2gsIGNhbGxiYWNrKSk7XG5cbiAgdHJ5IHtcbiAgICB2YXIgY29sbGVjdGlvbiA9IHNlbGYucmF3Q29sbGVjdGlvbihjb2xsZWN0aW9uX25hbWUpO1xuICAgIHZhciB3cmFwcGVkQ2FsbGJhY2sgPSBmdW5jdGlvbihlcnIsIGRyaXZlclJlc3VsdCkge1xuICAgICAgY2FsbGJhY2soZXJyLCB0cmFuc2Zvcm1SZXN1bHQoZHJpdmVyUmVzdWx0KS5udW1iZXJBZmZlY3RlZCk7XG4gICAgfTtcbiAgICBjb2xsZWN0aW9uLnJlbW92ZShyZXBsYWNlVHlwZXMoc2VsZWN0b3IsIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKSxcbiAgICAgICAgICAgICAgICAgICAgICAge3NhZmU6IHRydWV9LCB3cmFwcGVkQ2FsbGJhY2spO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICB3cml0ZS5jb21taXR0ZWQoKTtcbiAgICB0aHJvdyBlcnI7XG4gIH1cbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX2Ryb3BDb2xsZWN0aW9uID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBjYikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIHdyaXRlID0gc2VsZi5fbWF5YmVCZWdpbldyaXRlKCk7XG4gIHZhciByZWZyZXNoID0gZnVuY3Rpb24gKCkge1xuICAgIE1ldGVvci5yZWZyZXNoKHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZSwgaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGRyb3BDb2xsZWN0aW9uOiB0cnVlfSk7XG4gIH07XG4gIGNiID0gYmluZEVudmlyb25tZW50Rm9yV3JpdGUod3JpdGVDYWxsYmFjayh3cml0ZSwgcmVmcmVzaCwgY2IpKTtcblxuICB0cnkge1xuICAgIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcbiAgICBjb2xsZWN0aW9uLmRyb3AoY2IpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgdGhyb3cgZTtcbiAgfVxufTtcblxuLy8gRm9yIHRlc3Rpbmcgb25seS4gIFNsaWdodGx5IGJldHRlciB0aGFuIGBjLnJhd0RhdGFiYXNlKCkuZHJvcERhdGFiYXNlKClgXG4vLyBiZWNhdXNlIGl0IGxldHMgdGhlIHRlc3QncyBmZW5jZSB3YWl0IGZvciBpdCB0byBiZSBjb21wbGV0ZS5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX2Ryb3BEYXRhYmFzZSA9IGZ1bmN0aW9uIChjYikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIHdyaXRlID0gc2VsZi5fbWF5YmVCZWdpbldyaXRlKCk7XG4gIHZhciByZWZyZXNoID0gZnVuY3Rpb24gKCkge1xuICAgIE1ldGVvci5yZWZyZXNoKHsgZHJvcERhdGFiYXNlOiB0cnVlIH0pO1xuICB9O1xuICBjYiA9IGJpbmRFbnZpcm9ubWVudEZvcldyaXRlKHdyaXRlQ2FsbGJhY2sod3JpdGUsIHJlZnJlc2gsIGNiKSk7XG5cbiAgdHJ5IHtcbiAgICBzZWxmLmRiLmRyb3BEYXRhYmFzZShjYik7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB3cml0ZS5jb21taXR0ZWQoKTtcbiAgICB0aHJvdyBlO1xuICB9XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl91cGRhdGUgPSBmdW5jdGlvbiAoY29sbGVjdGlvbl9uYW1lLCBzZWxlY3RvciwgbW9kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoISBjYWxsYmFjayAmJiBvcHRpb25zIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgb3B0aW9ucyA9IG51bGw7XG4gIH1cblxuICBpZiAoY29sbGVjdGlvbl9uYW1lID09PSBcIl9fX21ldGVvcl9mYWlsdXJlX3Rlc3RfY29sbGVjdGlvblwiKSB7XG4gICAgdmFyIGUgPSBuZXcgRXJyb3IoXCJGYWlsdXJlIHRlc3RcIik7XG4gICAgZS5fZXhwZWN0ZWRCeVRlc3QgPSB0cnVlO1xuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuXG4gIC8vIGV4cGxpY2l0IHNhZmV0eSBjaGVjay4gbnVsbCBhbmQgdW5kZWZpbmVkIGNhbiBjcmFzaCB0aGUgbW9uZ29cbiAgLy8gZHJpdmVyLiBBbHRob3VnaCB0aGUgbm9kZSBkcml2ZXIgYW5kIG1pbmltb25nbyBkbyAnc3VwcG9ydCdcbiAgLy8gbm9uLW9iamVjdCBtb2RpZmllciBpbiB0aGF0IHRoZXkgZG9uJ3QgY3Jhc2gsIHRoZXkgYXJlIG5vdFxuICAvLyBtZWFuaW5nZnVsIG9wZXJhdGlvbnMgYW5kIGRvIG5vdCBkbyBhbnl0aGluZy4gRGVmZW5zaXZlbHkgdGhyb3cgYW5cbiAgLy8gZXJyb3IgaGVyZS5cbiAgaWYgKCFtb2QgfHwgdHlwZW9mIG1vZCAhPT0gJ29iamVjdCcpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBtb2RpZmllci4gTW9kaWZpZXIgbXVzdCBiZSBhbiBvYmplY3QuXCIpO1xuXG4gIGlmICghKExvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChtb2QpICYmXG4gICAgICAgICFFSlNPTi5faXNDdXN0b21UeXBlKG1vZCkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgXCJPbmx5IHBsYWluIG9iamVjdHMgbWF5IGJlIHVzZWQgYXMgcmVwbGFjZW1lbnRcIiArXG4gICAgICAgIFwiIGRvY3VtZW50cyBpbiBNb25nb0RCXCIpO1xuICB9XG5cbiAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge307XG5cbiAgdmFyIHdyaXRlID0gc2VsZi5fbWF5YmVCZWdpbldyaXRlKCk7XG4gIHZhciByZWZyZXNoID0gZnVuY3Rpb24gKCkge1xuICAgIHNlbGYuX3JlZnJlc2goY29sbGVjdGlvbl9uYW1lLCBzZWxlY3Rvcik7XG4gIH07XG4gIGNhbGxiYWNrID0gd3JpdGVDYWxsYmFjayh3cml0ZSwgcmVmcmVzaCwgY2FsbGJhY2spO1xuICB0cnkge1xuICAgIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25fbmFtZSk7XG4gICAgdmFyIG1vbmdvT3B0cyA9IHtzYWZlOiB0cnVlfTtcbiAgICAvLyBleHBsaWN0bHkgZW51bWVyYXRlIG9wdGlvbnMgdGhhdCBtaW5pbW9uZ28gc3VwcG9ydHNcbiAgICBpZiAob3B0aW9ucy51cHNlcnQpIG1vbmdvT3B0cy51cHNlcnQgPSB0cnVlO1xuICAgIGlmIChvcHRpb25zLm11bHRpKSBtb25nb09wdHMubXVsdGkgPSB0cnVlO1xuICAgIC8vIExldHMgeW91IGdldCBhIG1vcmUgbW9yZSBmdWxsIHJlc3VsdCBmcm9tIE1vbmdvREIuIFVzZSB3aXRoIGNhdXRpb246XG4gICAgLy8gbWlnaHQgbm90IHdvcmsgd2l0aCBDLnVwc2VydCAoYXMgb3Bwb3NlZCB0byBDLnVwZGF0ZSh7dXBzZXJ0OnRydWV9KSBvclxuICAgIC8vIHdpdGggc2ltdWxhdGVkIHVwc2VydC5cbiAgICBpZiAob3B0aW9ucy5mdWxsUmVzdWx0KSBtb25nb09wdHMuZnVsbFJlc3VsdCA9IHRydWU7XG5cbiAgICB2YXIgbW9uZ29TZWxlY3RvciA9IHJlcGxhY2VUeXBlcyhzZWxlY3RvciwgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pO1xuICAgIHZhciBtb25nb01vZCA9IHJlcGxhY2VUeXBlcyhtb2QsIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKTtcblxuICAgIHZhciBpc01vZGlmeSA9IExvY2FsQ29sbGVjdGlvbi5faXNNb2RpZmljYXRpb25Nb2QobW9uZ29Nb2QpO1xuXG4gICAgaWYgKG9wdGlvbnMuX2ZvcmJpZFJlcGxhY2UgJiYgIWlzTW9kaWZ5KSB7XG4gICAgICB2YXIgZXJyID0gbmV3IEVycm9yKFwiSW52YWxpZCBtb2RpZmllci4gUmVwbGFjZW1lbnRzIGFyZSBmb3JiaWRkZW4uXCIpO1xuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFdlJ3ZlIGFscmVhZHkgcnVuIHJlcGxhY2VUeXBlcy9yZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyBvblxuICAgIC8vIHNlbGVjdG9yIGFuZCBtb2QuICBXZSBhc3N1bWUgaXQgZG9lc24ndCBtYXR0ZXIsIGFzIGZhciBhc1xuICAgIC8vIHRoZSBiZWhhdmlvciBvZiBtb2RpZmllcnMgaXMgY29uY2VybmVkLCB3aGV0aGVyIGBfbW9kaWZ5YFxuICAgIC8vIGlzIHJ1biBvbiBFSlNPTiBvciBvbiBtb25nby1jb252ZXJ0ZWQgRUpTT04uXG5cbiAgICAvLyBSdW4gdGhpcyBjb2RlIHVwIGZyb250IHNvIHRoYXQgaXQgZmFpbHMgZmFzdCBpZiBzb21lb25lIHVzZXNcbiAgICAvLyBhIE1vbmdvIHVwZGF0ZSBvcGVyYXRvciB3ZSBkb24ndCBzdXBwb3J0LlxuICAgIGxldCBrbm93bklkO1xuICAgIGlmIChvcHRpb25zLnVwc2VydCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbGV0IG5ld0RvYyA9IExvY2FsQ29sbGVjdGlvbi5fY3JlYXRlVXBzZXJ0RG9jdW1lbnQoc2VsZWN0b3IsIG1vZCk7XG4gICAgICAgIGtub3duSWQgPSBuZXdEb2MuX2lkO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChvcHRpb25zLnVwc2VydCAmJlxuICAgICAgICAhIGlzTW9kaWZ5ICYmXG4gICAgICAgICEga25vd25JZCAmJlxuICAgICAgICBvcHRpb25zLmluc2VydGVkSWQgJiZcbiAgICAgICAgISAob3B0aW9ucy5pbnNlcnRlZElkIGluc3RhbmNlb2YgTW9uZ28uT2JqZWN0SUQgJiZcbiAgICAgICAgICAgb3B0aW9ucy5nZW5lcmF0ZWRJZCkpIHtcbiAgICAgIC8vIEluIGNhc2Ugb2YgYW4gdXBzZXJ0IHdpdGggYSByZXBsYWNlbWVudCwgd2hlcmUgdGhlcmUgaXMgbm8gX2lkIGRlZmluZWRcbiAgICAgIC8vIGluIGVpdGhlciB0aGUgcXVlcnkgb3IgdGhlIHJlcGxhY2VtZW50IGRvYywgbW9uZ28gd2lsbCBnZW5lcmF0ZSBhbiBpZCBpdHNlbGYuXG4gICAgICAvLyBUaGVyZWZvcmUgd2UgbmVlZCB0aGlzIHNwZWNpYWwgc3RyYXRlZ3kgaWYgd2Ugd2FudCB0byBjb250cm9sIHRoZSBpZCBvdXJzZWx2ZXMuXG5cbiAgICAgIC8vIFdlIGRvbid0IG5lZWQgdG8gZG8gdGhpcyB3aGVuOlxuICAgICAgLy8gLSBUaGlzIGlzIG5vdCBhIHJlcGxhY2VtZW50LCBzbyB3ZSBjYW4gYWRkIGFuIF9pZCB0byAkc2V0T25JbnNlcnRcbiAgICAgIC8vIC0gVGhlIGlkIGlzIGRlZmluZWQgYnkgcXVlcnkgb3IgbW9kIHdlIGNhbiBqdXN0IGFkZCBpdCB0byB0aGUgcmVwbGFjZW1lbnQgZG9jXG4gICAgICAvLyAtIFRoZSB1c2VyIGRpZCBub3Qgc3BlY2lmeSBhbnkgaWQgcHJlZmVyZW5jZSBhbmQgdGhlIGlkIGlzIGEgTW9uZ28gT2JqZWN0SWQsXG4gICAgICAvLyAgICAgdGhlbiB3ZSBjYW4ganVzdCBsZXQgTW9uZ28gZ2VuZXJhdGUgdGhlIGlkXG5cbiAgICAgIHNpbXVsYXRlVXBzZXJ0V2l0aEluc2VydGVkSWQoXG4gICAgICAgIGNvbGxlY3Rpb24sIG1vbmdvU2VsZWN0b3IsIG1vbmdvTW9kLCBvcHRpb25zLFxuICAgICAgICAvLyBUaGlzIGNhbGxiYWNrIGRvZXMgbm90IG5lZWQgdG8gYmUgYmluZEVudmlyb25tZW50J2VkIGJlY2F1c2VcbiAgICAgICAgLy8gc2ltdWxhdGVVcHNlcnRXaXRoSW5zZXJ0ZWRJZCgpIHdyYXBzIGl0IGFuZCB0aGVuIHBhc3NlcyBpdCB0aHJvdWdoXG4gICAgICAgIC8vIGJpbmRFbnZpcm9ubWVudEZvcldyaXRlLlxuICAgICAgICBmdW5jdGlvbiAoZXJyb3IsIHJlc3VsdCkge1xuICAgICAgICAgIC8vIElmIHdlIGdvdCBoZXJlIHZpYSBhIHVwc2VydCgpIGNhbGwsIHRoZW4gb3B0aW9ucy5fcmV0dXJuT2JqZWN0IHdpbGxcbiAgICAgICAgICAvLyBiZSBzZXQgYW5kIHdlIHNob3VsZCByZXR1cm4gdGhlIHdob2xlIG9iamVjdC4gT3RoZXJ3aXNlLCB3ZSBzaG91bGRcbiAgICAgICAgICAvLyBqdXN0IHJldHVybiB0aGUgbnVtYmVyIG9mIGFmZmVjdGVkIGRvY3MgdG8gbWF0Y2ggdGhlIG1vbmdvIEFQSS5cbiAgICAgICAgICBpZiAocmVzdWx0ICYmICEgb3B0aW9ucy5fcmV0dXJuT2JqZWN0KSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgcmVzdWx0Lm51bWJlckFmZmVjdGVkKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIHJlc3VsdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICApO1xuICAgIH0gZWxzZSB7XG5cbiAgICAgIGlmIChvcHRpb25zLnVwc2VydCAmJiAha25vd25JZCAmJiBvcHRpb25zLmluc2VydGVkSWQgJiYgaXNNb2RpZnkpIHtcbiAgICAgICAgaWYgKCFtb25nb01vZC5oYXNPd25Qcm9wZXJ0eSgnJHNldE9uSW5zZXJ0JykpIHtcbiAgICAgICAgICBtb25nb01vZC4kc2V0T25JbnNlcnQgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBrbm93bklkID0gb3B0aW9ucy5pbnNlcnRlZElkO1xuICAgICAgICBPYmplY3QuYXNzaWduKG1vbmdvTW9kLiRzZXRPbkluc2VydCwgcmVwbGFjZVR5cGVzKHtfaWQ6IG9wdGlvbnMuaW5zZXJ0ZWRJZH0sIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKSk7XG4gICAgICB9XG5cbiAgICAgIGNvbGxlY3Rpb24udXBkYXRlKFxuICAgICAgICBtb25nb1NlbGVjdG9yLCBtb25nb01vZCwgbW9uZ29PcHRzLFxuICAgICAgICBiaW5kRW52aXJvbm1lbnRGb3JXcml0ZShmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcbiAgICAgICAgICBpZiAoISBlcnIpIHtcbiAgICAgICAgICAgIHZhciBtZXRlb3JSZXN1bHQgPSB0cmFuc2Zvcm1SZXN1bHQocmVzdWx0KTtcbiAgICAgICAgICAgIGlmIChtZXRlb3JSZXN1bHQgJiYgb3B0aW9ucy5fcmV0dXJuT2JqZWN0KSB7XG4gICAgICAgICAgICAgIC8vIElmIHRoaXMgd2FzIGFuIHVwc2VydCgpIGNhbGwsIGFuZCB3ZSBlbmRlZCB1cFxuICAgICAgICAgICAgICAvLyBpbnNlcnRpbmcgYSBuZXcgZG9jIGFuZCB3ZSBrbm93IGl0cyBpZCwgdGhlblxuICAgICAgICAgICAgICAvLyByZXR1cm4gdGhhdCBpZCBhcyB3ZWxsLlxuICAgICAgICAgICAgICBpZiAob3B0aW9ucy51cHNlcnQgJiYgbWV0ZW9yUmVzdWx0Lmluc2VydGVkSWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoa25vd25JZCkge1xuICAgICAgICAgICAgICAgICAgbWV0ZW9yUmVzdWx0Lmluc2VydGVkSWQgPSBrbm93bklkO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWV0ZW9yUmVzdWx0Lmluc2VydGVkSWQgaW5zdGFuY2VvZiBNb25nb0RCLk9iamVjdElEKSB7XG4gICAgICAgICAgICAgICAgICBtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZCA9IG5ldyBNb25nby5PYmplY3RJRChtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZC50b0hleFN0cmluZygpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIG1ldGVvclJlc3VsdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIG1ldGVvclJlc3VsdC5udW1iZXJBZmZlY3RlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgdGhyb3cgZTtcbiAgfVxufTtcblxudmFyIHRyYW5zZm9ybVJlc3VsdCA9IGZ1bmN0aW9uIChkcml2ZXJSZXN1bHQpIHtcbiAgdmFyIG1ldGVvclJlc3VsdCA9IHsgbnVtYmVyQWZmZWN0ZWQ6IDAgfTtcbiAgaWYgKGRyaXZlclJlc3VsdCkge1xuICAgIHZhciBtb25nb1Jlc3VsdCA9IGRyaXZlclJlc3VsdC5yZXN1bHQ7XG5cbiAgICAvLyBPbiB1cGRhdGVzIHdpdGggdXBzZXJ0OnRydWUsIHRoZSBpbnNlcnRlZCB2YWx1ZXMgY29tZSBhcyBhIGxpc3Qgb2ZcbiAgICAvLyB1cHNlcnRlZCB2YWx1ZXMgLS0gZXZlbiB3aXRoIG9wdGlvbnMubXVsdGksIHdoZW4gdGhlIHVwc2VydCBkb2VzIGluc2VydCxcbiAgICAvLyBpdCBvbmx5IGluc2VydHMgb25lIGVsZW1lbnQuXG4gICAgaWYgKG1vbmdvUmVzdWx0LnVwc2VydGVkKSB7XG4gICAgICBtZXRlb3JSZXN1bHQubnVtYmVyQWZmZWN0ZWQgKz0gbW9uZ29SZXN1bHQudXBzZXJ0ZWQubGVuZ3RoO1xuXG4gICAgICBpZiAobW9uZ29SZXN1bHQudXBzZXJ0ZWQubGVuZ3RoID09IDEpIHtcbiAgICAgICAgbWV0ZW9yUmVzdWx0Lmluc2VydGVkSWQgPSBtb25nb1Jlc3VsdC51cHNlcnRlZFswXS5faWQ7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG1ldGVvclJlc3VsdC5udW1iZXJBZmZlY3RlZCA9IG1vbmdvUmVzdWx0Lm47XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1ldGVvclJlc3VsdDtcbn07XG5cblxudmFyIE5VTV9PUFRJTUlTVElDX1RSSUVTID0gMztcblxuLy8gZXhwb3NlZCBmb3IgdGVzdGluZ1xuTW9uZ29Db25uZWN0aW9uLl9pc0Nhbm5vdENoYW5nZUlkRXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG5cbiAgLy8gTW9uZ28gMy4yLiogcmV0dXJucyBlcnJvciBhcyBuZXh0IE9iamVjdDpcbiAgLy8ge25hbWU6IFN0cmluZywgY29kZTogTnVtYmVyLCBlcnJtc2c6IFN0cmluZ31cbiAgLy8gT2xkZXIgTW9uZ28gcmV0dXJuczpcbiAgLy8ge25hbWU6IFN0cmluZywgY29kZTogTnVtYmVyLCBlcnI6IFN0cmluZ31cbiAgdmFyIGVycm9yID0gZXJyLmVycm1zZyB8fCBlcnIuZXJyO1xuXG4gIC8vIFdlIGRvbid0IHVzZSB0aGUgZXJyb3IgY29kZSBoZXJlXG4gIC8vIGJlY2F1c2UgdGhlIGVycm9yIGNvZGUgd2Ugb2JzZXJ2ZWQgaXQgcHJvZHVjaW5nICgxNjgzNykgYXBwZWFycyB0byBiZVxuICAvLyBhIGZhciBtb3JlIGdlbmVyaWMgZXJyb3IgY29kZSBiYXNlZCBvbiBleGFtaW5pbmcgdGhlIHNvdXJjZS5cbiAgaWYgKGVycm9yLmluZGV4T2YoJ1RoZSBfaWQgZmllbGQgY2Fubm90IGJlIGNoYW5nZWQnKSA9PT0gMFxuICAgIHx8IGVycm9yLmluZGV4T2YoXCJ0aGUgKGltbXV0YWJsZSkgZmllbGQgJ19pZCcgd2FzIGZvdW5kIHRvIGhhdmUgYmVlbiBhbHRlcmVkIHRvIF9pZFwiKSAhPT0gLTEpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cbnZhciBzaW11bGF0ZVVwc2VydFdpdGhJbnNlcnRlZElkID0gZnVuY3Rpb24gKGNvbGxlY3Rpb24sIHNlbGVjdG9yLCBtb2QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLCBjYWxsYmFjaykge1xuICAvLyBTVFJBVEVHWTogRmlyc3QgdHJ5IGRvaW5nIGFuIHVwc2VydCB3aXRoIGEgZ2VuZXJhdGVkIElELlxuICAvLyBJZiB0aGlzIHRocm93cyBhbiBlcnJvciBhYm91dCBjaGFuZ2luZyB0aGUgSUQgb24gYW4gZXhpc3RpbmcgZG9jdW1lbnRcbiAgLy8gdGhlbiB3aXRob3V0IGFmZmVjdGluZyB0aGUgZGF0YWJhc2UsIHdlIGtub3cgd2Ugc2hvdWxkIHByb2JhYmx5IHRyeVxuICAvLyBhbiB1cGRhdGUgd2l0aG91dCB0aGUgZ2VuZXJhdGVkIElELiBJZiBpdCBhZmZlY3RlZCAwIGRvY3VtZW50cyxcbiAgLy8gdGhlbiB3aXRob3V0IGFmZmVjdGluZyB0aGUgZGF0YWJhc2UsIHdlIHRoZSBkb2N1bWVudCB0aGF0IGZpcnN0XG4gIC8vIGdhdmUgdGhlIGVycm9yIGlzIHByb2JhYmx5IHJlbW92ZWQgYW5kIHdlIG5lZWQgdG8gdHJ5IGFuIGluc2VydCBhZ2FpblxuICAvLyBXZSBnbyBiYWNrIHRvIHN0ZXAgb25lIGFuZCByZXBlYXQuXG4gIC8vIExpa2UgYWxsIFwib3B0aW1pc3RpYyB3cml0ZVwiIHNjaGVtZXMsIHdlIHJlbHkgb24gdGhlIGZhY3QgdGhhdCBpdCdzXG4gIC8vIHVubGlrZWx5IG91ciB3cml0ZXMgd2lsbCBjb250aW51ZSB0byBiZSBpbnRlcmZlcmVkIHdpdGggdW5kZXIgbm9ybWFsXG4gIC8vIGNpcmN1bXN0YW5jZXMgKHRob3VnaCBzdWZmaWNpZW50bHkgaGVhdnkgY29udGVudGlvbiB3aXRoIHdyaXRlcnNcbiAgLy8gZGlzYWdyZWVpbmcgb24gdGhlIGV4aXN0ZW5jZSBvZiBhbiBvYmplY3Qgd2lsbCBjYXVzZSB3cml0ZXMgdG8gZmFpbFxuICAvLyBpbiB0aGVvcnkpLlxuXG4gIHZhciBpbnNlcnRlZElkID0gb3B0aW9ucy5pbnNlcnRlZElkOyAvLyBtdXN0IGV4aXN0XG4gIHZhciBtb25nb09wdHNGb3JVcGRhdGUgPSB7XG4gICAgc2FmZTogdHJ1ZSxcbiAgICBtdWx0aTogb3B0aW9ucy5tdWx0aVxuICB9O1xuICB2YXIgbW9uZ29PcHRzRm9ySW5zZXJ0ID0ge1xuICAgIHNhZmU6IHRydWUsXG4gICAgdXBzZXJ0OiB0cnVlXG4gIH07XG5cbiAgdmFyIHJlcGxhY2VtZW50V2l0aElkID0gT2JqZWN0LmFzc2lnbihcbiAgICByZXBsYWNlVHlwZXMoe19pZDogaW5zZXJ0ZWRJZH0sIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKSxcbiAgICBtb2QpO1xuXG4gIHZhciB0cmllcyA9IE5VTV9PUFRJTUlTVElDX1RSSUVTO1xuXG4gIHZhciBkb1VwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0cmllcy0tO1xuICAgIGlmICghIHRyaWVzKSB7XG4gICAgICBjYWxsYmFjayhuZXcgRXJyb3IoXCJVcHNlcnQgZmFpbGVkIGFmdGVyIFwiICsgTlVNX09QVElNSVNUSUNfVFJJRVMgKyBcIiB0cmllcy5cIikpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb2xsZWN0aW9uLnVwZGF0ZShzZWxlY3RvciwgbW9kLCBtb25nb09wdHNGb3JVcGRhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBiaW5kRW52aXJvbm1lbnRGb3JXcml0ZShmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ICYmIHJlc3VsdC5yZXN1bHQubiAhPSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyQWZmZWN0ZWQ6IHJlc3VsdC5yZXN1bHQublxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvQ29uZGl0aW9uYWxJbnNlcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgIH1cbiAgfTtcblxuICB2YXIgZG9Db25kaXRpb25hbEluc2VydCA9IGZ1bmN0aW9uICgpIHtcbiAgICBjb2xsZWN0aW9uLnVwZGF0ZShzZWxlY3RvciwgcmVwbGFjZW1lbnRXaXRoSWQsIG1vbmdvT3B0c0Zvckluc2VydCxcbiAgICAgICAgICAgICAgICAgICAgICBiaW5kRW52aXJvbm1lbnRGb3JXcml0ZShmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZmlndXJlIG91dCBpZiB0aGlzIGlzIGFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gXCJjYW5ub3QgY2hhbmdlIF9pZCBvZiBkb2N1bWVudFwiIGVycm9yLCBhbmRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgc28sIHRyeSBkb1VwZGF0ZSgpIGFnYWluLCB1cCB0byAzIHRpbWVzLlxuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoTW9uZ29Db25uZWN0aW9uLl9pc0Nhbm5vdENoYW5nZUlkRXJyb3IoZXJyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvVXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlckFmZmVjdGVkOiByZXN1bHQucmVzdWx0LnVwc2VydGVkLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnNlcnRlZElkOiBpbnNlcnRlZElkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gIH07XG5cbiAgZG9VcGRhdGUoKTtcbn07XG5cbl8uZWFjaChbXCJpbnNlcnRcIiwgXCJ1cGRhdGVcIiwgXCJyZW1vdmVcIiwgXCJkcm9wQ29sbGVjdGlvblwiLCBcImRyb3BEYXRhYmFzZVwiXSwgZnVuY3Rpb24gKG1ldGhvZCkge1xuICBNb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbiAoLyogYXJndW1lbnRzICovKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBNZXRlb3Iud3JhcEFzeW5jKHNlbGZbXCJfXCIgKyBtZXRob2RdKS5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuICB9O1xufSk7XG5cbi8vIFhYWCBNb25nb0Nvbm5lY3Rpb24udXBzZXJ0KCkgZG9lcyBub3QgcmV0dXJuIHRoZSBpZCBvZiB0aGUgaW5zZXJ0ZWQgZG9jdW1lbnRcbi8vIHVubGVzcyB5b3Ugc2V0IGl0IGV4cGxpY2l0bHkgaW4gdGhlIHNlbGVjdG9yIG9yIG1vZGlmaWVyIChhcyBhIHJlcGxhY2VtZW50XG4vLyBkb2MpLlxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS51cHNlcnQgPSBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIHNlbGVjdG9yLCBtb2QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLCBjYWxsYmFjaykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiICYmICEgY2FsbGJhY2spIHtcbiAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG5cbiAgcmV0dXJuIHNlbGYudXBkYXRlKGNvbGxlY3Rpb25OYW1lLCBzZWxlY3RvciwgbW9kLFxuICAgICAgICAgICAgICAgICAgICAgXy5leHRlbmQoe30sIG9wdGlvbnMsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgdXBzZXJ0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICBfcmV0dXJuT2JqZWN0OiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICB9KSwgY2FsbGJhY2spO1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5maW5kID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBzZWxlY3Rvciwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpXG4gICAgc2VsZWN0b3IgPSB7fTtcblxuICByZXR1cm4gbmV3IEN1cnNvcihcbiAgICBzZWxmLCBuZXcgQ3Vyc29yRGVzY3JpcHRpb24oY29sbGVjdGlvbk5hbWUsIHNlbGVjdG9yLCBvcHRpb25zKSk7XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLmZpbmRPbmUgPSBmdW5jdGlvbiAoY29sbGVjdGlvbl9uYW1lLCBzZWxlY3RvcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpXG4gICAgc2VsZWN0b3IgPSB7fTtcblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgb3B0aW9ucy5saW1pdCA9IDE7XG4gIHJldHVybiBzZWxmLmZpbmQoY29sbGVjdGlvbl9uYW1lLCBzZWxlY3Rvciwgb3B0aW9ucykuZmV0Y2goKVswXTtcbn07XG5cbi8vIFdlJ2xsIGFjdHVhbGx5IGRlc2lnbiBhbiBpbmRleCBBUEkgbGF0ZXIuIEZvciBub3csIHdlIGp1c3QgcGFzcyB0aHJvdWdoIHRvXG4vLyBNb25nbydzLCBidXQgbWFrZSBpdCBzeW5jaHJvbm91cy5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX2Vuc3VyZUluZGV4ID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBpbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIFdlIGV4cGVjdCB0aGlzIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCBzdGFydHVwLCBub3QgZnJvbSB3aXRoaW4gYSBtZXRob2QsXG4gIC8vIHNvIHdlIGRvbid0IGludGVyYWN0IHdpdGggdGhlIHdyaXRlIGZlbmNlLlxuICB2YXIgY29sbGVjdGlvbiA9IHNlbGYucmF3Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG4gIHZhciBmdXR1cmUgPSBuZXcgRnV0dXJlO1xuICB2YXIgaW5kZXhOYW1lID0gY29sbGVjdGlvbi5lbnN1cmVJbmRleChpbmRleCwgb3B0aW9ucywgZnV0dXJlLnJlc29sdmVyKCkpO1xuICBmdXR1cmUud2FpdCgpO1xufTtcbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX2Ryb3BJbmRleCA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgaW5kZXgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIFRoaXMgZnVuY3Rpb24gaXMgb25seSB1c2VkIGJ5IHRlc3QgY29kZSwgbm90IHdpdGhpbiBhIG1ldGhvZCwgc28gd2UgZG9uJ3RcbiAgLy8gaW50ZXJhY3Qgd2l0aCB0aGUgd3JpdGUgZmVuY2UuXG4gIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcbiAgdmFyIGZ1dHVyZSA9IG5ldyBGdXR1cmU7XG4gIHZhciBpbmRleE5hbWUgPSBjb2xsZWN0aW9uLmRyb3BJbmRleChpbmRleCwgZnV0dXJlLnJlc29sdmVyKCkpO1xuICBmdXR1cmUud2FpdCgpO1xufTtcblxuLy8gQ1VSU09SU1xuXG4vLyBUaGVyZSBhcmUgc2V2ZXJhbCBjbGFzc2VzIHdoaWNoIHJlbGF0ZSB0byBjdXJzb3JzOlxuLy9cbi8vIEN1cnNvckRlc2NyaXB0aW9uIHJlcHJlc2VudHMgdGhlIGFyZ3VtZW50cyB1c2VkIHRvIGNvbnN0cnVjdCBhIGN1cnNvcjpcbi8vIGNvbGxlY3Rpb25OYW1lLCBzZWxlY3RvciwgYW5kIChmaW5kKSBvcHRpb25zLiAgQmVjYXVzZSBpdCBpcyB1c2VkIGFzIGEga2V5XG4vLyBmb3IgY3Vyc29yIGRlLWR1cCwgZXZlcnl0aGluZyBpbiBpdCBzaG91bGQgZWl0aGVyIGJlIEpTT04tc3RyaW5naWZpYWJsZSBvclxuLy8gbm90IGFmZmVjdCBvYnNlcnZlQ2hhbmdlcyBvdXRwdXQgKGVnLCBvcHRpb25zLnRyYW5zZm9ybSBmdW5jdGlvbnMgYXJlIG5vdFxuLy8gc3RyaW5naWZpYWJsZSBidXQgZG8gbm90IGFmZmVjdCBvYnNlcnZlQ2hhbmdlcykuXG4vL1xuLy8gU3luY2hyb25vdXNDdXJzb3IgaXMgYSB3cmFwcGVyIGFyb3VuZCBhIE1vbmdvREIgY3Vyc29yXG4vLyB3aGljaCBpbmNsdWRlcyBmdWxseS1zeW5jaHJvbm91cyB2ZXJzaW9ucyBvZiBmb3JFYWNoLCBldGMuXG4vL1xuLy8gQ3Vyc29yIGlzIHRoZSBjdXJzb3Igb2JqZWN0IHJldHVybmVkIGZyb20gZmluZCgpLCB3aGljaCBpbXBsZW1lbnRzIHRoZVxuLy8gZG9jdW1lbnRlZCBNb25nby5Db2xsZWN0aW9uIGN1cnNvciBBUEkuICBJdCB3cmFwcyBhIEN1cnNvckRlc2NyaXB0aW9uIGFuZCBhXG4vLyBTeW5jaHJvbm91c0N1cnNvciAobGF6aWx5OiBpdCBkb2Vzbid0IGNvbnRhY3QgTW9uZ28gdW50aWwgeW91IGNhbGwgYSBtZXRob2Rcbi8vIGxpa2UgZmV0Y2ggb3IgZm9yRWFjaCBvbiBpdCkuXG4vL1xuLy8gT2JzZXJ2ZUhhbmRsZSBpcyB0aGUgXCJvYnNlcnZlIGhhbmRsZVwiIHJldHVybmVkIGZyb20gb2JzZXJ2ZUNoYW5nZXMuIEl0IGhhcyBhXG4vLyByZWZlcmVuY2UgdG8gYW4gT2JzZXJ2ZU11bHRpcGxleGVyLlxuLy9cbi8vIE9ic2VydmVNdWx0aXBsZXhlciBhbGxvd3MgbXVsdGlwbGUgaWRlbnRpY2FsIE9ic2VydmVIYW5kbGVzIHRvIGJlIGRyaXZlbiBieSBhXG4vLyBzaW5nbGUgb2JzZXJ2ZSBkcml2ZXIuXG4vL1xuLy8gVGhlcmUgYXJlIHR3byBcIm9ic2VydmUgZHJpdmVyc1wiIHdoaWNoIGRyaXZlIE9ic2VydmVNdWx0aXBsZXhlcnM6XG4vLyAgIC0gUG9sbGluZ09ic2VydmVEcml2ZXIgY2FjaGVzIHRoZSByZXN1bHRzIG9mIGEgcXVlcnkgYW5kIHJlcnVucyBpdCB3aGVuXG4vLyAgICAgbmVjZXNzYXJ5LlxuLy8gICAtIE9wbG9nT2JzZXJ2ZURyaXZlciBmb2xsb3dzIHRoZSBNb25nbyBvcGVyYXRpb24gbG9nIHRvIGRpcmVjdGx5IG9ic2VydmVcbi8vICAgICBkYXRhYmFzZSBjaGFuZ2VzLlxuLy8gQm90aCBpbXBsZW1lbnRhdGlvbnMgZm9sbG93IHRoZSBzYW1lIHNpbXBsZSBpbnRlcmZhY2U6IHdoZW4geW91IGNyZWF0ZSB0aGVtLFxuLy8gdGhleSBzdGFydCBzZW5kaW5nIG9ic2VydmVDaGFuZ2VzIGNhbGxiYWNrcyAoYW5kIGEgcmVhZHkoKSBpbnZvY2F0aW9uKSB0b1xuLy8gdGhlaXIgT2JzZXJ2ZU11bHRpcGxleGVyLCBhbmQgeW91IHN0b3AgdGhlbSBieSBjYWxsaW5nIHRoZWlyIHN0b3AoKSBtZXRob2QuXG5cbkN1cnNvckRlc2NyaXB0aW9uID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBzZWxlY3Rvciwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYuY29sbGVjdGlvbk5hbWUgPSBjb2xsZWN0aW9uTmFtZTtcbiAgc2VsZi5zZWxlY3RvciA9IE1vbmdvLkNvbGxlY3Rpb24uX3Jld3JpdGVTZWxlY3RvcihzZWxlY3Rvcik7XG4gIHNlbGYub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG59O1xuXG5DdXJzb3IgPSBmdW5jdGlvbiAobW9uZ28sIGN1cnNvckRlc2NyaXB0aW9uKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBzZWxmLl9tb25nbyA9IG1vbmdvO1xuICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiA9IGN1cnNvckRlc2NyaXB0aW9uO1xuICBzZWxmLl9zeW5jaHJvbm91c0N1cnNvciA9IG51bGw7XG59O1xuXG5fLmVhY2goWydmb3JFYWNoJywgJ21hcCcsICdmZXRjaCcsICdjb3VudCcsIFN5bWJvbC5pdGVyYXRvcl0sIGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgQ3Vyc29yLnByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIFlvdSBjYW4gb25seSBvYnNlcnZlIGEgdGFpbGFibGUgY3Vyc29yLlxuICAgIGlmIChzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRhaWxhYmxlKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGNhbGwgXCIgKyBtZXRob2QgKyBcIiBvbiBhIHRhaWxhYmxlIGN1cnNvclwiKTtcblxuICAgIGlmICghc2VsZi5fc3luY2hyb25vdXNDdXJzb3IpIHtcbiAgICAgIHNlbGYuX3N5bmNocm9ub3VzQ3Vyc29yID0gc2VsZi5fbW9uZ28uX2NyZWF0ZVN5bmNocm9ub3VzQ3Vyc29yKFxuICAgICAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiwge1xuICAgICAgICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBcInNlbGZcIiBhcmd1bWVudCB0byBmb3JFYWNoL21hcCBjYWxsYmFja3MgaXMgdGhlXG4gICAgICAgICAgLy8gQ3Vyc29yLCBub3QgdGhlIFN5bmNocm9ub3VzQ3Vyc29yLlxuICAgICAgICAgIHNlbGZGb3JJdGVyYXRpb246IHNlbGYsXG4gICAgICAgICAgdXNlVHJhbnNmb3JtOiB0cnVlXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBzZWxmLl9zeW5jaHJvbm91c0N1cnNvclttZXRob2RdLmFwcGx5KFxuICAgICAgc2VsZi5fc3luY2hyb25vdXNDdXJzb3IsIGFyZ3VtZW50cyk7XG4gIH07XG59KTtcblxuLy8gU2luY2Ugd2UgZG9uJ3QgYWN0dWFsbHkgaGF2ZSBhIFwibmV4dE9iamVjdFwiIGludGVyZmFjZSwgdGhlcmUncyByZWFsbHkgbm9cbi8vIHJlYXNvbiB0byBoYXZlIGEgXCJyZXdpbmRcIiBpbnRlcmZhY2UuICBBbGwgaXQgZGlkIHdhcyBtYWtlIG11bHRpcGxlIGNhbGxzXG4vLyB0byBmZXRjaC9tYXAvZm9yRWFjaCByZXR1cm4gbm90aGluZyB0aGUgc2Vjb25kIHRpbWUuXG4vLyBYWFggQ09NUEFUIFdJVEggMC44LjFcbkN1cnNvci5wcm90b3R5cGUucmV3aW5kID0gZnVuY3Rpb24gKCkge1xufTtcblxuQ3Vyc29yLnByb3RvdHlwZS5nZXRUcmFuc2Zvcm0gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRyYW5zZm9ybTtcbn07XG5cbi8vIFdoZW4geW91IGNhbGwgTWV0ZW9yLnB1Ymxpc2goKSB3aXRoIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgQ3Vyc29yLCB3ZSBuZWVkXG4vLyB0byB0cmFuc211dGUgaXQgaW50byB0aGUgZXF1aXZhbGVudCBzdWJzY3JpcHRpb24uICBUaGlzIGlzIHRoZSBmdW5jdGlvbiB0aGF0XG4vLyBkb2VzIHRoYXQuXG5cbkN1cnNvci5wcm90b3R5cGUuX3B1Ymxpc2hDdXJzb3IgPSBmdW5jdGlvbiAoc3ViKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGNvbGxlY3Rpb24gPSBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZTtcbiAgcmV0dXJuIE1vbmdvLkNvbGxlY3Rpb24uX3B1Ymxpc2hDdXJzb3Ioc2VsZiwgc3ViLCBjb2xsZWN0aW9uKTtcbn07XG5cbi8vIFVzZWQgdG8gZ3VhcmFudGVlIHRoYXQgcHVibGlzaCBmdW5jdGlvbnMgcmV0dXJuIGF0IG1vc3Qgb25lIGN1cnNvciBwZXJcbi8vIGNvbGxlY3Rpb24uIFByaXZhdGUsIGJlY2F1c2Ugd2UgbWlnaHQgbGF0ZXIgaGF2ZSBjdXJzb3JzIHRoYXQgaW5jbHVkZVxuLy8gZG9jdW1lbnRzIGZyb20gbXVsdGlwbGUgY29sbGVjdGlvbnMgc29tZWhvdy5cbkN1cnNvci5wcm90b3R5cGUuX2dldENvbGxlY3Rpb25OYW1lID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZTtcbn07XG5cbkN1cnNvci5wcm90b3R5cGUub2JzZXJ2ZSA9IGZ1bmN0aW9uIChjYWxsYmFja3MpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gTG9jYWxDb2xsZWN0aW9uLl9vYnNlcnZlRnJvbU9ic2VydmVDaGFuZ2VzKHNlbGYsIGNhbGxiYWNrcyk7XG59O1xuXG5DdXJzb3IucHJvdG90eXBlLm9ic2VydmVDaGFuZ2VzID0gZnVuY3Rpb24gKGNhbGxiYWNrcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBtZXRob2RzID0gW1xuICAgICdhZGRlZEF0JyxcbiAgICAnYWRkZWQnLFxuICAgICdjaGFuZ2VkQXQnLFxuICAgICdjaGFuZ2VkJyxcbiAgICAncmVtb3ZlZEF0JyxcbiAgICAncmVtb3ZlZCcsXG4gICAgJ21vdmVkVG8nXG4gIF07XG4gIHZhciBvcmRlcmVkID0gTG9jYWxDb2xsZWN0aW9uLl9vYnNlcnZlQ2hhbmdlc0NhbGxiYWNrc0FyZU9yZGVyZWQoY2FsbGJhY2tzKTtcblxuICAvLyBYWFg6IENhbiB3ZSBmaW5kIG91dCBpZiBjYWxsYmFja3MgYXJlIGZyb20gb2JzZXJ2ZT9cbiAgdmFyIGV4Y2VwdGlvbk5hbWUgPSAnIG9ic2VydmUvb2JzZXJ2ZUNoYW5nZXMgY2FsbGJhY2snO1xuICBtZXRob2RzLmZvckVhY2goZnVuY3Rpb24gKG1ldGhvZCkge1xuICAgIGlmIChjYWxsYmFja3NbbWV0aG9kXSAmJiB0eXBlb2YgY2FsbGJhY2tzW21ldGhvZF0gPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBjYWxsYmFja3NbbWV0aG9kXSA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoY2FsbGJhY2tzW21ldGhvZF0sIG1ldGhvZCArIGV4Y2VwdGlvbk5hbWUpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHNlbGYuX21vbmdvLl9vYnNlcnZlQ2hhbmdlcyhcbiAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiwgb3JkZXJlZCwgY2FsbGJhY2tzKTtcbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX2NyZWF0ZVN5bmNocm9ub3VzQ3Vyc29yID0gZnVuY3Rpb24oXG4gICAgY3Vyc29yRGVzY3JpcHRpb24sIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBvcHRpb25zID0gXy5waWNrKG9wdGlvbnMgfHwge30sICdzZWxmRm9ySXRlcmF0aW9uJywgJ3VzZVRyYW5zZm9ybScpO1xuXG4gIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGN1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lKTtcbiAgdmFyIGN1cnNvck9wdGlvbnMgPSBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zO1xuICB2YXIgbW9uZ29PcHRpb25zID0ge1xuICAgIHNvcnQ6IGN1cnNvck9wdGlvbnMuc29ydCxcbiAgICBsaW1pdDogY3Vyc29yT3B0aW9ucy5saW1pdCxcbiAgICBza2lwOiBjdXJzb3JPcHRpb25zLnNraXAsXG4gICAgcHJvamVjdGlvbjogY3Vyc29yT3B0aW9ucy5maWVsZHNcbiAgfTtcblxuICAvLyBEbyB3ZSB3YW50IGEgdGFpbGFibGUgY3Vyc29yICh3aGljaCBvbmx5IHdvcmtzIG9uIGNhcHBlZCBjb2xsZWN0aW9ucyk/XG4gIGlmIChjdXJzb3JPcHRpb25zLnRhaWxhYmxlKSB7XG4gICAgLy8gV2Ugd2FudCBhIHRhaWxhYmxlIGN1cnNvci4uLlxuICAgIG1vbmdvT3B0aW9ucy50YWlsYWJsZSA9IHRydWU7XG4gICAgLy8gLi4uIGFuZCBmb3IgdGhlIHNlcnZlciB0byB3YWl0IGEgYml0IGlmIGFueSBnZXRNb3JlIGhhcyBubyBkYXRhIChyYXRoZXJcbiAgICAvLyB0aGFuIG1ha2luZyB1cyBwdXQgdGhlIHJlbGV2YW50IHNsZWVwcyBpbiB0aGUgY2xpZW50KS4uLlxuICAgIG1vbmdvT3B0aW9ucy5hd2FpdGRhdGEgPSB0cnVlO1xuICAgIC8vIC4uLiBhbmQgdG8ga2VlcCBxdWVyeWluZyB0aGUgc2VydmVyIGluZGVmaW5pdGVseSByYXRoZXIgdGhhbiBqdXN0IDUgdGltZXNcbiAgICAvLyBpZiB0aGVyZSdzIG5vIG1vcmUgZGF0YS5cbiAgICBtb25nb09wdGlvbnMubnVtYmVyT2ZSZXRyaWVzID0gLTE7XG4gICAgLy8gQW5kIGlmIHRoaXMgaXMgb24gdGhlIG9wbG9nIGNvbGxlY3Rpb24gYW5kIHRoZSBjdXJzb3Igc3BlY2lmaWVzIGEgJ3RzJyxcbiAgICAvLyB0aGVuIHNldCB0aGUgdW5kb2N1bWVudGVkIG9wbG9nIHJlcGxheSBmbGFnLCB3aGljaCBkb2VzIGEgc3BlY2lhbCBzY2FuIHRvXG4gICAgLy8gZmluZCB0aGUgZmlyc3QgZG9jdW1lbnQgKGluc3RlYWQgb2YgY3JlYXRpbmcgYW4gaW5kZXggb24gdHMpLiBUaGlzIGlzIGFcbiAgICAvLyB2ZXJ5IGhhcmQtY29kZWQgTW9uZ28gZmxhZyB3aGljaCBvbmx5IHdvcmtzIG9uIHRoZSBvcGxvZyBjb2xsZWN0aW9uIGFuZFxuICAgIC8vIG9ubHkgd29ya3Mgd2l0aCB0aGUgdHMgZmllbGQuXG4gICAgaWYgKGN1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lID09PSBPUExPR19DT0xMRUNUSU9OICYmXG4gICAgICAgIGN1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yLnRzKSB7XG4gICAgICBtb25nb09wdGlvbnMub3Bsb2dSZXBsYXkgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHZhciBkYkN1cnNvciA9IGNvbGxlY3Rpb24uZmluZChcbiAgICByZXBsYWNlVHlwZXMoY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IsIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKSxcbiAgICBtb25nb09wdGlvbnMpO1xuXG4gIGlmICh0eXBlb2YgY3Vyc29yT3B0aW9ucy5tYXhUaW1lTXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgZGJDdXJzb3IgPSBkYkN1cnNvci5tYXhUaW1lTVMoY3Vyc29yT3B0aW9ucy5tYXhUaW1lTXMpO1xuICB9XG4gIGlmICh0eXBlb2YgY3Vyc29yT3B0aW9ucy5oaW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGRiQ3Vyc29yID0gZGJDdXJzb3IuaGludChjdXJzb3JPcHRpb25zLmhpbnQpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBTeW5jaHJvbm91c0N1cnNvcihkYkN1cnNvciwgY3Vyc29yRGVzY3JpcHRpb24sIG9wdGlvbnMpO1xufTtcblxudmFyIFN5bmNocm9ub3VzQ3Vyc29yID0gZnVuY3Rpb24gKGRiQ3Vyc29yLCBjdXJzb3JEZXNjcmlwdGlvbiwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIG9wdGlvbnMgPSBfLnBpY2sob3B0aW9ucyB8fCB7fSwgJ3NlbGZGb3JJdGVyYXRpb24nLCAndXNlVHJhbnNmb3JtJyk7XG5cbiAgc2VsZi5fZGJDdXJzb3IgPSBkYkN1cnNvcjtcbiAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24gPSBjdXJzb3JEZXNjcmlwdGlvbjtcbiAgLy8gVGhlIFwic2VsZlwiIGFyZ3VtZW50IHBhc3NlZCB0byBmb3JFYWNoL21hcCBjYWxsYmFja3MuIElmIHdlJ3JlIHdyYXBwZWRcbiAgLy8gaW5zaWRlIGEgdXNlci12aXNpYmxlIEN1cnNvciwgd2Ugd2FudCB0byBwcm92aWRlIHRoZSBvdXRlciBjdXJzb3IhXG4gIHNlbGYuX3NlbGZGb3JJdGVyYXRpb24gPSBvcHRpb25zLnNlbGZGb3JJdGVyYXRpb24gfHwgc2VsZjtcbiAgaWYgKG9wdGlvbnMudXNlVHJhbnNmb3JtICYmIGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudHJhbnNmb3JtKSB7XG4gICAgc2VsZi5fdHJhbnNmb3JtID0gTG9jYWxDb2xsZWN0aW9uLndyYXBUcmFuc2Zvcm0oXG4gICAgICBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRyYW5zZm9ybSk7XG4gIH0gZWxzZSB7XG4gICAgc2VsZi5fdHJhbnNmb3JtID0gbnVsbDtcbiAgfVxuXG4gIHNlbGYuX3N5bmNocm9ub3VzQ291bnQgPSBGdXR1cmUud3JhcChkYkN1cnNvci5jb3VudC5iaW5kKGRiQ3Vyc29yKSk7XG4gIHNlbGYuX3Zpc2l0ZWRJZHMgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbn07XG5cbl8uZXh0ZW5kKFN5bmNocm9ub3VzQ3Vyc29yLnByb3RvdHlwZSwge1xuICAvLyBSZXR1cm5zIGEgUHJvbWlzZSBmb3IgdGhlIG5leHQgb2JqZWN0IGZyb20gdGhlIHVuZGVybHlpbmcgY3Vyc29yIChiZWZvcmVcbiAgLy8gdGhlIE1vbmdvLT5NZXRlb3IgdHlwZSByZXBsYWNlbWVudCkuXG4gIF9yYXdOZXh0T2JqZWN0UHJvbWlzZTogZnVuY3Rpb24gKCkge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBzZWxmLl9kYkN1cnNvci5uZXh0KChlcnIsIGRvYykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb2x2ZShkb2MpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBSZXR1cm5zIGEgUHJvbWlzZSBmb3IgdGhlIG5leHQgb2JqZWN0IGZyb20gdGhlIGN1cnNvciwgc2tpcHBpbmcgdGhvc2Ugd2hvc2VcbiAgLy8gSURzIHdlJ3ZlIGFscmVhZHkgc2VlbiBhbmQgcmVwbGFjaW5nIE1vbmdvIGF0b21zIHdpdGggTWV0ZW9yIGF0b21zLlxuICBfbmV4dE9iamVjdFByb21pc2U6IGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgdmFyIGRvYyA9IGF3YWl0IHNlbGYuX3Jhd05leHRPYmplY3RQcm9taXNlKCk7XG5cbiAgICAgIGlmICghZG9jKSByZXR1cm4gbnVsbDtcbiAgICAgIGRvYyA9IHJlcGxhY2VUeXBlcyhkb2MsIHJlcGxhY2VNb25nb0F0b21XaXRoTWV0ZW9yKTtcblxuICAgICAgaWYgKCFzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRhaWxhYmxlICYmIF8uaGFzKGRvYywgJ19pZCcpKSB7XG4gICAgICAgIC8vIERpZCBNb25nbyBnaXZlIHVzIGR1cGxpY2F0ZSBkb2N1bWVudHMgaW4gdGhlIHNhbWUgY3Vyc29yPyBJZiBzbyxcbiAgICAgICAgLy8gaWdub3JlIHRoaXMgb25lLiAoRG8gdGhpcyBiZWZvcmUgdGhlIHRyYW5zZm9ybSwgc2luY2UgdHJhbnNmb3JtIG1pZ2h0XG4gICAgICAgIC8vIHJldHVybiBzb21lIHVucmVsYXRlZCB2YWx1ZS4pIFdlIGRvbid0IGRvIHRoaXMgZm9yIHRhaWxhYmxlIGN1cnNvcnMsXG4gICAgICAgIC8vIGJlY2F1c2Ugd2Ugd2FudCB0byBtYWludGFpbiBPKDEpIG1lbW9yeSB1c2FnZS4gQW5kIGlmIHRoZXJlIGlzbid0IF9pZFxuICAgICAgICAvLyBmb3Igc29tZSByZWFzb24gKG1heWJlIGl0J3MgdGhlIG9wbG9nKSwgdGhlbiB3ZSBkb24ndCBkbyB0aGlzIGVpdGhlci5cbiAgICAgICAgLy8gKEJlIGNhcmVmdWwgdG8gZG8gdGhpcyBmb3IgZmFsc2V5IGJ1dCBleGlzdGluZyBfaWQsIHRob3VnaC4pXG4gICAgICAgIGlmIChzZWxmLl92aXNpdGVkSWRzLmhhcyhkb2MuX2lkKSkgY29udGludWU7XG4gICAgICAgIHNlbGYuX3Zpc2l0ZWRJZHMuc2V0KGRvYy5faWQsIHRydWUpO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2VsZi5fdHJhbnNmb3JtKVxuICAgICAgICBkb2MgPSBzZWxmLl90cmFuc2Zvcm0oZG9jKTtcblxuICAgICAgcmV0dXJuIGRvYztcbiAgICB9XG4gIH0sXG5cbiAgLy8gUmV0dXJucyBhIHByb21pc2Ugd2hpY2ggaXMgcmVzb2x2ZWQgd2l0aCB0aGUgbmV4dCBvYmplY3QgKGxpa2Ugd2l0aFxuICAvLyBfbmV4dE9iamVjdFByb21pc2UpIG9yIHJlamVjdGVkIGlmIHRoZSBjdXJzb3IgZG9lc24ndCByZXR1cm4gd2l0aGluXG4gIC8vIHRpbWVvdXRNUyBtcy5cbiAgX25leHRPYmplY3RQcm9taXNlV2l0aFRpbWVvdXQ6IGZ1bmN0aW9uICh0aW1lb3V0TVMpIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBpZiAoIXRpbWVvdXRNUykge1xuICAgICAgcmV0dXJuIHNlbGYuX25leHRPYmplY3RQcm9taXNlKCk7XG4gICAgfVxuICAgIGNvbnN0IG5leHRPYmplY3RQcm9taXNlID0gc2VsZi5fbmV4dE9iamVjdFByb21pc2UoKTtcbiAgICBjb25zdCB0aW1lb3V0RXJyID0gbmV3IEVycm9yKCdDbGllbnQtc2lkZSB0aW1lb3V0IHdhaXRpbmcgZm9yIG5leHQgb2JqZWN0Jyk7XG4gICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICByZWplY3QodGltZW91dEVycik7XG4gICAgICB9LCB0aW1lb3V0TVMpO1xuICAgIH0pO1xuICAgIHJldHVybiBQcm9taXNlLnJhY2UoW25leHRPYmplY3RQcm9taXNlLCB0aW1lb3V0UHJvbWlzZV0pXG4gICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICBpZiAoZXJyID09PSB0aW1lb3V0RXJyKSB7XG4gICAgICAgICAgc2VsZi5jbG9zZSgpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH0pO1xuICB9LFxuXG4gIF9uZXh0T2JqZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBzZWxmLl9uZXh0T2JqZWN0UHJvbWlzZSgpLmF3YWl0KCk7XG4gIH0sXG5cbiAgZm9yRWFjaDogZnVuY3Rpb24gKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gR2V0IGJhY2sgdG8gdGhlIGJlZ2lubmluZy5cbiAgICBzZWxmLl9yZXdpbmQoKTtcblxuICAgIC8vIFdlIGltcGxlbWVudCB0aGUgbG9vcCBvdXJzZWxmIGluc3RlYWQgb2YgdXNpbmcgc2VsZi5fZGJDdXJzb3IuZWFjaCxcbiAgICAvLyBiZWNhdXNlIFwiZWFjaFwiIHdpbGwgY2FsbCBpdHMgY2FsbGJhY2sgb3V0c2lkZSBvZiBhIGZpYmVyIHdoaWNoIG1ha2VzIGl0XG4gICAgLy8gbXVjaCBtb3JlIGNvbXBsZXggdG8gbWFrZSB0aGlzIGZ1bmN0aW9uIHN5bmNocm9ub3VzLlxuICAgIHZhciBpbmRleCA9IDA7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHZhciBkb2MgPSBzZWxmLl9uZXh0T2JqZWN0KCk7XG4gICAgICBpZiAoIWRvYykgcmV0dXJuO1xuICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBkb2MsIGluZGV4KyssIHNlbGYuX3NlbGZGb3JJdGVyYXRpb24pO1xuICAgIH1cbiAgfSxcblxuICAvLyBYWFggQWxsb3cgb3ZlcmxhcHBpbmcgY2FsbGJhY2sgZXhlY3V0aW9ucyBpZiBjYWxsYmFjayB5aWVsZHMuXG4gIG1hcDogZnVuY3Rpb24gKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBzZWxmLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaW5kZXgpIHtcbiAgICAgIHJlcy5wdXNoKGNhbGxiYWNrLmNhbGwodGhpc0FyZywgZG9jLCBpbmRleCwgc2VsZi5fc2VsZkZvckl0ZXJhdGlvbikpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG4gIH0sXG5cbiAgX3Jld2luZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIGtub3duIHRvIGJlIHN5bmNocm9ub3VzXG4gICAgc2VsZi5fZGJDdXJzb3IucmV3aW5kKCk7XG5cbiAgICBzZWxmLl92aXNpdGVkSWRzID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gIH0sXG5cbiAgLy8gTW9zdGx5IHVzYWJsZSBmb3IgdGFpbGFibGUgY3Vyc29ycy5cbiAgY2xvc2U6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBzZWxmLl9kYkN1cnNvci5jbG9zZSgpO1xuICB9LFxuXG4gIGZldGNoOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBzZWxmLm1hcChfLmlkZW50aXR5KTtcbiAgfSxcblxuICBjb3VudDogZnVuY3Rpb24gKGFwcGx5U2tpcExpbWl0ID0gZmFsc2UpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHNlbGYuX3N5bmNocm9ub3VzQ291bnQoYXBwbHlTa2lwTGltaXQpLndhaXQoKTtcbiAgfSxcblxuICAvLyBUaGlzIG1ldGhvZCBpcyBOT1Qgd3JhcHBlZCBpbiBDdXJzb3IuXG4gIGdldFJhd09iamVjdHM6IGZ1bmN0aW9uIChvcmRlcmVkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChvcmRlcmVkKSB7XG4gICAgICByZXR1cm4gc2VsZi5mZXRjaCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcmVzdWx0cyA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICAgICAgc2VsZi5mb3JFYWNoKGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgcmVzdWx0cy5zZXQoZG9jLl9pZCwgZG9jKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfVxuICB9XG59KTtcblxuU3luY2hyb25vdXNDdXJzb3IucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICAvLyBHZXQgYmFjayB0byB0aGUgYmVnaW5uaW5nLlxuICBzZWxmLl9yZXdpbmQoKTtcblxuICByZXR1cm4ge1xuICAgIG5leHQoKSB7XG4gICAgICBjb25zdCBkb2MgPSBzZWxmLl9uZXh0T2JqZWN0KCk7XG4gICAgICByZXR1cm4gZG9jID8ge1xuICAgICAgICB2YWx1ZTogZG9jXG4gICAgICB9IDoge1xuICAgICAgICBkb25lOiB0cnVlXG4gICAgICB9O1xuICAgIH1cbiAgfTtcbn07XG5cbi8vIFRhaWxzIHRoZSBjdXJzb3IgZGVzY3JpYmVkIGJ5IGN1cnNvckRlc2NyaXB0aW9uLCBtb3N0IGxpa2VseSBvbiB0aGVcbi8vIG9wbG9nLiBDYWxscyBkb2NDYWxsYmFjayB3aXRoIGVhY2ggZG9jdW1lbnQgZm91bmQuIElnbm9yZXMgZXJyb3JzIGFuZCBqdXN0XG4vLyByZXN0YXJ0cyB0aGUgdGFpbCBvbiBlcnJvci5cbi8vXG4vLyBJZiB0aW1lb3V0TVMgaXMgc2V0LCB0aGVuIGlmIHdlIGRvbid0IGdldCBhIG5ldyBkb2N1bWVudCBldmVyeSB0aW1lb3V0TVMsXG4vLyBraWxsIGFuZCByZXN0YXJ0IHRoZSBjdXJzb3IuIFRoaXMgaXMgcHJpbWFyaWx5IGEgd29ya2Fyb3VuZCBmb3IgIzg1OTguXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLnRhaWwgPSBmdW5jdGlvbiAoY3Vyc29yRGVzY3JpcHRpb24sIGRvY0NhbGxiYWNrLCB0aW1lb3V0TVMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoIWN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudGFpbGFibGUpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuIG9ubHkgdGFpbCBhIHRhaWxhYmxlIGN1cnNvclwiKTtcblxuICB2YXIgY3Vyc29yID0gc2VsZi5fY3JlYXRlU3luY2hyb25vdXNDdXJzb3IoY3Vyc29yRGVzY3JpcHRpb24pO1xuXG4gIHZhciBzdG9wcGVkID0gZmFsc2U7XG4gIHZhciBsYXN0VFM7XG4gIHZhciBsb29wID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBkb2MgPSBudWxsO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBpZiAoc3RvcHBlZClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgdHJ5IHtcbiAgICAgICAgZG9jID0gY3Vyc29yLl9uZXh0T2JqZWN0UHJvbWlzZVdpdGhUaW1lb3V0KHRpbWVvdXRNUykuYXdhaXQoKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBUaGVyZSdzIG5vIGdvb2Qgd2F5IHRvIGZpZ3VyZSBvdXQgaWYgdGhpcyB3YXMgYWN0dWFsbHkgYW4gZXJyb3IgZnJvbVxuICAgICAgICAvLyBNb25nbywgb3IganVzdCBjbGllbnQtc2lkZSAoaW5jbHVkaW5nIG91ciBvd24gdGltZW91dCBlcnJvcikuIEFoXG4gICAgICAgIC8vIHdlbGwuIEJ1dCBlaXRoZXIgd2F5LCB3ZSBuZWVkIHRvIHJldHJ5IHRoZSBjdXJzb3IgKHVubGVzcyB0aGUgZmFpbHVyZVxuICAgICAgICAvLyB3YXMgYmVjYXVzZSB0aGUgb2JzZXJ2ZSBnb3Qgc3RvcHBlZCkuXG4gICAgICAgIGRvYyA9IG51bGw7XG4gICAgICB9XG4gICAgICAvLyBTaW5jZSB3ZSBhd2FpdGVkIGEgcHJvbWlzZSBhYm92ZSwgd2UgbmVlZCB0byBjaGVjayBhZ2FpbiB0byBzZWUgaWZcbiAgICAgIC8vIHdlJ3ZlIGJlZW4gc3RvcHBlZCBiZWZvcmUgY2FsbGluZyB0aGUgY2FsbGJhY2suXG4gICAgICBpZiAoc3RvcHBlZClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgaWYgKGRvYykge1xuICAgICAgICAvLyBJZiBhIHRhaWxhYmxlIGN1cnNvciBjb250YWlucyBhIFwidHNcIiBmaWVsZCwgdXNlIGl0IHRvIHJlY3JlYXRlIHRoZVxuICAgICAgICAvLyBjdXJzb3Igb24gZXJyb3IuIChcInRzXCIgaXMgYSBzdGFuZGFyZCB0aGF0IE1vbmdvIHVzZXMgaW50ZXJuYWxseSBmb3JcbiAgICAgICAgLy8gdGhlIG9wbG9nLCBhbmQgdGhlcmUncyBhIHNwZWNpYWwgZmxhZyB0aGF0IGxldHMgeW91IGRvIGJpbmFyeSBzZWFyY2hcbiAgICAgICAgLy8gb24gaXQgaW5zdGVhZCBvZiBuZWVkaW5nIHRvIHVzZSBhbiBpbmRleC4pXG4gICAgICAgIGxhc3RUUyA9IGRvYy50cztcbiAgICAgICAgZG9jQ2FsbGJhY2soZG9jKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBuZXdTZWxlY3RvciA9IF8uY2xvbmUoY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IpO1xuICAgICAgICBpZiAobGFzdFRTKSB7XG4gICAgICAgICAgbmV3U2VsZWN0b3IudHMgPSB7JGd0OiBsYXN0VFN9O1xuICAgICAgICB9XG4gICAgICAgIGN1cnNvciA9IHNlbGYuX2NyZWF0ZVN5bmNocm9ub3VzQ3Vyc29yKG5ldyBDdXJzb3JEZXNjcmlwdGlvbihcbiAgICAgICAgICBjdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZSxcbiAgICAgICAgICBuZXdTZWxlY3RvcixcbiAgICAgICAgICBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zKSk7XG4gICAgICAgIC8vIE1vbmdvIGZhaWxvdmVyIHRha2VzIG1hbnkgc2Vjb25kcy4gIFJldHJ5IGluIGEgYml0LiAgKFdpdGhvdXQgdGhpc1xuICAgICAgICAvLyBzZXRUaW1lb3V0LCB3ZSBwZWcgdGhlIENQVSBhdCAxMDAlIGFuZCBuZXZlciBub3RpY2UgdGhlIGFjdHVhbFxuICAgICAgICAvLyBmYWlsb3Zlci5cbiAgICAgICAgTWV0ZW9yLnNldFRpbWVvdXQobG9vcCwgMTAwKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIE1ldGVvci5kZWZlcihsb29wKTtcblxuICByZXR1cm4ge1xuICAgIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHN0b3BwZWQgPSB0cnVlO1xuICAgICAgY3Vyc29yLmNsb3NlKCk7XG4gICAgfVxuICB9O1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fb2JzZXJ2ZUNoYW5nZXMgPSBmdW5jdGlvbiAoXG4gICAgY3Vyc29yRGVzY3JpcHRpb24sIG9yZGVyZWQsIGNhbGxiYWNrcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudGFpbGFibGUpIHtcbiAgICByZXR1cm4gc2VsZi5fb2JzZXJ2ZUNoYW5nZXNUYWlsYWJsZShjdXJzb3JEZXNjcmlwdGlvbiwgb3JkZXJlZCwgY2FsbGJhY2tzKTtcbiAgfVxuXG4gIC8vIFlvdSBtYXkgbm90IGZpbHRlciBvdXQgX2lkIHdoZW4gb2JzZXJ2aW5nIGNoYW5nZXMsIGJlY2F1c2UgdGhlIGlkIGlzIGEgY29yZVxuICAvLyBwYXJ0IG9mIHRoZSBvYnNlcnZlQ2hhbmdlcyBBUEkuXG4gIGlmIChjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLmZpZWxkcyAmJlxuICAgICAgKGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMuZmllbGRzLl9pZCA9PT0gMCB8fFxuICAgICAgIGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMuZmllbGRzLl9pZCA9PT0gZmFsc2UpKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJZb3UgbWF5IG5vdCBvYnNlcnZlIGEgY3Vyc29yIHdpdGgge2ZpZWxkczoge19pZDogMH19XCIpO1xuICB9XG5cbiAgdmFyIG9ic2VydmVLZXkgPSBFSlNPTi5zdHJpbmdpZnkoXG4gICAgXy5leHRlbmQoe29yZGVyZWQ6IG9yZGVyZWR9LCBjdXJzb3JEZXNjcmlwdGlvbikpO1xuXG4gIHZhciBtdWx0aXBsZXhlciwgb2JzZXJ2ZURyaXZlcjtcbiAgdmFyIGZpcnN0SGFuZGxlID0gZmFsc2U7XG5cbiAgLy8gRmluZCBhIG1hdGNoaW5nIE9ic2VydmVNdWx0aXBsZXhlciwgb3IgY3JlYXRlIGEgbmV3IG9uZS4gVGhpcyBuZXh0IGJsb2NrIGlzXG4gIC8vIGd1YXJhbnRlZWQgdG8gbm90IHlpZWxkIChhbmQgaXQgZG9lc24ndCBjYWxsIGFueXRoaW5nIHRoYXQgY2FuIG9ic2VydmUgYVxuICAvLyBuZXcgcXVlcnkpLCBzbyBubyBvdGhlciBjYWxscyB0byB0aGlzIGZ1bmN0aW9uIGNhbiBpbnRlcmxlYXZlIHdpdGggaXQuXG4gIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoXy5oYXMoc2VsZi5fb2JzZXJ2ZU11bHRpcGxleGVycywgb2JzZXJ2ZUtleSkpIHtcbiAgICAgIG11bHRpcGxleGVyID0gc2VsZi5fb2JzZXJ2ZU11bHRpcGxleGVyc1tvYnNlcnZlS2V5XTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmlyc3RIYW5kbGUgPSB0cnVlO1xuICAgICAgLy8gQ3JlYXRlIGEgbmV3IE9ic2VydmVNdWx0aXBsZXhlci5cbiAgICAgIG11bHRpcGxleGVyID0gbmV3IE9ic2VydmVNdWx0aXBsZXhlcih7XG4gICAgICAgIG9yZGVyZWQ6IG9yZGVyZWQsXG4gICAgICAgIG9uU3RvcDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGRlbGV0ZSBzZWxmLl9vYnNlcnZlTXVsdGlwbGV4ZXJzW29ic2VydmVLZXldO1xuICAgICAgICAgIG9ic2VydmVEcml2ZXIuc3RvcCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHNlbGYuX29ic2VydmVNdWx0aXBsZXhlcnNbb2JzZXJ2ZUtleV0gPSBtdWx0aXBsZXhlcjtcbiAgICB9XG4gIH0pO1xuXG4gIHZhciBvYnNlcnZlSGFuZGxlID0gbmV3IE9ic2VydmVIYW5kbGUobXVsdGlwbGV4ZXIsIGNhbGxiYWNrcyk7XG5cbiAgaWYgKGZpcnN0SGFuZGxlKSB7XG4gICAgdmFyIG1hdGNoZXIsIHNvcnRlcjtcbiAgICB2YXIgY2FuVXNlT3Bsb2cgPSBfLmFsbChbXG4gICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIEF0IGEgYmFyZSBtaW5pbXVtLCB1c2luZyB0aGUgb3Bsb2cgcmVxdWlyZXMgdXMgdG8gaGF2ZSBhbiBvcGxvZywgdG9cbiAgICAgICAgLy8gd2FudCB1bm9yZGVyZWQgY2FsbGJhY2tzLCBhbmQgdG8gbm90IHdhbnQgYSBjYWxsYmFjayBvbiB0aGUgcG9sbHNcbiAgICAgICAgLy8gdGhhdCB3b24ndCBoYXBwZW4uXG4gICAgICAgIHJldHVybiBzZWxmLl9vcGxvZ0hhbmRsZSAmJiAhb3JkZXJlZCAmJlxuICAgICAgICAgICFjYWxsYmFja3MuX3Rlc3RPbmx5UG9sbENhbGxiYWNrO1xuICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBXZSBuZWVkIHRvIGJlIGFibGUgdG8gY29tcGlsZSB0aGUgc2VsZWN0b3IuIEZhbGwgYmFjayB0byBwb2xsaW5nIGZvclxuICAgICAgICAvLyBzb21lIG5ld2ZhbmdsZWQgJHNlbGVjdG9yIHRoYXQgbWluaW1vbmdvIGRvZXNuJ3Qgc3VwcG9ydCB5ZXQuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbWF0Y2hlciA9IG5ldyBNaW5pbW9uZ28uTWF0Y2hlcihjdXJzb3JEZXNjcmlwdGlvbi5zZWxlY3Rvcik7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAvLyBYWFggbWFrZSBhbGwgY29tcGlsYXRpb24gZXJyb3JzIE1pbmltb25nb0Vycm9yIG9yIHNvbWV0aGluZ1xuICAgICAgICAgIC8vICAgICBzbyB0aGF0IHRoaXMgZG9lc24ndCBpZ25vcmUgdW5yZWxhdGVkIGV4Y2VwdGlvbnNcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gLi4uIGFuZCB0aGUgc2VsZWN0b3IgaXRzZWxmIG5lZWRzIHRvIHN1cHBvcnQgb3Bsb2cuXG4gICAgICAgIHJldHVybiBPcGxvZ09ic2VydmVEcml2ZXIuY3Vyc29yU3VwcG9ydGVkKGN1cnNvckRlc2NyaXB0aW9uLCBtYXRjaGVyKTtcbiAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gQW5kIHdlIG5lZWQgdG8gYmUgYWJsZSB0byBjb21waWxlIHRoZSBzb3J0LCBpZiBhbnkuICBlZywgY2FuJ3QgYmVcbiAgICAgICAgLy8geyRuYXR1cmFsOiAxfS5cbiAgICAgICAgaWYgKCFjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnNvcnQpXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc29ydGVyID0gbmV3IE1pbmltb25nby5Tb3J0ZXIoY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5zb3J0KTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIC8vIFhYWCBtYWtlIGFsbCBjb21waWxhdGlvbiBlcnJvcnMgTWluaW1vbmdvRXJyb3Igb3Igc29tZXRoaW5nXG4gICAgICAgICAgLy8gICAgIHNvIHRoYXQgdGhpcyBkb2Vzbid0IGlnbm9yZSB1bnJlbGF0ZWQgZXhjZXB0aW9uc1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfV0sIGZ1bmN0aW9uIChmKSB7IHJldHVybiBmKCk7IH0pOyAgLy8gaW52b2tlIGVhY2ggZnVuY3Rpb25cblxuICAgIHZhciBkcml2ZXJDbGFzcyA9IGNhblVzZU9wbG9nID8gT3Bsb2dPYnNlcnZlRHJpdmVyIDogUG9sbGluZ09ic2VydmVEcml2ZXI7XG4gICAgb2JzZXJ2ZURyaXZlciA9IG5ldyBkcml2ZXJDbGFzcyh7XG4gICAgICBjdXJzb3JEZXNjcmlwdGlvbjogY3Vyc29yRGVzY3JpcHRpb24sXG4gICAgICBtb25nb0hhbmRsZTogc2VsZixcbiAgICAgIG11bHRpcGxleGVyOiBtdWx0aXBsZXhlcixcbiAgICAgIG9yZGVyZWQ6IG9yZGVyZWQsXG4gICAgICBtYXRjaGVyOiBtYXRjaGVyLCAgLy8gaWdub3JlZCBieSBwb2xsaW5nXG4gICAgICBzb3J0ZXI6IHNvcnRlciwgIC8vIGlnbm9yZWQgYnkgcG9sbGluZ1xuICAgICAgX3Rlc3RPbmx5UG9sbENhbGxiYWNrOiBjYWxsYmFja3MuX3Rlc3RPbmx5UG9sbENhbGxiYWNrXG4gICAgfSk7XG5cbiAgICAvLyBUaGlzIGZpZWxkIGlzIG9ubHkgc2V0IGZvciB1c2UgaW4gdGVzdHMuXG4gICAgbXVsdGlwbGV4ZXIuX29ic2VydmVEcml2ZXIgPSBvYnNlcnZlRHJpdmVyO1xuICB9XG5cbiAgLy8gQmxvY2tzIHVudGlsIHRoZSBpbml0aWFsIGFkZHMgaGF2ZSBiZWVuIHNlbnQuXG4gIG11bHRpcGxleGVyLmFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkcyhvYnNlcnZlSGFuZGxlKTtcblxuICByZXR1cm4gb2JzZXJ2ZUhhbmRsZTtcbn07XG5cbi8vIExpc3RlbiBmb3IgdGhlIGludmFsaWRhdGlvbiBtZXNzYWdlcyB0aGF0IHdpbGwgdHJpZ2dlciB1cyB0byBwb2xsIHRoZVxuLy8gZGF0YWJhc2UgZm9yIGNoYW5nZXMuIElmIHRoaXMgc2VsZWN0b3Igc3BlY2lmaWVzIHNwZWNpZmljIElEcywgc3BlY2lmeSB0aGVtXG4vLyBoZXJlLCBzbyB0aGF0IHVwZGF0ZXMgdG8gZGlmZmVyZW50IHNwZWNpZmljIElEcyBkb24ndCBjYXVzZSB1cyB0byBwb2xsLlxuLy8gbGlzdGVuQ2FsbGJhY2sgaXMgdGhlIHNhbWUga2luZCBvZiAobm90aWZpY2F0aW9uLCBjb21wbGV0ZSkgY2FsbGJhY2sgcGFzc2VkXG4vLyB0byBJbnZhbGlkYXRpb25Dcm9zc2Jhci5saXN0ZW4uXG5cbmxpc3RlbkFsbCA9IGZ1bmN0aW9uIChjdXJzb3JEZXNjcmlwdGlvbiwgbGlzdGVuQ2FsbGJhY2spIHtcbiAgdmFyIGxpc3RlbmVycyA9IFtdO1xuICBmb3JFYWNoVHJpZ2dlcihjdXJzb3JEZXNjcmlwdGlvbiwgZnVuY3Rpb24gKHRyaWdnZXIpIHtcbiAgICBsaXN0ZW5lcnMucHVzaChERFBTZXJ2ZXIuX0ludmFsaWRhdGlvbkNyb3NzYmFyLmxpc3RlbihcbiAgICAgIHRyaWdnZXIsIGxpc3RlbkNhbGxiYWNrKSk7XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgICAgXy5lYWNoKGxpc3RlbmVycywgZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgICAgIGxpc3RlbmVyLnN0b3AoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn07XG5cbmZvckVhY2hUcmlnZ2VyID0gZnVuY3Rpb24gKGN1cnNvckRlc2NyaXB0aW9uLCB0cmlnZ2VyQ2FsbGJhY2spIHtcbiAgdmFyIGtleSA9IHtjb2xsZWN0aW9uOiBjdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZX07XG4gIHZhciBzcGVjaWZpY0lkcyA9IExvY2FsQ29sbGVjdGlvbi5faWRzTWF0Y2hlZEJ5U2VsZWN0b3IoXG4gICAgY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IpO1xuICBpZiAoc3BlY2lmaWNJZHMpIHtcbiAgICBfLmVhY2goc3BlY2lmaWNJZHMsIGZ1bmN0aW9uIChpZCkge1xuICAgICAgdHJpZ2dlckNhbGxiYWNrKF8uZXh0ZW5kKHtpZDogaWR9LCBrZXkpKTtcbiAgICB9KTtcbiAgICB0cmlnZ2VyQ2FsbGJhY2soXy5leHRlbmQoe2Ryb3BDb2xsZWN0aW9uOiB0cnVlLCBpZDogbnVsbH0sIGtleSkpO1xuICB9IGVsc2Uge1xuICAgIHRyaWdnZXJDYWxsYmFjayhrZXkpO1xuICB9XG4gIC8vIEV2ZXJ5b25lIGNhcmVzIGFib3V0IHRoZSBkYXRhYmFzZSBiZWluZyBkcm9wcGVkLlxuICB0cmlnZ2VyQ2FsbGJhY2soeyBkcm9wRGF0YWJhc2U6IHRydWUgfSk7XG59O1xuXG4vLyBvYnNlcnZlQ2hhbmdlcyBmb3IgdGFpbGFibGUgY3Vyc29ycyBvbiBjYXBwZWQgY29sbGVjdGlvbnMuXG4vL1xuLy8gU29tZSBkaWZmZXJlbmNlcyBmcm9tIG5vcm1hbCBjdXJzb3JzOlxuLy8gICAtIFdpbGwgbmV2ZXIgcHJvZHVjZSBhbnl0aGluZyBvdGhlciB0aGFuICdhZGRlZCcgb3IgJ2FkZGVkQmVmb3JlJy4gSWYgeW91XG4vLyAgICAgZG8gdXBkYXRlIGEgZG9jdW1lbnQgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIHByb2R1Y2VkLCB0aGlzIHdpbGwgbm90IG5vdGljZVxuLy8gICAgIGl0LlxuLy8gICAtIElmIHlvdSBkaXNjb25uZWN0IGFuZCByZWNvbm5lY3QgZnJvbSBNb25nbywgaXQgd2lsbCBlc3NlbnRpYWxseSByZXN0YXJ0XG4vLyAgICAgdGhlIHF1ZXJ5LCB3aGljaCB3aWxsIGxlYWQgdG8gZHVwbGljYXRlIHJlc3VsdHMuIFRoaXMgaXMgcHJldHR5IGJhZCxcbi8vICAgICBidXQgaWYgeW91IGluY2x1ZGUgYSBmaWVsZCBjYWxsZWQgJ3RzJyB3aGljaCBpcyBpbnNlcnRlZCBhc1xuLy8gICAgIG5ldyBNb25nb0ludGVybmFscy5Nb25nb1RpbWVzdGFtcCgwLCAwKSAod2hpY2ggaXMgaW5pdGlhbGl6ZWQgdG8gdGhlXG4vLyAgICAgY3VycmVudCBNb25nby1zdHlsZSB0aW1lc3RhbXApLCB3ZSdsbCBiZSBhYmxlIHRvIGZpbmQgdGhlIHBsYWNlIHRvXG4vLyAgICAgcmVzdGFydCBwcm9wZXJseS4gKFRoaXMgZmllbGQgaXMgc3BlY2lmaWNhbGx5IHVuZGVyc3Rvb2QgYnkgTW9uZ28gd2l0aCBhblxuLy8gICAgIG9wdGltaXphdGlvbiB3aGljaCBhbGxvd3MgaXQgdG8gZmluZCB0aGUgcmlnaHQgcGxhY2UgdG8gc3RhcnQgd2l0aG91dFxuLy8gICAgIGFuIGluZGV4IG9uIHRzLiBJdCdzIGhvdyB0aGUgb3Bsb2cgd29ya3MuKVxuLy8gICAtIE5vIGNhbGxiYWNrcyBhcmUgdHJpZ2dlcmVkIHN5bmNocm9ub3VzbHkgd2l0aCB0aGUgY2FsbCAodGhlcmUncyBub1xuLy8gICAgIGRpZmZlcmVudGlhdGlvbiBiZXR3ZWVuIFwiaW5pdGlhbCBkYXRhXCIgYW5kIFwibGF0ZXIgY2hhbmdlc1wiOyBldmVyeXRoaW5nXG4vLyAgICAgdGhhdCBtYXRjaGVzIHRoZSBxdWVyeSBnZXRzIHNlbnQgYXN5bmNocm9ub3VzbHkpLlxuLy8gICAtIERlLWR1cGxpY2F0aW9uIGlzIG5vdCBpbXBsZW1lbnRlZC5cbi8vICAgLSBEb2VzIG5vdCB5ZXQgaW50ZXJhY3Qgd2l0aCB0aGUgd3JpdGUgZmVuY2UuIFByb2JhYmx5LCB0aGlzIHNob3VsZCB3b3JrIGJ5XG4vLyAgICAgaWdub3JpbmcgcmVtb3ZlcyAod2hpY2ggZG9uJ3Qgd29yayBvbiBjYXBwZWQgY29sbGVjdGlvbnMpIGFuZCB1cGRhdGVzXG4vLyAgICAgKHdoaWNoIGRvbid0IGFmZmVjdCB0YWlsYWJsZSBjdXJzb3JzKSwgYW5kIGp1c3Qga2VlcGluZyB0cmFjayBvZiB0aGUgSURcbi8vICAgICBvZiB0aGUgaW5zZXJ0ZWQgb2JqZWN0LCBhbmQgY2xvc2luZyB0aGUgd3JpdGUgZmVuY2Ugb25jZSB5b3UgZ2V0IHRvIHRoYXRcbi8vICAgICBJRCAob3IgdGltZXN0YW1wPykuICBUaGlzIGRvZXNuJ3Qgd29yayB3ZWxsIGlmIHRoZSBkb2N1bWVudCBkb2Vzbid0IG1hdGNoXG4vLyAgICAgdGhlIHF1ZXJ5LCB0aG91Z2guICBPbiB0aGUgb3RoZXIgaGFuZCwgdGhlIHdyaXRlIGZlbmNlIGNhbiBjbG9zZVxuLy8gICAgIGltbWVkaWF0ZWx5IGlmIGl0IGRvZXMgbm90IG1hdGNoIHRoZSBxdWVyeS4gU28gaWYgd2UgdHJ1c3QgbWluaW1vbmdvXG4vLyAgICAgZW5vdWdoIHRvIGFjY3VyYXRlbHkgZXZhbHVhdGUgdGhlIHF1ZXJ5IGFnYWluc3QgdGhlIHdyaXRlIGZlbmNlLCB3ZVxuLy8gICAgIHNob3VsZCBiZSBhYmxlIHRvIGRvIHRoaXMuLi4gIE9mIGNvdXJzZSwgbWluaW1vbmdvIGRvZXNuJ3QgZXZlbiBzdXBwb3J0XG4vLyAgICAgTW9uZ28gVGltZXN0YW1wcyB5ZXQuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9vYnNlcnZlQ2hhbmdlc1RhaWxhYmxlID0gZnVuY3Rpb24gKFxuICAgIGN1cnNvckRlc2NyaXB0aW9uLCBvcmRlcmVkLCBjYWxsYmFja3MpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIFRhaWxhYmxlIGN1cnNvcnMgb25seSBldmVyIGNhbGwgYWRkZWQvYWRkZWRCZWZvcmUgY2FsbGJhY2tzLCBzbyBpdCdzIGFuXG4gIC8vIGVycm9yIGlmIHlvdSBkaWRuJ3QgcHJvdmlkZSB0aGVtLlxuICBpZiAoKG9yZGVyZWQgJiYgIWNhbGxiYWNrcy5hZGRlZEJlZm9yZSkgfHxcbiAgICAgICghb3JkZXJlZCAmJiAhY2FsbGJhY2tzLmFkZGVkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IG9ic2VydmUgYW4gXCIgKyAob3JkZXJlZCA/IFwib3JkZXJlZFwiIDogXCJ1bm9yZGVyZWRcIilcbiAgICAgICAgICAgICAgICAgICAgKyBcIiB0YWlsYWJsZSBjdXJzb3Igd2l0aG91dCBhIFwiXG4gICAgICAgICAgICAgICAgICAgICsgKG9yZGVyZWQgPyBcImFkZGVkQmVmb3JlXCIgOiBcImFkZGVkXCIpICsgXCIgY2FsbGJhY2tcIik7XG4gIH1cblxuICByZXR1cm4gc2VsZi50YWlsKGN1cnNvckRlc2NyaXB0aW9uLCBmdW5jdGlvbiAoZG9jKSB7XG4gICAgdmFyIGlkID0gZG9jLl9pZDtcbiAgICBkZWxldGUgZG9jLl9pZDtcbiAgICAvLyBUaGUgdHMgaXMgYW4gaW1wbGVtZW50YXRpb24gZGV0YWlsLiBIaWRlIGl0LlxuICAgIGRlbGV0ZSBkb2MudHM7XG4gICAgaWYgKG9yZGVyZWQpIHtcbiAgICAgIGNhbGxiYWNrcy5hZGRlZEJlZm9yZShpZCwgZG9jLCBudWxsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2tzLmFkZGVkKGlkLCBkb2MpO1xuICAgIH1cbiAgfSk7XG59O1xuXG4vLyBYWFggV2UgcHJvYmFibHkgbmVlZCB0byBmaW5kIGEgYmV0dGVyIHdheSB0byBleHBvc2UgdGhpcy4gUmlnaHQgbm93XG4vLyBpdCdzIG9ubHkgdXNlZCBieSB0ZXN0cywgYnV0IGluIGZhY3QgeW91IG5lZWQgaXQgaW4gbm9ybWFsXG4vLyBvcGVyYXRpb24gdG8gaW50ZXJhY3Qgd2l0aCBjYXBwZWQgY29sbGVjdGlvbnMuXG5Nb25nb0ludGVybmFscy5Nb25nb1RpbWVzdGFtcCA9IE1vbmdvREIuVGltZXN0YW1wO1xuXG5Nb25nb0ludGVybmFscy5Db25uZWN0aW9uID0gTW9uZ29Db25uZWN0aW9uO1xuIiwidmFyIEZ1dHVyZSA9IE5wbS5yZXF1aXJlKCdmaWJlcnMvZnV0dXJlJyk7XG5cbk9QTE9HX0NPTExFQ1RJT04gPSAnb3Bsb2cucnMnO1xuXG52YXIgVE9PX0ZBUl9CRUhJTkQgPSBwcm9jZXNzLmVudi5NRVRFT1JfT1BMT0dfVE9PX0ZBUl9CRUhJTkQgfHwgMjAwMDtcbnZhciBUQUlMX1RJTUVPVVQgPSArcHJvY2Vzcy5lbnYuTUVURU9SX09QTE9HX1RBSUxfVElNRU9VVCB8fCAzMDAwMDtcblxudmFyIHNob3dUUyA9IGZ1bmN0aW9uICh0cykge1xuICByZXR1cm4gXCJUaW1lc3RhbXAoXCIgKyB0cy5nZXRIaWdoQml0cygpICsgXCIsIFwiICsgdHMuZ2V0TG93Qml0cygpICsgXCIpXCI7XG59O1xuXG5pZEZvck9wID0gZnVuY3Rpb24gKG9wKSB7XG4gIGlmIChvcC5vcCA9PT0gJ2QnKVxuICAgIHJldHVybiBvcC5vLl9pZDtcbiAgZWxzZSBpZiAob3Aub3AgPT09ICdpJylcbiAgICByZXR1cm4gb3Auby5faWQ7XG4gIGVsc2UgaWYgKG9wLm9wID09PSAndScpXG4gICAgcmV0dXJuIG9wLm8yLl9pZDtcbiAgZWxzZSBpZiAob3Aub3AgPT09ICdjJylcbiAgICB0aHJvdyBFcnJvcihcIk9wZXJhdG9yICdjJyBkb2Vzbid0IHN1cHBseSBhbiBvYmplY3Qgd2l0aCBpZDogXCIgK1xuICAgICAgICAgICAgICAgIEVKU09OLnN0cmluZ2lmeShvcCkpO1xuICBlbHNlXG4gICAgdGhyb3cgRXJyb3IoXCJVbmtub3duIG9wOiBcIiArIEVKU09OLnN0cmluZ2lmeShvcCkpO1xufTtcblxuT3Bsb2dIYW5kbGUgPSBmdW5jdGlvbiAob3Bsb2dVcmwsIGRiTmFtZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYuX29wbG9nVXJsID0gb3Bsb2dVcmw7XG4gIHNlbGYuX2RiTmFtZSA9IGRiTmFtZTtcblxuICBzZWxmLl9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb24gPSBudWxsO1xuICBzZWxmLl9vcGxvZ1RhaWxDb25uZWN0aW9uID0gbnVsbDtcbiAgc2VsZi5fc3RvcHBlZCA9IGZhbHNlO1xuICBzZWxmLl90YWlsSGFuZGxlID0gbnVsbDtcbiAgc2VsZi5fcmVhZHlGdXR1cmUgPSBuZXcgRnV0dXJlKCk7XG4gIHNlbGYuX2Nyb3NzYmFyID0gbmV3IEREUFNlcnZlci5fQ3Jvc3NiYXIoe1xuICAgIGZhY3RQYWNrYWdlOiBcIm1vbmdvLWxpdmVkYXRhXCIsIGZhY3ROYW1lOiBcIm9wbG9nLXdhdGNoZXJzXCJcbiAgfSk7XG4gIHNlbGYuX2Jhc2VPcGxvZ1NlbGVjdG9yID0ge1xuICAgIG5zOiBuZXcgUmVnRXhwKFwiXig/OlwiICsgW1xuICAgICAgTWV0ZW9yLl9lc2NhcGVSZWdFeHAoc2VsZi5fZGJOYW1lICsgXCIuXCIpLFxuICAgICAgTWV0ZW9yLl9lc2NhcGVSZWdFeHAoXCJhZG1pbi4kY21kXCIpLFxuICAgIF0uam9pbihcInxcIikgKyBcIilcIiksXG5cbiAgICAkb3I6IFtcbiAgICAgIHsgb3A6IHsgJGluOiBbJ2knLCAndScsICdkJ10gfSB9LFxuICAgICAgLy8gZHJvcCBjb2xsZWN0aW9uXG4gICAgICB7IG9wOiAnYycsICdvLmRyb3AnOiB7ICRleGlzdHM6IHRydWUgfSB9LFxuICAgICAgeyBvcDogJ2MnLCAnby5kcm9wRGF0YWJhc2UnOiAxIH0sXG4gICAgICB7IG9wOiAnYycsICdvLmFwcGx5T3BzJzogeyAkZXhpc3RzOiB0cnVlIH0gfSxcbiAgICBdXG4gIH07XG5cbiAgLy8gRGF0YSBzdHJ1Y3R1cmVzIHRvIHN1cHBvcnQgd2FpdFVudGlsQ2F1Z2h0VXAoKS4gRWFjaCBvcGxvZyBlbnRyeSBoYXMgYVxuICAvLyBNb25nb1RpbWVzdGFtcCBvYmplY3Qgb24gaXQgKHdoaWNoIGlzIG5vdCB0aGUgc2FtZSBhcyBhIERhdGUgLS0tIGl0J3MgYVxuICAvLyBjb21iaW5hdGlvbiBvZiB0aW1lIGFuZCBhbiBpbmNyZW1lbnRpbmcgY291bnRlcjsgc2VlXG4gIC8vIGh0dHA6Ly9kb2NzLm1vbmdvZGIub3JnL21hbnVhbC9yZWZlcmVuY2UvYnNvbi10eXBlcy8jdGltZXN0YW1wcykuXG4gIC8vXG4gIC8vIF9jYXRjaGluZ1VwRnV0dXJlcyBpcyBhbiBhcnJheSBvZiB7dHM6IE1vbmdvVGltZXN0YW1wLCBmdXR1cmU6IEZ1dHVyZX1cbiAgLy8gb2JqZWN0cywgc29ydGVkIGJ5IGFzY2VuZGluZyB0aW1lc3RhbXAuIF9sYXN0UHJvY2Vzc2VkVFMgaXMgdGhlXG4gIC8vIE1vbmdvVGltZXN0YW1wIG9mIHRoZSBsYXN0IG9wbG9nIGVudHJ5IHdlJ3ZlIHByb2Nlc3NlZC5cbiAgLy9cbiAgLy8gRWFjaCB0aW1lIHdlIGNhbGwgd2FpdFVudGlsQ2F1Z2h0VXAsIHdlIHRha2UgYSBwZWVrIGF0IHRoZSBmaW5hbCBvcGxvZ1xuICAvLyBlbnRyeSBpbiB0aGUgZGIuICBJZiB3ZSd2ZSBhbHJlYWR5IHByb2Nlc3NlZCBpdCAoaWUsIGl0IGlzIG5vdCBncmVhdGVyIHRoYW5cbiAgLy8gX2xhc3RQcm9jZXNzZWRUUyksIHdhaXRVbnRpbENhdWdodFVwIGltbWVkaWF0ZWx5IHJldHVybnMuIE90aGVyd2lzZSxcbiAgLy8gd2FpdFVudGlsQ2F1Z2h0VXAgbWFrZXMgYSBuZXcgRnV0dXJlIGFuZCBpbnNlcnRzIGl0IGFsb25nIHdpdGggdGhlIGZpbmFsXG4gIC8vIHRpbWVzdGFtcCBlbnRyeSB0aGF0IGl0IHJlYWQsIGludG8gX2NhdGNoaW5nVXBGdXR1cmVzLiB3YWl0VW50aWxDYXVnaHRVcFxuICAvLyB0aGVuIHdhaXRzIG9uIHRoYXQgZnV0dXJlLCB3aGljaCBpcyByZXNvbHZlZCBvbmNlIF9sYXN0UHJvY2Vzc2VkVFMgaXNcbiAgLy8gaW5jcmVtZW50ZWQgdG8gYmUgcGFzdCBpdHMgdGltZXN0YW1wIGJ5IHRoZSB3b3JrZXIgZmliZXIuXG4gIC8vXG4gIC8vIFhYWCB1c2UgYSBwcmlvcml0eSBxdWV1ZSBvciBzb21ldGhpbmcgZWxzZSB0aGF0J3MgZmFzdGVyIHRoYW4gYW4gYXJyYXlcbiAgc2VsZi5fY2F0Y2hpbmdVcEZ1dHVyZXMgPSBbXTtcbiAgc2VsZi5fbGFzdFByb2Nlc3NlZFRTID0gbnVsbDtcblxuICBzZWxmLl9vblNraXBwZWRFbnRyaWVzSG9vayA9IG5ldyBIb29rKHtcbiAgICBkZWJ1Z1ByaW50RXhjZXB0aW9uczogXCJvblNraXBwZWRFbnRyaWVzIGNhbGxiYWNrXCJcbiAgfSk7XG5cbiAgc2VsZi5fZW50cnlRdWV1ZSA9IG5ldyBNZXRlb3IuX0RvdWJsZUVuZGVkUXVldWUoKTtcbiAgc2VsZi5fd29ya2VyQWN0aXZlID0gZmFsc2U7XG5cbiAgc2VsZi5fc3RhcnRUYWlsaW5nKCk7XG59O1xuXG5fLmV4dGVuZChPcGxvZ0hhbmRsZS5wcm90b3R5cGUsIHtcbiAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjtcbiAgICBzZWxmLl9zdG9wcGVkID0gdHJ1ZTtcbiAgICBpZiAoc2VsZi5fdGFpbEhhbmRsZSlcbiAgICAgIHNlbGYuX3RhaWxIYW5kbGUuc3RvcCgpO1xuICAgIC8vIFhYWCBzaG91bGQgY2xvc2UgY29ubmVjdGlvbnMgdG9vXG4gIH0sXG4gIG9uT3Bsb2dFbnRyeTogZnVuY3Rpb24gKHRyaWdnZXIsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGVkIG9uT3Bsb2dFbnRyeSBvbiBzdG9wcGVkIGhhbmRsZSFcIik7XG5cbiAgICAvLyBDYWxsaW5nIG9uT3Bsb2dFbnRyeSByZXF1aXJlcyB1cyB0byB3YWl0IGZvciB0aGUgdGFpbGluZyB0byBiZSByZWFkeS5cbiAgICBzZWxmLl9yZWFkeUZ1dHVyZS53YWl0KCk7XG5cbiAgICB2YXIgb3JpZ2luYWxDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIGNhbGxiYWNrID0gTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChmdW5jdGlvbiAobm90aWZpY2F0aW9uKSB7XG4gICAgICBvcmlnaW5hbENhbGxiYWNrKG5vdGlmaWNhdGlvbik7XG4gICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgTWV0ZW9yLl9kZWJ1ZyhcIkVycm9yIGluIG9wbG9nIGNhbGxiYWNrXCIsIGVycik7XG4gICAgfSk7XG4gICAgdmFyIGxpc3RlbkhhbmRsZSA9IHNlbGYuX2Nyb3NzYmFyLmxpc3Rlbih0cmlnZ2VyLCBjYWxsYmFjayk7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGlzdGVuSGFuZGxlLnN0b3AoKTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuICAvLyBSZWdpc3RlciBhIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgYW55IHRpbWUgd2Ugc2tpcCBvcGxvZyBlbnRyaWVzIChlZyxcbiAgLy8gYmVjYXVzZSB3ZSBhcmUgdG9vIGZhciBiZWhpbmQpLlxuICBvblNraXBwZWRFbnRyaWVzOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYWxsZWQgb25Ta2lwcGVkRW50cmllcyBvbiBzdG9wcGVkIGhhbmRsZSFcIik7XG4gICAgcmV0dXJuIHNlbGYuX29uU2tpcHBlZEVudHJpZXNIb29rLnJlZ2lzdGVyKGNhbGxiYWNrKTtcbiAgfSxcbiAgLy8gQ2FsbHMgYGNhbGxiYWNrYCBvbmNlIHRoZSBvcGxvZyBoYXMgYmVlbiBwcm9jZXNzZWQgdXAgdG8gYSBwb2ludCB0aGF0IGlzXG4gIC8vIHJvdWdobHkgXCJub3dcIjogc3BlY2lmaWNhbGx5LCBvbmNlIHdlJ3ZlIHByb2Nlc3NlZCBhbGwgb3BzIHRoYXQgYXJlXG4gIC8vIGN1cnJlbnRseSB2aXNpYmxlLlxuICAvLyBYWFggYmVjb21lIGNvbnZpbmNlZCB0aGF0IHRoaXMgaXMgYWN0dWFsbHkgc2FmZSBldmVuIGlmIG9wbG9nQ29ubmVjdGlvblxuICAvLyBpcyBzb21lIGtpbmQgb2YgcG9vbFxuICB3YWl0VW50aWxDYXVnaHRVcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbGxlZCB3YWl0VW50aWxDYXVnaHRVcCBvbiBzdG9wcGVkIGhhbmRsZSFcIik7XG5cbiAgICAvLyBDYWxsaW5nIHdhaXRVbnRpbENhdWdodFVwIHJlcXVyaWVzIHVzIHRvIHdhaXQgZm9yIHRoZSBvcGxvZyBjb25uZWN0aW9uIHRvXG4gICAgLy8gYmUgcmVhZHkuXG4gICAgc2VsZi5fcmVhZHlGdXR1cmUud2FpdCgpO1xuICAgIHZhciBsYXN0RW50cnk7XG5cbiAgICB3aGlsZSAoIXNlbGYuX3N0b3BwZWQpIHtcbiAgICAgIC8vIFdlIG5lZWQgdG8gbWFrZSB0aGUgc2VsZWN0b3IgYXQgbGVhc3QgYXMgcmVzdHJpY3RpdmUgYXMgdGhlIGFjdHVhbFxuICAgICAgLy8gdGFpbGluZyBzZWxlY3RvciAoaWUsIHdlIG5lZWQgdG8gc3BlY2lmeSB0aGUgREIgbmFtZSkgb3IgZWxzZSB3ZSBtaWdodFxuICAgICAgLy8gZmluZCBhIFRTIHRoYXQgd29uJ3Qgc2hvdyB1cCBpbiB0aGUgYWN0dWFsIHRhaWwgc3RyZWFtLlxuICAgICAgdHJ5IHtcbiAgICAgICAgbGFzdEVudHJ5ID0gc2VsZi5fb3Bsb2dMYXN0RW50cnlDb25uZWN0aW9uLmZpbmRPbmUoXG4gICAgICAgICAgT1BMT0dfQ09MTEVDVElPTiwgc2VsZi5fYmFzZU9wbG9nU2VsZWN0b3IsXG4gICAgICAgICAge2ZpZWxkczoge3RzOiAxfSwgc29ydDogeyRuYXR1cmFsOiAtMX19KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIER1cmluZyBmYWlsb3ZlciAoZWcpIGlmIHdlIGdldCBhbiBleGNlcHRpb24gd2Ugc2hvdWxkIGxvZyBhbmQgcmV0cnlcbiAgICAgICAgLy8gaW5zdGVhZCBvZiBjcmFzaGluZy5cbiAgICAgICAgTWV0ZW9yLl9kZWJ1ZyhcIkdvdCBleGNlcHRpb24gd2hpbGUgcmVhZGluZyBsYXN0IGVudHJ5XCIsIGUpO1xuICAgICAgICBNZXRlb3IuX3NsZWVwRm9yTXMoMTAwKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjtcblxuICAgIGlmICghbGFzdEVudHJ5KSB7XG4gICAgICAvLyBSZWFsbHksIG5vdGhpbmcgaW4gdGhlIG9wbG9nPyBXZWxsLCB3ZSd2ZSBwcm9jZXNzZWQgZXZlcnl0aGluZy5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgdHMgPSBsYXN0RW50cnkudHM7XG4gICAgaWYgKCF0cylcbiAgICAgIHRocm93IEVycm9yKFwib3Bsb2cgZW50cnkgd2l0aG91dCB0czogXCIgKyBFSlNPTi5zdHJpbmdpZnkobGFzdEVudHJ5KSk7XG5cbiAgICBpZiAoc2VsZi5fbGFzdFByb2Nlc3NlZFRTICYmIHRzLmxlc3NUaGFuT3JFcXVhbChzZWxmLl9sYXN0UHJvY2Vzc2VkVFMpKSB7XG4gICAgICAvLyBXZSd2ZSBhbHJlYWR5IGNhdWdodCB1cCB0byBoZXJlLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuXG4gICAgLy8gSW5zZXJ0IHRoZSBmdXR1cmUgaW50byBvdXIgbGlzdC4gQWxtb3N0IGFsd2F5cywgdGhpcyB3aWxsIGJlIGF0IHRoZSBlbmQsXG4gICAgLy8gYnV0IGl0J3MgY29uY2VpdmFibGUgdGhhdCBpZiB3ZSBmYWlsIG92ZXIgZnJvbSBvbmUgcHJpbWFyeSB0byBhbm90aGVyLFxuICAgIC8vIHRoZSBvcGxvZyBlbnRyaWVzIHdlIHNlZSB3aWxsIGdvIGJhY2t3YXJkcy5cbiAgICB2YXIgaW5zZXJ0QWZ0ZXIgPSBzZWxmLl9jYXRjaGluZ1VwRnV0dXJlcy5sZW5ndGg7XG4gICAgd2hpbGUgKGluc2VydEFmdGVyIC0gMSA+IDAgJiYgc2VsZi5fY2F0Y2hpbmdVcEZ1dHVyZXNbaW5zZXJ0QWZ0ZXIgLSAxXS50cy5ncmVhdGVyVGhhbih0cykpIHtcbiAgICAgIGluc2VydEFmdGVyLS07XG4gICAgfVxuICAgIHZhciBmID0gbmV3IEZ1dHVyZTtcbiAgICBzZWxmLl9jYXRjaGluZ1VwRnV0dXJlcy5zcGxpY2UoaW5zZXJ0QWZ0ZXIsIDAsIHt0czogdHMsIGZ1dHVyZTogZn0pO1xuICAgIGYud2FpdCgpO1xuICB9LFxuICBfc3RhcnRUYWlsaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIEZpcnN0LCBtYWtlIHN1cmUgdGhhdCB3ZSdyZSB0YWxraW5nIHRvIHRoZSBsb2NhbCBkYXRhYmFzZS5cbiAgICB2YXIgbW9uZ29kYlVyaSA9IE5wbS5yZXF1aXJlKCdtb25nb2RiLXVyaScpO1xuICAgIGlmIChtb25nb2RiVXJpLnBhcnNlKHNlbGYuX29wbG9nVXJsKS5kYXRhYmFzZSAhPT0gJ2xvY2FsJykge1xuICAgICAgdGhyb3cgRXJyb3IoXCIkTU9OR09fT1BMT0dfVVJMIG11c3QgYmUgc2V0IHRvIHRoZSAnbG9jYWwnIGRhdGFiYXNlIG9mIFwiICtcbiAgICAgICAgICAgICAgICAgIFwiYSBNb25nbyByZXBsaWNhIHNldFwiKTtcbiAgICB9XG5cbiAgICAvLyBXZSBtYWtlIHR3byBzZXBhcmF0ZSBjb25uZWN0aW9ucyB0byBNb25nby4gVGhlIE5vZGUgTW9uZ28gZHJpdmVyXG4gICAgLy8gaW1wbGVtZW50cyBhIG5haXZlIHJvdW5kLXJvYmluIGNvbm5lY3Rpb24gcG9vbDogZWFjaCBcImNvbm5lY3Rpb25cIiBpcyBhXG4gICAgLy8gcG9vbCBvZiBzZXZlcmFsICg1IGJ5IGRlZmF1bHQpIFRDUCBjb25uZWN0aW9ucywgYW5kIGVhY2ggcmVxdWVzdCBpc1xuICAgIC8vIHJvdGF0ZWQgdGhyb3VnaCB0aGUgcG9vbHMuIFRhaWxhYmxlIGN1cnNvciBxdWVyaWVzIGJsb2NrIG9uIHRoZSBzZXJ2ZXJcbiAgICAvLyB1bnRpbCB0aGVyZSBpcyBzb21lIGRhdGEgdG8gcmV0dXJuIChvciB1bnRpbCBhIGZldyBzZWNvbmRzIGhhdmVcbiAgICAvLyBwYXNzZWQpLiBTbyBpZiB0aGUgY29ubmVjdGlvbiBwb29sIHVzZWQgZm9yIHRhaWxpbmcgY3Vyc29ycyBpcyB0aGUgc2FtZVxuICAgIC8vIHBvb2wgdXNlZCBmb3Igb3RoZXIgcXVlcmllcywgdGhlIG90aGVyIHF1ZXJpZXMgd2lsbCBiZSBkZWxheWVkIGJ5IHNlY29uZHNcbiAgICAvLyAxLzUgb2YgdGhlIHRpbWUuXG4gICAgLy9cbiAgICAvLyBUaGUgdGFpbCBjb25uZWN0aW9uIHdpbGwgb25seSBldmVyIGJlIHJ1bm5pbmcgYSBzaW5nbGUgdGFpbCBjb21tYW5kLCBzb1xuICAgIC8vIGl0IG9ubHkgbmVlZHMgdG8gbWFrZSBvbmUgdW5kZXJseWluZyBUQ1AgY29ubmVjdGlvbi5cbiAgICBzZWxmLl9vcGxvZ1RhaWxDb25uZWN0aW9uID0gbmV3IE1vbmdvQ29ubmVjdGlvbihcbiAgICAgIHNlbGYuX29wbG9nVXJsLCB7cG9vbFNpemU6IDF9KTtcbiAgICAvLyBYWFggYmV0dGVyIGRvY3MsIGJ1dDogaXQncyB0byBnZXQgbW9ub3RvbmljIHJlc3VsdHNcbiAgICAvLyBYWFggaXMgaXQgc2FmZSB0byBzYXkgXCJpZiB0aGVyZSdzIGFuIGluIGZsaWdodCBxdWVyeSwganVzdCB1c2UgaXRzXG4gICAgLy8gICAgIHJlc3VsdHNcIj8gSSBkb24ndCB0aGluayBzbyBidXQgc2hvdWxkIGNvbnNpZGVyIHRoYXRcbiAgICBzZWxmLl9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb24gPSBuZXcgTW9uZ29Db25uZWN0aW9uKFxuICAgICAgc2VsZi5fb3Bsb2dVcmwsIHtwb29sU2l6ZTogMX0pO1xuXG4gICAgLy8gTm93LCBtYWtlIHN1cmUgdGhhdCB0aGVyZSBhY3R1YWxseSBpcyBhIHJlcGwgc2V0IGhlcmUuIElmIG5vdCwgb3Bsb2dcbiAgICAvLyB0YWlsaW5nIHdvbid0IGV2ZXIgZmluZCBhbnl0aGluZyFcbiAgICAvLyBNb3JlIG9uIHRoZSBpc01hc3RlckRvY1xuICAgIC8vIGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvcmVmZXJlbmNlL2NvbW1hbmQvaXNNYXN0ZXIvXG4gICAgdmFyIGYgPSBuZXcgRnV0dXJlO1xuICAgIHNlbGYuX29wbG9nTGFzdEVudHJ5Q29ubmVjdGlvbi5kYi5hZG1pbigpLmNvbW1hbmQoXG4gICAgICB7IGlzbWFzdGVyOiAxIH0sIGYucmVzb2x2ZXIoKSk7XG4gICAgdmFyIGlzTWFzdGVyRG9jID0gZi53YWl0KCk7XG5cbiAgICBpZiAoIShpc01hc3RlckRvYyAmJiBpc01hc3RlckRvYy5zZXROYW1lKSkge1xuICAgICAgdGhyb3cgRXJyb3IoXCIkTU9OR09fT1BMT0dfVVJMIG11c3QgYmUgc2V0IHRvIHRoZSAnbG9jYWwnIGRhdGFiYXNlIG9mIFwiICtcbiAgICAgICAgICAgICAgICAgIFwiYSBNb25nbyByZXBsaWNhIHNldFwiKTtcbiAgICB9XG5cbiAgICAvLyBGaW5kIHRoZSBsYXN0IG9wbG9nIGVudHJ5LlxuICAgIHZhciBsYXN0T3Bsb2dFbnRyeSA9IHNlbGYuX29wbG9nTGFzdEVudHJ5Q29ubmVjdGlvbi5maW5kT25lKFxuICAgICAgT1BMT0dfQ09MTEVDVElPTiwge30sIHtzb3J0OiB7JG5hdHVyYWw6IC0xfSwgZmllbGRzOiB7dHM6IDF9fSk7XG5cbiAgICB2YXIgb3Bsb2dTZWxlY3RvciA9IF8uY2xvbmUoc2VsZi5fYmFzZU9wbG9nU2VsZWN0b3IpO1xuICAgIGlmIChsYXN0T3Bsb2dFbnRyeSkge1xuICAgICAgLy8gU3RhcnQgYWZ0ZXIgdGhlIGxhc3QgZW50cnkgdGhhdCBjdXJyZW50bHkgZXhpc3RzLlxuICAgICAgb3Bsb2dTZWxlY3Rvci50cyA9IHskZ3Q6IGxhc3RPcGxvZ0VudHJ5LnRzfTtcbiAgICAgIC8vIElmIHRoZXJlIGFyZSBhbnkgY2FsbHMgdG8gY2FsbFdoZW5Qcm9jZXNzZWRMYXRlc3QgYmVmb3JlIGFueSBvdGhlclxuICAgICAgLy8gb3Bsb2cgZW50cmllcyBzaG93IHVwLCBhbGxvdyBjYWxsV2hlblByb2Nlc3NlZExhdGVzdCB0byBjYWxsIGl0c1xuICAgICAgLy8gY2FsbGJhY2sgaW1tZWRpYXRlbHkuXG4gICAgICBzZWxmLl9sYXN0UHJvY2Vzc2VkVFMgPSBsYXN0T3Bsb2dFbnRyeS50cztcbiAgICB9XG5cbiAgICB2YXIgY3Vyc29yRGVzY3JpcHRpb24gPSBuZXcgQ3Vyc29yRGVzY3JpcHRpb24oXG4gICAgICBPUExPR19DT0xMRUNUSU9OLCBvcGxvZ1NlbGVjdG9yLCB7dGFpbGFibGU6IHRydWV9KTtcblxuICAgIC8vIFN0YXJ0IHRhaWxpbmcgdGhlIG9wbG9nLlxuICAgIC8vXG4gICAgLy8gV2UgcmVzdGFydCB0aGUgbG93LWxldmVsIG9wbG9nIHF1ZXJ5IGV2ZXJ5IDMwIHNlY29uZHMgaWYgd2UgZGlkbid0IGdldCBhXG4gICAgLy8gZG9jLiBUaGlzIGlzIGEgd29ya2Fyb3VuZCBmb3IgIzg1OTg6IHRoZSBOb2RlIE1vbmdvIGRyaXZlciBoYXMgYXQgbGVhc3RcbiAgICAvLyBvbmUgYnVnIHRoYXQgY2FuIGxlYWQgdG8gcXVlcnkgY2FsbGJhY2tzIG5ldmVyIGdldHRpbmcgY2FsbGVkIChldmVuIHdpdGhcbiAgICAvLyBhbiBlcnJvcikgd2hlbiBsZWFkZXJzaGlwIGZhaWxvdmVyIG9jY3VyLlxuICAgIHNlbGYuX3RhaWxIYW5kbGUgPSBzZWxmLl9vcGxvZ1RhaWxDb25uZWN0aW9uLnRhaWwoXG4gICAgICBjdXJzb3JEZXNjcmlwdGlvbixcbiAgICAgIGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgc2VsZi5fZW50cnlRdWV1ZS5wdXNoKGRvYyk7XG4gICAgICAgIHNlbGYuX21heWJlU3RhcnRXb3JrZXIoKTtcbiAgICAgIH0sXG4gICAgICBUQUlMX1RJTUVPVVRcbiAgICApO1xuICAgIHNlbGYuX3JlYWR5RnV0dXJlLnJldHVybigpO1xuICB9LFxuXG4gIF9tYXliZVN0YXJ0V29ya2VyOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl93b3JrZXJBY3RpdmUpIHJldHVybjtcbiAgICBzZWxmLl93b3JrZXJBY3RpdmUgPSB0cnVlO1xuXG4gICAgTWV0ZW9yLmRlZmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIE1heSBiZSBjYWxsZWQgcmVjdXJzaXZlbHkgaW4gY2FzZSBvZiB0cmFuc2FjdGlvbnMuXG4gICAgICBmdW5jdGlvbiBoYW5kbGVEb2MoZG9jKSB7XG4gICAgICAgIGlmIChkb2MubnMgPT09IFwiYWRtaW4uJGNtZFwiKSB7XG4gICAgICAgICAgaWYgKGRvYy5vLmFwcGx5T3BzKSB7XG4gICAgICAgICAgICAvLyBUaGlzIHdhcyBhIHN1Y2Nlc3NmdWwgdHJhbnNhY3Rpb24sIHNvIHdlIG5lZWQgdG8gYXBwbHkgdGhlXG4gICAgICAgICAgICAvLyBvcGVyYXRpb25zIHRoYXQgd2VyZSBpbnZvbHZlZC5cbiAgICAgICAgICAgIGRvYy5vLmFwcGx5T3BzLmZvckVhY2gob3AgPT4ge1xuICAgICAgICAgICAgICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvaXNzdWVzLzEwNDIwLlxuICAgICAgICAgICAgICBvcC50cyA9IG9wLnRzIHx8IGRvYy50cztcbiAgICAgICAgICAgICAgaGFuZGxlRG9jKG9wKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIGNvbW1hbmQgXCIgKyBFSlNPTi5zdHJpbmdpZnkoZG9jKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0cmlnZ2VyID0ge1xuICAgICAgICAgIGRyb3BDb2xsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICBkcm9wRGF0YWJhc2U6IGZhbHNlLFxuICAgICAgICAgIG9wOiBkb2MsXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHR5cGVvZiBkb2MubnMgPT09IFwic3RyaW5nXCIgJiZcbiAgICAgICAgICAgIGRvYy5ucy5zdGFydHNXaXRoKHNlbGYuX2RiTmFtZSArIFwiLlwiKSkge1xuICAgICAgICAgIHRyaWdnZXIuY29sbGVjdGlvbiA9IGRvYy5ucy5zbGljZShzZWxmLl9kYk5hbWUubGVuZ3RoICsgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5leHBlY3RlZCBuc1wiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElzIGl0IGEgc3BlY2lhbCBjb21tYW5kIGFuZCB0aGUgY29sbGVjdGlvbiBuYW1lIGlzIGhpZGRlblxuICAgICAgICAvLyBzb21ld2hlcmUgaW4gb3BlcmF0b3I/XG4gICAgICAgIGlmICh0cmlnZ2VyLmNvbGxlY3Rpb24gPT09IFwiJGNtZFwiKSB7XG4gICAgICAgICAgaWYgKGRvYy5vLmRyb3BEYXRhYmFzZSkge1xuICAgICAgICAgICAgZGVsZXRlIHRyaWdnZXIuY29sbGVjdGlvbjtcbiAgICAgICAgICAgIHRyaWdnZXIuZHJvcERhdGFiYXNlID0gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKF8uaGFzKGRvYy5vLCBcImRyb3BcIikpIHtcbiAgICAgICAgICAgIHRyaWdnZXIuY29sbGVjdGlvbiA9IGRvYy5vLmRyb3A7XG4gICAgICAgICAgICB0cmlnZ2VyLmRyb3BDb2xsZWN0aW9uID0gdHJ1ZTtcbiAgICAgICAgICAgIHRyaWdnZXIuaWQgPSBudWxsO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIlVua25vd24gY29tbWFuZCBcIiArIEVKU09OLnN0cmluZ2lmeShkb2MpKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBBbGwgb3RoZXIgb3BzIGhhdmUgYW4gaWQuXG4gICAgICAgICAgdHJpZ2dlci5pZCA9IGlkRm9yT3AoZG9jKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNlbGYuX2Nyb3NzYmFyLmZpcmUodHJpZ2dlcik7XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHdoaWxlICghIHNlbGYuX3N0b3BwZWQgJiZcbiAgICAgICAgICAgICAgICEgc2VsZi5fZW50cnlRdWV1ZS5pc0VtcHR5KCkpIHtcbiAgICAgICAgICAvLyBBcmUgd2UgdG9vIGZhciBiZWhpbmQ/IEp1c3QgdGVsbCBvdXIgb2JzZXJ2ZXJzIHRoYXQgdGhleSBuZWVkIHRvXG4gICAgICAgICAgLy8gcmVwb2xsLCBhbmQgZHJvcCBvdXIgcXVldWUuXG4gICAgICAgICAgaWYgKHNlbGYuX2VudHJ5UXVldWUubGVuZ3RoID4gVE9PX0ZBUl9CRUhJTkQpIHtcbiAgICAgICAgICAgIHZhciBsYXN0RW50cnkgPSBzZWxmLl9lbnRyeVF1ZXVlLnBvcCgpO1xuICAgICAgICAgICAgc2VsZi5fZW50cnlRdWV1ZS5jbGVhcigpO1xuXG4gICAgICAgICAgICBzZWxmLl9vblNraXBwZWRFbnRyaWVzSG9vay5lYWNoKGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBGcmVlIGFueSB3YWl0VW50aWxDYXVnaHRVcCgpIGNhbGxzIHRoYXQgd2VyZSB3YWl0aW5nIGZvciB1cyB0b1xuICAgICAgICAgICAgLy8gcGFzcyBzb21ldGhpbmcgdGhhdCB3ZSBqdXN0IHNraXBwZWQuXG4gICAgICAgICAgICBzZWxmLl9zZXRMYXN0UHJvY2Vzc2VkVFMobGFzdEVudHJ5LnRzKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGRvYyA9IHNlbGYuX2VudHJ5UXVldWUuc2hpZnQoKTtcblxuICAgICAgICAgIC8vIEZpcmUgdHJpZ2dlcihzKSBmb3IgdGhpcyBkb2MuXG4gICAgICAgICAgaGFuZGxlRG9jKGRvYyk7XG5cbiAgICAgICAgICAvLyBOb3cgdGhhdCB3ZSd2ZSBwcm9jZXNzZWQgdGhpcyBvcGVyYXRpb24sIHByb2Nlc3MgcGVuZGluZ1xuICAgICAgICAgIC8vIHNlcXVlbmNlcnMuXG4gICAgICAgICAgaWYgKGRvYy50cykge1xuICAgICAgICAgICAgc2VsZi5fc2V0TGFzdFByb2Nlc3NlZFRTKGRvYy50cyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwib3Bsb2cgZW50cnkgd2l0aG91dCB0czogXCIgKyBFSlNPTi5zdHJpbmdpZnkoZG9jKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBzZWxmLl93b3JrZXJBY3RpdmUgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICBfc2V0TGFzdFByb2Nlc3NlZFRTOiBmdW5jdGlvbiAodHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5fbGFzdFByb2Nlc3NlZFRTID0gdHM7XG4gICAgd2hpbGUgKCFfLmlzRW1wdHkoc2VsZi5fY2F0Y2hpbmdVcEZ1dHVyZXMpICYmIHNlbGYuX2NhdGNoaW5nVXBGdXR1cmVzWzBdLnRzLmxlc3NUaGFuT3JFcXVhbChzZWxmLl9sYXN0UHJvY2Vzc2VkVFMpKSB7XG4gICAgICB2YXIgc2VxdWVuY2VyID0gc2VsZi5fY2F0Y2hpbmdVcEZ1dHVyZXMuc2hpZnQoKTtcbiAgICAgIHNlcXVlbmNlci5mdXR1cmUucmV0dXJuKCk7XG4gICAgfVxuICB9LFxuXG4gIC8vTWV0aG9kcyB1c2VkIG9uIHRlc3RzIHRvIGRpbmFtaWNhbGx5IGNoYW5nZSBUT09fRkFSX0JFSElORFxuICBfZGVmaW5lVG9vRmFyQmVoaW5kOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIFRPT19GQVJfQkVISU5EID0gdmFsdWU7XG4gIH0sXG4gIF9yZXNldFRvb0ZhckJlaGluZDogZnVuY3Rpb24oKSB7XG4gICAgVE9PX0ZBUl9CRUhJTkQgPSBwcm9jZXNzLmVudi5NRVRFT1JfT1BMT0dfVE9PX0ZBUl9CRUhJTkQgfHwgMjAwMDtcbiAgfVxufSk7XG4iLCJ2YXIgRnV0dXJlID0gTnBtLnJlcXVpcmUoJ2ZpYmVycy9mdXR1cmUnKTtcblxuT2JzZXJ2ZU11bHRpcGxleGVyID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICghb3B0aW9ucyB8fCAhXy5oYXMob3B0aW9ucywgJ29yZGVyZWQnKSlcbiAgICB0aHJvdyBFcnJvcihcIm11c3Qgc3BlY2lmaWVkIG9yZGVyZWRcIik7XG5cbiAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLW11bHRpcGxleGVyc1wiLCAxKTtcblxuICBzZWxmLl9vcmRlcmVkID0gb3B0aW9ucy5vcmRlcmVkO1xuICBzZWxmLl9vblN0b3AgPSBvcHRpb25zLm9uU3RvcCB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgc2VsZi5fcXVldWUgPSBuZXcgTWV0ZW9yLl9TeW5jaHJvbm91c1F1ZXVlKCk7XG4gIHNlbGYuX2hhbmRsZXMgPSB7fTtcbiAgc2VsZi5fcmVhZHlGdXR1cmUgPSBuZXcgRnV0dXJlO1xuICBzZWxmLl9jYWNoZSA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0NhY2hpbmdDaGFuZ2VPYnNlcnZlcih7XG4gICAgb3JkZXJlZDogb3B0aW9ucy5vcmRlcmVkfSk7XG4gIC8vIE51bWJlciBvZiBhZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHMgdGFza3Mgc2NoZWR1bGVkIGJ1dCBub3QgeWV0XG4gIC8vIHJ1bm5pbmcuIHJlbW92ZUhhbmRsZSB1c2VzIHRoaXMgdG8ga25vdyBpZiBpdCdzIHRpbWUgdG8gY2FsbCB0aGUgb25TdG9wXG4gIC8vIGNhbGxiYWNrLlxuICBzZWxmLl9hZGRIYW5kbGVUYXNrc1NjaGVkdWxlZEJ1dE5vdFBlcmZvcm1lZCA9IDA7XG5cbiAgXy5lYWNoKHNlbGYuY2FsbGJhY2tOYW1lcygpLCBmdW5jdGlvbiAoY2FsbGJhY2tOYW1lKSB7XG4gICAgc2VsZltjYWxsYmFja05hbWVdID0gZnVuY3Rpb24gKC8qIC4uLiAqLykge1xuICAgICAgc2VsZi5fYXBwbHlDYWxsYmFjayhjYWxsYmFja05hbWUsIF8udG9BcnJheShhcmd1bWVudHMpKTtcbiAgICB9O1xuICB9KTtcbn07XG5cbl8uZXh0ZW5kKE9ic2VydmVNdWx0aXBsZXhlci5wcm90b3R5cGUsIHtcbiAgYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzOiBmdW5jdGlvbiAoaGFuZGxlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gQ2hlY2sgdGhpcyBiZWZvcmUgY2FsbGluZyBydW5UYXNrIChldmVuIHRob3VnaCBydW5UYXNrIGRvZXMgdGhlIHNhbWVcbiAgICAvLyBjaGVjaykgc28gdGhhdCB3ZSBkb24ndCBsZWFrIGFuIE9ic2VydmVNdWx0aXBsZXhlciBvbiBlcnJvciBieVxuICAgIC8vIGluY3JlbWVudGluZyBfYWRkSGFuZGxlVGFza3NTY2hlZHVsZWRCdXROb3RQZXJmb3JtZWQgYW5kIG5ldmVyXG4gICAgLy8gZGVjcmVtZW50aW5nIGl0LlxuICAgIGlmICghc2VsZi5fcXVldWUuc2FmZVRvUnVuVGFzaygpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgY2FsbCBvYnNlcnZlQ2hhbmdlcyBmcm9tIGFuIG9ic2VydmUgY2FsbGJhY2sgb24gdGhlIHNhbWUgcXVlcnlcIik7XG4gICAgKytzZWxmLl9hZGRIYW5kbGVUYXNrc1NjaGVkdWxlZEJ1dE5vdFBlcmZvcm1lZDtcblxuICAgIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXSAmJiBQYWNrYWdlWydmYWN0cy1iYXNlJ10uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLWhhbmRsZXNcIiwgMSk7XG5cbiAgICBzZWxmLl9xdWV1ZS5ydW5UYXNrKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX2hhbmRsZXNbaGFuZGxlLl9pZF0gPSBoYW5kbGU7XG4gICAgICAvLyBTZW5kIG91dCB3aGF0ZXZlciBhZGRzIHdlIGhhdmUgc28gZmFyICh3aGV0aGVyIG9yIG5vdCB3ZSB0aGVcbiAgICAgIC8vIG11bHRpcGxleGVyIGlzIHJlYWR5KS5cbiAgICAgIHNlbGYuX3NlbmRBZGRzKGhhbmRsZSk7XG4gICAgICAtLXNlbGYuX2FkZEhhbmRsZVRhc2tzU2NoZWR1bGVkQnV0Tm90UGVyZm9ybWVkO1xuICAgIH0pO1xuICAgIC8vICpvdXRzaWRlKiB0aGUgdGFzaywgc2luY2Ugb3RoZXJ3aXNlIHdlJ2QgZGVhZGxvY2tcbiAgICBzZWxmLl9yZWFkeUZ1dHVyZS53YWl0KCk7XG4gIH0sXG5cbiAgLy8gUmVtb3ZlIGFuIG9ic2VydmUgaGFuZGxlLiBJZiBpdCB3YXMgdGhlIGxhc3Qgb2JzZXJ2ZSBoYW5kbGUsIGNhbGwgdGhlXG4gIC8vIG9uU3RvcCBjYWxsYmFjazsgeW91IGNhbm5vdCBhZGQgYW55IG1vcmUgb2JzZXJ2ZSBoYW5kbGVzIGFmdGVyIHRoaXMuXG4gIC8vXG4gIC8vIFRoaXMgaXMgbm90IHN5bmNocm9uaXplZCB3aXRoIHBvbGxzIGFuZCBoYW5kbGUgYWRkaXRpb25zOiB0aGlzIG1lYW5zIHRoYXRcbiAgLy8geW91IGNhbiBzYWZlbHkgY2FsbCBpdCBmcm9tIHdpdGhpbiBhbiBvYnNlcnZlIGNhbGxiYWNrLCBidXQgaXQgYWxzbyBtZWFuc1xuICAvLyB0aGF0IHdlIGhhdmUgdG8gYmUgY2FyZWZ1bCB3aGVuIHdlIGl0ZXJhdGUgb3ZlciBfaGFuZGxlcy5cbiAgcmVtb3ZlSGFuZGxlOiBmdW5jdGlvbiAoaWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBUaGlzIHNob3VsZCBub3QgYmUgcG9zc2libGU6IHlvdSBjYW4gb25seSBjYWxsIHJlbW92ZUhhbmRsZSBieSBoYXZpbmdcbiAgICAvLyBhY2Nlc3MgdG8gdGhlIE9ic2VydmVIYW5kbGUsIHdoaWNoIGlzbid0IHJldHVybmVkIHRvIHVzZXIgY29kZSB1bnRpbCB0aGVcbiAgICAvLyBtdWx0aXBsZXggaXMgcmVhZHkuXG4gICAgaWYgKCFzZWxmLl9yZWFkeSgpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgcmVtb3ZlIGhhbmRsZXMgdW50aWwgdGhlIG11bHRpcGxleCBpcyByZWFkeVwiKTtcblxuICAgIGRlbGV0ZSBzZWxmLl9oYW5kbGVzW2lkXTtcblxuICAgIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXSAmJiBQYWNrYWdlWydmYWN0cy1iYXNlJ10uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLWhhbmRsZXNcIiwgLTEpO1xuXG4gICAgaWYgKF8uaXNFbXB0eShzZWxmLl9oYW5kbGVzKSAmJlxuICAgICAgICBzZWxmLl9hZGRIYW5kbGVUYXNrc1NjaGVkdWxlZEJ1dE5vdFBlcmZvcm1lZCA9PT0gMCkge1xuICAgICAgc2VsZi5fc3RvcCgpO1xuICAgIH1cbiAgfSxcbiAgX3N0b3A6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgLy8gSXQgc2hvdWxkbid0IGJlIHBvc3NpYmxlIGZvciB1cyB0byBzdG9wIHdoZW4gYWxsIG91ciBoYW5kbGVzIHN0aWxsXG4gICAgLy8gaGF2ZW4ndCBiZWVuIHJldHVybmVkIGZyb20gb2JzZXJ2ZUNoYW5nZXMhXG4gICAgaWYgKCEgc2VsZi5fcmVhZHkoKSAmJiAhIG9wdGlvbnMuZnJvbVF1ZXJ5RXJyb3IpXG4gICAgICB0aHJvdyBFcnJvcihcInN1cnByaXNpbmcgX3N0b3A6IG5vdCByZWFkeVwiKTtcblxuICAgIC8vIENhbGwgc3RvcCBjYWxsYmFjayAod2hpY2gga2lsbHMgdGhlIHVuZGVybHlpbmcgcHJvY2VzcyB3aGljaCBzZW5kcyB1c1xuICAgIC8vIGNhbGxiYWNrcyBhbmQgcmVtb3ZlcyB1cyBmcm9tIHRoZSBjb25uZWN0aW9uJ3MgZGljdGlvbmFyeSkuXG4gICAgc2VsZi5fb25TdG9wKCk7XG4gICAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgXCJtb25nby1saXZlZGF0YVwiLCBcIm9ic2VydmUtbXVsdGlwbGV4ZXJzXCIsIC0xKTtcblxuICAgIC8vIENhdXNlIGZ1dHVyZSBhZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHMgY2FsbHMgdG8gdGhyb3cgKGJ1dCB0aGUgb25TdG9wXG4gICAgLy8gY2FsbGJhY2sgc2hvdWxkIG1ha2Ugb3VyIGNvbm5lY3Rpb24gZm9yZ2V0IGFib3V0IHVzKS5cbiAgICBzZWxmLl9oYW5kbGVzID0gbnVsbDtcbiAgfSxcblxuICAvLyBBbGxvd3MgYWxsIGFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkcyBjYWxscyB0byByZXR1cm4sIG9uY2UgYWxsIHByZWNlZGluZ1xuICAvLyBhZGRzIGhhdmUgYmVlbiBwcm9jZXNzZWQuIERvZXMgbm90IGJsb2NrLlxuICByZWFkeTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLl9xdWV1ZS5xdWV1ZVRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNlbGYuX3JlYWR5KCkpXG4gICAgICAgIHRocm93IEVycm9yKFwiY2FuJ3QgbWFrZSBPYnNlcnZlTXVsdGlwbGV4IHJlYWR5IHR3aWNlIVwiKTtcbiAgICAgIHNlbGYuX3JlYWR5RnV0dXJlLnJldHVybigpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIElmIHRyeWluZyB0byBleGVjdXRlIHRoZSBxdWVyeSByZXN1bHRzIGluIGFuIGVycm9yLCBjYWxsIHRoaXMuIFRoaXMgaXNcbiAgLy8gaW50ZW5kZWQgZm9yIHBlcm1hbmVudCBlcnJvcnMsIG5vdCB0cmFuc2llbnQgbmV0d29yayBlcnJvcnMgdGhhdCBjb3VsZCBiZVxuICAvLyBmaXhlZC4gSXQgc2hvdWxkIG9ubHkgYmUgY2FsbGVkIGJlZm9yZSByZWFkeSgpLCBiZWNhdXNlIGlmIHlvdSBjYWxsZWQgcmVhZHlcbiAgLy8gdGhhdCBtZWFudCB0aGF0IHlvdSBtYW5hZ2VkIHRvIHJ1biB0aGUgcXVlcnkgb25jZS4gSXQgd2lsbCBzdG9wIHRoaXNcbiAgLy8gT2JzZXJ2ZU11bHRpcGxleCBhbmQgY2F1c2UgYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzIGNhbGxzIChhbmQgdGh1c1xuICAvLyBvYnNlcnZlQ2hhbmdlcyBjYWxscykgdG8gdGhyb3cgdGhlIGVycm9yLlxuICBxdWVyeUVycm9yOiBmdW5jdGlvbiAoZXJyKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYuX3F1ZXVlLnJ1blRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNlbGYuX3JlYWR5KCkpXG4gICAgICAgIHRocm93IEVycm9yKFwiY2FuJ3QgY2xhaW0gcXVlcnkgaGFzIGFuIGVycm9yIGFmdGVyIGl0IHdvcmtlZCFcIik7XG4gICAgICBzZWxmLl9zdG9wKHtmcm9tUXVlcnlFcnJvcjogdHJ1ZX0pO1xuICAgICAgc2VsZi5fcmVhZHlGdXR1cmUudGhyb3coZXJyKTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBDYWxscyBcImNiXCIgb25jZSB0aGUgZWZmZWN0cyBvZiBhbGwgXCJyZWFkeVwiLCBcImFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkc1wiXG4gIC8vIGFuZCBvYnNlcnZlIGNhbGxiYWNrcyB3aGljaCBjYW1lIGJlZm9yZSB0aGlzIGNhbGwgaGF2ZSBiZWVuIHByb3BhZ2F0ZWQgdG9cbiAgLy8gYWxsIGhhbmRsZXMuIFwicmVhZHlcIiBtdXN0IGhhdmUgYWxyZWFkeSBiZWVuIGNhbGxlZCBvbiB0aGlzIG11bHRpcGxleGVyLlxuICBvbkZsdXNoOiBmdW5jdGlvbiAoY2IpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5fcXVldWUucXVldWVUYXNrKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghc2VsZi5fcmVhZHkoKSlcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJvbmx5IGNhbGwgb25GbHVzaCBvbiBhIG11bHRpcGxleGVyIHRoYXQgd2lsbCBiZSByZWFkeVwiKTtcbiAgICAgIGNiKCk7XG4gICAgfSk7XG4gIH0sXG4gIGNhbGxiYWNrTmFtZXM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX29yZGVyZWQpXG4gICAgICByZXR1cm4gW1wiYWRkZWRCZWZvcmVcIiwgXCJjaGFuZ2VkXCIsIFwibW92ZWRCZWZvcmVcIiwgXCJyZW1vdmVkXCJdO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBbXCJhZGRlZFwiLCBcImNoYW5nZWRcIiwgXCJyZW1vdmVkXCJdO1xuICB9LFxuICBfcmVhZHk6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcmVhZHlGdXR1cmUuaXNSZXNvbHZlZCgpO1xuICB9LFxuICBfYXBwbHlDYWxsYmFjazogZnVuY3Rpb24gKGNhbGxiYWNrTmFtZSwgYXJncykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLl9xdWV1ZS5xdWV1ZVRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgLy8gSWYgd2Ugc3RvcHBlZCBpbiB0aGUgbWVhbnRpbWUsIGRvIG5vdGhpbmcuXG4gICAgICBpZiAoIXNlbGYuX2hhbmRsZXMpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgLy8gRmlyc3QsIGFwcGx5IHRoZSBjaGFuZ2UgdG8gdGhlIGNhY2hlLlxuICAgICAgLy8gWFhYIFdlIGNvdWxkIG1ha2UgYXBwbHlDaGFuZ2UgY2FsbGJhY2tzIHByb21pc2Ugbm90IHRvIGhhbmcgb24gdG8gYW55XG4gICAgICAvLyBzdGF0ZSBmcm9tIHRoZWlyIGFyZ3VtZW50cyAoYXNzdW1pbmcgdGhhdCB0aGVpciBzdXBwbGllZCBjYWxsYmFja3NcbiAgICAgIC8vIGRvbid0KSBhbmQgc2tpcCB0aGlzIGNsb25lLiBDdXJyZW50bHkgJ2NoYW5nZWQnIGhhbmdzIG9uIHRvIHN0YXRlXG4gICAgICAvLyB0aG91Z2guXG4gICAgICBzZWxmLl9jYWNoZS5hcHBseUNoYW5nZVtjYWxsYmFja05hbWVdLmFwcGx5KG51bGwsIEVKU09OLmNsb25lKGFyZ3MpKTtcblxuICAgICAgLy8gSWYgd2UgaGF2ZW4ndCBmaW5pc2hlZCB0aGUgaW5pdGlhbCBhZGRzLCB0aGVuIHdlIHNob3VsZCBvbmx5IGJlIGdldHRpbmdcbiAgICAgIC8vIGFkZHMuXG4gICAgICBpZiAoIXNlbGYuX3JlYWR5KCkgJiZcbiAgICAgICAgICAoY2FsbGJhY2tOYW1lICE9PSAnYWRkZWQnICYmIGNhbGxiYWNrTmFtZSAhPT0gJ2FkZGVkQmVmb3JlJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR290IFwiICsgY2FsbGJhY2tOYW1lICsgXCIgZHVyaW5nIGluaXRpYWwgYWRkc1wiKTtcbiAgICAgIH1cblxuICAgICAgLy8gTm93IG11bHRpcGxleCB0aGUgY2FsbGJhY2tzIG91dCB0byBhbGwgb2JzZXJ2ZSBoYW5kbGVzLiBJdCdzIE9LIGlmXG4gICAgICAvLyB0aGVzZSBjYWxscyB5aWVsZDsgc2luY2Ugd2UncmUgaW5zaWRlIGEgdGFzaywgbm8gb3RoZXIgdXNlIG9mIG91ciBxdWV1ZVxuICAgICAgLy8gY2FuIGNvbnRpbnVlIHVudGlsIHRoZXNlIGFyZSBkb25lLiAoQnV0IHdlIGRvIGhhdmUgdG8gYmUgY2FyZWZ1bCB0byBub3RcbiAgICAgIC8vIHVzZSBhIGhhbmRsZSB0aGF0IGdvdCByZW1vdmVkLCBiZWNhdXNlIHJlbW92ZUhhbmRsZSBkb2VzIG5vdCB1c2UgdGhlXG4gICAgICAvLyBxdWV1ZTsgdGh1cywgd2UgaXRlcmF0ZSBvdmVyIGFuIGFycmF5IG9mIGtleXMgdGhhdCB3ZSBjb250cm9sLilcbiAgICAgIF8uZWFjaChfLmtleXMoc2VsZi5faGFuZGxlcyksIGZ1bmN0aW9uIChoYW5kbGVJZCkge1xuICAgICAgICB2YXIgaGFuZGxlID0gc2VsZi5faGFuZGxlcyAmJiBzZWxmLl9oYW5kbGVzW2hhbmRsZUlkXTtcbiAgICAgICAgaWYgKCFoYW5kbGUpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSBoYW5kbGVbJ18nICsgY2FsbGJhY2tOYW1lXTtcbiAgICAgICAgLy8gY2xvbmUgYXJndW1lbnRzIHNvIHRoYXQgY2FsbGJhY2tzIGNhbiBtdXRhdGUgdGhlaXIgYXJndW1lbnRzXG4gICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrLmFwcGx5KG51bGwsIEVKU09OLmNsb25lKGFyZ3MpKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFNlbmRzIGluaXRpYWwgYWRkcyB0byBhIGhhbmRsZS4gSXQgc2hvdWxkIG9ubHkgYmUgY2FsbGVkIGZyb20gd2l0aGluIGEgdGFza1xuICAvLyAodGhlIHRhc2sgdGhhdCBpcyBwcm9jZXNzaW5nIHRoZSBhZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHMgY2FsbCkuIEl0XG4gIC8vIHN5bmNocm9ub3VzbHkgaW52b2tlcyB0aGUgaGFuZGxlJ3MgYWRkZWQgb3IgYWRkZWRCZWZvcmU7IHRoZXJlJ3Mgbm8gbmVlZCB0b1xuICAvLyBmbHVzaCB0aGUgcXVldWUgYWZ0ZXJ3YXJkcyB0byBlbnN1cmUgdGhhdCB0aGUgY2FsbGJhY2tzIGdldCBvdXQuXG4gIF9zZW5kQWRkczogZnVuY3Rpb24gKGhhbmRsZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fcXVldWUuc2FmZVRvUnVuVGFzaygpKVxuICAgICAgdGhyb3cgRXJyb3IoXCJfc2VuZEFkZHMgbWF5IG9ubHkgYmUgY2FsbGVkIGZyb20gd2l0aGluIGEgdGFzayFcIik7XG4gICAgdmFyIGFkZCA9IHNlbGYuX29yZGVyZWQgPyBoYW5kbGUuX2FkZGVkQmVmb3JlIDogaGFuZGxlLl9hZGRlZDtcbiAgICBpZiAoIWFkZClcbiAgICAgIHJldHVybjtcbiAgICAvLyBub3RlOiBkb2NzIG1heSBiZSBhbiBfSWRNYXAgb3IgYW4gT3JkZXJlZERpY3RcbiAgICBzZWxmLl9jYWNoZS5kb2NzLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaWQpIHtcbiAgICAgIGlmICghXy5oYXMoc2VsZi5faGFuZGxlcywgaGFuZGxlLl9pZCkpXG4gICAgICAgIHRocm93IEVycm9yKFwiaGFuZGxlIGdvdCByZW1vdmVkIGJlZm9yZSBzZW5kaW5nIGluaXRpYWwgYWRkcyFcIik7XG4gICAgICB2YXIgZmllbGRzID0gRUpTT04uY2xvbmUoZG9jKTtcbiAgICAgIGRlbGV0ZSBmaWVsZHMuX2lkO1xuICAgICAgaWYgKHNlbGYuX29yZGVyZWQpXG4gICAgICAgIGFkZChpZCwgZmllbGRzLCBudWxsKTsgLy8gd2UncmUgZ29pbmcgaW4gb3JkZXIsIHNvIGFkZCBhdCBlbmRcbiAgICAgIGVsc2VcbiAgICAgICAgYWRkKGlkLCBmaWVsZHMpO1xuICAgIH0pO1xuICB9XG59KTtcblxuXG52YXIgbmV4dE9ic2VydmVIYW5kbGVJZCA9IDE7XG5PYnNlcnZlSGFuZGxlID0gZnVuY3Rpb24gKG11bHRpcGxleGVyLCBjYWxsYmFja3MpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICAvLyBUaGUgZW5kIHVzZXIgaXMgb25seSBzdXBwb3NlZCB0byBjYWxsIHN0b3AoKS4gIFRoZSBvdGhlciBmaWVsZHMgYXJlXG4gIC8vIGFjY2Vzc2libGUgdG8gdGhlIG11bHRpcGxleGVyLCB0aG91Z2guXG4gIHNlbGYuX211bHRpcGxleGVyID0gbXVsdGlwbGV4ZXI7XG4gIF8uZWFjaChtdWx0aXBsZXhlci5jYWxsYmFja05hbWVzKCksIGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgaWYgKGNhbGxiYWNrc1tuYW1lXSkge1xuICAgICAgc2VsZlsnXycgKyBuYW1lXSA9IGNhbGxiYWNrc1tuYW1lXTtcbiAgICB9IGVsc2UgaWYgKG5hbWUgPT09IFwiYWRkZWRCZWZvcmVcIiAmJiBjYWxsYmFja3MuYWRkZWQpIHtcbiAgICAgIC8vIFNwZWNpYWwgY2FzZTogaWYgeW91IHNwZWNpZnkgXCJhZGRlZFwiIGFuZCBcIm1vdmVkQmVmb3JlXCIsIHlvdSBnZXQgYW5cbiAgICAgIC8vIG9yZGVyZWQgb2JzZXJ2ZSB3aGVyZSBmb3Igc29tZSByZWFzb24geW91IGRvbid0IGdldCBvcmRlcmluZyBkYXRhIG9uXG4gICAgICAvLyB0aGUgYWRkcy4gIEkgZHVubm8sIHdlIHdyb3RlIHRlc3RzIGZvciBpdCwgdGhlcmUgbXVzdCBoYXZlIGJlZW4gYVxuICAgICAgLy8gcmVhc29uLlxuICAgICAgc2VsZi5fYWRkZWRCZWZvcmUgPSBmdW5jdGlvbiAoaWQsIGZpZWxkcywgYmVmb3JlKSB7XG4gICAgICAgIGNhbGxiYWNrcy5hZGRlZChpZCwgZmllbGRzKTtcbiAgICAgIH07XG4gICAgfVxuICB9KTtcbiAgc2VsZi5fc3RvcHBlZCA9IGZhbHNlO1xuICBzZWxmLl9pZCA9IG5leHRPYnNlcnZlSGFuZGxlSWQrKztcbn07XG5PYnNlcnZlSGFuZGxlLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgIHJldHVybjtcbiAgc2VsZi5fc3RvcHBlZCA9IHRydWU7XG4gIHNlbGYuX211bHRpcGxleGVyLnJlbW92ZUhhbmRsZShzZWxmLl9pZCk7XG59O1xuIiwidmFyIEZpYmVyID0gTnBtLnJlcXVpcmUoJ2ZpYmVycycpO1xudmFyIEZ1dHVyZSA9IE5wbS5yZXF1aXJlKCdmaWJlcnMvZnV0dXJlJyk7XG5cbkRvY0ZldGNoZXIgPSBmdW5jdGlvbiAobW9uZ29Db25uZWN0aW9uKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5fbW9uZ29Db25uZWN0aW9uID0gbW9uZ29Db25uZWN0aW9uO1xuICAvLyBNYXAgZnJvbSBjYWNoZSBrZXkgLT4gW2NhbGxiYWNrXVxuICBzZWxmLl9jYWxsYmFja3NGb3JDYWNoZUtleSA9IHt9O1xufTtcblxuXy5leHRlbmQoRG9jRmV0Y2hlci5wcm90b3R5cGUsIHtcbiAgLy8gRmV0Y2hlcyBkb2N1bWVudCBcImlkXCIgZnJvbSBjb2xsZWN0aW9uTmFtZSwgcmV0dXJuaW5nIGl0IG9yIG51bGwgaWYgbm90XG4gIC8vIGZvdW5kLlxuICAvL1xuICAvLyBJZiB5b3UgbWFrZSBtdWx0aXBsZSBjYWxscyB0byBmZXRjaCgpIHdpdGggdGhlIHNhbWUgY2FjaGVLZXkgKGEgc3RyaW5nKSxcbiAgLy8gRG9jRmV0Y2hlciBtYXkgYXNzdW1lIHRoYXQgdGhleSBhbGwgcmV0dXJuIHRoZSBzYW1lIGRvY3VtZW50LiAoSXQgZG9lc1xuICAvLyBub3QgY2hlY2sgdG8gc2VlIGlmIGNvbGxlY3Rpb25OYW1lL2lkIG1hdGNoLilcbiAgLy9cbiAgLy8gWW91IG1heSBhc3N1bWUgdGhhdCBjYWxsYmFjayBpcyBuZXZlciBjYWxsZWQgc3luY2hyb25vdXNseSAoYW5kIGluIGZhY3RcbiAgLy8gT3Bsb2dPYnNlcnZlRHJpdmVyIGRvZXMgc28pLlxuICBmZXRjaDogZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBpZCwgY2FjaGVLZXksIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgY2hlY2soY29sbGVjdGlvbk5hbWUsIFN0cmluZyk7XG4gICAgLy8gaWQgaXMgc29tZSBzb3J0IG9mIHNjYWxhclxuICAgIGNoZWNrKGNhY2hlS2V5LCBTdHJpbmcpO1xuXG4gICAgLy8gSWYgdGhlcmUncyBhbHJlYWR5IGFuIGluLXByb2dyZXNzIGZldGNoIGZvciB0aGlzIGNhY2hlIGtleSwgeWllbGQgdW50aWxcbiAgICAvLyBpdCdzIGRvbmUgYW5kIHJldHVybiB3aGF0ZXZlciBpdCByZXR1cm5zLlxuICAgIGlmIChfLmhhcyhzZWxmLl9jYWxsYmFja3NGb3JDYWNoZUtleSwgY2FjaGVLZXkpKSB7XG4gICAgICBzZWxmLl9jYWxsYmFja3NGb3JDYWNoZUtleVtjYWNoZUtleV0ucHVzaChjYWxsYmFjayk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGNhbGxiYWNrcyA9IHNlbGYuX2NhbGxiYWNrc0ZvckNhY2hlS2V5W2NhY2hlS2V5XSA9IFtjYWxsYmFja107XG5cbiAgICBGaWJlcihmdW5jdGlvbiAoKSB7XG4gICAgICB0cnkge1xuICAgICAgICB2YXIgZG9jID0gc2VsZi5fbW9uZ29Db25uZWN0aW9uLmZpbmRPbmUoXG4gICAgICAgICAgY29sbGVjdGlvbk5hbWUsIHtfaWQ6IGlkfSkgfHwgbnVsbDtcbiAgICAgICAgLy8gUmV0dXJuIGRvYyB0byBhbGwgcmVsZXZhbnQgY2FsbGJhY2tzLiBOb3RlIHRoYXQgdGhpcyBhcnJheSBjYW5cbiAgICAgICAgLy8gY29udGludWUgdG8gZ3JvdyBkdXJpbmcgY2FsbGJhY2sgZXhjZWN1dGlvbi5cbiAgICAgICAgd2hpbGUgKCFfLmlzRW1wdHkoY2FsbGJhY2tzKSkge1xuICAgICAgICAgIC8vIENsb25lIHRoZSBkb2N1bWVudCBzbyB0aGF0IHRoZSB2YXJpb3VzIGNhbGxzIHRvIGZldGNoIGRvbid0IHJldHVyblxuICAgICAgICAgIC8vIG9iamVjdHMgdGhhdCBhcmUgaW50ZXJ0d2luZ2xlZCB3aXRoIGVhY2ggb3RoZXIuIENsb25lIGJlZm9yZVxuICAgICAgICAgIC8vIHBvcHBpbmcgdGhlIGZ1dHVyZSwgc28gdGhhdCBpZiBjbG9uZSB0aHJvd3MsIHRoZSBlcnJvciBnZXRzIHBhc3NlZFxuICAgICAgICAgIC8vIHRvIHRoZSBuZXh0IGNhbGxiYWNrLlxuICAgICAgICAgIHZhciBjbG9uZWREb2MgPSBFSlNPTi5jbG9uZShkb2MpO1xuICAgICAgICAgIGNhbGxiYWNrcy5wb3AoKShudWxsLCBjbG9uZWREb2MpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHdoaWxlICghXy5pc0VtcHR5KGNhbGxiYWNrcykpIHtcbiAgICAgICAgICBjYWxsYmFja3MucG9wKCkoZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIC8vIFhYWCBjb25zaWRlciBrZWVwaW5nIHRoZSBkb2MgYXJvdW5kIGZvciBhIHBlcmlvZCBvZiB0aW1lIGJlZm9yZVxuICAgICAgICAvLyByZW1vdmluZyBmcm9tIHRoZSBjYWNoZVxuICAgICAgICBkZWxldGUgc2VsZi5fY2FsbGJhY2tzRm9yQ2FjaGVLZXlbY2FjaGVLZXldO1xuICAgICAgfVxuICAgIH0pLnJ1bigpO1xuICB9XG59KTtcblxuTW9uZ29UZXN0LkRvY0ZldGNoZXIgPSBEb2NGZXRjaGVyO1xuIiwidmFyIFBPTExJTkdfVEhST1RUTEVfTVMgPSArcHJvY2Vzcy5lbnYuTUVURU9SX1BPTExJTkdfVEhST1RUTEVfTVMgfHwgNTA7XG52YXIgUE9MTElOR19JTlRFUlZBTF9NUyA9ICtwcm9jZXNzLmVudi5NRVRFT1JfUE9MTElOR19JTlRFUlZBTF9NUyB8fCAxMCAqIDEwMDA7XG5cblBvbGxpbmdPYnNlcnZlRHJpdmVyID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uID0gb3B0aW9ucy5jdXJzb3JEZXNjcmlwdGlvbjtcbiAgc2VsZi5fbW9uZ29IYW5kbGUgPSBvcHRpb25zLm1vbmdvSGFuZGxlO1xuICBzZWxmLl9vcmRlcmVkID0gb3B0aW9ucy5vcmRlcmVkO1xuICBzZWxmLl9tdWx0aXBsZXhlciA9IG9wdGlvbnMubXVsdGlwbGV4ZXI7XG4gIHNlbGYuX3N0b3BDYWxsYmFja3MgPSBbXTtcbiAgc2VsZi5fc3RvcHBlZCA9IGZhbHNlO1xuXG4gIHNlbGYuX3N5bmNocm9ub3VzQ3Vyc29yID0gc2VsZi5fbW9uZ29IYW5kbGUuX2NyZWF0ZVN5bmNocm9ub3VzQ3Vyc29yKFxuICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uKTtcblxuICAvLyBwcmV2aW91cyByZXN1bHRzIHNuYXBzaG90LiAgb24gZWFjaCBwb2xsIGN5Y2xlLCBkaWZmcyBhZ2FpbnN0XG4gIC8vIHJlc3VsdHMgZHJpdmVzIHRoZSBjYWxsYmFja3MuXG4gIHNlbGYuX3Jlc3VsdHMgPSBudWxsO1xuXG4gIC8vIFRoZSBudW1iZXIgb2YgX3BvbGxNb25nbyBjYWxscyB0aGF0IGhhdmUgYmVlbiBhZGRlZCB0byBzZWxmLl90YXNrUXVldWUgYnV0XG4gIC8vIGhhdmUgbm90IHN0YXJ0ZWQgcnVubmluZy4gVXNlZCB0byBtYWtlIHN1cmUgd2UgbmV2ZXIgc2NoZWR1bGUgbW9yZSB0aGFuIG9uZVxuICAvLyBfcG9sbE1vbmdvIChvdGhlciB0aGFuIHBvc3NpYmx5IHRoZSBvbmUgdGhhdCBpcyBjdXJyZW50bHkgcnVubmluZykuIEl0J3NcbiAgLy8gYWxzbyB1c2VkIGJ5IF9zdXNwZW5kUG9sbGluZyB0byBwcmV0ZW5kIHRoZXJlJ3MgYSBwb2xsIHNjaGVkdWxlZC4gVXN1YWxseSxcbiAgLy8gaXQncyBlaXRoZXIgMCAoZm9yIFwibm8gcG9sbHMgc2NoZWR1bGVkIG90aGVyIHRoYW4gbWF5YmUgb25lIGN1cnJlbnRseVxuICAvLyBydW5uaW5nXCIpIG9yIDEgKGZvciBcImEgcG9sbCBzY2hlZHVsZWQgdGhhdCBpc24ndCBydW5uaW5nIHlldFwiKSwgYnV0IGl0IGNhblxuICAvLyBhbHNvIGJlIDIgaWYgaW5jcmVtZW50ZWQgYnkgX3N1c3BlbmRQb2xsaW5nLlxuICBzZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgPSAwO1xuICBzZWxmLl9wZW5kaW5nV3JpdGVzID0gW107IC8vIHBlb3BsZSB0byBub3RpZnkgd2hlbiBwb2xsaW5nIGNvbXBsZXRlc1xuXG4gIC8vIE1ha2Ugc3VyZSB0byBjcmVhdGUgYSBzZXBhcmF0ZWx5IHRocm90dGxlZCBmdW5jdGlvbiBmb3IgZWFjaFxuICAvLyBQb2xsaW5nT2JzZXJ2ZURyaXZlciBvYmplY3QuXG4gIHNlbGYuX2Vuc3VyZVBvbGxJc1NjaGVkdWxlZCA9IF8udGhyb3R0bGUoXG4gICAgc2VsZi5fdW50aHJvdHRsZWRFbnN1cmVQb2xsSXNTY2hlZHVsZWQsXG4gICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5wb2xsaW5nVGhyb3R0bGVNcyB8fCBQT0xMSU5HX1RIUk9UVExFX01TIC8qIG1zICovKTtcblxuICAvLyBYWFggZmlndXJlIG91dCBpZiB3ZSBzdGlsbCBuZWVkIGEgcXVldWVcbiAgc2VsZi5fdGFza1F1ZXVlID0gbmV3IE1ldGVvci5fU3luY2hyb25vdXNRdWV1ZSgpO1xuXG4gIHZhciBsaXN0ZW5lcnNIYW5kbGUgPSBsaXN0ZW5BbGwoXG4gICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24sIGZ1bmN0aW9uIChub3RpZmljYXRpb24pIHtcbiAgICAgIC8vIFdoZW4gc29tZW9uZSBkb2VzIGEgdHJhbnNhY3Rpb24gdGhhdCBtaWdodCBhZmZlY3QgdXMsIHNjaGVkdWxlIGEgcG9sbFxuICAgICAgLy8gb2YgdGhlIGRhdGFiYXNlLiBJZiB0aGF0IHRyYW5zYWN0aW9uIGhhcHBlbnMgaW5zaWRlIG9mIGEgd3JpdGUgZmVuY2UsXG4gICAgICAvLyBibG9jayB0aGUgZmVuY2UgdW50aWwgd2UndmUgcG9sbGVkIGFuZCBub3RpZmllZCBvYnNlcnZlcnMuXG4gICAgICB2YXIgZmVuY2UgPSBERFBTZXJ2ZXIuX0N1cnJlbnRXcml0ZUZlbmNlLmdldCgpO1xuICAgICAgaWYgKGZlbmNlKVxuICAgICAgICBzZWxmLl9wZW5kaW5nV3JpdGVzLnB1c2goZmVuY2UuYmVnaW5Xcml0ZSgpKTtcbiAgICAgIC8vIEVuc3VyZSBhIHBvbGwgaXMgc2NoZWR1bGVkLi4uIGJ1dCBpZiB3ZSBhbHJlYWR5IGtub3cgdGhhdCBvbmUgaXMsXG4gICAgICAvLyBkb24ndCBoaXQgdGhlIHRocm90dGxlZCBfZW5zdXJlUG9sbElzU2NoZWR1bGVkIGZ1bmN0aW9uICh3aGljaCBtaWdodFxuICAgICAgLy8gbGVhZCB0byB1cyBjYWxsaW5nIGl0IHVubmVjZXNzYXJpbHkgaW4gPHBvbGxpbmdUaHJvdHRsZU1zPiBtcykuXG4gICAgICBpZiAoc2VsZi5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkID09PSAwKVxuICAgICAgICBzZWxmLl9lbnN1cmVQb2xsSXNTY2hlZHVsZWQoKTtcbiAgICB9XG4gICk7XG4gIHNlbGYuX3N0b3BDYWxsYmFja3MucHVzaChmdW5jdGlvbiAoKSB7IGxpc3RlbmVyc0hhbmRsZS5zdG9wKCk7IH0pO1xuXG4gIC8vIGV2ZXJ5IG9uY2UgYW5kIGEgd2hpbGUsIHBvbGwgZXZlbiBpZiB3ZSBkb24ndCB0aGluayB3ZSdyZSBkaXJ0eSwgZm9yXG4gIC8vIGV2ZW50dWFsIGNvbnNpc3RlbmN5IHdpdGggZGF0YWJhc2Ugd3JpdGVzIGZyb20gb3V0c2lkZSB0aGUgTWV0ZW9yXG4gIC8vIHVuaXZlcnNlLlxuICAvL1xuICAvLyBGb3IgdGVzdGluZywgdGhlcmUncyBhbiB1bmRvY3VtZW50ZWQgY2FsbGJhY2sgYXJndW1lbnQgdG8gb2JzZXJ2ZUNoYW5nZXNcbiAgLy8gd2hpY2ggZGlzYWJsZXMgdGltZS1iYXNlZCBwb2xsaW5nIGFuZCBnZXRzIGNhbGxlZCBhdCB0aGUgYmVnaW5uaW5nIG9mIGVhY2hcbiAgLy8gcG9sbC5cbiAgaWYgKG9wdGlvbnMuX3Rlc3RPbmx5UG9sbENhbGxiYWNrKSB7XG4gICAgc2VsZi5fdGVzdE9ubHlQb2xsQ2FsbGJhY2sgPSBvcHRpb25zLl90ZXN0T25seVBvbGxDYWxsYmFjaztcbiAgfSBlbHNlIHtcbiAgICB2YXIgcG9sbGluZ0ludGVydmFsID1cbiAgICAgICAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnBvbGxpbmdJbnRlcnZhbE1zIHx8XG4gICAgICAgICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5fcG9sbGluZ0ludGVydmFsIHx8IC8vIENPTVBBVCB3aXRoIDEuMlxuICAgICAgICAgIFBPTExJTkdfSU5URVJWQUxfTVM7XG4gICAgdmFyIGludGVydmFsSGFuZGxlID0gTWV0ZW9yLnNldEludGVydmFsKFxuICAgICAgXy5iaW5kKHNlbGYuX2Vuc3VyZVBvbGxJc1NjaGVkdWxlZCwgc2VsZiksIHBvbGxpbmdJbnRlcnZhbCk7XG4gICAgc2VsZi5fc3RvcENhbGxiYWNrcy5wdXNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIE1ldGVvci5jbGVhckludGVydmFsKGludGVydmFsSGFuZGxlKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIE1ha2Ugc3VyZSB3ZSBhY3R1YWxseSBwb2xsIHNvb24hXG4gIHNlbGYuX3VudGhyb3R0bGVkRW5zdXJlUG9sbElzU2NoZWR1bGVkKCk7XG5cbiAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLWRyaXZlcnMtcG9sbGluZ1wiLCAxKTtcbn07XG5cbl8uZXh0ZW5kKFBvbGxpbmdPYnNlcnZlRHJpdmVyLnByb3RvdHlwZSwge1xuICAvLyBUaGlzIGlzIGFsd2F5cyBjYWxsZWQgdGhyb3VnaCBfLnRocm90dGxlIChleGNlcHQgb25jZSBhdCBzdGFydHVwKS5cbiAgX3VudGhyb3R0bGVkRW5zdXJlUG9sbElzU2NoZWR1bGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgPiAwKVxuICAgICAgcmV0dXJuO1xuICAgICsrc2VsZi5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkO1xuICAgIHNlbGYuX3Rhc2tRdWV1ZS5xdWV1ZVRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fcG9sbE1vbmdvKCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gdGVzdC1vbmx5IGludGVyZmFjZSBmb3IgY29udHJvbGxpbmcgcG9sbGluZy5cbiAgLy9cbiAgLy8gX3N1c3BlbmRQb2xsaW5nIGJsb2NrcyB1bnRpbCBhbnkgY3VycmVudGx5IHJ1bm5pbmcgYW5kIHNjaGVkdWxlZCBwb2xscyBhcmVcbiAgLy8gZG9uZSwgYW5kIHByZXZlbnRzIGFueSBmdXJ0aGVyIHBvbGxzIGZyb20gYmVpbmcgc2NoZWR1bGVkLiAobmV3XG4gIC8vIE9ic2VydmVIYW5kbGVzIGNhbiBiZSBhZGRlZCBhbmQgcmVjZWl2ZSB0aGVpciBpbml0aWFsIGFkZGVkIGNhbGxiYWNrcyxcbiAgLy8gdGhvdWdoLilcbiAgLy9cbiAgLy8gX3Jlc3VtZVBvbGxpbmcgaW1tZWRpYXRlbHkgcG9sbHMsIGFuZCBhbGxvd3MgZnVydGhlciBwb2xscyB0byBvY2N1ci5cbiAgX3N1c3BlbmRQb2xsaW5nOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gUHJldGVuZCB0aGF0IHRoZXJlJ3MgYW5vdGhlciBwb2xsIHNjaGVkdWxlZCAod2hpY2ggd2lsbCBwcmV2ZW50XG4gICAgLy8gX2Vuc3VyZVBvbGxJc1NjaGVkdWxlZCBmcm9tIHF1ZXVlaW5nIGFueSBtb3JlIHBvbGxzKS5cbiAgICArK3NlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZDtcbiAgICAvLyBOb3cgYmxvY2sgdW50aWwgYWxsIGN1cnJlbnRseSBydW5uaW5nIG9yIHNjaGVkdWxlZCBwb2xscyBhcmUgZG9uZS5cbiAgICBzZWxmLl90YXNrUXVldWUucnVuVGFzayhmdW5jdGlvbigpIHt9KTtcblxuICAgIC8vIENvbmZpcm0gdGhhdCB0aGVyZSBpcyBvbmx5IG9uZSBcInBvbGxcIiAodGhlIGZha2Ugb25lIHdlJ3JlIHByZXRlbmRpbmcgdG9cbiAgICAvLyBoYXZlKSBzY2hlZHVsZWQuXG4gICAgaWYgKHNlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCAhPT0gMSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgaXMgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCk7XG4gIH0sXG4gIF9yZXN1bWVQb2xsaW5nOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gV2Ugc2hvdWxkIGJlIGluIHRoZSBzYW1lIHN0YXRlIGFzIGluIHRoZSBlbmQgb2YgX3N1c3BlbmRQb2xsaW5nLlxuICAgIGlmIChzZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgIT09IDEpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJfcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkIGlzIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQpO1xuICAgIC8vIFJ1biBhIHBvbGwgc3luY2hyb25vdXNseSAod2hpY2ggd2lsbCBjb3VudGVyYWN0IHRoZVxuICAgIC8vICsrX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCBmcm9tIF9zdXNwZW5kUG9sbGluZykuXG4gICAgc2VsZi5fdGFza1F1ZXVlLnJ1blRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fcG9sbE1vbmdvKCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgX3BvbGxNb25nbzogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAtLXNlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZDtcblxuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdmFyIGZpcnN0ID0gZmFsc2U7XG4gICAgdmFyIG5ld1Jlc3VsdHM7XG4gICAgdmFyIG9sZFJlc3VsdHMgPSBzZWxmLl9yZXN1bHRzO1xuICAgIGlmICghb2xkUmVzdWx0cykge1xuICAgICAgZmlyc3QgPSB0cnVlO1xuICAgICAgLy8gWFhYIG1heWJlIHVzZSBPcmRlcmVkRGljdCBpbnN0ZWFkP1xuICAgICAgb2xkUmVzdWx0cyA9IHNlbGYuX29yZGVyZWQgPyBbXSA6IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICAgIH1cblxuICAgIHNlbGYuX3Rlc3RPbmx5UG9sbENhbGxiYWNrICYmIHNlbGYuX3Rlc3RPbmx5UG9sbENhbGxiYWNrKCk7XG5cbiAgICAvLyBTYXZlIHRoZSBsaXN0IG9mIHBlbmRpbmcgd3JpdGVzIHdoaWNoIHRoaXMgcm91bmQgd2lsbCBjb21taXQuXG4gICAgdmFyIHdyaXRlc0ZvckN5Y2xlID0gc2VsZi5fcGVuZGluZ1dyaXRlcztcbiAgICBzZWxmLl9wZW5kaW5nV3JpdGVzID0gW107XG5cbiAgICAvLyBHZXQgdGhlIG5ldyBxdWVyeSByZXN1bHRzLiAoVGhpcyB5aWVsZHMuKVxuICAgIHRyeSB7XG4gICAgICBuZXdSZXN1bHRzID0gc2VsZi5fc3luY2hyb25vdXNDdXJzb3IuZ2V0UmF3T2JqZWN0cyhzZWxmLl9vcmRlcmVkKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZmlyc3QgJiYgdHlwZW9mKGUuY29kZSkgPT09ICdudW1iZXInKSB7XG4gICAgICAgIC8vIFRoaXMgaXMgYW4gZXJyb3IgZG9jdW1lbnQgc2VudCB0byB1cyBieSBtb25nb2QsIG5vdCBhIGNvbm5lY3Rpb25cbiAgICAgICAgLy8gZXJyb3IgZ2VuZXJhdGVkIGJ5IHRoZSBjbGllbnQuIEFuZCB3ZSd2ZSBuZXZlciBzZWVuIHRoaXMgcXVlcnkgd29ya1xuICAgICAgICAvLyBzdWNjZXNzZnVsbHkuIFByb2JhYmx5IGl0J3MgYSBiYWQgc2VsZWN0b3Igb3Igc29tZXRoaW5nLCBzbyB3ZSBzaG91bGRcbiAgICAgICAgLy8gTk9UIHJldHJ5LiBJbnN0ZWFkLCB3ZSBzaG91bGQgaGFsdCB0aGUgb2JzZXJ2ZSAod2hpY2ggZW5kcyB1cCBjYWxsaW5nXG4gICAgICAgIC8vIGBzdG9wYCBvbiB1cykuXG4gICAgICAgIHNlbGYuX211bHRpcGxleGVyLnF1ZXJ5RXJyb3IoXG4gICAgICAgICAgbmV3IEVycm9yKFxuICAgICAgICAgICAgXCJFeGNlcHRpb24gd2hpbGUgcG9sbGluZyBxdWVyeSBcIiArXG4gICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uKSArIFwiOiBcIiArIGUubWVzc2FnZSkpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGdldFJhd09iamVjdHMgY2FuIHRocm93IGlmIHdlJ3JlIGhhdmluZyB0cm91YmxlIHRhbGtpbmcgdG8gdGhlXG4gICAgICAvLyBkYXRhYmFzZS4gIFRoYXQncyBmaW5lIC0tLSB3ZSB3aWxsIHJlcG9sbCBsYXRlciBhbnl3YXkuIEJ1dCB3ZSBzaG91bGRcbiAgICAgIC8vIG1ha2Ugc3VyZSBub3QgdG8gbG9zZSB0cmFjayBvZiB0aGlzIGN5Y2xlJ3Mgd3JpdGVzLlxuICAgICAgLy8gKEl0IGFsc28gY2FuIHRocm93IGlmIHRoZXJlJ3MganVzdCBzb21ldGhpbmcgaW52YWxpZCBhYm91dCB0aGlzIHF1ZXJ5O1xuICAgICAgLy8gdW5mb3J0dW5hdGVseSB0aGUgT2JzZXJ2ZURyaXZlciBBUEkgZG9lc24ndCBwcm92aWRlIGEgZ29vZCB3YXkgdG9cbiAgICAgIC8vIFwiY2FuY2VsXCIgdGhlIG9ic2VydmUgZnJvbSB0aGUgaW5zaWRlIGluIHRoaXMgY2FzZS5cbiAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KHNlbGYuX3BlbmRpbmdXcml0ZXMsIHdyaXRlc0ZvckN5Y2xlKTtcbiAgICAgIE1ldGVvci5fZGVidWcoXCJFeGNlcHRpb24gd2hpbGUgcG9sbGluZyBxdWVyeSBcIiArXG4gICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uKSwgZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gUnVuIGRpZmZzLlxuICAgIGlmICghc2VsZi5fc3RvcHBlZCkge1xuICAgICAgTG9jYWxDb2xsZWN0aW9uLl9kaWZmUXVlcnlDaGFuZ2VzKFxuICAgICAgICBzZWxmLl9vcmRlcmVkLCBvbGRSZXN1bHRzLCBuZXdSZXN1bHRzLCBzZWxmLl9tdWx0aXBsZXhlcik7XG4gICAgfVxuXG4gICAgLy8gU2lnbmFscyB0aGUgbXVsdGlwbGV4ZXIgdG8gYWxsb3cgYWxsIG9ic2VydmVDaGFuZ2VzIGNhbGxzIHRoYXQgc2hhcmUgdGhpc1xuICAgIC8vIG11bHRpcGxleGVyIHRvIHJldHVybi4gKFRoaXMgaGFwcGVucyBhc3luY2hyb25vdXNseSwgdmlhIHRoZVxuICAgIC8vIG11bHRpcGxleGVyJ3MgcXVldWUuKVxuICAgIGlmIChmaXJzdClcbiAgICAgIHNlbGYuX211bHRpcGxleGVyLnJlYWR5KCk7XG5cbiAgICAvLyBSZXBsYWNlIHNlbGYuX3Jlc3VsdHMgYXRvbWljYWxseS4gIChUaGlzIGFzc2lnbm1lbnQgaXMgd2hhdCBtYWtlcyBgZmlyc3RgXG4gICAgLy8gc3RheSB0aHJvdWdoIG9uIHRoZSBuZXh0IGN5Y2xlLCBzbyB3ZSd2ZSB3YWl0ZWQgdW50aWwgYWZ0ZXIgd2UndmVcbiAgICAvLyBjb21taXR0ZWQgdG8gcmVhZHktaW5nIHRoZSBtdWx0aXBsZXhlci4pXG4gICAgc2VsZi5fcmVzdWx0cyA9IG5ld1Jlc3VsdHM7XG5cbiAgICAvLyBPbmNlIHRoZSBPYnNlcnZlTXVsdGlwbGV4ZXIgaGFzIHByb2Nlc3NlZCBldmVyeXRoaW5nIHdlJ3ZlIGRvbmUgaW4gdGhpc1xuICAgIC8vIHJvdW5kLCBtYXJrIGFsbCB0aGUgd3JpdGVzIHdoaWNoIGV4aXN0ZWQgYmVmb3JlIHRoaXMgY2FsbCBhc1xuICAgIC8vIGNvbW1taXR0ZWQuIChJZiBuZXcgd3JpdGVzIGhhdmUgc2hvd24gdXAgaW4gdGhlIG1lYW50aW1lLCB0aGVyZSdsbFxuICAgIC8vIGFscmVhZHkgYmUgYW5vdGhlciBfcG9sbE1vbmdvIHRhc2sgc2NoZWR1bGVkLilcbiAgICBzZWxmLl9tdWx0aXBsZXhlci5vbkZsdXNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIF8uZWFjaCh3cml0ZXNGb3JDeWNsZSwgZnVuY3Rpb24gKHcpIHtcbiAgICAgICAgdy5jb21taXR0ZWQoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5fc3RvcHBlZCA9IHRydWU7XG4gICAgXy5lYWNoKHNlbGYuX3N0b3BDYWxsYmFja3MsIGZ1bmN0aW9uIChjKSB7IGMoKTsgfSk7XG4gICAgLy8gUmVsZWFzZSBhbnkgd3JpdGUgZmVuY2VzIHRoYXQgYXJlIHdhaXRpbmcgb24gdXMuXG4gICAgXy5lYWNoKHNlbGYuX3BlbmRpbmdXcml0ZXMsIGZ1bmN0aW9uICh3KSB7XG4gICAgICB3LmNvbW1pdHRlZCgpO1xuICAgIH0pO1xuICAgIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXSAmJiBQYWNrYWdlWydmYWN0cy1iYXNlJ10uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLWRyaXZlcnMtcG9sbGluZ1wiLCAtMSk7XG4gIH1cbn0pO1xuIiwidmFyIEZ1dHVyZSA9IE5wbS5yZXF1aXJlKCdmaWJlcnMvZnV0dXJlJyk7XG5cbnZhciBQSEFTRSA9IHtcbiAgUVVFUllJTkc6IFwiUVVFUllJTkdcIixcbiAgRkVUQ0hJTkc6IFwiRkVUQ0hJTkdcIixcbiAgU1RFQURZOiBcIlNURUFEWVwiXG59O1xuXG4vLyBFeGNlcHRpb24gdGhyb3duIGJ5IF9uZWVkVG9Qb2xsUXVlcnkgd2hpY2ggdW5yb2xscyB0aGUgc3RhY2sgdXAgdG8gdGhlXG4vLyBlbmNsb3NpbmcgY2FsbCB0byBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeS5cbnZhciBTd2l0Y2hlZFRvUXVlcnkgPSBmdW5jdGlvbiAoKSB7fTtcbnZhciBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeSA9IGZ1bmN0aW9uIChmKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgIGYuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoIShlIGluc3RhbmNlb2YgU3dpdGNoZWRUb1F1ZXJ5KSlcbiAgICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH07XG59O1xuXG52YXIgY3VycmVudElkID0gMDtcblxuLy8gT3Bsb2dPYnNlcnZlRHJpdmVyIGlzIGFuIGFsdGVybmF0aXZlIHRvIFBvbGxpbmdPYnNlcnZlRHJpdmVyIHdoaWNoIGZvbGxvd3Ncbi8vIHRoZSBNb25nbyBvcGVyYXRpb24gbG9nIGluc3RlYWQgb2YganVzdCByZS1wb2xsaW5nIHRoZSBxdWVyeS4gSXQgb2JleXMgdGhlXG4vLyBzYW1lIHNpbXBsZSBpbnRlcmZhY2U6IGNvbnN0cnVjdGluZyBpdCBzdGFydHMgc2VuZGluZyBvYnNlcnZlQ2hhbmdlc1xuLy8gY2FsbGJhY2tzIChhbmQgYSByZWFkeSgpIGludm9jYXRpb24pIHRvIHRoZSBPYnNlcnZlTXVsdGlwbGV4ZXIsIGFuZCB5b3Ugc3RvcFxuLy8gaXQgYnkgY2FsbGluZyB0aGUgc3RvcCgpIG1ldGhvZC5cbk9wbG9nT2JzZXJ2ZURyaXZlciA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5fdXNlc09wbG9nID0gdHJ1ZTsgIC8vIHRlc3RzIGxvb2sgYXQgdGhpc1xuXG4gIHNlbGYuX2lkID0gY3VycmVudElkO1xuICBjdXJyZW50SWQrKztcblxuICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiA9IG9wdGlvbnMuY3Vyc29yRGVzY3JpcHRpb247XG4gIHNlbGYuX21vbmdvSGFuZGxlID0gb3B0aW9ucy5tb25nb0hhbmRsZTtcbiAgc2VsZi5fbXVsdGlwbGV4ZXIgPSBvcHRpb25zLm11bHRpcGxleGVyO1xuXG4gIGlmIChvcHRpb25zLm9yZGVyZWQpIHtcbiAgICB0aHJvdyBFcnJvcihcIk9wbG9nT2JzZXJ2ZURyaXZlciBvbmx5IHN1cHBvcnRzIHVub3JkZXJlZCBvYnNlcnZlQ2hhbmdlc1wiKTtcbiAgfVxuXG4gIHZhciBzb3J0ZXIgPSBvcHRpb25zLnNvcnRlcjtcbiAgLy8gV2UgZG9uJ3Qgc3VwcG9ydCAkbmVhciBhbmQgb3RoZXIgZ2VvLXF1ZXJpZXMgc28gaXQncyBPSyB0byBpbml0aWFsaXplIHRoZVxuICAvLyBjb21wYXJhdG9yIG9ubHkgb25jZSBpbiB0aGUgY29uc3RydWN0b3IuXG4gIHZhciBjb21wYXJhdG9yID0gc29ydGVyICYmIHNvcnRlci5nZXRDb21wYXJhdG9yKCk7XG5cbiAgaWYgKG9wdGlvbnMuY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5saW1pdCkge1xuICAgIC8vIFRoZXJlIGFyZSBzZXZlcmFsIHByb3BlcnRpZXMgb3JkZXJlZCBkcml2ZXIgaW1wbGVtZW50czpcbiAgICAvLyAtIF9saW1pdCBpcyBhIHBvc2l0aXZlIG51bWJlclxuICAgIC8vIC0gX2NvbXBhcmF0b3IgaXMgYSBmdW5jdGlvbi1jb21wYXJhdG9yIGJ5IHdoaWNoIHRoZSBxdWVyeSBpcyBvcmRlcmVkXG4gICAgLy8gLSBfdW5wdWJsaXNoZWRCdWZmZXIgaXMgbm9uLW51bGwgTWluL01heCBIZWFwLFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgIHRoZSBlbXB0eSBidWZmZXIgaW4gU1RFQURZIHBoYXNlIGltcGxpZXMgdGhhdCB0aGVcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICBldmVyeXRoaW5nIHRoYXQgbWF0Y2hlcyB0aGUgcXVlcmllcyBzZWxlY3RvciBmaXRzXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgaW50byBwdWJsaXNoZWQgc2V0LlxuICAgIC8vIC0gX3B1Ymxpc2hlZCAtIE1pbiBIZWFwIChhbHNvIGltcGxlbWVudHMgSWRNYXAgbWV0aG9kcylcblxuICAgIHZhciBoZWFwT3B0aW9ucyA9IHsgSWRNYXA6IExvY2FsQ29sbGVjdGlvbi5fSWRNYXAgfTtcbiAgICBzZWxmLl9saW1pdCA9IHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMubGltaXQ7XG4gICAgc2VsZi5fY29tcGFyYXRvciA9IGNvbXBhcmF0b3I7XG4gICAgc2VsZi5fc29ydGVyID0gc29ydGVyO1xuICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyID0gbmV3IE1pbk1heEhlYXAoY29tcGFyYXRvciwgaGVhcE9wdGlvbnMpO1xuICAgIC8vIFdlIG5lZWQgc29tZXRoaW5nIHRoYXQgY2FuIGZpbmQgTWF4IHZhbHVlIGluIGFkZGl0aW9uIHRvIElkTWFwIGludGVyZmFjZVxuICAgIHNlbGYuX3B1Ymxpc2hlZCA9IG5ldyBNYXhIZWFwKGNvbXBhcmF0b3IsIGhlYXBPcHRpb25zKTtcbiAgfSBlbHNlIHtcbiAgICBzZWxmLl9saW1pdCA9IDA7XG4gICAgc2VsZi5fY29tcGFyYXRvciA9IG51bGw7XG4gICAgc2VsZi5fc29ydGVyID0gbnVsbDtcbiAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlciA9IG51bGw7XG4gICAgc2VsZi5fcHVibGlzaGVkID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gIH1cblxuICAvLyBJbmRpY2F0ZXMgaWYgaXQgaXMgc2FmZSB0byBpbnNlcnQgYSBuZXcgZG9jdW1lbnQgYXQgdGhlIGVuZCBvZiB0aGUgYnVmZmVyXG4gIC8vIGZvciB0aGlzIHF1ZXJ5LiBpLmUuIGl0IGlzIGtub3duIHRoYXQgdGhlcmUgYXJlIG5vIGRvY3VtZW50cyBtYXRjaGluZyB0aGVcbiAgLy8gc2VsZWN0b3IgdGhvc2UgYXJlIG5vdCBpbiBwdWJsaXNoZWQgb3IgYnVmZmVyLlxuICBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgPSBmYWxzZTtcblxuICBzZWxmLl9zdG9wcGVkID0gZmFsc2U7XG4gIHNlbGYuX3N0b3BIYW5kbGVzID0gW107XG5cbiAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLWRyaXZlcnMtb3Bsb2dcIiwgMSk7XG5cbiAgc2VsZi5fcmVnaXN0ZXJQaGFzZUNoYW5nZShQSEFTRS5RVUVSWUlORyk7XG5cbiAgc2VsZi5fbWF0Y2hlciA9IG9wdGlvbnMubWF0Y2hlcjtcbiAgdmFyIHByb2plY3Rpb24gPSBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLmZpZWxkcyB8fCB7fTtcbiAgc2VsZi5fcHJvamVjdGlvbkZuID0gTG9jYWxDb2xsZWN0aW9uLl9jb21waWxlUHJvamVjdGlvbihwcm9qZWN0aW9uKTtcbiAgLy8gUHJvamVjdGlvbiBmdW5jdGlvbiwgcmVzdWx0IG9mIGNvbWJpbmluZyBpbXBvcnRhbnQgZmllbGRzIGZvciBzZWxlY3RvciBhbmRcbiAgLy8gZXhpc3RpbmcgZmllbGRzIHByb2plY3Rpb25cbiAgc2VsZi5fc2hhcmVkUHJvamVjdGlvbiA9IHNlbGYuX21hdGNoZXIuY29tYmluZUludG9Qcm9qZWN0aW9uKHByb2plY3Rpb24pO1xuICBpZiAoc29ydGVyKVxuICAgIHNlbGYuX3NoYXJlZFByb2plY3Rpb24gPSBzb3J0ZXIuY29tYmluZUludG9Qcm9qZWN0aW9uKHNlbGYuX3NoYXJlZFByb2plY3Rpb24pO1xuICBzZWxmLl9zaGFyZWRQcm9qZWN0aW9uRm4gPSBMb2NhbENvbGxlY3Rpb24uX2NvbXBpbGVQcm9qZWN0aW9uKFxuICAgIHNlbGYuX3NoYXJlZFByb2plY3Rpb24pO1xuXG4gIHNlbGYuX25lZWRUb0ZldGNoID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nID0gbnVsbDtcbiAgc2VsZi5fZmV0Y2hHZW5lcmF0aW9uID0gMDtcblxuICBzZWxmLl9yZXF1ZXJ5V2hlbkRvbmVUaGlzUXVlcnkgPSBmYWxzZTtcbiAgc2VsZi5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeSA9IFtdO1xuXG4gIC8vIElmIHRoZSBvcGxvZyBoYW5kbGUgdGVsbHMgdXMgdGhhdCBpdCBza2lwcGVkIHNvbWUgZW50cmllcyAoYmVjYXVzZSBpdCBnb3RcbiAgLy8gYmVoaW5kLCBzYXkpLCByZS1wb2xsLlxuICBzZWxmLl9zdG9wSGFuZGxlcy5wdXNoKHNlbGYuX21vbmdvSGFuZGxlLl9vcGxvZ0hhbmRsZS5vblNraXBwZWRFbnRyaWVzKFxuICAgIGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5KGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX25lZWRUb1BvbGxRdWVyeSgpO1xuICAgIH0pXG4gICkpO1xuXG4gIGZvckVhY2hUcmlnZ2VyKHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLCBmdW5jdGlvbiAodHJpZ2dlcikge1xuICAgIHNlbGYuX3N0b3BIYW5kbGVzLnB1c2goc2VsZi5fbW9uZ29IYW5kbGUuX29wbG9nSGFuZGxlLm9uT3Bsb2dFbnRyeShcbiAgICAgIHRyaWdnZXIsIGZ1bmN0aW9uIChub3RpZmljYXRpb24pIHtcbiAgICAgICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBvcCA9IG5vdGlmaWNhdGlvbi5vcDtcbiAgICAgICAgICBpZiAobm90aWZpY2F0aW9uLmRyb3BDb2xsZWN0aW9uIHx8IG5vdGlmaWNhdGlvbi5kcm9wRGF0YWJhc2UpIHtcbiAgICAgICAgICAgIC8vIE5vdGU6IHRoaXMgY2FsbCBpcyBub3QgYWxsb3dlZCB0byBibG9jayBvbiBhbnl0aGluZyAoZXNwZWNpYWxseVxuICAgICAgICAgICAgLy8gb24gd2FpdGluZyBmb3Igb3Bsb2cgZW50cmllcyB0byBjYXRjaCB1cCkgYmVjYXVzZSB0aGF0IHdpbGwgYmxvY2tcbiAgICAgICAgICAgIC8vIG9uT3Bsb2dFbnRyeSFcbiAgICAgICAgICAgIHNlbGYuX25lZWRUb1BvbGxRdWVyeSgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBBbGwgb3RoZXIgb3BlcmF0b3JzIHNob3VsZCBiZSBoYW5kbGVkIGRlcGVuZGluZyBvbiBwaGFzZVxuICAgICAgICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5RVUVSWUlORykge1xuICAgICAgICAgICAgICBzZWxmLl9oYW5kbGVPcGxvZ0VudHJ5UXVlcnlpbmcob3ApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgc2VsZi5faGFuZGxlT3Bsb2dFbnRyeVN0ZWFkeU9yRmV0Y2hpbmcob3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgICkpO1xuICB9KTtcblxuICAvLyBYWFggb3JkZXJpbmcgdy5yLnQuIGV2ZXJ5dGhpbmcgZWxzZT9cbiAgc2VsZi5fc3RvcEhhbmRsZXMucHVzaChsaXN0ZW5BbGwoXG4gICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24sIGZ1bmN0aW9uIChub3RpZmljYXRpb24pIHtcbiAgICAgIC8vIElmIHdlJ3JlIG5vdCBpbiBhIHByZS1maXJlIHdyaXRlIGZlbmNlLCB3ZSBkb24ndCBoYXZlIHRvIGRvIGFueXRoaW5nLlxuICAgICAgdmFyIGZlbmNlID0gRERQU2VydmVyLl9DdXJyZW50V3JpdGVGZW5jZS5nZXQoKTtcbiAgICAgIGlmICghZmVuY2UgfHwgZmVuY2UuZmlyZWQpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgaWYgKGZlbmNlLl9vcGxvZ09ic2VydmVEcml2ZXJzKSB7XG4gICAgICAgIGZlbmNlLl9vcGxvZ09ic2VydmVEcml2ZXJzW3NlbGYuX2lkXSA9IHNlbGY7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZmVuY2UuX29wbG9nT2JzZXJ2ZURyaXZlcnMgPSB7fTtcbiAgICAgIGZlbmNlLl9vcGxvZ09ic2VydmVEcml2ZXJzW3NlbGYuX2lkXSA9IHNlbGY7XG5cbiAgICAgIGZlbmNlLm9uQmVmb3JlRmlyZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkcml2ZXJzID0gZmVuY2UuX29wbG9nT2JzZXJ2ZURyaXZlcnM7XG4gICAgICAgIGRlbGV0ZSBmZW5jZS5fb3Bsb2dPYnNlcnZlRHJpdmVycztcblxuICAgICAgICAvLyBUaGlzIGZlbmNlIGNhbm5vdCBmaXJlIHVudGlsIHdlJ3ZlIGNhdWdodCB1cCB0byBcInRoaXMgcG9pbnRcIiBpbiB0aGVcbiAgICAgICAgLy8gb3Bsb2csIGFuZCBhbGwgb2JzZXJ2ZXJzIG1hZGUgaXQgYmFjayB0byB0aGUgc3RlYWR5IHN0YXRlLlxuICAgICAgICBzZWxmLl9tb25nb0hhbmRsZS5fb3Bsb2dIYW5kbGUud2FpdFVudGlsQ2F1Z2h0VXAoKTtcblxuICAgICAgICBfLmVhY2goZHJpdmVycywgZnVuY3Rpb24gKGRyaXZlcikge1xuICAgICAgICAgIGlmIChkcml2ZXIuX3N0b3BwZWQpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICB2YXIgd3JpdGUgPSBmZW5jZS5iZWdpbldyaXRlKCk7XG4gICAgICAgICAgaWYgKGRyaXZlci5fcGhhc2UgPT09IFBIQVNFLlNURUFEWSkge1xuICAgICAgICAgICAgLy8gTWFrZSBzdXJlIHRoYXQgYWxsIG9mIHRoZSBjYWxsYmFja3MgaGF2ZSBtYWRlIGl0IHRocm91Z2ggdGhlXG4gICAgICAgICAgICAvLyBtdWx0aXBsZXhlciBhbmQgYmVlbiBkZWxpdmVyZWQgdG8gT2JzZXJ2ZUhhbmRsZXMgYmVmb3JlIGNvbW1pdHRpbmdcbiAgICAgICAgICAgIC8vIHdyaXRlcy5cbiAgICAgICAgICAgIGRyaXZlci5fbXVsdGlwbGV4ZXIub25GbHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRyaXZlci5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeS5wdXNoKHdyaXRlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICApKTtcblxuICAvLyBXaGVuIE1vbmdvIGZhaWxzIG92ZXIsIHdlIG5lZWQgdG8gcmVwb2xsIHRoZSBxdWVyeSwgaW4gY2FzZSB3ZSBwcm9jZXNzZWQgYW5cbiAgLy8gb3Bsb2cgZW50cnkgdGhhdCBnb3Qgcm9sbGVkIGJhY2suXG4gIHNlbGYuX3N0b3BIYW5kbGVzLnB1c2goc2VsZi5fbW9uZ29IYW5kbGUuX29uRmFpbG92ZXIoZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkoXG4gICAgZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fbmVlZFRvUG9sbFF1ZXJ5KCk7XG4gICAgfSkpKTtcblxuICAvLyBHaXZlIF9vYnNlcnZlQ2hhbmdlcyBhIGNoYW5jZSB0byBhZGQgdGhlIG5ldyBPYnNlcnZlSGFuZGxlIHRvIG91clxuICAvLyBtdWx0aXBsZXhlciwgc28gdGhhdCB0aGUgYWRkZWQgY2FsbHMgZ2V0IHN0cmVhbWVkLlxuICBNZXRlb3IuZGVmZXIoZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkoZnVuY3Rpb24gKCkge1xuICAgIHNlbGYuX3J1bkluaXRpYWxRdWVyeSgpO1xuICB9KSk7XG59O1xuXG5fLmV4dGVuZChPcGxvZ09ic2VydmVEcml2ZXIucHJvdG90eXBlLCB7XG4gIF9hZGRQdWJsaXNoZWQ6IGZ1bmN0aW9uIChpZCwgZG9jKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBmaWVsZHMgPSBfLmNsb25lKGRvYyk7XG4gICAgICBkZWxldGUgZmllbGRzLl9pZDtcbiAgICAgIHNlbGYuX3B1Ymxpc2hlZC5zZXQoaWQsIHNlbGYuX3NoYXJlZFByb2plY3Rpb25Gbihkb2MpKTtcbiAgICAgIHNlbGYuX211bHRpcGxleGVyLmFkZGVkKGlkLCBzZWxmLl9wcm9qZWN0aW9uRm4oZmllbGRzKSk7XG5cbiAgICAgIC8vIEFmdGVyIGFkZGluZyB0aGlzIGRvY3VtZW50LCB0aGUgcHVibGlzaGVkIHNldCBtaWdodCBiZSBvdmVyZmxvd2VkXG4gICAgICAvLyAoZXhjZWVkaW5nIGNhcGFjaXR5IHNwZWNpZmllZCBieSBsaW1pdCkuIElmIHNvLCBwdXNoIHRoZSBtYXhpbXVtXG4gICAgICAvLyBlbGVtZW50IHRvIHRoZSBidWZmZXIsIHdlIG1pZ2h0IHdhbnQgdG8gc2F2ZSBpdCBpbiBtZW1vcnkgdG8gcmVkdWNlIHRoZVxuICAgICAgLy8gYW1vdW50IG9mIE1vbmdvIGxvb2t1cHMgaW4gdGhlIGZ1dHVyZS5cbiAgICAgIGlmIChzZWxmLl9saW1pdCAmJiBzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpID4gc2VsZi5fbGltaXQpIHtcbiAgICAgICAgLy8gWFhYIGluIHRoZW9yeSB0aGUgc2l6ZSBvZiBwdWJsaXNoZWQgaXMgbm8gbW9yZSB0aGFuIGxpbWl0KzFcbiAgICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgIT09IHNlbGYuX2xpbWl0ICsgMSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkFmdGVyIGFkZGluZyB0byBwdWJsaXNoZWQsIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgLSBzZWxmLl9saW1pdCkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICBcIiBkb2N1bWVudHMgYXJlIG92ZXJmbG93aW5nIHRoZSBzZXRcIik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgb3ZlcmZsb3dpbmdEb2NJZCA9IHNlbGYuX3B1Ymxpc2hlZC5tYXhFbGVtZW50SWQoKTtcbiAgICAgICAgdmFyIG92ZXJmbG93aW5nRG9jID0gc2VsZi5fcHVibGlzaGVkLmdldChvdmVyZmxvd2luZ0RvY0lkKTtcblxuICAgICAgICBpZiAoRUpTT04uZXF1YWxzKG92ZXJmbG93aW5nRG9jSWQsIGlkKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSBkb2N1bWVudCBqdXN0IGFkZGVkIGlzIG92ZXJmbG93aW5nIHRoZSBwdWJsaXNoZWQgc2V0XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgc2VsZi5fcHVibGlzaGVkLnJlbW92ZShvdmVyZmxvd2luZ0RvY0lkKTtcbiAgICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIucmVtb3ZlZChvdmVyZmxvd2luZ0RvY0lkKTtcbiAgICAgICAgc2VsZi5fYWRkQnVmZmVyZWQob3ZlcmZsb3dpbmdEb2NJZCwgb3ZlcmZsb3dpbmdEb2MpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBfcmVtb3ZlUHVibGlzaGVkOiBmdW5jdGlvbiAoaWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fcHVibGlzaGVkLnJlbW92ZShpZCk7XG4gICAgICBzZWxmLl9tdWx0aXBsZXhlci5yZW1vdmVkKGlkKTtcbiAgICAgIGlmICghIHNlbGYuX2xpbWl0IHx8IHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgPT09IHNlbGYuX2xpbWl0KVxuICAgICAgICByZXR1cm47XG5cbiAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpID4gc2VsZi5fbGltaXQpXG4gICAgICAgIHRocm93IEVycm9yKFwic2VsZi5fcHVibGlzaGVkIGdvdCB0b28gYmlnXCIpO1xuXG4gICAgICAvLyBPSywgd2UgYXJlIHB1Ymxpc2hpbmcgbGVzcyB0aGFuIHRoZSBsaW1pdC4gTWF5YmUgd2Ugc2hvdWxkIGxvb2sgaW4gdGhlXG4gICAgICAvLyBidWZmZXIgdG8gZmluZCB0aGUgbmV4dCBlbGVtZW50IHBhc3Qgd2hhdCB3ZSB3ZXJlIHB1Ymxpc2hpbmcgYmVmb3JlLlxuXG4gICAgICBpZiAoIXNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmVtcHR5KCkpIHtcbiAgICAgICAgLy8gVGhlcmUncyBzb21ldGhpbmcgaW4gdGhlIGJ1ZmZlcjsgbW92ZSB0aGUgZmlyc3QgdGhpbmcgaW4gaXQgdG9cbiAgICAgICAgLy8gX3B1Ymxpc2hlZC5cbiAgICAgICAgdmFyIG5ld0RvY0lkID0gc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIubWluRWxlbWVudElkKCk7XG4gICAgICAgIHZhciBuZXdEb2MgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQobmV3RG9jSWQpO1xuICAgICAgICBzZWxmLl9yZW1vdmVCdWZmZXJlZChuZXdEb2NJZCk7XG4gICAgICAgIHNlbGYuX2FkZFB1Ymxpc2hlZChuZXdEb2NJZCwgbmV3RG9jKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGVyZSdzIG5vdGhpbmcgaW4gdGhlIGJ1ZmZlci4gIFRoaXMgY291bGQgbWVhbiBvbmUgb2YgYSBmZXcgdGhpbmdzLlxuXG4gICAgICAvLyAoYSkgV2UgY291bGQgYmUgaW4gdGhlIG1pZGRsZSBvZiByZS1ydW5uaW5nIHRoZSBxdWVyeSAoc3BlY2lmaWNhbGx5LCB3ZVxuICAgICAgLy8gY291bGQgYmUgaW4gX3B1Ymxpc2hOZXdSZXN1bHRzKS4gSW4gdGhhdCBjYXNlLCBfdW5wdWJsaXNoZWRCdWZmZXIgaXNcbiAgICAgIC8vIGVtcHR5IGJlY2F1c2Ugd2UgY2xlYXIgaXQgYXQgdGhlIGJlZ2lubmluZyBvZiBfcHVibGlzaE5ld1Jlc3VsdHMuIEluXG4gICAgICAvLyB0aGlzIGNhc2UsIG91ciBjYWxsZXIgYWxyZWFkeSBrbm93cyB0aGUgZW50aXJlIGFuc3dlciB0byB0aGUgcXVlcnkgYW5kXG4gICAgICAvLyB3ZSBkb24ndCBuZWVkIHRvIGRvIGFueXRoaW5nIGZhbmN5IGhlcmUuICBKdXN0IHJldHVybi5cbiAgICAgIGlmIChzZWxmLl9waGFzZSA9PT0gUEhBU0UuUVVFUllJTkcpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgLy8gKGIpIFdlJ3JlIHByZXR0eSBjb25maWRlbnQgdGhhdCB0aGUgdW5pb24gb2YgX3B1Ymxpc2hlZCBhbmRcbiAgICAgIC8vIF91bnB1Ymxpc2hlZEJ1ZmZlciBjb250YWluIGFsbCBkb2N1bWVudHMgdGhhdCBtYXRjaCBzZWxlY3Rvci4gQmVjYXVzZVxuICAgICAgLy8gX3VucHVibGlzaGVkQnVmZmVyIGlzIGVtcHR5LCB0aGF0IG1lYW5zIHdlJ3JlIGNvbmZpZGVudCB0aGF0IF9wdWJsaXNoZWRcbiAgICAgIC8vIGNvbnRhaW5zIGFsbCBkb2N1bWVudHMgdGhhdCBtYXRjaCBzZWxlY3Rvci4gU28gd2UgaGF2ZSBub3RoaW5nIHRvIGRvLlxuICAgICAgaWYgKHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlcilcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICAvLyAoYykgTWF5YmUgdGhlcmUgYXJlIG90aGVyIGRvY3VtZW50cyBvdXQgdGhlcmUgdGhhdCBzaG91bGQgYmUgaW4gb3VyXG4gICAgICAvLyBidWZmZXIuIEJ1dCBpbiB0aGF0IGNhc2UsIHdoZW4gd2UgZW1wdGllZCBfdW5wdWJsaXNoZWRCdWZmZXIgaW5cbiAgICAgIC8vIF9yZW1vdmVCdWZmZXJlZCwgd2Ugc2hvdWxkIGhhdmUgY2FsbGVkIF9uZWVkVG9Qb2xsUXVlcnksIHdoaWNoIHdpbGxcbiAgICAgIC8vIGVpdGhlciBwdXQgc29tZXRoaW5nIGluIF91bnB1Ymxpc2hlZEJ1ZmZlciBvciBzZXQgX3NhZmVBcHBlbmRUb0J1ZmZlclxuICAgICAgLy8gKG9yIGJvdGgpLCBhbmQgaXQgd2lsbCBwdXQgdXMgaW4gUVVFUllJTkcgZm9yIHRoYXQgd2hvbGUgdGltZS4gU28gaW5cbiAgICAgIC8vIGZhY3QsIHdlIHNob3VsZG4ndCBiZSBhYmxlIHRvIGdldCBoZXJlLlxuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJCdWZmZXIgaW5leHBsaWNhYmx5IGVtcHR5XCIpO1xuICAgIH0pO1xuICB9LFxuICBfY2hhbmdlUHVibGlzaGVkOiBmdW5jdGlvbiAoaWQsIG9sZERvYywgbmV3RG9jKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX3B1Ymxpc2hlZC5zZXQoaWQsIHNlbGYuX3NoYXJlZFByb2plY3Rpb25GbihuZXdEb2MpKTtcbiAgICAgIHZhciBwcm9qZWN0ZWROZXcgPSBzZWxmLl9wcm9qZWN0aW9uRm4obmV3RG9jKTtcbiAgICAgIHZhciBwcm9qZWN0ZWRPbGQgPSBzZWxmLl9wcm9qZWN0aW9uRm4ob2xkRG9jKTtcbiAgICAgIHZhciBjaGFuZ2VkID0gRGlmZlNlcXVlbmNlLm1ha2VDaGFuZ2VkRmllbGRzKFxuICAgICAgICBwcm9qZWN0ZWROZXcsIHByb2plY3RlZE9sZCk7XG4gICAgICBpZiAoIV8uaXNFbXB0eShjaGFuZ2VkKSlcbiAgICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIuY2hhbmdlZChpZCwgY2hhbmdlZCk7XG4gICAgfSk7XG4gIH0sXG4gIF9hZGRCdWZmZXJlZDogZnVuY3Rpb24gKGlkLCBkb2MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2V0KGlkLCBzZWxmLl9zaGFyZWRQcm9qZWN0aW9uRm4oZG9jKSk7XG5cbiAgICAgIC8vIElmIHNvbWV0aGluZyBpcyBvdmVyZmxvd2luZyB0aGUgYnVmZmVyLCB3ZSBqdXN0IHJlbW92ZSBpdCBmcm9tIGNhY2hlXG4gICAgICBpZiAoc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2l6ZSgpID4gc2VsZi5fbGltaXQpIHtcbiAgICAgICAgdmFyIG1heEJ1ZmZlcmVkSWQgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5tYXhFbGVtZW50SWQoKTtcblxuICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5yZW1vdmUobWF4QnVmZmVyZWRJZCk7XG5cbiAgICAgICAgLy8gU2luY2Ugc29tZXRoaW5nIG1hdGNoaW5nIGlzIHJlbW92ZWQgZnJvbSBjYWNoZSAoYm90aCBwdWJsaXNoZWQgc2V0IGFuZFxuICAgICAgICAvLyBidWZmZXIpLCBzZXQgZmxhZyB0byBmYWxzZVxuICAgICAgICBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgLy8gSXMgY2FsbGVkIGVpdGhlciB0byByZW1vdmUgdGhlIGRvYyBjb21wbGV0ZWx5IGZyb20gbWF0Y2hpbmcgc2V0IG9yIHRvIG1vdmVcbiAgLy8gaXQgdG8gdGhlIHB1Ymxpc2hlZCBzZXQgbGF0ZXIuXG4gIF9yZW1vdmVCdWZmZXJlZDogZnVuY3Rpb24gKGlkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnJlbW92ZShpZCk7XG4gICAgICAvLyBUbyBrZWVwIHRoZSBjb250cmFjdCBcImJ1ZmZlciBpcyBuZXZlciBlbXB0eSBpbiBTVEVBRFkgcGhhc2UgdW5sZXNzIHRoZVxuICAgICAgLy8gZXZlcnl0aGluZyBtYXRjaGluZyBmaXRzIGludG8gcHVibGlzaGVkXCIgdHJ1ZSwgd2UgcG9sbCBldmVyeXRoaW5nIGFzXG4gICAgICAvLyBzb29uIGFzIHdlIHNlZSB0aGUgYnVmZmVyIGJlY29taW5nIGVtcHR5LlxuICAgICAgaWYgKCEgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2l6ZSgpICYmICEgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyKVxuICAgICAgICBzZWxmLl9uZWVkVG9Qb2xsUXVlcnkoKTtcbiAgICB9KTtcbiAgfSxcbiAgLy8gQ2FsbGVkIHdoZW4gYSBkb2N1bWVudCBoYXMgam9pbmVkIHRoZSBcIk1hdGNoaW5nXCIgcmVzdWx0cyBzZXQuXG4gIC8vIFRha2VzIHJlc3BvbnNpYmlsaXR5IG9mIGtlZXBpbmcgX3VucHVibGlzaGVkQnVmZmVyIGluIHN5bmMgd2l0aCBfcHVibGlzaGVkXG4gIC8vIGFuZCB0aGUgZWZmZWN0IG9mIGxpbWl0IGVuZm9yY2VkLlxuICBfYWRkTWF0Y2hpbmc6IGZ1bmN0aW9uIChkb2MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGlkID0gZG9jLl9pZDtcbiAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKSlcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJ0cmllZCB0byBhZGQgc29tZXRoaW5nIGFscmVhZHkgcHVibGlzaGVkIFwiICsgaWQpO1xuICAgICAgaWYgKHNlbGYuX2xpbWl0ICYmIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmhhcyhpZCkpXG4gICAgICAgIHRocm93IEVycm9yKFwidHJpZWQgdG8gYWRkIHNvbWV0aGluZyBhbHJlYWR5IGV4aXN0ZWQgaW4gYnVmZmVyIFwiICsgaWQpO1xuXG4gICAgICB2YXIgbGltaXQgPSBzZWxmLl9saW1pdDtcbiAgICAgIHZhciBjb21wYXJhdG9yID0gc2VsZi5fY29tcGFyYXRvcjtcbiAgICAgIHZhciBtYXhQdWJsaXNoZWQgPSAobGltaXQgJiYgc2VsZi5fcHVibGlzaGVkLnNpemUoKSA+IDApID9cbiAgICAgICAgc2VsZi5fcHVibGlzaGVkLmdldChzZWxmLl9wdWJsaXNoZWQubWF4RWxlbWVudElkKCkpIDogbnVsbDtcbiAgICAgIHZhciBtYXhCdWZmZXJlZCA9IChsaW1pdCAmJiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgPiAwKVxuICAgICAgICA/IHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmdldChzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5tYXhFbGVtZW50SWQoKSlcbiAgICAgICAgOiBudWxsO1xuICAgICAgLy8gVGhlIHF1ZXJ5IGlzIHVubGltaXRlZCBvciBkaWRuJ3QgcHVibGlzaCBlbm91Z2ggZG9jdW1lbnRzIHlldCBvciB0aGVcbiAgICAgIC8vIG5ldyBkb2N1bWVudCB3b3VsZCBmaXQgaW50byBwdWJsaXNoZWQgc2V0IHB1c2hpbmcgdGhlIG1heGltdW0gZWxlbWVudFxuICAgICAgLy8gb3V0LCB0aGVuIHdlIG5lZWQgdG8gcHVibGlzaCB0aGUgZG9jLlxuICAgICAgdmFyIHRvUHVibGlzaCA9ICEgbGltaXQgfHwgc2VsZi5fcHVibGlzaGVkLnNpemUoKSA8IGxpbWl0IHx8XG4gICAgICAgIGNvbXBhcmF0b3IoZG9jLCBtYXhQdWJsaXNoZWQpIDwgMDtcblxuICAgICAgLy8gT3RoZXJ3aXNlIHdlIG1pZ2h0IG5lZWQgdG8gYnVmZmVyIGl0IChvbmx5IGluIGNhc2Ugb2YgbGltaXRlZCBxdWVyeSkuXG4gICAgICAvLyBCdWZmZXJpbmcgaXMgYWxsb3dlZCBpZiB0aGUgYnVmZmVyIGlzIG5vdCBmaWxsZWQgdXAgeWV0IGFuZCBhbGxcbiAgICAgIC8vIG1hdGNoaW5nIGRvY3MgYXJlIGVpdGhlciBpbiB0aGUgcHVibGlzaGVkIHNldCBvciBpbiB0aGUgYnVmZmVyLlxuICAgICAgdmFyIGNhbkFwcGVuZFRvQnVmZmVyID0gIXRvUHVibGlzaCAmJiBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgJiZcbiAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2l6ZSgpIDwgbGltaXQ7XG5cbiAgICAgIC8vIE9yIGlmIGl0IGlzIHNtYWxsIGVub3VnaCB0byBiZSBzYWZlbHkgaW5zZXJ0ZWQgdG8gdGhlIG1pZGRsZSBvciB0aGVcbiAgICAgIC8vIGJlZ2lubmluZyBvZiB0aGUgYnVmZmVyLlxuICAgICAgdmFyIGNhbkluc2VydEludG9CdWZmZXIgPSAhdG9QdWJsaXNoICYmIG1heEJ1ZmZlcmVkICYmXG4gICAgICAgIGNvbXBhcmF0b3IoZG9jLCBtYXhCdWZmZXJlZCkgPD0gMDtcblxuICAgICAgdmFyIHRvQnVmZmVyID0gY2FuQXBwZW5kVG9CdWZmZXIgfHwgY2FuSW5zZXJ0SW50b0J1ZmZlcjtcblxuICAgICAgaWYgKHRvUHVibGlzaCkge1xuICAgICAgICBzZWxmLl9hZGRQdWJsaXNoZWQoaWQsIGRvYyk7XG4gICAgICB9IGVsc2UgaWYgKHRvQnVmZmVyKSB7XG4gICAgICAgIHNlbGYuX2FkZEJ1ZmZlcmVkKGlkLCBkb2MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZHJvcHBpbmcgaXQgYW5kIG5vdCBzYXZpbmcgdG8gdGhlIGNhY2hlXG4gICAgICAgIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICAvLyBDYWxsZWQgd2hlbiBhIGRvY3VtZW50IGxlYXZlcyB0aGUgXCJNYXRjaGluZ1wiIHJlc3VsdHMgc2V0LlxuICAvLyBUYWtlcyByZXNwb25zaWJpbGl0eSBvZiBrZWVwaW5nIF91bnB1Ymxpc2hlZEJ1ZmZlciBpbiBzeW5jIHdpdGggX3B1Ymxpc2hlZFxuICAvLyBhbmQgdGhlIGVmZmVjdCBvZiBsaW1pdCBlbmZvcmNlZC5cbiAgX3JlbW92ZU1hdGNoaW5nOiBmdW5jdGlvbiAoaWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCEgc2VsZi5fcHVibGlzaGVkLmhhcyhpZCkgJiYgISBzZWxmLl9saW1pdClcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJ0cmllZCB0byByZW1vdmUgc29tZXRoaW5nIG1hdGNoaW5nIGJ1dCBub3QgY2FjaGVkIFwiICsgaWQpO1xuXG4gICAgICBpZiAoc2VsZi5fcHVibGlzaGVkLmhhcyhpZCkpIHtcbiAgICAgICAgc2VsZi5fcmVtb3ZlUHVibGlzaGVkKGlkKTtcbiAgICAgIH0gZWxzZSBpZiAoc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuaGFzKGlkKSkge1xuICAgICAgICBzZWxmLl9yZW1vdmVCdWZmZXJlZChpZCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIF9oYW5kbGVEb2M6IGZ1bmN0aW9uIChpZCwgbmV3RG9jKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBtYXRjaGVzTm93ID0gbmV3RG9jICYmIHNlbGYuX21hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKG5ld0RvYykucmVzdWx0O1xuXG4gICAgICB2YXIgcHVibGlzaGVkQmVmb3JlID0gc2VsZi5fcHVibGlzaGVkLmhhcyhpZCk7XG4gICAgICB2YXIgYnVmZmVyZWRCZWZvcmUgPSBzZWxmLl9saW1pdCAmJiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5oYXMoaWQpO1xuICAgICAgdmFyIGNhY2hlZEJlZm9yZSA9IHB1Ymxpc2hlZEJlZm9yZSB8fCBidWZmZXJlZEJlZm9yZTtcblxuICAgICAgaWYgKG1hdGNoZXNOb3cgJiYgIWNhY2hlZEJlZm9yZSkge1xuICAgICAgICBzZWxmLl9hZGRNYXRjaGluZyhuZXdEb2MpO1xuICAgICAgfSBlbHNlIGlmIChjYWNoZWRCZWZvcmUgJiYgIW1hdGNoZXNOb3cpIHtcbiAgICAgICAgc2VsZi5fcmVtb3ZlTWF0Y2hpbmcoaWQpO1xuICAgICAgfSBlbHNlIGlmIChjYWNoZWRCZWZvcmUgJiYgbWF0Y2hlc05vdykge1xuICAgICAgICB2YXIgb2xkRG9jID0gc2VsZi5fcHVibGlzaGVkLmdldChpZCk7XG4gICAgICAgIHZhciBjb21wYXJhdG9yID0gc2VsZi5fY29tcGFyYXRvcjtcbiAgICAgICAgdmFyIG1pbkJ1ZmZlcmVkID0gc2VsZi5fbGltaXQgJiYgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2l6ZSgpICYmXG4gICAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZ2V0KHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLm1pbkVsZW1lbnRJZCgpKTtcbiAgICAgICAgdmFyIG1heEJ1ZmZlcmVkO1xuXG4gICAgICAgIGlmIChwdWJsaXNoZWRCZWZvcmUpIHtcbiAgICAgICAgICAvLyBVbmxpbWl0ZWQgY2FzZSB3aGVyZSB0aGUgZG9jdW1lbnQgc3RheXMgaW4gcHVibGlzaGVkIG9uY2UgaXRcbiAgICAgICAgICAvLyBtYXRjaGVzIG9yIHRoZSBjYXNlIHdoZW4gd2UgZG9uJ3QgaGF2ZSBlbm91Z2ggbWF0Y2hpbmcgZG9jcyB0b1xuICAgICAgICAgIC8vIHB1Ymxpc2ggb3IgdGhlIGNoYW5nZWQgYnV0IG1hdGNoaW5nIGRvYyB3aWxsIHN0YXkgaW4gcHVibGlzaGVkXG4gICAgICAgICAgLy8gYW55d2F5cy5cbiAgICAgICAgICAvL1xuICAgICAgICAgIC8vIFhYWDogV2UgcmVseSBvbiB0aGUgZW1wdGluZXNzIG9mIGJ1ZmZlci4gQmUgc3VyZSB0byBtYWludGFpbiB0aGVcbiAgICAgICAgICAvLyBmYWN0IHRoYXQgYnVmZmVyIGNhbid0IGJlIGVtcHR5IGlmIHRoZXJlIGFyZSBtYXRjaGluZyBkb2N1bWVudHMgbm90XG4gICAgICAgICAgLy8gcHVibGlzaGVkLiBOb3RhYmx5LCB3ZSBkb24ndCB3YW50IHRvIHNjaGVkdWxlIHJlcG9sbCBhbmQgY29udGludWVcbiAgICAgICAgICAvLyByZWx5aW5nIG9uIHRoaXMgcHJvcGVydHkuXG4gICAgICAgICAgdmFyIHN0YXlzSW5QdWJsaXNoZWQgPSAhIHNlbGYuX2xpbWl0IHx8XG4gICAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgPT09IDAgfHxcbiAgICAgICAgICAgIGNvbXBhcmF0b3IobmV3RG9jLCBtaW5CdWZmZXJlZCkgPD0gMDtcblxuICAgICAgICAgIGlmIChzdGF5c0luUHVibGlzaGVkKSB7XG4gICAgICAgICAgICBzZWxmLl9jaGFuZ2VQdWJsaXNoZWQoaWQsIG9sZERvYywgbmV3RG9jKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gYWZ0ZXIgdGhlIGNoYW5nZSBkb2MgZG9lc24ndCBzdGF5IGluIHRoZSBwdWJsaXNoZWQsIHJlbW92ZSBpdFxuICAgICAgICAgICAgc2VsZi5fcmVtb3ZlUHVibGlzaGVkKGlkKTtcbiAgICAgICAgICAgIC8vIGJ1dCBpdCBjYW4gbW92ZSBpbnRvIGJ1ZmZlcmVkIG5vdywgY2hlY2sgaXRcbiAgICAgICAgICAgIG1heEJ1ZmZlcmVkID0gc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZ2V0KFxuICAgICAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5tYXhFbGVtZW50SWQoKSk7XG5cbiAgICAgICAgICAgIHZhciB0b0J1ZmZlciA9IHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciB8fFxuICAgICAgICAgICAgICAgICAgKG1heEJ1ZmZlcmVkICYmIGNvbXBhcmF0b3IobmV3RG9jLCBtYXhCdWZmZXJlZCkgPD0gMCk7XG5cbiAgICAgICAgICAgIGlmICh0b0J1ZmZlcikge1xuICAgICAgICAgICAgICBzZWxmLl9hZGRCdWZmZXJlZChpZCwgbmV3RG9jKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIFRocm93IGF3YXkgZnJvbSBib3RoIHB1Ymxpc2hlZCBzZXQgYW5kIGJ1ZmZlclxuICAgICAgICAgICAgICBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoYnVmZmVyZWRCZWZvcmUpIHtcbiAgICAgICAgICBvbGREb2MgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoaWQpO1xuICAgICAgICAgIC8vIHJlbW92ZSB0aGUgb2xkIHZlcnNpb24gbWFudWFsbHkgaW5zdGVhZCBvZiB1c2luZyBfcmVtb3ZlQnVmZmVyZWQgc29cbiAgICAgICAgICAvLyB3ZSBkb24ndCB0cmlnZ2VyIHRoZSBxdWVyeWluZyBpbW1lZGlhdGVseS4gIGlmIHdlIGVuZCB0aGlzIGJsb2NrXG4gICAgICAgICAgLy8gd2l0aCB0aGUgYnVmZmVyIGVtcHR5LCB3ZSB3aWxsIG5lZWQgdG8gdHJpZ2dlciB0aGUgcXVlcnkgcG9sbFxuICAgICAgICAgIC8vIG1hbnVhbGx5IHRvby5cbiAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5yZW1vdmUoaWQpO1xuXG4gICAgICAgICAgdmFyIG1heFB1Ymxpc2hlZCA9IHNlbGYuX3B1Ymxpc2hlZC5nZXQoXG4gICAgICAgICAgICBzZWxmLl9wdWJsaXNoZWQubWF4RWxlbWVudElkKCkpO1xuICAgICAgICAgIG1heEJ1ZmZlcmVkID0gc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2l6ZSgpICYmXG4gICAgICAgICAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZ2V0KFxuICAgICAgICAgICAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIubWF4RWxlbWVudElkKCkpO1xuXG4gICAgICAgICAgLy8gdGhlIGJ1ZmZlcmVkIGRvYyB3YXMgdXBkYXRlZCwgaXQgY291bGQgbW92ZSB0byBwdWJsaXNoZWRcbiAgICAgICAgICB2YXIgdG9QdWJsaXNoID0gY29tcGFyYXRvcihuZXdEb2MsIG1heFB1Ymxpc2hlZCkgPCAwO1xuXG4gICAgICAgICAgLy8gb3Igc3RheXMgaW4gYnVmZmVyIGV2ZW4gYWZ0ZXIgdGhlIGNoYW5nZVxuICAgICAgICAgIHZhciBzdGF5c0luQnVmZmVyID0gKCEgdG9QdWJsaXNoICYmIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlcikgfHxcbiAgICAgICAgICAgICAgICAoIXRvUHVibGlzaCAmJiBtYXhCdWZmZXJlZCAmJlxuICAgICAgICAgICAgICAgICBjb21wYXJhdG9yKG5ld0RvYywgbWF4QnVmZmVyZWQpIDw9IDApO1xuXG4gICAgICAgICAgaWYgKHRvUHVibGlzaCkge1xuICAgICAgICAgICAgc2VsZi5fYWRkUHVibGlzaGVkKGlkLCBuZXdEb2MpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoc3RheXNJbkJ1ZmZlcikge1xuICAgICAgICAgICAgLy8gc3RheXMgaW4gYnVmZmVyIGJ1dCBjaGFuZ2VzXG4gICAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zZXQoaWQsIG5ld0RvYyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRocm93IGF3YXkgZnJvbSBib3RoIHB1Ymxpc2hlZCBzZXQgYW5kIGJ1ZmZlclxuICAgICAgICAgICAgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICAvLyBOb3JtYWxseSB0aGlzIGNoZWNrIHdvdWxkIGhhdmUgYmVlbiBkb25lIGluIF9yZW1vdmVCdWZmZXJlZCBidXRcbiAgICAgICAgICAgIC8vIHdlIGRpZG4ndCB1c2UgaXQsIHNvIHdlIG5lZWQgdG8gZG8gaXQgb3Vyc2VsZiBub3cuXG4gICAgICAgICAgICBpZiAoISBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkpIHtcbiAgICAgICAgICAgICAgc2VsZi5fbmVlZFRvUG9sbFF1ZXJ5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImNhY2hlZEJlZm9yZSBpbXBsaWVzIGVpdGhlciBvZiBwdWJsaXNoZWRCZWZvcmUgb3IgYnVmZmVyZWRCZWZvcmUgaXMgdHJ1ZS5cIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgX2ZldGNoTW9kaWZpZWREb2N1bWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fcmVnaXN0ZXJQaGFzZUNoYW5nZShQSEFTRS5GRVRDSElORyk7XG4gICAgICAvLyBEZWZlciwgYmVjYXVzZSBub3RoaW5nIGNhbGxlZCBmcm9tIHRoZSBvcGxvZyBlbnRyeSBoYW5kbGVyIG1heSB5aWVsZCxcbiAgICAgIC8vIGJ1dCBmZXRjaCgpIHlpZWxkcy5cbiAgICAgIE1ldGVvci5kZWZlcihmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdoaWxlICghc2VsZi5fc3RvcHBlZCAmJiAhc2VsZi5fbmVlZFRvRmV0Y2guZW1wdHkoKSkge1xuICAgICAgICAgIGlmIChzZWxmLl9waGFzZSA9PT0gUEhBU0UuUVVFUllJTkcpIHtcbiAgICAgICAgICAgIC8vIFdoaWxlIGZldGNoaW5nLCB3ZSBkZWNpZGVkIHRvIGdvIGludG8gUVVFUllJTkcgbW9kZSwgYW5kIHRoZW4gd2VcbiAgICAgICAgICAgIC8vIHNhdyBhbm90aGVyIG9wbG9nIGVudHJ5LCBzbyBfbmVlZFRvRmV0Y2ggaXMgbm90IGVtcHR5LiBCdXQgd2VcbiAgICAgICAgICAgIC8vIHNob3VsZG4ndCBmZXRjaCB0aGVzZSBkb2N1bWVudHMgdW50aWwgQUZURVIgdGhlIHF1ZXJ5IGlzIGRvbmUuXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBCZWluZyBpbiBzdGVhZHkgcGhhc2UgaGVyZSB3b3VsZCBiZSBzdXJwcmlzaW5nLlxuICAgICAgICAgIGlmIChzZWxmLl9waGFzZSAhPT0gUEhBU0UuRkVUQ0hJTkcpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwaGFzZSBpbiBmZXRjaE1vZGlmaWVkRG9jdW1lbnRzOiBcIiArIHNlbGYuX3BoYXNlKTtcblxuICAgICAgICAgIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nID0gc2VsZi5fbmVlZFRvRmV0Y2g7XG4gICAgICAgICAgdmFyIHRoaXNHZW5lcmF0aW9uID0gKytzZWxmLl9mZXRjaEdlbmVyYXRpb247XG4gICAgICAgICAgc2VsZi5fbmVlZFRvRmV0Y2ggPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgICAgICAgICB2YXIgd2FpdGluZyA9IDA7XG4gICAgICAgICAgdmFyIGZ1dCA9IG5ldyBGdXR1cmU7XG4gICAgICAgICAgLy8gVGhpcyBsb29wIGlzIHNhZmUsIGJlY2F1c2UgX2N1cnJlbnRseUZldGNoaW5nIHdpbGwgbm90IGJlIHVwZGF0ZWRcbiAgICAgICAgICAvLyBkdXJpbmcgdGhpcyBsb29wIChpbiBmYWN0LCBpdCBpcyBuZXZlciBtdXRhdGVkKS5cbiAgICAgICAgICBzZWxmLl9jdXJyZW50bHlGZXRjaGluZy5mb3JFYWNoKGZ1bmN0aW9uIChjYWNoZUtleSwgaWQpIHtcbiAgICAgICAgICAgIHdhaXRpbmcrKztcbiAgICAgICAgICAgIHNlbGYuX21vbmdvSGFuZGxlLl9kb2NGZXRjaGVyLmZldGNoKFxuICAgICAgICAgICAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZSwgaWQsIGNhY2hlS2V5LFxuICAgICAgICAgICAgICBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeShmdW5jdGlvbiAoZXJyLCBkb2MpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBNZXRlb3IuX2RlYnVnKFwiR290IGV4Y2VwdGlvbiB3aGlsZSBmZXRjaGluZyBkb2N1bWVudHNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnIpO1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB3ZSBnZXQgYW4gZXJyb3IgZnJvbSB0aGUgZmV0Y2hlciAoZWcsIHRyb3VibGVcbiAgICAgICAgICAgICAgICAgICAgLy8gY29ubmVjdGluZyB0byBNb25nbyksIGxldCdzIGp1c3QgYWJhbmRvbiB0aGUgZmV0Y2ggcGhhc2VcbiAgICAgICAgICAgICAgICAgICAgLy8gYWx0b2dldGhlciBhbmQgZmFsbCBiYWNrIHRvIHBvbGxpbmcuIEl0J3Mgbm90IGxpa2Ugd2UncmVcbiAgICAgICAgICAgICAgICAgICAgLy8gZ2V0dGluZyBsaXZlIHVwZGF0ZXMgYW55d2F5LlxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5fcGhhc2UgIT09IFBIQVNFLlFVRVJZSU5HKSB7XG4gICAgICAgICAgICAgICAgICAgICAgc2VsZi5fbmVlZFRvUG9sbFF1ZXJ5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXNlbGYuX3N0b3BwZWQgJiYgc2VsZi5fcGhhc2UgPT09IFBIQVNFLkZFVENISU5HXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICYmIHNlbGYuX2ZldGNoR2VuZXJhdGlvbiA9PT0gdGhpc0dlbmVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gV2UgcmUtY2hlY2sgdGhlIGdlbmVyYXRpb24gaW4gY2FzZSB3ZSd2ZSBoYWQgYW4gZXhwbGljaXRcbiAgICAgICAgICAgICAgICAgICAgLy8gX3BvbGxRdWVyeSBjYWxsIChlZywgaW4gYW5vdGhlciBmaWJlcikgd2hpY2ggc2hvdWxkXG4gICAgICAgICAgICAgICAgICAgIC8vIGVmZmVjdGl2ZWx5IGNhbmNlbCB0aGlzIHJvdW5kIG9mIGZldGNoZXMuICAoX3BvbGxRdWVyeVxuICAgICAgICAgICAgICAgICAgICAvLyBpbmNyZW1lbnRzIHRoZSBnZW5lcmF0aW9uLilcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5faGFuZGxlRG9jKGlkLCBkb2MpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgICB3YWl0aW5nLS07XG4gICAgICAgICAgICAgICAgICAvLyBCZWNhdXNlIGZldGNoKCkgbmV2ZXIgY2FsbHMgaXRzIGNhbGxiYWNrIHN5bmNocm9ub3VzbHksXG4gICAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIHNhZmUgKGllLCB3ZSB3b24ndCBjYWxsIGZ1dC5yZXR1cm4oKSBiZWZvcmUgdGhlXG4gICAgICAgICAgICAgICAgICAvLyBmb3JFYWNoIGlzIGRvbmUpLlxuICAgICAgICAgICAgICAgICAgaWYgKHdhaXRpbmcgPT09IDApXG4gICAgICAgICAgICAgICAgICAgIGZ1dC5yZXR1cm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBmdXQud2FpdCgpO1xuICAgICAgICAgIC8vIEV4aXQgbm93IGlmIHdlJ3ZlIGhhZCBhIF9wb2xsUXVlcnkgY2FsbCAoaGVyZSBvciBpbiBhbm90aGVyIGZpYmVyKS5cbiAgICAgICAgICBpZiAoc2VsZi5fcGhhc2UgPT09IFBIQVNFLlFVRVJZSU5HKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICAvLyBXZSdyZSBkb25lIGZldGNoaW5nLCBzbyB3ZSBjYW4gYmUgc3RlYWR5LCB1bmxlc3Mgd2UndmUgaGFkIGFcbiAgICAgICAgLy8gX3BvbGxRdWVyeSBjYWxsIChoZXJlIG9yIGluIGFub3RoZXIgZmliZXIpLlxuICAgICAgICBpZiAoc2VsZi5fcGhhc2UgIT09IFBIQVNFLlFVRVJZSU5HKVxuICAgICAgICAgIHNlbGYuX2JlU3RlYWR5KCk7XG4gICAgICB9KSk7XG4gICAgfSk7XG4gIH0sXG4gIF9iZVN0ZWFkeTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9yZWdpc3RlclBoYXNlQ2hhbmdlKFBIQVNFLlNURUFEWSk7XG4gICAgICB2YXIgd3JpdGVzID0gc2VsZi5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeTtcbiAgICAgIHNlbGYuX3dyaXRlc1RvQ29tbWl0V2hlbldlUmVhY2hTdGVhZHkgPSBbXTtcbiAgICAgIHNlbGYuX211bHRpcGxleGVyLm9uRmx1c2goZnVuY3Rpb24gKCkge1xuICAgICAgICBfLmVhY2god3JpdGVzLCBmdW5jdGlvbiAodykge1xuICAgICAgICAgIHcuY29tbWl0dGVkKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG4gIF9oYW5kbGVPcGxvZ0VudHJ5UXVlcnlpbmc6IGZ1bmN0aW9uIChvcCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9uZWVkVG9GZXRjaC5zZXQoaWRGb3JPcChvcCksIG9wLnRzLnRvU3RyaW5nKCkpO1xuICAgIH0pO1xuICB9LFxuICBfaGFuZGxlT3Bsb2dFbnRyeVN0ZWFkeU9yRmV0Y2hpbmc6IGZ1bmN0aW9uIChvcCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgaWQgPSBpZEZvck9wKG9wKTtcbiAgICAgIC8vIElmIHdlJ3JlIGFscmVhZHkgZmV0Y2hpbmcgdGhpcyBvbmUsIG9yIGFib3V0IHRvLCB3ZSBjYW4ndCBvcHRpbWl6ZTtcbiAgICAgIC8vIG1ha2Ugc3VyZSB0aGF0IHdlIGZldGNoIGl0IGFnYWluIGlmIG5lY2Vzc2FyeS5cbiAgICAgIGlmIChzZWxmLl9waGFzZSA9PT0gUEhBU0UuRkVUQ0hJTkcgJiZcbiAgICAgICAgICAoKHNlbGYuX2N1cnJlbnRseUZldGNoaW5nICYmIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nLmhhcyhpZCkpIHx8XG4gICAgICAgICAgIHNlbGYuX25lZWRUb0ZldGNoLmhhcyhpZCkpKSB7XG4gICAgICAgIHNlbGYuX25lZWRUb0ZldGNoLnNldChpZCwgb3AudHMudG9TdHJpbmcoKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKG9wLm9wID09PSAnZCcpIHtcbiAgICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5oYXMoaWQpIHx8XG4gICAgICAgICAgICAoc2VsZi5fbGltaXQgJiYgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuaGFzKGlkKSkpXG4gICAgICAgICAgc2VsZi5fcmVtb3ZlTWF0Y2hpbmcoaWQpO1xuICAgICAgfSBlbHNlIGlmIChvcC5vcCA9PT0gJ2knKSB7XG4gICAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKSlcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnNlcnQgZm91bmQgZm9yIGFscmVhZHktZXhpc3RpbmcgSUQgaW4gcHVibGlzaGVkXCIpO1xuICAgICAgICBpZiAoc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIgJiYgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuaGFzKGlkKSlcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnNlcnQgZm91bmQgZm9yIGFscmVhZHktZXhpc3RpbmcgSUQgaW4gYnVmZmVyXCIpO1xuXG4gICAgICAgIC8vIFhYWCB3aGF0IGlmIHNlbGVjdG9yIHlpZWxkcz8gIGZvciBub3cgaXQgY2FuJ3QgYnV0IGxhdGVyIGl0IGNvdWxkXG4gICAgICAgIC8vIGhhdmUgJHdoZXJlXG4gICAgICAgIGlmIChzZWxmLl9tYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhvcC5vKS5yZXN1bHQpXG4gICAgICAgICAgc2VsZi5fYWRkTWF0Y2hpbmcob3Aubyk7XG4gICAgICB9IGVsc2UgaWYgKG9wLm9wID09PSAndScpIHtcbiAgICAgICAgLy8gSXMgdGhpcyBhIG1vZGlmaWVyICgkc2V0LyR1bnNldCwgd2hpY2ggbWF5IHJlcXVpcmUgdXMgdG8gcG9sbCB0aGVcbiAgICAgICAgLy8gZGF0YWJhc2UgdG8gZmlndXJlIG91dCBpZiB0aGUgd2hvbGUgZG9jdW1lbnQgbWF0Y2hlcyB0aGUgc2VsZWN0b3IpIG9yXG4gICAgICAgIC8vIGEgcmVwbGFjZW1lbnQgKGluIHdoaWNoIGNhc2Ugd2UgY2FuIGp1c3QgZGlyZWN0bHkgcmUtZXZhbHVhdGUgdGhlXG4gICAgICAgIC8vIHNlbGVjdG9yKT9cbiAgICAgICAgdmFyIGlzUmVwbGFjZSA9ICFfLmhhcyhvcC5vLCAnJHNldCcpICYmICFfLmhhcyhvcC5vLCAnJHVuc2V0Jyk7XG4gICAgICAgIC8vIElmIHRoaXMgbW9kaWZpZXIgbW9kaWZpZXMgc29tZXRoaW5nIGluc2lkZSBhbiBFSlNPTiBjdXN0b20gdHlwZSAoaWUsXG4gICAgICAgIC8vIGFueXRoaW5nIHdpdGggRUpTT04kKSwgdGhlbiB3ZSBjYW4ndCB0cnkgdG8gdXNlXG4gICAgICAgIC8vIExvY2FsQ29sbGVjdGlvbi5fbW9kaWZ5LCBzaW5jZSB0aGF0IGp1c3QgbXV0YXRlcyB0aGUgRUpTT04gZW5jb2RpbmcsXG4gICAgICAgIC8vIG5vdCB0aGUgYWN0dWFsIG9iamVjdC5cbiAgICAgICAgdmFyIGNhbkRpcmVjdGx5TW9kaWZ5RG9jID1cbiAgICAgICAgICAhaXNSZXBsYWNlICYmIG1vZGlmaWVyQ2FuQmVEaXJlY3RseUFwcGxpZWQob3Aubyk7XG5cbiAgICAgICAgdmFyIHB1Ymxpc2hlZEJlZm9yZSA9IHNlbGYuX3B1Ymxpc2hlZC5oYXMoaWQpO1xuICAgICAgICB2YXIgYnVmZmVyZWRCZWZvcmUgPSBzZWxmLl9saW1pdCAmJiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5oYXMoaWQpO1xuXG4gICAgICAgIGlmIChpc1JlcGxhY2UpIHtcbiAgICAgICAgICBzZWxmLl9oYW5kbGVEb2MoaWQsIF8uZXh0ZW5kKHtfaWQ6IGlkfSwgb3AubykpO1xuICAgICAgICB9IGVsc2UgaWYgKChwdWJsaXNoZWRCZWZvcmUgfHwgYnVmZmVyZWRCZWZvcmUpICYmXG4gICAgICAgICAgICAgICAgICAgY2FuRGlyZWN0bHlNb2RpZnlEb2MpIHtcbiAgICAgICAgICAvLyBPaCBncmVhdCwgd2UgYWN0dWFsbHkga25vdyB3aGF0IHRoZSBkb2N1bWVudCBpcywgc28gd2UgY2FuIGFwcGx5XG4gICAgICAgICAgLy8gdGhpcyBkaXJlY3RseS5cbiAgICAgICAgICB2YXIgbmV3RG9jID0gc2VsZi5fcHVibGlzaGVkLmhhcyhpZClcbiAgICAgICAgICAgID8gc2VsZi5fcHVibGlzaGVkLmdldChpZCkgOiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoaWQpO1xuICAgICAgICAgIG5ld0RvYyA9IEVKU09OLmNsb25lKG5ld0RvYyk7XG5cbiAgICAgICAgICBuZXdEb2MuX2lkID0gaWQ7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIExvY2FsQ29sbGVjdGlvbi5fbW9kaWZ5KG5ld0RvYywgb3Aubyk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGUubmFtZSAhPT0gXCJNaW5pbW9uZ29FcnJvclwiKVxuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgLy8gV2UgZGlkbid0IHVuZGVyc3RhbmQgdGhlIG1vZGlmaWVyLiAgUmUtZmV0Y2guXG4gICAgICAgICAgICBzZWxmLl9uZWVkVG9GZXRjaC5zZXQoaWQsIG9wLnRzLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5TVEVBRFkpIHtcbiAgICAgICAgICAgICAgc2VsZi5fZmV0Y2hNb2RpZmllZERvY3VtZW50cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZWxmLl9oYW5kbGVEb2MoaWQsIHNlbGYuX3NoYXJlZFByb2plY3Rpb25GbihuZXdEb2MpKTtcbiAgICAgICAgfSBlbHNlIGlmICghY2FuRGlyZWN0bHlNb2RpZnlEb2MgfHxcbiAgICAgICAgICAgICAgICAgICBzZWxmLl9tYXRjaGVyLmNhbkJlY29tZVRydWVCeU1vZGlmaWVyKG9wLm8pIHx8XG4gICAgICAgICAgICAgICAgICAgKHNlbGYuX3NvcnRlciAmJiBzZWxmLl9zb3J0ZXIuYWZmZWN0ZWRCeU1vZGlmaWVyKG9wLm8pKSkge1xuICAgICAgICAgIHNlbGYuX25lZWRUb0ZldGNoLnNldChpZCwgb3AudHMudG9TdHJpbmcoKSk7XG4gICAgICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5TVEVBRFkpXG4gICAgICAgICAgICBzZWxmLl9mZXRjaE1vZGlmaWVkRG9jdW1lbnRzKCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IEVycm9yKFwiWFhYIFNVUlBSSVNJTkcgT1BFUkFUSU9OOiBcIiArIG9wKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgLy8gWWllbGRzIVxuICBfcnVuSW5pdGlhbFF1ZXJ5OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwib3Bsb2cgc3RvcHBlZCBzdXJwcmlzaW5nbHkgZWFybHlcIik7XG5cbiAgICBzZWxmLl9ydW5RdWVyeSh7aW5pdGlhbDogdHJ1ZX0pOyAgLy8geWllbGRzXG5cbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjsgIC8vIGNhbiBoYXBwZW4gb24gcXVlcnlFcnJvclxuXG4gICAgLy8gQWxsb3cgb2JzZXJ2ZUNoYW5nZXMgY2FsbHMgdG8gcmV0dXJuLiAoQWZ0ZXIgdGhpcywgaXQncyBwb3NzaWJsZSBmb3JcbiAgICAvLyBzdG9wKCkgdG8gYmUgY2FsbGVkLilcbiAgICBzZWxmLl9tdWx0aXBsZXhlci5yZWFkeSgpO1xuXG4gICAgc2VsZi5fZG9uZVF1ZXJ5aW5nKCk7ICAvLyB5aWVsZHNcbiAgfSxcblxuICAvLyBJbiB2YXJpb3VzIGNpcmN1bXN0YW5jZXMsIHdlIG1heSBqdXN0IHdhbnQgdG8gc3RvcCBwcm9jZXNzaW5nIHRoZSBvcGxvZyBhbmRcbiAgLy8gcmUtcnVuIHRoZSBpbml0aWFsIHF1ZXJ5LCBqdXN0IGFzIGlmIHdlIHdlcmUgYSBQb2xsaW5nT2JzZXJ2ZURyaXZlci5cbiAgLy9cbiAgLy8gVGhpcyBmdW5jdGlvbiBtYXkgbm90IGJsb2NrLCBiZWNhdXNlIGl0IGlzIGNhbGxlZCBmcm9tIGFuIG9wbG9nIGVudHJ5XG4gIC8vIGhhbmRsZXIuXG4gIC8vXG4gIC8vIFhYWCBXZSBzaG91bGQgY2FsbCB0aGlzIHdoZW4gd2UgZGV0ZWN0IHRoYXQgd2UndmUgYmVlbiBpbiBGRVRDSElORyBmb3IgXCJ0b29cbiAgLy8gbG9uZ1wiLlxuICAvL1xuICAvLyBYWFggV2Ugc2hvdWxkIGNhbGwgdGhpcyB3aGVuIHdlIGRldGVjdCBNb25nbyBmYWlsb3ZlciAoc2luY2UgdGhhdCBtaWdodFxuICAvLyBtZWFuIHRoYXQgc29tZSBvZiB0aGUgb3Bsb2cgZW50cmllcyB3ZSBoYXZlIHByb2Nlc3NlZCBoYXZlIGJlZW4gcm9sbGVkXG4gIC8vIGJhY2spLiBUaGUgTm9kZSBNb25nbyBkcml2ZXIgaXMgaW4gdGhlIG1pZGRsZSBvZiBhIGJ1bmNoIG9mIGh1Z2VcbiAgLy8gcmVmYWN0b3JpbmdzLCBpbmNsdWRpbmcgdGhlIHdheSB0aGF0IGl0IG5vdGlmaWVzIHlvdSB3aGVuIHByaW1hcnlcbiAgLy8gY2hhbmdlcy4gV2lsbCBwdXQgb2ZmIGltcGxlbWVudGluZyB0aGlzIHVudGlsIGRyaXZlciAxLjQgaXMgb3V0LlxuICBfcG9sbFF1ZXJ5OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgICByZXR1cm47XG5cbiAgICAgIC8vIFlheSwgd2UgZ2V0IHRvIGZvcmdldCBhYm91dCBhbGwgdGhlIHRoaW5ncyB3ZSB0aG91Z2h0IHdlIGhhZCB0byBmZXRjaC5cbiAgICAgIHNlbGYuX25lZWRUb0ZldGNoID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gICAgICBzZWxmLl9jdXJyZW50bHlGZXRjaGluZyA9IG51bGw7XG4gICAgICArK3NlbGYuX2ZldGNoR2VuZXJhdGlvbjsgIC8vIGlnbm9yZSBhbnkgaW4tZmxpZ2h0IGZldGNoZXNcbiAgICAgIHNlbGYuX3JlZ2lzdGVyUGhhc2VDaGFuZ2UoUEhBU0UuUVVFUllJTkcpO1xuXG4gICAgICAvLyBEZWZlciBzbyB0aGF0IHdlIGRvbid0IHlpZWxkLiAgV2UgZG9uJ3QgbmVlZCBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeVxuICAgICAgLy8gaGVyZSBiZWNhdXNlIFN3aXRjaGVkVG9RdWVyeSBpcyBub3QgdGhyb3duIGluIFFVRVJZSU5HIG1vZGUuXG4gICAgICBNZXRlb3IuZGVmZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLl9ydW5RdWVyeSgpO1xuICAgICAgICBzZWxmLl9kb25lUXVlcnlpbmcoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFlpZWxkcyFcbiAgX3J1blF1ZXJ5OiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgbmV3UmVzdWx0cywgbmV3QnVmZmVyO1xuXG4gICAgLy8gVGhpcyB3aGlsZSBsb29wIGlzIGp1c3QgdG8gcmV0cnkgZmFpbHVyZXMuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIC8vIElmIHdlJ3ZlIGJlZW4gc3RvcHBlZCwgd2UgZG9uJ3QgaGF2ZSB0byBydW4gYW55dGhpbmcgYW55IG1vcmUuXG4gICAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICBuZXdSZXN1bHRzID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gICAgICBuZXdCdWZmZXIgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcblxuICAgICAgLy8gUXVlcnkgMnggZG9jdW1lbnRzIGFzIHRoZSBoYWxmIGV4Y2x1ZGVkIGZyb20gdGhlIG9yaWdpbmFsIHF1ZXJ5IHdpbGwgZ29cbiAgICAgIC8vIGludG8gdW5wdWJsaXNoZWQgYnVmZmVyIHRvIHJlZHVjZSBhZGRpdGlvbmFsIE1vbmdvIGxvb2t1cHMgaW4gY2FzZXNcbiAgICAgIC8vIHdoZW4gZG9jdW1lbnRzIGFyZSByZW1vdmVkIGZyb20gdGhlIHB1Ymxpc2hlZCBzZXQgYW5kIG5lZWQgYVxuICAgICAgLy8gcmVwbGFjZW1lbnQuXG4gICAgICAvLyBYWFggbmVlZHMgbW9yZSB0aG91Z2h0IG9uIG5vbi16ZXJvIHNraXBcbiAgICAgIC8vIFhYWCAyIGlzIGEgXCJtYWdpYyBudW1iZXJcIiBtZWFuaW5nIHRoZXJlIGlzIGFuIGV4dHJhIGNodW5rIG9mIGRvY3MgZm9yXG4gICAgICAvLyBidWZmZXIgaWYgc3VjaCBpcyBuZWVkZWQuXG4gICAgICB2YXIgY3Vyc29yID0gc2VsZi5fY3Vyc29yRm9yUXVlcnkoeyBsaW1pdDogc2VsZi5fbGltaXQgKiAyIH0pO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY3Vyc29yLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaSkgeyAgLy8geWllbGRzXG4gICAgICAgICAgaWYgKCFzZWxmLl9saW1pdCB8fCBpIDwgc2VsZi5fbGltaXQpIHtcbiAgICAgICAgICAgIG5ld1Jlc3VsdHMuc2V0KGRvYy5faWQsIGRvYyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5ld0J1ZmZlci5zZXQoZG9jLl9pZCwgZG9jKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuaW5pdGlhbCAmJiB0eXBlb2YoZS5jb2RlKSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAvLyBUaGlzIGlzIGFuIGVycm9yIGRvY3VtZW50IHNlbnQgdG8gdXMgYnkgbW9uZ29kLCBub3QgYSBjb25uZWN0aW9uXG4gICAgICAgICAgLy8gZXJyb3IgZ2VuZXJhdGVkIGJ5IHRoZSBjbGllbnQuIEFuZCB3ZSd2ZSBuZXZlciBzZWVuIHRoaXMgcXVlcnkgd29ya1xuICAgICAgICAgIC8vIHN1Y2Nlc3NmdWxseS4gUHJvYmFibHkgaXQncyBhIGJhZCBzZWxlY3RvciBvciBzb21ldGhpbmcsIHNvIHdlXG4gICAgICAgICAgLy8gc2hvdWxkIE5PVCByZXRyeS4gSW5zdGVhZCwgd2Ugc2hvdWxkIGhhbHQgdGhlIG9ic2VydmUgKHdoaWNoIGVuZHNcbiAgICAgICAgICAvLyB1cCBjYWxsaW5nIGBzdG9wYCBvbiB1cykuXG4gICAgICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIucXVlcnlFcnJvcihlKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEdXJpbmcgZmFpbG92ZXIgKGVnKSBpZiB3ZSBnZXQgYW4gZXhjZXB0aW9uIHdlIHNob3VsZCBsb2cgYW5kIHJldHJ5XG4gICAgICAgIC8vIGluc3RlYWQgb2YgY3Jhc2hpbmcuXG4gICAgICAgIE1ldGVvci5fZGVidWcoXCJHb3QgZXhjZXB0aW9uIHdoaWxlIHBvbGxpbmcgcXVlcnlcIiwgZSk7XG4gICAgICAgIE1ldGVvci5fc2xlZXBGb3JNcygxMDApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgc2VsZi5fcHVibGlzaE5ld1Jlc3VsdHMobmV3UmVzdWx0cywgbmV3QnVmZmVyKTtcbiAgfSxcblxuICAvLyBUcmFuc2l0aW9ucyB0byBRVUVSWUlORyBhbmQgcnVucyBhbm90aGVyIHF1ZXJ5LCBvciAoaWYgYWxyZWFkeSBpbiBRVUVSWUlORylcbiAgLy8gZW5zdXJlcyB0aGF0IHdlIHdpbGwgcXVlcnkgYWdhaW4gbGF0ZXIuXG4gIC8vXG4gIC8vIFRoaXMgZnVuY3Rpb24gbWF5IG5vdCBibG9jaywgYmVjYXVzZSBpdCBpcyBjYWxsZWQgZnJvbSBhbiBvcGxvZyBlbnRyeVxuICAvLyBoYW5kbGVyLiBIb3dldmVyLCBpZiB3ZSB3ZXJlIG5vdCBhbHJlYWR5IGluIHRoZSBRVUVSWUlORyBwaGFzZSwgaXQgdGhyb3dzXG4gIC8vIGFuIGV4Y2VwdGlvbiB0aGF0IGlzIGNhdWdodCBieSB0aGUgY2xvc2VzdCBzdXJyb3VuZGluZ1xuICAvLyBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeSBjYWxsOyB0aGlzIGVuc3VyZXMgdGhhdCB3ZSBkb24ndCBjb250aW51ZSBydW5uaW5nXG4gIC8vIGNsb3NlIHRoYXQgd2FzIGRlc2lnbmVkIGZvciBhbm90aGVyIHBoYXNlIGluc2lkZSBQSEFTRS5RVUVSWUlORy5cbiAgLy9cbiAgLy8gKEl0J3MgYWxzbyBuZWNlc3Nhcnkgd2hlbmV2ZXIgbG9naWMgaW4gdGhpcyBmaWxlIHlpZWxkcyB0byBjaGVjayB0aGF0IG90aGVyXG4gIC8vIHBoYXNlcyBoYXZlbid0IHB1dCB1cyBpbnRvIFFVRVJZSU5HIG1vZGUsIHRob3VnaDsgZWcsXG4gIC8vIF9mZXRjaE1vZGlmaWVkRG9jdW1lbnRzIGRvZXMgdGhpcy4pXG4gIF9uZWVkVG9Qb2xsUXVlcnk6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgLy8gSWYgd2UncmUgbm90IGFscmVhZHkgaW4gdGhlIG1pZGRsZSBvZiBhIHF1ZXJ5LCB3ZSBjYW4gcXVlcnkgbm93XG4gICAgICAvLyAocG9zc2libHkgcGF1c2luZyBGRVRDSElORykuXG4gICAgICBpZiAoc2VsZi5fcGhhc2UgIT09IFBIQVNFLlFVRVJZSU5HKSB7XG4gICAgICAgIHNlbGYuX3BvbGxRdWVyeSgpO1xuICAgICAgICB0aHJvdyBuZXcgU3dpdGNoZWRUb1F1ZXJ5O1xuICAgICAgfVxuXG4gICAgICAvLyBXZSdyZSBjdXJyZW50bHkgaW4gUVVFUllJTkcuIFNldCBhIGZsYWcgdG8gZW5zdXJlIHRoYXQgd2UgcnVuIGFub3RoZXJcbiAgICAgIC8vIHF1ZXJ5IHdoZW4gd2UncmUgZG9uZS5cbiAgICAgIHNlbGYuX3JlcXVlcnlXaGVuRG9uZVRoaXNRdWVyeSA9IHRydWU7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gWWllbGRzIVxuICBfZG9uZVF1ZXJ5aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICByZXR1cm47XG4gICAgc2VsZi5fbW9uZ29IYW5kbGUuX29wbG9nSGFuZGxlLndhaXRVbnRpbENhdWdodFVwKCk7ICAvLyB5aWVsZHNcbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjtcbiAgICBpZiAoc2VsZi5fcGhhc2UgIT09IFBIQVNFLlFVRVJZSU5HKVxuICAgICAgdGhyb3cgRXJyb3IoXCJQaGFzZSB1bmV4cGVjdGVkbHkgXCIgKyBzZWxmLl9waGFzZSk7XG5cbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoc2VsZi5fcmVxdWVyeVdoZW5Eb25lVGhpc1F1ZXJ5KSB7XG4gICAgICAgIHNlbGYuX3JlcXVlcnlXaGVuRG9uZVRoaXNRdWVyeSA9IGZhbHNlO1xuICAgICAgICBzZWxmLl9wb2xsUXVlcnkoKTtcbiAgICAgIH0gZWxzZSBpZiAoc2VsZi5fbmVlZFRvRmV0Y2guZW1wdHkoKSkge1xuICAgICAgICBzZWxmLl9iZVN0ZWFkeSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5fZmV0Y2hNb2RpZmllZERvY3VtZW50cygpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIF9jdXJzb3JGb3JRdWVyeTogZnVuY3Rpb24gKG9wdGlvbnNPdmVyd3JpdGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIFRoZSBxdWVyeSB3ZSBydW4gaXMgYWxtb3N0IHRoZSBzYW1lIGFzIHRoZSBjdXJzb3Igd2UgYXJlIG9ic2VydmluZyxcbiAgICAgIC8vIHdpdGggYSBmZXcgY2hhbmdlcy4gV2UgbmVlZCB0byByZWFkIGFsbCB0aGUgZmllbGRzIHRoYXQgYXJlIHJlbGV2YW50IHRvXG4gICAgICAvLyB0aGUgc2VsZWN0b3IsIG5vdCBqdXN0IHRoZSBmaWVsZHMgd2UgYXJlIGdvaW5nIHRvIHB1Ymxpc2ggKHRoYXQncyB0aGVcbiAgICAgIC8vIFwic2hhcmVkXCIgcHJvamVjdGlvbikuIEFuZCB3ZSBkb24ndCB3YW50IHRvIGFwcGx5IGFueSB0cmFuc2Zvcm0gaW4gdGhlXG4gICAgICAvLyBjdXJzb3IsIGJlY2F1c2Ugb2JzZXJ2ZUNoYW5nZXMgc2hvdWxkbid0IHVzZSB0aGUgdHJhbnNmb3JtLlxuICAgICAgdmFyIG9wdGlvbnMgPSBfLmNsb25lKHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMpO1xuXG4gICAgICAvLyBBbGxvdyB0aGUgY2FsbGVyIHRvIG1vZGlmeSB0aGUgb3B0aW9ucy4gVXNlZnVsIHRvIHNwZWNpZnkgZGlmZmVyZW50XG4gICAgICAvLyBza2lwIGFuZCBsaW1pdCB2YWx1ZXMuXG4gICAgICBfLmV4dGVuZChvcHRpb25zLCBvcHRpb25zT3ZlcndyaXRlKTtcblxuICAgICAgb3B0aW9ucy5maWVsZHMgPSBzZWxmLl9zaGFyZWRQcm9qZWN0aW9uO1xuICAgICAgZGVsZXRlIG9wdGlvbnMudHJhbnNmb3JtO1xuICAgICAgLy8gV2UgYXJlIE5PVCBkZWVwIGNsb25pbmcgZmllbGRzIG9yIHNlbGVjdG9yIGhlcmUsIHdoaWNoIHNob3VsZCBiZSBPSy5cbiAgICAgIHZhciBkZXNjcmlwdGlvbiA9IG5ldyBDdXJzb3JEZXNjcmlwdGlvbihcbiAgICAgICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWUsXG4gICAgICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yLFxuICAgICAgICBvcHRpb25zKTtcbiAgICAgIHJldHVybiBuZXcgQ3Vyc29yKHNlbGYuX21vbmdvSGFuZGxlLCBkZXNjcmlwdGlvbik7XG4gICAgfSk7XG4gIH0sXG5cblxuICAvLyBSZXBsYWNlIHNlbGYuX3B1Ymxpc2hlZCB3aXRoIG5ld1Jlc3VsdHMgKGJvdGggYXJlIElkTWFwcyksIGludm9raW5nIG9ic2VydmVcbiAgLy8gY2FsbGJhY2tzIG9uIHRoZSBtdWx0aXBsZXhlci5cbiAgLy8gUmVwbGFjZSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlciB3aXRoIG5ld0J1ZmZlci5cbiAgLy9cbiAgLy8gWFhYIFRoaXMgaXMgdmVyeSBzaW1pbGFyIHRvIExvY2FsQ29sbGVjdGlvbi5fZGlmZlF1ZXJ5VW5vcmRlcmVkQ2hhbmdlcy4gV2VcbiAgLy8gc2hvdWxkIHJlYWxseTogKGEpIFVuaWZ5IElkTWFwIGFuZCBPcmRlcmVkRGljdCBpbnRvIFVub3JkZXJlZC9PcmRlcmVkRGljdFxuICAvLyAoYikgUmV3cml0ZSBkaWZmLmpzIHRvIHVzZSB0aGVzZSBjbGFzc2VzIGluc3RlYWQgb2YgYXJyYXlzIGFuZCBvYmplY3RzLlxuICBfcHVibGlzaE5ld1Jlc3VsdHM6IGZ1bmN0aW9uIChuZXdSZXN1bHRzLCBuZXdCdWZmZXIpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBJZiB0aGUgcXVlcnkgaXMgbGltaXRlZCBhbmQgdGhlcmUgaXMgYSBidWZmZXIsIHNodXQgZG93biBzbyBpdCBkb2Vzbid0XG4gICAgICAvLyBzdGF5IGluIGEgd2F5LlxuICAgICAgaWYgKHNlbGYuX2xpbWl0KSB7XG4gICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmNsZWFyKCk7XG4gICAgICB9XG5cbiAgICAgIC8vIEZpcnN0IHJlbW92ZSBhbnl0aGluZyB0aGF0J3MgZ29uZS4gQmUgY2FyZWZ1bCBub3QgdG8gbW9kaWZ5XG4gICAgICAvLyBzZWxmLl9wdWJsaXNoZWQgd2hpbGUgaXRlcmF0aW5nIG92ZXIgaXQuXG4gICAgICB2YXIgaWRzVG9SZW1vdmUgPSBbXTtcbiAgICAgIHNlbGYuX3B1Ymxpc2hlZC5mb3JFYWNoKGZ1bmN0aW9uIChkb2MsIGlkKSB7XG4gICAgICAgIGlmICghbmV3UmVzdWx0cy5oYXMoaWQpKVxuICAgICAgICAgIGlkc1RvUmVtb3ZlLnB1c2goaWQpO1xuICAgICAgfSk7XG4gICAgICBfLmVhY2goaWRzVG9SZW1vdmUsIGZ1bmN0aW9uIChpZCkge1xuICAgICAgICBzZWxmLl9yZW1vdmVQdWJsaXNoZWQoaWQpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIE5vdyBkbyBhZGRzIGFuZCBjaGFuZ2VzLlxuICAgICAgLy8gSWYgc2VsZiBoYXMgYSBidWZmZXIgYW5kIGxpbWl0LCB0aGUgbmV3IGZldGNoZWQgcmVzdWx0IHdpbGwgYmVcbiAgICAgIC8vIGxpbWl0ZWQgY29ycmVjdGx5IGFzIHRoZSBxdWVyeSBoYXMgc29ydCBzcGVjaWZpZXIuXG4gICAgICBuZXdSZXN1bHRzLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaWQpIHtcbiAgICAgICAgc2VsZi5faGFuZGxlRG9jKGlkLCBkb2MpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFNhbml0eS1jaGVjayB0aGF0IGV2ZXJ5dGhpbmcgd2UgdHJpZWQgdG8gcHV0IGludG8gX3B1Ymxpc2hlZCBlbmRlZCB1cFxuICAgICAgLy8gdGhlcmUuXG4gICAgICAvLyBYWFggaWYgdGhpcyBpcyBzbG93LCByZW1vdmUgaXQgbGF0ZXJcbiAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpICE9PSBuZXdSZXN1bHRzLnNpemUoKSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdUaGUgTW9uZ28gc2VydmVyIGFuZCB0aGUgTWV0ZW9yIHF1ZXJ5IGRpc2FncmVlIG9uIGhvdyAnICtcbiAgICAgICAgICAnbWFueSBkb2N1bWVudHMgbWF0Y2ggeW91ciBxdWVyeS4gQ3Vyc29yIGRlc2NyaXB0aW9uOiAnLFxuICAgICAgICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uKTtcbiAgICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgICAgXCJUaGUgTW9uZ28gc2VydmVyIGFuZCB0aGUgTWV0ZW9yIHF1ZXJ5IGRpc2FncmVlIG9uIGhvdyBcIiArXG4gICAgICAgICAgICBcIm1hbnkgZG9jdW1lbnRzIG1hdGNoIHlvdXIgcXVlcnkuIE1heWJlIGl0IGlzIGhpdHRpbmcgYSBNb25nbyBcIiArXG4gICAgICAgICAgICBcImVkZ2UgY2FzZT8gVGhlIHF1ZXJ5IGlzOiBcIiArXG4gICAgICAgICAgICBFSlNPTi5zdHJpbmdpZnkoc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IpKTtcbiAgICAgIH1cbiAgICAgIHNlbGYuX3B1Ymxpc2hlZC5mb3JFYWNoKGZ1bmN0aW9uIChkb2MsIGlkKSB7XG4gICAgICAgIGlmICghbmV3UmVzdWx0cy5oYXMoaWQpKVxuICAgICAgICAgIHRocm93IEVycm9yKFwiX3B1Ymxpc2hlZCBoYXMgYSBkb2MgdGhhdCBuZXdSZXN1bHRzIGRvZXNuJ3Q7IFwiICsgaWQpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIEZpbmFsbHksIHJlcGxhY2UgdGhlIGJ1ZmZlclxuICAgICAgbmV3QnVmZmVyLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaWQpIHtcbiAgICAgICAgc2VsZi5fYWRkQnVmZmVyZWQoaWQsIGRvYyk7XG4gICAgICB9KTtcblxuICAgICAgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyID0gbmV3QnVmZmVyLnNpemUoKSA8IHNlbGYuX2xpbWl0O1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFRoaXMgc3RvcCBmdW5jdGlvbiBpcyBpbnZva2VkIGZyb20gdGhlIG9uU3RvcCBvZiB0aGUgT2JzZXJ2ZU11bHRpcGxleGVyLCBzb1xuICAvLyBpdCBzaG91bGRuJ3QgYWN0dWFsbHkgYmUgcG9zc2libGUgdG8gY2FsbCBpdCB1bnRpbCB0aGUgbXVsdGlwbGV4ZXIgaXNcbiAgLy8gcmVhZHkuXG4gIC8vXG4gIC8vIEl0J3MgaW1wb3J0YW50IHRvIGNoZWNrIHNlbGYuX3N0b3BwZWQgYWZ0ZXIgZXZlcnkgY2FsbCBpbiB0aGlzIGZpbGUgdGhhdFxuICAvLyBjYW4geWllbGQhXG4gIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICByZXR1cm47XG4gICAgc2VsZi5fc3RvcHBlZCA9IHRydWU7XG4gICAgXy5lYWNoKHNlbGYuX3N0b3BIYW5kbGVzLCBmdW5jdGlvbiAoaGFuZGxlKSB7XG4gICAgICBoYW5kbGUuc3RvcCgpO1xuICAgIH0pO1xuXG4gICAgLy8gTm90ZTogd2UgKmRvbid0KiB1c2UgbXVsdGlwbGV4ZXIub25GbHVzaCBoZXJlIGJlY2F1c2UgdGhpcyBzdG9wXG4gICAgLy8gY2FsbGJhY2sgaXMgYWN0dWFsbHkgaW52b2tlZCBieSB0aGUgbXVsdGlwbGV4ZXIgaXRzZWxmIHdoZW4gaXQgaGFzXG4gICAgLy8gZGV0ZXJtaW5lZCB0aGF0IHRoZXJlIGFyZSBubyBoYW5kbGVzIGxlZnQuIFNvIG5vdGhpbmcgaXMgYWN0dWFsbHkgZ29pbmdcbiAgICAvLyB0byBnZXQgZmx1c2hlZCAoYW5kIGl0J3MgcHJvYmFibHkgbm90IHZhbGlkIHRvIGNhbGwgbWV0aG9kcyBvbiB0aGVcbiAgICAvLyBkeWluZyBtdWx0aXBsZXhlcikuXG4gICAgXy5lYWNoKHNlbGYuX3dyaXRlc1RvQ29tbWl0V2hlbldlUmVhY2hTdGVhZHksIGZ1bmN0aW9uICh3KSB7XG4gICAgICB3LmNvbW1pdHRlZCgpOyAgLy8gbWF5YmUgeWllbGRzP1xuICAgIH0pO1xuICAgIHNlbGYuX3dyaXRlc1RvQ29tbWl0V2hlbldlUmVhY2hTdGVhZHkgPSBudWxsO1xuXG4gICAgLy8gUHJvYWN0aXZlbHkgZHJvcCByZWZlcmVuY2VzIHRvIHBvdGVudGlhbGx5IGJpZyB0aGluZ3MuXG4gICAgc2VsZi5fcHVibGlzaGVkID0gbnVsbDtcbiAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlciA9IG51bGw7XG4gICAgc2VsZi5fbmVlZFRvRmV0Y2ggPSBudWxsO1xuICAgIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nID0gbnVsbDtcbiAgICBzZWxmLl9vcGxvZ0VudHJ5SGFuZGxlID0gbnVsbDtcbiAgICBzZWxmLl9saXN0ZW5lcnNIYW5kbGUgPSBudWxsO1xuXG4gICAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgXCJtb25nby1saXZlZGF0YVwiLCBcIm9ic2VydmUtZHJpdmVycy1vcGxvZ1wiLCAtMSk7XG4gIH0sXG5cbiAgX3JlZ2lzdGVyUGhhc2VDaGFuZ2U6IGZ1bmN0aW9uIChwaGFzZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgbm93ID0gbmV3IERhdGU7XG5cbiAgICAgIGlmIChzZWxmLl9waGFzZSkge1xuICAgICAgICB2YXIgdGltZURpZmYgPSBub3cgLSBzZWxmLl9waGFzZVN0YXJ0VGltZTtcbiAgICAgICAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJ0aW1lLXNwZW50LWluLVwiICsgc2VsZi5fcGhhc2UgKyBcIi1waGFzZVwiLCB0aW1lRGlmZik7XG4gICAgICB9XG5cbiAgICAgIHNlbGYuX3BoYXNlID0gcGhhc2U7XG4gICAgICBzZWxmLl9waGFzZVN0YXJ0VGltZSA9IG5vdztcbiAgICB9KTtcbiAgfVxufSk7XG5cbi8vIERvZXMgb3VyIG9wbG9nIHRhaWxpbmcgY29kZSBzdXBwb3J0IHRoaXMgY3Vyc29yPyBGb3Igbm93LCB3ZSBhcmUgYmVpbmcgdmVyeVxuLy8gY29uc2VydmF0aXZlIGFuZCBhbGxvd2luZyBvbmx5IHNpbXBsZSBxdWVyaWVzIHdpdGggc2ltcGxlIG9wdGlvbnMuXG4vLyAoVGhpcyBpcyBhIFwic3RhdGljIG1ldGhvZFwiLilcbk9wbG9nT2JzZXJ2ZURyaXZlci5jdXJzb3JTdXBwb3J0ZWQgPSBmdW5jdGlvbiAoY3Vyc29yRGVzY3JpcHRpb24sIG1hdGNoZXIpIHtcbiAgLy8gRmlyc3QsIGNoZWNrIHRoZSBvcHRpb25zLlxuICB2YXIgb3B0aW9ucyA9IGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnM7XG5cbiAgLy8gRGlkIHRoZSB1c2VyIHNheSBubyBleHBsaWNpdGx5P1xuICAvLyB1bmRlcnNjb3JlZCB2ZXJzaW9uIG9mIHRoZSBvcHRpb24gaXMgQ09NUEFUIHdpdGggMS4yXG4gIGlmIChvcHRpb25zLmRpc2FibGVPcGxvZyB8fCBvcHRpb25zLl9kaXNhYmxlT3Bsb2cpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIHNraXAgaXMgbm90IHN1cHBvcnRlZDogdG8gc3VwcG9ydCBpdCB3ZSB3b3VsZCBuZWVkIHRvIGtlZXAgdHJhY2sgb2YgYWxsXG4gIC8vIFwic2tpcHBlZFwiIGRvY3VtZW50cyBvciBhdCBsZWFzdCB0aGVpciBpZHMuXG4gIC8vIGxpbWl0IHcvbyBhIHNvcnQgc3BlY2lmaWVyIGlzIG5vdCBzdXBwb3J0ZWQ6IGN1cnJlbnQgaW1wbGVtZW50YXRpb24gbmVlZHMgYVxuICAvLyBkZXRlcm1pbmlzdGljIHdheSB0byBvcmRlciBkb2N1bWVudHMuXG4gIGlmIChvcHRpb25zLnNraXAgfHwgKG9wdGlvbnMubGltaXQgJiYgIW9wdGlvbnMuc29ydCkpIHJldHVybiBmYWxzZTtcblxuICAvLyBJZiBhIGZpZWxkcyBwcm9qZWN0aW9uIG9wdGlvbiBpcyBnaXZlbiBjaGVjayBpZiBpdCBpcyBzdXBwb3J0ZWQgYnlcbiAgLy8gbWluaW1vbmdvIChzb21lIG9wZXJhdG9ycyBhcmUgbm90IHN1cHBvcnRlZCkuXG4gIGlmIChvcHRpb25zLmZpZWxkcykge1xuICAgIHRyeSB7XG4gICAgICBMb2NhbENvbGxlY3Rpb24uX2NoZWNrU3VwcG9ydGVkUHJvamVjdGlvbihvcHRpb25zLmZpZWxkcyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUubmFtZSA9PT0gXCJNaW5pbW9uZ29FcnJvclwiKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gV2UgZG9uJ3QgYWxsb3cgdGhlIGZvbGxvd2luZyBzZWxlY3RvcnM6XG4gIC8vICAgLSAkd2hlcmUgKG5vdCBjb25maWRlbnQgdGhhdCB3ZSBwcm92aWRlIHRoZSBzYW1lIEpTIGVudmlyb25tZW50XG4gIC8vICAgICAgICAgICAgIGFzIE1vbmdvLCBhbmQgY2FuIHlpZWxkISlcbiAgLy8gICAtICRuZWFyIChoYXMgXCJpbnRlcmVzdGluZ1wiIHByb3BlcnRpZXMgaW4gTW9uZ29EQiwgbGlrZSB0aGUgcG9zc2liaWxpdHlcbiAgLy8gICAgICAgICAgICBvZiByZXR1cm5pbmcgYW4gSUQgbXVsdGlwbGUgdGltZXMsIHRob3VnaCBldmVuIHBvbGxpbmcgbWF5YmVcbiAgLy8gICAgICAgICAgICBoYXZlIGEgYnVnIHRoZXJlKVxuICAvLyAgICAgICAgICAgWFhYOiBvbmNlIHdlIHN1cHBvcnQgaXQsIHdlIHdvdWxkIG5lZWQgdG8gdGhpbmsgbW9yZSBvbiBob3cgd2VcbiAgLy8gICAgICAgICAgIGluaXRpYWxpemUgdGhlIGNvbXBhcmF0b3JzIHdoZW4gd2UgY3JlYXRlIHRoZSBkcml2ZXIuXG4gIHJldHVybiAhbWF0Y2hlci5oYXNXaGVyZSgpICYmICFtYXRjaGVyLmhhc0dlb1F1ZXJ5KCk7XG59O1xuXG52YXIgbW9kaWZpZXJDYW5CZURpcmVjdGx5QXBwbGllZCA9IGZ1bmN0aW9uIChtb2RpZmllcikge1xuICByZXR1cm4gXy5hbGwobW9kaWZpZXIsIGZ1bmN0aW9uIChmaWVsZHMsIG9wZXJhdGlvbikge1xuICAgIHJldHVybiBfLmFsbChmaWVsZHMsIGZ1bmN0aW9uICh2YWx1ZSwgZmllbGQpIHtcbiAgICAgIHJldHVybiAhL0VKU09OXFwkLy50ZXN0KGZpZWxkKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5Nb25nb0ludGVybmFscy5PcGxvZ09ic2VydmVEcml2ZXIgPSBPcGxvZ09ic2VydmVEcml2ZXI7XG4iLCIvLyBzaW5nbGV0b25cbmV4cG9ydCBjb25zdCBMb2NhbENvbGxlY3Rpb25Ecml2ZXIgPSBuZXcgKGNsYXNzIExvY2FsQ29sbGVjdGlvbkRyaXZlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMubm9Db25uQ29sbGVjdGlvbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB9XG5cbiAgb3BlbihuYW1lLCBjb25uKSB7XG4gICAgaWYgKCEgbmFtZSkge1xuICAgICAgcmV0dXJuIG5ldyBMb2NhbENvbGxlY3Rpb247XG4gICAgfVxuXG4gICAgaWYgKCEgY29ubikge1xuICAgICAgcmV0dXJuIGVuc3VyZUNvbGxlY3Rpb24obmFtZSwgdGhpcy5ub0Nvbm5Db2xsZWN0aW9ucyk7XG4gICAgfVxuXG4gICAgaWYgKCEgY29ubi5fbW9uZ29fbGl2ZWRhdGFfY29sbGVjdGlvbnMpIHtcbiAgICAgIGNvbm4uX21vbmdvX2xpdmVkYXRhX2NvbGxlY3Rpb25zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICB9XG5cbiAgICAvLyBYWFggaXMgdGhlcmUgYSB3YXkgdG8ga2VlcCB0cmFjayBvZiBhIGNvbm5lY3Rpb24ncyBjb2xsZWN0aW9ucyB3aXRob3V0XG4gICAgLy8gZGFuZ2xpbmcgaXQgb2ZmIHRoZSBjb25uZWN0aW9uIG9iamVjdD9cbiAgICByZXR1cm4gZW5zdXJlQ29sbGVjdGlvbihuYW1lLCBjb25uLl9tb25nb19saXZlZGF0YV9jb2xsZWN0aW9ucyk7XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBlbnN1cmVDb2xsZWN0aW9uKG5hbWUsIGNvbGxlY3Rpb25zKSB7XG4gIHJldHVybiAobmFtZSBpbiBjb2xsZWN0aW9ucylcbiAgICA/IGNvbGxlY3Rpb25zW25hbWVdXG4gICAgOiBjb2xsZWN0aW9uc1tuYW1lXSA9IG5ldyBMb2NhbENvbGxlY3Rpb24obmFtZSk7XG59XG4iLCJNb25nb0ludGVybmFscy5SZW1vdGVDb2xsZWN0aW9uRHJpdmVyID0gZnVuY3Rpb24gKFxuICBtb25nb191cmwsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLm1vbmdvID0gbmV3IE1vbmdvQ29ubmVjdGlvbihtb25nb191cmwsIG9wdGlvbnMpO1xufTtcblxuXy5leHRlbmQoTW9uZ29JbnRlcm5hbHMuUmVtb3RlQ29sbGVjdGlvbkRyaXZlci5wcm90b3R5cGUsIHtcbiAgb3BlbjogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJldCA9IHt9O1xuICAgIF8uZWFjaChcbiAgICAgIFsnZmluZCcsICdmaW5kT25lJywgJ2luc2VydCcsICd1cGRhdGUnLCAndXBzZXJ0JyxcbiAgICAgICAncmVtb3ZlJywgJ19lbnN1cmVJbmRleCcsICdfZHJvcEluZGV4JywgJ19jcmVhdGVDYXBwZWRDb2xsZWN0aW9uJyxcbiAgICAgICAnZHJvcENvbGxlY3Rpb24nLCAncmF3Q29sbGVjdGlvbiddLFxuICAgICAgZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgcmV0W21dID0gXy5iaW5kKHNlbGYubW9uZ29bbV0sIHNlbGYubW9uZ28sIG5hbWUpO1xuICAgICAgfSk7XG4gICAgcmV0dXJuIHJldDtcbiAgfVxufSk7XG5cblxuLy8gQ3JlYXRlIHRoZSBzaW5nbGV0b24gUmVtb3RlQ29sbGVjdGlvbkRyaXZlciBvbmx5IG9uIGRlbWFuZCwgc28gd2Vcbi8vIG9ubHkgcmVxdWlyZSBNb25nbyBjb25maWd1cmF0aW9uIGlmIGl0J3MgYWN0dWFsbHkgdXNlZCAoZWcsIG5vdCBpZlxuLy8geW91J3JlIG9ubHkgdHJ5aW5nIHRvIHJlY2VpdmUgZGF0YSBmcm9tIGEgcmVtb3RlIEREUCBzZXJ2ZXIuKVxuTW9uZ29JbnRlcm5hbHMuZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIgPSBfLm9uY2UoZnVuY3Rpb24gKCkge1xuICB2YXIgY29ubmVjdGlvbk9wdGlvbnMgPSB7fTtcblxuICB2YXIgbW9uZ29VcmwgPSBwcm9jZXNzLmVudi5NT05HT19VUkw7XG5cbiAgaWYgKHByb2Nlc3MuZW52Lk1PTkdPX09QTE9HX1VSTCkge1xuICAgIGNvbm5lY3Rpb25PcHRpb25zLm9wbG9nVXJsID0gcHJvY2Vzcy5lbnYuTU9OR09fT1BMT0dfVVJMO1xuICB9XG5cbiAgaWYgKCEgbW9uZ29VcmwpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTU9OR09fVVJMIG11c3QgYmUgc2V0IGluIGVudmlyb25tZW50XCIpO1xuXG4gIHJldHVybiBuZXcgTW9uZ29JbnRlcm5hbHMuUmVtb3RlQ29sbGVjdGlvbkRyaXZlcihtb25nb1VybCwgY29ubmVjdGlvbk9wdGlvbnMpO1xufSk7XG4iLCIvLyBvcHRpb25zLmNvbm5lY3Rpb24sIGlmIGdpdmVuLCBpcyBhIExpdmVkYXRhQ2xpZW50IG9yIExpdmVkYXRhU2VydmVyXG4vLyBYWFggcHJlc2VudGx5IHRoZXJlIGlzIG5vIHdheSB0byBkZXN0cm95L2NsZWFuIHVwIGEgQ29sbGVjdGlvblxuXG4vKipcbiAqIEBzdW1tYXJ5IE5hbWVzcGFjZSBmb3IgTW9uZ29EQi1yZWxhdGVkIGl0ZW1zXG4gKiBAbmFtZXNwYWNlXG4gKi9cbk1vbmdvID0ge307XG5cbi8qKlxuICogQHN1bW1hcnkgQ29uc3RydWN0b3IgZm9yIGEgQ29sbGVjdGlvblxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAaW5zdGFuY2VuYW1lIGNvbGxlY3Rpb25cbiAqIEBjbGFzc1xuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24uICBJZiBudWxsLCBjcmVhdGVzIGFuIHVubWFuYWdlZCAodW5zeW5jaHJvbml6ZWQpIGxvY2FsIGNvbGxlY3Rpb24uXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucy5jb25uZWN0aW9uIFRoZSBzZXJ2ZXIgY29ubmVjdGlvbiB0aGF0IHdpbGwgbWFuYWdlIHRoaXMgY29sbGVjdGlvbi4gVXNlcyB0aGUgZGVmYXVsdCBjb25uZWN0aW9uIGlmIG5vdCBzcGVjaWZpZWQuICBQYXNzIHRoZSByZXR1cm4gdmFsdWUgb2YgY2FsbGluZyBbYEREUC5jb25uZWN0YF0oI2RkcF9jb25uZWN0KSB0byBzcGVjaWZ5IGEgZGlmZmVyZW50IHNlcnZlci4gUGFzcyBgbnVsbGAgdG8gc3BlY2lmeSBubyBjb25uZWN0aW9uLiBVbm1hbmFnZWQgKGBuYW1lYCBpcyBudWxsKSBjb2xsZWN0aW9ucyBjYW5ub3Qgc3BlY2lmeSBhIGNvbm5lY3Rpb24uXG4gKiBAcGFyYW0ge1N0cmluZ30gb3B0aW9ucy5pZEdlbmVyYXRpb24gVGhlIG1ldGhvZCBvZiBnZW5lcmF0aW5nIHRoZSBgX2lkYCBmaWVsZHMgb2YgbmV3IGRvY3VtZW50cyBpbiB0aGlzIGNvbGxlY3Rpb24uICBQb3NzaWJsZSB2YWx1ZXM6XG5cbiAtICoqYCdTVFJJTkcnYCoqOiByYW5kb20gc3RyaW5nc1xuIC0gKipgJ01PTkdPJ2AqKjogIHJhbmRvbSBbYE1vbmdvLk9iamVjdElEYF0oI21vbmdvX29iamVjdF9pZCkgdmFsdWVzXG5cblRoZSBkZWZhdWx0IGlkIGdlbmVyYXRpb24gdGVjaG5pcXVlIGlzIGAnU1RSSU5HJ2AuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLnRyYW5zZm9ybSBBbiBvcHRpb25hbCB0cmFuc2Zvcm1hdGlvbiBmdW5jdGlvbi4gRG9jdW1lbnRzIHdpbGwgYmUgcGFzc2VkIHRocm91Z2ggdGhpcyBmdW5jdGlvbiBiZWZvcmUgYmVpbmcgcmV0dXJuZWQgZnJvbSBgZmV0Y2hgIG9yIGBmaW5kT25lYCwgYW5kIGJlZm9yZSBiZWluZyBwYXNzZWQgdG8gY2FsbGJhY2tzIG9mIGBvYnNlcnZlYCwgYG1hcGAsIGBmb3JFYWNoYCwgYGFsbG93YCwgYW5kIGBkZW55YC4gVHJhbnNmb3JtcyBhcmUgKm5vdCogYXBwbGllZCBmb3IgdGhlIGNhbGxiYWNrcyBvZiBgb2JzZXJ2ZUNoYW5nZXNgIG9yIHRvIGN1cnNvcnMgcmV0dXJuZWQgZnJvbSBwdWJsaXNoIGZ1bmN0aW9ucy5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5kZWZpbmVNdXRhdGlvbk1ldGhvZHMgU2V0IHRvIGBmYWxzZWAgdG8gc2tpcCBzZXR0aW5nIHVwIHRoZSBtdXRhdGlvbiBtZXRob2RzIHRoYXQgZW5hYmxlIGluc2VydC91cGRhdGUvcmVtb3ZlIGZyb20gY2xpZW50IGNvZGUuIERlZmF1bHQgYHRydWVgLlxuICovXG5Nb25nby5Db2xsZWN0aW9uID0gZnVuY3Rpb24gQ29sbGVjdGlvbihuYW1lLCBvcHRpb25zKSB7XG4gIGlmICghbmFtZSAmJiAobmFtZSAhPT0gbnVsbCkpIHtcbiAgICBNZXRlb3IuX2RlYnVnKFwiV2FybmluZzogY3JlYXRpbmcgYW5vbnltb3VzIGNvbGxlY3Rpb24uIEl0IHdpbGwgbm90IGJlIFwiICtcbiAgICAgICAgICAgICAgICAgIFwic2F2ZWQgb3Igc3luY2hyb25pemVkIG92ZXIgdGhlIG5ldHdvcmsuIChQYXNzIG51bGwgZm9yIFwiICtcbiAgICAgICAgICAgICAgICAgIFwidGhlIGNvbGxlY3Rpb24gbmFtZSB0byB0dXJuIG9mZiB0aGlzIHdhcm5pbmcuKVwiKTtcbiAgICBuYW1lID0gbnVsbDtcbiAgfVxuXG4gIGlmIChuYW1lICE9PSBudWxsICYmIHR5cGVvZiBuYW1lICE9PSBcInN0cmluZ1wiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgXCJGaXJzdCBhcmd1bWVudCB0byBuZXcgTW9uZ28uQ29sbGVjdGlvbiBtdXN0IGJlIGEgc3RyaW5nIG9yIG51bGxcIik7XG4gIH1cblxuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLm1ldGhvZHMpIHtcbiAgICAvLyBCYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBoYWNrIHdpdGggb3JpZ2luYWwgc2lnbmF0dXJlICh3aGljaCBwYXNzZWRcbiAgICAvLyBcImNvbm5lY3Rpb25cIiBkaXJlY3RseSBpbnN0ZWFkIG9mIGluIG9wdGlvbnMuIChDb25uZWN0aW9ucyBtdXN0IGhhdmUgYSBcIm1ldGhvZHNcIlxuICAgIC8vIG1ldGhvZC4pXG4gICAgLy8gWFhYIHJlbW92ZSBiZWZvcmUgMS4wXG4gICAgb3B0aW9ucyA9IHtjb25uZWN0aW9uOiBvcHRpb25zfTtcbiAgfVxuICAvLyBCYWNrd2FyZHMgY29tcGF0aWJpbGl0eTogXCJjb25uZWN0aW9uXCIgdXNlZCB0byBiZSBjYWxsZWQgXCJtYW5hZ2VyXCIuXG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMubWFuYWdlciAmJiAhb3B0aW9ucy5jb25uZWN0aW9uKSB7XG4gICAgb3B0aW9ucy5jb25uZWN0aW9uID0gb3B0aW9ucy5tYW5hZ2VyO1xuICB9XG5cbiAgb3B0aW9ucyA9IHtcbiAgICBjb25uZWN0aW9uOiB1bmRlZmluZWQsXG4gICAgaWRHZW5lcmF0aW9uOiAnU1RSSU5HJyxcbiAgICB0cmFuc2Zvcm06IG51bGwsXG4gICAgX2RyaXZlcjogdW5kZWZpbmVkLFxuICAgIF9wcmV2ZW50QXV0b3B1Ymxpc2g6IGZhbHNlLFxuICAgICAgLi4ub3B0aW9ucyxcbiAgfTtcblxuICBzd2l0Y2ggKG9wdGlvbnMuaWRHZW5lcmF0aW9uKSB7XG4gIGNhc2UgJ01PTkdPJzpcbiAgICB0aGlzLl9tYWtlTmV3SUQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgc3JjID0gbmFtZSA/IEREUC5yYW5kb21TdHJlYW0oJy9jb2xsZWN0aW9uLycgKyBuYW1lKSA6IFJhbmRvbS5pbnNlY3VyZTtcbiAgICAgIHJldHVybiBuZXcgTW9uZ28uT2JqZWN0SUQoc3JjLmhleFN0cmluZygyNCkpO1xuICAgIH07XG4gICAgYnJlYWs7XG4gIGNhc2UgJ1NUUklORyc6XG4gIGRlZmF1bHQ6XG4gICAgdGhpcy5fbWFrZU5ld0lEID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHNyYyA9IG5hbWUgPyBERFAucmFuZG9tU3RyZWFtKCcvY29sbGVjdGlvbi8nICsgbmFtZSkgOiBSYW5kb20uaW5zZWN1cmU7XG4gICAgICByZXR1cm4gc3JjLmlkKCk7XG4gICAgfTtcbiAgICBicmVhaztcbiAgfVxuXG4gIHRoaXMuX3RyYW5zZm9ybSA9IExvY2FsQ29sbGVjdGlvbi53cmFwVHJhbnNmb3JtKG9wdGlvbnMudHJhbnNmb3JtKTtcblxuICBpZiAoISBuYW1lIHx8IG9wdGlvbnMuY29ubmVjdGlvbiA9PT0gbnVsbClcbiAgICAvLyBub3RlOiBuYW1lbGVzcyBjb2xsZWN0aW9ucyBuZXZlciBoYXZlIGEgY29ubmVjdGlvblxuICAgIHRoaXMuX2Nvbm5lY3Rpb24gPSBudWxsO1xuICBlbHNlIGlmIChvcHRpb25zLmNvbm5lY3Rpb24pXG4gICAgdGhpcy5fY29ubmVjdGlvbiA9IG9wdGlvbnMuY29ubmVjdGlvbjtcbiAgZWxzZSBpZiAoTWV0ZW9yLmlzQ2xpZW50KVxuICAgIHRoaXMuX2Nvbm5lY3Rpb24gPSBNZXRlb3IuY29ubmVjdGlvbjtcbiAgZWxzZVxuICAgIHRoaXMuX2Nvbm5lY3Rpb24gPSBNZXRlb3Iuc2VydmVyO1xuXG4gIGlmICghb3B0aW9ucy5fZHJpdmVyKSB7XG4gICAgLy8gWFhYIFRoaXMgY2hlY2sgYXNzdW1lcyB0aGF0IHdlYmFwcCBpcyBsb2FkZWQgc28gdGhhdCBNZXRlb3Iuc2VydmVyICE9PVxuICAgIC8vIG51bGwuIFdlIHNob3VsZCBmdWxseSBzdXBwb3J0IHRoZSBjYXNlIG9mIFwid2FudCB0byB1c2UgYSBNb25nby1iYWNrZWRcbiAgICAvLyBjb2xsZWN0aW9uIGZyb20gTm9kZSBjb2RlIHdpdGhvdXQgd2ViYXBwXCIsIGJ1dCB3ZSBkb24ndCB5ZXQuXG4gICAgLy8gI01ldGVvclNlcnZlck51bGxcbiAgICBpZiAobmFtZSAmJiB0aGlzLl9jb25uZWN0aW9uID09PSBNZXRlb3Iuc2VydmVyICYmXG4gICAgICAgIHR5cGVvZiBNb25nb0ludGVybmFscyAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgICAgICBNb25nb0ludGVybmFscy5kZWZhdWx0UmVtb3RlQ29sbGVjdGlvbkRyaXZlcikge1xuICAgICAgb3B0aW9ucy5fZHJpdmVyID0gTW9uZ29JbnRlcm5hbHMuZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgeyBMb2NhbENvbGxlY3Rpb25Ecml2ZXIgfSA9XG4gICAgICAgIHJlcXVpcmUoXCIuL2xvY2FsX2NvbGxlY3Rpb25fZHJpdmVyLmpzXCIpO1xuICAgICAgb3B0aW9ucy5fZHJpdmVyID0gTG9jYWxDb2xsZWN0aW9uRHJpdmVyO1xuICAgIH1cbiAgfVxuXG4gIHRoaXMuX2NvbGxlY3Rpb24gPSBvcHRpb25zLl9kcml2ZXIub3BlbihuYW1lLCB0aGlzLl9jb25uZWN0aW9uKTtcbiAgdGhpcy5fbmFtZSA9IG5hbWU7XG4gIHRoaXMuX2RyaXZlciA9IG9wdGlvbnMuX2RyaXZlcjtcblxuICB0aGlzLl9tYXliZVNldFVwUmVwbGljYXRpb24obmFtZSwgb3B0aW9ucyk7XG5cbiAgLy8gWFhYIGRvbid0IGRlZmluZSB0aGVzZSB1bnRpbCBhbGxvdyBvciBkZW55IGlzIGFjdHVhbGx5IHVzZWQgZm9yIHRoaXNcbiAgLy8gY29sbGVjdGlvbi4gQ291bGQgYmUgaGFyZCBpZiB0aGUgc2VjdXJpdHkgcnVsZXMgYXJlIG9ubHkgZGVmaW5lZCBvbiB0aGVcbiAgLy8gc2VydmVyLlxuICBpZiAob3B0aW9ucy5kZWZpbmVNdXRhdGlvbk1ldGhvZHMgIT09IGZhbHNlKSB7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuX2RlZmluZU11dGF0aW9uTWV0aG9kcyh7XG4gICAgICAgIHVzZUV4aXN0aW5nOiBvcHRpb25zLl9zdXBwcmVzc1NhbWVOYW1lRXJyb3IgPT09IHRydWVcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBUaHJvdyBhIG1vcmUgdW5kZXJzdGFuZGFibGUgZXJyb3Igb24gdGhlIHNlcnZlciBmb3Igc2FtZSBjb2xsZWN0aW9uIG5hbWVcbiAgICAgIGlmIChlcnJvci5tZXNzYWdlID09PSBgQSBtZXRob2QgbmFtZWQgJy8ke25hbWV9L2luc2VydCcgaXMgYWxyZWFkeSBkZWZpbmVkYClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGVyZSBpcyBhbHJlYWR5IGEgY29sbGVjdGlvbiBuYW1lZCBcIiR7bmFtZX1cImApO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgLy8gYXV0b3B1Ymxpc2hcbiAgaWYgKFBhY2thZ2UuYXV0b3B1Ymxpc2ggJiZcbiAgICAgICEgb3B0aW9ucy5fcHJldmVudEF1dG9wdWJsaXNoICYmXG4gICAgICB0aGlzLl9jb25uZWN0aW9uICYmXG4gICAgICB0aGlzLl9jb25uZWN0aW9uLnB1Ymxpc2gpIHtcbiAgICB0aGlzLl9jb25uZWN0aW9uLnB1Ymxpc2gobnVsbCwgKCkgPT4gdGhpcy5maW5kKCksIHtcbiAgICAgIGlzX2F1dG86IHRydWUsXG4gICAgfSk7XG4gIH1cbn07XG5cbk9iamVjdC5hc3NpZ24oTW9uZ28uQ29sbGVjdGlvbi5wcm90b3R5cGUsIHtcbiAgX21heWJlU2V0VXBSZXBsaWNhdGlvbihuYW1lLCB7XG4gICAgX3N1cHByZXNzU2FtZU5hbWVFcnJvciA9IGZhbHNlXG4gIH0pIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBpZiAoISAoc2VsZi5fY29ubmVjdGlvbiAmJlxuICAgICAgICAgICBzZWxmLl9jb25uZWN0aW9uLnJlZ2lzdGVyU3RvcmUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gT0ssIHdlJ3JlIGdvaW5nIHRvIGJlIGEgc2xhdmUsIHJlcGxpY2F0aW5nIHNvbWUgcmVtb3RlXG4gICAgLy8gZGF0YWJhc2UsIGV4Y2VwdCBwb3NzaWJseSB3aXRoIHNvbWUgdGVtcG9yYXJ5IGRpdmVyZ2VuY2Ugd2hpbGVcbiAgICAvLyB3ZSBoYXZlIHVuYWNrbm93bGVkZ2VkIFJQQydzLlxuICAgIGNvbnN0IG9rID0gc2VsZi5fY29ubmVjdGlvbi5yZWdpc3RlclN0b3JlKG5hbWUsIHtcbiAgICAgIC8vIENhbGxlZCBhdCB0aGUgYmVnaW5uaW5nIG9mIGEgYmF0Y2ggb2YgdXBkYXRlcy4gYmF0Y2hTaXplIGlzIHRoZSBudW1iZXJcbiAgICAgIC8vIG9mIHVwZGF0ZSBjYWxscyB0byBleHBlY3QuXG4gICAgICAvL1xuICAgICAgLy8gWFhYIFRoaXMgaW50ZXJmYWNlIGlzIHByZXR0eSBqYW5reS4gcmVzZXQgcHJvYmFibHkgb3VnaHQgdG8gZ28gYmFjayB0b1xuICAgICAgLy8gYmVpbmcgaXRzIG93biBmdW5jdGlvbiwgYW5kIGNhbGxlcnMgc2hvdWxkbid0IGhhdmUgdG8gY2FsY3VsYXRlXG4gICAgICAvLyBiYXRjaFNpemUuIFRoZSBvcHRpbWl6YXRpb24gb2Ygbm90IGNhbGxpbmcgcGF1c2UvcmVtb3ZlIHNob3VsZCBiZVxuICAgICAgLy8gZGVsYXllZCB1bnRpbCBsYXRlcjogdGhlIGZpcnN0IGNhbGwgdG8gdXBkYXRlKCkgc2hvdWxkIGJ1ZmZlciBpdHNcbiAgICAgIC8vIG1lc3NhZ2UsIGFuZCB0aGVuIHdlIGNhbiBlaXRoZXIgZGlyZWN0bHkgYXBwbHkgaXQgYXQgZW5kVXBkYXRlIHRpbWUgaWZcbiAgICAgIC8vIGl0IHdhcyB0aGUgb25seSB1cGRhdGUsIG9yIGRvIHBhdXNlT2JzZXJ2ZXJzL2FwcGx5L2FwcGx5IGF0IHRoZSBuZXh0XG4gICAgICAvLyB1cGRhdGUoKSBpZiB0aGVyZSdzIGFub3RoZXIgb25lLlxuICAgICAgYmVnaW5VcGRhdGUoYmF0Y2hTaXplLCByZXNldCkge1xuICAgICAgICAvLyBwYXVzZSBvYnNlcnZlcnMgc28gdXNlcnMgZG9uJ3Qgc2VlIGZsaWNrZXIgd2hlbiB1cGRhdGluZyBzZXZlcmFsXG4gICAgICAgIC8vIG9iamVjdHMgYXQgb25jZSAoaW5jbHVkaW5nIHRoZSBwb3N0LXJlY29ubmVjdCByZXNldC1hbmQtcmVhcHBseVxuICAgICAgICAvLyBzdGFnZSksIGFuZCBzbyB0aGF0IGEgcmUtc29ydGluZyBvZiBhIHF1ZXJ5IGNhbiB0YWtlIGFkdmFudGFnZSBvZiB0aGVcbiAgICAgICAgLy8gZnVsbCBfZGlmZlF1ZXJ5IG1vdmVkIGNhbGN1bGF0aW9uIGluc3RlYWQgb2YgYXBwbHlpbmcgY2hhbmdlIG9uZSBhdCBhXG4gICAgICAgIC8vIHRpbWUuXG4gICAgICAgIGlmIChiYXRjaFNpemUgPiAxIHx8IHJlc2V0KVxuICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24ucGF1c2VPYnNlcnZlcnMoKTtcblxuICAgICAgICBpZiAocmVzZXQpXG4gICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5yZW1vdmUoe30pO1xuICAgICAgfSxcblxuICAgICAgLy8gQXBwbHkgYW4gdXBkYXRlLlxuICAgICAgLy8gWFhYIGJldHRlciBzcGVjaWZ5IHRoaXMgaW50ZXJmYWNlIChub3QgaW4gdGVybXMgb2YgYSB3aXJlIG1lc3NhZ2UpP1xuICAgICAgdXBkYXRlKG1zZykge1xuICAgICAgICB2YXIgbW9uZ29JZCA9IE1vbmdvSUQuaWRQYXJzZShtc2cuaWQpO1xuICAgICAgICB2YXIgZG9jID0gc2VsZi5fY29sbGVjdGlvbi5maW5kT25lKG1vbmdvSWQpO1xuXG4gICAgICAgIC8vIElzIHRoaXMgYSBcInJlcGxhY2UgdGhlIHdob2xlIGRvY1wiIG1lc3NhZ2UgY29taW5nIGZyb20gdGhlIHF1aWVzY2VuY2VcbiAgICAgICAgLy8gb2YgbWV0aG9kIHdyaXRlcyB0byBhbiBvYmplY3Q/IChOb3RlIHRoYXQgJ3VuZGVmaW5lZCcgaXMgYSB2YWxpZFxuICAgICAgICAvLyB2YWx1ZSBtZWFuaW5nIFwicmVtb3ZlIGl0XCIuKVxuICAgICAgICBpZiAobXNnLm1zZyA9PT0gJ3JlcGxhY2UnKSB7XG4gICAgICAgICAgdmFyIHJlcGxhY2UgPSBtc2cucmVwbGFjZTtcbiAgICAgICAgICBpZiAoIXJlcGxhY2UpIHtcbiAgICAgICAgICAgIGlmIChkb2MpXG4gICAgICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24ucmVtb3ZlKG1vbmdvSWQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoIWRvYykge1xuICAgICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5pbnNlcnQocmVwbGFjZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFhYWCBjaGVjayB0aGF0IHJlcGxhY2UgaGFzIG5vICQgb3BzXG4gICAgICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLnVwZGF0ZShtb25nb0lkLCByZXBsYWNlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2UgaWYgKG1zZy5tc2cgPT09ICdhZGRlZCcpIHtcbiAgICAgICAgICBpZiAoZG9jKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCBub3QgdG8gZmluZCBhIGRvY3VtZW50IGFscmVhZHkgcHJlc2VudCBmb3IgYW4gYWRkXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLmluc2VydCh7IF9pZDogbW9uZ29JZCwgLi4ubXNnLmZpZWxkcyB9KTtcbiAgICAgICAgfSBlbHNlIGlmIChtc2cubXNnID09PSAncmVtb3ZlZCcpIHtcbiAgICAgICAgICBpZiAoIWRvYylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGVkIHRvIGZpbmQgYSBkb2N1bWVudCBhbHJlYWR5IHByZXNlbnQgZm9yIHJlbW92ZWRcIik7XG4gICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5yZW1vdmUobW9uZ29JZCk7XG4gICAgICAgIH0gZWxzZSBpZiAobXNnLm1zZyA9PT0gJ2NoYW5nZWQnKSB7XG4gICAgICAgICAgaWYgKCFkb2MpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCB0byBmaW5kIGEgZG9jdW1lbnQgdG8gY2hhbmdlXCIpO1xuICAgICAgICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhtc2cuZmllbGRzKTtcbiAgICAgICAgICBpZiAoa2V5cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YXIgbW9kaWZpZXIgPSB7fTtcbiAgICAgICAgICAgIGtleXMuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IG1zZy5maWVsZHNba2V5XTtcbiAgICAgICAgICAgICAgaWYgKEVKU09OLmVxdWFscyhkb2Nba2V5XSwgdmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1vZGlmaWVyLiR1bnNldCkge1xuICAgICAgICAgICAgICAgICAgbW9kaWZpZXIuJHVuc2V0ID0ge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1vZGlmaWVyLiR1bnNldFtrZXldID0gMTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1vZGlmaWVyLiRzZXQpIHtcbiAgICAgICAgICAgICAgICAgIG1vZGlmaWVyLiRzZXQgPSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbW9kaWZpZXIuJHNldFtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKE9iamVjdC5rZXlzKG1vZGlmaWVyKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24udXBkYXRlKG1vbmdvSWQsIG1vZGlmaWVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSSBkb24ndCBrbm93IGhvdyB0byBkZWFsIHdpdGggdGhpcyBtZXNzYWdlXCIpO1xuICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICAvLyBDYWxsZWQgYXQgdGhlIGVuZCBvZiBhIGJhdGNoIG9mIHVwZGF0ZXMuXG4gICAgICBlbmRVcGRhdGUoKSB7XG4gICAgICAgIHNlbGYuX2NvbGxlY3Rpb24ucmVzdW1lT2JzZXJ2ZXJzKCk7XG4gICAgICB9LFxuXG4gICAgICAvLyBDYWxsZWQgYXJvdW5kIG1ldGhvZCBzdHViIGludm9jYXRpb25zIHRvIGNhcHR1cmUgdGhlIG9yaWdpbmFsIHZlcnNpb25zXG4gICAgICAvLyBvZiBtb2RpZmllZCBkb2N1bWVudHMuXG4gICAgICBzYXZlT3JpZ2luYWxzKCkge1xuICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLnNhdmVPcmlnaW5hbHMoKTtcbiAgICAgIH0sXG4gICAgICByZXRyaWV2ZU9yaWdpbmFscygpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuX2NvbGxlY3Rpb24ucmV0cmlldmVPcmlnaW5hbHMoKTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIFVzZWQgdG8gcHJlc2VydmUgY3VycmVudCB2ZXJzaW9ucyBvZiBkb2N1bWVudHMgYWNyb3NzIGEgc3RvcmUgcmVzZXQuXG4gICAgICBnZXREb2MoaWQpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuZmluZE9uZShpZCk7XG4gICAgICB9LFxuXG4gICAgICAvLyBUbyBiZSBhYmxlIHRvIGdldCBiYWNrIHRvIHRoZSBjb2xsZWN0aW9uIGZyb20gdGhlIHN0b3JlLlxuICAgICAgX2dldENvbGxlY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKCEgb2spIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgVGhlcmUgaXMgYWxyZWFkeSBhIGNvbGxlY3Rpb24gbmFtZWQgXCIke25hbWV9XCJgO1xuICAgICAgaWYgKF9zdXBwcmVzc1NhbWVOYW1lRXJyb3IgPT09IHRydWUpIHtcbiAgICAgICAgLy8gWFhYIEluIHRoZW9yeSB3ZSBkbyBub3QgaGF2ZSB0byB0aHJvdyB3aGVuIGBva2AgaXMgZmFsc3kuIFRoZVxuICAgICAgICAvLyBzdG9yZSBpcyBhbHJlYWR5IGRlZmluZWQgZm9yIHRoaXMgY29sbGVjdGlvbiBuYW1lLCBidXQgdGhpc1xuICAgICAgICAvLyB3aWxsIHNpbXBseSBiZSBhbm90aGVyIHJlZmVyZW5jZSB0byBpdCBhbmQgZXZlcnl0aGluZyBzaG91bGRcbiAgICAgICAgLy8gd29yay4gSG93ZXZlciwgd2UgaGF2ZSBoaXN0b3JpY2FsbHkgdGhyb3duIGFuIGVycm9yIGhlcmUsIHNvXG4gICAgICAgIC8vIGZvciBub3cgd2Ugd2lsbCBza2lwIHRoZSBlcnJvciBvbmx5IHdoZW4gX3N1cHByZXNzU2FtZU5hbWVFcnJvclxuICAgICAgICAvLyBpcyBgdHJ1ZWAsIGFsbG93aW5nIHBlb3BsZSB0byBvcHQgaW4gYW5kIGdpdmUgdGhpcyBzb21lIHJlYWxcbiAgICAgICAgLy8gd29ybGQgdGVzdGluZy5cbiAgICAgICAgY29uc29sZS53YXJuID8gY29uc29sZS53YXJuKG1lc3NhZ2UpIDogY29uc29sZS5sb2cobWVzc2FnZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8vL1xuICAvLy8gTWFpbiBjb2xsZWN0aW9uIEFQSVxuICAvLy9cblxuICBfZ2V0RmluZFNlbGVjdG9yKGFyZ3MpIHtcbiAgICBpZiAoYXJncy5sZW5ndGggPT0gMClcbiAgICAgIHJldHVybiB7fTtcbiAgICBlbHNlXG4gICAgICByZXR1cm4gYXJnc1swXTtcbiAgfSxcblxuICBfZ2V0RmluZE9wdGlvbnMoYXJncykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoYXJncy5sZW5ndGggPCAyKSB7XG4gICAgICByZXR1cm4geyB0cmFuc2Zvcm06IHNlbGYuX3RyYW5zZm9ybSB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBjaGVjayhhcmdzWzFdLCBNYXRjaC5PcHRpb25hbChNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuICAgICAgICBmaWVsZHM6IE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKE9iamVjdCwgdW5kZWZpbmVkKSksXG4gICAgICAgIHNvcnQ6IE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKE9iamVjdCwgQXJyYXksIEZ1bmN0aW9uLCB1bmRlZmluZWQpKSxcbiAgICAgICAgbGltaXQ6IE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKE51bWJlciwgdW5kZWZpbmVkKSksXG4gICAgICAgIHNraXA6IE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKE51bWJlciwgdW5kZWZpbmVkKSlcbiAgICAgIH0pKSk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyYW5zZm9ybTogc2VsZi5fdHJhbnNmb3JtLFxuICAgICAgICAuLi5hcmdzWzFdLFxuICAgICAgfTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEZpbmQgdGhlIGRvY3VtZW50cyBpbiBhIGNvbGxlY3Rpb24gdGhhdCBtYXRjaCB0aGUgc2VsZWN0b3IuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kIGZpbmRcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7TW9uZ29TZWxlY3Rvcn0gW3NlbGVjdG9yXSBBIHF1ZXJ5IGRlc2NyaWJpbmcgdGhlIGRvY3VtZW50cyB0byBmaW5kXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAgICogQHBhcmFtIHtNb25nb1NvcnRTcGVjaWZpZXJ9IG9wdGlvbnMuc29ydCBTb3J0IG9yZGVyIChkZWZhdWx0OiBuYXR1cmFsIG9yZGVyKVxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0aW9ucy5za2lwIE51bWJlciBvZiByZXN1bHRzIHRvIHNraXAgYXQgdGhlIGJlZ2lubmluZ1xuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0aW9ucy5saW1pdCBNYXhpbXVtIG51bWJlciBvZiByZXN1bHRzIHRvIHJldHVyblxuICAgKiBAcGFyYW0ge01vbmdvRmllbGRTcGVjaWZpZXJ9IG9wdGlvbnMuZmllbGRzIERpY3Rpb25hcnkgb2YgZmllbGRzIHRvIHJldHVybiBvciBleGNsdWRlLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMucmVhY3RpdmUgKENsaWVudCBvbmx5KSBEZWZhdWx0IGB0cnVlYDsgcGFzcyBgZmFsc2VgIHRvIGRpc2FibGUgcmVhY3Rpdml0eVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLnRyYW5zZm9ybSBPdmVycmlkZXMgYHRyYW5zZm9ybWAgb24gdGhlICBbYENvbGxlY3Rpb25gXSgjY29sbGVjdGlvbnMpIGZvciB0aGlzIGN1cnNvci4gIFBhc3MgYG51bGxgIHRvIGRpc2FibGUgdHJhbnNmb3JtYXRpb24uXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5kaXNhYmxlT3Bsb2cgKFNlcnZlciBvbmx5KSBQYXNzIHRydWUgdG8gZGlzYWJsZSBvcGxvZy10YWlsaW5nIG9uIHRoaXMgcXVlcnkuIFRoaXMgYWZmZWN0cyB0aGUgd2F5IHNlcnZlciBwcm9jZXNzZXMgY2FsbHMgdG8gYG9ic2VydmVgIG9uIHRoaXMgcXVlcnkuIERpc2FibGluZyB0aGUgb3Bsb2cgY2FuIGJlIHVzZWZ1bCB3aGVuIHdvcmtpbmcgd2l0aCBkYXRhIHRoYXQgdXBkYXRlcyBpbiBsYXJnZSBiYXRjaGVzLlxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0aW9ucy5wb2xsaW5nSW50ZXJ2YWxNcyAoU2VydmVyIG9ubHkpIFdoZW4gb3Bsb2cgaXMgZGlzYWJsZWQgKHRocm91Z2ggdGhlIHVzZSBvZiBgZGlzYWJsZU9wbG9nYCBvciB3aGVuIG90aGVyd2lzZSBub3QgYXZhaWxhYmxlKSwgdGhlIGZyZXF1ZW5jeSAoaW4gbWlsbGlzZWNvbmRzKSBvZiBob3cgb2Z0ZW4gdG8gcG9sbCB0aGlzIHF1ZXJ5IHdoZW4gb2JzZXJ2aW5nIG9uIHRoZSBzZXJ2ZXIuIERlZmF1bHRzIHRvIDEwMDAwbXMgKDEwIHNlY29uZHMpLlxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0aW9ucy5wb2xsaW5nVGhyb3R0bGVNcyAoU2VydmVyIG9ubHkpIFdoZW4gb3Bsb2cgaXMgZGlzYWJsZWQgKHRocm91Z2ggdGhlIHVzZSBvZiBgZGlzYWJsZU9wbG9nYCBvciB3aGVuIG90aGVyd2lzZSBub3QgYXZhaWxhYmxlKSwgdGhlIG1pbmltdW0gdGltZSAoaW4gbWlsbGlzZWNvbmRzKSB0byBhbGxvdyBiZXR3ZWVuIHJlLXBvbGxpbmcgd2hlbiBvYnNlcnZpbmcgb24gdGhlIHNlcnZlci4gSW5jcmVhc2luZyB0aGlzIHdpbGwgc2F2ZSBDUFUgYW5kIG1vbmdvIGxvYWQgYXQgdGhlIGV4cGVuc2Ugb2Ygc2xvd2VyIHVwZGF0ZXMgdG8gdXNlcnMuIERlY3JlYXNpbmcgdGhpcyBpcyBub3QgcmVjb21tZW5kZWQuIERlZmF1bHRzIHRvIDUwbXMuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLm1heFRpbWVNcyAoU2VydmVyIG9ubHkpIElmIHNldCwgaW5zdHJ1Y3RzIE1vbmdvREIgdG8gc2V0IGEgdGltZSBsaW1pdCBmb3IgdGhpcyBjdXJzb3IncyBvcGVyYXRpb25zLiBJZiB0aGUgb3BlcmF0aW9uIHJlYWNoZXMgdGhlIHNwZWNpZmllZCB0aW1lIGxpbWl0IChpbiBtaWxsaXNlY29uZHMpIHdpdGhvdXQgdGhlIGhhdmluZyBiZWVuIGNvbXBsZXRlZCwgYW4gZXhjZXB0aW9uIHdpbGwgYmUgdGhyb3duLiBVc2VmdWwgdG8gcHJldmVudCBhbiAoYWNjaWRlbnRhbCBvciBtYWxpY2lvdXMpIHVub3B0aW1pemVkIHF1ZXJ5IGZyb20gY2F1c2luZyBhIGZ1bGwgY29sbGVjdGlvbiBzY2FuIHRoYXQgd291bGQgZGlzcnVwdCBvdGhlciBkYXRhYmFzZSB1c2VycywgYXQgdGhlIGV4cGVuc2Ugb2YgbmVlZGluZyB0byBoYW5kbGUgdGhlIHJlc3VsdGluZyBlcnJvci5cbiAgICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBvcHRpb25zLmhpbnQgKFNlcnZlciBvbmx5KSBPdmVycmlkZXMgTW9uZ29EQidzIGRlZmF1bHQgaW5kZXggc2VsZWN0aW9uIGFuZCBxdWVyeSBvcHRpbWl6YXRpb24gcHJvY2Vzcy4gU3BlY2lmeSBhbiBpbmRleCB0byBmb3JjZSBpdHMgdXNlLCBlaXRoZXIgYnkgaXRzIG5hbWUgb3IgaW5kZXggc3BlY2lmaWNhdGlvbi4gWW91IGNhbiBhbHNvIHNwZWNpZnkgYHsgJG5hdHVyYWwgOiAxIH1gIHRvIGZvcmNlIGEgZm9yd2FyZHMgY29sbGVjdGlvbiBzY2FuLCBvciBgeyAkbmF0dXJhbCA6IC0xIH1gIGZvciBhIHJldmVyc2UgY29sbGVjdGlvbiBzY2FuLiBTZXR0aW5nIHRoaXMgaXMgb25seSByZWNvbW1lbmRlZCBmb3IgYWR2YW5jZWQgdXNlcnMuXG4gICAqIEByZXR1cm5zIHtNb25nby5DdXJzb3J9XG4gICAqL1xuICBmaW5kKC4uLmFyZ3MpIHtcbiAgICAvLyBDb2xsZWN0aW9uLmZpbmQoKSAocmV0dXJuIGFsbCBkb2NzKSBiZWhhdmVzIGRpZmZlcmVudGx5XG4gICAgLy8gZnJvbSBDb2xsZWN0aW9uLmZpbmQodW5kZWZpbmVkKSAocmV0dXJuIDAgZG9jcykuICBzbyBiZVxuICAgIC8vIGNhcmVmdWwgYWJvdXQgdGhlIGxlbmd0aCBvZiBhcmd1bWVudHMuXG4gICAgcmV0dXJuIHRoaXMuX2NvbGxlY3Rpb24uZmluZChcbiAgICAgIHRoaXMuX2dldEZpbmRTZWxlY3RvcihhcmdzKSxcbiAgICAgIHRoaXMuX2dldEZpbmRPcHRpb25zKGFyZ3MpXG4gICAgKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgRmluZHMgdGhlIGZpcnN0IGRvY3VtZW50IHRoYXQgbWF0Y2hlcyB0aGUgc2VsZWN0b3IsIGFzIG9yZGVyZWQgYnkgc29ydCBhbmQgc2tpcCBvcHRpb25zLiBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIG5vIG1hdGNoaW5nIGRvY3VtZW50IGlzIGZvdW5kLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCBmaW5kT25lXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IFtzZWxlY3Rvcl0gQSBxdWVyeSBkZXNjcmliaW5nIHRoZSBkb2N1bWVudHMgdG8gZmluZFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gICAqIEBwYXJhbSB7TW9uZ29Tb3J0U3BlY2lmaWVyfSBvcHRpb25zLnNvcnQgU29ydCBvcmRlciAoZGVmYXVsdDogbmF0dXJhbCBvcmRlcilcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMuc2tpcCBOdW1iZXIgb2YgcmVzdWx0cyB0byBza2lwIGF0IHRoZSBiZWdpbm5pbmdcbiAgICogQHBhcmFtIHtNb25nb0ZpZWxkU3BlY2lmaWVyfSBvcHRpb25zLmZpZWxkcyBEaWN0aW9uYXJ5IG9mIGZpZWxkcyB0byByZXR1cm4gb3IgZXhjbHVkZS5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnJlYWN0aXZlIChDbGllbnQgb25seSkgRGVmYXVsdCB0cnVlOyBwYXNzIGZhbHNlIHRvIGRpc2FibGUgcmVhY3Rpdml0eVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLnRyYW5zZm9ybSBPdmVycmlkZXMgYHRyYW5zZm9ybWAgb24gdGhlIFtgQ29sbGVjdGlvbmBdKCNjb2xsZWN0aW9ucykgZm9yIHRoaXMgY3Vyc29yLiAgUGFzcyBgbnVsbGAgdG8gZGlzYWJsZSB0cmFuc2Zvcm1hdGlvbi5cbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIGZpbmRPbmUoLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9uLmZpbmRPbmUoXG4gICAgICB0aGlzLl9nZXRGaW5kU2VsZWN0b3IoYXJncyksXG4gICAgICB0aGlzLl9nZXRGaW5kT3B0aW9ucyhhcmdzKVxuICAgICk7XG4gIH1cbn0pO1xuXG5PYmplY3QuYXNzaWduKE1vbmdvLkNvbGxlY3Rpb24sIHtcbiAgX3B1Ymxpc2hDdXJzb3IoY3Vyc29yLCBzdWIsIGNvbGxlY3Rpb24pIHtcbiAgICB2YXIgb2JzZXJ2ZUhhbmRsZSA9IGN1cnNvci5vYnNlcnZlQ2hhbmdlcyh7XG4gICAgICBhZGRlZDogZnVuY3Rpb24gKGlkLCBmaWVsZHMpIHtcbiAgICAgICAgc3ViLmFkZGVkKGNvbGxlY3Rpb24sIGlkLCBmaWVsZHMpO1xuICAgICAgfSxcbiAgICAgIGNoYW5nZWQ6IGZ1bmN0aW9uIChpZCwgZmllbGRzKSB7XG4gICAgICAgIHN1Yi5jaGFuZ2VkKGNvbGxlY3Rpb24sIGlkLCBmaWVsZHMpO1xuICAgICAgfSxcbiAgICAgIHJlbW92ZWQ6IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICBzdWIucmVtb3ZlZChjb2xsZWN0aW9uLCBpZCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBXZSBkb24ndCBjYWxsIHN1Yi5yZWFkeSgpIGhlcmU6IGl0IGdldHMgY2FsbGVkIGluIGxpdmVkYXRhX3NlcnZlciwgYWZ0ZXJcbiAgICAvLyBwb3NzaWJseSBjYWxsaW5nIF9wdWJsaXNoQ3Vyc29yIG9uIG11bHRpcGxlIHJldHVybmVkIGN1cnNvcnMuXG5cbiAgICAvLyByZWdpc3RlciBzdG9wIGNhbGxiYWNrIChleHBlY3RzIGxhbWJkYSB3LyBubyBhcmdzKS5cbiAgICBzdWIub25TdG9wKGZ1bmN0aW9uICgpIHtcbiAgICAgIG9ic2VydmVIYW5kbGUuc3RvcCgpO1xuICAgIH0pO1xuXG4gICAgLy8gcmV0dXJuIHRoZSBvYnNlcnZlSGFuZGxlIGluIGNhc2UgaXQgbmVlZHMgdG8gYmUgc3RvcHBlZCBlYXJseVxuICAgIHJldHVybiBvYnNlcnZlSGFuZGxlO1xuICB9LFxuXG4gIC8vIHByb3RlY3QgYWdhaW5zdCBkYW5nZXJvdXMgc2VsZWN0b3JzLiAgZmFsc2V5IGFuZCB7X2lkOiBmYWxzZXl9IGFyZSBib3RoXG4gIC8vIGxpa2VseSBwcm9ncmFtbWVyIGVycm9yLCBhbmQgbm90IHdoYXQgeW91IHdhbnQsIHBhcnRpY3VsYXJseSBmb3IgZGVzdHJ1Y3RpdmVcbiAgLy8gb3BlcmF0aW9ucy4gSWYgYSBmYWxzZXkgX2lkIGlzIHNlbnQgaW4sIGEgbmV3IHN0cmluZyBfaWQgd2lsbCBiZVxuICAvLyBnZW5lcmF0ZWQgYW5kIHJldHVybmVkOyBpZiBhIGZhbGxiYWNrSWQgaXMgcHJvdmlkZWQsIGl0IHdpbGwgYmUgcmV0dXJuZWRcbiAgLy8gaW5zdGVhZC5cbiAgX3Jld3JpdGVTZWxlY3RvcihzZWxlY3RvciwgeyBmYWxsYmFja0lkIH0gPSB7fSkge1xuICAgIC8vIHNob3J0aGFuZCAtLSBzY2FsYXJzIG1hdGNoIF9pZFxuICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZChzZWxlY3RvcikpXG4gICAgICBzZWxlY3RvciA9IHtfaWQ6IHNlbGVjdG9yfTtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KHNlbGVjdG9yKSkge1xuICAgICAgLy8gVGhpcyBpcyBjb25zaXN0ZW50IHdpdGggdGhlIE1vbmdvIGNvbnNvbGUgaXRzZWxmOyBpZiB3ZSBkb24ndCBkbyB0aGlzXG4gICAgICAvLyBjaGVjayBwYXNzaW5nIGFuIGVtcHR5IGFycmF5IGVuZHMgdXAgc2VsZWN0aW5nIGFsbCBpdGVtc1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTW9uZ28gc2VsZWN0b3IgY2FuJ3QgYmUgYW4gYXJyYXkuXCIpO1xuICAgIH1cblxuICAgIGlmICghc2VsZWN0b3IgfHwgKCgnX2lkJyBpbiBzZWxlY3RvcikgJiYgIXNlbGVjdG9yLl9pZCkpIHtcbiAgICAgIC8vIGNhbid0IG1hdGNoIGFueXRoaW5nXG4gICAgICByZXR1cm4geyBfaWQ6IGZhbGxiYWNrSWQgfHwgUmFuZG9tLmlkKCkgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2VsZWN0b3I7XG4gIH1cbn0pO1xuXG5PYmplY3QuYXNzaWduKE1vbmdvLkNvbGxlY3Rpb24ucHJvdG90eXBlLCB7XG4gIC8vICdpbnNlcnQnIGltbWVkaWF0ZWx5IHJldHVybnMgdGhlIGluc2VydGVkIGRvY3VtZW50J3MgbmV3IF9pZC5cbiAgLy8gVGhlIG90aGVycyByZXR1cm4gdmFsdWVzIGltbWVkaWF0ZWx5IGlmIHlvdSBhcmUgaW4gYSBzdHViLCBhbiBpbi1tZW1vcnlcbiAgLy8gdW5tYW5hZ2VkIGNvbGxlY3Rpb24sIG9yIGEgbW9uZ28tYmFja2VkIGNvbGxlY3Rpb24gYW5kIHlvdSBkb24ndCBwYXNzIGFcbiAgLy8gY2FsbGJhY2suICd1cGRhdGUnIGFuZCAncmVtb3ZlJyByZXR1cm4gdGhlIG51bWJlciBvZiBhZmZlY3RlZFxuICAvLyBkb2N1bWVudHMuICd1cHNlcnQnIHJldHVybnMgYW4gb2JqZWN0IHdpdGgga2V5cyAnbnVtYmVyQWZmZWN0ZWQnIGFuZCwgaWYgYW5cbiAgLy8gaW5zZXJ0IGhhcHBlbmVkLCAnaW5zZXJ0ZWRJZCcuXG4gIC8vXG4gIC8vIE90aGVyd2lzZSwgdGhlIHNlbWFudGljcyBhcmUgZXhhY3RseSBsaWtlIG90aGVyIG1ldGhvZHM6IHRoZXkgdGFrZVxuICAvLyBhIGNhbGxiYWNrIGFzIGFuIG9wdGlvbmFsIGxhc3QgYXJndW1lbnQ7IGlmIG5vIGNhbGxiYWNrIGlzXG4gIC8vIHByb3ZpZGVkLCB0aGV5IGJsb2NrIHVudGlsIHRoZSBvcGVyYXRpb24gaXMgY29tcGxldGUsIGFuZCB0aHJvdyBhblxuICAvLyBleGNlcHRpb24gaWYgaXQgZmFpbHM7IGlmIGEgY2FsbGJhY2sgaXMgcHJvdmlkZWQsIHRoZW4gdGhleSBkb24ndFxuICAvLyBuZWNlc3NhcmlseSBibG9jaywgYW5kIHRoZXkgY2FsbCB0aGUgY2FsbGJhY2sgd2hlbiB0aGV5IGZpbmlzaCB3aXRoIGVycm9yIGFuZFxuICAvLyByZXN1bHQgYXJndW1lbnRzLiAgKFRoZSBpbnNlcnQgbWV0aG9kIHByb3ZpZGVzIHRoZSBkb2N1bWVudCBJRCBhcyBpdHMgcmVzdWx0O1xuICAvLyB1cGRhdGUgYW5kIHJlbW92ZSBwcm92aWRlIHRoZSBudW1iZXIgb2YgYWZmZWN0ZWQgZG9jcyBhcyB0aGUgcmVzdWx0OyB1cHNlcnRcbiAgLy8gcHJvdmlkZXMgYW4gb2JqZWN0IHdpdGggbnVtYmVyQWZmZWN0ZWQgYW5kIG1heWJlIGluc2VydGVkSWQuKVxuICAvL1xuICAvLyBPbiB0aGUgY2xpZW50LCBibG9ja2luZyBpcyBpbXBvc3NpYmxlLCBzbyBpZiBhIGNhbGxiYWNrXG4gIC8vIGlzbid0IHByb3ZpZGVkLCB0aGV5IGp1c3QgcmV0dXJuIGltbWVkaWF0ZWx5IGFuZCBhbnkgZXJyb3JcbiAgLy8gaW5mb3JtYXRpb24gaXMgbG9zdC5cbiAgLy9cbiAgLy8gVGhlcmUncyBvbmUgbW9yZSB0d2Vhay4gT24gdGhlIGNsaWVudCwgaWYgeW91IGRvbid0IHByb3ZpZGUgYVxuICAvLyBjYWxsYmFjaywgdGhlbiBpZiB0aGVyZSBpcyBhbiBlcnJvciwgYSBtZXNzYWdlIHdpbGwgYmUgbG9nZ2VkIHdpdGhcbiAgLy8gTWV0ZW9yLl9kZWJ1Zy5cbiAgLy9cbiAgLy8gVGhlIGludGVudCAodGhvdWdoIHRoaXMgaXMgYWN0dWFsbHkgZGV0ZXJtaW5lZCBieSB0aGUgdW5kZXJseWluZ1xuICAvLyBkcml2ZXJzKSBpcyB0aGF0IHRoZSBvcGVyYXRpb25zIHNob3VsZCBiZSBkb25lIHN5bmNocm9ub3VzbHksIG5vdFxuICAvLyBnZW5lcmF0aW5nIHRoZWlyIHJlc3VsdCB1bnRpbCB0aGUgZGF0YWJhc2UgaGFzIGFja25vd2xlZGdlZFxuICAvLyB0aGVtLiBJbiB0aGUgZnV0dXJlIG1heWJlIHdlIHNob3VsZCBwcm92aWRlIGEgZmxhZyB0byB0dXJuIHRoaXNcbiAgLy8gb2ZmLlxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBJbnNlcnQgYSBkb2N1bWVudCBpbiB0aGUgY29sbGVjdGlvbi4gIFJldHVybnMgaXRzIHVuaXF1ZSBfaWQuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kICBpbnNlcnRcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgVGhlIGRvY3VtZW50IHRvIGluc2VydC4gTWF5IG5vdCB5ZXQgaGF2ZSBhbiBfaWQgYXR0cmlidXRlLCBpbiB3aGljaCBjYXNlIE1ldGVvciB3aWxsIGdlbmVyYXRlIG9uZSBmb3IgeW91LlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIE9wdGlvbmFsLiAgSWYgcHJlc2VudCwgY2FsbGVkIHdpdGggYW4gZXJyb3Igb2JqZWN0IGFzIHRoZSBmaXJzdCBhcmd1bWVudCBhbmQsIGlmIG5vIGVycm9yLCB0aGUgX2lkIGFzIHRoZSBzZWNvbmQuXG4gICAqL1xuICBpbnNlcnQoZG9jLCBjYWxsYmFjaykge1xuICAgIC8vIE1ha2Ugc3VyZSB3ZSB3ZXJlIHBhc3NlZCBhIGRvY3VtZW50IHRvIGluc2VydFxuICAgIGlmICghZG9jKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnNlcnQgcmVxdWlyZXMgYW4gYXJndW1lbnRcIik7XG4gICAgfVxuXG4gICAgLy8gTWFrZSBhIHNoYWxsb3cgY2xvbmUgb2YgdGhlIGRvY3VtZW50LCBwcmVzZXJ2aW5nIGl0cyBwcm90b3R5cGUuXG4gICAgZG9jID0gT2JqZWN0LmNyZWF0ZShcbiAgICAgIE9iamVjdC5nZXRQcm90b3R5cGVPZihkb2MpLFxuICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMoZG9jKVxuICAgICk7XG5cbiAgICBpZiAoJ19pZCcgaW4gZG9jKSB7XG4gICAgICBpZiAoISBkb2MuX2lkIHx8XG4gICAgICAgICAgISAodHlwZW9mIGRvYy5faWQgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICAgICAgZG9jLl9pZCBpbnN0YW5jZW9mIE1vbmdvLk9iamVjdElEKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgXCJNZXRlb3IgcmVxdWlyZXMgZG9jdW1lbnQgX2lkIGZpZWxkcyB0byBiZSBub24tZW1wdHkgc3RyaW5ncyBvciBPYmplY3RJRHNcIik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBnZW5lcmF0ZUlkID0gdHJ1ZTtcblxuICAgICAgLy8gRG9uJ3QgZ2VuZXJhdGUgdGhlIGlkIGlmIHdlJ3JlIHRoZSBjbGllbnQgYW5kIHRoZSAnb3V0ZXJtb3N0JyBjYWxsXG4gICAgICAvLyBUaGlzIG9wdGltaXphdGlvbiBzYXZlcyB1cyBwYXNzaW5nIGJvdGggdGhlIHJhbmRvbVNlZWQgYW5kIHRoZSBpZFxuICAgICAgLy8gUGFzc2luZyBib3RoIGlzIHJlZHVuZGFudC5cbiAgICAgIGlmICh0aGlzLl9pc1JlbW90ZUNvbGxlY3Rpb24oKSkge1xuICAgICAgICBjb25zdCBlbmNsb3NpbmcgPSBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLmdldCgpO1xuICAgICAgICBpZiAoIWVuY2xvc2luZykge1xuICAgICAgICAgIGdlbmVyYXRlSWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZ2VuZXJhdGVJZCkge1xuICAgICAgICBkb2MuX2lkID0gdGhpcy5fbWFrZU5ld0lEKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gT24gaW5zZXJ0cywgYWx3YXlzIHJldHVybiB0aGUgaWQgdGhhdCB3ZSBnZW5lcmF0ZWQ7IG9uIGFsbCBvdGhlclxuICAgIC8vIG9wZXJhdGlvbnMsIGp1c3QgcmV0dXJuIHRoZSByZXN1bHQgZnJvbSB0aGUgY29sbGVjdGlvbi5cbiAgICB2YXIgY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdCA9IGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgIGlmIChkb2MuX2lkKSB7XG4gICAgICAgIHJldHVybiBkb2MuX2lkO1xuICAgICAgfVxuXG4gICAgICAvLyBYWFggd2hhdCBpcyB0aGlzIGZvcj8/XG4gICAgICAvLyBJdCdzIHNvbWUgaXRlcmFjdGlvbiBiZXR3ZWVuIHRoZSBjYWxsYmFjayB0byBfY2FsbE11dGF0b3JNZXRob2QgYW5kXG4gICAgICAvLyB0aGUgcmV0dXJuIHZhbHVlIGNvbnZlcnNpb25cbiAgICAgIGRvYy5faWQgPSByZXN1bHQ7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcblxuICAgIGNvbnN0IHdyYXBwZWRDYWxsYmFjayA9IHdyYXBDYWxsYmFjayhcbiAgICAgIGNhbGxiYWNrLCBjaG9vc2VSZXR1cm5WYWx1ZUZyb21Db2xsZWN0aW9uUmVzdWx0KTtcblxuICAgIGlmICh0aGlzLl9pc1JlbW90ZUNvbGxlY3Rpb24oKSkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fY2FsbE11dGF0b3JNZXRob2QoXCJpbnNlcnRcIiwgW2RvY10sIHdyYXBwZWRDYWxsYmFjayk7XG4gICAgICByZXR1cm4gY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdChyZXN1bHQpO1xuICAgIH1cblxuICAgIC8vIGl0J3MgbXkgY29sbGVjdGlvbi4gIGRlc2NlbmQgaW50byB0aGUgY29sbGVjdGlvbiBvYmplY3RcbiAgICAvLyBhbmQgcHJvcGFnYXRlIGFueSBleGNlcHRpb24uXG4gICAgdHJ5IHtcbiAgICAgIC8vIElmIHRoZSB1c2VyIHByb3ZpZGVkIGEgY2FsbGJhY2sgYW5kIHRoZSBjb2xsZWN0aW9uIGltcGxlbWVudHMgdGhpc1xuICAgICAgLy8gb3BlcmF0aW9uIGFzeW5jaHJvbm91c2x5LCB0aGVuIHF1ZXJ5UmV0IHdpbGwgYmUgdW5kZWZpbmVkLCBhbmQgdGhlXG4gICAgICAvLyByZXN1bHQgd2lsbCBiZSByZXR1cm5lZCB0aHJvdWdoIHRoZSBjYWxsYmFjayBpbnN0ZWFkLlxuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fY29sbGVjdGlvbi5pbnNlcnQoZG9jLCB3cmFwcGVkQ2FsbGJhY2spO1xuICAgICAgcmV0dXJuIGNob29zZVJldHVyblZhbHVlRnJvbUNvbGxlY3Rpb25SZXN1bHQocmVzdWx0KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2soZSk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IE1vZGlmeSBvbmUgb3IgbW9yZSBkb2N1bWVudHMgaW4gdGhlIGNvbGxlY3Rpb24uIFJldHVybnMgdGhlIG51bWJlciBvZiBtYXRjaGVkIGRvY3VtZW50cy5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgdXBkYXRlXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IHNlbGVjdG9yIFNwZWNpZmllcyB3aGljaCBkb2N1bWVudHMgdG8gbW9kaWZ5XG4gICAqIEBwYXJhbSB7TW9uZ29Nb2RpZmllcn0gbW9kaWZpZXIgU3BlY2lmaWVzIGhvdyB0byBtb2RpZnkgdGhlIGRvY3VtZW50c1xuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5tdWx0aSBUcnVlIHRvIG1vZGlmeSBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzOyBmYWxzZSB0byBvbmx5IG1vZGlmeSBvbmUgb2YgdGhlIG1hdGNoaW5nIGRvY3VtZW50cyAodGhlIGRlZmF1bHQpLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMudXBzZXJ0IFRydWUgdG8gaW5zZXJ0IGEgZG9jdW1lbnQgaWYgbm8gbWF0Y2hpbmcgZG9jdW1lbnRzIGFyZSBmb3VuZC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSBPcHRpb25hbC4gIElmIHByZXNlbnQsIGNhbGxlZCB3aXRoIGFuIGVycm9yIG9iamVjdCBhcyB0aGUgZmlyc3QgYXJndW1lbnQgYW5kLCBpZiBubyBlcnJvciwgdGhlIG51bWJlciBvZiBhZmZlY3RlZCBkb2N1bWVudHMgYXMgdGhlIHNlY29uZC5cbiAgICovXG4gIHVwZGF0ZShzZWxlY3RvciwgbW9kaWZpZXIsIC4uLm9wdGlvbnNBbmRDYWxsYmFjaykge1xuICAgIGNvbnN0IGNhbGxiYWNrID0gcG9wQ2FsbGJhY2tGcm9tQXJncyhvcHRpb25zQW5kQ2FsbGJhY2spO1xuXG4gICAgLy8gV2UndmUgYWxyZWFkeSBwb3BwZWQgb2ZmIHRoZSBjYWxsYmFjaywgc28gd2UgYXJlIGxlZnQgd2l0aCBhbiBhcnJheVxuICAgIC8vIG9mIG9uZSBvciB6ZXJvIGl0ZW1zXG4gICAgY29uc3Qgb3B0aW9ucyA9IHsgLi4uKG9wdGlvbnNBbmRDYWxsYmFja1swXSB8fCBudWxsKSB9O1xuICAgIGxldCBpbnNlcnRlZElkO1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMudXBzZXJ0KSB7XG4gICAgICAvLyBzZXQgYGluc2VydGVkSWRgIGlmIGFic2VudC4gIGBpbnNlcnRlZElkYCBpcyBhIE1ldGVvciBleHRlbnNpb24uXG4gICAgICBpZiAob3B0aW9ucy5pbnNlcnRlZElkKSB7XG4gICAgICAgIGlmICghKHR5cGVvZiBvcHRpb25zLmluc2VydGVkSWQgPT09ICdzdHJpbmcnIHx8IG9wdGlvbnMuaW5zZXJ0ZWRJZCBpbnN0YW5jZW9mIE1vbmdvLk9iamVjdElEKSlcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnNlcnRlZElkIG11c3QgYmUgc3RyaW5nIG9yIE9iamVjdElEXCIpO1xuICAgICAgICBpbnNlcnRlZElkID0gb3B0aW9ucy5pbnNlcnRlZElkO1xuICAgICAgfSBlbHNlIGlmICghc2VsZWN0b3IgfHwgIXNlbGVjdG9yLl9pZCkge1xuICAgICAgICBpbnNlcnRlZElkID0gdGhpcy5fbWFrZU5ld0lEKCk7XG4gICAgICAgIG9wdGlvbnMuZ2VuZXJhdGVkSWQgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLmluc2VydGVkSWQgPSBpbnNlcnRlZElkO1xuICAgICAgfVxuICAgIH1cblxuICAgIHNlbGVjdG9yID1cbiAgICAgIE1vbmdvLkNvbGxlY3Rpb24uX3Jld3JpdGVTZWxlY3RvcihzZWxlY3RvciwgeyBmYWxsYmFja0lkOiBpbnNlcnRlZElkIH0pO1xuXG4gICAgY29uc3Qgd3JhcHBlZENhbGxiYWNrID0gd3JhcENhbGxiYWNrKGNhbGxiYWNrKTtcblxuICAgIGlmICh0aGlzLl9pc1JlbW90ZUNvbGxlY3Rpb24oKSkge1xuICAgICAgY29uc3QgYXJncyA9IFtcbiAgICAgICAgc2VsZWN0b3IsXG4gICAgICAgIG1vZGlmaWVyLFxuICAgICAgICBvcHRpb25zXG4gICAgICBdO1xuXG4gICAgICByZXR1cm4gdGhpcy5fY2FsbE11dGF0b3JNZXRob2QoXCJ1cGRhdGVcIiwgYXJncywgd3JhcHBlZENhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAvLyBpdCdzIG15IGNvbGxlY3Rpb24uICBkZXNjZW5kIGludG8gdGhlIGNvbGxlY3Rpb24gb2JqZWN0XG4gICAgLy8gYW5kIHByb3BhZ2F0ZSBhbnkgZXhjZXB0aW9uLlxuICAgIHRyeSB7XG4gICAgICAvLyBJZiB0aGUgdXNlciBwcm92aWRlZCBhIGNhbGxiYWNrIGFuZCB0aGUgY29sbGVjdGlvbiBpbXBsZW1lbnRzIHRoaXNcbiAgICAgIC8vIG9wZXJhdGlvbiBhc3luY2hyb25vdXNseSwgdGhlbiBxdWVyeVJldCB3aWxsIGJlIHVuZGVmaW5lZCwgYW5kIHRoZVxuICAgICAgLy8gcmVzdWx0IHdpbGwgYmUgcmV0dXJuZWQgdGhyb3VnaCB0aGUgY2FsbGJhY2sgaW5zdGVhZC5cbiAgICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9uLnVwZGF0ZShcbiAgICAgICAgc2VsZWN0b3IsIG1vZGlmaWVyLCBvcHRpb25zLCB3cmFwcGVkQ2FsbGJhY2spO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayhlKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgUmVtb3ZlIGRvY3VtZW50cyBmcm9tIHRoZSBjb2xsZWN0aW9uXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kIHJlbW92ZVxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtNb25nb1NlbGVjdG9yfSBzZWxlY3RvciBTcGVjaWZpZXMgd2hpY2ggZG9jdW1lbnRzIHRvIHJlbW92ZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIE9wdGlvbmFsLiAgSWYgcHJlc2VudCwgY2FsbGVkIHdpdGggYW4gZXJyb3Igb2JqZWN0IGFzIGl0cyBhcmd1bWVudC5cbiAgICovXG4gIHJlbW92ZShzZWxlY3RvciwgY2FsbGJhY2spIHtcbiAgICBzZWxlY3RvciA9IE1vbmdvLkNvbGxlY3Rpb24uX3Jld3JpdGVTZWxlY3RvcihzZWxlY3Rvcik7XG5cbiAgICBjb25zdCB3cmFwcGVkQ2FsbGJhY2sgPSB3cmFwQ2FsbGJhY2soY2FsbGJhY2spO1xuXG4gICAgaWYgKHRoaXMuX2lzUmVtb3RlQ29sbGVjdGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fY2FsbE11dGF0b3JNZXRob2QoXCJyZW1vdmVcIiwgW3NlbGVjdG9yXSwgd3JhcHBlZENhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAvLyBpdCdzIG15IGNvbGxlY3Rpb24uICBkZXNjZW5kIGludG8gdGhlIGNvbGxlY3Rpb24gb2JqZWN0XG4gICAgLy8gYW5kIHByb3BhZ2F0ZSBhbnkgZXhjZXB0aW9uLlxuICAgIHRyeSB7XG4gICAgICAvLyBJZiB0aGUgdXNlciBwcm92aWRlZCBhIGNhbGxiYWNrIGFuZCB0aGUgY29sbGVjdGlvbiBpbXBsZW1lbnRzIHRoaXNcbiAgICAgIC8vIG9wZXJhdGlvbiBhc3luY2hyb25vdXNseSwgdGhlbiBxdWVyeVJldCB3aWxsIGJlIHVuZGVmaW5lZCwgYW5kIHRoZVxuICAgICAgLy8gcmVzdWx0IHdpbGwgYmUgcmV0dXJuZWQgdGhyb3VnaCB0aGUgY2FsbGJhY2sgaW5zdGVhZC5cbiAgICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9uLnJlbW92ZShzZWxlY3Rvciwgd3JhcHBlZENhbGxiYWNrKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2soZSk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgY29sbGVjdGlvbiBpcyBzaW1wbHkgYSBtaW5pbW9uZ28gcmVwcmVzZW50YXRpb24gb2YgYSByZWFsXG4gIC8vIGRhdGFiYXNlIG9uIGFub3RoZXIgc2VydmVyXG4gIF9pc1JlbW90ZUNvbGxlY3Rpb24oKSB7XG4gICAgLy8gWFhYIHNlZSAjTWV0ZW9yU2VydmVyTnVsbFxuICAgIHJldHVybiB0aGlzLl9jb25uZWN0aW9uICYmIHRoaXMuX2Nvbm5lY3Rpb24gIT09IE1ldGVvci5zZXJ2ZXI7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IE1vZGlmeSBvbmUgb3IgbW9yZSBkb2N1bWVudHMgaW4gdGhlIGNvbGxlY3Rpb24sIG9yIGluc2VydCBvbmUgaWYgbm8gbWF0Y2hpbmcgZG9jdW1lbnRzIHdlcmUgZm91bmQuIFJldHVybnMgYW4gb2JqZWN0IHdpdGgga2V5cyBgbnVtYmVyQWZmZWN0ZWRgICh0aGUgbnVtYmVyIG9mIGRvY3VtZW50cyBtb2RpZmllZCkgIGFuZCBgaW5zZXJ0ZWRJZGAgKHRoZSB1bmlxdWUgX2lkIG9mIHRoZSBkb2N1bWVudCB0aGF0IHdhcyBpbnNlcnRlZCwgaWYgYW55KS5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgdXBzZXJ0XG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IHNlbGVjdG9yIFNwZWNpZmllcyB3aGljaCBkb2N1bWVudHMgdG8gbW9kaWZ5XG4gICAqIEBwYXJhbSB7TW9uZ29Nb2RpZmllcn0gbW9kaWZpZXIgU3BlY2lmaWVzIGhvdyB0byBtb2RpZnkgdGhlIGRvY3VtZW50c1xuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5tdWx0aSBUcnVlIHRvIG1vZGlmeSBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzOyBmYWxzZSB0byBvbmx5IG1vZGlmeSBvbmUgb2YgdGhlIG1hdGNoaW5nIGRvY3VtZW50cyAodGhlIGRlZmF1bHQpLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIE9wdGlvbmFsLiAgSWYgcHJlc2VudCwgY2FsbGVkIHdpdGggYW4gZXJyb3Igb2JqZWN0IGFzIHRoZSBmaXJzdCBhcmd1bWVudCBhbmQsIGlmIG5vIGVycm9yLCB0aGUgbnVtYmVyIG9mIGFmZmVjdGVkIGRvY3VtZW50cyBhcyB0aGUgc2Vjb25kLlxuICAgKi9cbiAgdXBzZXJ0KHNlbGVjdG9yLCBtb2RpZmllciwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoISBjYWxsYmFjayAmJiB0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKHNlbGVjdG9yLCBtb2RpZmllciwge1xuICAgICAgLi4ub3B0aW9ucyxcbiAgICAgIF9yZXR1cm5PYmplY3Q6IHRydWUsXG4gICAgICB1cHNlcnQ6IHRydWUsXG4gICAgfSwgY2FsbGJhY2spO1xuICB9LFxuXG4gIC8vIFdlJ2xsIGFjdHVhbGx5IGRlc2lnbiBhbiBpbmRleCBBUEkgbGF0ZXIuIEZvciBub3csIHdlIGp1c3QgcGFzcyB0aHJvdWdoIHRvXG4gIC8vIE1vbmdvJ3MsIGJ1dCBtYWtlIGl0IHN5bmNocm9ub3VzLlxuICBfZW5zdXJlSW5kZXgoaW5kZXgsIG9wdGlvbnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFzZWxmLl9jb2xsZWN0aW9uLl9lbnN1cmVJbmRleClcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgX2Vuc3VyZUluZGV4IG9uIHNlcnZlciBjb2xsZWN0aW9uc1wiKTtcbiAgICBzZWxmLl9jb2xsZWN0aW9uLl9lbnN1cmVJbmRleChpbmRleCwgb3B0aW9ucyk7XG4gIH0sXG5cbiAgX2Ryb3BJbmRleChpbmRleCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIXNlbGYuX2NvbGxlY3Rpb24uX2Ryb3BJbmRleClcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgX2Ryb3BJbmRleCBvbiBzZXJ2ZXIgY29sbGVjdGlvbnNcIik7XG4gICAgc2VsZi5fY29sbGVjdGlvbi5fZHJvcEluZGV4KGluZGV4KTtcbiAgfSxcblxuICBfZHJvcENvbGxlY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghc2VsZi5fY29sbGVjdGlvbi5kcm9wQ29sbGVjdGlvbilcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgX2Ryb3BDb2xsZWN0aW9uIG9uIHNlcnZlciBjb2xsZWN0aW9uc1wiKTtcbiAgICBzZWxmLl9jb2xsZWN0aW9uLmRyb3BDb2xsZWN0aW9uKCk7XG4gIH0sXG5cbiAgX2NyZWF0ZUNhcHBlZENvbGxlY3Rpb24oYnl0ZVNpemUsIG1heERvY3VtZW50cykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIXNlbGYuX2NvbGxlY3Rpb24uX2NyZWF0ZUNhcHBlZENvbGxlY3Rpb24pXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4gb25seSBjYWxsIF9jcmVhdGVDYXBwZWRDb2xsZWN0aW9uIG9uIHNlcnZlciBjb2xsZWN0aW9uc1wiKTtcbiAgICBzZWxmLl9jb2xsZWN0aW9uLl9jcmVhdGVDYXBwZWRDb2xsZWN0aW9uKGJ5dGVTaXplLCBtYXhEb2N1bWVudHMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIHRoZSBbYENvbGxlY3Rpb25gXShodHRwOi8vbW9uZ29kYi5naXRodWIuaW8vbm9kZS1tb25nb2RiLW5hdGl2ZS8zLjAvYXBpL0NvbGxlY3Rpb24uaHRtbCkgb2JqZWN0IGNvcnJlc3BvbmRpbmcgdG8gdGhpcyBjb2xsZWN0aW9uIGZyb20gdGhlIFtucG0gYG1vbmdvZGJgIGRyaXZlciBtb2R1bGVdKGh0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL21vbmdvZGIpIHdoaWNoIGlzIHdyYXBwZWQgYnkgYE1vbmdvLkNvbGxlY3Rpb25gLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKi9cbiAgcmF3Q29sbGVjdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCEgc2VsZi5fY29sbGVjdGlvbi5yYXdDb2xsZWN0aW9uKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4gb25seSBjYWxsIHJhd0NvbGxlY3Rpb24gb24gc2VydmVyIGNvbGxlY3Rpb25zXCIpO1xuICAgIH1cbiAgICByZXR1cm4gc2VsZi5fY29sbGVjdGlvbi5yYXdDb2xsZWN0aW9uKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgdGhlIFtgRGJgXShodHRwOi8vbW9uZ29kYi5naXRodWIuaW8vbm9kZS1tb25nb2RiLW5hdGl2ZS8zLjAvYXBpL0RiLmh0bWwpIG9iamVjdCBjb3JyZXNwb25kaW5nIHRvIHRoaXMgY29sbGVjdGlvbidzIGRhdGFiYXNlIGNvbm5lY3Rpb24gZnJvbSB0aGUgW25wbSBgbW9uZ29kYmAgZHJpdmVyIG1vZHVsZV0oaHR0cHM6Ly93d3cubnBtanMuY29tL3BhY2thZ2UvbW9uZ29kYikgd2hpY2ggaXMgd3JhcHBlZCBieSBgTW9uZ28uQ29sbGVjdGlvbmAuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqL1xuICByYXdEYXRhYmFzZSgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCEgKHNlbGYuX2RyaXZlci5tb25nbyAmJiBzZWxmLl9kcml2ZXIubW9uZ28uZGIpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4gb25seSBjYWxsIHJhd0RhdGFiYXNlIG9uIHNlcnZlciBjb2xsZWN0aW9uc1wiKTtcbiAgICB9XG4gICAgcmV0dXJuIHNlbGYuX2RyaXZlci5tb25nby5kYjtcbiAgfVxufSk7XG5cbi8vIENvbnZlcnQgdGhlIGNhbGxiYWNrIHRvIG5vdCByZXR1cm4gYSByZXN1bHQgaWYgdGhlcmUgaXMgYW4gZXJyb3JcbmZ1bmN0aW9uIHdyYXBDYWxsYmFjayhjYWxsYmFjaywgY29udmVydFJlc3VsdCkge1xuICByZXR1cm4gY2FsbGJhY2sgJiYgZnVuY3Rpb24gKGVycm9yLCByZXN1bHQpIHtcbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIGNhbGxiYWNrKGVycm9yKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBjb252ZXJ0UmVzdWx0ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIGNhbGxiYWNrKGVycm9yLCBjb252ZXJ0UmVzdWx0KHJlc3VsdCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFjayhlcnJvciwgcmVzdWx0KTtcbiAgICB9XG4gIH07XG59XG5cbi8qKlxuICogQHN1bW1hcnkgQ3JlYXRlIGEgTW9uZ28tc3R5bGUgYE9iamVjdElEYC4gIElmIHlvdSBkb24ndCBzcGVjaWZ5IGEgYGhleFN0cmluZ2AsIHRoZSBgT2JqZWN0SURgIHdpbGwgZ2VuZXJhdGVkIHJhbmRvbWx5IChub3QgdXNpbmcgTW9uZ29EQidzIElEIGNvbnN0cnVjdGlvbiBydWxlcykuXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBjbGFzc1xuICogQHBhcmFtIHtTdHJpbmd9IFtoZXhTdHJpbmddIE9wdGlvbmFsLiAgVGhlIDI0LWNoYXJhY3RlciBoZXhhZGVjaW1hbCBjb250ZW50cyBvZiB0aGUgT2JqZWN0SUQgdG8gY3JlYXRlXG4gKi9cbk1vbmdvLk9iamVjdElEID0gTW9uZ29JRC5PYmplY3RJRDtcblxuLyoqXG4gKiBAc3VtbWFyeSBUbyBjcmVhdGUgYSBjdXJzb3IsIHVzZSBmaW5kLiBUbyBhY2Nlc3MgdGhlIGRvY3VtZW50cyBpbiBhIGN1cnNvciwgdXNlIGZvckVhY2gsIG1hcCwgb3IgZmV0Y2guXG4gKiBAY2xhc3NcbiAqIEBpbnN0YW5jZU5hbWUgY3Vyc29yXG4gKi9cbk1vbmdvLkN1cnNvciA9IExvY2FsQ29sbGVjdGlvbi5DdXJzb3I7XG5cbi8qKlxuICogQGRlcHJlY2F0ZWQgaW4gMC45LjFcbiAqL1xuTW9uZ28uQ29sbGVjdGlvbi5DdXJzb3IgPSBNb25nby5DdXJzb3I7XG5cbi8qKlxuICogQGRlcHJlY2F0ZWQgaW4gMC45LjFcbiAqL1xuTW9uZ28uQ29sbGVjdGlvbi5PYmplY3RJRCA9IE1vbmdvLk9iamVjdElEO1xuXG4vKipcbiAqIEBkZXByZWNhdGVkIGluIDAuOS4xXG4gKi9cbk1ldGVvci5Db2xsZWN0aW9uID0gTW9uZ28uQ29sbGVjdGlvbjtcblxuLy8gQWxsb3cgZGVueSBzdHVmZiBpcyBub3cgaW4gdGhlIGFsbG93LWRlbnkgcGFja2FnZVxuT2JqZWN0LmFzc2lnbihcbiAgTWV0ZW9yLkNvbGxlY3Rpb24ucHJvdG90eXBlLFxuICBBbGxvd0RlbnkuQ29sbGVjdGlvblByb3RvdHlwZVxuKTtcblxuZnVuY3Rpb24gcG9wQ2FsbGJhY2tGcm9tQXJncyhhcmdzKSB7XG4gIC8vIFB1bGwgb2ZmIGFueSBjYWxsYmFjayAob3IgcGVyaGFwcyBhICdjYWxsYmFjaycgdmFyaWFibGUgdGhhdCB3YXMgcGFzc2VkXG4gIC8vIGluIHVuZGVmaW5lZCwgbGlrZSBob3cgJ3Vwc2VydCcgZG9lcyBpdCkuXG4gIGlmIChhcmdzLmxlbmd0aCAmJlxuICAgICAgKGFyZ3NbYXJncy5sZW5ndGggLSAxXSA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgYXJnc1thcmdzLmxlbmd0aCAtIDFdIGluc3RhbmNlb2YgRnVuY3Rpb24pKSB7XG4gICAgcmV0dXJuIGFyZ3MucG9wKCk7XG4gIH1cbn1cbiIsIi8qKlxuICogQHN1bW1hcnkgQWxsb3dzIGZvciB1c2VyIHNwZWNpZmllZCBjb25uZWN0aW9uIG9wdGlvbnNcbiAqIEBleGFtcGxlIGh0dHA6Ly9tb25nb2RiLmdpdGh1Yi5pby9ub2RlLW1vbmdvZGItbmF0aXZlLzMuMC9yZWZlcmVuY2UvY29ubmVjdGluZy9jb25uZWN0aW9uLXNldHRpbmdzL1xuICogQGxvY3VzIFNlcnZlclxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgVXNlciBzcGVjaWZpZWQgTW9uZ28gY29ubmVjdGlvbiBvcHRpb25zXG4gKi9cbk1vbmdvLnNldENvbm5lY3Rpb25PcHRpb25zID0gZnVuY3Rpb24gc2V0Q29ubmVjdGlvbk9wdGlvbnMgKG9wdGlvbnMpIHtcbiAgY2hlY2sob3B0aW9ucywgT2JqZWN0KTtcbiAgTW9uZ28uX2Nvbm5lY3Rpb25PcHRpb25zID0gb3B0aW9ucztcbn07Il19
