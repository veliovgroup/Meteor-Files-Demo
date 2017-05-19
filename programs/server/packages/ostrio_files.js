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

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:files":{"files.coffee.js":["meteor/ostrio:cookies","fs-extra","events","request","throttle","file-type","path","./event-emitter.jsx",function(require,exports,module){

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
   */fs = require('fs-extra');                                                                                         //
  events = require('events');                                                                                          // 9
  request = require('request');                                                                                        // 10
  Throttle = require('throttle');                                                                                      // 11
  fileType = require('file-type');                                                                                     // 12
  nodePath = require('path'); /*                                                                                       // 13
                              @var {Object} bound - Meteor.bindEnvironment (Fiber wrapper)                             //
                               */                                                                                      //
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
            http.response.writeHead(rc, {                                                                              // 761
              'Content-Length': text.length,                                                                           // 762
              'Content-Type': 'text/plain'                                                                             // 763
            });                                                                                                        // 762
            http.response.end(text);                                                                                   // 764
          }                                                                                                            // 1116
                                                                                                                       //
          return false;                                                                                                // 765
        }                                                                                                              // 743
      } else {                                                                                                         // 743
        return true;                                                                                                   // 767
      }                                                                                                                // 1121
    };                                                                                                                 // 742
                                                                                                                       //
    this._methodNames = {                                                                                              // 769
      _Abort: "_FilesCollectionAbort_" + this.collectionName,                                                          // 770
      _Write: "_FilesCollectionWrite_" + this.collectionName,                                                          // 771
      _Start: "_FilesCollectionStart_" + this.collectionName,                                                          // 772
      _Remove: "_FilesCollectionRemove_" + this.collectionName                                                         // 773
    };                                                                                                                 // 770
                                                                                                                       //
    if (Meteor.isServer) {                                                                                             // 775
      this.on('_handleUpload', this._handleUpload);                                                                    // 776
      this.on('_finishUpload', this._finishUpload);                                                                    // 777
      WebApp.connectHandlers.use(function (request, response, next) {                                                  // 779
        var _file, body, handleError, http, params, uri, uris, version;                                                // 780
                                                                                                                       //
        if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName + "/__upload")) {        // 780
          if (request.method === 'POST') {                                                                             // 781
            handleError = function (error) {                                                                           // 783
              console.warn("[FilesCollection] [Upload] [HTTP] Exception:", error);                                     // 784
              response.writeHead(500);                                                                                 // 785
              response.end(JSON.stringify({                                                                            // 786
                error: error                                                                                           // 786
              }));                                                                                                     // 786
            };                                                                                                         // 783
                                                                                                                       //
            body = '';                                                                                                 // 789
            request.on('data', function (data) {                                                                       // 790
              return bound(function () {                                                                               // 1145
                body += data;                                                                                          // 791
              });                                                                                                      // 790
            });                                                                                                        // 790
            request.on('end', function () {                                                                            // 794
              return bound(function () {                                                                               // 1150
                var _continueUpload, e, error, opts, ref, ref1, ref2, ref3, result, user;                              // 795
                                                                                                                       //
                try {                                                                                                  // 795
                  if (request.headers['x-mtok'] && ((ref = Meteor.server.sessions) != null ? ref[request.headers['x-mtok']] : void 0)) {
                    user = {                                                                                           // 797
                      userId: (ref1 = Meteor.server.sessions[request.headers['x-mtok']]) != null ? ref1.userId : void 0
                    };                                                                                                 // 797
                  } else {                                                                                             // 796
                    user = self._getUser({                                                                             // 799
                      request: request,                                                                                // 799
                      response: response                                                                               // 799
                    });                                                                                                // 799
                  }                                                                                                    // 1162
                                                                                                                       //
                  if (request.headers['x-start'] !== '1') {                                                            // 801
                    opts = {                                                                                           // 802
                      fileId: request.headers['x-fileid']                                                              // 802
                    };                                                                                                 // 802
                                                                                                                       //
                    if (request.headers['x-eof'] === '1') {                                                            // 803
                      opts.eof = true;                                                                                 // 804
                    } else {                                                                                           // 803
                      if (typeof Buffer.from === 'function') {                                                         // 806
                        try {                                                                                          // 807
                          opts.binData = Buffer.from(body, 'base64');                                                  // 808
                        } catch (error1) {                                                                             // 807
                          e = error1;                                                                                  // 809
                          opts.binData = new Buffer(body, 'base64');                                                   // 810
                        }                                                                                              // 806
                      } else {                                                                                         // 806
                        opts.binData = new Buffer(body, 'base64');                                                     // 812
                      }                                                                                                // 1179
                                                                                                                       //
                      opts.chunkId = parseInt(request.headers['x-chunkid']);                                           // 813
                    }                                                                                                  // 1181
                                                                                                                       //
                    _continueUpload = self._continueUpload(opts.fileId);                                               // 815
                                                                                                                       //
                    if (!_continueUpload) {                                                                            // 816
                      throw new Meteor.Error(408, 'Can\'t continue upload, session expired. Start upload again.');     // 817
                    }                                                                                                  // 1185
                                                                                                                       //
                    ref2 = self._prepareUpload(_.extend(opts, _continueUpload), user.userId, 'HTTP'), result = ref2.result, opts = ref2.opts;
                                                                                                                       //
                    if (opts.eof) {                                                                                    // 821
                      self._handleUpload(result, opts, function () {                                                   // 822
                        var ref3;                                                                                      // 823
                        response.writeHead(200);                                                                       // 823
                                                                                                                       //
                        if (result != null ? (ref3 = result.file) != null ? ref3.meta : void 0 : void 0) {             // 824
                          result.file.meta = fixJSONStringify(result.file.meta);                                       // 824
                        }                                                                                              // 1193
                                                                                                                       //
                        response.end(JSON.stringify(result));                                                          // 825
                      });                                                                                              // 822
                                                                                                                       //
                      return;                                                                                          // 827
                    } else {                                                                                           // 821
                      self.emit('_handleUpload', result, opts, NOOP);                                                  // 829
                    }                                                                                                  // 1199
                                                                                                                       //
                    response.writeHead(204);                                                                           // 831
                    response.end();                                                                                    // 832
                  } else {                                                                                             // 801
                    opts = JSON.parse(body);                                                                           // 835
                    opts.___s = true;                                                                                  // 836
                                                                                                                       //
                    if (self.debug) {                                                                                  // 837
                      console.info("[FilesCollection] [File Start HTTP] " + opts.file.name + " - " + opts.fileId);     // 837
                    }                                                                                                  // 1207
                                                                                                                       //
                    if (opts != null ? (ref3 = opts.file) != null ? ref3.meta : void 0 : void 0) {                     // 838
                      opts.file.meta = fixJSONParse(opts.file.meta);                                                   // 838
                    }                                                                                                  // 1210
                                                                                                                       //
                    result = self._prepareUpload(_.clone(opts), user.userId, 'HTTP Start Method').result;              // 839
                                                                                                                       //
                    if (self.collection.findOne(result._id)) {                                                         // 840
                      throw new Meteor.Error(400, 'Can\'t start upload, data substitution detected!');                 // 841
                    }                                                                                                  // 1214
                                                                                                                       //
                    opts._id = opts.fileId;                                                                            // 842
                    opts.createdAt = new Date();                                                                       // 843
                                                                                                                       //
                    self._preCollection.insert(_.omit(opts, '___s'));                                                  // 844
                                                                                                                       //
                    self._createStream(result._id, result.path, _.omit(opts, '___s'));                                 // 845
                                                                                                                       //
                    if (opts.returnMeta) {                                                                             // 847
                      response.writeHead(200);                                                                         // 848
                      response.end(JSON.stringify({                                                                    // 849
                        uploadRoute: self.downloadRoute + "/" + self.collectionName + "/__upload",                     // 850
                        file: result                                                                                   // 851
                      }));                                                                                             // 849
                    } else {                                                                                           // 847
                      response.writeHead(204);                                                                         // 854
                      response.end();                                                                                  // 855
                    }                                                                                                  // 801
                  }                                                                                                    // 795
                } catch (error1) {                                                                                     // 795
                  error = error1;                                                                                      // 856
                  handleError(error);                                                                                  // 857
                }                                                                                                      // 1233
              });                                                                                                      // 794
            });                                                                                                        // 794
          } else {                                                                                                     // 781
            next();                                                                                                    // 860
          }                                                                                                            // 1238
                                                                                                                       //
          return;                                                                                                      // 861
        }                                                                                                              // 1240
                                                                                                                       //
        if (!self["public"]) {                                                                                         // 863
          if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName)) {                    // 864
            uri = request._parsedUrl.path.replace(self.downloadRoute + "/" + self.collectionName, '');                 // 865
                                                                                                                       //
            if (uri.indexOf('/') === 0) {                                                                              // 866
              uri = uri.substring(1);                                                                                  // 867
            }                                                                                                          // 1246
                                                                                                                       //
            uris = uri.split('/');                                                                                     // 869
                                                                                                                       //
            if (uris.length === 3) {                                                                                   // 870
              params = {                                                                                               // 871
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                _id: uris[0],                                                                                          // 873
                version: uris[1],                                                                                      // 874
                name: uris[2]                                                                                          // 875
              };                                                                                                       // 872
              http = {                                                                                                 // 876
                request: request,                                                                                      // 876
                response: response,                                                                                    // 876
                params: params                                                                                         // 876
              };                                                                                                       // 876
                                                                                                                       //
              if (self._checkAccess(http)) {                                                                           // 877
                self.download(http, uris[1], self.collection.findOne(uris[0]));                                        // 877
              }                                                                                                        // 870
            } else {                                                                                                   // 870
              next();                                                                                                  // 879
            }                                                                                                          // 864
          } else {                                                                                                     // 864
            next();                                                                                                    // 881
          }                                                                                                            // 863
        } else {                                                                                                       // 863
          if (!!~request._parsedUrl.path.indexOf("" + self.downloadRoute)) {                                           // 883
            uri = request._parsedUrl.path.replace("" + self.downloadRoute, '');                                        // 884
                                                                                                                       //
            if (uri.indexOf('/') === 0) {                                                                              // 885
              uri = uri.substring(1);                                                                                  // 886
            }                                                                                                          // 1274
                                                                                                                       //
            uris = uri.split('/');                                                                                     // 888
            _file = uris[uris.length - 1];                                                                             // 889
                                                                                                                       //
            if (_file) {                                                                                               // 890
              if (!!~_file.indexOf('-')) {                                                                             // 891
                version = _file.split('-')[0];                                                                         // 892
                _file = _file.split('-')[1].split('?')[0];                                                             // 893
              } else {                                                                                                 // 891
                version = 'original';                                                                                  // 895
                _file = _file.split('?')[0];                                                                           // 896
              }                                                                                                        // 1284
                                                                                                                       //
              params = {                                                                                               // 898
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                file: _file,                                                                                           // 900
                _id: _file.split('.')[0],                                                                              // 901
                version: version,                                                                                      // 902
                name: _file                                                                                            // 903
              };                                                                                                       // 899
              http = {                                                                                                 // 904
                request: request,                                                                                      // 904
                response: response,                                                                                    // 904
                params: params                                                                                         // 904
              };                                                                                                       // 904
              self.download(http, version, self.collection.findOne(params._id));                                       // 905
            } else {                                                                                                   // 890
              next();                                                                                                  // 907
            }                                                                                                          // 883
          } else {                                                                                                     // 883
            next();                                                                                                    // 909
          }                                                                                                            // 863
        }                                                                                                              // 1304
      });                                                                                                              // 779
      _methods = {};                                                                                                   // 912
                                                                                                                       //
      _methods[self._methodNames._Remove] = function (selector) {                                                      // 917
        var cursor, user, userFuncs;                                                                                   // 918
        check(selector, Match.OneOf(String, Object));                                                                  // 918
                                                                                                                       //
        if (self.debug) {                                                                                              // 919
          console.info("[FilesCollection] [Unlink Method] [.remove(" + selector + ")]");                               // 919
        }                                                                                                              // 1312
                                                                                                                       //
        if (self.allowClientCode) {                                                                                    // 921
          if (self.onBeforeRemove && _.isFunction(self.onBeforeRemove)) {                                              // 922
            user = false;                                                                                              // 923
            userFuncs = {                                                                                              // 924
              userId: this.userId,                                                                                     // 925
              user: function () {                                                                                      // 926
                if (Meteor.users) {                                                                                    // 926
                  return Meteor.users.findOne(this.userId);                                                            // 1320
                } else {                                                                                               // 926
                  return null;                                                                                         // 1322
                }                                                                                                      // 1323
              }                                                                                                        // 924
            };                                                                                                         // 924
                                                                                                                       //
            if (!self.onBeforeRemove.call(userFuncs, self.find(selector) || null)) {                                   // 929
              throw new Meteor.Error(403, '[FilesCollection] [remove] Not permitted!');                                // 930
            }                                                                                                          // 922
          }                                                                                                            // 1329
                                                                                                                       //
          cursor = self.find(selector);                                                                                // 932
                                                                                                                       //
          if (cursor.count() > 0) {                                                                                    // 933
            self.remove(selector);                                                                                     // 934
            return true;                                                                                               // 935
          } else {                                                                                                     // 933
            throw new Meteor.Error(404, 'Cursor is empty, no files is removed');                                       // 937
          }                                                                                                            // 921
        } else {                                                                                                       // 921
          throw new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!');              // 939
        }                                                                                                              // 1339
      };                                                                                                               // 917
                                                                                                                       //
      _methods[self._methodNames._Start] = function (opts, returnMeta) {                                               // 949
        var result;                                                                                                    // 950
        check(opts, {                                                                                                  // 950
          file: Object,                                                                                                // 951
          fileId: String,                                                                                              // 952
          FSName: Match.Optional(String),                                                                              // 953
          chunkSize: Number,                                                                                           // 954
          fileLength: Number                                                                                           // 955
        });                                                                                                            // 950
        check(returnMeta, Match.Optional(Boolean));                                                                    // 958
                                                                                                                       //
        if (self.debug) {                                                                                              // 960
          console.info("[FilesCollection] [File Start Method] " + opts.file.name + " - " + opts.fileId);               // 960
        }                                                                                                              // 1353
                                                                                                                       //
        opts.___s = true;                                                                                              // 961
        result = self._prepareUpload(_.clone(opts), this.userId, 'DDP Start Method').result;                           // 962
                                                                                                                       //
        if (self.collection.findOne(result._id)) {                                                                     // 963
          throw new Meteor.Error(400, 'Can\'t start upload, data substitution detected!');                             // 964
        }                                                                                                              // 1358
                                                                                                                       //
        opts._id = opts.fileId;                                                                                        // 965
        opts.createdAt = new Date();                                                                                   // 966
                                                                                                                       //
        self._preCollection.insert(_.omit(opts, '___s'));                                                              // 967
                                                                                                                       //
        self._createStream(result._id, result.path, _.omit(opts, '___s'));                                             // 968
                                                                                                                       //
        if (returnMeta) {                                                                                              // 970
          return {                                                                                                     // 971
            uploadRoute: self.downloadRoute + "/" + self.collectionName + "/__upload",                                 // 972
            file: result                                                                                               // 973
          };                                                                                                           // 971
        } else {                                                                                                       // 970
          return true;                                                                                                 // 976
        }                                                                                                              // 1370
      };                                                                                                               // 949
                                                                                                                       //
      _methods[self._methodNames._Write] = function (opts) {                                                           // 982
        var _continueUpload, e, ref, result;                                                                           // 983
                                                                                                                       //
        check(opts, {                                                                                                  // 983
          eof: Match.Optional(Boolean),                                                                                // 984
          fileId: String,                                                                                              // 985
          binData: Match.Optional(String),                                                                             // 986
          chunkId: Match.Optional(Number)                                                                              // 987
        });                                                                                                            // 983
                                                                                                                       //
        if (opts.binData) {                                                                                            // 990
          if (typeof Buffer.from === 'function') {                                                                     // 991
            try {                                                                                                      // 992
              opts.binData = Buffer.from(opts.binData, 'base64');                                                      // 993
            } catch (error1) {                                                                                         // 992
              e = error1;                                                                                              // 994
              opts.binData = new Buffer(opts.binData, 'base64');                                                       // 995
            }                                                                                                          // 991
          } else {                                                                                                     // 991
            opts.binData = new Buffer(opts.binData, 'base64');                                                         // 997
          }                                                                                                            // 990
        }                                                                                                              // 1391
                                                                                                                       //
        _continueUpload = self._continueUpload(opts.fileId);                                                           // 999
                                                                                                                       //
        if (!_continueUpload) {                                                                                        // 1000
          throw new Meteor.Error(408, 'Can\'t continue upload, session expired. Start upload again.');                 // 1001
        }                                                                                                              // 1395
                                                                                                                       //
        this.unblock();                                                                                                // 1003
        ref = self._prepareUpload(_.extend(opts, _continueUpload), this.userId, 'DDP'), result = ref.result, opts = ref.opts;
                                                                                                                       //
        if (opts.eof) {                                                                                                // 1006
          try {                                                                                                        // 1007
            return Meteor.wrapAsync(self._handleUpload.bind(self, result, opts))();                                    // 1008
          } catch (error1) {                                                                                           // 1007
            e = error1;                                                                                                // 1009
                                                                                                                       //
            if (self.debug) {                                                                                          // 1010
              console.warn("[FilesCollection] [Write Method] [DDP] Exception:", e);                                    // 1010
            }                                                                                                          // 1405
                                                                                                                       //
            throw e;                                                                                                   // 1011
          }                                                                                                            // 1006
        } else {                                                                                                       // 1006
          self.emit('_handleUpload', result, opts, NOOP);                                                              // 1013
        }                                                                                                              // 1410
                                                                                                                       //
        return true;                                                                                                   // 1014
      };                                                                                                               // 982
                                                                                                                       //
      _methods[self._methodNames._Abort] = function (_id) {                                                            // 1021
        var _continueUpload, ref, ref1, ref2;                                                                          // 1022
                                                                                                                       //
        check(_id, String);                                                                                            // 1022
        _continueUpload = self._continueUpload(_id);                                                                   // 1024
                                                                                                                       //
        if (self.debug) {                                                                                              // 1025
          console.info("[FilesCollection] [Abort Method]: " + _id + " - " + (_continueUpload != null ? (ref = _continueUpload.file) != null ? ref.path : void 0 : void 0));
        }                                                                                                              // 1419
                                                                                                                       //
        if ((ref1 = self._currentUploads) != null ? ref1[_id] : void 0) {                                              // 1027
          self._currentUploads[_id].stop();                                                                            // 1028
                                                                                                                       //
          self._currentUploads[_id].abort();                                                                           // 1029
        }                                                                                                              // 1423
                                                                                                                       //
        if (_continueUpload) {                                                                                         // 1031
          self._preCollection.remove({                                                                                 // 1032
            _id: _id                                                                                                   // 1032
          });                                                                                                          // 1032
                                                                                                                       //
          self.remove({                                                                                                // 1033
            _id: _id                                                                                                   // 1033
          });                                                                                                          // 1033
                                                                                                                       //
          if (_continueUpload != null ? (ref2 = _continueUpload.file) != null ? ref2.path : void 0 : void 0) {         // 1034
            self.unlink({                                                                                              // 1034
              _id: _id,                                                                                                // 1034
              path: _continueUpload.file.path                                                                          // 1034
            });                                                                                                        // 1034
          }                                                                                                            // 1031
        }                                                                                                              // 1437
                                                                                                                       //
        return true;                                                                                                   // 1035
      };                                                                                                               // 1021
                                                                                                                       //
      Meteor.methods(_methods);                                                                                        // 1037
    }                                                                                                                  // 1441
  } /*                                                                                                                 // 498
    @locus Server                                                                                                      //
    @memberOf FilesCollection                                                                                          //
    @name _prepareUpload                                                                                               //
    @summary Internal method. Used to optimize received data and check upload permission                               //
    @returns {Object}                                                                                                  //
     */                                                                                                                //
                                                                                                                       //
  FilesCollection.prototype._prepareUpload = Meteor.isServer ? function (opts, userId, transport) {                    // 1453
    var base, ctx, extension, extensionWithDot, fileName, isUploadAllowed, ref, result;                                // 1047
                                                                                                                       //
    if (opts.eof == null) {                                                                                            // 1455
      opts.eof = false;                                                                                                // 1047
    }                                                                                                                  // 1457
                                                                                                                       //
    if (opts.binData == null) {                                                                                        // 1458
      opts.binData = 'EOF';                                                                                            // 1048
    }                                                                                                                  // 1460
                                                                                                                       //
    if (opts.chunkId == null) {                                                                                        // 1461
      opts.chunkId = -1;                                                                                               // 1049
    }                                                                                                                  // 1463
                                                                                                                       //
    if (opts.FSName == null) {                                                                                         // 1464
      opts.FSName = opts.fileId;                                                                                       // 1050
    }                                                                                                                  // 1466
                                                                                                                       //
    if ((base = opts.file).meta == null) {                                                                             // 1467
      base.meta = {};                                                                                                  // 1468
    }                                                                                                                  // 1469
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1053
      console.info("[FilesCollection] [Upload] [" + transport + "] Got #" + opts.chunkId + "/" + opts.fileLength + " chunks, dst: " + (opts.file.name || opts.file.fileName));
    }                                                                                                                  // 1472
                                                                                                                       //
    fileName = this._getFileName(opts.file);                                                                           // 1055
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  // 1056
    result = opts.file;                                                                                                // 1058
    result.name = fileName;                                                                                            // 1059
    result.meta = opts.file.meta;                                                                                      // 1060
    result.extension = extension;                                                                                      // 1061
    result.ext = extension;                                                                                            // 1062
    result._id = opts.fileId;                                                                                          // 1063
    result.userId = userId || null;                                                                                    // 1064
    opts.FSName = opts.FSName.replace(/([^a-z0-9\-\_]+)/gi, '-');                                                      // 1065
    result.path = "" + this.storagePath(result) + nodePath.sep + opts.FSName + extensionWithDot;                       // 1066
    result = _.extend(result, this._dataToSchema(result));                                                             // 1067
                                                                                                                       //
    if (this.onBeforeUpload && _.isFunction(this.onBeforeUpload)) {                                                    // 1069
      ctx = _.extend({                                                                                                 // 1070
        file: opts.file                                                                                                // 1071
      }, {                                                                                                             // 1070
        chunkId: opts.chunkId,                                                                                         // 1073
        userId: result.userId,                                                                                         // 1074
        user: function () {                                                                                            // 1075
          if (Meteor.users && result.userId) {                                                                         // 1075
            return Meteor.users.findOne(result.userId);                                                                // 1493
          } else {                                                                                                     // 1075
            return null;                                                                                               // 1495
          }                                                                                                            // 1496
        },                                                                                                             // 1072
        eof: opts.eof                                                                                                  // 1076
      });                                                                                                              // 1072
      isUploadAllowed = this.onBeforeUpload.call(ctx, result);                                                         // 1078
                                                                                                                       //
      if (isUploadAllowed !== true) {                                                                                  // 1080
        throw new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : '@onBeforeUpload() returned false');
      } else {                                                                                                         // 1080
        if (opts.___s === true && this.onInitiateUpload && _.isFunction(this.onInitiateUpload)) {                      // 1083
          this.onInitiateUpload.call(ctx, result);                                                                     // 1084
        }                                                                                                              // 1080
      }                                                                                                                // 1069
    } else if (opts.___s === true && this.onInitiateUpload && _.isFunction(this.onInitiateUpload)) {                   // 1069
      ctx = _.extend({                                                                                                 // 1086
        file: opts.file                                                                                                // 1087
      }, {                                                                                                             // 1086
        chunkId: opts.chunkId,                                                                                         // 1089
        userId: result.userId,                                                                                         // 1090
        user: function () {                                                                                            // 1091
          if (Meteor.users && result.userId) {                                                                         // 1091
            return Meteor.users.findOne(result.userId);                                                                // 1516
          } else {                                                                                                     // 1091
            return null;                                                                                               // 1518
          }                                                                                                            // 1519
        },                                                                                                             // 1088
        eof: opts.eof                                                                                                  // 1092
      });                                                                                                              // 1088
      this.onInitiateUpload.call(ctx, result);                                                                         // 1094
    }                                                                                                                  // 1524
                                                                                                                       //
    return {                                                                                                           // 1096
      result: result,                                                                                                  // 1096
      opts: opts                                                                                                       // 1096
    };                                                                                                                 // 1096
  } : void 0; /*                                                                                                       // 1046
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name _finishUpload                                                                                      //
              @summary Internal method. Finish upload, close Writable stream, add record to MongoDB and flush used memory
              @returns {undefined}                                                                                     //
               */                                                                                                      //
  FilesCollection.prototype._finishUpload = Meteor.isServer ? function (result, opts, cb) {                            // 1540
    var self;                                                                                                          // 1107
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1107
      console.info("[FilesCollection] [Upload] [finish(ing)Upload] -> " + result.path);                                // 1107
    }                                                                                                                  // 1544
                                                                                                                       //
    fs.chmod(result.path, this.permissions, NOOP);                                                                     // 1108
    self = this;                                                                                                       // 1109
    result.type = this._getMimeType(opts.file);                                                                        // 1110
    result["public"] = this["public"];                                                                                 // 1111
                                                                                                                       //
    this._updateFileTypes(result);                                                                                     // 1112
                                                                                                                       //
    this.collection.insert(_.clone(result), function (error, _id) {                                                    // 1114
      if (error) {                                                                                                     // 1115
        cb && cb(error);                                                                                               // 1116
                                                                                                                       //
        if (self.debug) {                                                                                              // 1117
          console.error('[FilesCollection] [Upload] [_finishUpload] Error:', error);                                   // 1117
        }                                                                                                              // 1115
      } else {                                                                                                         // 1115
        self._preCollection.update({                                                                                   // 1119
          _id: opts.fileId                                                                                             // 1119
        }, {                                                                                                           // 1119
          $set: {                                                                                                      // 1119
            isFinished: true                                                                                           // 1119
          }                                                                                                            // 1119
        });                                                                                                            // 1119
                                                                                                                       //
        result._id = _id;                                                                                              // 1120
                                                                                                                       //
        if (self.debug) {                                                                                              // 1121
          console.info("[FilesCollection] [Upload] [finish(ed)Upload] -> " + result.path);                             // 1121
        }                                                                                                              // 1567
                                                                                                                       //
        self.onAfterUpload && self.onAfterUpload.call(self, result);                                                   // 1122
        self.emit('afterUpload', result);                                                                              // 1123
        cb && cb(null, result);                                                                                        // 1124
      }                                                                                                                // 1571
    });                                                                                                                // 1114
  } : void 0; /*                                                                                                       // 1106
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name _handleUpload                                                                                      //
              @summary Internal method to handle upload process, pipe incoming data to Writable stream                 //
              @returns {undefined}                                                                                     //
               */                                                                                                      //
  FilesCollection.prototype._handleUpload = Meteor.isServer ? function (result, opts, cb) {                            // 1584
    var e, self;                                                                                                       // 1137
                                                                                                                       //
    try {                                                                                                              // 1137
      if (opts.eof) {                                                                                                  // 1138
        self = this;                                                                                                   // 1139
                                                                                                                       //
        this._currentUploads[result._id].end(function () {                                                             // 1140
          return bound(function () {                                                                                   // 1590
            self.emit('_finishUpload', result, opts, cb);                                                              // 1141
          });                                                                                                          // 1140
        });                                                                                                            // 1140
      } else {                                                                                                         // 1138
        this._currentUploads[result._id].write(opts.chunkId, opts.binData, cb);                                        // 1144
      }                                                                                                                // 1137
    } catch (error1) {                                                                                                 // 1137
      e = error1;                                                                                                      // 1145
                                                                                                                       //
      if (this.debug) {                                                                                                // 1146
        console.warn("[_handleUpload] [EXCEPTION:]", e);                                                               // 1146
      }                                                                                                                // 1601
                                                                                                                       //
      cb && cb(e);                                                                                                     // 1147
    }                                                                                                                  // 1603
  } : void 0; /*                                                                                                       // 1136
              @locus Anywhere                                                                                          //
              @memberOf FilesCollection                                                                                //
              @name _getMimeType                                                                                       //
              @param {Object} fileData - File Object                                                                   //
              @summary Returns file's mime-type                                                                        //
              @returns {String}                                                                                        //
               */                                                                                                      //
                                                                                                                       //
  FilesCollection.prototype._getMimeType = function (fileData) {                                                       // 1616
    var br, buf, error, ext, fd, mime, ref;                                                                            // 1160
    check(fileData, Object);                                                                                           // 1160
                                                                                                                       //
    if (fileData != null ? fileData.type : void 0) {                                                                   // 1161
      mime = fileData.type;                                                                                            // 1161
    }                                                                                                                  // 1621
                                                                                                                       //
    if (Meteor.isServer && fileData.path && (!mime || !_.isString(mime))) {                                            // 1162
      try {                                                                                                            // 1163
        buf = new Buffer(262);                                                                                         // 1164
        fd = fs.openSync(fileData.path, 'r');                                                                          // 1165
        br = fs.readSync(fd, buf, 0, 262, 0);                                                                          // 1166
        fs.close(fd, NOOP);                                                                                            // 1167
                                                                                                                       //
        if (br < 262) {                                                                                                // 1168
          buf = buf.slice(0, br);                                                                                      // 1168
        }                                                                                                              // 1630
                                                                                                                       //
        ref = fileType(buf), mime = ref.mime, ext = ref.ext;                                                           // 1169
      } catch (error1) {                                                                                               // 1163
        error = error1;                                                                                                // 1170
      }                                                                                                                // 1162
    }                                                                                                                  // 1635
                                                                                                                       //
    if (!mime || !_.isString(mime)) {                                                                                  // 1171
      mime = 'application/octet-stream';                                                                               // 1172
    }                                                                                                                  // 1638
                                                                                                                       //
    return mime;                                                                                                       // 1173
  }; /*                                                                                                                // 1159
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _getFileName                                                                                                //
     @param {Object} fileData - File Object                                                                            //
     @summary Returns file's name                                                                                      //
     @returns {String}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._getFileName = function (fileData) {                                                       // 1652
    var fileName;                                                                                                      // 1184
    fileName = fileData.name || fileData.fileName;                                                                     // 1184
                                                                                                                       //
    if (_.isString(fileName) && fileName.length > 0) {                                                                 // 1185
      return (fileData.name || fileData.fileName).replace(/\.\./g, '').replace(/\//g, '');                             // 1186
    } else {                                                                                                           // 1185
      return '';                                                                                                       // 1188
    }                                                                                                                  // 1659
  }; /*                                                                                                                // 1183
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _getUser                                                                                                    //
     @summary Returns object with `userId` and `user()` method which return user's object                              //
     @returns {Object}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._getUser = function (http) {                                                               // 1671
    var cookie, mtok, ref, ref1, result, userId;                                                                       // 1198
    result = {                                                                                                         // 1198
      user: function () {                                                                                              // 1199
        return null;                                                                                                   // 1199
      },                                                                                                               // 1199
      userId: null                                                                                                     // 1200
    };                                                                                                                 // 1199
                                                                                                                       //
    if (Meteor.isServer) {                                                                                             // 1202
      if (http) {                                                                                                      // 1203
        mtok = null;                                                                                                   // 1204
                                                                                                                       //
        if (http.request.headers['x-mtok']) {                                                                          // 1205
          mtok = http.request.headers['x-mtok'];                                                                       // 1206
        } else {                                                                                                       // 1205
          cookie = http.request.Cookies;                                                                               // 1208
                                                                                                                       //
          if (cookie.has('x_mtok')) {                                                                                  // 1209
            mtok = cookie.get('x_mtok');                                                                               // 1210
          }                                                                                                            // 1205
        }                                                                                                              // 1689
                                                                                                                       //
        if (mtok) {                                                                                                    // 1212
          userId = (ref = Meteor.server.sessions) != null ? (ref1 = ref[mtok]) != null ? ref1.userId : void 0 : void 0;
                                                                                                                       //
          if (userId) {                                                                                                // 1214
            result.user = function () {                                                                                // 1215
              return Meteor.users.findOne(userId);                                                                     // 1694
            };                                                                                                         // 1215
                                                                                                                       //
            result.userId = userId;                                                                                    // 1216
          }                                                                                                            // 1212
        }                                                                                                              // 1203
      }                                                                                                                // 1202
    } else {                                                                                                           // 1202
      if (typeof Meteor.userId === "function" ? Meteor.userId() : void 0) {                                            // 1218
        result.user = function () {                                                                                    // 1219
          return Meteor.user();                                                                                        // 1219
        };                                                                                                             // 1219
                                                                                                                       //
        result.userId = Meteor.userId();                                                                               // 1220
      }                                                                                                                // 1202
    }                                                                                                                  // 1707
                                                                                                                       //
    return result;                                                                                                     // 1222
  }; /*                                                                                                                // 1197
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _getExt                                                                                                     //
     @param {String} FileName - File name                                                                              //
     @summary Get extension from FileName                                                                              //
     @returns {Object}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._getExt = function (fileName) {                                                            // 1721
    var extension;                                                                                                     // 1233
                                                                                                                       //
    if (!!~fileName.indexOf('.')) {                                                                                    // 1233
      extension = (fileName.split('.').pop().split('?')[0] || '').toLowerCase();                                       // 1234
      return {                                                                                                         // 1235
        ext: extension,                                                                                                // 1235
        extension: extension,                                                                                          // 1235
        extensionWithDot: '.' + extension                                                                              // 1235
      };                                                                                                               // 1235
    } else {                                                                                                           // 1233
      return {                                                                                                         // 1237
        ext: '',                                                                                                       // 1237
        extension: '',                                                                                                 // 1237
        extensionWithDot: ''                                                                                           // 1237
      };                                                                                                               // 1237
    }                                                                                                                  // 1736
  }; /*                                                                                                                // 1232
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _updateFileTypes                                                                                            //
     @param {Object} data - File data                                                                                  //
     @summary Internal method. Classify file based on 'type' field                                                     //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._updateFileTypes = function (data) {                                                       // 1748
    data.isVideo = /^video\//i.test(data.type);                                                                        // 1247
    data.isAudio = /^audio\//i.test(data.type);                                                                        // 1248
    data.isImage = /^image\//i.test(data.type);                                                                        // 1249
    data.isText = /^text\//i.test(data.type);                                                                          // 1250
    data.isJSON = /^application\/json$/i.test(data.type);                                                              // 1251
    data.isPDF = /^application\/(x-)?pdf$/i.test(data.type);                                                           // 1252
  }; /*                                                                                                                // 1246
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _dataToSchema                                                                                               //
     @param {Object} data - File data                                                                                  //
     @summary Internal method. Build object in accordance with default schema from File data                           //
     @returns {Object}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._dataToSchema = function (data) {                                                          // 1767
    var ds;                                                                                                            // 1264
    ds = {                                                                                                             // 1264
      name: data.name,                                                                                                 // 1265
      extension: data.extension,                                                                                       // 1266
      path: data.path,                                                                                                 // 1267
      meta: data.meta,                                                                                                 // 1268
      type: data.type,                                                                                                 // 1269
      size: data.size,                                                                                                 // 1270
      userId: data.userId || null,                                                                                     // 1271
      versions: {                                                                                                      // 1272
        original: {                                                                                                    // 1273
          path: data.path,                                                                                             // 1274
          size: data.size,                                                                                             // 1275
          type: data.type,                                                                                             // 1276
          extension: data.extension                                                                                    // 1277
        }                                                                                                              // 1274
      },                                                                                                               // 1273
      _downloadRoute: data._downloadRoute || this.downloadRoute,                                                       // 1278
      _collectionName: data._collectionName || this.collectionName                                                     // 1279
    };                                                                                                                 // 1265
                                                                                                                       //
    if (data.fileId) {                                                                                                 // 1282
      ds._id = data.fileId;                                                                                            // 1283
    }                                                                                                                  // 1790
                                                                                                                       //
    this._updateFileTypes(ds);                                                                                         // 1285
                                                                                                                       //
    ds._storagePath = data._storagePath || this.storagePath(_.extend(data, ds));                                       // 1286
    return ds;                                                                                                         // 1287
  }; /*                                                                                                                // 1263
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
  FilesCollection.prototype.write = Meteor.isServer ? function (buffer, opts, callback, proceedAfterUpload) {          // 1814
    var FSName, extension, extensionWithDot, fileId, fileName, ref, result, self, stream;                              // 1306
                                                                                                                       //
    if (opts == null) {                                                                                                // 1816
      opts = {};                                                                                                       // 1305
    }                                                                                                                  // 1818
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1306
      console.info('[FilesCollection] [write()]');                                                                     // 1306
    }                                                                                                                  // 1821
                                                                                                                       //
    if (_.isFunction(opts)) {                                                                                          // 1308
      proceedAfterUpload = callback;                                                                                   // 1309
      callback = opts;                                                                                                 // 1310
      opts = {};                                                                                                       // 1311
    } else if (_.isBoolean(callback)) {                                                                                // 1308
      proceedAfterUpload = callback;                                                                                   // 1313
    } else if (_.isBoolean(opts)) {                                                                                    // 1312
      proceedAfterUpload = opts;                                                                                       // 1315
    }                                                                                                                  // 1830
                                                                                                                       //
    check(opts, Match.Optional(Object));                                                                               // 1317
    check(callback, Match.Optional(Function));                                                                         // 1318
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                // 1319
    fileId = opts.fileId || Random.id();                                                                               // 1321
    FSName = this.namingFunction ? this.namingFunction(opts) : fileId;                                                 // 1322
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : FSName;                                       // 1323
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  // 1325
    self = this;                                                                                                       // 1327
                                                                                                                       //
    if (opts == null) {                                                                                                // 1839
      opts = {};                                                                                                       // 1328
    }                                                                                                                  // 1841
                                                                                                                       //
    opts.path = "" + this.storagePath(opts) + nodePath.sep + FSName + extensionWithDot;                                // 1329
    opts.type = this._getMimeType(opts);                                                                               // 1330
                                                                                                                       //
    if (opts.meta == null) {                                                                                           // 1844
      opts.meta = {};                                                                                                  // 1331
    }                                                                                                                  // 1846
                                                                                                                       //
    if (opts.size == null) {                                                                                           // 1847
      opts.size = buffer.length;                                                                                       // 1332
    }                                                                                                                  // 1849
                                                                                                                       //
    result = this._dataToSchema({                                                                                      // 1334
      name: fileName,                                                                                                  // 1335
      path: opts.path,                                                                                                 // 1336
      meta: opts.meta,                                                                                                 // 1337
      type: opts.type,                                                                                                 // 1338
      size: opts.size,                                                                                                 // 1339
      userId: opts.userId,                                                                                             // 1340
      extension: extension                                                                                             // 1341
    });                                                                                                                // 1335
    result._id = fileId;                                                                                               // 1343
    stream = fs.createWriteStream(opts.path, {                                                                         // 1345
      flags: 'w',                                                                                                      // 1345
      mode: this.permissions                                                                                           // 1345
    });                                                                                                                // 1345
    stream.end(buffer, function (error) {                                                                              // 1346
      return bound(function () {                                                                                       // 1865
        if (error) {                                                                                                   // 1347
          callback && callback(error);                                                                                 // 1348
        } else {                                                                                                       // 1347
          self.collection.insert(result, function (error, _id) {                                                       // 1350
            var fileRef;                                                                                               // 1351
                                                                                                                       //
            if (error) {                                                                                               // 1351
              callback && callback(error);                                                                             // 1352
                                                                                                                       //
              if (self.debug) {                                                                                        // 1353
                console.warn("[FilesCollection] [write] [insert] Error: " + fileName + " -> " + self.collectionName, error);
              }                                                                                                        // 1351
            } else {                                                                                                   // 1351
              fileRef = self.collection.findOne(_id);                                                                  // 1355
              callback && callback(null, fileRef);                                                                     // 1356
                                                                                                                       //
              if (proceedAfterUpload === true) {                                                                       // 1357
                self.onAfterUpload && self.onAfterUpload.call(self, fileRef);                                          // 1358
                self.emit('afterUpload', fileRef);                                                                     // 1359
              }                                                                                                        // 1882
                                                                                                                       //
              if (self.debug) {                                                                                        // 1360
                console.info("[FilesCollection] [write]: " + fileName + " -> " + self.collectionName);                 // 1360
              }                                                                                                        // 1351
            }                                                                                                          // 1886
          });                                                                                                          // 1350
        }                                                                                                              // 1888
      });                                                                                                              // 1346
    });                                                                                                                // 1346
    return this;                                                                                                       // 1363
  } : void 0; /*                                                                                                       // 1305
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
  FilesCollection.prototype.load = Meteor.isServer ? function (url, opts, callback, proceedAfterUpload) {              // 1912
    var FSName, extension, extensionWithDot, fileId, fileName, pathParts, ref, self, storeResult;                      // 1384
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1384
      console.info("[FilesCollection] [load(" + url + ", " + JSON.stringify(opts) + ", callback)]");                   // 1384
    }                                                                                                                  // 1916
                                                                                                                       //
    if (_.isFunction(opts)) {                                                                                          // 1386
      proceedAfterUpload = callback;                                                                                   // 1387
      callback = opts;                                                                                                 // 1388
      opts = {};                                                                                                       // 1389
    } else if (_.isBoolean(callback)) {                                                                                // 1386
      proceedAfterUpload = callback;                                                                                   // 1391
    } else if (_.isBoolean(opts)) {                                                                                    // 1390
      proceedAfterUpload = opts;                                                                                       // 1393
    }                                                                                                                  // 1925
                                                                                                                       //
    check(url, String);                                                                                                // 1395
    check(opts, Match.Optional(Object));                                                                               // 1396
    check(callback, Match.Optional(Function));                                                                         // 1397
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                // 1398
    self = this;                                                                                                       // 1400
                                                                                                                       //
    if (opts == null) {                                                                                                // 1931
      opts = {};                                                                                                       // 1401
    }                                                                                                                  // 1933
                                                                                                                       //
    fileId = opts.fileId || Random.id();                                                                               // 1402
    FSName = this.namingFunction ? this.namingFunction(opts) : fileId;                                                 // 1403
    pathParts = url.split('/');                                                                                        // 1404
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : pathParts[pathParts.length - 1] || FSName;    // 1405
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  // 1407
                                                                                                                       //
    if (opts.meta == null) {                                                                                           // 1939
      opts.meta = {};                                                                                                  // 1408
    }                                                                                                                  // 1941
                                                                                                                       //
    opts.path = "" + this.storagePath(opts) + nodePath.sep + FSName + extensionWithDot;                                // 1409
                                                                                                                       //
    storeResult = function (result, callback) {                                                                        // 1411
      result._id = fileId;                                                                                             // 1412
      self.collection.insert(result, function (error, _id) {                                                           // 1414
        var fileRef;                                                                                                   // 1415
                                                                                                                       //
        if (error) {                                                                                                   // 1415
          callback && callback(error);                                                                                 // 1416
                                                                                                                       //
          if (self.debug) {                                                                                            // 1417
            console.error("[FilesCollection] [load] [insert] Error: " + fileName + " -> " + self.collectionName, error);
          }                                                                                                            // 1415
        } else {                                                                                                       // 1415
          fileRef = self.collection.findOne(_id);                                                                      // 1419
          callback && callback(null, fileRef);                                                                         // 1420
                                                                                                                       //
          if (proceedAfterUpload === true) {                                                                           // 1421
            self.onAfterUpload && self.onAfterUpload.call(self, fileRef);                                              // 1422
            self.emit('afterUpload', fileRef);                                                                         // 1423
          }                                                                                                            // 1958
                                                                                                                       //
          if (self.debug) {                                                                                            // 1424
            console.info("[FilesCollection] [load] [insert] " + fileName + " -> " + self.collectionName);              // 1424
          }                                                                                                            // 1415
        }                                                                                                              // 1962
      });                                                                                                              // 1414
    };                                                                                                                 // 1411
                                                                                                                       //
    request.get(url).on('error', function (error) {                                                                    // 1428
      return bound(function () {                                                                                       // 1966
        callback && callback(error);                                                                                   // 1429
                                                                                                                       //
        if (self.debug) {                                                                                              // 1430
          return console.error("[FilesCollection] [load] [request.get(" + url + ")] Error:", error);                   // 1969
        }                                                                                                              // 1970
      });                                                                                                              // 1428
    }).on('response', function (response) {                                                                            // 1428
      return bound(function () {                                                                                       // 1973
        response.on('end', function () {                                                                               // 1432
          return bound(function () {                                                                                   // 1975
            var result;                                                                                                // 1433
                                                                                                                       //
            if (self.debug) {                                                                                          // 1433
              console.info("[FilesCollection] [load] Received: " + url);                                               // 1433
            }                                                                                                          // 1979
                                                                                                                       //
            result = self._dataToSchema({                                                                              // 1434
              name: fileName,                                                                                          // 1435
              path: opts.path,                                                                                         // 1436
              meta: opts.meta,                                                                                         // 1437
              type: opts.type || response.headers['content-type'] || self._getMimeType({                               // 1438
                path: opts.path                                                                                        // 1438
              }),                                                                                                      // 1438
              size: opts.size || parseInt(response.headers['content-length'] || 0),                                    // 1439
              userId: opts.userId,                                                                                     // 1440
              extension: extension                                                                                     // 1441
            });                                                                                                        // 1435
                                                                                                                       //
            if (!result.size) {                                                                                        // 1443
              fs.stat(opts.path, function (error, stats) {                                                             // 1444
                return bound(function () {                                                                             // 1993
                  if (error) {                                                                                         // 1445
                    callback && callback(error);                                                                       // 1446
                  } else {                                                                                             // 1445
                    result.versions.original.size = result.size = stats.size;                                          // 1448
                    storeResult(result, callback);                                                                     // 1449
                  }                                                                                                    // 1999
                });                                                                                                    // 1444
              });                                                                                                      // 1444
            } else {                                                                                                   // 1443
              storeResult(result, callback);                                                                           // 1452
            }                                                                                                          // 2004
          });                                                                                                          // 1432
        });                                                                                                            // 1432
      });                                                                                                              // 1431
    }).pipe(fs.createWriteStream(opts.path, {                                                                          // 1428
      flags: 'w',                                                                                                      // 1456
      mode: this.permissions                                                                                           // 1456
    }));                                                                                                               // 1456
    return this;                                                                                                       // 1458
  } : void 0; /*                                                                                                       // 1383
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
  FilesCollection.prototype.addFile = Meteor.isServer ? function (path, opts, callback, proceedAfterUpload) {          // 2032
    var self;                                                                                                          // 1478
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1478
      console.info("[FilesCollection] [addFile(" + path + ")]");                                                       // 1478
    }                                                                                                                  // 2036
                                                                                                                       //
    if (_.isFunction(opts)) {                                                                                          // 1480
      proceedAfterUpload = callback;                                                                                   // 1481
      callback = opts;                                                                                                 // 1482
      opts = {};                                                                                                       // 1483
    } else if (_.isBoolean(callback)) {                                                                                // 1480
      proceedAfterUpload = callback;                                                                                   // 1485
    } else if (_.isBoolean(opts)) {                                                                                    // 1484
      proceedAfterUpload = opts;                                                                                       // 1487
    }                                                                                                                  // 2045
                                                                                                                       //
    if (this["public"]) {                                                                                              // 1489
      throw new Meteor.Error(403, 'Can not run [addFile] on public collection! Just Move file to root of your server, then add record to Collection');
    }                                                                                                                  // 2048
                                                                                                                       //
    check(path, String);                                                                                               // 1490
    check(opts, Match.Optional(Object));                                                                               // 1491
    check(callback, Match.Optional(Function));                                                                         // 1492
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                // 1493
    self = this;                                                                                                       // 1495
    fs.stat(path, function (error, stats) {                                                                            // 1496
      return bound(function () {                                                                                       // 2055
        var extension, extensionWithDot, pathParts, ref, result;                                                       // 1497
                                                                                                                       //
        if (error) {                                                                                                   // 1497
          callback && callback(error);                                                                                 // 1498
        } else if (stats.isFile()) {                                                                                   // 1497
          if (opts == null) {                                                                                          // 2060
            opts = {};                                                                                                 // 1500
          }                                                                                                            // 2062
                                                                                                                       //
          opts.path = path;                                                                                            // 1501
                                                                                                                       //
          if (!opts.fileName) {                                                                                        // 1503
            pathParts = path.split(nodePath.sep);                                                                      // 1504
            opts.fileName = pathParts[pathParts.length - 1];                                                           // 1505
          }                                                                                                            // 2067
                                                                                                                       //
          ref = self._getExt(opts.fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;       // 1507
                                                                                                                       //
          if (opts.type == null) {                                                                                     // 2069
            opts.type = self._getMimeType(opts);                                                                       // 1509
          }                                                                                                            // 2071
                                                                                                                       //
          if (opts.meta == null) {                                                                                     // 2072
            opts.meta = {};                                                                                            // 1510
          }                                                                                                            // 2074
                                                                                                                       //
          if (opts.size == null) {                                                                                     // 2075
            opts.size = stats.size;                                                                                    // 1511
          }                                                                                                            // 2077
                                                                                                                       //
          result = self._dataToSchema({                                                                                // 1513
            name: opts.fileName,                                                                                       // 1514
            path: path,                                                                                                // 1515
            meta: opts.meta,                                                                                           // 1516
            type: opts.type,                                                                                           // 1517
            size: opts.size,                                                                                           // 1518
            userId: opts.userId,                                                                                       // 1519
            extension: extension,                                                                                      // 1520
            _storagePath: path.replace("" + nodePath.sep + opts.fileName, ''),                                         // 1521
            fileId: opts.fileId || null                                                                                // 1522
          });                                                                                                          // 1514
          self.collection.insert(result, function (error, _id) {                                                       // 1525
            var fileRef;                                                                                               // 1526
                                                                                                                       //
            if (error) {                                                                                               // 1526
              callback && callback(error);                                                                             // 1527
                                                                                                                       //
              if (self.debug) {                                                                                        // 1528
                console.warn("[FilesCollection] [addFile] [insert] Error: " + result.name + " -> " + self.collectionName, error);
              }                                                                                                        // 1526
            } else {                                                                                                   // 1526
              fileRef = self.collection.findOne(_id);                                                                  // 1530
              callback && callback(null, fileRef);                                                                     // 1531
                                                                                                                       //
              if (proceedAfterUpload === true) {                                                                       // 1532
                self.onAfterUpload && self.onAfterUpload.call(self, fileRef);                                          // 1533
                self.emit('afterUpload', fileRef);                                                                     // 1534
              }                                                                                                        // 2102
                                                                                                                       //
              if (self.debug) {                                                                                        // 1535
                console.info("[FilesCollection] [addFile]: " + result.name + " -> " + self.collectionName);            // 1535
              }                                                                                                        // 1526
            }                                                                                                          // 2106
          });                                                                                                          // 1525
        } else {                                                                                                       // 1499
          callback && callback(new Meteor.Error(400, "[FilesCollection] [addFile(" + path + ")]: File does not exist"));
        }                                                                                                              // 2110
      });                                                                                                              // 1496
    });                                                                                                                // 1496
    return this;                                                                                                       // 1541
  } : void 0; /*                                                                                                       // 1477
              @locus Anywhere                                                                                          //
              @memberOf FilesCollection                                                                                //
              @name findOne                                                                                            //
              @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)
              @param {Object} options - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#sortspecifiers)
              @summary Find and return Cursor for matching document Object                                             //
              @returns {FileCursor} Instance                                                                           //
               */                                                                                                      //
                                                                                                                       //
  FilesCollection.prototype.findOne = function (selector, options) {                                                   // 2127
    var doc;                                                                                                           // 1555
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1555
      console.info("[FilesCollection] [findOne(" + JSON.stringify(selector) + ", " + JSON.stringify(options) + ")]");  // 1555
    }                                                                                                                  // 2131
                                                                                                                       //
    check(selector, Match.Optional(Match.OneOf(Object, String, Boolean, Number, null)));                               // 1556
    check(options, Match.Optional(Object));                                                                            // 1557
                                                                                                                       //
    if (!arguments.length) {                                                                                           // 1559
      selector = {};                                                                                                   // 1559
    }                                                                                                                  // 2136
                                                                                                                       //
    doc = this.collection.findOne(selector, options);                                                                  // 1560
                                                                                                                       //
    if (doc) {                                                                                                         // 1561
      return new FileCursor(doc, this);                                                                                // 2139
    } else {                                                                                                           // 1561
      return doc;                                                                                                      // 2141
    }                                                                                                                  // 2142
  }; /*                                                                                                                // 1554
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name find                                                                                                        //
     @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)    //
     @param {Object}        options  - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#sortspecifiers)
     @summary Find and return Cursor for matching documents                                                            //
     @returns {FilesCursor} Instance                                                                                   //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.find = function (selector, options) {                                                      // 2156
    if (this.debug) {                                                                                                  // 1573
      console.info("[FilesCollection] [find(" + JSON.stringify(selector) + ", " + JSON.stringify(options) + ")]");     // 1573
    }                                                                                                                  // 2159
                                                                                                                       //
    check(selector, Match.Optional(Match.OneOf(Object, String, Boolean, Number, null)));                               // 1574
    check(options, Match.Optional(Object));                                                                            // 1575
                                                                                                                       //
    if (!arguments.length) {                                                                                           // 1577
      selector = {};                                                                                                   // 1577
    }                                                                                                                  // 2164
                                                                                                                       //
    return new FilesCursor(selector, options, this);                                                                   // 1578
  }; /*                                                                                                                // 1572
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
  FilesCollection.prototype.insert = Meteor.isClient ? function (config, autoStart) {                                  // 2202
    if (autoStart == null) {                                                                                           // 2203
      autoStart = true;                                                                                                // 1612
    }                                                                                                                  // 2205
                                                                                                                       //
    return new this._UploadInstance(config, this)[autoStart ? 'start' : 'manual']();                                   // 1613
  } : void 0; /*                                                                                                       // 1612
              @locus Client                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name _UploadInstance                                                                                    //
              @class UploadInstance                                                                                    //
              @summary Internal Class, used in upload                                                                  //
               */                                                                                                      //
  FilesCollection.prototype._UploadInstance = Meteor.isClient ? UploadInstance = function () {                         // 2218
    UploadInstance.prototype.__proto__ = EventEmitter.prototype;                                                       // 2219
                                                                                                                       //
    function UploadInstance(config1, collection) {                                                                     // 1625
      var _file, base, base1, base2, base3, base4, base5, self, wwError;                                               // 1626
                                                                                                                       //
      this.config = config1;                                                                                           // 1625
      this.collection = collection;                                                                                    // 1625
      EventEmitter.call(this);                                                                                         // 1626
                                                                                                                       //
      if (this.collection.debug) {                                                                                     // 1627
        console.info('[FilesCollection] [insert()]');                                                                  // 1627
      }                                                                                                                // 2228
                                                                                                                       //
      self = this;                                                                                                     // 1628
                                                                                                                       //
      if ((base = this.config).ddp == null) {                                                                          // 2230
        base.ddp = this.collection.ddp;                                                                                // 2231
      }                                                                                                                // 2232
                                                                                                                       //
      if ((base1 = this.config).meta == null) {                                                                        // 2233
        base1.meta = {};                                                                                               // 2234
      }                                                                                                                // 2235
                                                                                                                       //
      if ((base2 = this.config).streams == null) {                                                                     // 2236
        base2.streams = 2;                                                                                             // 2237
      }                                                                                                                // 2238
                                                                                                                       //
      if (this.config.streams < 1) {                                                                                   // 1632
        this.config.streams = 2;                                                                                       // 1632
      }                                                                                                                // 2241
                                                                                                                       //
      if ((base3 = this.config).transport == null) {                                                                   // 2242
        base3.transport = 'ddp';                                                                                       // 2243
      }                                                                                                                // 2244
                                                                                                                       //
      if ((base4 = this.config).chunkSize == null) {                                                                   // 2245
        base4.chunkSize = this.collection.chunkSize;                                                                   // 2246
      }                                                                                                                // 2247
                                                                                                                       //
      if ((base5 = this.config).allowWebWorkers == null) {                                                             // 2248
        base5.allowWebWorkers = true;                                                                                  // 2249
      }                                                                                                                // 2250
                                                                                                                       //
      this.config.transport = this.config.transport.toLowerCase();                                                     // 1636
      check(this.config, {                                                                                             // 1638
        file: Match.Any,                                                                                               // 1639
        fileName: Match.Optional(String),                                                                              // 1640
        meta: Match.Optional(Object),                                                                                  // 1641
        type: Match.Optional(String),                                                                                  // 1642
        onError: Match.Optional(Function),                                                                             // 1643
        onAbort: Match.Optional(Function),                                                                             // 1644
        streams: Match.OneOf('dynamic', Number),                                                                       // 1645
        onStart: Match.Optional(Function),                                                                             // 1646
        isBase64: Match.Optional(Boolean),                                                                             // 1647
        transport: Match.OneOf('http', 'ddp'),                                                                         // 1648
        chunkSize: Match.OneOf('dynamic', Number),                                                                     // 1649
        onUploaded: Match.Optional(Function),                                                                          // 1650
        onProgress: Match.Optional(Function),                                                                          // 1651
        onBeforeUpload: Match.Optional(Function),                                                                      // 1652
        allowWebWorkers: Boolean,                                                                                      // 1653
        ddp: Match.Any                                                                                                 // 1654
      });                                                                                                              // 1638
                                                                                                                       //
      if (!this.config.fileName && !this.config.file.name) {                                                           // 1657
        throw new Meteor.Error(400, '"fileName" must me specified for base64 upload!');                                // 1658
      }                                                                                                                // 2272
                                                                                                                       //
      if (this.config.isBase64 === true) {                                                                             // 1660
        check(this.config.file, String);                                                                               // 1661
                                                                                                                       //
        if (!!~this.config.file.indexOf('data:')) {                                                                    // 1662
          this.config.file = this.config.file.replace('data:', '');                                                    // 1663
        }                                                                                                              // 2277
                                                                                                                       //
        if (!!~this.config.file.indexOf(',')) {                                                                        // 1664
          _file = this.config.file.split(',');                                                                         // 1665
          this.fileData = {                                                                                            // 1666
            size: Math.floor(_file[1].replace(/\=/g, '').length / 4 * 3),                                              // 1667
            type: _file[0].split(';')[0],                                                                              // 1668
            name: this.config.fileName,                                                                                // 1669
            meta: this.config.meta                                                                                     // 1670
          };                                                                                                           // 1667
          this.config.file = _file[1];                                                                                 // 1671
        } else if (!this.config.type) {                                                                                // 1664
          throw new Meteor.Error(400, '"type" must me specified for base64 upload! And represent mime-type of the file');
        } else {                                                                                                       // 1672
          this.fileData = {                                                                                            // 1675
            size: Math.floor(this.config.file.replace(/\=/g, '').length / 4 * 3),                                      // 1676
            type: this.config.type,                                                                                    // 1677
            name: this.config.fileName,                                                                                // 1678
            meta: this.config.meta                                                                                     // 1679
          };                                                                                                           // 1676
        }                                                                                                              // 1660
      }                                                                                                                // 2297
                                                                                                                       //
      if (this.config.file) {                                                                                          // 1681
        if (!this.config.isBase64) {                                                                                   // 1682
          this.fileData = {                                                                                            // 1683
            size: this.config.file.size,                                                                               // 1684
            type: this.config.type || this.config.file.type,                                                           // 1685
            name: this.config.fileName || this.config.file.name,                                                       // 1686
            meta: this.config.meta                                                                                     // 1687
          };                                                                                                           // 1684
        }                                                                                                              // 2306
                                                                                                                       //
        if (this.collection.debug) {                                                                                   // 1689
          console.time('insert ' + this.fileData.name);                                                                // 1690
          console.time('loadFile ' + this.fileData.name);                                                              // 1691
        }                                                                                                              // 2310
                                                                                                                       //
        if (this.collection._supportWebWorker && this.config.allowWebWorkers) {                                        // 1693
          try {                                                                                                        // 1694
            this.worker = new Worker(this.collection._webWorkerUrl);                                                   // 1695
          } catch (error1) {                                                                                           // 1694
            wwError = error1;                                                                                          // 1696
            this.worker = false;                                                                                       // 1697
                                                                                                                       //
            if (this.collection.debug) {                                                                               // 1698
              console.warn('[FilesCollection] [insert] [create WebWorker]: Can\'t create WebWorker, fallback to MainThread', wwError);
            }                                                                                                          // 1694
          }                                                                                                            // 1693
        } else {                                                                                                       // 1693
          this.worker = null;                                                                                          // 1700
        }                                                                                                              // 2323
                                                                                                                       //
        this.startTime = {};                                                                                           // 1702
        this.config.debug = this.collection.debug;                                                                     // 1703
        this.currentChunk = 0;                                                                                         // 1704
        this.transferTime = 0;                                                                                         // 1705
        this.trackerComp = null;                                                                                       // 1706
        this.sentChunks = 0;                                                                                           // 1707
        this.fileLength = 1;                                                                                           // 1708
        this.EOFsent = false;                                                                                          // 1709
        this.fileId = Random.id();                                                                                     // 1710
        this.FSName = this.collection.namingFunction ? this.collection.namingFunction(this.fileData) : this.fileId;    // 1711
        this.pipes = [];                                                                                               // 1712
        this.fileData = _.extend(this.fileData, this.collection._getExt(self.fileData.name), {                         // 1714
          mime: this.collection._getMimeType(this.fileData)                                                            // 1714
        });                                                                                                            // 1714
        this.fileData['mime-type'] = this.fileData.mime;                                                               // 1715
        this.result = new this.collection._FileUpload(_.extend(self.config, {                                          // 1717
          fileData: this.fileData,                                                                                     // 1717
          fileId: this.fileId,                                                                                         // 1717
          _Abort: this.collection._methodNames._Abort                                                                  // 1717
        }));                                                                                                           // 1717
                                                                                                                       //
        this.beforeunload = function (e) {                                                                             // 1719
          var message;                                                                                                 // 1720
          message = _.isFunction(self.collection.onbeforeunloadMessage) ? self.collection.onbeforeunloadMessage.call(self.result, self.fileData) : self.collection.onbeforeunloadMessage;
                                                                                                                       //
          if (e) {                                                                                                     // 1721
            e.returnValue = message;                                                                                   // 1721
          }                                                                                                            // 2349
                                                                                                                       //
          return message;                                                                                              // 1722
        };                                                                                                             // 1719
                                                                                                                       //
        this.result.config.beforeunload = this.beforeunload;                                                           // 1723
        window.addEventListener('beforeunload', this.beforeunload, false);                                             // 1724
                                                                                                                       //
        this.result.config._onEnd = function () {                                                                      // 1726
          return self.emitEvent('_onEnd');                                                                             // 2355
        };                                                                                                             // 1726
                                                                                                                       //
        this.addListener('end', this.end);                                                                             // 1728
        this.addListener('start', this.start);                                                                         // 1729
        this.addListener('upload', this.upload);                                                                       // 1730
        this.addListener('sendEOF', this.sendEOF);                                                                     // 1731
        this.addListener('prepare', this.prepare);                                                                     // 1732
        this.addListener('sendChunk', this.sendChunk);                                                                 // 1733
        this.addListener('proceedChunk', this.proceedChunk);                                                           // 1734
        this.addListener('createStreams', this.createStreams);                                                         // 1735
        this.addListener('calculateStats', _.throttle(function () {                                                    // 1737
          var _t, progress;                                                                                            // 1738
                                                                                                                       //
          _t = self.transferTime / self.sentChunks / self.config.streams;                                              // 1738
          self.result.estimateTime.set(_t * (self.fileLength - self.sentChunks));                                      // 1739
          self.result.estimateSpeed.set(self.config.chunkSize / (_t / 1000));                                          // 1740
          progress = Math.round(self.sentChunks / self.fileLength * 100);                                              // 1741
          self.result.progress.set(progress);                                                                          // 1742
          self.config.onProgress && self.config.onProgress.call(self.result, progress, self.fileData);                 // 1743
          self.result.emitEvent('progress', [progress, self.fileData]);                                                // 1744
        }, 250));                                                                                                      // 1737
        this.addListener('_onEnd', function () {                                                                       // 1748
          if (self.result.estimateTimer) {                                                                             // 1749
            Meteor.clearInterval(self.result.estimateTimer);                                                           // 1749
          }                                                                                                            // 2378
                                                                                                                       //
          if (self.worker) {                                                                                           // 1750
            self.worker.terminate();                                                                                   // 1750
          }                                                                                                            // 2381
                                                                                                                       //
          if (self.trackerComp) {                                                                                      // 1751
            self.trackerComp.stop();                                                                                   // 1751
          }                                                                                                            // 2384
                                                                                                                       //
          if (self.beforeunload) {                                                                                     // 1752
            window.removeEventListener('beforeunload', self.beforeunload, false);                                      // 1752
          }                                                                                                            // 2387
                                                                                                                       //
          if (self.result) {                                                                                           // 1753
            return self.result.progress.set(0);                                                                        // 2389
          }                                                                                                            // 2390
        });                                                                                                            // 1748
      } else {                                                                                                         // 1681
        throw new Meteor.Error(500, '[FilesCollection] [insert] Have you forget to pass a File itself?');              // 1755
      }                                                                                                                // 2394
    }                                                                                                                  // 1625
                                                                                                                       //
    UploadInstance.prototype.end = function (error, data) {                                                            // 2397
      if (this.collection.debug) {                                                                                     // 1758
        console.timeEnd('insert ' + this.fileData.name);                                                               // 1758
      }                                                                                                                // 2400
                                                                                                                       //
      this.emitEvent('_onEnd');                                                                                        // 1759
      this.result.emitEvent('uploaded', [error, data]);                                                                // 1760
      this.config.onUploaded && this.config.onUploaded.call(this.result, error, data);                                 // 1761
                                                                                                                       //
      if (error) {                                                                                                     // 1762
        if (this.collection.debug) {                                                                                   // 1763
          console.error('[FilesCollection] [insert] [end] Error:', error);                                             // 1763
        }                                                                                                              // 2407
                                                                                                                       //
        this.result.abort();                                                                                           // 1764
        this.result.state.set('aborted');                                                                              // 1765
        this.result.emitEvent('error', [error, this.fileData]);                                                        // 1766
        this.config.onError && this.config.onError.call(this.result, error, this.fileData);                            // 1767
      } else {                                                                                                         // 1762
        this.result.state.set('completed');                                                                            // 1769
        this.collection.emitEvent('afterUpload', [data]);                                                              // 1770
      }                                                                                                                // 2415
                                                                                                                       //
      this.result.emitEvent('end', [error, data || this.fileData]);                                                    // 1771
      return this.result;                                                                                              // 1772
    };                                                                                                                 // 1757
                                                                                                                       //
    UploadInstance.prototype.sendChunk = function (evt) {                                                              // 2420
      var j, len, opts, p, pad, pipeFunc, ref, ref1, self;                                                             // 1775
      self = this;                                                                                                     // 1775
      opts = {                                                                                                         // 1776
        fileId: this.fileId,                                                                                           // 1777
        binData: evt.data.bin,                                                                                         // 1778
        chunkId: evt.data.chunkId                                                                                      // 1779
      };                                                                                                               // 1777
                                                                                                                       //
      if (this.config.isBase64) {                                                                                      // 1781
        pad = opts.binData.length % 4;                                                                                 // 1782
                                                                                                                       //
        if (pad) {                                                                                                     // 1783
          p = 0;                                                                                                       // 1784
                                                                                                                       //
          while (p < pad) {                                                                                            // 1785
            opts.binData += '=';                                                                                       // 1786
            p++;                                                                                                       // 1787
          }                                                                                                            // 1783
        }                                                                                                              // 1781
      }                                                                                                                // 2437
                                                                                                                       //
      this.emitEvent('data', [evt.data.bin]);                                                                          // 1789
                                                                                                                       //
      if (this.pipes.length) {                                                                                         // 1790
        ref = this.pipes;                                                                                              // 1791
                                                                                                                       //
        for (j = 0, len = ref.length; j < len; j++) {                                                                  // 1791
          pipeFunc = ref[j];                                                                                           // 2442
          opts.binData = pipeFunc(opts.binData);                                                                       // 1792
        }                                                                                                              // 1790
      }                                                                                                                // 2445
                                                                                                                       //
      if (this.fileLength === evt.data.chunkId) {                                                                      // 1794
        if (this.collection.debug) {                                                                                   // 1795
          console.timeEnd('loadFile ' + this.fileData.name);                                                           // 1795
        }                                                                                                              // 2449
                                                                                                                       //
        this.emitEvent('readEnd');                                                                                     // 1796
      }                                                                                                                // 2451
                                                                                                                       //
      if (opts.binData) {                                                                                              // 1798
        if (this.config.transport === 'ddp') {                                                                         // 1799
          this.config.ddp.call(this.collection._methodNames._Write, opts, function (error) {                           // 1800
            self.transferTime += +new Date() - self.startTime[opts.chunkId];                                           // 1801
                                                                                                                       //
            if (error) {                                                                                               // 1802
              if (self.result.state.get() !== 'aborted') {                                                             // 1803
                self.emitEvent('end', [error]);                                                                        // 1804
              }                                                                                                        // 1802
            } else {                                                                                                   // 1802
              ++self.sentChunks;                                                                                       // 1806
                                                                                                                       //
              if (self.sentChunks >= self.fileLength) {                                                                // 1807
                self.emitEvent('sendEOF');                                                                             // 1808
              } else if (self.currentChunk < self.fileLength) {                                                        // 1807
                self.emitEvent('upload');                                                                              // 1810
              }                                                                                                        // 2466
                                                                                                                       //
              self.emitEvent('calculateStats');                                                                        // 1811
            }                                                                                                          // 2468
          });                                                                                                          // 1800
        } else {                                                                                                       // 1799
          HTTP.call('POST', this.collection.downloadRoute + "/" + this.collection.collectionName + "/__upload", {      // 1814
            content: opts.binData,                                                                                     // 1815
            headers: {                                                                                                 // 1816
              'x-mtok': ((ref1 = Meteor.connection) != null ? ref1._lastSessionId : void 0) || null,                   // 1817
              'x-fileid': opts.fileId,                                                                                 // 1818
              'x-chunkid': opts.chunkId,                                                                               // 1819
              'content-type': 'text/plain'                                                                             // 1820
            }                                                                                                          // 1817
          }, function (error) {                                                                                        // 1814
            self.transferTime += +new Date() - self.startTime[opts.chunkId];                                           // 1822
                                                                                                                       //
            if (error) {                                                                                               // 1823
              if ("" + error === "Error: network") {                                                                   // 1824
                self.result.pause();                                                                                   // 1825
              } else {                                                                                                 // 1824
                if (self.result.state.get() !== 'aborted') {                                                           // 1827
                  self.emitEvent('end', [error]);                                                                      // 1828
                }                                                                                                      // 1824
              }                                                                                                        // 1823
            } else {                                                                                                   // 1823
              ++self.sentChunks;                                                                                       // 1830
                                                                                                                       //
              if (self.sentChunks >= self.fileLength) {                                                                // 1831
                self.emitEvent('sendEOF');                                                                             // 1832
              } else if (self.currentChunk < self.fileLength) {                                                        // 1831
                self.emitEvent('upload');                                                                              // 1834
              }                                                                                                        // 2495
                                                                                                                       //
              self.emitEvent('calculateStats');                                                                        // 1835
            }                                                                                                          // 2497
          });                                                                                                          // 1814
        }                                                                                                              // 1798
      }                                                                                                                // 2500
    };                                                                                                                 // 1774
                                                                                                                       //
    UploadInstance.prototype.sendEOF = function () {                                                                   // 2503
      var opts, ref, self;                                                                                             // 1840
                                                                                                                       //
      if (!this.EOFsent) {                                                                                             // 1840
        this.EOFsent = true;                                                                                           // 1841
        self = this;                                                                                                   // 1842
        opts = {                                                                                                       // 1843
          eof: true,                                                                                                   // 1844
          fileId: this.fileId                                                                                          // 1845
        };                                                                                                             // 1844
                                                                                                                       //
        if (this.config.transport === 'ddp') {                                                                         // 1847
          this.config.ddp.call(this.collection._methodNames._Write, opts, function () {                                // 1848
            self.emitEvent('end', arguments);                                                                          // 1849
          });                                                                                                          // 1848
        } else {                                                                                                       // 1847
          HTTP.call('POST', this.collection.downloadRoute + "/" + this.collection.collectionName + "/__upload", {      // 1852
            content: '',                                                                                               // 1853
            headers: {                                                                                                 // 1854
              'x-mtok': ((ref = Meteor.connection) != null ? ref._lastSessionId : void 0) || null,                     // 1855
              'x-eof': '1',                                                                                            // 1856
              'x-fileId': opts.fileId,                                                                                 // 1857
              'content-type': 'text/plain'                                                                             // 1858
            }                                                                                                          // 1855
          }, function (error, result) {                                                                                // 1852
            result = JSON.parse((result != null ? result.content : void 0) || {});                                     // 1860
                                                                                                                       //
            if (result != null ? result.meta : void 0) {                                                               // 1861
              result.meta = fixJSONParse(result.meta);                                                                 // 1861
            }                                                                                                          // 2529
                                                                                                                       //
            self.emitEvent('end', [error, result]);                                                                    // 1862
          });                                                                                                          // 1852
        }                                                                                                              // 1840
      }                                                                                                                // 2533
    };                                                                                                                 // 1839
                                                                                                                       //
    UploadInstance.prototype.proceedChunk = function (chunkId) {                                                       // 2536
      var chunk, fileReader, self;                                                                                     // 1867
      self = this;                                                                                                     // 1867
      chunk = this.config.file.slice(this.config.chunkSize * (chunkId - 1), this.config.chunkSize * chunkId);          // 1868
                                                                                                                       //
      if (this.config.isBase64) {                                                                                      // 1870
        self.emitEvent('sendChunk', [{                                                                                 // 1871
          data: {                                                                                                      // 1872
            bin: chunk,                                                                                                // 1873
            chunkId: chunkId                                                                                           // 1874
          }                                                                                                            // 1872
        }]);                                                                                                           // 1871
      } else {                                                                                                         // 1870
        if (FileReader) {                                                                                              // 1878
          fileReader = new FileReader();                                                                               // 1879
                                                                                                                       //
          fileReader.onloadend = function (evt) {                                                                      // 1881
            var ref, ref1;                                                                                             // 1882
            self.emitEvent('sendChunk', [{                                                                             // 1882
              data: {                                                                                                  // 1883
                bin: ((fileReader != null ? fileReader.result : void 0) || ((ref = evt.srcElement) != null ? ref.result : void 0) || ((ref1 = evt.target) != null ? ref1.result : void 0)).split(',')[1],
                chunkId: chunkId                                                                                       // 1885
              }                                                                                                        // 1883
            }]);                                                                                                       // 1882
          };                                                                                                           // 1881
                                                                                                                       //
          fileReader.onerror = function (e) {                                                                          // 1890
            self.emitEvent('end', [(e.target || e.srcElement).error]);                                                 // 1891
          };                                                                                                           // 1890
                                                                                                                       //
          fileReader.readAsDataURL(chunk);                                                                             // 1894
        } else if (FileReaderSync) {                                                                                   // 1878
          fileReader = new FileReaderSync();                                                                           // 1897
          self.emitEvent('sendChunk', [{                                                                               // 1899
            data: {                                                                                                    // 1900
              bin: fileReader.readAsDataURL(chunk).split(',')[1],                                                      // 1901
              chunkId: chunkId                                                                                         // 1902
            }                                                                                                          // 1900
          }]);                                                                                                         // 1899
        } else {                                                                                                       // 1896
          self.emitEvent('end', ['File API is not supported in this Browser!']);                                       // 1906
        }                                                                                                              // 1870
      }                                                                                                                // 2580
    };                                                                                                                 // 1866
                                                                                                                       //
    UploadInstance.prototype.upload = function () {                                                                    // 2583
      if (this.result.onPause.get()) {                                                                                 // 1910
        return;                                                                                                        // 1911
      }                                                                                                                // 2586
                                                                                                                       //
      if (this.result.state.get() === 'aborted') {                                                                     // 1913
        return this;                                                                                                   // 1914
      }                                                                                                                // 2589
                                                                                                                       //
      if (this.currentChunk <= this.fileLength) {                                                                      // 1916
        ++this.currentChunk;                                                                                           // 1917
                                                                                                                       //
        if (this.worker) {                                                                                             // 1918
          this.worker.postMessage({                                                                                    // 1919
            sc: this.sentChunks,                                                                                       // 1919
            cc: this.currentChunk,                                                                                     // 1919
            cs: this.config.chunkSize,                                                                                 // 1919
            f: this.config.file,                                                                                       // 1919
            ib: this.config.isBase64                                                                                   // 1919
          });                                                                                                          // 1919
        } else {                                                                                                       // 1918
          this.emitEvent('proceedChunk', [this.currentChunk]);                                                         // 1921
        }                                                                                                              // 1916
      }                                                                                                                // 2603
                                                                                                                       //
      this.startTime[this.currentChunk] = +new Date();                                                                 // 1922
    };                                                                                                                 // 1909
                                                                                                                       //
    UploadInstance.prototype.createStreams = function () {                                                             // 2607
      var i, self;                                                                                                     // 1926
      i = 1;                                                                                                           // 1926
      self = this;                                                                                                     // 1927
                                                                                                                       //
      while (i <= this.config.streams) {                                                                               // 1928
        self.emitEvent('upload');                                                                                      // 1929
        i++;                                                                                                           // 1930
      }                                                                                                                // 1928
    };                                                                                                                 // 1925
                                                                                                                       //
    UploadInstance.prototype.prepare = function () {                                                                   // 2617
      var _len, handleStart, opts, ref, ref1, self;                                                                    // 1934
                                                                                                                       //
      self = this;                                                                                                     // 1934
      this.config.onStart && this.config.onStart.call(this.result, null, this.fileData);                               // 1936
      this.result.emitEvent('start', [null, this.fileData]);                                                           // 1937
                                                                                                                       //
      if (this.config.chunkSize === 'dynamic') {                                                                       // 1939
        this.config.chunkSize = this.fileData.size / 1000;                                                             // 1940
                                                                                                                       //
        if (this.config.chunkSize < 327680) {                                                                          // 1941
          this.config.chunkSize = 327680;                                                                              // 1942
        } else if (this.config.chunkSize > 1048576) {                                                                  // 1941
          this.config.chunkSize = 1048576;                                                                             // 1944
        }                                                                                                              // 2628
                                                                                                                       //
        if (this.config.transport === 'http') {                                                                        // 1946
          this.config.chunkSize = Math.round(this.config.chunkSize / 2);                                               // 1947
        }                                                                                                              // 1939
      }                                                                                                                // 2632
                                                                                                                       //
      if (this.config.isBase64) {                                                                                      // 1949
        this.config.chunkSize = Math.floor(this.config.chunkSize / 4) * 4;                                             // 1950
        _len = Math.ceil(this.config.file.length / this.config.chunkSize);                                             // 1951
      } else {                                                                                                         // 1949
        this.config.chunkSize = Math.floor(this.config.chunkSize / 8) * 8;                                             // 1953
        _len = Math.ceil(this.fileData.size / this.config.chunkSize);                                                  // 1954
      }                                                                                                                // 2639
                                                                                                                       //
      if (this.config.streams === 'dynamic') {                                                                         // 1956
        this.config.streams = _.clone(_len);                                                                           // 1957
                                                                                                                       //
        if (this.config.streams > 24) {                                                                                // 1958
          this.config.streams = 24;                                                                                    // 1958
        }                                                                                                              // 2644
                                                                                                                       //
        if (this.config.transport === 'http') {                                                                        // 1960
          this.config.streams = Math.round(this.config.streams / 2);                                                   // 1961
        }                                                                                                              // 1956
      }                                                                                                                // 2648
                                                                                                                       //
      this.fileLength = _len <= 0 ? 1 : _len;                                                                          // 1963
                                                                                                                       //
      if (this.config.streams > this.fileLength) {                                                                     // 1964
        this.config.streams = this.fileLength;                                                                         // 1964
      }                                                                                                                // 2652
                                                                                                                       //
      this.result.config.fileLength = this.fileLength;                                                                 // 1965
      opts = {                                                                                                         // 1967
        file: this.fileData,                                                                                           // 1968
        fileId: this.fileId,                                                                                           // 1969
        chunkSize: this.config.isBase64 ? this.config.chunkSize / 4 * 3 : this.config.chunkSize,                       // 1970
        fileLength: this.fileLength                                                                                    // 1971
      };                                                                                                               // 1968
                                                                                                                       //
      if (this.FSName !== this.fileId) {                                                                               // 1972
        opts.FSName = this.FSName;                                                                                     // 1972
      }                                                                                                                // 2662
                                                                                                                       //
      handleStart = function (error) {                                                                                 // 1974
        if (error) {                                                                                                   // 1975
          if (self.collection.debug) {                                                                                 // 1976
            console.error('[FilesCollection] [_Start] Error:', error);                                                 // 1976
          }                                                                                                            // 2667
                                                                                                                       //
          self.emitEvent('end', [error]);                                                                              // 1977
        } else {                                                                                                       // 1975
          self.result.continueFunc = function () {                                                                     // 1979
            if (self.collection.debug) {                                                                               // 1980
              console.info('[FilesCollection] [insert] [continueFunc]');                                               // 1980
            }                                                                                                          // 2673
                                                                                                                       //
            self.emitEvent('createStreams');                                                                           // 1981
          };                                                                                                           // 1979
                                                                                                                       //
          self.emitEvent('createStreams');                                                                             // 1983
        }                                                                                                              // 2677
      };                                                                                                               // 1974
                                                                                                                       //
      if (this.config.transport === 'ddp') {                                                                           // 1986
        this.config.ddp.call(this.collection._methodNames._Start, opts, handleStart);                                  // 1987
      } else {                                                                                                         // 1986
        if ((ref = opts.file) != null ? ref.meta : void 0) {                                                           // 1989
          opts.file.meta = fixJSONStringify(opts.file.meta);                                                           // 1989
        }                                                                                                              // 2684
                                                                                                                       //
        HTTP.call('POST', this.collection.downloadRoute + "/" + this.collection.collectionName + "/__upload", {        // 1990
          data: opts,                                                                                                  // 1991
          headers: {                                                                                                   // 1992
            'x-start': '1',                                                                                            // 1993
            'x-mtok': ((ref1 = Meteor.connection) != null ? ref1._lastSessionId : void 0) || null                      // 1994
          }                                                                                                            // 1993
        }, handleStart);                                                                                               // 1990
      }                                                                                                                // 2692
    };                                                                                                                 // 1933
                                                                                                                       //
    UploadInstance.prototype.pipe = function (func) {                                                                  // 2695
      this.pipes.push(func);                                                                                           // 1999
      return this;                                                                                                     // 2000
    };                                                                                                                 // 1998
                                                                                                                       //
    UploadInstance.prototype.start = function () {                                                                     // 2700
      var isUploadAllowed, self;                                                                                       // 2003
      self = this;                                                                                                     // 2003
                                                                                                                       //
      if (this.fileData.size <= 0) {                                                                                   // 2004
        this.end(new Meteor.Error(400, 'Can\'t upload empty file'));                                                   // 2005
        return this.result;                                                                                            // 2006
      }                                                                                                                // 2706
                                                                                                                       //
      if (this.config.onBeforeUpload && _.isFunction(this.config.onBeforeUpload)) {                                    // 2008
        isUploadAllowed = this.config.onBeforeUpload.call(_.extend(this.result, this.collection._getUser()), this.fileData);
                                                                                                                       //
        if (isUploadAllowed !== true) {                                                                                // 2010
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'config.onBeforeUpload() returned false'));
        }                                                                                                              // 2008
      }                                                                                                                // 2712
                                                                                                                       //
      if (this.collection.onBeforeUpload && _.isFunction(this.collection.onBeforeUpload)) {                            // 2013
        isUploadAllowed = this.collection.onBeforeUpload.call(_.extend(this.result, this.collection._getUser()), this.fileData);
                                                                                                                       //
        if (isUploadAllowed !== true) {                                                                                // 2015
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'collection.onBeforeUpload() returned false'));
        }                                                                                                              // 2013
      }                                                                                                                // 2718
                                                                                                                       //
      Tracker.autorun(function (computation) {                                                                         // 2018
        self.trackerComp = computation;                                                                                // 2019
                                                                                                                       //
        if (!self.result.onPause.get()) {                                                                              // 2020
          if (Meteor.status().connected) {                                                                             // 2021
            if (self.collection.debug) {                                                                               // 2022
              console.info('[FilesCollection] [insert] [Tracker] [continue]');                                         // 2022
            }                                                                                                          // 2725
                                                                                                                       //
            self.result["continue"]();                                                                                 // 2023
          } else {                                                                                                     // 2021
            if (self.collection.debug) {                                                                               // 2025
              console.info('[FilesCollection] [insert] [Tracker] [pause]');                                            // 2025
            }                                                                                                          // 2730
                                                                                                                       //
            self.result.pause();                                                                                       // 2026
          }                                                                                                            // 2020
        }                                                                                                              // 2733
      });                                                                                                              // 2018
                                                                                                                       //
      if (this.worker) {                                                                                               // 2029
        this.worker.onmessage = function (evt) {                                                                       // 2030
          if (evt.data.error) {                                                                                        // 2031
            if (self.collection.debug) {                                                                               // 2032
              console.warn('[FilesCollection] [insert] [worker] [onmessage] [ERROR:]', evt.data.error);                // 2032
            }                                                                                                          // 2740
                                                                                                                       //
            self.emitEvent('proceedChunk', [evt.data.chunkId]);                                                        // 2033
          } else {                                                                                                     // 2031
            self.emitEvent('sendChunk', [evt]);                                                                        // 2035
          }                                                                                                            // 2744
        };                                                                                                             // 2030
                                                                                                                       //
        this.worker.onerror = function (e) {                                                                           // 2037
          if (self.collection.debug) {                                                                                 // 2038
            console.error('[FilesCollection] [insert] [worker] [onerror] [ERROR:]', e);                                // 2038
          }                                                                                                            // 2749
                                                                                                                       //
          self.emitEvent('end', [e.message]);                                                                          // 2039
        };                                                                                                             // 2037
      }                                                                                                                // 2752
                                                                                                                       //
      if (this.collection.debug) {                                                                                     // 2042
        if (this.worker) {                                                                                             // 2043
          console.info('[FilesCollection] [insert] using WebWorkers');                                                 // 2044
        } else {                                                                                                       // 2043
          console.info('[FilesCollection] [insert] using MainThread');                                                 // 2046
        }                                                                                                              // 2042
      }                                                                                                                // 2759
                                                                                                                       //
      self.emitEvent('prepare');                                                                                       // 2048
      return this.result;                                                                                              // 2049
    };                                                                                                                 // 2002
                                                                                                                       //
    UploadInstance.prototype.manual = function () {                                                                    // 2764
      var self;                                                                                                        // 2052
      self = this;                                                                                                     // 2052
                                                                                                                       //
      this.result.start = function () {                                                                                // 2053
        self.emitEvent('start');                                                                                       // 2054
      };                                                                                                               // 2053
                                                                                                                       //
      this.result.pipe = function (func) {                                                                             // 2056
        self.pipe(func);                                                                                               // 2057
        return this;                                                                                                   // 2058
      };                                                                                                               // 2056
                                                                                                                       //
      return this.result;                                                                                              // 2059
    };                                                                                                                 // 2051
                                                                                                                       //
    return UploadInstance;                                                                                             // 2777
  }() : void 0; /*                                                                                                     // 2779
                @locus Client                                                                                          //
                @memberOf FilesCollection                                                                              //
                @name _FileUpload                                                                                      //
                @class FileUpload                                                                                      //
                @summary Internal Class, instance of this class is returned from `insert()` method                     //
                 */                                                                                                    //
  FilesCollection.prototype._FileUpload = Meteor.isClient ? FileUpload = function () {                                 // 2790
    FileUpload.prototype.__proto__ = EventEmitter.prototype;                                                           // 2791
                                                                                                                       //
    function FileUpload(config1) {                                                                                     // 2071
      var self;                                                                                                        // 2072
      this.config = config1;                                                                                           // 2071
      EventEmitter.call(this);                                                                                         // 2072
      self = this;                                                                                                     // 2073
                                                                                                                       //
      if (!this.config.isBase64) {                                                                                     // 2074
        this.file = _.extend(this.config.file, this.config.fileData);                                                  // 2075
      } else {                                                                                                         // 2074
        this.file = this.config.fileData;                                                                              // 2077
      }                                                                                                                // 2802
                                                                                                                       //
      this.state = new ReactiveVar('active');                                                                          // 2078
      this.onPause = new ReactiveVar(false);                                                                           // 2079
      this.progress = new ReactiveVar(0);                                                                              // 2080
      this.estimateTime = new ReactiveVar(1000);                                                                       // 2081
      this.estimateSpeed = new ReactiveVar(0);                                                                         // 2082
      this.estimateTimer = Meteor.setInterval(function () {                                                            // 2083
        var _currentTime;                                                                                              // 2084
                                                                                                                       //
        if (self.state.get() === 'active') {                                                                           // 2084
          _currentTime = self.estimateTime.get();                                                                      // 2085
                                                                                                                       //
          if (_currentTime > 1000) {                                                                                   // 2086
            self.estimateTime.set(_currentTime - 1000);                                                                // 2087
          }                                                                                                            // 2084
        }                                                                                                              // 2815
      }, 1000);                                                                                                        // 2083
    }                                                                                                                  // 2071
                                                                                                                       //
    FileUpload.prototype.continueFunc = function () {};                                                                // 2819
                                                                                                                       //
    FileUpload.prototype.pause = function () {                                                                         // 2821
      if (this.config.debug) {                                                                                         // 2092
        console.info('[FilesCollection] [insert] [.pause()]');                                                         // 2092
      }                                                                                                                // 2824
                                                                                                                       //
      if (!this.onPause.get()) {                                                                                       // 2093
        this.onPause.set(true);                                                                                        // 2094
        this.state.set('paused');                                                                                      // 2095
        this.emitEvent('pause', [this.file]);                                                                          // 2096
      }                                                                                                                // 2829
    };                                                                                                                 // 2091
                                                                                                                       //
    FileUpload.prototype["continue"] = function () {                                                                   // 2832
      if (this.config.debug) {                                                                                         // 2099
        console.info('[FilesCollection] [insert] [.continue()]');                                                      // 2099
      }                                                                                                                // 2835
                                                                                                                       //
      if (this.onPause.get()) {                                                                                        // 2100
        this.onPause.set(false);                                                                                       // 2101
        this.state.set('active');                                                                                      // 2102
        this.emitEvent('continue', [this.file]);                                                                       // 2103
        this.continueFunc();                                                                                           // 2104
      }                                                                                                                // 2841
    };                                                                                                                 // 2098
                                                                                                                       //
    FileUpload.prototype.toggle = function () {                                                                        // 2844
      if (this.config.debug) {                                                                                         // 2107
        console.info('[FilesCollection] [insert] [.toggle()]');                                                        // 2107
      }                                                                                                                // 2847
                                                                                                                       //
      if (this.onPause.get()) {                                                                                        // 2108
        this["continue"]();                                                                                            // 2108
      } else {                                                                                                         // 2108
        this.pause();                                                                                                  // 2108
      }                                                                                                                // 2852
    };                                                                                                                 // 2106
                                                                                                                       //
    FileUpload.prototype.abort = function () {                                                                         // 2855
      if (this.config.debug) {                                                                                         // 2111
        console.info('[FilesCollection] [insert] [.abort()]');                                                         // 2111
      }                                                                                                                // 2858
                                                                                                                       //
      window.removeEventListener('beforeunload', this.config.beforeunload, false);                                     // 2112
      this.config.onAbort && this.config.onAbort.call(this, this.file);                                                // 2113
      this.emitEvent('abort', [this.file]);                                                                            // 2114
      this.pause();                                                                                                    // 2115
                                                                                                                       //
      this.config._onEnd();                                                                                            // 2116
                                                                                                                       //
      this.state.set('aborted');                                                                                       // 2117
                                                                                                                       //
      if (this.config.debug) {                                                                                         // 2118
        console.timeEnd('insert ' + this.config.fileData.name);                                                        // 2118
      }                                                                                                                // 2867
                                                                                                                       //
      this.config.ddp.call(this.config._Abort, this.config.fileId);                                                    // 2119
    };                                                                                                                 // 2110
                                                                                                                       //
    return FileUpload;                                                                                                 // 2871
  }() : void 0; /*                                                                                                     // 2873
                @locus Anywhere                                                                                        //
                @memberOf FilesCollection                                                                              //
                @name remove                                                                                           //
                @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)
                @param {Function} callback - Callback with one `error` argument                                        //
                @summary Remove documents from the collection                                                          //
                @returns {FilesCollection} Instance                                                                    //
                 */                                                                                                    //
                                                                                                                       //
  FilesCollection.prototype.remove = function (selector, callback) {                                                   // 2886
    var docs, files, self;                                                                                             // 2133
                                                                                                                       //
    if (selector == null) {                                                                                            // 2888
      selector = {};                                                                                                   // 2132
    }                                                                                                                  // 2890
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2133
      console.info("[FilesCollection] [remove(" + JSON.stringify(selector) + ")]");                                    // 2133
    }                                                                                                                  // 2893
                                                                                                                       //
    check(selector, Match.OneOf(Object, String));                                                                      // 2134
    check(callback, Match.Optional(Function));                                                                         // 2135
                                                                                                                       //
    if (Meteor.isClient) {                                                                                             // 2137
      if (this.allowClientCode) {                                                                                      // 2138
        this.ddp.call(this._methodNames._Remove, selector, callback || NOOP);                                          // 2139
      } else {                                                                                                         // 2138
        callback && callback(new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!'));
                                                                                                                       //
        if (this.debug) {                                                                                              // 2142
          console.warn('[FilesCollection] [remove] Run code from client is not allowed!');                             // 2142
        }                                                                                                              // 2138
      }                                                                                                                // 2137
    } else {                                                                                                           // 2137
      files = this.collection.find(selector);                                                                          // 2144
                                                                                                                       //
      if (files.count() > 0) {                                                                                         // 2145
        self = this;                                                                                                   // 2146
        files.forEach(function (file) {                                                                                // 2147
          self.unlink(file);                                                                                           // 2148
        });                                                                                                            // 2147
      } else {                                                                                                         // 2145
        callback && callback(new Meteor.Error(404, 'Cursor is empty, no files is removed'));                           // 2151
        return this;                                                                                                   // 2152
      }                                                                                                                // 2915
                                                                                                                       //
      if (this.onAfterRemove) {                                                                                        // 2154
        self = this;                                                                                                   // 2155
        docs = files.fetch();                                                                                          // 2156
        this.collection.remove(selector, function () {                                                                 // 2158
          callback && callback.apply(this, arguments);                                                                 // 2159
          self.onAfterRemove(docs);                                                                                    // 2160
        });                                                                                                            // 2158
      } else {                                                                                                         // 2154
        this.collection.remove(selector, callback || NOOP);                                                            // 2163
      }                                                                                                                // 2137
    }                                                                                                                  // 2926
                                                                                                                       //
    return this;                                                                                                       // 2164
  }; /*                                                                                                                // 2132
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name update                                                                                                      //
     @see http://docs.meteor.com/#/full/update                                                                         //
     @summary link Mongo.Collection update method                                                                      //
     @returns {Mongo.Collection} Instance                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.update = function () {                                                                     // 2940
    this.collection.update.apply(this.collection, arguments);                                                          // 2175
    return this.collection;                                                                                            // 2176
  }; /*                                                                                                                // 2174
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name deny                                                                                                        //
     @param {Object} rules                                                                                             //
     @see  https://docs.meteor.com/api/collections.html#Mongo-Collection-deny                                          //
     @summary link Mongo.Collection deny methods                                                                       //
     @returns {Mongo.Collection} Instance                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.deny = Meteor.isServer ? function (rules) {                                                // 2956
    this.collection.deny(rules);                                                                                       // 2188
    return this.collection;                                                                                            // 2189
  } : void 0; /*                                                                                                       // 2187
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name allow                                                                                              //
              @param {Object} rules                                                                                    //
              @see https://docs.meteor.com/api/collections.html#Mongo-Collection-allow                                 //
              @summary link Mongo.Collection allow methods                                                             //
              @returns {Mongo.Collection} Instance                                                                     //
               */                                                                                                      //
  FilesCollection.prototype.allow = Meteor.isServer ? function (rules) {                                               // 2972
    this.collection.allow(rules);                                                                                      // 2202
    return this.collection;                                                                                            // 2203
  } : void 0; /*                                                                                                       // 2201
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name denyClient                                                                                         //
              @see https://docs.meteor.com/api/collections.html#Mongo-Collection-deny                                  //
              @summary Shorthands for Mongo.Collection deny method                                                     //
              @returns {Mongo.Collection} Instance                                                                     //
               */                                                                                                      //
  FilesCollection.prototype.denyClient = Meteor.isServer ? function () {                                               // 2987
    this.collection.deny({                                                                                             // 2215
      insert: function () {                                                                                            // 2216
        return true;                                                                                                   // 2990
      },                                                                                                               // 2216
      update: function () {                                                                                            // 2217
        return true;                                                                                                   // 2993
      },                                                                                                               // 2216
      remove: function () {                                                                                            // 2218
        return true;                                                                                                   // 2996
      }                                                                                                                // 2216
    });                                                                                                                // 2216
    return this.collection;                                                                                            // 2219
  } : void 0; /*                                                                                                       // 2214
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name allowClient                                                                                        //
              @see https://docs.meteor.com/api/collections.html#Mongo-Collection-allow                                 //
              @summary Shorthands for Mongo.Collection allow method                                                    //
              @returns {Mongo.Collection} Instance                                                                     //
               */                                                                                                      //
  FilesCollection.prototype.allowClient = Meteor.isServer ? function () {                                              // 3012
    this.collection.allow({                                                                                            // 2231
      insert: function () {                                                                                            // 2232
        return true;                                                                                                   // 3015
      },                                                                                                               // 2232
      update: function () {                                                                                            // 2233
        return true;                                                                                                   // 3018
      },                                                                                                               // 2232
      remove: function () {                                                                                            // 2234
        return true;                                                                                                   // 3021
      }                                                                                                                // 2232
    });                                                                                                                // 2232
    return this.collection;                                                                                            // 2235
  } : void 0; /*                                                                                                       // 2230
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name unlink                                                                                             //
              @param {Object} fileRef - fileObj                                                                        //
              @param {String} version - [Optional] file's version                                                      //
              @param {Function} callback - [Optional] callback function                                                //
              @summary Unlink files and it's versions from FS                                                          //
              @returns {FilesCollection} Instance                                                                      //
               */                                                                                                      //
  FilesCollection.prototype.unlink = Meteor.isServer ? function (fileRef, version, callback) {                         // 3039
    var ref, ref1;                                                                                                     // 2250
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2250
      console.info("[FilesCollection] [unlink(" + fileRef._id + ", " + version + ")]");                                // 2250
    }                                                                                                                  // 3043
                                                                                                                       //
    if (version) {                                                                                                     // 2251
      if (((ref = fileRef.versions) != null ? ref[version] : void 0) && ((ref1 = fileRef.versions[version]) != null ? ref1.path : void 0)) {
        fs.unlink(fileRef.versions[version].path, callback || NOOP);                                                   // 2253
      }                                                                                                                // 2251
    } else {                                                                                                           // 2251
      if (fileRef.versions && !_.isEmpty(fileRef.versions)) {                                                          // 2255
        _.each(fileRef.versions, function (vRef) {                                                                     // 2256
          return bound(function () {                                                                                   // 3051
            fs.unlink(vRef.path, callback || NOOP);                                                                    // 2257
          });                                                                                                          // 2256
        });                                                                                                            // 2256
      } else {                                                                                                         // 2255
        fs.unlink(fileRef.path, callback || NOOP);                                                                     // 2260
      }                                                                                                                // 2251
    }                                                                                                                  // 3058
                                                                                                                       //
    return this;                                                                                                       // 2261
  } : void 0; /*                                                                                                       // 2249
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name _404                                                                                               //
              @summary Internal method, used to return 404 error                                                       //
              @returns {undefined}                                                                                     //
               */                                                                                                      //
  FilesCollection.prototype._404 = Meteor.isServer ? function (http) {                                                 // 3071
    var text;                                                                                                          // 2272
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2272
      console.warn("[FilesCollection] [download(" + http.request.originalUrl + ")] [_404] File not found");            // 2272
    }                                                                                                                  // 3075
                                                                                                                       //
    text = 'File Not Found :(';                                                                                        // 2273
    http.response.writeHead(404, {                                                                                     // 2274
      'Content-Length': text.length,                                                                                   // 2275
      'Content-Type': 'text/plain'                                                                                     // 2276
    });                                                                                                                // 2275
    http.response.end(text);                                                                                           // 2277
  } : void 0; /*                                                                                                       // 2271
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name download                                                                                           //
              @param {Object} http    - Server HTTP object                                                             //
              @param {String} version - Requested file version                                                         //
              @param {Object} fileRef - Requested file Object                                                          //
              @summary Initiates the HTTP response                                                                     //
              @returns {undefined}                                                                                     //
               */                                                                                                      //
  FilesCollection.prototype.download = Meteor.isServer ? function (http, version, fileRef) {                           // 3096
    var self, vRef;                                                                                                    // 2292
                                                                                                                       //
    if (version == null) {                                                                                             // 3098
      version = 'original';                                                                                            // 2291
    }                                                                                                                  // 3100
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2292
      console.info("[FilesCollection] [download(" + http.request.originalUrl + ", " + version + ")]");                 // 2292
    }                                                                                                                  // 3103
                                                                                                                       //
    if (fileRef) {                                                                                                     // 2293
      if (_.has(fileRef, 'versions') && _.has(fileRef.versions, version)) {                                            // 2294
        vRef = fileRef.versions[version];                                                                              // 2295
        vRef._id = fileRef._id;                                                                                        // 2296
      } else {                                                                                                         // 2294
        vRef = fileRef;                                                                                                // 2298
      }                                                                                                                // 2293
    } else {                                                                                                           // 2293
      vRef = false;                                                                                                    // 2300
    }                                                                                                                  // 3113
                                                                                                                       //
    if (!vRef || !_.isObject(vRef)) {                                                                                  // 2302
      return this._404(http);                                                                                          // 2303
    } else if (fileRef) {                                                                                              // 2302
      self = this;                                                                                                     // 2305
                                                                                                                       //
      if (this.downloadCallback) {                                                                                     // 2307
        if (!this.downloadCallback.call(_.extend(http, this._getUser(http)), fileRef)) {                               // 2308
          return this._404(http);                                                                                      // 2309
        }                                                                                                              // 2307
      }                                                                                                                // 3122
                                                                                                                       //
      if (this.interceptDownload && _.isFunction(this.interceptDownload)) {                                            // 2311
        if (this.interceptDownload(http, fileRef, version) === true) {                                                 // 2312
          return;                                                                                                      // 2313
        }                                                                                                              // 2311
      }                                                                                                                // 3127
                                                                                                                       //
      fs.stat(vRef.path, function (statErr, stats) {                                                                   // 2315
        return bound(function () {                                                                                     // 3129
          var responseType;                                                                                            // 2316
                                                                                                                       //
          if (statErr || !stats.isFile()) {                                                                            // 2316
            return self._404(http);                                                                                    // 2317
          }                                                                                                            // 3133
                                                                                                                       //
          if (stats.size !== vRef.size && !self.integrityCheck) {                                                      // 2319
            vRef.size = stats.size;                                                                                    // 2319
          }                                                                                                            // 3136
                                                                                                                       //
          if (stats.size !== vRef.size && self.integrityCheck) {                                                       // 2320
            responseType = '400';                                                                                      // 2320
          }                                                                                                            // 3139
                                                                                                                       //
          return self.serve(http, fileRef, vRef, version, null, responseType || '200');                                // 3140
        });                                                                                                            // 2315
      });                                                                                                              // 2315
    } else {                                                                                                           // 2304
      return this._404(http);                                                                                          // 2324
    }                                                                                                                  // 3145
  } : void 0; /*                                                                                                       // 2291
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
    if (version == null) {                                                                                             // 3166
      version = 'original';                                                                                            // 2341
    }                                                                                                                  // 3168
                                                                                                                       //
    if (readableStream == null) {                                                                                      // 3169
      readableStream = null;                                                                                           // 2341
    }                                                                                                                  // 3171
                                                                                                                       //
    if (responseType == null) {                                                                                        // 3172
      responseType = '200';                                                                                            // 2341
    }                                                                                                                  // 3174
                                                                                                                       //
    if (force200 == null) {                                                                                            // 3175
      force200 = false;                                                                                                // 2341
    }                                                                                                                  // 3177
                                                                                                                       //
    self = this;                                                                                                       // 2342
    partiral = false;                                                                                                  // 2343
    reqRange = false;                                                                                                  // 2344
                                                                                                                       //
    if (http.params.query.download && http.params.query.download === 'true') {                                         // 2346
      dispositionType = 'attachment; ';                                                                                // 2347
    } else {                                                                                                           // 2346
      dispositionType = 'inline; ';                                                                                    // 2349
    }                                                                                                                  // 3185
                                                                                                                       //
    dispositionName = "filename=\"" + encodeURIComponent(fileRef.name) + "\"; filename=*UTF-8\"" + encodeURIComponent(fileRef.name) + "\"; ";
    dispositionEncoding = 'charset=utf-8';                                                                             // 2352
    http.response.setHeader('Content-Disposition', dispositionType + dispositionName + dispositionEncoding);           // 2354
                                                                                                                       //
    if (http.request.headers.range && !force200) {                                                                     // 2356
      partiral = true;                                                                                                 // 2357
      array = http.request.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);                                             // 2358
      start = parseInt(array[1]);                                                                                      // 2359
      end = parseInt(array[2]);                                                                                        // 2360
                                                                                                                       //
      if (isNaN(end)) {                                                                                                // 2361
        end = vRef.size - 1;                                                                                           // 2361
      }                                                                                                                // 3196
                                                                                                                       //
      take = end - start;                                                                                              // 2362
    } else {                                                                                                           // 2356
      start = 0;                                                                                                       // 2364
      end = vRef.size - 1;                                                                                             // 2365
      take = vRef.size;                                                                                                // 2366
    }                                                                                                                  // 3202
                                                                                                                       //
    if (partiral || http.params.query.play && http.params.query.play === 'true') {                                     // 2368
      reqRange = {                                                                                                     // 2369
        start: start,                                                                                                  // 2369
        end: end                                                                                                       // 2369
      };                                                                                                               // 2369
                                                                                                                       //
      if (isNaN(start) && !isNaN(end)) {                                                                               // 2370
        reqRange.start = end - take;                                                                                   // 2371
        reqRange.end = end;                                                                                            // 2372
      }                                                                                                                // 3211
                                                                                                                       //
      if (!isNaN(start) && isNaN(end)) {                                                                               // 2373
        reqRange.start = start;                                                                                        // 2374
        reqRange.end = start + take;                                                                                   // 2375
      }                                                                                                                // 3215
                                                                                                                       //
      if (start + take >= vRef.size) {                                                                                 // 2377
        reqRange.end = vRef.size - 1;                                                                                  // 2377
      }                                                                                                                // 3218
                                                                                                                       //
      if (self.strict && (reqRange.start >= vRef.size - 1 || reqRange.end > vRef.size - 1)) {                          // 2379
        responseType = '416';                                                                                          // 2380
      } else {                                                                                                         // 2379
        responseType = '206';                                                                                          // 2382
      }                                                                                                                // 2368
    } else {                                                                                                           // 2368
      responseType = '200';                                                                                            // 2384
    }                                                                                                                  // 3226
                                                                                                                       //
    streamErrorHandler = function (error) {                                                                            // 2386
      http.response.writeHead(500);                                                                                    // 2387
      http.response.end(error.toString());                                                                             // 2388
                                                                                                                       //
      if (self.debug) {                                                                                                // 2389
        console.error("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [500]", error);                   // 2389
      }                                                                                                                // 3232
    };                                                                                                                 // 2386
                                                                                                                       //
    headers = _.isFunction(self.responseHeaders) ? self.responseHeaders(responseType, fileRef, vRef, version) : self.responseHeaders;
                                                                                                                       //
    if (!headers['Cache-Control']) {                                                                                   // 2394
      http.response.setHeader('Cache-Control', self.cacheControl);                                                     // 2395
    }                                                                                                                  // 3237
                                                                                                                       //
    for (key in meteorBabelHelpers.sanitizeForInObject(headers)) {                                                     // 2397
      value = headers[key];                                                                                            // 3239
      http.response.setHeader(key, value);                                                                             // 2398
    }                                                                                                                  // 2397
                                                                                                                       //
    switch (responseType) {                                                                                            // 2400
      case '400':                                                                                                      // 2400
        if (self.debug) {                                                                                              // 2402
          console.warn("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [400] Content-Length mismatch!");
        }                                                                                                              // 3246
                                                                                                                       //
        text = 'Content-Length mismatch!';                                                                             // 2403
        http.response.writeHead(400, {                                                                                 // 2404
          'Content-Type': 'text/plain',                                                                                // 2405
          'Content-Length': text.length                                                                                // 2406
        });                                                                                                            // 2405
        http.response.end(text);                                                                                       // 2407
        break;                                                                                                         // 2408
                                                                                                                       //
      case '404':                                                                                                      // 2400
        return self._404(http);                                                                                        // 2410
        break;                                                                                                         // 2411
                                                                                                                       //
      case '416':                                                                                                      // 2400
        if (self.debug) {                                                                                              // 2413
          console.warn("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [416] Content-Range is not specified!");
        }                                                                                                              // 3260
                                                                                                                       //
        http.response.writeHead(416);                                                                                  // 2414
        http.response.end();                                                                                           // 2415
        break;                                                                                                         // 2416
                                                                                                                       //
      case '200':                                                                                                      // 2400
        if (self.debug) {                                                                                              // 2418
          console.info("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [200]");                         // 2418
        }                                                                                                              // 3267
                                                                                                                       //
        stream = readableStream || fs.createReadStream(vRef.path);                                                     // 2419
                                                                                                                       //
        if (readableStream) {                                                                                          // 2420
          http.response.writeHead(200);                                                                                // 2420
        }                                                                                                              // 3271
                                                                                                                       //
        stream.on('open', function () {                                                                                // 2421
          http.response.writeHead(200);                                                                                // 2422
        }).on('error', streamErrorHandler).on('end', function () {                                                     // 2421
          http.response.end();                                                                                         // 2426
        });                                                                                                            // 2421
                                                                                                                       //
        if (self.throttle) {                                                                                           // 2428
          stream.pipe(new Throttle({                                                                                   // 2428
            bps: self.throttle,                                                                                        // 2428
            chunksize: self.chunkSize                                                                                  // 2428
          }));                                                                                                         // 2428
        }                                                                                                              // 3282
                                                                                                                       //
        stream.pipe(http.response);                                                                                    // 2429
        break;                                                                                                         // 2430
                                                                                                                       //
      case '206':                                                                                                      // 2400
        if (self.debug) {                                                                                              // 2432
          console.info("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [206]");                         // 2432
        }                                                                                                              // 3288
                                                                                                                       //
        http.response.setHeader('Content-Range', "bytes " + reqRange.start + "-" + reqRange.end + "/" + vRef.size);    // 2433
        stream = readableStream || fs.createReadStream(vRef.path, {                                                    // 2434
          start: reqRange.start,                                                                                       // 2434
          end: reqRange.end                                                                                            // 2434
        });                                                                                                            // 2434
                                                                                                                       //
        if (readableStream) {                                                                                          // 2435
          http.response.writeHead(206);                                                                                // 2435
        }                                                                                                              // 3296
                                                                                                                       //
        stream.on('open', function () {                                                                                // 2436
          http.response.writeHead(206);                                                                                // 2437
        }).on('error', streamErrorHandler).on('end', function () {                                                     // 2436
          http.response.end();                                                                                         // 2441
        });                                                                                                            // 2436
                                                                                                                       //
        if (self.throttle) {                                                                                           // 2443
          stream.pipe(new Throttle({                                                                                   // 2443
            bps: self.throttle,                                                                                        // 2443
            chunksize: self.chunkSize                                                                                  // 2443
          }));                                                                                                         // 2443
        }                                                                                                              // 3307
                                                                                                                       //
        stream.pipe(http.response);                                                                                    // 2444
        break;                                                                                                         // 2445
    }                                                                                                                  // 2400
  } : void 0; /*                                                                                                       // 2341
              @locus Anywhere                                                                                          //
              @memberOf FilesCollection                                                                                //
              @name link                                                                                               //
              @param {Object} fileRef - File reference object                                                          //
              @param {String} version - Version of file you would like to request                                      //
              @summary Returns downloadable URL                                                                        //
              @returns {String} Empty string returned in case if file not found in DB                                  //
               */                                                                                                      //
                                                                                                                       //
  FilesCollection.prototype.link = function (fileRef, version) {                                                       // 3324
    if (version == null) {                                                                                             // 3325
      version = 'original';                                                                                            // 2458
    }                                                                                                                  // 3327
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2459
      console.info("[FilesCollection] [link(" + (fileRef != null ? fileRef._id : void 0) + ", " + version + ")]");     // 2459
    }                                                                                                                  // 3330
                                                                                                                       //
    check(fileRef, Object);                                                                                            // 2460
    check(version, String);                                                                                            // 2461
                                                                                                                       //
    if (!fileRef) {                                                                                                    // 2462
      return '';                                                                                                       // 2462
    }                                                                                                                  // 3335
                                                                                                                       //
    return formatFleURL(fileRef, version);                                                                             // 2463
  };                                                                                                                   // 2458
                                                                                                                       //
  return FilesCollection;                                                                                              // 3339
}()); /*                                                                                                               // 3341
      @locus Anywhere                                                                                                  //
      @private                                                                                                         //
      @name formatFleURL                                                                                               //
      @param {Object} fileRef - File reference object                                                                  //
      @param {String} version - [Optional] Version of file you would like build URL for                                //
      @summary Returns formatted URL for file                                                                          //
      @returns {String} Downloadable link                                                                              //
       */                                                                                                              //
                                                                                                                       //
