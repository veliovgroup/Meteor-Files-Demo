(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var check = Package.check.check;
var Match = Package.check.Match;
var ECMAScript = Package.ecmascript.ECMAScript;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Autoupdate;

var require = meteorInstall({"node_modules":{"meteor":{"autoupdate":{"autoupdate_server.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/autoupdate/autoupdate_server.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

module.export({
  Autoupdate: () => Autoupdate
});
let ClientVersions;
module.link("./client_versions.js", {
  ClientVersions(v) {
    ClientVersions = v;
  }

}, 0);
let onMessage;
module.link("meteor/inter-process-messaging", {
  onMessage(v) {
    onMessage = v;
  }

}, 1);

var Future = Npm.require("fibers/future");

const Autoupdate = __meteor_runtime_config__.autoupdate = {
  // Map from client architectures (web.browser, web.browser.legacy,
  // web.cordova) to version fields { version, versionRefreshable,
  // versionNonRefreshable, refreshable } that will be stored in
  // ClientVersions documents (whose IDs are client architectures). This
  // data gets serialized into the boilerplate because it's stored in
  // __meteor_runtime_config__.autoupdate.versions.
  versions: {}
};
// Stores acceptable client versions.
const clientVersions = new ClientVersions(); // The client hash includes __meteor_runtime_config__, so wait until
// all packages have loaded and have had a chance to populate the
// runtime config before using the client hash as our default auto
// update version id.
// Note: Tests allow people to override Autoupdate.autoupdateVersion before
// startup.

Autoupdate.autoupdateVersion = null;
Autoupdate.autoupdateVersionRefreshable = null;
Autoupdate.autoupdateVersionCordova = null;
Autoupdate.appId = __meteor_runtime_config__.appId = process.env.APP_ID;
var syncQueue = new Meteor._SynchronousQueue();

function updateVersions(shouldReloadClientProgram) {
  // Step 1: load the current client program on the server
  if (shouldReloadClientProgram) {
    WebAppInternals.reloadClientPrograms();
  }

  const {
    // If the AUTOUPDATE_VERSION environment variable is defined, it takes
    // precedence, but Autoupdate.autoupdateVersion is still supported as
    // a fallback. In most cases neither of these values will be defined.
    AUTOUPDATE_VERSION = Autoupdate.autoupdateVersion
  } = process.env; // Step 2: update __meteor_runtime_config__.autoupdate.versions.

  const clientArchs = Object.keys(WebApp.clientPrograms);
  clientArchs.forEach(arch => {
    Autoupdate.versions[arch] = {
      version: AUTOUPDATE_VERSION || WebApp.calculateClientHash(arch),
      versionRefreshable: AUTOUPDATE_VERSION || WebApp.calculateClientHashRefreshable(arch),
      versionNonRefreshable: AUTOUPDATE_VERSION || WebApp.calculateClientHashNonRefreshable(arch)
    };
  }); // Step 3: form the new client boilerplate which contains the updated
  // assets and __meteor_runtime_config__.

  if (shouldReloadClientProgram) {
    WebAppInternals.generateBoilerplate();
  } // Step 4: update the ClientVersions collection.
  // We use `onListening` here because we need to use
  // `WebApp.getRefreshableAssets`, which is only set after
  // `WebApp.generateBoilerplate` is called by `main` in webapp.


  WebApp.onListening(() => {
    clientArchs.forEach(arch => {
      const payload = (0, _objectSpread2.default)({}, Autoupdate.versions[arch], {
        assets: WebApp.getRefreshableAssets(arch)
      });
      clientVersions.set(arch, payload);
    });
  });
}

Meteor.publish("meteor_autoupdate_clientVersions", function (appId) {
  // `null` happens when a client doesn't have an appId and passes
  // `undefined` to `Meteor.subscribe`. `undefined` is translated to
  // `null` as JSON doesn't have `undefined.
  check(appId, Match.OneOf(String, undefined, null)); // Don't notify clients using wrong appId such as mobile apps built with a
  // different server but pointing at the same local url

  if (Autoupdate.appId && appId && Autoupdate.appId !== appId) return [];
  const stop = clientVersions.watch((version, isNew) => {
    (isNew ? this.added : this.changed).call(this, "meteor_autoupdate_clientVersions", version._id, version);
  });
  this.onStop(() => stop());
  this.ready();
}, {
  is_auto: true
});
Meteor.startup(function () {
  updateVersions(false); // Force any connected clients that are still looking for these older
  // document IDs to reload.

  ["version", "version-refreshable", "version-cordova"].forEach(_id => {
    clientVersions.set(_id, {
      version: "outdated"
    });
  });
});
var fut = new Future(); // We only want 'refresh' to trigger 'updateVersions' AFTER onListen,
// so we add a queued task that waits for onListen before 'refresh' can queue
// tasks. Note that the `onListening` callbacks do not fire until after
// Meteor.startup, so there is no concern that the 'updateVersions' calls from
// 'refresh' will overlap with the `updateVersions` call from Meteor.startup.

syncQueue.queueTask(function () {
  fut.wait();
});
WebApp.onListening(function () {
  fut.return();
});

function enqueueVersionsRefresh() {
  syncQueue.queueTask(function () {
    updateVersions(true);
  });
} // Listen for messages pertaining to the client-refresh topic.


onMessage("client-refresh", enqueueVersionsRefresh); // Another way to tell the process to refresh: send SIGHUP signal

process.on('SIGHUP', Meteor.bindEnvironment(function () {
  enqueueVersionsRefresh();
}, "handling SIGHUP signal for refresh"));
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"client_versions.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/autoupdate/client_versions.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

module.export({
  ClientVersions: () => ClientVersions
});
let Tracker;
module.link("meteor/tracker", {
  Tracker(v) {
    Tracker = v;
  }

}, 0);

class ClientVersions {
  constructor() {
    this._versions = new Map();
    this._watchCallbacks = new Set();
  } // Creates a Livedata store for use with `Meteor.connection.registerStore`.
  // After the store is registered, document updates reported by Livedata are
  // merged with the documents in this `ClientVersions` instance.


  createStore() {
    return {
      update: ({
        id,
        msg,
        fields
      }) => {
        if (msg === "added" || msg === "changed") {
          this.set(id, fields);
        }
      }
    };
  }

  hasVersions() {
    return this._versions.size > 0;
  }

  get(id) {
    return this._versions.get(id);
  } // Adds or updates a version document and invokes registered callbacks for the
  // added/updated document. If a document with the given ID already exists, its
  // fields are merged with `fields`.


  set(id, fields) {
    let version = this._versions.get(id);

    let isNew = false;

    if (version) {
      Object.assign(version, fields);
    } else {
      version = (0, _objectSpread2.default)({
        _id: id
      }, fields);
      isNew = true;

      this._versions.set(id, version);
    }

    this._watchCallbacks.forEach(({
      fn,
      filter
    }) => {
      if (!filter || filter === version._id) {
        fn(version, isNew);
      }
    });
  } // Registers a callback that will be invoked when a version document is added
  // or changed. Calling the function returned by `watch` removes the callback.
  // If `skipInitial` is true, the callback isn't be invoked for existing
  // documents. If `filter` is set, the callback is only invoked for documents
  // with ID `filter`.


  watch(fn, {
    skipInitial,
    filter
  } = {}) {
    if (!skipInitial) {
      const resolved = Promise.resolve();

      this._versions.forEach(version => {
        if (!filter || filter === version._id) {
          resolved.then(() => fn(version, true));
        }
      });
    }

    const callback = {
      fn,
      filter
    };

    this._watchCallbacks.add(callback);

    return () => this._watchCallbacks.delete(callback);
  } // A reactive data source for `Autoupdate.newClientAvailable`.


  newClientAvailable(id, fields, currentVersion) {
    function isNewVersion(version) {
      return version._id === id && fields.some(field => version[field] !== currentVersion[field]);
    }

    const dependency = new Tracker.Dependency();
    const version = this.get(id);
    dependency.depend();
    const stop = this.watch(version => {
      if (isNewVersion(version)) {
        dependency.changed();
        stop();
      }
    }, {
      skipInitial: true
    });
    return !!version && isNewVersion(version);
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/autoupdate/autoupdate_server.js");

/* Exports */
Package._define("autoupdate", exports, {
  Autoupdate: Autoupdate
});

})();

//# sourceURL=meteor://💻app/packages/autoupdate.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYXV0b3VwZGF0ZS9hdXRvdXBkYXRlX3NlcnZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYXV0b3VwZGF0ZS9jbGllbnRfdmVyc2lvbnMuanMiXSwibmFtZXMiOlsibW9kdWxlIiwiZXhwb3J0IiwiQXV0b3VwZGF0ZSIsIkNsaWVudFZlcnNpb25zIiwibGluayIsInYiLCJvbk1lc3NhZ2UiLCJGdXR1cmUiLCJOcG0iLCJyZXF1aXJlIiwiX19tZXRlb3JfcnVudGltZV9jb25maWdfXyIsImF1dG91cGRhdGUiLCJ2ZXJzaW9ucyIsImNsaWVudFZlcnNpb25zIiwiYXV0b3VwZGF0ZVZlcnNpb24iLCJhdXRvdXBkYXRlVmVyc2lvblJlZnJlc2hhYmxlIiwiYXV0b3VwZGF0ZVZlcnNpb25Db3Jkb3ZhIiwiYXBwSWQiLCJwcm9jZXNzIiwiZW52IiwiQVBQX0lEIiwic3luY1F1ZXVlIiwiTWV0ZW9yIiwiX1N5bmNocm9ub3VzUXVldWUiLCJ1cGRhdGVWZXJzaW9ucyIsInNob3VsZFJlbG9hZENsaWVudFByb2dyYW0iLCJXZWJBcHBJbnRlcm5hbHMiLCJyZWxvYWRDbGllbnRQcm9ncmFtcyIsIkFVVE9VUERBVEVfVkVSU0lPTiIsImNsaWVudEFyY2hzIiwiT2JqZWN0Iiwia2V5cyIsIldlYkFwcCIsImNsaWVudFByb2dyYW1zIiwiZm9yRWFjaCIsImFyY2giLCJ2ZXJzaW9uIiwiY2FsY3VsYXRlQ2xpZW50SGFzaCIsInZlcnNpb25SZWZyZXNoYWJsZSIsImNhbGN1bGF0ZUNsaWVudEhhc2hSZWZyZXNoYWJsZSIsInZlcnNpb25Ob25SZWZyZXNoYWJsZSIsImNhbGN1bGF0ZUNsaWVudEhhc2hOb25SZWZyZXNoYWJsZSIsImdlbmVyYXRlQm9pbGVycGxhdGUiLCJvbkxpc3RlbmluZyIsInBheWxvYWQiLCJhc3NldHMiLCJnZXRSZWZyZXNoYWJsZUFzc2V0cyIsInNldCIsInB1Ymxpc2giLCJjaGVjayIsIk1hdGNoIiwiT25lT2YiLCJTdHJpbmciLCJ1bmRlZmluZWQiLCJzdG9wIiwid2F0Y2giLCJpc05ldyIsImFkZGVkIiwiY2hhbmdlZCIsImNhbGwiLCJfaWQiLCJvblN0b3AiLCJyZWFkeSIsImlzX2F1dG8iLCJzdGFydHVwIiwiZnV0IiwicXVldWVUYXNrIiwid2FpdCIsInJldHVybiIsImVucXVldWVWZXJzaW9uc1JlZnJlc2giLCJvbiIsImJpbmRFbnZpcm9ubWVudCIsIlRyYWNrZXIiLCJjb25zdHJ1Y3RvciIsIl92ZXJzaW9ucyIsIk1hcCIsIl93YXRjaENhbGxiYWNrcyIsIlNldCIsImNyZWF0ZVN0b3JlIiwidXBkYXRlIiwiaWQiLCJtc2ciLCJmaWVsZHMiLCJoYXNWZXJzaW9ucyIsInNpemUiLCJnZXQiLCJhc3NpZ24iLCJmbiIsImZpbHRlciIsInNraXBJbml0aWFsIiwicmVzb2x2ZWQiLCJQcm9taXNlIiwicmVzb2x2ZSIsInRoZW4iLCJjYWxsYmFjayIsImFkZCIsImRlbGV0ZSIsIm5ld0NsaWVudEF2YWlsYWJsZSIsImN1cnJlbnRWZXJzaW9uIiwiaXNOZXdWZXJzaW9uIiwic29tZSIsImZpZWxkIiwiZGVwZW5kZW5jeSIsIkRlcGVuZGVuY3kiLCJkZXBlbmQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxNQUFNLENBQUNDLE1BQVAsQ0FBYztBQUFDQyxZQUFVLEVBQUMsTUFBSUE7QUFBaEIsQ0FBZDtBQUEyQyxJQUFJQyxjQUFKO0FBQW1CSCxNQUFNLENBQUNJLElBQVAsQ0FBWSxzQkFBWixFQUFtQztBQUFDRCxnQkFBYyxDQUFDRSxDQUFELEVBQUc7QUFBQ0Ysa0JBQWMsR0FBQ0UsQ0FBZjtBQUFpQjs7QUFBcEMsQ0FBbkMsRUFBeUUsQ0FBekU7QUFBNEUsSUFBSUMsU0FBSjtBQUFjTixNQUFNLENBQUNJLElBQVAsQ0FBWSxnQ0FBWixFQUE2QztBQUFDRSxXQUFTLENBQUNELENBQUQsRUFBRztBQUFDQyxhQUFTLEdBQUNELENBQVY7QUFB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QUNBLFNBQUtaLGVBQUwsQ0FBcUJtQixHQUFyQixDQUF5QkQsUUFBekI7O0FBRUEsV0FBTyxNQUFNLEtBQUtsQixlQUFMLENBQXFCb0IsTUFBckIsQ0FBNEJGLFFBQTVCLENBQWI7QUFDRCxHQXpFeUIsQ0EyRTFCOzs7QUFDQUcsb0JBQWtCLENBQUNqQixFQUFELEVBQUtFLE1BQUwsRUFBYWdCLGNBQWIsRUFBNkI7QUFDN0MsYUFBU0MsWUFBVCxDQUFzQi9ELE9BQXRCLEVBQStCO0FBQzdCLGFBQ0VBLE9BQU8sQ0FBQ3dCLEdBQVIsS0FBZ0JvQixFQUFoQixJQUNBRSxNQUFNLENBQUNrQixJQUFQLENBQWFDLEtBQUQsSUFBV2pFLE9BQU8sQ0FBQ2lFLEtBQUQsQ0FBUCxLQUFtQkgsY0FBYyxDQUFDRyxLQUFELENBQXhELENBRkY7QUFJRDs7QUFFRCxVQUFNQyxVQUFVLEdBQUcsSUFBSTlCLE9BQU8sQ0FBQytCLFVBQVosRUFBbkI7QUFDQSxVQUFNbkUsT0FBTyxHQUFHLEtBQUtpRCxHQUFMLENBQVNMLEVBQVQsQ0FBaEI7QUFFQXNCLGNBQVUsQ0FBQ0UsTUFBWDtBQUVBLFVBQU1sRCxJQUFJLEdBQUcsS0FBS0MsS0FBTCxDQUNWbkIsT0FBRCxJQUFhO0FBQ1gsVUFBSStELFlBQVksQ0FBQy9ELE9BQUQsQ0FBaEIsRUFBMkI7QUFDekJrRSxrQkFBVSxDQUFDNUMsT0FBWDtBQUNBSixZQUFJO0FBQ0w7QUFDRixLQU5VLEVBT1g7QUFBRW1DLGlCQUFXLEVBQUU7QUFBZixLQVBXLENBQWI7QUFVQSxXQUFPLENBQUMsQ0FBRXJELE9BQUgsSUFBYytELFlBQVksQ0FBQy9ELE9BQUQsQ0FBakM7QUFDRDs7QUFwR3lCLEMiLCJmaWxlIjoiL3BhY2thZ2VzL2F1dG91cGRhdGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBQdWJsaXNoIHRoZSBjdXJyZW50IGNsaWVudCB2ZXJzaW9ucyBmb3IgZWFjaCBjbGllbnQgYXJjaGl0ZWN0dXJlXG4vLyAod2ViLmJyb3dzZXIsIHdlYi5icm93c2VyLmxlZ2FjeSwgd2ViLmNvcmRvdmEpLiBXaGVuIGEgY2xpZW50IG9ic2VydmVzXG4vLyBhIGNoYW5nZSBpbiB0aGUgdmVyc2lvbnMgYXNzb2NpYXRlZCB3aXRoIGl0cyBjbGllbnQgYXJjaGl0ZWN0dXJlLFxuLy8gaXQgd2lsbCByZWZyZXNoIGl0c2VsZiwgZWl0aGVyIGJ5IHN3YXBwaW5nIG91dCBDU1MgYXNzZXRzIG9yIGJ5XG4vLyByZWxvYWRpbmcgdGhlIHBhZ2UuXG4vL1xuLy8gVGhlcmUgYXJlIHRocmVlIHZlcnNpb25zIGZvciBhbnkgZ2l2ZW4gY2xpZW50IGFyY2hpdGVjdHVyZTogYHZlcnNpb25gLFxuLy8gYHZlcnNpb25SZWZyZXNoYWJsZWAsIGFuZCBgdmVyc2lvbk5vblJlZnJlc2hhYmxlYC4gVGhlIHJlZnJlc2hhYmxlXG4vLyB2ZXJzaW9uIGlzIGEgaGFzaCBvZiBqdXN0IHRoZSBjbGllbnQgcmVzb3VyY2VzIHRoYXQgYXJlIHJlZnJlc2hhYmxlLFxuLy8gc3VjaCBhcyBDU1MsIHdoaWxlIHRoZSBub24tcmVmcmVzaGFibGUgdmVyc2lvbiBpcyBhIGhhc2ggb2YgdGhlIHJlc3Qgb2Zcbi8vIHRoZSBjbGllbnQgYXNzZXRzLCBleGNsdWRpbmcgdGhlIHJlZnJlc2hhYmxlIG9uZXM6IEhUTUwsIEpTLCBhbmQgc3RhdGljXG4vLyBmaWxlcyBpbiB0aGUgYHB1YmxpY2AgZGlyZWN0b3J5LiBUaGUgYHZlcnNpb25gIHZlcnNpb24gaXMgYSBjb21iaW5lZFxuLy8gaGFzaCBvZiBldmVyeXRoaW5nLlxuLy9cbi8vIElmIHRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZSBgQVVUT1VQREFURV9WRVJTSU9OYCBpcyBzZXQsIGl0IHdpbGwgYmVcbi8vIHVzZWQgaW4gcGxhY2Ugb2YgYWxsIGNsaWVudCB2ZXJzaW9ucy4gWW91IGNhbiB1c2UgdGhpcyB2YXJpYWJsZSB0b1xuLy8gY29udHJvbCB3aGVuIHRoZSBjbGllbnQgcmVsb2Fkcy4gRm9yIGV4YW1wbGUsIGlmIHlvdSB3YW50IHRvIGZvcmNlIGFcbi8vIHJlbG9hZCBvbmx5IGFmdGVyIG1ham9yIGNoYW5nZXMsIHVzZSBhIGN1c3RvbSBBVVRPVVBEQVRFX1ZFUlNJT04gYW5kXG4vLyBjaGFuZ2UgaXQgb25seSB3aGVuIHNvbWV0aGluZyB3b3J0aCBwdXNoaW5nIHRvIGNsaWVudHMgaGFwcGVucy5cbi8vXG4vLyBUaGUgc2VydmVyIHB1Ymxpc2hlcyBhIGBtZXRlb3JfYXV0b3VwZGF0ZV9jbGllbnRWZXJzaW9uc2AgY29sbGVjdGlvbi5cbi8vIFRoZSBJRCBvZiBlYWNoIGRvY3VtZW50IGlzIHRoZSBjbGllbnQgYXJjaGl0ZWN0dXJlLCBhbmQgdGhlIGZpZWxkcyBvZlxuLy8gdGhlIGRvY3VtZW50IGFyZSB0aGUgdmVyc2lvbnMgZGVzY3JpYmVkIGFib3ZlLlxuXG5pbXBvcnQgeyBDbGllbnRWZXJzaW9ucyB9IGZyb20gXCIuL2NsaWVudF92ZXJzaW9ucy5qc1wiO1xudmFyIEZ1dHVyZSA9IE5wbS5yZXF1aXJlKFwiZmliZXJzL2Z1dHVyZVwiKTtcblxuZXhwb3J0IGNvbnN0IEF1dG91cGRhdGUgPSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLmF1dG91cGRhdGUgPSB7XG4gIC8vIE1hcCBmcm9tIGNsaWVudCBhcmNoaXRlY3R1cmVzICh3ZWIuYnJvd3Nlciwgd2ViLmJyb3dzZXIubGVnYWN5LFxuICAvLyB3ZWIuY29yZG92YSkgdG8gdmVyc2lvbiBmaWVsZHMgeyB2ZXJzaW9uLCB2ZXJzaW9uUmVmcmVzaGFibGUsXG4gIC8vIHZlcnNpb25Ob25SZWZyZXNoYWJsZSwgcmVmcmVzaGFibGUgfSB0aGF0IHdpbGwgYmUgc3RvcmVkIGluXG4gIC8vIENsaWVudFZlcnNpb25zIGRvY3VtZW50cyAod2hvc2UgSURzIGFyZSBjbGllbnQgYXJjaGl0ZWN0dXJlcykuIFRoaXNcbiAgLy8gZGF0YSBnZXRzIHNlcmlhbGl6ZWQgaW50byB0aGUgYm9pbGVycGxhdGUgYmVjYXVzZSBpdCdzIHN0b3JlZCBpblxuICAvLyBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLmF1dG91cGRhdGUudmVyc2lvbnMuXG4gIHZlcnNpb25zOiB7fVxufTtcblxuLy8gU3RvcmVzIGFjY2VwdGFibGUgY2xpZW50IHZlcnNpb25zLlxuY29uc3QgY2xpZW50VmVyc2lvbnMgPSBuZXcgQ2xpZW50VmVyc2lvbnMoKTtcblxuLy8gVGhlIGNsaWVudCBoYXNoIGluY2x1ZGVzIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18sIHNvIHdhaXQgdW50aWxcbi8vIGFsbCBwYWNrYWdlcyBoYXZlIGxvYWRlZCBhbmQgaGF2ZSBoYWQgYSBjaGFuY2UgdG8gcG9wdWxhdGUgdGhlXG4vLyBydW50aW1lIGNvbmZpZyBiZWZvcmUgdXNpbmcgdGhlIGNsaWVudCBoYXNoIGFzIG91ciBkZWZhdWx0IGF1dG9cbi8vIHVwZGF0ZSB2ZXJzaW9uIGlkLlxuXG4vLyBOb3RlOiBUZXN0cyBhbGxvdyBwZW9wbGUgdG8gb3ZlcnJpZGUgQXV0b3VwZGF0ZS5hdXRvdXBkYXRlVmVyc2lvbiBiZWZvcmVcbi8vIHN0YXJ0dXAuXG5BdXRvdXBkYXRlLmF1dG91cGRhdGVWZXJzaW9uID0gbnVsbDtcbkF1dG91cGRhdGUuYXV0b3VwZGF0ZVZlcnNpb25SZWZyZXNoYWJsZSA9IG51bGw7XG5BdXRvdXBkYXRlLmF1dG91cGRhdGVWZXJzaW9uQ29yZG92YSA9IG51bGw7XG5BdXRvdXBkYXRlLmFwcElkID0gX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5hcHBJZCA9IHByb2Nlc3MuZW52LkFQUF9JRDtcblxudmFyIHN5bmNRdWV1ZSA9IG5ldyBNZXRlb3IuX1N5bmNocm9ub3VzUXVldWUoKTtcblxuZnVuY3Rpb24gdXBkYXRlVmVyc2lvbnMoc2hvdWxkUmVsb2FkQ2xpZW50UHJvZ3JhbSkge1xuICAvLyBTdGVwIDE6IGxvYWQgdGhlIGN1cnJlbnQgY2xpZW50IHByb2dyYW0gb24gdGhlIHNlcnZlclxuICBpZiAoc2hvdWxkUmVsb2FkQ2xpZW50UHJvZ3JhbSkge1xuICAgIFdlYkFwcEludGVybmFscy5yZWxvYWRDbGllbnRQcm9ncmFtcygpO1xuICB9XG5cbiAgY29uc3Qge1xuICAgIC8vIElmIHRoZSBBVVRPVVBEQVRFX1ZFUlNJT04gZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgZGVmaW5lZCwgaXQgdGFrZXNcbiAgICAvLyBwcmVjZWRlbmNlLCBidXQgQXV0b3VwZGF0ZS5hdXRvdXBkYXRlVmVyc2lvbiBpcyBzdGlsbCBzdXBwb3J0ZWQgYXNcbiAgICAvLyBhIGZhbGxiYWNrLiBJbiBtb3N0IGNhc2VzIG5laXRoZXIgb2YgdGhlc2UgdmFsdWVzIHdpbGwgYmUgZGVmaW5lZC5cbiAgICBBVVRPVVBEQVRFX1ZFUlNJT04gPSBBdXRvdXBkYXRlLmF1dG91cGRhdGVWZXJzaW9uXG4gIH0gPSBwcm9jZXNzLmVudjtcblxuICAvLyBTdGVwIDI6IHVwZGF0ZSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLmF1dG91cGRhdGUudmVyc2lvbnMuXG4gIGNvbnN0IGNsaWVudEFyY2hzID0gT2JqZWN0LmtleXMoV2ViQXBwLmNsaWVudFByb2dyYW1zKTtcbiAgY2xpZW50QXJjaHMuZm9yRWFjaChhcmNoID0+IHtcbiAgICBBdXRvdXBkYXRlLnZlcnNpb25zW2FyY2hdID0ge1xuICAgICAgdmVyc2lvbjogQVVUT1VQREFURV9WRVJTSU9OIHx8XG4gICAgICAgIFdlYkFwcC5jYWxjdWxhdGVDbGllbnRIYXNoKGFyY2gpLFxuICAgICAgdmVyc2lvblJlZnJlc2hhYmxlOiBBVVRPVVBEQVRFX1ZFUlNJT04gfHxcbiAgICAgICAgV2ViQXBwLmNhbGN1bGF0ZUNsaWVudEhhc2hSZWZyZXNoYWJsZShhcmNoKSxcbiAgICAgIHZlcnNpb25Ob25SZWZyZXNoYWJsZTogQVVUT1VQREFURV9WRVJTSU9OIHx8XG4gICAgICAgIFdlYkFwcC5jYWxjdWxhdGVDbGllbnRIYXNoTm9uUmVmcmVzaGFibGUoYXJjaCksXG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gU3RlcCAzOiBmb3JtIHRoZSBuZXcgY2xpZW50IGJvaWxlcnBsYXRlIHdoaWNoIGNvbnRhaW5zIHRoZSB1cGRhdGVkXG4gIC8vIGFzc2V0cyBhbmQgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5cbiAgaWYgKHNob3VsZFJlbG9hZENsaWVudFByb2dyYW0pIHtcbiAgICBXZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVCb2lsZXJwbGF0ZSgpO1xuICB9XG5cbiAgLy8gU3RlcCA0OiB1cGRhdGUgdGhlIENsaWVudFZlcnNpb25zIGNvbGxlY3Rpb24uXG4gIC8vIFdlIHVzZSBgb25MaXN0ZW5pbmdgIGhlcmUgYmVjYXVzZSB3ZSBuZWVkIHRvIHVzZVxuICAvLyBgV2ViQXBwLmdldFJlZnJlc2hhYmxlQXNzZXRzYCwgd2hpY2ggaXMgb25seSBzZXQgYWZ0ZXJcbiAgLy8gYFdlYkFwcC5nZW5lcmF0ZUJvaWxlcnBsYXRlYCBpcyBjYWxsZWQgYnkgYG1haW5gIGluIHdlYmFwcC5cbiAgV2ViQXBwLm9uTGlzdGVuaW5nKCgpID0+IHtcbiAgICBjbGllbnRBcmNocy5mb3JFYWNoKGFyY2ggPT4ge1xuICAgICAgY29uc3QgcGF5bG9hZCA9IHtcbiAgICAgICAgLi4uQXV0b3VwZGF0ZS52ZXJzaW9uc1thcmNoXSxcbiAgICAgICAgYXNzZXRzOiBXZWJBcHAuZ2V0UmVmcmVzaGFibGVBc3NldHMoYXJjaCksXG4gICAgICB9O1xuXG4gICAgICBjbGllbnRWZXJzaW9ucy5zZXQoYXJjaCwgcGF5bG9hZCk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5NZXRlb3IucHVibGlzaChcbiAgXCJtZXRlb3JfYXV0b3VwZGF0ZV9jbGllbnRWZXJzaW9uc1wiLFxuICBmdW5jdGlvbiAoYXBwSWQpIHtcbiAgICAvLyBgbnVsbGAgaGFwcGVucyB3aGVuIGEgY2xpZW50IGRvZXNuJ3QgaGF2ZSBhbiBhcHBJZCBhbmQgcGFzc2VzXG4gICAgLy8gYHVuZGVmaW5lZGAgdG8gYE1ldGVvci5zdWJzY3JpYmVgLiBgdW5kZWZpbmVkYCBpcyB0cmFuc2xhdGVkIHRvXG4gICAgLy8gYG51bGxgIGFzIEpTT04gZG9lc24ndCBoYXZlIGB1bmRlZmluZWQuXG4gICAgY2hlY2soYXBwSWQsIE1hdGNoLk9uZU9mKFN0cmluZywgdW5kZWZpbmVkLCBudWxsKSk7XG5cbiAgICAvLyBEb24ndCBub3RpZnkgY2xpZW50cyB1c2luZyB3cm9uZyBhcHBJZCBzdWNoIGFzIG1vYmlsZSBhcHBzIGJ1aWx0IHdpdGggYVxuICAgIC8vIGRpZmZlcmVudCBzZXJ2ZXIgYnV0IHBvaW50aW5nIGF0IHRoZSBzYW1lIGxvY2FsIHVybFxuICAgIGlmIChBdXRvdXBkYXRlLmFwcElkICYmIGFwcElkICYmIEF1dG91cGRhdGUuYXBwSWQgIT09IGFwcElkKVxuICAgICAgcmV0dXJuIFtdO1xuXG4gICAgY29uc3Qgc3RvcCA9IGNsaWVudFZlcnNpb25zLndhdGNoKCh2ZXJzaW9uLCBpc05ldykgPT4ge1xuICAgICAgKGlzTmV3ID8gdGhpcy5hZGRlZCA6IHRoaXMuY2hhbmdlZClcbiAgICAgICAgLmNhbGwodGhpcywgXCJtZXRlb3JfYXV0b3VwZGF0ZV9jbGllbnRWZXJzaW9uc1wiLCB2ZXJzaW9uLl9pZCwgdmVyc2lvbik7XG4gICAgfSk7XG5cbiAgICB0aGlzLm9uU3RvcCgoKSA9PiBzdG9wKCkpO1xuICAgIHRoaXMucmVhZHkoKTtcbiAgfSxcbiAge2lzX2F1dG86IHRydWV9XG4pO1xuXG5NZXRlb3Iuc3RhcnR1cChmdW5jdGlvbiAoKSB7XG4gIHVwZGF0ZVZlcnNpb25zKGZhbHNlKTtcblxuICAvLyBGb3JjZSBhbnkgY29ubmVjdGVkIGNsaWVudHMgdGhhdCBhcmUgc3RpbGwgbG9va2luZyBmb3IgdGhlc2Ugb2xkZXJcbiAgLy8gZG9jdW1lbnQgSURzIHRvIHJlbG9hZC5cbiAgW1widmVyc2lvblwiLFxuICAgXCJ2ZXJzaW9uLXJlZnJlc2hhYmxlXCIsXG4gICBcInZlcnNpb24tY29yZG92YVwiLFxuICBdLmZvckVhY2goX2lkID0+IHtcbiAgICBjbGllbnRWZXJzaW9ucy5zZXQoX2lkLCB7XG4gICAgICB2ZXJzaW9uOiBcIm91dGRhdGVkXCJcbiAgICB9KTtcbiAgfSk7XG59KTtcblxudmFyIGZ1dCA9IG5ldyBGdXR1cmUoKTtcblxuLy8gV2Ugb25seSB3YW50ICdyZWZyZXNoJyB0byB0cmlnZ2VyICd1cGRhdGVWZXJzaW9ucycgQUZURVIgb25MaXN0ZW4sXG4vLyBzbyB3ZSBhZGQgYSBxdWV1ZWQgdGFzayB0aGF0IHdhaXRzIGZvciBvbkxpc3RlbiBiZWZvcmUgJ3JlZnJlc2gnIGNhbiBxdWV1ZVxuLy8gdGFza3MuIE5vdGUgdGhhdCB0aGUgYG9uTGlzdGVuaW5nYCBjYWxsYmFja3MgZG8gbm90IGZpcmUgdW50aWwgYWZ0ZXJcbi8vIE1ldGVvci5zdGFydHVwLCBzbyB0aGVyZSBpcyBubyBjb25jZXJuIHRoYXQgdGhlICd1cGRhdGVWZXJzaW9ucycgY2FsbHMgZnJvbVxuLy8gJ3JlZnJlc2gnIHdpbGwgb3ZlcmxhcCB3aXRoIHRoZSBgdXBkYXRlVmVyc2lvbnNgIGNhbGwgZnJvbSBNZXRlb3Iuc3RhcnR1cC5cblxuc3luY1F1ZXVlLnF1ZXVlVGFzayhmdW5jdGlvbiAoKSB7XG4gIGZ1dC53YWl0KCk7XG59KTtcblxuV2ViQXBwLm9uTGlzdGVuaW5nKGZ1bmN0aW9uICgpIHtcbiAgZnV0LnJldHVybigpO1xufSk7XG5cbmZ1bmN0aW9uIGVucXVldWVWZXJzaW9uc1JlZnJlc2goKSB7XG4gIHN5bmNRdWV1ZS5xdWV1ZVRhc2soZnVuY3Rpb24gKCkge1xuICAgIHVwZGF0ZVZlcnNpb25zKHRydWUpO1xuICB9KTtcbn1cblxuLy8gTGlzdGVuIGZvciBtZXNzYWdlcyBwZXJ0YWluaW5nIHRvIHRoZSBjbGllbnQtcmVmcmVzaCB0b3BpYy5cbmltcG9ydCB7IG9uTWVzc2FnZSB9IGZyb20gXCJtZXRlb3IvaW50ZXItcHJvY2Vzcy1tZXNzYWdpbmdcIjtcbm9uTWVzc2FnZShcImNsaWVudC1yZWZyZXNoXCIsIGVucXVldWVWZXJzaW9uc1JlZnJlc2gpO1xuXG4vLyBBbm90aGVyIHdheSB0byB0ZWxsIHRoZSBwcm9jZXNzIHRvIHJlZnJlc2g6IHNlbmQgU0lHSFVQIHNpZ25hbFxucHJvY2Vzcy5vbignU0lHSFVQJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChmdW5jdGlvbiAoKSB7XG4gIGVucXVldWVWZXJzaW9uc1JlZnJlc2goKTtcbn0sIFwiaGFuZGxpbmcgU0lHSFVQIHNpZ25hbCBmb3IgcmVmcmVzaFwiKSk7XG4iLCJpbXBvcnQgeyBUcmFja2VyIH0gZnJvbSBcIm1ldGVvci90cmFja2VyXCI7XG5cbmV4cG9ydCBjbGFzcyBDbGllbnRWZXJzaW9ucyB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuX3ZlcnNpb25zID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuX3dhdGNoQ2FsbGJhY2tzID0gbmV3IFNldCgpO1xuICB9XG5cbiAgLy8gQ3JlYXRlcyBhIExpdmVkYXRhIHN0b3JlIGZvciB1c2Ugd2l0aCBgTWV0ZW9yLmNvbm5lY3Rpb24ucmVnaXN0ZXJTdG9yZWAuXG4gIC8vIEFmdGVyIHRoZSBzdG9yZSBpcyByZWdpc3RlcmVkLCBkb2N1bWVudCB1cGRhdGVzIHJlcG9ydGVkIGJ5IExpdmVkYXRhIGFyZVxuICAvLyBtZXJnZWQgd2l0aCB0aGUgZG9jdW1lbnRzIGluIHRoaXMgYENsaWVudFZlcnNpb25zYCBpbnN0YW5jZS5cbiAgY3JlYXRlU3RvcmUoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHVwZGF0ZTogKHsgaWQsIG1zZywgZmllbGRzIH0pID0+IHtcbiAgICAgICAgaWYgKG1zZyA9PT0gXCJhZGRlZFwiIHx8IG1zZyA9PT0gXCJjaGFuZ2VkXCIpIHtcbiAgICAgICAgICB0aGlzLnNldChpZCwgZmllbGRzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBoYXNWZXJzaW9ucygpIHtcbiAgICByZXR1cm4gdGhpcy5fdmVyc2lvbnMuc2l6ZSA+IDA7XG4gIH1cblxuICBnZXQoaWQpIHtcbiAgICByZXR1cm4gdGhpcy5fdmVyc2lvbnMuZ2V0KGlkKTtcbiAgfVxuXG4gIC8vIEFkZHMgb3IgdXBkYXRlcyBhIHZlcnNpb24gZG9jdW1lbnQgYW5kIGludm9rZXMgcmVnaXN0ZXJlZCBjYWxsYmFja3MgZm9yIHRoZVxuICAvLyBhZGRlZC91cGRhdGVkIGRvY3VtZW50LiBJZiBhIGRvY3VtZW50IHdpdGggdGhlIGdpdmVuIElEIGFscmVhZHkgZXhpc3RzLCBpdHNcbiAgLy8gZmllbGRzIGFyZSBtZXJnZWQgd2l0aCBgZmllbGRzYC5cbiAgc2V0KGlkLCBmaWVsZHMpIHtcbiAgICBsZXQgdmVyc2lvbiA9IHRoaXMuX3ZlcnNpb25zLmdldChpZCk7XG4gICAgbGV0IGlzTmV3ID0gZmFsc2U7XG5cbiAgICBpZiAodmVyc2lvbikge1xuICAgICAgT2JqZWN0LmFzc2lnbih2ZXJzaW9uLCBmaWVsZHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2ZXJzaW9uID0ge1xuICAgICAgICBfaWQ6IGlkLFxuICAgICAgICAuLi5maWVsZHNcbiAgICAgIH07XG5cbiAgICAgIGlzTmV3ID0gdHJ1ZTtcbiAgICAgIHRoaXMuX3ZlcnNpb25zLnNldChpZCwgdmVyc2lvbik7XG4gICAgfVxuXG4gICAgdGhpcy5fd2F0Y2hDYWxsYmFja3MuZm9yRWFjaCgoeyBmbiwgZmlsdGVyIH0pID0+IHtcbiAgICAgIGlmICghIGZpbHRlciB8fCBmaWx0ZXIgPT09IHZlcnNpb24uX2lkKSB7XG4gICAgICAgIGZuKHZlcnNpb24sIGlzTmV3KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8vIFJlZ2lzdGVycyBhIGNhbGxiYWNrIHRoYXQgd2lsbCBiZSBpbnZva2VkIHdoZW4gYSB2ZXJzaW9uIGRvY3VtZW50IGlzIGFkZGVkXG4gIC8vIG9yIGNoYW5nZWQuIENhbGxpbmcgdGhlIGZ1bmN0aW9uIHJldHVybmVkIGJ5IGB3YXRjaGAgcmVtb3ZlcyB0aGUgY2FsbGJhY2suXG4gIC8vIElmIGBza2lwSW5pdGlhbGAgaXMgdHJ1ZSwgdGhlIGNhbGxiYWNrIGlzbid0IGJlIGludm9rZWQgZm9yIGV4aXN0aW5nXG4gIC8vIGRvY3VtZW50cy4gSWYgYGZpbHRlcmAgaXMgc2V0LCB0aGUgY2FsbGJhY2sgaXMgb25seSBpbnZva2VkIGZvciBkb2N1bWVudHNcbiAgLy8gd2l0aCBJRCBgZmlsdGVyYC5cbiAgd2F0Y2goZm4sIHsgc2tpcEluaXRpYWwsIGZpbHRlciB9ID0ge30pIHtcbiAgICBpZiAoISBza2lwSW5pdGlhbCkge1xuICAgICAgY29uc3QgcmVzb2x2ZWQgPSBQcm9taXNlLnJlc29sdmUoKTtcblxuICAgICAgdGhpcy5fdmVyc2lvbnMuZm9yRWFjaCgodmVyc2lvbikgPT4ge1xuICAgICAgICBpZiAoISBmaWx0ZXIgfHwgZmlsdGVyID09PSB2ZXJzaW9uLl9pZCkge1xuICAgICAgICAgIHJlc29sdmVkLnRoZW4oKCkgPT4gZm4odmVyc2lvbiwgdHJ1ZSkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBjYWxsYmFjayA9IHsgZm4sIGZpbHRlciB9O1xuICAgIHRoaXMuX3dhdGNoQ2FsbGJhY2tzLmFkZChjYWxsYmFjayk7XG5cbiAgICByZXR1cm4gKCkgPT4gdGhpcy5fd2F0Y2hDYWxsYmFja3MuZGVsZXRlKGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8vIEEgcmVhY3RpdmUgZGF0YSBzb3VyY2UgZm9yIGBBdXRvdXBkYXRlLm5ld0NsaWVudEF2YWlsYWJsZWAuXG4gIG5ld0NsaWVudEF2YWlsYWJsZShpZCwgZmllbGRzLCBjdXJyZW50VmVyc2lvbikge1xuICAgIGZ1bmN0aW9uIGlzTmV3VmVyc2lvbih2ZXJzaW9uKSB7XG4gICAgICByZXR1cm4gKFxuICAgICAgICB2ZXJzaW9uLl9pZCA9PT0gaWQgJiZcbiAgICAgICAgZmllbGRzLnNvbWUoKGZpZWxkKSA9PiB2ZXJzaW9uW2ZpZWxkXSAhPT0gY3VycmVudFZlcnNpb25bZmllbGRdKVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zdCBkZXBlbmRlbmN5ID0gbmV3IFRyYWNrZXIuRGVwZW5kZW5jeSgpO1xuICAgIGNvbnN0IHZlcnNpb24gPSB0aGlzLmdldChpZCk7XG5cbiAgICBkZXBlbmRlbmN5LmRlcGVuZCgpO1xuXG4gICAgY29uc3Qgc3RvcCA9IHRoaXMud2F0Y2goXG4gICAgICAodmVyc2lvbikgPT4ge1xuICAgICAgICBpZiAoaXNOZXdWZXJzaW9uKHZlcnNpb24pKSB7XG4gICAgICAgICAgZGVwZW5kZW5jeS5jaGFuZ2VkKCk7XG4gICAgICAgICAgc3RvcCgpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgeyBza2lwSW5pdGlhbDogdHJ1ZSB9XG4gICAgKTtcblxuICAgIHJldHVybiAhISB2ZXJzaW9uICYmIGlzTmV3VmVyc2lvbih2ZXJzaW9uKTtcbiAgfVxufVxuIl19
