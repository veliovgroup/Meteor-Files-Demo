(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var WebApp = Package.webapp.WebApp;
var main = Package.webapp.main;
var WebAppInternals = Package.webapp.WebAppInternals;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var _ = Package.underscore._;
var check = Package.check.check;
var Match = Package.check.Match;
var Random = Package.random.Random;
var ECMAScript = Package.ecmascript.ECMAScript;
var Symbol = Package['ecmascript-runtime'].Symbol;
var Map = Package['ecmascript-runtime'].Map;
var Set = Package['ecmascript-runtime'].Set;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var meteorInstall = Package.modules.meteorInstall;
var Buffer = Package.modules.Buffer;
var process = Package.modules.process;

/* Package-scope variables */
var __coffeescriptShare, FilesCollection;

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:files":{"files.coffee.js":["meteor/ostrio:cookies","./event-emitter.jsx",function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/files.coffee.js                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
module.export({                                                                                                        // 1
  FilesCollection: function () {                                                                                       // 1
    return FilesCollection;                                                                                            // 1
  }                                                                                                                    // 1
});                                                                                                                    // 1
var Cookies = void 0;                                                                                                  // 1
module.import('meteor/ostrio:cookies', {                                                                               // 1
  "Cookies": function (v) {                                                                                            // 1
    Cookies = v;                                                                                                       // 1
  }                                                                                                                    // 1
}, 0);                                                                                                                 // 1
var EventEmitter, FileCursor, FilesCursor, NOOP, Throttle, bound, events, fileType, fixJSONParse, fixJSONStringify, formatFleURL, fs, nodePath, request, writeStream;
                                                                                                                       //
NOOP = function () {};                                                                                                 // 2
                                                                                                                       //
if (Meteor.isServer) {                                                                                                 // 4
  /*                                                                                                                   // 5
  @summary Require NPM packages                                                                                        //
   */fs = Npm.require('fs-extra');                                                                                     //
  events = Npm.require('events');                                                                                      // 9
  request = Npm.require('request');                                                                                    // 10
  Throttle = Npm.require('throttle');                                                                                  // 11
  fileType = Npm.require('file-type');                                                                                 // 12
  nodePath = Npm.require('path'); /*                                                                                   // 13
                                  @var {Object} bound - Meteor.bindEnvironment (Fiber wrapper)                         //
                                   */                                                                                  //
  bound = Meteor.bindEnvironment(function (callback) {                                                                 // 18
    return callback();                                                                                                 // 18
  }); /*                                                                                                               // 18
      @private                                                                                                         //
      @locus Server                                                                                                    //
      @class writeStream                                                                                               //
      @param path      {String} - Path to file on FS                                                                   //
      @param maxLength {Number} - Max amount of chunks in stream                                                       //
      @param file      {Object} - fileRef Object                                                                       //
      @summary writableStream wrapper class, makes sure chunks is written in given order. Implementation of queue stream.
       */                                                                                                              //
                                                                                                                       //
  writeStream = function () {                                                                                          // 29
    function writeStream(path1, maxLength, file1, permissions) {                                                       // 30
      var self;                                                                                                        // 31
      this.path = path1;                                                                                               // 30
      this.maxLength = maxLength;                                                                                      // 30
      this.file = file1;                                                                                               // 30
      this.permissions = permissions;                                                                                  // 30
                                                                                                                       //
      if (!this.path || !_.isString(this.path)) {                                                                      // 31
        return;                                                                                                        // 32
      }                                                                                                                // 43
                                                                                                                       //
      self = this;                                                                                                     // 34
      this.fd = null;                                                                                                  // 35
      fs.open(this.path, 'w+', this.permissions, function (error, fd) {                                                // 36
        return bound(function () {                                                                                     // 47
          if (error) {                                                                                                 // 37
            throw new Meteor.Error(500, '[FilesCollection] [writeStream] [Exception:]', error);                        // 38
          } else {                                                                                                     // 37
            self.fd = fd;                                                                                              // 40
          }                                                                                                            // 52
        });                                                                                                            // 36
      });                                                                                                              // 36
      this.ended = false;                                                                                              // 42
      this.aborted = false;                                                                                            // 43
      this.writtenChunks = 0;                                                                                          // 44
    } /*                                                                                                               // 30
      @memberOf writeStream                                                                                            //
      @name write                                                                                                      //
      @param {Number} num - Chunk position in stream                                                                   //
      @param {Buffer} chunk - Chunk binary data                                                                        //
      @param {Function} callback - Callback                                                                            //
      @summary Write chunk in given order                                                                              //
      @returns {Boolean} - True if chunk is sent to stream, false if chunk is set into queue                           //
       */                                                                                                              //
                                                                                                                       //
    writeStream.prototype.write = function (num, chunk, callback) {                                                    // 71
      var _stream, self;                                                                                               // 56
                                                                                                                       //
      if (!this.aborted && !this.ended) {                                                                              // 56
        self = this;                                                                                                   // 57
                                                                                                                       //
        if (this.fd) {                                                                                                 // 58
          _stream = fs.createWriteStream(this.path, {                                                                  // 59
            flags: 'r+',                                                                                               // 60
            mode: this.permissions,                                                                                    // 61
            highWaterMark: 0,                                                                                          // 62
            fd: this.fd,                                                                                               // 63
            autoClose: true,                                                                                           // 64
            start: (num - 1) * this.file.chunkSize                                                                     // 65
          });                                                                                                          // 59
                                                                                                                       //
          _stream.on('error', function (error) {                                                                       // 67
            return bound(function () {                                                                                 // 85
              console.error("[FilesCollection] [writeStream] [ERROR:]", error);                                        // 68
              self.abort();                                                                                            // 69
            });                                                                                                        // 67
          });                                                                                                          // 67
                                                                                                                       //
          _stream.write(chunk, function () {                                                                           // 71
            return bound(function () {                                                                                 // 91
              ++self.writtenChunks;                                                                                    // 72
              callback && callback();                                                                                  // 73
            });                                                                                                        // 71
          });                                                                                                          // 71
        } else {                                                                                                       // 58
          Meteor.setTimeout(function () {                                                                              // 76
            self.write(num, chunk, callback);                                                                          // 77
          }, 25);                                                                                                      // 76
        }                                                                                                              // 56
      }                                                                                                                // 101
                                                                                                                       //
      return false;                                                                                                    // 80
    }; /*                                                                                                              // 55
       @memberOf writeStream                                                                                           //
       @name end                                                                                                       //
       @param {Function} callback - Callback                                                                           //
       @summary Finishes writing to writableStream, only after all chunks in queue is written                          //
       @returns {Boolean} - True if stream is fulfilled, false if queue is in progress                                 //
        */                                                                                                             //
                                                                                                                       //
    writeStream.prototype.end = function (callback) {                                                                  // 114
      var self;                                                                                                        // 90
                                                                                                                       //
      if (!this.aborted && !this.ended) {                                                                              // 90
        if (this.writtenChunks === this.maxLength) {                                                                   // 91
          self = this;                                                                                                 // 92
          fs.close(this.fd, function () {                                                                              // 93
            return bound(function () {                                                                                 // 120
              self.ended = true;                                                                                       // 94
              callback && callback(true);                                                                              // 95
            });                                                                                                        // 93
          });                                                                                                          // 93
          return true;                                                                                                 // 97
        } else {                                                                                                       // 91
          self = this;                                                                                                 // 99
          Meteor.setTimeout(function () {                                                                              // 100
            self.end(callback);                                                                                        // 101
          }, 25);                                                                                                      // 100
        }                                                                                                              // 90
      } else {                                                                                                         // 90
        callback && callback(false);                                                                                   // 105
      }                                                                                                                // 134
                                                                                                                       //
      return false;                                                                                                    // 106
    }; /*                                                                                                              // 89
       @memberOf writeStream                                                                                           //
       @name abort                                                                                                     //
       @param {Function} callback - Callback                                                                           //
       @summary Aborts writing to writableStream, removes created file                                                 //
       @returns {Boolean} - True                                                                                       //
        */                                                                                                             //
                                                                                                                       //
    writeStream.prototype.abort = function (callback) {                                                                // 147
      this.aborted = true;                                                                                             // 116
      fs.unlink(this.path, callback || NOOP);                                                                          // 117
      return true;                                                                                                     // 118
    }; /*                                                                                                              // 115
       @memberOf writeStream                                                                                           //
       @name stop                                                                                                      //
       @summary Stop writing to writableStream                                                                         //
       @returns {Boolean} - True                                                                                       //
        */                                                                                                             //
                                                                                                                       //
    writeStream.prototype.stop = function () {                                                                         // 161
      this.aborted = true;                                                                                             // 127
      this.ended = true;                                                                                               // 128
      return true;                                                                                                     // 129
    };                                                                                                                 // 126
                                                                                                                       //
    return writeStream;                                                                                                // 167
  }();                                                                                                                 // 169
} else {                                                                                                               // 4
  EventEmitter = require('./event-emitter.jsx').EventEmitter;                                                          // 131
} /*                                                                                                                   // 172
  @private                                                                                                             //
  @locus Anywhere                                                                                                      //
  @class FileCursor                                                                                                    //
  @param _fileRef    {Object} - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)           //
  @param _collection {FilesCollection} - FilesCollection Instance                                                      //
  @summary Internal class, represents each record in `FilesCursor.each()` or document returned from `.findOne()` method
   */                                                                                                                  //
                                                                                                                       //
FileCursor = function () {                                                                                             // 141
  function FileCursor(_fileRef, _collection) {                                                                         // 142
    var self;                                                                                                          // 143
    this._fileRef = _fileRef;                                                                                          // 142
    this._collection = _collection;                                                                                    // 142
    self = this;                                                                                                       // 143
    self = _.extend(self, this._fileRef);                                                                              // 144
  } /*                                                                                                                 // 142
    @locus Anywhere                                                                                                    //
    @memberOf FileCursor                                                                                               //
    @name remove                                                                                                       //
    @param callback {Function} - Triggered asynchronously after item is removed or failed to be removed                //
    @summary Remove document                                                                                           //
    @returns {FileCursor}                                                                                              //
     */                                                                                                                //
                                                                                                                       //
  FileCursor.prototype.remove = function (callback) {                                                                  // 203
    if (this._collection.debug) {                                                                                      // 155
      console.info('[FilesCollection] [FileCursor] [remove()]');                                                       // 155
    }                                                                                                                  // 206
                                                                                                                       //
    if (this._fileRef) {                                                                                               // 156
      this._collection.remove(this._fileRef._id, callback);                                                            // 157
    } else {                                                                                                           // 156
      callback && callback(new Meteor.Error(404, 'No such file'));                                                     // 159
    }                                                                                                                  // 211
                                                                                                                       //
    return this;                                                                                                       // 160
  }; /*                                                                                                                // 154
     @locus Anywhere                                                                                                   //
     @memberOf FileCursor                                                                                              //
     @name link                                                                                                        //
     @param version {String} - Name of file's subversion                                                               //
     @summary Returns downloadable URL to File                                                                         //
     @returns {String}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FileCursor.prototype.link = function (version) {                                                                     // 225
    if (this._collection.debug) {                                                                                      // 171
      console.info("[FilesCollection] [FileCursor] [link(" + version + ")]");                                          // 171
    }                                                                                                                  // 228
                                                                                                                       //
    if (this._fileRef) {                                                                                               // 172
      return this._collection.link(this._fileRef, version);                                                            // 230
    } else {                                                                                                           // 172
      return '';                                                                                                       // 232
    }                                                                                                                  // 233
  }; /*                                                                                                                // 170
     @locus Anywhere                                                                                                   //
     @memberOf FileCursor                                                                                              //
     @name get                                                                                                         //
     @param property {String} - Name of sub-object property                                                            //
     @summary Returns current document as a plain Object, if `property` is specified - returns value of sub-object property
     @returns {Object|mix}                                                                                             //
      */                                                                                                               //
                                                                                                                       //
  FileCursor.prototype.get = function (property) {                                                                     // 246
    if (this._collection.debug) {                                                                                      // 183
      console.info("[FilesCollection] [FileCursor] [get(" + property + ")]");                                          // 183
    }                                                                                                                  // 249
                                                                                                                       //
    if (property) {                                                                                                    // 184
      return this._fileRef[property];                                                                                  // 185
    } else {                                                                                                           // 184
      return this._fileRef;                                                                                            // 187
    }                                                                                                                  // 254
  }; /*                                                                                                                // 182
     @locus Anywhere                                                                                                   //
     @memberOf FileCursor                                                                                              //
     @name fetch                                                                                                       //
     @summary Returns document as plain Object in Array                                                                //
     @returns {[Object]}                                                                                               //
      */                                                                                                               //
                                                                                                                       //
  FileCursor.prototype.fetch = function () {                                                                           // 266
    if (this._collection.debug) {                                                                                      // 197
      console.info('[FilesCollection] [FileCursor] [fetch()]');                                                        // 197
    }                                                                                                                  // 269
                                                                                                                       //
    return [this._fileRef];                                                                                            // 198
  }; /*                                                                                                                // 196
     @locus Anywhere                                                                                                   //
     @memberOf FileCursor                                                                                              //
     @name with                                                                                                        //
     @summary Returns reactive version of current FileCursor, useful to use with `{{#with}}...{{/with}}` block template helper
     @returns {[Object]}                                                                                               //
      */                                                                                                               //
                                                                                                                       //
  FileCursor.prototype["with"] = function () {                                                                         // 282
    var self;                                                                                                          // 208
                                                                                                                       //
    if (this._collection.debug) {                                                                                      // 208
      console.info('[FilesCollection] [FileCursor] [with()]');                                                         // 208
    }                                                                                                                  // 286
                                                                                                                       //
    self = this;                                                                                                       // 209
    return _.extend(self, this._collection.collection.findOne(this._fileRef._id));                                     // 210
  };                                                                                                                   // 207
                                                                                                                       //
  return FileCursor;                                                                                                   // 291
}(); /*                                                                                                                // 293
     @private                                                                                                          //
     @locus Anywhere                                                                                                   //
     @class FilesCursor                                                                                                //
     @param _selector   {String|Object}   - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)
     @param options     {Object}          - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#selectors)
     @param _collection {FilesCollection} - FilesCollection Instance                                                   //
     @summary Implementation of Cursor for FilesCollection                                                             //
      */                                                                                                               //
                                                                                                                       //
FilesCursor = function () {                                                                                            // 221
  function FilesCursor(_selector, options, _collection) {                                                              // 222
    this._selector = _selector != null ? _selector : {};                                                               // 222
    this._collection = _collection;                                                                                    // 222
    this._current = -1;                                                                                                // 223
    this.cursor = this._collection.collection.find(this._selector, options);                                           // 224
  } /*                                                                                                                 // 222
    @locus Anywhere                                                                                                    //
    @memberOf FilesCursor                                                                                              //
    @name get                                                                                                          //
    @summary Returns all matching document(s) as an Array. Alias of `.fetch()`                                         //
    @returns {[Object]}                                                                                                //
     */                                                                                                                //
                                                                                                                       //
  FilesCursor.prototype.get = function () {                                                                            // 323
    if (this._collection.debug) {                                                                                      // 234
      console.info("[FilesCollection] [FilesCursor] [get()]");                                                         // 234
    }                                                                                                                  // 326
                                                                                                                       //
    return this.cursor.fetch();                                                                                        // 235
  }; /*                                                                                                                // 233
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name hasNext                                                                                                     //
     @summary Returns `true` if there is next item available on Cursor                                                 //
     @returns {Boolean}                                                                                                //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.hasNext = function () {                                                                        // 339
    if (this._collection.debug) {                                                                                      // 245
      console.info('[FilesCollection] [FilesCursor] [hasNext()]');                                                     // 245
    }                                                                                                                  // 342
                                                                                                                       //
    return this._current < this.cursor.count() - 1;                                                                    // 246
  }; /*                                                                                                                // 244
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name next                                                                                                        //
     @summary Returns next item on Cursor, if available                                                                //
     @returns {Object|undefined}                                                                                       //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.next = function () {                                                                           // 355
    if (this._collection.debug) {                                                                                      // 256
      console.info('[FilesCollection] [FilesCursor] [next()]');                                                        // 256
    }                                                                                                                  // 358
                                                                                                                       //
    if (this.hasNext()) {                                                                                              // 257
      return this.cursor.fetch()[++this._current];                                                                     // 258
    }                                                                                                                  // 361
  }; /*                                                                                                                // 255
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name hasPrevious                                                                                                 //
     @summary Returns `true` if there is previous item available on Cursor                                             //
     @returns {Boolean}                                                                                                //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.hasPrevious = function () {                                                                    // 373
    if (this._collection.debug) {                                                                                      // 268
      console.info('[FilesCollection] [FilesCursor] [hasPrevious()]');                                                 // 268
    }                                                                                                                  // 376
                                                                                                                       //
    return this._current !== -1;                                                                                       // 269
  }; /*                                                                                                                // 267
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name previous                                                                                                    //
     @summary Returns previous item on Cursor, if available                                                            //
     @returns {Object|undefined}                                                                                       //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.previous = function () {                                                                       // 389
    if (this._collection.debug) {                                                                                      // 279
      console.info('[FilesCollection] [FilesCursor] [previous()]');                                                    // 279
    }                                                                                                                  // 392
                                                                                                                       //
    if (this.hasPrevious()) {                                                                                          // 280
      return this.cursor.fetch()[--this._current];                                                                     // 281
    }                                                                                                                  // 395
  }; /*                                                                                                                // 278
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name fetch                                                                                                       //
     @summary Returns all matching document(s) as an Array.                                                            //
     @returns {[Object]}                                                                                               //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.fetch = function () {                                                                          // 407
    if (this._collection.debug) {                                                                                      // 291
      console.info('[FilesCollection] [FilesCursor] [fetch()]');                                                       // 291
    }                                                                                                                  // 410
                                                                                                                       //
    return this.cursor.fetch();                                                                                        // 292
  }; /*                                                                                                                // 290
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name first                                                                                                       //
     @summary Returns first item on Cursor, if available                                                               //
     @returns {Object|undefined}                                                                                       //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.first = function () {                                                                          // 423
    var ref;                                                                                                           // 302
                                                                                                                       //
    if (this._collection.debug) {                                                                                      // 302
      console.info('[FilesCollection] [FilesCursor] [first()]');                                                       // 302
    }                                                                                                                  // 427
                                                                                                                       //
    this._current = 0;                                                                                                 // 303
    return (ref = this.fetch()) != null ? ref[this._current] : void 0;                                                 // 304
  }; /*                                                                                                                // 301
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name last                                                                                                        //
     @summary Returns last item on Cursor, if available                                                                //
     @returns {Object|undefined}                                                                                       //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.last = function () {                                                                           // 441
    var ref;                                                                                                           // 314
                                                                                                                       //
    if (this._collection.debug) {                                                                                      // 314
      console.info('[FilesCollection] [FilesCursor] [last()]');                                                        // 314
    }                                                                                                                  // 445
                                                                                                                       //
    this._current = this.count() - 1;                                                                                  // 315
    return (ref = this.fetch()) != null ? ref[this._current] : void 0;                                                 // 316
  }; /*                                                                                                                // 313
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name count                                                                                                       //
     @summary Returns the number of documents that match a query                                                       //
     @returns {Number}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.count = function () {                                                                          // 459
    if (this._collection.debug) {                                                                                      // 326
      console.info('[FilesCollection] [FilesCursor] [count()]');                                                       // 326
    }                                                                                                                  // 462
                                                                                                                       //
    return this.cursor.count();                                                                                        // 327
  }; /*                                                                                                                // 325
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name remove                                                                                                      //
     @param callback {Function} - Triggered asynchronously after item is removed or failed to be removed               //
     @summary Removes all documents that match a query                                                                 //
     @returns {FilesCursor}                                                                                            //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.remove = function (callback) {                                                                 // 476
    if (this._collection.debug) {                                                                                      // 338
      console.info('[FilesCollection] [FilesCursor] [remove()]');                                                      // 338
    }                                                                                                                  // 479
                                                                                                                       //
    this._collection.remove(this._selector, callback);                                                                 // 339
                                                                                                                       //
    return this;                                                                                                       // 340
  }; /*                                                                                                                // 337
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name forEach                                                                                                     //
     @param callback {Function} - Function to call. It will be called with three arguments: the `file`, a 0-based index, and cursor itself
     @param context {Object} - An object which will be the value of `this` inside `callback`                           //
     @summary Call `callback` once for each matching document, sequentially and synchronously.                         //
     @returns {undefined}                                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.forEach = function (callback, context) {                                                       // 495
    if (context == null) {                                                                                             // 496
      context = {};                                                                                                    // 351
    }                                                                                                                  // 498
                                                                                                                       //
    if (this._collection.debug) {                                                                                      // 352
      console.info('[FilesCollection] [FilesCursor] [forEach()]');                                                     // 352
    }                                                                                                                  // 501
                                                                                                                       //
    this.cursor.forEach(callback, context);                                                                            // 353
  }; /*                                                                                                                // 351
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name each                                                                                                        //
     @summary Returns an Array of FileCursor made for each document on current cursor                                  //
              Useful when using in {{#each FilesCursor#each}}...{{/each}} block template helper                        //
     @returns {[FileCursor]}                                                                                           //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.each = function () {                                                                           // 515
    var self;                                                                                                          // 365
    self = this;                                                                                                       // 365
    return this.map(function (file) {                                                                                  // 366
      return new FileCursor(file, self._collection);                                                                   // 367
    });                                                                                                                // 366
  }; /*                                                                                                                // 364
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name map                                                                                                         //
     @param callback {Function} - Function to call. It will be called with three arguments: the `file`, a 0-based index, and cursor itself
     @param context {Object} - An object which will be the value of `this` inside `callback`                           //
     @summary Map `callback` over all matching documents. Returns an Array.                                            //
     @returns {Array}                                                                                                  //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.map = function (callback, context) {                                                           // 534
    if (context == null) {                                                                                             // 535
      context = {};                                                                                                    // 378
    }                                                                                                                  // 537
                                                                                                                       //
    if (this._collection.debug) {                                                                                      // 379
      console.info('[FilesCollection] [FilesCursor] [map()]');                                                         // 379
    }                                                                                                                  // 540
                                                                                                                       //
    return this.cursor.map(callback, context);                                                                         // 380
  }; /*                                                                                                                // 378
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name current                                                                                                     //
     @summary Returns current item on Cursor, if available                                                             //
     @returns {Object|undefined}                                                                                       //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.current = function () {                                                                        // 553
    if (this._collection.debug) {                                                                                      // 390
      console.info('[FilesCollection] [FilesCursor] [current()]');                                                     // 390
    }                                                                                                                  // 556
                                                                                                                       //
    if (this._current < 0) {                                                                                           // 391
      this._current = 0;                                                                                               // 391
    }                                                                                                                  // 559
                                                                                                                       //
    return this.fetch()[this._current];                                                                                // 392
  }; /*                                                                                                                // 389
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name observe                                                                                                     //
     @param callbacks {Object} - Functions to call to deliver the result set as it changes                             //
     @summary Watch a query. Receive callbacks as the result set changes.                                              //
     @url http://docs.meteor.com/api/collections.html#Mongo-Cursor-observe                                             //
     @returns {Object} - live query handle                                                                             //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.observe = function (callbacks) {                                                               // 574
    if (this._collection.debug) {                                                                                      // 404
      console.info('[FilesCollection] [FilesCursor] [observe()]');                                                     // 404
    }                                                                                                                  // 577
                                                                                                                       //
    return this.cursor.observe(callbacks);                                                                             // 405
  }; /*                                                                                                                // 403
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name observeChanges                                                                                              //
     @param callbacks {Object} - Functions to call to deliver the result set as it changes                             //
     @summary Watch a query. Receive callbacks as the result set changes. Only the differences between the old and new documents are passed to the callbacks.
     @url http://docs.meteor.com/api/collections.html#Mongo-Cursor-observeChanges                                      //
     @returns {Object} - live query handle                                                                             //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.observeChanges = function (callbacks) {                                                        // 592
    if (this._collection.debug) {                                                                                      // 417
      console.info('[FilesCollection] [FilesCursor] [observeChanges()]');                                              // 417
    }                                                                                                                  // 595
                                                                                                                       //
    return this.cursor.observeChanges(callbacks);                                                                      // 418
  };                                                                                                                   // 416
                                                                                                                       //
  return FilesCursor;                                                                                                  // 599
}(); /*                                                                                                                // 601
     @var {Function} fixJSONParse - Fix issue with Date parse                                                          //
      */                                                                                                               //
                                                                                                                       //
fixJSONParse = function (obj) {                                                                                        // 423
  var i, j, key, len, v, value;                                                                                        // 424
                                                                                                                       //
  for (key in meteorBabelHelpers.sanitizeForInObject(obj)) {                                                           // 424
    value = obj[key];                                                                                                  // 611
                                                                                                                       //
    if (_.isString(value) && !!~value.indexOf('=--JSON-DATE--=')) {                                                    // 425
      value = value.replace('=--JSON-DATE--=', '');                                                                    // 426
      obj[key] = new Date(parseInt(value));                                                                            // 427
    } else if (_.isObject(value)) {                                                                                    // 425
      obj[key] = fixJSONParse(value);                                                                                  // 429
    } else if (_.isArray(value)) {                                                                                     // 428
      for (i = j = 0, len = value.length; j < len; i = ++j) {                                                          // 431
        v = value[i];                                                                                                  // 619
                                                                                                                       //
        if (_.isObject(v)) {                                                                                           // 432
          obj[key][i] = fixJSONParse(v);                                                                               // 433
        } else if (_.isString(v) && !!~v.indexOf('=--JSON-DATE--=')) {                                                 // 432
          v = v.replace('=--JSON-DATE--=', '');                                                                        // 435
          obj[key][i] = new Date(parseInt(v));                                                                         // 436
        }                                                                                                              // 625
      }                                                                                                                // 430
    }                                                                                                                  // 627
  }                                                                                                                    // 424
                                                                                                                       //
  return obj;                                                                                                          // 437
}; /*                                                                                                                  // 423
   @var {Function} fixJSONStringify - Fix issue with Date stringify                                                    //
    */                                                                                                                 //
                                                                                                                       //
fixJSONStringify = function (obj) {                                                                                    // 442
  var i, j, key, len, v, value;                                                                                        // 443
                                                                                                                       //
  for (key in meteorBabelHelpers.sanitizeForInObject(obj)) {                                                           // 443
    value = obj[key];                                                                                                  // 640
                                                                                                                       //
    if (_.isDate(value)) {                                                                                             // 444
      obj[key] = '=--JSON-DATE--=' + +value;                                                                           // 445
    } else if (_.isObject(value)) {                                                                                    // 444
      obj[key] = fixJSONStringify(value);                                                                              // 447
    } else if (_.isArray(value)) {                                                                                     // 446
      for (i = j = 0, len = value.length; j < len; i = ++j) {                                                          // 449
        v = value[i];                                                                                                  // 647
                                                                                                                       //
        if (_.isObject(v)) {                                                                                           // 450
          obj[key][i] = fixJSONStringify(v);                                                                           // 451
        } else if (_.isDate(v)) {                                                                                      // 450
          obj[key][i] = '=--JSON-DATE--=' + +v;                                                                        // 453
        }                                                                                                              // 652
      }                                                                                                                // 448
    }                                                                                                                  // 654
  }                                                                                                                    // 443
                                                                                                                       //
  return obj;                                                                                                          // 454
}; /*                                                                                                                  // 442
   @locus Anywhere                                                                                                     //
   @class FilesCollection                                                                                              //
   @param config           {Object}   - [Both]   Configuration object with next properties:                            //
   @param config.debug     {Boolean}  - [Both]   Turn on/of debugging and extra logging                                //
   @param config.ddp       {Object}   - [Client] Custom DDP connection. Object returned form `DDP.connect()`           //
   @param config.schema    {Object}   - [Both]   Collection Schema                                                     //
   @param config.public    {Boolean}  - [Both]   Store files in folder accessible for proxy servers, for limits, and more - read docs
   @param config.strict    {Boolean}  - [Server] Strict mode for partial content, if is `true` server will return `416` response code, when `range` is not specified, otherwise server return `206`
   @param config.protected {Function} - [Both]   If `true` - files will be served only to authorized users, if `function()` - you're able to check visitor's permissions in your own way function's context has:
     - `request` - On server only                                                                                      //
     - `response` - On server only                                                                                     //
     - `user()`                                                                                                        //
     - `userId`                                                                                                        //
   @param config.chunkSize      {Number}  - [Both] Upload chunk size, default: 524288 bytes (0,5 Mb)                   //
   @param config.permissions    {Number}  - [Server] Permissions which will be set to uploaded files (octal), like: `511` or `0o755`. Default: 0644
   @param config.parentDirPermissions {Number}  - [Server] Permissions which will be set to parent directory of uploaded files (octal), like: `611` or `0o777`. Default: 0755
   @param config.storagePath    {String|Function}  - [Server] Storage path on file system                              //
   @param config.cacheControl   {String}  - [Server] Default `Cache-Control` header                                    //
   @param config.responseHeaders {Object|Function} - [Server] Custom response headers, if function is passed, must return Object
   @param config.throttle       {Number}  - [Server] bps throttle threshold                                            //
   @param config.downloadRoute  {String}  - [Both]   Server Route used to retrieve files                               //
   @param config.collection     {Mongo.Collection} - [Both] Mongo Collection Instance                                  //
   @param config.collectionName {String}  - [Both]   Collection name                                                   //
   @param config.namingFunction {Function}- [Both]   Function which returns `String`                                   //
   @param config.integrityCheck {Boolean} - [Server] Check file's integrity before serving to users                    //
   @param config.onAfterUpload  {Function}- [Server] Called right after file is ready on FS. Use to transfer file somewhere else, or do other thing with file directly
   @param config.onAfterRemove  {Function} - [Server] Called right after file is removed. Removed objects is passed to callback
   @param config.continueUploadTTL {Number} - [Server] Time in seconds, during upload may be continued, default 3 hours (10800 seconds)
   @param config.onBeforeUpload {Function}- [Both]   Function which executes on server after receiving each chunk and on client right before beginning upload. Function context is `File` - so you are able to check for extension, mime-type, size and etc.
   return `true` to continue                                                                                           //
   return `false` or `String` to abort upload                                                                          //
   @param config.onInitiateUpload {Function} - [Server] Function which executes on server right before upload is begin and right after `onBeforeUpload` hook. This hook is fully asynchronous.
   @param config.onBeforeRemove {Function} - [Server] Executes before removing file on server, so you can check permissions. Return `true` to allow action and `false` to deny.
   @param config.allowClientCode  {Boolean}  - [Both]   Allow to run `remove` from client                              //
   @param config.downloadCallback {Function} - [Server] Callback triggered each time file is requested, return truthy value to continue download, or falsy to abort
   @param config.interceptDownload {Function} - [Server] Intercept download request, so you can serve file from third-party resource, arguments {http: {request: {...}, response: {...}}, fileRef: {...}}
   @param config.onbeforeunloadMessage {String|Function} - [Client] Message shown to user when closing browser's window or tab while upload process is running
   @summary Create new instance of FilesCollection                                                                     //
    */                                                                                                                 //
                                                                                                                       //
module.runModuleSetters(FilesCollection = function () {                                                                // 496
  var FileUpload, UploadInstance;                                                                                      // 497
                                                                                                                       //
  FilesCollection.prototype.__proto__ = function () {                                                                  // 704
    if (Meteor.isServer) {                                                                                             // 497
      return events.EventEmitter.prototype;                                                                            // 706
    } else {                                                                                                           // 497
      return EventEmitter.prototype;                                                                                   // 708
    }                                                                                                                  // 709
  }();                                                                                                                 // 497
                                                                                                                       //
  function FilesCollection(config) {                                                                                   // 498
    var _URL, _methods, _preCollectionCursor, cookie, self, setTokenCookie, storagePath, unsetTokenCookie;             // 499
                                                                                                                       //
    if (Meteor.isServer) {                                                                                             // 499
      events.EventEmitter.call(this);                                                                                  // 500
    } else {                                                                                                           // 499
      EventEmitter.call(this);                                                                                         // 502
    }                                                                                                                  // 718
                                                                                                                       //
    if (config) {                                                                                                      // 503
      storagePath = config.storagePath, this.ddp = config.ddp, this.collection = config.collection, this.collectionName = config.collectionName, this.downloadRoute = config.downloadRoute, this.schema = config.schema, this.chunkSize = config.chunkSize, this.namingFunction = config.namingFunction, this.debug = config.debug, this.onbeforeunloadMessage = config.onbeforeunloadMessage, this.permissions = config.permissions, this.parentDirPermissions = config.parentDirPermissions, this.allowClientCode = config.allowClientCode, this.onBeforeUpload = config.onBeforeUpload, this.onInitiateUpload = config.onInitiateUpload, this.integrityCheck = config.integrityCheck, this["protected"] = config["protected"], this["public"] = config["public"], this.strict = config.strict, this.downloadCallback = config.downloadCallback, this.cacheControl = config.cacheControl, this.responseHeaders = config.responseHeaders, this.throttle = config.throttle, this.onAfterUpload = config.onAfterUpload, this.onAfterRemove = config.onAfterRemove, this.interceptDownload = config.interceptDownload, this.onBeforeRemove = config.onBeforeRemove, this.continueUploadTTL = config.continueUploadTTL;
    }                                                                                                                  // 721
                                                                                                                       //
    self = this;                                                                                                       // 505
    cookie = new Cookies();                                                                                            // 506
                                                                                                                       //
    if (this.debug == null) {                                                                                          // 724
      this.debug = false;                                                                                              // 507
    }                                                                                                                  // 726
                                                                                                                       //
    if (this["public"] == null) {                                                                                      // 727
      this["public"] = false;                                                                                          // 508
    }                                                                                                                  // 729
                                                                                                                       //
    if (this["protected"] == null) {                                                                                   // 730
      this["protected"] = false;                                                                                       // 509
    }                                                                                                                  // 732
                                                                                                                       //
    if (this.chunkSize == null) {                                                                                      // 733
      this.chunkSize = 1024 * 512;                                                                                     // 510
    }                                                                                                                  // 735
                                                                                                                       //
    this.chunkSize = Math.floor(this.chunkSize / 8) * 8;                                                               // 511
                                                                                                                       //
    if (this["public"] && !this.downloadRoute) {                                                                       // 513
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: \"downloadRoute\" must be precisely provided on \"public\" collections! Note: \"downloadRoute\" must be equal or be inside of your web/proxy-server (relative) root.");
    }                                                                                                                  // 739
                                                                                                                       //
    if (this.collection == null) {                                                                                     // 740
      this.collection = new Mongo.Collection(this.collectionName);                                                     // 516
    }                                                                                                                  // 742
                                                                                                                       //
    if (this.collectionName == null) {                                                                                 // 743
      this.collectionName = this.collection._name;                                                                     // 517
    }                                                                                                                  // 745
                                                                                                                       //
    check(this.collectionName, String);                                                                                // 518
                                                                                                                       //
    if (this.downloadRoute == null) {                                                                                  // 747
      this.downloadRoute = '/cdn/storage';                                                                             // 519
    }                                                                                                                  // 749
                                                                                                                       //
    this.downloadRoute = this.downloadRoute.replace(/\/$/, '');                                                        // 520
                                                                                                                       //
    if (this.collectionName == null) {                                                                                 // 751
      this.collectionName = 'MeteorUploadFiles';                                                                       // 521
    }                                                                                                                  // 753
                                                                                                                       //
    if (this.namingFunction == null) {                                                                                 // 754
      this.namingFunction = false;                                                                                     // 522
    }                                                                                                                  // 756
                                                                                                                       //
    if (this.onBeforeUpload == null) {                                                                                 // 757
      this.onBeforeUpload = false;                                                                                     // 523
    }                                                                                                                  // 759
                                                                                                                       //
    if (this.allowClientCode == null) {                                                                                // 760
      this.allowClientCode = true;                                                                                     // 524
    }                                                                                                                  // 762
                                                                                                                       //
    if (this.ddp == null) {                                                                                            // 763
      this.ddp = Meteor;                                                                                               // 525
    }                                                                                                                  // 765
                                                                                                                       //
    if (this.onInitiateUpload == null) {                                                                               // 766
      this.onInitiateUpload = false;                                                                                   // 526
    }                                                                                                                  // 768
                                                                                                                       //
    if (this.interceptDownload == null) {                                                                              // 769
      this.interceptDownload = false;                                                                                  // 527
    }                                                                                                                  // 771
                                                                                                                       //
    if (storagePath == null) {                                                                                         // 772
      storagePath = function () {                                                                                      // 528
        return "assets" + nodePath.sep + "app" + nodePath.sep + "uploads" + nodePath.sep + this.collectionName;        // 774
      };                                                                                                               // 528
    }                                                                                                                  // 776
                                                                                                                       //
    if (_.isString(storagePath)) {                                                                                     // 530
      this.storagePath = function () {                                                                                 // 531
        return storagePath;                                                                                            // 779
      };                                                                                                               // 531
    } else {                                                                                                           // 530
      this.storagePath = function () {                                                                                 // 533
        var sp;                                                                                                        // 534
        sp = storagePath.apply(this, arguments);                                                                       // 534
                                                                                                                       //
        if (!_.isString(sp)) {                                                                                         // 535
          throw new Meteor.Error(400, "[FilesCollection." + self.collectionName + "] \"storagePath\" function must return a String!");
        }                                                                                                              // 787
                                                                                                                       //
        sp = sp.replace(/\/$/, '');                                                                                    // 537
                                                                                                                       //
        if (Meteor.isServer) {                                                                                         // 538
          return nodePath.normalize(sp);                                                                               // 790
        } else {                                                                                                       // 538
          return sp;                                                                                                   // 792
        }                                                                                                              // 793
      };                                                                                                               // 533
    }                                                                                                                  // 795
                                                                                                                       //
    if (Meteor.isClient) {                                                                                             // 540
      if (this.onbeforeunloadMessage == null) {                                                                        // 797
        this.onbeforeunloadMessage = 'Upload in a progress... Do you want to abort?';                                  // 541
      }                                                                                                                // 799
                                                                                                                       //
      delete this.strict;                                                                                              // 542
      delete this.throttle;                                                                                            // 543
      delete this.permissions;                                                                                         // 544
      delete this.parentDirPermissions;                                                                                // 545
      delete this.cacheControl;                                                                                        // 546
      delete this.onAfterUpload;                                                                                       // 547
      delete this.onAfterRemove;                                                                                       // 548
      delete this.onBeforeRemove;                                                                                      // 549
      this.onInitiateUpload = false;                                                                                   // 550
      delete this.integrityCheck;                                                                                      // 551
      delete this.downloadCallback;                                                                                    // 552
      delete this.interceptDownload;                                                                                   // 553
      delete this.continueUploadTTL;                                                                                   // 554
      delete this.responseHeaders;                                                                                     // 555
                                                                                                                       //
      setTokenCookie = function () {                                                                                   // 557
        Meteor.setTimeout(function () {                                                                                // 558
          if (!cookie.has('x_mtok') && Meteor.connection._lastSessionId || cookie.has('x_mtok') && cookie.get('x_mtok') !== Meteor.connection._lastSessionId) {
            cookie.set('x_mtok', Meteor.connection._lastSessionId, {                                                   // 560
              path: '/'                                                                                                // 560
            });                                                                                                        // 560
          }                                                                                                            // 820
        }, 25);                                                                                                        // 558
      };                                                                                                               // 557
                                                                                                                       //
      unsetTokenCookie = function () {                                                                                 // 565
        if (cookie.has('x_mtok')) {                                                                                    // 566
          cookie.remove('x_mtok', '/');                                                                                // 566
        }                                                                                                              // 826
      };                                                                                                               // 565
                                                                                                                       //
      if (typeof Accounts !== "undefined" && Accounts !== null) {                                                      // 569
        Meteor.startup(function () {                                                                                   // 570
          setTokenCookie();                                                                                            // 571
        });                                                                                                            // 570
        Accounts.onLogin(function () {                                                                                 // 573
          setTokenCookie();                                                                                            // 574
        });                                                                                                            // 573
        Accounts.onLogout(function () {                                                                                // 576
          unsetTokenCookie();                                                                                          // 577
        });                                                                                                            // 576
      }                                                                                                                // 838
                                                                                                                       //
      check(this.onbeforeunloadMessage, Match.OneOf(String, Function));                                                // 580
      _URL = window.URL || window.webkitURL || window.mozURL || window.msURL || window.oURL || false;                  // 582
                                                                                                                       //
      if ((typeof window !== "undefined" && window !== null ? window.Worker : void 0) && (typeof window !== "undefined" && window !== null ? window.Blob : void 0) && _URL) {
        this._supportWebWorker = true;                                                                                 // 584
        this._webWorkerUrl = _URL.createObjectURL(new Blob(['!function(a){"use strict";a.onmessage=function(b){var c=b.data.f.slice(b.data.cs*(b.data.cc-1),b.data.cs*b.data.cc);if(b.data.ib===!0)postMessage({bin:c,chunkId:b.data.cc});else{var d;a.FileReader?(d=new FileReader,d.onloadend=function(a){postMessage({bin:(d.result||a.srcElement||a.target).split(",")[1],chunkId:b.data.cc,s:b.data.s})},d.onerror=function(a){throw(a.target||a.srcElement).error},d.readAsDataURL(c)):a.FileReaderSync?(d=new FileReaderSync,postMessage({bin:d.readAsDataURL(c).split(",")[1],chunkId:b.data.cc})):postMessage({bin:null,chunkId:b.data.cc,error:"File API is not supported in WebWorker!"})}}}(this);'], {
          type: 'application/javascript'                                                                               // 585
        }));                                                                                                           // 585
      } else if (typeof window !== "undefined" && window !== null ? window.Worker : void 0) {                          // 583
        this._supportWebWorker = true;                                                                                 // 587
        this._webWorkerUrl = Meteor.absoluteUrl('packages/ostrio_files/worker.min.js');                                // 588
      } else {                                                                                                         // 586
        this._supportWebWorker = false;                                                                                // 590
      }                                                                                                                // 540
    } else {                                                                                                           // 540
      if (this.strict == null) {                                                                                       // 853
        this.strict = true;                                                                                            // 593
      }                                                                                                                // 855
                                                                                                                       //
      if (this.throttle == null) {                                                                                     // 856
        this.throttle = false;                                                                                         // 594
      }                                                                                                                // 858
                                                                                                                       //
      if (this.permissions == null) {                                                                                  // 859
        this.permissions = parseInt('644', 8);                                                                         // 595
      }                                                                                                                // 861
                                                                                                                       //
      if (this.parentDirPermissions == null) {                                                                         // 862
        this.parentDirPermissions = parseInt('755', 8);                                                                // 596
      }                                                                                                                // 864
                                                                                                                       //
      if (this.cacheControl == null) {                                                                                 // 865
        this.cacheControl = 'public, max-age=31536000, s-maxage=31536000';                                             // 597
      }                                                                                                                // 867
                                                                                                                       //
      if (this.onAfterUpload == null) {                                                                                // 868
        this.onAfterUpload = false;                                                                                    // 598
      }                                                                                                                // 870
                                                                                                                       //
      if (this.onAfterRemove == null) {                                                                                // 871
        this.onAfterRemove = false;                                                                                    // 599
      }                                                                                                                // 873
                                                                                                                       //
      if (this.onBeforeRemove == null) {                                                                               // 874
        this.onBeforeRemove = false;                                                                                   // 600
      }                                                                                                                // 876
                                                                                                                       //
      if (this.integrityCheck == null) {                                                                               // 877
        this.integrityCheck = true;                                                                                    // 601
      }                                                                                                                // 879
                                                                                                                       //
      if (this._currentUploads == null) {                                                                              // 880
        this._currentUploads = {};                                                                                     // 602
      }                                                                                                                // 882
                                                                                                                       //
      if (this.downloadCallback == null) {                                                                             // 883
        this.downloadCallback = false;                                                                                 // 603
      }                                                                                                                // 885
                                                                                                                       //
      if (this.continueUploadTTL == null) {                                                                            // 886
        this.continueUploadTTL = 10800;                                                                                // 604
      }                                                                                                                // 888
                                                                                                                       //
      if (this.responseHeaders == null) {                                                                              // 889
        this.responseHeaders = function (responseCode, fileRef, versionRef) {                                          // 605
          var headers;                                                                                                 // 606
          headers = {};                                                                                                // 606
                                                                                                                       //
          switch (responseCode) {                                                                                      // 607
            case '206':                                                                                                // 607
              headers['Pragma'] = 'private';                                                                           // 609
              headers['Trailer'] = 'expires';                                                                          // 610
              headers['Transfer-Encoding'] = 'chunked';                                                                // 611
              break;                                                                                                   // 608
                                                                                                                       //
            case '400':                                                                                                // 607
              headers['Cache-Control'] = 'no-cache';                                                                   // 613
              break;                                                                                                   // 612
                                                                                                                       //
            case '416':                                                                                                // 607
              headers['Content-Range'] = "bytes */" + versionRef.size;                                                 // 615
          }                                                                                                            // 607
                                                                                                                       //
          headers['Connection'] = 'keep-alive';                                                                        // 617
          headers['Content-Type'] = versionRef.type || 'application/octet-stream';                                     // 618
          headers['Accept-Ranges'] = 'bytes';                                                                          // 619
          return headers;                                                                                              // 620
        };                                                                                                             // 605
      }                                                                                                                // 910
                                                                                                                       //
      if (this["public"] && !storagePath) {                                                                            // 622
        throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "] \"storagePath\" must be set on \"public\" collections! Note: \"storagePath\" must be equal on be inside of your web/proxy-server (absolute) root.");
      }                                                                                                                // 913
                                                                                                                       //
      if (this.debug) {                                                                                                // 625
        console.info('[FilesCollection.storagePath] Set to:', this.storagePath({}));                                   // 625
      }                                                                                                                // 916
                                                                                                                       //
      fs.mkdirs(this.storagePath({}), {                                                                                // 627
        mode: this.parentDirPermissions                                                                                // 627
      }, function (error) {                                                                                            // 627
        if (error) {                                                                                                   // 628
          throw new Meteor.Error(401, "[FilesCollection." + self.collectionName + "] Path \"" + self.storagePath({}) + "\" is not writable!", error);
        }                                                                                                              // 922
      });                                                                                                              // 627
      check(this.strict, Boolean);                                                                                     // 632
      check(this.throttle, Match.OneOf(false, Number));                                                                // 633
      check(this.permissions, Number);                                                                                 // 634
      check(this.storagePath, Function);                                                                               // 635
      check(this.cacheControl, String);                                                                                // 636
      check(this.onAfterRemove, Match.OneOf(false, Function));                                                         // 637
      check(this.onAfterUpload, Match.OneOf(false, Function));                                                         // 638
      check(this.integrityCheck, Boolean);                                                                             // 639
      check(this.onBeforeRemove, Match.OneOf(false, Function));                                                        // 640
      check(this.downloadCallback, Match.OneOf(false, Function));                                                      // 641
      check(this.interceptDownload, Match.OneOf(false, Function));                                                     // 642
      check(this.continueUploadTTL, Number);                                                                           // 643
      check(this.responseHeaders, Match.OneOf(Object, Function));                                                      // 644
      this._preCollection = new Mongo.Collection('__pre_' + this.collectionName);                                      // 646
                                                                                                                       //
      this._preCollection._ensureIndex({                                                                               // 647
        createdAt: 1                                                                                                   // 647
      }, {                                                                                                             // 647
        expireAfterSeconds: this.continueUploadTTL,                                                                    // 647
        background: true                                                                                               // 647
      });                                                                                                              // 647
                                                                                                                       //
      _preCollectionCursor = this._preCollection.find({}, {                                                            // 648
        fields: {                                                                                                      // 649
          _id: 1,                                                                                                      // 650
          isFinished: 1                                                                                                // 651
        }                                                                                                              // 650
      });                                                                                                              // 648
                                                                                                                       //
      _preCollectionCursor.observe({                                                                                   // 653
        changed: function (doc) {                                                                                      // 654
          if (doc.isFinished) {                                                                                        // 655
            if (self.debug) {                                                                                          // 656
              console.info("[FilesCollection] [_preCollectionCursor.observe] [changed]: " + doc._id);                  // 656
            }                                                                                                          // 955
                                                                                                                       //
            self._preCollection.remove({                                                                               // 657
              _id: doc._id                                                                                             // 657
            }, NOOP);                                                                                                  // 657
          }                                                                                                            // 959
        },                                                                                                             // 654
        removed: function (doc) {                                                                                      // 659
          var ref;                                                                                                     // 662
                                                                                                                       //
          if (self.debug) {                                                                                            // 662
            console.info("[FilesCollection] [_preCollectionCursor.observe] [removed]: " + doc._id);                    // 662
          }                                                                                                            // 965
                                                                                                                       //
          if ((ref = self._currentUploads) != null ? ref[doc._id] : void 0) {                                          // 663
            self._currentUploads[doc._id].stop();                                                                      // 664
                                                                                                                       //
            self._currentUploads[doc._id].end();                                                                       // 665
                                                                                                                       //
            if (!doc.isFinished) {                                                                                     // 667
              if (self.debug) {                                                                                        // 668
                console.info("[FilesCollection] [_preCollectionCursor.observe] [removeUnfinishedUpload]: " + doc._id);
              }                                                                                                        // 972
                                                                                                                       //
              self._currentUploads[doc._id].abort();                                                                   // 669
            }                                                                                                          // 974
                                                                                                                       //
            delete self._currentUploads[doc._id];                                                                      // 671
          }                                                                                                            // 976
        }                                                                                                              // 654
      });                                                                                                              // 654
                                                                                                                       //
      this._createStream = function (_id, path, opts) {                                                                // 674
        return self._currentUploads[_id] = new writeStream(path, opts.fileLength, opts, self.permissions);             // 675
      };                                                                                                               // 674
                                                                                                                       //
      this._continueUpload = function (_id) {                                                                          // 679
        var contUpld, ref, ref1;                                                                                       // 680
                                                                                                                       //
        if ((ref = self._currentUploads) != null ? (ref1 = ref[_id]) != null ? ref1.file : void 0 : void 0) {          // 680
          if (!self._currentUploads[_id].aborted && !self._currentUploads[_id].ended) {                                // 681
            return self._currentUploads[_id].file;                                                                     // 682
          } else {                                                                                                     // 681
            self._createStream(_id, self._currentUploads[_id].file.file.path, self._currentUploads[_id].file);         // 684
                                                                                                                       //
            return self._currentUploads[_id].file;                                                                     // 685
          }                                                                                                            // 680
        } else {                                                                                                       // 680
          contUpld = self._preCollection.findOne({                                                                     // 687
            _id: _id                                                                                                   // 687
          });                                                                                                          // 687
                                                                                                                       //
          if (contUpld) {                                                                                              // 688
            self._createStream(_id, contUpld.file.path, contUpld.file);                                                // 689
          }                                                                                                            // 997
                                                                                                                       //
          return contUpld;                                                                                             // 690
        }                                                                                                              // 999
      };                                                                                                               // 679
    }                                                                                                                  // 1001
                                                                                                                       //
    if (!this.schema) {                                                                                                // 692
      this.schema = {                                                                                                  // 693
        size: {                                                                                                        // 694
          type: Number                                                                                                 // 694
        },                                                                                                             // 694
        name: {                                                                                                        // 695
          type: String                                                                                                 // 695
        },                                                                                                             // 695
        type: {                                                                                                        // 696
          type: String                                                                                                 // 696
        },                                                                                                             // 696
        path: {                                                                                                        // 697
          type: String                                                                                                 // 697
        },                                                                                                             // 697
        isVideo: {                                                                                                     // 698
          type: Boolean                                                                                                // 698
        },                                                                                                             // 698
        isAudio: {                                                                                                     // 699
          type: Boolean                                                                                                // 699
        },                                                                                                             // 699
        isImage: {                                                                                                     // 700
          type: Boolean                                                                                                // 700
        },                                                                                                             // 700
        isText: {                                                                                                      // 701
          type: Boolean                                                                                                // 701
        },                                                                                                             // 701
        isJSON: {                                                                                                      // 702
          type: Boolean                                                                                                // 702
        },                                                                                                             // 702
        isPDF: {                                                                                                       // 703
          type: Boolean                                                                                                // 703
        },                                                                                                             // 703
        extension: {                                                                                                   // 704
          type: String,                                                                                                // 705
          optional: true                                                                                               // 706
        },                                                                                                             // 705
        _storagePath: {                                                                                                // 707
          type: String                                                                                                 // 707
        },                                                                                                             // 707
        _downloadRoute: {                                                                                              // 708
          type: String                                                                                                 // 708
        },                                                                                                             // 708
        _collectionName: {                                                                                             // 709
          type: String                                                                                                 // 709
        },                                                                                                             // 709
        "public": {                                                                                                    // 710
          type: Boolean,                                                                                               // 711
          optional: true                                                                                               // 712
        },                                                                                                             // 711
        meta: {                                                                                                        // 713
          type: Object,                                                                                                // 714
          blackbox: true,                                                                                              // 715
          optional: true                                                                                               // 716
        },                                                                                                             // 714
        userId: {                                                                                                      // 717
          type: String,                                                                                                // 718
          optional: true                                                                                               // 719
        },                                                                                                             // 718
        updatedAt: {                                                                                                   // 720
          type: Date,                                                                                                  // 721
          optional: true                                                                                               // 722
        },                                                                                                             // 721
        versions: {                                                                                                    // 723
          type: Object,                                                                                                // 724
          blackbox: true                                                                                               // 725
        }                                                                                                              // 724
      };                                                                                                               // 694
    }                                                                                                                  // 1069
                                                                                                                       //
    check(this.debug, Boolean);                                                                                        // 727
    check(this.schema, Object);                                                                                        // 728
    check(this["public"], Boolean);                                                                                    // 729
    check(this["protected"], Match.OneOf(Boolean, Function));                                                          // 730
    check(this.chunkSize, Number);                                                                                     // 731
    check(this.downloadRoute, String);                                                                                 // 732
    check(this.namingFunction, Match.OneOf(false, Function));                                                          // 733
    check(this.onBeforeUpload, Match.OneOf(false, Function));                                                          // 734
    check(this.onInitiateUpload, Match.OneOf(false, Function));                                                        // 735
    check(this.allowClientCode, Boolean);                                                                              // 736
    check(this.ddp, Match.Any);                                                                                        // 737
                                                                                                                       //
    if (this["public"] && this["protected"]) {                                                                         // 739
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: Files can not be public and protected at the same time!");
    }                                                                                                                  // 1083
                                                                                                                       //
    this._checkAccess = function (http) {                                                                              // 742
      var fileRef, rc, ref, ref1, result, text, user, userId;                                                          // 743
                                                                                                                       //
      if (self["protected"]) {                                                                                         // 743
        ref = self._getUser(http), user = ref.user, userId = ref.userId;                                               // 744
                                                                                                                       //
        if (_.isFunction(self["protected"])) {                                                                         // 746
          if (http != null ? (ref1 = http.params) != null ? ref1._id : void 0 : void 0) {                              // 747
            fileRef = self.collection.findOne(http.params._id);                                                        // 748
          }                                                                                                            // 1091
                                                                                                                       //
          result = http ? self["protected"].call(_.extend(http, {                                                      // 750
            user: user,                                                                                                // 750
            userId: userId                                                                                             // 750
          }), fileRef || null) : self["protected"].call({                                                              // 750
            user: user,                                                                                                // 750
            userId: userId                                                                                             // 750
          }, fileRef || null);                                                                                         // 750
        } else {                                                                                                       // 746
          result = !!userId;                                                                                           // 752
        }                                                                                                              // 1101
                                                                                                                       //
        if (http && result === true || !http) {                                                                        // 754
          return true;                                                                                                 // 755
        } else {                                                                                                       // 754
          rc = _.isNumber(result) ? result : 401;                                                                      // 757
                                                                                                                       //
          if (self.debug) {                                                                                            // 758
            console.warn('[FilesCollection._checkAccess] WARN: Access denied!');                                       // 758
          }                                                                                                            // 1108
                                                                                                                       //
          if (http) {                                                                                                  // 759
            text = 'Access denied!';                                                                                   // 760
                                                                                                                       //
            if (!http.response.headersSent) {                                                                          // 761
              http.response.writeHead(rc, {                                                                            // 762
                'Content-Length': text.length,                                                                         // 763
                'Content-Type': 'text/plain'                                                                           // 764
              });                                                                                                      // 763
            }                                                                                                          // 1116
                                                                                                                       //
            if (!http.response.finished) {                                                                             // 765
              http.response.end(text);                                                                                 // 766
            }                                                                                                          // 759
          }                                                                                                            // 1120
                                                                                                                       //
          return false;                                                                                                // 767
        }                                                                                                              // 743
      } else {                                                                                                         // 743
        return true;                                                                                                   // 769
      }                                                                                                                // 1125
    };                                                                                                                 // 742
                                                                                                                       //
    this._methodNames = {                                                                                              // 771
      _Abort: "_FilesCollectionAbort_" + this.collectionName,                                                          // 772
      _Write: "_FilesCollectionWrite_" + this.collectionName,                                                          // 773
      _Start: "_FilesCollectionStart_" + this.collectionName,                                                          // 774
      _Remove: "_FilesCollectionRemove_" + this.collectionName                                                         // 775
    };                                                                                                                 // 772
                                                                                                                       //
    if (Meteor.isServer) {                                                                                             // 777
      this.on('_handleUpload', this._handleUpload);                                                                    // 778
      this.on('_finishUpload', this._finishUpload);                                                                    // 779
      WebApp.connectHandlers.use(function (request, response, next) {                                                  // 781
        var _file, body, handleError, http, params, uri, uris, version;                                                // 782
                                                                                                                       //
        if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName + "/__upload")) {        // 782
          if (request.method === 'POST') {                                                                             // 783
            handleError = function (error) {                                                                           // 785
              console.warn("[FilesCollection] [Upload] [HTTP] Exception:", error);                                     // 786
                                                                                                                       //
              if (!response.headersSent) {                                                                             // 787
                response.writeHead(500);                                                                               // 788
              }                                                                                                        // 1144
                                                                                                                       //
              if (!response.finished) {                                                                                // 789
                response.end(JSON.stringify({                                                                          // 790
                  error: error                                                                                         // 790
                }));                                                                                                   // 790
              }                                                                                                        // 1149
            };                                                                                                         // 785
                                                                                                                       //
            body = '';                                                                                                 // 793
            request.on('data', function (data) {                                                                       // 794
              return bound(function () {                                                                               // 1153
                body += data;                                                                                          // 795
              });                                                                                                      // 794
            });                                                                                                        // 794
            request.on('end', function () {                                                                            // 798
              return bound(function () {                                                                               // 1158
                var _continueUpload, e, error, opts, ref, ref1, ref2, ref3, result, user;                              // 799
                                                                                                                       //
                try {                                                                                                  // 799
                  if (request.headers['x-mtok'] && ((ref = Meteor.server.sessions) != null ? ref[request.headers['x-mtok']] : void 0)) {
                    user = {                                                                                           // 801
                      userId: (ref1 = Meteor.server.sessions[request.headers['x-mtok']]) != null ? ref1.userId : void 0
                    };                                                                                                 // 801
                  } else {                                                                                             // 800
                    user = self._getUser({                                                                             // 803
                      request: request,                                                                                // 803
                      response: response                                                                               // 803
                    });                                                                                                // 803
                  }                                                                                                    // 1170
                                                                                                                       //
                  if (request.headers['x-start'] !== '1') {                                                            // 805
                    opts = {                                                                                           // 806
                      fileId: request.headers['x-fileid']                                                              // 806
                    };                                                                                                 // 806
                                                                                                                       //
                    if (request.headers['x-eof'] === '1') {                                                            // 807
                      opts.eof = true;                                                                                 // 808
                    } else {                                                                                           // 807
                      if (typeof Buffer.from === 'function') {                                                         // 810
                        try {                                                                                          // 811
                          opts.binData = Buffer.from(body, 'base64');                                                  // 812
                        } catch (error1) {                                                                             // 811
                          e = error1;                                                                                  // 813
                          opts.binData = new Buffer(body, 'base64');                                                   // 814
                        }                                                                                              // 810
                      } else {                                                                                         // 810
                        opts.binData = new Buffer(body, 'base64');                                                     // 816
                      }                                                                                                // 1187
                                                                                                                       //
                      opts.chunkId = parseInt(request.headers['x-chunkid']);                                           // 817
                    }                                                                                                  // 1189
                                                                                                                       //
                    _continueUpload = self._continueUpload(opts.fileId);                                               // 819
                                                                                                                       //
                    if (!_continueUpload) {                                                                            // 820
                      throw new Meteor.Error(408, 'Can\'t continue upload, session expired. Start upload again.');     // 821
                    }                                                                                                  // 1193
                                                                                                                       //
                    ref2 = self._prepareUpload(_.extend(opts, _continueUpload), user.userId, 'HTTP'), result = ref2.result, opts = ref2.opts;
                                                                                                                       //
                    if (opts.eof) {                                                                                    // 825
                      self._handleUpload(result, opts, function () {                                                   // 826
                        var ref3;                                                                                      // 827
                                                                                                                       //
                        if (!response.headersSent) {                                                                   // 827
                          response.writeHead(200);                                                                     // 828
                        }                                                                                              // 1200
                                                                                                                       //
                        if (result != null ? (ref3 = result.file) != null ? ref3.meta : void 0 : void 0) {             // 829
                          result.file.meta = fixJSONStringify(result.file.meta);                                       // 829
                        }                                                                                              // 1203
                                                                                                                       //
                        if (!response.finished) {                                                                      // 830
                          response.end(JSON.stringify(result));                                                        // 831
                        }                                                                                              // 1206
                      });                                                                                              // 826
                                                                                                                       //
                      return;                                                                                          // 833
                    } else {                                                                                           // 825
                      self.emit('_handleUpload', result, opts, NOOP);                                                  // 835
                    }                                                                                                  // 1211
                                                                                                                       //
                    if (!response.headersSent) {                                                                       // 837
                      response.writeHead(204);                                                                         // 838
                    }                                                                                                  // 1214
                                                                                                                       //
                    if (!response.finished) {                                                                          // 839
                      response.end();                                                                                  // 840
                    }                                                                                                  // 805
                  } else {                                                                                             // 805
                    try {                                                                                              // 843
                      opts = JSON.parse(body);                                                                         // 844
                    } catch (error1) {                                                                                 // 843
                      e = error1;                                                                                      // 845
                      console.error('Can\'t parse incoming JSON from Client on [.insert() | upload], something went wrong!');
                      console.error(e);                                                                                // 847
                      opts = {                                                                                         // 848
                        file: {}                                                                                       // 848
                      };                                                                                               // 848
                    }                                                                                                  // 1228
                                                                                                                       //
                    opts.___s = true;                                                                                  // 850
                                                                                                                       //
                    if (self.debug) {                                                                                  // 851
                      console.info("[FilesCollection] [File Start HTTP] " + opts.file.name + " - " + opts.fileId);     // 851
                    }                                                                                                  // 1232
                                                                                                                       //
                    if (opts != null ? (ref3 = opts.file) != null ? ref3.meta : void 0 : void 0) {                     // 852
                      opts.file.meta = fixJSONParse(opts.file.meta);                                                   // 852
                    }                                                                                                  // 1235
                                                                                                                       //
                    result = self._prepareUpload(_.clone(opts), user.userId, 'HTTP Start Method').result;              // 853
                                                                                                                       //
                    if (self.collection.findOne(result._id)) {                                                         // 854
                      throw new Meteor.Error(400, 'Can\'t start upload, data substitution detected!');                 // 855
                    }                                                                                                  // 1239
                                                                                                                       //
                    opts._id = opts.fileId;                                                                            // 856
                    opts.createdAt = new Date();                                                                       // 857
                                                                                                                       //
                    self._preCollection.insert(_.omit(opts, '___s'));                                                  // 858
                                                                                                                       //
                    self._createStream(result._id, result.path, _.omit(opts, '___s'));                                 // 859
                                                                                                                       //
                    if (opts.returnMeta) {                                                                             // 861
                      if (!response.headersSent) {                                                                     // 862
                        response.writeHead(200);                                                                       // 863
                      }                                                                                                // 1247
                                                                                                                       //
                      if (!response.finished) {                                                                        // 864
                        response.end(JSON.stringify({                                                                  // 865
                          uploadRoute: self.downloadRoute + "/" + self.collectionName + "/__upload",                   // 866
                          file: result                                                                                 // 867
                        }));                                                                                           // 865
                      }                                                                                                // 861
                    } else {                                                                                           // 861
                      if (!response.headersSent) {                                                                     // 870
                        response.writeHead(204);                                                                       // 871
                      }                                                                                                // 1257
                                                                                                                       //
                      if (!response.finished) {                                                                        // 872
                        response.end();                                                                                // 873
                      }                                                                                                // 861
                    }                                                                                                  // 805
                  }                                                                                                    // 799
                } catch (error1) {                                                                                     // 799
                  error = error1;                                                                                      // 874
                  handleError(error);                                                                                  // 875
                }                                                                                                      // 1266
              });                                                                                                      // 798
            });                                                                                                        // 798
          } else {                                                                                                     // 783
            next();                                                                                                    // 878
          }                                                                                                            // 1271
                                                                                                                       //
          return;                                                                                                      // 879
        }                                                                                                              // 1273
                                                                                                                       //
        if (!self["public"]) {                                                                                         // 881
          if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName)) {                    // 882
            uri = request._parsedUrl.path.replace(self.downloadRoute + "/" + self.collectionName, '');                 // 883
                                                                                                                       //
            if (uri.indexOf('/') === 0) {                                                                              // 884
              uri = uri.substring(1);                                                                                  // 885
            }                                                                                                          // 1279
                                                                                                                       //
            uris = uri.split('/');                                                                                     // 887
                                                                                                                       //
            if (uris.length === 3) {                                                                                   // 888
              params = {                                                                                               // 889
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                _id: uris[0],                                                                                          // 891
                version: uris[1],                                                                                      // 892
                name: uris[2]                                                                                          // 893
              };                                                                                                       // 890
              http = {                                                                                                 // 894
                request: request,                                                                                      // 894
                response: response,                                                                                    // 894
                params: params                                                                                         // 894
              };                                                                                                       // 894
                                                                                                                       //
              if (self._checkAccess(http)) {                                                                           // 895
                self.download(http, uris[1], self.collection.findOne(uris[0]));                                        // 895
              }                                                                                                        // 888
            } else {                                                                                                   // 888
              next();                                                                                                  // 897
            }                                                                                                          // 882
          } else {                                                                                                     // 882
            next();                                                                                                    // 899
          }                                                                                                            // 881
        } else {                                                                                                       // 881
          if (!!~request._parsedUrl.path.indexOf("" + self.downloadRoute)) {                                           // 901
            uri = request._parsedUrl.path.replace("" + self.downloadRoute, '');                                        // 902
                                                                                                                       //
            if (uri.indexOf('/') === 0) {                                                                              // 903
              uri = uri.substring(1);                                                                                  // 904
            }                                                                                                          // 1307
                                                                                                                       //
            uris = uri.split('/');                                                                                     // 906
            _file = uris[uris.length - 1];                                                                             // 907
                                                                                                                       //
            if (_file) {                                                                                               // 908
              if (!!~_file.indexOf('-')) {                                                                             // 909
                version = _file.split('-')[0];                                                                         // 910
                _file = _file.split('-')[1].split('?')[0];                                                             // 911
              } else {                                                                                                 // 909
                version = 'original';                                                                                  // 913
                _file = _file.split('?')[0];                                                                           // 914
              }                                                                                                        // 1317
                                                                                                                       //
              params = {                                                                                               // 916
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                file: _file,                                                                                           // 918
                _id: _file.split('.')[0],                                                                              // 919
                version: version,                                                                                      // 920
                name: _file                                                                                            // 921
              };                                                                                                       // 917
              http = {                                                                                                 // 922
                request: request,                                                                                      // 922
                response: response,                                                                                    // 922
                params: params                                                                                         // 922
              };                                                                                                       // 922
              self.download(http, version, self.collection.findOne(params._id));                                       // 923
            } else {                                                                                                   // 908
              next();                                                                                                  // 925
            }                                                                                                          // 901
          } else {                                                                                                     // 901
            next();                                                                                                    // 927
          }                                                                                                            // 881
        }                                                                                                              // 1337
      });                                                                                                              // 781
      _methods = {};                                                                                                   // 930
                                                                                                                       //
      _methods[self._methodNames._Remove] = function (selector) {                                                      // 935
        var cursor, user, userFuncs;                                                                                   // 936
        check(selector, Match.OneOf(String, Object));                                                                  // 936
                                                                                                                       //
        if (self.debug) {                                                                                              // 937
          console.info("[FilesCollection] [Unlink Method] [.remove(" + selector + ")]");                               // 937
        }                                                                                                              // 1345
                                                                                                                       //
        if (self.allowClientCode) {                                                                                    // 939
          if (self.onBeforeRemove && _.isFunction(self.onBeforeRemove)) {                                              // 940
            user = false;                                                                                              // 941
            userFuncs = {                                                                                              // 942
              userId: this.userId,                                                                                     // 943
              user: function () {                                                                                      // 944
                if (Meteor.users) {                                                                                    // 944
                  return Meteor.users.findOne(this.userId);                                                            // 1353
                } else {                                                                                               // 944
                  return null;                                                                                         // 1355
                }                                                                                                      // 1356
              }                                                                                                        // 942
            };                                                                                                         // 942
                                                                                                                       //
            if (!self.onBeforeRemove.call(userFuncs, self.find(selector) || null)) {                                   // 947
              throw new Meteor.Error(403, '[FilesCollection] [remove] Not permitted!');                                // 948
            }                                                                                                          // 940
          }                                                                                                            // 1362
                                                                                                                       //
          cursor = self.find(selector);                                                                                // 950
                                                                                                                       //
          if (cursor.count() > 0) {                                                                                    // 951
            self.remove(selector);                                                                                     // 952
            return true;                                                                                               // 953
          } else {                                                                                                     // 951
            throw new Meteor.Error(404, 'Cursor is empty, no files is removed');                                       // 955
          }                                                                                                            // 939
        } else {                                                                                                       // 939
          throw new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!');              // 957
        }                                                                                                              // 1372
      };                                                                                                               // 935
                                                                                                                       //
      _methods[self._methodNames._Start] = function (opts, returnMeta) {                                               // 967
        var result;                                                                                                    // 968
        check(opts, {                                                                                                  // 968
          file: Object,                                                                                                // 969
          fileId: String,                                                                                              // 970
          FSName: Match.Optional(String),                                                                              // 971
          chunkSize: Number,                                                                                           // 972
          fileLength: Number                                                                                           // 973
        });                                                                                                            // 968
        check(returnMeta, Match.Optional(Boolean));                                                                    // 976
                                                                                                                       //
        if (self.debug) {                                                                                              // 978
          console.info("[FilesCollection] [File Start Method] " + opts.file.name + " - " + opts.fileId);               // 978
        }                                                                                                              // 1386
                                                                                                                       //
        opts.___s = true;                                                                                              // 979
        result = self._prepareUpload(_.clone(opts), this.userId, 'DDP Start Method').result;                           // 980
                                                                                                                       //
        if (self.collection.findOne(result._id)) {                                                                     // 981
          throw new Meteor.Error(400, 'Can\'t start upload, data substitution detected!');                             // 982
        }                                                                                                              // 1391
                                                                                                                       //
        opts._id = opts.fileId;                                                                                        // 983
        opts.createdAt = new Date();                                                                                   // 984
                                                                                                                       //
        self._preCollection.insert(_.omit(opts, '___s'));                                                              // 985
                                                                                                                       //
        self._createStream(result._id, result.path, _.omit(opts, '___s'));                                             // 986
                                                                                                                       //
        if (returnMeta) {                                                                                              // 988
          return {                                                                                                     // 989
            uploadRoute: self.downloadRoute + "/" + self.collectionName + "/__upload",                                 // 990
            file: result                                                                                               // 991
          };                                                                                                           // 989
        } else {                                                                                                       // 988
          return true;                                                                                                 // 994
        }                                                                                                              // 1403
      };                                                                                                               // 967
                                                                                                                       //
      _methods[self._methodNames._Write] = function (opts) {                                                           // 1000
        var _continueUpload, e, ref, result;                                                                           // 1001
                                                                                                                       //
        check(opts, {                                                                                                  // 1001
          eof: Match.Optional(Boolean),                                                                                // 1002
          fileId: String,                                                                                              // 1003
          binData: Match.Optional(String),                                                                             // 1004
          chunkId: Match.Optional(Number)                                                                              // 1005
        });                                                                                                            // 1001
                                                                                                                       //
        if (opts.binData) {                                                                                            // 1008
          if (typeof Buffer.from === 'function') {                                                                     // 1009
            try {                                                                                                      // 1010
              opts.binData = Buffer.from(opts.binData, 'base64');                                                      // 1011
            } catch (error1) {                                                                                         // 1010
              e = error1;                                                                                              // 1012
              opts.binData = new Buffer(opts.binData, 'base64');                                                       // 1013
            }                                                                                                          // 1009
          } else {                                                                                                     // 1009
            opts.binData = new Buffer(opts.binData, 'base64');                                                         // 1015
          }                                                                                                            // 1008
        }                                                                                                              // 1424
                                                                                                                       //
        _continueUpload = self._continueUpload(opts.fileId);                                                           // 1017
                                                                                                                       //
        if (!_continueUpload) {                                                                                        // 1018
          throw new Meteor.Error(408, 'Can\'t continue upload, session expired. Start upload again.');                 // 1019
        }                                                                                                              // 1428
                                                                                                                       //
        this.unblock();                                                                                                // 1021
        ref = self._prepareUpload(_.extend(opts, _continueUpload), this.userId, 'DDP'), result = ref.result, opts = ref.opts;
                                                                                                                       //
        if (opts.eof) {                                                                                                // 1024
          try {                                                                                                        // 1025
            return Meteor.wrapAsync(self._handleUpload.bind(self, result, opts))();                                    // 1026
          } catch (error1) {                                                                                           // 1025
            e = error1;                                                                                                // 1027
                                                                                                                       //
            if (self.debug) {                                                                                          // 1028
              console.warn("[FilesCollection] [Write Method] [DDP] Exception:", e);                                    // 1028
            }                                                                                                          // 1438
                                                                                                                       //
            throw e;                                                                                                   // 1029
          }                                                                                                            // 1024
        } else {                                                                                                       // 1024
          self.emit('_handleUpload', result, opts, NOOP);                                                              // 1031
        }                                                                                                              // 1443
                                                                                                                       //
        return true;                                                                                                   // 1032
      };                                                                                                               // 1000
                                                                                                                       //
      _methods[self._methodNames._Abort] = function (_id) {                                                            // 1039
        var _continueUpload, ref, ref1, ref2;                                                                          // 1040
                                                                                                                       //
        check(_id, String);                                                                                            // 1040
        _continueUpload = self._continueUpload(_id);                                                                   // 1042
                                                                                                                       //
        if (self.debug) {                                                                                              // 1043
          console.info("[FilesCollection] [Abort Method]: " + _id + " - " + (_continueUpload != null ? (ref = _continueUpload.file) != null ? ref.path : void 0 : void 0));
        }                                                                                                              // 1452
                                                                                                                       //
        if ((ref1 = self._currentUploads) != null ? ref1[_id] : void 0) {                                              // 1045
          self._currentUploads[_id].stop();                                                                            // 1046
                                                                                                                       //
          self._currentUploads[_id].abort();                                                                           // 1047
        }                                                                                                              // 1456
                                                                                                                       //
        if (_continueUpload) {                                                                                         // 1049
          self._preCollection.remove({                                                                                 // 1050
            _id: _id                                                                                                   // 1050
          });                                                                                                          // 1050
                                                                                                                       //
          self.remove({                                                                                                // 1051
            _id: _id                                                                                                   // 1051
          });                                                                                                          // 1051
                                                                                                                       //
          if (_continueUpload != null ? (ref2 = _continueUpload.file) != null ? ref2.path : void 0 : void 0) {         // 1052
            self.unlink({                                                                                              // 1052
              _id: _id,                                                                                                // 1052
              path: _continueUpload.file.path                                                                          // 1052
            });                                                                                                        // 1052
          }                                                                                                            // 1049
        }                                                                                                              // 1470
                                                                                                                       //
        return true;                                                                                                   // 1053
      };                                                                                                               // 1039
                                                                                                                       //
      Meteor.methods(_methods);                                                                                        // 1055
    }                                                                                                                  // 1474
  } /*                                                                                                                 // 498
    @locus Server                                                                                                      //
    @memberOf FilesCollection                                                                                          //
    @name _prepareUpload                                                                                               //
    @summary Internal method. Used to optimize received data and check upload permission                               //
    @returns {Object}                                                                                                  //
     */                                                                                                                //
                                                                                                                       //
  FilesCollection.prototype._prepareUpload = Meteor.isServer ? function (opts, userId, transport) {                    // 1486
    var base, ctx, extension, extensionWithDot, fileName, isUploadAllowed, ref, result;                                // 1065
                                                                                                                       //
    if (opts.eof == null) {                                                                                            // 1488
      opts.eof = false;                                                                                                // 1065
    }                                                                                                                  // 1490
                                                                                                                       //
    if (opts.binData == null) {                                                                                        // 1491
      opts.binData = 'EOF';                                                                                            // 1066
    }                                                                                                                  // 1493
                                                                                                                       //
    if (opts.chunkId == null) {                                                                                        // 1494
      opts.chunkId = -1;                                                                                               // 1067
    }                                                                                                                  // 1496
                                                                                                                       //
    if (opts.FSName == null) {                                                                                         // 1497
      opts.FSName = opts.fileId;                                                                                       // 1068
    }                                                                                                                  // 1499
                                                                                                                       //
    if ((base = opts.file).meta == null) {                                                                             // 1500
      base.meta = {};                                                                                                  // 1501
    }                                                                                                                  // 1502
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1071
      console.info("[FilesCollection] [Upload] [" + transport + "] Got #" + opts.chunkId + "/" + opts.fileLength + " chunks, dst: " + (opts.file.name || opts.file.fileName));
    }                                                                                                                  // 1505
                                                                                                                       //
    fileName = this._getFileName(opts.file);                                                                           // 1073
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  // 1074
    result = opts.file;                                                                                                // 1076
    result.name = fileName;                                                                                            // 1077
    result.meta = opts.file.meta;                                                                                      // 1078
    result.extension = extension;                                                                                      // 1079
    result.ext = extension;                                                                                            // 1080
    result._id = opts.fileId;                                                                                          // 1081
    result.userId = userId || null;                                                                                    // 1082
    opts.FSName = opts.FSName.replace(/([^a-z0-9\-\_]+)/gi, '-');                                                      // 1083
    result.path = "" + this.storagePath(result) + nodePath.sep + opts.FSName + extensionWithDot;                       // 1084
    result = _.extend(result, this._dataToSchema(result));                                                             // 1085
                                                                                                                       //
    if (this.onBeforeUpload && _.isFunction(this.onBeforeUpload)) {                                                    // 1087
      ctx = _.extend({                                                                                                 // 1088
        file: opts.file                                                                                                // 1089
      }, {                                                                                                             // 1088
        chunkId: opts.chunkId,                                                                                         // 1091
        userId: result.userId,                                                                                         // 1092
        user: function () {                                                                                            // 1093
          if (Meteor.users && result.userId) {                                                                         // 1093
            return Meteor.users.findOne(result.userId);                                                                // 1526
          } else {                                                                                                     // 1093
            return null;                                                                                               // 1528
          }                                                                                                            // 1529
        },                                                                                                             // 1090
        eof: opts.eof                                                                                                  // 1094
      });                                                                                                              // 1090
      isUploadAllowed = this.onBeforeUpload.call(ctx, result);                                                         // 1096
                                                                                                                       //
      if (isUploadAllowed !== true) {                                                                                  // 1098
        throw new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : '@onBeforeUpload() returned false');
      } else {                                                                                                         // 1098
        if (opts.___s === true && this.onInitiateUpload && _.isFunction(this.onInitiateUpload)) {                      // 1101
          this.onInitiateUpload.call(ctx, result);                                                                     // 1102
        }                                                                                                              // 1098
      }                                                                                                                // 1087
    } else if (opts.___s === true && this.onInitiateUpload && _.isFunction(this.onInitiateUpload)) {                   // 1087
      ctx = _.extend({                                                                                                 // 1104
        file: opts.file                                                                                                // 1105
      }, {                                                                                                             // 1104
        chunkId: opts.chunkId,                                                                                         // 1107
        userId: result.userId,                                                                                         // 1108
        user: function () {                                                                                            // 1109
          if (Meteor.users && result.userId) {                                                                         // 1109
            return Meteor.users.findOne(result.userId);                                                                // 1549
          } else {                                                                                                     // 1109
            return null;                                                                                               // 1551
          }                                                                                                            // 1552
        },                                                                                                             // 1106
        eof: opts.eof                                                                                                  // 1110
      });                                                                                                              // 1106
      this.onInitiateUpload.call(ctx, result);                                                                         // 1112
    }                                                                                                                  // 1557
                                                                                                                       //
    return {                                                                                                           // 1114
      result: result,                                                                                                  // 1114
      opts: opts                                                                                                       // 1114
    };                                                                                                                 // 1114
  } : void 0; /*                                                                                                       // 1064
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name _finishUpload                                                                                      //
              @summary Internal method. Finish upload, close Writable stream, add record to MongoDB and flush used memory
              @returns {undefined}                                                                                     //
               */                                                                                                      //
  FilesCollection.prototype._finishUpload = Meteor.isServer ? function (result, opts, cb) {                            // 1573
    var self;                                                                                                          // 1125
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1125
      console.info("[FilesCollection] [Upload] [finish(ing)Upload] -> " + result.path);                                // 1125
    }                                                                                                                  // 1577
                                                                                                                       //
    fs.chmod(result.path, this.permissions, NOOP);                                                                     // 1126
    self = this;                                                                                                       // 1127
    result.type = this._getMimeType(opts.file);                                                                        // 1128
    result["public"] = this["public"];                                                                                 // 1129
                                                                                                                       //
    this._updateFileTypes(result);                                                                                     // 1130
                                                                                                                       //
    this.collection.insert(_.clone(result), function (error, _id) {                                                    // 1132
      if (error) {                                                                                                     // 1133
        cb && cb(error);                                                                                               // 1134
                                                                                                                       //
        if (self.debug) {                                                                                              // 1135
          console.error('[FilesCollection] [Upload] [_finishUpload] Error:', error);                                   // 1135
        }                                                                                                              // 1133
      } else {                                                                                                         // 1133
        self._preCollection.update({                                                                                   // 1137
          _id: opts.fileId                                                                                             // 1137
        }, {                                                                                                           // 1137
          $set: {                                                                                                      // 1137
            isFinished: true                                                                                           // 1137
          }                                                                                                            // 1137
        });                                                                                                            // 1137
                                                                                                                       //
        result._id = _id;                                                                                              // 1138
                                                                                                                       //
        if (self.debug) {                                                                                              // 1139
          console.info("[FilesCollection] [Upload] [finish(ed)Upload] -> " + result.path);                             // 1139
        }                                                                                                              // 1600
                                                                                                                       //
        self.onAfterUpload && self.onAfterUpload.call(self, result);                                                   // 1140
        self.emit('afterUpload', result);                                                                              // 1141
        cb && cb(null, result);                                                                                        // 1142
      }                                                                                                                // 1604
    });                                                                                                                // 1132
  } : void 0; /*                                                                                                       // 1124
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name _handleUpload                                                                                      //
              @summary Internal method to handle upload process, pipe incoming data to Writable stream                 //
              @returns {undefined}                                                                                     //
               */                                                                                                      //
  FilesCollection.prototype._handleUpload = Meteor.isServer ? function (result, opts, cb) {                            // 1617
    var e, self;                                                                                                       // 1155
                                                                                                                       //
    try {                                                                                                              // 1155
      if (opts.eof) {                                                                                                  // 1156
        self = this;                                                                                                   // 1157
                                                                                                                       //
        this._currentUploads[result._id].end(function () {                                                             // 1158
          return bound(function () {                                                                                   // 1623
            self.emit('_finishUpload', result, opts, cb);                                                              // 1159
          });                                                                                                          // 1158
        });                                                                                                            // 1158
      } else {                                                                                                         // 1156
        this._currentUploads[result._id].write(opts.chunkId, opts.binData, cb);                                        // 1162
      }                                                                                                                // 1155
    } catch (error1) {                                                                                                 // 1155
      e = error1;                                                                                                      // 1163
                                                                                                                       //
      if (this.debug) {                                                                                                // 1164
        console.warn("[_handleUpload] [EXCEPTION:]", e);                                                               // 1164
      }                                                                                                                // 1634
                                                                                                                       //
      cb && cb(e);                                                                                                     // 1165
    }                                                                                                                  // 1636
  } : void 0; /*                                                                                                       // 1154
              @locus Anywhere                                                                                          //
              @memberOf FilesCollection                                                                                //
              @name _getMimeType                                                                                       //
              @param {Object} fileData - File Object                                                                   //
              @summary Returns file's mime-type                                                                        //
              @returns {String}                                                                                        //
               */                                                                                                      //
                                                                                                                       //
  FilesCollection.prototype._getMimeType = function (fileData) {                                                       // 1649
    var br, buf, error, ext, fd, mime, ref;                                                                            // 1178
    check(fileData, Object);                                                                                           // 1178
                                                                                                                       //
    if (fileData != null ? fileData.type : void 0) {                                                                   // 1179
      mime = fileData.type;                                                                                            // 1179
    }                                                                                                                  // 1654
                                                                                                                       //
    if (Meteor.isServer && fileData.path && (!mime || !_.isString(mime))) {                                            // 1180
      try {                                                                                                            // 1181
        buf = new Buffer(262);                                                                                         // 1182
        fd = fs.openSync(fileData.path, 'r');                                                                          // 1183
        br = fs.readSync(fd, buf, 0, 262, 0);                                                                          // 1184
        fs.close(fd, NOOP);                                                                                            // 1185
                                                                                                                       //
        if (br < 262) {                                                                                                // 1186
          buf = buf.slice(0, br);                                                                                      // 1186
        }                                                                                                              // 1663
                                                                                                                       //
        ref = fileType(buf), mime = ref.mime, ext = ref.ext;                                                           // 1187
      } catch (error1) {                                                                                               // 1181
        error = error1;                                                                                                // 1188
      }                                                                                                                // 1180
    }                                                                                                                  // 1668
                                                                                                                       //
    if (!mime || !_.isString(mime)) {                                                                                  // 1189
      mime = 'application/octet-stream';                                                                               // 1190
    }                                                                                                                  // 1671
                                                                                                                       //
    return mime;                                                                                                       // 1191
  }; /*                                                                                                                // 1177
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _getFileName                                                                                                //
     @param {Object} fileData - File Object                                                                            //
     @summary Returns file's name                                                                                      //
     @returns {String}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._getFileName = function (fileData) {                                                       // 1685
    var fileName;                                                                                                      // 1202
    fileName = fileData.name || fileData.fileName;                                                                     // 1202
                                                                                                                       //
    if (_.isString(fileName) && fileName.length > 0) {                                                                 // 1203
      return (fileData.name || fileData.fileName).replace(/\.\./g, '').replace(/\//g, '');                             // 1204
    } else {                                                                                                           // 1203
      return '';                                                                                                       // 1206
    }                                                                                                                  // 1692
  }; /*                                                                                                                // 1201
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _getUser                                                                                                    //
     @summary Returns object with `userId` and `user()` method which return user's object                              //
     @returns {Object}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._getUser = function (http) {                                                               // 1704
    var cookie, mtok, ref, ref1, result, userId;                                                                       // 1216
    result = {                                                                                                         // 1216
      user: function () {                                                                                              // 1217
        return null;                                                                                                   // 1217
      },                                                                                                               // 1217
      userId: null                                                                                                     // 1218
    };                                                                                                                 // 1217
                                                                                                                       //
    if (Meteor.isServer) {                                                                                             // 1220
      if (http) {                                                                                                      // 1221
        mtok = null;                                                                                                   // 1222
                                                                                                                       //
        if (http.request.headers['x-mtok']) {                                                                          // 1223
          mtok = http.request.headers['x-mtok'];                                                                       // 1224
        } else {                                                                                                       // 1223
          cookie = http.request.Cookies;                                                                               // 1226
                                                                                                                       //
          if (cookie.has('x_mtok')) {                                                                                  // 1227
            mtok = cookie.get('x_mtok');                                                                               // 1228
          }                                                                                                            // 1223
        }                                                                                                              // 1722
                                                                                                                       //
        if (mtok) {                                                                                                    // 1230
          userId = (ref = Meteor.server.sessions) != null ? (ref1 = ref[mtok]) != null ? ref1.userId : void 0 : void 0;
                                                                                                                       //
          if (userId) {                                                                                                // 1232
            result.user = function () {                                                                                // 1233
              return Meteor.users.findOne(userId);                                                                     // 1727
            };                                                                                                         // 1233
                                                                                                                       //
            result.userId = userId;                                                                                    // 1234
          }                                                                                                            // 1230
        }                                                                                                              // 1221
      }                                                                                                                // 1220
    } else {                                                                                                           // 1220
      if (typeof Meteor.userId === "function" ? Meteor.userId() : void 0) {                                            // 1236
        result.user = function () {                                                                                    // 1237
          return Meteor.user();                                                                                        // 1237
        };                                                                                                             // 1237
                                                                                                                       //
        result.userId = Meteor.userId();                                                                               // 1238
      }                                                                                                                // 1220
    }                                                                                                                  // 1740
                                                                                                                       //
    return result;                                                                                                     // 1240
  }; /*                                                                                                                // 1215
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _getExt                                                                                                     //
     @param {String} FileName - File name                                                                              //
     @summary Get extension from FileName                                                                              //
     @returns {Object}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._getExt = function (fileName) {                                                            // 1754
    var extension;                                                                                                     // 1251
                                                                                                                       //
    if (!!~fileName.indexOf('.')) {                                                                                    // 1251
      extension = (fileName.split('.').pop().split('?')[0] || '').toLowerCase();                                       // 1252
      return {                                                                                                         // 1253
        ext: extension,                                                                                                // 1253
        extension: extension,                                                                                          // 1253
        extensionWithDot: '.' + extension                                                                              // 1253
      };                                                                                                               // 1253
    } else {                                                                                                           // 1251
      return {                                                                                                         // 1255
        ext: '',                                                                                                       // 1255
        extension: '',                                                                                                 // 1255
        extensionWithDot: ''                                                                                           // 1255
      };                                                                                                               // 1255
    }                                                                                                                  // 1769
  }; /*                                                                                                                // 1250
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _updateFileTypes                                                                                            //
     @param {Object} data - File data                                                                                  //
     @summary Internal method. Classify file based on 'type' field                                                     //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._updateFileTypes = function (data) {                                                       // 1781
    data.isVideo = /^video\//i.test(data.type);                                                                        // 1265
    data.isAudio = /^audio\//i.test(data.type);                                                                        // 1266
    data.isImage = /^image\//i.test(data.type);                                                                        // 1267
    data.isText = /^text\//i.test(data.type);                                                                          // 1268
    data.isJSON = /^application\/json$/i.test(data.type);                                                              // 1269
    data.isPDF = /^application\/(x-)?pdf$/i.test(data.type);                                                           // 1270
  }; /*                                                                                                                // 1264
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _dataToSchema                                                                                               //
     @param {Object} data - File data                                                                                  //
     @summary Internal method. Build object in accordance with default schema from File data                           //
     @returns {Object}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._dataToSchema = function (data) {                                                          // 1800
    var ds;                                                                                                            // 1282
    ds = {                                                                                                             // 1282
      name: data.name,                                                                                                 // 1283
      extension: data.extension,                                                                                       // 1284
      path: data.path,                                                                                                 // 1285
      meta: data.meta,                                                                                                 // 1286
      type: data.type,                                                                                                 // 1287
      size: data.size,                                                                                                 // 1288
      userId: data.userId || null,                                                                                     // 1289
      versions: {                                                                                                      // 1290
        original: {                                                                                                    // 1291
          path: data.path,                                                                                             // 1292
          size: data.size,                                                                                             // 1293
          type: data.type,                                                                                             // 1294
          extension: data.extension                                                                                    // 1295
        }                                                                                                              // 1292
      },                                                                                                               // 1291
      _downloadRoute: data._downloadRoute || this.downloadRoute,                                                       // 1296
      _collectionName: data._collectionName || this.collectionName                                                     // 1297
    };                                                                                                                 // 1283
                                                                                                                       //
    if (data.fileId) {                                                                                                 // 1300
      ds._id = data.fileId;                                                                                            // 1301
    }                                                                                                                  // 1823
                                                                                                                       //
    this._updateFileTypes(ds);                                                                                         // 1303
                                                                                                                       //
    ds._storagePath = data._storagePath || this.storagePath(_.extend(data, ds));                                       // 1304
    return ds;                                                                                                         // 1305
  }; /*                                                                                                                // 1281
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name write                                                                                                       //
     @param {Buffer} buffer - Binary File's Buffer                                                                     //
     @param {Object} opts - Object with file-data                                                                      //
     @param {String} opts.name - File name, alias: `fileName`                                                          //
     @param {String} opts.type - File mime-type                                                                        //
     @param {Object} opts.meta - File additional meta-data                                                             //
     @param {String} opts.userId - UserId, default *null*                                                              //
     @param {String} opts.fileId - _id, default *null*                                                                 //
     @param {Function} callback - function(error, fileObj){...}                                                        //
     @param {Boolean} proceedAfterUpload - Proceed onAfterUpload hook                                                  //
     @summary Write buffer to FS and add to FilesCollection Collection                                                 //
     @returns {FilesCollection} Instance                                                                               //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.write = Meteor.isServer ? function (buffer, opts, callback, proceedAfterUpload) {          // 1847
    var FSName, extension, extensionWithDot, fileId, fileName, ref, result, self, stream;                              // 1324
                                                                                                                       //
    if (opts == null) {                                                                                                // 1849
      opts = {};                                                                                                       // 1323
    }                                                                                                                  // 1851
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1324
      console.info('[FilesCollection] [write()]');                                                                     // 1324
    }                                                                                                                  // 1854
                                                                                                                       //
    if (_.isFunction(opts)) {                                                                                          // 1326
      proceedAfterUpload = callback;                                                                                   // 1327
      callback = opts;                                                                                                 // 1328
      opts = {};                                                                                                       // 1329
    } else if (_.isBoolean(callback)) {                                                                                // 1326
      proceedAfterUpload = callback;                                                                                   // 1331
    } else if (_.isBoolean(opts)) {                                                                                    // 1330
      proceedAfterUpload = opts;                                                                                       // 1333
    }                                                                                                                  // 1863
                                                                                                                       //
    check(opts, Match.Optional(Object));                                                                               // 1335
    check(callback, Match.Optional(Function));                                                                         // 1336
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                // 1337
    fileId = opts.fileId || Random.id();                                                                               // 1339
    FSName = this.namingFunction ? this.namingFunction(opts) : fileId;                                                 // 1340
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : FSName;                                       // 1341
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  // 1343
    self = this;                                                                                                       // 1345
                                                                                                                       //
    if (opts == null) {                                                                                                // 1872
      opts = {};                                                                                                       // 1346
    }                                                                                                                  // 1874
                                                                                                                       //
    opts.path = "" + this.storagePath(opts) + nodePath.sep + FSName + extensionWithDot;                                // 1347
    opts.type = this._getMimeType(opts);                                                                               // 1348
                                                                                                                       //
    if (opts.meta == null) {                                                                                           // 1877
      opts.meta = {};                                                                                                  // 1349
    }                                                                                                                  // 1879
                                                                                                                       //
    if (opts.size == null) {                                                                                           // 1880
      opts.size = buffer.length;                                                                                       // 1350
    }                                                                                                                  // 1882
                                                                                                                       //
    result = this._dataToSchema({                                                                                      // 1352
      name: fileName,                                                                                                  // 1353
      path: opts.path,                                                                                                 // 1354
      meta: opts.meta,                                                                                                 // 1355
      type: opts.type,                                                                                                 // 1356
      size: opts.size,                                                                                                 // 1357
      userId: opts.userId,                                                                                             // 1358
      extension: extension                                                                                             // 1359
    });                                                                                                                // 1353
    result._id = fileId;                                                                                               // 1361
    stream = fs.createWriteStream(opts.path, {                                                                         // 1363
      flags: 'w',                                                                                                      // 1363
      mode: this.permissions                                                                                           // 1363
    });                                                                                                                // 1363
    stream.end(buffer, function (error) {                                                                              // 1364
      return bound(function () {                                                                                       // 1898
        if (error) {                                                                                                   // 1365
          callback && callback(error);                                                                                 // 1366
        } else {                                                                                                       // 1365
          self.collection.insert(result, function (error, _id) {                                                       // 1368
            var fileRef;                                                                                               // 1369
                                                                                                                       //
            if (error) {                                                                                               // 1369
              callback && callback(error);                                                                             // 1370
                                                                                                                       //
              if (self.debug) {                                                                                        // 1371
                console.warn("[FilesCollection] [write] [insert] Error: " + fileName + " -> " + self.collectionName, error);
              }                                                                                                        // 1369
            } else {                                                                                                   // 1369
              fileRef = self.collection.findOne(_id);                                                                  // 1373
              callback && callback(null, fileRef);                                                                     // 1374
                                                                                                                       //
              if (proceedAfterUpload === true) {                                                                       // 1375
                self.onAfterUpload && self.onAfterUpload.call(self, fileRef);                                          // 1376
                self.emit('afterUpload', fileRef);                                                                     // 1377
              }                                                                                                        // 1915
                                                                                                                       //
              if (self.debug) {                                                                                        // 1378
                console.info("[FilesCollection] [write]: " + fileName + " -> " + self.collectionName);                 // 1378
              }                                                                                                        // 1369
            }                                                                                                          // 1919
          });                                                                                                          // 1368
        }                                                                                                              // 1921
      });                                                                                                              // 1364
    });                                                                                                                // 1364
    return this;                                                                                                       // 1381
  } : void 0; /*                                                                                                       // 1323
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name load                                                                                               //
              @param {String} url - URL to file                                                                        //
              @param {Object} opts - Object with file-data                                                             //
              @param {String} opts.name - File name, alias: `fileName`                                                 //
              @param {String} opts.type - File mime-type                                                               //
              @param {Object} opts.meta - File additional meta-data                                                    //
              @param {String} opts.userId - UserId, default *null*                                                     //
              @param {String} opts.fileId - _id, default *null*                                                        //
              @param {Function} callback - function(error, fileObj){...}                                               //
              @param {Boolean} proceedAfterUpload - Proceed onAfterUpload hook                                         //
              @summary Download file, write stream to FS and add to FilesCollection Collection                         //
              @returns {FilesCollection} Instance                                                                      //
               */                                                                                                      //
  FilesCollection.prototype.load = Meteor.isServer ? function (url, opts, callback, proceedAfterUpload) {              // 1945
    var FSName, extension, extensionWithDot, fileId, fileName, pathParts, ref, self, storeResult;                      // 1402
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1402
      console.info("[FilesCollection] [load(" + url + ", " + JSON.stringify(opts) + ", callback)]");                   // 1402
    }                                                                                                                  // 1949
                                                                                                                       //
    if (_.isFunction(opts)) {                                                                                          // 1404
      proceedAfterUpload = callback;                                                                                   // 1405
      callback = opts;                                                                                                 // 1406
      opts = {};                                                                                                       // 1407
    } else if (_.isBoolean(callback)) {                                                                                // 1404
      proceedAfterUpload = callback;                                                                                   // 1409
    } else if (_.isBoolean(opts)) {                                                                                    // 1408
      proceedAfterUpload = opts;                                                                                       // 1411
    }                                                                                                                  // 1958
                                                                                                                       //
    check(url, String);                                                                                                // 1413
    check(opts, Match.Optional(Object));                                                                               // 1414
    check(callback, Match.Optional(Function));                                                                         // 1415
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                // 1416
    self = this;                                                                                                       // 1418
                                                                                                                       //
    if (opts == null) {                                                                                                // 1964
      opts = {};                                                                                                       // 1419
    }                                                                                                                  // 1966
                                                                                                                       //
    fileId = opts.fileId || Random.id();                                                                               // 1420
    FSName = this.namingFunction ? this.namingFunction(opts) : fileId;                                                 // 1421
    pathParts = url.split('/');                                                                                        // 1422
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : pathParts[pathParts.length - 1] || FSName;    // 1423
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  // 1425
                                                                                                                       //
    if (opts.meta == null) {                                                                                           // 1972
      opts.meta = {};                                                                                                  // 1426
    }                                                                                                                  // 1974
                                                                                                                       //
    opts.path = "" + this.storagePath(opts) + nodePath.sep + FSName + extensionWithDot;                                // 1427
                                                                                                                       //
    storeResult = function (result, callback) {                                                                        // 1429
      result._id = fileId;                                                                                             // 1430
      self.collection.insert(result, function (error, _id) {                                                           // 1432
        var fileRef;                                                                                                   // 1433
                                                                                                                       //
        if (error) {                                                                                                   // 1433
          callback && callback(error);                                                                                 // 1434
                                                                                                                       //
          if (self.debug) {                                                                                            // 1435
            console.error("[FilesCollection] [load] [insert] Error: " + fileName + " -> " + self.collectionName, error);
          }                                                                                                            // 1433
        } else {                                                                                                       // 1433
          fileRef = self.collection.findOne(_id);                                                                      // 1437
          callback && callback(null, fileRef);                                                                         // 1438
                                                                                                                       //
          if (proceedAfterUpload === true) {                                                                           // 1439
            self.onAfterUpload && self.onAfterUpload.call(self, fileRef);                                              // 1440
            self.emit('afterUpload', fileRef);                                                                         // 1441
          }                                                                                                            // 1991
                                                                                                                       //
          if (self.debug) {                                                                                            // 1442
            console.info("[FilesCollection] [load] [insert] " + fileName + " -> " + self.collectionName);              // 1442
          }                                                                                                            // 1433
        }                                                                                                              // 1995
      });                                                                                                              // 1432
    };                                                                                                                 // 1429
                                                                                                                       //
    request.get(url).on('error', function (error) {                                                                    // 1446
      return bound(function () {                                                                                       // 1999
        callback && callback(error);                                                                                   // 1447
                                                                                                                       //
        if (self.debug) {                                                                                              // 1448
          return console.error("[FilesCollection] [load] [request.get(" + url + ")] Error:", error);                   // 2002
        }                                                                                                              // 2003
      });                                                                                                              // 1446
    }).on('response', function (response) {                                                                            // 1446
      return bound(function () {                                                                                       // 2006
        response.on('end', function () {                                                                               // 1450
          return bound(function () {                                                                                   // 2008
            var result;                                                                                                // 1451
                                                                                                                       //
            if (self.debug) {                                                                                          // 1451
              console.info("[FilesCollection] [load] Received: " + url);                                               // 1451
            }                                                                                                          // 2012
                                                                                                                       //
            result = self._dataToSchema({                                                                              // 1452
              name: fileName,                                                                                          // 1453
              path: opts.path,                                                                                         // 1454
              meta: opts.meta,                                                                                         // 1455
              type: opts.type || response.headers['content-type'] || self._getMimeType({                               // 1456
                path: opts.path                                                                                        // 1456
              }),                                                                                                      // 1456
              size: opts.size || parseInt(response.headers['content-length'] || 0),                                    // 1457
              userId: opts.userId,                                                                                     // 1458
              extension: extension                                                                                     // 1459
            });                                                                                                        // 1453
                                                                                                                       //
            if (!result.size) {                                                                                        // 1461
              fs.stat(opts.path, function (error, stats) {                                                             // 1462
                return bound(function () {                                                                             // 2026
                  if (error) {                                                                                         // 1463
                    callback && callback(error);                                                                       // 1464
                  } else {                                                                                             // 1463
                    result.versions.original.size = result.size = stats.size;                                          // 1466
                    storeResult(result, callback);                                                                     // 1467
                  }                                                                                                    // 2032
                });                                                                                                    // 1462
              });                                                                                                      // 1462
            } else {                                                                                                   // 1461
              storeResult(result, callback);                                                                           // 1470
            }                                                                                                          // 2037
          });                                                                                                          // 1450
        });                                                                                                            // 1450
      });                                                                                                              // 1449
    }).pipe(fs.createWriteStream(opts.path, {                                                                          // 1446
      flags: 'w',                                                                                                      // 1474
      mode: this.permissions                                                                                           // 1474
    }));                                                                                                               // 1474
    return this;                                                                                                       // 1476
  } : void 0; /*                                                                                                       // 1401
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name addFile                                                                                            //
              @param {String} path          - Path to file                                                             //
              @param {String} opts          - [Optional] Object with file-data                                         //
              @param {String} opts.type     - [Optional] File mime-type                                                //
              @param {Object} opts.meta     - [Optional] File additional meta-data                                     //
              @param {Object} opts.fileName - [Optional] File name, if not specified file name and extension will be taken from path
              @param {String} opts.userId   - [Optional] UserId, default *null*                                        //
              @param {Function} callback    - [Optional] function(error, fileObj){...}                                 //
              @param {Boolean} proceedAfterUpload - Proceed onAfterUpload hook                                         //
              @summary Add file from FS to FilesCollection                                                             //
              @returns {FilesCollection} Instance                                                                      //
               */                                                                                                      //
  FilesCollection.prototype.addFile = Meteor.isServer ? function (path, opts, callback, proceedAfterUpload) {          // 2065
    var self;                                                                                                          // 1496
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1496
      console.info("[FilesCollection] [addFile(" + path + ")]");                                                       // 1496
    }                                                                                                                  // 2069
                                                                                                                       //
    if (_.isFunction(opts)) {                                                                                          // 1498
      proceedAfterUpload = callback;                                                                                   // 1499
      callback = opts;                                                                                                 // 1500
      opts = {};                                                                                                       // 1501
    } else if (_.isBoolean(callback)) {                                                                                // 1498
      proceedAfterUpload = callback;                                                                                   // 1503
    } else if (_.isBoolean(opts)) {                                                                                    // 1502
      proceedAfterUpload = opts;                                                                                       // 1505
    }                                                                                                                  // 2078
                                                                                                                       //
    if (this["public"]) {                                                                                              // 1507
      throw new Meteor.Error(403, 'Can not run [addFile] on public collection! Just Move file to root of your server, then add record to Collection');
    }                                                                                                                  // 2081
                                                                                                                       //
    check(path, String);                                                                                               // 1508
    check(opts, Match.Optional(Object));                                                                               // 1509
    check(callback, Match.Optional(Function));                                                                         // 1510
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                // 1511
    self = this;                                                                                                       // 1513
    fs.stat(path, function (error, stats) {                                                                            // 1514
      return bound(function () {                                                                                       // 2088
        var extension, extensionWithDot, pathParts, ref, result;                                                       // 1515
                                                                                                                       //
        if (error) {                                                                                                   // 1515
          callback && callback(error);                                                                                 // 1516
        } else if (stats.isFile()) {                                                                                   // 1515
          if (opts == null) {                                                                                          // 2093
            opts = {};                                                                                                 // 1518
          }                                                                                                            // 2095
                                                                                                                       //
          opts.path = path;                                                                                            // 1519
                                                                                                                       //
          if (!opts.fileName) {                                                                                        // 1521
            pathParts = path.split(nodePath.sep);                                                                      // 1522
            opts.fileName = pathParts[pathParts.length - 1];                                                           // 1523
          }                                                                                                            // 2100
                                                                                                                       //
          ref = self._getExt(opts.fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;       // 1525
                                                                                                                       //
          if (opts.type == null) {                                                                                     // 2102
            opts.type = self._getMimeType(opts);                                                                       // 1527
          }                                                                                                            // 2104
                                                                                                                       //
          if (opts.meta == null) {                                                                                     // 2105
            opts.meta = {};                                                                                            // 1528
          }                                                                                                            // 2107
                                                                                                                       //
          if (opts.size == null) {                                                                                     // 2108
            opts.size = stats.size;                                                                                    // 1529
          }                                                                                                            // 2110
                                                                                                                       //
          result = self._dataToSchema({                                                                                // 1531
            name: opts.fileName,                                                                                       // 1532
            path: path,                                                                                                // 1533
            meta: opts.meta,                                                                                           // 1534
            type: opts.type,                                                                                           // 1535
            size: opts.size,                                                                                           // 1536
            userId: opts.userId,                                                                                       // 1537
            extension: extension,                                                                                      // 1538
            _storagePath: path.replace("" + nodePath.sep + opts.fileName, ''),                                         // 1539
            fileId: opts.fileId || null                                                                                // 1540
          });                                                                                                          // 1532
          self.collection.insert(result, function (error, _id) {                                                       // 1543
            var fileRef;                                                                                               // 1544
                                                                                                                       //
            if (error) {                                                                                               // 1544
              callback && callback(error);                                                                             // 1545
                                                                                                                       //
              if (self.debug) {                                                                                        // 1546
                console.warn("[FilesCollection] [addFile] [insert] Error: " + result.name + " -> " + self.collectionName, error);
              }                                                                                                        // 1544
            } else {                                                                                                   // 1544
              fileRef = self.collection.findOne(_id);                                                                  // 1548
              callback && callback(null, fileRef);                                                                     // 1549
                                                                                                                       //
              if (proceedAfterUpload === true) {                                                                       // 1550
                self.onAfterUpload && self.onAfterUpload.call(self, fileRef);                                          // 1551
                self.emit('afterUpload', fileRef);                                                                     // 1552
              }                                                                                                        // 2135
                                                                                                                       //
              if (self.debug) {                                                                                        // 1553
                console.info("[FilesCollection] [addFile]: " + result.name + " -> " + self.collectionName);            // 1553
              }                                                                                                        // 1544
            }                                                                                                          // 2139
          });                                                                                                          // 1543
        } else {                                                                                                       // 1517
          callback && callback(new Meteor.Error(400, "[FilesCollection] [addFile(" + path + ")]: File does not exist"));
        }                                                                                                              // 2143
      });                                                                                                              // 1514
    });                                                                                                                // 1514
    return this;                                                                                                       // 1559
  } : void 0; /*                                                                                                       // 1495
              @locus Anywhere                                                                                          //
              @memberOf FilesCollection                                                                                //
              @name findOne                                                                                            //
              @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)
              @param {Object} options - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#sortspecifiers)
              @summary Find and return Cursor for matching document Object                                             //
              @returns {FileCursor} Instance                                                                           //
               */                                                                                                      //
                                                                                                                       //
  FilesCollection.prototype.findOne = function (selector, options) {                                                   // 2160
    var doc;                                                                                                           // 1573
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1573
      console.info("[FilesCollection] [findOne(" + JSON.stringify(selector) + ", " + JSON.stringify(options) + ")]");  // 1573
    }                                                                                                                  // 2164
                                                                                                                       //
    check(selector, Match.Optional(Match.OneOf(Object, String, Boolean, Number, null)));                               // 1574
    check(options, Match.Optional(Object));                                                                            // 1575
                                                                                                                       //
    if (!arguments.length) {                                                                                           // 1577
      selector = {};                                                                                                   // 1577
    }                                                                                                                  // 2169
                                                                                                                       //
    doc = this.collection.findOne(selector, options);                                                                  // 1578
                                                                                                                       //
    if (doc) {                                                                                                         // 1579
      return new FileCursor(doc, this);                                                                                // 2172
    } else {                                                                                                           // 1579
      return doc;                                                                                                      // 2174
    }                                                                                                                  // 2175
  }; /*                                                                                                                // 1572
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name find                                                                                                        //
     @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)    //
     @param {Object}        options  - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#sortspecifiers)
     @summary Find and return Cursor for matching documents                                                            //
     @returns {FilesCursor} Instance                                                                                   //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.find = function (selector, options) {                                                      // 2189
    if (this.debug) {                                                                                                  // 1591
      console.info("[FilesCollection] [find(" + JSON.stringify(selector) + ", " + JSON.stringify(options) + ")]");     // 1591
    }                                                                                                                  // 2192
                                                                                                                       //
    check(selector, Match.Optional(Match.OneOf(Object, String, Boolean, Number, null)));                               // 1592
    check(options, Match.Optional(Object));                                                                            // 1593
                                                                                                                       //
    if (!arguments.length) {                                                                                           // 1595
      selector = {};                                                                                                   // 1595
    }                                                                                                                  // 2197
                                                                                                                       //
    return new FilesCursor(selector, options, this);                                                                   // 1596
  }; /*                                                                                                                // 1590
     @locus Client                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name insert                                                                                                      //
     @see https://developer.mozilla.org/en-US/docs/Web/API/FileReader                                                  //
     @param {Object} config - Configuration object with next properties:                                               //
       {File|Object} file           - HTML5 `files` item, like in change event: `e.currentTarget.files[0]`             //
       {Object}      meta           - Additional data as object, use later for search                                  //
       {Boolean}     allowWebWorkers- Allow/Deny WebWorkers usage                                                      //
       {Number|dynamic} streams     - Quantity of parallel upload streams, default: 2                                  //
       {Number|dynamic} chunkSize   - Chunk size for upload                                                            //
       {String}      transport      - Upload transport `http` or `ddp`                                                 //
       {Object}      ddp            - Custom DDP connection. Object returned form `DDP.connect()`                      //
       {Function}    onUploaded     - Callback triggered when upload is finished, with two arguments `error` and `fileRef`
       {Function}    onStart        - Callback triggered when upload is started after all successful validations, with two arguments `error` (always null) and `fileRef`
       {Function}    onError        - Callback triggered on error in upload and/or FileReader, with two arguments `error` and `fileData`
       {Function}    onProgress     - Callback triggered when chunk is sent, with only argument `progress`             //
       {Function}    onBeforeUpload - Callback triggered right before upload is started:                               //
           return true to continue                                                                                     //
           return false to abort upload                                                                                //
     @param {Boolean} autoStart     - Start upload immediately. If set to false, you need manually call .start() method on returned class. Useful to set EventListeners.
     @summary Upload file to server over DDP or HTTP                                                                   //
     @returns {UploadInstance} Instance. UploadInstance has next properties:                                           //
       {ReactiveVar} onPause  - Is upload process on the pause?                                                        //
       {ReactiveVar} state    - active|paused|aborted|completed                                                        //
       {ReactiveVar} progress - Current progress in percentage                                                         //
       {Function}    pause    - Pause upload process                                                                   //
       {Function}    continue - Continue paused upload process                                                         //
       {Function}    toggle   - Toggle continue/pause if upload process                                                //
       {Function}    abort    - Abort upload                                                                           //
       {Function}    readAsDataURL - Current file as data URL, use to create image preview and etc. Be aware of big files, may lead to browser crash
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.insert = Meteor.isClient ? function (config, autoStart) {                                  // 2235
    if (autoStart == null) {                                                                                           // 2236
      autoStart = true;                                                                                                // 1630
    }                                                                                                                  // 2238
                                                                                                                       //
    return new this._UploadInstance(config, this)[autoStart ? 'start' : 'manual']();                                   // 1631
  } : void 0; /*                                                                                                       // 1630
              @locus Client                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name _UploadInstance                                                                                    //
              @class UploadInstance                                                                                    //
              @summary Internal Class, used in upload                                                                  //
               */                                                                                                      //
  FilesCollection.prototype._UploadInstance = Meteor.isClient ? UploadInstance = function () {                         // 2251
    UploadInstance.prototype.__proto__ = EventEmitter.prototype;                                                       // 2252
                                                                                                                       //
    function UploadInstance(config1, collection) {                                                                     // 1643
      var _file, base, base1, base2, base3, base4, base5, self, wwError;                                               // 1644
                                                                                                                       //
      this.config = config1;                                                                                           // 1643
      this.collection = collection;                                                                                    // 1643
      EventEmitter.call(this);                                                                                         // 1644
                                                                                                                       //
      if (this.collection.debug) {                                                                                     // 1645
        console.info('[FilesCollection] [insert()]');                                                                  // 1645
      }                                                                                                                // 2261
                                                                                                                       //
      self = this;                                                                                                     // 1646
                                                                                                                       //
      if ((base = this.config).ddp == null) {                                                                          // 2263
        base.ddp = this.collection.ddp;                                                                                // 2264
      }                                                                                                                // 2265
                                                                                                                       //
      if ((base1 = this.config).meta == null) {                                                                        // 2266
        base1.meta = {};                                                                                               // 2267
      }                                                                                                                // 2268
                                                                                                                       //
      if ((base2 = this.config).streams == null) {                                                                     // 2269
        base2.streams = 2;                                                                                             // 2270
      }                                                                                                                // 2271
                                                                                                                       //
      if (this.config.streams < 1) {                                                                                   // 1650
        this.config.streams = 2;                                                                                       // 1650
      }                                                                                                                // 2274
                                                                                                                       //
      if ((base3 = this.config).transport == null) {                                                                   // 2275
        base3.transport = 'ddp';                                                                                       // 2276
      }                                                                                                                // 2277
                                                                                                                       //
      if ((base4 = this.config).chunkSize == null) {                                                                   // 2278
        base4.chunkSize = this.collection.chunkSize;                                                                   // 2279
      }                                                                                                                // 2280
                                                                                                                       //
      if ((base5 = this.config).allowWebWorkers == null) {                                                             // 2281
        base5.allowWebWorkers = true;                                                                                  // 2282
      }                                                                                                                // 2283
                                                                                                                       //
      this.config.transport = this.config.transport.toLowerCase();                                                     // 1654
      check(this.config, {                                                                                             // 1656
        file: Match.Any,                                                                                               // 1657
        fileName: Match.Optional(String),                                                                              // 1658
        meta: Match.Optional(Object),                                                                                  // 1659
        type: Match.Optional(String),                                                                                  // 1660
        onError: Match.Optional(Function),                                                                             // 1661
        onAbort: Match.Optional(Function),                                                                             // 1662
        streams: Match.OneOf('dynamic', Number),                                                                       // 1663
        onStart: Match.Optional(Function),                                                                             // 1664
        isBase64: Match.Optional(Boolean),                                                                             // 1665
        transport: Match.OneOf('http', 'ddp'),                                                                         // 1666
        chunkSize: Match.OneOf('dynamic', Number),                                                                     // 1667
        onUploaded: Match.Optional(Function),                                                                          // 1668
        onProgress: Match.Optional(Function),                                                                          // 1669
        onBeforeUpload: Match.Optional(Function),                                                                      // 1670
        allowWebWorkers: Boolean,                                                                                      // 1671
        ddp: Match.Any                                                                                                 // 1672
      });                                                                                                              // 1656
                                                                                                                       //
      if (!this.config.fileName && !this.config.file.name) {                                                           // 1675
        throw new Meteor.Error(400, '"fileName" must me specified for base64 upload!');                                // 1676
      }                                                                                                                // 2305
                                                                                                                       //
      if (this.config.isBase64 === true) {                                                                             // 1678
        check(this.config.file, String);                                                                               // 1679
                                                                                                                       //
        if (!!~this.config.file.indexOf('data:')) {                                                                    // 1680
          this.config.file = this.config.file.replace('data:', '');                                                    // 1681
        }                                                                                                              // 2310
                                                                                                                       //
        if (!!~this.config.file.indexOf(',')) {                                                                        // 1682
          _file = this.config.file.split(',');                                                                         // 1683
          this.fileData = {                                                                                            // 1684
            size: Math.floor(_file[1].replace(/\=/g, '').length / 4 * 3),                                              // 1685
            type: _file[0].split(';')[0],                                                                              // 1686
            name: this.config.fileName,                                                                                // 1687
            meta: this.config.meta                                                                                     // 1688
          };                                                                                                           // 1685
          this.config.file = _file[1];                                                                                 // 1689
        } else if (!this.config.type) {                                                                                // 1682
          throw new Meteor.Error(400, '"type" must me specified for base64 upload! And represent mime-type of the file');
        } else {                                                                                                       // 1690
          this.fileData = {                                                                                            // 1693
            size: Math.floor(this.config.file.replace(/\=/g, '').length / 4 * 3),                                      // 1694
            type: this.config.type,                                                                                    // 1695
            name: this.config.fileName,                                                                                // 1696
            meta: this.config.meta                                                                                     // 1697
          };                                                                                                           // 1694
        }                                                                                                              // 1678
      }                                                                                                                // 2330
                                                                                                                       //
      if (this.config.file) {                                                                                          // 1699
        if (!this.config.isBase64) {                                                                                   // 1700
          this.fileData = {                                                                                            // 1701
            size: this.config.file.size,                                                                               // 1702
            type: this.config.type || this.config.file.type,                                                           // 1703
            name: this.config.fileName || this.config.file.name,                                                       // 1704
            meta: this.config.meta                                                                                     // 1705
          };                                                                                                           // 1702
        }                                                                                                              // 2339
                                                                                                                       //
        if (this.collection.debug) {                                                                                   // 1707
          console.time('insert ' + this.fileData.name);                                                                // 1708
          console.time('loadFile ' + this.fileData.name);                                                              // 1709
        }                                                                                                              // 2343
                                                                                                                       //
        if (this.collection._supportWebWorker && this.config.allowWebWorkers) {                                        // 1711
          try {                                                                                                        // 1712
            this.worker = new Worker(this.collection._webWorkerUrl);                                                   // 1713
          } catch (error1) {                                                                                           // 1712
            wwError = error1;                                                                                          // 1714
            this.worker = false;                                                                                       // 1715
                                                                                                                       //
            if (this.collection.debug) {                                                                               // 1716
              console.warn('[FilesCollection] [insert] [create WebWorker]: Can\'t create WebWorker, fallback to MainThread', wwError);
            }                                                                                                          // 1712
          }                                                                                                            // 1711
        } else {                                                                                                       // 1711
          this.worker = null;                                                                                          // 1718
        }                                                                                                              // 2356
                                                                                                                       //
        this.startTime = {};                                                                                           // 1720
        this.config.debug = this.collection.debug;                                                                     // 1721
        this.currentChunk = 0;                                                                                         // 1722
        this.transferTime = 0;                                                                                         // 1723
        this.trackerComp = null;                                                                                       // 1724
        this.sentChunks = 0;                                                                                           // 1725
        this.fileLength = 1;                                                                                           // 1726
        this.EOFsent = false;                                                                                          // 1727
        this.fileId = Random.id();                                                                                     // 1728
        this.FSName = this.collection.namingFunction ? this.collection.namingFunction(this.fileData) : this.fileId;    // 1729
        this.pipes = [];                                                                                               // 1730
        this.fileData = _.extend(this.fileData, this.collection._getExt(self.fileData.name), {                         // 1732
          mime: this.collection._getMimeType(this.fileData)                                                            // 1732
        });                                                                                                            // 1732
        this.fileData['mime-type'] = this.fileData.mime;                                                               // 1733
        this.result = new this.collection._FileUpload(_.extend(self.config, {                                          // 1735
          fileData: this.fileData,                                                                                     // 1735
          fileId: this.fileId,                                                                                         // 1735
          _Abort: this.collection._methodNames._Abort                                                                  // 1735
        }));                                                                                                           // 1735
                                                                                                                       //
        this.beforeunload = function (e) {                                                                             // 1737
          var message;                                                                                                 // 1738
          message = _.isFunction(self.collection.onbeforeunloadMessage) ? self.collection.onbeforeunloadMessage.call(self.result, self.fileData) : self.collection.onbeforeunloadMessage;
                                                                                                                       //
          if (e) {                                                                                                     // 1739
            e.returnValue = message;                                                                                   // 1739
          }                                                                                                            // 2382
                                                                                                                       //
          return message;                                                                                              // 1740
        };                                                                                                             // 1737
                                                                                                                       //
        this.result.config.beforeunload = this.beforeunload;                                                           // 1741
        window.addEventListener('beforeunload', this.beforeunload, false);                                             // 1742
                                                                                                                       //
        this.result.config._onEnd = function () {                                                                      // 1744
          return self.emitEvent('_onEnd');                                                                             // 2388
        };                                                                                                             // 1744
                                                                                                                       //
        this.addListener('end', this.end);                                                                             // 1746
        this.addListener('start', this.start);                                                                         // 1747
        this.addListener('upload', this.upload);                                                                       // 1748
        this.addListener('sendEOF', this.sendEOF);                                                                     // 1749
        this.addListener('prepare', this.prepare);                                                                     // 1750
        this.addListener('sendChunk', this.sendChunk);                                                                 // 1751
        this.addListener('proceedChunk', this.proceedChunk);                                                           // 1752
        this.addListener('createStreams', this.createStreams);                                                         // 1753
        this.addListener('calculateStats', _.throttle(function () {                                                    // 1755
          var _t, progress;                                                                                            // 1756
                                                                                                                       //
          _t = self.transferTime / self.sentChunks / self.config.streams;                                              // 1756
          self.result.estimateTime.set(_t * (self.fileLength - self.sentChunks));                                      // 1757
          self.result.estimateSpeed.set(self.config.chunkSize / (_t / 1000));                                          // 1758
          progress = Math.round(self.sentChunks / self.fileLength * 100);                                              // 1759
          self.result.progress.set(progress);                                                                          // 1760
          self.config.onProgress && self.config.onProgress.call(self.result, progress, self.fileData);                 // 1761
          self.result.emitEvent('progress', [progress, self.fileData]);                                                // 1762
        }, 250));                                                                                                      // 1755
        this.addListener('_onEnd', function () {                                                                       // 1766
          if (self.result.estimateTimer) {                                                                             // 1767
            Meteor.clearInterval(self.result.estimateTimer);                                                           // 1767
          }                                                                                                            // 2411
                                                                                                                       //
          if (self.worker) {                                                                                           // 1768
            self.worker.terminate();                                                                                   // 1768
          }                                                                                                            // 2414
                                                                                                                       //
          if (self.trackerComp) {                                                                                      // 1769
            self.trackerComp.stop();                                                                                   // 1769
          }                                                                                                            // 2417
                                                                                                                       //
          if (self.beforeunload) {                                                                                     // 1770
            window.removeEventListener('beforeunload', self.beforeunload, false);                                      // 1770
          }                                                                                                            // 2420
                                                                                                                       //
          if (self.result) {                                                                                           // 1771
            return self.result.progress.set(0);                                                                        // 2422
          }                                                                                                            // 2423
        });                                                                                                            // 1766
      } else {                                                                                                         // 1699
        throw new Meteor.Error(500, '[FilesCollection] [insert] Have you forget to pass a File itself?');              // 1773
      }                                                                                                                // 2427
    }                                                                                                                  // 1643
                                                                                                                       //
    UploadInstance.prototype.end = function (error, data) {                                                            // 2430
      if (this.collection.debug) {                                                                                     // 1776
        console.timeEnd('insert ' + this.fileData.name);                                                               // 1776
      }                                                                                                                // 2433
                                                                                                                       //
      this.emitEvent('_onEnd');                                                                                        // 1777
      this.result.emitEvent('uploaded', [error, data]);                                                                // 1778
      this.config.onUploaded && this.config.onUploaded.call(this.result, error, data);                                 // 1779
                                                                                                                       //
      if (error) {                                                                                                     // 1780
        if (this.collection.debug) {                                                                                   // 1781
          console.error('[FilesCollection] [insert] [end] Error:', error);                                             // 1781
        }                                                                                                              // 2440
                                                                                                                       //
        this.result.abort();                                                                                           // 1782
        this.result.state.set('aborted');                                                                              // 1783
        this.result.emitEvent('error', [error, this.fileData]);                                                        // 1784
        this.config.onError && this.config.onError.call(this.result, error, this.fileData);                            // 1785
      } else {                                                                                                         // 1780
        this.result.state.set('completed');                                                                            // 1787
        this.collection.emitEvent('afterUpload', [data]);                                                              // 1788
      }                                                                                                                // 2448
                                                                                                                       //
      this.result.emitEvent('end', [error, data || this.fileData]);                                                    // 1789
      return this.result;                                                                                              // 1790
    };                                                                                                                 // 1775
                                                                                                                       //
    UploadInstance.prototype.sendChunk = function (evt) {                                                              // 2453
      var j, len, opts, p, pad, pipeFunc, ref, ref1, self;                                                             // 1793
      self = this;                                                                                                     // 1793
      opts = {                                                                                                         // 1794
        fileId: this.fileId,                                                                                           // 1795
        binData: evt.data.bin,                                                                                         // 1796
        chunkId: evt.data.chunkId                                                                                      // 1797
      };                                                                                                               // 1795
                                                                                                                       //
      if (this.config.isBase64) {                                                                                      // 1799
        pad = opts.binData.length % 4;                                                                                 // 1800
                                                                                                                       //
        if (pad) {                                                                                                     // 1801
          p = 0;                                                                                                       // 1802
                                                                                                                       //
          while (p < pad) {                                                                                            // 1803
            opts.binData += '=';                                                                                       // 1804
            p++;                                                                                                       // 1805
          }                                                                                                            // 1801
        }                                                                                                              // 1799
      }                                                                                                                // 2470
                                                                                                                       //
      this.emitEvent('data', [evt.data.bin]);                                                                          // 1807
                                                                                                                       //
      if (this.pipes.length) {                                                                                         // 1808
        ref = this.pipes;                                                                                              // 1809
                                                                                                                       //
        for (j = 0, len = ref.length; j < len; j++) {                                                                  // 1809
          pipeFunc = ref[j];                                                                                           // 2475
          opts.binData = pipeFunc(opts.binData);                                                                       // 1810
        }                                                                                                              // 1808
      }                                                                                                                // 2478
                                                                                                                       //
      if (this.fileLength === evt.data.chunkId) {                                                                      // 1812
        if (this.collection.debug) {                                                                                   // 1813
          console.timeEnd('loadFile ' + this.fileData.name);                                                           // 1813
        }                                                                                                              // 2482
                                                                                                                       //
        this.emitEvent('readEnd');                                                                                     // 1814
      }                                                                                                                // 2484
                                                                                                                       //
      if (opts.binData) {                                                                                              // 1816
        if (this.config.transport === 'ddp') {                                                                         // 1817
          this.config.ddp.call(this.collection._methodNames._Write, opts, function (error) {                           // 1818
            self.transferTime += +new Date() - self.startTime[opts.chunkId];                                           // 1819
                                                                                                                       //
            if (error) {                                                                                               // 1820
              if (self.result.state.get() !== 'aborted') {                                                             // 1821
                self.emitEvent('end', [error]);                                                                        // 1822
              }                                                                                                        // 1820
            } else {                                                                                                   // 1820
              ++self.sentChunks;                                                                                       // 1824
                                                                                                                       //
              if (self.sentChunks >= self.fileLength) {                                                                // 1825
                self.emitEvent('sendEOF');                                                                             // 1826
              } else if (self.currentChunk < self.fileLength) {                                                        // 1825
                self.emitEvent('upload');                                                                              // 1828
              }                                                                                                        // 2499
                                                                                                                       //
              self.emitEvent('calculateStats');                                                                        // 1829
            }                                                                                                          // 2501
          });                                                                                                          // 1818
        } else {                                                                                                       // 1817
          HTTP.call('POST', this.collection.downloadRoute + "/" + this.collection.collectionName + "/__upload", {      // 1832
            content: opts.binData,                                                                                     // 1833
            headers: {                                                                                                 // 1834
              'x-mtok': ((ref1 = Meteor.connection) != null ? ref1._lastSessionId : void 0) || null,                   // 1835
              'x-fileid': opts.fileId,                                                                                 // 1836
              'x-chunkid': opts.chunkId,                                                                               // 1837
              'content-type': 'text/plain'                                                                             // 1838
            }                                                                                                          // 1835
          }, function (error) {                                                                                        // 1832
            self.transferTime += +new Date() - self.startTime[opts.chunkId];                                           // 1840
                                                                                                                       //
            if (error) {                                                                                               // 1841
              if ("" + error === "Error: network") {                                                                   // 1842
                self.result.pause();                                                                                   // 1843
              } else {                                                                                                 // 1842
                if (self.result.state.get() !== 'aborted') {                                                           // 1845
                  self.emitEvent('end', [error]);                                                                      // 1846
                }                                                                                                      // 1842
              }                                                                                                        // 1841
            } else {                                                                                                   // 1841
              ++self.sentChunks;                                                                                       // 1848
                                                                                                                       //
              if (self.sentChunks >= self.fileLength) {                                                                // 1849
                self.emitEvent('sendEOF');                                                                             // 1850
              } else if (self.currentChunk < self.fileLength) {                                                        // 1849
                self.emitEvent('upload');                                                                              // 1852
              }                                                                                                        // 2528
                                                                                                                       //
              self.emitEvent('calculateStats');                                                                        // 1853
            }                                                                                                          // 2530
          });                                                                                                          // 1832
        }                                                                                                              // 1816
      }                                                                                                                // 2533
    };                                                                                                                 // 1792
                                                                                                                       //
    UploadInstance.prototype.sendEOF = function () {                                                                   // 2536
      var opts, ref, self;                                                                                             // 1858
                                                                                                                       //
      if (!this.EOFsent) {                                                                                             // 1858
        this.EOFsent = true;                                                                                           // 1859
        self = this;                                                                                                   // 1860
        opts = {                                                                                                       // 1861
          eof: true,                                                                                                   // 1862
          fileId: this.fileId                                                                                          // 1863
        };                                                                                                             // 1862
                                                                                                                       //
        if (this.config.transport === 'ddp') {                                                                         // 1865
          this.config.ddp.call(this.collection._methodNames._Write, opts, function () {                                // 1866
            self.emitEvent('end', arguments);                                                                          // 1867
          });                                                                                                          // 1866
        } else {                                                                                                       // 1865
          HTTP.call('POST', this.collection.downloadRoute + "/" + this.collection.collectionName + "/__upload", {      // 1870
            content: '',                                                                                               // 1871
            headers: {                                                                                                 // 1872
              'x-mtok': ((ref = Meteor.connection) != null ? ref._lastSessionId : void 0) || null,                     // 1873
              'x-eof': '1',                                                                                            // 1874
              'x-fileId': opts.fileId,                                                                                 // 1875
              'content-type': 'text/plain'                                                                             // 1876
            }                                                                                                          // 1873
          }, function (error, result) {                                                                                // 1870
            var e;                                                                                                     // 1878
                                                                                                                       //
            try {                                                                                                      // 1878
              result = JSON.parse((result != null ? result.content : void 0) || {});                                   // 1879
            } catch (error1) {                                                                                         // 1878
              e = error1;                                                                                              // 1880
              console.warn('Something went wrong! [sendEOF] method doesn\'t returned JSON! Looks like you\'re on Cordova app or behind proxy, switching to DDP transport is recommended.');
              result = {};                                                                                             // 1882
            }                                                                                                          // 2566
                                                                                                                       //
            if (result != null ? result.meta : void 0) {                                                               // 1883
              result.meta = fixJSONParse(result.meta);                                                                 // 1883
            }                                                                                                          // 2569
                                                                                                                       //
            self.emitEvent('end', [error, result]);                                                                    // 1884
          });                                                                                                          // 1870
        }                                                                                                              // 1858
      }                                                                                                                // 2573
    };                                                                                                                 // 1857
                                                                                                                       //
    UploadInstance.prototype.proceedChunk = function (chunkId) {                                                       // 2576
      var chunk, fileReader, self;                                                                                     // 1889
      self = this;                                                                                                     // 1889
      chunk = this.config.file.slice(this.config.chunkSize * (chunkId - 1), this.config.chunkSize * chunkId);          // 1890
                                                                                                                       //
      if (this.config.isBase64) {                                                                                      // 1892
        self.emitEvent('sendChunk', [{                                                                                 // 1893
          data: {                                                                                                      // 1894
            bin: chunk,                                                                                                // 1895
            chunkId: chunkId                                                                                           // 1896
          }                                                                                                            // 1894
        }]);                                                                                                           // 1893
      } else {                                                                                                         // 1892
        if (FileReader) {                                                                                              // 1900
          fileReader = new FileReader();                                                                               // 1901
                                                                                                                       //
          fileReader.onloadend = function (evt) {                                                                      // 1903
            var ref, ref1;                                                                                             // 1904
            self.emitEvent('sendChunk', [{                                                                             // 1904
              data: {                                                                                                  // 1905
                bin: ((fileReader != null ? fileReader.result : void 0) || ((ref = evt.srcElement) != null ? ref.result : void 0) || ((ref1 = evt.target) != null ? ref1.result : void 0)).split(',')[1],
                chunkId: chunkId                                                                                       // 1907
              }                                                                                                        // 1905
            }]);                                                                                                       // 1904
          };                                                                                                           // 1903
                                                                                                                       //
          fileReader.onerror = function (e) {                                                                          // 1912
            self.emitEvent('end', [(e.target || e.srcElement).error]);                                                 // 1913
          };                                                                                                           // 1912
                                                                                                                       //
          fileReader.readAsDataURL(chunk);                                                                             // 1916
        } else if (FileReaderSync) {                                                                                   // 1900
          fileReader = new FileReaderSync();                                                                           // 1919
          self.emitEvent('sendChunk', [{                                                                               // 1921
            data: {                                                                                                    // 1922
              bin: fileReader.readAsDataURL(chunk).split(',')[1],                                                      // 1923
              chunkId: chunkId                                                                                         // 1924
            }                                                                                                          // 1922
          }]);                                                                                                         // 1921
        } else {                                                                                                       // 1918
          self.emitEvent('end', ['File API is not supported in this Browser!']);                                       // 1928
        }                                                                                                              // 1892
      }                                                                                                                // 2620
    };                                                                                                                 // 1888
                                                                                                                       //
    UploadInstance.prototype.upload = function () {                                                                    // 2623
      if (this.result.onPause.get()) {                                                                                 // 1932
        return;                                                                                                        // 1933
      }                                                                                                                // 2626
                                                                                                                       //
      if (this.result.state.get() === 'aborted') {                                                                     // 1935
        return this;                                                                                                   // 1936
      }                                                                                                                // 2629
                                                                                                                       //
      if (this.currentChunk <= this.fileLength) {                                                                      // 1938
        ++this.currentChunk;                                                                                           // 1939
                                                                                                                       //
        if (this.worker) {                                                                                             // 1940
          this.worker.postMessage({                                                                                    // 1941
            sc: this.sentChunks,                                                                                       // 1941
            cc: this.currentChunk,                                                                                     // 1941
            cs: this.config.chunkSize,                                                                                 // 1941
            f: this.config.file,                                                                                       // 1941
            ib: this.config.isBase64                                                                                   // 1941
          });                                                                                                          // 1941
        } else {                                                                                                       // 1940
          this.emitEvent('proceedChunk', [this.currentChunk]);                                                         // 1943
        }                                                                                                              // 1938
      }                                                                                                                // 2643
                                                                                                                       //
      this.startTime[this.currentChunk] = +new Date();                                                                 // 1944
    };                                                                                                                 // 1931
                                                                                                                       //
    UploadInstance.prototype.createStreams = function () {                                                             // 2647
      var i, self;                                                                                                     // 1948
      i = 1;                                                                                                           // 1948
      self = this;                                                                                                     // 1949
                                                                                                                       //
      while (i <= this.config.streams) {                                                                               // 1950
        self.emitEvent('upload');                                                                                      // 1951
        i++;                                                                                                           // 1952
      }                                                                                                                // 1950
    };                                                                                                                 // 1947
                                                                                                                       //
    UploadInstance.prototype.prepare = function () {                                                                   // 2657
      var _len, handleStart, opts, ref, ref1, self;                                                                    // 1956
                                                                                                                       //
      self = this;                                                                                                     // 1956
      this.config.onStart && this.config.onStart.call(this.result, null, this.fileData);                               // 1958
      this.result.emitEvent('start', [null, this.fileData]);                                                           // 1959
                                                                                                                       //
      if (this.config.chunkSize === 'dynamic') {                                                                       // 1961
        this.config.chunkSize = this.fileData.size / 1000;                                                             // 1962
                                                                                                                       //
        if (this.config.chunkSize < 327680) {                                                                          // 1963
          this.config.chunkSize = 327680;                                                                              // 1964
        } else if (this.config.chunkSize > 1048576) {                                                                  // 1963
          this.config.chunkSize = 1048576;                                                                             // 1966
        }                                                                                                              // 2668
                                                                                                                       //
        if (this.config.transport === 'http') {                                                                        // 1968
          this.config.chunkSize = Math.round(this.config.chunkSize / 2);                                               // 1969
        }                                                                                                              // 1961
      }                                                                                                                // 2672
                                                                                                                       //
      if (this.config.isBase64) {                                                                                      // 1971
        this.config.chunkSize = Math.floor(this.config.chunkSize / 4) * 4;                                             // 1972
        _len = Math.ceil(this.config.file.length / this.config.chunkSize);                                             // 1973
      } else {                                                                                                         // 1971
        this.config.chunkSize = Math.floor(this.config.chunkSize / 8) * 8;                                             // 1975
        _len = Math.ceil(this.fileData.size / this.config.chunkSize);                                                  // 1976
      }                                                                                                                // 2679
                                                                                                                       //
      if (this.config.streams === 'dynamic') {                                                                         // 1978
        this.config.streams = _.clone(_len);                                                                           // 1979
                                                                                                                       //
        if (this.config.streams > 24) {                                                                                // 1980
          this.config.streams = 24;                                                                                    // 1980
        }                                                                                                              // 2684
                                                                                                                       //
        if (this.config.transport === 'http') {                                                                        // 1982
          this.config.streams = Math.round(this.config.streams / 2);                                                   // 1983
        }                                                                                                              // 1978
      }                                                                                                                // 2688
                                                                                                                       //
      this.fileLength = _len <= 0 ? 1 : _len;                                                                          // 1985
                                                                                                                       //
      if (this.config.streams > this.fileLength) {                                                                     // 1986
        this.config.streams = this.fileLength;                                                                         // 1986
      }                                                                                                                // 2692
                                                                                                                       //
      this.result.config.fileLength = this.fileLength;                                                                 // 1987
      opts = {                                                                                                         // 1989
        file: this.fileData,                                                                                           // 1990
        fileId: this.fileId,                                                                                           // 1991
        chunkSize: this.config.isBase64 ? this.config.chunkSize / 4 * 3 : this.config.chunkSize,                       // 1992
        fileLength: this.fileLength                                                                                    // 1993
      };                                                                                                               // 1990
                                                                                                                       //
      if (this.FSName !== this.fileId) {                                                                               // 1994
        opts.FSName = this.FSName;                                                                                     // 1994
      }                                                                                                                // 2702
                                                                                                                       //
      handleStart = function (error) {                                                                                 // 1996
        if (error) {                                                                                                   // 1997
          if (self.collection.debug) {                                                                                 // 1998
            console.error('[FilesCollection] [_Start] Error:', error);                                                 // 1998
          }                                                                                                            // 2707
                                                                                                                       //
          self.emitEvent('end', [error]);                                                                              // 1999
        } else {                                                                                                       // 1997
          self.result.continueFunc = function () {                                                                     // 2001
            if (self.collection.debug) {                                                                               // 2002
              console.info('[FilesCollection] [insert] [continueFunc]');                                               // 2002
            }                                                                                                          // 2713
                                                                                                                       //
            self.emitEvent('createStreams');                                                                           // 2003
          };                                                                                                           // 2001
                                                                                                                       //
          self.emitEvent('createStreams');                                                                             // 2005
        }                                                                                                              // 2717
      };                                                                                                               // 1996
                                                                                                                       //
      if (this.config.transport === 'ddp') {                                                                           // 2008
        this.config.ddp.call(this.collection._methodNames._Start, opts, handleStart);                                  // 2009
      } else {                                                                                                         // 2008
        if ((ref = opts.file) != null ? ref.meta : void 0) {                                                           // 2011
          opts.file.meta = fixJSONStringify(opts.file.meta);                                                           // 2011
        }                                                                                                              // 2724
                                                                                                                       //
        HTTP.call('POST', this.collection.downloadRoute + "/" + this.collection.collectionName + "/__upload", {        // 2012
          data: opts,                                                                                                  // 2013
          headers: {                                                                                                   // 2014
            'x-start': '1',                                                                                            // 2015
            'x-mtok': ((ref1 = Meteor.connection) != null ? ref1._lastSessionId : void 0) || null                      // 2016
          }                                                                                                            // 2015
        }, handleStart);                                                                                               // 2012
      }                                                                                                                // 2732
    };                                                                                                                 // 1955
                                                                                                                       //
    UploadInstance.prototype.pipe = function (func) {                                                                  // 2735
      this.pipes.push(func);                                                                                           // 2021
      return this;                                                                                                     // 2022
    };                                                                                                                 // 2020
                                                                                                                       //
    UploadInstance.prototype.start = function () {                                                                     // 2740
      var isUploadAllowed, self;                                                                                       // 2025
      self = this;                                                                                                     // 2025
                                                                                                                       //
      if (this.fileData.size <= 0) {                                                                                   // 2026
        this.end(new Meteor.Error(400, 'Can\'t upload empty file'));                                                   // 2027
        return this.result;                                                                                            // 2028
      }                                                                                                                // 2746
                                                                                                                       //
      if (this.config.onBeforeUpload && _.isFunction(this.config.onBeforeUpload)) {                                    // 2030
        isUploadAllowed = this.config.onBeforeUpload.call(_.extend(this.result, this.collection._getUser()), this.fileData);
                                                                                                                       //
        if (isUploadAllowed !== true) {                                                                                // 2032
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'config.onBeforeUpload() returned false'));
        }                                                                                                              // 2030
      }                                                                                                                // 2752
                                                                                                                       //
      if (this.collection.onBeforeUpload && _.isFunction(this.collection.onBeforeUpload)) {                            // 2035
        isUploadAllowed = this.collection.onBeforeUpload.call(_.extend(this.result, this.collection._getUser()), this.fileData);
                                                                                                                       //
        if (isUploadAllowed !== true) {                                                                                // 2037
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'collection.onBeforeUpload() returned false'));
        }                                                                                                              // 2035
      }                                                                                                                // 2758
                                                                                                                       //
      Tracker.autorun(function (computation) {                                                                         // 2040
        self.trackerComp = computation;                                                                                // 2041
                                                                                                                       //
        if (!self.result.onPause.get()) {                                                                              // 2042
          if (Meteor.status().connected) {                                                                             // 2043
            if (self.collection.debug) {                                                                               // 2044
              console.info('[FilesCollection] [insert] [Tracker] [continue]');                                         // 2044
            }                                                                                                          // 2765
                                                                                                                       //
            self.result["continue"]();                                                                                 // 2045
          } else {                                                                                                     // 2043
            if (self.collection.debug) {                                                                               // 2047
              console.info('[FilesCollection] [insert] [Tracker] [pause]');                                            // 2047
            }                                                                                                          // 2770
                                                                                                                       //
            self.result.pause();                                                                                       // 2048
          }                                                                                                            // 2042
        }                                                                                                              // 2773
      });                                                                                                              // 2040
                                                                                                                       //
      if (this.worker) {                                                                                               // 2051
        this.worker.onmessage = function (evt) {                                                                       // 2052
          if (evt.data.error) {                                                                                        // 2053
            if (self.collection.debug) {                                                                               // 2054
              console.warn('[FilesCollection] [insert] [worker] [onmessage] [ERROR:]', evt.data.error);                // 2054
            }                                                                                                          // 2780
                                                                                                                       //
            self.emitEvent('proceedChunk', [evt.data.chunkId]);                                                        // 2055
          } else {                                                                                                     // 2053
            self.emitEvent('sendChunk', [evt]);                                                                        // 2057
          }                                                                                                            // 2784
        };                                                                                                             // 2052
                                                                                                                       //
        this.worker.onerror = function (e) {                                                                           // 2059
          if (self.collection.debug) {                                                                                 // 2060
            console.error('[FilesCollection] [insert] [worker] [onerror] [ERROR:]', e);                                // 2060
          }                                                                                                            // 2789
                                                                                                                       //
          self.emitEvent('end', [e.message]);                                                                          // 2061
        };                                                                                                             // 2059
      }                                                                                                                // 2792
                                                                                                                       //
      if (this.collection.debug) {                                                                                     // 2064
        if (this.worker) {                                                                                             // 2065
          console.info('[FilesCollection] [insert] using WebWorkers');                                                 // 2066
        } else {                                                                                                       // 2065
          console.info('[FilesCollection] [insert] using MainThread');                                                 // 2068
        }                                                                                                              // 2064
      }                                                                                                                // 2799
                                                                                                                       //
      self.emitEvent('prepare');                                                                                       // 2070
      return this.result;                                                                                              // 2071
    };                                                                                                                 // 2024
                                                                                                                       //
    UploadInstance.prototype.manual = function () {                                                                    // 2804
      var self;                                                                                                        // 2074
      self = this;                                                                                                     // 2074
                                                                                                                       //
      this.result.start = function () {                                                                                // 2075
        self.emitEvent('start');                                                                                       // 2076
      };                                                                                                               // 2075
                                                                                                                       //
      this.result.pipe = function (func) {                                                                             // 2078
        self.pipe(func);                                                                                               // 2079
        return this;                                                                                                   // 2080
      };                                                                                                               // 2078
                                                                                                                       //
      return this.result;                                                                                              // 2081
    };                                                                                                                 // 2073
                                                                                                                       //
    return UploadInstance;                                                                                             // 2817
  }() : void 0; /*                                                                                                     // 2819
                @locus Client                                                                                          //
                @memberOf FilesCollection                                                                              //
                @name _FileUpload                                                                                      //
                @class FileUpload                                                                                      //
                @summary Internal Class, instance of this class is returned from `insert()` method                     //
                 */                                                                                                    //
  FilesCollection.prototype._FileUpload = Meteor.isClient ? FileUpload = function () {                                 // 2830
    FileUpload.prototype.__proto__ = EventEmitter.prototype;                                                           // 2831
                                                                                                                       //
    function FileUpload(config1) {                                                                                     // 2093
      var self;                                                                                                        // 2094
      this.config = config1;                                                                                           // 2093
      EventEmitter.call(this);                                                                                         // 2094
      self = this;                                                                                                     // 2095
                                                                                                                       //
      if (!this.config.isBase64) {                                                                                     // 2096
        this.file = _.extend(this.config.file, this.config.fileData);                                                  // 2097
      } else {                                                                                                         // 2096
        this.file = this.config.fileData;                                                                              // 2099
      }                                                                                                                // 2842
                                                                                                                       //
      this.state = new ReactiveVar('active');                                                                          // 2100
      this.onPause = new ReactiveVar(false);                                                                           // 2101
      this.progress = new ReactiveVar(0);                                                                              // 2102
      this.estimateTime = new ReactiveVar(1000);                                                                       // 2103
      this.estimateSpeed = new ReactiveVar(0);                                                                         // 2104
      this.estimateTimer = Meteor.setInterval(function () {                                                            // 2105
        var _currentTime;                                                                                              // 2106
                                                                                                                       //
        if (self.state.get() === 'active') {                                                                           // 2106
          _currentTime = self.estimateTime.get();                                                                      // 2107
                                                                                                                       //
          if (_currentTime > 1000) {                                                                                   // 2108
            self.estimateTime.set(_currentTime - 1000);                                                                // 2109
          }                                                                                                            // 2106
        }                                                                                                              // 2855
      }, 1000);                                                                                                        // 2105
    }                                                                                                                  // 2093
                                                                                                                       //
    FileUpload.prototype.continueFunc = function () {};                                                                // 2859
                                                                                                                       //
    FileUpload.prototype.pause = function () {                                                                         // 2861
      if (this.config.debug) {                                                                                         // 2114
        console.info('[FilesCollection] [insert] [.pause()]');                                                         // 2114
      }                                                                                                                // 2864
                                                                                                                       //
      if (!this.onPause.get()) {                                                                                       // 2115
        this.onPause.set(true);                                                                                        // 2116
        this.state.set('paused');                                                                                      // 2117
        this.emitEvent('pause', [this.file]);                                                                          // 2118
      }                                                                                                                // 2869
    };                                                                                                                 // 2113
                                                                                                                       //
    FileUpload.prototype["continue"] = function () {                                                                   // 2872
      if (this.config.debug) {                                                                                         // 2121
        console.info('[FilesCollection] [insert] [.continue()]');                                                      // 2121
      }                                                                                                                // 2875
                                                                                                                       //
      if (this.onPause.get()) {                                                                                        // 2122
        this.onPause.set(false);                                                                                       // 2123
        this.state.set('active');                                                                                      // 2124
        this.emitEvent('continue', [this.file]);                                                                       // 2125
        this.continueFunc();                                                                                           // 2126
      }                                                                                                                // 2881
    };                                                                                                                 // 2120
                                                                                                                       //
    FileUpload.prototype.toggle = function () {                                                                        // 2884
      if (this.config.debug) {                                                                                         // 2129
        console.info('[FilesCollection] [insert] [.toggle()]');                                                        // 2129
      }                                                                                                                // 2887
                                                                                                                       //
      if (this.onPause.get()) {                                                                                        // 2130
        this["continue"]();                                                                                            // 2130
      } else {                                                                                                         // 2130
        this.pause();                                                                                                  // 2130
      }                                                                                                                // 2892
    };                                                                                                                 // 2128
                                                                                                                       //
    FileUpload.prototype.abort = function () {                                                                         // 2895
      if (this.config.debug) {                                                                                         // 2133
        console.info('[FilesCollection] [insert] [.abort()]');                                                         // 2133
      }                                                                                                                // 2898
                                                                                                                       //
      window.removeEventListener('beforeunload', this.config.beforeunload, false);                                     // 2134
      this.config.onAbort && this.config.onAbort.call(this, this.file);                                                // 2135
      this.emitEvent('abort', [this.file]);                                                                            // 2136
      this.pause();                                                                                                    // 2137
                                                                                                                       //
      this.config._onEnd();                                                                                            // 2138
                                                                                                                       //
      this.state.set('aborted');                                                                                       // 2139
                                                                                                                       //
      if (this.config.debug) {                                                                                         // 2140
        console.timeEnd('insert ' + this.config.fileData.name);                                                        // 2140
      }                                                                                                                // 2907
                                                                                                                       //
      this.config.ddp.call(this.config._Abort, this.config.fileId);                                                    // 2141
    };                                                                                                                 // 2132
                                                                                                                       //
    return FileUpload;                                                                                                 // 2911
  }() : void 0; /*                                                                                                     // 2913
                @locus Anywhere                                                                                        //
                @memberOf FilesCollection                                                                              //
                @name remove                                                                                           //
                @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)
                @param {Function} callback - Callback with one `error` argument                                        //
                @summary Remove documents from the collection                                                          //
                @returns {FilesCollection} Instance                                                                    //
                 */                                                                                                    //
                                                                                                                       //
  FilesCollection.prototype.remove = function (selector, callback) {                                                   // 2926
    var docs, files, self;                                                                                             // 2155
                                                                                                                       //
    if (selector == null) {                                                                                            // 2928
      selector = {};                                                                                                   // 2154
    }                                                                                                                  // 2930
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2155
      console.info("[FilesCollection] [remove(" + JSON.stringify(selector) + ")]");                                    // 2155
    }                                                                                                                  // 2933
                                                                                                                       //
    check(selector, Match.OneOf(Object, String));                                                                      // 2156
    check(callback, Match.Optional(Function));                                                                         // 2157
                                                                                                                       //
    if (Meteor.isClient) {                                                                                             // 2159
      if (this.allowClientCode) {                                                                                      // 2160
        this.ddp.call(this._methodNames._Remove, selector, callback || NOOP);                                          // 2161
      } else {                                                                                                         // 2160
        callback && callback(new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!'));
                                                                                                                       //
        if (this.debug) {                                                                                              // 2164
          console.warn('[FilesCollection] [remove] Run code from client is not allowed!');                             // 2164
        }                                                                                                              // 2160
      }                                                                                                                // 2159
    } else {                                                                                                           // 2159
      files = this.collection.find(selector);                                                                          // 2166
                                                                                                                       //
      if (files.count() > 0) {                                                                                         // 2167
        self = this;                                                                                                   // 2168
        files.forEach(function (file) {                                                                                // 2169
          self.unlink(file);                                                                                           // 2170
        });                                                                                                            // 2169
      } else {                                                                                                         // 2167
        callback && callback(new Meteor.Error(404, 'Cursor is empty, no files is removed'));                           // 2173
        return this;                                                                                                   // 2174
      }                                                                                                                // 2955
                                                                                                                       //
      if (this.onAfterRemove) {                                                                                        // 2176
        self = this;                                                                                                   // 2177
        docs = files.fetch();                                                                                          // 2178
        this.collection.remove(selector, function () {                                                                 // 2180
          callback && callback.apply(this, arguments);                                                                 // 2181
          self.onAfterRemove(docs);                                                                                    // 2182
        });                                                                                                            // 2180
      } else {                                                                                                         // 2176
        this.collection.remove(selector, callback || NOOP);                                                            // 2185
      }                                                                                                                // 2159
    }                                                                                                                  // 2966
                                                                                                                       //
    return this;                                                                                                       // 2186
  }; /*                                                                                                                // 2154
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name update                                                                                                      //
     @see http://docs.meteor.com/#/full/update                                                                         //
     @summary link Mongo.Collection update method                                                                      //
     @returns {Mongo.Collection} Instance                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.update = function () {                                                                     // 2980
    this.collection.update.apply(this.collection, arguments);                                                          // 2197
    return this.collection;                                                                                            // 2198
  }; /*                                                                                                                // 2196
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name deny                                                                                                        //
     @param {Object} rules                                                                                             //
     @see  https://docs.meteor.com/api/collections.html#Mongo-Collection-deny                                          //
     @summary link Mongo.Collection deny methods                                                                       //
     @returns {Mongo.Collection} Instance                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.deny = Meteor.isServer ? function (rules) {                                                // 2996
    this.collection.deny(rules);                                                                                       // 2210
    return this.collection;                                                                                            // 2211
  } : void 0; /*                                                                                                       // 2209
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name allow                                                                                              //
              @param {Object} rules                                                                                    //
              @see https://docs.meteor.com/api/collections.html#Mongo-Collection-allow                                 //
              @summary link Mongo.Collection allow methods                                                             //
              @returns {Mongo.Collection} Instance                                                                     //
               */                                                                                                      //
  FilesCollection.prototype.allow = Meteor.isServer ? function (rules) {                                               // 3012
    this.collection.allow(rules);                                                                                      // 2224
    return this.collection;                                                                                            // 2225
  } : void 0; /*                                                                                                       // 2223
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name denyClient                                                                                         //
              @see https://docs.meteor.com/api/collections.html#Mongo-Collection-deny                                  //
              @summary Shorthands for Mongo.Collection deny method                                                     //
              @returns {Mongo.Collection} Instance                                                                     //
               */                                                                                                      //
  FilesCollection.prototype.denyClient = Meteor.isServer ? function () {                                               // 3027
    this.collection.deny({                                                                                             // 2237
      insert: function () {                                                                                            // 2238
        return true;                                                                                                   // 3030
      },                                                                                                               // 2238
      update: function () {                                                                                            // 2239
        return true;                                                                                                   // 3033
      },                                                                                                               // 2238
      remove: function () {                                                                                            // 2240
        return true;                                                                                                   // 3036
      }                                                                                                                // 2238
    });                                                                                                                // 2238
    return this.collection;                                                                                            // 2241
  } : void 0; /*                                                                                                       // 2236
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name allowClient                                                                                        //
              @see https://docs.meteor.com/api/collections.html#Mongo-Collection-allow                                 //
              @summary Shorthands for Mongo.Collection allow method                                                    //
              @returns {Mongo.Collection} Instance                                                                     //
               */                                                                                                      //
  FilesCollection.prototype.allowClient = Meteor.isServer ? function () {                                              // 3052
    this.collection.allow({                                                                                            // 2253
      insert: function () {                                                                                            // 2254
        return true;                                                                                                   // 3055
      },                                                                                                               // 2254
      update: function () {                                                                                            // 2255
        return true;                                                                                                   // 3058
      },                                                                                                               // 2254
      remove: function () {                                                                                            // 2256
        return true;                                                                                                   // 3061
      }                                                                                                                // 2254
    });                                                                                                                // 2254
    return this.collection;                                                                                            // 2257
  } : void 0; /*                                                                                                       // 2252
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name unlink                                                                                             //
              @param {Object} fileRef - fileObj                                                                        //
              @param {String} version - [Optional] file's version                                                      //
              @param {Function} callback - [Optional] callback function                                                //
              @summary Unlink files and it's versions from FS                                                          //
              @returns {FilesCollection} Instance                                                                      //
               */                                                                                                      //
  FilesCollection.prototype.unlink = Meteor.isServer ? function (fileRef, version, callback) {                         // 3079
    var ref, ref1;                                                                                                     // 2272
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2272
      console.info("[FilesCollection] [unlink(" + fileRef._id + ", " + version + ")]");                                // 2272
    }                                                                                                                  // 3083
                                                                                                                       //
    if (version) {                                                                                                     // 2273
      if (((ref = fileRef.versions) != null ? ref[version] : void 0) && ((ref1 = fileRef.versions[version]) != null ? ref1.path : void 0)) {
        fs.unlink(fileRef.versions[version].path, callback || NOOP);                                                   // 2275
      }                                                                                                                // 2273
    } else {                                                                                                           // 2273
      if (fileRef.versions && !_.isEmpty(fileRef.versions)) {                                                          // 2277
        _.each(fileRef.versions, function (vRef) {                                                                     // 2278
          return bound(function () {                                                                                   // 3091
            fs.unlink(vRef.path, callback || NOOP);                                                                    // 2279
          });                                                                                                          // 2278
        });                                                                                                            // 2278
      } else {                                                                                                         // 2277
        fs.unlink(fileRef.path, callback || NOOP);                                                                     // 2282
      }                                                                                                                // 2273
    }                                                                                                                  // 3098
                                                                                                                       //
    return this;                                                                                                       // 2283
  } : void 0; /*                                                                                                       // 2271
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name _404                                                                                               //
              @summary Internal method, used to return 404 error                                                       //
              @returns {undefined}                                                                                     //
               */                                                                                                      //
  FilesCollection.prototype._404 = Meteor.isServer ? function (http) {                                                 // 3111
    var text;                                                                                                          // 2294
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2294
      console.warn("[FilesCollection] [download(" + http.request.originalUrl + ")] [_404] File not found");            // 2294
    }                                                                                                                  // 3115
                                                                                                                       //
    text = 'File Not Found :(';                                                                                        // 2295
                                                                                                                       //
    if (!http.response.headersSent) {                                                                                  // 2297
      http.response.writeHead(404, {                                                                                   // 2298
        'Content-Length': text.length,                                                                                 // 2299
        'Content-Type': 'text/plain'                                                                                   // 2300
      });                                                                                                              // 2299
    }                                                                                                                  // 3122
                                                                                                                       //
    if (!http.response.finished) {                                                                                     // 2301
      http.response.end(text);                                                                                         // 2302
    }                                                                                                                  // 3125
  } : void 0; /*                                                                                                       // 2293
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name download                                                                                           //
              @param {Object} http    - Server HTTP object                                                             //
              @param {String} version - Requested file version                                                         //
              @param {Object} fileRef - Requested file Object                                                          //
              @summary Initiates the HTTP response                                                                     //
              @returns {undefined}                                                                                     //
               */                                                                                                      //
  FilesCollection.prototype.download = Meteor.isServer ? function (http, version, fileRef) {                           // 3140
    var self, vRef;                                                                                                    // 2317
                                                                                                                       //
    if (version == null) {                                                                                             // 3142
      version = 'original';                                                                                            // 2316
    }                                                                                                                  // 3144
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2317
      console.info("[FilesCollection] [download(" + http.request.originalUrl + ", " + version + ")]");                 // 2317
    }                                                                                                                  // 3147
                                                                                                                       //
    if (fileRef) {                                                                                                     // 2318
      if (_.has(fileRef, 'versions') && _.has(fileRef.versions, version)) {                                            // 2319
        vRef = fileRef.versions[version];                                                                              // 2320
        vRef._id = fileRef._id;                                                                                        // 2321
      } else {                                                                                                         // 2319
        vRef = fileRef;                                                                                                // 2323
      }                                                                                                                // 2318
    } else {                                                                                                           // 2318
      vRef = false;                                                                                                    // 2325
    }                                                                                                                  // 3157
                                                                                                                       //
    if (!vRef || !_.isObject(vRef)) {                                                                                  // 2327
      return this._404(http);                                                                                          // 2328
    } else if (fileRef) {                                                                                              // 2327
      self = this;                                                                                                     // 2330
                                                                                                                       //
      if (this.downloadCallback) {                                                                                     // 2332
        if (!this.downloadCallback.call(_.extend(http, this._getUser(http)), fileRef)) {                               // 2333
          return this._404(http);                                                                                      // 2334
        }                                                                                                              // 2332
      }                                                                                                                // 3166
                                                                                                                       //
      if (this.interceptDownload && _.isFunction(this.interceptDownload)) {                                            // 2336
        if (this.interceptDownload(http, fileRef, version) === true) {                                                 // 2337
          return;                                                                                                      // 2338
        }                                                                                                              // 2336
      }                                                                                                                // 3171
                                                                                                                       //
      fs.stat(vRef.path, function (statErr, stats) {                                                                   // 2340
        return bound(function () {                                                                                     // 3173
          var responseType;                                                                                            // 2341
                                                                                                                       //
          if (statErr || !stats.isFile()) {                                                                            // 2341
            return self._404(http);                                                                                    // 2342
          }                                                                                                            // 3177
                                                                                                                       //
          if (stats.size !== vRef.size && !self.integrityCheck) {                                                      // 2344
            vRef.size = stats.size;                                                                                    // 2344
          }                                                                                                            // 3180
                                                                                                                       //
          if (stats.size !== vRef.size && self.integrityCheck) {                                                       // 2345
            responseType = '400';                                                                                      // 2345
          }                                                                                                            // 3183
                                                                                                                       //
          return self.serve(http, fileRef, vRef, version, null, responseType || '200');                                // 3184
        });                                                                                                            // 2340
      });                                                                                                              // 2340
    } else {                                                                                                           // 2329
      return this._404(http);                                                                                          // 2349
    }                                                                                                                  // 3189
  } : void 0; /*                                                                                                       // 2316
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name serve                                                                                              //
              @param {Object} http    - Server HTTP object                                                             //
              @param {Object} fileRef - Requested file Object                                                          //
              @param {Object} vRef    - Requested file version Object                                                  //
              @param {String} version - Requested file version                                                         //
              @param {stream.Readable|null} readableStream - Readable stream, which serves binary file data            //
              @param {String} responseType - Response code                                                             //
              @param {Boolean} force200 - Force 200 response code over 206                                             //
              @summary Handle and reply to incoming request                                                            //
              @returns {undefined}                                                                                     //
               */                                                                                                      //
  FilesCollection.prototype.serve = Meteor.isServer ? function (http, fileRef, vRef, version, readableStream, responseType, force200) {
    var array, dispositionEncoding, dispositionName, dispositionType, end, headers, key, partiral, reqRange, self, start, stream, streamErrorHandler, take, text, value;
                                                                                                                       //
    if (version == null) {                                                                                             // 3210
      version = 'original';                                                                                            // 2366
    }                                                                                                                  // 3212
                                                                                                                       //
    if (readableStream == null) {                                                                                      // 3213
      readableStream = null;                                                                                           // 2366
    }                                                                                                                  // 3215
                                                                                                                       //
    if (responseType == null) {                                                                                        // 3216
      responseType = '200';                                                                                            // 2366
    }                                                                                                                  // 3218
                                                                                                                       //
    if (force200 == null) {                                                                                            // 3219
      force200 = false;                                                                                                // 2366
    }                                                                                                                  // 3221
                                                                                                                       //
    self = this;                                                                                                       // 2367
    partiral = false;                                                                                                  // 2368
    reqRange = false;                                                                                                  // 2369
                                                                                                                       //
    if (http.params.query.download && http.params.query.download === 'true') {                                         // 2371
      dispositionType = 'attachment; ';                                                                                // 2372
    } else {                                                                                                           // 2371
      dispositionType = 'inline; ';                                                                                    // 2374
    }                                                                                                                  // 3229
                                                                                                                       //
    dispositionName = "filename=\"" + encodeURI(fileRef.name) + "\"; filename*=UTF-8''" + encodeURI(fileRef.name) + "; ";
    dispositionEncoding = 'charset=UTF-8';                                                                             // 2377
                                                                                                                       //
    if (!http.response.headersSent) {                                                                                  // 2379
      http.response.setHeader('Content-Disposition', dispositionType + dispositionName + dispositionEncoding);         // 2380
    }                                                                                                                  // 3234
                                                                                                                       //
    if (http.request.headers.range && !force200) {                                                                     // 2382
      partiral = true;                                                                                                 // 2383
      array = http.request.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);                                             // 2384
      start = parseInt(array[1]);                                                                                      // 2385
      end = parseInt(array[2]);                                                                                        // 2386
                                                                                                                       //
      if (isNaN(end)) {                                                                                                // 2387
        end = vRef.size - 1;                                                                                           // 2387
      }                                                                                                                // 3242
                                                                                                                       //
      take = end - start;                                                                                              // 2388
    } else {                                                                                                           // 2382
      start = 0;                                                                                                       // 2390
      end = vRef.size - 1;                                                                                             // 2391
      take = vRef.size;                                                                                                // 2392
    }                                                                                                                  // 3248
                                                                                                                       //
    if (partiral || http.params.query.play && http.params.query.play === 'true') {                                     // 2394
      reqRange = {                                                                                                     // 2395
        start: start,                                                                                                  // 2395
        end: end                                                                                                       // 2395
      };                                                                                                               // 2395
                                                                                                                       //
      if (isNaN(start) && !isNaN(end)) {                                                                               // 2396
        reqRange.start = end - take;                                                                                   // 2397
        reqRange.end = end;                                                                                            // 2398
      }                                                                                                                // 3257
                                                                                                                       //
      if (!isNaN(start) && isNaN(end)) {                                                                               // 2399
        reqRange.start = start;                                                                                        // 2400
        reqRange.end = start + take;                                                                                   // 2401
      }                                                                                                                // 3261
                                                                                                                       //
      if (start + take >= vRef.size) {                                                                                 // 2403
        reqRange.end = vRef.size - 1;                                                                                  // 2403
      }                                                                                                                // 3264
                                                                                                                       //
      if (self.strict && (reqRange.start >= vRef.size - 1 || reqRange.end > vRef.size - 1)) {                          // 2405
        responseType = '416';                                                                                          // 2406
      } else {                                                                                                         // 2405
        responseType = '206';                                                                                          // 2408
      }                                                                                                                // 2394
    } else {                                                                                                           // 2394
      responseType = '200';                                                                                            // 2410
    }                                                                                                                  // 3272
                                                                                                                       //
    streamErrorHandler = function (error) {                                                                            // 2412
      if (self.debug) {                                                                                                // 2413
        console.error("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [500]", error);                   // 2413
      }                                                                                                                // 3276
                                                                                                                       //
      if (!http.response.finished) {                                                                                   // 2414
        http.response.end(error.toString());                                                                           // 2415
      }                                                                                                                // 3279
    };                                                                                                                 // 2412
                                                                                                                       //
    headers = _.isFunction(self.responseHeaders) ? self.responseHeaders(responseType, fileRef, vRef, version) : self.responseHeaders;
                                                                                                                       //
    if (!headers['Cache-Control']) {                                                                                   // 2420
      if (!http.response.headersSent) {                                                                                // 2421
        http.response.setHeader('Cache-Control', self.cacheControl);                                                   // 2422
      }                                                                                                                // 2420
    }                                                                                                                  // 3286
                                                                                                                       //
    for (key in meteorBabelHelpers.sanitizeForInObject(headers)) {                                                     // 2424
      value = headers[key];                                                                                            // 3288
                                                                                                                       //
      if (!http.response.headersSent) {                                                                                // 2425
        http.response.setHeader(key, value);                                                                           // 2426
      }                                                                                                                // 3291
    }                                                                                                                  // 2424
                                                                                                                       //
    switch (responseType) {                                                                                            // 2428
      case '400':                                                                                                      // 2428
        if (self.debug) {                                                                                              // 2430
          console.warn("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [400] Content-Length mismatch!");
        }                                                                                                              // 3297
                                                                                                                       //
        text = 'Content-Length mismatch!';                                                                             // 2431
                                                                                                                       //
        if (!http.response.headersSent) {                                                                              // 2433
          http.response.writeHead(400, {                                                                               // 2434
            'Content-Type': 'text/plain',                                                                              // 2435
            'Content-Length': text.length                                                                              // 2436
          });                                                                                                          // 2435
        }                                                                                                              // 3304
                                                                                                                       //
        if (!http.response.finished) {                                                                                 // 2437
          http.response.end(text);                                                                                     // 2438
        }                                                                                                              // 3307
                                                                                                                       //
        break;                                                                                                         // 2439
                                                                                                                       //
      case '404':                                                                                                      // 2428
        return self._404(http);                                                                                        // 2441
        break;                                                                                                         // 2442
                                                                                                                       //
      case '416':                                                                                                      // 2428
        if (self.debug) {                                                                                              // 2444
          console.warn("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [416] Content-Range is not specified!");
        }                                                                                                              // 3315
                                                                                                                       //
        if (!http.response.headersSent) {                                                                              // 2445
          http.response.writeHead(416);                                                                                // 2446
        }                                                                                                              // 3318
                                                                                                                       //
        if (!http.response.finished) {                                                                                 // 2447
          http.response.end();                                                                                         // 2448
        }                                                                                                              // 3321
                                                                                                                       //
        break;                                                                                                         // 2449
                                                                                                                       //
      case '200':                                                                                                      // 2428
        if (self.debug) {                                                                                              // 2451
          console.info("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [200]");                         // 2451
        }                                                                                                              // 3326
                                                                                                                       //
        stream = readableStream || fs.createReadStream(vRef.path);                                                     // 2452
                                                                                                                       //
        if (!http.response.headersSent) {                                                                              // 2453
          if (readableStream) {                                                                                        // 2454
            http.response.writeHead(200);                                                                              // 2454
          }                                                                                                            // 2453
        }                                                                                                              // 3332
                                                                                                                       //
        http.response.on('close', function () {                                                                        // 2456
          if (typeof stream.abort === "function") {                                                                    // 3334
            stream.abort();                                                                                            // 2457
          }                                                                                                            // 3336
                                                                                                                       //
          if (typeof stream.end === "function") {                                                                      // 3337
            stream.end();                                                                                              // 2458
          }                                                                                                            // 3339
        });                                                                                                            // 2456
        http.request.on('abort', function () {                                                                         // 2461
          if (typeof stream.abort === "function") {                                                                    // 3342
            stream.abort();                                                                                            // 2462
          }                                                                                                            // 3344
                                                                                                                       //
          if (typeof stream.end === "function") {                                                                      // 3345
            stream.end();                                                                                              // 2463
          }                                                                                                            // 3347
        });                                                                                                            // 2461
        stream.on('open', function () {                                                                                // 2466
          if (!http.response.headersSent) {                                                                            // 2467
            http.response.writeHead(200);                                                                              // 2468
          }                                                                                                            // 3352
        }).on('abort', function () {                                                                                   // 2466
          if (!http.response.finished) {                                                                               // 2471
            http.response.end();                                                                                       // 2472
          }                                                                                                            // 3356
                                                                                                                       //
          if (!http.request.aborted) {                                                                                 // 2473
            http.request.abort();                                                                                      // 2474
          }                                                                                                            // 3359
        }).on('error', streamErrorHandler).on('end', function () {                                                     // 2466
          if (!http.response.finished) {                                                                               // 2478
            http.response.end();                                                                                       // 2479
          }                                                                                                            // 3363
        });                                                                                                            // 2466
                                                                                                                       //
        if (self.throttle) {                                                                                           // 2481
          stream.pipe(new Throttle({                                                                                   // 2481
            bps: self.throttle,                                                                                        // 2481
            chunksize: self.chunkSize                                                                                  // 2481
          }));                                                                                                         // 2481
        }                                                                                                              // 3370
                                                                                                                       //
        stream.pipe(http.response);                                                                                    // 2482
        break;                                                                                                         // 2483
                                                                                                                       //
      case '206':                                                                                                      // 2428
        if (self.debug) {                                                                                              // 2485
          console.info("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [206]");                         // 2485
        }                                                                                                              // 3376
                                                                                                                       //
        if (!http.response.headersSent) {                                                                              // 2486
          http.response.setHeader('Content-Range', "bytes " + reqRange.start + "-" + reqRange.end + "/" + vRef.size);  // 2487
        }                                                                                                              // 3379
                                                                                                                       //
        stream = readableStream || fs.createReadStream(vRef.path, {                                                    // 2488
          start: reqRange.start,                                                                                       // 2488
          end: reqRange.end                                                                                            // 2488
        });                                                                                                            // 2488
                                                                                                                       //
        if (!http.response.headersSent) {                                                                              // 2489
          if (readableStream) {                                                                                        // 2490
            http.response.writeHead(206);                                                                              // 2490
          }                                                                                                            // 2489
        }                                                                                                              // 3388
                                                                                                                       //
        http.response.on('close', function () {                                                                        // 2492
          if (typeof stream.abort === "function") {                                                                    // 3390
            stream.abort();                                                                                            // 2493
          }                                                                                                            // 3392
                                                                                                                       //
          if (typeof stream.end === "function") {                                                                      // 3393
            stream.end();                                                                                              // 2494
          }                                                                                                            // 3395
        });                                                                                                            // 2492
        http.request.on('abort', function () {                                                                         // 2497
          if (typeof stream.abort === "function") {                                                                    // 3398
            stream.abort();                                                                                            // 2498
          }                                                                                                            // 3400
                                                                                                                       //
          if (typeof stream.end === "function") {                                                                      // 3401
            stream.end();                                                                                              // 2499
          }                                                                                                            // 3403
        });                                                                                                            // 2497
        stream.on('open', function () {                                                                                // 2502
          if (!http.response.headersSent) {                                                                            // 2503
            http.response.writeHead(206);                                                                              // 2504
          }                                                                                                            // 3408
        }).on('abort', function () {                                                                                   // 2502
          if (!http.response.finished) {                                                                               // 2507
            http.response.end();                                                                                       // 2508
          }                                                                                                            // 3412
                                                                                                                       //
          if (!http.request.aborted) {                                                                                 // 2509
            http.request.abort();                                                                                      // 2510
          }                                                                                                            // 3415
        }).on('error', streamErrorHandler).on('end', function () {                                                     // 2502
          if (!http.response.finished) {                                                                               // 2514
            http.response.end();                                                                                       // 2515
          }                                                                                                            // 3419
        });                                                                                                            // 2502
                                                                                                                       //
        if (self.throttle) {                                                                                           // 2517
          stream.pipe(new Throttle({                                                                                   // 2517
            bps: self.throttle,                                                                                        // 2517
            chunksize: self.chunkSize                                                                                  // 2517
          }));                                                                                                         // 2517
        }                                                                                                              // 3426
                                                                                                                       //
        stream.pipe(http.response);                                                                                    // 2518
        break;                                                                                                         // 2519
    }                                                                                                                  // 2428
  } : void 0; /*                                                                                                       // 2366
              @locus Anywhere                                                                                          //
              @memberOf FilesCollection                                                                                //
              @name link                                                                                               //
              @param {Object} fileRef - File reference object                                                          //
              @param {String} version - Version of file you would like to request                                      //
              @summary Returns downloadable URL                                                                        //
              @returns {String} Empty string returned in case if file not found in DB                                  //
               */                                                                                                      //
                                                                                                                       //
  FilesCollection.prototype.link = function (fileRef, version) {                                                       // 3443
    if (version == null) {                                                                                             // 3444
      version = 'original';                                                                                            // 2532
    }                                                                                                                  // 3446
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2533
      console.info("[FilesCollection] [link(" + (fileRef != null ? fileRef._id : void 0) + ", " + version + ")]");     // 2533
    }                                                                                                                  // 3449
                                                                                                                       //
    check(fileRef, Object);                                                                                            // 2534
    check(version, String);                                                                                            // 2535
                                                                                                                       //
    if (!fileRef) {                                                                                                    // 2536
      return '';                                                                                                       // 2536
    }                                                                                                                  // 3454
                                                                                                                       //
    return formatFleURL(fileRef, version);                                                                             // 2537
  };                                                                                                                   // 2532
                                                                                                                       //
  return FilesCollection;                                                                                              // 3458
}()); /*                                                                                                               // 3460
      @locus Anywhere                                                                                                  //
      @private                                                                                                         //
      @name formatFleURL                                                                                               //
      @param {Object} fileRef - File reference object                                                                  //
      @param {String} version - [Optional] Version of file you would like build URL for                                //
      @summary Returns formatted URL for file                                                                          //
      @returns {String} Downloadable link                                                                              //
       */                                                                                                              //
                                                                                                                       //