formatFleURL = function (fileRef, version) {                                                                           // 2474
  var ext, ref, root;                                                                                                  // 2475
                                                                                                                       //
  if (version == null) {                                                                                               // 3356
    version = 'original';                                                                                              // 2474
  }                                                                                                                    // 3358
                                                                                                                       //
  check(fileRef, Object);                                                                                              // 2475
  check(version, String);                                                                                              // 2476
  root = __meteor_runtime_config__.ROOT_URL.replace(/\/+$/, '');                                                       // 2478
                                                                                                                       //
  if ((ref = fileRef.extension) != null ? ref.length : void 0) {                                                       // 2480
    ext = '.' + fileRef.extension;                                                                                     // 2481
  } else {                                                                                                             // 2480
    ext = '';                                                                                                          // 2483
  }                                                                                                                    // 3366
                                                                                                                       //
  if (fileRef["public"] === true) {                                                                                    // 2485
    return root + (version === 'original' ? fileRef._downloadRoute + "/" + fileRef._id + ext : fileRef._downloadRoute + "/" + version + "-" + fileRef._id + ext);
  } else {                                                                                                             // 2485
    return root + (fileRef._downloadRoute + "/" + fileRef._collectionName + "/" + fileRef._id + "/" + version + "/" + fileRef._id + ext);
  }                                                                                                                    // 3371
};                                                                                                                     // 2474
                                                                                                                       //
