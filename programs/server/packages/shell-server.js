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

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/shell-server/main.js                                                                                //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
module.import("./shell-server.js",{'*':function(v,k){exports[k]=v;}});var listen;module.import("./shell-server.js",{"listen":function(v){listen=v}});
                                                                                                                // 2
                                                                                                                //
var shellDir = process.env.METEOR_SHELL_DIR;                                                                    // 4
if (shellDir) {                                                                                                 // 5
  listen(shellDir);                                                                                             // 6
}                                                                                                               // 7
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"shell-server.js":["babel-runtime/helpers/classCallCheck","babel-runtime/helpers/typeof","assert","path","stream","fs","net","tty","vm","underscore","repl",function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/shell-server/shell-server.js                                                                        //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
module.export({listen:function(){return listen},disable:function(){return disable}});var _classCallCheck;module.import("babel-runtime/helpers/classCallCheck",{"default":function(v){_classCallCheck=v}});var _typeof;module.import("babel-runtime/helpers/typeof",{"default":function(v){_typeof=v}});
                                                                                                                //
var assert = require("assert");                                                                                 // 1
var path = require("path");                                                                                     // 2
var stream = require("stream");                                                                                 // 3
var fs = require("fs");                                                                                         // 4
var net = require("net");                                                                                       // 5
var tty = require("tty");                                                                                       // 6
var vm = require("vm");                                                                                         // 7
var _ = require("underscore");                                                                                  // 8
var INFO_FILE_MODE = parseInt("600", 8); // Only the owner can read or write.                                   // 9
var EXITING_MESSAGE = "Shell exiting...";                                                                       // 10
                                                                                                                //
// Invoked by the server process to listen for incoming connections from                                        //
// shell clients. Each connection gets its own REPL instance.                                                   //
function listen(shellDir) {                                                                                     // 14
  function callback() {                                                                                         // 15
    new Server(shellDir).listen();                                                                              // 16
  }                                                                                                             // 17
                                                                                                                //
  // If the server is still in the very early stages of starting up,                                            //
  // Meteor.startup may not available yet.                                                                      //
  if ((typeof Meteor === "undefined" ? "undefined" : _typeof(Meteor)) === "object") {                           // 21
    Meteor.startup(callback);                                                                                   // 22
  } else if ((typeof __meteor_bootstrap__ === "undefined" ? "undefined" : _typeof(__meteor_bootstrap__)) === "object") {
    var hooks = __meteor_bootstrap__.startupHooks;                                                              // 24
    if (hooks) {                                                                                                // 25
      hooks.push(callback);                                                                                     // 26
    } else {                                                                                                    // 27
      // As a fallback, just call the callback asynchronously.                                                  //
      setImmediate(callback);                                                                                   // 29
    }                                                                                                           // 30
  }                                                                                                             // 31
}                                                                                                               // 32
                                                                                                                //
// Disabling the shell causes all attached clients to disconnect and exit.                                      //
function disable(shellDir) {                                                                                    // 35
  try {                                                                                                         // 36
    // Replace info.json with a file that says the shell server is                                              //
    // disabled, so that any connected shell clients will fail to                                               //
    // reconnect after the server process closes their sockets.                                                 //
    fs.writeFileSync(getInfoFile(shellDir), JSON.stringify({                                                    // 40
      status: "disabled",                                                                                       // 43
      reason: "Shell server has shut down."                                                                     // 44
    }) + "\n", { mode: INFO_FILE_MODE });                                                                       // 42
  } catch (ignored) {}                                                                                          // 48
}                                                                                                               // 49
                                                                                                                //
var Server = function () {                                                                                      //
  function Server(shellDir) {                                                                                   // 52
    _classCallCheck(this, Server);                                                                              // 52
                                                                                                                //
    var self = this;                                                                                            // 53
    assert.ok(self instanceof Server);                                                                          // 54
                                                                                                                //
    self.shellDir = shellDir;                                                                                   // 56
    self.key = Math.random().toString(36).slice(2);                                                             // 57
                                                                                                                //
    self.server = net.createServer(function (socket) {                                                          // 59
      self.onConnection(socket);                                                                                // 60
    }).on("error", function (err) {                                                                             // 61
      console.error(err.stack);                                                                                 // 62
    });                                                                                                         // 63
  }                                                                                                             // 64
                                                                                                                //
  Server.prototype.listen = function listen() {                                                                 //
    var self = this;                                                                                            // 67
    var infoFile = getInfoFile(self.shellDir);                                                                  // 68
                                                                                                                //
    fs.unlink(infoFile, function () {                                                                           // 70
      self.server.listen(0, "127.0.0.1", function () {                                                          // 71
        fs.writeFileSync(infoFile, JSON.stringify({                                                             // 72
          status: "enabled",                                                                                    // 73
          port: self.server.address().port,                                                                     // 74
          key: self.key                                                                                         // 75
        }) + "\n", {                                                                                            // 72
          mode: INFO_FILE_MODE                                                                                  // 77
        });                                                                                                     // 76
      });                                                                                                       // 79
    });                                                                                                         // 80
  };                                                                                                            // 81
                                                                                                                //
  Server.prototype.onConnection = function onConnection(socket) {                                               //
    var self = this;                                                                                            // 84
                                                                                                                //
    // Make sure this function doesn't try to write anything to the socket                                      //
    // after it has been closed.                                                                                //
    socket.on("close", function () {                                                                            // 88
      socket = null;                                                                                            // 89
    });                                                                                                         // 90
                                                                                                                //
    // If communication is not established within 1000ms of the first                                           //
    // connection, forcibly close the socket.                                                                   //
    var timeout = setTimeout(function () {                                                                      // 94
      if (socket) {                                                                                             // 95
        socket.removeAllListeners("data");                                                                      // 96
        socket.end(EXITING_MESSAGE + "\n");                                                                     // 97
      }                                                                                                         // 98
    }, 1000);                                                                                                   // 99
                                                                                                                //
    // Let connecting clients configure certain REPL options by sending a                                       //
    // JSON object over the socket. For example, only the client knows                                          //
    // whether it's running a TTY or an Emacs subshell or some other kind of                                    //
    // terminal, so the client must decide the value of options.terminal.                                       //
    readJSONFromStream(socket, function (error, options, replInputSocket) {                                     // 105
      clearTimeout(timeout);                                                                                    // 106
                                                                                                                //
      if (error) {                                                                                              // 108
        socket = null;                                                                                          // 109
        console.error(error.stack);                                                                             // 110
        return;                                                                                                 // 111
      }                                                                                                         // 112
                                                                                                                //
      if (options.key !== self.key) {                                                                           // 114
        if (socket) {                                                                                           // 115
          socket.end(EXITING_MESSAGE + "\n");                                                                   // 116
        }                                                                                                       // 117
        return;                                                                                                 // 118
      }                                                                                                         // 119
      delete options.key;                                                                                       // 120
                                                                                                                //
      if (options.evaluateAndExit) {                                                                            // 122
        evalCommand.call(Object.create(null), // Dummy repl object without ._RecoverableError.                  // 123
        "(" + options.evaluateAndExit.command + ")", null, // evalCommand ignores the context parameter, anyway
        options.evaluateAndExit.filename || "<meteor shell>", function (error, result) {                        // 127
          if (socket) {                                                                                         // 129
            var message = error ? {                                                                             // 130
              error: error + "",                                                                                // 131
              code: 1                                                                                           // 132
            } : {                                                                                               // 130
              result: result                                                                                    // 134
            };                                                                                                  // 133
                                                                                                                //
            // Sending back a JSON payload allows the client to                                                 //
            // distinguish between errors and successful results.                                               //
            socket.end(JSON.stringify(message) + "\n");                                                         // 139
          }                                                                                                     // 140
        });                                                                                                     // 141
        return;                                                                                                 // 143
      }                                                                                                         // 144
      delete options.evaluateAndExit;                                                                           // 145
                                                                                                                //
      // Immutable options.                                                                                     //
      _.extend(options, {                                                                                       // 148
        input: replInputSocket,                                                                                 // 149
        output: socket                                                                                          // 150
      });                                                                                                       // 148
                                                                                                                //
      // Overridable options.                                                                                   //
      _.defaults(options, {                                                                                     // 154
        prompt: "> ",                                                                                           // 155
        terminal: true,                                                                                         // 156
        useColors: true,                                                                                        // 157
        useGlobal: true,                                                                                        // 158
        ignoreUndefined: true                                                                                   // 159
      });                                                                                                       // 154
                                                                                                                //
      self.startREPL(options);                                                                                  // 162
    });                                                                                                         // 163
  };                                                                                                            // 164
                                                                                                                //
  Server.prototype.startREPL = function startREPL(options) {                                                    //
    var self = this;                                                                                            // 167
                                                                                                                //
    if (!options.output.columns) {                                                                              // 169
      // The REPL's tab completion logic assumes process.stdout is a TTY,                                       //
      // and while that isn't technically true here, we can get tab                                             //
      // completion to behave correctly if we fake the .columns property.                                       //
      options.output.columns = getTerminalWidth();                                                              // 173
    }                                                                                                           // 174
                                                                                                                //
    // Make sure this function doesn't try to write anything to the output                                      //
    // stream after it has been closed.                                                                         //
    options.output.on("close", function () {                                                                    // 178
      options.output = null;                                                                                    // 179
    });                                                                                                         // 180
                                                                                                                //
    var repl = self.repl = require("repl").start(options);                                                      // 182
                                                                                                                //
    // History persists across shell sessions!                                                                  //
    self.initializeHistory();                                                                                   // 185
                                                                                                                //
    // Save the global `_` object in the server.  This is probably defined by the                               //
    // underscore package.  It is unlikely to be the same object as the `var _ =                                //
    // require('underscore')` in this file!                                                                     //
    var originalUnderscore = repl.context._;                                                                    // 190
                                                                                                                //
    Object.defineProperty(repl.context, "_", {                                                                  // 192
      // Force the global _ variable to remain bound to underscore.                                             //
      get: function get() {                                                                                     // 194
        return originalUnderscore;                                                                              // 194
      },                                                                                                        // 194
                                                                                                                //
      // Expose the last REPL result as __ instead of _.                                                        //
      set: function set(lastResult) {                                                                           // 197
        repl.context.__ = lastResult;                                                                           // 198
      },                                                                                                        // 199
                                                                                                                //
      enumerable: true,                                                                                         // 201
                                                                                                                //
      // Allow this property to be (re)defined more than once (e.g. each                                        //
      // time the server restarts).                                                                             //
      configurable: true                                                                                        // 205
    });                                                                                                         // 192
                                                                                                                //
    if (Package.modules) {                                                                                      // 208
      // Use the same `require` function and `module` object visible to the                                     //
      // application.                                                                                           //
      var toBeInstalled = {};                                                                                   // 211
      var shellModuleName = "meteor-shell-" + Math.random().toString(36).slice(2) + ".js";                      // 212
                                                                                                                //
      toBeInstalled[shellModuleName] = function (require, exports, module) {                                    // 215
        repl.context.module = module;                                                                           // 216
        repl.context.require = require;                                                                         // 217
                                                                                                                //
        // Tab completion sometimes uses require.extensions, but only for                                       //
        // the keys.                                                                                            //
        require.extensions = {                                                                                  // 221
          ".js": true,                                                                                          // 222
          ".json": true,                                                                                        // 223
          ".node": true                                                                                         // 224
        };                                                                                                      // 221
      };                                                                                                        // 226
                                                                                                                //
      // This populates repl.context.{module,require} by evaluating the                                         //
      // module defined above.                                                                                  //
      Package.modules.meteorInstall(toBeInstalled)("./" + shellModuleName);                                     // 230
    }                                                                                                           // 231
                                                                                                                //
    repl.context.repl = repl;                                                                                   // 233
                                                                                                                //
    // Some improvements to the existing help messages.                                                         //
    function addHelp(cmd, helpText) {                                                                           // 236
      var info = repl.commands[cmd] || repl.commands["." + cmd];                                                // 237
      if (info) {                                                                                               // 238
        info.help = helpText;                                                                                   // 239
      }                                                                                                         // 240
    }                                                                                                           // 241
    addHelp("break", "Terminate current command input and display new prompt");                                 // 242
    addHelp("exit", "Disconnect from server and leave shell");                                                  // 243
    addHelp("help", "Show this help information");                                                              // 244
                                                                                                                //
    // When the REPL exits, signal the attached client to exit by sending it                                    //
    // the special EXITING_MESSAGE.                                                                             //
    repl.on("exit", function () {                                                                               // 248
      if (options.output) {                                                                                     // 249
        options.output.write(EXITING_MESSAGE + "\n");                                                           // 250
        options.output.end();                                                                                   // 251
      }                                                                                                         // 252
    });                                                                                                         // 253
                                                                                                                //
    // When the server process exits, end the output stream but do not                                          //
    // signal the attached client to exit.                                                                      //
    process.on("exit", function () {                                                                            // 257
      if (options.output) {                                                                                     // 258
        options.output.end();                                                                                   // 259
      }                                                                                                         // 260
    });                                                                                                         // 261
                                                                                                                //
    // This Meteor-specific shell command rebuilds the application as if a                                      //
    // change was made to server code.                                                                          //
    repl.defineCommand("reload", {                                                                              // 265
      help: "Restart the server and the shell",                                                                 // 266
      action: function action() {                                                                               // 267
        process.exit(0);                                                                                        // 268
      }                                                                                                         // 269
    });                                                                                                         // 265
                                                                                                                //
    // Trigger one recoverable error using the default eval function, just                                      //
    // to capture the Recoverable error constructor, so that our custom                                         //
    // evalCommand function can wrap recoverable errors properly.                                               //
    repl.eval("{", null, "<meteor shell>", function (error) {                                                   // 275
      // Capture the Recoverable error constructor.                                                             //
      repl._RecoverableError = error && error.constructor;                                                      // 279
                                                                                                                //
      // Now set repl.eval to the actual evalCommand function that we want                                      //
      // to use, bound to repl._domain if necessary.                                                            //
      repl.eval = repl._domain ? repl._domain.bind(evalCommand) : evalCommand;                                  // 283
                                                                                                                //
      // Terminate the partial evaluation of the { command.                                                     //
      repl.commands["break"].action.call(repl);                                                                 // 288
    });                                                                                                         // 289
  };                                                                                                            // 291
                                                                                                                //
  // This function allows a persistent history of shell commands to be saved                                    //
  // to and loaded from .meteor/local/shell-history.                                                            //
                                                                                                                //
                                                                                                                //
  Server.prototype.initializeHistory = function initializeHistory() {                                           //
    var self = this;                                                                                            // 296
    var rli = self.repl.rli;                                                                                    // 297
    var historyFile = getHistoryFile(self.shellDir);                                                            // 298
    var historyFd = fs.openSync(historyFile, "a+");                                                             // 299
    var historyLines = fs.readFileSync(historyFile, "utf8").split("\n");                                        // 300
    var seenLines = Object.create(null);                                                                        // 301
                                                                                                                //
    if (!rli.history) {                                                                                         // 303
      rli.history = [];                                                                                         // 304
      rli.historyIndex = -1;                                                                                    // 305
    }                                                                                                           // 306
                                                                                                                //
    while (rli.history && historyLines.length > 0) {                                                            // 308
      var line = historyLines.pop();                                                                            // 309
      if (line && /\S/.test(line) && !seenLines[line]) {                                                        // 310
        rli.history.push(line);                                                                                 // 311
        seenLines[line] = true;                                                                                 // 312
      }                                                                                                         // 313
    }                                                                                                           // 314
                                                                                                                //
    rli.addListener("line", function (line) {                                                                   // 316
      if (historyFd >= 0 && /\S/.test(line)) {                                                                  // 317
        fs.writeSync(historyFd, line + "\n");                                                                   // 318
      }                                                                                                         // 319
    });                                                                                                         // 320
                                                                                                                //
    self.repl.on("exit", function () {                                                                          // 322
      fs.closeSync(historyFd);                                                                                  // 323
      historyFd = -1;                                                                                           // 324
    });                                                                                                         // 325
  };                                                                                                            // 326
                                                                                                                //
  return Server;                                                                                                //
}();                                                                                                            //
                                                                                                                //
function readJSONFromStream(inputStream, callback) {                                                            // 329
  var outputStream = new stream.PassThrough();                                                                  // 330
  var dataSoFar = "";                                                                                           // 331
                                                                                                                //
  function onData(buffer) {                                                                                     // 333
    var lines = buffer.toString("utf8").split("\n");                                                            // 334
                                                                                                                //
    while (lines.length > 0) {                                                                                  // 336
      dataSoFar += lines.shift();                                                                               // 337
                                                                                                                //
      try {                                                                                                     // 339
        var json = JSON.parse(dataSoFar);                                                                       // 340
      } catch (error) {                                                                                         // 341
        if (error instanceof SyntaxError) {                                                                     // 342
          continue;                                                                                             // 343
        }                                                                                                       // 344
                                                                                                                //
        return finish(error);                                                                                   // 346
      }                                                                                                         // 347
                                                                                                                //
      if (lines.length > 0) {                                                                                   // 349
        outputStream.write(lines.join("\n"));                                                                   // 350
      }                                                                                                         // 351
                                                                                                                //
      inputStream.pipe(outputStream);                                                                           // 353
                                                                                                                //
      return finish(null, json);                                                                                // 355
    }                                                                                                           // 356
  }                                                                                                             // 357
                                                                                                                //
  function onClose() {                                                                                          // 359
    finish(new Error("stream unexpectedly closed"));                                                            // 360
  }                                                                                                             // 361
                                                                                                                //
  var finished = false;                                                                                         // 363
  function finish(error, json) {                                                                                // 364
    if (!finished) {                                                                                            // 365
      finished = true;                                                                                          // 366
      inputStream.removeListener("data", onData);                                                               // 367
      inputStream.removeListener("error", finish);                                                              // 368
      inputStream.removeListener("close", onClose);                                                             // 369
      callback(error, json, outputStream);                                                                      // 370
    }                                                                                                           // 371
  }                                                                                                             // 372
                                                                                                                //
  inputStream.on("data", onData);                                                                               // 374
  inputStream.on("error", finish);                                                                              // 375
  inputStream.on("close", onClose);                                                                             // 376
}                                                                                                               // 377
                                                                                                                //
function getInfoFile(shellDir) {                                                                                // 379
  return path.join(shellDir, "info.json");                                                                      // 380
}                                                                                                               // 381
                                                                                                                //
function getHistoryFile(shellDir) {                                                                             // 383
  return path.join(shellDir, "history");                                                                        // 384
}                                                                                                               // 385
                                                                                                                //
function getTerminalWidth() {                                                                                   // 387
  try {                                                                                                         // 388
    // Inspired by https://github.com/TooTallNate/ttys/blob/master/index.js                                     //
    var fd = fs.openSync("/dev/tty", "r");                                                                      // 390
    assert.ok(tty.isatty(fd));                                                                                  // 391
    var ws = new tty.WriteStream(fd);                                                                           // 392
    ws.end();                                                                                                   // 393
    return ws.columns;                                                                                          // 394
  } catch (fancyApproachWasTooFancy) {                                                                          // 395
    return 80;                                                                                                  // 396
  }                                                                                                             // 397
}                                                                                                               // 398
                                                                                                                //
// Shell commands need to be executed in a Fiber in case they call into                                         //
// code that yields. Using a Promise is an even better idea, since it runs                                      //
// its callbacks in Fibers drawn from a pool, so the Fibers are recycled.                                       //
var evalCommandPromise = Promise.resolve();                                                                     // 403
                                                                                                                //
function evalCommand(command, context, filename, callback) {                                                    // 405
  var repl = this;                                                                                              // 406
                                                                                                                //
  function finish(error, result) {                                                                              // 408
    if (error) {                                                                                                // 409
      if (repl._RecoverableError && isRecoverableError(error, repl)) {                                          // 410
        callback(new repl._RecoverableError(error));                                                            // 412
      } else {                                                                                                  // 413
        callback(error);                                                                                        // 414
      }                                                                                                         // 415
    } else {                                                                                                    // 416
      callback(null, result);                                                                                   // 417
    }                                                                                                           // 418
  }                                                                                                             // 419
                                                                                                                //
  if (Package.ecmascript) {                                                                                     // 421
    var noParens = stripParens(command);                                                                        // 422
    if (noParens !== command) {                                                                                 // 423
      var classMatch = /^\s*class\s+(\w+)/.exec(noParens);                                                      // 424
      if (classMatch && classMatch[1] !== "extends") {                                                          // 425
        // If the command looks like a named ES2015 class, we remove the                                        //
        // extra layer of parentheses added by the REPL so that the                                             //
        // command will be evaluated as a class declaration rather than as                                      //
        // a named class expression. Note that you can still type (class A                                      //
        // {}) explicitly to evaluate a named class expression. The REPL                                        //
        // code that calls evalCommand handles named function expressions                                       //
        // similarly (first with and then without parentheses), but that                                        //
        // code doesn't know about ES2015 classes, which is why we have to                                      //
        // handle them here.                                                                                    //
        command = noParens;                                                                                     // 435
      }                                                                                                         // 436
    }                                                                                                           // 437
                                                                                                                //
    try {                                                                                                       // 439
      command = Package.ecmascript.ECMAScript.compileForShell(command);                                         // 440
    } catch (error) {                                                                                           // 441
      finish(error);                                                                                            // 442
      return;                                                                                                   // 443
    }                                                                                                           // 444
  }                                                                                                             // 445
                                                                                                                //
  try {                                                                                                         // 447
    var script = new vm.Script(command, {                                                                       // 448
      filename: filename,                                                                                       // 449
      displayErrors: false                                                                                      // 450
    });                                                                                                         // 448
  } catch (parseError) {                                                                                        // 452
    finish(parseError);                                                                                         // 453
    return;                                                                                                     // 454
  }                                                                                                             // 455
                                                                                                                //
  evalCommandPromise.then(function () {                                                                         // 457
    finish(null, script.runInThisContext());                                                                    // 458
  })["catch"](finish);                                                                                          // 459
}                                                                                                               // 460
                                                                                                                //
function stripParens(command) {                                                                                 // 462
  if (command.charAt(0) === "(" && command.charAt(command.length - 1) === ")") {                                // 463
    return command.slice(1, command.length - 1);                                                                // 465
  }                                                                                                             // 466
  return command;                                                                                               // 467
}                                                                                                               // 468
                                                                                                                //
// The bailOnIllegalToken and isRecoverableError functions are taken from                                       //
// https://github.com/nodejs/node/blob/c9e670ea2a/lib/repl.js#L1227-L1253                                       //
function bailOnIllegalToken(parser) {                                                                           // 472
  return parser._literal === null && !parser.blockComment && !parser.regExpLiteral;                             // 473
}                                                                                                               // 476
                                                                                                                //
// If the error is that we've unexpectedly ended the input,                                                     //
// then let the user try to recover by adding more input.                                                       //
function isRecoverableError(e, repl) {                                                                          // 480
  if (e && e.name === 'SyntaxError') {                                                                          // 481
    var message = e.message;                                                                                    // 482
    if (message === 'Unterminated template literal' || message === 'Missing } in template expression') {        // 483
      repl._inTemplateLiteral = true;                                                                           // 485
      return true;                                                                                              // 486
    }                                                                                                           // 487
                                                                                                                //
    if (message.startsWith('Unexpected end of input') || message.startsWith('missing ) after argument list') || message.startsWith('Unexpected token')) {
      return true;                                                                                              // 492
    }                                                                                                           // 493
                                                                                                                //
    if (message === 'Invalid or unexpected token') {                                                            // 495
      return !bailOnIllegalToken(repl.lineParser);                                                              // 496
    }                                                                                                           // 497
  }                                                                                                             // 498
                                                                                                                //
  return false;                                                                                                 // 500
}                                                                                                               // 501
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}]}}}},{"extensions":[".js",".json"]});
var exports = require("./node_modules/meteor/shell-server/main.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
Package['shell-server'] = exports;

})();

//# sourceMappingURL=shell-server.js.map
