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
    ignoreUndefined: true
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
        sorter = new Minimongo.Sorter(cursorDescription.options.sort, {
          matcher: matcher
        });
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
    ns: new RegExp('^' + Meteor._escapeRegExp(self._dbName) + '\\.'),
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

          var doc = self._entryQueue.shift();

          if (!(doc.ns && doc.ns.length > self._dbName.length + 1 && doc.ns.substr(0, self._dbName.length + 1) === self._dbName + '.')) {
            throw new Error("Unexpected ns");
          }

          var trigger = {
            collection: doc.ns.substr(self._dbName.length + 1),
            dropCollection: false,
            dropDatabase: false,
            op: doc
          }; // Is it a special command and the collection name is hidden somewhere
          // in operator?

          if (trigger.collection === "$cmd") {
            if (doc.o.dropDatabase) {
              delete trigger.collection;
              trigger.dropDatabase = true;
            } else if (_.has(doc.o, 'drop')) {
              trigger.collection = doc.o.drop;
              trigger.dropCollection = true;
              trigger.id = null;
            } else {
              throw Error("Unknown command " + JSON.stringify(doc));
            }
          } else {
            // All other ops have an id.
            trigger.id = idForOp(doc);
          }

          self._crossbar.fire(trigger); // Now that we've processed this operation, process pending
          // sequencers.


          if (!doc.ts) throw Error("oplog entry without ts: " + EJSON.stringify(doc));

          self._setLastProcessedTS(doc.ts);
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
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

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
      callback(null, convertResult(result));
    } else {
      callback(null, result);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vbW9uZ29fZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9vcGxvZ190YWlsaW5nLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9vYnNlcnZlX211bHRpcGxleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vZG9jX2ZldGNoZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL3BvbGxpbmdfb2JzZXJ2ZV9kcml2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL29wbG9nX29ic2VydmVfZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9sb2NhbF9jb2xsZWN0aW9uX2RyaXZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vcmVtb3RlX2NvbGxlY3Rpb25fZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9jb2xsZWN0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9jb25uZWN0aW9uX29wdGlvbnMuanMiXSwibmFtZXMiOlsiTW9uZ29EQiIsIk5wbU1vZHVsZU1vbmdvZGIiLCJGdXR1cmUiLCJOcG0iLCJyZXF1aXJlIiwiTW9uZ29JbnRlcm5hbHMiLCJNb25nb1Rlc3QiLCJOcG1Nb2R1bGVzIiwibW9uZ29kYiIsInZlcnNpb24iLCJOcG1Nb2R1bGVNb25nb2RiVmVyc2lvbiIsIm1vZHVsZSIsIk5wbU1vZHVsZSIsInJlcGxhY2VOYW1lcyIsImZpbHRlciIsInRoaW5nIiwiXyIsImlzQXJyYXkiLCJtYXAiLCJiaW5kIiwicmV0IiwiZWFjaCIsInZhbHVlIiwia2V5IiwiVGltZXN0YW1wIiwicHJvdG90eXBlIiwiY2xvbmUiLCJtYWtlTW9uZ29MZWdhbCIsIm5hbWUiLCJ1bm1ha2VNb25nb0xlZ2FsIiwic3Vic3RyIiwicmVwbGFjZU1vbmdvQXRvbVdpdGhNZXRlb3IiLCJkb2N1bWVudCIsIkJpbmFyeSIsImJ1ZmZlciIsIlVpbnQ4QXJyYXkiLCJPYmplY3RJRCIsIk1vbmdvIiwidG9IZXhTdHJpbmciLCJzaXplIiwiRUpTT04iLCJmcm9tSlNPTlZhbHVlIiwidW5kZWZpbmVkIiwicmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28iLCJpc0JpbmFyeSIsIkJ1ZmZlciIsImZyb20iLCJfaXNDdXN0b21UeXBlIiwidG9KU09OVmFsdWUiLCJyZXBsYWNlVHlwZXMiLCJhdG9tVHJhbnNmb3JtZXIiLCJyZXBsYWNlZFRvcExldmVsQXRvbSIsInZhbCIsInZhbFJlcGxhY2VkIiwiTW9uZ29Db25uZWN0aW9uIiwidXJsIiwib3B0aW9ucyIsInNlbGYiLCJfb2JzZXJ2ZU11bHRpcGxleGVycyIsIl9vbkZhaWxvdmVySG9vayIsIkhvb2siLCJtb25nb09wdGlvbnMiLCJPYmplY3QiLCJhc3NpZ24iLCJhdXRvUmVjb25uZWN0IiwicmVjb25uZWN0VHJpZXMiLCJJbmZpbml0eSIsImlnbm9yZVVuZGVmaW5lZCIsIl9jb25uZWN0aW9uT3B0aW9ucyIsInRlc3QiLCJuYXRpdmVfcGFyc2VyIiwiaGFzIiwicG9vbFNpemUiLCJkYiIsIl9wcmltYXJ5IiwiX29wbG9nSGFuZGxlIiwiX2RvY0ZldGNoZXIiLCJjb25uZWN0RnV0dXJlIiwiY29ubmVjdCIsIk1ldGVvciIsImJpbmRFbnZpcm9ubWVudCIsImVyciIsImNsaWVudCIsInNlcnZlckNvbmZpZyIsImlzTWFzdGVyRG9jIiwicHJpbWFyeSIsIm9uIiwia2luZCIsImRvYyIsImNhbGxiYWNrIiwibWUiLCJyZXNvbHZlciIsIndhaXQiLCJvcGxvZ1VybCIsIlBhY2thZ2UiLCJPcGxvZ0hhbmRsZSIsImRhdGFiYXNlTmFtZSIsIkRvY0ZldGNoZXIiLCJjbG9zZSIsIkVycm9yIiwib3Bsb2dIYW5kbGUiLCJzdG9wIiwid3JhcCIsInJhd0NvbGxlY3Rpb24iLCJjb2xsZWN0aW9uTmFtZSIsImZ1dHVyZSIsImNvbGxlY3Rpb24iLCJfY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbiIsImJ5dGVTaXplIiwibWF4RG9jdW1lbnRzIiwiY3JlYXRlQ29sbGVjdGlvbiIsImNhcHBlZCIsIm1heCIsIl9tYXliZUJlZ2luV3JpdGUiLCJmZW5jZSIsIkREUFNlcnZlciIsIl9DdXJyZW50V3JpdGVGZW5jZSIsImdldCIsImJlZ2luV3JpdGUiLCJjb21taXR0ZWQiLCJfb25GYWlsb3ZlciIsInJlZ2lzdGVyIiwid3JpdGVDYWxsYmFjayIsIndyaXRlIiwicmVmcmVzaCIsInJlc3VsdCIsInJlZnJlc2hFcnIiLCJiaW5kRW52aXJvbm1lbnRGb3JXcml0ZSIsIl9pbnNlcnQiLCJjb2xsZWN0aW9uX25hbWUiLCJzZW5kRXJyb3IiLCJlIiwiX2V4cGVjdGVkQnlUZXN0IiwiTG9jYWxDb2xsZWN0aW9uIiwiX2lzUGxhaW5PYmplY3QiLCJpZCIsIl9pZCIsImluc2VydCIsInNhZmUiLCJfcmVmcmVzaCIsInNlbGVjdG9yIiwicmVmcmVzaEtleSIsInNwZWNpZmljSWRzIiwiX2lkc01hdGNoZWRCeVNlbGVjdG9yIiwiZXh0ZW5kIiwiX3JlbW92ZSIsIndyYXBwZWRDYWxsYmFjayIsImRyaXZlclJlc3VsdCIsInRyYW5zZm9ybVJlc3VsdCIsIm51bWJlckFmZmVjdGVkIiwicmVtb3ZlIiwiX2Ryb3BDb2xsZWN0aW9uIiwiY2IiLCJkcm9wQ29sbGVjdGlvbiIsImRyb3AiLCJfZHJvcERhdGFiYXNlIiwiZHJvcERhdGFiYXNlIiwiX3VwZGF0ZSIsIm1vZCIsIkZ1bmN0aW9uIiwibW9uZ29PcHRzIiwidXBzZXJ0IiwibXVsdGkiLCJmdWxsUmVzdWx0IiwibW9uZ29TZWxlY3RvciIsIm1vbmdvTW9kIiwiaXNNb2RpZnkiLCJfaXNNb2RpZmljYXRpb25Nb2QiLCJfZm9yYmlkUmVwbGFjZSIsImtub3duSWQiLCJuZXdEb2MiLCJfY3JlYXRlVXBzZXJ0RG9jdW1lbnQiLCJpbnNlcnRlZElkIiwiZ2VuZXJhdGVkSWQiLCJzaW11bGF0ZVVwc2VydFdpdGhJbnNlcnRlZElkIiwiZXJyb3IiLCJfcmV0dXJuT2JqZWN0IiwiaGFzT3duUHJvcGVydHkiLCIkc2V0T25JbnNlcnQiLCJ1cGRhdGUiLCJtZXRlb3JSZXN1bHQiLCJtb25nb1Jlc3VsdCIsInVwc2VydGVkIiwibGVuZ3RoIiwibiIsIk5VTV9PUFRJTUlTVElDX1RSSUVTIiwiX2lzQ2Fubm90Q2hhbmdlSWRFcnJvciIsImVycm1zZyIsImluZGV4T2YiLCJtb25nb09wdHNGb3JVcGRhdGUiLCJtb25nb09wdHNGb3JJbnNlcnQiLCJyZXBsYWNlbWVudFdpdGhJZCIsInRyaWVzIiwiZG9VcGRhdGUiLCJkb0NvbmRpdGlvbmFsSW5zZXJ0IiwibWV0aG9kIiwid3JhcEFzeW5jIiwiYXBwbHkiLCJhcmd1bWVudHMiLCJmaW5kIiwiQ3Vyc29yIiwiQ3Vyc29yRGVzY3JpcHRpb24iLCJmaW5kT25lIiwibGltaXQiLCJmZXRjaCIsIl9lbnN1cmVJbmRleCIsImluZGV4IiwiaW5kZXhOYW1lIiwiZW5zdXJlSW5kZXgiLCJfZHJvcEluZGV4IiwiZHJvcEluZGV4IiwiQ29sbGVjdGlvbiIsIl9yZXdyaXRlU2VsZWN0b3IiLCJtb25nbyIsImN1cnNvckRlc2NyaXB0aW9uIiwiX21vbmdvIiwiX2N1cnNvckRlc2NyaXB0aW9uIiwiX3N5bmNocm9ub3VzQ3Vyc29yIiwiU3ltYm9sIiwiaXRlcmF0b3IiLCJ0YWlsYWJsZSIsIl9jcmVhdGVTeW5jaHJvbm91c0N1cnNvciIsInNlbGZGb3JJdGVyYXRpb24iLCJ1c2VUcmFuc2Zvcm0iLCJyZXdpbmQiLCJnZXRUcmFuc2Zvcm0iLCJ0cmFuc2Zvcm0iLCJfcHVibGlzaEN1cnNvciIsInN1YiIsIl9nZXRDb2xsZWN0aW9uTmFtZSIsIm9ic2VydmUiLCJjYWxsYmFja3MiLCJfb2JzZXJ2ZUZyb21PYnNlcnZlQ2hhbmdlcyIsIm9ic2VydmVDaGFuZ2VzIiwibWV0aG9kcyIsIm9yZGVyZWQiLCJfb2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3NBcmVPcmRlcmVkIiwiZXhjZXB0aW9uTmFtZSIsImZvckVhY2giLCJfb2JzZXJ2ZUNoYW5nZXMiLCJwaWNrIiwiY3Vyc29yT3B0aW9ucyIsInNvcnQiLCJza2lwIiwicHJvamVjdGlvbiIsImZpZWxkcyIsImF3YWl0ZGF0YSIsIm51bWJlck9mUmV0cmllcyIsIk9QTE9HX0NPTExFQ1RJT04iLCJ0cyIsIm9wbG9nUmVwbGF5IiwiZGJDdXJzb3IiLCJtYXhUaW1lTXMiLCJtYXhUaW1lTVMiLCJoaW50IiwiU3luY2hyb25vdXNDdXJzb3IiLCJfZGJDdXJzb3IiLCJfc2VsZkZvckl0ZXJhdGlvbiIsIl90cmFuc2Zvcm0iLCJ3cmFwVHJhbnNmb3JtIiwiX3N5bmNocm9ub3VzQ291bnQiLCJjb3VudCIsIl92aXNpdGVkSWRzIiwiX0lkTWFwIiwiX3Jhd05leHRPYmplY3RQcm9taXNlIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJuZXh0IiwiX25leHRPYmplY3RQcm9taXNlIiwic2V0IiwiX25leHRPYmplY3RQcm9taXNlV2l0aFRpbWVvdXQiLCJ0aW1lb3V0TVMiLCJuZXh0T2JqZWN0UHJvbWlzZSIsInRpbWVvdXRFcnIiLCJ0aW1lb3V0UHJvbWlzZSIsInRpbWVyIiwic2V0VGltZW91dCIsInJhY2UiLCJjYXRjaCIsIl9uZXh0T2JqZWN0IiwiYXdhaXQiLCJ0aGlzQXJnIiwiX3Jld2luZCIsImNhbGwiLCJyZXMiLCJwdXNoIiwiaWRlbnRpdHkiLCJhcHBseVNraXBMaW1pdCIsImdldFJhd09iamVjdHMiLCJyZXN1bHRzIiwiZG9uZSIsInRhaWwiLCJkb2NDYWxsYmFjayIsImN1cnNvciIsInN0b3BwZWQiLCJsYXN0VFMiLCJsb29wIiwibmV3U2VsZWN0b3IiLCIkZ3QiLCJkZWZlciIsIl9vYnNlcnZlQ2hhbmdlc1RhaWxhYmxlIiwib2JzZXJ2ZUtleSIsInN0cmluZ2lmeSIsIm11bHRpcGxleGVyIiwib2JzZXJ2ZURyaXZlciIsImZpcnN0SGFuZGxlIiwiX25vWWllbGRzQWxsb3dlZCIsIk9ic2VydmVNdWx0aXBsZXhlciIsIm9uU3RvcCIsIm9ic2VydmVIYW5kbGUiLCJPYnNlcnZlSGFuZGxlIiwibWF0Y2hlciIsInNvcnRlciIsImNhblVzZU9wbG9nIiwiYWxsIiwiX3Rlc3RPbmx5UG9sbENhbGxiYWNrIiwiTWluaW1vbmdvIiwiTWF0Y2hlciIsIk9wbG9nT2JzZXJ2ZURyaXZlciIsImN1cnNvclN1cHBvcnRlZCIsIlNvcnRlciIsImYiLCJkcml2ZXJDbGFzcyIsIlBvbGxpbmdPYnNlcnZlRHJpdmVyIiwibW9uZ29IYW5kbGUiLCJfb2JzZXJ2ZURyaXZlciIsImFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkcyIsImxpc3RlbkFsbCIsImxpc3RlbkNhbGxiYWNrIiwibGlzdGVuZXJzIiwiZm9yRWFjaFRyaWdnZXIiLCJ0cmlnZ2VyIiwiX0ludmFsaWRhdGlvbkNyb3NzYmFyIiwibGlzdGVuIiwibGlzdGVuZXIiLCJ0cmlnZ2VyQ2FsbGJhY2siLCJhZGRlZEJlZm9yZSIsImFkZGVkIiwiTW9uZ29UaW1lc3RhbXAiLCJDb25uZWN0aW9uIiwiVE9PX0ZBUl9CRUhJTkQiLCJwcm9jZXNzIiwiZW52IiwiTUVURU9SX09QTE9HX1RPT19GQVJfQkVISU5EIiwiVEFJTF9USU1FT1VUIiwiTUVURU9SX09QTE9HX1RBSUxfVElNRU9VVCIsInNob3dUUyIsImdldEhpZ2hCaXRzIiwiZ2V0TG93Qml0cyIsImlkRm9yT3AiLCJvcCIsIm8iLCJvMiIsImRiTmFtZSIsIl9vcGxvZ1VybCIsIl9kYk5hbWUiLCJfb3Bsb2dMYXN0RW50cnlDb25uZWN0aW9uIiwiX29wbG9nVGFpbENvbm5lY3Rpb24iLCJfc3RvcHBlZCIsIl90YWlsSGFuZGxlIiwiX3JlYWR5RnV0dXJlIiwiX2Nyb3NzYmFyIiwiX0Nyb3NzYmFyIiwiZmFjdFBhY2thZ2UiLCJmYWN0TmFtZSIsIl9iYXNlT3Bsb2dTZWxlY3RvciIsIm5zIiwiUmVnRXhwIiwiX2VzY2FwZVJlZ0V4cCIsIiRvciIsIiRpbiIsIiRleGlzdHMiLCJfY2F0Y2hpbmdVcEZ1dHVyZXMiLCJfbGFzdFByb2Nlc3NlZFRTIiwiX29uU2tpcHBlZEVudHJpZXNIb29rIiwiZGVidWdQcmludEV4Y2VwdGlvbnMiLCJfZW50cnlRdWV1ZSIsIl9Eb3VibGVFbmRlZFF1ZXVlIiwiX3dvcmtlckFjdGl2ZSIsIl9zdGFydFRhaWxpbmciLCJvbk9wbG9nRW50cnkiLCJvcmlnaW5hbENhbGxiYWNrIiwibm90aWZpY2F0aW9uIiwiX2RlYnVnIiwibGlzdGVuSGFuZGxlIiwib25Ta2lwcGVkRW50cmllcyIsIndhaXRVbnRpbENhdWdodFVwIiwibGFzdEVudHJ5IiwiJG5hdHVyYWwiLCJfc2xlZXBGb3JNcyIsImxlc3NUaGFuT3JFcXVhbCIsImluc2VydEFmdGVyIiwiZ3JlYXRlclRoYW4iLCJzcGxpY2UiLCJtb25nb2RiVXJpIiwicGFyc2UiLCJkYXRhYmFzZSIsImFkbWluIiwiY29tbWFuZCIsImlzbWFzdGVyIiwic2V0TmFtZSIsImxhc3RPcGxvZ0VudHJ5Iiwib3Bsb2dTZWxlY3RvciIsIl9tYXliZVN0YXJ0V29ya2VyIiwicmV0dXJuIiwiaXNFbXB0eSIsInBvcCIsImNsZWFyIiwiX3NldExhc3RQcm9jZXNzZWRUUyIsInNoaWZ0IiwiSlNPTiIsImZpcmUiLCJzZXF1ZW5jZXIiLCJfZGVmaW5lVG9vRmFyQmVoaW5kIiwiX3Jlc2V0VG9vRmFyQmVoaW5kIiwiRmFjdHMiLCJpbmNyZW1lbnRTZXJ2ZXJGYWN0IiwiX29yZGVyZWQiLCJfb25TdG9wIiwiX3F1ZXVlIiwiX1N5bmNocm9ub3VzUXVldWUiLCJfaGFuZGxlcyIsIl9jYWNoZSIsIl9DYWNoaW5nQ2hhbmdlT2JzZXJ2ZXIiLCJfYWRkSGFuZGxlVGFza3NTY2hlZHVsZWRCdXROb3RQZXJmb3JtZWQiLCJjYWxsYmFja05hbWVzIiwiY2FsbGJhY2tOYW1lIiwiX2FwcGx5Q2FsbGJhY2siLCJ0b0FycmF5IiwiaGFuZGxlIiwic2FmZVRvUnVuVGFzayIsInJ1blRhc2siLCJfc2VuZEFkZHMiLCJyZW1vdmVIYW5kbGUiLCJfcmVhZHkiLCJfc3RvcCIsImZyb21RdWVyeUVycm9yIiwicmVhZHkiLCJxdWV1ZVRhc2siLCJxdWVyeUVycm9yIiwidGhyb3ciLCJvbkZsdXNoIiwiaXNSZXNvbHZlZCIsImFyZ3MiLCJhcHBseUNoYW5nZSIsImtleXMiLCJoYW5kbGVJZCIsImFkZCIsIl9hZGRlZEJlZm9yZSIsIl9hZGRlZCIsImRvY3MiLCJuZXh0T2JzZXJ2ZUhhbmRsZUlkIiwiX211bHRpcGxleGVyIiwiYmVmb3JlIiwiRmliZXIiLCJtb25nb0Nvbm5lY3Rpb24iLCJfbW9uZ29Db25uZWN0aW9uIiwiX2NhbGxiYWNrc0ZvckNhY2hlS2V5IiwiY2FjaGVLZXkiLCJjaGVjayIsIlN0cmluZyIsImNsb25lZERvYyIsInJ1biIsIlBPTExJTkdfVEhST1RUTEVfTVMiLCJNRVRFT1JfUE9MTElOR19USFJPVFRMRV9NUyIsIlBPTExJTkdfSU5URVJWQUxfTVMiLCJNRVRFT1JfUE9MTElOR19JTlRFUlZBTF9NUyIsIl9tb25nb0hhbmRsZSIsIl9zdG9wQ2FsbGJhY2tzIiwiX3Jlc3VsdHMiLCJfcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkIiwiX3BlbmRpbmdXcml0ZXMiLCJfZW5zdXJlUG9sbElzU2NoZWR1bGVkIiwidGhyb3R0bGUiLCJfdW50aHJvdHRsZWRFbnN1cmVQb2xsSXNTY2hlZHVsZWQiLCJwb2xsaW5nVGhyb3R0bGVNcyIsIl90YXNrUXVldWUiLCJsaXN0ZW5lcnNIYW5kbGUiLCJwb2xsaW5nSW50ZXJ2YWwiLCJwb2xsaW5nSW50ZXJ2YWxNcyIsIl9wb2xsaW5nSW50ZXJ2YWwiLCJpbnRlcnZhbEhhbmRsZSIsInNldEludGVydmFsIiwiY2xlYXJJbnRlcnZhbCIsIl9wb2xsTW9uZ28iLCJfc3VzcGVuZFBvbGxpbmciLCJfcmVzdW1lUG9sbGluZyIsImZpcnN0IiwibmV3UmVzdWx0cyIsIm9sZFJlc3VsdHMiLCJ3cml0ZXNGb3JDeWNsZSIsImNvZGUiLCJtZXNzYWdlIiwiQXJyYXkiLCJfZGlmZlF1ZXJ5Q2hhbmdlcyIsInciLCJjIiwiUEhBU0UiLCJRVUVSWUlORyIsIkZFVENISU5HIiwiU1RFQURZIiwiU3dpdGNoZWRUb1F1ZXJ5IiwiZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkiLCJjdXJyZW50SWQiLCJfdXNlc09wbG9nIiwiY29tcGFyYXRvciIsImdldENvbXBhcmF0b3IiLCJoZWFwT3B0aW9ucyIsIklkTWFwIiwiX2xpbWl0IiwiX2NvbXBhcmF0b3IiLCJfc29ydGVyIiwiX3VucHVibGlzaGVkQnVmZmVyIiwiTWluTWF4SGVhcCIsIl9wdWJsaXNoZWQiLCJNYXhIZWFwIiwiX3NhZmVBcHBlbmRUb0J1ZmZlciIsIl9zdG9wSGFuZGxlcyIsIl9yZWdpc3RlclBoYXNlQ2hhbmdlIiwiX21hdGNoZXIiLCJfcHJvamVjdGlvbkZuIiwiX2NvbXBpbGVQcm9qZWN0aW9uIiwiX3NoYXJlZFByb2plY3Rpb24iLCJjb21iaW5lSW50b1Byb2plY3Rpb24iLCJfc2hhcmVkUHJvamVjdGlvbkZuIiwiX25lZWRUb0ZldGNoIiwiX2N1cnJlbnRseUZldGNoaW5nIiwiX2ZldGNoR2VuZXJhdGlvbiIsIl9yZXF1ZXJ5V2hlbkRvbmVUaGlzUXVlcnkiLCJfd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeSIsIl9uZWVkVG9Qb2xsUXVlcnkiLCJfcGhhc2UiLCJfaGFuZGxlT3Bsb2dFbnRyeVF1ZXJ5aW5nIiwiX2hhbmRsZU9wbG9nRW50cnlTdGVhZHlPckZldGNoaW5nIiwiZmlyZWQiLCJfb3Bsb2dPYnNlcnZlRHJpdmVycyIsIm9uQmVmb3JlRmlyZSIsImRyaXZlcnMiLCJkcml2ZXIiLCJfcnVuSW5pdGlhbFF1ZXJ5IiwiX2FkZFB1Ymxpc2hlZCIsIm92ZXJmbG93aW5nRG9jSWQiLCJtYXhFbGVtZW50SWQiLCJvdmVyZmxvd2luZ0RvYyIsImVxdWFscyIsInJlbW92ZWQiLCJfYWRkQnVmZmVyZWQiLCJfcmVtb3ZlUHVibGlzaGVkIiwiZW1wdHkiLCJuZXdEb2NJZCIsIm1pbkVsZW1lbnRJZCIsIl9yZW1vdmVCdWZmZXJlZCIsIl9jaGFuZ2VQdWJsaXNoZWQiLCJvbGREb2MiLCJwcm9qZWN0ZWROZXciLCJwcm9qZWN0ZWRPbGQiLCJjaGFuZ2VkIiwiRGlmZlNlcXVlbmNlIiwibWFrZUNoYW5nZWRGaWVsZHMiLCJtYXhCdWZmZXJlZElkIiwiX2FkZE1hdGNoaW5nIiwibWF4UHVibGlzaGVkIiwibWF4QnVmZmVyZWQiLCJ0b1B1Ymxpc2giLCJjYW5BcHBlbmRUb0J1ZmZlciIsImNhbkluc2VydEludG9CdWZmZXIiLCJ0b0J1ZmZlciIsIl9yZW1vdmVNYXRjaGluZyIsIl9oYW5kbGVEb2MiLCJtYXRjaGVzTm93IiwiZG9jdW1lbnRNYXRjaGVzIiwicHVibGlzaGVkQmVmb3JlIiwiYnVmZmVyZWRCZWZvcmUiLCJjYWNoZWRCZWZvcmUiLCJtaW5CdWZmZXJlZCIsInN0YXlzSW5QdWJsaXNoZWQiLCJzdGF5c0luQnVmZmVyIiwiX2ZldGNoTW9kaWZpZWREb2N1bWVudHMiLCJ0aGlzR2VuZXJhdGlvbiIsIndhaXRpbmciLCJmdXQiLCJfYmVTdGVhZHkiLCJ3cml0ZXMiLCJ0b1N0cmluZyIsImlzUmVwbGFjZSIsImNhbkRpcmVjdGx5TW9kaWZ5RG9jIiwibW9kaWZpZXJDYW5CZURpcmVjdGx5QXBwbGllZCIsIl9tb2RpZnkiLCJjYW5CZWNvbWVUcnVlQnlNb2RpZmllciIsImFmZmVjdGVkQnlNb2RpZmllciIsIl9ydW5RdWVyeSIsImluaXRpYWwiLCJfZG9uZVF1ZXJ5aW5nIiwiX3BvbGxRdWVyeSIsIm5ld0J1ZmZlciIsIl9jdXJzb3JGb3JRdWVyeSIsImkiLCJfcHVibGlzaE5ld1Jlc3VsdHMiLCJvcHRpb25zT3ZlcndyaXRlIiwiZGVzY3JpcHRpb24iLCJpZHNUb1JlbW92ZSIsIl9vcGxvZ0VudHJ5SGFuZGxlIiwiX2xpc3RlbmVyc0hhbmRsZSIsInBoYXNlIiwibm93IiwiRGF0ZSIsInRpbWVEaWZmIiwiX3BoYXNlU3RhcnRUaW1lIiwiZGlzYWJsZU9wbG9nIiwiX2Rpc2FibGVPcGxvZyIsIl9jaGVja1N1cHBvcnRlZFByb2plY3Rpb24iLCJoYXNXaGVyZSIsImhhc0dlb1F1ZXJ5IiwibW9kaWZpZXIiLCJvcGVyYXRpb24iLCJmaWVsZCIsImV4cG9ydCIsIkxvY2FsQ29sbGVjdGlvbkRyaXZlciIsImNvbnN0cnVjdG9yIiwibm9Db25uQ29sbGVjdGlvbnMiLCJjcmVhdGUiLCJvcGVuIiwiY29ubiIsImVuc3VyZUNvbGxlY3Rpb24iLCJfbW9uZ29fbGl2ZWRhdGFfY29sbGVjdGlvbnMiLCJjb2xsZWN0aW9ucyIsIlJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIiLCJtb25nb191cmwiLCJtIiwiZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIiLCJvbmNlIiwiY29ubmVjdGlvbk9wdGlvbnMiLCJtb25nb1VybCIsIk1PTkdPX1VSTCIsIk1PTkdPX09QTE9HX1VSTCIsImNvbm5lY3Rpb24iLCJtYW5hZ2VyIiwiaWRHZW5lcmF0aW9uIiwiX2RyaXZlciIsIl9wcmV2ZW50QXV0b3B1Ymxpc2giLCJfbWFrZU5ld0lEIiwic3JjIiwiRERQIiwicmFuZG9tU3RyZWFtIiwiUmFuZG9tIiwiaW5zZWN1cmUiLCJoZXhTdHJpbmciLCJfY29ubmVjdGlvbiIsImlzQ2xpZW50Iiwic2VydmVyIiwiX2NvbGxlY3Rpb24iLCJfbmFtZSIsIl9tYXliZVNldFVwUmVwbGljYXRpb24iLCJkZWZpbmVNdXRhdGlvbk1ldGhvZHMiLCJfZGVmaW5lTXV0YXRpb25NZXRob2RzIiwidXNlRXhpc3RpbmciLCJfc3VwcHJlc3NTYW1lTmFtZUVycm9yIiwiYXV0b3B1Ymxpc2giLCJwdWJsaXNoIiwiaXNfYXV0byIsInJlZ2lzdGVyU3RvcmUiLCJvayIsImJlZ2luVXBkYXRlIiwiYmF0Y2hTaXplIiwicmVzZXQiLCJwYXVzZU9ic2VydmVycyIsIm1zZyIsIm1vbmdvSWQiLCJNb25nb0lEIiwiaWRQYXJzZSIsInJlcGxhY2UiLCIkdW5zZXQiLCIkc2V0IiwiZW5kVXBkYXRlIiwicmVzdW1lT2JzZXJ2ZXJzIiwic2F2ZU9yaWdpbmFscyIsInJldHJpZXZlT3JpZ2luYWxzIiwiZ2V0RG9jIiwiX2dldENvbGxlY3Rpb24iLCJjb25zb2xlIiwid2FybiIsImxvZyIsIl9nZXRGaW5kU2VsZWN0b3IiLCJfZ2V0RmluZE9wdGlvbnMiLCJNYXRjaCIsIk9wdGlvbmFsIiwiT2JqZWN0SW5jbHVkaW5nIiwiT25lT2YiLCJOdW1iZXIiLCJmYWxsYmFja0lkIiwiX3NlbGVjdG9ySXNJZCIsImdldFByb3RvdHlwZU9mIiwiZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyIsImdlbmVyYXRlSWQiLCJfaXNSZW1vdGVDb2xsZWN0aW9uIiwiZW5jbG9zaW5nIiwiX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uIiwiY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdCIsIndyYXBDYWxsYmFjayIsIl9jYWxsTXV0YXRvck1ldGhvZCIsIm9wdGlvbnNBbmRDYWxsYmFjayIsInBvcENhbGxiYWNrRnJvbUFyZ3MiLCJyYXdEYXRhYmFzZSIsImNvbnZlcnRSZXN1bHQiLCJBbGxvd0RlbnkiLCJDb2xsZWN0aW9uUHJvdG90eXBlIiwic2V0Q29ubmVjdGlvbk9wdGlvbnMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBOzs7Ozs7OztBQVNBLElBQUlBLFVBQVVDLGdCQUFkOztBQUNBLElBQUlDLFNBQVNDLElBQUlDLE9BQUosQ0FBWSxlQUFaLENBQWI7O0FBRUFDLGlCQUFpQixFQUFqQjtBQUNBQyxZQUFZLEVBQVo7QUFFQUQsZUFBZUUsVUFBZixHQUE0QjtBQUMxQkMsV0FBUztBQUNQQyxhQUFTQyx1QkFERjtBQUVQQyxZQUFRWDtBQUZEO0FBRGlCLENBQTVCLEMsQ0FPQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQUssZUFBZU8sU0FBZixHQUEyQlosT0FBM0IsQyxDQUVBO0FBQ0E7O0FBQ0EsSUFBSWEsZUFBZSxVQUFVQyxNQUFWLEVBQWtCQyxLQUFsQixFQUF5QjtBQUMxQyxNQUFJLE9BQU9BLEtBQVAsS0FBaUIsUUFBakIsSUFBNkJBLFVBQVUsSUFBM0MsRUFBaUQ7QUFDL0Ms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SyxNQUFOLEdBQWVuRSxnQkFBZ0JtRSxNQUEvQjtBQUVBOzs7O0FBR0FuSyxNQUFNOEssVUFBTixDQUFpQlgsTUFBakIsR0FBMEJuSyxNQUFNbUssTUFBaEM7QUFFQTs7OztBQUdBbkssTUFBTThLLFVBQU4sQ0FBaUIvSyxRQUFqQixHQUE0QkMsTUFBTUQsUUFBbEM7QUFFQTs7OztBQUdBMkMsT0FBT29JLFVBQVAsR0FBb0I5SyxNQUFNOEssVUFBMUIsQyxDQUVBOztBQUNBckosT0FBT0MsTUFBUCxDQUNFZ0IsT0FBT29JLFVBQVAsQ0FBa0IxTCxTQURwQixFQUVFd3FCLFVBQVVDLG1CQUZaOztBQUtBLFNBQVNKLG1CQUFULENBQTZCbFEsSUFBN0IsRUFBbUM7QUFDakM7QUFDQTtBQUNBLE1BQUlBLEtBQUtyUSxNQUFMLEtBQ0NxUSxLQUFLQSxLQUFLclEsTUFBTCxHQUFjLENBQW5CLE1BQTBCN0ksU0FBMUIsSUFDQWtaLEtBQUtBLEtBQUtyUSxNQUFMLEdBQWMsQ0FBbkIsYUFBaUN4QixRQUZsQyxDQUFKLEVBRWlEO0FBQy9DLFdBQU82UixLQUFLckMsR0FBTCxFQUFQO0FBQ0Q7QUFDRixDOzs7Ozs7Ozs7OztBQ3p3QkQ7Ozs7OztBQU1BbFgsTUFBTThwQixvQkFBTixHQUE2QixTQUFTQSxvQkFBVCxDQUErQjNvQixPQUEvQixFQUF3QztBQUNuRW9aLFFBQU1wWixPQUFOLEVBQWVNLE1BQWY7QUFDQXpCLFFBQU0rQixrQkFBTixHQUEyQlosT0FBM0I7QUFDRCxDQUhELEMiLCJmaWxlIjoiL3BhY2thZ2VzL21vbmdvLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBQcm92aWRlIGEgc3luY2hyb25vdXMgQ29sbGVjdGlvbiBBUEkgdXNpbmcgZmliZXJzLCBiYWNrZWQgYnlcbiAqIE1vbmdvREIuICBUaGlzIGlzIG9ubHkgZm9yIHVzZSBvbiB0aGUgc2VydmVyLCBhbmQgbW9zdGx5IGlkZW50aWNhbFxuICogdG8gdGhlIGNsaWVudCBBUEkuXG4gKlxuICogTk9URTogdGhlIHB1YmxpYyBBUEkgbWV0aG9kcyBtdXN0IGJlIHJ1biB3aXRoaW4gYSBmaWJlci4gSWYgeW91IGNhbGxcbiAqIHRoZXNlIG91dHNpZGUgb2YgYSBmaWJlciB0aGV5IHdpbGwgZXhwbG9kZSFcbiAqL1xuXG52YXIgTW9uZ29EQiA9IE5wbU1vZHVsZU1vbmdvZGI7XG52YXIgRnV0dXJlID0gTnBtLnJlcXVpcmUoJ2ZpYmVycy9mdXR1cmUnKTtcblxuTW9uZ29JbnRlcm5hbHMgPSB7fTtcbk1vbmdvVGVzdCA9IHt9O1xuXG5Nb25nb0ludGVybmFscy5OcG1Nb2R1bGVzID0ge1xuICBtb25nb2RiOiB7XG4gICAgdmVyc2lvbjogTnBtTW9kdWxlTW9uZ29kYlZlcnNpb24sXG4gICAgbW9kdWxlOiBNb25nb0RCXG4gIH1cbn07XG5cbi8vIE9sZGVyIHZlcnNpb24gb2Ygd2hhdCBpcyBub3cgYXZhaWxhYmxlIHZpYVxuLy8gTW9uZ29JbnRlcm5hbHMuTnBtTW9kdWxlcy5tb25nb2RiLm1vZHVsZS4gIEl0IHdhcyBuZXZlciBkb2N1bWVudGVkLCBidXRcbi8vIHBlb3BsZSBkbyB1c2UgaXQuXG4vLyBYWFggQ09NUEFUIFdJVEggMS4wLjMuMlxuTW9uZ29JbnRlcm5hbHMuTnBtTW9kdWxlID0gTW9uZ29EQjtcblxuLy8gVGhpcyBpcyB1c2VkIHRvIGFkZCBvciByZW1vdmUgRUpTT04gZnJvbSB0aGUgYmVnaW5uaW5nIG9mIGV2ZXJ5dGhpbmcgbmVzdGVkXG4vLyBpbnNpZGUgYW4gRUpTT04gY3VzdG9tIHR5cGUuIEl0IHNob3VsZCBvbmx5IGJlIGNhbGxlZCBvbiBwdXJlIEpTT04hXG52YXIgcmVwbGFjZU5hbWVzID0gZnVuY3Rpb24gKGZpbHRlciwgdGhpbmcpIHtcbiAgaWYgKHR5cGVvZiB0aGluZyA9PT0gXCJvYmplY3RcIiAmJiB0aGluZyAhPT0gbnVsbCkge1xuICAgIGlmIChfLmlzQXJyYXkodGhpbmcpKSB7XG4gICAgICByZXR1cm4gXy5tYXAodGhpbmcsIF8uYmluZChyZXBsYWNlTmFtZXMsIG51bGwsIGZpbHRlcikpO1xuICAgIH1cbiAgICB2YXIgcmV0ID0ge307XG4gICAgXy5lYWNoKHRoaW5nLCBmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgcmV0W2ZpbHRlcihrZXkpXSA9IHJlcGxhY2VOYW1lcyhmaWx0ZXIsIHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmV0O1xuICB9XG4gIHJldHVybiB0aGluZztcbn07XG5cbi8vIEVuc3VyZSB0aGF0IEVKU09OLmNsb25lIGtlZXBzIGEgVGltZXN0YW1wIGFzIGEgVGltZXN0YW1wIChpbnN0ZWFkIG9mIGp1c3Rcbi8vIGRvaW5nIGEgc3RydWN0dXJhbCBjbG9uZSkuXG4vLyBYWFggaG93IG9rIGlzIHRoaXM/IHdoYXQgaWYgdGhlcmUgYXJlIG11bHRpcGxlIGNvcGllcyBvZiBNb25nb0RCIGxvYWRlZD9cbk1vbmdvREIuVGltZXN0YW1wLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gVGltZXN0YW1wcyBzaG91bGQgYmUgaW1tdXRhYmxlLlxuICByZXR1cm4gdGhpcztcbn07XG5cbnZhciBtYWtlTW9uZ29MZWdhbCA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBcIkVKU09OXCIgKyBuYW1lOyB9O1xudmFyIHVubWFrZU1vbmdvTGVnYWwgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gbmFtZS5zdWJzdHIoNSk7IH07XG5cbnZhciByZXBsYWNlTW9uZ29BdG9tV2l0aE1ldGVvciA9IGZ1bmN0aW9uIChkb2N1bWVudCkge1xuICBpZiAoZG9jdW1lbnQgaW5zdGFuY2VvZiBNb25nb0RCLkJpbmFyeSkge1xuICAgIHZhciBidWZmZXIgPSBkb2N1bWVudC52YWx1ZSh0cnVlKTtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKTtcbiAgfVxuICBpZiAoZG9jdW1lbnQgaW5zdGFuY2VvZiBNb25nb0RCLk9iamVjdElEKSB7XG4gICAgcmV0dXJuIG5ldyBNb25nby5PYmplY3RJRChkb2N1bWVudC50b0hleFN0cmluZygpKTtcbiAgfVxuICBpZiAoZG9jdW1lbnRbXCJFSlNPTiR0eXBlXCJdICYmIGRvY3VtZW50W1wiRUpTT04kdmFsdWVcIl0gJiYgXy5zaXplKGRvY3VtZW50KSA9PT0gMikge1xuICAgIHJldHVybiBFSlNPTi5mcm9tSlNPTlZhbHVlKHJlcGxhY2VOYW1lcyh1bm1ha2VNb25nb0xlZ2FsLCBkb2N1bWVudCkpO1xuICB9XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIE1vbmdvREIuVGltZXN0YW1wKSB7XG4gICAgLy8gRm9yIG5vdywgdGhlIE1ldGVvciByZXByZXNlbnRhdGlvbiBvZiBhIE1vbmdvIHRpbWVzdGFtcCB0eXBlIChub3QgYSBkYXRlIVxuICAgIC8vIHRoaXMgaXMgYSB3ZWlyZCBpbnRlcm5hbCB0aGluZyB1c2VkIGluIHRoZSBvcGxvZyEpIGlzIHRoZSBzYW1lIGFzIHRoZVxuICAgIC8vIE1vbmdvIHJlcHJlc2VudGF0aW9uLiBXZSBuZWVkIHRvIGRvIHRoaXMgZXhwbGljaXRseSBvciBlbHNlIHdlIHdvdWxkIGRvIGFcbiAgICAvLyBzdHJ1Y3R1cmFsIGNsb25lIGFuZCBsb3NlIHRoZSBwcm90b3R5cGUuXG4gICAgcmV0dXJuIGRvY3VtZW50O1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG52YXIgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28gPSBmdW5jdGlvbiAoZG9jdW1lbnQpIHtcbiAgaWYgKEVKU09OLmlzQmluYXJ5KGRvY3VtZW50KSkge1xuICAgIC8vIFRoaXMgZG9lcyBtb3JlIGNvcGllcyB0aGFuIHdlJ2QgbGlrZSwgYnV0IGlzIG5lY2Vzc2FyeSBiZWNhdXNlXG4gICAgLy8gTW9uZ29EQi5CU09OIG9ubHkgbG9va3MgbGlrZSBpdCB0YWtlcyBhIFVpbnQ4QXJyYXkgKGFuZCBkb2Vzbid0IGFjdHVhbGx5XG4gICAgLy8gc2VyaWFsaXplIGl0IGNvcnJlY3RseSkuXG4gICAgcmV0dXJuIG5ldyBNb25nb0RCLkJpbmFyeShCdWZmZXIuZnJvbShkb2N1bWVudCkpO1xuICB9XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIE1vbmdvLk9iamVjdElEKSB7XG4gICAgcmV0dXJuIG5ldyBNb25nb0RCLk9iamVjdElEKGRvY3VtZW50LnRvSGV4U3RyaW5nKCkpO1xuICB9XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIE1vbmdvREIuVGltZXN0YW1wKSB7XG4gICAgLy8gRm9yIG5vdywgdGhlIE1ldGVvciByZXByZXNlbnRhdGlvbiBvZiBhIE1vbmdvIHRpbWVzdGFtcCB0eXBlIChub3QgYSBkYXRlIVxuICAgIC8vIHRoaXMgaXMgYSB3ZWlyZCBpbnRlcm5hbCB0aGluZyB1c2VkIGluIHRoZSBvcGxvZyEpIGlzIHRoZSBzYW1lIGFzIHRoZVxuICAgIC8vIE1vbmdvIHJlcHJlc2VudGF0aW9uLiBXZSBuZWVkIHRvIGRvIHRoaXMgZXhwbGljaXRseSBvciBlbHNlIHdlIHdvdWxkIGRvIGFcbiAgICAvLyBzdHJ1Y3R1cmFsIGNsb25lIGFuZCBsb3NlIHRoZSBwcm90b3R5cGUuXG4gICAgcmV0dXJuIGRvY3VtZW50O1xuICB9XG4gIGlmIChFSlNPTi5faXNDdXN0b21UeXBlKGRvY3VtZW50KSkge1xuICAgIHJldHVybiByZXBsYWNlTmFtZXMobWFrZU1vbmdvTGVnYWwsIEVKU09OLnRvSlNPTlZhbHVlKGRvY3VtZW50KSk7XG4gIH1cbiAgLy8gSXQgaXMgbm90IG9yZGluYXJpbHkgcG9zc2libGUgdG8gc3RpY2sgZG9sbGFyLXNpZ24ga2V5cyBpbnRvIG1vbmdvXG4gIC8vIHNvIHdlIGRvbid0IGJvdGhlciBjaGVja2luZyBmb3IgdGhpbmdzIHRoYXQgbmVlZCBlc2NhcGluZyBhdCB0aGlzIHRpbWUuXG4gIHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG52YXIgcmVwbGFjZVR5cGVzID0gZnVuY3Rpb24gKGRvY3VtZW50LCBhdG9tVHJhbnNmb3JtZXIpIHtcbiAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ29iamVjdCcgfHwgZG9jdW1lbnQgPT09IG51bGwpXG4gICAgcmV0dXJuIGRvY3VtZW50O1xuXG4gIHZhciByZXBsYWNlZFRvcExldmVsQXRvbSA9IGF0b21UcmFuc2Zvcm1lcihkb2N1bWVudCk7XG4gIGlmIChyZXBsYWNlZFRvcExldmVsQXRvbSAhPT0gdW5kZWZpbmVkKVxuICAgIHJldHVybiByZXBsYWNlZFRvcExldmVsQXRvbTtcblxuICB2YXIgcmV0ID0gZG9jdW1lbnQ7XG4gIF8uZWFjaChkb2N1bWVudCwgZnVuY3Rpb24gKHZhbCwga2V5KSB7XG4gICAgdmFyIHZhbFJlcGxhY2VkID0gcmVwbGFjZVR5cGVzKHZhbCwgYXRvbVRyYW5zZm9ybWVyKTtcbiAgICBpZiAodmFsICE9PSB2YWxSZXBsYWNlZCkge1xuICAgICAgLy8gTGF6eSBjbG9uZS4gU2hhbGxvdyBjb3B5LlxuICAgICAgaWYgKHJldCA9PT0gZG9jdW1lbnQpXG4gICAgICAgIHJldCA9IF8uY2xvbmUoZG9jdW1lbnQpO1xuICAgICAgcmV0W2tleV0gPSB2YWxSZXBsYWNlZDtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gcmV0O1xufTtcblxuXG5Nb25nb0Nvbm5lY3Rpb24gPSBmdW5jdGlvbiAodXJsLCBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHNlbGYuX29ic2VydmVNdWx0aXBsZXhlcnMgPSB7fTtcbiAgc2VsZi5fb25GYWlsb3Zlckhvb2sgPSBuZXcgSG9vaztcblxuICB2YXIgbW9uZ29PcHRpb25zID0gT2JqZWN0LmFzc2lnbih7XG4gICAgLy8gUmVjb25uZWN0IG9uIGVycm9yLlxuICAgIGF1dG9SZWNvbm5lY3Q6IHRydWUsXG4gICAgLy8gVHJ5IHRvIHJlY29ubmVjdCBmb3JldmVyLCBpbnN0ZWFkIG9mIHN0b3BwaW5nIGFmdGVyIDMwIHRyaWVzICh0aGVcbiAgICAvLyBkZWZhdWx0KSwgd2l0aCBlYWNoIGF0dGVtcHQgc2VwYXJhdGVkIGJ5IDEwMDBtcy5cbiAgICByZWNvbm5lY3RUcmllczogSW5maW5pdHksXG4gICAgaWdub3JlVW5kZWZpbmVkOiB0cnVlXG4gIH0sIE1vbmdvLl9jb25uZWN0aW9uT3B0aW9ucyk7XG5cbiAgLy8gRGlzYWJsZSB0aGUgbmF0aXZlIHBhcnNlciBieSBkZWZhdWx0LCB1bmxlc3Mgc3BlY2lmaWNhbGx5IGVuYWJsZWRcbiAgLy8gaW4gdGhlIG1vbmdvIFVSTC5cbiAgLy8gLSBUaGUgbmF0aXZlIGRyaXZlciBjYW4gY2F1c2UgZXJyb3JzIHdoaWNoIG5vcm1hbGx5IHdvdWxkIGJlXG4gIC8vICAgdGhyb3duLCBjYXVnaHQsIGFuZCBoYW5kbGVkIGludG8gc2VnZmF1bHRzIHRoYXQgdGFrZSBkb3duIHRoZVxuICAvLyAgIHdob2xlIGFwcC5cbiAgLy8gLSBCaW5hcnkgbW9kdWxlcyBkb24ndCB5ZXQgd29yayB3aGVuIHlvdSBidW5kbGUgYW5kIG1vdmUgdGhlIGJ1bmRsZVxuICAvLyAgIHRvIGEgZGlmZmVyZW50IHBsYXRmb3JtIChha2EgZGVwbG95KVxuICAvLyBXZSBzaG91bGQgcmV2aXNpdCB0aGlzIGFmdGVyIGJpbmFyeSBucG0gbW9kdWxlIHN1cHBvcnQgbGFuZHMuXG4gIGlmICghKC9bXFw/Jl1uYXRpdmVfP1twUF1hcnNlcj0vLnRlc3QodXJsKSkpIHtcbiAgICBtb25nb09wdGlvbnMubmF0aXZlX3BhcnNlciA9IGZhbHNlO1xuICB9XG5cbiAgLy8gSW50ZXJuYWxseSB0aGUgb3Bsb2cgY29ubmVjdGlvbnMgc3BlY2lmeSB0aGVpciBvd24gcG9vbFNpemVcbiAgLy8gd2hpY2ggd2UgZG9uJ3Qgd2FudCB0byBvdmVyd3JpdGUgd2l0aCBhbnkgdXNlciBkZWZpbmVkIHZhbHVlXG4gIGlmIChfLmhhcyhvcHRpb25zLCAncG9vbFNpemUnKSkge1xuICAgIC8vIElmIHdlIGp1c3Qgc2V0IHRoaXMgZm9yIFwic2VydmVyXCIsIHJlcGxTZXQgd2lsbCBvdmVycmlkZSBpdC4gSWYgd2UganVzdFxuICAgIC8vIHNldCBpdCBmb3IgcmVwbFNldCwgaXQgd2lsbCBiZSBpZ25vcmVkIGlmIHdlJ3JlIG5vdCB1c2luZyBhIHJlcGxTZXQuXG4gICAgbW9uZ29PcHRpb25zLnBvb2xTaXplID0gb3B0aW9ucy5wb29sU2l6ZTtcbiAgfVxuXG4gIHNlbGYuZGIgPSBudWxsO1xuICAvLyBXZSBrZWVwIHRyYWNrIG9mIHRoZSBSZXBsU2V0J3MgcHJpbWFyeSwgc28gdGhhdCB3ZSBjYW4gdHJpZ2dlciBob29rcyB3aGVuXG4gIC8vIGl0IGNoYW5nZXMuICBUaGUgTm9kZSBkcml2ZXIncyBqb2luZWQgY2FsbGJhY2sgc2VlbXMgdG8gZmlyZSB3YXkgdG9vXG4gIC8vIG9mdGVuLCB3aGljaCBpcyB3aHkgd2UgbmVlZCB0byB0cmFjayBpdCBvdXJzZWx2ZXMuXG4gIHNlbGYuX3ByaW1hcnkgPSBudWxsO1xuICBzZWxmLl9vcGxvZ0hhbmRsZSA9IG51bGw7XG4gIHNlbGYuX2RvY0ZldGNoZXIgPSBudWxsO1xuXG5cbiAgdmFyIGNvbm5lY3RGdXR1cmUgPSBuZXcgRnV0dXJlO1xuICBNb25nb0RCLmNvbm5lY3QoXG4gICAgdXJsLFxuICAgIG1vbmdvT3B0aW9ucyxcbiAgICBNZXRlb3IuYmluZEVudmlyb25tZW50KFxuICAgICAgZnVuY3Rpb24gKGVyciwgY2xpZW50KSB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZGIgPSBjbGllbnQuZGIoKTtcblxuICAgICAgICAvLyBGaXJzdCwgZmlndXJlIG91dCB3aGF0IHRoZSBjdXJyZW50IHByaW1hcnkgaXMsIGlmIGFueS5cbiAgICAgICAgaWYgKGRiLnNlcnZlckNvbmZpZy5pc01hc3RlckRvYykge1xuICAgICAgICAgIHNlbGYuX3ByaW1hcnkgPSBkYi5zZXJ2ZXJDb25maWcuaXNNYXN0ZXJEb2MucHJpbWFyeTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRiLnNlcnZlckNvbmZpZy5vbihcbiAgICAgICAgICAnam9pbmVkJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChmdW5jdGlvbiAoa2luZCwgZG9jKSB7XG4gICAgICAgICAgICBpZiAoa2luZCA9PT0gJ3ByaW1hcnknKSB7XG4gICAgICAgICAgICAgIGlmIChkb2MucHJpbWFyeSAhPT0gc2VsZi5fcHJpbWFyeSkge1xuICAgICAgICAgICAgICAgIHNlbGYuX3ByaW1hcnkgPSBkb2MucHJpbWFyeTtcbiAgICAgICAgICAgICAgICBzZWxmLl9vbkZhaWxvdmVySG9vay5lYWNoKGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRvYy5tZSA9PT0gc2VsZi5fcHJpbWFyeSkge1xuICAgICAgICAgICAgICAvLyBUaGUgdGhpbmcgd2UgdGhvdWdodCB3YXMgcHJpbWFyeSBpcyBub3cgc29tZXRoaW5nIG90aGVyIHRoYW5cbiAgICAgICAgICAgICAgLy8gcHJpbWFyeS4gIEZvcmdldCB0aGF0IHdlIHRob3VnaHQgaXQgd2FzIHByaW1hcnkuICAoVGhpcyBtZWFuc1xuICAgICAgICAgICAgICAvLyB0aGF0IGlmIGEgc2VydmVyIHN0b3BzIGJlaW5nIHByaW1hcnkgYW5kIHRoZW4gc3RhcnRzIGJlaW5nXG4gICAgICAgICAgICAgIC8vIHByaW1hcnkgYWdhaW4gd2l0aG91dCBhbm90aGVyIHNlcnZlciBiZWNvbWluZyBwcmltYXJ5IGluIHRoZVxuICAgICAgICAgICAgICAvLyBtaWRkbGUsIHdlJ2xsIGNvcnJlY3RseSBjb3VudCBpdCBhcyBhIGZhaWxvdmVyLilcbiAgICAgICAgICAgICAgc2VsZi5fcHJpbWFyeSA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkpO1xuXG4gICAgICAgIC8vIEFsbG93IHRoZSBjb25zdHJ1Y3RvciB0byByZXR1cm4uXG4gICAgICAgIGNvbm5lY3RGdXR1cmVbJ3JldHVybiddKHsgY2xpZW50LCBkYiB9KTtcbiAgICAgIH0sXG4gICAgICBjb25uZWN0RnV0dXJlLnJlc29sdmVyKCkgIC8vIG9uRXhjZXB0aW9uXG4gICAgKVxuICApO1xuXG4gIC8vIFdhaXQgZm9yIHRoZSBjb25uZWN0aW9uIHRvIGJlIHN1Y2Nlc3NmdWwgKHRocm93cyBvbiBmYWlsdXJlKSBhbmQgYXNzaWduIHRoZVxuICAvLyByZXN1bHRzIChgY2xpZW50YCBhbmQgYGRiYCkgdG8gYHNlbGZgLlxuICBPYmplY3QuYXNzaWduKHNlbGYsIGNvbm5lY3RGdXR1cmUud2FpdCgpKTtcblxuICBpZiAob3B0aW9ucy5vcGxvZ1VybCAmJiAhIFBhY2thZ2VbJ2Rpc2FibGUtb3Bsb2cnXSkge1xuICAgIHNlbGYuX29wbG9nSGFuZGxlID0gbmV3IE9wbG9nSGFuZGxlKG9wdGlvbnMub3Bsb2dVcmwsIHNlbGYuZGIuZGF0YWJhc2VOYW1lKTtcbiAgICBzZWxmLl9kb2NGZXRjaGVyID0gbmV3IERvY0ZldGNoZXIoc2VsZik7XG4gIH1cbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICghIHNlbGYuZGIpXG4gICAgdGhyb3cgRXJyb3IoXCJjbG9zZSBjYWxsZWQgYmVmb3JlIENvbm5lY3Rpb24gY3JlYXRlZD9cIik7XG5cbiAgLy8gWFhYIHByb2JhYmx5IHVudGVzdGVkXG4gIHZhciBvcGxvZ0hhbmRsZSA9IHNlbGYuX29wbG9nSGFuZGxlO1xuICBzZWxmLl9vcGxvZ0hhbmRsZSA9IG51bGw7XG4gIGlmIChvcGxvZ0hhbmRsZSlcbiAgICBvcGxvZ0hhbmRsZS5zdG9wKCk7XG5cbiAgLy8gVXNlIEZ1dHVyZS53cmFwIHNvIHRoYXQgZXJyb3JzIGdldCB0aHJvd24uIFRoaXMgaGFwcGVucyB0b1xuICAvLyB3b3JrIGV2ZW4gb3V0c2lkZSBhIGZpYmVyIHNpbmNlIHRoZSAnY2xvc2UnIG1ldGhvZCBpcyBub3RcbiAgLy8gYWN0dWFsbHkgYXN5bmNocm9ub3VzLlxuICBGdXR1cmUud3JhcChfLmJpbmQoc2VsZi5jbGllbnQuY2xvc2UsIHNlbGYuY2xpZW50KSkodHJ1ZSkud2FpdCgpO1xufTtcblxuLy8gUmV0dXJucyB0aGUgTW9uZ28gQ29sbGVjdGlvbiBvYmplY3Q7IG1heSB5aWVsZC5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUucmF3Q29sbGVjdGlvbiA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKCEgc2VsZi5kYilcbiAgICB0aHJvdyBFcnJvcihcInJhd0NvbGxlY3Rpb24gY2FsbGVkIGJlZm9yZSBDb25uZWN0aW9uIGNyZWF0ZWQ/XCIpO1xuXG4gIHZhciBmdXR1cmUgPSBuZXcgRnV0dXJlO1xuICBzZWxmLmRiLmNvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUsIGZ1dHVyZS5yZXNvbHZlcigpKTtcbiAgcmV0dXJuIGZ1dHVyZS53YWl0KCk7XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9jcmVhdGVDYXBwZWRDb2xsZWN0aW9uID0gZnVuY3Rpb24gKFxuICAgIGNvbGxlY3Rpb25OYW1lLCBieXRlU2l6ZSwgbWF4RG9jdW1lbnRzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoISBzZWxmLmRiKVxuICAgIHRocm93IEVycm9yKFwiX2NyZWF0ZUNhcHBlZENvbGxlY3Rpb24gY2FsbGVkIGJlZm9yZSBDb25uZWN0aW9uIGNyZWF0ZWQ/XCIpO1xuXG4gIHZhciBmdXR1cmUgPSBuZXcgRnV0dXJlKCk7XG4gIHNlbGYuZGIuY3JlYXRlQ29sbGVjdGlvbihcbiAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICB7IGNhcHBlZDogdHJ1ZSwgc2l6ZTogYnl0ZVNpemUsIG1heDogbWF4RG9jdW1lbnRzIH0sXG4gICAgZnV0dXJlLnJlc29sdmVyKCkpO1xuICBmdXR1cmUud2FpdCgpO1xufTtcblxuLy8gVGhpcyBzaG91bGQgYmUgY2FsbGVkIHN5bmNocm9ub3VzbHkgd2l0aCBhIHdyaXRlLCB0byBjcmVhdGUgYVxuLy8gdHJhbnNhY3Rpb24gb24gdGhlIGN1cnJlbnQgd3JpdGUgZmVuY2UsIGlmIGFueS4gQWZ0ZXIgd2UgY2FuIHJlYWRcbi8vIHRoZSB3cml0ZSwgYW5kIGFmdGVyIG9ic2VydmVycyBoYXZlIGJlZW4gbm90aWZpZWQgKG9yIGF0IGxlYXN0LFxuLy8gYWZ0ZXIgdGhlIG9ic2VydmVyIG5vdGlmaWVycyBoYXZlIGFkZGVkIHRoZW1zZWx2ZXMgdG8gdGhlIHdyaXRlXG4vLyBmZW5jZSksIHlvdSBzaG91bGQgY2FsbCAnY29tbWl0dGVkKCknIG9uIHRoZSBvYmplY3QgcmV0dXJuZWQuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9tYXliZUJlZ2luV3JpdGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBmZW5jZSA9IEREUFNlcnZlci5fQ3VycmVudFdyaXRlRmVuY2UuZ2V0KCk7XG4gIGlmIChmZW5jZSkge1xuICAgIHJldHVybiBmZW5jZS5iZWdpbldyaXRlKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHtjb21taXR0ZWQ6IGZ1bmN0aW9uICgpIHt9fTtcbiAgfVxufTtcblxuLy8gSW50ZXJuYWwgaW50ZXJmYWNlOiBhZGRzIGEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gdGhlIE1vbmdvIHByaW1hcnlcbi8vIGNoYW5nZXMuIFJldHVybnMgYSBzdG9wIGhhbmRsZS5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX29uRmFpbG92ZXIgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgcmV0dXJuIHRoaXMuX29uRmFpbG92ZXJIb29rLnJlZ2lzdGVyKGNhbGxiYWNrKTtcbn07XG5cblxuLy8vLy8vLy8vLy8vIFB1YmxpYyBBUEkgLy8vLy8vLy8vL1xuXG4vLyBUaGUgd3JpdGUgbWV0aG9kcyBibG9jayB1bnRpbCB0aGUgZGF0YWJhc2UgaGFzIGNvbmZpcm1lZCB0aGUgd3JpdGUgKGl0IG1heVxuLy8gbm90IGJlIHJlcGxpY2F0ZWQgb3Igc3RhYmxlIG9uIGRpc2ssIGJ1dCBvbmUgc2VydmVyIGhhcyBjb25maXJtZWQgaXQpIGlmIG5vXG4vLyBjYWxsYmFjayBpcyBwcm92aWRlZC4gSWYgYSBjYWxsYmFjayBpcyBwcm92aWRlZCwgdGhlbiB0aGV5IGNhbGwgdGhlIGNhbGxiYWNrXG4vLyB3aGVuIHRoZSB3cml0ZSBpcyBjb25maXJtZWQuIFRoZXkgcmV0dXJuIG5vdGhpbmcgb24gc3VjY2VzcywgYW5kIHJhaXNlIGFuXG4vLyBleGNlcHRpb24gb24gZmFpbHVyZS5cbi8vXG4vLyBBZnRlciBtYWtpbmcgYSB3cml0ZSAod2l0aCBpbnNlcnQsIHVwZGF0ZSwgcmVtb3ZlKSwgb2JzZXJ2ZXJzIGFyZVxuLy8gbm90aWZpZWQgYXN5bmNocm9ub3VzbHkuIElmIHlvdSB3YW50IHRvIHJlY2VpdmUgYSBjYWxsYmFjayBvbmNlIGFsbFxuLy8gb2YgdGhlIG9ic2VydmVyIG5vdGlmaWNhdGlvbnMgaGF2ZSBsYW5kZWQgZm9yIHlvdXIgd3JpdGUsIGRvIHRoZVxuLy8gd3JpdGVzIGluc2lkZSBhIHdyaXRlIGZlbmNlIChzZXQgRERQU2VydmVyLl9DdXJyZW50V3JpdGVGZW5jZSB0byBhIG5ld1xuLy8gX1dyaXRlRmVuY2UsIGFuZCB0aGVuIHNldCBhIGNhbGxiYWNrIG9uIHRoZSB3cml0ZSBmZW5jZS4pXG4vL1xuLy8gU2luY2Ugb3VyIGV4ZWN1dGlvbiBlbnZpcm9ubWVudCBpcyBzaW5nbGUtdGhyZWFkZWQsIHRoaXMgaXNcbi8vIHdlbGwtZGVmaW5lZCAtLSBhIHdyaXRlIFwiaGFzIGJlZW4gbWFkZVwiIGlmIGl0J3MgcmV0dXJuZWQsIGFuZCBhblxuLy8gb2JzZXJ2ZXIgXCJoYXMgYmVlbiBub3RpZmllZFwiIGlmIGl0cyBjYWxsYmFjayBoYXMgcmV0dXJuZWQuXG5cbnZhciB3cml0ZUNhbGxiYWNrID0gZnVuY3Rpb24gKHdyaXRlLCByZWZyZXNoLCBjYWxsYmFjaykge1xuICByZXR1cm4gZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG4gICAgaWYgKCEgZXJyKSB7XG4gICAgICAvLyBYWFggV2UgZG9uJ3QgaGF2ZSB0byBydW4gdGhpcyBvbiBlcnJvciwgcmlnaHQ/XG4gICAgICB0cnkge1xuICAgICAgICByZWZyZXNoKCk7XG4gICAgICB9IGNhdGNoIChyZWZyZXNoRXJyKSB7XG4gICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgIGNhbGxiYWNrKHJlZnJlc2hFcnIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyByZWZyZXNoRXJyO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHQpO1xuICAgIH0gZWxzZSBpZiAoZXJyKSB7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9O1xufTtcblxudmFyIGJpbmRFbnZpcm9ubWVudEZvcldyaXRlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIHJldHVybiBNZXRlb3IuYmluZEVudmlyb25tZW50KGNhbGxiYWNrLCBcIk1vbmdvIHdyaXRlXCIpO1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5faW5zZXJ0ID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25fbmFtZSwgZG9jdW1lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2spIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBzZW5kRXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChjYWxsYmFjaylcbiAgICAgIHJldHVybiBjYWxsYmFjayhlKTtcbiAgICB0aHJvdyBlO1xuICB9O1xuXG4gIGlmIChjb2xsZWN0aW9uX25hbWUgPT09IFwiX19fbWV0ZW9yX2ZhaWx1cmVfdGVzdF9jb2xsZWN0aW9uXCIpIHtcbiAgICB2YXIgZSA9IG5ldyBFcnJvcihcIkZhaWx1cmUgdGVzdFwiKTtcbiAgICBlLl9leHBlY3RlZEJ5VGVzdCA9IHRydWU7XG4gICAgc2VuZEVycm9yKGUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICghKExvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChkb2N1bWVudCkgJiZcbiAgICAgICAgIUVKU09OLl9pc0N1c3RvbVR5cGUoZG9jdW1lbnQpKSkge1xuICAgIHNlbmRFcnJvcihuZXcgRXJyb3IoXG4gICAgICBcIk9ubHkgcGxhaW4gb2JqZWN0cyBtYXkgYmUgaW5zZXJ0ZWQgaW50byBNb25nb0RCXCIpKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgd3JpdGUgPSBzZWxmLl9tYXliZUJlZ2luV3JpdGUoKTtcbiAgdmFyIHJlZnJlc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgTWV0ZW9yLnJlZnJlc2goe2NvbGxlY3Rpb246IGNvbGxlY3Rpb25fbmFtZSwgaWQ6IGRvY3VtZW50Ll9pZCB9KTtcbiAgfTtcbiAgY2FsbGJhY2sgPSBiaW5kRW52aXJvbm1lbnRGb3JXcml0ZSh3cml0ZUNhbGxiYWNrKHdyaXRlLCByZWZyZXNoLCBjYWxsYmFjaykpO1xuICB0cnkge1xuICAgIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25fbmFtZSk7XG4gICAgY29sbGVjdGlvbi5pbnNlcnQocmVwbGFjZVR5cGVzKGRvY3VtZW50LCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyksXG4gICAgICAgICAgICAgICAgICAgICAge3NhZmU6IHRydWV9LCBjYWxsYmFjayk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgIHRocm93IGVycjtcbiAgfVxufTtcblxuLy8gQ2F1c2UgcXVlcmllcyB0aGF0IG1heSBiZSBhZmZlY3RlZCBieSB0aGUgc2VsZWN0b3IgdG8gcG9sbCBpbiB0aGlzIHdyaXRlXG4vLyBmZW5jZS5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX3JlZnJlc2ggPSBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIHNlbGVjdG9yKSB7XG4gIHZhciByZWZyZXNoS2V5ID0ge2NvbGxlY3Rpb246IGNvbGxlY3Rpb25OYW1lfTtcbiAgLy8gSWYgd2Uga25vdyB3aGljaCBkb2N1bWVudHMgd2UncmUgcmVtb3ZpbmcsIGRvbid0IHBvbGwgcXVlcmllcyB0aGF0IGFyZVxuICAvLyBzcGVjaWZpYyB0byBvdGhlciBkb2N1bWVudHMuIChOb3RlIHRoYXQgbXVsdGlwbGUgbm90aWZpY2F0aW9ucyBoZXJlIHNob3VsZFxuICAvLyBub3QgY2F1c2UgbXVsdGlwbGUgcG9sbHMsIHNpbmNlIGFsbCBvdXIgbGlzdGVuZXIgaXMgZG9pbmcgaXMgZW5xdWV1ZWluZyBhXG4gIC8vIHBvbGwuKVxuICB2YXIgc3BlY2lmaWNJZHMgPSBMb2NhbENvbGxlY3Rpb24uX2lkc01hdGNoZWRCeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgaWYgKHNwZWNpZmljSWRzKSB7XG4gICAgXy5lYWNoKHNwZWNpZmljSWRzLCBmdW5jdGlvbiAoaWQpIHtcbiAgICAgIE1ldGVvci5yZWZyZXNoKF8uZXh0ZW5kKHtpZDogaWR9LCByZWZyZXNoS2V5KSk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgTWV0ZW9yLnJlZnJlc2gocmVmcmVzaEtleSk7XG4gIH1cbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX3JlbW92ZSA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uX25hbWUsIHNlbGVjdG9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoY29sbGVjdGlvbl9uYW1lID09PSBcIl9fX21ldGVvcl9mYWlsdXJlX3Rlc3RfY29sbGVjdGlvblwiKSB7XG4gICAgdmFyIGUgPSBuZXcgRXJyb3IoXCJGYWlsdXJlIHRlc3RcIik7XG4gICAgZS5fZXhwZWN0ZWRCeVRlc3QgPSB0cnVlO1xuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuXG4gIHZhciB3cml0ZSA9IHNlbGYuX21heWJlQmVnaW5Xcml0ZSgpO1xuICB2YXIgcmVmcmVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICBzZWxmLl9yZWZyZXNoKGNvbGxlY3Rpb25fbmFtZSwgc2VsZWN0b3IpO1xuICB9O1xuICBjYWxsYmFjayA9IGJpbmRFbnZpcm9ubWVudEZvcldyaXRlKHdyaXRlQ2FsbGJhY2sod3JpdGUsIHJlZnJlc2gsIGNhbGxiYWNrKSk7XG5cbiAgdHJ5IHtcbiAgICB2YXIgY29sbGVjdGlvbiA9IHNlbGYucmF3Q29sbGVjdGlvbihjb2xsZWN0aW9uX25hbWUpO1xuICAgIHZhciB3cmFwcGVkQ2FsbGJhY2sgPSBmdW5jdGlvbihlcnIsIGRyaXZlclJlc3VsdCkge1xuICAgICAgY2FsbGJhY2soZXJyLCB0cmFuc2Zvcm1SZXN1bHQoZHJpdmVyUmVzdWx0KS5udW1iZXJBZmZlY3RlZCk7XG4gICAgfTtcbiAgICBjb2xsZWN0aW9uLnJlbW92ZShyZXBsYWNlVHlwZXMoc2VsZWN0b3IsIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKSxcbiAgICAgICAgICAgICAgICAgICAgICAge3NhZmU6IHRydWV9LCB3cmFwcGVkQ2FsbGJhY2spO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICB3cml0ZS5jb21taXR0ZWQoKTtcbiAgICB0aHJvdyBlcnI7XG4gIH1cbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX2Ryb3BDb2xsZWN0aW9uID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBjYikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIHdyaXRlID0gc2VsZi5fbWF5YmVCZWdpbldyaXRlKCk7XG4gIHZhciByZWZyZXNoID0gZnVuY3Rpb24gKCkge1xuICAgIE1ldGVvci5yZWZyZXNoKHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZSwgaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGRyb3BDb2xsZWN0aW9uOiB0cnVlfSk7XG4gIH07XG4gIGNiID0gYmluZEVudmlyb25tZW50Rm9yV3JpdGUod3JpdGVDYWxsYmFjayh3cml0ZSwgcmVmcmVzaCwgY2IpKTtcblxuICB0cnkge1xuICAgIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcbiAgICBjb2xsZWN0aW9uLmRyb3AoY2IpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgdGhyb3cgZTtcbiAgfVxufTtcblxuLy8gRm9yIHRlc3Rpbmcgb25seS4gIFNsaWdodGx5IGJldHRlciB0aGFuIGBjLnJhd0RhdGFiYXNlKCkuZHJvcERhdGFiYXNlKClgXG4vLyBiZWNhdXNlIGl0IGxldHMgdGhlIHRlc3QncyBmZW5jZSB3YWl0IGZvciBpdCB0byBiZSBjb21wbGV0ZS5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX2Ryb3BEYXRhYmFzZSA9IGZ1bmN0aW9uIChjYikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIHdyaXRlID0gc2VsZi5fbWF5YmVCZWdpbldyaXRlKCk7XG4gIHZhciByZWZyZXNoID0gZnVuY3Rpb24gKCkge1xuICAgIE1ldGVvci5yZWZyZXNoKHsgZHJvcERhdGFiYXNlOiB0cnVlIH0pO1xuICB9O1xuICBjYiA9IGJpbmRFbnZpcm9ubWVudEZvcldyaXRlKHdyaXRlQ2FsbGJhY2sod3JpdGUsIHJlZnJlc2gsIGNiKSk7XG5cbiAgdHJ5IHtcbiAgICBzZWxmLmRiLmRyb3BEYXRhYmFzZShjYik7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB3cml0ZS5jb21taXR0ZWQoKTtcbiAgICB0aHJvdyBlO1xuICB9XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl91cGRhdGUgPSBmdW5jdGlvbiAoY29sbGVjdGlvbl9uYW1lLCBzZWxlY3RvciwgbW9kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoISBjYWxsYmFjayAmJiBvcHRpb25zIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgb3B0aW9ucyA9IG51bGw7XG4gIH1cblxuICBpZiAoY29sbGVjdGlvbl9uYW1lID09PSBcIl9fX21ldGVvcl9mYWlsdXJlX3Rlc3RfY29sbGVjdGlvblwiKSB7XG4gICAgdmFyIGUgPSBuZXcgRXJyb3IoXCJGYWlsdXJlIHRlc3RcIik7XG4gICAgZS5fZXhwZWN0ZWRCeVRlc3QgPSB0cnVlO1xuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuXG4gIC8vIGV4cGxpY2l0IHNhZmV0eSBjaGVjay4gbnVsbCBhbmQgdW5kZWZpbmVkIGNhbiBjcmFzaCB0aGUgbW9uZ29cbiAgLy8gZHJpdmVyLiBBbHRob3VnaCB0aGUgbm9kZSBkcml2ZXIgYW5kIG1pbmltb25nbyBkbyAnc3VwcG9ydCdcbiAgLy8gbm9uLW9iamVjdCBtb2RpZmllciBpbiB0aGF0IHRoZXkgZG9uJ3QgY3Jhc2gsIHRoZXkgYXJlIG5vdFxuICAvLyBtZWFuaW5nZnVsIG9wZXJhdGlvbnMgYW5kIGRvIG5vdCBkbyBhbnl0aGluZy4gRGVmZW5zaXZlbHkgdGhyb3cgYW5cbiAgLy8gZXJyb3IgaGVyZS5cbiAgaWYgKCFtb2QgfHwgdHlwZW9mIG1vZCAhPT0gJ29iamVjdCcpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBtb2RpZmllci4gTW9kaWZpZXIgbXVzdCBiZSBhbiBvYmplY3QuXCIpO1xuXG4gIGlmICghKExvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChtb2QpICYmXG4gICAgICAgICFFSlNPTi5faXNDdXN0b21UeXBlKG1vZCkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgXCJPbmx5IHBsYWluIG9iamVjdHMgbWF5IGJlIHVzZWQgYXMgcmVwbGFjZW1lbnRcIiArXG4gICAgICAgIFwiIGRvY3VtZW50cyBpbiBNb25nb0RCXCIpO1xuICB9XG5cbiAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge307XG5cbiAgdmFyIHdyaXRlID0gc2VsZi5fbWF5YmVCZWdpbldyaXRlKCk7XG4gIHZhciByZWZyZXNoID0gZnVuY3Rpb24gKCkge1xuICAgIHNlbGYuX3JlZnJlc2goY29sbGVjdGlvbl9uYW1lLCBzZWxlY3Rvcik7XG4gIH07XG4gIGNhbGxiYWNrID0gd3JpdGVDYWxsYmFjayh3cml0ZSwgcmVmcmVzaCwgY2FsbGJhY2spO1xuICB0cnkge1xuICAgIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25fbmFtZSk7XG4gICAgdmFyIG1vbmdvT3B0cyA9IHtzYWZlOiB0cnVlfTtcbiAgICAvLyBleHBsaWN0bHkgZW51bWVyYXRlIG9wdGlvbnMgdGhhdCBtaW5pbW9uZ28gc3VwcG9ydHNcbiAgICBpZiAob3B0aW9ucy51cHNlcnQpIG1vbmdvT3B0cy51cHNlcnQgPSB0cnVlO1xuICAgIGlmIChvcHRpb25zLm11bHRpKSBtb25nb09wdHMubXVsdGkgPSB0cnVlO1xuICAgIC8vIExldHMgeW91IGdldCBhIG1vcmUgbW9yZSBmdWxsIHJlc3VsdCBmcm9tIE1vbmdvREIuIFVzZSB3aXRoIGNhdXRpb246XG4gICAgLy8gbWlnaHQgbm90IHdvcmsgd2l0aCBDLnVwc2VydCAoYXMgb3Bwb3NlZCB0byBDLnVwZGF0ZSh7dXBzZXJ0OnRydWV9KSBvclxuICAgIC8vIHdpdGggc2ltdWxhdGVkIHVwc2VydC5cbiAgICBpZiAob3B0aW9ucy5mdWxsUmVzdWx0KSBtb25nb09wdHMuZnVsbFJlc3VsdCA9IHRydWU7XG5cbiAgICB2YXIgbW9uZ29TZWxlY3RvciA9IHJlcGxhY2VUeXBlcyhzZWxlY3RvciwgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pO1xuICAgIHZhciBtb25nb01vZCA9IHJlcGxhY2VUeXBlcyhtb2QsIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKTtcblxuICAgIHZhciBpc01vZGlmeSA9IExvY2FsQ29sbGVjdGlvbi5faXNNb2RpZmljYXRpb25Nb2QobW9uZ29Nb2QpO1xuXG4gICAgaWYgKG9wdGlvbnMuX2ZvcmJpZFJlcGxhY2UgJiYgIWlzTW9kaWZ5KSB7XG4gICAgICB2YXIgZXJyID0gbmV3IEVycm9yKFwiSW52YWxpZCBtb2RpZmllci4gUmVwbGFjZW1lbnRzIGFyZSBmb3JiaWRkZW4uXCIpO1xuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFdlJ3ZlIGFscmVhZHkgcnVuIHJlcGxhY2VUeXBlcy9yZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyBvblxuICAgIC8vIHNlbGVjdG9yIGFuZCBtb2QuICBXZSBhc3N1bWUgaXQgZG9lc24ndCBtYXR0ZXIsIGFzIGZhciBhc1xuICAgIC8vIHRoZSBiZWhhdmlvciBvZiBtb2RpZmllcnMgaXMgY29uY2VybmVkLCB3aGV0aGVyIGBfbW9kaWZ5YFxuICAgIC8vIGlzIHJ1biBvbiBFSlNPTiBvciBvbiBtb25nby1jb252ZXJ0ZWQgRUpTT04uXG5cbiAgICAvLyBSdW4gdGhpcyBjb2RlIHVwIGZyb250IHNvIHRoYXQgaXQgZmFpbHMgZmFzdCBpZiBzb21lb25lIHVzZXNcbiAgICAvLyBhIE1vbmdvIHVwZGF0ZSBvcGVyYXRvciB3ZSBkb24ndCBzdXBwb3J0LlxuICAgIGxldCBrbm93bklkO1xuICAgIGlmIChvcHRpb25zLnVwc2VydCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbGV0IG5ld0RvYyA9IExvY2FsQ29sbGVjdGlvbi5fY3JlYXRlVXBzZXJ0RG9jdW1lbnQoc2VsZWN0b3IsIG1vZCk7XG4gICAgICAgIGtub3duSWQgPSBuZXdEb2MuX2lkO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChvcHRpb25zLnVwc2VydCAmJlxuICAgICAgICAhIGlzTW9kaWZ5ICYmXG4gICAgICAgICEga25vd25JZCAmJlxuICAgICAgICBvcHRpb25zLmluc2VydGVkSWQgJiZcbiAgICAgICAgISAob3B0aW9ucy5pbnNlcnRlZElkIGluc3RhbmNlb2YgTW9uZ28uT2JqZWN0SUQgJiZcbiAgICAgICAgICAgb3B0aW9ucy5nZW5lcmF0ZWRJZCkpIHtcbiAgICAgIC8vIEluIGNhc2Ugb2YgYW4gdXBzZXJ0IHdpdGggYSByZXBsYWNlbWVudCwgd2hlcmUgdGhlcmUgaXMgbm8gX2lkIGRlZmluZWRcbiAgICAgIC8vIGluIGVpdGhlciB0aGUgcXVlcnkgb3IgdGhlIHJlcGxhY2VtZW50IGRvYywgbW9uZ28gd2lsbCBnZW5lcmF0ZSBhbiBpZCBpdHNlbGYuXG4gICAgICAvLyBUaGVyZWZvcmUgd2UgbmVlZCB0aGlzIHNwZWNpYWwgc3RyYXRlZ3kgaWYgd2Ugd2FudCB0byBjb250cm9sIHRoZSBpZCBvdXJzZWx2ZXMuXG5cbiAgICAgIC8vIFdlIGRvbid0IG5lZWQgdG8gZG8gdGhpcyB3aGVuOlxuICAgICAgLy8gLSBUaGlzIGlzIG5vdCBhIHJlcGxhY2VtZW50LCBzbyB3ZSBjYW4gYWRkIGFuIF9pZCB0byAkc2V0T25JbnNlcnRcbiAgICAgIC8vIC0gVGhlIGlkIGlzIGRlZmluZWQgYnkgcXVlcnkgb3IgbW9kIHdlIGNhbiBqdXN0IGFkZCBpdCB0byB0aGUgcmVwbGFjZW1lbnQgZG9jXG4gICAgICAvLyAtIFRoZSB1c2VyIGRpZCBub3Qgc3BlY2lmeSBhbnkgaWQgcHJlZmVyZW5jZSBhbmQgdGhlIGlkIGlzIGEgTW9uZ28gT2JqZWN0SWQsXG4gICAgICAvLyAgICAgdGhlbiB3ZSBjYW4ganVzdCBsZXQgTW9uZ28gZ2VuZXJhdGUgdGhlIGlkXG5cbiAgICAgIHNpbXVsYXRlVXBzZXJ0V2l0aEluc2VydGVkSWQoXG4gICAgICAgIGNvbGxlY3Rpb24sIG1vbmdvU2VsZWN0b3IsIG1vbmdvTW9kLCBvcHRpb25zLFxuICAgICAgICAvLyBUaGlzIGNhbGxiYWNrIGRvZXMgbm90IG5lZWQgdG8gYmUgYmluZEVudmlyb25tZW50J2VkIGJlY2F1c2VcbiAgICAgICAgLy8gc2ltdWxhdGVVcHNlcnRXaXRoSW5zZXJ0ZWRJZCgpIHdyYXBzIGl0IGFuZCB0aGVuIHBhc3NlcyBpdCB0aHJvdWdoXG4gICAgICAgIC8vIGJpbmRFbnZpcm9ubWVudEZvcldyaXRlLlxuICAgICAgICBmdW5jdGlvbiAoZXJyb3IsIHJlc3VsdCkge1xuICAgICAgICAgIC8vIElmIHdlIGdvdCBoZXJlIHZpYSBhIHVwc2VydCgpIGNhbGwsIHRoZW4gb3B0aW9ucy5fcmV0dXJuT2JqZWN0IHdpbGxcbiAgICAgICAgICAvLyBiZSBzZXQgYW5kIHdlIHNob3VsZCByZXR1cm4gdGhlIHdob2xlIG9iamVjdC4gT3RoZXJ3aXNlLCB3ZSBzaG91bGRcbiAgICAgICAgICAvLyBqdXN0IHJldHVybiB0aGUgbnVtYmVyIG9mIGFmZmVjdGVkIGRvY3MgdG8gbWF0Y2ggdGhlIG1vbmdvIEFQSS5cbiAgICAgICAgICBpZiAocmVzdWx0ICYmICEgb3B0aW9ucy5fcmV0dXJuT2JqZWN0KSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgcmVzdWx0Lm51bWJlckFmZmVjdGVkKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIHJlc3VsdCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICApO1xuICAgIH0gZWxzZSB7XG5cbiAgICAgIGlmIChvcHRpb25zLnVwc2VydCAmJiAha25vd25JZCAmJiBvcHRpb25zLmluc2VydGVkSWQgJiYgaXNNb2RpZnkpIHtcbiAgICAgICAgaWYgKCFtb25nb01vZC5oYXNPd25Qcm9wZXJ0eSgnJHNldE9uSW5zZXJ0JykpIHtcbiAgICAgICAgICBtb25nb01vZC4kc2V0T25JbnNlcnQgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBrbm93bklkID0gb3B0aW9ucy5pbnNlcnRlZElkO1xuICAgICAgICBPYmplY3QuYXNzaWduKG1vbmdvTW9kLiRzZXRPbkluc2VydCwgcmVwbGFjZVR5cGVzKHtfaWQ6IG9wdGlvbnMuaW5zZXJ0ZWRJZH0sIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKSk7XG4gICAgICB9XG5cbiAgICAgIGNvbGxlY3Rpb24udXBkYXRlKFxuICAgICAgICBtb25nb1NlbGVjdG9yLCBtb25nb01vZCwgbW9uZ29PcHRzLFxuICAgICAgICBiaW5kRW52aXJvbm1lbnRGb3JXcml0ZShmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcbiAgICAgICAgICBpZiAoISBlcnIpIHtcbiAgICAgICAgICAgIHZhciBtZXRlb3JSZXN1bHQgPSB0cmFuc2Zvcm1SZXN1bHQocmVzdWx0KTtcbiAgICAgICAgICAgIGlmIChtZXRlb3JSZXN1bHQgJiYgb3B0aW9ucy5fcmV0dXJuT2JqZWN0KSB7XG4gICAgICAgICAgICAgIC8vIElmIHRoaXMgd2FzIGFuIHVwc2VydCgpIGNhbGwsIGFuZCB3ZSBlbmRlZCB1cFxuICAgICAgICAgICAgICAvLyBpbnNlcnRpbmcgYSBuZXcgZG9jIGFuZCB3ZSBrbm93IGl0cyBpZCwgdGhlblxuICAgICAgICAgICAgICAvLyByZXR1cm4gdGhhdCBpZCBhcyB3ZWxsLlxuICAgICAgICAgICAgICBpZiAob3B0aW9ucy51cHNlcnQgJiYgbWV0ZW9yUmVzdWx0Lmluc2VydGVkSWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoa25vd25JZCkge1xuICAgICAgICAgICAgICAgICAgbWV0ZW9yUmVzdWx0Lmluc2VydGVkSWQgPSBrbm93bklkO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWV0ZW9yUmVzdWx0Lmluc2VydGVkSWQgaW5zdGFuY2VvZiBNb25nb0RCLk9iamVjdElEKSB7XG4gICAgICAgICAgICAgICAgICBtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZCA9IG5ldyBNb25nby5PYmplY3RJRChtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZC50b0hleFN0cmluZygpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIG1ldGVvclJlc3VsdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIG1ldGVvclJlc3VsdC5udW1iZXJBZmZlY3RlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgdGhyb3cgZTtcbiAgfVxufTtcblxudmFyIHRyYW5zZm9ybVJlc3VsdCA9IGZ1bmN0aW9uIChkcml2ZXJSZXN1bHQpIHtcbiAgdmFyIG1ldGVvclJlc3VsdCA9IHsgbnVtYmVyQWZmZWN0ZWQ6IDAgfTtcbiAgaWYgKGRyaXZlclJlc3VsdCkge1xuICAgIHZhciBtb25nb1Jlc3VsdCA9IGRyaXZlclJlc3VsdC5yZXN1bHQ7XG5cbiAgICAvLyBPbiB1cGRhdGVzIHdpdGggdXBzZXJ0OnRydWUsIHRoZSBpbnNlcnRlZCB2YWx1ZXMgY29tZSBhcyBhIGxpc3Qgb2ZcbiAgICAvLyB1cHNlcnRlZCB2YWx1ZXMgLS0gZXZlbiB3aXRoIG9wdGlvbnMubXVsdGksIHdoZW4gdGhlIHVwc2VydCBkb2VzIGluc2VydCxcbiAgICAvLyBpdCBvbmx5IGluc2VydHMgb25lIGVsZW1lbnQuXG4gICAgaWYgKG1vbmdvUmVzdWx0LnVwc2VydGVkKSB7XG4gICAgICBtZXRlb3JSZXN1bHQubnVtYmVyQWZmZWN0ZWQgKz0gbW9uZ29SZXN1bHQudXBzZXJ0ZWQubGVuZ3RoO1xuXG4gICAgICBpZiAobW9uZ29SZXN1bHQudXBzZXJ0ZWQubGVuZ3RoID09IDEpIHtcbiAgICAgICAgbWV0ZW9yUmVzdWx0Lmluc2VydGVkSWQgPSBtb25nb1Jlc3VsdC51cHNlcnRlZFswXS5faWQ7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG1ldGVvclJlc3VsdC5udW1iZXJBZmZlY3RlZCA9IG1vbmdvUmVzdWx0Lm47XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1ldGVvclJlc3VsdDtcbn07XG5cblxudmFyIE5VTV9PUFRJTUlTVElDX1RSSUVTID0gMztcblxuLy8gZXhwb3NlZCBmb3IgdGVzdGluZ1xuTW9uZ29Db25uZWN0aW9uLl9pc0Nhbm5vdENoYW5nZUlkRXJyb3IgPSBmdW5jdGlvbiAoZXJyKSB7XG5cbiAgLy8gTW9uZ28gMy4yLiogcmV0dXJucyBlcnJvciBhcyBuZXh0IE9iamVjdDpcbiAgLy8ge25hbWU6IFN0cmluZywgY29kZTogTnVtYmVyLCBlcnJtc2c6IFN0cmluZ31cbiAgLy8gT2xkZXIgTW9uZ28gcmV0dXJuczpcbiAgLy8ge25hbWU6IFN0cmluZywgY29kZTogTnVtYmVyLCBlcnI6IFN0cmluZ31cbiAgdmFyIGVycm9yID0gZXJyLmVycm1zZyB8fCBlcnIuZXJyO1xuXG4gIC8vIFdlIGRvbid0IHVzZSB0aGUgZXJyb3IgY29kZSBoZXJlXG4gIC8vIGJlY2F1c2UgdGhlIGVycm9yIGNvZGUgd2Ugb2JzZXJ2ZWQgaXQgcHJvZHVjaW5nICgxNjgzNykgYXBwZWFycyB0byBiZVxuICAvLyBhIGZhciBtb3JlIGdlbmVyaWMgZXJyb3IgY29kZSBiYXNlZCBvbiBleGFtaW5pbmcgdGhlIHNvdXJjZS5cbiAgaWYgKGVycm9yLmluZGV4T2YoJ1RoZSBfaWQgZmllbGQgY2Fubm90IGJlIGNoYW5nZWQnKSA9PT0gMFxuICAgIHx8IGVycm9yLmluZGV4T2YoXCJ0aGUgKGltbXV0YWJsZSkgZmllbGQgJ19pZCcgd2FzIGZvdW5kIHRvIGhhdmUgYmVlbiBhbHRlcmVkIHRvIF9pZFwiKSAhPT0gLTEpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cbnZhciBzaW11bGF0ZVVwc2VydFdpdGhJbnNlcnRlZElkID0gZnVuY3Rpb24gKGNvbGxlY3Rpb24sIHNlbGVjdG9yLCBtb2QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLCBjYWxsYmFjaykge1xuICAvLyBTVFJBVEVHWTogRmlyc3QgdHJ5IGRvaW5nIGFuIHVwc2VydCB3aXRoIGEgZ2VuZXJhdGVkIElELlxuICAvLyBJZiB0aGlzIHRocm93cyBhbiBlcnJvciBhYm91dCBjaGFuZ2luZyB0aGUgSUQgb24gYW4gZXhpc3RpbmcgZG9jdW1lbnRcbiAgLy8gdGhlbiB3aXRob3V0IGFmZmVjdGluZyB0aGUgZGF0YWJhc2UsIHdlIGtub3cgd2Ugc2hvdWxkIHByb2JhYmx5IHRyeVxuICAvLyBhbiB1cGRhdGUgd2l0aG91dCB0aGUgZ2VuZXJhdGVkIElELiBJZiBpdCBhZmZlY3RlZCAwIGRvY3VtZW50cyxcbiAgLy8gdGhlbiB3aXRob3V0IGFmZmVjdGluZyB0aGUgZGF0YWJhc2UsIHdlIHRoZSBkb2N1bWVudCB0aGF0IGZpcnN0XG4gIC8vIGdhdmUgdGhlIGVycm9yIGlzIHByb2JhYmx5IHJlbW92ZWQgYW5kIHdlIG5lZWQgdG8gdHJ5IGFuIGluc2VydCBhZ2FpblxuICAvLyBXZSBnbyBiYWNrIHRvIHN0ZXAgb25lIGFuZCByZXBlYXQuXG4gIC8vIExpa2UgYWxsIFwib3B0aW1pc3RpYyB3cml0ZVwiIHNjaGVtZXMsIHdlIHJlbHkgb24gdGhlIGZhY3QgdGhhdCBpdCdzXG4gIC8vIHVubGlrZWx5IG91ciB3cml0ZXMgd2lsbCBjb250aW51ZSB0byBiZSBpbnRlcmZlcmVkIHdpdGggdW5kZXIgbm9ybWFsXG4gIC8vIGNpcmN1bXN0YW5jZXMgKHRob3VnaCBzdWZmaWNpZW50bHkgaGVhdnkgY29udGVudGlvbiB3aXRoIHdyaXRlcnNcbiAgLy8gZGlzYWdyZWVpbmcgb24gdGhlIGV4aXN0ZW5jZSBvZiBhbiBvYmplY3Qgd2lsbCBjYXVzZSB3cml0ZXMgdG8gZmFpbFxuICAvLyBpbiB0aGVvcnkpLlxuXG4gIHZhciBpbnNlcnRlZElkID0gb3B0aW9ucy5pbnNlcnRlZElkOyAvLyBtdXN0IGV4aXN0XG4gIHZhciBtb25nb09wdHNGb3JVcGRhdGUgPSB7XG4gICAgc2FmZTogdHJ1ZSxcbiAgICBtdWx0aTogb3B0aW9ucy5tdWx0aVxuICB9O1xuICB2YXIgbW9uZ29PcHRzRm9ySW5zZXJ0ID0ge1xuICAgIHNhZmU6IHRydWUsXG4gICAgdXBzZXJ0OiB0cnVlXG4gIH07XG5cbiAgdmFyIHJlcGxhY2VtZW50V2l0aElkID0gT2JqZWN0LmFzc2lnbihcbiAgICByZXBsYWNlVHlwZXMoe19pZDogaW5zZXJ0ZWRJZH0sIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKSxcbiAgICBtb2QpO1xuXG4gIHZhciB0cmllcyA9IE5VTV9PUFRJTUlTVElDX1RSSUVTO1xuXG4gIHZhciBkb1VwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0cmllcy0tO1xuICAgIGlmICghIHRyaWVzKSB7XG4gICAgICBjYWxsYmFjayhuZXcgRXJyb3IoXCJVcHNlcnQgZmFpbGVkIGFmdGVyIFwiICsgTlVNX09QVElNSVNUSUNfVFJJRVMgKyBcIiB0cmllcy5cIikpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb2xsZWN0aW9uLnVwZGF0ZShzZWxlY3RvciwgbW9kLCBtb25nb09wdHNGb3JVcGRhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBiaW5kRW52aXJvbm1lbnRGb3JXcml0ZShmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ICYmIHJlc3VsdC5yZXN1bHQubiAhPSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyQWZmZWN0ZWQ6IHJlc3VsdC5yZXN1bHQublxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvQ29uZGl0aW9uYWxJbnNlcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgIH1cbiAgfTtcblxuICB2YXIgZG9Db25kaXRpb25hbEluc2VydCA9IGZ1bmN0aW9uICgpIHtcbiAgICBjb2xsZWN0aW9uLnVwZGF0ZShzZWxlY3RvciwgcmVwbGFjZW1lbnRXaXRoSWQsIG1vbmdvT3B0c0Zvckluc2VydCxcbiAgICAgICAgICAgICAgICAgICAgICBiaW5kRW52aXJvbm1lbnRGb3JXcml0ZShmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZmlndXJlIG91dCBpZiB0aGlzIGlzIGFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gXCJjYW5ub3QgY2hhbmdlIF9pZCBvZiBkb2N1bWVudFwiIGVycm9yLCBhbmRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgc28sIHRyeSBkb1VwZGF0ZSgpIGFnYWluLCB1cCB0byAzIHRpbWVzLlxuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoTW9uZ29Db25uZWN0aW9uLl9pc0Nhbm5vdENoYW5nZUlkRXJyb3IoZXJyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvVXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlckFmZmVjdGVkOiByZXN1bHQucmVzdWx0LnVwc2VydGVkLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnNlcnRlZElkOiBpbnNlcnRlZElkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gIH07XG5cbiAgZG9VcGRhdGUoKTtcbn07XG5cbl8uZWFjaChbXCJpbnNlcnRcIiwgXCJ1cGRhdGVcIiwgXCJyZW1vdmVcIiwgXCJkcm9wQ29sbGVjdGlvblwiLCBcImRyb3BEYXRhYmFzZVwiXSwgZnVuY3Rpb24gKG1ldGhvZCkge1xuICBNb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbiAoLyogYXJndW1lbnRzICovKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBNZXRlb3Iud3JhcEFzeW5jKHNlbGZbXCJfXCIgKyBtZXRob2RdKS5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuICB9O1xufSk7XG5cbi8vIFhYWCBNb25nb0Nvbm5lY3Rpb24udXBzZXJ0KCkgZG9lcyBub3QgcmV0dXJuIHRoZSBpZCBvZiB0aGUgaW5zZXJ0ZWQgZG9jdW1lbnRcbi8vIHVubGVzcyB5b3Ugc2V0IGl0IGV4cGxpY2l0bHkgaW4gdGhlIHNlbGVjdG9yIG9yIG1vZGlmaWVyIChhcyBhIHJlcGxhY2VtZW50XG4vLyBkb2MpLlxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS51cHNlcnQgPSBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIHNlbGVjdG9yLCBtb2QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zLCBjYWxsYmFjaykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiICYmICEgY2FsbGJhY2spIHtcbiAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG5cbiAgcmV0dXJuIHNlbGYudXBkYXRlKGNvbGxlY3Rpb25OYW1lLCBzZWxlY3RvciwgbW9kLFxuICAgICAgICAgICAgICAgICAgICAgXy5leHRlbmQoe30sIG9wdGlvbnMsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgdXBzZXJ0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICBfcmV0dXJuT2JqZWN0OiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICB9KSwgY2FsbGJhY2spO1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5maW5kID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBzZWxlY3Rvciwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpXG4gICAgc2VsZWN0b3IgPSB7fTtcblxuICByZXR1cm4gbmV3IEN1cnNvcihcbiAgICBzZWxmLCBuZXcgQ3Vyc29yRGVzY3JpcHRpb24oY29sbGVjdGlvbk5hbWUsIHNlbGVjdG9yLCBvcHRpb25zKSk7XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLmZpbmRPbmUgPSBmdW5jdGlvbiAoY29sbGVjdGlvbl9uYW1lLCBzZWxlY3RvcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpXG4gICAgc2VsZWN0b3IgPSB7fTtcblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgb3B0aW9ucy5saW1pdCA9IDE7XG4gIHJldHVybiBzZWxmLmZpbmQoY29sbGVjdGlvbl9uYW1lLCBzZWxlY3Rvciwgb3B0aW9ucykuZmV0Y2goKVswXTtcbn07XG5cbi8vIFdlJ2xsIGFjdHVhbGx5IGRlc2lnbiBhbiBpbmRleCBBUEkgbGF0ZXIuIEZvciBub3csIHdlIGp1c3QgcGFzcyB0aHJvdWdoIHRvXG4vLyBNb25nbydzLCBidXQgbWFrZSBpdCBzeW5jaHJvbm91cy5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX2Vuc3VyZUluZGV4ID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBpbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIFdlIGV4cGVjdCB0aGlzIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhdCBzdGFydHVwLCBub3QgZnJvbSB3aXRoaW4gYSBtZXRob2QsXG4gIC8vIHNvIHdlIGRvbid0IGludGVyYWN0IHdpdGggdGhlIHdyaXRlIGZlbmNlLlxuICB2YXIgY29sbGVjdGlvbiA9IHNlbGYucmF3Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG4gIHZhciBmdXR1cmUgPSBuZXcgRnV0dXJlO1xuICB2YXIgaW5kZXhOYW1lID0gY29sbGVjdGlvbi5lbnN1cmVJbmRleChpbmRleCwgb3B0aW9ucywgZnV0dXJlLnJlc29sdmVyKCkpO1xuICBmdXR1cmUud2FpdCgpO1xufTtcbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX2Ryb3BJbmRleCA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgaW5kZXgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIFRoaXMgZnVuY3Rpb24gaXMgb25seSB1c2VkIGJ5IHRlc3QgY29kZSwgbm90IHdpdGhpbiBhIG1ldGhvZCwgc28gd2UgZG9uJ3RcbiAgLy8gaW50ZXJhY3Qgd2l0aCB0aGUgd3JpdGUgZmVuY2UuXG4gIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcbiAgdmFyIGZ1dHVyZSA9IG5ldyBGdXR1cmU7XG4gIHZhciBpbmRleE5hbWUgPSBjb2xsZWN0aW9uLmRyb3BJbmRleChpbmRleCwgZnV0dXJlLnJlc29sdmVyKCkpO1xuICBmdXR1cmUud2FpdCgpO1xufTtcblxuLy8gQ1VSU09SU1xuXG4vLyBUaGVyZSBhcmUgc2V2ZXJhbCBjbGFzc2VzIHdoaWNoIHJlbGF0ZSB0byBjdXJzb3JzOlxuLy9cbi8vIEN1cnNvckRlc2NyaXB0aW9uIHJlcHJlc2VudHMgdGhlIGFyZ3VtZW50cyB1c2VkIHRvIGNvbnN0cnVjdCBhIGN1cnNvcjpcbi8vIGNvbGxlY3Rpb25OYW1lLCBzZWxlY3RvciwgYW5kIChmaW5kKSBvcHRpb25zLiAgQmVjYXVzZSBpdCBpcyB1c2VkIGFzIGEga2V5XG4vLyBmb3IgY3Vyc29yIGRlLWR1cCwgZXZlcnl0aGluZyBpbiBpdCBzaG91bGQgZWl0aGVyIGJlIEpTT04tc3RyaW5naWZpYWJsZSBvclxuLy8gbm90IGFmZmVjdCBvYnNlcnZlQ2hhbmdlcyBvdXRwdXQgKGVnLCBvcHRpb25zLnRyYW5zZm9ybSBmdW5jdGlvbnMgYXJlIG5vdFxuLy8gc3RyaW5naWZpYWJsZSBidXQgZG8gbm90IGFmZmVjdCBvYnNlcnZlQ2hhbmdlcykuXG4vL1xuLy8gU3luY2hyb25vdXNDdXJzb3IgaXMgYSB3cmFwcGVyIGFyb3VuZCBhIE1vbmdvREIgY3Vyc29yXG4vLyB3aGljaCBpbmNsdWRlcyBmdWxseS1zeW5jaHJvbm91cyB2ZXJzaW9ucyBvZiBmb3JFYWNoLCBldGMuXG4vL1xuLy8gQ3Vyc29yIGlzIHRoZSBjdXJzb3Igb2JqZWN0IHJldHVybmVkIGZyb20gZmluZCgpLCB3aGljaCBpbXBsZW1lbnRzIHRoZVxuLy8gZG9jdW1lbnRlZCBNb25nby5Db2xsZWN0aW9uIGN1cnNvciBBUEkuICBJdCB3cmFwcyBhIEN1cnNvckRlc2NyaXB0aW9uIGFuZCBhXG4vLyBTeW5jaHJvbm91c0N1cnNvciAobGF6aWx5OiBpdCBkb2Vzbid0IGNvbnRhY3QgTW9uZ28gdW50aWwgeW91IGNhbGwgYSBtZXRob2Rcbi8vIGxpa2UgZmV0Y2ggb3IgZm9yRWFjaCBvbiBpdCkuXG4vL1xuLy8gT2JzZXJ2ZUhhbmRsZSBpcyB0aGUgXCJvYnNlcnZlIGhhbmRsZVwiIHJldHVybmVkIGZyb20gb2JzZXJ2ZUNoYW5nZXMuIEl0IGhhcyBhXG4vLyByZWZlcmVuY2UgdG8gYW4gT2JzZXJ2ZU11bHRpcGxleGVyLlxuLy9cbi8vIE9ic2VydmVNdWx0aXBsZXhlciBhbGxvd3MgbXVsdGlwbGUgaWRlbnRpY2FsIE9ic2VydmVIYW5kbGVzIHRvIGJlIGRyaXZlbiBieSBhXG4vLyBzaW5nbGUgb2JzZXJ2ZSBkcml2ZXIuXG4vL1xuLy8gVGhlcmUgYXJlIHR3byBcIm9ic2VydmUgZHJpdmVyc1wiIHdoaWNoIGRyaXZlIE9ic2VydmVNdWx0aXBsZXhlcnM6XG4vLyAgIC0gUG9sbGluZ09ic2VydmVEcml2ZXIgY2FjaGVzIHRoZSByZXN1bHRzIG9mIGEgcXVlcnkgYW5kIHJlcnVucyBpdCB3aGVuXG4vLyAgICAgbmVjZXNzYXJ5LlxuLy8gICAtIE9wbG9nT2JzZXJ2ZURyaXZlciBmb2xsb3dzIHRoZSBNb25nbyBvcGVyYXRpb24gbG9nIHRvIGRpcmVjdGx5IG9ic2VydmVcbi8vICAgICBkYXRhYmFzZSBjaGFuZ2VzLlxuLy8gQm90aCBpbXBsZW1lbnRhdGlvbnMgZm9sbG93IHRoZSBzYW1lIHNpbXBsZSBpbnRlcmZhY2U6IHdoZW4geW91IGNyZWF0ZSB0aGVtLFxuLy8gdGhleSBzdGFydCBzZW5kaW5nIG9ic2VydmVDaGFuZ2VzIGNhbGxiYWNrcyAoYW5kIGEgcmVhZHkoKSBpbnZvY2F0aW9uKSB0b1xuLy8gdGhlaXIgT2JzZXJ2ZU11bHRpcGxleGVyLCBhbmQgeW91IHN0b3AgdGhlbSBieSBjYWxsaW5nIHRoZWlyIHN0b3AoKSBtZXRob2QuXG5cbkN1cnNvckRlc2NyaXB0aW9uID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBzZWxlY3Rvciwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYuY29sbGVjdGlvbk5hbWUgPSBjb2xsZWN0aW9uTmFtZTtcbiAgc2VsZi5zZWxlY3RvciA9IE1vbmdvLkNvbGxlY3Rpb24uX3Jld3JpdGVTZWxlY3RvcihzZWxlY3Rvcik7XG4gIHNlbGYub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG59O1xuXG5DdXJzb3IgPSBmdW5jdGlvbiAobW9uZ28sIGN1cnNvckRlc2NyaXB0aW9uKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBzZWxmLl9tb25nbyA9IG1vbmdvO1xuICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiA9IGN1cnNvckRlc2NyaXB0aW9uO1xuICBzZWxmLl9zeW5jaHJvbm91c0N1cnNvciA9IG51bGw7XG59O1xuXG5fLmVhY2goWydmb3JFYWNoJywgJ21hcCcsICdmZXRjaCcsICdjb3VudCcsIFN5bWJvbC5pdGVyYXRvcl0sIGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgQ3Vyc29yLnByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIFlvdSBjYW4gb25seSBvYnNlcnZlIGEgdGFpbGFibGUgY3Vyc29yLlxuICAgIGlmIChzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRhaWxhYmxlKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGNhbGwgXCIgKyBtZXRob2QgKyBcIiBvbiBhIHRhaWxhYmxlIGN1cnNvclwiKTtcblxuICAgIGlmICghc2VsZi5fc3luY2hyb25vdXNDdXJzb3IpIHtcbiAgICAgIHNlbGYuX3N5bmNocm9ub3VzQ3Vyc29yID0gc2VsZi5fbW9uZ28uX2NyZWF0ZVN5bmNocm9ub3VzQ3Vyc29yKFxuICAgICAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiwge1xuICAgICAgICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZSBcInNlbGZcIiBhcmd1bWVudCB0byBmb3JFYWNoL21hcCBjYWxsYmFja3MgaXMgdGhlXG4gICAgICAgICAgLy8gQ3Vyc29yLCBub3QgdGhlIFN5bmNocm9ub3VzQ3Vyc29yLlxuICAgICAgICAgIHNlbGZGb3JJdGVyYXRpb246IHNlbGYsXG4gICAgICAgICAgdXNlVHJhbnNmb3JtOiB0cnVlXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBzZWxmLl9zeW5jaHJvbm91c0N1cnNvclttZXRob2RdLmFwcGx5KFxuICAgICAgc2VsZi5fc3luY2hyb25vdXNDdXJzb3IsIGFyZ3VtZW50cyk7XG4gIH07XG59KTtcblxuLy8gU2luY2Ugd2UgZG9uJ3QgYWN0dWFsbHkgaGF2ZSBhIFwibmV4dE9iamVjdFwiIGludGVyZmFjZSwgdGhlcmUncyByZWFsbHkgbm9cbi8vIHJlYXNvbiB0byBoYXZlIGEgXCJyZXdpbmRcIiBpbnRlcmZhY2UuICBBbGwgaXQgZGlkIHdhcyBtYWtlIG11bHRpcGxlIGNhbGxzXG4vLyB0byBmZXRjaC9tYXAvZm9yRWFjaCByZXR1cm4gbm90aGluZyB0aGUgc2Vjb25kIHRpbWUuXG4vLyBYWFggQ09NUEFUIFdJVEggMC44LjFcbkN1cnNvci5wcm90b3R5cGUucmV3aW5kID0gZnVuY3Rpb24gKCkge1xufTtcblxuQ3Vyc29yLnByb3RvdHlwZS5nZXRUcmFuc2Zvcm0gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRyYW5zZm9ybTtcbn07XG5cbi8vIFdoZW4geW91IGNhbGwgTWV0ZW9yLnB1Ymxpc2goKSB3aXRoIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgQ3Vyc29yLCB3ZSBuZWVkXG4vLyB0byB0cmFuc211dGUgaXQgaW50byB0aGUgZXF1aXZhbGVudCBzdWJzY3JpcHRpb24uICBUaGlzIGlzIHRoZSBmdW5jdGlvbiB0aGF0XG4vLyBkb2VzIHRoYXQuXG5cbkN1cnNvci5wcm90b3R5cGUuX3B1Ymxpc2hDdXJzb3IgPSBmdW5jdGlvbiAoc3ViKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIGNvbGxlY3Rpb24gPSBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZTtcbiAgcmV0dXJuIE1vbmdvLkNvbGxlY3Rpb24uX3B1Ymxpc2hDdXJzb3Ioc2VsZiwgc3ViLCBjb2xsZWN0aW9uKTtcbn07XG5cbi8vIFVzZWQgdG8gZ3VhcmFudGVlIHRoYXQgcHVibGlzaCBmdW5jdGlvbnMgcmV0dXJuIGF0IG1vc3Qgb25lIGN1cnNvciBwZXJcbi8vIGNvbGxlY3Rpb24uIFByaXZhdGUsIGJlY2F1c2Ugd2UgbWlnaHQgbGF0ZXIgaGF2ZSBjdXJzb3JzIHRoYXQgaW5jbHVkZVxuLy8gZG9jdW1lbnRzIGZyb20gbXVsdGlwbGUgY29sbGVjdGlvbnMgc29tZWhvdy5cbkN1cnNvci5wcm90b3R5cGUuX2dldENvbGxlY3Rpb25OYW1lID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZTtcbn07XG5cbkN1cnNvci5wcm90b3R5cGUub2JzZXJ2ZSA9IGZ1bmN0aW9uIChjYWxsYmFja3MpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gTG9jYWxDb2xsZWN0aW9uLl9vYnNlcnZlRnJvbU9ic2VydmVDaGFuZ2VzKHNlbGYsIGNhbGxiYWNrcyk7XG59O1xuXG5DdXJzb3IucHJvdG90eXBlLm9ic2VydmVDaGFuZ2VzID0gZnVuY3Rpb24gKGNhbGxiYWNrcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBtZXRob2RzID0gW1xuICAgICdhZGRlZEF0JyxcbiAgICAnYWRkZWQnLFxuICAgICdjaGFuZ2VkQXQnLFxuICAgICdjaGFuZ2VkJyxcbiAgICAncmVtb3ZlZEF0JyxcbiAgICAncmVtb3ZlZCcsXG4gICAgJ21vdmVkVG8nXG4gIF07XG4gIHZhciBvcmRlcmVkID0gTG9jYWxDb2xsZWN0aW9uLl9vYnNlcnZlQ2hhbmdlc0NhbGxiYWNrc0FyZU9yZGVyZWQoY2FsbGJhY2tzKTtcblxuICAvLyBYWFg6IENhbiB3ZSBmaW5kIG91dCBpZiBjYWxsYmFja3MgYXJlIGZyb20gb2JzZXJ2ZT9cbiAgdmFyIGV4Y2VwdGlvbk5hbWUgPSAnIG9ic2VydmUvb2JzZXJ2ZUNoYW5nZXMgY2FsbGJhY2snO1xuICBtZXRob2RzLmZvckVhY2goZnVuY3Rpb24gKG1ldGhvZCkge1xuICAgIGlmIChjYWxsYmFja3NbbWV0aG9kXSAmJiB0eXBlb2YgY2FsbGJhY2tzW21ldGhvZF0gPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBjYWxsYmFja3NbbWV0aG9kXSA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoY2FsbGJhY2tzW21ldGhvZF0sIG1ldGhvZCArIGV4Y2VwdGlvbk5hbWUpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHNlbGYuX21vbmdvLl9vYnNlcnZlQ2hhbmdlcyhcbiAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiwgb3JkZXJlZCwgY2FsbGJhY2tzKTtcbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX2NyZWF0ZVN5bmNocm9ub3VzQ3Vyc29yID0gZnVuY3Rpb24oXG4gICAgY3Vyc29yRGVzY3JpcHRpb24sIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBvcHRpb25zID0gXy5waWNrKG9wdGlvbnMgfHwge30sICdzZWxmRm9ySXRlcmF0aW9uJywgJ3VzZVRyYW5zZm9ybScpO1xuXG4gIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGN1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lKTtcbiAgdmFyIGN1cnNvck9wdGlvbnMgPSBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zO1xuICB2YXIgbW9uZ29PcHRpb25zID0ge1xuICAgIHNvcnQ6IGN1cnNvck9wdGlvbnMuc29ydCxcbiAgICBsaW1pdDogY3Vyc29yT3B0aW9ucy5saW1pdCxcbiAgICBza2lwOiBjdXJzb3JPcHRpb25zLnNraXAsXG4gICAgcHJvamVjdGlvbjogY3Vyc29yT3B0aW9ucy5maWVsZHNcbiAgfTtcblxuICAvLyBEbyB3ZSB3YW50IGEgdGFpbGFibGUgY3Vyc29yICh3aGljaCBvbmx5IHdvcmtzIG9uIGNhcHBlZCBjb2xsZWN0aW9ucyk/XG4gIGlmIChjdXJzb3JPcHRpb25zLnRhaWxhYmxlKSB7XG4gICAgLy8gV2Ugd2FudCBhIHRhaWxhYmxlIGN1cnNvci4uLlxuICAgIG1vbmdvT3B0aW9ucy50YWlsYWJsZSA9IHRydWU7XG4gICAgLy8gLi4uIGFuZCBmb3IgdGhlIHNlcnZlciB0byB3YWl0IGEgYml0IGlmIGFueSBnZXRNb3JlIGhhcyBubyBkYXRhIChyYXRoZXJcbiAgICAvLyB0aGFuIG1ha2luZyB1cyBwdXQgdGhlIHJlbGV2YW50IHNsZWVwcyBpbiB0aGUgY2xpZW50KS4uLlxuICAgIG1vbmdvT3B0aW9ucy5hd2FpdGRhdGEgPSB0cnVlO1xuICAgIC8vIC4uLiBhbmQgdG8ga2VlcCBxdWVyeWluZyB0aGUgc2VydmVyIGluZGVmaW5pdGVseSByYXRoZXIgdGhhbiBqdXN0IDUgdGltZXNcbiAgICAvLyBpZiB0aGVyZSdzIG5vIG1vcmUgZGF0YS5cbiAgICBtb25nb09wdGlvbnMubnVtYmVyT2ZSZXRyaWVzID0gLTE7XG4gICAgLy8gQW5kIGlmIHRoaXMgaXMgb24gdGhlIG9wbG9nIGNvbGxlY3Rpb24gYW5kIHRoZSBjdXJzb3Igc3BlY2lmaWVzIGEgJ3RzJyxcbiAgICAvLyB0aGVuIHNldCB0aGUgdW5kb2N1bWVudGVkIG9wbG9nIHJlcGxheSBmbGFnLCB3aGljaCBkb2VzIGEgc3BlY2lhbCBzY2FuIHRvXG4gICAgLy8gZmluZCB0aGUgZmlyc3QgZG9jdW1lbnQgKGluc3RlYWQgb2YgY3JlYXRpbmcgYW4gaW5kZXggb24gdHMpLiBUaGlzIGlzIGFcbiAgICAvLyB2ZXJ5IGhhcmQtY29kZWQgTW9uZ28gZmxhZyB3aGljaCBvbmx5IHdvcmtzIG9uIHRoZSBvcGxvZyBjb2xsZWN0aW9uIGFuZFxuICAgIC8vIG9ubHkgd29ya3Mgd2l0aCB0aGUgdHMgZmllbGQuXG4gICAgaWYgKGN1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lID09PSBPUExPR19DT0xMRUNUSU9OICYmXG4gICAgICAgIGN1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yLnRzKSB7XG4gICAgICBtb25nb09wdGlvbnMub3Bsb2dSZXBsYXkgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHZhciBkYkN1cnNvciA9IGNvbGxlY3Rpb24uZmluZChcbiAgICByZXBsYWNlVHlwZXMoY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IsIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKSxcbiAgICBtb25nb09wdGlvbnMpO1xuXG4gIGlmICh0eXBlb2YgY3Vyc29yT3B0aW9ucy5tYXhUaW1lTXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgZGJDdXJzb3IgPSBkYkN1cnNvci5tYXhUaW1lTVMoY3Vyc29yT3B0aW9ucy5tYXhUaW1lTXMpO1xuICB9XG4gIGlmICh0eXBlb2YgY3Vyc29yT3B0aW9ucy5oaW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGRiQ3Vyc29yID0gZGJDdXJzb3IuaGludChjdXJzb3JPcHRpb25zLmhpbnQpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBTeW5jaHJvbm91c0N1cnNvcihkYkN1cnNvciwgY3Vyc29yRGVzY3JpcHRpb24sIG9wdGlvbnMpO1xufTtcblxudmFyIFN5bmNocm9ub3VzQ3Vyc29yID0gZnVuY3Rpb24gKGRiQ3Vyc29yLCBjdXJzb3JEZXNjcmlwdGlvbiwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIG9wdGlvbnMgPSBfLnBpY2sob3B0aW9ucyB8fCB7fSwgJ3NlbGZGb3JJdGVyYXRpb24nLCAndXNlVHJhbnNmb3JtJyk7XG5cbiAgc2VsZi5fZGJDdXJzb3IgPSBkYkN1cnNvcjtcbiAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24gPSBjdXJzb3JEZXNjcmlwdGlvbjtcbiAgLy8gVGhlIFwic2VsZlwiIGFyZ3VtZW50IHBhc3NlZCB0byBmb3JFYWNoL21hcCBjYWxsYmFja3MuIElmIHdlJ3JlIHdyYXBwZWRcbiAgLy8gaW5zaWRlIGEgdXNlci12aXNpYmxlIEN1cnNvciwgd2Ugd2FudCB0byBwcm92aWRlIHRoZSBvdXRlciBjdXJzb3IhXG4gIHNlbGYuX3NlbGZGb3JJdGVyYXRpb24gPSBvcHRpb25zLnNlbGZGb3JJdGVyYXRpb24gfHwgc2VsZjtcbiAgaWYgKG9wdGlvbnMudXNlVHJhbnNmb3JtICYmIGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudHJhbnNmb3JtKSB7XG4gICAgc2VsZi5fdHJhbnNmb3JtID0gTG9jYWxDb2xsZWN0aW9uLndyYXBUcmFuc2Zvcm0oXG4gICAgICBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRyYW5zZm9ybSk7XG4gIH0gZWxzZSB7XG4gICAgc2VsZi5fdHJhbnNmb3JtID0gbnVsbDtcbiAgfVxuXG4gIHNlbGYuX3N5bmNocm9ub3VzQ291bnQgPSBGdXR1cmUud3JhcChkYkN1cnNvci5jb3VudC5iaW5kKGRiQ3Vyc29yKSk7XG4gIHNlbGYuX3Zpc2l0ZWRJZHMgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbn07XG5cbl8uZXh0ZW5kKFN5bmNocm9ub3VzQ3Vyc29yLnByb3RvdHlwZSwge1xuICAvLyBSZXR1cm5zIGEgUHJvbWlzZSBmb3IgdGhlIG5leHQgb2JqZWN0IGZyb20gdGhlIHVuZGVybHlpbmcgY3Vyc29yIChiZWZvcmVcbiAgLy8gdGhlIE1vbmdvLT5NZXRlb3IgdHlwZSByZXBsYWNlbWVudCkuXG4gIF9yYXdOZXh0T2JqZWN0UHJvbWlzZTogZnVuY3Rpb24gKCkge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBzZWxmLl9kYkN1cnNvci5uZXh0KChlcnIsIGRvYykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb2x2ZShkb2MpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBSZXR1cm5zIGEgUHJvbWlzZSBmb3IgdGhlIG5leHQgb2JqZWN0IGZyb20gdGhlIGN1cnNvciwgc2tpcHBpbmcgdGhvc2Ugd2hvc2VcbiAgLy8gSURzIHdlJ3ZlIGFscmVhZHkgc2VlbiBhbmQgcmVwbGFjaW5nIE1vbmdvIGF0b21zIHdpdGggTWV0ZW9yIGF0b21zLlxuICBfbmV4dE9iamVjdFByb21pc2U6IGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgdmFyIGRvYyA9IGF3YWl0IHNlbGYuX3Jhd05leHRPYmplY3RQcm9taXNlKCk7XG5cbiAgICAgIGlmICghZG9jKSByZXR1cm4gbnVsbDtcbiAgICAgIGRvYyA9IHJlcGxhY2VUeXBlcyhkb2MsIHJlcGxhY2VNb25nb0F0b21XaXRoTWV0ZW9yKTtcblxuICAgICAgaWYgKCFzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRhaWxhYmxlICYmIF8uaGFzKGRvYywgJ19pZCcpKSB7XG4gICAgICAgIC8vIERpZCBNb25nbyBnaXZlIHVzIGR1cGxpY2F0ZSBkb2N1bWVudHMgaW4gdGhlIHNhbWUgY3Vyc29yPyBJZiBzbyxcbiAgICAgICAgLy8gaWdub3JlIHRoaXMgb25lLiAoRG8gdGhpcyBiZWZvcmUgdGhlIHRyYW5zZm9ybSwgc2luY2UgdHJhbnNmb3JtIG1pZ2h0XG4gICAgICAgIC8vIHJldHVybiBzb21lIHVucmVsYXRlZCB2YWx1ZS4pIFdlIGRvbid0IGRvIHRoaXMgZm9yIHRhaWxhYmxlIGN1cnNvcnMsXG4gICAgICAgIC8vIGJlY2F1c2Ugd2Ugd2FudCB0byBtYWludGFpbiBPKDEpIG1lbW9yeSB1c2FnZS4gQW5kIGlmIHRoZXJlIGlzbid0IF9pZFxuICAgICAgICAvLyBmb3Igc29tZSByZWFzb24gKG1heWJlIGl0J3MgdGhlIG9wbG9nKSwgdGhlbiB3ZSBkb24ndCBkbyB0aGlzIGVpdGhlci5cbiAgICAgICAgLy8gKEJlIGNhcmVmdWwgdG8gZG8gdGhpcyBmb3IgZmFsc2V5IGJ1dCBleGlzdGluZyBfaWQsIHRob3VnaC4pXG4gICAgICAgIGlmIChzZWxmLl92aXNpdGVkSWRzLmhhcyhkb2MuX2lkKSkgY29udGludWU7XG4gICAgICAgIHNlbGYuX3Zpc2l0ZWRJZHMuc2V0KGRvYy5faWQsIHRydWUpO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2VsZi5fdHJhbnNmb3JtKVxuICAgICAgICBkb2MgPSBzZWxmLl90cmFuc2Zvcm0oZG9jKTtcblxuICAgICAgcmV0dXJuIGRvYztcbiAgICB9XG4gIH0sXG5cbiAgLy8gUmV0dXJucyBhIHByb21pc2Ugd2hpY2ggaXMgcmVzb2x2ZWQgd2l0aCB0aGUgbmV4dCBvYmplY3QgKGxpa2Ugd2l0aFxuICAvLyBfbmV4dE9iamVjdFByb21pc2UpIG9yIHJlamVjdGVkIGlmIHRoZSBjdXJzb3IgZG9lc24ndCByZXR1cm4gd2l0aGluXG4gIC8vIHRpbWVvdXRNUyBtcy5cbiAgX25leHRPYmplY3RQcm9taXNlV2l0aFRpbWVvdXQ6IGZ1bmN0aW9uICh0aW1lb3V0TVMpIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBpZiAoIXRpbWVvdXRNUykge1xuICAgICAgcmV0dXJuIHNlbGYuX25leHRPYmplY3RQcm9taXNlKCk7XG4gICAgfVxuICAgIGNvbnN0IG5leHRPYmplY3RQcm9taXNlID0gc2VsZi5fbmV4dE9iamVjdFByb21pc2UoKTtcbiAgICBjb25zdCB0aW1lb3V0RXJyID0gbmV3IEVycm9yKCdDbGllbnQtc2lkZSB0aW1lb3V0IHdhaXRpbmcgZm9yIG5leHQgb2JqZWN0Jyk7XG4gICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICByZWplY3QodGltZW91dEVycik7XG4gICAgICB9LCB0aW1lb3V0TVMpO1xuICAgIH0pO1xuICAgIHJldHVybiBQcm9taXNlLnJhY2UoW25leHRPYmplY3RQcm9taXNlLCB0aW1lb3V0UHJvbWlzZV0pXG4gICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICBpZiAoZXJyID09PSB0aW1lb3V0RXJyKSB7XG4gICAgICAgICAgc2VsZi5jbG9zZSgpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH0pO1xuICB9LFxuXG4gIF9uZXh0T2JqZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBzZWxmLl9uZXh0T2JqZWN0UHJvbWlzZSgpLmF3YWl0KCk7XG4gIH0sXG5cbiAgZm9yRWFjaDogZnVuY3Rpb24gKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gR2V0IGJhY2sgdG8gdGhlIGJlZ2lubmluZy5cbiAgICBzZWxmLl9yZXdpbmQoKTtcblxuICAgIC8vIFdlIGltcGxlbWVudCB0aGUgbG9vcCBvdXJzZWxmIGluc3RlYWQgb2YgdXNpbmcgc2VsZi5fZGJDdXJzb3IuZWFjaCxcbiAgICAvLyBiZWNhdXNlIFwiZWFjaFwiIHdpbGwgY2FsbCBpdHMgY2FsbGJhY2sgb3V0c2lkZSBvZiBhIGZpYmVyIHdoaWNoIG1ha2VzIGl0XG4gICAgLy8gbXVjaCBtb3JlIGNvbXBsZXggdG8gbWFrZSB0aGlzIGZ1bmN0aW9uIHN5bmNocm9ub3VzLlxuICAgIHZhciBpbmRleCA9IDA7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHZhciBkb2MgPSBzZWxmLl9uZXh0T2JqZWN0KCk7XG4gICAgICBpZiAoIWRvYykgcmV0dXJuO1xuICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBkb2MsIGluZGV4KyssIHNlbGYuX3NlbGZGb3JJdGVyYXRpb24pO1xuICAgIH1cbiAgfSxcblxuICAvLyBYWFggQWxsb3cgb3ZlcmxhcHBpbmcgY2FsbGJhY2sgZXhlY3V0aW9ucyBpZiBjYWxsYmFjayB5aWVsZHMuXG4gIG1hcDogZnVuY3Rpb24gKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBzZWxmLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaW5kZXgpIHtcbiAgICAgIHJlcy5wdXNoKGNhbGxiYWNrLmNhbGwodGhpc0FyZywgZG9jLCBpbmRleCwgc2VsZi5fc2VsZkZvckl0ZXJhdGlvbikpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG4gIH0sXG5cbiAgX3Jld2luZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIGtub3duIHRvIGJlIHN5bmNocm9ub3VzXG4gICAgc2VsZi5fZGJDdXJzb3IucmV3aW5kKCk7XG5cbiAgICBzZWxmLl92aXNpdGVkSWRzID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gIH0sXG5cbiAgLy8gTW9zdGx5IHVzYWJsZSBmb3IgdGFpbGFibGUgY3Vyc29ycy5cbiAgY2xvc2U6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBzZWxmLl9kYkN1cnNvci5jbG9zZSgpO1xuICB9LFxuXG4gIGZldGNoOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBzZWxmLm1hcChfLmlkZW50aXR5KTtcbiAgfSxcblxuICBjb3VudDogZnVuY3Rpb24gKGFwcGx5U2tpcExpbWl0ID0gZmFsc2UpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHNlbGYuX3N5bmNocm9ub3VzQ291bnQoYXBwbHlTa2lwTGltaXQpLndhaXQoKTtcbiAgfSxcblxuICAvLyBUaGlzIG1ldGhvZCBpcyBOT1Qgd3JhcHBlZCBpbiBDdXJzb3IuXG4gIGdldFJhd09iamVjdHM6IGZ1bmN0aW9uIChvcmRlcmVkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChvcmRlcmVkKSB7XG4gICAgICByZXR1cm4gc2VsZi5mZXRjaCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcmVzdWx0cyA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICAgICAgc2VsZi5mb3JFYWNoKGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgcmVzdWx0cy5zZXQoZG9jLl9pZCwgZG9jKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfVxuICB9XG59KTtcblxuU3luY2hyb25vdXNDdXJzb3IucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICAvLyBHZXQgYmFjayB0byB0aGUgYmVnaW5uaW5nLlxuICBzZWxmLl9yZXdpbmQoKTtcblxuICByZXR1cm4ge1xuICAgIG5leHQoKSB7XG4gICAgICBjb25zdCBkb2MgPSBzZWxmLl9uZXh0T2JqZWN0KCk7XG4gICAgICByZXR1cm4gZG9jID8ge1xuICAgICAgICB2YWx1ZTogZG9jXG4gICAgICB9IDoge1xuICAgICAgICBkb25lOiB0cnVlXG4gICAgICB9O1xuICAgIH1cbiAgfTtcbn07XG5cbi8vIFRhaWxzIHRoZSBjdXJzb3IgZGVzY3JpYmVkIGJ5IGN1cnNvckRlc2NyaXB0aW9uLCBtb3N0IGxpa2VseSBvbiB0aGVcbi8vIG9wbG9nLiBDYWxscyBkb2NDYWxsYmFjayB3aXRoIGVhY2ggZG9jdW1lbnQgZm91bmQuIElnbm9yZXMgZXJyb3JzIGFuZCBqdXN0XG4vLyByZXN0YXJ0cyB0aGUgdGFpbCBvbiBlcnJvci5cbi8vXG4vLyBJZiB0aW1lb3V0TVMgaXMgc2V0LCB0aGVuIGlmIHdlIGRvbid0IGdldCBhIG5ldyBkb2N1bWVudCBldmVyeSB0aW1lb3V0TVMsXG4vLyBraWxsIGFuZCByZXN0YXJ0IHRoZSBjdXJzb3IuIFRoaXMgaXMgcHJpbWFyaWx5IGEgd29ya2Fyb3VuZCBmb3IgIzg1OTguXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLnRhaWwgPSBmdW5jdGlvbiAoY3Vyc29yRGVzY3JpcHRpb24sIGRvY0NhbGxiYWNrLCB0aW1lb3V0TVMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoIWN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudGFpbGFibGUpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuIG9ubHkgdGFpbCBhIHRhaWxhYmxlIGN1cnNvclwiKTtcblxuICB2YXIgY3Vyc29yID0gc2VsZi5fY3JlYXRlU3luY2hyb25vdXNDdXJzb3IoY3Vyc29yRGVzY3JpcHRpb24pO1xuXG4gIHZhciBzdG9wcGVkID0gZmFsc2U7XG4gIHZhciBsYXN0VFM7XG4gIHZhciBsb29wID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBkb2MgPSBudWxsO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBpZiAoc3RvcHBlZClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgdHJ5IHtcbiAgICAgICAgZG9jID0gY3Vyc29yLl9uZXh0T2JqZWN0UHJvbWlzZVdpdGhUaW1lb3V0KHRpbWVvdXRNUykuYXdhaXQoKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBUaGVyZSdzIG5vIGdvb2Qgd2F5IHRvIGZpZ3VyZSBvdXQgaWYgdGhpcyB3YXMgYWN0dWFsbHkgYW4gZXJyb3IgZnJvbVxuICAgICAgICAvLyBNb25nbywgb3IganVzdCBjbGllbnQtc2lkZSAoaW5jbHVkaW5nIG91ciBvd24gdGltZW91dCBlcnJvcikuIEFoXG4gICAgICAgIC8vIHdlbGwuIEJ1dCBlaXRoZXIgd2F5LCB3ZSBuZWVkIHRvIHJldHJ5IHRoZSBjdXJzb3IgKHVubGVzcyB0aGUgZmFpbHVyZVxuICAgICAgICAvLyB3YXMgYmVjYXVzZSB0aGUgb2JzZXJ2ZSBnb3Qgc3RvcHBlZCkuXG4gICAgICAgIGRvYyA9IG51bGw7XG4gICAgICB9XG4gICAgICAvLyBTaW5jZSB3ZSBhd2FpdGVkIGEgcHJvbWlzZSBhYm92ZSwgd2UgbmVlZCB0byBjaGVjayBhZ2FpbiB0byBzZWUgaWZcbiAgICAgIC8vIHdlJ3ZlIGJlZW4gc3RvcHBlZCBiZWZvcmUgY2FsbGluZyB0aGUgY2FsbGJhY2suXG4gICAgICBpZiAoc3RvcHBlZClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgaWYgKGRvYykge1xuICAgICAgICAvLyBJZiBhIHRhaWxhYmxlIGN1cnNvciBjb250YWlucyBhIFwidHNcIiBmaWVsZCwgdXNlIGl0IHRvIHJlY3JlYXRlIHRoZVxuICAgICAgICAvLyBjdXJzb3Igb24gZXJyb3IuIChcInRzXCIgaXMgYSBzdGFuZGFyZCB0aGF0IE1vbmdvIHVzZXMgaW50ZXJuYWxseSBmb3JcbiAgICAgICAgLy8gdGhlIG9wbG9nLCBhbmQgdGhlcmUncyBhIHNwZWNpYWwgZmxhZyB0aGF0IGxldHMgeW91IGRvIGJpbmFyeSBzZWFyY2hcbiAgICAgICAgLy8gb24gaXQgaW5zdGVhZCBvZiBuZWVkaW5nIHRvIHVzZSBhbiBpbmRleC4pXG4gICAgICAgIGxhc3RUUyA9IGRvYy50cztcbiAgICAgICAgZG9jQ2FsbGJhY2soZG9jKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBuZXdTZWxlY3RvciA9IF8uY2xvbmUoY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IpO1xuICAgICAgICBpZiAobGFzdFRTKSB7XG4gICAgICAgICAgbmV3U2VsZWN0b3IudHMgPSB7JGd0OiBsYXN0VFN9O1xuICAgICAgICB9XG4gICAgICAgIGN1cnNvciA9IHNlbGYuX2NyZWF0ZVN5bmNocm9ub3VzQ3Vyc29yKG5ldyBDdXJzb3JEZXNjcmlwdGlvbihcbiAgICAgICAgICBjdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZSxcbiAgICAgICAgICBuZXdTZWxlY3RvcixcbiAgICAgICAgICBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zKSk7XG4gICAgICAgIC8vIE1vbmdvIGZhaWxvdmVyIHRha2VzIG1hbnkgc2Vjb25kcy4gIFJldHJ5IGluIGEgYml0LiAgKFdpdGhvdXQgdGhpc1xuICAgICAgICAvLyBzZXRUaW1lb3V0LCB3ZSBwZWcgdGhlIENQVSBhdCAxMDAlIGFuZCBuZXZlciBub3RpY2UgdGhlIGFjdHVhbFxuICAgICAgICAvLyBmYWlsb3Zlci5cbiAgICAgICAgTWV0ZW9yLnNldFRpbWVvdXQobG9vcCwgMTAwKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIE1ldGVvci5kZWZlcihsb29wKTtcblxuICByZXR1cm4ge1xuICAgIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHN0b3BwZWQgPSB0cnVlO1xuICAgICAgY3Vyc29yLmNsb3NlKCk7XG4gICAgfVxuICB9O1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fb2JzZXJ2ZUNoYW5nZXMgPSBmdW5jdGlvbiAoXG4gICAgY3Vyc29yRGVzY3JpcHRpb24sIG9yZGVyZWQsIGNhbGxiYWNrcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudGFpbGFibGUpIHtcbiAgICByZXR1cm4gc2VsZi5fb2JzZXJ2ZUNoYW5nZXNUYWlsYWJsZShjdXJzb3JEZXNjcmlwdGlvbiwgb3JkZXJlZCwgY2FsbGJhY2tzKTtcbiAgfVxuXG4gIC8vIFlvdSBtYXkgbm90IGZpbHRlciBvdXQgX2lkIHdoZW4gb2JzZXJ2aW5nIGNoYW5nZXMsIGJlY2F1c2UgdGhlIGlkIGlzIGEgY29yZVxuICAvLyBwYXJ0IG9mIHRoZSBvYnNlcnZlQ2hhbmdlcyBBUEkuXG4gIGlmIChjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLmZpZWxkcyAmJlxuICAgICAgKGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMuZmllbGRzLl9pZCA9PT0gMCB8fFxuICAgICAgIGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMuZmllbGRzLl9pZCA9PT0gZmFsc2UpKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJZb3UgbWF5IG5vdCBvYnNlcnZlIGEgY3Vyc29yIHdpdGgge2ZpZWxkczoge19pZDogMH19XCIpO1xuICB9XG5cbiAgdmFyIG9ic2VydmVLZXkgPSBFSlNPTi5zdHJpbmdpZnkoXG4gICAgXy5leHRlbmQoe29yZGVyZWQ6IG9yZGVyZWR9LCBjdXJzb3JEZXNjcmlwdGlvbikpO1xuXG4gIHZhciBtdWx0aXBsZXhlciwgb2JzZXJ2ZURyaXZlcjtcbiAgdmFyIGZpcnN0SGFuZGxlID0gZmFsc2U7XG5cbiAgLy8gRmluZCBhIG1hdGNoaW5nIE9ic2VydmVNdWx0aXBsZXhlciwgb3IgY3JlYXRlIGEgbmV3IG9uZS4gVGhpcyBuZXh0IGJsb2NrIGlzXG4gIC8vIGd1YXJhbnRlZWQgdG8gbm90IHlpZWxkIChhbmQgaXQgZG9lc24ndCBjYWxsIGFueXRoaW5nIHRoYXQgY2FuIG9ic2VydmUgYVxuICAvLyBuZXcgcXVlcnkpLCBzbyBubyBvdGhlciBjYWxscyB0byB0aGlzIGZ1bmN0aW9uIGNhbiBpbnRlcmxlYXZlIHdpdGggaXQuXG4gIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoXy5oYXMoc2VsZi5fb2JzZXJ2ZU11bHRpcGxleGVycywgb2JzZXJ2ZUtleSkpIHtcbiAgICAgIG11bHRpcGxleGVyID0gc2VsZi5fb2JzZXJ2ZU11bHRpcGxleGVyc1tvYnNlcnZlS2V5XTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmlyc3RIYW5kbGUgPSB0cnVlO1xuICAgICAgLy8gQ3JlYXRlIGEgbmV3IE9ic2VydmVNdWx0aXBsZXhlci5cbiAgICAgIG11bHRpcGxleGVyID0gbmV3IE9ic2VydmVNdWx0aXBsZXhlcih7XG4gICAgICAgIG9yZGVyZWQ6IG9yZGVyZWQsXG4gICAgICAgIG9uU3RvcDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGRlbGV0ZSBzZWxmLl9vYnNlcnZlTXVsdGlwbGV4ZXJzW29ic2VydmVLZXldO1xuICAgICAgICAgIG9ic2VydmVEcml2ZXIuc3RvcCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHNlbGYuX29ic2VydmVNdWx0aXBsZXhlcnNbb2JzZXJ2ZUtleV0gPSBtdWx0aXBsZXhlcjtcbiAgICB9XG4gIH0pO1xuXG4gIHZhciBvYnNlcnZlSGFuZGxlID0gbmV3IE9ic2VydmVIYW5kbGUobXVsdGlwbGV4ZXIsIGNhbGxiYWNrcyk7XG5cbiAgaWYgKGZpcnN0SGFuZGxlKSB7XG4gICAgdmFyIG1hdGNoZXIsIHNvcnRlcjtcbiAgICB2YXIgY2FuVXNlT3Bsb2cgPSBfLmFsbChbXG4gICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIEF0IGEgYmFyZSBtaW5pbXVtLCB1c2luZyB0aGUgb3Bsb2cgcmVxdWlyZXMgdXMgdG8gaGF2ZSBhbiBvcGxvZywgdG9cbiAgICAgICAgLy8gd2FudCB1bm9yZGVyZWQgY2FsbGJhY2tzLCBhbmQgdG8gbm90IHdhbnQgYSBjYWxsYmFjayBvbiB0aGUgcG9sbHNcbiAgICAgICAgLy8gdGhhdCB3b24ndCBoYXBwZW4uXG4gICAgICAgIHJldHVybiBzZWxmLl9vcGxvZ0hhbmRsZSAmJiAhb3JkZXJlZCAmJlxuICAgICAgICAgICFjYWxsYmFja3MuX3Rlc3RPbmx5UG9sbENhbGxiYWNrO1xuICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBXZSBuZWVkIHRvIGJlIGFibGUgdG8gY29tcGlsZSB0aGUgc2VsZWN0b3IuIEZhbGwgYmFjayB0byBwb2xsaW5nIGZvclxuICAgICAgICAvLyBzb21lIG5ld2ZhbmdsZWQgJHNlbGVjdG9yIHRoYXQgbWluaW1vbmdvIGRvZXNuJ3Qgc3VwcG9ydCB5ZXQuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbWF0Y2hlciA9IG5ldyBNaW5pbW9uZ28uTWF0Y2hlcihjdXJzb3JEZXNjcmlwdGlvbi5zZWxlY3Rvcik7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAvLyBYWFggbWFrZSBhbGwgY29tcGlsYXRpb24gZXJyb3JzIE1pbmltb25nb0Vycm9yIG9yIHNvbWV0aGluZ1xuICAgICAgICAgIC8vICAgICBzbyB0aGF0IHRoaXMgZG9lc24ndCBpZ25vcmUgdW5yZWxhdGVkIGV4Y2VwdGlvbnNcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gLi4uIGFuZCB0aGUgc2VsZWN0b3IgaXRzZWxmIG5lZWRzIHRvIHN1cHBvcnQgb3Bsb2cuXG4gICAgICAgIHJldHVybiBPcGxvZ09ic2VydmVEcml2ZXIuY3Vyc29yU3VwcG9ydGVkKGN1cnNvckRlc2NyaXB0aW9uLCBtYXRjaGVyKTtcbiAgICAgIH0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gQW5kIHdlIG5lZWQgdG8gYmUgYWJsZSB0byBjb21waWxlIHRoZSBzb3J0LCBpZiBhbnkuICBlZywgY2FuJ3QgYmVcbiAgICAgICAgLy8geyRuYXR1cmFsOiAxfS5cbiAgICAgICAgaWYgKCFjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnNvcnQpXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc29ydGVyID0gbmV3IE1pbmltb25nby5Tb3J0ZXIoY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5zb3J0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgbWF0Y2hlcjogbWF0Y2hlciB9KTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIC8vIFhYWCBtYWtlIGFsbCBjb21waWxhdGlvbiBlcnJvcnMgTWluaW1vbmdvRXJyb3Igb3Igc29tZXRoaW5nXG4gICAgICAgICAgLy8gICAgIHNvIHRoYXQgdGhpcyBkb2Vzbid0IGlnbm9yZSB1bnJlbGF0ZWQgZXhjZXB0aW9uc1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfV0sIGZ1bmN0aW9uIChmKSB7IHJldHVybiBmKCk7IH0pOyAgLy8gaW52b2tlIGVhY2ggZnVuY3Rpb25cblxuICAgIHZhciBkcml2ZXJDbGFzcyA9IGNhblVzZU9wbG9nID8gT3Bsb2dPYnNlcnZlRHJpdmVyIDogUG9sbGluZ09ic2VydmVEcml2ZXI7XG4gICAgb2JzZXJ2ZURyaXZlciA9IG5ldyBkcml2ZXJDbGFzcyh7XG4gICAgICBjdXJzb3JEZXNjcmlwdGlvbjogY3Vyc29yRGVzY3JpcHRpb24sXG4gICAgICBtb25nb0hhbmRsZTogc2VsZixcbiAgICAgIG11bHRpcGxleGVyOiBtdWx0aXBsZXhlcixcbiAgICAgIG9yZGVyZWQ6IG9yZGVyZWQsXG4gICAgICBtYXRjaGVyOiBtYXRjaGVyLCAgLy8gaWdub3JlZCBieSBwb2xsaW5nXG4gICAgICBzb3J0ZXI6IHNvcnRlciwgIC8vIGlnbm9yZWQgYnkgcG9sbGluZ1xuICAgICAgX3Rlc3RPbmx5UG9sbENhbGxiYWNrOiBjYWxsYmFja3MuX3Rlc3RPbmx5UG9sbENhbGxiYWNrXG4gICAgfSk7XG5cbiAgICAvLyBUaGlzIGZpZWxkIGlzIG9ubHkgc2V0IGZvciB1c2UgaW4gdGVzdHMuXG4gICAgbXVsdGlwbGV4ZXIuX29ic2VydmVEcml2ZXIgPSBvYnNlcnZlRHJpdmVyO1xuICB9XG5cbiAgLy8gQmxvY2tzIHVudGlsIHRoZSBpbml0aWFsIGFkZHMgaGF2ZSBiZWVuIHNlbnQuXG4gIG11bHRpcGxleGVyLmFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkcyhvYnNlcnZlSGFuZGxlKTtcblxuICByZXR1cm4gb2JzZXJ2ZUhhbmRsZTtcbn07XG5cbi8vIExpc3RlbiBmb3IgdGhlIGludmFsaWRhdGlvbiBtZXNzYWdlcyB0aGF0IHdpbGwgdHJpZ2dlciB1cyB0byBwb2xsIHRoZVxuLy8gZGF0YWJhc2UgZm9yIGNoYW5nZXMuIElmIHRoaXMgc2VsZWN0b3Igc3BlY2lmaWVzIHNwZWNpZmljIElEcywgc3BlY2lmeSB0aGVtXG4vLyBoZXJlLCBzbyB0aGF0IHVwZGF0ZXMgdG8gZGlmZmVyZW50IHNwZWNpZmljIElEcyBkb24ndCBjYXVzZSB1cyB0byBwb2xsLlxuLy8gbGlzdGVuQ2FsbGJhY2sgaXMgdGhlIHNhbWUga2luZCBvZiAobm90aWZpY2F0aW9uLCBjb21wbGV0ZSkgY2FsbGJhY2sgcGFzc2VkXG4vLyB0byBJbnZhbGlkYXRpb25Dcm9zc2Jhci5saXN0ZW4uXG5cbmxpc3RlbkFsbCA9IGZ1bmN0aW9uIChjdXJzb3JEZXNjcmlwdGlvbiwgbGlzdGVuQ2FsbGJhY2spIHtcbiAgdmFyIGxpc3RlbmVycyA9IFtdO1xuICBmb3JFYWNoVHJpZ2dlcihjdXJzb3JEZXNjcmlwdGlvbiwgZnVuY3Rpb24gKHRyaWdnZXIpIHtcbiAgICBsaXN0ZW5lcnMucHVzaChERFBTZXJ2ZXIuX0ludmFsaWRhdGlvbkNyb3NzYmFyLmxpc3RlbihcbiAgICAgIHRyaWdnZXIsIGxpc3RlbkNhbGxiYWNrKSk7XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgICAgXy5lYWNoKGxpc3RlbmVycywgZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgICAgIGxpc3RlbmVyLnN0b3AoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn07XG5cbmZvckVhY2hUcmlnZ2VyID0gZnVuY3Rpb24gKGN1cnNvckRlc2NyaXB0aW9uLCB0cmlnZ2VyQ2FsbGJhY2spIHtcbiAgdmFyIGtleSA9IHtjb2xsZWN0aW9uOiBjdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZX07XG4gIHZhciBzcGVjaWZpY0lkcyA9IExvY2FsQ29sbGVjdGlvbi5faWRzTWF0Y2hlZEJ5U2VsZWN0b3IoXG4gICAgY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IpO1xuICBpZiAoc3BlY2lmaWNJZHMpIHtcbiAgICBfLmVhY2goc3BlY2lmaWNJZHMsIGZ1bmN0aW9uIChpZCkge1xuICAgICAgdHJpZ2dlckNhbGxiYWNrKF8uZXh0ZW5kKHtpZDogaWR9LCBrZXkpKTtcbiAgICB9KTtcbiAgICB0cmlnZ2VyQ2FsbGJhY2soXy5leHRlbmQoe2Ryb3BDb2xsZWN0aW9uOiB0cnVlLCBpZDogbnVsbH0sIGtleSkpO1xuICB9IGVsc2Uge1xuICAgIHRyaWdnZXJDYWxsYmFjayhrZXkpO1xuICB9XG4gIC8vIEV2ZXJ5b25lIGNhcmVzIGFib3V0IHRoZSBkYXRhYmFzZSBiZWluZyBkcm9wcGVkLlxuICB0cmlnZ2VyQ2FsbGJhY2soeyBkcm9wRGF0YWJhc2U6IHRydWUgfSk7XG59O1xuXG4vLyBvYnNlcnZlQ2hhbmdlcyBmb3IgdGFpbGFibGUgY3Vyc29ycyBvbiBjYXBwZWQgY29sbGVjdGlvbnMuXG4vL1xuLy8gU29tZSBkaWZmZXJlbmNlcyBmcm9tIG5vcm1hbCBjdXJzb3JzOlxuLy8gICAtIFdpbGwgbmV2ZXIgcHJvZHVjZSBhbnl0aGluZyBvdGhlciB0aGFuICdhZGRlZCcgb3IgJ2FkZGVkQmVmb3JlJy4gSWYgeW91XG4vLyAgICAgZG8gdXBkYXRlIGEgZG9jdW1lbnQgdGhhdCBoYXMgYWxyZWFkeSBiZWVuIHByb2R1Y2VkLCB0aGlzIHdpbGwgbm90IG5vdGljZVxuLy8gICAgIGl0LlxuLy8gICAtIElmIHlvdSBkaXNjb25uZWN0IGFuZCByZWNvbm5lY3QgZnJvbSBNb25nbywgaXQgd2lsbCBlc3NlbnRpYWxseSByZXN0YXJ0XG4vLyAgICAgdGhlIHF1ZXJ5LCB3aGljaCB3aWxsIGxlYWQgdG8gZHVwbGljYXRlIHJlc3VsdHMuIFRoaXMgaXMgcHJldHR5IGJhZCxcbi8vICAgICBidXQgaWYgeW91IGluY2x1ZGUgYSBmaWVsZCBjYWxsZWQgJ3RzJyB3aGljaCBpcyBpbnNlcnRlZCBhc1xuLy8gICAgIG5ldyBNb25nb0ludGVybmFscy5Nb25nb1RpbWVzdGFtcCgwLCAwKSAod2hpY2ggaXMgaW5pdGlhbGl6ZWQgdG8gdGhlXG4vLyAgICAgY3VycmVudCBNb25nby1zdHlsZSB0aW1lc3RhbXApLCB3ZSdsbCBiZSBhYmxlIHRvIGZpbmQgdGhlIHBsYWNlIHRvXG4vLyAgICAgcmVzdGFydCBwcm9wZXJseS4gKFRoaXMgZmllbGQgaXMgc3BlY2lmaWNhbGx5IHVuZGVyc3Rvb2QgYnkgTW9uZ28gd2l0aCBhblxuLy8gICAgIG9wdGltaXphdGlvbiB3aGljaCBhbGxvd3MgaXQgdG8gZmluZCB0aGUgcmlnaHQgcGxhY2UgdG8gc3RhcnQgd2l0aG91dFxuLy8gICAgIGFuIGluZGV4IG9uIHRzLiBJdCdzIGhvdyB0aGUgb3Bsb2cgd29ya3MuKVxuLy8gICAtIE5vIGNhbGxiYWNrcyBhcmUgdHJpZ2dlcmVkIHN5bmNocm9ub3VzbHkgd2l0aCB0aGUgY2FsbCAodGhlcmUncyBub1xuLy8gICAgIGRpZmZlcmVudGlhdGlvbiBiZXR3ZWVuIFwiaW5pdGlhbCBkYXRhXCIgYW5kIFwibGF0ZXIgY2hhbmdlc1wiOyBldmVyeXRoaW5nXG4vLyAgICAgdGhhdCBtYXRjaGVzIHRoZSBxdWVyeSBnZXRzIHNlbnQgYXN5bmNocm9ub3VzbHkpLlxuLy8gICAtIERlLWR1cGxpY2F0aW9uIGlzIG5vdCBpbXBsZW1lbnRlZC5cbi8vICAgLSBEb2VzIG5vdCB5ZXQgaW50ZXJhY3Qgd2l0aCB0aGUgd3JpdGUgZmVuY2UuIFByb2JhYmx5LCB0aGlzIHNob3VsZCB3b3JrIGJ5XG4vLyAgICAgaWdub3JpbmcgcmVtb3ZlcyAod2hpY2ggZG9uJ3Qgd29yayBvbiBjYXBwZWQgY29sbGVjdGlvbnMpIGFuZCB1cGRhdGVzXG4vLyAgICAgKHdoaWNoIGRvbid0IGFmZmVjdCB0YWlsYWJsZSBjdXJzb3JzKSwgYW5kIGp1c3Qga2VlcGluZyB0cmFjayBvZiB0aGUgSURcbi8vICAgICBvZiB0aGUgaW5zZXJ0ZWQgb2JqZWN0LCBhbmQgY2xvc2luZyB0aGUgd3JpdGUgZmVuY2Ugb25jZSB5b3UgZ2V0IHRvIHRoYXRcbi8vICAgICBJRCAob3IgdGltZXN0YW1wPykuICBUaGlzIGRvZXNuJ3Qgd29yayB3ZWxsIGlmIHRoZSBkb2N1bWVudCBkb2Vzbid0IG1hdGNoXG4vLyAgICAgdGhlIHF1ZXJ5LCB0aG91Z2guICBPbiB0aGUgb3RoZXIgaGFuZCwgdGhlIHdyaXRlIGZlbmNlIGNhbiBjbG9zZVxuLy8gICAgIGltbWVkaWF0ZWx5IGlmIGl0IGRvZXMgbm90IG1hdGNoIHRoZSBxdWVyeS4gU28gaWYgd2UgdHJ1c3QgbWluaW1vbmdvXG4vLyAgICAgZW5vdWdoIHRvIGFjY3VyYXRlbHkgZXZhbHVhdGUgdGhlIHF1ZXJ5IGFnYWluc3QgdGhlIHdyaXRlIGZlbmNlLCB3ZVxuLy8gICAgIHNob3VsZCBiZSBhYmxlIHRvIGRvIHRoaXMuLi4gIE9mIGNvdXJzZSwgbWluaW1vbmdvIGRvZXNuJ3QgZXZlbiBzdXBwb3J0XG4vLyAgICAgTW9uZ28gVGltZXN0YW1wcyB5ZXQuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9vYnNlcnZlQ2hhbmdlc1RhaWxhYmxlID0gZnVuY3Rpb24gKFxuICAgIGN1cnNvckRlc2NyaXB0aW9uLCBvcmRlcmVkLCBjYWxsYmFja3MpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIFRhaWxhYmxlIGN1cnNvcnMgb25seSBldmVyIGNhbGwgYWRkZWQvYWRkZWRCZWZvcmUgY2FsbGJhY2tzLCBzbyBpdCdzIGFuXG4gIC8vIGVycm9yIGlmIHlvdSBkaWRuJ3QgcHJvdmlkZSB0aGVtLlxuICBpZiAoKG9yZGVyZWQgJiYgIWNhbGxiYWNrcy5hZGRlZEJlZm9yZSkgfHxcbiAgICAgICghb3JkZXJlZCAmJiAhY2FsbGJhY2tzLmFkZGVkKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IG9ic2VydmUgYW4gXCIgKyAob3JkZXJlZCA/IFwib3JkZXJlZFwiIDogXCJ1bm9yZGVyZWRcIilcbiAgICAgICAgICAgICAgICAgICAgKyBcIiB0YWlsYWJsZSBjdXJzb3Igd2l0aG91dCBhIFwiXG4gICAgICAgICAgICAgICAgICAgICsgKG9yZGVyZWQgPyBcImFkZGVkQmVmb3JlXCIgOiBcImFkZGVkXCIpICsgXCIgY2FsbGJhY2tcIik7XG4gIH1cblxuICByZXR1cm4gc2VsZi50YWlsKGN1cnNvckRlc2NyaXB0aW9uLCBmdW5jdGlvbiAoZG9jKSB7XG4gICAgdmFyIGlkID0gZG9jLl9pZDtcbiAgICBkZWxldGUgZG9jLl9pZDtcbiAgICAvLyBUaGUgdHMgaXMgYW4gaW1wbGVtZW50YXRpb24gZGV0YWlsLiBIaWRlIGl0LlxuICAgIGRlbGV0ZSBkb2MudHM7XG4gICAgaWYgKG9yZGVyZWQpIHtcbiAgICAgIGNhbGxiYWNrcy5hZGRlZEJlZm9yZShpZCwgZG9jLCBudWxsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2tzLmFkZGVkKGlkLCBkb2MpO1xuICAgIH1cbiAgfSk7XG59O1xuXG4vLyBYWFggV2UgcHJvYmFibHkgbmVlZCB0byBmaW5kIGEgYmV0dGVyIHdheSB0byBleHBvc2UgdGhpcy4gUmlnaHQgbm93XG4vLyBpdCdzIG9ubHkgdXNlZCBieSB0ZXN0cywgYnV0IGluIGZhY3QgeW91IG5lZWQgaXQgaW4gbm9ybWFsXG4vLyBvcGVyYXRpb24gdG8gaW50ZXJhY3Qgd2l0aCBjYXBwZWQgY29sbGVjdGlvbnMuXG5Nb25nb0ludGVybmFscy5Nb25nb1RpbWVzdGFtcCA9IE1vbmdvREIuVGltZXN0YW1wO1xuXG5Nb25nb0ludGVybmFscy5Db25uZWN0aW9uID0gTW9uZ29Db25uZWN0aW9uO1xuIiwidmFyIEZ1dHVyZSA9IE5wbS5yZXF1aXJlKCdmaWJlcnMvZnV0dXJlJyk7XG5cbk9QTE9HX0NPTExFQ1RJT04gPSAnb3Bsb2cucnMnO1xuXG52YXIgVE9PX0ZBUl9CRUhJTkQgPSBwcm9jZXNzLmVudi5NRVRFT1JfT1BMT0dfVE9PX0ZBUl9CRUhJTkQgfHwgMjAwMDtcbnZhciBUQUlMX1RJTUVPVVQgPSArcHJvY2Vzcy5lbnYuTUVURU9SX09QTE9HX1RBSUxfVElNRU9VVCB8fCAzMDAwMDtcblxudmFyIHNob3dUUyA9IGZ1bmN0aW9uICh0cykge1xuICByZXR1cm4gXCJUaW1lc3RhbXAoXCIgKyB0cy5nZXRIaWdoQml0cygpICsgXCIsIFwiICsgdHMuZ2V0TG93Qml0cygpICsgXCIpXCI7XG59O1xuXG5pZEZvck9wID0gZnVuY3Rpb24gKG9wKSB7XG4gIGlmIChvcC5vcCA9PT0gJ2QnKVxuICAgIHJldHVybiBvcC5vLl9pZDtcbiAgZWxzZSBpZiAob3Aub3AgPT09ICdpJylcbiAgICByZXR1cm4gb3Auby5faWQ7XG4gIGVsc2UgaWYgKG9wLm9wID09PSAndScpXG4gICAgcmV0dXJuIG9wLm8yLl9pZDtcbiAgZWxzZSBpZiAob3Aub3AgPT09ICdjJylcbiAgICB0aHJvdyBFcnJvcihcIk9wZXJhdG9yICdjJyBkb2Vzbid0IHN1cHBseSBhbiBvYmplY3Qgd2l0aCBpZDogXCIgK1xuICAgICAgICAgICAgICAgIEVKU09OLnN0cmluZ2lmeShvcCkpO1xuICBlbHNlXG4gICAgdGhyb3cgRXJyb3IoXCJVbmtub3duIG9wOiBcIiArIEVKU09OLnN0cmluZ2lmeShvcCkpO1xufTtcblxuT3Bsb2dIYW5kbGUgPSBmdW5jdGlvbiAob3Bsb2dVcmwsIGRiTmFtZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYuX29wbG9nVXJsID0gb3Bsb2dVcmw7XG4gIHNlbGYuX2RiTmFtZSA9IGRiTmFtZTtcblxuICBzZWxmLl9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb24gPSBudWxsO1xuICBzZWxmLl9vcGxvZ1RhaWxDb25uZWN0aW9uID0gbnVsbDtcbiAgc2VsZi5fc3RvcHBlZCA9IGZhbHNlO1xuICBzZWxmLl90YWlsSGFuZGxlID0gbnVsbDtcbiAgc2VsZi5fcmVhZHlGdXR1cmUgPSBuZXcgRnV0dXJlKCk7XG4gIHNlbGYuX2Nyb3NzYmFyID0gbmV3IEREUFNlcnZlci5fQ3Jvc3NiYXIoe1xuICAgIGZhY3RQYWNrYWdlOiBcIm1vbmdvLWxpdmVkYXRhXCIsIGZhY3ROYW1lOiBcIm9wbG9nLXdhdGNoZXJzXCJcbiAgfSk7XG4gIHNlbGYuX2Jhc2VPcGxvZ1NlbGVjdG9yID0ge1xuICAgIG5zOiBuZXcgUmVnRXhwKCdeJyArIE1ldGVvci5fZXNjYXBlUmVnRXhwKHNlbGYuX2RiTmFtZSkgKyAnXFxcXC4nKSxcbiAgICAkb3I6IFtcbiAgICAgIHsgb3A6IHskaW46IFsnaScsICd1JywgJ2QnXX0gfSxcbiAgICAgIC8vIGRyb3AgY29sbGVjdGlvblxuICAgICAgeyBvcDogJ2MnLCAnby5kcm9wJzogeyAkZXhpc3RzOiB0cnVlIH0gfSxcbiAgICAgIHsgb3A6ICdjJywgJ28uZHJvcERhdGFiYXNlJzogMSB9LFxuICAgIF1cbiAgfTtcblxuICAvLyBEYXRhIHN0cnVjdHVyZXMgdG8gc3VwcG9ydCB3YWl0VW50aWxDYXVnaHRVcCgpLiBFYWNoIG9wbG9nIGVudHJ5IGhhcyBhXG4gIC8vIE1vbmdvVGltZXN0YW1wIG9iamVjdCBvbiBpdCAod2hpY2ggaXMgbm90IHRoZSBzYW1lIGFzIGEgRGF0ZSAtLS0gaXQncyBhXG4gIC8vIGNvbWJpbmF0aW9uIG9mIHRpbWUgYW5kIGFuIGluY3JlbWVudGluZyBjb3VudGVyOyBzZWVcbiAgLy8gaHR0cDovL2RvY3MubW9uZ29kYi5vcmcvbWFudWFsL3JlZmVyZW5jZS9ic29uLXR5cGVzLyN0aW1lc3RhbXBzKS5cbiAgLy9cbiAgLy8gX2NhdGNoaW5nVXBGdXR1cmVzIGlzIGFuIGFycmF5IG9mIHt0czogTW9uZ29UaW1lc3RhbXAsIGZ1dHVyZTogRnV0dXJlfVxuICAvLyBvYmplY3RzLCBzb3J0ZWQgYnkgYXNjZW5kaW5nIHRpbWVzdGFtcC4gX2xhc3RQcm9jZXNzZWRUUyBpcyB0aGVcbiAgLy8gTW9uZ29UaW1lc3RhbXAgb2YgdGhlIGxhc3Qgb3Bsb2cgZW50cnkgd2UndmUgcHJvY2Vzc2VkLlxuICAvL1xuICAvLyBFYWNoIHRpbWUgd2UgY2FsbCB3YWl0VW50aWxDYXVnaHRVcCwgd2UgdGFrZSBhIHBlZWsgYXQgdGhlIGZpbmFsIG9wbG9nXG4gIC8vIGVudHJ5IGluIHRoZSBkYi4gIElmIHdlJ3ZlIGFscmVhZHkgcHJvY2Vzc2VkIGl0IChpZSwgaXQgaXMgbm90IGdyZWF0ZXIgdGhhblxuICAvLyBfbGFzdFByb2Nlc3NlZFRTKSwgd2FpdFVudGlsQ2F1Z2h0VXAgaW1tZWRpYXRlbHkgcmV0dXJucy4gT3RoZXJ3aXNlLFxuICAvLyB3YWl0VW50aWxDYXVnaHRVcCBtYWtlcyBhIG5ldyBGdXR1cmUgYW5kIGluc2VydHMgaXQgYWxvbmcgd2l0aCB0aGUgZmluYWxcbiAgLy8gdGltZXN0YW1wIGVudHJ5IHRoYXQgaXQgcmVhZCwgaW50byBfY2F0Y2hpbmdVcEZ1dHVyZXMuIHdhaXRVbnRpbENhdWdodFVwXG4gIC8vIHRoZW4gd2FpdHMgb24gdGhhdCBmdXR1cmUsIHdoaWNoIGlzIHJlc29sdmVkIG9uY2UgX2xhc3RQcm9jZXNzZWRUUyBpc1xuICAvLyBpbmNyZW1lbnRlZCB0byBiZSBwYXN0IGl0cyB0aW1lc3RhbXAgYnkgdGhlIHdvcmtlciBmaWJlci5cbiAgLy9cbiAgLy8gWFhYIHVzZSBhIHByaW9yaXR5IHF1ZXVlIG9yIHNvbWV0aGluZyBlbHNlIHRoYXQncyBmYXN0ZXIgdGhhbiBhbiBhcnJheVxuICBzZWxmLl9jYXRjaGluZ1VwRnV0dXJlcyA9IFtdO1xuICBzZWxmLl9sYXN0UHJvY2Vzc2VkVFMgPSBudWxsO1xuXG4gIHNlbGYuX29uU2tpcHBlZEVudHJpZXNIb29rID0gbmV3IEhvb2soe1xuICAgIGRlYnVnUHJpbnRFeGNlcHRpb25zOiBcIm9uU2tpcHBlZEVudHJpZXMgY2FsbGJhY2tcIlxuICB9KTtcblxuICBzZWxmLl9lbnRyeVF1ZXVlID0gbmV3IE1ldGVvci5fRG91YmxlRW5kZWRRdWV1ZSgpO1xuICBzZWxmLl93b3JrZXJBY3RpdmUgPSBmYWxzZTtcblxuICBzZWxmLl9zdGFydFRhaWxpbmcoKTtcbn07XG5cbl8uZXh0ZW5kKE9wbG9nSGFuZGxlLnByb3RvdHlwZSwge1xuICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuO1xuICAgIHNlbGYuX3N0b3BwZWQgPSB0cnVlO1xuICAgIGlmIChzZWxmLl90YWlsSGFuZGxlKVxuICAgICAgc2VsZi5fdGFpbEhhbmRsZS5zdG9wKCk7XG4gICAgLy8gWFhYIHNob3VsZCBjbG9zZSBjb25uZWN0aW9ucyB0b29cbiAgfSxcbiAgb25PcGxvZ0VudHJ5OiBmdW5jdGlvbiAodHJpZ2dlciwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYWxsZWQgb25PcGxvZ0VudHJ5IG9uIHN0b3BwZWQgaGFuZGxlIVwiKTtcblxuICAgIC8vIENhbGxpbmcgb25PcGxvZ0VudHJ5IHJlcXVpcmVzIHVzIHRvIHdhaXQgZm9yIHRoZSB0YWlsaW5nIHRvIGJlIHJlYWR5LlxuICAgIHNlbGYuX3JlYWR5RnV0dXJlLndhaXQoKTtcblxuICAgIHZhciBvcmlnaW5hbENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgY2FsbGJhY2sgPSBNZXRlb3IuYmluZEVudmlyb25tZW50KGZ1bmN0aW9uIChub3RpZmljYXRpb24pIHtcbiAgICAgIG9yaWdpbmFsQ2FsbGJhY2sobm90aWZpY2F0aW9uKTtcbiAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICBNZXRlb3IuX2RlYnVnKFwiRXJyb3IgaW4gb3Bsb2cgY2FsbGJhY2tcIiwgZXJyKTtcbiAgICB9KTtcbiAgICB2YXIgbGlzdGVuSGFuZGxlID0gc2VsZi5fY3Jvc3NiYXIubGlzdGVuKHRyaWdnZXIsIGNhbGxiYWNrKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgICAgICBsaXN0ZW5IYW5kbGUuc3RvcCgpO1xuICAgICAgfVxuICAgIH07XG4gIH0sXG4gIC8vIFJlZ2lzdGVyIGEgY2FsbGJhY2sgdG8gYmUgaW52b2tlZCBhbnkgdGltZSB3ZSBza2lwIG9wbG9nIGVudHJpZXMgKGVnLFxuICAvLyBiZWNhdXNlIHdlIGFyZSB0b28gZmFyIGJlaGluZCkuXG4gIG9uU2tpcHBlZEVudHJpZXM6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbGxlZCBvblNraXBwZWRFbnRyaWVzIG9uIHN0b3BwZWQgaGFuZGxlIVwiKTtcbiAgICByZXR1cm4gc2VsZi5fb25Ta2lwcGVkRW50cmllc0hvb2sucmVnaXN0ZXIoY2FsbGJhY2spO1xuICB9LFxuICAvLyBDYWxscyBgY2FsbGJhY2tgIG9uY2UgdGhlIG9wbG9nIGhhcyBiZWVuIHByb2Nlc3NlZCB1cCB0byBhIHBvaW50IHRoYXQgaXNcbiAgLy8gcm91Z2hseSBcIm5vd1wiOiBzcGVjaWZpY2FsbHksIG9uY2Ugd2UndmUgcHJvY2Vzc2VkIGFsbCBvcHMgdGhhdCBhcmVcbiAgLy8gY3VycmVudGx5IHZpc2libGUuXG4gIC8vIFhYWCBiZWNvbWUgY29udmluY2VkIHRoYXQgdGhpcyBpcyBhY3R1YWxseSBzYWZlIGV2ZW4gaWYgb3Bsb2dDb25uZWN0aW9uXG4gIC8vIGlzIHNvbWUga2luZCBvZiBwb29sXG4gIHdhaXRVbnRpbENhdWdodFVwOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGVkIHdhaXRVbnRpbENhdWdodFVwIG9uIHN0b3BwZWQgaGFuZGxlIVwiKTtcblxuICAgIC8vIENhbGxpbmcgd2FpdFVudGlsQ2F1Z2h0VXAgcmVxdXJpZXMgdXMgdG8gd2FpdCBmb3IgdGhlIG9wbG9nIGNvbm5lY3Rpb24gdG9cbiAgICAvLyBiZSByZWFkeS5cbiAgICBzZWxmLl9yZWFkeUZ1dHVyZS53YWl0KCk7XG4gICAgdmFyIGxhc3RFbnRyeTtcblxuICAgIHdoaWxlICghc2VsZi5fc3RvcHBlZCkge1xuICAgICAgLy8gV2UgbmVlZCB0byBtYWtlIHRoZSBzZWxlY3RvciBhdCBsZWFzdCBhcyByZXN0cmljdGl2ZSBhcyB0aGUgYWN0dWFsXG4gICAgICAvLyB0YWlsaW5nIHNlbGVjdG9yIChpZSwgd2UgbmVlZCB0byBzcGVjaWZ5IHRoZSBEQiBuYW1lKSBvciBlbHNlIHdlIG1pZ2h0XG4gICAgICAvLyBmaW5kIGEgVFMgdGhhdCB3b24ndCBzaG93IHVwIGluIHRoZSBhY3R1YWwgdGFpbCBzdHJlYW0uXG4gICAgICB0cnkge1xuICAgICAgICBsYXN0RW50cnkgPSBzZWxmLl9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb24uZmluZE9uZShcbiAgICAgICAgICBPUExPR19DT0xMRUNUSU9OLCBzZWxmLl9iYXNlT3Bsb2dTZWxlY3RvcixcbiAgICAgICAgICB7ZmllbGRzOiB7dHM6IDF9LCBzb3J0OiB7JG5hdHVyYWw6IC0xfX0pO1xuICAgICAgICBicmVhaztcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gRHVyaW5nIGZhaWxvdmVyIChlZykgaWYgd2UgZ2V0IGFuIGV4Y2VwdGlvbiB3ZSBzaG91bGQgbG9nIGFuZCByZXRyeVxuICAgICAgICAvLyBpbnN0ZWFkIG9mIGNyYXNoaW5nLlxuICAgICAgICBNZXRlb3IuX2RlYnVnKFwiR290IGV4Y2VwdGlvbiB3aGlsZSByZWFkaW5nIGxhc3QgZW50cnlcIiwgZSk7XG4gICAgICAgIE1ldGVvci5fc2xlZXBGb3JNcygxMDApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgaWYgKCFsYXN0RW50cnkpIHtcbiAgICAgIC8vIFJlYWxseSwgbm90aGluZyBpbiB0aGUgb3Bsb2c/IFdlbGwsIHdlJ3ZlIHByb2Nlc3NlZCBldmVyeXRoaW5nLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciB0cyA9IGxhc3RFbnRyeS50cztcbiAgICBpZiAoIXRzKVxuICAgICAgdGhyb3cgRXJyb3IoXCJvcGxvZyBlbnRyeSB3aXRob3V0IHRzOiBcIiArIEVKU09OLnN0cmluZ2lmeShsYXN0RW50cnkpKTtcblxuICAgIGlmIChzZWxmLl9sYXN0UHJvY2Vzc2VkVFMgJiYgdHMubGVzc1RoYW5PckVxdWFsKHNlbGYuX2xhc3RQcm9jZXNzZWRUUykpIHtcbiAgICAgIC8vIFdlJ3ZlIGFscmVhZHkgY2F1Z2h0IHVwIHRvIGhlcmUuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG5cbiAgICAvLyBJbnNlcnQgdGhlIGZ1dHVyZSBpbnRvIG91ciBsaXN0LiBBbG1vc3QgYWx3YXlzLCB0aGlzIHdpbGwgYmUgYXQgdGhlIGVuZCxcbiAgICAvLyBidXQgaXQncyBjb25jZWl2YWJsZSB0aGF0IGlmIHdlIGZhaWwgb3ZlciBmcm9tIG9uZSBwcmltYXJ5IHRvIGFub3RoZXIsXG4gICAgLy8gdGhlIG9wbG9nIGVudHJpZXMgd2Ugc2VlIHdpbGwgZ28gYmFja3dhcmRzLlxuICAgIHZhciBpbnNlcnRBZnRlciA9IHNlbGYuX2NhdGNoaW5nVXBGdXR1cmVzLmxlbmd0aDtcbiAgICB3aGlsZSAoaW5zZXJ0QWZ0ZXIgLSAxID4gMCAmJiBzZWxmLl9jYXRjaGluZ1VwRnV0dXJlc1tpbnNlcnRBZnRlciAtIDFdLnRzLmdyZWF0ZXJUaGFuKHRzKSkge1xuICAgICAgaW5zZXJ0QWZ0ZXItLTtcbiAgICB9XG4gICAgdmFyIGYgPSBuZXcgRnV0dXJlO1xuICAgIHNlbGYuX2NhdGNoaW5nVXBGdXR1cmVzLnNwbGljZShpbnNlcnRBZnRlciwgMCwge3RzOiB0cywgZnV0dXJlOiBmfSk7XG4gICAgZi53YWl0KCk7XG4gIH0sXG4gIF9zdGFydFRhaWxpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gRmlyc3QsIG1ha2Ugc3VyZSB0aGF0IHdlJ3JlIHRhbGtpbmcgdG8gdGhlIGxvY2FsIGRhdGFiYXNlLlxuICAgIHZhciBtb25nb2RiVXJpID0gTnBtLnJlcXVpcmUoJ21vbmdvZGItdXJpJyk7XG4gICAgaWYgKG1vbmdvZGJVcmkucGFyc2Uoc2VsZi5fb3Bsb2dVcmwpLmRhdGFiYXNlICE9PSAnbG9jYWwnKSB7XG4gICAgICB0aHJvdyBFcnJvcihcIiRNT05HT19PUExPR19VUkwgbXVzdCBiZSBzZXQgdG8gdGhlICdsb2NhbCcgZGF0YWJhc2Ugb2YgXCIgK1xuICAgICAgICAgICAgICAgICAgXCJhIE1vbmdvIHJlcGxpY2Egc2V0XCIpO1xuICAgIH1cblxuICAgIC8vIFdlIG1ha2UgdHdvIHNlcGFyYXRlIGNvbm5lY3Rpb25zIHRvIE1vbmdvLiBUaGUgTm9kZSBNb25nbyBkcml2ZXJcbiAgICAvLyBpbXBsZW1lbnRzIGEgbmFpdmUgcm91bmQtcm9iaW4gY29ubmVjdGlvbiBwb29sOiBlYWNoIFwiY29ubmVjdGlvblwiIGlzIGFcbiAgICAvLyBwb29sIG9mIHNldmVyYWwgKDUgYnkgZGVmYXVsdCkgVENQIGNvbm5lY3Rpb25zLCBhbmQgZWFjaCByZXF1ZXN0IGlzXG4gICAgLy8gcm90YXRlZCB0aHJvdWdoIHRoZSBwb29scy4gVGFpbGFibGUgY3Vyc29yIHF1ZXJpZXMgYmxvY2sgb24gdGhlIHNlcnZlclxuICAgIC8vIHVudGlsIHRoZXJlIGlzIHNvbWUgZGF0YSB0byByZXR1cm4gKG9yIHVudGlsIGEgZmV3IHNlY29uZHMgaGF2ZVxuICAgIC8vIHBhc3NlZCkuIFNvIGlmIHRoZSBjb25uZWN0aW9uIHBvb2wgdXNlZCBmb3IgdGFpbGluZyBjdXJzb3JzIGlzIHRoZSBzYW1lXG4gICAgLy8gcG9vbCB1c2VkIGZvciBvdGhlciBxdWVyaWVzLCB0aGUgb3RoZXIgcXVlcmllcyB3aWxsIGJlIGRlbGF5ZWQgYnkgc2Vjb25kc1xuICAgIC8vIDEvNSBvZiB0aGUgdGltZS5cbiAgICAvL1xuICAgIC8vIFRoZSB0YWlsIGNvbm5lY3Rpb24gd2lsbCBvbmx5IGV2ZXIgYmUgcnVubmluZyBhIHNpbmdsZSB0YWlsIGNvbW1hbmQsIHNvXG4gICAgLy8gaXQgb25seSBuZWVkcyB0byBtYWtlIG9uZSB1bmRlcmx5aW5nIFRDUCBjb25uZWN0aW9uLlxuICAgIHNlbGYuX29wbG9nVGFpbENvbm5lY3Rpb24gPSBuZXcgTW9uZ29Db25uZWN0aW9uKFxuICAgICAgc2VsZi5fb3Bsb2dVcmwsIHtwb29sU2l6ZTogMX0pO1xuICAgIC8vIFhYWCBiZXR0ZXIgZG9jcywgYnV0OiBpdCdzIHRvIGdldCBtb25vdG9uaWMgcmVzdWx0c1xuICAgIC8vIFhYWCBpcyBpdCBzYWZlIHRvIHNheSBcImlmIHRoZXJlJ3MgYW4gaW4gZmxpZ2h0IHF1ZXJ5LCBqdXN0IHVzZSBpdHNcbiAgICAvLyAgICAgcmVzdWx0c1wiPyBJIGRvbid0IHRoaW5rIHNvIGJ1dCBzaG91bGQgY29uc2lkZXIgdGhhdFxuICAgIHNlbGYuX29wbG9nTGFzdEVudHJ5Q29ubmVjdGlvbiA9IG5ldyBNb25nb0Nvbm5lY3Rpb24oXG4gICAgICBzZWxmLl9vcGxvZ1VybCwge3Bvb2xTaXplOiAxfSk7XG5cbiAgICAvLyBOb3csIG1ha2Ugc3VyZSB0aGF0IHRoZXJlIGFjdHVhbGx5IGlzIGEgcmVwbCBzZXQgaGVyZS4gSWYgbm90LCBvcGxvZ1xuICAgIC8vIHRhaWxpbmcgd29uJ3QgZXZlciBmaW5kIGFueXRoaW5nIVxuICAgIC8vIE1vcmUgb24gdGhlIGlzTWFzdGVyRG9jXG4gICAgLy8gaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9yZWZlcmVuY2UvY29tbWFuZC9pc01hc3Rlci9cbiAgICB2YXIgZiA9IG5ldyBGdXR1cmU7XG4gICAgc2VsZi5fb3Bsb2dMYXN0RW50cnlDb25uZWN0aW9uLmRiLmFkbWluKCkuY29tbWFuZChcbiAgICAgIHsgaXNtYXN0ZXI6IDEgfSwgZi5yZXNvbHZlcigpKTtcbiAgICB2YXIgaXNNYXN0ZXJEb2MgPSBmLndhaXQoKTtcblxuICAgIGlmICghKGlzTWFzdGVyRG9jICYmIGlzTWFzdGVyRG9jLnNldE5hbWUpKSB7XG4gICAgICB0aHJvdyBFcnJvcihcIiRNT05HT19PUExPR19VUkwgbXVzdCBiZSBzZXQgdG8gdGhlICdsb2NhbCcgZGF0YWJhc2Ugb2YgXCIgK1xuICAgICAgICAgICAgICAgICAgXCJhIE1vbmdvIHJlcGxpY2Egc2V0XCIpO1xuICAgIH1cblxuICAgIC8vIEZpbmQgdGhlIGxhc3Qgb3Bsb2cgZW50cnkuXG4gICAgdmFyIGxhc3RPcGxvZ0VudHJ5ID0gc2VsZi5fb3Bsb2dMYXN0RW50cnlDb25uZWN0aW9uLmZpbmRPbmUoXG4gICAgICBPUExPR19DT0xMRUNUSU9OLCB7fSwge3NvcnQ6IHskbmF0dXJhbDogLTF9LCBmaWVsZHM6IHt0czogMX19KTtcblxuICAgIHZhciBvcGxvZ1NlbGVjdG9yID0gXy5jbG9uZShzZWxmLl9iYXNlT3Bsb2dTZWxlY3Rvcik7XG4gICAgaWYgKGxhc3RPcGxvZ0VudHJ5KSB7XG4gICAgICAvLyBTdGFydCBhZnRlciB0aGUgbGFzdCBlbnRyeSB0aGF0IGN1cnJlbnRseSBleGlzdHMuXG4gICAgICBvcGxvZ1NlbGVjdG9yLnRzID0geyRndDogbGFzdE9wbG9nRW50cnkudHN9O1xuICAgICAgLy8gSWYgdGhlcmUgYXJlIGFueSBjYWxscyB0byBjYWxsV2hlblByb2Nlc3NlZExhdGVzdCBiZWZvcmUgYW55IG90aGVyXG4gICAgICAvLyBvcGxvZyBlbnRyaWVzIHNob3cgdXAsIGFsbG93IGNhbGxXaGVuUHJvY2Vzc2VkTGF0ZXN0IHRvIGNhbGwgaXRzXG4gICAgICAvLyBjYWxsYmFjayBpbW1lZGlhdGVseS5cbiAgICAgIHNlbGYuX2xhc3RQcm9jZXNzZWRUUyA9IGxhc3RPcGxvZ0VudHJ5LnRzO1xuICAgIH1cblxuICAgIHZhciBjdXJzb3JEZXNjcmlwdGlvbiA9IG5ldyBDdXJzb3JEZXNjcmlwdGlvbihcbiAgICAgIE9QTE9HX0NPTExFQ1RJT04sIG9wbG9nU2VsZWN0b3IsIHt0YWlsYWJsZTogdHJ1ZX0pO1xuXG4gICAgLy8gU3RhcnQgdGFpbGluZyB0aGUgb3Bsb2cuXG4gICAgLy9cbiAgICAvLyBXZSByZXN0YXJ0IHRoZSBsb3ctbGV2ZWwgb3Bsb2cgcXVlcnkgZXZlcnkgMzAgc2Vjb25kcyBpZiB3ZSBkaWRuJ3QgZ2V0IGFcbiAgICAvLyBkb2MuIFRoaXMgaXMgYSB3b3JrYXJvdW5kIGZvciAjODU5ODogdGhlIE5vZGUgTW9uZ28gZHJpdmVyIGhhcyBhdCBsZWFzdFxuICAgIC8vIG9uZSBidWcgdGhhdCBjYW4gbGVhZCB0byBxdWVyeSBjYWxsYmFja3MgbmV2ZXIgZ2V0dGluZyBjYWxsZWQgKGV2ZW4gd2l0aFxuICAgIC8vIGFuIGVycm9yKSB3aGVuIGxlYWRlcnNoaXAgZmFpbG92ZXIgb2NjdXIuXG4gICAgc2VsZi5fdGFpbEhhbmRsZSA9IHNlbGYuX29wbG9nVGFpbENvbm5lY3Rpb24udGFpbChcbiAgICAgIGN1cnNvckRlc2NyaXB0aW9uLFxuICAgICAgZnVuY3Rpb24gKGRvYykge1xuICAgICAgICBzZWxmLl9lbnRyeVF1ZXVlLnB1c2goZG9jKTtcbiAgICAgICAgc2VsZi5fbWF5YmVTdGFydFdvcmtlcigpO1xuICAgICAgfSxcbiAgICAgIFRBSUxfVElNRU9VVFxuICAgICk7XG4gICAgc2VsZi5fcmVhZHlGdXR1cmUucmV0dXJuKCk7XG4gIH0sXG5cbiAgX21heWJlU3RhcnRXb3JrZXI6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX3dvcmtlckFjdGl2ZSlcbiAgICAgIHJldHVybjtcbiAgICBzZWxmLl93b3JrZXJBY3RpdmUgPSB0cnVlO1xuICAgIE1ldGVvci5kZWZlcihmdW5jdGlvbiAoKSB7XG4gICAgICB0cnkge1xuICAgICAgICB3aGlsZSAoISBzZWxmLl9zdG9wcGVkICYmICEgc2VsZi5fZW50cnlRdWV1ZS5pc0VtcHR5KCkpIHtcbiAgICAgICAgICAvLyBBcmUgd2UgdG9vIGZhciBiZWhpbmQ/IEp1c3QgdGVsbCBvdXIgb2JzZXJ2ZXJzIHRoYXQgdGhleSBuZWVkIHRvXG4gICAgICAgICAgLy8gcmVwb2xsLCBhbmQgZHJvcCBvdXIgcXVldWUuXG4gICAgICAgICAgaWYgKHNlbGYuX2VudHJ5UXVldWUubGVuZ3RoID4gVE9PX0ZBUl9CRUhJTkQpIHtcbiAgICAgICAgICAgIHZhciBsYXN0RW50cnkgPSBzZWxmLl9lbnRyeVF1ZXVlLnBvcCgpO1xuICAgICAgICAgICAgc2VsZi5fZW50cnlRdWV1ZS5jbGVhcigpO1xuXG4gICAgICAgICAgICBzZWxmLl9vblNraXBwZWRFbnRyaWVzSG9vay5lYWNoKGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBGcmVlIGFueSB3YWl0VW50aWxDYXVnaHRVcCgpIGNhbGxzIHRoYXQgd2VyZSB3YWl0aW5nIGZvciB1cyB0b1xuICAgICAgICAgICAgLy8gcGFzcyBzb21ldGhpbmcgdGhhdCB3ZSBqdXN0IHNraXBwZWQuXG4gICAgICAgICAgICBzZWxmLl9zZXRMYXN0UHJvY2Vzc2VkVFMobGFzdEVudHJ5LnRzKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBkb2MgPSBzZWxmLl9lbnRyeVF1ZXVlLnNoaWZ0KCk7XG5cbiAgICAgICAgICBpZiAoIShkb2MubnMgJiYgZG9jLm5zLmxlbmd0aCA+IHNlbGYuX2RiTmFtZS5sZW5ndGggKyAxICYmXG4gICAgICAgICAgICAgICAgZG9jLm5zLnN1YnN0cigwLCBzZWxmLl9kYk5hbWUubGVuZ3RoICsgMSkgPT09XG4gICAgICAgICAgICAgICAgKHNlbGYuX2RiTmFtZSArICcuJykpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmV4cGVjdGVkIG5zXCIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciB0cmlnZ2VyID0ge2NvbGxlY3Rpb246IGRvYy5ucy5zdWJzdHIoc2VsZi5fZGJOYW1lLmxlbmd0aCArIDEpLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGRyb3BDb2xsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICBkcm9wRGF0YWJhc2U6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIG9wOiBkb2N9O1xuXG4gICAgICAgICAgLy8gSXMgaXQgYSBzcGVjaWFsIGNvbW1hbmQgYW5kIHRoZSBjb2xsZWN0aW9uIG5hbWUgaXMgaGlkZGVuIHNvbWV3aGVyZVxuICAgICAgICAgIC8vIGluIG9wZXJhdG9yP1xuICAgICAgICAgIGlmICh0cmlnZ2VyLmNvbGxlY3Rpb24gPT09IFwiJGNtZFwiKSB7XG4gICAgICAgICAgICBpZiAoZG9jLm8uZHJvcERhdGFiYXNlKSB7XG4gICAgICAgICAgICAgIGRlbGV0ZSB0cmlnZ2VyLmNvbGxlY3Rpb247XG4gICAgICAgICAgICAgIHRyaWdnZXIuZHJvcERhdGFiYXNlID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5oYXMoZG9jLm8sICdkcm9wJykpIHtcbiAgICAgICAgICAgICAgdHJpZ2dlci5jb2xsZWN0aW9uID0gZG9jLm8uZHJvcDtcbiAgICAgICAgICAgICAgdHJpZ2dlci5kcm9wQ29sbGVjdGlvbiA9IHRydWU7XG4gICAgICAgICAgICAgIHRyaWdnZXIuaWQgPSBudWxsO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJVbmtub3duIGNvbW1hbmQgXCIgKyBKU09OLnN0cmluZ2lmeShkb2MpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQWxsIG90aGVyIG9wcyBoYXZlIGFuIGlkLlxuICAgICAgICAgICAgdHJpZ2dlci5pZCA9IGlkRm9yT3AoZG9jKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzZWxmLl9jcm9zc2Jhci5maXJlKHRyaWdnZXIpO1xuXG4gICAgICAgICAgLy8gTm93IHRoYXQgd2UndmUgcHJvY2Vzc2VkIHRoaXMgb3BlcmF0aW9uLCBwcm9jZXNzIHBlbmRpbmdcbiAgICAgICAgICAvLyBzZXF1ZW5jZXJzLlxuICAgICAgICAgIGlmICghZG9jLnRzKVxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJvcGxvZyBlbnRyeSB3aXRob3V0IHRzOiBcIiArIEVKU09OLnN0cmluZ2lmeShkb2MpKTtcbiAgICAgICAgICBzZWxmLl9zZXRMYXN0UHJvY2Vzc2VkVFMoZG9jLnRzKTtcbiAgICAgICAgfVxuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgc2VsZi5fd29ya2VyQWN0aXZlID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIF9zZXRMYXN0UHJvY2Vzc2VkVFM6IGZ1bmN0aW9uICh0cykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLl9sYXN0UHJvY2Vzc2VkVFMgPSB0cztcbiAgICB3aGlsZSAoIV8uaXNFbXB0eShzZWxmLl9jYXRjaGluZ1VwRnV0dXJlcykgJiYgc2VsZi5fY2F0Y2hpbmdVcEZ1dHVyZXNbMF0udHMubGVzc1RoYW5PckVxdWFsKHNlbGYuX2xhc3RQcm9jZXNzZWRUUykpIHtcbiAgICAgIHZhciBzZXF1ZW5jZXIgPSBzZWxmLl9jYXRjaGluZ1VwRnV0dXJlcy5zaGlmdCgpO1xuICAgICAgc2VxdWVuY2VyLmZ1dHVyZS5yZXR1cm4oKTtcbiAgICB9XG4gIH0sXG5cbiAgLy9NZXRob2RzIHVzZWQgb24gdGVzdHMgdG8gZGluYW1pY2FsbHkgY2hhbmdlIFRPT19GQVJfQkVISU5EXG4gIF9kZWZpbmVUb29GYXJCZWhpbmQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgVE9PX0ZBUl9CRUhJTkQgPSB2YWx1ZTtcbiAgfSxcbiAgX3Jlc2V0VG9vRmFyQmVoaW5kOiBmdW5jdGlvbigpIHtcbiAgICBUT09fRkFSX0JFSElORCA9IHByb2Nlc3MuZW52Lk1FVEVPUl9PUExPR19UT09fRkFSX0JFSElORCB8fCAyMDAwO1xuICB9XG59KTtcbiIsInZhciBGdXR1cmUgPSBOcG0ucmVxdWlyZSgnZmliZXJzL2Z1dHVyZScpO1xuXG5PYnNlcnZlTXVsdGlwbGV4ZXIgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKCFvcHRpb25zIHx8ICFfLmhhcyhvcHRpb25zLCAnb3JkZXJlZCcpKVxuICAgIHRocm93IEVycm9yKFwibXVzdCBzcGVjaWZpZWQgb3JkZXJlZFwiKTtcblxuICBQYWNrYWdlWydmYWN0cy1iYXNlJ10gJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgXCJtb25nby1saXZlZGF0YVwiLCBcIm9ic2VydmUtbXVsdGlwbGV4ZXJzXCIsIDEpO1xuXG4gIHNlbGYuX29yZGVyZWQgPSBvcHRpb25zLm9yZGVyZWQ7XG4gIHNlbGYuX29uU3RvcCA9IG9wdGlvbnMub25TdG9wIHx8IGZ1bmN0aW9uICgpIHt9O1xuICBzZWxmLl9xdWV1ZSA9IG5ldyBNZXRlb3IuX1N5bmNocm9ub3VzUXVldWUoKTtcbiAgc2VsZi5faGFuZGxlcyA9IHt9O1xuICBzZWxmLl9yZWFkeUZ1dHVyZSA9IG5ldyBGdXR1cmU7XG4gIHNlbGYuX2NhY2hlID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fQ2FjaGluZ0NoYW5nZU9ic2VydmVyKHtcbiAgICBvcmRlcmVkOiBvcHRpb25zLm9yZGVyZWR9KTtcbiAgLy8gTnVtYmVyIG9mIGFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkcyB0YXNrcyBzY2hlZHVsZWQgYnV0IG5vdCB5ZXRcbiAgLy8gcnVubmluZy4gcmVtb3ZlSGFuZGxlIHVzZXMgdGhpcyB0byBrbm93IGlmIGl0J3MgdGltZSB0byBjYWxsIHRoZSBvblN0b3BcbiAgLy8gY2FsbGJhY2suXG4gIHNlbGYuX2FkZEhhbmRsZVRhc2tzU2NoZWR1bGVkQnV0Tm90UGVyZm9ybWVkID0gMDtcblxuICBfLmVhY2goc2VsZi5jYWxsYmFja05hbWVzKCksIGZ1bmN0aW9uIChjYWxsYmFja05hbWUpIHtcbiAgICBzZWxmW2NhbGxiYWNrTmFtZV0gPSBmdW5jdGlvbiAoLyogLi4uICovKSB7XG4gICAgICBzZWxmLl9hcHBseUNhbGxiYWNrKGNhbGxiYWNrTmFtZSwgXy50b0FycmF5KGFyZ3VtZW50cykpO1xuICAgIH07XG4gIH0pO1xufTtcblxuXy5leHRlbmQoT2JzZXJ2ZU11bHRpcGxleGVyLnByb3RvdHlwZSwge1xuICBhZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHM6IGZ1bmN0aW9uIChoYW5kbGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBDaGVjayB0aGlzIGJlZm9yZSBjYWxsaW5nIHJ1blRhc2sgKGV2ZW4gdGhvdWdoIHJ1blRhc2sgZG9lcyB0aGUgc2FtZVxuICAgIC8vIGNoZWNrKSBzbyB0aGF0IHdlIGRvbid0IGxlYWsgYW4gT2JzZXJ2ZU11bHRpcGxleGVyIG9uIGVycm9yIGJ5XG4gICAgLy8gaW5jcmVtZW50aW5nIF9hZGRIYW5kbGVUYXNrc1NjaGVkdWxlZEJ1dE5vdFBlcmZvcm1lZCBhbmQgbmV2ZXJcbiAgICAvLyBkZWNyZW1lbnRpbmcgaXQuXG4gICAgaWYgKCFzZWxmLl9xdWV1ZS5zYWZlVG9SdW5UYXNrKCkpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBjYWxsIG9ic2VydmVDaGFuZ2VzIGZyb20gYW4gb2JzZXJ2ZSBjYWxsYmFjayBvbiB0aGUgc2FtZSBxdWVyeVwiKTtcbiAgICArK3NlbGYuX2FkZEhhbmRsZVRhc2tzU2NoZWR1bGVkQnV0Tm90UGVyZm9ybWVkO1xuXG4gICAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgXCJtb25nby1saXZlZGF0YVwiLCBcIm9ic2VydmUtaGFuZGxlc1wiLCAxKTtcblxuICAgIHNlbGYuX3F1ZXVlLnJ1blRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5faGFuZGxlc1toYW5kbGUuX2lkXSA9IGhhbmRsZTtcbiAgICAgIC8vIFNlbmQgb3V0IHdoYXRldmVyIGFkZHMgd2UgaGF2ZSBzbyBmYXIgKHdoZXRoZXIgb3Igbm90IHdlIHRoZVxuICAgICAgLy8gbXVsdGlwbGV4ZXIgaXMgcmVhZHkpLlxuICAgICAgc2VsZi5fc2VuZEFkZHMoaGFuZGxlKTtcbiAgICAgIC0tc2VsZi5fYWRkSGFuZGxlVGFza3NTY2hlZHVsZWRCdXROb3RQZXJmb3JtZWQ7XG4gICAgfSk7XG4gICAgLy8gKm91dHNpZGUqIHRoZSB0YXNrLCBzaW5jZSBvdGhlcndpc2Ugd2UnZCBkZWFkbG9ja1xuICAgIHNlbGYuX3JlYWR5RnV0dXJlLndhaXQoKTtcbiAgfSxcblxuICAvLyBSZW1vdmUgYW4gb2JzZXJ2ZSBoYW5kbGUuIElmIGl0IHdhcyB0aGUgbGFzdCBvYnNlcnZlIGhhbmRsZSwgY2FsbCB0aGVcbiAgLy8gb25TdG9wIGNhbGxiYWNrOyB5b3UgY2Fubm90IGFkZCBhbnkgbW9yZSBvYnNlcnZlIGhhbmRsZXMgYWZ0ZXIgdGhpcy5cbiAgLy9cbiAgLy8gVGhpcyBpcyBub3Qgc3luY2hyb25pemVkIHdpdGggcG9sbHMgYW5kIGhhbmRsZSBhZGRpdGlvbnM6IHRoaXMgbWVhbnMgdGhhdFxuICAvLyB5b3UgY2FuIHNhZmVseSBjYWxsIGl0IGZyb20gd2l0aGluIGFuIG9ic2VydmUgY2FsbGJhY2ssIGJ1dCBpdCBhbHNvIG1lYW5zXG4gIC8vIHRoYXQgd2UgaGF2ZSB0byBiZSBjYXJlZnVsIHdoZW4gd2UgaXRlcmF0ZSBvdmVyIF9oYW5kbGVzLlxuICByZW1vdmVIYW5kbGU6IGZ1bmN0aW9uIChpZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIFRoaXMgc2hvdWxkIG5vdCBiZSBwb3NzaWJsZTogeW91IGNhbiBvbmx5IGNhbGwgcmVtb3ZlSGFuZGxlIGJ5IGhhdmluZ1xuICAgIC8vIGFjY2VzcyB0byB0aGUgT2JzZXJ2ZUhhbmRsZSwgd2hpY2ggaXNuJ3QgcmV0dXJuZWQgdG8gdXNlciBjb2RlIHVudGlsIHRoZVxuICAgIC8vIG11bHRpcGxleCBpcyByZWFkeS5cbiAgICBpZiAoIXNlbGYuX3JlYWR5KCkpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCByZW1vdmUgaGFuZGxlcyB1bnRpbCB0aGUgbXVsdGlwbGV4IGlzIHJlYWR5XCIpO1xuXG4gICAgZGVsZXRlIHNlbGYuX2hhbmRsZXNbaWRdO1xuXG4gICAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgXCJtb25nby1saXZlZGF0YVwiLCBcIm9ic2VydmUtaGFuZGxlc1wiLCAtMSk7XG5cbiAgICBpZiAoXy5pc0VtcHR5KHNlbGYuX2hhbmRsZXMpICYmXG4gICAgICAgIHNlbGYuX2FkZEhhbmRsZVRhc2tzU2NoZWR1bGVkQnV0Tm90UGVyZm9ybWVkID09PSAwKSB7XG4gICAgICBzZWxmLl9zdG9wKCk7XG4gICAgfVxuICB9LFxuICBfc3RvcDogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAvLyBJdCBzaG91bGRuJ3QgYmUgcG9zc2libGUgZm9yIHVzIHRvIHN0b3Agd2hlbiBhbGwgb3VyIGhhbmRsZXMgc3RpbGxcbiAgICAvLyBoYXZlbid0IGJlZW4gcmV0dXJuZWQgZnJvbSBvYnNlcnZlQ2hhbmdlcyFcbiAgICBpZiAoISBzZWxmLl9yZWFkeSgpICYmICEgb3B0aW9ucy5mcm9tUXVlcnlFcnJvcilcbiAgICAgIHRocm93IEVycm9yKFwic3VycHJpc2luZyBfc3RvcDogbm90IHJlYWR5XCIpO1xuXG4gICAgLy8gQ2FsbCBzdG9wIGNhbGxiYWNrICh3aGljaCBraWxscyB0aGUgdW5kZXJseWluZyBwcm9jZXNzIHdoaWNoIHNlbmRzIHVzXG4gICAgLy8gY2FsbGJhY2tzIGFuZCByZW1vdmVzIHVzIGZyb20gdGhlIGNvbm5lY3Rpb24ncyBkaWN0aW9uYXJ5KS5cbiAgICBzZWxmLl9vblN0b3AoKTtcbiAgICBQYWNrYWdlWydmYWN0cy1iYXNlJ10gJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICBcIm1vbmdvLWxpdmVkYXRhXCIsIFwib2JzZXJ2ZS1tdWx0aXBsZXhlcnNcIiwgLTEpO1xuXG4gICAgLy8gQ2F1c2UgZnV0dXJlIGFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkcyBjYWxscyB0byB0aHJvdyAoYnV0IHRoZSBvblN0b3BcbiAgICAvLyBjYWxsYmFjayBzaG91bGQgbWFrZSBvdXIgY29ubmVjdGlvbiBmb3JnZXQgYWJvdXQgdXMpLlxuICAgIHNlbGYuX2hhbmRsZXMgPSBudWxsO1xuICB9LFxuXG4gIC8vIEFsbG93cyBhbGwgYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzIGNhbGxzIHRvIHJldHVybiwgb25jZSBhbGwgcHJlY2VkaW5nXG4gIC8vIGFkZHMgaGF2ZSBiZWVuIHByb2Nlc3NlZC4gRG9lcyBub3QgYmxvY2suXG4gIHJlYWR5OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYuX3F1ZXVlLnF1ZXVlVGFzayhmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoc2VsZi5fcmVhZHkoKSlcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJjYW4ndCBtYWtlIE9ic2VydmVNdWx0aXBsZXggcmVhZHkgdHdpY2UhXCIpO1xuICAgICAgc2VsZi5fcmVhZHlGdXR1cmUucmV0dXJuKCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gSWYgdHJ5aW5nIHRvIGV4ZWN1dGUgdGhlIHF1ZXJ5IHJlc3VsdHMgaW4gYW4gZXJyb3IsIGNhbGwgdGhpcy4gVGhpcyBpc1xuICAvLyBpbnRlbmRlZCBmb3IgcGVybWFuZW50IGVycm9ycywgbm90IHRyYW5zaWVudCBuZXR3b3JrIGVycm9ycyB0aGF0IGNvdWxkIGJlXG4gIC8vIGZpeGVkLiBJdCBzaG91bGQgb25seSBiZSBjYWxsZWQgYmVmb3JlIHJlYWR5KCksIGJlY2F1c2UgaWYgeW91IGNhbGxlZCByZWFkeVxuICAvLyB0aGF0IG1lYW50IHRoYXQgeW91IG1hbmFnZWQgdG8gcnVuIHRoZSBxdWVyeSBvbmNlLiBJdCB3aWxsIHN0b3AgdGhpc1xuICAvLyBPYnNlcnZlTXVsdGlwbGV4IGFuZCBjYXVzZSBhZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHMgY2FsbHMgKGFuZCB0aHVzXG4gIC8vIG9ic2VydmVDaGFuZ2VzIGNhbGxzKSB0byB0aHJvdyB0aGUgZXJyb3IuXG4gIHF1ZXJ5RXJyb3I6IGZ1bmN0aW9uIChlcnIpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5fcXVldWUucnVuVGFzayhmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoc2VsZi5fcmVhZHkoKSlcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJjYW4ndCBjbGFpbSBxdWVyeSBoYXMgYW4gZXJyb3IgYWZ0ZXIgaXQgd29ya2VkIVwiKTtcbiAgICAgIHNlbGYuX3N0b3Aoe2Zyb21RdWVyeUVycm9yOiB0cnVlfSk7XG4gICAgICBzZWxmLl9yZWFkeUZ1dHVyZS50aHJvdyhlcnIpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIENhbGxzIFwiY2JcIiBvbmNlIHRoZSBlZmZlY3RzIG9mIGFsbCBcInJlYWR5XCIsIFwiYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzXCJcbiAgLy8gYW5kIG9ic2VydmUgY2FsbGJhY2tzIHdoaWNoIGNhbWUgYmVmb3JlIHRoaXMgY2FsbCBoYXZlIGJlZW4gcHJvcGFnYXRlZCB0b1xuICAvLyBhbGwgaGFuZGxlcy4gXCJyZWFkeVwiIG11c3QgaGF2ZSBhbHJlYWR5IGJlZW4gY2FsbGVkIG9uIHRoaXMgbXVsdGlwbGV4ZXIuXG4gIG9uRmx1c2g6IGZ1bmN0aW9uIChjYikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLl9xdWV1ZS5xdWV1ZVRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCFzZWxmLl9yZWFkeSgpKVxuICAgICAgICB0aHJvdyBFcnJvcihcIm9ubHkgY2FsbCBvbkZsdXNoIG9uIGEgbXVsdGlwbGV4ZXIgdGhhdCB3aWxsIGJlIHJlYWR5XCIpO1xuICAgICAgY2IoKTtcbiAgICB9KTtcbiAgfSxcbiAgY2FsbGJhY2tOYW1lczogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fb3JkZXJlZClcbiAgICAgIHJldHVybiBbXCJhZGRlZEJlZm9yZVwiLCBcImNoYW5nZWRcIiwgXCJtb3ZlZEJlZm9yZVwiLCBcInJlbW92ZWRcIl07XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIFtcImFkZGVkXCIsIFwiY2hhbmdlZFwiLCBcInJlbW92ZWRcIl07XG4gIH0sXG4gIF9yZWFkeTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLl9yZWFkeUZ1dHVyZS5pc1Jlc29sdmVkKCk7XG4gIH0sXG4gIF9hcHBseUNhbGxiYWNrOiBmdW5jdGlvbiAoY2FsbGJhY2tOYW1lLCBhcmdzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYuX3F1ZXVlLnF1ZXVlVGFzayhmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBJZiB3ZSBzdG9wcGVkIGluIHRoZSBtZWFudGltZSwgZG8gbm90aGluZy5cbiAgICAgIGlmICghc2VsZi5faGFuZGxlcylcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICAvLyBGaXJzdCwgYXBwbHkgdGhlIGNoYW5nZSB0byB0aGUgY2FjaGUuXG4gICAgICAvLyBYWFggV2UgY291bGQgbWFrZSBhcHBseUNoYW5nZSBjYWxsYmFja3MgcHJvbWlzZSBub3QgdG8gaGFuZyBvbiB0byBhbnlcbiAgICAgIC8vIHN0YXRlIGZyb20gdGhlaXIgYXJndW1lbnRzIChhc3N1bWluZyB0aGF0IHRoZWlyIHN1cHBsaWVkIGNhbGxiYWNrc1xuICAgICAgLy8gZG9uJ3QpIGFuZCBza2lwIHRoaXMgY2xvbmUuIEN1cnJlbnRseSAnY2hhbmdlZCcgaGFuZ3Mgb24gdG8gc3RhdGVcbiAgICAgIC8vIHRob3VnaC5cbiAgICAgIHNlbGYuX2NhY2hlLmFwcGx5Q2hhbmdlW2NhbGxiYWNrTmFtZV0uYXBwbHkobnVsbCwgRUpTT04uY2xvbmUoYXJncykpO1xuXG4gICAgICAvLyBJZiB3ZSBoYXZlbid0IGZpbmlzaGVkIHRoZSBpbml0aWFsIGFkZHMsIHRoZW4gd2Ugc2hvdWxkIG9ubHkgYmUgZ2V0dGluZ1xuICAgICAgLy8gYWRkcy5cbiAgICAgIGlmICghc2VsZi5fcmVhZHkoKSAmJlxuICAgICAgICAgIChjYWxsYmFja05hbWUgIT09ICdhZGRlZCcgJiYgY2FsbGJhY2tOYW1lICE9PSAnYWRkZWRCZWZvcmUnKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHb3QgXCIgKyBjYWxsYmFja05hbWUgKyBcIiBkdXJpbmcgaW5pdGlhbCBhZGRzXCIpO1xuICAgICAgfVxuXG4gICAgICAvLyBOb3cgbXVsdGlwbGV4IHRoZSBjYWxsYmFja3Mgb3V0IHRvIGFsbCBvYnNlcnZlIGhhbmRsZXMuIEl0J3MgT0sgaWZcbiAgICAgIC8vIHRoZXNlIGNhbGxzIHlpZWxkOyBzaW5jZSB3ZSdyZSBpbnNpZGUgYSB0YXNrLCBubyBvdGhlciB1c2Ugb2Ygb3VyIHF1ZXVlXG4gICAgICAvLyBjYW4gY29udGludWUgdW50aWwgdGhlc2UgYXJlIGRvbmUuIChCdXQgd2UgZG8gaGF2ZSB0byBiZSBjYXJlZnVsIHRvIG5vdFxuICAgICAgLy8gdXNlIGEgaGFuZGxlIHRoYXQgZ290IHJlbW92ZWQsIGJlY2F1c2UgcmVtb3ZlSGFuZGxlIGRvZXMgbm90IHVzZSB0aGVcbiAgICAgIC8vIHF1ZXVlOyB0aHVzLCB3ZSBpdGVyYXRlIG92ZXIgYW4gYXJyYXkgb2Yga2V5cyB0aGF0IHdlIGNvbnRyb2wuKVxuICAgICAgXy5lYWNoKF8ua2V5cyhzZWxmLl9oYW5kbGVzKSwgZnVuY3Rpb24gKGhhbmRsZUlkKSB7XG4gICAgICAgIHZhciBoYW5kbGUgPSBzZWxmLl9oYW5kbGVzICYmIHNlbGYuX2hhbmRsZXNbaGFuZGxlSWRdO1xuICAgICAgICBpZiAoIWhhbmRsZSlcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIHZhciBjYWxsYmFjayA9IGhhbmRsZVsnXycgKyBjYWxsYmFja05hbWVdO1xuICAgICAgICAvLyBjbG9uZSBhcmd1bWVudHMgc28gdGhhdCBjYWxsYmFja3MgY2FuIG11dGF0ZSB0aGVpciBhcmd1bWVudHNcbiAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2suYXBwbHkobnVsbCwgRUpTT04uY2xvbmUoYXJncykpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gU2VuZHMgaW5pdGlhbCBhZGRzIHRvIGEgaGFuZGxlLiBJdCBzaG91bGQgb25seSBiZSBjYWxsZWQgZnJvbSB3aXRoaW4gYSB0YXNrXG4gIC8vICh0aGUgdGFzayB0aGF0IGlzIHByb2Nlc3NpbmcgdGhlIGFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkcyBjYWxsKS4gSXRcbiAgLy8gc3luY2hyb25vdXNseSBpbnZva2VzIHRoZSBoYW5kbGUncyBhZGRlZCBvciBhZGRlZEJlZm9yZTsgdGhlcmUncyBubyBuZWVkIHRvXG4gIC8vIGZsdXNoIHRoZSBxdWV1ZSBhZnRlcndhcmRzIHRvIGVuc3VyZSB0aGF0IHRoZSBjYWxsYmFja3MgZ2V0IG91dC5cbiAgX3NlbmRBZGRzOiBmdW5jdGlvbiAoaGFuZGxlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9xdWV1ZS5zYWZlVG9SdW5UYXNrKCkpXG4gICAgICB0aHJvdyBFcnJvcihcIl9zZW5kQWRkcyBtYXkgb25seSBiZSBjYWxsZWQgZnJvbSB3aXRoaW4gYSB0YXNrIVwiKTtcbiAgICB2YXIgYWRkID0gc2VsZi5fb3JkZXJlZCA/IGhhbmRsZS5fYWRkZWRCZWZvcmUgOiBoYW5kbGUuX2FkZGVkO1xuICAgIGlmICghYWRkKVxuICAgICAgcmV0dXJuO1xuICAgIC8vIG5vdGU6IGRvY3MgbWF5IGJlIGFuIF9JZE1hcCBvciBhbiBPcmRlcmVkRGljdFxuICAgIHNlbGYuX2NhY2hlLmRvY3MuZm9yRWFjaChmdW5jdGlvbiAoZG9jLCBpZCkge1xuICAgICAgaWYgKCFfLmhhcyhzZWxmLl9oYW5kbGVzLCBoYW5kbGUuX2lkKSlcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJoYW5kbGUgZ290IHJlbW92ZWQgYmVmb3JlIHNlbmRpbmcgaW5pdGlhbCBhZGRzIVwiKTtcbiAgICAgIHZhciBmaWVsZHMgPSBFSlNPTi5jbG9uZShkb2MpO1xuICAgICAgZGVsZXRlIGZpZWxkcy5faWQ7XG4gICAgICBpZiAoc2VsZi5fb3JkZXJlZClcbiAgICAgICAgYWRkKGlkLCBmaWVsZHMsIG51bGwpOyAvLyB3ZSdyZSBnb2luZyBpbiBvcmRlciwgc28gYWRkIGF0IGVuZFxuICAgICAgZWxzZVxuICAgICAgICBhZGQoaWQsIGZpZWxkcyk7XG4gICAgfSk7XG4gIH1cbn0pO1xuXG5cbnZhciBuZXh0T2JzZXJ2ZUhhbmRsZUlkID0gMTtcbk9ic2VydmVIYW5kbGUgPSBmdW5jdGlvbiAobXVsdGlwbGV4ZXIsIGNhbGxiYWNrcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIC8vIFRoZSBlbmQgdXNlciBpcyBvbmx5IHN1cHBvc2VkIHRvIGNhbGwgc3RvcCgpLiAgVGhlIG90aGVyIGZpZWxkcyBhcmVcbiAgLy8gYWNjZXNzaWJsZSB0byB0aGUgbXVsdGlwbGV4ZXIsIHRob3VnaC5cbiAgc2VsZi5fbXVsdGlwbGV4ZXIgPSBtdWx0aXBsZXhlcjtcbiAgXy5lYWNoKG11bHRpcGxleGVyLmNhbGxiYWNrTmFtZXMoKSwgZnVuY3Rpb24gKG5hbWUpIHtcbiAgICBpZiAoY2FsbGJhY2tzW25hbWVdKSB7XG4gICAgICBzZWxmWydfJyArIG5hbWVdID0gY2FsbGJhY2tzW25hbWVdO1xuICAgIH0gZWxzZSBpZiAobmFtZSA9PT0gXCJhZGRlZEJlZm9yZVwiICYmIGNhbGxiYWNrcy5hZGRlZCkge1xuICAgICAgLy8gU3BlY2lhbCBjYXNlOiBpZiB5b3Ugc3BlY2lmeSBcImFkZGVkXCIgYW5kIFwibW92ZWRCZWZvcmVcIiwgeW91IGdldCBhblxuICAgICAgLy8gb3JkZXJlZCBvYnNlcnZlIHdoZXJlIGZvciBzb21lIHJlYXNvbiB5b3UgZG9uJ3QgZ2V0IG9yZGVyaW5nIGRhdGEgb25cbiAgICAgIC8vIHRoZSBhZGRzLiAgSSBkdW5ubywgd2Ugd3JvdGUgdGVzdHMgZm9yIGl0LCB0aGVyZSBtdXN0IGhhdmUgYmVlbiBhXG4gICAgICAvLyByZWFzb24uXG4gICAgICBzZWxmLl9hZGRlZEJlZm9yZSA9IGZ1bmN0aW9uIChpZCwgZmllbGRzLCBiZWZvcmUpIHtcbiAgICAgICAgY2FsbGJhY2tzLmFkZGVkKGlkLCBmaWVsZHMpO1xuICAgICAgfTtcbiAgICB9XG4gIH0pO1xuICBzZWxmLl9zdG9wcGVkID0gZmFsc2U7XG4gIHNlbGYuX2lkID0gbmV4dE9ic2VydmVIYW5kbGVJZCsrO1xufTtcbk9ic2VydmVIYW5kbGUucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgcmV0dXJuO1xuICBzZWxmLl9zdG9wcGVkID0gdHJ1ZTtcbiAgc2VsZi5fbXVsdGlwbGV4ZXIucmVtb3ZlSGFuZGxlKHNlbGYuX2lkKTtcbn07XG4iLCJ2YXIgRmliZXIgPSBOcG0ucmVxdWlyZSgnZmliZXJzJyk7XG52YXIgRnV0dXJlID0gTnBtLnJlcXVpcmUoJ2ZpYmVycy9mdXR1cmUnKTtcblxuRG9jRmV0Y2hlciA9IGZ1bmN0aW9uIChtb25nb0Nvbm5lY3Rpb24pIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLl9tb25nb0Nvbm5lY3Rpb24gPSBtb25nb0Nvbm5lY3Rpb247XG4gIC8vIE1hcCBmcm9tIGNhY2hlIGtleSAtPiBbY2FsbGJhY2tdXG4gIHNlbGYuX2NhbGxiYWNrc0ZvckNhY2hlS2V5ID0ge307XG59O1xuXG5fLmV4dGVuZChEb2NGZXRjaGVyLnByb3RvdHlwZSwge1xuICAvLyBGZXRjaGVzIGRvY3VtZW50IFwiaWRcIiBmcm9tIGNvbGxlY3Rpb25OYW1lLCByZXR1cm5pbmcgaXQgb3IgbnVsbCBpZiBub3RcbiAgLy8gZm91bmQuXG4gIC8vXG4gIC8vIElmIHlvdSBtYWtlIG11bHRpcGxlIGNhbGxzIHRvIGZldGNoKCkgd2l0aCB0aGUgc2FtZSBjYWNoZUtleSAoYSBzdHJpbmcpLFxuICAvLyBEb2NGZXRjaGVyIG1heSBhc3N1bWUgdGhhdCB0aGV5IGFsbCByZXR1cm4gdGhlIHNhbWUgZG9jdW1lbnQuIChJdCBkb2VzXG4gIC8vIG5vdCBjaGVjayB0byBzZWUgaWYgY29sbGVjdGlvbk5hbWUvaWQgbWF0Y2guKVxuICAvL1xuICAvLyBZb3UgbWF5IGFzc3VtZSB0aGF0IGNhbGxiYWNrIGlzIG5ldmVyIGNhbGxlZCBzeW5jaHJvbm91c2x5IChhbmQgaW4gZmFjdFxuICAvLyBPcGxvZ09ic2VydmVEcml2ZXIgZG9lcyBzbykuXG4gIGZldGNoOiBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIGlkLCBjYWNoZUtleSwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBjaGVjayhjb2xsZWN0aW9uTmFtZSwgU3RyaW5nKTtcbiAgICAvLyBpZCBpcyBzb21lIHNvcnQgb2Ygc2NhbGFyXG4gICAgY2hlY2soY2FjaGVLZXksIFN0cmluZyk7XG5cbiAgICAvLyBJZiB0aGVyZSdzIGFscmVhZHkgYW4gaW4tcHJvZ3Jlc3MgZmV0Y2ggZm9yIHRoaXMgY2FjaGUga2V5LCB5aWVsZCB1bnRpbFxuICAgIC8vIGl0J3MgZG9uZSBhbmQgcmV0dXJuIHdoYXRldmVyIGl0IHJldHVybnMuXG4gICAgaWYgKF8uaGFzKHNlbGYuX2NhbGxiYWNrc0ZvckNhY2hlS2V5LCBjYWNoZUtleSkpIHtcbiAgICAgIHNlbGYuX2NhbGxiYWNrc0ZvckNhY2hlS2V5W2NhY2hlS2V5XS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgY2FsbGJhY2tzID0gc2VsZi5fY2FsbGJhY2tzRm9yQ2FjaGVLZXlbY2FjaGVLZXldID0gW2NhbGxiYWNrXTtcblxuICAgIEZpYmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciBkb2MgPSBzZWxmLl9tb25nb0Nvbm5lY3Rpb24uZmluZE9uZShcbiAgICAgICAgICBjb2xsZWN0aW9uTmFtZSwge19pZDogaWR9KSB8fCBudWxsO1xuICAgICAgICAvLyBSZXR1cm4gZG9jIHRvIGFsbCByZWxldmFudCBjYWxsYmFja3MuIE5vdGUgdGhhdCB0aGlzIGFycmF5IGNhblxuICAgICAgICAvLyBjb250aW51ZSB0byBncm93IGR1cmluZyBjYWxsYmFjayBleGNlY3V0aW9uLlxuICAgICAgICB3aGlsZSAoIV8uaXNFbXB0eShjYWxsYmFja3MpKSB7XG4gICAgICAgICAgLy8gQ2xvbmUgdGhlIGRvY3VtZW50IHNvIHRoYXQgdGhlIHZhcmlvdXMgY2FsbHMgdG8gZmV0Y2ggZG9uJ3QgcmV0dXJuXG4gICAgICAgICAgLy8gb2JqZWN0cyB0aGF0IGFyZSBpbnRlcnR3aW5nbGVkIHdpdGggZWFjaCBvdGhlci4gQ2xvbmUgYmVmb3JlXG4gICAgICAgICAgLy8gcG9wcGluZyB0aGUgZnV0dXJlLCBzbyB0aGF0IGlmIGNsb25lIHRocm93cywgdGhlIGVycm9yIGdldHMgcGFzc2VkXG4gICAgICAgICAgLy8gdG8gdGhlIG5leHQgY2FsbGJhY2suXG4gICAgICAgICAgdmFyIGNsb25lZERvYyA9IEVKU09OLmNsb25lKGRvYyk7XG4gICAgICAgICAgY2FsbGJhY2tzLnBvcCgpKG51bGwsIGNsb25lZERvYyk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgd2hpbGUgKCFfLmlzRW1wdHkoY2FsbGJhY2tzKSkge1xuICAgICAgICAgIGNhbGxiYWNrcy5wb3AoKShlKTtcbiAgICAgICAgfVxuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgLy8gWFhYIGNvbnNpZGVyIGtlZXBpbmcgdGhlIGRvYyBhcm91bmQgZm9yIGEgcGVyaW9kIG9mIHRpbWUgYmVmb3JlXG4gICAgICAgIC8vIHJlbW92aW5nIGZyb20gdGhlIGNhY2hlXG4gICAgICAgIGRlbGV0ZSBzZWxmLl9jYWxsYmFja3NGb3JDYWNoZUtleVtjYWNoZUtleV07XG4gICAgICB9XG4gICAgfSkucnVuKCk7XG4gIH1cbn0pO1xuXG5Nb25nb1Rlc3QuRG9jRmV0Y2hlciA9IERvY0ZldGNoZXI7XG4iLCJ2YXIgUE9MTElOR19USFJPVFRMRV9NUyA9ICtwcm9jZXNzLmVudi5NRVRFT1JfUE9MTElOR19USFJPVFRMRV9NUyB8fCA1MDtcbnZhciBQT0xMSU5HX0lOVEVSVkFMX01TID0gK3Byb2Nlc3MuZW52Lk1FVEVPUl9QT0xMSU5HX0lOVEVSVkFMX01TIHx8IDEwICogMTAwMDtcblxuUG9sbGluZ09ic2VydmVEcml2ZXIgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24gPSBvcHRpb25zLmN1cnNvckRlc2NyaXB0aW9uO1xuICBzZWxmLl9tb25nb0hhbmRsZSA9IG9wdGlvbnMubW9uZ29IYW5kbGU7XG4gIHNlbGYuX29yZGVyZWQgPSBvcHRpb25zLm9yZGVyZWQ7XG4gIHNlbGYuX211bHRpcGxleGVyID0gb3B0aW9ucy5tdWx0aXBsZXhlcjtcbiAgc2VsZi5fc3RvcENhbGxiYWNrcyA9IFtdO1xuICBzZWxmLl9zdG9wcGVkID0gZmFsc2U7XG5cbiAgc2VsZi5fc3luY2hyb25vdXNDdXJzb3IgPSBzZWxmLl9tb25nb0hhbmRsZS5fY3JlYXRlU3luY2hyb25vdXNDdXJzb3IoXG4gICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24pO1xuXG4gIC8vIHByZXZpb3VzIHJlc3VsdHMgc25hcHNob3QuICBvbiBlYWNoIHBvbGwgY3ljbGUsIGRpZmZzIGFnYWluc3RcbiAgLy8gcmVzdWx0cyBkcml2ZXMgdGhlIGNhbGxiYWNrcy5cbiAgc2VsZi5fcmVzdWx0cyA9IG51bGw7XG5cbiAgLy8gVGhlIG51bWJlciBvZiBfcG9sbE1vbmdvIGNhbGxzIHRoYXQgaGF2ZSBiZWVuIGFkZGVkIHRvIHNlbGYuX3Rhc2tRdWV1ZSBidXRcbiAgLy8gaGF2ZSBub3Qgc3RhcnRlZCBydW5uaW5nLiBVc2VkIHRvIG1ha2Ugc3VyZSB3ZSBuZXZlciBzY2hlZHVsZSBtb3JlIHRoYW4gb25lXG4gIC8vIF9wb2xsTW9uZ28gKG90aGVyIHRoYW4gcG9zc2libHkgdGhlIG9uZSB0aGF0IGlzIGN1cnJlbnRseSBydW5uaW5nKS4gSXQnc1xuICAvLyBhbHNvIHVzZWQgYnkgX3N1c3BlbmRQb2xsaW5nIHRvIHByZXRlbmQgdGhlcmUncyBhIHBvbGwgc2NoZWR1bGVkLiBVc3VhbGx5LFxuICAvLyBpdCdzIGVpdGhlciAwIChmb3IgXCJubyBwb2xscyBzY2hlZHVsZWQgb3RoZXIgdGhhbiBtYXliZSBvbmUgY3VycmVudGx5XG4gIC8vIHJ1bm5pbmdcIikgb3IgMSAoZm9yIFwiYSBwb2xsIHNjaGVkdWxlZCB0aGF0IGlzbid0IHJ1bm5pbmcgeWV0XCIpLCBidXQgaXQgY2FuXG4gIC8vIGFsc28gYmUgMiBpZiBpbmNyZW1lbnRlZCBieSBfc3VzcGVuZFBvbGxpbmcuXG4gIHNlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCA9IDA7XG4gIHNlbGYuX3BlbmRpbmdXcml0ZXMgPSBbXTsgLy8gcGVvcGxlIHRvIG5vdGlmeSB3aGVuIHBvbGxpbmcgY29tcGxldGVzXG5cbiAgLy8gTWFrZSBzdXJlIHRvIGNyZWF0ZSBhIHNlcGFyYXRlbHkgdGhyb3R0bGVkIGZ1bmN0aW9uIGZvciBlYWNoXG4gIC8vIFBvbGxpbmdPYnNlcnZlRHJpdmVyIG9iamVjdC5cbiAgc2VsZi5fZW5zdXJlUG9sbElzU2NoZWR1bGVkID0gXy50aHJvdHRsZShcbiAgICBzZWxmLl91bnRocm90dGxlZEVuc3VyZVBvbGxJc1NjaGVkdWxlZCxcbiAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnBvbGxpbmdUaHJvdHRsZU1zIHx8IFBPTExJTkdfVEhST1RUTEVfTVMgLyogbXMgKi8pO1xuXG4gIC8vIFhYWCBmaWd1cmUgb3V0IGlmIHdlIHN0aWxsIG5lZWQgYSBxdWV1ZVxuICBzZWxmLl90YXNrUXVldWUgPSBuZXcgTWV0ZW9yLl9TeW5jaHJvbm91c1F1ZXVlKCk7XG5cbiAgdmFyIGxpc3RlbmVyc0hhbmRsZSA9IGxpc3RlbkFsbChcbiAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiwgZnVuY3Rpb24gKG5vdGlmaWNhdGlvbikge1xuICAgICAgLy8gV2hlbiBzb21lb25lIGRvZXMgYSB0cmFuc2FjdGlvbiB0aGF0IG1pZ2h0IGFmZmVjdCB1cywgc2NoZWR1bGUgYSBwb2xsXG4gICAgICAvLyBvZiB0aGUgZGF0YWJhc2UuIElmIHRoYXQgdHJhbnNhY3Rpb24gaGFwcGVucyBpbnNpZGUgb2YgYSB3cml0ZSBmZW5jZSxcbiAgICAgIC8vIGJsb2NrIHRoZSBmZW5jZSB1bnRpbCB3ZSd2ZSBwb2xsZWQgYW5kIG5vdGlmaWVkIG9ic2VydmVycy5cbiAgICAgIHZhciBmZW5jZSA9IEREUFNlcnZlci5fQ3VycmVudFdyaXRlRmVuY2UuZ2V0KCk7XG4gICAgICBpZiAoZmVuY2UpXG4gICAgICAgIHNlbGYuX3BlbmRpbmdXcml0ZXMucHVzaChmZW5jZS5iZWdpbldyaXRlKCkpO1xuICAgICAgLy8gRW5zdXJlIGEgcG9sbCBpcyBzY2hlZHVsZWQuLi4gYnV0IGlmIHdlIGFscmVhZHkga25vdyB0aGF0IG9uZSBpcyxcbiAgICAgIC8vIGRvbid0IGhpdCB0aGUgdGhyb3R0bGVkIF9lbnN1cmVQb2xsSXNTY2hlZHVsZWQgZnVuY3Rpb24gKHdoaWNoIG1pZ2h0XG4gICAgICAvLyBsZWFkIHRvIHVzIGNhbGxpbmcgaXQgdW5uZWNlc3NhcmlseSBpbiA8cG9sbGluZ1Rocm90dGxlTXM+IG1zKS5cbiAgICAgIGlmIChzZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgPT09IDApXG4gICAgICAgIHNlbGYuX2Vuc3VyZVBvbGxJc1NjaGVkdWxlZCgpO1xuICAgIH1cbiAgKTtcbiAgc2VsZi5fc3RvcENhbGxiYWNrcy5wdXNoKGZ1bmN0aW9uICgpIHsgbGlzdGVuZXJzSGFuZGxlLnN0b3AoKTsgfSk7XG5cbiAgLy8gZXZlcnkgb25jZSBhbmQgYSB3aGlsZSwgcG9sbCBldmVuIGlmIHdlIGRvbid0IHRoaW5rIHdlJ3JlIGRpcnR5LCBmb3JcbiAgLy8gZXZlbnR1YWwgY29uc2lzdGVuY3kgd2l0aCBkYXRhYmFzZSB3cml0ZXMgZnJvbSBvdXRzaWRlIHRoZSBNZXRlb3JcbiAgLy8gdW5pdmVyc2UuXG4gIC8vXG4gIC8vIEZvciB0ZXN0aW5nLCB0aGVyZSdzIGFuIHVuZG9jdW1lbnRlZCBjYWxsYmFjayBhcmd1bWVudCB0byBvYnNlcnZlQ2hhbmdlc1xuICAvLyB3aGljaCBkaXNhYmxlcyB0aW1lLWJhc2VkIHBvbGxpbmcgYW5kIGdldHMgY2FsbGVkIGF0IHRoZSBiZWdpbm5pbmcgb2YgZWFjaFxuICAvLyBwb2xsLlxuICBpZiAob3B0aW9ucy5fdGVzdE9ubHlQb2xsQ2FsbGJhY2spIHtcbiAgICBzZWxmLl90ZXN0T25seVBvbGxDYWxsYmFjayA9IG9wdGlvbnMuX3Rlc3RPbmx5UG9sbENhbGxiYWNrO1xuICB9IGVsc2Uge1xuICAgIHZhciBwb2xsaW5nSW50ZXJ2YWwgPVxuICAgICAgICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMucG9sbGluZ0ludGVydmFsTXMgfHxcbiAgICAgICAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLl9wb2xsaW5nSW50ZXJ2YWwgfHwgLy8gQ09NUEFUIHdpdGggMS4yXG4gICAgICAgICAgUE9MTElOR19JTlRFUlZBTF9NUztcbiAgICB2YXIgaW50ZXJ2YWxIYW5kbGUgPSBNZXRlb3Iuc2V0SW50ZXJ2YWwoXG4gICAgICBfLmJpbmQoc2VsZi5fZW5zdXJlUG9sbElzU2NoZWR1bGVkLCBzZWxmKSwgcG9sbGluZ0ludGVydmFsKTtcbiAgICBzZWxmLl9zdG9wQ2FsbGJhY2tzLnB1c2goZnVuY3Rpb24gKCkge1xuICAgICAgTWV0ZW9yLmNsZWFySW50ZXJ2YWwoaW50ZXJ2YWxIYW5kbGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gTWFrZSBzdXJlIHdlIGFjdHVhbGx5IHBvbGwgc29vbiFcbiAgc2VsZi5fdW50aHJvdHRsZWRFbnN1cmVQb2xsSXNTY2hlZHVsZWQoKTtcblxuICBQYWNrYWdlWydmYWN0cy1iYXNlJ10gJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgXCJtb25nby1saXZlZGF0YVwiLCBcIm9ic2VydmUtZHJpdmVycy1wb2xsaW5nXCIsIDEpO1xufTtcblxuXy5leHRlbmQoUG9sbGluZ09ic2VydmVEcml2ZXIucHJvdG90eXBlLCB7XG4gIC8vIFRoaXMgaXMgYWx3YXlzIGNhbGxlZCB0aHJvdWdoIF8udGhyb3R0bGUgKGV4Y2VwdCBvbmNlIGF0IHN0YXJ0dXApLlxuICBfdW50aHJvdHRsZWRFbnN1cmVQb2xsSXNTY2hlZHVsZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCA+IDApXG4gICAgICByZXR1cm47XG4gICAgKytzZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQ7XG4gICAgc2VsZi5fdGFza1F1ZXVlLnF1ZXVlVGFzayhmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9wb2xsTW9uZ28oKTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyB0ZXN0LW9ubHkgaW50ZXJmYWNlIGZvciBjb250cm9sbGluZyBwb2xsaW5nLlxuICAvL1xuICAvLyBfc3VzcGVuZFBvbGxpbmcgYmxvY2tzIHVudGlsIGFueSBjdXJyZW50bHkgcnVubmluZyBhbmQgc2NoZWR1bGVkIHBvbGxzIGFyZVxuICAvLyBkb25lLCBhbmQgcHJldmVudHMgYW55IGZ1cnRoZXIgcG9sbHMgZnJvbSBiZWluZyBzY2hlZHVsZWQuIChuZXdcbiAgLy8gT2JzZXJ2ZUhhbmRsZXMgY2FuIGJlIGFkZGVkIGFuZCByZWNlaXZlIHRoZWlyIGluaXRpYWwgYWRkZWQgY2FsbGJhY2tzLFxuICAvLyB0aG91Z2guKVxuICAvL1xuICAvLyBfcmVzdW1lUG9sbGluZyBpbW1lZGlhdGVseSBwb2xscywgYW5kIGFsbG93cyBmdXJ0aGVyIHBvbGxzIHRvIG9jY3VyLlxuICBfc3VzcGVuZFBvbGxpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBQcmV0ZW5kIHRoYXQgdGhlcmUncyBhbm90aGVyIHBvbGwgc2NoZWR1bGVkICh3aGljaCB3aWxsIHByZXZlbnRcbiAgICAvLyBfZW5zdXJlUG9sbElzU2NoZWR1bGVkIGZyb20gcXVldWVpbmcgYW55IG1vcmUgcG9sbHMpLlxuICAgICsrc2VsZi5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkO1xuICAgIC8vIE5vdyBibG9jayB1bnRpbCBhbGwgY3VycmVudGx5IHJ1bm5pbmcgb3Igc2NoZWR1bGVkIHBvbGxzIGFyZSBkb25lLlxuICAgIHNlbGYuX3Rhc2tRdWV1ZS5ydW5UYXNrKGZ1bmN0aW9uKCkge30pO1xuXG4gICAgLy8gQ29uZmlybSB0aGF0IHRoZXJlIGlzIG9ubHkgb25lIFwicG9sbFwiICh0aGUgZmFrZSBvbmUgd2UncmUgcHJldGVuZGluZyB0b1xuICAgIC8vIGhhdmUpIHNjaGVkdWxlZC5cbiAgICBpZiAoc2VsZi5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkICE9PSAxKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCBpcyBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkKTtcbiAgfSxcbiAgX3Jlc3VtZVBvbGxpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBXZSBzaG91bGQgYmUgaW4gdGhlIHNhbWUgc3RhdGUgYXMgaW4gdGhlIGVuZCBvZiBfc3VzcGVuZFBvbGxpbmcuXG4gICAgaWYgKHNlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCAhPT0gMSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgaXMgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCk7XG4gICAgLy8gUnVuIGEgcG9sbCBzeW5jaHJvbm91c2x5ICh3aGljaCB3aWxsIGNvdW50ZXJhY3QgdGhlXG4gICAgLy8gKytfcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkIGZyb20gX3N1c3BlbmRQb2xsaW5nKS5cbiAgICBzZWxmLl90YXNrUXVldWUucnVuVGFzayhmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9wb2xsTW9uZ28oKTtcbiAgICB9KTtcbiAgfSxcblxuICBfcG9sbE1vbmdvOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC0tc2VsZi5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkO1xuXG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICByZXR1cm47XG5cbiAgICB2YXIgZmlyc3QgPSBmYWxzZTtcbiAgICB2YXIgbmV3UmVzdWx0cztcbiAgICB2YXIgb2xkUmVzdWx0cyA9IHNlbGYuX3Jlc3VsdHM7XG4gICAgaWYgKCFvbGRSZXN1bHRzKSB7XG4gICAgICBmaXJzdCA9IHRydWU7XG4gICAgICAvLyBYWFggbWF5YmUgdXNlIE9yZGVyZWREaWN0IGluc3RlYWQ/XG4gICAgICBvbGRSZXN1bHRzID0gc2VsZi5fb3JkZXJlZCA/IFtdIDogbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gICAgfVxuXG4gICAgc2VsZi5fdGVzdE9ubHlQb2xsQ2FsbGJhY2sgJiYgc2VsZi5fdGVzdE9ubHlQb2xsQ2FsbGJhY2soKTtcblxuICAgIC8vIFNhdmUgdGhlIGxpc3Qgb2YgcGVuZGluZyB3cml0ZXMgd2hpY2ggdGhpcyByb3VuZCB3aWxsIGNvbW1pdC5cbiAgICB2YXIgd3JpdGVzRm9yQ3ljbGUgPSBzZWxmLl9wZW5kaW5nV3JpdGVzO1xuICAgIHNlbGYuX3BlbmRpbmdXcml0ZXMgPSBbXTtcblxuICAgIC8vIEdldCB0aGUgbmV3IHF1ZXJ5IHJlc3VsdHMuIChUaGlzIHlpZWxkcy4pXG4gICAgdHJ5IHtcbiAgICAgIG5ld1Jlc3VsdHMgPSBzZWxmLl9zeW5jaHJvbm91c0N1cnNvci5nZXRSYXdPYmplY3RzKHNlbGYuX29yZGVyZWQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChmaXJzdCAmJiB0eXBlb2YoZS5jb2RlKSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhbiBlcnJvciBkb2N1bWVudCBzZW50IHRvIHVzIGJ5IG1vbmdvZCwgbm90IGEgY29ubmVjdGlvblxuICAgICAgICAvLyBlcnJvciBnZW5lcmF0ZWQgYnkgdGhlIGNsaWVudC4gQW5kIHdlJ3ZlIG5ldmVyIHNlZW4gdGhpcyBxdWVyeSB3b3JrXG4gICAgICAgIC8vIHN1Y2Nlc3NmdWxseS4gUHJvYmFibHkgaXQncyBhIGJhZCBzZWxlY3RvciBvciBzb21ldGhpbmcsIHNvIHdlIHNob3VsZFxuICAgICAgICAvLyBOT1QgcmV0cnkuIEluc3RlYWQsIHdlIHNob3VsZCBoYWx0IHRoZSBvYnNlcnZlICh3aGljaCBlbmRzIHVwIGNhbGxpbmdcbiAgICAgICAgLy8gYHN0b3BgIG9uIHVzKS5cbiAgICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIucXVlcnlFcnJvcihcbiAgICAgICAgICBuZXcgRXJyb3IoXG4gICAgICAgICAgICBcIkV4Y2VwdGlvbiB3aGlsZSBwb2xsaW5nIHF1ZXJ5IFwiICtcbiAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24pICsgXCI6IFwiICsgZS5tZXNzYWdlKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gZ2V0UmF3T2JqZWN0cyBjYW4gdGhyb3cgaWYgd2UncmUgaGF2aW5nIHRyb3VibGUgdGFsa2luZyB0byB0aGVcbiAgICAgIC8vIGRhdGFiYXNlLiAgVGhhdCdzIGZpbmUgLS0tIHdlIHdpbGwgcmVwb2xsIGxhdGVyIGFueXdheS4gQnV0IHdlIHNob3VsZFxuICAgICAgLy8gbWFrZSBzdXJlIG5vdCB0byBsb3NlIHRyYWNrIG9mIHRoaXMgY3ljbGUncyB3cml0ZXMuXG4gICAgICAvLyAoSXQgYWxzbyBjYW4gdGhyb3cgaWYgdGhlcmUncyBqdXN0IHNvbWV0aGluZyBpbnZhbGlkIGFib3V0IHRoaXMgcXVlcnk7XG4gICAgICAvLyB1bmZvcnR1bmF0ZWx5IHRoZSBPYnNlcnZlRHJpdmVyIEFQSSBkb2Vzbid0IHByb3ZpZGUgYSBnb29kIHdheSB0b1xuICAgICAgLy8gXCJjYW5jZWxcIiB0aGUgb2JzZXJ2ZSBmcm9tIHRoZSBpbnNpZGUgaW4gdGhpcyBjYXNlLlxuICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoc2VsZi5fcGVuZGluZ1dyaXRlcywgd3JpdGVzRm9yQ3ljbGUpO1xuICAgICAgTWV0ZW9yLl9kZWJ1ZyhcIkV4Y2VwdGlvbiB3aGlsZSBwb2xsaW5nIHF1ZXJ5IFwiICtcbiAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24pLCBlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBSdW4gZGlmZnMuXG4gICAgaWYgKCFzZWxmLl9zdG9wcGVkKSB7XG4gICAgICBMb2NhbENvbGxlY3Rpb24uX2RpZmZRdWVyeUNoYW5nZXMoXG4gICAgICAgIHNlbGYuX29yZGVyZWQsIG9sZFJlc3VsdHMsIG5ld1Jlc3VsdHMsIHNlbGYuX211bHRpcGxleGVyKTtcbiAgICB9XG5cbiAgICAvLyBTaWduYWxzIHRoZSBtdWx0aXBsZXhlciB0byBhbGxvdyBhbGwgb2JzZXJ2ZUNoYW5nZXMgY2FsbHMgdGhhdCBzaGFyZSB0aGlzXG4gICAgLy8gbXVsdGlwbGV4ZXIgdG8gcmV0dXJuLiAoVGhpcyBoYXBwZW5zIGFzeW5jaHJvbm91c2x5LCB2aWEgdGhlXG4gICAgLy8gbXVsdGlwbGV4ZXIncyBxdWV1ZS4pXG4gICAgaWYgKGZpcnN0KVxuICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIucmVhZHkoKTtcblxuICAgIC8vIFJlcGxhY2Ugc2VsZi5fcmVzdWx0cyBhdG9taWNhbGx5LiAgKFRoaXMgYXNzaWdubWVudCBpcyB3aGF0IG1ha2VzIGBmaXJzdGBcbiAgICAvLyBzdGF5IHRocm91Z2ggb24gdGhlIG5leHQgY3ljbGUsIHNvIHdlJ3ZlIHdhaXRlZCB1bnRpbCBhZnRlciB3ZSd2ZVxuICAgIC8vIGNvbW1pdHRlZCB0byByZWFkeS1pbmcgdGhlIG11bHRpcGxleGVyLilcbiAgICBzZWxmLl9yZXN1bHRzID0gbmV3UmVzdWx0cztcblxuICAgIC8vIE9uY2UgdGhlIE9ic2VydmVNdWx0aXBsZXhlciBoYXMgcHJvY2Vzc2VkIGV2ZXJ5dGhpbmcgd2UndmUgZG9uZSBpbiB0aGlzXG4gICAgLy8gcm91bmQsIG1hcmsgYWxsIHRoZSB3cml0ZXMgd2hpY2ggZXhpc3RlZCBiZWZvcmUgdGhpcyBjYWxsIGFzXG4gICAgLy8gY29tbW1pdHRlZC4gKElmIG5ldyB3cml0ZXMgaGF2ZSBzaG93biB1cCBpbiB0aGUgbWVhbnRpbWUsIHRoZXJlJ2xsXG4gICAgLy8gYWxyZWFkeSBiZSBhbm90aGVyIF9wb2xsTW9uZ28gdGFzayBzY2hlZHVsZWQuKVxuICAgIHNlbGYuX211bHRpcGxleGVyLm9uRmx1c2goZnVuY3Rpb24gKCkge1xuICAgICAgXy5lYWNoKHdyaXRlc0ZvckN5Y2xlLCBmdW5jdGlvbiAodykge1xuICAgICAgICB3LmNvbW1pdHRlZCgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLl9zdG9wcGVkID0gdHJ1ZTtcbiAgICBfLmVhY2goc2VsZi5fc3RvcENhbGxiYWNrcywgZnVuY3Rpb24gKGMpIHsgYygpOyB9KTtcbiAgICAvLyBSZWxlYXNlIGFueSB3cml0ZSBmZW5jZXMgdGhhdCBhcmUgd2FpdGluZyBvbiB1cy5cbiAgICBfLmVhY2goc2VsZi5fcGVuZGluZ1dyaXRlcywgZnVuY3Rpb24gKHcpIHtcbiAgICAgIHcuY29tbWl0dGVkKCk7XG4gICAgfSk7XG4gICAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgXCJtb25nby1saXZlZGF0YVwiLCBcIm9ic2VydmUtZHJpdmVycy1wb2xsaW5nXCIsIC0xKTtcbiAgfVxufSk7XG4iLCJ2YXIgRnV0dXJlID0gTnBtLnJlcXVpcmUoJ2ZpYmVycy9mdXR1cmUnKTtcblxudmFyIFBIQVNFID0ge1xuICBRVUVSWUlORzogXCJRVUVSWUlOR1wiLFxuICBGRVRDSElORzogXCJGRVRDSElOR1wiLFxuICBTVEVBRFk6IFwiU1RFQURZXCJcbn07XG5cbi8vIEV4Y2VwdGlvbiB0aHJvd24gYnkgX25lZWRUb1BvbGxRdWVyeSB3aGljaCB1bnJvbGxzIHRoZSBzdGFjayB1cCB0byB0aGVcbi8vIGVuY2xvc2luZyBjYWxsIHRvIGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5LlxudmFyIFN3aXRjaGVkVG9RdWVyeSA9IGZ1bmN0aW9uICgpIHt9O1xudmFyIGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5ID0gZnVuY3Rpb24gKGYpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgZi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmICghKGUgaW5zdGFuY2VvZiBTd2l0Y2hlZFRvUXVlcnkpKVxuICAgICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfTtcbn07XG5cbnZhciBjdXJyZW50SWQgPSAwO1xuXG4vLyBPcGxvZ09ic2VydmVEcml2ZXIgaXMgYW4gYWx0ZXJuYXRpdmUgdG8gUG9sbGluZ09ic2VydmVEcml2ZXIgd2hpY2ggZm9sbG93c1xuLy8gdGhlIE1vbmdvIG9wZXJhdGlvbiBsb2cgaW5zdGVhZCBvZiBqdXN0IHJlLXBvbGxpbmcgdGhlIHF1ZXJ5LiBJdCBvYmV5cyB0aGVcbi8vIHNhbWUgc2ltcGxlIGludGVyZmFjZTogY29uc3RydWN0aW5nIGl0IHN0YXJ0cyBzZW5kaW5nIG9ic2VydmVDaGFuZ2VzXG4vLyBjYWxsYmFja3MgKGFuZCBhIHJlYWR5KCkgaW52b2NhdGlvbikgdG8gdGhlIE9ic2VydmVNdWx0aXBsZXhlciwgYW5kIHlvdSBzdG9wXG4vLyBpdCBieSBjYWxsaW5nIHRoZSBzdG9wKCkgbWV0aG9kLlxuT3Bsb2dPYnNlcnZlRHJpdmVyID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLl91c2VzT3Bsb2cgPSB0cnVlOyAgLy8gdGVzdHMgbG9vayBhdCB0aGlzXG5cbiAgc2VsZi5faWQgPSBjdXJyZW50SWQ7XG4gIGN1cnJlbnRJZCsrO1xuXG4gIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uID0gb3B0aW9ucy5jdXJzb3JEZXNjcmlwdGlvbjtcbiAgc2VsZi5fbW9uZ29IYW5kbGUgPSBvcHRpb25zLm1vbmdvSGFuZGxlO1xuICBzZWxmLl9tdWx0aXBsZXhlciA9IG9wdGlvbnMubXVsdGlwbGV4ZXI7XG5cbiAgaWYgKG9wdGlvbnMub3JkZXJlZCkge1xuICAgIHRocm93IEVycm9yKFwiT3Bsb2dPYnNlcnZlRHJpdmVyIG9ubHkgc3VwcG9ydHMgdW5vcmRlcmVkIG9ic2VydmVDaGFuZ2VzXCIpO1xuICB9XG5cbiAgdmFyIHNvcnRlciA9IG9wdGlvbnMuc29ydGVyO1xuICAvLyBXZSBkb24ndCBzdXBwb3J0ICRuZWFyIGFuZCBvdGhlciBnZW8tcXVlcmllcyBzbyBpdCdzIE9LIHRvIGluaXRpYWxpemUgdGhlXG4gIC8vIGNvbXBhcmF0b3Igb25seSBvbmNlIGluIHRoZSBjb25zdHJ1Y3Rvci5cbiAgdmFyIGNvbXBhcmF0b3IgPSBzb3J0ZXIgJiYgc29ydGVyLmdldENvbXBhcmF0b3IoKTtcblxuICBpZiAob3B0aW9ucy5jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLmxpbWl0KSB7XG4gICAgLy8gVGhlcmUgYXJlIHNldmVyYWwgcHJvcGVydGllcyBvcmRlcmVkIGRyaXZlciBpbXBsZW1lbnRzOlxuICAgIC8vIC0gX2xpbWl0IGlzIGEgcG9zaXRpdmUgbnVtYmVyXG4gICAgLy8gLSBfY29tcGFyYXRvciBpcyBhIGZ1bmN0aW9uLWNvbXBhcmF0b3IgYnkgd2hpY2ggdGhlIHF1ZXJ5IGlzIG9yZGVyZWRcbiAgICAvLyAtIF91bnB1Ymxpc2hlZEJ1ZmZlciBpcyBub24tbnVsbCBNaW4vTWF4IEhlYXAsXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgdGhlIGVtcHR5IGJ1ZmZlciBpbiBTVEVBRFkgcGhhc2UgaW1wbGllcyB0aGF0IHRoZVxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgIGV2ZXJ5dGhpbmcgdGhhdCBtYXRjaGVzIHRoZSBxdWVyaWVzIHNlbGVjdG9yIGZpdHNcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICBpbnRvIHB1Ymxpc2hlZCBzZXQuXG4gICAgLy8gLSBfcHVibGlzaGVkIC0gTWluIEhlYXAgKGFsc28gaW1wbGVtZW50cyBJZE1hcCBtZXRob2RzKVxuXG4gICAgdmFyIGhlYXBPcHRpb25zID0geyBJZE1hcDogTG9jYWxDb2xsZWN0aW9uLl9JZE1hcCB9O1xuICAgIHNlbGYuX2xpbWl0ID0gc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5saW1pdDtcbiAgICBzZWxmLl9jb21wYXJhdG9yID0gY29tcGFyYXRvcjtcbiAgICBzZWxmLl9zb3J0ZXIgPSBzb3J0ZXI7XG4gICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIgPSBuZXcgTWluTWF4SGVhcChjb21wYXJhdG9yLCBoZWFwT3B0aW9ucyk7XG4gICAgLy8gV2UgbmVlZCBzb21ldGhpbmcgdGhhdCBjYW4gZmluZCBNYXggdmFsdWUgaW4gYWRkaXRpb24gdG8gSWRNYXAgaW50ZXJmYWNlXG4gICAgc2VsZi5fcHVibGlzaGVkID0gbmV3IE1heEhlYXAoY29tcGFyYXRvciwgaGVhcE9wdGlvbnMpO1xuICB9IGVsc2Uge1xuICAgIHNlbGYuX2xpbWl0ID0gMDtcbiAgICBzZWxmLl9jb21wYXJhdG9yID0gbnVsbDtcbiAgICBzZWxmLl9zb3J0ZXIgPSBudWxsO1xuICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyID0gbnVsbDtcbiAgICBzZWxmLl9wdWJsaXNoZWQgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgfVxuXG4gIC8vIEluZGljYXRlcyBpZiBpdCBpcyBzYWZlIHRvIGluc2VydCBhIG5ldyBkb2N1bWVudCBhdCB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgLy8gZm9yIHRoaXMgcXVlcnkuIGkuZS4gaXQgaXMga25vd24gdGhhdCB0aGVyZSBhcmUgbm8gZG9jdW1lbnRzIG1hdGNoaW5nIHRoZVxuICAvLyBzZWxlY3RvciB0aG9zZSBhcmUgbm90IGluIHB1Ymxpc2hlZCBvciBidWZmZXIuXG4gIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciA9IGZhbHNlO1xuXG4gIHNlbGYuX3N0b3BwZWQgPSBmYWxzZTtcbiAgc2VsZi5fc3RvcEhhbmRsZXMgPSBbXTtcblxuICBQYWNrYWdlWydmYWN0cy1iYXNlJ10gJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgXCJtb25nby1saXZlZGF0YVwiLCBcIm9ic2VydmUtZHJpdmVycy1vcGxvZ1wiLCAxKTtcblxuICBzZWxmLl9yZWdpc3RlclBoYXNlQ2hhbmdlKFBIQVNFLlFVRVJZSU5HKTtcblxuICBzZWxmLl9tYXRjaGVyID0gb3B0aW9ucy5tYXRjaGVyO1xuICB2YXIgcHJvamVjdGlvbiA9IHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMuZmllbGRzIHx8IHt9O1xuICBzZWxmLl9wcm9qZWN0aW9uRm4gPSBMb2NhbENvbGxlY3Rpb24uX2NvbXBpbGVQcm9qZWN0aW9uKHByb2plY3Rpb24pO1xuICAvLyBQcm9qZWN0aW9uIGZ1bmN0aW9uLCByZXN1bHQgb2YgY29tYmluaW5nIGltcG9ydGFudCBmaWVsZHMgZm9yIHNlbGVjdG9yIGFuZFxuICAvLyBleGlzdGluZyBmaWVsZHMgcHJvamVjdGlvblxuICBzZWxmLl9zaGFyZWRQcm9qZWN0aW9uID0gc2VsZi5fbWF0Y2hlci5jb21iaW5lSW50b1Byb2plY3Rpb24ocHJvamVjdGlvbik7XG4gIGlmIChzb3J0ZXIpXG4gICAgc2VsZi5fc2hhcmVkUHJvamVjdGlvbiA9IHNvcnRlci5jb21iaW5lSW50b1Byb2plY3Rpb24oc2VsZi5fc2hhcmVkUHJvamVjdGlvbik7XG4gIHNlbGYuX3NoYXJlZFByb2plY3Rpb25GbiA9IExvY2FsQ29sbGVjdGlvbi5fY29tcGlsZVByb2plY3Rpb24oXG4gICAgc2VsZi5fc2hhcmVkUHJvamVjdGlvbik7XG5cbiAgc2VsZi5fbmVlZFRvRmV0Y2ggPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcgPSBudWxsO1xuICBzZWxmLl9mZXRjaEdlbmVyYXRpb24gPSAwO1xuXG4gIHNlbGYuX3JlcXVlcnlXaGVuRG9uZVRoaXNRdWVyeSA9IGZhbHNlO1xuICBzZWxmLl93cml0ZXNUb0NvbW1pdFdoZW5XZVJlYWNoU3RlYWR5ID0gW107XG5cbiAgLy8gSWYgdGhlIG9wbG9nIGhhbmRsZSB0ZWxscyB1cyB0aGF0IGl0IHNraXBwZWQgc29tZSBlbnRyaWVzIChiZWNhdXNlIGl0IGdvdFxuICAvLyBiZWhpbmQsIHNheSksIHJlLXBvbGwuXG4gIHNlbGYuX3N0b3BIYW5kbGVzLnB1c2goc2VsZi5fbW9uZ29IYW5kbGUuX29wbG9nSGFuZGxlLm9uU2tpcHBlZEVudHJpZXMoXG4gICAgZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fbmVlZFRvUG9sbFF1ZXJ5KCk7XG4gICAgfSlcbiAgKSk7XG5cbiAgZm9yRWFjaFRyaWdnZXIoc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24sIGZ1bmN0aW9uICh0cmlnZ2VyKSB7XG4gICAgc2VsZi5fc3RvcEhhbmRsZXMucHVzaChzZWxmLl9tb25nb0hhbmRsZS5fb3Bsb2dIYW5kbGUub25PcGxvZ0VudHJ5KFxuICAgICAgdHJpZ2dlciwgZnVuY3Rpb24gKG5vdGlmaWNhdGlvbikge1xuICAgICAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIG9wID0gbm90aWZpY2F0aW9uLm9wO1xuICAgICAgICAgIGlmIChub3RpZmljYXRpb24uZHJvcENvbGxlY3Rpb24gfHwgbm90aWZpY2F0aW9uLmRyb3BEYXRhYmFzZSkge1xuICAgICAgICAgICAgLy8gTm90ZTogdGhpcyBjYWxsIGlzIG5vdCBhbGxvd2VkIHRvIGJsb2NrIG9uIGFueXRoaW5nIChlc3BlY2lhbGx5XG4gICAgICAgICAgICAvLyBvbiB3YWl0aW5nIGZvciBvcGxvZyBlbnRyaWVzIHRvIGNhdGNoIHVwKSBiZWNhdXNlIHRoYXQgd2lsbCBibG9ja1xuICAgICAgICAgICAgLy8gb25PcGxvZ0VudHJ5IVxuICAgICAgICAgICAgc2VsZi5fbmVlZFRvUG9sbFF1ZXJ5KCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEFsbCBvdGhlciBvcGVyYXRvcnMgc2hvdWxkIGJlIGhhbmRsZWQgZGVwZW5kaW5nIG9uIHBoYXNlXG4gICAgICAgICAgICBpZiAoc2VsZi5fcGhhc2UgPT09IFBIQVNFLlFVRVJZSU5HKSB7XG4gICAgICAgICAgICAgIHNlbGYuX2hhbmRsZU9wbG9nRW50cnlRdWVyeWluZyhvcCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzZWxmLl9oYW5kbGVPcGxvZ0VudHJ5U3RlYWR5T3JGZXRjaGluZyhvcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgKSk7XG4gIH0pO1xuXG4gIC8vIFhYWCBvcmRlcmluZyB3LnIudC4gZXZlcnl0aGluZyBlbHNlP1xuICBzZWxmLl9zdG9wSGFuZGxlcy5wdXNoKGxpc3RlbkFsbChcbiAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiwgZnVuY3Rpb24gKG5vdGlmaWNhdGlvbikge1xuICAgICAgLy8gSWYgd2UncmUgbm90IGluIGEgcHJlLWZpcmUgd3JpdGUgZmVuY2UsIHdlIGRvbid0IGhhdmUgdG8gZG8gYW55dGhpbmcuXG4gICAgICB2YXIgZmVuY2UgPSBERFBTZXJ2ZXIuX0N1cnJlbnRXcml0ZUZlbmNlLmdldCgpO1xuICAgICAgaWYgKCFmZW5jZSB8fCBmZW5jZS5maXJlZClcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICBpZiAoZmVuY2UuX29wbG9nT2JzZXJ2ZURyaXZlcnMpIHtcbiAgICAgICAgZmVuY2UuX29wbG9nT2JzZXJ2ZURyaXZlcnNbc2VsZi5faWRdID0gc2VsZjtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBmZW5jZS5fb3Bsb2dPYnNlcnZlRHJpdmVycyA9IHt9O1xuICAgICAgZmVuY2UuX29wbG9nT2JzZXJ2ZURyaXZlcnNbc2VsZi5faWRdID0gc2VsZjtcblxuICAgICAgZmVuY2Uub25CZWZvcmVGaXJlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRyaXZlcnMgPSBmZW5jZS5fb3Bsb2dPYnNlcnZlRHJpdmVycztcbiAgICAgICAgZGVsZXRlIGZlbmNlLl9vcGxvZ09ic2VydmVEcml2ZXJzO1xuXG4gICAgICAgIC8vIFRoaXMgZmVuY2UgY2Fubm90IGZpcmUgdW50aWwgd2UndmUgY2F1Z2h0IHVwIHRvIFwidGhpcyBwb2ludFwiIGluIHRoZVxuICAgICAgICAvLyBvcGxvZywgYW5kIGFsbCBvYnNlcnZlcnMgbWFkZSBpdCBiYWNrIHRvIHRoZSBzdGVhZHkgc3RhdGUuXG4gICAgICAgIHNlbGYuX21vbmdvSGFuZGxlLl9vcGxvZ0hhbmRsZS53YWl0VW50aWxDYXVnaHRVcCgpO1xuXG4gICAgICAgIF8uZWFjaChkcml2ZXJzLCBmdW5jdGlvbiAoZHJpdmVyKSB7XG4gICAgICAgICAgaWYgKGRyaXZlci5fc3RvcHBlZClcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgIHZhciB3cml0ZSA9IGZlbmNlLmJlZ2luV3JpdGUoKTtcbiAgICAgICAgICBpZiAoZHJpdmVyLl9waGFzZSA9PT0gUEhBU0UuU1RFQURZKSB7XG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgdGhhdCBhbGwgb2YgdGhlIGNhbGxiYWNrcyBoYXZlIG1hZGUgaXQgdGhyb3VnaCB0aGVcbiAgICAgICAgICAgIC8vIG11bHRpcGxleGVyIGFuZCBiZWVuIGRlbGl2ZXJlZCB0byBPYnNlcnZlSGFuZGxlcyBiZWZvcmUgY29tbWl0dGluZ1xuICAgICAgICAgICAgLy8gd3JpdGVzLlxuICAgICAgICAgICAgZHJpdmVyLl9tdWx0aXBsZXhlci5vbkZsdXNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZHJpdmVyLl93cml0ZXNUb0NvbW1pdFdoZW5XZVJlYWNoU3RlYWR5LnB1c2god3JpdGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICkpO1xuXG4gIC8vIFdoZW4gTW9uZ28gZmFpbHMgb3Zlciwgd2UgbmVlZCB0byByZXBvbGwgdGhlIHF1ZXJ5LCBpbiBjYXNlIHdlIHByb2Nlc3NlZCBhblxuICAvLyBvcGxvZyBlbnRyeSB0aGF0IGdvdCByb2xsZWQgYmFjay5cbiAgc2VsZi5fc3RvcEhhbmRsZXMucHVzaChzZWxmLl9tb25nb0hhbmRsZS5fb25GYWlsb3ZlcihmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeShcbiAgICBmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9uZWVkVG9Qb2xsUXVlcnkoKTtcbiAgICB9KSkpO1xuXG4gIC8vIEdpdmUgX29ic2VydmVDaGFuZ2VzIGEgY2hhbmNlIHRvIGFkZCB0aGUgbmV3IE9ic2VydmVIYW5kbGUgdG8gb3VyXG4gIC8vIG11bHRpcGxleGVyLCBzbyB0aGF0IHRoZSBhZGRlZCBjYWxscyBnZXQgc3RyZWFtZWQuXG4gIE1ldGVvci5kZWZlcihmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeShmdW5jdGlvbiAoKSB7XG4gICAgc2VsZi5fcnVuSW5pdGlhbFF1ZXJ5KCk7XG4gIH0pKTtcbn07XG5cbl8uZXh0ZW5kKE9wbG9nT2JzZXJ2ZURyaXZlci5wcm90b3R5cGUsIHtcbiAgX2FkZFB1Ymxpc2hlZDogZnVuY3Rpb24gKGlkLCBkb2MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGZpZWxkcyA9IF8uY2xvbmUoZG9jKTtcbiAgICAgIGRlbGV0ZSBmaWVsZHMuX2lkO1xuICAgICAgc2VsZi5fcHVibGlzaGVkLnNldChpZCwgc2VsZi5fc2hhcmVkUHJvamVjdGlvbkZuKGRvYykpO1xuICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIuYWRkZWQoaWQsIHNlbGYuX3Byb2plY3Rpb25GbihmaWVsZHMpKTtcblxuICAgICAgLy8gQWZ0ZXIgYWRkaW5nIHRoaXMgZG9jdW1lbnQsIHRoZSBwdWJsaXNoZWQgc2V0IG1pZ2h0IGJlIG92ZXJmbG93ZWRcbiAgICAgIC8vIChleGNlZWRpbmcgY2FwYWNpdHkgc3BlY2lmaWVkIGJ5IGxpbWl0KS4gSWYgc28sIHB1c2ggdGhlIG1heGltdW1cbiAgICAgIC8vIGVsZW1lbnQgdG8gdGhlIGJ1ZmZlciwgd2UgbWlnaHQgd2FudCB0byBzYXZlIGl0IGluIG1lbW9yeSB0byByZWR1Y2UgdGhlXG4gICAgICAvLyBhbW91bnQgb2YgTW9uZ28gbG9va3VwcyBpbiB0aGUgZnV0dXJlLlxuICAgICAgaWYgKHNlbGYuX2xpbWl0ICYmIHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgPiBzZWxmLl9saW1pdCkge1xuICAgICAgICAvLyBYWFggaW4gdGhlb3J5IHRoZSBzaXplIG9mIHB1Ymxpc2hlZCBpcyBubyBtb3JlIHRoYW4gbGltaXQrMVxuICAgICAgICBpZiAoc2VsZi5fcHVibGlzaGVkLnNpemUoKSAhPT0gc2VsZi5fbGltaXQgKyAxKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQWZ0ZXIgYWRkaW5nIHRvIHB1Ymxpc2hlZCwgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAoc2VsZi5fcHVibGlzaGVkLnNpemUoKSAtIHNlbGYuX2xpbWl0KSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwiIGRvY3VtZW50cyBhcmUgb3ZlcmZsb3dpbmcgdGhlIHNldFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBvdmVyZmxvd2luZ0RvY0lkID0gc2VsZi5fcHVibGlzaGVkLm1heEVsZW1lbnRJZCgpO1xuICAgICAgICB2YXIgb3ZlcmZsb3dpbmdEb2MgPSBzZWxmLl9wdWJsaXNoZWQuZ2V0KG92ZXJmbG93aW5nRG9jSWQpO1xuXG4gICAgICAgIGlmIChFSlNPTi5lcXVhbHMob3ZlcmZsb3dpbmdEb2NJZCwgaWQpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIGRvY3VtZW50IGp1c3QgYWRkZWQgaXMgb3ZlcmZsb3dpbmcgdGhlIHB1Ymxpc2hlZCBzZXRcIik7XG4gICAgICAgIH1cblxuICAgICAgICBzZWxmLl9wdWJsaXNoZWQucmVtb3ZlKG92ZXJmbG93aW5nRG9jSWQpO1xuICAgICAgICBzZWxmLl9tdWx0aXBsZXhlci5yZW1vdmVkKG92ZXJmbG93aW5nRG9jSWQpO1xuICAgICAgICBzZWxmLl9hZGRCdWZmZXJlZChvdmVyZmxvd2luZ0RvY0lkLCBvdmVyZmxvd2luZ0RvYyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIF9yZW1vdmVQdWJsaXNoZWQ6IGZ1bmN0aW9uIChpZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9wdWJsaXNoZWQucmVtb3ZlKGlkKTtcbiAgICAgIHNlbGYuX211bHRpcGxleGVyLnJlbW92ZWQoaWQpO1xuICAgICAgaWYgKCEgc2VsZi5fbGltaXQgfHwgc2VsZi5fcHVibGlzaGVkLnNpemUoKSA9PT0gc2VsZi5fbGltaXQpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgPiBzZWxmLl9saW1pdClcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJzZWxmLl9wdWJsaXNoZWQgZ290IHRvbyBiaWdcIik7XG5cbiAgICAgIC8vIE9LLCB3ZSBhcmUgcHVibGlzaGluZyBsZXNzIHRoYW4gdGhlIGxpbWl0LiBNYXliZSB3ZSBzaG91bGQgbG9vayBpbiB0aGVcbiAgICAgIC8vIGJ1ZmZlciB0byBmaW5kIHRoZSBuZXh0IGVsZW1lbnQgcGFzdCB3aGF0IHdlIHdlcmUgcHVibGlzaGluZyBiZWZvcmUuXG5cbiAgICAgIGlmICghc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZW1wdHkoKSkge1xuICAgICAgICAvLyBUaGVyZSdzIHNvbWV0aGluZyBpbiB0aGUgYnVmZmVyOyBtb3ZlIHRoZSBmaXJzdCB0aGluZyBpbiBpdCB0b1xuICAgICAgICAvLyBfcHVibGlzaGVkLlxuICAgICAgICB2YXIgbmV3RG9jSWQgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5taW5FbGVtZW50SWQoKTtcbiAgICAgICAgdmFyIG5ld0RvYyA9IHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmdldChuZXdEb2NJZCk7XG4gICAgICAgIHNlbGYuX3JlbW92ZUJ1ZmZlcmVkKG5ld0RvY0lkKTtcbiAgICAgICAgc2VsZi5fYWRkUHVibGlzaGVkKG5ld0RvY0lkLCBuZXdEb2MpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIFRoZXJlJ3Mgbm90aGluZyBpbiB0aGUgYnVmZmVyLiAgVGhpcyBjb3VsZCBtZWFuIG9uZSBvZiBhIGZldyB0aGluZ3MuXG5cbiAgICAgIC8vIChhKSBXZSBjb3VsZCBiZSBpbiB0aGUgbWlkZGxlIG9mIHJlLXJ1bm5pbmcgdGhlIHF1ZXJ5IChzcGVjaWZpY2FsbHksIHdlXG4gICAgICAvLyBjb3VsZCBiZSBpbiBfcHVibGlzaE5ld1Jlc3VsdHMpLiBJbiB0aGF0IGNhc2UsIF91bnB1Ymxpc2hlZEJ1ZmZlciBpc1xuICAgICAgLy8gZW1wdHkgYmVjYXVzZSB3ZSBjbGVhciBpdCBhdCB0aGUgYmVnaW5uaW5nIG9mIF9wdWJsaXNoTmV3UmVzdWx0cy4gSW5cbiAgICAgIC8vIHRoaXMgY2FzZSwgb3VyIGNhbGxlciBhbHJlYWR5IGtub3dzIHRoZSBlbnRpcmUgYW5zd2VyIHRvIHRoZSBxdWVyeSBhbmRcbiAgICAgIC8vIHdlIGRvbid0IG5lZWQgdG8gZG8gYW55dGhpbmcgZmFuY3kgaGVyZS4gIEp1c3QgcmV0dXJuLlxuICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5RVUVSWUlORylcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICAvLyAoYikgV2UncmUgcHJldHR5IGNvbmZpZGVudCB0aGF0IHRoZSB1bmlvbiBvZiBfcHVibGlzaGVkIGFuZFxuICAgICAgLy8gX3VucHVibGlzaGVkQnVmZmVyIGNvbnRhaW4gYWxsIGRvY3VtZW50cyB0aGF0IG1hdGNoIHNlbGVjdG9yLiBCZWNhdXNlXG4gICAgICAvLyBfdW5wdWJsaXNoZWRCdWZmZXIgaXMgZW1wdHksIHRoYXQgbWVhbnMgd2UncmUgY29uZmlkZW50IHRoYXQgX3B1Ymxpc2hlZFxuICAgICAgLy8gY29udGFpbnMgYWxsIGRvY3VtZW50cyB0aGF0IG1hdGNoIHNlbGVjdG9yLiBTbyB3ZSBoYXZlIG5vdGhpbmcgdG8gZG8uXG4gICAgICBpZiAoc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyKVxuICAgICAgICByZXR1cm47XG5cbiAgICAgIC8vIChjKSBNYXliZSB0aGVyZSBhcmUgb3RoZXIgZG9jdW1lbnRzIG91dCB0aGVyZSB0aGF0IHNob3VsZCBiZSBpbiBvdXJcbiAgICAgIC8vIGJ1ZmZlci4gQnV0IGluIHRoYXQgY2FzZSwgd2hlbiB3ZSBlbXB0aWVkIF91bnB1Ymxpc2hlZEJ1ZmZlciBpblxuICAgICAgLy8gX3JlbW92ZUJ1ZmZlcmVkLCB3ZSBzaG91bGQgaGF2ZSBjYWxsZWQgX25lZWRUb1BvbGxRdWVyeSwgd2hpY2ggd2lsbFxuICAgICAgLy8gZWl0aGVyIHB1dCBzb21ldGhpbmcgaW4gX3VucHVibGlzaGVkQnVmZmVyIG9yIHNldCBfc2FmZUFwcGVuZFRvQnVmZmVyXG4gICAgICAvLyAob3IgYm90aCksIGFuZCBpdCB3aWxsIHB1dCB1cyBpbiBRVUVSWUlORyBmb3IgdGhhdCB3aG9sZSB0aW1lLiBTbyBpblxuICAgICAgLy8gZmFjdCwgd2Ugc2hvdWxkbid0IGJlIGFibGUgdG8gZ2V0IGhlcmUuXG5cbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkJ1ZmZlciBpbmV4cGxpY2FibHkgZW1wdHlcIik7XG4gICAgfSk7XG4gIH0sXG4gIF9jaGFuZ2VQdWJsaXNoZWQ6IGZ1bmN0aW9uIChpZCwgb2xkRG9jLCBuZXdEb2MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fcHVibGlzaGVkLnNldChpZCwgc2VsZi5fc2hhcmVkUHJvamVjdGlvbkZuKG5ld0RvYykpO1xuICAgICAgdmFyIHByb2plY3RlZE5ldyA9IHNlbGYuX3Byb2plY3Rpb25GbihuZXdEb2MpO1xuICAgICAgdmFyIHByb2plY3RlZE9sZCA9IHNlbGYuX3Byb2plY3Rpb25GbihvbGREb2MpO1xuICAgICAgdmFyIGNoYW5nZWQgPSBEaWZmU2VxdWVuY2UubWFrZUNoYW5nZWRGaWVsZHMoXG4gICAgICAgIHByb2plY3RlZE5ldywgcHJvamVjdGVkT2xkKTtcbiAgICAgIGlmICghXy5pc0VtcHR5KGNoYW5nZWQpKVxuICAgICAgICBzZWxmLl9tdWx0aXBsZXhlci5jaGFuZ2VkKGlkLCBjaGFuZ2VkKTtcbiAgICB9KTtcbiAgfSxcbiAgX2FkZEJ1ZmZlcmVkOiBmdW5jdGlvbiAoaWQsIGRvYykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zZXQoaWQsIHNlbGYuX3NoYXJlZFByb2plY3Rpb25Gbihkb2MpKTtcblxuICAgICAgLy8gSWYgc29tZXRoaW5nIGlzIG92ZXJmbG93aW5nIHRoZSBidWZmZXIsIHdlIGp1c3QgcmVtb3ZlIGl0IGZyb20gY2FjaGVcbiAgICAgIGlmIChzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgPiBzZWxmLl9saW1pdCkge1xuICAgICAgICB2YXIgbWF4QnVmZmVyZWRJZCA9IHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLm1heEVsZW1lbnRJZCgpO1xuXG4gICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnJlbW92ZShtYXhCdWZmZXJlZElkKTtcblxuICAgICAgICAvLyBTaW5jZSBzb21ldGhpbmcgbWF0Y2hpbmcgaXMgcmVtb3ZlZCBmcm9tIGNhY2hlIChib3RoIHB1Ymxpc2hlZCBzZXQgYW5kXG4gICAgICAgIC8vIGJ1ZmZlciksIHNldCBmbGFnIHRvIGZhbHNlXG4gICAgICAgIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICAvLyBJcyBjYWxsZWQgZWl0aGVyIHRvIHJlbW92ZSB0aGUgZG9jIGNvbXBsZXRlbHkgZnJvbSBtYXRjaGluZyBzZXQgb3IgdG8gbW92ZVxuICAvLyBpdCB0byB0aGUgcHVibGlzaGVkIHNldCBsYXRlci5cbiAgX3JlbW92ZUJ1ZmZlcmVkOiBmdW5jdGlvbiAoaWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIucmVtb3ZlKGlkKTtcbiAgICAgIC8vIFRvIGtlZXAgdGhlIGNvbnRyYWN0IFwiYnVmZmVyIGlzIG5ldmVyIGVtcHR5IGluIFNURUFEWSBwaGFzZSB1bmxlc3MgdGhlXG4gICAgICAvLyBldmVyeXRoaW5nIG1hdGNoaW5nIGZpdHMgaW50byBwdWJsaXNoZWRcIiB0cnVlLCB3ZSBwb2xsIGV2ZXJ5dGhpbmcgYXNcbiAgICAgIC8vIHNvb24gYXMgd2Ugc2VlIHRoZSBidWZmZXIgYmVjb21pbmcgZW1wdHkuXG4gICAgICBpZiAoISBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgJiYgISBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIpXG4gICAgICAgIHNlbGYuX25lZWRUb1BvbGxRdWVyeSgpO1xuICAgIH0pO1xuICB9LFxuICAvLyBDYWxsZWQgd2hlbiBhIGRvY3VtZW50IGhhcyBqb2luZWQgdGhlIFwiTWF0Y2hpbmdcIiByZXN1bHRzIHNldC5cbiAgLy8gVGFrZXMgcmVzcG9uc2liaWxpdHkgb2Yga2VlcGluZyBfdW5wdWJsaXNoZWRCdWZmZXIgaW4gc3luYyB3aXRoIF9wdWJsaXNoZWRcbiAgLy8gYW5kIHRoZSBlZmZlY3Qgb2YgbGltaXQgZW5mb3JjZWQuXG4gIF9hZGRNYXRjaGluZzogZnVuY3Rpb24gKGRvYykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgaWQgPSBkb2MuX2lkO1xuICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5oYXMoaWQpKVxuICAgICAgICB0aHJvdyBFcnJvcihcInRyaWVkIHRvIGFkZCBzb21ldGhpbmcgYWxyZWFkeSBwdWJsaXNoZWQgXCIgKyBpZCk7XG4gICAgICBpZiAoc2VsZi5fbGltaXQgJiYgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuaGFzKGlkKSlcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJ0cmllZCB0byBhZGQgc29tZXRoaW5nIGFscmVhZHkgZXhpc3RlZCBpbiBidWZmZXIgXCIgKyBpZCk7XG5cbiAgICAgIHZhciBsaW1pdCA9IHNlbGYuX2xpbWl0O1xuICAgICAgdmFyIGNvbXBhcmF0b3IgPSBzZWxmLl9jb21wYXJhdG9yO1xuICAgICAgdmFyIG1heFB1Ymxpc2hlZCA9IChsaW1pdCAmJiBzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpID4gMCkgP1xuICAgICAgICBzZWxmLl9wdWJsaXNoZWQuZ2V0KHNlbGYuX3B1Ymxpc2hlZC5tYXhFbGVtZW50SWQoKSkgOiBudWxsO1xuICAgICAgdmFyIG1heEJ1ZmZlcmVkID0gKGxpbWl0ICYmIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNpemUoKSA+IDApXG4gICAgICAgID8gc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZ2V0KHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLm1heEVsZW1lbnRJZCgpKVxuICAgICAgICA6IG51bGw7XG4gICAgICAvLyBUaGUgcXVlcnkgaXMgdW5saW1pdGVkIG9yIGRpZG4ndCBwdWJsaXNoIGVub3VnaCBkb2N1bWVudHMgeWV0IG9yIHRoZVxuICAgICAgLy8gbmV3IGRvY3VtZW50IHdvdWxkIGZpdCBpbnRvIHB1Ymxpc2hlZCBzZXQgcHVzaGluZyB0aGUgbWF4aW11bSBlbGVtZW50XG4gICAgICAvLyBvdXQsIHRoZW4gd2UgbmVlZCB0byBwdWJsaXNoIHRoZSBkb2MuXG4gICAgICB2YXIgdG9QdWJsaXNoID0gISBsaW1pdCB8fCBzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpIDwgbGltaXQgfHxcbiAgICAgICAgY29tcGFyYXRvcihkb2MsIG1heFB1Ymxpc2hlZCkgPCAwO1xuXG4gICAgICAvLyBPdGhlcndpc2Ugd2UgbWlnaHQgbmVlZCB0byBidWZmZXIgaXQgKG9ubHkgaW4gY2FzZSBvZiBsaW1pdGVkIHF1ZXJ5KS5cbiAgICAgIC8vIEJ1ZmZlcmluZyBpcyBhbGxvd2VkIGlmIHRoZSBidWZmZXIgaXMgbm90IGZpbGxlZCB1cCB5ZXQgYW5kIGFsbFxuICAgICAgLy8gbWF0Y2hpbmcgZG9jcyBhcmUgZWl0aGVyIGluIHRoZSBwdWJsaXNoZWQgc2V0IG9yIGluIHRoZSBidWZmZXIuXG4gICAgICB2YXIgY2FuQXBwZW5kVG9CdWZmZXIgPSAhdG9QdWJsaXNoICYmIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciAmJlxuICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgPCBsaW1pdDtcblxuICAgICAgLy8gT3IgaWYgaXQgaXMgc21hbGwgZW5vdWdoIHRvIGJlIHNhZmVseSBpbnNlcnRlZCB0byB0aGUgbWlkZGxlIG9yIHRoZVxuICAgICAgLy8gYmVnaW5uaW5nIG9mIHRoZSBidWZmZXIuXG4gICAgICB2YXIgY2FuSW5zZXJ0SW50b0J1ZmZlciA9ICF0b1B1Ymxpc2ggJiYgbWF4QnVmZmVyZWQgJiZcbiAgICAgICAgY29tcGFyYXRvcihkb2MsIG1heEJ1ZmZlcmVkKSA8PSAwO1xuXG4gICAgICB2YXIgdG9CdWZmZXIgPSBjYW5BcHBlbmRUb0J1ZmZlciB8fCBjYW5JbnNlcnRJbnRvQnVmZmVyO1xuXG4gICAgICBpZiAodG9QdWJsaXNoKSB7XG4gICAgICAgIHNlbGYuX2FkZFB1Ymxpc2hlZChpZCwgZG9jKTtcbiAgICAgIH0gZWxzZSBpZiAodG9CdWZmZXIpIHtcbiAgICAgICAgc2VsZi5fYWRkQnVmZmVyZWQoaWQsIGRvYyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBkcm9wcGluZyBpdCBhbmQgbm90IHNhdmluZyB0byB0aGUgY2FjaGVcbiAgICAgICAgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIC8vIENhbGxlZCB3aGVuIGEgZG9jdW1lbnQgbGVhdmVzIHRoZSBcIk1hdGNoaW5nXCIgcmVzdWx0cyBzZXQuXG4gIC8vIFRha2VzIHJlc3BvbnNpYmlsaXR5IG9mIGtlZXBpbmcgX3VucHVibGlzaGVkQnVmZmVyIGluIHN5bmMgd2l0aCBfcHVibGlzaGVkXG4gIC8vIGFuZCB0aGUgZWZmZWN0IG9mIGxpbWl0IGVuZm9yY2VkLlxuICBfcmVtb3ZlTWF0Y2hpbmc6IGZ1bmN0aW9uIChpZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoISBzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKSAmJiAhIHNlbGYuX2xpbWl0KVxuICAgICAgICB0aHJvdyBFcnJvcihcInRyaWVkIHRvIHJlbW92ZSBzb21ldGhpbmcgbWF0Y2hpbmcgYnV0IG5vdCBjYWNoZWQgXCIgKyBpZCk7XG5cbiAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKSkge1xuICAgICAgICBzZWxmLl9yZW1vdmVQdWJsaXNoZWQoaWQpO1xuICAgICAgfSBlbHNlIGlmIChzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5oYXMoaWQpKSB7XG4gICAgICAgIHNlbGYuX3JlbW92ZUJ1ZmZlcmVkKGlkKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgX2hhbmRsZURvYzogZnVuY3Rpb24gKGlkLCBuZXdEb2MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG1hdGNoZXNOb3cgPSBuZXdEb2MgJiYgc2VsZi5fbWF0Y2hlci5kb2N1bWVudE1hdGNoZXMobmV3RG9jKS5yZXN1bHQ7XG5cbiAgICAgIHZhciBwdWJsaXNoZWRCZWZvcmUgPSBzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKTtcbiAgICAgIHZhciBidWZmZXJlZEJlZm9yZSA9IHNlbGYuX2xpbWl0ICYmIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmhhcyhpZCk7XG4gICAgICB2YXIgY2FjaGVkQmVmb3JlID0gcHVibGlzaGVkQmVmb3JlIHx8IGJ1ZmZlcmVkQmVmb3JlO1xuXG4gICAgICBpZiAobWF0Y2hlc05vdyAmJiAhY2FjaGVkQmVmb3JlKSB7XG4gICAgICAgIHNlbGYuX2FkZE1hdGNoaW5nKG5ld0RvYyk7XG4gICAgICB9IGVsc2UgaWYgKGNhY2hlZEJlZm9yZSAmJiAhbWF0Y2hlc05vdykge1xuICAgICAgICBzZWxmLl9yZW1vdmVNYXRjaGluZyhpZCk7XG4gICAgICB9IGVsc2UgaWYgKGNhY2hlZEJlZm9yZSAmJiBtYXRjaGVzTm93KSB7XG4gICAgICAgIHZhciBvbGREb2MgPSBzZWxmLl9wdWJsaXNoZWQuZ2V0KGlkKTtcbiAgICAgICAgdmFyIGNvbXBhcmF0b3IgPSBzZWxmLl9jb21wYXJhdG9yO1xuICAgICAgICB2YXIgbWluQnVmZmVyZWQgPSBzZWxmLl9saW1pdCAmJiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgJiZcbiAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIubWluRWxlbWVudElkKCkpO1xuICAgICAgICB2YXIgbWF4QnVmZmVyZWQ7XG5cbiAgICAgICAgaWYgKHB1Ymxpc2hlZEJlZm9yZSkge1xuICAgICAgICAgIC8vIFVubGltaXRlZCBjYXNlIHdoZXJlIHRoZSBkb2N1bWVudCBzdGF5cyBpbiBwdWJsaXNoZWQgb25jZSBpdFxuICAgICAgICAgIC8vIG1hdGNoZXMgb3IgdGhlIGNhc2Ugd2hlbiB3ZSBkb24ndCBoYXZlIGVub3VnaCBtYXRjaGluZyBkb2NzIHRvXG4gICAgICAgICAgLy8gcHVibGlzaCBvciB0aGUgY2hhbmdlZCBidXQgbWF0Y2hpbmcgZG9jIHdpbGwgc3RheSBpbiBwdWJsaXNoZWRcbiAgICAgICAgICAvLyBhbnl3YXlzLlxuICAgICAgICAgIC8vXG4gICAgICAgICAgLy8gWFhYOiBXZSByZWx5IG9uIHRoZSBlbXB0aW5lc3Mgb2YgYnVmZmVyLiBCZSBzdXJlIHRvIG1haW50YWluIHRoZVxuICAgICAgICAgIC8vIGZhY3QgdGhhdCBidWZmZXIgY2FuJ3QgYmUgZW1wdHkgaWYgdGhlcmUgYXJlIG1hdGNoaW5nIGRvY3VtZW50cyBub3RcbiAgICAgICAgICAvLyBwdWJsaXNoZWQuIE5vdGFibHksIHdlIGRvbid0IHdhbnQgdG8gc2NoZWR1bGUgcmVwb2xsIGFuZCBjb250aW51ZVxuICAgICAgICAgIC8vIHJlbHlpbmcgb24gdGhpcyBwcm9wZXJ0eS5cbiAgICAgICAgICB2YXIgc3RheXNJblB1Ymxpc2hlZCA9ICEgc2VsZi5fbGltaXQgfHxcbiAgICAgICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNpemUoKSA9PT0gMCB8fFxuICAgICAgICAgICAgY29tcGFyYXRvcihuZXdEb2MsIG1pbkJ1ZmZlcmVkKSA8PSAwO1xuXG4gICAgICAgICAgaWYgKHN0YXlzSW5QdWJsaXNoZWQpIHtcbiAgICAgICAgICAgIHNlbGYuX2NoYW5nZVB1Ymxpc2hlZChpZCwgb2xkRG9jLCBuZXdEb2MpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBhZnRlciB0aGUgY2hhbmdlIGRvYyBkb2Vzbid0IHN0YXkgaW4gdGhlIHB1Ymxpc2hlZCwgcmVtb3ZlIGl0XG4gICAgICAgICAgICBzZWxmLl9yZW1vdmVQdWJsaXNoZWQoaWQpO1xuICAgICAgICAgICAgLy8gYnV0IGl0IGNhbiBtb3ZlIGludG8gYnVmZmVyZWQgbm93LCBjaGVjayBpdFxuICAgICAgICAgICAgbWF4QnVmZmVyZWQgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoXG4gICAgICAgICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLm1heEVsZW1lbnRJZCgpKTtcblxuICAgICAgICAgICAgdmFyIHRvQnVmZmVyID0gc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyIHx8XG4gICAgICAgICAgICAgICAgICAobWF4QnVmZmVyZWQgJiYgY29tcGFyYXRvcihuZXdEb2MsIG1heEJ1ZmZlcmVkKSA8PSAwKTtcblxuICAgICAgICAgICAgaWYgKHRvQnVmZmVyKSB7XG4gICAgICAgICAgICAgIHNlbGYuX2FkZEJ1ZmZlcmVkKGlkLCBuZXdEb2MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gVGhyb3cgYXdheSBmcm9tIGJvdGggcHVibGlzaGVkIHNldCBhbmQgYnVmZmVyXG4gICAgICAgICAgICAgIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChidWZmZXJlZEJlZm9yZSkge1xuICAgICAgICAgIG9sZERvYyA9IHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmdldChpZCk7XG4gICAgICAgICAgLy8gcmVtb3ZlIHRoZSBvbGQgdmVyc2lvbiBtYW51YWxseSBpbnN0ZWFkIG9mIHVzaW5nIF9yZW1vdmVCdWZmZXJlZCBzb1xuICAgICAgICAgIC8vIHdlIGRvbid0IHRyaWdnZXIgdGhlIHF1ZXJ5aW5nIGltbWVkaWF0ZWx5LiAgaWYgd2UgZW5kIHRoaXMgYmxvY2tcbiAgICAgICAgICAvLyB3aXRoIHRoZSBidWZmZXIgZW1wdHksIHdlIHdpbGwgbmVlZCB0byB0cmlnZ2VyIHRoZSBxdWVyeSBwb2xsXG4gICAgICAgICAgLy8gbWFudWFsbHkgdG9vLlxuICAgICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnJlbW92ZShpZCk7XG5cbiAgICAgICAgICB2YXIgbWF4UHVibGlzaGVkID0gc2VsZi5fcHVibGlzaGVkLmdldChcbiAgICAgICAgICAgIHNlbGYuX3B1Ymxpc2hlZC5tYXhFbGVtZW50SWQoKSk7XG4gICAgICAgICAgbWF4QnVmZmVyZWQgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgJiZcbiAgICAgICAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoXG4gICAgICAgICAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5tYXhFbGVtZW50SWQoKSk7XG5cbiAgICAgICAgICAvLyB0aGUgYnVmZmVyZWQgZG9jIHdhcyB1cGRhdGVkLCBpdCBjb3VsZCBtb3ZlIHRvIHB1Ymxpc2hlZFxuICAgICAgICAgIHZhciB0b1B1Ymxpc2ggPSBjb21wYXJhdG9yKG5ld0RvYywgbWF4UHVibGlzaGVkKSA8IDA7XG5cbiAgICAgICAgICAvLyBvciBzdGF5cyBpbiBidWZmZXIgZXZlbiBhZnRlciB0aGUgY2hhbmdlXG4gICAgICAgICAgdmFyIHN0YXlzSW5CdWZmZXIgPSAoISB0b1B1Ymxpc2ggJiYgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyKSB8fFxuICAgICAgICAgICAgICAgICghdG9QdWJsaXNoICYmIG1heEJ1ZmZlcmVkICYmXG4gICAgICAgICAgICAgICAgIGNvbXBhcmF0b3IobmV3RG9jLCBtYXhCdWZmZXJlZCkgPD0gMCk7XG5cbiAgICAgICAgICBpZiAodG9QdWJsaXNoKSB7XG4gICAgICAgICAgICBzZWxmLl9hZGRQdWJsaXNoZWQoaWQsIG5ld0RvYyk7XG4gICAgICAgICAgfSBlbHNlIGlmIChzdGF5c0luQnVmZmVyKSB7XG4gICAgICAgICAgICAvLyBzdGF5cyBpbiBidWZmZXIgYnV0IGNoYW5nZXNcbiAgICAgICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNldChpZCwgbmV3RG9jKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVGhyb3cgYXdheSBmcm9tIGJvdGggcHVibGlzaGVkIHNldCBhbmQgYnVmZmVyXG4gICAgICAgICAgICBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIC8vIE5vcm1hbGx5IHRoaXMgY2hlY2sgd291bGQgaGF2ZSBiZWVuIGRvbmUgaW4gX3JlbW92ZUJ1ZmZlcmVkIGJ1dFxuICAgICAgICAgICAgLy8gd2UgZGlkbid0IHVzZSBpdCwgc28gd2UgbmVlZCB0byBkbyBpdCBvdXJzZWxmIG5vdy5cbiAgICAgICAgICAgIGlmICghIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNpemUoKSkge1xuICAgICAgICAgICAgICBzZWxmLl9uZWVkVG9Qb2xsUXVlcnkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiY2FjaGVkQmVmb3JlIGltcGxpZXMgZWl0aGVyIG9mIHB1Ymxpc2hlZEJlZm9yZSBvciBidWZmZXJlZEJlZm9yZSBpcyB0cnVlLlwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBfZmV0Y2hNb2RpZmllZERvY3VtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9yZWdpc3RlclBoYXNlQ2hhbmdlKFBIQVNFLkZFVENISU5HKTtcbiAgICAgIC8vIERlZmVyLCBiZWNhdXNlIG5vdGhpbmcgY2FsbGVkIGZyb20gdGhlIG9wbG9nIGVudHJ5IGhhbmRsZXIgbWF5IHlpZWxkLFxuICAgICAgLy8gYnV0IGZldGNoKCkgeWllbGRzLlxuICAgICAgTWV0ZW9yLmRlZmVyKGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgd2hpbGUgKCFzZWxmLl9zdG9wcGVkICYmICFzZWxmLl9uZWVkVG9GZXRjaC5lbXB0eSgpKSB7XG4gICAgICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5RVUVSWUlORykge1xuICAgICAgICAgICAgLy8gV2hpbGUgZmV0Y2hpbmcsIHdlIGRlY2lkZWQgdG8gZ28gaW50byBRVUVSWUlORyBtb2RlLCBhbmQgdGhlbiB3ZVxuICAgICAgICAgICAgLy8gc2F3IGFub3RoZXIgb3Bsb2cgZW50cnksIHNvIF9uZWVkVG9GZXRjaCBpcyBub3QgZW1wdHkuIEJ1dCB3ZVxuICAgICAgICAgICAgLy8gc2hvdWxkbid0IGZldGNoIHRoZXNlIGRvY3VtZW50cyB1bnRpbCBBRlRFUiB0aGUgcXVlcnkgaXMgZG9uZS5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIEJlaW5nIGluIHN0ZWFkeSBwaGFzZSBoZXJlIHdvdWxkIGJlIHN1cnByaXNpbmcuXG4gICAgICAgICAgaWYgKHNlbGYuX3BoYXNlICE9PSBQSEFTRS5GRVRDSElORylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInBoYXNlIGluIGZldGNoTW9kaWZpZWREb2N1bWVudHM6IFwiICsgc2VsZi5fcGhhc2UpO1xuXG4gICAgICAgICAgc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcgPSBzZWxmLl9uZWVkVG9GZXRjaDtcbiAgICAgICAgICB2YXIgdGhpc0dlbmVyYXRpb24gPSArK3NlbGYuX2ZldGNoR2VuZXJhdGlvbjtcbiAgICAgICAgICBzZWxmLl9uZWVkVG9GZXRjaCA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICAgICAgICAgIHZhciB3YWl0aW5nID0gMDtcbiAgICAgICAgICB2YXIgZnV0ID0gbmV3IEZ1dHVyZTtcbiAgICAgICAgICAvLyBUaGlzIGxvb3AgaXMgc2FmZSwgYmVjYXVzZSBfY3VycmVudGx5RmV0Y2hpbmcgd2lsbCBub3QgYmUgdXBkYXRlZFxuICAgICAgICAgIC8vIGR1cmluZyB0aGlzIGxvb3AgKGluIGZhY3QsIGl0IGlzIG5ldmVyIG11dGF0ZWQpLlxuICAgICAgICAgIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nLmZvckVhY2goZnVuY3Rpb24gKGNhY2hlS2V5LCBpZCkge1xuICAgICAgICAgICAgd2FpdGluZysrO1xuICAgICAgICAgICAgc2VsZi5fbW9uZ29IYW5kbGUuX2RvY0ZldGNoZXIuZmV0Y2goXG4gICAgICAgICAgICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lLCBpZCwgY2FjaGVLZXksXG4gICAgICAgICAgICAgIGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5KGZ1bmN0aW9uIChlcnIsIGRvYykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIE1ldGVvci5fZGVidWcoXCJHb3QgZXhjZXB0aW9uIHdoaWxlIGZldGNoaW5nIGRvY3VtZW50c1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycik7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHdlIGdldCBhbiBlcnJvciBmcm9tIHRoZSBmZXRjaGVyIChlZywgdHJvdWJsZVxuICAgICAgICAgICAgICAgICAgICAvLyBjb25uZWN0aW5nIHRvIE1vbmdvKSwgbGV0J3MganVzdCBhYmFuZG9uIHRoZSBmZXRjaCBwaGFzZVxuICAgICAgICAgICAgICAgICAgICAvLyBhbHRvZ2V0aGVyIGFuZCBmYWxsIGJhY2sgdG8gcG9sbGluZy4gSXQncyBub3QgbGlrZSB3ZSdyZVxuICAgICAgICAgICAgICAgICAgICAvLyBnZXR0aW5nIGxpdmUgdXBkYXRlcyBhbnl3YXkuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLl9waGFzZSAhPT0gUEhBU0UuUVVFUllJTkcpIHtcbiAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9uZWVkVG9Qb2xsUXVlcnkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICghc2VsZi5fc3RvcHBlZCAmJiBzZWxmLl9waGFzZSA9PT0gUEhBU0UuRkVUQ0hJTkdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgc2VsZi5fZmV0Y2hHZW5lcmF0aW9uID09PSB0aGlzR2VuZXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBXZSByZS1jaGVjayB0aGUgZ2VuZXJhdGlvbiBpbiBjYXNlIHdlJ3ZlIGhhZCBhbiBleHBsaWNpdFxuICAgICAgICAgICAgICAgICAgICAvLyBfcG9sbFF1ZXJ5IGNhbGwgKGVnLCBpbiBhbm90aGVyIGZpYmVyKSB3aGljaCBzaG91bGRcbiAgICAgICAgICAgICAgICAgICAgLy8gZWZmZWN0aXZlbHkgY2FuY2VsIHRoaXMgcm91bmQgb2YgZmV0Y2hlcy4gIChfcG9sbFF1ZXJ5XG4gICAgICAgICAgICAgICAgICAgIC8vIGluY3JlbWVudHMgdGhlIGdlbmVyYXRpb24uKVxuICAgICAgICAgICAgICAgICAgICBzZWxmLl9oYW5kbGVEb2MoaWQsIGRvYyk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICAgIHdhaXRpbmctLTtcbiAgICAgICAgICAgICAgICAgIC8vIEJlY2F1c2UgZmV0Y2goKSBuZXZlciBjYWxscyBpdHMgY2FsbGJhY2sgc3luY2hyb25vdXNseSxcbiAgICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgc2FmZSAoaWUsIHdlIHdvbid0IGNhbGwgZnV0LnJldHVybigpIGJlZm9yZSB0aGVcbiAgICAgICAgICAgICAgICAgIC8vIGZvckVhY2ggaXMgZG9uZSkuXG4gICAgICAgICAgICAgICAgICBpZiAod2FpdGluZyA9PT0gMClcbiAgICAgICAgICAgICAgICAgICAgZnV0LnJldHVybigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGZ1dC53YWl0KCk7XG4gICAgICAgICAgLy8gRXhpdCBub3cgaWYgd2UndmUgaGFkIGEgX3BvbGxRdWVyeSBjYWxsIChoZXJlIG9yIGluIGFub3RoZXIgZmliZXIpLlxuICAgICAgICAgIGlmIChzZWxmLl9waGFzZSA9PT0gUEhBU0UuUVVFUllJTkcpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIC8vIFdlJ3JlIGRvbmUgZmV0Y2hpbmcsIHNvIHdlIGNhbiBiZSBzdGVhZHksIHVubGVzcyB3ZSd2ZSBoYWQgYVxuICAgICAgICAvLyBfcG9sbFF1ZXJ5IGNhbGwgKGhlcmUgb3IgaW4gYW5vdGhlciBmaWJlcikuXG4gICAgICAgIGlmIChzZWxmLl9waGFzZSAhPT0gUEhBU0UuUVVFUllJTkcpXG4gICAgICAgICAgc2VsZi5fYmVTdGVhZHkoKTtcbiAgICAgIH0pKTtcbiAgICB9KTtcbiAgfSxcbiAgX2JlU3RlYWR5OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX3JlZ2lzdGVyUGhhc2VDaGFuZ2UoUEhBU0UuU1RFQURZKTtcbiAgICAgIHZhciB3cml0ZXMgPSBzZWxmLl93cml0ZXNUb0NvbW1pdFdoZW5XZVJlYWNoU3RlYWR5O1xuICAgICAgc2VsZi5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeSA9IFtdO1xuICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIub25GbHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIF8uZWFjaCh3cml0ZXMsIGZ1bmN0aW9uICh3KSB7XG4gICAgICAgICAgdy5jb21taXR0ZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcbiAgX2hhbmRsZU9wbG9nRW50cnlRdWVyeWluZzogZnVuY3Rpb24gKG9wKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX25lZWRUb0ZldGNoLnNldChpZEZvck9wKG9wKSwgb3AudHMudG9TdHJpbmcoKSk7XG4gICAgfSk7XG4gIH0sXG4gIF9oYW5kbGVPcGxvZ0VudHJ5U3RlYWR5T3JGZXRjaGluZzogZnVuY3Rpb24gKG9wKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBpZCA9IGlkRm9yT3Aob3ApO1xuICAgICAgLy8gSWYgd2UncmUgYWxyZWFkeSBmZXRjaGluZyB0aGlzIG9uZSwgb3IgYWJvdXQgdG8sIHdlIGNhbid0IG9wdGltaXplO1xuICAgICAgLy8gbWFrZSBzdXJlIHRoYXQgd2UgZmV0Y2ggaXQgYWdhaW4gaWYgbmVjZXNzYXJ5LlxuICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5GRVRDSElORyAmJlxuICAgICAgICAgICgoc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcgJiYgc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcuaGFzKGlkKSkgfHxcbiAgICAgICAgICAgc2VsZi5fbmVlZFRvRmV0Y2guaGFzKGlkKSkpIHtcbiAgICAgICAgc2VsZi5fbmVlZFRvRmV0Y2guc2V0KGlkLCBvcC50cy50b1N0cmluZygpKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAob3Aub3AgPT09ICdkJykge1xuICAgICAgICBpZiAoc2VsZi5fcHVibGlzaGVkLmhhcyhpZCkgfHxcbiAgICAgICAgICAgIChzZWxmLl9saW1pdCAmJiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5oYXMoaWQpKSlcbiAgICAgICAgICBzZWxmLl9yZW1vdmVNYXRjaGluZyhpZCk7XG4gICAgICB9IGVsc2UgaWYgKG9wLm9wID09PSAnaScpIHtcbiAgICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5oYXMoaWQpKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImluc2VydCBmb3VuZCBmb3IgYWxyZWFkeS1leGlzdGluZyBJRCBpbiBwdWJsaXNoZWRcIik7XG4gICAgICAgIGlmIChzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlciAmJiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5oYXMoaWQpKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImluc2VydCBmb3VuZCBmb3IgYWxyZWFkeS1leGlzdGluZyBJRCBpbiBidWZmZXJcIik7XG5cbiAgICAgICAgLy8gWFhYIHdoYXQgaWYgc2VsZWN0b3IgeWllbGRzPyAgZm9yIG5vdyBpdCBjYW4ndCBidXQgbGF0ZXIgaXQgY291bGRcbiAgICAgICAgLy8gaGF2ZSAkd2hlcmVcbiAgICAgICAgaWYgKHNlbGYuX21hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKG9wLm8pLnJlc3VsdClcbiAgICAgICAgICBzZWxmLl9hZGRNYXRjaGluZyhvcC5vKTtcbiAgICAgIH0gZWxzZSBpZiAob3Aub3AgPT09ICd1Jykge1xuICAgICAgICAvLyBJcyB0aGlzIGEgbW9kaWZpZXIgKCRzZXQvJHVuc2V0LCB3aGljaCBtYXkgcmVxdWlyZSB1cyB0byBwb2xsIHRoZVxuICAgICAgICAvLyBkYXRhYmFzZSB0byBmaWd1cmUgb3V0IGlmIHRoZSB3aG9sZSBkb2N1bWVudCBtYXRjaGVzIHRoZSBzZWxlY3Rvcikgb3JcbiAgICAgICAgLy8gYSByZXBsYWNlbWVudCAoaW4gd2hpY2ggY2FzZSB3ZSBjYW4ganVzdCBkaXJlY3RseSByZS1ldmFsdWF0ZSB0aGVcbiAgICAgICAgLy8gc2VsZWN0b3IpP1xuICAgICAgICB2YXIgaXNSZXBsYWNlID0gIV8uaGFzKG9wLm8sICckc2V0JykgJiYgIV8uaGFzKG9wLm8sICckdW5zZXQnKTtcbiAgICAgICAgLy8gSWYgdGhpcyBtb2RpZmllciBtb2RpZmllcyBzb21ldGhpbmcgaW5zaWRlIGFuIEVKU09OIGN1c3RvbSB0eXBlIChpZSxcbiAgICAgICAgLy8gYW55dGhpbmcgd2l0aCBFSlNPTiQpLCB0aGVuIHdlIGNhbid0IHRyeSB0byB1c2VcbiAgICAgICAgLy8gTG9jYWxDb2xsZWN0aW9uLl9tb2RpZnksIHNpbmNlIHRoYXQganVzdCBtdXRhdGVzIHRoZSBFSlNPTiBlbmNvZGluZyxcbiAgICAgICAgLy8gbm90IHRoZSBhY3R1YWwgb2JqZWN0LlxuICAgICAgICB2YXIgY2FuRGlyZWN0bHlNb2RpZnlEb2MgPVxuICAgICAgICAgICFpc1JlcGxhY2UgJiYgbW9kaWZpZXJDYW5CZURpcmVjdGx5QXBwbGllZChvcC5vKTtcblxuICAgICAgICB2YXIgcHVibGlzaGVkQmVmb3JlID0gc2VsZi5fcHVibGlzaGVkLmhhcyhpZCk7XG4gICAgICAgIHZhciBidWZmZXJlZEJlZm9yZSA9IHNlbGYuX2xpbWl0ICYmIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmhhcyhpZCk7XG5cbiAgICAgICAgaWYgKGlzUmVwbGFjZSkge1xuICAgICAgICAgIHNlbGYuX2hhbmRsZURvYyhpZCwgXy5leHRlbmQoe19pZDogaWR9LCBvcC5vKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoKHB1Ymxpc2hlZEJlZm9yZSB8fCBidWZmZXJlZEJlZm9yZSkgJiZcbiAgICAgICAgICAgICAgICAgICBjYW5EaXJlY3RseU1vZGlmeURvYykge1xuICAgICAgICAgIC8vIE9oIGdyZWF0LCB3ZSBhY3R1YWxseSBrbm93IHdoYXQgdGhlIGRvY3VtZW50IGlzLCBzbyB3ZSBjYW4gYXBwbHlcbiAgICAgICAgICAvLyB0aGlzIGRpcmVjdGx5LlxuICAgICAgICAgIHZhciBuZXdEb2MgPSBzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKVxuICAgICAgICAgICAgPyBzZWxmLl9wdWJsaXNoZWQuZ2V0KGlkKSA6IHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmdldChpZCk7XG4gICAgICAgICAgbmV3RG9jID0gRUpTT04uY2xvbmUobmV3RG9jKTtcblxuICAgICAgICAgIG5ld0RvYy5faWQgPSBpZDtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgTG9jYWxDb2xsZWN0aW9uLl9tb2RpZnkobmV3RG9jLCBvcC5vKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoZS5uYW1lICE9PSBcIk1pbmltb25nb0Vycm9yXCIpXG4gICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICAvLyBXZSBkaWRuJ3QgdW5kZXJzdGFuZCB0aGUgbW9kaWZpZXIuICBSZS1mZXRjaC5cbiAgICAgICAgICAgIHNlbGYuX25lZWRUb0ZldGNoLnNldChpZCwgb3AudHMudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICBpZiAoc2VsZi5fcGhhc2UgPT09IFBIQVNFLlNURUFEWSkge1xuICAgICAgICAgICAgICBzZWxmLl9mZXRjaE1vZGlmaWVkRG9jdW1lbnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHNlbGYuX2hhbmRsZURvYyhpZCwgc2VsZi5fc2hhcmVkUHJvamVjdGlvbkZuKG5ld0RvYykpO1xuICAgICAgICB9IGVsc2UgaWYgKCFjYW5EaXJlY3RseU1vZGlmeURvYyB8fFxuICAgICAgICAgICAgICAgICAgIHNlbGYuX21hdGNoZXIuY2FuQmVjb21lVHJ1ZUJ5TW9kaWZpZXIob3AubykgfHxcbiAgICAgICAgICAgICAgICAgICAoc2VsZi5fc29ydGVyICYmIHNlbGYuX3NvcnRlci5hZmZlY3RlZEJ5TW9kaWZpZXIob3AubykpKSB7XG4gICAgICAgICAgc2VsZi5fbmVlZFRvRmV0Y2guc2V0KGlkLCBvcC50cy50b1N0cmluZygpKTtcbiAgICAgICAgICBpZiAoc2VsZi5fcGhhc2UgPT09IFBIQVNFLlNURUFEWSlcbiAgICAgICAgICAgIHNlbGYuX2ZldGNoTW9kaWZpZWREb2N1bWVudHMoKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJYWFggU1VSUFJJU0lORyBPUEVSQVRJT046IFwiICsgb3ApO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICAvLyBZaWVsZHMhXG4gIF9ydW5Jbml0aWFsUXVlcnk6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJvcGxvZyBzdG9wcGVkIHN1cnByaXNpbmdseSBlYXJseVwiKTtcblxuICAgIHNlbGYuX3J1blF1ZXJ5KHtpbml0aWFsOiB0cnVlfSk7ICAvLyB5aWVsZHNcblxuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuOyAgLy8gY2FuIGhhcHBlbiBvbiBxdWVyeUVycm9yXG5cbiAgICAvLyBBbGxvdyBvYnNlcnZlQ2hhbmdlcyBjYWxscyB0byByZXR1cm4uIChBZnRlciB0aGlzLCBpdCdzIHBvc3NpYmxlIGZvclxuICAgIC8vIHN0b3AoKSB0byBiZSBjYWxsZWQuKVxuICAgIHNlbGYuX211bHRpcGxleGVyLnJlYWR5KCk7XG5cbiAgICBzZWxmLl9kb25lUXVlcnlpbmcoKTsgIC8vIHlpZWxkc1xuICB9LFxuXG4gIC8vIEluIHZhcmlvdXMgY2lyY3Vtc3RhbmNlcywgd2UgbWF5IGp1c3Qgd2FudCB0byBzdG9wIHByb2Nlc3NpbmcgdGhlIG9wbG9nIGFuZFxuICAvLyByZS1ydW4gdGhlIGluaXRpYWwgcXVlcnksIGp1c3QgYXMgaWYgd2Ugd2VyZSBhIFBvbGxpbmdPYnNlcnZlRHJpdmVyLlxuICAvL1xuICAvLyBUaGlzIGZ1bmN0aW9uIG1heSBub3QgYmxvY2ssIGJlY2F1c2UgaXQgaXMgY2FsbGVkIGZyb20gYW4gb3Bsb2cgZW50cnlcbiAgLy8gaGFuZGxlci5cbiAgLy9cbiAgLy8gWFhYIFdlIHNob3VsZCBjYWxsIHRoaXMgd2hlbiB3ZSBkZXRlY3QgdGhhdCB3ZSd2ZSBiZWVuIGluIEZFVENISU5HIGZvciBcInRvb1xuICAvLyBsb25nXCIuXG4gIC8vXG4gIC8vIFhYWCBXZSBzaG91bGQgY2FsbCB0aGlzIHdoZW4gd2UgZGV0ZWN0IE1vbmdvIGZhaWxvdmVyIChzaW5jZSB0aGF0IG1pZ2h0XG4gIC8vIG1lYW4gdGhhdCBzb21lIG9mIHRoZSBvcGxvZyBlbnRyaWVzIHdlIGhhdmUgcHJvY2Vzc2VkIGhhdmUgYmVlbiByb2xsZWRcbiAgLy8gYmFjaykuIFRoZSBOb2RlIE1vbmdvIGRyaXZlciBpcyBpbiB0aGUgbWlkZGxlIG9mIGEgYnVuY2ggb2YgaHVnZVxuICAvLyByZWZhY3RvcmluZ3MsIGluY2x1ZGluZyB0aGUgd2F5IHRoYXQgaXQgbm90aWZpZXMgeW91IHdoZW4gcHJpbWFyeVxuICAvLyBjaGFuZ2VzLiBXaWxsIHB1dCBvZmYgaW1wbGVtZW50aW5nIHRoaXMgdW50aWwgZHJpdmVyIDEuNCBpcyBvdXQuXG4gIF9wb2xsUXVlcnk6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgLy8gWWF5LCB3ZSBnZXQgdG8gZm9yZ2V0IGFib3V0IGFsbCB0aGUgdGhpbmdzIHdlIHRob3VnaHQgd2UgaGFkIHRvIGZldGNoLlxuICAgICAgc2VsZi5fbmVlZFRvRmV0Y2ggPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgICAgIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nID0gbnVsbDtcbiAgICAgICsrc2VsZi5fZmV0Y2hHZW5lcmF0aW9uOyAgLy8gaWdub3JlIGFueSBpbi1mbGlnaHQgZmV0Y2hlc1xuICAgICAgc2VsZi5fcmVnaXN0ZXJQaGFzZUNoYW5nZShQSEFTRS5RVUVSWUlORyk7XG5cbiAgICAgIC8vIERlZmVyIHNvIHRoYXQgd2UgZG9uJ3QgeWllbGQuICBXZSBkb24ndCBuZWVkIGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5XG4gICAgICAvLyBoZXJlIGJlY2F1c2UgU3dpdGNoZWRUb1F1ZXJ5IGlzIG5vdCB0aHJvd24gaW4gUVVFUllJTkcgbW9kZS5cbiAgICAgIE1ldGVvci5kZWZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlbGYuX3J1blF1ZXJ5KCk7XG4gICAgICAgIHNlbGYuX2RvbmVRdWVyeWluZygpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gWWllbGRzIVxuICBfcnVuUXVlcnk6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBuZXdSZXN1bHRzLCBuZXdCdWZmZXI7XG5cbiAgICAvLyBUaGlzIHdoaWxlIGxvb3AgaXMganVzdCB0byByZXRyeSBmYWlsdXJlcy5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgLy8gSWYgd2UndmUgYmVlbiBzdG9wcGVkLCB3ZSBkb24ndCBoYXZlIHRvIHJ1biBhbnl0aGluZyBhbnkgbW9yZS5cbiAgICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgICByZXR1cm47XG5cbiAgICAgIG5ld1Jlc3VsdHMgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgICAgIG5ld0J1ZmZlciA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuXG4gICAgICAvLyBRdWVyeSAyeCBkb2N1bWVudHMgYXMgdGhlIGhhbGYgZXhjbHVkZWQgZnJvbSB0aGUgb3JpZ2luYWwgcXVlcnkgd2lsbCBnb1xuICAgICAgLy8gaW50byB1bnB1Ymxpc2hlZCBidWZmZXIgdG8gcmVkdWNlIGFkZGl0aW9uYWwgTW9uZ28gbG9va3VwcyBpbiBjYXNlc1xuICAgICAgLy8gd2hlbiBkb2N1bWVudHMgYXJlIHJlbW92ZWQgZnJvbSB0aGUgcHVibGlzaGVkIHNldCBhbmQgbmVlZCBhXG4gICAgICAvLyByZXBsYWNlbWVudC5cbiAgICAgIC8vIFhYWCBuZWVkcyBtb3JlIHRob3VnaHQgb24gbm9uLXplcm8gc2tpcFxuICAgICAgLy8gWFhYIDIgaXMgYSBcIm1hZ2ljIG51bWJlclwiIG1lYW5pbmcgdGhlcmUgaXMgYW4gZXh0cmEgY2h1bmsgb2YgZG9jcyBmb3JcbiAgICAgIC8vIGJ1ZmZlciBpZiBzdWNoIGlzIG5lZWRlZC5cbiAgICAgIHZhciBjdXJzb3IgPSBzZWxmLl9jdXJzb3JGb3JRdWVyeSh7IGxpbWl0OiBzZWxmLl9saW1pdCAqIDIgfSk7XG4gICAgICB0cnkge1xuICAgICAgICBjdXJzb3IuZm9yRWFjaChmdW5jdGlvbiAoZG9jLCBpKSB7ICAvLyB5aWVsZHNcbiAgICAgICAgICBpZiAoIXNlbGYuX2xpbWl0IHx8IGkgPCBzZWxmLl9saW1pdCkge1xuICAgICAgICAgICAgbmV3UmVzdWx0cy5zZXQoZG9jLl9pZCwgZG9jKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV3QnVmZmVyLnNldChkb2MuX2lkLCBkb2MpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBpZiAob3B0aW9ucy5pbml0aWFsICYmIHR5cGVvZihlLmNvZGUpID09PSAnbnVtYmVyJykge1xuICAgICAgICAgIC8vIFRoaXMgaXMgYW4gZXJyb3IgZG9jdW1lbnQgc2VudCB0byB1cyBieSBtb25nb2QsIG5vdCBhIGNvbm5lY3Rpb25cbiAgICAgICAgICAvLyBlcnJvciBnZW5lcmF0ZWQgYnkgdGhlIGNsaWVudC4gQW5kIHdlJ3ZlIG5ldmVyIHNlZW4gdGhpcyBxdWVyeSB3b3JrXG4gICAgICAgICAgLy8gc3VjY2Vzc2Z1bGx5LiBQcm9iYWJseSBpdCdzIGEgYmFkIHNlbGVjdG9yIG9yIHNvbWV0aGluZywgc28gd2VcbiAgICAgICAgICAvLyBzaG91bGQgTk9UIHJldHJ5LiBJbnN0ZWFkLCB3ZSBzaG91bGQgaGFsdCB0aGUgb2JzZXJ2ZSAod2hpY2ggZW5kc1xuICAgICAgICAgIC8vIHVwIGNhbGxpbmcgYHN0b3BgIG9uIHVzKS5cbiAgICAgICAgICBzZWxmLl9tdWx0aXBsZXhlci5xdWVyeUVycm9yKGUpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIER1cmluZyBmYWlsb3ZlciAoZWcpIGlmIHdlIGdldCBhbiBleGNlcHRpb24gd2Ugc2hvdWxkIGxvZyBhbmQgcmV0cnlcbiAgICAgICAgLy8gaW5zdGVhZCBvZiBjcmFzaGluZy5cbiAgICAgICAgTWV0ZW9yLl9kZWJ1ZyhcIkdvdCBleGNlcHRpb24gd2hpbGUgcG9sbGluZyBxdWVyeVwiLCBlKTtcbiAgICAgICAgTWV0ZW9yLl9zbGVlcEZvck1zKDEwMCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICByZXR1cm47XG5cbiAgICBzZWxmLl9wdWJsaXNoTmV3UmVzdWx0cyhuZXdSZXN1bHRzLCBuZXdCdWZmZXIpO1xuICB9LFxuXG4gIC8vIFRyYW5zaXRpb25zIHRvIFFVRVJZSU5HIGFuZCBydW5zIGFub3RoZXIgcXVlcnksIG9yIChpZiBhbHJlYWR5IGluIFFVRVJZSU5HKVxuICAvLyBlbnN1cmVzIHRoYXQgd2Ugd2lsbCBxdWVyeSBhZ2FpbiBsYXRlci5cbiAgLy9cbiAgLy8gVGhpcyBmdW5jdGlvbiBtYXkgbm90IGJsb2NrLCBiZWNhdXNlIGl0IGlzIGNhbGxlZCBmcm9tIGFuIG9wbG9nIGVudHJ5XG4gIC8vIGhhbmRsZXIuIEhvd2V2ZXIsIGlmIHdlIHdlcmUgbm90IGFscmVhZHkgaW4gdGhlIFFVRVJZSU5HIHBoYXNlLCBpdCB0aHJvd3NcbiAgLy8gYW4gZXhjZXB0aW9uIHRoYXQgaXMgY2F1Z2h0IGJ5IHRoZSBjbG9zZXN0IHN1cnJvdW5kaW5nXG4gIC8vIGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5IGNhbGw7IHRoaXMgZW5zdXJlcyB0aGF0IHdlIGRvbid0IGNvbnRpbnVlIHJ1bm5pbmdcbiAgLy8gY2xvc2UgdGhhdCB3YXMgZGVzaWduZWQgZm9yIGFub3RoZXIgcGhhc2UgaW5zaWRlIFBIQVNFLlFVRVJZSU5HLlxuICAvL1xuICAvLyAoSXQncyBhbHNvIG5lY2Vzc2FyeSB3aGVuZXZlciBsb2dpYyBpbiB0aGlzIGZpbGUgeWllbGRzIHRvIGNoZWNrIHRoYXQgb3RoZXJcbiAgLy8gcGhhc2VzIGhhdmVuJ3QgcHV0IHVzIGludG8gUVVFUllJTkcgbW9kZSwgdGhvdWdoOyBlZyxcbiAgLy8gX2ZldGNoTW9kaWZpZWREb2N1bWVudHMgZG9lcyB0aGlzLilcbiAgX25lZWRUb1BvbGxRdWVyeTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICAvLyBJZiB3ZSdyZSBub3QgYWxyZWFkeSBpbiB0aGUgbWlkZGxlIG9mIGEgcXVlcnksIHdlIGNhbiBxdWVyeSBub3dcbiAgICAgIC8vIChwb3NzaWJseSBwYXVzaW5nIEZFVENISU5HKS5cbiAgICAgIGlmIChzZWxmLl9waGFzZSAhPT0gUEhBU0UuUVVFUllJTkcpIHtcbiAgICAgICAgc2VsZi5fcG9sbFF1ZXJ5KCk7XG4gICAgICAgIHRocm93IG5ldyBTd2l0Y2hlZFRvUXVlcnk7XG4gICAgICB9XG5cbiAgICAgIC8vIFdlJ3JlIGN1cnJlbnRseSBpbiBRVUVSWUlORy4gU2V0IGEgZmxhZyB0byBlbnN1cmUgdGhhdCB3ZSBydW4gYW5vdGhlclxuICAgICAgLy8gcXVlcnkgd2hlbiB3ZSdyZSBkb25lLlxuICAgICAgc2VsZi5fcmVxdWVyeVdoZW5Eb25lVGhpc1F1ZXJ5ID0gdHJ1ZTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBZaWVsZHMhXG4gIF9kb25lUXVlcnlpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjtcbiAgICBzZWxmLl9tb25nb0hhbmRsZS5fb3Bsb2dIYW5kbGUud2FpdFVudGlsQ2F1Z2h0VXAoKTsgIC8vIHlpZWxkc1xuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuO1xuICAgIGlmIChzZWxmLl9waGFzZSAhPT0gUEhBU0UuUVVFUllJTkcpXG4gICAgICB0aHJvdyBFcnJvcihcIlBoYXNlIHVuZXhwZWN0ZWRseSBcIiArIHNlbGYuX3BoYXNlKTtcblxuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmIChzZWxmLl9yZXF1ZXJ5V2hlbkRvbmVUaGlzUXVlcnkpIHtcbiAgICAgICAgc2VsZi5fcmVxdWVyeVdoZW5Eb25lVGhpc1F1ZXJ5ID0gZmFsc2U7XG4gICAgICAgIHNlbGYuX3BvbGxRdWVyeSgpO1xuICAgICAgfSBlbHNlIGlmIChzZWxmLl9uZWVkVG9GZXRjaC5lbXB0eSgpKSB7XG4gICAgICAgIHNlbGYuX2JlU3RlYWR5KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLl9mZXRjaE1vZGlmaWVkRG9jdW1lbnRzKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgX2N1cnNvckZvclF1ZXJ5OiBmdW5jdGlvbiAob3B0aW9uc092ZXJ3cml0ZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgLy8gVGhlIHF1ZXJ5IHdlIHJ1biBpcyBhbG1vc3QgdGhlIHNhbWUgYXMgdGhlIGN1cnNvciB3ZSBhcmUgb2JzZXJ2aW5nLFxuICAgICAgLy8gd2l0aCBhIGZldyBjaGFuZ2VzLiBXZSBuZWVkIHRvIHJlYWQgYWxsIHRoZSBmaWVsZHMgdGhhdCBhcmUgcmVsZXZhbnQgdG9cbiAgICAgIC8vIHRoZSBzZWxlY3Rvciwgbm90IGp1c3QgdGhlIGZpZWxkcyB3ZSBhcmUgZ29pbmcgdG8gcHVibGlzaCAodGhhdCdzIHRoZVxuICAgICAgLy8gXCJzaGFyZWRcIiBwcm9qZWN0aW9uKS4gQW5kIHdlIGRvbid0IHdhbnQgdG8gYXBwbHkgYW55IHRyYW5zZm9ybSBpbiB0aGVcbiAgICAgIC8vIGN1cnNvciwgYmVjYXVzZSBvYnNlcnZlQ2hhbmdlcyBzaG91bGRuJ3QgdXNlIHRoZSB0cmFuc2Zvcm0uXG4gICAgICB2YXIgb3B0aW9ucyA9IF8uY2xvbmUoc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucyk7XG5cbiAgICAgIC8vIEFsbG93IHRoZSBjYWxsZXIgdG8gbW9kaWZ5IHRoZSBvcHRpb25zLiBVc2VmdWwgdG8gc3BlY2lmeSBkaWZmZXJlbnRcbiAgICAgIC8vIHNraXAgYW5kIGxpbWl0IHZhbHVlcy5cbiAgICAgIF8uZXh0ZW5kKG9wdGlvbnMsIG9wdGlvbnNPdmVyd3JpdGUpO1xuXG4gICAgICBvcHRpb25zLmZpZWxkcyA9IHNlbGYuX3NoYXJlZFByb2plY3Rpb247XG4gICAgICBkZWxldGUgb3B0aW9ucy50cmFuc2Zvcm07XG4gICAgICAvLyBXZSBhcmUgTk9UIGRlZXAgY2xvbmluZyBmaWVsZHMgb3Igc2VsZWN0b3IgaGVyZSwgd2hpY2ggc2hvdWxkIGJlIE9LLlxuICAgICAgdmFyIGRlc2NyaXB0aW9uID0gbmV3IEN1cnNvckRlc2NyaXB0aW9uKFxuICAgICAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZSxcbiAgICAgICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IsXG4gICAgICAgIG9wdGlvbnMpO1xuICAgICAgcmV0dXJuIG5ldyBDdXJzb3Ioc2VsZi5fbW9uZ29IYW5kbGUsIGRlc2NyaXB0aW9uKTtcbiAgICB9KTtcbiAgfSxcblxuXG4gIC8vIFJlcGxhY2Ugc2VsZi5fcHVibGlzaGVkIHdpdGggbmV3UmVzdWx0cyAoYm90aCBhcmUgSWRNYXBzKSwgaW52b2tpbmcgb2JzZXJ2ZVxuICAvLyBjYWxsYmFja3Mgb24gdGhlIG11bHRpcGxleGVyLlxuICAvLyBSZXBsYWNlIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyIHdpdGggbmV3QnVmZmVyLlxuICAvL1xuICAvLyBYWFggVGhpcyBpcyB2ZXJ5IHNpbWlsYXIgdG8gTG9jYWxDb2xsZWN0aW9uLl9kaWZmUXVlcnlVbm9yZGVyZWRDaGFuZ2VzLiBXZVxuICAvLyBzaG91bGQgcmVhbGx5OiAoYSkgVW5pZnkgSWRNYXAgYW5kIE9yZGVyZWREaWN0IGludG8gVW5vcmRlcmVkL09yZGVyZWREaWN0XG4gIC8vIChiKSBSZXdyaXRlIGRpZmYuanMgdG8gdXNlIHRoZXNlIGNsYXNzZXMgaW5zdGVhZCBvZiBhcnJheXMgYW5kIG9iamVjdHMuXG4gIF9wdWJsaXNoTmV3UmVzdWx0czogZnVuY3Rpb24gKG5ld1Jlc3VsdHMsIG5ld0J1ZmZlcikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG5cbiAgICAgIC8vIElmIHRoZSBxdWVyeSBpcyBsaW1pdGVkIGFuZCB0aGVyZSBpcyBhIGJ1ZmZlciwgc2h1dCBkb3duIHNvIGl0IGRvZXNuJ3RcbiAgICAgIC8vIHN0YXkgaW4gYSB3YXkuXG4gICAgICBpZiAoc2VsZi5fbGltaXQpIHtcbiAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuY2xlYXIoKTtcbiAgICAgIH1cblxuICAgICAgLy8gRmlyc3QgcmVtb3ZlIGFueXRoaW5nIHRoYXQncyBnb25lLiBCZSBjYXJlZnVsIG5vdCB0byBtb2RpZnlcbiAgICAgIC8vIHNlbGYuX3B1Ymxpc2hlZCB3aGlsZSBpdGVyYXRpbmcgb3ZlciBpdC5cbiAgICAgIHZhciBpZHNUb1JlbW92ZSA9IFtdO1xuICAgICAgc2VsZi5fcHVibGlzaGVkLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaWQpIHtcbiAgICAgICAgaWYgKCFuZXdSZXN1bHRzLmhhcyhpZCkpXG4gICAgICAgICAgaWRzVG9SZW1vdmUucHVzaChpZCk7XG4gICAgICB9KTtcbiAgICAgIF8uZWFjaChpZHNUb1JlbW92ZSwgZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHNlbGYuX3JlbW92ZVB1Ymxpc2hlZChpZCk7XG4gICAgICB9KTtcblxuICAgICAgLy8gTm93IGRvIGFkZHMgYW5kIGNoYW5nZXMuXG4gICAgICAvLyBJZiBzZWxmIGhhcyBhIGJ1ZmZlciBhbmQgbGltaXQsIHRoZSBuZXcgZmV0Y2hlZCByZXN1bHQgd2lsbCBiZVxuICAgICAgLy8gbGltaXRlZCBjb3JyZWN0bHkgYXMgdGhlIHF1ZXJ5IGhhcyBzb3J0IHNwZWNpZmllci5cbiAgICAgIG5ld1Jlc3VsdHMuZm9yRWFjaChmdW5jdGlvbiAoZG9jLCBpZCkge1xuICAgICAgICBzZWxmLl9oYW5kbGVEb2MoaWQsIGRvYyk7XG4gICAgICB9KTtcblxuICAgICAgLy8gU2FuaXR5LWNoZWNrIHRoYXQgZXZlcnl0aGluZyB3ZSB0cmllZCB0byBwdXQgaW50byBfcHVibGlzaGVkIGVuZGVkIHVwXG4gICAgICAvLyB0aGVyZS5cbiAgICAgIC8vIFhYWCBpZiB0aGlzIGlzIHNsb3csIHJlbW92ZSBpdCBsYXRlclxuICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgIT09IG5ld1Jlc3VsdHMuc2l6ZSgpKSB7XG4gICAgICAgIHRocm93IEVycm9yKFxuICAgICAgICAgIFwiVGhlIE1vbmdvIHNlcnZlciBhbmQgdGhlIE1ldGVvciBxdWVyeSBkaXNhZ3JlZSBvbiBob3cgXCIgK1xuICAgICAgICAgICAgXCJtYW55IGRvY3VtZW50cyBtYXRjaCB5b3VyIHF1ZXJ5LiBNYXliZSBpdCBpcyBoaXR0aW5nIGEgTW9uZ28gXCIgK1xuICAgICAgICAgICAgXCJlZGdlIGNhc2U/IFRoZSBxdWVyeSBpczogXCIgK1xuICAgICAgICAgICAgRUpTT04uc3RyaW5naWZ5KHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yKSk7XG4gICAgICB9XG4gICAgICBzZWxmLl9wdWJsaXNoZWQuZm9yRWFjaChmdW5jdGlvbiAoZG9jLCBpZCkge1xuICAgICAgICBpZiAoIW5ld1Jlc3VsdHMuaGFzKGlkKSlcbiAgICAgICAgICB0aHJvdyBFcnJvcihcIl9wdWJsaXNoZWQgaGFzIGEgZG9jIHRoYXQgbmV3UmVzdWx0cyBkb2Vzbid0OyBcIiArIGlkKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBGaW5hbGx5LCByZXBsYWNlIHRoZSBidWZmZXJcbiAgICAgIG5ld0J1ZmZlci5mb3JFYWNoKGZ1bmN0aW9uIChkb2MsIGlkKSB7XG4gICAgICAgIHNlbGYuX2FkZEJ1ZmZlcmVkKGlkLCBkb2MpO1xuICAgICAgfSk7XG5cbiAgICAgIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciA9IG5ld0J1ZmZlci5zaXplKCkgPCBzZWxmLl9saW1pdDtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBUaGlzIHN0b3AgZnVuY3Rpb24gaXMgaW52b2tlZCBmcm9tIHRoZSBvblN0b3Agb2YgdGhlIE9ic2VydmVNdWx0aXBsZXhlciwgc29cbiAgLy8gaXQgc2hvdWxkbid0IGFjdHVhbGx5IGJlIHBvc3NpYmxlIHRvIGNhbGwgaXQgdW50aWwgdGhlIG11bHRpcGxleGVyIGlzXG4gIC8vIHJlYWR5LlxuICAvL1xuICAvLyBJdCdzIGltcG9ydGFudCB0byBjaGVjayBzZWxmLl9zdG9wcGVkIGFmdGVyIGV2ZXJ5IGNhbGwgaW4gdGhpcyBmaWxlIHRoYXRcbiAgLy8gY2FuIHlpZWxkIVxuICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuO1xuICAgIHNlbGYuX3N0b3BwZWQgPSB0cnVlO1xuICAgIF8uZWFjaChzZWxmLl9zdG9wSGFuZGxlcywgZnVuY3Rpb24gKGhhbmRsZSkge1xuICAgICAgaGFuZGxlLnN0b3AoKTtcbiAgICB9KTtcblxuICAgIC8vIE5vdGU6IHdlICpkb24ndCogdXNlIG11bHRpcGxleGVyLm9uRmx1c2ggaGVyZSBiZWNhdXNlIHRoaXMgc3RvcFxuICAgIC8vIGNhbGxiYWNrIGlzIGFjdHVhbGx5IGludm9rZWQgYnkgdGhlIG11bHRpcGxleGVyIGl0c2VsZiB3aGVuIGl0IGhhc1xuICAgIC8vIGRldGVybWluZWQgdGhhdCB0aGVyZSBhcmUgbm8gaGFuZGxlcyBsZWZ0LiBTbyBub3RoaW5nIGlzIGFjdHVhbGx5IGdvaW5nXG4gICAgLy8gdG8gZ2V0IGZsdXNoZWQgKGFuZCBpdCdzIHByb2JhYmx5IG5vdCB2YWxpZCB0byBjYWxsIG1ldGhvZHMgb24gdGhlXG4gICAgLy8gZHlpbmcgbXVsdGlwbGV4ZXIpLlxuICAgIF8uZWFjaChzZWxmLl93cml0ZXNUb0NvbW1pdFdoZW5XZVJlYWNoU3RlYWR5LCBmdW5jdGlvbiAodykge1xuICAgICAgdy5jb21taXR0ZWQoKTsgIC8vIG1heWJlIHlpZWxkcz9cbiAgICB9KTtcbiAgICBzZWxmLl93cml0ZXNUb0NvbW1pdFdoZW5XZVJlYWNoU3RlYWR5ID0gbnVsbDtcblxuICAgIC8vIFByb2FjdGl2ZWx5IGRyb3AgcmVmZXJlbmNlcyB0byBwb3RlbnRpYWxseSBiaWcgdGhpbmdzLlxuICAgIHNlbGYuX3B1Ymxpc2hlZCA9IG51bGw7XG4gICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIgPSBudWxsO1xuICAgIHNlbGYuX25lZWRUb0ZldGNoID0gbnVsbDtcbiAgICBzZWxmLl9jdXJyZW50bHlGZXRjaGluZyA9IG51bGw7XG4gICAgc2VsZi5fb3Bsb2dFbnRyeUhhbmRsZSA9IG51bGw7XG4gICAgc2VsZi5fbGlzdGVuZXJzSGFuZGxlID0gbnVsbDtcblxuICAgIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXSAmJiBQYWNrYWdlWydmYWN0cy1iYXNlJ10uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLWRyaXZlcnMtb3Bsb2dcIiwgLTEpO1xuICB9LFxuXG4gIF9yZWdpc3RlclBoYXNlQ2hhbmdlOiBmdW5jdGlvbiAocGhhc2UpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG5vdyA9IG5ldyBEYXRlO1xuXG4gICAgICBpZiAoc2VsZi5fcGhhc2UpIHtcbiAgICAgICAgdmFyIHRpbWVEaWZmID0gbm93IC0gc2VsZi5fcGhhc2VTdGFydFRpbWU7XG4gICAgICAgIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXSAmJiBQYWNrYWdlWydmYWN0cy1iYXNlJ10uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgICAgICBcIm1vbmdvLWxpdmVkYXRhXCIsIFwidGltZS1zcGVudC1pbi1cIiArIHNlbGYuX3BoYXNlICsgXCItcGhhc2VcIiwgdGltZURpZmYpO1xuICAgICAgfVxuXG4gICAgICBzZWxmLl9waGFzZSA9IHBoYXNlO1xuICAgICAgc2VsZi5fcGhhc2VTdGFydFRpbWUgPSBub3c7XG4gICAgfSk7XG4gIH1cbn0pO1xuXG4vLyBEb2VzIG91ciBvcGxvZyB0YWlsaW5nIGNvZGUgc3VwcG9ydCB0aGlzIGN1cnNvcj8gRm9yIG5vdywgd2UgYXJlIGJlaW5nIHZlcnlcbi8vIGNvbnNlcnZhdGl2ZSBhbmQgYWxsb3dpbmcgb25seSBzaW1wbGUgcXVlcmllcyB3aXRoIHNpbXBsZSBvcHRpb25zLlxuLy8gKFRoaXMgaXMgYSBcInN0YXRpYyBtZXRob2RcIi4pXG5PcGxvZ09ic2VydmVEcml2ZXIuY3Vyc29yU3VwcG9ydGVkID0gZnVuY3Rpb24gKGN1cnNvckRlc2NyaXB0aW9uLCBtYXRjaGVyKSB7XG4gIC8vIEZpcnN0LCBjaGVjayB0aGUgb3B0aW9ucy5cbiAgdmFyIG9wdGlvbnMgPSBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zO1xuXG4gIC8vIERpZCB0aGUgdXNlciBzYXkgbm8gZXhwbGljaXRseT9cbiAgLy8gdW5kZXJzY29yZWQgdmVyc2lvbiBvZiB0aGUgb3B0aW9uIGlzIENPTVBBVCB3aXRoIDEuMlxuICBpZiAob3B0aW9ucy5kaXNhYmxlT3Bsb2cgfHwgb3B0aW9ucy5fZGlzYWJsZU9wbG9nKVxuICAgIHJldHVybiBmYWxzZTtcblxuICAvLyBza2lwIGlzIG5vdCBzdXBwb3J0ZWQ6IHRvIHN1cHBvcnQgaXQgd2Ugd291bGQgbmVlZCB0byBrZWVwIHRyYWNrIG9mIGFsbFxuICAvLyBcInNraXBwZWRcIiBkb2N1bWVudHMgb3IgYXQgbGVhc3QgdGhlaXIgaWRzLlxuICAvLyBsaW1pdCB3L28gYSBzb3J0IHNwZWNpZmllciBpcyBub3Qgc3VwcG9ydGVkOiBjdXJyZW50IGltcGxlbWVudGF0aW9uIG5lZWRzIGFcbiAgLy8gZGV0ZXJtaW5pc3RpYyB3YXkgdG8gb3JkZXIgZG9jdW1lbnRzLlxuICBpZiAob3B0aW9ucy5za2lwIHx8IChvcHRpb25zLmxpbWl0ICYmICFvcHRpb25zLnNvcnQpKSByZXR1cm4gZmFsc2U7XG5cbiAgLy8gSWYgYSBmaWVsZHMgcHJvamVjdGlvbiBvcHRpb24gaXMgZ2l2ZW4gY2hlY2sgaWYgaXQgaXMgc3VwcG9ydGVkIGJ5XG4gIC8vIG1pbmltb25nbyAoc29tZSBvcGVyYXRvcnMgYXJlIG5vdCBzdXBwb3J0ZWQpLlxuICBpZiAob3B0aW9ucy5maWVsZHMpIHtcbiAgICB0cnkge1xuICAgICAgTG9jYWxDb2xsZWN0aW9uLl9jaGVja1N1cHBvcnRlZFByb2plY3Rpb24ob3B0aW9ucy5maWVsZHMpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlLm5hbWUgPT09IFwiTWluaW1vbmdvRXJyb3JcIikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFdlIGRvbid0IGFsbG93IHRoZSBmb2xsb3dpbmcgc2VsZWN0b3JzOlxuICAvLyAgIC0gJHdoZXJlIChub3QgY29uZmlkZW50IHRoYXQgd2UgcHJvdmlkZSB0aGUgc2FtZSBKUyBlbnZpcm9ubWVudFxuICAvLyAgICAgICAgICAgICBhcyBNb25nbywgYW5kIGNhbiB5aWVsZCEpXG4gIC8vICAgLSAkbmVhciAoaGFzIFwiaW50ZXJlc3RpbmdcIiBwcm9wZXJ0aWVzIGluIE1vbmdvREIsIGxpa2UgdGhlIHBvc3NpYmlsaXR5XG4gIC8vICAgICAgICAgICAgb2YgcmV0dXJuaW5nIGFuIElEIG11bHRpcGxlIHRpbWVzLCB0aG91Z2ggZXZlbiBwb2xsaW5nIG1heWJlXG4gIC8vICAgICAgICAgICAgaGF2ZSBhIGJ1ZyB0aGVyZSlcbiAgLy8gICAgICAgICAgIFhYWDogb25jZSB3ZSBzdXBwb3J0IGl0LCB3ZSB3b3VsZCBuZWVkIHRvIHRoaW5rIG1vcmUgb24gaG93IHdlXG4gIC8vICAgICAgICAgICBpbml0aWFsaXplIHRoZSBjb21wYXJhdG9ycyB3aGVuIHdlIGNyZWF0ZSB0aGUgZHJpdmVyLlxuICByZXR1cm4gIW1hdGNoZXIuaGFzV2hlcmUoKSAmJiAhbWF0Y2hlci5oYXNHZW9RdWVyeSgpO1xufTtcblxudmFyIG1vZGlmaWVyQ2FuQmVEaXJlY3RseUFwcGxpZWQgPSBmdW5jdGlvbiAobW9kaWZpZXIpIHtcbiAgcmV0dXJuIF8uYWxsKG1vZGlmaWVyLCBmdW5jdGlvbiAoZmllbGRzLCBvcGVyYXRpb24pIHtcbiAgICByZXR1cm4gXy5hbGwoZmllbGRzLCBmdW5jdGlvbiAodmFsdWUsIGZpZWxkKSB7XG4gICAgICByZXR1cm4gIS9FSlNPTlxcJC8udGVzdChmaWVsZCk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuTW9uZ29JbnRlcm5hbHMuT3Bsb2dPYnNlcnZlRHJpdmVyID0gT3Bsb2dPYnNlcnZlRHJpdmVyO1xuIiwiLy8gc2luZ2xldG9uXG5leHBvcnQgY29uc3QgTG9jYWxDb2xsZWN0aW9uRHJpdmVyID0gbmV3IChjbGFzcyBMb2NhbENvbGxlY3Rpb25Ecml2ZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLm5vQ29ubkNvbGxlY3Rpb25zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgfVxuXG4gIG9wZW4obmFtZSwgY29ubikge1xuICAgIGlmICghIG5hbWUpIHtcbiAgICAgIHJldHVybiBuZXcgTG9jYWxDb2xsZWN0aW9uO1xuICAgIH1cblxuICAgIGlmICghIGNvbm4pIHtcbiAgICAgIHJldHVybiBlbnN1cmVDb2xsZWN0aW9uKG5hbWUsIHRoaXMubm9Db25uQ29sbGVjdGlvbnMpO1xuICAgIH1cblxuICAgIGlmICghIGNvbm4uX21vbmdvX2xpdmVkYXRhX2NvbGxlY3Rpb25zKSB7XG4gICAgICBjb25uLl9tb25nb19saXZlZGF0YV9jb2xsZWN0aW9ucyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgfVxuXG4gICAgLy8gWFhYIGlzIHRoZXJlIGEgd2F5IHRvIGtlZXAgdHJhY2sgb2YgYSBjb25uZWN0aW9uJ3MgY29sbGVjdGlvbnMgd2l0aG91dFxuICAgIC8vIGRhbmdsaW5nIGl0IG9mZiB0aGUgY29ubmVjdGlvbiBvYmplY3Q/XG4gICAgcmV0dXJuIGVuc3VyZUNvbGxlY3Rpb24obmFtZSwgY29ubi5fbW9uZ29fbGl2ZWRhdGFfY29sbGVjdGlvbnMpO1xuICB9XG59KTtcblxuZnVuY3Rpb24gZW5zdXJlQ29sbGVjdGlvbihuYW1lLCBjb2xsZWN0aW9ucykge1xuICByZXR1cm4gKG5hbWUgaW4gY29sbGVjdGlvbnMpXG4gICAgPyBjb2xsZWN0aW9uc1tuYW1lXVxuICAgIDogY29sbGVjdGlvbnNbbmFtZV0gPSBuZXcgTG9jYWxDb2xsZWN0aW9uKG5hbWUpO1xufVxuIiwiTW9uZ29JbnRlcm5hbHMuUmVtb3RlQ29sbGVjdGlvbkRyaXZlciA9IGZ1bmN0aW9uIChcbiAgbW9uZ29fdXJsLCBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5tb25nbyA9IG5ldyBNb25nb0Nvbm5lY3Rpb24obW9uZ29fdXJsLCBvcHRpb25zKTtcbn07XG5cbl8uZXh0ZW5kKE1vbmdvSW50ZXJuYWxzLlJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIucHJvdG90eXBlLCB7XG4gIG9wZW46IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByZXQgPSB7fTtcbiAgICBfLmVhY2goXG4gICAgICBbJ2ZpbmQnLCAnZmluZE9uZScsICdpbnNlcnQnLCAndXBkYXRlJywgJ3Vwc2VydCcsXG4gICAgICAgJ3JlbW92ZScsICdfZW5zdXJlSW5kZXgnLCAnX2Ryb3BJbmRleCcsICdfY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbicsXG4gICAgICAgJ2Ryb3BDb2xsZWN0aW9uJywgJ3Jhd0NvbGxlY3Rpb24nXSxcbiAgICAgIGZ1bmN0aW9uIChtKSB7XG4gICAgICAgIHJldFttXSA9IF8uYmluZChzZWxmLm1vbmdvW21dLCBzZWxmLm1vbmdvLCBuYW1lKTtcbiAgICAgIH0pO1xuICAgIHJldHVybiByZXQ7XG4gIH1cbn0pO1xuXG5cbi8vIENyZWF0ZSB0aGUgc2luZ2xldG9uIFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIgb25seSBvbiBkZW1hbmQsIHNvIHdlXG4vLyBvbmx5IHJlcXVpcmUgTW9uZ28gY29uZmlndXJhdGlvbiBpZiBpdCdzIGFjdHVhbGx5IHVzZWQgKGVnLCBub3QgaWZcbi8vIHlvdSdyZSBvbmx5IHRyeWluZyB0byByZWNlaXZlIGRhdGEgZnJvbSBhIHJlbW90ZSBERFAgc2VydmVyLilcbk1vbmdvSW50ZXJuYWxzLmRlZmF1bHRSZW1vdGVDb2xsZWN0aW9uRHJpdmVyID0gXy5vbmNlKGZ1bmN0aW9uICgpIHtcbiAgdmFyIGNvbm5lY3Rpb25PcHRpb25zID0ge307XG5cbiAgdmFyIG1vbmdvVXJsID0gcHJvY2Vzcy5lbnYuTU9OR09fVVJMO1xuXG4gIGlmIChwcm9jZXNzLmVudi5NT05HT19PUExPR19VUkwpIHtcbiAgICBjb25uZWN0aW9uT3B0aW9ucy5vcGxvZ1VybCA9IHByb2Nlc3MuZW52Lk1PTkdPX09QTE9HX1VSTDtcbiAgfVxuXG4gIGlmICghIG1vbmdvVXJsKVxuICAgIHRocm93IG5ldyBFcnJvcihcIk1PTkdPX1VSTCBtdXN0IGJlIHNldCBpbiBlbnZpcm9ubWVudFwiKTtcblxuICByZXR1cm4gbmV3IE1vbmdvSW50ZXJuYWxzLlJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIobW9uZ29VcmwsIGNvbm5lY3Rpb25PcHRpb25zKTtcbn0pO1xuIiwiLy8gb3B0aW9ucy5jb25uZWN0aW9uLCBpZiBnaXZlbiwgaXMgYSBMaXZlZGF0YUNsaWVudCBvciBMaXZlZGF0YVNlcnZlclxuLy8gWFhYIHByZXNlbnRseSB0aGVyZSBpcyBubyB3YXkgdG8gZGVzdHJveS9jbGVhbiB1cCBhIENvbGxlY3Rpb25cblxuLyoqXG4gKiBAc3VtbWFyeSBOYW1lc3BhY2UgZm9yIE1vbmdvREItcmVsYXRlZCBpdGVtc1xuICogQG5hbWVzcGFjZVxuICovXG5Nb25nbyA9IHt9O1xuXG4vKipcbiAqIEBzdW1tYXJ5IENvbnN0cnVjdG9yIGZvciBhIENvbGxlY3Rpb25cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQGluc3RhbmNlbmFtZSBjb2xsZWN0aW9uXG4gKiBAY2xhc3NcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBjb2xsZWN0aW9uLiAgSWYgbnVsbCwgY3JlYXRlcyBhbiB1bm1hbmFnZWQgKHVuc3luY2hyb25pemVkKSBsb2NhbCBjb2xsZWN0aW9uLlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMuY29ubmVjdGlvbiBUaGUgc2VydmVyIGNvbm5lY3Rpb24gdGhhdCB3aWxsIG1hbmFnZSB0aGlzIGNvbGxlY3Rpb24uIFVzZXMgdGhlIGRlZmF1bHQgY29ubmVjdGlvbiBpZiBub3Qgc3BlY2lmaWVkLiAgUGFzcyB0aGUgcmV0dXJuIHZhbHVlIG9mIGNhbGxpbmcgW2BERFAuY29ubmVjdGBdKCNkZHBfY29ubmVjdCkgdG8gc3BlY2lmeSBhIGRpZmZlcmVudCBzZXJ2ZXIuIFBhc3MgYG51bGxgIHRvIHNwZWNpZnkgbm8gY29ubmVjdGlvbi4gVW5tYW5hZ2VkIChgbmFtZWAgaXMgbnVsbCkgY29sbGVjdGlvbnMgY2Fubm90IHNwZWNpZnkgYSBjb25uZWN0aW9uLlxuICogQHBhcmFtIHtTdHJpbmd9IG9wdGlvbnMuaWRHZW5lcmF0aW9uIFRoZSBtZXRob2Qgb2YgZ2VuZXJhdGluZyB0aGUgYF9pZGAgZmllbGRzIG9mIG5ldyBkb2N1bWVudHMgaW4gdGhpcyBjb2xsZWN0aW9uLiAgUG9zc2libGUgdmFsdWVzOlxuXG4gLSAqKmAnU1RSSU5HJ2AqKjogcmFuZG9tIHN0cmluZ3NcbiAtICoqYCdNT05HTydgKio6ICByYW5kb20gW2BNb25nby5PYmplY3RJRGBdKCNtb25nb19vYmplY3RfaWQpIHZhbHVlc1xuXG5UaGUgZGVmYXVsdCBpZCBnZW5lcmF0aW9uIHRlY2huaXF1ZSBpcyBgJ1NUUklORydgLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gb3B0aW9ucy50cmFuc2Zvcm0gQW4gb3B0aW9uYWwgdHJhbnNmb3JtYXRpb24gZnVuY3Rpb24uIERvY3VtZW50cyB3aWxsIGJlIHBhc3NlZCB0aHJvdWdoIHRoaXMgZnVuY3Rpb24gYmVmb3JlIGJlaW5nIHJldHVybmVkIGZyb20gYGZldGNoYCBvciBgZmluZE9uZWAsIGFuZCBiZWZvcmUgYmVpbmcgcGFzc2VkIHRvIGNhbGxiYWNrcyBvZiBgb2JzZXJ2ZWAsIGBtYXBgLCBgZm9yRWFjaGAsIGBhbGxvd2AsIGFuZCBgZGVueWAuIFRyYW5zZm9ybXMgYXJlICpub3QqIGFwcGxpZWQgZm9yIHRoZSBjYWxsYmFja3Mgb2YgYG9ic2VydmVDaGFuZ2VzYCBvciB0byBjdXJzb3JzIHJldHVybmVkIGZyb20gcHVibGlzaCBmdW5jdGlvbnMuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuZGVmaW5lTXV0YXRpb25NZXRob2RzIFNldCB0byBgZmFsc2VgIHRvIHNraXAgc2V0dGluZyB1cCB0aGUgbXV0YXRpb24gbWV0aG9kcyB0aGF0IGVuYWJsZSBpbnNlcnQvdXBkYXRlL3JlbW92ZSBmcm9tIGNsaWVudCBjb2RlLiBEZWZhdWx0IGB0cnVlYC5cbiAqL1xuTW9uZ28uQ29sbGVjdGlvbiA9IGZ1bmN0aW9uIENvbGxlY3Rpb24obmFtZSwgb3B0aW9ucykge1xuICBpZiAoIW5hbWUgJiYgKG5hbWUgIT09IG51bGwpKSB7XG4gICAgTWV0ZW9yLl9kZWJ1ZyhcIldhcm5pbmc6IGNyZWF0aW5nIGFub255bW91cyBjb2xsZWN0aW9uLiBJdCB3aWxsIG5vdCBiZSBcIiArXG4gICAgICAgICAgICAgICAgICBcInNhdmVkIG9yIHN5bmNocm9uaXplZCBvdmVyIHRoZSBuZXR3b3JrLiAoUGFzcyBudWxsIGZvciBcIiArXG4gICAgICAgICAgICAgICAgICBcInRoZSBjb2xsZWN0aW9uIG5hbWUgdG8gdHVybiBvZmYgdGhpcyB3YXJuaW5nLilcIik7XG4gICAgbmFtZSA9IG51bGw7XG4gIH1cblxuICBpZiAobmFtZSAhPT0gbnVsbCAmJiB0eXBlb2YgbmFtZSAhPT0gXCJzdHJpbmdcIikge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIFwiRmlyc3QgYXJndW1lbnQgdG8gbmV3IE1vbmdvLkNvbGxlY3Rpb24gbXVzdCBiZSBhIHN0cmluZyBvciBudWxsXCIpO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5tZXRob2RzKSB7XG4gICAgLy8gQmFja3dhcmRzIGNvbXBhdGliaWxpdHkgaGFjayB3aXRoIG9yaWdpbmFsIHNpZ25hdHVyZSAod2hpY2ggcGFzc2VkXG4gICAgLy8gXCJjb25uZWN0aW9uXCIgZGlyZWN0bHkgaW5zdGVhZCBvZiBpbiBvcHRpb25zLiAoQ29ubmVjdGlvbnMgbXVzdCBoYXZlIGEgXCJtZXRob2RzXCJcbiAgICAvLyBtZXRob2QuKVxuICAgIC8vIFhYWCByZW1vdmUgYmVmb3JlIDEuMFxuICAgIG9wdGlvbnMgPSB7Y29ubmVjdGlvbjogb3B0aW9uc307XG4gIH1cbiAgLy8gQmFja3dhcmRzIGNvbXBhdGliaWxpdHk6IFwiY29ubmVjdGlvblwiIHVzZWQgdG8gYmUgY2FsbGVkIFwibWFuYWdlclwiLlxuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLm1hbmFnZXIgJiYgIW9wdGlvbnMuY29ubmVjdGlvbikge1xuICAgIG9wdGlvbnMuY29ubmVjdGlvbiA9IG9wdGlvbnMubWFuYWdlcjtcbiAgfVxuXG4gIG9wdGlvbnMgPSB7XG4gICAgY29ubmVjdGlvbjogdW5kZWZpbmVkLFxuICAgIGlkR2VuZXJhdGlvbjogJ1NUUklORycsXG4gICAgdHJhbnNmb3JtOiBudWxsLFxuICAgIF9kcml2ZXI6IHVuZGVmaW5lZCxcbiAgICBfcHJldmVudEF1dG9wdWJsaXNoOiBmYWxzZSxcbiAgICAgIC4uLm9wdGlvbnMsXG4gIH07XG5cbiAgc3dpdGNoIChvcHRpb25zLmlkR2VuZXJhdGlvbikge1xuICBjYXNlICdNT05HTyc6XG4gICAgdGhpcy5fbWFrZU5ld0lEID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHNyYyA9IG5hbWUgPyBERFAucmFuZG9tU3RyZWFtKCcvY29sbGVjdGlvbi8nICsgbmFtZSkgOiBSYW5kb20uaW5zZWN1cmU7XG4gICAgICByZXR1cm4gbmV3IE1vbmdvLk9iamVjdElEKHNyYy5oZXhTdHJpbmcoMjQpKTtcbiAgICB9O1xuICAgIGJyZWFrO1xuICBjYXNlICdTVFJJTkcnOlxuICBkZWZhdWx0OlxuICAgIHRoaXMuX21ha2VOZXdJRCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBzcmMgPSBuYW1lID8gRERQLnJhbmRvbVN0cmVhbSgnL2NvbGxlY3Rpb24vJyArIG5hbWUpIDogUmFuZG9tLmluc2VjdXJlO1xuICAgICAgcmV0dXJuIHNyYy5pZCgpO1xuICAgIH07XG4gICAgYnJlYWs7XG4gIH1cblxuICB0aGlzLl90cmFuc2Zvcm0gPSBMb2NhbENvbGxlY3Rpb24ud3JhcFRyYW5zZm9ybShvcHRpb25zLnRyYW5zZm9ybSk7XG5cbiAgaWYgKCEgbmFtZSB8fCBvcHRpb25zLmNvbm5lY3Rpb24gPT09IG51bGwpXG4gICAgLy8gbm90ZTogbmFtZWxlc3MgY29sbGVjdGlvbnMgbmV2ZXIgaGF2ZSBhIGNvbm5lY3Rpb25cbiAgICB0aGlzLl9jb25uZWN0aW9uID0gbnVsbDtcbiAgZWxzZSBpZiAob3B0aW9ucy5jb25uZWN0aW9uKVxuICAgIHRoaXMuX2Nvbm5lY3Rpb24gPSBvcHRpb25zLmNvbm5lY3Rpb247XG4gIGVsc2UgaWYgKE1ldGVvci5pc0NsaWVudClcbiAgICB0aGlzLl9jb25uZWN0aW9uID0gTWV0ZW9yLmNvbm5lY3Rpb247XG4gIGVsc2VcbiAgICB0aGlzLl9jb25uZWN0aW9uID0gTWV0ZW9yLnNlcnZlcjtcblxuICBpZiAoIW9wdGlvbnMuX2RyaXZlcikge1xuICAgIC8vIFhYWCBUaGlzIGNoZWNrIGFzc3VtZXMgdGhhdCB3ZWJhcHAgaXMgbG9hZGVkIHNvIHRoYXQgTWV0ZW9yLnNlcnZlciAhPT1cbiAgICAvLyBudWxsLiBXZSBzaG91bGQgZnVsbHkgc3VwcG9ydCB0aGUgY2FzZSBvZiBcIndhbnQgdG8gdXNlIGEgTW9uZ28tYmFja2VkXG4gICAgLy8gY29sbGVjdGlvbiBmcm9tIE5vZGUgY29kZSB3aXRob3V0IHdlYmFwcFwiLCBidXQgd2UgZG9uJ3QgeWV0LlxuICAgIC8vICNNZXRlb3JTZXJ2ZXJOdWxsXG4gICAgaWYgKG5hbWUgJiYgdGhpcy5fY29ubmVjdGlvbiA9PT0gTWV0ZW9yLnNlcnZlciAmJlxuICAgICAgICB0eXBlb2YgTW9uZ29JbnRlcm5hbHMgIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICAgICAgTW9uZ29JbnRlcm5hbHMuZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIpIHtcbiAgICAgIG9wdGlvbnMuX2RyaXZlciA9IE1vbmdvSW50ZXJuYWxzLmRlZmF1bHRSZW1vdGVDb2xsZWN0aW9uRHJpdmVyKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHsgTG9jYWxDb2xsZWN0aW9uRHJpdmVyIH0gPVxuICAgICAgICByZXF1aXJlKFwiLi9sb2NhbF9jb2xsZWN0aW9uX2RyaXZlci5qc1wiKTtcbiAgICAgIG9wdGlvbnMuX2RyaXZlciA9IExvY2FsQ29sbGVjdGlvbkRyaXZlcjtcbiAgICB9XG4gIH1cblxuICB0aGlzLl9jb2xsZWN0aW9uID0gb3B0aW9ucy5fZHJpdmVyLm9wZW4obmFtZSwgdGhpcy5fY29ubmVjdGlvbik7XG4gIHRoaXMuX25hbWUgPSBuYW1lO1xuICB0aGlzLl9kcml2ZXIgPSBvcHRpb25zLl9kcml2ZXI7XG5cbiAgdGhpcy5fbWF5YmVTZXRVcFJlcGxpY2F0aW9uKG5hbWUsIG9wdGlvbnMpO1xuXG4gIC8vIFhYWCBkb24ndCBkZWZpbmUgdGhlc2UgdW50aWwgYWxsb3cgb3IgZGVueSBpcyBhY3R1YWxseSB1c2VkIGZvciB0aGlzXG4gIC8vIGNvbGxlY3Rpb24uIENvdWxkIGJlIGhhcmQgaWYgdGhlIHNlY3VyaXR5IHJ1bGVzIGFyZSBvbmx5IGRlZmluZWQgb24gdGhlXG4gIC8vIHNlcnZlci5cbiAgaWYgKG9wdGlvbnMuZGVmaW5lTXV0YXRpb25NZXRob2RzICE9PSBmYWxzZSkge1xuICAgIHRyeSB7XG4gICAgICB0aGlzLl9kZWZpbmVNdXRhdGlvbk1ldGhvZHMoe1xuICAgICAgICB1c2VFeGlzdGluZzogb3B0aW9ucy5fc3VwcHJlc3NTYW1lTmFtZUVycm9yID09PSB0cnVlXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gVGhyb3cgYSBtb3JlIHVuZGVyc3RhbmRhYmxlIGVycm9yIG9uIHRoZSBzZXJ2ZXIgZm9yIHNhbWUgY29sbGVjdGlvbiBuYW1lXG4gICAgICBpZiAoZXJyb3IubWVzc2FnZSA9PT0gYEEgbWV0aG9kIG5hbWVkICcvJHtuYW1lfS9pbnNlcnQnIGlzIGFscmVhZHkgZGVmaW5lZGApXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlcmUgaXMgYWxyZWFkeSBhIGNvbGxlY3Rpb24gbmFtZWQgXCIke25hbWV9XCJgKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIC8vIGF1dG9wdWJsaXNoXG4gIGlmIChQYWNrYWdlLmF1dG9wdWJsaXNoICYmXG4gICAgICAhIG9wdGlvbnMuX3ByZXZlbnRBdXRvcHVibGlzaCAmJlxuICAgICAgdGhpcy5fY29ubmVjdGlvbiAmJlxuICAgICAgdGhpcy5fY29ubmVjdGlvbi5wdWJsaXNoKSB7XG4gICAgdGhpcy5fY29ubmVjdGlvbi5wdWJsaXNoKG51bGwsICgpID0+IHRoaXMuZmluZCgpLCB7XG4gICAgICBpc19hdXRvOiB0cnVlLFxuICAgIH0pO1xuICB9XG59O1xuXG5PYmplY3QuYXNzaWduKE1vbmdvLkNvbGxlY3Rpb24ucHJvdG90eXBlLCB7XG4gIF9tYXliZVNldFVwUmVwbGljYXRpb24obmFtZSwge1xuICAgIF9zdXBwcmVzc1NhbWVOYW1lRXJyb3IgPSBmYWxzZVxuICB9KSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCEgKHNlbGYuX2Nvbm5lY3Rpb24gJiZcbiAgICAgICAgICAgc2VsZi5fY29ubmVjdGlvbi5yZWdpc3RlclN0b3JlKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIE9LLCB3ZSdyZSBnb2luZyB0byBiZSBhIHNsYXZlLCByZXBsaWNhdGluZyBzb21lIHJlbW90ZVxuICAgIC8vIGRhdGFiYXNlLCBleGNlcHQgcG9zc2libHkgd2l0aCBzb21lIHRlbXBvcmFyeSBkaXZlcmdlbmNlIHdoaWxlXG4gICAgLy8gd2UgaGF2ZSB1bmFja25vd2xlZGdlZCBSUEMncy5cbiAgICBjb25zdCBvayA9IHNlbGYuX2Nvbm5lY3Rpb24ucmVnaXN0ZXJTdG9yZShuYW1lLCB7XG4gICAgICAvLyBDYWxsZWQgYXQgdGhlIGJlZ2lubmluZyBvZiBhIGJhdGNoIG9mIHVwZGF0ZXMuIGJhdGNoU2l6ZSBpcyB0aGUgbnVtYmVyXG4gICAgICAvLyBvZiB1cGRhdGUgY2FsbHMgdG8gZXhwZWN0LlxuICAgICAgLy9cbiAgICAgIC8vIFhYWCBUaGlzIGludGVyZmFjZSBpcyBwcmV0dHkgamFua3kuIHJlc2V0IHByb2JhYmx5IG91Z2h0IHRvIGdvIGJhY2sgdG9cbiAgICAgIC8vIGJlaW5nIGl0cyBvd24gZnVuY3Rpb24sIGFuZCBjYWxsZXJzIHNob3VsZG4ndCBoYXZlIHRvIGNhbGN1bGF0ZVxuICAgICAgLy8gYmF0Y2hTaXplLiBUaGUgb3B0aW1pemF0aW9uIG9mIG5vdCBjYWxsaW5nIHBhdXNlL3JlbW92ZSBzaG91bGQgYmVcbiAgICAgIC8vIGRlbGF5ZWQgdW50aWwgbGF0ZXI6IHRoZSBmaXJzdCBjYWxsIHRvIHVwZGF0ZSgpIHNob3VsZCBidWZmZXIgaXRzXG4gICAgICAvLyBtZXNzYWdlLCBhbmQgdGhlbiB3ZSBjYW4gZWl0aGVyIGRpcmVjdGx5IGFwcGx5IGl0IGF0IGVuZFVwZGF0ZSB0aW1lIGlmXG4gICAgICAvLyBpdCB3YXMgdGhlIG9ubHkgdXBkYXRlLCBvciBkbyBwYXVzZU9ic2VydmVycy9hcHBseS9hcHBseSBhdCB0aGUgbmV4dFxuICAgICAgLy8gdXBkYXRlKCkgaWYgdGhlcmUncyBhbm90aGVyIG9uZS5cbiAgICAgIGJlZ2luVXBkYXRlKGJhdGNoU2l6ZSwgcmVzZXQpIHtcbiAgICAgICAgLy8gcGF1c2Ugb2JzZXJ2ZXJzIHNvIHVzZXJzIGRvbid0IHNlZSBmbGlja2VyIHdoZW4gdXBkYXRpbmcgc2V2ZXJhbFxuICAgICAgICAvLyBvYmplY3RzIGF0IG9uY2UgKGluY2x1ZGluZyB0aGUgcG9zdC1yZWNvbm5lY3QgcmVzZXQtYW5kLXJlYXBwbHlcbiAgICAgICAgLy8gc3RhZ2UpLCBhbmQgc28gdGhhdCBhIHJlLXNvcnRpbmcgb2YgYSBxdWVyeSBjYW4gdGFrZSBhZHZhbnRhZ2Ugb2YgdGhlXG4gICAgICAgIC8vIGZ1bGwgX2RpZmZRdWVyeSBtb3ZlZCBjYWxjdWxhdGlvbiBpbnN0ZWFkIG9mIGFwcGx5aW5nIGNoYW5nZSBvbmUgYXQgYVxuICAgICAgICAvLyB0aW1lLlxuICAgICAgICBpZiAoYmF0Y2hTaXplID4gMSB8fCByZXNldClcbiAgICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLnBhdXNlT2JzZXJ2ZXJzKCk7XG5cbiAgICAgICAgaWYgKHJlc2V0KVxuICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24ucmVtb3ZlKHt9KTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIEFwcGx5IGFuIHVwZGF0ZS5cbiAgICAgIC8vIFhYWCBiZXR0ZXIgc3BlY2lmeSB0aGlzIGludGVyZmFjZSAobm90IGluIHRlcm1zIG9mIGEgd2lyZSBtZXNzYWdlKT9cbiAgICAgIHVwZGF0ZShtc2cpIHtcbiAgICAgICAgdmFyIG1vbmdvSWQgPSBNb25nb0lELmlkUGFyc2UobXNnLmlkKTtcbiAgICAgICAgdmFyIGRvYyA9IHNlbGYuX2NvbGxlY3Rpb24uZmluZE9uZShtb25nb0lkKTtcblxuICAgICAgICAvLyBJcyB0aGlzIGEgXCJyZXBsYWNlIHRoZSB3aG9sZSBkb2NcIiBtZXNzYWdlIGNvbWluZyBmcm9tIHRoZSBxdWllc2NlbmNlXG4gICAgICAgIC8vIG9mIG1ldGhvZCB3cml0ZXMgdG8gYW4gb2JqZWN0PyAoTm90ZSB0aGF0ICd1bmRlZmluZWQnIGlzIGEgdmFsaWRcbiAgICAgICAgLy8gdmFsdWUgbWVhbmluZyBcInJlbW92ZSBpdFwiLilcbiAgICAgICAgaWYgKG1zZy5tc2cgPT09ICdyZXBsYWNlJykge1xuICAgICAgICAgIHZhciByZXBsYWNlID0gbXNnLnJlcGxhY2U7XG4gICAgICAgICAgaWYgKCFyZXBsYWNlKSB7XG4gICAgICAgICAgICBpZiAoZG9jKVxuICAgICAgICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLnJlbW92ZShtb25nb0lkKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCFkb2MpIHtcbiAgICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24uaW5zZXJ0KHJlcGxhY2UpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBYWFggY2hlY2sgdGhhdCByZXBsYWNlIGhhcyBubyAkIG9wc1xuICAgICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi51cGRhdGUobW9uZ29JZCwgcmVwbGFjZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIGlmIChtc2cubXNnID09PSAnYWRkZWQnKSB7XG4gICAgICAgICAgaWYgKGRvYykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgbm90IHRvIGZpbmQgYSBkb2N1bWVudCBhbHJlYWR5IHByZXNlbnQgZm9yIGFuIGFkZFwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5pbnNlcnQoeyBfaWQ6IG1vbmdvSWQsIC4uLm1zZy5maWVsZHMgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAobXNnLm1zZyA9PT0gJ3JlbW92ZWQnKSB7XG4gICAgICAgICAgaWYgKCFkb2MpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RlZCB0byBmaW5kIGEgZG9jdW1lbnQgYWxyZWFkeSBwcmVzZW50IGZvciByZW1vdmVkXCIpO1xuICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24ucmVtb3ZlKG1vbmdvSWQpO1xuICAgICAgICB9IGVsc2UgaWYgKG1zZy5tc2cgPT09ICdjaGFuZ2VkJykge1xuICAgICAgICAgIGlmICghZG9jKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgdG8gZmluZCBhIGRvY3VtZW50IHRvIGNoYW5nZVwiKTtcbiAgICAgICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMobXNnLmZpZWxkcyk7XG4gICAgICAgICAgaWYgKGtleXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdmFyIG1vZGlmaWVyID0ge307XG4gICAgICAgICAgICBrZXlzLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBtc2cuZmllbGRzW2tleV07XG4gICAgICAgICAgICAgIGlmIChFSlNPTi5lcXVhbHMoZG9jW2tleV0sIHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtb2RpZmllci4kdW5zZXQpIHtcbiAgICAgICAgICAgICAgICAgIG1vZGlmaWVyLiR1bnNldCA9IHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtb2RpZmllci4kdW5zZXRba2V5XSA9IDE7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtb2RpZmllci4kc2V0KSB7XG4gICAgICAgICAgICAgICAgICBtb2RpZmllci4kc2V0ID0ge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1vZGlmaWVyLiRzZXRba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChPYmplY3Qua2V5cyhtb2RpZmllcikubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLnVwZGF0ZShtb25nb0lkLCBtb2RpZmllcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkkgZG9uJ3Qga25vdyBob3cgdG8gZGVhbCB3aXRoIHRoaXMgbWVzc2FnZVwiKTtcbiAgICAgICAgfVxuICAgICAgfSxcblxuICAgICAgLy8gQ2FsbGVkIGF0IHRoZSBlbmQgb2YgYSBiYXRjaCBvZiB1cGRhdGVzLlxuICAgICAgZW5kVXBkYXRlKCkge1xuICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLnJlc3VtZU9ic2VydmVycygpO1xuICAgICAgfSxcblxuICAgICAgLy8gQ2FsbGVkIGFyb3VuZCBtZXRob2Qgc3R1YiBpbnZvY2F0aW9ucyB0byBjYXB0dXJlIHRoZSBvcmlnaW5hbCB2ZXJzaW9uc1xuICAgICAgLy8gb2YgbW9kaWZpZWQgZG9jdW1lbnRzLlxuICAgICAgc2F2ZU9yaWdpbmFscygpIHtcbiAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5zYXZlT3JpZ2luYWxzKCk7XG4gICAgICB9LFxuICAgICAgcmV0cmlldmVPcmlnaW5hbHMoKSB7XG4gICAgICAgIHJldHVybiBzZWxmLl9jb2xsZWN0aW9uLnJldHJpZXZlT3JpZ2luYWxzKCk7XG4gICAgICB9LFxuXG4gICAgICAvLyBVc2VkIHRvIHByZXNlcnZlIGN1cnJlbnQgdmVyc2lvbnMgb2YgZG9jdW1lbnRzIGFjcm9zcyBhIHN0b3JlIHJlc2V0LlxuICAgICAgZ2V0RG9jKGlkKSB7XG4gICAgICAgIHJldHVybiBzZWxmLmZpbmRPbmUoaWQpO1xuICAgICAgfSxcblxuICAgICAgLy8gVG8gYmUgYWJsZSB0byBnZXQgYmFjayB0byB0aGUgY29sbGVjdGlvbiBmcm9tIHRoZSBzdG9yZS5cbiAgICAgIF9nZXRDb2xsZWN0aW9uKCkge1xuICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICghIG9rKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gYFRoZXJlIGlzIGFscmVhZHkgYSBjb2xsZWN0aW9uIG5hbWVkIFwiJHtuYW1lfVwiYDtcbiAgICAgIGlmIChfc3VwcHJlc3NTYW1lTmFtZUVycm9yID09PSB0cnVlKSB7XG4gICAgICAgIC8vIFhYWCBJbiB0aGVvcnkgd2UgZG8gbm90IGhhdmUgdG8gdGhyb3cgd2hlbiBgb2tgIGlzIGZhbHN5LiBUaGVcbiAgICAgICAgLy8gc3RvcmUgaXMgYWxyZWFkeSBkZWZpbmVkIGZvciB0aGlzIGNvbGxlY3Rpb24gbmFtZSwgYnV0IHRoaXNcbiAgICAgICAgLy8gd2lsbCBzaW1wbHkgYmUgYW5vdGhlciByZWZlcmVuY2UgdG8gaXQgYW5kIGV2ZXJ5dGhpbmcgc2hvdWxkXG4gICAgICAgIC8vIHdvcmsuIEhvd2V2ZXIsIHdlIGhhdmUgaGlzdG9yaWNhbGx5IHRocm93biBhbiBlcnJvciBoZXJlLCBzb1xuICAgICAgICAvLyBmb3Igbm93IHdlIHdpbGwgc2tpcCB0aGUgZXJyb3Igb25seSB3aGVuIF9zdXBwcmVzc1NhbWVOYW1lRXJyb3JcbiAgICAgICAgLy8gaXMgYHRydWVgLCBhbGxvd2luZyBwZW9wbGUgdG8gb3B0IGluIGFuZCBnaXZlIHRoaXMgc29tZSByZWFsXG4gICAgICAgIC8vIHdvcmxkIHRlc3RpbmcuXG4gICAgICAgIGNvbnNvbGUud2FybiA/IGNvbnNvbGUud2FybihtZXNzYWdlKSA6IGNvbnNvbGUubG9nKG1lc3NhZ2UpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvLy9cbiAgLy8vIE1haW4gY29sbGVjdGlvbiBBUElcbiAgLy8vXG5cbiAgX2dldEZpbmRTZWxlY3RvcihhcmdzKSB7XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09IDApXG4gICAgICByZXR1cm4ge307XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIGFyZ3NbMF07XG4gIH0sXG5cbiAgX2dldEZpbmRPcHRpb25zKGFyZ3MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKGFyZ3MubGVuZ3RoIDwgMikge1xuICAgICAgcmV0dXJuIHsgdHJhbnNmb3JtOiBzZWxmLl90cmFuc2Zvcm0gfTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2hlY2soYXJnc1sxXSwgTWF0Y2guT3B0aW9uYWwoTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHtcbiAgICAgICAgZmllbGRzOiBNYXRjaC5PcHRpb25hbChNYXRjaC5PbmVPZihPYmplY3QsIHVuZGVmaW5lZCkpLFxuICAgICAgICBzb3J0OiBNYXRjaC5PcHRpb25hbChNYXRjaC5PbmVPZihPYmplY3QsIEFycmF5LCBGdW5jdGlvbiwgdW5kZWZpbmVkKSksXG4gICAgICAgIGxpbWl0OiBNYXRjaC5PcHRpb25hbChNYXRjaC5PbmVPZihOdW1iZXIsIHVuZGVmaW5lZCkpLFxuICAgICAgICBza2lwOiBNYXRjaC5PcHRpb25hbChNYXRjaC5PbmVPZihOdW1iZXIsIHVuZGVmaW5lZCkpXG4gICAgICB9KSkpO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0cmFuc2Zvcm06IHNlbGYuX3RyYW5zZm9ybSxcbiAgICAgICAgLi4uYXJnc1sxXSxcbiAgICAgIH07XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBGaW5kIHRoZSBkb2N1bWVudHMgaW4gYSBjb2xsZWN0aW9uIHRoYXQgbWF0Y2ggdGhlIHNlbGVjdG9yLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCBmaW5kXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IFtzZWxlY3Rvcl0gQSBxdWVyeSBkZXNjcmliaW5nIHRoZSBkb2N1bWVudHMgdG8gZmluZFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gICAqIEBwYXJhbSB7TW9uZ29Tb3J0U3BlY2lmaWVyfSBvcHRpb25zLnNvcnQgU29ydCBvcmRlciAoZGVmYXVsdDogbmF0dXJhbCBvcmRlcilcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMuc2tpcCBOdW1iZXIgb2YgcmVzdWx0cyB0byBza2lwIGF0IHRoZSBiZWdpbm5pbmdcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMubGltaXQgTWF4aW11bSBudW1iZXIgb2YgcmVzdWx0cyB0byByZXR1cm5cbiAgICogQHBhcmFtIHtNb25nb0ZpZWxkU3BlY2lmaWVyfSBvcHRpb25zLmZpZWxkcyBEaWN0aW9uYXJ5IG9mIGZpZWxkcyB0byByZXR1cm4gb3IgZXhjbHVkZS5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnJlYWN0aXZlIChDbGllbnQgb25seSkgRGVmYXVsdCBgdHJ1ZWA7IHBhc3MgYGZhbHNlYCB0byBkaXNhYmxlIHJlYWN0aXZpdHlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gb3B0aW9ucy50cmFuc2Zvcm0gT3ZlcnJpZGVzIGB0cmFuc2Zvcm1gIG9uIHRoZSAgW2BDb2xsZWN0aW9uYF0oI2NvbGxlY3Rpb25zKSBmb3IgdGhpcyBjdXJzb3IuICBQYXNzIGBudWxsYCB0byBkaXNhYmxlIHRyYW5zZm9ybWF0aW9uLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMuZGlzYWJsZU9wbG9nIChTZXJ2ZXIgb25seSkgUGFzcyB0cnVlIHRvIGRpc2FibGUgb3Bsb2ctdGFpbGluZyBvbiB0aGlzIHF1ZXJ5LiBUaGlzIGFmZmVjdHMgdGhlIHdheSBzZXJ2ZXIgcHJvY2Vzc2VzIGNhbGxzIHRvIGBvYnNlcnZlYCBvbiB0aGlzIHF1ZXJ5LiBEaXNhYmxpbmcgdGhlIG9wbG9nIGNhbiBiZSB1c2VmdWwgd2hlbiB3b3JraW5nIHdpdGggZGF0YSB0aGF0IHVwZGF0ZXMgaW4gbGFyZ2UgYmF0Y2hlcy5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMucG9sbGluZ0ludGVydmFsTXMgKFNlcnZlciBvbmx5KSBXaGVuIG9wbG9nIGlzIGRpc2FibGVkICh0aHJvdWdoIHRoZSB1c2Ugb2YgYGRpc2FibGVPcGxvZ2Agb3Igd2hlbiBvdGhlcndpc2Ugbm90IGF2YWlsYWJsZSksIHRoZSBmcmVxdWVuY3kgKGluIG1pbGxpc2Vjb25kcykgb2YgaG93IG9mdGVuIHRvIHBvbGwgdGhpcyBxdWVyeSB3aGVuIG9ic2VydmluZyBvbiB0aGUgc2VydmVyLiBEZWZhdWx0cyB0byAxMDAwMG1zICgxMCBzZWNvbmRzKS5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMucG9sbGluZ1Rocm90dGxlTXMgKFNlcnZlciBvbmx5KSBXaGVuIG9wbG9nIGlzIGRpc2FibGVkICh0aHJvdWdoIHRoZSB1c2Ugb2YgYGRpc2FibGVPcGxvZ2Agb3Igd2hlbiBvdGhlcndpc2Ugbm90IGF2YWlsYWJsZSksIHRoZSBtaW5pbXVtIHRpbWUgKGluIG1pbGxpc2Vjb25kcykgdG8gYWxsb3cgYmV0d2VlbiByZS1wb2xsaW5nIHdoZW4gb2JzZXJ2aW5nIG9uIHRoZSBzZXJ2ZXIuIEluY3JlYXNpbmcgdGhpcyB3aWxsIHNhdmUgQ1BVIGFuZCBtb25nbyBsb2FkIGF0IHRoZSBleHBlbnNlIG9mIHNsb3dlciB1cGRhdGVzIHRvIHVzZXJzLiBEZWNyZWFzaW5nIHRoaXMgaXMgbm90IHJlY29tbWVuZGVkLiBEZWZhdWx0cyB0byA1MG1zLlxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0aW9ucy5tYXhUaW1lTXMgKFNlcnZlciBvbmx5KSBJZiBzZXQsIGluc3RydWN0cyBNb25nb0RCIHRvIHNldCBhIHRpbWUgbGltaXQgZm9yIHRoaXMgY3Vyc29yJ3Mgb3BlcmF0aW9ucy4gSWYgdGhlIG9wZXJhdGlvbiByZWFjaGVzIHRoZSBzcGVjaWZpZWQgdGltZSBsaW1pdCAoaW4gbWlsbGlzZWNvbmRzKSB3aXRob3V0IHRoZSBoYXZpbmcgYmVlbiBjb21wbGV0ZWQsIGFuIGV4Y2VwdGlvbiB3aWxsIGJlIHRocm93bi4gVXNlZnVsIHRvIHByZXZlbnQgYW4gKGFjY2lkZW50YWwgb3IgbWFsaWNpb3VzKSB1bm9wdGltaXplZCBxdWVyeSBmcm9tIGNhdXNpbmcgYSBmdWxsIGNvbGxlY3Rpb24gc2NhbiB0aGF0IHdvdWxkIGRpc3J1cHQgb3RoZXIgZGF0YWJhc2UgdXNlcnMsIGF0IHRoZSBleHBlbnNlIG9mIG5lZWRpbmcgdG8gaGFuZGxlIHRoZSByZXN1bHRpbmcgZXJyb3IuXG4gICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gb3B0aW9ucy5oaW50IChTZXJ2ZXIgb25seSkgT3ZlcnJpZGVzIE1vbmdvREIncyBkZWZhdWx0IGluZGV4IHNlbGVjdGlvbiBhbmQgcXVlcnkgb3B0aW1pemF0aW9uIHByb2Nlc3MuIFNwZWNpZnkgYW4gaW5kZXggdG8gZm9yY2UgaXRzIHVzZSwgZWl0aGVyIGJ5IGl0cyBuYW1lIG9yIGluZGV4IHNwZWNpZmljYXRpb24uIFlvdSBjYW4gYWxzbyBzcGVjaWZ5IGB7ICRuYXR1cmFsIDogMSB9YCB0byBmb3JjZSBhIGZvcndhcmRzIGNvbGxlY3Rpb24gc2Nhbiwgb3IgYHsgJG5hdHVyYWwgOiAtMSB9YCBmb3IgYSByZXZlcnNlIGNvbGxlY3Rpb24gc2Nhbi4gU2V0dGluZyB0aGlzIGlzIG9ubHkgcmVjb21tZW5kZWQgZm9yIGFkdmFuY2VkIHVzZXJzLlxuICAgKiBAcmV0dXJucyB7TW9uZ28uQ3Vyc29yfVxuICAgKi9cbiAgZmluZCguLi5hcmdzKSB7XG4gICAgLy8gQ29sbGVjdGlvbi5maW5kKCkgKHJldHVybiBhbGwgZG9jcykgYmVoYXZlcyBkaWZmZXJlbnRseVxuICAgIC8vIGZyb20gQ29sbGVjdGlvbi5maW5kKHVuZGVmaW5lZCkgKHJldHVybiAwIGRvY3MpLiAgc28gYmVcbiAgICAvLyBjYXJlZnVsIGFib3V0IHRoZSBsZW5ndGggb2YgYXJndW1lbnRzLlxuICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9uLmZpbmQoXG4gICAgICB0aGlzLl9nZXRGaW5kU2VsZWN0b3IoYXJncyksXG4gICAgICB0aGlzLl9nZXRGaW5kT3B0aW9ucyhhcmdzKVxuICAgICk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEZpbmRzIHRoZSBmaXJzdCBkb2N1bWVudCB0aGF0IG1hdGNoZXMgdGhlIHNlbGVjdG9yLCBhcyBvcmRlcmVkIGJ5IHNvcnQgYW5kIHNraXAgb3B0aW9ucy4gUmV0dXJucyBgdW5kZWZpbmVkYCBpZiBubyBtYXRjaGluZyBkb2N1bWVudCBpcyBmb3VuZC5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgZmluZE9uZVxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtNb25nb1NlbGVjdG9yfSBbc2VsZWN0b3JdIEEgcXVlcnkgZGVzY3JpYmluZyB0aGUgZG9jdW1lbnRzIHRvIGZpbmRcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICAgKiBAcGFyYW0ge01vbmdvU29ydFNwZWNpZmllcn0gb3B0aW9ucy5zb3J0IFNvcnQgb3JkZXIgKGRlZmF1bHQ6IG5hdHVyYWwgb3JkZXIpXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLnNraXAgTnVtYmVyIG9mIHJlc3VsdHMgdG8gc2tpcCBhdCB0aGUgYmVnaW5uaW5nXG4gICAqIEBwYXJhbSB7TW9uZ29GaWVsZFNwZWNpZmllcn0gb3B0aW9ucy5maWVsZHMgRGljdGlvbmFyeSBvZiBmaWVsZHMgdG8gcmV0dXJuIG9yIGV4Y2x1ZGUuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5yZWFjdGl2ZSAoQ2xpZW50IG9ubHkpIERlZmF1bHQgdHJ1ZTsgcGFzcyBmYWxzZSB0byBkaXNhYmxlIHJlYWN0aXZpdHlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gb3B0aW9ucy50cmFuc2Zvcm0gT3ZlcnJpZGVzIGB0cmFuc2Zvcm1gIG9uIHRoZSBbYENvbGxlY3Rpb25gXSgjY29sbGVjdGlvbnMpIGZvciB0aGlzIGN1cnNvci4gIFBhc3MgYG51bGxgIHRvIGRpc2FibGUgdHJhbnNmb3JtYXRpb24uXG4gICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAqL1xuICBmaW5kT25lKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5fY29sbGVjdGlvbi5maW5kT25lKFxuICAgICAgdGhpcy5fZ2V0RmluZFNlbGVjdG9yKGFyZ3MpLFxuICAgICAgdGhpcy5fZ2V0RmluZE9wdGlvbnMoYXJncylcbiAgICApO1xuICB9XG59KTtcblxuT2JqZWN0LmFzc2lnbihNb25nby5Db2xsZWN0aW9uLCB7XG4gIF9wdWJsaXNoQ3Vyc29yKGN1cnNvciwgc3ViLCBjb2xsZWN0aW9uKSB7XG4gICAgdmFyIG9ic2VydmVIYW5kbGUgPSBjdXJzb3Iub2JzZXJ2ZUNoYW5nZXMoe1xuICAgICAgYWRkZWQ6IGZ1bmN0aW9uIChpZCwgZmllbGRzKSB7XG4gICAgICAgIHN1Yi5hZGRlZChjb2xsZWN0aW9uLCBpZCwgZmllbGRzKTtcbiAgICAgIH0sXG4gICAgICBjaGFuZ2VkOiBmdW5jdGlvbiAoaWQsIGZpZWxkcykge1xuICAgICAgICBzdWIuY2hhbmdlZChjb2xsZWN0aW9uLCBpZCwgZmllbGRzKTtcbiAgICAgIH0sXG4gICAgICByZW1vdmVkOiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgc3ViLnJlbW92ZWQoY29sbGVjdGlvbiwgaWQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gV2UgZG9uJ3QgY2FsbCBzdWIucmVhZHkoKSBoZXJlOiBpdCBnZXRzIGNhbGxlZCBpbiBsaXZlZGF0YV9zZXJ2ZXIsIGFmdGVyXG4gICAgLy8gcG9zc2libHkgY2FsbGluZyBfcHVibGlzaEN1cnNvciBvbiBtdWx0aXBsZSByZXR1cm5lZCBjdXJzb3JzLlxuXG4gICAgLy8gcmVnaXN0ZXIgc3RvcCBjYWxsYmFjayAoZXhwZWN0cyBsYW1iZGEgdy8gbm8gYXJncykuXG4gICAgc3ViLm9uU3RvcChmdW5jdGlvbiAoKSB7XG4gICAgICBvYnNlcnZlSGFuZGxlLnN0b3AoKTtcbiAgICB9KTtcblxuICAgIC8vIHJldHVybiB0aGUgb2JzZXJ2ZUhhbmRsZSBpbiBjYXNlIGl0IG5lZWRzIHRvIGJlIHN0b3BwZWQgZWFybHlcbiAgICByZXR1cm4gb2JzZXJ2ZUhhbmRsZTtcbiAgfSxcblxuICAvLyBwcm90ZWN0IGFnYWluc3QgZGFuZ2Vyb3VzIHNlbGVjdG9ycy4gIGZhbHNleSBhbmQge19pZDogZmFsc2V5fSBhcmUgYm90aFxuICAvLyBsaWtlbHkgcHJvZ3JhbW1lciBlcnJvciwgYW5kIG5vdCB3aGF0IHlvdSB3YW50LCBwYXJ0aWN1bGFybHkgZm9yIGRlc3RydWN0aXZlXG4gIC8vIG9wZXJhdGlvbnMuIElmIGEgZmFsc2V5IF9pZCBpcyBzZW50IGluLCBhIG5ldyBzdHJpbmcgX2lkIHdpbGwgYmVcbiAgLy8gZ2VuZXJhdGVkIGFuZCByZXR1cm5lZDsgaWYgYSBmYWxsYmFja0lkIGlzIHByb3ZpZGVkLCBpdCB3aWxsIGJlIHJldHVybmVkXG4gIC8vIGluc3RlYWQuXG4gIF9yZXdyaXRlU2VsZWN0b3Ioc2VsZWN0b3IsIHsgZmFsbGJhY2tJZCB9ID0ge30pIHtcbiAgICAvLyBzaG9ydGhhbmQgLS0gc2NhbGFycyBtYXRjaCBfaWRcbiAgICBpZiAoTG9jYWxDb2xsZWN0aW9uLl9zZWxlY3RvcklzSWQoc2VsZWN0b3IpKVxuICAgICAgc2VsZWN0b3IgPSB7X2lkOiBzZWxlY3Rvcn07XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShzZWxlY3RvcikpIHtcbiAgICAgIC8vIFRoaXMgaXMgY29uc2lzdGVudCB3aXRoIHRoZSBNb25nbyBjb25zb2xlIGl0c2VsZjsgaWYgd2UgZG9uJ3QgZG8gdGhpc1xuICAgICAgLy8gY2hlY2sgcGFzc2luZyBhbiBlbXB0eSBhcnJheSBlbmRzIHVwIHNlbGVjdGluZyBhbGwgaXRlbXNcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk1vbmdvIHNlbGVjdG9yIGNhbid0IGJlIGFuIGFycmF5LlwiKTtcbiAgICB9XG5cbiAgICBpZiAoIXNlbGVjdG9yIHx8ICgoJ19pZCcgaW4gc2VsZWN0b3IpICYmICFzZWxlY3Rvci5faWQpKSB7XG4gICAgICAvLyBjYW4ndCBtYXRjaCBhbnl0aGluZ1xuICAgICAgcmV0dXJuIHsgX2lkOiBmYWxsYmFja0lkIHx8IFJhbmRvbS5pZCgpIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlbGVjdG9yO1xuICB9XG59KTtcblxuT2JqZWN0LmFzc2lnbihNb25nby5Db2xsZWN0aW9uLnByb3RvdHlwZSwge1xuICAvLyAnaW5zZXJ0JyBpbW1lZGlhdGVseSByZXR1cm5zIHRoZSBpbnNlcnRlZCBkb2N1bWVudCdzIG5ldyBfaWQuXG4gIC8vIFRoZSBvdGhlcnMgcmV0dXJuIHZhbHVlcyBpbW1lZGlhdGVseSBpZiB5b3UgYXJlIGluIGEgc3R1YiwgYW4gaW4tbWVtb3J5XG4gIC8vIHVubWFuYWdlZCBjb2xsZWN0aW9uLCBvciBhIG1vbmdvLWJhY2tlZCBjb2xsZWN0aW9uIGFuZCB5b3UgZG9uJ3QgcGFzcyBhXG4gIC8vIGNhbGxiYWNrLiAndXBkYXRlJyBhbmQgJ3JlbW92ZScgcmV0dXJuIHRoZSBudW1iZXIgb2YgYWZmZWN0ZWRcbiAgLy8gZG9jdW1lbnRzLiAndXBzZXJ0JyByZXR1cm5zIGFuIG9iamVjdCB3aXRoIGtleXMgJ251bWJlckFmZmVjdGVkJyBhbmQsIGlmIGFuXG4gIC8vIGluc2VydCBoYXBwZW5lZCwgJ2luc2VydGVkSWQnLlxuICAvL1xuICAvLyBPdGhlcndpc2UsIHRoZSBzZW1hbnRpY3MgYXJlIGV4YWN0bHkgbGlrZSBvdGhlciBtZXRob2RzOiB0aGV5IHRha2VcbiAgLy8gYSBjYWxsYmFjayBhcyBhbiBvcHRpb25hbCBsYXN0IGFyZ3VtZW50OyBpZiBubyBjYWxsYmFjayBpc1xuICAvLyBwcm92aWRlZCwgdGhleSBibG9jayB1bnRpbCB0aGUgb3BlcmF0aW9uIGlzIGNvbXBsZXRlLCBhbmQgdGhyb3cgYW5cbiAgLy8gZXhjZXB0aW9uIGlmIGl0IGZhaWxzOyBpZiBhIGNhbGxiYWNrIGlzIHByb3ZpZGVkLCB0aGVuIHRoZXkgZG9uJ3RcbiAgLy8gbmVjZXNzYXJpbHkgYmxvY2ssIGFuZCB0aGV5IGNhbGwgdGhlIGNhbGxiYWNrIHdoZW4gdGhleSBmaW5pc2ggd2l0aCBlcnJvciBhbmRcbiAgLy8gcmVzdWx0IGFyZ3VtZW50cy4gIChUaGUgaW5zZXJ0IG1ldGhvZCBwcm92aWRlcyB0aGUgZG9jdW1lbnQgSUQgYXMgaXRzIHJlc3VsdDtcbiAgLy8gdXBkYXRlIGFuZCByZW1vdmUgcHJvdmlkZSB0aGUgbnVtYmVyIG9mIGFmZmVjdGVkIGRvY3MgYXMgdGhlIHJlc3VsdDsgdXBzZXJ0XG4gIC8vIHByb3ZpZGVzIGFuIG9iamVjdCB3aXRoIG51bWJlckFmZmVjdGVkIGFuZCBtYXliZSBpbnNlcnRlZElkLilcbiAgLy9cbiAgLy8gT24gdGhlIGNsaWVudCwgYmxvY2tpbmcgaXMgaW1wb3NzaWJsZSwgc28gaWYgYSBjYWxsYmFja1xuICAvLyBpc24ndCBwcm92aWRlZCwgdGhleSBqdXN0IHJldHVybiBpbW1lZGlhdGVseSBhbmQgYW55IGVycm9yXG4gIC8vIGluZm9ybWF0aW9uIGlzIGxvc3QuXG4gIC8vXG4gIC8vIFRoZXJlJ3Mgb25lIG1vcmUgdHdlYWsuIE9uIHRoZSBjbGllbnQsIGlmIHlvdSBkb24ndCBwcm92aWRlIGFcbiAgLy8gY2FsbGJhY2ssIHRoZW4gaWYgdGhlcmUgaXMgYW4gZXJyb3IsIGEgbWVzc2FnZSB3aWxsIGJlIGxvZ2dlZCB3aXRoXG4gIC8vIE1ldGVvci5fZGVidWcuXG4gIC8vXG4gIC8vIFRoZSBpbnRlbnQgKHRob3VnaCB0aGlzIGlzIGFjdHVhbGx5IGRldGVybWluZWQgYnkgdGhlIHVuZGVybHlpbmdcbiAgLy8gZHJpdmVycykgaXMgdGhhdCB0aGUgb3BlcmF0aW9ucyBzaG91bGQgYmUgZG9uZSBzeW5jaHJvbm91c2x5LCBub3RcbiAgLy8gZ2VuZXJhdGluZyB0aGVpciByZXN1bHQgdW50aWwgdGhlIGRhdGFiYXNlIGhhcyBhY2tub3dsZWRnZWRcbiAgLy8gdGhlbS4gSW4gdGhlIGZ1dHVyZSBtYXliZSB3ZSBzaG91bGQgcHJvdmlkZSBhIGZsYWcgdG8gdHVybiB0aGlzXG4gIC8vIG9mZi5cblxuICAvKipcbiAgICogQHN1bW1hcnkgSW5zZXJ0IGEgZG9jdW1lbnQgaW4gdGhlIGNvbGxlY3Rpb24uICBSZXR1cm5zIGl0cyB1bmlxdWUgX2lkLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCAgaW5zZXJ0XG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge09iamVjdH0gZG9jIFRoZSBkb2N1bWVudCB0byBpbnNlcnQuIE1heSBub3QgeWV0IGhhdmUgYW4gX2lkIGF0dHJpYnV0ZSwgaW4gd2hpY2ggY2FzZSBNZXRlb3Igd2lsbCBnZW5lcmF0ZSBvbmUgZm9yIHlvdS5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSBPcHRpb25hbC4gIElmIHByZXNlbnQsIGNhbGxlZCB3aXRoIGFuIGVycm9yIG9iamVjdCBhcyB0aGUgZmlyc3QgYXJndW1lbnQgYW5kLCBpZiBubyBlcnJvciwgdGhlIF9pZCBhcyB0aGUgc2Vjb25kLlxuICAgKi9cbiAgaW5zZXJ0KGRvYywgY2FsbGJhY2spIHtcbiAgICAvLyBNYWtlIHN1cmUgd2Ugd2VyZSBwYXNzZWQgYSBkb2N1bWVudCB0byBpbnNlcnRcbiAgICBpZiAoIWRvYykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaW5zZXJ0IHJlcXVpcmVzIGFuIGFyZ3VtZW50XCIpO1xuICAgIH1cblxuICAgIC8vIE1ha2UgYSBzaGFsbG93IGNsb25lIG9mIHRoZSBkb2N1bWVudCwgcHJlc2VydmluZyBpdHMgcHJvdG90eXBlLlxuICAgIGRvYyA9IE9iamVjdC5jcmVhdGUoXG4gICAgICBPYmplY3QuZ2V0UHJvdG90eXBlT2YoZG9jKSxcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKGRvYylcbiAgICApO1xuXG4gICAgaWYgKCdfaWQnIGluIGRvYykge1xuICAgICAgaWYgKCEgZG9jLl9pZCB8fFxuICAgICAgICAgICEgKHR5cGVvZiBkb2MuX2lkID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgICAgIGRvYy5faWQgaW5zdGFuY2VvZiBNb25nby5PYmplY3RJRCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIFwiTWV0ZW9yIHJlcXVpcmVzIGRvY3VtZW50IF9pZCBmaWVsZHMgdG8gYmUgbm9uLWVtcHR5IHN0cmluZ3Mgb3IgT2JqZWN0SURzXCIpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgZ2VuZXJhdGVJZCA9IHRydWU7XG5cbiAgICAgIC8vIERvbid0IGdlbmVyYXRlIHRoZSBpZCBpZiB3ZSdyZSB0aGUgY2xpZW50IGFuZCB0aGUgJ291dGVybW9zdCcgY2FsbFxuICAgICAgLy8gVGhpcyBvcHRpbWl6YXRpb24gc2F2ZXMgdXMgcGFzc2luZyBib3RoIHRoZSByYW5kb21TZWVkIGFuZCB0aGUgaWRcbiAgICAgIC8vIFBhc3NpbmcgYm90aCBpcyByZWR1bmRhbnQuXG4gICAgICBpZiAodGhpcy5faXNSZW1vdGVDb2xsZWN0aW9uKCkpIHtcbiAgICAgICAgY29uc3QgZW5jbG9zaW5nID0gRERQLl9DdXJyZW50TWV0aG9kSW52b2NhdGlvbi5nZXQoKTtcbiAgICAgICAgaWYgKCFlbmNsb3NpbmcpIHtcbiAgICAgICAgICBnZW5lcmF0ZUlkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGdlbmVyYXRlSWQpIHtcbiAgICAgICAgZG9jLl9pZCA9IHRoaXMuX21ha2VOZXdJRCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE9uIGluc2VydHMsIGFsd2F5cyByZXR1cm4gdGhlIGlkIHRoYXQgd2UgZ2VuZXJhdGVkOyBvbiBhbGwgb3RoZXJcbiAgICAvLyBvcGVyYXRpb25zLCBqdXN0IHJldHVybiB0aGUgcmVzdWx0IGZyb20gdGhlIGNvbGxlY3Rpb24uXG4gICAgdmFyIGNob29zZVJldHVyblZhbHVlRnJvbUNvbGxlY3Rpb25SZXN1bHQgPSBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICBpZiAoZG9jLl9pZCkge1xuICAgICAgICByZXR1cm4gZG9jLl9pZDtcbiAgICAgIH1cblxuICAgICAgLy8gWFhYIHdoYXQgaXMgdGhpcyBmb3I/P1xuICAgICAgLy8gSXQncyBzb21lIGl0ZXJhY3Rpb24gYmV0d2VlbiB0aGUgY2FsbGJhY2sgdG8gX2NhbGxNdXRhdG9yTWV0aG9kIGFuZFxuICAgICAgLy8gdGhlIHJldHVybiB2YWx1ZSBjb252ZXJzaW9uXG4gICAgICBkb2MuX2lkID0gcmVzdWx0O1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICBjb25zdCB3cmFwcGVkQ2FsbGJhY2sgPSB3cmFwQ2FsbGJhY2soXG4gICAgICBjYWxsYmFjaywgY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdCk7XG5cbiAgICBpZiAodGhpcy5faXNSZW1vdGVDb2xsZWN0aW9uKCkpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX2NhbGxNdXRhdG9yTWV0aG9kKFwiaW5zZXJ0XCIsIFtkb2NdLCB3cmFwcGVkQ2FsbGJhY2spO1xuICAgICAgcmV0dXJuIGNob29zZVJldHVyblZhbHVlRnJvbUNvbGxlY3Rpb25SZXN1bHQocmVzdWx0KTtcbiAgICB9XG5cbiAgICAvLyBpdCdzIG15IGNvbGxlY3Rpb24uICBkZXNjZW5kIGludG8gdGhlIGNvbGxlY3Rpb24gb2JqZWN0XG4gICAgLy8gYW5kIHByb3BhZ2F0ZSBhbnkgZXhjZXB0aW9uLlxuICAgIHRyeSB7XG4gICAgICAvLyBJZiB0aGUgdXNlciBwcm92aWRlZCBhIGNhbGxiYWNrIGFuZCB0aGUgY29sbGVjdGlvbiBpbXBsZW1lbnRzIHRoaXNcbiAgICAgIC8vIG9wZXJhdGlvbiBhc3luY2hyb25vdXNseSwgdGhlbiBxdWVyeVJldCB3aWxsIGJlIHVuZGVmaW5lZCwgYW5kIHRoZVxuICAgICAgLy8gcmVzdWx0IHdpbGwgYmUgcmV0dXJuZWQgdGhyb3VnaCB0aGUgY2FsbGJhY2sgaW5zdGVhZC5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuX2NvbGxlY3Rpb24uaW5zZXJ0KGRvYywgd3JhcHBlZENhbGxiYWNrKTtcbiAgICAgIHJldHVybiBjaG9vc2VSZXR1cm5WYWx1ZUZyb21Db2xsZWN0aW9uUmVzdWx0KHJlc3VsdCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrKGUpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBNb2RpZnkgb25lIG9yIG1vcmUgZG9jdW1lbnRzIGluIHRoZSBjb2xsZWN0aW9uLiBSZXR1cm5zIHRoZSBudW1iZXIgb2YgbWF0Y2hlZCBkb2N1bWVudHMuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kIHVwZGF0ZVxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtNb25nb1NlbGVjdG9yfSBzZWxlY3RvciBTcGVjaWZpZXMgd2hpY2ggZG9jdW1lbnRzIHRvIG1vZGlmeVxuICAgKiBAcGFyYW0ge01vbmdvTW9kaWZpZXJ9IG1vZGlmaWVyIFNwZWNpZmllcyBob3cgdG8gbW9kaWZ5IHRoZSBkb2N1bWVudHNcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMubXVsdGkgVHJ1ZSB0byBtb2RpZnkgYWxsIG1hdGNoaW5nIGRvY3VtZW50czsgZmFsc2UgdG8gb25seSBtb2RpZnkgb25lIG9mIHRoZSBtYXRjaGluZyBkb2N1bWVudHMgKHRoZSBkZWZhdWx0KS5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnVwc2VydCBUcnVlIHRvIGluc2VydCBhIGRvY3VtZW50IGlmIG5vIG1hdGNoaW5nIGRvY3VtZW50cyBhcmUgZm91bmQuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gT3B0aW9uYWwuICBJZiBwcmVzZW50LCBjYWxsZWQgd2l0aCBhbiBlcnJvciBvYmplY3QgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IGFuZCwgaWYgbm8gZXJyb3IsIHRoZSBudW1iZXIgb2YgYWZmZWN0ZWQgZG9jdW1lbnRzIGFzIHRoZSBzZWNvbmQuXG4gICAqL1xuICB1cGRhdGUoc2VsZWN0b3IsIG1vZGlmaWVyLCAuLi5vcHRpb25zQW5kQ2FsbGJhY2spIHtcbiAgICBjb25zdCBjYWxsYmFjayA9IHBvcENhbGxiYWNrRnJvbUFyZ3Mob3B0aW9uc0FuZENhbGxiYWNrKTtcblxuICAgIC8vIFdlJ3ZlIGFscmVhZHkgcG9wcGVkIG9mZiB0aGUgY2FsbGJhY2ssIHNvIHdlIGFyZSBsZWZ0IHdpdGggYW4gYXJyYXlcbiAgICAvLyBvZiBvbmUgb3IgemVybyBpdGVtc1xuICAgIGNvbnN0IG9wdGlvbnMgPSB7IC4uLihvcHRpb25zQW5kQ2FsbGJhY2tbMF0gfHwgbnVsbCkgfTtcbiAgICBsZXQgaW5zZXJ0ZWRJZDtcbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLnVwc2VydCkge1xuICAgICAgLy8gc2V0IGBpbnNlcnRlZElkYCBpZiBhYnNlbnQuICBgaW5zZXJ0ZWRJZGAgaXMgYSBNZXRlb3IgZXh0ZW5zaW9uLlxuICAgICAgaWYgKG9wdGlvbnMuaW5zZXJ0ZWRJZCkge1xuICAgICAgICBpZiAoISh0eXBlb2Ygb3B0aW9ucy5pbnNlcnRlZElkID09PSAnc3RyaW5nJyB8fCBvcHRpb25zLmluc2VydGVkSWQgaW5zdGFuY2VvZiBNb25nby5PYmplY3RJRCkpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaW5zZXJ0ZWRJZCBtdXN0IGJlIHN0cmluZyBvciBPYmplY3RJRFwiKTtcbiAgICAgICAgaW5zZXJ0ZWRJZCA9IG9wdGlvbnMuaW5zZXJ0ZWRJZDtcbiAgICAgIH0gZWxzZSBpZiAoIXNlbGVjdG9yIHx8ICFzZWxlY3Rvci5faWQpIHtcbiAgICAgICAgaW5zZXJ0ZWRJZCA9IHRoaXMuX21ha2VOZXdJRCgpO1xuICAgICAgICBvcHRpb25zLmdlbmVyYXRlZElkID0gdHJ1ZTtcbiAgICAgICAgb3B0aW9ucy5pbnNlcnRlZElkID0gaW5zZXJ0ZWRJZDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBzZWxlY3RvciA9XG4gICAgICBNb25nby5Db2xsZWN0aW9uLl9yZXdyaXRlU2VsZWN0b3Ioc2VsZWN0b3IsIHsgZmFsbGJhY2tJZDogaW5zZXJ0ZWRJZCB9KTtcblxuICAgIGNvbnN0IHdyYXBwZWRDYWxsYmFjayA9IHdyYXBDYWxsYmFjayhjYWxsYmFjayk7XG5cbiAgICBpZiAodGhpcy5faXNSZW1vdGVDb2xsZWN0aW9uKCkpIHtcbiAgICAgIGNvbnN0IGFyZ3MgPSBbXG4gICAgICAgIHNlbGVjdG9yLFxuICAgICAgICBtb2RpZmllcixcbiAgICAgICAgb3B0aW9uc1xuICAgICAgXTtcblxuICAgICAgcmV0dXJuIHRoaXMuX2NhbGxNdXRhdG9yTWV0aG9kKFwidXBkYXRlXCIsIGFyZ3MsIHdyYXBwZWRDYWxsYmFjayk7XG4gICAgfVxuXG4gICAgLy8gaXQncyBteSBjb2xsZWN0aW9uLiAgZGVzY2VuZCBpbnRvIHRoZSBjb2xsZWN0aW9uIG9iamVjdFxuICAgIC8vIGFuZCBwcm9wYWdhdGUgYW55IGV4Y2VwdGlvbi5cbiAgICB0cnkge1xuICAgICAgLy8gSWYgdGhlIHVzZXIgcHJvdmlkZWQgYSBjYWxsYmFjayBhbmQgdGhlIGNvbGxlY3Rpb24gaW1wbGVtZW50cyB0aGlzXG4gICAgICAvLyBvcGVyYXRpb24gYXN5bmNocm9ub3VzbHksIHRoZW4gcXVlcnlSZXQgd2lsbCBiZSB1bmRlZmluZWQsIGFuZCB0aGVcbiAgICAgIC8vIHJlc3VsdCB3aWxsIGJlIHJldHVybmVkIHRocm91Z2ggdGhlIGNhbGxiYWNrIGluc3RlYWQuXG4gICAgICByZXR1cm4gdGhpcy5fY29sbGVjdGlvbi51cGRhdGUoXG4gICAgICAgIHNlbGVjdG9yLCBtb2RpZmllciwgb3B0aW9ucywgd3JhcHBlZENhbGxiYWNrKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2soZSk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFJlbW92ZSBkb2N1bWVudHMgZnJvbSB0aGUgY29sbGVjdGlvblxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCByZW1vdmVcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7TW9uZ29TZWxlY3Rvcn0gc2VsZWN0b3IgU3BlY2lmaWVzIHdoaWNoIGRvY3VtZW50cyB0byByZW1vdmVcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSBPcHRpb25hbC4gIElmIHByZXNlbnQsIGNhbGxlZCB3aXRoIGFuIGVycm9yIG9iamVjdCBhcyBpdHMgYXJndW1lbnQuXG4gICAqL1xuICByZW1vdmUoc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG4gICAgc2VsZWN0b3IgPSBNb25nby5Db2xsZWN0aW9uLl9yZXdyaXRlU2VsZWN0b3Ioc2VsZWN0b3IpO1xuXG4gICAgY29uc3Qgd3JhcHBlZENhbGxiYWNrID0gd3JhcENhbGxiYWNrKGNhbGxiYWNrKTtcblxuICAgIGlmICh0aGlzLl9pc1JlbW90ZUNvbGxlY3Rpb24oKSkge1xuICAgICAgcmV0dXJuIHRoaXMuX2NhbGxNdXRhdG9yTWV0aG9kKFwicmVtb3ZlXCIsIFtzZWxlY3Rvcl0sIHdyYXBwZWRDYWxsYmFjayk7XG4gICAgfVxuXG4gICAgLy8gaXQncyBteSBjb2xsZWN0aW9uLiAgZGVzY2VuZCBpbnRvIHRoZSBjb2xsZWN0aW9uIG9iamVjdFxuICAgIC8vIGFuZCBwcm9wYWdhdGUgYW55IGV4Y2VwdGlvbi5cbiAgICB0cnkge1xuICAgICAgLy8gSWYgdGhlIHVzZXIgcHJvdmlkZWQgYSBjYWxsYmFjayBhbmQgdGhlIGNvbGxlY3Rpb24gaW1wbGVtZW50cyB0aGlzXG4gICAgICAvLyBvcGVyYXRpb24gYXN5bmNocm9ub3VzbHksIHRoZW4gcXVlcnlSZXQgd2lsbCBiZSB1bmRlZmluZWQsIGFuZCB0aGVcbiAgICAgIC8vIHJlc3VsdCB3aWxsIGJlIHJldHVybmVkIHRocm91Z2ggdGhlIGNhbGxiYWNrIGluc3RlYWQuXG4gICAgICByZXR1cm4gdGhpcy5fY29sbGVjdGlvbi5yZW1vdmUoc2VsZWN0b3IsIHdyYXBwZWRDYWxsYmFjayk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrKGUpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9LFxuXG4gIC8vIERldGVybWluZSBpZiB0aGlzIGNvbGxlY3Rpb24gaXMgc2ltcGx5IGEgbWluaW1vbmdvIHJlcHJlc2VudGF0aW9uIG9mIGEgcmVhbFxuICAvLyBkYXRhYmFzZSBvbiBhbm90aGVyIHNlcnZlclxuICBfaXNSZW1vdGVDb2xsZWN0aW9uKCkge1xuICAgIC8vIFhYWCBzZWUgI01ldGVvclNlcnZlck51bGxcbiAgICByZXR1cm4gdGhpcy5fY29ubmVjdGlvbiAmJiB0aGlzLl9jb25uZWN0aW9uICE9PSBNZXRlb3Iuc2VydmVyO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBNb2RpZnkgb25lIG9yIG1vcmUgZG9jdW1lbnRzIGluIHRoZSBjb2xsZWN0aW9uLCBvciBpbnNlcnQgb25lIGlmIG5vIG1hdGNoaW5nIGRvY3VtZW50cyB3ZXJlIGZvdW5kLiBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIGtleXMgYG51bWJlckFmZmVjdGVkYCAodGhlIG51bWJlciBvZiBkb2N1bWVudHMgbW9kaWZpZWQpICBhbmQgYGluc2VydGVkSWRgICh0aGUgdW5pcXVlIF9pZCBvZiB0aGUgZG9jdW1lbnQgdGhhdCB3YXMgaW5zZXJ0ZWQsIGlmIGFueSkuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kIHVwc2VydFxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtNb25nb1NlbGVjdG9yfSBzZWxlY3RvciBTcGVjaWZpZXMgd2hpY2ggZG9jdW1lbnRzIHRvIG1vZGlmeVxuICAgKiBAcGFyYW0ge01vbmdvTW9kaWZpZXJ9IG1vZGlmaWVyIFNwZWNpZmllcyBob3cgdG8gbW9kaWZ5IHRoZSBkb2N1bWVudHNcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMubXVsdGkgVHJ1ZSB0byBtb2RpZnkgYWxsIG1hdGNoaW5nIGRvY3VtZW50czsgZmFsc2UgdG8gb25seSBtb2RpZnkgb25lIG9mIHRoZSBtYXRjaGluZyBkb2N1bWVudHMgKHRoZSBkZWZhdWx0KS5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSBPcHRpb25hbC4gIElmIHByZXNlbnQsIGNhbGxlZCB3aXRoIGFuIGVycm9yIG9iamVjdCBhcyB0aGUgZmlyc3QgYXJndW1lbnQgYW5kLCBpZiBubyBlcnJvciwgdGhlIG51bWJlciBvZiBhZmZlY3RlZCBkb2N1bWVudHMgYXMgdGhlIHNlY29uZC5cbiAgICovXG4gIHVwc2VydChzZWxlY3RvciwgbW9kaWZpZXIsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCEgY2FsbGJhY2sgJiYgdHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnVwZGF0ZShzZWxlY3RvciwgbW9kaWZpZXIsIHtcbiAgICAgIC4uLm9wdGlvbnMsXG4gICAgICBfcmV0dXJuT2JqZWN0OiB0cnVlLFxuICAgICAgdXBzZXJ0OiB0cnVlLFxuICAgIH0sIGNhbGxiYWNrKTtcbiAgfSxcblxuICAvLyBXZSdsbCBhY3R1YWxseSBkZXNpZ24gYW4gaW5kZXggQVBJIGxhdGVyLiBGb3Igbm93LCB3ZSBqdXN0IHBhc3MgdGhyb3VnaCB0b1xuICAvLyBNb25nbydzLCBidXQgbWFrZSBpdCBzeW5jaHJvbm91cy5cbiAgX2Vuc3VyZUluZGV4KGluZGV4LCBvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghc2VsZi5fY29sbGVjdGlvbi5fZW5zdXJlSW5kZXgpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4gb25seSBjYWxsIF9lbnN1cmVJbmRleCBvbiBzZXJ2ZXIgY29sbGVjdGlvbnNcIik7XG4gICAgc2VsZi5fY29sbGVjdGlvbi5fZW5zdXJlSW5kZXgoaW5kZXgsIG9wdGlvbnMpO1xuICB9LFxuXG4gIF9kcm9wSW5kZXgoaW5kZXgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFzZWxmLl9jb2xsZWN0aW9uLl9kcm9wSW5kZXgpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4gb25seSBjYWxsIF9kcm9wSW5kZXggb24gc2VydmVyIGNvbGxlY3Rpb25zXCIpO1xuICAgIHNlbGYuX2NvbGxlY3Rpb24uX2Ryb3BJbmRleChpbmRleCk7XG4gIH0sXG5cbiAgX2Ryb3BDb2xsZWN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIXNlbGYuX2NvbGxlY3Rpb24uZHJvcENvbGxlY3Rpb24pXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4gb25seSBjYWxsIF9kcm9wQ29sbGVjdGlvbiBvbiBzZXJ2ZXIgY29sbGVjdGlvbnNcIik7XG4gICAgc2VsZi5fY29sbGVjdGlvbi5kcm9wQ29sbGVjdGlvbigpO1xuICB9LFxuXG4gIF9jcmVhdGVDYXBwZWRDb2xsZWN0aW9uKGJ5dGVTaXplLCBtYXhEb2N1bWVudHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFzZWxmLl9jb2xsZWN0aW9uLl9jcmVhdGVDYXBwZWRDb2xsZWN0aW9uKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuIG9ubHkgY2FsbCBfY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbiBvbiBzZXJ2ZXIgY29sbGVjdGlvbnNcIik7XG4gICAgc2VsZi5fY29sbGVjdGlvbi5fY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbihieXRlU2l6ZSwgbWF4RG9jdW1lbnRzKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgUmV0dXJucyB0aGUgW2BDb2xsZWN0aW9uYF0oaHR0cDovL21vbmdvZGIuZ2l0aHViLmlvL25vZGUtbW9uZ29kYi1uYXRpdmUvMy4wL2FwaS9Db2xsZWN0aW9uLmh0bWwpIG9iamVjdCBjb3JyZXNwb25kaW5nIHRvIHRoaXMgY29sbGVjdGlvbiBmcm9tIHRoZSBbbnBtIGBtb25nb2RiYCBkcml2ZXIgbW9kdWxlXShodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9tb25nb2RiKSB3aGljaCBpcyB3cmFwcGVkIGJ5IGBNb25nby5Db2xsZWN0aW9uYC5cbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICovXG4gIHJhd0NvbGxlY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghIHNlbGYuX2NvbGxlY3Rpb24ucmF3Q29sbGVjdGlvbikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuIG9ubHkgY2FsbCByYXdDb2xsZWN0aW9uIG9uIHNlcnZlciBjb2xsZWN0aW9uc1wiKTtcbiAgICB9XG4gICAgcmV0dXJuIHNlbGYuX2NvbGxlY3Rpb24ucmF3Q29sbGVjdGlvbigpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIHRoZSBbYERiYF0oaHR0cDovL21vbmdvZGIuZ2l0aHViLmlvL25vZGUtbW9uZ29kYi1uYXRpdmUvMy4wL2FwaS9EYi5odG1sKSBvYmplY3QgY29ycmVzcG9uZGluZyB0byB0aGlzIGNvbGxlY3Rpb24ncyBkYXRhYmFzZSBjb25uZWN0aW9uIGZyb20gdGhlIFtucG0gYG1vbmdvZGJgIGRyaXZlciBtb2R1bGVdKGh0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL21vbmdvZGIpIHdoaWNoIGlzIHdyYXBwZWQgYnkgYE1vbmdvLkNvbGxlY3Rpb25gLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKi9cbiAgcmF3RGF0YWJhc2UoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghIChzZWxmLl9kcml2ZXIubW9uZ28gJiYgc2VsZi5fZHJpdmVyLm1vbmdvLmRiKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuIG9ubHkgY2FsbCByYXdEYXRhYmFzZSBvbiBzZXJ2ZXIgY29sbGVjdGlvbnNcIik7XG4gICAgfVxuICAgIHJldHVybiBzZWxmLl9kcml2ZXIubW9uZ28uZGI7XG4gIH1cbn0pO1xuXG4vLyBDb252ZXJ0IHRoZSBjYWxsYmFjayB0byBub3QgcmV0dXJuIGEgcmVzdWx0IGlmIHRoZXJlIGlzIGFuIGVycm9yXG5mdW5jdGlvbiB3cmFwQ2FsbGJhY2soY2FsbGJhY2ssIGNvbnZlcnRSZXN1bHQpIHtcbiAgcmV0dXJuIGNhbGxiYWNrICYmIGZ1bmN0aW9uIChlcnJvciwgcmVzdWx0KSB7XG4gICAgaWYgKGVycm9yKSB7XG4gICAgICBjYWxsYmFjayhlcnJvcik7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgY29udmVydFJlc3VsdCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBjYWxsYmFjayhudWxsLCBjb252ZXJ0UmVzdWx0KHJlc3VsdCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBAc3VtbWFyeSBDcmVhdGUgYSBNb25nby1zdHlsZSBgT2JqZWN0SURgLiAgSWYgeW91IGRvbid0IHNwZWNpZnkgYSBgaGV4U3RyaW5nYCwgdGhlIGBPYmplY3RJRGAgd2lsbCBnZW5lcmF0ZWQgcmFuZG9tbHkgKG5vdCB1c2luZyBNb25nb0RCJ3MgSUQgY29uc3RydWN0aW9uIHJ1bGVzKS5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQGNsYXNzXG4gKiBAcGFyYW0ge1N0cmluZ30gW2hleFN0cmluZ10gT3B0aW9uYWwuICBUaGUgMjQtY2hhcmFjdGVyIGhleGFkZWNpbWFsIGNvbnRlbnRzIG9mIHRoZSBPYmplY3RJRCB0byBjcmVhdGVcbiAqL1xuTW9uZ28uT2JqZWN0SUQgPSBNb25nb0lELk9iamVjdElEO1xuXG4vKipcbiAqIEBzdW1tYXJ5IFRvIGNyZWF0ZSBhIGN1cnNvciwgdXNlIGZpbmQuIFRvIGFjY2VzcyB0aGUgZG9jdW1lbnRzIGluIGEgY3Vyc29yLCB1c2UgZm9yRWFjaCwgbWFwLCBvciBmZXRjaC5cbiAqIEBjbGFzc1xuICogQGluc3RhbmNlTmFtZSBjdXJzb3JcbiAqL1xuTW9uZ28uQ3Vyc29yID0gTG9jYWxDb2xsZWN0aW9uLkN1cnNvcjtcblxuLyoqXG4gKiBAZGVwcmVjYXRlZCBpbiAwLjkuMVxuICovXG5Nb25nby5Db2xsZWN0aW9uLkN1cnNvciA9IE1vbmdvLkN1cnNvcjtcblxuLyoqXG4gKiBAZGVwcmVjYXRlZCBpbiAwLjkuMVxuICovXG5Nb25nby5Db2xsZWN0aW9uLk9iamVjdElEID0gTW9uZ28uT2JqZWN0SUQ7XG5cbi8qKlxuICogQGRlcHJlY2F0ZWQgaW4gMC45LjFcbiAqL1xuTWV0ZW9yLkNvbGxlY3Rpb24gPSBNb25nby5Db2xsZWN0aW9uO1xuXG4vLyBBbGxvdyBkZW55IHN0dWZmIGlzIG5vdyBpbiB0aGUgYWxsb3ctZGVueSBwYWNrYWdlXG5PYmplY3QuYXNzaWduKFxuICBNZXRlb3IuQ29sbGVjdGlvbi5wcm90b3R5cGUsXG4gIEFsbG93RGVueS5Db2xsZWN0aW9uUHJvdG90eXBlXG4pO1xuXG5mdW5jdGlvbiBwb3BDYWxsYmFja0Zyb21BcmdzKGFyZ3MpIHtcbiAgLy8gUHVsbCBvZmYgYW55IGNhbGxiYWNrIChvciBwZXJoYXBzIGEgJ2NhbGxiYWNrJyB2YXJpYWJsZSB0aGF0IHdhcyBwYXNzZWRcbiAgLy8gaW4gdW5kZWZpbmVkLCBsaWtlIGhvdyAndXBzZXJ0JyBkb2VzIGl0KS5cbiAgaWYgKGFyZ3MubGVuZ3RoICYmXG4gICAgICAoYXJnc1thcmdzLmxlbmd0aCAtIDFdID09PSB1bmRlZmluZWQgfHxcbiAgICAgICBhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gaW5zdGFuY2VvZiBGdW5jdGlvbikpIHtcbiAgICByZXR1cm4gYXJncy5wb3AoKTtcbiAgfVxufVxuIiwiLyoqXG4gKiBAc3VtbWFyeSBBbGxvd3MgZm9yIHVzZXIgc3BlY2lmaWVkIGNvbm5lY3Rpb24gb3B0aW9uc1xuICogQGV4YW1wbGUgaHR0cDovL21vbmdvZGIuZ2l0aHViLmlvL25vZGUtbW9uZ29kYi1uYXRpdmUvMy4wL3JlZmVyZW5jZS9jb25uZWN0aW5nL2Nvbm5lY3Rpb24tc2V0dGluZ3MvXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBVc2VyIHNwZWNpZmllZCBNb25nbyBjb25uZWN0aW9uIG9wdGlvbnNcbiAqL1xuTW9uZ28uc2V0Q29ubmVjdGlvbk9wdGlvbnMgPSBmdW5jdGlvbiBzZXRDb25uZWN0aW9uT3B0aW9ucyAob3B0aW9ucykge1xuICBjaGVjayhvcHRpb25zLCBPYmplY3QpO1xuICBNb25nby5fY29ubmVjdGlvbk9wdGlvbnMgPSBvcHRpb25zO1xufTsiXX0=