if (Meteor.isClient) {                                                                                                 // 2490
  /*                                                                                                                   // 2491
  @locus Client                                                                                                        //
  @TemplateHelper                                                                                                      //
  @name fileURL                                                                                                        //
  @param {Object} fileRef - File reference object                                                                      //
  @param {String} version - [Optional] Version of file you would like to request                                       //
  @summary Get download URL for file by fileRef, even without subscription                                             //
  @example {{fileURL fileRef}}                                                                                         //
  @returns {String}                                                                                                    //
   */Meteor.startup(function () {                                                                                      //
    if (typeof Template !== "undefined" && Template !== null) {                                                        // 2502
      Template.registerHelper('fileURL', function (fileRef, version) {                                                 // 2503
        if (!fileRef || !_.isObject(fileRef)) {                                                                        // 2504
          return void 0;                                                                                               // 2504
        }                                                                                                              // 3391
                                                                                                                       //
        version = !version || !_.isString(version) ? 'original' : version;                                             // 2505
                                                                                                                       //
        if (fileRef._id) {                                                                                             // 2506
          return formatFleURL(fileRef, version);                                                                       // 2507
        } else {                                                                                                       // 2506
          return '';                                                                                                   // 2509
        }                                                                                                              // 3397
      });                                                                                                              // 2503
    }                                                                                                                  // 3399
  });                                                                                                                  // 2501
} /*                                                                                                                   // 3401
  Export the FilesCollection class                                                                                     //
   */                                                                                                                  //
                                                                                                                       //
