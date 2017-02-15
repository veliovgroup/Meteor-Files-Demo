(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Buffer = Package.modules.Buffer;
var process = Package.modules.process;
var Symbol = Package['ecmascript-runtime'].Symbol;
var Map = Package['ecmascript-runtime'].Map;
var Set = Package['ecmascript-runtime'].Set;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"shell-server":{"main.js":["./shell-server.js",function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/shell-server/main.js                                                                                   //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
module.import("./shell-server.js", {                                                                               // 1
  '*': function (v, k) {                                                                                           // 1
    exports[k] = v;                                                                                                // 1
  }                                                                                                                // 1
}, 0);                                                                                                             // 1
var listen = void 0;                                                                                               // 1
module.import("./shell-server.js", {                                                                               // 1
  "listen": function (v) {                                                                                         // 1
    listen = v;                                                                                                    // 1
  }                                                                                                                // 1
}, 1);                                                                                                             // 1
var shellDir = process.env.METEOR_SHELL_DIR;                                                                       // 4
                                                                                                                   //
if (shellDir) {                                                                                                    // 5
  listen(shellDir);                                                                                                // 6
}                                                                                                                  // 7
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"shell-server.js":["babel-runtime/helpers/classCallCheck","babel-runtime/helpers/typeof","assert","path","stream","fs","net","vm","underscore","repl",function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                 //
// packages/shell-server/shell-server.js                                                                           //
//                                                                                                                 //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                   //
var _classCallCheck2 = require("babel-runtime/helpers/classCallCheck");                                            //
                                                                                                                   //
var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);                                                   //
                                                                                                                   //
var _typeof2 = require("babel-runtime/helpers/typeof");                                                            //
                                                                                                                   //
var _typeof3 = _interopRequireDefault(_typeof2);                                                                   //
                                                                                                                   //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                  //
                                                                                                                   //
module.export({                                                                                                    // 1
  listen: function () {                                                                                            // 1
    return listen;                                                                                                 // 1
  },                                                                                                               // 1
  disable: function () {                                                                                           // 1
    return disable;                                                                                                // 1
  }                                                                                                                // 1
});                                                                                                                // 1
                                                                                                                   //
var assert = require("assert");                                                                                    // 1
                                                                                                                   //
var path = require("path");                                                                                        // 2
                                                                                                                   //
var stream = require("stream");                                                                                    // 3
                                                                                                                   //
var fs = require("fs");                                                                                            // 4
                                                                                                                   //
var net = require("net");                                                                                          // 5
                                                                                                                   //
var vm = require("vm");                                                                                            // 6
                                                                                                                   //
var _ = require("underscore");                                                                                     // 7
                                                                                                                   //
var INFO_FILE_MODE = parseInt("600", 8); // Only the owner can read or write.                                      // 8
                                                                                                                   //
var EXITING_MESSAGE = "Shell exiting..."; // Invoked by the server process to listen for incoming connections from
// shell clients. Each connection gets its own REPL instance.                                                      // 12
                                                                                                                   //
function listen(shellDir) {                                                                                        // 13
  function callback() {                                                                                            // 14
    new Server(shellDir).listen();                                                                                 // 15
  } // If the server is still in the very early stages of starting up,                                             // 16
  // Meteor.startup may not available yet.                                                                         // 19
                                                                                                                   //
                                                                                                                   //
  if ((typeof Meteor === "undefined" ? "undefined" : (0, _typeof3.default)(Meteor)) === "object") {                // 20
    Meteor.startup(callback);                                                                                      // 21
  } else if ((typeof __meteor_bootstrap__ === "undefined" ? "undefined" : (0, _typeof3.default)(__meteor_bootstrap__)) === "object") {
    var hooks = __meteor_bootstrap__.startupHooks;                                                                 // 23
                                                                                                                   //
    if (hooks) {                                                                                                   // 24
      hooks.push(callback);                                                                                        // 25
    } else {                                                                                                       // 26
      // As a fallback, just call the callback asynchronously.                                                     // 27
      setImmediate(callback);                                                                                      // 28
    }                                                                                                              // 29
  }                                                                                                                // 30
}                                                                                                                  // 31
                                                                                                                   //
function disable(shellDir) {                                                                                       // 34
  try {                                                                                                            // 35
    // Replace info.json with a file that says the shell server is                                                 // 36
    // disabled, so that any connected shell clients will fail to                                                  // 37
    // reconnect after the server process closes their sockets.                                                    // 38
    fs.writeFileSync(getInfoFile(shellDir), JSON.stringify({                                                       // 39
      status: "disabled",                                                                                          // 42
      reason: "Shell server has shut down."                                                                        // 43
    }) + "\n", {                                                                                                   // 41
      mode: INFO_FILE_MODE                                                                                         // 45
    });                                                                                                            // 45
  } catch (ignored) {}                                                                                             // 47
}                                                                                                                  // 48
                                                                                                                   //
var Server = function () {                                                                                         //
  function Server(shellDir) {                                                                                      // 51
    (0, _classCallCheck3.default)(this, Server);                                                                   // 51
    var self = this;                                                                                               // 52
    assert.ok(self instanceof Server);                                                                             // 53
    self.shellDir = shellDir;                                                                                      // 55
    self.key = Math.random().toString(36).slice(2);                                                                // 56
    self.server = net.createServer(function (socket) {                                                             // 58
      self.onConnection(socket);                                                                                   // 59
    }).on("error", function (err) {                                                                                // 60
      console.error(err.stack);                                                                                    // 61
    });                                                                                                            // 62
  }                                                                                                                // 63
                                                                                                                   //
  Server.prototype.listen = function () {                                                                          //
    function listen() {                                                                                            //
      var self = this;                                                                                             // 66
      var infoFile = getInfoFile(self.shellDir);                                                                   // 67
      fs.unlink(infoFile, function () {                                                                            // 69
        self.server.listen(0, "127.0.0.1", function () {                                                           // 70
          fs.writeFileSync(infoFile, JSON.stringify({                                                              // 71
            status: "enabled",                                                                                     // 72
            port: self.server.address().port,                                                                      // 73
            key: self.key                                                                                          // 74
          }) + "\n", {                                                                                             // 71
            mode: INFO_FILE_MODE                                                                                   // 76
          });                                                                                                      // 75
        });                                                                                                        // 78
      });                                                                                                          // 79
    }                                                                                                              // 80
                                                                                                                   //
    return listen;                                                                                                 //
  }();                                                                                                             //
                                                                                                                   //
  Server.prototype.onConnection = function () {                                                                    //
    function onConnection(socket) {                                                                                //
      var self = this; // Make sure this function doesn't try to write anything to the socket                      // 83
      // after it has been closed.                                                                                 // 86
                                                                                                                   //
      socket.on("close", function () {                                                                             // 87
        socket = null;                                                                                             // 88
      }); // If communication is not established within 1000ms of the first                                        // 89
      // connection, forcibly close the socket.                                                                    // 92
                                                                                                                   //
      var timeout = setTimeout(function () {                                                                       // 93
        if (socket) {                                                                                              // 94
          socket.removeAllListeners("data");                                                                       // 95
          socket.end(EXITING_MESSAGE + "\n");                                                                      // 96
        }                                                                                                          // 97
      }, 1000); // Let connecting clients configure certain REPL options by sending a                              // 98
      // JSON object over the socket. For example, only the client knows                                           // 101
      // whether it's running a TTY or an Emacs subshell or some other kind of                                     // 102
      // terminal, so the client must decide the value of options.terminal.                                        // 103
                                                                                                                   //
      readJSONFromStream(socket, function (error, options, replInputSocket) {                                      // 104
        clearTimeout(timeout);                                                                                     // 105
                                                                                                                   //
        if (error) {                                                                                               // 107
          socket = null;                                                                                           // 108
          console.error(error.stack);                                                                              // 109
          return;                                                                                                  // 110
        }                                                                                                          // 111
                                                                                                                   //
        if (options.key !== self.key) {                                                                            // 113
          if (socket) {                                                                                            // 114
            socket.end(EXITING_MESSAGE + "\n");                                                                    // 115
          }                                                                                                        // 116
                                                                                                                   //
          return;                                                                                                  // 117
        }                                                                                                          // 118
                                                                                                                   //
        delete options.key; // Set the columns to what is being requested by the client.                           // 119
                                                                                                                   //
        if (options.columns && socket) {                                                                           // 122
          socket.columns = options.columns;                                                                        // 123
        }                                                                                                          // 124
                                                                                                                   //
        delete options.columns;                                                                                    // 125
                                                                                                                   //
        if (options.evaluateAndExit) {                                                                             // 127
          evalCommand.call(Object.create(null), // Dummy repl object without ._RecoverableError.                   // 128
          "(" + options.evaluateAndExit.command + ")", null, // evalCommand ignores the context parameter, anyway  // 130
          options.evaluateAndExit.filename || "<meteor shell>", function (error, result) {                         // 132
            if (socket) {                                                                                          // 134
              var message = error ? {                                                                              // 135
                error: error + "",                                                                                 // 136
                code: 1                                                                                            // 137
              } : {                                                                                                // 135
                result: result                                                                                     // 139
              }; // Sending back a JSON payload allows the client to                                               // 138
              // distinguish between errors and successful results.                                                // 143
                                                                                                                   //
              socket.end(JSON.stringify(message) + "\n");                                                          // 144
            }                                                                                                      // 145
          });                                                                                                      // 146
          return;                                                                                                  // 148
        }                                                                                                          // 149
                                                                                                                   //
        delete options.evaluateAndExit; // Immutable options.                                                      // 150
                                                                                                                   //
        _.extend(options, {                                                                                        // 153
          input: replInputSocket,                                                                                  // 154
          output: socket                                                                                           // 155
        }); // Overridable options.                                                                                // 153
                                                                                                                   //
                                                                                                                   //
        _.defaults(options, {                                                                                      // 159
          prompt: "> ",                                                                                            // 160
          terminal: true,                                                                                          // 161
          useColors: true,                                                                                         // 162
          useGlobal: true,                                                                                         // 163
          ignoreUndefined: true                                                                                    // 164
        });                                                                                                        // 159
                                                                                                                   //
        self.startREPL(options);                                                                                   // 167
      });                                                                                                          // 168
    }                                                                                                              // 169
                                                                                                                   //
    return onConnection;                                                                                           //
  }();                                                                                                             //
                                                                                                                   //
  Server.prototype.startREPL = function () {                                                                       //
    function startREPL(options) {                                                                                  //
      var self = this; // Make sure this function doesn't try to write anything to the output                      // 172
      // stream after it has been closed.                                                                          // 175
                                                                                                                   //
      options.output.on("close", function () {                                                                     // 176
        options.output = null;                                                                                     // 177
      });                                                                                                          // 178
                                                                                                                   //
      var repl = self.repl = require("repl").start(options); // History persists across shell sessions!            // 180
                                                                                                                   //
                                                                                                                   //
      self.initializeHistory(); // Save the global `_` object in the server.  This is probably defined by the      // 183
      // underscore package.  It is unlikely to be the same object as the `var _ =                                 // 186
      // require('underscore')` in this file!                                                                      // 187
                                                                                                                   //
      var originalUnderscore = repl.context._;                                                                     // 188
      Object.defineProperty(repl.context, "_", {                                                                   // 190
        // Force the global _ variable to remain bound to underscore.                                              // 191
        get: function () {                                                                                         // 192
          return originalUnderscore;                                                                               // 192
        },                                                                                                         // 192
        // Expose the last REPL result as __ instead of _.                                                         // 194
        set: function (lastResult) {                                                                               // 195
          repl.context.__ = lastResult;                                                                            // 196
        },                                                                                                         // 197
        enumerable: true,                                                                                          // 199
        // Allow this property to be (re)defined more than once (e.g. each                                         // 201
        // time the server restarts).                                                                              // 202
        configurable: true                                                                                         // 203
      });                                                                                                          // 190
                                                                                                                   //
      if (Package.modules) {                                                                                       // 206
        // Use the same `require` function and `module` object visible to the                                      // 207
        // application.                                                                                            // 208
        var toBeInstalled = {};                                                                                    // 209
        var shellModuleName = "meteor-shell-" + Math.random().toString(36).slice(2) + ".js";                       // 210
                                                                                                                   //
        toBeInstalled[shellModuleName] = function (require, exports, module) {                                     // 213
          repl.context.module = module;                                                                            // 214
          repl.context.require = require; // Tab completion sometimes uses require.extensions, but only for        // 215
          // the keys.                                                                                             // 218
                                                                                                                   //
          require.extensions = {                                                                                   // 219
            ".js": true,                                                                                           // 220
            ".json": true,                                                                                         // 221
            ".node": true                                                                                          // 222
          };                                                                                                       // 219
        }; // This populates repl.context.{module,require} by evaluating the                                       // 224
        // module defined above.                                                                                   // 227
                                                                                                                   //
                                                                                                                   //
        Package.modules.meteorInstall(toBeInstalled)("./" + shellModuleName);                                      // 228
      }                                                                                                            // 229
                                                                                                                   //
      repl.context.repl = repl; // Some improvements to the existing help messages.                                // 231
                                                                                                                   //
      function addHelp(cmd, helpText) {                                                                            // 234
        var info = repl.commands[cmd] || repl.commands["." + cmd];                                                 // 235
                                                                                                                   //
        if (info) {                                                                                                // 236
          info.help = helpText;                                                                                    // 237
        }                                                                                                          // 238
      }                                                                                                            // 239
                                                                                                                   //
      addHelp("break", "Terminate current command input and display new prompt");                                  // 240
      addHelp("exit", "Disconnect from server and leave shell");                                                   // 241
      addHelp("help", "Show this help information"); // When the REPL exits, signal the attached client to exit by sending it
      // the special EXITING_MESSAGE.                                                                              // 245
                                                                                                                   //
      repl.on("exit", function () {                                                                                // 246
        if (options.output) {                                                                                      // 247
          options.output.write(EXITING_MESSAGE + "\n");                                                            // 248
          options.output.end();                                                                                    // 249
        }                                                                                                          // 250
      }); // When the server process exits, end the output stream but do not                                       // 251
      // signal the attached client to exit.                                                                       // 254
                                                                                                                   //
      process.on("exit", function () {                                                                             // 255
        if (options.output) {                                                                                      // 256
          options.output.end();                                                                                    // 257
        }                                                                                                          // 258
      }); // This Meteor-specific shell command rebuilds the application as if a                                   // 259
      // change was made to server code.                                                                           // 262
                                                                                                                   //
      repl.defineCommand("reload", {                                                                               // 263
        help: "Restart the server and the shell",                                                                  // 264
        action: function () {                                                                                      // 265
          process.exit(0);                                                                                         // 266
        }                                                                                                          // 267
      }); // Trigger one recoverable error using the default eval function, just                                   // 263
      // to capture the Recoverable error constructor, so that our custom                                          // 271
      // evalCommand function can wrap recoverable errors properly.                                                // 272
                                                                                                                   //
      repl.eval("{", null, "<meteor shell>", function (error) {                                                    // 273
        // Capture the Recoverable error constructor.                                                              // 276
        repl._RecoverableError = error && error.constructor; // Now set repl.eval to the actual evalCommand function that we want
        // to use, bound to repl._domain if necessary.                                                             // 280
                                                                                                                   //
        repl.eval = repl._domain ? repl._domain.bind(evalCommand) : evalCommand; // Terminate the partial evaluation of the { command.
                                                                                                                   //
        repl.commands["break"].action.call(repl);                                                                  // 286
      });                                                                                                          // 287
    }                                                                                                              // 289
                                                                                                                   //
    return startREPL;                                                                                              //
  }(); // This function allows a persistent history of shell commands to be saved                                  //
  // to and loaded from .meteor/local/shell-history.                                                               // 292
                                                                                                                   //
                                                                                                                   //
  Server.prototype.initializeHistory = function () {                                                               //
    function initializeHistory() {                                                                                 //
      var self = this;                                                                                             // 294
      var rli = self.repl.rli;                                                                                     // 295
      var historyFile = getHistoryFile(self.shellDir);                                                             // 296
      var historyFd = fs.openSync(historyFile, "a+");                                                              // 297
      var historyLines = fs.readFileSync(historyFile, "utf8").split("\n");                                         // 298
      var seenLines = Object.create(null);                                                                         // 299
                                                                                                                   //
      if (!rli.history) {                                                                                          // 301
        rli.history = [];                                                                                          // 302
        rli.historyIndex = -1;                                                                                     // 303
      }                                                                                                            // 304
                                                                                                                   //
      while (rli.history && historyLines.length > 0) {                                                             // 306
        var line = historyLines.pop();                                                                             // 307
                                                                                                                   //
        if (line && /\S/.test(line) && !seenLines[line]) {                                                         // 308
          rli.history.push(line);                                                                                  // 309
          seenLines[line] = true;                                                                                  // 310
        }                                                                                                          // 311
      }                                                                                                            // 312
                                                                                                                   //
      rli.addListener("line", function (line) {                                                                    // 314
        if (historyFd >= 0 && /\S/.test(line)) {                                                                   // 315
          fs.writeSync(historyFd, line + "\n");                                                                    // 316
        }                                                                                                          // 317
      });                                                                                                          // 318
      self.repl.on("exit", function () {                                                                           // 320
        fs.closeSync(historyFd);                                                                                   // 321
        historyFd = -1;                                                                                            // 322
      });                                                                                                          // 323
    }                                                                                                              // 324
                                                                                                                   //
    return initializeHistory;                                                                                      //
  }();                                                                                                             //
                                                                                                                   //
  return Server;                                                                                                   //
}();                                                                                                               //
                                                                                                                   //
function readJSONFromStream(inputStream, callback) {                                                               // 327
  var outputStream = new stream.PassThrough();                                                                     // 328
  var dataSoFar = "";                                                                                              // 329
                                                                                                                   //
  function onData(buffer) {                                                                                        // 331
    var lines = buffer.toString("utf8").split("\n");                                                               // 332
                                                                                                                   //
    while (lines.length > 0) {                                                                                     // 334
      dataSoFar += lines.shift();                                                                                  // 335
                                                                                                                   //
      try {                                                                                                        // 337
        var json = JSON.parse(dataSoFar);                                                                          // 338
      } catch (error) {                                                                                            // 339
        if (error instanceof SyntaxError) {                                                                        // 340
          continue;                                                                                                // 341
        }                                                                                                          // 342
                                                                                                                   //
        return finish(error);                                                                                      // 344
      }                                                                                                            // 345
                                                                                                                   //
      if (lines.length > 0) {                                                                                      // 347
        outputStream.write(lines.join("\n"));                                                                      // 348
      }                                                                                                            // 349
                                                                                                                   //
      inputStream.pipe(outputStream);                                                                              // 351
      return finish(null, json);                                                                                   // 353
    }                                                                                                              // 354
  }                                                                                                                // 355
                                                                                                                   //
  function onClose() {                                                                                             // 357
    finish(new Error("stream unexpectedly closed"));                                                               // 358
  }                                                                                                                // 359
                                                                                                                   //
  var finished = false;                                                                                            // 361
                                                                                                                   //
  function finish(error, json) {                                                                                   // 362
    if (!finished) {                                                                                               // 363
      finished = true;                                                                                             // 364
      inputStream.removeListener("data", onData);                                                                  // 365
      inputStream.removeListener("error", finish);                                                                 // 366
      inputStream.removeListener("close", onClose);                                                                // 367
      callback(error, json, outputStream);                                                                         // 368
    }                                                                                                              // 369
  }                                                                                                                // 370
                                                                                                                   //
  inputStream.on("data", onData);                                                                                  // 372
  inputStream.on("error", finish);                                                                                 // 373
  inputStream.on("close", onClose);                                                                                // 374
}                                                                                                                  // 375
                                                                                                                   //
function getInfoFile(shellDir) {                                                                                   // 377
  return path.join(shellDir, "info.json");                                                                         // 378
}                                                                                                                  // 379
                                                                                                                   //
function getHistoryFile(shellDir) {                                                                                // 381
  return path.join(shellDir, "history");                                                                           // 382
} // Shell commands need to be executed in a Fiber in case they call into                                          // 383
// code that yields. Using a Promise is an even better idea, since it runs                                         // 386
// its callbacks in Fibers drawn from a pool, so the Fibers are recycled.                                          // 387
                                                                                                                   //
                                                                                                                   //
var evalCommandPromise = Promise.resolve();                                                                        // 388
                                                                                                                   //
function evalCommand(command, context, filename, callback) {                                                       // 390
  var repl = this;                                                                                                 // 391
                                                                                                                   //
  function finish(error, result) {                                                                                 // 393
    if (error) {                                                                                                   // 394
      if (repl._RecoverableError && isRecoverableError(error, repl)) {                                             // 395
        callback(new repl._RecoverableError(error));                                                               // 397
      } else {                                                                                                     // 398
        callback(error);                                                                                           // 399
      }                                                                                                            // 400
    } else {                                                                                                       // 401
      callback(null, result);                                                                                      // 402
    }                                                                                                              // 403
  }                                                                                                                // 404
                                                                                                                   //
  if (Package.ecmascript) {                                                                                        // 406
    var noParens = stripParens(command);                                                                           // 407
                                                                                                                   //
    if (noParens !== command) {                                                                                    // 408
      var classMatch = /^\s*class\s+(\w+)/.exec(noParens);                                                         // 409
                                                                                                                   //
      if (classMatch && classMatch[1] !== "extends") {                                                             // 410
        // If the command looks like a named ES2015 class, we remove the                                           // 411
        // extra layer of parentheses added by the REPL so that the                                                // 412
        // command will be evaluated as a class declaration rather than as                                         // 413
        // a named class expression. Note that you can still type (class A                                         // 414
        // {}) explicitly to evaluate a named class expression. The REPL                                           // 415
        // code that calls evalCommand handles named function expressions                                          // 416
        // similarly (first with and then without parentheses), but that                                           // 417
        // code doesn't know about ES2015 classes, which is why we have to                                         // 418
        // handle them here.                                                                                       // 419
        command = noParens;                                                                                        // 420
      }                                                                                                            // 421
    }                                                                                                              // 422
                                                                                                                   //
    try {                                                                                                          // 424
      command = Package.ecmascript.ECMAScript.compileForShell(command);                                            // 425
    } catch (error) {                                                                                              // 426
      finish(error);                                                                                               // 427
      return;                                                                                                      // 428
    }                                                                                                              // 429
  }                                                                                                                // 430
                                                                                                                   //
  try {                                                                                                            // 432
    var script = new vm.Script(command, {                                                                          // 433
      filename: filename,                                                                                          // 434
      displayErrors: false                                                                                         // 435
    });                                                                                                            // 433
  } catch (parseError) {                                                                                           // 437
    finish(parseError);                                                                                            // 438
    return;                                                                                                        // 439
  }                                                                                                                // 440
                                                                                                                   //
  evalCommandPromise.then(function () {                                                                            // 442
    finish(null, script.runInThisContext());                                                                       // 443
  }).catch(finish);                                                                                                // 444
}                                                                                                                  // 445
                                                                                                                   //
function stripParens(command) {                                                                                    // 447
  if (command.charAt(0) === "(" && command.charAt(command.length - 1) === ")") {                                   // 448
    return command.slice(1, command.length - 1);                                                                   // 450
  }                                                                                                                // 451
                                                                                                                   //
  return command;                                                                                                  // 452
} // The bailOnIllegalToken and isRecoverableError functions are taken from                                        // 453
// https://github.com/nodejs/node/blob/c9e670ea2a/lib/repl.js#L1227-L1253                                          // 456
                                                                                                                   //
                                                                                                                   //
function bailOnIllegalToken(parser) {                                                                              // 457
  return parser._literal === null && !parser.blockComment && !parser.regExpLiteral;                                // 458
} // If the error is that we've unexpectedly ended the input,                                                      // 461
// then let the user try to recover by adding more input.                                                          // 464
                                                                                                                   //
                                                                                                                   //
function isRecoverableError(e, repl) {                                                                             // 465
  if (e && e.name === 'SyntaxError') {                                                                             // 466
    var message = e.message;                                                                                       // 467
                                                                                                                   //
    if (message === 'Unterminated template literal' || message === 'Missing } in template expression') {           // 468
      repl._inTemplateLiteral = true;                                                                              // 470
      return true;                                                                                                 // 471
    }                                                                                                              // 472
                                                                                                                   //
    if (message.startsWith('Unexpected end of input') || message.startsWith('missing ) after argument list') || message.startsWith('Unexpected token')) {
      return true;                                                                                                 // 477
    }                                                                                                              // 478
                                                                                                                   //
    if (message === 'Invalid or unexpected token') {                                                               // 480
      return !bailOnIllegalToken(repl.lineParser);                                                                 // 481
    }                                                                                                              // 482
  }                                                                                                                // 483
                                                                                                                   //
  return false;                                                                                                    // 485
}                                                                                                                  // 486
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}]}}}},{"extensions":[".js",".json"]});
var exports = require("./node_modules/meteor/shell-server/main.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['shell-server'] = exports;

})();

//# sourceMappingURL=shell-server.js.map