formatFleURL = function (fileRef, version) {                                                                           // 2548
  var ext, ref, root;                                                                                                  // 2549
                                                                                                                       //
  if (version == null) {                                                                                               // 3475
    version = 'original';                                                                                              // 2548
  }                                                                                                                    // 3477
                                                                                                                       //
  check(fileRef, Object);                                                                                              // 2549
  check(version, String);                                                                                              // 2550
  root = __meteor_runtime_config__.ROOT_URL.replace(/\/+$/, '');                                                       // 2552
                                                                                                                       //
  if ((ref = fileRef.extension) != null ? ref.length : void 0) {                                                       // 2554
    ext = '.' + fileRef.extension;                                                                                     // 2555
  } else {                                                                                                             // 2554
    ext = '';                                                                                                          // 2557
  }                                                                                                                    // 3485
                                                                                                                       //
  if (fileRef["public"] === true) {                                                                                    // 2559
    return root + (version === 'original' ? fileRef._downloadRoute + "/" + fileRef._id + ext : fileRef._downloadRoute + "/" + version + "-" + fileRef._id + ext);
  } else {                                                                                                             // 2559
    return root + (fileRef._downloadRoute + "/" + fileRef._collectionName + "/" + fileRef._id + "/" + version + "/" + fileRef._id + ext);
  }                                                                                                                    // 3490
};                                                                                                                     // 2548
                                                                                                                       //