Meteor.Files = FilesCollection;                                                                                        // 2515
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

}],"node_modules":{"fs-extra":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// ../../.1.7.15.1rz3bve++os+web.browser+web.cordova/npm/node_modules/fs-extra/package.json                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "fs-extra";
exports.version = "3.0.1";
exports.main = "./lib/index";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/fs-extra/lib/index.js                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
'use strict'

const assign = require('./util/assign')

const fs = {}

// Export graceful-fs:
assign(fs, require('./fs'))
// Export extra methods:
assign(fs, require('./copy'))
assign(fs, require('./copy-sync'))
assign(fs, require('./mkdirs'))
assign(fs, require('./remove'))
assign(fs, require('./json'))
assign(fs, require('./move'))
assign(fs, require('./move-sync'))
assign(fs, require('./empty'))
assign(fs, require('./ensure'))
assign(fs, require('./output'))
assign(fs, require('./path-exists'))

module.exports = fs

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"file-type":{"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/ostrio_files/node_modules/file-type/index.js                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
'use strict';

module.exports = input => {
	const buf = new Uint8Array(input);

	if (!(buf && buf.length > 1)) {
		return null;
	}

	const check = (header, opts) => {
		opts = Object.assign({
			offset: 0
		}, opts);

		for (let i = 0; i < header.length; i++) {
			if (header[i] !== buf[i + opts.offset]) {
				return false;
			}
		}

		return true;
	};

	if (check([0xFF, 0xD8, 0xFF])) {
		return {
			ext: 'jpg',
			mime: 'image/jpeg'
		};
	}

	if (check([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
		return {
			ext: 'png',
			mime: 'image/png'
		};
	}

	if (check([0x47, 0x49, 0x46])) {
		return {
			ext: 'gif',
			mime: 'image/gif'
		};
	}

	if (check([0x57, 0x45, 0x42, 0x50], {offset: 8})) {
		return {
			ext: 'webp',
			mime: 'image/webp'
		};
	}

	if (check([0x46, 0x4C, 0x49, 0x46])) {
		return {
			ext: 'flif',
			mime: 'image/flif'
		};
	}

	// Needs to be before `tif` check
	if (
		(check([0x49, 0x49, 0x2A, 0x0]) || check([0x4D, 0x4D, 0x0, 0x2A])) &&
		check([0x43, 0x52], {offset: 8})
	) {
		return {
			ext: 'cr2',
			mime: 'image/x-canon-cr2'
		};
	}

	if (
		check([0x49, 0x49, 0x2A, 0x0]) ||
		check([0x4D, 0x4D, 0x0, 0x2A])
	) {
		return {
			ext: 'tif',
			mime: 'image/tiff'
		};
	}

	if (check([0x42, 0x4D])) {
		return {
			ext: 'bmp',
			mime: 'image/bmp'
		};
	}

	if (check([0x49, 0x49, 0xBC])) {
		return {
			ext: 'jxr',
			mime: 'image/vnd.ms-photo'
		};
	}

	if (check([0x38, 0x42, 0x50, 0x53])) {
		return {
			ext: 'psd',
			mime: 'image/vnd.adobe.photoshop'
		};
	}

	// Needs to be before the `zip` check
	if (
		check([0x50, 0x4B, 0x3, 0x4]) &&
		check([0x6D, 0x69, 0x6D, 0x65, 0x74, 0x79, 0x70, 0x65, 0x61, 0x70, 0x70, 0x6C, 0x69, 0x63, 0x61, 0x74, 0x69, 0x6F, 0x6E, 0x2F, 0x65, 0x70, 0x75, 0x62, 0x2B, 0x7A, 0x69, 0x70], {offset: 30})
	) {
		return {
			ext: 'epub',
			mime: 'application/epub+zip'
		};
	}

	// Needs to be before `zip` check
	// Assumes signed `.xpi` from addons.mozilla.org
	if (
		check([0x50, 0x4B, 0x3, 0x4]) &&
		check([0x4D, 0x45, 0x54, 0x41, 0x2D, 0x49, 0x4E, 0x46, 0x2F, 0x6D, 0x6F, 0x7A, 0x69, 0x6C, 0x6C, 0x61, 0x2E, 0x72, 0x73, 0x61], {offset: 30})
	) {
		return {
			ext: 'xpi',
			mime: 'application/x-xpinstall'
		};
	}

	if (
		check([0x50, 0x4B]) &&
		(buf[2] === 0x3 || buf[2] === 0x5 || buf[2] === 0x7) &&
		(buf[3] === 0x4 || buf[3] === 0x6 || buf[3] === 0x8)
	) {
		return {
			ext: 'zip',
			mime: 'application/zip'
		};
	}

	if (check([0x75, 0x73, 0x74, 0x61, 0x72], {offset: 257})) {
		return {
			ext: 'tar',
			mime: 'application/x-tar'
		};
	}

	if (
		check([0x52, 0x61, 0x72, 0x21, 0x1A, 0x7]) &&
		(buf[6] === 0x0 || buf[6] === 0x1)
	) {
		return {
			ext: 'rar',
			mime: 'application/x-rar-compressed'
		};
	}

	if (check([0x1F, 0x8B, 0x8])) {
		return {
			ext: 'gz',
			mime: 'application/gzip'
		};
	}

	if (check([0x42, 0x5A, 0x68])) {
		return {
			ext: 'bz2',
			mime: 'application/x-bzip2'
		};
	}

	if (check([0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C])) {
		return {
			ext: '7z',
			mime: 'application/x-7z-compressed'
		};
	}

	if (check([0x78, 0x01])) {
		return {
			ext: 'dmg',
			mime: 'application/x-apple-diskimage'
		};
	}

	if (
		(
			check([0x0, 0x0, 0x0]) &&
			(buf[3] === 0x18 || buf[3] === 0x20) &&
			check([0x66, 0x74, 0x79, 0x70], {offset: 4})
		) ||
		check([0x33, 0x67, 0x70, 0x35]) ||
		(
			check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32]) &&
			check([0x6D, 0x70, 0x34, 0x31, 0x6D, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6F, 0x6D], {offset: 16})
		) ||
		check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D]) ||
		check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32, 0x0, 0x0, 0x0, 0x0])
	) {
		return {
			ext: 'mp4',
			mime: 'video/mp4'
		};
	}

	if (check([0x0, 0x0, 0x0, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x56])) {
		return {
			ext: 'm4v',
			mime: 'video/x-m4v'
		};
	}

	if (check([0x4D, 0x54, 0x68, 0x64])) {
		return {
			ext: 'mid',
			mime: 'audio/midi'
		};
	}

	// https://github.com/threatstack/libmagic/blob/master/magic/Magdir/matroska
	if (check([0x1A, 0x45, 0xDF, 0xA3])) {
		const sliced = buf.subarray(4, 4 + 4096);
		const idPos = sliced.findIndex((el, i, arr) => arr[i] === 0x42 && arr[i + 1] === 0x82);

		if (idPos >= 0) {
			const docTypePos = idPos + 3;
			const findDocType = type => Array.from(type).every((c, i) => sliced[docTypePos + i] === c.charCodeAt(0));

			if (findDocType('matroska')) {
				return {
					ext: 'mkv',
					mime: 'video/x-matroska'
				};
			}

			if (findDocType('webm')) {
				return {
					ext: 'webm',
					mime: 'video/webm'
				};
			}
		}
	}

	if (check([0x0, 0x0, 0x0, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20]) ||
		check([0x66, 0x72, 0x65, 0x65], {offset: 4}) ||
		check([0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20], {offset: 4}) ||
		check([0x6D, 0x64, 0x61, 0x74], {offset: 4}) || // MJPEG
		check([0x77, 0x69, 0x64, 0x65], {offset: 4})) {
		return {
			ext: 'mov',
			mime: 'video/quicktime'
		};
	}

	if (
		check([0x52, 0x49, 0x46, 0x46]) &&
		check([0x41, 0x56, 0x49], {offset: 8})
	) {
		return {
			ext: 'avi',
			mime: 'video/x-msvideo'
		};
	}

	if (check([0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11, 0xA6, 0xD9])) {
		return {
			ext: 'wmv',
			mime: 'video/x-ms-wmv'
		};
	}

	if (check([0x0, 0x0, 0x1, 0xBA])) {
		return {
			ext: 'mpg',
			mime: 'video/mpeg'
		};
	}

	if (
		check([0x49, 0x44, 0x33]) ||
		check([0xFF, 0xFB])
	) {
		return {
			ext: 'mp3',
			mime: 'audio/mpeg'
		};
	}

	if (
		check([0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x41], {offset: 4}) ||
		check([0x4D, 0x34, 0x41, 0x20])
	) {
		return {
			ext: 'm4a',
			mime: 'audio/m4a'
		};
	}

	// Needs to be before `ogg` check
	if (check([0x4F, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64], {offset: 28})) {
		return {
			ext: 'opus',
			mime: 'audio/opus'
		};
	}

	if (check([0x4F, 0x67, 0x67, 0x53])) {
		return {
			ext: 'ogg',
			mime: 'audio/ogg'
		};
	}

	if (check([0x66, 0x4C, 0x61, 0x43])) {
		return {
			ext: 'flac',
			mime: 'audio/x-flac'
		};
	}

	if (
		check([0x52, 0x49, 0x46, 0x46]) &&
		check([0x57, 0x41, 0x56, 0x45], {offset: 8})
	) {
		return {
			ext: 'wav',
			mime: 'audio/x-wav'
		};
	}

	if (check([0x23, 0x21, 0x41, 0x4D, 0x52, 0x0A])) {
		return {
			ext: 'amr',
			mime: 'audio/amr'
		};
	}

	if (check([0x25, 0x50, 0x44, 0x46])) {
		return {
			ext: 'pdf',
			mime: 'application/pdf'
		};
	}

	if (check([0x4D, 0x5A])) {
		return {
			ext: 'exe',
			mime: 'application/x-msdownload'
		};
	}

	if (
		(buf[0] === 0x43 || buf[0] === 0x46) &&
		check([0x57, 0x53], {offset: 1})
	) {
		return {
			ext: 'swf',
			mime: 'application/x-shockwave-flash'
		};
	}

	if (check([0x7B, 0x5C, 0x72, 0x74, 0x66])) {
		return {
			ext: 'rtf',
			mime: 'application/rtf'
		};
	}

	if (check([0x00, 0x61, 0x73, 0x6D])) {
		return {
			ext: 'wasm',
			mime: 'application/wasm'
		};
	}

	if (
		check([0x77, 0x4F, 0x46, 0x46]) &&
		(
			check([0x00, 0x01, 0x00, 0x00], {offset: 4}) ||
			check([0x4F, 0x54, 0x54, 0x4F], {offset: 4})
		)
	) {
		return {
			ext: 'woff',
			mime: 'application/font-woff'
		};
	}

	if (
		check([0x77, 0x4F, 0x46, 0x32]) &&
		(
			check([0x00, 0x01, 0x00, 0x00], {offset: 4}) ||
			check([0x4F, 0x54, 0x54, 0x4F], {offset: 4})
		)
	) {
		return {
			ext: 'woff2',
			mime: 'application/font-woff'
		};
	}

	if (
		check([0x4C, 0x50], {offset: 34}) &&
		(
			check([0x00, 0x00, 0x01], {offset: 8}) ||
			check([0x01, 0x00, 0x02], {offset: 8}) ||
			check([0x02, 0x00, 0x02], {offset: 8})
		)
	) {
		return {
			ext: 'eot',
			mime: 'application/octet-stream'
		};
	}

	if (check([0x00, 0x01, 0x00, 0x00, 0x00])) {
		return {
			ext: 'ttf',
			mime: 'application/font-sfnt'
		};
	}

	if (check([0x4F, 0x54, 0x54, 0x4F, 0x00])) {
		return {
			ext: 'otf',
			mime: 'application/font-sfnt'
		};
	}

	if (check([0x00, 0x00, 0x01, 0x00])) {
		return {
			ext: 'ico',
			mime: 'image/x-icon'
		};
	}

	if (check([0x46, 0x4C, 0x56, 0x01])) {
		return {
			ext: 'flv',
			mime: 'video/x-flv'
		};
	}

	if (check([0x25, 0x21])) {
		return {
			ext: 'ps',
			mime: 'application/postscript'
		};
	}

	if (check([0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00])) {
		return {
			ext: 'xz',
			mime: 'application/x-xz'
		};
	}

	if (check([0x53, 0x51, 0x4C, 0x69])) {
		return {
			ext: 'sqlite',
			mime: 'application/x-sqlite3'
		};
	}

	if (check([0x4E, 0x45, 0x53, 0x1A])) {
		return {
			ext: 'nes',
			mime: 'application/x-nintendo-nes-rom'
		};
	}

	if (check([0x43, 0x72, 0x32, 0x34])) {
		return {
			ext: 'crx',
			mime: 'application/x-google-chrome-extension'
		};
	}

	if (
		check([0x4D, 0x53, 0x43, 0x46]) ||
		check([0x49, 0x53, 0x63, 0x28])
	) {
		return {
			ext: 'cab',
			mime: 'application/vnd.ms-cab-compressed'
		};
	}

	// Needs to be before `ar` check
	if (check([0x21, 0x3C, 0x61, 0x72, 0x63, 0x68, 0x3E, 0x0A, 0x64, 0x65, 0x62, 0x69, 0x61, 0x6E, 0x2D, 0x62, 0x69, 0x6E, 0x61, 0x72, 0x79])) {
		return {
			ext: 'deb',
			mime: 'application/x-deb'
		};
	}

	if (check([0x21, 0x3C, 0x61, 0x72, 0x63, 0x68, 0x3E])) {
		return {
			ext: 'ar',
			mime: 'application/x-unix-archive'
		};
	}

	if (check([0xED, 0xAB, 0xEE, 0xDB])) {
		return {
			ext: 'rpm',
			mime: 'application/x-rpm'
		};
	}

	if (
		check([0x1F, 0xA0]) ||
		check([0x1F, 0x9D])
	) {
		return {
			ext: 'Z',
			mime: 'application/x-compress'
		};
	}

	if (check([0x4C, 0x5A, 0x49, 0x50])) {
		return {
			ext: 'lz',
			mime: 'application/x-lzip'
		};
	}

	if (check([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])) {
		return {
			ext: 'msi',
			mime: 'application/x-msi'
		};
	}

	if (check([0x06, 0x0E, 0x2B, 0x34, 0x02, 0x05, 0x01, 0x01, 0x0D, 0x01, 0x02, 0x01, 0x01, 0x02])) {
		return {
			ext: 'mxf',
			mime: 'application/mxf'
		};
	}

	return null;
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{"extensions":[".js",".json",".coffee",".jsx"]});
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