if (Meteor.isClient) {                                                                                                 // 2564
  /*                                                                                                                   // 2565
  @locus Client                                                                                                        //
  @TemplateHelper                                                                                                      //
  @name fileURL                                                                                                        //
  @param {Object} fileRef - File reference object                                                                      //
  @param {String} version - [Optional] Version of file you would like to request                                       //
  @summary Get download URL for file by fileRef, even without subscription                                             //
  @example {{fileURL fileRef}}                                                                                         //
  @returns {String}                                                                                                    //
   */Meteor.startup(function () {                                                                                      //
    if (typeof Template !== "undefined" && Template !== null) {                                                        // 2576
      Template.registerHelper('fileURL', function (fileRef, version) {                                                 // 2577
        if (!fileRef || !_.isObject(fileRef)) {                                                                        // 2578
          return void 0;                                                                                               // 2578
        }                                                                                                              // 3510
                                                                                                                       //
        version = !version || !_.isString(version) ? 'original' : version;                                             // 2579
                                                                                                                       //
        if (fileRef._id) {                                                                                             // 2580
          return formatFleURL(fileRef, version);                                                                       // 2581
        } else {                                                                                                       // 2580
          return '';                                                                                                   // 2583
        }                                                                                                              // 3516
      });                                                                                                              // 2577
    }                                                                                                                  // 3518
  });                                                                                                                  // 2575
} /*                                                                                                                   // 3520
  Export the FilesCollection class                                                                                     //
   */                                                                                                                  //
                                                                                                                       //
Meteor.Files = FilesCollection;                                                                                        // 2589
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"event-emitter.jsx":["babel-runtime/helpers/typeof",function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/event-emitter.jsx                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _typeof2 = require("babel-runtime/helpers/typeof");                                                                //
                                                                                                                       //
var _typeof3 = _interopRequireDefault(_typeof2);                                                                       //
                                                                                                                       //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }                      //
                                                                                                                       //
module.export({                                                                                                        // 1
  EventEmitter: function () {                                                                                          // 1
    return EventEmitter;                                                                                               // 1
  }                                                                                                                    // 1
});                                                                                                                    // 1
                                                                                                                       //
/*!                                                                                                                    // 1
 * EventEmitter v4.2.11 - git.io/ee                                                                                    //
 * Unlicense - http://unlicense.org/                                                                                   //
 * Oliver Caldwell - http://oli.me.uk/                                                                                 //
 * @preserve                                                                                                           //
 */ /**                                                                                                                //
     * Class for managing events.                                                                                      //
     * Can be extended to provide event functionality in other classes.                                                //
     *                                                                                                                 //
     * @class EventEmitter Manages event registering and emitting.                                                     //
     */function EventEmitter() {} // Shortcuts to improve speed and size                                               //
                                                                                                                       //
                                                                                                                       //
var proto = EventEmitter.prototype;                                                                                    // 17
                                                                                                                       //
var _exports = this;                                                                                                   // 18
                                                                                                                       //
var originalGlobalValue = _exports.EventEmitter; /**                                                                   // 19
                                                  * Finds the index of the listener for the event in its storage array.
                                                  *                                                                    //
                                                  * @param {Function[]} listeners Array of listeners to search through.
                                                  * @param {Function} listener Method to look for.                     //
                                                  * @return {Number} Index of the specified listener, -1 if not found  //
                                                  * @api private                                                       //
                                                  */                                                                   //
                                                                                                                       //
function indexOfListener(listeners, listener) {                                                                        // 29
  var i = listeners.length;                                                                                            // 30
                                                                                                                       //
  while (i--) {                                                                                                        // 31
    if (listeners[i].listener === listener) {                                                                          // 32
      return i;                                                                                                        // 33
    }                                                                                                                  // 34
  }                                                                                                                    // 35
                                                                                                                       //
  return -1;                                                                                                           // 37
} /**                                                                                                                  // 38
   * Alias a method while keeping the context correct, to allow for overwriting of target method.                      //
   *                                                                                                                   //
   * @param {String} name The name of the target method.                                                               //
   * @return {Function} The aliased method                                                                             //
   * @api private                                                                                                      //
   */                                                                                                                  //
                                                                                                                       //
function alias(name) {                                                                                                 // 47
  return function () {                                                                                                 // 48
    function aliasClosure() {                                                                                          // 48
      return this[name].apply(this, arguments);                                                                        // 49
    }                                                                                                                  // 50
                                                                                                                       //
    return aliasClosure;                                                                                               // 48
  }();                                                                                                                 // 48
} /**                                                                                                                  // 51
   * Returns the listener array for the specified event.                                                               //
   * Will initialise the event object and listener arrays if required.                                                 //
   * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
   * Each property in the object response is an array of listener functions.                                           //
   *                                                                                                                   //
   * @param {String|RegExp} evt Name of the event to return the listeners from.                                        //
   * @return {Function[]|Object} All listener functions for the event.                                                 //
   */                                                                                                                  //
                                                                                                                       //
proto.getListeners = function () {                                                                                     // 62
  function getListeners(evt) {                                                                                         // 62
    var events = this._getEvents();                                                                                    // 63
                                                                                                                       //
    var response = void 0;                                                                                             // 64
    var key = void 0; // Return a concatenated array of all matching events if                                         // 65
    // the selector is a regular expression.                                                                           // 68
                                                                                                                       //
    if (evt instanceof RegExp) {                                                                                       // 69
      response = {};                                                                                                   // 70
                                                                                                                       //
      for (key in meteorBabelHelpers.sanitizeForInObject(events)) {                                                    // 71
        if (events.hasOwnProperty(key) && evt.test(key)) {                                                             // 72
          response[key] = events[key];                                                                                 // 73
        }                                                                                                              // 74
      }                                                                                                                // 75
    } else {                                                                                                           // 76
      response = events[evt] || (events[evt] = []);                                                                    // 77
    }                                                                                                                  // 78
                                                                                                                       //
    return response;                                                                                                   // 80
  }                                                                                                                    // 81
                                                                                                                       //
  return getListeners;                                                                                                 // 62
}(); /**                                                                                                               // 62
      * Takes a list of listener objects and flattens it into a list of listener functions.                            //
      *                                                                                                                //
      * @param {Object[]} listeners Raw listener objects.                                                              //
      * @return {Function[]} Just the listener functions.                                                              //
      */                                                                                                               //
                                                                                                                       //
proto.flattenListeners = function () {                                                                                 // 89
  function flattenListeners(listeners) {                                                                               // 89
    var flatListeners = [];                                                                                            // 90
    var i = void 0;                                                                                                    // 91
                                                                                                                       //
    for (i = 0; i < listeners.length; i += 1) {                                                                        // 93
      flatListeners.push(listeners[i].listener);                                                                       // 94
    }                                                                                                                  // 95
                                                                                                                       //
    return flatListeners;                                                                                              // 97
  }                                                                                                                    // 98
                                                                                                                       //
  return flattenListeners;                                                                                             // 89
}(); /**                                                                                                               // 89
      * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
      *                                                                                                                //
      * @param {String|RegExp} evt Name of the event to return the listeners from.                                     //
      * @return {Object} All listener functions for an event in an object.                                             //
      */                                                                                                               //
                                                                                                                       //
proto.getListenersAsObject = function () {                                                                             // 106
  function getListenersAsObject(evt) {                                                                                 // 106
    var listeners = this.getListeners(evt);                                                                            // 107
    var response = void 0;                                                                                             // 108
                                                                                                                       //
    if (listeners instanceof Array) {                                                                                  // 110
      response = {};                                                                                                   // 111
      response[evt] = listeners;                                                                                       // 112
    }                                                                                                                  // 113
                                                                                                                       //
    return response || listeners;                                                                                      // 115
  }                                                                                                                    // 116
                                                                                                                       //
  return getListenersAsObject;                                                                                         // 106
}(); /**                                                                                                               // 106
      * Adds a listener function to the specified event.                                                               //
      * The listener will not be added if it is a duplicate.                                                           //
      * If the listener returns true then it will be removed after it is called.                                       //
      * If you pass a regular expression as the event name then the listener will be added to all events that match it.
      *                                                                                                                //
      * @param {String|RegExp} evt Name of the event to attach the listener to.                                        //
      * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
      * @return {Object} Current instance of EventEmitter for chaining.                                                //
      */                                                                                                               //
                                                                                                                       //
proto.addListener = function () {                                                                                      // 128
  function addListener(evt, listener) {                                                                                // 128
    var listeners = this.getListenersAsObject(evt);                                                                    // 129
    var listenerIsWrapped = (typeof listener === "undefined" ? "undefined" : (0, _typeof3.default)(listener)) === 'object';
    var key = void 0;                                                                                                  // 131
                                                                                                                       //
    for (key in meteorBabelHelpers.sanitizeForInObject(listeners)) {                                                   // 133
      if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {                         // 134
        listeners[key].push(listenerIsWrapped ? listener : {                                                           // 135
          listener: listener,                                                                                          // 136
          once: false                                                                                                  // 137
        });                                                                                                            // 135
      }                                                                                                                // 139
    }                                                                                                                  // 140
                                                                                                                       //
    return this;                                                                                                       // 142
  }                                                                                                                    // 143
                                                                                                                       //
  return addListener;                                                                                                  // 128
}(); /**                                                                                                               // 128
      * Alias of addListener                                                                                           //
      */                                                                                                               //
                                                                                                                       //
proto.on = alias('addListener'); /**                                                                                   // 148
                                  * Semi-alias of addListener. It will add a listener that will be                     //
                                  * automatically removed after its first execution.                                   //
                                  *                                                                                    //
                                  * @param {String|RegExp} evt Name of the event to attach the listener to.            //
                                  * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
                                  * @return {Object} Current instance of EventEmitter for chaining.                    //
                                  */                                                                                   //
                                                                                                                       //
proto.addOnceListener = function () {                                                                                  // 158
  function addOnceListener(evt, listener) {                                                                            // 158
    return this.addListener(evt, {                                                                                     // 159
      listener: listener,                                                                                              // 160
      once: true                                                                                                       // 161
    });                                                                                                                // 159
  }                                                                                                                    // 163
                                                                                                                       //
  return addOnceListener;                                                                                              // 158
}(); /**                                                                                                               // 158
      * Alias of addOnceListener.                                                                                      //
      */                                                                                                               //
                                                                                                                       //
proto.once = alias('addOnceListener'); /**                                                                             // 168
                                        * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
                                        * You need to tell it what event names should be matched by a regex.           //
                                        *                                                                              //
                                        * @param {String} evt Name of the event to create.                             //
                                        * @return {Object} Current instance of EventEmitter for chaining.              //
                                        */                                                                             //
                                                                                                                       //
proto.defineEvent = function () {                                                                                      // 177
  function defineEvent(evt) {                                                                                          // 177
    this.getListeners(evt);                                                                                            // 178
    return this;                                                                                                       // 179
  }                                                                                                                    // 180
                                                                                                                       //
  return defineEvent;                                                                                                  // 177
}(); /**                                                                                                               // 177
      * Uses defineEvent to define multiple events.                                                                    //
      *                                                                                                                //
      * @param {String[]} evts An array of event names to define.                                                      //
      * @return {Object} Current instance of EventEmitter for chaining.                                                //
      */                                                                                                               //
                                                                                                                       //
proto.defineEvents = function () {                                                                                     // 188
  function defineEvents(evts) {                                                                                        // 188
    for (var i = 0; i < evts.length; i += 1) {                                                                         // 189
      this.defineEvent(evts[i]);                                                                                       // 190
    }                                                                                                                  // 191
                                                                                                                       //
    return this;                                                                                                       // 192
  }                                                                                                                    // 193
                                                                                                                       //
  return defineEvents;                                                                                                 // 188
}(); /**                                                                                                               // 188
      * Removes a listener function from the specified event.                                                          //
      * When passed a regular expression as the event name, it will remove the listener from all events that match it.
      *                                                                                                                //
      * @param {String|RegExp} evt Name of the event to remove the listener from.                                      //
      * @param {Function} listener Method to remove from the event.                                                    //
      * @return {Object} Current instance of EventEmitter for chaining.                                                //
      */                                                                                                               //
                                                                                                                       //
proto.removeListener = function () {                                                                                   // 203
  function removeListener(evt, listener) {                                                                             // 203
    var listeners = this.getListenersAsObject(evt);                                                                    // 204
    var index = void 0;                                                                                                // 205
    var key = void 0;                                                                                                  // 206
                                                                                                                       //
    for (key in meteorBabelHelpers.sanitizeForInObject(listeners)) {                                                   // 208
      if (listeners.hasOwnProperty(key)) {                                                                             // 209
        index = indexOfListener(listeners[key], listener);                                                             // 210
                                                                                                                       //
        if (index !== -1) {                                                                                            // 212
          listeners[key].splice(index, 1);                                                                             // 213
        }                                                                                                              // 214
      }                                                                                                                // 215
    }                                                                                                                  // 216
                                                                                                                       //
    return this;                                                                                                       // 218
  }                                                                                                                    // 219
                                                                                                                       //
  return removeListener;                                                                                               // 203
}(); /**                                                                                                               // 203
      * Alias of removeListener                                                                                        //
      */                                                                                                               //
                                                                                                                       //
proto.off = alias('removeListener'); /**                                                                               // 224
                                      * Adds listeners in bulk using the manipulateListeners method.                   //
                                      * If you pass an object as the second argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
                                      * You can also pass it a regular expression to add the array of listeners to all events that match it.
                                      * Yeah, this function does quite a bit. That's probably a bad thing.             //
                                      *                                                                                //
                                      * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
                                      * @param {Function[]} [listeners] An optional array of listener functions to add.
                                      * @return {Object} Current instance of EventEmitter for chaining.                //
                                      */                                                                               //
                                                                                                                       //
proto.addListeners = function () {                                                                                     // 236
  function addListeners(evt, listeners) {                                                                              // 236
    // Pass through to manipulateListeners                                                                             // 237
    return this.manipulateListeners(false, evt, listeners);                                                            // 238
  }                                                                                                                    // 239
                                                                                                                       //
  return addListeners;                                                                                                 // 236
}(); /**                                                                                                               // 236
      * Removes listeners in bulk using the manipulateListeners method.                                                //
      * If you pass an object as the second argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
      * You can also pass it an event name and an array of listeners to be removed.                                    //
      * You can also pass it a regular expression to remove the listeners from all events that match it.               //
      *                                                                                                                //
      * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
      * @param {Function[]} [listeners] An optional array of listener functions to remove.                             //
      * @return {Object} Current instance of EventEmitter for chaining.                                                //
      */                                                                                                               //
                                                                                                                       //
proto.removeListeners = function () {                                                                                  // 251
  function removeListeners(evt, listeners) {                                                                           // 251
    // Pass through to manipulateListeners                                                                             // 252
    return this.manipulateListeners(true, evt, listeners);                                                             // 253
  }                                                                                                                    // 254
                                                                                                                       //
  return removeListeners;                                                                                              // 251
}(); /**                                                                                                               // 251
      * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
      * The first argument will determine if the listeners are removed (true) or added (false).                        //
      * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
      * You can also pass it an event name and an array of listeners to be added/removed.                              //
      * You can also pass it a regular expression to manipulate the listeners of all events that match it.             //
      *                                                                                                                //
      * @param {Boolean} remove True if you want to remove listeners, false if you want to add.                        //
      * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
      * @param {Function[]} [listeners] An optional array of listener functions to add/remove.                         //
      * @return {Object} Current instance of EventEmitter for chaining.                                                //
      */                                                                                                               //
                                                                                                                       //
proto.manipulateListeners = function () {                                                                              // 268
  function manipulateListeners(remove, evt, listeners) {                                                               // 268
    var i = void 0;                                                                                                    // 269
    var single = remove ? this.removeListener : this.addListener;                                                      // 270
    var multiple = remove ? this.removeListeners : this.addListeners; // If evt is an object then pass each of its properties to this method
                                                                                                                       //
    if ((typeof evt === "undefined" ? "undefined" : (0, _typeof3.default)(evt)) === 'object' && !(evt instanceof RegExp)) {
      for (i in meteorBabelHelpers.sanitizeForInObject(evt)) {                                                         // 275
        if (evt.hasOwnProperty(i) && evt[i]) {                                                                         // 276
          // Pass the single listener straight through to the singular method                                          // 277
          if (typeof evt[i] === 'function') {                                                                          // 278
            single.call(this, i, evt[i]);                                                                              // 279
          } else {                                                                                                     // 280
            // Otherwise pass back to the multiple function                                                            // 281
            multiple.call(this, i, evt[i]);                                                                            // 282
          }                                                                                                            // 283
        }                                                                                                              // 284
      }                                                                                                                // 285
    } else {                                                                                                           // 286
      // So evt must be a string                                                                                       // 287
      // And listeners must be an array of listeners                                                                   // 288
      // Loop over it and pass each one to the multiple method                                                         // 289
      i = listeners.length;                                                                                            // 290
                                                                                                                       //
      while (i--) {                                                                                                    // 291
        single.call(this, evt, listeners[i]);                                                                          // 292
      }                                                                                                                // 293
    }                                                                                                                  // 294
                                                                                                                       //
    return this;                                                                                                       // 296
  }                                                                                                                    // 297
                                                                                                                       //
  return manipulateListeners;                                                                                          // 268
}(); /**                                                                                                               // 268
      * Removes all listeners from a specified event.                                                                  //
      * If you do not specify an event then all listeners will be removed.                                             //
      * That means every event will be emptied.                                                                        //
      * You can also pass a regex to remove all events that match it.                                                  //
      *                                                                                                                //
      * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
      * @return {Object} Current instance of EventEmitter for chaining.                                                //
      */                                                                                                               //
                                                                                                                       //
proto.removeEvent = function () {                                                                                      // 308
  function removeEvent(evt) {                                                                                          // 308
    var type = typeof evt === "undefined" ? "undefined" : (0, _typeof3.default)(evt);                                  // 309
                                                                                                                       //
    var events = this._getEvents();                                                                                    // 310
                                                                                                                       //
    var key = void 0; // Remove different things depending on the state of evt                                         // 311
                                                                                                                       //
    if (type === 'string') {                                                                                           // 314
      // Remove all listeners for the specified event                                                                  // 315
      delete events[evt];                                                                                              // 316
    } else if (evt instanceof RegExp) {                                                                                // 317
      // Remove all events matching the regex.                                                                         // 318
      for (key in meteorBabelHelpers.sanitizeForInObject(events)) {                                                    // 319
        if (events.hasOwnProperty(key) && evt.test(key)) {                                                             // 320
          delete events[key];                                                                                          // 321
        }                                                                                                              // 322
      }                                                                                                                // 323
    } else {                                                                                                           // 324
      // Remove all listeners in all events                                                                            // 325
      delete this._events;                                                                                             // 326
    }                                                                                                                  // 327
                                                                                                                       //
    return this;                                                                                                       // 329
  }                                                                                                                    // 330
                                                                                                                       //
  return removeEvent;                                                                                                  // 308
}(); /**                                                                                                               // 308
      * Alias of removeEvent.                                                                                          //
      *                                                                                                                //
      * Added to mirror the node API.                                                                                  //
      */                                                                                                               //
                                                                                                                       //
proto.removeAllListeners = alias('removeEvent'); /**                                                                   // 337
                                                  * Emits an event of your choice.                                     //
                                                  * When emitted, every listener attached to that event will be executed.
                                                  * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
                                                  * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
                                                  * So they will not arrive within the array on the other side, they will be separate.
                                                  * You can also pass a regular expression to emit to all events that match it.
                                                  *                                                                    //
                                                  * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
                                                  * @param {Array} [args] Optional array of arguments to be passed to each listener.
                                                  * @return {Object} Current instance of EventEmitter for chaining.    //
                                                  */                                                                   //
                                                                                                                       //
proto.emitEvent = function () {                                                                                        // 351
  function emitEvent(evt, args) {                                                                                      // 351
    var listenersMap = this.getListenersAsObject(evt);                                                                 // 352
    var listeners = void 0;                                                                                            // 353
    var listener = void 0;                                                                                             // 354
    var i = void 0;                                                                                                    // 355
    var key = void 0;                                                                                                  // 356
    var response = void 0;                                                                                             // 357
                                                                                                                       //
    for (key in meteorBabelHelpers.sanitizeForInObject(listenersMap)) {                                                // 359
      if (listenersMap.hasOwnProperty(key)) {                                                                          // 360
        listeners = listenersMap[key].slice(0);                                                                        // 361
        i = listeners.length;                                                                                          // 362
                                                                                                                       //
        while (i--) {                                                                                                  // 364
          // If the listener returns true then it shall be removed from the event                                      // 365
          // The function is executed either with a basic call or an apply if there is an args array                   // 366
          listener = listeners[i];                                                                                     // 367
                                                                                                                       //
          if (listener.once === true) {                                                                                // 369
            this.removeListener(evt, listener.listener);                                                               // 370
          }                                                                                                            // 371
                                                                                                                       //
          response = listener.listener.apply(this, args || []);                                                        // 373
                                                                                                                       //
          if (response === this._getOnceReturnValue()) {                                                               // 375
            this.removeListener(evt, listener.listener);                                                               // 376
          }                                                                                                            // 377
        }                                                                                                              // 378
      }                                                                                                                // 379
    }                                                                                                                  // 380
                                                                                                                       //
    return this;                                                                                                       // 382
  }                                                                                                                    // 383
                                                                                                                       //
  return emitEvent;                                                                                                    // 351
}(); /**                                                                                                               // 351
      * Alias of emitEvent                                                                                             //
      */                                                                                                               //
                                                                                                                       //
proto.trigger = alias('emitEvent'); /**                                                                                // 388
                                     * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
                                     * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
                                     *                                                                                 //
                                     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
                                     * @param {...*} Optional additional arguments to be passed to each listener.      //
                                     * @return {Object} Current instance of EventEmitter for chaining.                 //
                                     */                                                                                //
                                                                                                                       //
proto.emit = function () {                                                                                             // 398
  function emit(evt) {                                                                                                 // 398
    var args = Array.prototype.slice.call(arguments, 1);                                                               // 399
    return this.emitEvent(evt, args);                                                                                  // 400
  }                                                                                                                    // 401
                                                                                                                       //
  return emit;                                                                                                         // 398
}(); /**                                                                                                               // 398
      * Sets the current value to check against when executing listeners. If a                                         //
      * listeners return value matches the one set here then it will be removed                                        //
      * after execution. This value defaults to true.                                                                  //
      *                                                                                                                //
      * @param {*} value The new value to check for when executing listeners.                                          //
      * @return {Object} Current instance of EventEmitter for chaining.                                                //
      */                                                                                                               //
                                                                                                                       //
proto.setOnceReturnValue = function () {                                                                               // 411
  function setOnceReturnValue(value) {                                                                                 // 411
    this._onceReturnValue = value;                                                                                     // 412
    return this;                                                                                                       // 413
  }                                                                                                                    // 414
                                                                                                                       //
  return setOnceReturnValue;                                                                                           // 411
}(); /**                                                                                                               // 411
      * Fetches the current value to check against when executing listeners. If                                        //
      * the listeners return value matches this one then it should be removed                                          //
      * automatically. It will return true by default.                                                                 //
      *                                                                                                                //
      * @return {*|Boolean} The current value to check for or the default, true.                                       //
      * @api private                                                                                                   //
      */                                                                                                               //
                                                                                                                       //
proto._getOnceReturnValue = function () {                                                                              // 424
  function _getOnceReturnValue() {                                                                                     // 424
    if (this.hasOwnProperty('_onceReturnValue')) {                                                                     // 425
      return this._onceReturnValue;                                                                                    // 426
    }                                                                                                                  // 427
                                                                                                                       //
    return true;                                                                                                       // 428
  }                                                                                                                    // 429
                                                                                                                       //
  return _getOnceReturnValue;                                                                                          // 424
}(); /**                                                                                                               // 424
      * Fetches the events object and creates one if required.                                                         //
      *                                                                                                                //
      * @return {Object} The events storage object.                                                                    //
      * @api private                                                                                                   //
      */                                                                                                               //
                                                                                                                       //
proto._getEvents = function () {                                                                                       // 437
  function _getEvents() {                                                                                              // 437
    return this._events || (this._events = {});                                                                        // 438
  }                                                                                                                    // 439
                                                                                                                       //
  return _getEvents;                                                                                                   // 437
}(); /**                                                                                                               // 437
      * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.         //
      *                                                                                                                //
      * @return {Function} Non conflicting EventEmitter class.                                                         //
      */                                                                                                               //
                                                                                                                       //
EventEmitter.noConflict = function () {                                                                                // 446
  function noConflict() {                                                                                              // 446
    _exports.EventEmitter = originalGlobalValue;                                                                       // 447
    return EventEmitter;                                                                                               // 448
  }                                                                                                                    // 449
                                                                                                                       //
  return noConflict;                                                                                                   // 446
}(); // Expose the class                                                                                               // 446
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}]}}}},{"extensions":[".js",".json",".coffee",".jsx"]});
var exports = require("./node_modules/meteor/ostrio:files/files.coffee.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['ostrio:files'] = exports, {
  FilesCollection: FilesCollection
});

})();

//# sourceMappingURL=ostrio_files.js.map
